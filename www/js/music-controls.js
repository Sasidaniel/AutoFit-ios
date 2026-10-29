import * as i18n from './i18n.js';

export function createMusicControls(api, doc = document) {
  const buttons = [...doc.querySelectorAll('[data-music-toggle]')];
  const hints = [...doc.querySelectorAll('[data-music-status]')];
  let state = null;
  let busy = false;
  let error = '';
  let revision = 0;
  const t = i18n.text;
  const permissionHint = 'כדי לשלוט ב-Apple Music, אפשר את ההרשאה בהגדרות האייפון. ההאזנה והאימון זמינים גם בלעדיה.';
  function render() {
    const authorized = state?.authorization === 'authorized';
    const label = busy ? 'ממתין ל-Apple Music'
      : state && ['notDetermined', 'denied', 'restricted'].includes(state.authorization) ? 'אפשר Apple Music'
        : authorized && state.state === 'playing' ? 'עצור מוזיקה' : 'נגן מוזיקה';
    for (const button of buttons) {
      button.textContent = t(label);
      button.disabled = busy;
      button.setAttribute('aria-label', `${t(label)} — Apple Music`);
      button.setAttribute('aria-busy', String(busy));
    }
    const hint = error || (['denied', 'restricted'].includes(state?.authorization) ? permissionHint
      : state?.state === 'interrupted' ? 'Apple Music מושהה עקב הפרעה. אפשר לבדוק שוב לאחר סיומה.'
        : 'שליטה ב-Apple Music בלבד. בחר קודם שיר או רשימה בנגן. אין שינוי בתור הניגון.');
    for (const node of hints) node.textContent = t(hint);
  }
  function receive(next) {
    if (!next || !['authorized', 'notDetermined', 'denied', 'restricted', 'unknown'].includes(next.authorization)
      || !['playing', 'paused', 'stopped', 'interrupted', 'seeking', 'unknown', 'unavailable'].includes(next.state)) {
      throw new Error('Invalid Apple Music status');
    }
    state = next;
    render();
  }
  function report(cause) {
    console.error('Apple Music control failed', cause);
    state = { authorization: state?.authorization || 'unknown', state: 'unknown' };
    error = 'לא התקבל אישור מ-Apple Music. אפשר לנסות שוב או להמשיך דרך הנגן.';
    render();
    api.toast(error);
  }
  async function refresh() {
    if (!api.native.isNative() || busy) return;
    const request = ++revision;
    try {
      const next = await api.native.musicStatus();
      if (request !== revision) return;
      error = '';
      receive(next);
    } catch (cause) {
      if (request === revision) report(cause);
    }
  }
  async function toggle() {
    if (busy) return;
    const playing = state?.state !== 'playing';
    busy = true;
    ++revision;
    error = '';
    render();
    try {
      if (!state || state.authorization === 'unknown') {
        const request = ++revision;
        const next = await api.native.musicStatus();
        if (request === revision) receive(next);
      }
      if (state.authorization === 'notDetermined') {
        receive(await api.native.musicRequestAuthorization());
      } else if (state.authorization !== 'authorized') {
        error = permissionHint;
        api.toast(error);
      } else {
        const request = ++revision;
        const next = await api.setPlayback(playing);
        if (request === revision) receive(next);
        if (playing ? next.state !== 'playing' : !['paused', 'stopped'].includes(next.state)) {
          throw new Error('Apple Music did not confirm the playback action');
        }
      }
    } catch (cause) {
      report(cause);
    } finally {
      busy = false;
      render();
    }
  }
  if (api.native.isNative()) {
    doc.querySelectorAll('[data-music-controls]').forEach((node) => node.classList.remove('hidden'));
    buttons.forEach((button) => button.addEventListener('click', toggle));
    try {
      Promise.resolve(api.native.onMusicChanged((next) => {
        ++revision;
        if (next?.authorization === 'authorized' && ['playing', 'paused'].includes(next.state)) error = '';
        try { receive(next); } catch (cause) { report(cause); }
      })).catch(report);
    } catch (cause) { report(cause); }
    doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible') refresh(); });
    refresh();
  }
  return { refresh, render };
}
