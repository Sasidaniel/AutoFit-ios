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
  const node = document.querySelector(selector);
  if (!node) throw new Error(`Missing actual app control: ${selector}`);
  node.click();
}
function scrollCard(index) {
  const card = document.querySelector(`.exercise-card[data-entry-index="${index}"]`);
  if (!card) throw new Error('Missing actual exercise card');
  window.scrollTo(0, card.getBoundingClientRect().top + scrollY - 170);
}
async function prepare(screen) {
  if (screen === 'workout') scrollCard(0);
  if (screen === 'sets') {
    click('.exercise-card[data-entry-index="1"] .workout-card-toggle'); scrollCard(1);
  }
  if (screen === 'plans') {
    click('[data-page-link="plans"]'); click('.plan-custom-builder summary'); click('#btnPersonalPlan');
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
  await sleep(1000);
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
