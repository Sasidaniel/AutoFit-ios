import { COMMERCIAL_CONFIG } from './commercial-config.js';

export const POLICY_VERSION = 'commercial-draft-2';
export const PERSONAL_DATA_KEYS = Object.freeze([
  'ft_exercises_v1', 'ft_workouts_v1', 'ft_settings_v1', 'ft_active_session_v1', 'ft_profile_v1',
]);
export const CLOUD_ERASURE_KEY = 'ft_privacy_erasure_v1';
const escape = (value) => String(value).replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const pair = (he, en) => [he, en];

const PRIVACY = [
  [pair('גיל ואישור הורה או אפוטרופוס', 'Age and parent or guardian declaration'), [
    pair('מסלול הסקירה מיועד לגיל 12–120. בגיל 12–17 נדרשת הצהרה של הורה או אפוטרופוס שהוא מאשר את השימוש ואת עיבוד הנתונים האופציונליים. האישור וקבוצת הגיל נשמרים במכשיר; אין אימות זהות או הורות ואין איסוף שם או תעודה של ההורה. הרשאות ושיתוף נשארים בחירה נפרדת. לפני הפצה לקטינים נדרשת בדיקה משפטית של הסכמה תקפה, זכויות קטינים ודרישות כל מדינת הפצה.',
      'The review flow is intended for ages 12–120. Ages 12–17 require a parent or legal guardian to declare approval of use and processing of optional data. The declaration and age group are stored locally; identity and guardianship are not verified and no parent name or identity document is collected. Permissions and sharing remain separate choices. Distribution to minors requires legal review of valid consent, children’s rights and each territory’s requirements.'),
  ]],
  [pair('מי מפעיל את האפליקציה', 'Who operates the app'), [
    pair('AutoFit נוצרה על ידי ששי דניאל. שם הישות המשפטית, כתובת העסק וכתובת פרטיות ייעודית טרם אושרו לפרסום מסחרי. אפשר לפנות כעת דרך ״יצירת קשר״ באפליקציה. אין להציג טיוטה זו כמדיניות מסחרית מאושרת.',
      'AutoFit was created by Sasi Daniel. The legal entity, business address and dedicated privacy contact have not yet been confirmed for a commercial launch. You can currently use Contact in the app. This draft must not be represented as an approved commercial policy.'),
  ]],
  [pair('איזה מידע נשמר ולמה', 'What is stored and why'), [
    pair('שם או כינוי, גיל, גובה, משקל, היסטוריית משקל ותמונה נשמרים אם בוחרים להזין אותם ואינם חובה. שדה המין נדרש בהגדרה הראשונית ובשמירת הפרטים; אפשר לבחור כללי, זכר או נקבה. הבחירה משמשת להתאמת המלל בלבד, לא לשינוי תוכניות או יעדי אימון. תוכניות, בחירת ציוד, תרגילים אישיים, סטים, עומסים, חזרות, החזקות, הערות, דירוגי קושי, משך אימון, יעדים והיסטוריה משמשים לניהול האימון ולהצגת תיעוד והמלצות מקומיות. נתוני כושר ומדדים עשויים להיות מידע רגיש.',
      'A name or nickname, age, height, weight, weight history and photo are stored when you choose to enter them and are optional. The gender field is required during initial setup and when saving profile details; you can choose General, Male or Female. This choice only personalizes wording; it does not change workout plans or targets. Programs, equipment choices, custom exercises, sets, loads, repetitions, holds, notes, difficulty ratings, duration, goals and history support workout tracking and local recommendations. Fitness records and measurements may be sensitive information.'),
    pair('נתוני האפליקציה נשמרים באחסון המקומי של המכשיר או של אתר זה בדפדפן. אין כיום חשבון AutoFit בשרת, מערכת פרסום, מכירת נתוני אימון או שירות AI חיצוני לבניית תוכניות. המלצות מחושבות לפי כללים מקומיים, אינן החלטה רפואית ואינן משנות תוכנית בלי אישור.',
      'App data is kept in device storage or this website’s browser storage. There is currently no server-hosted AutoFit account, advertising system, sale of workout data or external AI service for creating plans. Recommendations use local rules, are not medical decisions and do not change a program without confirmation.'),
  ]],
  [pair('iCloud וגיבוי', 'iCloud and backup'), [
    pair('גיבוי חדש של הנתונים הרגישים ל-iCloud מושהה בגרסת הסקירה בהתאם לכלל Apple 5.1.3(ii), האוסר שמירת מידע בריאותי אישי ב-iCloud. עותקים שנוצרו בגרסאות קודמות אינם נמחקים אוטומטית. אפשר לייצא אותם במפורש, או לשחזר עותק קודם במכשיר ללא נתוני אימון מקומיים, אחרי אישור וללא הפעלת כתיבות חדשות לענן. שחזור אינו מחליף היסטוריה מקומית קיימת.',
      'New sensitive-data iCloud backups are paused in the review version under Apple rule 5.1.3(ii), which prohibits storing personal health information in iCloud. Copies created by older versions are not automatically erased. You can explicitly export them or recover an old copy on a device without local workout records, after confirmation and without enabling new cloud writes. Recovery does not replace existing local history.'),
    pair('iCloud הוא שירות של Apple. קריאת גיבוי קודם עשויה להחזיר עותק מקומי שממתין לעדכון, ולא מאשרת שהוא העותק האחרון בשרת. הודעת ״נשמר במכשיר״ אינה אישור גיבוי. גיבויי מערכת עצמאיים ומכשירים אחרים עשויים להכיל עותקים נוספים. לפני השקה מסחרית יש לאמת במכשיר גם החרגת אחסון בריאותי מגיבויי מערכת ותכנון גיבוי חלופי מותר.',
      'iCloud is an Apple service. Reading a legacy backup may return a local copy awaiting refresh, not a verified latest server copy. “Saved on device” is not a backup receipt. Independent device backups and other devices may contain additional copies. Before commercial launch, exclusion of sensitive local storage from system backups and a permissible alternative backup design also need on-device verification.'),
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
    pair('שליחת טופס ״יצירת קשר״ מעבירה ל-Formspree את השם, האימייל וההודעה שהזנת לצורך טיפול בפנייה, וייתכן גם מידע טכני הנדרש להפעלת השירות. אין לשלוח סיסמאות, פרטי תשלום או מידע רפואי בטופס. זמני השמירה ומיקומי העיבוד אצל ספקים דורשים השלמת בדיקה והסכמים לפני השקה מסחרית.',
      'Submitting Contact sends your entered name, email and message to Formspree to handle the request, potentially with technical information needed to operate that service. Do not send passwords, payment details or medical information. Provider retention, processing locations and agreements require further review before commercial launch.'),
  ]],
  [pair('חשבונות ותשלומים', 'Identity and payments'), [
    pair('אין חובה להתחבר לחשבון Apple או Google כדי להתאמן. Gmail הוא חשבון Google, לא מנגנון סיסמה נוסף של AutoFit. חיבור ספק, כאשר יוגדר ויהיה זמין, יוצג בנפרד ואינו מבטיח סנכרון בין מכשירים או יצירת חשבון בשרת. לא אוספים סיסמת Apple או Google בטופס של AutoFit. בגרסת הסקירה רכישות אינן פעילות.',
      'An Apple or Google connection is not required for workouts. Gmail uses a Google account, not an additional AutoFit password system. A provider connection, when configured and available, is identified separately and does not imply cross-device sync or a server-hosted account. AutoFit does not collect your Apple or Google password in its own form. Purchases are inactive in this review version.'),
    pair('אם יופעלו מינויים בעתיד, Apple תנהל את התשלום והרכישה דרך App Store. אין צורך למסור לאפליקציה מספר כרטיס. מחיר, תקופה, זכאות לתקופת היכרות, חידוש וביטול יוצגו לפני רכישה. מחיקת נתוני האפליקציה או ניתוק חשבון אינם מבטלים מינוי ב-App Store.',
      'If subscriptions are enabled later, Apple will handle purchases and payments through the App Store. You do not need to give the app a card number. Price, period, introductory eligibility, renewal and cancellation will be shown before purchase. Deleting app data or disconnecting an identity does not cancel an App Store subscription.'),
  ]],
  [pair('בחירה, זכויות, שמירה ומחיקה', 'Choices, rights, retention and deletion'), [
    pair('מסירת מדדים, תמונות, גיבוי, הרשאות ושיתוף היא בחירה. לצורך תיעוד אימונים מקומי יש לעבד את הנתונים שבחרת לתעד. מסך האישור מבקש בנפרד אישור לתנאים, עיון במדיניות והסכמה לעיבוד נתוני האימון והמדדים שבחרת להזין. אין הסכמה מוקדמת מסומנת ואין הסכמה לשיווק. הסכמה בגרסת הסקירה מתועדת כהסכמה לטיוטה, לא לאישור משפטי סופי.',
      'Measurements, photos, backup, permissions and sharing are optional. Local workout logging requires processing the records you choose to enter. The confirmation screen separately asks for agreement to the terms, acknowledgment of the privacy notice and consent to processing the workout data and measurements you choose to provide. Consent is not preselected and no marketing consent is requested. Review-version consent is recorded as draft consent, not final legal approval.'),
    pair('אפשר לערוך את הפרופיל והנתונים באפליקציה ולייצא את כל נתוני האפליקציה לקובץ JSON דרך ״הנתונים שלי״ בתפריט. נתונים מקומיים נשמרים עד מחיקה על ידך, ניקוי אחסון או הסרת האפליקציה. כלי המחיקה מאפשר למחוק נתונים מקומיים ולבקש בנפרד מחיקת גיבוי iCloud של AutoFit. מסירת בקשת מחיקה ל-iCloud אינה הוכחה שכל המכשירים והגיבויים מחקו מיד את העותקים.',
      'You can edit your profile and records in the app and export all app data as JSON through "My data" in the menu. Local records remain until you delete them, clear storage or uninstall. The deletion tool can erase local app data and separately request deletion of AutoFit’s iCloud backup. Sending an iCloud deletion request is not proof that every device and backup has immediately erased its copies.'),
    pair('אפשר להפסיק גיבוי ושיתופים עתידיים, לבטל הרשאות במערכת ולייצא או למחוק נתונים. משיכת הסכמה להמשך עיבוד נתונים שנשמרים מקומית נעשית באמצעות מחיקתם והפסקת השימוש בתכונה. לפי הדין החל עשויות להיות זכויות עיון, תיקון, מחיקה, הגבלה, התנגדות וניידות וכן הגשת תלונה לרשות מוסמכת. ניתן לפנות דרך ״יצירת קשר״; דרכי מימוש, פרטי המפעיל ובסיסי העיבוד בכל מדינת שיווק מחייבים אישור משפטי לפני השקה.',
      'You can stop future backup and sharing, revoke system permissions, and export or delete data. To withdraw consent to further processing of locally retained records, delete them and stop using that feature. Depending on applicable law, rights may include access, correction, erasure, restriction, objection, portability and complaints to a competent authority. You can use Contact; request procedures, operator details and processing grounds for each distribution territory require legal approval before launch.'),
  ]],
  [pair('אבטחה והעברות בין מדינות', 'Security and international transfers'), [
    pair('השתמש בנעילת המכשיר ובמכשיר מהימן. אחסון הדפדפן אינו כספת מוצפנת נפרדת של AutoFit; אדם עם גישה לפרופיל הדפדפן עשוי להגיע לנתונים. iCloud, Health וספקים חיצוניים כפופים להגנות ולתנאים שלהם. אין אבטחה מוחלטת. יש להשלים מיפוי ספקים, אבטחת מידע, נוהל אירועים, תנאי העברה ושמירת מידע בהתאמה לישראל ולמדינות ההפצה לפני פרסום מסחרי.',
      'Use a device lock and a trusted device. Browser storage is not a separately encrypted AutoFit vault; someone with access to the browser profile may access its records. iCloud, Health and external services are subject to their own safeguards and terms. Security cannot be guaranteed absolutely. Vendor mapping, security controls, incident procedures, transfer arrangements and retention rules for Israel and each distribution territory must be completed before commercial publication.'),
  ]],
];

