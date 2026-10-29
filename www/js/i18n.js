import { EN } from './translations-en.js';
import { HE_FEMALE } from './translations-he-female.js';
import { SEED_EXERCISES } from './seed.js';
import { LIBRARY_EXERCISES, PLANNING_EXERCISES } from './exercise-library.js';

let language = 'he';
let gender = 'male';
let observer;
const originals = new WeakMap();
const inputs = new WeakMap();
const feminineSources = new Map();
const attributes = ['title', 'placeholder', 'aria-label', 'aria-valuetext', 'alt'];
function translationPatterns(dictionary) {
  return Object.entries(dictionary).filter(([key]) => /\{\d+\}/.test(key))
  .sort(([a], [b]) => b.replace(/\{\d+\}/g, '').length - a.replace(/\{\d+\}/g, '').length)
  .map(([key, value]) => {
  const slots = [];
  const escaped = key.split(/(\{\d+\})/).map((part) => {
    if (/^\{\d+\}$/.test(part)) {
      slots.push(part);
      return '(.*?)';
    }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('');
  return { regex: new RegExp(`^${escaped}$`, 'su'), value, slots };
});
}
const patterns = translationPatterns(EN);
const femininePatterns = translationPatterns(HE_FEMALE);

export function getLanguage() { return language; }
export function getGender() { return gender; }
export function locale() { return language === 'en' ? 'en-US' : 'he-IL'; }
export function searchText(value) { return Object.hasOwn(EN, value) ? EN[value] : value; }
export function exerciseName(value) {
  return [...SEED_EXERCISES, ...LIBRARY_EXERCISES, ...PLANNING_EXERCISES].some((exercise) => exercise.name === value) ? translateText(value, false) : value;
}
export function exerciseNotes(value) {
  return [...SEED_EXERCISES, ...LIBRARY_EXERCISES, ...PLANNING_EXERCISES].some((exercise) => exercise.notes === value || exercise.pace === value) ? text(value) : value;
}
export function localizeInput(input, value, kind = 'text') {
  const format = kind === 'name' ? exerciseName : kind === 'notes' ? exerciseNotes : text;
  const translated = format(value);
  inputs.set(input, { source: value, last: translated, format });
  input.setAttribute('data-localized-input', '');
  input.value = translated;
}
export function inputValue(input) {
  const original = inputs.get(input);
  return original && input.value === original.last ? original.source : input.value;
}

export function text(value) {
  return translateText(value, true);
}

function translateText(value, personalize) {
  const raw = String(value ?? '');
  const source = personalize ? feminineSources.get(raw) ?? raw : raw;
  const dictionary = language === 'en' ? EN : personalize && gender === 'female' ? HE_FEMALE : null;
  if (!dictionary || !/[\u0590-\u05ff]/.test(source)) return source;
  const trimmed = source.trim();
  let translated = dictionary[trimmed];
  if (translated === undefined) {
    for (const pattern of dictionary === EN ? patterns : femininePatterns) {
      const match = trimmed.match(pattern.regex);
      if (!match) continue;
      translated = pattern.value.replace(/\{\d+\}/g, (slot) => {
        const index = pattern.slots.indexOf(slot);
        return index < 0 ? slot : dictionary === EN ? translateText(match[index + 1], personalize) : match[index + 1];
      });
      break;
    }
  }
  if (translated === undefined) {
    const decorated = trimmed.match(/^([^\p{L}\p{N}]+)([\s\S]*)$/u);
    if (decorated && decorated[2]) {
      const result = translateText(decorated[2], personalize);
      if (result !== decorated[2]) translated = decorated[1] + result;
    }
    if (translated === undefined) {
      const suffix = trimmed.match(/^([\s\S]*?)([^\p{L}\p{N}]+)$/u);
      if (suffix && suffix[1]) {
        const result = translateText(suffix[1], personalize);
        if (result !== suffix[1]) translated = result + suffix[2];
      }
    }
  }
  const result = translated === undefined ? source : source.replace(trimmed, translated);
  if (dictionary === HE_FEMALE && result !== source) feminineSources.set(result, source);
  return result;
}

function translateValue(node, key, value, write) {
  let saved = originals.get(node);
  if (!saved) { saved = new Map(); originals.set(node, saved); }
  let record = saved.get(key);
  if (!record || value !== record.last) record = { source: feminineSources.get(value) ?? value, last: value };
  const result = text(record.source);
  record.last = result;
  saved.set(key, record);
  if (result !== value) write(result);
}

export function translateDOM(root = document.body) {
  if (!root) return;
  if (root.nodeType === 3) {
    if (!root.parentElement?.closest('script,style,textarea,[data-no-translate]')) {
      translateValue(root, 'text', root.nodeValue, (value) => { root.nodeValue = value; });
    }
    return;
  }
  if (root.nodeType !== 1 || root.matches('script,style,textarea,[data-no-translate]')) return;
  for (const attribute of attributes) {
    if (root.hasAttribute(attribute)) {
      translateValue(root, attribute, root.getAttribute(attribute), (value) => root.setAttribute(attribute, value));
    }
  }
  for (const child of root.childNodes) translateDOM(child);
}

function refreshLocalizedDOM() {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-language]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.language === language));
    });
    document.querySelectorAll('[data-exercise-name]').forEach((node) => {
      node.textContent = exerciseName(node.dataset.exerciseName);
    });
    document.querySelectorAll('[data-exercise-notes]').forEach((node) => {
      node.textContent = exerciseNotes(node.dataset.exerciseNotes);
    });
    document.querySelectorAll('[data-localized-input]').forEach((input) => {
      const original = inputs.get(input);
      if (original && input.value === original.last) {
        original.last = original.format(original.source);
        input.value = original.last;
      }
    });
    translateDOM();
  }
}

