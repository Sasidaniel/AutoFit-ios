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
public class BackgroundAnnouncerPlugin: CAPPlugin, CAPBridgedPlugin, AVSpeechSynthesizerDelegate {
    public let identifier = "BackgroundAnnouncerPlugin"
    public let jsName = "BackgroundAnnouncer"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startKeepAlive", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopKeepAlive", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speakNow", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playBeep", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleAnnouncements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelAnnouncements", returnType: CAPPluginReturnPromise)
    ]

    private let speechSynthesizer = AVSpeechSynthesizer()
    private var pendingTimers: [Timer] = []
    private var pendingSpeechCount = 0
    private var recentAnnouncementIDs: [String] = []
    static var isAnnouncing = false
    static var isKeepingAlive = false
    static let announcementStarted = Notification.Name("AutoFitAnnouncementStarted")
    static let announcementEnded = Notification.Name("AutoFitAnnouncementEnded")
    static let microphoneReleased = Notification.Name("AutoFitMicrophoneReleased")

    private let audioEngine = AVAudioEngine()
    private let playerNode = AVAudioPlayerNode()
    private let beepNode = AVAudioPlayerNode()
    private var silentBuffer: AVAudioPCMBuffer?
    private var beepBuffer: AVAudioPCMBuffer?

    override public func load() {
        speechSynthesizer.usesApplicationAudioSession = true
        speechSynthesizer.delegate = self
        NotificationCenter.default.addObserver(self, selector: #selector(restorePlaybackAfterMicrophone),
            name: Self.microphoneReleased, object: nil)
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func restorePlaybackAfterMicrophone() {
        guard Self.isKeepingAlive, !Self.isAnnouncing else { return }
        playerNode.stop()
        beepNode.stop()
        audioEngine.stop()
        do {
            try startSilentLoop()
        } catch {
            notifyListeners("announcementError", data: ["reason": error.localizedDescription])
        }
    }

    @objc func speakNow(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.isEmpty else {
            call.reject("Missing announcement text")
            return
        }
        DispatchQueue.main.async {
            do {
                try self.speak(text, announcementID: call.getString("announcementID"))
                call.resolve()
            } catch {
                call.reject("Announcement audio failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func playBeep(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            do {
                try self.startSilentLoop()
                guard let buffer = self.beepBuffer else {
                    call.reject("Timer sound is unavailable")
                    return
                }
                self.beepNode.stop()
                self.beepNode.scheduleBuffer(buffer, completionHandler: nil)
                self.beepNode.play()
                call.resolve()
            } catch {
                call.reject("Timer sound failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func startKeepAlive(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            do {
                try self.startSilentLoop()
                Self.isKeepingAlive = true
                call.resolve()
            } catch {
                call.reject("Background audio failed: \(error.localizedDescription)")
            }
        }
    }

    @objc func stopKeepAlive(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.cancelAllTimers()
            Self.isKeepingAlive = false
            self.playerNode.stop()
            self.beepNode.stop()
            self.audioEngine.stop()
            if !VoiceCommandPlugin.wantsMicrophone && !Self.isAnnouncing {
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
                let announcementID = item["announcementID"] as? String
                let timer = Timer(timeInterval: max(0.05, delay), repeats: false) { [weak self] _ in
                    do {
                        try self?.speak(text, announcementID: announcementID)
                    } catch {
                        self?.notifyListeners("announcementError", data: ["reason": error.localizedDescription])
                    }
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

    private func speak(_ text: String, announcementID: String? = nil) throws {
        if let announcementID = announcementID, recentAnnouncementIDs.contains(announcementID) { return }
        if pendingSpeechCount == 0 {
            Self.isAnnouncing = true
            NotificationCenter.default.post(name: Self.announcementStarted, object: nil)
            do {
                try WorkoutAudioSession.activate(recording: VoiceCommandPlugin.wantsMicrophone, ducking: true)
            } catch {
                finishAnnouncement()
                throw error
            }
        }
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "he-IL")
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        pendingSpeechCount += 1
        speechSynthesizer.speak(utterance)
        if let announcementID = announcementID {
            recentAnnouncementIDs.append(announcementID)
            if recentAnnouncementIDs.count > 512 { recentAnnouncementIDs.removeFirst() }
        }
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        DispatchQueue.main.async { self.finishAnnouncement() }
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        DispatchQueue.main.async { self.finishAnnouncement() }
    }

    private func finishAnnouncement() {
        pendingSpeechCount = max(0, pendingSpeechCount - 1)
        guard pendingSpeechCount == 0 else { return }
        playerNode.stop()
        beepNode.stop()
        audioEngine.stop()
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            notifyListeners("announcementError", data: ["reason": error.localizedDescription])
        }
        Self.isAnnouncing = false
        if Self.isKeepingAlive {
            do {
                try startSilentLoop()
            } catch {
                notifyListeners("announcementError", data: ["reason": error.localizedDescription])
            }
        }
        NotificationCenter.default.post(name: Self.announcementEnded, object: nil)
    }

    // Generates and loops a silent audio buffer so the OS treats the app as
    // "actively playing audio" and keeps it alive in the background (required
    // for the scheduled timers above to actually fire while minimized).
    private func startSilentLoop() throws {
        if !Self.isAnnouncing {
            try WorkoutAudioSession.activate(recording: VoiceCommandPlugin.wantsMicrophone)
        }
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
            let beepFrames = AVAudioFrameCount(44100 * 0.7)
            guard let tone = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: beepFrames),
                  let toneSamples = tone.floatChannelData?[0] else {
                silentBuffer = nil
                throw NSError(domain: "AutoFit.Audio", code: 3, userInfo: [NSLocalizedDescriptionKey: "Timer sound buffer unavailable"])
            }
            tone.frameLength = beepFrames
            for index in 0..<Int(beepFrames) {
                let time = Double(index) / 44100
                let pulse = time.truncatingRemainder(dividingBy: 0.25)
                let envelope = max(0, min(1, min(pulse / 0.005, (0.15 - pulse) / 0.005)))
                toneSamples[index] = Float(0.2 * envelope * sin(2 * .pi * 880 * time))
            }
            beepBuffer = tone
            audioEngine.attach(playerNode)
            audioEngine.attach(beepNode)
            audioEngine.connect(playerNode, to: audioEngine.mainMixerNode, format: format)
            audioEngine.connect(beepNode, to: audioEngine.mainMixerNode, format: format)
        }
        if !audioEngine.isRunning { try audioEngine.start() }
        playerNode.stop()
        if let buffer = silentBuffer {
            playerNode.scheduleBuffer(buffer, at: nil, options: .loops, completionHandler: nil)
        }
        playerNode.play()
    }
}
