# App Review 4.3 / 4.2.6: response for existing build 52

Prepared 2026-11-15. **Sent after explicit owner approval and independently verified.**
The owner supplied Apple's rejection message citing 4.3 and 4.2.6.
This is not a new submission, appeal decision, release authorization or live
Apple API status verification. The previous submission receipt remains historical.

The actual rejection was subsequently confirmed in the authenticated review
conversation. All nine answers below were posted there on 2026-11-15 at
07:18:13.934Z, 07:18:41.004Z and 07:18:59.805Z. Apple's composer limits each
message to 4,000 characters, so the approved response was split at question
boundaries into three numbered parts (1-3, 4-7, 8-9), without omitting text.
Fresh message readback verified exact lengths and SHA-256 against the local
approved text. Evidence: [assets/apple-review-response-receipt.json](assets/apple-review-response-receipt.json).
The status remained **Rejected** after replying; this is not reconsideration
acceptance, a formal appeal or a new review submission.

## Approved English response posted in the existing App Review conversation

Hello App Review team,

Thank you for the detailed questions. We are replying in the existing review
conversation rather than resubmitting the app. The answers below refer to the
submitted iOS version 1.0, build 52.

### 1. What the app does and the primary problem it solves

AutoFit supports an individual exerciser's workflow from planning a session to
performing it and reviewing what was actually completed. Its primary problem is
the interruption and loss of context caused by repeatedly handling the phone,
remembering previous sets and adapting a workout when time or equipment changes.

For example, a user can propose a session using a 30-minute budget, a home or gym
location, available equipment, training goal and experience. The user reviews
and edits the proposed exercises before activating the plan. During the workout,
Hebrew speech commands select exercises and report or count repetitions, while
the app maintains exercise/set targets, rest and timed activities. Manual entry
remains available when speech recognition is unsuitable.

The user records actual sets, loads, repetitions, durations and optional
difficulty ratings. Later, the app can compare compatible exercise records and
explain a conservative recommendation. It does not silently increase a target,
equate higher volume with strength improvement, or treat different exercise
variations as interchangeable.

The user can also review a reduced current-session selection when short of time,
or a curated replacement when equipment is occupied, without silently overwriting
the permanent plan or discarding completed work. Workout history and multiple
saved plans remain separately editable.

### 2. Intended users

The initial target audience is Hebrew-speaking iPhone users who independently
perform strength or mixed strength/cardio sessions at home or in a gym. They
want Hebrew hands-free interaction, control over the equipment and time they
actually have, and access to their previous training records without depending
on a server-hosted AutoFit account.

The planning flow supports beginner and more experienced users, but is not
intended to diagnose, treat disease or replace professional supervision. The
interface supports Hebrew and English; voice commands in this build support
Hebrew. We are not claiming English voice recognition.

### 3. Need or gap addressed

We recognize that workout planning and logging are established categories. We
are not claiming that no competing product has any of these individual features.
Our specific design focus is their integration into one Hebrew-first execution
workflow: confirmed equipment/time-constrained planning, Hebrew exercise
selection and repetition reporting, current-workout adjustments that preserve
recorded work, and explainable comparisons of compatible prior sessions.

For a user who trains with Hebrew exercise names, a generic plan list still
leaves repeated manual navigation and logging during the session. Our speech
handling connects exercise identity and counting to the current workout state,
rather than simply providing translated labels or playing an instructional
video. Explicit recovery/manual input and separation of plan targets from actual
recorded measurements are part of that workflow.

The recommendations use locally implemented rules and recorded evidence, not
generic remote AI text. A proposed increase requires matched history, appropriate
targets and ratings; unsupported or incompatible records return insufficient
evidence instead. The value we seek to provide is practical continuity between
planning, execution and the user's own records, rather than a new content skin
for a generic workout catalogue.

### 4. Beta testing and feedback applied

Before this submission, I personally tested internal TestFlight builds on my
iPhone and provided feedback during development. I was the only human beta
tester; we did not conduct a large external beta study, and we are not presenting
automated tests or simulator screenshots as evidence of additional users.

Examples of feedback incorporated into the submitted build are:

- Adding an exercise from the library during a workout previously produced a
  second heading for the same muscle category. The insertion logic was changed
  to place the exercise into the existing category while preserving recorded
  work and superset groupings. This was included in build 50 and retained in 52.
- Removing an exercise could stop the whole workout. The implementation was
  changed so removal preserves the session and unrelated measurements, banks
  only the removed exercise's active measurement and does not automatically
  finish the workout when its last unfinished exercise is removed. These changes
  were included in build 51 and retained in 52.
- The workout opened exercise cards before activity had begun. Build 52 keeps
  cards collapsed until the workout starts, while retaining the current-activity
  transition and recovery behavior after a session has started.

The submitted source also passed 789 JavaScript regressions, four Swift test
suites, two native-to-JavaScript streaming contracts and 144 SwiftUI layout
cases as part of its build validation. Those checks complement, but do not
replace, the limited physical-device beta testing described above.

