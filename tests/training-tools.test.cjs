const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const plain = (value) => JSON.parse(JSON.stringify(value));
function load(file, names, values = {}) {
  const context = vm.createContext({ ...values });
  vm.runInContext(read(file).replace(/^import .*$/gm, '').replace(/^export /gm, ''), context);
  return vm.runInContext(`({${names.join(',')}})`, context);
}
const library = load('www/js/exercise-library.js', ['LIBRARY_EXERCISES', 'PLANNING_EXERCISES', 'EXERCISE_GUIDES', 'LIBRARY_TRANSLATIONS', 'exerciseGuide', 'exerciseIllustration', 'catalogStats']);
const tools = load('www/js/training-tools.js', ['trainingMetadata', 'alternatives', 'entryHasActivity', 'currentWorkoutEntry', 'estimateEntrySeconds',
  'SUPERSET_RECIPES', 'supersetExercises', 'upgradeSavedASuperset', 'restoreSavedASuperset', 'supersetNextEntry', 'supersetNeedsRest',
  'durationSession', 'estimateEntryDuration', 'estimateWorkoutDuration',
  'timeBudgetProposal', 'applyTimeBudget', 'restoreTimeBudget', 'swapExercise', 'restoreSubstitution',
  'PLAN_MUSCLES', 'planningCatalog', 'planExercise', 'createSavedWorkout', 'editSavedPlanExercise', 'replaceSavedPlan',
  'planIdentity', 'sessionWorkoutTitle', 'calendarWeekStart', 'planCatalog', 'generatePlan',
  'removeWorkoutExercise', 'restoreWorkoutExercise', 'workoutHistoryEntries',
  'generateRopePlan', 'ropeIntervalSchedule', 'cardioIntervalPhase', 'activatePlanExercises', 'weeklyMuscleWork', 'monthlyGoalProgress'], library);
const insights = load('www/js/workout-insights.js', ['completedEntrySnapshot', 'progressRecommendation', 'compareEntries'], library);
const catalog = plain(library.LIBRARY_EXERCISES);
const find = (id) => plain(catalog.find((exercise) => exercise.catalogId === id));
const set = (weightKg = '', reps = '', completed = false, extra = {}) => ({ weightKg, reps, completed, ...extra });
function entry(exercise, sets = [set(), set()]) {
  return { exerciseId: exercise.id, exerciseName: exercise.name, targetReps: 12, sets };
}
function session(entries) { return { id: 'local-session', running: false, entries }; }
function record(id, date, exercise = { ...find('chest'), targetReps: 12 }, sets = [set(20, 12, true, { difficulty: 'right' }), set(20, 12, true, { difficulty: 'easy' })]) {
  return { id, dateISO: date, entries: [insights.completedEntrySnapshot(entry(exercise, sets), exercise)] };
}

function threeSavedPlans() {
  const custom = { id: 'owner:triangle-pulldown', name: 'משיכה צרה בפולי עליון במשולש', category: 'גב',
    inputType: 'reps', defaultSets: 4, defaultReps: '8–12', targetWeightKg: 42.5, restSeconds: 105,
    personalMetadata: { grip: 'triangle', prescriptions: [{ weightKg: 40, notes: 'keep', difficulty: 'right' }] } };
  return plain([
    { id: 'owner:A', name: 'A אישי', kind: 'saved-workout', options: { goal: 'custom', days: 1 },
      sessions: [{ exercises: [custom, tools.planExercise(find('chest'))], customDay: { keep: true } }], omitted: [], extra: { keep: [1, 2] } },
    { id: 'owner:B', name: 'B אישי', kind: 'saved-workout', options: { goal: 'custom', days: 1 },
      sessions: [{ exercises: [{ ...tools.planExercise(find('highPlank')), holdSeconds: 35 },
        tools.generateRopePlan('intermediate', 15, catalog).sessions[0].exercises[0]] }], omitted: [] },
    { id: 'owner:C', name: 'אימון שלישי', kind: 'saved-workout', options: { goal: 'custom', days: 1 },
      sessions: [{ exercises: [tools.planExercise(find('floor'))] }], omitted: [] },
  ]);
}

test('superset recipes have two stable independent identities and never inherit leg-press loads', () => {
  for (const recipe of tools.SUPERSET_RECIPES) {
    const parts = tools.supersetExercises(recipe.id, catalog, 4);
    assert.equal(parts.length, 2);
    assert.equal(new Set(parts.map((part) => part.id)).size, 2);
    assert.deepEqual(plain(parts.map((part) => part.superset.order)), [0, 1]);
    for (const part of parts) {
      assert.equal(part.active, false);
      assert.equal(part.defaultSets, 4);
      assert.equal(part.targetReps, recipe.reps);
      assert.equal(part.targetWeightKg, null);
      assert.ok(library.exerciseGuide(part));
      assert.ok(tools.trainingMetadata(part));
      assert.deepEqual(plain(tools.planExercise(part).superset), plain(part.superset));
    }
    assert.deepEqual(plain(tools.supersetExercises(recipe.id, catalog, 4)), plain(parts));
  }
  assert.throws(() => tools.supersetExercises('unknown', catalog), /אינו תקין/);
  assert.throws(() => tools.supersetExercises('arms', catalog, 0), /אינו תקין/);
});

test('the requested A-only update preserves other days/plans, originals, custom metadata and all active data', () => {
  const original = { id: 'my:press', name: 'לחיצת רגליים', defaultSets: 4, defaultReps: '12',
    targetWeightKg: 90, notes: 'personal note', images: ['my-photo'], customTargets: [{ weight: 85 }] };
  const plans = threeSavedPlans();
  plans[0].sessions[0].exercises.push(original);
  plans[1].sessions[0].exercises.push(plain(original));
  const settings = { restSeconds: 120, training: { plans, activePlan: { id: plans[0].id, day: 0 }, monthlyGoal: { target: 12 } }, custom: { keep: true } };
  const before = JSON.stringify(settings);
  const result = tools.upgradeSavedASuperset(settings);
  assert.equal(JSON.stringify(settings), before);
  assert.notEqual(result, settings);
  assert.deepEqual(plain(result.training.plans.slice(1)), plain(plans.slice(1)));
  assert.deepEqual(plain(result.training.activePlan), plain(settings.training.activePlan));
  assert.deepEqual(plain(result.training.monthlyGoal), { target: 12 });
  const updated = result.training.plans[0];
  assert.deepEqual(plain(updated.extra), plain(plans[0].extra));
  assert.deepEqual(plain(updated.sessions[0].exercises.slice(0, 2)), plain(plans[0].sessions[0].exercises.slice(0, 2)));
  const pair = updated.sessions[0].exercises.slice(-2);
  assert.ok(pair.every((part) => part.defaultSets === 4 && part.targetReps === 15 && part.targetWeightKg === null));
  assert.ok(pair.every((part) => part.restSeconds === 120));
  assert.deepEqual(plain(updated.legCalfSupersetV1.originals[0].exercise), original);
  assert.equal(tools.upgradeSavedASuperset(result), result);
  const restored = tools.restoreSavedASuperset(updated);
  assert.deepEqual(plain(restored.sessions), plain(plans[0].sessions));
  const restoredSettings = { training: { plans: [restored] } };
  assert.equal(tools.upgradeSavedASuperset(restoredSettings), restoredSettings);
});

test('A update recognizes explicit split A only and declines ambiguous leg-press matches', () => {
  const press = { ...tools.planExercise(library.PLANNING_EXERCISES.find((part) => part.catalogId === 'legPress')), defaultSets: 3 };
  const plan = { id: 'ab', name: 'Personal split', sessions: [
    { label: 'A', exercises: [press] }, { label: 'B', exercises: [plain(press)] },
  ] };
  const updated = tools.upgradeSavedASuperset({ training: { plans: [plan] } });
  assert.equal(updated.training.plans[0].sessions[0].exercises.length, 2);
  assert.deepEqual(plain(updated.training.plans[0].sessions[1]), plan.sessions[1]);
  for (const name of ['B', 'A/B', 'Cardio A', 'A']) {
    const exercises = name === 'A' ? [press, { ...press, id: 'duplicate' }] : [press];
    const settings = { training: { plans: [{ id: 'x', name, sessions: [{ exercises }] }] } };
    assert.equal(tools.upgradeSavedASuperset(settings), settings, name);
  }
});

test('adding calves to a constrained A split remains editable and restores the original muscle selection', () => {
  const press = plain(tools.planExercise(library.PLANNING_EXERCISES.find((part) => part.catalogId === 'legPress')));
  const plan = { id: 'constrained', name: 'AB', options: { muscles: ['רגליים'] }, sessions: [
    { label: 'A', splitMuscles: ['רגליים'], requiredMuscles: ['רגליים'], exercises: [press] },
    { label: 'B', splitMuscles: ['רגליים'], requiredMuscles: ['רגליים'], exercises: [plain(press)] },
  ] };
  const updated = tools.upgradeSavedASuperset({ training: { plans: [plan] } }).training.plans[0];
  assert.deepEqual(plain(updated.options), plan.options);
  assert.deepEqual(plain(updated.sessions[0].splitMuscles), ['רגליים']);
  assert.deepEqual(plain(updated.sessions[1]), plan.sessions[1]);
  assert.doesNotThrow(() => tools.replaceSavedPlan([updated], updated, plain(updated)));
  const restored = tools.restoreSavedASuperset(updated);
  assert.deepEqual(plain(restored.sessions), plan.sessions);
  assert.deepEqual(plain(restored.options), plan.options);
  assert.doesNotThrow(() => tools.replaceSavedPlan([updated], updated, restored));
});

test('superset rounds alternate A/B with rest after B and degrade safely after removal or unequal sets', () => {
  const parts = tools.supersetExercises('leg-press-calves', catalog);
  const current = tools.durationSession(parts.map((part) => ({ ...part, active: true })));
  const [a, b] = current.entries;
  for (let round = 0; round < 3; round++) {
    a.sets[round].completed = true;
    assert.equal(tools.supersetNextEntry(current, a), b);
    assert.equal(tools.supersetNeedsRest(current, a), false);
    b.sets[round].completed = true;
    assert.equal(tools.supersetNextEntry(current, b), round === 2 ? null : a);
    assert.equal(tools.supersetNeedsRest(current, b), true);
  }
  a.sets.push(set());
  assert.equal(tools.supersetNextEntry(current, a), a);
  assert.equal(tools.supersetNeedsRest(current, a), true);
  current.entries = [a];
  assert.equal(tools.supersetNextEntry(current, a), null);
  assert.equal(tools.supersetNeedsRest(current, a), true);
});

test('superset history/activation retains grouping and records calf work separately from leg press', () => {
  const parts = tools.supersetExercises('leg-press-calves', catalog);
  const activated = tools.activatePlanExercises([...catalog, ...parts], parts);
  assert.equal(activated.filter((part) => part.active).length, 2);
  const snapshots = parts.map((part, index) => insights.completedEntrySnapshot(entry(part, [set(20 + index * 10, 15, true, { notes: 'keep', difficulty: 'right' })]), part));
  assert.ok(snapshots.every((snapshot) => snapshot.superset?.id === 'leg-press-calves'));
  const old = insights.completedEntrySnapshot(entry(parts[0], [set(20, 15, true)]), { ...parts[0], superset: null });
  assert.equal(insights.compareEntries(snapshots[0], old), null);
  const work = tools.weeklyMuscleWork([{ id: 'logged', dateISO: '2026-10-28T08:00:00Z', entries: snapshots }], new Date('2026-10-28T09:00:00Z'));
  assert.equal(work.muscles['רגליים'].primary, 1);
  assert.equal(work.muscles['שוקיים'].primary, 1);
  assert.equal(work.unknownSets, 0);
  assert.equal(snapshots[0].sets[0].weightKg, 20);
  assert.equal(snapshots[1].sets[0].weightKg, 30);
});

test('paired duration removes only between-part rests and time budgeting cannot silently split a pair', () => {
  const parts = tools.supersetExercises('leg-press-calves', catalog).map((part) => ({ ...part, active: true }));
  const current = tools.durationSession(parts);
  const paired = tools.estimateWorkoutDuration(current);
  const separate = parts.reduce((sum, part, index) => sum + tools.estimateEntryDuration(current.entries[index], part, 90, { remaining: false }).seconds, 0);
  assert.equal(paired.seconds, separate - 270);
  assert.equal(paired.restSeconds, 270);
  const proposal = tools.timeBudgetProposal(current, parts, 10);
  assert.ok(proposal.rows.every((row) => row.selected && row.protected));
  assert.throws(() => tools.applyTimeBudget(current, [parts[0].id], 10, parts), /הסופר סט יחד/);
});

test('actual workout controller alternates superset focus and starts no rest between parts', () => {
  const { context, el } = pauseController();
  const parts = tools.supersetExercises('leg-press-calves', catalog);
  context.exercises = parts;
  context.activeSession.entries = tools.durationSession(parts.map((part) => ({ ...part, active: true }))).entries
    .map((item, index) => ({ ...item, exerciseName: parts[index].name }));
  context.activeSession.currentExerciseId = parts[0].id;
  const [a, b] = context.activeSession.entries;
  let rests = 0;
  context.restTimer.start = () => { rests++; };
  for (let round = 0; round < 3; round++) {
    context.setWorkoutSetCompletion(a, a.sets[round], parts[0], round, true);
    assert.equal(context.activeSession.currentExerciseId, parts[1].id);
    assert.equal(el('restOverlay').classList.contains('hidden'), true);
    assert.equal(rests, round);
    context.setWorkoutSetCompletion(b, b.sets[round], parts[1], round, true);
    if (round < 2) {
      assert.equal(context.activeSession.currentExerciseId, parts[0].id);
      assert.equal(rests, round + 1);
    }
  }
  assert.equal(rests, 2, 'No final rest at genuine workout completion');
});

test('editing one of three existing plans preserves custom triangle pulldown identity, ranges, nested targets, order and other plans', () => {
  const plans = threeSavedPlans(), before = plain(plans), draft = plain(plans[0]);
  draft.name = 'A עודכן';
  draft.sessions[0].exercises[0] = tools.editSavedPlanExercise(draft.sessions[0].exercises[0], { defaultSets: '5', defaultReps: '10–14', targetReps: '14' });
  const next = plain(tools.replaceSavedPlan(plans, plans[0], draft));
  assert.deepEqual(plans, before, 'Cancel/draft preparation must not mutate stored plans');
  assert.deepEqual(next.slice(1), before.slice(1));
  assert.deepEqual(next.map((plan) => plan.id), before.map((plan) => plan.id));
  assert.equal(next[0].sessions[0].exercises[0].name, 'משיכה צרה בפולי עליון במשולש');
  assert.equal(next[0].sessions[0].exercises[0].category, 'גב');
  assert.equal(next[0].sessions[0].exercises[0].targetWeightKg, 42.5);
  assert.deepEqual(next[0].sessions[0].exercises[0].personalMetadata, before[0].sessions[0].exercises[0].personalMetadata);
  assert.deepEqual(next[0].sessions[0].customDay, before[0].sessions[0].customDay);
  assert.deepEqual(next[0].extra, before[0].extra);
  assert.equal(next[0].sessions[0].exercises[0].defaultSets, 5);
  assert.equal(next[0].sessions[0].exercises[0].targetReps, 14);
  assert.equal(next[0].sessions[0].exercises[0].defaultReps, '10–14');
});

test('saved-plan edits preserve independent holds, full interval recipes and optional targets without inventing voice rep goals', () => {
  const plans = threeSavedPlans(), exercise = plans[0].sessions[0].exercises[0];
  const changed = tools.editSavedPlanExercise(exercise, { defaultReps: '6–10', targetWeightKg: '' });
  assert.equal(changed.targetReps, undefined);
  assert.equal(changed.targetWeightKg, null);
  const hold = plans[1].sessions[0].exercises[0], rope = plans[1].sessions[0].exercises[1];
  assert.equal(tools.editSavedPlanExercise(hold, { holdSeconds: '50' }).holdSeconds, 50);
  const preserved = tools.editSavedPlanExercise(rope, {});
  preserved.intervals.rounds++;
  assert.notEqual(preserved.intervals.rounds, rope.intervals.rounds);
  assert.throws(() => tools.editSavedPlanExercise(rope, { durationMinutes: '20' }), /interval recipe/);
  for (const changes of [{ defaultSets: '0' }, { targetReps: '2.5' }, { holdSeconds: '-1' },
    { restSeconds: '' }, { durationMinutes: '0' }, { targetWeightKg: '-20' }, { defaultReps: '' }, { id: 'replacement' }]) {
    assert.throws(() => tools.editSavedPlanExercise(exercise, changes));
  }
});

test('saving an edited plan retains concurrent unrelated edits but refuses changed or deleted targets and invalid structures', () => {
  const baseline = threeSavedPlans(), latest = plain(baseline), draft = plain(baseline[0]);
  latest[2].name = 'Other changes';
  draft.sessions[0].exercises.reverse();
  const result = tools.replaceSavedPlan(latest, baseline[0], draft);
  assert.equal(result[2].name, 'Other changes');
  assert.equal(result[0].sessions[0].exercises[1].id, 'owner:triangle-pulldown');
  latest[0].name = 'Concurrent edit';
  assert.throws(() => tools.replaceSavedPlan(latest, baseline[0], draft), /reopen the editor/);
  assert.throws(() => tools.replaceSavedPlan(latest.slice(1), baseline[0], draft), /reopen the editor/);
  const empty = plain(baseline[0]); empty.sessions[0].exercises = [];
  assert.throws(() => tools.replaceSavedPlan(baseline, baseline[0], empty), /at least one/);
  const duplicate = plain(baseline[0]); duplicate.sessions[0].exercises.push(duplicate.sessions[0].exercises[0]);
  assert.throws(() => tools.replaceSavedPlan(baseline, baseline[0], duplicate), /distinct/);
});

test('saved plan identity snapshots keep custom names and A/B/A/B day labels stable after later edits', () => {
  const plan = { id: 'four-day', name: 'התוכנית שלי', options: { goal: 'muscle' },
    sessions: ['A', 'B', 'A', 'B'].map((label) => ({ label, exercises: [] })) };
  const workout = { planSnapshot: plain(tools.planIdentity(plan, 2)) };
  plan.name = 'Renamed'; plan.sessions[2].label = 'Changed';
  assert.equal(tools.sessionWorkoutTitle(workout), 'התוכנית שלי · אימון 3 (A)');
  assert.equal(workout.planSnapshot.id, 'four-day');
  assert.equal(tools.sessionWorkoutTitle({}), 'האימון שלי');
});

