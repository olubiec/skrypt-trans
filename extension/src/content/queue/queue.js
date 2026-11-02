/*
 * Kolejka pozycji: {id, label, fracht, odpis, odpisSource, status, proby, blad, note}.
 * Statusy: czeka | praca | ok | blad. Trwała w chrome.storage.local.
 * Dorzucanie w trakcie pracy nie psuje indeksów, bo pozycje są wyszukiwane po id.
 */
(function () {
  'use strict';
  const T = globalThis.__trc;

  let items = [];
  let seq = 0;
  const listeners = [];

  function newId() {
    seq += 1;
    return `${Date.now().toString(36)}-${seq}-${Math.random().toString(36).slice(2, 6)}`;
  }

  function notify() {
    for (const fn of listeners) fn(items.slice());
  }

  async function persist() {
    await T.store.save({ queue: items });
    notify();
  }

  // Po przeładowaniu strony pozycja „praca" mogła już zostać opublikowana. Nie ponawiamy jej.
  async function init() {
    const st = await T.store.load();
    let changed = false;
    items = st.queue.map((it) => {
      if (it.status !== 'praca') return it;
      changed = true;
      return { ...it, status: 'blad', blad: 'przerwano przy przeładowaniu. Sprawdź w Transie, nie ponawiam', noRetry: true };
    });
    if (changed) await persist();
    else notify();
    return items.slice();
  }

  function list() {
    return items.slice();
  }

  function next() {
    return items.find((i) => i.status === 'czeka') || null;
  }

  function counts() {
    const c = { czeka: 0, praca: 0, ok: 0, blad: 0 };
    for (const i of items) c[i.status] = (c[i.status] || 0) + 1;
    return c;
  }

  // Dodaje pozycje z wklejki. Pozycje z blokerem (zły ODPIS) od razu dostają status blad.
  async function addFrom(raw, settings) {
    const res = T.parser.parse(raw, {
      defaultOdpis: settings.defaultReply,
      maxItems: settings.maxTras
    });
    for (const p of res.items) {
      items.push({
        id: newId(),
        label: p.label,
        fracht: p.fracht,
        odpis: p.odpis,
        odpisSource: p.odpisSource,
        status: p.blocker ? 'blad' : 'czeka',
        proby: 0,
        blad: p.blocker || null,
        noRetry: !!p.blocker,
        note: null
      });
    }
    await persist();
    return res;
  }

  async function patch(id, fields) {
    const it = items.find((i) => i.id === id);
    if (!it) return null;
    Object.assign(it, fields);
    await persist();
    return it;
  }

  async function remove(id) {
    const it = items.find((i) => i.id === id);
    if (!it || it.status === 'praca') return false;
    items = items.filter((i) => i.id !== id);
    await persist();
    return true;
  }

  async function retry(id) {
    const it = items.find((i) => i.id === id);
    if (!it || it.status !== 'blad' || it.noRetry) return false;
    Object.assign(it, { status: 'czeka', blad: null, proby: 0 });
    await persist();
    return true;
  }

  async function clearDone() {
    items = items.filter((i) => i.status !== 'ok');
    await persist();
  }

  T.queue = Object.freeze({
    init, list, next, counts, addFrom, patch, remove, retry, clearDone,
    subscribe(fn) { listeners.push(fn); }
  });
})();
