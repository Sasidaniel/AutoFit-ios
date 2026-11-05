const RATINGS = new Set(['easy', 'right', 'hard']);
const NUMERIC_FIELDS = {
  durationSec: true, plannedDurationSec: true, actualDurationSec: true,
  weightKg: false, reps: true, speedKmh: false, incline: false,
};

function copy(value) {
  return JSON.parse(JSON.stringify(value));
}

function sameValue(left, right) {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object'
    || Array.isArray(left) !== Array.isArray(right)) return false;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length
    && keys.every((key) => Object.hasOwn(right, key) && sameValue(left[key], right[key]));
}

export function createHistoryDraft(record) {
  const original = copy(record);
  const workout = copy(record);
  const origins = new WeakMap([[workout, original]]);
  workout.entries.forEach((entry, index) => {
    origins.set(entry, original.entries[index]);
    (entry.sets || []).forEach((set, setIndex) => origins.set(set, original.entries[index].sets[setIndex]));
  });
  return { original, workout, origins };
}

export function historyNumber(raw, { integer = false, optional = false } = {}) {
  if (raw == null || (typeof raw === 'string' && !raw.trim())) {
    if (optional) return undefined;
    throw new Error('history-number');
  }
  if (typeof raw !== 'number' && typeof raw !== 'string') throw new Error('history-number');
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) {
    throw new Error('history-number');
  }
  return value;
}

export function historySecondsToMinutes(value) {
  if (value === '' || value == null || !Number.isFinite(Number(value))) return '';
  return String(Number(value) / 60);
}

export function historyMinutesToSeconds(raw, { optional = false } = {}) {
  const minutes = historyNumber(raw, { optional });
  if (minutes === undefined) return undefined;
  const seconds = minutes * 60;
  const rounded = Math.round(seconds);
  if (!Number.isSafeInteger(rounded) || Math.abs(seconds - rounded) > 1e-7) throw new Error('history-number');
  return rounded === 0 ? 0 : rounded;
}

export function addHistorySet(state, entryIndex) {
  const entry = state.workout.entries[entryIndex];
  if (!entry || entry.type === 'cardio') throw new Error('history-entry');
  const set = { weightKg: 0, reps: 0, completed: true };
  (entry.sets ||= []).push(set);
  return set;
}

export function addHistoryExercise(state, exercise) {
  if (!exercise?.id || !exercise.name) throw new Error('history-entry');
  if (state.workout.entries.some((entry) => entry.exerciseId === exercise.id)) throw new Error('history-duplicate');
  const snapshot = copy(exercise);
  const entry = {
    exerciseId: exercise.id, exerciseName: exercise.name, exerciseSnapshot: snapshot,
    ...(exercise.catalogId ? { catalogId: exercise.catalogId } : {}),
    category: exercise.category || '', inputType: exercise.inputType || 'reps',
  };
  if (exercise.inputType === 'cardio') {
    const target = Math.round(historyNumber(exercise.durationMinutes ?? 5) * 60);
    const activity = exercise.cardioActivity || (exercise.catalogId === 'walk' ? 'walk' : exercise.catalogId === 'jog' ? 'run' : undefined);
    Object.assign(entry, { type: 'cardio', durationSec: target, plannedDurationSec: target, inclineUnit: 'level',
      completed: true, location: exercise.location || '', pace: exercise.pace || '',
      ...(activity ? { cardioActivity: activity } : {}),
      ...(exercise.intervals ? { intervals: copy(exercise.intervals) } : {}) });
  } else {
    Object.assign(entry, { loadKind: exercise.loadKind || 'external', sets: [] });
  }
  state.workout.entries.push(entry);
  if (entry.type !== 'cardio') addHistorySet(state, state.workout.entries.length - 1);
  return entry;
}

export function removeHistoryExercise(state, index) {
  if (!state.workout.entries[index]) throw new Error('history-entry');
  state.workout.entries.splice(index, 1);
}

export function removeHistorySet(state, entryIndex, setIndex) {
  const entry = state.workout.entries[entryIndex];
  if (!entry?.sets?.[setIndex]) throw new Error('history-entry');
  entry.sets.splice(setIndex, 1);
}

