// Original instructional text and schematic illustrations. Existing programs remain unchanged.
const pair = (he, en) => ({ he, en });
const guide = (name, muscles, equipment, pose, steps, cue, options = {}) => ({
  name, muscles, equipment, pose, steps, cue, level: 'מתחילים',
  places: equipment.includes('מכונה') ? ['gym'] : ['home', 'gym'],
  ...options,
});

export const EXERCISE_GUIDES = {
  squat: guide(pair('סקוואט במשקל גוף', 'Bodyweight squat'), ['רגליים', 'ישבן'], ['משקל גוף'], 'squat', [
    pair('עמוד ברגליים ברוחב נוח, כפות הרגליים יציבות והבטן אסופה.', 'Stand with a comfortable stance, feet grounded and core braced.'),
    pair('כופף ברכיים וירכיים יחד ורד רק לעומק שבו נשמרת שליטה.', 'Bend your knees and hips together, lowering only as far as you can control.'),
    pair('דחוף את הרצפה וחזור לעמידה בלי לנעול את הברכיים בכוח.', 'Push through the floor to stand, without forcefully locking your knees.'),
  ], pair('נשוף בעלייה. שמור עקבים על הרצפה וברכיים בכיוון האצבעות; אל תקרוס פנימה.', 'Exhale as you rise. Keep heels grounded and knees tracking with your toes; avoid inward collapse.'), {
    video: { id: 'aclHkVaku9U', publisher: 'BowFlex', title: 'Squats for Beginners' },
  }),
  goblet: guide(pair('גובלט סקוואט', 'Goblet squat'), ['רגליים', 'ישבן'], ['משקולות יד'], 'goblet', [
    pair('אחוז משקולת קרוב לחזה בשתי ידיים ועמוד ביציבות.', 'Hold one dumbbell close to your chest with both hands and stand firmly.'),
    pair('רד לסקוואט בשליטה, כשהמשקולת נשארת קרובה לגוף.', 'Lower into a controlled squat, keeping the weight close to your body.'),
    pair('דחוף דרך כל כף הרגל וחזור לעמידה.', 'Push through your whole foot to return to standing.'),
  ], pair('נשוף בעלייה. אל תעגל את הגב או תרים עקבים כדי לרדת עמוק יותר.', 'Exhale as you rise. Do not round your back or lift your heels to gain depth.')),
  lunge: guide(pair('מכרע לאחור', 'Reverse lunge'), ['רגליים', 'ישבן'], ['משקל גוף'], 'lunge', [
    pair('עמוד יציב; אפשר להיעזר בקיר לשיווי משקל.', 'Stand steadily; use a wall for balance if needed.'),
    pair('קח צעד לאחור וכופף את שתי הברכיים בטווח נוח.', 'Step back and bend both knees through a comfortable range.'),
    pair('דחוף דרך הרגל הקדמית וחזור. החלף צד ורשום חזרות לכל צד.', 'Push through the front foot to return. Alternate sides and log repetitions per side.'),
  ], pair('נשוף בחזרה. השאר את הברך הקדמית בקו כף הרגל והימנע מצעד צר מדי.', 'Exhale as you return. Keep the front knee aligned with the foot and avoid an overly narrow stance.')),
  hinge: guide(pair('דדליפט רומני עם משקולות', 'Dumbbell Romanian deadlift'), ['רגליים', 'ישבן', 'גב תחתון'], ['משקולות יד'], 'hinge', [
    pair('עמוד עם משקולות לפני הירכיים וברכיים כפופות מעט.', 'Stand with dumbbells in front of your thighs and knees slightly bent.'),
    pair('שלח את האגן לאחור והורד משקולות קרוב לרגליים, בגב ניטרלי.', 'Move your hips back, lowering the weights close to your legs with a neutral back.'),
    pair('עצור לפני שהגב מתעגל וחזור בעזרת פשיטת הירכיים.', 'Stop before your back rounds and return by extending your hips.'),
  ], pair('נשוף בעלייה. זו תנועת ירך, לא ניסיון להגיע לרצפה; אל תקשית את הגב בסיום.', 'Exhale as you rise. This is a hip hinge, not a reach for the floor; avoid arching at the top.'), { level: 'בינוניים' }),
  bridge: guide(pair('גשר ישבן', 'Glute bridge'), ['ישבן', 'רגליים'], ['משקל גוף', 'מזרן'], 'bridge', [
    pair('שכב על הגב, כופף ברכיים והנח כפות רגליים ברוחב האגן.', 'Lie on your back with knees bent and feet hip-width apart.'),
    pair('דחוף דרך כפות הרגליים והרם אגן עד לקו נוח בין כתפיים לברכיים.', 'Push through your feet and lift your hips to a comfortable shoulder-to-knee line.'),
    pair('הורד את האגן לאט. בהחזקה סטטית, הישאר בעמדה העליונה ונשום.', 'Lower slowly. For a static hold, stay at the top and keep breathing.'),
  ], pair('נשוף בהרמה. אל תפצה בהקשתת הגב ואל תדחוף דרך הצוואר.', 'Exhale as you lift. Avoid compensating by arching your back or pushing through your neck.')),
  calf: guide(pair('עליות עקבים בעמידה', 'Standing calf raise'), ['שוקיים'], ['משקל גוף'], 'calf', [
    pair('עמוד על רצפה ישרה והנח יד על משענת יציבה.', 'Stand on a level floor with one hand on a stable support.'),
    pair('הרם עקבים בשליטה תוך שמירה על קרסוליים ישרים.', 'Lift your heels with control, keeping your ankles aligned.'),
    pair('הורד עקבים לאט עד לרצפה.', 'Lower your heels slowly back to the floor.'),
  ], pair('נשוף בהרמה. אל תקפוץ ואל תגלגל קרסוליים לצדדים.', 'Exhale as you rise. Avoid bouncing or rolling your ankles outward.')),
  pushup: guide(pair('שכיבות סמיכה', 'Push-up'), ['חזה', 'יד אחורית', 'כתפיים'], ['משקל גוף'], 'pushup', [
    pair('הנח ידיים מעט מעבר לרוחב הכתפיים ושמור גוף ישר.', 'Place your hands slightly wider than shoulder-width and keep your body straight.'),
    pair('כופף מרפקים והורד את החזה בשליטה, בלי להפיל אגן.', 'Bend your elbows and lower your chest with control, without dropping your hips.'),
    pair('דחוף את הרצפה וחזור לעמדת ההתחלה.', 'Push through the floor to return to the starting position.'),
  ], pair('נשוף בדחיפה. אל תפנה מרפקים ישר לצדדים; אפשר להתחיל עם ידיים על משטח גבוה ויציב.', 'Exhale as you push. Avoid flaring elbows straight out; start with hands on a stable raised surface if needed.'), {
    video: { id: 'IODxDxX7oi4', publisher: 'Calisthenicmovement', title: 'The Perfect Push Up | Do it right!' },
  }),
  chest: guide(pair('לחיצת חזה עם משקולות בשכיבה', 'Dumbbell bench press'), ['חזה', 'יד אחורית', 'כתפיים'], ['משקולות יד', 'ספסל'], 'chest', [
    pair('שכב על ספסל יציב, רגליים על הרצפה ומשקולות לצד החזה.', 'Lie on a stable bench with feet on the floor and dumbbells beside your chest.'),
    pair('דחוף את המשקולות כלפי מעלה בלי להקפיץ או להטיח אותן זו בזו.', 'Press the weights upward without bouncing or striking them together.'),
    pair('הורד לאט בטווח נוח לכתפיים, כששורשי כף היד מעל המרפקים.', 'Lower slowly through a comfortable shoulder range, wrists above elbows.'),
  ], pair('נשוף בלחיצה. אל תנתק את הישבן מהספסל ואל תסובב שורשי כף יד לאחור.', 'Exhale as you press. Keep your hips on the bench and avoid bending wrists backward.')),
  floor: guide(pair('לחיצת חזה על הרצפה', 'Dumbbell floor press'), ['חזה', 'יד אחורית'], ['משקולות יד', 'מזרן'], 'floor', [
    pair('שכב על הגב עם ברכיים כפופות ומשקולות לצד החזה.', 'Lie on your back with knees bent and dumbbells beside your chest.'),
    pair('לחץ כלפי מעלה, כששורשי כף היד נשארים מעל המרפקים.', 'Press upward, keeping wrists over elbows.'),
    pair('הורד לאט עד שהזרועות נוגעות בעדינות ברצפה.', 'Lower slowly until your upper arms gently touch the floor.'),
  ], pair('נשוף בלחיצה. אל תקפיץ מרפקים מהרצפה ואל תעצור נשימה.', 'Exhale as you press. Avoid bouncing elbows off the floor or holding your breath.')),
  fly: guide(pair('פרפר חזה עם משקולות', 'Dumbbell chest fly'), ['חזה', 'כתפיים'], ['משקולות יד', 'ספסל'], 'fly', [
    pair('שכב על ספסל עם משקולות קלות מעל החזה ומרפקים כפופים מעט.', 'Lie on a bench with light dumbbells over your chest and elbows slightly bent.'),
    pair('פתח זרועות בקשת עד לטווח נוח בלבד.', 'Open your arms in an arc only through a comfortable range.'),
    pair('אסוף את הזרועות חזרה מעל החזה באותה קשת.', 'Bring your arms back over your chest along the same arc.'),
  ], pair('נשוף בסגירה. אל תרד למתיחה כואבת ואל תשנה את כיפוף המרפק לתנועת לחיצה.', 'Exhale as you close. Avoid a painful stretch or changing elbow bend into a press.'), { level: 'בינוניים', view: pair('מבט מלמעלה', 'Top view') }),
  pulldown: guide(pair('משיכה בפולי עליון', 'Lat pulldown'), ['גב', 'יד קדמית'], ['מכונה'], 'pulldown', [
    pair('כוון את משענת הירכיים ואחוז במוט בטווח נוח.', 'Adjust the thigh support and grip the bar at a comfortable width.'),
    pair('משוך מרפקים מטה לכיוון הצלעות, והמוט לכיוון החזה העליון.', 'Pull elbows down toward your ribs and the bar toward your upper chest.'),
    pair('חזור לאט, בלי להרים את הגוף מהמושב.', 'Return slowly without lifting your body off the seat.'),
  ], pair('נשוף במשיכה. אל תמשוך מאחורי העורף ואל תניע את הגוף בתנופה.', 'Exhale as you pull. Avoid pulling behind your neck or swinging your torso.')),
  assisted: guide(pair('מתח בסיוע גרביטון', 'Machine-assisted pull-up'), ['גב', 'יד קדמית'], ['מכונה'], 'assisted', [
    pair('בחר סיוע שמאפשר שליטה, אחוז בידיות ועלה בזהירות על המשטח.', 'Choose enough assistance for control, grip the handles and mount the platform carefully.'),
    pair('משוך מרפקים מטה והרם את הגוף בלי תנופה.', 'Pull your elbows down and lift your body without swinging.'),
    pair('רד לאט ורד מהמכשיר לפי הוראותיו. במכשיר זה יותר משקל פירושו יותר סיוע.', 'Lower slowly and dismount according to the machine instructions. More selected weight means more assistance.'),
  ], pair('נשוף בעלייה. אל תקפוץ מהמשטח ואל תבחר מעט מדי סיוע.', 'Exhale as you rise. Do not jump off the platform or select too little assistance.')),
  row: guide(pair('חתירה בישיבה בפולי', 'Seated cable row'), ['גב', 'יד קדמית'], ['מכונה'], 'row', [
    pair('שב ביציבות, ברכיים כפופות מעט וגב ניטרלי.', 'Sit steadily with knees slightly bent and a neutral back.'),
    pair('משוך את הידית אל הבטן תוך הובלת המרפקים לאחור.', 'Pull the handle toward your abdomen, leading your elbows back.'),
    pair('החזר ידיים קדימה לאט בלי לעגל את הגב.', 'Reach forward slowly without rounding your back.'),
  ], pair('נשוף במשיכה. אל תטלטל את הגוף או תמשוך כתפיים לאוזניים.', 'Exhale as you pull. Avoid rocking your torso or shrugging toward your ears.')),
  oneRow: guide(pair('חתירה ביד אחת עם משקולת', 'Single-arm dumbbell row'), ['גב', 'יד קדמית'], ['משקולות יד', 'ספסל'], 'oneRow', [
    pair('תמוך ביד וברך על ספסל יציב ושמור גב ניטרלי.', 'Support one hand and knee on a stable bench and keep a neutral back.'),
    pair('משוך את המשקולת לכיוון המותן, כשהמרפק קרוב לגוף.', 'Pull the dumbbell toward your hip, keeping your elbow close.'),
    pair('הורד לאט והחלף צד. רשום חזרות לכל צד.', 'Lower slowly and switch sides. Log repetitions per side.'),
  ], pair('נשוף במשיכה. אל תסובב את האגן כדי להרים משקל כבד מדי.', 'Exhale as you pull. Avoid twisting your hips to lift an excessive load.')),
  bandRow: guide(pair('חתירה בישיבה עם גומייה', 'Seated resistance-band row'), ['גב', 'יד קדמית'], ['גומייה'], 'row', [
    pair('שב יציב והעבר גומייה תקינה סביב מרכז כפות הרגליים, לפי הוראות היצרן.', 'Sit steadily and loop an intact band around the midfoot, following the manufacturer instructions.'),
    pair('משוך מרפקים לאחור לכיוון המותניים, בגב ניטרלי.', 'Pull your elbows back toward your waist with a neutral back.'),
    pair('שחרר מתח לאט בלי לעזוב את הגומייה.', 'Release tension slowly without letting go of the band.'),
  ], pair('נשוף במשיכה. בדוק שהגומייה אינה יכולה להחליק; אל תמשוך אותה לכיוון הפנים.', 'Exhale as you pull. Check that the band cannot slip; do not pull it toward your face.')),
  back: guide(pair('פשיטת גב עדינה על הרצפה', 'Prone back extension'), ['גב תחתון'], ['משקל גוף', 'מזרן'], 'back', [
    pair('שכב על הבטן, מבט לרצפה וידיים לצד הגוף.', 'Lie face down, looking at the floor with arms by your sides.'),
    pair('הרם מעט את החזה, בלי להטות את הראש לאחור.', 'Lift your chest slightly without tipping your head back.'),
    pair('הורד לאט; התנועה קטנה ונשלטת.', 'Lower slowly; keep the movement small and controlled.'),
  ], pair('נשוף בהרמה. אל תנסה להגיע גבוה באמצעות הקשתה חזקה של הגב.', 'Exhale as you lift. Do not seek height through excessive back arching.')),
  triceps: guide(pair('פשיטת מרפקים בפולי עליון', 'Cable triceps pushdown'), ['יד אחורית'], ['מכונה'], 'triceps', [
    pair('עמוד יציב מול הפולי, מרפקים צמודים לצדי הגוף.', 'Stand firmly facing the cable with elbows close to your sides.'),
    pair('יישר מרפקים כלפי מטה בלי להזיז את הכתפיים.', 'Straighten your elbows downward without moving your shoulders.'),
    pair('כופף מרפקים בחזרה לאט, כשהזרועות נשארות במקום.', 'Bend your elbows back slowly, keeping upper arms in place.'),
  ], pair('נשוף ביישור. אל תישען עם כל הגוף על הידית ואל תנעול מרפקים בכוח.', 'Exhale as you extend. Avoid leaning your bodyweight onto the handle or forcefully locking elbows.')),
  overhead: guide(pair('פשיטת מרפקים מעל הראש עם משקולת', 'Dumbbell overhead triceps extension'), ['יד אחורית'], ['משקולות יד'], 'overhead', [
    pair('אחוז משקולת אחת בשתי ידיים מעל הראש, במנח יציב.', 'Hold one dumbbell overhead with both hands in a stable stance.'),
    pair('כופף מרפקים לאט והורד את המשקולת מאחורי הראש בטווח נוח.', 'Bend elbows slowly to lower the weight behind your head through a comfortable range.'),
    pair('יישר מרפקים בלי להקפיץ את המשקולת.', 'Straighten your elbows without bouncing the weight.'),
  ], pair('נשוף ביישור. שמור בטן אסופה ואל תקשית את הגב כדי לסיים חזרה.', 'Exhale as you extend. Keep your core braced and avoid arching your back to finish a repetition.'), { level: 'בינוניים' }),
  curl: guide(pair('כפיפת מרפקים עם משקולות', 'Dumbbell biceps curl'), ['יד קדמית'], ['משקולות יד'], 'curl', [
    pair('שב או עמוד ביציבות, זרועות לצד הגוף וכפות ידיים לפנים.', 'Sit or stand steadily, arms by your sides and palms facing forward.'),
    pair('כופף מרפקים והרם משקולות בלי לשלוח זרועות קדימה.', 'Bend your elbows to lift the weights without moving upper arms forward.'),
    pair('הורד לאט עד לטווח היישור הנוח שלך.', 'Lower slowly through your comfortable elbow-extension range.'),
  ], pair('נשוף בכפיפה. אל תניף מהגב ואל תכופף שורשי כף יד במקום מרפקים.', 'Exhale as you curl. Avoid swinging your back or curling your wrists instead of elbows.')),
  hammer: guide(pair('פטישים', 'Hammer curl'), ['אמות', 'יד קדמית'], ['משקולות יד'], 'curl', [
    pair('אחוז משקולות לצד הגוף כשכפות הידיים פונות זו לזו.', 'Hold dumbbells by your sides with palms facing each other.'),
    pair('כופף מרפקים בלי לסובב את כפות הידיים.', 'Bend your elbows without rotating your palms.'),
    pair('הורד לאט כשהמרפקים נשארים קרובים לגוף.', 'Lower slowly, keeping elbows close to your sides.'),
  ], pair('נשוף בכפיפה. אל תניף את המשקולות ואל תקדם את הכתפיים.', 'Exhale as you curl. Avoid swinging the weights or rolling shoulders forward.')),
  wrist: guide(pair('כפיפה ופשיטה של שורש כף היד', 'Wrist flexion and extension'), ['אמות'], ['משקולות יד'], 'wrist', [
    pair('תמוך באמה על משטח יציב, כף היד מעבר לקצה ומשקולת קלה מאוד.', 'Rest your forearm on a stable surface, hand past the edge, with a very light weight.'),
    pair('הנע רק את שורש כף היד בטווח קטן ונוח.', 'Move only your wrist through a small comfortable range.'),
    pair('החזר לאט; שנה כיוון אחיזה בין כפיפה לפשיטה ובצע לכל יד.', 'Return slowly; change grip orientation between flexion and extension and work each hand.'),
  ], pair('נשום ברציפות. אל תזיז את האמה ואל תעבוד דרך כאב במפרק.', 'Breathe continuously. Avoid moving your forearm or working through wrist pain.')),
  lateral: guide(pair('הרחקת כתפיים עם משקולות', 'Dumbbell lateral raise'), ['כתפיים'], ['משקולות יד'], 'lateral', [
    pair('אחוז משקולות קלות לצד הגוף, מרפקים כפופים מעט.', 'Hold light dumbbells by your sides with elbows slightly bent.'),
    pair('הרם זרועות לצדדים עד לגובה נוח, לא מעבר לגובה הכתפיים.', 'Raise arms out to a comfortable height, no higher than your shoulders.'),
    pair('הורד לאט בלי להקפיץ מהגוף.', 'Lower slowly without swinging your body.'),
  ], pair('נשוף בהרמה. אל תמשוך כתפיים לאוזניים ואל תרים משקל שמצריך תנופה.', 'Exhale as you lift. Avoid shrugging or using a weight that requires momentum.')),
  front: guide(pair('הרמת כתפיים לפנים עם משקולות', 'Dumbbell front raise'), ['כתפיים'], ['משקולות יד'], 'front', [
    pair('עמוד יציב עם משקולות קלות לפני הירכיים.', 'Stand firmly with light dumbbells in front of your thighs.'),
    pair('הרם זרועות לפנים עד לגובה הכתפיים או פחות.', 'Raise your arms forward to shoulder height or lower.'),
    pair('הורד לאט כשהבטן אסופה.', 'Lower slowly, keeping your core braced.'),
  ], pair('נשוף בהרמה. אל תטה את הגב לאחור כדי להעלות את המשקולות.', 'Exhale as you lift. Avoid leaning back to raise the weights.')),
  reverse: guide(pair('פרפר הפוך בהטיית גב', 'Bent-over reverse fly'), ['כתפיים', 'גב'], ['משקולות יד'], 'reverse', [
    pair('כופף מעט ברכיים והטה את הגוף מהירכיים בגב ניטרלי.', 'Slightly bend your knees and hinge at your hips with a neutral back.'),
    pair('הרם משקולות קלות לצדדים, מרפקים כפופים מעט.', 'Raise light dumbbells out to your sides with elbows slightly bent.'),
    pair('הורד לאט בלי לשנות את זווית הגוף.', 'Lower slowly without changing your torso angle.'),
  ], pair('נשוף בהרמה. אל תעגל את הגב ואל תניף את הגוף.', 'Exhale as you lift. Avoid rounding your back or swinging your torso.'), { level: 'בינוניים' }),
  shoulder: guide(pair('לחיצת כתפיים במכונה', 'Machine shoulder press'), ['כתפיים', 'יד אחורית'], ['מכונה'], 'press', [
    pair('כוון מושב כך שהידיות מתחילות סביב גובה הכתפיים, וגב נתמך.', 'Adjust the seat so handles start near shoulder height, with your back supported.'),
    pair('לחץ כלפי מעלה בטווח נוח בלי לנעול מרפקים בכוח.', 'Press upward through a comfortable range without forcefully locking elbows.'),
    pair('הורד ידיות לאט לפי מסלול המכונה.', 'Lower the handles slowly along the machine path.'),
  ], pair('נשוף בלחיצה. אל תקשית גב ואל תרד לטווח שמכאיב לכתפיים.', 'Exhale as you press. Avoid back arching or a painful shoulder range.')),
  dumbbellPress: guide(pair('לחיצת כתפיים עם משקולות', 'Dumbbell shoulder press'), ['כתפיים', 'יד אחורית'], ['משקולות יד', 'ספסל'], 'press', [
    pair('שב על ספסל יציב עם משענת, משקולות בגובה הכתפיים.', 'Sit on a stable backed bench with weights at shoulder height.'),
    pair('לחץ כלפי מעלה כשהאמות מתחת למשקולות.', 'Press upward, keeping forearms beneath the weights.'),
    pair('הורד לאט לטווח נוח ושלוט בשתי הידיים.', 'Lower slowly through a comfortable range with control in both arms.'),
  ], pair('נשוף בלחיצה. אל תקשית את הגב ואל תטיח משקולות זו בזו.', 'Exhale as you press. Avoid arching your back or striking the weights together.'), { level: 'בינוניים' }),
  shrug: guide(pair('הרמת כתפיים עם משקולות', 'Dumbbell shrug'), ['טרפז'], ['משקולות יד'], 'shrug', [
    pair('עמוד עם משקולות לצד הגוף וידיים ישרות.', 'Stand with weights by your sides and arms straight.'),
    pair('הרם כתפיים ישר כלפי מעלה בלי לסובב אותן.', 'Lift shoulders straight upward without rotating them.'),
    pair('הורד לאט בלי להפיל את המשקל.', 'Lower slowly without dropping the weight.'),
  ], pair('נשוף בהרמה. אל תגלגל כתפיים ואל תקרב את הסנטר לחזה.', 'Exhale as you lift. Avoid rolling your shoulders or tucking your chin toward your chest.')),
  legPress: guide(pair('לחיצת רגליים במכונה', 'Machine leg press'), ['רגליים', 'ישבן'], ['מכונה'], 'legPress', [
    pair('כוון משענת והנח כפות רגליים יציבות על הפלטה.', 'Adjust the back support and place feet firmly on the platform.'),
    pair('דחוף את הפלטה בלי לנעול ברכיים בכוח.', 'Push the platform without forcefully locking your knees.'),
    pair('כופף ברכיים לאט רק כל עוד האגן והגב נשארים נתמכים.', 'Bend knees slowly only while hips and back remain supported.'),
  ], pair('נשוף בדחיפה. אל תנתק אגן מהמשענת ואל תקרוס עם הברכיים פנימה.', 'Exhale as you push. Keep hips against the support and avoid inward knee collapse.')),
  legExtension: guide(pair('פשיטת ברכיים במכונה', 'Machine leg extension'), ['רגליים'], ['מכונה'], 'legExtension', [
    pair('כוון את ציר המכונה לקו הברך ואת הכרית מעל הקרסול.', 'Align the machine pivot with your knee and the pad above your ankle.'),
    pair('יישר ברכיים בשליטה בלי להקפיץ את המשקל.', 'Straighten your knees with control without bouncing the load.'),
    pair('הורד לאט והשאר את האגן על המושב.', 'Lower slowly, keeping your hips on the seat.'),
  ], pair('נשוף ביישור. אל תנעל ברכיים בכוח ואל תרומם את הגוף מהמושב.', 'Exhale as you extend. Avoid forceful knee locking or lifting off the seat.')),
  legCurl: guide(pair('כפיפת ברכיים בישיבה במכונה', 'Seated machine leg curl'), ['רגליים'], ['מכונה'], 'legCurl', [
    pair('כוון ציר לקו הברך וכריות לפי הוראות המכונה.', 'Align the pivot with your knee and adjust pads according to the machine instructions.'),
    pair('כופף ברכיים ומשוך את הכרית מטה ולאחור.', 'Bend your knees, pulling the pad down and back.'),
    pair('חזור לאט בלי להרים אגן מהמושב.', 'Return slowly without lifting your hips off the seat.'),
  ], pair('נשוף בכפיפה. אל תמשוך מהגב ואל תבחר טווח שמכאיב לברך.', 'Exhale as you curl. Avoid pulling with your back or using a painful knee range.')),
  crunch: guide(pair('כפיפות בטן על הרצפה', 'Floor crunch'), ['בטן'], ['משקל גוף', 'מזרן'], 'crunch', [
    pair('שכב על הגב עם ברכיים כפופות וכפות רגליים על הרצפה.', 'Lie on your back with knees bent and feet on the floor.'),
    pair('הרם מעט את הראש והשכמות בעזרת הבטן, מבט באלכסון למעלה.', 'Lift your head and shoulder blades slightly using your abdominals, looking diagonally upward.'),
    pair('הורד לאט בלי למשוך את הצוואר.', 'Lower slowly without pulling on your neck.'),
  ], pair('נשוף בעלייה. זו כפיפה קטנה, לא עלייה לישיבה; אל תמשוך בידיים את הראש.', 'Exhale as you lift. This is a small curl, not a sit-up; do not pull your head with your hands.')),
  sideCrunch: guide(pair('כפיפות בטן לצדדים', 'Side crunch'), ['בטן'], ['משקל גוף', 'מזרן'], 'sideCrunch', [
    pair('שכב על הגב, ברכיים כפופות וידיים בתמיכה קלה בראש.', 'Lie on your back, knees bent and hands lightly supporting your head.'),
    pair('הרם מעט שכמה אחת והפנה כתף לכיוון הברך הנגדית.', 'Lift one shoulder blade slightly and turn that shoulder toward the opposite knee.'),
    pair('חזור לאט והחלף צד. רשום חזרות לכל צד.', 'Return slowly and alternate sides. Log repetitions per side.'),
  ], pair('נשוף בכפיפה. אל תמשוך בצוואר ואל תנסה לגעת בברך בכל מחיר.', 'Exhale as you curl. Avoid pulling your neck or forcing contact with your knee.')),
  plank: guide(pair('פלאנק על האמות', 'Forearm plank'), ['בטן', 'כתפיים'], ['משקל גוף', 'מזרן'], 'plank', [
    pair('הנח אמות על הרצפה, מרפקים מתחת לכתפיים.', 'Place forearms on the floor with elbows beneath your shoulders.'),
    pair('הרם אגן ושמור קו ישר ונוח מהראש לעקבים.', 'Lift your hips and hold a comfortable straight line from head to heels.'),
    pair('נשום לאורך ההחזקה; סיים כשאינך יכול לשמור על המנח.', 'Breathe throughout the hold; stop when you cannot maintain position.'),
  ], pair('נשום ברציפות. אל תפיל אגן ואל תרים אותו גבוה כדי להאריך את הזמן.', 'Breathe continuously. Avoid dropping your hips or raising them high to extend the hold.'), {
    video: { id: 'pSHjTRCQxIw', publisher: 'ScottHermanFitness', title: 'How To: Plank' },
  }),
  sidePlank: guide(pair('פלאנק צדי', 'Side plank'), ['בטן', 'כתפיים'], ['משקל גוף', 'מזרן'], 'sidePlank', [
    pair('שכב על הצד והנח מרפק מתחת לכתף.', 'Lie on your side with your elbow beneath your shoulder.'),
    pair('הרם אגן לקו הגוף; אפשר להישען על הברכיים לגרסה קלה יותר.', 'Lift your hips into line with your body; rest on bent knees for an easier version.'),
    pair('נשום, הורד בשליטה והחלף צד. מדוד זמן לכל צד.', 'Breathe, lower with control and switch sides. Time each side.'),
  ], pair('אל תשקע בכתף ואל תסובב את הגוף לפנים.', 'Avoid sinking into your shoulder or rotating your torso forward.'), { level: 'בינוניים' }),
  wallSit: guide(pair('ישיבת קיר', 'Wall sit'), ['רגליים'], ['משקל גוף', 'קיר'], 'wallSit', [
    pair('הישען בגב על קיר יציב והנח רגליים מעט לפנים.', 'Rest your back against a stable wall with feet slightly forward.'),
    pair('החלק מטה לזווית נוחה בברכיים, לא בהכרח לזווית ישרה.', 'Slide down to a comfortable knee angle, not necessarily a right angle.'),
    pair('החזק ונשום; חזור לעמידה בזהירות לפני אובדן שליטה.', 'Hold and breathe; stand up carefully before losing control.'),
  ], pair('אל תעצור נשימה ואל תדחוף את הברכיים בידיים.', 'Avoid holding your breath or pushing your knees with your hands.')),
  deadbug: guide(pair('דד באג', 'Dead bug'), ['בטן'], ['משקל גוף', 'מזרן'], 'deadbug', [
    pair('שכב על הגב, ידיים מעל הכתפיים וירכיים וברכיים כפופות.', 'Lie on your back with arms over shoulders and hips and knees bent.'),
    pair('הושט לאט יד ורגל נגדית בלי לשנות את מנח הגב.', 'Slowly extend the opposite arm and leg without changing your back position.'),
    pair('חזור והחלף צד. רשום חזרות לכל צד.', 'Return and switch sides. Log repetitions per side.'),
  ], pair('נשוף בהושטת הגפיים. קצר את הטווח אם הגב מתחיל להתקשת.', 'Exhale as you extend. Reduce the range if your back starts arching.')),
  birdDog: guide(pair('בירד דוג', 'Bird dog'), ['בטן', 'גב', 'ישבן'], ['משקל גוף', 'מזרן'], 'birdDog', [
    pair('התחל בעמידת שש, ידיים מתחת לכתפיים וברכיים מתחת לאגן.', 'Start on hands and knees, hands beneath shoulders and knees beneath hips.'),
    pair('הושט יד ורגל נגדית רק עד לקו הגוף.', 'Extend the opposite arm and leg only as far as your torso line.'),
    pair('חזור לאט והחלף צד. רשום חזרות לכל צד.', 'Return slowly and switch sides. Log repetitions per side.'),
  ], pair('נשוף בהושטת הגפיים. אל תסובב אגן ואל תרים רגל על חשבון הקשתת הגב.', 'Exhale as you extend. Avoid rotating your hips or arching your back to lift your leg.')),
  hang: guide(pair('החזקה סטטית במתח', 'Dead hang'), ['אמות', 'גב'], ['משקל גוף', 'מתח'], 'hang', [
    pair('אחוז במתח יציב ובעזרת מדרגה העבר משקל בהדרגה לידיים.', 'Grip a stable bar and use a step to transfer weight gradually into your hands.'),
    pair('תלה בשליטה בטווח נוח לכתפיים, בלי להתנדנד.', 'Hang with control through a comfortable shoulder range, without swinging.'),
    pair('נשום וחזור למדרגה לפני שהאחיזה נשמטת.', 'Breathe and step back onto the support before your grip fails.'),
  ], pair('אל תקפוץ למוט גבוה ואל תמשיך דרך כאב בכתף.', 'Avoid jumping to a high bar or continuing through shoulder pain.'), { level: 'בינוניים' }),
  dipHold: guide(pair('החזקה סטטית על מקבילים', 'Parallel-bar support hold'), ['יד אחורית', 'חזה', 'כתפיים'], ['משקל גוף', 'מקבילים'], 'dipHold', [
    pair('השתמש במקבילים יציבים ובמדרגה בטוחה לעלייה.', 'Use stable parallel bars and a safe step to mount.'),
    pair('תמוך בגוף בידיים ישרות אך לא נעולות בכוח, כתפיים רחוקות מהאוזניים.', 'Support yourself on straight but not forcefully locked arms, shoulders away from your ears.'),
    pair('נשום והורד רגליים לתמיכה לפני שהיציבות אובדת.', 'Breathe and return your feet to support before losing stability.'),
  ], pair('אל תשקע בין הכתפיים ואל תנסה ירידה למקבילים אם היא אינה חלק מהתרגיל.', 'Avoid sinking between your shoulders or attempting a dip when it is not part of the exercise.'), { level: 'בינוניים' }),
  farmer: guide(pair('החזקת מזוודות', 'Farmer hold'), ['אמות', 'טרפז', 'בטן'], ['משקולות יד'], 'farmer', [
    pair('הרם שתי משקולות מתאימות ועמוד ביציבות, ידיים לצד הגוף.', 'Pick up two suitable weights and stand firmly, arms by your sides.'),
    pair('שמור גוף זקוף, שורשי כף יד ישרים וכתפיים במנח טבעי.', 'Stay upright with straight wrists and shoulders in a natural position.'),
    pair('נשום והנח את המשקולות בבטחה לפני שהאחיזה מתעייפת מדי.', 'Breathe and set the weights down safely before your grip becomes too fatigued.'),
  ], pair('אל תרים כתפיים ואל תעצור נשימה; זו החזקה במקום, לא הליכה.', 'Avoid shrugging or holding your breath; this is a stationary hold, not a carry.')),
  walk: guide(pair('הליכה', 'Walking'), ['רגליים'], ['ללא ציוד'], 'walk', [
    pair('בחר מסלול בטוח או הליכון והתחל בקצב קל.', 'Choose a safe route or treadmill and start at an easy pace.'),
    pair('התקדם בצעדים נוחים ובקצב שמאפשר דיבור.', 'Use comfortable strides and a pace that allows conversation.'),
    pair('האט בהדרגה בסיום. התאם זמן וקצב ליכולת שלך.', 'Slow down gradually at the end. Adapt time and pace to your ability.'),
  ], pair('נשום בנוחות. אל תעלה להליכון נע במהירות ואל תכריח קצב שאינו מתאים לך.', 'Breathe comfortably. Do not step onto a fast-moving treadmill or force an unsuitable pace.'), { places: ['outside', 'gym'] }),
  march: guide(pair('הליכה במקום', 'Marching in place'), ['רגליים'], ['ללא ציוד'], 'march', [
    pair('פנה מרחב ישר ולא מחליק ועמוד ביציבות.', 'Clear a level, non-slip space and stand steadily.'),
    pair('הרם רגליים לסירוגין בגובה נוח, עם תנועת ידיים טבעית.', 'Lift your feet alternately to a comfortable height, with natural arm movement.'),
    pair('שמור קצב שמאפשר דיבור והאט בהדרגה בסיום.', 'Keep a pace that allows conversation and slow down gradually at the end.'),
  ], pair('נשום בנוחות. אין צורך להרים ברכיים גבוה או לקפוץ; היעזר במשענת יציבה אם צריך.', 'Breathe comfortably. There is no need for high knees or jumping; use a stable support if needed.')),
  jog: guide(pair('ריצה קלה', 'Easy jogging'), ['רגליים'], ['ללא ציוד'], 'jog', [
    pair('התחל בהליכה ובחר מסלול ישר ובטוח.', 'Start with a walk and choose a level, safe route.'),
    pair('עבור לריצה קלה בצעדים נוחים; האט להליכה אם אינך יכול לדבר במשפטים.', 'Transition to an easy jog with comfortable strides; slow to a walk if you cannot speak in sentences.'),
    pair('סיים בהליכה קלה. הזמן ניתן להתאמה ואינו תוכנית התקדמות אישית.', 'Finish with an easy walk. The duration is adjustable and is not a personal progression plan.'),
  ], pair('נשום באופן טבעי. אל תכריח מהירות או אורך צעד; עצור אם מופיע כאב חד.', 'Breathe naturally. Do not force speed or stride length; stop if sharp pain occurs.'), { places: ['outside', 'gym'] }),
};

