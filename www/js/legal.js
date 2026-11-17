import { COMMERCIAL_CONFIG } from './commercial-config.js';

export const POLICY_VERSION = '2026-11-17-v1';
export const PERSONAL_DATA_KEYS = Object.freeze([
  'ft_exercises_v1', 'ft_workouts_v1', 'ft_settings_v1', 'ft_active_session_v1', 'ft_profile_v1',
]);
export const CLOUD_ERASURE_KEY = 'ft_privacy_erasure_v1';
const escape = (value) => String(value).replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const pair = (he, en) => [he, en];

const PRIVACY = [
  [pair('גיל', 'Age'), [
    pair('AutoFit מיועדת לבני 18 ומעלה. נדרשת הצהרת גיל לפני תחילת השימוש; זו הצהרה עצמית ולא אימות זהות. אין מסלול הרשמה לקטינים או אישור הורה. הזנת גיל מדויק היא בחירה. אין לשלוח פרטים של ילד דרך התמיכה; אם נשלחו פרטים כאלה, פנו אלינו לבירור ולבקשת מחיקה.',
      'AutoFit is intended for adults aged 18 or older. An age declaration is required before use; it is a self-declaration, not identity verification. There is no minor registration or parent-approval flow. Entering an exact age is optional. Do not send a child’s personal details through support; contact us to investigate and request deletion if such details were submitted.'),
  ]],
  [pair('מי מפעיל את האפליקציה', 'Who operates the app'), [
    pair('AutoFit מופעלת על ידי ששי דניאל / Sasi Daniel, כמפעיל פרטי ולא כחברה. לתמיכה, בקשות פרטיות ומימוש זכויות אפשר לפנות אל autofitrainer@gmail.com או דרך ״יצירת קשר״ באפליקציה. מדיניות זו מתארת את הנתונים והשירותים שבהם האפליקציה משתמשת.',
      'AutoFit is operated by Sasi Daniel as an individual, not a company. For support, privacy requests and exercising your rights, contact autofitrainer@gmail.com or use Contact in the app. This notice describes the records and services the app uses.'),
  ]],
  [pair('איזה מידע נשמר ולמה', 'What is stored and why'), [
    pair('שם או כינוי, גיל, גובה, משקל, היסטוריית משקל ותמונה נשמרים אם בוחרים להזין אותם ואינם חובה. שדה המין נדרש בהגדרה הראשונית ובשמירת הפרטים; אפשר לבחור כללי, זכר או נקבה. הבחירה משמשת להתאמת המלל בלבד, לא לשינוי תוכניות או יעדי אימון. תוכניות, בחירת ציוד, תרגילים אישיים, סטים, עומסים, חזרות, החזקות, הערות, דירוגי קושי, משך אימון, יעדים והיסטוריה משמשים לניהול האימון ולהצגת תיעוד והמלצות מקומיות. נתוני כושר ומדדים עשויים להיות מידע רגיש.',
      'A name or nickname, age, height, weight, weight history and photo are stored when you choose to enter them and are optional. The gender field is required during initial setup and when saving profile details; you can choose General, Male or Female. This choice only personalizes wording; it does not change workout plans or targets. Programs, equipment choices, custom exercises, sets, loads, repetitions, holds, notes, difficulty ratings, duration, goals and history support workout tracking and local recommendations. Fitness records and measurements may be sensitive information.'),
    pair('נתוני האפליקציה נשמרים באחסון המקומי של המכשיר או של אתר זה בדפדפן. אין כיום חשבון AutoFit בשרת, מערכת פרסום, מכירת נתוני אימון או שירות AI חיצוני לבניית תוכניות. המלצות מחושבות לפי כללים מקומיים, אינן החלטה רפואית ואינן משנות תוכנית בלי אישור.',
      'App data is kept in device storage or this website’s browser storage. There is currently no server-hosted AutoFit account, advertising system, sale of workout data or external AI service for creating plans. Recommendations use local rules, are not medical decisions and do not change a program without confirmation.'),
  ]],
  [pair('iCloud וגיבוי', 'iCloud and backup'), [
    pair('כתיבות חדשות של נתוני אימון רגישים ל-iCloud מושבתות בהתאם לכלל Apple 5.1.3(ii). עותקים שנוצרו בגרסאות קודמות אינם נמחקים אוטומטית. אפשר לייצא אותם במפורש, או לשחזר עותק קודם במכשיר ללא נתוני אימון מקומיים, אחרי אישור וללא הפעלת כתיבות חדשות לענן. שחזור אינו מחליף היסטוריה מקומית קיימת.',
      'New sensitive-data iCloud writes are disabled under Apple rule 5.1.3(ii). Copies created by older versions are not automatically erased. You can explicitly export them or recover an old copy on a device without local workout records, after confirmation and without enabling new cloud writes. Recovery does not replace existing local history.'),
    pair('iCloud הוא שירות של Apple. קריאת גיבוי קודם עשויה להחזיר עותק מקומי שממתין לעדכון, ולא מאשרת שהוא העותק האחרון בשרת. הודעת ״נשמר במכשיר״ אינה אישור גיבוי. גיבויי מערכת עצמאיים ומכשירים אחרים עשויים להכיל עותקים נוספים. ייצוא קובץ אפשרי בבחירתכם; שמרו אותו ביעד מהימן.',
      'iCloud is an Apple service. Reading a legacy backup may return a local copy awaiting refresh, not a verified latest server copy. “Saved on device” is not a backup receipt. Independent system backups and other devices may contain additional copies. You can choose to export a file; keep it in a trusted destination.'),
  ]],
  [pair('Apple Health, קול והרשאות', 'Apple Health, voice and permissions'), [
    pair('שליטה ב-Apple Music היא בחירה נפרדת באייפון. הרשאת המוזיקה מתבקשת רק בלחיצה על כפתור ההרשאה. AutoFit קוראת את מצב הניגון ומשהה או ממשיכה אותו לפי לחיצה מפורשת; אינה קוראת, שומרת או מעלה את ספריית המוזיקה, שמות השירים או היסטוריית ההאזנה ואינה מחליפה את תור הניגון. אפשר להשתמש באימון ובפקודות הקוליות גם ללא הרשאה זו.',
      'Apple Music controls are a separate optional iPhone feature. Music permission is requested only when you tap the permission button. AutoFit reads playback state and pauses or resumes on explicit taps; it does not read, store or upload your music library, song titles or listening history, and does not replace the playback queue. Workouts and voice commands remain available without this permission.'),
    pair('חיבור ל-Apple Health הוא אופציונלי ודורש הרשאת מערכת נפרדת. האפליקציה יכולה לקרוא את הנתונים שהורשו ולכתוב אימון לפי ההרשאות והתכונות הזמינות. סטטוס הסנכרון בסיכום מבדיל בין כתיבה שאושרה, המתנה ותקלה. פתיחת קיצור דרך בדפדפן אינה אישור מסירה ל-Health. לא משתמשים בנתוני Health לפרסום או למכירת מידע.',
      'Apple Health is optional and requires separate system authorization. The app can read authorized data and write workouts according to the available permissions and features. The summary distinguishes confirmed writes, pending delivery and errors. Opening a browser Shortcut is not proof of Health delivery. Health data is not used for advertising or sold.'),
    pair('פקודות קוליות דורשות אישור מיקרופון וזיהוי דיבור. AutoFit אינה שומרת קובצי הקלטה; טקסט מזוהה משמש לפקודות ולדיווחי סטים. מסלול העיבוד של זיהוי הדיבור תלוי ביכולות ובהרשאות של iOS ושירותי Apple; אין הבטחה שכל הזיהוי מתבצע במכשיר. Face ID/Touch ID מבוצעים על ידי המערכת; האפליקציה אינה מקבלת תבניות ביומטריות. התראות ומידע במסך נעילה/פעילות חיה עשויים להיות גלויים למי שרואה את המסך.',
      'Voice commands require microphone and speech-recognition permission. AutoFit does not store audio recordings; recognized text is used for commands and set reports. Speech processing depends on iOS capabilities and Apple services; on-device-only recognition is not guaranteed. Face ID/Touch ID are performed by the system; the app does not receive biometric templates. Notifications and lock-screen/Live Activity information may be visible to someone who can see the screen.'),
    pair('אפשר לדלג על הרשאות ולהמשיך בהזנה ידנית. ניתן לשנות הרשאות בהגדרות המכשיר. מחיקת נתוני AutoFit אינה מוחקת אוטומטית אימונים שכבר נכתבו ל-Apple Health; כתיבה שכבר נשלחה ל-Health עשויה להסתיים גם אחרי המחיקה. יש לנהל רשומות אלו בנפרד באפליקציית בריאות.',
      'You can skip permissions and use manual entry. Permissions can be changed in device settings. Deleting AutoFit data does not automatically delete workouts already written to Apple Health; a write already sent to Health can also finish after deletion. Manage those records separately in Health.'),
  ]],
  [pair('קישורים, שיתוף ויצירת קשר', 'Links, sharing and contact'), [
    pair('איורים והנחיות נשמרים מקומית. סרטוני הדרכה וקישורי ספקים נפתחים רק בפעולה שלך ומעבירים אותך לשירות חיצוני, אשר עשוי לקבל כתובת IP ונתוני דפדפן לפי מדיניותו. אין טעינה אוטומטית של סרטונים או תמונות ממוזערות מרוחקות. שיתוף קובץ נעשה דרך אפשרויות השיתוף שבחרת; ייצוא עלול להכיל מידע רגיש ותמונות.',
      'Illustrations and instructions are local. Instructional videos and provider links open only on your action and take you to an external service, which may receive your IP address and browser information under its own policy. Videos and remote thumbnails are not preloaded. Files are shared through your chosen sharing destination; exports can contain sensitive records and photos.'),
    pair('שליחת טופס ״יצירת קשר״ היא בחירה ואינה נדרשת לאימון. הטופס מעביר ל-Formspree את השם, האימייל וההודעה שהזנת לצורך מסירת הפנייה וטיפול בה. השירות עשוי לשמור גם כתובת IP, פרטי דפדפן, זמני גישה ונתוני בקשה לצורכי תפעול, אבטחה וניתוח השירות. אין לשלוח סיסמאות, קודי אימות, פרטי תשלום או מידע רפואי. אפשר לפנות ישירות באימייל במקום בטופס.',
      'Contact is optional and is not required for workouts. The form sends your entered name, email and message to Formspree for delivery and handling of your request. The service may also retain IP address, browser details, access times and request information for operation, security and service analysis. Do not send passwords, verification codes, payment details or medical information. You may email us directly instead of using the form.'),
    pair('פניות עשויות להישמר אצל Formspree ובתיבת הדואר לאחר שנשלחו; מחיקת האפליקציה אינה מוחקת אותן. האפליקציה אינה מגדירה תפוגה אוטומטית לפניות. Formspree מתארת עיבוד בארצות הברית ובמדינות פעילות נוספות ושמירה לצורכי מתן השירות, אבטחה ודרישות דין. פנו אלינו לבקשת עיון, תיקון או מחיקה; ייתכנו חריגים לפי דין ועותקים אצל ספקים. אין הבטחה שכל עותק יימחק מיד.',
      'Submitted requests may remain in Formspree and the receiving mailbox; uninstalling the app does not erase them. The app does not configure automatic expiry of requests. Formspree describes processing in the United States and other countries where it operates, and retention for service delivery, security and legal requirements. Contact us for access, correction or deletion; legal exceptions and provider copies may apply. Immediate deletion of every copy is not guaranteed.'),
  ]],
  [pair('חשבונות ותשלומים', 'Identity and payments'), [
    pair('האפליקציה זמינה לשימוש ללא רכישה, מינוי או חשבון AutoFit בשרת. אין מגבלת ניסיון בזמן ואין צורך בחשבון Apple או Google לצורך האימון. AutoFit אינה אוספת סיסמת Apple או Google בטופס שלה או מספר כרטיס תשלום.',
      'The app is available without a purchase, subscription or server-hosted AutoFit account. There is no time-limited trial and no Apple or Google account is required for workouts. AutoFit does not collect your Apple or Google password in its own form or a payment card number.'),
  ]],
  [pair('בחירה, זכויות, שמירה ומחיקה', 'Choices, rights, retention and deletion'), [
    pair('מסירת מדדים, תמונות, גיבוי, הרשאות ושיתוף היא בחירה. לצורך תיעוד אימונים מקומי יש לעבד את הנתונים שבחרת לתעד. מסך האישור מבקש בנפרד אישור לתנאים, עיון במדיניות והסכמה לעיבוד נתוני האימון והמדדים שבחרת להזין. אין הסכמה מוקדמת מסומנת ואין הסכמה לשיווק. גרסת המסמכים, השפה, מועד האישור והבחירות נשמרים במכשיר. אישור ישן אינו הופך אוטומטית לאישור מסמך חדש.',
      'Measurements, photos, backup, permissions and sharing are optional. Local workout logging requires processing the records you choose to enter. The confirmation screen separately asks for agreement to the terms, acknowledgment of the privacy notice and consent to processing the workout data and measurements you choose to provide. Consent is not preselected and no marketing consent is requested. The document version, language, confirmation date and choices are stored locally. Old consent is not automatically converted to consent to a new document.'),
    pair('אפשר לערוך את הפרופיל והנתונים באפליקציה ולייצא את כל נתוני האפליקציה לקובץ JSON דרך ״הנתונים שלי״ בתפריט. נתונים מקומיים נשמרים עד מחיקה על ידך, ניקוי אחסון או הסרת האפליקציה. כלי המחיקה מאפשר למחוק נתונים מקומיים ולבקש בנפרד מחיקת גיבוי iCloud של AutoFit. מסירת בקשת מחיקה ל-iCloud אינה הוכחה שכל המכשירים והגיבויים מחקו מיד את העותקים.',
      'You can edit your profile and records in the app and export all app data as JSON through "My data" in the menu. Local records remain until you delete them, clear storage or uninstall. The deletion tool can erase local app data and separately request deletion of AutoFit’s iCloud backup. Sending an iCloud deletion request is not proof that every device and backup has immediately erased its copies.'),
    pair('אפשר להפסיק שיתופים עתידיים, לבטל הרשאות במערכת ולייצא או למחוק נתונים. משיכת הסכמה להמשך עיבוד נתונים שנשמרים מקומית נעשית באמצעות מחיקתם והפסקת השימוש בתכונה. לפי הדין החל עשויות להיות זכויות עיון, תיקון, מחיקה, הגבלה, התנגדות וניידות וכן הגשת תלונה לרשות מוסמכת. פנו לכתובת הפרטיות לעזרה; כדי לטפל בבקשה ייתכן שנצטרך פרטים שיאפשרו לזהות את הפנייה, אך אין לשלוח סיסמאות או מידע רפואי.',
      'You can stop future sharing, revoke system permissions, and export or delete data. To withdraw consent to further processing of locally retained records, delete them and stop using that feature. Depending on applicable law, rights may include access, correction, erasure, restriction, objection, portability and complaints to a competent authority. Contact the privacy email for help; identifying a request may require additional details, but do not send passwords or medical information.'),
  ]],
  [pair('אבטחה והעברות בין מדינות', 'Security and international transfers'), [
    pair('השתמשו בנעילת המכשיר ובמכשיר מהימן. אחסון הדפדפן אינו כספת מוצפנת נפרדת של AutoFit; אדם עם גישה לפרופיל הדפדפן עשוי להגיע לנתונים. iCloud, Health וספקים חיצוניים כפופים להגנות ולתנאים שלהם. אין אבטחה מוחלטת. קישורים לשירות חיצוני עשויים להעביר נתונים למדינה אחרת; פתחו אותם ושתפו נתונים רק לפי בחירתכם.',
      'Use a device lock and a trusted device. Browser storage is not a separately encrypted AutoFit vault; someone with access to the browser profile may access its records. iCloud, Health and external services are subject to their own safeguards and terms. Security cannot be guaranteed absolutely. External links may transfer information to another country; open them and share records only by your choice.'),
  ]],
];

