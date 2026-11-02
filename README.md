# Trans Combajn v5

Rozszerzenie Chrome (MV3) dla `https://platform.trans.eu/*`:

- **Dodawanie frachtów z kolejki**: jedna wklejka zawiera wiele tras. Każda trasa ma własny `FRACHT` (szybkie wypełnianie) i własny `ODPIS` (auto-odpis). Skrypt zaznacza „Odpisuj automatycznie" i wpisuje wiadomość.
- **Odświeżanie ofert** z wznowieniem co 20–40 min (ustawialne).

Stan: wersja 5.0.0. Szczegóły przebudowy: `docs/PLAN.md`. Lista zmian: `CHANGELOG.md`.

## Instalacja

1. Pobierz paczkę: `bash scripts/pack.sh` tworzy `dist/trans-combajn-5.0.0.zip`. Albo użyj katalogu `extension/` bezpośrednio.
2. Chrome → `chrome://extensions` → włącz „Tryb dewelopera".
3. „Załaduj rozpakowane" → wskaż katalog `extension/` (albo rozpakowaną paczkę).
4. Zaloguj się na `platform.trans.eu`. Widżet pojawi się w prawym górnym rogu.
5. Sprawdź łącznik (ŁĄCZNIK: OK) i zakładkę DODAJ → Test selektorów (w zakładce LOG).

## Pierwsze uruchomienie: bezpiecznie

Domyślnie włączony jest **tryb próbny**: skrypt wypełnia okno, zaznacza auto-odpis, sprawdza wszystko, a potem czyści formularz **bez publikacji**. Wyłącz go w DODAJ → Ustawienia, gdy wyniki próby się zgadzają.

Skrypt nigdy nie klika „Wyślij zlecenie" ani „Nie" w dialogu zamknięcia.

## Format wklejki

```
@@ Szczecin → Berlin
FRACHT: Załadunek Szczecin 71-001, rozładunek Berlin 10115, 24t, plandeka, 05.11
ODPIS: Dzień dobry, {zaladunek} do {rozladunek}, termin {data}. Proszę o potwierdzenie dostępności.

@@ Poznań → Hamburg
FRACHT: ...
ODPIS: ...
```

- Blok zaczyna się od `@@`. Tekst po `@@` to etykieta (tylko do logów).
- `FRACHT:` jest wymagany. Bez niego blok jest pomijany z ostrzeżeniem.
- `ODPIS:` jest opcjonalny. Bez niego używany jest szablon domyślny z ustawień. Bez szablonu fracht idzie bez auto-odpisu, a widżet to pokazuje.
- Limit `ODPIS`: **600 znaków**. Dłuższy blokuje pozycję przed publikacją.
- Placeholdery w `ODPIS`: `{zaladunek}` (np. „PL 71-001 Szczecin"), `{rozladunek}`, `{data}` (dd.mm.rrrr), `{etykieta}`. Nieznany placeholder blokuje pozycję.
- Bez żadnego `@@` każda niepusta linia to jeden `FRACHT`, bez `ODPIS`.
- Limit tras na wklejkę: domyślnie 20 (ustawialne).

Pozycja z błędem jest ponawiana raz po wyczyszczeniu formularza. Potem dostaje status `[ERR]`, a kolejka idzie dalej. Po niepotwierdzonej publikacji nie ponawiamy, żeby nie zdublować frachtu. Sprawdź wtedy w Transie.

## Skróty i sterowanie

| Klawisz | Działanie |
|---|---|
| `Alt+H` | Pokaż / ukryj widżet |
| `Esc` | Zatrzymaj dodawanie i odświeżanie (gdy coś działa) |
| `_` | Minimalizuj do jednej linii (np. `ODŚW 42 · 12:31 · wznow 24:10`) |
| `◐` | Przełącz motyw jasny / ciemny |

Zamknięcie widżetu (`x`) w trakcie pracy pyta o potwierdzenie i zatrzymuje moduły.

## Rozwiązywanie problemów

**ŁĄCZNIK: BRAK.** Odśwież stronę Trans. Rozszerzenie czeka na świat strony kilka sekund. Jeśli nadal brak, sprawdź w `chrome://extensions`, czy wtyczka jest włączona i ma dostęp do `platform.trans.eu`.

**Test selektorów pokazuje [BRAK].** Serwis Trans prawdopodobnie zmienił okno „Dodaj fracht". Najpierw otwórz okno (test działa tylko przy otwartym oknie), potem uruchom test ponownie. Wynik wskazuje, który element nie został znaleziony. Selektory są tylko w `extension/src/page/adapters/selectors.js`.

**Pozycja `[ERR]` z komunikatem „nie doczekano się".** Trans odpowiada wolno albo AI nie wypełniło pól. Ponów pozycję przyciskiem „ponów" (dla błędów, które można ponowić).

**Pozycja `[ERR]` z „publikacja NIEPOTWIERDZONA".** Okno nie zamknęło się po kliknięciu. Frachtu mogło nie być albo mógł być opublikowany. Sprawdź w Transie przed ponowieniem.

**Widżet został zamknięty w trakcie pracy.** Po przeładowaniu pozycje ze statusem „praca" dostają `[ERR]` z informacją „sprawdź w Transie". Nie są ponawiane automatycznie.

## Rozwój

```bash
npm test          # testy jednostkowe: parser, magistrala, silnik dodawania
npm run e2e       # test na atrapie okna (wymaga Playwright, patrz niżej)
npm run check     # składnia, testy, manifest, zakazane wzorce (CLAUDE.md)
npm run pack      # paczka ZIP w dist/
```

E2E używa Playwright z przeglądarką Chromium. Jeśli Playwright jest zainstalowany globalnie:

```bash
NODE_PATH=$(npm root -g) npm run e2e
```

Atrapa `tests/e2e/mock-trans.html` to syntetyczny HTML zbudowany według `docs/ZBADANIE-ELEMENTOW.md`. Nie łączy się z Trans i nie zawiera danych z konta.

## Struktura

| Ścieżka | Zawartość |
|---|---|
| `extension/manifest.json` | MV3, uprawnienie tylko `storage`, dwa światy (MAIN i izolowany) |
| `extension/src/page/` | Świat strony: `core/` (czas, DOM, magistrala), `adapters/` (selektory, okno), `modules/` (dodawanie, odświeżanie, selftest) |
| `extension/src/content/` | Widżet, kolejka, silnik dodawania, harmonogram, trwały stan |
| `extension/src/shared/` | Protokół, parser wklejki, funkcje tekstowe (używane w obu światach i w testach) |
| `tests/` | Testy Node (`node --test`) i test E2E na atrapie |
| `scripts/` | `check.sh` (kontrola), `pack.sh` (ZIP) |
| `baseline-v4/` | Kod wersji 4.0, tylko referencja. Do usunięcia po akceptacji |
| `docs/` | Plan, zbadane selektory, format wklejki, prompty |

## Ograniczenia i ryzyko

- Skrypt emuluje ruch myszy i losowe opóźnienia, ale zdarzenia są syntetyczne (`isTrusted: false`) i mogą być rozpoznawalne. Regulamin Trans.eu może ograniczać automatyzację. Tempo jest umiarkowane (domyślnie 8–20 s między frachtami). Nie obiecujemy niewykrywalności.
- Selektory zweryfikowano na żywo 02.11.2026 (`docs/ZBADANIE-ELEMENTOW.md`). Serwis może je zmienić.
- Wersja 5.0.0 nie była jeszcze testowana na żywo na Trans.eu. Patrz `CHANGELOG.md` (lista do ręcznego sprawdzenia).
