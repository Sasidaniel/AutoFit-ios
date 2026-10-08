// seed.js — default exercise program (extracted from user's "פולבודי - ששי דניאל" plan)
// Order reflects the user's approved reordering from the Exercises tab (2026-10-08).
export const SEED_EXERCISES = [
  { id: 'warmup', name: 'חימום-הליכה', category: 'קרדיו', inputType: 'cardio', durationMinutes: 5, pace: 'קצב 6 בהליכון', defaultSets: 0, defaultReps: '', restSeconds: 0, active: true },

  { name: 'לחיצת חזה', category: 'חזה', defaultSets: 3, defaultReps: '12', restSeconds: 120,
    notes: "במשקולות חופשיות / בסמית' / במכונה / במוט",
    images: ['images/p2_1.png', 'images/p2_2.png'] },

  { name: 'משיכה לפנים בפולי עליון', category: 'גב עליון', defaultSets: 3, defaultReps: '12', restSeconds: 120,
    notes: 'במכונה / מתח',
    images: ['images/p3_1.png'] },

  { name: 'פרפר חזה', category: 'חזה', defaultSets: 3, defaultReps: '12', restSeconds: 120,
    notes: 'בקייבל קרוס / במשקולות יד בשכיבה / במכונה',
    images: ['images/p2_3.png', 'images/p2_4.png'] },

  { name: 'הרחקה אופקית (פרפר הפוך)', category: 'כתפיים אחוריות', defaultSets: 3, defaultReps: '12', restSeconds: 120,
    notes: 'במשקולות יד עם השענות על ספסל / בהטיית גב בעמידה / במכונה',
    images: ['images/p5_3.png', 'images/p5_4.png'] },

  { name: 'חתירה צרה לבטן', category: 'גב אמצעי', defaultSets: 3, defaultReps: '12', restSeconds: 120,
    notes: 'בפולי תחתון / במשקולת יד בהטיית גב על ספסל / במכונה',
    images: ['images/p3_2.png', 'images/p3_3.png'] },

  { name: 'זוקפי גב — פשיטת גב', category: 'גב תחתון', defaultSets: 3, defaultReps: '12', restSeconds: 120,
    notes: 'על הרצפה / בכסא רומי / מכונת היפראקסטנשן',
    images: ['images/p8_2.png', 'images/p8_3.png'] },

  { name: 'פשיטת מרפקים בפולי עליון', category: 'יד אחורית', defaultSets: 3, defaultReps: '12', restSeconds: 120,
    notes: 'כנגד מוט/חבל, או פשיטת מרפק מאחורי העורף עם משקולת',
    images: ['images/p6_1.png', 'images/p6_2.png'] },

  { name: 'כפיפת מרפקים בישיבה', category: 'יד קדמית', defaultSets: 2, defaultReps: '12', restSeconds: 120,
    notes: "כנגד משקולות יד / בכיסא כומר / במכונה",
    images: ['images/p7_1.png', 'images/p7_2.png'] },

  { name: 'פטישים', category: 'אמות', defaultSets: 1, defaultReps: 'עד כשל', restSeconds: 120,
    notes: 'סט אחד לכל יד עד כשל',
    images: ['images/ex_hammer.png'] },

  { name: 'כפיפה ופשיטה של שורש כף היד', category: 'מפרקי כף יד', defaultSets: 1, defaultReps: 'עד כשל', restSeconds: 120,
    notes: 'סט אחד לכל תנועה לכל יד עד כשל',
    images: ['images/p7_3.png'] },

  { name: 'הרחקה לצדדים', category: 'כתפיים צדדיות', defaultSets: 3, defaultReps: '12', restSeconds: 120,
    notes: 'בישיבה / במכונה',
    images: ['images/p5_1.png', 'images/p5_2.png'] },

  { name: 'טרפז', category: 'טרפז', defaultSets: 3, defaultReps: '12', restSeconds: 120,
    notes: 'עומדים ואוחזים משקולות יד בצדי הגוף, מרימים את הכתפיים כלפי מעלה (לכיוון האוזניים) ומורידים בשליטה',
    images: ['images/ex_shrugs.png'] },

  { name: 'לחיצת רגליים', category: 'רגליים - 4 ראשי', defaultSets: 3, defaultReps: '12', restSeconds: 120,
    notes: "במכונה / האק / סקוואט בסמית' משין / סקוואט חופשי",
    images: ['images/p4_1.png'] },

  { name: 'פשיטת ברכיים', category: 'רגליים - 4 ראשי', defaultSets: 3, defaultReps: '12', restSeconds: 120,
    notes: '(מכונה)',
    images: ['images/p4_2.png'] },

  { name: 'כפיפת ברכיים', category: 'רגליים - המסטרינג', defaultSets: 3, defaultReps: '12', restSeconds: 120,
    notes: '(מכונה)',
    images: ['images/p4_3.png'] },

  { name: 'כפיפות בטן', category: 'בטן', defaultSets: 3, defaultReps: '12', restSeconds: 120,
    notes: '(Crunches) על הרצפה או עם גלגלת',
    images: ['images/p8_1.png'] },

  { name: 'פלאנק', category: 'בטן', defaultSets: 3, defaultReps: '15 שניות החזקה', restSeconds: 120,
    inputType: 'hold', holdSeconds: 15,
    notes: 'החזקת גוף ישר על האמות ועל קצות האצבעות — ללא תזוזה במשך 15 שניות בכל סט',
    images: ['images/ex_plank.png'] },

  { id: 'cooldown', name: 'שחרור-הליכה', category: 'קרדיו', inputType: 'cardio', durationMinutes: 5, pace: 'קצב 6 בהליכון', defaultSets: 0, defaultReps: '', restSeconds: 0, active: true },
];
