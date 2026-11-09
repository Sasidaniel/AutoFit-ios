# AutoFit App Store approval package

Local creative proposal requested on 2026-11-09. **Not submitted or published.**
The reference binary is **1.0 (52)**, source
`93bce49bf3f5aed3d9daf023d3ff31673e9f9035`.
During the approved copy upload, application runtime code, pricing, permissions
and billing were not changed. Subsequent local policy-contact edits are recorded
below and have not been uploaded in a new app binary.
The approved store name and bilingual copy are now saved in Apple's draft;
manual release is configured, with no review submission or public distribution.

On 2026-11-09 the owner approved the presentation and requested saving the
materials and uploading to the App Store. This authorizes proceeding with
submission preparation; it does not establish missing privacy declarations,
legal facts or final native screenshots. Submission is not yet confirmed.
Keep manual release configured rather than automatically publishing after review.

## Current verified state — later updates supersede historical notes below

The separate public support/privacy notice describes the immutable existing
build 52, including its legacy minor flow, Apple processing, optional Formspree
contact submissions and provider logs, device/cloud-copy limitations and current
confirmed public contact. It does not publish the old draft terms as approved,
change runtime approval flags, claim verified adult-only access, or update the
installed app. Generate its script-free Hebrew/English files with:
`node marketing\app-store\support-site.cjs --build52-notice --output docs`.
The original unapproved-policy export guard remains enforced. GitHub Pages
hosting and actual HTTPS URL verification are separate publication steps;
generating files alone does not establish a public URL or App Review submission.

The owner's latest instruction authorizes temporarily excluding Europe and
ages 12–17 where those requirements block launch. The App Store override was
changed from 13+ to **18+**, saved and read back. Apple displays 19+ in Korea
and maps this override to **17+ on operating systems before version 26**.
This store setting is not age verification: the existing build 52's in-app
minor/guardian flow is unchanged. An enforced adult-only onboarding change
would require an app update and separately authorized binary upload.

The **27 EU countries are now Not Available**, leaving **148 current territories**.
Israel, the US, UK and Norway remain Available on App Release.
Automatic inclusion of future territories remains disabled. No preorder,
new binary, public release or automatic publication was started.
Readback: <https://appstoreconnect.apple.com/apps/6820408299/distribution/pricing/availability>.
Removing EU availability does not waive global privacy requirements.
The owner subsequently accepted Apple's updated Developer Program agreement.
A fresh authenticated App Store Connect home-page read confirms the pending
agreement/Account Holder acceptance notice is absent. The agent did not accept
the agreement or request that it be accepted again.

All 32 native originals and 32 opaque marketing compositions are preserved
with their separate capture-run provenance. Upload run
<https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42626923506>
stopped before transfer because the first guard incorrectly expected `IOS`
instead of Apple's `IPHONE_APP_STORE` / `IPAD_APP_STORE` catalog platforms.
That guard was corrected against Apple's official schema.
Run <https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42627229097>
then transferred and committed the first image, but its one-minute polling
limit expired while Apple was still processing it. Read-only inspection
<https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42627748864>
confirmed that same immutable image reached `PREPARE_FOR_SUBMISSION`,
specification `bd402f1a-26ee-5b83-9dd7-972c60c43d47`, 1320 × 2868.
It was not rejected by Apple. The uploader now commits all transfers before
waiting, allowing server-side processing to overlap, with a six-minute polling
bound per image, safe retry reuse and sanitized processing checkpoints.
Regression coverage includes processing lasting beyond the former limit.
Neither an upload retry nor a green read-only inspection is an App Review receipt.
Run <https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42628494856>
committed all 32 images; 29 had finished processing at its readback and the
first eight Hebrew iPhone screenshots were successfully placed. Its final
guard expected the documentation's `PARENT_PREPARE_FOR_SUBMISSION`, but the
live API returned `ACTIVE` (with the same eight legacy screenshots `COMPLETE`).
Verification now accepts either observed ready representation, still checks
exact ordered placement IDs and processed-image dimensions/specification,
and still requires the parent version to remain editable with manual release.
Pending placements and mismatched order are rejected. Both modern and
legacy readiness views are source-labelled; they must not be summed as
independent screenshots when Apple exposes the same assets through both APIs.
Run <https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42629653057>
stopped before upload because a newly added regression was accidentally nested
and cancelled under the CI test runner. This was an implementation/test failure,
not an Apple rejection. The regression is now an independent top-level test,
and the exact 29-test App Store CI selector passes locally before the next retry.

