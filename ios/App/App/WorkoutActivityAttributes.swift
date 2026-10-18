import Foundation
#if canImport(ActivityKit) && !ACTIVITY_STATE_TEST
import ActivityKit
#endif

struct WorkoutActivityState: Codable, Hashable {
    enum Phase: String, Codable { case ready, workout, rest, hold, cardio }

    let workoutStartedAt: Date
    let exerciseName: String
    let completedSets: Int
    let totalSets: Int
    let phase: Phase
    let phaseStartedAt: Date?
    let phaseEndsAt: Date?

    init(startMillis: Double, exerciseName: String, completedSets: Int, totalSets: Int,
         phase: String, phaseStartMillis: Double?, phaseEndMillis: Double?,
         nowMillis: Double = Date().timeIntervalSince1970 * 1000) throws {
        guard startMillis.isFinite, startMillis > 0, startMillis <= nowMillis + 60000,
              !exerciseName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              exerciseName.count <= 120,
              completedSets >= 0, totalSets >= completedSets, totalSets <= 10000,
              let phase = Phase(rawValue: phase) else {
            throw NSError(domain: "AutoFit.LiveActivity", code: 1,
                          userInfo: [NSLocalizedDescriptionKey: "Invalid workout Live Activity data"])
        }
        if phase == .workout || phase == .ready {
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
        phaseStartedAt = phaseStartMillis.map { Date(timeIntervalSince1970: $0 / 1000) }
        phaseEndsAt = phaseEndMillis.map { Date(timeIntervalSince1970: $0 / 1000) }
    }
}

#if canImport(ActivityKit) && !ACTIVITY_STATE_TEST
struct WorkoutActivityAttributes: ActivityAttributes {
    typealias ContentState = WorkoutActivityState
    let sessionID: String
}
#endif
