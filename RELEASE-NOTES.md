# AutoFit release notes

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
