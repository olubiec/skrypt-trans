// Elementy UI - Dodawarka
const freightsEl = document.getElementById('freights');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const logEl = document.getElementById('log');

// Elementy UI - Odświeżarka
const toggleRefreshBtn = document.getElementById('toggleRefreshBtn');
const refreshDot = document.getElementById('refreshDot');
const refreshStatusText = document.getElementById('refreshStatusText');

// Funkcja logowania w okienku
function log(msg, type = '') {
  const d = document.createElement('div');
  d.className = 'entry ' + type;
  const now = new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  d.textContent = `[${now}] ${msg}`;
  logEl.appendChild(d);
  logEl.scrollTop = logEl.scrollHeight;
}

// --- LOGIKA ODŚWIEŻARKI ---
// Przy starcie popupu, sprawdzamy czy odświeżanie działa w tle
chrome.storage.local.get(['isRefreshingActive'], (result) => {
    if (result.isRefreshingActive) {
        setRefreshUI(true);
    }
});

toggleRefreshBtn.addEventListener('click', () => {
    chrome.storage.local.get(['isRefreshingActive'], (result) => {
        const isActive = result.isRefreshingActive;
        if (isActive) {
            chrome.runtime.sendMessage({ action: 'stopAutoRefresh' });
            setRefreshUI(false);
            log('Zatrzymano Auto-Odświeżanie', 'err');
        } else {
            chrome.runtime.sendMessage({ action: 'startAutoRefresh', interval: 5 }); // Co 5 minut
            setRefreshUI(true);
            log('Uruchomiono Auto-Odświeżanie (co 5 min)', 'ok');
        }
    });
});

function setRefreshUI(isActive) {
    if (isActive) {
        refreshDot.classList.add('active');
        refreshStatusText.textContent = "Aktywne";
        toggleRefreshBtn.textContent = "Wyłącz";
        toggleRefreshBtn.classList.add('on');
    } else {
        refreshDot.classList.remove('active');
        refreshStatusText.textContent = "Wyłączone";
        toggleRefreshBtn.textContent = "Włącz (5 min)";
        toggleRefreshBtn.classList.remove('on');
    }
}

// --- LOGIKA DODAWARKI ---
startBtn.addEventListener('click', async () => {
  const lines = freightsEl.value.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) {
    log('Brak frachtów w kolejce!', 'err');
    return;
  }

  startBtn.disabled = true;
  log(`Start: ${lines.length} zadania w kolejce.`, 'info');

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url.includes('platform.trans.eu')) {
    log('Błąd: Otwórz formularz dodawania na Trans.eu!', 'err');
    startBtn.disabled = false;
    return;
  }

  // Wysyłamy polecenie do content.js
  chrome.tabs.sendMessage(tab.id, {
    action: 'startAdding',
    freights: lines,
    delayMin: 2000,
    delayMax: 4500
  });
});

stopBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    chrome.tabs.sendMessage(tab.id, { action: 'stop' });
  }
  startBtn.disabled = false;
  log('Przerwano dodawanie.', 'err');
});

// Nasłuchiwanie logów z content.js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'progress') {
    log(msg.text, msg.status);
  }
  if (msg.type === 'done') {
    startBtn.disabled = false;
    log(`Zakończono kolejkę! Dodano ${msg.done} frachtów.`, 'ok');
  }
});