**Native screenshot delivery is now verified.** Successful run
<https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42629838965>
read back **all 32 images in four exact ordered groups of eight**: Hebrew and
English, iPhone and iPad. Every modern placement is `ACTIVE`; the independent
post-upload metadata snapshot confirms eight per group. The permanent,
sanitized receipt is `assets/apple-screenshots-receipt.json` and links every
uploaded image to the exact approved artwork SHA-256. Retries reused the
existing immutable assets rather than uploading duplicate binaries or images.
The version remains `PREPARE_FOR_SUBMISSION` / `MANUAL`; **this is a successful
screenshot upload, not an App Review submission or public release**.
Public support/privacy URLs and privacy/content-rights declarations remain
unresolved. The developer agreement is no longer an outstanding blocker.

The owner subsequently **declined preparing/uploading build 53**. Do not start
a new binary release or TestFlight upload. Existing build 52 is still the only
approved candidate; its policies, minor-consent flow and bundled assets cannot
be changed retroactively. The owner said most artwork was generated during
development, but this is not confirmation of rights to every legacy asset.
The original bundled anatomical PNGs and gold-dumbbell icon predate this
improvement phase, and no license evidence was found for them in the inspected
repository records. Do not submit a blanket content-rights certification or
claim an enforced adult-only app gate on that basis. This refusal concerns
a new binary, not a withdrawal of authorization to submit the existing version
after its outstanding mandatory fields and facts are genuinely complete.

## Live Apple inspection — 2026-11-09

Read-only inspection succeeded in
<https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42590615251>.
The actual app is `6820408299`, currently named **AutoFit Workout Tracker**.
Version 1.0 is **PREPARE_FOR_SUBMISSION**, not Waiting for Review.
No build is selected, no screenshots are uploaded, the store description is
empty, and public support/privacy URLs and complete review contact are missing.
The existing release type is **AFTER_APPROVAL**; switch it to **MANUAL** before
submission. The read-only inspection has not changed that setting or any other
Apple record. Local metadata and creative approval are not an Apple receipt.

Submission is blocked pending real owner-provided contact/policy facts,
completed in-app policies and final native iPhone/iPad captures. Do not invent
an email address, review phone, policy approval or privacy-label answer.
The owner has now confirmed the public support/privacy email
`autofitrainer@gmail.com` and the individual operator
`ששי דניאל / Sasi Daniel`. The owner requested worldwide distribution across all currently available App Store
countries/regions. Future territories are not automatically authorized.
Remaining review and region-specific compliance details still need confirmation;
these answers alone do not finalize the policies.
The owner declared **Trader** status for DSA purposes and subsequently reported
that Apple has completed and approved verification. This is owner confirmation,
not independent API verification. Public address/P.O. Box,
phone, email verification, supporting documents and any payment-account details
required by Apple must be handled directly in App Store Connect, never committed
to this public repository. Do not select Non-trader merely because launch is free.
Official instructions:
<https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/>.
The owner subsequently confirmed that Apple has already approved Trader
verification. Do not request verification documents or codes in chat.

The approved draft upload attempt
<https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42594290741>
stopped at Apple's HTTP 409 duplicate-name error: **AutoFit** is used by a
different account. This is a draft metadata validation error, not an App Review
rejection. The manual-release PATCH was accepted before that error; an
independent readback is still required. No review submission occurred.
The existing reserved app name is **AutoFit Workout Tracker**. An alternate
store name requires the owner's choice, while the in-app AutoFit branding stays.
The owner selected **AutoFit: Workout Partner** for the next availability check
and draft metadata upload. Both store localizations use that title; in-app
branding and the screenshot compositions retain AutoFit.
Apple accepted the selected name. A subsequent automatic English localization
creation was handled without duplicating it. Successful run
<https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42594889209>
verified both complete text localizations and **MANUAL** release at
2026-11-09T09:38:04Z. Version 1.0 remains **PREPARE_FOR_SUBMISSION**:
no build selection, screenshots, pricing changes or review submission occurred.

