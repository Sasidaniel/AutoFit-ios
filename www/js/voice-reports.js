const SMALL_NUMBERS = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
  'אפס': 0, 'אחת': 1, 'אחד': 1, 'שתיים': 2, 'שניים': 2, 'שתים': 2, 'שנים': 2,
  'שלוש': 3, 'שלושה': 3, 'ארבע': 4, 'ארבעה': 4, 'חמש': 5, 'חמישה': 5,
  'שש': 6, 'שישה': 6, 'שבע': 7, 'שבעה': 7, 'שמונה': 8, 'תשע': 9, 'תשעה': 9,
  'עשר': 10, 'עשרה': 10, 'אחת עשרה': 11, 'אחד עשר': 11, 'שתים עשרה': 12, 'שנים עשר': 12,
  'שתיים עשרה': 12, 'שניים עשר': 12, 'שלוש עשרה': 13, 'שלושה עשר': 13,
  'ארבע עשרה': 14, 'ארבעה עשר': 14, 'חמש עשרה': 15, 'חמישה עשר': 15,
  'שש עשרה': 16, 'שישה עשר': 16, 'שבע עשרה': 17, 'שבעה עשר': 17,
  'שמונה עשרה': 18, 'שמונה עשר': 18, 'תשע עשרה': 19, 'תשעה עשר': 19,
};
const TENS = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  'עשרים': 20, 'שלושים': 30, 'ארבעים': 40, 'חמישים': 50, 'שישים': 60, 'שבעים': 70, 'שמונים': 80, 'תשעים': 90,
};
const HUNDREDS = {
  'מאה': 100, 'מאתיים': 200, 'שלוש מאות': 300, 'ארבע מאות': 400, 'חמש מאות': 500,
  'שש מאות': 600, 'שבע מאות': 700, 'שמונה מאות': 800, 'תשע מאות': 900,
};

function reportNumber(text) {
  const value = text.trim();
  if (/^\d+(?:[.,]\d{1,2})?$/.test(value)) {
    const number = Number(value.replace(',', '.'));
    return Number.isFinite(number) && number <= Number.MAX_SAFE_INTEGER ? number : null;
  }
  if (['חצי', 'half', 'half a'].includes(value)) return 0.5;
  const half = value.match(/^(.+?) (?:וחצי|ו חצי|and a half)$/);
  if (half) {
    const whole = reportNumber(half[1]);
    return Number.isSafeInteger(whole) ? whole + 0.5 : null;
  }
  const decimal = value.match(/^(.+?) (?:נקודה|point) (.+)$/);
  if (decimal) {
    const whole = reportNumber(decimal[1]);
    const tokens = decimal[2].split(' ');
    const fraction = tokens.every((token) => /^\d$/.test(token) || (Object.hasOwn(SMALL_NUMBERS, token) && SMALL_NUMBERS[token] < 10))
      ? tokens.map((token) => /^\d$/.test(token) ? token : String(SMALL_NUMBERS[token])).join('')
      : String(reportNumber(decimal[2]));
    return Number.isSafeInteger(whole) && /^\d{1,2}$/.test(fraction) ? whole + Number(`0.${fraction}`) : null;
  }
  if (Object.hasOwn(SMALL_NUMBERS, value)) return SMALL_NUMBERS[value];
  if (Object.hasOwn(TENS, value)) return TENS[value];
  for (const [word, number] of Object.entries(HUNDREDS)) {
    if (value === word) return number;
    if (!value.startsWith(`${word} `)) continue;
    const remainder = reportNumber(value.slice(word.length + 1).replace(/^ו\s?/, ''));
    return Number.isInteger(remainder) && remainder > 0 && remainder < 100 ? number + remainder : null;
  }
  const hundred = value.match(/^(.+?) hundred(?: (?:and )?(.+))?$/);
  if (hundred) {
    const multiplier = reportNumber(hundred[1]);
    const remainder = hundred[2] ? reportNumber(hundred[2]) : 0;
    return Number.isInteger(multiplier) && multiplier > 0 && multiplier < 10
      && Number.isInteger(remainder) && remainder >= 0 && remainder < 100 ? multiplier * 100 + remainder : null;
  }
  const words = value.split(' ');
  if (words.length === 2 && Object.hasOwn(TENS, words[0])) {
    const unit = words[1].replace(/^ו/, '');
    if (Object.hasOwn(SMALL_NUMBERS, unit) && SMALL_NUMBERS[unit] > 0 && SMALL_NUMBERS[unit] < 10) {
      return TENS[words[0]] + SMALL_NUMBERS[unit];
    }
  }
  return null;
}

