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
</dict></plist>
PLIST
codesign --force --sign - "$APP"
read -r DEVICE STATE < <(xcrun simctl list devices available --json | python3 -c 'import json,sys; devices=json.load(sys.stdin)["devices"]; d=next(d for runtime,items in devices.items() if "iOS" in runtime for d in items if d["name"].startswith("iPhone")); print(d["udid"],d["state"])')
if [[ "$STATE" != "Booted" ]]; then xcrun simctl boot "$DEVICE"; fi
xcrun simctl bootstatus "$DEVICE" -b
xcrun simctl install "$DEVICE" "$APP"
xcrun simctl launch --console --terminate-running-process "$DEVICE" com.autofit.layoutchecks > "$RUNNER_TEMP/widget-layout.log" 2>&1
cat "$RUNNER_TEMP/widget-layout.log"
grep -q 'LAYOUT_CHECKS_PASSED' "$RUNNER_TEMP/widget-layout.log"