## Native screenshot preparation

The existing no-release iOS validation workflow has an explicit
`store_screenshots` mode. It builds the actual Capacitor app in Debug on macOS
and captures iPhone 17 Pro Max and 13-inch iPad simulators in both languages.
It uses the same synthetic fixture, actual controls and real native bridge.
Native microphone/listening, Health delivery and music playback are not mocked.
The CI-only loopback transport override and control script are not shipped in
the app or available from the default review server.
Successful capture and provenance must be inspected before treating those files
as final store assets; the browser images remain review-only in the meantime.

## Support and policy page review

The local review server now provides `/support.html`, `/privacy.html` and
`/terms.html`, with `-en.html` counterparts. These are working bilingual review
pages, not claimed public URLs. Policies render from the actual in-app legal
source, not a divergent marketing policy. Confirmed public operator/contact
details were added locally in `commercial-draft-3`; old consent is not silently
upgraded, no records are erased, and billing remains disabled.
Those source edits are **not included in TestFlight build 52**.

To export the review pages:

```
node marketing/app-store/support-site.cjs --review-only --output <review-directory>
```

Omitting `--review-only` refuses publication while the actual policies are drafts
or unapproved. Public hosting, approved final policies and a matching final app
binary are still prerequisites for submission.

## Confirmed review contact and minor-launch decision

The owner saved Apple's private review contact directly in App Store Connect.
Read-only inspection
<https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42596732165>
verified `reviewContact.complete: true` and `demoAccountRequired: false`.
No private contact fields are copied into this repository.

The owner explicitly chose to retain ages **12–17** and complete the relevant
privacy/consent review before launch, rather than restricting the release to
adults. This does not constitute a completed compliance review. The current
guardian declaration is local and is not identity or guardianship verification.
Voice recognition requests on-device processing when the recognizer supports it,
but can otherwise use Apple services. The optional contact form transmits entered
contact information and message content to Formspree without a separate minor
processing path.

Apple guideline 5.1.4 distinguishes a parental gate from legally sufficient
consent. European Commission guidance describes country-dependent parental
consent thresholds from 13 to 16 and reasonable verification efforts. The FTC
COPPA FAQ flags its April 2025 rule amendment; neither a checkbox nor a generic
audio-command exception should be treated as blanket clearance for age 12.
These are launch-review questions, not a legal certification. Final policy and
parent/guardian handling must be resolved before claiming public-launch readiness.

References:

- <https://developer.apple.com/app-store/review/guidelines/#kids>
- <https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data/are-there-any-specific-safeguards-data-about-children_en>
- <https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions>

## Owner authorization and native asset review

The owner initially chose to **hold submission** until the minor/privacy issue
was resolved. The draft writer still refuses all Apple requests whenever
`submissionRequest.pausedByOwner` is true; creative approval alone is not
permission to resume.

The owner subsequently explicitly requested **submitting now without waiting
for further approvals**. That renewed decision sets `pausedByOwner: false` and
`ownerAuthorizedReviewSubmission: true`. It authorizes App Review submission,
not fabricated privacy/age/rights declarations or automatic publication. The
approved existing build 1.0 (52) may be selected for the initial review;
the submission workflow does not upload a new binary. Unresolved policy
questions remain documented rather than being marked approved.

`submit-app-store-review.cjs` uses Apple's review-submission/item endpoints,
preserves manual release, refuses unrelated existing review items or a different
selected binary, and records each stage. It reports success only after readback
confirms the matching version and review in Apple's queue. Required-field errors
remain explicit failed attempts. A readback failure after sending is recorded as
unverified, not safe to resubmit blindly.

Native capture run
<https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42595427163>
built the actual app and produced 32 iPhone/iPad files in both languages.
**Visual review did not accept these assets:** several images show stale screens
or duplicate views rather than their labelled content. The files are retained in
session artifacts, not substituted into the approved gallery or uploaded to Apple.
The controller now requires the foreground visible tab/dialog, explicitly opens
the workout tab, waits for presented animation frames, and the pipeline rejects
duplicate images within each device/language group. Those corrections have
regressions but still need a fresh macOS capture and visual acceptance; a green
file-count workflow alone is not final screenshot approval.

