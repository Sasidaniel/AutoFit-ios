import Foundation

@main
struct WorkoutActivityStateTests {
    static func main() throws {
        let now = 1792300000000.0
        func state(_ phase: String = "workout", start: Double? = nil, end: Double? = nil,
                   completed: Int = 2, total: Int = 6, name: String = "Bench") throws -> WorkoutActivityState {
            try WorkoutActivityState(startMillis: now - 60000, exerciseName: name,
                                     completedSets: completed, totalSets: total, phase: phase,
                                     phaseStartMillis: start, phaseEndMillis: end, nowMillis: now)
        }
        let workout = try state()
        precondition(workout.workoutStartedAt.timeIntervalSince1970 == (now - 60000) / 1000)
        precondition(workout.phaseStartedAt == nil && workout.phaseEndsAt == nil)
        let ready = try state("ready")
        precondition(ready.phase == .ready && ready.phaseStartedAt == nil && ready.phaseEndsAt == nil)
        let decodedReady = try JSONDecoder().decode(WorkoutActivityState.self, from: JSONEncoder().encode(ready))
        precondition(decodedReady == ready)
        for phase in ["rest", "hold", "cardio"] {
            let timed = try state(phase, start: now, end: now + 90000)
            precondition(timed.phaseEndsAt!.timeIntervalSince(timed.phaseStartedAt!) == 90)
            let data = try JSONEncoder().encode(timed)
            precondition(data.count < 4096)
            let decoded = try JSONDecoder().decode(WorkoutActivityState.self, from: data)
            precondition(decoded == timed)
        }
        let invalid: [() throws -> WorkoutActivityState] = [
            { try state("unknown") },
            { try state("rest") },
            { try state("rest", start: now, end: now - 1) },
            { try state("rest", start: .nan, end: now) },
            { try state("hold", start: now, end: .infinity) },
            { try state("cardio", start: now, end: now + 86400001) },
            { try state("workout", start: now, end: now + 1000) },
            { try state("ready", start: now, end: now + 1000) },
            { try state(completed: -1) },
            { try state(completed: 7, total: 6) },
            { try state(total: 10001) },
            { try state(name: " ") },
            { try state(name: String(repeating: "x", count: 121)) },
        ]
        for make in invalid {
            do {
                _ = try make()
                preconditionFailure("Invalid activity data was accepted")
            } catch {
                precondition((error as NSError).domain == "AutoFit.LiveActivity")
            }
        }
        print("Workout Activity state tests passed")
    }
}
