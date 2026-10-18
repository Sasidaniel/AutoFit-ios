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
    private var lastHandledAt = Date.distantPast

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
            self.begin()
            call.resolve()
        }
    }

    @objc func stopListening(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.end()
            call.resolve()
        }
    }

    private func begin() {
        guard SFSpeechRecognizer.authorizationStatus() == .authorized,
              AVAudioSession.sharedInstance().recordPermission == .granted else { return }
        end() // tear down any previous engine/task before starting a fresh one
        VoiceCommandPlugin.isListening = true

        do {
            let session = AVAudioSession.sharedInstance()
            // .playAndRecord (not plain .playback) is required to read the mic while
            // this runs; keeps ducking/mixing behavior and allows Bluetooth headset mics.
            try session.setCategory(
                .playAndRecord,
                mode: .default,
                options: [.mixWithOthers, .duckOthers, .allowBluetooth, .allowBluetoothA2DP, .defaultToSpeaker]
            )
            try session.setActive(true, options: [])
        } catch {
            print("VoiceCommand: audio session setup failed: \(error)")
            VoiceCommandPlugin.isListening = false
            return
        }

        let recognizer = self.recognizer ?? (SFSpeechRecognizer(locale: Locale(identifier: "he-IL")) ?? SFSpeechRecognizer())
        self.recognizer = recognizer
        guard let recognizer = recognizer, recognizer.isAvailable else {
            VoiceCommandPlugin.isListening = false
            return
        }

        let req = SFSpeechAudioBufferRecognitionRequest()
        req.shouldReportPartialResults = true
        if recognizer.supportsOnDeviceRecognition {
            req.requiresOnDeviceRecognition = true
        }
        request = req

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)
        inputNode.removeTap(onBus: 0)
        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.request?.append(buffer)
        }

        audioEngine.prepare()
        do {
            try audioEngine.start()
        } catch {
            print("VoiceCommand: audio engine start failed: \(error)")
            VoiceCommandPlugin.isListening = false
            return
        }

        task = recognizer.recognitionTask(with: req) { [weak self] result, error in
            guard let self = self else { return }
            if let result = result {
                self.handle(transcript: result.bestTranscription.formattedString, isFinal: result.isFinal)
            }
            if error != nil || (result?.isFinal ?? false) {
                // The task that produced this callback has now ended (final result or
                // error) — immediately start a new one so listening stays effectively
                // continuous across separate spoken commands for the rest of the workout.
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                    if VoiceCommandPlugin.isListening { self.begin() }
                }
            }
        }
    }

    private func end() {
        VoiceCommandPlugin.isListening = false
        task?.cancel()
        task = nil
        request?.endAudio()
        request = nil
        if audioEngine.isRunning {
            audioEngine.stop()
            audioEngine.inputNode.removeTap(onBus: 0)
        }
    }

    // Hands the raw recognized phrase to JS, which does all keyword/number
    // matching and dispatch — keeping all command logic in one place (easy to
    // extend/fix without native rebuilds) and testable in a browser preview.
    private func handle(transcript: String, isFinal: Bool) {
        guard isFinal, !transcript.isEmpty else { return }
        let now = Date()
        guard now.timeIntervalSince(lastHandledAt) > 1.2 else { return } // debounce accidental double-fires
        lastHandledAt = now
        notifyListeners("voiceTranscript", data: ["transcript": transcript])
    }
}
