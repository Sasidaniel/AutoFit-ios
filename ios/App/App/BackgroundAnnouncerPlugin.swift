import Foundation
import AVFoundation
import Capacitor
import UIKit

/**
 * Keeps rest-timer / hold-timer voice announcements working while AutoFit is
 * minimized (backgrounded). WKWebView's JS timers are unreliable in the
 * background, so the web side hands off "what's left to announce" to this
 * native plugin whenever a timer changes, before the app is backgrounded; this
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
    private var speechQueue = WorkoutAnnouncementQueue()
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
    private var audioInterrupted = false

    override public func load() {
        speechSynthesizer.usesApplicationAudioSession = true
        speechSynthesizer.delegate = self
        NotificationCenter.default.addObserver(self, selector: #selector(restorePlaybackAfterMicrophone),
            name: Self.microphoneReleased, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(audioConfigurationChanged),
            name: .AVAudioEngineConfigurationChange, object: audioEngine)
        NotificationCenter.default.addObserver(self, selector: #selector(audioConfigurationChanged),
            name: AVAudioSession.routeChangeNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(audioConfigurationChanged),
            name: UIApplication.didEnterBackgroundNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(audioSessionInterrupted),
            name: AVAudioSession.interruptionNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(applicationBecameActive),
            name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func restorePlaybackAfterMicrophone() {
        guard Self.isKeepingAlive, !Self.isAnnouncing, !audioInterrupted else { return }
        guard WorkoutAudioPolicy.needsPlaybackRecovery(engineRunning: audioEngine.isRunning,
            playerPlaying: playerNode.isPlaying,
            configurationMatches: WorkoutAudioSession.matches(recording: VoiceCommandPlugin.usesRecordingSession)) else { return }
        playerNode.stop()
        beepNode.stop()
        audioEngine.stop()
        do {
            try startSilentLoop()
        } catch {
            notifyListeners("announcementError", data: ["reason": error.localizedDescription])
        }
    }

    @objc private func audioConfigurationChanged(_ notification: Notification) {
        DispatchQueue.main.async { self.restorePlaybackAfterMicrophone() }
    }

    @objc private func applicationBecameActive() {
        // iOS may omit interruption-ended while suspended. Activation remains
        // authoritative: an unavailable session still throws a visible error.
        audioInterrupted = false
        restorePlaybackAfterMicrophone()
    }

    @objc private func audioSessionInterrupted(_ notification: Notification) {
        guard let raw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        let options = notification.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
        DispatchQueue.main.async {
            self.audioInterrupted = type == .began
            if self.audioInterrupted {
                WorkoutAudioSession.wasInterrupted()
                self.playerNode.stop()
                self.beepNode.stop()
                self.audioEngine.stop()
                if !self.speechQueue.isEmpty {
                    self.speechQueue.interrupt()
                    self.speechSynthesizer.stopSpeaking(at: .immediate)
                    self.releaseAnnouncementSession()
                    self.notifyListeners("announcementError", data: [
                        "reason": "Announcement interrupted by another audio session"
                    ])
                }
            } else if AVAudioSession.InterruptionOptions(rawValue: options).contains(.shouldResume) {
                self.restorePlaybackAfterMicrophone()
            }
        }
    }

    @objc func speakNow(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.isEmpty else {
            call.reject("Missing announcement text")
            return
        }
        DispatchQueue.main.async {
            do {
                try self.speak(text, language: call.getString("language") ?? "he-IL",
                               announcementID: call.getString("announcementID"))
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
            if !VoiceCommandPlugin.usesRecordingSession && !Self.isAnnouncing {
                do {
                    try WorkoutAudioSession.deactivate()
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
        let announcements: [ScheduledWorkoutAnnouncement]
        do {
            announcements = try items.map { try ScheduledWorkoutAnnouncement($0) }
        } catch {
            call.reject("Invalid announcement plan: \(error.localizedDescription)")
            return
        }
        DispatchQueue.main.async {
            self.cancelAllTimers()
            guard !announcements.isEmpty else { call.resolve(); return }
            do {
                try self.startSilentLoop()
            } catch {
                call.reject("Cannot schedule background announcements: \(error.localizedDescription)")
                return
            }
            for announcement in announcements {
                let timer = announcement.timer { [weak self] _ in
                    do {
                        try self?.speak(announcement.text, language: announcement.language,
                                        announcementID: announcement.identifier)
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

    private func speak(_ text: String, language: String = "he-IL", announcementID: String? = nil) throws {
        guard ["he-IL", "en-US"].contains(language),
              let voice = AVSpeechSynthesisVoice(language: language) else {
            throw NSError(domain: "AutoFit.Audio", code: 5,
                userInfo: [NSLocalizedDescriptionKey: "Requested announcement voice is unavailable"])
        }
        if let announcementID = announcementID, speechQueue.contains(announcementID) { return }
        if speechQueue.isEmpty {
            Self.isAnnouncing = true
            NotificationCenter.default.post(name: Self.announcementStarted, object: nil)
            do {
                try WorkoutAudioSession.activate(recording: VoiceCommandPlugin.usesRecordingSession,
                                                 ducking: true, force: audioInterrupted)
                audioInterrupted = false
            } catch {
                releaseAnnouncementSession()
                throw error
            }
        }
        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = voice
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        speechQueue.insert(utterance, identifier: announcementID)
        speechSynthesizer.speak(utterance)
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        DispatchQueue.main.async { self.finishAnnouncement(utterance, cancelled: false) }
    }

    public func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        DispatchQueue.main.async { self.finishAnnouncement(utterance, cancelled: true) }
    }

    private func finishAnnouncement(_ utterance: AVSpeechUtterance, cancelled: Bool) {
        guard speechQueue.finish(utterance, cancelled: cancelled) else { return }
        if cancelled {
            notifyListeners("announcementError", data: ["reason": "Announcement playback was cancelled"])
        }
        guard speechQueue.isEmpty else { return }
        releaseAnnouncementSession()
    }

    private func releaseAnnouncementSession() {
        playerNode.stop()
        beepNode.stop()
        audioEngine.stop()
        if !audioInterrupted {
            do {
                try WorkoutAudioSession.deactivate()
            } catch {
                notifyListeners("announcementError", data: ["reason": error.localizedDescription])
            }
        }
        Self.isAnnouncing = false
        if Self.isKeepingAlive && !audioInterrupted {
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
            try WorkoutAudioSession.activate(recording: VoiceCommandPlugin.usesRecordingSession,
                                             force: audioInterrupted)
            audioInterrupted = false
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
