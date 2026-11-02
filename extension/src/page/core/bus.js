/*
 * Strona obsługi poleceń (świat MAIN). Odbiera REQ, wywołuje handler,
 * odsyła RES z tym samym id. Pozwala też wysyłać zdarzenia EVT bez odpowiedzi.
 */
(function () {
  'use strict';
  const T = (globalThis.__trc ||= {});
  const P = T.proto;
  const handlers = new Map();

  function send(name, body) {
    document.dispatchEvent(new CustomEvent(name, { detail: JSON.stringify(body) }));
  }

  T.on = (type, fn) => {
    handlers.set(type, fn);
  };

  T.emit = (type, payload) => {
    send(P.EVT, { v: P.V, type, payload: payload ?? null });
  };

  document.addEventListener(P.REQ, async (e) => {
    let msg;
    try {
      msg = JSON.parse(e.detail);
    } catch (err) {
      console.error('[trc] nieczytelna wiadomość', err);
      return;
    }
    if (!msg || msg.v !== P.V) return;

    const reply = (type, payload) => send(P.RES, { v: P.V, id: msg.id, type, payload });
    const handler = handlers.get(msg.type);
    if (!handler) {
      reply('error', { message: `nieznane polecenie: ${msg.type}`, step: null });
      return;
    }
    try {
      const result = await handler(msg.payload);
      reply('ok', result ?? null);
    } catch (err) {
      reply('error', {
        message: err && err.message ? err.message : String(err),
        step: (err && err.step) || null,
        aborted: !!(err && err.aborted),
        noRetry: !!(err && err.noRetry)
      });
    }
  });
})();