export function setLanguage(value) {
  if (!['he', 'en'].includes(value)) throw new Error(`Unsupported language: ${value}`);
  language = value;
  refreshLocalizedDOM();
}

export function setGender(value = 'male') {
  if (!['general', 'male', 'female'].includes(value)) throw new Error(`Unsupported gender: ${value}`);
  gender = value;
  refreshLocalizedDOM();
}

export function start(value, profileGender = 'male') {
  setGender(profileGender);
  setLanguage(value);
  if (observer || typeof MutationObserver === 'undefined') return;
  observer = new MutationObserver((changes) => {
    const roots = new Set();
    for (const change of changes) {
      if (change.type === 'childList') change.addedNodes.forEach((node) => roots.add(node));
      else roots.add(change.target);
    }
    roots.forEach((root) => translateDOM(root));
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: attributes });
}

const commands = [
  ['cancel workout', 'בטל אימון'], ['finish workout', 'סיים אימון'], ['end workout', 'סיים אימון'],
  ['start workout', 'התחל אימון'], ['start set', 'התחל סט'], ['set completed', 'סט הושלם'],
  ['start the workout', 'התחל אימון'], ['finish the workout', 'סיים אימון'], ['cancel the workout', 'בטל אימון'],
  ['set finished', 'סט הושלם'], ['finish set', 'סט הושלם'], ['complete set', 'סט הושלם'],
  ['start exercise', 'התחל תרגיל'], ['stop exercise', 'עצור תרגיל'], ['pause exercise', 'השהה תרגיל'],
  ['set complete', 'סט הושלם'], ['set done', 'סט הושלם'], ['skip rest', 'דלג על מנוחה'],
  ['rest finished', 'זמן מנוחה הסתיים'], ['next exercise', 'תרגיל הבא'], ['i am done', 'סיימתי'],
  ['warm up', 'חימום'], ['warmup', 'חימום'], ['cool down', 'שחרור'], ['cooldown', 'שחרור'],
  ['start', 'התחל'], ['stop', 'עצור'], ['pause', 'השהה'], ['done', 'סיימתי'], ['undo', 'בטל'],
];
const numbers = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];

export function canonicalVoice(value) {
  let result = String(value).toLowerCase().replace(/[.,!?]/g, ' ')
    .replace(/\bwarm-up\b/g, 'warmup').replace(/\bcool-down\b/g, 'cooldown');
  for (const [english, hebrew] of commands) {
    result = result.replace(new RegExp(`\\b${english}\\b`, 'g'), hebrew);
  }
  const feminineCommands = new Map([
    ['התחילי', 'התחל'], ['סיימי', 'סיים'], ['בטלי', 'בטל'], ['עצרי', 'עצור'],
    ['השהי', 'השהה'], ['המשיכי', 'המשך'], ['דלגי', 'דלג'], ['מאשרת', 'מאשר'],
    ['תוסיפי', 'תוסיף'], ['הוסיפי', 'הוסף'], ['הפעילי', 'הפעל'], ['בחרי', 'בחר'],
    ['הקשיבי', 'הקשב'], ['תקשיבי', 'תקשיב'], ['חזרי', 'חזור'],
  ]);
  result = result.replace(/(^|\s)(התחילי|סיימי|בטלי|עצרי|השהי|המשיכי|דלגי|מאשרת|תוסיפי|הוסיפי|הפעילי|בחרי|הקשיבי|תקשיבי|חזרי)(?=\s|$)/gu,
    (_, before, word) => before + feminineCommands.get(word));
  result = result.replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[\s-]+(one|two|three|four|five|six|seven|eight|nine))?\b/g,
    (_, tens, units) => String((['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'].indexOf(tens) + 2) * 10 + (units ? numbers.indexOf(units) : 0)));
  return result.replace(new RegExp(`\\b(${numbers.join('|')})\\b`, 'g'), (word) => String(numbers.indexOf(word)));
}
