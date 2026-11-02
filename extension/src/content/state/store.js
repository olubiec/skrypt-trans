/*
 * Trwały stan w chrome.storage.local: ustawienia, kolejka, plan odświeżania i statystyki.
 * Uprawnienie manifestu: tylko "storage". Stan środowiskowy (flagi działania) nie jest zapisywany.
 */
(function () {
  'use strict';
  const T = (globalThis.__trc ||= {});

  const DEFAULTS = Object.freeze({
    settings: Object.freeze({
      dryRun: true,            // domyślnie tryb próbny: nic nie publikuje, dopóki nie wyłączysz
      defaultReply: '',        // szablon ODPIS dla tras bez własnego ODPIS
      maxTras: 20,
      pacingMinSec: 8,
      pacingMaxSec: 20,
      refreshMinMin: 20,
      refreshMaxMin: 40
    }),
    queue: Object.freeze([]),
    sched: Object.freeze({ autoEnabled: true, nextRunAt: null }),
    stats: Object.freeze({ added: 0, dry: 0, errors: 0, sessions: [] })
  });

  // Flagi działania modułów. Używane do wzajemnego wykluczania dodawarki i odświeżania.
  const rt = { refreshRunning: false, addRunning: false };

  async function load() {
    const raw = await chrome.storage.local.get(Object.keys(DEFAULTS));
    return {
      settings: { ...DEFAULTS.settings, ...(raw.settings || {}) },
      queue: Array.isArray(raw.queue) ? raw.queue : [],
      sched: { ...DEFAULTS.sched, ...(raw.sched || {}) },
      stats: { ...DEFAULTS.stats, ...(raw.stats || {}) }
    };
  }

  async function save(patch) {
    await chrome.storage.local.set(patch);
  }

  T.rt = rt;
  T.store = Object.freeze({ DEFAULTS, load, save });
})();
