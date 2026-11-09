import { isNative } from '/app/js/native-bridge.js';

const screens = ['workout', 'sets', 'plans', 'saved', 'statistics', 'history', 'cardio', 'library'];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function wait(check, label) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (check()) return;
    await sleep(100);
  }
  throw new Error(`Native screenshot control unavailable: ${label}`);
}
function click(selector) {
  const node = [...document.querySelectorAll(selector)].find((item) => item.getClientRects().length > 0);
  if (!node) throw new Error(`Missing actual app control: ${selector}`);
  node.click();
}
function captureReady(screen) {
  const panels = { workout: 'workout', sets: 'workout', plans: 'plans', saved: 'plans',
    statistics: 'dashboard', history: 'history', cardio: 'workout', library: 'exercises' };
  const panel = document.querySelector(`#tab-${panels[screen]}.active`);
  if (document.visibilityState !== 'visible' || !panel?.getClientRects().length) return false;
  const expected = screen === 'plans' ? 'dialog[open] .training-plan-row'
    : screen === 'saved' ? 'dialog[open].saved-plans-dialog [data-edit-plan]'
    : screen === 'sets' ? '.exercise-card[data-entry-index="1"]:not(.is-collapsed)'
    : screen === 'cardio' ? '.exercise-card[data-entry-index="0"]:not(.is-collapsed)' : null;
  if (expected && !document.querySelector(expected)?.getClientRects().length) return false;
  return ['plans', 'saved'].includes(screen) || !document.querySelector('dialog[open]');
}
async function waitForPaint() {
  await new Promise((resolve, reject) => {
    let frames = 0, requestedFrame;
    const timeout = setTimeout(() => {
      cancelAnimationFrame(requestedFrame);
      reject(new Error(`Native WebView did not present animation frames (${frames}/4 in 30s; ${document.visibilityState})`));
    }, 30000);
    const next = () => {
      if (++frames === 4) { clearTimeout(timeout); resolve(); }
      else requestedFrame = requestAnimationFrame(next);
    };
    requestedFrame = requestAnimationFrame(next);
  });
}
function scrollCard(index) {
  const card = document.querySelector(`.exercise-card[data-entry-index="${index}"]`);
  if (!card) throw new Error('Missing actual exercise card');
  const header = document.querySelector('.topbar');
  const status = document.querySelector('.workout-quick-status');
  const inset = (header?.getBoundingClientRect().bottom || 0)
    + (status?.getClientRects().length ? status.getBoundingClientRect().height + 6 : 0) + 12;
  window.scrollTo(0, card.getBoundingClientRect().top + scrollY - inset);
}
async function prepare(screen) {
  if (screen === 'workout') {
    click('.tab-btn[data-tab="workout"]');
    await wait(() => document.querySelector('#tab-workout.active'), 'visible workout tab');
    window.scrollTo(0, 0);
  }
  if (screen === 'sets') {
    click('.exercise-card[data-entry-index="1"] .workout-card-toggle'); scrollCard(1);
  }
  if (screen === 'plans') {
    click('.tab-btn[data-tab="home"]');
    await wait(() => document.querySelector('#tab-home.active'), 'visible home tab');
    click('#tab-home [data-page-link="plans"]');
    await wait(() => document.querySelector('#tab-plans.active'), 'visible plans tab');
    click('.plan-custom-builder summary'); click('#btnPersonalPlan');
    await wait(() => document.querySelector('dialog[open] #personalPlanForm'), 'personal plan form');
    const form = document.getElementById('personalPlanForm');
    for (const [key, value] of Object.entries({ goal: 'strength', experience: 'regular', days: '3', minutes: '45', location: 'gym' })) {
      form.elements[key].value = value;
      form.elements[key].dispatchEvent(new Event('change', { bubbles: true }));
    }
    for (const value of ['משקולות יד', 'ספסל']) form.querySelector(`[name="equipment"][value="${value}"]`).checked = true;
    form.requestSubmit();
    await wait(() => document.querySelector('dialog[open] .training-plan-row'), 'generated plan');
  }
  if (screen === 'saved') {
    click('#btnSaveAlternatePlan');
    await wait(() => document.querySelector('dialog[open].saved-plans-dialog [data-edit-plan]'), 'saved plan list');
  }
  if (screen === 'statistics') {
    document.querySelectorAll('dialog[open]').forEach((dialog) => dialog.close());
    await sleep(200);
    click('.tab-btn[data-tab="dashboard"]'); window.scrollTo(0, 0);
  }
  if (screen === 'history') { click('.tab-btn[data-tab="history"]'); window.scrollTo(0, 0); }
  if (screen === 'cardio') {
    click('.tab-btn[data-tab="workout"]'); click('.exercise-card[data-entry-index="0"] .workout-card-toggle'); scrollCard(0);
  }
  if (screen === 'library') {
    click('.tab-btn[data-tab="exercises"]'); click('[data-environment="all"]'); click('[data-equipment-group="muscles"]'); window.scrollTo(0, 0);
  }
  document.activeElement?.blur();
  await document.fonts.ready;
  await wait(() => captureReady(screen), `visible ${screen} screen`);
  await sleep(3000);
  await waitForPaint();
  if (!captureReady(screen)) throw new Error(`Native screen changed before capture: ${screen}`);
}

async function run() {
  await wait(() => isNative(), 'real Capacitor bridge');
  await wait(() => document.querySelector('#exerciseList .exercise-card')
    && document.getElementById('splashScreen')?.classList.contains('hidden'), 'app startup');
  let lastID;
  for (;;) {
    const response = await fetch('/native-store-control.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Native capture control HTTP ${response.status}`);
    const command = await response.json();
    if (command.id !== lastID) {
      if (!screens.includes(command.screen) || command.language !== document.documentElement.lang) throw new Error('Unexpected native capture command');
      await prepare(command.screen);
      if (!isNative()) throw new Error('Native bridge became unavailable');
      const params = new URLSearchParams({ id: String(command.id), screen: command.screen, language: command.language, native: 'true' });
      const ready = await fetch(`/native-store-ready?${params}`);
      if (!ready.ok) throw new Error(`Native receipt HTTP ${ready.status}`);
      lastID = command.id;
    }
    await sleep(250);
  }
}
run().catch(async (error) => {
  console.error('Native App Store screenshot preparation failed', error);
  const response = await fetch(`/native-store-error?${new URLSearchParams({ message: error.message })}`);
  if (!response.ok) console.error(`Cannot report native capture failure: HTTP ${response.status}`);
});
