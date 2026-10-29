// app.js — main application controller
import * as db from './db.js';
import { SEED_EXERCISES } from './seed.js';
import { Stopwatch, RestTimer, formatHMS, playBeep, speak, primeSpeech, cancelSpeech } from './timer.js';
import * as native from './native-bridge.js';
import * as i18n from './i18n.js';
import * as library from './exercise-library.js';
import * as insights from './workout-insights.js';
import * as voiceReports from './voice-reports.js';
import { createTrainingUI, durationEstimateText } from './training-ui.js';
import * as trainingTools from './training-tools.js';
import * as legal from './legal.js';
import { createPrivacyUI, consentFormHTML } from './privacy-ui.js';
import { createCommerceUI } from './commerce-ui.js';
import { createMusicControls } from './music-controls.js';
import { renderProfileFields, readProfileGender } from './profile-fields.js';

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
let trainingUI = null;
let privacyUI = null;
let commerceUI = null;
let musicControls = null;
let privacyErasing = false;
// transient (not persisted) running hold-timers for hold-type exercises (e.g. plank), keyed by "exerciseId:setIdx"
const holdTimers = new Map();
let appInitialized = false;
let pendingWorkoutNavigation = false;
let activitySyncQueued = false;
let activitySnapshotKey = '';
let activitySyncChain = Promise.resolve();
let activitySyncRevision = 0;
let activityError = '';
const activityActionsInFlight = new Set();
const activityActionResults = new Map();
const activityPreviewStartedAt = Date.now();
let activityReadyEnabled = true;
const healthSyncInFlight = new Set();
let workoutGreetingTimer = null;
let announcementPlanQueued = false;
let announcementPlanKey = '';
let announcementPlanRevision = 0;
let announcementPlanChain = Promise.resolve();
let pendingWorkoutAutoFinish = null;
let finishingWorkout = false;
let workoutCardSessionId = null;
const expandedWorkoutExercises = new Set();
const pageBackStack = [];

const stopwatch = new Stopwatch((elapsed) => {
  const display = el('workoutTimerDisplay');
  const text = formatHMS(elapsed);
  if (display.textContent !== text) display.textContent = text;
  const quick = el('workoutQuickTimer');
  if (quick && quick.textContent !== text) quick.textContent = text;
});
let restDoneMessage = 'אפשר להמשיך לסט הבא';
const restTimer = new RestTimer({
  onChange: (completed) => persistRestTimerState(completed),
  onTick: (remaining) => {
    const display = el('restTimeDisplay');
    const text = formatHMS(remaining);
    if (display.textContent !== text) display.textContent = text;
  },
  onInterval: (elapsedSeconds) => {
    if (settings.voiceAnnouncements && settings.voiceIntervalAnnouncements !== false) {
      speak(`עברו ${elapsedSeconds} שניות`, i18n.locale(), `rest:${restTimer.endAt}:${elapsedSeconds}`);
    }
    persistRestTimerState();
  },
  onDone: (endAt) => {
    playBeep();
    if (activeSession.restCueExerciseId) restDoneMessage = workoutRestContinuation();
    if (settings.voiceAnnouncements) speak(`זמן המנוחה הסתיים. ${restDoneMessage}`, i18n.locale(), `rest:${endAt}:done`);
    el('restOverlay').classList.add('hidden');
    showToast(`המנוחה הסתיימה — ${restDoneMessage} 💪`);
    notify('זמן המנוחה הסתיים', restDoneMessage);
  },
});

// Native deadlines are armed while foregrounded, before WebView execution can stop.
function buildBackgroundAnnouncementItems() {
  const items = [];
  const now = Date.now();
  if (restTimer.isRunning() && restTimer.endAt) {
    const remainingSec = (restTimer.endAt - now) / 1000;
    if (remainingSec > 0) {
      if (settings.voiceAnnouncements && settings.voiceIntervalAnnouncements !== false) {
        let nextThreshold = restTimer.lastAnnouncedElapsed + 30;
        while (nextThreshold < restTimer.totalSeconds) {
          const fireAtMillis = restTimer.endAt - restTimer.totalSeconds * 1000 + nextThreshold * 1000;
          if (fireAtMillis > now) items.push({ fireAtMillis, text: `עברו ${nextThreshold} שניות`,
            announcementID: `rest:${restTimer.endAt}:${nextThreshold}` });
          nextThreshold += 30;
        }
      }
      if (settings.voiceAnnouncements) {
        items.push({ fireAtMillis: restTimer.endAt, text: `זמן המנוחה הסתיים. ${restDoneMessage}`,
          announcementID: `rest:${restTimer.endAt}:done` });
      }
    }
  }
  if (settings.voiceAnnouncements) {
    activeSession?.entries.filter((entry) => entry.type === 'cardio' && entry.startedAt && !entry.completed)
      .forEach((entry) => {
        const fireAtMillis = entry.startedAt + (entry.durationSec - (entry.elapsedSec || 0)) * 1000;
        if (fireAtMillis > now) items.push({ fireAtMillis,
          text: cardioCompletionMessage(entry),
          announcementID: `cardio:${entry.exerciseId}:${entry.startedAt}` });
        if (entry.intervals) {
          for (const phase of trainingTools.ropeIntervalSchedule(entry.intervals)) {
            const fireAtMillis = entry.startedAt + (phase.offsetSeconds - (entry.elapsedSec || 0)) * 1000;
            if (fireAtMillis > now) items.push({ fireAtMillis, text: intervalPhaseText(phase),
              announcementID: `rope:${entry.exerciseId}:${entry.startedAt}:${phase.index}` });
          }
        }
      });
    holdTimers.forEach((state, key) => {
      const exId = key.slice(0, key.lastIndexOf(':'));
      const ex = exercises.find((e) => e.id === exId);
      if (!ex) return;
      const target = ex.holdSeconds || 15;
      const fireAtMillis = state.startedAt + target * 1000;
      if (fireAtMillis > now) items.push({ fireAtMillis, text: `${target} שניות הושלמו, אפשר לעצור`,
        announcementID: `hold:${key}:${state.startedAt}` });
    });
  }
  return items.map((item) => ({ ...item, text: i18n.text(item.text), language: i18n.locale() }));
}

function syncNativeAnnouncementPlan() {
  if (!native.isNative() || !appInitialized || announcementPlanQueued) return;
  announcementPlanQueued = true;
  queueMicrotask(() => {
    announcementPlanQueued = false;
    const items = activeSession?.running ? buildBackgroundAnnouncementItems() : [];
    const key = JSON.stringify(items);
    if (key === announcementPlanKey) return;
    announcementPlanKey = key;
    const revision = ++announcementPlanRevision;
    announcementPlanChain = announcementPlanChain.then(async () => {
      if (revision !== announcementPlanRevision) return;
      const scheduled = await native.bgScheduleAnnouncements(items);
      if (!scheduled && revision === announcementPlanRevision) {
        announcementPlanKey = '';
        showToast('לא ניתן להכין הכרזות ברקע. חזור לאפליקציה ונסה שוב.');
      }
    }).catch((error) => {
      if (revision !== announcementPlanRevision) return;
      announcementPlanKey = '';
      console.error('Native announcement plan failed', error);
      showToast('הכנת ההכרזות ברקע נכשלה: ' + error.message);
    });
  });
}

/* ---------------- notifications (best-effort background alerts) ----------------
   iOS/Safari suspends page JS when the app is fully backgrounded or the screen is
   locked, so a true "always fires on time" background alert needs a push server.
   As a best effort: fire a system Notification whenever a timer completes (shows
   even if the user briefly switched apps/tabs), and force every timer to re-check
   itself the instant the page becomes visible again. */
function notify(title, body) {
  title = i18n.text(title);
  body = i18n.text(body);
  if (native.isNative()) { native.notificationsShow(title, body); return; }
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
window.addEventListener('autofit-audio-error', (event) => showToast('השמעת שמע נכשלה: ' + event.detail));
window.addEventListener('autofit-storage-error', () => showToast('השמירה במכשיר נכשלה. הנתונים הקודמים לא נמחקו; אל תסיר את האפליקציה.'));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    if (activeSession && activeSession.running) {
      stopwatch.forceTick();
    }
    if (restTimer.isRunning()) restTimer.forceTick();
    tickCardioTimers();
    requestWakeLock();
    syncWorkoutActivity();
  }
  syncNativeAnnouncementPlan();
  updateVoiceListeningState();
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
    settings.exerciseDefaultsV3Applied = true;
    settings.restOverrideV1Applied = true;
    settings.newExercisesBatch1Applied = true;
    settings.exerciseTextCleanupV1Applied = true;
    settings.notesCleanupV1Applied = true;
    settings.exerciseContentPatchV2 = true;
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
    });
    // one-time switch to the new 3-sets/90-seconds defaults (applied once so that any
    // per-exercise customization made afterwards via the exercise editor is respected forever)
    if (!settings.exerciseDefaultsV3Applied) {
      exercises.forEach((ex) => {
        if (ex.id !== 'warmup' && ex.id !== 'cooldown') {
          ex.restSeconds = 90;
          ex.defaultSets = 3;
        }
      });
      settings.exerciseDefaultsV3Applied = true;
      db.saveSettings(settings);
      migrated = true;
    }
    // one-time override: these two exercises get 2 minutes rest instead of the
    // 90-second default used by the rest of the program
    if (!settings.restOverrideV1Applied) {
      const longerRestNames = ['לחיצת חזה', 'כפיפת מרפקים בישיבה'];
      exercises.forEach((ex) => {
        const name = EXERCISE_CONTENT_PATCH_V2[ex.name]?.newName || ex.name;
        if (longerRestNames.includes(name)) ex.restSeconds = 120;
      });
      settings.restOverrideV1Applied = true;
      db.saveSettings(settings);
      migrated = true;
    }
    // one-time addition of 6 new exercises to installs that already had a saved
    // exercises list (new installs get them directly from SEED_EXERCISES above)
    if (!settings.newExercisesBatch1Applied) {
      const newNames = [
        'גרביטון', 'החזקה סטטית במתח', 'החזקה סטטית על מקבילים',
        'לחיצת כתפיים בישיבה', 'סקוואט', 'כפיפות בטן לצדדים',
      ];
      newNames.forEach((name) => {
        if (!exercises.some((ex) => ex.name === name)) {
          const seedMatch = SEED_EXERCISES.find((s) => s.name === name);
          if (seedMatch) {
            const cooldownIdx = exercises.findIndex((ex) => ex.id === 'cooldown');
            const newEx = { id: db.uid(), active: true, ...seedMatch };
            if (cooldownIdx === -1) exercises.push(newEx);
            else exercises.splice(cooldownIdx, 0, newEx);
          }
        }
      });
      settings.newExercisesBatch1Applied = true;
      db.saveSettings(settings);
      migrated = true;
    }
    // one-time text cleanup for the 6 newly-added exercises above (trims redundant
    // duplicate wording and renames the unnamed shoulder-press machine)
    if (!settings.exerciseTextCleanupV1Applied) {
      exercises.forEach((ex) => {
        if (ex.name === 'גרביטון') {
          ex.notes = 'עליות מתח בסיוע מכונת גרביטון';
          migrated = true;
        } else if (ex.name === 'החזקה סטטית במתח') {
          ex.defaultReps = '';
          migrated = true;
        } else if (ex.name === 'החזקה סטטית על מקבילים') {
          ex.defaultReps = '';
          migrated = true;
        } else if (ex.name === 'מכשיר כתפיים למעלה') {
          ex.name = 'לחיצת כתפיים בישיבה';
          ex.notes = 'לחיצת כתפיים במכונה';
          migrated = true;
        }
      });
      settings.exerciseTextCleanupV1Applied = true;
      db.saveSettings(settings);
    }
    // one-time cleanup: notes should only describe the exercise generically — rep/set
    // counts and hold durations belong in the dedicated fields, not duplicated in notes
    if (!settings.notesCleanupV1Applied) {
      const notesFixes = {
        'החזקה סטטית במתח': 'החזקת גוף בתלייה על המתח ללא תזוזה',
        'פטישים': 'לכל יד',
        'כפיפה ופשיטה של שורש כף היד': 'לכל תנועה לכל יד',
        'פלאנק': 'החזקת גוף ישר על האמות ועל קצות האצבעות — ללא תזוזה',
      };
      exercises.forEach((ex) => {
        if (notesFixes[ex.name] !== undefined) {
          ex.notes = notesFixes[ex.name];
          migrated = true;
        }
      });
      settings.notesCleanupV1Applied = true;
      db.saveSettings(settings);
    }
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
    // Never re-add missing seed exercises. The user's saved program is the source of truth.
    if (!settings.seedSynced) {
      settings.seedSynced = true;
      db.saveSettings(settings);
    }
  }
  if (!settings.gravitronGeneralV1Applied) {
    let categoryChanged = false;
    exercises.forEach((ex) => {
      if (ex.name === 'גרביטון' && String(ex.category || '').startsWith('גב')) {
        ex.category = 'כללי';
        categoryChanged = true;
      }
    });
    if (categoryChanged) db.saveExercises(exercises);
    settings.gravitronGeneralV1Applied = true;
    db.saveSettings(settings);
  }
  if (!settings.libraryExpansionV1Applied) {
    const expanded = library.expandedLibrary(exercises);
    db.saveExercises(expanded);
    exercises = expanded;
    settings.libraryExpansionV1Applied = true;
    db.saveSettings(settings);
  }
  const supersetSettings = trainingTools.upgradeSavedASuperset(settings);
  if (supersetSettings !== settings) {
    db.saveSettings(supersetSettings);
    settings = supersetSettings;
  }
  // one-time bump: program week now defaults to 3 (full sets) instead of the old
  // ramp-up default of 1, since the program no longer needs a gradual sets ramp-up
  if (!settings.programWeekV2Applied) {
    settings.programWeek = 3;
    settings.programWeekV2Applied = true;
    db.saveSettings(settings);
  }
  if (!activeSession) {
    activeSession = buildDraftSession();
  } else {
    // migrate existing active sessions that don't yet have the warm-up/cool-down walk entries
    let sessionMigrated = false;
    if (!activeSession.programPinned && !activeSession.entries.some((e) => e.exerciseId === 'warmup')
      && exercises.some((e) => e.id === 'warmup' && e.active !== false)) {
      activeSession.entries.unshift(makeCardioEntry('warmup'));
      sessionMigrated = true;
    }
    if (!activeSession.programPinned && !activeSession.entries.some((e) => e.exerciseId === 'cooldown')
      && exercises.some((e) => e.id === 'cooldown' && e.active !== false)) {
      activeSession.entries.push(makeCardioEntry('cooldown'));
      sessionMigrated = true;
    }
    // add newly introduced *active* exercises to the in-progress session too (before the cool-down walk)
    exercises.filter((ex) => ex.active !== false && !activeSession.programPinned).forEach((ex) => {
      if (!activeSession.entries.some((e) => e.exerciseId === ex.id)) {
        const cooldownIdx = activeSession.entries.findIndex((e) => e.exerciseId === 'cooldown');
        const newEntry = ex.inputType === 'cardio' ? makeCardioEntry(ex.id) : {
          exerciseId: ex.id,
          exerciseName: ex.name,
          sets: Array.from({ length: setsForWeek(ex) }, () => makeProgramSet(ex)),
        };
        if (cooldownIdx === -1) activeSession.entries.push(newEntry);
        else activeSession.entries.splice(cooldownIdx, 0, newEntry);
        sessionMigrated = true;
      }
    });
    if (sessionMigrated) persistActiveSession();
  }

  wireTabs();
  wireWorkoutQuickStatus();
  wireWorkoutControls();
  wireSettings();
  wireExercisesTab();
  wireProfileTab();
  wireHistoryTab();
  wireHomeTab();
  wireContactTab();
  renderBrand();
  startLiveClock();
  setInterval(tickCardioTimers, 1000);

  renderWorkoutTab();
  renderHistoryTab();
  renderExercisesTab();
  renderSettingsTab();
  renderProfileTab();
  renderHomeTab();
  if (typeof createTrainingUI === 'function' && !trainingUI) trainingUI = createTrainingUI(trainingAPI());
  if (typeof createMusicControls === 'function' && !musicControls) musicControls = createMusicControls({
    native, toast: showToast,
    setPlayback: setWorkoutMusicPlayback,
  });

  // keep the phone screen on the whole time the site is open, not just during a workout.
  // Also re-assert on a repeating interval (not just on init/click/visibilitychange) as
  // defense-in-depth against any native-side reset the one-time call might miss.
  requestWakeLock();
  setInterval(requestWakeLock, 15000);

  if (activeSession.running) {
    stopwatch.start(activeSession.clockStartedAt || new Date(activeSession.startedAt).getTime());
    if (native.isNative()) native.bgStartKeepAlive().then((started) => {
      if (!started) showToast('לא ניתן לשחזר הודעות קוליות ברקע. נתוני האימון נשמרו.');
    });
    el('btnStartWorkout').classList.add('hidden');
    el('btnFinishWorkout').classList.remove('hidden');
    if (activeSession.rest) {
      const savedRest = activeSession.rest;
      restDoneMessage = savedRest.doneMessage || 'אפשר להמשיך לסט הבא';
      el('restExerciseName').setAttribute('data-exercise-name', savedRest.exerciseName || '');
      el('restExerciseName').textContent = i18n.exerciseName(savedRest.exerciseName || '');
      el('restOverlay').classList.remove('hidden');
      try { restTimer.restore(savedRest); }
      catch (error) {
        restTimer.stop();
        el('restOverlay').classList.add('hidden');
        showToast('לא ניתן לשחזר את טיימר המנוחה: ' + error.message);
      }
    }
  }

  renderDashboard(); // initial; chart lib loaded via defer, retry if not ready
  waitForChartJs().then(renderDashboard);

  registerServiceWorker();
  appInitialized = true;
  if (!commerceUI) commerceUI = createCommerceUI({
    getSettings: () => settings,
    isReady: () => appInitialized && !privacyErasing,
    openDocument: (kind) => privacyUI.openDocument(kind),
  });
  commerceUI.refresh();
  syncNativeAnnouncementPlan();
  syncWorkoutActivity();
  if (native.isNative()) {
    const pendingHealth = workouts.filter((workout) => workout.healthSyncPending === true);
    if (pendingHealth.length) syncWorkoutToHealth(pendingHealth, { requestAuthorization: false });
    native.consumeWorkoutActivityLink().then((requested) => {
      if (requested || pendingWorkoutNavigation) {
        pendingWorkoutNavigation = false;
        switchTab('workout');
      }
    });
    native.consumeWorkoutActivityAction?.().then((request) => { if (request) handleWorkoutActivityAction(request); });
  }
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
  const menu = el('navigationMenu');
  const opener = el('btnOpenMenu');
  qsa('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  opener.addEventListener('click', () => {
    if (menu.open) return;
    menu.showModal();
    opener.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('menu-open');
  });
  el('btnCloseMenu').addEventListener('click', () => menu.close());
  menu.addEventListener('click', (event) => {
    if (event.target === menu) {
      const bounds = menu.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right
        || event.clientY < bounds.top || event.clientY > bounds.bottom) menu.close();
    }
  });
  menu.addEventListener('close', () => {
    opener.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('menu-open');
  });
  qsa('[data-page-link]').forEach((button) => button.addEventListener('click', () => {
    if (menu.open) menu.close();
    switchTab(button.dataset.pageLink);
    if (button.dataset.pageSection) {
      const section = el(button.dataset.pageSection);
      if (section.tagName === 'DETAILS') section.open = true;
      section.scrollIntoView({ block: 'start' });
      const heading = section.querySelector('summary, h2, h3');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    }
  }));
  el('btnPageBack').addEventListener('click', () => {
    const previous = pageBackStack.pop();
    switchTab(previous?.tab || 'home', { back: true, scrollY: previous?.scrollY || 0 });
  });
}
function wireWorkoutQuickStatus() {
  const bar = el('workoutQuickStatus');
  const targets = [el('workoutTimerDisplay'), el('overallProgressBadge')];
  const visible = new Map(targets.map((target) => [target, false]));
  let observer, lastHeight = -1;
  const updateBounds = () => {
    const height = Math.ceil(qs('.topbar').getBoundingClientRect().height);
    if (height === lastHeight) return;
    lastHeight = height;
    document.documentElement.style.setProperty('--app-header-height', `${height}px`);
    observer?.disconnect();
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) visible.set(entry.target, entry.intersectionRatio >= 0.99);
      bar.classList.toggle('hidden', targets.every((target) => visible.get(target)));
    }, { rootMargin: `-${height}px 0px 0px 0px`, threshold: [0, 0.99, 1] });
    targets.forEach((target) => observer.observe(target));
  };
  new ResizeObserver(updateBounds).observe(qs('.topbar'));
  updateBounds();
}
function switchTab(tab, { back = false, scrollY = 0 } = {}) {
  const panel = el(`tab-${tab}`);
  if (!panel || !panel.classList.contains('tab-panel')) {
    console.warn('Unknown application tab', tab);
    return;
  }
  const secondary = ['about', 'guide', 'plans', 'goals', 'profile', 'contact', 'settings', 'privacy', 'data'].includes(tab);
  if (!back && tab !== currentTab) {
    if (secondary) pageBackStack.push({ tab: currentTab, scrollY: window.scrollY });
    else pageBackStack.length = 0;
  }
  qsa('.tab-panel').forEach((p) => p.classList.remove('active'));
  qsa('.tab-btn').forEach((b) => { b.classList.remove('active'); b.removeAttribute('aria-current'); });
  panel.classList.add('active');
  const btn = qs(`.tab-btn[data-tab="${tab}"]`);
  if (btn) { btn.classList.add('active'); btn.setAttribute('aria-current', 'page'); }
  el('btnPageBack').classList.toggle('hidden', !secondary);
  if (tab === 'dashboard') renderDashboard();
  if (tab === 'history') renderHistoryTab();
  if (tab === 'home') renderHomeTab();
  if (tab === 'workout') refreshWorkoutMuscleHeadings();
  if (tab === 'workout' && typeof musicControls !== 'undefined') musicControls?.refresh();
  if (tab === 'goals' && typeof trainingUI !== 'undefined') trainingUI?.refresh();
  currentTab = tab;
  updateVoiceListeningState();
  window.scrollTo(0, scrollY);
  const heading = panel.querySelector('h1, h2');
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}

/* ---------------- live clock ---------------- */
function startLiveClock() {
  const tick = () => {
    const now = new Date();
    el('liveClock').textContent = now.toLocaleTimeString(i18n.locale(), { hour: '2-digit', minute: '2-digit' });
  };
  tick();
  setInterval(tick, 30000);
}

/* ================= WORKOUT TAB ================= */
function buildDraftSession() {
  return buildProgramDraft(exercises);
}

function makeProgramSet(exercise) {
  const reps = Number(exercise.targetReps || exercise.defaultReps);
  return {
    weightKg: exercise.targetWeightKg ?? '',
    reps: exercise.inputType !== 'hold' && Number.isInteger(reps) && reps > 0 ? reps : '',
    completed: false,
    ...(exercise.targetReps ? { voiceTargetReps: Number(exercise.targetReps) } : {}),
  };
}

function buildProgramDraft(program, programSettings = settings) {
  const selectedPlan = programSettings.training?.activePlan;
  const savedPlan = programSettings.training?.plans?.find((plan) => plan.id === selectedPlan?.id);
  const planSnapshot = selectedPlan?.snapshot || (savedPlan?.sessions[selectedPlan.day]
    ? trainingTools.planIdentity(savedPlan, selectedPlan.day) : null);
  const warmupEx = program.find((ex) => ex.id === 'warmup' && ex.active !== false);
  const cooldownEx = program.find((ex) => ex.id === 'cooldown' && ex.active !== false);
  return {
    id: db.uid(),
    startedAt: null,
    accumulatedSec: 0,
    running: false,
    programPinned: true,
    ...(programSettings.training?.activePlan ? { planId: programSettings.training.activePlan.id } : {}),
    ...(planSnapshot ? { planSnapshot: JSON.parse(JSON.stringify(planSnapshot)) } : {}),
    entries: [
      ...(warmupEx ? [makeCardioEntry('warmup', program)] : []),
      ...program.filter((ex) => ex.active !== false && ex.id !== 'warmup' && ex.id !== 'cooldown').map((ex) => ex.inputType === 'cardio' ? makeCardioEntry(ex.id, program) : ({
        exerciseId: ex.id,
        exerciseName: ex.name,
        exerciseSnapshot: { id: ex.id, name: ex.name, notes: ex.notes || '', catalogId: ex.catalogId,
          category: ex.category, inputType: ex.inputType, loadKind: ex.loadKind,
          ...(ex.superset ? { superset: JSON.parse(JSON.stringify(ex.superset)) } : {}),
          defaultReps: ex.defaultReps, restSeconds: ex.restSeconds, holdSeconds: ex.holdSeconds },
        ...(ex.targetReps ? { targetReps: Number(ex.targetReps) } : {}),
        sets: Array.from({ length: setsForWeek(ex, programSettings) }, () => makeProgramSet(ex)),
      })),
      ...(cooldownEx ? [makeCardioEntry('cooldown', program)] : []),
    ],
  };
}

function makeCardioEntry(kind, program = exercises) {
  const ex = program.find((e) => e.id === kind) || {};
  const name = ex.name || (kind === 'warmup' ? DEFAULT_WARMUP_NAME : DEFAULT_COOLDOWN_NAME);
  const minutes = ex.durationMinutes || 5;
  const walkingBoundary = kind === 'warmup' || kind === 'cooldown';
  return { exerciseId: kind, exerciseName: name, type: 'cardio', durationSec: minutes * 60, startedAt: null, completed: false, location: ex.location || (walkingBoundary ? 'treadmill' : ''), pace: ex.pace || (walkingBoundary ? DEFAULT_CARDIO_PACE : ''),
    ...(ex.intervals ? { intervals: JSON.parse(JSON.stringify(ex.intervals)),
      exerciseSnapshot: { id: ex.id, name: ex.name, catalogId: ex.catalogId, inputType: 'cardio' } } : {}) };
}

function setsForWeek(ex, config = settings) {
  if (config.training?.activePlan) return Math.max(1, ex.defaultSets || 1);
  const week = Math.max(1, Number(config.programWeek) || 3);
  return week >= 3 ? Math.max(1, ex.defaultSets || 1) : Math.max(1, Math.min(week, ex.defaultSets || 1));
}

