/*
 * Wspólny rejestr (przestrzeń nazw `__trc`) i protokół wiadomości.
 * Ładowany w dwóch światach: izolowanym (content) i MAIN (page).
 * Wiadomości przechodzą przez zdarzenia DOM z polem `detail` jako JSON (string),
 * bo obiekty nie przechodzą między światami.
 *   content -> page:  REQ  {v, id, type, payload}
 *   page -> content:  RES  {v, id, type: 'ok' | 'error', payload}
 *   page -> content:  EVT  {v, type, payload}   (postęp, logi, bez odpowiedzi)
 */
(function () {
  'use strict';
  const T = (globalThis.__trc ||= {});
  T.proto = Object.freeze({
    V: 1,
    REQ: 'trc:req',
    RES: 'trc:res',
    EVT: 'trc:evt'
  });
})();
