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
        CAPPluginMethod(name: "authorizationStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "saveWorkout", returnType: CAPPluginReturnPromise)
    ]

    private let healthStore = HKHealthStore()

    @objc func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc func authorizationStatus(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["granted": false, "reason": "Health data is unavailable"])
            return
        }
        let granted = healthStore.authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized
        call.resolve(["granted": granted,
                      "reason": granted ? "" : "Workout write access has not been granted in Apple Health"])
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
            if let error = error as NSError? {
                call.reject("Authorization failed: \(error.localizedDescription) [\(error.domain)#\(error.code)]")
            } else {
                let granted = success && self.healthStore.authorizationStatus(for: workoutType) == .sharingAuthorized
                call.resolve([
                    "granted": granted,
                    "reason": granted ? "" : "Workout write access is not granted in Apple Health"
                ])
            }
        }
    }

    // Saves a completed workout as a HealthKit workout sample, with the real
    // start/end dates of the workout (not "now"), so Health shows it on the
    // day it actually happened — even when synced later from history.
    @objc func saveWorkout(_ call: CAPPluginCall) {
        guard let startMillis = call.getDouble("startMillis"),
              let durationSec = call.getDouble("durationSec"),
              let workoutID = call.getString("workoutID"), !workoutID.isEmpty, workoutID.count <= 128,
              let entries = call.getArray("entries"), JSONSerialization.isValidJSONObject(entries) else {
            call.reject("Missing or invalid workout identifier, date, duration or exercise summary")
            return
        }
        let calories = call.getDouble("calories") ?? 0
        guard startMillis.isFinite, durationSec.isFinite, durationSec > 0,
              calories.isFinite, calories >= 0 else {
            call.reject("Invalid workout date, duration or calories")
            return
        }
        guard healthStore.authorizationStatus(for: HKObjectType.workoutType()) == .sharingAuthorized else {
            call.reject("Workout write access is not granted in Apple Health")
            return
        }
        let startDate = Date(timeIntervalSince1970: startMillis / 1000.0)
        let endDate = startDate.addingTimeInterval(durationSec)

        let workoutConfig = HKWorkoutConfiguration()
        workoutConfig.activityType = .traditionalStrengthTraining

        if #available(iOS 17.0, *) {
            let builder = HKWorkoutBuilder(healthStore: healthStore, configuration: workoutConfig, device: .local())
            let summary: String
            do {
                let data = try JSONSerialization.data(withJSONObject: entries)
                guard let text = String(data: data, encoding: .utf8) else {
                    call.reject("Cannot encode exercise summary")
                    return
                }
                summary = text
            } catch {
                call.reject("Cannot encode exercise summary: \(error.localizedDescription)")
                return
            }
            let metadata: [String: Any] = [
                HKMetadataKeySyncIdentifier: "autofit.\(workoutID)",
                HKMetadataKeySyncVersion: 2,
                HKMetadataKeyWorkoutBrandName: "AutoFit",
                "AutoFitExerciseSummary": summary
            ]
            builder.addMetadata(metadata) { success, error in
                guard success else {
                    call.reject("Workout metadata failed: \(error?.localizedDescription ?? "unknown")")
                    return
                }
                builder.beginCollection(withStart: startDate) { success, error in
                    guard success else {
                        call.reject("beginCollection failed: \(error?.localizedDescription ?? "unknown")")
                        return
                    }
                    var samples: [HKSample] = []
                    if calories > 0, let energyType = HKObjectType.quantityType(forIdentifier: .activeEnergyBurned) {
                        let energyQuantity = HKQuantity(unit: .kilocalorie(), doubleValue: calories)
                        samples.append(HKQuantitySample(type: energyType, quantity: energyQuantity,
                            start: startDate, end: endDate, metadata: [
                                HKMetadataKeySyncIdentifier: "autofit.\(workoutID).energy",
                                HKMetadataKeySyncVersion: 2
                            ]))
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
                                } else if let workout = workout {
                                    call.resolve(["saved": true, "id": workout.uuid.uuidString])
                                } else {
                                    call.reject("HealthKit returned no saved workout")
                                }
                            }
                        }
                    }
                    if samples.isEmpty {
                        addSamplesBlock(true)
                    } else {
                        builder.add(samples) { success, error in
                            guard success else {
                                call.reject("addSamples failed: \(error?.localizedDescription ?? "unknown")")
                                return
                            }
                            addSamplesBlock(success)
                        }
                    }
                }
            }
        } else {
            call.reject("Requires iOS 17 or later")
        }
    }
}
