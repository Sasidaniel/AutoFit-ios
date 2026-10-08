import Foundation
import Capacitor
import HealthKit

/**
 * Native bridge to Apple HealthKit — lets AutoFit request permission and write
 * completed workouts directly to the Health app (replacing the old Shortcuts
 * workaround used in the PWA version).
 */
@objc(HealthBridgePlugin)
public class HealthBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthBridgePlugin"
    public let jsName = "HealthBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveWorkout", returnType: CAPPluginReturnPromise)
    ]

    private let healthStore = HKHealthStore()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("Health data not available on this device")
            return
        }
        let workoutType = HKObjectType.workoutType()
        let energyType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned)!
        let toShare: Set<HKSampleType> = [workoutType, energyType]
        let toRead: Set<HKObjectType> = [workoutType, energyType]

        healthStore.requestAuthorization(toShare: toShare, read: toRead) { success, error in
            if let error = error {
                call.reject("Authorization failed: \(error.localizedDescription)")
            } else {
                call.resolve(["granted": success])
            }
        }
    }

    // Saves a completed workout as a HealthKit workout sample, with the real
    // start/end dates of the workout (not "now"), so Health shows it on the
    // day it actually happened — even when synced later from history.
    @objc func saveWorkout(_ call: CAPPluginCall) {
        guard let startMillis = call.getDouble("startMillis"),
              let durationSec = call.getDouble("durationSec") else {
            call.reject("Missing startMillis or durationSec")
            return
        }
        let calories = call.getDouble("calories") ?? 0
        let startDate = Date(timeIntervalSince1970: startMillis / 1000.0)
        let endDate = startDate.addingTimeInterval(durationSec)

        let workoutConfig = HKWorkoutConfiguration()
        workoutConfig.activityType = .functionalStrengthTraining

        if #available(iOS 17.0, *) {
            let builder = HKWorkoutBuilder(healthStore: healthStore, configuration: workoutConfig, device: .local())
            builder.beginCollection(withStart: startDate) { success, error in
                guard success else {
                    call.reject("beginCollection failed: \(error?.localizedDescription ?? "unknown")")
                    return
                }
                var samples: [HKSample] = []
                if calories > 0, let energyType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) {
                    let energyQuantity = HKQuantity(unit: .kilocalorie(), doubleValue: calories)
                    let energySample = HKQuantitySample(type: energyType, quantity: energyQuantity, start: startDate, end: endDate)
                    samples.append(energySample)
                }
                let addSamplesBlock: (Bool) -> Void = { _ in
                    builder.endCollection(withEnd: endDate) { success, error in
                        guard success else {
                            call.reject("endCollection failed: \(error?.localizedDescription ?? "unknown")")
                            return
                        }
                        builder.finishWorkout { workout, error in
                            if let error = error {
                                call.reject("finishWorkout failed: \(error.localizedDescription)")
                            } else {
                                call.resolve(["saved": true, "id": workout?.uuid.uuidString ?? ""])
                            }
                        }
                    }
                }
                if samples.isEmpty {
                    addSamplesBlock(true)
                } else {
                    builder.add(samples) { success, error in
                        addSamplesBlock(success)
                    }
                }
            }
        } else {
            call.reject("Requires iOS 17 or later")
        }
    }
}