test('unnamed rope workout titles retain the saved level and duration with shared bilingual formatting', () => {
  const plan = tools.generateRopePlan('intermediate', 15, catalog);
  plan.id = 'saved-rope';
  const workout = { planSnapshot: tools.planIdentity(plan, 0) };
  assert.equal(tools.sessionWorkoutTitle(workout), 'קפיצה על חבל · בינונית · 15 דקות');
  const { EN } = load('www/js/translations-en.js', ['EN'], { LIBRARY_TRANSLATIONS: library.LIBRARY_TRANSLATIONS });
  const i18n = load('www/js/i18n.js', ['text', 'setLanguage'], { EN });
  i18n.setLanguage('en');
  assert.equal(tools.sessionWorkoutTitle(workout, i18n.text), 'Jump rope · Intermediate · 15 minutes');
  workout.planSnapshot.name = 'החבל שלי';
  assert.equal(tools.sessionWorkoutTitle(workout, i18n.text), 'החבל שלי');
});

test('calendar week starts on local Sunday across month/year boundaries, including the first week after build 32', () => {
  for (const [date, expected] of [
    [new Date(2026, 9, 25, 12), [2026, 9, 25]],
    [new Date(2026, 9, 24, 23, 59), [2026, 9, 18]],
    [new Date(2027, 0, 1, 12), [2026, 11, 27]],
    [new Date(2027, 0, 3, 12), [2027, 0, 3]],
  ]) {
    const start = tools.calendarWeekStart(date);
    assert.deepEqual([start.getFullYear(), start.getMonth(), start.getDate()], expected);
    assert.equal(start.getHours(), 0);
    assert.equal(start.getDay(), 0);
  }
  const source = read('www/js/app.js'), now = new Date(2026, 9, 25, 12).getTime();
  class ReviewDate extends Date { constructor(...args) { super(...(args.length ? args : [now])); } }
  const context = vm.createContext({ trainingTools: tools, Date: ReviewDate,
    workouts: [{ dateISO: new Date(2026, 9, 24, 23, 59).toISOString() },
      { dateISO: new Date(2026, 9, 26).toISOString() }, { dateISO: 'invalid' }] });
  vm.runInContext(source.slice(source.indexOf('function workoutWeekKey('), source.indexOf('function renderVolumeChart(')), context);
  assert.equal(context.countThisWeek(), 0);
  context.workouts.push({ dateISO: new Date(2026, 9, 25, 10).toISOString() });
  assert.equal(context.countThisWeek(), 1);
  assert.equal(context.workoutWeekKey(new ReviewDate(now)), '2026-10-25');
});

test('current-only removal archives every set/target and undo restores original identity and order after reload', () => {
  const original = session([entry(find('chest'), [set(40, 12, true, { notes: 'keep', difficulty: 'hard' }), set(45, 6)]),
    entry(find('floor')), { exerciseId: 'walk', type: 'cardio', durationSec: 300, completed: true }]);
  original.entries[0].exerciseSnapshot = { ...find('chest'), custom: { keep: true } };
  original.currentExerciseId = original.entries[0].exerciseId;
  original.lastCompletedSet = { exerciseId: original.currentExerciseId, setIndex: 0 };
  const before = plain(original), id = original.currentExerciseId;
  const removed = tools.removeWorkoutExercise(original, id);
  assert.deepEqual(original, before);
  assert.equal(removed.entries.length, 2);
  assert.deepEqual(plain(removed.removedExercises[0].entry), before.entries[0]);
  assert.equal(removed.currentExerciseId, undefined);
  assert.equal(removed.lastCompletedSet, undefined);
  assert.equal(removed.activityControlRevision, 1);
  const reloaded = plain(removed), restored = tools.restoreWorkoutExercise(reloaded, id);
  assert.deepEqual(plain(restored.entries), before.entries);
  assert.equal(restored.removedExercises, undefined);
  assert.equal(restored.activityControlRevision, 2);
  const history = tools.workoutHistoryEntries(reloaded);
  assert.equal(history.length, 3);
  assert.equal(history.find((item) => item.exerciseId === id).removedFromWorkout, true);
  assert.equal(history.find((item) => item.exerciseId === id).sets[0].difficulty, 'hard');
});

test('removing all exercises has zero active targets and multiple undos recover every entry without duplicates', () => {
  let current = session([entry(find('chest')), entry(find('floor')), entry(find('curl'))]);
  const original = plain(current), ids = current.entries.map((item) => item.exerciseId);
  for (const id of ids) current = tools.removeWorkoutExercise(current, id);
  assert.equal(current.entries.length, 0);
  assert.equal(tools.currentWorkoutEntry(current), undefined);
  assert.equal(tools.estimateWorkoutDuration(current).seconds, 0);
  for (const id of [ids[1], ids[0], ids[2]]) current = tools.restoreWorkoutExercise(current, id);
  assert.deepEqual(plain(current.entries), original.entries);
  assert.throws(() => tools.restoreWorkoutExercise(current, ids[0]), /changed/);
  assert.throws(() => tools.removeWorkoutExercise({ ...current, running: true }, ids[0]), /Pause/);
});

test('time-budget restoration cannot resurrect a removed exercise, and undo remains safe after full restoration', () => {
  const first = entry(find('chest')), second = entry(find('floor')), deferred = entry(find('curl'));
  const current = session([first, second]);
  current.timeBudget = { minutes: 30, order: [first.exerciseId, deferred.exerciseId, second.exerciseId], deferred: [deferred] };
  const removed = tools.removeWorkoutExercise(current, first.exerciseId);
  const full = tools.restoreTimeBudget(removed);
  assert.deepEqual(Array.from(full.entries, (item) => item.exerciseId), [deferred.exerciseId, second.exerciseId]);
  const restored = tools.restoreWorkoutExercise(full, first.exerciseId);
  assert.equal(restored.entries.filter((item) => item.exerciseId === first.exerciseId).length, 1);
  assert.equal(restored.entries.length, 3);
  assert.deepEqual(Array.from(restored.entries, (item) => item.exerciseId), current.timeBudget.order);
});

test('removal and undo immediately recompute mixed cardio/strength counts and percentages, including zero targets', () => {
  const elements = new Map(), el = (id) => {
    if (!elements.has(id)) elements.set(id, { textContent: '', style: {} });
    return elements.get(id);
  };
  const original = session([entry(find('chest'), [set(40, 12, true)]),
    entry(find('floor'), [set(), set()]), { exerciseId: 'warmup', type: 'cardio', completed: true }]);
  const context = vm.createContext({ activeSession: original, el, i18n: { text: (text) => text }, refreshDifficultyFeedback() {} });
  const source = read('www/js/app.js');
  vm.runInContext(source.slice(source.indexOf('function getWorkoutSetProgress()'), source.indexOf('function refreshDifficultyFeedback()')), context);
  context.updateProgress();
  assert.equal(el('setsProgressText').textContent, '1 / 3 סטים הושלמו (33%)');
  assert.equal(el('exProgressText').textContent, '2 / 3 תרגילים הושלמו (67%)');
  context.activeSession = tools.removeWorkoutExercise(original, original.entries[1].exerciseId);
  context.updateProgress();
  assert.equal(el('setsProgressText').textContent, '1 / 1 סטים הושלמו (100%)');
  assert.equal(el('exProgressText').textContent, '2 / 2 תרגילים הושלמו (100%)');
  assert.equal(el('overallProgressBadge').textContent, '100%');
  context.activeSession = tools.restoreWorkoutExercise(context.activeSession, original.entries[1].exerciseId);
  context.updateProgress();
  assert.equal(el('overallProgressBadge').textContent, '50%');
  for (const item of original.entries.filter((entry) => entry.type !== 'cardio')) {
    context.activeSession = tools.removeWorkoutExercise(context.activeSession, item.exerciseId);
  }
  context.updateProgress();
  assert.equal(el('setsProgressText').textContent, '1 / 1 מקטעי אירובי הושלמו (100%)');
  assert.equal(el('overallProgressBadge').textContent, '100%');
  for (const item of [...context.activeSession.entries]) context.activeSession = tools.removeWorkoutExercise(context.activeSession, item.exerciseId);
  context.updateProgress();
  assert.equal(el('exProgressText').textContent, '0 / 0 תרגילים הושלמו (0%)');
  assert.equal(el('overallProgressBadge').textContent, '0%');
});

test('removed swap participants cannot be restored twice or reused as replacement exercises', () => {
  const original = find('chest'), replacement = tools.alternatives(original, catalog)[0];
  assert.ok(replacement);
  const current = session([entry(original, [set(40, 12, true), set(45, 8)])]);
  const swapped = tools.swapExercise(current, original.id, replacement, catalog);
  for (const id of [original.id, replacement.id]) {
    const removed = tools.removeWorkoutExercise(swapped, id);
    assert.throws(() => tools.restoreSubstitution(removed, replacement.id), /Undo exercise removal/);
    const restored = tools.restoreSubstitution(tools.restoreWorkoutExercise(removed, id), replacement.id);
    assert.equal(restored.entries.find((item) => item.exerciseId === original.id).sets[0].weightKg, 40);
    assert.equal(restored.entries.filter((item) => item.exerciseId === original.id).length, 1);
  }
  const removedTarget = tools.removeWorkoutExercise(session([entry(original), entry(replacement)]), replacement.id);
  assert.throws(() => tools.swapExercise(removedTarget, original.id, replacement, catalog), /unavailable/);
});

test('paused hold measurements and rope interval recipes survive removal, reload and undo unchanged', () => {
  const hold = { exerciseId: 'hold', exerciseName: 'Hold', exerciseSnapshot: { inputType: 'hold', holdSeconds: 30 },
    sets: [{ weightKg: '', reps: 30, completed: false, holdElapsedSec: 13, resumeAfterPause: true, notes: 'keep hold' }] };
  const rope = { exerciseId: 'rope', exerciseName: 'Rope', type: 'cardio', completed: false, elapsedSec: 73,
    durationSec: 300, resumeAfterPause: true, intervalPhaseIndex: 2,
    intervals: [{ kind: 'work', seconds: 20, round: 1 }, { kind: 'rest', seconds: 40, round: 1 }] };
  const original = session([hold, rope]);
  original.paused = true;
  let current = tools.removeWorkoutExercise(original, 'hold');
  current = plain(tools.removeWorkoutExercise(current, 'rope'));
  current = tools.restoreWorkoutExercise(current, 'rope');
  current = tools.restoreWorkoutExercise(current, 'hold');
  assert.deepEqual(plain(current.entries), original.entries);
  assert.throws(() => tools.removeWorkoutExercise(session([{ ...rope, startedAt: 123 }]), 'rope'), /Pause/);
  assert.throws(() => tools.removeWorkoutExercise(session([{ ...hold,
    sets: [{ ...hold.sets[0], holdStartedAt: 123 }] }]), 'hold'), /Pause/);
});

test('75 additional exercises have distinct trusted muscle, movement and real-equipment metadata', () => {
  const additions = catalog.filter((exercise) => exercise.id.startsWith('library:extended-'));
  assert.equal(additions.length, 75);
  assert.equal(new Set(additions.map((exercise) => exercise.catalogId)).size, 75);
  for (const exercise of additions) {
    const metadata = tools.trainingMetadata(exercise);
    assert.ok(metadata, exercise.name);
    assert.equal(metadata.primary, library.exerciseGuide(exercise).muscles[0]);
    assert.equal(exercise.active, false);
  }
  assert.equal(tools.trainingMetadata({ name: 'My TRX row', inputType: 'reps' }), null);
});

test('the PDF exercise variants are real distinct library choices with correct muscle and measurement identities', () => {
  const required = ['barbellBench', 'inclineDumbbellPress', 'smithInclinePress', 'highCableFly',
    'pullup', 'neutralPulldown', 'preacherCurlMachine', 'preacherHammerCurl', 'supportedKickback',
    'hackSquatMachine', 'seatedLegCurl', 'lyingLegCurl', 'dumbbellCalfRaise', 'hipAdduction',
    'walkingLunge', 'seatedOneArmLateral', 'abCrunchMachine', 'abWheelRollout'];
  for (const id of required) {
    const exercise = find(id);
    assert.ok(exercise, id);
    assert.equal(exercise.inputType, 'reps', id);
    assert.ok(tools.trainingMetadata(exercise), id);
  }
  assert.equal(tools.trainingMetadata(find('ropePushdown')).primary, 'יד אחורית');
  assert.ok(library.exerciseGuide(find('abWheelRollout')).equipment.includes('גלגל בטן'));
  assert.ok(!catalog.some((exercise) => exercise.catalogId === 'rollup'));
  assert.equal(find('highPlank').inputType, 'hold');
  assert.equal(find('stationaryBike').inputType, 'cardio');
  assert.equal(find('elliptical').inputType, 'cardio');
});

test('the built-in catalog counter is separate from installed custom exercises and selected workout membership', () => {
  const seed = load('www/js/seed.js', ['SEED_EXERCISES']).SEED_EXERCISES;
  const data = [{ id: 'mine:1', name: 'Custom', active: true }, { ...find('chairStand'), active: false }];
  assert.deepEqual(plain(library.catalogStats(data, seed)), { builtIn: 132, stored: 2, selected: 1 });
  assert.deepEqual(plain(library.catalogStats([], seed)), { builtIn: 132, stored: 0, selected: 0 });
});

test('all authored diagrams render and new equipment variants have appropriate distinct movement poses', () => {
  for (const [id, guide] of Object.entries(library.EXERCISE_GUIDES)) {
    const svg = library.exerciseIllustration(guide);
    assert.match(svg, /^<svg /, id);
    assert.doesNotMatch(svg, /NaN|Infinity|undefined/, id);
  }
  const expected = { smithInclinePress: 'inclinePress', inclineDumbbellPress: 'inclinePress',
    chestSupportedRow: 'supportedRow', pullup: 'pullup', hackSquatMachine: 'hackSquat',
    barbellSquat: 'backSquat', seatedOneArmLateral: 'seatedLateral', elliptical: 'elliptical' };
  for (const [id, pose] of Object.entries(expected)) assert.equal(library.exerciseGuide(find(id)).pose, pose);
  const smith = library.exerciseIllustration(library.exerciseGuide(find('smithInclinePress')));
  assert.match(smith, /M12 4v134M144 4v134/, 'Smith illustration includes guide rails');
});

test('named workout snapshots preserve effective sets, explicit loads, holds, cardio and custom IDs without logging results', () => {
  const custom = { id: 'native:custom:1', name: 'My private exercise', active: true, defaultSets: 3, defaultReps: '8',
    restSeconds: 125, targetWeightKg: 17.5, notes: 'Private note', images: ['photo'] };
  const hold = { ...find('highPlank'), active: true, holdSeconds: 27 };
  const cardio = { ...find('stationaryBike'), active: true, durationMinutes: 12, pace: 'My easy pace' };
  const exercises = [custom, hold, cardio, find('chest')];
  const state = { exercises, program: tools.durationSession(exercises, () => 1), settings: { restSeconds: 100 } };
  const before = JSON.stringify(state);
  const first = tools.createSavedWorkout('  Upper day  ', state, 'plan:first');
  const second = tools.createSavedWorkout('Lower day', state, 'plan:second');
  assert.equal(first.name, 'Upper day');
  assert.notEqual(first.id, second.id);
  assert.equal(first.sessions[0].exercises.length, 3);
  assert.equal(first.sessions[0].exercises[0].defaultSets, 1);
  assert.equal(first.sessions[0].exercises[0].restSeconds, 125);
  assert.equal(first.sessions[0].exercises[0].targetWeightKg, 17.5);
  assert.equal(first.sessions[0].exercises[1].holdSeconds, 27);
  assert.equal(first.sessions[0].exercises[1].restSeconds, 90);
  assert.equal(first.sessions[0].exercises[2].durationMinutes, 12);
  assert.equal(first.sessions[0].exercises[2].pace, 'My easy pace');
  assert.ok(first.sessions[0].exercises.every((exercise) => !exercise.sets && !exercise.images && !exercise.completed));
  assert.equal(JSON.stringify(state), before);
  const reordered = tools.createSavedWorkout('Different order',
    { ...state, program: { entries: [...state.program.entries].reverse() } }, 'plan:reordered');
  assert.deepEqual(plain(reordered.sessions[0].exercises.map((exercise) => exercise.id)), [cardio.id, hold.id, custom.id]);
  for (const invalid of ['', '   ', 'x'.repeat(81)]) assert.throws(() => tools.createSavedWorkout(invalid, state, 'bad'));
  assert.throws(() => tools.createSavedWorkout('Empty', { ...state, exercises: [] }, 'bad'));
  const later = exercises.map((exercise) => ({ ...exercise, targetWeightKg: 99, holdSeconds: 60, pace: 'Changed' }));
  const activated = tools.activatePlanExercises(later, first.sessions[0].exercises);
  assert.equal(activated[0].targetWeightKg, 17.5);
  assert.equal(activated[0].name, custom.name);
  assert.deepEqual(plain(activated[0].images), custom.images);
  assert.equal(activated[1].holdSeconds, 27);
  assert.equal(activated[1].targetWeightKg, null);
  assert.equal(activated[2].pace, 'My easy pace');
  assert.throws(() => tools.activatePlanExercises(later.filter((exercise) => exercise.id !== custom.id), first.sessions[0].exercises));
  assert.throws(() => tools.activatePlanExercises(later.map((exercise) => exercise.id === custom.id
    ? { ...exercise, inputType: 'hold' } : exercise), first.sessions[0].exercises));
});

const homePreferences = (patch = {}) => ({ goal: 'fitness', experience: 'beginner', days: 1, minutes: 30,
  location: 'home', equipment: [], ...patch });
const movements = (plan) => plan.sessions.flatMap((day) => day.exercises.map((exercise) => exercise.catalogId));

test('requested incline chest and overhead cable triceps movements already exist as distinct guided variants', () => {
  for (const id of ['inclineDumbbellPress', 'smithInclinePress', 'overheadCableTriceps']) {
    assert.equal(catalog.filter((exercise) => exercise.catalogId === id).length, 1);
    const exercise = find(id), guide = library.exerciseGuide(exercise);
    assert.ok(guide.videos.length);
    assert.equal(guide.steps.length, 3);
    assert.equal(tools.trainingMetadata(exercise).primary, id === 'overheadCableTriceps' ? 'יד אחורית' : 'חזה');
  }
  assert.notDeepEqual(library.exerciseGuide(find('overheadCableTriceps')).equipment,
    library.exerciseGuide(find('overhead')).equipment);
});

test('explicit full body keeps major push, pull and leg work in each generously budgeted day', () => {
  const plan = tools.generatePlan(homePreferences({ split: 'full-body', days: 3, minutes: 60, equipment: ['מכונה'], location: 'gym' }), catalog);
  for (const day of plan.sessions) {
    const primary = day.exercises.map((exercise) => tools.trainingMetadata(exercise)?.primary);
    for (const muscle of ['חזה', 'גב', 'רגליים']) assert.ok(primary.includes(muscle), `${day.label}: ${muscle}`);
    assert.equal(new Set(day.exercises.map((exercise) => exercise.id)).size, day.exercises.length);
  }
});

