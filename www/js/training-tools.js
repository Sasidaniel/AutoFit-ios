import { LIBRARY_EXERCISES, PLANNING_EXERCISES, exerciseGuide } from './exercise-library.js';

const copy = (value) => JSON.parse(JSON.stringify(value));
export const PLAN_MUSCLES = ['חזה', 'גב', 'רגליים', 'כתפיים', 'יד קדמית', 'יד אחורית', 'בטן', 'ישבן', 'שוקיים'];
const META = {
  squat: ['squat', 'רגליים', ['ישבן'], true], goblet: ['squat', 'רגליים', ['ישבן'], true],
  lunge: ['lunge', 'רגליים', ['ישבן'], true], hinge: ['hinge', 'ישבן', ['רגליים', 'גב תחתון'], true],
  bridge: ['hip-extension', 'ישבן', ['רגליים'], false], calf: ['calf', 'שוקיים', [], false],
  pushup: ['horizontal-push', 'חזה', ['יד אחורית', 'כתפיים'], true],
  chest: ['horizontal-push', 'חזה', ['יד אחורית', 'כתפיים'], true],
  floor: ['horizontal-push', 'חזה', ['יד אחורית'], true],
  fly: ['chest-isolation', 'חזה', ['כתפיים'], false],
  row: ['horizontal-pull', 'גב', ['יד קדמית'], true],
  oneRow: ['horizontal-pull', 'גב', ['יד קדמית'], true],
  bandRow: ['horizontal-pull', 'גב', ['יד קדמית'], true],
  pulldown: ['vertical-pull', 'גב', ['יד קדמית'], true],
  assisted: ['vertical-pull', 'גב', ['יד קדמית'], true],
  shoulder: ['vertical-push', 'כתפיים', ['יד אחורית'], true],
  dumbbellPress: ['vertical-push', 'כתפיים', ['יד אחורית'], true],
  triceps: ['elbow-extension', 'יד אחורית', [], false],
  overhead: ['elbow-extension', 'יד אחורית', [], false],
  curl: ['elbow-flexion', 'יד קדמית', [], false], hammer: ['elbow-flexion', 'יד קדמית', ['אמות'], false],
  front: ['shoulder-flexion', 'כתפיים', [], false], lateral: ['shoulder-abduction', 'כתפיים', [], false],
  shrug: ['shrug', 'טרפז', [], false], back: ['back-extension', 'גב תחתון', [], false],
  deadbug: ['core-control', 'בטן', [], false], birdDog: ['core-control', 'בטן', ['גב תחתון'], false],
  plank: ['core-hold', 'בטן', [], false], sidePlank: ['lateral-core-hold', 'בטן', [], false],
  wallSit: ['squat-hold', 'רגליים', [], false], farmer: ['grip-hold', 'אמות', ['טרפז'], false],
  walk: ['walk', 'רגליים', [], false], march: ['walk', 'רגליים', [], false],
  jog: ['jog', 'רגליים', [], false],
  legPress: ['squat', 'רגליים', ['ישבן'], true],
  legCurl: ['knee-flexion', 'רגליים', [], false],
  chairStand: ['squat', 'רגליים', ['ישבן'], true],
  wallPushup: ['horizontal-push', 'חזה', ['יד אחורית', 'כתפיים'], true],
  kneePushup: ['horizontal-push', 'חזה', ['יד אחורית', 'כתפיים'], true],
  inclinePushup: ['horizontal-push', 'חזה', ['יד אחורית', 'כתפיים'], true],
  trxRow: ['horizontal-pull', 'גב', ['יד קדמית'], true],
  bentRow: ['horizontal-pull', 'גב', ['יד קדמית'], true],
  bandBentRow: ['horizontal-pull', 'גב', ['יד קדמית'], true],
  splitSquat: ['lunge', 'רגליים', ['ישבן'], true],
  sumoSquat: ['squat', 'רגליים', ['ישבן'], true],
  singleBridge: ['hip-extension', 'ישבן', ['רגליים'], false],
  clamShell: ['hip-abduction', 'ישבן', [], false],
  singleCalf: ['calf', 'שוקיים', [], false],
  standingPress: ['vertical-push', 'כתפיים', ['יד אחורית'], true],
  rearFly: ['shoulder-horizontal-abduction', 'כתפיים', ['גב'], false],
  alternatingCurl: ['elbow-flexion', 'יד קדמית', [], false],
  concentrationCurl: ['elbow-flexion', 'יד קדמית', [], false],
  kickback: ['elbow-extension', 'יד אחורית', [], false],
  closePushup: ['horizontal-push', 'יד אחורית', ['חזה', 'כתפיים'], true],
  lyingTriceps: ['elbow-extension', 'יד אחורית', [], false],
  heelTap: ['core-control', 'בטן', [], false],
  reverseCrunch: ['core-flexion', 'בטן', [], false],
  kneeSidePlank: ['lateral-core-hold', 'בטן', [], false],
  reverseCurl: ['elbow-flexion', 'אמות', ['יד קדמית'], false],
  stepTouch: ['walk', 'רגליים', [], false],
};

export function planningCatalog(catalog) {
  const proposals = [...PLANNING_EXERCISES, ...LIBRARY_EXERCISES.filter((exercise) => exercise.id.startsWith('library:extended-'))];
  return [...catalog, ...proposals.filter((candidate) =>
    !catalog.some((exercise) => exercise.id === candidate.id
      || exercise.catalogId === candidate.catalogId && exercise.name === candidate.name)).map(copy)];
}

export function planExercise(exercise) {
  return Object.fromEntries(['id', 'catalogId', 'name', 'category', 'inputType', 'defaultSets', 'defaultReps',
    'targetReps', 'targetWeightKg', 'restSeconds', 'holdSeconds', 'durationMinutes', 'loadKind', 'location', 'pace', 'intervals']
    .filter((key) => exercise[key] !== undefined).map((key) => [key, key === 'intervals' ? copy(exercise[key]) : exercise[key]]));
}

