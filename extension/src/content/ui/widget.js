/*
 * Widżet w Shadow DOM (tryb closed: strona nie widzi jego elementów).
 * Motyw „dyspozytorski terminal": płasko, monospace, bez gradientów, blur i emoji.
 * Zakładki ODŚW | DODAJ | LOG. Minimalizacja do jednej linii z podsumowaniem.
 * Kolory jako tokeny na :host, ciemny motyw (system lub przełącznik). Kontrast tekstu min. 4.5:1.
 * Dane z kolejki wstawiane przez textContent. Zero zewnętrznych fontów i zapytań.
 */
(function () {
  'use strict';
  const T = (globalThis.__trc ||= {});

  const CSS = `
    :host {
      all: initial;
      --bg: #e8e5de; --panel: #f4f2ee; --fg: #1c1b19; --line: #1c1b19; --muted: #5f5b55;
      --accent: #d9480f; --ok: #1e6b2c; --err: #a61e1e; --warn: #8a4500; --shadow: #1c1b19;
    }
    @media (prefers-color-scheme: dark) {
      :host(:not([data-theme="light"])) {
        --bg: #1f1e1b; --panel: #2a2925; --fg: #ece9e2; --line: #ece9e2; --muted: #a7a196;
        --accent: #ff8a4c; --ok: #8fd19e; --err: #ff8c8c; --warn: #ffb066; --shadow: #000;
      }
    }
    :host([data-theme="dark"]) {
      --bg: #1f1e1b; --panel: #2a2925; --fg: #ece9e2; --line: #ece9e2; --muted: #a7a196;
      --accent: #ff8a4c; --ok: #8fd19e; --err: #ff8c8c; --warn: #ffb066; --shadow: #000;
    }
    #w {
      position: fixed; top: 72px; right: 16px; width: min(364px, calc(100vw - 32px)); z-index: 2147483000;
      font: 12px/1.4 system-ui, sans-serif; color: var(--fg); background: var(--bg);
      border: 1px solid var(--line); border-radius: 2px; box-shadow: 3px 3px 0 var(--shadow);
      display: flex; flex-direction: column; box-sizing: border-box; max-height: calc(100vh - 96px);
    }
    #w * { box-sizing: border-box; }
    .mono { font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; }
    .muted { color: var(--muted); }
    .ok { color: var(--ok); } .err { color: var(--err); } .warn { color: var(--warn); }

    #hd {
      display: flex; justify-content: space-between; align-items: center; gap: 6px;
      padding: 5px 8px; border-bottom: 1px solid var(--line); cursor: move; user-select: none;
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; font-weight: 700;
    }
    #hd .brand { white-space: nowrap; }
    #mini { display: none; font-weight: 400; font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    #w.min #mini { display: inline; }
    #ctl { display: flex; gap: 4px; flex: none; }
    #w.min #body { display: none; }

    button, .btn {
      font: inherit; background: var(--bg); color: var(--fg); border: 1px solid var(--line);
      border-radius: 2px; padding: 2px 8px; cursor: pointer; line-height: 18px;
    }
    button:hover:not(:disabled) { background: var(--line); color: var(--bg); }
    button:disabled { color: var(--muted); border-color: var(--muted); cursor: not-allowed; }
    button:focus-visible, textarea:focus-visible, input:focus-visible, summary:focus-visible {
      outline: 2px solid var(--accent); outline-offset: 1px;
    }
    #ctl button { padding: 0 6px; }

    #body { padding: 8px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
    .tabs { display: flex; gap: 0; border: 1px solid var(--line); }
    .tabs button {
      flex: 1; border: 0; border-right: 1px solid var(--line); border-radius: 0;
      font-family: ui-monospace, Consolas, monospace; font-weight: 700; letter-spacing: .04em;
      padding: 4px 0;
    }
    .tabs button:last-child { border-right: 0; }
    .tabs button[aria-selected="true"] { background: var(--line); color: var(--bg); }
    .panel { display: flex; flex-direction: column; gap: 8px; }
    .panel[hidden] { display: none; }

    .row { display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap; }
    .kv { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; font-family: ui-monospace, Consolas, monospace; }
    .kv b { font-weight: 700; text-align: right; }
    .sec {
      font-weight: 700; font-size: 11px; letter-spacing: .08em; text-transform: uppercase;
      border-bottom: 1px solid var(--line); padding-bottom: 2px; margin-top: 4px;
    }
    .cnt { font-family: ui-monospace, Consolas, monospace; font-size: 11px; }
    .hint { font-size: 11px; color: var(--muted); }

    textarea, input[type=number] {
      font: 11px/1.3 ui-monospace, Consolas, monospace; color: var(--fg); background: var(--panel);
      border: 1px solid var(--line); border-radius: 2px; padding: 4px; width: 100%;
    }
    textarea { resize: vertical; min-height: 56px; }
    input[type=number] { width: 64px; }
    input[type=checkbox] { accent-color: var(--fg); }

    .warns { font-size: 11px; color: var(--warn); margin: 0; padding-left: 16px; }
    table { width: 100%; border-collapse: collapse; font: 11px/1.3 ui-monospace, Consolas, monospace; }
    th, td { text-align: left; border-bottom: 1px solid var(--muted); padding: 3px 4px; vertical-align: top; }
    th { font-weight: 700; }
    td.act { white-space: nowrap; }
    td.note { color: var(--muted); font-size: 10px; overflow-wrap: break-word; min-width: 80px; }
    .q-empty { color: var(--muted); font-size: 11px; }

    .st { white-space: nowrap; font-weight: 700; }
    .dot {
      display: inline-block; width: 8px; height: 8px; border: 1px solid currentColor;
      margin-right: 4px; vertical-align: middle;
    }
    .st-czeka { color: var(--muted); }
    .st-czeka .dot { background: transparent; }
    .st-praca { color: var(--warn); }
    .st-praca .dot, .st-ok .dot, .st-blad .dot { background: currentColor; }
    .st-ok { color: var(--ok); }
    .st-blad { color: var(--err); }

    details { border: 1px solid var(--line); padding: 4px 6px; }
    summary { cursor: pointer; font-weight: 700; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; }
    details > div { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }

    #log {
      height: 230px; overflow-y: auto; background: var(--panel); border: 1px solid var(--line);
      padding: 6px; font-family: ui-monospace, Consolas, monospace; font-size: 11px;
    }
    .l { white-space: pre-wrap; word-break: break-word; }
    .l.warn { color: var(--warn); } .l.err { color: var(--err); } .l.ok { color: var(--ok); }
    .l.working { color: var(--fg); font-weight: 700; }
  `;

  const STATUS = {
    czeka: { tag: '[CZEKA]', cls: 'st-czeka' },
    praca: { tag: '[PRACA]', cls: 'st-praca' },
    ok: { tag: '[OK]', cls: 'st-ok' },
    blad: { tag: '[ERR]', cls: 'st-blad' }
  };

  let host = null;
  let root = null;
  let els = {};
  let handlers = {};
  let dragging = false;
  let dx = 0;
  let dy = 0;
  let theme = null;

  function ts() {
    return new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function log(msg, level = 'info') {
    if (!els.log) return;
    const d = document.createElement('div');
    d.className = `l ${level === 'info' ? '' : level}`.trim();
    d.textContent = `${ts()} ${msg}`;
    els.log.appendChild(d);
    while (els.log.childElementCount > 300) els.log.firstElementChild.remove();
    els.log.scrollTop = els.log.scrollHeight;
  }

  function setLink(ok, detail = '') {
    if (!els.link) return;
    els.link.textContent = ok ? 'ŁĄCZNIK: OK' : `ŁĄCZNIK: BRAK (${detail})`;
    els.link.className = ok ? 'ok mono' : 'err mono';
  }

  function setSummary(text) {
    if (els.mini) els.mini.textContent = text;
  }

  function selectTab(name) {
    for (const btn of els.tabs) {
      const on = btn.dataset.tab === name;
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
      btn.tabIndex = on ? 0 : -1;
    }
    els.panels.forEach((p) => { p.hidden = p.dataset.panel !== name; });
    try {
      localStorage.setItem('trc-tab', name);
    } catch (err) {
      console.warn('[trc] nie zapisano zakładki:', err.message);
    }
  }

  function applyTheme(value) {
    theme = value;
    if (host) {
      if (value) host.setAttribute('data-theme', value);
      else host.removeAttribute('data-theme');
    }
    try {
      if (value) localStorage.setItem('trc-theme', value);
      else localStorage.removeItem('trc-theme');
    } catch (err) {
      console.warn('[trc] nie zapisano motywu:', err.message);
    }
  }

  function renderQueue(items) {
    if (!els.qBody) return;
    els.qBody.textContent = '';
    els.qEmpty.hidden = items.length > 0;
    els.qTable.hidden = items.length === 0;
    items.forEach((it, idx) => {
      const tr = document.createElement('tr');

      const num = document.createElement('td');
      num.textContent = String(idx + 1);
      tr.appendChild(num);

      const label = document.createElement('td');
      label.textContent = it.label;
      tr.appendChild(label);

      const st = STATUS[it.status] || { tag: it.status, cls: '' };
      const status = document.createElement('td');
      status.className = `st ${st.cls}`;
      const dot = document.createElement('span');
      dot.className = 'dot';
      dot.setAttribute('aria-hidden', 'true');
      status.appendChild(dot);
      status.appendChild(document.createTextNode(st.tag));
      tr.appendChild(status);

      const note = document.createElement('td');
      note.className = 'note';
      note.textContent = it.blad || it.note || '';
      tr.appendChild(note);

      const act = document.createElement('td');
      act.className = 'act';
      if (it.status === 'blad' && !it.noRetry) act.appendChild(actionButton('ponów', 'retry', it.id));
      if (it.status !== 'praca') act.appendChild(actionButton('usuń', 'remove', it.id));
      tr.appendChild(act);

      els.qBody.appendChild(tr);
    });

    const c = { czeka: 0, praca: 0, ok: 0, blad: 0 };
    for (const it of items) c[it.status] = (c[it.status] || 0) + 1;
    els.counts.textContent = `OK ${c.ok} · ERR ${c.blad} · CZEKA ${c.czeka}`;
  }

  function actionButton(label, action, id) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset.action = action;
    b.dataset.id = id;
    b.setAttribute('aria-label', `${label} pozycję`);
    b.style.marginLeft = '4px';
    return b;
  }

  function setRunning(running) {
    if (!els.start) return;
    els.start.disabled = running;
    els.stop.disabled = !running;
  }

  function setWarnings(list) {
    if (!els.warns) return;
    els.warns.textContent = '';
    for (const w of list) {
      const li = document.createElement('li');
      li.textContent = w;
      els.warns.appendChild(li);
    }
    els.warns.hidden = list.length === 0;
  }

  function setSettings(s) {
    if (!els.dryRun) return;
    els.dryRun.checked = !!s.dryRun;
    els.defaultReply.value = s.defaultReply || '';
    els.pacingMin.value = s.pacingMinSec;
    els.pacingMax.value = s.pacingMaxSec;
    els.maxTras.value = s.maxTras;
    els.rmin.value = s.refreshMinMin;
    els.rmax.value = s.refreshMaxMin;
    updateReplyCounter();
  }

  function readSettings() {
    return {
      dryRun: els.dryRun.checked,
      defaultReply: els.defaultReply.value,
      pacingMinSec: Math.max(3, Number(els.pacingMin.value) || 8),
      pacingMaxSec: Math.max(3, Number(els.pacingMax.value) || 20),
      maxTras: Math.max(1, Math.min(50, Number(els.maxTras.value) || 20)),
      refreshMinMin: Math.max(1, Number(els.rmin.value) || 20),
      refreshMaxMin: Math.max(1, Number(els.rmax.value) || 40)
    };
  }

  function updateReplyCounter() {
    if (!els.replyCnt) return;
    const n = els.defaultReply.value.length;
    els.replyCnt.textContent = `${n} / 600`;
    els.replyCnt.className = `cnt ${n > 600 ? 'err' : ''}`;
  }

  function fmtTime(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  function setRefresh(snap) {
    if (!els.rstate) return;
    els.rstate.textContent = snap.running ? 'PRACUJE' : snap.auto ? 'CZEKA' : 'WYŁĄCZONE';
    els.rstate.className = `mono ${snap.running ? 'warn' : ''}`;
    els.rcount.textContent = String(snap.count);
    els.relapsed.textContent = fmtTime(snap.elapsedSec);
    els.rnext.textContent = snap.nextInSec === null ? '--:--' : fmtTime(snap.nextInSec);
    els.rauto.checked = !!snap.auto;
    els.rstart.disabled = snap.running;
    els.rstop.disabled = !snap.running;
  }

  function clearPaste() {
    if (els.paste) els.paste.value = '';
  }

  function mount(h = {}) {
    handlers = h;
    if (host) return;

    host = document.createElement('div');
    host.id = 'trc-host-' + Math.random().toString(36).slice(2, 10);
    document.body.appendChild(host);
    root = host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = CSS;
    root.appendChild(style);

    const w = document.createElement('div');
    w.id = 'w';
    // Szkielet statyczny: żadnych danych z konta w innerHTML.
    w.innerHTML = `
      <div id="hd">
        <span class="brand">TRANS//COMBAJN <span id="ver">v5</span></span>
        <span id="mini" aria-live="polite"></span>
        <span id="ctl">
          <button type="button" id="btheme" title="Przełącz motyw" aria-label="Przełącz motyw">◐</button>
          <button type="button" id="bmin" title="Minimalizuj" aria-label="Minimalizuj">_</button>
          <button type="button" id="bx" title="Zamknij" aria-label="Zamknij">x</button>
        </span>
      </div>
      <div id="body">
        <div class="tabs" role="tablist" aria-label="Sekcje">
          <button type="button" role="tab" data-tab="refresh" aria-selected="true" aria-controls="p-refresh">ODŚW</button>
          <button type="button" role="tab" data-tab="add" aria-selected="false" aria-controls="p-add">DODAJ</button>
          <button type="button" role="tab" data-tab="log" aria-selected="false" aria-controls="p-log">LOG</button>
        </div>

        <section class="panel" id="p-refresh" data-panel="refresh" role="tabpanel">
          <div class="row"><span id="link" class="err mono">ŁĄCZNIK: SPRAWDZAM</span><span class="hint mono">Alt+H ukryj · Esc stop</span></div>
          <div class="kv">
            <span>Stan</span><b id="rstate" class="mono">PAUZA</b>
            <span>Odświeżeń (sesja)</span><b id="rcount">0</b>
            <span>Czas sesji</span><b id="relapsed">00:00</b>
            <span>Następna sesja</span><b id="rnext">--:--</b>
          </div>
          <div class="row">
            <label><input type="checkbox" id="rauto"> Wznowienie automatyczne</label>
          </div>
          <div class="row">
            <button type="button" id="rstart">Start</button>
            <button type="button" id="rstop" disabled>Stop</button>
          </div>
        </section>

        <section class="panel" id="p-add" data-panel="add" role="tabpanel" hidden>
          <div class="sec">Wklejka</div>
          <textarea id="paste" aria-label="Wklejka tras" placeholder="@@ etykieta&#10;FRACHT: ...&#10;ODPIS: ..."></textarea>
          <div class="row">
            <button type="button" id="badd">Dodaj do kolejki</button>
            <span class="cnt" id="counts">OK 0 · ERR 0 · CZEKA 0</span>
          </div>
          <ul class="warns" id="warns" hidden></ul>
          <div class="sec">Kolejka</div>
          <div class="q-empty" id="qempty">Kolejka pusta.</div>
          <table id="qtable" hidden>
            <thead><tr><th>#</th><th>TRASA</th><th>STATUS</th><th>UWAGI</th><th></th></tr></thead>
            <tbody id="qbody"></tbody>
          </table>
          <div class="row">
            <button type="button" id="bstart">Start</button>
            <button type="button" id="bstop" disabled>Stop</button>
            <button type="button" id="bclr">Usuń zakończone</button>
          </div>
          <details>
            <summary>Ustawienia</summary>
            <div>
              <label class="row"><span>Tryb próbny (bez publikacji)</span><input type="checkbox" id="dryrun"></label>
              <div class="row"><span>Szablon ODPIS (domyślny)</span><span class="cnt" id="replycnt">0 / 600</span></div>
              <textarea id="replydef" aria-label="Szablon domyślnego ODPIS" placeholder="Użyty, gdy trasa nie ma własnego ODPIS. Placeholdery: {zaladunek} {rozladunek} {data} {etykieta}"></textarea>
              <div class="row">
                <span>Przerwa między frachtami (s)</span>
                <span><input type="number" id="pmin" min="3" max="300" aria-label="Przerwa minimalna"> – <input type="number" id="pmax" min="3" max="300" aria-label="Przerwa maksymalna"></span>
              </div>
              <div class="row">
                <span>Limit tras na wklejkę</span>
                <input type="number" id="maxtras" min="1" max="50" aria-label="Limit tras">
              </div>
              <div class="row">
                <span>Odświeżanie: wznowienie co (min)</span>
                <span><input type="number" id="rmin" min="1" max="240" aria-label="Wznowienie minimalnie"> – <input type="number" id="rmax" min="1" max="240" aria-label="Wznowienie maksymalnie"></span>
              </div>
              <div class="row"><button type="button" id="bsave">Zapisz ustawienia</button></div>
            </div>
          </details>
        </section>

        <section class="panel" id="p-log" data-panel="log" role="tabpanel" hidden>
          <div class="row">
            <span class="sec" style="border:0;margin:0">Dziennik</span>
            <button type="button" id="btest">Test selektorów</button>
          </div>
          <div id="log" role="log" aria-live="polite"></div>
        </section>
      </div>`;
    root.appendChild(w);

    const q = (id) => root.getElementById(id);
    els = {
      w,
      hd: q('hd'),
      mini: q('mini'),
      theme: q('btheme'),
      min: q('bmin'),
      x: q('bx'),
      link: q('link'),
      tabs: Array.from(root.querySelectorAll('[role="tab"]')),
      panels: Array.from(root.querySelectorAll('[data-panel]')),
      test: q('btest'),
      paste: q('paste'),
      addBtn: q('badd'),
      counts: q('counts'),
      warns: q('warns'),
      qEmpty: q('qempty'),
      qTable: q('qtable'),
      qBody: q('qbody'),
      start: q('bstart'),
      stop: q('bstop'),
      clr: q('bclr'),
      dryRun: q('dryrun'),
      defaultReply: q('replydef'),
      replyCnt: q('replycnt'),
      pacingMin: q('pmin'),
      pacingMax: q('pmax'),
      maxTras: q('maxtras'),
      save: q('bsave'),
      rstate: q('rstate'),
      rcount: q('rcount'),
      relapsed: q('relapsed'),
      rnext: q('rnext'),
      rauto: q('rauto'),
      rstart: q('rstart'),
      rstop: q('rstop'),
      rmin: q('rmin'),
      rmax: q('rmax'),
      log: q('log')
    };

    els.tabs.forEach((btn) => btn.addEventListener('click', () => selectTab(btn.dataset.tab)));
    els.tabs.forEach((btn, i) => btn.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = els.tabs[(i + (e.key === 'ArrowRight' ? 1 : els.tabs.length - 1)) % els.tabs.length];
      next.focus();
      selectTab(next.dataset.tab);
    }));

    els.theme.addEventListener('click', () => {
      const dark = theme === 'dark' || (theme === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
      applyTheme(dark ? 'light' : 'dark');
    });
    els.test.addEventListener('click', () => handlers.onTest && handlers.onTest());
    els.min.addEventListener('click', () => {
      const minimized = w.classList.toggle('min');
      els.min.textContent = minimized ? '□' : '_';
      els.min.setAttribute('aria-label', minimized ? 'Rozwiń' : 'Minimalizuj');
    });
    els.x.addEventListener('click', () => handlers.onClose && handlers.onClose());
    els.addBtn.addEventListener('click', () => handlers.onQueueAdd && handlers.onQueueAdd(els.paste.value));
    els.start.addEventListener('click', () => handlers.onStart && handlers.onStart());
    els.stop.addEventListener('click', () => handlers.onStop && handlers.onStop());
    els.clr.addEventListener('click', () => handlers.onClearDone && handlers.onClearDone());
    els.save.addEventListener('click', () => handlers.onSaveSettings && handlers.onSaveSettings(readSettings()));
    els.defaultReply.addEventListener('input', updateReplyCounter);
    els.rstart.addEventListener('click', () => handlers.onRefreshStart && handlers.onRefreshStart());
    els.rstop.addEventListener('click', () => handlers.onRefreshStop && handlers.onRefreshStop());
    els.rauto.addEventListener('change', () => handlers.onAuto && handlers.onAuto(els.rauto.checked));
    els.qBody.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-action]');
      if (b && handlers.onAction) handlers.onAction(b.dataset.action, b.dataset.id);
    });

    els.hd.addEventListener('mousedown', onDragStart);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('keydown', onKeyDown);

    let savedTab = 'refresh';
    let savedTheme = null;
    try {
      savedTab = localStorage.getItem('trc-tab') || 'refresh';
      savedTheme = localStorage.getItem('trc-theme');
    } catch (err) {
      console.warn('[trc] brak localStorage:', err.message);
    }
    selectTab(['refresh', 'add', 'log'].includes(savedTab) ? savedTab : 'refresh');
    applyTheme(savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : null);

    log('Widżet gotowy.');
  }

  // Obsługa przeciągania i skrótu na poziomie modułu, żeby unmount mógł je zdjąć.
  function onDragStart(e) {
    if (e.target.closest('button')) return;
    dragging = true;
    dx = e.clientX - els.w.offsetLeft;
    dy = e.clientY - els.w.offsetTop;
    e.preventDefault();
  }

  function onDragMove(e) {
    if (!dragging) return;
    els.w.style.left = Math.max(0, e.clientX - dx) + 'px';
    els.w.style.top = Math.max(0, e.clientY - dy) + 'px';
    els.w.style.right = 'auto';
  }

  function onDragEnd() {
    dragging = false;
  }

  function onKeyDown(e) {
    if (e.altKey && e.key.toLowerCase() === 'h' && host) {
      host.style.display = host.style.display === 'none' ? '' : 'none';
      e.preventDefault();
    }
  }

  function unmount() {
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('keydown', onKeyDown);
    if (host) host.remove();
    host = null;
    root = null;
    els = {};
    handlers = {};
  }

  T.ui = Object.freeze({
    mount,
    unmount,
    log,
    setLink,
    setSummary,
    selectTab,
    renderQueue,
    setRunning,
    setRefresh,
    setWarnings,
    setSettings,
    clearPaste,
    get root() { return root; }
  });
})();
