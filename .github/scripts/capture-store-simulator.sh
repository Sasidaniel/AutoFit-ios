#!/bin/bash
set -euo pipefail

if [[ "${CI:-}" != "true" || "$(uname)" != "Darwin" ]]; then
  echo "Native store capture requires the isolated macOS Actions runner." >&2
  exit 1
fi
OUTPUT="$RUNNER_TEMP/native-store-captures"
STATE="$RUNNER_TEMP/native-store-control"
mkdir -p "$OUTPUT" "$STATE"
export CAPTURE_NATIVE=1 CAPTURE_NATIVE_STATE="$STATE"
node -e 'require("fs").writeFileSync(process.env.CAPTURE_NATIVE_STATE+"/control.json",JSON.stringify({id:0,screen:"workout",language:"he"}))'
node marketing/app-store/serve.cjs > "$OUTPUT/server.log" 2>&1 &
SERVER_PID=$!
DEVICE_IDS=()
cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
  for id in "${DEVICE_IDS[@]}"; do xcrun simctl shutdown "$id" 2>/dev/null || true; done
}
trap cleanup EXIT
for attempt in {1..30}; do
  if curl --fail --silent http://127.0.0.1:8970/listing.json > /dev/null; then break; fi
  sleep 1
done
curl --fail --silent http://127.0.0.1:8970/listing.json > /dev/null

python3 - <<'PY'
import plistlib
path = 'ios/App/App/Info.plist'
with open(path, 'rb') as f:
    data = plistlib.load(f)
ats = data.setdefault('NSAppTransportSecurity', {})
ats['NSAllowsLocalNetworking'] = True
ats['NSAllowsArbitraryLoadsInWebContent'] = True
with open(path, 'wb') as f:
    plistlib.dump(data, f)
PY
xcodebuild build -project ios/App/App.xcodeproj -scheme App \
  -configuration Debug -destination 'generic/platform=iOS Simulator' \
  -packageCachePath "$RUNNER_TEMP/swift-package-cache" \
  -clonedSourcePackagesDirPath "$RUNNER_TEMP/source-packages" \
  -derivedDataPath "$RUNNER_TEMP/StoreSimulator" CODE_SIGNING_ALLOWED=NO \
  > "$OUTPUT/build.log" 2>&1 || { tail -n 100 "$OUTPUT/build.log"; exit 1; }
