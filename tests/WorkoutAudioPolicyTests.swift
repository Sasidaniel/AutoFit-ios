@main
struct WorkoutAudioPolicyTests {
    static func main() {
        for bluetooth in [false, true] {
            for wired in [false, true] {
                for highQuality in [false, true] {
                    let expected: WorkoutAudioPolicy.Input = wired ? .wired
                        : bluetooth && highQuality ? .highQualityBluetooth : .builtIn
                    precondition(WorkoutAudioPolicy.input(bluetoothOutput: bluetooth,
                        wiredInput: wired, highQualityBluetooth: highQuality) == expected)
                }
            }
        }
        for engine in [false, true] {
            for player in [false, true] {
                for configuration in [false, true] {
                    precondition(WorkoutAudioPolicy.needsPlaybackRecovery(engineRunning: engine,
                        playerPlaying: player, configurationMatches: configuration)
                        == !(engine && player && configuration))
                }
            }
        }
        precondition((1...4).map { WorkoutAudioPolicy.recognitionRetryDelay(failures: $0)! } == [1, 2, 3, 4])
        precondition(WorkoutAudioPolicy.recognitionRetryDelay(failures: 5) == nil)
        precondition(WorkoutAudioPolicy.recognitionRetryDelay(failures: 6) == nil)
        testAnnouncementRecovery()
        print("Audio routing, bounded recognition retries and announcement recovery passed")
    }

    private final class Utterance {}

    private static func testAnnouncementRecovery() {
        var queue = WorkoutAnnouncementQueue()
        let interrupted = Utterance()
        let queued = Utterance()
        queue.insert(interrupted, identifier: "rest:done")
        queue.insert(queued, identifier: "set:done")
        precondition(!queue.isEmpty && queue.contains("rest:done") && queue.contains("set:done"))
        queue.interrupt()
        precondition(queue.isEmpty && !queue.contains("rest:done") && !queue.contains("set:done"))

        let retried = Utterance()
        queue.insert(retried, identifier: "rest:done")
        precondition(!queue.finish(interrupted, cancelled: true))
        precondition(!queue.finish(queued, cancelled: false))
        precondition(!queue.isEmpty && queue.contains("rest:done") && !queue.contains("set:done"))
        precondition(queue.finish(retried, cancelled: false))
        precondition(queue.isEmpty && queue.contains("rest:done"))
        precondition(!queue.finish(retried, cancelled: false))

        let cancelled = Utterance()
        queue.insert(cancelled, identifier: "cancelled")
        precondition(queue.finish(cancelled, cancelled: true))
        precondition(queue.isEmpty && !queue.contains("cancelled"))

        for index in 0..<520 {
            let later = Utterance()
            queue.insert(later, identifier: "later:\(index)")
            precondition(queue.finish(later, cancelled: false))
            precondition(queue.isEmpty && queue.contains("later:\(index)"))
        }
        precondition(!queue.contains("rest:done") && !queue.contains("later:7") && queue.contains("later:8"))

        let unnamed = Utterance()
        queue.insert(unnamed, identifier: nil)
        precondition(!queue.isEmpty)
        precondition(queue.finish(unnamed, cancelled: false) && queue.isEmpty)
    }
}
