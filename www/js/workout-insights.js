export const DIFFICULTY_LABELS = { easy: 'קל', right: 'מתאים', hard: 'קשה' };
// These original program entries explicitly combine multiple equipment or movement variants.
const UNSPECIFIED_VARIANTS = new Set([
  'לחיצת חזה', 'משיכה לפנים בפולי עליון', 'פרפר חזה', 'הרחקה אופקית (פרפר הפוך)',
  'חתירה צרה לבטן', 'זוקפי גב — פשיטת גב', 'פשיטת מרפקים בפולי עליון',
  'כפיפת מרפקים בישיבה', 'כפיפה ופשיטה של שורש כף היד', 'הרחקה לצדדים',
  'לחיצת רגליים', 'סקוואט', 'כפיפות בטן',
]);

export function completedEntrySnapshot(entry, exercise) {
  const inputType = !exercise ? null : exercise.inputType === 'hold' ? 'hold' : 'reps';
  return {
    exerciseId: entry.exerciseId,
    exerciseName: entry.exerciseName,
    inputType,
    category: exercise?.category || '',
    comparisonKey: exercise && (exercise.catalogId || !UNSPECIFIED_VARIANTS.has(exercise.name))
      ? JSON.stringify([exercise.name, exercise.notes || '', inputType]) : null,
    loadKind: exercise?.loadKind === 'assistance' || exercise?.name === 'גרביטון' || exercise?.catalogId === 'assisted' ? 'assistance' : 'external',
    sets: entry.sets.filter((set) => set.completed).map((set) => ({
      weightKg: Number(set.weightKg) || 0,
      reps: Number(set.reps) || 0,
      completed: true,
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

function compareEntries(current, previous) {
  if (current.inputType !== 'reps' || previous.inputType !== 'reps'
    || !current.comparisonKey || current.comparisonKey !== previous.comparisonKey
    || current.loadKind !== previous.loadKind) return null;
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
