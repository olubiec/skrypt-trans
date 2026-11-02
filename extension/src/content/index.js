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
    }
  });

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
