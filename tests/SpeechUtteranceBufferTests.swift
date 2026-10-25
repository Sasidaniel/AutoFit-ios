import Foundation

@main
struct SpeechUtteranceBufferTests {
    static func main() {
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
