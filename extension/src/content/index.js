/*
 * Start rozszerzenia po stronie widżetu (świat izolowany).
 * Montuje widżet, ładuje stan z chrome.storage, podpina kolejkę i silnik dodawania,
 * a na końcu łączy się z częścią w świecie strony (ping z ponowieniami).
 */
(function () {
  'use strict';
  const T = globalThis.__trc;

  async function runSelftest() {
    T.ui.log('Test selektorów...');
    try {
      const r = await T.bus.request('selftest', null, { timeout: 8000 });
      if (!r.modalOpen) T.ui.log('Okno „Dodaj fracht" nie jest otwarte. Otwórz je i powtórz test.', 'warn');
      for (const x of r.results) {
        const tag = x.status === 'ok' ? '[OK]' : x.status === 'brak' ? '[BRAK]' : '[POMIN]';
        const cls = x.status === 'ok' ? 'ok' : x.status === 'brak' ? 'err' : 'info';
        const extra = x.strategy ? ` (${x.strategy})` : x.note ? ` - ${x.note}` : '';
        T.ui.log(`${tag} ${x.label}${extra}`, cls);
      }
      T.ui.log(`Chipy lokalizacji: ${r.chipCount}, pola dat: ${r.dateCount}.`);
      T.ui.log(r.ok ? 'Selftest: komplet OK.' : 'Selftest: są braki.', r.ok ? 'ok' : 'err');
    } catch (err) {
      T.ui.log(`Test nieudany: ${err.message}`, 'err');
    }
  }

  async function onQueueAdd(text) {
    if (!String(text).trim()) {
      T.ui.log('Wklejka jest pusta.', 'warn');
      return;
    }
    try {
      const { settings } = await T.store.load();
      const res = await T.queue.addFrom(text, settings);
      T.ui.setWarnings(res.warnings);
      T.ui.clearPaste();
      T.ui.log(`Dodano do kolejki: ${res.items.length} tras.`, res.items.length ? 'ok' : 'warn');
    } catch (err) {
      T.ui.log(`Nie udało się dodać do kolejki: ${err.message}`, 'err');
    }
  }

  async function onSaveSettings(patch) {
    try {
      const st = await T.store.load();
      await T.store.save({ settings: { ...st.settings, ...patch } });
      T.ui.setSettings({ ...st.settings, ...patch });
      T.ui.log('Zapisano ustawienia.', 'ok');
    } catch (err) {
      T.ui.log(`Nie udało się zapisać ustawień: ${err.message}`, 'err');
    }
  }

  async function onAction(action, id) {
    try {
      if (action === 'retry') {
        const ok = await T.queue.retry(id);
        if (!ok) T.ui.log('Tej pozycji nie można ponowić (np. błąd ODPIS albo niepotwierdzona publikacja).', 'warn');
      } else if (action === 'remove') {
        const ok = await T.queue.remove(id);
        if (!ok) T.ui.log('Nie można usunąć pozycji w trakcie pracy.', 'warn');
      }
    } catch (err) {
      T.ui.log(`Operacja na kolejce nieudana: ${err.message}`, 'err');
    }
  }

  function onClose() {
    if (T.runner.isRunning() && !window.confirm('Dodawanie trwa. Zamknąć widżet i zatrzymać dodawanie?')) return;
    if (T.runner.isRunning()) T.runner.stop();
    T.ui.log('Zamykanie widżetu.', 'warn');
    T.ui.unmount();
  }

  T.ui.mount({
    onClose,
    onTest: runSelftest,
    onQueueAdd,
    onStart: () => {
      T.runner.start().catch((err) => T.ui.log(`Dodawanie przerwane: ${err.message}`, 'err'));
    },
    onStop: () => T.runner.stop(),
    onAction,
    onClearDone: () => T.queue.clearDone().catch((err) => T.ui.log(err.message, 'err')),
    onSaveSettings
  });

  T.bus.onEvent((type) => {
    if (type === 'ready') T.ui.log('Świat strony gotowy.');
  });

  T.queue.subscribe((items) => T.ui.renderQueue(items));
  T.runner.subscribe((running) => T.ui.setRunning(running));

  (async () => {
    try {
      const st = await T.store.load();
      T.ui.setSettings(st.settings);
      const items = await T.queue.init();
      T.ui.renderQueue(items);
      T.ui.setRunning(false);
      const n = items.filter((i) => i.status === 'czeka').length;
      if (n) T.ui.log(`W kolejce czeka ${n} pozycji.`);
    } catch (err) {
      T.ui.log(`Nie udało się wczytać stanu: ${err.message}`, 'err');
    }
  })();

  async function connect(attempt = 1) {
    try {
      await T.bus.request('ping', null, { timeout: 3000 });
      T.ui.setLink(true);
      T.ui.log('Łącznik z platformą: OK.', 'ok');
    } catch (err) {
      if (attempt < 3) {
        setTimeout(() => connect(attempt + 1), 1000);
        return;
      }
      T.ui.setLink(false, err.message);
      T.ui.log(`Brak łącznika: ${err.message}`, 'err');
    }
  }
  connect();
})();
