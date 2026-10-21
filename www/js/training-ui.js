import * as tools from './training-tools.js';
import { progressRecommendation } from './workout-insights.js';
import * as i18n from './i18n.js';

// Keep authored Hebrew in DOM templates so the shared translator can reverse a language switch.
const t = (value) => value;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const name = (exercise) => esc(i18n.exerciseName(exercise.name || exercise.exerciseName));
const button = (id, label, primary = false) => `<button type="button" id="${id}" class="btn btn-${primary ? 'primary' : 'secondary'} btn-small">${t(label)}</button>`;
const field = (label, content) => `<label class="training-field"><span>${t(label)}</span>${content}</label>`;
const options = (items, selected) => items.map(([value, label]) => `<option value="${esc(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${t(label)}</option>`).join('');
const note = (text) => `<p class="field-hint">${t(text)}</p>`;
const DURATION_ASSUMPTIONS = 'מוצג הממוצע של אומדן קצר וארוך, לא ממוצע של אימונים קודמים. כולל מנוחה מלאה אחרי כל סט, גם האחרון; 2–3 שניות לחזרה (לפחות 15–25 שניות עבודה לסט חזרות), 15–30 שניות הכנה ומעבר לתרגיל כוח או החזקה, ו-10–30 שניות הכנה לאירובי. זמני החזקה ואירובי לפי ההגדרה. בתרגילי צד מאומתים מחושבים שני הצדדים. כשאין יעד חזרות מספרי, מניחים 8–15 חזרות. זו אינה הנחיה למהר; המתנה לציוד והפסקות נוספות עשויות להאריך את האימון.';
const durationDetails = () => `<details class="field-hint"><summary>${t('על מה מבוסס האומדן?')}</summary><p>${t(DURATION_ASSUMPTIONS)}</p></details>`;
export function durationEstimateText(estimate) {
  const totalMinutes = Math.max(0, Math.round((estimate.lowSeconds + estimate.highSeconds) / 120));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourText = hours === 1 ? i18n.text('שעה') : hours === 2 ? i18n.text('שעתיים') : `${hours} ${i18n.text('שעות')}`;
  const minuteText = minutes === 1 ? i18n.text('דקה') : `${minutes} ${i18n.text('דקות')}`;
  return hours && minutes ? `${hourText}${i18n.text(minutes === 1 ? ' ו' : ' ו־')}${minuteText}`
    : hours ? hourText : minuteText;
}

export function refreshDurationEstimates(api, doc = document) {
  const state = api.durationState();
  const write = (id, text) => {
    const node = doc.getElementById(id);
    if (node && node.textContent !== text) node.textContent = text;
  };
  const total = tools.estimateWorkoutDuration(state.session, state.exercises, state.settings.restSeconds, { remaining: false });
  const remaining = tools.estimateWorkoutDuration(state.session, state.exercises, state.settings.restSeconds,
    { remaining: true, restSeconds: state.restSeconds });
  const program = tools.estimateWorkoutDuration(state.program, [], state.settings.restSeconds, { remaining: false });
  write('trainingDurationTotal', `${i18n.text('זמן האימון המשוער')}: ${durationEstimateText(total)}`);
  const begun = state.session.running || state.session.paused || state.session.accumulatedSec > 0 || state.session.entries.some((entry) =>
    entry.type === 'cardio' ? entry.completed || entry.startedAt || entry.elapsedSec > 0
      : entry.sets.some((set) => set.completed || set.holdStartedAt));
  write('trainingDurationRemaining', begun ? `${i18n.text('זמן משוער שנותר מעכשיו')}: ${durationEstimateText(remaining)}` : '');
  write('trainingProgramDuration', `${i18n.text('זמן משוער לאימון שלי')}: ${durationEstimateText(program)}`);
  return { total, remaining, program };
}
const PLAN_GOALS = [['strength', 'כוח'], ['muscle', 'בניית שריר'], ['fitness', 'כושר כללי / ניהול משקל'], ['walk', 'מתחילים ללכת'], ['run', 'מתחילים לרוץ']];
const REASONS = {
  cardio: 'אירובי נמדד בזמן ובקצב; אין כאן המלצה לשינוי משקל.',
  hold: 'החזקות נמדדות בשניות; אין להסיק התקדמות ממשקל וחזרות.',
  history: 'נדרשים לפחות שני אימונים עם וריאציה מוגדרת ומדידה תואמת.',
  variation: 'הווריאציה, סוג המדידה, מספר הסטים או המדידות אינם תואמים להשוואה בטוחה.',
  hard: 'תועד דירוג קשה. שמור על העומס ואל תמהר להעלות.',
  assistance: 'בגרביטון יותר משקל הוא יותר סיוע. אין כאן המלצה להפוך את כיוון העומס.',
  target: 'לא תועד אותו יעד חזרות מפורש בשני האימונים. הגדר יעד להמשך, בלי לשנות היסטוריה.',
  rating: 'חסר דירוג קל או מתאים בחלק מהסטים. אין מספיק מידע להצעת העלאה.',
  reps: 'בחלק מהסטים טרם הושג היעד. התמקד בחזרות נשלטות באותו עומס.',
  mixed: 'העומסים או החזרות משתנים. שמור על ההגדרות עד שתצטבר השוואה תואמת.',
  load: 'משקל גוף או מתח גומייה אינם עומס ציוד מתועד בר השוואה בקילוגרמים. אין כאן הצעה להעלאת משקל.',
  top: 'בשני אימונים תואמים הושג היעד בכל הסטים באותו משקל, עם דירוג קל או מתאים.',
};
const RECOMMENDATIONS = { insufficient: 'אין מספיק מידע', hold: 'שמירה על העומס', reps: 'התמקדות בחזרות', increase: 'אפשר לשקול העלאה קטנה' };
const MOVEMENTS = { squat: 'סקוואט', lunge: 'מכרע', hinge: 'תנועת ירך',
  'horizontal-push': 'דחיפה אופקית', 'horizontal-pull': 'משיכה אופקית', 'vertical-push': 'דחיפה מעל הראש',
  'hip-extension': 'פשיטת ירך', 'core-control': 'שליטה בגו', 'elbow-flexion': 'כפיפת מרפקים' };