Object.assign(EXERCISE_GUIDES, {
  chairStand: guide(pair('קימה מכיסא', 'Chair sit-to-stand'), ['רגליים', 'ישבן'], ['כיסא יציב'], 'chairStand', [
    pair('הצמד כיסא ללא גלגלים לקיר, ושב קרוב לקצה עם כפות הרגליים על הרצפה.', 'Place a non-wheeled chair against a wall and sit near the front with feet grounded.'),
    pair('הטה מעט את הגוף לפנים וקום בשליטה; אפשר להיעזר בידיים לפי הצורך.', 'Lean slightly forward and stand with control; use your hands for assistance if needed.'),
    pair('שלח את האגן לאחור ושב בעדינות, בלי ליפול למושב.', 'Move your hips back and sit gently, without dropping onto the seat.'),
  ], pair('נשוף בקימה. הכיסא מיועד לישיבה בלבד: אין לעמוד עליו או להשתמש בו כספסל משקולות.', 'Exhale as you stand. The chair is for sitting only: never stand on it or use it as a weight bench.')),
  wallPushup: guide(pair('שכיבות סמיכה כנגד קיר', 'Wall push-up'), ['חזה', 'יד אחורית', 'כתפיים'], ['קיר'], 'wallPushup', [
    pair('עמוד מול קיר יציב והנח עליו ידיים בגובה החזה, מעט מעבר לרוחב הכתפיים.', 'Face a solid wall and place your hands at chest height, slightly wider than your shoulders.'),
    pair('כופף מרפקים והקרב את החזה לקיר, כשהגוף נשאר בקו אחד.', 'Bend your elbows to bring your chest toward the wall, keeping your body aligned.'),
    pair('דחוף בעדינות וחזור. התחל קרוב לקיר לפני הגדלת המרחק.', 'Push gently back. Start close to the wall before increasing the distance.'),
  ], pair('נשוף בדחיפה. ודא שהרגליים אינן מחליקות והימנע מהפלת האגן.', 'Exhale as you push. Keep your feet from slipping and avoid dropping your hips.')),
  kneePushup: guide(pair('שכיבות סמיכה על הברכיים', 'Kneeling push-up'), ['חזה', 'יד אחורית', 'כתפיים'], ['משקל גוף', 'מזרן'], 'kneePushup', [
    pair('הנח ידיים מתחת לכתפיים וברכיים על מזרן, ושמור קו ישר מהראש לברכיים.', 'Place hands beneath your shoulders and knees on a mat, keeping a straight head-to-knee line.'),
    pair('הורד את החזה בשליטה עם מרפקים באלכסון לאחור.', 'Lower your chest with control, elbows angled back.'),
    pair('דחוף וחזור בלי לקפל את הגוף במותניים.', 'Push back without folding at your hips.'),
  ], pair('נשוף בדחיפה. השתמש בטווח נוח ובחר קיר אם קשה לשמור על מנח הגוף.', 'Exhale as you push. Use a comfortable range and choose a wall if alignment is difficult.')),
  inclinePushup: guide(pair('שכיבות סמיכה על ספסל יציב', 'Bench incline push-up'), ['חזה', 'יד אחורית', 'כתפיים'], ['משקל גוף', 'ספסל'], 'inclinePushup', [
    pair('השתמש בספסל אימון יציב שאינו יכול לזוז או להתהפך, והנח עליו ידיים.', 'Use a stable exercise bench that cannot move or tip and place your hands on it.'),
    pair('התרחק ברגליים והורד את החזה לעבר הספסל כשהגוף בקו אחד.', 'Step your feet back and lower your chest toward the bench with your body aligned.'),
    pair('דחוף וחזור בשליטה בלי לנעול מרפקים בכוח.', 'Push back with control without forcefully locking your elbows.'),
  ], pair('נשוף בדחיפה. אין להחליף את הספסל בכיסא קל, מתקפל או בעל גלגלים.', 'Exhale as you push. Do not substitute a light, folding or wheeled chair.')),
  trxRow: guide(pair('חתירה ברצועות TRX', 'TRX suspension row'), ['גב', 'יד קדמית'], ['TRX'], 'trxRow', [
    pair('השתמש רק ברצועות ובעיגון שהותקנו ונבדקו לפי הוראות היצרן; התחל כמעט זקוף.', 'Use only straps and an anchor installed and checked to manufacturer instructions; start nearly upright.'),
    pair('הישען מעט לאחור בגוף ישר, ומשוך את החזה לידיות בהובלת המרפקים.', 'Lean back slightly with a straight body and pull your chest toward the handles, leading with your elbows.'),
    pair('יישר ידיים לאט וחזור. זווית זקופה יותר מפחיתה את הקושי.', 'Straighten your arms slowly to return. A more upright angle reduces difficulty.'),
  ], pair('נשוף במשיכה. אין לאלתר עיגון לכיסא, ידית דלת או רהיט; עצור אם העיגון זז.', 'Exhale as you pull. Never improvise an anchor on a chair, door handle or furniture; stop if it moves.')),
  bentRow: guide(pair('חתירה בהטיה עם שתי משקולות', 'Bent-over dumbbell row'), ['גב', 'יד קדמית'], ['משקולות יד'], 'bentRow', [
    pair('כופף מעט ברכיים, שלח אגן לאחור והחזק משקולות מתחת לכתפיים בגב ניטרלי.', 'Soften your knees, hinge your hips back and hold dumbbells beneath your shoulders with a neutral back.'),
    pair('משוך מרפקים לכיוון המותניים בלי לשנות את זווית הגוף.', 'Pull your elbows toward your waist without changing your torso angle.'),
    pair('הורד משקולות לאט. הקטן עומס אם אינך יכול לשמור על המנח.', 'Lower the weights slowly. Reduce the load if you cannot maintain the position.'),
  ], pair('נשוף במשיכה. אין להניף את הגוף או לעגל גב כדי להשלים חזרה.', 'Exhale as you pull. Do not swing your torso or round your back to finish a repetition.'), { level: 'בינוניים' }),
  bandBentRow: guide(pair('חתירה בהטיה עם גומייה', 'Bent-over resistance-band row'), ['גב', 'יד קדמית'], ['גומייה'], 'bentRow', [
    pair('בדוק גומייה תקינה, דרוך על מרכזה לפי הוראות היצרן והחזק את הקצוות.', 'Check an intact band, stand on its middle as the manufacturer directs and hold the ends.'),
    pair('הטה את הגוף מהירכיים בגב ניטרלי ומשוך מרפקים לאחור.', 'Hinge at your hips with a neutral back and pull your elbows back.'),
    pair('שחרר את המתח לאט בלי לעזוב את הקצוות.', 'Release tension slowly without letting go of the ends.'),
  ], pair('נשוף במשיכה. ודא שהגומייה אינה מחליקה מתחת לנעליים; אין למשוך לכיוון הפנים.', 'Exhale as you pull. Keep the band secure beneath your shoes; never pull toward your face.')),
  splitSquat: guide(pair('סקוואט בפישוק קדמי', 'Bodyweight split squat'), ['רגליים', 'ישבן'], ['משקל גוף'], 'splitSquat', [
    pair('עמוד בפישוק קדמי נוח; אפשר להיעזר בקיר לשיווי משקל.', 'Take a comfortable split stance; use a wall for balance if needed.'),
    pair('כופף את שתי הברכיים ורד אנכית בטווח נשלט, בלי לצעוד.', 'Bend both knees and lower vertically through a controlled range without stepping.'),
    pair('חזור לעמידה והחלף צד. רשום חזרות לכל צד.', 'Rise and switch sides. Log repetitions per side.'),
  ], pair('נשוף בעלייה. השאר את כף הרגל הקדמית יציבה ואת הברך בכיוון האצבעות.', 'Exhale as you rise. Keep the front foot grounded and knee tracking with your toes.'), { sides: 2 }),
  sumoSquat: guide(pair('סקוואט בעמידה רחבה', 'Bodyweight sumo squat'), ['רגליים', 'ישבן'], ['משקל גוף'], 'sumoSquat', [
    pair('עמוד מעט רחב מרוחב הכתפיים, בהפניית אצבעות נוחה החוצה.', 'Stand slightly wider than shoulder-width with a comfortable outward toe angle.'),
    pair('כופף ירכיים וברכיים יחד, כשהברכיים עוקבות אחרי כפות הרגליים.', 'Bend hips and knees together, keeping knees aligned with your feet.'),
    pair('דחוף דרך כל כף הרגל וחזור לעמידה בשליטה.', 'Push through your whole feet to stand with control.'),
  ], pair('נשוף בעלייה. אין צורך בפישוק קיצוני או בעומק שמאבד יציבות.', 'Exhale as you rise. Avoid an extreme stance or a depth that compromises stability.')),
  singleBridge: guide(pair('גשר ישבן על רגל אחת', 'Single-leg glute bridge'), ['ישבן', 'רגליים'], ['משקל גוף', 'מזרן'], 'singleBridge', [
    pair('שכב על הגב עם ברכיים כפופות, והרם רגל אחת בלי לסובב אגן.', 'Lie on your back with bent knees and lift one foot without rotating your pelvis.'),
    pair('דחוף דרך הרגל שעל הרצפה והרם מעט את האגן בקו ישר.', 'Push through the grounded foot and lift your hips slightly while staying aligned.'),
    pair('הורד לאט והחלף רגל. רשום חזרות לכל צד.', 'Lower slowly and switch legs. Log repetitions per side.'),
  ], pair('נשוף בהרמה. הקטן גובה אם האגן מסתובב; גשר בשתי רגליים הוא חלופה קלה יותר.', 'Exhale as you lift. Reduce height if your pelvis rotates; a two-leg bridge is an easier option.'), { level: 'בינוניים', sides: 2 }),
  clamShell: guide(pair('פתיחת ברך בשכיבה על הצד', 'Side-lying clamshell'), ['ישבן'], ['משקל גוף', 'מזרן'], 'clamShell', [
    pair('שכב על הצד, ברכיים כפופות וכפות הרגליים יחד, כשהראש נתמך בנוחות.', 'Lie on your side with bent knees and feet together, supporting your head comfortably.'),
    pair('פתח את הברך העליונה מעט בלי לגלגל את האגן לאחור.', 'Open the top knee slightly without rolling your pelvis backward.'),
    pair('סגור לאט והחלף צד. רשום חזרות לכל צד.', 'Close slowly and switch sides. Log repetitions per side.'),
  ], pair('נשוף בפתיחה. הטווח קטן; אל תחליף את תנועת הירך בסיבוב הגב.', 'Exhale as you open. Keep the range small; do not substitute back rotation for hip movement.'), { sides: 2 }),
  singleCalf: guide(pair('עליית עקב ברגל אחת', 'Single-leg calf raise'), ['שוקיים'], ['משקל גוף', 'קיר'], 'singleCalf', [
    pair('עמוד על רצפה ישרה, הנח יד על קיר והרם רגל אחת מעט.', 'Stand on a level floor, place a hand on a wall and lift one foot slightly.'),
    pair('עלה על כרית כף הרגל התומכת בלי לגלגל את הקרסול לצדדים.', 'Rise onto the ball of your supporting foot without rolling your ankle sideways.'),
    pair('הורד עקב לאט לרצפה והחלף צד. רשום חזרות לכל צד.', 'Lower your heel slowly to the floor and switch sides. Log repetitions per side.'),
  ], pair('נשוף בעלייה. אין לעמוד על קצה כיסא או מדרגה לא יציבה; התחל בשתי רגליים אם צריך.', 'Exhale as you rise. Never stand on a chair edge or unstable step; start on both feet if needed.'), { sides: 2 }),
  standingPress: guide(pair('לחיצת כתפיים בעמידה עם משקולות', 'Standing dumbbell shoulder press'), ['כתפיים', 'יד אחורית'], ['משקולות יד'], 'standingPress', [
    pair('עמוד ביציבות והחזק משקולות קלות לצד הכתפיים, שורשי כף יד מעל המרפקים.', 'Stand firmly and hold light dumbbells beside your shoulders, wrists above elbows.'),
    pair('לחץ למעלה בטווח נוח בלי להישען לאחור.', 'Press upward through a comfortable range without leaning backward.'),
    pair('הורד לאט לעמדת ההתחלה.', 'Lower slowly to the starting position.'),
  ], pair('נשוף בלחיצה. אם הגב מתקשת, הקטן עומס או טווח; אין לדחוף בעזרת הברכיים.', 'Exhale as you press. Reduce load or range if your back arches; do not drive with your knees.'), { level: 'בינוניים' }),
  rearFly: guide(pair('פרפר הפוך עם משקולות בהטיה', 'Bent-over dumbbell reverse fly'), ['כתפיים', 'גב'], ['משקולות יד'], 'reverse', [
    pair('הטה את הגוף מהירכיים בגב ניטרלי והחזק משקולות קלות מתחת לחזה.', 'Hinge at your hips with a neutral back and hold light dumbbells beneath your chest.'),
    pair('פתח זרועות לצדדים בכיפוף קל של המרפקים, רק בטווח נוח.', 'Open your arms sideways with slightly bent elbows, only through a comfortable range.'),
    pair('הורד לאט בלי לשנות את זווית הגוף.', 'Lower slowly without changing your torso angle.'),
  ], pair('נשוף בפתיחה. אל תניף את המשקולות או תמשוך כתפיים לאוזניים.', 'Exhale as you open. Avoid swinging the weights or shrugging toward your ears.'), { level: 'בינוניים', view: pair('סכמת תנועת הזרועות; מנח ההטיה מוסבר בהוראות', 'Arm-movement schematic; see instructions for the hip hinge') }),
  alternatingCurl: guide(pair('כפיפת מרפקים לסירוגין', 'Alternating dumbbell curl'), ['יד קדמית'], ['משקולות יד'], 'curl', [
    pair('עמוד ביציבות, משקולות לצד הגוף וכפות ידיים לפנים.', 'Stand firmly with dumbbells at your sides and palms facing forward.'),
    pair('כופף מרפק אחד בלי להניע את הזרוע קדימה והורד לאט.', 'Bend one elbow without moving your upper arm forward and lower slowly.'),
    pair('החלף יד. רשום מספר חזרות לכל יד, לא את סכום שתי הידיים.', 'Switch arms. Log repetitions per arm, not the sum of both arms.'),
  ], pair('נשוף בכפיפה. שמור שורשי כף יד ישרים ואל תניף מהגב.', 'Exhale as you curl. Keep wrists straight and avoid swinging your back.'), { sides: 2 }),
  concentrationCurl: guide(pair('כפיפת מרפק בריכוז בישיבה', 'Seated concentration curl'), ['יד קדמית'], ['משקולות יד', 'כיסא יציב'], 'concentrationCurl', [
    pair('שב על כיסא יציב ללא גלגלים, פשק מעט ברכיים ותמוך בזרוע בפנים הירך.', 'Sit on a stable non-wheeled chair, separate your knees slightly and support your upper arm against your inner thigh.'),
    pair('כופף את המרפק עם משקולת קלה בלי להזיז את הכתף.', 'Curl a light dumbbell without moving your shoulder.'),
    pair('הורד בשליטה והחלף יד. רשום חזרות לכל יד.', 'Lower with control and switch arms. Log repetitions per arm.'),
  ], pair('נשוף בכפיפה. אל תלחץ את המרפק לתוך מפרק הברך ואל תעזור בתנופה.', 'Exhale as you curl. Avoid pressing your elbow into the knee joint or using momentum.'), { sides: 2 }),
  kickback: guide(pair('פשיטת מרפקים לאחור עם משקולות', 'Dumbbell triceps kickback'), ['יד אחורית'], ['משקולות יד'], 'kickback', [
    pair('הטה את הגוף מהירכיים בגב ניטרלי, מרפקים כפופים וזרועות סמוכות לגוף.', 'Hinge at your hips with a neutral back, bent elbows and upper arms close to your torso.'),
    pair('יישר מרפקים לאחור עם משקולות קלות, בלי להזיז את הזרועות.', 'Straighten your elbows backward with light dumbbells, keeping upper arms still.'),
    pair('כופף מרפקים בחזרה לאט.', 'Bend your elbows back slowly.'),
  ], pair('נשוף ביישור. אל תטלטל את המשקולות או תנעל מרפקים בכוח.', 'Exhale as you extend. Avoid swinging the weights or forcefully locking elbows.'), { level: 'בינוניים' }),
  closePushup: guide(pair('שכיבות סמיכה באחיזה צרה', 'Close-grip push-up'), ['יד אחורית', 'חזה', 'כתפיים'], ['משקל גוף'], 'pushup', [
    pair('הנח ידיים קרובות יותר מרוחב הכתפיים, אך לא בהכרח בצורת יהלום, ושמור גוף ישר.', 'Place your hands closer than shoulder-width, not necessarily in a diamond, and keep your body straight.'),
    pair('כופף מרפקים בסמוך לגוף והורד את החזה בטווח נוח.', 'Bend your elbows near your torso and lower your chest through a comfortable range.'),
    pair('דחוף וחזור בלי להפיל את האגן.', 'Push back without dropping your hips.'),
  ], pair('נשוף בדחיפה. אם כואב בשורש כף היד או קשה לשלוט, בחר וריאציה קלה יותר.', 'Exhale as you push. Choose an easier variation if wrists hurt or control is difficult.'), { level: 'בינוניים' }),
  lyingTriceps: guide(pair('פשיטת מרפקים עם משקולות בשכיבה על הרצפה', 'Lying dumbbell triceps extension'), ['יד אחורית'], ['משקולות יד', 'מזרן'], 'lyingTriceps', [
    pair('שכב על הגב עם ברכיים כפופות והחזק משקולות קלות מעל הכתפיים.', 'Lie on your back with bent knees and hold light dumbbells above your shoulders.'),
    pair('כופף מרפקים לאט והורד משקולות לצדי הראש, הרחק מהפנים.', 'Bend your elbows slowly, lowering the weights beside your head and away from your face.'),
    pair('יישר מרפקים בשליטה בלי לשנות את מיקום הזרועות.', 'Straighten your elbows with control, keeping upper arms in place.'),
  ], pair('נשוף ביישור. הקפד על אחיזה סגורה ועל מרווח מהראש; אל תמשיך כשאינך שולט במשקל.', 'Exhale as you extend. Use a closed grip and keep clear of your head; stop before losing weight control.'), { level: 'בינוניים' }),
  heelTap: guide(pair('נגיעת עקב לסירוגין בשכיבה', 'Supine alternating heel tap'), ['בטן'], ['משקל גוף', 'מזרן'], 'heelTap', [
    pair('שכב על הגב עם ירכיים וברכיים כפופות, ובטן אסופה בנוחות.', 'Lie on your back with hips and knees bent, gently bracing your core.'),
    pair('הורד עקב אחד לרצפה בלי לשנות את מנח הגב או האגן.', 'Lower one heel to the floor without changing your back or pelvis position.'),
    pair('חזור והחלף רגל. רשום חזרות לכל צד.', 'Return and switch legs. Log repetitions per side.'),
  ], pair('נשוף בהורדה. קצר את הטווח אם הגב מתחיל להתקשת.', 'Exhale as you lower. Shorten the range if your back starts arching.'), { sides: 2 }),
  reverseCrunch: guide(pair('כפיפת בטן הפוכה', 'Reverse crunch'), ['בטן'], ['משקל גוף', 'מזרן'], 'reverseCrunch', [
    pair('שכב על הגב עם ברכיים כפופות וידיים מונחות לצד הגוף.', 'Lie on your back with bent knees and arms resting by your sides.'),
    pair('קרב ברכיים בעדינות והרם מעט את האגן באמצעות כיווץ הבטן, בלי תנופה.', 'Gently bring your knees closer and lift your pelvis slightly using your abdominals, without momentum.'),
    pair('החזר את האגן לאט; הראש והכתפיים נשארים על המזרן.', 'Lower your pelvis slowly; keep your head and shoulders on the mat.'),
  ], pair('נשוף בכיווץ. זו תנועה קטנה; אל תגלגל משקל לצוואר.', 'Exhale as you contract. Keep the movement small; never roll weight onto your neck.')),
  kneeSidePlank: guide(pair('פלאנק צדי על הברכיים', 'Bent-knee side plank'), ['בטן'], ['משקל גוף', 'מזרן'], 'kneeSidePlank', [
    pair('שכב על הצד, ברכיים כפופות ומרפק מתחת לכתף.', 'Lie on your side with bent knees and your elbow beneath your shoulder.'),
    pair('הרם אגן לקו ישר מהכתף לברכיים והחזק תוך נשימה.', 'Lift your hips into a shoulder-to-knee line and hold while breathing.'),
    pair('הורד בשליטה והחלף צד. הזמן הרשום הוא לכל צד.', 'Lower with control and switch sides. The recorded time is per side.'),
  ], pair('אל תשקע בכתף ואל תעצור נשימה. סיים לפני אובדן יציבות.', 'Avoid sinking into your shoulder or holding your breath. Finish before losing stability.'), { sides: 2 }),
  reverseCurl: guide(pair('כפיפת מרפקים באחיזה הפוכה', 'Dumbbell reverse curl'), ['אמות', 'יד קדמית'], ['משקולות יד'], 'curl', [
    pair('אחוז משקולות קלות כשכפות הידיים פונות לאחור והאגודלים סוגרים את האחיזה.', 'Hold light dumbbells with palms facing backward and thumbs wrapped around the handles.'),
    pair('כופף מרפקים בלי לכופף את שורשי כף היד.', 'Bend your elbows without bending your wrists.'),
    pair('הורד לאט, כשהמרפקים נשארים בצדי הגוף.', 'Lower slowly, keeping elbows beside your body.'),
  ], pair('נשוף בכפיפה. בחר עומס קל יותר מאשר בכפיפה רגילה והפסק אם מופיע כאב במפרק.', 'Exhale as you curl. Use a lighter load than a regular curl and stop if joint pain occurs.')),
  stepTouch: guide(pair('צעדי צד ללא קפיצה', 'Low-impact step touch'), ['רגליים'], ['ללא ציוד'], 'stepTouch', [
    pair('פנה שטח ישר ולא מחליק ועמוד ברגליים ברוחב נוח.', 'Clear a level non-slip area and stand with a comfortable stance.'),
    pair('צעד הצדה וקרב את הרגל השנייה בעדינות, ואז החלף כיוון.', 'Step sideways and gently bring the other foot in, then change direction.'),
    pair('שמור צעדים קטנים וקצב שמאפשר דיבור; האט בהדרגה בסיום.', 'Keep steps small at a pace that allows conversation; slow down gradually at the end.'),
  ], pair('נשום בנוחות. אין לקפוץ או להצליב רגליים; היעזר בקיר אם צריך.', 'Breathe comfortably. Do not jump or cross your feet; use a wall for support if needed.'), { places: ['home', 'gym'] }),
});

