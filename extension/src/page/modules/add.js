/*
 * Dodawanie jednego frachtu (świat strony). Kroki: otwórz → wklej → rozpoznaj →
 * czekaj na pola → ODPIS → walidacja → (publikacja, chyba że próbny) → potwierdzenie.
 * Każdy krok ma limit czasu i nazwę w błędzie. Stop (add.abort) przerywa oczekiwanie.
 */
(function () {
  'use strict';
  const T = globalThis.__trc;
  const M = T.modal;
  const S = T.selectors;
  const { stepError } = T.dom;
  const { fillPlaceholders, remainingPlaceholders, MAX_ODPIS } = T.text;

  let current = null; // AbortController trwającej operacji

  // Wartości pól idą tylko do placeholderów i walidacji. Logi nie zawierają adresów ani danych konta.
  async function runItem(p, signal) {
    const { label, text, odpis, dryRun } = p;
    const say = (msg, status = 'info') => T.emit('add.log', { label, msg, status });

    if (!text || !String(text).trim()) throw stepError('walidacja', 'pusty FRACHT');

    if (M.isOpen() && S.locate('quickFill').el.value.trim() !== '') {
      say('Formularz nie jest pusty, czyszczę przed startem.', 'warn');
      await M.clear(signal);
    }

    say('Otwieram „Dodaj fracht".');
    await M.open(signal);

    say('Wklejam dane frachtu.');
    await M.setQuickFill(text, signal);

    say('Rozpoznaję dane (AI Transa).');
    await M.recognize(signal);
    const fields = await M.waitRecognized(signal);
    say('Pola trasy rozpoznane.', 'ok');

    let reply = null;
    if (odpis) {
      reply = fillPlaceholders(odpis, {
        zaladunek: fields.origin,
        rozladunek: fields.dest,
        data: fields.loadDate,
        etykieta: label
      });
      const left = remainingPlaceholders(reply);
      if (left.length) throw stepError('walidacja', `nierozwiązane placeholdery: ${left.join(' ')}`);
      if (reply.length > MAX_ODPIS) {
        throw stepError('walidacja', `ODPIS ma ${reply.length} znaków, limit ${MAX_ODPIS}`);
      }
    }

    await M.setAutoReply(!!reply, reply || '', signal);
    say(reply ? 'Auto-odpis zaznaczony i wpisany.' : 'Bez auto-odpisu.', reply ? 'ok' : 'warn');

    M.validate({ autoReply: !!reply, reply: reply || '' });

    if (dryRun) {
      say('Tryb próbny: pomijam publikację, czyszczę formularz.', 'warn');
      await M.clear(signal);
      return { dryRun: true };
    }

    say('Publikuję.', 'working');
    await M.publish(signal);
    say('Opublikowano (okno zamknięte).', 'ok');
    return { published: true };
  }

  async function withController(fn) {
    if (current) throw new Error('inna operacja dodawania już trwa');
    current = new AbortController();
    try {
      return await fn(current.signal);
    } finally {
      current = null;
    }
  }

  T.on('add.item', (payload) => withController((signal) => runItem(payload || {}, signal)));

  T.on('add.clear', () => withController(async (signal) => {
    await M.clear(signal);
    return { cleared: true };
  }));

  T.on('add.abort', () => {
    const was = !!current;
    if (current) current.abort();
    return { aborted: was };
  });
})();
