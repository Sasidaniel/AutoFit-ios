enum WorkoutAudioPolicy {
    enum Input: Equatable {
        case wired
        case highQualityBluetooth
        case builtIn
    }

    static func input(bluetoothOutput: Bool, wiredInput: Bool, highQualityBluetooth: Bool) -> Input {
        if wiredInput { return .wired }
        if bluetoothOutput && highQualityBluetooth { return .highQualityBluetooth }
        return .builtIn
    }

    static func needsPlaybackRecovery(engineRunning: Bool, playerPlaying: Bool, configurationMatches: Bool) -> Bool {
        !engineRunning || !playerPlaying || !configurationMatches
    }
}