test('A/B repeats genuinely different upper and lower sessions without changing the catalog', () => {
  const before = JSON.stringify(catalog);
  const plan = tools.generatePlan(homePreferences({ split: 'ab', days: 4, minutes: 60, equipment: ['מכונה'], location: 'gym' }), catalog);
  assert.deepEqual(plain(plan.sessions.map((day) => day.label)), ['A', 'B', 'A', 'B']);
  assert.notDeepEqual(movements({ sessions: [plan.sessions[0]] }), movements({ sessions: [plan.sessions[1]] }));
  for (const day of plan.sessions) for (const exercise of day.exercises) assert.ok(day.splitMuscles.includes(tools.trainingMetadata(exercise).primary));
  assert.equal(JSON.stringify(catalog), before);
  assert.throws(() => tools.generatePlan(homePreferences({ split: 'ab', days: 1 }), catalog), /preferences/);
});

test('a short explicit full-body strength budget retains available major muscle coverage instead of silently dropping it', () => {
  const plan = tools.generatePlan(homePreferences({ split: 'full-body', goal: 'strength', experience: 'regular',
    minutes: 20, equipment: ['מכונה'], location: 'gym' }), catalog);
  const day = plan.sessions[0];
  assert.deepEqual(plain(day.requiredMuscles), ['חזה', 'גב', 'רגליים']);
  for (const muscle of day.requiredMuscles) assert.ok(day.exercises.some((exercise) => tools.trainingMetadata(exercise).primary === muscle));
  assert.ok(tools.estimateWorkoutDuration(tools.durationSession(day.exercises)).highSeconds > 20 * 60);
  assert.ok(day.exercises.every((exercise) => exercise.restSeconds === 150));
});

test('A/B/C produces six reviewed push, pull and leg sessions with appropriate selected-muscle coverage', () => {
  const plan = tools.generatePlan(homePreferences({ split: 'abc', days: 6, minutes: 60,
    equipment: ['מכונה'], location: 'gym', muscles: ['חזה', 'גב', 'רגליים'] }), catalog);
  assert.deepEqual(plain(plan.sessions.map((day) => day.label)), ['A', 'B', 'C', 'A', 'B', 'C']);
  assert.deepEqual(plain(plan.sessions.map((day) => day.requiredMuscles)), [['חזה'], ['גב'], ['רגליים'], ['חזה'], ['גב'], ['רגליים']]);
  for (const day of plan.sessions) for (const exercise of day.exercises) assert.ok(day.requiredMuscles.includes(tools.trainingMetadata(exercise).primary));
  assert.throws(() => tools.generatePlan(homePreferences({ split: 'abc', days: 2 }), catalog), /preferences/);
  assert.throws(() => tools.generatePlan(homePreferences({ split: 'ab', days: 2, muscles: ['חזה'] }), catalog), /every split day/);
  assert.throws(() => tools.generatePlan(homePreferences({ split: 'ab', days: 2, goal: 'walk' }), catalog), /preferences/);
});

test('all rope levels and time budgets include bounded distinct intervals, warmup, recovery and cooldown', () => {
  const before = JSON.stringify(catalog), doses = [];
  for (const level of ['beginner', 'intermediate', 'advanced']) for (const minutes of [10, 15, 20, 30]) {
    const plan = tools.generateRopePlan(level, minutes, catalog, 'outside');
    const exercise = plan.sessions[0].exercises[0];
    const phases = tools.ropeIntervalSchedule(exercise.intervals);
    assert.equal(phases[0].kind, 'warmup');
    assert.equal(phases.at(-1).kind, 'cooldown');
    assert.equal(phases[0].seconds, 120);
    assert.equal(phases.at(-1).seconds, 120);
    const seconds = phases.reduce((sum, phase) => sum + phase.seconds, 0);
    assert.equal(exercise.durationMinutes * 60, seconds);
    assert.ok(seconds <= minutes * 60 && seconds > minutes * 60 - exercise.intervals.workSeconds - exercise.intervals.recoverySeconds);
    assert.equal(phases.length, 2 + 2 * exercise.intervals.rounds);
    assert.equal(exercise.location, 'outside');
    assert.equal(exercise.catalogId, 'jumpRope');
    assert.deepEqual(plain(plan.options.equipment), ['חבל קפיצה']);
    doses.push(`${exercise.intervals.workSeconds}/${exercise.intervals.recoverySeconds}`);
  }
  assert.equal(new Set(doses).size, 3);
  assert.equal(JSON.stringify(catalog), before);
  for (const level of ['toString', '__proto__', '', 'expert']) assert.throws(() => tools.generateRopePlan(level, 10, catalog));
  assert.throws(() => tools.generateRopePlan('beginner', 1, catalog));
  assert.throws(() => tools.generateRopePlan('beginner', 10, catalog, 'treadmill'));
});

test('rope phase boundaries remain exact across pause, reload, running elapsed time and completion', () => {
  const exercise = tools.generateRopePlan('beginner', 10, catalog).sessions[0].exercises[0];
  const state = { intervals: exercise.intervals, elapsedSec: 0, startedAt: null };
  for (const [elapsedSec, kind, remaining] of [[0, 'warmup', 120], [119, 'warmup', 1], [120, 'work', 20],
    [139.5, 'work', 1], [140, 'recovery', 40], [180, 'work', 20], [480, 'cooldown', 120], [600, 'done', 0]]) {
    const paused = { ...state, elapsedSec };
    assert.equal(tools.cardioIntervalPhase(plain(paused), 999999).kind, kind);
    assert.equal(tools.cardioIntervalPhase(plain(paused), 999999).remainingSeconds, remaining);
  }
  assert.equal(tools.cardioIntervalPhase({ ...state, elapsedSec: 100, startedAt: 1000 }, 21000).kind, 'work');
  assert.equal(tools.cardioIntervalPhase({ ...state, completed: true }).kind, 'done');
  for (const patch of [{ rounds: 100000 }, { rounds: 0 }, { workSeconds: 0 }, { warmupSeconds: 0 },
    { level: 'toString', workSeconds: undefined, recoverySeconds: undefined }]) {
    assert.throws(() => tools.ropeIntervalSchedule({ ...exercise.intervals, ...patch }), /Invalid rope/);
  }
});

test('rope prescriptions survive named snapshots, JSON and program activation without sharing mutable recipes', () => {
  const exercise = { ...tools.generateRopePlan('intermediate', 15, catalog).sessions[0].exercises[0], active: true };
  const program = tools.durationSession([exercise]);
  const saved = tools.createSavedWorkout('Rope intervals', { exercises: [exercise], program, settings: {} }, 'rope-saved');
  const prescription = plain(exercise.intervals);
  exercise.intervals.rounds = 1;
  assert.deepEqual(plain(saved.sessions[0].exercises[0].intervals), prescription);
  const activated = tools.activatePlanExercises(catalog, plain(saved).sessions[0].exercises);
  assert.deepEqual(plain(activated.find((item) => item.id === exercise.id).intervals), prescription);
  const steady = tools.activatePlanExercises(activated, [{ ...find('jumpRope'), intervals: null }]);
  assert.equal(steady[0].intervals, null, 'A later steady session must not retain an old interval prescription');
});

test('real rope cardio ticking updates only phase labels until completion and coalesces announcements', () => {
  const source = read('www/js/app.js');
  let now = 1000, rerenders = 0, saves = 0;
  const exercise = tools.generateRopePlan('beginner', 10, catalog).sessions[0].exercises[0];
  const item = { exerciseId: exercise.id, exerciseName: exercise.name, type: 'cardio',
    intervals: exercise.intervals, durationSec: 600, startedAt: 1000 };
  const nodes = new Map(), speech = [];
  const context = vm.createContext({ trainingTools: tools, activeSession: { entries: [item] },
    Date: { now: () => now }, i18n: { text: (value) => value, locale: () => 'he-IL' },
    el: (id) => { if (!nodes.has(id)) nodes.set(id, { textContent: '' }); return nodes.get(id); },
    settings: { voiceAnnouncements: true }, formatHMS: (seconds) => String(Math.ceil(seconds)),
    persistActiveSession: () => saves++, speak: (...args) => speech.push(args), playBeep() {}, notify() {}, showToast() {},
    cardioCompletionMessage: () => 'Complete', renderWorkoutTab: () => rerenders++,
    advanceWorkoutFocus() {}, qs: () => null, updateProgress() {}, refreshVoiceSelection() {}, syncWorkoutActivity() {},
  });
  vm.runInContext(source.slice(source.indexOf('function intervalPhaseText('), source.indexOf('function renderCardioCard(')), context);
  vm.runInContext(source.slice(source.indexOf('function tickCardioTimers('), source.indexOf('/* ---- hold-type')), context);
  context.tickCardioTimers();
  context.tickCardioTimers();
  assert.equal(saves, 1); assert.equal(speech.length, 1); assert.equal(rerenders, 0);
  now += 120000;
  context.tickCardioTimers();
  assert.equal(nodes.get(`rope-phase-${exercise.id}`).textContent, 'סבב 1 / 6 · קפיצה');
  assert.equal(speech.length, 2); assert.equal(rerenders, 0);
  now = 601000;
  context.tickCardioTimers();
  assert.equal(item.completed, true); assert.equal(rerenders, 0);
  context.tickCardioTimers();
  assert.equal(rerenders, 0);
});

test('home planning without equipment uses honest floor/wall options, never imaginary back coverage', () => {
  const before = JSON.stringify(catalog);
  const plan = tools.generatePlan(homePreferences(), catalog);
  assert.ok(movements(plan).includes('wallPushup'));
  assert.ok(plan.omitted.includes('horizontal-pull'));
  for (const exercise of plan.sessions[0].exercises) {
    assert.ok(library.exerciseGuide(exercise).equipment.every((item) => ['משקל גוף', 'ללא ציוד', 'מזרן', 'קיר'].includes(item)));
  }
  assert.equal(JSON.stringify(catalog), before);
});

test('a home chair is used for sitting and is never silently treated as a bench or suspension anchor', () => {
  const plan = tools.generatePlan(homePreferences({ equipment: ['כיסא יציב'] }), catalog);
  assert.ok(movements(plan).includes('chairStand'));
  assert.ok(!movements(plan).includes('inclinePushup'));
  assert.ok(!movements(plan).includes('trxRow'));
  assert.ok(plan.omitted.includes('horizontal-pull'));
});

test('TRX requires an actual checked boolean and supplies primary back work only when explicitly selected', () => {
  for (const value of [undefined, false, 'true', 1]) {
    assert.throws(() => tools.generatePlan(homePreferences({ equipment: ['TRX'], trxAnchorChecked: value }), catalog), /TRX anchor/);
  }
  const plan = tools.generatePlan(homePreferences({ equipment: ['TRX'], trxAnchorChecked: true, muscles: ['גב'] }), catalog);
  assert.equal(plan.sessions[0].exercises[0].catalogId, 'trxRow');
  assert.ok(plan.sessions[0].exercises.every((exercise) => tools.trainingMetadata(exercise).primary === 'גב'));
  assert.throws(() => tools.generatePlan(homePreferences({ muscles: ['גב'] }), catalog), /every selected muscle/);
});

test('home plans remain reviewable with an old stored library and activate new choices only explicitly', () => {
  const stored = catalog.filter((exercise) => !exercise.id.startsWith('library:extended-'));
  const before = JSON.stringify(stored);
  const proposal = tools.generatePlan(homePreferences({ equipment: ['כיסא יציב'] }), stored);
  const expanded = tools.planningCatalog(stored);
  assert.equal(JSON.stringify(stored), before);
  const activated = tools.activatePlanExercises(expanded, proposal.sessions[0].exercises);
  assert.ok(activated.find((exercise) => exercise.catalogId === 'chairStand').active);
  assert.equal(JSON.stringify(stored), before);
  assert.equal(new Set(expanded.map((exercise) => exercise.id)).size, expanded.length);
});

test('home equipment and duration preferences are validated without truthy or duplicate equipment substitutions', () => {
  for (const equipment of [['chair'], ['כיסא יציב', 'כיסא יציב'], ['secret machine'], null]) {
    assert.throws(() => tools.generatePlan(homePreferences({ equipment }), catalog), /preferences/);
  }
  for (const minutes of [20, 30, 45, 60, 90]) {
    const plan = tools.generatePlan(homePreferences({ minutes, equipment: ['גומייה'] }), catalog);
    const estimate = tools.estimateWorkoutDuration(tools.durationSession(plan.sessions[0].exercises));
    assert.ok(estimate.seconds > 0);
    assert.ok(Number.isFinite(estimate.highSeconds));
    assert.equal(plan.options.minutes, minutes);
  }
});

test('expanded per-side exercises count both sides without doubling rests, transitions or saved set counts', () => {
  for (const id of ['splitSquat', 'singleBridge', 'clamShell', 'singleCalf', 'alternatingCurl', 'concentrationCurl', 'heelTap', 'kneeSidePlank']) {
    const exercise = find(id);
    const value = { sets: [set('', 10)], targetReps: 10 };
    const estimate = tools.estimateEntryDuration(value, exercise, 90, { remaining: false });
    const expectedWork = exercise.inputType === 'hold' ? 20 : 50;
    assert.equal(estimate.restSeconds, 90);
    assert.equal(estimate.seconds, expectedWork + 90 + 22.5, id);
    assert.equal(value.sets.length, 1);
  }
});

test('one average estimate formats minute/hour boundaries through the real Hebrew and English translator', () => {
  const { EN } = load('www/js/translations-en.js', ['EN'], { LIBRARY_TRANSLATIONS: {} });
  const i18n = load('www/js/i18n.js', ['text', 'setLanguage'], { EN });
  const { durationEstimateText } = load('www/js/training-ui.js', ['durationEstimateText'], { i18n });
  const examples = [
    [0, '0 דקות', '0 minutes'], [1, 'דקה', '1 minute'], [59, '59 דקות', '59 minutes'],
    [60, 'שעה', '1 hour'], [61, 'שעה ודקה', '1 hour and 1 minute'],
    [96, 'שעה ו־36 דקות', '1 hour and 36 minutes'], [120, 'שעתיים', '2 hours'],
    [130, 'שעתיים ו־10 דקות', '2 hours and 10 minutes'], [186, '3 שעות ו־6 דקות', '3 hours and 6 minutes'],
  ];
  for (const [language, column] of [['he', 1], ['en', 2]]) {
    i18n.setLanguage(language);
    for (const example of examples) {
      assert.equal(durationEstimateText({ lowSeconds: example[0] * 60, highSeconds: example[0] * 60 }), example[column]);
    }
  }
  assert.equal(durationEstimateText({ lowSeconds: 160 * 60, highSeconds: 212 * 60 }), '3 hours and 6 minutes');
  assert.equal(durationEstimateText({ lowSeconds: 59 * 60, highSeconds: 60 * 60 }), '1 hour');
});

function pauseController(savedSession) {
  let now = 1700000000000, nextTimer = 0;
  class ClockDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const intervals = new Map(), calls = [], saved = [], messages = [], elements = new Map();
  const el = (id) => {
    if (!elements.has(id)) {
      const classes = new Set();
      elements.set(id, { textContent: '', dataset: {}, style: {}, disabled: false,
        setAttribute(name, value) { if (name === 'data-exercise-name') this.dataset.exerciseName = value; },
        classList: { add: (value) => classes.add(value), remove: (value) => classes.delete(value),
          contains: (value) => classes.has(value), toggle: (value, force) => force ? classes.add(value) : classes.delete(value) } });
    }
    return elements.get(id);
  };
  const timers = { Date: ClockDate, setInterval: (callback) => { intervals.set(++nextTimer, callback); return nextTimer; },
    clearInterval: (id) => intervals.delete(id) };
  const { Stopwatch, RestTimer, formatHMS } = load('www/js/timer.js', ['Stopwatch', 'RestTimer', 'formatHMS'], timers);
  const activeSession = savedSession || { id: 'paused-session', startedAt: new ClockDate(now - 120000).toISOString(), running: true,
    entries: [
      { exerciseId: 'native:chest', exerciseName: 'Chest', sets: [set(20, 12, true, { notes: 'keep', difficulty: 'right' }), set(25, 3)] },
      { exerciseId: 'native:hold', exerciseName: 'Hold', sets: [set('', '', false, { holdStartedAt: now - 10000 })] },
      { exerciseId: 'native:cardio', exerciseName: 'Walk', type: 'cardio', durationSec: 600, elapsedSec: 40, startedAt: now - 20000 },
    ] };
  const context = vm.createContext({ ...timers, activeSession, formatHMS, privacyErasing: false,
    finishingWorkout: false, pendingWorkoutAutoFinish: null,
    settings: { voiceAnnouncements: false, voiceCommandsEnabled: true }, workouts: [],
    exercises: [{ id: 'native:chest', name: 'Chest', inputType: 'reps', restSeconds: 90 },
      { id: 'native:hold', name: 'Hold', inputType: 'hold', holdSeconds: 30, restSeconds: 90 }],
    appInitialized: true, activityActionsInFlight: new Set(), activityActionResults: new Map(), activitySyncChain: Promise.resolve(),
    workoutGreetingTimer: null, setTimeout() {}, clearTimeout() {}, el, holdTimers: new Map(),
    restDoneMessage: 'next set', lastVoiceAction: {}, lastVoiceReport: {}, pendingVoiceFinish: {}, lastAutoCountCompletion: {},
    activityReadyEnabled: true, voiceCountingState: activeSession.running
      ? { entry: activeSession.entries[0], set: activeSession.entries[0].sets[1], entryIndex: 0, setIndex: 1, count: 3, targetReps: 12 } : null,
    native: { isNative: () => true, bgStopKeepAlive: () => calls.push('stopBackground'),
      bgStartKeepAlive: async () => { calls.push('startBackground'); return true; },
      bgCancelAnnouncements: () => calls.push('cancelAnnouncements'),
      voiceStopListening: async () => calls.push('stopListening'),
      acknowledgeWorkoutActivityAction: async (value) => { calls.push(plain(value)); return { ok: true }; },
      voiceStartListening: async () => { calls.push('startListening'); return { listening: true }; } },
    db: { saveActiveSession: (value) => saved.push(plain(value)), saveWorkouts() {}, clearActiveSession() {} },
    i18n: { text: (value) => value, translateDOM() {}, exerciseName: (value) => value, getLanguage: () => 'he', locale: () => 'he-IL' },
    document: { visibilityState: 'visible' }, currentTab: 'workout', voiceListeningActive: !!activeSession.running,
    voiceListeningRevision: 0, voiceActivationPending: false, voiceListeningError: '', voiceInputName: '',
    voiceReports: { voiceReportHints: () => [] }, voiceExerciseNames: () => [],
    requestWakeLock() {}, speak() {}, playBeep() {}, cancelSpeech() {}, refreshVoiceSelection() {}, updateVoiceBadgeForListeningState() {},
    isEntryDone: (entry) => entry.type === 'cardio' ? !!entry.completed : entry.sets.every((set) => set.completed),
    showToast: (value) => messages.push(value),
    syncNativeAnnouncementPlan: () => calls.push(context.activeSession.running ? 'runningPlan' : 'stoppedPlan'),
    syncWorkoutActivity() {}, insights, trainingTools: tools, syncWorkoutToHealth() {}, showCelebration() {}, renderHistoryTab() {},
    buildDraftSession: () => ({ id: 'next', running: false, entries: [] }),
    renderWorkoutTab: () => context.updateWorkoutPauseControls(),
  });
  context.stopwatch = new Stopwatch((elapsed) => { el('workoutTimerDisplay').textContent = formatHMS(elapsed); });
  context.restTimer = new RestTimer({ onTick() {}, onDone: () => calls.push('restDone'),
    onChange: () => context.persistRestTimerState() });
  const source = read('www/js/app.js');
  const section = (start, end) => {
    const first = source.indexOf(start), last = source.indexOf(end, first);
    assert.ok(first >= 0 && last > first, `Missing controller boundary: ${start} → ${end}`);
    return source.slice(first, last);
  };
  for (const [start, end] of [
    ['function ensureWorkoutStarted()', '// Cancels the current workout'],
    ['function persistActiveSession()', 'function trainingAPI()'],
    ['function persistRestTimerState(', 'function buildWorkoutActivityPayload()'],
    ['function stopWorkoutTimers()', 'function renderWorkoutTab()'],
    ['async function updateVoiceListeningState()', 'function startRestTimer('],
    ['function handleVoiceTranscript(', '/* ---------------- Voice commands: listening lifecycle'],
    ['function finishWorkout()', 'function persistActiveSession()'],
    ['function buildWorkoutActivityPayload()', 'function syncWorkoutActivity()'],
    ['function setWorkoutSetCompletion(', 'function getWorkoutSetProgress()'],
    ['function rememberCompletedSet(', 'function lastCompletedVoiceSet()'],
    ['function nextEntryName(', '/* ---------------- Voice commands: Hebrew number parsing'],
    ['function startRestTimer(', '/* ================= HISTORY TAB'],
  ]) vm.runInContext(section(start, end), context);
  if (activeSession.running) {
    context.stopwatch.start(now - 120000);
    context.restTimer.restore({ endAt: now + 45000, totalSeconds: 90, lastAnnouncedElapsed: 30 });
    context.holdTimers.set('native:hold:0', { intervalId: timers.setInterval(() => {}), startedAt: now - 10000 });
  }
  saved.length = 0;
  return { context, calls, saved, messages, intervals, el, advance: (ms) => { now += ms; } };
}

