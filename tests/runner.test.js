// Test silnika dodawania (queue + runner) z atrapami magistrali, storage i widżetu.
// Ładuje prawdziwe pliki rozszerzenia. Uruchomienie: node --test tests/runner.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const EXT = path.join(__dirname, '..', 'extension', 'src');
const FILES = [
  'shared/proto.js', 'shared/text.js', 'shared/parser.js',
  'content/state/store.js', 'content/queue/queue.js', 'content/queue/runner.js'
];

function setup({ script, settings = {} }) {
  const memStore = {};
  globalThis.chrome = {
    storage: {
      local: {
        async get(keys) {
          const out = {};
          for (const k of keys) if (k in memStore) out[k] = JSON.parse(JSON.stringify(memStore[k]));
          return out;
        },
        async set(obj) {
          for (const [k, v] of Object.entries(obj)) memStore[k] = JSON.parse(JSON.stringify(v));
        }
      }
    }
  };
  memStore.settings = { dryRun: false, defaultReply: '', maxTras: 20, pacingMinSec: 0.001, pacingMaxSec: 0.002, ...settings };

  const log = [];
  const calls = [];
  let listeners = [];
  const T = (globalThis.__trc = {});
  T.ui = { log: (msg, level) => log.push({ msg, level }) };
  T.bus = {
    onEvent: (fn) => listeners.push(fn),
    request: async (type, payload) => {
      calls.push({ type, payload });
      const step = script(type, payload, calls, (t, p) => listeners.forEach((fn) => fn(t, p)));
      if (step instanceof Error) throw step;
      return step;
    }
  };
  for (const f of FILES) vm.runInThisContext(fs.readFileSync(path.join(EXT, f), 'utf8'), { filename: f });
  return { T, log, calls, memStore };
}

function pageError(message, extra = {}) {
  const e = new Error(message);
  Object.assign(e, extra);
  return e;
}

test('dwie pozycje publikują się bez ponowień', async () => {
  const env = setup({
    script: (type) => (type === 'add.item' ? { published: true } : null)
  });
  const { T, calls } = env;
  await T.queue.init();
  await T.queue.addFrom('@@ A\nFRACHT: f1\nODPIS: o1\n@@ B\nFRACHT: f2\nODPIS: o2', { defaultReply: '', maxTras: 20 });
  await T.runner.start();
  const items = T.queue.list();
  assert.deepEqual(items.map((i) => i.status), ['ok', 'ok']);
  assert.equal(calls.filter((c) => c.type === 'add.item').length, 2);
  assert.equal(calls.filter((c) => c.type === 'add.clear').length, 0);
});

test('błąd kroku: czyszczenie i jedno ponowienie, potem sukces', async () => {
  let n = 0;
  const env = setup({
    script: (type) => {
      if (type === 'add.item') {
        n += 1;
        return n === 1 ? pageError('walidacja: checkbox', { step: 'walidacja' }) : { published: true };
      }
      return { cleared: true };
    }
  });
  await env.T.queue.init();
  await env.T.queue.addFrom('@@ A\nFRACHT: f\nODPIS: o', { defaultReply: '', maxTras: 20 });
  await env.T.runner.start();
  assert.equal(env.T.queue.list()[0].status, 'ok');
  assert.equal(env.calls.filter((c) => c.type === 'add.item').length, 2);
  assert.equal(env.calls.filter((c) => c.type === 'add.clear').length, 1);
});

test('dwa błędy z rzędu: status blad, formularz czyszczony, kolejka idzie dalej', async () => {
  const env = setup({
    script: (type, payload) => {
      if (type === 'add.item') {
        if (payload.text === 'zły') return pageError('krok X', { step: 'rozpoznanie' });
        return { published: true };
      }
      return { cleared: true };
    }
  });
  await env.T.queue.init();
  await env.T.queue.addFrom('@@ A\nFRACHT: zły\n@@ B\nFRACHT: dobry', { defaultReply: '', maxTras: 20 });
  await env.T.runner.start();
  const [a, b] = env.T.queue.list();
  assert.equal(a.status, 'blad');
  assert.equal(a.noRetry, false);
  assert.equal(b.status, 'ok');
  assert.equal(env.calls.filter((c) => c.type === 'add.item').length, 3);
  assert.equal(env.calls.filter((c) => c.type === 'add.clear').length, 2);
});

