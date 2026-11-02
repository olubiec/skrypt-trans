/*
 * Widżet w Shadow DOM (tryb closed: strona nie widzi jego elementów).
 * Faza 3: pasek tytułu, test selektorów, wklejka i kolejka, ustawienia, log.
 * Wygląd „dyspozytorski terminal" dochodzi w fazie 5. Bez zewnętrznych fontów i zapytań sieciowych.
 * Wszystkie dane z kolejki wstawiane są przez textContent (nigdy innerHTML).
 */
(function () {
  'use strict';
  const T = (globalThis.__trc ||= {});

  const CSS = `
    :host { all: initial; }
    #w {
      position: fixed; top: 72px; right: 16px; width: 360px; z-index: 2147483000;
      font: 12px/1.4 system-ui, sans-serif; color: #1c1b19; background: #e8e5de;
      border: 1px solid #1c1b19; border-radius: 2px; box-shadow: 3px 3px 0 #1c1b19;
      display: flex; flex-direction: column; box-sizing: border-box; max-height: calc(100vh - 96px);
    }
    #w * { box-sizing: border-box; }
    #w.min #body { display: none; }
    #hd {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 8px; border-bottom: 1px solid #1c1b19; cursor: move; user-select: none;
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; font-weight: 700;
    }
    #ctl { display: flex; gap: 4px; }
    #body { padding: 8px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap; }
    .mono { font-family: ui-monospace, Consolas, monospace; }
    .ok { color: #2b8a3e; } .err { color: #c92a2a; } .warn { color: #9c4a00; }
    button, .btn {
      font: inherit; background: #e8e5de; color: #1c1b19; border: 1px solid #1c1b19;
      border-radius: 2px; padding: 2px 8px; cursor: pointer; line-height: 18px;
    }
    button:disabled { color: #8a8580; border-color: #8a8580; cursor: not-allowed; }
    button:focus-visible, textarea:focus-visible, input:focus-visible {
      outline: 2px solid #d9480f; outline-offset: 1px;
    }
    textarea, input[type=number] {
      font: 11px/1.3 ui-monospace, Consolas, monospace; color: #1c1b19; background: #f4f2ee;
      border: 1px solid #1c1b19; border-radius: 2px; padding: 4px; width: 100%;
    }
    textarea { resize: vertical; min-height: 56px; }
    input[type=number] { width: 64px; }
    .sec { font-weight: 700; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; border-top: 1px solid #1c1b19; padding-top: 6px; }
    .cnt { font-family: ui-monospace, Consolas, monospace; font-size: 11px; }
    .warns { font-size: 11px; color: #9c4a00; margin: 0; padding-left: 16px; }
    table { width: 100%; border-collapse: collapse; font: 11px/1.3 ui-monospace, Consolas, monospace; }
    th, td { text-align: left; border-bottom: 1px solid #b9b5ad; padding: 3px 4px; vertical-align: top; }
    td.act { white-space: nowrap; }
    .q-empty { color: #5f5b55; font-size: 11px; }
    #log {
      height: 150px; overflow-y: auto; background: #f4f2ee; border: 1px solid #1c1b19;
      padding: 6px; font-family: ui-monospace, Consolas, monospace; font-size: 11px;
    }
    .l { white-space: pre-wrap; word-break: break-word; }
    .l.warn { color: #9c4a00; } .l.err { color: #c92a2a; } .l.ok { color: #2b8a3e; }
  `;

  let host = null;
  let root = null;
  let els = {};
  let handlers = {};
  let dragging = false;
  let dx = 0;
  let dy = 0;

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
    els.link.textContent = ok ? 'łącznik: OK' : `łącznik: brak (${detail})`;
    els.link.className = ok ? 'ok' : 'err';
  }

  const STATUS_TAG = { czeka: '[CZEKA]', praca: '[PRACA]', ok: '[OK]', blad: '[ERR]' };
  const STATUS_CLS = { czeka: '', praca: 'warn', ok: 'ok', blad: 'err' };

  function renderQueue(items) {
    if (!els.qBody) return;
    els.qBody.textContent = '';
    if (items.length === 0) {
      els.qEmpty.hidden = false;
      els.qTable.hidden = true;
    } else {
      els.qEmpty.hidden = true;
      els.qTable.hidden = false;
    }
    items.forEach((it, idx) => {
      const tr = document.createElement('tr');
      const cells = [String(idx + 1), it.label, null, it.blad || it.note || ''];
      cells.forEach((value, col) => {
        const td = document.createElement('td');
        if (col === 2) {
          td.textContent = STATUS_TAG[it.status] || it.status;
          td.className = STATUS_CLS[it.status] || '';
        } else {
          td.textContent = value;
        }
        tr.appendChild(td);
      });
      const act = document.createElement('td');
      act.className = 'act';
      if (it.status === 'blad' && !it.noRetry) act.appendChild(actionButton('ponów', 'retry', it.id));
      if (it.status !== 'praca') act.appendChild(actionButton('usuń', 'remove', it.id));
      tr.appendChild(act);
      els.qBody.appendChild(tr);
    });

    const c = { czeka: 0, praca: 0, ok: 0, blad: 0 };
    for (const it of items) c[it.status] = (c[it.status] || 0) + 1;
    els.counts.textContent = `OK ${c.ok} · BŁĄD ${c.blad} · CZEKA ${c.czeka}`;
  }

  function actionButton(label, action, id) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.dataset.action = action;
    b.dataset.id = id;
    b.style.marginLeft = '2px';
    return b;
  }

  function setRunning(running) {
    if (!els.start) return;
    els.start.disabled = running;
    els.stop.disabled = !running;
    els.addBtn.disabled = false;
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
    w.innerHTML = `
      <div id="hd">
        <span>TRANS//COMBAJN v5</span>
        <span id="ctl">
          <button type="button" id="bmin" title="Minimalizuj">_</button>
          <button type="button" id="bx" title="Zamknij">x</button>
        </span>
      </div>
      <div id="body">
        <div class="row"><span id="link" class="err">łącznik: sprawdzam</span><span class="mono">Alt+H</span></div>
        <div class="row"><button type="button" id="btest">Test selektorów</button></div>

        <div class="sec">Odświeżanie</div>
        <div class="row mono"><span id="rstate">Pauza</span><span id="rcount">0</span></div>
        <div class="row mono"><span>Czas sesji</span><span id="relapsed">00:00</span></div>
        <div class="row mono"><span>Następna sesja</span><span id="rnext">--:--</span></div>
        <div class="row">
          <label><input type="checkbox" id="rauto" checked> Wznowienie automatyczne</label>
          <span>
            <button type="button" id="rstart">Start</button>
            <button type="button" id="rstop" disabled>Stop</button>
          </span>
        </div>

        <div class="sec">Wklejka i kolejka</div>
        <textarea id="paste" placeholder="@@ etykieta&#10;FRACHT: ...&#10;ODPIS: ..."></textarea>
        <div class="row">
          <button type="button" id="badd">Dodaj do kolejki</button>
          <span class="cnt" id="counts">OK 0 · BŁĄD 0 · CZEKA 0</span>
        </div>
        <ul class="warns" id="warns" hidden></ul>
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

        <div class="sec">Ustawienia</div>
        <label class="row"><span>Tryb próbny (bez publikacji)</span><input type="checkbox" id="dryrun"></label>
        <label class="row"><span>Szablon ODPIS (domyślny)</span><span class="cnt" id="replycnt">0 / 600</span></label>
        <textarea id="replydef" placeholder="Użyty, gdy trasa nie ma własnego ODPIS. Placeholdery: {zaladunek} {rozladunek} {data} {etykieta}"></textarea>
        <div class="row">
          <span>Przerwa między frachtami (s)</span>
          <span><input type="number" id="pmin" min="3" max="300"> – <input type="number" id="pmax" min="3" max="300"></span>
        </div>
        <div class="row">
          <span>Odświeżanie: wznowienie co (min)</span>
          <span><input type="number" id="rmin" min="1" max="240"> – <input type="number" id="rmax" min="1" max="240"></span>
        </div>
        <div class="row">
          <span>Limit tras na wklejkę</span>
          <input type="number" id="maxtras" min="1" max="50">
        </div>
        <div class="row"><button type="button" id="bsave">Zapisz ustawienia</button></div>

        <div class="sec">Log</div>
        <div id="log" role="log" aria-live="polite"></div>
      </div>`;
    root.appendChild(w);

    const q = (id) => root.getElementById(id);
    els = {
      w,
      hd: q('hd'),
      min: q('bmin'),
      x: q('bx'),
      link: q('link'),
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
      rstate: q('rstate'),
      rcount: q('rcount'),
      relapsed: q('relapsed'),
      rnext: q('rnext'),
      rauto: q('rauto'),
      rstart: q('rstart'),
      rstop: q('rstop'),
      rmin: q('rmin'),
      rmax: q('rmax'),
      save: q('bsave'),
      log: q('log')
    };

    els.test.addEventListener('click', () => handlers.onTest && handlers.onTest());
    els.min.addEventListener('click', () => {
      w.classList.toggle('min');
      els.min.textContent = w.classList.contains('min') ? '□' : '_';
    });
    els.x.addEventListener('click', () => handlers.onClose && handlers.onClose());
    els.addBtn.addEventListener('click', () => {
      const text = els.paste.value;
      if (handlers.onQueueAdd) handlers.onQueueAdd(text);
    });
    els.start.addEventListener('click', () => handlers.onStart && handlers.onStart());
    els.stop.addEventListener('click', () => handlers.onStop && handlers.onStop());
    els.clr.addEventListener('click', () => handlers.onClearDone && handlers.onClearDone());
    els.rstart.addEventListener('click', () => handlers.onRefreshStart && handlers.onRefreshStart());
    els.rstop.addEventListener('click', () => handlers.onRefreshStop && handlers.onRefreshStop());
    els.rauto.addEventListener('change', () => handlers.onAuto && handlers.onAuto(els.rauto.checked));
    els.save.addEventListener('click', () => handlers.onSaveSettings && handlers.onSaveSettings(readSettings()));
    els.defaultReply.addEventListener('input', updateReplyCounter);
    els.qBody.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-action]');
      if (b && handlers.onAction) handlers.onAction(b.dataset.action, b.dataset.id);
    });

    els.hd.addEventListener('mousedown', onDragStart);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('keydown', onKeyDown);

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

  function setRefresh(snap) {
    if (!els.rstate) return;
    els.rstate.textContent = snap.running ? 'Pracuję' : snap.auto ? 'Czeka na wznowienie' : 'Wyłączone';
    els.rstate.className = snap.running ? 'warn' : '';
    els.rcount.textContent = String(snap.count);
    els.relapsed.textContent = fmtTime(snap.elapsedSec);
    els.rnext.textContent = snap.nextInSec === null ? '--:--' : fmtTime(snap.nextInSec);
    els.rauto.checked = !!snap.auto;
    els.rstart.disabled = snap.running;
    els.rstop.disabled = !snap.running;
  }

  function fmtTime(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  function clearPaste() {
    if (els.paste) els.paste.value = '';
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
    renderQueue,
    setRunning,
    setRefresh,
    setWarnings,
    setSettings,
    clearPaste,
    get root() { return root; }
  });
})();
