import UIKit

@main
struct WidgetLayoutTestApp: App {
    var body: some Scene {
        WindowGroup {
            Color.black.onAppear { DispatchQueue.main.async { Self.checkLayouts() } }
        }
    }

    @MainActor private static func report(_ message: String) {
        let url = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("layout-result.txt")
        try! message.write(to: url, atomically: true, encoding: .utf8)
        print(message)
        fflush(stdout)
    }

    @MainActor private static func checkLayouts() {
        report("LAYOUT_CHECKS_STARTED")
        let now = Date().timeIntervalSince1970 * 1000
        var checks = 0
        var maximumLockHeight = 0.0
        var maximumIslandHeight = 0.0
        for language in ["he", "he-female", "en"] {
            for phase in ["ready", "workout", "rest", "hold", "cardio", "paused"] {
                for width in [320.0, 393.0] {
                    for largeText in [false, true] {
                        let timed = ["rest", "hold", "cardio"].contains(phase)
                        var state = try! WorkoutActivityState(
                            startMillis: now - 3600000, exerciseName: language != "en"
                                ? "לחיצת חזה בשיפוע עם משקולות יד" : "Incline dumbbell chest press",
                            completedSets: 12, totalSets: 24, phase: phase,
                            phaseStartMillis: timed ? now : nil, phaseEndMillis: timed ? now + 90000 : nil,
                            language: language == "en" ? "en" : "he", feminineWording: language == "he-female",
                            exerciseID: "chest", setIndex: 2,
                            pausedElapsedSeconds: phase == "paused" ? 3600 : nil)
                        state.actionMessage = language != "en" ? "הפעולה אינה עדכנית. פתח את AutoFit."
                            : "This control is out of date. Open AutoFit."
                        for island in [false, true] {
                            let view = WorkoutSummary(state: state, sessionID: "layout-test", island: island)
                                .environment(\.dynamicTypeSize, largeText ? .xLarge : .large)
                            let renderer = ImageRenderer(content: view)
                            renderer.proposedSize = ProposedViewSize(width: width, height: nil)
                            guard let image = renderer.uiImage else {
                                report("LAYOUT_FAILED production SwiftUI image could not be rendered")
                                exit(1)
                            }
                            let size = image.size
                            let maximum = island ? 138.0 : 160.0
                            guard size.height <= maximum, size.width <= width + 0.5 else {
                                report("LAYOUT_FAILED \(language) \(phase) width=\(width) large=\(largeText) island=\(island) size=\(size)")
                                exit(1)
                            }
                            if island { maximumIslandHeight = max(maximumIslandHeight, size.height) }
                            else { maximumLockHeight = max(maximumLockHeight, size.height) }
                            checks += 1
                        }
                    }
                }
            }
        }
        report("LAYOUT_CHECKS_PASSED \(checks) real SwiftUI layouts; maximum Lock Screen height \(maximumLockHeight), island body height \(maximumIslandHeight)")
        exit(0)
    }
}
