const MEASUREMENT_KEYS = ['cardioActivity', 'speedKmh', 'incline', 'inclineUnit', 'cardioMachineId'];

export function walkingActivity(entry, exercise = {}) {
  const snapshot = entry.exerciseSnapshot || exercise;
  if (entry.intervals || snapshot.intervals) return null;
  for (const candidate of [entry.cardioActivity, snapshot.cardioActivity]) {
    if (candidate === 'walk' || candidate === 'run') return candidate;
  }
  if (['warmup', 'cooldown'].includes(entry.exerciseId || entry.id)) return 'walk';
  const guide = snapshot.catalogId || exercise.catalogId;
  if (guide === 'walk') return 'walk';
  if (guide === 'jog') return 'run';
  return null;
}

function optionalNumber(value, label, min, max) {
  if (value == null || typeof value === 'string' && !value.trim()) return null;
  if (typeof value !== 'number' && typeof value !== 'string'
    || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max) {
    throw new RangeError(label);
  }
  return Number(value);
}

export function validateCardioMeasurements(values) {
  if (!['walk', 'run'].includes(values.cardioActivity)) throw new RangeError('בחר הליכה או ריצה');
  if (!['level', 'percent'].includes(values.inclineUnit || 'level')) throw new RangeError('בחר יחידת שיפוע');
  if (!['', 'treadmill', 'outside', 'home', 'gym'].includes(values.location || '')) throw new RangeError('בחר מיקום תקין');
  const machine = String(values.cardioMachineId || '').trim();
  if (machine.length > 100) throw new RangeError('מזהה המכשיר ארוך מדי');
  return { cardioActivity: values.cardioActivity, location: values.location || '',
    speedKmh: optionalNumber(values.speedKmh, 'הזן מהירות תקינה בקמ״ש', 0, 100),
    incline: optionalNumber(values.incline, 'הזן שיפוע תקין', -100, 100),
    inclineUnit: values.inclineUnit || 'level', cardioMachineId: machine };
}

export function elapsedCardioSeconds(entry, now = Date.now()) {
  const banked = Number.isFinite(entry.elapsedSec) ? Math.max(0, entry.elapsedSec) : 0;
  return banked + (entry.startedAt != null && !entry.completed
    ? Math.max(0, (now - entry.startedAt) / 1000) : 0);
}

export function editCardioEntry(entry, values, now = Date.now()) {
  const seconds = Number(values.durationSec);
  if (!Number.isFinite(seconds) || seconds < 30 || seconds > 86400) throw new RangeError('הזן זמן בין חצי דקה ל־24 שעות');
  if (entry.intervals && seconds !== entry.durationSec) throw new RangeError('משך האינטרוולים נקבע לפי המקטעים');
  if (!entry.completed && seconds < elapsedCardioSeconds(entry, now)) throw new RangeError('זמן היעד קצר מהזמן שכבר נמדד');
  const next = { ...entry, durationSec: seconds, plannedDurationSec: seconds, userEdited: true };
  if (Object.hasOwn(values, 'actualDurationSec')) {
    const actual = optionalNumber(values.actualDurationSec, 'הזן זמן ביצוע תקין', 0, 86400);
    if (actual === null) {
      delete next.actualDurationSec;
      delete next.cardioDurationSource;
    } else {
      next.actualDurationSec = Math.round(actual);
      next.cardioDurationSource = 'manual';
    }
  }
  if (values.cardioActivity) {
    const measurements = validateCardioMeasurements(values);
    for (const key of [...MEASUREMENT_KEYS, 'location']) {
      if (measurements[key] === null || measurements[key] === '') delete next[key];
      else next[key] = measurements[key];
    }
  }
  return next;
}

export function completeCardioEntry(entry, now = Date.now(), timerFinished = false) {
  const elapsed = elapsedCardioSeconds(entry, now);
  return { ...entry, plannedDurationSec: entry.plannedDurationSec || entry.durationSec,
    actualDurationSec: Math.round(timerFinished ? entry.durationSec : elapsed > 0 ? Math.min(entry.durationSec, elapsed) : entry.durationSec),
    cardioDurationSource: timerFinished || elapsed > 0 ? 'timer' : 'manual',
    elapsedSec: entry.durationSec, startedAt: null, completed: true,
    completionFeedbackPending: !entry.difficulty };
}

