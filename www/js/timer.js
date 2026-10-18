// timer.js — workout stopwatch + rest countdown with sound/vibration
import { isNative, announce, beep } from './native-bridge.js';
export function formatHMS(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Epoch-based stopwatch: elapsed is always derived from (now - startEpochMs),
// so it stays correct even if the screen locks, the tab is backgrounded, or
// setInterval gets throttled — there is nothing to "catch up" on resume.
export class Stopwatch {
  constructor(onTick) {
    this.onTick = onTick;
    this.startEpochMs = null;
    this.intervalId = null;
  }
  start(startEpochMs) {
    if (this.intervalId !== null) clearInterval(this.intervalId);
    this.startEpochMs = startEpochMs;
    this._tick();
    this.intervalId = setInterval(() => this._tick(), 1000);
  }
  _tick() {
    if (!this.startEpochMs) return;
    this.onTick((Date.now() - this.startEpochMs) / 1000);
  }
  forceTick() { this._tick(); }
  getElapsed() {
    if (!this.startEpochMs) return 0;
    return (Date.now() - this.startEpochMs) / 1000;
  }
  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    const total = this.getElapsed();
    this.startEpochMs = null;
    return total;
  }
}

let audioCtx = null;
export function playBeep() {
  if (isNative()) {
    beep().catch(reportAudioError);
    return;
  }
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    for (let i = 0; i < 3; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.value = 0.2;
      o.connect(g).connect(ctx.destination);
      const t = ctx.currentTime + i * 0.25;
      o.start(t);
      o.stop(t + 0.15);
    }
  } catch (e) { /* audio not available */ }
  if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
}

// Voice announcement via Web Speech API (plays through connected headphones too).
// Must first be triggered from a user gesture (tap) on iOS, otherwise it's silently blocked.
export function speak(text, lang = 'he-IL') {
  if (isNative()) {
    announce(text).catch(reportAudioError);
    return;
  }
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = 1;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch (e) { /* speech not available */ }
}

function reportAudioError(error) {
  console.error('Native audio failed', error);
  window.dispatchEvent(new CustomEvent('autofit-audio-error', { detail: String(error) }));
}

// Call once on a user gesture (e.g. the "start workout" tap) to unlock speech on iOS.
export function primeSpeech() {
  if (isNative()) return;
  try {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch (e) { /* noop */ }
}

export class RestTimer {
  constructor({ onTick, onDone, onInterval, onChange }) {
    this.onTick = onTick;
    this.onDone = onDone;
    this.onInterval = onInterval; // optional: called with elapsed seconds (30, 60, ...) as thresholds are crossed
    this.onChange = onChange;
    this.endAt = null;
    this.totalSeconds = 0;
    this.lastAnnouncedElapsed = 0;
    this.intervalId = null;
  }
  start(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) throw new RangeError('Rest duration must be positive');
    this.stop();
    this.totalSeconds = seconds;
    this.lastAnnouncedElapsed = 0;
    this.endAt = Date.now() + seconds * 1000;
    this.intervalId = setInterval(() => this._tick(), 250);
    this._tick();
    this.onChange?.();
  }
  restore({ endAt, totalSeconds, lastAnnouncedElapsed = 0 }) {
    if (!Number.isFinite(endAt) || !Number.isFinite(totalSeconds) || totalSeconds <= 0) {
      throw new RangeError('Invalid saved rest timer');
    }
    this.stop();
    this.endAt = endAt;
    this.totalSeconds = totalSeconds;
    const elapsed = totalSeconds - (endAt - Date.now()) / 1000;
    this.lastAnnouncedElapsed = Math.max(lastAnnouncedElapsed, Math.floor(elapsed / 30) * 30);
    this.intervalId = setInterval(() => this._tick(), 250);
    this._tick();
    this.onChange?.();
  }
  addSeconds(seconds) {
    if (!this.endAt) return;
    this.endAt += seconds * 1000;
    this.totalSeconds += seconds;
    this._tick();
    this.onChange?.();
  }
  forceTick() { this._tick(); }
  _tick() {
    if (this.endAt === null) return;
    const remaining = (this.endAt - Date.now()) / 1000;
    if (remaining <= 0) {
      this.onTick(0);
      this.stop();
      this.onDone();
      return;
    }
    this._checkIntervalAnnouncement(remaining);
    this.onTick(remaining);
  }
  // Fires onInterval(30), onInterval(60), ... every time 30s of elapsed rest time
  // passes, but never for the final full-duration mark (that's covered by onDone).
  _checkIntervalAnnouncement(remaining) {
    if (!this.onInterval) return;
    const elapsed = this.totalSeconds - remaining;
    const nextThreshold = Math.floor(elapsed / 30) * 30;
    if (elapsed >= nextThreshold && nextThreshold < this.totalSeconds) {
      if (nextThreshold <= this.lastAnnouncedElapsed) return;
      this.lastAnnouncedElapsed = nextThreshold;
      if (elapsed - nextThreshold < 2) this.onInterval(nextThreshold);
    }
  }
  stop() {
    const wasRunning = this.intervalId !== null;
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    this.endAt = null;
    this.totalSeconds = 0;
    this.lastAnnouncedElapsed = 0;
    if (wasRunning) this.onChange?.();
  }
  isRunning() {
    return this.intervalId !== null;
  }
}
