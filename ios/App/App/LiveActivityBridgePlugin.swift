import ActivityKit
import Capacitor
import UIKit

@objc(LiveActivityBridgePlugin)
public class LiveActivityBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityBridgePlugin"
    public let jsName = "LiveActivityBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "consumeWorkoutLink", returnType: CAPPluginReturnPromise)
    ]

    static var pendingWorkoutLink = false
    static let workoutLinkOpened = Notification.Name("AutoFitWorkoutLinkOpened")
    private var pendingOperation: Task<Void, Never>?
    private var activityObserver: Task<Void, Never>?

    override public func load() {
        NotificationCenter.default.addObserver(
            self, selector: #selector(openWorkout), name: Self.workoutLinkOpened, object: nil)
        NotificationCenter.default.addObserver(
            self, selector: #selector(applicationBecameActive),
            name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    deinit {
        activityObserver?.cancel()
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func openWorkout() {
        Self.pendingWorkoutLink = false
        notifyListeners("openWorkout", data: [:], retainUntilConsumed: true)
    }

    @objc private func applicationBecameActive() {
        notifyListeners("activityAvailable", data: [:], retainUntilConsumed: true)
    }

    @objc func consumeWorkoutLink(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let requested = Self.pendingWorkoutLink
            Self.pendingWorkoutLink = false
            call.resolve(["requested": requested])
        }
    }

    @objc func sync(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let previous = self.pendingOperation
            self.pendingOperation = Task { @MainActor in
                await previous?.value
                guard let running = call.getBool("running") else {
                    call.reject("Missing workout running state")
                    return
                }
                let preview = call.getBool("preview") ?? false
                if !running && !preview {
                    self.activityObserver?.cancel()
                    for activity in Activity<WorkoutActivityAttributes>.activities {
                        await activity.end(nil, dismissalPolicy: .immediate)
                    }
                    call.resolve(["active": false])
                    return
                }
                guard let sessionID = call.getString("sessionID"), !sessionID.isEmpty, sessionID.count <= 128,
                      let start = call.getDouble("startMillis"),
                      let name = call.getString("exerciseName"),
                      let completed = call.getInt("completedSets"), let total = call.getInt("totalSets"),
                      let phase = call.getString("phase") else {
                    call.reject("Missing workout Live Activity data")
                    return
                }
                guard (preview && !running && phase == "ready") ||
                        (!preview && running && phase != "ready") else {
                    call.reject("Invalid Live Activity readiness state")
                    return
                }
                if UserDefaults.standard.string(forKey: "AutoFitDismissedActivitySession") == sessionID {
                    call.resolve(["active": false, "dismissed": true])
                    return
                }
                do {
                    let state = try WorkoutActivityState(
                        startMillis: start, exerciseName: name, completedSets: completed, totalSets: total,
                        phase: phase, phaseStartMillis: call.getDouble("phaseStartMillis"),
                        phaseEndMillis: call.getDouble("phaseEndMillis"))
                    let content = ActivityContent(state: state, staleDate: state.phaseEndsAt)
                    let activities = Activity<WorkoutActivityAttributes>.activities
                    let existing = activities.first(where: {
                        $0.attributes.sessionID == sessionID && ($0.activityState == .active || $0.activityState == .stale)
                    }) ?? activities.first(where: { $0.activityState == .active || $0.activityState == .stale })
                    if let existing = existing {
                        for duplicate in activities where duplicate.id != existing.id {
                            await duplicate.end(nil, dismissalPolicy: .immediate)
                        }
                        await existing.update(content)
                        self.observe(existing, sessionID: sessionID)
                    } else {
                        guard UIApplication.shared.applicationState == .active else {
                            call.resolve(["active": false, "pending": true])
                            return
                        }
                        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
                            call.reject("Live Activities are disabled. Enable them in iPhone Settings > AutoFit.",
                                        "ACTIVITIES_DISABLED")
                            return
                        }
                        let activity = try Activity.request(
                            attributes: WorkoutActivityAttributes(sessionID: sessionID),
                            content: content, pushType: nil)
                        self.observe(activity, sessionID: sessionID)
                    }
                    call.resolve(["active": true])
                } catch {
                    call.reject("Live Activity failed: \(error.localizedDescription)")
                }
            }
        }
    }

    @MainActor private func observe(_ activity: Activity<WorkoutActivityAttributes>, sessionID: String) {
        activityObserver?.cancel()
        activityObserver = Task { @MainActor in
            for await state in activity.activityStateUpdates {
                if Task.isCancelled { return }
                if state == .dismissed {
                    UserDefaults.standard.set(sessionID, forKey: "AutoFitDismissedActivitySession")
                    self.notifyListeners("activityAvailable", data: [:])
                    return
                }
                if state == .ended { return }
            }
        }
    }
}
