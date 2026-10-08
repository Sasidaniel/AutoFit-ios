// app.js — main application controller
import * as db from './db.js';
import { SEED_EXERCISES } from './seed.js';
import { Stopwatch, RestTimer, formatHMS, playBeep, speak, primeSpeech } from './timer.js';
import * as native from './native-bridge.js';

const KG_TO_LBS = 2.20462;
function round1(n) { return Math.round(n * 10) / 10; }
function round2(n) { return Math.round(n * 100) / 100; }

// one-time rename/category/reps corrections applied to already-saved exercise lists
// (new installs get these directly from seed.js) — keyed by the OLD exercise name.
const EXERCISE_CONTENT_PATCH_V2 = {
  'משיכה לפנים בפולי עליון (אחיזה רחבה)': { newName: 'משיכה לפנים בפולי עליון', category: 'גב עליון' },
  'חתירה צרה לבטן': { category: 'גב אמצעי' },
  'לחיצת רגליים': { category: 'רגליים - 4 ראשי' },
  'פשיטת ברכיים': { category: 'רגליים - 4 ראשי' },
  'כפיפת ברכיים': { category: 'רגליים - המסטרינג' },
  'הרחקה לצדדים עם משקולות יד': { newName: 'הרחקה לצדדים', category: 'כתפיים צדדיות' },
  'הרחקה אופקית (פרפר הפוך)': { category: 'כתפיים אחוריות' },
  'פשיטת מרפקים בפולי עליון (טריצפס)': { newName: 'פשיטת מרפקים בפולי עליון', category: 'יד אחורית' },
  'פשיטת מרפקים בפולי עליון': { category: 'יד אחורית' },
  'כפיפת מרפקים בישיבה (ביצפס)': { newName: 'כפיפת מרפקים בישיבה', category: 'יד קדמית' },
  'כפיפת מרפקים בישיבה': { category: 'יד קדמית' },
  'פטישים (Hammer Curls)': { newName: 'פטישים', category: 'אמות' },
  'כפיפה ופשיטה של שורש כף היד (Wrist Curl)': { newName: 'כפיפה ופשיטה של שורש כף היד', category: 'מפרקי כף יד' },
  'כפיפות בטן / רולאפ': { newName: 'כפיפות בטן', category: 'בטן', defaultReps: '12' },
  'זוקפי גב — פשיטת גב': { category: 'גב תחתון', defaultReps: '12' },
  'פלאנק': { category: 'בטן' },
  'טרפז — הרמת כתפיים עם משקולות (Shrugs)': { newName: 'טרפז', category: 'טרפז', defaultReps: '12' },
};
// every exercise still showing a '12-15'/'15-20' style range gets its reps unified to '12'
// (applied generically below, in addition to the named overrides above)

/* ---------------- state ---------------- */
let exercises = [];
let settings = db.getSettings();
let profile = db.getProfile();
let activeSession = db.getActiveSession(); // { id, startedAt, accumulatedSec, running, entries: [...] }
let workouts = db.getWorkouts();
// transient (not persisted) running hold-timers for hold-type exercises (e.g. plank), keyed by "exerciseId:setIdx"
const holdTimers = new Map();

const stopwatch = new Stopwatch((elapsed) => {
  el('workoutTimerDisplay').textContent = formatHMS(elapsed);
});
let restDoneMessage = 'אפשר להמשיך לסט הבא';
const restTimer = new RestTimer({
  onTick: (remaining) => {
    el('restTimeDisplay').textContent = formatHMS(remaining);
  },
  onDone: () => {
    playBeep();
    if (settings.voiceAnnouncements) speak(`זמן המנוחה הסתיים. ${restDoneMessage}`);
    el('restOverlay').classList.add('hidden');
    showToast(`המנוחה הסתיימה — ${restDoneMessage} 💪`);
    notify('זמן המנוחה הסתיים', restDoneMessage);
  },
});

/* ---------------- notifications (best-effort background alerts) ----------------
   iOS/Safari suspends page JS when the app is fully backgrounded or the screen is
   locked, so a true "always fires on time" background alert needs a push server.
   As a best effort: request permission up-front, fire a system Notification whenever
   a timer completes (shows even if the user briefly switched apps/tabs), and
   force every timer to re-check itself the instant the page becomes visible again. */
function requestNotificationPermission() {
  // This also acts as the one required user-gesture to unlock sound/speech on iOS Safari.
  primeSpeech();
  playBeep();
  if (!('Notification' in window)) {
    showToast('באייפון/ספארי אין תמיכה בהתראות מערכת לאתר כזה ללא שרת Push ייעודי — אבל צליל + הכרזה קולית הופעלו עכשיו ויישמעו אוטומטית כל עוד האתר פתוח 🔊');
    return;
  }
  if (Notification.permission === 'granted') { showToast('התראות כבר מאושרות, וגם צליל/קול הופעלו ✅'); return; }
  Notification.requestPermission().then((perm) => {
    showToast(perm === 'granted' ? 'התראות אושרו ✅ (וגם צליל/קול הופעלו)' : 'התראות נחסמו, אך צליל/קול יעבדו כל עוד האתר פתוח');
  }).catch(() => {});
}
function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification(title, { body, icon: 'icons/icon-192.png', tag: 'autofit-timer' }); } catch (e) { /* noop */ }
}

let wakeLockRef = null;
async function requestWakeLock() {
  // Native iOS WKWebView doesn't support the Wake Lock API — use the native bridge instead.
  if (native.isNative()) { native.keepAwakeEnable(); return; }
  try {
    if ('wakeLock' in navigator) {
      wakeLockRef = await navigator.wakeLock.request('screen');
      wakeLockRef.addEventListener('release', () => { wakeLockRef = null; });
    }
  } catch (e) { /* wake lock not available / denied — timer still stays accurate */ }
}
function releaseWakeLock() {
  if (native.isNative()) { native.keepAwakeDisable(); return; }
  if (wakeLockRef) {
    wakeLockRef.release().catch(() => {});
    wakeLockRef = null;
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (activeSession && activeSession.running) {
      stopwatch.forceTick();
    }
    if (restTimer.isRunning()) restTimer.forceTick();
    tickCardioTimers();
    requestWakeLock();
  }
});
// Some browsers only grant the wake lock from within a user gesture — retry on first tap.
document.addEventListener('click', () => { if (!wakeLockRef) requestWakeLock(); }, { once: false });

function el(id) { return document.getElementById(id); }
function qs(sel, parent = document) { return parent.querySelector(sel); }
function qsa(sel, parent = document) { return Array.from(parent.querySelectorAll(sel)); }

/* ---------------- init ---------------- */
function init() {
  exercises = db.getExercises();
  if (!exercises.length) {
    exercises = SEED_EXERCISES.map((e) => ({ id: db.uid(), active: true, ...e }));
    db.saveExercises(exercises);
    settings.seedSynced = true;
    db.saveSettings(settings);
  } else {
    // migrate older saved exercises that are missing newer fields (images, hold-type, active flag)
    let migrated = false;
    exercises.forEach((ex) => {
      const match = SEED_EXERCISES.find((s) => s.name === ex.name);
      if (!ex.images || (ex.images.length === 0 && match && match.images && match.images.length)) {
        ex.images = match ? match.images : (ex.images || []);
        migrated = true;
      }
      if (match && match.inputType && !ex.inputType) {
        ex.inputType = match.inputType;
        ex.holdSeconds = match.holdSeconds;
        migrated = true;
      }
      if (ex.active === undefined) {
        ex.active = true;
        migrated = true;
      }
      if (ex.restSeconds !== 120) {
        ex.restSeconds = 120;
        migrated = true;
      }
    });
    // one-time content patch (names/categories/reps corrections) for installs that
    // already had an exercises list saved before this update
    if (!settings.exerciseContentPatchV2) {
      exercises.forEach((ex) => {
        const patch = EXERCISE_CONTENT_PATCH_V2[ex.name];
        if (patch) {
          if (patch.newName) ex.name = patch.newName;
          if (patch.category) ex.category = patch.category;
          if (patch.defaultReps) ex.defaultReps = patch.defaultReps;
          migrated = true;
        }
        if (/^\d+\s*-\s*\d+$/.test((ex.defaultReps || '').trim())) {
          ex.defaultReps = '12';
          migrated = true;
        }
      });
      // add warm-up / cool-down as real exercise-list entries (previously lived only
      // in settings.warmupName/warmupMinutes etc.)
      if (!exercises.some((e) => e.id === 'warmup')) {
        exercises.unshift({
          id: 'warmup', name: settings.warmupName || DEFAULT_WARMUP_NAME, category: 'קרדיו',
          inputType: 'cardio', durationMinutes: settings.warmupMinutes || 5, pace: DEFAULT_CARDIO_PACE, active: true,
          defaultSets: 1, defaultReps: '', restSeconds: 0, notes: '', images: [],
        });
        migrated = true;
      }
      if (!exercises.some((e) => e.id === 'cooldown')) {
        exercises.push({
          id: 'cooldown', name: settings.cooldownName || DEFAULT_COOLDOWN_NAME, category: 'קרדיו',
          inputType: 'cardio', durationMinutes: settings.cooldownMinutes || 5, pace: DEFAULT_CARDIO_PACE, active: true,
          defaultSets: 1, defaultReps: '', restSeconds: 0, notes: '', images: [],
        });
        migrated = true;
      }
      settings.exerciseContentPatchV2 = true;
      db.saveSettings(settings);
    }
    if (migrated) db.saveExercises(exercises);
    // Exercises are never auto-added after first install. The user's saved list is the
    // source of truth — renamed, deleted, or custom-named exercises are respected forever.
    if (!settings.seedSynced) {
      settings.seedSynced = true;
      db.saveSettings(settings);
    }
  }
  if (settings.restSeconds !== 120) {
    settings.restSeconds = 120;
    db.saveSettings(settings);
  }
  if (!activeSession) {
    activeSession = buildDraftSession();
  } else {
    // migrate existing active sessions that don't yet have the warm-up/cool-down walk entries
    let sessionMigrated = false;
    if (!activeSession.entries.some((e) => e.exerciseId === 'warmup')) {
      activeSession.entries.unshift(makeCardioEntry('warmup'));
      sessionMigrated = true;
    }
    if (!activeSession.entries.some((e) => e.exerciseId === 'cooldown')) {
      activeSession.entries.push(makeCardioEntry('cooldown'));
      sessionMigrated = true;
    }
    // add newly introduced *active* exercises to the in-progress session too (before the cool-down walk)
    exercises.filter((ex) => ex.active !== false).forEach((ex) => {
      if (!activeSession.entries.some((e) => e.exerciseId === ex.id)) {
        const cooldownIdx = activeSession.entries.findIndex((e) => e.exerciseId === 'cooldown');
        const newEntry = {
          exerciseId: ex.id,
          exerciseName: ex.name,
          sets: Array.from({ length: setsForWeek(ex) }, () => ({ weightKg: '', reps: '', completed: false })),
        };
        if (cooldownIdx === -1) activeSession.entries.push(newEntry);
        else activeSession.entries.splice(cooldownIdx, 0, newEntry);
        sessionMigrated = true;
      }
    });
    if (sessionMigrated) persistActiveSession();
  }

  wireTabs();
  wireWorkoutControls();
  wireSettings();
  wireExercisesTab();
  wireProfileTab();
  wireHistoryTab();
  wireContactTab();
  wireHomeTab();
  renderBrand();
  startLiveClock();
  setInterval(tickCardioTimers, 1000);

  renderWorkoutTab();
  renderHistoryTab();
  renderExercisesTab();
  renderSettingsTab();
  renderProfileTab();
  renderHomeTab();

  // keep the phone screen on the whole time the site is open, not just during a workout
  requestWakeLock();

  if (activeSession.running) {
    stopwatch.start(new Date(activeSession.startedAt).getTime());
    el('btnStartWorkout').classList.add('hidden');
    el('btnFinishWorkout').classList.remove('hidden');
  }

  renderDashboard(); // initial; chart lib loaded via defer, retry if not ready
  waitForChartJs().then(renderDashboard);

  registerServiceWorker();
}

function waitForChartJs() {
  return new Promise((resolve) => {
    if (window.Chart) return resolve();
    const iv = setInterval(() => {
      if (window.Chart) { clearInterval(iv); resolve(); }
    }, 150);
  });
}

