import * as i18n from './i18n.js';
import * as native from './native-bridge.js';
import { commercialReadiness } from './commercial-config.js';
import { hasCurrentConsent } from './legal.js';

const t = (value) => i18n.text(value);
const escape = (value) => String(value).replace(/[&<>"']/g, (char) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function validPeriod(period) {
  return period && ['day', 'week', 'month', 'year'].includes(period.unit)
    && Number.isInteger(period.value) && period.value > 0 && period.value <= 365;
}

export function validateCommerceStatus(value) {
  if (!value || typeof value !== 'object' || typeof value.configured !== 'boolean'
    || typeof value.enabled !== 'boolean' || typeof value.verified !== 'boolean'
    || typeof value.canMakePayments !== 'boolean' || !Array.isArray(value.products)
    || !Array.isArray(value.entitlements)) throw new Error('Invalid Apple subscription status');
  if (!value.configured) {
    if (value.enabled || value.verified || value.products.length || value.entitlements.length) throw new Error('Unconfigured subscriptions cannot grant access');
    return value;
  }
  if (!value.verified || !value.products.length || value.products.length > 2
    || typeof value.policyVersion !== 'string'
    || value.enabled && (!value.policyVersion || /draft/i.test(value.policyVersion))
    || new Set(value.products.map((product) => product?.id)).size !== value.products.length) throw new Error('Apple subscription verification is incomplete');
  for (const product of value.products) {
    if (!product || typeof product.id !== 'string' || !product.id || product.id.length > 200
      || typeof product.name !== 'string' || !product.name
      || typeof product.price !== 'string' || !product.price || !validPeriod(product.period)
      || product.freeTrial && (!validPeriod(product.freeTrial.period)
        || !Number.isInteger(product.freeTrial.periodCount) || product.freeTrial.periodCount < 1)) {
      throw new Error('Invalid Apple subscription product');
    }
  }
  if (value.entitlements.some((item) => !item || !value.products.some((product) => product.id === item.productID)
    || item.expirationMillis !== undefined && (!Number.isFinite(item.expirationMillis) || item.expirationMillis <= 0))) {
    throw new Error('Invalid Apple subscription entitlement');
  }
  return value;
}

export function purchaseAllowed(status, settings, readiness = commercialReadiness()) {
  return readiness.ready === true && hasCurrentConsent(settings) && status?.configured === true
    && status.verified === true && status.enabled === true && status.canMakePayments === true
    && settings.legalConsent.documentStatus === 'published'
    && settings.legalConsent.version === status.policyVersion;
}

export function purchaseOutcome(value, productID) {
  if (value?.state === 'cancelled' || value?.state === 'pending') return { state: value.state };
  if (value?.state !== 'verified') throw new Error('Unknown Apple purchase outcome');
  const status = validateCommerceStatus(value.status);
  if (!status.configured || !status.verified) throw new Error('Apple entitlement has not been verified');
  return { state: status.entitlements.some((item) => item.productID === productID) ? 'entitled' : 'awaiting-entitlement', status };
}

export function createCommerceUI(api) {
  const root = document.getElementById('subscriptionCard');
  let status = null;
  let busy = false;
  let refreshPromise = null;
  let message = '';
  let waitingProduct = '';
  let failed = false;

  const periodText = (period) => period.value === 1
    ? t({ day: 'יום', week: 'שבוע', month: 'חודש', year: 'שנה' }[period.unit])
    : `${period.value} ${t({ day: 'ימים', week: 'שבועות', month: 'חודשים', year: 'שנים' }[period.unit])}`;

  function render() {
    root.hidden = !native.isNative() || (!status?.configured && !failed);
    if (root.hidden) {
      root.innerHTML = '';
      return;
    }
    const current = document.activeElement?.closest?.('[data-commerce-action]');
    const focusKey = current && root.contains(current) ? current.dataset.commerceAction : '';
    const ready = purchaseAllowed(status, api.getSettings());
    const owns = !!status?.configured && status.entitlements.length > 0;
    const canBuy = ready && !busy && !waitingProduct && !owns && !failed;
    root.innerHTML = `<h3>${t('מינויים')}</h3>
      ${status?.configured ? `<p>${t('המנוי מתחדש אוטומטית לפי התנאים במסך האישור של Apple.')}</p>` : ''}
      <p class="commerce-status" role="status" aria-live="polite">${escape(message || t(
        owns ? 'Apple אימתה זכאות פעילה למנוי במכשיר הזה.' : 'לא נמצאה זכאות פעילה בבדיקת Apple הנוכחית.'))}</p>
      ${status?.configured ? status.products.map((product) => `<section class="training-advice">
        <strong data-no-translate>${escape(product.name)}</strong>
        <p data-no-translate>${escape(product.price)} / ${escape(periodText(product.period))}</p>
        ${product.freeTrial ? `<p>${t('ניסיון חינם ש-Apple מציעה לחשבון הזה')}: <span data-no-translate>${escape(periodText({
          ...product.freeTrial.period, value: product.freeTrial.period.value * product.freeTrial.periodCount,
        }))}</span></p>` : `<p>${t('לא הוצעה זכאות לניסיון חינם בבדיקת Apple הנוכחית.')}</p>`}
        ${canBuy ? `<button type="button" class="btn btn-primary" data-commerce-action="buy:${escape(product.id)}">${t('רכישה באישור Apple')}</button>` : ''}
      </section>`).join('') : ''}
      ${status?.configured && !ready ? `<p class="field-hint">${t('רכישות חסומות עד אישור מסחרי, מסמכים סופיים והגדרת מוצרי Apple. שחזור וניהול של רכישה קיימת אינם מחייבים רכישה חדשה.')}</p>` : ''}
      <div class="training-actions">
        ${native.isNative() ? `<button type="button" class="btn btn-secondary" data-commerce-action="refresh" ${busy ? 'disabled' : ''}>${t('בדיקת מצב ב-Apple')}</button>
          ${status?.configured ? `<button type="button" class="btn btn-secondary" data-commerce-action="restore" ${busy ? 'disabled' : ''}>${t('שחזור רכישות Apple')}</button>` : ''}
          ${owns ? `<button type="button" class="btn btn-secondary" data-commerce-action="manage" ${busy ? 'disabled' : ''}>${t('ניהול וביטול מנוי ב-Apple')}</button>` : ''}` : ''}
        <button type="button" class="btn btn-secondary" data-commerce-action="terms">${t('קריאת תנאי השימוש')}</button>
        <button type="button" class="btn btn-secondary" data-commerce-action="privacy">${t('קריאת מדיניות הפרטיות')}</button>
      </div>`;
    root.querySelectorAll('[data-commerce-action]').forEach((button) => button.addEventListener('click', () => {
      const action = button.dataset.commerceAction;
      if (action === 'privacy' || action === 'terms') api.openDocument(action);
      else if (action === 'refresh') refresh();
      else execute(action);
    }));
    if (focusKey) [...root.querySelectorAll('[data-commerce-action]')].find((button) => button.dataset.commerceAction === focusKey)?.focus();
  }

  async function readStatus() {
    const next = validateCommerceStatus(await native.commerceStatus());
    if (!api.isReady()) return;
    status = next;
    failed = false;
    if (waitingProduct && next.entitlements.some((item) => item.productID === waitingProduct)) waitingProduct = '';
    return next;
  }

  function refresh() {
    if (!native.isNative() || !api.isReady()) { render(); return Promise.resolve(); }
    if (refreshPromise) return refreshPromise;
    refreshPromise = (async () => {
      try {
        await readStatus();
        message = waitingProduct ? t('הזכאות עדיין לא אושרה. אין לרכוש שוב; אפשר לרענן או לשחזר רכישות.') : '';
      } catch (error) {
        console.error('Apple subscription status failed', error);
        failed = true;
        message = t('לא ניתן לאמת את מצב המנוי כרגע. אין כאן אישור רכישה או קביעה שמנוי קיים בוטל. אפשר לנסות בדיקת מצב שוב.');
      } finally {
        refreshPromise = null;
        if (api.isReady()) render();
      }
    })();
    return refreshPromise;
  }

  async function execute(action) {
    if (busy || !api.isReady()) return;
    busy = true;
    render();
    try {
      if (action === 'manage') await native.commerceManage();
      else if (action === 'restore') {
        status = validateCommerceStatus(await native.commerceRestore());
        failed = false;
        if (waitingProduct && status.entitlements.some((item) => item.productID === waitingProduct)) waitingProduct = '';
        message = t(status.entitlements.length ? 'Apple אימתה זכאות פעילה למנוי במכשיר הזה.' : 'השחזור הסתיים ללא זכאות פעילה בבדיקת Apple הנוכחית. לא בוצעה רכישה חדשה.');
      } else if (action.startsWith('buy:')) {
        const id = action.slice(4);
        if (failed || waitingProduct || !purchaseAllowed(status, api.getSettings())
          || status.entitlements.length || !status.products.some((product) => product.id === id)) throw new Error('Purchases are disabled');
        const result = purchaseOutcome(await native.commercePurchase({ productID: id,
          policyVersion: api.getSettings().legalConsent.version }), id);
        if (result.status) status = result.status;
        waitingProduct = ['pending', 'awaiting-entitlement'].includes(result.state) ? id : '';
        message = t({
          cancelled: 'הרכישה בוטלה במסך Apple. לא הוענקה זכאות חדשה.',
          pending: 'הרכישה ממתינה לאישור Apple. טרם הוענקה זכאות; אין לרכוש שוב בזמן ההמתנה.',
          'awaiting-entitlement': 'העסקה חזרה מ-Apple, אך הזכאות עדיין לא אושרה. אין לרכוש שוב; רענן מצב או שחזר רכישות.',
          entitled: 'Apple אימתה זכאות פעילה למנוי במכשיר הזה.',
        }[result.state]);
      } else throw new Error('Unknown commerce action');
    } catch (error) {
      console.error('Apple subscription action failed', error);
      failed = true;
      message = t('הפעולה לא הושלמה או לא אומתה. אין להסיק מכך אם בוצע חיוב; בדוק את הרכישות ב-Apple ונסה בדיקת מצב או שחזור לפני רכישה נוספת.');
    } finally {
      busy = false;
      if (api.isReady()) render();
    }
  }

  if (native.isNative()) native.onCommerceChanged?.(() => {
    if (api.isReady() && !busy) refresh();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && api.isReady() && !busy) refresh();
  });
  render();
  return { refresh, render };
}
