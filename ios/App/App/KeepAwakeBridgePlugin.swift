import Foundation
import UIKit
import Capacitor

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
        CAPPluginMethod(name: "disable", returnType: CAPPluginReturnPromise)
    ]

    // Belt-and-suspenders: re-assert isIdleTimerDisabled on a repeating timer while
    // enabled, in case anything (a modal/share sheet, a system permission prompt,
    // a brief background/foreground blip, etc.) ever silently resets it back to
    // false. A single one-time assignment was not reliably holding on-device.
    private var reassertTimer: Timer?

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