const TERMS = [
  [pair('המפעיל והשימוש באפליקציה', 'Operator and use of the app'), [
    pair('AutoFit מופעלת על ידי ששי דניאל / Sasi Daniel, כמפעיל פרטי. האפליקציה מספקת תכנון ותיעוד אימונים ללא תשלום, מינוי או הגבלת ניסיון בזמן. אין צורך בחשבון AutoFit בשרת. לתמיכה ולשאלות על התנאים: autofitrainer@gmail.com.',
      'AutoFit is operated by Sasi Daniel as an individual. The app provides workout planning and logging without payment, a subscription or a time-limited trial. A server-hosted AutoFit account is not required. For support and questions about these terms: autofitrainer@gmail.com.'),
  ]],
  [pair('מטרת האפליקציה ושימוש בטוח', 'Purpose and safe use'), [
    pair('AutoFit היא כלי לתיעוד ותכנון אימוני כושר כלליים. תוכניות אוטומטיות, הוראות, תמונות, אומדני זמן והמלצות מבוססים על מידע חלקי וכללים כלליים; אינם אבחון, טיפול, ייעוץ רפואי או תחליף למאמן מוסמך הבודק אותך ואת סביבת האימון. אין הבטחה לירידה במשקל, עלייה בשריר, מניעת פציעה או תוצאה מסוימת.',
      'AutoFit is a tool for general fitness planning and logging. Generated plans, instructions, illustrations, time estimates and recommendations use limited inputs and general rules; they are not diagnosis, treatment, medical advice or a substitute for a qualified trainer assessing you and your environment. No weight-loss, muscle-growth, injury-prevention or other specific outcome is guaranteed.'),
    pair('בחר עומס, טווח תנועה וציוד שמתאימים ליכולתך. בדוק יציבות ותקינות ציוד ופעל לפי הוראות היצרן; אין לאלתר עוגנים או לעלות על כיסא. אין להמשיך דרך כאב, סחרחורת או סימנים חריגים. אם יש מגבלה, מחלה, היריון, פציעה או ספק לגבי התאמה, קבל ייעוץ מקצועי מתאים לפני אימון. אל תפעיל את האפליקציה באופן שמסכן אותך או אחרים.',
      'Choose loads, ranges of motion and equipment appropriate to your ability. Check equipment stability and condition and follow its manufacturer’s instructions; do not improvise anchors or stand on a chair. Do not continue through pain, dizziness or unusual symptoms. If you have a limitation, condition, pregnancy, injury or uncertainty about suitability, seek appropriate professional advice before exercise. Do not operate the app in a way that endangers yourself or others.'),
  ]],
  [pair('גיל, פרטים והרשאות', 'Age, information and permissions'), [
    pair('השימוש מיועד לבני 18 ומעלה, ונדרשת הצהרה עצמית על כך; אין אימות זהות או מסלול אישור הורה. פרטי גוף, גיל מדויק ותמונה אינם חובה וניתן להשתמש בכינוי. הרשאות בריאות, קול, מוזיקה, התראות ו-Face ID נפרדות ואפשר לדלג עליהן. ניתן לתעד אימון ידנית גם ללא הרשאות אלה.',
      'Use is intended for adults aged 18 or older and requires a self-declaration; there is no identity verification or parent-approval flow. Body measurements, exact age and a photo are optional and you may use a nickname. Health, voice, music, notification and Face ID permissions are separate and may be skipped. Manual workout logging remains available without those permissions.'),
  ]],
  [pair('נתונים, גיבוי ואמינות', 'Records, backup and reliability'), [
    pair('אתה מחליט אילו נתונים לתעד ואילו תוכניות להפעיל. אומדני זמן אינם התחייבות; מנוחה, תורים, קצב ומצב הציוד משנים את משך האימון. השוואות דורשות תיעוד מתאים ואינן הוכחת שינוי פיזיולוגי. ודא נתוני סטים לפני שמירה. מומלץ לייצא גיבוי; אחסון דפדפן, גיבוי iCloud וכתיבה ל-Health עלולים להיכשל, ואין לראות בשמירה מקומית אישור מסירה לשירות אחר.',
      'You decide what to record and which programs to activate. Time estimates are not promises; rests, queues, pace and equipment availability change workout duration. Comparisons need suitable records and do not prove a physiological change. Check set details before saving. Exporting a backup is recommended; browser storage, iCloud backup and Health delivery can fail, and a local save does not confirm delivery to another service.'),
  ]],
  [pair('חשבונות וספקים חיצוניים', 'Identity and external services'), [
    pair('שימוש מקומי אינו מחייב חשבון חיצוני. Apple, Google, Formspree, שירותי וידאו ויעדי שיתוף פועלים לפי התנאים והמדיניות שלהם. אין למסור סיסמאות דרך טופס פנייה. חיבור ספק אינו כשלעצמו סנכרון נתונים בין מכשירים. מחיקת נתוני AutoFit אינה מוחקת חשבון Apple או Google, נתוני Health או עותקים שכבר שותפו.',
      'Local use does not require an external account. Apple, Google, Formspree, video services and sharing destinations operate under their own terms and policies. Do not provide passwords through Contact. A provider connection does not itself synchronize records across devices. Deleting AutoFit data does not delete an Apple or Google account, Health records or previously shared copies.'),
  ]],
  [pair('מחיר וזכויות צרכניות', 'Price and consumer rights'), [
    pair('השימוש בתכונות האפליקציה אינו דורש רכישה או מינוי. אישור תנאים אלה אינו מבצע רכישה ואינו מעניק הסכמה לחיוב עתידי או לשיווק. אין בתנאים אלה לגרוע מזכויות צרכניות מחייבות לפי הדין החל.',
      'Using the app’s features does not require a purchase or subscription. Accepting these terms does not make a purchase or authorize future billing or marketing. These terms do not restrict mandatory consumer rights under applicable law.'),
  ]],
  [pair('תוכן ושימוש הוגן', 'Content and acceptable use'), [
    pair('התוכן האישי שלך נשאר שלך. אין להעלות תמונות או טקסט שאין לך זכות להשתמש בהם, להפיץ קוד מזיק, לנסות לגשת לנתונים של אחרים או לעקוף מנגנוני תשלום ואבטחה. איורים מקוריים וקוד האפליקציה אינם רישיון להעתקת תוכן מוגן של צדדים שלישיים. קישורי סרטונים אינם מעבירים בעלות או זכויות בתוכן המקושר.',
      'Your personal content remains yours. Do not upload images or text you are not authorized to use, distribute malicious code, access others’ records or bypass payment or security mechanisms. Original illustrations and app code do not grant rights to copy third-party protected content. Video links do not transfer ownership or rights in linked content.'),
  ]],
  [pair('אחריות, שינויים ופנייה', 'Responsibility, changes and contact'), [
    pair('האפליקציה עשויה להשתנות ולהכיל תקלות. אין בתנאים ויתור על אחריות או זכות שלא ניתן להגביל לפי דין, ואין בהם פטור מרשלנות או מחובה חוקית. דווחו לתמיכה על תקלה והימנעו מהסתמכות על מדידה שידוע שאינה נכונה.',
      'The app may change and may contain defects. These terms do not waive liability or rights that cannot lawfully be limited, or exempt negligence or statutory duties. Report problems to support and do not rely on a measurement you know is incorrect.'),
    pair('שינוי מהותי בתנאים או במדיניות יזוהה בגרסה חדשה ובבקשת עיון או הסכמה חדשה לפי הצורך. ניתן לקרוא את המסמכים דרך ״פרטיות״ בתפריט גם ללא הרשאות. לפניות השתמשו ב״יצירת קשר״. אפשר לייצא נתונים לפני מחיקה; סירוב לתנאים מעודכנים אינו מוחק היסטוריה אוטומטית.',
      'Material changes to terms or privacy will receive a new version and a request to review or consent where appropriate. Documents are available through "Privacy" in the menu without optional permissions. Use Contact for questions. You can export before deletion; declining updated terms does not automatically erase history.'),
  ]],
];