// Instructions and diagrams are authored locally; selected video pages are reviewed below.
// Links only: no third-party video, thumbnail or PDF artwork is copied into the app.
const expandedGuide = (name, muscles, equipment, pose, movement, steps, options = {}) =>
  guide(name, muscles, equipment, pose, steps,
    pair('נשום ברצף ועבוד בשליטה, בלי תנופה. בחר טווח נוח והפסק אם מופיע כאב.',
      'Keep breathing and move under control without momentum. Use a comfortable range and stop if pain occurs.'),
    { level: 'בינוניים', movement, compound: false,
      view: pair('איור תנועה סכמטי. את התאמת המכשיר והמנח יש לבדוק לפי ההנחיות והוראות היצרן.',
        'Schematic movement illustration. Check setup and positioning against the instructions and equipment manufacturer.'),
      ...options });
const CATALOG_EXTENSION = {
  barbellBench: expandedGuide(pair('לחיצת חזה עם מוט', 'Barbell bench press'), ['חזה', 'יד אחורית', 'כתפיים'], ['מוט', 'ספסל'], 'chest', 'horizontal-push', [
    pair('כוון ספסל וכלוב עם מוט אבטחה או משגיח מיומן; הצב רגליים יציבות.', 'Set a bench inside a rack with safeties or a competent spotter; plant your feet.'),
    pair('אחוז סימטרית והורד את המוט בשליטה לכיוון מרכז החזה.', 'Grip symmetrically and lower the bar under control toward the middle of your chest.'),
    pair('לחץ מעלה בלי להקפיץ מהחזה והחזר למתלים רק כשהמוט יציב.', 'Press up without bouncing off your chest and rerack only with the bar controlled.'),
  ], { compound: true }),
  inclineDumbbellPress: expandedGuide(pair('לחיצת חזה בשיפוע עם משקולות', 'Incline dumbbell bench press'), ['חזה', 'יד אחורית', 'כתפיים'], ['משקולות יד', 'ספסל'], 'inclinePress', 'horizontal-push', [
    pair('כוון ספסל לשיפוע מתון, נעל אותו והישען עם רגליים על הרצפה.', 'Lock a bench at a moderate incline and sit back with feet on the floor.'),
    pair('לחץ את המשקולות מעל החזה העליון, כשהמרפקים מתחת לשורשי כף היד.', 'Press the dumbbells above your upper chest, keeping wrists over elbows.'),
    pair('הורד לאט לטווח נוח לכתפיים בלי לנתק את הישבן מהספסל.', 'Lower slowly through a comfortable shoulder range without lifting your hips off the bench.'),
  ], { compound: true }),
  smithInclinePress: expandedGuide(pair('לחיצת חזה בשיפוע בסמית׳', 'Smith machine incline bench press'), ['חזה', 'יד אחורית', 'כתפיים'], ['מכונה', 'ספסל'], 'inclinePress', 'horizontal-push', [
    pair('נעל ספסל בשיפוע מתון בתוך הסמית׳ והתאם מיקום ומעצורי בטיחות לפי המכשיר.', 'Lock an inclined bench inside the Smith machine and set its position and safety stops for that machine.'),
    pair('שחרר את המוט רק לאחר בדיקת הנעילה והורד לכיוון החזה העליון בשליטה.', 'Unrack only after checking the locking system and lower toward your upper chest under control.'),
    pair('לחץ וחזור לנעילה יציבה לפני שחרור האחיזה; בקש הדרכת צוות בהיכרות ראשונה.', 'Press and lock the bar securely before releasing it; ask staff for first-use instruction.'),
  ], { compound: true, places: ['gym'] }),
  highCableFly: expandedGuide(pair('פרפר חזה בפולי עליון', 'High cable chest fly'), ['חזה', 'כתפיים'], ['מכונה'], 'cableFly', 'chest-isolation', [
    pair('כוון שני כבלים מעט מעל גובה הכתפיים ובחר עומס קל שאפשר לשלוט בו.', 'Set two cables slightly above shoulder height and choose a controllable light load.'),
    pair('בעמידה יציבה אסוף ידיות בקשת קדימה ומעט מטה, עם כיפוף מרפקים קבוע.', 'From a stable stance, bring the handles forward and slightly down in an arc, keeping a fixed elbow bend.'),
    pair('פתח לאט רק עד טווח נוח, בלי למשוך את הכתפיים מאחורי הגוף.', 'Open slowly only through a comfortable range without pulling the shoulders behind your body.'),
  ]),
  chestPressMachine: expandedGuide(pair('לחיצת חזה במכונה', 'Machine chest press'), ['חזה', 'יד אחורית', 'כתפיים'], ['מכונה'], 'chestMachine', 'horizontal-push', [
    pair('כוון מושב כך שהידיות יהיו מול החזה והגב ייתמך במשענת.', 'Adjust the seat so the handles face your chest and your back rests against the pad.'),
    pair('דחוף את הידיות קדימה בלי להרים כתפיים או לנעול מרפקים בכוח.', 'Push the handles forward without shrugging or forcefully locking your elbows.'),
    pair('חזור לאט לפי מסלול המכשיר, בלי לתת למשקולות להיטרק.', 'Return slowly along the machine path without letting the weight stack slam.'),
  ], { compound: true, level: 'מתחילים' }),
  pecDeck: expandedGuide(pair('פרפר חזה במכונה', 'Pec deck chest fly'), ['חזה', 'כתפיים'], ['מכונה'], 'seatedFly', 'chest-isolation', [
    pair('כוון מושב ומשענות כך שהזרועות בגובה נוח לכתפיים, לא מאחוריהן.', 'Adjust the seat and pads to a comfortable shoulder height, not behind your shoulders.'),
    pair('אסוף את הזרועות קדימה בקשת כשהגב נשען והבטן יציבה.', 'Bring your arms forward in an arc with your back supported and core steady.'),
    pair('פתח לאט לטווח נוח בלבד; אל תכריח מתיחה עמוקה.', 'Open slowly only through a comfortable range; do not force a deep stretch.'),
  ], { level: 'מתחילים' }),
  barbellRow: expandedGuide(pair('חתירה בהטיה עם מוט', 'Bent-over barbell row'), ['גב', 'יד קדמית'], ['מוט'], 'bentRow', 'horizontal-pull', [
    pair('אחוז מוט, כופף מעט ברכיים ושלח אגן לאחור בגב ניטרלי.', 'Grip a barbell, soften your knees and hinge your hips back with a neutral back.'),
    pair('משוך את המוט לכיוון הבטן בלי להרים את פלג הגוף בתנופה.', 'Pull the bar toward your abdomen without jerking your torso upward.'),
    pair('יישר ידיים לאט תוך שמירה על זווית הגוף; הורד עומס אם המנח משתנה.', 'Straighten your arms slowly while maintaining your torso angle; reduce load if your position changes.'),
  ], { compound: true }),
  chestSupportedRow: expandedGuide(pair('חתירה עם משקולות בתמיכת חזה', 'Chest-supported dumbbell row'), ['גב', 'יד קדמית'], ['משקולות יד', 'ספסל'], 'supportedRow', 'horizontal-pull', [
    pair('נעל ספסל בשיפוע והשען עליו את החזה כשהרגליים יציבות.', 'Lock an inclined bench and support your chest on it with feet firmly planted.'),
    pair('משוך את המרפקים לאחור לכיוון הצלעות בלי לנתק את החזה מהמשענת.', 'Pull your elbows back toward your ribs without lifting your chest from the pad.'),
    pair('הורד את המשקולות לאט בלי למתוח את הצוואר קדימה.', 'Lower the dumbbells slowly without reaching your neck forward.'),
  ], { compound: true }),
  oneArmCableRow: expandedGuide(pair('חתירה ביד אחת בפולי', 'Single-arm cable row'), ['גב', 'יד קדמית'], ['מכונה'], 'row', 'horizontal-pull', [
    pair('כוון כבל לגובה הבטן ועמוד או שב לפי הוראות התחנה, עם אגן יציב.', 'Set the cable at abdomen height and stand or sit as the station specifies, keeping your pelvis steady.'),
    pair('משוך ביד אחת לכיוון הצלעות בלי לסובב את הגוף.', 'Pull with one arm toward your ribs without rotating your body.'),
    pair('חזור לאט וחזור בצד השני; רשום חזרות לכל צד.', 'Return slowly and repeat on the other side; log repetitions per side.'),
  ], { compound: true, sides: 2 }),
  straightArmPulldown: expandedGuide(pair('פשיטת כתפיים בפולי עליון', 'Straight-arm cable pulldown'), ['גב'], ['מכונה'], 'straightArm', 'shoulder-extension', [
    pair('אחוז ידית פולי גבוה והתרחק מעט, עם מרפקים בכיפוף קטן וקבוע.', 'Grip a high cable attachment and step back slightly with a small fixed elbow bend.'),
    pair('הורד את הידית בקשת לכיוון הירכיים בלי לקמר את הגב.', 'Bring the attachment down in an arc toward your thighs without arching your back.'),
    pair('חזור לאט מעלה תוך שמירה על אותו כיפוף במרפקים.', 'Return upward slowly while maintaining the same elbow bend.'),
  ]),
  neutralPulldown: expandedGuide(pair('משיכה בפולי עליון באחיזה צרה ניטרלית', 'Close neutral-grip lat pulldown'), ['גב', 'יד קדמית'], ['מכונה'], 'pulldown', 'vertical-pull', [
    pair('כוון משענת ירכיים ובחר ידית ניטרלית שבה כפות הידיים פונות זו לזו.', 'Adjust the thigh pad and choose a neutral handle with palms facing each other.'),
    pair('משוך מרפקים לכיוון הצלעות ואת הידית לעבר החזה, בלי תנופה.', 'Pull your elbows toward your ribs and the handle toward your chest without swinging.'),
    pair('חזור לאט למעלה בלי למשוך מאחורי העורף.', 'Return upward slowly without pulling behind your neck.'),
  ], { compound: true, level: 'מתחילים' }),
  pullup: expandedGuide(pair('מתח באחיזה רחבה נוחה', 'Comfortably wide-grip pull-up'), ['גב', 'יד קדמית'], ['מתח'], 'pullup', 'vertical-pull', [
    pair('השתמש במוט מתח תקין ומותקן כראוי; בחר אחיזה מעט רחבה מהכתפיים ונוחה להן.', 'Use a sound, properly installed pull-up bar with a comfortable grip slightly wider than your shoulders.'),
    pair('משוך את הגוף מעלה בהובלת המרפקים, בלי בעיטה או תנופה.', 'Pull your body upward by driving your elbows down, without kicking or swinging.'),
    pair('רד בשליטה; בחר גרביטון או פולי אם אין שליטה לאורך התנועה.', 'Lower under control; choose an assisted machine or pulldown if you cannot control the movement.'),
  ], { compound: true }),
  hackSquatMachine: expandedGuide(pair('האק סקוואט במכונה', 'Hack squat machine'), ['רגליים', 'ישבן'], ['מכונה'], 'hackSquat', 'squat', [
    pair('התאם כתפיות וכפות רגליים למכשיר ובדוק מעצורי בטיחות לפני שחרור העגלה.', 'Fit the shoulder pads and foot position to the machine and check the safety stops before releasing the sled.'),
    pair('רד לאט כשהגב והאגן נתמכים והברכיים בכיוון האצבעות.', 'Lower slowly with your back and pelvis supported and knees tracking with your toes.'),
    pair('דחוף דרך כפות הרגליים וחזור בלי נעילת ברכיים בכוח; נעל את העגלה לפני יציאה.', 'Push through your feet without forcefully locking your knees; lock the sled before exiting.'),
  ], { compound: true }),
  barbellSquat: expandedGuide(pair('סקוואט עם מוט על הגב', 'Barbell back squat'), ['רגליים', 'ישבן'], ['מוט'], 'backSquat', 'squat', [
    pair('השתמש בכלוב עם מוטות בטיחות ובדוק את גובהם עם מוט קל תחילה.', 'Use a rack with safeties and check their height with a light bar first.'),
    pair('הנח מוט על הגב העליון ולא על הצוואר, ורד בשליטה כשהברכיים עוקבות אחר כפות הרגליים.', 'Rest the bar on your upper back, not your neck, and lower with knees tracking your feet.'),
    pair('עלה בגב יציב והחזר למתלים בשליטה; בקש הדרכה מעשית לפני ניסיון ראשון.', 'Stand with a stable back and rerack under control; get hands-on instruction before your first attempt.'),
  ], { compound: true }),
  seatedLegCurl: expandedGuide(pair('כפיפת ברכיים בישיבה במכונה', 'Seated leg curl'), ['רגליים'], ['מכונה'], 'legCurl', 'knee-flexion', [
    pair('כוון ציר מכונה מול הברכיים, תמיכת ירכיים וכרית מעל הקרסול לפי הוראות המכשיר.', 'Align the machine pivot with your knees and set the thigh support and ankle pad as instructed.'),
    pair('כופף ברכיים מטה ואחורה בלי להרים את האגן מהמושב.', 'Curl your knees down and back without lifting your pelvis off the seat.'),
    pair('חזור לאט לטווח נוח בלי לטרוק משקולות.', 'Return slowly through a comfortable range without slamming the stack.'),
  ], { level: 'מתחילים' }),
  lyingLegCurl: expandedGuide(pair('כפיפת ברכיים בשכיבה במכונה', 'Lying leg curl'), ['רגליים'], ['מכונה'], 'lyingCurl', 'knee-flexion', [
    pair('שכב על המכשיר כשהברכיים בציר וכרית הגליל מעל הקרסוליים, לא על העקבים.', 'Lie on the machine with knees at the pivot and the roller above your ankles, not on your heels.'),
    pair('כופף ברכיים והרם עקבים בלי להרים אגן או להקשית גב.', 'Curl your knees and raise your heels without lifting your hips or arching your back.'),
    pair('יישר לאט בטווח נוח והימנע מתנופה.', 'Straighten slowly through a comfortable range without momentum.'),
  ]),
  hipAdduction: expandedGuide(pair('קירוב ירכיים במכונה', 'Seated hip adduction'), ['רגליים'], ['מכונה'], 'hipAdduction', 'hip-adduction', [
    pair('כוון מושב ופישוק התחלתי נוח, עם הכריות בצד הפנימי של הירכיים.', 'Set the seat and a comfortable starting width with pads against your inner thighs.'),
    pair('קרב ירכיים בשליטה בלי להרים את האגן או לכפות טווח.', 'Bring your thighs inward under control without lifting your pelvis or forcing the range.'),
    pair('פתח לאט רק לטווח נוח; אל תתן למשקולות להיפתח בבת אחת.', 'Open slowly only through a comfortable range; do not let the weight pull your legs apart suddenly.'),
  ], { level: 'מתחילים' }),
  walkingLunge: expandedGuide(pair('מכרעים בהתקדמות', 'Walking lunge'), ['רגליים', 'ישבן'], ['משקל גוף'], 'lunge', 'lunge', [
    pair('בחר מסלול ישר ופנוי ועמוד ביציבות, בתחילה ללא משקולות.', 'Choose a clear straight path and stand steadily, initially without weights.'),
    pair('צעד קדימה וכופף ברכיים בטווח נוח, כשהברך הקדמית בכיוון כף הרגל.', 'Step forward and bend your knees through a comfortable range, front knee tracking the foot.'),
    pair('דחוף וחבר לצעד הבא רק אם נשמר שיווי משקל; רשום חזרות לכל צד.', 'Push up and progress to the next step only with balance maintained; log repetitions per side.'),
  ], { compound: true, sides: 2 }),
  lateralLunge: expandedGuide(pair('מכרע צדי', 'Lateral lunge'), ['רגליים', 'ישבן'], ['משקל גוף'], 'sumoSquat', 'lateral-lunge', [
    pair('עמוד זקוף ופנה מקום לצעד רחב ונוח לצד.', 'Stand tall and clear space for a comfortable step sideways.'),
    pair('שלח אגן לאחור וכופף את ברך הרגל הצועדת, כשהרגל השנייה ארוכה אך לא נעולה.', 'Move your hips back and bend the stepping knee, keeping the other leg long but not locked.'),
    pair('דחוף דרך כף הרגל וחזור למרכז; בצע ורשום לכל צד.', 'Push through the foot to return to the centre; perform and log each side.'),
  ], { compound: true, sides: 2 }),
  stepUp: expandedGuide(pair('עלייה על מדרגת אימון יציבה', 'Stable exercise step-up'), ['רגליים', 'ישבן'], ['מדרגת אימון'], 'stepUp', 'step-up', [
    pair('בחר מדרגת אימון נמוכה ותקינה, לא כיסא או רהיט, והנח עליה כף רגל מלאה.', 'Choose a low, sound exercise step, not a chair or furniture, and place your whole foot on it.'),
    pair('דחוף דרך הרגל שעל המדרגה ועלה בלי תנופה מהרגל האחורית.', 'Push through the foot on the step and rise without springing off the back leg.'),
    pair('רד לאט ושמור מקום פנוי סביבך; רשום חזרות לכל צד.', 'Step down slowly and keep the surrounding space clear; log repetitions per side.'),
  ], { compound: true, sides: 2 }),
  dumbbellSplitSquat: expandedGuide(pair('סקוואט בפישוק קדמי עם משקולות', 'Dumbbell split squat'), ['רגליים', 'ישבן'], ['משקולות יד'], 'splitSquat', 'lunge', [
    pair('אחוז משקולות קלות ועמוד בפישוק קדמי עם שתי כפות רגליים על הרצפה.', 'Hold light dumbbells in a split stance with both feet on the floor.'),
    pair('כופף שתי ברכיים מטה בשליטה בלי לאבד שיווי משקל.', 'Bend both knees downward under control without losing balance.'),
    pair('עלה דרך הרגל הקדמית; השלם ורשום חזרות לכל צד בנפרד.', 'Rise through the front leg; complete and log repetitions separately for each side.'),
  ], { compound: true, sides: 2 }),
  hipThrustBench: expandedGuide(pair('הרמת אגן בתמיכת ספסל', 'Bench-supported hip thrust'), ['ישבן', 'רגליים'], ['ספסל'], 'bridge', 'hip-extension', [
    pair('הצמד ספסל אימון כך שלא יזוז ותמוך בו בגב העליון, לא בצוואר.', 'Secure an exercise bench against movement and support your upper back on it, not your neck.'),
    pair('הרם אגן בעזרת הרגליים עד לקו גוף נוח בלי להקשית את הגב.', 'Drive through your feet to lift your hips to a comfortable body line without arching your back.'),
    pair('הורד בשליטה. התחל במשקל גוף בלבד לפני תוספת עומס.', 'Lower under control. Start with bodyweight only before adding load.'),
  ], { compound: true }),
  dumbbellSumoDeadlift: expandedGuide(pair('דדליפט סומו עם משקולת', 'Dumbbell sumo deadlift'), ['ישבן', 'רגליים'], ['משקולות יד'], 'sumoSquat', 'hinge', [
    pair('עמוד בפישוק נוח רחב ואחוז משקולת בין הרגליים.', 'Take a comfortable wide stance and hold a dumbbell between your legs.'),
    pair('שלח אגן לאחור וכופף ברכיים כשהגב ניטרלי והמשקולת קרובה לגוף.', 'Move your hips back and bend your knees with a neutral back and the weight close to your body.'),
    pair('דחוף דרך כפות הרגליים לעמידה; אין חובה להגיע לרצפה.', 'Push through your feet to stand; reaching the floor is not required.'),
  ], { compound: true }),
  cableHipAbduction: expandedGuide(pair('הרחקת ירך בפולי עם רצועת קרסול', 'Cable hip abduction'), ['ישבן'], ['מכונה'], 'standingAbduction', 'hip-abduction', [
    pair('חבר רצועת קרסול ייעודית לפולי נמוך והיעזר במסגרת המכשיר ליציבות.', 'Attach a purpose-made ankle cuff to a low cable and use the machine frame for support.'),
    pair('הרחק רגל הצדה בטווח קטן ונשלט בלי להטות את הגו.', 'Move one leg sideways through a small controlled range without leaning your torso.'),
    pair('חזור לאט ובצע בצד השני; רשום חזרות לכל צד.', 'Return slowly and repeat on the other side; log repetitions per side.'),
  ], { sides: 2 }),
  hipAbductionMachine: expandedGuide(pair('הרחקת ירכיים במכונה', 'Seated hip abduction'), ['ישבן'], ['מכונה'], 'hipAdduction', 'hip-abduction', [
    pair('כוון מושב כך שהכריות יתמכו בצד החיצוני של הירכיים והגב יהיה נתמך.', 'Adjust the seat so the pads support your outer thighs and your back is supported.'),
    pair('פתח ירכיים בשליטה בלי תנופה או הטיית הגוף כדי להתגבר על העומס.', 'Open your thighs under control without momentum or leaning to overcome the load.'),
    pair('חזור לאט לטווח ההתחלתי הנוח.', 'Return slowly to the comfortable starting range.'),
  ], { level: 'מתחילים' }),
  seatedCalfRaise: expandedGuide(pair('עליות עקבים בישיבה במכונה', 'Seated machine calf raise'), ['שוקיים'], ['מכונה'], 'seatedCalf', 'calf', [
    pair('כוון את כרית הירכיים מעל הברכיים והנח את קדמת כפות הרגליים על המשטח.', 'Set the thigh pad above your knees and place your forefeet on the platform.'),
    pair('הרם עקבים בשליטה בלי להקפיץ את המשקל.', 'Raise your heels under control without bouncing the load.'),
    pair('הורד לאט לטווח נוח בקרסוליים ונעל את המכשיר לפני יציאה.', 'Lower slowly through a comfortable ankle range and secure the machine before exiting.'),
  ]),
  legPressCalf: expandedGuide(pair('עליות עקבים במכשיר לחיצת רגליים', 'Leg press calf raise'), ['שוקיים'], ['מכונה'], 'legPressCalf', 'calf', [
    pair('השתמש רק במכשיר שהיצרן מתיר בו הרמות עקבים. כוון מעצורי בטיחות ובחר עומס מתאים לתאומים בנפרד.', 'Use only a machine whose manufacturer permits calf raises. Set the safety stops and select a calf-appropriate load separately.'),
    pair('הישאר עם גב ואגן נתמכים, קדמת כפות הרגליים יציבה וברכיים כפופות מעט. נעל את המכשיר לפני שינוי מיקום הרגליים.', 'Keep your back and hips supported, forefeet secure and knees slightly bent. Secure the machine before repositioning your feet.'),
    pair('הנע את הקרסוליים באיטיות כדי להרים ולהוריד עקבים בטווח נשלט. אל תקפיץ, תנעל ברכיים או תניח לכף הרגל להחליק.', 'Move your ankles slowly to raise and lower your heels through a controlled range. Avoid bouncing, locking your knees or letting your feet slip.'),
  ], { level: 'בינוניים' }),
  standingMachineCalf: expandedGuide(pair('עליות עקבים בעמידה במכונה', 'Standing machine calf raise'), ['שוקיים'], ['מכונה'], 'calf', 'calf', [
    pair('כוון את כריות הכתפיים ואת מעצורי הבטיחות לפי המכשיר, והנח את קדמת כפות הרגליים ביציבות על המשטח.', 'Adjust the shoulder pads and safety stops for the machine and place your forefeet securely on its platform.'),
    pair('הרם עקבים בשליטה, כשהגוף יציב והברכיים אינן נעולות.', 'Raise your heels under control with your body stable and knees unlocked.'),
    pair('הורד לאט לטווח נוח, ללא קפיצה. אבטח את המכשיר לפני הירידה.', 'Lower slowly through a comfortable range without bouncing. Secure the machine before stepping off.'),
  ]),
  dumbbellCalfRaise: expandedGuide(pair('עליות עקבים עם משקולות', 'Standing dumbbell calf raise'), ['שוקיים'], ['משקולות יד'], 'calf', 'calf', [
    pair('עמוד על רצפה ישרה עם עומס קל; אפשר יד תומכת בקיר ומשקולת ביד השנייה.', 'Stand on level ground with a light load; you may support one hand on a wall and hold a dumbbell in the other.'),
    pair('הרם עקבים בלי לגלגל קרסוליים לצדדים.', 'Lift your heels without rolling your ankles sideways.'),
    pair('הורד לאט לרצפה בלי קפיצה.', 'Lower slowly to the floor without bouncing.'),
  ]),
  seatedOneArmLateral: expandedGuide(pair('הרחקת כתף בישיבה ביד אחת', 'Seated single-arm lateral raise'), ['כתפיים'], ['משקולות יד', 'ספסל'], 'seatedLateral', 'shoulder-abduction', [
    pair('שב זקוף על ספסל יציב ואחוז משקולת קלה לצד הגוף.', 'Sit upright on a stable bench and hold a light dumbbell at your side.'),
    pair('הרם זרוע הצדה עד גובה נוח, ללא משיכת כתף לאוזן.', 'Raise the arm sideways to a comfortable height without shrugging toward your ear.'),
    pair('הורד לאט וחזור ביד השנייה; רשום חזרות לכל צד.', 'Lower slowly and repeat with the other arm; log repetitions per side.'),
  ], { sides: 2 }),
  arnoldPress: expandedGuide(pair('לחיצת ארנולד עם משקולות', 'Arnold dumbbell press'), ['כתפיים', 'יד אחורית'], ['משקולות יד', 'ספסל'], 'press', 'vertical-push', [
    pair('שב עם גב נתמך ומשקולות קלות מול החזה, כפות ידיים פונות אליך.', 'Sit with your back supported and light dumbbells in front of your chest, palms facing you.'),
    pair('לחץ למעלה עם סיבוב הדרגתי ונוח של האמות, בלי לכפות טווח כתף.', 'Press upward with a gradual comfortable forearm rotation without forcing shoulder range.'),
    pair('הורד לאט וסובב בחזרה; בחר לחיצה רגילה אם הסיבוב אינו נוח.', 'Lower slowly and rotate back; choose a regular press if the rotation is uncomfortable.'),
  ], { compound: true }),
  cableLateralRaise: expandedGuide(pair('הרחקת כתף בפולי נמוך', 'Low cable lateral raise'), ['כתפיים'], ['מכונה'], 'lateral', 'shoulder-abduction', [
    pair('עמוד לצד פולי נמוך ואחוז ידית בעומס קל.', 'Stand beside a low pulley and grip a handle with a light load.'),
    pair('הרם זרוע הצדה בגוף יציב ומרפק כפוף מעט.', 'Raise your arm sideways with your body stable and elbow slightly bent.'),
    pair('הורד בשליטה וחזור לכל צד בלי תנופה.', 'Lower under control and repeat for each side without momentum.'),
  ], { sides: 2 }),
  facePull: expandedGuide(pair('משיכת חבל לפנים בפולי', 'Cable rope face pull'), ['כתפיים', 'גב'], ['מכונה'], 'facePull', 'shoulder-horizontal-abduction', [
    pair('כוון חבל בגובה הפנים ועמוד יציב במרחק נוח.', 'Set a rope attachment at face height and stand at a comfortable distance.'),
    pair('משוך את קצות החבל לצדי הפנים עם מרפקים החוצה בטווח נוח.', 'Pull the rope ends toward the sides of your face with elbows outward through a comfortable range.'),
    pair('החזר לאט בלי להטות את הגו לאחור או לדחוף את הראש קדימה.', 'Return slowly without leaning your torso back or pushing your head forward.'),
  ]),
  bandPullApart: expandedGuide(pair('פתיחת גומייה מול החזה', 'Band pull-apart'), ['כתפיים', 'גב'], ['גומייה'], 'bandPullApart', 'shoulder-horizontal-abduction', [
    pair('בדוק שהגומייה תקינה ואחוז בה מול החזה, הרחק מהפנים.', 'Check that the band is sound and hold it in front of your chest, away from your face.'),
    pair('פתח ידיים לצדדים עם מרפקים רכים ובלי להרים כתפיים.', 'Open your hands sideways with soft elbows and without shrugging.'),
    pair('חזור לאט, אל תשחרר גומייה מתוחה ואל תמתח מעבר להוראות היצרן.', 'Return slowly; never release a stretched band or exceed its manufacturer’s stretch limits.'),
  ], { level: 'מתחילים' }),
  barbellCurl: expandedGuide(pair('כפיפת מרפקים בעמידה עם מוט', 'Standing barbell curl'), ['יד קדמית'], ['מוט'], 'curl', 'elbow-flexion', [
    pair('אחוז מוט קל ברוחב נוח כשהמרפקים לצד הגוף.', 'Grip a light bar at a comfortable width with elbows beside your body.'),
    pair('כופף מרפקים בלי להניף את הגוף לאחור.', 'Curl your elbows without swinging your body backward.'),
    pair('הורד בשליטה ושמור שורשי כף יד ניטרליים.', 'Lower under control and keep wrists neutral.'),
  ]),
  ezBarCurl: expandedGuide(pair('כפיפת מרפקים עם מוט EZ', 'EZ-bar curl'), ['יד קדמית'], ['מוט'], 'curl', 'elbow-flexion', [
    pair('בחר אחיזה נוחה בחלק הזוויתי של מוט EZ, עם שורשי כף יד ישרים.', 'Choose a comfortable angled grip on an EZ-bar with wrists straight.'),
    pair('כופף מרפקים כשהזרועות נשארות לצד הגוף.', 'Curl your elbows while keeping your upper arms beside your body.'),
    pair('הורד לאט בלי תנופה או נעילת מרפקים בכוח.', 'Lower slowly without momentum or forcefully locking your elbows.'),
  ]),
  inclineDumbbellCurl: expandedGuide(pair('כפיפת מרפקים על ספסל בשיפוע', 'Incline dumbbell curl'), ['יד קדמית'], ['משקולות יד', 'ספסל'], 'curl', 'elbow-flexion', [
    pair('הישען על ספסל בשיפוע נוח, משקולות קלות תלויות לצד הגוף.', 'Lean back on a comfortably inclined bench with light dumbbells hanging beside your body.'),
    pair('כופף מרפקים בלי לשלוח את הזרועות קדימה.', 'Curl your elbows without driving your upper arms forward.'),
    pair('הורד לאט; הקטן את השיפוע או בחר ישיבה זקופה אם הכתף נמתחת באי-נוחות.', 'Lower slowly; reduce the incline or sit upright if the shoulder stretch is uncomfortable.'),
  ]),
  preacherCurlMachine: expandedGuide(pair('כפיפת מרפקים במכונת כומר', 'Machine preacher curl'), ['יד קדמית'], ['מכונה'], 'preacherCurl', 'elbow-flexion', [
    pair('כוון מושב ותמיכה כך שהזרועות מונחות בנוחות והמרפקים מול ציר המכונה.', 'Set the seat and pad so your upper arms rest comfortably and elbows align with the machine pivot.'),
    pair('כופף מרפקים בלי להרים כתפיים או להתרומם מהמושב.', 'Curl your elbows without shrugging or rising from the seat.'),
    pair('הורד לאט ועצור לפני נעילת מרפקים בכוח.', 'Lower slowly and stop before forcefully locking your elbows.'),
  ], { level: 'מתחילים' }),
  preacherHammerCurl: expandedGuide(pair('פטיש ביד אחת על ספסל כומר', 'Single-arm preacher hammer curl'), ['יד קדמית', 'אמות'], ['משקולות יד', 'ספסל כומר'], 'preacherCurl', 'elbow-flexion', [
    pair('תמוך בזרוע על כרית כומר ייעודית והחזק משקולת באחיזה ניטרלית.', 'Support your upper arm on a purpose-made preacher pad and hold a dumbbell in a neutral grip.'),
    pair('כופף מרפק בלי להרים את הזרוע מהכרית.', 'Curl your elbow without lifting your upper arm off the pad.'),
    pair('הורד לאט בלי לנעול מרפק; רשום חזרות לכל צד.', 'Lower slowly without locking your elbow; log repetitions per side.'),
  ], { sides: 2 }),
  cableCurl: expandedGuide(pair('כפיפת מרפקים בפולי נמוך', 'Low cable curl'), ['יד קדמית'], ['מכונה'], 'curl', 'elbow-flexion', [
    pair('חבר ידית לפולי נמוך ועמוד ביציבות עם מרפקים לצד הגוף.', 'Attach a handle to a low pulley and stand steadily with elbows beside your body.'),
    pair('כופף מרפקים בלי להניף את הגב או להרים כתפיים.', 'Curl your elbows without swinging your back or shrugging.'),
    pair('החזר את הידית לאט בלי לטרוק את המשקולות.', 'Return the handle slowly without slamming the stack.'),
  ], { level: 'מתחילים' }),
  supportedKickback: expandedGuide(pair('פשיטת מרפק לאחור בתמיכת ספסל', 'Bench-supported dumbbell kickback'), ['יד אחורית'], ['משקולות יד', 'ספסל'], 'kickback', 'elbow-extension', [
    pair('הישען ביד וברך על ספסל יציב ותמוך בגב ניטרלי; הרם מרפק סמוך לגו.', 'Support a hand and knee on a stable bench with a neutral back; hold the working elbow beside your torso.'),
    pair('יישר את המרפק לאחור בלי להזיז את הזרוע העליונה.', 'Straighten the elbow backward without moving your upper arm.'),
    pair('כופף לאט חזרה ובצע לכל צד בעומס קל.', 'Bend slowly back and perform each side with a light load.'),
  ], { sides: 2 }),
  ropePushdown: expandedGuide(pair('פשיטת מרפקים בפולי עם חבל', 'Rope triceps pushdown'), ['יד אחורית'], ['מכונה'], 'triceps', 'elbow-extension', [
    pair('חבר חבל לפולי עליון והצמד מרפקים לצדי הגוף.', 'Attach a rope to a high pulley and keep elbows beside your body.'),
    pair('יישר מרפקים מטה בלי להישען עם כל משקל הגוף על החבל.', 'Extend your elbows downward without leaning your entire body weight onto the rope.'),
    pair('כופף לאט חזרה בלי שהזרועות העליונות ינועו קדימה.', 'Bend slowly back without letting your upper arms move forward.'),
  ], { level: 'מתחילים' }),
  overheadCableTriceps: expandedGuide(pair('פשיטת מרפקים מעל הראש בפולי', 'Overhead cable triceps extension'), ['יד אחורית'], ['מכונה'], 'overhead', 'elbow-extension', [
    pair('כוון פולי לפי הוראות התחנה ואחוז חבל מעל הראש, עם גוף יציב.', 'Set the pulley as the station specifies and hold a rope overhead with your body stable.'),
    pair('יישר מרפקים בטווח נוח בלי להקשית את הגב.', 'Extend your elbows through a comfortable range without arching your back.'),
    pair('כופף לאט; בחר פשיטה לצד הגוף אם המנח מעל הראש אינו נוח.', 'Bend slowly; choose a pushdown if the overhead position is uncomfortable.'),
  ]),
  benchSkullcrusher: expandedGuide(pair('פשיטת מרפקים עם משקולות על ספסל', 'Bench dumbbell triceps extension'), ['יד אחורית'], ['משקולות יד', 'ספסל'], 'lyingTriceps', 'elbow-extension', [
    pair('שכב על ספסל יציב עם משקולות קלות מעל הכתפיים באחיזה ניטרלית.', 'Lie on a stable bench with light dumbbells above your shoulders in a neutral grip.'),
    pair('כופף מרפקים והורד משקולות לצדי הראש, לא לכיוון הפנים.', 'Bend your elbows and lower the dumbbells beside your head, not toward your face.'),
    pair('יישר מרפקים בשליטה בלי להקפיץ או לנעול בכוח.', 'Extend your elbows under control without bouncing or forceful lockout.'),
  ]),
  abCrunchMachine: expandedGuide(pair('כפיפת בטן במכונה', 'Abdominal crunch machine'), ['בטן'], ['מכונה'], 'seatedCrunch', 'core-flexion', [
    pair('התאם מושב ומשענות לפי המכשיר; בחר התנגדות קלה והישען בנוחות.', 'Fit the seat and pads to the machine; choose light resistance and position yourself comfortably.'),
    pair('קרב צלעות לאגן בכפיפה קטנה ומבוקרת, בלי למשוך את הצוואר.', 'Bring your ribs toward your pelvis with a small controlled curl without pulling your neck.'),
    pair('חזור לאט לטווח נוח, בלי להטיח את הגב לאחור.', 'Return slowly through a comfortable range without throwing your back backward.'),
  ]),
  abWheelRollout: expandedGuide(pair('גלגל בטן בכריעה', 'Kneeling ab-wheel rollout'), ['בטן'], ['גלגל בטן', 'מזרן'], 'abWheel', 'core-anti-extension', [
    pair('כרע על מזרן ואחוז גלגל תקין מתחת לכתפיים, כשהבטן אסופה.', 'Kneel on a mat and grip a sound ab wheel beneath your shoulders with your core braced.'),
    pair('גלגל מעט קדימה רק כל עוד הגב נשאר יציב ואינו שוקע; אין חובה להגיע רחוק.', 'Roll a short distance forward only while your back stays stable without sagging; a long reach is not required.'),
    pair('חזור בשליטה בלי למשוך דרך הגב התחתון; בחר פלאנק אם אין שליטה.', 'Return under control without pulling through your lower back; choose a plank if control is insufficient.'),
  ]),
  pallofPress: expandedGuide(pair('לחיצת פאלוף בפולי', 'Cable Pallof press'), ['בטן'], ['מכונה'], 'pallof', 'core-anti-rotation', [
    pair('עמוד בצד לפולי בגובה החזה ואחוז ידית בשתי ידיים מול החזה.', 'Stand sideways to a chest-height pulley and hold a handle with both hands at your chest.'),
    pair('הושט ידיים קדימה בלי לתת לכבל לסובב את הגוף.', 'Extend your hands forward without letting the cable rotate your body.'),
    pair('החזר לחזה וחזור בפנייה לצד השני; רשום חזרות לכל צד.', 'Return to your chest and repeat facing the other way; log repetitions per side.'),
  ], { sides: 2 }),
  highPlank: expandedGuide(pair('פלאנק על כפות הידיים', 'High plank'), ['בטן', 'כתפיים'], ['משקל גוף', 'מזרן'], 'highPlank', 'core-hold', [
    pair('הנח ידיים מתחת לכתפיים והתרחק עם הרגליים לעמדת תמיכה נוחה.', 'Place your hands beneath your shoulders and step your feet back into a comfortable support position.'),
    pair('החזק קו גוף יציב בלי לשקוע בגב או להרים אגן גבוה.', 'Hold a stable body line without sagging through your back or lifting your hips high.'),
    pair('נשום לאורך ההחזקה וסיים בהנחת ברכיים בשליטה.', 'Breathe throughout the hold and finish by lowering your knees under control.'),
  ], { inputType: 'hold', level: 'מתחילים' }),
  stationaryBike: expandedGuide(pair('אופני כושר זקופים', 'Upright stationary bike'), ['רגליים'], ['מכונה'], 'bike', 'cycle', [
    pair('כוון מושב כך שתישאר כפיפה קלה בברך בתחתית הדיווש ובדוק הוראות עצירה.', 'Set the seat so your knee remains slightly bent at the bottom of the pedal stroke and check the stopping controls.'),
    pair('התחל בהתנגדות קלה ובקצב המאפשר נשימה נוחה.', 'Start with light resistance at a pace that allows comfortable breathing.'),
    pair('האט בהדרגה ועצור את הדוושות לפני ירידה; תעד דקות ולא חזרות.', 'Slow gradually and stop the pedals before dismounting; log minutes rather than repetitions.'),
  ], { inputType: 'cardio', level: 'מתחילים', places: ['gym'] }),
  jumpRope: expandedGuide(pair('קפיצה על חבל', 'Jump rope'), ['שוקיים', 'רגליים'], ['חבל קפיצה'], 'jumpRope', 'jump-rope', [
    pair('בדוק חבל תקין, מרחב פנוי ומשטח יציב שאינו מחליק; התחל בהליכה לחימום.', 'Check your rope, clear space and a stable non-slip surface; begin with a walking warmup.'),
    pair('סובב בעדינות מפרקי כף יד וקפוץ נמוך עם נחיתה רכה; שמור מרפקים קרוב לגוף.', 'Turn gently from your wrists and jump low with soft landings; keep elbows near your body.'),
    pair('עצור להתאוששות בין מקטעים. אפשר לחזור להליכה; הפסק אם יש כאב או סחרחורת.', 'Stop to recover between intervals. You can return to walking; stop if you have pain or dizziness.'),
  ], { inputType: 'cardio', level: 'מתחילים', places: ['home', 'gym', 'outside'] }),
  yogaPractice: expandedGuide(pair('יוגה — תרגול מוכר', 'Yoga — familiar practice'), ['כללי'], ['מזרן'], 'standing', 'yoga-practice', [
    pair('בחר רצף או שיעור שכבר למדת ומתאים לניסיון שלך, ומרחב יציב ופנוי עם מזרן.', 'Choose a sequence or class you have already learned and that suits your experience, with a mat and clear stable space.'),
    pair('הפעל את טיימר הפעילות ותרגל בטווח נוח עם נשימה חופשית. אין צורך להשלים תנוחה או זמן שאינם נוחים.', 'Start the activity timer and practise within a comfortable range while breathing freely. You do not need to complete an uncomfortable pose or duration.'),
    pair('עצור לפי הצורך ותעד רק את הזמן שביצעת. זהו רישום זמן, לא שיעור יוגה מודרך או מדד לעצימות אירובית.', 'Pause as needed and record only the time performed. This logs time; it is not a guided yoga class or an aerobic-intensity measure.'),
  ], { inputType: 'cardio', activityOnly: true, level: 'מתחילים', places: ['home', 'gym', 'outside'] }),
  pilatesPractice: expandedGuide(pair('פילאטיס — תרגול מוכר', 'Pilates — familiar practice'), ['כללי'], ['מזרן'], 'standing', 'pilates-practice', [
    pair('בחר תרגול מזרן שכבר למדת ומתאים ליכולת שלך. אין כאן תוכנית מכשירים או הדרכה לרפורמר.', 'Choose mat practice you have already learned and that suits your ability. This is not a reformer or apparatus program.'),
    pair('הפעל את הטיימר, עבוד בתנועה נשלטת ונשום בחופשיות. קח הפסקה במקום לכפות טווח או קצב.', 'Start the timer, move with control and breathe freely. Take a break rather than forcing range or pace.'),
    pair('עצור אם מופיע כאב או סחרחורת ותעד את הזמן שביצעת. הטיימר אינו מחליף לימוד עם מדריך ואינו מסיק שיפור בכוח.', 'Stop if pain or dizziness occurs and log the time performed. The timer does not replace learning with an instructor or infer strength improvement.'),
  ], { inputType: 'cardio', activityOnly: true, level: 'מתחילים', places: ['home', 'gym', 'outside'] }),
  elliptical: expandedGuide(pair('אליפטיקל בקצב נוח', 'Easy-paced elliptical'), ['רגליים'], ['מכונה'], 'elliptical', 'elliptical', [
    pair('עלה בזהירות כשהמכשיר יציב והחזק בידיות לפי הוראות היצרן.', 'Mount carefully with the machine stable and hold the handles as its manufacturer specifies.'),
    pair('התחל בהתנגדות קלה ובתנועה רציפה, בלי להישען עם כל הגוף על הידיות.', 'Start with light resistance and smooth movement without leaning your whole body weight onto the handles.'),
    pair('האט ועצור לגמרי לפני ירידה; תעד את משך הפעילות בדקות.', 'Slow down and stop fully before dismounting; log activity duration in minutes.'),
  ], { inputType: 'cardio', level: 'מתחילים', places: ['gym'] }),
};
Object.assign(EXERCISE_GUIDES, CATALOG_EXTENSION);