### 5. Standalone product or suite

AutoFit is a standalone product. It is the only app in my Apple Developer
account, including apps in draft or TestFlight. It is not one of a collection
of differently branded or category-specific variants.

### 6. Consolidation into another app in the account

There is no other app in my account into which AutoFit could be consolidated as
an in-app purchase, feature expansion or content addition. Its planning,
session execution, saved plans and history are already combined in this
single app.

### 7. Shared code, frameworks or assets with another app in the account

There are no other apps in my account, so there are no shared components with
another app in that account. AutoFit uses the standard Capacitor runtime to host
its web-based interface and connect it to iOS. That framework is infrastructure,
not a separate app or a purchased fitness-product template.

### 8. Shared codebase, SDK or content library with third-party apps

The project was developed specifically for AutoFit, with assistance from
GitHub Copilot during implementation. It was not purchased as a commercial app
template, cloned from another app, or generated by a ready-made fitness-app
service. We distinguish coding assistance from a service distributing multiple
apps from the same commercial template.

The standard third-party app framework is Capacitor 8.5.3. The app uses Apple's
Speech, HealthKit, MediaPlayer, LocalAuthentication and ActivityKit APIs through
project-specific native bridge implementations. These provide speech input,
optional Health export, music controls, biometric authentication and workout
Live Activities. Apple APIs and Capacitor are not third-party fitness content
libraries.

AutoFit's plan-selection rules, workout state management, speech-to-set handling,
compatibility checks for progress recommendations and saved/history editing
flows are implemented within this project. They are not provided by a
third-party workout-app SDK.

The app includes exercise illustrations and optional links to external
instructional resources. I have confirmed the necessary usage rights for the
included exercise images and app icon. We do not claim that every illustration
is exclusive or that standard exercise descriptions themselves are novel.
External video links open on the user's action; they are not a remotely loaded
workout app, embedded third-party video library or the primary product.
Formspree handles the optional contact form, not workout generation or tracking.

### 9. Client, partner or other content provider

AutoFit is my own product. I provide its concept, branding and content direction
and submit it through my own Apple Developer account. It was not created for
another client or partner and is not being submitted by an app-template
provider on someone else's behalf.

I would appreciate clarification of any specific matching app, template or
workflow that led to the concern, so that we can address the precise issue.
We understand that a feature list alone does not establish compliance and
that this explanation does not guarantee approval.

Thank you for reconsidering the submitted build in light of these answers.

## Evidence and owner confirmations (not part of the message to Apple)

**Submitted source:** `93bce49bf3f5aed3d9daf023d3ff31673e9f9035`.
Do not substitute newer local code or the post-submission 833-test total.

| Claim | Basis |
|---|---|
| Planning inputs and differentiated sets/reps/rest | `www\js\training-tools.js`, `generatePlan`, at submitted source |
| Time review, substitution and preserved sessions | Same module: `timeBudgetProposal`, `applyTimeBudget`, `restoreTimeBudget`, `swapExercise`, removal/restoration helpers |
| Conservative matched-history recommendations | `www\js\workout-insights.js`, `progressRecommendation` and `compareEntries`, at submitted source |
| Native speech/counting and individual bridges | `ios\App\App\VoiceCommandPlugin.swift` and the Health, Music, FaceId and LiveActivity bridges at submitted source |
| Framework dependencies | `package.json` at submitted source; only Capacitor CLI/core/iOS are declared dependencies |
| Group insertion and removal fixes | `RELEASE-NOTES.md`, builds 50 and 51; source commits `4fce6f9` and `3e08c78` are ancestors of build 52 |
| Initial collapsed cards | Build-52 source commit `93bce49`; `RELEASE-NOTES.md`, build 52 |
| Actual build validation | Release run [42470815613](https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42470815613); existing-build verification [42472312181](https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42472312181) |

The owner explicitly confirmed on 2026-11-15:

- AutoFit is their own product, not a client/third-party commission.
- It is the only app in the developer account, including draft/TestFlight apps.
- They tested on an iPhone through TestFlight and provided feedback; there
  were no additional testers.
- The project was bespoke, assisted by Copilot, not based on a ready-made
  commercial template or another app's code.

The earlier included-image/icon rights confirmation is recorded in the
submission receipt. It is an owner attestation, not independently proved media
provenance. Do not claim all assets were exclusively created for AutoFit.

## Sending and follow-up

The owner approved sending this response. It has already been posted as three
replies in the existing App Review rejection conversation, **not as a new review
submission**. Do not repost it merely because the app still says Rejected.
Wait for Apple's actual response and read the existing conversation before
considering any further reply.

Do not remove/recreate the app, upload build 53, resubmit build 52 or start a
release workflow. Any requested screenshots or recordings must be real evidence
of the submitted build; do not fabricate native behavior in a browser preview.
If Apple maintains the rejection, use the specific feedback to decide between
further clarification, a formal appeal, or substantive product improvements.
None of those outcomes is guaranteed or authorized automatically by this draft.
