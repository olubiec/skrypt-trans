# Format kolejki (wklejka z wieloma trasami)

Jedna wklejka = wiele tras. Każda trasa to blok zaczynający się od linii `@@`.

```
@@ TRASA 1
FRACHT: <tekst do szybkiego wypełniania, może być wielolinijkowy>
ODPIS: <wiadomość do automatycznej odpowiedzi, może być wielolinijkowa>

@@ TRASA 2
FRACHT: ...
ODPIS: ...
```

## Reguły parsera

1. Blok zaczyna się od linii zaczynającej się od `@@`. Reszta tej linii to etykieta (opcjonalna, tylko do logów).
2. Sekcje `FRACHT:` i `ODPIS:` zaczynają się od klucza na początku linii. Treść trwa do następnego klucza lub następnego `@@`.
3. Białe znaki na końcach linii i puste linie na początku/końcu sekcji są obcinane. Wewnętrzne łamanie linii zostaje.
4. `FRACHT` jest wymagany. Blok bez niego jest pomijany z ostrzeżeniem w logu.
5. `ODPIS` opcjonalny. Gdy go brak, używany jest szablon domyślny z ustawień (jeśli ustawiony), a w przeciwnym razie fracht idzie bez wiadomości i checkbox nie jest zaznaczany, a log to zaznacza.
6. Tryb zgodności: wklejka bez żadnego `@@` jest traktowana po staremu, jedna linia = jeden `FRACHT`, bez `ODPIS` (z szablonem domyślnym).
7. Dozwolone placeholdery w `ODPIS` (podmieniane przez skrypt, jeśli jest dane): `{zaladunek}`, `{rozladunek}`, `{data}`, `{etykieta}`. Dane pobierane z pól formularza po rozpoznaniu przez AI Transa. Nieznany placeholder zostaje w tekście i skrypt ostrzega w logu, zanim opublikuje.

8. Limit: `ODPIS` dłuższy niż 600 znaków daje ostrzeżenie w logu i oznacza pozycję jako błędną przed publikacją (pole w Transie ma limit 600).

## Przykład

```
@@ Szczecin → Berlin
FRACHT: Załadunek Szczecin 71-001, rozładunek Berlin 10115, 24t, plandeka, 05.11, 2 palety
ODPIS: Dzień dobry, dziękuję za ofertę na trasę Szczecin–Berlin. Załadunek 05.11 do 14:00, rozładunek do 12:00 następnego dnia. Proszę o potwierdzenie dostępności auta i numeru rejestracyjnego. Pozdrawiam

@@ Poznań → Hamburg
FRACHT: ...
ODPIS: ...
```

## Szkic parsera (do implementacji w `src/content/queue/parser.js`)

```js
export function parseQueue(raw, defaults = {}) {
  const text = raw.replace(/\r\n/g, '\n').trim();
  const warnings = [];
  if (!/^@@/m.test(text)) {
    const items = text.split('\n').map(s => s.trim()).filter(Boolean)
      .map((fracht, i) => ({ label: `#${i + 1}`, fracht, odpis: defaults.odpis ?? null }));
    return { items, warnings };
  }
  const items = [];
  for (const block of text.split(/^@@/m).slice(1)) {
    const [head, ...rest] = block.split('\n');
    const body = rest.join('\n');
    const sec = {};
    let key = null;
    for (const line of body.split('\n')) {
      const m = line.match(/^(FRACHT|ODPIS):\s?(.*)$/);
      if (m) { key = m[1]; sec[key] = [m[2]]; }
      else if (key) sec[key].push(line);
    }
    const clean = k => sec[k] ? sec[k].join('\n').trim() : null;
    const fracht = clean('FRACHT');
    if (!fracht) { warnings.push(`Pominięto blok „${head.trim()}": brak FRACHT`); continue; }
    items.push({ label: head.trim() || `#${items.length + 1}`, fracht, odpis: clean('ODPIS') ?? defaults.odpis ?? null });
  }
  return { items, warnings };
}
```

Testy do napisania: blok bez `FRACHT`, wielolinijkowy `ODPIS`, tryb zgodności, CRLF, pusta wklejka, `@@` bez etykiety, nieznany placeholder.