function autoCompletionController(savedSession) {
  const fixture = pauseController(savedSession), { context } = fixture, queue = [], records = [], summaries = [];
  context.queueMicrotask = (callback) => queue.push(callback);
  context.refreshDifficultyFeedback = () => {};
  context.trainingUI = null;
  context.db.saveWorkouts = (value) => records.push(plain(value));
  context.showCelebration = (value) => summaries.push(plain(value));
  context.console = { error() {} };
  const source = read('www/js/app.js');
  vm.runInContext(source.slice(source.indexOf('function getWorkoutSetProgress()'), source.indexOf('function refreshDifficultyFeedback()')), context);
  return { ...fixture, queue, records, summaries, flush: () => { while (queue.length) queue.shift()(); } };
}

test('100 percent waits for cardio and saves the fully completed workout once without confirmation or final rest', () => {
  const { context, queue, records, summaries, flush, el } = autoCompletionController();
  const before = plain(context.activeSession);
  for (const entry of context.activeSession.entries) {
    if (entry.type !== 'cardio') for (const set of entry.sets) set.completed = true;
  }
  context.updateProgress();
  assert.ok(context.getWorkoutSetProgress().percent < 100);
  assert.equal(queue.length, 0);
  const original = context.activeSession;
  original.planSnapshot = { id: 'A', name: 'My custom workout', days: 1 };
  original.entries.at(-1).completed = true;
  context.updateProgress();
  context.updateProgress();
  assert.equal(el('overallProgressBadge').textContent, '100%');
  assert.equal(queue.length, 1);
  original.entries[0].sets[1].difficulty = 'hard';
  original.entries[0].sets[1].notes = 'Last voice report before deferred finish';
  let rests = 0;
  context.restTimer.start = () => rests++;
  context.startRestTimer(context.exercises[0], true, null);
  assert.equal(rests, 0);
  flush();
  assert.equal(records.length, 1);
  assert.equal(records[0].length, 1);
  assert.equal(records[0][0].id, before.id);
  assert.equal(records[0][0].durationSec, 120);
  assert.equal(records[0][0].planSnapshot.name, 'My custom workout');
  assert.equal(records[0][0].entries[0].sets[1].difficulty, 'hard');
  assert.equal(records[0][0].entries[0].sets[1].notes, 'Last voice report before deferred finish');
  assert.equal(summaries.length, 1);
  assert.equal(context.activeSession.id, 'next');
});

test('rounded progress never reaches 100 while a set is unfinished, and empty/unstarted drafts cannot auto-save', () => {
  const { context, queue, flush, records } = autoCompletionController();
  context.activeSession.entries = [{ exerciseId: 'many', sets: Array.from({ length: 200 }, (_, i) => set(20, 12, i < 199)) }];
  context.updateProgress();
  assert.equal(context.getWorkoutSetProgress().percent, 99);
  assert.equal(context.getWorkoutSetProgress().setPercent, 99);
  assert.equal(queue.length, 0);
  context.activeSession.entries = [];
  context.updateProgress();
  assert.equal(context.getWorkoutSetProgress().percent, 0);
  context.activeSession = { running: false, entries: [{ sets: [set(20, 12, true)] }] };
  context.updateProgress();
  flush();
  assert.equal(records.length, 0);
});

test('deferred completion rechecks undo, replacement and privacy deletion instead of saving stale work', () => {
  for (const change of ['undo', 'replace', 'erase']) {
    const { context, queue, flush, records } = autoCompletionController();
    context.activeSession.entries = [{ exerciseId: 'native:chest', sets: [set(20, 12, true)] }];
    context.updateProgress();
    assert.equal(queue.length, 1);
    if (change === 'undo') context.activeSession.entries[0].sets[0].completed = false;
    if (change === 'replace') context.activeSession = { id: 'different', running: true, entries: [] };
    if (change === 'erase') context.privacyErasing = true;
    flush();
    assert.equal(records.length, 0, change);
  }
});

test('manually completing a paused workout auto-saves its banked duration', () => {
  const { context, records, flush } = autoCompletionController();
  context.pauseWorkout();
  context.activeSession.entries = [{ exerciseId: 'native:chest', sets: [set(20, 12, true)] }];
  context.updateProgress();
  flush();
  assert.equal(records[0][0].durationSec, 120);
});

test('automatic history-save failure retains completed data, releases microphone/background audio and retries without lost duration', () => {
  const { context, records, summaries, messages, calls, flush, el } = autoCompletionController();
  const original = context.activeSession;
  original.entries = [{ exerciseId: 'native:chest', sets: [set(20, 12, true, { difficulty: 'right', notes: 'keep' })] }];
  const save = context.db.saveWorkouts;
  context.db.saveWorkouts = () => { throw new Error('quota'); };
  context.updateProgress();
  flush();
  assert.equal(context.activeSession, original);
  assert.equal(context.workouts.length, 0);
  assert.equal(summaries.length, 0);
  assert.equal(records.length, 0);
  assert.ok(messages.some((message) => message.includes('השמירה האוטומטית נכשלה')));
  assert.equal(context.finishingWorkout, false);
  assert.equal(context.voiceListeningActive, false);
  assert.ok(calls.includes('stopListening') && calls.includes('stopBackground'));
  assert.equal(el('btnPauseWorkout').disabled, true);
  context.db.saveWorkouts = save;
  context.finishWorkout();
  assert.equal(records[0].length, 1);
  assert.equal(records[0][0].durationSec, 120);
  assert.equal(records[0][0].entries[0].sets[0].notes, 'keep');
  assert.equal(summaries.length, 1);
});

test('failed automatic save reloads with a frozen duration and can finish later without counting idle time', () => {
  const failed = autoCompletionController(), { context } = failed;
  context.activeSession.entries = [{ exerciseId: 'native:chest', sets: [set(20, 12, true)] }];
  context.db.saveWorkouts = () => { throw new Error('quota'); };
  context.updateProgress();
  failed.flush();
  const snapshot = plain(failed.saved.at(-1));
  assert.equal(snapshot.running, false);
  assert.equal(snapshot.paused, true);
  assert.equal(snapshot.accumulatedSec, 120);
  const restored = autoCompletionController(snapshot);
  restored.advance(3600000);
  restored.context.updateProgress();
  restored.flush();
  assert.equal(restored.records[0][0].durationSec, 120);
  assert.equal(restored.records[0][0].id, snapshot.id);
});

test('failure clearing the draft after history save is recoverable and cannot save the workout twice', () => {
  const { context, records, summaries, messages, flush } = autoCompletionController();
  const original = context.activeSession;
  original.entries = [{ exerciseId: 'native:chest', sets: [set(20, 12, true)] }];
  let clears = 0;
  context.db.clearActiveSession = () => { if (++clears === 1) throw new Error('remove failed'); };
  context.updateProgress();
  flush();
  assert.equal(context.activeSession, original);
  assert.equal(records[0].length, 1);
  assert.equal(summaries.length, 0);
  assert.ok(messages.some((message) => message.startsWith('האימון נשמר בהיסטוריה, אך')));
  const first = plain(context.workouts[0]);
  context.finishWorkout();
  assert.equal(records[1].length, 1);
  assert.deepEqual(records[1][0], first);
  assert.equal(summaries.length, 1);
  assert.equal(context.activeSession.id, 'next');
});

test('actual pause controller freezes stopwatch/rest/cardio/holds and listening, retaining every entered value', async () => {
  const { context, advance, saved, calls, intervals, el } = pauseController();
  const entries = context.activeSession.entries, first = plain(entries[0]);
  context.pauseWorkout();
  await Promise.resolve();
  assert.equal(context.activeSession.running, false);
  assert.equal(context.activeSession.paused, true);
  assert.equal(context.activeSession.accumulatedSec, 120);
  assert.equal(context.activeSession.pausedRest.remainingSec, 45);
  assert.equal(entries[1].sets[0].holdElapsedSec, 10);
  assert.equal(entries[1].sets[0].holdStartedAt, undefined);
  assert.equal(entries[2].elapsedSec, 60);
  assert.equal(entries[2].startedAt, null);
  assert.deepEqual(plain(entries[0]), first);
  assert.equal(intervals.size, 0);
  assert.equal(context.holdTimers.size, 0);
  assert.equal(context.voiceCountingState, null);
  assert.ok(calls.includes('stopListening') && calls.includes('stopBackground') && calls.includes('stoppedPlan'), JSON.stringify(calls));
  assert.equal(el('btnStartWorkout').textContent, 'המשך אימון');
  assert.equal(el('btnPauseWorkout').disabled, true);
  assert.equal(el('btnFinishWorkout').classList.contains('hidden'), false);
  const writes = saved.length;
  advance(3600000);
  context.pauseWorkout();
  context.ensureWorkoutStarted();
  context.voiceListeningActive = true;
  context.handleVoiceTranscript('12');
  context.voiceListeningActive = false;
  assert.equal(saved.length, writes, 'Repeated pause or a stale voice callback must not change the frozen workout');
  assert.deepEqual(plain(entries[0]), first);
  assert.equal(el('workoutTimerDisplay').textContent, '02:00');
});

test('actual resume controller excludes multiple long pauses and restores rest, hold/cardio progress and counting', async () => {
  const { context, advance, calls } = pauseController();
  const startedAt = context.activeSession.startedAt;
  context.pauseWorkout();
  advance(3600000);
  context.resumeWorkout();
  await Promise.resolve();
  assert.equal(context.stopwatch.getElapsed(), 120);
  assert.equal(context.restTimer.endAt - context.Date.now(), 45000);
  assert.equal(context.activeSession.entries[1].sets[0].holdStartedAt, context.Date.now() - 10000);
  assert.equal(context.activeSession.entries[2].elapsedSec, 60);
  assert.equal(context.voiceCountingState.count, 3);
  assert.equal(context.activeSession.startedAt, startedAt);
  advance(30000);
  context.pauseWorkout();
  assert.equal(context.activeSession.accumulatedSec, 150);
  assert.equal(context.activeSession.pausedRest.remainingSec, 15);
  assert.equal(context.activeSession.entries[1].sets[0].holdElapsedSec, 40);
  assert.equal(context.activeSession.entries[2].elapsedSec, 90);
  advance(3600000);
  context.resumeWorkout();
  advance(10000);
  assert.equal(context.stopwatch.getElapsed(), 160);
  assert.equal(context.restTimer.endAt - context.Date.now(), 5000);
  assert.equal(calls.filter((value) => value === 'startListening').length, 2, JSON.stringify(calls));
  assert.equal(calls.filter((value) => value === 'startBackground').length, 2);
});

test('persisted paused workout reloads frozen, resumes safely and finishes with active time only', () => {
  const first = pauseController();
  first.context.pauseWorkout();
  const snapshot = plain(first.saved.at(-1));
  const { context, advance, intervals, el } = pauseController(snapshot);
  context.updateWorkoutPauseControls();
  advance(3600000);
  assert.equal(intervals.size, 0);
  assert.equal(el('workoutTimerDisplay').textContent, '02:00');
  assert.equal(context.activeSession.pausedRest.remainingSec, 45);
  const records = [];
  context.db.saveWorkouts = (value) => records.push(plain(value));
  context.finishWorkout();
  assert.equal(records[0][0].durationSec, 120);
  assert.equal(records[0][0].entries[0].sets[0].notes, 'keep');
  assert.equal(records[0][0].entries[0].sets[0].difficulty, 'right');
  assert.equal(context.activeSession.id, 'next');
  assert.equal(el('btnPauseWorkout').disabled, true);
  const resumed = pauseController(plain(snapshot));
  resumed.advance(7200000);
  resumed.context.resumeWorkout();
  resumed.advance(10000);
  assert.equal(resumed.context.stopwatch.getElapsed(), 130);
  assert.equal(resumed.context.activeSession.entries[1].sets[0].holdStartedAt, resumed.context.Date.now() - 20000);
  assert.equal(resumed.context.voiceCountingState.count, 3);
});

test('storage failure cannot leave timers or listening active or claim a pause was saved', () => {
  const { context, intervals, calls, messages } = pauseController();
  context.db.saveActiveSession = () => { throw new Error('storage full'); };
  assert.throws(() => context.pauseWorkout(), /storage full/);
  assert.equal(intervals.size, 0);
  assert.ok(calls.includes('stopListening') && calls.includes('stopBackground'), JSON.stringify(calls));
  assert.equal(context.activeSession.paused, true);
  assert.equal(messages.length, 0);
});

function widgetRequest(context, command, id = 'widget-request') {
  const snapshot = context.buildWorkoutActivityPayload();
  return { id, command, sessionID: context.activeSession.id, exerciseID: snapshot.exerciseID,
    setIndex: snapshot.setIndex, controlRevision: snapshot.controlRevision, createdAt: context.Date.now() };
}

test('real widget controller finishes exactly its advertised set, preserves measurements and rejects repeat/stale taps', async () => {
  const { context, calls, saved, advance } = pauseController();
  context.restTimer.stop();
  context.activeSession.currentExerciseId = 'native:chest';
  const request = widgetRequest(context, 'completeSet');
  const first = context.activeSession.entries[0].sets[1];
  await Promise.all([context.handleWorkoutActivityAction(request), context.handleWorkoutActivityAction(request)]);
  assert.equal(first.completed, true);
  assert.equal(first.reps, 3, 'The widget must not invent the configured twelve-rep goal as an actual result');
  assert.equal(first.weightKg, 25);
  assert.equal(context.activeSession.entries[0].sets[0].notes, 'keep');
  assert.equal(context.activeSession.entries[1].sets[0].completed, false);
  assert.equal(context.restTimer.totalSeconds, 90);
  assert.equal(calls.filter((call) => call?.id === request.id).length, 1);
  const writes = saved.length, restEnd = context.restTimer.endAt;
  advance(500);
  await context.handleWorkoutActivityAction(request);
  assert.equal(saved.length, writes);
  assert.equal(context.restTimer.endAt, restEnd);
  await context.handleWorkoutActivityAction({ ...request, id: 'stale-second-press' });
  assert.equal(calls.at(-1).success, false);
  assert.equal(context.activeSession.entries[1].sets[0].completed, false);
});

test('real widget pause/resume keeps a frozen Live Activity and excludes time paused outside the app', async () => {
  const { context, advance, calls } = pauseController();
  await context.handleWorkoutActivityAction(widgetRequest(context, 'pause'));
  const paused = context.buildWorkoutActivityPayload();
  assert.equal(paused.paused, true);
  assert.equal(paused.preview, false);
  assert.equal(paused.running, false);
  assert.equal(paused.phase, 'paused');
  assert.equal(paused.pausedElapsedSeconds, 120);
  assert.equal(paused.phaseStartMillis, null);
  assert.equal(paused.phaseEndMillis, null);
  assert.equal(calls.at(-1).success, true);
  advance(15000);
  await context.handleWorkoutActivityAction(widgetRequest(context, 'resume', 'resume'));
  assert.equal(context.activeSession.running, true);
  assert.equal(context.stopwatch.getElapsed(), 120);
  assert.equal(context.buildWorkoutActivityPayload().paused, false);
  assert.equal(calls.at(-1).success, true);
});

test('widget controls refuse expired, future, wrong-session, changed-revision and rest-phase set requests', async () => {
  for (const patch of [
    { createdAt: 1700000000000 - 20001 }, { createdAt: 1700000000000 + 5001 },
    { sessionID: 'another-session' }, { controlRevision: 99 }, { command: 'finishWorkout' },
    { setIndex: 100 }, {},
  ]) {
    const { context, saved, calls } = pauseController();
    if (Object.keys(patch).length) context.restTimer.stop();
    saved.length = 0;
    context.activeSession.currentExerciseId = 'native:chest';
    const request = { ...widgetRequest(context, 'completeSet'), ...patch };
    const before = JSON.stringify(context.activeSession);
    await context.handleWorkoutActivityAction(request);
    assert.equal(JSON.stringify(context.activeSession), before);
    assert.equal(saved.length, 0);
    assert.equal(calls.at(-1).success, false);
  }
});

test('widget set completion uses actual hold time and failed acknowledgement never causes a second write', async () => {
  const { context, calls, saved } = pauseController();
  context.restTimer.stop();
  context.activeSession.currentExerciseId = 'native:hold';
  let acknowledged = false;
  context.native.acknowledgeWorkoutActivityAction = async (value) => {
    calls.push(plain(value));
    return { ok: acknowledged, reason: 'bridge unavailable' };
  };
  const request = widgetRequest(context, 'completeSet');
  await context.handleWorkoutActivityAction(request);
  assert.equal(context.activeSession.entries[1].sets[0].reps, 10);
  assert.equal(context.activeSession.entries[1].sets[0].completed, true);
  const writes = saved.length;
  acknowledged = true;
  await context.handleWorkoutActivityAction(request);
  assert.equal(saved.length, writes);
  assert.equal(calls.at(-1).success, true);
});

