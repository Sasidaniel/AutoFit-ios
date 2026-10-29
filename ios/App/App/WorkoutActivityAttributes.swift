import Foundation
#if canImport(ActivityKit) && !ACTIVITY_STATE_TEST
import ActivityKit
#endif

struct WorkoutActivityState: Codable, Hashable {
    enum Phase: String, Codable { case ready, workout, rest, hold, cardio, paused }

    let workoutStartedAt: Date
    let exerciseName: String
    let completedSets: Int
    let totalSets: Int
    let phase: Phase
    let phaseStartedAt: Date?
    let phaseEndsAt: Date?
    // Optional for activities encoded by older app versions.
    let language: String?
    let feminineWording: Bool?
    let exerciseID: String?
    let setIndex: Int?
    let pausedElapsedSeconds: Double?
    let controlRevision: Int?
    var actionMessage: String?
    var actionPending: Bool?
    var isEnglish: Bool { language == "en" }
    var usesFeminineWording: Bool { feminineWording == true }
    var readyTitle: String {
        isEnglish ? "Ready to train" : usesFeminineWording ? "מוכנה לאימון" : "מוכן לאימון"
    }

    init(startMillis: Double, exerciseName: String, completedSets: Int, totalSets: Int,
         phase: String, phaseStartMillis: Double?, phaseEndMillis: Double?,
         nowMillis: Double = Date().timeIntervalSince1970 * 1000, language: String = "he",
         feminineWording: Bool = false,
         exerciseID: String? = nil, setIndex: Int? = nil, pausedElapsedSeconds: Double? = nil,
         controlRevision: Int? = nil) throws {
        guard startMillis.isFinite, startMillis > 0, startMillis <= nowMillis + 60000,
              !exerciseName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              exerciseName.count <= 120,
              completedSets >= 0, totalSets >= completedSets, totalSets <= 10000,
              let phase = Phase(rawValue: phase), ["he", "en"].contains(language) else {
            throw NSError(domain: "AutoFit.LiveActivity", code: 1,
                          userInfo: [NSLocalizedDescriptionKey: "Invalid workout Live Activity data"])
        }
        guard (exerciseID == nil || (exerciseID!.count <= 128 && !exerciseID!.isEmpty)),
              (setIndex == nil || (exerciseID != nil && setIndex! >= 0 && setIndex! < 10000)),
              (pausedElapsedSeconds == nil || (pausedElapsedSeconds!.isFinite && pausedElapsedSeconds! >= 0 && pausedElapsedSeconds! <= 31536000)),
              (controlRevision == nil || controlRevision! >= 0),
              (phase != .paused || pausedElapsedSeconds != nil) else {
            throw NSError(domain: "AutoFit.LiveActivity", code: 4,
                          userInfo: [NSLocalizedDescriptionKey: "Invalid workout controls"])
        }
        if phase == .workout || phase == .ready || phase == .paused {
            guard phaseStartMillis == nil, phaseEndMillis == nil else {
                throw NSError(domain: "AutoFit.LiveActivity", code: 2,
                              userInfo: [NSLocalizedDescriptionKey: "Unexpected phase timer"])
            }
        } else {
            guard let start = phaseStartMillis, let end = phaseEndMillis,
                  start.isFinite, end.isFinite, start > 0, start <= nowMillis + 60000,
                  end > start, end - start <= 86400000 else {
                throw NSError(domain: "AutoFit.LiveActivity", code: 3,
                              userInfo: [NSLocalizedDescriptionKey: "Invalid Live Activity timer interval"])
            }
        }
        workoutStartedAt = Date(timeIntervalSince1970: startMillis / 1000)
        self.exerciseName = exerciseName
        self.completedSets = completedSets
        self.totalSets = totalSets
        self.phase = phase
        self.language = language
        self.feminineWording = feminineWording
        self.exerciseID = exerciseID
        self.setIndex = setIndex
        self.pausedElapsedSeconds = pausedElapsedSeconds
        self.controlRevision = controlRevision
        phaseStartedAt = phaseStartMillis.map { Date(timeIntervalSince1970: $0 / 1000) }
        phaseEndsAt = phaseEndMillis.map { Date(timeIntervalSince1970: $0 / 1000) }
    }
}

struct WorkoutActivityAction: Codable {
    static let storageKey = "AutoFitPendingWorkoutAction"
    static let acknowledgedKey = "AutoFitAcknowledgedWorkoutActions"
    static let notification = Notification.Name("AutoFitWorkoutActionRequested")
    let id: String
    let sessionID: String
    let command: String
    let exerciseID: String
    let setIndex: Int
    let createdAt: Double
    let controlRevision: Int