The corrected attempt
<https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42605899139>
failed before the first capture: the actual WKWebView never presented the
required animation frames, while the simulator screenshot still showed the
startup splash despite the DOM having advanced. The new guard correctly refused
the stale image. Run
<https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42608293814>
then connected Xcode's Simulator display and passed the frame guard for actual
workout and set screens. It stopped at the plans scene because the controller
tried a shortcut that was not visible from the workout tab. Both native targets
compiled successfully and their privacy resources were embedded and linted.
No complete native asset set was produced or accepted.

The controller now navigates through the visible Home shortcut and measures the
real safe-area header and sticky workout controls when scrolling to an exercise,
rather than assuming a fixed pixel offset. All 32 scene transitions across both
languages and phone/tablet browser viewports were exercised against the real DOM
with `node marketing/app-store/capture.cjs --native-controls-check`. That check
does not simulate native services and is not a native-capture receipt. The
simulator pipeline remains bounded at 60 minutes to accommodate measured slow
GUI boot/launch and real frame presentation across both devices and languages.
The frame guard remains mandatory. These are capture-environment/controller
corrections, not production audio or startup changes.

Run `42611518422` completed all 16 iPhone images and two Hebrew iPad scenes,
then failed the frame guard at the iPad plans dialog. All 16 iPhone images were
visually reviewed as distinct matching scenes, but there is no complete 32-image
provenance receipt. Explicit device-family selection now allows iPad recovery
without repeating completed iPhone work. Each family opens a new Simulator
instance so its selected-device argument is not ignored by a running instance.
The four-frame guard remains required, with a bounded 30-second deadline and
frame-count/visibility failure diagnostics.

Price, territories, agreements, age-rating and privacy-label answers remain
unassessed by this read-only check.

## Latest actual submission attempt and completed native families

The renewed owner-authorized attempt selected existing build **52** and reused
review draft `da769c03-e86d-4556-8c79-a8cb0d237a51`, but Apple refused adding
the version with HTTP 409. No final submission request was sent. Diagnostic run
<https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42623704458>
preserves Apple's nested associated errors rather than hiding them behind a
generic invalid-state message. It identified missing URLs, copyright, age
answers, screenshots, category, published privacy answers, pricing and content
rights. This is not an App Review rejection or a queue receipt.

The Apple UI subsequently saved **Health & Fitness** and the factual age
questionnaire: wellness/exercise recommendations are present, medical treatment
content is not; no advertising, social feed, chat, gambling or parental/verified
age-assurance mechanism is claimed. Apple's 13+ override is the lowest available
above the app's minimum of 12, producing a legacy global 12+ rating and regional
exceptions. This does not change the app's consent flow or certify minor privacy
compliance. Initial prices were confirmed as zero across 175 territories.
Availability was configured for those current territories, explicitly excluding
automatic additions of future territories. Copyright uses the confirmed operator,
`2026 Sasi Daniel`; this does not certify third-party content rights.

iPad-only recovery completed successfully:
<https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42623335643>.
All 32 originals are visually reviewed, with eight distinct intended scenes per
device/language. `assets/native/provenance.json` preserves both capture commits
and run outcomes: iPhone came from the earlier partial run; iPad came from the
successful isolated recovery. No single combined-run receipt is invented.

`capture.cjs --native-compositions --native-controls-check` creates opaque
native-source artwork at **1320 x 2868** and **2064 x 2752**, verifies exact
source hashes and headline placement, exercises all 32 real DOM scene controls,
and verifies the bilingual storefront and support layouts. A separate native
gallery offers device selection, full-size artwork and original raw downloads.
The earlier browser-derived artwork remains explicitly identified separately.

`upload-app-store-screenshots.cjs` uses Apple's current Asset Library API rather
than deprecated screenshot-set enums. It validates the live catalog, uploads
only verified native artwork to Apple's byte-upload hosts without forwarding
the API JWT, checks processing dimensions/specifications, and reads back the
four ordered eight-image groups. It refuses unrelated existing placements and
reuses matching immutable assets on retry. It never submits, publishes, selects
another build or uploads a binary. The workflow operation is
`upload_store_screenshots=true`; successful local checks are not an upload receipt.

## First-party required-reason API declarations