/* ---------------- tabs ---------------- */
function wireTabs() {
  qsa('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  el('btnOpenSettings').addEventListener('click', () => switchTab('settings'));
}
function switchTab(tab) {
  qsa('.tab-panel').forEach((p) => p.classList.remove('active'));
  qsa('.tab-btn').forEach((b) => b.classList.remove('active'));
  el(`tab-${tab}`).classList.add('active');
  const btn = qs(`.tab-btn[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');
  if (tab === 'dashboard') renderDashboard();
  if (tab === 'history') renderHistoryTab();
  if (tab === 'home') renderHomeTab();
}

/* ---------------- live clock ---------------- */
function startLiveClock() {
  const tick = () => {
    const now = new Date();
    el('liveClock').textContent = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };
  tick();
  setInterval(tick, 30000);
}

/* ================= WORKOUT TAB ================= */
function buildDraftSession() {
  const lastByExercise = getLastCompletedValuesByExercise();
  const warmupEx = exercises.find((ex) => ex.id === 'warmup' && ex.active !== false);
  const cooldownEx = exercises.find((ex) => ex.id === 'cooldown' && ex.active !== false);
  return {
    id: db.uid(),
    startedAt: null,
    accumulatedSec: 0,
    running: false,
    entries: [
      ...(warmupEx ? [makeCardioEntry('warmup')] : []),
      ...exercises.filter((ex) => ex.active !== false && ex.id !== 'warmup' && ex.id !== 'cooldown').map((ex) => ({
        exerciseId: ex.id,
        exerciseName: ex.name,
        sets: Array.from({ length: setsForWeek(ex) }, (_, i) => {
          const last = lastByExercise[ex.id];
          return {
            weightKg: last ? last.weightKg : '',
            reps: last ? last.reps : '',
            completed: false,
          };
        }),
      })),
      ...(cooldownEx ? [makeCardioEntry('cooldown')] : []),
    ],
  };
}

function makeCardioEntry(kind) {
  const ex = exercises.find((e) => e.id === kind) || {};
  const name = ex.name || (kind === 'warmup' ? DEFAULT_WARMUP_NAME : DEFAULT_COOLDOWN_NAME);
  const minutes = ex.durationMinutes || 5;
  return { exerciseId: kind, exerciseName: name, type: 'cardio', durationSec: minutes * 60, startedAt: null, completed: false, location: 'treadmill', pace: ex.pace || DEFAULT_CARDIO_PACE };
}

function setsForWeek(ex) {
  const week = Math.max(1, Number(settings.programWeek) || 1);
  return Math.max(1, Math.min(week, ex.defaultSets || 1));
}

function applyProgramWeekToActiveSession() {
  if (!activeSession) return;
  activeSession.entries.forEach((entry) => {
    if (entry.type === 'cardio') return;
    const ex = exercises.find((e) => e.id === entry.exerciseId);
    if (!ex) return;
    const desired = setsForWeek(ex);
    while (entry.sets.length < desired) {
      const last = entry.sets.at(-1);
      entry.sets.push({ weightKg: last ? last.weightKg : '', reps: last ? last.reps : '', completed: false });
    }
    while (entry.sets.length > desired) {
      const last = entry.sets.at(-1);
      if (last.completed) break; // never discard a logged set
      entry.sets.pop();
    }
  });
  persistActiveSession();
  renderWorkoutTab();
}

function getLastCompletedValuesByExercise() {
  const map = {};
  for (let i = workouts.length - 1; i >= 0; i--) {
    const w = workouts[i];
    for (const entry of w.entries) {
      if (entry.type === 'cardio' || !entry.sets) continue;
      if (map[entry.exerciseId]) continue;
      const lastSet = [...entry.sets].reverse().find((s) => s.completed);
      if (lastSet) map[entry.exerciseId] = { weightKg: lastSet.weightKg, reps: lastSet.reps };
    }
  }
  return map;
}

function wireWorkoutControls() {
  el('btnStartWorkout').addEventListener('click', () => {
    primeSpeech();
    ensureWorkoutStarted();
  });

  el('btnFinishWorkout').addEventListener('click', () => {
    if (!confirm('לסיים ולשמור את האימון?')) return;
    finishWorkout();
  });

  el('btnCancelWorkout').addEventListener('click', cancelWorkout);

  el('btnSkipRest').addEventListener('click', () => {
    restTimer.stop();
    el('restOverlay').classList.add('hidden');
  });
  el('btnRestAdd15').addEventListener('click', () => restTimer.addSeconds(15));
}

// Starts the overall workout stopwatch the moment ANY activity begins (warm-up,
// a set, etc.) so history always reflects the true total workout duration.
function ensureWorkoutStarted() {
  if (activeSession.running) return;
  activeSession.running = true;
  activeSession.startedAt = activeSession.startedAt || new Date().toISOString();
  persistActiveSession();
  stopwatch.start(new Date(activeSession.startedAt).getTime());
  requestWakeLock();
  el('btnStartWorkout').classList.add('hidden');
  el('btnFinishWorkout').classList.remove('hidden');
}

// Cancels the current workout without saving anything to history, resetting
// the draft back to a blank session (the opposite of finishWorkout's save path).
function cancelWorkout() {
  if (!confirm('לבטל את האימון הנוכחי ולאפס את כל הנתונים שמולאו? פעולה זו לא ניתנת לביטול.')) return;
  stopwatch.stop();
  activeSession.running = false;
  db.clearActiveSession();
  activeSession = buildDraftSession();
  el('workoutTimerDisplay').textContent = '00:00';
  el('btnStartWorkout').classList.remove('hidden');
  el('btnFinishWorkout').classList.add('hidden');
  renderWorkoutTab();
  showToast('האימון בוטל ואופס 🔄');
}

const CELEBRATION_MESSAGES = [
  'כל הכבוד על האימון וההתקדמות! תמשיך כך 💪',
  'אימון מעולה! עוד צעד קדימה למטרה שלך 🔥',
  'וואו, סיימת את זה! הגוף שלך מודה לך 🙌',
  'יפה מאוד! עקביות היא המפתח — תמשיך ככה 🏆',
  'סיימת חזק! מנוחה טובה ומחר ממשיכים 🚀',
];
function showCelebration(record) {
  const msg = CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)];
  const overlay = document.createElement('div');
  overlay.className = 'celebration-overlay';
  overlay.innerHTML = `<div class="celebration-card">
    <div class="celebration-emoji">🎉</div>
    <div class="celebration-text">${escapeHtml(msg)}</div>
    ${record ? `<button class="btn btn-secondary btn-small btnSendHealth" style="margin-top:14px;">${native.isNative() ? '⌚ שמור בבריאות' : '📲 שלח ל-Shortcuts (לבריאות)'}</button>` : ''}
  </div>`;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
  if (record) {
    qs('.btnSendHealth', overlay).addEventListener('click', (e) => {
      e.stopPropagation();
      syncWorkoutToHealth([record]);
    });
  }
  setTimeout(() => overlay.remove(), 5000);
}

function finishWorkout() {
  const durationSec = stopwatch.stop();
  activeSession.running = false;
  activeSession.accumulatedSec = durationSec;

  const hasCompleted = activeSession.entries.some((e) =>
    e.type === 'cardio' ? e.completed : e.sets.some((s) => s.completed)
  );
  if (hasCompleted) {
    const record = {
      id: activeSession.id,
      dateISO: (activeSession.startedAt || new Date().toISOString()),
      finishedAt: new Date().toISOString(),
      durationSec: Math.round(durationSec),
      entries: activeSession.entries
        .map((e) => {
          if (e.type === 'cardio') {
            return e.completed
              ? { exerciseId: e.exerciseId, exerciseName: e.exerciseName, type: 'cardio', durationSec: e.durationSec, completed: true, location: e.location || '', pace: e.pace || '' }
              : null;
          }
          return {
            exerciseId: e.exerciseId,
            exerciseName: e.exerciseName,
            sets: e.sets
              .filter((s) => s.completed)
              .map((s) => ({ weightKg: Number(s.weightKg) || 0, reps: Number(s.reps) || 0, completed: true })),
          };
        })
        .filter((e) => e && (e.type === 'cardio' || e.sets.length > 0)),
    };
    workouts.push(record);
    db.saveWorkouts(workouts);
    showToast('האימון נשמר בהיסטוריה ✅');
    showCelebration(record);
  } else {
    showToast('האימון בוטל (לא הושלם אף סט)');
  }

  db.clearActiveSession();
  activeSession = buildDraftSession();
  el('workoutTimerDisplay').textContent = '00:00';
  el('btnStartWorkout').classList.remove('hidden');
  el('btnFinishWorkout').classList.add('hidden');
  renderWorkoutTab();
  renderHistoryTab();
}

function persistActiveSession() {
  db.saveActiveSession(activeSession);
}

function renderWorkoutTab() {
  const list = el('exerciseList');
  list.innerHTML = '';

  let totalSets = 0, completedSets = 0;
  let exerciseNumber = 0;

  activeSession.entries.forEach((entry) => {
    if (entry.type === 'cardio') {
      exerciseNumber += 1;
      list.appendChild(renderCardioCard(entry, exerciseNumber));
      return;
    }
    const ex = exercises.find((e) => e.id === entry.exerciseId);
    if (!ex) return;
    exerciseNumber += 1;
    totalSets += entry.sets.length;
    completedSets += entry.sets.filter((s) => s.completed).length;

    const card = document.createElement('div');
    card.className = 'exercise-card' + (entry.sets.every((s) => s.completed) ? ' done' : '');

    const head = document.createElement('div');
    head.className = 'exercise-card-head';
    head.innerHTML = `
      <div style="display:flex;gap:8px;align-items:flex-start;">
        <span class="exercise-num">${exerciseNumber}</span>
        <div>
          <div class="exercise-name">${escapeHtml(ex.name)}</div>
          <div class="exercise-muscle-line">${escapeHtml(ex.category)}</div>
          <div class="exercise-meta">${ex.inputType === 'hold' ? `החזקה: ${ex.holdSeconds || 15} שניות` : `${escapeHtml(ex.defaultReps)} חזרות`}${ex.notes ? ' &middot; ' + escapeHtml(ex.notes) : ''}</div>
        </div>
      </div>
      <div class="exercise-head-right">
        ${ex.images && ex.images.length ? '<button class="btn-photo btnShowPhoto">📷 תמונה</button>' : ''}
      </div>
    `;
    if (ex.images && ex.images.length) {
      qs('.btnShowPhoto', head).addEventListener('click', () => openPhotoModal(ex));
    }
    card.appendChild(head);

    const table = document.createElement('table');
    table.className = 'sets-table';
    const repsHeader = ex.inputType === 'hold' ? 'זמן' : 'חזרות';
    table.innerHTML = `<thead><tr>
        <th>סט</th><th>ק"ג</th><th>lbs</th><th>${repsHeader}</th><th>✓</th>
      </tr></thead>`;
    const tbody = document.createElement('tbody');

    entry.sets.forEach((set, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'set-row' + (set.completed ? ' completed' : '');
      const lbsVal = set.weightKg ? round1(Number(set.weightKg) * KG_TO_LBS) : '';
      const repsCell = ex.inputType === 'hold'
        ? '<td class="hold-cell"></td>'
        : `<td><input type="number" inputmode="numeric" class="set-input reps" value="${set.reps}" placeholder="0"></td>`;
      tr.innerHTML = `
        <td class="set-num">${idx + 1}</td>
        <td><input type="number" inputmode="decimal" class="set-input weight" value="${set.weightKg}" placeholder="0"></td>
        <td><input type="number" inputmode="decimal" class="set-input lbs" value="${lbsVal}" placeholder="0"></td>
        ${repsCell}
        <td><button class="set-check ${set.completed ? 'checked' : ''}" aria-label="סט הושלם"></button></td>
      `;
      const weightInput = qs('.weight', tr);
      const lbsInput = qs('.lbs', tr);
      const checkBtn = qs('.set-check', tr);

      weightInput.addEventListener('input', () => {
        set.weightKg = weightInput.value;
        lbsInput.value = weightInput.value ? round1(Number(weightInput.value) * KG_TO_LBS) : '';
        persistActiveSession();
      });
      lbsInput.addEventListener('input', () => {
        const kgVal = lbsInput.value ? round2(Number(lbsInput.value) / KG_TO_LBS) : '';
        set.weightKg = kgVal;
        weightInput.value = kgVal;
        persistActiveSession();
      });

      if (ex.inputType === 'hold') {
        renderHoldCell(qs('.hold-cell', tr), ex, entry, set, idx, () => {
          checkBtn.classList.add('checked');
          tr.classList.add('completed');
          persistActiveSession();
          updateProgress();
          card.classList.toggle('done', entry.sets.every((s) => s.completed));
          const exerciseDone = entry.sets.every((s) => s.completed);
          startRestTimer(ex, exerciseDone, nextEntryName(entry));
        });
      } else {
        const repsInput = qs('.reps', tr);
        repsInput.addEventListener('input', () => {
          set.reps = repsInput.value;
          persistActiveSession();
        });
      }

      checkBtn.addEventListener('click', () => {
        set.completed = !set.completed;
        checkBtn.classList.toggle('checked', set.completed);
        tr.classList.toggle('completed', set.completed);
        persistActiveSession();
        updateProgress();
        card.classList.toggle('done', entry.sets.every((s) => s.completed));
        if (set.completed) {
          ensureWorkoutStarted();
          const exerciseDone = entry.sets.every((s) => s.completed);
          startRestTimer(ex, exerciseDone, nextEntryName(entry));
        }
      });

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    const tableWrap = document.createElement('div');
    tableWrap.className = 'set-table-wrap';
    tableWrap.appendChild(table);
    card.appendChild(tableWrap);

    const actions = document.createElement('div');
    actions.className = 'set-row-actions';
    actions.innerHTML = `
      <button class="btn btn-secondary btn-small btnAddSet">+ סט</button>
      <button class="btn btn-secondary btn-small btnRemoveSet">- סט</button>
    `;
    qs('.btnAddSet', actions).addEventListener('click', () => {
      entry.sets.push({ weightKg: entry.sets.at(-1)?.weightKg || '', reps: entry.sets.at(-1)?.reps || '', completed: false });
      persistActiveSession();
      renderWorkoutTab();
    });
    qs('.btnRemoveSet', actions).addEventListener('click', () => {
      if (entry.sets.length <= 1) return;
      entry.sets.pop();
      persistActiveSession();
      renderWorkoutTab();
    });
    card.appendChild(actions);

    list.appendChild(card);
  });

  updateProgress(totalSets, completedSets);
}

function updateProgress(total, done) {
  const strengthEntries = activeSession.entries.filter((e) => e.type !== 'cardio');
  if (total === undefined) {
    total = strengthEntries.reduce((a, e) => a + e.sets.length, 0);
    done = strengthEntries.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0);
  }
  const pct = total ? Math.round((done / total) * 100) : 0;
  el('setsProgressText').textContent = `${done} / ${total} סטים הושלמו (${pct}%)`;
  el('setsProgressFill').style.width = `${pct}%`;

  const totalEx = activeSession.entries.length;
  const doneEx = activeSession.entries.filter((e) => (
    e.type === 'cardio' ? e.completed : (e.sets.length && e.sets.every((s) => s.completed))
  )).length;
  const exPct = totalEx ? Math.round((doneEx / totalEx) * 100) : 0;
  el('exProgressText').textContent = `${doneEx} / ${totalEx} תרגילים הושלמו (${exPct}%)`;
  el('exProgressFill').style.width = `${exPct}%`;

  // Overall workout percentage is based on sets completion (the finest-grained measure).
  el('overallProgressBadge').textContent = `${pct}%`;
}

function renderCardioCard(entry, number) {
  const card = document.createElement('div');
  const ex = exercises.find((e) => e.id === entry.exerciseId) || {};
  card.className = 'exercise-card' + (entry.completed ? ' done' : '');
  const minutes = Math.round(entry.durationSec / 60);
  const fullDurationSec = (ex.durationMinutes || 5) * 60;
  card.innerHTML = `
    <div class="exercise-card-head">
      <div style="display:flex;gap:8px;align-items:flex-start;">
        <span class="exercise-num">${number}</span>
        <div>
          <div class="exercise-name">${escapeHtml(entry.exerciseName)}</div>
          <div class="exercise-meta">הליכה ${minutes} דקות</div>
        </div>
      </div>
    </div>
    <div class="cardio-body">
      <div class="cardio-timer-display" id="cardio-remaining-${entry.exerciseId}">${formatHMS(entry.startedAt ? Math.max(0, entry.durationSec - (Date.now() - entry.startedAt) / 1000) : entry.durationSec)}</div>
      <div class="cardio-pace-row">
        <select class="select cardioLocation">
          <option value="" ${!entry.location ? 'selected' : ''}>מיקום (לא צויין)</option>
          <option value="treadmill" ${entry.location === 'treadmill' ? 'selected' : ''}>🏃 הליכון</option>
          <option value="outside" ${entry.location === 'outside' ? 'selected' : ''}>🌳 בחוץ</option>
        </select>
        <input class="input cardioPace" type="text" placeholder='קצב/מהירות (לדוגמה: מהירות 6 ~10 קמ"ש)' value="${escapeHtml(entry.pace || '')}">
      </div>
      <div class="settings-actions">
        <button class="btn btn-secondary btn-small btnCardioStart">${entry.startedAt && !entry.completed ? '⏸ עצור' : '▶ התחל'}</button>
        <button class="btn btn-secondary btn-small btnCardioReset">↺ איפוס</button>
        <button class="btn btn-small ${entry.completed ? 'btn-primary' : 'btn-secondary'} btnCardioDone">${entry.completed ? '✓ בוצע' : 'סמן כבוצע'}</button>
      </div>
    </div>
  `;
  qs('.cardioLocation', card).addEventListener('change', (e) => {
    entry.location = e.target.value;
    persistActiveSession();
  });
  qs('.cardioPace', card).addEventListener('input', (e) => {
    entry.pace = e.target.value;
    persistActiveSession();
  });
  qs('.btnCardioStart', card).addEventListener('click', () => {
    if (entry.startedAt && !entry.completed) {
      // pause: bank the elapsed time by shrinking the remaining duration
      const elapsed = (Date.now() - entry.startedAt) / 1000;
      entry.durationSec = Math.max(0, entry.durationSec - elapsed);
      entry.startedAt = null;
    } else {
      ensureWorkoutStarted();
      entry.completed = false;
      entry.startedAt = Date.now();
    }
    persistActiveSession();
    renderWorkoutTab();
  });
  qs('.btnCardioReset', card).addEventListener('click', () => {
    entry.durationSec = fullDurationSec;
    entry.startedAt = null;
    entry.completed = false;
    persistActiveSession();
    renderWorkoutTab();
  });
  qs('.btnCardioDone', card).addEventListener('click', () => {
    entry.completed = !entry.completed;
    entry.startedAt = null;
    persistActiveSession();
    renderWorkoutTab();
  });
  return card;
}

function tickCardioTimers() {
  if (!activeSession) return;
  let needsRerender = false;
  activeSession.entries.forEach((entry) => {
    if (entry.type !== 'cardio' || !entry.startedAt || entry.completed) return;
    const remaining = entry.durationSec - (Date.now() - entry.startedAt) / 1000;
    const span = el(`cardio-remaining-${entry.exerciseId}`);
    if (remaining <= 0) {
      entry.completed = true;
      entry.startedAt = null;
      persistActiveSession();
      playBeep();
      const msg = entry.exerciseId === 'warmup' ? 'החימום הסתיים' : 'השחרור הסתיים';
      if (settings.voiceAnnouncements) speak(msg);
      showToast(`${msg} ✅`);
      notify('AutoFit', msg);
      needsRerender = true;
    } else if (span) {
      span.textContent = formatHMS(remaining);
    }
  });
  if (needsRerender) renderWorkoutTab();
}

/* ---- hold-type (e.g. plank) per-set timer: start -> counts up -> beeps/announces at
   the target duration so the trainee knows when to stop -> stop records the achieved
   duration, auto-checks the set, and kicks off the normal rest timer for the next rep ---- */
function startHoldTicking(display, startedAt, target) {
  return setInterval(() => {
    const elapsed = (Date.now() - startedAt) / 1000;
    display.textContent = formatHMS(elapsed);
    if (elapsed >= target && !display.classList.contains('reached')) {
      display.classList.add('reached');
      playBeep();
      if (settings.voiceAnnouncements) speak(`${target} שניות הושלמו, אפשר לעצור`);
      notify('AutoFit', `${target} שניות הושלמו — אפשר לעצור`);
    }
  }, 250);
}
function renderHoldCell(td, ex, entry, set, idx, onAutoComplete) {
  const key = `${entry.exerciseId}:${idx}`;
  if (set.completed) {
    const state = holdTimers.get(key);
    if (state) { clearInterval(state.intervalId); holdTimers.delete(key); }
    td.innerHTML = `<div class="hold-timer-cell"><span class="hold-result">${escapeHtml(String(set.reps || ex.holdSeconds || 15))} שנ'</span><button class="hold-reset" title="מדוד שוב">↺</button></div>`;
    qs('.hold-reset', td).addEventListener('click', () => {
      set.completed = false;
      set.reps = '';
      persistActiveSession();
      renderWorkoutTab();
    });
    return;
  }
  const target = ex.holdSeconds || 15;
  const existing = holdTimers.get(key);
  const running = !!existing;
  td.innerHTML = `<div class="hold-timer-cell"><span class="hold-timer-display">${running ? formatHMS((Date.now() - existing.startedAt) / 1000) : '0:00'}</span><button class="btn-hold-toggle${running ? ' running' : ''}">${running ? '⏹ עצור' : '▶ התחל'}</button></div>`;
  const display = qs('.hold-timer-display', td);
  const btn = qs('.btn-hold-toggle', td);
  if (existing) {
    clearInterval(existing.intervalId); // old interval pointed at now-detached DOM — rebind to the fresh element
    holdTimers.set(key, { intervalId: startHoldTicking(display, existing.startedAt, target), startedAt: existing.startedAt });
  }
  btn.addEventListener('click', () => {
    const state = holdTimers.get(key);
    if (state) {
      clearInterval(state.intervalId);
      holdTimers.delete(key);
      set.reps = Math.round((Date.now() - state.startedAt) / 1000);
      set.completed = true;
      persistActiveSession();
      onAutoComplete();
      renderWorkoutTab();
    } else {
      ensureWorkoutStarted();
      const startedAt = Date.now();
      holdTimers.set(key, { intervalId: startHoldTicking(display, startedAt, target), startedAt });
      btn.textContent = '⏹ עצור';
      btn.classList.add('running');
    }
  });
}

function nextEntryName(entry) {
  const idx = activeSession.entries.indexOf(entry);
  const next = idx >= 0 ? activeSession.entries[idx + 1] : null;
  return next ? next.exerciseName : null;
}

function startRestTimer(ex, exerciseDone, nextExerciseName) {
  const seconds = ex.restSeconds || settings.restSeconds || 90;
  el('restExerciseName').textContent = ex.name;
  el('restOverlay').classList.remove('hidden');
  playBeep();
  if (exerciseDone) {
    restDoneMessage = nextExerciseName ? 'אפשר להתחיל' : 'האימון הושלם, כל הכבוד!';
    if (settings.voiceAnnouncements) {
      // announce the next exercise FIRST, then that the rest period has started
      speak(nextExerciseName
        ? `${ex.name} הסתיים. התרגיל הבא: ${nextExerciseName}. עכשיו זמן מנוחה`
        : `${ex.name} הסתיים. זה היה התרגיל האחרון. זמן מנוחה`);
    }
  } else {
    restDoneMessage = 'אפשר להמשיך לסט הבא';
    if (settings.voiceAnnouncements) speak('סט הושלם, זמן מנוחה');
  }
  restTimer.start(seconds);
}

/* ================= HISTORY TAB ================= */
const selectedWorkoutIds = new Set();

function renderHistoryTab() {
  workouts = db.getWorkouts();
  const validIds = new Set(workouts.map((w) => w.id));
  [...selectedWorkoutIds].forEach((id) => { if (!validIds.has(id)) selectedWorkoutIds.delete(id); });
  updateHistorySelectBar();
  const list = el('historyList');
  list.innerHTML = '';
  if (!workouts.length) {
    list.innerHTML = '<p class="exercise-meta">עדיין אין אימונים שמורים. בואו נתחיל! 💪</p>';
    return;
  }
  [...workouts].reverse().forEach((w) => {
    const volume = computeVolume(w);
    const strengthEntries = w.entries.filter((e) => e.type !== 'cardio');
    const totalSets = strengthEntries.reduce((a, e) => a + e.sets.length, 0);
    const totalExercises = strengthEntries.length;
    const item = document.createElement('div');
    item.className = 'history-item' + (selectedWorkoutIds.has(w.id) ? ' selected' : '');
    item.innerHTML = `
      <div class="history-item-top">
        <input type="checkbox" class="history-select-check" ${selectedWorkoutIds.has(w.id) ? 'checked' : ''}>
        <div style="flex:1;">
          <div class="history-date">${formatDate(w.dateISO)}</div>
          <div class="history-sub">
            <span>⏱ ${formatHMS(w.durationSec)}</span>
            <span>🏋️ ${totalExercises} תרגילים</span>
            <span>🧮 ${totalSets} סטים</span>
            <span>📦 ${Math.round(volume)} ק"ג נפח</span>
          </div>
        </div>
        <div style="display:flex;gap:2px;">
          <button class="btn-icon btnEditWorkout">✏️</button>
          <button class="btn-icon btnDeleteWorkout">🗑️</button>
        </div>
      </div>
      <div class="history-detail">
        ${w.entries.map((e) => e.type === 'cardio' ? `
          <div class="history-exercise-line">
            <b>${e.exerciseId === 'warmup' ? '🔥' : '🧘'} ${escapeHtml(e.exerciseName)}</b>
            <div class="history-sets-line"><div>✅ בוצע (${Math.round(e.durationSec / 60)} דקות)${formatCardioExtra(e)}</div></div>
          </div>
        ` : `
          <div class="history-exercise-line">
            <b>${escapeHtml(e.exerciseName)}</b>
            <div class="history-sets-line">
              ${e.sets.map((s, i) => `<div>סט ${i + 1}: ${s.weightKg} ק"ג × ${s.reps} חזרות</div>`).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    item.addEventListener('click', (ev) => {
      if (ev.target.closest('.btnDeleteWorkout') || ev.target.closest('.btnEditWorkout') || ev.target.closest('.history-select-check')) return;
      item.classList.toggle('open');
    });
    qs('.history-select-check', item).addEventListener('change', (ev) => {
      if (ev.target.checked) selectedWorkoutIds.add(w.id);
      else selectedWorkoutIds.delete(w.id);
      item.classList.toggle('selected', ev.target.checked);
      updateHistorySelectBar();
    });
    qs('.btnEditWorkout', item).addEventListener('click', (ev) => {
      ev.stopPropagation();
      openEditWorkoutModal(w);
    });
    qs('.btnDeleteWorkout', item).addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (!confirm('למחוק את האימון הזה?')) return;
      workouts = workouts.filter((x) => x.id !== w.id);
      db.saveWorkouts(workouts);
      renderHistoryTab();
      renderDashboard();
    });
    list.appendChild(item);
  });
}

