/*
 * API okna „Dodaj fracht" (świat strony). Każda metoda ma krok (step) do błędów
 * i limit czasu. Sukces publikacji zgłaszamy dopiero po zamknięciu okna.
 */
(function () {
  'use strict';
  const T = globalThis.__trc;
  const { waitFor, stepError } = T.dom;
  const { sleep, clickHuman, setNativeValue, humanDelay } = T.human;
  const S = T.selectors;
  const MAX_ODPIS = T.text.MAX_ODPIS;

  function isOpen() {
    return !!S.locate('quickFill');
  }

  // Ustawia odpowiedni stan checkboxa. Najpierw klik w tekst etykiety, potem w sam input.
  async function settle(check, ms, signal) {
    try {
      await waitFor(check, { timeout: ms, signal, step: 'odpis', what: 'stan checkboxa', interval: 100 });
      return true;
    } catch (err) {
      if (err.aborted) throw err;
      return false;
    }
  }

  async function open(signal) {
    if (isOpen()) return;
    const btn = S.require('addFreightBtn', 'otwarcie');
    await clickHuman(btn.click, signal);
    await waitFor(isOpen, {
      timeout: 15000, signal, step: 'otwarcie',
      what: 'okno "Dodaj fracht" (pole szybkiego wypełniania)'
    });
    await sleep(humanDelay(400, 100, 250, 700), signal);
  }

  async function setQuickFill(text, signal) {
    const ta = S.require('quickFill', 'wklejenie').el;
    setNativeValue(ta, '');
    await sleep(humanDelay(120, 40, 60, 220), signal);
    setNativeValue(ta, text);
    await waitFor(() => S.locate('quickFill')?.el.value === text, {
      timeout: 3000, signal, step: 'wklejenie', what: 'wartość pola szybkiego wypełniania'
    });
  }

  async function recognize(signal) {
    // Przycisk pojawia się dopiero po wpisaniu tekstu.
    const r = await waitFor(() => S.locate('recognizeBtn'), {
      timeout: 8000, signal, step: 'rozpoznanie',
      what: 'przycisk "Rozpoznaj dane" (pojawia się po wpisaniu tekstu)'
    });
    await clickHuman(r.click, signal);
  }

  // Wartości pól do placeholderów i walidacji. Nie wolno ich logować ani zapisywać.
  function readFields() {
    const c = S.chips();
    const d = S.dateInputs();
    const t = S.timeInputs();
    return {
      origin: c[0] ? c[0].text : null,
      dest: c[1] ? c[1].text : null,
      loadDate: d[0] ? d[0].value : null,
      loadTime: t[0] ? t[0].value : null
    };
  }

  // Czekamy, aż AI skończy: chipy obu lokalizacji i data są na miejscu i nie zmieniają się przez 900 ms.
  async function waitRecognized(signal) {
    let lastKey = null;
    let since = 0;
    return waitFor(() => {
      const f = readFields();
      if (!f.origin || !f.dest || !f.loadDate) {
        lastKey = null;
        return false;
      }
      const key = JSON.stringify(f);
      const now = Date.now();
      if (key !== lastKey) {
        lastKey = key;
        since = now;
        return false;
      }
      return now - since >= 900 ? f : false;
    }, {
      timeout: 25000, signal, step: 'rozpoznanie', interval: 150,
      what: 'wypełnienie pól trasy przez AI (chipy lokalizacji i data załadunku)'
    });
  }

  async function setAutoReply(enabled, message, signal) {
    const cb = S.require('autoReplyCheckbox', 'odpis');
    const isChecked = () => S.locate('autoReplyCheckbox')?.el.checked === enabled;
    if (!isChecked()) {
      await clickHuman(cb.click, signal);
      if (!(await settle(isChecked, 1500, signal))) {
        await clickHuman(S.require('autoReplyCheckbox', 'odpis').el, signal);
        await waitFor(isChecked, {
          timeout: 3000, signal, step: 'odpis',
          what: 'zaznaczenie "Odpisuj automatycznie"'
        });
      }
    }
    if (enabled) {
      setNativeValue(S.require('replyArea', 'odpis').el, message);
      await waitFor(() => S.locate('replyArea')?.el.value === message, {
        timeout: 3000, signal, step: 'odpis', what: 'wartość pola wiadomości auto-odpisu'
      });
    }
  }

  // Sprawdza wszystko przed publikacją. Błąd = pozycja nie zostaje opublikowana.
  function validate(expect) {
    const problems = [];
    const f = readFields();
    if (!f.origin) problems.push('brak miejsca załadunku');
    if (!f.dest) problems.push('brak miejsca rozładunku');
    if (!f.loadDate) problems.push('brak daty załadunku');

    const cb = S.locate('autoReplyCheckbox');
    if (!cb) problems.push('brak checkboxa auto-odpisu');
    else if (cb.el.checked !== expect.autoReply) {
      problems.push(`checkbox auto-odpisu: oczekiwano ${expect.autoReply}, jest ${cb.el.checked}`);
    }
    if (expect.autoReply) {
      const area = S.locate('replyArea');
      if (!area) problems.push('brak pola wiadomości auto-odpisu');
      else if (area.el.value !== expect.reply) problems.push('wiadomość w oknie nie zgadza się z ODPIS');
      if (expect.reply.length > MAX_ODPIS) {
        problems.push(`wiadomość ma ${expect.reply.length} znaków, limit ${MAX_ODPIS}`);
      }
    }
    if (!S.locate('publishBtn')) problems.push('brak przycisku "Opublikuj fracht"');

    if (problems.length) throw stepError('walidacja', problems.join('; '));
    return true;
  }

  async function publish(signal) {
    const btn = S.require('publishBtn', 'publikacja');
    T.emit('add.publishing', null);
    await clickHuman(btn.click, signal);
    try {
      await waitFor(() => !isOpen(), {
        timeout: 15000, signal, step: 'publikacja',
        what: 'zamknięcie okna po "Opublikuj fracht"'
      });
    } catch (err) {
      if (err.aborted) throw err;
      const e = stepError('publikacja',
        'okno nie zamknęło się po kliknięciu, publikacja NIEPOTWIERDZONA. Sprawdź w Transie, nie ponawiam');
      e.noRetry = true;
      throw e;
    }
    return true;
  }

  // Wyczyść formularz + potwierdzenie „Zamknij formularz". Nigdy „Nie".
  async function clear(signal) {
    if (!isOpen()) return;
    const link = S.require('clearLink', 'czyszczenie');
    await clickHuman(link.click, signal);

    const next = await waitFor(() => {
      if (!isOpen()) return 'closed';
      if (S.locate('clearConfirm')) return 'dialog';
      return false;
    }, { timeout: 4000, signal, step: 'czyszczenie', what: 'okno potwierdzenia zamknięcia formularza' });

    if (next === 'dialog') {
      await clickHuman(S.require('clearConfirm', 'czyszczenie').click, signal);
    }
    await waitFor(() => !isOpen() || S.locate('quickFill')?.el.value === '', {
      timeout: 10000, signal, step: 'czyszczenie', what: 'opróżnienie formularza'
    });
    await sleep(humanDelay(300, 80, 150, 500), signal);
  }

  T.modal = Object.freeze({
    isOpen,
    open,
    setQuickFill,
    recognize,
    readFields,
    waitRecognized,
    setAutoReply,
    validate,
    publish,
    clear
  });
})();
