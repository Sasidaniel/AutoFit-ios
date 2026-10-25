import ActivityKit
import Capacitor
import UIKit

@objc(LiveActivityBridgePlugin)
public class LiveActivityBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveActivityBridgePlugin"
    public let jsName = "LiveActivityBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "consumeWorkoutLink", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "consumeWorkoutAction", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acknowledgeWorkoutAction", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "eraseState", returnType: CAPPluginReturnPromise)
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
        NotificationCenter.default.addObserver(
            self, selector: #selector(workoutActionRequested),
            name: WorkoutActivityAction.notification, object: nil)
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

    private func pendingAction() throws -> [String: Any]? {
        guard let data = UserDefaults.standard.data(forKey: WorkoutActivityAction.storageKey) else { return nil }
        _ = try JSONDecoder().decode(WorkoutActivityAction.self, from: data)
        return try JSONSerialization.jsonObject(with: data) as? [String: Any]
    }

    @objc private func workoutActionRequested() {
        do {
            if let request = try pendingAction() {
                notifyListeners("workoutAction", data: request, retainUntilConsumed: true)
            }
        } catch {
            NSLog("AutoFit: cannot read workout control: %@", error.localizedDescription)
        }
    }

    @objc func consumeWorkoutAction(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            do {
                if let request = try self.pendingAction() { call.resolve(["request": request]) }
                else { call.resolve(["request": NSNull()]) }
            }
            catch { call.reject("Cannot read workout control: \(error.localizedDescription)") }
        }
    }

    @objc func acknowledgeWorkoutAction(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let previous = self.pendingOperation
            self.pendingOperation = Task { @MainActor in
                await previous?.value
                do {
                    guard let id = call.getString("id"), let success = call.getBool("success") else {
                        call.reject("Missing workout control acknowledgement")
                        return
                    }
                    let pending = try self.pendingAction()
                    var acknowledged = UserDefaults.standard.stringArray(forKey: WorkoutActivityAction.acknowledgedKey) ?? []
                    if pending?["id"] as? String != id && acknowledged.contains(id) {
                        call.resolve(["acknowledged": true])
                        return
                    }
                    guard let request = pending, request["id"] as? String == id,
                          let sessionID = request["sessionID"] as? String else {
                        call.reject("Workout control is no longer pending")
                        return
                    }
                    for activity in Activity<WorkoutActivityAttributes>.activities where activity.attributes.sessionID == sessionID {
                        var state = activity.content.state
                        state.actionPending = false
                        state.actionMessage = success ? nil : String((call.getString("reason")
                            ?? (state.isEnglish ? "Open AutoFit to check this request." : "פתח את AutoFit לבדיקת הבקשה.")).prefix(180))
                        await activity.update(ActivityContent(state: state, staleDate: state.phaseEndsAt))
                    }
                    acknowledged.append(id)
                    UserDefaults.standard.set(Array(acknowledged.suffix(32)), forKey: WorkoutActivityAction.acknowledgedKey)
                    UserDefaults.standard.removeObject(forKey: WorkoutActivityAction.storageKey)
                    call.resolve(["acknowledged": true])
                } catch {
                    call.reject("Cannot acknowledge workout control: \(error.localizedDescription)")
                }
            }
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
                let paused = call.getBool("paused") ?? false
                if !running && !preview && !paused {
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
                guard (preview && !running && !paused && phase == "ready") ||
                        (!preview && running && !paused && phase != "ready" && phase != "paused") ||
                        (!preview && !running && paused && phase == "paused") else {
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
                        phaseEndMillis: call.getDouble("phaseEndMillis"),
                        language: call.getString("language") ?? "he",
                        exerciseID: call.getString("exerciseID"), setIndex: call.getInt("setIndex"),
                        pausedElapsedSeconds: call.getDouble("pausedElapsedSeconds"),
                        controlRevision: call.getInt("controlRevision"))
                    let content = ActivityContent(state: state, staleDate: state.phaseEndsAt)
                    let activities = Activity<WorkoutActivityAttributes>.activities
                    let existing = activities.first(where: {
                        $0.attributes.sessionID == sessionID && ($0.activityState == .active || $0.activityState == .stale)
                    })
                    if let existing = existing {
                        for duplicate in activities where duplicate.id != existing.id {
                            await duplicate.end(nil, dismissalPolicy: .immediate)
                        }
                        await existing.update(content)
                        self.observe(existing, sessionID: sessionID)
                    } else {
                        for oldActivity in activities {
                            await oldActivity.end(nil, dismissalPolicy: .immediate)
                        }
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

    @objc func eraseState(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let previous = self.pendingOperation
            self.pendingOperation = Task { @MainActor in
                await previous?.value
                self.activityObserver?.cancel()
                for activity in Activity<WorkoutActivityAttributes>.activities {
                    await activity.end(nil, dismissalPolicy: .immediate)
                }
                UserDefaults.standard.removeObject(forKey: WorkoutActivityAction.storageKey)
                UserDefaults.standard.removeObject(forKey: WorkoutActivityAction.acknowledgedKey)
                UserDefaults.standard.removeObject(forKey: "AutoFitDismissedActivitySession")
                Self.pendingWorkoutLink = false
                call.resolve(["cleared": true])
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
