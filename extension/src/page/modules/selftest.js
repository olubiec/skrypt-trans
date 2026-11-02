/*
 * Selftest: sprawdza, które selektory znajdują elementy w aktualnym oknie.
 * Nic nie klika ani nie wpisuje. Zwraca tylko nazwy i statusy (bez wartości pól).
 */
(function () {
  'use strict';
  const T = globalThis.__trc;

  T.on('selftest', () => {
    const modalOpen = T.modal.isOpen();
    const results = T.selectors.describe();
    const ok = modalOpen && results.every((r) => r.status !== 'brak');
    return {
      ok,
      modalOpen,
      results,
      chipCount: T.selectors.chips().length,
      dateCount: T.selectors.dateInputs().length
    };
  });
})();
