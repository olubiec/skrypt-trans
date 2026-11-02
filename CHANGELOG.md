# Changelog

## 5.0.0

Przebudowa z wersji 4.0 (`baseline-v4/`, bez zmian, referencja). Plan i decyzje: `docs/PLAN.md`.

### Nowe
- Wklejka z wieloma trasami: `@@` / `FRACHT:` / `ODPIS:`. Każda trasa ma własny auto-odpis. Format: `docs/FORMAT-KOLEJKI.md`.
- Auto-odpis: skrypt zaznacza „Odpisuj automatycznie" i wpisuje `ODPIS`. Limit 600 znaków, placeholdery `{zaladunek}`, `{rozladunek}`, `{data}`, `{etykieta}`.
- Kolejka w `chrome.storage.local`: przeżywa przeładowanie strony. Statusy `[CZEKA]`, `[PRACA]`, `[OK]`, `[ERR]`, ponów / usuń.
- Tryb próbny (domyślnie włączony): wypełnia, sprawdza i czyści formularz bez publikacji.
- Selftest („Test selektorów"): raport `[OK]` / `[BRAK]` / `[POMIN]` dla każdego elementu okna.
- Harmonogram odświeżania: wznowienie losowo co 20–40 min (ustawialne), plan w storage, statystyki sesji.
- Skróty: `Alt+H` (pokaż / ukryj), `Esc` (stop).
- Motyw „dyspozytorski terminal": zakładki ODŚW / DODAJ / LOG, jasny i ciemny, minimalizacja do jednej linii.

### Zmiany względem 4.0
- Usunięto obsługę WalkingFloor i Jumbo (AI Transa ustawia typ nadwozia sam).
- Usunięto martwy kod: `popup.html`, `popup.js`, `background.js`.
- Selektory tylko w `src/page/adapters/selectors.js`, jako łańcuchy strategii (atrybut, tekst, struktura). Klasy CSS haszowane nie są używane.
- Okno „Dodaj fracht" rozpoznawane po polach (`name="aiPrompt"`, `name="defaultReplyMessage"`), a nie po kolorach. Koniec z `waitForAiFill` na blasku.
- Każdy krok ma limit czasu i nazwę w błędzie. Stop przerywa oczekiwanie (`AbortController`).
- Sukces publikacji logowany dopiero po zamknięciu okna. Błąd publikacji bez potwierdzenia nie jest ponawiany.
- Dialog „Zamknij formularz" obsłużony z limitem czasu. Przycisk „Nie" nigdy nie jest klikany.
- Odświeżanie nie zapisuje niczego w DOM Transa (koniec z kolorowaniem wierszy i `data-*`). Stan w `WeakSet`.
- Puste `catch` zastąpione raportem błędu (z ograniczeniem częstotliwości).
- Duplikaty helperów (`gaussianRandom`, `humanDelay`, `clickWithOffset`, `sleep`) połączone w `src/page/core/`.
- Fonty z Google Fonts usunięte. Tylko fonty systemowe. Zero zewnętrznych zapytań z rozszerzenia.
- Manifest: uprawnienie tylko `storage` (było `activeTab`, `scripting`).
- Kontrast tekstu min. 4.5:1. Zielony i czerwony przyciemnione względem planu (`#1e6b2c`, `#a61e1e`).

### Testy
- `npm test`: 26 testów Node (parser, magistrala, silnik dodawania na atrapach).
- `npm run e2e`: 7 sprawdzeń na syntetycznej atrapie okna w Chromium (tryb próbny, publikacja z placeholderami, błąd potwierdzenia bez duplikatu, „Wyślij zlecenie" nietknięte, brak błędów JS).
- `npm run check`: składnia, testy, manifest, zakazane wzorce.

### Nie sprawdzono na żywo (do ręcznego testu na platform.trans.eu)
- Pełny przebieg dodawania na prawdziwym oknie. Selektory zweryfikowano w `docs/ZBADANIE-ELEMENTOW.md`, ale nie przeprowadzono publikacji testowej.
- Odświeżanie (port z v4): parytet z wersją 4.0 i brak zmian w DOM Transa (sprawdzić w Elements).
- Otwarte kwestie z `CLAUDE.md`:
  - Czy „Rozpoznaj dane" da się uruchomić Enterem. Obecnie tylko klik w przycisk.
  - Czy zaznaczenie „Odpisuj automatycznie" przy pustej wiadomości jest dozwolone. Skrypt nie zaznacza checkboxa bez wiadomości.
  - Czy pole `defaultReplyMessage` przeżywa „Dodaj kolejny fracht". Skrypt nie używa tego przycisku, zawsze czyści formularz i wpisuje ODPIS od nowa.
  - Tempo: domyślnie 20 tras na wklejkę i 8–20 s przerwy. Do oceny po pierwszych przebiegach.
