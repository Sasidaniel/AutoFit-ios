import Foundation
import MediaPlayer
import Capacitor

@objc(MusicBridgePlugin)
public class MusicBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MusicBridgePlugin"
    public let jsName = "MusicBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setPlayback", returnType: CAPPluginReturnPromise)
    ]

    private var player: MPMusicPlayerController?
    private var pendingRequest: UUID?

    deinit {
        NotificationCenter.default.removeObserver(self)
        let currentPlayer = player
        DispatchQueue.main.async { currentPlayer?.endGeneratingPlaybackNotifications() }
    }

    private func authorizedPlayer() -> MPMusicPlayerController? {
        guard MPMediaLibrary.authorizationStatus() == .authorized else { return nil }
        if let player { return player }
        let currentPlayer = MPMusicPlayerController.systemMusicPlayer
        player = currentPlayer
        NotificationCenter.default.addObserver(self, selector: #selector(playbackChanged(_:)),
            name: .MPMusicPlayerControllerPlaybackStateDidChange, object: currentPlayer)
        currentPlayer.beginGeneratingPlaybackNotifications()
        return currentPlayer
    }

    private func snapshot() -> [String: Any] {
        let authorization: String
        switch MPMediaLibrary.authorizationStatus() {
        case .authorized: authorization = "authorized"
        case .denied: authorization = "denied"
        case .restricted: authorization = "restricted"
        case .notDetermined: authorization = "notDetermined"
        @unknown default: authorization = "unknown"
        }
        var state = "unavailable"
        if let player = authorizedPlayer() {
            switch player.playbackState {
            case .playing: state = "playing"
            case .paused: state = "paused"
            case .stopped: state = "stopped"
            case .interrupted: state = "interrupted"
            case .seekingForward, .seekingBackward: state = "seeking"
            @unknown default: state = "unknown"
            }
        }
        return ["authorization": authorization, "state": state]
    }

    @objc private func playbackChanged(_ notification: Notification) {
        DispatchQueue.main.async { self.notifyListeners("musicChanged", data: self.snapshot()) }
    }

    @objc func status(_ call: CAPPluginCall) {
        DispatchQueue.main.async { call.resolve(self.snapshot()) }
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard MPMediaLibrary.authorizationStatus() == .notDetermined else {
                call.resolve(self.snapshot())
                return
            }
            MPMediaLibrary.requestAuthorization { _ in
                DispatchQueue.main.async { call.resolve(self.snapshot()) }
            }
        }
    }

    @objc func setPlayback(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let playing = call.getBool("playing") else {
                call.reject("A playback action is required", "INVALID_ACTION")
                return
            }
            guard self.pendingRequest == nil else {
                call.reject("A music command is already pending", "BUSY")
                return
            }
            guard let player = self.authorizedPlayer() else {
                call.reject("Apple Music permission is required", "NOT_AUTHORIZED")
                return
            }
            let request = UUID()
            self.pendingRequest = request
            if playing { player.play() } else { player.pause() }
            self.confirmPlayback(call, playing: playing, request: request, attempts: 40)
        }
    }

    private func confirmPlayback(_ call: CAPPluginCall, playing: Bool, request: UUID, attempts: Int) {
        guard pendingRequest == request else { return }
        guard let player = authorizedPlayer() else {
            pendingRequest = nil
            call.reject("Apple Music permission was revoked", "NOT_AUTHORIZED")
            return
        }
        let confirmed = playing ? player.playbackState == .playing
            : player.playbackState == .paused || player.playbackState == .stopped
        if confirmed {
            pendingRequest = nil
            let state = snapshot()
            notifyListeners("musicChanged", data: state)
            call.resolve(state)
        } else if attempts > 0 {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                self.confirmPlayback(call, playing: playing, request: request, attempts: attempts - 1)
            }
        } else {
            pendingRequest = nil
            notifyListeners("musicChanged", data: snapshot())
            call.reject("Apple Music did not confirm the requested playback state", "NOT_CONFIRMED")
        }
    }
}
