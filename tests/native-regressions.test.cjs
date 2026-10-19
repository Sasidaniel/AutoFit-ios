const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const nodeVM = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const app = read('www/js/app.js');
const bridge = read('www/js/native-bridge.js').replace(/^export /gm, '');
function localizationContext(extras = {}) {
  const context = nodeVM.createContext(extras);
  nodeVM.runInContext(read('www/js/translations-en.js').replace(/^export /gm, ''), context);
  nodeVM.runInContext(read('www/js/seed.js').replace(/^export /gm, ''), context);
  nodeVM.runInContext(read('www/js/i18n.js').replace(/^import .*$/gm, '').replace(/^export /gm, ''), context);
  return context;
}
const vm = {
  ...nodeVM,
  createContext(values = {}) {
    const i18n = localizationContext();
    return nodeVM.createContext({ i18n, wireLanguageControls: () => {}, ...values });
  },
};

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

test('Hebrew is the default and both language pickers use the same bilingual flag cards', () => {
  assert.match(read('www/js/db.js'), /language: 'he'/);
  const html = read('www/index.html');
  for (const id of ['onboardingStepLanguage', 'tab-settings']) {
    const picker = html.slice(html.indexOf(`id="${id}"`)).split('</div>')[0];
    assert.match(picker, /data-language="he" aria-pressed="true"/);
    assert.match(picker, /data-language="en" aria-pressed="false"/);
    assert.match(picker, /flag-il\.svg/);
    assert.match(picker, /flag-us\.svg/);
    assert.match(picker, /עברית.*Hebrew/s);
    assert.match(picker, /אנגלית.*English/s);
  }
});

test('localization translates nested messages, decorations and locales and restores Hebrew', () => {
  const context = localizationContext();
  assert.equal(context.getLanguage(), 'he');
  assert.equal(context.locale(), 'he-IL');
  context.setLanguage('en');
  assert.equal(context.locale(), 'en-US');
  assert.equal(context.text('אימון מוצלח'), 'Have a great workout');
  assert.equal(context.text('🎙️ מקשיב (iPhone) — תרגיל נוכחי: לחיצת חזה'), '🎙️ Listening (iPhone) — current exercise: Chest press');
  assert.equal(context.text('החימום הסתיים. 50 אחוז מהאימון הושלמו ✅'), 'Warmup complete. 50 percent of your workout complete ✅');
  assert.equal(context.text('הליכה 5 דקות'), 'Walk for 5 min');
  assert.throws(() => context.setLanguage('fr'), /Unsupported language/);
  context.setLanguage('he');
  assert.equal(context.text('אימון מוצלח'), 'אימון מוצלח');
});

test('translation round trips preserve text node identity and use the latest rendered source', () => {
  const context = localizationContext();
  const node = { nodeType: 3, nodeValue: 'אימון', parentElement: { closest: () => null } };
  context.setLanguage('en');
  context.translateDOM(node);
  assert.equal(node.nodeValue, 'Workout');
  node.nodeValue = 'סיים אימון';
  context.translateDOM(node);
  assert.equal(node.nodeValue, 'Finish workout');
  context.setLanguage('he');
  context.translateDOM(node);
  assert.equal(node.nodeValue, 'סיים אימון');
  node.parentElement.closest = () => ({});
  context.setLanguage('en');
  node.nodeValue = 'ראשי';
  context.translateDOM(node);
  assert.equal(node.nodeValue, 'ראשי');
});

test('exercise translations never rename stored models or translate authored exercise names and notes', () => {
  const context = localizationContext();
  context.setLanguage('en');
  assert.equal(context.exerciseName('לחיצת חזה'), 'Chest press');
  assert.equal(context.exerciseName('ראשי'), 'ראשי');
  assert.equal(context.exerciseNotes('לכל יד'), 'Each arm');
  assert.equal(context.exerciseNotes('אימון אישי שלי'), 'אימון אישי שלי');
  const input = { value: '', setAttribute() {} };
  context.localizeInput(input, 'לחיצת חזה', 'name');
  assert.equal(input.value, 'Chest press');
  assert.equal(context.inputValue(input), 'לחיצת חזה');
  input.value = 'My custom chest press';
  assert.equal(context.inputValue(input), 'My custom chest press');
});

test('every static Hebrew UI caption and accessibility attribute has an English translation', () => {
  const context = localizationContext();
  context.setLanguage('en');
  const html = read('www/index.html').replace(/<!--[\s\S]*?-->/g, '');
  const intentional = new Set(['בחירת שפה · Language', 'עברית', 'אנגלית']);
  const values = [...html.matchAll(/>([^<>]*)</g)].map((match) => match[1].trim());
  values.push(...[...html.matchAll(/(?:title|placeholder|aria-label|alt)="([^"]*)"/g)].map((match) => match[1]));
  const decoded = values.map((value) => value.replace(/&(gt|lt|quot|amp|#39);/g,
    (_, entity) => ({ gt: '>', lt: '<', quot: '"', amp: '&', '#39': "'" }[entity])));
  for (const value of decoded.filter((value) => /[\u0590-\u05ff]/.test(value) && !intentional.has(value))) {
    assert.doesNotMatch(context.text(value), /[\u0590-\u05ff]/, value);
  }
});

for (const [phrase, expected] of [
  ['Start workout', 'startWorkout'], ['Start the workout', 'startWorkout'],
  ['Finish workout', 'finishWorkout'], ['End workout', 'finishWorkout'],
  ['Cancel workout', 'cancelWorkout'], ['Start set', 'startSet'],
  ['Set complete', 'setDone'], ['Set finished', 'setDone'], ['Done', 'setDone'],
  ['Skip rest', 'skipRest'], ['Rest finished', 'skipRest'], ['Next exercise', 'nextExercise'],
  ['Start', 'startExercise'], ['Stop', 'stopExercise'], ['Pause exercise', 'stopExercise'], ['Undo', 'undo'],
  ["Don't cancel workout", null], ['Do not finish workout', null], ['Do not start set', null],
]) {
  test(`English voice classification: ${phrase}`, () => {
    assert.equal(voiceContext().context.classifyVoiceCommand(phrase), expected);
  });
}

test('English rep counting, named exercise selection and set completion use the existing workout actions', () => {
  const entry = { exerciseId: 'bench', exerciseName: 'לחיצת חזה', sets: [{ completed: false, reps: '' }] };
  const { context, session, calls } = voiceContext([entry]);
  context.i18n.setLanguage('en');
  context.handleVoiceTranscript('Start chest press');
  assert.equal(session.currentExerciseId, 'bench');
  assert.ok(calls.includes('start'));
  context.handleVoiceTranscript('twenty-one set complete');
  assert.equal(entry.sets[0].reps, 21);
  assert.equal(entry.sets[0].completed, true);
  assert.ok(calls.includes('rest'));
  for (const [phrase, number] of [['zero', 0], ['one two twelve', 12], ['thirty nine', 39], ['ninety-nine', 99]]) {
    assert.equal(context.parseSpokenNumber(phrase), number, phrase);
  }
});

test('English speech and recognition forward the selected locale through native bridges', async () => {
  const calls = [];
  const bridge = bridgeContext({
    BackgroundAnnouncer: { speakNow: async (item) => calls.push(item) },
    VoiceCommand: { startListening: async (item) => { calls.push(item); return {}; } },
  });
  await bridge.announce('Rest complete', 'rest:done', 'en-US');
  await bridge.voiceStartListening(['Chest press'], 'en-US');
  assert.equal(calls[0].language, 'en-US');
  assert.equal(calls[1].language, 'en-US');
  const context = vm.createContext({
    isNative: () => true, announce: async (text, id, language) => calls.push({ text, id, language }),
  });
  context.i18n.setLanguage('en');
  vm.runInContext(read('www/js/timer.js').replace(/^import .*$/gm, '').replace(/^export /gm, ''), context);
  context.speak('עברו 30 שניות', undefined, 'rest:30');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls.at(-1), { text: '30 seconds elapsed', id: 'rest:30', language: 'en-US' });
});

test('changing announcement language replaces the native plan without changing deadlines or stable identities', async () => {
  const { context, calls } = nativePlanContext();
  context.restTimer.start(90);
  await settlePlan(context);
  context.i18n.setLanguage('en');
  context.syncNativeAnnouncementPlan();
  await settlePlan(context);
  assert.equal(calls.length, 2);
  assert.ok(calls[1].every((item) => item.language === 'en-US' && !/[\u0590-\u05ff]/.test(item.text)));
  assert.deepEqual(calls[1].map((item) => [item.fireAtMillis, item.announcementID]),
    calls[0].map((item) => [item.fireAtMillis, item.announcementID]));
});

test('language changes are durable, restart recognition in the new locale and do not rerender workout or profile forms', async () => {
  const handlers = [], calls = [], buttons = ['he', 'en'].map((language) => ({
    dataset: { language }, addEventListener: (_, callback) => handlers.push(callback),
  }));
  const session = { startedAt: 12345, entries: [{ sets: [{ reps: '9', weightKg: '22.5' }] }] };
  const context = vm.createContext({
    qsa: () => buttons, settings: { language: 'he' }, activeSession: session,
    db: { saveSettings: (value) => calls.push(['saved', value.language]) },
    appInitialized: true, currentTab: 'workout', voiceListeningActive: true, voiceListeningRevision: 0,
    window: { speechSynthesis: { cancel() {} } }, console,
    syncNativeAnnouncementPlan() {}, syncWorkoutActivity() {}, renderBrand() {}, renderHomeTab() {},
    native: { voiceStopListening: async () => { calls.push(['stop']); return true; } },
    updateVoiceListeningState: async () => calls.push(['start', context.i18n.locale()]),
    renderWorkoutTab: () => assert.fail('Do not rebuild typed workout controls'),
    renderProfileTab: () => assert.fail('Do not rebuild unsaved profile controls'),
    showToast: (message) => assert.fail(message),
  });
  vm.runInContext(section('function wireLanguageControls()', 'function wireSettings()'), context);
  context.wireLanguageControls();
  await handlers[1]();
  assert.deepEqual(calls, [['saved', 'en'], ['stop'], ['start', 'en-US']]);
  assert.equal(context.settings.language, 'en');
  assert.equal(context.activeSession, session);
  assert.equal(session.entries[0].sets[0].reps, '9');
  assert.equal(buttons[0].disabled, false);
});

test('scene startup uses the controller that registers every custom native plugin', () => {
  const scene = read('ios/App/App/SceneDelegate.swift');
  assert.match(scene, /rootViewController\s*=\s*MainViewController\(\)/);
  assert.doesNotMatch(scene, /rootViewController\s*=\s*CAPBridgeViewController\(\)/);
  const controller = read('ios/App/App/MainViewController.swift');
  const project = read('ios/App/App.xcodeproj/project.pbxproj');
  for (const plugin of ['HealthBridge', 'CloudBridge', 'KeepAwakeBridge', 'BackgroundAnnouncer',
    'FaceIdBridge', 'NotificationsBridge', 'VoiceCommand', 'ShareBridge', 'LiveActivityBridge']) {
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

test('recognizer receives user exercise names and native timer beeps use the mixed audio bridge', async () => {
  const names = ['חימום', 'פלאנק', 'תרגיל אישי'];
  let received, beeps = 0;
  const context = bridgeContext({
    VoiceCommand: { startListening: async (options) => { received = options.contextualStrings; } },
    BackgroundAnnouncer: { playBeep: async () => { beeps++; } },
  });
  assert.equal((await context.voiceStartListening(names)).listening, true);
  assert.equal(received, names);
  await context.beep();
  assert.equal(beeps, 1);
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
    activeSession: { entries: [] }, voiceExerciseNames: () => [],
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
    activeSession: { entries: [] }, voiceExerciseNames: () => [],
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
    buildWorkoutShareCanvases: function* () {
      for (let i = 0; i < 3; i++) yield { width: 1520, height: 2150, toDataURL: () => png };
    },
  });
  vm.runInContext(section('function buildWorkoutSharePdf(', '// Shares a file'), context);
  const blob = context.buildWorkoutSharePdf([]);
  assert.equal(blob.type, 'application/pdf');
  assert.ok(blob.size > 500);
  const text = await blob.text();
  assert.match(text, /^%PDF-/);
  assert.equal([...text.matchAll(/\/Type \/Page\b/g)].length, 3);
  for (const page of text.matchAll(/\/MediaBox \[([^\]]+)\]/g)) {
    const [, , width, height] = page[1].split(/\s+/).map(Number);
    assert.ok(Math.abs(width - 595.28) < 0.01 && Math.abs(height - 841.89) < 0.01);
  }
});

test('native sharing sends actual file bytes and filename to ShareBridge', async () => {
  let payload;
  class Reader {
    readAsDataURL() { this.result = 'data:application/pdf;base64,JVBERi0='; this.onload(); }
  }
  const context = bridgeContext({ ShareBridge: {
    shareFiles: async (data) => { payload = data.files; return { shared: true }; },
  } }, true, { FileReader: Reader });
  const result = await context.shareFile(new Blob(['%PDF-']), 'workout.pdf');
  assert.equal(result.shared, true);
  assert.equal(payload[0].filename, 'workout.pdf');
  assert.equal(payload[0].base64, 'JVBERi0=');
  await context.shareFiles([
    { blob: new Blob(['page 1']), filename: 'page-1.png' },
    { blob: new Blob(['page 2']), filename: 'page-2.png' },
  ]);
  assert.deepEqual(Array.from(payload, (file) => file.filename), ['page-1.png', 'page-2.png']);
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
      shareFiles: async (files) => { filename = files[0].filename; return { shared: true }; },
    });
    assert.equal(await context.shareFile(new Blob(['bytes']), `workout.${extension}`), true);
    assert.equal(filename, `workout.${extension}`);
  });
}

