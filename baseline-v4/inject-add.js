(function () {
  'use strict';

  let stoppedAdd = false;

  function reportAdd(text, status) {
    document.dispatchEvent(new CustomEvent('__tr_ack_prog__', { detail: JSON.stringify({ type: 'progress', text: text, status: status }) }));
  }

  function gaussianRandom(mean, stdDev) { let u1 = Math.random(), u2 = Math.random(); while (u1 === 0) u1 = Math.random(); return mean + Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2) * stdDev; }
  function humanDelay(meanMs, stdDevMs, minMs, maxMs) { let val = gaussianRandom(meanMs, stdDevMs); return Math.round(Math.min(maxMs || meanMs * 3, Math.max(minMs || meanMs * 0.3, val))); }
  function fatigueFactor(index, total) { if (total <= 2) return 1.0; const p = Math.min(index / (total || 15), 1); if (p < 0.2) return 1.05; return 1.0 + p * 0.1 + (Math.random() * 0.05); }
  
  let lastMouseX = window.innerWidth / 2;
  let lastMouseY = window.innerHeight / 2;

  function isVisible(el) {
    return el && el.offsetWidth > 0 && el.offsetHeight > 0;
  }

  async function sleep(ms) {
    let remaining = ms;
    while (remaining > 0) {
      if (document.hidden) { await new Promise(r => setTimeout(r, 500)); remaining -= 500; continue; }
      const step = Math.min(remaining, 200 + Math.random() * 200);
      if (remaining > 500 && Math.random() < 0.1) {
        const rx = lastMouseX + (Math.random() - 0.5) * 50;
        const ry = lastMouseY + (Math.random() - 0.5) * 50;
        window.dispatchEvent(new MouseEvent('mousemove', { bubbles:true, clientX: rx, clientY: ry }));
        lastMouseX = rx; lastMouseY = ry;
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
    const steps = 4 + Math.floor(Math.random() * 4);
    for(let i=1; i<=steps; i++) {
        let t = i / steps;
        const currX = lastMouseX + (targetX - lastMouseX) * t;
        const currY = lastMouseY + (targetY - lastMouseY) * t;
        el.dispatchEvent(new MouseEvent('mousemove', { bubbles:true, view:window, clientX: currX, clientY: currY }));
        await new Promise(r => setTimeout(r, 8 + Math.random() * 8));
    }
    lastMouseX = targetX; lastMouseY = targetY;
    for (const e of ['mouseenter','mouseover','mousedown','mouseup','click']) {
      el.dispatchEvent(new MouseEvent(e, { bubbles:true, cancelable:true, view:window, clientX:targetX, clientY:targetY, button:0 }));
      await new Promise(r => setTimeout(r, 5 + Math.random() * 5));
    }
  }

  async function simulatePaste(el, text) {
    if (!el) return 0;
    el.focus();
    const pWait = humanDelay(100, 30, 50, 200);
    await sleep(pWait);
    const elementPrototype = (el instanceof HTMLTextAreaElement) ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(elementPrototype, 'value')?.set;
    if (setter) { setter.call(el, text); } else { el.value = text; }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return pWait;
  }

  function findQuickFillInput() {
    for (const ta of document.querySelectorAll('textarea')) {
      if (isVisible(ta) && ta.placeholder && ta.placeholder.includes('Wklej tekst')) return ta;
    }
    return Array.from(document.querySelectorAll('textarea')).find(isVisible) || null;
  }

  function findButton(text) {
    for (const btn of document.querySelectorAll('button')) {
      if (isVisible(btn) && btn.textContent.trim().includes(text)) return btn;
    }
    return null;
  }

  function isModalOpen() { return !!findQuickFillInput(); }

  const NEEDS_UNCHECK_TRAILER = ['walkingfloor', 'walking floor', 'ruchoma podłoga'];
  const NEEDS_UNCHECK_SEMI = ['jumbo'];

  function needsTrailerUncheck(ft) { return NEEDS_UNCHECK_TRAILER.some(kw => ft.toLowerCase().includes(kw)); }
  function needsSemiUncheck(ft) { return NEEDS_UNCHECK_SEMI.some(kw => ft.toLowerCase().includes(kw)); }
  function needsBodyCorrection(ft) { return needsTrailerUncheck(ft) || needsSemiUncheck(ft); }

  async function uncheckByDataCtxId(dataCtxId, friendlyName) {
    let target = Array.from(document.querySelectorAll(`label[data-ctx-id="${dataCtxId}"], [data-ctx-id="${dataCtxId}"]`)).find(isVisible);
    if (target) { await clickWithOffset(target); return true; }
    const keyword = friendlyName === 'z przyczepą' ? 'przyczep' : 'naczep';
    let best = null, bestLen = Infinity;
    for (const el of document.querySelectorAll('label, div, span')) {
      if (!isVisible(el)) continue;
      const t = el.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
      if (t.includes(keyword) && t.length < 20 && t.length < bestLen) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 5 && rect.height > 5) { best = el; bestLen = t.length; }
      }
    }
    if (best) { await clickWithOffset(best); return true; }
    return false;
  }

  function findBodyTypeDropdown() {
    for (const inp of document.querySelectorAll('input[type="text"], input:not([type])')) {
      if (isVisible(inp) && inp.placeholder && inp.placeholder.includes('Wybierz z listy')) {
        const ctx = (inp.closest('div')?.parentElement?.textContent || '');
        if (ctx.includes('nadwozia') || ctx.includes('Typ')) return inp;
      }
    }
    for (const lbl of document.querySelectorAll('label, span, div')) {
      if (isVisible(lbl) && lbl.textContent.trim().includes('Typ nadwozia')) {
        const container = lbl.closest('div') || lbl.parentElement;
        const inp = container?.querySelector('input') || container?.querySelector('select');
        if (inp && isVisible(inp)) return inp;
      }
    }
    return Array.from(document.querySelectorAll('input')).find(i => isVisible(i) && i.placeholder && i.placeholder.includes('Wybierz')) || null;
  }

  async function selectBodyType(bodyTypeName) {
    const dropdown = findBodyTypeDropdown();
    if (!dropdown) return { selected: false, dropdown: null };
    await clickWithOffset(dropdown); await sleep(humanDelay(200, 50, 100, 300)); 
    let searchInput = document.activeElement;
    if (!searchInput || searchInput === document.body || !isVisible(searchInput)) searchInput = dropdown;
    searchInput.focus(); await simulatePaste(searchInput, ''); 
    await simulatePaste(searchInput, bodyTypeName); await sleep(humanDelay(400, 100, 200, 700)); 
    for (const opt of document.querySelectorAll('[class*="option"], [class*="item"], [class*="list"] li, [role="option"]')) {
      if (isVisible(opt) && opt.textContent.trim().toLowerCase().includes(bodyTypeName.toLowerCase())) {
        await clickWithOffset(opt); await sleep(humanDelay(200, 50, 100, 400)); return { selected: true, dropdown };
      }
    }
    return { selected: false, dropdown };
  }

  async function correctBodyType(freightText) {
    const lower = freightText.toLowerCase(); const bodyTypeNames = [];
    if (lower.includes('walkingfloor') || lower.includes('walking floor') || lower.includes('ruchoma podłoga')) bodyTypeNames.push('walkingfloor');
    if (lower.includes('jumbo')) bodyTypeNames.push('jumbo');
    if (bodyTypeNames.length === 0) return false;
    
    if (needsTrailerUncheck(freightText)) { await uncheckByDataCtxId('2_double_trailer', 'z przyczepą'); await sleep(humanDelay(150, 50, 100, 300)); }
    if (needsSemiUncheck(freightText)) { await uncheckByDataCtxId('3_lorry', 'z naczepą'); await sleep(humanDelay(150, 50, 100, 300)); }
    await sleep(humanDelay(200, 50, 150, 400));
    for (const btn of document.querySelectorAll('[class*="remove"], [class*="close"], [class*="clear"]')) {
      if (!isVisible(btn)) continue;
      const parent = btn.closest('[class*="chip"], [class*="tag"], [class*="badge"]');
      if (parent && parent.closest('[class*="nadwozi"], [class*="body"]')) {
        await clickWithOffset(btn); await sleep(humanDelay(150, 50, 100, 250)); 
      }
    }
    for (const typeName of bodyTypeNames) { await selectBodyType(typeName); await sleep(humanDelay(200, 50, 100, 300)); }
    return true;
  }

  async function openAddFreightModal() {
    const btn = findButton('Dodaj fracht');
    if (!btn) throw new Error('Nie znaleziono "Dodaj fracht"');
    await clickWithOffset(btn); await sleep(humanDelay(1200, 300, 800, 2000));
  }

  function ensureAddNextChecked() {
    for (const label of document.querySelectorAll('label')) {
      if (isVisible(label) && label.textContent.includes('Dodaj kolejny fracht')) {
        const cb = (label.closest('div') || label.parentElement)?.querySelector('input[type="checkbox"]');
        if (cb && !cb.checked) cb.click(); else if (!cb) label.click();
        return;
      }
    }
  }

  // INTELIGENTNA DETEKCJA FIOLETOWEGO BLASKU
  async function waitForAiFill(ta, timeout = 12000) {
    const start = Date.now();
    let wasGlowing = false;

    // Funkcja sprawdzająca wizualny stan pola (CSS i klasy)
    function isGlowing() {
        if (!ta) return false;
        const taStyle = window.getComputedStyle(ta);
        const pStyle = window.getComputedStyle(ta.parentElement);
        
        const combinedStyles = (taStyle.boxShadow + ' ' + pStyle.boxShadow + ' ' + taStyle.borderColor + ' ' + pStyle.borderColor).toLowerCase();
        const combinedClasses = (ta.className + ' ' + ta.parentElement.className).toLowerCase();
        
        // Wykrywamy fioletowy blask (rgb > 0 dla blue/red) lub aktywne klasy Transa
        const hasGlow = combinedStyles.includes('rgb(') && !combinedStyles.includes('rgba(0, 0, 0') && !combinedStyles.includes('rgb(228, 228, 231)');
        const hasProcessClass = combinedClasses.includes('active') || combinedClasses.includes('load') || combinedClasses.includes('recogn') || combinedClasses.includes('focus') || combinedClasses.includes('purple');
        
        return hasGlow || hasProcessClass || document.activeElement === ta;
    }

    while (Date.now() - start < timeout) {
      if (stoppedAdd) return false;
      
      const currentlyGlowing = isGlowing();
      
      if (currentlyGlowing) {
          wasGlowing = true; // Złapaliśmy moment gdy pole zaczęło świecić/pracować
      } else if (wasGlowing && !currentlyGlowing) {
          // Fioletowy blask właśnie zniknął - AI skończyło rozrzucać dane!
          const reflex = humanDelay(350, 100, 200, 600); // Ludzki refleks po zgaśnięciu kontrolki
          await sleep(reflex);
          return true;
      }

      // Bezpiecznik: Jeśli skrypt w ogóle nie zauważył blasku (bo np. AI było błyskawiczne)
      if (!wasGlowing && Date.now() - start > 1200) {
          const inputs = Array.from(document.querySelectorAll('input')).filter(isVisible);
          const hasOrigin = inputs.some(i => i.placeholder?.includes('załadunku') && i.value.length > 1);
          const hasDest = inputs.some(i => i.placeholder?.includes('rozładunku') && i.value.length > 1);
          if (hasOrigin && hasDest) {
              await sleep(humanDelay(250, 80, 150, 450)); 
              return true;
          }
      }

      await sleep(50); // Ekstremalnie szybki polling (50ms) żeby w sekundę wyłapać zniknięcie blasku
    }
    return false;
  }

  async function publishFreight() {
    const btn = findButton('Opublikuj fracht');
    if (!btn) throw new Error('Przycisk publikacji nie istnieje');
    
    // Zmuszamy do kliknięcia od razu (AI skończyło, więc przycisk musi być gotowy)
    await clickWithOffset(btn);
    await sleep(humanDelay(800, 200, 500, 1200)); 
    return !isModalOpen();
  }

  async function clearForm() {
    for (const el of document.querySelectorAll('a, button, span')) {
      if (isVisible(el) && el.textContent.trim().includes('Wyczyść formularz')) { await clickWithOffset(el); await sleep(humanDelay(400, 100, 200, 700)); return; }
    }
    const ta = findQuickFillInput();
    if (ta) await simulatePaste(ta, '');
  }

  document.addEventListener('__tr_cmd_add_stop__', () => { stoppedAdd = true; });

  document.addEventListener('__tr_cmd_add_exec__', async (e) => {
    stoppedAdd = false;
    const { text, index, total } = JSON.parse(e.detail);
    const num = index + 1; const fatigue = fatigueFactor(index, total);

    try {
      if (!isModalOpen()) {
        await openAddFreightModal(); 
      } else if (index === 0 && total > 1) { 
        ensureAddNextChecked(); await sleep(humanDelay(300, 100, 150, 500)); 
      }

      const ta = findQuickFillInput();
      if (!ta) throw new Error('Nie znaleziono pola tekstowego');
      
      await clickWithOffset(ta); 
      await simulatePaste(ta, ''); 
      const pasteWait = await simulatePaste(ta, text);
      
      const recWait = humanDelay(800, 200, 500, 1500) * fatigue;
      reportAdd(`[${num}/${total}] Wklejono. Rozpoznaję (${Math.round(recWait)}ms)...`, 'info');
      await sleep(recWait);

      const btnRec = findButton('Rozpoznaj dane');
      if (btnRec) await clickWithOffset(btnRec);
      else ta.dispatchEvent(new KeyboardEvent('keydown', { key:'Enter', code:'Enter', keyCode:13, bubbles:true }));

      // Czekamy aż zniknie fioletowy blask! (przekazujemy pole tekstowe do funkcji)
      const filled = await waitForAiFill(ta, 10000);
      if (!filled) reportAdd(`[${num}/${total}] AI wolne, wymuszam akcję...`, 'info');

      if (needsBodyCorrection(text)) {
        const bodyWait = humanDelay(200, 50, 100, 400);
        reportAdd(`[${num}/${total}] Korekta nadwozia (${Math.round(bodyWait)}ms)...`, 'info');
        await sleep(bodyWait);
        await correctBodyType(text);
      }

      // DZIAŁAMY OD RAZU (czas skrócony do ludzkiego refleksu)
      const pubWait = humanDelay(400, 100, 250, 700) * fatigue;
      reportAdd(`[${num}/${total}] Gotowy. Publikuję (${Math.round(pubWait)}ms)...`, 'working');
      await sleep(pubWait);
      
      await publishFreight();
      reportAdd(`[${num}/${total}] ✓ Opublikowano!`, 'ok');

      if (index < total - 1) {
        const nextWait = humanDelay(700, 200, 500, 1200);
        reportAdd(`Czekam na następny (${Math.round(nextWait)}ms)...`, 'info');
        await sleep(nextWait);
        await clearForm();
      }
    } catch(err) { reportAdd(`[${num}/${total}] Błąd: ${err.message}`, 'error'); }
    document.dispatchEvent(new CustomEvent('__tr_ack_add_done__'));
  });

})();