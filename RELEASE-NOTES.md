# AutoFit release notes

## Version 1.0 (27): Gravitron in General

Updated release approved while build 26 was still building; cancellation of
the superseded build was requested before its upload step. Native build and
internal TestFlight availability for build 27 are not yet confirmed.

- Includes all bilingual, interface, contact-form and muscle-icon changes below.
- Gravitron now belongs to General, not Back, for new installations. A one-time
  migration updates the old back category on existing installations, preserving
  exercise IDs, order, selection, sets, reps and active workout/history data.
  Subsequent user category edits remain untouched.
- Cache: `autofit-v47`. This release is internal TestFlight only.

## Version 1.0 (26): Bilingual app, personalized UI and direct contact

Release preparation approved. Signed iOS build and internal TestFlight
availability are not yet confirmed.

- Hebrew remains the default, with compact Hebrew/English flag selectors in
  onboarding and Settings. The chosen language persists and controls interface
  direction, seeded exercise display, charts, sharing, voice commands,
  announcements and Live Activity labels. Authored names, history, active
  workout values and unsaved profile edits are preserved.
- Refreshed Home, personalized Workout greeting and shared profile-photo
  controls across Home, Workout and Profile. Exercise library categories retain
  program membership and ordering; seven muscle groups now have distinct local
  illustrations instead of duplicate or unrelated emoji. Dashboard is labeled
  Statistics in both languages.
- Contact includes a validated Formspree form with required name/email,
  duplicate-submit prevention and visible submission errors that retain the
  draft. No workout, profile or Health records are attached automatically.
  The user confirmed receipt of a real test submission. Redundant email and
  version/date cards were removed, and About text was expanded.
- Settings keeps Face ID, microphone controls, native permissions and command
  help. System permissions now appear above command help; only the requested
  explanatory paragraphs were removed, not the underlying capabilities.
- Cache: `autofit-v46`. Native compilation and real-iPhone acceptance remain
  necessary; browser checks do not prove voice, background audio or Lock Screen
  behavior. No external beta review or App Store submission is requested.

## Version 1.0 (25): Music-safe microphone routing and strength classification

Implementation prepared; native build and internal TestFlight processing pending.

- Recording uses the default mixed audio mode, not voice-chat/HFP or Voice
  Processing I/O. Supported iOS 26 Bluetooth microphones can use high-quality
  recording. Otherwise the built-in iPhone microphone preserves A2DP music;
  wired/USB microphones and device-speaker playback remain supported. Default-mode
  echo cancellation is requested only where iOS 18.2+ reports it available.
  The actual microphone name appears in the listening badge and updates on route changes.
- Speech-task renewal reuses the microphone engine/tap instead of rebuilding
  the audio graph after every phrase. Request swapping is locked against the
  audio callback. Healthy background playback is not rebuilt for redundant
  configuration notifications; interruptions invalidate audio activation state.
  Temporary announcement ducking and prearmed background deadlines are retained.
- Repeated selection of the current exercise no longer serializes/backups
  unchanged workout state. Subsecond rest ticks and unchanged listening badges
  avoid repeated identical DOM writes. Real workout edits still save immediately;
  no durability-reducing persistence debounce was added.
- Apple Health receives traditional strength training, not functional strength.
  Stable sync identifiers are retained and sync metadata advances to version 2
  for workouts and energy samples. Existing Health entries are not automatically
  rewritten; manually sending an existing AutoFit workout again uses the new version.
- Cache: `autofit-v44`. Hardware/region support determines high-quality Bluetooth
  availability. Phone-microphone fallback requires keeping the phone within speaking
  range; recognition over loud music is not guaranteed. Actual audio quality,
  route transitions and iPhone scrolling require physical-device acceptance.

## Version 1.0 (24): Prearmed rest announcements and spoken progress

