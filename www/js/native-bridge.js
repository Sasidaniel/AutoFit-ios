// native-bridge.js — thin wrapper around Capacitor native plugins (HealthKit,
// iCloud key-value sync, Face ID). All functions are safe no-ops when running
// in a plain browser/PWA (no window.Capacitor), so the same app.js code works
// both on the web and in the native iOS app.

export function isNative() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

function plugin(name) {
  return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins[name];
}

/* ---------------- HealthKit ---------------- */
export async function healthRequestAuthorization() {
  const HealthBridge = plugin('HealthBridge');
  if (!HealthBridge) return { granted: false, reason: 'not-native' };
  try {
    const avail = await HealthBridge.isAvailable();
    if (!avail.available) return { granted: false, reason: 'unavailable' };
    const res = await HealthBridge.requestAuthorization();
    return { granted: !!res.granted };
  } catch (e) {
    return { granted: false, reason: String(e) };
  }
}

// Saves one workout directly to Apple Health, using its real start time and
// duration (not "now"), so it logs to Health on the correct day.
export async function healthSaveWorkout({ startMillis, durationSec, calories }) {
  const HealthBridge = plugin('HealthBridge');
  if (!HealthBridge) return { saved: false, reason: 'not-native' };
  try {
    const res = await HealthBridge.saveWorkout({ startMillis, durationSec, calories: calories || 0 });
    return { saved: !!res.saved };
  } catch (e) {
    return { saved: false, reason: String(e) };
  }
}

/* ---------------- iCloud key-value sync ---------------- */
export async function cloudSetItem(key, value) {
  const CloudBridge = plugin('CloudBridge');
  if (!CloudBridge) return false;
  try {
    await CloudBridge.setItem({ key, value });
    return true;
  } catch (e) {
    return false;
  }
}

export async function cloudGetItem(key) {
  const CloudBridge = plugin('CloudBridge');
  if (!CloudBridge) return null;
  try {
    const res = await CloudBridge.getItem({ key });
    return res.value === null || res.value === undefined ? null : res.value;
  } catch (e) {
    return null;
  }
}

export async function cloudGetAll() {
  const CloudBridge = plugin('CloudBridge');
  if (!CloudBridge) return {};
  try {
    const res = await CloudBridge.getAll();
    return res.values || {};
  } catch (e) {
    return {};
  }
}

export function onCloudChanged(callback) {
  const CloudBridge = plugin('CloudBridge');
  if (!CloudBridge || !CloudBridge.addListener) return;
  CloudBridge.addListener('iCloudChanged', callback);
}

/* ---------------- Keep screen awake ---------------- */
export async function keepAwakeEnable() {
  const KeepAwakeBridge = plugin('KeepAwakeBridge');
  if (!KeepAwakeBridge) return false;
  try { await KeepAwakeBridge.enable(); return true; } catch (e) { return false; }
}

export async function keepAwakeDisable() {
  const KeepAwakeBridge = plugin('KeepAwakeBridge');
  if (!KeepAwakeBridge) return false;
  try { await KeepAwakeBridge.disable(); return true; } catch (e) { return false; }
}

/* ---------------- Background voice announcements (while app is minimized) ----------------
   WKWebView JS timers are unreliable once the app is backgrounded, so active rest/hold
   timers hand off their remaining announcements to native code right before backgrounding,
   and the native side cancels them again once the app returns to the foreground (so the
   web page's own speech calls take back over without double-announcing). */
export async function bgStartKeepAlive() {
  const B = plugin('BackgroundAnnouncer');
  if (!B) return false;
  try { await B.startKeepAlive(); return true; } catch (e) { return false; }
}

export async function bgStopKeepAlive() {
  const B = plugin('BackgroundAnnouncer');
  if (!B) return false;
  try { await B.stopKeepAlive(); return true; } catch (e) { return false; }
}

// items: [{ delaySeconds, text }]
export async function bgScheduleAnnouncements(items) {
  const B = plugin('BackgroundAnnouncer');
  if (!B || !items || !items.length) return false;
  try { await B.scheduleAnnouncements({ items }); return true; } catch (e) { return false; }
}

export async function bgCancelAnnouncements() {
  const B = plugin('BackgroundAnnouncer');
  if (!B) return false;
  try { await B.cancelAnnouncements(); return true; } catch (e) { return false; }
}

/* ---------------- Face ID / Touch ID ---------------- */
export async function biometricIsAvailable() {
  const FaceIdBridge = plugin('FaceIdBridge');
  if (!FaceIdBridge) return { available: false, reason: 'not-native' };
  try {
    const res = await FaceIdBridge.isAvailable();
    return { available: !!(res && res.isAvailable), biometryType: res && res.biometryType, errorCode: res && res.errorCode };
  } catch (e) {
    return { available: false, reason: String(e) };
  }
}

export async function biometricVerify() {
  const FaceIdBridge = plugin('FaceIdBridge');
  if (!FaceIdBridge) return true; // no biometric plugin (web) — don't block access
  try {
    await FaceIdBridge.verifyIdentity({ reason: 'פתיחת AutoFit' });
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------------- Local notifications ---------------- */
export async function notificationsRequestPermission() {
  const N = plugin('NotificationsBridge');
  if (!N) return { granted: false, reason: 'not-native' };
  try {
    const res = await N.requestPermission();
    return { granted: !!(res && res.granted) };
  } catch (e) {
    return { granted: false, reason: String(e) };
  }
}

export async function notificationsIsGranted() {
  const N = plugin('NotificationsBridge');
  if (!N) return false;
  try {
    const res = await N.isGranted();
    return !!(res && res.granted);
  } catch (e) {
    return false;
  }
}

// Shows a real OS local notification (works even while backgrounded), e.g. for a
// finished rest timer — delaySeconds optional, defaults to immediate.
export async function notificationsShow(title, body, delaySeconds) {
  const N = plugin('NotificationsBridge');
  if (!N) return false;
  try {
    await N.show({ title, body, delaySeconds: delaySeconds || 0 });
    return true;
  } catch (e) {
    return false;
  }
}

/* ---------------- Voice commands (hands-free during a workout) ----------------
   An additional input method, not a replacement for manual taps: recognized
   phrases ("set finished", "skip rest", "next exercise", "undo") trigger the
   exact same actions a tap would. Safe no-op on web/no-plugin. */
export async function voiceRequestPermission() {
  const V = plugin('VoiceCommand');
  if (!V) return { granted: false, reason: 'not-native' };
  try {
    const res = await V.requestPermission();
    return { granted: !!(res && res.granted) };
  } catch (e) {
    return { granted: false, reason: String(e) };
  }
}

export async function voiceStartListening() {
  const V = plugin('VoiceCommand');
  if (!V) return false;
  try { await V.startListening(); return true; } catch (e) { return false; }
}

export async function voiceStopListening() {
  const V = plugin('VoiceCommand');
  if (!V) return false;
  try { await V.stopListening(); return true; } catch (e) { return false; }
}

// callback receives { transcript } (raw recognized Hebrew phrase) — app.js does
// all keyword/number matching and dispatch from there.
export function onVoiceTranscript(callback) {
  const V = plugin('VoiceCommand');
  if (!V || !V.addListener) return;
  V.addListener('voiceTranscript', callback);
}