// Outdoor placement is authored explicitly, never inferred from portable equipment alone.
for (const id of ['squat', 'lunge', 'bridge', 'pushup', 'back', 'plank', 'sidePlank',
  'deadbug', 'birdDog', 'crunch', 'sideCrunch', 'march', 'stepTouch', 'singleBridge',
  'clamShell', 'heelTap', 'reverseCrunch', 'kneeSidePlank', 'kneePushup', 'closePushup',
  'highPlank', 'bandRow', 'bandBentRow', 'hang', 'pullup', 'dipHold']) {
  EXERCISE_GUIDES[id].places = [...new Set([...EXERCISE_GUIDES[id].places, 'outside'])];
}

const videoLink = (href, publisher, title) => ({ href, publisher, title, reviewedOn: '2026-10-21' });
const youtube = (id, publisher, title) => videoLink(`https://www.youtube.com/watch?v=${id}`, publisher, title);
const muscleAndStrength = (slug, title) => videoLink(`https://www.muscleandstrength.com/exercises/${slug}`, 'Muscle & Strength', title);
const reviewedVideo = (video) => [{ ...video, reviewedOn: '2026-10-22' }];
const reviewedStrengthVideo = (slug, title) => reviewedVideo(muscleAndStrength(slug, title));
const SELECTED_VIDEOS = {
  legPressCalf: [{ href: 'https://www.strengthlog.com/calf-raise-in-leg-press/', publisher: 'StrengthLog', title: 'Calf Raise in Leg Press — animated demonstration', reviewedOn: '2026-10-26' }],
  standingMachineCalf: [{ href: 'https://www.strengthlog.com/standing-calf-raise/', publisher: 'StrengthLog', title: 'Standing Calf Raise — animated demonstration', reviewedOn: '2026-10-26' }],
  jumpRope: [{ ...youtube('T_tVMJEkUpg', 'Crossrope Jump Ropes', "How to Jump Rope | Beginner's Tutorial from Crossrope"), reviewedOn: '2026-10-25' }],
  wallPushup: reviewedVideo(videoLink('https://us.physitrack.com/home-exercise-video/push-up-against-wall', 'Physitrack', 'Joint Stability Push Ups against Wall')),
  kneePushup: reviewedStrengthVideo('knee-pushups.html', 'Knee Push-Up'),
  inclinePushup: reviewedStrengthVideo('bench-pushups.html', 'Push-Up (On Bench)'),
  trxRow: reviewedVideo(youtube('nXfYNAwB_Lo', 'CORE Strong Fitness', 'How to Perform The TRX LOW ROW')),
  bandBentRow: reviewedVideo(youtube('Y3H17rshgZE', 'Live Lean TV Daily Exercises', 'Resistance Band Bent Over Row')),
  splitSquat: reviewedStrengthVideo('split-squat', 'Bodyweight Split Squat'),
  sumoSquat: reviewedVideo(youtube('ksmxuw3JDbQ', 'Travis Tarrant', 'Exercise Tutorial: Bodyweight Sumo Squat')),
  clamShell: reviewedStrengthVideo('side-lying-clam', 'Side Lying Clam'),
  singleCalf: reviewedStrengthVideo('one-leg-standing-calf-raise.html', 'One-Leg Standing Bodyweight Calf Raise'),
  lyingTriceps: reviewedVideo(youtube('2XDPNh7a8p8', 'Live Lean TV Daily Exercises', 'Floor Lying Dumbbell Tricep Extension')),
  heelTap: reviewedVideo(youtube('Xxv-9mA3qLc', 'Cara Giusti, PT, DPT', 'Supine Heel Taps | B3 Physical Therapy')),
  reverseCrunch: reviewedVideo(youtube('XY8KzdDcMFg', 'PureGym', 'How To Do A Reverse Crunch')),
  kneeSidePlank: reviewedVideo(youtube('vYb54dQL-xU', 'Jr. NBA Jr. WNBA', 'Bent Knee Side Plank')),
  stepTouch: reviewedVideo(youtube('jaSGU9cj5vA', 'Trifocus Fitness Academy', 'Aerobics Step Touch')),
  barbellBench: reviewedStrengthVideo('barbell-bench-press.html', 'Barbell Bench Press'),
  inclineDumbbellPress: reviewedStrengthVideo('incline-dumbbell-bench-press.html', 'Incline Dumbbell Bench Press'),
  smithInclinePress: reviewedStrengthVideo('incline-smith-machine-bench-press.html', 'Smith Machine Incline Bench Press'),
  highCableFly: reviewedStrengthVideo('cable-crossovers-bent-over.html', 'Standing High to Low Cable Fly'),
  chestPressMachine: reviewedStrengthVideo('hammer-strength-bench-press.html', 'Hammer Strength Bench Press'),
  pecDeck: reviewedStrengthVideo('pec-dec.html', 'Pec Deck'),
  barbellRow: reviewedStrengthVideo('bent-over-barbell-row.html', 'Bent Over Barbell Row'),
  chestSupportedRow: reviewedStrengthVideo('chest-supported-dumbbell-row', 'Neutral Grip Chest Supported Dumbbell Row'),
  oneArmCableRow: reviewedStrengthVideo('one-arm-cable-row.html', 'One-Arm Seated Cable Row'),
  straightArmPulldown: reviewedStrengthVideo('straight-arm-lat-pull-down.html', 'Straight Arm Lat Pull Down'),
  neutralPulldown: reviewedStrengthVideo('v-bar-pull-down', 'V-Bar Pull Down'),
  pullup: reviewedStrengthVideo('wide-grip-pull-up.html', 'Wide Grip Pull Up'),
  hackSquatMachine: reviewedStrengthVideo('hack-squat.html', 'Machine Hack Squat'),
  barbellSquat: reviewedStrengthVideo('squat.html', 'Barbell Back Squat'),
  seatedLegCurl: reviewedStrengthVideo('seated-leg-curl', 'Seated Leg Curl'),
  lyingLegCurl: reviewedStrengthVideo('leg-curl.html', 'Lying Leg Curl'),
  hipAdduction: reviewedStrengthVideo('hip-adduction-machine.html', 'Hip Adduction Machine'),
  walkingLunge: reviewedStrengthVideo('bodyweight-walking-lunge.html', 'Bodyweight Walking Lunge'),
  lateralLunge: reviewedStrengthVideo('bodyweight-side-lunge.html', 'Bodyweight Lateral Lunge'),
  stepUp: reviewedStrengthVideo('bodyweight-step-up.html', 'Bodyweight Step Up'),
  dumbbellSplitSquat: reviewedStrengthVideo('dumbbell-split-squat', 'Dumbbell Split Squat'),
  hipThrustBench: reviewedStrengthVideo('bodyweight-hip-thrust', 'Bodyweight Hip Thrust'),
  dumbbellSumoDeadlift: reviewedVideo(youtube('De9OUZz5W_I', 'Mike | J2FIT Strength & Conditioning', 'Dumbbell Sumo Deadlift (Full Tutorial)')),
  cableHipAbduction: reviewedStrengthVideo('cable-hip-abduction.html', 'Cable Hip Abduction'),
  hipAbductionMachine: reviewedStrengthVideo('hip-abduction-machine.html', 'Hip Abduction Machine'),
  seatedCalfRaise: reviewedStrengthVideo('seated-calf-raise.html', 'Seated Calf Raise'),
  dumbbellCalfRaise: reviewedVideo(youtube('_iYwv4QVFjM', 'LivestrongWoman', 'Dumbbell Calf Raise')),
  seatedOneArmLateral: reviewedStrengthVideo('seated-one-arm-dumbbell-lateral-raise.html', 'One-Arm Seated Dumbbell Lateral Raise'),
  arnoldPress: reviewedStrengthVideo('seated-arnold-press.html', 'Seated Arnold Press'),
  cableLateralRaise: reviewedStrengthVideo('one-arm-cable-lateral-raise.html', 'Single Arm Cable Lateral Raise (Crossbody)'),
  facePull: reviewedStrengthVideo('cable-face-pull', 'Cable Face Pull'),
  bandPullApart: reviewedStrengthVideo('band-pull-apart', 'Band Pull Apart'),
  barbellCurl: reviewedStrengthVideo('standing-barbell-curl.html', 'Standing Barbell Curl'),
  ezBarCurl: reviewedStrengthVideo('ez-bar-curl.html', 'EZ Bar Curl'),
  inclineDumbbellCurl: reviewedStrengthVideo('incline-dumbbell-curl.html', 'Incline Dumbbell Curl'),
  preacherCurlMachine: reviewedStrengthVideo('bicep-machine-curl.html', 'Machine Bicep Curl'),
  preacherHammerCurl: reviewedStrengthVideo('dumbbell-hammer-preacher-curl.html', 'Dumbbell Hammer Preacher Curl'),
  cableCurl: reviewedStrengthVideo('cable-curl.html', 'Cable Curl'),
  supportedKickback: reviewedStrengthVideo('tricep-kickback.html', 'Bench-Supported Dumbbell Tricep Kickback'),
  ropePushdown: reviewedStrengthVideo('rope-tricep-extension.html', 'Rope Tricep Extension'),
  overheadCableTriceps: reviewedStrengthVideo('overhead-tricep-extension.html', 'High Pulley Overhead Tricep Extension (Rope)'),
  benchSkullcrusher: reviewedStrengthVideo('lying-dumbbell-extension.html', 'Lying Dumbbell Extension on Bench'),
  abCrunchMachine: reviewedVideo(videoLink('https://us.physitrack.com/home-exercise-video/abdominal-crunch-machine', 'Physitrack', 'Abdominal crunch machine')),
  abWheelRollout: reviewedVideo(youtube('2Uw8oDIF2AY', 'Howcast', 'How to Do Kneeling Ab Wheel Rollouts | Abs Workout')),
  pallofPress: reviewedStrengthVideo('pallof-press', 'Cable Pallof Press'),
  highPlank: reviewedVideo(youtube('l8EbzIr2foA', 'Live Lean TV Daily Exercises', 'Straight Arm Plank')),
  stationaryBike: reviewedVideo(videoLink('https://us.physitrack.com/home-exercise-video/stationary-bike', 'Physitrack', 'Stationary cycle spin bike')),
  elliptical: reviewedVideo(videoLink('https://us.physitrack.com/home-exercise-video/cross-trainer', 'Physitrack', 'Cross Trainer - version 2')),
  rearFly: [{ ...muscleAndStrength('bent-over-dumbbell-reverse-fly.html', 'Bent Over Dumbbell Reverse Fly'), reviewedOn: '2026-10-22' }],
  chairStand: [{ ...videoLink('https://us.physitrack.com/home-exercise-video/sit-to-stand', 'Physitrack', 'Sit to stand - hands on thighs'), reviewedOn: '2026-10-22' }],
  bentRow: [{ ...muscleAndStrength('bent-over-dumbbell-row.html', 'Bent Over Dumbbell Row'), reviewedOn: '2026-10-22' }],
  alternatingCurl: [{ ...muscleAndStrength('alternating-standing-dumbbell-curl.html', 'Alternating Standing Dumbbell Curl'), reviewedOn: '2026-10-22' }],
  concentrationCurl: [{ ...muscleAndStrength('concentration-cur.html', 'Concentration Curl'), reviewedOn: '2026-10-22' }],
  closePushup: [{ ...muscleAndStrength('close-grip-push-up.html', 'Close Grip Push Up'), reviewedOn: '2026-10-22' }],
  standingPress: [{ ...muscleAndStrength('standing-dumbbell-press.html', 'Standing Dumbbell Shoulder Press'), reviewedOn: '2026-10-22' }],
  singleBridge: [{ ...muscleAndStrength('single-leg-glute-bridge', 'Single Leg Glute Bridge'), reviewedOn: '2026-10-22' }],
  reverseCurl: [{ ...muscleAndStrength('standing-dumbbell-reverse-curl.html', 'Standing Dumbbell Reverse Curl'), reviewedOn: '2026-10-22' }],
  kickback: [{ ...muscleAndStrength('bent-over-dumbbell-kickback.html', 'Bent Over Dumbbell Tricep Kickback'), reviewedOn: '2026-10-22' }],
  goblet: [muscleAndStrength('dumbbell-goblet-squat', 'Dumbbell Goblet Squat')],
  lunge: [youtube('0SHCQLa-gms', 'Peak Functional', 'How to Do a Bodyweight Reverse Lunge')],
  hinge: [youtube('aa57T45iFSE', 'National Academy of Sports Medicine (NASM)', 'How to do a Dumbbell Romanian Deadlift')],
  bridge: [muscleAndStrength('bodyweight-glute-bridge', 'Bodyweight Glute Bridge')],
  calf: [youtube('CtpPV2FBkG4', 'Lean Physique Lab', 'Standing Calf Raises Bodyweight Tutorial')],
  chest: [muscleAndStrength('dumbbell-bench-press.html', 'Dumbbell Bench Press')],
  floor: [muscleAndStrength('dumbbell-floor-press.html', 'Dumbbell Floor Press')],
  fly: [muscleAndStrength('dumbbell-flys.html', 'Dumbbell Flys')],
  pulldown: [muscleAndStrength('lat-pull-down.html', 'Lat Pull Down')],
  assisted: [youtube('tOUK2p51r2k', 'Kaylee Jollota', 'How to use the Assisted Pull Up Machine')],
  row: [muscleAndStrength('seated-row.html', 'Seated Cable Row')],
  oneRow: [muscleAndStrength('one-arm-dumbbell-row.html', 'One Arm Dumbbell Row')],
  bandRow: [youtube('mnP10HI18uI', 'Live Lean TV Daily Exercises', 'Seated Resistance Band Row')],
  back: [videoLink('https://us.physitrack.com/home-exercise-video/prone-back-extension---v3', 'Physitrack', 'Prone back extension - v3')],
  triceps: [muscleAndStrength('tricep-extension.html', 'Straight Bar Tricep Extension')],
  overhead: [muscleAndStrength('two-arm-dumbbell-extension.html', 'Seated Dumbbell Tricep Extension')],
  curl: [muscleAndStrength('seated-dumbbell-curl.html', 'Seated Dumbbell Curl')],
  hammer: [muscleAndStrength('standing-hammer-curl.html', 'Standing Hammer Curl')],
  wrist: [muscleAndStrength('one-arm-seated-dumbbell-wrist-curl.html', 'One-Arm Seated Dumbbell Wrist Curl'),
    muscleAndStrength('one-arm-seated-reverse-dumbbell-wrist-curl.html', 'One-Arm Seated Reverse Grip Dumbbell Wrist Curl')],
  lateral: [muscleAndStrength('dumbbell-lateral-raise.html', 'Dumbbell Lateral Raise')],
  front: [muscleAndStrength('dumbbell-front-raise.html', 'Standing Dumbbell Front Raise')],
  reverse: [muscleAndStrength('bent-over-dumbbell-reverse-fly.html', 'Bent Over Dumbbell Reverse Fly')],
  shoulder: [muscleAndStrength('machine-shoulder-press', 'Machine Shoulder Press')],
  dumbbellPress: [muscleAndStrength('seated-dumbbell-press.html', 'Seated Dumbbell Press')],
  shrug: [muscleAndStrength('dumbbell-shrugs.html', 'Dumbbell Shrug')],
  legPress: [muscleAndStrength('45-degree-leg-press.html', 'Leg Press')],
  legExtension: [muscleAndStrength('leg-extension.html', 'Leg Extension')],
  legCurl: [muscleAndStrength('seated-leg-curl', 'Seated Leg Curl')],
  crunch: [muscleAndStrength('ab-crunch', 'Ab Crunch')],
  sideCrunch: [muscleAndStrength('twisting-floor-crunch.html', 'Twisting Crunch')],
  sidePlank: [muscleAndStrength('side-hover.html', 'Side Plank')],
  wallSit: [youtube('sT0jUNnb9dk', 'Great River Health', 'Wall Sit Tutorial')],
  deadbug: [muscleAndStrength('dead-bug', 'Dead Bug')],
  birdDog: [youtube('FUK7LeouD58', 'Nat Wilson Fitness', 'Bird Dog Exercise Tutorial for Core Strength')],
  hang: [youtube('aBcw45IX-hE', 'JayTaylor', 'Dead Hang | Exercise Demo')],
  dipHold: [youtube('eLI7t-5wHno', 'Strength Project', 'Parallel Bar Support Hold Position')],
  farmer: [youtube('EPibhBCitoU', 'SBTB.online', 'Dumbbell farmer hold')],
  walk: [youtube('ZFqwPExMbIQ', 'Rehab and Revive', 'Physical Therapist Shows Proper Walking Posture')],
  march: [youtube('_Ox0N-Ab3Sc', "Doctor O'Donovan", 'Marching on the Spot')],
  jog: [youtube('LnNse_AwPyE', 'Sunny Health & Fitness', 'Proper Running Form for Beginners')],
};
for (const [id, info] of Object.entries(EXERCISE_GUIDES)) {
  info.videos = SELECTED_VIDEOS[id] || (info.video ? [youtube(info.video.id, info.video.publisher, info.video.title)] : []);
}

