/*
 * Punkt wejścia świata strony. Rejestruje polecenia i sygnalizuje gotowość.
 * Moduły (selftest, add, refresh) dopisują swoje polecenia w swoich plikach.
 */
(function () {
  'use strict';
  const T = globalThis.__trc;

  T.on('ping', () => ({ pong: true, at: Date.now() }));

  T.emit('ready', { version: 1 });
})();
