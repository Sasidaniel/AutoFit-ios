const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const app = read('www/js/app.js');
const bridge = read('www/js/native-bridge.js').replace(/^export /gm, '');

function section(start, end) {
  const from = app.indexOf(start);
  const to = app.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `Missing app section: ${start}`);
  return app.slice(from, to);
}

function bridgeContext(plugins = {}, native = true, extras = {}) {
  const context = vm.createContext({
    window: { Capacitor: { isNativePlatform: () => native, Plugins: plugins } },
    ...extras,
  });
  vm.runInContext(bridge, context);
  return context;
}

test('scene startup uses the controller that registers every custom native plugin', () => {
  const scene = read('ios/App/App/SceneDelegate.swift');
  assert.match(scene, /rootViewController\s*=\s*MainViewController\(\)/);
  assert.doesNotMatch(scene, /rootViewController\s*=\s*CAPBridgeViewController\(\)/);
  const controller = read('ios/App/App/MainViewController.swift');
  const project = read('ios/App/App.xcodeproj/project.pbxproj');
  for (const plugin of ['HealthBridge', 'CloudBridge', 'KeepAwakeBridge', 'BackgroundAnnouncer',
    'FaceIdBridge', 'NotificationsBridge', 'VoiceCommand', 'ShareBridge']) {
    assert.ok(controller.includes(`registerPluginInstance(${plugin}Plugin())`), plugin);
    assert.ok(project.includes(`${plugin}Plugin.swift in Sources`), plugin);
    assert.ok(fs.existsSync(path.join(root, 'ios/App/App', `${plugin}Plugin.swift`)), plugin);
  }
});

test('missing native plugins report a missing bridge, not a browser or successful verification', async () => {
  const context = bridgeContext();
  for (const method of ['healthRequestAuthorization', 'biometricIsAvailable',
    'notificationsRequestPermission', 'voiceRequestPermission']) {
    assert.match((await context[method]()).reason, /Native plugin missing/);
  }
  assert.equal(await context.biometricVerify(), false);
  assert.equal(await bridgeContext({}, false).biometricVerify(), true);
});

test('registered health, biometric and microphone permission calls reach native plugins', async () => {
  const calls = [];
  const context = bridgeContext({
    HealthBridge: {
      isAvailable: async () => ({ available: true }),
      requestAuthorization: async () => { calls.push('health'); return { granted: true }; },
      saveWorkout: async (data) => { calls.push(data.durationSec); return { saved: true }; },
    },
    FaceIdBridge: {
      isAvailable: async () => ({ isAvailable: true, biometryType: 'faceId' }),
      verifyIdentity: async () => { calls.push('face'); },
    },
    VoiceCommand: {
      requestPermission: async () => { calls.push('mic'); return { granted: true }; },
      startListening: async () => { calls.push('listen'); },
    },
  });
  assert.equal((await context.healthRequestAuthorization()).granted, true);
  assert.equal((await context.healthSaveWorkout({ startMillis: 123, durationSec: 60 })).saved, true);
  assert.equal((await context.biometricIsAvailable()).available, true);
  assert.equal(await context.biometricVerify(), true);
  assert.equal((await context.voiceRequestPermission()).granted, true);
  assert.equal((await context.voiceStartListening()).listening, true);
  assert.deepEqual(calls, ['health', 60, 'face', 'mic', 'listen']);
});

test('denied Health write access keeps its reason', async () => {
  const context = bridgeContext({ HealthBridge: {
    isAvailable: async () => ({ available: true }),
    requestAuthorization: async () => ({ granted: false, reason: 'write access denied' }),
  } });
  assert.equal((await context.healthRequestAuthorization()).reason, 'write access denied');
});

test('voice startup failure is not reported as listening', async () => {
  const context = bridgeContext({ VoiceCommand: {
    startListening: async () => { throw new Error('microphone unavailable'); },
  } });
  const result = await context.voiceStartListening();
  assert.equal(result.listening, false);
  assert.match(result.reason, /microphone unavailable/);
});

test('voice UI stays idle and displays native startup failure', async () => {
  const messages = [];
  const context = vm.createContext({
    native: { isNative: () => true, voiceStartListening: async () => ({
      listening: false, reason: 'permission denied',
    }) },
    document: { visibilityState: 'visible' },
    settings: { voiceCommandsEnabled: true },
    showToast: (message) => messages.push(message),
    updateVoiceBadgeForListeningState: () => {},
  });
  vm.runInContext(section('let voiceListeningActive = false;', 'function startRestTimer('), context);
  vm.runInContext("currentTab = 'workout'", context);
  await context.updateVoiceListeningState();
  assert.equal(vm.runInContext('voiceListeningActive', context), false);
  assert.match(messages[0], /permission denied/);
});