const addition = (id, name, en, category, guideId, inputType = 'reps') => ({
  id: `library:${id}`, catalogId: guideId, name, category, inputType, active: false,
  defaultSets: 3, defaultReps: inputType === 'hold' ? '' : '10', restSeconds: 90,
  ...(inputType === 'hold' ? { holdSeconds: 20 } : {}),
  englishName: en,
});

export const LIBRARY_EXERCISES = [
  addition('pushup', 'שכיבות סמיכה', 'Push-up', 'חזה', 'pushup'),
  addition('floor-press', 'לחיצת חזה על הרצפה', 'Dumbbell floor press', 'חזה', 'floor'),
  addition('dumbbell-bench', 'לחיצת חזה עם משקולות בשכיבה', 'Dumbbell bench press', 'חזה', 'chest'),
  addition('one-arm-row', 'חתירה ביד אחת עם משקולת', 'Single-arm dumbbell row', 'גב אמצעי', 'oneRow'),
  addition('band-row', 'חתירה בישיבה עם גומייה', 'Seated resistance-band row', 'גב אמצעי', 'bandRow'),
  addition('floor-back', 'פשיטת גב עדינה על הרצפה', 'Prone back extension', 'גב תחתון', 'back'),
  addition('dumbbell-press', 'לחיצת כתפיים עם משקולות', 'Dumbbell shoulder press', 'כתפיים', 'dumbbellPress'),
  addition('front-raise', 'הרמת כתפיים לפנים עם משקולות', 'Dumbbell front raise', 'כתפיים', 'front'),
  addition('dumbbell-curl', 'כפיפת מרפקים עם משקולות', 'Dumbbell biceps curl', 'יד קדמית', 'curl'),
  addition('overhead-triceps', 'פשיטת מרפקים מעל הראש עם משקולת', 'Dumbbell overhead triceps extension', 'יד אחורית', 'overhead'),
  addition('dumbbell-shrug', 'הרמת כתפיים עם משקולות', 'Dumbbell shrug', 'טרפז', 'shrug'),
  addition('bodyweight-squat', 'סקוואט במשקל גוף', 'Bodyweight squat', 'רגליים - 4 ראשי', 'squat'),
  addition('goblet-squat', 'גובלט סקוואט', 'Goblet squat', 'רגליים - 4 ראשי', 'goblet'),
  addition('reverse-lunge', 'מכרע לאחור', 'Reverse lunge', 'רגליים - 4 ראשי', 'lunge'),
  addition('romanian-deadlift', 'דדליפט רומני עם משקולות', 'Dumbbell Romanian deadlift', 'רגליים - המסטרינג', 'hinge'),
  addition('glute-bridge', 'גשר ישבן', 'Glute bridge', 'רגליים - ישבן', 'bridge'),
  addition('calf-raise', 'עליות עקבים בעמידה', 'Standing calf raise', 'רגליים - שוקיים', 'calf'),
  addition('dead-bug', 'דד באג', 'Dead bug', 'בטן', 'deadbug'),
  addition('bird-dog', 'בירד דוג', 'Bird dog', 'בטן', 'birdDog'),
  addition('side-plank', 'פלאנק צדי', 'Side plank', 'בטן', 'sidePlank', 'hold'),
  addition('wall-sit', 'ישיבת קיר', 'Wall sit', 'רגליים - 4 ראשי', 'wallSit', 'hold'),
  addition('bridge-hold', 'החזקת גשר ישבן', 'Glute bridge hold', 'רגליים - ישבן', 'bridge', 'hold'),
  addition('farmer-hold', 'החזקת מזוודות', 'Farmer hold', 'אמות', 'farmer', 'hold'),
  { ...addition('walking', 'הליכה רציפה', 'Steady walking', 'קרדיו', 'walk', 'cardio'),
    defaultSets: 0, defaultReps: '', restSeconds: 0, durationMinutes: 10, pace: 'קצב נוח', location: 'outside' },
  { ...addition('marching', 'הליכה במקום', 'Marching in place', 'קרדיו', 'march', 'cardio'),
    defaultSets: 0, defaultReps: '', restSeconds: 0, durationMinutes: 5, pace: 'קצב נוח', location: 'home' },
  { ...addition('jogging', 'ריצה קלה', 'Easy jogging', 'קרדיו', 'jog', 'cardio'),
    defaultSets: 0, defaultReps: '', restSeconds: 0, durationMinutes: 5, pace: 'קצב נוח', location: 'outside' },
  ...[
    ['chairStand', 'רגליים - 4 ראשי'], ['wallPushup', 'חזה'], ['kneePushup', 'חזה'], ['inclinePushup', 'חזה'],
    ['trxRow', 'גב אמצעי'], ['bentRow', 'גב אמצעי'], ['bandBentRow', 'גב אמצעי'],
    ['splitSquat', 'רגליים - 4 ראשי'], ['sumoSquat', 'רגליים - 4 ראשי'],
    ['singleBridge', 'רגליים - ישבן'], ['clamShell', 'רגליים - ישבן'], ['singleCalf', 'רגליים - שוקיים'],
    ['standingPress', 'כתפיים'], ['rearFly', 'כתפיים'], ['alternatingCurl', 'יד קדמית'], ['concentrationCurl', 'יד קדמית'],
    ['kickback', 'יד אחורית'], ['closePushup', 'יד אחורית'], ['lyingTriceps', 'יד אחורית'],
    ['heelTap', 'בטן'], ['reverseCrunch', 'בטן'], ['kneeSidePlank', 'בטן'], ['reverseCurl', 'אמות'], ['stepTouch', 'קרדיו'],
  ].map(([id, category]) => ({
    ...addition(`extended-${id}`, EXERCISE_GUIDES[id].name.he, EXERCISE_GUIDES[id].name.en, category, id,
      id === 'stepTouch' ? 'cardio' : id === 'kneeSidePlank' ? 'hold' : 'reps'),
    ...(id === 'stepTouch' ? { defaultSets: 0, defaultReps: '', restSeconds: 0, durationMinutes: 5,
      pace: 'קצב נוח', location: 'home' } : {}),
  })),
  ...Object.entries(CATALOG_EXTENSION).map(([id, info]) => ({
    ...addition(`extended-${id}`, info.name.he, info.name.en, info.muscles[0], id, info.inputType || 'reps'),
    ...(info.inputType === 'cardio' ? { defaultSets: 0, defaultReps: '', restSeconds: 0,
      durationMinutes: 5, pace: 'קצב נוח', location: info.places?.includes('home') ? 'home' : 'gym' } : {}),
  })),
];