test('widget hold controls distinguish colon-containing exercise IDs and target the actual running set', async () => {
  const { context, calls } = pauseController();
  context.restTimer.stop();
  context.holdTimers.clear();
  const entry = { exerciseId: 'native:hold:variant', exerciseName: 'Other hold',
    sets: [set('', ''), set('', '', false, { holdStartedAt: context.Date.now() - 5000 })] };
  context.activeSession.entries.push(entry);
  context.exercises.push({ id: entry.exerciseId, name: entry.exerciseName, inputType: 'hold', holdSeconds: 45 });
  context.activeSession.currentExerciseId = entry.exerciseId;
  context.holdTimers.set(`${entry.exerciseId}:1`, { startedAt: context.Date.now() - 5000, intervalId: null });
  const request = widgetRequest(context, 'completeSet');
  assert.equal(request.exerciseID, entry.exerciseId);
  assert.equal(request.setIndex, 1);
  await context.handleWorkoutActivityAction(request);
  assert.equal(entry.sets[1].completed, true);
  assert.equal(entry.sets[1].reps, 5);
  assert.equal(entry.sets[0].completed, false);
  assert.equal(context.activeSession.entries[1].sets[0].completed, false);
  assert.equal(calls.at(-1).success, true);
});

test('failed widget set persistence restores the exact set, revision, completion marker and running hold', async () => {
  const { context, calls, messages } = pauseController();
  context.restTimer.stop();
  context.db.saveActiveSession = () => { throw Error('quota'); };
  context.activeSession.currentExerciseId = 'native:hold';
  const before = JSON.stringify(context.activeSession);
  const hold = context.holdTimers.get('native:hold:0');
  const request = widgetRequest(context, 'completeSet');
  await context.handleWorkoutActivityAction(request);
  assert.equal(JSON.stringify(context.activeSession), before);
  assert.equal(context.holdTimers.get('native:hold:0'), hold);
  assert.equal(context.restTimer.isRunning(), false);
  assert.equal(calls.at(-1).success, false);
  assert.match(calls.at(-1).reason, /quota/i);
  assert.equal(messages.length, 1);
});

test('time-budget proposal prioritizes known compounds and includes full configured rests', () => {
  const custom = { id: 'custom', defaultReps: 10, restSeconds: 90 };
  const program = [find('curl'), custom, find('squat')];
  const draft = session(program.map((exercise) => entry(exercise)));
  const proposal = tools.timeBudgetProposal(draft, program, 10);
  assert.deepEqual(Array.from(proposal.rows, (row) => row.entry.exerciseId), ['custom', find('squat').id, find('curl').id]);
  assert.equal(tools.estimateEntrySeconds(draft.entries[0], program[0]), 2 * (30 + 90) + 22.5);
  assert.equal(tools.estimateEntrySeconds(draft.entries[0], { ...program[0], restSeconds: 150 }), 2 * (30 + 150) + 22.5);
  const selected = proposal.rows.filter((row) => row.selected).map((row) => row.entry.exerciseId);
  assert.ok(selected.includes(find('squat').id));
});

test('full default program duration uses all 25 exercises, 67 sets, custom rests and both cardio entries', () => {
  const { SEED_EXERCISES } = load('www/js/seed.js', ['SEED_EXERCISES']);
  const draft = tools.durationSession(SEED_EXERCISES.map((exercise, index) => ({ id: `seed:${index}`, ...exercise })));
  assert.equal(draft.entries.length, 25);
  assert.equal(draft.entries.reduce((count, entry) => count + (entry.sets?.length || 0), 0), 67);
  const estimate = tools.estimateWorkoutDuration(draft);
  assert.equal(estimate.restSeconds, 6210);
  assert.equal(estimate.unknownRepSets, 6);
  assert.equal(estimate.seconds, 9210);
  assert.equal(estimate.lowSeconds, 8626);
  assert.equal(estimate.highSeconds, 9815);
});

test('duration reflects actual set count, custom/default rest, numeric ranges and unknown reps without fake precision', () => {
  const ex = { id: 'custom', defaultSets: 2, defaultReps: '8-12', restSeconds: 150 };
  const estimate = tools.estimateWorkoutDuration(tools.durationSession([ex]));
  assert.equal(estimate.lowSeconds, 2 * (8 * 2 + 150) + 15);
  assert.equal(estimate.highSeconds, 2 * (12 * 3 + 150) + 30);
  assert.equal(estimate.unknownRepSets, 0);
  const inherited = tools.estimateWorkoutDuration(tools.durationSession([{ ...ex, restSeconds: 0 }]), [], 120);
  assert.equal(inherited.restSeconds, 240);
  const three = tools.estimateWorkoutDuration(tools.durationSession([{ ...ex, defaultSets: 3 }]));
  assert.equal(three.seconds - estimate.seconds, 25 + 150);
  const typed = tools.durationSession([{ ...ex, defaultReps: 'עד כשל' }]);
  assert.equal(tools.estimateWorkoutDuration(typed).unknownRepSets, 2);
  typed.entries[0].sets[0].reps = 20;
  assert.equal(tools.estimateWorkoutDuration(typed).unknownRepSets, 1);
  assert.ok(tools.estimateWorkoutDuration(typed).highSeconds > estimate.highSeconds);
});

test('remaining excludes completed work and setup already used, adding only the outstanding current rest', () => {
  const draft = tools.durationSession([{ id: 'x', defaultSets: 2, defaultReps: 12, restSeconds: 90 }]);
  const total = tools.estimateWorkoutDuration(draft);
  draft.entries[0].sets[0].completed = true;
  const remaining = tools.estimateWorkoutDuration(draft, [], 90, { remaining: true, restSeconds: 45 });
  assert.equal(remaining.seconds, 30 + 90 + 45);
  assert.equal(remaining.lowSeconds, 24 + 90 + 45);
  assert.equal(tools.estimateWorkoutDuration(draft).seconds, total.seconds);
  draft.entries[0].sets[1].completed = true;
  assert.equal(tools.estimateWorkoutDuration(draft, [], 90, { remaining: true, restSeconds: 45 }).seconds, 45);
  assert.equal(tools.estimateWorkoutDuration(draft, [], 90, { remaining: true }).seconds, 0);
});

test('hold and cardio estimates use prescribed durations, both sides, pause accumulation and active clocks', () => {
  const now = 100000;
  const hold = tools.durationSession([{ id: 'hold', inputType: 'hold', catalogId: 'sidePlank',
    defaultSets: 1, holdSeconds: 30, restSeconds: 120 }]);
  assert.equal(tools.estimateWorkoutDuration(hold).seconds, 60 + 120 + 22.5);
  hold.entries[0].sets[0].holdStartedAt = now - 10000;
  assert.equal(tools.estimateWorkoutDuration(hold, [], 90, { remaining: true, now }).seconds, 50 + 120);
  const cardio = { entries: [{ type: 'cardio', durationSec: 600, elapsedSec: 120, startedAt: now - 60000 }] };
  assert.equal(tools.estimateWorkoutDuration(cardio, [], 90, { remaining: true, now }).seconds, 420);
  assert.equal(tools.estimateWorkoutDuration(cardio).seconds, 620);
  assert.equal(tools.estimateWorkoutDuration(cardio, [], 90, { remaining: true, now: now + 999999 }).seconds, 0);
});

test('frozen holds retain progress in remaining estimates and cannot be deferred or replaced', () => {
  const exercise = { id: 'native:hold', inputType: 'hold', catalogId: 'sidePlank',
    defaultSets: 1, holdSeconds: 30, restSeconds: 120 };
  const draft = tools.durationSession([exercise]);
  Object.assign(draft.entries[0].sets[0], { holdElapsedSec: 10, resumeAfterPause: true });
  const remaining = tools.estimateWorkoutDuration(draft, [], 90, { remaining: true, restSeconds: 20, now: 100000 });
  assert.equal(remaining.seconds, 50 + 120 + 20);
  assert.equal(tools.estimateWorkoutDuration(draft, [], 90, { remaining: true, restSeconds: 20, now: 9999999 }).seconds, remaining.seconds);
  assert.equal(tools.entryHasActivity(draft.entries[0]), true);
  assert.equal(tools.timeBudgetProposal(draft, [exercise], 10).rows[0].protected, true);
  assert.throws(() => tools.applyTimeBudget(draft, [], 10, [exercise]), /recorded or in-progress/);
  assert.throws(() => tools.swapExercise(draft, exercise.id, find('chest'), [exercise]), /unavailable/);
  assert.equal(tools.entryHasActivity({ type: 'cardio', elapsedSec: 0, resumeAfterPause: true }), true);
});

test('30/60/90 budgets disclose minimum infeasibility and upper-bound uncertainty without cutting rests', () => {
  const { SEED_EXERCISES } = load('www/js/seed.js', ['SEED_EXERCISES']);
  const program = SEED_EXERCISES.map((exercise, index) => ({ id: `seed:${index}`, ...exercise }));
  const draft = tools.durationSession(program);
  const before = JSON.stringify(draft);
  const proposals = [30, 60, 90].map((minutes) => tools.timeBudgetProposal(draft, program, minutes));
  assert.deepEqual(Array.from(proposals, (proposal) => proposal.minutes), [30, 60, 90]);
  assert.equal(proposals[0].infeasible, true);
  assert.equal(proposals[1].infeasible, false);
  assert.ok(proposals[0].seconds < proposals[1].seconds);
  assert.ok(proposals[1].seconds < proposals[2].seconds);
  assert.ok(proposals[1].rows.filter((row) => row.selected).reduce((sum, row) => sum + row.highSeconds, 0) > 60 * 60,
    'Even the 60-minute choice must disclose upper-range uncertainty');
  for (const proposal of proposals) {
    const selected = proposal.rows.filter((row) => row.selected);
    assert.ok(selected.length);
    assert.equal(proposal.infeasible, proposal.seconds > proposal.minutes * 60);
    for (const group of proposal.groups) assert.ok(selected.some((row) => row.group === group));
    const next = tools.applyTimeBudget(draft, selected.map((row) => row.entry.exerciseId), proposal.minutes);
    const estimate = tools.estimateWorkoutDuration(next);
    assert.equal(estimate.seconds, proposal.seconds);
    assert.equal(estimate.lowSeconds, selected.reduce((sum, row) => sum + row.lowSeconds, 0));
    assert.equal(estimate.highSeconds, selected.reduce((sum, row) => sum + row.highSeconds, 0));
    assert.deepEqual(plain(tools.restoreTimeBudget(next).entries), plain(draft.entries));
  }
  assert.equal(JSON.stringify(draft), before);
});

test('budget minimum preserves original main groups, not secondary involvement, and drops redundant accessories first', () => {
  const program = [find('chest'), find('oneRow'), find('curl'), find('overhead'), find('squat'),
    find('dumbbellPress'), find('deadbug'), { id: 'accessory:hammer', catalogId: 'hammer', name: 'פטישים',
      category: 'אמות', inputType: 'reps', defaultSets: 3, defaultReps: '12' }, find('sidePlank')].map((exercise) => ({ ...exercise, active: true }));
  const draft = tools.durationSession(program);
  const proposal = tools.timeBudgetProposal(draft, program, 30);
  const selected = proposal.rows.filter((row) => row.selected);
  for (const group of ['חזה', 'גב', 'יד קדמית', 'יד אחורית', 'רגליים', 'כתפיים', 'בטן']) {
    assert.ok(selected.some((row) => row.group === group), group);
  }
  assert.equal(proposal.infeasible, true);
  assert.ok(!selected.some((row) => row.entry.exerciseSnapshot.catalogId === 'hammer'));
  assert.ok(!selected.some((row) => row.entry.exerciseSnapshot.catalogId === 'sidePlank'));
  assert.throws(() => tools.applyTimeBudget(draft,
    selected.filter((row) => row.group !== 'יד אחורית').map((row) => row.entry.exerciseId), 30), /main muscle/);
  const soleHold = tools.durationSession([find('sidePlank')].map((exercise) => ({ ...exercise, active: true })));
  assert.equal(tools.timeBudgetProposal(soleHold, program, 30).rows[0].selected, true);
});

test('budget switches recompute from full baseline and restore edited retained sets and unknown colon IDs safely', () => {
  const program = [find('chest'), find('floor'), find('pushup'), find('curl')]
    .map((exercise) => ({ ...exercise, active: true, defaultSets: 3 }));
  const draft = tools.durationSession(program);
  draft.entries.push({ exerciseId: 'custom:unmapped', exerciseName: 'Personal', sets: [set(17, 9)] });
  const select = (source, minutes) => {
    const proposal = tools.timeBudgetProposal(source, program, minutes);
    return tools.applyTimeBudget(source, proposal.rows.filter((row) => row.selected).map((row) => row.entry.exerciseId), minutes, program);
  };
  const short = select(draft, 10);
  assert.ok(short.entries.some((entry) => entry.exerciseId === 'custom:unmapped'));
  short.entries.find((entry) => entry.exerciseId === program[0].id).sets[0] = set(31, 8, true, { notes: 'Retain me' });
  const longer = select(short, 60);
  assert.equal(longer.entries.length, draft.entries.length);
  const switched = select(longer, 90);
  const full = tools.restoreTimeBudget(switched);
  assert.deepEqual(Array.from(full.entries, (entry) => entry.exerciseId), Array.from(draft.entries, (entry) => entry.exerciseId));
  assert.equal(full.entries[0].sets[0].notes, 'Retain me');
  assert.equal(full.entries.at(-1).sets[0].weightKg, 17);
  assert.deepEqual(plain(tools.restoreTimeBudget(full)), plain(full));
  const proposal = tools.timeBudgetProposal(full, program, 30, 90, 75);
  const withoutRest = tools.timeBudgetProposal(full, program, 30, 90, 0);
  assert.equal(proposal.restSeconds, 75);
  assert.ok(proposal.seconds >= withoutRest.rows.filter((row) => row.protected || row.required)
    .reduce((sum, row) => sum + row.seconds, 0) + 75);
});

test('walking/running budgets retain the gentle cardio sequence instead of selecting only the shortest run', () => {
  const draft = tools.durationSession([{ ...find('walk'), active: true, durationMinutes: 10 },
    { ...find('jog'), active: true, durationMinutes: 1 }]);
  const proposal = tools.timeBudgetProposal(draft, [], 10);
  assert.equal(proposal.groups.length, 0);
  assert.equal(proposal.infeasible, true);
  assert.ok(proposal.rows.every((row) => row.selected && row.required));
  assert.throws(() => tools.applyTimeBudget(draft, [draft.entries[1].exerciseId], 10), /sequence/);
});

test('actual duration UI refreshes totals/program/remaining for edits, completion, budget and swap without storage reads', () => {
  const nodes = Object.fromEntries(['trainingDurationTotal', 'trainingDurationRemaining', 'trainingProgramDuration']
    .map((id) => [id, { textContent: '' }]));
  const ui = load('www/js/training-ui.js', ['durationEstimateText', 'refreshDurationEstimates'],
    { tools, i18n: { text: (text) => text } });
  const program = [{ ...find('chest'), defaultSets: 3, active: true }, { ...find('floor'), active: false }];
  let draft = tools.durationSession(program);
  let restSeconds = 0;
  const api = { durationState: () => ({ session: draft, exercises: program,
    settings: { restSeconds: 90 }, program: tools.durationSession(program), restSeconds }) };
  const doc = { getElementById: (id) => nodes[id] };
  const update = () => ui.refreshDurationEstimates(api, doc);
  const original = update().total.seconds;
  assert.match(nodes.trainingDurationTotal.textContent, /זמן האימון המשוער: \d+ דקות/);
  assert.doesNotMatch(nodes.trainingDurationTotal.textContent, /–/);
  assert.equal(nodes.trainingDurationRemaining.textContent, '');
  draft.entries[0].sets.push(set());
  assert.ok(update().total.seconds > original);
  draft.entries[0].sets[0].completed = true;
  restSeconds = 45;
  update();
  assert.match(nodes.trainingDurationRemaining.textContent, /זמן משוער שנותר מעכשיו/);
  assert.ok(update().remaining.seconds < update().total.seconds);
  program[0].restSeconds = 180;
  const previous = nodes.trainingProgramDuration.textContent;
  update();
  assert.notEqual(nodes.trainingProgramDuration.textContent, previous);
  draft = tools.swapExercise(draft, program[0].id, program[1], program);
  assert.equal(update().total.seconds, tools.estimateWorkoutDuration(draft, program).seconds);
  draft = tools.restoreSubstitution(draft, program[1].id);
  const full = update().total.seconds;
  draft = tools.applyTimeBudget(draft, draft.entries.map((entry) => entry.exerciseId), 30);
  assert.equal(update().total.seconds, full);
  draft = tools.restoreTimeBudget(draft);
  assert.equal(update().total.seconds, full);
});

test('live duration refresh estimates only remaining work and never reconstructs the permanent program', () => {
  const nodes = Object.fromEntries(['trainingDurationTotal', 'trainingDurationRemaining', 'trainingProgramDuration']
    .map((id) => [id, { textContent: 'unchanged' }]));
  const ui = load('www/js/training-ui.js', ['refreshDurationEstimates'], { tools, i18n: { text: String } });
  const draft = tools.durationSession([{ ...find('chest'), active: true }]);
  draft.running = true;
  const state = { session: draft, exercises: catalog, settings: { restSeconds: 90 }, restSeconds: 30 };
  Object.defineProperty(state, 'program', { get() { assert.fail('Live ticks must not rebuild/estimate the saved program'); } });
  let requests = 0;
  const result = ui.refreshDurationEstimates({ durationState(options) {
    assert.equal(options.live, true);
    requests++;
    return state;
  } }, { getElementById: (id) => nodes[id] }, { live: true });
  assert.equal(requests, 1);
  assert.equal(result.total, null);
  assert.equal(result.program, null);
  assert.ok(result.remaining.seconds > 0);
  assert.equal(nodes.trainingDurationTotal.textContent, 'unchanged');
  assert.equal(nodes.trainingProgramDuration.textContent, 'unchanged');
  assert.notEqual(nodes.trainingDurationRemaining.textContent, 'unchanged');
});

