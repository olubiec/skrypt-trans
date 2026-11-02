# CLAUDE.md: skrypt-trans (Trans Combajn v5)

Rozszerzenie Chrome (MV3) dla `https://platform.trans.eu/*`: dodawanie frachtów z kolejki (z auto-odpisem) i odświeżanie ofert. Właściciel: olubiec. Język komunikacji i komentarzy: polski. Bez emoji w UI, logach i commitach.

## Czytaj najpierw (w tej kolejności)

1. `docs/PLAN.md`: decyzje, błędy v4, architektura docelowa, fazy 0-6.
2. `docs/ZBADANIE-ELEMENTOW.md`: **zweryfikowane na żywo** selektory i zachowanie okna „Dodaj fracht". To jest źródło prawdy, nie zgadywanie.
3. `docs/OKNO-TRANS.md` + `docs/img/okno-dodaj-fracht.png`: układ okna.
4. `docs/FORMAT-KOLEJKI.md`: format wklejki (`@@`, `FRACHT:`, `ODPIS:`) i szkic parsera.
5. `docs/PROMPTS.md`: prompty fazowe (sekcja B) i generator wklejki (sekcja A).
6. `baseline-v4/`: kod wersji 4.0 bez zmian. Referencja, nie edytować.

## Decyzje (nie podważać bez pytania)

- Usunąć całą obsługę WalkingFloor i Jumbo. AI Transa ustawia typ nadwozia samo.
- Usunąć martwy kod: `popup.html`, `popup.js`, `background.js` (manifest ich nie ładuje).
- Auto-odpis: jedna wklejka = wiele tras. Każda trasa ma `FRACHT` (szybkie wypełnianie, lewa strona) i własny `ODPIS` (wiadomość, prawa strona). Przy każdym frachcie skrypt zaznacza „Odpisuj automatycznie" i wpisuje `ODPIS`. Limit `ODPIS` to **600 znaków**.
- Design: „dyspozytorski terminal". Płasko, kompaktowo, monospace, zakładki ODŚW / DODAJ / LOG. Zero glassmorphismu, gradientów, blur, neonów, emoji. Tylko fonty systemowe (bez Google Fonts). Paleta i szczegóły w sekcji 5 `PLAN.md`.
- Priorytety: stabilność selektorów, nowy design, auto-odpis w dodawarce, porządek w kodzie.

## Zweryfikowane selektory (okno „Dodaj fracht", 02.11.2026)

Klasy CSS są haszowane (`_5lpmr_g7_c`), **nie używać ich**. Trzymać się `name`, `placeholder`, roli i tekstu.