export function resetCardioEntry(entry) {
  const next = { ...entry, elapsedSec: 0, startedAt: null, completed: false };
  for (const key of ['actualDurationSec', 'cardioDurationSource', 'difficulty', 'completionFeedbackPending',
    'resumeAfterPause', 'intervalPhaseIndex']) delete next[key];
  return next;
}

export function cardioHistorySnapshot(entry) {
  const keys = ['exerciseId', 'exerciseName', 'type', 'durationSec', 'plannedDurationSec', 'actualDurationSec',
    'cardioDurationSource', 'completed', 'location', 'pace', 'difficulty', ...MEASUREMENT_KEYS,
    'exerciseSnapshot', 'intervals', 'removedFromWorkout'];
  return Object.fromEntries(keys.filter((key) => entry[key] !== undefined)
    .map((key) => [key, entry[key] && typeof entry[key] === 'object'
      ? JSON.parse(JSON.stringify(entry[key])) : entry[key]]));
}

export function appendWorkoutExercise(session, entry, order = session.entries.map((item) => item.exerciseId)) {
  const existing = [...session.entries, ...(session.removedExercises || []).map((item) => item.entry),
    ...(session.timeBudget?.deferred || []), ...(session.substitutions || []).map((item) => item.original)];
  if (existing.some((item) => item.exerciseId === entry.exerciseId)) throw new Error('התרגיל כבר נמצא באימון או ברשימת השחזור');
  const entries = [...session.entries];
  const cooldown = entries.findIndex((item) => item.exerciseId === 'cooldown');
  entries.splice(cooldown < 0 ? entries.length : cooldown, 0, entry);
  const workoutOrder = order.filter((id) => entries.some((item) => item.exerciseId === id));
  const tail = workoutOrder.indexOf('cooldown');
  workoutOrder.splice(tail < 0 ? workoutOrder.length : tail, 0, entry.exerciseId);
  const includeInRestoreOrder = (ids) => {
    const updated = [...ids];
    const tail = updated.indexOf('cooldown');
    updated.splice(tail < 0 ? updated.length : tail, 0, entry.exerciseId);
    return updated;
  };
  return { ...session, entries, workoutOrder, programPinned: true,
    ...(session.timeBudget ? { timeBudget: { ...session.timeBudget, order: includeInRestoreOrder(session.timeBudget.order) } } : {}),
    ...(session.removedExercises ? { removedExercises: session.removedExercises.map((item) =>
      ({ ...item, ...(item.order ? { order: includeInRestoreOrder(item.order) } : {}) })) } : {}),
    activityControlRevision: (session.activityControlRevision || 0) + 1 };
}

export function measurementFieldsHTML(entry, escape, exercise = {}) {
  const activity = walkingActivity(entry, exercise);
  const duration = `<label class="training-field"><span>זמן יעד (דקות)</span><input class="input cardioMinutes" type="number" min="0.5" max="1440" step="any" ${entry.intervals ? 'readonly' : ''} value="${escape(entry.durationSec / 60)}"></label>`;
  const actual = entry.completed ? `<label class="training-field"><span>זמן בפועל (דקות)</span><input class="input cardioActualMinutes" type="number" min="0" max="1440" step="any" value="${escape(entry.actualDurationSec == null ? '' : entry.actualDurationSec / 60)}"></label>` : '';
  if (!activity) return `<div class="cardio-measurement-fields">${duration}${actual}</div>`;
  return `<div class="cardio-measurement-fields">
    <label class="training-field"><span>פעילות</span><select class="select cardioActivity"><option value="walk" ${activity === 'walk' ? 'selected' : ''}>הליכה</option><option value="run" ${activity === 'run' ? 'selected' : ''}>ריצה</option></select></label>
    ${duration}${actual}
    <label class="training-field"><span>מהירות (קמ״ש)</span><input class="input cardioSpeed" type="number" min="0" max="100" step="any" value="${escape(entry.speedKmh ?? '')}"></label>
    <label class="training-field cardioInclineField"><span>שיפוע</span><input class="input cardioIncline" type="number" min="-100" max="100" step="any" value="${escape(entry.incline ?? '')}"></label>
    <label class="training-field cardioInclineField"><span>יחידת השיפוע</span><select class="select cardioInclineUnit"><option value="level" ${entry.inclineUnit !== 'percent' ? 'selected' : ''}>דרגה במכשיר</option><option value="percent" ${entry.inclineUnit === 'percent' ? 'selected' : ''}>אחוזים (%)</option></select></label>
    </div>`;
}