export function legalDocumentHTML(kind, language = 'he', config = COMMERCIAL_CONFIG) {
  if (!['privacy', 'terms'].includes(kind)) throw new Error('Unknown legal document');
  const side = language === 'en' ? 1 : 0;
  const text = (he, en) => side ? en : he;
  const title = kind === 'privacy' ? text('מדיניות פרטיות', 'Privacy notice') : text('תנאי שימוש', 'Terms of use');
  const sections = kind === 'privacy' ? PRIVACY : TERMS;
  return `<article class="legal-document" lang="${side ? 'en' : 'he'}" dir="${side ? 'ltr' : 'rtl'}" data-no-translate>
    <h2>${title}</h2>
    <p>${text('גרסת מסמך', 'Document version')}: <b>${POLICY_VERSION}</b></p>
    <p>${text('יוצר האפליקציה', 'App creator')}: ${escape(config.operatorDisplayName)}</p>
    ${config.operatorLegalName?.trim() ? `<p>${text('מפעיל', 'Operator')}: ${escape(config.operatorLegalName)}</p>` : ''}
    ${config.privacyEmail?.trim() ? `<p>${text('אימייל לתמיכה ופרטיות', 'Support and privacy email')}: ${escape(config.privacyEmail)}</p>` : ''}
${config.businessAddress?.trim() ? `<p>${text('כתובת', 'Address')}: ${escape(config.businessAddress)}</p>` : ''}
    ${sections.map(([heading, paragraphs]) => `<section><h3>${escape(heading[side])}</h3>${paragraphs.map((paragraph) => `<p>${escape(paragraph[side])}</p>`).join('')}</section>`).join('')}
    <p>${text('המסמכים זמינים גם ללא חיבור לרשת.', 'These documents are also available offline.')}</p>
  </article>`;
}