const ACTION_ERRORS = {
  'Choose an outdoor or gym location for jogging': 'לריצה בחר מיקום בחוץ או חדר כושר. להליכה בבית אפשר לבחור הליכה במקום.',
  'Choose distinct exercises in each session': 'בחר תרגילים שונים בכל אימון כדי לשמור על זהות נפרדת.',
  'Remove a saved plan before saving another': 'כבר נשמרו שמונה תוכניות. מחק תוכנית חלופית לפני הוספת תוכנית חדשה.',
  'Remove a saved plan before activating another': 'כבר נשמרו שמונה תוכניות. מחק תוכנית חלופית לפני הוספת תוכנית חדשה.',
  'Pause counting or the active hold before changing workout structure': 'עצור ספירה קולית או החזקה פעילה לפני שינוי מבנה האימון. הנתונים לא יימחקו.',
  'Refresh the proposal after changing the time': 'הזמן השתנה. הצג הצעה חדשה לפני אישור.',
  'Keep at least one exercise per original main muscle group': 'יש להשאיר לפחות תרגיל אחד לכל קבוצת שריר עיקרית שהייתה באימון.',
  'Cannot defer an exercise without verified muscle mapping': 'תרגיל ללא מיפוי שריר מאומת נשמר בבחירה כדי לא להחסיר עבודה חשובה.',
  'Keep the walking and running sequence together': 'רצף ההליכה והריצה נשמר יחד. אפשר לבחור תקציב ארוך יותר בלי לשנות את המינון.',
  'No suitable exercises for every selected muscle group': 'אין תרגיל מאומת לכל קבוצת שריר שנבחרה עם הציוד, המיקום ורמת הניסיון האלה. שנה את הציוד או את בחירת השרירים; לא נוצרה תוכנית חלקית.',
  'Keep every selected muscle group in the plan': 'יש לשמור תרגיל עיקרי לכל קבוצת שריר שנבחרה, בלי להוסיף קבוצות אחרות.',
  'No suitable exercises for these preferences': 'אין מספיק תרגילים מאומתים לשילוב הזה. שנה מיקום או ציוד; לא נוספו תרגילים מומצאים.',
};

