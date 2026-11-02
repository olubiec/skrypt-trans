/*
 * Oczekiwanie na warunki w DOM strony. Każdy krok ma limit czasu i czytelny błąd
 * (krok, co czekało, ile). Zamiast sztywnych sleepów: MutationObserver plus
 * rzadki polling, bo wartości pól (value) nie zawsze zmieniają atrybuty.
 */
(function () {
  'use strict';
  const T = (globalThis.__trc ||= {});

  function isVisible(el) {
    return !!el && el.isConnected && el.offsetWidth > 0 && el.offsetHeight > 0;
  }

  function normText(el) {
    return ((el && el.textContent) || '').replace(/\s+/g, ' ').trim();
  }

  function stepError(step, message) {
    const e = new Error(`${step}: ${message}`);
    e.step = step;
    return e;
  }

  // check() zwraca wartość truthy, gdy warunek spełniony. Zwracana wartość trafia do resolve.
  function waitFor(check, opts = {}) {
    const {
      timeout = 10000,
      signal,
      step = 'oczekiwanie',
      what = 'warunek',
      interval = 200
    } = opts;

    return new Promise((resolve, reject) => {
      let done = false;
      let timer = null;
      let poll = null;
      let obs = null;

      const finish = (fn, val) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        clearInterval(poll);
        if (obs) obs.disconnect();
        if (signal) signal.removeEventListener('abort', onAbort);
        fn(val);
      };

      const onAbort = () => {
        const e = stepError(step, 'przerwano');
        e.aborted = true;
        finish(reject, e);
      };

      const test = () => {
        if (done) return;
        let v;
        try {
          v = check();
        } catch (err) {
          finish(reject, stepError(step, `błąd sprawdzenia (${what}): ${err.message}`));
          return;
        }
        if (v) finish(resolve, v);
      };

      if (signal && signal.aborted) return onAbort();

      poll = setInterval(test, interval);
      if (typeof MutationObserver !== 'undefined' && document.body) {
        obs = new MutationObserver(test);
        obs.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'checked', 'disabled']
        });
      }
      timer = setTimeout(() => {
        finish(reject, stepError(step, `nie doczekano się: ${what} (limit ${Math.round(timeout / 1000)} s)`));
      }, timeout);
      if (signal) signal.addEventListener('abort', onAbort, { once: true });
      test();
    });
  }

  T.dom = Object.freeze({ isVisible, normText, stepError, waitFor });
})();