function applyProgramWeekToActiveSession() {
  if (!activeSession) return;
  if (activeSession.planId || activeSession.timeBudget || activeSession.substitutions?.length || activeSession.removedExercises?.length) {
    showToast('הבחירה נשמרה לתוכנית. האימון המותאם הנוכחי נשאר ללא שינוי.');
    return;
  }
  activeSession.entries.forEach((entry) => {
    if (entry.type === 'cardio') return;
    const ex = exercises.find((e) => e.id === entry.exerciseId);
    if (!ex) return;
    const desired = Math.floor(setsForWeek(ex));
    while (entry.sets.length < desired) {
      const last = entry.sets.at(-1);
      entry.sets.push({ weightKg: last ? last.weightKg : '', reps: last ? last.reps : '', completed: false });
    }
    while (entry.sets.length > desired) {
      const last = entry.sets.at(-1);
      if (last.completed || last.weightKg || last.reps) break; // never discard logged or typed-in data
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
  const focusEntry = (event) => {
    const card = event.target.closest('.exercise-card');
    if (!card || event.target.closest('.btnShowPhoto')) return;
    selectVoiceExercise(Number(card.dataset.entryIndex), false);
  };
  ['click', 'input', 'change'].forEach((type) => el('exerciseList').addEventListener(type, focusEntry, true));
  if (native.isNative()) {
    el('btnEnableWorkoutVoice').addEventListener('click', requestVoiceActivation);
    el('btnFocusedListening').addEventListener('click', () => setFocusedListening(!voiceFocusedRequested));
    el('btnRecoverWorkoutAudio').addEventListener('click', recoverWorkoutAudio);
    updateVoiceBadgeForListeningState();
  }
  el('btnStartWorkout').addEventListener('click', () => {
    primeSpeech();
    if (activeSession.paused) resumeWorkout();
    else ensureWorkoutStarted();
  });
  el('btnPauseWorkout').addEventListener('click', pauseWorkout);

  el('btnFinishWorkout').addEventListener('click', () => {
    if (!confirm(i18n.text('לסיים ולשמור את האימון?'))) return;
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
  if (activeSession.paused) return;
  if (activeSession.running) return;
  activeSession.running = true;
  activeSession.startedAt = activeSession.startedAt || new Date().toISOString();
  persistActiveSession();
  stopwatch.start(new Date(activeSession.startedAt).getTime());
  requestWakeLock();
  el('btnStartWorkout').classList.add('hidden');
  el('btnFinishWorkout').classList.remove('hidden');
  el('btnPauseWorkout').disabled = false;
  const sessionID = activeSession.id;
  cancelWorkoutGreeting();
  if (settings.voiceAnnouncements) {
    workoutGreetingTimer = setTimeout(() => {
      workoutGreetingTimer = null;
      if (activeSession.id === sessionID && activeSession.running && settings.voiceAnnouncements) {
        speak('אימון מהנה ובהצלחה');
      }
    }, 1000);
  }
  if (native.isNative()) native.bgStartKeepAlive().then((started) => {
    if (!started) showToast('הפעלת ההודעות הקוליות ברקע נכשלה. טיימר המסך והפעילות החיה ממשיכים לפעול.');
  });
}

function cancelWorkoutGreeting() {
  if (workoutGreetingTimer !== null) clearTimeout(workoutGreetingTimer);
  workoutGreetingTimer = null;
}

function pauseWorkout() {
  if (!activeSession.running) return;
  const now = Date.now();
  const pausedRest = restTimer.isRunning() ? { remainingSec: Math.max(0, (restTimer.endAt - now) / 1000),
    totalSeconds: restTimer.totalSeconds, lastAnnouncedElapsed: restTimer.lastAnnouncedElapsed,
    exerciseName: el('restExerciseName').dataset?.exerciseName || '', doneMessage: restDoneMessage } : null;
  if (voiceCountingState) activeSession.pausedVoiceCount = { exerciseId: voiceCountingState.entry.exerciseId,
    setIndex: voiceCountingState.setIndex, count: voiceCountingState.count, targetReps: voiceCountingState.targetReps };
  for (const entry of activeSession.entries) {
    if (entry.type === 'cardio' && entry.startedAt && !entry.completed) {
      entry.elapsedSec = Math.min(entry.durationSec, (entry.elapsedSec || 0) + Math.max(0, (now - entry.startedAt) / 1000));
      entry.startedAt = null;
      entry.resumeAfterPause = true;
    }
    for (const set of entry.sets || []) {
      if (set.holdStartedAt && !set.completed) {
        set.holdElapsedSec = Math.max(0, (now - set.holdStartedAt) / 1000);
        delete set.holdStartedAt;
        set.resumeAfterPause = true;
      }
    }
  }
  activeSession.accumulatedSec = stopwatch.stop();
  activeSession.running = false;
  activeSession.paused = true;
  activeSession.activityControlRevision = (activeSession.activityControlRevision || 0) + 1;
  activityReadyEnabled = false;
  voiceCountingState = null;
  stopWorkoutTimers();
  activeSession.pausedRest = pausedRest;
  updateVoiceListeningState();
  syncNativeAnnouncementPlan();
  if (native.isNative()) native.bgStopKeepAlive();
  renderWorkoutTab();
  if (typeof trainingUI !== 'undefined') trainingUI?.refresh();
  persistActiveSession();
  showToast('האימון בהפסקה. הנתונים נשמרו; לחץ על המשך אימון כדי להמשיך.');
}

function resumeWorkout() {
  if (!activeSession.paused) return;
  const now = Date.now();
  activeSession.paused = false;
  activeSession.running = true;
  activeSession.activityControlRevision = (activeSession.activityControlRevision || 0) + 1;
  activeSession.clockStartedAt = now - (activeSession.accumulatedSec || 0) * 1000;
  for (const entry of activeSession.entries) {
    if (entry.resumeAfterPause) {
      if (!entry.completed) entry.startedAt = now;
      delete entry.resumeAfterPause;
    }
    for (const set of entry.sets || []) {
      if (!set.resumeAfterPause) continue;
      if (!set.completed) set.holdStartedAt = now - (set.holdElapsedSec || 0) * 1000;
      delete set.holdElapsedSec;
      delete set.resumeAfterPause;
    }
  }
  const savedCount = activeSession.pausedVoiceCount;
  if (savedCount) {
    const entryIndex = activeSession.entries.findIndex((entry) => entry.exerciseId === savedCount.exerciseId);
    const entry = activeSession.entries[entryIndex];
    const set = entry?.sets?.[savedCount.setIndex];
    if (set && !set.completed && Number(set.reps) === savedCount.count) {
      voiceCountingState = { entry, set, entryIndex, setIndex: savedCount.setIndex,
        count: savedCount.count, targetReps: savedCount.targetReps };
    }
    delete activeSession.pausedVoiceCount;
  }
  stopwatch.start(activeSession.clockStartedAt);
  const rest = activeSession.pausedRest;
  delete activeSession.pausedRest;
  renderWorkoutTab();
  if (rest?.remainingSec > 0) {
    restDoneMessage = rest.doneMessage;
    el('restExerciseName').setAttribute('data-exercise-name', rest.exerciseName);
    el('restExerciseName').textContent = i18n.exerciseName(rest.exerciseName);
    el('restOverlay').classList.remove('hidden');
    restTimer.restore({ endAt: now + rest.remainingSec * 1000, totalSeconds: rest.totalSeconds,
      lastAnnouncedElapsed: rest.lastAnnouncedElapsed });
  }
  persistActiveSession();
  updateVoiceListeningState();
  syncNativeAnnouncementPlan();
  syncWorkoutActivity();
  if (typeof trainingUI !== 'undefined') trainingUI?.refresh();
  requestWakeLock();
  if (native.isNative()) native.bgStartKeepAlive().then((started) => {
    if (!started) showToast('לא ניתן לחדש הודעות ברקע. טיימר האימון ממשיך לפעול.');
  });
}

function updateWorkoutPauseControls() {
  el('btnStartWorkout').disabled = !activeSession.entries.length;
  el('btnPauseWorkout').disabled = !activeSession.running;
  el('btnStartWorkout').textContent = activeSession.paused ? 'המשך אימון' : 'התחל אימון';
  i18n.translateDOM(el('btnStartWorkout'));
  el('btnStartWorkout').classList.toggle('hidden', !!activeSession.running);
  el('btnFinishWorkout').classList.toggle('hidden', !activeSession.running && !activeSession.paused);
  if (activeSession.paused) el('workoutTimerDisplay').textContent = formatHMS(activeSession.accumulatedSec || 0);
  el('workoutQuickTimer').textContent = el('workoutTimerDisplay').textContent;
}

// Cancels the current workout without saving anything to history, resetting
// the draft back to a blank session (the opposite of finishWorkout's save path).
function cancelWorkout() {
  if (!confirm(i18n.text('לבטל את האימון הנוכחי ולאפס את כל הנתונים שמולאו? פעולה זו לא ניתנת לביטול.'))) return;
  doCancelWorkout();
}

// The actual cancel logic, split out from the confirm() dialog above so the
// "cancel workout" voice command can trigger it directly without a blocking
// native dialog (the user already explicitly asked for the voice command to
// act immediately, same as every other voice command).
function doCancelWorkout() {
  activityReadyEnabled = false;
  stopWorkoutTimers();
  stopwatch.stop();
  activeSession.running = false;
  db.clearActiveSession();
  activeSession = buildDraftSession();
  syncWorkoutActivity();
  syncNativeAnnouncementPlan();
  voiceCountingState = null;
  updateVoiceBadgeForListeningState();
  el('workoutTimerDisplay').textContent = '00:00';
  el('btnStartWorkout').classList.remove('hidden');
  el('btnFinishWorkout').classList.add('hidden');
  renderWorkoutTab();
  showToast('האימון בוטל ואופס 🔄');
  if (native.isNative()) { native.bgCancelAnnouncements(); native.bgStopKeepAlive(); }
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
  openWorkoutSummary(record, msg);
}

function openTrainingDialog(title, content, exerciseName = '') {
  const previousFocus = document.activeElement;
  const parent = qsa('dialog.training-dialog[open]').at(-1);
  const dialog = document.createElement('dialog');
  const titleId = `trainingDialogTitle-${db.uid()}`;
  dialog.className = 'training-dialog';
  dialog.setAttribute('aria-labelledby', titleId);
  dialog.innerHTML = `<div class="training-dialog-head"><h3 id="${titleId}" ${exerciseName ? `data-no-translate data-exercise-name="${escapeAttr(exerciseName)}"` : ''}>${escapeHtml(title)}</h3>
    <button class="btn-icon btnCloseTrainingDialog" aria-label="${parent ? 'חזרה' : 'סגור'}">${parent ? '←' : '✕'}</button></div>
    <div class="training-dialog-body"><p class="training-dialog-error hidden" role="alert"></p>${content}</div>`;
  document.body.appendChild(dialog);
  const storageError = () => {
    const message = qs('.training-dialog-error', dialog);
    message.textContent = 'השמירה במכשיר נכשלה. הנתונים הקודמים לא נמחקו; אל תסיר את האפליקציה.';
    i18n.translateDOM(message);
    message.classList.remove('hidden');
    message.scrollIntoView({ block: 'nearest' });
  };
  window.addEventListener('autofit-storage-error', storageError);
  qs('.btnCloseTrainingDialog', dialog).addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    dialog.remove();
    window.removeEventListener('autofit-storage-error', storageError);
    if (previousFocus?.isConnected) previousFocus.focus();
  }, { once: true });
  dialog.showModal();
  i18n.translateDOM(dialog);
  return dialog;
}

function openWorkoutSummary(record, celebration = '') {
  const summary = insights.workoutSummary(record, db.getWorkouts());
  const messages = {
    'more-reps': 'עוד {0} חזרות באותם משקלים ובאותו מספר סטים לעומת האימון הקודם בתרגיל.',
    'more-weight': 'יותר משקל מתועד באותן חזרות ובאותו מספר סטים לעומת האימון הקודם בתרגיל.',
    'repeated-four': 'אותם משקלים וחזרות בארבעת האימונים האחרונים בתרגיל. זה תיאור של התיעוד, לא קביעה שאין התקדמות.',
  };
  const showHealthBtn = !native.isNative();
  const dialog = openTrainingDialog(celebration ? 'האימון נשמר' : 'סיכום אימון', `
    ${record.planSnapshot ? `<h4 data-no-translate>${escapeHtml(trainingTools.sessionWorkoutTitle(record, i18n.text))}</h4>` : ''}
    ${celebration ? `<p class="summary-celebration">🎉 ${escapeHtml(celebration)}</p>` : ''}
    <div class="summary-stats">
      <div class="stat-box"><div class="stat-value">${formatHMS(record.durationSec)}</div><div class="stat-label">משך האימון</div></div>
      <div class="stat-box"><div class="stat-value">${summary.exercises}</div><div class="stat-label">תרגילים שתועדו</div></div>
      <div class="stat-box"><div class="stat-value">${summary.sets}</div><div class="stat-label">סטים שבוצעו</div></div>
    </div>
    <section class="summary-health" data-health-workout="${escapeAttr(record.id)}">
      <h4>עדכון באפליקציית בריאות</h4>
      <p class="health-delivery-message" role="status"></p>
      <p class="health-delivery-reason field-hint" data-no-translate></p>
      <button type="button" class="btn btn-secondary btn-small btnRetryHealth hidden">בדיקת הרשאה וניסיון סנכרון נוסף</button>
    </section>
    ${summary.holdSeconds ? `<p><span>זמן החזקות שתועד</span>: ${formatHMS(summary.holdSeconds)}</p>` : ''}
    ${summary.cardioSeconds ? `<p><span>זמן אירובי שתועד</span>: ${formatHMS(summary.cardioSeconds)}</p>` : ''}
    <h4>תובנות מהאימון</h4>
    ${summary.insights.length ? `<ul class="summary-insights">${summary.insights.map((item) => `<li>
      <b data-no-translate data-exercise-name="${escapeAttr(item.exerciseName)}">${escapeHtml(i18n.exerciseName(item.exerciseName))}</b>
      <p>${escapeHtml(messages[item.kind].replace('{0}', item.delta))}</p></li>`).join('')}</ul>`
      : '<p class="about-desc">עדיין אין השוואה מתאימה. ההשוואות יופיעו כשיצטברו אימונים דומים עם סוג מדידה מתועד.</p>'}
    ${record.entries.some((entry) => entry.inputType === 'reps' && entry.comparisonKey === null)
      ? '<p class="about-desc">בתרגיל הכולל כמה וריאציות, בחר וריאציה מוגדרת מהספרייה כדי לקבל השוואה.</p>' : ''}
    ${record.entries.some((entry) => entry.sets?.some((set) => set.notes)) ? `<h4>הערות לסטים</h4>
      <ul>${record.entries.flatMap((entry) => (entry.sets || []).map((set, index) => set.notes
        ? `<li><span data-no-translate>${escapeHtml(i18n.exerciseName(entry.exerciseName))}</span> · <span>סט</span> ${index + 1}:
          <span data-no-translate>${escapeHtml(set.notes)}</span></li>` : '')).join('')}</ul>` : ''}
    <h4>תחושת הקושי שלך</h4>
    ${Object.values(summary.difficulty).some(Boolean) ? `<div class="summary-difficulty">${Object.entries(summary.difficulty)
      .filter(([, count]) => count).map(([value, count]) => `<span><span>${insights.DIFFICULTY_LABELS[value]}</span>: ${count}</span>`).join('')}</div>`
      : '<p class="about-desc">לא נבחר דירוג קושי באימון הזה.</p>'}
    <p class="about-desc summary-comparison-note">ההשוואה מתייחסת לתרגיל ולהגדרות שתועדו. נפח עבודה אינו מדידה ישירה של כוח או גדילת שריר.</p>
    <p class="about-desc">באימון הבא יחזרו הגדרות התוכנית ומשקלי הבסיס. בתרגיל ללא משקל קבוע, המשקל הראשון בסט שהושלם נשמר כבסיס; משקל קבוע קיים אינו משתנה.</p>
    <button class="btn btn-primary btnShareWorkoutSummary">שיתוף האימון</button>
    ${showHealthBtn ? '<button class="btn btn-secondary btn-small btnSendHealth">📲 שלח ל-Shortcuts (לבריאות)</button>' : ''}
  `);
  qs('.btnShareWorkoutSummary', dialog).addEventListener('click', () =>
    openShareModal([workouts.find((workout) => workout.id === record.id) || record]));
  const healthRow = qs('.summary-health', dialog);
  healthRow.querySelector('.btnRetryHealth').addEventListener('click', () => syncWorkoutToHealth([record]));
  renderHealthSummary(healthRow, workouts.find((workout) => workout.id === record.id) || record);
  if (showHealthBtn) qs('.btnSendHealth', dialog).addEventListener('click', () => {
    syncWorkoutToHealth([record]);
  });
  if (showHealthBtn && record.healthDelivery?.status === 'shortcut') qs('.btnSendHealth', dialog).disabled = true;
}

function finishWorkout() {
  if (finishingWorkout) return;
  finishingWorkout = true;
  try {
    activityReadyEnabled = false;
    const durationSec = activeSession.running ? stopwatch.stop() : activeSession.accumulatedSec || 0;
    activeSession.running = false;
    activeSession.accumulatedSec = durationSec;
    stopWorkoutTimers();
    if (activeSession.entries.length > 0 && activeSession.entries.every(isEntryDone)) {
      activeSession.paused = true;
      persistActiveSession();
    }

    const recordedEntries = trainingTools.workoutHistoryEntries(activeSession);
    const hasCompleted = recordedEntries.some((e) =>
      e.type === 'cardio' ? e.completed : e.sets.some((s) => s.completed)
    );
    let record;
    if (hasCompleted) {
      record = workouts.find((workout) => workout.id === activeSession.id) || {
        id: activeSession.id,
        dateISO: (activeSession.startedAt || new Date().toISOString()),
        finishedAt: new Date().toISOString(),
        durationSec: Math.round(durationSec),
        ...(activeSession.planSnapshot ? { planId: activeSession.planId, planSnapshot: JSON.parse(JSON.stringify(activeSession.planSnapshot)) } : {}),
        ...(native.isNative() ? { healthSyncPending: true } : {}),
        healthDelivery: { status: native.isNative() ? 'pending' : 'unavailable',
          reason: native.isNative() ? '' : 'browser', updatedAt: new Date().toISOString() },
        entries: recordedEntries
          .map((e) => {
            if (e.type === 'cardio') {
              return e.completed
                ? { exerciseId: e.exerciseId, exerciseName: e.exerciseName, type: 'cardio', durationSec: e.durationSec, completed: true, location: e.location || '', pace: e.pace || '',
                  ...(e.intervals ? { intervals: JSON.parse(JSON.stringify(e.intervals)), exerciseSnapshot: e.exerciseSnapshot } : {}),
                  ...(e.removedFromWorkout ? { removedFromWorkout: true } : {}) }
                : null;
            }
            const completed = insights.completedEntrySnapshot(e, e.exerciseSnapshot || exercises.find((exercise) => exercise.id === e.exerciseId));
            return e.removedFromWorkout ? { ...completed, removedFromWorkout: true } : completed;
          })
          .filter((e) => e && (e.type === 'cardio' || e.sets.length > 0)),
      };
      const next = [...workouts.filter((workout) => workout.id !== record.id), record];
      db.saveWorkouts(next);
      workouts = next;
      const baseline = trainingTools.rememberMissingWorkoutLoads(exercises, settings, activeSession);
      if (baseline.count) {
        db.saveProgramState(baseline.exercises, baseline.settings, activeSession);
        exercises = baseline.exercises;
        settings = baseline.settings;
      }
    }

    db.clearActiveSession();
    const completedMuscleCue = workoutMuscleCompletionCue();
    activeSession = buildDraftSession();
    syncWorkoutActivity();
    syncNativeAnnouncementPlan();
    voiceCountingState = null;
    updateVoiceBadgeForListeningState();
    el('workoutTimerDisplay').textContent = '00:00';
    el('btnStartWorkout').classList.remove('hidden');
    el('btnFinishWorkout').classList.add('hidden');
    renderWorkoutTab();
    renderHistoryTab();
    if (native.isNative()) { native.bgCancelAnnouncements(); native.bgStopKeepAlive(); }
    if (record) {
      showToast('האימון נשמר בהיסטוריה ✅');
      if (settings.voiceAnnouncements) speak(completedMuscleCue + i18n.text('כל הכבוד על האימון'));
      showCelebration(record);
      if (native.isNative()) syncWorkoutToHealth([record], { requestAuthorization: false });
    } else {
      showToast('האימון בוטל (לא הושלם אף סט)');
    }
  } finally {
    finishingWorkout = false;
    if (activeSession.paused) {
      updateWorkoutPauseControls();
      updateVoiceListeningState();
      if (native.isNative()) { native.bgCancelAnnouncements(); native.bgStopKeepAlive(); }
    }
  }
}

function persistActiveSession() {
  if (privacyErasing) return;
  if (activeSession.restCueExerciseId) {
    restDoneMessage = workoutRestContinuation();
    if (activeSession.pausedRest) activeSession.pausedRest.doneMessage = restDoneMessage;
    if (activeSession.rest) activeSession.rest.doneMessage = restDoneMessage;
  }
  db.saveActiveSession(activeSession);
  syncWorkoutActivity();
  syncNativeAnnouncementPlan();
}

function trainingAPI() {
  const remainingRest = () => activeSession.pausedRest?.remainingSec
    || (restTimer.endAt ? Math.max(0, (restTimer.endAt - Date.now()) / 1000) : 0);
  const backupFields = (exercise) => Object.fromEntries(['id', 'active', 'defaultSets', 'defaultReps', 'targetReps', 'targetWeightKg', 'autoLoadBaseline', 'restSeconds', 'durationMinutes', 'holdSeconds', 'pace', 'intervals']
    .map((key) => [key, exercise[key] ?? null]));
  const sessionHasData = () => activeSession.running || activeSession.paused || activeSession.startedAt || activeSession.accumulatedSec > 0
    || activeSession.timeBudget || activeSession.substitutions?.length || activeSession.removedExercises?.length
    || activeSession.entries.some((entry) => trainingTools.entryHasActivity(entry));
  const applyProgram = (nextExercises, nextSettings) => {
    const keepSession = sessionHasData();
    const nextSession = keepSession ? { ...activeSession, programPinned: true } : buildProgramDraft(nextExercises, nextSettings);
    db.saveProgramState(nextExercises, nextSettings, nextSession);
    exercises = nextExercises;
    settings = nextSettings;
    activeSession = nextSession;
    renderExercisesTab();
    renderWorkoutTab();
    renderHomeTab();
    showToast(keepSession ? 'התוכנית נשמרה לאימון הבא. האימון הנוכחי לא הוחלף.' : 'התוכנית הופעלה. הבחירה הקודמת זמינה לשחזור.');
  };
  return {
    uid: db.uid, dialog: openTrainingDialog, guide: openExerciseGuide,
    muscleGroups: () => EXERCISE_LIBRARY_CATEGORIES.filter((group) => group.id !== 'supersets'),
    exerciseGroup: (exercise) => exerciseLibraryGroup(exercise),
    durationState: ({ live = false } = {}) => ({ session: activeSession, exercises, settings,
      program: live ? null : trainingTools.durationSession(myWorkoutExercises(), (exercise) => setsForWeek(exercise)),
      restSeconds: remainingRest() }),
    repTarget(set, exercise) { return voiceRepTarget(set, exercise); },
    getState: () => ({ session: activeSession, exercises, settings, history: workouts,
      native: native.isNative(), voiceActive: voiceListeningActive && !voiceActivationPending, counting: voiceCountingState,
      busy: !!voiceCountingState || holdTimers.size > 0,
      restSeconds: remainingRest() }),
    saveSession(next) {
      const entries = [...next.entries, ...(next.removedExercises || []).map((item) => item.entry),
        ...(next.timeBudget?.deferred || []), ...(next.substitutions || []).map((item) => item.original)];
      for (const entry of entries) {
        if (entry.type === 'cardio' || entry.exerciseSnapshot) continue;
        const exercise = exercises.find((item) => item.id === entry.exerciseId);
        if (exercise) {
          if (trainingTools.entryHasActivity(entry)) entry.userEdited = true;
          const { images, ...snapshot } = exercise;
          entry.exerciseSnapshot = JSON.parse(JSON.stringify(snapshot));
        }
      }
      const continuation = next.restCueExerciseId ? workoutRestContinuation(next) : null;
      if (continuation !== null && next.rest) next.rest.doneMessage = continuation;
      if (continuation !== null && next.pausedRest) next.pausedRest.doneMessage = continuation;
      db.saveActiveSession(next);
      if (continuation !== null) restDoneMessage = continuation;
      activeSession = next;
      lastVoiceAction = null;
      lastVoiceReport = null;
      lastAutoCountCompletion = null;
      renderWorkoutTab();
      syncNativeAnnouncementPlan();
      syncWorkoutActivity();
    },
    saveSettings(next) { db.saveSettings(next); settings = next; },
    addSuperset(recipeId) {
      const parts = trainingTools.supersetExercises(recipeId, exercises);
      const existing = parts.map((part) => exercises.find((exercise) => exercise.id === part.id));
      if (existing.some((exercise) => exercise && exercise.active !== false)) throw new Error('צמד הסופר סט הזה כבר נבחר');
      const ids = new Set(parts.map((part) => part.id));
      const next = [...exercises.filter((exercise) => !ids.has(exercise.id)),
        ...parts.map((part, index) => ({ ...(existing[index] || part), active: true }))];
      applyProgram(next, settings);
    },
    changeWorkoutRemoval(exerciseId, restore = false) {
      if (activeSession.running) pauseWorkout();
      const transform = restore ? trainingTools.restoreWorkoutExercise : trainingTools.removeWorkoutExercise;
      this.saveSession(transform(activeSession, exerciseId));
      renderHomeTab();
    },
    saveEditedPlan(original, draft) {
      const latest = db.getSettings();
      const training = latest.training || {};
      const plans = trainingTools.replaceSavedPlan(training.plans || [], original, draft);
      const next = { ...latest, training: { ...training, plans } };
      db.saveSettings(next);
      settings = next;
    },
    canStartSavedPlan: () => !sessionHasData() && !voiceCountingState && holdTimers.size === 0,
    startSavedPlan(plan, day) {
      if (!this.canStartSavedPlan()) throw new Error('Finish or save the current workout before starting another');
      primeSpeech();
      this.activatePlan(plan, day);
      const draft = { ...activeSession };
      try { ensureWorkoutStarted(); }
      catch (error) {
        activeSession = draft;
        renderWorkoutTab();
        throw new Error('The plan was selected but the workout could not start', { cause: error });
      }
      switchTab('workout');
      renderHomeTab();
    },
    openCurrentWorkout() { switchTab('workout'); },
    saveTarget(id, targetReps) {
      const next = exercises.map((exercise) => exercise.id === id ? { ...exercise, targetReps } : exercise);
      db.saveExercises(next);
      exercises = next;
      showToast('היעד נשמר לאימונים הבאים. נתונים שכבר תועדו לא השתנו.');
    },
    acceptAdvice(id, decision, targetWeightKg, targets = {}) {
      const exercise = exercises.find((item) => item.id === id);
      const hasTarget = targetWeightKg !== undefined || Object.keys(targets).length > 0;
      if (!exercise || hasTarget && (exercise.inputType === 'cardio' || exercise.inputType === 'hold')
        || Object.keys(targets).some((key) => !['targetReps', 'defaultSets'].includes(key))
        || Object.entries(targets).some(([key, value]) => !Number.isInteger(value) || value < 1 || value > (key === 'targetReps' ? 100 : 20))
        || targetWeightKg !== undefined && (!Number.isFinite(targetWeightKg) || targetWeightKg < 0 || targetWeightKg > 1000)
        || decision.decision !== 'accept' && hasTarget) {
        throw new RangeError('Invalid progress target');
      }
      const nextExercises = exercises.map((item) => item.id === id
        ? { ...item, ...targets, ...(targetWeightKg !== undefined ? { targetWeightKg } : {}) } : item);
      const training = settings.training || {};
      const nextSettings = { ...settings, training: { ...training, decisions: {
        ...training.decisions, [id]: { ...training.decisions?.[id], ...decision },
      } } };
      db.saveProgramState(nextExercises, nextSettings, activeSession);
      exercises = nextExercises;
      settings = nextSettings;
    },
    clearLoadTarget(id) {
      const next = exercises.map((exercise) => {
        if (exercise.id !== id) return exercise;
        const { targetWeightKg, ...original } = exercise;
        return { ...original, autoLoadBaseline: false };
      });
      const training = settings.training || {};
      const decisions = { ...training.decisions };
      if (decisions[id]?.targetReps || decisions[id]?.defaultSets) {
        const { targetWeightKg, ...remaining } = decisions[id];
        decisions[id] = remaining;
      } else delete decisions[id];
      const nextSettings = { ...settings, training: { ...training, decisions } };
      db.saveProgramState(next, nextSettings, activeSession);
      exercises = next;
      settings = nextSettings;
    },
    activatePlan(plan, day) {
      const proposed = plan.sessions[day].exercises;
      const missing = trainingTools.planningCatalog(exercises).filter((candidate) =>
        proposed.some((item) => item.id === candidate.id) && !exercises.some((item) => item.id === candidate.id));
      for (const item of proposed.filter((item) => item.superset)) {
        const part = trainingTools.supersetExercises(item.superset.id, exercises).find((part) => part.id === item.id);
        if (!part || part.catalogId !== item.catalogId) throw new Error('צמד הסופר סט אינו תקין');
        if (!exercises.some((exercise) => exercise.id === part.id) && !missing.some((exercise) => exercise.id === part.id)) missing.push(part);
      }
      const nextExercises = trainingTools.activatePlanExercises([...exercises, ...missing], proposed);
      const training = settings.training || {};
      const plans = [...(training.plans || []).filter((item) => item.id !== plan.id), plan];
      if (plans.length > 8) throw new Error('Remove a saved plan before activating another');
      applyProgram(nextExercises, { ...settings, training: { ...training, plans,
        programBackup: training.programBackup || exercises.map(backupFields),
        activePlan: { id: plan.id, day, snapshot: trainingTools.planIdentity(plan, day) } } });
    },
    restoreProgram() {
      const backup = settings.training?.programBackup;
      if (!backup) throw new Error('No program backup');
      const nextExercises = exercises.map((exercise) => {
        const saved = backup.find((item) => item.id === exercise.id);
        return saved ? { ...exercise, ...saved } : exercise.id.startsWith('planning:')
          || exercise.id.startsWith('library:extended-') ? { ...exercise, active: false } : exercise;
      }).sort((a, b) => {
        const index = (id) => { const found = backup.findIndex((item) => item.id === id); return found < 0 ? backup.length : found; };
        return index(a.id) - index(b.id);
      });
      applyProgram(nextExercises, { ...settings, training: { ...settings.training, activePlan: null, programBackup: null } });
    },
  };
}

function persistRestTimerState(completed = false) {
  if (!activeSession) return;
  const previous = restTimer.announcementEndAt;
  const current = restTimer.isRunning() ? restTimer.endAt : null;
  if (previous && previous !== current) cancelSpeech(`rest:${previous}:${completed ? 'start' : ''}`);
  restTimer.announcementEndAt = current;
  activeSession.rest = restTimer.isRunning() ? {
    endAt: restTimer.endAt, totalSeconds: restTimer.totalSeconds,
    lastAnnouncedElapsed: restTimer.lastAnnouncedElapsed,
    exerciseName: el('restExerciseName').dataset?.exerciseName || el('restExerciseName').textContent, doneMessage: restDoneMessage,
  } : null;
  if (activeSession.running) db.saveActiveSession(activeSession);
  syncWorkoutActivity();
  syncNativeAnnouncementPlan();
}

function buildWorkoutActivityPayload() {
  if (!activeSession || (!activeSession.running && !activeSession.paused && !activityReadyEnabled)) return { running: false };
  const preview = !activeSession.running && !activeSession.paused;
  const strength = activeSession.entries.filter((entry) => entry.type !== 'cardio');
  let current = activeSession.entries.find((entry) => entry.exerciseId === activeSession.currentExerciseId && !isEntryDone(entry));
  const focusedID = current && !isEntryDone(current) ? current.exerciseId : null;
  const runningHold = [...holdTimers].find(([key]) =>
    key.slice(0, key.lastIndexOf(':')) === focusedID) || (!focusedID ? [...holdTimers][0] : undefined);
  const cardio = activeSession.entries.find((entry) =>
    entry.type === 'cardio' && entry.startedAt && !entry.completed && (!focusedID || entry.exerciseId === focusedID));
  let phase = activeSession.paused ? 'paused' : preview ? 'ready' : 'workout', phaseStartMillis = null, phaseEndMillis = null;
  if (!preview && !activeSession.paused && restTimer.isRunning()) {
    phase = 'rest';
    phaseEndMillis = restTimer.endAt;
    phaseStartMillis = phaseEndMillis - restTimer.totalSeconds * 1000;
  } else if (!preview && !activeSession.paused && runningHold) {
    phase = 'hold';
    const [key, state] = runningHold;
    current = activeSession.entries.find((entry) => entry.exerciseId === key.slice(0, key.lastIndexOf(':')));
    const exercise = exercises.find((entry) => entry.id === current?.exerciseId);
    phaseStartMillis = state.startedAt;
    phaseEndMillis = state.startedAt + (exercise?.holdSeconds || 15) * 1000;
  } else if (!preview && !activeSession.paused && cardio) {
    phase = 'cardio';
    current = cardio;
    phaseStartMillis = cardio.startedAt;
    phaseEndMillis = cardio.startedAt + Math.max(0, cardio.durationSec - (cardio.elapsedSec || 0)) * 1000;
    if (phaseEndMillis <= phaseStartMillis) phase = 'workout';
  }
  current = current || activeSession.entries.find((entry) => !isEntryDone(entry));
  if (phase === 'workout' || phase === 'paused') { phaseStartMillis = null; phaseEndMillis = null; }
  let setIndex = current?.type !== 'cardio' ? current?.sets.findIndex((set) => !set.completed) : -1;
  if (voiceCountingState && voiceCountingState.entry === current && !voiceCountingState.set.completed) setIndex = current.sets.indexOf(voiceCountingState.set);
  if (phase === 'hold' && runningHold && current) setIndex = Number(runningHold[0].slice(current.exerciseId.length + 1));
  return {
    running: !!activeSession.running, paused: !!activeSession.paused, preview, sessionID: preview ? `ready:${activeSession.id}` : activeSession.id,
    startMillis: preview ? activityPreviewStartedAt : activeSession.clockStartedAt || new Date(activeSession.startedAt).getTime(),
    exerciseName: (current?.exerciseName ? i18n.exerciseName(current.exerciseName) : i18n.text('מוכן להתחיל אימון')).slice(0, 120),
    language: i18n.getLanguage(),
    feminineWording: i18n.getGender() === 'female',
    totalSets: strength.reduce((sum, entry) => sum + entry.sets.length, 0),
    completedSets: strength.reduce((sum, entry) => sum + entry.sets.filter((set) => set.completed).length, 0),
    phase, phaseStartMillis, phaseEndMillis,
    exerciseID: current?.exerciseId,
    ...(setIndex >= 0 ? { setIndex } : {}),
    controlRevision: activeSession.activityControlRevision || 0,
    ...(activeSession.paused ? { pausedElapsedSeconds: activeSession.accumulatedSec || 0 } : {}),
  };
}

function syncWorkoutActivity() {
  if (!native.isNative() || !appInitialized || activitySyncQueued) return;
  activitySyncQueued = true;
  queueMicrotask(() => {
    activitySyncQueued = false;
    const snapshot = buildWorkoutActivityPayload();
    const key = JSON.stringify(snapshot);
    if (key === activitySnapshotKey) return;
    const revision = ++activitySyncRevision;
    activitySnapshotKey = key;
    activitySyncChain = activitySyncChain.then(async () => {
      if (revision !== activitySyncRevision) return;
      const result = await native.syncWorkoutActivity(snapshot);
      if (revision !== activitySyncRevision) return;
      const status = el('liveActivityStatus');
      if (!result.ok) {
        if (activitySnapshotKey === key) activitySnapshotKey = '';
        if (activityError !== result.reason) {
          activityError = result.reason;
          showToast('לא ניתן להציג פעילות חיה במסך הנעילה — ' + result.reason);
        }
        if (status) { status.textContent = 'פעילות חיה אינה זמינה: ' + result.reason; status.classList.remove('hidden'); }
      } else {
        activityError = '';
        if (status) {
          status.textContent = result.active ? snapshot.preview
            ? '⏱ AutoFit מוכן לאימון במסך הנעילה וב־Dynamic Island'
            : '⏱ האימון מוצג גם במסך הנעילה וב־Dynamic Island'
            : result.pending ? 'הפעילות החיה תוצג כשחוזרים לאפליקציה.'
              : result.dismissed ? 'הפעילות החיה הוסתרה לאימון הזה. האימון ממשיך כרגיל.'
                : 'הפעילות החיה נסגרה. אימון חדש יציג אותה שוב.';
          status.classList.remove('hidden');
        }
      }
    }).catch((error) => {
      if (revision !== activitySyncRevision) return;
      activitySnapshotKey = '';
      console.error('Workout Live Activity update failed', error);
      showToast('עדכון הפעילות החיה נכשל: ' + error.message);
    });
  });
}

function stopWorkoutTimers() {
  cancelWorkoutGreeting();
  restTimer.stop();
  el('restOverlay').classList.add('hidden');
  holdTimers.forEach((state) => clearInterval(state.intervalId));
  holdTimers.clear();
  lastVoiceAction = null;
  lastVoiceReport = null;
  pendingVoiceFinish = null;
  lastAutoCountCompletion = null;
}

async function handleWorkoutActivityAction(request) {
  if (!appInitialized) return;
  if (!request || typeof request.id !== 'string' || !request.id || request.id.length > 128) {
    console.error('Invalid workout Live Activity action', request);
    showToast('לא ניתן לבצע את הפעולה מהווידג׳ט. פתח את האימון ובדוק את מצבו.');
    return;
  }
  if (activityActionsInFlight.has(request.id)) return;
  activityActionsInFlight.add(request.id);
  let outcome = activityActionResults.get(request.id);
  try {
    if (!outcome) {
      try {
        const age = Date.now() - request.createdAt;
        if (!Number.isFinite(request.createdAt) || age < -5000 || age > 20000 || request.sessionID !== activeSession.id
          || request.controlRevision !== (activeSession.activityControlRevision || 0)) {
          throw new Error(i18n.text('הפעולה אינה עדכנית. פתח את AutoFit ונסה שוב.'));
        }
        if (request.command === 'pause' && activeSession.running) pauseWorkout();
        else if (request.command === 'resume' && activeSession.paused) resumeWorkout();
        else if (request.command === 'completeSet') {
          const snapshot = buildWorkoutActivityPayload();
          if (!activeSession.running || !['workout', 'hold'].includes(snapshot.phase)
            || snapshot.exerciseID !== request.exerciseID || snapshot.setIndex !== request.setIndex) {
            throw new Error(i18n.text('הסט בווידג׳ט כבר אינו הסט הנוכחי. לא סומן סט אחר.'));
          }
          const entry = activeSession.entries.find((entry) => entry.exerciseId === request.exerciseID);
          const set = entry?.sets?.[request.setIndex];
          const exercise = entry?.exerciseSnapshot || exercises.find((exercise) => exercise.id === entry?.exerciseId);
          if (!set || set.completed || !exercise) throw new Error(i18n.text('הסט בווידג׳ט כבר אינו הסט הנוכחי. לא סומן סט אחר.'));
          setWorkoutSetCompletion(entry, set, exercise, request.setIndex, true);
          renderWorkoutTab();
        } else throw new Error(i18n.text('הפעולה אינה עדכנית. פתח את AutoFit ונסה שוב.'));
        outcome = { success: true, reason: '' };
      } catch (error) {
        console.error('Workout Live Activity action failed', error);
        outcome = { success: false, reason: error.message };
        showToast('לא ניתן לבצע את הפעולה מהווידג׳ט. פתח את האימון ובדוק את מצבו.');
      }
      activityActionResults.set(request.id, outcome);
      if (activityActionResults.size > 128) activityActionResults.delete(activityActionResults.keys().next().value);
    }
    syncWorkoutActivity();
    await Promise.resolve();
    await activitySyncChain;
    const result = await native.acknowledgeWorkoutActivityAction({ id: request.id, ...outcome });
    if (!result.ok) {
      console.error('Workout control acknowledgement failed', result.reason);
      showToast('עדכון הווידג׳ט נכשל. בדוק באפליקציה אם הפעולה נשמרה לפני ניסיון נוסף.');
    }
  } finally {
    activityActionsInFlight.delete(request.id);
  }
}

function workoutMuscleCompletionCue(consume = true) {
  const groups = trainingTools.workoutMuscleProgress(activeSession, exercises).groups;
  const previous = workoutMuscleCompletionCue.state;
  const sameSession = previous?.session === activeSession;
  const pending = new Set(sameSession ? previous.pending : []);
  const states = new Map();
  for (const group of groups) {
    const old = sameSession && previous.groups.get(group.key);
    if (group.muscle && old?.signature === group.signature && !old.complete && group.complete) pending.add(group.key);
    if (!group.complete || !old || old.signature !== group.signature) pending.delete(group.key);
    states.set(group.key, group);
  }
  workoutMuscleCompletionCue.state = { session: activeSession, groups: states, pending };
  if (!consume) return '';
  const completed = groups.filter((group) => group.muscle && group.complete && pending.has(group.key));
  pending.clear();
  if (!settings.voiceAnnouncements || !completed.length) return '';
  return `${i18n.text('תרגילי הקבוצה הושלמו: {0}').replace('{0}', completed.map((group) => i18n.text(group.label)).join(', '))}. `;
}

function refreshWorkoutMuscleHeadings() {
  const { sections } = trainingTools.workoutMuscleProgress(activeSession, exercises);
  for (const heading of qsa('[data-workout-muscle-section]')) {
    const section = sections.find((item) => item.entryIndex === Number(heading.dataset.workoutMuscleSection));
    if (!section) continue;
    qs('h2', heading).textContent = section.label.split(' + ').map((label) => i18n.text(label)).join(' + ');
    qs('.workout-muscle-count', heading).textContent = section.total === 1
      ? i18n.text(section.done ? 'התרגיל הושלם' : 'תרגיל אחד')
      : i18n.text('{0} מתוך {1} תרגילים הושלמו').replace('{0}', section.done).replace('{1}', section.total);
    heading.classList.toggle('done', section.complete);
  }
  workoutMuscleCompletionCue(false);
}

function renderWorkoutTab() {
  if (workoutCardSessionId !== activeSession.id) {
    workoutCardSessionId = activeSession.id;
    expandedWorkoutExercises.clear();
  }
  el('workoutName').textContent = trainingTools.sessionWorkoutTitle(activeSession, i18n.text);
  updateWorkoutPauseControls();
  const list = el('exerciseList');
  list.innerHTML = '';
  if (activeSession.removedExercises?.length) {
    const removed = document.createElement('section');
    removed.className = 'card workout-removed-exercises';
    removed.innerHTML = `<h3>תרגילים שהוסרו מהאימון הנוכחי</h3>
      <p class="field-hint">אינם נכללים ביעדים ובאחוזים. סטים שהושלמו נשמרים בהיסטוריה. אפשר לבטל הסרה במהלך האימון.</p>
      ${activeSession.removedExercises.map(({ entry }) => `<div class="workout-removed-row"><span data-no-translate>${escapeHtml(i18n.exerciseName(entry.exerciseName))}</span>
        <button class="btn btn-secondary btn-small" data-restore-workout-exercise="${escapeAttr(entry.exerciseId)}">ביטול הסרה</button></div>`).join('')}`;
    qsa('[data-restore-workout-exercise]', removed).forEach((button) =>
      button.addEventListener('click', () => openWorkoutRemovalDialog(button.dataset.restoreWorkoutExercise, true)));
    list.appendChild(removed);
    i18n.translateDOM(removed);
  }
  const lastByExercise = getLastCompletedValuesByExercise();
  const muscleProgress = trainingTools.workoutMuscleProgress(activeSession, exercises);
  const muscleSections = muscleProgress.sections;
  workoutMuscleCompletionCue(false);

  let exerciseNumber = 0;

  muscleProgress.order.forEach((entryIndex) => {
    const entry = activeSession.entries[entryIndex];
    const section = muscleSections.find((item) => item.entryIndex === entryIndex);
    if (section) {
      const heading = document.createElement('section');
      heading.className = 'workout-muscle-heading';
      heading.dataset.workoutMuscleSection = entryIndex;
      heading.setAttribute('data-no-translate', '');
      heading.innerHTML = `<h2>${section.label.split(' + ').map((label) => escapeHtml(i18n.text(label))).join(' + ')}</h2><span class="workout-muscle-count"></span>`;
      list.appendChild(heading);
    }
    if (entry.type === 'cardio') {
      exerciseNumber += 1;
      const cardioCard = renderCardioCard(entry, exerciseNumber);
      cardioCard.dataset.entryIndex = entryIndex;
      cardioCard.dataset.workoutNumber = exerciseNumber;
      configureWorkoutCard(cardioCard, entry, entryIndex);
      list.appendChild(cardioCard);
      return;
    }
    const ex = entry.exerciseSnapshot ? { ...exercises.find((e) => e.id === entry.exerciseId), ...entry.exerciseSnapshot }
      : exercises.find((e) => e.id === entry.exerciseId);
    if (!ex) return;
    exerciseNumber += 1;

    const card = document.createElement('div');
    card.className = 'exercise-card' + (isEntryDone(entry) ? ' done' : '');
    card.dataset.entryIndex = entryIndex;

    const head = document.createElement('div');
    head.className = 'exercise-card-head';
    head.innerHTML = `
      <div style="display:flex;gap:8px;align-items:flex-start;">
        <span class="exercise-num">${exerciseNumber}</span>
        <div>
          <div class="exercise-name" data-no-translate data-exercise-name="${escapeAttr(ex.name)}">${escapeHtml(i18n.exerciseName(ex.name))}</div>
          <div class="exercise-muscle-line">${escapeHtml(ex.category)}</div>
          <div class="exercise-meta">${ex.inputType === 'hold' ? `החזקה: ${ex.holdSeconds || 15} שניות` : ''}${ex.inputType === 'hold' && ex.notes ? ' &middot; ' : ''}<span data-no-translate data-exercise-notes="${escapeAttr(ex.notes || '')}">${escapeHtml(i18n.exerciseNotes(ex.notes || ''))}</span></div>
          ${ex.superset ? `<p class="field-hint"><strong>${escapeHtml(i18n.text(ex.superset.name))}</strong><br>${i18n.text('חלק')} ${ex.superset.order + 1} / 2 · ${i18n.text('חזרות')}: ${escapeHtml(String(entry.targetReps || ex.defaultReps))}<br>${i18n.text(activeSession.entries.filter((item) => item.exerciseSnapshot?.superset?.id === ex.superset.id).length === 2
            ? 'משקל נפרד לכל תרגיל. מנוחה אחרי שני החלקים; אפשר לנוח לפי הצורך.'
            : 'הצמד אינו מלא באימון הזה. התרגיל ממשיך עם מנוחה רגילה.')}</p>` : ''}
        </div>
      </div>
      <div class="exercise-head-right">
        <button class="btn-photo btnRemoveWorkoutExercise">הסר תרגיל</button>
        ${library.exerciseGuide(ex) ? '<button class="btn-photo btnExerciseGuide">הדרכה</button>' : ''}
        ${ex.images?.length || library.exerciseGuide(ex) ? '<button class="btn-photo btnShowPhoto">📷 תמונה</button>' : ''}
      </div>
    `;
    const guideButton = qs('.btnExerciseGuide', head);
    qs('.btnRemoveWorkoutExercise', head).addEventListener('click', () => openWorkoutRemovalDialog(entry.exerciseId));
    if (guideButton) guideButton.addEventListener('click', () => openExerciseGuide(ex));
    if (ex.images?.length || library.exerciseGuide(ex)) {
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
        entry.userEdited = true;
        set.weightKg = weightInput.value;
        lbsInput.value = weightInput.value ? round1(Number(weightInput.value) * KG_TO_LBS) : '';
        persistActiveSession();
      });
      lbsInput.addEventListener('input', () => {
        entry.userEdited = true;
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
          entry.userEdited = true;
          set.reps = repsInput.value;
          resetVoiceRepTarget(set);
          persistActiveSession();
        });
      }

      checkBtn.addEventListener('click', () => {
        setWorkoutSetCompletion(entry, set, ex, idx, !set.completed);
        checkBtn.classList.toggle('checked', set.completed);
        tr.classList.toggle('completed', set.completed);
        updateProgress();
        card.classList.toggle('done', entry.sets.every((s) => s.completed));
        if (ex.inputType === 'hold') renderWorkoutTab();
      });

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    const tableWrap = document.createElement('div');
    tableWrap.className = 'set-table-wrap';
    tableWrap.appendChild(table);
    card.appendChild(tableWrap);
    const notes = document.createElement('details');
    notes.className = 'set-notes';
    notes.innerHTML = `<summary>הערות לסטים (רשות)</summary>${entry.sets.map((set, index) =>
      `<label class="training-field"><span><span>סט</span> ${index + 1}</span><input class="input" data-note-set="${index}" data-no-translate
        type="text" maxlength="500" value="${escapeAttr(set.notes || '')}"></label>`).join('')}`;
    qsa('[data-note-set]', notes).forEach((input) => input.addEventListener('input', () => {
      entry.sets[Number(input.dataset.noteSet)].notes = input.value;
      entry.userEdited = true;
      persistActiveSession();
    }));
    card.appendChild(notes);

    const actions = document.createElement('div');
    actions.className = 'set-row-actions';
    const isBlank = entry.sets.every((s) => !s.completed && !s.weightKg && !s.reps);
    const lastVals = lastByExercise[ex.id];
    actions.innerHTML = `
      <button class="btn btn-secondary btn-small btnAddSet">+ סט</button>
      <button class="btn btn-secondary btn-small btnRemoveSet">- סט</button>
      ${isBlank && lastVals ? '<button class="btn btn-secondary btn-small btnRestoreLast">↺ שחזר מאימון קודם</button>' : ''}
    `;
    qs('.btnAddSet', actions).addEventListener('click', () => {
      entry.sets.push({ weightKg: entry.sets.at(-1)?.weightKg || '', reps: entry.sets.at(-1)?.reps || '', completed: false });
      activeSession.activityControlRevision = (activeSession.activityControlRevision || 0) + 1;
      persistActiveSession();
      renderWorkoutTab();
    });
    qs('.btnRemoveSet', actions).addEventListener('click', () => {
      removeLastWorkoutSet(entry);
    });
    const restoreBtn = qs('.btnRestoreLast', actions);
    if (restoreBtn) {
      restoreBtn.addEventListener('click', () => {
        entry.sets.forEach((s) => { s.weightKg = lastVals.weightKg; s.reps = lastVals.reps; resetVoiceRepTarget(s); });
        persistActiveSession();
        renderWorkoutTab();
        showToast('הערכים משוחזרים מהאימון הקודם');
      });
    }
    card.appendChild(actions);

    configureWorkoutCard(card, entry, entryIndex);
    list.appendChild(card);
  });

  updateProgress();
  refreshVoiceSelection();
  syncWorkoutActivity();
}

function configureWorkoutCard(card, entry, index) {
  const head = card.querySelector('.exercise-card-head');
  const content = document.createElement('div');
  content.className = 'workout-card-content';
  content.id = `workout-card-content-${index}`;
  for (const child of Array.from(card.children)) if (child !== head) content.appendChild(child);
  card.appendChild(content);
  const summary = document.createElement('p');
  summary.className = 'workout-card-summary';
  head.querySelector('.exercise-name').parentElement.appendChild(summary);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'workout-card-toggle';
  toggle.setAttribute('aria-controls', content.id);
  const update = () => {
    const expanded = expandedWorkoutExercises.has(entry.exerciseId);
    toggle.textContent = expanded ? '−' : '+';
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', `${i18n.text(expanded ? 'מזעור התרגיל' : 'פתיחת התרגיל')}: ${i18n.exerciseName(entry.exerciseName)}`);
    card.classList.toggle('is-collapsed', !expanded);
    content.hidden = !expanded;
  };
  toggle.addEventListener('click', () => {
    if (expandedWorkoutExercises.has(entry.exerciseId)) expandedWorkoutExercises.delete(entry.exerciseId);
    else expandedWorkoutExercises.add(entry.exerciseId);
    update();
  });
  head.appendChild(toggle);
  update();
}

function removeLastWorkoutSet(entry) {
  if (entry.sets.length <= 1) return;
  const set = entry.sets.at(-1);
  const key = `${entry.exerciseId}:${entry.sets.length - 1}`;
  const timer = holdTimers.get(key);
  if ((set.completed || set.weightKg || set.reps || set.notes || timer || set.resumeAfterPause || set.holdElapsedSec > 0)
    && !confirm(i18n.text('בסט האחרון יש נתונים או מדידה פעילה. למחוק את הסט הזה?'))) return;
  if (timer) { clearInterval(timer.intervalId); holdTimers.delete(key); }
  if (voiceCountingState?.set === set) {
    voiceCountingState = null;
    updateVoiceBadgeForListeningState();
  }
  if (lastVoiceAction?.set === set) lastVoiceAction = null;
  entry.sets.pop();
  activeSession.activityControlRevision = (activeSession.activityControlRevision || 0) + 1;
  if (activeSession.lastCompletedSet?.exerciseId === entry.exerciseId
    && activeSession.lastCompletedSet.setIndex >= entry.sets.length) delete activeSession.lastCompletedSet;
  persistActiveSession();
  renderWorkoutTab();
}

function openWorkoutRemovalDialog(exerciseId, restore = false) {
  const entry = restore ? activeSession.removedExercises?.find((item) => item.entry.exerciseId === exerciseId)?.entry
    : activeSession.entries.find((item) => item.exerciseId === exerciseId);
  if (!entry) { showToast('התרגיל השתנה. פתח שוב את הפעולה.'); return; }
  const dialog = openTrainingDialog(restore ? 'ביטול הסרת תרגיל' : 'הסרת תרגיל מהאימון הנוכחי', `
    <p data-no-translate>${escapeHtml(i18n.exerciseName(entry.exerciseName))}</p>
    <p>השינוי חל רק על האימון הנוכחי. התוכנית הקבועה, התוכניות השמורות וההיסטוריה הקיימת אינן משתנות.</p>
    <p>תרגיל שהוסר אינו נכלל ביעדים ובאחוזים. סטים שהושלמו יישמרו בהיסטוריה; שאר הנתונים נשמרים לביטול ההסרה במהלך האימון.</p>
    ${activeSession.running ? '<p>האימון יושהה לפני השינוי כדי לשמור ספירה וטיימרים. אפשר להמשיך אותו לאחר מכן.</p>' : ''}
    <button class="btn btn-primary btnConfirmWorkoutRemoval">${restore ? 'אישור ביטול ההסרה' : 'אישור הסרה מהאימון הנוכחי'}</button>`);
  qs('.btnConfirmWorkoutRemoval', dialog).addEventListener('click', () => {
    try {
      trainingAPI().changeWorkoutRemoval(exerciseId, restore);
      dialog.close();
    } catch (error) {
      console.error('Workout exercise removal failed', error);
      const message = qs('.training-dialog-error', dialog);
      message.textContent = i18n.text('לא ניתן לשנות את ההסרה. הנתונים נשמרו; סגור ופתח שוב את הפעולה.');
      message.classList.remove('hidden');
    }
  });
}

function setWorkoutSetCompletion(entry, set, exercise, index, completed) {
  const previousSet = { ...set };
  const previousMarker = activeSession.lastCompletedSet;
  const previousRevision = activeSession.activityControlRevision;
  const previousFocus = activeSession.currentExerciseId;
  const timerKey = `${entry.exerciseId}:${index}`;
  const timer = exercise.inputType === 'hold' ? holdTimers.get(timerKey) : null;
  set.completed = completed;
  if (!completed) delete set.difficulty;
  if (exercise.inputType === 'hold') {
    if (timer) {
      set.reps = Math.round((Date.now() - timer.startedAt) / 1000);
    }
    if (completed && set.resumeAfterPause) set.reps = Math.round(set.holdElapsedSec || 0);
    if (completed && (set.reps === '' || set.reps == null)) set.reps = exercise.holdSeconds || 15;
    delete set.holdStartedAt;
    delete set.holdAnnounced;
    delete set.holdElapsedSec;
    delete set.resumeAfterPause;
  }
  rememberCompletedSet(entry, set);
  try {
    persistActiveSession();
  } catch (error) {
    for (const key of Object.keys(set)) delete set[key];
    Object.assign(set, previousSet);
    if (previousMarker === undefined) delete activeSession.lastCompletedSet;
    else activeSession.lastCompletedSet = previousMarker;
    if (previousRevision === undefined) delete activeSession.activityControlRevision;
    else activeSession.activityControlRevision = previousRevision;
    if (previousFocus === undefined) delete activeSession.currentExerciseId;
    else activeSession.currentExerciseId = previousFocus;
    refreshVoiceSelection();
    updateVoiceBadgeForListeningState();
    throw error;
  }
  if (timer) {
    clearInterval(timer.intervalId);
    holdTimers.delete(timerKey);
  }
  if (voiceCountingState?.entry === entry && voiceCountingState.set === set) {
    voiceCountingState = null;
    updateVoiceBadgeForListeningState();
  }
  if (completed) {
    ensureWorkoutStarted();
    startRestTimer(exercise, entry.sets.every((set) => set.completed), nextEntryName(entry));
  }
}

function getWorkoutSetProgress() {
  const strengthEntries = activeSession.entries.filter((e) => e.type !== 'cardio');
  const total = strengthEntries.reduce((a, e) => a + e.sets.length, 0);
  const done = strengthEntries.reduce((a, e) => a + e.sets.filter((s) => s.completed).length, 0);
  const cardio = activeSession.entries.filter((entry) => entry.type === 'cardio');
  const units = strengthEntries.reduce((sum, entry) => sum + Math.max(1, entry.sets.length), 0) + cardio.length;
  const completed = done + cardio.filter((entry) => entry.completed).length;
  const percent = units ? completed === units ? 100 : Math.min(99, Math.round(completed / units * 100)) : 0;
  return { total, done, percent, setPercent: total ? done === total ? 100 : Math.min(99, Math.round(done / total * 100)) : 0 };
}

function cardioCompletionMessage(entry) {
  const message = entry.exerciseId === 'warmup' ? 'החימום הסתיים'
    : entry.exerciseId === 'cooldown' ? 'השחרור הסתיים' : `התרגיל ${entry.exerciseName} הסתיים`;
  return `${message}. ${getWorkoutSetProgress().percent} אחוז מהאימון הושלמו`;
}

function scheduleWorkoutAutoFinish() {
  const session = activeSession;
  const complete = () => (session.running || session.paused) && session.entries.length > 0
    && session.entries.every(isEntryDone);
  if (!complete() || pendingWorkoutAutoFinish === session || finishingWorkout) return;
  pendingWorkoutAutoFinish = session;
  // Let the completion handler finish persisting voice ratings/targets first.
  queueMicrotask(() => {
    if (pendingWorkoutAutoFinish !== session) return;
    pendingWorkoutAutoFinish = null;
    if (activeSession !== session || !complete() || privacyErasing) return;
    try {
      finishWorkout();
    } catch (error) {
      console.error('Automatic workout save failed', error);
      showToast(workouts.some((workout) => workout.id === session.id)
        ? 'האימון נשמר בהיסטוריה, אך סגירת מסך האימון נכשלה. בדוק את ההיסטוריה לפני ניסיון נוסף.'
        : 'השמירה האוטומטית נכשלה. נתוני האימון נשמרו במסך; לחץ על סיום אימון כדי לנסות שוב.');
    }
  });
}

function updateProgress() {
  refreshWorkoutMuscleHeadings();
  if (typeof trainingUI !== 'undefined') trainingUI?.refresh();
  const strengthEntries = activeSession.entries.filter((e) => e.type !== 'cardio');
  const { total, done, percent: pct, setPercent } = getWorkoutSetProgress();
  const progressEntries = strengthEntries.length ? strengthEntries : activeSession.entries.filter((entry) => entry.type === 'cardio');
  el('setsProgressText').textContent = total || !activeSession.entries.length ? `${done} / ${total} סטים הושלמו (${setPercent}%)`
    : i18n.text(`${progressEntries.filter((entry) => entry.completed).length} / ${progressEntries.length} מקטעי אירובי הושלמו (${pct}%)`);
  el('setsProgressFill').style.width = `${total ? setPercent : pct}%`;

  const totalEx = activeSession.entries.length;
  const doneEx = activeSession.entries.filter((e) => e.type === 'cardio' ? e.completed : e.sets.length && e.sets.every((s) => s.completed)).length;
  const exPct = totalEx ? doneEx === totalEx ? 100 : Math.min(99, Math.round(doneEx / totalEx * 100)) : 0;
  el('exProgressText').textContent = `${doneEx} / ${totalEx} תרגילים הושלמו (${exPct}%)`;
  el('exProgressFill').style.width = `${exPct}%`;

  // Cardio contributes one unit; 100% requires every planned activity.
  el('overallProgressBadge').textContent = `${pct}%`;
  el('workoutQuickPercent').textContent = `${pct}%`;
  refreshDifficultyFeedback();
  scheduleWorkoutAutoFinish();
}

function refreshDifficultyFeedback() {
  qsa('#exerciseList .exercise-card[data-entry-index]').forEach((card) => {
    const entry = activeSession.entries[Number(card.dataset.entryIndex)];
    if (!entry || entry.type === 'cardio') return;
    let feedback = qs('.set-feedback', card);
    if (!feedback) {
      feedback = document.createElement('div');
      feedback.className = 'set-feedback';
      card.appendChild(feedback);
    }
    const completed = entry.sets.map((set, index) => ({ set, index })).filter(({ set }) => set.completed);
    const key = JSON.stringify(completed.map(({ set, index }) => [index, set.difficulty || '']));
    if (feedback.dataset.completionKey === key) return;
    feedback.dataset.completionKey = key;
    feedback.classList.toggle('hidden', !completed.length);
    feedback.innerHTML = completed.length ? `<div class="field-label">איך היה? אפשר לדלג</div>
      ${completed.map(({ set, index }) => `<div class="set-feedback-row" role="group" aria-label="סט ${index + 1}">
        <span>סט ${index + 1}</span>${Object.entries(insights.DIFFICULTY_LABELS).map(([value, label]) =>
          `<button class="btn btn-secondary btn-small difficulty-chip" data-set="${index}" data-difficulty="${value}"
            aria-pressed="${set.difficulty === value}">${label}</button>`).join('')}</div>`).join('')}` : '';
    qsa('.difficulty-chip', feedback).forEach((button) => button.addEventListener('click', () => {
      const set = entry.sets[Number(button.dataset.set)];
      if (set.difficulty === button.dataset.difficulty) delete set.difficulty;
      else set.difficulty = button.dataset.difficulty;
      persistActiveSession();
      qsa('.difficulty-chip', button.parentElement).forEach((chip) =>
        chip.setAttribute('aria-pressed', String(chip.dataset.difficulty === set.difficulty)));
    }));
  });
}

function intervalPhaseText(phase) {
  const label = i18n.text({ warmup: 'חימום בהליכה', work: 'קפיצה', recovery: 'התאוששות בהליכה או בעמידה', cooldown: 'שחרור בהליכה', done: 'האימון הושלם' }[phase.kind]);
  return phase.round ? `${i18n.text('סבב')} ${phase.round} / ${phase.rounds} · ${label}` : label;
}

function renderCardioCard(entry, number) {
  const card = document.createElement('div');
  const ex = exercises.find((e) => e.id === entry.exerciseId) || {};
  const mediaExercise = entry.exerciseSnapshot || ex;
  const info = library.exerciseGuide(mediaExercise);
  const hasGuide = !!info;
  const activityOnly = info?.activityOnly === true;
  const treadmillAvailable = !info || ['walk', 'jog'].includes(info.pose) || entry.location === 'treadmill';
  card.className = 'exercise-card' + (entry.completed ? ' done' : '');
  const minutes = Math.round(entry.durationSec / 6) / 10;
  const fullDurationSec = entry.intervals ? trainingTools.ropeIntervalSchedule(entry.intervals).reduce((total, phase) => total + phase.seconds, 0)
    : (ex.durationMinutes || 5) * 60;
  const interval = entry.intervals && trainingTools.cardioIntervalPhase(entry, Date.now());
  card.innerHTML = `
    <div class="exercise-card-head">
      <div style="display:flex;gap:8px;align-items:flex-start;">
        <span class="exercise-num">${number}</span>
        <div>
          <div class="exercise-name" data-no-translate data-exercise-name="${escapeAttr(entry.exerciseName)}">${escapeHtml(i18n.exerciseName(entry.exerciseName))}</div>
          <div class="exercise-meta">${activityOnly ? 'תרגול לפי זמן' : entry.exerciseId === 'warmup' || entry.exerciseId === 'cooldown' ? 'הליכה' : 'אירובי'} ${minutes} דקות</div>
          <div class="exercise-head-right">
            <button class="btn-photo btnRemoveWorkoutExercise">הסר תרגיל</button>
            ${hasGuide ? '<button class="btn-photo btnExerciseGuide">הדרכה</button>' : ''}
            ${hasGuide || mediaExercise.images?.length ? '<button class="btn-photo btnShowPhoto">📷 תמונה</button>' : ''}
          </div>
        </div>
      </div>
    </div>
    <div class="cardio-body">
      ${interval ? `<div class="rope-phase" role="status" data-no-translate><strong id="rope-phase-${entry.exerciseId}">${escapeHtml(intervalPhaseText(interval))}</strong>
        <span id="rope-remaining-${entry.exerciseId}">${formatHMS(interval.remainingSeconds)}</span></div>` : ''}
      <div class="cardio-timer-display" id="cardio-remaining-${entry.exerciseId}">${formatHMS(Math.max(0, entry.durationSec - (entry.elapsedSec || 0) - (entry.startedAt ? (Date.now() - entry.startedAt) / 1000 : 0)))}</div>
      <div class="cardio-pace-row">
        <select class="select cardioLocation">
          <option value="" ${!entry.location ? 'selected' : ''}>מיקום (לא צויין)</option>
          ${treadmillAvailable ? `<option value="treadmill" ${entry.location === 'treadmill' ? 'selected' : ''}>🏃 הליכון</option>` : ''}
          <option value="gym" ${entry.location === 'gym' ? 'selected' : ''}>חדר כושר</option>
          <option value="outside" ${entry.location === 'outside' ? 'selected' : ''}>🌳 בחוץ</option>
          <option value="home" ${entry.location === 'home' ? 'selected' : ''}>🏠 בבית</option>
        </select>
        <input class="input cardioPace" type="text" placeholder="${activityOnly ? 'הערות לתרגול (רשות)' : 'קצב/מהירות (לדוגמה: מהירות 6 ~10 קמ&quot;ש)'}" value="${escapeHtml(entry.pace || '')}">
      </div>
      <div class="settings-actions">
        <button class="btn btn-secondary btn-small btnCardioStart">${entry.startedAt && !entry.completed ? '⏸ עצור' : '▶ התחל'}</button>
        <button class="btn btn-secondary btn-small btnCardioReset">↺ איפוס</button>
        <button class="btn btn-small ${entry.completed ? 'btn-primary' : 'btn-secondary'} btnCardioDone">${entry.completed ? '✓ בוצע' : 'סמן כבוצע'}</button>
      </div>
    </div>
  `;
  if (hasGuide) qs('.btnExerciseGuide', card).addEventListener('click', () => openExerciseGuide(mediaExercise));
  qs('.btnRemoveWorkoutExercise', card).addEventListener('click', () => openWorkoutRemovalDialog(entry.exerciseId));
  if (hasGuide || mediaExercise.images?.length) qs('.btnShowPhoto', card).addEventListener('click', () => openPhotoModal(mediaExercise));
  qs('.cardioLocation', card).addEventListener('change', (e) => {
    entry.userEdited = true;
    entry.location = e.target.value;
    persistActiveSession();
  });
  i18n.localizeInput(qs('.cardioPace', card), entry.pace || '');
  qs('.cardioPace', card).addEventListener('input', (e) => {
    entry.userEdited = true;
    entry.pace = i18n.inputValue(e.target);
    persistActiveSession();
  });
  qs('.btnCardioStart', card).addEventListener('click', () => {
    if (activeSession.paused) { showToast('לחץ על המשך אימון לפני הפעלת טיימר.'); return; }
    if (entry.startedAt && !entry.completed) {
      const elapsed = (Date.now() - entry.startedAt) / 1000;
      entry.elapsedSec = Math.min(entry.durationSec, (entry.elapsedSec || 0) + elapsed);
      entry.startedAt = null;
    } else {
      ensureWorkoutStarted();
      restTimer.stop();
      el('restOverlay').classList.add('hidden');
      if (entry.completed) entry.elapsedSec = 0;
      entry.completed = false;
      if ((entry.elapsedSec || 0) === 0) delete entry.intervalPhaseIndex;
      entry.startedAt = Date.now();
    }
    persistActiveSession();
    renderWorkoutTab();
  });
  qs('.btnCardioReset', card).addEventListener('click', () => {
    delete entry.resumeAfterPause;
    entry.durationSec = fullDurationSec;
    entry.elapsedSec = 0;
    entry.startedAt = null;
    entry.completed = false;
    delete entry.intervalPhaseIndex;
    persistActiveSession();
    renderWorkoutTab();
  });
  qs('.btnCardioDone', card).addEventListener('click', () => {
    delete entry.resumeAfterPause;
    entry.completed = !entry.completed;
    if (entry.completed) advanceWorkoutFocus(entry);
    if (entry.completed) ensureWorkoutStarted();
    entry.elapsedSec = entry.completed ? entry.durationSec : 0;
    entry.startedAt = null;
    persistActiveSession();
    renderWorkoutTab();
    if (entry.completed && settings.voiceAnnouncements && !activeSession.paused) {
      cancelWorkoutGreeting();
      speak(cardioCompletionMessage(entry));
    }
  });
  return card;
}

function tickCardioTimers() {
  if (!activeSession) return;
  let needsRerender = false;
  activeSession.entries.forEach((entry) => {
    if (entry.type !== 'cardio' || !entry.startedAt || entry.completed) return;
    const remaining = entry.durationSec - (entry.elapsedSec || 0) - (Date.now() - entry.startedAt) / 1000;
    const span = el(`cardio-remaining-${entry.exerciseId}`);
    if (entry.intervals) {
      const phase = trainingTools.cardioIntervalPhase(entry, Date.now());
      const label = el(`rope-phase-${entry.exerciseId}`);
      const display = el(`rope-remaining-${entry.exerciseId}`);
      const text = intervalPhaseText(phase);
      if (label && label.textContent !== text) label.textContent = text;
      if (display) {
        const time = formatHMS(phase.remainingSeconds);
        if (display.textContent !== time) display.textContent = time;
      }
      if (phase.kind !== 'done' && phase.index !== entry.intervalPhaseIndex) {
        entry.intervalPhaseIndex = phase.index;
        persistActiveSession();
        if (phase.index > 0) playBeep();
        if (settings.voiceAnnouncements) speak(text, i18n.locale(), `rope:${entry.exerciseId}:${entry.startedAt}:${phase.index}`);
      }
    }
    if (remaining <= 0) {
      const announcementID = `cardio:${entry.exerciseId}:${entry.startedAt}`;
      entry.completed = true;
      entry.elapsedSec = entry.durationSec;
      entry.startedAt = null;
      advanceWorkoutFocus(entry);
      persistActiveSession();
      playBeep();
      const msg = cardioCompletionMessage(entry);
      if (settings.voiceAnnouncements) speak(msg, i18n.locale(), announcementID);
      showToast(`${msg} ✅`);
      notify('AutoFit', msg);
      const index = activeSession.entries.indexOf(entry);
      const previous = qs(`.exercise-card[data-entry-index="${index}"]`, el('exerciseList'));
      if (previous) {
        const replacement = renderCardioCard(entry, Number(previous.dataset?.workoutNumber) || index + 1);
        replacement.dataset.entryIndex = index;
        replacement.dataset.workoutNumber = previous.dataset?.workoutNumber || index + 1;
        configureWorkoutCard(replacement, entry, index);
        previous.replaceWith(replacement);
      }
      needsRerender = true;
    } else if (span) {
      const text = formatHMS(remaining);
      if (span.textContent !== text) span.textContent = text;
    }
  });
  if (needsRerender) {
    updateProgress();
    refreshVoiceSelection();
    syncWorkoutActivity();
  }
}

/* ---- hold-type (e.g. plank) per-set timer: start -> counts up -> beeps/announces at
   the target duration so the trainee knows when to stop -> stop records the achieved
   duration, auto-checks the set, and kicks off the normal rest timer for the next rep ---- */
function startHoldTicking(display, state, target, set, key) {
  return setInterval(() => {
    const elapsed = (Date.now() - state.startedAt) / 1000;
    const text = formatHMS(elapsed);
    if (display.textContent !== text) display.textContent = text;
    if (elapsed >= target && !state.announced) {
      state.announced = true;
      set.holdAnnounced = true;
      persistActiveSession();
      display.classList.add('reached');
      playBeep();
      if (settings.voiceAnnouncements) speak(`${target} שניות הושלמו, אפשר לעצור`, i18n.locale(), `hold:${key}:${state.startedAt}`);
      notify('AutoFit', `${target} שניות הושלמו — אפשר לעצור`);
    }
  }, 250);
}
function renderHoldCell(td, ex, entry, set, idx, onAutoComplete) {
  const key = `${entry.exerciseId}:${idx}`;
  if (set.completed) {
    const state = holdTimers.get(key);
    if (state) { clearInterval(state.intervalId); holdTimers.delete(key); }
    const achieved = set.reps === '' || set.reps == null ? ex.holdSeconds || 15 : set.reps;
    td.innerHTML = `<div class="hold-timer-cell"><span class="hold-result">${escapeHtml(String(achieved))} שנ'</span><button class="hold-reset" title="מדוד שוב">↺</button></div>`;
    qs('.hold-reset', td).addEventListener('click', () => {
      set.completed = false;
      delete set.difficulty;
      rememberCompletedSet(entry, set);
      set.reps = '';
      delete set.holdStartedAt;
      delete set.holdAnnounced;
      delete set.holdElapsedSec;
      delete set.resumeAfterPause;
      persistActiveSession();
      renderWorkoutTab();
    });
    return;
  }
  const target = ex.holdSeconds || 15;
  if (!holdTimers.has(key) && Number.isFinite(set.holdStartedAt) && set.holdStartedAt > 0) {
    holdTimers.set(key, { startedAt: set.holdStartedAt, announced: !!set.holdAnnounced, intervalId: null });
  }
  const existing = holdTimers.get(key);
  const running = !!existing;
  td.innerHTML = `<div class="hold-timer-cell"><span class="hold-timer-display">${running ? formatHMS((Date.now() - existing.startedAt) / 1000) : formatHMS(set.holdElapsedSec || 0)}</span><button class="btn-hold-toggle${running ? ' running' : ''}">${running ? '⏹ עצור' : '▶ התחל'}</button></div>`;
  const display = qs('.hold-timer-display', td);
  const btn = qs('.btn-hold-toggle', td);
  if (existing) {
    clearInterval(existing.intervalId); // old interval pointed at now-detached DOM — rebind to the fresh element
    existing.intervalId = startHoldTicking(display, existing, target, set, key);
  }
  btn.addEventListener('click', () => {
    if (activeSession.paused) { showToast('לחץ על המשך אימון לפני הפעלת טיימר.'); return; }
    const state = holdTimers.get(key);
    if (state) {
      clearInterval(state.intervalId);
      holdTimers.delete(key);
      set.reps = Math.round((Date.now() - state.startedAt) / 1000);
      set.completed = true;
      rememberCompletedSet(entry, set);
      delete set.holdStartedAt;
      delete set.holdAnnounced;
      persistActiveSession();
      onAutoComplete();
      renderWorkoutTab();
    } else {
      ensureWorkoutStarted();
      restTimer.stop();
      el('restOverlay').classList.add('hidden');
      const startedAt = Date.now();
      const state = { intervalId: null, startedAt, announced: false };
      state.intervalId = startHoldTicking(display, state, target, set, key);
      holdTimers.set(key, state);
      set.holdStartedAt = startedAt;
      activeSession.activityControlRevision = (activeSession.activityControlRevision || 0) + 1;
      set.holdAnnounced = false;
      persistActiveSession();
      syncWorkoutActivity();
      btn.textContent = '⏹ עצור';
      btn.classList.add('running');
    }
  });
}

function isEntryDone(entry) {
  return entry.type === 'cardio' ? !!entry.completed : entry.sets.length > 0 && entry.sets.every((s) => s.completed);
}

// Finds the name of the next NOT-YET-COMPLETED exercise after `entry` in the list,
// skipping over any that are already done (e.g. when the user isn't working strictly
// in order), so the rest-timer announcement always names the actual upcoming exercise.
function nextEntryName(entry) {
  return nextWorkoutEntry(entry)?.exerciseName || null;
}

function nextWorkoutEntry(entry) {
  if (!activeSession.entries.includes(entry)) return null;
  return trainingTools.nextAvailableWorkoutEntry(activeSession, entry, exercises);
}

function workoutRestContinuation(session = activeSession) {
  const entry = session.entries.find((item) => item.exerciseId === session.restCueExerciseId);
  const next = entry && !isEntryDone(entry) && !entry.equipmentBusy ? entry
    : trainingTools.nextAvailableWorkoutEntry(session, entry, exercises);
  if (next) return trainingTools.workoutEntryAnnouncement(next, exercises, i18n.text, i18n.exerciseName);
  return session.entries.some((item) => !isEntryDone(item))
    ? i18n.text('נותרו תרגילים שממתינים לציוד או להשלמה. אפשר לבחור תרגיל זמין או לסמן שהמכשיר התפנה.')
    : i18n.text('האימון הושלם, כל הכבוד!');
}

/* ---------------- Voice commands: Hebrew number parsing ---------------- */
// Apple's recognizer sometimes emits spoken numbers as literal digits and
// sometimes as Hebrew words — handle both. Covers 0-39 (more than enough for
// a set's rep count); longest phrase wins so "עשרים ואחת" doesn't get cut
// short by the standalone "אחת" entry.
const HE_NUM_WORDS = {
  'אפס': 0, 'אחת': 1, 'אחד': 1, 'שתיים': 2, 'שניים': 2, 'שתים': 2, 'שנים': 2,
  'שלוש': 3, 'שלושה': 3, 'ארבע': 4, 'ארבעה': 4, 'חמש': 5, 'חמישה': 5,
  'שש': 6, 'שישה': 6, 'שבע': 7, 'שבעה': 7, 'שמונה': 8, 'תשע': 9, 'תשעה': 9,
  'עשר': 10, 'עשרה': 10,
  'אחת עשרה': 11, 'אחד עשר': 11, 'שתים עשרה': 12, 'שנים עשר': 12, 'שתיים עשרה': 12, 'שניים עשר': 12,
  'שלוש עשרה': 13, 'שלושה עשר': 13, 'ארבע עשרה': 14, 'ארבעה עשר': 14,
  'חמש עשרה': 15, 'חמישה עשר': 15, 'שש עשרה': 16, 'שישה עשר': 16,
  'שבע עשרה': 17, 'שבעה עשר': 17, 'שמונה עשרה': 18, 'שמונה עשר': 18,
  'תשע עשרה': 19, 'תשעה עשר': 19,
  'עשרים': 20, 'שלושים': 30,
};
function parseSpokenNumber(text) {
  const words = normalizeVoiceText(text).split(' ');
  let last = null;
  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    if (word.startsWith('ו') && HE_NUM_WORDS[word.slice(1)] !== undefined) word = word.slice(1);
    if (/^\d+$/.test(word)) { last = Number(word); continue; }
    const pair = `${word} ${words[i + 1] || ''}`;
    if (HE_NUM_WORDS[pair] !== undefined) {
      last = HE_NUM_WORDS[pair];
      i++;
    } else if (word === 'עשרים' || word === 'שלושים') {
      last = HE_NUM_WORDS[word];
      const unit = HE_NUM_WORDS[(words[i + 1] || '').replace(/^ו/, '')];
      if (unit > 0 && unit < 10) { last += unit; i++; }
    } else if (HE_NUM_WORDS[word] !== undefined) {
      last = HE_NUM_WORDS[word];
    }
  }
  return last;
}