test('native share rejection is visible and does not claim a download', async () => {
  const { context, messages } = shareContext({
    isNative: () => true,
    shareFiles: async () => { throw new Error('share sheet unavailable'); },
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

test('contact form uses the configured Formspree endpoint without a redundant contact-details card', () => {
  const html = read('www/index.html');
  assert.match(html, /id="contactForm" action="https:\/\/formspree\.io\/f\/xljgvvyb" method="post"/);
  assert.match(html, /id="btnSendContact" type="submit"/);
  assert.match(html, /id="contactStatus"[^>]*role="status"/);
  for (const id of ['contactName', 'contactEmail', 'contactMessage']) {
    assert.match(html, new RegExp(`id="${id}"[^>]*required`));
  }
  const contact = html.slice(html.indexOf('<section id="tab-contact"'), html.indexOf('</section>', html.indexOf('<section id="tab-contact"')));
  assert.doesNotMatch(contact, /contactEmailLink|mailto:|פרטי יצירת קשר/);
  assert.doesNotMatch(app, /במייל שמופיע למעלה/);
  for (const id of ['contactName', 'contactEmail']) {
    assert.match(contact, new RegExp(`for="${id}"[^>]*>[^<]*<span class="required-mark"`));
  }
  assert.match(contact, /id="contactName"[^>]*pattern="\.\*\\S\.\*"/);
  assert.match(contact, /id="contactEmail"[^>]*type="email"[^>]*required/);
  assert.match(contact, /כתובת אימייל/);
  assert.doesNotMatch(contact, /הפנייה נשלחת דרך Formspree|כתובת מייל לתשובה/);
  assert.doesNotMatch(contact, /wa\.me|וואטסאפ|וואצפ|contactWhatsappLink|050-914-4233/);
  assert.doesNotMatch(contact, /השליחה אינה זמינה/);
  assert.match(app, /  wireContactTab\(\);/);
});

function contactContext(fetchImpl) {
  const elements = new Map();
  for (const [id, value] of [
    ['contactName', ' Test name '], ['contactEmail', 'user@example.test'], ['contactMessage', ' My message '],
    ['btnSendContact', ''], ['contactStatus', ''],
  ]) {
    elements.set(id, { value, textContent: '', disabled: false });
  }
  const form = {
    action: 'https://formspree.io/f/xljgvvyb', attributes: {},
    reportValidity: () => true,
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, handler) { this.submit = handler; },
    reset() {
      for (const id of ['contactName', 'contactEmail', 'contactMessage']) elements.get(id).value = '';
    },
  };
  elements.set('contactForm', form);
  const calls = [], errors = [];
  const context = vm.createContext({
    el: (id) => elements.get(id), AbortController, setTimeout, clearTimeout,
    console: { error: (...args) => errors.push(args) },
    fetch: async (...args) => {
      calls.push(args);
      return fetchImpl ? fetchImpl(...args) : { ok: true, json: async () => ({ ok: true }) };
    },
  });
  vm.runInContext(section('function wireContactTab()', 'function wireLanguageControls()'), context);
  context.wireContactTab();
  return { context, form, calls, errors, element: (id) => elements.get(id), submit: () => form.submit({ preventDefault() {} }) };
}

test('contact submission sends only authored fields and clears them after confirmed success', async () => {
  const { submit, calls, form, element } = contactContext();
  await submit();
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'https://formspree.io/f/xljgvvyb');
  assert.equal(calls[0][1].method, 'POST');
  assert.equal(calls[0][1].headers.Accept, 'application/json');
  assert.deepEqual(JSON.parse(calls[0][1].body), {
    name: 'Test name', email: 'user@example.test', message: 'My message', _subject: 'AutoFit — Contact',
  });
  assert.equal(element('contactMessage').value, '');
  assert.match(element('contactStatus').textContent, /בהצלחה/);
  assert.equal(element('btnSendContact').disabled, false);
  assert.equal(form.attributes['aria-busy'], 'false');
});

test('contact form blocks duplicate requests and edits while sending', async () => {
  let finish;
  const { submit, calls, element } = contactContext(() => new Promise((resolve) => { finish = resolve; }));
  const pending = submit();
  assert.equal(element('btnSendContact').disabled, true);
  assert.equal(element('contactMessage').disabled, true);
  await submit();
  assert.equal(calls.length, 1);
  finish({ ok: true, json: async () => ({ ok: true }) });
  await pending;
  assert.equal(element('contactMessage').disabled, false);
});

test('contact form rejects invalid or whitespace-only input without sending', async () => {
  for (const invalid of ['browser', 'blank']) {
    const { submit, calls, form, element } = contactContext();
    if (invalid === 'browser') form.reportValidity = () => false;
    else element('contactMessage').value = '   ';
    await submit();
    assert.equal(calls.length, 0);
    assert.equal(element('btnSendContact').disabled, false);
  }
});

test('contact errors retain the draft and never claim success', async () => {
  const failures = [
    async () => ({ ok: false, status: 422 }),
    async () => ({ ok: false, status: 429 }),
    async () => ({ ok: true, json: async () => ({ ok: false }) }),
    async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } }),
    async () => { throw new TypeError('Network unavailable'); },
    async () => { const error = new Error('Timed out'); error.name = 'AbortError'; throw error; },
  ];
  for (const failure of failures) {
    const { submit, element, form } = contactContext(failure);
    await submit();
    assert.equal(element('contactMessage').value, ' My message ');
    assert.match(element('contactStatus').textContent, /לא.*אישר|לא התקבל אישור/);
    assert.doesNotMatch(element('contactStatus').textContent, /בהצלחה/);
    assert.equal(element('btnSendContact').disabled, false);
    assert.equal(element('contactMessage').disabled, false);
    assert.equal(form.attributes['aria-busy'], 'false');
  }
});

test('contact submission follows the chosen language without translating authored content', async () => {
  const { context, submit, calls, element } = contactContext();
  context.i18n.setLanguage('en');
  element('contactMessage').value = 'שלום, זו הודעה אישית';
  await submit();
  assert.equal(JSON.parse(calls[0][1].body).message, 'שלום, זו הודעה אישית');
  assert.equal(element('contactStatus').textContent, 'Your message was sent successfully. Thank you!');
  assert.equal(element('btnSendContact').textContent, 'Send message');
});

function exerciseLibraryContext(records, session = { entries: [], running: false }) {
  const saved = [], messages = [];
  const context = vm.createContext({
    exercises: records, activeSession: session, settings: { programWeek: 3 }, workouts: [],
    db: { uid: () => 'draft', saveExercises: (data) => saved.push(JSON.stringify(data)) },
    renderExercisesTab() {}, renderWorkoutTab() {}, persistActiveSession() {},
    showToast: (message) => messages.push(message), getLastCompletedValuesByExercise: () => ({}),
    DEFAULT_WARMUP_NAME: 'Warmup', DEFAULT_COOLDOWN_NAME: 'Cooldown', DEFAULT_CARDIO_PACE: '6',
  });
  vm.runInContext(section('const EXERCISE_LIBRARY_CATEGORIES =', 'function wireExercisesTab('), context);
  vm.runInContext(section('function buildDraftSession()', 'function applyProgramWeekToActiveSession('), context);
  vm.runInContext(section('function reorderActiveSessionToMatchExercises()', '/* ---- photo modal ---- */'), context);
  return { context, saved, messages };
}

test('exercise library groups every existing exercise without changing its muscle group or program membership', () => {
  const context = vm.createContext({});
  vm.runInContext(read('www/js/seed.js').replace('export const SEED_EXERCISES', 'globalThis.seeds'), context);
  const records = JSON.parse(JSON.stringify(context.seeds));
  const before = JSON.stringify(records);
  const { context: library } = exerciseLibraryContext(records);
  for (const record of records) {
    const group = library.exerciseLibraryGroup(record);
    assert.notEqual(group, 'general', record.name);
    if (record.inputType === 'hold') assert.equal(group, 'static');
    if (record.inputType === 'cardio') assert.equal(group, 'warmup');
  }
  assert.equal(library.exerciseLibraryGroup({ category: 'קטגוריה אישית' }), 'general');
  assert.equal(library.exerciseLibraryGroup({ category: 'מפרקי כף יד' }), 'forearms');
  assert.equal(library.exerciseLibraryGroup({ category: 'גב תחתון' }), 'back');
  assert.equal(JSON.stringify(records), before);
});

test('exercise categories have distinct icons and bundled muscle illustrations', () => {
  const { context } = exerciseLibraryContext([]);
  const groups = vm.runInContext('EXERCISE_LIBRARY_CATEGORIES', context);
  assert.equal(new Set(groups.map((group) => group.icon)).size, groups.length);
  const worker = read('www/service-worker.js');
  for (const id of ['biceps', 'triceps', 'shoulders', 'chest', 'core', 'back', 'traps']) {
    const icon = groups.find((group) => group.id === id).icon;
    assert.equal(icon, `icons/muscle-${id}.svg`);
    assert.match(read(`www/${icon}`), /<svg[^>]*viewBox="0 0 64 64"/);
    assert.ok(worker.includes(`'./${icon}'`), `Missing offline icon: ${icon}`);
  }
});

test('my workout contains only selected exercises, with warmup first and cooldown last', () => {
  const { context } = exerciseLibraryContext([
    { id: 'cooldown' }, { id: 'bench' }, { id: 'hidden', active: false }, { id: 'warmup' },
  ]);
  assert.deepEqual(Array.from(context.myWorkoutExercises(), (ex) => ex.id), ['warmup', 'bench', 'cooldown']);
});

test('reordering a selected subset preserves all unselected library entries and every custom value', () => {
  const records = [
    { id: 'warmup', inputType: 'cardio' },
    { id: 'one', defaultSets: 5, defaultReps: '9', notes: 'custom', images: ['photo'] },
    { id: 'hidden', active: false, defaultSets: 7 },
    { id: 'two', defaultSets: 2 }, { id: 'cooldown', inputType: 'cardio' },
  ];
  const { context, saved } = exerciseLibraryContext(records);
  context.saveMyWorkoutOrder(['two', 'cooldown', 'one', 'warmup']);
  assert.deepEqual(Array.from(context.myWorkoutExercises(), (ex) => ex.id), ['warmup', 'two', 'one', 'cooldown']);
  assert.equal(context.exercises.length, 5);
  assert.equal(context.exercises.find((ex) => ex.id === 'hidden'), records[2]);
  assert.equal(context.exercises.find((ex) => ex.id === 'one'), records[1]);
  assert.equal(records[1].defaultSets, 5);
  assert.equal(saved.length, 1);
  assert.deepEqual(Array.from(context.activeSession.entries, (entry) => entry.exerciseId), ['warmup', 'two', 'one', 'cooldown']);
});

test('invalid or partial workout reorder cannot drop exercises from the library', () => {
  const { context, saved, messages } = exerciseLibraryContext([{ id: 'one' }, { id: 'two' }]);
  for (const ids of [['one'], ['one', 'one'], ['one', 'unknown']]) context.saveMyWorkoutOrder(ids);
  assert.equal(saved.length, 0);
  assert.equal(messages.length, 3);
  assert.deepEqual(Array.from(context.exercises, (entry) => entry.id), ['one', 'two']);
});

test('adding from the library appends to my workout; removing keeps the library object and future drafts in sync', () => {
  const records = [
    { id: 'warmup', inputType: 'cardio' }, { id: 'new', active: false, defaultSets: 2 },
    { id: 'existing', defaultSets: 1 }, { id: 'cooldown', inputType: 'cardio' },
  ];
  const { context } = exerciseLibraryContext(records);
  context.setExerciseInMyWorkout(records[1], true);
  assert.deepEqual(Array.from(context.myWorkoutExercises(), (ex) => ex.id), ['warmup', 'existing', 'new', 'cooldown']);
  context.setExerciseInMyWorkout(records[1], false);
  assert.equal(context.exercises.length, 4);
  assert.equal(context.exercises.find((ex) => ex.id === 'new'), records[1]);
  assert.deepEqual(Array.from(context.buildDraftSession().entries, (entry) => entry.exerciseId), ['warmup', 'existing', 'cooldown']);
});

test('changing my workout never discards already recorded sets or running timer progress', () => {
  const records = [{ id: 'bench', defaultSets: 3 }, { id: 'walk', inputType: 'cardio', durationMinutes: 3 }];
  const session = { running: true, entries: [
    { exerciseId: 'bench', sets: [{ completed: true, weightKg: 27.5, reps: 12 }] },
    { exerciseId: 'walk', type: 'cardio', elapsedSec: 30, durationSec: 180, startedAt: 123 },
  ] };
  const original = JSON.stringify(session.entries);
  const { context } = exerciseLibraryContext(records, session);
  context.setExerciseInMyWorkout(records[0], false);
  context.setExerciseInMyWorkout(records[1], false);
  assert.equal(JSON.stringify(session.entries), original);
  assert.equal(context.buildDraftSession().entries.length, 0);
});

test('removing a running static exercise from future workouts preserves its current timer and set', () => {
  const record = { id: 'plank', inputType: 'hold', defaultSets: 3 };
  const set = { holdStartedAt: 1234, completed: false, weightKg: '', reps: '' };
  const session = { running: true, entries: [{ exerciseId: 'plank', sets: [set] }] };
  const { context } = exerciseLibraryContext([record], session);
  context.setExerciseInMyWorkout(record, false);
  assert.equal(session.entries[0].sets[0], set);
  assert.equal(set.holdStartedAt, 1234);
  assert.equal(context.buildDraftSession().entries.length, 0);
});

test('editing default sets updates an untouched draft without truncating any recorded set', () => {
  const record = { id: 'bench', defaultSets: 4 };
  const session = { running: false, entries: [{ exerciseId: 'bench',
    sets: [{ completed: false, weightKg: '', reps: '' }] }] };
  const { context } = exerciseLibraryContext([record], session);
  context.reorderActiveSessionToMatchExercises();
  assert.equal(session.entries[0].sets.length, 4);
  session.entries[0].sets[3].weightKg = 32.5;
  record.defaultSets = 1;
  context.reorderActiveSessionToMatchExercises();
  assert.equal(session.entries[0].sets.length, 4);
  assert.equal(session.entries[0].sets[3].weightKg, 32.5);
});

test('custom warmup-library exercises create cardio timers rather than strength sets', () => {
  const { context } = exerciseLibraryContext([
    { id: 'custom-walk', name: 'Custom walk', inputType: 'cardio', durationMinutes: 3, pace: '5' },
  ]);
  const entry = context.buildDraftSession().entries[0];
  assert.equal(entry.exerciseId, 'custom-walk');
  assert.equal(entry.exerciseName, 'Custom walk');
  assert.equal(entry.type, 'cardio');
  assert.equal(entry.durationSec, 180);
  assert.equal(entry.pace, '5');
  assert.equal(entry.sets, undefined);
  context.reorderActiveSessionToMatchExercises();
  assert.equal(context.activeSession.entries[0].type, 'cardio');
});

function homeScreenContext(records = [], entries = [{ exerciseId: 'bench', sets: [{}, {}, {}] }]) {
  const elements = new Map(), tabs = [];
  let starts = 0, libraryRenders = 0;
  const element = (id) => {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, {
        textContent: '', style: {}, dataset: {}, attributes: {}, listeners: {},
        classList: { add: (value) => classes.add(value), contains: (value) => classes.has(value),
          toggle: (value, force) => force ? classes.add(value) : classes.delete(value) },
        addEventListener(name, callback) { this.listeners[name] = callback; },
        setAttribute(name, value) { this.attributes[name] = String(value); },
        click() { this.listeners.click?.(); },
      });
    }
    return elements.get(id);
  };
  const context = vm.createContext({
    workouts: records, db: { getWorkouts: () => records }, profile: { name: 'Test' },
    settings: { weeklyGoal: 3 }, activeSession: { entries, running: false },
    countThisWeek: () => 2, computeStreak: () => 3, formatHMS: (seconds) => `${seconds}s`,
    el: element, qsa: () => [], switchTab: (tab) => tabs.push(tab),
    renderExercisesTab: () => libraryRenders++, openHomeProgressModal() {},
    wireProfilePhoto() {}, renderProfilePhotos() {},
    exerciseLibraryCategory: null,
  });
  element('btnStartWorkout').listeners.click = () => { starts++; context.activeSession.running = true; };
  vm.runInContext(section('function exerciseLibraryCount(', 'function exerciseLibraryGroup('), context);
  vm.runInContext(section('function wireHomeTab()', 'function buildHomeStatCards('), context);
  context.wireHomeTab();
  return { context, element, tabs, starts: () => starts, libraryRenders: () => libraryRenders };
}

test('home overview shows real current exercise/set counts and clamps weekly progress at the goal', () => {
  const { context, element } = homeScreenContext([], [
    { exerciseId: 'warmup', type: 'cardio' }, { exerciseId: 'bench', sets: [{}, {}, {}, {}] },
  ]);
  context.countThisWeek = () => 5;
  context.renderHomeTab();
  const overview = context.buildHomeOverview();
  assert.equal(overview.exerciseCount, 2);
  assert.equal(overview.sets, 4);
  assert.equal(overview.weekCount, 5);
  assert.equal(overview.percent, 100);
  assert.equal(element('homeWeekFill').style.width, '100%');
  assert.equal(element('homeWeeklyProgress').attributes['aria-valuenow'], '3');
  assert.match(element('homeWeeklyProgress').attributes['aria-valuetext'], /^5 מתוך 3/);
});

