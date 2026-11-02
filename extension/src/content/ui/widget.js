/*
 * Widżet w Shadow DOM (tryb closed: strona nie widzi jego elementów).
 * Faza 1: pasek tytułu, przeciąganie, minimalizacja, zamknięcie, Alt+H, log i status łącznika.
 * Kolejne fazy dopisują zakładki i moduły. Bez zewnętrznych fontów i zapytań sieciowych.
 */
(function () {
  'use strict';
  const T = (globalThis.__trc ||= {});

  const CSS = `
    :host { all: initial; }
    #w {
      position: fixed; top: 72px; right: 16px; width: 340px; z-index: 2147483000;
      font: 12px/1.4 system-ui, sans-serif; color: #1c1b19; background: #e8e5de;
      border: 1px solid #1c1b19; border-radius: 2px; box-shadow: 3px 3px 0 #1c1b19;
      display: flex; flex-direction: column; box-sizing: border-box;
    }
    #w * { box-sizing: border-box; }
    #w.min #body { display: none; }
    #hd {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 8px; border-bottom: 1px solid #1c1b19; cursor: move; user-select: none;
      font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; font-weight: 700;
    }
    #ctl { display: flex; gap: 4px; }
    #ctl button {
      font: inherit; background: none; border: 1px solid #1c1b19; border-radius: 2px;
      color: #1c1b19; cursor: pointer; padding: 0 6px; line-height: 16px;
    }
    #ctl button:focus-visible { outline: 2px solid #d9480f; outline-offset: 1px; }
    #body { padding: 8px; display: flex; flex-direction: column; gap: 8px; }
    .row { display: flex; justify-content: space-between; gap: 8px; font-family: ui-monospace, Consolas, monospace; }
    .ok { color: #2b8a3e; } .err { color: #c92a2a; }
    #log {
      height: 160px; overflow-y: auto; background: #f4f2ee; border: 1px solid #1c1b19;
      padding: 6px; font-family: ui-monospace, Consolas, monospace; font-size: 11px;
    }
    .l { white-space: pre-wrap; word-break: break-word; }
    .l.warn { color: #9c4a00; } .l.err { color: #c92a2a; } .l.ok { color: #2b8a3e; }
  `;

  let host = null;
  let root = null;
  let els = {};
  let dragging = false;
  let dx = 0;
  let dy = 0;
  let onClose = () => {};

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

  function mount(handlers = {}) {
    onClose = handlers.onClose || onClose;
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
        <div class="row"><span id="link" class="err">łącznik: sprawdzam</span><span>Alt+H</span></div>
        <div id="log" role="log" aria-live="polite"></div>
      </div>`;
    root.appendChild(w);

    els = {
      w,
      hd: root.getElementById('hd'),
      body: root.getElementById('body'),
      min: root.getElementById('bmin'),
      x: root.getElementById('bx'),
      link: root.getElementById('link'),
      log: root.getElementById('log')
    };

    els.min.addEventListener('click', () => {
      w.classList.toggle('min');
      els.min.textContent = w.classList.contains('min') ? '□' : '_';
    });
    els.x.addEventListener('click', () => onClose());

    els.hd.addEventListener('mousedown', onDragStart);
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('keydown', onKeyDown);

    log('Widżet gotowy.');
  }

  // Obsługa przeciągania i skrótu trzymana na poziomie modułu, żeby unmount mógł je zdjąć.
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
  }

  T.ui = Object.freeze({
    mount,
    unmount,
    log,
    setLink,
    get root() { return root; },
    get els() { return els; }
  });
})();