// Decode joined ascending counts ("123" -> third rep), not explicit performance reports.
function parseSpokenRepCount(text, previous = 0) {
  const normalized = normalizeVoiceText(text);
  const digits = /^\d+(?: \d+)*$/.test(normalized) ? normalized.replace(/ /g, '') : '';
  if (digits.length >= 2) {
    let sequence = '';
    for (let count = 1; count <= 100; count++) {
      sequence += count;
      if (sequence === digits) {
        if (normalized === '12' && previous > 2) return 12;
        return Math.max(previous, count);
      }
      if (!digits.startsWith(sequence)) break;
    }
  }
  return parseSpokenNumber(text);
}

function normalizeVoiceText(text) {
  return i18n.canonicalVoice(text || '').normalize('NFKC').toLowerCase().replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
}

/* ---------------- Voice commands: phrase classification ---------------- */
// Order matters: more specific phrases (containing "אימון") are checked before
// the short generic forms ("סיימתי"/"הסתיים" alone) used while counting reps.
function classifyVoiceCommand(text) {
  const t = normalizeVoiceText(text);
  if (!t) return null;
  if (/^(בטל|ביטול)( את)? ה?אימון$/.test(t)) return 'cancelWorkout';
  if (/^(סיים|סיום|סיימתי)( את)? ה?אימון$/.test(t)) return 'finishWorkout';
  if (/^(התחל|תתחיל|מתחיל)( את)? ה?אימון$/.test(t)) return 'startWorkout';
  if (/^(התחל|תתחיל|מתחיל|נספור|לספור)( את)? ה?סט$/.test(t)) return 'startSet';
  if (/^(התחל|תתחיל|מתחיל)( (את )?ה?תרגיל)?$/.test(t)) return 'startExercise';
  if (/^(עצור|תעצור|השהה)( (את )?ה?תרגיל)?$/.test(t)) return 'stopExercise';
  if (/^(דלג( על)? (זמן )?ה?מנוחה|זמן ה?מנוחה (הסתיים|נגמר)|ה?מנוחה (הסתיימה|נגמרה))$/.test(t)) return 'skipRest';
  if (/^ה?תרגיל הבא$/.test(t)) return 'nextExercise';
  if (/^(ה?סט (הושלם|הסתיים|בוצע|הבא)|סיימתי( את)? ה?סט|סיימתי|הסתיים|סיום)$/.test(t)) return 'setDone';
  if (/^חזרה (אחת|ראשונה|שנייה|\d+) הסתיימה$/.test(t)) return 'setDone';
  if (t === 'בטל') return 'undo';
  return null;
}

