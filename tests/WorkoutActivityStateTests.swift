import Foundation

@main
struct WorkoutActivityStateTests {
    static func main() throws {
        let now = 1792300000000.0
        func state(_ phase: String = "workout", start: Double? = nil, end: Double? = nil,
                   completed: Int = 2, total: Int = 6, name: String = "Bench", language: String = "he") throws -> WorkoutActivityState {
            try WorkoutActivityState(startMillis: now - 60000, exerciseName: name,
                                     completedSets: completed, totalSets: total, phase: phase,
                                     phaseStartMillis: start, phaseEndMillis: end, nowMillis: now, language: language)
        }
        let workout = try state()
        precondition(!workout.isEnglish)
        precondition(!workout.usesFeminineWording && workout.readyTitle == "מוכן לאימון")
        let feminine = try WorkoutActivityState(startMillis: now - 60000, exerciseName: "Bench",
            completedSets: 2, totalSets: 6, phase: "workout",
            phaseStartMillis: nil, phaseEndMillis: nil, nowMillis: now, feminineWording: true)
        precondition(feminine.usesFeminineWording && feminine.readyTitle == "מוכנה לאימון")
        let feminineRoundTrip = try JSONDecoder().decode(WorkoutActivityState.self, from: JSONEncoder().encode(feminine))
        precondition(feminineRoundTrip.usesFeminineWording)
        let english = try WorkoutActivityState(startMillis: now - 60000, exerciseName: "Bench",
            completedSets: 2, totalSets: 6, phase: "workout",
            phaseStartMillis: nil, phaseEndMillis: nil, nowMillis: now, language: "en")
        let englishRoundTrip = try JSONDecoder().decode(WorkoutActivityState.self, from: JSONEncoder().encode(english))
        precondition(englishRoundTrip.isEnglish)
        precondition(englishRoundTrip.readyTitle == "Ready to train")
        var legacyJSON = try JSONSerialization.jsonObject(with: JSONEncoder().encode(workout)) as! [String: Any]
        legacyJSON.removeValue(forKey: "language")
        legacyJSON.removeValue(forKey: "feminineWording")
        let legacy = try JSONDecoder().decode(WorkoutActivityState.self,
            from: JSONSerialization.data(withJSONObject: legacyJSON))
        precondition(legacy.language == nil && !legacy.isEnglish)
        precondition(!legacy.usesFeminineWording && legacy.readyTitle == "מוכן לאימון")
        precondition(workout.workoutStartedAt.timeIntervalSince1970 == (now - 60000) / 1000)
        precondition(workout.phaseStartedAt == nil && workout.phaseEndsAt == nil)
        let ready = try state("ready")
        precondition(ready.phase == .ready && ready.phaseStartedAt == nil && ready.phaseEndsAt == nil)
        let decodedReady = try JSONDecoder().decode(WorkoutActivityState.self, from: JSONEncoder().encode(ready))
        precondition(decodedReady == ready)
        let paused = try WorkoutActivityState(startMillis: now - 60000, exerciseName: "Bench",
            completedSets: 2, totalSets: 6, phase: "paused", phaseStartMillis: nil, phaseEndMillis: nil,
            nowMillis: now, exerciseID: "native:bench", setIndex: 1, pausedElapsedSeconds: 120, controlRevision: 4)
        precondition(paused.phase == .paused && paused.pausedElapsedSeconds == 120 && paused.setIndex == 1)
        let decodedPaused = try JSONDecoder().decode(WorkoutActivityState.self, from: JSONEncoder().encode(paused))
        precondition(decodedPaused == paused)
        let request = WorkoutActivityAction(id: "request", sessionID: "session", command: "completeSet",
            exerciseID: "native:bench", setIndex: 1, createdAt: now, controlRevision: 4)
        precondition(request.isFresh(now: now + 20000))
        precondition(!request.isFresh(now: now + 20001))
        precondition(!request.isFresh(now: now - 5001))
        let decodedRequest = try JSONDecoder().decode(WorkoutActivityAction.self, from: JSONEncoder().encode(request))
        precondition(decodedRequest.controlRevision == 4)
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
            { try state(language: "fr") },
            { try state("paused") },
            { try WorkoutActivityState(startMillis: now, exerciseName: "Bench", completedSets: 0, totalSets: 2,
                phase: "paused", phaseStartMillis: nil, phaseEndMillis: nil, nowMillis: now, pausedElapsedSeconds: .infinity) },
            { try WorkoutActivityState(startMillis: now, exerciseName: "Bench", completedSets: 0, totalSets: 2,
                phase: "paused", phaseStartMillis: nil, phaseEndMillis: nil, nowMillis: now, pausedElapsedSeconds: 1e300) },
            { try WorkoutActivityState(startMillis: now, exerciseName: "Bench", completedSets: 0, totalSets: 2,
                phase: "workout", phaseStartMillis: nil, phaseEndMillis: nil, nowMillis: now, setIndex: 1) },
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
