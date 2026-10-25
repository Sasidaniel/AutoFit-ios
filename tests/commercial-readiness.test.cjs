const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const plain = (value) => JSON.parse(JSON.stringify(value));
function load(file, names, values = {}) {
  const context = vm.createContext({ console, ...values });
  vm.runInContext(read(file).replace(/^import .*$/gm, '').replace(/^export /gm, ''), context);
  return vm.runInContext(`({${names.join(',')}})`, context);
}
const config = load('www/js/commercial-config.js', ['COMMERCIAL_CONFIG', 'commercialReadiness']);
const legal = load('www/js/legal.js', ['POLICY_VERSION', 'PERSONAL_DATA_KEYS', 'CLOUD_ERASURE_KEY',
  'hasCurrentConsent', 'acceptLegalConsent', 'cloudRestoreAllowed', 'legalDocumentHTML',
  'exportPersonalData', 'exportLegacyCloudData', 'eraseLocalPersonalData', 'restorableCloudData'], config);
const choices = { termsAccepted: true, privacyAcknowledged: true, healthDataConsent: true, adultConfirmed: true };
const confirmed = (extra = {}) => legal.acceptLegalConsent(extra, choices, 'he', new Date('2026-10-22T09:00:00Z'));
const commerce = load('www/js/commerce-ui.js', ['validateCommerceStatus', 'purchaseAllowed', 'purchaseOutcome'],
  { ...config, ...legal, i18n: { text: (text) => text } });
const appleStatus = (extra = {}) => ({
  configured: true, enabled: true, verified: true, canMakePayments: true, policyVersion: 'published-v1',
  products: [{ id: 'example.monthly', name: 'Monthly', price: '₪12.90', period: { unit: 'month', value: 1 } }],
  entitlements: [], ...extra,
});
function memory(values = {}) {
  const data = new Map(Object.entries(values));
  return {
    data, getItem: (key) => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)), removeItem: (key) => data.delete(key),
  };
}
function sample() {
  return {
    ft_exercises_v1: JSON.stringify([{ id: 'custom:1', name: 'תרגיל אישי', images: ['data:image/png;base64,cGhvdG8='], active: false }]),
    ft_workouts_v1: JSON.stringify([{ id: 'old', entries: [{ exerciseId: 'custom:1', sets: [{ weightKg: 12, reps: 8, notes: 'my private note' }] }] }]),
    ft_settings_v1: JSON.stringify({ training: { plans: [{ id: 'saved-plan', name: 'התוכנית שלי' }] } }),
    ft_profile_v1: JSON.stringify({ name: 'My alias', weightKg: '70', photoDataUrl: 'data:image/png;base64,cGlj', weightHistory: [{ weightKg: 70 }] }),
    ft_active_session_v1: JSON.stringify({ id: 'unfinished', paused: true, entries: [{ exerciseId: 'custom:1', sets: [{ reps: 3, notes: 'pending' }] }] }),
  };
}

test('StoreKit product and entitlement validation rejects unverified, malformed and invented eligibility', () => {
  assert.equal(commerce.validateCommerceStatus(appleStatus()).products[0].price, '₪12.90');
  assert.equal(commerce.validateCommerceStatus({ configured: false, enabled: false, verified: false,
    canMakePayments: false, products: [], entitlements: [] }).configured, false);
  for (const value of [
    null, appleStatus({ verified: false }), appleStatus({ configured: false }), appleStatus({ policyVersion: 'commercial-draft-1' }),
    appleStatus({ products: [] }), appleStatus({ products: [appleStatus().products[0], appleStatus().products[0]] }),
    appleStatus({ entitlements: [{ productID: 'unknown' }] }),
    appleStatus({ products: [{ ...appleStatus().products[0], freeTrial: { period: { value: 7, unit: 'day' }, periodCount: '1' } }] }),
  ]) assert.throws(() => commerce.validateCommerceStatus(value));
});

