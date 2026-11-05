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
const cardio = load('www/js/cardio-tools.js', ['walkingActivity', 'validateCardioMeasurements', 'elapsedCardioSeconds',
  'editCardioEntry', 'completeCardioEntry', 'resetCardioEntry', 'cardioHistorySnapshot', 'appendWorkoutExercise', 'measurementFieldsHTML']);

test('cardio edits preserve a running timer, elapsed work and immutable targets until explicitly saved', () => {
  const entry = { exerciseId: 'warmup', type: 'cardio', durationSec: 300, startedAt: 1000, elapsedSec: 40,
    pace: 'legacy unparsed', extra: { preserved: true } };
  const before = plain(entry);
  const next = cardio.editCardioEntry(entry, { durationSec: 1200, cardioActivity: 'walk', location: 'treadmill',
    speedKmh: '5.5', incline: '8', inclineUnit: 'level', cardioMachineId: 'T-1' }, 31000);
  assert.deepEqual(plain(entry), before);
  assert.equal(next.startedAt, 1000);
  assert.equal(next.elapsedSec, 40);
  assert.equal(next.durationSec, 1200);
  assert.equal(next.plannedDurationSec, 1200);
  assert.equal(next.speedKmh, 5.5);
  assert.equal(next.inclineUnit, 'level');
  assert.equal(next.pace, 'legacy unparsed');
  assert.equal(next.extra, entry.extra);
  assert.throws(() => cardio.editCardioEntry(entry, { durationSec: 30 }, 31000), /זמן היעד/);
  assert.throws(() => cardio.editCardioEntry(entry, { durationSec: 0 }), /זמן/);
});

test('cardio unknown measurements stay unknown; numeric zero, units and clear operations are explicit', () => {
  const values = { cardioActivity: 'run', speedKmh: '', incline: '0' };
  const measured = cardio.validateCardioMeasurements(values);
  assert.equal(measured.speedKmh, null);
  assert.equal(measured.incline, 0);
  assert.equal(measured.inclineUnit, 'level');
  assert.throws(() => cardio.validateCardioMeasurements({ ...values, speedKmh: 'bad' }), /מהירות/);
  assert.throws(() => cardio.validateCardioMeasurements({ ...values, inclineUnit: 'degrees' }), /יחידת/);
  const cleared = cardio.editCardioEntry({ durationSec: 300, speedKmh: 7, incline: 8, cardioMachineId: 'old' },
    { durationSec: 300, cardioActivity: 'walk', speedKmh: '', incline: '', cardioMachineId: '' });
  assert.equal(Object.hasOwn(cleared, 'speedKmh'), false);
  assert.equal(Object.hasOwn(cleared, 'incline'), false);
  assert.equal(Object.hasOwn(cleared, 'cardioMachineId'), false);
});

test('cardio fields omit the removed machine-identification interface without discarding stored identifiers', () => {
  const entry = { exerciseId: 'warmup', durationSec: 1200, cardioMachineId: 'existing', speedKmh: 5.5, incline: 8, inclineUnit: 'level' };
  const html = cardio.measurementFieldsHTML(entry, String);
  assert.doesNotMatch(html, /cardioMachine|מזהה המכשיר|זיהוי מכשיר/);
  assert.match(html, /cardioSpeed/);
  assert.match(html, /cardioInclineUnit/);
  assert.match(html, /דרגה במכשיר/);
  assert.equal(cardio.editCardioEntry(entry, { durationSec: 600 }).cardioMachineId, 'existing');
});

test('cardio completion distinguishes measured elapsed, timed expiry and explicit manual reporting', () => {
  const entry = { exerciseId: 'warmup', type: 'cardio', durationSec: 300, elapsedSec: 70, startedAt: 1000 };
  const early = cardio.completeCardioEntry(entry, 11000);
  assert.equal(early.actualDurationSec, 80);
  assert.equal(early.plannedDurationSec, 300);
  assert.equal(early.elapsedSec, 300);
  assert.equal(early.cardioDurationSource, 'timer');
  assert.equal(early.completionFeedbackPending, true);
  const timer = cardio.completeCardioEntry(entry, 900000, true);
  assert.equal(timer.actualDurationSec, 300);
  const manual = cardio.completeCardioEntry({ durationSec: 1200 });
  assert.equal(manual.actualDurationSec, 1200);
  assert.equal(manual.cardioDurationSource, 'manual');
  const reset = cardio.resetCardioEntry({ ...early, difficulty: 'hard' });
  assert.equal(reset.durationSec, 300);
  assert.equal(reset.elapsedSec, 0);
  assert.equal(reset.completed, false);
  assert.equal(Object.hasOwn(reset, 'actualDurationSec'), false);
  assert.equal(Object.hasOwn(reset, 'difficulty'), false);
});