const TERMS = [
  [pair('מעמד הטיוטה והמפעיל', 'Draft status and operator'), [
    pair('זו טיוטת תנאי שימוש ל-AutoFit לבדיקת המשתמש, לא אישור עורך דין ולא הצהרה על עמידה בכל דין בעולם. פרטי הישות המסחרית, פרטי קשר, מדינות הפצה ואישור משפטי טרם הושלמו. פרסום מסחרי וחיוב אינם פעילים.',
      'These draft AutoFit terms are for user review, not legal approval or a statement of worldwide compliance. Commercial entity details, contact information, distribution territories and legal approval are incomplete. Commercial publication and billing are inactive.'),
  ]],
  [pair('מטרת האפליקציה ושימוש בטוח', 'Purpose and safe use'), [
    pair('AutoFit היא כלי לתיעוד ותכנון אימוני כושר כלליים. תוכניות אוטומטיות, הוראות, תמונות, אומדני זמן והמלצות מבוססים על מידע חלקי וכללים כלליים; אינם אבחון, טיפול, ייעוץ רפואי או תחליף למאמן מוסמך הבודק אותך ואת סביבת האימון. אין הבטחה לירידה במשקל, עלייה בשריר, מניעת פציעה או תוצאה מסוימת.',
      'AutoFit is a tool for general fitness planning and logging. Generated plans, instructions, illustrations, time estimates and recommendations use limited inputs and general rules; they are not diagnosis, treatment, medical advice or a substitute for a qualified trainer assessing you and your environment. No weight-loss, muscle-growth, injury-prevention or other specific outcome is guaranteed.'),
    pair('בחר עומס, טווח תנועה וציוד שמתאימים ליכולתך. בדוק יציבות ותקינות ציוד ופעל לפי הוראות היצרן; אין לאלתר עוגנים או לעלות על כיסא. אין להמשיך דרך כאב, סחרחורת או סימנים חריגים. אם יש מגבלה, מחלה, היריון, פציעה או ספק לגבי התאמה, קבל ייעוץ מקצועי מתאים לפני אימון. אל תפעיל את האפליקציה באופן שמסכן אותך או אחרים.',
      'Choose loads, ranges of motion and equipment appropriate to your ability. Check equipment stability and condition and follow its manufacturer’s instructions; do not improvise anchors or stand on a chair. Do not continue through pain, dizziness or unusual symptoms. If you have a limitation, condition, pregnancy, injury or uncertainty about suitability, seek appropriate professional advice before exercise. Do not operate the app in a way that endangers yourself or others.'),
  ]],
  [pair('גיל, פרטים והרשאות', 'Age, information and permissions'), [
    pair('מסלול הסקירה מיועד לגיל 12–120. בגיל 12–17 נדרש אישור של הורה או אפוטרופוס בנוכחותו; ההצהרה אינה אימות זהות או הורות. תוכניות האימון הכלליות אינן תוכניות ייעודיות לילדים, ויש לקבל הכוונה מקצועית מתאימה ופיקוח מבוגר. לפני פרסום יש לאשר משפטית את מסלול הקטינים, מדיניות הגיל, דירוג החנות והשווקים המותרים. פרטי גוף ותמונה אינם חובה וניתן להשתמש בכינוי. הרשאות בריאות, קול, התראות, Face ID וגיבוי נפרדות ואפשר לדלג עליהן.',
      'The review flow is intended for ages 12–120. Ages 12–17 require approval by a parent or legal guardian who is present; the declaration is not identity or guardianship verification. General workout plans are not child-specific programs; seek appropriate professional guidance and adult supervision. The minor flow, age policy, store rating and permitted markets require legal approval before publication. Body measurements and a photo are optional and you may use a nickname. Health, voice, notifications, Face ID and backup choices are separate and may be skipped.'),
  ]],
  [pair('נתונים, גיבוי ואמינות', 'Records, backup and reliability'), [
    pair('אתה מחליט אילו נתונים לתעד ואילו תוכניות להפעיל. אומדני זמן אינם התחייבות; מנוחה, תורים, קצב ומצב הציוד משנים את משך האימון. השוואות דורשות תיעוד מתאים ואינן הוכחת שינוי פיזיולוגי. ודא נתוני סטים לפני שמירה. מומלץ לייצא גיבוי; אחסון דפדפן, גיבוי iCloud וכתיבה ל-Health עלולים להיכשל, ואין לראות בשמירה מקומית אישור מסירה לשירות אחר.',
      'You decide what to record and which programs to activate. Time estimates are not promises; rests, queues, pace and equipment availability change workout duration. Comparisons need suitable records and do not prove a physiological change. Check set details before saving. Exporting a backup is recommended; browser storage, iCloud backup and Health delivery can fail, and a local save does not confirm delivery to another service.'),
  ]],
  [pair('חשבונות וספקים חיצוניים', 'Identity and external services'), [
    pair('שימוש מקומי אינו מחייב חשבון חיצוני. Apple, Google, Formspree, שירותי וידאו ויעדי שיתוף פועלים לפי התנאים והמדיניות שלהם. אין למסור סיסמאות דרך טופס פנייה. חיבור ספק אינו כשלעצמו סנכרון נתונים בין מכשירים. מחיקת נתוני AutoFit אינה מוחקת חשבון Apple או Google, נתוני Health או עותקים שכבר שותפו.',
      'Local use does not require an external account. Apple, Google, Formspree, video services and sharing destinations operate under their own terms and policies. Do not provide passwords through Contact. A provider connection does not itself synchronize records across devices. Deleting AutoFit data does not delete an Apple or Google account, Health records or previously shared copies.'),
  ]],
  [pair('רכישות עתידיות וזכויות צרכניות', 'Future purchases and consumer rights'), [
    pair('אין חיוב בגרסת הסקירה ואין הבטחה לזכאות לשבוע חינם. מסלול מינוי, אם יאושר בעתיד, יירכש דרך App Store לאחר הצגת המחיר המקומי, משך התקופה, תנאי תקופת היכרות לזכאים, החידוש האוטומטי ודרך הביטול. זכאות להצעת היכרות נקבעת לפי החנות וקבוצת המינויים. אין להניח שחשבון חדש באפליקציה מקנה ניסיון נוסף.',
      'There are no charges in the review version and no promise of a free week. If a subscription is approved later, purchase will use the App Store after showing the localized price, period, eligible introductory offer, automatic renewal and cancellation method. Introductory eligibility depends on the store and subscription group. A new app profile does not necessarily qualify for another trial.'),
    pair('ניהול וביטול מינוי נעשים ב-App Store. הסרת האפליקציה, ניתוק חשבון או מחיקת נתונים אינם מבטלים מינוי. בקשות החזר מוגשות ל-Apple וכפופות להחלטתה ולזכויות לפי דין. אין בתנאים אלה לגרוע מזכויות צרכניות מחייבות, לרבות זכויות ביטול או החזר שאינן ניתנות להתניה.',
      'Manage and cancel subscriptions in the App Store. Uninstalling, disconnecting an identity or deleting records does not cancel a subscription. Refund requests go to Apple and remain subject to its decisions and applicable legal rights. These terms do not restrict mandatory consumer rights, including cancellation or refund rights that cannot lawfully be waived.'),
  ]],
  [pair('תוכן ושימוש הוגן', 'Content and acceptable use'), [
    pair('התוכן האישי שלך נשאר שלך. אין להעלות תמונות או טקסט שאין לך זכות להשתמש בהם, להפיץ קוד מזיק, לנסות לגשת לנתונים של אחרים או לעקוף מנגנוני תשלום ואבטחה. איורים מקוריים וקוד האפליקציה אינם רישיון להעתקת תוכן מוגן של צדדים שלישיים. קישורי סרטונים אינם מעבירים בעלות או זכויות בתוכן המקושר.',
      'Your personal content remains yours. Do not upload images or text you are not authorized to use, distribute malicious code, access others’ records or bypass payment or security mechanisms. Original illustrations and app code do not grant rights to copy third-party protected content. Video links do not transfer ownership or rights in linked content.'),
  ]],
  [pair('אחריות, שינויים ופנייה', 'Responsibility, changes and contact'), [
    pair('האפליקציה עשויה להשתנות ולהכיל תקלות. אין בטיוטה ויתור על אחריות או זכות שלא ניתן להגביל לפי דין, ואין קביעה שפוטרת מרשלנות או מחובה חוקית. מגבלות אחריות, הדין החל וסמכות שיפוט מסחריים דורשים ניסוח ואישור משפטי לפי מדינות ההפצה, ולא ייקבעו באופן גורף על חשבון זכויות חובה.',
      'The app may change and may contain defects. This draft does not waive liability or rights that cannot lawfully be limited, or declare an exemption from negligence or statutory duties. Commercial liability provisions, governing law and jurisdiction require legal drafting and approval for the distribution territories and must not override mandatory rights.'),
    pair('שינוי מהותי בתנאים או במדיניות יזוהה בגרסה חדשה ובבקשת עיון או הסכמה חדשה לפי הצורך. ניתן לקרוא את המסמכים דרך ״פרטיות״ בתפריט גם ללא הרשאות. לפניות השתמש ב״יצירת קשר״. לפני מחיקה אפשר לייצא את הנתונים; אין למחוק אוטומטית היסטוריה רק עקב סירוב לאישור טיוטה חדשה.',
      'Material changes to terms or privacy will receive a new version and a request to review or consent where appropriate. Documents are available through "Privacy" in the menu without optional permissions. Use Contact for questions. You can export before deletion; history must not be automatically deleted because you decline a new draft.'),
  ]],
];

