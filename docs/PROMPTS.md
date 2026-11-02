# Prompty

Dwie grupy:
- **A.** Prompty do generowania wklejki z trasami (do ChatGPT/Claude, na co dzień).
- **B.** Prompty implementacyjne dla Claude Code, fazami, zgodnie z `docs/PLAN.md`.

---

## A. Generator wklejki: trasy + prompt + odpis

### A1. Dopisek do Twojego istniejącego promptu

Nie mam Twojego obecnego promptu, który tworzy prompty do szybkiego wypełniania. Dopisz na jego końcu poniższą sekcję, a reszty nie ruszaj.

```
=== FORMAT WYJŚCIA (OBOWIĄZKOWY) ===
Dla każdej trasy z listy wejściowej zwróć jeden blok w dokładnie takim formacie:

@@ <etykieta trasy, np. Szczecin → Berlin>
FRACHT: <prompt do szybkiego wypełniania tej trasy, według zasad powyżej>
ODPIS: <wiadomość do automatycznej odpowiedzi dla ofert na tę trasę>

Zasady formatu:
1. Zwróć WSZYSTKIE bloki w jednej odpowiedzi, jeden pod drugim, oddzielone pustą linią.
2. Nie dodawaj żadnego tekstu przed pierwszym @@ ani po ostatnim bloku. Bez wstępu, bez podsumowania, bez nagłówków, bez markdownu, bez cudzysłowów wokół treści.
3. Klucze FRACHT: i ODPIS: zawsze wielkimi literami, na początku linii, z dwukropkiem.
4. Linia zaczynająca się od @@ jest zarezerwowana jako separator. Nigdy nie używaj @@ w treści.
5. Każda trasa ma własny, dopasowany ODPIS. Nie kopiuj jednego tekstu do wszystkich.

Zasady dla ODPIS:
- Pisz po polsku, grzecznie, rzeczowo, 3–6 zdań.
- Zawieraj: potwierdzenie trasy (skąd–dokąd), termin załadunku i rozładunku, ważne warunki ładunku (waga, rodzaj, typ pojazdu, uwagi), prośbę o potwierdzenie dostępności i danych pojazdu.
- Używaj wyłącznie danych z wejścia. Jeśli czegoś brakuje, pomiń to zdanie. Nie wymyślaj cen, godzin, numerów ani nazw firm.
- Nie używaj emoji ani wykrzykników.
- Dozwolone placeholdery, jeśli chcesz zostawić dane do uzupełnienia przez skrypt: {zaladunek} {rozladunek} {data}.

=== DANE WEJŚCIOWE ===
<tu wklej listę tras i szczegóły ładunków>
```

### A2. Wersja samodzielna (gdy nie masz jeszcze promptu bazowego)

```
Jesteś asystentem spedytora. Z podanej listy tras przygotuj dane do wprowadzenia ładunków na giełdę Trans.eu.

Dla każdej trasy wygeneruj dwie rzeczy:
1) FRACHT: zwięzły opis ładunku w jednym akapicie, który system Trans.eu potrafi automatycznie rozpoznać (miejsce załadunku z kodem pocztowym, miejsce rozładunku z kodem pocztowym, daty, waga, rodzaj ładunku, liczba palet lub wymiary, typ pojazdu, ważne uwagi). Bez opinii i bez wstępów.
2) ODPIS: wiadomość do przewoźników, którzy odpowiedzą na ofertę (3–6 zdań, po polsku, rzeczowo): potwierdzenie trasy, terminy, warunki ładunku, prośba o potwierdzenie dostępności i danych pojazdu.

Format wyjścia, dokładnie:

@@ <etykieta trasy>
FRACHT: <treść>
ODPIS: <treść>

Zasady: wszystkie bloki w jednej odpowiedzi, bez tekstu przed pierwszym @@ i po ostatnim bloku, bez markdownu, bez emoji, nie wymyślaj danych których nie ma na wejściu (pomiń zdanie), linia z @@ jest tylko separatorem.

TRASY:
<wklej trasy>
```

### A3. Szybka kontrola przed wklejeniem do wtyczki

Po wygenerowaniu sprawdź: czy liczba bloków `@@` równa się liczbie tras, czy w każdym bloku są `FRACHT:` i `ODPIS:`, czy brak tekstu przed pierwszym `@@`. Widżet w v5 pokaże te same ostrzeżenia po wklejeniu (parser zwraca `warnings`).

---

## B. Prompty implementacyjne (Claude Code)

Wspólny kontekst do wklejenia na początku każdej sesji:

