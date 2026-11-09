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

## Owner pause and native asset review

The owner explicitly chose to **hold submission** until the minor/privacy issue
is resolved. `submissionRequest.pausedByOwner` records this decision, and the draft
writer refuses all Apple requests while it is true. Earlier creative approval is
not permission to resume. Apple's existing draft and manual-release configuration
are preserved; nothing has been sent for review or made public.

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
the stale image. The next attempt explicitly opens the dedicated device in
Xcode's Simulator application to provide its real display connection; the frame
guard remains mandatory. This is a CI capture-environment correction, not a
production audio or startup change. Native assets are still unaccepted.

Price, territories, agreements, age-rating and privacy-label answers remain
unassessed by this read-only check.

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
built app; this check applies to subsequent captures, not the already-running
capture at source `528cc0b` or TestFlight build 52.

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
