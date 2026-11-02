/*
 * Klient magistrali po stronie widżetu (świat izolowany).
 * request() zwraca Promise; brak odpowiedzi w limicie = błąd, nie zawieszenie.
 */
(function () {
  'use strict';
  const T = (globalThis.__trc ||= {});
  const P = T.proto;
  const pending = new Map();
  const eventListeners = [];
  let seq = 0;

  function parse(raw) {
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error('[trc] nieczytelna odpowiedź strony', err);
      return null;
    }
  }

  document.addEventListener(P.RES, (e) => {
    const msg = parse(e.detail);
    if (!msg || msg.v !== P.V) return;
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    clearTimeout(p.timer);
    if (msg.type === 'error') {
      const err = new Error(msg.payload.message);
      err.step = msg.payload.step;
      err.aborted = msg.payload.aborted;
      err.noRetry = msg.payload.noRetry;
      p.reject(err);
    } else {
      p.resolve(msg.payload);
    }
  });

  document.addEventListener(P.EVT, (e) => {
    const msg = parse(e.detail);
    if (!msg || msg.v !== P.V) return;
    for (const fn of eventListeners) fn(msg.type, msg.payload);
  });

  T.bus = Object.freeze({
    request(type, payload, opts = {}) {
      const timeout = opts.timeout ?? 10000;
      const id = `${Date.now().toString(36)}-${++seq}`;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          const err = new Error(`brak odpowiedzi na "${type}" w ${Math.round(timeout / 1000)} s`);
          err.step = type;
          err.timeout = true;
          reject(err);
        }, timeout);
        pending.set(id, { resolve, reject, timer });
        document.dispatchEvent(new CustomEvent(P.REQ, {
          detail: JSON.stringify({ v: P.V, id, type, payload: payload ?? null })
        }));
      });
    },
    onEvent(fn) {
      eventListeners.push(fn);
    }
  });
})();