test('home start delegates to the existing start control, and resume does not restart the workout', () => {
  const { context, element, tabs, starts } = homeScreenContext();
  element('btnHomeStartWorkout').click();
  assert.equal(starts(), 1);
  assert.equal(context.activeSession.running, true);
  context.renderHomeTab();
  assert.equal(element('homeStartLabel').textContent, 'המשך אימון');
  element('btnHomeStartWorkout').click();
  assert.equal(starts(), 1);
  assert.deepEqual(tabs, ['workout', 'workout']);
});

test('home empty program opens the library without starting an empty workout', () => {
  const { context, element, tabs, starts, libraryRenders } = homeScreenContext([], []);
  context.renderHomeTab();
  assert.equal(element('homeStartLabel').textContent, 'בנה את האימון שלי');
  element('btnHomeStartWorkout').click();
  assert.deepEqual(tabs, ['exercises']);
  assert.equal(starts(), 0);
  assert.equal(libraryRenders(), 1);
  assert.equal(context.exerciseLibraryCategory, null);
});

test('home program-edit shortcut opens my workout rather than starting or clearing the session', () => {
  const { context, element, tabs, starts } = homeScreenContext();
  const original = JSON.stringify(context.activeSession);
  element('btnHomeEditWorkout').click();
  assert.equal(context.exerciseLibraryCategory, 'my');
  assert.deepEqual(tabs, ['exercises']);
  assert.equal(starts(), 0);
  assert.equal(JSON.stringify(context.activeSession), original);
});

test('home last workout is actually the most recent date and does not reorder stored history', () => {
  const records = [
    { id: 'recent', dateISO: '2026-10-19T07:00:00Z', durationSec: 5400, entries: [{ sets: [{}, {}] }] },
    { id: 'older', dateISO: '2026-10-01T07:00:00Z', durationSec: 120, entries: [] },
  ];
  const { context, element } = homeScreenContext(records);
  context.renderHomeTab();
  assert.equal(element('btnHomeLastWorkout').dataset.workoutId, 'recent');
  assert.match(element('homeLastSummary').textContent, /5400s/);
  assert.match(element('homeLastSummary').textContent, /2 סטים/);
  assert.deepEqual(records.map((record) => record.id), ['recent', 'older']);
  records.length = 0;
  context.renderHomeTab();
  assert.equal(element('btnHomeLastWorkout').dataset.workoutId, '');
  assert.equal(element('btnHomeLastWorkout').classList.contains('hidden'), true);
  assert.match(element('homeLastDate').textContent, /האימון הראשון/);
});

test('home last-workout shortcut expands the matching history entry rather than an unrelated row', () => {
  const { context, element, tabs } = homeScreenContext();
  let opened = false, scrolled = false;
  context.qsa = () => [{ dataset: { workoutId: 'chosen' },
    classList: { add: (name) => { opened = name === 'open'; } },
    scrollIntoView: () => { scrolled = true; } }];
  element('btnHomeLastWorkout').dataset.workoutId = 'chosen';
  element('btnHomeLastWorkout').click();
  assert.deepEqual(tabs, ['history']);
  assert.equal(opened, true);
  assert.equal(scrolled, true);
});

test('home cardio-only program never presents a fake strength-set total', () => {
  const { context, element } = homeScreenContext([], [{ exerciseId: 'walk', type: 'cardio' }]);
  context.renderHomeTab();
  assert.match(element('homeWorkoutSummary').textContent, /מבוסס זמן/);
  assert.doesNotMatch(element('homeWorkoutSummary').textContent, /0 סטים/);
});

function profilePhotoContext(options = {}) {
  const nodes = new Map(), saved = [], messages = [], errors = [];
  const element = (id) => {
    if (!nodes.has(id)) {
      const node = { value: '', files: [], listeners: {}, attrs: {}, disabled: false,
        addEventListener(name, callback) { this.listeners[name] = callback; },
        getAttribute(name) { return this.attrs[name]; },
        click() { this.clicked = true; } };
      Object.defineProperty(node, 'src', { get: () => node.attrs.src, set: (value) => { node.attrs.src = value; } });
      nodes.set(id, node);
    }
    return nodes.get(id);
  };
  const context = vm.createContext({
    profile: { name: 'Saved name', photoDataUrl: 'data:image/jpeg;base64,old', weightKg: '70' },
    el: element, db: { saveProfile: (record) => saved.push(JSON.stringify(record)), ...options.db },
    fileToResizedDataUrl: options.resize || (async () => 'data:image/jpeg;base64,new'),
    showToast: (message) => messages.push(message),
    console: { error: (...args) => errors.push(args) },
  });
  vm.runInContext(section('function wireProfilePhoto(', 'function wireProfileTab('), context);
  context.wireProfilePhoto('btnHomePhoto', 'homePhotoInput');
  context.wireProfilePhoto('btnProfilePhoto', 'profilePhotoInput');
  return { context, element, saved, messages, errors };
}

for (const inputId of ['homePhotoInput', 'profilePhotoInput']) {
  test(`profile photo selected through ${inputId} saves once and updates all three screens without resetting form fields`, async () => {
    const { context, element, saved } = profilePhotoContext();
    element('profileName').value = 'Unsaved edit';
    const input = element(inputId);
    input.files = [{ type: 'image/png' }];
    input.value = 'chosen-file';
    await input.listeners.change();
    for (const id of ['homePhoto', 'workoutProfilePhoto', 'profilePhoto']) {
      assert.equal(element(id).src, 'data:image/jpeg;base64,new');
    }
    assert.equal(saved.length, 1);
    assert.equal(JSON.parse(saved[0]).name, 'Saved name');
    assert.equal(element('profileName').value, 'Unsaved edit');
    assert.equal(context.profile.photoDataUrl, 'data:image/jpeg;base64,new');
    assert.equal(input.value, '');
    assert.equal(element('btnHomePhoto').disabled, false);
    assert.equal(element('btnProfilePhoto').disabled, false);
    assert.match(element('profilePhotoAction').textContent, /החלף/);
  });
}

test('a cancelled image picker leaves the profile unchanged', async () => {
  const { context, element, saved, messages } = profilePhotoContext();
  await element('profilePhotoInput').listeners.change();
  assert.equal(saved.length, 0);
  assert.equal(messages.length, 0);
  assert.equal(context.profile.photoDataUrl, 'data:image/jpeg;base64,old');
});

test('photo decoding or local save failure preserves the saved image and allows retrying the same file', async () => {
  for (const options of [
    { resize: async () => { throw new Error('decode failed'); } },
    { db: { saveProfile: () => { throw new Error('storage full'); } } },
  ]) {
    const { context, element, saved, messages, errors } = profilePhotoContext(options);
    const input = element('profilePhotoInput');
    input.files = [{}];
    input.value = 'chosen-file';
    await input.listeners.change();
    assert.equal(context.profile.photoDataUrl, 'data:image/jpeg;base64,old');
    assert.equal(saved.length, 0);
    assert.equal(input.value, '');
    assert.equal(element('btnProfilePhoto').disabled, false);
    assert.match(messages[0], /לא ניתן לשמור/);
    assert.equal(errors.length, 1);
  }
});

test('photo processing preserves concurrent saved profile changes and prevents a second upload while busy', async () => {
  let finish;
  const { context, element } = profilePhotoContext({ resize: () => new Promise((resolve) => { finish = resolve; }) });
  element('profilePhotoInput').files = [{}];
  const pending = element('profilePhotoInput').listeners.change();
  assert.equal(element('btnHomePhoto').disabled, true);
  assert.equal(element('btnProfilePhoto').disabled, true);
  context.profile.name = 'New saved name';
  finish('data:image/jpeg;base64,new');
  await pending;
  assert.equal(context.profile.name, 'New saved name');
  assert.equal(context.profile.weightKg, '70');
});

test('default profile art is consistent across home, workout and personal area', () => {
  const { context, element } = profilePhotoContext();
  context.profile.photoDataUrl = '';
  context.renderProfilePhotos();
  for (const id of ['homePhoto', 'workoutProfilePhoto', 'profilePhoto']) {
    assert.equal(element(id).src, 'icons/icon-192.png');
  }
  assert.match(element('profilePhotoAction').textContent, /העלה/);
  assert.match(app, /wireProfilePhoto\('btnProfilePhoto', 'profilePhotoInput'\)/);
  assert.match(app, /wireProfilePhoto\('btnHomePhoto', 'homePhotoInput'\)/);
});

test('workout banner includes the saved profile name and follows the selected language', () => {
  const nodes = { appBrand: {}, greetingText: {} };
  const context = vm.createContext({ el: (id) => nodes[id], profile: { name: 'ששי דניאל' } });
  vm.runInContext(section('function renderBrand()', '/* ================= HOME TAB ================= */'), context);
  context.renderBrand();
  assert.equal(nodes.greetingText.textContent, 'אימון מוצלח ששי דניאל');
  context.i18n.setLanguage('en');
  context.renderBrand();
  assert.equal(nodes.greetingText.textContent, 'Have a great workout ששי דניאל');
  context.profile.name = '  שלום  ';
  context.renderBrand();
  assert.equal(nodes.greetingText.textContent, 'Have a great workout שלום');
  context.profile.name = ' ';
  context.renderBrand();
  assert.equal(nodes.greetingText.textContent, 'Have a great workout');
  context.i18n.setLanguage('he');
  context.renderBrand();
  assert.equal(nodes.greetingText.textContent, 'אימון מוצלח');
  assert.match(read('www/index.html'), /id="greetingText"[^>]*data-no-translate/);
});

test('statistics labels replace dashboard wording without changing the destination', () => {
  const html = read('www/index.html');
  assert.match(html, /data-tab="dashboard"[^>]*>[\s\S]*?<span>סטטיסטיקה<\/span>/);
  assert.match(html, /id="tab-dashboard"[^>]*>\s*<h2 class="section-title">סטטיסטיקה<\/h2>/);
  assert.match(html, /לסטטיסטיקה המלאה/);
  assert.match(app, /id="btnHomeProgressToDashboard">📈 לסטטיסטיקה המלאה/);
  assert.doesNotMatch(html + app, /דשבורד/);
  const context = localizationContext();
  context.setLanguage('en');
  assert.equal(context.text('סטטיסטיקה'), 'Statistics');
  assert.equal(context.text('לסטטיסטיקה המלאה'), 'Full statistics');
});

test('bottom navigation retains seven labeled destinations with consistent local vector icons', () => {
  const nav = read('www/index.html').match(/<nav class="tabbar">([\s\S]*?)<\/nav>/)[1];
  assert.equal((nav.match(/class="ui-icon nav-icon"/g) || []).length, 7);
  for (const tab of ['home', 'workout', 'history', 'dashboard', 'exercises', 'profile', 'contact']) {
    assert.match(nav, new RegExp(`data-tab="${tab}"`));
  }
  assert.equal((nav.match(/aria-hidden="true"/g) || []).length, 7);
  assert.doesNotMatch(nav, /<img|https?:/);
});

function voiceContext(entries = []) {
  const messages = [];
  const calls = [];
  const holdTimers = new Map();
  function node() {
    const classes = new Set();
    return {
      value: '', textContent: '',
      classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
        contains: (name) => classes.has(name),
        toggle: (name, force) => force ? classes.add(name) : classes.delete(name),
      },
      scrollIntoView: () => calls.push('scroll'),
    };
  }
  const elements = new Map();
  const el = (id) => {
    if (!elements.has(id)) elements.set(id, node());
    return elements.get(id);
  };
  const cards = entries.map((entry) => ({
    ...node(),
    entry,
    rows: (entry.sets || []).map((set, index) => ({
      ...node(), set, reps: node(),
      holdButton: { click: () => {
        if (holdTimers.has(`${entry.exerciseId}:${index}`)) {
          holdTimers.delete(`${entry.exerciseId}:${index}`);
          set.completed = true;
          calls.push('stopHold', 'rest');
          return;
        }
        set.holdStartedAt = Date.now();
        holdTimers.set(`${entry.exerciseId}:${index}`, { startedAt: set.holdStartedAt });
        calls.push('startHold');
      } },
      button: { click: () => {
        set.completed = !set.completed;
        holdTimers.delete(`${entry.exerciseId}:${index}`);
        if (set.completed) calls.push('rest');
      } },
    })),
    button: { click: () => { entry.completed = !entry.completed; } },
    startButton: { click: () => {
      if (entry.startedAt && !entry.completed) {
        entry.startedAt = null; calls.push('stopCardio'); return;
      }
      entry.startedAt = Date.now(); entry.completed = false; calls.push('startCardio');
    } },
  }));
  const session = { running: false, entries };
  const context = vm.createContext({
    activeSession: session,
    exercises: entries.map((e) => ({ id: e.exerciseId, name: e.exerciseName, inputType: e.inputType || 'reps' })),
    document: { visibilityState: 'visible' },
    settings: { voiceCommandsEnabled: true },
    native: { isNative: () => true },
    el,
    qs: (selector, parent) => {
      const match = selector.match(/data-entry-index="(\d+)"/);
      if (match) return cards[Number(match[1])];
      if (selector === '.btnCardioDone') return parent.button;
      if (selector === '.btnCardioStart') return parent.startButton;
      if (selector === '.btn-hold-toggle') return parent.holdButton;
      if (selector === '.reps') return parent.reps;
      if (selector.includes('.set-check')) {
        if (parent.rows) return parent.rows.find((row) => !row.set.completed)?.button;
        return parent.button;
      }
    },
    qsa: (_, parent) => parent.rows,
    primeSpeech: () => {},
    ensureWorkoutStarted: () => { session.running = true; calls.push('start'); },
    finishWorkout: () => { session.running = false; calls.push('finish'); },
    doCancelWorkout: () => { session.running = false; calls.push('cancel'); },
    showToast: (message) => messages.push(message),
    persistActiveSession: () => calls.push('persist'),
    syncWorkoutActivity: () => {},
    renderWorkoutTab: () => calls.push('render'),
    restTimer: { stop: () => calls.push('stopRest') },
    holdTimers,
    db: { saveSettings: () => calls.push('saveSettings') },
    setTimeout: () => 0,
  });
  vm.runInContext(section('function isEntryDone(', 'function startRestTimer('), context);
  vm.runInContext("voiceListeningActive = true; currentTab = 'workout';", context);
  return { context, calls, messages, session, el };
}

for (const [phrase, expected] of [
  ['התחל אימון', 'startWorkout'], ['התחל את האימון!', 'startWorkout'],
  ['תתחיל אימון', 'startWorkout'], ['סיים אימון', 'finishWorkout'],
  ['סיימתי את האימון', 'finishWorkout'], ['סיום אימון', 'finishWorkout'],
  ['בטל אימון', 'cancelWorkout'], ['ביטול האימון', 'cancelWorkout'],
  ['התחל סט', 'startSet'], ['התחל', 'startExercise'], ['התחל תרגיל', 'startExercise'],
  ['סיימתי', 'setDone'], ['סט הושלם', 'setDone'], ['הסט הושלם!', 'setDone'], ['סט הסתיים', 'setDone'],
  ['חזרה אחת הסתיימה', 'setDone'], ['חזרה שנייה הסתיימה', 'setDone'],
  ['דלג על מנוחה', 'skipRest'], ['זמן המנוחה הסתיים', 'skipRest'],
  ['תרגיל הבא', 'nextExercise'], ['בטל', 'undo'],
  ['לא התחל אימון', null], ['אל תבטל אימון', null],
  ['זמן המנוחה הסתיים אפשר להמשיך לסט הבא', null],
  ['אימון מהנה ובהצלחה', null], ['כל הכבוד על האימון', null],
]) {
  test(`Hebrew command classification: ${phrase}`, () => {
    assert.equal(voiceContext().context.classifyVoiceCommand(phrase), expected);
  });
}

