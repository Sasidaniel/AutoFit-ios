import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

private let accent = Color(red: 0.82, green: 0.68, blue: 0.30)
private let workoutURL = URL(string: "autofit://workout")!

private struct ActivityClock: View {
    let state: WorkoutActivityState
    var elapsed = false

    var body: some View {
        Group {
            if state.phase == .ready {
                Text("00:00")
            } else if state.phase == .paused {
                let seconds = Int(state.pausedElapsedSeconds ?? 0)
                Text(seconds >= 3600
                    ? String(format: "%d:%02d:%02d", seconds / 3600, seconds % 3600 / 60, seconds % 60)
                    : String(format: "%02d:%02d", seconds / 60, seconds % 60))
            } else if !elapsed, let start = state.phaseStartedAt, let end = state.phaseEndsAt {
                Text(timerInterval: start...end, countsDown: true)
            } else {
                Text(state.workoutStartedAt, style: .timer)
            }
        }
        .monospacedDigit()
        .lineLimit(1)
        .minimumScaleFactor(0.7)
        .environment(\.layoutDirection, .leftToRight)
    }
}

private struct WorkoutSummary: View {
    let state: WorkoutActivityState
    let sessionID: String
    var island = false

    private var phaseTitle: String {
        switch state.phase {
        case .ready: return state.readyTitle
        case .workout: return state.isEnglish ? "Workout time" : "זמן אימון"
        case .rest: return state.isEnglish ? "Rest" : "מנוחה"
        case .hold: return state.isEnglish ? "Hold" : "החזקה"
        case .cardio: return state.isEnglish ? "Warmup / cooldown" : "חימום / שחרור"
        case .paused: return state.isEnglish ? "Workout paused" : "האימון בהפסקה"
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Text(state.exerciseName).font(.headline).lineLimit(1)
                    .minimumScaleFactor(0.8).layoutPriority(1).privacySensitive()
                if !island {
                    Spacer(minLength: 0)
                    Label("AutoFit", systemImage: "dumbbell.fill").font(.caption).foregroundStyle(accent)
                }
            }
            HStack(alignment: .center, spacing: 6) {
                Text(phaseTitle).font(.caption).lineLimit(1).minimumScaleFactor(0.8).foregroundStyle(.secondary)
                ActivityClock(state: state)
                    .font(.system(size: 26, weight: .bold)).frame(width: 108, alignment: .leading)
                Spacer(minLength: 0)
                if !island && state.phase != .workout && state.phase != .ready && state.phase != .paused {
                    VStack(alignment: .trailing, spacing: 1) {
                        Text(state.isEnglish ? "Workout time" : "זמן אימון").font(.caption2).foregroundStyle(.secondary)
                        ActivityClock(state: state, elapsed: true).font(.headline).frame(width: 88, alignment: .trailing)
                    }
                }
            }
            HStack(spacing: 8) {
                if let index = state.setIndex, state.phase != .ready {
                    Text("\(state.isEnglish ? "Set" : "סט") \(index + 1)").font(.caption2)
                }
                Text("\(state.completedSets) / \(state.totalSets) \(state.isEnglish ? "sets" : "סטים")")
                    .font(.caption2).monospacedDigit().lineLimit(1)
                ProgressView(value: Double(state.completedSets), total: Double(max(1, state.totalSets)))
                    .tint(accent)
            }
            if #available(iOS 17.0, *) {
                WorkoutControls(state: state, sessionID: sessionID)
            }
        }
        .padding(island ? 0 : 12)
        .foregroundStyle(.white)
        .environment(\.layoutDirection, state.isEnglish ? .leftToRight : .rightToLeft)
    }
}

