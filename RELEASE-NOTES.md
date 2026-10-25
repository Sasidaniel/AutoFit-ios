# AutoFit release notes

## 1.0 (34) - Approved internal TestFlight release (verification pending)

The owner explicitly approved publishing the code and Markdown documentation,
using the personal GitHub authentication for this release, and releasing build
34 to internal TestFlight. App shell: `autofit-v66`. These changes are not in the
already-delivered build 33. Native CI and Apple availability are pending;
upload alone will not be reported as verified availability. No external beta or
public App Store submission is authorized.

- Every workout exercise, including holds, warmup and cardio/rope intervals, has
  a 44px-minimum Remove exercise action in its header. Confirmation explicitly
  limits the change to this workout; the exercise library, permanent program,
  saved plans and existing history are not changed.
- Exercise totals, completed exercise counts, set totals, progress bars,
  percentages, current focus and duration estimates refresh immediately from
  the remaining visible exercises. Exercise counts include visible cardio.
  Overall progress retains the existing strength-set basis, with an activity
  fallback for cardio-only workouts. No remaining exercises means zero targets,
  0% progress and a disabled Start/Resume action rather than a broken denominator.
- Removal archives the exact session entry instead of deleting logged work.
  A recovery card at the top supports explicit undo throughout the current
  workout, including after reload. Set inputs, per-set weights, notes, difficulty,
  targets, exercise snapshots, paused hold measurements and interval recipes are
  retained. Multiple undos restore the original ordering without duplicates.
- A running workout pauses before removal or undo, banking timer/counting state;
  resuming remains explicit. Control revisions invalidate stale native-widget
  actions. Time-budget restoration does not resurrect removed exercises, and
  equipment swaps cannot reuse archived entries or restore either removed
  participant until removal is undone.
- Finishing saves completed removed sets/cardio once, with a history explanation.
  Uncompleted inputs are retained for undo, not recorded as performed exercise.
  A workout with completed work only in its removal archive can still be saved.
  Storage failure leaves previous data intact and displays an actionable error.

Acceptance used a separate synthetic browser origin with three saved programs,
including the supplied custom exercise name "משיכה צרה בפולי עליון במשולש".
Cancel, storage failure/retry, live 20%-to-33%-to-20% changes, reload/undo,
all-exercise removal, archived-only completion and unchanged programs/library
were exercised. Hebrew RTL and English LTR fit 316px without horizontal overflow;
remove/undo targets measured at least 44px high. No actual iPhone data was read.
All **482 JavaScript regressions** and **17 module syntax checks** passed locally.
The protected review preview was updated to v66 only after its unchanged-storage
guard passed; all five protected storage values remained byte-for-byte unchanged.
Synthetic test data, caches and service workers were removed afterward.

## 1.0 (33) - Verified internal TestFlight release (2026-10-25)

The owner explicitly approved publishing the code and Markdown documentation and
releasing build 33 to internal TestFlight. These changes follow the already
delivered build 32; they do not modify that binary. **475 Node 22 regressions,
all four Swift suites, signed app/widget archive, export and upload passed in
macOS CI.**
App shell: `autofit-v65`. No external beta, public App Store launch, identity
provider activation or paid subscription activation is included.