function openEditWorkoutModal(workout) {
  const clone = JSON.parse(JSON.stringify(workout));
  const overlay = document.createElement('div');
  overlay.className = 'photo-overlay';
  overlay.innerHTML = `
    <div class="photo-modal">
      <div class="photo-modal-head"><b>עריכת אימון — ${formatDate(clone.dateISO)}</b><button class="btn-icon btnCloseEditW">✕</button></div>
      <div class="edit-workout-body">
        ${clone.entries.map((e, ei) => e.type === 'cardio' ? `
          <div class="edit-exercise-block">
            <div class="edit-exercise-title">${e.exerciseId === 'warmup' ? '🔥' : '🧘'} ${escapeHtml(e.exerciseName)} — ✅ בוצע</div>
          </div>
        ` : `
          <div class="edit-exercise-block" data-ei="${ei}">
            <div class="edit-exercise-title">${escapeHtml(e.exerciseName)}</div>
            ${e.sets.map((s, si) => `
              <div class="edit-set-row" data-si="${si}">
                <span class="set-num">סט ${si + 1}</span>
                <input type="number" inputmode="decimal" class="input edit-weight" value="${s.weightKg}" placeholder="ק&quot;ג">
                <input type="number" inputmode="numeric" class="input edit-reps" value="${s.reps}" placeholder="חזרות">
                <button class="btn-icon btnDeleteEditSet">🗑️</button>
              </div>
            `).join('')}
          </div>
        `).join('')}
      </div>
      <div class="settings-actions">
        <button class="btn btn-primary btnSaveEditW">שמור שינויים</button>
        <button class="btn btn-secondary btnCancelEditW">ביטול</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  qs('.btnCloseEditW', overlay).addEventListener('click', close);
  qs('.btnCancelEditW', overlay).addEventListener('click', close);
  qsa('.btnDeleteEditSet', overlay).forEach((btn) => {
    btn.addEventListener('click', () => btn.closest('.edit-set-row').remove());
  });
  qs('.btnSaveEditW', overlay).addEventListener('click', () => {
    qsa('.edit-exercise-block[data-ei]', overlay).forEach((block) => {
      const ei = Number(block.dataset.ei);
      const rows = qsa('.edit-set-row', block);
      clone.entries[ei].sets = rows.map((row) => ({
        weightKg: Number(qs('.edit-weight', row).value) || 0,
        reps: Number(qs('.edit-reps', row).value) || 0,
        completed: true,
      }));
    });
    clone.entries = clone.entries.filter((e) => e.type === 'cardio' || e.sets.length > 0);
    workouts = db.getWorkouts().map((w) => (w.id === clone.id ? clone : w));
    db.saveWorkouts(workouts);
    close();
    renderHistoryTab();
    renderDashboard();
    showToast('האימון עודכן ✅');
  });
}

/* ---------------- share workout(s) (email / WhatsApp / PDF / image) ---------------- */
function formatCardioExtra(entry) {
  const parts = [];
  if (entry.location === 'treadmill') parts.push('🏃 הליכון');
  else if (entry.location === 'outside') parts.push('🌳 בחוץ');
  if (entry.pace) parts.push(entry.pace);
  return parts.length ? ` — ${parts.join(' · ')}` : '';
}

function buildWorkoutShareLines(workoutsArr) {
  const who = profile && profile.name ? ` — ${profile.name}` : '';
  const lines = [];
  if (workoutsArr.length > 1) {
    const totalVolume = workoutsArr.reduce((a, w) => a + computeVolume(w), 0);
    lines.push(`💪 ${workoutsArr.length} אימוני AutoFit${who}`);
    lines.push(`📦 נפח מצטבר: ${Math.round(totalVolume).toLocaleString()} ק"ג`);
    lines.push('');
  }
  workoutsArr.forEach((w, wi) => {
    if (workoutsArr.length > 1) lines.push(`━━━ אימון ${wi + 1} ━━━`);
    else lines.push(`💪 אימון AutoFit${who}`);
    lines.push(`📅 ${formatDate(w.dateISO)}`);
    lines.push(`⏱ משך האימון: ${formatHMS(w.durationSec)}`);
    lines.push(`📦 נפח: ${Math.round(computeVolume(w)).toLocaleString()} ק"ג`);
    lines.push('');
    w.entries.forEach((e) => {
      if (e.type === 'cardio') {
        if (e.completed) lines.push(`${e.exerciseId === 'warmup' ? '🔥 חימום' : '🧘 שחרור'}: ${Math.round(e.durationSec / 60)} דקות${formatCardioExtra(e)}`);
        return;
      }
      if (!e.sets.length) return;
      lines.push(`🏋️ ${e.exerciseName}`);
      e.sets.forEach((s, i) => lines.push(`   סט ${i + 1}: ${s.weightKg} ק"ג × ${s.reps}`));
    });
    lines.push('');
  });
  lines.push('נשלח מתוך AutoFit 🚀');
  return lines;
}