export function legalDocumentHTML(kind, language = 'he', config = COMMERCIAL_CONFIG) {
  if (!['privacy', 'terms'].includes(kind)) throw new Error('Unknown legal document');
  const side = language === 'en' ? 1 : 0;
  const text = (he, en) => side ? en : he;
  const final = config.termsApproved === true && config.privacyApproved === true
    && !!config.operatorLegalName?.trim() && !!config.privacyEmail?.trim() && !!config.businessAddress?.trim();
  // This authored version remains a draft even if configuration is edited.
  const title = kind === 'privacy' ? text('מדיניות פרטיות', 'Privacy notice') : text('תנאי שימוש', 'Terms of use');
  const sections = kind === 'privacy' ? PRIVACY : TERMS;
  return `<article class="legal-document" lang="${side ? 'en' : 'he'}" dir="${side ? 'ltr' : 'rtl'}" data-no-translate>
    <h2>${title}</h2><p class="legal-draft-warning" role="note">${text('טיוטה לבדיקה — אינה אישור משפטי או אישור להשקה מסחרית.', 'Review draft — not legal approval or commercial-launch approval.')}</p>
    <p>${text('גרסת מסמך', 'Document version')}: <b>${POLICY_VERSION}</b></p>
    <p>${text('יוצר האפליקציה', 'App creator')}: ${escape(config.operatorDisplayName)}</p>
    ${config.operatorLegalName?.trim() ? `<p>${text('שם משפטי שנמסר לבדיקה', 'Legal name supplied for review')}: ${escape(config.operatorLegalName)}</p>` : ''}
    ${config.privacyEmail?.trim() ? `<p>${text('אימייל פרטיות שנמסר לבדיקה', 'Privacy email supplied for review')}: ${escape(config.privacyEmail)}</p>` : ''}
    ${config.businessAddress?.trim() ? `<p>${text('כתובת שנמסרה לבדיקה', 'Address supplied for review')}: ${escape(config.businessAddress)}</p>` : ''}
    ${final ? `<p>${text('גם לאחר השלמת פרטים, יש לפרסם נוסח סופי מאושר בגרסה חדשה.', 'Even with completed configuration, a new approved final document version must be published.')}</p>` : ''}
    ${sections.map(([heading, paragraphs]) => `<section><h3>${escape(heading[side])}</h3>${paragraphs.map((paragraph) => `<p>${escape(paragraph[side])}</p>`).join('')}</section>`).join('')}
    <p>${text('המסמכים זמינים גם ללא חיבור לרשת. לפני השקה מסחרית נדרשת בדיקה משפטית ועסקית נפרדת.', 'These documents are available offline. Separate legal and business review is required before commercial launch.')}</p>
  </article>`;
}

