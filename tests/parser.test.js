// Testy parsera wklejki i podmiany placeholderów. Uruchomienie: node --test tests/parser.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { parse } = require('../extension/src/shared/parser.js');
const text = require('../extension/src/shared/text.js');

test('blok bez FRACHT jest pomijany z ostrzeżeniem', () => {
  const r = parse('@@ Szczecin → Berlin\nODPIS: Dzień dobry\n\n@@ Poznań → Hamburg\nFRACHT: 24t plandeka');
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].label, 'Poznań → Hamburg');
  assert.match(r.warnings[0], /brak FRACHT/);
});

test('wielolinijkowe sekcje FRACHT i ODPIS zachowują łamanie linii', () => {
  const r = parse('@@ A\nFRACHT: linia 1\nlinia 2\nODPIS: odp 1\n  wcięta\nodp 3\n\n@@ B\nFRACHT: x\nODPIS: y');
  assert.equal(r.items[0].fracht, 'linia 1\nlinia 2');
  assert.equal(r.items[0].odpis, 'odp 1\n  wcięta\nodp 3');
  assert.equal(r.items[1].odpis, 'y');
});

test('tryb zgodności: jedna linia to jeden FRACHT, bez ODPIS', () => {
  const r = parse('pierwsza trasa\n\n  druga trasa  \n');
  assert.deepEqual(r.items.map((i) => i.fracht), ['pierwsza trasa', 'druga trasa']);
  assert.deepEqual(r.items.map((i) => i.label), ['#1', '#2']);
  assert.equal(r.items[0].odpis, null);
});

test('CRLF jest normalizowany', () => {
  const r = parse('@@ A\r\nFRACHT: f\r\nODPIS: o\r\n');
  assert.equal(r.items[0].fracht, 'f');
  assert.equal(r.items[0].odpis, 'o');
});

test('pusta wklejka daje zero pozycji i bez błędu', () => {
  const r = parse('   \n\n');
  assert.equal(r.items.length, 0);
  assert.equal(r.warnings.length, 0);
});

test('@@ bez etykiety dostaje numer', () => {
  const r = parse('@@\nFRACHT: a\nODPIS: b\n@@   \nFRACHT: c');
  assert.deepEqual(r.items.map((i) => i.label), ['#1', '#2']);
});

test('tekst przed pierwszym @@ jest pomijany z ostrzeżeniem', () => {
  const r = parse('wstęp do pominięcia\n@@ A\nFRACHT: f');
  assert.equal(r.items.length, 1);
  assert.match(r.warnings.join(' '), /przed pierwszym @@/);
});

test('domyślny szablon ODPIS użyty, gdy trasa go nie ma', () => {
  const r = parse('@@ A\nFRACHT: f\n\n@@ B\nFRACHT: g\nODPIS: własny', { defaultOdpis: 'Domyślny {data}' });
  assert.equal(r.items[0].odpis, 'Domyślny {data}');
  assert.equal(r.items[0].odpisSource, 'domyślny');
  assert.equal(r.items[1].odpis, 'własny');
  assert.equal(r.items[1].odpisSource, 'trasa');
});

test('brak ODPIS i szablonu: ostrzeżenie, fracht bez auto-odpisu', () => {
  const r = parse('@@ A\nFRACHT: f');
  assert.equal(r.items[0].odpis, null);
  assert.match(r.warnings[0], /bez auto-odpisu/);
  assert.equal(r.items[0].blocker, null);
});

test('ODPIS powyżej 600 znaków blokuje pozycję', () => {
  const long = 'a'.repeat(601);
  const r = parse(`@@ A\nFRACHT: f\nODPIS: ${long}`);
  assert.match(r.items[0].blocker, /601 znaków, limit 600/);
  const ok = parse(`@@ A\nFRACHT: f\nODPIS: ${'a'.repeat(600)}`);
  assert.equal(ok.items[0].blocker, null);
});

test('nieznany placeholder blokuje pozycję, znany nie', () => {
  const bad = parse('@@ A\nFRACHT: f\nODPIS: Dzień dobry {nieznany}');
  assert.match(bad.items[0].blocker, /nieznany placeholder \{nieznany\}/);
  const good = parse('@@ A\nFRACHT: f\nODPIS: {zaladunek} -> {rozladunek} {data}');
  assert.equal(good.items[0].blocker, null);
});

test('limit tras obcina nadmiar z ostrzeżeniem', () => {
  const lines = Array.from({ length: 5 }, (_, i) => `trasa ${i + 1}`).join('\n');
  const r = parse(lines, { maxItems: 3 });
  assert.equal(r.items.length, 3);
  assert.match(r.warnings.join(' '), /limit 3/);
});

test('fillPlaceholders podmienia znane wartości i zostawia pozostałe', () => {
  const out = text.fillPlaceholders('{zaladunek} do {rozladunek}, {data}, {etykieta}', {
    zaladunek: 'PL 71-001 Szczecin', rozladunek: 'DE 10115 Berlin', data: '05.11.2026'
  });
  assert.equal(out, 'PL 71-001 Szczecin do DE 10115 Berlin, 05.11.2026, {etykieta}');
  assert.deepEqual(text.remainingPlaceholders(out), ['{etykieta}']);
});