test('cardio history snapshots retain measurements, source, difficulty and independent guide snapshots without fabricating old data', () => {
  const entry = { exerciseId: 'walk', type: 'cardio', durationSec: 1200, actualDurationSec: 1100, plannedDurationSec: 1200,
    cardioDurationSource: 'manual', speedKmh: 5.5, incline: 8, inclineUnit: 'level', difficulty: 'right',
    exerciseSnapshot: { id: 'walk', custom: { original: true } }, startedAt: 5, completed: true };
  const snapshot = cardio.cardioHistorySnapshot(entry);
  assert.equal(snapshot.actualDurationSec, 1100);
  assert.equal(snapshot.cardioDurationSource, 'manual');
  assert.equal(snapshot.difficulty, 'right');
  assert.equal(snapshot.incline, 8);
  assert.equal(Object.hasOwn(snapshot, 'startedAt'), false);
  snapshot.exerciseSnapshot.custom.original = false;
  assert.equal(entry.exerciseSnapshot.custom.original, true);
  assert.equal(Object.hasOwn(cardio.cardioHistorySnapshot({ durationSec: 300, completed: true }), 'actualDurationSec'), false);
});

test('adding an exercise during a workout keeps all existing object identities and progress, and never changes the program', () => {
  const warmup = { exerciseId: 'warmup', completed: true };
  const strength = { exerciseId: 'lift', sets: [{ reps: 12, completed: true }], hold: { running: true } };
  const cooldown = { exerciseId: 'cooldown' };
  const session = { id: 'same', entries: [warmup, strength, cooldown], running: true, paused: false,
    currentExerciseId: 'lift', accumulatedSec: 100, activityControlRevision: 4, rest: { remaining: 45 } };
  const added = { exerciseId: 'new', type: 'cardio', durationSec: 1200 };
  const next = cardio.appendWorkoutExercise(session, added);
  assert.equal(next.id, 'same');
  assert.equal(next.entries[1], strength);
  assert.equal(next.entries[1].sets[0], strength.sets[0]);
  assert.equal(next.rest, session.rest);
  assert.equal(next.currentExerciseId, 'lift');
  assert.equal(next.running, true);
  assert.equal(next.activityControlRevision, 5);
  const deferred = [{ exerciseId: 'deferred' }];
  const budgeted = cardio.appendWorkoutExercise({ ...session,
    timeBudget: { order: ['warmup', 'lift', 'deferred', 'cooldown'], deferred } }, added);
  assert.equal(budgeted.timeBudget.deferred, deferred);
  assert.equal(budgeted.timeBudget.order.join(','), 'warmup,lift,deferred,new,cooldown');
  assert.deepEqual(next.entries.map((entry) => entry.exerciseId).join(','), 'warmup,lift,new,cooldown');
  assert.equal(session.entries.length, 3);
  assert.throws(() => cardio.appendWorkoutExercise(next, added), /כבר/);
  assert.throws(() => cardio.appendWorkoutExercise({ ...session, removedExercises: [{ entry: added }] }, added), /כבר/);
  assert.throws(() => cardio.appendWorkoutExercise({ ...session, timeBudget: { deferred: [added] } }, added), /כבר/);
  assert.throws(() => cardio.appendWorkoutExercise({ ...session, substitutions: [{ original: added }] }, added), /כבר/);
});

