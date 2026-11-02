// Test end-to-end na atrapie okna (tests/e2e/mock-trans.html), w Chromium.
// Ładuje pliki rozszerzenia w kolejności z manifest.json (świat strony, potem widżet).
// NIE dotyka platform.trans.eu. Wymaga Playwright (np. globalnie zainstalowany):
//   NODE_PATH=$(npm root -g) node tests/e2e/run.js
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', '..');
const EXT = path.join(ROOT, 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(EXT, 'manifest.json'), 'utf8'));
const [MAIN_JS, ISO_JS] = [manifest.content_scripts[0].js, manifest.content_scripts[1].js];

// Pamięć zamiast chrome.storage.local (ta sama przestrzeń dla obu „światów" w tym teście).
const STORAGE_STUB = `
  (() => {
    const mem = {};
    globalThis.chrome = { storage: { local: {
      async get(keys) { const o = {}; for (const k of keys) if (k in mem) o[k] = JSON.parse(JSON.stringify(mem[k])); return o; },
      async set(obj) { for (const [k, v] of Object.entries(obj)) mem[k] = JSON.parse(JSON.stringify(v)); }
    } } };
  })();`;

const TEXT = [
  '@@ Szczecin → Berlin',
  'FRACHT: Załadunek Szczecin 71-001, rozładunek Berlin 10115, 24t, plandeka',
  'ODPIS: Dzień dobry, {zaladunek} do {rozladunek}, termin {data}.',
  '',
  '@@ Poznań → Hamburg',
  'FRACHT: Poznań Hamburg 12t',
  'ODPIS: Oferta na trasę {etykieta}, termin {data}.'
].join('\n');

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(STORAGE_STUB);
  await page.goto('file://' + path.join(__dirname, 'mock-trans.html'));

  for (const f of MAIN_JS) await page.addScriptTag({ content: fs.readFileSync(path.join(EXT, f), 'utf8') });
  for (const f of ISO_JS) await page.addScriptTag({ content: fs.readFileSync(path.join(EXT, f), 'utf8') });

  // Czekamy na łącznik (ping).
  await page.waitForFunction(async () => {
    try { await globalThis.__trc.bus.request('ping', null, { timeout: 1000 }); return true; } catch (e) { return false; }
  }, null, { timeout: 15000, polling: 300 });

  const results = [];
  const check = async (name, fn) => {
    try { await fn(); results.push(`[OK] ${name}`); } catch (e) { results.push(`[BLAD] ${name}: ${e.message}`); }
  };

  await check('selftest przy zamkniętym oknie zgłasza brak okna', async () => {
    const r = await page.evaluate(() => globalThis.__trc.bus.request('selftest', null, { timeout: 5000 }));
    assert.equal(r.modalOpen, false);
    assert.equal(r.ok, false);
  });

  await page.click('#openAdd');

  await check('selftest przy otwartym oknie: komplet OK (bez pozycji pominiętych jako brak)', async () => {
    const r = await page.evaluate(() => globalThis.__trc.bus.request('selftest', null, { timeout: 5000 }));
    assert.equal(r.modalOpen, true);
    const missing = r.results.filter((x) => x.status === 'brak').map((x) => x.label);
    assert.deepEqual(missing, []);
    assert.equal(r.ok, true);
  });

  await page.evaluate(async () => {
    const T = globalThis.__trc;
    await T.store.save({ settings: { ...(await T.store.load()).settings, dryRun: true, pacingMinSec: 0.01, pacingMaxSec: 0.02 } });
  });

  await check('tryb próbny: pozycje przechodzą, nic nie jest publikowane', async () => {
    await page.evaluate(async (text) => {
      const T = globalThis.__trc;
      const { settings } = await T.store.load();
      await T.queue.addFrom(text, settings);
      await T.runner.start();
    }, TEXT);
    const items = await page.evaluate(() => globalThis.__trc.queue.list());
    assert.deepEqual(items.map((i) => i.status), ['ok', 'ok'], JSON.stringify(items));
    assert.equal(items[0].note, 'próba (bez publikacji)');
    assert.equal(await page.evaluate(() => window.__published.length), 0);
    assert.equal(await page.evaluate(() => document.getElementById('modal').classList.contains('open')), false);
  });

  await check('publikacja: auto-odpis z placeholderami, potwierdzenie po zamknięciu okna', async () => {
    await page.evaluate(async () => {
      const T = globalThis.__trc;
      await T.store.save({ settings: { ...(await T.store.load()).settings, dryRun: false } });
      await T.queue.clearDone();
      await T.queue.addFrom('@@ Szczecin → Berlin\nFRACHT: t1\nODPIS: Dzień dobry, {zaladunek} do {rozladunek}, termin {data}.\n@@ Poznań → Hamburg\nFRACHT: t2\nODPIS: Oferta na trasę {etykieta}, termin {data}.', (await T.store.load()).settings);
      await T.runner.start();
    });
    const pub = await page.evaluate(() => window.__published);
    assert.equal(pub.length, 2, JSON.stringify(pub));
    assert.equal(pub[0].auto, true);
    assert.equal(pub[0].reply, 'Dzień dobry, PL 71-001 Szczecin do DE 10115 Berlin, termin 05.11.2026.');
    assert.equal(pub[1].reply, 'Oferta na trasę Poznań → Hamburg, termin 05.11.2026.');
    const items = await page.evaluate(() => globalThis.__trc.queue.list());
    assert.deepEqual(items.map((i) => i.status), ['ok', 'ok']);
  });

  await check('błąd potwierdzenia publikacji: bez ponowienia, bez duplikatu', async () => {
    await page.evaluate(async () => {
      const T = globalThis.__trc;
      await T.queue.clearDone();
      window.__failPublish = true;
      window.__addItemCalls = 0;
      // T.bus jest zamrożone, więc liczymy zdarzenia żądań zamiast podmieniać metodę.
      document.addEventListener('trc:req', (e) => {
        if (JSON.parse(e.detail).type === 'add.item') window.__addItemCalls += 1;
      });
      await T.queue.addFrom('@@ Test\nFRACHT: t3\nODPIS: Test {data}.', (await T.store.load()).settings);
      await T.runner.start();
    });
    const [item] = await page.evaluate(() => globalThis.__trc.queue.list());
    assert.equal(item.status, 'blad');
    assert.equal(item.noRetry, true);
    assert.equal(await page.evaluate(() => window.__addItemCalls), 1);
    assert.equal(await page.evaluate(() => window.__published.length), 2, 'nie powinno być trzeciej publikacji');
  });

  await check('przycisk „Wyślij zlecenie" nigdy nie został kliknięty', async () => {
    assert.equal(await page.evaluate(() => window.__sendOrder === true), false);
  });

  await check('w konsoli strony nie ma błędów JS', async () => {
    assert.deepEqual(errors, []);
  });

  await browser.close();
  console.log(results.join('\n'));
  if (results.some((r) => r.startsWith('[BLAD]'))) process.exit(1);
}

main().catch((e) => {
  console.error('E2E nie uruchomiony:', e);
  process.exit(2);
});
