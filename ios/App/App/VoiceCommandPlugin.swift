import Foundation
import Speech
import AVFoundation
import Capacitor
import UIKit

private final class RecognitionAudioSink {
    private let lock = NSLock()
    private var request: SFSpeechAudioBufferRecognitionRequest?

    func replace(with next: SFSpeechAudioBufferRecognitionRequest?) {
        lock.lock()
        request?.endAudio()
        request = next
        lock.unlock()
    }

    func append(_ buffer: AVAudioPCMBuffer) {
        lock.lock()
        request?.append(buffer)
        lock.unlock()
    }
}

/**
 * Hands-free voice commands for an entire workout — starting/finishing/cancelling
 * it, starting a set and counting reps out loud, marking a set done, skipping
 * rest, moving to the next exercise, undo — using Apple's on-device Speech
 * framework, so the user can keep their phone away and use headphones instead
 * of tapping the screen. This is an ADDITIONAL input method — every existing
 * manual tap/checkbox keeps working exactly as before; this plugin only emits
 * the raw recognized Hebrew or English phrase. ALL keyword/number matching and the actual
 * dispatch to app actions happens on the JS side (app.js), not here, so the
 * command vocabulary can be extended/fixed without a native rebuild.
 *
 * Needs both NSMicrophoneUsageDescription and NSSpeechRecognitionUsageDescription
 * (declared in Info.plist). Prefers on-device recognition for the chosen language when the
 * device supports it (no audio leaves the device); falls back to Apple's
 * standard (server-assisted) recognizer automatically otherwise.
 *
 * Listening runs while the Workout tab is open. Partial phrases share one
 * capture/task so counting does not lose audio between numbers; final results,
 * errors and the bounded task lifetime rotate recognition without dropping the
 * input tap. App announcements temporarily release capture.
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

    // Requested listening survives the temporary capture pause during app speech.
    @objc public static var isListening = false
    @objc public static var wantsMicrophone = false
    static var usesRecordingSession: Bool {
        WorkoutAudioPolicy.recordingSession(microphoneRequested: wantsMicrophone,
            foreground: UIApplication.shared.applicationState == .active,
            keepingAlive: BackgroundAnnouncerPlugin.isKeepingAlive)
    }
    private static var canCapture: Bool {
        WorkoutAudioPolicy.captureMicrophone(microphoneRequested: wantsMicrophone,
            foreground: UIApplication.shared.applicationState == .active)
    }

    private let audioEngine = AVAudioEngine()
    private var recognizer: SFSpeechRecognizer?
    private var recognitionLanguage = "he-IL"
    private let audioSink = RecognitionAudioSink()
    private var task: SFSpeechRecognitionTask?
    private var utterance = SpeechUtteranceBuffer()
    private var pendingUtterance: DispatchWorkItem?
    private var pendingRestart: DispatchWorkItem?
    private var pendingRotation: DispatchWorkItem?
    private var generation = UUID()
    private var captureGeneration = UUID()
    private var lastInputName = ""
    private var audioInterrupted = false
    private var tapInstalled = false
    private var consecutiveFailures = 0
    private var contextualPhrases: [String] = []

    override public func load() {
        NotificationCenter.default.addObserver(
            self, selector: #selector(announcementWillStart),
            name: BackgroundAnnouncerPlugin.announcementStarted, object: nil)
        NotificationCenter.default.addObserver(
            self, selector: #selector(announcementFinished),
            name: BackgroundAnnouncerPlugin.announcementEnded, object: nil)
        NotificationCenter.default.addObserver(
            self, selector: #selector(applicationEnteredBackground),
            name: UIApplication.didEnterBackgroundNotification, object: nil)
        NotificationCenter.default.addObserver(
            self, selector: #selector(applicationEnteredBackground),
            name: UIApplication.willResignActiveNotification, object: nil)
        NotificationCenter.default.addObserver(
            self, selector: #selector(applicationBecameActive),
            name: UIApplication.didBecomeActiveNotification, object: nil)
        NotificationCenter.default.addObserver(
            self, selector: #selector(audioRouteChanged(_:)),
            name: AVAudioSession.routeChangeNotification, object: nil)
        NotificationCenter.default.addObserver(
            self, selector: #selector(audioRouteChanged(_:)),
            name: .AVAudioEngineConfigurationChange, object: audioEngine)
        NotificationCenter.default.addObserver(
            self, selector: #selector(audioSessionInterrupted(_:)),
            name: AVAudioSession.interruptionNotification, object: nil)
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func announcementWillStart() {
        if Self.wantsMicrophone { end() }
    }

    @objc private func announcementFinished() {
        guard Self.canCapture else { return }
        restart(after: 0.2)
    }

    @objc private func applicationEnteredBackground() {
        end()
    }

    @objc private func applicationBecameActive() {
        audioInterrupted = false
        consecutiveFailures = 0
        if Self.canCapture && !Self.isListening && !BackgroundAnnouncerPlugin.isAnnouncing {
            restart(after: 0.2)
        }
    }

    @objc private func audioRouteChanged(_ notification: Notification) {
        DispatchQueue.main.async {
            guard Self.canCapture, !self.audioInterrupted, !BackgroundAnnouncerPlugin.isAnnouncing else { return }
            if notification.name == .AVAudioEngineConfigurationChange && self.audioEngine.isRunning { return }
            if let raw = notification.userInfo?[AVAudioSessionRouteChangeReasonKey] as? UInt,
               AVAudioSession.RouteChangeReason(rawValue: raw) == .categoryChange,
               self.audioEngine.isRunning, WorkoutAudioSession.matches(recording: true) { return }
            self.end()
            self.restart(after: 0.2)
        }
    }

    @objc private func audioSessionInterrupted(_ notification: Notification) {
        guard let raw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        let options = notification.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
        DispatchQueue.main.async {
            self.audioInterrupted = type == .began
            if self.audioInterrupted {
                WorkoutAudioSession.wasInterrupted()
                self.end()
            } else if AVAudioSession.InterruptionOptions(rawValue: options).contains(.shouldResume) {
                self.restart(after: 0.2)
            }
        }
    }

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
            let language = call.getString("language") ?? "he-IL"
            guard ["he-IL", "en-US"].contains(language) else {
                call.reject("Unsupported recognition language")
                return
            }
            let microphoneMode = call.getString("microphoneMode") ?? "automatic"
            guard ["automatic", "headset"].contains(microphoneMode) else {
                call.reject("Unsupported microphone mode")
                return
            }
            let preferHeadset = microphoneMode == "headset"
            if WorkoutAudioSession.preferHeadsetMicrophone != preferHeadset { self.end() }
            WorkoutAudioSession.preferHeadsetMicrophone = preferHeadset
            if language != self.recognitionLanguage {
                self.endRecognition()
                self.recognizer = nil
                self.recognitionLanguage = language
            }
            self.consecutiveFailures = 0
            self.lastInputName = ""
            Self.wantsMicrophone = true
            self.contextualPhrases = Array((call.getArray("contextualStrings") as? [String] ?? [])
                .filter { !$0.isEmpty && $0.count <= 120 }.prefix(80))
            do {
                if Self.canCapture && !BackgroundAnnouncerPlugin.isAnnouncing { try self.begin() }
                call.resolve(["inputName": AVAudioSession.sharedInstance().currentRoute.inputs.first?.portName ?? ""])
            } catch {
                Self.wantsMicrophone = false
                self.end()
                call.reject("Voice recognition could not start: \(error.localizedDescription)")
            }
        }
    }

    @objc func stopListening(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            Self.wantsMicrophone = false
            self.end()
            if !BackgroundAnnouncerPlugin.isKeepingAlive && !BackgroundAnnouncerPlugin.isAnnouncing {
                do {
                    try WorkoutAudioSession.deactivate()
                } catch {
                    call.reject("Cannot release microphone audio: \(error.localizedDescription)")
                    return
                }
            }
            call.resolve()
        }
    }

    private func begin() throws {
        guard Self.canCapture else { return }
        endRecognition()
        guard SFSpeechRecognizer.authorizationStatus() == .authorized,
              AVAudioSession.sharedInstance().recordPermission == .granted else {
            throw voiceError("Microphone or speech recognition permission is not granted")
        }
        let currentGeneration = generation

        try WorkoutAudioSession.activate(recording: true, force: audioInterrupted)
        audioInterrupted = false

        let recognizer = self.recognizer ?? SFSpeechRecognizer(locale: Locale(identifier: recognitionLanguage))
        self.recognizer = recognizer
        guard let recognizer = recognizer, recognizer.isAvailable else {
            throw voiceError("Speech recognition is currently unavailable for \(recognitionLanguage)")
        }

        let req = SFSpeechAudioBufferRecognitionRequest()
        req.shouldReportPartialResults = true
        let commands = recognitionLanguage == "en-US" ? [
            "Start workout", "Finish workout", "Cancel workout", "Start set",
            "Set complete", "Set done", "Done", "Skip rest", "Next exercise",
            "Start", "Stop", "Pause", "Warmup", "Cooldown", "Plank", "Undo"
        ] : [
            "התחל אימון", "סיים אימון", "בטל אימון", "התחל סט",
            "סט הושלם", "סט הסתיים", "סיימתי", "דלג על מנוחה", "תרגיל הבא",
            "התחל", "התחל חימום", "חימום", "שחרור", "פלאנק", "פלנק",
            "עצור", "השהה", "עצור חימום", "עצור שחרור",
            "התחילי אימון", "סיימי אימון", "בטלי אימון", "התחילי סט",
            "עצרי", "השהי", "המשיכי אימון", "דלגי על מנוחה", "מאשרת סיום"
        ]
        req.contextualStrings = Array((commands + contextualPhrases).prefix(100))
        if recognizer.supportsOnDeviceRecognition {
            req.requiresOnDeviceRecognition = true
        }
        audioSink.replace(with: req)

        if !audioEngine.isRunning {
            let inputNode = audioEngine.inputNode
            if tapInstalled { inputNode.removeTap(onBus: 0); tapInstalled = false }
            let recordingFormat = inputNode.outputFormat(forBus: 0)
            guard recordingFormat.sampleRate > 0, recordingFormat.channelCount > 0,
                  recordingFormat.commonFormat == .pcmFormatFloat32, !recordingFormat.isInterleaved,
                  let monoFormat = AVAudioFormat(standardFormatWithSampleRate: recordingFormat.sampleRate, channels: 1) else {
                throw voiceError("No supported microphone input is available")
            }
            captureGeneration = UUID()
            let capture = captureGeneration
            let sink = audioSink
            inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
                if buffer.format.channelCount == 1 {
                    sink.append(buffer)
                    return
                }
                guard let mono = AVAudioPCMBuffer(pcmFormat: monoFormat, frameCapacity: buffer.frameLength),
                      let source = buffer.floatChannelData?[0], let target = mono.floatChannelData?[0] else {
                    DispatchQueue.main.async {
                        guard let self = self, self.captureGeneration == capture else { return }
                        Self.wantsMicrophone = false
                        self.end()
                        self.notifyListeners("voiceError", data: ["reason": "Cannot process microphone audio"])
                    }
                    return
                }
                mono.frameLength = buffer.frameLength
                target.update(from: source, count: Int(buffer.frameLength))
                sink.append(mono)
            }
            tapInstalled = true
            audioEngine.prepare()
            try audioEngine.start()
        }
        VoiceCommandPlugin.isListening = true
        let inputName = AVAudioSession.sharedInstance().currentRoute.inputs.first?.portName ?? ""
        if inputName != lastInputName {
            lastInputName = inputName
            notifyListeners("voiceInputChanged", data: ["inputName": inputName])
        }

        task = recognizer.recognitionTask(with: req) { [weak self] result, error in
            guard let self = self else { return }
            DispatchQueue.main.async {
                guard self.generation == currentGeneration, VoiceCommandPlugin.isListening,
                      !BackgroundAnnouncerPlugin.isAnnouncing else { return }
                if let result = result {
                    if !result.bestTranscription.formattedString.isEmpty { self.consecutiveFailures = 0 }
                    self.handle(transcript: result.bestTranscription.formattedString, isFinal: result.isFinal)
                    guard self.generation == currentGeneration else { return }
                }
                if let error = error {
                    self.retryRecognition(after: error)
                } else if result?.isFinal == true {
                    self.restart(after: 0.05)
                }
            }
        }
        let rotation = DispatchWorkItem { [weak self] in
            guard let self = self, self.generation == currentGeneration, Self.isListening else { return }
            self.restart(after: 0.05)
        }
        pendingRotation = rotation
        DispatchQueue.main.asyncAfter(deadline: .now() + 45, execute: rotation)
    }

    private func endRecognition() {
        pendingRestart?.cancel()
        pendingRestart = nil
        pendingRotation?.cancel()
        pendingRotation = nil
        VoiceCommandPlugin.isListening = false
        generation = UUID()
        pendingUtterance?.cancel()
        pendingUtterance = nil
        utterance = SpeechUtteranceBuffer()
        task?.cancel()
        task = nil
        audioSink.replace(with: nil)
    }

    private func end() {
        endRecognition()
        captureGeneration = UUID()
        if audioEngine.isRunning {
            audioEngine.stop()
        }
        if tapInstalled {
            audioEngine.inputNode.removeTap(onBus: 0)
            tapInstalled = false
        }
        if !Self.usesRecordingSession {
            NotificationCenter.default.post(name: BackgroundAnnouncerPlugin.microphoneReleased, object: nil)
            if !BackgroundAnnouncerPlugin.isKeepingAlive && !BackgroundAnnouncerPlugin.isAnnouncing {
                do {
                    try WorkoutAudioSession.deactivate()
                } catch {
                    notifyListeners("voiceError", data: ["reason": "Cannot release microphone audio: \(error.localizedDescription)"])
                }
            }
        }
    }

    private func voiceError(_ message: String) -> NSError {
        return NSError(domain: "AutoFit.VoiceCommand", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
    }

    private func restart(after delay: TimeInterval) {
        endRecognition()
        let currentGeneration = generation
        let work = DispatchWorkItem { [weak self] in
            guard let self = self else { return }
            guard self.generation == currentGeneration, Self.canCapture, !self.audioInterrupted,
                  !BackgroundAnnouncerPlugin.isAnnouncing else { return }
            do {
                try self.begin()
            } catch {
                self.end()
                self.retryRecognition(after: error)
            }
        }
        pendingRestart = work
        DispatchQueue.main.asyncAfter(deadline: .now() + delay, execute: work)
    }

    private func retryRecognition(after error: Error) {
        let speechError = error as NSError
        if speechError.domain == "kAFAssistantErrorDomain" && speechError.code == 1110 {
            restart(after: 0.2)
            return
        }
        consecutiveFailures += 1
        guard let delay = WorkoutAudioPolicy.recognitionRetryDelay(failures: consecutiveFailures) else {
            Self.wantsMicrophone = false
            end()
            notifyListeners("voiceError", data: ["reason": error.localizedDescription])
            return
        }
        restart(after: delay)
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
            guard let self = self, self.generation == currentGeneration, VoiceCommandPlugin.isListening,
                  !BackgroundAnnouncerPlugin.isAnnouncing else { return }
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
    }
}
