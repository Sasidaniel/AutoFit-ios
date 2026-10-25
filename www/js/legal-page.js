import { legalDocumentHTML } from './legal.js';

const params = new URLSearchParams(location.search);
let language = params.get('lang') === 'en' ? 'en' : 'he';
let kind = params.get('doc') === 'terms' ? 'terms' : 'privacy';
function render() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
  document.getElementById('legalDocument').innerHTML = legalDocumentHTML(kind, language);
  document.querySelectorAll('[data-lang]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.lang === language)));
  document.querySelectorAll('[data-doc]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.doc === kind)));
  history.replaceState(null, '', `?doc=${kind}&lang=${language}`);
}
document.querySelectorAll('[data-lang]').forEach((button) => button.addEventListener('click', () => { language = button.dataset.lang; render(); }));
document.querySelectorAll('[data-doc]').forEach((button) => button.addEventListener('click', () => { kind = button.dataset.doc; render(); }));
render();
