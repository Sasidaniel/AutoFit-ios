// Original instructional text and schematic illustrations. Existing programs remain unchanged.
const pair = (he, en) => ({ he, en });
const guide = (name, muscles, equipment, pose, steps, cue, options = {}) => ({
  name, muscles, equipment, pose, steps, cue, level: 'מתחילים', ...options,
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

// Public video pages checked against publisher metadata on 2026-10-21.
// Links only: no third-party video, thumbnail or PDF artwork is copied into the app.
const videoLink = (href, publisher, title) => ({ href, publisher, title, reviewedOn: '2026-10-21' });
const youtube = (id, publisher, title) => videoLink(`https://www.youtube.com/watch?v=${id}`, publisher, title);
const muscleAndStrength = (slug, title) => videoLink(`https://www.muscleandstrength.com/exercises/${slug}`, 'Muscle & Strength', title);
const SELECTED_VIDEOS = {
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

export function exerciseGuide(exercise) {
  return EXERCISE_GUIDES[exercise.catalogId || (exercise.loadKind === 'assistance' ? 'assisted' : SEED_GUIDE_IDS[exercise.name])] || null;
}

export function expandedLibrary(exercises) {
  const additions = LIBRARY_EXERCISES.filter((candidate) =>
    !exercises.some((exercise) => exercise.id === candidate.id || exercise.name === candidate.name));
  const existing = exercises.map((exercise) => exercise.name === 'גרביטון' && !exercise.loadKind
    ? { ...exercise, loadKind: 'assistance' } : exercise);
  return [...existing, ...additions.map(({ englishName, ...exercise }) => ({ ...exercise }))];
}

export function matchesLibraryFilters(exercise, filters, translate = (value) => value) {
  const info = exerciseGuide(exercise);
  const type = exercise.inputType === 'cardio' ? 'cardio' : exercise.inputType === 'hold' ? 'hold' : 'reps';
  if (filters.type && type !== filters.type) return false;
  if (filters.equipment === 'ללא ציוד') {
    if (!info || info.equipment.some((item) => !['משקל גוף', 'מזרן', 'ללא ציוד'].includes(item))) return false;
  } else if (filters.equipment && !info?.equipment.includes(filters.equipment)) return false;
  if (filters.level && info?.level !== filters.level) return false;
  const places = info?.places || (info?.equipment.includes('מכונה') ? ['gym'] : ['home', 'gym']);
  if (filters.place && (!info || !places.includes(filters.place))) return false;
  const words = String(filters.search || '').normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const searchable = [exercise.name, translate(exercise.name), exercise.category, translate(exercise.category),
    info?.name.he, info?.name.en, ...(info?.muscles || []), ...(info?.equipment || [])];
  const text = searchable.filter(Boolean).flatMap((value) => [value, translate(value)]).join(' ').normalize('NFKC').toLocaleLowerCase();
  return words.every((word) => text.includes(word));
}

export const LIBRARY_TRANSLATIONS = {
  ...Object.fromEntries(Object.values(EXERCISE_GUIDES).flatMap((info) =>
    [info.name, ...info.steps, info.cue, ...(info.view ? [info.view] : [])].map(({ he, en }) => [he, en]))),
  ...Object.fromEntries(LIBRARY_EXERCISES.map((exercise) => [exercise.name, exercise.englishName])),
  'משקל גוף': 'Bodyweight', 'משקולות יד': 'Dumbbells', 'מכונה': 'Machine', 'גומייה': 'Resistance band',
  'ספסל': 'Bench', 'מזרן': 'Mat', 'קיר': 'Wall', 'מתח': 'Pull-up bar', 'מקבילים': 'Parallel bars',
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
  const positions = poses[info.pose];
  if (!positions) throw new Error(`Missing exercise illustration: ${info.pose}`);
  const [start, end] = positions;
  const draw = (joints) => {
    const [head, shoulder, elbow, hand, hip, knee, foot] = joints;
    const front = ['fly', 'lateral', 'reverse'].includes(info.pose);
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
    if (info.pose === 'fly') equipment += '<rect x="61" y="14" width="38" height="117" rx="5"/>';
    if (info.pose === 'wrist') equipment += '<path d="M40 77h58M50 77v61M88 77v61"/>';
    if (['chest', 'oneRow'].includes(info.pose)) equipment += '<path d="M25 103H124M35 103v35M115 103v35"/>';
    if (['pulldown', 'press', 'legExtension', 'legCurl', 'legPress'].includes(info.pose)) equipment += '<path d="M25 40v48h54M31 88v50M72 88v50"/>';
    if (['pulldown', 'triceps'].includes(info.pose)) equipment += `<path d="M140 137V4H70L${hand[0]} ${hand[1]}"/><rect x="127" y="83" width="19" height="52" rx="2"/>`;
    if (info.pose === 'legPress') equipment += '<path d="M21 62l35 43 77-59M95 29l44 32M46 123h88"/>';
    if (['legExtension', 'legCurl'].includes(info.pose)) equipment += `<path d="M${knee[0]} ${knee[1]}L${foot[0]} ${foot[1]}"/><circle cx="${foot[0]}" cy="${foot[1]}" r="7"/>`;
    if (info.pose === 'wallSit') equipment += '<path d="M27 14v124"/>';
    if (['hang', 'assisted'].includes(info.pose)) equipment += '<path d="M34 5h92M38 5v133"/>';
    if (info.pose === 'assisted') equipment += `<path d="M60 ${knee[1] + 6}h48M115 12v126"/><rect x="118" y="100" width="26" height="36"/>`;
    if (info.pose === 'dipHold') equipment += '<path d="M55 82h42M58 82v56M94 82v56"/>';
    if (info.pose === 'row') equipment += info.equipment.includes('גומייה')
      ? `<path d="M${hand[0]} ${hand[1]}Q105 94 133 138Q110 98 ${hand[0]+3} ${hand[1]+3}" stroke="#546f79"/>`
      : `<path d="M140 75v63M140 85L${hand[0]} ${hand[1]}M24 91h38M33 91v47"/>`;
    const weight = ([x, y]) => {
      const angle = info === EXERCISE_GUIDES.hammer ? 90 : 0;
      return `<g transform="translate(${x} ${y}) rotate(${angle})" fill="#414a55" stroke="#202832" stroke-width=".8">
        <rect x="-10" y="-2" width="20" height="4" rx="1"/>
        <rect x="-10" y="-7" width="5" height="14" rx="1.5"/><rect x="5" y="-7" width="5" height="14" rx="1.5"/></g>`;
    };
    const wristFingers = info.pose === 'wrist' ? (joints === end ? [108, 53] : [115, 70]) : null;
    const opposite = joints === end ? start : end;
    const stepping = ['walk', 'march', 'jog'].includes(info.pose);
    const secondLeg = info.pose === 'lunge' && joints === end ? leg(hip, [36,120], [20,138])
      : info.pose === 'oneRow' ? leg(hip, [77,100], [110,100])
      : info.pose === 'deadbug' ? leg(hip, [90,72], [125,72])
      : stepping ? leg(hip, opposite[5], opposite[6])
      : info.pose === 'birdDog' ? leg(hip, [95,111], [130,138])
        : front ? leg(hip, mirror(knee), mirror(foot))
          : leg([hip[0]+6,hip[1]], [knee[0]+8,knee[1]], [foot[0]+10,foot[1]]);
    const farArm = info.pose === 'birdDog' ? arm(shoulder, [43,107], [43,138])
      : info.pose === 'oneRow' ? arm(shoulder, [103,79], [112,101])
      : info.pose === 'deadbug' ? arm(shoulder, [39,75], [39,48])
      : stepping ? arm(shoulder, opposite[2], opposite[3])
      : info.pose === 'sidePlank' ? arm(shoulder, [50,44], [55,9])
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
      ${weights ? weight(wristFingers || hand) + (front ? weight(mirror(hand)) : '') : ''}
      <path d="M9 148h149" stroke="#c6cdd2" stroke-width="1"/>`;
  };
  return `<svg class="exercise-technique-svg" viewBox="0 0 ${isHold ? '180' : '380'} 172" aria-hidden="true" focusable="false">
    <defs><linearGradient id="exercise-skin"><stop stop-color="#fafafa"/><stop offset=".48" stop-color="#d9dfe3"/><stop offset="1" stop-color="#9da9b3"/></linearGradient>
      <linearGradient id="exercise-muscle"><stop stop-color="#ee9090"/><stop offset=".5" stop-color="#d65050"/><stop offset="1" stop-color="#a42d36"/></linearGradient></defs>
    <g transform="translate(10 10)">${draw(isHold ? end : start)}</g>
    ${isHold ? '' : `<path d="M181 79h18m-6-6 6 6-6 6" fill="none" stroke="#a42d36" stroke-width="2"/><g transform="translate(210 10)">${draw(end)}</g>`}
  </svg>`;
}