@available(iOS 17.0, *)
private struct WorkoutControls: View {
    let state: WorkoutActivityState
    let sessionID: String
    var compact = false

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            if state.phase != .ready {
                HStack {
                    if [.workout, .hold].contains(state.phase), let exerciseID = state.exerciseID, let setIndex = state.setIndex {
                        Button(intent: WorkoutControlIntent(sessionID: sessionID, command: "completeSet",
                            exerciseID: exerciseID, setIndex: setIndex, controlRevision: state.controlRevision ?? 0)) {
                            if compact { Image(systemName: "checkmark") }
                            else { Label(state.isEnglish ? "Finish set" : "סיום סט", systemImage: "checkmark") }
                        }
                        .accessibilityLabel(state.isEnglish ? "Finish current set" : "סיום הסט הנוכחי")
                    }
                    Button(intent: WorkoutControlIntent(sessionID: sessionID,
                        command: state.phase == .paused ? "resume" : "pause", controlRevision: state.controlRevision ?? 0)) {
                        let symbol = state.phase == .paused ? "play.fill" : "pause.fill"
                        let title = state.phase == .paused
                            ? (state.isEnglish ? "Resume" : state.usesFeminineWording ? "המשיכי אימון" : "המשך אימון")
                            : (state.isEnglish ? "Pause" : state.usesFeminineWording ? "הפסיקי אימון" : "הפסק אימון")
                        if compact { Image(systemName: symbol).accessibilityLabel(title) }
                        else { Label(title, systemImage: symbol) }
                    }
                }
                .buttonStyle(.bordered)
                .controlSize(.small)
                .font(.caption)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
                .disabled(state.actionPending == true)
            }
            if let message = state.actionMessage {
                Text(message).font(.caption2).lineLimit(1).minimumScaleFactor(0.8)
                    .accessibilityLabel(message)
            }
        }
    }
}

@available(iOS 18.0, *)
private struct AdaptiveWorkoutSummary: View {
    @Environment(\.activityFamily) private var family
    let context: ActivityViewContext<WorkoutActivityAttributes>

    var body: some View {
        if family == .small {
            VStack(alignment: .leading, spacing: 3) {
                Text(context.state.exerciseName).font(.caption).lineLimit(1).privacySensitive()
                HStack(spacing: 4) {
                    ActivityClock(state: context.state).font(.headline)
                    if let index = context.state.setIndex, context.state.phase != .ready {
                        Text("\(context.state.isEnglish ? "Set" : "סט") \(index + 1)").font(.caption2)
                    }
                }
                HStack(spacing: 6) {
                    Text("\(context.state.completedSets)/\(context.state.totalSets)")
                        .font(.caption2).monospacedDigit()
                    ProgressView(value: Double(context.state.completedSets), total: Double(max(1, context.state.totalSets)))
                        .tint(accent)
                }
                WorkoutControls(state: context.state, sessionID: context.attributes.sessionID, compact: true)
            }
            .padding(8)
            .foregroundStyle(.white)
            .environment(\.layoutDirection, context.state.isEnglish ? .leftToRight : .rightToLeft)
        } else {
            WorkoutSummary(state: context.state, sessionID: context.attributes.sessionID)
        }
    }
}

@main
struct AutoFitWidgetBundle: WidgetBundle {
    var body: some Widget {
        configuredWidget()
    }

    private func configuredWidget() -> some Widget {
        // The non-generic builder result keeps both OS branches the same type.
        if #available(iOS 18.0, *) {
            return WidgetBundleBuilder.buildOptional(
                WidgetBundleBuilder.buildLimitedAvailability(AutoFitWatchLiveActivity())
            )
        }
        return WidgetBundleBuilder.buildOptional(
            WidgetBundleBuilder.buildLimitedAvailability(AutoFitLiveActivity())
        )
    }
}

@available(iOS 18.0, *)
private struct AutoFitWatchLiveActivity: Widget {
    var body: some WidgetConfiguration {
        AutoFitLiveActivity.configuration.supplementalActivityFamilies([.small, .medium])
    }
}

struct AutoFitLiveActivity: Widget {
    var body: some WidgetConfiguration {
        Self.configuration
    }

    fileprivate static var configuration: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            Group {
                if #available(iOS 18.0, *) {
                    AdaptiveWorkoutSummary(context: context)
                } else {
                    WorkoutSummary(state: context.state, sessionID: context.attributes.sessionID)
                }
            }
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
                    WorkoutSummary(state: context.state, sessionID: context.attributes.sessionID, island: true)
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
