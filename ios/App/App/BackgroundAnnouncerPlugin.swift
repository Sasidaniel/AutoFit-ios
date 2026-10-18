import Foundation
import AVFoundation
import Capacitor

/**
 * Keeps rest-timer / hold-timer voice announcements working while AutoFit is
 * minimized (backgrounded). WKWebView's JS timers are unreliable in the
 * background, so the web side hands off "what's left to announce" to this
 * native plugin whenever the app is about to go to the background; this
 * plugin schedules real native timers (unaffected by WebView throttling) and
 * speaks them with AVSpeechSynthesizer directly, independent of the web page.
 *
 * To actually stay alive in the background long enough to fire these timers,
 * iOS requires the app to be genuinely playing audio under the "audio"
 * background mode (declared in Info.plist) — so this also loops a silent
 * audio buffer (generated in-memory, no bundled asset needed) for the
 * duration of a workout.
 */
@objc(BackgroundAnnouncerPlugin)
public class BackgroundAnnouncerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BackgroundAnnouncerPlugin"
    public let jsName = "BackgroundAnnouncer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startKeepAlive", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopKeepAlive", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speakNow", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleAnnouncements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelAnnouncements", returnType: CAPPluginReturnPromise)
    ]

    private let speechSynthesizer = AVSpeechSynthesizer()
    private var pendingTimers: [Timer] = []

    private let audioEngine = AVAudioEngine()
    private let playerNode = AVAudioPlayerNode()
    private var silentBuffer: AVAudioPCMBuffer?

    override public func load() {
        // Let iOS manage ducking per utterance, independently of the recording
        // session. A continuously active microphone must not duck music forever.
        speechSynthesizer.usesApplicationAudioSession = false
    }

    @objc func speakNow(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.isEmpty else {
            call.reject("Missing announcement text")
            return
        }
        DispatchQueue.main.async {
            self.speechSynthesizer.stopSpeaking(at: .immediate)
            self.speak(text)
            call.resolve()
        }
    }

    @objc func startKeepAlive(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            do {
                try self.startSilentLoop()
                call.resolve()
            } catch {
                call.reject("Background audio failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func stopKeepAlive(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.cancelAllTimers()
            self.playerNode.stop()
            self.audioEngine.stop()
            if !VoiceCommandPlugin.isListening {
                do {
                    try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
                } catch {
                    call.reject("Cannot release background audio: \(error.localizedDescription)")
                    return
                }
            }
            call.resolve()
        }
    }

    @objc func scheduleAnnouncements(_ call: CAPPluginCall) {
        guard let items = call.getArray("items") as? [[String: Any]] else {
            call.reject("missing items")
            return
        }
        DispatchQueue.main.async {
            self.cancelAllTimers()
            do {
                try self.startSilentLoop()
            } catch {
                call.reject("Cannot schedule background announcements: \(error.localizedDescription)")
                return
            }
            for item in items {
                guard let delay = item["delaySeconds"] as? Double, let text = item["text"] as? String, !text.isEmpty else { continue }
                let timer = Timer(timeInterval: max(0.05, delay), repeats: false) { [weak self] _ in
                    self?.speak(text)
                }
                RunLoop.main.add(timer, forMode: .common)
                self.pendingTimers.append(timer)
            }
            call.resolve()
        }
    }

    @objc func cancelAnnouncements(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.cancelAllTimers()
            call.resolve()
        }
    }

    private func cancelAllTimers() {
        pendingTimers.forEach { $0.invalidate() }
        pendingTimers.removeAll()
    }

    private func speak(_ text: String) {
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "he-IL")
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        speechSynthesizer.speak(utterance)
    }

    // Generates and loops a silent audio buffer so the OS treats the app as
    // "actively playing audio" and keeps it alive in the background (required
    // for the scheduled timers above to actually fire while minimized).
    private func startSilentLoop() throws {
        // Do not replace the recording category while the microphone is active.
        if !VoiceCommandPlugin.isListening {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
        }
        try AVAudioSession.sharedInstance().setActive(true)
        if silentBuffer == nil {
            guard let format = AVAudioFormat(standardFormatWithSampleRate: 44100, channels: 1) else {
                throw NSError(domain: "AutoFit.Audio", code: 1, userInfo: [NSLocalizedDescriptionKey: "Audio format unavailable"])
            }
            let frameCount = AVAudioFrameCount(44100) // 1 second of silence, looped
            guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount),
                  let samples = buffer.floatChannelData?[0] else {
                throw NSError(domain: "AutoFit.Audio", code: 2, userInfo: [NSLocalizedDescriptionKey: "Audio buffer unavailable"])
            }
            buffer.frameLength = frameCount
            samples.initialize(repeating: 0, count: Int(frameCount))
            silentBuffer = buffer
            audioEngine.attach(playerNode)
            audioEngine.connect(playerNode, to: audioEngine.mainMixerNode, format: format)
        }
        if !audioEngine.isRunning { try audioEngine.start() }
        playerNode.stop()
        if let buffer = silentBuffer {
            playerNode.scheduleBuffer(buffer, at: nil, options: .loops, completionHandler: nil)
        }
        playerNode.play()
    }
}