function ratingValue(value) {
  if (/^(?:קל(?: מדי)?|(?:too )?easy)$/.test(value)) return 'easy';
  if (/^(?:מתאים|בינוני|medium|moderate|just right)$/.test(value)) return 'right';
  if (/^(?:קשה(?: מדי)?|(?:too )?hard)$/.test(value)) return 'hard';
  return null;
}

export function parseWorkoutVoice(transcript) {
  const text = String(transcript || '').normalize('NFKC').toLowerCase().replace(/\p{M}/gu, '')
    .replace(/["'״׳]/g, '').replace(/(\p{L})-(?=\p{L})/gu, '$1 ')
    .replace(/(\d)(?=\p{L})/gu, '$1 ').replace(/(\p{L})(?=\d)/gu, '$1 ')
    .replace(/,\s+/g, ' ').trim().replace(/[.!]+$/g, '').replace(/\s+/g, ' ').trim();
  if (/^(?:מאשר סיום(?: אימון)?|confirm (?:finish|end)(?: workout)?)$/.test(text)) return { kind: 'confirm-finish' };
  const he = text.match(/^(?:עשיתי|ביצעתי|סיימתי) (?:סט של )?(.+?) חזר(?:ות|ה) (?:עם |במשקל(?: של)? |ב ?|על )(.+?) (קילו(?:גרם)?|קילוגרמים|קג|kg|פאונד|פאונדים|ליברות)(?: (וחצי))?(?: (?:ו?היה|ו?הסט היה) (.+))?$/);
  const en = text.match(/^i (?:just )?(?:did|completed|finished) (?:a set of )?(.+?) (?:reps?|repetitions?) (?:with|at|using) (.+?) (kg|kgs|kilos?|kilograms?|lbs?|pounds?)(?: and (?:it |the set )?(?:was|felt) (.+))?$/);
  if (he || en) {
    const match = he || en;
    const reps = reportNumber(match[1]);
    let weight = reportNumber(match[2]);
    if (he && match[4]) weight = Number.isSafeInteger(weight) ? weight + 0.5 : null;
    const difficultyText = he ? match[5] : match[4];
    const difficulty = difficultyText ? ratingValue(difficultyText) : null;
    if (!Number.isSafeInteger(reps) || reps <= 0 || weight === null || !Number.isFinite(weight)
      || weight < 0 || weight > Number.MAX_SAFE_INTEGER || (difficultyText && !difficulty)) {
      return { kind: 'invalid' };
    }
    return { kind: 'report', reps, weight, unit: /^(?:lb|pound|פאונד|ליבר)/.test(match[3]) ? 'lbs' : 'kg',
      ...(difficulty ? { difficulty } : {}) };
  }
  const rating = text.match(/^(?:(?:ה?סט(?: האחרון)? היה|היה|זה היה) |(?:the |that |my )?(?:last )?set (?:was|felt) |(?:it |that )(?:was|felt) )?(.+)$/);
  const difficulty = rating && ratingValue(rating[1]);
  if (difficulty) return { kind: 'difficulty', difficulty };
  const restHe = text.match(/^(?:תוסיף|הוסף|תוסיפי|הוסיפי|תן לי עוד|עוד) (?:למנוחה )?(.+?) (שניות|שנייה|דקות|דקה)(?: (?:למנוחה|מנוחה|לזמן המנוחה))?$/);
  const restEn = text.match(/^(?:add|give me) (?:another )?(.+?) (seconds?|secs?|minutes?|mins?)(?: (?:of |to (?:the )?)?rest)?$/);
  if (restHe || restEn) {
    const match = restHe || restEn;
    const amount = reportNumber(match[1]);
    const seconds = amount === null ? null : amount * (/^(?:דק|min)/.test(match[2]) ? 60 : 1);
    return seconds !== null && Number.isFinite(seconds) && seconds > 0 ? { kind: 'rest', seconds } : { kind: 'invalid' };
  }
  // A partial or qualified report must not be reduced to a smaller valid command.
  if (/(?:עשיתי|ביצעתי|סיימתי|i (?:just )?(?:did|completed|finished))/.test(text)
    && /(?:חזר(?:ות|ה)|\breps?\b|\brepetitions?\b)/.test(text)) return { kind: 'invalid' };
  return null;
}

export function voiceReportHints(language) {
  return language === 'en' ? [
    'I did twelve reps with forty kilograms', 'The set was hard', 'It was medium',
    'Add half a minute of rest', 'Confirm finish', 'Undo',
  ] : [
    'עשיתי שתים עשרה חזרות עם ארבעים קילו', 'הסט היה קשה', 'היה בינוני',
    'תוסיף חצי דקה מנוחה', 'מאשר סיום', 'בטל',
  ];
}