for (const [phrase, expected] of [
  ['0', 0], ['אפס', 0], ['אחת', 1], ['שתיים', 2], ['שניים עשר', 12],
  ['שתיים עשרה', 12], ['שישה עשר', 16], ['עשרים ואחת', 21],
  ['שלושים ותשע', 39], ['אחת שתיים שלוש', 3], ['1, 2, 3, 4', 4],
  ['אחת, שתיים ושלוש', 3], ['עשרים ואחת עשרים ושתיים', 22],
  ['מספר לא מוכר', null],
]) {
  test(`Spoken rep parsing: ${phrase}`, () => {
    assert.equal(voiceContext().context.parseSpokenNumber(phrase), expected);
  });
}

test('spoken start works before any set is completed and does not start twice', () => {
  const { context, calls, session } = voiceContext();
  context.handleVoiceTranscript('התחל אימון');
  context.handleVoiceTranscript('התחל אימון');
  assert.equal(session.running, true);
  assert.equal(calls.filter((call) => call === 'start').length, 1);
});

test('spoken counts save the last number and ending a set works within the same utterance', () => {
  const entry = { exerciseId: 'bench', sets: [{ reps: '', completed: false }] };
  const { context } = voiceContext([entry]);
  context.handleVoiceTranscript('התחל סט');
  context.handleVoiceTranscript('אחת שתיים שלוש');
  assert.equal(entry.sets[0].reps, 3);
  context.handleVoiceTranscript('עברו 30 שניות');
  assert.equal(entry.sets[0].reps, 3);
  context.handleVoiceTranscript('ארבע חמש סיימתי');
  assert.equal(entry.sets[0].reps, 5);
  assert.equal(entry.sets[0].completed, true);
});

function contextualEntries() {
  return [
    { exerciseId: 'warmup', exerciseName: 'חימום-הליכה', type: 'cardio', durationSec: 300, completed: false },
    { exerciseId: 'bench', exerciseName: 'לחיצת חזה', sets: [{ completed: false }, { completed: false }] },
    { exerciseId: 'legs', exerciseName: 'לחיצת רגליים', sets: [{ completed: false }] },
    { exerciseId: 'plank', exerciseName: 'פלאנק', inputType: 'hold', sets: [{ completed: false }] },
    { exerciseId: 'cooldown', exerciseName: 'שחרור-הליכה', type: 'cardio', durationSec: 300, completed: false },
  ];
}

test('set completed targets strength and rest, not an untouched warmup', () => {
  const entries = contextualEntries();
  const { context, calls } = voiceContext(entries);
  context.handleVoiceTranscript('סט הושלם');
  assert.equal(entries[0].completed, false);
  assert.equal(entries[1].sets[0].completed, true);
  assert.ok(calls.includes('rest'));
});

for (const [name, id, expectedCall] of [
  ['חימום', 'warmup', 'startCardio'],
  ['שחרור', 'cooldown', 'startCardio'],
  ['קירור', 'cooldown', 'startCardio'],
  ['פלאנק', 'plank', 'startHold'],
  ['פלנק', 'plank', 'startHold'],
]) {
  test(`selecting ${name} then start uses its actual timer control`, () => {
    const { context, session, calls } = voiceContext(contextualEntries());
    context.handleVoiceTranscript(name);
    assert.equal(session.currentExerciseId, id);
    assert.equal(calls.includes(expectedCall), false);
    context.handleVoiceTranscript('התחל');
    assert.ok(calls.includes(expectedCall));
    assert.equal(session.entries[0].completed, false);
  });
}

test('named prefix/suffix commands start the intended timer even when earlier exercises are incomplete', () => {
  for (const phrase of ['התחל חימום', 'חימום התחל', 'התחל את חימום']) {
    const { context, session, calls } = voiceContext(contextualEntries());
    context.handleVoiceTranscript(phrase);
    context.handleVoiceTranscript(phrase);
    assert.equal(session.currentExerciseId, 'warmup');
    assert.equal(calls.filter((call) => call === 'startCardio').length, 1);
  }
  const { context, session, calls } = voiceContext(contextualEntries());
  context.handleVoiceTranscript('פלנק התחל');
  context.handleVoiceTranscript('סט הושלם');
  assert.equal(session.currentExerciseId, 'plank');
  assert.equal(session.entries[3].sets[0].completed, true);
  assert.equal(session.entries[1].sets[0].completed, false);
  assert.ok(calls.includes('startHold') && calls.includes('rest'));
});

test('unique short names select the exercise; ambiguous and negated requests cannot start anything', () => {
  const { context, session, calls, messages } = voiceContext(contextualEntries());
  context.handleVoiceTranscript('התחל לחיצת');
  assert.equal(session.currentExerciseId, undefined);
  assert.equal(calls.length, 0);
  assert.match(messages[0], /כמה תרגילים/);
  context.handleVoiceTranscript('לא התחל פלאנק');
  assert.equal(calls.length, 0);
  context.handleVoiceTranscript('חזה');
  context.handleVoiceTranscript('סט הושלם');
  assert.equal(session.currentExerciseId, 'bench');
  assert.equal(session.entries[1].sets[0].completed, true);
});

test('changing exercise exits counting without completing the wrong set; next really advances', () => {
  const { context, session } = voiceContext(contextualEntries());
  context.handleVoiceTranscript('התחל סט');
  context.handleVoiceTranscript('1 2 3');
  context.handleVoiceTranscript('פלאנק');
  assert.equal(vm.runInContext('voiceCountingState', context), null);
  assert.equal(session.entries[1].sets[0].reps, 3);
  assert.equal(session.entries[1].sets[0].completed, false);
  context.handleVoiceTranscript('תרגיל הבא');
  assert.equal(session.currentExerciseId, 'cooldown');
});

test('new completion wording commits the last count and recognition receives current exercise names', async () => {
  const { context, session } = voiceContext(contextualEntries());
  let hints;
  context.native.voiceStartListening = async (names) => { hints = names; return { listening: true }; };
  vm.runInContext('voiceListeningActive = false', context);
  await context.updateVoiceListeningState();
  assert.ok(hints.includes('חימום') && hints.includes('לחיצת חזה') && hints.includes('פלנק'));
  context.handleVoiceTranscript('התחל סט');
  context.handleVoiceTranscript('אחת שתיים שלוש סט הושלם');
  assert.equal(session.entries[1].sets[0].reps, 3);
  assert.equal(session.entries[1].sets[0].completed, true);
});

test('a completed named hold cannot accidentally start another exercise; explicit cardio restart matches manual start', () => {
  const entries = contextualEntries();
  entries[3].sets[0].completed = true;
  entries[0].completed = true;
  const { context, calls } = voiceContext(entries);
  context.handleVoiceTranscript('התחל פלאנק');
  assert.equal(calls.includes('startHold'), false);
  assert.equal(calls.includes('start'), false);
  context.handleVoiceTranscript('התחל חימום');
  assert.ok(calls.includes('startCardio'));
  assert.equal(entries[0].completed, false);
});

function greetingContext() {
  let now = 10000, nextID = 0;
  const pending = new Map(), spoken = [];
  const context = vm.createContext({
    activeSession: { id: 'one', running: false }, settings: { voiceAnnouncements: true, restSeconds: 90 },
    workoutGreetingTimer: null,
    setTimeout: (callback, delay) => { pending.set(++nextID, { at: now + delay, callback }); return nextID; },
    clearTimeout: (id) => pending.delete(id),
    persistActiveSession() {}, requestWakeLock() {}, stopwatch: { start() {} },
    el: () => ({ textContent: '', setAttribute() {}, classList: { add() {}, remove() {} } }),
    native: { isNative: () => false }, speak: (text) => spoken.push({ text, at: now }),
    playBeep() {}, restTimer: { start() {} },
  });
  vm.runInContext(section('function ensureWorkoutStarted()', '// Cancels the current workout'), context);
  vm.runInContext(section('function startRestTimer(', '/* ================= HISTORY TAB'), context);
  const advance = (ms) => {
    now += ms;
    for (const [id, task] of pending) {
      if (task.at <= now) { pending.delete(id); task.callback(); }
    }
  };
  return { context, advance, spoken, pending };
}

test('opening workout sentence waits a full second before any speech and never starts twice', () => {
  const { context, advance, spoken } = greetingContext();
  context.ensureWorkoutStarted();
  context.ensureWorkoutStarted();
  assert.equal(spoken.length, 0);
  advance(999);
  assert.equal(spoken.length, 0);
  advance(1);
  assert.deepEqual(spoken, [{ text: 'אימון מהנה ובהצלחה', at: 11000 }]);
});

test('pending opening speech cannot interrupt rest or speak after cancellation/settings changes', () => {
  for (const stop of [
    (context) => context.cancelWorkoutGreeting(),
    (context) => { context.activeSession.running = false; },
    (context) => { context.settings.voiceAnnouncements = false; },
    (context) => context.startRestTimer({ name: 'Bench' }, false, null),
  ]) {
    const { context, advance, spoken } = greetingContext();
    context.ensureWorkoutStarted();
    stop(context);
    advance(1000);
    assert.equal(spoken.some((item) => item.text === 'אימון מהנה ובהצלחה'), false);
  }
});

test('voice undo targets the newly completed set even after rendering and manual completion', () => {
  const entry = { exerciseId: 'bench', sets: [
    { completed: true }, { completed: false }, { completed: false },
  ] };
  const { context, calls } = voiceContext([entry]);
  context.handleVoiceTranscript('סט הסתיים');
  entry.sets[2].completed = true;
  context.renderWorkoutTab();
  context.handleVoiceTranscript('בטל');
  assert.deepEqual(entry.sets.map((set) => set.completed), [true, false, true]);
  assert.ok(calls.includes('stopRest'));
});

test('late transcripts cannot control workouts outside the visible listening tab', () => {
  for (const disable of [
    "voiceListeningActive = false",
    "currentTab = 'home'",
    "document.visibilityState = 'hidden'",
  ]) {
    const { context, calls } = voiceContext();
    vm.runInContext(disable, context);
    context.handleVoiceTranscript('התחל אימון');
    assert.equal(calls.length, 0);
  }
});

test('voice finish and cancel stay distinct and cancel does not require a dialog', () => {
  const { context, session, calls } = voiceContext();
  session.running = true;
  context.handleVoiceTranscript('סיים אימון');
  session.running = true;
  context.handleVoiceTranscript('בטל אימון');
  assert.deepEqual(calls, ['finish', 'cancel']);
});

test('workout-tab microphone activation repairs an older persisted off setting without starting a workout', async () => {
  const { context, session, calls } = voiceContext();
  context.native.voiceRequestPermission = async () => ({ granted: true });
  context.native.voiceStartListening = async () => ({ listening: true });
  vm.runInContext('voiceListeningActive = false; settings.voiceCommandsEnabled = false;', context);
  await context.requestVoiceActivation();
  assert.equal(context.settings.voiceCommandsEnabled, true);
  assert.equal(vm.runInContext('voiceListeningActive', context), true);
  assert.equal(session.running, false);
  assert.ok(calls.includes('saveSettings'));
});

test('next exercise skips completed strength and cardio entries', () => {
  const { context } = voiceContext([
    { exerciseName: 'current', sets: [{ completed: true }] },
    { exerciseName: 'already done', sets: [{ completed: true }] },
    { exerciseName: 'walk', type: 'cardio', completed: true },
    { exerciseName: 'next', sets: [{ completed: false }] },
  ]);
  assert.equal(context.nextEntryName(context.activeSession.entries[0]), 'next');
  assert.equal(context.nextEntryName(context.activeSession.entries[3]), null);
});

test('share pages stay high-resolution and bounded, with every logged set rendered exactly once', () => {
  const drawn = [];
  let pageIndex = 0;
  const context = vm.createContext({
    profile: { name: 'Test' }, computeVolume: () => 0,
    formatDate: () => '2026-10-18', formatHMS: () => '60:00', formatCardioExtra: () => '',
    document: { createElement: () => {
      const id = pageIndex++;
      return { getContext: () => new Proxy({}, {
        get: (_, key) => key === 'fillText'
          ? (text, x, y) => { assert.ok(y <= 1047); drawn.push({ id, text }); }
          : () => {},
        set: () => true,
      }) };
    } },
  });
  vm.runInContext(section('function* buildWorkoutShareCanvases(', 'async function buildWorkoutShareImages('), context);
  const sample = [{ entries: Array.from({ length: 25 }, (_, exercise) => ({
    exerciseName: `Exercise ${exercise}`,
    sets: Array.from({ length: exercise === 0 ? 70 : 3 }, (_, index) => ({
      weightKg: 10, reps: `rep-${exercise}-${index}`,
    })),
  })) }];
  const pages = [...context.buildWorkoutShareCanvases(sample)];
  assert.ok(pages.length > 4);
  for (const page of pages) assert.deepEqual([page.width, page.height], [1520, 2150]);
  const reps = drawn.map((item) => item.text).filter((text) => /^rep-/.test(text));
  const expected = sample[0].entries.flatMap((entry) => entry.sets.map((set) => set.reps));
  assert.deepEqual(reps, expected);
  const continuation = drawn.filter((item) => item.text === '🏋️ Exercise 0');
  assert.ok(continuation.length > 1, 'split tables repeat their exercise heading');
});

test('English share output uses English labels and left-to-right columns without translating personal content', () => {
  const drawn = [], directions = [];
  const context = vm.createContext({
    profile: { name: 'שם אישי' }, computeVolume: () => 120, DEFAULT_CARDIO_PACE: 'קצב 6 בהליכון',
    formatDate: () => '10/19/2026', formatHMS: () => '30:00',
    document: { createElement: () => ({ getContext: () => new Proxy({}, {
      get: (_, key) => key === 'fillText' ? (text, x) => drawn.push({ text, x }) : () => {},
      set: (_, key, value) => { if (key === 'direction') directions.push(value); return true; },
    }) }) },
  });
  context.i18n.setLanguage('en');
  vm.runInContext(section('function formatCardioExtra(', 'async function buildWorkoutShareImages('), context);
  const records = [{ durationSec: 1800, entries: [
    { exerciseName: 'לחיצת חזה', sets: [{ weightKg: 10, reps: 12 }] },
    { exerciseName: 'ראשי', sets: [{ weightKg: 20, reps: 10 }] },
  ] }];
  [...context.buildWorkoutShareCanvases(records)];
  assert.deepEqual(directions, ['ltr']);
  const setColumn = drawn.find((item) => item.text === 'Set');
  const repColumn = drawn.find((item) => item.text === 'Reps');
  assert.ok(setColumn.x < repColumn.x);
  assert.ok(drawn.some((item) => item.text === '🏋️ Chest press'));
  assert.ok(drawn.some((item) => item.text === '🏋️ ראשי'));
  const lines = Array.from(context.buildWorkoutShareLines(records));
  assert.ok(lines.includes('🏋️ ראשי'));
  assert.ok(lines.includes('   Set 1: 10 kg × 12'));
  assert.ok(lines.some((line) => line.includes('שם אישי')));
});

test('PNG export failure rejects instead of returning an empty successful file', async () => {
  const canvas = { width: 1520, height: 2150, toBlob: (callback) => callback(null) };
  const context = vm.createContext({
    buildWorkoutShareCanvases: function* () { yield canvas; },
  });
  vm.runInContext(section('async function buildWorkoutShareImages(', '// Builds a real PDF'), context);
  await assert.rejects(context.buildWorkoutShareImages([]));
  assert.equal(canvas.width, 1);
});

