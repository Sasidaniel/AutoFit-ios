import Foundation

@main
struct SpeechUtteranceBufferTests {
    static func main() {
        if CommandLine.arguments.contains("--count-stream") {
            var buffer = SpeechUtteranceBuffer()
            var frames: [[String: Any]] = []
            if let text = buffer.update("לחיצת חזה", isFinal: true, at: 0) {
                frames.append(["transcript": text, "count": 0])
            }
            for count in 1...12 {
                let digits = (1...count).map(String.init).joined()
                let numbers = count.isMultiple(of: 3)
                    ? digits.enumerated().map { $0.offset > 0 && $0.offset.isMultiple(of: 3) ? "," + String($0.element) : String($0.element) }.joined()
                    : (1...count).map(String.init).joined(separator: count.isMultiple(of: 2) ? "" : " ")
                guard let text = buffer.update("לחיצת חזה " + numbers, isFinal: false, at: Double(count)) else {
                    preconditionFailure("Native stream lost count \(count)")
                }
                frames.append(["transcript": text, "count": count])
            }
            let data = try! JSONSerialization.data(withJSONObject: frames, options: [.sortedKeys])
            print(String(data: data, encoding: .utf8)!)
            return
        }
        var buffer = SpeechUtteranceBuffer()
        precondition(buffer.flush(at: 10) == nil)
        precondition(buffer.update("התחל", isFinal: false, at: 1) == nil)
        precondition(buffer.update("התחל אימון", isFinal: false, at: 1.3) == nil)
        precondition(buffer.flush(at: 1.8) == nil)
        precondition(buffer.flush(at: 2) == "התחל אימון")
        precondition(buffer.flush(at: 3) == nil)
        precondition(buffer.update("התחל אימון", isFinal: true, at: 3) == nil)

        buffer = SpeechUtteranceBuffer()
        precondition(buffer.update("סיימתי", isFinal: true, at: 4) == "סיימתי")
        precondition(buffer.flush(at: 5) == nil)

        buffer = SpeechUtteranceBuffer()
        precondition(buffer.update("אחת", isFinal: false, at: 0) == "אחת")
        precondition(buffer.update("אחת שתיים", isFinal: false, at: 0.4) == "אחת שתיים")
        precondition(buffer.update("אחת שתיים שלוש", isFinal: false, at: 0.8) == "אחת שתיים שלוש")
        precondition(buffer.flush(at: 1.5) == nil)
        precondition(buffer.update("אחת שתיים שלוש", isFinal: true, at: 1.6) == nil)

        buffer = SpeechUtteranceBuffer()
        precondition(buffer.update("התחל סט", isFinal: true, at: 0) == "התחל סט")
        precondition(buffer.update("התחל סט 1", isFinal: false, at: 1) == "1")
        precondition(buffer.update("התחל סט 1 2", isFinal: false, at: 2) == "1 2")
        precondition(buffer.update("התחל סט 1 2 סיימתי", isFinal: true, at: 3) == "סיימתי")
        precondition(buffer.update("התחל סט 1 2 סיימתי התחל סט", isFinal: true, at: 4) == "התחל סט")

        buffer = SpeechUtteranceBuffer()
        precondition(buffer.update("אחת", isFinal: false, at: 0) == "אחת")
        precondition(buffer.update("אחת עשרה", isFinal: false, at: 0.1) == "אחת עשרה")
        precondition(buffer.update("אחת עשרה שתיים עשרה", isFinal: false, at: 0.2) == "אחת עשרה שתיים עשרה")

        buffer = SpeechUtteranceBuffer()
        precondition(buffer.update("9", isFinal: false, at: 0) == "9")
        precondition(buffer.update("10", isFinal: false, at: 0.1) == "10")
        precondition(buffer.update("10", isFinal: true, at: 0.2) == nil)

        for prefix in ["", "התחל סט "] {
            buffer = SpeechUtteranceBuffer()
            if !prefix.isEmpty {
                precondition(buffer.update(prefix, isFinal: true, at: 0) == "התחל סט")
            }
            for separator in [",", ".", ":", "-"] {
                buffer = SpeechUtteranceBuffer()
                precondition(buffer.update("1 2", isFinal: false, at: 0) == "1 2")
                for count in 3...12 {
                    let digits = (1...count).map(String.init).joined()
                    let text = digits.enumerated().map {
                        $0.offset > 0 && $0.offset.isMultiple(of: 3) ? separator + String($0.element) : String($0.element)
                    }.joined()
                    precondition(buffer.update(text, isFinal: false, at: Double(count)) == text,
                                 "Lost formatted numeric run: \(text)")
                }
            }
            buffer = SpeechUtteranceBuffer()
            precondition(buffer.update("אחת שתיים", isFinal: false, at: 0) == "אחת שתיים")
            precondition(buffer.update("אחת,שתיים,שלוש", isFinal: false, at: 1) == "אחת,שתיים,שלוש")
            precondition(buffer.update(prefix + "1 2", isFinal: false, at: 1) == "1 2")
            precondition(buffer.update(prefix + "123", isFinal: false, at: 2) == "123")
            precondition(buffer.update(prefix + "1 2 3 4", isFinal: false, at: 3) == "1 2 3 4")
            precondition(buffer.update(prefix + "12345", isFinal: false, at: 4) == "12345")
            precondition(buffer.update(prefix + "12345 סיימתי", isFinal: true, at: 5) == "סיימתי")
            precondition(buffer.flush(at: 6) == nil)
        }
        buffer = SpeechUtteranceBuffer()
        for count in 1...30 {
            let text = (1...count).map(String.init).joined(separator: count.isMultiple(of: 2) ? "" : " ")
            precondition(buffer.update(text, isFinal: false, at: Double(count)) == text)
            precondition(buffer.update(text, isFinal: true, at: Double(count) + 0.1) == nil)
        }

        buffer = SpeechUtteranceBuffer()
        precondition(buffer.update("התחל אימון", isFinal: false, at: 1) == nil)
        precondition(buffer.update("התחל אימון", isFinal: false, at: 1.4) == nil)
        precondition(buffer.update("התחל אימון", isFinal: false, at: 1.7) == "התחל אימון")

        buffer = SpeechUtteranceBuffer()
        precondition(buffer.update("   ", isFinal: true, at: 1) == nil)
        precondition(buffer.update("בטל", isFinal: false, at: 1) == nil)
        precondition(buffer.update("בטל אימון", isFinal: false, at: 1.5) == nil)
        precondition(buffer.flush(at: 1.9) == nil)
        precondition(buffer.flush(at: 2.2) == "בטל אימון")
        print("Speech utterance buffer tests passed")
    }
}
