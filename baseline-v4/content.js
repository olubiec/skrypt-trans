// SHADOW DOM - Tworzymy nieprzenikalny kontener na nasz Widget
const hostId = 'tr-host-' + Math.random().toString(36).substring(2, 10);
const host = document.createElement('div');
host.id = hostId;
document.body.appendChild(host);
const shadow = host.attachShadow({ mode: 'closed' });

// Bezpieczny, wielolinijkowy blok CSS (ULTRA MODERN 2026 - GLASSMORPHISM & NEON GLOW)
const style = document.createElement('style');
style.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');

  #tr-widget { 
    position: fixed; 
    top: 80px; 
    right: 20px; 
    width: 320px; 
    /* Glassmorphism background */
    background: rgba(15, 23, 42, 0.75); 
    backdrop-filter: blur(16px); 
    -webkit-backdrop-filter: blur(16px);
    color: #e2e8f0; 
    font-family: 'Inter', system-ui, sans-serif; 
    border: 1px solid rgba(255, 255, 255, 0.08); 
    border-radius: 16px; 
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1); 
    z-index: 9999999; 
    display: flex; 
    flex-direction: column; 
    overflow: hidden; 
    transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1), height 0.4s cubic-bezier(0.16, 1, 0.3, 1); 
  }
  #tr-widget.minimized { width: 280px; }
  
  #tr-header { 
    background: linear-gradient(180deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.4) 100%); 
    padding: 12px 18px; 
    cursor: grab; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    border-bottom: 1px solid rgba(255, 255, 255, 0.05); 
    user-select: none; 
  }
  #tr-header:active { cursor: grabbing; }
  
  .tr-title { font-size: 14px; font-weight: 600; color: #ffffff; display: flex; align-items: center; gap: 10px; white-space: nowrap; letter-spacing: 0.3px; }
  
  .tr-logo { 
    width: 24px; height: 24px; 
    background: linear-gradient(135deg, #0ea5e9, #6366f1); 
    color: #ffffff; 
    border-radius: 6px; 
    display: flex; justify-content: center; align-items: center; 
    font-weight: 700; font-size: 13px; 
    box-shadow: 0 0 12px rgba(99, 102, 241, 0.5);
  }
  
  .tr-controls { display: flex; gap: 10px; align-items: center; }
  .tr-btn-min, .tr-btn-close { 
    background: transparent; border: none; cursor: pointer; padding: 4px; line-height: 1; 
    border-radius: 4px; transition: all 0.2s ease; display: flex; justify-content: center; align-items: center;
  }
  .tr-btn-min { color: #94a3b8; font-size: 15px; }
  .tr-btn-min:hover { color: #ffffff; background: rgba(255,255,255,0.1); }
  .tr-btn-close { color: #94a3b8; font-size: 20px; }
  .tr-btn-close:hover { color: #ef4444; background: rgba(239, 68, 68, 0.15); }
  
  #tr-body { padding: 18px; max-height: 80vh; overflow-y: auto; }
  #tr-body::-webkit-scrollbar { width: 6px; }
  #tr-body::-webkit-scrollbar-track { background: transparent; }
  #tr-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
  #tr-widget.minimized #tr-body { display: none; }
  
  .tr-dashboard { 
    background: rgba(0, 0, 0, 0.2); 
    border: 1px solid rgba(255, 255, 255, 0.05); 
    border-radius: 10px; 
    padding: 12px; margin-bottom: 16px; font-size: 12px; color: #94a3b8; 
  }
  .tr-stat-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .tr-stat-row:last-child { margin-bottom: 0; }
  .tr-stat-val { color: #f8fafc; font-weight: 600; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
  .tr-stat-val.highlight { color: #38bdf8; text-shadow: 0 0 8px rgba(56, 189, 248, 0.4); }
  
  .tr-status-bar { border-top: 1px solid rgba(255,255,255,0.08); margin-top: 10px; padding-top: 10px; display: flex; justify-content: space-between; align-items: center; }
  .tr-dot { width: 8px; height: 8px; border-radius: 50%; background: #475569; display: inline-block; margin-right: 8px; box-shadow: 0 0 0 rgba(0,0,0,0); transition: 0.3s; }
  .tr-dot.working { background: #f59e0b; box-shadow: 0 0 10px #f59e0b; animation: pulse-working 1.5s infinite; }
  .tr-dot.active { background: #10b981; box-shadow: 0 0 10px #10b981; }
  @keyframes pulse-working { 0% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0); } 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0); } }
  
  .tr-buttons { display: flex; gap: 10px; margin-bottom: 16px; }
  .tr-btn { 
    flex: 1; padding: 10px 0; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; 
    cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); 
    display: flex; justify-content: center; align-items: center; gap: 6px;
  }
  
  /* Nowoczesne przyciski z gradientami i poświatą */
  #tr-start { 
    background: linear-gradient(135deg, #3b82f6, #4f46e5); color: #ffffff; 
    box-shadow: 0 4px 15px rgba(79, 70, 229, 0.3); border: 1px solid rgba(255,255,255,0.1);
  }
  #tr-start:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(79, 70, 229, 0.5); }
  #tr-start:active { transform: translateY(1px); }
  #tr-start:disabled { background: rgba(255,255,255,0.05); color: #64748b; box-shadow: none; border-color: transparent; cursor: not-allowed; }
  
  #tr-start-add { 
    background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; 
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); border: 1px solid rgba(255,255,255,0.1);
  }
  #tr-start-add:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5); }
  #tr-start-add:active { transform: translateY(1px); }
  #tr-start-add:disabled { background: rgba(255,255,255,0.05); color: #64748b; box-shadow: none; border-color: transparent; cursor: not-allowed; }
  
  #tr-stop, #tr-stop-add { 
    background: rgba(255, 255, 255, 0.05); color: #cbd5e1; flex: 0.4; border: 1px solid rgba(255, 255, 255, 0.1);
  }
  #tr-stop:hover, #tr-stop-add:hover { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); color: #fca5a5; }
  
  .tr-section-title { font-size: 11px; font-weight: 700; color: #94a3b8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
  
  .tr-textarea { 
    width: 100%; height: 80px; 
    background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.1); 
    border-radius: 8px; padding: 10px; color: #38bdf8; 
    font-family: 'JetBrains Mono', monospace; font-size: 11px; 
    resize: none; outline: none; margin-bottom: 10px; 
    transition: border-color 0.3s, box-shadow 0.3s;
  }
  .tr-textarea:focus { border-color: #38bdf8; box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15); }
  .tr-textarea::placeholder { color: #475569; }
  
  #tr-log { 
    max-height: 130px; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; 
    color: #94a3b8; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.05); 
    padding: 10px; border-radius: 8px; 
  }
  #tr-log::-webkit-scrollbar { width: 4px; }
  #tr-log::-webkit-scrollbar-track { background: transparent; }
  #tr-log::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
  
  .log-entry { margin-bottom: 4px; line-height: 1.4; }
  .log-entry.info { color: #fbbf24; }
  .log-entry.ok { color: #34d399; }
  .log-entry.working { color: #38bdf8; }
  .log-entry.error { color: #f87171; }
  .log-entry.summary { color: #10b981; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px; margin-bottom: 6px; }
  
  .log-sep { border-top: 1px solid rgba(255,255,255,0.08); margin: 16px 0; }
  
  .checkbox-wrapper { display: flex; align-items: center; gap: 8px; cursor: pointer; color: #cbd5e1; font-weight: 500; font-size: 12px; }
  .checkbox-wrapper input { 
    appearance: none; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); 
    border-radius: 4px; width: 16px; height: 16px; margin: 0; cursor: pointer; 
    display: flex; align-items: center; justify-content: center; transition: 0.2s;
  }
  .checkbox-wrapper input:checked { background: #3b82f6; border-color: #3b82f6; }
  .checkbox-wrapper input:checked::after { content: '✓'; color: white; font-size: 11px; font-weight: bold; }
`;
shadow.appendChild(style);

// Bezpieczny, wielolinijkowy blok HTML
const widget = document.createElement('div');
widget.id = 'tr-widget';
widget.innerHTML = `
  <div id="tr-header">
    <div class="tr-title"><div class="tr-logo">T</div><span id="tr-title-text">Trans Combajn</span></div>
    <div class="tr-controls">
      <button class="tr-btn-min" id="tr-min-btn" title="Minimalizuj">—</button>
      <button class="tr-btn-close" id="tr-close-btn" title="Zamknij całkowicie">×</button>
    </div>
  </div>
  <div id="tr-body">
    <div class="tr-section-title">🔄 Auto-Odświeżanie</div>
    <div class="tr-dashboard">
      <div class="tr-stat-row"><span>Odświeżeń (sesja):</span><span class="tr-stat-val highlight" id="tr-last-session-count">0</span></div>
      <div class="tr-stat-row"><span>Czas pracy:</span><span class="tr-stat-val" id="tr-session-time">00:00</span></div>
      <div class="tr-stat-row">
        <label class="checkbox-wrapper"><input type="checkbox" id="tr-auto-checkbox" checked>Wznowienie</label>
        <span class="tr-stat-val" id="tr-next-session" style="color: #fbbf24;">--:--</span>
      </div>
      <div class="tr-status-bar">
        <span><span class="tr-dot" id="tr-dot"></span><span id="tr-state">Gotowy</span></span>
        <span style="color: #38bdf8; font-weight: bold;">Licznik: <span id="tr-counter">0</span></span>
      </div>
    </div>
    <div class="tr-buttons">
      <button class="tr-btn" id="tr-start">▶ Start</button>
      <button class="tr-btn" id="tr-stop">■ Stop</button>
    </div>
    
    <div class="log-sep"></div>
    
    <div class="tr-section-title">➕ Dodawarka Frachtów</div>
    <textarea id="tr-add-queue" class="tr-textarea" placeholder="Wklej tu ładunki..."></textarea>
    <div class="tr-buttons">
      <button class="tr-btn" id="tr-start-add">▶ Do kolejki</button>
      <button class="tr-btn" id="tr-stop-add">■ Stop</button>
    </div>
    <div id="tr-log"></div>
  </div>
`;
shadow.appendChild(widget);

// Pobieranie elementów z wewnątrz Shadow DOM
const btnStart = shadow.querySelector('#tr-start');
const btnStop = shadow.querySelector('#tr-stop');
const btnStartAdd = shadow.querySelector('#tr-start-add');
const btnStopAdd = shadow.querySelector('#tr-stop-add');
const btnMin = shadow.querySelector('#tr-min-btn');
const btnClose = shadow.querySelector('#tr-close-btn');
const logEl = shadow.querySelector('#tr-log');
const counterEl = shadow.querySelector('#tr-counter');
const stateEl = shadow.querySelector('#tr-state');
const dotEl = shadow.querySelector('#tr-dot');
const titleText = shadow.querySelector('#tr-title-text');
const sessionTimeEl = shadow.querySelector('#tr-session-time');
const lastSessionCountEl = shadow.querySelector('#tr-last-session-count');
const autoCheckbox = shadow.querySelector('#tr-auto-checkbox');
const nextSessionEl = shadow.querySelector('#tr-next-session');
const addQueueEl = shadow.querySelector('#tr-add-queue');

// State Odświeżania
let isMinimized = false, isRefreshing = false;
let currentDone = 0, lastSessionDone = 0, sessionNumber = 1, sessionSummaries = [];
let sessionTimer = null, secondsActive = 0, autoRestartTimeout = null, countdownInterval = null;

// NOWY STATE DODAWARKI (Dynamiczna Kolejka)
let globalAddQueue = [];
let isAddingLoopRunning = false;
let isAdding = false;
let forceStopAdd = false;
let currentAdded = 0; 
let totalToAdd = 0;

function formatTime(sec) { return `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`; }

function updateTitleBar() {
  if (isMinimized) {
    if (isRefreshing) titleText.textContent = `Odśw: ${currentDone} | Czas: ${formatTime(secondsActive)}`;
    else if (isAdding) titleText.textContent = `Dodano: ${currentAdded}/${totalToAdd}`;
    else if (countdownInterval !== null) titleText.textContent = `Wznowienie: ${nextSessionEl.textContent}`;
    else titleText.textContent = `Gotowy (Pauza)`;
  } else titleText.textContent = `Trans Combajn`;
}

function log(msg, type = '') {
  const d = document.createElement('div');
  d.className = 'log-entry ' + type;
  if (type !== 'summary') {
    const now = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    d.textContent = `[${now}] ${msg}`;
  } else d.textContent = msg;
  logEl.appendChild(d);
  logEl.scrollTop = logEl.scrollHeight;
}

function endSession() {
  if (currentDone > 0 || secondsActive > 5) {
    lastSessionDone = currentDone; lastSessionCountEl.textContent = lastSessionDone;
    const timeNow = new Date().toLocaleTimeString('pl-PL', {hour: '2-digit', minute:'2-digit'});
    sessionSummaries.push(`📌 [${timeNow}] Sesja ${sessionNumber} | Czas: ${formatTime(secondsActive)} | Wynik: ${currentDone}`);
    sessionNumber++;
  }
  logEl.innerHTML = ''; sessionSummaries.forEach(s => log(s, 'summary'));
}

function startAutoRestartCountdown() {
  cancelAutoRestart();
  if (!autoCheckbox.checked) { nextSessionEl.textContent = 'Wyłączone'; updateTitleBar(); return; }
  const delayMs = Math.floor(Math.random() * (40 * 60000 - 20 * 60000 + 1)) + 20 * 60000;
  const targetTime = Date.now() + delayMs;
  countdownInterval = setInterval(() => {
    const left = targetTime - Date.now();
    if (left <= 0) {
      clearInterval(countdownInterval); nextSessionEl.textContent = 'Startuję...'; updateTitleBar();
      if (!isRefreshing && !isAdding) btnStart.click(); 
    } else {
      nextSessionEl.textContent = formatTime(Math.floor(left / 1000)); updateTitleBar(); 
    }
  }, 1000);
}

function cancelAutoRestart() { clearInterval(countdownInterval); clearTimeout(autoRestartTimeout); countdownInterval = null; autoRestartTimeout = null; nextSessionEl.textContent = '--:--'; updateTitleBar(); }

autoCheckbox.addEventListener('change', () => { if (!isRefreshing) { autoCheckbox.checked ? startAutoRestartCountdown() : cancelAutoRestart(); }});

btnStart.addEventListener('click', () => {
  if (isAdding) { log('Błąd: Odświeżanie wstrzymane. Trwa dodawanie.', 'error'); return; }
  isRefreshing = true; cancelAutoRestart(); nextSessionEl.textContent = 'Trwa sesja...';
  btnStart.disabled = true; stateEl.textContent = 'Pracuję...'; dotEl.className = 'tr-dot working';
  currentDone = 0; counterEl.textContent = "0";
  logEl.innerHTML = ''; sessionSummaries.forEach(s => log(s, 'summary'));
  log(`--- START SESJI ${sessionNumber} ---`, 'working');
  clearInterval(sessionTimer); secondsActive = 0;
  sessionTimer = setInterval(() => { secondsActive++; sessionTimeEl.textContent = formatTime(secondsActive); updateTitleBar(); }, 1000);
  
  document.dispatchEvent(new CustomEvent('__tr_cmd_ref_start__'));
});

btnStop.addEventListener('click', () => {
  isRefreshing = false; document.dispatchEvent(new CustomEvent('__tr_cmd_ref_stop__'));
  stateEl.textContent = 'Pauza'; dotEl.className = 'tr-dot'; btnStart.disabled = false;
  clearInterval(sessionTimer); endSession(); log('Zatrzymano odświeżanie ręcznie.', 'info'); cancelAutoRestart();
});

document.addEventListener('__tr_ack_prog__', (e) => {
  const msg = JSON.parse(e.detail);
  if (msg.done !== undefined && msg.type !== 'done') { currentDone = msg.done; counterEl.textContent = currentDone; updateTitleBar(); }
  if (msg.type === 'progress') log(msg.text, msg.status);
  if (msg.type === 'done') {
    isRefreshing = false; stateEl.textContent = 'Oczekuje'; dotEl.className = 'tr-dot'; btnStart.disabled = false;
    clearInterval(sessionTimer); endSession(); updateTitleBar();
    if (autoCheckbox.checked) startAutoRestartCountdown();
  }
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ==========================================
// NOWY SYSTEM DODAWANIA W TLE (BUFOROWANIE)
// ==========================================

btnStartAdd.addEventListener('click', async () => {
  const lines = addQueueEl.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) { 
    log('Kolejka pusta! Wklej frachty.', 'error'); 
    return; 
  }

  globalAddQueue.push(...lines);
  addQueueEl.value = ''; 
  
  totalToAdd = currentAdded + globalAddQueue.length;
  updateTitleBar();
  log(`Dorzucono ${lines.length} szt. (Oczekujących w tle: ${globalAddQueue.length})`, 'info');

  if (!isAddingLoopRunning) {
    startAddingLoop();
  }
});

async function startAddingLoop() {
  isAddingLoopRunning = true;
  isAdding = true;
  forceStopAdd = false;

  log(`Uruchamiam silnik dodawarki...`, 'working');

  while (globalAddQueue.length > 0) {
    if (forceStopAdd) break;

    while (isRefreshing) { 
      log('Pauza: Czekam na koniec odświeżania...', 'info'); 
      await sleep(3000); 
    }
    
    const currentText = globalAddQueue.shift(); 
    const index = currentAdded;
    totalToAdd = currentAdded + globalAddQueue.length + 1; 

    document.dispatchEvent(new CustomEvent('__tr_cmd_add_exec__', { 
      detail: JSON.stringify({ text: currentText, index: index, total: totalToAdd }) 
    }));
    
    await new Promise(resolve => {
      const listener = () => { document.removeEventListener('__tr_ack_add_done__', listener); resolve(); };
      document.addEventListener('__tr_ack_add_done__', listener);
    });

    currentAdded++; 
    updateTitleBar(); 
  }

  isAddingLoopRunning = false;
  isAdding = false;
  updateTitleBar();
  
  if (forceStopAdd) {
    log('Zatrzymano silnik dodawania.', 'info');
  } else {
    log('Zakończono! Wszystkie wrzutki zrealizowane.', 'ok');
    currentAdded = 0;
    totalToAdd = 0;
  }
}

btnStopAdd.addEventListener('click', () => {
  forceStopAdd = true; 
  globalAddQueue = []; 
  document.dispatchEvent(new CustomEvent('__tr_cmd_add_stop__'));
  isAdding = false; 
  isAddingLoopRunning = false;
  updateTitleBar(); 
  log('Przerwano i wyczyszczono bufor frachtów.', 'error');
});

// ==========================================

btnMin.addEventListener('click', () => {
  isMinimized = !isMinimized;
  if (isMinimized) { widget.classList.add('minimized'); btnMin.textContent = '□'; } 
  else { widget.classList.remove('minimized'); btnMin.textContent = '—'; }
  updateTitleBar();
});

btnClose.addEventListener('click', () => { document.dispatchEvent(new CustomEvent('__tr_cmd_ref_stop__')); host.remove(); });

let isDragging = false, currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;
shadow.querySelector('#tr-header').addEventListener('mousedown', (e) => {
  if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
  initialX = e.clientX - xOffset; initialY = e.clientY - yOffset; isDragging = true;
});
document.addEventListener('mouseup', () => { initialX = currentX; initialY = currentY; isDragging = false; });
document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    e.preventDefault(); currentX = e.clientX - initialX; currentY = e.clientY - initialY;
    xOffset = currentX; yOffset = currentY; widget.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
  }
});

// --- SKRÓT KLAWISZOWY: ALT + H (Ukrywanie Widgetu) ---
document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'h') {
        const isHidden = host.style.display === 'none';
        host.style.display = isHidden ? 'block' : 'none';
        e.preventDefault();
    }
});