// Explicit variants of already-authored guides. They are offered for review, never auto-selected.
export const PLANNING_EXERCISES = [
  ['machine-row', 'row', 'גב אמצעי'],
  ['lat-pulldown', 'pulldown', 'גב עליון'],
  ['machine-shoulder-press', 'shoulder', 'כתפיים'],
  ['machine-leg-press', 'legPress', 'רגליים - 4 ראשי'],
  ['machine-leg-curl', 'legCurl', 'רגליים - המסטרינג'],
  ['cable-triceps', 'triceps', 'יד אחורית'],
].map(([id, guideId, category]) => ({
  ...addition(id, EXERCISE_GUIDES[guideId].name.he, EXERCISE_GUIDES[guideId].name.en, category, guideId),
  id: `planning:${id}`,
}));

const SEED_GUIDE_IDS = {
  'לחיצת חזה': 'chest', 'משיכה לפנים בפולי עליון': 'pulldown', 'גרביטון': 'assisted',
  'החזקה סטטית במתח': 'hang', 'פרפר חזה': 'fly', 'הרחקה אופקית (פרפר הפוך)': 'reverse',
  'חתירה צרה לבטן': 'row', 'זוקפי גב — פשיטת גב': 'back', 'פשיטת מרפקים בפולי עליון': 'triceps',
  'החזקה סטטית על מקבילים': 'dipHold', 'כפיפת מרפקים בישיבה': 'curl', 'פטישים': 'hammer',
  'כפיפה ופשיטה של שורש כף היד': 'wrist', 'הרחקה לצדדים': 'lateral', 'לחיצת כתפיים בישיבה': 'shoulder',
  'טרפז': 'shrug', 'לחיצת רגליים': 'legPress', 'סקוואט': 'squat', 'פשיטת ברכיים': 'legExtension',
  'כפיפת ברכיים': 'legCurl', 'כפיפות בטן': 'crunch', 'כפיפות בטן לצדדים': 'sideCrunch',
  'פלאנק': 'plank', 'חימום-הליכה': 'walk', 'שחרור-הליכה': 'walk',
};