| Element | Selektor |
|---|---|
| Szybkie wypełnianie | `textarea[name="aiPrompt"]` (licznik `n / 2000`) |
| Rozpoznaj dane | `button` z tekstem „Rozpoznaj dane", **pojawia się dopiero po wpisaniu tekstu** |
| Pole auto-odpisu | `textarea[name="defaultReplyMessage"]` (licznik `n / 600`) |
| Checkbox „Odpisuj automatycznie" | `input[type=checkbox]` w kontenerze etykiety o tekście „Odpisuj automatycznie". Brak `name`/`id` |
| Dodatkowy opis (nie mylić!) | `textarea[name="shippingRemarks"]` (limit 2000) |
| Opublikuj fracht | `button` z tekstem „Opublikuj fracht" |
| Menu strzałki przy Opublikuj | drugi `button` bez tekstu w tym samym kontenerze |
| Dodaj kolejny fracht | `span` w tym menu z ukrytym `input[type=checkbox]` (**nie** `label`) |
| Wyczyść formularz | link o tym tekście. Otwiera dialog „Czy na pewno chcesz zamknąć formularz?" z „Nie" / „Zamknij formularz" |
| Typ (FTL/LTL/multi) | `input[type=radio][name="freightType"]` |
| Pojazd | `input[type=checkbox][name="vehicleSizeId"]` x4 |
| Typ nadwozia | `input[name="requiredTruckBodies"]` (lista „Wybierz z listy") |

Wykrywanie końca pracy AI: czekać na **wartości pól** (chipy lokalizacji „PL 71-001 Szczecin" / „DE 10115 Berlin", wartości dat i godzin), a nie na kolory ani klasy. AI kończy w ok. 6 s.

## Twarde zasady bezpieczeństwa (dla kodu i dla testów w przeglądarce)

1. **Nigdy nie klikać „Wyślij zlecenie"** (menu strzałki). Kod ma ten element jawnie wykluczony.
2. **Nie publikować frachtu w testach bez wyraźnej zgody właściciela w czacie**, z podaniem co zostanie opublikowane. Do testów używać „Zapisz kopię roboczą" tylko za zgodą. Domyślnie testy kończą się „Wyczyść formularz" → „Zamknij formularz".
3. Dialog „Zamknij formularz" musi być obsłużony w kodzie (limit czasu, jawny błąd), inaczej zawiesi kolejkę.
4. Nie zapisywać ani nie logować danych z konta (osoba odpowiedzialna, adresy, nazwy kontrahentów) do widżetu, storage ani repo. Zrzuty DOM do `tests/fixtures/` najpierw zanonimizować.
5. Nie modyfikować DOM Transa: żadnych stylów ani `data-*` na jego elementach (v4 koloruje wiersze, v5 używa `WeakSet`).
6. Brak zewnętrznych zapytań sieciowych z rozszerzenia i brak zewnętrznych fontów.
7. Skrypt emuluje ruch myszy i losowe opóźnienia, ale zdarzenia syntetyczne są rozpoznawalne (`isTrusted: false`), a regulamin Trans.eu może ograniczać automatyzację. Zostawić umiarkowane tempo (domyślnie 8-20 s między frachtami) i nie obiecywać „niewykrywalności".

## Zasady kodu

- Wszystkie selektory tylko w `src/page/adapters/selectors.js`, każdy jako łańcuch strategii (atrybut → rola+tekst → struktura) ze zwracaną nazwą użytej strategii.
- Każdy krok ma limit czasu i czytelny błąd (co czekało, ile). Zakaz pustych `catch`.
- Komunikacja content ↔ page przez `CustomEvent` z `{v, id, type, payload}`. Brak odpowiedzi w limicie = błąd kroku, nie zawieszenie.
- Stop musi przerywać bieżące oczekiwanie (`AbortController`), nie tylko ustawiać flagę.
- Sukces publikacji logować dopiero po potwierdzeniu (modal zamknięty albo zmieniony stan). Nigdy „Opublikowano" na ślepo.
- Błędna pozycja kolejki nie blokuje reszty: 1 ponowienie, potem status `blad`, wyczyścić formularz, przejść dalej.
- Kolejka i statystyki w `chrome.storage.local`. Uprawnienie manifestu: tylko `storage`.
- Testy parsera: `node --test tests/parser.test.js`.

## Testy w przeglądarce (Claude in Chrome)

Gdy sesja ma narzędzia przeglądarki: użyć rozszerzenia Chrome na zalogowanym koncie. Zawsze nowa karta, bez ponownego użycia starych. Odczyt DOM przez `javascript_tool` jest bezpieczny. Przed każdym kliknięciem przyciskiem o skutkach (publikacja, zlecenie, kopia robocza, szablon) zapytać o zgodę. Po testach zamknąć własne karty.

## Stan prac

| Faza | Status |
|---|---|
| 0. Rozpoznanie okna | **zrobione** (`docs/ZBADANIE-ELEMENTOW.md`) |
| 1. Szkielet | do zrobienia |
| 2. Selektory + selftest | do zrobienia |
| 3. Dodawarka v5 + auto-odpis | do zrobienia |
| 4. Refresh v5 | do zrobienia |
| 5. Design | do zrobienia |
| 6. Dopięcie, README, ZIP | do zrobienia |

Pracować fazami, każda na gałęzi `feature/v5-faza-N`, z krótkim opisem zmian i listą rzeczy do ręcznego sprawdzenia. Po każdej fazie przegląd promptem z końca `docs/PROMPTS.md`. Aktualizować tabelę powyżej po zakończeniu fazy.

## Otwarte kwestie

- Czy rozpoznawanie można uruchomić samym Enterem w polu (przycisk ma ikonę ↵), czy trzeba kliknąć przycisk. Do sprawdzenia w fazie 2.
- Czy zaznaczenie „Odpisuj automatycznie" przy pustej wiadomości jest dozwolone przez Trans, czy blokuje publikację.
- Czy pole `defaultReplyMessage` przeżywa „Dodaj kolejny fracht" (formularz może się zresetować).
- Maks. liczba tras na wklejkę i tempo: propozycja 20 tras, 8-20 s.
