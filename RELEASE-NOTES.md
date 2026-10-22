# AutoFit release notes

## Version 1.0 (31): Personal training tools (release approved, native build pending)

This phase is based on the completed build-30 release, including `9e035c7`.
It was developed locally and reviewed in the browser before the user explicitly
approved an internal TestFlight release on 2026-10-21, including publishing all
source and documentation changes to GitHub. Native build and Apple distribution
confirmation are still pending; approval is not evidence of a successful upload.
Private release credentials and `PROJECT-NOTES.md` remain excluded from Git.
The native audio policy from build 30 is unchanged. The approved widget request
adds Live Activity controls and bridge/state changes, not native audio changes.
The release workflow now verifies Apple's actual `VALID / IN_BETA_TESTING`
status after upload using the existing CI-only App Store Connect credentials.
It does not submit an external beta or an App Store release.

The first build attempt
([39619157490](https://github.com/Sasidaniel/AutoFit-ios/actions/runs/39619157490))
passed all 394 JavaScript regressions and four Swift suites, but the widget
archive failed because `WidgetConfigurationBuilder` is not an SDK API and the
availability branches returned different configuration types. Export/upload
were skipped, so Apple build 31 was not consumed. The retry uses the supported
`WidgetBundleBuilder` to register exactly one OS-appropriate widget: the
iOS 18+ Watch-capable configuration or the existing iOS 17 configuration.
The first retry exposed a further compiler type-inference failure in conditional
bundle registration. Both branches now explicitly use the SDK's public,
non-generic `WidgetBundleBuilder.buildOptional` result and
`buildLimitedAvailability` rather than an unsupported conditional builder path.

### Review flows

- **Workout / Exercises > Photo > Instructions and videos:** all 57 built-in
  and planning definitions have media through 43 authored guides and 44 curated
  video links. Existing personal and detailed saved images remain intact.
  Exercises without photos use original shaded grayscale SVG figures with red
  approximate muscle emphasis; the three old stock stick diagrams remain
  available under Saved images instead of taking priority. Rep exercises show
  start/end positions, holds one position, and cardio cards expose the same
  controls. No PDF artwork, third-party thumbnails or videos are copied.
  Guides identify the demonstrated variation and publisher, distinguish machine/
  dumbbell/band work and stationary holds, include both wrist directions, and
  explain how the moving bridge video relates to a static bridge hold.
  Public YouTube, Muscle & Strength and Physitrack video pages were checked on
  2026-10-21. They open externally on an explicit tap, generally in English,
  and require internet; third-party availability cannot be guaranteed.
  Illustrations and written instructions work offline with no remote media
  preloads. Unknown custom exercises retain their own photos/notes and an honest
  no-authored-guide message rather than invented technique or video matches.
  Viewing media does not save, activate or change an exercise/session.
- **Workout > estimated workout time:** a permanently present approximate average
  appears above the exercises before and during a workout. Once work starts,
  a separate remaining-time estimate excludes completed work and consumed setup,
  includes only the unexpired current rest plus rests after future sets, and
  subtracts accumulated/running cardio or hold time without going negative.
  It is not the elapsed stopwatch or a promised finish time.
- **One duration model:** actual selected set counts (including program-week
  limits), per-exercise/default rest, numeric/ranged reps, holds, cardio and
  authored per-side work feed the same estimator in Workout, budget review,
  personal-plan review and Exercises. Exercises shows the permanent My Workout
  estimate separately from an already-entered session. Both strength and cardio
  edit dialogs preview the proposed duration without saving; plan set/rep/cardio
  edits also update the estimate immediately. Display one rounded average of
  the lower and upper estimates, using hours and minutes above an hour, in
  Hebrew and English. This is not a measured average of previous workouts.
  The revised assumptions are 2–3 seconds per rep (15–25 seconds minimum work
  per rep set), 15–30 seconds setup/transition per strength/hold exercise,
  10–30 seconds cardio setup, and **full configured rest after every strength/
  hold set, including the final one**, matching `startRestTimer`.
  Unknown rep targets assume 8–15 reps and remain approximate. Equipment queues
  and extra breaks are not guaranteed by this estimate. Duration refreshes use
  in-memory arithmetic, not storage reads or serialization of timing snapshots.
  No stored history is fabricated or calibrated from the reported two-hour
  anecdote. The untouched 25-exercise/67-set default now displays about
  **2 hours and 34 minutes**, reduced from about 3 hours and 6 minutes by changing
  only work/setup assumptions, not sets or rests. The first 20 default entries
  estimate about **2 hours and 4 minutes**; they are not asserted to be the same
  exercises as the user's reported 1-hour-53-minute workout.
- **Workout > black Pause workout / Resume workout:** pause freezes elapsed
  active time, the outstanding rest, cardio and holds, and suspends voice
  counting/listening and background announcements. Resume restores that progress
  without counting time spent paused or replaying rest thresholds. Paused drafts
  survive reload, and finishing while paused records only active workout time.
  Entered loads, notes, completed sets and original start date remain intact.
  Resetting or manually completing a frozen timer clears its pending resume.
  The advice entry points now read **Personal goals and recommendations**.
- **Workout > 30 / 60 / 90 minutes / Full program:** all four quick buttons are
  visible and the applied choice is highlighted. Every reviewed proposal starts
  from the complete original session, even when switching from a shorter choice.
  Keep at least one primary exercise per represented main muscle group; never
  count secondary involvement as replacement primary coverage or invent absent
  groups. Redundant assistance work, holds, forearms and hammer curls have lower
  priority, but sole required coverage and entered/active work remain protected.
  Custom entries without trusted mapping are retained conservatively.
  Cardio-only plans retain the walking/running sequence, not just the shortest
  running segment. Sets/rests are not shortened to force a fit.
  If protected work and required coverage exceed the central budget estimate,
  show the minimum estimate and an explicit warning; upper-bound overruns are
  disclosed even if the central estimate fits. For the untouched default,
  preserving seven main groups takes about **47 minutes** (internal bounds about
  44–50 minutes): 30 is infeasible, while 60 can add work but remains approximate.
  Selections need not differ if the original workout's constraints prevent it.
  Full program restores original composition/order
  plus newly entered values; pressing it without a budget is a no-op.
- **End-of-workout and reopened History summary > Apple Health delivery:**
  persistent `healthDelivery` metadata supplements the existing
  `healthSyncPending`/`healthSyncedAt` fields. Only native `{saved:true}` produces
  a confirmed Health save. Pending/in-flight, unavailable, unconfirmed write
  permission, failure with the reported reason, and legacy unknown status are
  distinct. Failed/pending native delivery can explicitly retry using the same
  stable workout ID and existing native HealthKit deduplication metadata.
  Concurrent/duplicate retry requests and already-confirmed saves are skipped.
  Batch records retain their individual outcome. Open summaries update text
  in place after async completion; closed summaries are not reopened or focused.
  Reopened history uses the persisted outcome, and history edits retain newer
  Health delivery metadata. A local confirmation-storage failure is reported
  separately rather than relabelling an actual confirmed Health write as failed.
  Browser Shortcuts launch is only an unverified handoff, never success; its
  persisted state warns users to check Health before resending, and blocks
  accidental repeat handoffs. Existing Health/iCloud/native audio code paths
  remain in use; HealthKit plugins and entitlements are unchanged.
- **Home or Exercises > Personal plan builder / Saved plans:** both tabs expose
  the same builder and saved alternatives. The builder asks for goal, experience,
  a single workout or 2–4 sessions, available time (including 90 minutes),
  location and actual equipment.
  Strength, muscle-building, general fitness and walking/jogging proposals have
  different doses, rest and exercise selections. Four-day strength-based plans
  alternate upper/lower sessions. Missing movement patterns are disclosed rather
  than replaced with unverified equivalents. Exercise choices, sets, reps and
  cardio minutes are editable; full-rest estimates update with edits.
- **Builder > Muscle groups:** optionally select one or several primary groups.
  Each selected group retains an authored, suitable primary exercise; secondary
  involvement does not substitute for it. No selection preserves the general-plan
  behavior; walking/running disables muscle targeting. Missing suitable coverage
  produces an explicit error, never a partial proposal. Optional additional work
  is bounded by the duration's upper estimate. Required coverage is not removed
  or given shorter rests to force a fit: an over-budget proposal explains why.
  Editing alternatives preserves each row's primary group, and saving/activation
  validates coverage again. Saved cards display selected groups and time.
  A same-name unmapped legacy exercise cannot hide a separately authored variant;
  existing names and catalog identities are never silently migrated.
- Save up to eight alternate plans without activation. Review and confirm a
  specific session before changing **My workout**. Each session is activated
  explicitly; this is not an automatic calendar. Existing active/entered
  workouts remain intact and the new selection takes effect next workout.
  **Saved plans > Restore pre-plan selection** restores the previous order,
  selection and targets while retaining current personal names, notes and photos.
  Reviewed plan set counts do not inherit the old program-week ramp.
- **iPhone Live Activity controls (native source; device acceptance pending):**
  iOS 17+ Lock Screen and expanded Dynamic Island layouts offer Finish current
  set and Pause/Resume through `LiveActivityIntent`, not links pretending to
  complete work. A paused activity remains visible with frozen active time.
  iOS 18+ supplies a supplemental small layout for the mirrored Apple Watch
  Smart Stack; this is not a standalone Watch app. No finish/cancel-workout
  button bypasses the app's confirmation flow.
  Requests carry session, exact exercise/set, timestamp and revision. Expired,
  changed or already-processed requests cannot complete the next set. The shared
  manual-set controller preserves entered reps, loads and notes, starts the
  existing rest once, and restores the set/running hold if persistence fails.
  The native queue acknowledges only after JS processing and queued activity
  synchronization; repeated acknowledgements are idempotent. An unprocessed
  request displays an explicit instruction to open AutoFit after a bounded wait,
  not a false saved confirmation. A suspended or cold WebView may require this
  recovery; this must be tested on an actual device.
- **Explained recommendations:** every recommendation shows dated set evidence.
  The existing comparison guards are reused: defined variation, matching
  measurement, load direction and set counts. Two matched workouts at the
  explicitly recorded upper rep target with Easy/Right ratings can justify
  considering a small increase; absent ratings, hard ratings, changed variants,
  mixed measurements, legacy/custom ambiguity and extra volume alone do not.
  Assisted loads, holds and cardio are distinguished. No universal increment
  is invented. Accept/dismiss saves the decision; an optional user-chosen load
  requires acceptance, applies to future workouts only, and can be cleared.
  Saving an explicit target never retroactively fills historical targets.
- **Workout > time-budget review:** change the available time, review the proposed
  priorities and checkboxes, then confirm for this workout only. Known compound
  movements precede accessories. Estimates include setup, per-side work where
  authored, and full configured rests; they are not promised finish times.
  Current, recorded, typed and paused/in-progress work is protected, even when
  this exceeds the budget. Deferred entries and original order survive reload.
  Restore the full workout at any time without discarding newly recorded work.
- **Exercise card > Equipment busy:** select and review an authored alternative
  with matching movement/primary area and different equipment. A shared muscle
  alone is insufficient. Unknown/mixed variants can honestly have no alternative.
  Swaps apply only to the current workout, never transfer weight, retain
  completed source sets separately, and archive unfinished source values.
  Restore merges source edits and keeps any entered replacement data as a
  separate exercise. Restore a time selection before swapping, and restore
  swaps before making a new time selection. Stop an active hold/voice count
  before structural edits; neither is silently stopped by these tools.
- The workout focus panel shows the current exercise, set and the same target
  used by the existing counting controller, plus real rest/listening state.
  Browser mode explicitly says manual logging, not native listening. Native
  failure has an explicit microphone retry action; pending activation is not
  displayed as established listening.
- **This week's muscle work** counts actual completed sets from recorded catalog
  identities since local Monday. Primary/secondary involvement is distinct;
  unmapped legacy/custom sets are disclosed. This is not recovery, growth or
  a reason to diagnose training readiness. **Personal monthly goal** optionally
  tracks completed workouts for the current local calendar month, without points,
  rankings, catch-up requirements or daily guilt.
- Per-set weights/ratings remain supported. Optional collapsed set notes now
  survive completion, history editing, summary and text/image/PDF sharing.
  Custom text is escaped for HTML but is not translated or rewritten.

### Persistence and offline behavior

`training-tools.js` contains the bounded rule engine; `training-ui.js` connects
it to the existing controller and dialog/localization conventions. The original
26 inactive library additions remain unchanged. Six explicitly named machine
variants reuse existing authored guides and stable `planning:` IDs; they are
offered as choices, not auto-selected or automatically migrated into a program.
No exercises are invented. New routines retain catalog identity and actual
measurement types, with honest equipment/experience limitations.

Settings store optional `training` plans, activation/selection backup, decisions
and monthly goal. Exercises can store explicitly accepted `targetReps` and
`targetWeightKg`. Sessions store lightweight exercise snapshots, explicit rep
targets, optional plan identity, pinned selection and reversible time/swap
archives; completed entries retain catalog/target metadata and set notes.
No target or catalog identity is backfilled into old history to fabricate
comparability. Saved plans store references/parameters, not repeated user photos.
Program activation/restoration writes exercises, settings and the session as a
rollback-protected local transaction and reports storage failures before
changing in-memory state. These remain the existing iCloud keys; cloud backup
failure reporting is preserved. Browser storage is separate from the native app.
The offline shell includes both new modules and the exercise-media update
(`autofit-v58`; an internal cache revision, not an app release).

### Validation and remaining work

Local Node regressions cover the existing native/controller behavior plus the
new pure rules and real-controller actions, including write-failure rollback,
plan restoration, conservative evidence, no transferred replacement loads,
target persistence, catalog boundaries, dose estimates and note sharing.
All 394 regressions pass locally (the original 290 plus 104 added tests);
all 12 JavaScript modules pass byte-preserving ES-module syntax checks, and
`git diff --check` passes. No iOS compile or new Swift execution was performed.
Isolated browser acceptance exercises real app controls, including:
time selection across reload and restore; new-load acceptance without altering
the active session; swap/restore retaining typed notes and weights; save and
confirm plan activation/restore; finish and reopen a noted workout; weekly and
monthly counts; English/Hebrew reversal; 320/388-pixel layouts without horizontal
overflow; and storage-quota failure followed by successful retry. Synthetic
history is restricted to a separate test origin, not the clean review preview.
Media coverage includes every authored definition, actual photo/guide/cardio
controllers, preserved personal images/notes, escaped image attributes, honest
custom-exercise fallbacks, bridge holds, safe external links and HE/EN labels.
Isolated browser acceptance opened media for all 51 stored exercises, verified
both controls on all 25 default workout cards, and checked 320-pixel HE/EN
dialogs without overflow or video/thumbnail preloads. All five review-preview
storage keys remained byte-identical through the cache update and media review.

Not included: explicit warm-up versus working-set classification, supersets,
automatically progressing interval-running schedules, or permanent equipment-swap
editing. Existing per-set loads, ratings and optional notes remain available.
Walking/jogging plans give a gentle starting dose and conservative repeat/add-time
guidance, not medical advice or a claim of individualized physiological prediction.

Native compilation, real microphone recognition/recovery, music quality and
pause/duck/resume, physical-device accessibility, HealthKit and iCloud round trips
and the new AppIntent/Watch controls still require a Mac build and iPhone/Watch
acceptance pass. Foundation state tests were extended but cannot run here because
Swift is unavailable. Windows/browser checks do not establish
those results, and browser mode contains no native microphone simulator.

For local review, serve **this worktree's `www` only**, bound to `127.0.0.1` on
a checked free port (for example `python -m http.server 8941 --bind 127.0.0.1
--directory www`). `/?previewSkip=1` uses the existing browser-only onboarding
shortcut with a clearly test-named profile; it creates no synthetic workout
history. Do not reset, seed or migrate another preview origin's user data.

## Version 1.0 (30): Voice and music lifecycle recovery

An internal TestFlight release was approved on 2026-10-21 and is verified
available for internal testing. Source: `082af03ae08f0d36334e23d0a4ea81208ffe68e6`.
Actions run [39572840557](https://github.com/Sasidaniel/AutoFit-ios/actions/runs/39572840557)
(workflow run #31, explicit Apple build **30**) passed the Node 22 regressions,
all four Swift suites including the added recovery tests, and signed iOS
archive/export/upload. Local validation: all 290 Node regressions, test syntax
and whitespace checks pass.
Apple build: `868bcebf-84bb-40d9-9963-d12d0f4a5a1b`, processing `VALID`,
internal `IN_BETA_TESTING`, exempt encryption `false`, external
`READY_FOR_BETA_SUBMISSION` (not submitted). No App Store or external release.
Actual iPhone music/recognition acceptance remains unverified.

- Keeps voice enabled on the visible Workout tab, including before starting a
  workout. Listening/keepalive continue to mix with other apps; only announcements
  request temporary ducking. No HFP or voice-chat routing is introduced, and the
  existing high-quality Bluetooth / iPhone microphone selection is retained.
- Returning to the foreground clears stale interruption gates. New audio requests
  attempt real session activation and report an activation failure instead of
  permanently rejecting every subsequent announcement from a cached flag.
- An external interruption explicitly cancels and clears the affected speech
  queue, releases announcement ownership and reports the interruption. Late
  callbacks cannot end a newer announcement or restart the microphone over it.
  Interrupted, time-sensitive announcements are not automatically replayed;
  their IDs remain retryable, while completed announcements stay deduplicated.
- Recognition restarts are coalesced and invalidate old callbacks immediately.
  Transient recovery failures retry with bounded backoff before surfacing a
  terminal error; stopping, backgrounding or app speech cancels pending retries.
  Healthy capture ignores its own category-change notification; replacing a
  recognition task preserves running capture without forcing reactivation.
- Device acceptance remains required: repeated Apple Music round-trips before
  and during a workout, interruption during speech followed by later working
  announcements, music quality/pause/resume, and Hebrew/English exercise-name,
  counting, target completion, undo, rest and summaries. Unsupported Bluetooth
  microphones still use the iPhone microphone, which must be within speaking
  range. Source-level regressions do not establish real-device recognition or
  identify the exact physical cause of the reported initial music stop.

## Version 1.0 (29): Library, insights and hands-free training

The user explicitly approved an internal TestFlight build on 2026-10-20.
Apple build number 29 was verified unused before dispatch. This is internal
testing only, not an App Store release or external beta submission.
Release status: verified available for internal TestFlight testing.
Source commit: `aa6e7824c3822099dc868d60b4bfadf3d2dc2c05`.
GitHub Actions run [39411284094](https://github.com/Sasidaniel/AutoFit-ios/actions/runs/39411284094)
(workflow run #30, explicit Apple build number **29**) completed successfully,
including the Node 22 regressions, all four Swift suites, signed archive/export
and upload.
Apple build ID: `4a063af1-5c6d-4b70-af79-f47803e542bb`.
Verified `processingState=VALID`, `internalBuildState=IN_BETA_TESTING` and
`usesNonExemptEncryption=false`; external state is `READY_FOR_BETA_SUBMISSION`
(not submitted). Existing internal group "Me" retains access to all builds;
no new tester groups, public links or external review were created.
Local validation: all 286 regression tests pass; ES module syntax and whitespace
checks pass. Isolated browser acceptance covered the real controller/DOM,
stable goals across reloads, automatic completion/rest, undo, manual goal changes,
summary persistence and reopening, and bilingual Help. Real iPhone recognition,
music/headset behavior and the new voice flows still need device acceptance.

### Name-to-count and automatic set completion

- Saying a repetition exercise's full name or a unique abbreviation now selects
  and persistently highlights it and arms its next unfinished set for counting.
  Repeating the name does not reset an ongoing count; switching names keeps the
  previous set's recorded reps without completing it.
- A positive whole-number rep target comes from that set's configured value,
  or the exercise default if the set is blank. The goal is kept separately from
  live reps in the active session, including across counting restarts/reloads.
  Reaching or passing it completes just that set and starts the existing rest
  flow. Skipped recognition of the exact target does not prevent completion.
  Actual recognized reps are saved, not capped to the goal.
- Manual rep edits update the goal. Blank/non-numeric/range targets without a
  single numeric default do not invent a stopping point; "Done" remains available
  before a goal or when there is no goal. "Undo" reopens a mistaken completion.
- Delayed workout greeting is cancelled when rep counting starts so it cannot
  interrupt the first spoken numbers. The status badge names the exercise,
  set and target. No new speech or microphone/audio-session behavior is added.
- A duplicate "Done" after target completion cannot accidentally check the next
  set. After rest, say the name or "Start set" for the next set; there is no
  automatic start of the next set. Explicit "Select chest press" only selects.
  Holds/cardio still require "Start" so mentioning their names does not run timers.
- Bilingual Help and offline cache updated (`autofit-v51`). Real iPhone
  recognition/music/headset behavior still requires device acceptance.

### Natural voice reports

Uses the existing Hebrew/English speech recognizer and bounded local parsing,
not a paid AI service or unrestricted conversational understanding.

- “I did 12 reps with 40 kilograms” records the selected repetition set's
  weight, reps and completion as one undoable action. Supports decimal kg/lb
  and common spoken numbers; ambiguous targets request selection. Holds and
  cardio are not guessed. Immediate duplicate reports do not complete extra sets.
- Easy / Just right / Hard rates the most recently completed set, including
  manual completions. Its context is saved with the active workout.
- “Add half a minute of rest” extends an existing rest period only. Undo restores
  its prior deadline without overwriting subsequent timer changes.
- Report acknowledgements identify the exercise and set; ordinary rest-start
  speech is suppressed for a compound report to avoid overlapping messages.
  Spoken replies respect the existing announcement setting.
- Undo restores the entire last report, or its rating/rest extension, only when
  the current session and affected data still match. Unrelated later work is kept.
- Voice finishing now requires the separate phrase “Confirm finish” within
  15 seconds. Another command, leaving Workout, backgrounding or microphone
  failure invalidates the request. Existing explicit cancel-workout behavior
  and manual controls are unchanged.
- Help and offline cache updated (initially `autofit-v50`; this release uses
  `autofit-v51`). Real iPhone microphone,
  music/headset interaction and recognition accuracy still require device
  acceptance; browser/JavaScript checks do not establish those properties.
- Local regression coverage includes parsing, target ambiguity, grouped undo,
  stale edits, rest deadlines and finish confirmation. An isolated browser
  fixture exercised the real controller/DOM, saving and reopening a summary,
  persisted rating context after reload and both Help languages at narrow width.
  The fixture did not enable or emulate a native microphone.

### Exercise library and workout insights (phase 1)

The existing program, exercise IDs, ordering, custom text, history and native
voice/timer controls remain in place. No paid AI or external AI service is used.

- Adds 26 curated library options for strength, static holds, walking, home
  marching and easy jogging. They are added once, **inactive**, without selecting
  them for the current program or restoring previously deleted seed exercises.
  Deleting, renaming or editing these options remains respected on later launches.
- Search works across Hebrew/English names, muscle groups and equipment.
  Filters cover activity, illustrated equipment, location and experience level.
  Guides include original offline schematic illustrations, instructions,
  breathing/form cues and primary/supporting muscles. Broad existing exercises
  explicitly identify the particular variation shown.
- Three selected YouTube tutorials (push-up, squat and plank) link to
  Calisthenicmovement, BowFlex and ScottHermanFitness respectively. Video titles
  and publishers were checked against YouTube's public oEmbed endpoint;
  videos are not copied or required for the offline workout. Other guides
  explicitly state when no selected video is available.
- Optional Easy / Just right / Hard feedback attaches to completed sets, can be
  cleared, survives history editing and is not prefilled into the next workout.
  Manually marking an unmeasured hold complete saves its displayed target as
  self-reported time; timed holds keep their elapsed time.
- A persistent, closeable workout summary replaces the five-second celebration
  and can be reopened from History. It separates holds/cardio from repetitions,
  summarizes feedback, and compares matching recorded exercise definitions,
  set counts and measurements. Legacy records without measurement metadata
  and broad multi-variant entries are not guessed. Higher assistance weight is
  not reported as strength progress;
  workload alone is never described as improvement.
- Native automatic Health syncing and the web Shortcuts action are retained.
  Full program building, free-form voice reports, adaptive recommendations,
  supersets, goals and AI remain outside phase 1. Initial phase-1 cache was
  `autofit-v49`; the release including the voice upgrades uses `autofit-v51`.

## Version 1.0 (28): Workout-list layout and Settings button

Available to internal TestFlight testers. Apple confirmed `VALID` and
`IN_BETA_TESTING` for build `5422f2fd-7f9d-41b8-ac06-cac39ff37102`;
export compliance is complete.
[Native release run](https://github.com/Sasidaniel/AutoFit-ios/actions/runs/39249226323)
passed regression tests, all four standalone Swift suites, app/extension
archive/signing, export and upload. Released source: `d5812e6`.
No external beta review or App Store submission was made.

- Fixed My Workout position inputs expanding to full width and collapsing
  exercise names into single-character columns. Position fields stay 48px wide,
  while exercise text uses the remaining space and existing ordering is retained.
- Settings now uses a 32px vector icon within a 48px touch target, anchored to
  the bottom of the header content rather than its safe-area-inclusive midpoint.
- Hebrew/English layouts were checked at 320px, 375px and 430px widths with
  simulated top safe-area insets of 0px, 20px and 44px. Actual iPhone display
  remains subject to device acceptance. Cache: `autofit-v48`.

## Version 1.0 (27): Gravitron in General

Available to internal TestFlight testers. Apple confirmed `VALID` and
`IN_BETA_TESTING` for build `bb9707aa-e9c6-4893-ab29-0f65dc425698`;
export compliance is complete.
[Native release run](https://github.com/Sasidaniel/AutoFit-ios/actions/runs/39239615033)
passed regression tests, all four standalone Swift suites, app/extension
archive/signing, export and upload. Released source: `6939c48`.
Build 26 was cancelled before upload to include the requested category correction.
No external beta review or App Store submission was made.

- Includes all bilingual, interface, contact-form and muscle-icon changes below.
- Gravitron now belongs to General, not Back, for new installations. A one-time
  migration updates the old back category on existing installations, preserving
  exercise IDs, order, selection, sets, reps and active workout/history data.
  Subsequent user category edits remain untouched.
- Cache: `autofit-v47`. This release is internal TestFlight only.

## Version 1.0 (26): Bilingual app, personalized UI and direct contact

Superseded by build 27. Build 26 was cancelled during archive, before export
or upload; the changes below shipped in build 27.

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
- Cache in this candidate: `autofit-v46`, advanced to `autofit-v47` in build 27.
  Native compilation passed in build 27; real-iPhone acceptance remains
  necessary for voice, background audio and Lock Screen behavior.

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
