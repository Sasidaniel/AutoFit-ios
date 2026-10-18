import Foundation
import Capacitor
import LocalAuthentication

/**
 * Native Face ID / Touch ID bridge using Apple's LocalAuthentication framework directly.
 * Replaces the third-party `capacitor-native-biometric` plugin, which only ships a
 * CocoaPods podspec (no Swift Package Manager support) and therefore was never actually
 * compiled into this SPM-only project — Face ID silently never worked because of that.
 */
@objc(FaceIdBridgePlugin)
public class FaceIdBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FaceIdBridgePlugin"
    public let jsName = "FaceIdBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "verifyIdentity", returnType: CAPPluginReturnPromise)
    ]

    @objc func isAvailable(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        let available = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        var biometryType = "none"
        if available {
            switch context.biometryType {
            case .faceID: biometryType = "faceId"
            case .touchID: biometryType = "touchId"
            default: biometryType = "none"
            }
        }
        call.resolve([
            "isAvailable": available,
            "biometryType": biometryType,
            "errorCode": error?.code ?? 0
        ])
    }

    @objc func verifyIdentity(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            call.reject("Biometric authentication not available: \(error?.localizedDescription ?? "unknown")")
            return
        }
        let reason = call.getString("reason") ?? "אימות זהות"
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, evalError in
            DispatchQueue.main.async {
                if success {
                    call.resolve(["verified": true])
                } else {
                    call.reject("Verification failed: \(evalError?.localizedDescription ?? "unknown")")
                }
            }
        }
    }
}
