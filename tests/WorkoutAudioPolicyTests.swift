@main
struct WorkoutAudioPolicyTests {
    static func main() {
        for bluetooth in [false, true] {
            for wired in [false, true] {
                let expected: WorkoutAudioPolicy.Input = wired ? .wired : .builtIn
                precondition(WorkoutAudioPolicy.input(bluetoothOutput: bluetooth,
                    wiredInput: wired) == expected)
            }
        }
        for prefer in [false, true] {
            for available in [false, true] {
                precondition(WorkoutAudioPolicy.input(bluetoothOutput: true, wiredInput: false,
                    preferHeadset: prefer, headsetAvailable: available)
                    == (prefer && available ? .headset : .builtIn))
                precondition(WorkoutAudioPolicy.input(bluetoothOutput: true, wiredInput: true,
                    preferHeadset: prefer, headsetAvailable: available) == .wired)
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
        testForegroundHandover()
        testAnnouncementRecovery()
        print("Audio routing, foreground handover, bounded recognition retries and announcement recovery passed")
    }

    private final class Utterance {}

    private static func testForegroundHandover() {
        for requested in [false, true] {
            for foreground in [false, true] {
                for keepingAlive in [false, true] {
                    let recording = WorkoutAudioPolicy.recordingSession(microphoneRequested: requested,
                        foreground: foreground, keepingAlive: keepingAlive)
                    let capture = WorkoutAudioPolicy.captureMicrophone(microphoneRequested: requested,
                        foreground: foreground)
                    if !requested {
                        precondition(!recording && !capture)
                    } else if foreground {
                        precondition(recording && capture)
                    } else {
                        precondition(!capture && recording == keepingAlive)
                    }
                }
            }
        }
        let recording = [true, false, true, false, true].map {
            WorkoutAudioPolicy.recordingSession(microphoneRequested: true, foreground: $0, keepingAlive: true)
        }
        let capture = [true, false, true, false, true].map {
            WorkoutAudioPolicy.captureMicrophone(microphoneRequested: true, foreground: $0)
        }
        precondition(recording.allSatisfy { $0 })
        precondition(capture == [true, false, true, false, true])
        precondition(!WorkoutAudioPolicy.recordingSession(microphoneRequested: false,
            foreground: true, keepingAlive: true))
        precondition(!WorkoutAudioPolicy.recordingSession(microphoneRequested: true,
            foreground: false, keepingAlive: false))
    }

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
