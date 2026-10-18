import Foundation
import Capacitor
import UserNotifications

/**
 * Native local-notifications bridge using UNUserNotificationCenter directly.
 * The app previously relied on the web `Notification` API, which WKWebView does not
 * actually surface as real OS notifications — so permission was never granted and
 * nothing was ever shown. This plugin requests real notification permission and can
 * post real local notifications that work even while the app is backgrounded.
 */
@objc(NotificationsBridgePlugin)
public class NotificationsBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "NotificationsBridgePlugin"
    public let jsName = "NotificationsBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isGranted", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "show", returnType: CAPPluginReturnPromise)
    ]

    @objc func requestPermission(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if let error = error {
                call.reject("Authorization failed: \(error.localizedDescription)")
            } else {
                call.resolve(["granted": granted])
            }
        }
    }

    @objc func isGranted(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            call.resolve(["granted": settings.authorizationStatus == .authorized])
        }
    }

    // Posts a one-off local notification immediately (or after a short delay), used for
    // things like rest-timer completions while the app is backgrounded.
    @objc func show(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? "AutoFit"
        let body = call.getString("body") ?? ""
        let delaySeconds = call.getDouble("delaySeconds") ?? 0

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let trigger = delaySeconds > 0
            ? UNTimeIntervalNotificationTrigger(timeInterval: max(delaySeconds, 0.1), repeats: false)
            : nil
        let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger)

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                call.reject("Failed to schedule notification: \(error.localizedDescription)")
            } else {
                call.resolve(["shown": true])
            }
        }
    }
}