export const UNSPECIFIED_VARIANTS = new Set([
  'לחיצת חזה', 'משיכה לפנים בפולי עליון', 'פרפר חזה', 'הרחקה אופקית (פרפר הפוך)',
  'חתירה צרה לבטן', 'זוקפי גב — פשיטת גב', 'פשיטת מרפקים בפולי עליון',
  'כפיפת מרפקים בישיבה', 'כפיפה ופשיטה של שורש כף היד', 'הרחקה לצדדים',
  'לחיצת רגליים', 'סקוואט', 'כפיפות בטן',
]);

export function exerciseGuide(exercise) {
  return EXERCISE_GUIDES[exercise.catalogId || (exercise.loadKind === 'assistance' ? 'assisted' : SEED_GUIDE_IDS[exercise.name])] || null;
}

export function exerciseBrowseInfo(exercise) {
  if (UNSPECIFIED_VARIANTS.has(exercise.name)
    && (!exercise.catalogId || exercise.id?.startsWith('catalog:seed:'))) return null;
  return exerciseGuide(exercise);
}

export function expandedLibrary(exercises, { newOnly = false } = {}) {
  const additions = LIBRARY_EXERCISES.filter((candidate) => !newOnly || candidate.id.startsWith('library:extended-')).filter((candidate) =>
    !exercises.some((exercise) => exercise.id === candidate.id || exercise.name === candidate.name));
  const existing = newOnly ? exercises : exercises.map((exercise) => exercise.name === 'גרביטון' && !exercise.loadKind
    ? { ...exercise, loadKind: 'assistance' } : exercise);
  return [...existing, ...additions.map(({ englishName, ...exercise }) => ({ ...exercise }))];
}

export function browsableLibrary(exercises, seed) {
  const ids = new Set(exercises.map((exercise) => exercise.id));
  const additions = [
    ...seed.filter((exercise) => !exercises.some((stored) => (exercise.id && stored.id === exercise.id)
      || stored.name === exercise.name)).map((exercise) => ({
      ...exercise, id: exercise.id || `catalog:seed:${SEED_GUIDE_IDS[exercise.name]}`,
      ...(!UNSPECIFIED_VARIANTS.has(exercise.name) ? { catalogId: SEED_GUIDE_IDS[exercise.name] } : {}),
    })),
    ...LIBRARY_EXERCISES, ...PLANNING_EXERCISES,
  ].filter((exercise) => !ids.has(exercise.id));
  return [...exercises, ...additions.map(({ englishName, ...exercise }) => ({
    ...exercise, active: false, images: [...(exercise.images || [])],
  }))];
}

export function catalogStats(exercises, seed) {
  return { builtIn: seed.length + LIBRARY_EXERCISES.length + PLANNING_EXERCISES.length,
    stored: new Set(exercises.map((exercise) => exercise.id)).size,
    selected: exercises.filter((exercise) => exercise.active !== false).length };
}

export function matchesLibraryFilters(exercise, filters, translate = (value) => value) {
  const info = exerciseGuide(exercise);
  const placement = exerciseBrowseInfo(exercise);
  const type = exercise.inputType === 'cardio' ? 'cardio' : exercise.inputType === 'hold' ? 'hold' : 'reps';
  if (filters.type && type !== filters.type) return false;
  if (filters.equipment === 'ללא ציוד') {
    if (!placement || placement.equipment.some((item) => !['משקל גוף', 'מזרן', 'ללא ציוד'].includes(item))) return false;
  } else if (filters.equipment && !placement?.equipment.includes(filters.equipment)) return false;
  if (filters.level && placement?.level !== filters.level) return false;
  if (filters.place && (!placement || !placement.places.includes(filters.place))) return false;
  const words = String(filters.search || '').normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const searchable = [exercise.name, translate(exercise.name), exercise.category, translate(exercise.category),
    info?.name.he, info?.name.en, ...(info?.muscles || []), ...(info?.equipment || [])];
  const text = searchable.filter(Boolean).flatMap((value) => [value, translate(value)]).join(' ').normalize('NFKC').toLocaleLowerCase();
  return words.every((word) => text.includes(word));
}

export const LIBRARY_EQUIPMENT_GROUPS = [
  { id: 'all', label: 'כל התרגילים', icon: '📚' },
  { id: 'bodyweight', label: 'משקל גוף', icon: '🧍' },
  { id: 'weights', label: 'משקולות ומוטות', icon: '🏋️' },
  { id: 'machines', label: 'מכשירים ופולי', icon: '⚙️' },
  { id: 'stations', label: 'מתח ומקבילים', icon: '🏗️' },
  { id: 'accessories', label: 'גומיות ואביזרים', icon: '🔗' },
  { id: 'rope', label: 'קפיצה על חבל', icon: '➰' },
  { id: 'cardio', label: 'אירובי', icon: '🚶' },
];

export function matchesLibraryBrowse(exercise, place = '', equipmentGroup = 'all') {
  if (!matchesLibraryFilters(exercise, { place })) return false;
  const info = exerciseBrowseInfo(exercise);
  if (equipmentGroup === 'all') return true;
  if (equipmentGroup === 'cardio') return exercise.inputType === 'cardio';
  if (equipmentGroup === 'rope') return exercise.catalogId === 'jumpRope';
  if (!info || exercise.inputType === 'cardio') return false;
  if (equipmentGroup === 'bodyweight') return info.equipment.every((item) =>
    ['משקל גוף', 'ללא ציוד', 'מזרן', 'קיר', 'ספסל', 'כיסא יציב'].includes(item));
  if (equipmentGroup === 'weights') return info.equipment.some((item) => ['משקולות יד', 'מוט'].includes(item));
  if (equipmentGroup === 'machines') return info.equipment.includes('מכונה');
  if (equipmentGroup === 'stations') return info.equipment.some((item) => ['מתח', 'מקבילים'].includes(item));
  if (equipmentGroup === 'accessories') return info.equipment.some((item) =>
    ['גומייה', 'TRX', 'גלגל בטן', 'מדרגת אימון'].includes(item))
    && !info.equipment.some((item) => ['משקולות יד', 'מוט', 'מכונה', 'מתח', 'מקבילים'].includes(item));
  return false;
}

export const LIBRARY_TRANSLATIONS = {
  ...Object.fromEntries(Object.values(EXERCISE_GUIDES).flatMap((info) =>
    [info.name, ...info.steps, info.cue, ...(info.view ? [info.view] : [])].map(({ he, en }) => [he, en]))),
  ...Object.fromEntries(LIBRARY_EXERCISES.map((exercise) => [exercise.name, exercise.englishName])),
  'משקל גוף': 'Bodyweight', 'משקולות יד': 'Dumbbells', 'מכונה': 'Machine', 'גומייה': 'Resistance band',
  'ספסל': 'Bench', 'מזרן': 'Mat', 'קיר': 'Wall', 'מתח': 'Pull-up bar', 'מקבילים': 'Parallel bars',
  'כיסא יציב': 'Stable chair', 'TRX': 'TRX', 'מוט': 'Barbell', 'ספסל כומר': 'Preacher bench',
  'מדרגת אימון': 'Exercise step', 'גלגל בטן': 'Ab wheel',
  'ללא ציוד': 'No equipment', 'מתחילים': 'Beginner', 'בינוניים': 'Intermediate',
  'ישבן': 'Glutes', 'שוקיים': 'Calves', 'גב': 'Back', 'גב תחתון': 'Lower back',
  'רגליים - ישבן': 'Legs - glutes', 'רגליים - שוקיים': 'Legs - calves', 'קצב נוח': 'Comfortable pace',
};

// Joint coordinates: head, shoulder, elbow, hand, hip, knee, foot. Side-view unless noted.
const STANDING = [[45,18],[45,34],[46,55],[46,76],[45,78],[45,108],[45,138]];
const SEATED = [[40,23],[40,39],[55,57],[70,57],[40,82],[70,83],[70,138]];
const LYING = [[23,100],[39,103],[49,119],[55,138],[85,105],[110,88],[130,138]];
const PLANK = [[27,82],[45,90],[43,135],[69,135],[91,108],[120,122],[145,138]];
const poses = {
  jumpRope: [[[80,20],[80,36],[57,62],[42,79],[80,80],[69,109],[67,138]],
    [[80,12],[80,28],[57,54],[42,71],[80,72],[67,102],[66,129]]],
  inclinePress: [[[37,25],[50,40],[83,66],[67,41],[90,90],[115,105],[115,138]],
    [[37,25],[50,40],[57,22],[63,1],[90,90],[115,105],[115,138]]],
  supportedRow: [[[110,48],[94,60],[90,90],[85,124],[45,80],[48,110],[37,138]],
    [[110,48],[94,60],[50,73],[75,85],[45,80],[48,110],[37,138]]],
  pullup: [[[75,45],[75,61],[70,33],[70,7],[75,99],[82,116],[81,138]],
    [[75,15],[75,31],[50,34],[70,7],[75,69],[82,91],[81,113]]],
  hackSquat: [[[43,18],[51,34],[65,51],[66,34],[72,78],[91,106],[114,138]],
    [[24,43],[32,59],[45,76],[47,59],[53,103],[99,111],[114,138]]],
  backSquat: [[[75,18],[75,34],[95,47],[85,31],[75,78],[75,108],[75,138]],
    [[87,42],[82,58],[100,72],[91,54],[54,91],[95,106],[75,138]]],
  seatedLateral: [[[80,18],[80,34],[61,58],[60,80],[80,78],[53,83],[53,138]],
    [[80,18],[80,34],[48,37],[16,40],[80,78],[53,83],[53,138]]],
  elliptical: [[[75,18],[75,34],[57,54],[67,68],[75,78],[57,105],[40,138]],
    [[75,18],[75,34],[93,54],[103,68],[75,78],[95,105],[112,130]]],
  highPlank: [[[27,74],[45,84],[46,111],[47,138],[90,105],[118,121],[145,138]],
    [[27,74],[45,84],[46,111],[47,138],[90,105],[118,121],[145,138]]],
  abWheel: [[[75,60],[70,77],[66,100],[62,122],[90,100],[110,138],[145,138]],
    [[40,90],[55,100],[35,111],[15,122],[90,122],[110,138],[145,138]]],
  seatedFly: [[[80,18],[80,34],[48,42],[16,50],[80,78],[53,100],[53,138]],
    [[80,18],[80,34],[65,42],[73,50],[80,78],[53,100],[53,138]]],
  cableFly: [[[80,18],[80,34],[48,42],[16,50],[80,78],[65,108],[65,138]],
    [[80,18],[80,34],[62,56],[74,70],[80,78],[65,108],[65,138]]],
  chestMachine: [[[40,23],[40,39],[35,61],[65,47],[40,82],[70,83],[70,138]],
    [[40,23],[40,39],[76,43],[112,47],[40,82],[70,83],[70,138]]],
  straightArm: [[[45,18],[45,34],[76,28],[111,20],[45,78],[45,108],[45,138]], STANDING],
  facePull: [[[45,18],[45,34],[78,34],[112,34],[45,78],[45,108],[45,138]],
    [[45,18],[45,34],[24,30],[52,22],[45,78],[45,108],[45,138]]],
  hipAdduction: [[[80,18],[80,34],[70,58],[60,75],[80,78],[43,101],[35,138]],
    [[80,18],[80,34],[70,58],[60,75],[80,78],[67,101],[67,138]]],
  standingAbduction: [STANDING, [[45,18],[45,34],[46,55],[46,76],[45,78],[80,99],[103,125]]],
  seatedCalf: [SEATED, [[40,23],[40,39],[55,57],[70,57],[40,82],[70,83],[70,128]]],
  preacherCurl: [[[35,23],[35,39],[65,66],[98,91],[35,82],[65,83],[65,138]],
    [[35,23],[35,39],[65,66],[87,40],[35,82],[65,83],[65,138]]],
  lyingCurl: [[[25,84],[40,93],[52,110],[55,131],[85,100],[110,105],[145,113]],
    [[25,84],[40,93],[52,110],[55,131],[85,100],[110,105],[122,65]]],
  seatedCrunch: [[[40,23],[40,39],[60,45],[65,22],[40,82],[70,83],[70,138]],
    [[68,42],[67,58],[82,72],[90,50],[40,82],[70,83],[70,138]]],
  stepUp: [[[45,18],[45,34],[46,55],[46,76],[45,78],[80,98],[100,110]],
    [[85,0],[85,16],[86,37],[86,58],[85,60],[97,85],[100,110]]],
  bandPullApart: [[[80,18],[80,34],[70,48],[72,65],[80,78],[65,108],[65,138]],
    [[80,18],[80,34],[46,35],[12,37],[80,78],[65,108],[65,138]]],
  pallof: [[[45,18],[45,34],[65,55],[65,38],[45,78],[45,108],[45,138]],
    [[45,18],[45,34],[80,36],[115,38],[45,78],[45,108],[45,138]]],
  bike: [[[65,18],[65,34],[85,47],[105,47],[50,80],[90,96],[90,126]],
    [[65,18],[65,34],[85,47],[105,47],[50,80],[75,105],[55,126]]],
  chairStand: [SEATED, STANDING],
  wallPushup: [[[110,20],[100,36],[125,40],[145,45],[82,80],[70,110],[58,138]], [[130,30],[119,46],[132,60],[145,45],[96,87],[80,114],[65,138]]],
  kneePushup: [[[27,74],[45,84],[46,111],[47,138],[80,105],[105,138],[133,108]], [[27,108],[45,113],[28,126],[47,138],[80,124],[105,138],[133,108]]],
  inclinePushup: [[[105,40],[95,54],[105,80],[115,105],[60,94],[40,116],[20,138]], [[120,70],[110,83],[105,100],[115,105],[65,105],[43,120],[20,138]]],
  trxRow: [[[35,42],[45,55],[65,35],[85,15],[89,95],[115,117],[140,138]], [[85,8],[89,24],[62,45],[89,28],[111,76],[125,106],[140,138]]],
  bentRow: [[[110,48],[94,60],[90,90],[85,124],[45,80],[48,110],[37,138]], [[110,48],[94,60],[50,73],[75,85],[45,80],[48,110],[37,138]]],
  splitSquat: [[[75,18],[75,34],[76,55],[76,76],[75,78],[102,109],[102,138]], [[75,40],[75,56],[76,77],[76,98],[75,100],[102,108],[102,138]]],
  sumoSquat: [[[80,18],[80,34],[72,55],[70,76],[80,78],[105,108],[115,138]], [[80,44],[80,60],[72,81],[70,102],[80,104],[118,111],[115,138]]],
  singleBridge: [LYING, [[23,100],[39,103],[49,119],[55,138],[82,78],[110,88],[130,138]]],
  clamShell: [[[20,93],[35,100],[50,119],[65,138],[75,105],[110,128],[135,137]], [[20,93],[35,100],[50,119],[65,138],[75,105],[110,97],[135,137]]],
  singleCalf: [STANDING, [[45,8],[45,24],[46,45],[46,66],[45,68],[45,98],[45,128]]],
  standingPress: [[[80,18],[80,34],[102,45],[102,20],[80,78],[65,108],[65,138]], [[80,18],[80,34],[95,10],[87,0],[80,78],[65,108],[65,138]]],
  concentrationCurl: [[[55,33],[55,49],[65,85],[65,120],[45,88],[95,88],[95,138]], [[55,33],[55,49],[65,85],[89,70],[45,88],[95,88],[95,138]]],
  kickback: [[[110,50],[95,61],[65,65],[65,95],[40,85],[50,111],[40,138]], [[110,50],[95,61],[65,65],[35,50],[40,85],[50,111],[40,138]]],
  lyingTriceps: [[[23,100],[39,103],[39,70],[18,82],[85,105],[110,88],[130,138]], [[23,100],[39,103],[39,70],[39,36],[85,105],[110,88],[130,138]]],
  heelTap: [[[23,100],[39,103],[55,126],[70,138],[85,105],[90,72],[125,72]], [[23,100],[39,103],[55,126],[70,138],[85,105],[113,114],[135,138]]],
  reverseCrunch: [LYING, [[23,100],[39,103],[55,126],[70,138],[80,86],[65,56],[104,57]]],
  kneeSidePlank: [[[28,79],[45,88],[43,135],[68,135],[91,108],[115,138],[140,110]], [[28,79],[45,88],[43,135],[68,135],[91,108],[115,138],[140,110]]],
  stepTouch: [[[80,18],[80,34],[68,55],[64,76],[80,78],[95,108],[95,138]], [[95,18],[95,34],[107,55],[111,76],[95,78],[119,108],[135,138]]],
  squat: [STANDING, [[60,48],[57,64],[76,68],[95,67],[38,92],[83,106],[60,138]]],
  goblet: [[[45,18],[45,34],[61,54],[48,42],[45,78],[45,108],[45,138]], [[60,48],[57,64],[73,83],[61,71],[38,92],[83,106],[60,138]]],
  lunge: [STANDING, [[68,33],[68,49],[69,70],[69,86],[68,91],[96,104],[96,138]]],
  hinge: [STANDING, [[104,68],[89,74],[88,99],[88,125],[44,84],[57,108],[45,138]]],
  bridge: [LYING, [[23,100],[39,103],[49,119],[55,138],[82,78],[110,88],[130,138]]],
  calf: [STANDING, [[45,8],[45,24],[46,45],[46,66],[45,68],[45,98],[45,128]]],
  pushup: [[[27,74],[45,84],[46,111],[47,138],[90,105],[118,121],[145,138]],
    [[27,108],[45,113],[28,126],[47,138],[90,124],[119,132],[145,138]]],
  chest: [[[23,92],[39,95],[57,75],[57,51],[85,95],[110,110],[110,138]], [[23,92],[39,95],[39,65],[39,31],[85,95],[110,110],[110,138]]],
  floor: [[[23,100],[39,103],[62,137],[69,104],[85,105],[110,88],[130,138]], [[23,100],[39,103],[39,72],[39,40],[85,105],[110,88],[130,138]]],
  // Fly and reverse fly are front-view to make the lateral arm arc visible.
  fly: [[[80,22],[80,40],[45,46],[13,61],[80,87],[65,112],[65,138]], [[80,22],[80,40],[61,47],[77,50],[80,87],[65,112],[65,138]]],
  pulldown: [[[40,23],[40,39],[51,18],[65,6],[40,82],[70,83],[70,138]], SEATED],
  hang: [[[75,45],[75,61],[70,33],[70,7],[75,99],[82,116],[81,138]], [[75,45],[75,61],[70,33],[70,7],[75,99],[82,116],[81,138]]],
  assisted: [[[75,45],[75,61],[70,33],[70,7],[75,99],[82,116],[107,116]], [[75,20],[75,36],[50,34],[70,7],[75,74],[88,100],[113,100]]],
  row: [[[40,23],[40,39],[69,44],[96,49],[40,82],[95,94],[133,138]], [[40,23],[40,39],[20,66],[49,71],[40,82],[95,94],[133,138]]],
  oneRow: [[[101,51],[85,60],[85,90],[85,123],[37,69],[42,108],[32,138]], [[101,51],[85,60],[45,67],[70,84],[37,69],[42,108],[32,138]]],
  back: [[[27,126],[45,131],[69,133],[89,133],[91,132],[120,132],[147,138]], [[27,110],[45,116],[69,121],[89,123],[91,132],[120,132],[147,138]]],
  triceps: [[[45,18],[45,34],[46,64],[74,64],[45,78],[45,108],[45,138]], STANDING],
  overhead: [[[65,28],[65,44],[65,7],[91,22],[65,85],[65,111],[65,138]], [[65,28],[65,44],[65,18],[65,1],[65,85],[65,111],[65,138]]],
  curl: [STANDING, [[45,18],[45,34],[46,64],[71,44],[45,78],[45,108],[45,138]]],
  wrist: [[[35,23],[35,39],[45,70],[95,70],[35,82],[65,83],[65,138]], [[35,23],[35,39],[45,70],[95,70],[35,82],[65,83],[65,138]]],
  lateral: [[[80,18],[80,34],[68,58],[64,80],[80,78],[65,108],[65,138]], [[80,18],[80,34],[48,37],[16,40],[80,78],[65,108],[65,138]]],
  front: [STANDING, [[45,18],[45,34],[76,35],[107,36],[45,78],[45,108],[45,138]]],
  reverse: [[[80,30],[80,46],[70,66],[65,88],[80,88],[65,110],[65,138]], [[80,30],[80,46],[47,50],[15,55],[80,88],[65,110],[65,138]]],
  press: [SEATED, [[40,23],[40,39],[44,15],[48,1],[40,82],[70,83],[70,138]]],
  shrug: [STANDING, [[45,18],[45,29],[46,50],[46,71],[45,78],[45,108],[45,138]]],
  legPress: [[[24,64],[35,78],[52,87],[70,98],[56,104],[77,82],[99,53]], [[24,64],[35,78],[52,87],[70,98],[56,104],[91,75],[125,43]]],
  legPressCalf: [[[24,64],[35,78],[52,87],[70,98],[56,104],[89,76],[118,48]], [[24,64],[35,78],[52,87],[70,98],[56,104],[89,76],[121,44]]],
  legExtension: [SEATED, [[40,23],[40,39],[55,57],[70,57],[40,82],[70,83],[125,82]]],
  legCurl: [[[40,23],[40,39],[55,57],[70,57],[40,82],[70,83],[125,82]], [[40,23],[40,39],[55,57],[70,57],[40,82],[70,83],[62,136]]],
  crunch: [LYING, [[30,75],[45,85],[60,100],[70,110],[85,105],[110,88],[130,138]]],
  sideCrunch: [LYING, [[34,76],[47,87],[65,91],[87,87],[85,105],[110,88],[130,138]]],
  plank: [PLANK, PLANK],
  sidePlank: [[[28,79],[45,88],[43,135],[68,135],[91,108],[120,123],[145,138]], [[28,79],[45,88],[43,135],[68,135],[91,108],[120,123],[145,138]]],
  wallSit: [[[40,45],[40,61],[62,80],[80,80],[40,100],[80,100],[80,138]], [[40,45],[40,61],[62,80],[80,80],[40,100],[80,100],[80,138]]],
  deadbug: [[[23,100],[39,103],[39,75],[39,48],[85,105],[90,72],[125,72]], [[23,100],[39,103],[18,91],[3,81],[85,105],[113,116],[143,130]]],
  birdDog: [[[29,63],[43,76],[43,107],[43,138],[95,80],[95,111],[130,138]], [[29,63],[43,76],[22,76],[1,76],[95,80],[121,80],[148,80]]],
  dipHold: [[[75,15],[75,31],[74,57],[74,82],[75,77],[89,103],[88,135]], [[75,15],[75,31],[74,57],[74,82],[75,77],[89,103],[88,135]]],
  farmer: [STANDING, STANDING],
  walk: [[[75,18],[75,34],[57,54],[52,72],[75,78],[57,105],[40,138]], [[75,18],[75,34],[93,54],[99,72],[75,78],[95,105],[112,138]]],
  march: [[[75,18],[75,34],[57,54],[52,72],[75,78],[95,95],[95,122]], [[75,18],[75,34],[93,54],[99,72],[75,78],[75,108],[75,138]]],
  jog: [[[75,18],[75,34],[55,52],[70,40],[75,78],[103,94],[103,120]], [[75,18],[75,34],[95,52],[82,40],[75,78],[53,103],[30,112]]],
};

