import { SEED_EXERCISES } from '/app/js/seed.js';
import * as db from '/app/js/db.js';
import { acceptLegalConsent } from '/app/js/legal.js';

if (location.hostname !== '127.0.0.1' || location.port !== '8970') throw new Error('Capture fixture requires its isolated review origin');
const language = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'he';
const names = ['חימום-הליכה', 'לחיצת חזה', 'חתירה צרה לבטן', 'סקוואט', 'פלאנק', 'שחרור-הליכה'];
const exercises = names.map((name, index) => {
  const ex = SEED_EXERCISES.find((item) => item.name === name);
  if (!ex) throw new Error(`Missing real exercise: ${name}`);
  return { ...ex, id: ex.id || `store-demo-${index}`, images: [], active: true };
});
const settings = acceptLegalConsent({
  ...db.DEFAULT_SETTINGS, language, faceIdEnabled: false, voiceCommandsEnabled: false, voiceAnnouncements: false,
  onboardingComplete: true, seedSynced: true, exerciseDefaultsV3Applied: true,
  restOverrideV1Applied: true, newExercisesBatch1Applied: true, exerciseTextCleanupV1Applied: true,
  notesCleanupV1Applied: true, exerciseContentPatchV2: true,
}, { termsAccepted: true, privacyAcknowledged: true, healthDataConsent: true, adultConfirmed: true },
language, new Date('2026-11-09T08:00:00Z'));
const snapshot = { id: 'store-demo-plan', name: language === 'he' ? 'כוח לכל הגוף' : 'Full-body strength',
  day: 0, days: 1, goal: 'strength', dayLabel: 'A' };
const entries = (finished, week = 0) => exercises.map((ex, index) => ex.inputType === 'cardio'
  ? { exerciseId: ex.id, exerciseName: ex.name, type: 'cardio', durationSec: 300, plannedDurationSec: 300,
    ...(finished ? { actualDurationSec: 300, cardioDurationSource: 'timer' } : {}),
    elapsedSec: finished ? 300 : 0, completed: finished, startedAt: null, cardioActivity: 'walk',
    location: 'treadmill', speedKmh: 5.5, incline: 2, inclineUnit: 'percent', exerciseSnapshot: { ...ex } }
  : { exerciseId: ex.id, exerciseName: ex.name, exerciseSnapshot: { ...ex },
    sets: Array.from({ length: 3 }, (_, set) => ({
      weightKg: ex.inputType === 'hold' ? '' : [0, 20, 25, 30][index] + (week >= 2 ? 2 : 0),
      reps: ex.inputType === 'hold' ? 20 : 10 + (week % 2), completed: finished,
      ...(finished && set === 2 ? { difficulty: 'right' } : {}),
    })) });
const workouts = Array.from({ length: 9 }, (_, i) => ({
  id: `store-demo-workout-${i}`, dateISO: new Date(Date.UTC(2026, 9, 23 + i * 2, 15)).toISOString(),
  durationSec: 2280 + (i % 3) * 120, planSnapshot: snapshot, entries: entries(true, i),
}));
db.saveExercises(exercises);
db.saveSettings(settings);
db.saveProfile({ ...db.DEFAULT_PROFILE, gender: 'general', name: '', weightHistory: [] });
db.saveWorkouts(workouts);
db.saveActiveSession({ id: 'store-demo-session', programPinned: true, running: false, paused: false,
  startedAt: null, accumulatedSec: 0, planSnapshot: snapshot, entries: entries(false) });
location.replace(`/app/?previewSkip=1&tab=workout&storeCapture=${language}`);
