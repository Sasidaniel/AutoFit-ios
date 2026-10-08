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

    @objc func enable(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = true
            call.resolve(["enabled": true])
        }
    }

    @objc func disable(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            UIApplication.shared.isIdleTimerDisabled = false
            call.resolve(["enabled": false])
        }
    }
}
