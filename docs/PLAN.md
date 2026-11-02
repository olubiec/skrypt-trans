# Plan przebudowy: Trans Combajn v5

Stan wyjściowy: `baseline-v4/` (kod 1:1 z wersji 4.0, bez zmian).

## 1. Decyzje (z wywiadu)

| Temat | Decyzja |
|---|---|
| Auto-odpis | Jedna wklejka zawiera wiele tras. Każda trasa ma własny prompt do szybkiego wypełniania (lewa strona okna) i własną wiadomość auto-odpowiedzi (prawa strona). Skrypt zaznacza checkbox „odpisuj automatycznie" przy każdym frachcie i wpisuje wiadomość. |
| Priorytety | Stabilność selektorów, nowy design, auto-odpis w dodawarce, porządek w kodzie. |
| Design | „Dyspozytorski terminal": płasko, kompaktowo, monospace, bez glassmorphismu, gradientów i neonów. |
| Usuwamy | Cała obsługa WalkingFloor i Jumbo (`correctBodyType`, `selectBodyType`, `uncheckByDataCtxId`, `NEEDS_UNCHECK_*`, `findBodyTypeDropdown`). AI Transa już to robi. |
| Usuwamy | Martwy kod: `popup.html`, `popup.js`, `background.js` (manifest ich nie ładuje). |

## 2. Co znalazłem w kodzie v4 (powody przebudowy)

**Błędy i ryzyka**
1. `popup.*` i `background.js` nie są podpięte w manifeście. Do tego `background.js` używa `alarms`/`storage`, których nie ma w uprawnieniach. Martwy kod.
2. Pętla dodawania czeka na `__tr_ack_add_done__` bez limitu czasu. Jeśli inject nie odpowie, kolejka wisi na zawsze. „Stop" nie odblokowuje tego `Promise`.
3. `publishFreight()` zwraca, czy modal się zamknął, ale wynik jest ignorowany. Log zawsze pisze „✓ Opublikowano!", nawet gdy publikacja się nie udała.
4. Po błędzie fracht i tak liczy się jako dodany (`currentAdded++`), a formularz zostaje brudny dla następnego.
5. `waitForAiFill` zgaduje stan po kolorze `box-shadow` i klasach (`active`, `focus`...). `document.activeElement === ta` jest prawdą zaraz po kliknięciu w pole, więc „blask" jest w praktyce zawsze włączony. Kruche i niewiarygodne.
6. Logika `index === 0 && total > 1` dla checkboxa „Dodaj kolejny fracht" psuje się, bo `total` zmienia się, gdy dorzucasz do kolejki w trakcie pracy.
7. Refresh koloruje wiersze Transa (`row.style.backgroundColor`) i zapisuje `data-trans-refreshed` w ich DOM. To zmiana cudzego DOM, widoczna dla strony.
8. Duplikaty: `gaussianRandom`, `humanDelay`, `clickWithOffset`, `sleep*`, `fatigueFactor` są skopiowane w dwóch plikach, z drobnymi różnicami.
9. Fonty z Google Fonts w Shadow DOM i popupie: dodatkowe zapytania z każdej strony Transa.
10. Manifest: `activeTab` i `scripting` niepotrzebne. Brak `storage`, więc kolejka i statystyki znikają po przeładowaniu.
11. Zamknięcie widżetu (×) w trakcie dodawania nie zatrzymuje dodawarki.
12. Komunikaty `CustomEvent` bez wersji i identyfikatorów. Nie da się sparować odpowiedzi z poleceniem.

**Uwaga o ryzyku (Twoja decyzja):** skrypt emuluje ruch myszy i losowe opóźnienia, żeby wyglądać jak człowiek. Zdarzenia syntetyczne mają `isTrusted === false`, więc i tak są rozpoznawalne, a regulamin Trans.eu może automatyzację ograniczać. Zostawiam to w planie jako moduł `human`, ale warto trzymać umiarkowane tempo i nie budować na tym czegoś, bez czego konto nie może się obejść.

## 3. Architektura docelowa

```
extension/
  manifest.json            MV3, uprawnienia: storage
  src/
    page/                  świat MAIN (dostęp do Reacta)
      core/
        human.js           gaussian, humanDelay, sleep, klik z offsetem, wklejanie
        dom.js             waitFor(), waitForGone(), isVisible(), MutationObserver
        bus.js             protokół wiadomości (id, version, timeout)
      adapters/
        selectors.js       JEDNO miejsce na wszystkie selektory + łańcuchy zapasowe
        modal.js           okno „Dodaj fracht": lewa strona (quick fill), prawa (auto-odpis)
      modules/
        add.js             dodawanie frachtu z auto-odpisem
        refresh.js         odświeżanie ofert
        selftest.js        raport: które selektory działają
    content/               świat izolowany (UI + stan)
      ui/                  widżet (Shadow DOM), motyw, komponenty
      state/               store, persist (chrome.storage.local)
      queue/               parser formatu, kolejka, retry
      scheduler.js         auto-wznowienie sesji refreshu
  docs/
  tests/                   parser kolejki (node), testy selektorów na zapisanych HTML
```

