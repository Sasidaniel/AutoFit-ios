import * as i18n from './i18n.js';

const ages = Array.from({ length: 109 }, (_, index) => String(index + 12));
const heights = Array.from({ length: 201 }, (_, index) => String(index + 50));
const kilograms = Array.from({ length: 191 }, (_, index) => String(index + 10));
const fractions = Array.from({ length: 10 }, (_, index) => index ? `0.${index}` : '0');
const genders = { general: 'כללי (לשון זכר)', male: 'זכר', female: 'נקבה' };

function options(select, values, current, label = (value) => value, optional = true, placeholder = 'לא נבחר (לא חובה)') {
  const items = optional ? [['', placeholder]] : [];
  items.push(...values.map((value) => [value, label(value)]));
  if (current !== '' && !values.includes(current)) {
    items.push([current, `${label(current)} (הערך השמור)`]);
  }
  select.replaceChildren(...items.map(([value, text]) => {
    const option = select.ownerDocument.createElement('option');
    option.value = value;
    option.textContent = text;
    return option;
  }));
  select.value = current;
  i18n.translateDOM(select);
}

export function renderProfileFields(prefix, profile, root = document) {
  const gender = root.getElementById(`${prefix}Gender`);
  options(gender, Object.keys(genders), profile.gender || '', (value) => genders[value], true, 'בחר מין מהרשימה.');
  gender.options[0].disabled = true;
  if (prefix === 'ob') gender.onchange = () => {
    if (gender.value) i18n.setGender(readProfileGender(prefix, root));
  };
  options(root.getElementById(`${prefix}Age`), ages, String(profile.age ?? ''));
  options(root.getElementById(`${prefix}Height`), heights, String(profile.heightCm ?? ''));
  const weight = root.getElementById(`${prefix}Weight`);
  const whole = root.getElementById(`${prefix}WeightWhole`);
  const fraction = root.getElementById(`${prefix}WeightFraction`);
  const saved = String(profile.weightKg ?? '');
  const parts = saved.match(/^(\d+)(?:\.(\d+))?$/);
  const decimals = parts?.[2]?.replace(/0+$/, '') || '';
  options(whole, kilograms, parts ? String(Number(parts[1])) : saved);
  for (const option of whole.options) {
    if (Number(option.value) > 200) option.disabled = true;
  }
  options(fraction, fractions, decimals ? `0.${decimals}` : '0',
    (value) => `.${value.split('.')[1] || '0'}`, false);
  weight.value = saved;
  fraction.disabled = !parts || Number(parts[1]) >= 200;
  const update = () => {
    if (!whole.value) {
      weight.value = '';
      fraction.value = '0';
      fraction.disabled = true;
    } else if (/^\d+$/.test(whole.value)) {
      fraction.disabled = Number(whole.value) >= 200;
      if (fraction.disabled) fraction.value = '0';
      weight.value = whole.value + (fraction.value === '0' ? '' : `.${fraction.value.slice(2)}`);
    }
  };
  whole.onchange = update;
  fraction.onchange = update;
}

export function readProfileGender(prefix, root = document) {
  const value = root.getElementById(`${prefix}Gender`).value;
  if (!Object.hasOwn(genders, value)) throw new Error('בחר מין מהרשימה.');
  return value;
}