export function createSavedWorkout(name, state, id) {
  const title = String(name || '').trim();
  if (!title || title.length > 80) throw new Error('Enter a workout name of 1–80 characters');
  const selected = state.exercises.filter((exercise) => exercise.active !== false);
  if (!selected.length) throw new Error('Choose at least one exercise before saving');
  const exercises = selected.sort((a, b) => state.program.entries.findIndex((entry) => entry.exerciseId === a.id)
    - state.program.entries.findIndex((entry) => entry.exerciseId === b.id)).map((exercise) => {
    const entry = state.program.entries.find((item) => item.exerciseId === exercise.id);
    if (!entry) throw new Error('The selected program changed; reopen the save dialog');
    return { ...planExercise(exercise), targetWeightKg: exercise.targetWeightKg ?? null,
      ...(exercise.inputType !== 'cardio' ? { defaultSets: entry.sets.length,
        restSeconds: Number(exercise.restSeconds) > 0 ? Number(exercise.restSeconds) : state.settings.restSeconds || 90 } : {}) };
  });
  return { id, name: title, kind: 'saved-workout', options: { goal: 'custom', days: 1 },
    sessions: [{ exercises }], omitted: [] };
}

export function trainingMetadata(exercise) {
  // A generic seed guide is not evidence of the equipment variant actually performed.
  const key = exercise?.catalogId;
  const info = key && exerciseGuide(exercise);
  const meta = key && Object.hasOwn(META, key) ? META[key] : info?.movement
    ? [info.movement, info.muscles[0], info.muscles.slice(1), info.compound === true] : null;
  return info && meta ? { movement: meta[0], primary: meta[1], secondary: meta[2], compound: meta[3], equipment: info.equipment } : null;
}

export function editSavedPlanExercise(original, changes) {
  const next = copy(original);
  const limits = { defaultSets: [1, 100, true], targetReps: [1, 10000, true],
    restSeconds: [1, 3600, true], holdSeconds: [1, 86400, false],
    durationMinutes: [0.01, 1440, false], targetWeightKg: [0, 5000, false] };
  for (const [key, value] of Object.entries(changes)) {
    if (key === 'defaultReps' || key === 'pace') {
      const text = String(value).trim();
      if (text.length > 80 || key === 'defaultReps' && !text) throw new RangeError('Invalid saved exercise target');
      next[key] = text;
    } else if (Object.hasOwn(limits, key)) {
      if (value === '' && ['targetReps', 'targetWeightKg'].includes(key)) {
        if (key === 'targetReps') delete next[key];
        else next[key] = null;
        continue;
      }
      const number = Number(value);
      const [min, max, integer] = limits[key];
      if (value === '' || !Number.isFinite(number) || number < min || number > max || integer && !Number.isInteger(number)) {
        throw new RangeError('Invalid saved exercise target');
      }
      if (original.intervals && key === 'durationMinutes') throw new Error('Keep the interval recipe intact');
      next[key] = number;
    } else throw new Error('Unsupported saved exercise change');
  }
  return next;
}

export function replaceSavedPlan(plans, original, draft) {
  const index = plans.findIndex((plan) => plan.id === original.id);
  if (index < 0 || JSON.stringify(plans[index]) !== JSON.stringify(original)) {
    throw new Error('The saved plan changed; reopen the editor');
  }
  if (draft.id !== original.id || !String(draft.name || '').trim() || draft.name.length > 80) {
    throw new Error('Enter a workout name of 1–80 characters');
  }
  if (!draft.sessions?.length || draft.sessions.length !== original.sessions.length) throw new Error('Keep every workout day');
  for (const day of draft.sessions) {
    if (!day.exercises.length) throw new Error('Keep at least one exercise per workout');
    if (new Set(day.exercises.map((exercise) => exercise.id)).size !== day.exercises.length) {
      throw new Error('Choose distinct exercises in each session');
    }
    if (day.splitMuscles && day.exercises.some((exercise) => !day.splitMuscles.includes(trainingMetadata(exercise)?.primary))) {
      throw new Error('Selected muscle groups do not cover every split day');
    }
    const required = day.requiredMuscles || draft.options?.muscles || [];
    if (required.some((muscle) => !day.exercises.some((exercise) => trainingMetadata(exercise)?.primary === muscle))
      || draft.options?.muscles?.length && day.exercises.some((exercise) => !draft.options.muscles.includes(trainingMetadata(exercise)?.primary))) {
      throw new Error('Keep every selected muscle group in the plan');
    }
  }
  return plans.map((plan, position) => position === index ? copy(draft) : plan);
}

export function planIdentity(plan, day) {
  return { id: plan.id, day, name: plan.name || '', goal: plan.options?.goal || 'custom',
    dayLabel: plan.sessions[day].label || String(day + 1), days: plan.sessions.length,
    ...(plan.options?.goal === 'rope' ? { ropeLevel: plan.options.ropeLevel, minutes: plan.options.minutes } : {}) };
}

export function sessionWorkoutTitle(session, translate = (text) => text) {
  const plan = session.planSnapshot;
  if (!plan) return translate('האימון שלי');
  const goals = { strength: 'כוח', muscle: 'בניית שריר', fitness: 'כושר כללי / ניהול משקל',
    walk: 'מתחילים ללכת', run: 'מתחילים לרוץ', rope: 'קפיצה על חבל' };
  let title = plan.name || translate(goals[plan.goal] || 'אימון שמור');
  if (!plan.name && plan.goal === 'rope') {
    const level = { beginner: 'מתחילים', intermediate: 'בינונית', advanced: 'גבוהה' }[plan.ropeLevel];
    if (level) title += ` · ${translate(level)}`;
    if (Number.isFinite(plan.minutes) && plan.minutes > 0) title += ` · ${plan.minutes} ${translate('דקות')}`;
  }
  return plan.days > 1 ? `${title} · ${translate('אימון')} ${plan.day + 1} (${plan.dayLabel})` : title;
}