/* ---------------- Voice commands dispatch ---------------- */
// Keep model references: rendering the cards must not break voice undo.
let lastVoiceAction = null;
let lastVoiceReport = null;
let pendingVoiceFinish = null;
let lastAutoCountCompletion = null;
let voiceReportInProgress = false;
// Keep the configured goal separate from the live reps written into the set.
let voiceCountingState = null;

function voiceRepTarget(set, exercise) {
  const value = set.voiceTargetReps ?? (set.reps === '' || set.reps == null ? exercise?.defaultReps : set.reps);
  const target = /^\d+$/.test(String(value)) ? Number(value) : null;
  return Number.isSafeInteger(target) && target > 0 ? target : null;
}

function resetVoiceRepTarget(set) {
  delete set.voiceTargetReps;
  if (voiceCountingState?.set !== set) return;
  const exercise = voiceCountingState.entry.exerciseSnapshot || exercises.find((item) => item.id === voiceCountingState.entry.exerciseId);
  voiceCountingState.targetReps = voiceRepTarget(set, exercise);
  if (voiceCountingState.targetReps) set.voiceTargetReps = voiceCountingState.targetReps;
  updateVoiceCountingBadge();
}

function rememberCompletedSet(entry, set) {
  activeSession.activityControlRevision = (activeSession.activityControlRevision || 0) + 1;
  const setIndex = entry.sets.indexOf(set);
  if (set.completed && setIndex >= 0) {
    activeSession.lastCompletedSet = { exerciseId: entry.exerciseId, setIndex };
    advanceWorkoutFocus(entry);
  } else if (activeSession.lastCompletedSet?.exerciseId === entry.exerciseId
    && activeSession.lastCompletedSet.setIndex === setIndex) {
    delete activeSession.lastCompletedSet;
  }
}

function advanceWorkoutFocus(entry) {
  const paired = entry.exerciseSnapshot?.superset && trainingTools.supersetNextEntry(activeSession, entry);
  if (paired && (!activeSession.currentExerciseId || activeSession.currentExerciseId === entry.exerciseId)) {
    activeSession.currentExerciseId = paired.exerciseId;
    refreshVoiceSelection();
    updateVoiceBadgeForListeningState();
    return;
  }
  if (!isEntryDone(entry) || activeSession.currentExerciseId && activeSession.currentExerciseId !== entry.exerciseId) return;
  const remaining = nextWorkoutEntry(entry);
  if (remaining) activeSession.currentExerciseId = remaining.exerciseId;
  else delete activeSession.currentExerciseId;
  refreshVoiceSelection();
  updateVoiceBadgeForListeningState();
}

function lastCompletedVoiceSet() {
  const marker = activeSession.lastCompletedSet;
  const entry = marker && activeSession.entries.find((item) => item.exerciseId === marker.exerciseId);
  const set = entry?.sets?.[marker.setIndex];
  return set?.completed ? { entry, set } : null;
}

function voiceReply(message) {
  setVoiceBadge(`🎙️ ${message}`);
  showToast(`🎙️ ${message}`);
  if (settings.voiceAnnouncements) speak(message);
}

function voiceRestSnapshot() {
  return restTimer.isRunning() && restTimer.endAt > Date.now() ? {
    endAt: restTimer.endAt, totalSeconds: restTimer.totalSeconds,
    lastAnnouncedElapsed: restTimer.lastAnnouncedElapsed, intervalId: restTimer.intervalId,
    exerciseName: el('restExerciseName').dataset?.exerciseName || el('restExerciseName').textContent,
    doneMessage: restDoneMessage,
  } : null;
}

function voiceRestUnchanged(snapshot) {
  return snapshot && restTimer.isRunning() && restTimer.endAt === snapshot.endAt
    && restTimer.totalSeconds === snapshot.totalSeconds && restTimer.intervalId === snapshot.intervalId;
}

function restoreVoiceRest(snapshot) {
  restDoneMessage = snapshot.doneMessage;
  el('restExerciseName').setAttribute('data-exercise-name', snapshot.exerciseName);
  el('restExerciseName').textContent = i18n.exerciseName(snapshot.exerciseName);
  el('restOverlay').classList.remove('hidden');
  restTimer.restore(snapshot);
}

function undoVoiceReport() {
  const action = lastVoiceAction;
  lastVoiceAction = null;
  if (action.session !== activeSession) {
    voiceReply('אין פעולה לביטול באימון הנוכחי');
    return;
  }
  if (action.kind === 'rest') {
    if (!voiceRestUnchanged(action.restAfter)) {
      voiceReply('הנתונים השתנו מאז הדיווח. לא שיניתי אותם');
      return;
    }
    restoreVoiceRest({ ...action.restBefore,
      lastAnnouncedElapsed: Math.max(action.restBefore.lastAnnouncedElapsed, restTimer.lastAnnouncedElapsed) });
  } else {
    if (!activeSession.entries.includes(action.entry) || !action.entry.sets.includes(action.set)
      || JSON.stringify(action.set) !== action.after) {
      voiceReply('הנתונים השתנו מאז הדיווח. לא שיניתי אותם');
      return;
    }
    Object.keys(action.set).forEach((key) => { delete action.set[key]; });
    Object.assign(action.set, action.before);
    if (action.kind === 'report') {
      lastVoiceReport = null;
      if (activeSession.lastCompletedSet?.exerciseId === action.entry.exerciseId
        && activeSession.lastCompletedSet.setIndex === action.entry.sets.indexOf(action.set)) {
        if (action.previousCompleted) activeSession.lastCompletedSet = action.previousCompleted;
        else delete activeSession.lastCompletedSet;
      }
      if (voiceRestUnchanged(action.restAfter)) {
        if (action.restBefore) restoreVoiceRest(action.restBefore);
        else { restTimer.stop(); el('restOverlay').classList.add('hidden'); }
      }
    }
  }
  persistActiveSession();
  renderWorkoutTab();
  voiceReply('הדיווח הקולי האחרון בוטל');
}

function applyWorkoutVoice(intent) {
  if (intent.kind === 'invalid') {
    voiceReply('הדיווח לא ברור. אמור למשל: עשיתי 12 חזרות עם 40 קילו');
    return;
  }
  if (intent.kind === 'rest') {
    const before = voiceRestSnapshot();
    if (!before) { voiceReply('אין כרגע מנוחה פעילה להארכה'); return; }
    if (!Number.isSafeInteger(Math.round(before.endAt + intent.seconds * 1000))) {
      voiceReply('הדיווח לא ברור. אמור למשל: תוסיף חצי דקה מנוחה');
      return;
    }
    restTimer.addSeconds(intent.seconds);
    lastVoiceAction = { kind: 'rest', session: activeSession, restBefore: before, restAfter: voiceRestSnapshot() };
    voiceReply(`נוספו ${intent.seconds} שניות למנוחה`);
    return;
  }
  if (intent.kind === 'difficulty') {
    const target = lastCompletedVoiceSet();
    if (!target) { voiceReply('אין סט אחרון ברור לדירוג. סמן קודם סט כהושלם'); return; }
    const { entry, set } = target;
    if (set.difficulty !== intent.difficulty) {
      const before = { ...set };
      set.difficulty = intent.difficulty;
      persistActiveSession();
      lastVoiceAction = { kind: 'difficulty', session: activeSession, entry, set, before, after: JSON.stringify(set) };
      renderWorkoutTab();
    }
    voiceReply(`דירוג ${i18n.text(insights.DIFFICULTY_LABELS[intent.difficulty])} נרשם ל${i18n.exerciseName(entry.exerciseName)}, סט ${entry.sets.indexOf(set) + 1}`);
    return;
  }
  let entry = voiceCountingState?.entry;
  let set = voiceCountingState?.set;
  if (!entry) {
    entry = activeSession.entries.find((item) => item.exerciseId === activeSession.currentExerciseId);
    if (!entry) {
      const candidates = activeSession.entries.filter((item) => item.type !== 'cardio' && !isEntryDone(item)
        && exercises.find((exercise) => exercise.id === item.exerciseId)?.inputType !== 'hold');
      if (candidates.length === 1) entry = candidates[0];
    }
    set = entry?.sets?.find((item) => !item.completed);
  }
  if (!entry) { voiceReply('לא ברור לאיזה תרגיל לדווח. אמור קודם את שם התרגיל'); return; }
  const exercise = entry.exerciseSnapshot || exercises.find((item) => item.id === entry.exerciseId);
  if (entry.type === 'cardio' || exercise?.inputType === 'hold') {
    voiceReply('דיווח חזרות ומשקל מתאים לתרגיל חזרות, לא לאירובי או להחזקה');
    return;
  }
  if (!set || set.completed) { voiceReply('כל הסטים בתרגיל שנבחר כבר הושלמו'); return; }
  const weightKg = intent.unit === 'lbs' ? round2(intent.weight / KG_TO_LBS) : intent.weight;
  const signature = JSON.stringify([entry.exerciseId, intent.reps, weightKg, intent.difficulty]);
  if (lastVoiceReport?.session === activeSession && lastVoiceReport.signature === signature
    && activeSession.entries.includes(lastVoiceReport.entry) && lastVoiceReport.entry.sets.includes(lastVoiceReport.set)
    && lastVoiceReport.set.completed
    && Date.now() - lastVoiceReport.at >= 0 && Date.now() - lastVoiceReport.at < 2000) {
    voiceReply('הדיווח הזה כבר נרשם. לא נוסף סט נוסף');
    return;
  }
  const index = activeSession.entries.indexOf(entry);
  const setIndex = entry.sets.indexOf(set);
  const card = qs(`.exercise-card[data-entry-index="${index}"]`, el('exerciseList'));
  const row = card && qsa('.set-row', card)[setIndex];
  const button = row && qs('.set-check:not(.checked)', row);
  if (!button) { voiceReply('לא ניתן לסמן את הסט הנוכחי'); return; }
  const before = { ...set };
  const restBefore = voiceRestSnapshot();
  const previousCompleted = activeSession.lastCompletedSet ? { ...activeSession.lastCompletedSet } : null;
  set.weightKg = weightKg;
  set.reps = intent.reps;
  if (intent.difficulty) set.difficulty = intent.difficulty;
  voiceCountingState = null;
  selectVoiceExercise(index, false);
  voiceReportInProgress = true;
  try { button.click(); } finally { voiceReportInProgress = false; }
  rememberCompletedSet(entry, set);
  persistActiveSession();
  lastVoiceAction = { kind: 'report', session: activeSession, entry, set, before,
    after: JSON.stringify(set), restBefore, restAfter: voiceRestSnapshot(), previousCompleted };
  lastVoiceReport = { session: activeSession, entry, set, signature, at: Date.now() };
  renderWorkoutTab();
  const unit = i18n.text(intent.unit === 'lbs' ? 'פאונד' : 'ק"ג');
  const message = `נרשם: ${intent.reps} חזרות עם ${intent.weight} ${unit} ב${i18n.exerciseName(entry.exerciseName)}, סט ${setIndex + 1}`;
  const muscleCue = activeSession.entries.every(isEntryDone) ? '' : workoutMuscleCompletionCue();
  voiceReply(muscleCue + (intent.difficulty ? `${message}. דירוג: ${i18n.text(insights.DIFFICULTY_LABELS[intent.difficulty])}` : message));
}

function firstNotDoneEntryIndex() {
  return activeSession.entries.indexOf(trainingTools.nextAvailableWorkoutEntry(activeSession, null, exercises));
}

function voiceExerciseNames(entry) {
  const exercise = entry.exerciseSnapshot || exercises.find((item) => item.id === entry.exerciseId);
  const names = [entry.exerciseName, exercise?.name];
  names.push(...names.filter(Boolean).map((name) => i18n.text(name)));
  if (entry.exerciseId === 'warmup') names.push('חימום');
  if (entry.exerciseId === 'cooldown') names.push('שחרור', 'קירור');
  if (names.some((name) => ['פלאנק', 'פלנק'].includes(normalizeVoiceText(name)))) {
    names.push('פלאנק', 'פלנק', 'plank');
  }
  return [...new Set(names.filter(Boolean).map(normalizeVoiceText))];
}

function matchVoiceExercise(text) {
  let name = text;
  let start = false;
  const prefix = text.match(/^(?:התחל|תתחיל|מתחיל)(?: את)? (.+)$/);
  const suffix = text.match(/^(.+?) (?:התחל|תתחיל)$/);
  if (prefix || suffix) { name = (prefix || suffix)[1]; start = true; }
  const stopPrefix = text.match(/^(?:עצור|תעצור|השהה)(?: את)? (.+)$/);
  const stopSuffix = text.match(/^(.+?) (?:עצור|תעצור|השהה)$/);
  const stop = !!(stopPrefix || stopSuffix);
  if (stop) name = (stopPrefix || stopSuffix)[1];
  const selectOnly = /^(?:בחר(?: את)?|select|choose)(?: |$)/.test(name);
  name = name.replace(/^(?:ה?תרגיל|בחר את|בחר|select|choose) /, '');
  if (name.length < 2 || /^\d+$/.test(name)) return null;
  const candidates = activeSession.entries.map((entry, index) => ({ index, names: voiceExerciseNames(entry) }));
  let matches = candidates.filter((item) => item.names.includes(name));
  if (!matches.length) matches = candidates.filter((item) => item.names.some((candidate) => candidate.includes(name)));
  return matches.length ? { start, stop, selectOnly, indexes: matches.map((item) => item.index) } : null;
}

function refreshVoiceSelection() {
  const current = trainingTools.workoutHasStarted(activeSession) ? activeSession.entries[voiceTargetEntryIndex()]
    : trainingTools.currentWorkoutEntry(activeSession, exercises);
  qsa('.exercise-card[data-entry-index]', el('exerciseList')).forEach((card) => {
    card.classList.toggle('voice-selected',
      activeSession.entries[Number(card.dataset.entryIndex)] === current);
  });
}

function selectVoiceExercise(index, highlight = true) {
  const entry = activeSession.entries[index];
  if (!entry) return;
  if (voiceCountingState?.entry !== entry) voiceCountingState = null;
  if (activeSession.currentExerciseId !== entry.exerciseId) {
    activeSession.currentExerciseId = entry.exerciseId;
    lastAutoCountCompletion = null;
    persistActiveSession();
  }
  refreshVoiceSelection();
  updateVoiceBadgeForListeningState();
  if (!highlight) return;
  const card = qs(`.exercise-card[data-entry-index="${index}"]`, el('exerciseList'));
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('voice-highlight');
    setTimeout(() => card.classList.remove('voice-highlight'), 1600);
  }
}

function voiceTargetEntryIndex(preferStrength = false) {
  const selected = activeSession.entries.findIndex((entry) =>
    !entry.equipmentBusy && entry.exerciseId === activeSession.currentExerciseId &&
    (!preferStrength || entry.type !== 'cardio') &&
    (!isEntryDone(entry) || (!preferStrength && entry.type === 'cardio')));
  if (selected >= 0) return selected;
  const running = activeSession.entries.findIndex((entry) =>
    !entry.equipmentBusy && !isEntryDone(entry) && (entry.type === 'cardio' ? !!entry.startedAt
      : entry.sets.some((set) => Number.isFinite(set.holdStartedAt) && !set.completed)));
  if (running >= 0) return running;
  const current = trainingTools.currentWorkoutEntry({ ...activeSession,
    entries: activeSession.entries.filter((entry) => !preferStrength || entry.type !== 'cardio') }, exercises);
  return activeSession.entries.indexOf(current);
}

function setVoiceBadge(text, counting) {
  const badge = el('voiceStatusBadge');
  if (!badge) return;
  if (!text) { badge.classList.add('hidden'); return; }
  if (badge.textContent !== text) badge.textContent = text;
  badge.classList.remove('hidden');
  badge.classList.toggle('counting', !!counting);
}

function updateVoiceCountingBadge() {
  if (!voiceCountingState) return;
  const { entry, setIndex, count, targetReps } = voiceCountingState;
  const text = targetReps
    ? `${entry.exerciseName} — סט ${setIndex + 1}: ${count} / ${targetReps} חזרות. הסט יסתיים ביעד`
    : `${entry.exerciseName} — סט ${setIndex + 1}: סופר ${count}. אמור ״סיימתי״ לסיום`;
  setVoiceBadge(`🎙️ ${text}`, true);
}

function updateVoiceBadgeForListeningState() {
  if (!native.isNative()) return;
  el('workoutAudioControls').classList.remove('hidden');
  el('btnFocusedListening').disabled = !!activeSession?.paused || voiceActivationPending;
  el('btnFocusedListening').setAttribute('aria-pressed', String(voiceFocusedRequested));
  el('btnFocusedListening').textContent = i18n.text(voiceFocusedRequested ? 'סיום האזנה ממוקדת' : 'האזנה ממוקדת');
  el('btnEnableWorkoutVoice').classList.toggle('hidden', voiceListeningActive || !!activeSession?.paused);
  el('btnEnableWorkoutVoice').textContent = i18n.text(voiceListeningError ? 'נסה שוב להפעיל מיקרופון' : '🎙️ הפעל מיקרופון ופקודות קוליות');
  if (voiceActivationPending) { setVoiceBadge('🎙️ מפעיל האזנה — ממתין לאישור המיקרופון'); return; }
  if (voiceCountingState && voiceListeningActive) { updateVoiceCountingBadge(); return; }
  const current = activeSession.entries[voiceTargetEntryIndex()];
  const microphone = voiceInputName ? ` (${voiceInputName})` : '';
  setVoiceBadge(voiceListeningActive && voiceFocusedRequested ? `🎙️ האזנה ממוקדת${microphone} — אפשר לומר שם תרגיל, לספור או לומר ״המשך מוזיקה״`
    : voiceListeningActive ? current
    ? `🎙️ מקשיב${microphone} — תרגיל נוכחי: ${current.exerciseName}`
    : `🎙️ מקשיב${microphone} — אמור שם תרגיל חזרות כדי להתחיל לספור`
    : voiceListeningError ? `🎙️ לא פעיל: ${voiceListeningError}`
      : '🎙️ המיקרופון אינו מקשיב. להפעלה לחץ על הכפתור למטה');
}

function handleVoiceTranscript(transcript) {
  if (!transcript || activeSession.paused || !voiceListeningActive || currentTab !== 'workout' || document.visibilityState !== 'visible') {
    pendingVoiceFinish = null;
    return;
  }
  const t = normalizeVoiceText(transcript);
  if (/^(?:הקשב(?: לי)?|תקשיב(?: לי)?|מצב האזנה|האזנה ממוקדת|listen(?: to me)?|focus listening)$/.test(t)) {
    setFocusedListening(true);
    return;
  }
  if (/^(?:המשך מוזיקה|חזור למוזיקה|סיים האזנה ממוקדת|resume music|end focused listening)$/.test(t)) {
    setFocusedListening(false);
    return;
  }
  if (voiceCountingState?.entry) {
    voiceCountingState.entryIndex = activeSession.entries.indexOf(voiceCountingState.entry);
    voiceCountingState.setIndex = voiceCountingState.entry.sets.indexOf(voiceCountingState.set);
    if (voiceCountingState.entryIndex < 0 || voiceCountingState.setIndex < 0 || voiceCountingState.set.completed) {
      voiceCountingState = null;
      updateVoiceBadgeForListeningState();
    }
  }
  let command = classifyVoiceCommand(t);
  const intent = voiceReports.parseWorkoutVoice(transcript);
  const pending = pendingVoiceFinish;
  pendingVoiceFinish = null;
  if (intent?.kind === 'confirm-finish') {
    if (pending?.session === activeSession && pending.expiresAt > Date.now() && activeSession.running) finishWorkout();
    else voiceReply('אין בקשת סיום בתוקף. אמור קודם סיים אימון');
    return;
  }
  if (pending && command === 'undo') { voiceReply('בקשת סיום האימון בוטלה'); return; }
  if (intent) { applyWorkoutVoice(intent); return; }
  let requestedEntryIndex = -1;
  let automaticSetCompletion = false;
  const endPhrase = /(?:^| )(סיימתי|ה?סט (?:הושלם|הסתיים)|סיום)$/;
  const endsCount = endPhrase.test(t);
  const numberText = endsCount ? t.replace(endPhrase, '') : t;
  const onlyNumbers = numberText.split(' ').every((word) => /^\d+$/.test(word)
    || HE_NUM_WORDS[word] !== undefined || (word.startsWith('ו') && HE_NUM_WORDS[word.slice(1)] !== undefined));
  const parsedCount = onlyNumbers ? parseSpokenRepCount(numberText, voiceCountingState?.count || 0) : null;
  const spokenCount = Number.isSafeInteger(parsedCount) && parsedCount >= 0 ? parsedCount : null;
  if (voiceCountingState && endsCount && spokenCount !== null) command = 'setDone';

  if (!command && spokenCount === null) {
    const match = matchVoiceExercise(t);
    if (match) {
      if (match.indexes.length > 1) {
        const names = match.indexes.map((index) => i18n.exerciseName(activeSession.entries[index].exerciseName)).join(' / ');
        voiceReply(`נמצאו כמה תרגילים: ${names}. אמור שם מדויק יותר`);
        return;
      }
      const index = match.indexes[0];
      const entry = activeSession.entries[index];
      if (entry.type !== 'cardio' && isEntryDone(entry)) {
        showToast(`🎙️ כל הסטים של ${entry.exerciseName} כבר הושלמו`);
        return;
      }
      selectVoiceExercise(index);
      const exercise = entry.exerciseSnapshot || exercises.find((item) => item.id === entry.exerciseId);
      const autoCount = !match.selectOnly && entry.type !== 'cardio' && exercise?.inputType !== 'hold';
      if (!match.start && !match.stop && !autoCount) return;
      requestedEntryIndex = index;
      command = match.stop ? 'stopExercise' : 'startExercise';
    }
  }

  if (!voiceCountingState && !command && spokenCount === 1 && activeSession.running && !restTimer.isRunning()) {
    const index = voiceTargetEntryIndex(true);
    const entry = activeSession.entries[index];
    const exercise = entry && (entry.exerciseSnapshot || exercises.find((item) => item.id === entry.exerciseId));
    if (entry && exercise?.inputType !== 'hold') {
      const setIndex = entry.sets.findIndex((set) => !set.completed);
      const set = entry.sets[setIndex];
      selectVoiceExercise(index, false);
      const targetReps = voiceRepTarget(set, exercise);
      if (targetReps) set.voiceTargetReps = targetReps;
      lastAutoCountCompletion = null;
      voiceCountingState = { entry, set, entryIndex: index, setIndex, count: 0, targetReps };
    }
  }

  // While actively counting reps out loud, any recognized number updates the
  // live count instead of being treated as a command.
  if (voiceCountingState && (!command || command === 'setDone')) {
    const n = spokenCount;
    if (n !== null) {
      voiceCountingState.count = n;
      const entry = activeSession.entries[voiceCountingState.entryIndex];
      const set = entry && entry.sets && entry.sets[voiceCountingState.setIndex];
      if (set) {
        set.reps = n;
        persistActiveSession();
        const card = qs(`.exercise-card[data-entry-index="${voiceCountingState.entryIndex}"]`, el('exerciseList'));
        const repsInput = card && qsa('.set-row', card)[voiceCountingState.setIndex] && qs('.reps', qsa('.set-row', card)[voiceCountingState.setIndex]);
        if (repsInput) repsInput.value = n;
      }
      updateVoiceCountingBadge();
      if (voiceCountingState.targetReps && n >= voiceCountingState.targetReps) {
        command = 'setDone';
        automaticSetCompletion = true;
      }
      if (!command) return;
    }
  }

  if (!command) {
    if (!voiceCountingState) setVoiceBadge(`🎙️ שמעתי ״${t}״ — פקודה לא מוכרת`);
    return;
  }

  if (command === 'startWorkout') {
    if (activeSession.running) return;
    primeSpeech();
    ensureWorkoutStarted();
    showToast('🎙️ האימון התחיל');
  } else if (command === 'finishWorkout') {
    if (!activeSession.running) return;
    pendingVoiceFinish = { session: activeSession, expiresAt: Date.now() + 15000 };
    voiceReply('כדי לסיים ולשמור, אמור מאשר סיום. לביטול הבקשה אמור בטל');
  } else if (command === 'cancelWorkout') {
    if (!activeSession.running) return;
    doCancelWorkout(); // already shows its own "cancelled" toast
  } else if (command === 'stopExercise') {
    const idx = requestedEntryIndex >= 0 ? requestedEntryIndex : voiceTargetEntryIndex();
    const entry = activeSession.entries[idx];
    if (!entry) { showToast('🎙️ אין תרגיל פעיל לעצירה'); return; }
    const card = qs(`.exercise-card[data-entry-index="${idx}"]`, el('exerciseList'));
    let button;
    if (entry.type === 'cardio' && entry.startedAt && !entry.completed) {
      button = card && qs('.btnCardioStart', card);
    } else if (entry.type !== 'cardio') {
      const setIdx = entry.sets.findIndex((_, index) => holdTimers.has(`${entry.exerciseId}:${index}`));
      const row = card && qsa('.set-row', card)[setIdx];
      if (row) button = qs('.btn-hold-toggle', row);
    }
    if (button) {
      button.click();
      showToast(`🎙️ ${entry.exerciseName} נעצר`);
    } else if (voiceCountingState?.entry === entry) {
      voiceCountingState = null;
      updateVoiceBadgeForListeningState();
      showToast('🎙️ הספירה נעצרה — הסט לא סומן כהושלם');
    } else {
      showToast('🎙️ אין טיימר פעיל בתרגיל שנבחר');
    }
  } else if (command === 'startSet' || command === 'startExercise') {
    if (voiceCountingState) { showToast('🎙️ ספירת הסט כבר פעילה'); return; }
    const idx = requestedEntryIndex >= 0 ? requestedEntryIndex : voiceTargetEntryIndex(command === 'startSet');
    if (idx < 0) { showToast('🎙️ כל התרגילים כבר בוצעו'); return; }
    const entry = activeSession.entries[idx];
    if (entry.type === 'cardio') {
      const card = qs(`.exercise-card[data-entry-index="${idx}"]`, el('exerciseList'));
      const button = card && qs('.btnCardioStart', card);
      if (!button) { showToast('🎙️ לא ניתן להתחיל את טיימר התרגיל'); return; }
      selectVoiceExercise(idx, false);
      if (!entry.startedAt) button.click();
      showToast(`🎙️ ${entry.exerciseName} — הטיימר פועל`);
      return;
    }
    const setIdx = entry.sets.findIndex((s) => !s.completed);
    if (setIdx < 0) { showToast('🎙️ כל הסטים בתרגיל זה כבר בוצעו'); return; }
    ensureWorkoutStarted();
    selectVoiceExercise(idx, false);
    restTimer.stop();
    el('restOverlay').classList.add('hidden');
    const exercise = entry.exerciseSnapshot || exercises.find((ex) => ex.id === entry.exerciseId);
    if (exercise && exercise.inputType === 'hold') {
      const card = qs(`.exercise-card[data-entry-index="${idx}"]`, el('exerciseList'));
      const row = card && qsa('.set-row', card)[setIdx];
      const button = row && qs('.btn-hold-toggle', row);
      if (!button) { showToast('🎙️ לא ניתן להתחיל מדידת החזקה'); return; }
      if (!holdTimers.has(`${entry.exerciseId}:${setIdx}`)) button.click();
      showToast('🎙️ מדידת ההחזקה התחילה');
      return;
    }
    cancelWorkoutGreeting();
    const set = entry.sets[setIdx];
    const targetReps = voiceRepTarget(set, exercise);
    if (targetReps) { set.voiceTargetReps = targetReps; persistActiveSession(); }
    lastAutoCountCompletion = null;
    voiceCountingState = { entry, set, entryIndex: idx, setIndex: setIdx, count: 0, targetReps };
    updateVoiceCountingBadge();
  } else if (command === 'setDone') {
    if (voiceCountingState) {
      const { entryIndex, setIndex } = voiceCountingState;
      const card = qs(`.exercise-card[data-entry-index="${entryIndex}"]`, el('exerciseList'));
      voiceCountingState = null;
      updateVoiceBadgeForListeningState();
      if (!card) return;
      const row = qsa('.set-row', card)[setIndex];
      const btn = row && qs('.set-check:not(.checked)', row);
      if (!btn) return;
      btn.click();
      const entry = activeSession.entries[entryIndex];
      rememberCompletedSet(entry, entry.sets[setIndex]);
      lastVoiceAction = { entry, set: entry.sets[setIndex] };
      if (automaticSetCompletion) lastAutoCountCompletion = { session: activeSession, entry, set: entry.sets[setIndex] };
      showToast('🎙️ סט סומן כבוצע');
      return;
    }
    if (lastAutoCountCompletion?.session === activeSession
      && activeSession.entries.includes(lastAutoCountCompletion.entry)
      && lastAutoCountCompletion.entry.sets.includes(lastAutoCountCompletion.set)
      && lastAutoCountCompletion.set.completed) {
      showToast('🎙️ הסט כבר הסתיים ביעד. לסט הבא אמור שוב את שם התרגיל או התחל סט');
      return;
    }
    const idx = voiceTargetEntryIndex(true);
    if (idx < 0) { showToast('🎙️ כל התרגילים כבר בוצעו'); return; }
    const card = qs(`.exercise-card[data-entry-index="${idx}"]`, el('exerciseList'));
    if (!card) { showToast('🎙️ לא ניתן למצוא את התרגיל הנוכחי'); return; }
    const entry = activeSession.entries[idx];
    const set = entry.type === 'cardio' ? null : entry.sets.find((s) => !s.completed);
    const btn = entry.type === 'cardio' ? qs('.btnCardioDone', card) : qs('.set-check:not(.checked)', card);
    if (!btn) { showToast('🎙️ לא ניתן לסמן את הסט הנוכחי'); return; }
    selectVoiceExercise(idx, false);
    btn.click();
    if (set) rememberCompletedSet(entry, set);
    lastVoiceAction = { entry, set };
    showToast(entry.type === 'cardio' ? `🎙️ ${entry.exerciseName} סומן כבוצע` : '🎙️ סט הושלם — זמן מנוחה');
  } else if (command === 'skipRest') {
    if (el('restOverlay').classList.contains('hidden')) return;
    el('btnSkipRest').click();
    showToast('🎙️ דילוג על זמן מנוחה');
  } else if (command === 'nextExercise') {
    const current = activeSession.entries.findIndex((entry) => entry.exerciseId === activeSession.currentExerciseId);
    const order = activeSession.entries.map((_, index) => (current + 1 + index) % activeSession.entries.length);
    const idx = order.find((index) => index !== current && !isEntryDone(activeSession.entries[index]));
    if (idx === undefined) { showToast('🎙️ אין תרגיל נוסף שטרם בוצע'); return; }
    selectVoiceExercise(idx);
  } else if (command === 'undo') {
    if (lastVoiceAction?.kind) { undoVoiceReport(); return; }
    if (!lastVoiceAction || !activeSession.entries.includes(lastVoiceAction.entry)) {
      showToast('🎙️ אין פעולה לביטול'); lastVoiceAction = null; return;
    }
    const target = lastVoiceAction.set || lastVoiceAction.entry;
    if ((lastVoiceAction.set && !lastVoiceAction.entry.sets.includes(target)) || !target.completed) {
      showToast('🎙️ אין פעולה לביטול'); lastVoiceAction = null; return;
    }
    target.completed = false;
    delete target.difficulty;
    if (lastVoiceAction.set) rememberCompletedSet(lastVoiceAction.entry, target);
    lastVoiceAction = null;
    restTimer.stop();
    el('restOverlay').classList.add('hidden');
    persistActiveSession();
    renderWorkoutTab();
    showToast('🎙️ הפעולה האחרונה בוטלה');
  }
}

