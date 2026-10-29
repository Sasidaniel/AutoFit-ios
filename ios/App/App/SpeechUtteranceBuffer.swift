import Foundation

struct SpeechUtteranceBuffer {
    static let silenceInterval: TimeInterval = 0.65
    private var transcript = ""
    private var changedAt: TimeInterval = 0
    private var committedWords = 0
    private var lastNumericEmission = ""

    mutating func update(_ text: String, isFinal: Bool, at now: TimeInterval) -> String? {
        let text = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return nil }
        if text != transcript {
            transcript = text
            changedAt = now
        }
        let words = Self.parts(transcript)
        let pending = Array(words.dropFirst(committedWords))
        if words.count >= committedWords && pending.allSatisfy(Self.isNumberWord) {
            var start = committedWords
            while start > 0 && Self.isNumberWord(words[start - 1]) { start -= 1 }
            let count = words.dropFirst(start).joined(separator: " ")
            if !count.isEmpty && count != lastNumericEmission {
                committedWords = words.count
                lastNumericEmission = count
                return count
            }
        }
        return isFinal ? emit() : flush(at: now)
    }

    mutating func flush(at now: TimeInterval) -> String? {
        guard now - changedAt >= Self.silenceInterval else { return nil }
        return emit()
    }

    private mutating func emit() -> String? {
        let words = Self.parts(transcript)
        guard words.count > committedWords else { return nil }
        let text = words.dropFirst(committedWords).joined(separator: " ")
        committedWords = words.count
        lastNumericEmission = ""
        return text
    }

    // Recognition rewrites a spoken numeric run into fewer tokens, e.g. "1 2" -> "12".
    // Treat that run as one cursor position so following counts and commands are not lost.
    private static func parts(_ text: String) -> [String] {
        var result: [String] = []
        var numeric = false
        for word in text.split(whereSeparator: { $0.isWhitespace }).map(String.init) {
            let nextNumeric = isNumberToken(word)
            if numeric && nextNumeric { result[result.count - 1] += " " + word }
            else { result.append(word) }
            numeric = nextNumeric
        }
        return result
    }

    private static func isNumberWord(_ value: String) -> Bool {
        value.split(whereSeparator: { $0.isWhitespace }).allSatisfy { isNumberToken(String($0)) }
    }

    private static func isNumberToken(_ value: String) -> Bool {
        let word = value.lowercased().trimmingCharacters(in: .punctuationCharacters)
        let components = word.components(separatedBy: .punctuationCharacters).filter { !$0.isEmpty }
        if components.count > 1 { return components.allSatisfy(isNumberToken) }
        if !word.isEmpty && word.allSatisfy({ $0.isNumber }) { return true }
        let numbers: Set<String> = [
            "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
            "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
            "seventeen", "eighteen", "nineteen", "twenty", "thirty",
            "אפס", "אחת", "אחד", "שתיים", "שניים", "שתים", "שנים", "שלוש", "שלושה",
            "ארבע", "ארבעה", "חמש", "חמישה", "שש", "שישה", "שבע", "שבעה", "שמונה",
            "תשע", "תשעה", "עשר", "עשרה", "עשרים", "שלושים"
        ]
        return numbers.contains(word) || word.hasPrefix("ו") && numbers.contains(String(word.dropFirst()))
    }
}
