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

/* ---------------- Face ID / Touch ID ---------------- */
export async function biometricIsAvailable() {
  const NativeBiometric = plugin('NativeBiometric');
  if (!NativeBiometric) return { available: false, reason: 'not-native' };
  try {
    const res = await NativeBiometric.isAvailable();
    return { available: !!(res && res.isAvailable), biometryType: res && res.biometryType, errorCode: res && res.errorCode };
  } catch (e) {
    return { available: false, reason: String(e) };
  }
}

export async function biometricVerify() {
  const NativeBiometric = plugin('NativeBiometric');
  if (!NativeBiometric) return true; // no biometric plugin (web) — don't block access
  try {
    await NativeBiometric.verifyIdentity({
      reason: 'פתיחת AutoFit',
      title: 'אימות',
      subtitle: '',
      description: '',
    });
    return true;
  } catch (e) {
    return false;
  }
}