**Zasady**
- Wszystkie selektory tylko w `adapters/selectors.js`. Każdy ma łańcuch: `data-*`/`aria-*` → rola + tekst → struktura. Przy awarii `selftest` mówi dokładnie, który zawiódł.
- Zamiast `sleep` i pollingu stylów: `waitFor(condition, timeout)` oparte na `MutationObserver`. Każdy krok ma limit czasu i jasny błąd.
- Każda komenda ma `id`, odpowiedź zawiera to samo `id`. Brak odpowiedzi w limicie = błąd kroku, nie zawieszenie.
- Nie modyfikujemy DOM Transa (koniec z kolorowaniem wierszy; stan w `WeakSet`).
- Brak zewnętrznych fontów i żadnych zapytań sieciowych z rozszerzenia.

## 4. Format kolejki i auto-odpis

Szczegóły i parser: `docs/FORMAT-KOLEJKI.md`. W skrócie:

```
@@ TRASA 1
FRACHT: <tekst do szybkiego wypełniania>
ODPIS: <wiadomość wysyłana automatycznie do ofert na tę trasę>
@@ TRASA 2
...
```

Przepływ dla jednej trasy:
1. Otwórz „Dodaj fracht" (lub użyj otwartego okna).
2. Wklej `FRACHT` w pole szybkiego wypełniania, „Rozpoznaj dane", czekaj aż pola trasy się wypełnią.
3. Prawa strona: zaznacz checkbox „odpisuj automatycznie" (zawsze sprawdź stan, nie klikaj na ślepo), wpisz `ODPIS` w pole wiadomości, zweryfikuj, że wartość się utrzymała.
4. Walidacja przed publikacją: załadunek, rozładunek, data, checkbox włączony, wiadomość niepusta.
5. Publikuj, potwierdź sukces (modal się zamknął albo pojawił się fracht na liście). Przy porażce: retry 1x, potem oznacz trasę jako błędną i idź dalej, nie zostawiaj brudnego formularza.
6. Wyczyść formularz.

Wiadomość domyślna: jeśli trasa nie ma `ODPIS`, użyj szablonu domyślnego z ustawień widżetu (z placeholderami `{zaladunek}`, `{rozladunek}`, `{data}`).

## 5. Design: „Dyspozytorski terminal"

- Paleta: papierowy szary `#e8e5de` (tło), tusz `#1c1b19` (tekst), akcent pomarańcz ostrzegawczy `#d9480f`, OK `#2b8a3e`, błąd `#c92a2a`. Tryb ciemny opcjonalnie: ciepły grafit `#1f1e1b`, nie granat.
- Narożniki `2px`, ramki `1px` pełne, cień twardy bez rozmycia (`3px 3px 0`). Zero gradientów, zero blur.
- Typografia: tylko systemowe stosy. Nagłówki i dane: `ui-monospace, "Cascadia Mono", Consolas, monospace`. Etykiety: `system-ui` małe kapitaliki z rozstrzeleniem.
- Układ: wąski pasek tytułowy w stylu tablicy odlotów (`TRANS//COMBAJN  v5`), zakładki `ODŚW | DODAJ | LOG` zamiast jednej długiej kolumny, tabela kolejki z kolumnami `#  TRASA  STATUS`.
- Statusy tekstem w nawiasach `[OK] [ERR] [CZEKA] [PRACA]` plus kwadratowa dioda 8x8. Bez emoji.
- Minimalizacja do jednej linii: `ODŚW 42 · 12:31 · wznow 24:10`.
- Skróty: `Alt+H` pokaż/ukryj, `Esc` stop.

## 6. Fazy

| Faza | Zakres | Wynik |
|---|---|---|
| 0. Rozpoznanie | Zrzut DOM nowego okna „Dodaj fracht" (lewa i prawa strona), kontrolki „odpisuj automatycznie". Fragment do konsoli w `docs/RECON.md`. | Zapisane HTML-e w `tests/fixtures/`, lista selektorów |
| 1. Szkielet | Nowa struktura katalogów, manifest, `core/` (human, dom, bus), usunięcie martwego kodu i WF/Jumbo | Wtyczka ładuje się, widżet pokazuje się |
| 2. Selektory + selftest | `selectors.js`, `modal.js`, `selftest.js`, przycisk „Test" w widżecie | Raport zgodności z aktualnym UI |
| 3. Dodawarka v5 | Parser formatu, kolejka z persystencją, krok po kroku z walidacją, auto-odpis, retry, timeouty | Dodawanie tras z odpisem end-to-end |
| 4. Refresh v5 | Wspólny `core`, bez modyfikacji DOM, scheduler z konfigurowalnym oknem 20–40 min | Parytet z v4 + stabilność |
| 5. Design | Motyw terminalowy, zakładki, tabela kolejki, minimalizacja | Nowy wygląd |
| 6. Dopięcie | Testy parsera, README, wersja, paczka ZIP do instalacji | Release 5.0 |

Kolejność ma znaczenie: faza 0 odblokowuje wszystko, bo nie widzę jeszcze nowego okna.

## 7. Otwarte kwestie

- **Brak zrzutu okna.** Wspomniałeś zdjęcie okna z dwiema stronami, ale nie dotarło do mnie. Potrzebny jest zrzut lub (lepiej) HTML z `docs/RECON.md`.
- Czy wiadomość auto-odpisu ma limit znaków w Transie? Do sprawdzenia w fazie 0.
- Czy checkbox „odpisuj automatycznie" bywa domyślnie włączony? Skrypt i tak zawsze sprawdza stan.
- Maks. liczba tras na jedną wklejkę i tempo (przerwa między frachtami): propozycja 20 tras i 8–20 s.