Available to internal TestFlight testers. Apple confirmed `VALID` and
`IN_BETA_TESTING` for build `7309f2d0-536a-46b7-b6ee-ca6e9c4230c2`;
export compliance is complete.
[Native release run](https://github.com/Sasidaniel/AutoFit-ios/actions/runs/39129963867)
passed 137 Node regressions, all three standalone Swift suites, app/extension
archive/signing, export and upload. Released source: `f6fe7ab`.
Apple app build is **24**; no external beta review or App Store submission
was made.

- Native announcement deadlines are synchronized when rest starts, changes,
  skips or restores, not only from a WebView `visibilitychange` callback during
  minimization. Returning to the foreground no longer cancels future native
  announcements. Workout finish/cancel and disabled voice settings clear plans.
- Plans use absolute deadlines rather than relative bridge delays, preserving
  the real 30-second marks and rest completion time. Updates are batched,
  deduplicated and serialized; failures are visible and retryable. Empty plans
  cancel scheduled speech without activating idle audio.
- Native background lifecycle stops microphone capture even if JavaScript is
  suspended first, and selects playback-only audio in the background. The
  background audio engine is recovered after configuration/route changes;
  audio interruptions are respected. Temporary announcement ducking and stable
  foreground/background speech identities are retained.
- Exercise-completion speech now uses the same strength-set-weighted percentage
  as the overall UI badge, rather than a separate exercise-count percentage.
  The last completed exercise explicitly includes 100 percent. Ordinary set
  completion retains its short rest cue without percentage spam. Manual/spoken
  cardio completion includes the same percentage; warmup/cooldown do not add
  strength sets to the existing progress metric.
- 137 Node regressions cover prearming without visibility events, absolute
  deadlines, extension/cancellation, voice settings, failures and percentage
  boundaries. A standalone Swift suite exercises the production native timer
  deadline type and is wired into CI alongside the existing Swift suites.
- Real DOM with explicitly simulated native APIs verified a 120-second rest
  plan already present while visible, +15-second deadline replacement, stable
  plans across a simulated visibility cycle, skip/cancel clearing, and spoken
  exercise completion matching the displayed 4 percent. No runtime errors.
- Cache: `autofit-v43`. This remains internal TestFlight only. Native compilation
  and simulated bridges cannot establish actual iPhone background playback;
  physical-device acceptance after minimizing/locking is still required.

## Version 1.0 (23): Voice, media and completion reliability

Available to internal TestFlight testers. Apple confirmed `VALID` and
`IN_BETA_TESTING` for build `f5a753e0-73ec-4b2a-afc4-c29b89b76099`;
export compliance is complete. The
[successful native release](https://github.com/Sasidaniel/AutoFit-ios/actions/runs/39128422924)
passed 127 Node regressions, both standalone Swift suites, app/extension
archive/signing, export, and upload. Released source: `b2e98d8`.
The manually dispatched Actions run is number 24, but the verified Apple
app build number is **23**. No external beta review or App Store submission
was made.

The initial Actions attempt `39128267250` stopped before native compilation:
a new asynchronous regression was inadvertently nested and Node 22 cancelled
it when its parent completed. It is now an independent test. Manual workflow
dispatch can retain unused Apple build number 23 while retrying this release;
automatic pushes retain their existing run-number-based numbering.

- Announcements temporarily **duck** other audio instead of pausing it, as
  explicitly selected. The mixed session is released after the final queued
  sentence, restoring other audio rather than leaving it permanently ducked.
  Opening AutoFit does not proactively activate audio.
- Hebrew recognition now uses voice processing, echo cancellation, automatic
  gain control, and a processed mono microphone channel. Capture pauses during
  AutoFit speech and resumes if still requested. Leaving the foreground stops
  capture and restores playback-only background audio. Bluetooth duplex input
  can still change AirPods audio quality; real-device acceptance is required.
- **"עצור" / "השהה"**, including named forms such as **"עצור חימום"** and
  **"שחרור עצור"**, use existing manual controls. Cardio pauses and resumes
  banked time. Stopping plank records the hold and starts rest. Stopping rep
  counting does not silently mark the set completed.
- Existing Live Activities are updated across readiness/workout transitions
  instead of repeatedly requesting new activities. Inactive-app requests are
  deferred, not shown as errors; stale failures cannot overwrite newer attempts,
  including retries with identical payloads. iOS still controls authorization.
- Per the user's explicit lifecycle choice, the activity **stays during
  minimization and closes on workout finish/cancel**, without returning to a
  ready activity until another workout or a fresh app launch. iOS does not
  reliably report force-quit, so immediate removal on force-quit is not promised.
- Manual and spoken workout finish use the same Health delivery path. Pending
  delivery is stored with local history before native dispatch, retried on the
  next launch, and cleared only after HealthKit confirms saving. Stable HealthKit
  sync identifiers/versions prevent retry duplicates, including energy samples
  when actual energy is supplied; no calories are fabricated.
- Apple Health receives the actual workout date and active duration. Completed
  exercise/set/weight details are included as custom workout metadata; Apple's
  Health UI does not present these as native per-set charts. AutoFit retains its
  complete local history even when permission or saving fails.
- Background handoff covers rest, holds, and running warmup/cooldown. Stable
  announcement identities prevent duplicate speech when foreground JavaScript
  catches up after native background delivery. Force-quitting stops app audio.
- 127 Node regressions and raw-byte JavaScript syntax checks pass. Browser
  native-bridge simulations do not establish actual HealthKit, audio routing,
  music/AirPods, or locked-screen behavior. Cache: `autofit-v42`.
- Real DOM checks with simulated native APIs cover repeated cardio stop/resume,
  plank stop and 90-second rest, strength completion and 120-second rest,
  spoken finish/activity closure, and persisted Health retry after reload.
  They also caught and fixed history/dashboard rerenders replacing record
  references during asynchronous Health delivery.

## Version 1.0 (22): Exercise-aware voice and ready activity

Available to internal TestFlight testers. Apple confirmed `VALID` and
`IN_BETA_TESTING` for build `25c1a334-76a6-4b0b-b0fa-a084cbeb3565`.
[Native release build](https://github.com/Sasidaniel/AutoFit-ios/actions/runs/39125682799)
succeeded; released source: `4ca7607`. No external beta review or App Store
submission was made.

### Automatic Live Activity

- Opening AutoFit now requests a Lock Screen / Dynamic Island activity in
  **ready** mode, even before starting a workout. Its timer stays at zero;
  this does not start the workout stopwatch or add anything to history.
- Starting a workout replaces readiness with the actual workout, rest, hold,
  and cardio timers. Finishing/cancelling ends that workout's activity and
  returns to readiness.
- Returning to the foreground retries activity synchronization after Face ID
  or OS lifetime expiry. Disabled Live Activities and explicit user dismissal
  are still respected and reported. This is not a Home Screen widget.

### Exercise-aware voice commands

- The primary completion phrase is now **"סט הושלם"**. Existing **"סיימתי"**
  and the older wording remain compatibility aliases.
- Saying a full exercise name, or a unique shortened name, selects the current
  exercise. Examples: **"חימום"**, then **"התחל"**; **"התחל שחרור"**;
  **"פלאנק התחל"**. **"פלנק"** is also recognized.
- The same start command uses the existing manual controls: cardio countdown,
  hold measurement, or rep counting. Repeating start does not pause a running
  cardio timer. Ambiguous short names ask for a more precise name instead of
  guessing.
- Completing a strength set targets the selected/counting exercise and starts
  rest. Without a selected exercise it no longer accidentally completes an
  untouched warmup. Explicit cardio completion still behaves like its manual
  completion button, without adding a strength rest period.
- Selection follows manual touches, is persisted, appears in microphone status
  and the Live Activity, and is not lost merely because the cards rerender.
  **"תרגיל הבא"** now actually advances past the current exercise.
- The Hebrew recognizer receives current exercise names as contextual hints.
  Listening remains foreground-only in the Workout tab.

### Opening announcement and Apple Music

- The entire opening sentence waits **one second after workout start** before
  speaking. There is no new pause inside the sentence. Ending/cancelling the
  workout or beginning a rest announcement cancels a pending greeting.
- App opening no longer proactively activates the audio session.
- Native speech, microphone recording, background announcements, and timer
  beeps use the same explicit `mixWithOthers` policy. Speech no longer delegates
  to an independently managed system audio session.
- iPhone timer beeps now use a native audio buffer instead of activating a
  WKWebView AudioContext. Browser/PWA beeps retain their existing Web Audio path.
- Speech is queued rather than repeatedly cutting off the previous utterance.
  Recognition ignores AutoFit's announcements and resets after speech ends,
  preventing its own **"סט הושלם"** announcement from completing another set.
- Idle audio is released with `notifyOthersOnDeactivation`. AutoFit does not
  attempt to start, pause, or remotely control the user's Apple Music player.
  No MusicKit access or additional permissions were added.

### Verification

- 113 Node regressions pass, including exact greeting timing, contextual
  selection, new completion wording, native beep dispatch, and ready activities.
- The standalone Swift activity-state tests cover readiness and reject a
  readiness payload containing a running phase timer.
- Real DOM checks with **simulated native bridges** measured the opening
  sentence at 1004 ms, strength completion starting the configured 120-second
  rest without completing warmup, voiced warmup/cooldown starts, and a recorded
  plank duration followed by its configured 90-second rest. Repeated cardio
  start, manual focus, ambiguous names, foreground retry, undo, history saving,
  and cancellation/readiness also passed without runtime errors.
- Native compilation and physical-device acceptance are separate gates.
  Actual Apple Music playback on both iPhone speaker and AirPods, audio routing,
  and Lock Screen presentation cannot be proven by browser/native-bridge mocks.
- Cache is `autofit-v41`; existing workout history and manual controls remain.
  Distribution remains **TestFlight only**, with no App Store submission.

## Version 1.0 (21): Live Activity and reliability

Available to internal TestFlight testers. Apple confirmed `VALID` and
`IN_BETA_TESTING`; export compliance is complete. The
[release build](https://github.com/Sasidaniel/AutoFit-ios/actions/runs/39120928797)
passed JavaScript and standalone Swift tests, compiled/signed the app and
extension, and uploaded successfully. Released source: `ada43a8`.

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
  Reloading preserved the original active rest deadline and hold start time;
  cancelling cleared running timers/activity without deleting saved history.
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