```
Repo: olubiec/skrypt-trans. Rozszerzenie Chrome MV3 dla platform.trans.eu.
Czytaj: docs/PLAN.md, docs/FORMAT-KOLEJKI.md, docs/RECON.md. Kod wyjściowy: baseline-v4/.
Zasady: bez emoji w UI i logach, bez zewnętrznych fontów i zapytań sieciowych, nie modyfikuj DOM strony Trans (żadnych stylów ani data-* na jej elementach), wszystkie selektory tylko w src/page/adapters/selectors.js, każdy krok z limitem czasu, żadnych nieopisanych wyjątków połykanych przez pusty catch.
Pracuj na gałęzi feature/v5-<faza>. Po fazie: krótki opis zmian i lista rzeczy do ręcznego sprawdzenia w przeglądarce.
```

### Faza 0: rozpoznanie (robisz Ty, Claude pomaga z analizą)

```
Przeczytaj tests/fixtures/modal-add-freight.json (zrzut DOM okna „Dodaj fracht"). Zidentyfikuj:
- pole szybkiego wypełniania (lewa strona) i przycisk „Rozpoznaj dane",
- checkbox „odpisuj automatycznie" oraz pole wiadomości auto-odpisu (prawa strona),
- pola trasy (załadunek, rozładunek), datę, przycisk „Opublikuj fracht", checkbox „Dodaj kolejny fracht", link „Wyczyść formularz".
Dla każdego elementu zaproponuj łańcuch selektorów (data-*/aria → rola+tekst → struktura) i oceń odporność 1–5. Wynik zapisz w docs/SELEKTORY.md jako tabelę. Niczego jeszcze nie koduj.
```

### Faza 1: szkielet

```
Zrealizuj fazę 1 z docs/PLAN.md.
1. Utwórz strukturę extension/ jak w sekcji 3 planu.
2. Napisz extension/manifest.json (MV3, wersja 5.0.0, uprawnienie tylko "storage", content script isolated dla src/content/*, content script world MAIN dla src/page/*, matches https://platform.trans.eu/*). Usuń niepotrzebne uprawnienia.
3. Przenieś i połącz helpery z baseline-v4/inject-add.js i inject-refresh.js do src/page/core/human.js (jedna wersja gaussianRandom, humanDelay, sleep, klik z offsetem, wklejanie do pola, fatigueFactor). Zachowaj zachowanie z v4, ale bez duplikatów.
4. Napisz src/page/core/dom.js: isVisible, waitFor(cond, {timeout, interval}) oparte na MutationObserver z awaryjnym rzadkim pollingiem, waitForGone, z czytelnymi błędami (co czekało i ile).
5. Napisz src/page/core/bus.js: wiadomości przez CustomEvent z polami {v, id, type, payload}, request(type, payload, {timeout}) zwraca Promise z odpowiedzią o tym samym id albo odrzuca po limicie czasu. Lub po stronie page: on(type, handler) zwracający wynik.
6. Usuń z projektu: popup.*, background.js oraz całą obsługę WalkingFloor/Jumbo.
7. Widżet na tym etapie: pusty szkielet z paskiem tytułu, przeciąganiem i Alt+H. Żadnych zewnętrznych fontów.
Kryterium: wtyczka ładuje się bez błędów w konsoli, widżet się pokazuje, bus odpowiada na testowe ping/pong.
```

### Faza 2: selektory i selftest

```
Zrealizuj fazę 2. Na podstawie docs/SELEKTORY.md:
1. src/page/adapters/selectors.js: każdy element jako lista funkcji-strategii wykonywanych po kolei, zwraca pierwszy widoczny wynik i nazwę strategii, która zadziałała. Eksport get(name) i describe().
2. src/page/adapters/modal.js: API okna: isOpen(), open(), setQuickFill(text), recognize(), waitForRecognized(), setAutoReply(enabled, message), readFields(), validate(), publish(), clear(). Każda metoda rzuca błąd z nazwą kroku i listą nieudanych selektorów.
3. src/page/modules/selftest.js: komenda bus 'selftest' zwracająca {ok, results:[{name, found, strategy}]}.
4. W widżecie przycisk TEST: uruchamia selftest i wypisuje wynik w logu jako [OK]/[BRAK].
Bez dodawania frachtów. Kryterium: na otwartym oknie Dodaj fracht selftest zwraca komplet [OK].
```

### Faza 3: dodawarka v5 z auto-odpisem