export function validateHistoryDraft(state) {
  const { workout, origins } = state;
  if (!Array.isArray(workout.entries) || !workout.entries.length) throw new Error('history-empty');
  const validate = (target) => {
    const original = origins.get(target) || {};
    for (const [field, integer] of Object.entries(NUMERIC_FIELDS)) {
      if (target[field] !== original[field] && target[field] !== undefined) {
        historyNumber(target[field], { integer });
      }
    }
    if (target.difficulty !== original.difficulty && target.difficulty !== undefined && !RATINGS.has(target.difficulty)) {
      throw new Error('history-rating');
    }
    if (target.notes !== original.notes && target.notes !== undefined
      && (typeof target.notes !== 'string' || target.notes.length > 500)) throw new Error('history-notes');
    if (target.cardioActivity !== original.cardioActivity && target.cardioActivity !== undefined
      && !['walk', 'run'].includes(target.cardioActivity)) throw new Error('history-activity');
    if (target.cardioDurationSource !== original.cardioDurationSource && target.cardioDurationSource !== undefined
      && !['manual', 'timer'].includes(target.cardioDurationSource)) throw new Error('history-source');
    if (target.inclineUnit !== original.inclineUnit && target.inclineUnit !== undefined
      && !['level', 'percent'].includes(target.inclineUnit)) throw new Error('history-incline');
    if (target.location !== original.location && !['', 'treadmill', 'outside', 'gym', 'home'].includes(target.location)) {
      throw new Error('history-location');
    }
    if (target.cardioMachineId !== original.cardioMachineId && target.cardioMachineId !== undefined
      && (typeof target.cardioMachineId !== 'string' || target.cardioMachineId.length > 100)) throw new Error('history-machine');
  };
  validate(workout);
  workout.entries.forEach((entry) => {
    validate(entry);
    if (entry.type !== 'cardio') {
      if (!Array.isArray(entry.sets) || !entry.sets.length) throw new Error('history-empty-sets');
      entry.sets.forEach(validate);
    }
  });
  return true;
}

export function prepareHistorySave(list, state, { now = new Date().toISOString(), healthReason = 'Edited in AutoFit; Apple Health has not been updated.' } = {}) {
  const current = list.find((record) => record.id === state.original.id);
  if (!current) throw new Error('history-missing');
  if (sameValue(state.workout, state.original)) {
    return { changed: false, workouts: list, record: current };
  }
  validateHistoryDraft(state);
  if (!sameValue(current.entries, state.original.entries)
    || current.durationSec !== state.original.durationSec) throw new Error('history-conflict');
  const entries = state.workout.entries.map((entry) => {
    const saved = copy(entry);
    if (entry.type === 'cardio' && entry.actualDurationSec !== state.origins.get(entry)?.actualDurationSec) {
      if (entry.actualDurationSec === undefined) delete saved.cardioDurationSource;
      else {
        saved.cardioDurationSource = 'manual';
        if (saved.plannedDurationSec === undefined && saved.durationSec !== undefined) {
          saved.plannedDurationSec = saved.durationSec;
        }
      }
    }
    return saved;
  });
  const record = {
    ...current, entries, durationSec: state.workout.durationSec,
    manuallyEdited: true, editedAt: now, healthSyncPending: false,
    healthDeliveryBeforeEdit: current.healthDeliveryBeforeEdit || {
      ...(current.healthDelivery !== undefined ? { healthDelivery: copy(current.healthDelivery) } : {}),
      ...(current.healthSyncedAt !== undefined ? { healthSyncedAt: current.healthSyncedAt } : {}),
      ...(current.healthSyncPending !== undefined ? { healthSyncPending: current.healthSyncPending } : {}),
    },
    healthDelivery: { ...current.healthDelivery, status: 'unknown', reason: healthReason, updatedAt: now, manualEdit: true },
  };
  delete record.healthSyncedAt;
  return { changed: true, record, workouts: list.map((item) => item.id === record.id ? record : item) };
}

export async function saveHistoryDraft(state, { getWorkouts, saveWorkouts, publish, now, healthReason }) {
  const result = prepareHistorySave(getWorkouts(), state, { now, healthReason });
  if (result.changed) {
    const saved = await saveWorkouts(result.workouts);
    if (saved === false) throw new Error('history-storage');
    publish(result.workouts, result.record);
  }
  return result;
}