    func isFresh(now: Double = Date().timeIntervalSince1970 * 1000) -> Bool {
        createdAt.isFinite && now - createdAt >= -5000 && now - createdAt <= 20000
    }
}

#if canImport(ActivityKit) && !ACTIVITY_STATE_TEST
import AppIntents

struct WorkoutActivityAttributes: ActivityAttributes {
    typealias ContentState = WorkoutActivityState
    let sessionID: String
}

@available(iOS 17.0, *)
struct WorkoutControlIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Workout control"

    @Parameter(title: "Workout") var sessionID: String
    @Parameter(title: "Action") var command: String
    @Parameter(title: "Exercise") var exerciseID: String
    @Parameter(title: "Set") var setIndex: Int
    @Parameter(title: "Revision") var controlRevision: Int

    init() {}
    init(sessionID: String, command: String, exerciseID: String = "", setIndex: Int = -1, controlRevision: Int = 0) {
        self.sessionID = sessionID
        self.command = command
        self.exerciseID = exerciseID
        self.setIndex = setIndex
        self.controlRevision = controlRevision
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        guard let activity = Activity<WorkoutActivityAttributes>.activities.first(where: {
            $0.attributes.sessionID == sessionID && ($0.activityState == .active || $0.activityState == .stale)
        }) else {
            NSLog("AutoFit: ignored a control for an ended Live Activity")
            return .result()
        }
        var state = activity.content.state
        if state.actionPending == true { return .result() }
        let valid = command == "pause" && state.phase != .ready && state.phase != .paused
            || command == "resume" && state.phase == .paused
            || command == "completeSet" && [.workout, .hold].contains(state.phase)
                && state.exerciseID == exerciseID && state.setIndex == setIndex
        guard valid && controlRevision == (state.controlRevision ?? 0) else {
            state.actionMessage = state.isEnglish ? "This control is out of date. Open AutoFit."
                : state.usesFeminineWording ? "הפעולה אינה עדכנית. פתחי את AutoFit." : "הפעולה אינה עדכנית. פתח את AutoFit."
            state.actionPending = false
            await activity.update(ActivityContent(state: state, staleDate: state.phaseEndsAt))
            return .result()
        }
        var request = WorkoutActivityAction(id: UUID().uuidString, sessionID: sessionID,
            command: command, exerciseID: exerciseID, setIndex: setIndex,
            createdAt: Date().timeIntervalSince1970 * 1000, controlRevision: controlRevision)
        if let data = UserDefaults.standard.data(forKey: WorkoutActivityAction.storageKey) {
            do {
                let pending = try JSONDecoder().decode(WorkoutActivityAction.self, from: data)
                if pending.isFresh() && pending.sessionID == sessionID { request = pending }
            } catch {
                NSLog("AutoFit: invalid pending workout control: %@", error.localizedDescription)
            }
        }
        do {
            let data = try JSONEncoder().encode(request)
            UserDefaults.standard.set(data, forKey: WorkoutActivityAction.storageKey)
            guard UserDefaults.standard.data(forKey: WorkoutActivityAction.storageKey) == data else {
                throw NSError(domain: "AutoFit.LiveActivity", code: 5,
                    userInfo: [NSLocalizedDescriptionKey: "Cannot store workout control"])
            }
            state.actionPending = true
            state.actionMessage = state.isEnglish ? "Updating…" : "מעדכן…"
            await activity.update(ActivityContent(state: state, staleDate: state.phaseEndsAt))
            NotificationCenter.default.post(name: WorkoutActivityAction.notification, object: nil)
            for _ in 0..<50 {
                guard UserDefaults.standard.data(forKey: WorkoutActivityAction.storageKey) != nil else { return .result() }
                try await Task.sleep(nanoseconds: 100_000_000)
            }
        } catch {
            NSLog("AutoFit: workout control could not complete: %@", error.localizedDescription)
        }
        var latest = activity.content.state
        latest.actionPending = false
        latest.actionMessage = latest.isEnglish ? "Open AutoFit to finish this request."
            : latest.usesFeminineWording ? "פתחי את AutoFit להשלמת הבקשה." : "פתח את AutoFit להשלמת הבקשה."
        await activity.update(ActivityContent(state: latest, staleDate: latest.phaseEndsAt))
        return .result()
    }
}
#endif
