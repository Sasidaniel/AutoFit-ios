import Foundation
import UIKit
import Capacitor
import MediaPlayer
import Speech
import AVFoundation
import HealthKit
import LocalAuthentication
import UserNotifications
import ActivityKit

/**
 * Native bridge to keep the screen from auto-locking while AutoFit is open —
 * mirrors the web app's Wake Lock API, which WKWebView does not support.
 */
@objc(KeepAwakeBridgePlugin)
public class KeepAwakeBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KeepAwakeBridgePlugin"
    public let jsName = "KeepAwakeBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "enable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "settingsStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openSettings", returnType: CAPPluginReturnPromise)
    ]

    // Belt-and-suspenders: re-assert isIdleTimerDisabled on a repeating timer while
    // enabled, in case anything (a modal/share sheet, a system permission prompt,
    // a brief background/foreground blip, etc.) ever silently resets it back to
    // false. A single one-time assignment was not reliably holding on-device.
    private var reassertTimer: Timer?

    @objc func settingsStatus(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { notifications in
            DispatchQueue.main.async {
                let microphone: String
                switch AVAudioSession.sharedInstance().recordPermission {
                case .granted: microphone = "authorized"
                case .denied: microphone = "denied"
                case .undetermined: microphone = "notDetermined"
                @unknown default: microphone = "unknown"
                }
                let speech: String
                switch SFSpeechRecognizer.authorizationStatus() {
                case .authorized: speech = "authorized"
                case .denied: speech = "denied"
                case .restricted: speech = "restricted"
                case .notDetermined: speech = "notDetermined"
                @unknown default: speech = "unknown"
                }
                let music: String
                switch MPMediaLibrary.authorizationStatus() {
                case .authorized: music = "authorized"
                case .denied: music = "denied"
                case .restricted: music = "restricted"
                case .notDetermined: music = "notDetermined"
                @unknown default: music = "unknown"
                }
                let notification: String
                switch notifications.authorizationStatus {
                case .authorized: notification = "authorized"
                case .denied: notification = "denied"
                case .notDetermined: notification = "notDetermined"
                case .provisional, .ephemeral: notification = "quiet"
                @unknown default: notification = "unknown"
                }
                let health: String
                if HKHealthStore.isHealthDataAvailable() {
                    switch HKHealthStore().authorizationStatus(for: HKObjectType.workoutType()) {
                    case .sharingAuthorized: health = "authorized"
                    case .sharingDenied: health = "denied"
                    case .notDetermined: health = "notDetermined"
                    @unknown default: health = "unknown"
                    }
                } else { health = "unavailable" }
                let biometrics = LAContext().canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
                let liveActivities: String
                if #available(iOS 16.2, *) {
                    liveActivities = ActivityAuthorizationInfo().areActivitiesEnabled ? "enabled" : "disabled"
                } else { liveActivities = "unavailable" }
                call.resolve([
                    "version": Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "",
                    "build": Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "",
                    "permissions": ["microphone": microphone, "speech": speech, "music": music,
                        "notifications": notification, "health": health,
                        "biometrics": biometrics ? "available" : "unavailable",
                        "liveActivities": liveActivities]
                ])
            }
        }
    }

    @objc func openSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard let url = URL(string: UIApplication.openSettingsURLString) else {
                call.reject("Cannot open the app's system settings")
                return
            }
            UIApplication.shared.open(url, options: [:]) { opened in
                if opened { call.resolve(["opened": true]) }
                else { call.reject("The system did not open the app's settings") }
            }
        }
    }

    @objc func enable(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.startReasserting()
            call.resolve(["enabled": true])
        }
    }

    @objc func disable(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.stopReasserting()
            UIApplication.shared.isIdleTimerDisabled = false
            call.resolve(["enabled": false])
        }
    }

    private func startReasserting() {
        UIApplication.shared.isIdleTimerDisabled = true
        reassertTimer?.invalidate()
        let timer = Timer(timeInterval: 5.0, repeats: true) { [weak self] _ in
            guard self != nil else { return }
            UIApplication.shared.isIdleTimerDisabled = true
        }
        // Use .common so it keeps firing even while the UI is actively scrolling/tracking touches.
        RunLoop.main.add(timer, forMode: .common)
        reassertTimer = timer
    }

    private func stopReasserting() {
        reassertTimer?.invalidate()
        reassertTimer = nil
    }
}