The app and Live Activity extension now have separate `PrivacyInfo.xcprivacy`
resources in their respective Xcode targets. The declarations describe actual
first-party native uses, not a completed App Store privacy label:

| Target | API category / reason | Existing use |
|---|---|---|
| App and extension | User defaults / `CA92.1` | App-owned Live Activity actions and acknowledgements in `UserDefaults.standard`; no App Group defaults are accessed. |
| App only | System boot time / `35F9.1` | `VoiceCommandPlugin.swift` measures elapsed capture/speech intervals using `systemUptime`. |
| App only | File timestamps / `C617.1` | `ShareBridgePlugin.swift` reads creation dates inside the app's temporary export directory to remove expired exports. |

These manifests deliberately do not invent data-collection or tracking answers.
Formspree, optional speech processing, minors, native backup exclusion and the
final aggregated dependency privacy report still require their separate review.
The capture pipeline checks that both manifests are present and valid in the
built app. Native run `42608293814` verified this at source `b730d3a`; the
declarations are not included in TestFlight build 52.

Apple requires the bundle containing each executable to report its own covered
API use; an SDK manifest is not a substitute for the app's declarations:
<https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api>.
Approved category reasons:
<https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitype>.

## Review

Run `node marketing\app-store\serve.cjs` from the worktree and open
<http://127.0.0.1:8970/>. The server binds to loopback and serves only public
application files and this review package, not the repository root or credentials.

- Switch Hebrew/English at the top.
- Inspect the product-page approximation, then all eight images at full size.
- Download the same PNGs shown in the gallery.
- Download the complete creative-review ZIP (copy, images and provenance).
- Inspect and copy every metadata field; download the complete JSON.
- Review the explicit remaining submission blockers.
- The optional local creative-approval button stores only a browser receipt.
  It does not send anything to Apple or authorize submission/publication.

`listing.json` is the single source for the preview and screenshot headlines.
No ratings, reviews, seller identity, age rating or finalized privacy labels
were invented. The blue GET button is nonfunctional and clearly labeled.
The layout is an approximation, not an exact reproduction of Apple's variable
device/language-specific product page.

## Creative direction

Existing AutoFit black/gold branding and the current 1024px app icon are reused.
Eight benefits in order: organized workout, personal planning for available time,
environment and equipment, Hebrew voice control/logging, statistics, saved plans, history, warmup/cardio/cooldown,
exercise discovery. All copy and actual UI captures have Hebrew and English
versions. The subtitle follows the owner's personal-assistant/partner positioning.
Lead with the user's benefit, not a feature inventory: less phone handling,
organized plans and a useful record over time. Invite downloads and voluntary
word of mouth without rewards, fabricated endorsements or rating prompts.
Personal planning and support for progress lead the store copy and the second
gallery image. Do not promise guaranteed results, automatic target changes or
adaptive coaching that the local rule-based builder does not provide.
The separate campaign section proposes a focused audience, a real-device
20-25-second demo storyboard, voluntary word of mouth, an organic launch and
three sample hooks in both languages. These are reviewable proposals, not
completed outreach, a recorded video, an app referral feature, new analytics
or authorization for paid acquisition.

The bilingual iPhone section is repeated verbatim in the store description:
Apple Health saves completed workouts with permission; later local edits do
not update delivered records. Face ID/Touch ID is an optional entry gate,
not a claim of database encryption. Apple Music controls playback of content
selected in the system player, not an included music service or subscription.
Live Activity depends on device capability and iOS settings. No native service
is simulated for the browser preview.

Implementation evidence: `ios\App\App\HealthBridgePlugin.swift`,
`ios\App\App\FaceIdBridgePlugin.swift`, `www\js\music-controls.js`,
`www\js\app.js` (Health delivery/editing and Live Activity UI).

Name: AutoFit. Proposed category: Health & Fitness. Proposed initial download
price: free. Current purchases remain disabled. No "free forever" promise,
subscription, future price, paywall or telemetry has been added.

The proposed sequence is owner-approved assets, completed readiness checks,
separate authorization to submit, Apple review, then separately approved manual
public release. Free public distribution is still publication, not TestFlight.
Continue feature development and bug testing in TestFlight in parallel.
User feedback can be voluntary; a public release does not automatically provide
access to users' locally stored workout records or authorize adding analytics.