/* ---------------- Voice commands: listening lifecycle ---------------- */
// Listens for the whole time the Workout tab is open and the app is in the
// foreground (not just once a workout is running — "start workout" itself is
// a voice command), except during an explicit workout pause. Native lifecycle
// stops background capture without discarding the requested listening state.
let voiceListeningActive = false;
let voiceListeningRequested = false;
let voiceFocusedRequested = false;
let voicePlaybackHandoff = false;
let voiceActivationPending = false;
let voiceListeningRevision = 0;
let voiceListeningError = '';
let voiceInputName = '';
let currentTab = 'home';
async function requestVoiceActivation(focused = false) {
  const result = await native.voiceRequestPermission();
  voiceListeningError = result.granted ? '' : (result.reason || 'אשר מיקרופון וזיהוי דיבור בהגדרות האייפון');
  if (result.granted) {
    settings.voiceCommandsEnabled = true;
    db.saveSettings(settings);
    el('settingVoiceCommands').checked = true;
    voiceFocusedRequested = focused === true;
    await updateVoiceListeningState(true);
  } else {
    showToast(voiceListeningError);
  }
  updateVoiceBadgeForListeningState();
}
async function setFocusedListening(focused) {
  if (voicePlaybackHandoff) {
    showToast('עדכון הניגון מתבצע. נסה שוב לאחר סיומו.');
    return;
  }
  if (!native.isNative() || currentTab !== 'workout' || activeSession.paused || document.visibilityState !== 'visible') {
    showToast('האזנה ממוקדת זמינה באייפון כשהאימון פתוח ואינו מושהה.');
    return;
  }
  if (focused && !settings.voiceCommandsEnabled) {
    await requestVoiceActivation(true);
    return;
  }
  voiceFocusedRequested = focused;
  await updateVoiceListeningState(true);
}

async function setWorkoutMusicPlayback(playing) {
  if (!playing) return native.musicSetPlayback(false);
  if (document.visibilityState !== 'visible') throw new Error('Music playback requires the app to be active');
  const mixedCaptureReady = voiceListeningActive && !voiceFocusedRequested;
  voicePlaybackHandoff = true;
  try {
    if (!mixedCaptureReady) {
      ++voiceListeningRevision;
      voiceFocusedRequested = false;
      voiceListeningRequested = false;
      voiceListeningActive = false;
      voiceActivationPending = false;
      pendingVoiceFinish = null;
      updateVoiceBadgeForListeningState();
      const result = await native.voiceRecoverAudio();
      if (!result.released) throw new Error(result.reason || 'Microphone audio release was not confirmed');
      await updateVoiceListeningState(false, true);
    }
    return await native.musicSetPlayback(true);
  } finally {
    voicePlaybackHandoff = false;
    await updateVoiceListeningState();
  }
}

async function recoverWorkoutAudio() {
  const button = el('btnRecoverWorkoutAudio');
  button.disabled = true;
  voiceListeningRevision++;
  voiceFocusedRequested = false;
  voiceListeningRequested = false;
  voiceListeningActive = false;
  voiceActivationPending = false;
  pendingVoiceFinish = null;
  try {
    const result = await native.voiceRecoverAudio();
    if (!result.released) throw new Error(result.reason || 'Audio release was not confirmed');
    voiceListeningError = '';
    await updateVoiceListeningState();
    showToast('בוצע ניסיון לחידוש ההאזנה. אם המוזיקה עדיין מושהית, המשך אותה בנגן.');
  } catch (error) {
    console.error('Workout audio recovery failed', error);
    voiceListeningError = String(error.message || error);
    showToast('לא ניתן לחדש את ההאזנה — ' + voiceListeningError);
  } finally {
    button.disabled = false;
    updateVoiceBadgeForListeningState();
  }
}

function handleVoiceListeningChanged(data) {
  if (!voiceListeningRequested || currentTab !== 'workout' || activeSession.paused) return;
  voiceListeningActive = data.listening === true;
  voiceFocusedRequested = data.focused === true;
  voiceInputName = data.inputName || voiceInputName;
  voiceActivationPending = false;
  if (!voiceListeningActive) pendingVoiceFinish = null;
  voiceListeningError = data.reason === 'interrupted' ? 'ההאזנה מושהית אחרי הפרעה. אפשר לנסות חידוש בכפתור האודיו.'
    : data.reason === 'announcement' ? 'ההאזנה מושהית בזמן הכרזה'
      : data.reason === 'recovering' ? 'קלט המיקרופון נעצר — מחדש את ההאזנה'
      : data.reason === 'inactive' ? 'ההאזנה מושהית כשהאפליקציה אינה פעילה' : '';
  updateVoiceBadgeForListeningState();
}

async function updateVoiceListeningState(force = false, preparingMusic = false) {
  if (!native.isNative() || voicePlaybackHandoff && !preparingMusic) return;
  const requested = currentTab === 'workout'
    && !activeSession.paused
    && settings.voiceCommandsEnabled === true;
  // Native lifecycle pauses capture, retaining the workout's existing audio route.
  if (requested && document.visibilityState !== 'visible') {
    pendingVoiceFinish = null;
    return;
  }
  const should = requested && document.visibilityState === 'visible';
  if (!should) pendingVoiceFinish = null;
  if (should === voiceListeningRequested && force !== true) return;
  const revision = ++voiceListeningRevision;
  voiceListeningRequested = should;
  voiceListeningActive = false;
  voiceActivationPending = should;
  if (!should) voiceFocusedRequested = false;
  updateVoiceBadgeForListeningState();
  if (should) {
    const phrases = [...new Set([...voiceReports.voiceReportHints(i18n.getLanguage()), ...activeSession.entries.flatMap(voiceExerciseNames)])];
    const result = await native.voiceStartListening(phrases, i18n.locale(), settings.voiceMicrophoneMode || 'automatic', voiceFocusedRequested);
    if (revision !== voiceListeningRevision) return;
    voiceActivationPending = false;
    voiceListeningActive = result.listening;
    voiceFocusedRequested = result.focused === true;
    if (!result.listening) pendingVoiceFinish = null;
    voiceListeningRequested = result.requested !== false && (result.listening || result.requested === true);
    if (!voiceListeningRequested) voiceFocusedRequested = false;
    voiceListeningError = result.listening ? '' : result.reason === 'announcement' ? 'ההאזנה מושהית בזמן הכרזה' : result.reason;
    voiceInputName = result.inputName || '';
    if (!result.listening && !voiceListeningRequested) showToast('לא ניתן להפעיל פקודות קוליות — ' + result.reason);
  } else {
    voiceCountingState = null;
    voiceInputName = '';
    const stopped = await native.voiceStopListening();
    if (!stopped) {
      voiceListeningError = 'שחרור המיקרופון לא אושר. אפשר לנסות שוב בכפתור האודיו.';
      showToast(voiceListeningError);
    }
  }
  updateVoiceBadgeForListeningState();
}


function startRestTimer(ex, exerciseDone, nextExerciseName) {
  if (activeSession.paused || activeSession.entries.length > 0 && activeSession.entries.every(isEntryDone)) return;
  const muscleCue = voiceReportInProgress ? '' : workoutMuscleCompletionCue();
  const entry = ex.id != null ? activeSession.entries.find((entry) => entry.exerciseId === ex.id) : null;
  if (entry?.exerciseSnapshot?.superset && !trainingTools.supersetNeedsRest(activeSession, entry)) {
    restTimer.stop();
    el('restOverlay').classList.add('hidden');
    if (settings.voiceAnnouncements && !voiceReportInProgress) {
      const next = nextWorkoutEntry(entry);
      speak(`${muscleCue}${i18n.text('סופר סט — עבור לחלק השני. אפשר לנוח לפי הצורך')}. ${trainingTools.workoutEntryAnnouncement(next, exercises, i18n.text, i18n.exerciseName)}`, i18n.locale());
    }
    return;
  }
  cancelWorkoutGreeting();
  const seconds = ex.restSeconds || settings.restSeconds || 90;
  el('restExerciseName').setAttribute('data-exercise-name', ex.name);
  el('restExerciseName').textContent = i18n.exerciseName(ex.name);
  el('restOverlay').classList.remove('hidden');
  playBeep();
  if (entry) activeSession.restCueExerciseId = entry.exerciseId;
  restDoneMessage = entry ? workoutRestContinuation()
    : exerciseDone ? nextExerciseName ? 'אפשר להתחיל' : 'האימון הושלם, כל הכבוד!' : 'אפשר להמשיך לסט הבא';
  const next = entry ? nextWorkoutEntry(entry) : null;
  const upcoming = entry ? next ? trainingTools.workoutEntryAnnouncement(next, exercises, i18n.text, i18n.exerciseName) : ''
    : nextExerciseName;
  restTimer.start(seconds);
  const announcementID = `rest:${restTimer.endAt}:start`;
  if (exerciseDone) {
    if (settings.voiceAnnouncements && !voiceReportInProgress) {
      const pct = getWorkoutSetProgress().percent;
      // announce the next exercise FIRST, then that the rest period has started
      speak(muscleCue + (upcoming
        ? `${ex.name} הסתיים. ${pct} אחוז מהאימון הושלמו. התרגיל הבא: ${upcoming}. עכשיו זמן מנוחה`
        : `${i18n.exerciseName(ex.name)}. ${restDoneMessage}. ${i18n.text('סט הושלם, זמן מנוחה')}`), i18n.locale(), announcementID);
    }
  } else {
    if (settings.voiceAnnouncements && !voiceReportInProgress) speak(muscleCue + i18n.text('סט הושלם, זמן מנוחה'), i18n.locale(), announcementID);
  }
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
    item.dataset.workoutId = w.id;
    item.innerHTML = `
      <div class="history-item-top">
        <input type="checkbox" class="history-select-check" ${selectedWorkoutIds.has(w.id) ? 'checked' : ''}>
        <div style="flex:1;">
          ${w.planSnapshot ? `<div class="history-workout-name" data-no-translate>${escapeHtml(trainingTools.sessionWorkoutTitle(w, i18n.text))}</div>` : ''}
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
            <b>${e.exerciseId === 'warmup' ? '🔥' : '🧘'} <span data-no-translate data-exercise-name="${escapeAttr(e.exerciseName)}">${escapeHtml(i18n.exerciseName(e.exerciseName))}</span></b>
            ${e.removedFromWorkout ? '<p class="field-hint">הוסר מהאימון; הביצועים שהושלמו נשמרו</p>' : ''}
            <div class="history-sets-line"><div>✅ בוצע (${Math.round(e.durationSec / 60)} דקות)${formatCardioExtra(e)}</div></div>
          </div>
        ` : `
          <div class="history-exercise-line">
            <b data-no-translate data-exercise-name="${escapeAttr(e.exerciseName)}">${escapeHtml(i18n.exerciseName(e.exerciseName))}</b>
            ${e.superset ? `<p class="field-hint">${escapeHtml(i18n.text(e.superset.name))} · ${i18n.text('חלק')} ${e.superset.order + 1} / 2</p>` : ''}
            ${e.removedFromWorkout ? '<p class="field-hint">הוסר מהאימון; הביצועים שהושלמו נשמרו</p>' : ''}
            <div class="history-sets-line">
              ${e.sets.map((s, i) => `<div>סט ${i + 1}: ${s.weightKg} ק"ג × ${s.reps} ${e.inputType === 'hold' ? 'שניות' : 'חזרות'}${Object.hasOwn(insights.DIFFICULTY_LABELS, s.difficulty) ? ` · <span>${insights.DIFFICULTY_LABELS[s.difficulty]}</span>` : ''}${s.notes ? `<p data-no-translate>${escapeHtml(s.notes)}</p>` : ''}</div>`).join('')}
            </div>
          </div>
        `).join('')}
        <button class="btn btn-secondary btn-small btnWorkoutSummary">סיכום אימון</button>
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
    qs('.btnWorkoutSummary', item).addEventListener('click', (ev) => {
      ev.stopPropagation();
      openWorkoutSummary(w);
    });
    qs('.btnEditWorkout', item).addEventListener('click', (ev) => {
      ev.stopPropagation();
      openEditWorkoutModal(w);
    });
    qs('.btnDeleteWorkout', item).addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (!confirm(i18n.text('למחוק את האימון הזה?'))) return;
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
            <div class="edit-exercise-title">${e.exerciseId === 'warmup' ? '🔥' : '🧘'} <span data-no-translate data-exercise-name="${escapeAttr(e.exerciseName)}">${escapeHtml(i18n.exerciseName(e.exerciseName))}</span> — ✅ בוצע</div>
          </div>
        ` : `
          <div class="edit-exercise-block" data-ei="${ei}">
            <div class="edit-exercise-title" data-no-translate data-exercise-name="${escapeAttr(e.exerciseName)}">${escapeHtml(i18n.exerciseName(e.exerciseName))}</div>
            ${e.sets.map((s, si) => `
              <div class="edit-set-row" data-si="${si}">
                <span class="set-num">סט ${si + 1}</span>
                <input type="number" inputmode="decimal" class="input edit-weight" value="${s.weightKg}" placeholder="ק&quot;ג">
                <input type="number" inputmode="numeric" class="input edit-reps" value="${s.reps}" placeholder="${e.inputType === 'hold' ? 'שניות' : 'חזרות'}">
                <select class="select edit-difficulty" aria-label="תחושת קושי">
                  <option value="">ללא דירוג</option>
                  ${Object.entries(insights.DIFFICULTY_LABELS).map(([value, label]) => `<option value="${value}" ${s.difficulty === value ? 'selected' : ''}>${label}</option>`).join('')}
                </select>
                <input class="input edit-set-notes" type="text" maxlength="500" aria-label="${escapeAttr(i18n.text('הערות לסט'))}" data-no-translate value="${escapeAttr(s.notes || '')}">
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
      clone.entries[ei].sets = rows.map((row) => {
        const { difficulty, ...original } = clone.entries[ei].sets[Number(row.dataset.si)];
        const value = qs('.edit-difficulty', row).value;
        return {
          ...original,
          weightKg: Number(qs('.edit-weight', row).value) || 0,
          reps: Number(qs('.edit-reps', row).value) || 0,
          completed: true,
          notes: qs('.edit-set-notes', row).value,
          ...(Object.hasOwn(insights.DIFFICULTY_LABELS, value) ? { difficulty: value } : {}),
        };
      });
    });
    clone.entries = clone.entries.filter((e) => e.type === 'cardio' || e.sets.length > 0);
    workouts = db.getWorkouts().map((w) => (w.id === clone.id ? { ...clone,
      healthDelivery: w.healthDelivery, healthSyncPending: w.healthSyncPending, healthSyncedAt: w.healthSyncedAt } : w));
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
  if (entry.location === 'treadmill') parts.push(`🏃 ${i18n.text('הליכון')}`);
  else if (entry.location === 'outside') parts.push(`🌳 ${i18n.text('בחוץ')}`);
  else if (entry.location === 'home') parts.push(`🏠 ${i18n.text('בבית')}`);
  if (entry.pace) parts.push(entry.pace === DEFAULT_CARDIO_PACE ? i18n.text(entry.pace) : entry.pace);
  if (entry.intervals) parts.push(`${entry.intervals.rounds} ${i18n.text('סבבים')} · ${entry.intervals.workSeconds} ${i18n.text('שניות קפיצה')} / ${entry.intervals.recoverySeconds} ${i18n.text('שניות התאוששות')}`);
  return parts.length ? ` — ${parts.join(' · ')}` : '';
}

function buildWorkoutShareLines(workoutsArr) {
  const who = profile && profile.name ? ` — ${profile.name}` : '';
  const lines = [];
  if (i18n.getLanguage() === 'en') {
    if (workoutsArr.length > 1) {
      const volume = workoutsArr.reduce((sum, workout) => sum + computeVolume(workout), 0);
      lines.push(`💪 ${workoutsArr.length} AutoFit workouts${who}`, `📦 Total volume: ${Math.round(volume).toLocaleString(i18n.locale())} kg`, '');
    }
    workoutsArr.forEach((workout, index) => {
      lines.push(workoutsArr.length > 1 ? `━━━ Workout ${index + 1} ━━━` : `💪 AutoFit workout${who}`,
        `📅 ${formatDate(workout.dateISO)}`, `⏱ Workout duration: ${formatHMS(workout.durationSec)}`,
        `📦 Volume: ${Math.round(computeVolume(workout)).toLocaleString(i18n.locale())} kg`, '');
      if (workout.planSnapshot) lines.push(trainingTools.sessionWorkoutTitle(workout, i18n.text), '');
      workout.entries.forEach((entry) => {
        if (entry.type === 'cardio') {
          if (entry.completed) lines.push(`⏱ ${i18n.exerciseName(entry.exerciseName)}: ${Math.round(entry.durationSec / 60)} min${formatCardioExtra(entry)}`);
        } else if (entry.sets.length) {
          lines.push(`🏋️ ${i18n.exerciseName(entry.exerciseName)}`);
          if (entry.superset) lines.push(`   ${i18n.text(entry.superset.name)} (${entry.superset.order + 1}/2)`);
          entry.sets.forEach((set, index) => {
            lines.push(`   Set ${index + 1}: ${set.weightKg} kg × ${set.reps}${entry.inputType === 'hold' ? ' seconds' : ''}`);
            if (Object.hasOwn(insights.DIFFICULTY_LABELS, set.difficulty)) lines.push(`   ${i18n.text(insights.DIFFICULTY_LABELS[set.difficulty])}`);
            if (set.notes) lines.push(`   ${set.notes}`);
          });
        }
      });
      lines.push('');
    });
    lines.push('Shared from AutoFit');
    return lines;
  }
  if (workoutsArr.length > 1) {
    const totalVolume = workoutsArr.reduce((a, w) => a + computeVolume(w), 0);
    lines.push(`💪 ${workoutsArr.length} אימוני AutoFit${who}`);
    lines.push(`📦 נפח מצטבר: ${Math.round(totalVolume).toLocaleString(i18n.locale())} ק"ג`);
    lines.push('');
  }
  workoutsArr.forEach((w, wi) => {
    if (workoutsArr.length > 1) lines.push(`━━━ אימון ${wi + 1} ━━━`);
    else lines.push(`💪 אימון AutoFit${who}`);
    if (w.planSnapshot) lines.push(trainingTools.sessionWorkoutTitle(w, i18n.text));
    lines.push(`📅 ${formatDate(w.dateISO)}`);
    lines.push(`⏱ משך האימון: ${formatHMS(w.durationSec)}`);
    lines.push(`📦 נפח: ${Math.round(computeVolume(w)).toLocaleString(i18n.locale())} ק"ג`);
    lines.push('');
    w.entries.forEach((e) => {
      if (e.type === 'cardio') {
        if (e.completed) lines.push(`${e.exerciseId === 'warmup' ? '🔥 חימום' : e.exerciseId === 'cooldown' ? '🧘 שחרור' : `⏱️ ${e.exerciseName}`}: ${Math.round(e.durationSec / 60)} דקות${formatCardioExtra(e)}`);
        return;
      }
      if (!e.sets.length) return;
      lines.push(`🏋️ ${e.exerciseName}`);
      if (e.superset) lines.push(`   ${i18n.text(e.superset.name)} (${e.superset.order + 1}/2)`);
      e.sets.forEach((s, i) => {
        lines.push(`   סט ${i + 1}: ${s.weightKg} ק"ג × ${s.reps}${e.inputType === 'hold' ? ' שניות' : ''}`);
        if (Object.hasOwn(insights.DIFFICULTY_LABELS, s.difficulty)) lines.push(`   ${insights.DIFFICULTY_LABELS[s.difficulty]}`);
        if (s.notes) lines.push(`   ${s.notes}`);
      });
    });
    lines.push('');
  });
  lines.push('נשלח מתוך AutoFit 🚀');
  return lines.map((line) => i18n.text(line));
}

// Renders a styled, white-background, table-like summary onto a canvas (shared by
// both the image-share and PDF-share paths). Canvas is used (rather than jsPDF's
// native text API) because jsPDF's built-in fonts don't include Hebrew glyphs —
// the canvas renders Hebrew natively via the OS font and we embed the result as
// an image, giving us a clean printable look with a real white background.
function* buildWorkoutShareCanvases(workoutsArr) {
  const width = 760;
  const pageHeight = 1075;
  const scale = 2;
  const margin = 28;
  const innerWidth = width - margin * 2;
  const english = i18n.getLanguage() === 'en';
  const alignment = english ? 'left' : 'right';
  const textEdge = english ? margin : width - margin;
  const column = (fraction) => english ? margin + innerWidth * fraction : width - margin - innerWidth * fraction;
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
    add('stats', 46, { stats: [`${workoutsArr.length} אימונים`, `${Math.round(totalVolume).toLocaleString(i18n.locale())} ק"ג נפח מצטבר`] });
  }
  workoutsArr.forEach((w, wi) => {
    if (wi > 0) add('divider', 24, {});
    if (workoutsArr.length > 1) add('section', 34, { text: `אימון ${wi + 1} — ${formatDate(w.dateISO)}` });
    if (w.planSnapshot) add('section', 34, { text: trainingTools.sessionWorkoutTitle(w, i18n.text) });
    add('stats', 46, { stats: [formatDate(w.dateISO), `⏱ ${formatHMS(w.durationSec)}`, `📦 ${Math.round(computeVolume(w)).toLocaleString(i18n.locale())} ק"ג`] });
    w.entries.forEach((e) => {
      if (e.type === 'cardio') {
        if (!e.completed) return;
        const icon = e.exerciseId === 'warmup' ? '🔥' : '🧘';
        add('cardio', 40, { text: english
          ? `${icon} ${i18n.exerciseName(e.exerciseName)} — ${Math.round(e.durationSec / 60)} min${formatCardioExtra(e)}`
          : `${icon} ${e.exerciseName} — ${Math.round(e.durationSec / 60)} דקות${formatCardioExtra(e)}` });
        return;
      }
      if (!e.sets.length) return;
      add('exTitle', 36, { text: i18n.exerciseName(e.exerciseName) });
      if (e.superset) add('annotation', 22, { text: `${i18n.text(e.superset.name)} (${e.superset.order + 1}/2)` });
      add('tableHeader', 28, {});
      e.sets.forEach((s, i) => {
        add('tableRow', 26, { i, weightKg: s.weightKg, reps: s.reps });
        const annotation = [e.inputType === 'hold' ? i18n.text('שניות') : '',
          Object.hasOwn(insights.DIFFICULTY_LABELS, s.difficulty) ? i18n.text(insights.DIFFICULTY_LABELS[s.difficulty]) : '', s.notes || ''].filter(Boolean).join(' · ');
        const characters = Array.from(annotation);
        for (let offset = 0; offset < characters.length; offset += 64) {
          add('annotation', 22, { text: characters.slice(offset, offset + 64).join('') });
        }
      });
      add('spacer', 8, {});
    });
  });
  add('footer', 40, { text: 'נשלח מתוך AutoFit 🚀' });

  const pages = [];
  let page = [];
  let used = 0;
  let exerciseTitle = null;
  const availableHeight = pageHeight - margin * 2 - 24;
  blocks.forEach((block, index) => {
    let required = block.h;
    if (block.type === 'exTitle') required += (blocks[index + 1]?.h || 0) + (blocks[index + 2]?.h || 0);
    if (block.type === 'tableHeader') required += blocks[index + 1]?.h || 0;
    if (used + required > availableHeight && page.length) {
      pages.push(page);
      page = [];
      used = 0;
      if (block.type === 'tableRow') {
        if (exerciseTitle) { page.push(exerciseTitle); used += exerciseTitle.h; }
        page.push({ type: 'tableHeader', h: 28 });
        used += 28;
      }
    }
    if (block.type === 'exTitle') exerciseTitle = block;
    page.push(block);
    used += block.h;
  });
  if (page.length) pages.push(page);

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = pageHeight * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('לא ניתן ליצור תמונת שיתוף');
    ctx.scale(scale, scale);

    // ---- Pass 2: draw ----
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, pageHeight);
    ctx.direction = english ? 'ltr' : 'rtl';
    const right = width - margin;
    let y = margin;

    pages[pageIndex].forEach((b) => {
      const cy = y + b.h / 2;
      if (b.type === 'title') {
        ctx.textAlign = alignment;
        ctx.fillStyle = COLORS.primary;
        ctx.font = 'bold 26px Arial';
        ctx.fillText(i18n.text(b.text), textEdge, y + 34, innerWidth);
      } else if (b.type === 'section') {
        ctx.textAlign = alignment;
        ctx.fillStyle = COLORS.text;
        ctx.font = 'bold 18px Arial';
        ctx.fillText(i18n.text(b.text), textEdge, y + 24, innerWidth);
      } else if (b.type === 'stats') {
        const n = b.stats.length;
        const gap = 10;
        const boxW = (innerWidth - gap * (n - 1)) / n;
        b.stats.forEach((s, i) => {
          const bx = english ? margin + i * (boxW + gap) : right - boxW - i * (boxW + gap);
          ctx.fillStyle = COLORS.primarySoft;
          ctx.fillRect(bx, y, boxW, b.h - 8);
          ctx.fillStyle = COLORS.primary;
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(i18n.text(s), bx + boxW / 2, y + (b.h - 8) / 2 + 5);
        });
        ctx.textAlign = alignment;
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
        ctx.textAlign = alignment;
        ctx.fillText(`🏋️ ${b.text}`, textEdge, y + 24, innerWidth);
      } else if (b.type === 'cardio') {
        ctx.fillStyle = COLORS.rowAlt;
        ctx.fillRect(margin, y, innerWidth, b.h - 6);
        ctx.fillStyle = COLORS.text;
        ctx.font = '14px Arial';
        ctx.textAlign = alignment;
        ctx.fillText(i18n.text(b.text), english ? margin + 10 : right - 10, y + (b.h - 6) / 2 + 5, innerWidth - 20);
      } else if (b.type === 'tableHeader') {
        ctx.fillStyle = COLORS.primary;
        ctx.fillRect(margin, y, innerWidth, b.h);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(i18n.text('סט'), column(0.15), y + b.h / 2 + 4);
        ctx.fillText(i18n.text('ק"ג'), column(0.5), y + b.h / 2 + 4);
        ctx.fillText(i18n.text('חזרות'), column(0.85), y + b.h / 2 + 4);
        ctx.textAlign = alignment;
      } else if (b.type === 'tableRow') {
        if (b.i % 2 === 1) { ctx.fillStyle = COLORS.rowAlt; ctx.fillRect(margin, y, innerWidth, b.h); }
        ctx.strokeStyle = COLORS.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(margin, y, innerWidth, b.h);
        ctx.fillStyle = COLORS.text;
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(String(b.i + 1), column(0.15), y + b.h / 2 + 5);
        ctx.fillText(String(b.weightKg), column(0.5), y + b.h / 2 + 5);
        ctx.fillText(String(b.reps), column(0.85), y + b.h / 2 + 5);
        ctx.textAlign = alignment;
      } else if (b.type === 'annotation') {
        ctx.fillStyle = COLORS.text;
        ctx.font = '13px Arial';
        ctx.textAlign = alignment;
        ctx.fillText(b.text, textEdge, y + 16, innerWidth);
      } else if (b.type === 'footer') {
        ctx.fillStyle = COLORS.muted;
        ctx.font = '13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(i18n.text(b.text), width / 2, y + 24);
        ctx.textAlign = alignment;
      }
      y += b.h;
    });

    ctx.fillStyle = COLORS.muted;
    ctx.font = '13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`AutoFit — ${pageIndex + 1} / ${pages.length}`, width / 2, pageHeight - margin);
    yield canvas;
  }
}

async function buildWorkoutShareImages(workoutsArr) {
  const files = [];
  const stamp = Date.now();
  for (const canvas of buildWorkoutShareCanvases(workoutsArr)) {
    try {
      const blob = await new Promise((resolve, reject) => canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error('יצירת תמונה נכשלה')), 'image/png'));
      files.push({ blob, filename: `autofit-${stamp}-${files.length + 1}.png`, mime: 'image/png' });
    } finally {
      canvas.width = canvas.height = 1;
    }
  }
  return files;
}

// Builds a real PDF file (not just a print dialog) by embedding the rendered
// canvas as an image inside a jsPDF document, so it can be shared as an actual
// attachable file via the native share sheet (unlike window.print(), which only
// opens the browser print UI and cannot be "sent" directly to an app).
function buildWorkoutSharePdf(workoutsArr) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) throw new Error('ספריית PDF אינה זמינה');
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: 'AutoFit workout history', creator: 'AutoFit' });
  let pageIndex = 0;
  for (const canvas of buildWorkoutShareCanvases(workoutsArr)) {
    try {
      if (pageIndex++) doc.addPage();
      doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297);
    } finally {
      canvas.width = canvas.height = 1;
    }
  }
  return doc.output('blob');
}

// Shares a file (image/PNG or application/pdf) through the native OS share sheet
// when supported (this is what makes "send to WhatsApp/Mail" actually work,
// since neither wa.me nor mailto: support file attachments). Falls back to a
// plain download so the user can still attach it manually.
async function shareFile(blob, filename, mime) {
  return shareFiles([{ blob, filename, mime }]);
}

async function shareFiles(files) {
  if (!files.length || files.some((file) => !file.blob || !file.blob.size)) {
    showToast('היצירה נכשלה, נסה שוב'); return false;
  }
  if (native.isNative()) {
    try {
      await native.shareFiles(files);
      return true;
    } catch (e) {
      console.error('Native file sharing failed', e);
      showToast('שיתוף הקובץ נכשל — ' + String(e.message || e));
      return false;
    }
  }
  const sharedFiles = files.map(({ blob, filename, mime }) => new File([blob], filename, { type: mime }));
  if (navigator.canShare && navigator.canShare({ files: sharedFiles })) {
    try {
      await navigator.share({ files: sharedFiles, title: i18n.text('אימון AutoFit') });
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('File sharing failed', e);
        showToast('שיתוף הקובץ נכשל — ' + String(e.message || e));
        return false;
      }
    }
    return true;
  }
  files.forEach(({ blob, filename }) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  });
  showToast('הקובץ הורד — אפשר לצרף ולשלוח אותו ידנית במייל/וואטסאפ');
  return true;
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
  showToast(`${i18n.text('נשלחה בקשת פתיחת Shortcuts. אי אפשר לאמת כאן שמירה בבריאות.')} (${totalMinutes} ${i18n.text('דקות')}, ${dateStr})`);
}

