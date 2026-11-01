#!/bin/bash
set -euo pipefail

APP="$RUNNER_TEMP/WidgetLayoutChecks.app"
SOURCE="$RUNNER_TEMP/WidgetLayoutChecks.swift"
mkdir -p "$APP"
# Compile the actual production views, not a duplicate layout model.
awk '/^@available\(iOS 18.0, \*\)/ {exit} {print}' ios/App/AutoFitLiveActivity/AutoFitLiveActivity.swift > "$SOURCE"
cat tests/WidgetLayoutTests.swift >> "$SOURCE"
SDK="$(xcrun --sdk iphonesimulator --show-sdk-path)"
xcrun swiftc -parse-as-library -sdk "$SDK" -target "$(uname -m)-apple-ios18.0-simulator" \
  ios/App/App/WorkoutActivityAttributes.swift "$SOURCE" -o "$APP/WidgetLayoutChecks"
cat > "$APP/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>com.autofit.layoutchecks</string>
<key>CFBundleExecutable</key><string>WidgetLayoutChecks</string>
<key>CFBundleName</key><string>WidgetLayoutChecks</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleVersion</key><string>1</string>
<key>CFBundleShortVersionString</key><string>1.0</string>
<key>MinimumOSVersion</key><string>18.0</string>
<key>LSRequiresIPhoneOS</key><true/>
<key>UIDeviceFamily</key><array><integer>1</integer></array>
<key>UILaunchScreen</key><dict/>
<key>UIApplicationSceneManifest</key><dict>
<key>UIApplicationSupportsMultipleScenes</key><false/>
<key>UISceneConfigurations</key><dict/>
</dict>
</dict></plist>
PLIST
codesign --force --sign - "$APP"
read -r DEVICE STATE < <(xcrun simctl list devices available --json | python3 -c 'import json,sys; devices=json.load(sys.stdin)["devices"]; d=next(d for runtime,items in devices.items() if "iOS" in runtime for d in items if d["name"].startswith("iPhone")); print(d["udid"],d["state"])')
if [[ "$STATE" != "Booted" ]]; then xcrun simctl boot "$DEVICE"; fi
xcrun simctl bootstatus "$DEVICE" -b
xcrun simctl install "$DEVICE" "$APP"
CONTAINER="$(xcrun simctl get_app_container "$DEVICE" com.autofit.layoutchecks data)"
RESULT="$CONTAINER/Documents/layout-result.txt"
preserve_results() {
  for FILE in "$RESULT" "$CONTAINER/Documents/layout-measurements.txt"; do
    if [[ -f "$FILE" ]]; then cp "$FILE" "$RUNNER_TEMP/"; fi
  done
  shopt -s nullglob
  for FILE in "$CONTAINER"/Documents/widget-layout*.png; do
    cp "$FILE" "$RUNNER_TEMP/"
  done
}
trap preserve_results EXIT
rm -f "$RESULT" "$CONTAINER/Documents/layout-measurements.txt"
xcrun simctl launch --terminate-running-process "$DEVICE" com.autofit.layoutchecks
for ((attempt=0; attempt<150; attempt++)); do
  if [[ -f "$RESULT" ]]; then
    if grep -q 'LAYOUT_CHECKS_PASSED' "$RESULT"; then
      cat "$RESULT"
      exit 0
    fi
    if grep -q 'LAYOUT_FAILED' "$RESULT"; then
      cat "$RESULT"
      exit 1
    fi
  fi
  sleep 2
done
echo "Widget layout app did not produce a completion receipt"
if [[ -f "$RESULT" ]]; then cat "$RESULT"; fi
xcrun simctl spawn "$DEVICE" log show --style compact --last 6m \
  --predicate 'process == "WidgetLayoutChecks" OR (process == "SpringBoard" AND eventMessage CONTAINS "com.autofit.layoutchecks")' \
  > "$RUNNER_TEMP/widget-layout.log"
tail -n 60 "$RUNNER_TEMP/widget-layout.log"
exit 1
