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
        print("All 16 audio policy cases passed")
    }
}
