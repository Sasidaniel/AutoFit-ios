import * as tools from './training-tools.js';
import { progressRecommendation } from './workout-insights.js';
import * as i18n from './i18n.js';

// Keep authored Hebrew in DOM templates so the shared translator can reverse a language switch.
const t = (value) => value;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const name = (exercise) => esc(i18n.exerciseName(exercise.name || exercise.exerciseName))
  + (exercise.superset ? ` · ${esc(i18n.text(exercise.superset.name))} (${exercise.superset.order + 1}/2)` : '');
const button = (id, label, primary = false) => `<button type="button" id="${id}" class="btn btn-${primary ? 'primary' : 'secondary'} btn-small">${t(label)}</button>`;
const field = (label, content) => `<label class="training-field"><span>${t(label)}</span>${content}</label>`;
const options = (items, selected) => items.map(([value, label]) => `<option value="${esc(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${t(label)}</option>`).join('');
const note = (text) => `<p class="field-hint">${t(text)}</p>`;
export function durationEstimateText(estimate) {
  const totalMinutes = Math.max(0, Math.round((estimate.lowSeconds + estimate.highSeconds) / 120));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourText = hours === 1 ? i18n.text('שעה') : hours === 2 ? i18n.text('שעתיים') : `${hours} ${i18n.text('שעות')}`;
  const minuteText = minutes === 1 ? i18n.text('דקה') : `${minutes} ${i18n.text('דקות')}`;
  return hours && minutes ? `${hourText}${i18n.text(minutes === 1 ? ' ו' : ' ו־')}${minuteText}`
    : hours ? hourText : minuteText;
}

export function refreshDurationEstimates(api, doc = document, { live = false } = {}) {
  const state = api.durationState({ live });
  const write = (id, text) => {
    const node = doc.getElementById(id);
    if (node && node.textContent !== text) node.textContent = text;
  };
  const total = live ? null : tools.estimateWorkoutDuration(state.session, state.exercises, state.settings.restSeconds, { remaining: false });
  const remaining = tools.estimateWorkoutDuration(state.session, state.exercises, state.settings.restSeconds,
    { remaining: true, restSeconds: state.restSeconds });
  const program = live ? null : tools.estimateWorkoutDuration(state.program, [], state.settings.restSeconds, { remaining: false });
  if (total) write('trainingDurationTotal', `${i18n.text('זמן האימון המשוער')}: ${durationEstimateText(total)}`);
  const begun = state.session.running || state.session.paused || state.session.accumulatedSec > 0 || state.session.entries.some((entry) =>
    entry.type === 'cardio' ? entry.completed || entry.startedAt || entry.elapsedSec > 0
      : entry.sets.some((set) => set.completed || set.holdStartedAt));
  write('trainingDurationRemaining', begun ? `${i18n.text('זמן משוער שנותר מעכשיו')}: ${durationEstimateText(remaining)}` : '');
  if (program) write('trainingProgramDuration', `${i18n.text('זמן משוער לאימון שלי')}: ${durationEstimateText(program)}`);
  return { total, remaining, program };
}
const PLAN_GOALS = [['strength', 'כוח'], ['muscle', 'בניית שריר'], ['fitness', 'כושר כללי / ניהול משקל'], ['walk', 'מתחילים ללכת'], ['run', 'מתחילים לרוץ'], ['rope', 'קפיצה על חבל'], ['yoga', 'יוגה'], ['pilates', 'פילאטיס']];
const PLAN_SPLITS = [['full-body', 'פול בודי — כל הגוף בכל אימון'], ['ab', 'A/B — פלג גוף עליון / תחתון'], ['abc', 'A/B/C — דחיפה / משיכה / רגליים']];
const ROPE_LEVELS = [['beginner', 'מתחילים'], ['intermediate', 'בינונית'], ['advanced', 'גבוהה']];
const REASONS = {
  cardio: 'אירובי נמדד בזמן ובקצב; אין כאן המלצה לשינוי משקל.',
  hold: 'החזקות נמדדות בשניות; אין להסיק התקדמות ממשקל וחזרות.',
  history: 'נדרשים לפחות שני אימונים עם וריאציה מוגדרת ומדידה תואמת.',
  variation: 'הווריאציה, סוג המדידה, מספר הסטים או המדידות אינם תואמים להשוואה בטוחה.',
  hard: 'תועד דירוג קשה. שמור על העומס ואל תמהר להעלות.',
  assistance: 'בגרביטון יותר משקל הוא יותר סיוע. אין כאן המלצה להפוך את כיוון העומס.',
  target: 'לא תועד אותו יעד חזרות מפורש בשני האימונים. הגדר יעד להמשך, בלי לשנות היסטוריה.',
  rating: 'חסר דירוג קל או בינוני בחלק מהסטים. אין מספיק מידע להצעת העלאה.',
  reps: 'בחלק מהסטים טרם הושג היעד. התמקד בחזרות נשלטות באותו עומס.',
  mixed: 'העומסים או החזרות משתנים. שמור על ההגדרות עד שתצטבר השוואה תואמת.',
  load: 'משקל גוף או מתח גומייה אינם עומס ציוד מתועד בר השוואה בקילוגרמים. אין כאן הצעה להעלאת משקל.',
  top: 'בשני אימונים תואמים הושג היעד בכל הסטים באותו משקל, עם דירוג קל או בינוני.',
};
const RECOMMENDATIONS = { insufficient: 'אין מספיק מידע', hold: 'שמירה על העומס', reps: 'התמקדות בחזרות', increase: 'אפשר לשקול העלאה קטנה' };
const MOVEMENTS = { squat: 'סקוואט', lunge: 'מכרע', hinge: 'תנועת ירך',
  'horizontal-push': 'דחיפה אופקית', 'horizontal-pull': 'משיכה אופקית', 'vertical-push': 'דחיפה מעל הראש',
  'hip-extension': 'פשיטת ירך', 'core-control': 'שליטה בגו', 'elbow-flexion': 'כפיפת מרפקים' };