export function hasCurrentConsent(settings) {
  const receipt = settings?.legalConsent;
  return receipt?.version === POLICY_VERSION && receipt.documentStatus === 'published'
    && receipt.termsAccepted === true && receipt.privacyAcknowledged === true
    && receipt.healthDataConsent === true
    && receipt.ageGroup === 'adult' && receipt.adultConfirmed === true && receipt.guardianConfirmed === false
    && typeof receipt.acceptedAt === 'string' && Number.isFinite(Date.parse(receipt.acceptedAt));
}

export function acceptLegalConsent(settings, choices, language, now = new Date()) {
  const ageGroup = choices?.ageGroup ?? (choices?.adultConfirmed === true ? 'adult' : null);
  if (!choices || ['termsAccepted', 'privacyAcknowledged', 'healthDataConsent'].some((key) => choices[key] !== true)
    || ageGroup !== 'adult' || choices.adultConfirmed !== true
    || choices.guardianConfirmed !== undefined && choices.guardianConfirmed !== false) {
    throw new Error('Explicit separate confirmations are required');
  }
  if (!['he', 'en'].includes(language) || !Number.isFinite(now.getTime())) throw new Error('Invalid consent metadata');
  const receipt = { version: POLICY_VERSION, documentStatus: 'published', acceptedAt: now.toISOString(),
    language, termsAccepted: true, privacyAcknowledged: true, healthDataConsent: true,
    ageGroup, adultConfirmed: true, guardianConfirmed: false };
  return { ...settings, legalConsent: receipt,
    legalConsentHistory: [...(Array.isArray(settings.legalConsentHistory) ? settings.legalConsentHistory : []), receipt] };
}

