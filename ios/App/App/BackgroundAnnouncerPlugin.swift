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
        CAPPluginMethod(name: "scheduleAnnouncements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelAnnouncements", returnType: CAPPluginReturnPromise)
    ]

    private let speechSynthesizer = AVSpeechSynthesizer()
    private var pendingTimers: [Timer] = []

    private let audioEngine = AVAudioEngine()
    private let playerNode = AVAudioPlayerNode()
    private var silentBuffer: AVAudioPCMBuffer?

    @objc func startKeepAlive(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.startSilentLoop()
            call.resolve()
        }
    }

    @objc func stopKeepAlive(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.cancelAllTimers()
            self.playerNode.stop()
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
    private func startSilentLoop() {
        do {
            // Skip while VoiceCommandPlugin is actively listening: it already set
            // .playAndRecord (which also satisfies the "audio" background mode), and
            // switching to plain .playback here would kill its microphone input.
            if !VoiceCommandPlugin.isListening {
                try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [.mixWithOthers])
            }
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("BackgroundAnnouncer: audio session setup failed: \(error)")
            return
        }
        if silentBuffer == nil {
            guard let format = AVAudioFormat(standardFormatWithSampleRate: 44100, channels: 1) else { return }
            let frameCount = AVAudioFrameCount(44100) // 1 second of silence, looped
            guard let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else { return }
            buffer.frameLength = frameCount // left at zero == silence
            silentBuffer = buffer
            audioEngine.attach(playerNode)
            audioEngine.connect(playerNode, to: audioEngine.mainMixerNode, format: format)
        }
        do {
            if !audioEngine.isRunning { try audioEngine.start() }
        } catch {
            print("BackgroundAnnouncer: audio engine start failed: \(error)")
            return
        }
        playerNode.stop()
        if let buffer = silentBuffer {
            playerNode.scheduleBuffer(buffer, at: nil, options: .loops, completionHandler: nil)
        }
        playerNode.play()
    }
}
