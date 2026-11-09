'use strict';
const text = {
  he: {
    draftLabel: 'טיוטת חנות · טרם נשלחה לבדיקה', introTitle: 'האימון כבר עובד.\nעכשיו נותנים לו במה.',
    introText: 'תוכנית לפי הזמן, הסביבה והציוד שלכם. ליווי באימון וכלים להתקדמות מאימון לאימון. כך נציג את AutoFit בהשקה חינמית — עם מסר אישי וצילומי ממשק אמיתיים.',
    navProduct: 'עמוד החנות', navGallery: 'כל צילומי המסך', navCopy: 'הטקסטים המלאים', navReady: 'לפני הגשה',
    navIphone: 'החיבור לאייפון', iphoneHeading: 'מתאמנת איתכם. משתלבת באייפון.',
    iphoneNotice: 'המסרים מופיעים גם בתיאור המלא לחנות. זו תצוגת תוכן לסקירה, לא חלק מממשק App Store ולא הדמיה של שירותי iPhone בדפדפן.',
    campaignNotice: 'כיוון שיווקי לאישור — לא חלק מעמוד App Store. לא פורסם קמפיין, לא נשלחו פניות ולא אושר תקציב.',
    hooksHeading: 'שלושה מסרי פתיחה להדגמות ולתוכן',
    navCampaign: 'למה להוריד ולהמליץ',
    productLabel: 'המחשת עמוד מוצר · לא צילום מהחנות', getButton: 'הורדה',
    getNotice: 'המחשה בלבד. אין הורדה, רכישה או פרסום מהעמוד הזה.',
    priceLabel: 'מחיר מוצע', priceValue: 'חינם', languagesLabel: 'שפות הממשק', compatLabel: 'תאימות', previewHeading: 'תצוגה מקדימה', categoryLabel: 'בריאות וכושר',
    captureNotice: 'צילומי טיוטה מממשק הווב האמיתי עם נתוני הדגמה. לא צולמו באייפון; מצב האזנה מקורי לא הודמה. לפני הגשה יוחלפו בצילומי מכשיר.',
    readMore: 'התיאור המלא', privacyHeading: 'פרטיות האפליקציה', privacyText: 'הצהרת הפרטיות טרם אושרה. לא מוצגת תווית ״הנתונים לא נאספים״ ללא אימות.',
    directionTitle: 'שקט בעיניים.\nדיוק במסר.', directionText: 'שחור וזהב, כמו AutoFit. כל תמונה מספרת יתרון אחד. המסך נשאר אמיתי, הכותרת קצרה, והפרטים לא מתחרים על תשומת הלב.',
    specTitle: 'שמונה מסכים. שותף אחד.', specText: 'קובצי PNG אטומים בגודל 1290 × 2796, בעברית ובאנגלית. שליטה קולית, סטטיסטיקה ותוכניות שמורות מקבלות מקום מרכזי. אלו נכסי עיצוב לבדיקה, לא הוכחת תאימות מכשיר.',
    accuracyNote: 'המסגרת מדמה עמוד מוצר, לא את ממשק Apple המדויק. הפריסה והקיצורים בחנות תלויים במכשיר, בשפה ובגרסת החנות. אין דירוג כוכבים, ביקורות, שם מוכר או דירוג גיל מומצאים.',
    galleryHeading: 'רואים כל פרט, לפני שמאשרים.', galleryHint: 'לחיצה על תמונה פותחת תצוגה גדולה. קישור ההורדה שומר את אותו קובץ שמופיע כאן.',
    copyHeading: 'כך נספר את הסיפור.', downloadCopy: 'הורדת כל הטקסטים · JSON', downloadPackage: 'הורדת כל חבילת הסקירה · ZIP',
    reviewerHeading: 'הערות מוצעות לבודקי Apple (לא טקסט שיווקי)',
    readinessHeading: 'טיוטת החנות מוכנה. ההגשה עדיין לא.', readinessIntro: 'השם והטקסטים בעברית ובאנגלית אומתו בטיוטת App Store Connect, עם שחרור ידני. האפליקציה טרם נשלחה לבדיקה או פורסמה. הפריטים הבאים עדיין דורשים השלמה.',
    approvalTitle: 'מה מאשרים בשלב הזה?', approvalText: 'השם וכותרת המשנה, המסר, סדר התמונות, העיצוב והטקסט המפורט. מחיר ההשקה המוצע הוא חינם, ללא הבטחת ״חינם לתמיד״. אין כאן קביעה לגבי המודל בתשלום בעתיד. הגשה ל־Apple ופרסום דורשים אישור נפרד אחרי סגירת הפרטים החסרים.',
    reviewButton: 'שמירת אישור עיצוב מקומי בלבד', sourcesLabel: 'מקורות Apple שעליהם מבוססת ההצעה',
    footerNote: 'תצוגה מקומית · ללא הגשה וללא פרסום', copied: 'הועתק', copy: 'העתקה', download: 'הורדת PNG',
    labels: { name: 'שם האפליקציה', subtitle: 'כותרת משנה', promotionalText: 'טקסט קידום', keywords: 'מילות מפתח', description: 'תיאור מלא' },
    saved: 'נשמר אישור עיצוב בדפדפן הזה בלבד. זו אינה הרשאה להגשה או פרסום.',
    saveError: 'לא ניתן לשמור את האישור המקומי. לא בוצעה הגשה.',
  },
  en: {
    draftLabel: 'STORE DRAFT · NOT SENT FOR REVIEW', introTitle: 'The workout is ready.\nGive it a worthy storefront.',
    introText: 'A plan for your time, training space and equipment. Support during sessions and tools to track progress over time. The AutoFit free-launch proposal, with a personal message and real product screens.',
    navProduct: 'Product page', navGallery: 'Screenshot collection', navCopy: 'Full listing copy', navReady: 'Before submission',
    navIphone: 'iPhone integration', iphoneHeading: 'Your workout. Your iPhone. Together.',
    iphoneNotice: 'These messages also appear in the full store description. This is a content-review section, not App Store UI or a simulation of native iPhone services.',
    campaignNotice: 'Marketing proposal for review, not App Store page content. No campaign, outreach or advertising budget has been launched.',
    hooksHeading: 'Three opening messages for demos and content',
    navCampaign: 'Why download and recommend',
    productLabel: 'Product-page approximation · not the live App Store', getButton: 'GET',
    getNotice: 'Preview only. This page does not install, purchase or publish anything.',
    priceLabel: 'Proposed price', priceValue: 'Free', languagesLabel: 'Interface languages', compatLabel: 'Compatibility', previewHeading: 'Preview', categoryLabel: 'Health & Fitness',
    captureNotice: 'Draft captures of the actual web UI with synthetic data. Not captured on iPhone; native listening was not simulated. Replace with device screenshots before submission.',
    readMore: 'Full description', privacyHeading: 'App Privacy', privacyText: 'Privacy answers have not been approved. A “Data Not Collected” label is not displayed without verification.',
    directionTitle: 'Quiet design.\nA clear message.', directionText: 'Black and gold, like AutoFit. One benefit per image. Real screens, short headlines and enough room for the product to speak.',
    specTitle: 'Eight screens. One partner.', specText: 'Opaque 1290 × 2796 PNG files in Hebrew and English. Voice control, statistics and saved plans take center stage. These are design-review assets, not device-compatibility evidence.',
    accuracyNote: 'This is a product-page approximation, not an exact Apple interface. Actual layout and truncation vary by device, language and store version. No invented ratings, reviews, seller name or age rating.',
    galleryHeading: 'Every detail, before approval.', galleryHint: 'Open any image at full size. The download link saves the same file displayed here.',
    copyHeading: 'Words that do the work.', downloadCopy: 'Download all copy · JSON', downloadPackage: 'Download the complete review package · ZIP',
    reviewerHeading: 'Proposed Apple review notes (not marketing copy)',
    readinessHeading: 'Store draft ready. Not ready to submit.', readinessIntro: 'The name and Hebrew/English copy have been verified in the App Store Connect draft, with manual release. The app has not been submitted for review or published. These items still need completion.',
    approvalTitle: 'What are you approving here?', approvalText: 'The name and subtitle, message, image order, art direction and detailed copy. Proposed launch price: free, with no “free forever” promise. Future paid packaging remains undecided. Apple submission and public release need separate approval after the outstanding items are closed.',
    reviewButton: 'Save local creative approval only', sourcesLabel: 'Apple source references',
    footerNote: 'Local review · no submission or publishing', copied: 'Copied', copy: 'Copy', download: 'Download PNG',
    labels: { name: 'App name', subtitle: 'Subtitle', promotionalText: 'Promotional text', keywords: 'Keywords', description: 'Full description' },
    saved: 'Creative approval saved only in this browser. It does not authorize submission or publication.',
    saveError: 'Local approval could not be saved. Nothing has been submitted.',
  },
};
let listing, language = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'he';
const byId = (id) => document.getElementById(id);
function imageURL(id) { return `/assets/${language}-${id}.png`; }
function openImage(screen) {
  byId('largeImage').src = imageURL(screen.id);
  byId('largeImage').alt = screen.alt;
  byId('downloadImage').href = imageURL(screen.id);
  byId('downloadImage').textContent = text[language].download;
  byId('imageDialog').showModal();
}
function render() {
  const t = text[language], copy = listing.locales[language];
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
  for (const [id, value] of Object.entries(t)) if (id !== 'copy' && typeof value === 'string' && byId(id)) byId(id).textContent = value;
  byId('languageToggle').textContent = language === 'he' ? 'English' : 'עברית';
  byId('productHeading').textContent = copy.name;
  byId('subtitle').textContent = copy.subtitle;
  byId('promo').textContent = copy.promotionalText;
  byId('descriptionLead').textContent = copy.description.split('\n\n')[0];
  byId('description').textContent = copy.description.split('\n\n').slice(1).join('\n\n');
  byId('reviewerNotes').textContent = listing.review.reviewerNotes;
  for (const [kind, he, en] of [['support', 'טיוטת עמוד התמיכה', 'Support page draft'],
    ['privacy', 'טיוטת מדיניות הפרטיות', 'Privacy notice draft'], ['terms', 'טיוטת תנאי השימוש', 'Terms draft']]) {
    const link = byId(`${kind}Preview`);
    link.textContent = language === 'he' ? he : en;
    link.href = `/${kind}${language === 'he' ? '' : '-en'}.html`;
  }
  const inspection = listing.appleInspection;
  byId('appleStatus').textContent = inspection
    ? language === 'he'
      ? `בדיקת Apple בתאריך ${inspection.checkedAt}: גרסה ${inspection.version} במצב ${inspection.state}. טרם הוגשה לבדיקה. פרטי חובה וצילומי מכשיר עדיין חסרים.`
      : `Apple inspection at ${inspection.checkedAt}: version ${inspection.version} is ${inspection.state}. Not submitted for review. Required information and device screenshots are still missing.`
    : '';
  byId('iphoneFeatures').replaceChildren();
  for (const feature of copy.iphoneFeatures) {
    const card = document.createElement('article'); card.className = 'iphone-feature';
    const heading = document.createElement('h3'); heading.textContent = feature.title;
    const body = document.createElement('p'); body.textContent = feature.text;
    card.append(heading, body); byId('iphoneFeatures').append(card);
  }
  byId('campaignHeading').textContent = copy.campaign.headline;
  byId('campaignPositioning').textContent = copy.campaign.positioning;
  byId('campaignCards').replaceChildren();
  for (const item of copy.campaign.cards) {
    const card = document.createElement('article'); card.className = 'strategy-card';
    const heading = document.createElement('h3'); heading.textContent = item.title;
    const body = document.createElement('p'); body.textContent = item.text;
    card.append(heading, body); byId('campaignCards').append(card);
  }
  byId('campaignHooks').replaceChildren();
  for (const hook of copy.campaign.hooks) {
    const p = document.createElement('p'); p.textContent = hook; byId('campaignHooks').append(p);
  }
  byId('storeScreens').replaceChildren(); byId('galleryGrid').replaceChildren();
  for (const [index, screen] of copy.screens.entries()) {
    const makeButton = () => {
      const button = document.createElement('button'), img = document.createElement('img');
      button.type = 'button'; img.src = imageURL(screen.id); img.alt = screen.alt;
      button.setAttribute('aria-label', screen.alt);
      img.width = 1290; img.height = 2796; img.loading = 'lazy';
      button.append(img); button.addEventListener('click', () => openImage(screen)); return button;
    };
    byId('storeScreens').append(makeButton());
    const card = document.createElement('article'); card.className = 'gallery-card'; card.append(makeButton());
    const meta = document.createElement('div'); meta.className = 'gallery-meta';
    const name = document.createElement('b'); name.textContent = `${String(index + 1).padStart(2, '0')} / ${screen.title.replace('\n', ' ')}`;
    const link = document.createElement('a'); link.href = imageURL(screen.id); link.download = `${language}-${screen.id}.png`; link.textContent = t.download;
    meta.append(name, link); card.append(meta); byId('galleryGrid').append(card);
  }
  byId('copyGrid').replaceChildren();
  for (const key of ['name', 'subtitle', 'promotionalText', 'keywords', 'description']) {
    const card = document.createElement('article'); card.className = `copy-card${key === 'description' ? ' long' : ''}`;
    const heading = document.createElement('h3'), count = document.createElement('span');
    const value = copy[key], limit = { name: 30, subtitle: 30, promotionalText: 170, keywords: 100, description: 4000 }[key];
    count.textContent = `${key === 'keywords' ? new TextEncoder().encode(value).length : [...value].length} / ${limit} ${key === 'keywords' ? 'bytes' : ''}`;
    heading.textContent = t.labels[key]; heading.append(count);
    const p = document.createElement('p'); p.textContent = value;
    const button = document.createElement('button'); button.type = 'button'; button.textContent = t.copy;
    button.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(value); button.textContent = t.copied; }
      catch { button.textContent = language === 'he' ? 'יש להעתיק ידנית' : 'Select and copy manually'; }
    });
    card.append(heading, p, button); byId('copyGrid').append(card);
  }
  byId('blockers').replaceChildren();
  listing.review.blockers.forEach((item, index) => {
    const card = document.createElement('article'); card.className = 'blocker';
    const label = document.createElement('span'); label.textContent = `OPEN / ${String(index + 1).padStart(2, '0')}`;
    card.append(label, document.createTextNode(item[language])); byId('blockers').append(card);
  });
  byId('sources').replaceChildren();
  listing.sources.forEach((url) => {
    const li = document.createElement('li'), a = document.createElement('a');
    a.href = url; a.textContent = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; li.append(a); byId('sources').append(li);
  });
  byId('feedbackStatus').textContent = '';
}
byId('languageToggle').addEventListener('click', () => {
  language = language === 'he' ? 'en' : 'he';
  history.replaceState(null, '', `?lang=${language}`); render();
});
document.querySelector('.close-dialog').addEventListener('click', () => byId('imageDialog').close());
byId('getButton').addEventListener('click', () => { byId('getNotice').textContent = text[language].getNotice; });
byId('reviewButton').addEventListener('click', () => {
  try {
    localStorage.setItem('autofit-store-creative-review', JSON.stringify({
      savedAt: new Date().toISOString(), language, status: 'creative-only', submissionAuthorized: false, listing,
    }));
    byId('feedbackStatus').textContent = text[language].saved;
  } catch { byId('feedbackStatus').textContent = text[language].saveError; }
});
byId('downloadCopy').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(listing, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'autofit-store-listing-review.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
fetch('/listing.json').then((r) => { if (!r.ok) throw new Error(`Listing HTTP ${r.status}`); return r.json(); })
  .then((data) => { listing = data; render(); })
  .catch((error) => { byId('introTitle').textContent = `Preview unavailable: ${error.message}`; console.error(error); });