export function createTrainingUI(api) {
  const home = document.createElement('section');
  home.className = 'card training-hub';
  home.innerHTML = `<h2>${t('כלים לאימון שלך')}</h2>${note('הצעות מקומיות בלבד. התוכנית וההיסטוריה נשארות שלך.')}
    <div class="training-actions">${button('btnPersonalPlan', 'בניית תוכנית אישית')}${button('btnSavedPlans', 'תוכניות שמורות')}
    ${button('btnProgressAdvice', 'יעדים אישיים והמלצות')}${button('btnWeeklyWork', 'עבודת שרירים השבוע')}${button('btnMonthlyGoal', 'יעד חודשי אישי')}</div>
    <p id="trainingPlanStatus" class="field-hint" data-no-translate></p><p id="monthlyGoalStatus" data-no-translate></p>`;
  document.querySelector('.home-workout-hero').after(home);
  const controls = document.createElement('div');
  controls.className = 'training-workout-tools';
  controls.innerHTML = `<section class="training-duration"><strong id="trainingDurationTotal" data-no-translate></strong>
    <p id="trainingDurationRemaining" data-no-translate></p>${note('אומדן ממוצע בלבד, לא זמן סיום מובטח.')}${durationDetails()}</section>
    <div class="training-actions">${button('btnTimeBudget', 'יש לי 30 דקות')}${button('btnTimeBudget60', 'יש לי 60 דקות')}${button('btnTimeBudget90', 'יש לי 90 דקות')}${button('btnFullWorkout', 'תוכנית מלאה')}${button('btnWorkoutAdvice', 'יעדים אישיים והמלצות')}</div>
    <p id="trainingSessionStatus" class="field-hint" data-no-translate></p>
    <div class="workout-focus" role="status" aria-live="polite" data-no-translate><strong id="trainingCurrent"></strong><span id="trainingTarget"></span><span id="trainingListening"></span></div>`;
  document.querySelector('.workout-header').appendChild(controls);
  const programDuration = document.createElement('section');
  programDuration.className = 'card training-duration';
  programDuration.innerHTML = `<strong id="trainingProgramDuration" data-no-translate></strong>
    ${note('לפי בחירת התרגילים, הסטים ושבוע התוכנית. אימון פעיל או מותאם עשוי להיות שונה.')}${durationDetails()}
    <div class="training-actions">${button('btnExercisePersonalPlan', 'בניית תוכנית אישית')}${button('btnExerciseSavedPlans', 'תוכניות שמורות')}</div>`;
  document.getElementById('exerciseCategoryGrid').before(programDuration);
  const on = (id, handler) => document.getElementById(id).addEventListener('click', handler);
  on('btnPersonalPlan', () => planBuilder());
  on('btnSavedPlans', savedPlans);
  on('btnExercisePersonalPlan', () => planBuilder());
  on('btnExerciseSavedPlans', savedPlans);
  on('btnProgressAdvice', recommendations);
  on('btnWorkoutAdvice', recommendations);
  on('btnWeeklyWork', weeklyWork);
  on('btnMonthlyGoal', monthlyGoal);
  on('btnTimeBudget', () => timeBudget(30));
  on('btnTimeBudget60', () => timeBudget(60));
  on('btnTimeBudget90', () => timeBudget(90));
  on('btnFullWorkout', () => {
    if (!api.getState().session.timeBudget) return;
    const dialog = api.dialog(t('שחזור האימון המלא'), `${note('השחזור מחזיר את התרגילים שנדחו ושומר כל ביצוע חדש. התוכנית הקבועה לא השתנתה.')}
      ${button('btnRestoreTime', 'שחזור האימון המלא', true)}`);
    document.getElementById('btnRestoreTime').onclick = () => changedSession(dialog, tools.restoreTimeBudget);
  });

  function safely(dialog, action) {
    try { return action(); }
    catch (error) {
      console.error('Training action failed', error);
      const message = dialog.querySelector('.training-action-error') || document.createElement('p');
      message.className = 'training-action-error';
      message.setAttribute('role', 'alert');
      message.textContent = t(ACTION_ERRORS[error.message] || (error instanceof RangeError ? 'בדוק את הטווחים והבחירה ונסה שוב.' : 'לא ניתן לבצע את השינוי. הנתונים נשמרו; בדוק את הבחירה או את האחסון ונסה שוב.'));
      dialog.querySelector('.training-dialog-body').prepend(message);
      return null;
    }
  }
  function changedSession(dialog, transform) {
    return safely(dialog, () => {
      if (api.getState().busy) throw new Error('Pause counting or the active hold before changing workout structure');
      api.saveSession(transform(api.getState().session));
      dialog.close();
      refresh();
      return true;
    });
  }
  function trainingSettings() { return api.getState().settings.training || {}; }
  function saveTraining(patch) {
    api.saveSettings({ ...api.getState().settings, training: { ...trainingSettings(), ...patch } });
    refresh();
  }
  function sessionNotice(dialog) {
    if (api.getState().busy) dialog.querySelector('.training-dialog-body').prepend(Object.assign(document.createElement('p'), {
      className: 'field-hint', textContent: t('עצור ספירה קולית או החזקה פעילה לפני שינוי מבנה האימון. הנתונים לא יימחקו.'),
    }));
  }

  function timeBudget(minutes = 30) {
    const { session, exercises, settings } = api.getState();
    if (session.substitutions?.length) {
      api.dialog(t('בחירת עדיפויות לאימון הנוכחי'), note('שחזר קודם את החלפת הציוד כדי לבנות בחירת זמן חדשה. הנתונים לא יימחקו.'));
      return;
    }
    const dialog = api.dialog(t('בחירת עדיפויות לאימון הנוכחי'), `<div class="training-actions">${[30, 60, 90].map((value) =>
      `<button type="button" class="btn btn-secondary btn-small" data-budget-preset="${value}">${value} <span>${t('דקות')}</span></button>`).join('')}</div>
      ${field('דקות זמינות מעכשיו', `<input id="budgetMinutes" class="input" type="number" min="10" max="180" value="${minutes}">`)}
      ${note('אומדן גס הכולל עבודה, הכנה ומנוחות מלאות. זה אינו זמן סיום מובטח. תרגילים עם נתונים או התרגיל הנוכחי מוגנים.')}
      ${durationDetails()}${button('btnEstimateBudget', 'הצג הצעה')}<div id="budgetProposal"></div>`);
    function propose() {
      safely(dialog, () => {
        const state = api.getState();
        const proposal = tools.timeBudgetProposal(state.session, state.exercises, Number(document.getElementById('budgetMinutes').value), settings.restSeconds, state.restSeconds);
        const body = document.getElementById('budgetProposal');
        body.innerHTML = `${note('לפחות תרגיל אחד לכל קבוצת שריר עיקרית שכבר הייתה באימון. תרגילי עזר כפולים נדחים קודם; אין קיצור מנוחות או הוספת שרירים שלא היו בתוכנית.')}
          <p><span>${t('כיסוי עיקרי שנשמר')}</span>: ${proposal.groups.map((group) => `<span>${t(group)}</span>`).join(' · ') || '—'}</p>
          ${proposal.infeasible ? `<p role="alert">${t('הכיסוי הנדרש והנתונים המוגנים חורגים מאומדן התקציב. לא הוסתרו נתונים ולא קוצרו מנוחות; אפשר לשמור את הבחירה הארוכה יותר או לבחור זמן נוסף.')}
            <strong data-no-translate>${durationEstimateText(proposal.minimum)}</strong></p>` : ''}
          <div class="training-checklist">${proposal.rows.map((row) => `<label>
          <input type="checkbox" value="${esc(row.entry.exerciseId)}" ${row.selected ? 'checked' : ''} ${row.protected || row.required ? 'disabled' : ''}>
          <span data-no-translate>${name(row.entry)}</span><span>${row.protected ? t('מוגן') : row.required ? t(row.entry.type === 'cardio' ? 'רצף האירובי נשמר' : 'נדרש לכיסוי שריר עיקרי') : row.priority === 1 ? t('תנועה מורכבת') : t('לפי סדר התוכנית')}</span>
          <small data-seconds="${row.seconds}" data-low="${row.lowSeconds}" data-high="${row.highSeconds}" data-no-translate>${durationEstimateText(row)}</small></label>`).join('')}</div>
          <p id="budgetTotal"></p>${note('תרגילים שלא נבחרו יידחו רק באימון הזה. אפשר לשחזר בכל עת; המנוחות אינן מתקצרות.')}
          ${button('btnConfirmBudget', 'אישור הבחירה לאימון הזה', true)}`;
        const update = () => {
          const estimate = [...body.querySelectorAll('input:checked')].reduce((total, input) => {
            const data = input.closest('label').querySelector('small').dataset;
            return { lowSeconds: total.lowSeconds + Number(data.low), highSeconds: total.highSeconds + Number(data.high) };
          }, { lowSeconds: proposal.restSeconds, highSeconds: proposal.restSeconds });
          document.getElementById('budgetTotal').innerHTML = `<span>${t('אומדן להמשך')}</span>: <span data-no-translate>${durationEstimateText(estimate)}</span>${estimate.highSeconds > proposal.minutes * 60 ? ` · <span>${t('האומדן עשוי לעבור את התקציב')}</span>` : ''}`;
        };
        body.querySelectorAll('input').forEach((input) => input.addEventListener('change', update));
        update();
        document.getElementById('btnConfirmBudget').onclick = () => changedSession(dialog, (latest) => {
          if (Number(document.getElementById('budgetMinutes').value) !== proposal.minutes) throw new Error('Refresh the proposal after changing the time');
          return tools.applyTimeBudget(latest, [...body.querySelectorAll('input:checked')].map((input) => input.value), proposal.minutes, api.getState().exercises);
        });
      });
    }
    document.getElementById('btnEstimateBudget').onclick = propose;
    dialog.querySelectorAll('[data-budget-preset]').forEach((button) => button.onclick = () => {
      document.getElementById('budgetMinutes').value = button.dataset.budgetPreset;
      propose();
    });
    propose();
    sessionNotice(dialog);
  }

  function equipmentBusy(exerciseId) {
    const state = api.getState();
    const entry = state.session.entries.find((entry) => entry.exerciseId === exerciseId);
    const exercise = entry.exerciseSnapshot || state.exercises.find((exercise) => exercise.id === exerciseId);
    const choices = tools.alternatives(exercise, state.exercises).filter((choice) => !state.session.entries.some((entry) => entry.exerciseId === choice.id));
    const dialog = api.dialog(t('המכשיר תפוס'), `<p data-no-translate>${name(exercise)}</p>
      ${note('החלפה לתנועה ולאזור עבודה תואמים עם ציוד שונה, לא הבטחה לשקילות. בחר עומס חדש; המשקל אינו מועתק.')}
      ${choices.length ? field('בחר חלופה', `<select id="swapChoice" class="select" data-no-translate>${choices.map((choice) => `<option value="${esc(choice.id)}">${name(choice)}</option>`).join('')}</select>`)
        : note('אין חלופה מאומתת לווריאציה הזו. אפשר להמתין או לעיין בספרייה; שריר משותף לבדו אינו בסיס להחלפה בטוחה.')}
      <div class="training-actions">${choices.length ? button('btnSwapGuide', 'הדרכה') + button('btnConfirmSwap', 'החלפה באימון הזה בלבד', true) : ''}</div>
      ${note('סטים שהושלמו נשארים בתרגיל המקורי. שאר הנתונים נשמרים לשחזור. אין שינוי בתוכנית הקבועה.')}`);
    if (choices.length) {
      document.getElementById('btnSwapGuide').onclick = () => api.guide(choices.find((choice) => choice.id === document.getElementById('swapChoice').value));
      document.getElementById('btnConfirmSwap').onclick = () => changedSession(dialog, (session) =>
        tools.swapExercise(session, exerciseId, choices.find((choice) => choice.id === document.getElementById('swapChoice').value), api.getState().exercises));
    }
    sessionNotice(dialog);
  }

  function recommendations() {
    const state = api.getState();
    const chosen = state.exercises.filter((exercise) => exercise.active !== false);
    const records = chosen.map((exercise) => ({ exercise, advice: progressRecommendation(exercise, state.history) }));
    const dialog = api.dialog(t('יעדים אישיים והמלצות'), `${note('לא הוראה רפואית ולא שינוי אוטומטי. נפח אינו כוח. שינוי עומס דורש בחירה ואישור שלך לאימונים הבאים.')}
      ${records.map(({ exercise, advice }, index) => `<section class="training-advice">
        <h4 data-no-translate>${name(exercise)}</h4><strong>${t(RECOMMENDATIONS[advice.kind])}</strong><p>${t(REASONS[advice.reason])}</p>
        ${advice.evidence.map(({ dateISO, entry }) => `<p class="field-hint" data-no-translate>${esc(new Date(dateISO).toLocaleDateString(i18n.locale()))}: ${entry.type === 'cardio' ? `${Math.round(entry.durationSec / 60)} ${i18n.text('דקות')}` : (entry.sets || []).map((set) =>
          `${esc(set.weightKg)} ${i18n.text('ק"ג')} × ${esc(set.reps)} ${i18n.text(entry.inputType === 'hold' ? 'שניות' : 'חזרות')}${set.difficulty ? ` (${i18n.text({ easy: 'קל', right: 'מתאים', hard: 'קשה' }[set.difficulty] || '')})` : ''}`).join(' · ')}</p>`).join('')}
        ${exercise.inputType !== 'cardio' && exercise.inputType !== 'hold' ? `<div class="training-inline">${field('יעד חזרות עליון להמשך', `<input class="input advice-target" type="number" min="1" max="100" value="${Number(exercise.targetReps) || ''}">`)}
          <button class="btn btn-secondary btn-small" data-target="${index}">${t('שמירת יעד מפורש')}</button></div>` : ''}
        ${advice.kind === 'increase' ? field('משקל שבחרת לאימון הבא (ק"ג)', '<input class="input advice-load" type="number" min="0" step="0.1" placeholder="—">') +
          note('בחר בעצמך צעד קטן הזמין בציוד שלך. אין תוספת קבועה המתאימה לכל מכשיר. השאר ריק כדי לשמור כוונה בלבד.') : ''}
        ${exercise.targetWeightKg != null ? `<p><span>${t('יעד משקל עתידי שנבחר')}</span>: ${Number(exercise.targetWeightKg)} <span>${t('ק"ג')}</span></p>
          <button class="btn btn-secondary btn-small" data-clear-load="${index}">${t('ביטול יעד המשקל העתידי')}</button>` : ''}
        <div class="training-actions"><button class="btn btn-secondary btn-small" data-advice="${index}" data-decision="accept">${t('אישור ושמירת הכוונה')}</button>
        <button class="btn btn-secondary btn-small" data-advice="${index}" data-decision="keep">${t('להשאיר כמו עכשיו / דחייה')}</button></div>
        <p class="advice-decision field-hint" data-no-translate>${trainingSettings().decisions?.[exercise.id] ? i18n.text(trainingSettings().decisions[exercise.id].targetWeightKg !== undefined
          ? 'העומס שבחרת נשמר לאימונים הבאים בלבד. האימון הנוכחי לא השתנה.'
          : trainingSettings().decisions[exercise.id].decision === 'accept' ? 'הכוונה נשמרה. העומס בתוכנית לא השתנה.' : 'נשמר: ללא שינוי בתוכנית.') : ''}</p></section>`).join('')}`);
    dialog.querySelectorAll('[data-clear-load]').forEach((btn) => btn.onclick = () => safely(dialog, () => {
      api.clearLoadTarget(records[Number(btn.dataset.clearLoad)].exercise.id);
      dialog.close();
      recommendations();
    }));
    dialog.querySelectorAll('[data-target]').forEach((btn) => btn.onclick = () => safely(dialog, () => {
      const target = Number(btn.closest('section').querySelector('.advice-target').value);
      if (!Number.isInteger(target) || target < 1 || target > 100) throw new RangeError('Target must be 1–100 reps');
      api.saveTarget(records[Number(btn.dataset.target)].exercise.id, target);
      dialog.close();
      recommendations();
    }));
    dialog.querySelectorAll('[data-advice]').forEach((btn) => btn.onclick = () => safely(dialog, () => {
      const { exercise, advice } = records[Number(btn.dataset.advice)];
      const input = btn.closest('section').querySelector('.advice-load');
      const load = btn.dataset.decision === 'accept' && input?.value !== '' && input ? Number(input.value) : undefined;
      if (load !== undefined && (!Number.isFinite(load) || load <= advice.weightKg || load > 1000)) throw new RangeError('Choose a valid available increment above the recorded load');
      api.acceptAdvice(exercise.id, { decision: btn.dataset.decision,
        kind: advice.kind, evidenceDates: advice.evidence.map((row) => row.dateISO), savedAt: new Date().toISOString(),
        ...(load !== undefined ? { targetWeightKg: load } : {}) }, load);
      btn.closest('section').querySelector('.advice-decision').textContent = i18n.text(load !== undefined
        ? 'העומס שבחרת נשמר לאימונים הבאים בלבד. האימון הנוכחי לא השתנה.'
        : btn.dataset.decision === 'accept' ? 'הכוונה נשמרה. העומס בתוכנית לא השתנה.' : 'נשמר: ללא שינוי בתוכנית.');
    }));
  }

  function planBuilder() {
    const dialog = api.dialog(t('בניית תוכנית אישית'), `<form id="personalPlanForm" class="training-form">
      ${field('המטרה', `<select name="goal" class="select">${options(PLAN_GOALS, 'fitness')}</select>`)}
      ${field('ניסיון', `<select name="experience" class="select">${options([['beginner', 'מתחילים'], ['regular', 'בעלי ניסיון']], 'beginner')}</select>`)}
      ${field('מספר אימונים בתוכנית', `<select name="days" class="select">${options([[1, 'אימון יחיד'], [2, '2'], [3, '3'], [4, '4']], 1)}</select>`)}
      ${field('דקות לאימון', `<select name="minutes" class="select">${options([[20, '20'], [30, '30'], [45, '45'], [60, '60'], [90, '90']], 30)}</select>`)}
      <fieldset id="planMuscles"><legend>${t('קבוצות שרירים לאימון')}</legend>
        ${note('אפשר לבחור קבוצה אחת או כמה. ללא בחירה תיבנה התוכנית הכללית הרגילה. הבחירה מיועדת לאימוני כוח, לא להליכה או ריצה.')}
        <div class="training-equipment">${tools.PLAN_MUSCLES.map((muscle) =>
          `<label><input type="checkbox" name="muscles" value="${esc(muscle)}">${t(muscle)}</label>`).join('')}</div></fieldset>
      ${field('מיקום', `<select name="location" class="select">${options([['home', 'בבית'], ['gym', 'חדר כושר'], ['outside', 'בחוץ']], 'home')}</select>`)}
      <fieldset><legend>${t('ציוד זמין בפועל')}</legend><div class="training-equipment">${['משקולות יד', 'גומייה', 'ספסל', 'מכונה'].map((item) =>
        `<label><input type="checkbox" name="equipment" value="${esc(item)}">${t(item)}</label>`).join('')}</div></fieldset>
      ${note('תוכנית כללים מקומית, ללא AI בתשלום. אין הבטחת ירידה נקודתית בשומן. התאם יכולת והפסק פעילות הגורמת לכאב.')}
      <button class="btn btn-primary" type="submit">${t('יצירת הצעה לבדיקה')}</button></form>`);
    const form = document.getElementById('personalPlanForm');
    form.elements.goal.addEventListener('change', () => {
      document.getElementById('planMuscles').disabled = ['walk', 'run'].includes(form.elements.goal.value);
    });
    document.getElementById('personalPlanForm').onsubmit = (event) => {
      event.preventDefault();
      safely(dialog, () => {
        const data = new FormData(event.target);
        const plan = tools.generatePlan({ goal: data.get('goal'), experience: data.get('experience'), days: Number(data.get('days')),
          minutes: Number(data.get('minutes')), location: data.get('location'), equipment: data.getAll('equipment'),
          muscles: data.getAll('muscles') }, api.getState().exercises);
        plan.id = api.uid();
        dialog.close();
        planPreview(plan);
      });
    };
  }

  function planPreview(original, saved = false) {
    const plan = JSON.parse(JSON.stringify(original));
    const available = tools.planCatalog(api.getState().exercises, plan.options.equipment, plan.options.location);
    const dialog = api.dialog(t('תוכנית מוצעת — בדיקה ועריכה'), `<p><span>${t(PLAN_GOALS.find(([key]) => key === plan.options.goal)?.[1] || '')}</span>
      · ${plan.options.days} <span>${t('אימונים בתוכנית')}</span> · ${plan.options.minutes} <span>${t('דקות לאימון')}</span></p>
      ${plan.options.muscles?.length ? `<p><span>${t('קבוצות שנבחרו')}</span>: ${plan.options.muscles.map((muscle) => `<span>${esc(t(muscle))}</span>`).join(' · ')}</p>
        ${note('לפחות תרגיל עיקרי אחד לכל קבוצה שנבחרה. שרירים משניים עשויים להשתתף, אך אינם מחליפים כיסוי עיקרי. לא ממלאים זמן בתרגילים מיותרים.')}` : ''}
      <p><span>${t('מיקום')}</span>: <span>${t({ home: 'בבית', gym: 'חדר כושר', outside: 'בחוץ' }[plan.options.location])}</span>
        · <span>${t('ציוד')}</span>: ${(plan.options.equipment.length ? plan.options.equipment : ['ללא ציוד']).map((item) => `<span>${t(item)}</span>`).join(' · ')}</p>
      ${note('השאר ימים קלים או מנוחה בין אימונים לפי התחושה. זמני התוכנית הם אומדן; אין חובה לסיים בזמן.')}${durationDetails()}
      ${plan.options.goal === 'run' ? note('התחלה עדינה: הליכה נוחה ואחריה ריצה קצרה, ובסיום הליכה נוספת לפי הצורך. חזור על אותו מינון; רק כשהוא נוח בכמה אימונים שקול עוד דקה, לא העלאת קצב וזמן יחד.') : ''}
      ${plan.omitted.length ? note('חלק מדפוסי התנועה לא נכללו בגלל הציוד, הניסיון או הזמן. ההצעה אינה מבטיחה כיסוי מלא לכל הגוף.') +
        `<p><span>${t('לא נכללו')}</span>: ${plan.omitted.map((movement) => `<span>${t(MOVEMENTS[movement] || movement)}</span>`).join(' · ')}</p>` : ''}
      ${plan.sessions.map((session, index) => `<section class="training-plan-day" data-day="${index}"><h4><span>${t('אימון')}</span> ${index + 1}</h4>
        ${session.exercises.map((exercise, row) => `<div class="training-plan-row" data-row="${row}">
          <label><span class="sr-only">${t('בחירת תרגיל')}</span><select class="select plan-exercise" data-no-translate>${available.filter((candidate) => candidate.inputType === exercise.inputType)
            .filter((candidate) => !plan.options.muscles?.length || tools.trainingMetadata(candidate)?.primary === tools.trainingMetadata(exercise)?.primary).map((candidate) =>
            `<option value="${esc(candidate.id)}" ${candidate.id === exercise.id ? 'selected' : ''}>${name(candidate)}</option>`).join('')}</select></label>
          ${exercise.inputType === 'cardio' ? field('דקות', `<input class="input plan-duration" type="number" min="1" max="60" value="${exercise.durationMinutes}">`) :
            field('סטים', `<input class="input plan-sets" type="number" min="1" max="5" value="${exercise.defaultSets}">`) +
            field('יעד חזרות', `<input class="input plan-reps" type="number" min="1" max="30" value="${exercise.targetReps}">`)}
          <button class="btn btn-secondary btn-small plan-guide" type="button">${t('הדרכה')}</button></div>`).join('')}
        ${session.exercises.some((exercise) => exercise.inputType !== 'cardio') ? `<p class="field-hint"><span>${t('מנוחה בין סטים')}</span>: ${session.exercises.find((exercise) => exercise.inputType !== 'cardio').restSeconds} <span>${t('שניות')}</span></p>` : ''}
        <p class="field-hint"><span>${t('אומדן עם מנוחות והכנה')}</span>: <strong class="plan-estimate" data-no-translate></strong></p>
        <p class="field-hint plan-budget-warning" role="status" data-no-translate></p>
        <button class="btn btn-primary btn-small" data-activate="${index}">${t('בדיקה והפעלת האימון הזה')}</button></section>`).join('')}
      ${note('כל אימון מופעל במפורש. נשמר גיבוי של הבחירה הקודמת לשחזור; אין החלפה של תוכנית ללא אישור.')}
      ${button('btnSaveAlternatePlan', saved ? 'שמירת עריכות בתוכנית החלופית' : 'שמירה כתוכנית חלופית', true)}`);
    function updateEstimates() {
      dialog.querySelectorAll('[data-day]').forEach((section) => {
        const edited = [];
        let valid = true;
        section.querySelectorAll('[data-row]').forEach((row) => {
          const exercise = available.find((item) => item.id === row.querySelector('select').value);
          const original = plan.sessions[Number(section.dataset.day)].exercises[Number(row.dataset.row)];
          if (exercise.inputType === 'cardio') {
            const minutes = Number(row.querySelector('.plan-duration').value);
            valid = valid && minutes > 0;
            edited.push({ ...exercise, active: true, durationMinutes: minutes });
          } else {
            const sets = Number(row.querySelector('.plan-sets').value);
            const reps = Number(row.querySelector('.plan-reps').value);
            valid = valid && Number.isInteger(sets) && sets > 0 && sets <= 5 && reps > 0;
            if (valid) edited.push({ ...exercise, active: true, defaultSets: sets, targetReps: reps, restSeconds: original.restSeconds });
          }
        });
        const estimate = tools.estimateWorkoutDuration(tools.durationSession(edited), [], api.durationState().settings.restSeconds, { remaining: false });
        section.querySelector('.plan-estimate').textContent = valid
          ? `${durationEstimateText(estimate)}${estimate.highSeconds > plan.options.minutes * 60 ? ` · ${i18n.text('האומדן עשוי לעבור את התקציב')}` : ''}` : '—';
        section.querySelector('.plan-budget-warning').textContent = valid && plan.options.muscles?.length
          && (estimate.lowSeconds + estimate.highSeconds) / 2 > plan.options.minutes * 60
          ? i18n.text('כדי לשמור על כל קבוצות השרירים שנבחרו, ההצעה ארוכה מהזמן שבחרת. אפשר לבחור זמן נוסף או פחות קבוצות; הסטים והמנוחות לא קוצרו.') : '';
      });
    }
    dialog.querySelectorAll('.training-plan-row input, .training-plan-row select').forEach((input) =>
      ['input', 'change'].forEach((event) => input.addEventListener(event, updateEstimates)));
    updateEstimates();
    function readEdits() {
      dialog.querySelectorAll('[data-day]').forEach((section) => {
        const day = plan.sessions[Number(section.dataset.day)];
        section.querySelectorAll('[data-row]').forEach((row) => {
          const index = Number(row.dataset.row);
          const existing = day.exercises[index];
          const selected = available.find((exercise) => exercise.id === row.querySelector('select').value);
          if (!selected) throw new Error('Exercise unavailable');
          day.exercises[index] = { ...tools.planExercise(selected), restSeconds: existing.restSeconds,
            defaultSets: existing.defaultSets, defaultReps: existing.defaultReps, targetReps: existing.targetReps };
          const next = day.exercises[index];
          if (next.inputType === 'cardio') {
            const duration = Number(row.querySelector('.plan-duration').value);
            if (!Number.isInteger(duration) || duration < 1 || duration > 60) throw new RangeError('Invalid duration');
            next.durationMinutes = duration;
            next.location = existing.location || (plan.options.location === 'gym' ? 'treadmill' : plan.options.location);
          } else {
            const sets = Number(row.querySelector('.plan-sets').value);
            const reps = Number(row.querySelector('.plan-reps').value);
            if (!Number.isInteger(sets) || sets < 1 || sets > 5 || !Number.isInteger(reps) || reps < 1 || reps > 30) throw new RangeError('Invalid sets or reps');
            Object.assign(next, { defaultSets: sets, defaultReps: String(reps), targetReps: reps });
          }
        });
        if (new Set(day.exercises.map((exercise) => exercise.id)).size !== day.exercises.length) throw new Error('Choose distinct exercises in each session');
        if (plan.options.muscles?.length && (plan.options.muscles.some((muscle) =>
          !day.exercises.some((exercise) => tools.trainingMetadata(exercise)?.primary === muscle))
          || day.exercises.some((exercise) => !plan.options.muscles.includes(tools.trainingMetadata(exercise)?.primary)))) {
          throw new Error('Keep every selected muscle group in the plan');
        }
      });
      return plan;
    }
    dialog.querySelectorAll('.plan-guide').forEach((btn) => btn.onclick = () =>
      api.guide(available.find((exercise) => exercise.id === btn.closest('[data-row]').querySelector('select').value)));
    document.getElementById('btnSaveAlternatePlan').onclick = () => safely(dialog, () => {
      readEdits();
      const existing = trainingSettings().plans || [];
      if (existing.length >= 8 && !existing.some((item) => item.id === plan.id)) throw new Error('Remove a saved plan before saving another');
      saveTraining({ plans: [...existing.filter((item) => item.id !== plan.id), plan] });
      dialog.close();
      savedPlans();
    });
    dialog.querySelectorAll('[data-activate]').forEach((btn) => btn.onclick = () => safely(dialog, () => {
      readEdits();
      const day = Number(btn.dataset.activate);
      const confirmation = api.dialog(t('אישור שינוי האימון שלי'), `<p>${t('רק הבחירה והיעדים של האימון שלי ישתנו. הספרייה וההיסטוריה לא יימחקו. אימון עם נתונים או אימון פעיל יישאר כפי שהוא; הבחירה החדשה תחול באימון הבא.')}</p>
        <ul data-no-translate>${plan.sessions[day].exercises.map((exercise) => `<li>${name(exercise)}</li>`).join('')}</ul>
        ${button('btnActivateReviewedPlan', 'אישור הפעלה', true)}`);
      document.getElementById('btnActivateReviewedPlan').onclick = () => safely(confirmation, () => {
        api.activatePlan(plan, day);
        confirmation.close();
        dialog.close();
        refresh();
      });
    }));
  }

  function savedPlans() {
    const plans = trainingSettings().plans || [];
    const dialog = api.dialog(t('תוכניות שמורות'), `${plans.length ? plans.map((plan, index) => `<section class="training-advice"><strong><span>${t(PLAN_GOALS.find(([key]) => key === plan.options.goal)?.[1] || '')}</span>
      · ${plan.options.days} <span>${t('אימונים בתוכנית')}</span> · ${plan.options.minutes} <span>${t('דקות לאימון')}</span></strong>
      ${plan.options.muscles?.length ? `<p>${plan.options.muscles.map((muscle) => `<span>${esc(t(muscle))}</span>`).join(' · ')}</p>` : ''}
      <div class="training-actions"><button class="btn btn-secondary btn-small" data-preview="${index}">${t('בדיקה ועריכה')}</button>
      <button class="btn btn-secondary btn-small" data-delete-plan="${index}">${t('מחיקת התוכנית החלופית')}</button></div></section>`).join('') : note('עדיין אין תוכניות חלופיות שמורות.')}
      ${note('לשמירת תוכנית, פתח בניית תוכנית אישית, צור הצעה ולחץ בתחתית ההצעה על שמירה כתוכנית חלופית. שמירה אינה הפעלה.')}
      ${button('btnCreateSavedPlan', 'יצירת תוכנית חדשה')}
      ${note('עד שמונה תוכניות חלופיות במכשיר. מחיקה כאן לא משנה אימון פעיל או את האימון שלי.')}
      ${trainingSettings().programBackup ? button('btnRestoreProgram', 'שחזור הבחירה שלפני התוכנית', true) : ''}`);
    document.getElementById('btnCreateSavedPlan').onclick = () => { dialog.close(); planBuilder(); };
    dialog.querySelectorAll('[data-preview]').forEach((btn) => btn.onclick = () => { dialog.close(); planPreview(plans[Number(btn.dataset.preview)], true); });
    dialog.querySelectorAll('[data-delete-plan]').forEach((btn) => btn.onclick = () => safely(dialog, () => {
      saveTraining({ plans: plans.filter((_, index) => index !== Number(btn.dataset.deletePlan)) });
      dialog.close();
      savedPlans();
    }));
    const restore = document.getElementById('btnRestoreProgram');
    if (restore) restore.onclick = () => {
      const confirm = api.dialog(t('שחזור הבחירה הקודמת'), `${note('הבחירה והיעדים הקודמים יחזרו. שמות אישיים, תמונות והיסטוריה נשמרים. אימון פעיל אינו מוחלף.')}
        ${button('btnConfirmProgramRestore', 'אישור שחזור', true)}`);
      document.getElementById('btnConfirmProgramRestore').onclick = () => safely(confirm, () => {
        api.restoreProgram();
        confirm.close();
        dialog.close();
        refresh();
      });
    };
  }

  function weeklyWork() {
    const result = tools.weeklyMuscleWork(api.getState().history);
    api.dialog(t('עבודת שרירים השבוע'), `${note('מיום שני לפי תאריך תחילת האימון. רק סטים שהושלמו עם זהות ספרייה מתועדת. זה אינו מדד התאוששות או גדילת שריר; סט יכול להופיע בכמה שרירים.')}
      <table class="training-work-map"><thead><tr><th>${t('שריר')}</th><th>${t('עיקרי')}</th><th>${t('משני')}</th></tr></thead>
      <tbody>${Object.entries(result.muscles).map(([muscle, count]) => `<tr><th>${t(muscle)}</th><td>${count.primary}</td><td>${count.secondary}</td></tr>`).join('')}</tbody></table>
      ${!Object.keys(result.muscles).length ? note('עדיין אין סטים עם מיפוי מאומת השבוע.') : ''}
      <p><span>${t('סטים ללא מיפוי מאומת')}</span>: ${result.unknownSets}</p>`);
  }
  function monthlyGoal() {
    const result = tools.monthlyGoalProgress(api.getState().history, trainingSettings().monthlyGoal);
    const dialog = api.dialog(t('יעד חודשי אישי'), `<p>${result.month}: ${result.count} <span>${t('אימונים שתועדו')}</span></p>
      ${field('יעד אימונים לחודש הזה', `<input class="input" id="monthlyTarget" type="number" min="1" max="31" value="${result.target || 8}">`)}
      ${note('יעד לבחירתך, בלי דירוג או נקודות. חודש חדש מתחיל בלי חובה להשלים את הקודם.')}
      <div class="training-actions">${button('btnSaveMonthlyGoal', 'שמירת היעד', true)}${button('btnRemoveMonthlyGoal', 'ללא יעד חודשי')}</div>`);
    document.getElementById('btnSaveMonthlyGoal').onclick = () => safely(dialog, () => {
      const target = Number(document.getElementById('monthlyTarget').value);
      if (!Number.isInteger(target) || target < 1 || target > 31) throw new RangeError('Target must be 1–31');
      saveTraining({ monthlyGoal: { month: result.month, target } });
      dialog.close();
    });
    document.getElementById('btnRemoveMonthlyGoal').onclick = () => safely(dialog, () => { saveTraining({ monthlyGoal: null }); dialog.close(); });
  }

  function refresh() {
    refreshDurationEstimates(api);
    const t = i18n.text;
    const state = api.getState();
    if (!state.session) return;
    const current = tools.currentWorkoutEntry(state.session);
    const set = current?.sets?.find((set) => !set.completed);
    const exercise = current?.exerciseSnapshot || state.exercises.find((exercise) => exercise.id === current?.exerciseId);
    const write = (id, text) => { const node = document.getElementById(id); if (node.textContent !== text) node.textContent = text; };
    write('trainingCurrent', current ? `${t('עכשיו')}: ${i18n.exerciseName(current.exerciseName)}` : t('כל התרגילים הושלמו'));
    write('trainingTarget', current?.type === 'cardio' ? `${t('יעד זמן')}: ${Math.round(current.durationSec / 60)} ${t('דקות')}`
      : set ? `${t('סט')} ${current.sets.indexOf(set) + 1} / ${current.sets.length} · ${t('יעד')}: ${exercise?.inputType === 'hold'
        ? exercise.holdSeconds || 15 : api.repTarget(set, exercise) || '—'} ${t(exercise?.inputType === 'hold' ? 'שניות' : 'חזרות')}`
        : '');
    write('trainingListening', `${state.session.paused ? t('האימון בהפסקה — הטיימרים והספירה נעצרו') : !state.native ? t('דפדפן: רישום ידני בלבד, המיקרופון אינו מקשיב')
      : state.voiceActive ? t(state.counting ? 'ספירה קולית פעילה' : 'המיקרופון מקשיב') : t('המיקרופון אינו זמין או אינו פעיל')}${state.restSeconds > 0 ? ` · ${t('מנוחה')}: ${Math.ceil(state.restSeconds)} ${t('שניות')}` : ''}`);
    write('trainingSessionStatus', state.session.timeBudget ? t('בחירת זמן פעילה באימון הזה בלבד — ניתן לשחזר את האימון המלא')
      : state.session.substitutions?.length ? t('החלפת ציוד פעילה באימון הזה בלבד — ניתן לשחזר בכרטיס התרגיל') : '');
    for (const [id, minutes] of [['btnTimeBudget', 30], ['btnTimeBudget60', 60], ['btnTimeBudget90', 90], ['btnFullWorkout', null]]) {
      document.getElementById(id).setAttribute('aria-pressed', String((state.session.timeBudget?.minutes || null) === minutes));
    }
    write('trainingPlanStatus', trainingSettings().activePlan ? t('תוכנית אישית פעילה. הבחירה הקודמת זמינה לשחזור בתוכניות שמורות.') : '');
    const monthly = tools.monthlyGoalProgress(state.history, trainingSettings().monthlyGoal);
    write('monthlyGoalStatus', monthly.target ? `${t('החודש שלך')}: ${monthly.count} / ${monthly.target} ${t('אימונים')} · ${monthly.percent}%` : '');
    document.querySelectorAll('#exerciseList .exercise-card[data-entry-index]').forEach((card) => {
      const entry = state.session.entries[Number(card.dataset.entryIndex)];
      if (!entry || entry.type === 'cardio') return;
      const existingActions = card.querySelector('.training-equipment-actions');
      if (existingActions) {
        existingActions.querySelector('button').textContent = t(state.session.substitutions?.some((item) => item.replacementId === entry.exerciseId)
          ? 'שחזור התרגיל המקורי' : 'המכשיר תפוס');
        return;
      }
      if (entry.sets.every((set) => set.completed) && !state.session.substitutions?.some((item) => item.replacementId === entry.exerciseId)) return;
      const actions = document.createElement('div');
      actions.className = 'training-equipment-actions training-actions';
      actions.setAttribute('data-no-translate', '');
      const substitution = state.session.substitutions?.find((item) => item.replacementId === entry.exerciseId);
      const swap = document.createElement('button');
      swap.type = 'button';
      swap.className = 'btn btn-secondary btn-small';
      swap.textContent = t(substitution ? 'שחזור התרגיל המקורי' : 'המכשיר תפוס');
      swap.onclick = () => {
        if (!substitution) { equipmentBusy(entry.exerciseId); return; }
        const dialog = api.dialog(t('שחזור התרגיל המקורי'), `${note('הנתונים המקוריים יחזרו. אם כבר תיעדת משהו בחלופה, היא תישאר כתרגיל נפרד ללא איחוד משקלים.')}
          ${button('btnRestoreSwap', 'אישור שחזור', true)}`);
        document.getElementById('btnRestoreSwap').onclick = () => changedSession(dialog, (session) => tools.restoreSubstitution(session, entry.exerciseId));
        sessionNotice(dialog);
      };
      actions.appendChild(swap);
      card.appendChild(actions);
    });
  }
  const interval = setInterval(refresh, 1000);
  const refreshDuration = () => refreshDurationEstimates(api);
  document.addEventListener('input', refreshDuration);
  document.addEventListener('change', refreshDuration);
  window.addEventListener('pagehide', () => clearInterval(interval), { once: true });
  refresh();
  return { refresh, refreshDuration };
}
