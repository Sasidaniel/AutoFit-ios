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
        precondition(buffer.update("אחת", isFinal: false, at: 0) == nil)
        precondition(buffer.update("אחת שתיים", isFinal: false, at: 0.4) == nil)
        precondition(buffer.update("אחת שתיים שלוש", isFinal: false, at: 0.8) == nil)
        precondition(buffer.flush(at: 1.5) == "אחת שתיים שלוש")

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
