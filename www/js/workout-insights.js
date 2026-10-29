import { EXERCISE_GUIDES, UNSPECIFIED_VARIANTS } from './exercise-library.js';

export const DIFFICULTY_LABELS = { easy: 'קל', right: 'בינוני', hard: 'קשה' };

export function completedEntrySnapshot(entry, exercise) {
  const inputType = !exercise ? null : exercise.inputType === 'hold' ? 'hold' : 'reps';
  return {
    exerciseId: entry.exerciseId,
    exerciseName: entry.exerciseName,
    inputType,
    category: exercise?.category || '',
    ...(exercise?.catalogId ? { catalogId: exercise.catalogId } : {}),
    ...(exercise?.superset ? { superset: JSON.parse(JSON.stringify(exercise.superset)) } : {}),
    ...(entry.targetReps ? { targetReps: Number(entry.targetReps) } : {}),
    comparisonKey: exercise && (exercise.catalogId || !UNSPECIFIED_VARIANTS.has(exercise.name))
      ? JSON.stringify([exercise.name, exercise.notes || '', inputType, ...(exercise.superset ? [exercise.superset.id] : [])]) : null,
    loadKind: exercise?.loadKind === 'assistance' || exercise?.name === 'גרביטון' || exercise?.catalogId === 'assisted' ? 'assistance' : 'external',
    sets: entry.sets.filter((set) => set.completed).map((set) => ({
      weightKg: Number(set.weightKg) || 0,
      reps: Number(set.reps) || 0,
      completed: true,
      ...(typeof set.notes === 'string' && set.notes ? { notes: set.notes } : {}),
      ...(Object.hasOwn(DIFFICULTY_LABELS, set.difficulty) ? { difficulty: set.difficulty } : {}),
    })),
  };
}

function measuredSets(entry) {
  return (entry.sets || []).filter((set) => set.completed !== false);
}

function comparableSets(entry) {
  const sets = measuredSets(entry);
  if (!sets.length || sets.some((set) => !Number.isFinite(Number(set.weightKg)) || Number(set.weightKg) < 0
    || !Number.isInteger(Number(set.reps)) || Number(set.reps) <= 0)) return null;
  return sets.map((set) => ({ weight: Number(set.weightKg), reps: Number(set.reps) }));
}

export function compareEntries(current, previous) {
  if (current.inputType !== 'reps' || previous.inputType !== 'reps'
    || !current.comparisonKey || current.comparisonKey !== previous.comparisonKey
    || current.loadKind !== previous.loadKind || current.catalogId !== previous.catalogId) return null;
  const currentSets = comparableSets(current);
  const previousSets = comparableSets(previous);
  if (!currentSets || !previousSets || currentSets.length !== previousSets.length) return null;
  const byWeight = (a, b) => a.weight - b.weight || a.reps - b.reps;
  currentSets.sort(byWeight);
  previousSets.sort(byWeight);
  if (currentSets.every((set, index) => set.weight === previousSets[index].weight)) {
    const changes = currentSets.map((set, index) => set.reps - previousSets[index].reps);
    if (changes.every((change) => change === 0)) return { kind: 'same' };
    if (changes.every((change) => change >= 0)) return { kind: 'more-reps', delta: changes.reduce((a, b) => a + b, 0) };
    return null;
  }
  if (current.loadKind === 'assistance') return null;
  const byReps = (a, b) => a.reps - b.reps || a.weight - b.weight;
  currentSets.sort(byReps);
  previousSets.sort(byReps);
  if (currentSets.every((set, index) => set.reps === previousSets[index].reps
    && set.weight >= previousSets[index].weight)
    && currentSets.some((set, index) => set.weight > previousSets[index].weight)) {
    return { kind: 'more-weight' };
  }
  return null;
}

export function statisticsHistory(history, now = new Date()) {
  const seen = new Set();
  return history.filter((record) => {
    const time = Date.parse(record.dateISO);
    if (!record.id || seen.has(record.id) || !Number.isFinite(time) || time > now.getTime()
      || !Array.isArray(record.entries)) return false;
    seen.add(record.id);
    return record.entries.some((entry) => entry.type === 'cardio'
      ? entry.completed === true && Number(entry.durationSec) > 0
      : measuredSets(entry).some((set) => Number.isFinite(Number(set.reps)) && Number(set.reps) > 0));
  }).sort((a, b) => Date.parse(b.dateISO) - Date.parse(a.dateISO));
}

export function statisticsOverview(history, now = new Date()) {
  const records = statisticsHistory(history, now);
  const start = new Date(now);
  start.setDate(start.getDate() - 28);
  const previousStart = new Date(start);
  previousStart.setDate(previousStart.getDate() - 28);
  const recent = records.filter((record) => Date.parse(record.dateISO) >= start.getTime());
  const previous = records.filter((record) => Date.parse(record.dateISO) < start.getTime()
    && Date.parse(record.dateISO) >= previousStart.getTime());
  return {
    records, recent, previous,
    activeSeconds: recent.reduce((sum, record) => sum + (Number.isFinite(Number(record.durationSec))
      && Number(record.durationSec) > 0 ? Number(record.durationSec) : 0), 0),
    completedSets: recent.reduce((sum, record) => sum + record.entries.reduce((count, entry) =>
      count + (entry.type === 'cardio' ? 0 : measuredSets(entry).filter((set) =>
        Number.isFinite(Number(set.reps)) && Number(set.reps) > 0).length), 0), 0),
    latest: records[0] || null,
  };
}

