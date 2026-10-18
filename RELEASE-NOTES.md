# AutoFit release notes

## Live Activity and reliability follow-up after build 19

### Lock Screen and Dynamic Island

- Added a native ActivityKit/WidgetKit extension for the active workout:
  elapsed workout time, rest countdown, current exercise, and completed/total
  strength sets. Active hold and warm-up/cool-down timers are also displayed.
- The system renders timers from absolute timestamps; they do not depend on
  JavaScript ticking while the app is suspended. Updates are serialized and
  deduplicated, not sent every second.
- Supports Lock Screen, compact, minimal, and expanded Dynamic Island
  presentations on compatible devices. Tapping opens the Workout tab, including
  a cold launch. There are no Lock Screen action buttons, as requested.
- Finishing/cancelling ends the activity. Existing activities are recovered
  instead of duplicated, and dismissing one suppresses it for that session.
- Live Activities must be allowed in iPhone Settings > AutoFit. They are an
  iOS-controlled display, not unlimited background execution or background
  microphone access. Apple's normal limits apply, including an eight-hour
  activity lifetime. No push service or App Group is required for this
  display-only implementation.
- Added separate extension signing, embedding, provisioning, and export
  configuration to the existing TestFlight pipeline.

### Voice and sharing

- Speech now commits stable partial Hebrew recognition after a short pause
  (about 0.65 seconds), rather than waiting for Apple's final result.
  Repeated native recognition failures stop listening and report the error.
- Added visible microphone/listening state and a permission/activation button
  in Workout for users whose older installation saved voice commands as off.
- Tightened command matching, negation handling, continuous number parsing,
  count-and-finish phrases, hold start/completion, and undo after re-rendering.
  Counting follows its model target across exercise reordering. App
  announcements cannot overwrite counts merely by containing a number.
- PDF export now uses ordinary, numbered A4 pages instead of one extremely
  tall page. Exercise/table headers repeat across page boundaries.
- Image export produces sharp 1520 x 2150 PNG pages, shared together. Canvas
  memory is released page by page. Large histories should preferably use PDF;
  WhatsApp may independently compress images after receiving them.
- Native sharing supplies explicit PDF/PNG content types and retains temporary
  files for delayed share-extension reads. UUID share directories older than
  24 hours are removed on a subsequent share, not immediately on completion.
- Both export buttons are disabled during a share to prevent competing sheets;
  generation/share errors remain visible.

### Additional bugs found during the first-party code review

- Finish/cancel now stop all rest/hold timers. Stopped rest timers cannot finish
  twice, and restarting the stopwatch cannot leave a duplicate interval.
- Rest deadlines and active hold start times survive a reload. Hold target
  announcements are not repeated just because a card is re-rendered.
  Obsolete interval announcements are not replayed after throttled rest ticks.
- Paused cardio banks elapsed time without shortening its saved workout
  duration. Marking cardio complete starts the overall workout timer.
- Fresh-install migration flags no longer reset seed defaults/custom edits on
  the second launch. Global rest settings are not forced back to 90 seconds.
  Older biceps names receive the intended rest override before renaming.
- Blank exercise rest inherits the global preference. Full-program weeks honor
  custom default set counts above three. Excluded warm-up/cool-down entries
  are not silently re-added; logged or paused cardio survives reordering.
- Removing a populated/running set requires confirmation and clears its
  timer/counting/undo references. Zero-second hold results display as zero.
- Sorting no longer accumulates pointer handlers on each render; cancelled
  gestures clean up correctly. Invalid tab links preserve the current screen.
- Cloud-restored history and active weights are loaded before initialization.
  Ending/cancelling clears the cloud draft too. Cloud notifications no longer
  reload an in-progress workout, and backup/quota failures are visible.
  iCloud key-value backup has Apple's 1 MB limit; local data remains the source
  of truth. This is not a new conflict-resolving multi-device sync service.
- Face ID cancellation/failure offers a working retry instead of destroying
  the document and requiring a forced app restart.
