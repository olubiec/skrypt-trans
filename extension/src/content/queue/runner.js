/*
 * Silnik dodawania: bierze kolejne pozycje, wysyła je do świata strony i obsługuje wynik.
 *  - 1 ponowienie po wyczyszczeniu formularza, potem status blad i dalej.
 *  - Po niepotwierdzonej publikacji nie ponawiamy (ryzyko duplikatu).
 *  - Stop przerywa oczekiwanie (AbortController) i wysyła add.abort do strony.
 *  - Czeka na koniec odświeżania, nie działa równolegle z nim.
 */
(function () {
  'use strict';
  const T = globalThis.__trc;
  const PUBLISH_TIMEOUT_MS = 240000;

  let running = false;
  let controller = null;
  let currentId = null;
  let publishingId = null;
  const listeners = [];

  function abortErr() {
    const e = new Error('przerwano');
    e.aborted = true;
    return e;
  }

  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(abortErr());
      const onAbort = () => {
        clearTimeout(t);
        reject(abortErr());
      };
      const t = setTimeout(() => {
        signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  function notify() {
    for (const fn of listeners) fn(running);
  }

  async function bump(key) {
    const st = await T.store.load();
    const stats = { ...st.stats, [key]: (st.stats[key] || 0) + 1 };
    await T.store.save({ stats });
  }

  // Czyszczenie po błędzie. Gdy się nie uda, zatrzymujemy kolejkę, żeby nie dorzucać do brudnego formularza.
  async function cleanup() {
    try {
      await T.bus.request('add.clear', null, { timeout: 60000 });
    } catch (err) {
      throw new Error(`nie udało się wyczyścić formularza (${err.message}). Kolejka zatrzymana`);
    }
  }

  // Pozycja nie może zostać w stanie „praca", gdy przetwarzanie kończy się wyjątkiem (np. nieudane czyszczenie).
  async function processItem(item, settings) {
    currentId = item.id;
    publishingId = null;
    await T.queue.patch(item.id, { status: 'praca' });
    try {
      await attemptItem(item, settings);
    } catch (err) {
      if (!err.aborted) {
        await T.queue.patch(item.id, { status: 'blad', blad: err.message, noRetry: true });
      }
      throw err;
    }
  }

  // Jedna pozycja: do dwóch prób. Zapis sukcesu jest poza try, żeby błąd storage
  // nie uruchomił ponowienia (a z nim duplikatu publikacji).
  async function attemptItem(item, settings) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      let res;
      try {
        res = await T.bus.request('add.item', {
          label: item.label,
          text: item.fracht,
          odpis: item.odpis,
          dryRun: settings.dryRun
        }, { timeout: PUBLISH_TIMEOUT_MS });
      } catch (err) {
        const finished = await handleFailure(item, err, attempt);
        if (finished) return;
        continue;
      }

      const dry = !!(res && res.dryRun);
      const note = dry ? 'próba (bez publikacji)' : 'opublikowano';
      await T.queue.patch(item.id, { status: 'ok', note, blad: null });
      T.ui.log(`[${item.label}] ${note}.`, 'ok');
      await bump(dry ? 'dry' : 'added');
      return;
    }
  }

  // Zwraca true, gdy pozycja zakończona (błąd ostateczny). Stop rzuca dalej.
  async function handleFailure(item, err, attempt) {
    if (err.aborted) {
      const afterPublish = publishingId === item.id;
      await T.queue.patch(item.id, afterPublish
        ? { status: 'blad', blad: 'przerwano w trakcie publikacji. Sprawdź w Transie, nie ponawiam', noRetry: true }
        : { status: 'czeka', blad: null });
      if (!afterPublish) {
        try {
          await T.bus.request('add.clear', null, { timeout: 60000 });
        } catch (clearErr) {
          T.ui.log(`Po zatrzymaniu nie udało się wyczyścić formularza: ${clearErr.message}`, 'err');
        }
      }
      throw err;
    }

    const why = err.timeout ? `${err.message} (strona nie odpowiedziała)` : err.message;
    T.ui.log(`[${item.label}] błąd, próba ${attempt}: ${why}`, 'err');
    if (err.timeout) {
      await T.bus.request('add.abort', null, { timeout: 3000 }).catch((e) => {
        T.ui.log(`Nie udało się przerwać operacji strony: ${e.message}`, 'err');
      });
    }

    const noRetry = !!err.noRetry || publishingId === item.id;
    if (noRetry || attempt === 2) {
      await T.queue.patch(item.id, { status: 'blad', blad: why, noRetry });
      await bump('errors');
      await cleanup();
      return true;
    }
    await cleanup();
    T.ui.log(`[${item.label}] ponawiam po wyczyszczeniu formularza.`, 'warn');
    return false;
  }

  async function start() {
    if (running) return;
    if (!T.queue.next()) {
      T.ui.log('Kolejka jest pusta. Wklej trasy i dodaj do kolejki.', 'warn');
      return;
    }
    running = true;
    controller = new AbortController();
    const signal = controller.signal;
    T.rt.addRunning = true;
    notify();
    T.ui.log('Start dodawania.', 'working');

    let waitingLogged = false;
    try {
      while (running) {
        if (T.rt.refreshRunning && !waitingLogged) {
          T.ui.log('Czeka na koniec odświeżania.', 'info');
          waitingLogged = true;
        }
        while (T.rt.refreshRunning && running) await sleep(3000, signal);
        waitingLogged = false;

        const item = T.queue.next();
        if (!item) break;

        const { settings } = await T.store.load();
        await processItem(item, settings);

        if (running && T.queue.next()) {
          const { settings: s } = await T.store.load();
          const ms = (s.pacingMinSec + Math.random() * (s.pacingMaxSec - s.pacingMinSec)) * 1000;
          T.ui.log(`Przerwa ${Math.round(ms / 1000)} s przed następną pozycją.`);
          await sleep(ms, signal);
        }
      }
      if (running) T.ui.log('Kolejka zakończona.', 'ok');
    } catch (err) {
      if (err.aborted) T.ui.log('Zatrzymano dodawanie.', 'warn');
      else T.ui.log(err.message, 'err');
    } finally {
      running = false;
      controller = null;
      currentId = null;
      publishingId = null;
      T.rt.addRunning = false;
      notify();
    }
  }

  async function stop() {
    if (!running) return;
    running = false;
    if (controller) controller.abort();
    try {
      await T.bus.request('add.abort', null, { timeout: 3000 });
    } catch (err) {
      T.ui.log(`Nie udało się przerwać operacji strony: ${err.message}`, 'err');
    }
    notify();
  }

  // Zdarzenia ze strony: start publikacji (do oceny ryzyka duplikatu) i logi kroków.
  T.bus.onEvent((type, payload) => {
    if (type === 'add.publishing') publishingId = currentId;
    if (type === 'add.log' && payload) {
      T.ui.log(`[${payload.label}] ${payload.msg}`, payload.status);
    }
  });

  T.runner = Object.freeze({
    start,
    stop,
    isRunning: () => running,
    subscribe(fn) { listeners.push(fn); }
  });
})();