// Renders a styled, white-background, table-like summary onto a canvas (shared by
// both the image-share and PDF-share paths). Canvas is used (rather than jsPDF's
// native text API) because jsPDF's built-in fonts don't include Hebrew glyphs —
// the canvas renders Hebrew natively via the OS font and we embed the result as
// an image, giving us a clean printable look with a real white background.
function buildWorkoutShareCanvas(workoutsArr) {
  const width = 760;
  const margin = 28;
  const innerWidth = width - margin * 2;
  const COLORS = {
    bg: '#ffffff', text: '#1f2430', muted: '#6b7280', border: '#e1e5f0',
    primary: '#96751f', primarySoft: '#f6ecd2', rowAlt: '#f7f9fc', success: '#16a34a',
  };
  const who = profile && profile.name ? ` — ${profile.name}` : '';

  // ---- Pass 1: build a flat list of draw "blocks" and measure total height ----
  const blocks = [];
  const add = (type, h, data) => blocks.push({ type, h, ...data });
  add('title', 54, { text: `💪 AutoFit${who}` });
  if (workoutsArr.length > 1) {
    const totalVolume = workoutsArr.reduce((a, w) => a + computeVolume(w), 0);
    add('stats', 46, { stats: [`${workoutsArr.length} אימונים`, `${Math.round(totalVolume).toLocaleString()} ק"ג נפח מצטבר`] });
  }
  workoutsArr.forEach((w, wi) => {
    if (wi > 0) add('divider', 24, {});
    if (workoutsArr.length > 1) add('section', 34, { text: `אימון ${wi + 1} — ${formatDate(w.dateISO)}` });
    add('stats', 46, { stats: [formatDate(w.dateISO), `⏱ ${formatHMS(w.durationSec)}`, `📦 ${Math.round(computeVolume(w)).toLocaleString()} ק"ג`] });
    w.entries.forEach((e) => {
      if (e.type === 'cardio') {
        if (!e.completed) return;
        const icon = e.exerciseId === 'warmup' ? '🔥' : '🧘';
        add('cardio', 40, { text: `${icon} ${e.exerciseName} — ${Math.round(e.durationSec / 60)} דקות${formatCardioExtra(e)}` });
        return;
      }
      if (!e.sets.length) return;
      add('exTitle', 36, { text: e.exerciseName });
      add('tableHeader', 28, {});
      e.sets.forEach((s, i) => add('tableRow', 26, { i, weightKg: s.weightKg, reps: s.reps }));
      add('spacer', 8, {});
    });
  });
  add('footer', 40, { text: 'נשלח מתוך AutoFit 🚀' });

  const height = margin + blocks.reduce((a, b) => a + b.h, 0) + margin;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // ---- Pass 2: draw ----
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, width, height);
  ctx.direction = 'rtl';
  const right = width - margin;
  let y = margin;

  blocks.forEach((b) => {
    const cy = y + b.h / 2;
    if (b.type === 'title') {
      ctx.textAlign = 'right';
      ctx.fillStyle = COLORS.primary;
      ctx.font = 'bold 26px Arial';
      ctx.fillText(b.text, right, y + 34);
    } else if (b.type === 'section') {
      ctx.textAlign = 'right';
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 18px Arial';
      ctx.fillText(b.text, right, y + 24);
    } else if (b.type === 'stats') {
      const n = b.stats.length;
      const gap = 10;
      const boxW = (innerWidth - gap * (n - 1)) / n;
      b.stats.forEach((s, i) => {
        const bx = right - boxW - i * (boxW + gap);
        ctx.fillStyle = COLORS.primarySoft;
        ctx.fillRect(bx, y, boxW, b.h - 8);
        ctx.fillStyle = COLORS.primary;
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(s, bx + boxW / 2, y + (b.h - 8) / 2 + 5);
      });
      ctx.textAlign = 'right';
    } else if (b.type === 'divider') {
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(margin, cy);
      ctx.lineTo(width - margin, cy);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (b.type === 'exTitle') {
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 17px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`🏋️ ${b.text}`, right, y + 24);
    } else if (b.type === 'cardio') {
      ctx.fillStyle = COLORS.rowAlt;
      ctx.fillRect(margin, y, innerWidth, b.h - 6);
      ctx.fillStyle = COLORS.text;
      ctx.font = '14px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(b.text, right - 10, y + (b.h - 6) / 2 + 5);
    } else if (b.type === 'tableHeader') {
      ctx.fillStyle = COLORS.primary;
      ctx.fillRect(margin, y, innerWidth, b.h);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('סט', right - innerWidth * 0.15, y + b.h / 2 + 4);
      ctx.fillText('ק"ג', right - innerWidth * 0.5, y + b.h / 2 + 4);
      ctx.fillText('חזרות', right - innerWidth * 0.85, y + b.h / 2 + 4);
      ctx.textAlign = 'right';
    } else if (b.type === 'tableRow') {
      if (b.i % 2 === 1) { ctx.fillStyle = COLORS.rowAlt; ctx.fillRect(margin, y, innerWidth, b.h); }
      ctx.strokeStyle = COLORS.border;
      ctx.lineWidth = 1;
      ctx.strokeRect(margin, y, innerWidth, b.h);
      ctx.fillStyle = COLORS.text;
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(String(b.i + 1), right - innerWidth * 0.15, y + b.h / 2 + 5);
      ctx.fillText(String(b.weightKg), right - innerWidth * 0.5, y + b.h / 2 + 5);
      ctx.fillText(String(b.reps), right - innerWidth * 0.85, y + b.h / 2 + 5);
      ctx.textAlign = 'right';
    } else if (b.type === 'footer') {
      ctx.fillStyle = COLORS.muted;
      ctx.font = '13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(b.text, width / 2, y + 24);
      ctx.textAlign = 'right';
    }
    y += b.h;
  });

  return canvas;
}

// Sharing an image is far more reliable for WhatsApp (and most share targets)
// than a generated PDF, and fully supports Hebrew/RTL.
function buildWorkoutShareImage(workoutsArr) {
  const canvas = buildWorkoutShareCanvas(workoutsArr);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
}

// Builds a real PDF file (not just a print dialog) by embedding the rendered
// canvas as an image inside a jsPDF document, so it can be shared as an actual
// attachable file via the native share sheet (unlike window.print(), which only
// opens the browser print UI and cannot be "sent" directly to an app).
function buildWorkoutSharePdf(workoutsArr) {
  const canvas = buildWorkoutShareCanvas(workoutsArr);
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) return null;
  const pxToMm = 0.264583;
  const wMm = canvas.width * pxToMm;
  const hMm = canvas.height * pxToMm;
  const doc = new jsPDF({ orientation: hMm > wMm ? 'p' : 'l', unit: 'mm', format: [wMm, hMm] });
  doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, wMm, hMm);
  return doc.output('blob');
}

// Shares a file (image/PNG or application/pdf) through the native OS share sheet
// when supported (this is what makes "send to WhatsApp/Mail" actually work,
// since neither wa.me nor mailto: support file attachments). Falls back to a
// plain download so the user can still attach it manually.
async function shareFile(blob, filename, mime) {
  if (!blob) { showToast('היצירה נכשלה, נסה שוב'); return; }
  const file = new File([blob], filename, { type: mime });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'אימון AutoFit' }); return; } catch (e) { return; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  showToast('הקובץ הורד — אפשר לצרף ולשלוח אותו ידנית במייל/וואטסאפ');
}