test('a proposed week or configured monthly product never invents a free trial', () => {
  const ordinary = commerce.validateCommerceStatus(appleStatus());
  assert.equal(ordinary.products[0].freeTrial, undefined);
  const offered = commerce.validateCommerceStatus(appleStatus({ products: [{
    ...appleStatus().products[0], freeTrial: { period: { value: 7, unit: 'day' }, periodCount: 1 },
  }] }));
  assert.equal(offered.products[0].freeTrial.period.value, 7);
});

test('draft consent and incomplete business configuration cannot start a purchase even with a real Apple product', () => {
  const settings = confirmed();
  assert.equal(commerce.purchaseAllowed(appleStatus(), settings), false);
  assert.equal(commerce.purchaseAllowed(appleStatus({ policyVersion: legal.POLICY_VERSION }), settings, { ready: true }), false);
  assert.equal(commerce.purchaseAllowed(null, settings, { ready: true }), false);
});

test('cancelled, pending and returned transactions never become active without a verified current entitlement', () => {
  assert.equal(commerce.purchaseOutcome({ state: 'cancelled' }, 'example.monthly').state, 'cancelled');
  assert.equal(commerce.purchaseOutcome({ state: 'pending' }, 'example.monthly').state, 'pending');
  assert.equal(commerce.purchaseOutcome({ state: 'verified', status: appleStatus() }, 'example.monthly').state, 'awaiting-entitlement');
  assert.equal(commerce.purchaseOutcome({ state: 'verified', status: appleStatus({
    entitlements: [{ productID: 'example.monthly' }],
  }) }, 'example.monthly').state, 'entitled');
  assert.throws(() => commerce.purchaseOutcome({ state: 'success' }, 'example.monthly'));
  assert.throws(() => commerce.purchaseOutcome({ state: 'verified', status: appleStatus({ verified: false }) }, 'example.monthly'));
});

function commerceController({ platform = true, approved = true } = {}) {
  const buttons = [];
  let html = '', ready = true, observer, currentStatus = appleStatus();
  const calls = [];
  const root = {
    get innerHTML() { return html; },
    set innerHTML(value) {
      html = value;
      buttons.length = 0;
      for (const match of value.matchAll(/<button[^>]*data-commerce-action="([^"]+)"[^>]*>/g)) {
        const listeners = {};
        buttons.push({ dataset: { commerceAction: match[1] }, disabled: /\sdisabled(?:\s|>)/.test(match[0]),
          addEventListener: (event, listener) => { listeners[event] = listener; },
          click() { if (!this.disabled) return listeners.click(); }, focus() {}, closest() { return this; } });
      }
    },
    contains: (button) => buttons.includes(button), querySelectorAll: () => [...buttons],
  };
  const native = {
    isNative: () => platform,
    commerceStatus: async () => { calls.push('status'); return currentStatus; },
    commercePurchase: async () => { calls.push('purchase'); return { state: 'pending' }; },
    commerceRestore: async () => { calls.push('restore'); return currentStatus; },
    commerceManage: async () => { calls.push('manage'); },
    onCommerceChanged: (callback) => { observer = callback; },
  };
  const { createCommerceUI } = load('www/js/commerce-ui.js', ['createCommerceUI'], {
    native, i18n: { text: (text) => text }, commercialReadiness: () => ({ ready: approved }),
    hasCurrentConsent: () => approved,
    document: { activeElement: null, getElementById: () => root, addEventListener() {} },
    console: { error() {} },
  });
  const ui = createCommerceUI({
    getSettings: () => ({ legalConsent: { documentStatus: approved ? 'published' : 'draft', version: 'published-v1' } }),
    isReady: () => ready, openDocument: (kind) => calls.push(kind),
  });
  return { ui, native, root, calls, button: (action) => buttons.find((button) => button.dataset.commerceAction === action),
    setStatus: (value) => { currentStatus = value; }, setReady: (value) => { ready = value; },
    notify: () => observer?.(), flush: () => new Promise(setImmediate) };
}

