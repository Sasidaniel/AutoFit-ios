import Foundation
import Capacitor

/**
 * Native bridge to iCloud Key-Value Store — lets AutoFit silently back up its
 * local data (exercises, workouts, settings) to the user's iCloud account, so
 * it survives an iPhone reset/reinstall as long as they sign back into the
 * same Apple ID. No login screen, no server — fully automatic like Notes.
 */
@objc(CloudBridgePlugin)
public class CloudBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CloudBridgePlugin"
    public let jsName = "CloudBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getItem", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAll", returnType: CAPPluginReturnPromise)
    ]

    private let store = NSUbiquitousKeyValueStore.default

    override public func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(storeDidChange(_:)),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
            object: store
        )
        store.synchronize()
    }

    @objc private func storeDidChange(_ notification: Notification) {
        // Notify JS so the app can reload data that changed on another device.
        notifyListeners("iCloudChanged", data: [:])
    }

    @objc func setItem(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), let value = call.getString("value") else {
            call.reject("Missing key or value")
            return
        }
        store.set(value, forKey: key)
        store.synchronize()
        call.resolve(["saved": true])
    }

    @objc func getItem(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("Missing key")
            return
        }
        call.resolve(["value": store.string(forKey: key) ?? NSNull()])
    }

    @objc func getAll(_ call: CAPPluginCall) {
        let dict = store.dictionaryRepresentation
        var out: [String: String] = [:]
        for (k, v) in dict {
            if let s = v as? String { out[k] = s }
        }
        call.resolve(["values": out])
    }
}