// ---- Apple Health sync (via a one-time user-created Shortcuts automation) ----
// A web app/PWA cannot write to HealthKit directly — only native, App-Store-signed
// apps have that entitlement. The closest real bridge is: hand the workout's
// duration to the iOS Shortcuts app (which *can* log a workout to Health), via its
// `shortcuts://run-shortcut` URL scheme. This requires the user to create a small
// Shortcut once (see openHealthSyncHelp for the exact steps).
const HEALTH_SHORTCUT_NAME = 'AutoFit לבריאות';

function sendWorkoutToHealthShortcut(workoutsArr) {
  const totalMinutes = Math.max(1, Math.round(workoutsArr.reduce((a, w) => a + w.durationSec, 0) / 60));
  // Use the actual workout's own date (not "today"), so the Shortcut can log it to
  // Health on the correct day even when sent later from history.
  const d = new Date(workoutsArr[0].dateISO);
  const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  // "|"-separated so the Shortcut splits it into exactly 2 clean parts — the duration
  // part has no stray digits (unlike the date), so number/date extraction stays unambiguous.
  const text = `${totalMinutes}|${dateStr}`;
  const url = `shortcuts://run-shortcut?name=${encodeURIComponent(HEALTH_SHORTCUT_NAME)}&input=text&text=${encodeURIComponent(text)}`;
  window.location.href = url;
  showToast(`נשלח ל-Shortcuts (${totalMinutes} דקות, ${dateStr}) — ודא שהקיצור "${HEALTH_SHORTCUT_NAME}" מוגדר ⌚`);
}

// In the native app, write straight to HealthKit — no Shortcuts bridge needed.
// Falls back to the Shortcuts flow automatically when running as a plain web/PWA.
async function syncWorkoutToHealth(workoutsArr) {
  if (!native.isNative()) {
    sendWorkoutToHealthShortcut(workoutsArr);
    return;
  }
  const auth = await native.healthRequestAuthorization();
  if (!auth.granted) {
    showToast('אין הרשאה לכתוב לאפליקציית הבריאות — אשר בהגדרות > פרטיות > בריאות ⌚');
    return;
  }
  for (const w of workoutsArr) {
    const startMillis = new Date(w.dateISO).getTime();
    const res = await native.healthSaveWorkout({ startMillis, durationSec: Math.round(w.durationSec) });
    if (!res.saved) {
      showToast('שמירה לבריאות נכשלה — ' + (res.reason || ''));
      return;
    }
  }
  showToast(`נשמר באפליקציית הבריאות ✅ (${workoutsArr.length} אימון${workoutsArr.length > 1 ? 'ים' : ''})`);
}

function openHealthSyncHelp() {
  const overlay = document.createElement('div');
  overlay.className = 'photo-overlay';
  overlay.innerHTML = `
    <div class="photo-modal">
      <div class="photo-modal-head"><b>⌚ סנכרון לאפליקציית בריאות</b><button class="btn-icon btnCloseHealthHelp">✕</button></div>
      <div style="font-size:13px; line-height:1.9; color:var(--text);">
        <p>דפדפן/אפליקציית אינטרנט לא יכולה לכתוב ישירות ל-HealthKit של אפל — זו הגבלה של אפל שתקפה לכל אתר, לא רק ל-AutoFit. הדרך הריאלית: קיצור (Shortcut) חד-פעמי שאתה יוצר, שמקבל טקסט מ-AutoFit (עם משך האימון והתאריך האמיתי שלו, מופרדים ב-"|") ורושם את זה לבריאות.</p>
        <p><b>הגדרה (פעם אחת):</b></p>
        <ol style="padding-right:18px; margin:0;">
          <li>פתח את אפליקציית <b>קיצורים (Shortcuts)</b> באייפון.</li>
          <li>צור קיצור חדש וקרא לו בדיוק: <b>${escapeHtml(HEALTH_SHORTCUT_NAME)}</b></li>
          <li>הוסף פעולה <b>"פיצול טקסט" (Split Text)</b> — על "קלט הקיצור" (Shortcut Input), עם מפריד מותאם אישית (Custom): <b>|</b></li>
          <li>הוסף פעולה <b>"קבלת פריט מתוך רשימה" (Get Item from List)</b> — פריט מספר <b>1</b> (זה מספר הדקות).</li>
          <li>הוסף פעולה נוספת <b>"קבלת פריט מתוך רשימה"</b> — פריט מספר <b>2</b> (זה התאריך).</li>
          <li>הוסף פעולה <b>"קבלת תאריכים מהקלט" (Get Dates from Input)</b> — תפעל על התוצאה של "פריט 2" ותהפוך אותו לתאריך.</li>
          <li>הוסף פעולה <b>"רישום אימון" (Log Workout)</b>.</li>
          <li>בחר סוג אימון (למשל: אימון כוח פונקציונלי).</li>
          <li>בשדה <b>תאריך (Date)</b> הקש על הערך ובחר את התוצאה של "קבלת תאריכים מהקלט".</li>
          <li>בשדה <b>משך (Duration)</b> הקש על הערך ובחר את התוצאה של "פריט 1", וודא שהיחידה מוגדרת לדקות.</li>
          <li>שמור את הקיצור.</li>
        </ol>
        <p>חשוב: יש לבדוק את הקיצור רק דרך כפתור "שלח ל-Shortcuts" ב-AutoFit (למשל אחרי סיום אימון, או מההיסטוריה) — לא ע"י הפעלה ישירה בתוך אפליקציית הקיצורים, כי אז אין קלט בכלל והקיצור ייכשל.</p>
        <p>מעכשיו, בכל לחיצה על "שלח ל-Shortcuts" מ-AutoFit, משך האימון והתאריך האמיתי שלו יועברו אוטומטית ויירשמו בבריאות. (בבחירת כמה אימונים יחד — יישלח התאריך של הראשון מביניהם.)</p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  qs('.btnCloseHealthHelp', overlay).addEventListener('click', () => overlay.remove());
}

// Simple format checks — not deliverability checks, just "does this look like a
// real email / Israeli mobile number" so the user catches typos before sharing.
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
function isValidIsraeliPhone(value) {
  const digits = value.trim().replace(/[\s-]/g, '');
  return /^(0|\+972|972)5\d{8}$/.test(digits);
}

function openShareModal(workoutsArr) {
  const list = Array.isArray(workoutsArr) ? workoutsArr : [workoutsArr];
  const title = list.length > 1 ? `שיתוף ${list.length} אימונים` : `שיתוף אימון — ${formatDate(list[0].dateISO)}`;
  const overlay = document.createElement('div');
  overlay.className = 'photo-overlay';
  overlay.innerHTML = `
    <div class="photo-modal">
      <div class="photo-modal-head"><b>${title}</b><button class="btn-icon btnCloseShare">✕</button></div>
      <label class="field-label">כתובת מייל לשיתוף (אופציונלי)</label>
      <input class="input" id="shareEmail" type="email" dir="ltr">
      <label class="field-label">מספר טלפון לשיתוף בוואטסאפ (אופציונלי)</label>
      <input class="input" id="sharePhone" type="tel" dir="ltr">
      <div class="field-hint">אם תמלא שדה — נוודא שהוא תקין, ואז תוכל לבחור את איש הקשר הזה בתפריט השיתוף שייפתח (לא ניתן לשלוח אוטומטית בגלל מגבלת אפל על צירוף קבצים).</div>
      <div class="settings-actions" style="flex-direction:column;">
        <button class="btn btn-primary" id="sharePdf">📄 שתף כ-PDF (למייל/וואטסאפ)</button>
        <button class="btn btn-secondary" id="shareImage">🖼️ שתף כתמונה (למייל/וואטסאפ)</button>
        ${native.isNative() ? '' : `
        <div style="display:flex; gap:6px;">
          <button class="btn btn-secondary" id="sendHealth" style="flex:1;">⌚ שלח ל-Shortcuts (לבריאות)</button>
          <button class="btn-icon btnHealthHelp" title="איך זה עובד?">ℹ️</button>
        </div>`}
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  qs('.btnCloseShare', overlay).addEventListener('click', close);

  // Returns the validated recipient to remind the user about, or false if an
  // entered field is invalid (blocks sharing until fixed or cleared).
  function getValidatedRecipient() {
    const email = qs('#shareEmail', overlay).value.trim();
    const phone = qs('#sharePhone', overlay).value.trim();
    if (email && !isValidEmail(email)) { showToast('כתובת המייל לא תקינה'); return false; }
    if (phone && !isValidIsraeliPhone(phone)) { showToast('מספר הטלפון לא תקין (פורמט ישראלי: 05XXXXXXXX)'); return false; }
    return email || phone || null;
  }

  qs('#sharePdf', overlay).addEventListener('click', async () => {
    const recipient = getValidatedRecipient();
    if (recipient === false) return;
    const blob = buildWorkoutSharePdf(list);
    await shareFile(blob, `autofit-${Date.now()}.pdf`, 'application/pdf');
    if (recipient) showToast(`בחר את ${recipient} בתפריט השיתוף ✅`);
    close();
  });
  qs('#shareImage', overlay).addEventListener('click', async () => {
    const recipient = getValidatedRecipient();
    if (recipient === false) return;
    const blob = await buildWorkoutShareImage(list);
    await shareFile(blob, `autofit-${Date.now()}.png`, 'image/png');
    if (recipient) showToast(`בחר את ${recipient} בתפריט השיתוף ✅`);
    close();
  });
  if (!native.isNative()) {
    qs('#sendHealth', overlay).addEventListener('click', () => {
      syncWorkoutToHealth(list);
      close();
    });
    qs('.btnHealthHelp', overlay).addEventListener('click', (e) => {
      e.stopPropagation();
      openHealthSyncHelp();
    });
  }
}

function updateHistorySelectBar() {
  const n = selectedWorkoutIds.size;
  el('historySelectCount').textContent = `${n} נבחרו`;
}

function wireHistoryTab() {
  el('btnShareSelected').addEventListener('click', () => {
    const selected = workouts.filter((w) => selectedWorkoutIds.has(w.id))
      .sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));
    if (!selected.length) {
      showToast('בחר לפחות אימון אחד מההיסטוריה כדי לשתף ✅');
      return;
    }
    openShareModal(selected);
  });
  el('btnClearSelection').addEventListener('click', () => {
    selectedWorkoutIds.clear();
    renderHistoryTab();
  });
}

function computeVolume(workout) {
  return workout.entries.reduce((sum, e) => {
    if (e.type === 'cardio' || !e.sets) return sum;
    return sum + e.sets.reduce((s2, s) => s2 + (s.weightKg * s.reps), 0);
  }, 0);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('he-IL', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

/* ================= DASHBOARD TAB ================= */
let volumeChartInstance = null;
let setsChartInstance = null;
let exerciseChartInstance = null;
let consistencyChartInstance = null;
let bodyWeightChartInstance = null;

function renderDashboard() {
  workouts = db.getWorkouts();
  renderStatsGrid();
  renderVolumeChart();
  renderSetsChart();
  renderExercisePicker();
  renderConsistencyChart();
  renderBodyWeightChart();
}

function renderStatsGrid() {
  const grid = el('statsGrid');
  const totalWorkouts = workouts.length;
  const totalVolume = workouts.reduce((a, w) => a + computeVolume(w), 0);
  const avgDuration = totalWorkouts ? workouts.reduce((a, w) => a + w.durationSec, 0) / totalWorkouts : 0;
  const streak = computeStreak();
  const weekCount = countThisWeek();

  const stats = [
    { label: 'שבוע תוכנית נוכחי', value: settings.programWeek || 1 },
    { label: 'סה"כ אימונים', value: totalWorkouts },
    { label: 'נפח כולל (ק"ג)', value: Math.round(totalVolume).toLocaleString() },
    { label: 'זמן ממוצע', value: formatHMS(avgDuration) },
    { label: 'רצף שבועות', value: streak },
    { label: `השבוע (יעד ${settings.weeklyGoal})`, value: `${weekCount}/${settings.weeklyGoal}` },
    { label: 'סטים כולל', value: workouts.reduce((a, w) => a + w.entries.reduce((b, e) => b + (e.type === 'cardio' ? 0 : e.sets.length), 0), 0) },
  ];
  grid.innerHTML = stats.map((s) => `
    <div class="stat-box"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
  `).join('');
}

function computeStreak() {
  // consecutive weeks (ISO week) with at least one workout, counting back from current week
  if (!workouts.length) return 0;
  const weeksWithWorkout = new Set(workouts.map((w) => isoWeekKey(new Date(w.dateISO))));
  let streak = 0;
  let cursor = new Date();
  while (true) {
    const key = isoWeekKey(cursor);
    if (weeksWithWorkout.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 7);
    } else break;
  }
  return streak;
}
function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}
function countThisWeek() {
  const now = new Date();
  const key = isoWeekKey(now);
  return workouts.filter((w) => isoWeekKey(new Date(w.dateISO)) === key).length;
}