test('the real commerce controller is honest in browser preview and never calls Apple or shows a purchase button', async () => {
  const fixture = commerceController({ platform: false, approved: false });
  await fixture.ui.refresh();
  assert.deepEqual(fixture.calls, []);
  assert.match(fixture.root.innerHTML, /בדפדפן אין רכישה/);
  assert.doesNotMatch(fixture.root.innerHTML, /data-commerce-action="buy:/);
  fixture.button('privacy').click();
  assert.deepEqual(fixture.calls, ['privacy']);
});

test('actual purchase controller blocks overlapping requests and repeat purchases while Apple approval is pending', async () => {
  const fixture = commerceController();
  await fixture.ui.refresh();
  let complete;
  fixture.native.commercePurchase = () => { fixture.calls.push('purchase'); return new Promise((resolve) => { complete = resolve; }); };
  const buy = fixture.button('buy:example.monthly');
  buy.click();
  buy.click();
  assert.equal(fixture.calls.filter((call) => call === 'purchase').length, 1);
  complete({ state: 'pending' });
  await fixture.flush();
  assert.equal(fixture.button('buy:example.monthly'), undefined);
  assert.match(fixture.root.innerHTML, /ממתינה לאישור Apple/);
  await fixture.ui.refresh();
  assert.equal(fixture.button('buy:example.monthly'), undefined);
  fixture.setStatus(appleStatus({ entitlements: [{ productID: 'example.monthly' }] }));
  fixture.notify();
  await fixture.flush();
  assert.match(fixture.root.innerHTML, /Apple אימתה זכאות פעילה/);
  assert.equal(fixture.button('buy:example.monthly'), undefined);
});

test('actual commerce status failures do not imply a cancelled subscription or enable a purchase', async () => {
  const fixture = commerceController();
  await fixture.ui.refresh();
  fixture.native.commerceStatus = async () => { throw new Error('offline'); };
  await fixture.ui.refresh();
  assert.match(fixture.root.innerHTML, /לא ניתן לאמת/);
  assert.equal(fixture.button('buy:example.monthly'), undefined);
  fixture.native.commerceStatus = async () => appleStatus();
  await fixture.ui.refresh();
  assert.ok(fixture.button('buy:example.monthly'));
});

test('actual restore reads verified entitlements without making a new purchase and preserves free local use', async () => {
  const fixture = commerceController({ approved: false });
  await fixture.ui.refresh();
  assert.equal(fixture.button('buy:example.monthly'), undefined);
  fixture.setStatus(appleStatus({ entitlements: [{ productID: 'example.monthly' }] }));
  fixture.button('restore').click();
  await fixture.flush();
  assert.ok(fixture.calls.includes('restore'));
  assert.ok(!fixture.calls.includes('purchase'));
  assert.match(fixture.root.innerHTML, /Apple אימתה זכאות פעילה/);
});

test('overlapping commerce refreshes are coalesced and late results do not update a privacy-erasing app', async () => {
  const fixture = commerceController();
  let resolve;
  fixture.native.commerceStatus = () => { fixture.calls.push('status'); return new Promise((done) => { resolve = done; }); };
  const before = fixture.root.innerHTML;
  const first = fixture.ui.refresh(), second = fixture.ui.refresh();
  assert.equal(first, second);
  assert.equal(fixture.calls.filter((call) => call === 'status').length, 1);
  fixture.setReady(false);
  resolve(appleStatus());
  await first;
  assert.equal(fixture.root.innerHTML, before);
});

test('commercial launch remains blocked even with filled configuration while authored policies are drafts', () => {
  const result = config.commercialReadiness({ operatorLegalName: 'Example', privacyEmail: 'privacy@example.test',
    businessAddress: 'Example address', termsApproved: true, privacyApproved: true, targetMarkets: ['IL'], commerceEnabled: true });
  assert.equal(result.ready, false);
  assert.ok(result.missing.includes('finalPolicyPublication'));
  assert.equal(config.commercialReadiness().ready, false);
});

test('consent is explicit, versioned, bilingual metadata and never inferred from an existing profile', () => {
  const before = { onboardingComplete: true, profile: { name: 'Existing' }, legalConsentHistory: [{ version: 'old' }] };
  assert.equal(legal.hasCurrentConsent(before), false);
  const result = legal.acceptLegalConsent(before, choices, 'en', new Date('2026-10-22T09:00:00Z'));
  assert.equal(legal.hasCurrentConsent(result), true);
  assert.equal(result.legalConsent.documentStatus, 'draft');
  assert.equal(result.legalConsent.language, 'en');
  assert.equal(result.legalConsent.version, legal.POLICY_VERSION);
  assert.equal(result.legalConsentHistory.length, 2);
  assert.equal(before.legalConsentHistory.length, 1);
  assert.equal(before.legalConsent, undefined);
  assert.equal(legal.hasCurrentConsent({ ...result, legalConsent: { ...result.legalConsent, version: 'older' } }), false);
});

test('each consent confirmation is independently required without truthy coercion or a fake acceptance date', () => {
  for (const key of Object.keys(choices)) {
    for (const value of [false, undefined, 'true', 1]) {
      assert.throws(() => legal.acceptLegalConsent({}, { ...choices, [key]: value }, 'he'), /Explicit/);
    }
  }
  assert.throws(() => legal.acceptLegalConsent({}, choices, 'xx'), /Invalid/);
  assert.throws(() => legal.acceptLegalConsent({}, choices, 'he', new Date(NaN)), /Invalid/);
  const settings = confirmed();
  assert.equal(legal.hasCurrentConsent({ ...settings, legalConsent: { ...settings.legalConsent, acceptedAt: 'not-a-date' } }), false);
  assert.equal(legal.hasCurrentConsent({ ...settings, legalConsent: { ...settings.legalConsent, documentStatus: 'published' } }), false);
});

test('legacy recovery needs separate consent and never implies permission for new sensitive cloud writes', () => {
  assert.equal(legal.cloudRestoreAllowed(confirmed()), false);
  assert.equal(legal.cloudRestoreAllowed({ privacyPreferences: { cloudRestore: true } }), false);
  assert.equal(legal.cloudRestoreAllowed(confirmed({ privacyPreferences: { cloudRestore: true, cloudBackup: false } })), true);
});

test('both complete offline legal documents disclose actual limitations and safely escape owner configuration', () => {
  for (const kind of ['privacy', 'terms']) {
    const he = legal.legalDocumentHTML(kind, 'he');
    const en = legal.legalDocumentHTML(kind, 'en', { ...config.COMMERCIAL_CONFIG, operatorDisplayName: 'Sasi Daniel' });
    assert.match(he, /lang="he" dir="rtl"/);
    assert.match(en, /lang="en" dir="ltr"/);
    assert.doesNotMatch(en, /[\u0590-\u05ff]/);
    assert.match(en, /Review draft/);
    assert.match(en, /App Store|App Store/);
    assert.match(en, /Health/);
    assert.match(en, /delete|delet|eras/i);
    assert.doesNotMatch(en, /<iframe|<img|<script|https:\/\/.*\.js/);
  }
  const privacy = legal.legalDocumentHTML('privacy', 'en');
  assert.match(privacy, /5\.1\.3\(ii\)/);
  assert.match(privacy, /not a separately encrypted/);
  assert.match(privacy, /Formspree/);
  assert.match(privacy, /on-device-only recognition is not guaranteed/);
  assert.match(privacy, /system backups/);
  assert.match(legal.legalDocumentHTML('terms', 'en'), /mandatory consumer rights/);
  const escaped = legal.legalDocumentHTML('privacy', 'en', { ...config.COMMERCIAL_CONFIG,
    operatorDisplayName: '<script>bad()</script>', operatorLegalName: '<img src=x onerror=bad()>' });
  assert.doesNotMatch(escaped, /<script>|<img/);
  assert.match(escaped, /&lt;script&gt;/);
  assert.throws(() => legal.legalDocumentHTML('unknown'), /Unknown/);
});

test('data export preserves all five records including photos, custom IDs, notes, plans and pending entries', () => {
  const source = sample();
  const storage = memory({ ...source, unrelated: 'must stay', ft_unknown_secret: 'must not export' });
  const result = legal.exportPersonalData(storage, new Date('2026-10-22T09:00:00Z'));
  assert.equal(result.formatVersion, 1);
  assert.deepEqual(Object.keys(result.records).sort(), [...legal.PERSONAL_DATA_KEYS].sort());
  for (const [key, value] of Object.entries(source)) assert.deepEqual(plain(result.records[key]), JSON.parse(value));
  assert.equal(JSON.stringify(result).includes('must not export'), false);
  assert.deepEqual(Object.fromEntries(storage.data), { ...source, unrelated: 'must stay', ft_unknown_secret: 'must not export' });
  assert.throws(() => legal.exportPersonalData(memory({ ft_workouts_v1: 'broken JSON' })));
});

test('legacy cloud export is read-only, preserves the original archive and never claims latest-server verification', () => {
  const source = sample();
  const before = JSON.stringify(source);
  const result = legal.exportLegacyCloudData({ ...source, unknown: 'do not include' });
  assert.equal(result.latestServerCopyVerified, false);
  assert.deepEqual(plain(result.records.ft_workouts_v1), JSON.parse(source.ft_workouts_v1));
  assert.equal(JSON.stringify(result).includes('do not include'), false);
  assert.equal(JSON.stringify(source), before);
  assert.throws(() => legal.exportLegacyCloudData({}), /No backup data/);
  assert.throws(() => legal.exportLegacyCloudData({ ...source, [legal.CLOUD_ERASURE_KEY]: 'marked' }), /deletion/);
});

test('local deletion touches only AutoFit personal-data keys', () => {
  const storage = memory({ ...sample(), unrelated: 'keep', ft_unknown: 'keep' });
  legal.eraseLocalPersonalData(storage);
  assert.deepEqual(Object.fromEntries(storage.data), { unrelated: 'keep', ft_unknown: 'keep' });
});

test('a failure at each local deletion position restores every original record', () => {
  for (let index = 0; index < legal.PERSONAL_DATA_KEYS.length; index++) {
    const source = sample();
    const storage = memory(source);
    const remove = storage.removeItem;
    let count = 0;
    storage.removeItem = (key) => {
      if (count++ === index) throw new Error('storage blocked');
      remove(key);
    };
    assert.throws(() => legal.eraseLocalPersonalData(storage), /storage blocked/);
    assert.deepEqual(Object.fromEntries(storage.data), source);
  }
});

test('failed rollback is an explicit aggregate failure, not a success-shaped deletion result', () => {
  const logs = [];
  const local = load('www/js/legal.js', ['eraseLocalPersonalData'], { ...config, console: { error: (...args) => logs.push(args) } });
  const storage = memory(sample());
  storage.removeItem = () => { throw new Error('cannot remove'); };
  storage.setItem = () => { throw new Error('cannot restore'); };
  assert.throws(() => local.eraseLocalPersonalData(storage), (error) => error.name === 'AggregateError' && error.errors.length > 1);
  assert.equal(logs.length, legal.PERSONAL_DATA_KEYS.length);
});

test('an erased cloud backup cannot revive old records; unknown keys and remote consents are never imported', () => {
  const settings = confirmed({ language: 'en', onboardingComplete: false, faceIdEnabled: false,
    voiceCommandsEnabled: false, privacyPreferences: { cloudRestore: true, cloudBackup: false } });
  const source = { ...sample(), ft_settings_v1: JSON.stringify({ onboardingComplete: true, legalConsent: { acceptedAt: 'fake' },
    language: 'he', faceIdEnabled: true, voiceCommandsEnabled: true, training: { saved: 'keep' } }), ft_unknown_secret: '"skip"' };
  const result = legal.restorableCloudData(source, settings);
  assert.equal(result.erased, false);
  assert.equal(result.records.length, 5);
  const restored = JSON.parse(result.records.find(([key]) => key === 'ft_settings_v1')[1]);
  assert.deepEqual(restored.legalConsent, plain(settings.legalConsent));
  assert.equal(restored.language, 'en');
  assert.equal(restored.onboardingComplete, false);
  assert.equal(restored.voiceCommandsEnabled, false);
  assert.equal(restored.faceIdEnabled, false);
  assert.equal(restored.privacyPreferences.cloudBackup, false);
  assert.equal(restored.training.saved, 'keep');
  const erased = legal.restorableCloudData({ ...source, [legal.CLOUD_ERASURE_KEY]: '2026-10-22' }, settings);
  assert.equal(erased.erased, true);
  assert.equal(erased.records.length, 0);
});

test('malformed cloud snapshots fail validation before any caller can apply a partial restore', () => {
  for (const value of ['{}', 'null', '"not an array"']) {
    assert.throws(() => legal.restorableCloudData({ ...sample(), ft_exercises_v1: value }, confirmed()), /Invalid/);
  }
  assert.throws(() => legal.restorableCloudData({ ...sample(), ft_profile_v1: '[]' }, confirmed()), /Invalid/);
  assert.throws(() => legal.restorableCloudData({ ...sample(), ft_settings_v1: '[]' }, confirmed()), /Invalid/);
  assert.throws(() => legal.restorableCloudData({ ft_profile_v1: 123 }, confirmed()), /Invalid/);
});

test('suspended persistence prevents late writes through every DB transaction and restores normally after failure recovery', () => {
  const storage = memory(sample());
  const db = load('www/js/db.js', ['setSyncHook', 'suspendWrites', 'saveProfile', 'saveExercises',
    'saveProgramState', 'clearActiveSession'], { localStorage: storage });
  const calls = [];
  db.setSyncHook((...args) => calls.push(args));
  const resume = db.suspendWrites();
  const before = Object.fromEntries(storage.data);
  for (const work of [() => db.saveProfile({ name: 'late' }), () => db.saveExercises([]),
    () => db.saveProgramState([], {}, null), () => db.clearActiveSession()]) {
    assert.throws(work, /Obsolete write/);
  }
  assert.deepEqual(Object.fromEntries(storage.data), before);
  assert.equal(calls.length, 0);
  resume();
  db.saveProfile({ name: 'valid after recovery' });
  assert.equal(calls.length, 1);
});

function privacyContext(nativePlatform = false) {
  const storage = memory(sample());
  const db = load('www/js/db.js', ['saveSettings', 'suspendWrites'], { localStorage: storage });
  const calls = [], shared = [], notices = memory();
  const context = vm.createContext({ legal, db, Blob, console, localStorage: storage, sessionStorage: notices,
    settings: confirmed(), privacyErasing: false, appInitialized: true, activeSession: { running: false },
    voiceListeningActive: false, voiceActivationPending: false, voiceCountingState: null, activityReadyEnabled: false,
    activitySyncChain: Promise.resolve(), i18n: { text: (text) => text }, openTrainingDialog() {},
    showToast: (text) => calls.push(['toast', text]), stopWorkoutTimers: () => calls.push(['stop-timers']),
    stopwatch: { stop: () => calls.push(['stop-clock']) },
    shareFile: async (...args) => { shared.push(args); return true; },
    location: { pathname: '/index.html', replace: (url) => calls.push(['navigate', url]) },
    native: { isNative: () => nativePlatform, voiceStopListening: async () => true,
      bgCancelAnnouncements() {}, bgStopKeepAlive() {}, eraseTemporaryShareFiles: async () => calls.push(['erase-exports']),
      eraseWorkoutActivity: async () => calls.push(['erase-activity']), cloudGetAll: async () => sample(),
      cloudEraseData: async () => calls.push(['erase-cloud']) },
  });
  const app = read('www/js/app.js');
  vm.runInContext(app.slice(app.indexOf('function privacyAPI()'), app.indexOf('function renderSettingsTab()')), context);
  return { context, api: context.privacyAPI(), storage, shared, calls, notices };
}

test('the real privacy controller exports a JSON archive through the existing share path without clearing records', async () => {
  const { api, storage, shared } = privacyContext();
  const before = Object.fromEntries(storage.data);
  await api.exportData();
  assert.equal(shared.length, 1);
  assert.equal(shared[0][2], 'application/json');
  assert.match(shared[0][1], /^AutoFit-personal-data-.*\.json$/);
  const file = JSON.parse(await shared[0][0].text());
  assert.equal(file.records.ft_profile_v1.name, 'My alias');
  assert.deepEqual(Object.fromEntries(storage.data), before);
});

test('the real controller keeps existing cloud exports separate and requires actual native consent', async () => {
  const browser = privacyContext(false);
  await assert.rejects(browser.api.exportCloudData());
  assert.equal(browser.shared.length, 0);
  const device = privacyContext(true);
  const before = Object.fromEntries(device.storage.data);
  await device.api.exportCloudData();
  const file = JSON.parse(await device.shared[0][0].text());
  assert.equal(file.latestServerCopyVerified, false);
  assert.deepEqual(Object.fromEntries(device.storage.data), before);
  device.context.settings = {};
  await assert.rejects(device.api.exportCloudData());
  assert.equal(device.shared.length, 1);
});

test('the real browser deletion flow clears data, blocks late writes and returns to real onboarding, not previewSkip', async () => {
  const { api, storage, calls, notices, context } = privacyContext();
  await api.eraseData({ cloud: false });
  assert.equal(storage.data.size, 0);
  assert.equal(notices.getItem('autofit-erasure-notice'), 'local');
  assert.deepEqual(calls.at(-1), ['navigate', '/index.html']);
  assert.equal(context.privacyErasing, true);
  assert.equal(context.appInitialized, false);
  assert.throws(() => context.db.saveSettings({ old: true }), /Obsolete write/);
});

test('the real controller refuses browser cloud deletion and retains records on native cleanup failure', async () => {
  const browser = privacyContext();
  const before = Object.fromEntries(browser.storage.data);
  await assert.rejects(browser.api.eraseData({ cloud: true }), /Invalid/);
  assert.deepEqual(Object.fromEntries(browser.storage.data), before);
  const device = privacyContext(true);
  device.context.native.eraseWorkoutActivity = async () => { throw new Error('activity cleanup failed'); };
  await assert.rejects(device.api.eraseData({ cloud: true }), /activity cleanup failed/);
  assert.equal(device.storage.getItem('ft_profile_v1'), sample().ft_profile_v1);
  assert.equal(device.storage.getItem('ft_workouts_v1'), sample().ft_workouts_v1);
  assert.equal(device.context.appInitialized, true);
  assert.equal(device.context.privacyErasing, false);
  assert.equal(device.calls.some(([call]) => call === 'erase-cloud' || call === 'navigate'), false);
});

test('native erasure requests cloud deletion only after safe activity cleanup and distinguishes the queued request', async () => {
  const { api, storage, calls, notices } = privacyContext(true);
  await api.eraseData({ cloud: true });
  assert.ok(calls.findIndex(([call]) => call === 'erase-activity') < calls.findIndex(([call]) => call === 'erase-cloud'));
  assert.equal(storage.data.size, 0);
  assert.equal(notices.getItem('autofit-erasure-notice'), 'cloud-requested');
});
