import * as i18n from './i18n.js';
import { POLICY_VERSION, acceptLegalConsent, hasCurrentConsent, legalDocumentHTML } from './legal.js';

const t = (text) => i18n.text(text);
export function consentFormHTML() {
  return `<form class="legal-consent-form">
    <p class="legal-draft-warning">${t('טיוטה לבדיקה בלבד. השקה מסחרית דורשת השלמת פרטי עסק ואישור משפטי.')}</p>
    <div class="training-actions">
      <button type="button" class="btn btn-secondary" data-legal-doc="terms">${t('קריאת תנאי השימוש')}</button>
      <button type="button" class="btn btn-secondary" data-legal-doc="privacy">${t('קריאת מדיניות הפרטיות')}</button>
    </div>
    <p>${t('אפשר להשתמש בכינוי. גיל, מדדי גוף, תמונה, גיבוי והרשאות מערכת הם בחירה; אין צורך בחשבון חיצוני.')}</p>
    <label class="checkbox-row"><input type="checkbox" name="termsAccepted" required><span>${t('קראתי ואני מאשר/ת את טיוטת תנאי השימוש.')}</span></label>
    <label class="checkbox-row"><input type="checkbox" name="privacyAcknowledged" required><span>${t('קראתי את טיוטת מדיניות הפרטיות ואת הסבר השמירה והשיתוף.')}</span></label>
    <label class="checkbox-row"><input type="checkbox" name="healthDataConsent" required><span>${t('אני מסכים/ה לעיבוד מקומי של נתוני האימון והמדדים שאבחר להזין, שעשויים להיות מידע רגיש. גיבוי ושיתוף דורשים בחירה נפרדת.')}</span></label>
    <label class="field-label">${t('מסלול גיל')}</label>
    <select class="select" name="ageGroup" aria-label="${t('מסלול גיל')}" required>
      <option value="">${t('בחר מסלול גיל')}</option>
      <option value="adult">${t('גיל 18 ומעלה')}</option>
      <option value="minor">${t('גיל 12–17 — באישור הורה או אפוטרופוס')}</option>
    </select>
    <label class="checkbox-row hidden" data-adult-consent><input type="checkbox" name="adultConfirmed" disabled><span>${t('מלאו לי 18 שנים.')}</span></label>
    <div class="hidden" data-guardian-consent>
      <label class="checkbox-row"><input type="checkbox" name="guardianConfirmed" disabled><span>${t('אני הורה או אפוטרופוס של המשתמש/ת בגיל 12–17, נוכח/ת ומאשר/ת את השימוש ואת עיבוד הנתונים האופציונליים לפי הטיוטה.')}</span></label>
      <p class="field-hint">${t('זו הצהרה בלבד, לא אימות זהות או הורות. תוכניות כלליות אינן מותאמות במיוחד לילדים; נדרשת הכוונה מקצועית ופיקוח מבוגר.')}</p>
    </div>
    <p class="field-hint">${t('אין הסכמה לשיווק ואין רכישה באישור זה. אפשר לייצא או למחוק נתונים דרך ״פרטיות והנתונים שלי״ בתפריט.')}</p>
    <p class="privacy-form-status" role="alert"></p>
    <button type="submit" class="btn btn-primary">${t('אישור והמשך ללא רכישה')}</button>
    <div class="training-actions">
      <button type="button" class="btn btn-secondary" data-consent-export>${t('ייצוא נתונים קיימים ללא אישור הטיוטה')}</button>
      <button type="button" class="btn btn-secondary" data-consent-delete>${t('מחיקת נתונים ללא אישור הטיוטה')}</button>
    </div>
  </form>`;
}