test('cardio completion replaces only its own card and keeps unrelated focused inputs and scroll structure intact', () => {
  const source = read('www/js/app.js');
  const otherInput = { value: '37.5' }, sibling = { input: otherInput };
  const entry = { exerciseId: 'walk', exerciseName: 'Walk', type: 'cardio', startedAt: 1000, durationSec: 1 };
  const nodes = [sibling, null], replacement = { dataset: {} };
  const previous = { replaceWith(next) { nodes[1] = next; } };
  nodes[1] = previous;
  let progress = 0;
  const context = vm.createContext({ activeSession: { entries: [{ exerciseId: 'strength' }, entry] },
    Date: { now: () => 3000 }, settings: { voiceAnnouncements: false },
    el: () => null, qs: (selector) => { assert.match(selector, /data-entry-index="1"/); return previous; },
    renderCardioCard: (value, number) => { assert.equal(value, entry); assert.equal(number, 2); return replacement; },
    renderWorkoutTab: () => assert.fail('Completing cardio must not rebuild the exercise list'),
    advanceWorkoutFocus() {}, persistActiveSession() {}, playBeep() {}, cardioCompletionMessage: () => 'done',
    showToast() {}, notify() {}, updateProgress: () => progress++, refreshVoiceSelection() {}, syncWorkoutActivity() {},
  });
  vm.runInContext(source.slice(source.indexOf('function tickCardioTimers()'), source.indexOf('/* ---- hold-type')), context);
  context.tickCardioTimers();
  assert.equal(nodes[0], sibling);
  assert.equal(nodes[0].input, otherInput);
  assert.equal(otherInput.value, '37.5');
  assert.equal(nodes[1], replacement);
  assert.equal(replacement.dataset.entryIndex, 1);
  assert.equal(progress, 1);
  context.tickCardioTimers();
  assert.equal(progress, 1);
});

test('actual plan-preview controller estimates inactive library choices and immediately reflects edited doses', () => {
  const source = read('www/js/training-ui.js');
  const start = source.indexOf('function updateEstimates()');
  const end = source.indexOf("dialog.querySelectorAll('.training-plan-row input", start);
  const ui = load('www/js/training-ui.js', ['durationEstimateText'], { tools, i18n: { text: (text) => text } });
  for (const exercise of [find('chest'), find('walk')]) {
    const inputs = { select: { value: exercise.id }, '.plan-sets': { value: '3' },
      '.plan-reps': { value: '12' }, '.plan-duration': { value: '5' } };
    const node = { textContent: '' };
    const warning = { textContent: '' };
    const row = { dataset: { row: '0' }, querySelector: (selector) => inputs[selector] };
    const section = { dataset: { day: '0' }, querySelectorAll: () => [row],
      querySelector: (selector) => selector === '.plan-estimate' ? node : warning };
    const context = vm.createContext({ tools, durationEstimateText: ui.durationEstimateText,
      i18n: { text: (text) => text }, dialog: { querySelectorAll: () => [section] },
      available: [exercise], plan: { options: { minutes: 30 }, sessions: [{ exercises: [exercise] }] },
      api: { durationState: () => ({ settings: { restSeconds: 90 } }) } });
    vm.runInContext(source.slice(start, end), context);
    context.updateEstimates();
    const before = node.textContent;
    assert.notEqual(before, '0 דקות');
    inputs[exercise.inputType === 'cardio' ? '.plan-duration' : '.plan-sets'].value = exercise.inputType === 'cardio' ? '10' : '4';
    context.updateEstimates();
    assert.notEqual(node.textContent, before);
  }
});

test('time-budget protects completed, paused cardio, manually entered and current work even if over budget', () => {
  const exercises = [find('squat'), find('chest'), find('oneRow')];
  const entries = [entry(exercises[0], [set(20, 10, true), set()]),
    { ...entry(exercises[1]), userEdited: true }, entry(exercises[2])];
  const draft = { ...session(entries), currentExerciseId: exercises[2].id };
  const proposal = tools.timeBudgetProposal(draft, exercises, 10);
  assert.ok(proposal.rows.every((row) => row.protected && row.selected));
  assert.throws(() => tools.applyTimeBudget(draft, [exercises[0].id], 10), /Cannot defer/);
  assert.equal(tools.entryHasActivity({ type: 'cardio', elapsedSec: 20 }), true);
  assert.equal(tools.estimateEntrySeconds({ type: 'cardio', durationSec: 600, elapsedSec: 200, completed: false }, {}), 400);
});

test('time selection is immutable, reversible, preserves new data and rejects duplicate or stale selections', () => {
  const exercises = [find('squat'), find('chest'), find('floor')];
  const draft = session(exercises.map((exercise) => entry(exercise)));
  const before = JSON.stringify(draft);
  const chosen = tools.applyTimeBudget(draft, [exercises[2].id, exercises[0].id], 30, exercises);
  assert.equal(JSON.stringify(draft), before);
  assert.equal(chosen.programPinned, true);
  assert.deepEqual(Array.from(chosen.entries, (item) => item.exerciseId), [exercises[2].id, exercises[0].id]);
  chosen.entries[0].sets[0] = set(18, 9, true, { notes: 'Personal note' });
  const restored = tools.restoreTimeBudget(chosen);
  assert.deepEqual(Array.from(restored.entries, (item) => item.exerciseId), exercises.map((exercise) => exercise.id));
  assert.equal(restored.entries[2].sets[0].notes, 'Personal note');
  assert.throws(() => tools.applyTimeBudget(draft, ['missing'], 30), /existing/);
  assert.throws(() => tools.applyTimeBudget(draft, [exercises[0].id, exercises[0].id], 30), /Invalid/);
  assert.throws(() => tools.applyTimeBudget(chosen, [exercises[0].id], 30, exercises), /Cannot defer/);
});

test('equipment suggestions require defined movement, type, load direction and different equipment', () => {
  const chest = find('chest');
  const alternatives = Array.from(tools.alternatives(chest, catalog), (exercise) => exercise.catalogId);
  assert.ok(alternatives.includes('floor'));
  assert.ok(alternatives.includes('pushup'));
  assert.ok(!alternatives.includes('front'));
  assert.ok(!alternatives.includes('overhead'));
  assert.equal(tools.alternatives({ id: 'legacy', name: 'לחיצת חזה', inputType: 'reps' }, catalog).length, 0);
  assert.equal(tools.alternatives(find('sidePlank'), catalog).length, 0);
  assert.equal(tools.alternatives({ ...chest, loadKind: 'assistance' }, catalog).length, 0);
});

test('equipment swap keeps original completed sets, archives typed values and never transfers load', () => {
  const source = find('chest'), replacement = find('floor');
  const original = entry(source, [set(25, 12, true, { notes: 'completed', difficulty: 'right' }),
    set(27.5, 9, false, { notes: 'typed' }), set()]);
  const draft = session([original]);
  const before = JSON.stringify(draft);
  const changed = tools.swapExercise(draft, source.id, replacement, catalog);
  assert.equal(JSON.stringify(draft), before);
  assert.equal(changed.entries[0].sets.length, 1);
  assert.equal(changed.entries[0].sets[0].notes, 'completed');
  assert.equal(changed.entries[1].exerciseId, replacement.id);
  assert.ok(changed.entries[1].sets.every((set) => set.weightKg === '' && set.reps === ''));
  assert.equal(changed.substitutions[0].original.sets[1].weightKg, 27.5);
  assert.equal(changed.entries[1].exerciseSnapshot.catalogId, 'floor');
});

test('swap restore merges source edits and appended sets, retaining logged replacement as distinct identity', () => {
  const source = find('chest'), replacement = find('floor');
  const draft = session([entry(source, [set(25, 12, true), set(27.5, 9), set()])]);
  const changed = tools.swapExercise(draft, source.id, replacement, catalog);
  changed.entries[0].sets[0].weightKg = 26;
  changed.entries[0].sets.push(set(28, 8, true, { notes: 'added source work' }));
  changed.entries[1].sets[0] = set(15, 10, true, { notes: 'replacement work' });
  const restored = tools.restoreSubstitution(changed, replacement.id);
  assert.equal(restored.entries.length, 2);
  assert.equal(restored.entries[0].sets[0].weightKg, 26);
  assert.equal(restored.entries[0].sets[1].weightKg, 27.5);
  assert.equal(restored.entries[0].sets[3].notes, 'added source work');
  assert.equal(restored.entries[1].exerciseId, replacement.id);
  assert.equal(restored.entries[1].sets[0].weightKg, 15);
  assert.equal(restored.substitutions.length, 0);
});

test('blank replacement is removed on restore; ongoing holds, chained swaps and duplicate IDs are refused', () => {
  const source = find('chest'), replacement = find('floor');
  const draft = session([entry(source)]);
  const changed = tools.swapExercise(draft, source.id, replacement, catalog);
  assert.deepEqual(plain(tools.restoreSubstitution(changed, replacement.id).entries), plain(draft.entries));
  assert.throws(() => tools.swapExercise(changed, replacement.id, find('pushup'), catalog), /unavailable/);
  assert.throws(() => tools.swapExercise(session([entry(source), entry(replacement)]), source.id, replacement, catalog), /unavailable/);
  assert.throws(() => tools.swapExercise(session([entry(source, [set('', '', false, { holdStartedAt: Date.now() })])]), source.id, replacement, catalog), /unavailable/);
  assert.throws(() => tools.applyTimeBudget(changed, [replacement.id], 30), /equipment swap/);
});

const baseOptions = { goal: 'fitness', experience: 'beginner', days: 3, minutes: 30, equipment: [], location: 'home' };
test('muscle-targeted single workout retains primary coverage and only uses authored eligible exercises', () => {
  const before = JSON.stringify(catalog);
  const options = { ...baseOptions, days: 1, minutes: 60, muscles: ['חזה', 'יד אחורית'],
    equipment: ['מכונה', 'משקולות יד', 'ספסל'], location: 'gym' };
  const plan = tools.generatePlan(options, catalog);
  assert.equal(plan.sessions.length, 1);
  assert.deepEqual(plain(plan.options.muscles), options.muscles);
  assert.deepEqual(plain(plan.omitted), []);
  const exercises = plan.sessions[0].exercises;
  for (const muscle of options.muscles) assert.ok(exercises.some((exercise) => tools.trainingMetadata(exercise).primary === muscle));
  for (const exercise of exercises) {
    assert.equal(exercise.inputType, 'reps');
    assert.ok(options.muscles.includes(tools.trainingMetadata(exercise).primary));
    assert.ok(library.exerciseGuide(exercise));
    assert.ok(tools.planningCatalog(catalog).some((item) => item.id === exercise.id));
    assert.equal(exercise.defaultSets, 2);
    assert.equal(exercise.restSeconds, 75);
  }
  assert.equal(new Set(exercises.map((exercise) => exercise.id)).size, exercises.length);
  assert.equal(JSON.stringify(catalog), before);
});

test('targeted duration adds bounded work where feasible but never deletes primary coverage to force a fit', () => {
  const options = { ...baseOptions, goal: 'strength', experience: 'regular', days: 1,
    muscles: plain(tools.PLAN_MUSCLES), location: 'gym', equipment: ['מכונה', 'משקולות יד', 'ספסל', 'גומייה'] };
  const short = tools.generatePlan({ ...options, minutes: 20 }, catalog);
  const long = tools.generatePlan({ ...options, minutes: 90 }, catalog);
  assert.ok(tools.estimateWorkoutDuration(tools.durationSession(short.sessions[0].exercises)).lowSeconds > 20 * 60);
  for (const plan of [short, long]) {
    const exercises = plan.sessions[0].exercises;
    for (const muscle of options.muscles) assert.ok(exercises.some((exercise) => tools.trainingMetadata(exercise).primary === muscle));
    assert.ok(exercises.every((exercise) => exercise.defaultSets === 3 && exercise.restSeconds === 150));
    assert.equal(exercises.length, 9, 'The minimum nine-group coverage is not padded with unbounded accessories');
  }
  const subset = { ...options, muscles: ['חזה', 'גב', 'רגליים'] };
  const twenty = tools.generatePlan({ ...subset, minutes: 20 }, catalog).sessions[0].exercises;
  const ninety = tools.generatePlan({ ...subset, minutes: 90 }, catalog).sessions[0].exercises;
  assert.ok(ninety.length > twenty.length);
  assert.ok(ninety.length <= 8);
  assert.ok(tools.estimateWorkoutDuration(tools.durationSession(ninety)).highSeconds <= 90 * 60);
});

test('muscle targeting refuses unavailable or invalid coverage instead of replacing it with secondary muscle work', () => {
  assert.throws(() => tools.generatePlan({ ...baseOptions, muscles: ['יד קדמית'] }, catalog), /every selected muscle/);
  assert.throws(() => tools.generatePlan({ ...baseOptions, muscles: ['גב'], location: 'outside' }, catalog), /every selected muscle/);
  for (const muscles of [['unknown'], ['חזה', 'חזה'], 'חזה', null]) {
    assert.throws(() => tools.generatePlan({ ...baseOptions, muscles }, catalog), /Invalid/);
  }
  assert.throws(() => tools.generatePlan({ ...baseOptions, goal: 'walk', muscles: ['רגליים'] }, catalog), /Invalid/);
  const legacy = tools.generatePlan(baseOptions, catalog);
  const unchecked = tools.generatePlan({ ...baseOptions, muscles: [] }, catalog);
  assert.deepEqual(plain(legacy.sessions), plain(unchecked.sessions));
  assert.deepEqual(plain(legacy.omitted), plain(unchecked.omitted));
});

test('an unmapped legacy name does not hide an authored machine variant or acquire fabricated metadata', () => {
  const legacy = { id: 'native:legacy-triceps', name: 'פשיטת מרפקים בפולי עליון', category: 'יד אחורית', active: true,
    notes: 'keep canonical user data', defaultSets: 3, defaultReps: 12 };
  const before = JSON.stringify(legacy);
  const expanded = tools.planningCatalog([legacy]);
  assert.ok(expanded.some((exercise) => exercise.id === 'planning:cable-triceps'));
  assert.equal(tools.planningCatalog(expanded).length, expanded.length);
  const plan = tools.generatePlan({ ...baseOptions, days: 1, muscles: ['יד אחורית'], equipment: ['מכונה'], location: 'gym' }, [legacy]);
  assert.equal(plan.sessions[0].exercises[0].id, 'planning:cable-triceps');
  assert.equal(JSON.stringify(legacy), before);
  assert.equal(legacy.catalogId, undefined);
});

test('saved muscle-plan preferences survive real controller activation and current-session protection', () => {
  const { context, writes } = controllerContext({ activeSession: session([entry(find('chest'), [set(25, 7)])]) });
  const api = context.trainingAPI();
  const plan = { ...plain(tools.generatePlan({ ...baseOptions, days: 1, muscles: ['חזה'],
    equipment: ['משקולות יד', 'ספסל'], location: 'gym' }, context.exercises)), id: 'muscle-plan' };
  const sessionBefore = plain(context.activeSession);
  api.activatePlan(plan, 0);
  assert.deepEqual(plain(context.settings.training.plans.find((item) => item.id === plan.id).options.muscles), ['חזה']);
  assert.deepEqual(plain(context.activeSession.entries), sessionBefore.entries);
  assert.ok(context.exercises.filter((exercise) => exercise.active).every((exercise) => tools.trainingMetadata(exercise).primary === 'חזה'));
  assert.equal(writes.length, 1);
});

for (const goal of ['strength', 'muscle', 'fitness', 'walk', 'run']) {
  for (const days of [2, 3, 4]) test(`plan ${goal}/${days} uses real catalog entries and preserves input catalog`, () => {
    const before = JSON.stringify(catalog);
    const options = { ...baseOptions, goal, days, equipment: ['משקולות יד', 'גומייה', 'ספסל'], location: goal === 'run' || goal === 'walk' ? 'outside' : 'gym', minutes: 45 };
    const plan = tools.generatePlan(options, catalog);
    assert.equal(JSON.stringify(catalog), before);
    assert.equal(plan.sessions.length, days);
    for (const session of plan.sessions) {
      assert.ok(session.exercises.length);
      assert.equal(new Set(session.exercises.map((exercise) => exercise.id)).size, session.exercises.length);
      for (const exercise of session.exercises) {
        assert.ok(catalog.some((candidate) => candidate.id === exercise.id && candidate.catalogId === exercise.catalogId));
        assert.ok(library.exerciseGuide(exercise));
        if (goal === 'walk' || goal === 'run') assert.equal(exercise.inputType, 'cardio');
        else if (goal === 'fitness') assert.ok(['reps', 'cardio'].includes(exercise.inputType));
        else assert.equal(exercise.inputType, 'reps');
      }
    }
  });
}

test('goal, experience, frequency, duration and equipment genuinely differentiate plans', () => {
  const opts = { ...baseOptions, equipment: ['משקולות יד', 'ספסל', 'גומייה'], minutes: 60, experience: 'regular' };
  const strength = tools.generatePlan({ ...opts, goal: 'strength' }, catalog);
  const muscle = tools.generatePlan({ ...opts, goal: 'muscle' }, catalog);
  const fitness = tools.generatePlan(opts, catalog);
  assert.notEqual(strength.sessions[0].exercises[0].targetReps, muscle.sessions[0].exercises[0].targetReps);
  assert.equal(strength.sessions[0].exercises[0].restSeconds, 150);
  assert.equal(muscle.sessions[0].exercises[0].restSeconds, 90);
  assert.equal(fitness.sessions[0].exercises[0].defaultSets, 2);
  assert.equal(tools.generatePlan({ ...opts, goal: 'strength', experience: 'beginner' }, catalog).sessions[0].exercises[0].defaultSets, 2);
  const split = tools.generatePlan({ ...opts, days: 4 }, catalog);
  assert.ok(split.sessions[0].exercises.every((exercise) => !['squat', 'hinge', 'lunge'].includes(tools.trainingMetadata(exercise).movement)));
  assert.ok(split.sessions[1].exercises.some((exercise) => tools.trainingMetadata(exercise).movement === 'squat'));
  const short = tools.generatePlan({ ...opts, minutes: 20, goal: 'strength' }, catalog);
  assert.ok(short.sessions[0].exercises.length < strength.sessions[0].exercises.length);
  const noEquipment = tools.generatePlan(baseOptions, catalog);
  assert.ok(noEquipment.omitted.includes('horizontal-pull'));
  assert.ok(noEquipment.sessions.flatMap((session) => session.exercises).every((exercise) =>
    !tools.trainingMetadata(exercise).equipment.includes('משקולות יד')));
});

test('jogging starts gently, uses minutes not reps, and rejects unsupported home-only conditions', () => {
  const plan = tools.generatePlan({ ...baseOptions, goal: 'run', location: 'outside' }, catalog);
  assert.equal(plan.sessions[0].exercises.find((exercise) => exercise.catalogId === 'jog').durationMinutes, 1);
  assert.throws(() => tools.generatePlan({ ...baseOptions, goal: 'run' }, catalog), /outdoor or gym/);
  assert.throws(() => tools.generatePlan({ ...baseOptions, days: 7 }, catalog), /Invalid/);
});

test('plan activation changes only selection and authored targets, not names, notes, photos or library data', () => {
  const current = plain(catalog);
  current[0].name = 'My <personal> name';
  current[0].notes = 'My notes';
  current[0].images = ['data:image/example'];
  const proposed = [{ ...current[0], name: 'must not replace name', notes: 'must not replace notes', defaultSets: 2, targetReps: 8 }];
  const before = JSON.stringify(current);
  const activated = tools.activatePlanExercises(current, proposed);
  assert.equal(JSON.stringify(current), before);
  assert.equal(activated[0].name, 'My <personal> name');
  assert.equal(activated[0].notes, 'My notes');
  assert.deepEqual(Array.from(activated[0].images), ['data:image/example']);
  assert.equal(activated[0].defaultSets, 2);
  assert.equal(activated[0].targetReps, 8);
  assert.equal(activated.filter((exercise) => exercise.active !== false).length, 1);
  assert.equal(activated.length, current.length);
  assert.throws(() => tools.activatePlanExercises(current, [{ ...proposed[0], id: 'not-in-catalog' }]), /no longer/);
});

