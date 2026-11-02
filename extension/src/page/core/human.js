/*
 * Pomocniki czasu i zdarzeń w świecie strony.
 * Zdarzenia są syntetyczne (isTrusted === false). Ruch i opóźnienia tylko
 * zmniejszają regularność, nie czynią działania niewykrywalnym.
 */
(function () {
  'use strict';
  const T = (globalThis.__trc ||= {});

  let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

  function gaussian(mean, sd) {
    let u1 = Math.random();
    const u2 = Math.random();
    while (u1 === 0) u1 = Math.random();
    return mean + Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sd;
  }

  function humanDelay(mean, sd, min, max) {
    return Math.round(Math.min(max, Math.max(min, gaussian(mean, sd))));
  }

  // Oczekiwanie przerywalne przez AbortSignal (Stop przerywa też sleep).
  function sleep(ms, signal) {
    return new Promise((resolve, reject) => {
      if (signal && signal.aborted) {
        const e = new Error('przerwano');
        e.aborted = true;
        return reject(e);
      }
      const onAbort = () => {
        clearTimeout(timer);
        const e = new Error('przerwano');
        e.aborted = true;
        reject(e);
      };
      const timer = setTimeout(() => {
        if (signal) signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      if (signal) signal.addEventListener('abort', onAbort, { once: true });
    });
  }

  // Klik z lekkim ruchem myszy. Zwraca po wysłaniu zdarzeń.
  async function clickHuman(el, signal) {
    if (!el) throw new Error('clickHuman: brak elementu');
    const r = el.getBoundingClientRect();
    const tx = r.left + r.width / 2 + (Math.random() - 0.5) * 4;
    const ty = r.top + r.height / 2 + (Math.random() - 0.5) * 4;
    const steps = 4 + Math.floor(Math.random() * 4);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      el.dispatchEvent(new MouseEvent('mousemove', {
        bubbles: true, view: window,
        clientX: mouse.x + (tx - mouse.x) * t,
        clientY: mouse.y + (ty - mouse.y) * t
      }));
      await sleep(8 + Math.random() * 8, signal);
    }
    mouse = { x: tx, y: ty };
    for (const type of ['mouseenter', 'mouseover', 'mousedown', 'mouseup', 'click']) {
      el.dispatchEvent(new MouseEvent(type, {
        bubbles: true, cancelable: true, view: window,
        clientX: tx, clientY: ty, button: 0
      }));
      await sleep(5 + Math.random() * 5, signal);
    }
  }

  // Wpisanie wartości w pole kontrolowane przez React (setter z prototypu + input/change).
  function setNativeValue(el, value) {
    if (!el) throw new Error('setNativeValue: brak elementu');
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (!setter) throw new Error('setNativeValue: brak settera value');
    el.focus();
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  T.human = Object.freeze({ gaussian, humanDelay, sleep, clickHuman, setNativeValue });
})();