function renderVolumeChart() {
  if (!window.Chart) return;
  const ctx = el('volumeChart');
  const sorted = [...workouts].sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));
  const labels = sorted.map((w) => new Date(w.dateISO).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }));
  const data = sorted.map((w) => Math.round(computeVolume(w)));

  if (volumeChartInstance) volumeChartInstance.destroy();
  volumeChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'נפח (ק"ג)', data, borderColor: '#96751f', backgroundColor: '#96751f33', tension: 0.3, fill: true }] },
    options: chartBaseOptions(),
  });
}

function renderSetsChart() {
  if (!window.Chart) return;
  const ctx = el('setsChart');
  const sorted = [...workouts].sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO));
  const labels = sorted.map((w) => new Date(w.dateISO).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }));
  const data = sorted.map((w) => w.entries.reduce((b, e) => b + (e.type === 'cardio' ? 0 : e.sets.length), 0));

  if (setsChartInstance) setsChartInstance.destroy();
  setsChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: 'סטים', data, borderColor: '#3b82f6', backgroundColor: '#3b82f633', tension: 0.3, fill: true }] },
    options: chartBaseOptions(),
  });
}

function renderExercisePicker() {
  const select = el('exercisePickerChart');
  const prev = select.value;
  select.innerHTML = exercises.filter((e) => e.inputType !== 'cardio').map((e) => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
  if (prev && exercises.some((e) => e.id === prev)) select.value = prev;
  select.onchange = renderExerciseChart;
  const metricSelect = el('exerciseMetricPicker');
  metricSelect.onchange = renderExerciseChart;
  renderExerciseChart();
}

const EXERCISE_METRIC_LABELS = {
  weight: 'משקל מקסימלי (ק"ג)',
  reps: 'חזרות מקסימליות',
  sets: 'מספר סטים',
  volume: 'נפח (משקל × חזרות)',
};
function renderExerciseChart() {
  if (!window.Chart) return;
  const exId = el('exercisePickerChart').value;
  const metric = el('exerciseMetricPicker').value;
  const ctx = el('exerciseChart');
  const points = [];
  [...workouts].sort((a, b) => new Date(a.dateISO) - new Date(b.dateISO)).forEach((w) => {
    const entry = w.entries.find((e) => e.exerciseId === exId);
    if (!entry || !entry.sets.length) return;
    const completedSets = entry.sets.filter((s) => s.weightKg !== '' && s.weightKg != null);
    if (!completedSets.length) return;
    let value;
    if (metric === 'reps') {
      value = Math.max(...completedSets.map((s) => Number(s.reps) || 0));
    } else if (metric === 'sets') {
      value = completedSets.length;
    } else if (metric === 'volume') {
      value = completedSets.reduce((sum, s) => sum + (Number(s.weightKg) || 0) * (Number(s.reps) || 0), 0);
    } else {
      value = Math.max(...completedSets.map((s) => Number(s.weightKg) || 0));
    }
    points.push({ date: new Date(w.dateISO).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }), value });
  });
  if (exerciseChartInstance) exerciseChartInstance.destroy();
  exerciseChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: points.map((p) => p.date),
      datasets: [{ label: EXERCISE_METRIC_LABELS[metric] || EXERCISE_METRIC_LABELS.weight, data: points.map((p) => Math.round(p.value * 10) / 10), borderColor: '#22c55e', backgroundColor: '#22c55e33', tension: 0.3, fill: true }],
    },
    options: chartBaseOptions(),
  });
}

function renderConsistencyChart() {
  if (!window.Chart) return;
  const ctx = el('consistencyChart');
  const weeks = [];
  const counts = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const key = isoWeekKey(d);
    weeks.push(key.replace(/^\d+-/, ''));
    counts.push(workouts.filter((w) => isoWeekKey(new Date(w.dateISO)) === key).length);
  }
  if (consistencyChartInstance) consistencyChartInstance.destroy();
  consistencyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels: weeks, datasets: [{ label: 'אימונים בשבוע', data: counts, backgroundColor: counts.map((c) => c >= settings.weeklyGoal ? '#16a34a' : '#eab308') }] },
    options: chartBaseOptions(),
  });
}

function renderBodyWeightChart() {
  if (!window.Chart) return;
  const ctx = el('bodyWeightChart');
  const history = profile.weightHistory || [];
  const labels = history.map((h) => new Date(h.dateISO).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }));
  const data = history.map((h) => h.weightKg);
  if (bodyWeightChartInstance) bodyWeightChartInstance.destroy();
  bodyWeightChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: 'משקל גוף (ק"ג)', data, borderColor: '#f59e0b', backgroundColor: '#f59e0b33', tension: 0.3, fill: true }],
    },
    options: chartBaseOptions(),
  });
}

function chartBaseOptions() {
  return {
    responsive: true,
    plugins: { legend: { labels: { color: '#c8ccd8' } } },
    scales: {
      x: { ticks: { color: '#9aa0ad' }, grid: { color: '#20232e' } },
      y: { ticks: { color: '#9aa0ad' }, grid: { color: '#20232e' }, beginAtZero: true },
    },
  };
}

/* ================= EXERCISES TAB ================= */
function wireExercisesTab() {
  el('btnAddExercise').addEventListener('click', () => {
    const draft = { id: db.uid(), name: '', category: 'כללי', defaultSets: 3, defaultReps: '12', restSeconds: 120, notes: '', images: [], active: true };
    openExerciseEditModal(draft, { isNew: true });
  });
}

const DEFAULT_WARMUP_NAME = 'חימום-הליכה';
const DEFAULT_COOLDOWN_NAME = 'שחרור-הליכה';
const DEFAULT_CARDIO_PACE = 'קצב 6 בהליכון';

function renderExercisesTab() {
  const list = el('exerciseManageList');
  list.innerHTML = '';
  exercises.forEach((ex, index) => {
    const isCardio = ex.inputType === 'cardio';
    const item = document.createElement('div');
    item.className = 'exercise-manage-item sortable-item' + (ex.active === false ? ' inactive' : '');
    item.dataset.id = ex.id;
    const metaLine = isCardio
      ? `${escapeHtml(ex.category)} &middot; ${ex.durationMinutes || 5} דקות`
      : `${escapeHtml(ex.category)} &middot; ${ex.defaultSets} סטים × ${escapeHtml(ex.defaultReps)}`;
    item.innerHTML = `
      <div class="exercise-manage-head">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="drag-handle" title="גרור לשינוי סדר">⠿</span>
          <span class="exercise-num">${index + 1}</span>
          <div>
            <b>${escapeHtml(ex.name)}</b>
            <div class="exercise-meta">${metaLine}</div>
            <label class="checkbox-row ex-active-toggle"><input type="checkbox" class="exActiveCheck" ${ex.active !== false ? 'checked' : ''}> כלול באימון</label>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
          ${!isCardio && ex.images && ex.images.length ? '<button class="btn-icon btnShowPhotoManage">📷</button>' : ''}
          <button class="btn-icon btnEditEx">✏️</button>
          ${isCardio ? '' : '<button class="btn-icon btnDeleteEx">🗑️</button>'}
        </div>
      </div>
    `;
    qs('.btnEditEx', item).addEventListener('click', () => openExerciseEditModal(ex));
    if (!isCardio) {
      qs('.btnDeleteEx', item).addEventListener('click', () => {
        if (!confirm(`למחוק את "${ex.name}"? אימוני עבר יישמרו.`)) return;
        exercises = exercises.filter((e) => e.id !== ex.id);
        db.saveExercises(exercises);
        renderExercisesTab();
        reorderActiveSessionToMatchExercises();
      });
    }
    qs('.exActiveCheck', item).addEventListener('change', (e) => {
      ex.active = e.target.checked;
      db.saveExercises(exercises);
      renderExercisesTab();
      reorderActiveSessionToMatchExercises();
      showToast(ex.active ? `"${ex.name}" ייכלל באימונים הבאים` : `"${ex.name}" לא ייכלל באימונים הבאים (נשאר שמור)`);
    });
    const photoBtnManage = qs('.btnShowPhotoManage', item);
    if (photoBtnManage) photoBtnManage.addEventListener('click', () => openPhotoModal(ex));
    list.appendChild(item);
  });
  makeSortable(list, (newOrderIds) => {
    const byId = Object.fromEntries(exercises.map((e) => [e.id, e]));
    exercises = newOrderIds.map((id) => byId[id]).filter(Boolean);
    db.saveExercises(exercises);
    renderExercisesTab();
    reorderActiveSessionToMatchExercises();
  });
}

/* ---- image upload helper: downsizes to keep localStorage small ---- */
function fileToResizedDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function openExerciseEditModal(ex, options = {}) {
  if (ex.inputType === 'cardio') return openCardioEditModal(ex);
  const isNew = !!options.isNew;
  let currentImages = [...(ex.images || [])];
  let inputType = ex.inputType || 'reps';
  const overlay = document.createElement('div');
  overlay.className = 'photo-overlay';
  overlay.innerHTML = `
    <div class="photo-modal">
      <div class="photo-modal-head"><b>${isNew ? 'תרגיל חדש' : 'עריכת תרגיל'}</b><button class="btn-icon btnCloseExEdit">✕</button></div>
      <label class="field-label">שם התרגיל</label>
      <input class="input" id="editExName" value="${escapeAttr(ex.name)}" placeholder="שם התרגיל">
      <label class="field-label">קבוצת שריר</label>
      <input class="input" id="editExCategory" value="${escapeAttr(ex.category)}">
      <label class="field-label">סטים ברירת מחדל</label>
      <input type="number" min="1" class="input" id="editExSets" value="${ex.defaultSets}">
      <label class="field-label">סוג מדידה</label>
      <select class="select" id="editExInputType">
        <option value="reps" ${inputType === 'reps' ? 'selected' : ''}>חזרות</option>
        <option value="hold" ${inputType === 'hold' ? 'selected' : ''}>החזקה בזמן (שניות)</option>
      </select>
      <div id="editExRepsWrap">
        <label class="field-label">חזרות</label>
        <input class="input" id="editExReps" value="${escapeAttr(ex.defaultReps)}">
      </div>
      <div id="editExHoldWrap" class="hidden">
        <label class="field-label">זמן יעד להחזקה (שניות)</label>
        <input type="number" min="1" class="input" id="editExHoldSeconds" value="${ex.holdSeconds || 15}">
      </div>
      <label class="field-label">מנוחה (שניות)</label>
      <input type="number" min="10" class="input" id="editExRest" value="${ex.restSeconds}">
      <label class="field-label">הערות</label>
      <input class="input" id="editExNotes" value="${escapeAttr(ex.notes || '')}">
      <label class="checkbox-row"><input type="checkbox" id="editExActive" ${ex.active !== false ? 'checked' : ''}> כלול באימונים הבאים</label>

      <label class="field-label">תמונות</label>
      <div class="image-manage-grid" id="editExImageGrid"></div>
      <input type="file" accept="image/*" id="editExImageInput" class="hidden">
      <div class="settings-actions">
        <button class="btn btn-secondary btn-small" id="btnAddExImage">📷 העלה תמונה</button>
      </div>

      <div class="settings-actions">
        <button class="btn btn-primary" id="btnSaveExEdit">שמור</button>
        <button class="btn btn-secondary" id="btnCancelExEdit">ביטול</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  function renderImageGrid() {
    const grid = qs('#editExImageGrid', overlay);
    grid.innerHTML = currentImages.map((src, i) => `
      <div class="image-manage-thumb"><img src="${src}"><button class="btnRemoveImg" data-i="${i}">✕</button></div>
    `).join('') || '<div class="exercise-meta">אין תמונות עדיין</div>';
    qsa('.btnRemoveImg', grid).forEach((btn) => {
      btn.addEventListener('click', () => {
        currentImages.splice(Number(btn.dataset.i), 1);
        renderImageGrid();
      });
    });
  }
  renderImageGrid();

  qs('#editExInputType', overlay).addEventListener('change', (e) => {
    inputType = e.target.value;
    qs('#editExRepsWrap', overlay).classList.toggle('hidden', inputType === 'hold');
    qs('#editExHoldWrap', overlay).classList.toggle('hidden', inputType !== 'hold');
  });
  qs('#editExInputType', overlay).dispatchEvent(new Event('change'));

  qs('#btnAddExImage', overlay).addEventListener('click', () => qs('#editExImageInput', overlay).click());
  qs('#editExImageInput', overlay).addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      currentImages.push(dataUrl);
      renderImageGrid();
    } catch (err) {
      showToast('לא ניתן לטעון את התמונה');
    }
    e.target.value = '';
  });

  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  qs('.btnCloseExEdit', overlay).addEventListener('click', close);
  qs('#btnCancelExEdit', overlay).addEventListener('click', close);
  qs('#btnSaveExEdit', overlay).addEventListener('click', () => {
    const name = qs('#editExName', overlay).value.trim();
    if (!name) { showToast('נא להזין שם לתרגיל'); return; }
    ex.name = name;
    ex.category = qs('#editExCategory', overlay).value.trim() || ex.category || 'כללי';
    ex.defaultSets = Math.max(1, Number(qs('#editExSets', overlay).value) || 1);
    ex.inputType = inputType === 'hold' ? 'hold' : 'reps';
    if (ex.inputType === 'hold') {
      ex.holdSeconds = Math.max(1, Number(qs('#editExHoldSeconds', overlay).value) || 15);
      ex.defaultReps = `${ex.holdSeconds} שניות החזקה`;
    } else {
      delete ex.holdSeconds;
      ex.defaultReps = qs('#editExReps', overlay).value.trim();
    }
    ex.restSeconds = Math.max(10, Number(qs('#editExRest', overlay).value) || 90);
    ex.notes = qs('#editExNotes', overlay).value.trim();
    ex.active = qs('#editExActive', overlay).checked;
    ex.images = currentImages;
    if (isNew) {
      exercises.push(ex);
    }
    db.saveExercises(exercises);
    syncExerciseNameEverywhere(ex);
    renderExercisesTab();
    reorderActiveSessionToMatchExercises();
    close();
    showToast(isNew ? 'התרגיל נוסף ✅' : 'התרגיל נשמר ✅');
  });
}

/* lightweight edit modal for the warm-up/cool-down cardio "exercises" — just a
   name + duration (minutes), no sets/reps/images since their data is duration-based */
function openCardioEditModal(ex) {
  const overlay = document.createElement('div');
  overlay.className = 'photo-overlay';
  overlay.innerHTML = `
    <div class="photo-modal">
      <div class="photo-modal-head"><b>עריכת תרגיל</b><button class="btn-icon btnCloseExEdit">✕</button></div>
      <label class="field-label">שם</label>
      <input class="input" id="editCardioName" value="${escapeAttr(ex.name)}">
      <label class="field-label">משך (דקות)</label>
      <input type="number" min="1" class="input" id="editCardioMinutes" value="${ex.durationMinutes || 5}">
      <label class="field-label">קצב/מהירות ברירת מחדל</label>
      <input class="input" id="editCardioPace" value="${escapeAttr(ex.pace || '')}" placeholder='לדוגמה: 6-10 קמ"ש'>
      <label class="checkbox-row"><input type="checkbox" id="editCardioActive" ${ex.active !== false ? 'checked' : ''}> כלול באימונים הבאים</label>
      <div class="settings-actions">
        <button class="btn btn-primary" id="btnSaveExEdit">שמור</button>
        <button class="btn btn-secondary" id="btnCancelExEdit">ביטול</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  qs('.btnCloseExEdit', overlay).addEventListener('click', close);
  qs('#btnCancelExEdit', overlay).addEventListener('click', close);
  qs('#btnSaveExEdit', overlay).addEventListener('click', () => {
    const name = qs('#editCardioName', overlay).value.trim();
    if (!name) { showToast('נא להזין שם'); return; }
    ex.name = name;
    ex.durationMinutes = Math.max(1, Number(qs('#editCardioMinutes', overlay).value) || 5);
    ex.pace = qs('#editCardioPace', overlay).value.trim();
    ex.active = qs('#editCardioActive', overlay).checked;
    db.saveExercises(exercises);
    syncExerciseNameEverywhere(ex);
    renderExercisesTab();
    reorderActiveSessionToMatchExercises();
    close();
    showToast('נשמר ✅');
  });
}