test('recommendation requires two matched top-target rated workouts; no automatic load increment', () => {
  const exercise = { ...find('chest'), targetReps: 12 };
  const history = [record('first', '2026-10-19'), record('second', '2026-10-21')];
  const before = JSON.stringify(history);
  const advice = insights.progressRecommendation(exercise, history);
  assert.equal(advice.kind, 'increase');
  assert.equal(advice.evidence.length, 2);
  assert.equal(advice.weightKg, 20);
  assert.equal(advice.targetWeightKg, undefined);
  assert.equal(JSON.stringify(history), before);
});

for (const [reason, mutate] of [
  ['hard', (record) => { record.entries[0].sets[0].difficulty = 'hard'; }],
  ['rating', (record) => { delete record.entries[0].sets[0].difficulty; }],
  ['target', (record) => { delete record.entries[0].targetReps; }],
  ['variation', (record) => { record.entries[0].comparisonKey = 'another variation'; }],
  ['variation', (record) => { record.entries[0].catalogId = 'floor'; }],
  ['variation', (record) => { record.entries[0].sets.push(set(20, 12, true)); }],
  ['variation', (record) => { record.entries[0].sets[0].reps = 0; }],
]) test(`recommendation refuses an increase with ${reason} evidence`, () => {
  const history = [record('first', '2026-10-19'), record('second', '2026-10-21')];
  mutate(history[1]);
  const advice = insights.progressRecommendation({ ...find('chest'), targetReps: 12 }, history);
  assert.notEqual(advice.kind, 'increase');
  assert.equal(advice.reason, reason);
});

test('recommendations distinguish custom, mixed, legacy, cardio, holds and assistance', () => {
  const exercise = { ...find('chest'), targetReps: 12 };
  const history = [record('first', '2026-10-19'), record('second', '2026-10-21')];
  assert.equal(insights.progressRecommendation({ ...exercise, catalogId: undefined }, history).kind, 'insufficient');
  assert.equal(insights.progressRecommendation({ ...exercise, catalogId: 'unknown' }, history).kind, 'insufficient');
  assert.equal(insights.progressRecommendation(find('walk'), history).reason, 'cardio');
  assert.equal(insights.progressRecommendation(find('sidePlank'), history).reason, 'hold');
  const assisted = { ...exercise, catalogId: 'assisted', loadKind: 'assistance' };
  const assistedHistory = [record('first', '2026-10-19', assisted), record('second', '2026-10-21', assisted)];
  assert.equal(insights.progressRecommendation(assisted, assistedHistory).reason, 'assistance');
  const lower = [set(20, 10, true, { difficulty: 'right' }), set(20, 10, true, { difficulty: 'right' })];
  assert.equal(insights.progressRecommendation(exercise, [record('a', '2026-10-19', exercise, lower), record('b', '2026-10-21', exercise, lower)]).kind, 'reps');
});

test('completed snapshots preserve per-set loads, ratings, notes, catalog identity and explicit target', () => {
  const exercise = { ...find('floor'), targetReps: 12 };
  const snapshot = insights.completedEntrySnapshot(entry(exercise, [
    set(10, 12, true, { difficulty: 'right', notes: 'Personal <text>' }),
    set(15, 8, true, { difficulty: 'hard', notes: 'Different load' }), set(20, 4, false),
  ]), exercise);
  assert.equal(snapshot.catalogId, 'floor');
  assert.equal(snapshot.targetReps, 12);
  assert.equal(snapshot.sets.length, 2);
  assert.equal(snapshot.sets[0].notes, 'Personal <text>');
  assert.equal(snapshot.sets[1].weightKg, 15);
  assert.equal(snapshot.sets[1].difficulty, 'hard');
});

test('weekly muscle work uses actual completed sets in local Sunday week, primary/secondary separately', () => {
  const now = new Date(2026, 9, 21, 12);
  const history = [
    record('current', new Date(2026, 9, 20).toISOString()),
    record('old', new Date(2026, 9, 17, 23, 59).toISOString()),
    record('future', new Date(2026, 9, 24).toISOString()),
  ];
  history[0].entries[0].sets.push(set(100, 100, false));
  history.push({ id: 'legacy', dateISO: new Date(2026, 9, 21, 10).toISOString(), entries: [{ sets: [set(40, 8, true)] }] });
  const result = tools.weeklyMuscleWork(history, now);
  assert.equal(result.muscles['חזה'].primary, 2);
  assert.equal(result.muscles['יד אחורית'].secondary, 2);
  assert.equal(result.muscles['יד אחורית'].primary, 0);
  assert.equal(result.unknownSets, 1);
});

test('monthly goals reset by local calendar month and count completed workouts, not drafts or future data', () => {
  const now = new Date(2026, 9, 21, 12);
  const history = [record('one', new Date(2026, 9, 1).toISOString()), record('two', new Date(2026, 9, 20).toISOString()),
    record('future', new Date(2026, 9, 25).toISOString()), record('old', new Date(2026, 8, 30).toISOString()),
    { dateISO: new Date(2026, 9, 20).toISOString(), entries: [entry(find('floor'))] }];
  const result = tools.monthlyGoalProgress(history, { month: '2026-10', target: 4 }, now);
  assert.equal(result.count, 2);
  assert.equal(result.percent, 50);
  assert.equal(result.remaining, 2);
  assert.equal(tools.monthlyGoalProgress(history, { month: '2026-09', target: 4 }, now).target, 0);
});

test('monthly pacing uses remaining local calendar days including today, weekly frequency and leap months', () => {
  for (const [date, weekly, days, suggested] of [
    [new Date(2026, 9, 25, 12), 4, 7, 4],
    [new Date(2026, 9, 31, 23, 59), 4, 1, 1],
    [new Date(2026, 9, 1, 0), 4, 31, 18],
    [new Date(2028, 1, 28, 12), 4, 2, 2],
    [new Date(2028, 1, 29, 12), 1, 1, 1],
    [new Date(2026, 1, 28, 12), 7, 1, 1],
    [new Date(2026, 11, 31, 12), 3, 1, 1],
    [new Date(2027, 0, 1, 12), 7, 31, 31],
  ]) {
    const result = tools.monthlyGoalProgress([], null, date, weekly);
    assert.equal(result.daysRemaining, days);
    assert.equal(result.suggestedRemaining, suggested);
    assert.equal(result.suggestedTarget, suggested);
    assert.equal(result.weeklyGoal, weekly);
    assert.equal(result.target, 0, 'A suggestion must not silently become a saved goal');
  }
});

test('monthly suggestion adds completed workouts without replacing the saved manual target or carrying last month', () => {
  const date = new Date(2026, 9, 25, 12), goal = { month: '2026-10', target: 12 };
  const history = [record('one', new Date(2026, 9, 20).toISOString()), record('two', new Date(2026, 9, 21).toISOString())];
  const result = tools.monthlyGoalProgress(history, goal, date, 4);
  assert.equal(result.count, 2);
  assert.equal(result.target, 12);
  assert.equal(result.remaining, 10);
  assert.equal(result.suggestedTarget, 6);
  assert.deepEqual(goal, { month: '2026-10', target: 12 });
  assert.equal(tools.monthlyGoalProgress(history, { month: '2026-10', target: 1 }, date, 4).remaining, 0);
  const nextMonth = tools.monthlyGoalProgress(history, goal, new Date(2026, 10, 1), 4);
  assert.equal(nextMonth.target, 0);
  assert.equal(nextMonth.count, 0);
  assert.equal(nextMonth.month, '2026-11');
});

function storageContext(failAt = -1) {
  const data = new Map([['ft_exercises_v1', '["original"]'], ['ft_settings_v1', '{"before":true}']]);
  let calls = 0;
  const events = [], syncs = [], errors = [];
  const db = load('www/js/db.js', ['saveProgramState', 'saveSettings', 'getExercises', 'getSettings', 'getActiveSession', 'setSyncHook'], {
    localStorage: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => { calls++; if (calls === failAt) throw new Error('quota'); data.set(key, value); },
      removeItem: (key) => data.delete(key),
    },
    window: { dispatchEvent: (event) => events.push(event) },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    console: { error: (...args) => errors.push(args) },
  });
  db.setSyncHook((key, value) => syncs.push({ key, value }));
  return { db, data, events, syncs, errors };
}
for (const failAt of [1, 2, 3]) test(`program transaction rolls back local write failure ${failAt} and does not sync partial data`, () => {
  const { db, data, syncs, events } = storageContext(failAt);
  assert.throws(() => db.saveProgramState(['new'], { after: true }, session([])), /quota/);
  assert.equal(data.get('ft_exercises_v1'), '["original"]');
  assert.equal(data.get('ft_settings_v1'), '{"before":true}');
  assert.equal(data.has('ft_active_session_v1'), false);
  assert.equal(syncs.length, 0);
  assert.equal(events[0].type, 'autofit-storage-error');
});
test('program transaction syncs complete exercises/settings/session through existing known keys', () => {
  const { db, syncs } = storageContext();
  db.saveProgramState(['new'], { after: true }, session([]));
  assert.equal(db.getExercises()[0], 'new');
  assert.equal(db.getSettings().after, true);
  assert.equal(db.getActiveSession().id, 'local-session');
  assert.deepEqual(syncs.map((item) => item.key), ['ft_exercises_v1', 'ft_settings_v1', 'ft_active_session_v1']);
});

function controllerContext(initial = {}) {
  const source = read('www/js/app.js');
  const writes = [], notices = [];
  const state = { exercises: plain(catalog), settings: { restSeconds: 90, programWeek: 3 },
    activeSession: session([entry(find('chest'))]), workouts: [], voiceListeningActive: false, voiceActivationPending: false,
    voiceCountingState: null, holdTimers: new Map(), restTimer: { endAt: null }, lastVoiceAction: null,
    lastVoiceReport: null, lastAutoCountCompletion: null, ...initial };
  const context = vm.createContext({ ...state, trainingTools: tools,
    db: { uid: () => 'new-draft', getWorkouts: () => [], saveExercises: (data) => writes.push(plain(data)),
      saveSettings: (data) => writes.push(plain(data)), saveActiveSession: (data) => writes.push(plain(data)),
      saveProgramState: (...data) => writes.push(plain(data)) },
    native: { isNative: () => false }, openTrainingDialog() {}, openExerciseGuide() {}, showToast: (text) => notices.push(text),
    renderExercisesTab() {}, renderWorkoutTab() {}, renderHomeTab() {}, syncNativeAnnouncementPlan() {}, syncWorkoutActivity() {},
    buildProgramDraft: (program) => session(program.filter((exercise) => exercise.active !== false).map((exercise) =>
      exercise.inputType === 'cardio' ? { exerciseId: exercise.id, type: 'cardio' } : entry(exercise))),
  });
  const start = source.indexOf('function trainingAPI()');
  const end = source.indexOf('function persistRestTimerState(', start);
  vm.runInContext(source.slice(start, end), context);
  return { context, api: context.trainingAPI(), writes, notices };
}

test('real removal controller pauses and freezes clocks, preserves archived completions and leaves programs unchanged', () => {
  const { context, el } = pauseController();
  const originalExercises = plain(context.exercises), source = read('www/js/app.js');
  context.openTrainingDialog = () => {};
  context.openExerciseGuide = () => {};
  context.renderHomeTab = () => {};
  vm.runInContext(source.slice(source.indexOf('function trainingAPI()'), source.indexOf('function persistRestTimerState(')), context);
  vm.runInContext(source.slice(source.indexOf('function removeLastWorkoutSet('), source.indexOf('function setWorkoutSetCompletion(')), context);
  assert.equal(typeof context.openWorkoutRemovalDialog, 'function', 'Removal dialog must be available to every workout card');
  const api = context.trainingAPI();
  api.changeWorkoutRemoval('native:chest');
  assert.equal(context.activeSession.paused, true);
  assert.equal(context.activeSession.entries.length, 2);
  assert.equal(context.activeSession.entries[0].sets[0].holdElapsedSec, 10);
  assert.equal(context.activeSession.entries[1].elapsedSec, 60);
  assert.equal(context.voiceCountingState, null);
  assert.equal(context.holdTimers.size, 0);
  assert.equal(context.activeSession.pausedVoiceCount, undefined);
  assert.deepEqual(plain(context.exercises), originalExercises);
  assert.equal(el('btnStartWorkout').textContent, 'המשך אימון');
  context.finishWorkout();
  assert.equal(context.workouts.length, 1, 'Finishing saves completed removed sets even with no visible completions');
  const recorded = context.workouts[0].entries.find((item) => item.exerciseId === 'native:chest');
  assert.equal(recorded.removedFromWorkout, true);
  assert.equal(recorded.sets.length, 1);
  assert.equal(recorded.sets[0].weightKg, 20);
  assert.equal(recorded.sets[0].notes, 'keep');
  assert.equal(recorded.sets[0].difficulty, 'right');
});

test('real saved-plan editor persistence merges latest settings, preserves three plans and logged work, and survives reload', () => {
  const { db } = storageContext();
  const plans = threeSavedPlans();
  db.saveSettings({ weeklyGoal: 3, training: { plans, activePlan: { id: plans[1].id, day: 0 },
    programBackup: [{ id: 'keep', active: true }] } });
  const { context, api, writes } = controllerContext({ settings: plain(db.getSettings()),
    activeSession: session([entry(find('chest'), [set(42, 12, true, { notes: 'keep', difficulty: 'right' })])]) });
  const before = plain({ exercises: context.exercises, session: context.activeSession, history: context.workouts });
  context.db.getSettings = db.getSettings;
  context.db.saveSettings = (next) => { db.saveSettings(next); writes.push(plain(next)); };
  const latest = db.getSettings();
  latest.weeklyGoal = 4;
  latest.training.plans[2].name = 'Concurrent third plan';
  db.saveSettings(latest);
  const draft = plain(plans[0]);
  draft.sessions[0].exercises[0] = tools.editSavedPlanExercise(draft.sessions[0].exercises[0], { defaultReps: '10–15' });
  api.saveEditedPlan(plans[0], draft);
  const reloaded = plain(db.getSettings());
  assert.equal(reloaded.weeklyGoal, 4);
  assert.equal(reloaded.training.plans.length, 3);
  assert.equal(reloaded.training.plans[2].name, 'Concurrent third plan');
  assert.deepEqual(reloaded.training.plans[1], plans[1]);
  assert.deepEqual(reloaded.training.activePlan, plain(latest.training.activePlan));
  assert.deepEqual(reloaded.training.programBackup, plain(latest.training.programBackup));
  assert.equal(reloaded.training.plans[0].sessions[0].exercises[0].defaultReps, '10–15');
  assert.deepEqual(plain({ exercises: context.exercises, session: context.activeSession, history: context.workouts }), before);
  assert.equal(writes.length, 1, 'Only settings are written; never exercises, active session or history');
});

test('real saved-plan editor refuses storage failure and concurrent target changes without updating memory or any other plan', () => {
  const plans = threeSavedPlans(), stored = { weeklyGoal: 4, training: { plans: plain(plans) } };
  const { context, api } = controllerContext({ settings: plain(stored) });
  context.db.getSettings = () => plain(stored);
  context.db.saveSettings = () => { throw new Error('QuotaExceededError'); };
  const before = plain(context.settings), draft = plain(plans[0]);
  draft.name = 'New name';
  assert.throws(() => api.saveEditedPlan(plans[0], draft), /QuotaExceededError/);
  assert.deepEqual(plain(context.settings), before);
  assert.deepEqual(stored.training.plans, plans);
  stored.training.plans[0].name = 'Other tab changed it';
  assert.throws(() => api.saveEditedPlan(plans[0], draft), /reopen the editor/);
  assert.deepEqual(plain(context.settings), before);
});

test('real draft builder snapshots the selected saved workout and completion retains that immutable name in history', () => {
  const plan = threeSavedPlans()[0], source = read('www/js/app.js');
  const settings = { training: { plans: [plan], activePlan: { id: plan.id, day: 0 } } };
  const context = vm.createContext({ exercises: [plan.sessions[0].exercises[0]], settings, trainingTools: tools,
    db: { uid: () => 'named-draft' }, getLastCompletedValuesByExercise: () => ({}) });
  vm.runInContext(source.slice(source.indexOf('function buildDraftSession()'), source.indexOf('function applyProgramWeekToActiveSession(')), context);
  const draft = context.buildDraftSession();
  assert.equal(draft.planSnapshot.name, 'A אישי');
  plan.name = 'Later renamed';
  assert.equal(draft.planSnapshot.name, 'A אישי');
  const finished = pauseController();
  finished.context.activeSession.planId = draft.planId;
  finished.context.activeSession.planSnapshot = draft.planSnapshot;
  finished.context.finishWorkout();
  assert.equal(finished.context.workouts[0].planSnapshot.name, 'A אישי');
  assert.equal(finished.context.workouts[0].planId, 'owner:A');
  assert.notEqual(finished.context.workouts[0].planSnapshot, draft.planSnapshot);
});

test('real app controller activates only after explicit invocation, backs up and restores without losing custom text', () => {
  const { context, api, writes } = controllerContext();
  const originalIds = Array.from(context.exercises, (exercise) => exercise.id);
  const plan = { ...plain(tools.generatePlan(baseOptions, context.exercises)), id: 'alternate' };
  assert.equal(writes.length, 0);
  api.activatePlan(plan, 0);
  assert.equal(context.settings.training.activePlan.id, 'alternate');
  assert.ok(context.settings.training.programBackup);
  assert.equal(context.settings.training.plans.length, 1);
  context.exercises[0].notes = 'My changed notes';
  const changedId = context.exercises[0].id;
  api.restoreProgram();
  assert.equal(context.settings.training.activePlan, null);
  assert.deepEqual(Array.from(context.exercises, (exercise) => exercise.id).filter((id) => !id.startsWith('planning:')), originalIds);
  assert.ok(context.exercises.filter((exercise) => exercise.id.startsWith('planning:')).every((exercise) => exercise.active === false));
  assert.equal(context.exercises.find((exercise) => exercise.id === changedId).notes, 'My changed notes');
});

test('live training state reuses in-memory history and exercises instead of cloning or rereading storage', () => {
  const { context, api } = controllerContext();
  context.db.getWorkouts = () => { throw new Error('Unexpected history storage read'); };
  assert.equal(api.getState().history, context.workouts);
  assert.equal(api.getState().exercises, context.exercises);
  assert.equal(api.getState().session, context.activeSession);
});