// In the native app, write straight to HealthKit — no Shortcuts bridge needed.
// Falls back to the Shortcuts flow automatically when running as a plain web/PWA.
async function syncWorkoutToHealth(workoutsArr, { requestAuthorization = true } = {}) {
  if (privacyErasing) return;
  const requested = [...new Map(workoutsArr.map((workout) =>
    [workout.id, workouts.find((record) => record.id === workout.id) || workout])).values()];
  if (!native.isNative()) {
    const unsent = requested.filter((workout) => !workout.healthSyncedAt && workout.healthDelivery?.status !== 'shortcut');
    if (!unsent.length) {
      showToast('כבר נשמר אישור מסירה או נשלחה בקשת Shortcuts. בדוק בבריאות לפני שליחה נוספת כדי למנוע כפילות.');
      return;
    }
    try {
      sendWorkoutToHealthShortcut(unsent);
      persistHealthDelivery(unsent, 'shortcut', 'browser');
    } catch (error) {
      console.error('Health Shortcuts handoff failed', error);
      showToast('לא ניתן להשלים את הבקשה ל-Shortcuts — ' + error.message);
    } finally {
      for (const record of unsent) refreshHealthSummaries(record.id);
    }
    return;
  }
  const pending = requested.filter((workout) => !healthSyncInFlight.has(workout.id) && !workout.healthSyncedAt);
  if (!pending.length) return;
  for (const workout of pending) {
    healthSyncInFlight.add(workout.id);
  }
  try {
    persistHealthDelivery(pending, 'pending');
    const auth = await (requestAuthorization ? native.healthRequestAuthorization() : native.healthAuthorizationStatus());
    if (!auth.granted) {
      persistHealthDelivery(pending, /unavailable|not-native|plugin missing|not available|requires iOS/i.test(auth.reason || '')
        ? 'unavailable' : 'unauthorized', auth.reason || '');
      showToast('האימון ממתין לסנכרון לבריאות — ' + (auth.reason || 'אשר הרשאת כתיבה בהגדרות > בריאות'));
      return;
    }
    let savedCount = 0;
    for (const w of pending) {
      if (privacyErasing) break;
      const res = await native.healthSaveWorkout({
        workoutID: w.id, startMillis: new Date(w.dateISO).getTime(),
        durationSec: Math.round(w.durationSec), entries: w.entries,
      });
      if (!res.saved) {
        persistHealthDelivery([w], 'failed', res.reason || '');
        showToast('הסנכרון לבריאות ממתין לניסיון נוסף — ' + (res.reason || 'השמירה לא אושרה'));
        continue;
      }
      persistHealthDelivery([w], 'saved', '', res.id);
      savedCount++;
    }
    if (savedCount) showToast(`נשמר באפליקציית הבריאות ✅ (${savedCount} ${savedCount > 1 ? 'אימונים' : 'אימון'})`);
  } catch (error) {
    console.error('Apple Health synchronization failed', error);
    const unconfirmed = pending.filter((workout) => !workout.healthSyncedAt);
    if (unconfirmed.length) {
      try { persistHealthDelivery(unconfirmed, 'failed', error.message || String(error)); }
      catch (storageError) { console.error('Cannot persist Health delivery failure', storageError); }
    }
    showToast(unconfirmed.length ? 'סנכרון לבריאות לא הושלם — ' + error.message
      : i18n.text('בריאות אישרה את השמירה, אך אישור המסירה לא נשמר במכשיר בגלל תקלה באחסון.'));
  } finally {
    for (const workout of pending) {
      healthSyncInFlight.delete(workout.id);
      refreshHealthSummaries(workout.id);
    }
  }
}

function persistHealthDelivery(records, status, reason = '', nativeId) {
  if (privacyErasing) return;
  const updatedAt = new Date().toISOString();
  for (const record of records) {
    const current = workouts.find((workout) => workout.id === record.id);
    for (const target of new Set([record, current].filter(Boolean))) {
      target.healthDelivery = { status, reason: String(reason), updatedAt, ...(nativeId ? { nativeId } : {}) };
      target.healthSyncPending = native.isNative() && status !== 'saved';
      if (status === 'saved') target.healthSyncedAt = updatedAt;
    }
  }
  db.saveWorkouts(workouts);
  for (const record of records) refreshHealthSummaries(record.id);
}

function healthDeliveryState(record) {
  const status = record.healthSyncedAt ? 'saved' : healthSyncInFlight.has(record.id) ? 'syncing'
    : record.healthDelivery?.status || (record.healthSyncPending ? 'pending' : 'unknown');
  const messages = {
    saved: 'האימון עודכן באפליקציית בריאות — התקבל אישור שמירה מ-Apple Health.',
    syncing: 'ממתין לתשובה מ-Apple Health. עדיין אין אישור שמירה.',
    pending: 'האימון נשמר ב-AutoFit וממתין לסנכרון לבריאות. עדיין אין אישור שמירה.',
    unavailable: record.healthDelivery?.reason === 'browser'
      ? 'בדפדפן אין כתיבה ישירה לבריאות. אפשר לבקש פתיחת Shortcuts, אך לא ניתן לאמת כאן שהאימון נשמר בבריאות.'
      : 'החיבור לבריאות אינו זמין כרגע. האימון נשמר ב-AutoFit, אך לא התקבל אישור שמירה בבריאות.',
    unauthorized: 'לא התקבל אישור כתיבה לבריאות. האימון נשמר ב-AutoFit. בדוק הרשאה בהגדרות בריאות ונסה שוב.',
    failed: 'העדכון בבריאות לא הושלם בגלל תקלה. האימון נשמר ב-AutoFit וניתן לנסות לסנכרן שוב.',
    shortcut: 'נשלחה בקשת פתיחת Shortcuts בלבד. אין כאן אישור שהאימון נשמר בבריאות; בדוק באפליקציית בריאות לפני שליחה נוספת.',
    unknown: 'אין לאימון הזה אישור מסירה מתועד לבריאות. אי אפשר לקבוע אם הוא עודכן.',
  };
  return { status, message: messages[status] || messages.unknown, reason: record.healthDelivery?.reason || '',
    canRetry: native.isNative() && record.healthSyncPending === true && !healthSyncInFlight.has(record.id) && !record.healthSyncedAt };
}

function renderHealthSummary(row, record) {
  const state = healthDeliveryState(record);
  row.querySelector('.health-delivery-message').textContent = state.message;
  row.querySelector('.health-delivery-reason').textContent = state.reason && state.reason !== 'browser' ? state.reason : '';
  const retry = row.querySelector('.btnRetryHealth');
  retry.classList.toggle('hidden', !state.canRetry);
  retry.disabled = !state.canRetry;
  const send = row.closest('dialog')?.querySelector('.btnSendHealth');
  if (send) send.disabled = state.status === 'shortcut' || state.status === 'saved';
  if (typeof i18n !== 'undefined') i18n.translateDOM(row);
}

function refreshHealthSummaries(workoutId) {
  if (typeof document === 'undefined') return;
  const current = workouts.find((record) => record.id === workoutId);
  if (!current) return;
  document.querySelectorAll('dialog[open] [data-health-workout]').forEach((row) => {
    if (row.dataset.healthWorkout === workoutId) renderHealthSummary(row, current);
  });
}

function openHealthSyncHelp() {
  openTrainingDialog('⌚ סנכרון לאפליקציית בריאות', `
      <div style="font-size:13px; line-height:1.9; color:var(--text);">
        <p>דפדפן/אפליקציית אינטרנט לא יכולה לכתוב ישירות ל-HealthKit של אפל — זו הגבלה של אפל שתקפה לכל אתר, לא רק ל-AutoFit. הדרך הריאלית: קיצור (Shortcut) חד-פעמי שאתה יוצר, שמקבל טקסט מ-AutoFit (עם משך האימון והתאריך האמיתי שלו, מופרדים ב-"|") ורושם את זה לבריאות.</p>
        <p><b>הגדרה (פעם אחת):</b></p>
        <ol style="padding-inline-start:18px; margin:0;">
          <li>פתח את אפליקציית <b>קיצורים (Shortcuts)</b> באייפון.</li>
          <li>צור קיצור חדש וקרא לו בדיוק: <b data-no-translate>${escapeHtml(HEALTH_SHORTCUT_NAME)}</b></li>
          <li>הוסף פעולה <b>"פיצול טקסט" (Split Text)</b> — על "קלט הקיצור" (Shortcut Input), עם מפריד מותאם אישית (Custom): <b>|</b></li>
          <li>הוסף פעולה <b>"קבלת פריט מתוך רשימה" (Get Item from List)</b> — פריט מספר <b>1</b> (זה מספר הדקות).</li>
          <li>הוסף פעולה נוספת <b>"קבלת פריט מתוך רשימה"</b> — פריט מספר <b>2</b> (זה התאריך).</li>
          <li>הוסף פעולה <b>"קבלת תאריכים מהקלט" (Get Dates from Input)</b> — תפעל על התוצאה של "פריט 2" ותהפוך אותו לתאריך.</li>
          <li>הוסף פעולה <b>"רישום אימון" (Log Workout)</b>.</li>
          <li>בחר סוג אימון: אימון כוח מסורתי (Traditional Strength Training).</li>
          <li>בשדה <b>תאריך (Date)</b> הקש על הערך ובחר את התוצאה של "קבלת תאריכים מהקלט".</li>
          <li>בשדה <b>משך (Duration)</b> הקש על הערך ובחר את התוצאה של "פריט 1", וודא שהיחידה מוגדרת לדקות.</li>
          <li>שמור את הקיצור.</li>
        </ol>
        <p>חשוב: יש לבדוק את הקיצור רק דרך כפתור "שלח ל-Shortcuts" ב-AutoFit (למשל אחרי סיום אימון, או מההיסטוריה) — לא ע"י הפעלה ישירה בתוך אפליקציית הקיצורים, כי אז אין קלט בכלל והקיצור ייכשל.</p>
        <p>כפתור Shortcuts מבקש לפתוח את הקיצור עם משך האימון והתאריך. רק קיצור שהוגדר ופעל בהצלחה יכול לרשום בבריאות; AutoFit בדפדפן לא מקבל אישור מסירה. בדוק בבריאות לפני שליחה חוזרת כדי למנוע כפילות. בבחירת כמה אימונים יחד נשלח התאריך של הראשון.</p>
      </div>
  `);
}

function openShareModal(workoutsArr) {
  const list = Array.isArray(workoutsArr) ? workoutsArr : [workoutsArr];
  const title = list.length > 1 ? `שיתוף ${list.length} אימונים` : `שיתוף אימון — ${formatDate(list[0].dateISO)}`;
  const overlay = openTrainingDialog(title, `
      <div class="settings-actions" style="flex-direction:column;">
        <button class="btn btn-primary" id="sharePdf">📄 שתף כ-PDF</button>
        <button class="btn btn-secondary" id="shareImage">🖼️ שתף תמונות חדות לפי עמודים</button>
        <div class="field-hint">כל תמונה היא עמוד נפרד וברזולוציה גבוהה. לשיתוף היסטוריה ארוכה בקובץ אחד בחר PDF. וואטסאפ עשוי לדחוס תמונות גם אחרי השיתוף.</div>
        ${native.isNative() ? '' : `
        <div style="display:flex; gap:6px;">
          <button class="btn btn-secondary" id="sendHealth" style="flex:1;">⌚ שלח ל-Shortcuts (לבריאות)</button>
          <button class="btn-icon btnHealthHelp" title="איך זה עובד?">ℹ️</button>
        </div>`}
      </div>
  `);
  const close = () => overlay.close();

  let sharing = false;
  async function shareWorkout(format) {
    if (sharing) return;
    sharing = true;
    const buttons = [qs('#sharePdf', overlay), qs('#shareImage', overlay)];
    buttons.forEach((button) => { button.disabled = true; });
    try {
      const files = format === 'pdf'
        ? [{ blob: buildWorkoutSharePdf(list), filename: `autofit-${Date.now()}.pdf`, mime: 'application/pdf' }]
        : await buildWorkoutShareImages(list);
      const shared = await shareFiles(files);
      if (shared) close();
    } catch (e) {
      console.error('Share file generation failed', e);
      showToast('יצירת הקובץ נכשלה — ' + String(e.message || e));
    } finally {
      sharing = false;
      buttons.forEach((button) => { button.disabled = false; });
    }
  }
  qs('#sharePdf', overlay).addEventListener('click', () => shareWorkout('pdf'));
  qs('#shareImage', overlay).addEventListener('click', () => shareWorkout('png'));
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
    if (e.type === 'cardio' || e.inputType === 'hold' || e.loadKind === 'assistance' || !e.sets) return sum;
    return sum + e.sets.reduce((s2, s) => s2 + (s.completed !== false
      && Number.isFinite(Number(s.weightKg)) && Number(s.weightKg) >= 0
      && Number.isFinite(Number(s.reps)) && Number(s.reps) > 0 ? Number(s.weightKg) * Number(s.reps) : 0), 0);
  }, 0);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(i18n.locale(), { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString(i18n.locale(), { hour: '2-digit', minute: '2-digit' });
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
  renderExercisePicker();
  const details = el('statisticsDetails');
  details.ontoggle = () => { if (details.open) renderDetailedStatistics(); };
  if (details.open) renderDetailedStatistics();
}

function renderDetailedStatistics() {
  el('statisticsChartUnavailable').classList.toggle('hidden', !!window.Chart);
  renderVolumeChart();
  renderSetsChart();
  renderExerciseChart();
  renderConsistencyChart();
  renderBodyWeightChart();
}

function renderStatsGrid() {
  const grid = el('statsGrid');
  const model = insights.statisticsOverview(workouts);
  const now = new Date();
  const weekCount = model.records.filter((record) => workoutWeekKey(new Date(record.dateISO)) === workoutWeekKey(now)).length;
  const goal = settings.weeklyGoal;
  const stats = [
    { label: 'אימונים השבוע / היעד שלך', value: `${weekCount} / ${goal}` },
    { label: 'אימונים ב־28 ימים', value: model.recent.length },
    { label: 'דקות פעילות ב־28 ימים', value: Math.round(model.activeSeconds / 60) },
    { label: 'סטים שהושלמו ב־28 ימים', value: model.completedSets },
  ];
  grid.innerHTML = stats.map((s) => `
    <div class="stat-box"><div class="stat-value" data-no-translate>${s.value}</div><div class="stat-label">${i18n.text(s.label)}</div></div>
  `).join('');
  const messages = model.records.length ? [
    weekCount >= goal ? 'היעד השבועי שבחרת הושג. אין צורך להוסיף אימון רק כדי להגדיל את המספר.'
      : 'היעד השבועי הוא כלי תכנון, לא ציון. אפשר להתאים אותו לזמן ולהתאוששות שלך.',
    `ב־28 הימים האחרונים תועדו ${model.recent.length} אימונים, לעומת ${model.previous.length} ב־28 הימים שקדמו להם.`,
    'מספר האימונים מתאר התמדה. כדי לבדוק שינוי בביצוע, בחר תרגיל למטה.',
  ] : ['עדיין אין אימונים שהושלמו בהיסטוריה. אחרי שמירת אימון יופיע כאן סיכום ברור, בלי להמציא מגמה.'];
  el('statisticsConclusions').innerHTML = `<h3 class="card-title">${i18n.text('התמונה בקצרה')}</h3>
    ${messages.map((message) => `<p>${escapeHtml(i18n.text(message))}</p>`).join('')}
    ${model.latest ? `<p class="field-hint"><span>${i18n.text('האימון המתועד האחרון')}</span>: <span data-no-translate>${escapeHtml(formatDate(model.latest.dateISO))}</span></p>` : ''}
    <button class="btn btn-secondary btn-small" id="btnStatsGoals">${i18n.text('התאמת היעדים שלי')}</button>`;
  el('btnStatsGoals').onclick = () => switchTab('goals');
}

function computeStreak() {
  // Consecutive Sunday-start weeks with at least one workout, counting back from this week.
  if (!workouts.length) return 0;
  const weeksWithWorkout = new Set(workouts.filter((w) => new Date(w.dateISO) <= new Date()).map((w) => workoutWeekKey(new Date(w.dateISO))));
  let streak = 0;
  let cursor = new Date();
  while (true) {
    const key = workoutWeekKey(cursor);
    if (weeksWithWorkout.has(key)) {
      streak++;
      cursor.setDate(cursor.getDate() - 7);
    } else break;
  }
  return streak;
}
function workoutWeekKey(date) {
  const start = trainingTools.calendarWeekStart(date);
  return Number.isFinite(start.getTime())
    ? `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}` : '';
}
function countThisWeek() {
  const now = new Date();
  const key = workoutWeekKey(now);
  return workouts.filter((w) => new Date(w.dateISO) <= now && workoutWeekKey(new Date(w.dateISO)) === key).length;
}

function renderVolumeChart() {
  if (!window.Chart) return;
  const ctx = el('volumeChart');
  const sorted = insights.statisticsHistory(workouts).reverse();
  const labels = sorted.map((w) => new Date(w.dateISO).toLocaleDateString(i18n.locale(), { day: '2-digit', month: '2-digit' }));
  const data = sorted.map((w) => Math.round(computeVolume(w)));

  if (volumeChartInstance) volumeChartInstance.destroy();
  volumeChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: i18n.text('נפח (ק"ג)'), data, borderColor: '#96751f', backgroundColor: '#96751f33', tension: 0.3, fill: true }] },
    options: chartBaseOptions(),
  });
}

function renderSetsChart() {
  if (!window.Chart) return;
  const ctx = el('setsChart');
  const sorted = insights.statisticsHistory(workouts).reverse();
  const labels = sorted.map((w) => new Date(w.dateISO).toLocaleDateString(i18n.locale(), { day: '2-digit', month: '2-digit' }));
  const data = sorted.map((w) => w.entries.reduce((b, e) => b + (e.type === 'cardio' ? 0
    : (e.sets || []).filter((set) => set.completed !== false && Number(set.reps) > 0).length), 0));

  if (setsChartInstance) setsChartInstance.destroy();
  setsChartInstance = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ label: i18n.text('סטים'), data, borderColor: '#3b82f6', backgroundColor: '#3b82f633', tension: 0.3, fill: true }] },
    options: chartBaseOptions(),
  });
}

function renderExercisePicker() {
  const select = el('exercisePickerChart');
  const prev = select.value;
  const recorded = new Map();
  insights.statisticsHistory(workouts).forEach((record) => record.entries.forEach((entry) => {
    if (!recorded.has(entry.exerciseId)) recorded.set(entry.exerciseId, entry.exerciseName);
  }));
  select.innerHTML = recorded.size ? [...recorded].map(([id, name]) =>
    `<option value="${escapeAttr(id)}" data-no-translate>${escapeHtml(i18n.exerciseName(name))}</option>`).join('')
    : `<option value="">${i18n.text('אין עדיין תרגילים מתועדים')}</option>`;
  select.disabled = !recorded.size;
  if (prev && recorded.has(prev)) select.value = prev;
  select.onchange = () => {
    renderExerciseProgress();
    if (el('statisticsDetails').open) renderExerciseChart();
  };
  const metricSelect = el('exerciseMetricPicker');
  metricSelect.onchange = renderExerciseChart;
  renderExerciseProgress();
}

function renderExerciseProgress() {
  const result = insights.exerciseProgress(workouts, el('exercisePickerChart').value);
  const explanations = {
    history: 'נדרשים לפחות שני אימונים מתועדים באותו תרגיל כדי להשוות.',
    measurement: 'זהו תרגיל זמן או אירובי. אין להסיק על כוח ממשקל או ממספר חזרות; נתוני הזמן זמינים בפירוט.',
    legacy: 'לרישומים האלה אין זהות ספרייה ופרטי מדידה מאומתים להשוואה. הנתונים נשמרים, בלי להסיק שיפור בכוח.',
    conditions: 'התנאים השתנו בין האימונים: למשל וריאציה, מספר סטים, משקל וחזרות או משקל סיוע. אין מסקנת שיפור חד־משמעית.',
  };
  const message = result.kind === 'same' ? 'אותו משקל ואותן חזרות בשני האימונים האחרונים. זהו ביצוע דומה, לא סימן שצריך להעלות עומס.'
    : result.kind === 'more-weight' ? 'תועד משקל גבוה יותר באותו מספר סטים וחזרות ובאותה וריאציה.'
      : result.kind === 'more-reps' ? `תועדו ${result.delta} חזרות נוספות בסך הכול, באותם משקלים ובאותו מספר סטים.`
        : explanations[result.reason];
  const measurement = result.evidence[0]?.entry;
  const timed = measurement?.type === 'cardio' || measurement?.inputType === 'hold';
  const metrics = timed ? [['seconds', 'זמן בשניות'], ...(measurement.type === 'cardio' ? [] : [['sets', 'סטים שהושלמו']])]
    : [['weight', measurement?.loadKind === 'assistance' ? 'משקל סיוע מקסימלי (ק"ג)' : EXERCISE_METRIC_LABELS.weight],
      ['reps', EXERCISE_METRIC_LABELS.reps], ['sets', EXERCISE_METRIC_LABELS.sets],
      ...(measurement?.loadKind === 'assistance' ? [] : [['volume', EXERCISE_METRIC_LABELS.volume]])];
  const metric = el('exerciseMetricPicker'), previous = metric.value;
  metric.innerHTML = metrics.map(([value, label]) => `<option value="${value}">${escapeHtml(i18n.text(label))}</option>`).join('');
  if (metrics.some(([value]) => value === previous)) metric.value = previous;
  el('exerciseProgressSummary').innerHTML = `<p>${escapeHtml(i18n.text(message))}</p>
    ${result.evidence.length ? `<div class="statistics-evidence">${result.evidence.map((record, index) => {
      const sets = (record.entry.sets || []).filter((set) => set.completed !== false);
      const values = record.entry.type === 'cardio' ? `${Math.round(Number(record.entry.durationSec) || 0)} ${i18n.text('שניות')}`
        : sets.map((set) => record.entry.inputType === 'hold' ? `${Number(set.reps) || 0} ${i18n.text('שניות')}`
          : `${set.weightKg === '' || set.weightKg == null ? '—' : Number(set.weightKg)} ${i18n.text('ק"ג')} × ${Number(set.reps) || 0}`).join(' · ');
      return `<p><strong>${i18n.text(index === 0 ? 'האימון האחרון' : 'האימון הקודם')}</strong>
        <span data-no-translate>${escapeHtml(formatDate(record.dateISO))}</span><br><span data-no-translate>${escapeHtml(values)}</span></p>`;
    }).join('')}</div>` : ''}
    <p class="field-hint">${i18n.text('ההשוואה אינה משנה יעדים או תוכניות. עלייה בעומס דורשת בחירה מפורשת והתאמה לציוד ולהרגשה.')}</p>`;
}

const EXERCISE_METRIC_LABELS = {
  weight: 'משקל מקסימלי (ק"ג)',
  reps: 'חזרות מקסימליות',
  sets: 'מספר סטים',
  volume: 'נפח (משקל × חזרות)',
  seconds: 'זמן בשניות',
};
function renderExerciseChart() {
  if (!window.Chart) return;
  const exId = el('exercisePickerChart').value;
  const metric = el('exerciseMetricPicker').value;
  const ctx = el('exerciseChart');
  const points = [];
  const recentEntry = insights.exerciseProgress(workouts, exId).evidence[0]?.entry;
  insights.statisticsHistory(workouts).reverse().forEach((w) => {
    const entry = w.entries.find((e) => e.exerciseId === exId);
    if (!entry || entry.type !== recentEntry?.type || entry.inputType !== recentEntry?.inputType) return;
    const completedSets = (entry.sets || []).filter((s) => s.completed !== false && Number.isFinite(Number(s.reps)) && Number(s.reps) > 0);
    if (metric !== 'seconds' && !completedSets.length) return;
    let value;
    if (metric === 'seconds') {
      value = entry.type === 'cardio' ? Number(entry.durationSec) : completedSets.reduce((sum, set) => sum + Number(set.reps), 0);
    } else if (metric === 'reps') {
      value = Math.max(...completedSets.map((s) => Number(s.reps)));
    } else if (metric === 'sets') {
      value = completedSets.length;
    } else if (metric === 'volume') {
      if (entry.loadKind === 'assistance') return;
      value = computeVolume({ entries: [entry] });
    } else {
      const weights = completedSets.filter((set) => set.weightKg !== '' && set.weightKg != null
        && Number.isFinite(Number(set.weightKg)) && Number(set.weightKg) >= 0).map((set) => Number(set.weightKg));
      if (!weights.length) return;
      value = Math.max(...weights);
    }
    if (!Number.isFinite(value) || value < 0) return;
    points.push({ date: new Date(w.dateISO).toLocaleDateString(i18n.locale(), { day: '2-digit', month: '2-digit' }), value });
  });
  if (exerciseChartInstance) exerciseChartInstance.destroy();
  exerciseChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: points.map((p) => p.date),
      datasets: [{ label: el('exerciseMetricPicker').selectedOptions[0]?.textContent || i18n.text(EXERCISE_METRIC_LABELS.weight), data: points.map((p) => Math.round(p.value * 10) / 10), borderColor: '#22c55e', backgroundColor: '#22c55e33', tension: 0.3, fill: true }],
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
    const key = workoutWeekKey(d);
    weeks.push(key.replace(/^\d+-/, ''));
    counts.push(insights.statisticsHistory(workouts, now).filter((w) => workoutWeekKey(new Date(w.dateISO)) === key).length);
  }
  if (consistencyChartInstance) consistencyChartInstance.destroy();
  consistencyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: { labels: weeks, datasets: [{ label: i18n.text('אימונים בשבוע'), data: counts, backgroundColor: counts.map((c) => c >= settings.weeklyGoal ? '#16a34a' : '#eab308') }] },
    options: chartBaseOptions(),
  });
}

function renderBodyWeightChart() {
  if (!window.Chart) return;
  const ctx = el('bodyWeightChart');
  const history = profile.weightHistory || [];
  const labels = history.map((h) => new Date(h.dateISO).toLocaleDateString(i18n.locale(), { day: '2-digit', month: '2-digit' }));
  const data = history.map((h) => h.weightKg);
  if (bodyWeightChartInstance) bodyWeightChartInstance.destroy();
  bodyWeightChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{ label: i18n.text('משקל גוף (ק"ג)'), data, borderColor: '#f59e0b', backgroundColor: '#f59e0b33', tension: 0.3, fill: true }],
    },
    options: chartBaseOptions(),
  });
}

function chartBaseOptions() {
  return {
    responsive: true,
    locale: i18n.locale(),
    plugins: { legend: { labels: { color: '#c8ccd8' } } },
    scales: {
      x: { ticks: { color: '#9aa0ad' }, grid: { color: '#20232e' } },
      y: { ticks: { color: '#9aa0ad' }, grid: { color: '#20232e' }, beginAtZero: true },
    },
  };
}

/* ================= EXERCISES TAB ================= */
const EXERCISE_LIBRARY_CATEGORIES = [
  { id: 'supersets', label: 'סופר סטים', icon: '🔗', category: 'סופר סטים' },
  { id: 'warmup', label: 'אירובי / חימום ושחרור', icon: '🔥', category: 'קרדיו', inputType: 'cardio' },
  { id: 'legs', label: 'רגליים', icon: '🦵', category: 'רגליים' },
  { id: 'shoulders', label: 'כתפיים', icon: 'icons/muscle-shoulders.svg', category: 'כתפיים' },
  { id: 'biceps', label: 'יד קדמית', icon: 'icons/muscle-biceps.svg', category: 'יד קדמית' },
  { id: 'triceps', label: 'יד אחורית', icon: 'icons/muscle-triceps.svg', category: 'יד אחורית' },
  { id: 'back', label: 'גב', icon: 'icons/muscle-back.svg', category: 'גב' },
  { id: 'chest', label: 'חזה', icon: 'icons/muscle-chest.svg', category: 'חזה' },
  { id: 'core', label: 'בטן', icon: 'icons/muscle-core.svg', category: 'בטן' },
  { id: 'forearms', label: 'אמות וכף יד', icon: '✊', category: 'אמות' },
  { id: 'traps', label: 'טרפז', icon: 'icons/muscle-traps.svg', category: 'טרפז' },
  { id: 'general', label: 'כללי', icon: '➕', category: 'כללי' },
];
let exerciseLibraryCategory = null;
let exerciseLibraryEnvironment = null;
let exerciseLibraryEquipment = null;
const LIBRARY_ENVIRONMENTS = [
  { id: 'gym', label: 'חדר כושר', icon: '🏋️' },
  { id: 'home', label: 'בית', icon: '🏠' },
  { id: 'outside', label: 'מחוץ לבית', icon: '🌳' },
  { id: 'all', label: 'כל הספרייה', icon: '📚' },
];

function exerciseLibraryCount(count) {
  return count === 1 ? 'תרגיל אחד' : `${count} תרגילים`;
}

function exerciseLibraryGroup(ex) {
  if (ex.inputType === 'cardio' || ex.id === 'warmup' || ex.id === 'cooldown') return 'warmup';
  const category = String(library.exerciseBrowseInfo(ex)?.muscles[0] || ex.category || '').trim();
  if (category.startsWith('רגליים') || ['ישבן', 'שוקיים'].includes(category)) return 'legs';
  if (category.startsWith('כתפיים')) return 'shoulders';
  if (category.startsWith('גב')) return 'back';
  if (category === 'מפרקי כף יד') return 'forearms';
  return EXERCISE_LIBRARY_CATEGORIES.find((group) =>
    !['warmup', 'general'].includes(group.id) && group.category === category)?.id || 'general';
}

function myWorkoutExercises() {
  const selected = exercises.filter((ex) => ex.active !== false);
  return [
    ...selected.filter((ex) => ex.id === 'warmup'),
    ...selected.filter((ex) => ex.id !== 'warmup' && ex.id !== 'cooldown'),
    ...selected.filter((ex) => ex.id === 'cooldown'),
  ];
}

function saveMyWorkoutOrder(ids) {
  const selected = myWorkoutExercises();
  const byId = new Map(selected.map((ex) => [ex.id, ex]));
  if (ids.length !== selected.length || new Set(ids).size !== ids.length || ids.some((id) => !byId.has(id))) {
    showToast('לא ניתן לשמור את הסדר — נסה שוב');
    renderExercisesTab();
    return;
  }
  const ordered = [
    ...selected.filter((ex) => ex.id === 'warmup'),
    ...ids.filter((id) => id !== 'warmup' && id !== 'cooldown').map((id) => byId.get(id)),
    ...selected.filter((ex) => ex.id === 'cooldown'),
  ];
  let index = 0;
  exercises = exercises.map((ex) => byId.has(ex.id) ? ordered[index++] : ex);
  db.saveExercises(exercises);
  renderExercisesTab();
  reorderActiveSessionToMatchExercises();
}

function setExerciseInMyWorkout(ex, included) {
  const stored = exercises.find((exercise) => exercise.id === ex.id);
  if (!stored) {
    const next = [...exercises];
    const cooldownIndex = next.findIndex((exercise) => exercise.id === 'cooldown');
    next.splice(cooldownIndex < 0 ? next.length : cooldownIndex, 0,
      { ...ex, active: included, images: [...(ex.images || [])] });
    try {
      db.saveExercises(next);
    } catch (error) {
      console.error('Catalog exercise installation failed', error);
      showToast('התרגיל לא נשמר. בדוק את האחסון ונסה שוב.');
      return;
    }
    exercises = next;
    renderExercisesTab();
    reorderActiveSessionToMatchExercises();
    showToast(included ? `"${ex.name}" נוסף לאימון שלי` : `"${ex.name}" הוסר מהאימון שלי ונשאר בספרייה`);
    return;
  }
  ex = stored;
  ex.active = included;
  if (included) {
    saveMyWorkoutOrder([...myWorkoutExercises().filter((item) => item.id !== ex.id).map((item) => item.id), ex.id]);
  } else {
    db.saveExercises(exercises);
    renderExercisesTab();
    reorderActiveSessionToMatchExercises();
  }
  showToast(included ? `"${ex.name}" נוסף לאימון שלי` : `"${ex.name}" הוסר מהאימון שלי ונשאר בספרייה`);
}

function wireExercisesTab() {
  el('libraryMuscle').innerHTML = `<option value="">${i18n.text('כל קבוצות השרירים')}</option>${EXERCISE_LIBRARY_CATEGORIES
    .filter((group) => group.id !== 'supersets')
    .map((group) => `<option value="${group.id}">${escapeHtml(i18n.text(group.label))}</option>`).join('')}`;
  el('btnExpandLibrary').addEventListener('click', () => {
    try {
      const expanded = library.expandedLibrary(exercises, { newOnly: true });
      db.saveExercises(expanded);
      exercises = expanded;
      renderExercisesTab();
      showToast('התרגילים נוספו לספרייה בלבד. האימון הקיים לא השתנה.');
    } catch (error) {
      console.error('Exercise library update failed', error);
      showToast('הספרייה לא עודכנה. בדוק את האחסון ונסה שוב.');
    }
  });
  ['librarySearch', 'libraryType', 'libraryEquipment', 'libraryPlace', 'libraryLevel', 'libraryMuscle'].forEach((id) => {
    el(id).addEventListener(id === 'librarySearch' ? 'input' : 'change', () => {
      if (id === 'libraryMuscle') exerciseLibraryCategory = el(id).value || null;
      if (id === 'libraryPlace') {
        exerciseLibraryEnvironment = el(id).value || 'all';
        exerciseLibraryEquipment = 'all';
      }
      renderExercisesTab();
    });
  });
  el('btnClearLibraryFilters').addEventListener('click', () => clearLibraryFilters(true));
  const backToCategories = () => {
    if (exerciseLibraryCategory && exerciseLibraryEquipment === 'muscles') {
      exerciseLibraryCategory = null;
      clearLibraryFilters(true);
    } else if (exerciseLibraryCategory || exerciseLibraryEquipment !== null) {
      exerciseLibraryCategory = null;
      exerciseLibraryEquipment = null;
      clearLibraryFilters(true);
    } else {
      exerciseLibraryEnvironment = null;
      clearLibraryFilters();
    }
    el('exerciseCategoryGrid').scrollIntoView({ block: 'start' });
    qs('[data-category]', el('exerciseCategoryGrid'))?.focus({ preventScroll: true });
  };
  el('btnBackExerciseCategories').addEventListener('click', backToCategories);
  el('btnExerciseCategoryBack').addEventListener('click', backToCategories);
  el('btnSaveMyWorkout').addEventListener('click', () => trainingUI.saveCurrentWorkout());
  el('btnAddExercise').addEventListener('click', () => {
    const group = EXERCISE_LIBRARY_CATEGORIES.find((item) => item.id === exerciseLibraryCategory);
    const draft = { id: db.uid(), name: '', category: group?.category || 'כללי', defaultSets: 3, defaultReps: '12',
      restSeconds: 90, notes: '', images: [], active: exerciseLibraryCategory === 'my',
      inputType: group?.inputType || 'reps', durationMinutes: 5, holdSeconds: 15 };
    openExerciseEditModal(draft, { isNew: true });
  });
}

