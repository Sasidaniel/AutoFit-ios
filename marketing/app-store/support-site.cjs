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

function createBuild52Notice(listing) {
  if (listing.referenceBuild !== '1.0 (52)'
    || listing.referenceSource !== '93bce49bf3f5aed3d9daf023d3ff31673e9f9035'
    || listing.submissionRequest?.ownerAuthorizedReviewSubmission !== true
    || listing.submissionRequest.newBinaryUploadAuthorized !== false) {
    throw new Error('Public build-52 notice requires the approved existing binary and current submission authorization');
  }
  const { config } = policySource();
  if (!config.operatorLegalName?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.privacyEmail)) {
    throw new Error('Confirmed public operator and privacy contact are required');
  }
  const sections = [
    ['על מי ועל מה ההודעה חלה', 'Operator and scope',
      'הודעה זו מתארת את AutoFit ל-iOS, גרסה 1.0 בנייה 52, ואת אתר התמיכה. פרטי הקשר העדכניים מופיעים כאן גם אם במסמכים שבבנייה המותקנת עדיין מופיע סימון טיוטה. פרסום הודעה זו אינו מעדכן את האפליקציה המותקנת או משנה הסכמות שנשמרו במכשיר.',
      'This notice describes AutoFit for iOS, version 1.0 build 52, and its support website. It provides current contact information even where documents in the installed build still carry a draft label. Publishing this notice does not update the installed app or change locally recorded consent.'],
    ['נתונים מקומיים', 'Local records',
      'האפליקציה שומרת במכשיר את התוכניות, התרגילים, הסטים, המשקלים, החזרות, משכי הזמן, ההערות, היעדים והיסטוריית האימונים שבחרתם לתעד. אפשר להזין שם או כינוי, גיל, גובה, משקל ותמונה; נתונים אלו עשויים להיות רגישים. בחירת המין משמשת להתאמת המלל. בניית תוכניות והמלצות נעשית לפי כללים מקומיים, ללא שירות AI חיצוני. אין חובה ליצור חשבון AutoFit בשרת, ואין באפליקציה מערכת פרסום או מכירה של נתוני האימון.',
      'The app stores your chosen plans, exercises, sets, loads, repetitions, durations, notes, goals and workout history on your device. You may enter a name or nickname, age, height, weight and photo; these records may be sensitive. The gender selection personalizes wording. Plans and recommendations use local rules, not an external AI service. A server-hosted AutoFit account is not required. The app has no advertising system and does not sell workout records.'],
    ['פנייה לתמיכה ו-Formspree', 'Contact submissions and Formspree',
      'שליחת טופס יצירת הקשר היא פעולה יזומה ואינה דרושה לאימון. הטופס שולח את השם, כתובת האימייל ותוכן הפנייה שהזנתם ל-Formspree לצורך מסירת הפנייה וטיפול בה. השירות עשוי לשמור גם כתובת IP, פרטי דפדפן, זמני גישה ונתוני בקשה לצורכי תפעול, אבטחה וניתוח השירות. נתוני הפנייה מזוהים לפי הפרטים שמסרתם. אין לשלוח סיסמאות, קודי אימות, פרטי תשלום או מידע רפואי. אפשר לפנות ישירות באימייל במקום להשתמש בטופס.',
      'Sending Contact is optional and is not required for workouts. The form sends your entered name, email address and message to Formspree for delivery and handling of your request. The service may also retain IP address, browser details, access times and request information for operation, security and service analysis. Your submission is identifiable through the details you supply. Do not send passwords, verification codes, payment details or medical information. You may email us directly instead of using the form.'],
    ['שמירת פניות והעברות בין מדינות', 'Contact retention and international processing',
      'פניות עשויות להישמר אצל Formspree ובתיבת הדואר לאחר שנשלחו; מחיקת האפליקציה אינה מוחקת אותן. האפליקציה אינה מגדירה תפוגה אוטומטית לפניות שנשלחו. Formspree מתארת עיבוד בארצות הברית ובמדינות פעילות נוספות ושמירה לצורכי מתן השירות, אבטחה ודרישות דין. ניתן לבקש בירור, תיקון או מחיקה באמצעות כתובת הקשר כאן; ייתכנו חריגים הנדרשים לפי דין או עותקים שכבר נמסרו לספקים. אין כאן הבטחה שכל עותק יימחק מיד.',
      'Submitted requests may remain in Formspree and the receiving mailbox; uninstalling the app does not erase them. The app does not configure automatic expiry of submitted requests. Formspree describes processing in the United States and other countries where it operates, and retention for service delivery, security and legal requirements. Contact us here to request information, correction or deletion; legal exceptions and copies held by service providers may apply. Immediate deletion of every copy is not guaranteed.'],
    ['שירותי Apple והרשאות', 'Apple services and permissions',
      'Apple Health הוא חיבור אופציונלי עם הרשאה נפרדת. עריכה או מחיקה ב-AutoFit אינה מוחקת או מעדכנת אוטומטית אימון שכבר נכתב לבריאות. פקודות קוליות דורשות הרשאות מיקרופון וזיהוי דיבור: האפליקציה אינה שומרת קובצי הקלטה, אך עיבוד הדיבור עשוי להשתמש בשירותי Apple ולא תמיד מתבצע במכשיר בלבד. ניתן להמשיך בהזנה ידנית. Face ID או Touch ID מבוצעים במערכת; AutoFit אינה מקבלת תבניות ביומטריות. שליטה ב-Apple Music היא לפי הרשאה ובחירה, ללא איסוף של ספריית מוזיקה או היסטוריית האזנה. מידע בפעילות חיה ובהתראות עשוי להיות גלוי למי שרואה את המסך.',
      'Apple Health is optional and separately authorized. Editing or deleting AutoFit records does not automatically update or erase workouts already written to Health. Voice commands require microphone and speech permission: the app does not save recording files, but recognition may use Apple services and is not guaranteed to stay on-device. Manual entry remains available. Face ID or Touch ID is handled by the system; AutoFit does not receive biometric templates. Apple Music controls are permission-based and optional, without collecting your music library or listening history. Live Activity and notification information may be visible to someone who can see your screen.'],
    ['גיבוי, שיתוף וקישורים', 'Backup, sharing and links',
      'כתיבות חדשות של נתוני אימון רגישים ל-iCloud מושבתות. עותקים ישנים אינם נמחקים אוטומטית וניתן לשחזרם רק במסלול המפורש שבאפליקציה. גיבויי מכשיר עצמאיים עשויים להכיל עותקים נוספים. ייצוא ושיתוף נעשים בפעולה שלכם ועלולים לכלול מדדים ותמונות; בחרו יעד מהימן. קישורי וידאו ושירותים חיצוניים נפתחים רק בפעולה שלכם; אין טעינה מראש של סרטונים או תמונות ממוזערות מרוחקות. השירות החיצוני עשוי לקבל נתוני רשת ודפדפן לפי מדיניותו.',
      'New writes of sensitive workout records to iCloud are disabled. Older copies are not automatically deleted and recovery uses the explicit flow in the app. Independent device backups may contain additional copies. Exports and sharing are initiated by you and may contain measurements and photos; choose a trusted destination. External video and service links open only on your action; remote videos and thumbnails are not preloaded. External services may receive network and browser information under their own policies.'],
    ['שליטה בנתונים ואבטחה', 'Your controls and security',
      'אפשר לערוך נתונים, לייצא JSON או למחוק את נתוני AutoFit דרך ״הנתונים שלי״ בתפריט. רשומות מקומיות נשמרות עד מחיקה, ניקוי אחסון או הסרת האפליקציה. אפשר לבטל הרשאות בהגדרות iOS ולהימנע מתמונות, משיתוף ומפניות. בקשת מחיקת גיבוי iCloud אינה אישור שכל מכשיר מחק את עותקיו. ניהול נתוני Apple Health וקבצים שכבר שותפו נעשה בנפרד. השתמשו בנעילת מכשיר ובמכשיר מהימן; אחסון מקומי אינו הבטחה לכספת מוצפנת נפרדת. פנו אלינו לבקשות עיון, תיקון, מחיקה או שאלות על זכויות לפי הדין החל.',
      'Use “My data” in the menu to edit records, export JSON or erase AutoFit data. Local records remain until deletion, storage clearing or uninstalling. Revoke permissions in iOS Settings and omit optional photos, sharing or contact submissions. A cloud-erasure request is not proof every device has erased its copies. Manage Health records and previously shared files separately. Use a device lock and trusted device; local storage is not a promise of a separately encrypted vault. Contact us for access, correction, erasure or questions about rights under applicable law.'],
    ['גיל והגבלות הבנייה הקיימת', 'Age and existing-build limitations',
      'דירוג החנות הוגדר ל-18+; Apple עשויה להציג דירוג אזורי אחר ובמערכות שלפני גרסה 26 מופיע דירוג 17+. בנייה 52 עדיין מכילה מסלול הצהרה מקומית להורה או אפוטרופוס בגיל 12–17. אין אימות גיל, זהות או הורות, ודירוג חנות אינו מנגנון לאכיפת גיל בתוך האפליקציה. אין למסור פרטים של ילד בטופס התמיכה. אם יש חשש שנמסרו פרטים כאלה, פנו אלינו לבירור ומחיקה אפשרית.',
      'The store override is 18+; Apple may show a regional equivalent and uses 17+ on operating systems before version 26. Build 52 still contains a local parent/guardian declaration flow for ages 12–17. Age, identity and guardianship are not verified; a store rating is not an in-app age-enforcement mechanism. Do not submit a child’s personal details through support. Contact us to investigate and request possible deletion if such details were submitted.'],
    ['אתר זה ועדכונים', 'This website and updates',
      'האתר מספק תמיכה ומידע בלבד ואינו מכיל טופס פנייה, כלי ניתוח או קוד מעקב של AutoFit. האירוח ב-GitHub Pages עשוי ליצור יומני בקשות אצל GitHub לפי מדיניותה. שירותי Apple, Formspree ואתרי וידאו כפופים גם למדיניותם. תאריך ההודעה מופיע בראש העמוד; שינוי הודעה באתר אינו מעדכן הסכמה או קוד באפליקציה המותקנת.',
      'This website provides support and information only and contains no AutoFit contact form, analytics or tracking scripts. GitHub Pages hosting may produce request logs held by GitHub under its policy. Apple, Formspree and external video services also apply their own policies. The notice date appears above; changing this website does not update consent or code in an installed app.'],
  ];
  const pages = {};
  for (const language of ['he', 'en']) {
    const he = language === 'he', suffix = he ? '' : '-en';
    const choose = (a, b) => he ? a : b;
    for (const kind of ['support', 'privacy']) {
      const title = kind === 'support' ? choose('תמיכה ב-AutoFit', 'AutoFit support')
        : choose('מדיניות פרטיות ל-AutoFit', 'AutoFit privacy notice');
      const content = kind === 'privacy' ? sections.map((row) =>
        `<section><h2>${escape(row[he ? 0 : 1])}</h2><p>${escape(row[he ? 2 : 3])}</p></section>`).join('\n')
        : `<section><h2>${choose('איך נוכל לעזור?', 'How can we help?')}</h2>
<p>${choose('לתמיכה, דיווח תקלה ושאלות פרטיות, כתבו לאימייל שלהלן. ציינו את גרסת האפליקציה, גרסת iOS והצעדים לשחזור התקלה. אין לשלוח סיסמאות, קודי אימות, פרטי תשלום או מידע רפואי; הסתירו מידע אישי בצילומי מסך.',
          'For support, bug reports and privacy questions, email us below. Include your app version, iOS version and reproduction steps. Do not send passwords, verification codes, payment details or medical information; hide personal information in screenshots.')}</p></section>
<section><h2>${choose('תחילת הדרך והרשאות', 'Getting started and permissions')}</h2>
<p>${choose('אין חובה ליצור חשבון AutoFit. בדקו ואשרו הצעת תוכנית לפני הפעלה. הממשק בעברית ובאנגלית; פקודות קוליות באייפון זמינות בעברית ודורשות הרשאות מיקרופון וזיהוי דיבור. תמיד אפשר להזין סטים ידנית. Apple Health, מוזיקה ונעילה ביומטרית הם חיבורים נפרדים לפי הרשאה.',
          'An AutoFit account is not required. Review a proposed plan before activating it. The interface supports Hebrew and English; iPhone voice commands support Hebrew and require microphone and speech permissions. Manual set entry remains available. Health, music and biometric lock are separately authorized features.')}</p></section>
<section><h2>${choose('הנתונים שלכם', 'Your records')}</h2>
<p>${choose('דרך ״הנתונים שלי״ בתפריט אפשר לייצא JSON או למחוק רשומות מקומיות. מחיקה אינה מוחקת אוטומטית נתוני Health או קבצים שכבר שותפו. זהו כלי לכושר כללי, לא שירות חירום, אבחון או ייעוץ רפואי.',
          'Use “My data” in the menu to export JSON or erase local records. Deletion does not automatically erase Health records or previously shared files. This is a general fitness tool, not an emergency service, diagnosis or medical advice.')}</p></section>`;
      pages[`${kind}${suffix}.html`] = `<!doctype html>
<html lang="${language}" dir="${he ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f7f5ef;color:#172321;font:17px/1.8 system-ui,sans-serif}main,nav{max-width:850px;margin:auto;padding:24px}nav{display:flex;justify-content:space-between}a{color:#176147;text-underline-offset:4px}h1,h2{line-height:1.4}section{margin:24px 0;padding:24px;background:white;border-radius:20px;overflow-wrap:anywhere}footer{border-top:1px solid #d5dbd4;padding-top:20px}@media(max-width:480px){main,nav,section{padding:18px}}</style></head>
<body><nav><b>AutoFit</b><a href="${kind}${he ? '-en' : ''}.html" lang="${he ? 'en' : 'he'}">${he ? 'English' : 'עברית'}</a></nav><main><h1>${title}</h1>
<p>${choose('עודכן', 'Updated')}: 2026-11-09 · iOS 1.0 (52)</p><p>${choose('מפעיל פרטי', 'Individual operator')}: ${escape(config.operatorLegalName)} · <a href="mailto:${escape(config.privacyEmail)}">${escape(config.privacyEmail)}</a></p>
${content}<footer><a href="support${suffix}.html">${choose('תמיכה', 'Support')}</a> · <a href="privacy${suffix}.html">${choose('פרטיות', 'Privacy')}</a>
<p><a href="https://formspree.io/legal/privacy-policy/">Formspree privacy</a> · <a href="https://www.apple.com/legal/privacy/">Apple privacy</a> · <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">GitHub privacy</a></p></footer></main></body></html>`;
    }
  }
  pages['index.html'] = pages['support.html'];
  pages['.nojekyll'] = '';
  return pages;
}

if (require.main === module) {
  const outputIndex = process.argv.indexOf('--output');
  if (outputIndex < 0 || !process.argv[outputIndex + 1]) throw new Error('Provide --output with the site output directory');
  const pages = process.argv.includes('--build52-notice')
    ? createBuild52Notice(JSON.parse(fs.readFileSync(path.join(__dirname, 'listing.json'), 'utf8')))
    : createSupportPages({ allowDraft: process.argv.includes('--review-only') });
  const output = path.resolve(process.argv[outputIndex + 1]);
  fs.mkdirSync(output, { recursive: true });
  for (const [file, html] of Object.entries(pages)) fs.writeFileSync(path.join(output, file), html);
  const mode = process.argv.includes('--build52-notice') ? 'existing-build factual notice'
    : process.argv.includes('--review-only') ? 'local draft review' : 'approved policies';
  console.log(`Created ${Object.keys(pages).length} site files; mode=${mode}`);
}
module.exports = { createSupportPages, createBuild52Notice };