test('real draft builder carries independent interval prescriptions and source identity into cardio entries', () => {
  const exercise = { ...plain(tools.generateRopePlan('advanced', 15, catalog).sessions[0].exercises[0]), active: true };
  const context = vm.createContext({ exercises: [exercise], settings: {}, db: { uid: () => 'rope-draft' },
    getLastCompletedValuesByExercise: () => ({}) });
  const source = read('www/js/app.js');
  vm.runInContext(source.slice(source.indexOf('function buildDraftSession()'), source.indexOf('function applyProgramWeekToActiveSession(')), context);
  const draft = context.buildDraftSession(), item = draft.entries[0];
  assert.equal(item.type, 'cardio');
  assert.equal(item.durationSec, exercise.durationMinutes * 60);
  assert.deepEqual(plain(item.intervals), exercise.intervals);
  assert.equal(item.exerciseSnapshot.catalogId, 'jumpRope');
  item.intervals.rounds--;
  assert.notEqual(item.intervals.rounds, exercise.intervals.rounds);
});

test('rope background announcement deadlines use the same schedule after pause and resume', () => {
  const exercise = tools.generateRopePlan('beginner', 10, catalog).sessions[0].exercises[0];
  const item = { exerciseId: exercise.id, exerciseName: exercise.name, type: 'cardio', durationSec: 600,
    intervals: exercise.intervals, startedAt: 1000000, elapsedSec: 130 };
  const context = vm.createContext({ activeSession: { entries: [item] }, trainingTools: tools,
    settings: { voiceAnnouncements: true }, Date: { now: () => 1000000 }, holdTimers: new Map(),
    restTimer: { isRunning: () => false }, cardioCompletionMessage: () => 'Done',
    i18n: { text: (value) => value, locale: () => 'he-IL' } });
  const source = read('www/js/app.js');
  vm.runInContext(source.slice(source.indexOf('function intervalPhaseText('), source.indexOf('function renderCardioCard(')), context);
  vm.runInContext(source.slice(source.indexOf('function buildBackgroundAnnouncementItems('), source.indexOf('function syncNativeAnnouncementPlan(')), context);
  const announcements = context.buildBackgroundAnnouncementItems();
  const next = announcements.filter((item) => item.announcementID.startsWith('rope:')).sort((a, b) => a.fireAtMillis - b.fireAtMillis);
  assert.equal(next[0].fireAtMillis, 1010000, 'Recovery starts ten seconds after resuming at elapsed 130');
  assert.match(next[0].text, /התאוששות/);
  assert.ok(announcements.every((item) => item.fireAtMillis > 1000000 && item.language === 'he-IL'));
  assert.equal(new Set(announcements.map((item) => item.announcementID)).size, announcements.length);
  assert.equal(announcements.find((item) => item.announcementID.startsWith('cardio:')).fireAtMillis, 1470000);
});

test('real controller plan activation preserves running, typed, paused-cardio and temporary-selection sessions', () => {
  for (const activeSession of [
    { ...session([entry(find('chest'))]), running: true },
    session([entry(find('chest'), [set(25, 9)])]),
    session([{ exerciseId: 'walk', type: 'cardio', durationSec: 600, elapsedSec: 120 }]),
    { ...session([entry(find('chest'))]), timeBudget: { deferred: [], order: [] } },
  ]) {
    const before = plain(activeSession);
    const { context, api } = controllerContext({ activeSession });
    const plan = { ...plain(tools.generatePlan(baseOptions, catalog)), id: 'alternate' };
    api.activatePlan(plan, 0);
    const saved = plain(context.activeSession);
    delete saved.programPinned;
    assert.deepEqual(saved, before);
  }
});

test('real controller saves an accepted chosen load for future drafts without touching active set values', () => {
  const { context, api } = controllerContext();
  const id = find('chest').id;
  const before = JSON.stringify(context.activeSession);
  api.acceptAdvice(id, { decision: 'accept', kind: 'increase' }, 22.5);
  assert.equal(context.exercises.find((exercise) => exercise.id === id).targetWeightKg, 22.5);
  assert.equal(JSON.stringify(context.activeSession), before);
  assert.equal(context.settings.training.decisions[id].decision, 'accept');
});

test('real controller does not mutate in-memory program if persistence fails', () => {
  const { context, api } = controllerContext();
  const before = JSON.stringify({ exercises: context.exercises, settings: context.settings, session: context.activeSession });
  context.db.saveProgramState = () => { throw new Error('quota'); };
  const plan = { ...plain(tools.generatePlan(baseOptions, catalog)), id: 'alternate' };
  assert.throws(() => api.activatePlan(plan, 0), /quota/);
  assert.equal(JSON.stringify({ exercises: context.exercises, settings: context.settings, session: context.activeSession }), before);
});

test('extra machine choices are authored, inactive, stable, additive and genuinely selected only with equipment', () => {
  const before = JSON.stringify(catalog);
  const expanded = tools.planningCatalog(catalog);
  assert.equal(JSON.stringify(catalog), before);
  assert.equal(expanded.length, catalog.length + 6);
  assert.equal(tools.planningCatalog(expanded).length, expanded.length);
  for (const exercise of expanded.filter((exercise) => exercise.id.startsWith('planning:'))) {
    assert.equal(exercise.active, false);
    assert.equal(library.exerciseGuide(exercise).name.he, exercise.name);
    assert.equal(exercise.inputType, 'reps');
  }
  const machinePlan = tools.generatePlan({ ...baseOptions, days: 4, minutes: 60, equipment: ['מכונה'], location: 'gym' }, catalog);
  assert.ok(machinePlan.sessions[0].exercises.some((exercise) => exercise.catalogId === 'row'));
  assert.ok(machinePlan.sessions[0].exercises.some((exercise) => exercise.catalogId === 'shoulder'));
  assert.ok(machinePlan.sessions[1].exercises.some((exercise) => exercise.catalogId === 'legPress'));
  const homePlan = tools.generatePlan(baseOptions, catalog);
  assert.ok(homePlan.sessions.flatMap((session) => session.exercises).every((exercise) => !exercise.id.startsWith('planning:')));
});

test('new plan dose estimates honor duration ceilings without shortening configured rests', () => {
  for (const goal of ['strength', 'muscle', 'fitness']) for (const minutes of [20, 30, 45, 60]) {
    const plan = tools.generatePlan({ ...baseOptions, goal, minutes, days: 4, experience: 'regular',
      equipment: ['משקולות יד', 'ספסל', 'גומייה', 'מכונה'], location: 'gym' }, catalog);
    for (const day of plan.sessions) {
      const total = day.exercises.reduce((seconds, exercise) => seconds + tools.estimateEntrySeconds(exercise.inputType === 'cardio'
        ? { type: 'cardio', durationSec: exercise.durationMinutes * 60 }
        : { targetReps: exercise.targetReps, sets: Array.from({ length: exercise.defaultSets }, () => ({ completed: false })) }, exercise), 0);
      assert.ok(total <= minutes * 60, `${goal}/${minutes}: ${total}`);
      for (const exercise of day.exercises.filter((exercise) => exercise.inputType !== 'cardio')) {
        assert.equal(exercise.restSeconds, goal === 'strength' ? 150 : goal === 'muscle' ? 90 : 75);
      }
    }
  }
});

test('legacy typed values, notes and running current work cannot be deferred', () => {
  const chest = find('chest'), floor = find('floor');
  for (const sets of [[set(20, 8)], [set('', '', false, { notes: 'Only a note' })]]) {
    const draft = session([entry(chest, sets), entry(floor)]);
    assert.throws(() => tools.applyTimeBudget(draft, [floor.id], 30), /Cannot defer/);
  }
  const running = { ...session([entry(chest), entry(floor)]), running: true };
  assert.equal(tools.timeBudgetProposal(running, catalog, 10).rows.find((row) => row.entry.exerciseId === chest.id).protected, true);
  assert.throws(() => tools.applyTimeBudget(running, [floor.id], 10), /Cannot defer/);
});

test('future draft uses accepted load and explicit target, not live reps or a replacement load', () => {
  const source = read('www/js/app.js');
  const context = vm.createContext({
    exercises: [{ ...find('floor'), active: true, targetReps: 12, targetWeightKg: 17.5 }],
    db: { uid: () => 'next-session' }, settings: { programWeek: 3 },
    getLastCompletedValuesByExercise: () => ({ 'library:floor-press': { weightKg: 10, reps: 7 } }),
  });
  const start = source.indexOf('function buildDraftSession()');
  const end = source.indexOf('function applyProgramWeekToActiveSession(', start);
  vm.runInContext(source.slice(start, end), context);
  const draft = context.buildDraftSession();
  assert.equal(draft.entries[0].sets[0].weightKg, 17.5);
  assert.equal(draft.entries[0].sets[0].voiceTargetReps, 12);
  assert.equal(draft.entries[0].sets[0].reps, 12);
  assert.equal(draft.entries[0].targetReps, 12);
  assert.equal(draft.entries[0].exerciseSnapshot.catalogId, 'floor');
});

test('finishing restores original exercises, set counts and targets while history keeps session-only changes', () => {
  const { context } = pauseController();
  const original = [
    { ...find('chest'), active: true, defaultSets: 3, targetReps: 12, targetWeightKg: 20 },
    { ...find('floor'), active: true, defaultSets: 2, defaultReps: '8' },
  ];
  context.exercises = plain(original);
  context.settings.programWeek = 3;
  context.db.uid = () => 'fresh-original-program';
  context.getLastCompletedValuesByExercise = () => { throw new Error('No automatic history prefill'); };
  const source = read('www/js/app.js');
  vm.runInContext(source.slice(source.indexOf('function buildDraftSession()'), source.indexOf('function applyProgramWeekToActiveSession(')), context);
  context.activeSession = { ...context.buildDraftSession(), id: 'temporary-edits', paused: true,
    startedAt: '2026-10-28T08:00:00Z', accumulatedSec: 40 };
  context.activeSession.entries[0].sets[0] = set(100, 5, true, { notes: 'Actual performance', difficulty: 'hard' });
  context.activeSession = tools.removeWorkoutExercise(context.activeSession, original[0].id);
  context.activeSession.entries[0].sets = [set(99, 4, true)];
  context.finishWorkout();
  const next = plain(context.activeSession), logged = plain(context.workouts[0]);
  assert.deepEqual(next.entries.map((item) => item.exerciseId), original.map((item) => item.id));
  assert.deepEqual(next.entries.map((item) => item.sets.length), [3, 2]);
  assert.ok(next.entries[0].sets.every((item) => item.weightKg === 20 && item.reps === 12 && !item.completed));
  assert.ok(next.entries[1].sets.every((item) => item.weightKg === '' && item.reps === 8 && !item.completed));
  assert.equal(next.removedExercises, undefined);
  assert.deepEqual(plain(context.exercises), original);
  const removed = logged.entries.find((item) => item.exerciseId === original[0].id);
  assert.equal(removed.removedFromWorkout, true);
  assert.deepEqual(removed.sets[0], set(100, 5, true, { notes: 'Actual performance', difficulty: 'hard' }));
  const changed = logged.entries.find((item) => item.exerciseId === original[1].id);
  assert.equal(changed.sets.length, 1);
  assert.equal(changed.sets[0].weightKg, 99);
  assert.equal(changed.sets[0].reps, 4);
});

test('fresh drafts leave unknown/ranged loads and repetitions blank rather than importing a past result', () => {
  const source = read('www/js/app.js');
  const exercise = { ...find('floor'), active: true, defaultReps: '8–12' };
  const context = vm.createContext({ exercises: [exercise], settings: { programWeek: 3 }, db: { uid: () => 'blank-defaults' },
    getLastCompletedValuesByExercise: () => { throw new Error('History must stay separate'); } });
  vm.runInContext(source.slice(source.indexOf('function buildDraftSession()'), source.indexOf('function applyProgramWeekToActiveSession(')), context);
  const fresh = context.buildDraftSession().entries[0];
  assert.ok(fresh.sets.every((item) => item.weightKg === '' && item.reps === '' && !item.completed));
  assert.equal(fresh.exerciseSnapshot.defaultReps, '8–12');
  assert.equal(tools.entryHasActivity(fresh), false);
});

test('all authored training UI labels use the shared bilingual dictionary', () => {
  const context = vm.createContext();
  for (const file of ['exercise-library.js', 'translations-en.js', 'seed.js', 'i18n.js']) {
    vm.runInContext(read(`www/js/${file}`).replace(/^import .*$/gm, '').replace(/^export /gm, ''), context);
  }
  context.setLanguage('en');
  const source = read('www/js/training-ui.js');
  const labels = [...source.matchAll(/'([^'\r\n]*[\u0590-\u05ff][^'\r\n]*)'/g)].map((match) => match[1]);
  for (const label of labels) assert.doesNotMatch(context.text(label), /[\u0590-\u05ff]/, label);
});

test('text and paginated image sharing retain ratings, hold units and personal notes in both languages', () => {
  const source = read('www/js/app.js');
  const dictionary = { 'קל': 'Easy', 'מתאים': 'Right', 'קשה': 'Hard', 'שניות': 'seconds' };
  const shared = { id: 'notes', dateISO: '2026-10-21', durationSec: 60, entries: [
    { exerciseName: 'Custom name', inputType: 'hold', sets: [set(5, 20, true, { difficulty: 'right', notes: 'Personal <text> '.repeat(20) })] },
  ] };
  for (const language of ['he', 'en']) {
    const drawn = [];
    const ctx = new Proxy({ fillText: (text) => drawn.push(text) }, { get: (object, key) => key in object ? object[key] : () => {} });
    const context = vm.createContext({
      profile: { name: 'Personal' }, insights: { DIFFICULTY_LABELS: { easy: 'קל', right: 'מתאים', hard: 'קשה' } },
      i18n: { getLanguage: () => language, locale: () => 'en-US', exerciseName: (text) => text,
        text: (text) => language === 'en' ? dictionary[text] || text : text },
      formatHMS: () => '01:00', formatDate: () => '2026-10-21', computeVolume: () => 100,
      document: { createElement: () => ({ getContext: () => ctx }) }, DEFAULT_CARDIO_PACE: '',
    });

    const start = source.indexOf('function formatCardioExtra(');
    const end = source.indexOf('async function buildWorkoutShareImages(', start);
    vm.runInContext(source.slice(start, end), context);
    const lines = Array.from(context.buildWorkoutShareLines([shared]));
    assert.ok(lines.some((line) => line.includes(shared.entries[0].sets[0].notes)));
    assert.ok(lines.some((line) => line.includes(language === 'en' ? 'Right' : 'מתאים')));
    assert.ok(lines.some((line) => line.includes(language === 'en' ? 'seconds' : 'שניות')));
    const pages = [...context.buildWorkoutShareCanvases([shared])];
    assert.ok(pages.length);
    const annotations = drawn.filter((text) => text.includes('Personal <text>') || text.includes(language === 'en' ? 'Right' : 'מתאים'));
    assert.ok(annotations.length > 1, 'Long custom notes should wrap to multiple annotation rows');
  }
});

test('saved plan schema never duplicates user photos or custom notes across days', () => {
  const current = plain(catalog);
  for (const exercise of current) {
    exercise.images = ['data:image/example-user-photo'];
    exercise.notes = 'Personal notes stay in the exercise library';
  }
  const plan = tools.generatePlan({ ...baseOptions, equipment: ['משקולות יד', 'ספסל', 'גומייה'], minutes: 60 }, current);
  for (const exercise of plan.sessions.flatMap((day) => day.exercises)) {
    assert.equal(exercise.images, undefined);
    assert.equal(exercise.notes, undefined);
  }
  const activated = tools.activatePlanExercises(current, plan.sessions[0].exercises);
  assert.equal(activated[0].images[0], 'data:image/example-user-photo');
  assert.equal(activated[0].notes, 'Personal notes stay in the exercise library');
});

test('a personal plan uses its reviewed set count, independently of the old program-week ramp', () => {
  const source = read('www/js/app.js');
  const context = vm.createContext({
    exercises: [], settings: { programWeek: 1 }, db: { uid: () => 'next-session' }, getLastCompletedValuesByExercise: () => ({}),
  });
  const start = source.indexOf('function buildDraftSession()');
  const end = source.indexOf('function applyProgramWeekToActiveSession(', start);
  vm.runInContext(source.slice(start, end), context);
  const planSettings = { programWeek: 1, training: { activePlan: { id: 'reviewed' } } };
  const draft = context.buildProgramDraft([{ ...find('floor'), active: true, defaultSets: 3 }], planSettings);
  assert.equal(draft.entries[0].sets.length, 3);
  assert.equal(draft.planId, 'reviewed');
  assert.equal(context.buildProgramDraft([{ ...find('floor'), active: true, defaultSets: 3 }]).entries[0].sets.length, 1);
});

test('future records and duplicate workout IDs cannot supply two-workout recommendation evidence', () => {
  const exercise = { ...find('chest'), targetReps: 12 };
  const a = record('same-id', '2026-10-19');
  const duplicate = record('same-id', '2026-10-20');
  const future = record('future', '2099-10-21');
  assert.equal(insights.progressRecommendation(exercise, [a, duplicate, future], new Date('2026-10-21')).kind, 'insufficient');
});

test('current focus skips a completed selection and prioritizes an already-running cardio entry', () => {
  const source = find('floor'), other = find('chest');
  const draft = { ...session([entry(source, [set(10, 12, true)]), entry(other),
    { exerciseId: 'walking', type: 'cardio', completed: false, startedAt: 123, durationSec: 600 }]), currentExerciseId: source.id, running: true };
  assert.equal(tools.currentWorkoutEntry(draft).exerciseId, 'walking');
  assert.equal(tools.timeBudgetProposal(draft, catalog, 10).rows.find((row) => row.entry.exerciseId === 'walking').protected, true);
  assert.equal(tools.trainingMetadata({ catalogId: 'constructor' }), null);
});

test('walking and jogging plans activate the reviewed location instead of inheriting outdoor library defaults', () => {
  for (const location of ['gym', 'outside', 'home']) {
    const plan = tools.generatePlan({ ...baseOptions, goal: 'walk', location }, catalog);
    const activated = tools.activatePlanExercises(catalog, plan.sessions[0].exercises);
    assert.equal(activated[0].location, location === 'gym' ? 'treadmill' : location);
  }
});

test('band tension and bodyweight do not become load-increase evidence from numeric kg fields alone', () => {
  for (const id of ['bandRow', 'pushup']) {
    const exercise = { ...find(id), targetReps: 12 };
    const history = [record('one', '2026-10-19', exercise), record('two', '2026-10-20', exercise)];
    assert.equal(insights.progressRecommendation(exercise, history).reason, 'load');
  }
});

test('clearing an accepted future load is explicit, persistent and leaves current entries untouched', () => {
  const { api, context } = controllerContext();
  const id = find('chest').id;
  const before = JSON.stringify(context.activeSession);
  api.acceptAdvice(id, { decision: 'accept', kind: 'increase' }, 22.5);
  api.clearLoadTarget(id);
  assert.equal(context.exercises.find((exercise) => exercise.id === id).targetWeightKg, undefined);
  assert.equal(context.settings.training.decisions[id], undefined);
  assert.equal(JSON.stringify(context.activeSession), before);
});
