// Test magistrali w Node: ładuje prawdziwe pliki rozszerzenia (świat strony i widżetu)
// i sprawdza protokół: ping/pong, błąd z handlera, nieznane polecenie, limit czasu.
// Uruchomienie: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const EXT = path.join(__dirname, '..', 'extension', 'src');

function loadFiles(files) {
  for (const f of files) {
    vm.runInThisContext(fs.readFileSync(path.join(EXT, f), 'utf8'), { filename: f });
  }
}

function setupEnv() {
  // Atrapa przeglądarki: document to EventTarget, window to global.
  globalThis.document = new EventTarget();
  globalThis.document.body = null; // dom.js obsługuje brak body
  globalThis.window = globalThis;
  globalThis.innerWidth = 1000;
  globalThis.innerHeight = 800;
  delete globalThis.__trc;
}

test('ping/pong i obsługa błędów magistrali', async () => {
  setupEnv();
  loadFiles(['shared/proto.js', 'page/core/bus.js', 'page/main.js']);
  loadFiles(['content/bus-client.js']);
  const T = globalThis.__trc;

  // Świat strony odpowiada na ping.
  const pong = await T.bus.request('ping', null, { timeout: 500 });
  assert.equal(pong.pong, true);

  // Nieznane polecenie kończy się błędem, nie zawieszeniem.
  await assert.rejects(T.bus.request('nie-ma-takiego', null, { timeout: 500 }), /nieznane polecenie/);

  // Handler z krokiem: błąd niesie step i nie jest aborted.
  T.on('boom', async () => {
    const e = new Error('coś poszło źle');
    e.step = 'krok-testowy';
    throw e;
  });
  await assert.rejects(T.bus.request('boom', null, { timeout: 500 }), (err) => {
    assert.equal(err.step, 'krok-testowy');
    assert.equal(err.aborted, false);
    return true;
  });
});

test('brak odpowiedzi kończy się limitem czasu', async () => {
  setupEnv();
  loadFiles(['shared/proto.js', 'content/bus-client.js']);
  const T = globalThis.__trc;
  // Brak świata strony: żadnego handlera, żadnej odpowiedzi.
  await assert.rejects(T.bus.request('ping', null, { timeout: 50 }), (err) => {
    assert.equal(err.timeout, true);
    assert.match(err.message, /brak odpowiedzi na "ping"/);
    return true;
  });
});

test('waitFor zwraca wartość albo czytelny błąd z krokiem', async () => {
  setupEnv();
  loadFiles(['shared/proto.js', 'page/core/dom.js']);
  const T = globalThis.__trc;

  let n = 0;
  const v = await T.dom.waitFor(() => (++n >= 3 ? 'gotowe' : false), { timeout: 2000, interval: 5, step: 'test' });
  assert.equal(v, 'gotowe');

  await assert.rejects(
    T.dom.waitFor(() => false, { timeout: 60, interval: 5, step: 'krok-X', what: 'pola' }),
    (err) => {
      assert.equal(err.step, 'krok-X');
      assert.match(err.message, /nie doczekano się: pola/);
      return true;
    }
  );

  const ac = new AbortController();
  const p = T.dom.waitFor(() => false, { timeout: 5000, interval: 5, step: 'stop', signal: ac.signal });
  ac.abort();
  await assert.rejects(p, (err) => err.aborted === true);
});