export function exerciseIllustration(info, isHold = false) {
  if (info.activityOnly) return '<svg viewBox="0 0 160 160" role="img" aria-label="תיעוד זמן פעילות"><circle cx="80" cy="85" r="52" fill="none" stroke="currentColor" stroke-width="5"/><path d="M66 15h28M80 15v18M80 48v38l24 15" fill="none" stroke="currentColor" stroke-width="5"/></svg>';
  const positions = poses[info.pose];
  if (!positions) throw new Error(`Missing exercise illustration: ${info.pose}`);
  const [start, end] = positions;
  const draw = (joints) => {
    const [head, shoulder, elbow, hand, hip, knee, foot] = joints;
    const front = ['fly', 'lateral', 'reverse', 'sumoSquat', 'standingPress', 'seatedFly', 'cableFly', 'hipAdduction', 'bandPullApart', 'seatedLateral', 'jumpRope'].includes(info.pose);
    const mirror = ([x, y]) => [160 - x, y];
    const primary = info.muscles[0];
    const weights = info.equipment.includes('משקולות יד');
    const muscle = 'url(#exercise-muscle)', outline = '#343d47', skin = 'url(#exercise-skin)';
    const limb = (from, to, width, endWidth, highlighted = false) => {
      const dx = to[0] - from[0], dy = to[1] - from[1], length = Math.hypot(dx, dy) || 1;
      const nx = -dy / length, ny = dx / length;
      const point = (position, across) => `${from[0] + dx * position + nx * across},${from[1] + dy * position + ny * across}`;
      return `<path d="M${point(0, -width)} Q${point(.42, -width * 1.25)} ${point(1, -endWidth)}
        Q${point(1.08, 0)} ${point(1, endWidth)} Q${point(.42, width * 1.25)} ${point(0, width)} Z"
        fill="${highlighted ? muscle : skin}" stroke="${outline}" stroke-width=".8"/>
        <path d="M${point(.17, -width * .3)} Q${point(.5, -width * .65)} ${point(.84, -endWidth * .3)}"
        fill="none" stroke="${highlighted ? '#a42d36' : '#a9b0b6'}" stroke-width=".7"/>`;
    };
    const arm = (s, e, h) => limb(s, e, 5.4, 3.8, ['יד קדמית', 'יד אחורית'].includes(primary))
      + limb(e, h, 4, 2.5, primary === 'אמות')
      + `<ellipse cx="${h[0]}" cy="${h[1]}" rx="3" ry="3.5" fill="${skin}" stroke="${outline}" stroke-width=".8"/>`;
    const leg = (h, k, f) => limb(h, k, 7.5, 4, ['רגליים', 'ישבן'].includes(primary))
      + limb(k, f, 5.2, 2.5, primary === 'שוקיים')
      + `<path d="M${f[0]-3} ${f[1]-2}q8-1 12 3q0 3-13 2Z" fill="${skin}" stroke="${outline}" stroke-width=".8"/>`;
    let equipment = '';
    if (info.pose === 'inclinePress') {
      equipment += '<path d="M39 42l48 55h30M54 59v79M110 97v41"/>';
      if (info.equipment.includes('מכונה')) equipment += `<path d="M12 4v134M144 4v134M12 ${hand[1]}H144" stroke="#303943"/>`;
    }
    if (info.pose === 'supportedRow') equipment += '<path d="M29 89l75-28M42 84v54M94 65v73"/>';
    if (info.pose === 'hackSquat') equipment += `<path d="M6 5l68 133M90 145l50-20M${shoulder[0]-11} ${shoulder[1]-4}L${hip[0]-11} ${hip[1]+5}M${hand[0]-6} ${hand[1]}h12"/>`;
    if (info.pose === 'seatedLateral') equipment += '<path d="M52 84h56M58 84v54M102 84v54"/>';
    if (info.pose === 'elliptical') equipment += `<path d="M19 145h130M135 145V48h-28M67 68l-8 70M103 68l8 64M${foot[0]-10} ${foot[1]+3}h24M${(joints === end ? start : end)[6][0]-10} 141h24"/>`;
    if (info.pose === 'abWheel') equipment += `<circle cx="${hand[0]}" cy="${hand[1]+8}" r="8"/><path d="M${hand[0]-10} ${hand[1]}h20"/>`;
    if (info.pose === 'stepUp') equipment += '<path d="M82 112h63v26H82z"/>';
    if (['seatedFly', 'chestMachine', 'seatedCalf', 'preacherCurl', 'seatedCrunch'].includes(info.pose)) equipment += '<path d="M25 40v48h55M31 88v50M74 88v50"/>';
    if (info.pose === 'preacherCurl') equipment += '<path d="M46 54l38 29M67 70v68"/>';
    if (info.pose === 'lyingCurl') equipment += '<path d="M20 102l80 12h47M30 107v31M140 114v24"/>';
    if (info.pose === 'hipAdduction') equipment += `<path d="M50 82h60M56 82v56M104 82v56M${knee[0]-6} ${knee[1]-8}v19M${160-knee[0]+6} ${knee[1]-8}v19"/>`;
    if (info.pose === 'bandPullApart') equipment += `<path d="M${hand[0]} ${hand[1]}L${160-hand[0]} ${hand[1]}" stroke="#546f79"/>`;
    if (info.pose === 'cableFly') equipment += `<path d="M4 8v130M156 8v130M4 8L${hand[0]} ${hand[1]}M156 8L${160-hand[0]} ${hand[1]}"/>`;
    if (['straightArm', 'facePull', 'pallof'].includes(info.pose)) equipment += `<path d="M150 8v130M150 ${info.pose === 'straightArm' ? 8 : 38}L${hand[0]} ${hand[1]}"/>`;
    if (info.pose === 'bike') equipment += '<path d="M31 84h30M48 84v37l43 13M22 138h100M102 138l12-97h-14"/><circle cx="66" cy="125" r="15"/>';
    if (info.equipment.includes('מוט')) equipment += `<path d="M${hand[0]-17} ${hand[1]}h34" stroke="#303943" stroke-width="4"/><path d="M${hand[0]-13} ${hand[1]-8}v16M${hand[0]+13} ${hand[1]-8}v16" stroke="#303943" stroke-width="5"/>`;
    if (['chairStand', 'concentrationCurl'].includes(info.pose)) equipment += '<path d="M25 40v48h55M31 88v50M73 88v50"/>';
    if (info.pose === 'wallPushup') equipment += '<path d="M150 8v138"/>';
    if (info.pose === 'jumpRope') equipment += joints === start
      ? '<path d="M42 79Q14 151 80 146Q146 151 118 79" stroke="#96751f"/>'
      : '<path d="M42 71Q2-8 80-4Q158-8 118 71" stroke="#96751f"/>';
    if (info.pose === 'inclinePushup') equipment += '<path d="M105 105h49M110 105v33M149 105v33"/>';
    if (info.pose === 'trxRow') equipment += `<path d="M145 5L${hand[0]} ${hand[1]}M149 5L${hand[0]+7} ${hand[1]+3}"/><circle cx="147" cy="5" r="3"/>`;
    if (info.pose === 'bentRow' && info.equipment.includes('גומייה')) equipment += `<path d="M${hand[0]} ${hand[1]}L${foot[0]} ${foot[1]}L${hand[0]+8} ${hand[1]+3}"/>`;
    if (info.pose === 'fly') equipment += '<rect x="61" y="14" width="38" height="117" rx="5"/>';
    if (info.pose === 'wrist') equipment += '<path d="M40 77h58M50 77v61M88 77v61"/>';
    if (['chest', 'oneRow'].includes(info.pose)) equipment += '<path d="M25 103H124M35 103v35M115 103v35"/>';
    if (['pulldown', 'press', 'legExtension', 'legCurl', 'legPress'].includes(info.pose)) equipment += '<path d="M25 40v48h54M31 88v50M72 88v50"/>';
    if (['pulldown', 'triceps'].includes(info.pose)) equipment += `<path d="M140 137V4H70L${hand[0]} ${hand[1]}"/><rect x="127" y="83" width="19" height="52" rx="2"/>`;
    if (['legPress', 'legPressCalf'].includes(info.pose)) equipment += '<path d="M21 62l35 43 77-59M95 29l44 32M46 123h88"/>';
    if (['legExtension', 'legCurl'].includes(info.pose)) equipment += `<path d="M${knee[0]} ${knee[1]}L${foot[0]} ${foot[1]}"/><circle cx="${foot[0]}" cy="${foot[1]}" r="7"/>`;
    if (info.pose === 'wallSit') equipment += '<path d="M27 14v124"/>';
    if (['hang', 'assisted', 'pullup'].includes(info.pose)) equipment += '<path d="M34 5h92M38 5v133"/>';
    if (info.pose === 'assisted') equipment += `<path d="M60 ${knee[1] + 6}h48M115 12v126"/><rect x="118" y="100" width="26" height="36"/>`;
    if (info.pose === 'dipHold') equipment += '<path d="M55 82h42M58 82v56M94 82v56"/>';
    if (info.pose === 'row') equipment += info.equipment.includes('גומייה')
      ? `<path d="M${hand[0]} ${hand[1]}Q105 94 133 138Q110 98 ${hand[0]+3} ${hand[1]+3}" stroke="#546f79"/>`
      : `<path d="M140 75v63M140 85L${hand[0]} ${hand[1]}M24 91h38M33 91v47"/>`;
    const weight = ([x, y]) => {
      const angle = info === EXERCISE_GUIDES.hammer || info === EXERCISE_GUIDES.preacherHammerCurl ? 90 : 0;
      return `<g transform="translate(${x} ${y}) rotate(${angle})" fill="#414a55" stroke="#202832" stroke-width=".8">
        <rect x="-10" y="-2" width="20" height="4" rx="1"/>
        <rect x="-10" y="-7" width="5" height="14" rx="1.5"/><rect x="5" y="-7" width="5" height="14" rx="1.5"/></g>`;
    };
    const wristFingers = info.pose === 'wrist' ? (joints === end ? [108, 53] : [115, 70]) : null;
    const opposite = joints === end ? start : end;
    const stepping = ['walk', 'march', 'jog', 'elliptical'].includes(info.pose);
    const secondLeg = info.pose === 'singleBridge' ? leg(hip, [112,75], [145,65])
      : info.pose === 'singleCalf' ? leg(hip, [75,86], [83,109])
      : info.pose === 'clamShell' ? leg(hip, [110,128], [135,137])
      : info.pose === 'heelTap' ? leg(hip, [90,72], [125,72])
      : info.pose === 'stepTouch' ? leg(hip, [65,108], [65,138])
      : info.pose === 'splitSquat' ? leg(hip, joints === end ? [44,123] : [38,108], [20,138])
      : info.pose === 'lunge' && joints === end ? leg(hip, [36,120], [20,138])
      : info.pose === 'oneRow' ? leg(hip, [77,100], [110,100])
      : info.pose === 'deadbug' ? leg(hip, [90,72], [125,72])
      : stepping ? leg(hip, opposite[5], opposite[6])
      : info.pose === 'birdDog' ? leg(hip, [95,111], [130,138])
        : front ? leg(hip, mirror(knee), mirror(foot))
          : leg([hip[0]+6,hip[1]], [knee[0]+8,knee[1]], [foot[0]+10,foot[1]]);
    const farArm = info.pose === 'birdDog' ? arm(shoulder, [43,107], [43,138])
      : info.pose === 'seatedLateral' ? arm(shoulder, [99,56], [100,80])
      : info.pose === 'oneRow' ? arm(shoulder, [103,79], [112,101])
      : info.pose === 'deadbug' ? arm(shoulder, [39,75], [39,48])
      : stepping ? arm(shoulder, opposite[2], opposite[3])
      : ['sidePlank', 'kneeSidePlank'].includes(info.pose) ? arm(shoulder, [50,44], [55,9])
        : front ? arm(shoulder, mirror(elbow), mirror(hand))
          : arm(shoulder, [elbow[0]+7,elbow[1]], [hand[0]+10,hand[1]]);
    const torsoLength = Math.hypot(hip[0]-shoulder[0], hip[1]-shoulder[1]);
    const rotation = Math.atan2(hip[1]-shoulder[1], hip[0]-shoulder[0]) * 180 / Math.PI - 90;
    const width = front ? 17 : 11;
    const torso = `<g transform="translate(${shoulder}) rotate(${rotation})">
      <path d="M${-width} 0Q0-6 ${width} 0L8 ${torsoLength-10}Q11 ${torsoLength+4} 0 ${torsoLength+5}
        Q-11 ${torsoLength+4}-8 ${torsoLength-10}Z" fill="${skin}" stroke="${outline}" stroke-width="1"/>
      <path d="M${-width+2} 3Q0-1 ${width-2} 3L7 18Q0 24-7 18Z"
        fill="${['חזה','גב','טרפז'].includes(primary) ? muscle : '#c5ccd1'}" stroke="#a1a9af" stroke-width=".6"/>
      ${[0,1,2].map((n) => `<path d="M-6 ${21+n*6}q6-2 12 0v4q-6 3-12 0Z" fill="${primary === 'בטן' ? muscle : '#cbd1d5'}" stroke="#a1a9af" stroke-width=".5"/>`).join('')}
      <path d="M-7 ${torsoLength-13}Q0 ${torsoLength-8} 7 ${torsoLength-13}L8 ${torsoLength+1}Q0 ${torsoLength+8}-8 ${torsoLength+1}Z"
        fill="${['ישבן','גב תחתון'].includes(primary) ? muscle : '#535d68'}"/>
      <path d="M0 2v${Math.max(0,torsoLength-15)}" stroke="#a1a9af" stroke-width=".6"/></g>`;
    return `<g fill="none" stroke="#8d969d" stroke-width="2.7" stroke-linejoin="round">${equipment}</g>
      <g opacity=".63">${secondLeg}${farArm}</g>
      ${leg(hip, knee, foot)}${torso}
      <path d="M${head}L${shoulder}" stroke="${outline}" stroke-width="7"/>
      <ellipse cx="${head[0]}" cy="${head[1]}" rx="7.4" ry="9" fill="${skin}" stroke="${outline}" stroke-width="1"/>
      <path d="M${head[0]+5} ${head[1]-1}l4 3-3 1M${head[0]+2} ${head[1]-3}h2" fill="none" stroke="#6a747e" stroke-width=".8"/>
      ${arm(shoulder, elbow, hand)}
      <ellipse cx="${shoulder[0]}" cy="${shoulder[1]+2}" rx="6.5" ry="7.5" fill="${primary === 'כתפיים' ? muscle : skin}" stroke="${outline}" stroke-width=".7"/>
      ${wristFingers ? limb(hand, wristFingers, 3, 2, true) : ''}
      ${weights ? weight(wristFingers || hand) + (front && info.pose !== 'seatedLateral' ? weight(mirror(hand)) : '') : ''}
      <path d="M9 148h149" stroke="#c6cdd2" stroke-width="1"/>`;
  };
  return `<svg class="exercise-technique-svg" viewBox="0 0 ${isHold ? '180' : '380'} 172" aria-hidden="true" focusable="false">
    <defs><linearGradient id="exercise-skin"><stop stop-color="#fafafa"/><stop offset=".48" stop-color="#d9dfe3"/><stop offset="1" stop-color="#9da9b3"/></linearGradient>
      <linearGradient id="exercise-muscle"><stop stop-color="#ee9090"/><stop offset=".5" stop-color="#d65050"/><stop offset="1" stop-color="#a42d36"/></linearGradient></defs>
    <g transform="translate(10 10)">${draw(isHold ? end : start)}</g>
    ${isHold ? '' : `<path d="M181 79h18m-6-6 6 6-6 6" fill="none" stroke="#a42d36" stroke-width="2"/><g transform="translate(210 10)">${draw(end)}</g>`}
  </svg>`;
}
