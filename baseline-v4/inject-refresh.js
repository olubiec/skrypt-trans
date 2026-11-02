(function () {
  'use strict';

  let stoppedRefresh = false;

  function reportRefresh(data) {
    // W 100% poprawna i bezpieczna metoda komunikacji
    document.dispatchEvent(new CustomEvent('__tr_ack_prog__', { detail: JSON.stringify(data) }));
  }

  function gaussianRandom(mean, stdDev) {
    let u1 = Math.random(), u2 = Math.random();
    while (u1 === 0) u1 = Math.random();
    return mean + Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2) * stdDev;
  }

  function humanDelay(meanMs, stdDevMs, minMs, maxMs) {
    let val = gaussianRandom(meanMs, stdDevMs);
    return Math.round(Math.min(maxMs || meanMs * 3, Math.max(minMs || meanMs * 0.3, val)));
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function fatigueFactor(index) {
    if (index <= 5) return 1.0;
    const p = Math.min(index / 25, 1); 
    if (p < 0.2) return 1.05;
    return 1.0 + p * 0.2 + (Math.random() * 0.1);
  }

  let lastMouseX = window.innerWidth / 2;
  let lastMouseY = window.innerHeight / 2;

  async function sleepInvisible(ms) {
    let remaining = ms;
    while (remaining > 0) {
      while (document.hidden) {
        await new Promise(r => setTimeout(r, 1000));
      }
      
      const step = Math.min(remaining, 400 + Math.random() * 400);
      
      if (remaining > 1000 && Math.random() < 0.15) {
        const rx = lastMouseX + (Math.random() - 0.5) * 100;
        const ry = lastMouseY + (Math.random() - 0.5) * 100;
        window.dispatchEvent(new MouseEvent('mousemove', { bubbles:true, clientX: rx, clientY: ry }));
        lastMouseX = rx;
        lastMouseY = ry;
      }
      
      await new Promise(r => setTimeout(r, step));
      remaining -= step;
    }
  }

  async function clickWithOffset(el) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const targetX = r.left + r.width / 2 + (Math.random() - 0.5) * 4;
    const targetY = r.top + r.height / 2 + (Math.random() - 0.5) * 4;

    const cp1x = lastMouseX + (Math.random() - 0.5) * 40;
    const cp1y = lastMouseY + (Math.random() - 0.5) * 40;
    const cp2x = targetX + (Math.random() - 0.5) * 40;
    const cp2y = targetY + (Math.random() - 0.5) * 40;
    
    const steps = Math.floor(4 + Math.random() * 4);
    for(let i=1; i<=steps; i++) {
        let t = i / steps;
        t = t * (2 - t); 
        const currX = Math.pow(1-t,3)*lastMouseX + 3*t*Math.pow(1-t,2)*cp1x + 3*t*t*(1-t)*cp2x + Math.pow(t,3)*targetX;
        const currY = Math.pow(1-t,3)*lastMouseY + 3*t*Math.pow(1-t,2)*cp1y + 3*t*t*(1-t)*cp2y + Math.pow(t,3)*targetY;
        
        el.dispatchEvent(new MouseEvent('mousemove', { bubbles:true, cancelable:true, view:window, clientX: currX, clientY: currY }));
        await new Promise(r => setTimeout(r, 8 + Math.random() * 8));
    }
    lastMouseX = targetX;
    lastMouseY = targetY;

    for (const e of ['mouseenter','mouseover','mousedown','mouseup','click']) {
      el.dispatchEvent(new MouseEvent(e, { bubbles:true, cancelable:true, view:window, clientX:targetX, clientY:targetY, button:0 }));
      await new Promise(r => setTimeout(r, Math.random() * 8 + 2)); 
    }
  }

  function checkReactDisabledStatus(element) {
    if (!element) return false;
    try {
      const fiberKey = Object.keys(element).find(k => k.startsWith('__reactFiber'));
      if (!fiberKey) return false;
      let fiberNode = element[fiberKey];
      for (let i = 0; i < 8 && fiberNode; i++) {
        const props = fiberNode.memoizedProps;
        if (props && typeof props.onClick === 'function') return props.disabled === true || typeof props.disabled === 'number'; 
        fiberNode = fiberNode.return;
      }
    } catch(e) {}
    return false;
  }

  function triggerReactClick(element) {
    if (!element) return false;
    try {
      const fiberKey = Object.keys(element).find(k => k.startsWith('__reactFiber'));
      if (!fiberKey) return false;
      let fiberNode = element[fiberKey];
      for (let i = 0; i < 8 && fiberNode; i++) {
        const props = fiberNode.memoizedProps;
        if (props && typeof props.onClick === 'function') {
          if (props.disabled) return false;
          props.onClick(new MouseEvent('click', { bubbles: true, cancelable: true }));
          return true;
        }
        fiberNode = fiberNode.return;
      }
    } catch(e) {}
    return false;
  }

  let actionsSinceBreak = 0;
  let nextBreakAt = 8 + Math.floor(Math.random() * 6);
  
  function shouldTakeCoffeeBreak() {
    actionsSinceBreak++;
    if (actionsSinceBreak >= nextBreakAt) {
      actionsSinceBreak = 0;
      nextBreakAt = 8 + Math.floor(Math.random() * 6);
      return true;
    }
    return false;
  }

  async function humanScroll(element, totalDistance) {
    try {
      let remaining = totalDistance;
      const jumps = Math.floor(2 + Math.random() * 3); 
      for (let i = 0; i < jumps; i++) {
        let step = Math.floor(remaining / (jumps - i)) + Math.floor((Math.random() - 0.5) * 40);
        if (i === jumps - 1) step = remaining; 
        if (element && typeof element.scrollBy === 'function') {
           element.scrollBy({ top: step, behavior: 'smooth' });
        }
        remaining -= step;
        await sleepInvisible(humanDelay(60, 20, 30, 100)); 
      }
    } catch(e) {}
  }

  function findScrollContainer(someElementInsideList) {
    if (!someElementInsideList) return window;
    let parent = someElementInsideList.parentElement;
    while (parent && parent !== document.body) {
      const overflowY = window.getComputedStyle(parent).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return parent;
      parent = parent.parentElement;
    }
    return window;
  }

  async function checkAndClickGlobalRefresh(done) {
    try {
      const candidates = document.querySelectorAll('span, a, button');
      for (const el of candidates) {
        const text = (el.textContent || '').trim().toLowerCase();
        if (text === 'odśwież listę' || text === 'odswiez liste') {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            reportRefresh({ type: 'progress', done: done, text: 'Znalazłem "Odśwież listę", klikam...', status: 'working' });
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await sleepInvisible(humanDelay(250, 80, 150, 400));
            let reactClicked = triggerReactClick(el);
            if (!reactClicked) await clickWithOffset(el);
            reportRefresh({ type: 'progress', done: done, text: 'Czekam na przeładowanie listy...', status: 'info' });
            await sleepInvisible(humanDelay(1000, 250, 600, 1500));
            return true;
          }
        }
      }
    } catch(e) {}
    return false;
  }

  function getRefreshButtons() {
    try {
      const svgs = Array.from(document.querySelectorAll('svg'));
      return svgs.filter(svg => {
        if (svg.dataset.transRefreshed === 'true') return false;
        const row = svg.closest('tr') || svg.closest('[role="row"]');
        if (row && row.dataset.transRefreshedRow === 'true') return false;
        const content = svg.innerHTML;
        const isRefreshIcon = content.includes('M17.65 6.35') || content.includes('M2.518');
        if (!isRefreshIcon) return false;
        const clickableTarget = svg.closest('button, [role="button"], a, [class*="btn"]') || svg.parentElement;
        if (clickableTarget.hasAttribute('disabled') || clickableTarget.getAttribute('aria-disabled') === 'true') return false;
        if (clickableTarget.classList.contains('disabled')) return false;
        if (checkReactDisabledStatus(clickableTarget) || checkReactDisabledStatus(svg)) return false;
        const svgStyle = window.getComputedStyle(svg);
        const parentStyle = window.getComputedStyle(clickableTarget);
        if (svgStyle.opacity < 0.6 || parentStyle.opacity < 0.6) return false;
        if (parentStyle.pointerEvents === 'none') return false;
        return true; 
      });
    } catch(e) { return []; }
  }

  function isVisibleInViewport(el) {
    const rect = el.getBoundingClientRect();
    const y = rect.top + rect.height / 2;
    return y > 100 && y < (window.innerHeight || document.documentElement.clientHeight) - 20;
  }

  async function runRefresh() {
    stoppedRefresh = false;
    let done = 0;
    let consecutiveBottomHits = 0; 
    
    const delayMin = 350 + Math.random() * 150; 
    const delayMax = delayMin + 200 + Math.random() * 300; 
    
    await checkAndClickGlobalRefresh(done);
    reportRefresh({ type: 'progress', done: done, text: 'Skanuję widoczne frachty...', status: 'info' });

    while (!stoppedRefresh) {
      try {
        const allBtns = getRefreshButtons();
        const visibleBtns = allBtns.filter(isVisibleInViewport);

        if (visibleBtns.length > 0) {
          reportRefresh({ type: 'progress', done: done, text: `Widzę ${visibleBtns.length} frachtów, odświeżam serią...`, status: 'info' });

          for (const targetSvg of visibleBtns) {
            if (stoppedRefresh) break;

            if (done > 0 && shouldTakeCoffeeBreak()) {
              const breakTime = humanDelay(3500, 1000, 2000, 5500); 
              reportRefresh({ type: 'progress', done: done, text: `Krótka pauza: ${Math.round(breakTime/1000)}s...`, status: 'info' });
              await sleepInvisible(breakTime);
            }
            
            consecutiveBottomHits = 0; 
            let clickableTarget = targetSvg.closest('button, [role="button"], a, [class*="btn"]') || targetSvg.parentElement;
            targetSvg.dataset.transRefreshed = 'true';
            const row = targetSvg.closest('tr') || targetSvg.closest('[role="row"]');
            if (row) {
              row.dataset.transRefreshedRow = 'true'; 
              row.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'; 
            }

            await sleepInvisible(humanDelay(100, 30, 50, 200));
            
            let reactClicked = triggerReactClick(clickableTarget);
            if (!reactClicked) reactClicked = triggerReactClick(targetSvg); 
            if (!reactClicked) await clickWithOffset(clickableTarget); 
            
            done++; 
            const waitTime = humanDelay((delayMin + delayMax) / 2, (delayMax - delayMin) / 3, delayMin, delayMax) * fatigueFactor(done);
            reportRefresh({ type: 'progress', done: done, text: `Zrobione [${done}]. Interwał: ${Math.round(waitTime)}ms`, status: 'ok' });
            await sleepInvisible(waitTime);
          }
        } else {
          const anyRow = document.querySelector('tr, [role="row"], [class*="row"]');
          const scrollWrapper = findScrollContainer(anyRow);

          if (scrollWrapper && typeof scrollWrapper.scrollBy === 'function' && scrollWrapper !== window) {
            const oldScroll = scrollWrapper.scrollTop || 0;
            reportRefresh({ type: 'progress', done: done, text: 'Przewijam w dół...', status: 'working' });
            
            await humanScroll(scrollWrapper, Math.floor(400 + Math.random() * 250));
            
            if (Math.random() < 0.25) {
              await sleepInvisible(humanDelay(150, 50, 100, 300));
              scrollWrapper.scrollBy({ top: Math.floor(-20 - Math.random() * 30), behavior: 'smooth' });
            }

            await sleepInvisible(humanDelay(1200, 300, 800, 2000));
            
            if (Math.abs((scrollWrapper.scrollTop || 0) - oldScroll) < 10) {
              consecutiveBottomHits++;
              if (consecutiveBottomHits >= 3) {
                 reportRefresh({ type: 'progress', done: done, text: 'Koniec listy.', status: 'info' });
                 break;
              } else {
                 reportRefresh({ type: 'progress', done: done, text: 'Doczytuję dane...', status: 'working' });
                 await sleepInvisible(1000); 
              }
            } else consecutiveBottomHits = 0; 
          } else {
            reportRefresh({ type: 'progress', done: done, text: 'Brak frachtów.', status: 'info' });
            break;
          }
        }
      } catch (innerError) {
        reportRefresh({ type: 'progress', done: done, text: `Szukam dalej...`, status: 'info' });
        await sleepInvisible(600);
      }
    }
    reportRefresh({ type: 'done', done: done });
  }

  document.addEventListener('__tr_cmd_ref_start__', async () => {
    try {
      document.querySelectorAll('[data-trans-refreshed]').forEach(el => delete el.dataset.transRefreshed);
      document.querySelectorAll('[data-trans-refreshed-row]').forEach(el => delete el.dataset.transRefreshedRow);
      reportRefresh({ type: 'progress', done: 0, text: 'Uruchamiam odświeżarkę...', status: 'ok' });
      await runRefresh();
    } catch (e) {}
  });

  document.addEventListener('__tr_cmd_ref_stop__', () => { stoppedRefresh = true; });

})();