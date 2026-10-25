enum WorkoutAudioPolicy {
    enum Input: Equatable {
        case wired
        case highQualityBluetooth
        case headset
        case builtIn
    }

    static func input(bluetoothOutput: Bool, wiredInput: Bool, highQualityBluetooth: Bool,
                      preferHeadset: Bool = false, headsetAvailable: Bool = false) -> Input {
        if wiredInput { return .wired }
        if preferHeadset && headsetAvailable { return .headset }
        if bluetoothOutput && highQualityBluetooth { return .highQualityBluetooth }
        return .builtIn
    }

    static func needsPlaybackRecovery(engineRunning: Bool, playerPlaying: Bool, configurationMatches: Bool) -> Bool {
        !engineRunning || !playerPlaying || !configurationMatches
    }

    static func recognitionRetryDelay(failures: Int) -> Double? {
        guard failures < 5 else { return nil }
        return Double(max(1, min(failures, 4)))
    }
}

struct WorkoutAnnouncementQueue {
    private var pending: [ObjectIdentifier: String] = [:]
    private var completed: [String] = []

    var isEmpty: Bool { pending.isEmpty }

    func contains(_ identifier: String) -> Bool {
        completed.contains(identifier) || pending.values.contains(identifier)
    }

    mutating func insert(_ utterance: AnyObject, identifier: String?) {
        pending[ObjectIdentifier(utterance)] = identifier ?? ""
    }

    mutating func finish(_ utterance: AnyObject, cancelled: Bool) -> Bool {
        guard let identifier = pending.removeValue(forKey: ObjectIdentifier(utterance)) else { return false }
        if !cancelled && !identifier.isEmpty {
            completed.append(identifier)
            if completed.count > 512 { completed.removeFirst() }
        }
        return true
    }

    mutating func interrupt() {
        pending.removeAll()
    }
}
