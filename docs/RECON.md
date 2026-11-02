# Faza 0: rozpoznanie nowego okna „Dodaj fracht"

Potrzebuję struktury DOM okna po zmianie (lewa strona: szybkie wypełnianie, prawa strona: checkbox „odpisuj automatycznie" i pole wiadomości). Dzięki temu selektory w `adapters/selectors.js` będą oparte na faktach, a nie na zgadywaniu po tekście.

## Jak to zrobić

1. Otwórz na platform.trans.eu okno „Dodaj fracht" tak, żeby widać było obie strony.
2. Otwórz konsolę (F12 → Console) i wklej poniższy fragment. Nic nie wysyła i niczego nie klika, tylko czyta DOM.
3. Wynik trafia do schowka. Wklej go do pliku `tests/fixtures/modal-add-freight.json` albo prześlij mi w czacie.

```js
(() => {
  const vis = e => e.offsetWidth > 0 && e.offsetHeight > 0;
  const pick = e => ({
    tag: e.tagName.toLowerCase(),
    id: e.id || null,
    type: e.type || null,
    name: e.name || null,
    placeholder: e.placeholder || null,
    role: e.getAttribute('role'),
    aria: e.getAttribute('aria-label'),
    testid: e.getAttribute('data-testid') || e.getAttribute('data-ctx-id') || e.getAttribute('data-test'),
    cls: (e.className && e.className.toString().slice(0, 120)) || null,
    text: (e.innerText || '').trim().slice(0, 60),
    checked: 'checked' in e ? e.checked : null,
    disabled: e.disabled ?? null,
    parentText: (e.closest('label,div')?.innerText || '').trim().slice(0, 80),
    path: (function p(n, d = 0) { return !n || d > 5 ? '' : p(n.parentElement, d + 1) + '>' + n.tagName.toLowerCase() + (n.id ? '#' + n.id : ''); })(e)
  });
  const out = {
    url: location.pathname,
    when: new Date().toISOString(),
    inputs: [...document.querySelectorAll('input,textarea,select')].filter(vis).map(pick),
    buttons: [...document.querySelectorAll('button,[role=button],a')].filter(vis).filter(e => e.innerText.trim()).map(pick),
    labels: [...document.querySelectorAll('label')].filter(vis).map(pick)
  };
  const json = JSON.stringify(out, null, 2);
  copy(json);
  console.log('Skopiowano do schowka:', out.inputs.length, 'pól,', out.buttons.length, 'przycisków');
})();
```

## Dodatkowo (opcjonalnie, bardzo pomaga)

- Zrzut ekranu okna z oznaczeniem lewej i prawej strony.
- Prawy klik na checkbox „odpisuj automatycznie" → Zbadaj → skopiuj `outerHTML` elementu i jego rodzica (3 poziomy w górę).
- To samo dla pola wiadomości auto-odpisu.
- Odpowiedź na pytania: czy jest limit znaków wiadomości, czy checkbox bywa domyślnie włączony, czy po „Opublikuj" okno zamyka się samo, czy zostaje otwarte (przy „Dodaj kolejny fracht").

Uwaga: w wyniku mogą być dane z Twojego konta (np. wpisane adresy). Przed udostępnieniem przejrzyj plik i wyczyść to, czego nie chcesz pokazywać.