function clearLibraryFilters(keepEnvironment = false) {
  ['librarySearch', 'libraryType', 'libraryEquipment', 'libraryPlace', 'libraryLevel', 'libraryMuscle'].forEach((id) => { el(id).value = ''; });
  if (!['my', 'supersets'].includes(exerciseLibraryCategory)) exerciseLibraryCategory = null;
  if (keepEnvironment && exerciseLibraryEnvironment && exerciseLibraryEnvironment !== 'all') el('libraryPlace').value = exerciseLibraryEnvironment;
  else if (!keepEnvironment) {
    exerciseLibraryEnvironment = null;
    exerciseLibraryEquipment = null;
  }
  renderExercisesTab();
}

function openExerciseGuide(exercise) {
  const info = library.exerciseGuide(exercise);
  const metadata = info ? `<div class="guide-tags">
      ${[exercise.inputType === 'cardio' ? 'אירובי' : exercise.inputType === 'hold' ? 'החזקות סטטיות' : 'כוח',
        info.level, ...info.equipment].map((value) => `<span>${escapeHtml(value)}</span>`).join('')}
    </div>
    <p class="about-desc"><span>שריר עיקרי</span>: <span>${escapeHtml(info.muscles[0])}</span>
      ${info.muscles.length > 1 ? `<br><span>שרירים מסייעים</span>: ${info.muscles.slice(1).map((muscle) => `<span>${escapeHtml(muscle)}</span>`).join(' · ')}` : ''}</p>
    <h4>${info.activityOnly ? 'הפעילות המתועדת' : 'הווריאציה המודגמת'}</h4><p>${escapeHtml(info.name.he)}</p>
    ${info.activityOnly ? '' : `<figure class="exercise-technique">${library.exerciseIllustration(info, exercise.inputType === 'hold')}
      <figcaption><span>איור הדרכה עם הדגשת שרירים</span>${info.view ? ` · <span>${escapeHtml(info.view.he)}</span>` : ''} · <span>${exercise.inputType === 'hold' ? 'עמדת החזקה' : 'התחלה ← סיום'}</span><br><span>הדגשת השרירים להמחשה בלבד</span></figcaption></figure>`}
    <h4>${info.activityOnly ? 'הכנה ותיעוד' : 'איך מבצעים'}</h4><ol class="guide-steps">${info.steps.map((step) => `<li>${escapeHtml(step.he)}</li>`).join('')}</ol>
    <h4>נשימה ודגשים</h4><p>${escapeHtml(info.cue.he)}</p>
    ${info.videos?.length ? `<h4>סרטוני הדרכה</h4>${info.videos.map((video) => `<a class="btn btn-secondary guide-video" href="${escapeAttr(video.href)}"
      target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer"><span>צפייה בסרטון באתר המקור</span> ↗<small data-no-translate>${escapeHtml(video.publisher)} · ${escapeHtml(video.title)}</small></a>`).join('')}
      ${info === library.EXERCISE_GUIDES.overhead ? '<p class="about-desc">הסרטון מציג פשיטת מרפקים עם משקולת בישיבה. בחר מנח יציב ונוח.</p>' : ''}
      ${exercise.inputType === 'hold' && info.pose === 'bridge' ? '<p class="about-desc">הסרטון מדגים עלייה וירידה לגשר. בתרגיל ההחזקה נשארים בעמדה העליונה ונושמים; אין צורך לחזור על התנועה.</p>' : ''}
      <p class="about-desc">הסרטונים נפתחים באתר חיצוני ובדרך כלל באנגלית. נדרש אינטרנט; ההוראות והאיור זמינים גם בלי רשת.</p>`
      : '<p class="about-desc">עדיין אין סרטון נבחר לתרגיל הזה.</p>'}
    <p class="about-desc">ההדרכה והסינון מתייחסים לווריאציה המוצגת; בתרגילים עם כמה וריאציות, הציוד והביצוע עשויים להשתנות.</p>
    <p class="about-desc">בחר עומס וטווח נוחים. עצור אם מופיע כאב חד; האיור אינו תחליף להדרכה אישית.</p>`
    : '<p class="about-desc">אין עדיין הדרכה מובנית לתרגיל האישי הזה. ההערות והתמונות שלך נשמרו.</p>';
  const dialog = openTrainingDialog(i18n.exerciseName(exercise.name), `
    ${metadata}
    ${exercise.notes ? `<p class="guide-user-notes" data-no-translate data-exercise-notes="${escapeAttr(exercise.notes)}">${escapeHtml(i18n.exerciseNotes(exercise.notes))}</p>` : ''}
    ${exercise.images?.length ? `<details class="guide-saved-images"><summary>תמונות שמורות</summary>${exercise.images
      .map((src) => `<img src="${escapeAttr(src)}" alt="" loading="lazy">`).join('')}</details>` : ''}
    <button class="btn btn-primary guide-membership">${exercise.active !== false ? 'הסר מהאימון שלי' : '+ הוסף לאימון שלי'}</button>
  `, exercise.name);
  qs('.guide-membership', dialog).addEventListener('click', () => {
    setExerciseInMyWorkout(exercise, exercise.active === false);
    dialog.close();
  });
}

const DEFAULT_WARMUP_NAME = 'חימום-הליכה';
const DEFAULT_COOLDOWN_NAME = 'שחרור-הליכה';
const DEFAULT_CARDIO_PACE = 'קצב 6 בהליכון';

function renderExercisesTab() {
  const totals = library.catalogStats(exercises, SEED_EXERCISES);
  const catalog = library.browsableLibrary(exercises, SEED_EXERCISES);
  el('catalogSummary').innerHTML = `<span>מאגר האפליקציה</span>: ${totals.builtIn} <span>תרגילים</span>`;
  el('libraryUpdateCard').classList.toggle('hidden', library.expandedLibrary(exercises, { newOnly: true }).length === exercises.length);
  if (typeof trainingUI !== 'undefined') trainingUI?.refreshDuration();
  const selected = myWorkoutExercises();
  const isMyWorkout = exerciseLibraryCategory === 'my';
  const filters = {
    search: el('librarySearch').value, type: el('libraryType').value, equipment: el('libraryEquipment').value,
    place: el('libraryPlace').value, level: el('libraryLevel').value,
  };
  const place = exerciseLibraryEnvironment && exerciseLibraryEnvironment !== 'all' ? exerciseLibraryEnvironment : filters.place;
  const filtering = !isMyWorkout && [filters.search, filters.type, filters.equipment, filters.level, el('libraryMuscle').value].some(Boolean);
  const showMuscles = exerciseLibraryEquipment === 'muscles';
  const showList = isMyWorkout || !!exerciseLibraryCategory || exerciseLibraryEquipment !== null && !showMuscles || filtering;
  el('btnExerciseCategoryBack').classList.toggle('hidden', !exerciseLibraryEnvironment && !exerciseLibraryCategory && !filtering);
  el('exerciseLibraryFilters').classList.toggle('hidden', isMyWorkout);
  el('libraryAdvancedFilters').classList.toggle('hidden', !showList);
  el('btnClearLibraryFilters').classList.toggle('hidden', !filtering);
  const environment = LIBRARY_ENVIRONMENTS.find((item) => item.id === exerciseLibraryEnvironment);
  const equipmentGroup = library.LIBRARY_EQUIPMENT_GROUPS.find((item) => item.id === exerciseLibraryEquipment);
  const selectedMuscle = EXERCISE_LIBRARY_CATEGORIES.find((item) => item.id === exerciseLibraryCategory);
  el('libraryBrowseTrail').textContent = isMyWorkout ? '' : [environment?.label,
    showMuscles ? 'לפי שריר' : equipmentGroup?.label, selectedMuscle?.label].filter(Boolean).map(i18n.text).join(' / ');
  el('btnSaveMyWorkout').classList.toggle('hidden', !isMyWorkout);
  const grid = el('exerciseCategoryGrid');
  grid.classList.add('library-browse-grid');
  grid.classList.toggle('hidden', showList);
  grid.innerHTML = environment && showMuscles ? EXERCISE_LIBRARY_CATEGORIES.filter((group) =>
    !['my', 'supersets'].includes(group.id)).map((group) => ({
      ...group, count: catalog.filter((ex) => exerciseLibraryGroup(ex) === group.id && library.matchesLibraryBrowse(ex, place)).length,
    })).filter((group) => group.count > 0).map((group) => `
      <button class="exercise-category-button" data-category="${group.id}">
        <span class="exercise-category-icon" aria-hidden="true">${group.icon.endsWith('.svg') ? `<img src="${group.icon}" alt="">` : group.icon}</span>
        <span class="exercise-category-label">${i18n.text(group.id === 'warmup' ? 'אירובי ותנועה' : group.label)}</span>
        <span class="exercise-category-count">${i18n.text(exerciseLibraryCount(group.count))}</span>
      </button>`).join('') : environment ? `
    <button class="exercise-category-button" data-equipment-group="muscles">
      <span class="exercise-category-icon" aria-hidden="true">💪</span><span class="exercise-category-label">לפי שריר</span>
    </button>` + library.LIBRARY_EQUIPMENT_GROUPS.map((group) => ({
    ...group, count: catalog.filter((ex) => library.matchesLibraryBrowse(ex, place, group.id)).length,
  })).filter((group) => group.count > 0).map((group) => `
    <button class="exercise-category-button" data-equipment-group="${group.id}">
      <span class="exercise-category-icon" aria-hidden="true">${group.icon}</span>
      <span class="exercise-category-label">${i18n.text(group.id === 'cardio' ? 'אירובי ותנועה' : group.label)}</span>
      <span class="exercise-category-count">${i18n.text(exerciseLibraryCount(group.count))}</span>
    </button>`).join('') + (trainingTools.SUPERSET_RECIPES.some((recipe) =>
    trainingTools.supersetExercises(recipe.id, exercises).every((part) => library.matchesLibraryBrowse(part, place))) ? `
    <button class="exercise-category-button" data-category="supersets">
      <span class="exercise-category-icon" aria-hidden="true">🔗</span><span class="exercise-category-label">סופר סטים</span>
    </button>` : '') : `
    <button class="exercise-category-button my-workout" data-category="my" aria-pressed="${exerciseLibraryCategory === 'my'}">
      <span class="exercise-category-icon" aria-hidden="true">📋</span>
      <span><span class="exercise-category-label">האימון שלי</span><span class="exercise-category-count">${exerciseLibraryCount(selected.length)} ${selected.length === 1 ? 'נבחר' : 'נבחרו'} · סדר, עריכה והתאמה אישית</span></span>
    </button>
    ${LIBRARY_ENVIRONMENTS.map((group) => `
      <button class="exercise-category-button" data-environment="${group.id}">
        <span class="exercise-category-icon" aria-hidden="true">${group.icon}</span>
        <span class="exercise-category-label">${i18n.text(group.label)}</span>
      </button>`).join('')}`;
  qsa('[data-environment]', grid).forEach((button) => button.onclick = () => {
    exerciseLibraryEnvironment = button.dataset.environment;
    el('libraryPlace').value = exerciseLibraryEnvironment === 'all' ? '' : exerciseLibraryEnvironment;
    renderExercisesTab();
  });
  qsa('[data-equipment-group]', grid).forEach((button) => button.onclick = () => {
    exerciseLibraryEquipment = button.dataset.equipmentGroup;
    renderExercisesTab();
  });
  qsa('[data-category]', grid).forEach((button) => {
    button.addEventListener('click', () => {
      exerciseLibraryCategory = button.dataset.category;
      renderExercisesTab();
    });
  });
  const list = el('exerciseManageList');
  list.innerHTML = '';
  list.onpointerdown = null;
  el('btnAddExercise').classList.remove('hidden');
  el('exerciseLibraryPanel').classList.toggle('hidden', !showList);
  if (!showList) return;
  const group = EXERCISE_LIBRARY_CATEGORIES.find((item) => item.id === exerciseLibraryCategory);
  if (exerciseLibraryCategory === 'supersets') {
    el('exerciseLibraryFilters').classList.add('hidden');
    el('btnAddExercise').classList.add('hidden');
    el('exerciseLibraryTitle').textContent = i18n.text('סופר סטים');
    el('exerciseLibraryCount').textContent = `${trainingTools.SUPERSET_RECIPES.length} ${i18n.text('צמדים')}`;
    el('exerciseLibraryHint').textContent = i18n.text('שני תרגילים ברצף בכל סבב. הרישום והמשקל נפרדים; מנוחה לאחר שני החלקים. אין חובה לוותר על מנוחה כשצריך.');
    for (const recipe of trainingTools.SUPERSET_RECIPES) {
      const parts = trainingTools.supersetExercises(recipe.id, exercises);
      if (!parts.every((part) => library.matchesLibraryBrowse(part, place))) continue;
      const item = document.createElement('section');
      item.className = 'exercise-manage-item';
      item.innerHTML = `<h3>${escapeHtml(i18n.text(recipe.name))}</h3><p>${recipe.reps} ${i18n.text('חזרות לכל חלק')}, 3 ${i18n.text('סבבים')}</p>
        ${parts.map((part, index) => `<p>${index + 1}. <span data-no-translate>${escapeHtml(i18n.exerciseName(part.name))}</span> <button class="btn btn-secondary btn-small" data-part-guide="${index}">${i18n.text('הדרכה')}</button></p>`).join('')}
        <button class="btn btn-primary btn-small" data-add-superset>${i18n.text('הוסף צמד לאימון שלי')}</button><p class="field-hint" role="status"></p>`;
      qsa('[data-part-guide]', item).forEach((button) => button.onclick = () => openExerciseGuide(parts[Number(button.dataset.partGuide)]));
      qs('[data-add-superset]', item).onclick = () => {
        try { trainingAPI().addSuperset(recipe.id); renderExercisesTab(); }
        catch (error) {
          console.error('Superset selection failed', error);
          qs('[role="status"]', item).textContent = i18n.text(error.message);
        }
      };
      list.appendChild(item);
    }
    i18n.translateDOM(list);
    return;
  }
  el('btnAddExercise').classList.remove('hidden');
  const visible = isMyWorkout ? selected : catalog.filter((ex) =>
    (!exerciseLibraryCategory || exerciseLibraryGroup(ex) === exerciseLibraryCategory)
    && library.matchesLibraryBrowse(ex, place, showMuscles ? 'all' : exerciseLibraryEquipment || 'all')
    && library.matchesLibraryFilters(ex, { ...filters, place }, i18n.searchText));
  el('exerciseLibraryTitle').textContent = i18n.text(isMyWorkout ? 'האימון שלי'
    : group?.id === 'warmup' || equipmentGroup?.id === 'cardio' ? 'אירובי ותנועה' : group?.label || equipmentGroup?.label || 'תוצאות החיפוש');
  el('exerciseLibraryCount').textContent = exerciseLibraryCount(visible.length);
  el('exerciseLibraryHint').textContent = isMyWorkout
    ? 'אלה התרגילים שנבחרו לטאב אימון. גרור בידית או שנה את מספר המיקום; חימום נשאר ראשון ושחרור אחרון. לעריכת סטים, חזרות ומנוחה לחץ על העיפרון. נתונים שכבר הוזנו באימון נשמרים גם אם התוכנית משתנה.'
    : 'הוסף תרגילים לאימון שלי, או צור תרגיל חדש בקטגוריה. הסרה מהאימון אינה מוחקת את התרגיל מהספרייה או את ההיסטוריה.';
  visible.forEach((ex, index) => {
    const isCardio = ex.inputType === 'cardio';
    const installed = exercises.some((exercise) => exercise.id === ex.id);
    const fixedPosition = ex.id === 'warmup' || ex.id === 'cooldown';
    const item = document.createElement('div');
    item.className = 'exercise-manage-item' + (isMyWorkout ? ' sortable-item' : '');
    item.dataset.id = ex.id;
    const metaLine = isCardio
      ? `${escapeHtml(ex.category)} &middot; ${ex.durationMinutes || 5} דקות`
      : ex.inputType === 'hold'
        ? `${escapeHtml(ex.category)} &middot; ${ex.defaultSets} סטים × החזקה ${ex.holdSeconds || 15} שניות`
        : `${escapeHtml(ex.category)} &middot; ${ex.defaultSets} סטים × ${escapeHtml(ex.defaultReps)}`;
    item.innerHTML = `
      <div class="exercise-manage-head">
        <div class="exercise-manage-main">
          ${isMyWorkout ? fixedPosition
            ? `<span class="exercise-num" title="חימום ראשון ושחרור אחרון">${index + 1}</span>`
            : `<span class="drag-handle" title="גרור לשינוי סדר">⠿</span>
               <input type="number" class="input exercise-order-input" min="${selected.some((item) => item.id === 'warmup') ? 2 : 1}"
                 max="${selected.length - (selected.some((item) => item.id === 'cooldown') ? 1 : 0)}" value="${index + 1}" aria-label="מיקום ${escapeAttr(ex.name)} באימון">`
            : ''}
          <div class="exercise-manage-copy">
            <b data-no-translate data-exercise-name="${escapeAttr(ex.name)}">${escapeHtml(i18n.exerciseName(ex.name))}</b>
            <div class="exercise-meta">${metaLine}</div>
          </div>
        </div>
        <div class="exercise-manage-actions">
          ${ex.images?.length || library.exerciseGuide(ex) ? '<button class="btn-icon btnShowPhotoManage">📷</button>' : ''}
          <button class="btn-icon btnEditEx" aria-label="עריכת ${escapeAttr(ex.name)}">✏️</button>
          ${fixedPosition || isMyWorkout || !installed ? '' : `<button class="btn-icon btnDeleteEx" aria-label="מחיקת ${escapeAttr(ex.name)} מהספרייה">🗑️</button>`}
        </div>
      </div>
      <button class="btn btn-secondary btn-small btnLibraryGuide">הדרכה</button>
      <button class="btn btn-secondary btn-small exercise-membership-button" aria-pressed="${ex.active !== false}">
        ${isMyWorkout ? 'הסר מהאימון שלי' : ex.active !== false ? '✓ באימון שלי · הסר מהאימון' : '+ הוסף לאימון שלי'}
      </button>
    `;
    qs('.btnLibraryGuide', item).addEventListener('click', () => openExerciseGuide(ex));
    qs('.btnEditEx', item).addEventListener('click', () => openExerciseEditModal(ex, { isNew: !installed }));
    if (!fixedPosition && !isMyWorkout && installed) {
      qs('.btnDeleteEx', item).addEventListener('click', () => {
        if (!confirm(i18n.text(`למחוק את "${ex.name}"? אימוני עבר יישמרו.`))) return;
        exercises = exercises.filter((e) => e.id !== ex.id);
        db.saveExercises(exercises);
        renderExercisesTab();
        reorderActiveSessionToMatchExercises();
      });
    }
    qs('.exercise-membership-button', item).addEventListener('click', () => setExerciseInMyWorkout(ex, ex.active === false));
    const positionInput = qs('.exercise-order-input', item);
    if (positionInput) positionInput.addEventListener('change', () => {
      const position = Number(positionInput.value);
      if (!Number.isInteger(position) || position < Number(positionInput.min) || position > Number(positionInput.max)) {
        positionInput.value = String(index + 1);
        showToast('בחר מספר מיקום בטווח המוצג');
        return;
      }
      const ids = selected.filter((item) => item.id !== ex.id).map((item) => item.id);
      ids.splice(position - 1, 0, ex.id);
      saveMyWorkoutOrder(ids);
    });
    const photoBtnManage = qs('.btnShowPhotoManage', item);
    if (photoBtnManage) photoBtnManage.addEventListener('click', () => openPhotoModal(ex));
    list.appendChild(item);
  });
  if (!visible.length) list.innerHTML = `<div class="exercise-library-empty">${isMyWorkout ? 'האימון שלך עדיין ריק. בחר תרגילים מהקטגוריות למעלה.' : filtering ? 'לא נמצאו תרגילים מתאימים. נסה לשנות את הסינון.' : 'אין עדיין תרגילים בקטגוריה. אפשר להוסיף תרגיל חדש.'}</div>`;
  if (isMyWorkout) makeSortable(list, saveMyWorkoutOrder);
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
  if (ex.inputType === 'cardio') return openCardioEditModal(ex, options);
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
      <label class="field-label">מנוחה (שניות) — ריק משתמש בברירת המחדל מההגדרות</label>
      <input type="number" min="10" class="input" id="editExRest" value="${ex.restSeconds || ''}" placeholder="${settings.restSeconds}">
      <label class="field-label">הערות</label>
      <input class="input" id="editExNotes" value="${escapeAttr(ex.notes || '')}">
      <label class="checkbox-row"><input type="checkbox" id="editExActive" ${ex.active !== false ? 'checked' : ''}> כלול באימונים הבאים</label>

      <p class="edit-program-duration field-hint" data-no-translate></p>
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
  i18n.localizeInput(qs('#editExName', overlay), ex.name, 'name');
  i18n.localizeInput(qs('#editExCategory', overlay), ex.category);
  i18n.localizeInput(qs('#editExReps', overlay), ex.defaultReps || '');
  i18n.localizeInput(qs('#editExNotes', overlay), ex.notes || '', 'notes');
  renderImageGrid();

  qs('#editExInputType', overlay).addEventListener('change', (e) => {
    inputType = e.target.value;
    qs('#editExRepsWrap', overlay).classList.toggle('hidden', inputType === 'hold');
    qs('#editExHoldWrap', overlay).classList.toggle('hidden', inputType !== 'hold');
  });
  qs('#editExInputType', overlay).dispatchEvent(new Event('change'));
  const updateEditDuration = () => {
    const rest = qs('#editExRest', overlay).value.trim();
    showProgramEditDuration(overlay, { ...ex, active: qs('#editExActive', overlay).checked, inputType,
      defaultSets: Math.max(1, Number(qs('#editExSets', overlay).value) || 1),
      defaultReps: i18n.inputValue(qs('#editExReps', overlay)),
      holdSeconds: Math.max(1, Number(qs('#editExHoldSeconds', overlay).value) || 15),
      restSeconds: rest === '' ? 0 : Math.max(10, Number(rest) || 90) }, isNew);
  };
  overlay.addEventListener('input', updateEditDuration);
  overlay.addEventListener('change', updateEditDuration);
  updateEditDuration();

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
    const name = i18n.inputValue(qs('#editExName', overlay)).trim();
    if (!name) { showToast('נא להזין שם לתרגיל'); return; }
    ex.name = name;
    ex.category = i18n.inputValue(qs('#editExCategory', overlay)).trim() || ex.category || 'כללי';
    ex.defaultSets = Math.max(1, Number(qs('#editExSets', overlay).value) || 1);
    ex.inputType = inputType === 'hold' ? 'hold' : 'reps';
    if (ex.inputType === 'hold') {
      ex.holdSeconds = Math.max(1, Number(qs('#editExHoldSeconds', overlay).value) || 15);
      ex.defaultReps = `${ex.holdSeconds} שניות החזקה`;
    } else {
      delete ex.holdSeconds;
      ex.defaultReps = i18n.inputValue(qs('#editExReps', overlay)).trim();
    }
    const restValue = qs('#editExRest', overlay).value.trim();
    ex.restSeconds = restValue === '' ? 0 : Math.max(10, Number(restValue) || 90);
    ex.notes = i18n.inputValue(qs('#editExNotes', overlay)).trim();
    ex.active = qs('#editExActive', overlay).checked;
    ex.images = currentImages;
    const next = isNew ? [...exercises, ex] : exercises;
    try {
      db.saveExercises(next);
    } catch (error) {
      console.error('Exercise edit persistence failed', error);
      showToast('התרגיל לא נשמר. בדוק את האחסון ונסה שוב.');
      return;
    }
    exercises = next;
    if (isNew && !(exerciseLibraryCategory === 'my' && ex.active)) {
      clearLibraryFilters();
      exerciseLibraryEnvironment = 'all';
      exerciseLibraryEquipment = 'all';
      exerciseLibraryCategory = exerciseLibraryGroup(ex);
      el('libraryMuscle').value = exerciseLibraryCategory;
    }
    syncExerciseNameEverywhere(ex);
    renderExercisesTab();
    reorderActiveSessionToMatchExercises();
    close();
    showToast(isNew ? 'התרגיל נוסף ✅' : 'התרגיל נשמר ✅');
  });
}

/* lightweight edit modal for the warm-up/cool-down cardio "exercises" — just a
   name + duration (minutes), no sets/reps/images since their data is duration-based */
