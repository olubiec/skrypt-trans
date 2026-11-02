/*
 * Czyste funkcje tekstowe: limit auto-odpisu i podmiana placeholderów.
 * Ładowane w obu światach (content i MAIN), a także testowane w Node.
 */
(function () {
  'use strict';

  const MAX_ODPIS = 600;
  const PLACEHOLDERS = ['zaladunek', 'rozladunek', 'data', 'etykieta'];

  // Podmienia {zaladunek}, {rozladunek}, {data}, {etykieta} tylko, gdy wartość jest znana.
  function fillPlaceholders(template, values) {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      if (!PLACEHOLDERS.includes(key)) return match;
      const v = values ? values[key] : null;
      return v === null || v === undefined || v === '' ? match : String(v);
    });
  }

  // Wszystko, co wygląda jak placeholder i nie zostało podmienione (znane lub nie).
  function remainingPlaceholders(text) {
    return Array.from(text.matchAll(/\{\w+\}/g), (m) => m[0]);
  }

  const api = Object.freeze({ MAX_ODPIS, PLACEHOLDERS, fillPlaceholders, remainingPlaceholders });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    (globalThis.__trc ||= {}).text = api;
  }
})();
