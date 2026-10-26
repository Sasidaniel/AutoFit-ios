// db.js — localStorage persistence layer
const KEYS = {
  exercises: 'ft_exercises_v1',
  workouts: 'ft_workouts_v1',
  settings: 'ft_settings_v1',
  activeSession: 'ft_active_session_v1',
  profile: 'ft_profile_v1',
};

export function uid() {
  return Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error('read error', key, e);
    return fallback;
  }
}
let syncHook = null;
let writesSuspended = false;
// Optional transport hook. Personal health records are no longer mirrored to iCloud.
export function setSyncHook(fn) {
  syncHook = fn;
}
export function suspendWrites() {
  const previousHook = syncHook;
  writesSuspended = true;
  syncHook = null;
  return () => { writesSuspended = false; syncHook = previousHook; };
}
function requireWritable() {
  if (writesSuspended) throw new Error('Obsolete write blocked during personal-data deletion');
}
function write(key, value) {
  requireWritable();
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Local data could not be saved', key, error);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('autofit-storage-error', { detail: { key } }));
    }
    throw error;
  }
  if (syncHook) syncHook(key, value);
}

export const DEFAULT_SETTINGS = {
  language: 'he',
  restSeconds: 90,
  weeklyGoal: 3,
  programWeek: 3, // week 1 = 1 set/exercise, week 2 = 2 sets, week 3+ = full (defaultSets)
  voiceAnnouncements: true,
  warmupName: 'חימום — הליכה',
  warmupMinutes: 5,
  cooldownName: 'שחרור — הליכה',
  cooldownMinutes: 5,
  seedSynced: false,
  faceIdEnabled: true,
  voiceCommandsEnabled: true,
  onboardingComplete: false,
};

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) };
}
export function saveSettings(settings) {
  write(KEYS.settings, settings);
}

export function getExercises() {
  return read(KEYS.exercises, []);
}
export function saveExercises(list) {
  write(KEYS.exercises, list);
}

export function saveProgramState(exercises, settings, session) {
  requireWritable();
  const changes = [[KEYS.exercises, exercises], [KEYS.settings, settings], [KEYS.activeSession, session]];
  const previous = changes.map(([key]) => [key, localStorage.getItem(key)]);
  try {
    for (const [key, value] of changes) localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    for (const [key, value] of previous) {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch (rollbackError) {
        console.error('Program rollback failed', key, rollbackError);
      }
    }
    console.error('Program could not be saved', error);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('autofit-storage-error', { detail: { key: KEYS.exercises } }));
    throw error;
  }
  if (syncHook) for (const [key, value] of changes) syncHook(key, value);
}

export function getWorkouts() {
  return read(KEYS.workouts, []);
}
export function saveWorkouts(list) {
  write(KEYS.workouts, list);
}

export const DEFAULT_PROFILE = { name: '', age: '', heightCm: '', weightKg: '', photoDataUrl: '', weightHistory: [] };
export function getProfile() {
  return { ...DEFAULT_PROFILE, ...read(KEYS.profile, {}) };
}
export function saveProfile(profile) {
  write(KEYS.profile, profile);
}

export function getActiveSession() {
  return read(KEYS.activeSession, null);
}
export function saveActiveSession(session) {
  write(KEYS.activeSession, session);
}
export function clearActiveSession() {
  requireWritable();
  try {
    localStorage.removeItem(KEYS.activeSession);
  } catch (error) {
    console.error('Active workout could not be cleared', error);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('autofit-storage-error', { detail: { key: KEYS.activeSession } }));
    throw error;
  }
  if (syncHook) syncHook(KEYS.activeSession, null);
}
