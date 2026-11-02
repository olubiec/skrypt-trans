/*
 * Odświeżanie w tle: plan wznowienia (losowo między refreshMinMin a refreshMaxMin),
 * licznik sesji i zapis statystyk. Plan jest w storage, więc przeżywa przeładowanie strony.
 * Gdy dodawarka działa, start odświeżania przesuwa się o 2 minuty (wzajemne wykluczanie).
 */
(function () {
  'use strict';
  const T = globalThis.__trc;
  const POSTPONE_MS = 2 * 60 * 1000;
  const SESSIONS_KEEP = 30;

  let autoEnabled = true;
  let nextRunAt = null;
  let sessionStart = 0;
  let sessionCount = 0;
  let timer = null;
  const listeners = [];

  function notify() {
    const snap = {
      running: T.rt.refreshRunning,
      count: sessionCount,
      elapsedSec: sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : 0,
      nextInSec: nextRunAt && autoEnabled && !T.rt.refreshRunning ? Math.max(0, Math.ceil((nextRunAt - Date.now()) / 1000)) : null,
      auto: autoEnabled
    };
    for (const fn of listeners) fn(snap);
  }

  async function persistSched() {
    await T.store.save({ sched: { autoEnabled, nextRunAt } });
  }

  async function scheduleNext(delayMs) {
    const { settings } = await T.store.load();
    const minMs = settings.refreshMinMin * 60000;
    const maxMs = Math.max(minMs, settings.refreshMaxMin * 60000);
    const delay = delayMs ?? minMs + Math.random() * (maxMs - minMs);
    nextRunAt = Date.now() + delay;
    await persistSched();
    notify();
  }

  async function startRefresh(reason) {
    if (T.rt.refreshRunning) return;
    if (T.rt.addRunning) {
      T.ui.log('Odświeżanie czeka: trwa dodawanie. Ponowię za 2 min.', 'info');
      await scheduleNext(POSTPONE_MS);
      return;
    }
    try {
      await T.bus.request('refresh.start', null, { timeout: 5000 });
      T.rt.refreshRunning = true;
      sessionStart = Date.now();
      sessionCount = 0;
      nextRunAt = null;
      await persistSched();
      T.ui.log(reason === 'auto' ? '--- Start sesji odświeżania (automatycznie) ---' : '--- Start sesji odświeżania ---', 'working');
      notify();
    } catch (err) {
      T.ui.log(`Nie udało się uruchomić odświeżania: ${err.message}`, 'err');
      if (autoEnabled) await scheduleNext(POSTPONE_MS);
    }
  }

  async function recordSession(done, reason) {
    const elapsed = sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : 0;
    const st = await T.store.load();
    const entry = { at: new Date().toISOString(), count: done, elapsedSec: elapsed, reason };
    const sessions = [...st.stats.sessions, entry].slice(-SESSIONS_KEEP);
    await T.store.save({ stats: { ...st.stats, sessions } });
  }

  function tick() {
    if (T.rt.refreshRunning) {
      notify();
      return;
    }
    if (autoEnabled && nextRunAt && Date.now() >= nextRunAt) {
      startRefresh('auto');
      return;
    }
    notify();
  }

  async function setAuto(enabled) {
    autoEnabled = !!enabled;
    if (autoEnabled && !T.rt.refreshRunning) await scheduleNext();
    if (!autoEnabled) nextRunAt = null;
    await persistSched();
    notify();
  }

  async function stop() {
    if (!T.rt.refreshRunning) return;
    try {
      await T.bus.request('refresh.stop', null, { timeout: 3000 });
    } catch (err) {
      T.ui.log(`Nie udało się zatrzymać odświeżania: ${err.message}`, 'err');
    }
  }

  T.bus.onEvent((type, payload) => {
    if (type === 'refresh.progress' && payload) {
      sessionCount = payload.done;
      if (payload.status === 'ok' || payload.status === 'working') T.ui.log(payload.text, payload.status);
      notify();
    } else if (type === 'refresh.error' && payload) {
      T.ui.log(`Odświeżanie: pominięto błąd (${payload.ctx}): ${payload.msg}`, 'warn');
    } else if (type === 'refresh.done') {
      T.rt.refreshRunning = false;
      const done = payload ? payload.done : sessionCount;
      const reason = payload ? payload.reason : 'nieznany';
      T.ui.log(`--- Koniec sesji: ${done} odświeżeń (${reason}) ---`, 'ok');
      recordSession(done, reason).catch((err) => T.ui.log(`Nie zapisano statystyk: ${err.message}`, 'err'));
      sessionCount = done;
      if (autoEnabled) {
        scheduleNext().catch((err) => T.ui.log(`Nie zaplanowano wznowienia: ${err.message}`, 'err'));
      } else {
        nextRunAt = null;
        persistSched().catch((err) => T.ui.log(`Nie zapisano planu: ${err.message}`, 'err'));
        notify();
      }
    }
  });

  async function init() {
    const st = await T.store.load();
    autoEnabled = st.sched.autoEnabled;
    nextRunAt = st.sched.nextRunAt;
    if (autoEnabled && !nextRunAt) await scheduleNext();
    timer = setInterval(tick, 1000);
    notify();
  }

  function destroy() {
    if (timer) clearInterval(timer);
    timer = null;
    listeners.length = 0;
  }

  T.scheduler = Object.freeze({
    init,
    destroy,
    setAuto,
    start: () => startRefresh('manual'),
    stop,
    subscribe(fn) { listeners.push(fn); }
  });
})();