export function hasCurrentConsent(settings) {
  const receipt = settings?.legalConsent;
  return receipt?.version === POLICY_VERSION && receipt.documentStatus === 'draft'
    && receipt.termsAccepted === true && receipt.privacyAcknowledged === true
    && receipt.healthDataConsent === true
    && (receipt.ageGroup === 'adult' && receipt.adultConfirmed === true && receipt.guardianConfirmed === false
      || receipt.ageGroup === 'minor' && receipt.adultConfirmed === false && receipt.guardianConfirmed === true)
    && typeof receipt.acceptedAt === 'string' && Number.isFinite(Date.parse(receipt.acceptedAt));
}

export function acceptLegalConsent(settings, choices, language, now = new Date()) {
  const ageGroup = choices?.ageGroup ?? (choices?.adultConfirmed === true ? 'adult' : null);
  if (!choices || ['termsAccepted', 'privacyAcknowledged', 'healthDataConsent'].some((key) => choices[key] !== true)
    || !['adult', 'minor'].includes(ageGroup)
    || ageGroup === 'adult' && (choices.adultConfirmed !== true
      || choices.guardianConfirmed !== undefined && choices.guardianConfirmed !== false)
    || ageGroup === 'minor' && (choices.guardianConfirmed !== true
      || choices.adultConfirmed !== undefined && choices.adultConfirmed !== false)) {
    throw new Error('Explicit separate confirmations are required');
  }
  if (!['he', 'en'].includes(language) || !Number.isFinite(now.getTime())) throw new Error('Invalid consent metadata');
  const receipt = { version: POLICY_VERSION, documentStatus: 'draft', acceptedAt: now.toISOString(),
    language, termsAccepted: true, privacyAcknowledged: true, healthDataConsent: true,
    ageGroup, adultConfirmed: ageGroup === 'adult', guardianConfirmed: ageGroup === 'minor' };
  return { ...settings, legalConsent: receipt,
    legalConsentHistory: [...(Array.isArray(settings.legalConsentHistory) ? settings.legalConsentHistory : []), receipt] };
}

export function profileAgeAllowed(settings, age) {
  if (age === '') return true;
  const number = Number(age);
  return Number.isInteger(number) && number >= 12 && number <= 120 && hasCurrentConsent(settings)
    && settings.legalConsent.ageGroup === (number < 18 ? 'minor' : 'adult');
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