export function profileAgeAllowed(settings, age) {
  if (age === '') return true;
  const number = Number(age);
  return Number.isInteger(number) && number >= 18 && number <= 120 && hasCurrentConsent(settings);
}

export function cloudRestoreAllowed(settings) {
  return hasCurrentConsent(settings) && settings.privacyPreferences?.cloudRestore === true;
}

export function exportPersonalData(storage, now = new Date()) {
  const records = {};
  for (const key of PERSONAL_DATA_KEYS) {
    const value = storage.getItem(key);
    records[key] = value === null ? null : JSON.parse(value);
  }

  return { format: 'AutoFit personal data', formatVersion: 1, exportedAt: now.toISOString(), records };
}

export function exportLegacyCloudData(all, now = new Date()) {
  if (!all || typeof all !== 'object' || Array.isArray(all)) throw new Error('Invalid iCloud response');
  if (all[CLOUD_ERASURE_KEY]) throw new Error('This backup was marked for deletion; it will not be restored or exported');
  const records = {};
  for (const key of PERSONAL_DATA_KEYS) {
    records[key] = all[key] == null ? null : JSON.parse(all[key]);
  }
  if (Object.values(records).every((value) => value === null)) throw new Error('No backup data received yet. Allow iCloud to refresh and try again.');
  return { format: 'AutoFit legacy iCloud personal data', formatVersion: 1,
    exportedAt: now.toISOString(), latestServerCopyVerified: false, records };
}