```
Zrealizuj fazę 3.
1. src/content/queue/parser.js zgodnie z docs/FORMAT-KOLEJKI.md (użyj szkicu, popraw jeśli widzisz błąd). Testy w tests/parser.test.js uruchamiane przez node --test, pokrywające przypadki z końca dokumentu.
2. src/content/queue/queue.js: kolejka pozycji {id, label, fracht, odpis, status: czeka|praca|ok|blad, proby, blad}. Persystencja w chrome.storage.local (przeżywa przeładowanie strony). Dorzucanie do kolejki w trakcie pracy bez psucia indeksów (żadnych indeksów opartych na total).
3. src/page/modules/add.js: dla pozycji wykonaj kroki z modal.js: otwórz okno, wklej FRACHT, rozpoznaj, poczekaj na wypełnienie pól trasy (waitFor na wartościach pól, nie na kolorach), zaznacz „odpisuj automatycznie" sprawdzając stan, wpisz ODPIS i zweryfikuj wartość, validate(), publish(), potwierdź sukces, clear(). Podmień placeholdery {zaladunek}/{rozladunek}/{data} z odczytanych pól; nieznane placeholdery = ostrzeżenie i błąd pozycji przed publikacją.
4. Obsługa błędów: limit czasu na każdy krok, 1 ponowienie całej pozycji po clear(), potem status blad i przejście do następnej bez zostawiania brudnego formularza. Stop natychmiast przerywa bieżące oczekiwanie (AbortController), nie tylko ustawia flagę.
5. Publikacja uznana za udaną tylko po potwierdzeniu (okno zamknięte lub zmieniony stan formularza). Nigdy nie loguj sukcesu bez potwierdzenia.
6. Tempo między pozycjami konfigurowalne (domyślnie 8–20 s), z core/human.js.
Kryterium: wklejka z 3 trasami kończy się 3 publikacjami, każda z zaznaczonym auto-odpisem i właściwą wiadomością; błędna pozycja nie blokuje reszty.
```

### Faza 4: odświeżanie v5

```
Zrealizuj fazę 4. Przepisz baseline-v4/inject-refresh.js do src/page/modules/refresh.js:
- użyj wspólnego core/human.js i core/dom.js,
- nie ustawiaj żadnych stylów ani data-* na elementach Trans; oznaczaj odświeżone wiersze w WeakSet,
- zastąp pusty catch logowaniem błędów do widżetu (z ograniczeniem częstotliwości, żeby nie zalać logu),
- zachowaj logikę przerw, przewijania i końca listy,
- scheduler (src/content/scheduler.js): auto-wznowienie z konfigurowalnym oknem (domyślnie 20–40 min), stan w chrome.storage, odliczanie widoczne w widżecie,
- wzajemne wykluczanie z dodawarką bez spamowania logu co 3 s: jeden wpis „czeka na koniec odświeżania".
Kryterium: parytet funkcjonalny z v4, brak zmian w DOM Trans (sprawdź w Elements), poprawne wznowienie po przeładowaniu strony.
```

### Faza 5: design „Dyspozytorski terminal"

```
Zrealizuj fazę 5. Przebuduj UI widżetu w src/content/ui/ według sekcji 5 docs/PLAN.md.
- Tokeny CSS jako zmienne na :host (kolory, odstępy, promienie 2px, cień twardy 3px 3px 0), tryb jasny domyślnie, ciemny przełącznikiem.
- Fonty wyłącznie systemowe. Zero gradientów, blur, neonów, emoji.
- Zakładki ODŚW / DODAJ / LOG. Zakładka DODAJ: pole wklejki, tabela kolejki (#, TRASA, STATUS, akcje usuń/ponów), licznik OK/BŁĄD/CZEKA, przełącznik i pole szablonu domyślnego odpisu, ostrzeżenia parsera nad kolejką.
- Statusy tekstem [OK] [ERR] [CZEKA] [PRACA] i kwadratowa dioda.
- Minimalizacja do jednej linii ze statusem.
- Dostępność: kontrast min. 4.5:1, focus widoczny, obsługa klawiatury, Esc = stop.
- Zamknięcie widżetu (×) w trakcie pracy pyta o potwierdzenie i zatrzymuje moduły.
Pokaż zrzuty (jasny/ciemny) i sprawdź w DevTools, że widżet nie robi żadnych zapytań sieciowych.
```

### Faza 6: dopięcie

```
Zrealizuj fazę 6: uzupełnij testy (parser, scheduler), README.md (instalacja przez „Załaduj rozpakowane", format kolejki, skróty, rozwiązywanie problemów z selftest), podbij wersję w manifest.json, dodaj CHANGELOG.md, skrypt scripts/pack.sh budujący ZIP z katalogu extension/. Usuń baseline-v4/ dopiero po mojej akceptacji.
```

### Prompt przeglądowy (po każdej fazie)

```
Zrób przegląd zmian z tej fazy pod kątem: (1) połkniętych błędów i pustych catch, (2) brakujących limitów czasu, (3) selektorów poza selectors.js, (4) modyfikacji DOM strony Trans, (5) wycieków listenerów i timerów po zamknięciu widżetu, (6) rozjazdu z docs/PLAN.md. Wypisz znalezione problemy z plikiem i linią, nie poprawiaj bez pytania.
```