function timerContext() {
  let now = 1000;
  let nextId = 0;
  const timers = new Map();
  const context = vm.createContext({
    Date: { now: () => now },
    setInterval: (callback) => { timers.set(++nextId, callback); return nextId; },
    clearInterval: (id) => timers.delete(id),
  });
  vm.runInContext(read('www/js/timer.js').replace(/^import .*$/gm, '').replace(/^export /gm, ''), context);
  const Rest = vm.runInContext('RestTimer', context);
  return {
    context, timers, advance: (seconds) => { now += seconds * 1000; },
    rest: (handlers) => new Rest(handlers),
  };
}

test('rest timer emits 30, 60, done once for 90 seconds and stays silent after stop', () => {
  const { rest, advance } = timerContext();
  const events = [];
  const timer = rest({
    onTick: () => {}, onInterval: (n) => events.push(n), onDone: () => events.push('done'),
  });
  timer.start(90);
  advance(30); timer.forceTick();
  advance(30); timer.forceTick();
  advance(30); timer.forceTick();
  timer.forceTick();
  assert.deepEqual(events, [30, 60, 'done']);
  timer.start(120); timer.stop(); advance(120); timer.forceTick();
  assert.deepEqual(events, [30, 60, 'done']);
});

test('rest extension and stopwatch restart keep just one timer and correct wall-clock duration', () => {
  const { context, timers, rest, advance } = timerContext();
  const timer = rest({ onTick() {}, onDone() {} });
  timer.start(90);
  advance(30);
  timer.addSeconds(15);
  assert.equal(timer.totalSeconds, 105);
  assert.equal(timers.size, 1);
  timer.stop();
  const Watch = vm.runInContext('Stopwatch', context);
  const watch = new Watch(() => {});
  watch.start(context.Date.now());
  watch.start(context.Date.now());
  assert.equal(timers.size, 1);
  advance(3661);
  assert.equal(watch.stop(), 3661);
  assert.equal(timers.size, 0);
  assert.equal(context.formatHMS(3661), '1:01:01');
});

test('pending background announcement delays do not repeat already spoken 30-second marks', () => {
  const context = vm.createContext({
    Date: { now: () => 45000 },
    restTimer: { isRunning: () => true, endAt: 90000, totalSeconds: 90, lastAnnouncedElapsed: 30 },
    settings: { voiceAnnouncements: true, voiceIntervalAnnouncements: true },
    restDoneMessage: 'done', holdTimers: new Map(), exercises: [], activeSession: { entries: [] },
  });
  vm.runInContext(section('function buildBackgroundAnnouncementItems()', '/* ---------------- notifications'), context);
  const items = context.buildBackgroundAnnouncementItems();
  assert.deepEqual(Array.from(items, (item) => item.fireAtMillis), [60000, 90000]);
  context.settings.voiceAnnouncements = false;
  assert.equal(context.buildBackgroundAnnouncementItems().length, 0);
});

function migrationContext() {
  let savedExercises = [];
  let id = 0;
  const context = vm.createContext({
    exercises: [], settings: { restSeconds: 135 }, activeSession: null,
    db: {
      uid: () => `id-${++id}`,
      getExercises: () => JSON.parse(JSON.stringify(savedExercises)),
      saveExercises: (value) => { savedExercises = JSON.parse(JSON.stringify(value)); },
      saveSettings: () => {},
    },
    DEFAULT_WARMUP_NAME: 'walk', DEFAULT_COOLDOWN_NAME: 'walk', DEFAULT_CARDIO_PACE: '6',
  });
  vm.runInContext(read('www/js/seed.js').replace(/^export /gm, ''), context);
  vm.runInContext(section('const EXERCISE_CONTENT_PATCH_V2', '/* ---------------- state'), context);
  vm.runInContext(section('function init() {', '  if (!activeSession) {') + '}', context);
  return context;
}

test('fresh-install exercise defaults and later user rest/set edits survive the second launch', () => {
  const context = migrationContext();
  context.init();
  vm.runInContext(`
    const hang = exercises.find(e => e.name === 'החזקה סטטית במתח');
    if (hang.defaultSets !== 1) throw new Error('Incorrect hang defaults');
    hang.defaultSets = 2;
    hang.restSeconds = 105;
    db.saveExercises(exercises);
  `, context);
  context.init();
  assert.equal(vm.runInContext("exercises.find(e => e.name === 'החזקה סטטית במתח').defaultSets", context), 2);
  assert.equal(vm.runInContext("exercises.find(e => e.name === 'החזקה סטטית במתח').restSeconds", context), 105);
  assert.equal(context.settings.restSeconds, 135);
  assert.equal(vm.runInContext("exercises.find(e => e.name === 'לחיצת חזה').restSeconds", context), 120);
});

test('exercise migrations add each new exercise once and apply rest overrides before renaming', () => {
  const context = migrationContext();
  context.db.saveExercises([{ id: 'old', name: 'כפיפת מרפקים בישיבה (ביצפס)', defaultSets: 3 }]);
  context.init();
  assert.equal(vm.runInContext("exercises.find(e => e.id === 'old').restSeconds", context), 120);
  const count = context.exercises.length;
  context.init();
  assert.equal(context.exercises.length, count);
  for (const name of ['גרביטון', 'סקוואט', 'כפיפות בטן לצדדים', 'לחיצת כתפיים בישיבה']) {
    assert.equal(context.exercises.filter((entry) => entry.name === name).length, 1);
  }
});

test('local history, active weights, settings, and profile survive a fresh module instance', () => {
  const stored = new Map();
  const storage = { getItem: (key) => stored.get(key) || null, setItem: (key, value) => stored.set(key, value),
    removeItem: (key) => stored.delete(key) };
  const createDb = () => {
    const context = vm.createContext({ localStorage: storage });
    vm.runInContext(read('www/js/db.js').replace(/^export /gm, ''), context);
    return context;
  };
  const before = createDb();
  before.saveWorkouts([{ id: 'history', entries: [{ sets: [{ weightKg: 22.5, reps: 12, completed: true }] }] }]);
  before.saveActiveSession({ entries: [{ sets: [{ weightKg: '27.5', reps: '9', completed: false }] }] });
  before.saveSettings({ restSeconds: 135, voiceCommandsEnabled: false, faceIdEnabled: true });
  before.saveProfile({ weightHistory: [{ dateISO: '2026-10-18', weightKg: 80 }] });
  const after = createDb();
  assert.equal(after.getWorkouts()[0].entries[0].sets[0].weightKg, 22.5);
  assert.equal(after.getActiveSession().entries[0].sets[0].weightKg, '27.5');
  assert.equal(after.getSettings().voiceCommandsEnabled, false);
  assert.equal(after.getSettings().faceIdEnabled, true);
  assert.equal(after.getProfile().weightHistory[0].weightKg, 80);
});

for (const finish of [false, true]) {
  test(`${finish ? 'finishing' : 'cancelling'} clears rest/hold timers without losing saved history`, () => {
    const calls = [];
    let saved = null;
    const context = vm.createContext({
      activeSession: { id: 'workout', running: true, startedAt: '2026-10-18T07:00:00Z', entries: [
        { exerciseId: 'bench', exerciseName: 'Bench', sets: [
          { weightKg: 20, reps: 12, completed: true }, { weightKg: 25, reps: 6, completed: false },
        ] },
      ] },
      workouts: [], settings: { voiceAnnouncements: false }, voiceCountingState: {}, lastVoiceAction: {},
      activityReadyEnabled: true,
      holdTimers: new Map([['bench:0', { intervalId: 42 }]]),
      restTimer: { stop: () => calls.push('restStop') },
      stopwatch: { stop: () => 120 },
      clearInterval: (id) => calls.push(id),
      db: { saveWorkouts: (data) => { saved = data; }, clearActiveSession: () => calls.push('clearDraft') },
      buildDraftSession: () => ({ running: false, entries: [] }),
      updateVoiceBadgeForListeningState() {}, renderWorkoutTab() {}, renderHistoryTab() {},
      showToast() {}, showCelebration() {},
      syncWorkoutActivity() {},
      syncNativeAnnouncementPlan() {},
      cancelWorkoutGreeting() {},
      el: () => ({ classList: { add() {}, remove() {} } }),
      native: { isNative: () => true, bgCancelAnnouncements() {}, bgStopKeepAlive() {} },
      syncWorkoutToHealth: () => calls.push('health'),
    });
    vm.runInContext(section('function doCancelWorkout()', 'const CELEBRATION_MESSAGES'), context);
    vm.runInContext(section('function finishWorkout()', 'function persistActiveSession()'), context);
    vm.runInContext(section('function stopWorkoutTimers()', 'function renderWorkoutTab()'), context);
    if (finish) context.finishWorkout(); else context.doCancelWorkout();
    assert.equal(context.activityReadyEnabled, false);
    assert.ok(calls.includes('restStop') && calls.includes(42) && calls.includes('clearDraft'));
    assert.equal(context.holdTimers.size, 0);
    assert.equal(context.lastVoiceAction, null);
    if (finish) {
      assert.equal(saved.length, 1);
      assert.equal(saved[0].entries[0].sets.length, 1);
      assert.equal(saved[0].entries[0].sets[0].weightKg, 20);
      assert.ok(calls.includes('health'));
      assert.equal(saved[0].healthSyncPending, true);
    } else {
      assert.equal(saved, null);
      assert.ok(!calls.includes('health'));
    }
  });
}

test('volume and set metrics exclude warm-up/cool-down without mutating historical values', () => {
  const workout = { entries: [
    { type: 'cardio', durationSec: 300 },
    { exerciseId: 'bench', sets: [{ weightKg: 20, reps: 12 }, { weightKg: 25, reps: 10 }] },
  ] };
  const before = JSON.stringify(workout);
  const context = vm.createContext({});
  vm.runInContext(section('function computeVolume(', 'function formatDate('), context);
  assert.equal(context.computeVolume(workout), 490);
  assert.equal(JSON.stringify(workout), before);
});

function activityContext() {
  const calls = [], messages = [];
  const context = vm.createContext({
    activeSession: { id: 'session', running: true, startedAt: '2026-10-18T08:00:00Z',
      currentExerciseId: 'bench', entries: [
        { exerciseId: 'warmup', type: 'cardio', durationSec: 300, completed: true },
        { exerciseId: 'bench', exerciseName: 'Bench', sets: [{ completed: true }, { completed: false }] },
        { exerciseId: 'hold', exerciseName: 'Hold', sets: [{ completed: false }] },
      ] },
    exercises: [{ id: 'hold', holdSeconds: 15 }], holdTimers: new Map(),
    restTimer: { running: false, isRunning() { return this.running; } },
    native: { isNative: () => true, syncWorkoutActivity: async (data) => {
      calls.push(data); return { ok: true, active: data.running || data.preview };
    } },
    appInitialized: true, activitySyncQueued: false, activitySnapshotKey: '',
    activitySyncChain: Promise.resolve(), activityError: '', activitySyncRevision: 0,
    activityPreviewStartedAt: 1234000,
    activityReadyEnabled: true,
    queueMicrotask, console, el: () => null, showToast: (message) => messages.push(message),
    isEntryDone: (entry) => entry.type === 'cardio' ? entry.completed : entry.sets.every((set) => set.completed),
  });
  vm.runInContext(section('function buildWorkoutActivityPayload()', 'function stopWorkoutTimers()'), context);
  return { context, calls, messages };
}

const settleActivity = async (context) => {
  await new Promise((resolve) => setImmediate(resolve));
  await context.activitySyncChain;
};

test('Live Activity uses absolute timestamps and counts strength sets, not cardio rows', () => {
  const { context } = activityContext();
  let payload = context.buildWorkoutActivityPayload();
  assert.equal(payload.startMillis, Date.parse('2026-10-18T08:00:00Z'));
  assert.equal(payload.exerciseName, 'Bench');
  assert.equal(payload.totalSets, 3);
  assert.equal(payload.completedSets, 1);
  assert.equal(payload.phase, 'workout');
  Object.assign(context.restTimer, { running: true, endAt: 200000, totalSeconds: 90 });
  payload = context.buildWorkoutActivityPayload();
  assert.equal(payload.phase, 'rest');
  assert.equal(payload.phaseStartMillis, 110000);
  assert.equal(payload.phaseEndMillis, 200000);
  context.restTimer.running = false;
  context.activeSession.currentExerciseId = 'hold';
  context.holdTimers.set('hold:0', { startedAt: 100000 });
  payload = context.buildWorkoutActivityPayload();
  assert.equal(payload.phase, 'hold');
  assert.equal(payload.exerciseName, 'Hold');
  assert.equal(payload.phaseEndMillis, 115000);
  context.holdTimers.clear();
  const cardio = context.activeSession.entries[0];
  context.activeSession.currentExerciseId = 'warmup';
  Object.assign(cardio, { completed: false, startedAt: 100000, elapsedSec: 70 });
  payload = context.buildWorkoutActivityPayload();
  assert.equal(payload.phase, 'cardio');
  assert.equal(payload.phaseEndMillis, 330000);
  context.activeSession.running = false;
  payload = context.buildWorkoutActivityPayload();
  assert.equal(payload.running, false);
  assert.equal(payload.preview, true);
  assert.equal(payload.phase, 'ready');
  assert.equal(payload.sessionID, 'ready:session');
  assert.equal(payload.phaseStartMillis, null);
  assert.equal(payload.phaseEndMillis, null);
  assert.equal(payload.startMillis, 1234000);
});

test('selected exercise stays current in Live Activity even if another timer is still running', () => {
  const { context } = activityContext();
  context.holdTimers.set('hold:0', { startedAt: 100000 });
  Object.assign(context.activeSession.entries[0], { completed: false, startedAt: 100000 });
  const payload = context.buildWorkoutActivityPayload();
  assert.equal(payload.exerciseName, 'Bench');
  assert.equal(payload.phase, 'workout');
});

test('Live Activity batches unchanged edits and serializes start, rest, extension, skip, and finish', async () => {
  const { context, calls } = activityContext();
  for (let i = 0; i < 20; i++) context.syncWorkoutActivity();
  await settleActivity(context);
  assert.equal(calls.length, 1);
  context.syncWorkoutActivity();
  await settleActivity(context);
  assert.equal(calls.length, 1);
  Object.assign(context.restTimer, { running: true, endAt: 200000, totalSeconds: 90 });
  context.syncWorkoutActivity();
  await settleActivity(context);
  context.restTimer.endAt += 15000;
  context.restTimer.totalSeconds += 15;
  context.syncWorkoutActivity();
  await settleActivity(context);
  context.restTimer.running = false;
  context.syncWorkoutActivity();
  await settleActivity(context);
  context.activeSession.running = false;
  context.activityReadyEnabled = false;
  context.syncWorkoutActivity();
  await settleActivity(context);
  assert.deepEqual(calls.map((data) => data.phase || 'ended'), ['workout', 'rest', 'rest', 'workout', 'ended']);
  assert.equal(calls[2].phaseEndMillis - calls[1].phaseEndMillis, 15000);
});

test('Live Activity denial is visible, retryable, and does not stop the workout', async () => {
  const { context, messages } = activityContext();
  context.native.syncWorkoutActivity = async () => ({ ok: false, reason: 'disabled in iPhone Settings' });
  context.syncWorkoutActivity();
  await settleActivity(context);
  context.syncWorkoutActivity();
  await settleActivity(context);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /disabled/);
  assert.equal(context.activeSession.running, true);
  assert.equal(context.activitySnapshotKey, '');
});