APP="$RUNNER_TEMP/StoreSimulator/Build/Products/Debug-iphonesimulator/App.app"
test -d "$APP"
xcrun simctl list runtimes -j > "$STATE/runtimes.json"
xcrun simctl list devicetypes -j > "$STATE/types.json"
RUNTIME=$(node -e 'const r=require(process.env.CAPTURE_NATIVE_STATE+"/runtimes.json").runtimes.filter(x=>x.isAvailable&&x.identifier.includes(".iOS-")).sort((a,b)=>a.version.localeCompare(b.version,undefined,{numeric:true})).at(-1);if(!r)throw Error("No iOS runtime");console.log(r.identifier)')
COMMAND_ID=0
for FAMILY in iphone ipad; do
  TYPE=$(FAMILY="$FAMILY" node -e 'const a=require(process.env.CAPTURE_NATIVE_STATE+"/types.json").devicetypes;const pattern=process.env.FAMILY==="iphone"?/^iPhone 17 Pro Max$/:/^iPad Pro 13-inch/;const d=a.filter(x=>pattern.test(x.name)).at(-1);if(!d)throw Error("Required screenshot device unavailable");console.log(d.identifier)')
  UDID=$(xcrun simctl create "AutoFit Store $FAMILY" "$TYPE" "$RUNTIME")
  DEVICE_IDS+=("$UDID")
  xcrun simctl boot "$UDID"
  xcrun simctl bootstatus "$UDID" -b
  xcrun simctl status_bar "$UDID" override --time '9:41' --dataNetwork wifi --wifiMode active --wifiBars 3 --batteryState charged --batteryLevel 100
  for LANGUAGE in he en; do
    APP="$APP" node -e 'const fs=require("fs"),p=process.env.APP+"/capacitor.config.json",c=JSON.parse(fs.readFileSync(p,"utf8"));c.server={url:"http://127.0.0.1:8970",cleartext:true,allowNavigation:["127.0.0.1"]};fs.writeFileSync(p,JSON.stringify(c))'
    xcrun simctl install "$UDID" "$APP"
    COMMAND_ID=$((COMMAND_ID+1))
    ID="$COMMAND_ID" LANGUAGE="$LANGUAGE" node -e 'const fs=require("fs"),p=process.env.CAPTURE_NATIVE_STATE+"/control.json";fs.writeFileSync(p+".next",JSON.stringify({id:Number(process.env.ID),screen:"workout",language:process.env.LANGUAGE}));fs.renameSync(p+".next",p)'
    xcrun simctl launch "$UDID" com.sasidaniel.autofit
    for SCREEN in workout sets plans saved statistics history cardio library; do
      if [[ "$SCREEN" != "workout" ]]; then
        COMMAND_ID=$((COMMAND_ID+1))
        ID="$COMMAND_ID" LANGUAGE="$LANGUAGE" SCREEN="$SCREEN" node -e 'const fs=require("fs"),p=process.env.CAPTURE_NATIVE_STATE+"/control.json";fs.writeFileSync(p+".next",JSON.stringify({id:Number(process.env.ID),screen:process.env.SCREEN,language:process.env.LANGUAGE}));fs.renameSync(p+".next",p)'
      fi
      READY=false
      for attempt in {1..120}; do
        if [[ -f "$STATE/error.json" ]]; then cat "$STATE/error.json" >&2; exit 1; fi
        if ID="$COMMAND_ID" node -e 'const fs=require("fs"),p=process.env.CAPTURE_NATIVE_STATE+"/ready.json";if(!fs.existsSync(p))process.exit(1);const r=JSON.parse(fs.readFileSync(p));process.exit(r.id===Number(process.env.ID)&&r.nativeBridgeVerified===true?0:1)'; then READY=true; break; fi
        sleep 1
      done
      if [[ "$READY" != "true" ]]; then
        xcrun simctl io "$UDID" screenshot "$OUTPUT/failure-$FAMILY-$LANGUAGE-$SCREEN.png"
        echo "Native capture did not become ready: $FAMILY/$LANGUAGE/$SCREEN" >&2
        exit 1
      fi
      sleep 1
      xcrun simctl io "$UDID" screenshot --type=png "$OUTPUT/$FAMILY-$LANGUAGE-$SCREEN.png"
    done
    xcrun simctl terminate "$UDID" com.sasidaniel.autofit
    xcrun simctl uninstall "$UDID" com.sasidaniel.autofit
  done
  xcrun simctl shutdown "$UDID"
done
OUTPUT="$OUTPUT" RUNTIME="$RUNTIME" node - <<'JS'
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const files=fs.readdirSync(process.env.OUTPUT).filter(n=>/^(iphone|ipad)-(he|en)-/.test(n)&&n.endsWith('.png'));
if(files.length!==32)throw Error('Missing native device captures');
const records=files.map(file=>{const b=fs.readFileSync(path.join(process.env.OUTPUT,file));return{file,width:b.readUInt32BE(16),height:b.readUInt32BE(20),sha256:crypto.createHash('sha256').update(b).digest('hex')}});
fs.writeFileSync(path.join(process.env.OUTPUT,'provenance.json'),JSON.stringify({
capturedAt:new Date().toISOString(),source:process.env.GITHUB_SHA,runtime:process.env.RUNTIME,
actualCapacitorSimulatorApp:true,syntheticData:true,nativeVoiceSimulated:false,
buildConfiguration:'Debug; CI-only loopback server and transport settings; unchanged application UI',
finalSubmissionAssets:false,records},null,2));
JS