test('real library addition controller consumes muscle-progress indices and preserves live references on success and storage failure', () => {
  const source = read('www/js/app.js');
  const entry = { exerciseId: 'lift', sets: [{ reps: 12, completed: true }] };
  const session = { id: 'active', entries: [{ exerciseId: 'warmup', completed: true }, entry, { exerciseId: 'cooldown' }],
    currentExerciseId: 'lift', running: true };
  const counting = { entry, set: entry.sets[0], entryIndex: 1 };
  const action = { session, entry, set: entry.sets[0] };
  const exercises = [{ id: 'new', active: false }];
  let saved, fail = false, rendered = 0;
  const context = vm.createContext({ cardioTools: cardio, activeSession: session, exercises, finishingWorkout: false,
    privacyErasing: false, lastVoiceAction: action, lastVoiceReport: null, lastAutoCountCompletion: null,
    voiceCountingState: counting, console: { error() {} }, showToast() {}, syncWorkoutActivity() {}, syncNativeAnnouncementPlan() {},
    renderWorkoutTab: () => rendered++, renderExercisesTab() {},
    buildProgramDraft: (program) => ({ entries: [{ exerciseId: program[0].id, sets: [{ completed: false }] }] }),
    trainingTools: { workoutMuscleProgress: () => ({ order: [0, 1, 2] }) },
    db: { saveActiveSession: (next) => { if (fail) throw new Error('full'); saved = next; } } });
  vm.runInContext(source.slice(source.indexOf('function addExerciseToCurrentWorkout('), source.indexOf('function wireExercisesTab()')), context);
  fail = true;
  assert.equal(context.addExerciseToCurrentWorkout(exercises[0]), false);
  assert.equal(context.activeSession, session);
  assert.equal(action.session, session);
  assert.equal(rendered, 0);
  fail = false;
  assert.equal(context.addExerciseToCurrentWorkout(exercises[0]), true);
  assert.equal(context.activeSession, saved);
  assert.equal(saved.entries[1], entry);
  assert.equal(counting.set, entry.sets[0]);
  assert.equal(counting.entryIndex, 1);
  assert.equal(action.session, saved);
  assert.equal(saved.currentExerciseId, 'lift');
  assert.equal(saved.entries.at(-1).exerciseId, 'cooldown');
  assert.equal(exercises[0].active, false);
  assert.equal(rendered, 1);
});