export function calendarWeekStart(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function alternatives(exercise, catalog) {
  const source = trainingMetadata(exercise);
  if (!source || exercise.inputType === 'cardio') return [];
  return catalog.filter((candidate) => {
    const target = trainingMetadata(candidate);
    return candidate.id !== exercise.id && candidate.inputType === exercise.inputType && target
      && target.movement === source.movement && target.primary === source.primary
      && (candidate.loadKind || 'external') === (exercise.loadKind || 'external')
      && !source.equipment.every((item) => target.equipment.includes(item));
  });
}

export function entryHasActivity(entry) {
  return entry.type === 'cardio' ? !!(entry.completed || entry.startedAt || entry.resumeAfterPause || entry.elapsedSec > 0 || entry.userEdited)
    : !!entry.userEdited || entry.sets.some((set) => set.completed || set.holdStartedAt || set.resumeAfterPause || set.holdElapsedSec > 0 || set.notes
      || !entry.exerciseSnapshot && (set.weightKg !== '' || set.reps !== ''));
}

export function removeWorkoutExercise(session, exerciseId) {
  if (session.running) throw new Error('Pause the workout before changing removed exercises');
  const result = copy(session);
  const index = result.entries.findIndex((entry) => entry.exerciseId === exerciseId);
  if (index < 0 || result.removedExercises?.some((item) => item.entry.exerciseId === exerciseId)) {
    throw new Error('The workout exercise changed; reopen the action');
  }
  const entry = result.entries[index];
  if (entry.startedAt || entry.sets?.some((set) => set.holdStartedAt)) {
    throw new Error('Pause the workout before changing removed exercises');
  }
  result.removedExercises ||= [];
  const order = result.timeBudget?.order || result.removedExercises[0]?.order;
  result.removedExercises.push({ entry, order: order?.includes(exerciseId) ? order : result.entries.map((item) => item.exerciseId) });
  result.entries.splice(index, 1);
  if (result.currentExerciseId === exerciseId) delete result.currentExerciseId;
  if (result.lastCompletedSet?.exerciseId === exerciseId) delete result.lastCompletedSet;
  if (result.pausedVoiceCount?.exerciseId === exerciseId) delete result.pausedVoiceCount;
  result.programPinned = true;
  result.activityControlRevision = (result.activityControlRevision || 0) + 1;
  return result;
}

export function restoreWorkoutExercise(session, exerciseId) {
  if (session.running) throw new Error('Pause the workout before changing removed exercises');
  const result = copy(session);
  const removed = result.removedExercises?.find((item) => item.entry.exerciseId === exerciseId);
  if (!removed || result.entries.some((entry) => entry.exerciseId === exerciseId)) {
    throw new Error('The workout exercise changed; reopen the action');
  }
  const originalIndex = removed.order.indexOf(exerciseId);
  const next = removed.order.slice(originalIndex + 1).find((id) => result.entries.some((entry) => entry.exerciseId === id));
  const previous = removed.order.slice(0, originalIndex).reverse().find((id) => result.entries.some((entry) => entry.exerciseId === id));
  const index = next ? result.entries.findIndex((entry) => entry.exerciseId === next)
    : previous ? result.entries.findIndex((entry) => entry.exerciseId === previous) + 1 : Math.min(originalIndex, result.entries.length);
  result.entries.splice(index, 0, removed.entry);
  result.removedExercises = result.removedExercises.filter((item) => item !== removed);
  if (!result.removedExercises.length) delete result.removedExercises;
  result.activityControlRevision = (result.activityControlRevision || 0) + 1;
  return result;
}

export function workoutHistoryEntries(session) {
  return [...session.entries, ...(session.removedExercises || []).map(({ entry }) => ({ ...entry, removedFromWorkout: true }))];
}

export function currentWorkoutEntry(session) {
  const unfinished = (entry) => entry.type === 'cardio' ? !entry.completed : entry.sets.some((set) => !set.completed);
  return session.entries.find((entry) => entry.exerciseId === session.currentExerciseId && unfinished(entry))
    || session.entries.find((entry) => unfinished(entry) && (entry.type === 'cardio' ? entry.startedAt || entry.resumeAfterPause
      : entry.sets.some((set) => set.holdStartedAt || set.resumeAfterPause)))
    || session.entries.find(unfinished);
}

export function durationSession(program, setCount = (exercise) => Math.max(1, exercise.defaultSets || 1)) {
  return { entries: program.filter((exercise) => exercise.active !== false).map((exercise) =>
    exercise.inputType === 'cardio'
      ? { exerciseId: exercise.id, type: 'cardio', durationSec: (exercise.durationMinutes || 5) * 60, exerciseSnapshot: exercise }
      : { exerciseId: exercise.id, exerciseSnapshot: exercise, targetReps: exercise.targetReps,
        sets: Array.from({ length: setCount(exercise) }, () => ({ completed: false })) }) };
}

export function estimateEntryDuration(entry, exercise, defaultRest = 90, { remaining = true, now = Date.now() } = {}) {
  const result = { seconds: 0, lowSeconds: 0, highSeconds: 0, restSeconds: 0, unknownRepSets: 0 };
  const add = (seconds, low = seconds, high = seconds) => {
    result.seconds += seconds;
    result.lowSeconds += low;
    result.highSeconds += high;
  };
  if (entry.type === 'cardio') {
    if (remaining && entry.completed) return result;
    const elapsed = remaining ? Math.max(0, Number(entry.elapsedSec) || 0)
      + (entry.startedAt ? Math.max(0, (now - Number(entry.startedAt)) / 1000) : 0) : 0;
    add(Math.max(0, (Number(entry.durationSec) || 0) - elapsed));
    if (!remaining || !elapsed && !entry.startedAt && !entry.resumeAfterPause) add(20, 10, 30);
    return result;
  }
  const sets = (entry.sets || []).filter((set) => !remaining || !set.completed);
  if (!sets.length) return result;
  const rest = Number(exercise?.restSeconds) > 0 ? Number(exercise.restSeconds) : Number(defaultRest) > 0 ? Number(defaultRest) : 90;
  const sides = exerciseGuide(exercise || {})?.sides
    || (['oneRow', 'lunge', 'birdDog', 'deadbug', 'sidePlank'].includes(exercise?.catalogId) ? 2 : 1);
  for (const set of sets) {
    if (exercise?.inputType === 'hold') {
      const target = Math.max(0, Number(set.reps) || Number(exercise.holdSeconds) || 15);
      const elapsed = remaining ? set.holdStartedAt ? Math.max(0, (now - Number(set.holdStartedAt)) / 1000)
        : Math.max(0, Number(set.holdElapsedSec) || 0) : 0;
      add(Math.max(0, sides * target - elapsed));
    } else {
      const prescribed = set.reps || set.voiceTargetReps || set.targetReps || entry.targetReps || exercise?.defaultReps;
      const numeric = Number(prescribed);
      const range = typeof prescribed === 'string' && prescribed.match(/^\s*(\d+)\s*[-–]\s*(\d+)\s*$/);
      const lowReps = numeric > 0 ? numeric : range ? Math.min(Number(range[1]), Number(range[2])) : 8;
      const highReps = numeric > 0 ? numeric : range ? Math.max(Number(range[1]), Number(range[2])) : 15;
      if (!(numeric > 0) && !range) result.unknownRepSets++;
      add(sides * Math.max(20, (numeric > 0 ? numeric : (lowReps + highReps) / 2) * 2.5),
        sides * Math.max(15, lowReps * 2), sides * Math.max(25, highReps * 3));
    }
  }
  // The actual controller starts a full rest after EVERY strength/hold set, including the final set.
  result.restSeconds = sets.length * rest;
  add(result.restSeconds);
  if (!remaining || !(entry.sets || []).some((set) => set.completed || set.holdStartedAt || set.resumeAfterPause || set.holdElapsedSec > 0)) add(22.5, 15, 30);
  return result;
}

export function estimateWorkoutDuration(session, catalog = [], defaultRest = 90, options = {}) {
  const result = { seconds: 0, lowSeconds: 0, highSeconds: 0, restSeconds: 0, unknownRepSets: 0 };
  const byId = new Map(catalog.map((exercise) => [exercise.id, exercise]));
  for (const entry of session.entries) {
    const exercise = { ...byId.get(entry.exerciseId), ...entry.exerciseSnapshot };
    const estimate = estimateEntryDuration(entry, exercise, defaultRest, { remaining: false, ...options });
    for (const key of Object.keys(result)) result[key] += estimate[key];
  }
  if (options.remaining && options.restSeconds > 0) {
    // This is the unexpired rest for an already-completed set, not another future set.
    for (const key of ['seconds', 'lowSeconds', 'highSeconds', 'restSeconds']) result[key] += options.restSeconds;
  }
  return result;
}

export function estimateEntrySeconds(entry, exercise, defaultRest = 90) {
  return estimateEntryDuration(entry, exercise, defaultRest).seconds;
}

function budgetRole(exercise) {
  const meta = trainingMetadata(exercise);
  const info = exercise && exerciseGuide(exercise);
  const category = exercise?.category || '';
  let primary = meta?.primary || (category.startsWith('רגליים') ? 'רגליים'
    : category.startsWith('כתפיים') ? 'כתפיים' : category === 'גב תחתון' ? category
      : category.startsWith('גב') ? 'גב' : category) || META[info?.pose]?.[1];
  const main = ['חזה', 'גב', 'גב תחתון', 'רגליים', 'ישבן', 'שוקיים', 'כתפיים', 'יד קדמית', 'יד אחורית', 'בטן'];
  if (!main.includes(primary) && !['אמות', 'מפרקי כף יד', 'טרפז'].includes(primary)) {
    primary = META[info?.pose]?.[1] || primary;
  }
  if (primary === 'גב תחתון') primary = 'גב';
  const group = main.includes(primary) ? primary : null;
  const optional = exercise?.inputType === 'hold' || exercise?.loadKind === 'assistance'
    || info?.pose === 'assisted' || exercise?.catalogId === 'hammer' || info?.name.he === 'פטישים'
    || ['אמות', 'מפרקי כף יד'].includes(primary);
  return { group, known: !!group || !!info || !!meta || ['אמות', 'מפרקי כף יד', 'טרפז'].includes(category),
    priority: optional ? 5 : meta?.compound || META[info?.pose]?.[3] ? 1 : group ? 2 : 3 };
}

export function timeBudgetProposal(session, catalog, minutes, defaultRest = 90, currentRestSeconds = 0) {
  if (!Number.isFinite(minutes) || minutes < 10 || minutes > 180) throw new RangeError('Budget must be 10–180 minutes');
  const baseline = session.timeBudget ? restoreTimeBudget(session) : session;
  const currentId = baseline.currentExerciseId || baseline.running ? currentWorkoutEntry(baseline)?.exerciseId : null;
  const rows = baseline.entries.map((entry, index) => {
    const exercise = entry.exerciseSnapshot || catalog.find((item) => item.id === entry.exerciseId);
    const role = budgetRole(exercise);
    return { entry, index, ...estimateEntryDuration(entry, exercise, defaultRest),
      group: entry.type === 'cardio' ? null : role.group,
      protected: entryHasActivity(entry) || entry.exerciseId === currentId || entry.type !== 'cardio' && !role.known,
      priority: entry.exerciseId === 'warmup' ? 0 : entry.exerciseId === 'cooldown' ? 4
        : role.priority };
  });
  const restSeconds = Math.max(0, Number(currentRestSeconds) || 0);
  const selected = new Set(rows.filter((row) => row.protected).map((row) => row.entry.exerciseId));
  if (rows.every((row) => row.entry.type === 'cardio')) {
    for (const row of rows) { row.required = true; selected.add(row.entry.exerciseId); }
  }
  const groups = [...new Set(rows.map((row) => row.group).filter(Boolean))];
  for (const group of groups) {
    if (rows.some((row) => row.group === group && selected.has(row.entry.exerciseId))) continue;
    const best = rows.filter((row) => row.group === group)
      .sort((a, b) => a.priority - b.priority || a.seconds - b.seconds || a.index - b.index)[0];
    best.required = true;
    selected.add(best.entry.exerciseId);
  }
  if (!selected.size && rows.length) {
    const first = [...rows].sort((a, b) => a.priority - b.priority || a.seconds - b.seconds || a.index - b.index)[0];
    first.required = true;
    selected.add(first.entry.exerciseId);
  }
  let seconds = restSeconds + rows.filter((row) => selected.has(row.entry.exerciseId)).reduce((sum, row) => sum + row.seconds, 0);
  const minimum = rows.filter((row) => selected.has(row.entry.exerciseId)).reduce((sum, row) =>
    ({ lowSeconds: sum.lowSeconds + row.lowSeconds, highSeconds: sum.highSeconds + row.highSeconds }),
  { lowSeconds: restSeconds, highSeconds: restSeconds });
  const infeasible = seconds > minutes * 60;
  for (const row of [...rows].sort((a, b) => a.priority - b.priority || a.index - b.index)) {
    if (selected.has(row.entry.exerciseId)) continue;
    if (seconds + row.seconds <= minutes * 60) { selected.add(row.entry.exerciseId); seconds += row.seconds; }
  }
  return { minutes, seconds, restSeconds, groups, infeasible, minimum,
    rows: [...rows].sort((a, b) => (a.protected ? -1 : a.priority) - (b.protected ? -1 : b.priority) || a.index - b.index)
    .map((row) => ({ ...row, selected: selected.has(row.entry.exerciseId) })) };
}

export function applyTimeBudget(session, selectedIds, minutes, catalog = []) {
  session = session.timeBudget ? restoreTimeBudget(session) : session;
  if (session.substitutions?.length) throw new Error('Restore the equipment swap before selecting a time budget');
  if (!Number.isFinite(minutes) || minutes < 10 || minutes > 180 || new Set(selectedIds).size !== selectedIds.length) {
    throw new RangeError('Invalid time selection');
  }
  const selected = new Set(selectedIds);
  if (session.entries.every((entry) => entry.type === 'cardio')
    && session.entries.some((entry) => !selected.has(entry.exerciseId))) {
    throw new Error('Keep the walking and running sequence together');
  }
  const currentId = session.currentExerciseId || session.running ? currentWorkoutEntry(session)?.exerciseId : null;
  if (session.entries.some((entry) => (entryHasActivity(entry) || entry.exerciseId === currentId)
    && !selected.has(entry.exerciseId))) throw new Error('Cannot defer an exercise with recorded or in-progress data');
  if (!selected.size || selectedIds.some((id) => !session.entries.some((entry) => entry.exerciseId === id))) {
    throw new Error('Choose at least one existing exercise');
  }
  const roles = session.entries.filter((entry) => entry.type !== 'cardio').map((entry) =>
    ({ entry, ...budgetRole(entry.exerciseSnapshot || catalog.find((exercise) => exercise.id === entry.exerciseId)) }));
  if (roles.some(({ entry, known }) => !known && !selected.has(entry.exerciseId))) {
    throw new Error('Cannot defer an exercise without verified muscle mapping');
  }
  if (roles.some(({ group }) => group && !roles.some((row) => row.group === group && selected.has(row.entry.exerciseId)))) {
    throw new Error('Keep at least one exercise per original main muscle group');
  }
  const result = copy(session);
  result.programPinned = true;
  result.timeBudget = { minutes, order: result.entries.map((entry) => entry.exerciseId),
    deferred: result.entries.filter((entry) => !selected.has(entry.exerciseId)) };
  result.entries = selectedIds.map((id) => result.entries.find((entry) => entry.exerciseId === id));
  return result;
}

export function restoreTimeBudget(session) {
  if (!session.timeBudget) return copy(session);
  const result = copy(session);
  const all = [...result.entries, ...result.timeBudget.deferred];
  const order = result.timeBudget.order;
  result.entries = [...order.map((id) => all.find((entry) => entry.exerciseId === id)).filter(Boolean),
    ...all.filter((entry) => !order.includes(entry.exerciseId))];
  delete result.timeBudget;
  return result;
}

export function swapExercise(session, exerciseId, replacement, catalog) {
  if (session.timeBudget) throw new Error('Restore the time selection before swapping');
  const result = copy(session);
  const index = result.entries.findIndex((entry) => entry.exerciseId === exerciseId);
  const original = result.entries[index];
  const source = original?.exerciseSnapshot || catalog.find((item) => item.id === exerciseId);
  if (!original || original.type === 'cardio' || original.sets.every((set) => set.completed)
    || original.sets.some((set) => set.holdStartedAt || set.resumeAfterPause)
    || !alternatives(source, catalog).some((item) => item.id === replacement.id)
    || result.entries.some((entry) => entry.exerciseId === replacement.id)
    || result.removedExercises?.some((item) => item.entry.exerciseId === replacement.id)
    || result.substitutions?.some((item) => item.original.exerciseId === exerciseId || item.replacementId === exerciseId)) {
    throw new Error('This replacement is unavailable for the current exercise');
  }
  const remaining = original.sets.filter((set) => !set.completed);
  const completed = original.sets.filter((set) => set.completed);
  result.substitutions ||= [];
  result.substitutions.push({ original: copy(original), index, replacementId: replacement.id });
  const { images, ...snapshot } = replacement;
  const newEntry = { exerciseId: replacement.id, exerciseName: replacement.name, exerciseSnapshot: copy(snapshot),
    targetReps: Number(replacement.targetReps || replacement.defaultReps) || null,
    sets: remaining.map(() => ({ weightKg: '', reps: '', completed: false })) };
  if (completed.length) original.sets = completed;
  result.entries.splice(index, 1, ...(completed.length ? [original] : []), newEntry);
  if (result.lastCompletedSet?.exerciseId === exerciseId) delete result.lastCompletedSet;
  result.programPinned = true;
  if (result.currentExerciseId === exerciseId) result.currentExerciseId = replacement.id;
  return result;
}

export function restoreSubstitution(session, replacementId) {
  const result = copy(session);
  const substitution = result.substitutions?.find((item) => item.replacementId === replacementId);
  if (!substitution) throw new Error('Replacement not found');
  if (result.removedExercises?.some(({ entry }) =>
    entry.exerciseId === replacementId || entry.exerciseId === substitution.original.exerciseId)) {
    throw new Error('Undo exercise removal before restoring the equipment swap');
  }
  const sourceIndex = result.entries.findIndex((entry) => entry.exerciseId === substitution.original.exerciseId);
  const replacementIndex = result.entries.findIndex((entry) => entry.exerciseId === replacementId);
  const replacement = result.entries[replacementIndex];
  const restored = substitution.original;
  if (sourceIndex >= 0) {
    // Completed source sets remain editable after a split. Preserve those edits on restore.
    let completedIndex = 0;
    const completedCount = restored.sets.filter((set) => set.completed).length;
    restored.sets = restored.sets.map((set) => set.completed
      ? result.entries[sourceIndex].sets[completedIndex++] || set : set);
    restored.sets.push(...result.entries[sourceIndex].sets.slice(completedCount));
    result.entries.splice(sourceIndex, 1, restored);
  } else result.entries.splice(Math.max(0, replacementIndex), 0, restored);
  if (replacement && !entryHasActivity(replacement) && !replacement.sets.some((set) => set.weightKg !== '' || set.reps !== '' || set.notes)) {
    result.entries = result.entries.filter((entry) => entry !== replacement);
  }
  result.substitutions = result.substitutions.filter((item) => item !== substitution);
  if (result.lastCompletedSet?.exerciseId === restored.exerciseId) delete result.lastCompletedSet;
  return result;
}

export function planCatalog(catalog, equipment, location) {
  const allowed = new Set(['משקל גוף', 'ללא ציוד', 'מזרן', 'קיר', ...equipment]);
  return catalog.filter((exercise) => {
    const info = exerciseGuide(exercise);
    return exercise.catalogId && trainingMetadata(exercise) && info
      && info.equipment.every((item) => allowed.has(item))
      && (info.places || (info.equipment.includes('מכונה') ? ['gym'] : ['home', 'gym'])).includes(location);
  });
}

export function generatePlan(options, catalog) {
  const { goal, experience, days, minutes, equipment, location } = options;
  const split = options.split || 'auto';
  const muscles = options.muscles === undefined ? [] : options.muscles;
  if (!['strength', 'muscle', 'fitness', 'walk', 'run'].includes(goal)
    || !['beginner', 'regular'].includes(experience) || ![1, 2, 3, 4, 5, 6].includes(days)
    || ![20, 30, 45, 60, 90].includes(minutes) || !['home', 'gym', 'outside'].includes(location)
    || !Array.isArray(equipment) || new Set(equipment).size !== equipment.length
    || equipment.some((item) => !['משקולות יד', 'גומייה', 'ספסל', 'מכונה', 'כיסא יציב', 'TRX', 'מוט', 'מתח', 'ספסל כומר', 'מדרגת אימון', 'גלגל בטן'].includes(item))
    || !['auto', 'full-body', 'ab', 'abc'].includes(split)
    || split === 'ab' && days < 2 || split === 'abc' && days < 3
    || ['walk', 'run'].includes(goal) && !['auto', 'full-body'].includes(split)
    || !Array.isArray(muscles)
    || new Set(muscles).size !== muscles.length || muscles.some((muscle) => !PLAN_MUSCLES.includes(muscle))
    || (muscles.length && ['walk', 'run'].includes(goal))) throw new Error('Invalid plan preferences');
  if (equipment.includes('TRX') && options.trxAnchorChecked !== true) throw new Error('Confirm a properly installed TRX anchor');
  const pool = planCatalog(planningCatalog(catalog), equipment, location);
  const preference = (exercise) => {
    const info = exerciseGuide(exercise);
    const selectedEquipment = info.equipment.filter((item) => equipment.includes(item)).length * 10;
    const easier = experience === 'beginner' && ['chairStand', 'wallPushup', 'heelTap'].includes(exercise.catalogId) ? 5 : 0;
    return selectedEquipment + easier;
  };
  pool.sort((a, b) => preference(b) - preference(a));
  const find = (...ids) => ids.map((id) => pool.find((exercise) => exercise.catalogId === id)).find(Boolean);
  const cardio = goal === 'walk' || goal === 'run';
  const walking = find('walk', 'march');
  const jogging = find('jog');
  if (cardio && (!walking || goal === 'run' && !jogging)) throw new Error('Choose an outdoor or gym location for jogging');
  const sets = experience === 'beginner' ? 2 : goal === 'fitness' ? 2 : 3;
  const targetReps = goal === 'strength' ? 8 : goal === 'muscle' ? 12 : 10;
  const restSeconds = goal === 'strength' ? 150 : goal === 'muscle' ? 90 : 75;
  const dose = (exercise) => ({ ...planExercise(exercise), defaultSets: sets, defaultReps: String(targetReps), targetReps, restSeconds });
  const targeted = muscles.map((muscle) => {
    const candidates = pool.filter((exercise) => exercise.inputType === 'reps'
      && trainingMetadata(exercise).primary === muscle
      && (experience !== 'beginner' || exerciseGuide(exercise).level !== 'בינוניים'));
    candidates.sort((a, b) => Number(trainingMetadata(b).compound) - Number(trainingMetadata(a).compound)
      || Number(trainingMetadata(b).equipment.includes('מכונה')) - Number(trainingMetadata(a).equipment.includes('מכונה')));
    if (!candidates.length) throw new Error('No suitable exercises for every selected muscle group');
    return candidates;
  });
  const splitGroups = split === 'ab'
    ? [['חזה', 'גב', 'כתפיים', 'יד קדמית', 'יד אחורית'], ['רגליים', 'ישבן', 'שוקיים', 'בטן']]
    : split === 'abc' ? [['חזה', 'כתפיים', 'יד אחורית'], ['גב', 'יד קדמית'], ['רגליים', 'ישבן', 'שוקיים', 'בטן']] : null;
  const patterns = split === 'ab'
    ? [['horizontal-push', 'horizontal-pull', 'vertical-push', 'elbow-flexion', 'elbow-extension'],
      ['squat', 'hinge', 'hip-extension', 'calf', 'core-control']]
    : split === 'abc'
      ? [['horizontal-push', 'vertical-push', 'elbow-extension'],
        ['horizontal-pull', 'vertical-pull', 'elbow-flexion'],
        ['squat', 'hinge', 'calf', 'core-control']]
    : split === 'full-body'
      ? [['squat', 'horizontal-push', 'horizontal-pull', 'hinge', 'core-control'],
        ['lunge', 'horizontal-push', 'vertical-pull', 'hip-extension', 'core-control']]
    : days === 4 && !cardio
    ? [['horizontal-push', 'horizontal-pull', 'vertical-push', 'elbow-flexion'],
      ['squat', 'hinge', 'hip-extension', 'core-control']]
    : [['squat', 'horizontal-push', 'horizontal-pull', 'hip-extension', 'core-control'],
      ['lunge', 'vertical-push', 'horizontal-pull', 'hinge', 'core-control']];
  const skipped = new Set();
  const sessions = Array.from({ length: days }, (_, day) => {
    const splitMuscles = splitGroups?.[day % splitGroups.length];
    const requiredMuscles = muscles.filter((muscle) => !splitMuscles || splitMuscles.includes(muscle));
    if (muscles.length && !requiredMuscles.length) throw new Error('Selected muscle groups do not cover every split day');
    let entries;
    if (cardio) {
      entries = [{ ...planExercise(walking), location: location === 'gym' ? 'treadmill' : location,
        durationMinutes: goal === 'run' ? 10 : Math.min(minutes, experience === 'beginner' ? 15 : 25) }];
      if (goal === 'run') entries.push({ ...planExercise(jogging), location: location === 'gym' ? 'treadmill' : location,
        durationMinutes: experience === 'beginner' ? 1 : 3 });
    } else if (muscles.length) {
      const dayTargets = targeted.filter((candidates) => requiredMuscles.includes(trainingMetadata(candidates[0]).primary));
      entries = dayTargets.map((candidates) => dose(candidates[0]));
      const limit = experience === 'beginner' ? 2 : 3;
      for (let round = 1; round < limit; round++) {
        for (const candidates of dayTargets) {
          if (entries.length >= Math.max(muscles.length, 8)) break;
          const used = entries.map((exercise) => exercise.id);
          const movements = entries.map((exercise) => trainingMetadata(exercise).movement);
          const exercise = candidates.find((candidate) => !used.includes(candidate.id)
            && !movements.includes(trainingMetadata(candidate).movement))
            || candidates.find((candidate) => !used.includes(candidate.id));
          if (!exercise) continue;
          const proposed = [...entries, dose(exercise)];
          const estimate = estimateWorkoutDuration(durationSession(proposed));
          if (estimate.highSeconds <= minutes * 60) entries = proposed;
        }
      }
    } else {
      entries = patterns[day % patterns.length].map((movement) => {
        let candidates = pool.filter((exercise) => exercise.inputType === 'reps' && trainingMetadata(exercise).movement === movement);
        if (!candidates.length && movement === 'vertical-pull') candidates = pool.filter((exercise) =>
          exercise.inputType === 'reps' && trainingMetadata(exercise).movement === 'horizontal-pull');
        const appropriate = candidates.filter((item) => experience !== 'beginner' || exerciseGuide(item).level !== 'בינוניים');
        const exercise = appropriate.find((item) => equipment.includes('מכונה') && trainingMetadata(item).equipment.includes('מכונה')) || appropriate[0];
        if (!exercise) { skipped.add(movement); return null; }
        return dose(exercise);
      }).filter(Boolean);
      entries = entries.filter((exercise, index) => entries.findIndex((item) => item.id === exercise.id) === index);
      let total = 0;
      entries = entries.filter((exercise) => {
        const seconds = estimateEntrySeconds({ sets: Array.from({ length: sets }, () => ({ completed: false })) }, exercise);
        const required = split !== 'auto' && ['חזה', 'גב', 'רגליים'].includes(trainingMetadata(exercise).primary);
        if (total + seconds > minutes * 60 && !required) { skipped.add(trainingMetadata(exercise).movement); return false; }
        total += seconds;
        return true;
      });
      if (goal === 'fitness' && walking && (!splitMuscles || splitMuscles.includes('רגליים'))
        && total + estimateEntrySeconds({ type: 'cardio', durationSec: 300 }, walking) <= minutes * 60) entries.push({ ...planExercise(walking),
        location: location === 'gym' ? 'treadmill' : location, durationMinutes: 5 });
    }
    const coverage = muscles.length ? requiredMuscles : split !== 'auto' && !cardio
      ? ['חזה', 'גב', 'רגליים'].filter((muscle) => entries.some((exercise) => exercise.inputType !== 'cardio' && trainingMetadata(exercise).primary === muscle)) : [];
    return { label: splitGroups ? String.fromCharCode(65 + day % splitGroups.length) : String(day + 1),
      ...(splitMuscles ? { splitMuscles } : {}), ...(coverage.length ? { requiredMuscles: coverage } : {}), exercises: entries };
  });
  if (sessions.some((session) => !session.exercises.length)) throw new Error('No suitable exercises for these preferences');
  return { options: copy(options), sessions, omitted: [...skipped] };
}

const ROPE_LEVELS = {
  beginner: { workSeconds: 20, recoverySeconds: 40 },
  intermediate: { workSeconds: 40, recoverySeconds: 40 },
  advanced: { workSeconds: 60, recoverySeconds: 30 },
};

export function ropeIntervalSchedule(intervals) {
  const dose = Object.hasOwn(ROPE_LEVELS, intervals?.level) && ROPE_LEVELS[intervals.level];
  if (!dose || intervals.version !== 1 || !Number.isInteger(intervals.rounds) || intervals.rounds < 1 || intervals.rounds > 30
    || intervals.workSeconds !== dose.workSeconds || intervals.recoverySeconds !== dose.recoverySeconds
    || intervals.warmupSeconds !== 120 || intervals.cooldownSeconds !== 120) throw new Error('Invalid rope intervals');
  const phases = [{ kind: 'warmup', seconds: intervals.warmupSeconds }];
  for (let round = 1; round <= intervals.rounds; round++) {
    phases.push({ kind: 'work', seconds: dose.workSeconds, round, rounds: intervals.rounds },
      { kind: 'recovery', seconds: dose.recoverySeconds, round, rounds: intervals.rounds });
  }
  phases.push({ kind: 'cooldown', seconds: intervals.cooldownSeconds });
  let offsetSeconds = 0;
  return phases.map((phase, index) => {
    const result = { ...phase, index, offsetSeconds };
    offsetSeconds += phase.seconds;
    return result;
  });
}

export function cardioIntervalPhase(entry, now = Date.now()) {
  if (!entry.intervals) return null;
  const elapsed = Math.max(0, Number(entry.elapsedSec) || 0)
    + (entry.startedAt ? Math.max(0, (now - entry.startedAt) / 1000) : 0);
  const phases = ropeIntervalSchedule(entry.intervals);
  const phase = !entry.completed && phases.find((phase) => elapsed < phase.offsetSeconds + phase.seconds);
  return phase ? { ...phase, remainingSeconds: Math.ceil(phase.offsetSeconds + phase.seconds - elapsed) }
    : { kind: 'done', index: phases.length, remainingSeconds: 0 };
}

export function generateRopePlan(level, minutes, catalog, location = 'home') {
  const dose = Object.hasOwn(ROPE_LEVELS, level) && ROPE_LEVELS[level];
  if (!dose || ![10, 15, 20, 30].includes(minutes) || !['home', 'gym', 'outside'].includes(location)) throw new Error('Invalid rope preferences');
  const exercise = planningCatalog(catalog).find((item) => item.catalogId === 'jumpRope');
  if (!exercise) throw new Error('Jump rope guide is unavailable');
  const intervals = { version: 1, level, ...dose, warmupSeconds: 120, cooldownSeconds: 120,
    rounds: Math.floor((minutes * 60 - 240) / (dose.workSeconds + dose.recoverySeconds)) };
  const seconds = ropeIntervalSchedule(intervals).reduce((total, phase) => total + phase.seconds, 0);
  return { options: { goal: 'rope', days: 1, minutes, equipment: ['חבל קפיצה'], location, ropeLevel: level },
    sessions: [{ label: '1', exercises: [{ ...planExercise(exercise), location, intervals, durationMinutes: seconds / 60 }] }], omitted: [] };
}

export function activatePlanExercises(catalog, proposed) {
  if (!proposed.length || new Set(proposed.map((item) => item.id)).size !== proposed.length) throw new Error('Invalid plan exercises');
  if (proposed.some((item) => !catalog.some((exercise) => exercise.id === item.id && exercise.catalogId === item.catalogId
    && (exercise.inputType || 'reps') === (item.inputType || 'reps')))) {
    throw new Error('A plan exercise is no longer in the library');
  }
  const selected = new Set(proposed.map((item) => item.id));
  // Preserve canonical names, custom notes, images and every unselected library entry.
  return [...proposed.map((item) => ({ ...copy(catalog.find((exercise) => exercise.id === item.id)), active: true,
    defaultSets: item.defaultSets, defaultReps: item.defaultReps, targetReps: item.targetReps,
    ...Object.fromEntries(['targetWeightKg', 'holdSeconds', 'pace'].filter((key) => Object.hasOwn(item, key)).map((key) => [key, item[key]])),
    ...(item.inputType === 'cardio' ? { intervals: item.intervals ? copy(item.intervals) : null } : {}),
    restSeconds: item.restSeconds, ...(item.inputType === 'cardio' ? { durationMinutes: item.durationMinutes,
      ...(item.location ? { location: item.location } : {}) } : {}) })),
  ...catalog.filter((exercise) => !selected.has(exercise.id)).map((exercise) => ({ ...copy(exercise), active: false }))];
}

export function weeklyMuscleWork(history, now = new Date()) {
  const start = calendarWeekStart(now);
  const muscles = {};
  let unknownSets = 0;
  for (const workout of history) {
    const date = Date.parse(workout.dateISO);
    if (!Number.isFinite(date) || date < start.getTime() || date > now.getTime()) continue;
    for (const entry of workout.entries) {
      if (entry.type === 'cardio') continue;
      const count = (entry.sets || []).filter((set) => set.completed === true).length;
      const meta = trainingMetadata(entry);
      if (!meta) { unknownSets += count; continue; }
      for (const [muscle, role] of [[meta.primary, 'primary'], ...meta.secondary.map((muscle) => [muscle, 'secondary'])]) {
        muscles[muscle] ||= { primary: 0, secondary: 0 };
        muscles[muscle][role] += count;
      }
    }
  }
  return { startISO: start.toISOString(), muscles, unknownSets };
}

export function monthlyGoalProgress(history, goal, now = new Date(), weeklyGoal = 3) {
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const target = goal?.month === month ? Number(goal.target) : 0;
  const count = history.filter((workout) => {
    const date = new Date(workout.dateISO);
    return Number.isFinite(date.getTime()) && date <= now && date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth() && workout.entries.some((entry) => entry.type === 'cardio'
        ? entry.completed : entry.sets?.some((set) => set.completed));
  }).length;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate() + 1;
  const weekly = Number.isInteger(Number(weeklyGoal)) && Number(weeklyGoal) >= 1 && Number(weeklyGoal) <= 7
    ? Number(weeklyGoal) : 3;
  const suggestedRemaining = Math.ceil(weekly * daysRemaining / 7);
  return { month, count, target, percent: target > 0 ? Math.min(100, Math.round(count / target * 100)) : 0,
    remaining: Math.max(0, target - count), daysRemaining, weeklyGoal: weekly, suggestedRemaining,
    suggestedTarget: Math.min(31, count + suggestedRemaining) };
}
