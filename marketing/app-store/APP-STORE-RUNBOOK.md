# AutoFit App Store runbook: the verified submission path

Read this before repeating App Store work. This is the operational handover,
not authorization to release another version. The historical investigation is in
[README.md](README.md); current recorded facts are in
[listing.json](listing.json).

## 1. Start here: do not repeat completed work

On **2026-11-09 at 14:25:55.992Z**, Apple accepted **1.0 (52)** for review.
Fresh reads at 14:26:20.673Z verified both the version and the existing review
submission as `WAITING_FOR_REVIEW`, with `MANUAL` release.
The owner also reported receiving Apple's submission-received email.

- Permanent evidence: [assets/apple-review-receipt.json](assets/apple-review-receipt.json).
- Screenshot evidence: [assets/apple-screenshots-receipt.json](assets/apple-screenshots-receipt.json).
- Complete handover archive: `assets\approval-package.zip`.
- Source of the submitted binary: `93bce49bf3f5aed3d9daf023d3ff31673e9f9035`.
- Public-notice implementation: `2eb85ff`; submission handover: `11c623c`.
- Last completed full regression suite: **833 passed**.

These are historical receipts, not live status. Read Apple afresh before any
future action. Do not recapture screenshots, reupload assets, resubmit the same
queued version, or upload a binary just to check its status.

| Resource | Confirmed identifier |
|---|---|
| App / bundle | `6820408299` / `com.sasidaniel.autofit` |
| Version 1.0 | `bd117cfb-bd2b-4874-9baf-92a0e4ede4cc` |
| Existing build 52 | `8848fbbb-477b-4fc0-b40a-94a5b61920f2` |
| App information | `7a445717-79ed-48f3-83df-05c6aece83fe` |
| Reused review submission | `da769c03-e86d-4556-8c79-a8cb0d237a51` |

These identifiers belong to this submission. Resolve and verify identities again
for another version; the existing helpers are intentionally scoped to build 52,
not a generic future-version release system.

## 2. On Apple's next response

1. Read the actual message and live App Store Connect status. Distinguish an
   Actions failure email from an Apple App Review decision.
2. `WAITING_FOR_REVIEW` / `IN_REVIEW`: wait; do not restart delivery.
3. If rejected, read the specific App Review message before changing anything.
   Fix only the actual issue; metadata changes do not always require a binary.
4. If approved and pending developer release, obtain explicit owner publication
   approval before performing manual release.
5. After release, verify actual store availability. Approval, release requested,
   and publicly available are different states.

Apple's submission receipt estimated up to 48 hours and an email on completion;
this is not a guaranteed review time. Do not promise approval or public availability.

The owner declined preparing/uploading build 53. Do not interpret authorization
to submit build 52, fix metadata, or document the process as permission for a
new binary, TestFlight upload, release workflow, or public publication.
Do not accept developer agreements on the owner's behalf.

## 3. Reliable preflight and local tools

Work only in the session worktree. Preserve unrelated edits; in particular, do
not stage or revert unrelated changes in `PRE-RELEASE-REVIEW.md`.
Verify the GitHub identity before repository operations:

```powershell
gh api user --jq .login
git --no-pager status --short
```

Use the project's authorized account; do not assume an ambient token belongs
to this project. Never print or commit credentials, private review contact
details, signed upload URLs, request authorization headers or API keys.
Apple API signing credentials remain in Actions secrets.

Useful local commands, from the repository root:

```powershell
node --test tests\app-store-readiness.test.cjs tests\app-store-draft.test.cjs tests\app-store-submission.test.cjs tests\app-store-screenshot-upload.test.cjs marketing\app-store\validate.test.cjs
npm test
node marketing\app-store\serve.cjs
```

The preview server binds only to `127.0.0.1`, default port **8970**. Reuse an
existing responsive server rather than start another. A cache-busting query
helped when the browser showed stale DOM after navigation, even with no-store
headers. Wait for the new page content, not merely navigation acceptance.
The preview records creative feedback only; it cannot release the app.

## 4. Existing automation: choose exactly one operation

Workflow: `.github\workflows\ios-testflight-status.yml`.
Do not dispatch it merely to rediscover information already preserved here.
It has mutually exclusive operation flags, a 20-minute job limit and serialized
same-build writes. `build_number` identifies an existing build, not a new binary.

| Flag | Operation |
|---|---|
| `inspect_app_store=true` | Read-only Apple metadata inspection |
| `prepare_store_draft=true` | Approved draft copy and manual release setting |
| `upload_store_screenshots=true` | Verified screenshot artwork only |
| `submit_store_review=true` | Existing authorized version into App Review |
| No operation flag | Existing internal TestFlight verification, not App Store inspection |