export function exerciseProgress(history, exerciseId, now = new Date()) {
  const evidence = statisticsHistory(history, now).map((record) => ({
    dateISO: record.dateISO, entry: record.entries.find((entry) => entry.exerciseId === exerciseId),
  })).filter((record) => record.entry).slice(0, 2);
  const insufficient = (reason) => ({ kind: 'insufficient', reason, evidence });
  if (evidence.length < 2) return insufficient('history');
  const [current, previous] = evidence.map((record) => record.entry);
  if (current.type === 'cardio' || previous.type === 'cardio'
    || current.inputType === 'hold' || previous.inputType === 'hold') return insufficient('measurement');
  if (!current.comparisonKey || !previous.comparisonKey
    || current.inputType !== 'reps' || previous.inputType !== 'reps'
    || !Object.hasOwn(EXERCISE_GUIDES, current.catalogId || '')) return insufficient('legacy');
  const comparison = compareEntries(current, previous);
  return comparison ? { ...comparison, evidence } : insufficient('conditions');
}

export function progressRecommendation(exercise, history, now = new Date()) {
  const current = completedEntrySnapshot({ exerciseId: exercise.id, exerciseName: exercise.name, sets: [] }, exercise);
  const seen = new Set();
  const records = history.filter((workout) => {
    if (!workout.id || seen.has(workout.id) || !Number.isFinite(Date.parse(workout.dateISO))
      || Date.parse(workout.dateISO) > now.getTime()) return false;
    seen.add(workout.id);
    return true;
  })
    .sort((a, b) => Date.parse(b.dateISO) - Date.parse(a.dateISO))
    .map((workout) => ({ dateISO: workout.dateISO, entry: workout.entries.find((entry) => entry.exerciseId === exercise.id) }))
    .filter((record) => record.entry);
  const evidence = records.slice(0, 2);
  const result = (kind, reason) => ({ kind, reason, evidence });
  if (exercise.inputType === 'cardio') return result('insufficient', 'cardio');
  if (exercise.inputType === 'hold') return result('insufficient', 'hold');
  if (!Object.hasOwn(EXERCISE_GUIDES, exercise.catalogId || '') || !current.comparisonKey || evidence.length < 2) return result('insufficient', 'history');
  const [latest, previous] = evidence.map((record) => record.entry);
  if (current.comparisonKey !== latest.comparisonKey || current.loadKind !== latest.loadKind
    || latest.catalogId !== exercise.catalogId || previous.catalogId !== exercise.catalogId
    || !compareEntries(latest, previous)) return result('insufficient', 'variation');
  const sets = [...measuredSets(latest), ...measuredSets(previous)];
  if (sets.some((set) => set.difficulty === 'hard')) return result('hold', 'hard');
  if (current.loadKind === 'assistance') return result('hold', 'assistance');
  const target = Number(exercise.targetReps);
  if (!Number.isInteger(target) || target <= 0 || latest.targetReps !== target || previous.targetReps !== target) {
    return result('hold', 'target');
  }
  if (sets.some((set) => !['easy', 'right'].includes(set.difficulty))) return result('hold', 'rating');
  if (sets.some((set) => Number(set.reps) < target)) return result('reps', 'reps');
  if (!EXERCISE_GUIDES[exercise.catalogId].equipment.some((item) => ['משקולות יד', 'מכונה'].includes(item))) {
    return result('hold', 'load');
  }
  const weights = sets.map((set) => Number(set.weightKg));
  if (new Set(weights).size !== 1 || weights[0] <= 0 || compareEntries(latest, previous)?.kind !== 'same') {
    return result('hold', 'mixed');
  }
  return { ...result('increase', 'top'), weightKg: weights[0], targetReps: target };
}

export function workoutSummary(record, history) {
  const strength = record.entries.filter((entry) => entry.type !== 'cardio');
  const result = {
    exercises: record.entries.length,
    sets: strength.reduce((total, entry) => total + measuredSets(entry).length, 0),
    holdSeconds: 0,
    cardioSeconds: 0,
    difficulty: { easy: 0, right: 0, hard: 0 },
    insights: [],
  };
  const earlierWorkouts = history.filter((workout) => workout.id !== record.id
    && Number.isFinite(Date.parse(workout.dateISO)) && Date.parse(workout.dateISO) < Date.parse(record.dateISO))
    .sort((a, b) => Date.parse(b.dateISO) - Date.parse(a.dateISO));
  for (const entry of record.entries) {
    if (entry.type === 'cardio') {
      if (entry.completed && Number.isFinite(Number(entry.durationSec)) && Number(entry.durationSec) > 0) {
        result.cardioSeconds += Number(entry.durationSec);
      }
      continue;
    }
    for (const set of measuredSets(entry)) {
      if (entry.inputType === 'hold' && Number.isFinite(Number(set.reps)) && Number(set.reps) > 0) {
        result.holdSeconds += Number(set.reps);
      }
      if (Object.hasOwn(DIFFICULTY_LABELS, set.difficulty)) result.difficulty[set.difficulty]++;
    }
    const earlier = earlierWorkouts
      .map((workout) => workout.entries.find((candidate) => candidate.exerciseId === entry.exerciseId))
      .filter(Boolean);
    if (!earlier.length) continue;
    const comparison = compareEntries(entry, earlier[0]);
    if (!comparison) continue;
    if (comparison.kind === 'same') {
      if (earlier.length < 3 || !earlier.slice(0, 3).every((previous) => compareEntries(entry, previous)?.kind === 'same')) continue;
      result.insights.push({ exerciseName: entry.exerciseName, kind: 'repeated-four' });
    } else {
      result.insights.push({ exerciseName: entry.exerciseName, ...comparison });
    }
  }
  return result;
}
