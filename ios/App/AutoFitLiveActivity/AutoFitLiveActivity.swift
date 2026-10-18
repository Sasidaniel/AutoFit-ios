import ActivityKit
import SwiftUI
import WidgetKit

private let accent = Color(red: 0.82, green: 0.68, blue: 0.30)
private let workoutURL = URL(string: "autofit://workout")!

private struct ActivityClock: View {
    let state: WorkoutActivityState
    var elapsed = false

    var body: some View {
        Group {
            if !elapsed, let start = state.phaseStartedAt, let end = state.phaseEndsAt {
                Text(timerInterval: start...end, countsDown: true)
            } else {
                Text(state.workoutStartedAt, style: .timer)
            }
        }
        .monospacedDigit()
        .environment(\.layoutDirection, .leftToRight)
    }
}

private struct WorkoutSummary: View {
    let state: WorkoutActivityState

    private var phaseTitle: String {
        switch state.phase {
        case .workout: return "זמן אימון"
        case .rest: return "מנוחה"
        case .hold: return "החזקה"
        case .cardio: return "חימום / שחרור"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Label("AutoFit", systemImage: "dumbbell.fill").foregroundStyle(accent)
                Spacer()
                Text("\(state.completedSets) / \(state.totalSets) סטים")
                    .font(.caption).monospacedDigit()
            }
            Text(state.exerciseName).font(.headline).lineLimit(1).privacySensitive()
            HStack(alignment: .firstTextBaseline) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(phaseTitle).font(.caption).foregroundStyle(.secondary)
                    ActivityClock(state: state).font(.system(size: 30, weight: .bold))
                }
                if state.phase != .workout {
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("זמן אימון").font(.caption).foregroundStyle(.secondary)
                        ActivityClock(state: state, elapsed: true).font(.title3)
                    }
                }
            }
            ProgressView(value: Double(state.completedSets), total: Double(max(1, state.totalSets)))
                .tint(accent)
        }
        .padding(14)
        .foregroundStyle(.white)
        .environment(\.layoutDirection, .rightToLeft)
    }
}

@main
struct AutoFitLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            WorkoutSummary(state: context.state)
                .activityBackgroundTint(Color(red: 0.08, green: 0.09, blue: 0.11))
                .activitySystemActionForegroundColor(.white)
                .widgetURL(workoutURL)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label("AutoFit", systemImage: "dumbbell.fill").foregroundStyle(accent)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    ActivityClock(state: context.state, elapsed: true)
                        .font(.headline).frame(width: 90)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    WorkoutSummary(state: context.state)
                }
            } compactLeading: {
                Image(systemName: context.state.phase == .rest ? "timer" : "dumbbell.fill")
                    .foregroundStyle(accent)
            } compactTrailing: {
                ActivityClock(state: context.state).font(.caption).frame(width: 66)
            } minimal: {
                ActivityClock(state: context.state).font(.system(size: 10, weight: .semibold))
                    .minimumScaleFactor(0.6).frame(width: 40)
            }
            .widgetURL(workoutURL)
            .keylineTint(accent)
        }
    }
}