- Native speech uses a separate, system-managed audio session for per-utterance
  mixing/ducking. The app's continuously active microphone/playback session no
  longer ducks music for its entire lifetime. Background audio startup errors
  are reported, its engine is stopped at workout end, and scheduling rechecks
  engine startup after route/session changes.
- Local storage write failures are surfaced without claiming a successful
  cloud backup. Offline navigation with query parameters uses the cached app;
  cache activation leaves unrelated applications' caches alone.
- App-shell cache is now `autofit-v40`. No workout history is reset. Existing
  weight/repetition persistence and manual controls remain enabled.
- Contact submission remains intentionally unavailable, per the prior decision.

### Verification and remaining device acceptance

- 90 dependency-free Node regressions cover bridge dispatch/failure reporting,
  permissions, Hebrew commands/counting, workout lifecycle, migrations/data,
  timers, export bytes/page geometry, Live Activity snapshots/order, cardio,
  authentication retry, sorting, quota errors, and offline caching.
- macOS CI runs standalone Swift tests for speech boundaries and Live Activity
  state validation before compiling/signing both the app and widget extension.
- Real browser canvas generation was checked with a full 25-entry synthetic
  workout and a ten-workout history: standard A4 output; the larger PDF was
  about 7.4 MB / 39 pages. PNG pages remained 1520 x 2150.
- A real DOM walkthrough with **simulated native plugins** exercised onboarding,
  spoken start/count/finish/undo, manual weights/kg-lb conversion, rest extension,
  history retention, Health dispatch, native export payloads, and all tabs.
  This verifies JS/UI integration, not the iPhone frameworks themselves.
- Actual iPhone acceptance is still required for Live Activity presentation and
  tapping while locked, Bluetooth/Hebrew recognition, music ducking/background
  speech, Health persistence, and WhatsApp's share extension. A successful build
  or browser simulation is not evidence that those device flows all passed.

Update from TestFlight **without uninstalling**. Distribution remains
**TestFlight only**; no App Store review/publication or external beta submission.

## Native integration repair after TestFlight build 18

- Fixed the active iOS scene creating a plain `CAPBridgeViewController` instead
  of `MainViewController`. The plain controller bypassed registration of all
  custom plugins, including HealthKit, Face ID, speech recognition, notifications,
  screen wake lock, background announcements, and iCloud.
- Added native PDF/PNG file sharing with `UIActivityViewController`, temporary
  file cleanup, and visible errors. Browser sharing remains a separate fallback
  for web use only.
- Microphone startup now rejects unavailable permissions, recognizer, audio
  input, or engine errors instead of returning success. Stale recognition
  callbacks cannot restart stopped sessions, and the listening badge reflects
  startup failures.
- Health permission status now checks actual workout write authorization.
  Sample-write failures and missing saved workouts no longer report success.
- Contact submission is intentionally unavailable, as requested by the user.
  A diagnostic POST with the app's `capacitor://localhost` origin returned
  HTTP 200 with `success: "false"` and a message that FormSubmit requires a web
  server. The previous code treated this rejection as success. Removed that
  submission path and replaced the form with an explicit unavailable notice;
  direct email and WhatsApp links remain. A server-backed delivery service is
  deferred, not implemented.
- Added dependency-free regression tests and a CI test gate before archiving.
- App-shell cache updated to `autofit-v38`. No workout data or storage keys are
  reset or migrated by this repair.

Distribution is **TestFlight only**. Uploading through App Store Connect does
not submit an App Store version for review or publish the app.

Automated tests cover JavaScript behavior, PDF output, and source-wiring
regressions. They do not prove real-device Face ID, HealthKit persistence,
speech recognition, Bluetooth routing, or the iOS share sheet. Those still
require iPhone acceptance testing after updating, without uninstalling.

Returning users who already completed onboarding can request Health and
microphone permissions from Settings. Previously denied iOS permissions may
need to be enabled in iPhone Settings. Existing user choices are not forced on.