test('late voice start cannot re-enable listening after leaving the workout tab', async () => {
  let completeStart;
  const context = vm.createContext({
    native: {
      isNative: () => true,
      voiceStartListening: () => new Promise((resolve) => { completeStart = resolve; }),
      voiceStopListening: async () => true,
    },
    document: { visibilityState: 'visible' },
    settings: { voiceCommandsEnabled: true },
    showToast: () => assert.fail('Unexpected toast'),
    updateVoiceBadgeForListeningState: () => {},
  });
  vm.runInContext(section('let voiceListeningActive = false;', 'function startRestTimer('), context);
  vm.runInContext("currentTab = 'workout'", context);
  const starting = context.updateVoiceListeningState();
  vm.runInContext("currentTab = 'home'", context);
  await context.updateVoiceListeningState();
  completeStart({ listening: true });
  await starting;
  assert.equal(vm.runInContext('voiceListeningActive', context), false);
});

test('PDF generation returns real PDF bytes using the bundled library', async () => {
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
  const context = vm.createContext({
    window: { jspdf: require('../www/vendor/jspdf.umd.min.js') },
    buildWorkoutShareCanvas: () => ({ width: 100, height: 100, toDataURL: () => png }),
  });
  vm.runInContext(section('function buildWorkoutSharePdf(', '// Shares a file'), context);
  const blob = context.buildWorkoutSharePdf([]);
  assert.equal(blob.type, 'application/pdf');
  assert.ok(blob.size > 500);
  assert.match(await blob.text(), /^%PDF-/);
});

test('native sharing sends actual file bytes and filename to ShareBridge', async () => {
  let payload;
  class Reader {
    readAsDataURL() { this.result = 'data:application/pdf;base64,JVBERi0='; this.onload(); }
  }
  const context = bridgeContext({ ShareBridge: {
    shareFile: async (data) => { payload = data; return { shared: true }; },
  } }, true, { FileReader: Reader });
  const result = await context.shareFile(new Blob(['%PDF-']), 'workout.pdf');
  assert.equal(result.shared, true);
  assert.equal(payload.filename, 'workout.pdf');
  assert.equal(payload.base64, 'JVBERi0=');
  await assert.rejects(bridgeContext().shareFile(new Blob(['%PDF-']), 'workout.pdf'), /ShareBridge/);
});

function shareContext(native, navigator = {}) {
  const messages = [];
  const context = vm.createContext({
    native, navigator, File, console: { error() {} },
    showToast: (message) => messages.push(message),
  });
  vm.runInContext(section('async function shareFile(blob,', '// ---- Apple Health sync'), context);
  return { context, messages };
}

for (const extension of ['pdf', 'png']) {
  test(`native ${extension} sharing never falls back to browser download`, async () => {
    let filename;
    const { context } = shareContext({
      isNative: () => true,
      shareFile: async (_, name) => { filename = name; return { shared: true }; },
    });
    assert.equal(await context.shareFile(new Blob(['bytes']), `workout.${extension}`), true);
    assert.equal(filename, `workout.${extension}`);
  });
}

test('native share rejection is visible and does not claim a download', async () => {
  const { context, messages } = shareContext({
    isNative: () => true,
    shareFile: async () => { throw new Error('share sheet unavailable'); },
  });
  assert.equal(await context.shareFile(new Blob(['bytes']), 'workout.pdf'), false);
  assert.match(messages[0], /share sheet unavailable/);
});

test('browser cancellation is quiet, but real share errors are visible', async () => {
  for (const name of ['AbortError', 'NotAllowedError']) {
    const { context, messages } = shareContext({ isNative: () => false }, {
      canShare: () => true,
      share: async () => { const error = new Error('blocked'); error.name = name; throw error; },
    });
    assert.equal(await context.shareFile(new Blob(['bytes']), 'workout.pdf', 'application/pdf'),
      name === 'AbortError');
    assert.equal(messages.length, name === 'AbortError' ? 0 : 1);
  }
});

test('contact submission is visibly unavailable and cannot falsely claim delivery', () => {
  const html = read('www/index.html');
  assert.match(html, /id="btnSendContact"[^>]* disabled/);
  assert.match(html, /role="status">[^<]*אינה זמינה/);
  assert.match(html, /href="mailto:/);
  assert.match(html, /href="https:\/\/wa.me\//);
  assert.doesNotMatch(app, /formsubmit\.co|wireContactTab|CONTACT_EMAIL/);
});