test('niepotwierdzona publikacja: bez ponowienia (ryzyko duplikatu)', async () => {
  const env = setup({
    script: (type) => {
      if (type === 'add.item') return pageError('publikacja NIEPOTWIERDZONA', { step: 'publikacja', noRetry: true });
      return { cleared: true };
    }
  });
  await env.T.queue.init();
  await env.T.queue.addFrom('@@ A\nFRACHT: f\nODPIS: o', { defaultReply: '', maxTras: 20 });
  await env.T.runner.start();
  const [a] = env.T.queue.list();
  assert.equal(a.status, 'blad');
  assert.equal(a.noRetry, true);
  assert.equal(env.calls.filter((c) => c.type === 'add.item').length, 1);
});

test('zdarzenie publishing przed błędem też blokuje ponowienie', async () => {
  const env = setup({
    script: (type, payload, calls, emit) => {
      if (type === 'add.item') {
        emit('add.publishing', null);
        return pageError('timeout po kliknięciu', { step: 'publikacja' });
      }
      return { cleared: true };
    }
  });
  await env.T.queue.init();
  await env.T.queue.addFrom('@@ A\nFRACHT: f\nODPIS: o', { defaultReply: '', maxTras: 20 });
  await env.T.runner.start();
  assert.equal(env.calls.filter((c) => c.type === 'add.item').length, 1);
  assert.equal(env.T.queue.list()[0].noRetry, true);
});

test('stop w trakcie: pozycja wraca do czeka, bez publikacji', async () => {
  const env = setup({
    script: (type) => {
      if (type === 'add.item') return pageError('przerwano', { aborted: true, step: 'wklejenie' });
      return { cleared: true };
    }
  });
  await env.T.queue.init();
  await env.T.queue.addFrom('@@ A\nFRACHT: f\nODPIS: o\n@@ B\nFRACHT: g\nODPIS: p', { defaultReply: '', maxTras: 20 });
  await env.T.runner.start();
  const [a, b] = env.T.queue.list();
  assert.equal(a.status, 'czeka');
  assert.equal(b.status, 'czeka');
  assert.equal(env.calls.filter((c) => c.type === 'add.item').length, 1);
});

test('nieudane czyszczenie zatrzymuje kolejkę, reszta zostaje czeka', async () => {
  const env = setup({
    script: (type) => {
      if (type === 'add.item') return pageError('krok', { step: 'wklejenie' });
      return pageError('brak odpowiedzi', { timeout: true });
    }
  });
  await env.T.queue.init();
  await env.T.queue.addFrom('@@ A\nFRACHT: f\n@@ B\nFRACHT: g', { defaultReply: '', maxTras: 20 });
  await env.T.runner.start();
  const items = env.T.queue.list();
  assert.equal(items[1].status, 'czeka');
  assert.equal(env.T.runner.isRunning(), false);
  assert.equal(env.calls.filter((c) => c.type === 'add.item').length, 1);
});

test('tryb próbny oznacza pozycję jako próbę, a nie publikację', async () => {
  const env = setup({
    settings: { dryRun: true },
    script: (type, payload) => (type === 'add.item' ? { dryRun: payload.dryRun } : { cleared: true })
  });
  await env.T.queue.init();
  await env.T.queue.addFrom('@@ A\nFRACHT: f\nODPIS: o', { defaultReply: '', maxTras: 20 });
  await env.T.runner.start();
  const [a] = env.T.queue.list();
  assert.equal(a.status, 'ok');
  assert.equal(a.note, 'próba (bez publikacji)');
  assert.equal(env.calls.find((c) => c.type === 'add.item').payload.dryRun, true);
});

test('pozycje z blokerem nie trafiają do strony', async () => {
  const env = setup({
    script: () => ({ published: true })
  });
  await env.T.queue.init();
  await env.T.queue.addFrom('@@ A\nFRACHT: f\nODPIS: ' + 'x'.repeat(601), { defaultReply: '', maxTras: 20 });
  await env.T.runner.start();
  assert.equal(env.T.queue.list()[0].status, 'blad');
  assert.equal(env.calls.filter((c) => c.type === 'add.item').length, 0);
});

test('po przeładowaniu pozycja „praca" staje się błędem bez ponowienia', async () => {
  const env = setup({ script: () => null });
  env.memStore.queue = [{ id: 'x', label: 'A', fracht: 'f', odpis: 'o', status: 'praca', proby: 0, blad: null }];
  const items = await env.T.queue.init();
  assert.equal(items[0].status, 'blad');
  assert.equal(items[0].noRetry, true);
  assert.equal(env.memStore.queue[0].status, 'blad');
});