export function createPrivacyUI(api) {
  let busy = false;
  const documentDialogs = new Set();
  const root = document.getElementById('privacySettingsCard');

  function openDocument(kind) {
    const dialog = api.dialog(t(kind === 'terms' ? 'תנאי שימוש' : 'מדיניות פרטיות'),
      `<div class="legal-document-slot">${legalDocumentHTML(kind, i18n.getLanguage())}</div>`);
    const item = { dialog, kind };
    documentDialogs.add(item);
    dialog.addEventListener('close', () => documentDialogs.delete(item), { once: true });
    return dialog;
  }

  function bindConsentForm(form, onAccepted) {
    const ageGroup = form.elements.namedItem('ageGroup');
    ageGroup.addEventListener('change', () => {
      for (const [group, field] of [['adult', 'adultConfirmed'], ['minor', 'guardianConfirmed']]) {
        const control = form.elements.namedItem(field);
        control.checked = false;
        control.disabled = ageGroup.value !== group;
        control.required = ageGroup.value === group;
        form.querySelector(group === 'adult' ? '[data-adult-consent]' : '[data-guardian-consent]')
          .classList.toggle('hidden', ageGroup.value !== group);
      }
    });
    form.querySelectorAll('[data-legal-doc]').forEach((button) =>
      button.addEventListener('click', () => openDocument(button.dataset.legalDoc)));
    const exportButton = form.querySelector('[data-consent-export]');
    exportButton.addEventListener('click', () => operation(exportButton, api.exportData));
    form.querySelector('[data-consent-delete]').addEventListener('click', requestDeletion);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (form.dataset.saving === 'true' || !form.reportValidity()) return;
      const button = form.querySelector('[type="submit"]');
      form.dataset.saving = 'true';
      button.disabled = true;
      const status = form.querySelector('.privacy-form-status');
      status.textContent = '';
      try {
        const choices = Object.fromEntries(['termsAccepted', 'privacyAcknowledged', 'healthDataConsent', 'adultConfirmed', 'guardianConfirmed']
          .map((key) => [key, form.elements.namedItem(key).checked]));
        choices.ageGroup = ageGroup.value;
        const current = api.getSettings();
        const next = acceptLegalConsent(current, choices, i18n.getLanguage());
        next.privacyPreferences = { ...current.privacyPreferences, cloudBackup: false };
        if (!current.onboardingComplete) {
          next.voiceCommandsEnabled = false;
          next.faceIdEnabled = false;
        }
        api.saveSettings(next);
        refresh();
        await onAccepted();
      } catch (error) {
        console.error('Privacy confirmation failed', error);
        status.textContent = t('האישור לא הושלם. הנתונים הקודמים לא נמחקו; בדוק את השגיאה ונסה שוב.');
      } finally {
        form.dataset.saving = 'false';
        button.disabled = false;
      }
    });
  }

  function reviewConsent() {
    const dialog = api.dialog(t('תנאים, פרטיות ובחירה'), consentFormHTML());
    return new Promise((resolve) => {
      let accepted = false;
      bindConsentForm(dialog.querySelector('form'), () => { accepted = true; dialog.close(); });
      dialog.addEventListener('close', () => resolve(accepted), { once: true });
    });
  }

  async function operation(button, callback) {
    if (busy) return;
    busy = true;
    button.disabled = true;
    try {
      await callback();
    } catch (error) {
      console.error('Privacy operation failed', error);
      api.toast(`${t('הפעולה לא הושלמה')}: ${error.message}`);
    } finally {
      busy = false;
      button.disabled = false;
      refresh();
    }
  }

  function requestDeletion() {
    const dialog = api.dialog(t('מחיקת נתוני AutoFit'), `
      <p>${t('יימחקו הפרופיל, התמונות המקומיות, התוכניות השמורות, ההיסטוריה והאימון הנוכחי במכשיר הזה. הפעולה אינה ניתנת לביטול.')}</p>
      <p>${t('אפשר לייצא קובץ לפני המחיקה. מחיקה אינה מבטלת מינוי ב-App Store ואינה מוחקת רשומות מ-Apple Health או קבצים שכבר שותפו.')}</p>
      <div class="training-actions"><button type="button" class="btn btn-secondary privacy-export-first">${t('ייצוא הנתונים לפני מחיקה')}</button></div>
      ${api.isNative() ? `<label class="checkbox-row"><input type="checkbox" class="privacy-delete-cloud"><span>${t('לבקש גם מחיקת גיבוי AutoFit ב-iCloud. זהו משלוח בקשה, לא אישור מחיקה מכל השרתים והמכשירים.')}</span></label>` : ''}
      <form class="privacy-delete-form">
        <label class="checkbox-row"><input type="checkbox" required><span>${t('הבנתי שהנתונים יימחקו ושמינוי, נתוני Health ועותקים חיצוניים אינם נמחקים בפעולה זו.')}</span></label>
        <p class="privacy-deletion-status" role="alert"></p>
        <button type="submit" class="btn btn-danger">${t('מחק את נתוני AutoFit מהמכשיר')}</button>
      </form>`);
    const exportButton = dialog.querySelector('.privacy-export-first');
    exportButton.addEventListener('click', () => operation(exportButton, api.exportData));
    const form = dialog.querySelector('.privacy-delete-form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const button = form.querySelector('button');
      operation(button, async () => {
        try {
          await api.eraseData({ cloud: dialog.querySelector('.privacy-delete-cloud')?.checked === true });
        } catch (error) {
          dialog.querySelector('.privacy-deletion-status').textContent = t('המחיקה לא הושלמה. בקשות ענן שכבר נשלחו לא בוטלו. אפשר לייצא את הנתונים שנותרו ולנסות שוב.');
          throw error;
        }
      });
    });
  }

  function refresh() {
    const status = root.querySelector('.privacy-consent-status');
    const settings = api.getSettings();
    status.textContent = hasCurrentConsent(settings)
      ? `${t('אישור טיוטה שמור במכשיר')}: ${POLICY_VERSION} · ${new Date(settings.legalConsent.acceptedAt).toLocaleString(i18n.locale())}`
      : t('הטיוטה החדשה טרם אושרה. נתונים קיימים לא נמחקים. גיבוי רגיש חדש ל-iCloud מושהה.');
    const cloudButton = root.querySelector('.privacy-cloud-export');
    cloudButton.disabled = busy || !api.isNative();
    root.querySelector('.privacy-cloud-status').textContent = t(!api.isNative()
      ? 'בדפדפן הנתונים מקומיים. iCloud ו-Apple Health דורשים את אפליקציית האייפון.'
      : 'גיבוי רגיש חדש ל-iCloud מושהה לפי כללי Apple. עותקים קודמים לא נמחקו; אפשר לייצא אותם בקריאה בלבד.');
    for (const { dialog, kind } of documentDialogs) {
      if (dialog.isConnected) dialog.querySelector('.legal-document-slot').innerHTML = legalDocumentHTML(kind, i18n.getLanguage());
    }
  }

  root.querySelectorAll('[data-legal-doc]').forEach((button) =>
    button.addEventListener('click', () => openDocument(button.dataset.legalDoc)));
  root.querySelector('.privacy-review').addEventListener('click', reviewConsent);
  const exportButton = root.querySelector('.privacy-export');
  exportButton.addEventListener('click', () => operation(exportButton, api.exportData));
  const cloudButton = root.querySelector('.privacy-cloud-export');
  cloudButton.addEventListener('click', async () => {
    if (!hasCurrentConsent(api.getSettings()) && !await reviewConsent()) return;
    await operation(cloudButton, api.exportCloudData);
  });
  root.querySelector('.privacy-delete').addEventListener('click', requestDeletion);
  document.querySelectorAll('[data-open-privacy]').forEach((button) => button.addEventListener('click', () => openDocument('privacy')));
  refresh();
  return { openDocument, bindConsentForm, reviewConsent, refresh };
}
