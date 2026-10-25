import Foundation
import Capacitor

@objc(CloudBridgePlugin)
public class CloudBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CloudBridgePlugin"
    public let jsName = "CloudBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAll", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "eraseData", returnType: CAPPluginReturnPromise)
    ]

    private var store: NSUbiquitousKeyValueStore { .default }
    private let lock = NSLock()
    private let dataKeys = Set(["ft_exercises_v1", "ft_workouts_v1", "ft_settings_v1",
                                "ft_active_session_v1", "ft_profile_v1"])
    private let erasureKey = "ft_privacy_erasure_v1"

    override public func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(storeDidChange(_:)),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
            object: nil
        )
    }

    @objc private func storeDidChange(_ notification: Notification) {
        if notification.userInfo?[NSUbiquitousKeyValueStoreChangeReasonKey] as? Int == NSUbiquitousKeyValueStoreQuotaViolationChange {
            notifyListeners("iCloudError", data: ["reason": "iCloud backup storage limit exceeded"],
                            retainUntilConsumed: true)
            return
        }
        notifyListeners("iCloudChanged", data: [:])
    }

    @objc func setItem(_ call: CAPPluginCall) {
        // App Review 5.1.3(ii): consent does not permit personal health data in iCloud.
        call.reject("New personal-health iCloud backups are disabled. Export records locally; existing backups remain available for explicit read-only recovery.",
                    "ICLOUD_HEALTH_BACKUP_DISABLED")
    }

    @objc func getItem(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), dataKeys.contains(key) || key == erasureKey else {
            call.reject("Missing or unsupported backup key")
            return
        }
        guard FileManager.default.ubiquityIdentityToken != nil else {
            call.reject("Sign in to iCloud in device settings before reading an existing backup.")
            return
        }
        call.resolve(["value": store.string(forKey: key) ?? NSNull()])
    }

    @objc func getAll(_ call: CAPPluginCall) {
        guard FileManager.default.ubiquityIdentityToken != nil else {
            call.reject("Sign in to iCloud in device settings before restoring a backup.")
            return
        }
        store.synchronize()
        let dict = store.dictionaryRepresentation
        var out: [String: String] = [:]
        for (k, v) in dict where dataKeys.contains(k) || k == erasureKey {
            if let s = v as? String { out[k] = s }
        }
        call.resolve(["values": out])
    }

    @objc func eraseData(_ call: CAPPluginCall) {
        lock.lock()
        defer { lock.unlock() }
        guard FileManager.default.ubiquityIdentityToken != nil else {
            call.reject("iCloud is unavailable. Local-only deletion remains available.")
            return
        }
        store.set(ISO8601DateFormatter().string(from: Date()), forKey: erasureKey)
        for key in dataKeys { store.removeObject(forKey: key) }
        store.synchronize()
        call.resolve(["requested": true, "serverConfirmed": false])
    }
}