const ACTION_ERRORS = {
  'The saved plan changed; reopen the editor': 'התוכנית השתנתה או נמחקה מאז פתיחת העריכה. סגור ופתח אותה מחדש; לא נשמרו שינויים.',
  'Undo exercise removal before restoring the equipment swap': 'בטל קודם את הסרת התרגיל כדי לשחזר את החלפת הציוד. הביצועים נשמרו.',
  'Keep at least one exercise per workout': 'יש להשאיר לפחות תרגיל אחד בכל אימון.',
  'Keep the interval recipe intact': 'רצף האינטרוולים נשמר בשלמותו. לשינוי הסבבים אפשר לבנות אימון חבל חדש ולשמור אותו בנפרד.',
  'Selected muscle groups do not cover every split day': 'קבוצות השרירים שנבחרו אינן מכסות כל חלק בחלוקה. בחר גם קבוצות מהחלקים האחרים, או בחר פול בודי.',
  'Invalid plan preferences': 'בדוק שהחלוקה מתאימה למספר האימונים: A/B דורש לפחות שניים, ו-A/B/C לפחות שלושה.',
  'Confirm a jump rope and clear space': 'יש לאשר שיש חבל תקין ומרחב פנוי לפני בניית האימון.',
  'The plan was selected but the workout could not start': 'התוכנית נבחרה, אבל התחלת האימון נכשלה. פתח את מסך אימון כדי לבדוק ולנסות שוב.',
  'Enter a workout name of 1–80 characters': 'יש להזין שם אימון באורך של עד 80 תווים.',
  'Choose at least one exercise before saving': 'בחר לפחות תרגיל אחד באימון שלי לפני השמירה.',
  'The selected program changed; reopen the save dialog': 'הבחירה השתנתה. פתח שוב את חלון השמירה.',
  'Finish or save the current workout before starting another': 'יש אימון פעיל או נתונים שהוזנו. סיים ושמור אותו לפני התחלת אימון אחר.',
  'Confirm a properly installed TRX anchor': 'לפני שילוב TRX יש לאשר עיגון תקין לפי הוראות היצרן. בלי עיגון מתאים, הסר את הבחירה; אין לאלתר חיבור לרהיטים.',
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
  const plans = document.getElementById('plansPageContent');
  plans.innerHTML = `<section class="card training-hub">
    <div class="training-actions">${button('btnReadyPlans', 'תוכניות מוכנות', true)}${button('btnSavedPlans', 'תוכניות שמורות שלי')}</div>
    <details class="plan-custom-builder"><summary>${t('בנייה והתאמה אישית')}</summary>
      ${button('btnPersonalPlan', 'בניית תוכנית אישית')}</details>
    <p id="trainingPlanStatus" class="field-hint" data-no-translate></p></section>`;
  const goals = document.getElementById('goalsPageContent');
  goals.innerHTML = `<section class="card training-hub">
    <div class="training-actions">${button('btnProgressAdvice', 'יעדים אישיים והמלצות')}${button('btnWeeklyWork', 'עבודת שרירים השבוע')}${button('btnMonthlyGoal', 'יעד חודשי אישי')}</div>
    <p id="monthlyGoalStatus" data-no-translate></p></section>`;
  const controls = document.createElement('div');
  controls.className = 'training-workout-tools';
  controls.innerHTML = `<section class="training-duration"><strong id="trainingDurationTotal" data-no-translate></strong>
    <p id="trainingDurationRemaining" data-no-translate></p></section>
    <div class="training-actions">${button('btnTimeBudget', 'יש לי 30 דקות')}${button('btnTimeBudget60', 'יש לי 60 דקות')}${button('btnTimeBudget90', 'יש לי 90 דקות')}${button('btnFullWorkout', 'תוכנית מלאה')}${button('btnWorkoutAdvice', 'יעדים אישיים והמלצות')}</div>
    <p id="trainingSessionStatus" class="field-hint" data-no-translate></p>
    <div class="workout-focus" role="status" aria-live="polite" data-no-translate><strong id="trainingCurrent"></strong><span id="trainingTarget"></span><span id="trainingListening"></span></div>`;
  document.querySelector('.workout-header').appendChild(controls);
  const on = (id, handler) => document.getElementById(id).addEventListener('click', handler);
  on('btnPersonalPlan', () => planBuilder());
  on('btnReadyPlans', readyPlans);
  on('btnSavedPlans', savedPlans);
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
      message.textContent = i18n.text(ACTION_ERRORS[error.message] || (error instanceof RangeError ? 'בדוק את הטווחים והבחירה ונסה שוב.' : 'לא ניתן לבצע את השינוי. בדוק את הבחירה או את האחסון ונסה שוב.'));
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
      ${button('btnEstimateBudget', 'הצג הצעה')}<div id="budgetProposal"></div>`);
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
    const choices = tools.alternatives(exercise, tools.planningCatalog(state.exercises)).filter((choice) =>
      !state.session.entries.some((entry) => entry.exerciseId === choice.id)
      && !state.session.removedExercises?.some(({ entry }) => entry.exerciseId === choice.id));
    const dialog = api.dialog(t('המכשיר תפוס'), `<p data-no-translate>${name(exercise)}</p>
      ${note('החלפה לתנועה ולאזור עבודה תואמים עם ציוד שונה, לא הבטחה לשקילות. בחר עומס חדש; המשקל אינו מועתק.')}
      ${choices.length ? field('בחר חלופה', `<select id="swapChoice" class="select" data-no-translate>${choices.map((choice) => `<option value="${esc(choice.id)}">${name(choice)}</option>`).join('')}</select>`)
        : note('אין חלופה מאומתת לווריאציה הזו. אפשר להמתין או לעיין בספרייה; שריר משותף לבדו אינו בסיס להחלפה בטוחה.')}
      <div class="training-actions">${choices.length ? button('btnSwapGuide', 'הדרכה') + button('btnConfirmSwap', 'החלפה באימון הזה בלבד', true) : ''}</div>
      ${note('סטים שהושלמו נשארים בתרגיל המקורי. שאר הנתונים נשמרים לשחזור. אין שינוי בתוכנית הקבועה.')}`);
    const busy = document.createElement('button');
    busy.type = 'button';
    busy.className = 'btn btn-secondary';
    busy.textContent = t(entry.equipmentBusy ? 'המכשיר התפנה — החזרה לסדר האימון' : 'סימון כממתין לציוד');
    busy.onclick = () => changedSession(dialog, (session) =>
      tools.setEquipmentBusy(session, exerciseId, !entry.equipmentBusy));
    dialog.querySelector('.training-dialog-body').prepend(busy);
    if (choices.length) {
      document.getElementById('btnSwapGuide').onclick = () => api.guide(choices.find((choice) => choice.id === document.getElementById('swapChoice').value));
      document.getElementById('btnConfirmSwap').onclick = () => changedSession(dialog, (session) =>
        tools.swapExercise(session, exerciseId, choices.find((choice) => choice.id === document.getElementById('swapChoice').value), tools.planningCatalog(api.getState().exercises)));
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

  function readyPlans() {
    const dialog = api.dialog(t('תוכניות מוכנות'), `
      ${note('הצעות מקומיות לבדיקה, לא תוכניות שהופעלו או נשמרו עבורך. בחר רמה וסביבה, בדוק את הציוד והתרגילים, ורק אז שמור או הפעל.')}
      <div class="ready-plan-filters">
        ${field('רמה', `<select class="select" id="readyPlanLevel">${options([['', 'כל הרמות'], ['beginner', 'מתחילים'], ['regular', 'בעלי ניסיון']], '')}</select>`)}
        ${field('סביבה', `<select class="select" id="readyPlanPlace">${options([['', 'בכל מקום'], ['gym', 'חדר כושר'], ['home', 'בית'], ['outside', 'מחוץ לבית']], '')}</select>`)}
        ${field('סוג תוכנית', `<select class="select" id="readyPlanKind">${options([['', 'כל סוגי התוכניות'], ['strength', 'כוח'], ['movement', 'אירובי ותנועה']], '')}</select>`)}
      </div><div id="readyPlanResults"></div>`);
    const render = () => {
      const location = dialog.querySelector('#readyPlanPlace').value;
      const templates = tools.readyPlanTemplates({ location, experience: dialog.querySelector('#readyPlanLevel').value,
        kind: dialog.querySelector('#readyPlanKind').value });
      dialog.querySelector('#readyPlanResults').innerHTML = templates.length ? templates.map((template) => `
        <section class="ready-plan-card"><h4>${esc(i18n.text(template.name))}</h4>
          <p>${esc(i18n.text(template.experience === 'beginner' ? 'מתחילים' : 'בעלי ניסיון'))}
            · ${template.minutes} ${i18n.text('דקות לאימון')}</p>
          <p>${i18n.text('ציוד')}: ${template.equipment.map((item) => esc(i18n.text(item))).join(' · ') || i18n.text('ללא ציוד')}</p>
          ${template.catalogId ? note('תיעוד זמן של תרגול מוכר, לא שיעור מודרך ולא מדד לעצימות אירובית.') : ''}
          <button type="button" class="btn btn-primary btn-small" data-ready-plan="${template.id}">${t('בדיקת התוכנית')}</button></section>`).join('')
        : note('אין תוכניות מתאימות לסינון הזה. אפשר לשנות רמה או סביבה.');
      dialog.querySelectorAll('[data-ready-plan]').forEach((item) => item.onclick = () => safely(dialog, () => {
        const template = templates.find((value) => value.id === item.dataset.readyPlan);
        const place = location || template.locations[0];
        if (template.goal === 'rope') {
          ropeBuilder({ level: template.ropeLevel, location: place, minutes: template.minutes });
          return;
        }
        const plan = tools.generateReadyPlan(template.id, api.getState().exercises, { location: place });
        plan.id = api.uid();
        plan.name = i18n.text(template.name);
        planPreview(plan);
      }));
    };
    dialog.querySelectorAll('.ready-plan-filters select').forEach((select) => select.onchange = render);
    render();
  }

  function ropeBuilder({ level = 'beginner', location = 'home', minutes = 10 } = {}) {
    const dialog = api.dialog(t('בניית אימון קפיצה על חבל'), `<form id="ropePlanForm" class="training-form">
      ${field('רמת קפיצה על חבל', `<select class="select" name="ropeLevel">${options(ROPE_LEVELS, level)}</select>`)}
      ${field('דקות זמינות', `<select class="select" name="minutes">${options([[10, '10'], [15, '15'], [20, '20'], [30, '30']], minutes)}</select>`)}
      ${field('מיקום', `<select class="select" name="location">${options([['home', 'בבית'], ['gym', 'חדר כושר'], ['outside', 'בחוץ']], location)}</select>`)}
      ${note('מתחילים: 20 שניות קפיצה / 40 התאוששות. בינונית: 40 / 40. גבוהה: 60 / 30. בכל רמה שתי דקות הליכה לחימום ושתי דקות לשחרור. מספר הסבבים מותאם לזמן; אין צורך לקפוץ מהר יותר.')}
      ${note('בחר משטח יציב שאינו מחליק, נעליים מתאימות וחבל תקין. התחל במינון הקצר; אפשר לעצור או להאריך התאוששות. אם יש כאב, סחרחורת או קושי חריג, הפסק. קפיצה אינה מתאימה לכל אחד; זו אינה התאמה רפואית.')}
      <label class="checkbox-row"><input type="checkbox" name="ropeReady" required><span>${t('יש ברשותי חבל תקין ומרחב פנוי מעל הראש ומסביב לגוף.')}</span></label>
      <button class="btn btn-primary" type="submit">${t('יצירת הצעה לבדיקה')}</button></form>`);
    document.getElementById('ropePlanForm').onsubmit = (event) => {
      event.preventDefault();
      safely(dialog, () => {
        const data = new FormData(event.target);
        if (data.get('ropeReady') !== 'on') throw new Error('Confirm a jump rope and clear space');
        const plan = tools.generateRopePlan(data.get('ropeLevel'), Number(data.get('minutes')), api.getState().exercises, data.get('location'));
        plan.id = api.uid();
        planPreview(plan);
      });
    };
  }

  function planBuilder({ homeOnly = false } = {}) {
    const dialog = api.dialog(t(homeOnly ? 'בניית אימון ביתי' : 'בניית תוכנית אישית'), `<form id="personalPlanForm" class="training-form">
      ${homeOnly ? note('בחר מה באמת נמצא בבית. כיסא מיועד לישיבה ותמיכה בלבד; TRX דורש עיגון תקין. ההצעה נבדקת ונשמרת לפני הפעלה, בלי להחליף את האימון הקיים.') : ''}
      ${field('המטרה', `<select name="goal" class="select">${options(PLAN_GOALS.filter(([id]) => !['rope', 'yoga', 'pilates'].includes(id) && (!homeOnly || id !== 'run')), 'fitness')}</select>`)}
      ${field('ניסיון', `<select name="experience" class="select">${options([['beginner', 'מתחילים'], ['regular', 'בעלי ניסיון']], 'beginner')}</select>`)}
      ${field('מספר אימונים בתוכנית', `<select name="days" class="select">${options([[1, 'אימון יחיד'], [2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6']], 1)}</select>`)}
      ${field('חלוקת האימונים', `<select name="split" class="select">${options(PLAN_SPLITS, 'full-body')}</select>`)}
      ${note('A/B חוזר לפי הסדר עליון / תחתון; A/B/C חוזר דחיפה / משיכה / רגליים. כל אימון מסומן באות שלו. בבחירת שרירים יש לכלול קבוצות מכל חלק בחלוקה; פול בודי מתאים גם לקבוצה בודדת.')}
      ${field('דקות לאימון', `<select name="minutes" class="select">${options([[20, '20'], [30, '30'], [45, '45'], [60, '60'], [90, '90']], 30)}</select>`)}
      <fieldset id="planMuscles"><legend>${t('קבוצות שרירים לאימון')}</legend>
        ${note('אפשר לבחור קבוצה אחת או כמה. ללא בחירה תיבנה תוכנית כללית לפי החלוקה. בפול בודי כל קבוצה תופיע בכל אימון; בחלוקה היא תופיע בחלק המתאים. הבחירה מיועדת לאימוני כוח, לא להליכה או ריצה.')}
        <div class="training-equipment">${tools.PLAN_MUSCLES.map((muscle) =>
          `<label><input type="checkbox" name="muscles" value="${esc(muscle)}">${t(muscle)}</label>`).join('')}</div></fieldset>
      ${field('מיקום', `<select name="location" class="select" ${homeOnly ? 'disabled' : ''}>${options([['home', 'בבית'], ['gym', 'חדר כושר'], ['outside', 'בחוץ']], 'home')}</select>`)}
      <fieldset><legend>${t('ציוד זמין בפועל')}</legend><div class="training-equipment">${['כיסא יציב', 'TRX', 'משקולות יד', 'גומייה', 'ספסל', 'מכונה', 'מוט', 'מתח', 'ספסל כומר', 'מדרגת אימון', 'גלגל בטן', 'כלוב בטיחות'].filter((item) => !homeOnly || item !== 'מכונה').map((item) =>
        `<label><input type="checkbox" name="equipment" value="${esc(item)}">${t(item)}</label>`).join('')}</div></fieldset>
      ${note('ללא בחירת ציוד יוצעו רק תרגילי משקל גוף, רצפה וקיר. כיסא אינו ספסל אימון. בלי ציוד משיכה מתאים, ייתכן שלא יהיה כיסוי מאומת לגב.')}
      <label class="checkbox-row plan-trx-confirm hidden"><input type="checkbox" name="trxAnchorChecked"><span>${t('הרצועות והעיגון מותקנים ונבדקו לפי הוראות היצרן. אבדוק אותם שוב לפני כל שימוש; אין עיגון מאולתר לרהיטים.')}</span></label>
      ${note('תוכנית כללים מקומית, ללא AI בתשלום. אין הבטחת ירידה נקודתית בשומן. התאם יכולת והפסק פעילות הגורמת לכאב.')}
      <button class="btn btn-primary" type="submit">${t('יצירת הצעה לבדיקה')}</button></form>`);
    const form = document.getElementById('personalPlanForm');
    const trx = form.querySelector('[name="equipment"][value="TRX"]');
    trx.addEventListener('change', () => {
      const confirmation = form.querySelector('.plan-trx-confirm');
      confirmation.classList.toggle('hidden', !trx.checked);
      if (!trx.checked) form.elements.trxAnchorChecked.checked = false;
    });
    const updateSplit = () => {
      const cardio = ['walk', 'run'].includes(form.elements.goal.value);
      document.getElementById('planMuscles').disabled = cardio;
      form.elements.split.disabled = cardio;
      if (cardio) form.elements.split.value = 'full-body';
      const minimum = form.elements.split.value === 'abc' ? 3 : form.elements.split.value === 'ab' ? 2 : 1;
      for (const option of form.elements.days.options) option.disabled = Number(option.value) < minimum;
      if (Number(form.elements.days.value) < minimum) form.elements.days.value = String(minimum);
    };
    form.elements.goal.addEventListener('change', updateSplit);
    form.elements.split.addEventListener('change', updateSplit);
    document.getElementById('personalPlanForm').onsubmit = (event) => {
      event.preventDefault();
      safely(dialog, () => {
        const data = new FormData(event.target);
        const plan = tools.generatePlan({ goal: data.get('goal'), experience: data.get('experience'), days: Number(data.get('days')),
          minutes: Number(data.get('minutes')), location: homeOnly ? 'home' : data.get('location'), equipment: data.getAll('equipment'),
          trxAnchorChecked: data.get('trxAnchorChecked') === 'on',
          split: data.get('split') || 'full-body',
          muscles: data.getAll('muscles') }, api.getState().exercises);
        plan.id = api.uid();
        planPreview(plan);
      });
    };
  }

  function planPreview(original) {
    const plan = JSON.parse(JSON.stringify(original));
    const available = tools.planCatalog(tools.planningCatalog(api.getState().exercises), plan.options.equipment, plan.options.location);
    const dialog = api.dialog(t('תוכנית מוצעת — בדיקה ועריכה'), `${plan.name ? `<h3 data-no-translate>${esc(plan.name)}</h3>` : ''}
      <p><span>${t(PLAN_GOALS.find(([key]) => key === plan.options.goal)?.[1] || '')}</span>
      · ${plan.options.days} <span>${t('אימונים בתוכנית')}</span> · ${plan.options.minutes} <span>${t('דקות לאימון')}</span></p>
      ${plan.options.goal === 'rope' ? `<p><span>${t('רמת קפיצה על חבל')}</span>: <span>${t(ROPE_LEVELS.find(([key]) => key === plan.options.ropeLevel)[1])}</span></p>` : ''}
      ${PLAN_SPLITS.some(([key]) => key === plan.options.split) ? `<p>${t(PLAN_SPLITS.find(([key]) => key === plan.options.split)[1])}</p>` : ''}
      ${plan.options.muscles?.length ? `<p><span>${t('קבוצות שנבחרו')}</span>: ${plan.options.muscles.map((muscle) => `<span>${esc(t(muscle))}</span>`).join(' · ')}</p>
        ${note('כל קבוצה שנבחרה נשמרת בחלק המתאים בתוכנית. שרירים משניים עשויים להשתתף, אך אינם מחליפים כיסוי עיקרי. לא ממלאים זמן בתרגילים מיותרים.')}` : ''}
      <p><span>${t('מיקום')}</span>: <span>${t({ home: 'בבית', gym: 'חדר כושר', outside: 'בחוץ' }[plan.options.location])}</span>
        · <span>${t('ציוד')}</span>: ${(plan.options.equipment.length ? plan.options.equipment : ['ללא ציוד']).map((item) => `<span>${t(item)}</span>`).join(' · ')}</p>
      ${note('השאר ימים קלים או מנוחה בין אימונים לפי התחושה. זמני התוכנית הם אומדן; אין חובה לסיים בזמן.')}
      ${plan.options.equipment.includes('TRX') ? note('לפני כל שימוש ב-TRX בדוק שוב את הרצועות והעיגון לפי הוראות היצרן. ההצעה אינה מאשרת את בטיחות ההתקנה בפועל.') : ''}
      ${plan.options.goal === 'run' ? note('התחלה עדינה: הליכה נוחה ואחריה ריצה קצרה, ובסיום הליכה נוספת לפי הצורך. חזור על אותו מינון; רק כשהוא נוח בכמה אימונים שקול עוד דקה, לא העלאת קצב וזמן יחד.') : ''}
      ${['yoga', 'pilates'].includes(plan.options.goal) ? note('תיעוד זמן של תרגול מוכר, לא שיעור מודרך ולא מדד לעצימות אירובית.') : ''}
      ${plan.omitted.length ? note('חלק מדפוסי התנועה לא נכללו בגלל הציוד, הניסיון או הזמן. ההצעה אינה מבטיחה כיסוי מלא לכל הגוף.') +
        `<p><span>${t('לא נכללו')}</span>: ${plan.omitted.map((movement) => `<span>${t(MOVEMENTS[movement] || movement)}</span>`).join(' · ')}</p>` : ''}
      ${plan.options.goal === 'rope' ? note('הטיימר עובר אוטומטית מחימום לסבבי קפיצה והתאוששות ולשחרור. הפסקת האימון או עצירת הטיימר מקפיאות את המיקום ברצף. בדפדפן יש להשאיר את הדף פתוח; הכרזות ברקע באייפון דורשות בדיקת מכשיר.') : ''}
      ${plan.sessions.map((session, index) => `<section class="training-plan-day" data-day="${index}"><h4><span>${t('אימון')}</span> ${index + 1}${/^[A-C]$/.test(session.label) ? ` · <bdi>${session.label}</bdi>` : ''}</h4>
        ${session.splitMuscles ? `<p>${session.splitMuscles.map((muscle) => `<span>${t(muscle)}</span>`).join(' · ')}</p>` : ''}
        ${session.exercises.map((exercise, row) => `<div class="training-plan-row" data-row="${row}">
          <label><span class="sr-only">${t('בחירת תרגיל')}</span><select class="select plan-exercise" data-no-translate>${available.filter((candidate) => candidate.inputType === exercise.inputType)
            .filter((candidate) => !exercise.intervals || candidate.catalogId === 'jumpRope')
            .filter((candidate) => !['yoga', 'pilates'].includes(plan.options.goal) || candidate.catalogId === `${plan.options.goal}Practice`)
            .filter((candidate) => !session.splitMuscles || session.splitMuscles.includes(tools.trainingMetadata(candidate)?.primary))
            .filter((candidate) => !plan.options.muscles?.length || tools.trainingMetadata(candidate)?.primary === tools.trainingMetadata(exercise)?.primary).map((candidate) =>
            `<option value="${esc(candidate.id)}" ${candidate.id === exercise.id ? 'selected' : ''}>${name(candidate)}</option>`).join('')}</select></label>
          ${exercise.intervals ? `<p data-no-translate>${exercise.intervals.rounds} ${i18n.text('סבבים')} · ${exercise.intervals.workSeconds} ${i18n.text('שניות קפיצה')} / ${exercise.intervals.recoverySeconds} ${i18n.text('שניות התאוששות')}</p>` :
            exercise.inputType === 'cardio' ? field('דקות', `<input class="input plan-duration" type="number" min="1" max="60" value="${exercise.durationMinutes}">`) :
            field('סטים', `<input class="input plan-sets" type="number" min="1" max="5" value="${exercise.defaultSets}">`) +
            field('יעד חזרות', `<input class="input plan-reps" type="number" min="1" max="30" value="${exercise.targetReps}">`)}
          <button class="btn btn-secondary btn-small plan-guide" type="button">${t('הדרכה')}</button></div>`).join('')}
        ${session.exercises.some((exercise) => exercise.inputType !== 'cardio') ? `<p class="field-hint"><span>${t('מנוחה בין סטים')}</span>: ${session.exercises.find((exercise) => exercise.inputType !== 'cardio').restSeconds} <span>${t('שניות')}</span></p>` : ''}
        <p class="field-hint"><span>${t('אומדן עם מנוחות והכנה')}</span>: <strong class="plan-estimate" data-no-translate></strong></p>
        <p class="field-hint plan-budget-warning" role="status" data-no-translate></p>
        <button class="btn btn-primary btn-small" data-activate="${index}">${t('בדיקה והפעלת האימון הזה')}</button></section>`).join('')}
      ${note('כל אימון מופעל במפורש. נשמר גיבוי של הבחירה הקודמת לשחזור; אין החלפה של תוכנית ללא אישור.')}
      ${button('btnSaveAlternatePlan', 'שמירה כתוכנית חלופית', true)}`);
    function updateEstimates() {
      dialog.querySelectorAll('[data-day]').forEach((section) => {
        const edited = [];
        let valid = true;
        section.querySelectorAll('[data-row]').forEach((row) => {
          const exercise = available.find((item) => item.id === row.querySelector('select').value);
          const original = plan.sessions[Number(section.dataset.day)].exercises[Number(row.dataset.row)];
          if (original.intervals) {
            edited.push(original);
          } else if (exercise.inputType === 'cardio') {
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
        section.querySelector('.plan-budget-warning').textContent = valid && (plan.options.muscles?.length || plan.options.split === 'full-body')
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
          if (existing.intervals) {
            next.intervals = existing.intervals;
            next.durationMinutes = existing.durationMinutes;
            next.location = existing.location || plan.options.location;
          } else if (next.inputType === 'cardio') {
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
        const required = day.requiredMuscles || plan.options.muscles || [];
        if (day.splitMuscles && day.exercises.some((exercise) => !tools.supportsPlanMuscles(day.splitMuscles, exercise))) throw new Error('Selected muscle groups do not cover every split day');
        if (required.length && (required.some((muscle) =>
          !day.exercises.some((exercise) => tools.trainingMetadata(exercise)?.primary === muscle))
          || plan.options.muscles?.length && day.exercises.some((exercise) => !tools.supportsPlanMuscles(plan.options.muscles, exercise)))) {
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

  function workoutTitle(plan) {
    return tools.sessionWorkoutTitle({ planSnapshot: { ...tools.planIdentity(plan, 0), days: 1 } }, i18n.text);
  }
  function savedPlanEditor(original) {
    const baseline = JSON.parse(JSON.stringify(original));
    let draft = JSON.parse(JSON.stringify(original));
    const available = tools.planningCatalog(api.getState().exercises);
    const dialog = api.dialog(t('עריכת תוכנית שמורה'), '');
    const body = dialog.querySelector('.training-dialog-body');
    const input = (exercise, key, label, numeric = false) => field(label,
      `<input class="input" data-plan-field="${key}" type="${numeric ? 'number' : 'text'}" ${numeric ? 'step="any"' : 'maxlength="80"'} value="${esc(exercise[key] ?? '')}" data-no-translate>`);
    function readDraft() {
      const next = JSON.parse(JSON.stringify(draft));
      next.name = body.querySelector('#editSavedPlanName').value.trim();
      body.querySelectorAll('[data-saved-day]').forEach((section) => {
        const day = next.sessions[Number(section.dataset.savedDay)];
        section.querySelectorAll('[data-saved-row]').forEach((row) => {
          const index = Number(row.dataset.savedRow);
          const changes = {};
          row.querySelectorAll('[data-plan-field]').forEach((control) => {
            const key = control.dataset.planField;
            if (control.value !== String(day.exercises[index][key] ?? '')) changes[key] = control.value;
          });
          day.exercises[index] = tools.editSavedPlanExercise(day.exercises[index], changes);
        });
      });
      return next;
    }
    function render() {
      body.innerHTML = `<p class="training-dialog-error hidden" role="alert"></p>${field('שם האימון', `<input class="input" id="editSavedPlanName" maxlength="80" value="${esc(draft.name || workoutTitle(draft))}" data-no-translate>`)}
        ${note('העריכה נשמרת רק בתוכנית הזו. האימון הנוכחי, תוכניות אחרות וההיסטוריה אינם משתנים. כדי להשתמש בעריכה, בחר שוב את התוכנית במפורש.')}
        ${note('אפשר להשאיר טווח חזרות כמו 8–12. יעד חזרות לספירה קולית הוא מספר נפרד ואפשר להשאירו ריק.')}
        ${draft.sessions.map((day, dayIndex) => `<section class="saved-plan-day" data-saved-day="${dayIndex}">
          <h3><span>${t('אימון')}</span> <span data-no-translate>${dayIndex + 1}${day.label ? ` (${esc(day.label)})` : ''}</span></h3>
          ${day.exercises.map((exercise, index) => `<section class="saved-plan-exercise" data-saved-row="${index}">
            <h4 data-no-translate>${name(exercise)}</h4><div class="saved-plan-fields">
            ${exercise.inputType === 'cardio' ? exercise.intervals ? '' : input(exercise, 'durationMinutes', 'דקות', true) + input(exercise, 'pace', 'קצב') :
              input(exercise, 'defaultSets', 'סטים', true) + input(exercise, 'restSeconds', 'מנוחה בשניות', true) +
              (exercise.inputType === 'hold' ? input(exercise, 'holdSeconds', 'שניות החזקה', true) :
                input(exercise, 'defaultReps', 'חזרות או טווח חזרות') + input(exercise, 'targetReps', 'יעד חזרות לספירה קולית', true)) +
              input(exercise, 'targetWeightKg', 'משקל יעד בק״ג — לא חובה', true)}
            </div>${exercise.intervals ? note('רצף האינטרוולים נשמר בשלמותו. לשינוי הסבבים אפשר לבנות אימון חבל חדש ולשמור אותו בנפרד.') : ''}
            <div class="training-actions">
              <button class="btn btn-secondary btn-small" data-move="-1" ${index === 0 ? 'disabled' : ''}>${t('הזזה למעלה')}</button>
              <button class="btn btn-secondary btn-small" data-move="1" ${index === day.exercises.length - 1 ? 'disabled' : ''}>${t('הזזה למטה')}</button>
              <button class="btn btn-secondary btn-small" data-remove-exercise>${t('הסרה מהתוכנית')}</button>
            </div></section>`).join('')}
          ${field('הוספת תרגיל', `<select class="select saved-plan-add" data-no-translate>${available.filter((exercise) =>
            !day.exercises.some((existing) => existing.id === exercise.id)
            && tools.supportsPlanMuscles(day.splitMuscles, exercise)
            && tools.supportsPlanMuscles(draft.options?.muscles, exercise))
            .map((exercise) => `<option value="${esc(exercise.id)}">${name(exercise)}</option>`).join('')}
            ${tools.SUPERSET_RECIPES.filter((recipe) => {
              const parts = tools.supersetExercises(recipe.id, available);
              return parts.every((part) => !day.exercises.some((exercise) => exercise.id === part.id)
                && tools.supportsPlanMuscles(day.splitMuscles, part)
                && tools.supportsPlanMuscles(draft.options?.muscles, part));
            }).map((recipe) => `<option value="recipe:${recipe.id}">${esc(i18n.text(recipe.name))}</option>`).join('')}</select>`)}
          <button class="btn btn-secondary" data-add-exercise>${t('הוספת התרגיל לתוכנית')}</button>
        </section>`).join('')}
        ${draft.legCalfSupersetV1 && !draft.legCalfSupersetV1.restored ? note('תוכנית A עודכנה ללחיצת רגליים ותאומים: 15 חזרות לכל חלק. התרגיל המקורי שמור לשחזור; משקלים נבחרים בנפרד.') + button('btnRestoreOriginalLegPress', 'שחזור לחיצת הרגליים המקורית') : ''}
        ${button('btnSaveEditedPlan', 'שמירת השינויים בתוכנית', true)} ${button('btnCancelEditedPlan', 'ביטול ללא שמירה')}`;
      body.querySelectorAll('[data-move], [data-remove-exercise], [data-add-exercise]').forEach((control) => {
        control.onclick = () => safely(dialog, () => {
          const next = readDraft();
          const section = control.closest('[data-saved-day]');
          const day = next.sessions[Number(section.dataset.savedDay)];
          if (control.hasAttribute('data-add-exercise')) {
            const value = section.querySelector('.saved-plan-add').value;
            if (value.startsWith('recipe:')) {
              const parts = tools.supersetExercises(value.slice(7), available);
              if (parts.some((part) => day.exercises.some((exercise) => exercise.id === part.id))) throw new Error('צמד הסופר סט הזה כבר נבחר');
              day.exercises.push(...parts.map(tools.planExercise));
            } else {
              const selected = available.find((exercise) => exercise.id === value);
              if (!selected) throw new Error('Choose at least one exercise before saving');
              day.exercises.push(tools.planExercise(selected));
            }
          } else {
            const index = Number(control.closest('[data-saved-row]').dataset.savedRow);
            if (control.hasAttribute('data-remove-exercise')) day.exercises.splice(index, 1);
            else {
              const to = index + Number(control.dataset.move);
              [day.exercises[index], day.exercises[to]] = [day.exercises[to], day.exercises[index]];
            }
          }
          draft = next;
          render();
        });
      });
      body.querySelector('#btnSaveEditedPlan').onclick = () => safely(dialog, () => {
        const next = readDraft();
        api.saveEditedPlan(baseline, next);
        refresh();
        dialog.close();
        savedPlans();
      });
      body.querySelector('#btnCancelEditedPlan').onclick = () => dialog.close();
      const restore = body.querySelector('#btnRestoreOriginalLegPress');
      if (restore) restore.onclick = () => safely(dialog, () => { draft = tools.restoreSavedASuperset(readDraft()); render(); });
      i18n.translateDOM(body);
    }
    render();
  }
  function saveCurrentWorkout() {
    const dialog = api.dialog(t('שמירת האימון שלי'), `${field('שם האימון', '<input class="input" id="savedWorkoutName" maxlength="80" data-no-translate>')}
      ${note('נשמרים בחירת התרגילים, הסדר והיעדים של האימון שלי, לא ביצועים או קיצור זמני של אימון פעיל. שמירה אינה מתחילה או מחליפה אימון.')}
      ${button('btnConfirmSaveWorkout', 'שמירה כאימון נוסף', true)}`);
    document.getElementById('btnConfirmSaveWorkout').onclick = () => safely(dialog, () => {
      const plans = trainingSettings().plans || [];
      if (plans.length >= 8) throw new Error('Remove a saved plan before saving another');
      const plan = tools.createSavedWorkout(document.getElementById('savedWorkoutName').value, api.durationState(), api.uid());
      saveTraining({ plans: [...plans, plan] });
      dialog.close();
      savedPlans();
    });
  }
  function renameWorkout(plan) {
    const dialog = api.dialog(t('שינוי שם האימון'), `${field('שם האימון', `<input class="input" id="renameWorkoutName" maxlength="80" value="${esc(workoutTitle(plan))}" data-no-translate>`)}
      ${button('btnConfirmWorkoutName', 'שמירת השם', true)}`);
    document.getElementById('btnConfirmWorkoutName').onclick = () => safely(dialog, () => {
      const name = document.getElementById('renameWorkoutName').value.trim();
      if (!name || name.length > 80) throw new Error('Enter a workout name of 1–80 characters');
      saveTraining({ plans: trainingSettings().plans.map((item) => item.id === plan.id ? { ...item, name } : item) });
      dialog.close();
      savedPlans();
    });
  }
  function savedWorkoutPreview(plan) {
    const day = plan.sessions[0];
    const estimate = tools.estimateWorkoutDuration(tools.durationSession(day.exercises), [], api.durationState().settings.restSeconds, { remaining: false });
    const dialog = api.dialog(workoutTitle(plan), `<ul data-no-translate>${day.exercises.map((exercise) =>
      `<li>${name(exercise)} · ${exercise.inputType === 'cardio' ? `${exercise.durationMinutes} ${i18n.text('דקות')}` :
        `${exercise.defaultSets} ${i18n.text('סטים')} · ${exercise.inputType === 'hold' ? `${exercise.holdSeconds || 15} ${i18n.text('שניות')}` : esc(exercise.targetReps || exercise.defaultReps || '—')}`}</li>`).join('')}</ul>
      <p data-no-translate>${i18n.text('זמן האימון המשוער')}: ${durationEstimateText(estimate)}</p>
      ${note('הבחירה והיעדים נשמרו. שמות אישיים ותמונות נלקחים מהספרייה הנוכחית; ההיסטוריה אינה משתנה.')}
      ${button('btnSelectSavedWorkout', 'בחירה לאימון הבא ללא התחלה', true)}`);
    document.getElementById('btnSelectSavedWorkout').onclick = () => safely(dialog, () => {
      api.activatePlan(plan, 0);
      dialog.close();
      refresh();
    });
  }
  function savedPlans() {
    const previous = document.querySelector('.saved-plans-dialog');
    const scrollTop = previous?.scrollTop || 0;
    if (previous) {
      const dialogs = [...document.querySelectorAll('dialog.training-dialog')];
      dialogs.slice(dialogs.indexOf(previous)).reverse().forEach((item) => { item.close(); item.remove(); });
    }
    const plans = trainingSettings().plans || [];
    const canStart = api.canStartSavedPlan();
    const dialog = api.dialog(t('תוכניות שמורות שלי'), `${!canStart ? note('יש אימון פעיל או נתונים שהוזנו. סיים ושמור אותו, או בטל אותו במפורש במסך אימון, לפני התחלת אימון אחר. שום נתון לא יימחק כאן.') + button('btnOpenCurrentWorkout', 'פתיחת האימון הנוכחי') : ''}
      <p class="saved-plans-count" data-no-translate>${i18n.text('תוכניות שמורות שלי')}: ${plans.length}</p>
      ${plans.length ? plans.map((plan, index) => `<section class="training-advice"><strong data-no-translate>${index + 1}. ${esc(workoutTitle(plan))}</strong>
      <p>${plan.sessions.length} <span>${t('אימונים בתוכנית')}</span></p>
      ${plan.options.muscles?.length ? `<p>${plan.options.muscles.map((muscle) => `<span>${esc(t(muscle))}</span>`).join(' · ')}</p>` : ''}
      ${plan.sessions.map((day, dayIndex) => `<p data-no-translate>${plan.sessions.length > 1 ? `${i18n.text('אימון')} ${dayIndex + 1}${/^[A-C]$/.test(day.label) ? ` (${day.label})` : ''} · ` : ''}${day.exercises.length} ${i18n.text('תרגילים')} · ${durationEstimateText(tools.estimateWorkoutDuration(tools.durationSession(day.exercises), [], api.durationState().settings.restSeconds, { remaining: false }))}</p>
        <button class="btn btn-primary btn-small" data-start-plan="${index}" data-plan-day="${dayIndex}" ${canStart ? '' : 'disabled'}>${t('בחירה והתחלת אימון')}${plan.sessions.length > 1 ? ` ${dayIndex + 1}${/^[A-C]$/.test(day.label) ? ` (${day.label})` : ''}` : ''}</button>`).join('')}
      <div class="training-actions"><button class="btn btn-secondary btn-small" data-preview="${index}">${t(plan.kind === 'saved-workout' ? 'בדיקת האימון השמור' : 'בדיקה ועריכה')}</button>
      <button class="btn btn-secondary btn-small" data-edit-plan="${index}">${t('עריכת התוכנית השמורה')}</button>
      <button class="btn btn-secondary btn-small" data-rename-plan="${index}">${t('שינוי שם האימון')}</button>
      <button class="btn btn-secondary btn-small" data-delete-plan="${index}">${t('מחיקת התוכנית החלופית')}</button></div></section>`).join('') : note('עדיין אין תוכניות חלופיות שמורות.')}
      ${note('לשמירת תוכנית, פתח בניית תוכנית אישית, צור הצעה ולחץ בתחתית ההצעה על שמירה כתוכנית חלופית. שמירה אינה הפעלה.')}
      ${button('btnCreateSavedPlan', 'יצירת תוכנית חדשה')}
      ${note('עד שמונה תוכניות חלופיות במכשיר. מחיקה כאן לא משנה אימון פעיל או את האימון שלי.')}
      ${trainingSettings().programBackup ? button('btnRestoreProgram', 'שחזור הבחירה שלפני התוכנית', true) : ''}`);
    dialog.classList.add('saved-plans-dialog');
    dialog.scrollTop = scrollTop;
    document.getElementById('btnCreateSavedPlan').onclick = () => planBuilder();
    const openCurrent = document.getElementById('btnOpenCurrentWorkout');
    if (openCurrent) openCurrent.onclick = () => { dialog.close(); api.openCurrentWorkout(); };
    dialog.querySelectorAll('[data-start-plan]').forEach((btn) => btn.onclick = () => safely(dialog, () => {
      api.startSavedPlan(plans[Number(btn.dataset.startPlan)], Number(btn.dataset.planDay));
      dialog.close();
      refresh();
    }));
    dialog.querySelectorAll('[data-rename-plan]').forEach((btn) => btn.onclick = () => renameWorkout(plans[Number(btn.dataset.renamePlan)]));
    dialog.querySelectorAll('[data-edit-plan]').forEach((btn) => btn.onclick = () => savedPlanEditor(plans[Number(btn.dataset.editPlan)]));
    dialog.querySelectorAll('[data-preview]').forEach((btn) => btn.onclick = () => {
      const plan = plans[Number(btn.dataset.preview)];
      if (plan.kind === 'saved-workout') savedWorkoutPreview(plan);
      else savedPlanEditor(plan);
    });
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
    api.dialog(t('עבודת שרירים השבוע'), `${note('מיום ראשון לפי תאריך תחילת האימון. רק סטים שהושלמו עם זהות ספרייה מתועדת. זה אינו מדד התאוששות או גדילת שריר; סט יכול להופיע בכמה שרירים.')}
      <table class="training-work-map"><thead><tr><th>${t('שריר')}</th><th>${t('עיקרי')}</th><th>${t('משני')}</th></tr></thead>
      <tbody>${Object.entries(result.muscles).map(([muscle, count]) => `<tr><th>${t(muscle)}</th><td>${count.primary}</td><td>${count.secondary}</td></tr>`).join('')}</tbody></table>
      ${!Object.keys(result.muscles).length ? note('עדיין אין סטים עם מיפוי מאומת השבוע.') : ''}
      <p><span>${t('סטים ללא מיפוי מאומת')}</span>: ${result.unknownSets}</p>`);
  }
  function monthlyGoal() {
    const state = api.getState();
    const result = tools.monthlyGoalProgress(state.history, trainingSettings().monthlyGoal, new Date(), state.settings.weeklyGoal);
    const monthName = new Date(`${result.month}-01T12:00:00`).toLocaleDateString(i18n.locale(), { month: 'long', year: 'numeric' });
    const dialog = api.dialog(`${i18n.text('יעד חודשי אישי')} — ${monthName}`, `<p data-no-translate>${esc(monthName)}: ${result.count} ${i18n.text('אימונים שתועדו')}</p>
      <p data-no-translate>${i18n.text('ימים שנותרו בחודש (כולל היום)')}: ${result.daysRemaining} · ${i18n.text('יעד שבועי')}: ${result.weeklyGoal}</p>
      <p data-no-translate>${i18n.text('הצעה לאימונים נוספים עד סוף החודש')}: ${result.suggestedRemaining}</p>
      ${note('ההצעה מחושבת לפי היעד השבועי כפול מספר הימים שנותרו חלקי שבע, בעיגול כלפי מעלה. היא אינה לוח זמנים מחייב ולא משנה יעד שכבר שמרת.')}
      ${field('יעד אימונים לחודש הזה', `<input class="input" id="monthlyTarget" type="number" min="1" max="31" value="${result.target || result.suggestedTarget}">`)}
      <p id="monthlyRemainingTarget" data-no-translate></p>
      ${note('יעד לבחירתך, בלי דירוג או נקודות. חודש חדש מתחיל בלי חובה להשלים את הקודם.')}
      <div class="training-actions">${button('btnSaveMonthlyGoal', 'שמירת היעד', true)}${button('btnRemoveMonthlyGoal', 'ללא יעד חודשי')}</div>`);
    const remaining = () => {
      const target = Number(dialog.querySelector('#monthlyTarget').value);
      dialog.querySelector('#monthlyRemainingTarget').textContent = `${i18n.text('אימונים שנותרו להשגת היעד')}: ${Number.isInteger(target) && target >= 1 && target <= 31 ? Math.max(0, target - result.count) : '—'}`;
    };
    dialog.querySelector('#monthlyTarget').addEventListener('input', remaining);
    remaining();
    document.getElementById('btnSaveMonthlyGoal').onclick = () => safely(dialog, () => {
      const target = Number(document.getElementById('monthlyTarget').value);
      if (!Number.isInteger(target) || target < 1 || target > 31) throw new RangeError('Target must be 1–31');
      saveTraining({ monthlyGoal: { month: result.month, target } });
      dialog.close();
    });
    document.getElementById('btnRemoveMonthlyGoal').onclick = () => safely(dialog, () => { saveTraining({ monthlyGoal: null }); dialog.close(); });
  }

  let liveTicks = 0;
  let scrollingUntil = 0;
  const deferEstimates = () => { scrollingUntil = Date.now() + 350; };
  window.addEventListener('scroll', deferEstimates, { passive: true, capture: true });
  window.addEventListener('touchmove', deferEstimates, { passive: true });
  function refresh({ live = false } = {}) {
    if (!live || ++liveTicks % 5 === 0 && Date.now() > scrollingUntil) refreshDurationEstimates(api, document, { live });
    const t = i18n.text;
    const state = api.getState();
    if (!state.session) return;
    const current = tools.currentWorkoutEntry(state.session, state.exercises);
    const set = current?.sets?.find((set) => !set.completed);
    const exercise = current?.exerciseSnapshot || state.exercises.find((exercise) => exercise.id === current?.exerciseId);
    const write = (id, text) => { const node = document.getElementById(id); if (node.textContent !== text) node.textContent = text; };
    write('trainingCurrent', current ? `${t('עכשיו')}: ${i18n.exerciseName(current.exerciseName)}`
      : t(state.session.entries.some((entry) => entry.equipmentBusy && entry.sets?.some((set) => !set.completed))
        ? 'נותרו תרגילים שממתינים לציוד' : 'כל התרגילים הושלמו'));
    write('trainingTarget', current?.type === 'cardio' ? `${t('יעד זמן')}: ${Math.round(current.durationSec / 60)} ${t('דקות')}`
      : set ? `${t('סט')} ${current.sets.indexOf(set) + 1} / ${current.sets.length} · ${t('יעד')}: ${exercise?.inputType === 'hold'
        ? exercise.holdSeconds || 15 : api.repTarget(set, exercise) || '—'} ${t(exercise?.inputType === 'hold' ? 'שניות' : 'חזרות')}`
        : '');
    const listening = state.session.paused ? t('האימון בהפסקה — הטיימרים והספירה נעצרו') : !state.native ? ''
      : state.voiceActive ? t(state.counting ? 'ספירה קולית פעילה' : 'המיקרופון מקשיב') : t('המיקרופון אינו זמין או אינו פעיל');
    const rest = state.restSeconds > 0 ? `${t('מנוחה')}: ${Math.ceil(state.restSeconds)} ${t('שניות')}` : '';
    write('trainingListening', [listening, rest].filter(Boolean).join(' · '));
    if (live) return;
    write('trainingSessionStatus', state.session.timeBudget ? t('בחירת זמן פעילה באימון הזה בלבד — ניתן לשחזר את האימון המלא')
      : state.session.substitutions?.length ? t('החלפת ציוד פעילה באימון הזה בלבד — ניתן לשחזר בכרטיס התרגיל') : '');
    for (const [id, minutes] of [['btnTimeBudget', 30], ['btnTimeBudget60', 60], ['btnTimeBudget90', 90], ['btnFullWorkout', null]]) {
      document.getElementById(id).setAttribute('aria-pressed', String((state.session.timeBudget?.minutes || null) === minutes));
    }
    write('trainingPlanStatus', trainingSettings().activePlan ? t('תוכנית אישית פעילה. הבחירה הקודמת זמינה לשחזור בתוכניות שמורות.') : '');
    const monthly = tools.monthlyGoalProgress(state.history, trainingSettings().monthlyGoal, new Date(), state.settings.weeklyGoal);
    const monthName = new Date(`${monthly.month}-01T12:00:00`).toLocaleDateString(i18n.locale(), { month: 'long', year: 'numeric' });
    write('monthlyGoalStatus', monthly.target ? `${monthName}: ${monthly.count} / ${monthly.target} ${t('אימונים')} · ${monthly.percent}% · ${t('אימונים שנותרו להשגת היעד')}: ${monthly.remaining}` : '');
    document.querySelectorAll('#exerciseList .exercise-card[data-entry-index]').forEach((card) => {
      const entry = state.session.entries[Number(card.dataset.entryIndex)];
      if (!entry) return;
      const summary = card.querySelector('.workout-card-summary');
      if (summary) {
        const text = entry.equipmentBusy && entry.sets?.some((set) => !set.completed) ? t('ממתין לציוד')
          : entry.type === 'cardio' ? t(entry.completed ? 'בוצע' : 'יעד זמן') + ` · ${Math.round(entry.durationSec / 60)} ${t('דקות')}`
          : `${entry.sets.filter((set) => set.completed).length} / ${entry.sets.length} ${t('סטים הושלמו')}`;
        if (summary.textContent !== text) summary.textContent = text;
      }
      if (entry.type === 'cardio') return;
      const existingActions = card.querySelector('.training-equipment-actions');
      if (existingActions) {
        existingActions.classList.toggle('hidden', entry.sets.every((set) => set.completed)
          && !state.session.substitutions?.some((item) => item.replacementId === entry.exerciseId));
        const label = t(state.session.substitutions?.some((item) => item.replacementId === entry.exerciseId)
          ? 'שחזור התרגיל המקורי' : entry.equipmentBusy ? 'המכשיר התפנה?' : 'המכשיר תפוס');
        const button = existingActions.querySelector('button');
        if (button.textContent !== label) button.textContent = label;
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
      swap.textContent = t(substitution ? 'שחזור התרגיל המקורי' : entry.equipmentBusy ? 'המכשיר התפנה?' : 'המכשיר תפוס');
      swap.onclick = () => {
        if (!substitution) { equipmentBusy(entry.exerciseId); return; }
        const dialog = api.dialog(t('שחזור התרגיל המקורי'), `${note('הנתונים המקוריים יחזרו. אם כבר תיעדת משהו בחלופה, היא תישאר כתרגיל נפרד ללא איחוד משקלים.')}
          ${button('btnRestoreSwap', 'אישור שחזור', true)}`);
        document.getElementById('btnRestoreSwap').onclick = () => changedSession(dialog, (session) => tools.restoreSubstitution(session, entry.exerciseId));
        sessionNotice(dialog);
      };
      actions.appendChild(swap);
      card.querySelector('.exercise-head-right').prepend(actions);
    });
  }
  const interval = setInterval(() => {
    if (document.visibilityState === 'visible' && document.getElementById('tab-workout').classList.contains('active')) refresh({ live: true });
  }, 1000);
  const refreshDuration = () => refreshDurationEstimates(api);
  document.addEventListener('input', refreshDuration);
  document.addEventListener('change', refreshDuration);
  window.addEventListener('pagehide', () => {
    clearInterval(interval);
    window.removeEventListener('scroll', deferEstimates, true);
    window.removeEventListener('touchmove', deferEstimates);
  }, { once: true });
  refresh();
  return { refresh, refreshDuration, saveCurrentWorkout };
}
