import Foundation

struct SpeechUtteranceBuffer {
    static let silenceInterval: TimeInterval = 0.65
    private var transcript = ""
    private var changedAt: TimeInterval = 0
    private var emitted = false

    mutating func update(_ text: String, isFinal: Bool, at now: TimeInterval) -> String? {
        guard !emitted else { return nil }
        let text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return nil }
        if text != transcript {
            transcript = text
            changedAt = now
        }
        return isFinal ? emit() : flush(at: now)
    }

    mutating func flush(at now: TimeInterval) -> String? {
        guard now - changedAt >= Self.silenceInterval else { return nil }
        return emit()
    }

    private mutating func emit() -> String? {
        guard !emitted, !transcript.isEmpty else { return nil }
        emitted = true
        return transcript
    }
}
