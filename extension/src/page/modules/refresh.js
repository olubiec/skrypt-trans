/*
 * Odświeżanie ofert (świat strony). Port z baseline-v4/inject-refresh.js na wspólny core/.
 * Zmiany względem v4:
 *  - brak zapisów w DOM Transa: stan odświeżonych elementów w WeakSet (nie data-*, nie style),
 *  - pusty catch zastąpiony raportem błędu (z ograniczeniem częstotliwości),
 *  - stop przerywa oczekiwanie (AbortController), a nie tylko ustawia flagę,
 *  - brak pauzy na ukryciu karty przez nieskończoną pętlę: czekamy, ale z przerwaniem.
 */
(function () {
  'use strict';
  const T = globalThis.__trc;
  const { sleep, humanDelay, clickHuman } = T.human;

  let controller = null;
  const refreshedSvg = new WeakSet();
  const refreshedRow = new WeakSet();
  const lastErrorAt = new Map();

  function reportError(ctx, err) {
    const now = Date.now();
    if (now - (lastErrorAt.get(ctx) || 0) < 10000) return;
    lastErrorAt.set(ctx, now);
    T.emit('refresh.error', { ctx, msg: err && err.message ? err.message : String(err) });
  }

  function report(done, text, status) {
    T.emit('refresh.progress', { done, text, status });
  }

  // Czekanie, które wstrzymuje się na ukrytej karcie, ale nadal reaguje na stop.
  async function sleepVisible(ms, signal) {
    let remaining = ms;
    while (remaining > 0) {
      while (document.hidden) await sleep(1000, signal);
      const step = Math.min(remaining, 400 + Math.random() * 400);
      await sleep(step, signal);
      remaining -= step;
    }
  }

  function fatigueFactor(index) {
    if (index <= 5) return 1.0;
    const p = Math.min(index / 25, 1);
    if (p < 0.2) return 1.05;
    return 1.0 + p * 0.2 + Math.random() * 0.1;
  }

  function checkReactDisabledStatus(element) {
    if (!element) return false;
    try {
      const fiberKey = Object.keys(element).find((k) => k.startsWith('__reactFiber'));
      if (!fiberKey) return false;
      let node = element[fiberKey];
      for (let i = 0; i < 8 && node; i++) {
        const props = node.memoizedProps;
        if (props && typeof props.onClick === 'function') {
          return props.disabled === true || typeof props.disabled === 'number';
        }
        node = node.return;
      }
    } catch (err) {
      reportError('react-disabled', err);
    }
    return false;
  }

  function triggerReactClick(element) {
    if (!element) return false;
    try {
      const fiberKey = Object.keys(element).find((k) => k.startsWith('__reactFiber'));
      if (!fiberKey) return false;
      let node = element[fiberKey];
      for (let i = 0; i < 8 && node; i++) {
        const props = node.memoizedProps;
        if (props && typeof props.onClick === 'function') {
          if (props.disabled) return false;
          props.onClick(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return true;
        }
        node = node.return;
      }
    } catch (err) {
      reportError('react-click', err);
    }
    return false;
  }

  function findScrollContainer(el) {
    if (!el) return window;
    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      const overflowY = window.getComputedStyle(parent).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return parent;
      parent = parent.parentElement;
    }
    return window;
  }

  async function humanScroll(element, totalDistance, signal) {
    let remaining = totalDistance;
    const jumps = Math.floor(2 + Math.random() * 3);
    for (let i = 0; i < jumps; i++) {
      let step = Math.floor(remaining / (jumps - i)) + Math.floor((Math.random() - 0.5) * 40);
      if (i === jumps - 1) step = remaining;
      if (element && typeof element.scrollBy === 'function') {
        element.scrollBy({ top: step, behavior: 'smooth' });
      }
      remaining -= step;
      await sleepVisible(humanDelay(60, 20, 30, 100), signal);
    }
  }

  async function checkAndClickGlobalRefresh(done, signal) {
    const candidates = document.querySelectorAll('span, a, button');
    for (const el of candidates) {
      const text = (el.textContent || '').trim().toLowerCase();
      if (text === 'odśwież listę' || text === 'odswiez liste') {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          report(done, 'Znalazłem "Odśwież listę", klikam...', 'working');
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          await sleepVisible(humanDelay(250, 80, 150, 400), signal);
          if (!triggerReactClick(el)) await clickHuman(el, signal);
          report(done, 'Czekam na przeładowanie listy...', 'info');
          await sleepVisible(humanDelay(1000, 250, 600, 1500), signal);
          return true;
        }
      }
    }
    return false;
  }

  function getRefreshButtons() {
    try {
      return Array.from(document.querySelectorAll('svg')).filter((svg) => {
        if (refreshedSvg.has(svg)) return false;
        const row = svg.closest('tr') || svg.closest('[role="row"]');
        if (row && refreshedRow.has(row)) return false;
        const content = svg.innerHTML;
        const isRefreshIcon = content.includes('M17.65 6.35') || content.includes('M2.518');
        if (!isRefreshIcon) return false;
        const clickable = svg.closest('button, [role="button"], a, [class*="btn"]') || svg.parentElement;
        if (!clickable) return false;
        if (clickable.hasAttribute('disabled') || clickable.getAttribute('aria-disabled') === 'true') return false;
        if (clickable.classList.contains('disabled')) return false;
        if (checkReactDisabledStatus(clickable) || checkReactDisabledStatus(svg)) return false;
        if (window.getComputedStyle(svg).opacity < 0.6 || window.getComputedStyle(clickable).opacity < 0.6) return false;
        if (window.getComputedStyle(clickable).pointerEvents === 'none') return false;
        return true;
      });
    } catch (err) {
      reportError('szukanie-przyciskow', err);
      return [];
    }
  }

  function isVisibleInViewport(el) {
    const rect = el.getBoundingClientRect();
    const y = rect.top + rect.height / 2;
    return y > 100 && y < (window.innerHeight || document.documentElement.clientHeight) - 20;
  }

  let coffeeCounter = 0;
  let nextBreakAt = 8 + Math.floor(Math.random() * 6);
  function shouldTakeCoffeeBreak() {
    coffeeCounter++;
    if (coffeeCounter >= nextBreakAt) {
      coffeeCounter = 0;
      nextBreakAt = 8 + Math.floor(Math.random() * 6);
      return true;
    }
    return false;
  }

  // Główna pętla. Zwraca powód zakończenia: 'koniec listy' albo 'zatrzymano'.
  async function loop(state, signal) {
    let consecutiveBottomHits = 0;
    const delayMin = 350 + Math.random() * 150;
    const delayMax = delayMin + 200 + Math.random() * 300;

    await checkAndClickGlobalRefresh(state.done, signal);
    report(state.done, 'Skanuję widoczne frachty...', 'info');

    while (!signal.aborted) {
      try {
        const visibleBtns = getRefreshButtons().filter(isVisibleInViewport);

        if (visibleBtns.length > 0) {
          report(state.done, `Widzę ${visibleBtns.length} frachtów, odświeżam serią...`, 'info');
          for (const svg of visibleBtns) {
            if (signal.aborted) break;
            if (state.done > 0 && shouldTakeCoffeeBreak()) {
              const breakTime = humanDelay(3500, 1000, 2000, 5500);
              report(state.done, `Krótka pauza: ${Math.round(breakTime / 1000)} s...`, 'info');
              await sleepVisible(breakTime, signal);
            }
            consecutiveBottomHits = 0;
            const clickable = svg.closest('button, [role="button"], a, [class*="btn"]') || svg.parentElement;
            refreshedSvg.add(svg);
            const row = svg.closest('tr') || svg.closest('[role="row"]');
            if (row) refreshedRow.add(row);

            await sleepVisible(humanDelay(100, 30, 50, 200), signal);
            let clicked = triggerReactClick(clickable);
            if (!clicked) clicked = triggerReactClick(svg);
            if (!clicked) await clickHuman(clickable, signal);

            state.done++;
            const wait = humanDelay((delayMin + delayMax) / 2, (delayMax - delayMin) / 3, delayMin, delayMax)
              * fatigueFactor(state.done);
            report(state.done, `Zrobione [${state.done}]. Interwał: ${Math.round(wait)} ms`, 'ok');
            await sleepVisible(wait, signal);
          }
          continue;
        }

        const anyRow = document.querySelector('tr, [role="row"], [class*="row"]');
        const scroller = findScrollContainer(anyRow);
        if (!scroller || typeof scroller.scrollBy !== 'function' || scroller === window) {
          report(state.done, 'Brak frachtów.', 'info');
          return 'koniec listy';
        }

        const oldScroll = scroller.scrollTop || 0;
        report(state.done, 'Przewijam w dół...', 'working');
        await humanScroll(scroller, Math.floor(400 + Math.random() * 250), signal);
        if (Math.random() < 0.25) {
          await sleepVisible(humanDelay(150, 50, 100, 300), signal);
          scroller.scrollBy({ top: Math.floor(-20 - Math.random() * 30), behavior: 'smooth' });
        }
        await sleepVisible(humanDelay(1200, 300, 800, 2000), signal);

        if (Math.abs((scroller.scrollTop || 0) - oldScroll) < 10) {
          consecutiveBottomHits++;
          if (consecutiveBottomHits >= 3) {
            report(state.done, 'Koniec listy.', 'info');
            return 'koniec listy';
          }
          report(state.done, 'Doczytuję dane...', 'working');
          await sleepVisible(1000, signal);
        } else {
          consecutiveBottomHits = 0;
        }
      } catch (err) {
        if (err.aborted) throw err;
        reportError('petla', err);
        report(state.done, 'Szukam dalej...', 'info');
        await sleepVisible(600, signal);
      }
    }
    return 'zatrzymano';
  }

  async function run(signal) {
    const state = { done: 0 };
    let reason;
    try {
      reason = await loop(state, signal);
    } catch (err) {
      reason = err.aborted ? 'zatrzymano' : `błąd: ${err.message}`;
    } finally {
      controller = null;
      T.emit('refresh.done', { done: state.done, reason });
    }
  }

  T.on('refresh.start', () => {
    if (controller) throw new Error('odświeżanie już trwa');
    controller = new AbortController();
    run(controller.signal);
    return { started: true };
  });

  T.on('refresh.stop', () => {
    const was = !!controller;
    if (controller) controller.abort();
    return { stopped: was };
  });
})();
