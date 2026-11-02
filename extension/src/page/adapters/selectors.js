/*
 * JEDNO miejsce na selektory okna „Dodaj fracht" (świat strony).
 * Zasady (CLAUDE.md): klasy CSS są haszowane, więc ich nie używamy.
 * Trzymamy się name, placeholder, roli i dokładnego tekstu. Każdy element to łańcuch
 * strategii wykonywanych po kolei. Zwracana jest nazwa strategii, która zadziałała.
 * Nigdy nie klikamy „Wyślij zlecenie" ani „Nie" w dialogu. Nie ma ich tu w ogóle.
 */
(function () {
  'use strict';
  const T = globalThis.__trc;
  const { isVisible, normText, stepError } = T.dom;

  const vis = (sel, root = document) => Array.from(root.querySelectorAll(sel)).filter(isVisible);
  const notInMenu = (el) => !el.closest('[role="menu"], [role="listbox"]');

  // Checkbox bez name/id: szukamy elementu z dokładnym tekstem etykiety,
  // a checkbox bierzemy z najbliższego przodka. Klik idzie w tekst (bąbelkowanie zdarzenia).
  function findCheckboxByLabel(text) {
    const candidates = vis('label, span, div, p, b, strong').filter((el) => normText(el) === text);
    for (const t of candidates) {
      if (Array.from(t.children).some((c) => normText(c) === text)) continue;
      let node = t;
      for (let i = 0; i < 5 && node && node !== document.body; i++) {
        const cb = node.querySelector('input[type="checkbox"]');
        if (cb && normText(node).length < text.length + 80) return { el: cb, click: t };
        node = node.parentElement;
      }
    }
    return null;
  }

  // Każdy element: etykieta do logów, kiedy jest sprawdzany (when) i strategie.
  // when: 'open' = gdy okno otwarte, 'closed' = gdy zamknięte, 'text' = po wpisaniu tekstu,
  // 'dialog' = po kliknięciu „Wyczyść formularz" (nie testowane w selftest).
  const DEF = {
    quickFill: {
      label: 'pole szybkiego wypełniania', when: 'open',
      strategies: [
        ['atrybut name="aiPrompt"', () => vis('textarea[name="aiPrompt"]')[0] || null],
        ['placeholder "danych frachtu"', () => vis('textarea').find((t) => /danych frachtu/i.test(t.placeholder || '')) || null]
      ]
    },
    recognizeBtn: {
      label: 'przycisk "Rozpoznaj dane"', when: 'text',
      strategies: [
        ['przycisk, tekst zawiera "Rozpoznaj dane"', () => vis('button').find((b) => normText(b).includes('Rozpoznaj dane')) || null]
      ]
    },
    replyArea: {
      label: 'pole wiadomości auto-odpisu', when: 'open',
      strategies: [
        ['atrybut name="defaultReplyMessage"', () => vis('textarea[name="defaultReplyMessage"]')[0] || null],
        ['placeholder "Wiadomość zwrotna"', () => vis('textarea').find((t) => (t.placeholder || '').includes('Wiadomość zwrotna')) || null]
      ]
    },
    autoReplyCheckbox: {
      label: 'checkbox "Odpisuj automatycznie"', when: 'open',
      strategies: [
        ['etykieta tekstowa + checkbox w kontenerze', () => findCheckboxByLabel('Odpisuj automatycznie')]
      ]
    },
    publishBtn: {
      label: 'przycisk "Opublikuj fracht"', when: 'open',
      strategies: [
        ['przycisk, tekst dokładnie, poza menu', () => vis('button').find((b) => normText(b) === 'Opublikuj fracht' && notInMenu(b)) || null]
      ]
    },
    addFreightBtn: {
      label: 'przycisk "Dodaj fracht"', when: 'closed',
      strategies: [
        ['przycisk lub link, tekst dokładnie', () => vis('button, a').find((b) => normText(b) === 'Dodaj fracht') || null]
      ]
    },
    clearLink: {
      label: 'link "Wyczyść formularz"', when: 'open',
      strategies: [
        ['element, tekst dokładnie', () => vis('a, button, span').find((b) => normText(b) === 'Wyczyść formularz') || null]
      ]
    },
    clearDialog: {
      label: 'dialog "Czy na pewno chcesz zamknąć formularz?"', when: 'dialog',
      strategies: [
        ['najmniejszy element z pytaniem', () => {
          let best = null;
          for (const el of vis('div, p, span, section')) {
            const t = normText(el);
            if (t.includes('Czy na pewno chcesz zamknąć formularz') && (!best || t.length < normText(best).length)) best = el;
          }
          return best;
        }]
      ]
    },
    clearConfirm: {
      label: 'przycisk "Zamknij formularz" (potwierdzenie)', when: 'dialog',
      strategies: [
        ['przycisk w dialogu, tekst dokładnie', () => vis('[role="dialog"] button').find((b) => normText(b) === 'Zamknij formularz') || null],
        ['przycisk, tekst dokładnie', () => vis('button').find((b) => normText(b) === 'Zamknij formularz') || null]
      ]
    }
  };

  // Wykonuje strategie po kolei. Zwraca {el, click, strategy} albo null. Błędy w strategiach nie są połykane.
  function locate(key) {
    const def = DEF[key];
    if (!def) throw new Error(`selectors: nieznany klucz "${key}"`);
    for (const [strategy, find] of def.strategies) {
      const r = find();
      if (!r) continue;
      // Uwaga: HTMLElement ma własną metodę click(), więc odróżniamy element od opakowania {el, click}.
      if (r instanceof Element) return { el: r, click: r, strategy };
      return { el: r.el, click: r.click || r.el, strategy };
    }
    return null;
  }

  function require(key, step) {
    const r = locate(key);
    if (!r) {
      const tried = DEF[key].strategies.map(([name]) => name).join('; ');
      throw stepError(step, `nie znaleziono: ${DEF[key].label} (próbowano: ${tried})`);
    }
    return r;
  }

  // Zakres okna: najbliższy przodek pola szybkiego wypełniania, który ma przycisk „Opublikuj fracht".
  // Gdy okna nie ma, wracamy do całego dokumentu.
  function scope() {
    const qf = locate('quickFill');
    if (!qf) return document;
    let node = qf.el;
    for (let i = 0; i < 15 && node && node !== document.body; i++) {
      if (vis('button', node).some((b) => normText(b) === 'Opublikuj fracht')) return node;
      node = node.parentElement;
    }
    return document;
  }

  // Chipy lokalizacji po rozpoznaniu: „PL 71-001 Szczecin", „DE 10115 Berlin".
  // Kolejność w DOM: pierwszy = załadunek, drugi = rozładunek.
  const CHIP_RE = /^[A-Z]{2} [0-9][0-9A-Za-z-]{1,8} \S.{0,60}$/;
  function chips() {
    const root = scope();
    const candidates = [];
    for (const el of vis('span, div, a, button, p', root)) {
      const t = normText(el);
      if (CHIP_RE.test(t)) candidates.push({ el, text: t });
    }
    // Kontener z dwoma chipami też pasuje do wzorca: zostawiamy tylko te, które nie zawierają innego kandydata.
    return candidates.filter((c) => !candidates.some((o) => o !== c && c.el.contains(o.el)));
  }

  function dateInputs() {
    return vis('input', scope()).filter((i) => /^\d{2}\.\d{2}\.\d{4}$/.test(i.value));
  }

  function timeInputs() {
    return vis('input', scope()).filter((i) => /^\d{2}:\d{2}$/.test(i.value));
  }

  // Raport dla selftestu. Nie klika niczego i nie zwraca wartości pól (dane z konta).
  function describe() {
    const qf = locate('quickFill');
    const open = !!qf;
    const hasText = open && qf.el.value.trim().length > 0;
    return Object.keys(DEF).map((key) => {
      const { label, when } = DEF[key];
      if (when === 'dialog') return { key, label, status: 'pominięty', note: 'pojawia się po „Wyczyść formularz"' };
      if (when === 'closed' && open) return { key, label, status: 'pominięty', note: 'okno otwarte' };
      if (when === 'text' && !hasText) return { key, label, status: 'pominięty', note: 'pojawia się po wpisaniu tekstu' };
      if (when === 'open' && !open) return { key, label, status: 'brak', note: 'okno „Dodaj fracht" nie jest otwarte' };
      const r = locate(key);
      if (r) return { key, label, status: 'ok', strategy: r.strategy };
      return { key, label, status: 'brak', note: 'nie znaleziono' };
    });
  }

  T.selectors = Object.freeze({
    locate,
    require,
    scope,
    chips,
    dateInputs,
    timeInputs,
    describe
  });
})();