test('real selected-cardio chart uses actual minutes and never plots legacy target duration as performance', () => {
  const source = read('www/js/app.js');
  const workouts = [
    { dateISO: '2026-11-03T10:00:00Z', entries: [{ exerciseId: 'walk', type: 'cardio', durationSec: 1200 }] },
    { dateISO: '2026-11-04T10:00:00Z', entries: [{ exerciseId: 'walk', type: 'cardio', durationSec: 1200, actualDurationSec: 600 }] },
    { dateISO: '2026-11-05T10:00:00Z', entries: [{ exerciseId: 'walk', type: 'cardio', durationSec: 1200, actualDurationSec: 900, cardioDurationSource: 'manual' }] },
  ];
  let chart;
  const context = vm.createContext({ window: { Chart: true }, workouts, exerciseChartInstance: null,
    insights: { exerciseProgress: () => ({ evidence: [{ entry: workouts[2].entries[0] }] }), statisticsHistory: () => [...workouts] },
    el: (id) => id === 'exercisePickerChart' ? { value: 'walk' }
      : id === 'exerciseMetricPicker' ? { value: 'seconds', selectedOptions: [{ textContent: 'Actual time in minutes' }] } : {},
    Chart: function (_, value) { chart = value; }, chartBaseOptions: () => ({}), i18n: { locale: () => 'en-US', text: String } });
  vm.runInContext(source.slice(source.indexOf('function renderExerciseChart()'), source.indexOf('function renderConsistencyChart()')), context);
  context.renderExerciseChart();
  assert.deepEqual(plain(chart.data.datasets[0].data), [15, 10]);
  assert.equal(chart.data.datasets[0].label, 'Actual time in minutes');
});
const legal = load('www/js/legal.js', ['POLICY_VERSION', 'PERSONAL_DATA_KEYS', 'CLOUD_ERASURE_KEY',
  'hasCurrentConsent', 'acceptLegalConsent', 'profileAgeAllowed', 'cloudRestoreAllowed', 'legalDocumentHTML',
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

test('browser preview omits the unused subscription card and never calls Apple or exposes subscription actions', async () => {
  const fixture = commerceController({ platform: false, approved: false });
  await fixture.ui.refresh();
  assert.deepEqual(fixture.calls, []);
  assert.equal(fixture.root.hidden, true);
  assert.equal(fixture.root.innerHTML, '');
  assert.equal(fixture.button('manage'), undefined);
  assert.match(read('www/index.html'), /id="privacySettingsCard"/);
});

test('native subscriptions stay hidden when unconfigured, but status errors remain visible and retryable', async () => {
  const fixture = commerceController({ approved: false });
  fixture.setStatus({ configured: false, enabled: false, verified: false, canMakePayments: false, products: [], entitlements: [] });
  await fixture.ui.refresh();
  assert.equal(fixture.root.hidden, true);
  assert.equal(fixture.root.innerHTML, '');
  fixture.native.commerceStatus = async () => { throw Error('offline'); };
  await fixture.ui.refresh();
  assert.equal(fixture.root.hidden, false);
  assert.match(fixture.root.innerHTML, /לא ניתן לאמת/);
  assert.ok(fixture.button('refresh'));
  assert.equal(fixture.button('manage'), undefined);
});

test('subscription management is offered only for an actual verified active entitlement', async () => {
  const fixture = commerceController();
  await fixture.ui.refresh();
  assert.equal(fixture.button('manage'), undefined);
  fixture.setStatus(appleStatus({ entitlements: [{ productID: 'example.monthly' }] }));
  await fixture.ui.refresh();
  fixture.button('manage').click();
  await fixture.flush();
  assert.ok(fixture.calls.includes('manage'));
});

test('personal details and onboarding omit development account copy without dropping privacy controls', () => {
  const html = read('www/index.html');
  assert.doesNotMatch(html, /חשבון וחיבור|חיבור Apple או Google\/Gmail עדיין|חיבור אמיתי דורש|Face ID נועל את הנתונים במכשיר ואינו/);
  assert.doesNotMatch(read('www/js/privacy-ui.js'), /href="https:\/\/apps\.apple\.com\/account\/subscriptions/);
  assert.match(html, /id="onboardingLegalForm"/);
  assert.match(html, /id="privacySettingsCard"/);
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

test('ages 12–17 require a separate explicit guardian declaration and cannot reuse an adult receipt', () => {
  const guardian = { ...choices, ageGroup: 'minor', adultConfirmed: false, guardianConfirmed: true };
  const child = legal.acceptLegalConsent({}, guardian, 'he');
  assert.equal(legal.hasCurrentConsent(child), true);
  assert.equal(child.legalConsent.guardianConfirmed, true);
  assert.equal(child.legalConsent.adultConfirmed, false);
  for (const age of [12, 17]) {
    assert.equal(legal.profileAgeAllowed(child, age), true);
    assert.equal(legal.profileAgeAllowed(confirmed(), age), false);
  }
  for (const age of [18, 120]) {
    assert.equal(legal.profileAgeAllowed(confirmed(), age), true);
    assert.equal(legal.profileAgeAllowed(child, age), false);
  }
  for (const age of [11, 121, 'oops', 12.5]) assert.equal(legal.profileAgeAllowed(child, age), false);
  assert.equal(legal.profileAgeAllowed(child, ''), true);
  for (const value of [false, undefined, 'true', 1]) {
    assert.throws(() => legal.acceptLegalConsent({}, { ...guardian, guardianConfirmed: value }, 'he'), /Explicit/);
  }
  assert.throws(() => legal.acceptLegalConsent({}, { ...guardian, adultConfirmed: true }, 'he'), /Explicit/);
  assert.throws(() => legal.acceptLegalConsent({}, { ...guardian, adultConfirmed: 'true' }, 'he'), /Explicit/);
  assert.throws(() => legal.acceptLegalConsent({}, { ...choices, guardianConfirmed: 'true' }, 'he'), /Explicit/);
  assert.equal(legal.hasCurrentConsent({ legalConsent: { ...child.legalConsent, version: 'commercial-draft-1' } }), false);
  assert.match(legal.legalDocumentHTML('privacy', 'en'), /identity and guardianship are not verified/);
  assert.match(legal.legalDocumentHTML('terms', 'en'), /not child-specific/);
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

test('profile wording defaults safely for legacy data and persists through save, export and legacy restore', () => {
  const storage = memory(sample());
  const db = load('www/js/db.js', ['getProfile', 'saveProfile'], { localStorage: storage });
  const original = db.getProfile();
  assert.equal(original.gender, 'male');
  db.saveProfile({ ...original, gender: 'female' });
  assert.equal(db.getProfile().gender, 'female');
  assert.equal(db.getProfile().name, original.name);
  assert.equal(db.getProfile().photoDataUrl, original.photoDataUrl);
  const exported = legal.exportPersonalData(storage);
  assert.equal(exported.records.ft_profile_v1.gender, 'female');
  const restored = legal.restorableCloudData(Object.fromEntries(storage.data), { language: 'he' });
  assert.equal(JSON.parse(restored.records.find(([key]) => key === 'ft_profile_v1')[1]).gender, 'female');
  assert.deepEqual(plain(exported.records.ft_profile_v1.weightHistory), plain(original.weightHistory));
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