test('opening without a workout requests a ready activity without starting timers or changing session data', async () => {
  const { context, calls } = activityContext();
  context.activeSession.running = false;
  context.activeSession.startedAt = null;
  const before = JSON.stringify(context.activeSession);
  context.syncWorkoutActivity();
  await settleActivity(context);
  assert.equal(calls[0].preview, true);
  assert.equal(calls[0].running, false);
  assert.equal(calls[0].phase, 'ready');
  assert.equal(JSON.stringify(context.activeSession), before);
  context.syncWorkoutActivity();
  await settleActivity(context);
  assert.equal(calls.length, 1);
});

test('foreground availability retries an unchanged activity after Face ID or OS lifetime expiry', () => {
  let callback, retried = 0;
  const context = vm.createContext({
    native: { onWorkoutActivityAvailable: (listener) => { callback = listener; } },
    activitySnapshotKey: 'previous', syncWorkoutActivity: () => { retried++; },
  });
  vm.runInContext(section('native.onWorkoutActivityAvailable(', 'native.onAnnouncementError('), context);
  callback();
  assert.equal(context.activitySnapshotKey, '');
  assert.equal(retried, 1);
  assert.match(read('ios/App/App/LiveActivityBridgePlugin.swift'), /UIApplication.didBecomeActiveNotification/);
});

test('browser never calls ActivityKit and native bridge failures cannot report successful activation', async () => {
  const { context, calls } = activityContext();
  context.native.isNative = () => false;
  context.syncWorkoutActivity();
  await settleActivity(context);
  assert.equal(calls.length, 0);
  const bridge = bridgeContext({ LiveActivityBridge: { sync: async () => { throw Error('not authorized'); } } });
  const result = await bridge.syncWorkoutActivity({ running: true });
  assert.equal(result.ok, false);
  assert.match(result.reason, /not authorized/);
});