function syncExerciseNameEverywhere(ex) {
  if (!activeSession) return;
  let changed = false;
  activeSession.entries.forEach((e) => {
    if (e.exerciseId === ex.id && e.exerciseName !== ex.name) {
      e.exerciseName = ex.name;
      changed = true;
    }
  });
  if (changed) {
    persistActiveSession();
    renderWorkoutTab();
  }
}

/* ---- drag-to-reorder (pointer events, touch-friendly for iPhone) ---- */
function makeSortable(listEl, onReorder) {
  listEl.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('.drag-handle');
    if (!handle) return;
    const dragEl = handle.closest('.sortable-item');
    if (!dragEl) return;
    e.preventDefault();
    dragEl.setPointerCapture(e.pointerId);
    dragEl.classList.add('dragging');

    const onMove = (ev) => {
      const y = ev.clientY;
      const siblings = qsa('.sortable-item', listEl).filter((s) => s !== dragEl);
      let next = null;
      for (const sib of siblings) {
        const rect = sib.getBoundingClientRect();
        if (y < rect.top + rect.height / 2) { next = sib; break; }
      }
      if (next) listEl.insertBefore(dragEl, next);
      else listEl.appendChild(dragEl);
    };
    const onUp = () => {
      dragEl.classList.remove('dragging');
      try { dragEl.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      const newOrder = qsa('.sortable-item', listEl).map((x) => x.dataset.id);
      onReorder(newOrder);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
}

function reorderActiveSessionToMatchExercises() {
  if (!activeSession) return;
  const warmupEx = exercises.find((e) => e.id === 'warmup');
  const cooldownEx = exercises.find((e) => e.id === 'cooldown');
  const byExId = Object.fromEntries(activeSession.entries.map((e) => [e.exerciseId, e]));
  const strengthExercises = exercises.filter((ex) => ex.id !== 'warmup' && ex.id !== 'cooldown');
  const hasProgress = activeSession.entries.some((e) => e.type !== 'cardio' && e.sets.some((s) => s.completed));

  const warmup = warmupEx && warmupEx.active !== false ? (byExId['warmup'] || makeCardioEntry('warmup')) : null;
  const cooldown = cooldownEx && cooldownEx.active !== false ? (byExId['cooldown'] || makeCardioEntry('cooldown')) : null;

  if (hasProgress) {
    // mid-workout: never drop logged data — just reorder to match the exercise list,
    // keeping any already-logged entries (even now-inactive/deleted ones) at the end.
    const reordered = strengthExercises.map((ex) => byExId[ex.id]).filter(Boolean);
    const orphan = activeSession.entries.filter((e) =>
      e.exerciseId !== 'warmup' && e.exerciseId !== 'cooldown' && !exercises.some((ex) => ex.id === e.exerciseId));
    activeSession.entries = [warmup, ...reordered, ...orphan, cooldown].filter(Boolean);
  } else {
    // fresh draft: fully sync to the currently-active exercise list (add new, drop deselected)
    const lastByExercise = getLastCompletedValuesByExercise();
    const synced = strengthExercises.filter((ex) => ex.active !== false).map((ex) => {
      if (byExId[ex.id]) return byExId[ex.id];
      const last = lastByExercise[ex.id];
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        sets: Array.from({ length: setsForWeek(ex) }, () => ({ weightKg: last ? last.weightKg : '', reps: last ? last.reps : '', completed: false })),
      };
    });
    activeSession.entries = [warmup, ...synced, cooldown].filter(Boolean);
  }
  persistActiveSession();
  renderWorkoutTab();
}

/* ---- photo modal ---- */
function openPhotoModal(ex) {
  if (!ex.images || !ex.images.length) { showToast('אין תמונה לתרגיל זה'); return; }
  const overlay = document.createElement('div');
  overlay.className = 'photo-overlay';
  overlay.innerHTML = `
    <div class="photo-modal">
      <div class="photo-modal-head"><b>${escapeHtml(ex.name)}</b><button class="btn-icon btnClosePhoto">✕</button></div>
      <div class="photo-grid">
        ${ex.images.map((src) => `<img src="${src}" alt="${escapeAttr(ex.name)}" loading="lazy">`).join('')}
      </div>
      ${ex.images.length > 1 ? '<div class="photo-caption">יש כמה אפשרויות ביצוע — בחרו לפי מה שזמין באולם</div>' : ''}
    </div>
  `;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  qs('.btnClosePhoto', overlay).addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
}

/* ================= SETTINGS TAB ================= */
function wireSettings() {
  el('settingRestSeconds').addEventListener('change', (e) => {
    settings.restSeconds = Math.max(10, Number(e.target.value) || 90);
    db.saveSettings(settings);
  });
  el('settingWeeklyGoal').addEventListener('change', (e) => {
    settings.weeklyGoal = Math.max(1, Number(e.target.value) || 3);
    db.saveSettings(settings);
  });
  el('settingProgramWeek').addEventListener('change', (e) => {
    settings.programWeek = Math.max(1, Number(e.target.value) || 1);
    db.saveSettings(settings);
    applyProgramWeekToActiveSession();
    showToast(`שבוע תוכנית עודכן ל-${settings.programWeek}`);
  });
  el('settingVoice').addEventListener('change', (e) => {
    settings.voiceAnnouncements = e.target.checked;
    db.saveSettings(settings);
    if (settings.voiceAnnouncements) { primeSpeech(); speak('ההודעות הקוליות הופעלו'); }
  });
  if (native.isNative()) {
    el('faceIdSettingRow').classList.remove('hidden');
    el('permissionsSettingsCard').classList.remove('hidden');
    el('settingFaceId').addEventListener('change', async (e) => {
      const wantsOn = e.target.checked;
      if (wantsOn) {
        const bio = await native.biometricIsAvailable();
        if (!bio.available) {
          showToast('Face ID/Touch ID לא זמין או לא מוגדר במכשיר זה' + (bio.reason ? ` (${bio.reason})` : ''));
          e.target.checked = false;
          return;
        }
        const ok = await native.biometricVerify();
        if (!ok) {
          showToast('האימות נכשל — נסה שוב');
          e.target.checked = false;
          return;
        }
        showToast('Face ID הופעל ✅');
      }
      settings.faceIdEnabled = wantsOn;
      db.saveSettings(settings);
    });
    el('btnEnableHealthSettings').addEventListener('click', async () => {
      const res = await native.healthRequestAuthorization();
      showToast(res.granted
        ? 'החיבור ל-Apple Health אושר ✅'
        : `ההרשאה לא אושרה${res.reason ? ' (' + res.reason + ')' : ''} — אם כבר נדחתה בעבר, אשר ידנית בהגדרות האייפון > פרטיות > בריאות`);
    });
    el('btnVerifyFaceIdSettings').addEventListener('click', async () => {
      const bio = await native.biometricIsAvailable();
      if (!bio.available) { showToast('Face ID/Touch ID לא זמין או לא מוגדר במכשיר זה' + (bio.reason ? ` (${bio.reason})` : '')); return; }
      const ok = await native.biometricVerify();
      showToast(ok ? 'האימות הצליח ✅' : 'האימות נכשל');
    });
  }
  el('btnEnableNotifications').addEventListener('click', requestNotificationPermission);
}

function renderSettingsTab() {
  el('settingRestSeconds').value = settings.restSeconds;
  el('settingWeeklyGoal').value = settings.weeklyGoal;
  el('settingProgramWeek').value = settings.programWeek || 1;
  el('settingVoice').checked = settings.voiceAnnouncements !== false;
  if (native.isNative()) {
    el('settingFaceId').checked = settings.faceIdEnabled !== false;
  }
}

/* ================= PERSONAL AREA TAB ================= */
function recordWeightHistory(p) {
  const w = Number(p.weightKg);
  if (!w) return;
  if (!Array.isArray(p.weightHistory)) p.weightHistory = [];
  const last = p.weightHistory[p.weightHistory.length - 1];
  if (!last || last.weightKg !== w) {
    p.weightHistory.push({ dateISO: new Date().toISOString(), weightKg: w });
  }
}
function wireProfileTab() {
  el('btnSaveProfile').addEventListener('click', () => {
    const name = el('profileName').value.trim();
    if (!name) { showToast('שם המתאמן הוא שדה חובה'); return; }
    profile.name = name;
    profile.age = el('profileAge').value;
    profile.heightCm = el('profileHeight').value;
    profile.weightKg = el('profileWeight').value;
    recordWeightHistory(profile);
    db.saveProfile(profile);
    renderBrand();
    renderHomeTab();
    showToast('הפרטים האישיים נשמרו ✅');
  });
}
function renderProfileTab() {
  el('profileName').value = profile.name || '';
  el('profileAge').value = profile.age || '';
  el('profileHeight').value = profile.heightCm || '';
  el('profileWeight').value = profile.weightKg || '';
}
function renderBrand() {
  el('appBrand').textContent = 'AutoFit';
  const greetingEl = el('greetingText');
  if (greetingEl) greetingEl.textContent = profile.name ? `שלום ${profile.name} 👋` : 'שלום! 👋';
}

/* ================= CONTACT TAB ================= */
const CONTACT_EMAIL = 'sasid5000@gmail.com';
function wireContactTab() {
  el('btnSendContact').addEventListener('click', () => {
    const name = el('contactName').value.trim();
    const phone = el('contactPhone').value.trim();
    const summary = el('contactSummary').value.trim();
    const message = el('contactMessage').value.trim();
    if (!name || !message) { showToast('נא למלא שם ובקשה לפני שליחה'); return; }
    const subject = summary || `פנייה חדשה מ-${name}`;
    const body = `שם: ${name}\nטלפון: ${phone || '-'}\n\nבקשה:\n${message}`;
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    showToast('נפתחת אפליקציית המייל לשליחה ✉️');
  });
}

/* ================= HOME TAB ================= */
function wireHomeTab() {
  el('btnHomePhoto').addEventListener('click', () => el('homePhotoInput').click());
  el('homePhotoInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      profile.photoDataUrl = await fileToResizedDataUrl(file);
      db.saveProfile(profile);
      renderHomeTab();
      showToast('התמונה עודכנה ✅');
    } catch (err) {
      showToast('לא ניתן היה לטעון את התמונה');
    }
  });
  el('btnHomeToDashboard').addEventListener('click', () => switchTab('dashboard'));
  el('btnHomeProgress').addEventListener('click', openHomeProgressModal);
}
function renderHomeTab() {
  el('homePhoto').src = profile.photoDataUrl || 'icons/icon-192.png';
  el('homeGreeting').textContent = profile.name ? `שלום ${profile.name} 👋` : 'שלום! 👋';
}