function openCardioEditModal(ex, options = {}) {
  const isNew = !!options.isNew;
  const overlay = document.createElement('div');
  overlay.className = 'photo-overlay';
  overlay.innerHTML = `
    <div class="photo-modal">
      <div class="photo-modal-head"><b>${isNew ? 'תרגיל חדש' : 'עריכת תרגיל'}</b><button class="btn-icon btnCloseExEdit">✕</button></div>
      <label class="field-label">שם</label>
      <input class="input" id="editCardioName" value="${escapeAttr(ex.name)}">
      <label class="field-label">משך (דקות)</label>
      <input type="number" min="1" class="input" id="editCardioMinutes" value="${ex.durationMinutes || 5}">
      <label class="field-label">קצב/מהירות ברירת מחדל</label>
      <input class="input" id="editCardioPace" value="${escapeAttr(ex.pace || '')}" placeholder='לדוגמה: 6-10 קמ"ש'>
      <label class="checkbox-row"><input type="checkbox" id="editCardioActive" ${ex.active !== false ? 'checked' : ''}> כלול באימונים הבאים</label>
      <p class="edit-program-duration field-hint" data-no-translate></p>
      <div class="settings-actions">
        <button class="btn btn-primary" id="btnSaveExEdit">שמור</button>
        <button class="btn btn-secondary" id="btnCancelExEdit">ביטול</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  i18n.localizeInput(qs('#editCardioName', overlay), ex.name, 'name');
  i18n.localizeInput(qs('#editCardioPace', overlay), ex.pace || '');
  const updateEditDuration = () => showProgramEditDuration(overlay, { ...ex,
    active: qs('#editCardioActive', overlay).checked,
    durationMinutes: Math.max(1, Number(qs('#editCardioMinutes', overlay).value) || 5) }, isNew);
  overlay.addEventListener('input', updateEditDuration);
  overlay.addEventListener('change', updateEditDuration);
  updateEditDuration();
  const close = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  qs('.btnCloseExEdit', overlay).addEventListener('click', close);
  qs('#btnCancelExEdit', overlay).addEventListener('click', close);
  qs('#btnSaveExEdit', overlay).addEventListener('click', () => {
    const name = i18n.inputValue(qs('#editCardioName', overlay)).trim();
    if (!name) { showToast('נא להזין שם'); return; }
    ex.name = name;
    ex.durationMinutes = Math.max(1, Number(qs('#editCardioMinutes', overlay).value) || 5);
    ex.pace = i18n.inputValue(qs('#editCardioPace', overlay)).trim();
    ex.active = qs('#editCardioActive', overlay).checked;
    const next = isNew ? [...exercises, ex] : exercises;
    try {
      db.saveExercises(next);
    } catch (error) {
      console.error('Cardio edit persistence failed', error);
      showToast('התרגיל לא נשמר. בדוק את האחסון ונסה שוב.');
      return;
    }
    exercises = next;
    if (isNew) {
      clearLibraryFilters();
      exerciseLibraryEnvironment = 'all';
      exerciseLibraryEquipment = 'cardio';
      exerciseLibraryCategory = 'warmup';
      el('libraryMuscle').value = 'warmup';
    }
    syncExerciseNameEverywhere(ex);
    renderExercisesTab();
    reorderActiveSessionToMatchExercises();
    close();
    showToast('נשמר ✅');
  });
}

function showProgramEditDuration(overlay, proposed, isNew) {
  const program = isNew ? [...exercises, proposed] : exercises.map((exercise) => exercise.id === proposed.id ? proposed : exercise);
  const estimate = trainingTools.estimateWorkoutDuration(trainingTools.durationSession(program,
    (exercise) => setsForWeek(exercise)), [], settings.restSeconds);
  qs('.edit-program-duration', overlay).textContent = `${i18n.text('אחרי שמירת העריכה — זמן משוער לאימון שלי')}: ${durationEstimateText(estimate)}`;
}

function syncExerciseNameEverywhere(ex) {
  if (!activeSession) return;
  let changed = false;
  const entries = [...activeSession.entries, ...(activeSession.removedExercises || []).map((item) => item.entry), ...(activeSession.timeBudget?.deferred || []),
    ...(activeSession.substitutions || []).map((item) => item.original)];
  entries.forEach((e) => {
    if (e.exerciseId === ex.id && e.exerciseName !== ex.name) {
      e.exerciseName = ex.name;
      if (e.exerciseSnapshot) e.exerciseSnapshot.name = ex.name;
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
  listEl.onpointerdown = (e) => {
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
    const originalOrder = qsa('.sortable-item', listEl).map((item) => item.dataset.id);
    const onUp = (event) => {
      dragEl.classList.remove('dragging');
      try { dragEl.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      const newOrder = event.type === 'pointercancel' ? originalOrder : qsa('.sortable-item', listEl).map((x) => x.dataset.id);
      onReorder(newOrder);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  };
}

function reorderActiveSessionToMatchExercises() {
  if (!activeSession) return;
  if (activeSession.planId || activeSession.timeBudget || activeSession.substitutions?.length || activeSession.removedExercises?.length || settings.training?.activePlan) {
    showToast('הבחירה נשמרה לתוכנית. האימון המותאם הנוכחי נשאר ללא שינוי.');
    return;
  }
  const warmupEx = exercises.find((e) => e.id === 'warmup');
  const cooldownEx = exercises.find((e) => e.id === 'cooldown');
  const byExId = Object.fromEntries(activeSession.entries.map((e) => [e.exerciseId, e]));
  const strengthExercises = exercises.filter((ex) => ex.id !== 'warmup' && ex.id !== 'cooldown');
  // "progress" means any set was finished OR any weight/reps were typed in — not just
  // completed sets. Otherwise editing the Exercises tab before checking off a single set
  // would wipe out everything the user already typed in the Workout tab.
  const hasProgress = activeSession.entries.some((e) =>
    e.type === 'cardio' ? e.completed || e.startedAt || e.elapsedSec > 0
      : e.sets.some((s) => s.completed || s.weightKg || s.reps || s.holdStartedAt));

  const warmupLogged = byExId.warmup && (byExId.warmup.completed || byExId.warmup.startedAt || byExId.warmup.elapsedSec > 0);
  const cooldownLogged = byExId.cooldown && (byExId.cooldown.completed || byExId.cooldown.startedAt || byExId.cooldown.elapsedSec > 0);
  const warmup = warmupLogged ? byExId.warmup
    : warmupEx && warmupEx.active !== false ? (byExId.warmup || makeCardioEntry('warmup')) : null;
  const cooldown = cooldownLogged ? byExId.cooldown
    : cooldownEx && cooldownEx.active !== false ? (byExId.cooldown || makeCardioEntry('cooldown')) : null;

  if (hasProgress) {
    // mid-workout: never drop logged data — just reorder to match the exercise list,
    // keeping any already-logged entries (even now-inactive/deleted ones) at the end.
    const reordered = strengthExercises.map((ex) => byExId[ex.id]).filter(Boolean);
    const orphan = activeSession.entries.filter((e) =>
      e.exerciseId !== 'warmup' && e.exerciseId !== 'cooldown' && !exercises.some((ex) => ex.id === e.exerciseId));
    activeSession.entries = [warmup, ...reordered, ...orphan, cooldown].filter(Boolean);
  } else {
    // fresh draft: fully sync to the currently-active exercise list (add new, drop deselected)
    const synced = strengthExercises.filter((ex) => ex.active !== false).map((ex) => {
      if (ex.inputType === 'cardio') return byExId[ex.id] || makeCardioEntry(ex.id);
      if (byExId[ex.id]) {
        const entry = byExId[ex.id];
        if (ex.superset) entry.exerciseSnapshot = { ...ex, images: undefined };
        const isBlank = entry.sets.every((s) => !s.completed && !s.weightKg && !s.reps);
        if (isBlank) {
          const desired = setsForWeek(ex);
          while (entry.sets.length < desired) entry.sets.push(makeProgramSet(ex));
          entry.sets.length = desired;
        }
        return entry;
      }
      return {
        exerciseId: ex.id,
        exerciseName: ex.name,
        exerciseSnapshot: { ...ex, images: undefined }, targetReps: ex.targetReps,
        sets: Array.from({ length: setsForWeek(ex) }, () => makeProgramSet(ex)),
      };
    });
    activeSession.entries = [warmup, ...synced, cooldown].filter(Boolean);
  }
  persistActiveSession();
  renderWorkoutTab();
}

/* ---- photo modal ---- */
function openPhotoModal(ex) {
  const info = library.exerciseGuide(ex);
  const savedImages = ex.images || [];
  if (!savedImages.length && !info) { showToast('אין תמונה לתרגיל זה'); return; }
  const stockSchematics = ['images/ex_hammer.png', 'images/ex_plank.png', 'images/ex_shrugs.png'];
  const images = info ? savedImages.filter((src) => !stockSchematics.includes(src)) : savedImages;
  const overlay = document.createElement('div');
  overlay.className = 'photo-overlay';
  overlay.innerHTML = `
    <div class="photo-modal">
      <div class="photo-modal-head"><b data-no-translate data-exercise-name="${escapeAttr(ex.name)}">${escapeHtml(i18n.exerciseName(ex.name))}</b><button class="btn-icon btnClosePhoto">✕</button></div>
      <div class="photo-grid">
        ${images.map((src) => `<img src="${escapeAttr(src)}" alt="${escapeAttr(i18n.exerciseName(ex.name))}" loading="lazy">`).join('')}
        ${!images.length && info ? `<figure class="exercise-technique">${library.exerciseIllustration(info, ex.inputType === 'hold')}
          <figcaption><span>${escapeHtml(info.name.he)}</span> · <span>${ex.inputType === 'hold' ? 'עמדת החזקה' : 'התחלה ← סיום'}</span><br><span>הדגשת השרירים להמחשה בלבד</span></figcaption></figure>` : ''}
      </div>
      ${images.length > 1 ? '<div class="photo-caption">יש כמה אפשרויות ביצוע — בחרו לפי מה שזמין באולם</div>' : ''}
      ${info ? '<button class="btn btn-secondary btnPhotoGuide">הדרכה וסרטונים</button>' : ''}
      ${info && savedImages.some((src) => stockSchematics.includes(src)) ? `<details class="guide-saved-images"><summary>תמונות שמורות</summary>${savedImages
        .filter((src) => stockSchematics.includes(src)).map((src) => `<img src="${escapeAttr(src)}" alt="${escapeAttr(i18n.exerciseName(ex.name))}" loading="lazy">`).join('')}</details>` : ''}
    </div>
  `;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  qs('.btnClosePhoto', overlay).addEventListener('click', () => overlay.remove());
  if (info) qs('.btnPhotoGuide', overlay).addEventListener('click', () => { overlay.remove(); openExerciseGuide(ex); });
  document.body.appendChild(overlay);
  i18n.translateDOM(overlay);
}

/* ================= SETTINGS TAB ================= */
function wireContactTab() {
  const form = el('contactForm');
  const button = el('btnSendContact');
  const status = el('contactStatus');
  const fields = ['contactName', 'contactEmail', 'contactMessage'].map(el);
  let sending = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;
    const [name, email, message] = fields.map((field) => field.value.trim());
    if (!name || !email || !message) {
      status.textContent = i18n.text('יש למלא שם, כתובת מייל ותוכן פנייה.');
      return;
    }
    sending = true;
    button.disabled = true;
    fields.forEach((field) => { field.disabled = true; });
    form.setAttribute('aria-busy', 'true');
    button.textContent = i18n.text('שולח…');
    status.textContent = i18n.text('שולח את הפנייה…');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, _subject: 'AutoFit — Contact' }),
        signal: controller.signal,
      });
      if (!response.ok) {
        status.textContent = i18n.text('השירות לא אישר את השליחה. הפנייה נשמרה בטופס. אפשר לנסות שוב מאוחר יותר.');
        return;
      }
      const result = await response.json();
      if (result.ok !== true) {
        status.textContent = i18n.text('לא התקבל אישור שליחה. הפנייה נשמרה בטופס. בדוק את החיבור לפני ניסיון נוסף.');
        return;
      }
      form.reset();
      status.textContent = i18n.text('הפנייה נשלחה בהצלחה. תודה!');
    } catch (error) {
      console.error('Contact submission failed', error.name);
      status.textContent = i18n.text('לא התקבל אישור שליחה. הפנייה נשמרה בטופס. בדוק את החיבור לפני ניסיון נוסף.');
    } finally {
      clearTimeout(timeout);
      sending = false;
      button.disabled = false;
      fields.forEach((field) => { field.disabled = false; });
      form.setAttribute('aria-busy', 'false');
      button.textContent = i18n.text('שלח פנייה');
    }
  });
}

function wireLanguageControls() {
  const buttons = qsa('[data-language]');
  buttons.forEach((button) => button.addEventListener('click', async () => {
    if (button.dataset.language === i18n.getLanguage()) return;
    buttons.forEach((item) => { item.disabled = true; });
    try {
      const updated = { ...settings, language: button.dataset.language };
      db.saveSettings(updated);
      settings = updated;
      i18n.setLanguage(settings.language);
      privacyUI?.refresh();
      commerceUI?.render();
      if (typeof musicControls !== 'undefined') musicControls?.render();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      announcementPlanKey = '';
      activitySnapshotKey = '';
      syncNativeAnnouncementPlan();
      syncWorkoutActivity();
      if (appInitialized) {
        renderBrand();
        renderHomeTab();
        if (currentTab === 'dashboard') renderDashboard();
        if (currentTab === 'history') renderHistoryTab();
        if (voiceListeningRequested || voiceActivationPending) {
          voiceListeningRevision++;
          voiceListeningActive = false;
          voiceListeningRequested = false;
          voiceFocusedRequested = false;
          if (!await native.voiceStopListening()) throw new Error(i18n.text('לא ניתן להחליף את שפת המיקרופון. נסה שוב.'));
        }
        await updateVoiceListeningState();
      }
    } catch (error) {
      console.error('Language change failed', error);
      if (appInitialized && !voiceListeningActive && settings.voiceCommandsEnabled) {
        voiceListeningError = error.message;
        updateVoiceBadgeForListeningState();
      }
      showToast(i18n.text('החלפת השפה לא הושלמה: {0}').replace('{0}', error.message));
    } finally {
      buttons.forEach((item) => { item.disabled = false; });
    }
  }));
}

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
    syncNativeAnnouncementPlan();
    if (settings.voiceAnnouncements) { primeSpeech(); speak('ההודעות הקוליות הופעלו'); }
  });
  el('settingVoiceInterval30').addEventListener('change', (e) => {
    settings.voiceIntervalAnnouncements = e.target.checked;
    db.saveSettings(settings);
    syncNativeAnnouncementPlan();
  });
  if (native.isNative()) {
    el('faceIdSettingRow').classList.remove('hidden');
    el('permissionsSettingsCard').classList.remove('hidden');
    el('voiceCommandsSettingRow').classList.remove('hidden');
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
    el('btnEnableNotificationsSettings').addEventListener('click', async () => {
      const res = await native.notificationsRequestPermission();
      showToast(res.granted
        ? 'התראות אושרו ✅'
        : `ההרשאה לא אושרה${res.reason ? ' (' + res.reason + ')' : ''} — אם כבר נדחתה בעבר, אשר ידנית בהגדרות האייפון > התראות`);
    });
    el('settingVoiceCommands').addEventListener('change', async (e) => {
      const wantsOn = e.target.checked;
      if (wantsOn) {
        const res = await native.voiceRequestPermission();
        if (!res.granted) {
          showToast(`ההרשאה למיקרופון/זיהוי דיבור לא אושרה${res.reason ? ' (' + res.reason + ')' : ''} — אשר ידנית בהגדרות האייפון > פרטיות > מיקרופון/זיהוי דיבור`);
          e.target.checked = false;
          return;
        }
        showToast('פקודות קוליות הופעלו ✅');
      }
      settings.voiceCommandsEnabled = wantsOn;
      db.saveSettings(settings);
      updateVoiceListeningState();
    });
    el('btnEnableVoiceSettings').addEventListener('click', requestVoiceActivation);
    el('settingVoiceMicrophone').addEventListener('change', async (event) => {
      const mode = event.target.value;
      if (!['automatic', 'headset'].includes(mode)) return;
      try {
        const next = { ...settings, voiceMicrophoneMode: mode };
        db.saveSettings(next);
        settings = next;
        ++voiceListeningRevision;
        voiceListeningActive = false;
        voiceListeningRequested = false;
        voiceFocusedRequested = false;
        voiceActivationPending = false;
        voiceCountingState = null;
        const stopped = await native.voiceStopListening();
        if (!stopped) throw new Error('Cannot restart the microphone');
        await updateVoiceListeningState();
        if (currentTab === 'workout' && settings.voiceCommandsEnabled && !activeSession.paused && !voiceListeningActive) throw new Error(voiceListeningError || 'Microphone unavailable');
        showToast('בחירת המיקרופון נשמרה. בדוק את שם המיקרופון במסך אימון.');
      } catch (error) {
        console.error('Microphone selection failed', error);
        renderSettingsTab();
        voiceListeningError = error.message;
        updateVoiceBadgeForListeningState();
        showToast('שינוי המיקרופון נכשל. נסה להפעיל אותו שוב במסך אימון.');
      }
    });
  }
}

function privacyAPI() {
  return {
    dialog: openTrainingDialog, toast: showToast, isNative: native.isNative,
    getSettings: () => settings,
    saveSettings(next) { db.saveSettings(next); settings = next; },
    async exportData() {
      const data = legal.exportPersonalData(localStorage);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const saved = await shareFile(blob, `AutoFit-personal-data-${data.exportedAt.slice(0, 10)}.json`, 'application/json');
      if (!saved) throw new Error(i18n.text('ייצוא הנתונים לא הושלם.'));
    },
    async exportCloudData() {
      if (!native.isNative()) throw new Error(i18n.text('גיבוי iCloud זמין באפליקציית האייפון בלבד.'));
      if (!legal.hasCurrentConsent(settings)) throw new Error(i18n.text('נדרש אישור התנאים והפרטיות לפני קריאת גיבוי קודם.'));
      const data = legal.exportLegacyCloudData(await native.cloudGetAll());
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      if (!await shareFile(blob, `AutoFit-legacy-iCloud-${data.exportedAt.slice(0, 10)}.json`, 'application/json')) {
        throw new Error(i18n.text('ייצוא הנתונים לא הושלם.'));
      }
    },
    async eraseData({ cloud }) {
      if (typeof cloud !== 'boolean' || cloud && !native.isNative()) throw new Error('Invalid cloud deletion choice');
      if (privacyErasing) throw new Error(i18n.text('מחיקה כבר מתבצעת.'));
      const wasInitialized = appInitialized;
      const next = { ...settings, privacyPreferences: { ...settings.privacyPreferences, cloudBackup: false } };
      db.saveSettings(next);
      settings = next;
      if (wasInitialized && activeSession?.running) pauseWorkout();
      if (native.isNative()) {
        const stopped = await native.voiceStopListening();
        if (!stopped && (voiceListeningActive || voiceActivationPending)) {
          throw new Error(i18n.text('לא ניתן לעצור את המיקרופון. הפסק האזנה ונסה למחוק שוב.'));
        }
        native.bgCancelAnnouncements();
        native.bgStopKeepAlive();
        await native.eraseTemporaryShareFiles();
      }
      stopWorkoutTimers();
      stopwatch.stop();
      activityReadyEnabled = false;
      voiceCountingState = null;
      voiceListeningActive = false;
      voiceListeningRequested = false;
      voiceFocusedRequested = false;
      privacyErasing = true;
      appInitialized = false;
      if (native.isNative()) {
        try {
          await activitySyncChain;
          await native.eraseWorkoutActivity();
          if (cloud) await native.cloudEraseData();
        } catch (error) {
          privacyErasing = false;
          appInitialized = wasInitialized;
          throw error;
        }
      }
      const resumeWrites = db.suspendWrites();
      try {
        legal.eraseLocalPersonalData(localStorage);
      } catch (error) {
        privacyErasing = false;
        appInitialized = wasInitialized;
        resumeWrites();
        throw error;
      }
      appInitialized = false;
      try {
        sessionStorage.setItem('autofit-erasure-notice', cloud ? 'cloud-requested' : 'local');
      } catch (error) {
        console.error('Could not retain privacy deletion notice', error);
        showToast('נתוני המכשיר נמחקו. לא ניתן לשמור הודעת סיום; מינוי, נתוני Health ועותקים חיצוניים לא נמחקו.');
      }
      location.replace(location.pathname);
    },
  };
}

function renderSettingsTab() {
  el('settingRestSeconds').value = settings.restSeconds;
  el('settingWeeklyGoal').value = settings.weeklyGoal;
  el('settingProgramWeek').value = settings.programWeek || 3;
  el('settingVoice').checked = settings.voiceAnnouncements !== false;
  el('settingVoiceInterval30').checked = settings.voiceIntervalAnnouncements !== false;
  if (native.isNative()) {
    el('settingFaceId').checked = settings.faceIdEnabled !== false;
    el('settingVoiceCommands').checked = settings.voiceCommandsEnabled === true;
    el('settingVoiceMicrophone').value = settings.voiceMicrophoneMode || 'automatic';
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
function wireProfilePhoto(buttonId, inputId) {
  const input = el(inputId);
  el(buttonId).addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    el('btnHomePhoto').disabled = true;
    el('btnProfilePhoto').disabled = true;
    try {
      const photoDataUrl = await fileToResizedDataUrl(file);
      const updated = { ...profile, photoDataUrl };
      db.saveProfile(updated);
      profile = updated;
      renderProfilePhotos();
      showToast('תמונת הפרופיל עודכנה');
    } catch (error) {
      console.error('Profile photo update failed', error);
      showToast('לא ניתן לשמור את התמונה. נסה תמונה אחרת או בדוק שיש מקום פנוי במכשיר.');
    } finally {
      input.value = '';
      el('btnHomePhoto').disabled = false;
      el('btnProfilePhoto').disabled = false;
    }
  });
}

function renderProfilePhotos() {
  const src = profile.photoDataUrl || 'icons/icon-192.png';
  for (const id of ['homePhoto', 'workoutProfilePhoto', 'profilePhoto']) {
    const image = el(id);
    if (image.getAttribute('src') !== src) image.src = src;
  }
  el('profilePhotoAction').textContent = profile.photoDataUrl ? 'החלף תמונת פרופיל' : 'העלה תמונת פרופיל';
}

function applyProfileWording() {
  i18n.setGender(profile.gender || 'male');
  if (!appInitialized) return;
  if (typeof musicControls !== 'undefined') musicControls?.render();
  renderBrand();
  renderHomeTab();
  updateVoiceBadgeForListeningState();
  announcementPlanKey = '';
  activitySnapshotKey = '';
  syncNativeAnnouncementPlan();
  syncWorkoutActivity();
}

function wireProfileTab() {
  wireProfilePhoto('btnProfilePhoto', 'profilePhotoInput');
  el('btnSaveProfile').addEventListener('click', async () => {
    const button = el('btnSaveProfile');
    if (button.disabled) return;
    button.disabled = true;
    try {
      if (!el('profileGender').value) { showToast('בחר מין מהרשימה.'); return; }
      if (!await confirmProfileAge(el('profileAge').value)) return;
      const next = { ...profile, name: el('profileName').value.trim(), gender: readProfileGender('profile'), age: el('profileAge').value,
        heightCm: el('profileHeight').value, weightKg: el('profileWeight').value,
        weightHistory: [...(profile.weightHistory || [])] };
      recordWeightHistory(next);
      db.saveProfile(next);
      profile = next;
      applyProfileWording();
      showToast('הפרטים האישיים נשמרו ✅');
    } catch (error) {
      console.error('Profile save failed', error);
      showToast('הפרטים לא נשמרו. בדוק את האחסון ונסה שוב.');
    } finally { button.disabled = false; }
  });
}
function renderProfileTab() {
  renderProfilePhotos();
  el('profileName').value = profile.name || '';
  renderProfileFields('profile', profile);
}

async function confirmProfileAge(age) {
  if (age === '') return true;
  if (!Number.isInteger(Number(age)) || Number(age) < 12 || Number(age) > 120) {
    showToast('הגיל הוא שדה רשות. בחר גיל בין 12 ל-120 או השאר ללא בחירה.');
    return false;
  }
  if (legal.profileAgeAllowed(settings, age)) return true;
  if (await privacyUI.reviewConsent() && legal.profileAgeAllowed(settings, age)) return true;
  showToast('הגיל לא נשמר. יש לבחור מסלול גיל מתאים; בגיל 12–17 נדרש אישור הורה או אפוטרופוס.');
  return false;
}
function renderBrand() {
  el('appBrand').textContent = 'AutoFit';
  const greetingEl = el('greetingText');
  const name = String(profile.name || '').trim();
  if (greetingEl) greetingEl.textContent = `${i18n.text('אימון מוצלח')}${name ? ` ${name}` : ''}`;
  const companionEl = el('workoutCompanionText');
  if (companionEl) companionEl.textContent = `${name ? `${name}, ` : ''}${i18n.text('אני מלווה אותך באימון הזה')}`;
}

/* ================= HOME TAB ================= */
function wireHomeTab() {
  el('homeWeeklyGoal').addEventListener('change', (event) => {
    const weeklyGoal = Number(event.target.value);
    if (!Number.isInteger(weeklyGoal) || weeklyGoal < 1 || weeklyGoal > 7) {
      event.target.value = settings.weeklyGoal;
      showToast('בחר יעד של 1–7 אימונים בשבוע.');
      return;
    }
    try {
      const next = { ...db.getSettings(), weeklyGoal };
      db.saveSettings(next);
      settings = next;
      el('settingWeeklyGoal').value = weeklyGoal;
      renderHomeTab();
    } catch (error) {
      console.error('Failed to save weekly goal', error);
      event.target.value = settings.weeklyGoal;
      showToast('לא ניתן לשמור את היעד השבועי. הנתונים הקודמים נשמרו.');
    }
  });
  wireProfilePhoto('btnHomePhoto', 'homePhotoInput');
  el('btnHomeToDashboard').addEventListener('click', () => switchTab('dashboard'));
  el('btnHomeProgress').addEventListener('click', openHomeProgressModal);
  el('btnHomeStartWorkout').addEventListener('click', () => {
    if (!activeSession.entries.length) {
      exerciseLibraryCategory = null;
      clearLibraryFilters();
      renderExercisesTab();
      switchTab('exercises');
      return;
    }
    switchTab('workout');
    if (!activeSession.running) el('btnStartWorkout').click();
  });
  el('btnHomeEditWorkout').addEventListener('click', () => {
    exerciseLibraryCategory = 'my';
    renderExercisesTab();
    switchTab('exercises');
  });
  el('btnHomeLastWorkout').addEventListener('click', () => {
    const id = el('btnHomeLastWorkout').dataset.workoutId;
    switchTab('history');
    const item = qsa('.history-item', el('historyList')).find((row) => row.dataset.workoutId === id);
    if (item) {
      item.classList.add('open');
      item.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
}

function buildHomeOverview() {
  const entries = activeSession.entries;
  const goal = Math.max(1, Math.round(Number(settings.weeklyGoal) || 3));
  const weekCount = countThisWeek();
  const last = [...workouts].sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO))[0];
  return {
    exerciseCount: entries.length,
    sets: entries.filter((entry) => entry.type !== 'cardio').reduce((sum, entry) => sum + entry.sets.length, 0),
    running: activeSession.running,
    goal, weekCount, percent: Math.min(100, Math.round(weekCount / goal * 100)),
    streak: computeStreak(), total: workouts.length, last,
  };
}

function renderHomeTab() {
  workouts = db.getWorkouts();
  const overview = buildHomeOverview();
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 5 ? 'שלום' : hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב';
  renderProfilePhotos();
  el('homeGreeting').setAttribute('data-no-translate', '');
  el('homeGreeting').textContent = profile.name ? `${i18n.text(greeting)}, ${profile.name}` : `${i18n.text(greeting)}!`;
  el('homeDate').textContent = now.toLocaleDateString(i18n.locale(), { weekday: 'long', day: 'numeric', month: 'long' });
  el('homeWorkoutState').textContent = overview.running ? 'אימון פעיל' : overview.exerciseCount ? 'מוכן לאימון' : 'מתחילים כאן';
  el('homeWorkoutSummary').textContent = overview.exerciseCount
    ? `${exerciseLibraryCount(overview.exerciseCount)} · ${overview.sets ? `${overview.sets} סטים בתוכנית` : 'אימון מבוסס זמן'}`
    : 'בחר תרגילים מהספרייה ובנה את התוכנית שמתאימה לך.';
  el('homeStartLabel').textContent = overview.running ? 'המשך אימון' : overview.exerciseCount ? 'התחל אימון' : 'בנה את האימון שלי';
  el('homeWeekCount').textContent = overview.weekCount;
  el('homeWeekGoal').textContent = `מתוך ${overview.goal} ${overview.goal === 1 ? 'אימון' : 'אימונים'}`;
  el('homeWeeklyGoal').value = String(overview.goal);
  el('homeWorkoutTitle').textContent = trainingTools.sessionWorkoutTitle(activeSession, i18n.text);
  el('homeWorkoutTitle').setAttribute('data-no-translate', '');
  el('homeWeekFill').style.width = `${overview.percent}%`;
  el('homeWeeklyProgress').setAttribute('aria-valuemax', overview.goal);
  el('homeWeeklyProgress').setAttribute('aria-valuenow', Math.min(overview.weekCount, overview.goal));
  el('homeWeeklyProgress').setAttribute('aria-valuetext', `${overview.weekCount} מתוך ${overview.goal} אימונים`);
  el('homeWeekHint').textContent = overview.weekCount >= overview.goal
    ? 'היעד השבועי הושג. כל הכבוד על ההתמדה!'
    : overview.weekCount ? 'עוד צעד קדימה. ממשיכים בקצב שלך.' : 'שבוע חדש, הזדמנות חדשה להתחזק.';
  el('homeStreak').textContent = overview.streak;
  el('homeTotalWorkouts').textContent = overview.total;
  const last = overview.last;
  el('btnHomeLastWorkout').classList.toggle('hidden', !last);
  el('btnHomeLastWorkout').dataset.workoutId = last?.id || '';
  if (last) {
    const sets = last.entries.filter((entry) => entry.type !== 'cardio').reduce((sum, entry) => sum + entry.sets.length, 0);
    el('homeLastDate').textContent = new Date(last.dateISO).toLocaleDateString(i18n.locale(), { weekday: 'short', day: 'numeric', month: 'long' });
    el('homeLastSummary').textContent = `משך: ${formatHMS(last.durationSec)} · ${exerciseLibraryCount(last.entries.length)}${sets ? ` · ${sets} סטים` : ''}`;
  } else {
    el('homeLastDate').textContent = 'האימון הראשון שלך מחכה לך';
    el('homeLastSummary').textContent = 'אחרי שתסיים ותשמור אימון, הסיכום שלו יופיע כאן.';
  }
}

function buildHomeStatCards() {
  workouts = db.getWorkouts();
  const weekCount = countThisWeek();
  const streak = computeStreak();
  const sorted = [...workouts].sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  const lastWorkoutText = sorted.length
    ? new Date(sorted[0].dateISO).toLocaleDateString(i18n.locale(), { day: '2-digit', month: '2-digit' })
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
  const key = workoutWeekKey(new Date());
  const thisWeek = workouts.filter((w) => new Date(w.dateISO) <= new Date() && workoutWeekKey(new Date(w.dateISO)) === key)
    .sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO));
  if (!thisWeek.length) return '<div class="card-hint">עדיין לא בוצע אימון השבוע</div>';
  return `<ul class="home-detail-list">${thisWeek.map((w) => `
    <li><b>${formatDate(w.dateISO)}</b><br>משך: ${formatHMS(w.durationSec)} &middot; נפח: ${Math.round(computeVolume(w)).toLocaleString(i18n.locale())} ק"ג</li>
  `).join('')}</ul>`;
}
function buildWeightHistoryDetailHtml() {
  const history = [...(profile.weightHistory || [])].sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO)).slice(0, 8);
  if (!history.length) return '<div class="card-hint">אין עדיין נתוני משקל שמורים — עדכן בטאב "אישי"</div>';
  return `<ul class="home-detail-list">${history.map((h) => `
    <li><b>${new Date(h.dateISO).toLocaleDateString(i18n.locale(), { day: '2-digit', month: '2-digit', year: 'numeric' })}</b> — ${h.weightKg} ק"ג</li>
  `).join('')}</ul>`;
}
function buildStreakDetailHtml() {
  const now = new Date();
  const rows = [];
  for (let i = 7; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const key = workoutWeekKey(d);
    const count = workouts.filter((w) => new Date(w.dateISO) <= new Date() && workoutWeekKey(new Date(w.dateISO)) === key).length;
    rows.push({ key: key.replace(/^\d+-/, ''), count });
  }
  return `<ul class="home-detail-list">${rows.map((r) => `
    <li>${r.key} — ${r.count} ${r.count === 1 ? 'אימון' : 'אימונים'} ${r.count >= (settings.weeklyGoal || 3) ? '✅' : ''}</li>
  `).join('')}</ul>`;
}
function buildActiveExercisesDetailHtml() {
  const active = exercises.filter((e) => e.active !== false);
  if (!active.length) return '<div class="card-hint">אין תרגילים פעילים</div>';
  return `<ul class="home-detail-list">${active.map((e, i) => `<li>${i + 1}. <span data-no-translate data-exercise-name="${escapeAttr(e.name)}">${escapeHtml(i18n.exerciseName(e.name))}</span> <span class="card-hint">(${escapeHtml(e.category)})</span></li>`).join('')}</ul>`;
}

function openHomeProgressModal() {
  const cards = buildHomeStatCards();
  const overlay = document.createElement('div');
  overlay.className = 'photo-overlay';
  overlay.innerHTML = `
    <div class="photo-modal">
      <div class="photo-modal-head"><b>ההתקדמות שלי</b><button class="btn-icon btnCloseHomeProgress">✕</button></div>
      <div class="home-stats-grid" id="homeProgressGrid"></div>
      <button class="btn btn-secondary home-dashboard-btn" id="btnHomeProgressToDashboard">📈 לסטטיסטיקה המלאה</button>
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
  t.textContent = i18n.text(msg);
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

async function unlockWithBiometrics() {
  if (await native.biometricVerify()) return;
  hideSplash();
  const overlay = document.createElement('div');
  overlay.className = 'photo-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `<div class="photo-modal">
    <div class="photo-modal-head"><b>🔒 AutoFit נעולה</b></div>
    <p class="unlock-status" role="status">האימות לא הושלם. נסה שוב כדי לפתוח את האפליקציה.</p>
    <button class="btn btn-primary btnRetryUnlock">נסה Face ID שוב</button>
  </div>`;
  document.body.appendChild(overlay);
  await new Promise((resolve) => {
    const button = qs('.btnRetryUnlock', overlay);
    button.addEventListener('click', async () => {
      button.disabled = true;
      const verified = await native.biometricVerify();
      if (verified) { overlay.remove(); resolve(); }
      else {
        qs('.unlock-status', overlay).textContent = 'האימות נכשל או בוטל. אפשר לנסות שוב.';
        button.disabled = false;
      }
    });
  });
}

// Native-only bootstrap: sensitive iCloud recovery/export requires an explicit action.
// Returning local users retain their existing Face ID gate.
async function bootstrap() {
  i18n.start(settings.language || 'he', profile.gender || 'male');
  wireLanguageControls();
  if (native.isNative()) {
    settings = db.getSettings();
    profile = db.getProfile();
    workouts = db.getWorkouts();
    activeSession = db.getActiveSession();
    i18n.setGender(profile.gender || 'male');
    i18n.setLanguage(settings.language || 'he');

    if (settings.faceIdEnabled !== false && (settings.onboardingComplete
      || localStorage.getItem('ft_profile_v1') || localStorage.getItem('ft_workouts_v1'))) {
      const bio = await native.biometricIsAvailable();
      if (bio.available) {
        await unlockWithBiometrics();
      }
    }
    db.setSyncHook(null);
    native.onCloudChanged(() => {
      console.info('iCloud backup changed; keeping the local workout intact instead of reloading.');
    });
    native.onVoiceTranscript((data) => handleVoiceTranscript(data && data.transcript));
    native.onVoiceInputChanged((data) => {
      voiceInputName = data.inputName || '';
      updateVoiceBadgeForListeningState();
    });
    native.onVoiceListeningChanged?.(handleVoiceListeningChanged);
    native.onWorkoutActivityOpen(() => {
      if (appInitialized) switchTab('workout');
      else pendingWorkoutNavigation = true;
    });
    native.onWorkoutActivityAvailable(() => {
      activitySnapshotKey = '';
      syncWorkoutActivity();
      native.consumeWorkoutActivityAction?.().then((request) => { if (request) handleWorkoutActivityAction(request); });
    });
    native.onWorkoutActivityAction?.((request) => handleWorkoutActivityAction(request));
    native.onAnnouncementError((data) => showToast('השמעת שמע נכשלה: ' + data.reason));
    native.onVoiceError((data) => {
      voiceListeningRevision++;
      voiceListeningActive = false;
      voiceListeningRequested = false;
      voiceFocusedRequested = false;
      voiceActivationPending = false;
      voiceCountingState = null;
      pendingVoiceFinish = null;
      voiceListeningError = data.reason;
      updateVoiceBadgeForListeningState();
      showToast('זיהוי הדיבור הופסק — ' + data.reason);
    });
  }

  privacyUI = createPrivacyUI(privacyAPI());
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

// Consent precedes personal details; each optional native permission is requested on its own action.
function runOnboarding() {
  const screen = el('onboardingScreen');
  screen.classList.remove('hidden');
  const appRegions = qsa('header.topbar, main#app, nav.tabbar');
  appRegions.forEach((region) => { region.inert = true; });

  el('obName').value = profile.name || '';
  renderProfileFields('ob', profile);

  const stepDetails = el('onboardingStepDetails');
  const stepPermissions = el('onboardingStepPermissions');
  const stepLegal = el('onboardingStepLegal');
  const legalForm = el('onboardingLegalForm');
  legalForm.innerHTML = consentFormHTML();
  privacyUI.bindConsentForm(legalForm.querySelector('form'), () => {
    stepLegal.classList.remove('active');
    stepDetails.classList.add('active');
    el('obName').focus();
  });
  el('btnOnboardingLanguage').addEventListener('click', () => {
    el('onboardingStepLanguage').classList.remove('active');
    stepLegal.classList.add('active');
  });
  const deletionNotice = sessionStorage.getItem('autofit-erasure-notice');
  if (deletionNotice) {
    sessionStorage.removeItem('autofit-erasure-notice');
    showToast(deletionNotice === 'cloud-requested'
      ? 'נתוני המכשיר נמחקו ובקשת מחיקת iCloud נשלחה. זו אינה הוכחת מחיקה מכל העותקים. מינוי ונתוני Health לא נמחקו.'
      : 'נתוני AutoFit במכשיר נמחקו. גיבויים חיצוניים, מינוי ונתוני Health לא נמחקו.');
  }

  function finishOnboarding() {
    if (!legal.hasCurrentConsent(settings)) {
      showToast('נדרש אישור התנאים והפרטיות לפני הזנת פרטים.');
      return;
    }
    settings.onboardingComplete = true;
    db.saveSettings(settings);
    screen.classList.add('hidden');
    appRegions.forEach((region) => { region.inert = false; });
    init();
  }

  const permission = (buttonId, statusId, request, apply) => {
    const button = el(buttonId);
    button.addEventListener('click', async () => {
      if (button.disabled) return;
      button.disabled = true;
      const status = el(statusId);
      status.textContent = '⏳';
      try {
        const result = await request();
        if (apply) apply(result.granted);
        status.textContent = result.granted ? '✓' : '✗';
        if (!result.granted) showToast(result.reason || 'ההרשאה לא אושרה. אפשר להמשיך בהזנה ידנית.');
      } catch (error) {
        console.error('Optional onboarding permission failed', error);
        status.textContent = '✗';
        showToast('ההרשאה לא הושלמה. אפשר להמשיך בהזנה ידנית.');
      } finally { button.disabled = false; }
    });
  };
  permission('btnOnboardingHealth', 'healthPermStatus', native.healthRequestAuthorization);
  permission('btnOnboardingNotifications', 'notifPermStatus', native.notificationsRequestPermission);
  permission('btnOnboardingFaceId', 'faceIdPermStatus', async () => {
    const available = await native.biometricIsAvailable();
    return available.available ? { granted: await native.biometricVerify() } : { granted: false, reason: available.reason };
  }, (granted) => {
    const next = { ...settings, faceIdEnabled: granted };
    db.saveSettings(next);
    settings = next;
  });
  permission('btnOnboardingVoice', 'voicePermStatus', native.voiceRequestPermission, (granted) => {
    const next = { ...settings, voiceCommandsEnabled: granted };
    db.saveSettings(next);
    settings = next;
  });
  if (native.isNative()) {
    if (!localStorage.getItem('ft_exercises_v1') && !localStorage.getItem('ft_workouts_v1')) {
      el('onboardingCloudRestore').classList.remove('hidden');
    }
    const button = el('btnOnboardingRestoreCloud');
    button.addEventListener('click', async () => {
      if (button.disabled || !legal.hasCurrentConsent(settings)) return;
      button.disabled = true;
      try {
        const next = { ...settings, privacyPreferences: { ...settings.privacyPreferences, cloudBackup: false,
          cloudRestore: true, cloudRestoreRequestedAt: new Date().toISOString() } };
        db.saveSettings(next);
        settings = next;
        const result = await restoreFromCloudIfEmpty();
        if (result?.erased) throw new Error(i18n.text('גיבוי קודם סומן למחיקה ולא ישוחזר.'));
        settings = db.getSettings();
        profile = db.getProfile();
        i18n.setGender(profile.gender || 'male');
        workouts = db.getWorkouts();
        activeSession = db.getActiveSession();
        if (settings.faceIdEnabled !== false) {
          const bio = await native.biometricIsAvailable();
          if (bio.available) await unlockWithBiometrics();
        }
        el('obName').value = profile.name || '';
        renderProfileFields('ob', profile);
        showToast(result?.records.length ? 'הגיבוי נטען. בדוק את הפרטים לפני המשך.' : 'לא נמצאו נתוני גיבוי לשחזור. אפשר להמשיך במכשיר הזה.');
      } catch (error) {
        console.error('User-requested iCloud restore failed', error);
        const next = { ...settings, privacyPreferences: { ...settings.privacyPreferences, cloudBackup: false } };
        db.saveSettings(next);
        settings = next;
        showToast(`${i18n.text('השחזור לא הושלם')}: ${error.message}`);
      } finally { button.disabled = false; privacyUI.refresh(); }
    });
  }

  el('btnOnboardingNext').addEventListener('click', async () => {
    const button = el('btnOnboardingNext');
    if (button.disabled) return;
    button.disabled = true;
    try {
      if (!legal.hasCurrentConsent(settings)) { showToast('נדרש אישור התנאים והפרטיות לפני הזנת פרטים.'); return; }
      if (!el('obGender').value) { showToast('בחר מין מהרשימה.'); return; }
      if (!await confirmProfileAge(el('obAge').value)) return;
      const next = { ...profile, name: el('obName').value.trim(), gender: readProfileGender('ob'), age: el('obAge').value,
        heightCm: el('obHeight').value, weightKg: el('obWeight').value,
        weightHistory: [...(profile.weightHistory || [])] };
      recordWeightHistory(next);
      db.saveProfile(next);
      profile = next;
      applyProfileWording();
      if (!native.isNative()) { finishOnboarding(); return; }
      stepDetails.classList.remove('active');
      stepPermissions.classList.add('active');
    } catch (error) {
      console.error('Onboarding profile save failed', error);
      showToast('הפרטים לא נשמרו. בדוק את האחסון ונסה שוב.');
    } finally { button.disabled = false; }
  });

  el('btnOnboardingFinish').addEventListener('click', finishOnboarding);
}

// On first native launch (local storage empty), pull any previously-synced
// data back from iCloud — this is what lets history survive an iPhone reset.
async function restoreFromCloudIfEmpty() {
  const hasLocalData = localStorage.getItem('ft_exercises_v1') || localStorage.getItem('ft_workouts_v1');
  if (hasLocalData) return;
  if (!legal.cloudRestoreAllowed(settings)) throw new Error('Explicit iCloud recovery consent is required');
  const result = legal.restorableCloudData(await native.cloudGetAll(), settings);
  if (result.erased) return result;
  const previous = result.records.map(([key]) => [key, localStorage.getItem(key)]);
  try {
    for (const [key, value] of result.records) localStorage.setItem(key, value);
  } catch (error) {
    for (const [key, value] of previous) {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch (rollbackError) { console.error('iCloud restore rollback failed', key, rollbackError); }
    }
    throw error;
  }
  return result;
}