test('Live Activity extension is embedded, shares its exact data type, signs separately, and supports workout links', () => {
  const project = read('ios/App/App.xcodeproj/project.pbxproj');
  assert.match(project, /dstSubfolderSpec = 13/);
  assert.match(project, /productType = "com.apple.product-type.app-extension"/);
  assert.match(project, /WorkoutActivityAttributes.swift in Extension Sources/);
  assert.match(project, /PROVISIONING_PROFILE_SPECIFIER = "AutoFit Live Activity AppStore"/);
  assert.match(read('.github/workflows/ios-build.yml'), /<key>com.sasidaniel.autofit.liveactivity<\/key>/);
  assert.match(read('ios/App/App/Info.plist'), /<key>NSSupportsLiveActivities<\/key>\s*<true\/>/);
  const widget = read('ios/App/AutoFitLiveActivity/AutoFitLiveActivity.swift');
  assert.match(widget, /Text\(timerInterval: start\.\.\.end, countsDown: true\)/);
  assert.match(widget, /autofit:\/\/workout/);
  for (const presentation of ['compactLeading', 'compactTrailing', 'minimal', 'DynamicIslandExpandedRegion']) {
    assert.ok(widget.includes(presentation));
  }
  assert.doesNotMatch(widget, /Button\(|AppIntent/);
  assert.match(read('ios/App/App/LiveActivityBridgePlugin.swift'), /AutoFitDismissedActivitySession/);
  assert.match(read('ios/App/App/SceneDelegate.swift'), /connectionOptions.urlContexts.forEach/);
});

test('rest state restores its original deadline without replaying old interval announcements', () => {
  const { rest, advance } = timerContext();
  const events = [];
  const timer = rest({ onTick() {}, onInterval: (n) => events.push(n), onDone: () => events.push('done') });
  advance(70);
  timer.restore({ endAt: 91000, totalSeconds: 90, lastAnnouncedElapsed: 0 });
  assert.equal(timer.endAt, 91000);
  assert.equal(timer.lastAnnouncedElapsed, 60);
  assert.equal(events.length, 0);
  advance(20); timer.forceTick(); timer.forceTick();
  assert.deepEqual(events, ['done']);
});

test('throttled rest ticks do not announce obsolete 30-second marks on resume', () => {
  const { rest, advance } = timerContext();
  const events = [];
  const timer = rest({ onTick() {}, onInterval: (n) => events.push(n), onDone() {} });
  timer.start(120);
  advance(75); timer.forceTick(); timer.forceTick();
  assert.equal(events.length, 0);
  advance(15); timer.forceTick();
  assert.deepEqual(events, [90]);
});

test('negated speech and app announcements cannot finish a set or overwrite its count', () => {
  const entry = { exerciseId: 'bench', sets: [{ reps: '', completed: false }] };
  const { context } = voiceContext([entry]);
  context.handleVoiceTranscript('התחל סט');
  context.handleVoiceTranscript('שלוש');
  for (const phrase of ['לא סיימתי', 'עוד לא סט הסתיים', 'עברו 30 שניות']) context.handleVoiceTranscript(phrase);
  assert.equal(entry.sets[0].reps, 3);
  assert.equal(entry.sets[0].completed, false);
});

test('rep counting keeps its model target when exercises are reordered', () => {
  const entry = { exerciseId: 'bench', sets: [{ reps: '', completed: false }] };
  const other = { exerciseId: 'row', sets: [{ reps: '', completed: false }] };
  const { context } = voiceContext([entry, other]);
  context.handleVoiceTranscript('התחל סט');
  context.activeSession.entries.reverse();
  context.qs = () => null;
  context.handleVoiceTranscript('שבע');
  assert.equal(entry.sets[0].reps, 7);
  assert.equal(other.sets[0].reps, '');
});

test('full-program weeks honor custom default set counts above three', () => {
  const context = vm.createContext({ settings: { programWeek: 3 } });
  vm.runInContext(section('function setsForWeek(', 'function applyProgramWeekToActiveSession('), context);
  assert.equal(context.setsForWeek({ defaultSets: 5 }), 5);
  context.settings.programWeek = 1;
  assert.equal(context.setsForWeek({ defaultSets: 5 }), 1);
  context.settings.programWeek = 2;
  assert.equal(context.setsForWeek({ defaultSets: 5 }), 2);
  assert.equal(context.setsForWeek({ defaultSets: 1 }), 1);
});

test('removing a populated or running set requires confirmation and clears its timer and voice references', () => {
  let confirmed = false;
  const entry = { exerciseId: 'hold', sets: [{ completed: false }, { reps: 12, completed: true }] };
  const last = entry.sets[1], cleared = [];
  const context = vm.createContext({
    confirm: () => confirmed, holdTimers: new Map([['hold:1', { intervalId: 42 }]]),
    voiceCountingState: { entry, set: last }, lastVoiceAction: { entry, set: last },
    clearInterval: (id) => cleared.push(id), persistActiveSession() {}, renderWorkoutTab() {},
    updateVoiceBadgeForListeningState() {},
  });
  vm.runInContext(section('function removeLastWorkoutSet(', 'function updateProgress('), context);
  context.removeLastWorkoutSet(entry);
  assert.equal(entry.sets.length, 2);
  assert.equal(context.holdTimers.size, 1);
  confirmed = true;
  context.removeLastWorkoutSet(entry);
  assert.equal(entry.sets.length, 1);
  assert.equal(context.holdTimers.size, 0);
  assert.equal(context.voiceCountingState, null);
  assert.equal(context.lastVoiceAction, null);
  assert.deepEqual(cleared, [42]);
});

test('a hold target announces only once even after its display is rebound', () => {
  const { context, timers, advance } = timerContext();
  let announcements = 0;
  Object.assign(context, { persistActiveSession() {}, formatHMS: String, playBeep() {}, notify() {},
    settings: { voiceAnnouncements: true }, speak: () => announcements++ });
  vm.runInContext(section('function startHoldTicking(', 'function renderHoldCell('), context);
  const state = { startedAt: context.Date.now(), announced: false }, set = {};
  const display = { classList: { add() {} } };
  context.startHoldTicking(display, state, 15, set);
  advance(15);
  [...timers.values()][0]();
  context.startHoldTicking({ classList: { add() {} } }, state, 15, set);
  for (const tick of timers.values()) tick();
  assert.equal(announcements, 1);
  assert.equal(set.holdAnnounced, true);
});

test('finishing or cancelling clears the cloud copy of an active workout as well as local storage', () => {
  const stored = new Map(), sync = [];
  const context = vm.createContext({
    localStorage: { getItem: (key) => stored.get(key), setItem: (key, value) => stored.set(key, value),
      removeItem: (key) => stored.delete(key) },
  });
  vm.runInContext(read('www/js/db.js').replace(/^export /gm, ''), context);
  context.setSyncHook((key, value) => sync.push([key, value]));
  context.saveActiveSession({ running: true });
  context.clearActiveSession();
  assert.equal(context.getActiveSession(), null);
  assert.deepEqual(sync.at(-1), ['ft_active_session_v1', null]);
});

test('native announcements use system-managed speech, without permanently ducking microphone or startup audio', async () => {
  const calls = [];
  const bridge = bridgeContext({ BackgroundAnnouncer: { speakNow: async (data) => calls.push(data.text) } });
  await bridge.announce('test announcement');
  assert.deepEqual(calls, ['test announcement']);
  assert.match(read('ios/App/App/BackgroundAnnouncerPlugin.swift'), /usesApplicationAudioSession = true/);
  assert.doesNotMatch(read('ios/App/App/VoiceCommandPlugin.swift'), /\.duckOthers/);
  assert.match(read('ios/App/App/AppDelegate.swift'), /if ducking \{ options.insert\(.duckOthers\) \}/);
  const announcer = read('ios/App/App/BackgroundAnnouncerPlugin.swift');
  assert.match(announcer, /usesRecordingSession, ducking: true/);
  assert.match(announcer, /audioEngine.stop\(\)[\s\S]*WorkoutAudioSession.deactivate\(\)/);
});

test('native beep and speech never create a WebView audio context that could interrupt Apple Music', async () => {
  const calls = [];
  const context = vm.createContext({
    isNative: () => true,
    beep: async () => calls.push('beep'), announce: async (text) => calls.push(text),
    window: { get AudioContext() { assert.fail('Native cues must not activate Web Audio'); } },
  });
  vm.runInContext(read('www/js/timer.js').replace(/^import .*$/gm, '').replace(/^export /gm, ''), context);
  context.playBeep();
  context.speak('סט הושלם, זמן מנוחה');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(calls, ['beep', 'סט הושלם, זמן מנוחה']);
});

test('audio activates only on demand, mixes for every owner, and recognition ignores app announcements', () => {
  const delegate = read('ios/App/App/AppDelegate.swift');
  const announcer = read('ios/App/App/BackgroundAnnouncerPlugin.swift');
  const voice = read('ios/App/App/VoiceCommandPlugin.swift');
  assert.match(delegate, /options: AVAudioSession.CategoryOptions = \[.mixWithOthers\]/);
  assert.match(delegate, /let changed = !matches\(recording: recording, ducking: ducking\)/);
  assert.doesNotMatch(delegate.slice(delegate.indexOf('@UIApplicationMain')), /setCategory|setActive|WorkoutAudioSession.activate/);
  assert.match(announcer, /WorkoutAudioSession.activate\(recording: VoiceCommandPlugin.usesRecordingSession\)/);
  assert.match(voice, /WorkoutAudioSession.activate\(recording: true\)/);
  assert.match(voice, /!BackgroundAnnouncerPlugin.isAnnouncing/);
  assert.match(voice, /BackgroundAnnouncerPlugin.announcementEnded/);
  assert.match(delegate, /notifyOthersOnDeactivation/);
  assert.doesNotMatch(announcer + voice, /setCategory\(/);
});

test('music routing never opts into HFP or voice-chat mode and capability-gates microphone enhancements', () => {
  const swift = read('ios/App/App/AppDelegate.swift');
  assert.doesNotMatch(swift, /\.voiceChat|\.allowBluetooth\b|overrideOutputAudioPort/);
  assert.match(swift, /setCategory\(category, mode: .default/);
  assert.match(swift, /#available\(iOS 26.0, \*\).*bluetoothHighQualityRecording/);
  assert.match(swift, /highQualityRecording.isSupported == true/);
  assert.match(swift, /case .builtIn: preferred = inputs.first \{ \$0.portType == .builtInMic \}/);
  assert.match(swift, /#available\(iOS 18.2, \*\), session.isEchoCancelledInputAvailable/);
  assert.match(swift, /setPrefersEchoCancelledInput\(true\)/);
  assert.match(swift, /if !active \|\| changed/);
  assert.match(read('ios/App/App/BackgroundAnnouncerPlugin.swift'), /WorkoutAudioSession.wasInterrupted/);
  assert.match(read('ios/App/App.xcodeproj/project.pbxproj'), /WorkoutAudioPolicy.swift in Sources/);
  assert.match(read('.github/workflows/ios-build.yml'), /WorkoutAudioPolicyTests.swift/);
});

test('recognition task replacement reuses capture and synchronizes request access with the audio thread', () => {
  const swift = read('ios/App/App/VoiceCommandPlugin.swift');
  const begin = swift.slice(swift.indexOf('private func begin()'), swift.indexOf('private func endRecognition()'));
  assert.doesNotMatch(begin.slice(0, begin.indexOf('let currentGeneration')), /\bend\(\)|audioEngine.stop\(\)/);
  assert.match(begin, /if !audioEngine.isRunning \{[\s\S]*installTap[\s\S]*audioEngine.start\(\)/);
  assert.match(begin, /audioSink.replace\(with: req\)/);
  assert.match(swift, /private let lock = NSLock\(\)/);
  assert.match(swift, /lock.lock\(\)[\s\S]*request\?\.endAudio\(\)[\s\S]*request = next[\s\S]*lock.unlock\(\)/);
  assert.match(swift, /lock.lock\(\)[\s\S]*request\?\.append\(buffer\)[\s\S]*lock.unlock\(\)/);
  assert.match(swift, /captureGeneration == capture/);
});

test('actual microphone name survives the bridge and route-change events', async () => {
  const listeners = {};
  const context = bridgeContext({ VoiceCommand: {
    startListening: async () => ({ inputName: 'iPhone microphone' }),
    addListener: (name, callback) => { listeners[name] = callback; },
  } });
  assert.equal((await context.voiceStartListening()).inputName, 'iPhone microphone');
  let inputName;
  context.onVoiceInputChanged((data) => { inputName = data.inputName; });
  listeners.voiceInputChanged({ inputName: 'AirPods' });
  assert.equal(inputName, 'AirPods');
  assert.match(app, /native.onVoiceInputChanged\(\(data\) =>/);
  assert.match(app, /voiceInputName = result.inputName \|\| ''/);
});

test('listening badge identifies the actual microphone alongside the selected exercise', () => {
  const badge = { classList: { add() {}, remove() {}, toggle() {} }, textContent: '' };
  const context = vm.createContext({
    native: { isNative: () => true }, el: () => badge,
    activeSession: { currentExerciseId: 'bench', entries: [{ exerciseId: 'bench', exerciseName: 'Bench' }] },
    voiceListeningActive: true, voiceListeningError: '', voiceCountingState: null,
    voiceInputName: 'iPhone microphone',
  });
  vm.runInContext(section('function setVoiceBadge(', 'function handleVoiceTranscript('), context);
  context.updateVoiceBadgeForListeningState();
  assert.match(badge.textContent, /iPhone microphone.*Bench/);
});

test('repeated selection of the same exercise does not serialize or back up unchanged workout state', () => {
  let writes = 0;
  const context = vm.createContext({
    activeSession: { entries: [{ exerciseId: 'one' }, { exerciseId: 'two' }] },
    voiceCountingState: null, persistActiveSession: () => writes++,
    updateVoiceBadgeForListeningState() {},
  });
  vm.runInContext(section('function selectVoiceExercise(', 'function voiceTargetEntryIndex('), context);
  context.selectVoiceExercise(0, false);
  context.selectVoiceExercise(0, false);
  context.selectVoiceExercise(0, false);
  assert.equal(writes, 1);
  context.selectVoiceExercise(1, false);
  assert.equal(writes, 2);
});

test('subsecond rest ticks do not repeatedly replace unchanged visible timer text', () => {
  let text = '', writes = 0;
  const context = vm.createContext({
    el: () => ({ get textContent() { return text; }, set textContent(value) { text = value; writes++; } }),
    formatHMS: (seconds) => String(Math.ceil(seconds)),
  });
  const tick = section('onTick: (remaining) => {', 'onInterval:')
    .replace('onTick: ', '').replace(/,\s*$/, '');
  vm.runInContext(`globalThis.tick = ${tick}`, context);
  for (const remaining of [120, 119.75, 119.5, 119.25]) context.tick(remaining);
  assert.equal(writes, 1);
  context.tick(119);
  assert.equal(writes, 2);
});

test('offline navigation with query parameters falls back to the cached app without deleting unrelated caches', async () => {
  const handlers = {}, deleted = [];
  const offline = { app: true };
  const context = vm.createContext({
    self: { location: { origin: 'https://example.test' }, clients: { claim: async () => {} },
      addEventListener: (name, callback) => { handlers[name] = callback; } },
    URL, Response, fetch: async () => { throw Error('offline'); },
    caches: {
      keys: async () => ['another-app-cache', 'autofit-v38', 'autofit-v40', 'autofit-v43', 'autofit-v44', 'autofit-v45', 'autofit-v46'],
      delete: async (key) => { deleted.push(key); },
      match: async (request) => request === './index.html' ? offline : undefined,
    },
  });
  vm.runInContext(read('www/service-worker.js'), context);
  let done;
  handlers.activate({ waitUntil: (promise) => { done = promise; } });
  await done;
  assert.deepEqual(deleted, ['autofit-v38', 'autofit-v40', 'autofit-v43', 'autofit-v44', 'autofit-v45']);
  let response;
  handlers.fetch({ request: { method: 'GET', mode: 'navigate', url: 'https://example.test/?tab=workout' },
    respondWith: (promise) => { response = promise; } });
  assert.equal(await response, offline);
});

test('every offline-precache asset exists in the bundled app', () => {
  const worker = read('www/service-worker.js');
  const assets = [...worker.matchAll(/'(\.\/[^']*)'/g)].map((match) => match[1]);
  for (const asset of assets) assert.ok(fs.existsSync(path.join(root, 'www', asset)), asset);
});

test('pausing and resuming cardio banks elapsed time without shortening the history duration', () => {
  let now = 1000000;
  const callbacks = {};
  const entry = { exerciseId: 'warmup', type: 'cardio', exerciseName: 'Walk', durationSec: 300 };
  const context = vm.createContext({
    Date: { now: () => now }, exercises: [], activeSession: { entries: [entry] }, settings: {},
    document: { createElement: () => ({}) }, formatHMS: String, escapeHtml: String, escapeAttr: String,
    qs: (selector) => ({ setAttribute() {}, addEventListener: (name, callback) => { callbacks[selector] = callback; } }),
    ensureWorkoutStarted() {}, persistActiveSession() {}, renderWorkoutTab() {},
    restTimer: { stop() {} }, el: () => ({ classList: { add() {} } }),
  });
  vm.runInContext(section('function renderCardioCard(', 'function tickCardioTimers('), context);
  context.renderCardioCard(entry, 1);
  callbacks['.btnCardioStart']();
  now += 70000;
  callbacks['.btnCardioStart']();
  assert.equal(entry.durationSec, 300);
  assert.equal(entry.elapsedSec, 70);
  assert.equal(entry.startedAt, null);
  callbacks['.btnCardioStart']();
  now += 10000;
  callbacks['.btnCardioStart']();
  assert.equal(entry.elapsedSec, 80);
  assert.equal(entry.durationSec, 300);
  callbacks['.btnCardioDone']();
  assert.equal(entry.completed, true);
  assert.equal(entry.elapsedSec, 300);
  callbacks['.btnCardioReset']();
  assert.equal(entry.elapsedSec, 0);
  assert.equal(entry.completed, false);
});

test('cloud-restored history and active weights enter memory before initialization, without destructive reloads', async () => {
  const data = {
    ft_settings_v1: JSON.stringify({ onboardingComplete: true, faceIdEnabled: false }),
    ft_profile_v1: JSON.stringify({ name: 'Restored' }),
    ft_workouts_v1: JSON.stringify([{ id: 'old', entries: [] }]),
    ft_active_session_v1: JSON.stringify({ id: 'unfinished', entries: [{ sets: [{ weightKg: 27.5 }] }] }),
  };
  const stored = new Map();
  let cloudChanged, observed;
  const context = vm.createContext({
    settings: {}, profile: {}, workouts: [], activeSession: null, console,
    native: { isNative: () => true, cloudGetAll: async () => data,
      onCloudChanged: (callback) => { cloudChanged = callback; },
      onCloudError() {}, onVoiceTranscript() {}, onVoiceError() {}, onVoiceInputChanged() {}, onWorkoutActivityOpen() {},
      onWorkoutActivityAvailable() {}, onAnnouncementError() {} },
    localStorage: { getItem: (key) => stored.get(key), setItem: (key, value) => stored.set(key, value) },
    db: {
      getSettings: () => JSON.parse(stored.get('ft_settings_v1')),
      getProfile: () => JSON.parse(stored.get('ft_profile_v1')),
      getWorkouts: () => JSON.parse(stored.get('ft_workouts_v1')),
      getActiveSession: () => JSON.parse(stored.get('ft_active_session_v1')),
      setSyncHook() {},
    },
    waitForSplashMinimum: async () => {}, hideSplash() {}, URLSearchParams,
    location: { search: '', reload: () => assert.fail('A cloud update must not reload an active workout') },
    init: () => { observed = { workouts: context.workouts, activeSession: context.activeSession }; },
  });
  vm.runInContext(section('async function restoreFromCloudIfEmpty()', '\n}') + '\n}', context);
  vm.runInContext(section('async function bootstrap()', 'function waitForSplashMinimum('), context);
  await context.bootstrap();
  assert.equal(observed.workouts[0].id, 'old');
  assert.equal(observed.activeSession.entries[0].sets[0].weightKg, 27.5);
  cloudChanged();
  assert.equal(context.activeSession.id, 'unfinished');
});

test('failed or cancelled Face ID offers a working retry without destroying the app document', async () => {
  let click, removed = false, attempts = 0;
  const button = { disabled: false, addEventListener: (_, callback) => { click = callback; } };
  const status = {};
  const overlay = { setAttribute() {}, remove: () => { removed = true; } };
  const context = vm.createContext({
    native: { biometricVerify: async () => ++attempts >= 3 }, hideSplash() {},
    document: { createElement: () => overlay, body: { appendChild() {} } },
    qs: (selector) => selector === '.btnRetryUnlock' ? button : status,
  });
  vm.runInContext(section('async function unlockWithBiometrics()', '// Native-only bootstrap:'), context);
  const unlocking = context.unlockWithBiometrics();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(typeof click, 'function');
  await click();
  assert.equal(removed, false);
  assert.equal(button.disabled, false);
  await click();
  await unlocking;
  assert.equal(removed, true);
  assert.equal(attempts, 3);
});

test('exercise sorting does not stack handlers across renders and cancels a gesture cleanly', () => {
  const listeners = new Map(), reordered = [];
  const dragged = { dataset: { id: 'second' }, classList: { add() {}, remove() {} },
    setPointerCapture() {}, releasePointerCapture() {} };
  const children = [{ dataset: { id: 'first' } }, dragged];
  const list = {};
  const context = vm.createContext({
    qsa: () => children,
    document: { addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: (name) => listeners.delete(name) },
  });
  vm.runInContext(section('function makeSortable(', 'function reorderActiveSessionToMatchExercises('), context);
  for (let i = 0; i < 20; i++) context.makeSortable(list, (order) => reordered.push(Array.from(order)));
  list.onpointerdown({ pointerId: 1, preventDefault() {},
    target: { closest: () => ({ closest: () => dragged }) } });
  listeners.get('pointercancel')({ type: 'pointercancel' });
  assert.equal(reordered.length, 1);
  assert.deepEqual(reordered[0], ['first', 'second']);
  assert.equal(listeners.size, 0);
});

test('invalid tab links preserve the current screen instead of throwing after hiding all panels', () => {
  let changed = false, logged = false;
  const context = vm.createContext({
    el: () => null, qsa: () => { changed = true; return []; },
    console: { warn: () => { logged = true; } },
  });
  vm.runInContext(section('function switchTab(', '/* ---------------- live clock'), context);
  context.switchTab('missing-tab');
  assert.equal(changed, false);
  assert.equal(logged, true);
});

test('local storage quota failures are visible, do not report cloud success, and retain prior data', () => {
  const previous = JSON.stringify([{ id: 'saved' }]), events = [];
  let synced = false;
  class StorageEvent {
    constructor(type, options) { this.type = type; this.detail = options.detail; }
  }
  const context = vm.createContext({
    localStorage: { getItem: () => previous, setItem: () => { throw Error('Quota exceeded'); } },
    console: { error() {} }, window: { dispatchEvent: (event) => events.push(event) }, CustomEvent: StorageEvent,
  });
  vm.runInContext(read('www/js/db.js').replace(/^export /gm, ''), context);
  context.setSyncHook(() => { synced = true; });
  assert.throws(() => context.saveWorkouts([{ id: 'new' }]), /Quota exceeded/);
  assert.equal(synced, false);
  assert.equal(context.getWorkouts()[0].id, 'saved');
  assert.equal(events[0].type, 'autofit-storage-error');
});

test('voice stop pauses warmup and cooldown without accidentally restarting an already paused timer', () => {
  for (const [name, stop] of [['חימום', 'עצור'], ['שחרור', 'שחרור עצור'], ['חימום', 'השהה חימום']]) {
    const entry = { exerciseId: name, exerciseName: name, type: 'cardio', durationSec: 300 };
    const { context, calls } = voiceContext([entry]);
    context.handleVoiceTranscript(`התחל ${name}`);
    assert.ok(entry.startedAt);
    context.handleVoiceTranscript(stop);
    assert.equal(entry.startedAt, null);
    assert.equal(entry.completed, false);
    context.handleVoiceTranscript(stop);
    assert.equal(entry.startedAt, null);
    assert.equal(calls.filter((call) => call === 'stopCardio').length, 1);
    context.handleVoiceTranscript('התחל');
    assert.ok(entry.startedAt);
  }
});

test('voice stop uses the plank manual completion button and does not start an idle hold', () => {
  const entry = { exerciseId: 'plank', exerciseName: 'פלאנק', inputType: 'hold', sets: [{ completed: false }] };
  const { context, calls } = voiceContext([entry]);
  context.handleVoiceTranscript('עצור');
  assert.ok(!calls.includes('startHold'));
  context.handleVoiceTranscript('פלאנק התחל');
  context.handleVoiceTranscript('עצור פלאנק');
  assert.equal(entry.sets[0].completed, true);
  assert.ok(calls.includes('stopHold') && calls.includes('rest'));
});

test('voice stop ends rep counting without marking a set completed or starting rest', () => {
  const entry = { exerciseId: 'bench', exerciseName: 'לחיצת חזה', sets: [{ completed: false }] };
  const { context, calls } = voiceContext([entry]);
  context.handleVoiceTranscript('התחל סט');
  context.handleVoiceTranscript('חמש');
  context.handleVoiceTranscript('עצור');
  assert.equal(entry.sets[0].reps, 5);
  assert.equal(entry.sets[0].completed, false);
  assert.equal(vm.runInContext('voiceCountingState', context), null);
  assert.ok(!calls.includes('rest'));
});

test('an obsolete activity failure cannot overwrite the latest state or display a false error', async () => {
  const { context, messages } = activityContext();
  let resolveFirst;
  let requests = 0;
  context.native.syncWorkoutActivity = async () => {
    if (++requests === 1) return new Promise((resolve) => { resolveFirst = resolve; });
    return { ok: true, active: true };
  };
  context.syncWorkoutActivity();
  await new Promise((resolve) => setImmediate(resolve));
  context.activeSession.currentExerciseId = 'hold';
  context.syncWorkoutActivity();
  await new Promise((resolve) => setImmediate(resolve));
  resolveFirst({ ok: false, reason: 'old authorization failure' });
  await settleActivity(context);
  assert.equal(requests, 2);
  assert.equal(messages.length, 0);
  assert.ok(context.activitySnapshotKey);
});

test('an activity deferred while the app is inactive shows pending status, not a failure toast', async () => {
  const { context, messages } = activityContext();
  const status = { classList: { remove() {} } };
  context.el = () => status;
  context.native.syncWorkoutActivity = async () => ({ ok: true, active: false, pending: true });
  context.syncWorkoutActivity();
  await settleActivity(context);
  assert.equal(messages.length, 0);
  assert.match(status.textContent, /כשחוזרים/);
  const swift = read('ios/App/App/LiveActivityBridgePlugin.swift');
  assert.match(swift, /existing.update\(content\)/);
  assert.match(swift, /"pending": true/);
  assert.ok(swift.indexOf('if let existing') < swift.indexOf('areActivitiesEnabled'));
});

test('a foreground retry of the exact same activity supersedes an older failed request', async () => {
  const { context, messages } = activityContext();
  let finishFirst, count = 0;
  context.native.syncWorkoutActivity = async () => ++count === 1
    ? new Promise((resolve) => { finishFirst = resolve; }) : { ok: true, active: true };
  context.syncWorkoutActivity();
  await new Promise((resolve) => setImmediate(resolve));
  context.activitySnapshotKey = '';
  context.syncWorkoutActivity();
  await new Promise((resolve) => setImmediate(resolve));
  finishFirst({ ok: false, reason: 'superseded' });
  await settleActivity(context);
  assert.equal(count, 2);
  assert.equal(messages.length, 0);
});

test('voice capture uses mono without voice-chat processing and preserves requested listening through announcements', () => {
  const swift = read('ios/App/App/VoiceCommandPlugin.swift');
  assert.doesNotMatch(swift, /setVoiceProcessingEnabled|isVoiceProcessingAGCEnabled|voiceProcessingOtherAudioDucking/);
  assert.match(swift, /channels: 1/);
  assert.match(swift, /buffer.floatChannelData\?\[0\]/);
  assert.match(swift, /announcementWillStart\(\)[\s\S]*if Self.wantsMicrophone \{ end\(\) \}/);
  assert.match(swift, /announcementFinished\(\)[\s\S]*guard Self.usesRecordingSession/);
  assert.match(swift, /Self.wantsMicrophone = false/);
});

function healthContext(records, overrides = {}) {
  const writes = [], saved = [], messages = [];
  const context = vm.createContext({
    workouts: records, healthSyncInFlight: new Set(), console,
    db: { saveWorkouts: (data) => saved.push(JSON.stringify(data)) },
    showToast: (message) => messages.push(message),
    sendWorkoutToHealthShortcut: () => assert.fail('Native sync must not open Shortcuts'),
    native: {
      isNative: () => true, healthRequestAuthorization: async () => ({ granted: true }),
      healthSaveWorkout: async (data) => { writes.push(data); return { saved: true }; },
      ...overrides,
    },
  });
  vm.runInContext(section('async function syncWorkoutToHealth(', 'function openHealthSyncHelp('), context);
  return { context, writes, saved, messages };
}

const healthRecord = () => ({
  id: 'stable-workout-id', dateISO: '2026-10-18T08:00:00Z', durationSec: 123.4,
  entries: [{ exerciseName: 'Bench', sets: [{ weightKg: 27.5, reps: 9, completed: true }] }],
});

test('Health persists pending delivery before native authorization and clears it only after confirmed saving', async () => {
  const record = healthRecord();
  const { context, writes, saved, messages } = healthContext([record]);
  context.native.healthRequestAuthorization = async () => {
    assert.equal(JSON.parse(saved[0])[0].healthSyncPending, true);
    return { granted: true };
  };
  await context.syncWorkoutToHealth([record]);
  assert.equal(writes[0].workoutID, record.id);
  assert.equal(writes[0].startMillis, Date.parse(record.dateISO));
  assert.equal(writes[0].durationSec, 123);
  assert.equal(writes[0].entries[0].sets[0].weightKg, 27.5);
  assert.equal(JSON.parse(saved.at(-1))[0].healthSyncPending, false);
  assert.ok(record.healthSyncedAt);
  assert.match(messages.at(-1), /נשמר באפליקציית הבריאות/);
});

test('denied Health permission survives a reload and retries with the same stable identifier', async () => {
  const record = healthRecord();
  const first = healthContext([record], {
    healthRequestAuthorization: async () => ({ granted: false, reason: 'write denied' }),
  });

  await first.context.syncWorkoutToHealth([record]);
  assert.equal(first.writes.length, 0);
  assert.match(first.messages[0], /write denied/);
  const restored = JSON.parse(first.saved.at(-1));
  assert.equal(restored[0].healthSyncPending, true);
  const second = healthContext(restored);
  await second.context.syncWorkoutToHealth(restored.filter((workout) => workout.healthSyncPending));
  assert.equal(second.writes[0].workoutID, record.id);
  assert.equal(restored[0].healthSyncPending, false);
  assert.match(app, /workouts.filter\(\(workout\) => workout.healthSyncPending === true\)/);
});

test('history/dashboard reloads during Health delivery cannot leave the current record pending', async () => {
  const record = healthRecord();
  let complete;
  const { context, saved } = healthContext([record], {
    healthSaveWorkout: () => new Promise((resolve) => { complete = resolve; }),
  });
  const syncing = context.syncWorkoutToHealth([record]);
  await new Promise((resolve) => setImmediate(resolve));
  context.workouts = JSON.parse(saved.at(-1));
  assert.notEqual(context.workouts[0], record);
  context.workouts[0].note = 'Keep concurrent changes';
  complete({ saved: true });
  await syncing;
  const persisted = JSON.parse(saved.at(-1))[0];
  assert.equal(persisted.healthSyncPending, false);
  assert.equal(persisted.note, 'Keep concurrent changes');
  assert.ok(persisted.healthSyncedAt);
});

test('failed Health saves stay pending and concurrent manual taps cannot dispatch duplicate writes', async () => {
  let complete;
  const record = healthRecord();
  const { context, messages } = healthContext([record], {
    healthSaveWorkout: () => new Promise((resolve) => { complete = resolve; }),
  });
  const first = context.syncWorkoutToHealth([record]);
  await new Promise((resolve) => setImmediate(resolve));
  await context.syncWorkoutToHealth([record]);
  assert.equal(context.healthSyncInFlight.size, 1);
  complete({ saved: false, reason: 'Health store unavailable' });
  await first;
  assert.equal(record.healthSyncPending, true);
  assert.equal(context.healthSyncInFlight.size, 0);
  assert.match(messages[0], /Health store unavailable/);
  assert.ok(!messages.some((message) => message.includes('נשמר באפליקציית הבריאות')));
});

test('Health bridge carries workout identifiers and summary; native samples have stable deduplication metadata', async () => {
  let payload;
  const context = bridgeContext({ HealthBridge: {
    saveWorkout: async (data) => { payload = data; return { saved: true, id: 'native-id' }; },
  } });
  const record = healthRecord();
  const result = await context.healthSaveWorkout({
    workoutID: record.id, startMillis: Date.parse(record.dateISO), durationSec: 123, entries: record.entries,
  });
  assert.equal(payload.workoutID, record.id);
  assert.equal(payload.entries, record.entries);
  assert.equal(payload.calories, 0);
  assert.equal(result.id, 'native-id');
  const swift = read('ios/App/App/HealthBridgePlugin.swift');
  assert.match(swift, /HKMetadataKeySyncIdentifier: "autofit.\\\(workoutID\)"/);
  assert.equal((swift.match(/HKMetadataKeySyncVersion: 2/g) || []).length, 2);
  assert.match(swift, /activityType = .traditionalStrengthTraining/);
  assert.doesNotMatch(swift, /functionalStrengthTraining/);
  assert.match(swift, /"AutoFitExerciseSummary": summary/);
  assert.match(swift, /builder.addMetadata\(metadata\)/);
  assert.match(swift, /autofit.\\\(workoutID\).energy/);
});

test('background handoff includes banked warmup and cooldown completion without announcing paused cardio', () => {
  const context = vm.createContext({
    Date: { now: () => 100000 }, restTimer: { isRunning: () => false },
    settings: { voiceAnnouncements: true }, holdTimers: new Map(), exercises: [],
    cardioCompletionMessage: () => 'החימום הסתיים. 0 אחוז מהאימון הושלמו',
    activeSession: { entries: [
      { exerciseId: 'warmup', type: 'cardio', startedAt: 90000, elapsedSec: 30, durationSec: 300 },
      { exerciseId: 'cooldown', type: 'cardio', startedAt: null, durationSec: 300 },
    ] },
  });
  vm.runInContext(section('function buildBackgroundAnnouncementItems()', '/* ---------------- notifications'), context);
  const items = context.buildBackgroundAnnouncementItems();
  assert.equal(items.length, 1);
  assert.equal(items[0].fireAtMillis, 360000);
  assert.equal(items[0].text, 'החימום הסתיים. 0 אחוז מהאימון הושלמו');
  assert.equal(items[0].announcementID, 'cardio:warmup:90000');
});

test('timer speech carries the same stable identity through foreground and background native dispatch', async () => {
  let payload;
  const native = bridgeContext({ BackgroundAnnouncer: { speakNow: async (data) => { payload = data; } } });
  const context = vm.createContext({ isNative: () => true, announce: native.announce });
  vm.runInContext(read('www/js/timer.js').replace(/^import .*$/gm, '').replace(/^export /gm, ''), context);
  context.speak('rest complete', 'he-IL', 'rest:12345:done');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(payload.announcementID, 'rest:12345:done');
  const swift = read('ios/App/App/BackgroundAnnouncerPlugin.swift');
  assert.match(swift, /recentAnnouncementIDs.contains\(announcementID\)/);
  assert.match(swift, /recentAnnouncementIDs.count > 512/);
  assert.match(swift, /self\?\.speak\(announcement.text, language: announcement.language,\s*announcementID: announcement.identifier\)/);
  assert.match(swift, /restorePlaybackAfterMicrophone/);
});

function nativePlanContext() {
  const clock = timerContext();
  const { context } = clock;
  const calls = [], messages = [];
  Object.assign(context, {
    queueMicrotask, console, appInitialized: true, announcementPlanQueued: false, announcementPlanKey: '',
    announcementPlanRevision: 0, announcementPlanChain: Promise.resolve(),
    activeSession: { running: true, entries: [] }, holdTimers: new Map(), exercises: [],
    settings: { voiceAnnouncements: true, voiceIntervalAnnouncements: true },
    restDoneMessage: 'continue', el: () => ({ textContent: 'Bench' }),
    db: { saveActiveSession() {} }, syncWorkoutActivity() {},
    native: { isNative: () => true, bgScheduleAnnouncements: async (items) => {
      calls.push(JSON.parse(JSON.stringify(items))); return true;
    } },
    showToast: (text) => messages.push(text),
  });
  vm.runInContext(section('function buildBackgroundAnnouncementItems()', '/* ---------------- notifications'), context);
  vm.runInContext(section('function persistActiveSession()', 'function buildWorkoutActivityPayload()'), context);
  context.restTimer = clock.rest({ onChange: () => context.persistRestTimerState(), onTick() {}, onDone() {} });
  return { ...clock, calls, messages };
}

async function settlePlan(context) {
  await new Promise((resolve) => setImmediate(resolve));
  await context.announcementPlanChain;
}

test('rest start arms all native speech deadlines while foregrounded without a visibility event', async () => {
  const { context, calls } = nativePlanContext();
  context.restTimer.start(90);
  await settlePlan(context);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].map((item) => item.fireAtMillis), [31000, 61000, 91000]);
  assert.deepEqual(calls[0].map((item) => item.announcementID), ['rest:91000:30', 'rest:91000:60', 'rest:91000:done']);
  assert.equal(context.activeSession.rest.endAt, 91000);
});

test('native deadlines remain stable during bridge latency and unrelated workout edits', async () => {
  const { context, calls, advance } = nativePlanContext();
  context.restTimer.start(90);
  await settlePlan(context);
  advance(10);
  context.persistActiveSession();
  await settlePlan(context);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].at(-1).fireAtMillis, 91000);
  advance(90); // No JS timer ticks or lifecycle events: native already owns the complete plan.
  assert.equal(calls[0].filter((item) => item.fireAtMillis <= context.Date.now()).length, 3);
});

test('rest extension replaces native deadlines and skipping clears them with an empty plan', async () => {
  const { context, calls } = nativePlanContext();
  context.restTimer.start(90);
  await settlePlan(context);
  context.restTimer.addSeconds(15);
  await settlePlan(context);
  assert.equal(calls.at(-1).at(-1).fireAtMillis, 106000);
  context.restTimer.stop();
  await settlePlan(context);
  assert.deepEqual(calls.at(-1), []);
});

test('disabling interval speech retains only completion; disabling all speech cancels native plans', async () => {
  const { context, calls } = nativePlanContext();
  context.restTimer.start(90);
  await settlePlan(context);
  context.settings.voiceIntervalAnnouncements = false;
  context.syncNativeAnnouncementPlan();
  await settlePlan(context);
  assert.equal(calls.at(-1).length, 1);
  assert.equal(calls.at(-1)[0].announcementID, 'rest:91000:done');
  context.settings.voiceAnnouncements = false;
  context.syncNativeAnnouncementPlan();
  await settlePlan(context);
  assert.deepEqual(calls.at(-1), []);
});

test('workout finish cancels a prearmed plan, and the bridge accepts empty cancellation plans', async () => {
  const { context, calls } = nativePlanContext();
  context.restTimer.start(90);
  await settlePlan(context);
  context.activeSession.running = false;
  context.syncNativeAnnouncementPlan();
  await settlePlan(context);
  assert.deepEqual(calls.at(-1), []);
  let received;
  const bridge = bridgeContext({ BackgroundAnnouncer: {
    scheduleAnnouncements: async ({ items }) => { received = items; },
  } });
  assert.equal(await bridge.bgScheduleAnnouncements([]), true);
  assert.deepEqual(received, []);
});

test('background plan failures are visible and can be retried without changing the timer', async () => {
  const { context, messages, calls } = nativePlanContext();
  const schedule = context.native.bgScheduleAnnouncements;
  context.native.bgScheduleAnnouncements = async () => false;
  context.restTimer.start(90);
  await settlePlan(context);
  assert.equal(messages.length, 1);
  assert.equal(context.announcementPlanKey, '');
  context.native.bgScheduleAnnouncements = schedule;
  context.syncNativeAnnouncementPlan();
  await settlePlan(context);
  assert.equal(calls[0].at(-1).fireAtMillis, 91000);
});

test('native lifecycle stops microphone input and recovers background playback without WebView callbacks', () => {
  const voice = read('ios/App/App/VoiceCommandPlugin.swift');
  const audio = read('ios/App/App/BackgroundAnnouncerPlugin.swift');
  assert.match(voice, /UIApplication.didEnterBackgroundNotification/);
  assert.match(voice, /applicationEnteredBackground\(\) \{\s*end\(\)/);
  assert.match(voice, /wantsMicrophone && UIApplication.shared.applicationState != .background/);
  assert.match(audio, /\.AVAudioEngineConfigurationChange, object: audioEngine/);
  assert.match(audio, /UIApplication.didEnterBackgroundNotification/);
  assert.match(audio, /!audioInterrupted/);
  assert.match(audio, /try items.map \{ try ScheduledWorkoutAnnouncement\(\$0\) \}/);
  assert.doesNotMatch(audio, /delaySeconds|max\(0.05, delay\)/);
  const lifecycle = section("document.addEventListener('visibilitychange'", '// Some browsers');
  assert.doesNotMatch(lifecycle, /bgCancelAnnouncements/);
  assert.match(lifecycle, /syncNativeAnnouncementPlan\(\)/);
  assert.match(read('ios/App/App.xcodeproj/project.pbxproj'), /ScheduledWorkoutAnnouncement.swift in Sources/);
  assert.match(read('.github/workflows/ios-build.yml'), /Test native announcement deadlines/);
});

function progressSpeechContext(entries) {
  const messages = [], nodes = new Map();
  const context = vm.createContext({
    activeSession: { entries }, settings: { voiceAnnouncements: true, restSeconds: 90 },
    cancelWorkoutGreeting() {}, playBeep() {},
    restTimer: { start() {} }, speak: (message) => messages.push(message),
    el: (id) => {
      if (!nodes.has(id)) nodes.set(id, { style: {}, setAttribute() {}, classList: { remove() {} } });
      return nodes.get(id);
    },
  });
  vm.runInContext(section('function getWorkoutSetProgress()', 'function renderCardioCard('), context);
  vm.runInContext(section('function startRestTimer(', '/* ================= HISTORY TAB'), context);
  return { context, messages, nodes };
}

test('exercise completion speech matches the displayed set-weighted percentage, not exercise count', () => {
  const { context, messages, nodes } = progressSpeechContext([
    { sets: [{ completed: true }] },
    { sets: [{ completed: false }, { completed: false }, { completed: false }] },
  ]);
  context.updateProgress();
  context.startRestTimer({ name: 'Bench', restSeconds: 90 }, true, 'Next');
  assert.equal(nodes.get('overallProgressBadge').textContent, '25%');
  assert.match(messages[0], /25 אחוז מהאימון הושלמו/);
  assert.match(messages[0], /התרגיל הבא: Next/);
});

test('last completed exercise explicitly announces 100 percent, while ordinary sets do not announce percentages', () => {
  const { context, messages } = progressSpeechContext([{ sets: [{ completed: true }] }]);
  context.startRestTimer({ name: 'Last' }, true, null);
  assert.match(messages[0], /100 אחוז מהאימון הושלמו/);
  context.startRestTimer({ name: 'Last' }, false, 'Next');
  assert.equal(messages[1], 'סט הושלם, זמן מנוחה');
  context.settings.voiceAnnouncements = false;
  context.startRestTimer({ name: 'Last' }, true, null);
  assert.equal(messages.length, 2);
});

test('cardio completion reports the same strength-set percentage and empty workouts never divide by zero', () => {
  const { context } = progressSpeechContext([
    { type: 'cardio', exerciseId: 'warmup', completed: true },
    { sets: [{ completed: true }, { completed: false }] },
  ]);
  assert.match(context.cardioCompletionMessage({ exerciseId: 'warmup' }), /50 אחוז/);
  context.activeSession.entries = [];
  assert.equal(context.getWorkoutSetProgress().percent, 0);
});