## Screenshot provenance and final-device boundary

`assets\he-*.png` and `assets\en-*.png`: 16 opaque 1290 x 2796 review compositions.
`assets\raw-*.png`: 16 untouched 1170 x 2532 captures of the actual web application.
`assets\provenance.json`: runtime, viewport, dimensions and SHA-256 for each image.

Actual UI is captured by an isolated headless Chrome profile at a separate local
origin, with synthetic records only. No production browser storage is read.
The plan screenshot shows a real locally generated proposal; it is then saved
without activation to capture the actual saved-plan interface.
No native Capacitor plugin is mocked, no microphone is requested and no native
listening, Health receipt or Live Activity is fabricated. Voice is described as
an iPhone feature in Hebrew, not shown as operating in Chrome. UI controls/content
are not restyled, removed or replaced for the captures. Only natural navigation,
manual expansion, scrolling and blur of focused controls are used.

**These are review assets, not final iPhone screenshots.** Before submission,
recapture on iPhone/simulator using the final binary and the approved synthetic
scenario, including real native voice UI if featured. The project currently
targets both iPhone and iPad (`TARGETED_DEVICE_FAMILY = "1,2"`), so an iPad
13-inch screenshot set is also required unless device support is deliberately
changed in a separately approved application update. Do not silently drop iPad.
The screenshot headline/caption layout can be reused with verified device captures.

To reproduce draft artwork (Chrome must already be installed):

```powershell
$env:CAPTURE_PROFILE = '<absolute dedicated temporary profile directory>'
node marketing\app-store\capture.cjs
node --test marketing\app-store\validate.test.cjs
```

The capture script closes its own Chrome instance. It does not use a personal
Chrome profile or require npm packages. No external fonts or stock imagery
are downloaded. `--review-only` checks the existing preview without recapturing.
Its `assets\browser-checks.json` records Hebrew/English at widths 320, 390, 768
and 1280, exact displayed description, loaded images, no horizontal overflow,
image enlargement/download identity, language switching, local-only approval
and rejection of nonpublic server paths.

## Submission decisions that remain open

| Item | Observed evidence / required action |
| --- | --- |
| Policies | `www\js\commercial-config.js` still exports `POLICY_IS_DRAFT = true`; `legal.js` and `privacy-ui.js` explicitly say draft. Finalize appropriate notices and operator details, verify practices and update the app; do not merely hide the warning or mark approved. Free distribution does not remove privacy obligations. |
| Public URLs | Privacy URL and support URL are not established in this package. A local `legal.html` is not a public URL. Real Apple reviewer contact details are also needed; no placeholder contacts were invented. |
| Privacy answers | Local fitness storage alone does not determine the store label. `www\index.html` Contact posts name/email/message to Formspree; assess its processing and Apple's optional-disclosure criteria. Apple speech processing is not guaranteed device-only. Verify SDK/privacy manifests, native backup exclusion and actual data flows. No legal/compliance certification is claimed. |
| Media rights | No external instructional video frames are used in these assets. Verify distribution rights for the existing app icon, bundled exercise imagery and any media shipped in the app before submission. |
| Age, seller, territories | Read and approve the actual App Store Connect seller, age-rating questionnaire and availability; do not infer a 4+ or 12+ label from the internal onboarding form. |
| Native assets | Replace browser-source captures and provide the required iPad set. Reconcile screenshots with the exact submitted binary and native states. |
| Publication | No Apple metadata, price, release mode, build, submission or distribution setting was changed. A subsequent build or submission requires explicit approval. |

This package is not legal advice. Store availability and acceptance are not
guaranteed by passing local asset validation.

## Copy and artwork checks

Name/subtitle: at most 30 characters. Promotional text: 170. Description:
4000 plain-text characters. Keywords: at most 100 UTF-8 bytes (not characters).
The validator checks both languages, actual PNG dimensions/RGB encoding,
checksums, eight matching images per locale, fixed order and explicit draft status.

Apple references checked on 2026-11-09:

- <https://developer.apple.com/app-store/product-page/>
- <https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/>
- <https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/>
- <https://developer.apple.com/app-store/app-privacy-details/>
- <https://developer.apple.com/app-store/review/guidelines/>