export function eraseLocalPersonalData(storage) {
  const previous = PERSONAL_DATA_KEYS.map((key) => [key, storage.getItem(key)]);
  try {
    for (const key of PERSONAL_DATA_KEYS) storage.removeItem(key);
  } catch (error) {
    const rollbackErrors = [];
    for (const [key, value] of previous) {
      try {
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
        console.error('Privacy deletion rollback failed', key, rollbackError);
      }
    }
    if (rollbackErrors.length) throw new AggregateError([error, ...rollbackErrors], 'Data deletion and rollback did not complete');
    throw error;
  }
}

export function restorableCloudData(all, localSettings) {
  if (!all || typeof all !== 'object' || Array.isArray(all)) throw new Error('Invalid iCloud response');
  if (all[CLOUD_ERASURE_KEY]) return { erased: true, records: [] };
  const records = PERSONAL_DATA_KEYS.filter((key) => all[key] != null).map((key) => {
    if (typeof all[key] !== 'string') throw new Error('Invalid iCloud data');
    let value = JSON.parse(all[key]);
    if (key === 'ft_settings_v1') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid iCloud settings');
      value = { ...value, language: localSettings.language, legalConsent: localSettings.legalConsent,
        legalConsentHistory: localSettings.legalConsentHistory, privacyPreferences: localSettings.privacyPreferences,
        onboardingComplete: localSettings.onboardingComplete === true, faceIdEnabled: localSettings.faceIdEnabled,
        voiceCommandsEnabled: localSettings.voiceCommandsEnabled };
    }
    if (['ft_exercises_v1', 'ft_workouts_v1'].includes(key) && !Array.isArray(value)) throw new Error('Invalid iCloud records');
    if (['ft_profile_v1', 'ft_active_session_v1'].includes(key)
      && value !== null && (typeof value !== 'object' || Array.isArray(value))) throw new Error('Invalid iCloud record');
    return [key, JSON.stringify(value)];
  });
  return { erased: false, records };
}
