import Foundation
import Speech
import AVFoundation
import Capacitor

/**
 * Hands-free voice commands for an entire workout — starting/finishing/cancelling
 * it, starting a set and counting reps out loud, marking a set done, skipping
 * rest, moving to the next exercise, undo — using Apple's on-device Speech
 * framework, so the user can keep their phone away and use headphones instead
 * of tapping the screen. This is an ADDITIONAL input method — every existing
 * manual tap/checkbox keeps working exactly as before; this plugin only emits
 * the raw recognized Hebrew phrase. ALL keyword/number matching and the actual
 * dispatch to app actions happens on the JS side (app.js), not here, so the
 * command vocabulary can be extended/fixed without a native rebuild.
 *
 * Needs both NSMicrophoneUsageDescription and NSSpeechRecognitionUsageDescription
 * (declared in Info.plist). Prefers on-device Hebrew recognition when the
 * device supports it (no audio leaves the device); falls back to Apple's
 * standard (server-assisted) recognizer automatically otherwise.
 *
 * Listening runs for the whole time the Workout tab is open (not just once a
 * workout has started — "start workout" itself is a voice command), restarting
 * a fresh recognition task after each completed phrase (or any error) since a
 * single SFSpeechRecognitionTask ends once it delivers a final result — this
 * keeps the mic "always on" without the caller having to manage task lifecycles.
 */
@objc(VoiceCommandPlugin)
public class VoiceCommandPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "VoiceCommandPlugin"
    public let jsName = "VoiceCommand"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "startListening", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopListening", returnType: CAPPluginReturnPromise)
    ]

    // Checked by AppDelegate so it doesn't reset the shared audio session back
    // to a plain, record-incapable category while this is actively listening.
    @objc public static var isListening = false

    private let audioEngine = AVAudioEngine()
    private var recognizer: SFSpeechRecognizer?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var utterance = SpeechUtteranceBuffer()
    private var pendingUtterance: DispatchWorkItem?
    private var generation = UUID()
    private var tapInstalled = false
    private var consecutiveFailures = 0

    @objc func requestPermission(_ call: CAPPluginCall) {
        SFSpeechRecognizer.requestAuthorization { speechStatus in
            AVAudioSession.sharedInstance().requestRecordPermission { micGranted in
                DispatchQueue.main.async {
                    call.resolve(["granted": speechStatus == .authorized && micGranted])
                }
            }
        }
    }

    @objc func startListening(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.consecutiveFailures = 0
            do {
                try self.begin()
                call.resolve()
            } catch {
                self.end()
                call.reject("Voice recognition could not start: \(error.localizedDescription)")
            }
        }
    }

    @objc func stopListening(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.end()
            call.resolve()
        }
    }

    private func begin() throws {
        end()
        guard SFSpeechRecognizer.authorizationStatus() == .authorized,
              AVAudioSession.sharedInstance().recordPermission == .granted else {
            throw voiceError("Microphone or speech recognition permission is not granted")
        }
        let currentGeneration = generation

        let session = AVAudioSession.sharedInstance()
        // .playAndRecord is required for the microphone, including Bluetooth headsets.
        try session.setCategory(
            .playAndRecord,
            mode: .default,
            options: [.mixWithOthers, .allowBluetooth, .allowBluetoothA2DP, .defaultToSpeaker]
        )
        try session.setActive(true, options: [])

        let recognizer = self.recognizer ?? SFSpeechRecognizer(locale: Locale(identifier: "he-IL"))
        self.recognizer = recognizer
        guard let recognizer = recognizer, recognizer.isAvailable else {
            throw voiceError("Hebrew speech recognition is currently unavailable")
        }

        let req = SFSpeechAudioBufferRecognitionRequest()
        req.shouldReportPartialResults = true
        req.contextualStrings = [
            "התחל אימון", "סיים אימון", "בטל אימון", "התחל סט",
            "סט הסתיים", "סיימתי", "דלג על מנוחה", "תרגיל הבא"
        ]
        if recognizer.supportsOnDeviceRecognition {
            req.requiresOnDeviceRecognition = true
        }
        request = req

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        guard recordingFormat.sampleRate > 0, recordingFormat.channelCount > 0 else {
            throw voiceError("No microphone input is available")
        }
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            req.append(buffer)
        }
        tapInstalled = true

        audioEngine.prepare()
        try audioEngine.start()
        VoiceCommandPlugin.isListening = true

        task = recognizer.recognitionTask(with: req) { [weak self] result, error in
            guard let self = self else { return }
            DispatchQueue.main.async {
                guard self.generation == currentGeneration, VoiceCommandPlugin.isListening else { return }
                if let result = result {
                    if !result.bestTranscription.formattedString.isEmpty { self.consecutiveFailures = 0 }
                    self.handle(transcript: result.bestTranscription.formattedString, isFinal: result.isFinal)
                }
                if let error = error {
                    self.consecutiveFailures += 1
                    if self.consecutiveFailures >= 3 {
                        self.end()
                        self.notifyListeners("voiceError", data: ["reason": error.localizedDescription])
                        return
                    }
                }
                if error != nil || (result?.isFinal ?? false) {
                    self.restart(after: error == nil ? 0.05 : 1)
                }
            }
        }
    }

    private func end() {
        VoiceCommandPlugin.isListening = false
        generation = UUID()
        pendingUtterance?.cancel()
        pendingUtterance = nil
        utterance = SpeechUtteranceBuffer()
        task?.cancel()
        task = nil
        request?.endAudio()
        request = nil
        if audioEngine.isRunning {
            audioEngine.stop()
        }
        if tapInstalled {
            audioEngine.inputNode.removeTap(onBus: 0)
            tapInstalled = false
        }
    }

    private func voiceError(_ message: String) -> NSError {
        return NSError(domain: "AutoFit.VoiceCommand", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
    }

    private func restart(after delay: TimeInterval) {
        let currentGeneration = generation
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            guard self.generation == currentGeneration, VoiceCommandPlugin.isListening else { return }
            do {
                try self.begin()
            } catch {
                self.end()
                self.notifyListeners("voiceError", data: ["reason": error.localizedDescription])
            }
        }
    }

    // Speech recognition may keep returning partial results until its minute
    // limit. Commit a stable phrase after a short pause rather than waiting for it.
    private func handle(transcript: String, isFinal: Bool) {
        pendingUtterance?.cancel()
        if let text = utterance.update(transcript, isFinal: isFinal, at: ProcessInfo.processInfo.systemUptime) {
            emit(text)
            return
        }
        let currentGeneration = generation
        let work = DispatchWorkItem { [weak self] in
            guard let self = self, self.generation == currentGeneration, VoiceCommandPlugin.isListening else { return }
            if let text = self.utterance.flush(at: ProcessInfo.processInfo.systemUptime) {
                self.emit(text)
            }
        }
        pendingUtterance = work
        DispatchQueue.main.asyncAfter(deadline: .now() + SpeechUtteranceBuffer.silenceInterval, execute: work)
    }

    private func emit(_ transcript: String) {
        pendingUtterance?.cancel()
        notifyListeners("voiceTranscript", data: ["transcript": transcript])
        restart(after: 0.05)
    }
}
