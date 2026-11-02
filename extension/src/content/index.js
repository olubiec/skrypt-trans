/*
 * Start rozszerzenia po stronie widżetu (świat izolowany).
 * Montuje widżet i łączy się z częścią w świecie strony (ping z ponowieniami).
 */
(function () {
  'use strict';
  const T = globalThis.__trc;

  T.bus.onEvent((type, payload) => {
    if (type === 'ready') T.ui.log('Świat strony gotowy.');
  });

  T.ui.mount({
    onClose: () => {
      T.ui.log('Zamykanie widżetu. Moduły zatrzymane.', 'warn');
      T.ui.unmount();
    },
    onTest: runSelftest
  });

  // Raport selektorów: [OK] / [BRAK] / [POMIN], bez wartości pól z konta.
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
