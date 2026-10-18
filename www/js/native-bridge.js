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

function unavailableReason(name) {
  return isNative() ? `Native plugin missing: ${name}. Update the app build.` : 'not-native';
}

/* ---------------- HealthKit ---------------- */
export async function healthRequestAuthorization() {
  const HealthBridge = plugin('HealthBridge');
  if (!HealthBridge) return { granted: false, reason: unavailableReason('HealthBridge') };
  try {
    const avail = await HealthBridge.isAvailable();
    if (!avail.available) return { granted: false, reason: 'unavailable' };
    const res = await HealthBridge.requestAuthorization();
    return { granted: !!res.granted, reason: res.reason };
  } catch (e) {
    return { granted: false, reason: String(e) };
  }
}

// Saves one workout directly to Apple Health, using its real start time and
// duration (not "now"), so it logs to Health on the correct day.
export async function healthSaveWorkout({ startMillis, durationSec, calories }) {
  const HealthBridge = plugin('HealthBridge');
  if (!HealthBridge) return { saved: false, reason: unavailableReason('HealthBridge') };
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
    console.error('iCloud backup write failed', e);
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

export function onCloudError(callback) {
  const cloud = plugin('CloudBridge');
  if (cloud && cloud.addListener) cloud.addListener('iCloudError', callback);
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
  try { await B.startKeepAlive(); return true; } catch (e) {
    console.error('Background audio startup failed', e);
    return false;
  }
}

export async function announce(text) {
  const announcer = plugin('BackgroundAnnouncer');
  if (!announcer) throw new Error(unavailableReason('BackgroundAnnouncer'));
  await announcer.speakNow({ text });
}

export async function beep() {
  const announcer = plugin('BackgroundAnnouncer');
  if (!announcer) throw new Error(unavailableReason('BackgroundAnnouncer'));
  await announcer.playBeep();
}

export function onAnnouncementError(callback) {
  const announcer = plugin('BackgroundAnnouncer');
  if (announcer?.addListener) announcer.addListener('announcementError', callback);
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
  try { await B.scheduleAnnouncements({ items }); return true; } catch (e) {
    console.error('Background announcement scheduling failed', e);
    return false;
  }
}

export async function bgCancelAnnouncements() {
  const B = plugin('BackgroundAnnouncer');
  if (!B) return false;
  try { await B.cancelAnnouncements(); return true; } catch (e) { return false; }
}

/* ---------------- Face ID / Touch ID ---------------- */
export async function biometricIsAvailable() {
  const FaceIdBridge = plugin('FaceIdBridge');
  if (!FaceIdBridge) return { available: false, reason: unavailableReason('FaceIdBridge') };
  try {
    const res = await FaceIdBridge.isAvailable();
    return { available: !!(res && res.isAvailable), biometryType: res && res.biometryType, errorCode: res && res.errorCode };
  } catch (e) {
    return { available: false, reason: String(e) };
  }
}

export async function biometricVerify() {
  const FaceIdBridge = plugin('FaceIdBridge');
  if (!FaceIdBridge) return !isNative();
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
  if (!N) return { granted: false, reason: unavailableReason('NotificationsBridge') };
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
  if (!V) return { granted: false, reason: unavailableReason('VoiceCommand') };
  try {
    const res = await V.requestPermission();
    return { granted: !!(res && res.granted) };
  } catch (e) {
    return { granted: false, reason: String(e) };
  }
}

export async function voiceStartListening(contextualStrings = []) {
  const V = plugin('VoiceCommand');
  if (!V) return { listening: false, reason: unavailableReason('VoiceCommand') };
  try {
    await V.startListening({ contextualStrings });
    return { listening: true };
  } catch (e) {
    return { listening: false, reason: String(e) };
  }
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

export function onVoiceError(callback) {
  const V = plugin('VoiceCommand');
  if (V && V.addListener) V.addListener('voiceError', callback);
}

/* ---------------- Lock Screen / Dynamic Island Live Activity ---------------- */
export async function syncWorkoutActivity(snapshot) {
  const activity = plugin('LiveActivityBridge');
  if (!activity) return { ok: false, reason: unavailableReason('LiveActivityBridge') };
  try {
    return { ok: true, ...await activity.sync(snapshot) };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

export function onWorkoutActivityOpen(callback) {
  const activity = plugin('LiveActivityBridge');
  if (activity && activity.addListener) activity.addListener('openWorkout', callback);
}

export function onWorkoutActivityAvailable(callback) {
  const activity = plugin('LiveActivityBridge');
  if (activity?.addListener) activity.addListener('activityAvailable', callback);
}

export async function consumeWorkoutActivityLink() {
  const activity = plugin('LiveActivityBridge');
  if (!activity) return false;
  try {
    return !!(await activity.consumeWorkoutLink()).requested;
  } catch (e) {
    console.error('Cannot read workout Live Activity link', e);
    return false;
  }
}

/* ---------------- Native file sharing ---------------- */
export async function shareFile(blob, filename) {
  return shareFiles([{ blob, filename }]);
}

export async function shareFiles(files) {
  const S = plugin('ShareBridge');
  if (!S) throw new Error(unavailableReason('ShareBridge'));
  const encoded = [];
  for (const { blob, filename } of files) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error('Cannot read share file'));
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.readAsDataURL(blob);
    });
    encoded.push({ base64, filename });
  }
  return S.shareFiles({ files: encoded });
}