function buildHomeStatCards() {
  workouts = db.getWorkouts();
  const weekCount = countThisWeek();
  const streak = computeStreak();
  const sorted = [...workouts].sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  const lastWorkoutText = sorted.length
    ? new Date(sorted[0].dateISO).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })
    : 'אין עדיין';

  const history = profile.weightHistory || [];
  let weightNow = '-';
  let weightDeltaHtml = '';
  if (history.length) {
    const first = history[0].weightKg;
    const lastW = history[history.length - 1].weightKg;
    weightNow = `${lastW} ק"ג`;
    const delta = round1(lastW - first);
    if (delta !== 0) {
      const isLoss = delta < 0;
      weightDeltaHtml = `<div class="home-stat-sub" style="color:${isLoss ? '#22c55e' : '#ef4444'}">${isLoss ? '▼' : '▲'} ${Math.abs(delta)} ק"ג</div>`;
    }
  } else if (profile.weightKg) {
    weightNow = `${profile.weightKg} ק"ג`;
  }

  return [
    {
      icon: '🏋️', value: `${weekCount}/${settings.weeklyGoal}`, label: 'אימונים השבוע', sub: `אימון אחרון: ${lastWorkoutText}`,
      detailTitle: 'אימונים השבוע',
      detailHtml: buildWeekWorkoutsDetailHtml(),
    },
    {
      icon: '📈', value: weightNow, label: 'משקל נוכחי', subHtml: weightDeltaHtml,
      detailTitle: 'היסטוריית משקל',
      detailHtml: buildWeightHistoryDetailHtml(),
    },
    {
      icon: '🔥', value: streak, label: 'רצף שבועות',
      detailTitle: 'רצף שבועי',
      detailHtml: buildStreakDetailHtml(),
    },
    {
      icon: '📋', value: exercises.filter((e) => e.active !== false).length, label: 'תרגילים פעילים',
      detailTitle: 'תרגילים פעילים',
      detailHtml: buildActiveExercisesDetailHtml(),
    },
  ];
}

function buildWeekWorkoutsDetailHtml() {
  const key = isoWeekKey(new Date());
  const thisWeek = workouts.filter((w) => isoWeekKey(new Date(w.dateISO)) === key)
    .sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  if (!thisWeek.length) return '<div class="card-hint">עדיין לא בוצע אימון השבוע</div>';
  return `<ul class="home-detail-list">${thisWeek.map((w) => `
    <li><b>${formatDate(w.dateISO)}</b><br>משך: ${formatHMS(w.durationSec)} &middot; נפח: ${Math.round(computeVolume(w)).toLocaleString()} ק"ג</li>
  `).join('')}</ul>`;
}
function buildWeightHistoryDetailHtml() {
  const history = [...(profile.weightHistory || [])].sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO)).slice(0, 8);
  if (!history.length) return '<div class="card-hint">אין עדיין נתוני משקל שמורים — עדכן בטאב "אישי"</div>';
  return `<ul class="home-detail-list">${history.map((h) => `
    <li><b>${new Date(h.dateISO).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</b> — ${h.weightKg} ק"ג</li>
  `).join('')}</ul>`;
}
function buildStreakDetailHtml() {
  const now = new Date();
  const rows = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const key = isoWeekKey(d);
    const count = workouts.filter((w) => isoWeekKey(new Date(w.dateISO)) === key).length;
    rows.push({ key: key.replace(/^\d+-/, ''), count });
  }
  return `<ul class="home-detail-list">${rows.map((r) => `
    <li>${r.key} — ${r.count} אימון${r.count === 1 ? '' : 'ים'} ${r.count >= (settings.weeklyGoal || 3) ? '✅' : ''}</li>
  `).join('')}</ul>`;
}
function buildActiveExercisesDetailHtml() {
  const active = exercises.filter((e) => e.active !== false);
  if (!active.length) return '<div class="card-hint">אין תרגילים פעילים</div>';
  return `<ul class="home-detail-list">${active.map((e, i) => `<li>${i + 1}. ${escapeHtml(e.name)} <span class="card-hint">(${escapeHtml(e.category)})</span></li>`).join('')}</ul>`;
}

function openHomeProgressModal() {
  const cards = buildHomeStatCards();
  const overlay = document.createElement('div');
  overlay.className = 'photo-overlay';
  overlay.innerHTML = `
    <div class="photo-modal">
      <div class="photo-modal-head"><b>ההתקדמות שלי</b><button class="btn-icon btnCloseHomeProgress">✕</button></div>
      <div class="home-stats-grid" id="homeProgressGrid"></div>
      <button class="btn btn-secondary home-dashboard-btn" id="btnHomeProgressToDashboard">📈 לדשבורד המלא</button>
    </div>
  `;
  document.body.appendChild(overlay);
  const grid = qs('#homeProgressGrid', overlay);
  grid.innerHTML = cards.map((c, i) => `
    <div class="home-stat-card home-stat-card-tap" data-idx="${i}">
      <div class="home-stat-icon">${c.icon}</div>
      <div class="home-stat-value">${c.value}</div>
      <div class="home-stat-label">${c.label}</div>
      ${c.sub ? `<div class="home-stat-sub">${escapeHtml(c.sub)}</div>` : (c.subHtml || '')}
    </div>
  `).join('');
  qsa('.home-stat-card-tap', grid).forEach((cardEl) => {
    cardEl.addEventListener('click', () => {
      const c = cards[Number(cardEl.dataset.idx)];
      openHomeDetailModal(c.detailTitle, c.detailHtml);
    });
  });
  const close = () => overlay.remove();
  qs('.btnCloseHomeProgress', overlay).addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  qs('#btnHomeProgressToDashboard', overlay).addEventListener('click', () => { close(); switchTab('dashboard'); });
}

function openHomeDetailModal(title, bodyHtml) {
  const overlay = document.createElement('div');
  overlay.className = 'photo-overlay';
  overlay.innerHTML = `
    <div class="photo-modal">
      <div class="photo-modal-head"><b>${escapeHtml(title)}</b><button class="btn-icon btnCloseHomeDetail">✕</button></div>
      ${bodyHtml}
    </div>
  `;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  qs('.btnCloseHomeDetail', overlay).addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

/* ================= UTIL ================= */
function showToast(msg) {
  const t = el('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.add('hidden'), 2600);
}
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  // When a newly-deployed service worker takes control, reload once so the
  // freshest HTML/JS/CSS shows up immediately instead of waiting for the user
  // to manually force-quit/reopen the installed app.
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}

document.addEventListener('DOMContentLoaded', bootstrap);
const splashStartTime = Date.now();
const SPLASH_MIN_MS = 2500; // keep the branded splash on screen ~2.5s: logo pop + delayed tagline/loader reveal

// Native-only bootstrap: restore iCloud data (if any), gate behind Face ID for
// returning users who enabled it, then either launch onboarding (first run)
// or the main app.
async function bootstrap() {
  if (native.isNative()) {
    await restoreFromCloudIfEmpty();
    // Cloud restore writes straight to localStorage — reload the in-memory
    // copies so onboarding/Face ID checks below see the restored values.
    settings = db.getSettings();
    profile = db.getProfile();

    if (settings.onboardingComplete && settings.faceIdEnabled !== false) {
      const bio = await native.biometricIsAvailable();
      if (bio.available) {
        const ok = await native.biometricVerify();
        if (!ok) {
          document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-size:18px;background:#000;color:#fff;">🔒 האימות נכשל — רענן כדי לנסות שוב</div>';
          return;
        }
      }
    }
    db.setSyncHook((key, value) => { native.cloudSetItem(key, JSON.stringify(value)); });
    native.onCloudChanged(() => { window.location.reload(); });
  }

  await waitForSplashMinimum();
  hideSplash();

  const previewParams = new URLSearchParams(location.search);
  if (!settings.onboardingComplete && !native.isNative() && previewParams.has('previewSkip')) {
    profile.name = profile.name || 'משתמש בדיקה';
    db.saveProfile(profile);
    settings.onboardingComplete = true;
    db.saveSettings(settings);
  }

  if (!settings.onboardingComplete) {
    runOnboarding();
  } else {
    init();
    const jumpTab = previewParams.get('tab');
    if (jumpTab) switchTab(jumpTab);
  }
}

function waitForSplashMinimum() {
  const previewForced = new URLSearchParams(location.search).has('previewSplash');
  if (!native.isNative() && !previewForced) return Promise.resolve();
  const remaining = Math.max(0, SPLASH_MIN_MS - (Date.now() - splashStartTime));
  return new Promise((resolve) => setTimeout(resolve, remaining));
}

function hideSplash() {
  const splash = el('splashScreen');
  if (!splash) return;
  splash.classList.add('fade-out');
  setTimeout(() => splash.classList.add('hidden'), 550);
}

// First-run flow: collect name/age/height/weight, then (native only) offer
// HealthKit + Face ID permission toggles, before handing off to init().
function runOnboarding() {
  const screen = el('onboardingScreen');
  screen.classList.remove('hidden');

  el('obName').value = profile.name || '';
  el('obAge').value = profile.age || '';
  el('obHeight').value = profile.heightCm || '';
  el('obWeight').value = profile.weightKg || '';

  const stepDetails = el('onboardingStepDetails');
  const stepPermissions = el('onboardingStepPermissions');

  function finishOnboarding() {
    settings.onboardingComplete = true;
    db.saveSettings(settings);
    screen.classList.add('hidden');
    init();
  }

  async function setupPermissionStep() {
    const healthCard = el('btnEnableHealthOnboarding');
    healthCard.addEventListener('click', async () => {
      healthCard.disabled = true;
      healthCard.textContent = '...';
      const res = await native.healthRequestAuthorization();
      healthCard.textContent = res.granted ? '✓ אושר' : 'אפשר';
      healthCard.disabled = false;
      showToast(res.granted
        ? 'החיבור ל-Apple Health אושר ✅'
        : `ההרשאה לא אושרה${res.reason ? ' (' + res.reason + ')' : ''} — ניתן לשנות בהגדרות האייפון`);
    });

    const faceIdBtn = el('btnEnableFaceIdOnboarding');
    const bio = await native.biometricIsAvailable();
    if (!bio.available) {
      faceIdBtn.closest('.onboarding-permission-card').classList.add('hidden');
      return;
    }
    faceIdBtn.addEventListener('click', async () => {
      faceIdBtn.disabled = true;
      faceIdBtn.textContent = '...';
      const ok = await native.biometricVerify();
      if (ok) {
        settings.faceIdEnabled = true;
        db.saveSettings(settings);
        faceIdBtn.textContent = '✓ אושר';
        showToast('Face ID הופעל ✅');
      } else {
        faceIdBtn.disabled = false;
        faceIdBtn.textContent = 'אפשר';
        showToast('האימות נכשל, נסה שוב');
      }
    });
  }

  el('btnOnboardingNext').addEventListener('click', () => {
    const name = el('obName').value.trim();
    if (!name) { showToast('נא להזין שם'); return; }
    profile.name = name;
    profile.age = el('obAge').value;
    profile.heightCm = el('obHeight').value;
    profile.weightKg = el('obWeight').value;
    recordWeightHistory(profile);
    db.saveProfile(profile);

    if (!native.isNative()) {
      finishOnboarding();
      return;
    }
    stepDetails.classList.remove('active');
    stepPermissions.classList.add('active');
    setupPermissionStep();
  });

  el('btnOnboardingFinish').addEventListener('click', finishOnboarding);
}

// On first native launch (local storage empty), pull any previously-synced
// data back from iCloud — this is what lets history survive an iPhone reset.
async function restoreFromCloudIfEmpty() {
  const hasLocalData = localStorage.getItem('ft_exercises_v1') || localStorage.getItem('ft_workouts_v1');
  if (hasLocalData) return;
  try {
    const all = await native.cloudGetAll();
    Object.keys(all).forEach((key) => {
      if (key.startsWith('ft_') && all[key]) {
        localStorage.setItem(key, all[key]);
      }
    });
  } catch (e) { /* no iCloud data yet — fine, fresh install */ }
}
