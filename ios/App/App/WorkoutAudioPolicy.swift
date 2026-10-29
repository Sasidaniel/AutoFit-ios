enum WorkoutAudioPolicy {
    enum Input: Equatable {
        case wired
        case headset
        case builtIn
    }

    static func input(bluetoothOutput: Bool, wiredInput: Bool,
                      preferHeadset: Bool = false, headsetAvailable: Bool = false) -> Input {
        if wiredInput { return .wired }
        if preferHeadset && headsetAvailable { return .headset }
        return .builtIn
    }

    static func needsPlaybackRecovery(engineRunning: Bool, playerPlaying: Bool, configurationMatches: Bool) -> Bool {
        !engineRunning || !playerPlaying || !configurationMatches
    }

    // A stable category preserves music routing; only capture must stop in the background.
    static func recordingSession(microphoneRequested: Bool, foreground: Bool, keepingAlive: Bool) -> Bool {
        microphoneRequested && (foreground || keepingAlive)
    }

    static func captureMicrophone(microphoneRequested: Bool, foreground: Bool) -> Bool {
        microphoneRequested && foreground
    }

    static func recognitionRetryDelay(failures: Int) -> Double? {
        guard failures < 5 else { return nil }
        return Double(max(1, min(failures, 4)))
    }

    static func needsCaptureRecovery(engineRunning: Bool, secondsWithoutInput: Double) -> Bool {
        !engineRunning || secondsWithoutInput >= 4
    }

    static let focusedListeningSeconds: Double = 120
}

struct WorkoutAudioInterruption {
    private(set) var interrupted = false
    private(set) var mayResume = true

    mutating func begin() {
        interrupted = true
        mayResume = false
    }

    mutating func end(shouldResume: Bool) {
        interrupted = false
        mayResume = shouldResume
    }

    mutating func userRequestedRecovery() {
        interrupted = false
        mayResume = true
    }
}

struct WorkoutAudioOwnership {
    private(set) var active = false
    private(set) var handoffPending = false

    mutating func activated(temporarilyExclusive: Bool) {
        active = true
        handoffPending = handoffPending || temporarilyExclusive
    }

    mutating func interrupted() {
        handoffPending = handoffPending || active
        active = false
    }

    mutating func released() {
        active = false
        handoffPending = false
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