Relevant implementations:
`.github\scripts\app-store-readiness.cjs`,
`prepare-app-store-draft.cjs`, `upload-app-store-screenshots.cjs`,
`submit-app-store-review.cjs`.
Draft preparation deliberately refuses an already confirmed submission.
Do not weaken approval, identity, manual-release or editable-state guards.

The `app-store-readiness` Actions artifact preserves sanitized readiness,
draft, screenshot and review reports. Hosted artifacts expire after 14 days:
permanent receipts in this repository are the durable evidence.

## 5. Screenshot delivery: already finished

Accepted originals came from **two different capture runs**, not one successful
32-image run:

- iPhone: [42611518422](https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42611518422).
- iPad: [42623335643](https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42623335643).
- Completed upload/readback: [42629838965](https://github.com/Sasidaniel/AutoFit-ios/actions/runs/42629838965).

`assets\native\provenance.json` preserves the originals' provenance.
`assets\native-compositions.json` links the **32 final opaque RGB PNGs** to those
originals: 1320 x 2868 iPhone and 2064 x 2752 iPad.
Four groups contain eight images each, in exact verified order:
Hebrew/iPhone, Hebrew/iPad, en-US/iPhone, en-US/iPad.
They use synthetic demonstration records and do not simulate native listening.

Lessons already implemented and covered by regressions:

| Failure | Correct behavior |
|---|---|
| Assuming catalog platform `IOS` | Use `IPHONE_APP_STORE` / `IPAD_APP_STORE` for their actual catalog groups |
| Treating one minute of processing as rejection | Commit all 32 transfers first; bounded polling permits 240 x 1.5 seconds per image |
| Accepting only documented placement state | Both live `ACTIVE` and documented `PARENT_PREPARE_FOR_SUBMISSION` can be ready |
| Counting two API representations as separate images | Legacy `COMPLETE` and modern `ACTIVE` can mirror the same screenshots; do not sum them |
| Retrying uploads from scratch | Reuse immutable hash-named assets and existing placements; reject unrelated contents |
| Trusting a green transfer alone | Verify exact image IDs/order, dimensions/specification, four groups and manual parent state |
| Nested asynchronous `test()` passing locally | Use independent top-level tests; CI Node 22 exposed cancellation that local Node 24 did not |

Do not remove the uploader's exact byte-range/header/domain guards. Apple upload
PUTs use Apple's supplied headers, never the API JWT. Do not send legacy
`sourceFileChecksum` to the modern asset endpoint. The sanitizer must not persist
upload operations or signed URLs.

## 6. Public support/privacy hosting: already live

Base: <https://sasidaniel.github.io/AutoFit-ios/>.
The four verified URLs are:

| Locale | Support | Privacy |
|---|---|---|
| he | [support.html](https://sasidaniel.github.io/AutoFit-ios/support.html) | [privacy.html](https://sasidaniel.github.io/AutoFit-ios/privacy.html) |
| en-US | [support-en.html](https://sasidaniel.github.io/AutoFit-ios/support-en.html) | [privacy-en.html](https://sasidaniel.github.io/AutoFit-ios/privacy-en.html) |

Each returned HTTPS 200 and exact generated source content; both Apple locales
were saved and read back. Pages contains no AutoFit scripts, analytics or forms.
GitHub hosting can still maintain server request logs.

GitHub Pages was configured from the **`docs` folder of
`sasi-daniel-sndk-personal-training-upgrade`**, with HTTPS enforced.
**Do not delete that branch without first moving Pages to a preserved source and
verifying every public URL.** A merge alone does not retarget Pages.

```powershell
node marketing\app-store\support-site.cjs --build52-notice --output docs
```

This generator is deliberately scoped to the existing build-52 factual notice.
It is not automatic policy approval for later builds. The original exporter
still refuses unapproved draft policies; `--review-only` is local review only.
Do not flip runtime approval flags to bypass that guard.

## 7. Declarations that actually succeeded

- **Privacy:** published Name, Email Address, Customer Support and Other Data
  Types; App Functionality; linked to the user; not used for tracking.
  These describe optional Formspree name/email/message submissions and provider
  request logs. Do not reuse the answer blindly after behavior/provider changes.
- **Apple processing:** Apple's guidance states device-only processing is not
  developer collection and developers need not disclose data collected by Apple.
  Speech can use Apple services; do not falsely promise always-on-device speech.
- **Content rights:** the owner explicitly confirmed rights to all included
  exercise images and the gold app icon. Only then was the necessary-rights
  answer saved. This is owner attestation, not independently proved provenance.
  Earlier "most was generated" was insufficient; never infer rights from a
  visually similar Creative Commons example.
- **Medical device:** saved No for this general-fitness planning/logging app,
  not diagnosis or disease treatment; verified after fresh reload. Reassess
  if intended functionality changes.
- **Age/territories:** saved 18+ override, with Apple's 19+ Korea and legacy
  17+ pre-OS-26 mappings. Exactly the EU27 are excluded; 148 territories remain.
  UK and Norway remain included. Future-territory automatic inclusion is off.
- **Agreement:** the owner accepted the updated developer agreement; the pending
  banner disappeared on a fresh read. Do not request acceptance again without
  a new live requirement.
- **Other fields:** Health & Fitness, free pricing, copyright, bilingual copy,
  review contact, no required demo login and existing build 52 were completed.
  Private review contact values are not part of this package.

Build 52 still has draft in-app document wording and the unverified guardian flow
for ages 12-17. Public notices disclose this; a store rating is not an enforced
adult-only gate. Queue acceptance is not approval of these details or a global
legal-compliance finding. Any actual binary fix requires fresh upload approval.

## 8. Browser path that completed the real submission

Use an authenticated App Store Connect session for this app. The successful
session was the `app-store-connect-account` browser panel. New panels did not
reliably inherit authentication. Browser refs become stale after modal/step
changes: inspect the current page before clicking.

1. Open App Privacy. Complete all four data-type purpose/identity/tracking
   questionnaires, then **Publish** and verify `published: true`.
2. Save both privacy URLs in app-info localizations and both support URLs in
   version localizations. Reload/read back actual saved values.
3. Save medical and owner-confirmed content-rights declarations in App Information;
   verify them again after reload, not only in the unsaved form.
4. Open [the version page](https://appstoreconnect.apple.com/apps/6820408299/distribution/ios/version/inflight).
   Verify app/version/build identity and **Manually release this version**.
5. **Add for Review** opens a draft choice. Select the **existing draft**,
   not Create New Submission. This changed the version to `READY_FOR_REVIEW`.
6. In that draft, verify **Item Ready to Submit** and **1.0 (52)**,
   then **Submit for Review**. Apple displayed **1 Item Submitted**.
7. Fresh independent reads verified the version AND review submission
   `WAITING_FOR_REVIEW`, with `MANUAL` release. Save the sanitized receipt
   before announcing success.

The privacy-URL editor kept Save disabled despite valid changed inputs.
The successful fallback was same-origin authenticated PATCH of the actual
localization resources discovered through the page's observed app-info/version
GET responses and returned `links.self`; only the URL attribute was changed.
Each HTTP 200 response was checked, then independently read back.
This did not involve overriding disabled controls, changing app state guards,
guessing private endpoints, extracting authentication, or weakening permissions.
If needed again, re-discover live resources, assert same origin, exact app/version
and locale set, and editable/manual state before writes. Do not replay old IDs
or persist session cookies/headers. Never dump a complete review-contact response.

## 9. Preserve the next successful outcome

Update the receipt, `listing.json`, the README current-state section and bilingual
preview together. Keep historical failure records explicitly historical rather
than treating them as current blockers. Do not rewrite the screenshot receipt
to imply its upload run also submitted the app.

The archive now includes this runbook alongside 97 PNGs, provenance, both receipts,
listing, README, six local draft-review pages and six published-site files.
When updating it on Windows, load both `System.IO.Compression` and
`System.IO.Compression.FileSystem`, update a specifically named temporary ZIP,
verify counts and changed-entry hashes, close it, then replace the canonical ZIP.
Legacy entries can use backslashes while newer entries use forward slashes:
normalize names when checking existence; do not create duplicate slash variants.
Do not recapture media or rewrite the archive merely to check review status.

Save changes on the session branch and keep unrelated edits out of commits.
Do not merge/push main or trigger mobile delivery as part of this documentation.
If technical behavior changes, run targeted regressions; documentation-only
updates do not require another binary build or Apple workflow.

## References

- [Apple privacy definitions](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple medical-device declaration](https://developer.apple.com/help/app-store-connect/manage-app-information/declare-regulated-medical-device-status)
- [Formspree privacy](https://formspree.io/legal/privacy-policy/)
- [GitHub hosting privacy](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)
