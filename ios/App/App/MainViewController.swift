import Foundation
import Capacitor

/**
 * Registers AutoFit's custom native plugins (HealthKit + iCloud bridges).
 * Capacitor only auto-discovers plugins that ship as separate Swift packages,
 * so plugins compiled directly into the app target must be registered here.
 */
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(HealthBridgePlugin())
        bridge?.registerPluginInstance(CloudBridgePlugin())
        bridge?.registerPluginInstance(KeepAwakeBridgePlugin())
    }
}
