const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..', '..');
const escape = (value) => String(value).replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function policySource() {
  const context = vm.createContext({});
  for (const file of ['commercial-config.js', 'legal.js']) {
    const source = fs.readFileSync(path.join(root, 'www', 'js', file), 'utf8');
    vm.runInContext(source.replace(/^import .*$/gm, '').replace(/^export /gm, ''), context);
  }
  return vm.runInContext('({ config: COMMERCIAL_CONFIG, draft: POLICY_IS_DRAFT, version: POLICY_VERSION, render: legalDocumentHTML })', context);
}

function createSupportPages({ allowDraft = false } = {}) {
  const policy = policySource();
  const draft = policy.draft || policy.version.includes('draft');
  if (!allowDraft && (draft || !policy.config.termsApproved || !policy.config.privacyApproved)) {
    throw new Error('Public support-site publication refused: policies are not final and approved');
  }
  const pages = {};
  for (const language of ['he', 'en']) {
    const he = language === 'he', suffix = he ? '' : '-en';
    const text = (hebrew, english) => he ? hebrew : english;
    const email = policy.config.privacyEmail;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('A confirmed public contact email is required');
    const title = text('תמיכה ב-AutoFit', 'AutoFit support');
    const support = `<h1>${title}</h1><p>${text('העוזר האישי והשותף שלך באימון.', 'Your personal workout partner.')}</p>
      <section><h2>${text('איך נוכל לעזור?', 'How can we help?')}</h2>
      <p>${text('לתמיכה, דיווח תקלה ושאלות פרטיות:', 'For support, bug reports and privacy questions:')}
      <a href="mailto:${escape(email)}">${escape(email)}</a></p>
      <p>${text('בפנייה על תקלה כדאי לציין את גרסת האפליקציה, גרסת iOS והפעולות שקדמו לתקלה. אל תשלחו סיסמאות, קודי אימות, פרטי תשלום או מידע רפואי. אם מצרפים צילום מסך, הסתירו מידע אישי.', 'For a bug report, include the app version, iOS version and the steps leading to the issue. Do not send passwords, verification codes, payment details or medical information. Hide personal information in screenshots.')}</p>
      <p>${text('אין כאן שירות חירום, אבחון או ייעוץ רפואי.', 'This is not an emergency service, diagnosis or medical advice.')}</p></section>
      <section><h2>${text('תחילת הדרך', 'Getting started')}</h2>
      <p>${text('אין חובה ליצור חשבון AutoFit. בחרו תוכנית קיימת או בנו הצעה לפי מטרה, זמן, סביבה וציוד. בדקו ואשרו לפני הפעלת תוכנית; היא אינה מחליפה אוטומטית את הבחירה הקיימת.', 'An AutoFit account is not required. Choose an existing plan or build a proposal around your goal, time, training environment and equipment. Review and confirm before activating a plan; proposals do not automatically replace your existing selection.')}</p></section>
      <section><h2>${text('שליטה קולית והרשאות', 'Voice control and permissions')}</h2>
      <p>${text('הממשק זמין בעברית ובאנגלית; פקודות קוליות זמינות כרגע בעברית באפליקציית iOS. הן דורשות הרשאות מיקרופון וזיהוי דיבור. אם ההאזנה נעצרת, בדקו את המצב המוצג ואת אפשרות ההתאוששות. תמיד אפשר להזין נתונים ידנית. אפשר לשנות הרשאות בהגדרות iOS.', 'The interface supports Hebrew and English; voice commands currently support Hebrew in the iOS app. They require microphone and speech-recognition permissions. If listening stops, check the displayed status and recovery action. Manual entry remains available. Change permissions in iOS Settings.')}</p></section>
      <section><h2>${text('הנתונים שלכם', 'Your records')}</h2>
      <p>${text('נתוני האימון נשמרים מקומית. דרך ״הנתונים שלי״ בתפריט אפשר לייצא קובץ JSON או למחוק נתוני AutoFit. ייצוא עשוי להכיל מדדים ותמונות: שמרו אותו במקום שבחרתם וסמכתם עליו. מחיקה אינה מוחקת קבצים שכבר שותפו או אימונים שכבר נשמרו ב-Apple Health.', 'Workout records are stored locally. Use “My data” in the menu to export a JSON file or erase AutoFit records. Exports may contain measurements and photos: store them in a destination you trust. Deletion does not erase previously shared files or workouts already saved to Apple Health.')}</p>
      <p>${text('כתיבה חדשה של מידע רגיש ל-iCloud מושבתת. עותקים ישנים אינם נמחקים אוטומטית; ייצוא או שחזור קודם הם פעולות נפרדות ומפורשות. שמירה במכשיר אינה אישור לגיבוי חיצוני.', 'New sensitive-data iCloud writes are disabled. Older copies are not automatically deleted; legacy export or recovery requires a separate explicit action. Saving on your device is not confirmation of an external backup.')}</p></section>
      <section><h2>${text('Apple Health ו-Apple Music', 'Apple Health and Apple Music')}</h2>
      <p>${text('שמירת אימון בבריאות דורשת הרשאה נפרדת. עריכה מאוחרת ב-AutoFit אינה מעדכנת אוטומטית אימון שנשלח לבריאות. לשליטה במוזיקה, בחרו תחילה שיר או רשימה בנגן ואשרו גישה בעת הבקשה; מוזיקה ומנוי אינם כלולים באפליקציה.', 'Saving workouts to Health requires separate permission. Later AutoFit edits do not automatically update workouts already sent to Health. For music controls, first choose a song or playlist in your player and grant access when requested; music and subscriptions are not included.')}</p></section>
      <section><h2>${text('פרטיות ותנאי שימוש', 'Privacy and terms')}</h2><p>
      <a href="privacy${suffix}.html">${text('מדיניות פרטיות', 'Privacy notice')}</a> ·
      <a href="terms${suffix}.html">${text('תנאי שימוש', 'Terms of use')}</a></p></section>`;
    for (const kind of ['support', 'privacy', 'terms']) {
      const heading = kind === 'support' ? title : kind === 'privacy' ? text('מדיניות פרטיות', 'Privacy notice') : text('תנאי שימוש', 'Terms of use');
      const content = kind === 'support' ? support : policy.render(kind, language, {
        ...policy.config, operatorDisplayName: he ? policy.config.operatorDisplayName : policy.config.operatorLegalName,
      });
      if (!allowDraft && content.includes('class="legal-draft-warning"')) {
        throw new Error('Public support-site publication refused: authored policy still identifies itself as a draft');
      }
      pages[`${kind}${suffix}.html`] = `<!doctype html>
<html lang="${language}" dir="${he ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${draft ? '<meta name="robots" content="noindex,nofollow">' : ''}<title>${heading} · AutoFit</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f7f5ef;color:#172321;font:17px/1.8 system-ui,sans-serif}main,nav{max-width:850px;margin:auto;padding:24px}nav{display:flex;justify-content:space-between;align-items:center}nav b{font-size:27px}a{color:#176147;text-underline-offset:4px}h1{font-size:clamp(30px,7vw,46px);line-height:1.2}h2,h3{line-height:1.4}section{margin:26px 0;padding:24px;background:white;border-radius:20px;overflow-wrap:anywhere}p{overflow-wrap:anywhere}.review-note,.legal-draft-warning{padding:16px;border:1px solid #b99243;background:#fff2cf;border-radius:12px}footer{margin-top:30px;font-size:14px;border-top:1px solid #d5dbd4;padding-top:20px}.legal-document>h2{font-size:32px}@media(max-width:480px){main,nav{padding:18px}section{padding:18px}}</style></head>
<body><nav><b>AutoFit</b><a href="${kind}${he ? '-en' : ''}.html" lang="${he ? 'en' : 'he'}">${he ? 'English' : 'עברית'}</a></nav><main>
${draft ? `<p class="review-note">${text('תצוגה מקומית לאישור בלבד. המסמכים עדיין טיוטה; אלה אינם קישורי תמיכה או פרטיות שפורסמו.', 'Local review only. Policies remain drafts; these are not published support or privacy URLs.')}</p>` : ''}
${content}<footer><p>${escape(he ? policy.config.operatorDisplayName : policy.config.operatorLegalName)} · <a href="mailto:${escape(email)}">${escape(email)}</a></p>
<a href="support${suffix}.html">${text('לעמוד התמיכה', 'Support home')}</a></footer></main></body></html>`;
    }
  }
  return pages;
}

if (require.main === module) {
  const outputIndex = process.argv.indexOf('--output');
  if (outputIndex < 0 || !process.argv[outputIndex + 1]) throw new Error('Provide --output with the site output directory');
  const pages = createSupportPages({ allowDraft: process.argv.includes('--review-only') });
  const output = path.resolve(process.argv[outputIndex + 1]);
  fs.mkdirSync(output, { recursive: true });
  for (const [file, html] of Object.entries(pages)) fs.writeFileSync(path.join(output, file), html);
  console.log(`Created ${Object.keys(pages).length} support/policy pages; review-only=${process.argv.includes('--review-only')}`);
}
module.exports = { createSupportPages };
