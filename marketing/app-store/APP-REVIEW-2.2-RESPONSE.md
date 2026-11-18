# AutoFit: guideline 2.2 correction

Prepared 2026-11-17. **Sent and independently verified 2026-11-18.**
The replacement build 53 was confirmed VALID and saved for version 1.0 before
the response was sent.
The owner explicitly approved the build-53 upload and review submission;
public release remains manual.

## English response

Hello App Review team,

Thank you for identifying the issue and providing the screenshot. We apologize
for leaving draft-only onboarding and policy wording in the previous binary.
We have corrected the application itself and are providing a replacement
binary, version 1.0, build 53, rather than a metadata-only explanation.

Changes addressing guideline 2.2:

1. Replaced the draft-only consent screen and bundled documents with versioned
   terms of use and a privacy notice describing the app's actual operation.
   The "review draft only" and pending-commercial-launch messages are removed
   in both Hebrew and English, including the privacy settings screen.
2. The app provides workout planning, manual session logging, saved plans,
   exercise instructions and history without payment, a subscription,
   an external AutoFit account or a time-limited trial.
3. Removed the parent/guardian route. This version is intended for adults 18+
   and requires an explicit adult declaration; optional exact-age choices also
   start at 18. The declaration is not represented as identity verification.
4. Corrected the dark-on-dark consent labels and explanatory text shown in your
   screenshot. The confirmation controls are readable and initially unchecked.
5. Existing workout records and plans are retained. Earlier draft consent is
   not silently converted to acceptance of the updated documents. Export and
   deletion remain available without accepting the updated terms.

The public support, privacy and terms pages now use the same document source
as the app. New sensitive-data iCloud writes and purchases remain disabled;
they are not prerequisites for using the workout features.

To review from a fresh installation: choose Hebrew or English, tap Continue,
open either document if desired, then provide the four separate confirmations.
On the next screen, body measurements and a name are optional. Continue and
skip optional system permissions to use manual workout entry. No demo login
or activation code is required. The interface supports both languages;
optional speech commands currently support Hebrew.

Please review the replacement build 53, which contains these changes; the
previous build 52 contains the outdated screen in the attachment.

Thank you.

## Delivery evidence

Apple persisted the complete 2,274-character response at
**2026-11-18T09:24:51.542Z**, message
`69410396-d83a-45fe-9110-3528dc2e5de5`. Independent messages readback found
exactly one matching reply, with SHA-256
`6526da8dcb79cbe2f65004e5593f63dc7757f72d17822f6137c03cdef4357960`.

The existing review submission was resubmitted at **2026-11-18T09:28:20.177Z**.
Fresh reads confirmed both version and submission **WAITING_FOR_REVIEW**, with
**1.0 (53)** selected and **MANUAL** release retained. This is not Apple approval
or public publication. See
[assets/apple-review-build53-receipt.json](assets/apple-review-build53-receipt.json)
for the sanitized upload, reply, compliance and queue evidence.