**Apple verified build 33 as VALID / IN_BETA_TESTING at 2026-10-25 10:09:33 UTC.**
Released binary source:
[`845c55bcb1085455e2166a1be14be89083462dc8`](https://github.com/Sasidaniel/AutoFit-ios/commit/845c55bcb1085455e2166a1be14be89083462dc8).
[Successful native release run](https://github.com/Sasidaniel/AutoFit-ios/actions/runs/40183328989).
Apple build ID: `1d2287e4-0496-4c4c-8469-9c82716d8114`.
External state: `READY_FOR_BETA_SUBMISSION`; no external submission was performed.
The later request to remove an exercise from the current workout, preserve its
logged performances and allow undo arrived after this run was dispatched. That
follow-up is not included in the build 33 binary.

- Exercise categories now have a sticky, clearly labeled top back arrow and a
  full-width all-categories button. Both are 48px tall; the top arrow respects
  RTL/LTR direction. Both return from category or filtered results without writes.
- Saved manual workouts previously had only a read-only review. A separate editor
  now supports named and generated saved plans, exercise addition/removal/order,
  sets, rep ranges, independent optional voice-count targets, rest, load targets,
  hold seconds and steady-cardio duration/pace. Interval recipes remain intact;
  changing their rounds requires building a separate rope workout.
- Editing uses a deep-copy draft and explicit save/cancel, preserves stable IDs,
  list position, unknown nested metadata and unedited plans, and never activates
  the edited plan. Saving reads the latest settings to retain unrelated changes
  and rejects a concurrently changed/deleted target. Storage failure keeps the
  editor open and the previous persisted/in-memory settings intact.
- Selected saved workouts carry an immutable name/day snapshot into the workout,
  home heading, completed history, summary and text/image/PDF sharing. Later saved
  plan edits cannot rename recorded sessions. Legacy history without recorded
  plan provenance is retained as-is rather than assigned a guessed workout name.
- Weeks now run Sunday through Saturday in home counts, adherence charts,
  streaks, weekly details and muscle-work summaries. Local-calendar calculations
  handle month/year and daylight-saving boundaries. Existing history is not
  deleted or redated. A home weekly-goal selector supports explicitly choosing
  four sessions for A/B/A/B without modifying any saved workout or split.
- The home training hub no longer shows Save My Workout. Saving remains
  available in Exercises and the saved-plans dialog.

Difficulty ratings are optional completed-set data, shown in the workout
summary and retained in history/sharing. They do not change volume or directly
prove strength gains. Recommendations use the two most recent comparable
recorded sessions: a hard rating prevents an increase suggestion; missing
easy/right ratings or mismatched targets do not justify an increase; reaching
the same explicit rep target throughout both matched sessions at the same load
can support considering an increase for supported equipment. Changes still
require explicit acceptance; assistance, holds, cardio and unknown custom
variants have separate conservative guards. There is no dedicated difficulty
trend chart.

Preservation was checked on three synthetic existing programs, including the
owner-provided custom name "משיכה צרה בפולי עליון במשולש" in Back, rep ranges,
independent hold/cardio targets, full rope recipes and nested metadata. The
owner's actual iPhone storage is not accessible here. Update in place, not by
uninstalling; retain a JSON export as an additional precaution (JSON import UI
is not available).

Local verification: **475 JavaScript regressions and 17 module syntax checks
passed**; the two calendar/muscle-week cases also passed under
`TZ=Asia/Jerusalem`. Isolated browser acceptance covered save/cancel, exercise
addition/removal/reorder, quota failure, concurrent changes, independent
hold/cardio/rope targets, reload, named activation/completion/history and all 13
category returns. Hebrew RTL and English LTR fit a 316px content width. The
existing shared preview was refreshed to v65 with all five original storage
values byte-for-byte unchanged; synthetic acceptance storage was cleared and
its temporary server stopped. The original review server remains available.

### Build 33 iPhone acceptance checklist

1. Update in place through TestFlight; do not uninstall. Retain a JSON export as
   an additional precaution. Confirm all three saved programs, customized targets,
   exercise order and the personal triangle-handle pulldown in Back remain.
2. Edit one saved program, cancel once, then save. Confirm the other programs and
   any already-entered workout remain unchanged. Select the edited plan explicitly
   to use its new targets; saving alone does not activate it.
3. Choose a weekly goal of four from Home for A/B/A/B. Confirm only workouts
   started since Sunday count toward the current week, and earlier history remains.
   A weekly count goal does not automatically schedule or replace saved programs.
4. Select/start a saved workout, check its name at the top, complete and save a
   set, then check the matching history heading. Earlier records without saved
   plan provenance intentionally retain their existing date-only heading.
5. Open exercise categories and use both back controls. Check Hebrew/English
   layout and the existing workout/music/headphone flows on the physical iPhone.

## 1.0 (32) - Verified internal TestFlight release (2026-10-25)

The owner explicitly approved publishing the code and Markdown documentation and
releasing this update to internal TestFlight. This release includes the
commercial-readiness review, saved workouts, catalog/media expansion, home and
split planning, jump-rope intervals, workout usability and full catalog browsing
documented below. **464 Node 22 regressions, all four Swift suites, signed
app/widget archive, export and upload passed in macOS CI.** Local validation also
covered 17 ES module syntax checks and bilingual browser acceptance.
App shell: `autofit-v63`.

**Apple verified build 32 as VALID / IN_BETA_TESTING at 2026-10-25 08:55:56 UTC.**
Released binary source:
[`f6cb3b60a5c7b84ac20497c9483fe65c2e03816a`](https://github.com/Sasidaniel/AutoFit-ios/commit/f6cb3b60a5c7b84ac20497c9483fe65c2e03816a).
[Successful native release run](https://github.com/Sasidaniel/AutoFit-ios/actions/runs/40178292936).
Apple build ID: `b511cd57-fa4d-470c-8841-f4d974243885`.
External state: `READY_FOR_BETA_SUBMISSION`; no external beta or public App Store
submission was performed. This replaces internal build 31 for new testing.

This approval does not launch paid subscriptions, activate identity providers,
certify the draft legal documents or submit the app to the public App Store.
Purchases remain disabled. Real-device audio, touch, background timer and workout
data-preservation acceptance remain for the owner's iPhone testing.

### Build 32 iPhone acceptance checklist

1. Update in place from TestFlight; do not uninstall to test the update. Confirm
   existing history, custom names, photos and selected exercise order remain.
   Export existing data from the consent screen if needed before accepting.
2. Review the separate draft terms/privacy confirmations. System microphone,
   Health and notification permissions remain separate; no purchase or marketing
   consent is bundled into this confirmation.
3. Open Exercises: all 130 built-in definitions should be reachable through
   categories/search, even if only 51 are saved and 25 selected. Search incline
   chest pressing, overhead cable triceps and jump rope. Browsing must not change
   the workout; only explicitly chosen entries should be added.
4. Save two differently named workouts, reopen them and select a session. Verify
   starting another plan is blocked while current work contains entered data or
   is running/paused. Do not cancel real recorded work merely to test the guard.
5. Review home plans for actual equipment, especially chair versus bench and
   the TRX installation acknowledgment. Review full-body, A/B and A/B/C session
   letters, exercise choices and disclosed duration/coverage limitations.
6. Start a beginner rope workout: two-minute walking warmup, 20-second jump and
   40-second recovery rounds, then two-minute cooldown. Pause/resume and reopen
   the app without skipping or resetting the interval position. Compare
   background timing/announcements against elapsed wall-clock time.
7. Scroll the running workout and use the header-level equipment action.
   Complete a test set before replacement, then restore it: the original result
   must remain and replacement loads must not inherit the original weight.
8. Test voice with playing music first in automatic mode, keeping the iPhone
   microphone uncovered. Then explicitly test headphone mode; call-quality
   music in that mode is a disclosed tradeoff, not proof of a regression.
   Check the displayed input name and permission/recovery errors.
9. Confirm a saved workout's actual Apple Health write outcome, including a
   permission denial, rather than assuming a success toast means Health saved.
10. Export a JSON copy before considering reinstall/reset. New sensitive iCloud
    backups are disabled, not an alternative automatic backup. Test irreversible
    deletion only on disposable data, never the owner's only real history.
11. Confirm subscription purchases stay disabled and no Apple/Google account or
    free trial is falsely shown as active. This is an internal feature-review
    build, not a public commercial launch.

## Build 32: Full catalog visibility in exercise categories

Fixed the mismatch between the 130-definition database heading and category
counts that previously covered only the user's 51 installed exercises. Categories
and search now browse the full built-in catalog, including planning variants,
alongside personal exercises, without installing or activating anything merely
by browsing. Category counts and displayed rows use the same source. Glute/calf
strength exercises are grouped under legs rather than general.

Uninstalled entries have a clear status, working offline guides, search and
equipment filters. Explicitly adding one installs only that exercise. Editing
and saving one can install it inactive; cancelling or a failed storage write does
not install it. Existing IDs, names, photos, selected order and recorded work are
preserved. Deleting an installed built-in removes the personal library copy, not
its read-only availability in the built-in catalog. Counts distinguish built-in,
available-in-categories, saved-library and selected-workout entries; equipment and
measurement variants remain separate definitions.

All **464 regressions passed**, plus 17 module syntax checks. Real browser checks
from a 51-entry library found exactly 130 distinct IDs across all categories,
matching each displayed category count, with no storage changes from browsing.
Explicit add/remove, inactive strength/cardio editing, cancellation and simulated
storage failures were checked. Hebrew RTL and English LTR at 316px retained
matching totals, working search/equipment filtering and no horizontal overflow.
Offline shell: `autofit-v63`. Browsing does not migrate the owner's saved records.

## Build 32: Workout usability, splits and jump-rope intervals

This follow-up was reviewed locally before release approval. The review preview
remains at `http://127.0.0.1:8941/?previewSkip=1`; its existing program and records
are preserved.

- **Workout scrolling:** live updates use the existing in-memory exercise/history
  state rather than rereading history and cloning the planning catalog every
  second. Unchanged stopwatch/hold text and header buttons are not rewritten;
  structural actions are refreshed after actual changes. Duration estimates
  refresh less frequently during an active workout, and set tables no longer
  introduce an unnecessary nested horizontal scroller. This reduces avoidable
  browser work; physical iPhone scrolling still needs device review.
- **Equipment busy:** replacement/restoration is now in the exercise header,
  rather than below the set table. Completed work remains attached to its original
  exercise; replacement sets do not inherit the original load or repetitions.
- **Voice with music/headphones:** Settings offers an explicit native-only
  microphone choice. Automatic mode retains the released music-quality policy
  and may use the iPhone microphone. Opt-in headphone microphone mode permits
  Bluetooth call routing and warns that music quality can decrease. An unavailable
  headphone microphone produces an error, not a silent phone-microphone fallback.
  This is a route-selection option, not a verified fix for every headset.
  Native compilation and the Swift audio-policy suite passed in release CI.
  Recognition with playing music, interruptions and actual headphone routing
  still require physical-device acceptance.
- **Jump-rope builder:** Home and Exercises offer beginner, intermediate and
  advanced workouts with 10/15/20/30-minute budgets, location and an explicit
  equipment/clear-space acknowledgment. Presets use 20/40, 40/40 and 60/30-second
  work/recovery intervals, respectively, with two-minute walking warmup/cooldown.
  Whole rounds fit the budget; shorter resulting durations are shown honestly.
  Phase/countdown, pause/resume, reload, saved plans, completed history and sharing
  retain the interval prescription. Phase announcements use the existing native
  scheduling/coalescing mechanism; browser timers require the page to stay open.
- **Requested exercise variants:** incline dumbbell/Smith chest presses and
  overhead cable triceps extensions already exist with instructions and videos;
  they were checked rather than duplicated. Jump rope adds one new inactive
  definition with bilingual instructions, an original offline diagram and a
  selected Crossrope tutorial link verified on 2026-10-25. Current catalog totals
  are **130 built-in definitions** (25 seed, 99 library, 6 planning) and
  **116 authored guides**, including **73 extended additions** across this local
  phase. Updating does not automatically add jump rope to the user's workout.
- **Plan splits:** explicit full-body, A/B upper/lower and A/B/C push/pull/legs
  choices support one to six sessions, subject to the split's minimum days.
  Previews and saved-plan start buttons identify A/B/C sessions. Editing retains
  the session's muscle/movement coverage; incompatible selections and insufficient
  equipment are explained rather than producing empty workouts. Tight budgets
  disclose overruns without silently shortening rests or dropping required work.
  Existing saved plans without a split retain their previous generation behavior.

### Follow-up verification

All **460 JavaScript regressions passed**, including the actual microphone-settings
callback's successful restart and storage/stop/capture failure paths; all 17 ES
modules passed UTF-8 syntax checks. The coherent offline shell is `autofit-v62`.

Isolated browser acceptance exercised a 25-exercise/69-set running workout:
over 6.2 seconds there were no history-storage reads, no header-button mutations,
no replaced exercise-card nodes and no scroll displacement. Actual forms saved
full-body, A/B, A/B/C and all three rope levels without changing the original
program. Actual controls preserved a completed set through equipment replacement
and restoration while leaving replacement loads blank.

Accelerated, isolated-clock acceptance covered rope warmup/work/recovery,
pause/resume, paused reload, completion and retained interval history. Original
25-exercise program restoration preserved the six saved alternatives and completed
history. Rope builders, six-day previews, saved plans, workout headers and the new
guide had no horizontal overflow at 316px in Hebrew RTL and English LTR. These
browser checks do not substitute for native microphone, background or touch tests.
The protected review preview was refreshed to this shell with its five-key
program/history/settings/session/profile storage hash unchanged.
The commercial/legal/provider blockers documented below remain unchanged.

## Build 32: Commercial-readiness review

This work was developed in `sasi-daniel-sndk-personal-training-upgrade`, based on
published build 31 (`bff5d7aa8a6906544b9905bd803a0bd364a54ac2`), and is now approved
for internal TestFlight review. It is **not an approved commercial launch**.
App Store submission, provider provisioning, purchases and charges remain
outside this release approval.

### Implemented review flows

- **First use / Settings > Terms and privacy:** bilingual, versioned offline
  draft documents, four separate initially unchecked confirmations and a draft
  consent receipt. Profile measurements, photo and name are optional; system
  permissions are separate choices. Existing records do not imply consent.
  Export and deletion are accessible without accepting the draft. A standalone
  `legal.html?doc=privacy&lang=en` or `doc=terms&lang=he` also works offline.
- **Settings > Privacy and data:** JSON export of profile/photos, exercises,
  history, current work, saved plans and settings; deliberately confirmed local
  deletion; and explicit native-only read-only export/recovery or requested
  erasure of legacy iCloud copies. Deletion stops ongoing local activity and
  prevents delayed callbacks from recreating local records. Health records,
  shared files, system backups and other devices are not silently erased.
  A JSON import interface is not included.
- **Exercises > Add new exercises:** explicitly install 73 additional inactive
  exercises without replacing the user's program, names, photos or records,
  or reinstating deleted older library entries. The combined seed/planning
  catalog now has **130 definitions** (25 seed, 99 library and 6 planning),
  with **116 authored instructional guides**. This phase adds 73 definitions:
  the initial 24 plus **48 more** in response to the larger-database request
  and jump rope in the follow-up.
  The top of Exercises distinguishes the built-in total from the installed
  library and selected-workout counts. Equipment/measurement variants count as
  separate definitions; custom entries do not inflate the built-in total.
  All new guides have Hebrew/English instructions and original local diagrams;
  all **73 new guides now have selected instructional video links**, completing
  video coverage across **all 116 authored guides / 130 built-in definitions**.
  Publisher pages and YouTube publisher/title metadata were checked on
  2026-10-22, with jump rope checked on 2026-10-25. Floor/bench,
  supported/unsupported, bodyweight/weighted, grip and
  hold variants retain separate appropriate demonstrations. Links open only
  on request at the source; no third-party media or thumbnails are bundled or
  preloaded. Videos generally require internet and are in English; authored
  instructions and diagrams remain bilingual and offline. Original video
  coverage is preserved. The supplied three-page full-body PDF was reviewed for movement
  identification, not copied: its rollout is a kneeling ab-wheel movement,
  its machine squat is a hack squat, and its supported triceps movement is a
  dumbbell kickback. Cable pushdown is correctly mapped to triceps rather than
  the PDF's biceps label. No third-party graphics or workout schedule were copied.
  New diagrams distinguish inclined/Smith pressing, supported rowing, hack
  squats, back squats, seated unilateral raises and machine cardio. They remain
  schematic, not manufacturer-specific setup instructions.
- **Home / Exercises / Saved plans > Save My Workout:** save up to eight named
  alternatives, rename/review them and select/start a particular workout with
  one button. Existing generated multi-day plans also offer direct start per
  session. Saving captures the full selected program's actual order/effective
  sets, rest and configured load/hold/cardio targets, not logged performances
  or temporary time-budget omissions. Custom IDs, names, photos and history
  remain intact. Populated, paused/running, timed, counting and adjusted current
  work cannot be overwritten by direct start. Untouched auto-filled suggestions
  do not masquerade as logged work; unsnapshotted legacy measurements remain
  protected. If the final start write fails, the selected plan stays idle and
  the UI explains that selection succeeded but start did not. Original program
  restoration also restores hold duration and cardio pace.
- **Home / Exercises > Build a home workout:** select actual equipment,
  experience, goal, muscles, days and duration; review and edit the proposal,
  save an alternative, explicitly activate it and restore the previous program.
  Chair, TRX, dumbbell, band and no-equipment choices differ. A chair is not
  treated as a bench or anchor; TRX requires manufacturer-approved installation
  acknowledgment. Missing pulling coverage is disclosed rather than invented.
  Activation adds only missing chosen catalog entries. Populated/running work
  remains pinned, with the new program applying to the next workout. Shared
  duration estimates account for authored per-side movements and unchanged rests.
- **Personal > Subscriptions:** a disabled-by-default StoreKit 2 foundation,
  native product/transaction verification, actual Apple prices and introductory
  eligibility, explicit restore/management and pending/cancelled states.
  Browser use cannot buy or verify a subscription. The proposed one-week trial,
  ILS 10-15 monthly and ILS 100-150 yearly remain **planning ranges**, not
  configured products or a promised offer. Existing local features remain free
  and accessible; no subscription gate or trial countdown was activated.

### Deliberate blockers before commercialization

**Legal publication is not complete.** These documents do not certify compliance
in Israel or worldwide. The operator's legal identity, business/privacy contact,
address, age policy, distribution territories, lawful processing grounds,
provider/transfer arrangements, retention and incident procedures, consumer
cancellation/refund rights and final legal review must be confirmed. The proposed
commercial flow is adult-only; a minors' commercial flow is not implemented.

**Real Apple/Google accounts are not implemented.** Onboarding and Personal
explain guest/local use rather than exposing fake login buttons. Gmail is a
Google identity. Genuine accounts need owner-controlled provider configuration,
Apple entitlements/client IDs, token-verifying backend, secure sessions,
revocation/disconnection, in-app account deletion and a defined data/sync model.
Face ID is a device lock, not an AutoFit online account.

**Health data must not be newly backed up to iCloud.** Apple Review 5.1.3(ii)
prohibits storing personal health information in iCloud, even with consent.
New sensitive KVS writes and automatic legacy-cloud restoration are therefore
disabled in build 32. Existing copies are retained unless explicitly erased.
Legacy reads may be cached and do not prove the latest server state; requested
cloud erasure is not confirmed global erasure. Sensitive WebKit/local-storage
exclusion from system/iCloud backups, native legacy-recovery availability and a
permitted future backup architecture still require device-level work and review.
These protections apply on updating; an installed build 31 is not changed remotely.

**Billing is not launch-ready.** Both public and native configurations disable
purchases and contain no live product IDs. No App Store products, subscription
group, real price or introductory offer were created. A published policy, owner
approval, Apple agreements/banking/tax details, privacy labels, storefront and
localization review, sandbox/device verification and a clear paid-feature policy
are required before enabling billing. Native StoreKit code compiled in the
successful release archive; no sandbox or real purchase has been attempted.

Before accepting revenue, obtain Israeli accounting/legal advice on the
appropriate business/VAT registration and classification, income tax, National
Insurance, receipts/bookkeeping and foreign/App Store revenue. Do not assume
Apple's collection arrangements satisfy the operator's own obligations or that
every activity is eligible for exempt-dealer treatment. No current tax threshold
is asserted here. The official Israeli business-registration page could not be
retrieved in this environment (HTTP 403). EU distribution additionally requires
appropriate DSA trader declarations/contact details and territory-specific review.

### Evidence and acceptance

The initial commercial-review JavaScript suites passed **442 regressions**
(the complete release candidate now passes **464**), including draft consent,
exports/deletion failures, deferred writes, real commerce-controller state,
home equipment/primary coverage, reviewed-plan activation/restoration, per-side
duration, named-workout snapshots and guarded real-controller start/write
failure, PDF variant identity, all 115 SVG renderers, accurate catalog counts
and legal-page offline routing/precache installation. Browser review
uses a separate synthetic origin, never reset user data on port 8941.
It covers saving distinct 25- and 6-exercise programs, rename/reload/direct start,
paused-work protection, targeted deletion, explicit installation of 72 inactive
entries without touching existing work/history, and narrow 316px RTL/LTR layouts
including an 80-character workout name. Counts and saved-workout previews were
checked in Hebrew and English. Twelve source diagrams were additionally rendered
locally for visual inspection after browser screenshot requests timed out.
That media pass opened all 129 then-existing exercise-guide dialogs in Hebrew and
English, including every dialog at a 316px RTL/LTR viewport: offline diagrams,
steps and selected source links were present, with no horizontal overflow or
third-party media requests. External links retain new-tab, no-referrer and
noopener protections. The isolated review origin was cleared afterward.
That acceptance stage used `autofit-v61`; the complete candidate uses
`autofit-v63`, including the later rope and full-catalog checks above.
The protected port-8941 preview was refreshed only while idle; its exercise,
history, settings, current-workout and profile storage stayed byte-for-byte
unchanged. It now displays 130 built-in/category entries, 51 installed and
25 selected exercises.
Native compilation is verified by the release CI above. Permission/device
acceptance, legacy iCloud recovery and StoreKit sandbox/real-store acceptance
remain unverified.

Reference material (reviewed 2026-10-22; not a substitute for professional advice):

- [Apple App Review Guidelines: privacy, accounts, payments and Health](https://developer.apple.com/app-store/review/guidelines/)
- [Apple account-deletion requirements](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion)
- [Google Sign-In for iOS setup](https://developers.google.com/identity/sign-in/ios/start-integrating)
- [Apple StoreKit purchase and restoration](https://developer.apple.com/documentation/storekit/offering-completing-and-restoring-in-app-purchases)
- [EU DSA trader requirements in App Store Connect](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/)
- [European Commission: individual data-protection rights](https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en)
- [Israeli Tax Authority: opening an exempt-dealer file](https://www.gov.il/he/service/request-opening-exempt-dealer-via-internet)

## Version 1.0 (31): Personal training tools

This phase is based on the completed build-30 release, including `9e035c7`.
It was developed locally and reviewed in the browser before the user explicitly
approved an internal TestFlight release on 2026-10-21, including publishing all
source and documentation changes to GitHub. The release is verified available
for internal TestFlight testing on 2026-10-22.
Released binary source: `85648f0e94fded1ca511daea9040471001ce14d2`.
The [successful native release](https://github.com/Sasidaniel/AutoFit-ios/actions/runs/39736319112)
passed 394 Node 22 regressions, all four Swift suites, signed app/widget
archive/export/upload and actual Apple availability verification.
Apple build: `c6263e82-ff41-4e7f-8028-b1ce78903269`, processing `VALID`,
internal `IN_BETA_TESTING`, non-exempt encryption `false`, external
`READY_FOR_BETA_SUBMISSION` (not submitted).
Private release credentials and `PROJECT-NOTES.md` remain excluded from Git.
The native audio policy from build 30 is unchanged. The approved widget request
adds Live Activity controls and bridge/state changes, not native audio changes.
The release workflow now verifies Apple's actual `VALID / IN_BETA_TESTING`
status after upload using the existing CI-only App Store Connect credentials.
It does not submit an external beta or an App Store release.
The shared verification script also applies the same non-exempt-encryption
declaration used for previous releases if Apple reports missing compliance,
and enables only existing internal tester groups when the build is ready.
It never creates testers or submits an external beta. The separate
`ios-testflight-status.yml` workflow can finish an already-uploaded build
without rebuilding or uploading the same Apple build number again.
Future binaries explicitly declare `ITSAppUsesNonExemptEncryption=false`;
the already-uploaded build uses the equivalent App Store Connect metadata.
Apple initially reported `MISSING_EXPORT_COMPLIANCE` after successful processing.
The [successful delivery completion](https://github.com/Sasidaniel/AutoFit-ios/actions/runs/39738262703),
using configuration source `a01b9cb11429bf1ecc8c2d1cc694a2f81daed460`,
passed five targeted Node 22 verification tests, applied the established
encryption declaration and confirmed `VALID / IN_BETA_TESTING`.
The existing binary was not rebuilt or re-uploaded. All app changes and
documentation are published to GitHub; private credentials remain local.

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
All 396 regressions pass locally (the original 290 plus 106 added tests);
all 12 JavaScript modules pass byte-preserving ES-module syntax checks, and
`git diff --check` passes. The Mac release run also passed all four Swift suites,
signed iOS app/widget archive, export and TestFlight upload.
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

Native compilation and the four Swift suites are now verified on the Mac CI
runner. Real microphone recognition/recovery, music quality and pause/duck/resume,
physical-device accessibility, HealthKit/iCloud round trips and the new
AppIntent/Watch controls still require an iPhone/Watch acceptance pass.
Windows/browser checks do not establish those physical-device results,
and browser mode contains no native microphone simulator.

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
