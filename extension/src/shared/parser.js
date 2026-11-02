/*
 * Parser wklejki (format z docs/FORMAT-KOLEJKI.md). Czysta funkcja, bez DOM, testowana w Node.
 *
 *   @@ etykieta trasy
 *   FRACHT: tekst do szybkiego wypełniania (może być wielolinijkowy)
 *   ODPIS:  wiadomość auto-odpisu (może być wielolinijkowa)
 *
 * Tryb zgodności: wklejka bez żadnego @@ = jedna niepusta linia to jeden FRACHT, bez ODPIS.
 * Zwraca { items, warnings }. Pozycja z `blocker` nie idzie do publikacji (status blad).
 */
(function () {
  'use strict';

  const TextApi = (typeof module !== 'undefined' && module.exports)
    ? require('./text.js')
    : globalThis.__trc.text;

  const KEY_RE = /^(FRACHT|ODPIS):(.*)$/;

  function unknownPlaceholders(text) {
    return TextApi.remainingPlaceholders(text).filter(
      (p) => !TextApi.PLACEHOLDERS.includes(p.slice(1, -1))
    );
  }

  function collectBlocks(lines, warnings) {
    const hasBlocks = lines.some((l) => /^@@/.test(l));
    if (!hasBlocks) {
      return lines
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l, i) => ({ label: `#${i + 1}`, sec: { FRACHT: [l], ODPIS: [] } }));
    }

    const blocks = [];
    let cur = null;
    let key = null;
    let stray = false;
    for (const line of lines) {
      const bm = line.match(/^@@(.*)$/);
      if (bm) {
        cur = { label: bm[1].trim() || `#${blocks.length + 1}`, sec: {} };
        blocks.push(cur);
        key = null;
        continue;
      }
      if (!cur) {
        if (line.trim()) stray = true;
        continue;
      }
      const km = line.match(KEY_RE);
      if (km) {
        key = km[1];
        cur.sec[key] = [km[2].replace(/^ /, '')];
        continue;
      }
      if (key) cur.sec[key].push(line);
    }
    if (stray) warnings.push('Tekst przed pierwszym @@ został pominięty.');
    return blocks;
  }

  function parse(raw, opts = {}) {
    const maxItems = opts.maxItems ?? 20;
    const defaultOdpis = (opts.defaultOdpis || '').trim() || null;
    const warnings = [];
    const text = String(raw ?? '').replace(/\r\n?/g, '\n');
    const blocks = collectBlocks(text.split('\n'), warnings);

    const items = [];
    for (const b of blocks) {
      const clean = (k) => (b.sec[k] ? b.sec[k].join('\n').trim() : '');
      const fracht = clean('FRACHT');
      if (!fracht) {
        warnings.push(`Pominięto „${b.label}": brak FRACHT.`);
        continue;
      }

      let odpis = clean('ODPIS') || null;
      let odpisSource = odpis ? 'trasa' : null;
      if (!odpis && defaultOdpis) {
        odpis = defaultOdpis;
        odpisSource = 'domyślny';
      }
      if (!odpis) {
        warnings.push(`„${b.label}": brak ODPIS i szablonu domyślnego. Fracht pójdzie bez auto-odpisu.`);
      }

      let blocker = null;
      if (odpis) {
        const unknown = unknownPlaceholders(odpis);
        if (unknown.length) blocker = `nieznany placeholder ${unknown.join(' ')} w ODPIS`;
        else if (odpis.length > TextApi.MAX_ODPIS) {
          blocker = `ODPIS ma ${odpis.length} znaków, limit ${TextApi.MAX_ODPIS}`;
        }
      }
      items.push({ label: b.label, fracht, odpis, odpisSource, blocker });
    }

    if (items.length > maxItems) {
      warnings.push(`Wklejka ma ${items.length} tras, limit ${maxItems}. Pominięto nadmiar.`);
      items.length = maxItems;
    }
    return { items, warnings };
  }

  const api = Object.freeze({ parse });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    (globalThis.__trc ||= {}).parser = api;
  }
})();
