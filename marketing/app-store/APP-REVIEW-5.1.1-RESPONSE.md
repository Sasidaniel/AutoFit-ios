# AutoFit: guideline 5.1.1(iv) correction

Prepared 2026-11-22. **Sent and independently verified 2026-11-22.** Replacement
version 1.0 build 54 was confirmed VALID, its signed IPA was inspected, and the
exact build was saved in App Store Connect before sending.
The owner approved this build's upload and resubmission after validation;
public release remains manual.

## English response

Hello App Review team,

Thank you for the specific guidance regarding the permission screen in
version 1.0 (53). We corrected the application itself in replacement build 54.

We removed the entire optional-permission screen from initial setup, including
its custom "Allow" buttons and "Finish and begin" action. Setup now proceeds
from language selection, legal consent and optional personal details directly
into the working app. It does not request microphone, speech recognition,
HealthKit, notification or Face ID access during initial setup.

These permissions are not required for manual workout planning, logging,
exercise guidance or history. New installations have voice commands and
biometric locking off by default. Existing users' saved choices and workout
records are retained.

Access is requested when the user chooses the relevant feature or its settings
action. Those actions call the native system request directly; there is no
separate dismissible onboarding pre-alert. Permission-request buttons in
settings, including Apple Music, use neutral "Continue to ... permission
request" wording in Hebrew and English. The iOS system sheet is where users
grant or deny permission.

If microphone or speech access is refused, recording does not start and manual
workout entry remains available. If Health write access is refused, the workout
remains saved locally and can be retried later by the user. Settings provides
permission-status information and an action to open the system Settings app.

Fresh-install review steps: choose Hebrew or English, review and confirm the
legal documents, choose the profile wording and continue; name, exact age and
body measurements are optional. You will enter the app without a permission
pre-alert. Open a manual workout, or choose the voice/Health feature separately
to review its native authorization flow. No demo login, payment or activation
code is required.

Please review build 54 rather than build 53. Thank you.

## Delivery evidence

Apple persisted the complete 1,973-character response at
**2026-11-22T07:48:47.813Z**, message
`bf3ea32b-7507-4339-b9c6-3e0201534849`. Independent readback found exactly one
matching reply, with SHA-256
`5b8d58b0f4558ec4d09e3696e9a3241742145e8eafd142148a446fb056bd585f`.

The existing submission accepted replacement **1.0 (54)** at
**2026-11-22T07:49:22.978Z**. Fresh server reads confirmed both version and
submission **WAITING_FOR_REVIEW**, with **MANUAL** release retained.
[assets/apple-review-build54-receipt.json](assets/apple-review-build54-receipt.json)
preserves the upload, packaged-source checks, reply and queue evidence.
Submission is not Apple approval or public publication.
