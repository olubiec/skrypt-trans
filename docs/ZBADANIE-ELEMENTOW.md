# Zbadanie elementów okna „Dodaj fracht" (test na żywo, 02.11.2026)

Testy w przeglądarce użytkownika przez rozszerzenie Chrome. Niczego nie zapisano ani nie opublikowano. Dane testowe zostały wyczyszczone („Wyczyść formularz" → „Zamknij formularz").

## Wyniki elementów

| Element | Atrybuty (DOM) | Zachowanie | Wniosek dla v5 |
|---|---|---|---|
| Szybkie wypełnianie | `textarea[name="aiPrompt"]`, placeholder „Dodaj plik z danymi frachtu…" | Przyjmuje tekst, licznik `n / 2000`, po wpisaniu pojawia się przycisk „Rozpoznaj dane ↵" | Selektor po `name="aiPrompt"`. Placeholder „Wklej tekst" z v4 nie istnieje |
| Rozpoznaj dane | przycisk, widoczny dopiero po wpisaniu tekstu | Po kliknięciu AI wypełnia pola w ~6 s | Najpierw wpisać tekst, potem czekać na pola, nie tylko na przycisk |
| Data i godzina załadunku/rozładunku | `input` z wartością `dd.mm.rrrr` i `HH:MM` | AI ustawiło 05.11.2026 08:00 | Walidacja po wartościach pól |
| Kraj, kod, miasto | pola „Wybierz lokalizację" (wybór z listy) | Po rozpoznaniu zamieniają się w chipy: „PL 71-001 Szczecin", „DE 10115 Berlin" | Placeholder nie służy już do wykrycia wypełnienia. Sprawdzać chip |
| Trasa | tekst „143 km" | AI policzyło dystans | Można walidować |
| Typ nadwozia | `input` z placeholderem „Wybierz z listy" (`requiredTruckBodies`) | AI ustawiło „firanka" dla „plandeka" | AI sam mapuje. Skrypt nie powinien nadpisywać |
| Ładowność / ilość | `capacity` (t), `Ilość` | AI ustawiło 24 t i 2 | Do walidacji |
| Typ ładunku | lista „Wybierz z listy" | AI ustawiło „paleta niestandardowa" | Do walidacji |
| Typ (FTL/LTL/multifracht) | `radio name="freightType"` | AI ustawiło FTL | Stan radio |
| Checkboxy pojazdu | `vehicleSizeId` (4 szt.) | AI zaznaczyło „z naczepą" i „z przyczepą" | Są zaznaczane przez AI. Nie kliknąć na ślepo |
| Dodatkowy opis | `textarea[name="shippingRemarks"]`, licznik `0 / 2000` | Osobne od szybkiego wypełniania | Nie mylić z polem auto-odpisu |
| **Pole auto-odpisu** | `textarea[name="defaultReplyMessage"]`, placeholder „Wiadomość zwrotna dla pytających…" | Przyjmuje tekst, licznik `n / 600` liczy na żywo | Limit 600 znaków potwierdzony |
| **Checkbox „Odpisuj automatycznie"** | `input[type=checkbox]` (bez `name`) obok etykiety „Odpisuj automatycznie" | Kliknięcie zaznacza; stan `checked` = true | Selektor: checkbox w tym samym kontenerze co etykieta tekstowa, bo brak `name`/`id` |
| Osoba odpowiedzialna | przycisk „— Mateusz Ołubiec" | Nie testowane | — |
| Opublikuj fracht | `button` | **NIE KLIKANE** | Zachować ostrożność |
| Strzałka obok „Opublikuj" | przycisk bez tekstu | Menu: **Wyślij zlecenie**, **Dodaj kolejny fracht**, Zapisz jako szablon, Zapisz kopię roboczą | „Dodaj kolejny fracht" to `span` z ukrytym `input[type=checkbox]`, nie `label`. v4 szuka `label` i może nie trafić. **„Wyślij zlecenie" jest niebezpieczne** |
| Wyczyść formularz | link | Otwiera potwierdzenie „Czy na pewno chcesz zamknąć formularz?" z przyciskami „Nie" i „Zamknij formularz" | Potwierdzenie to dialog. Do obsłużenia w v5 |
| Zamknij (×) | przycisk | Nie testowane osobno | — |

## Selektory v4 w nowym oknie

| Funkcja v4 | Wynik |
|---|---|
| `findQuickFillInput` (textarea z „Wklej tekst") | **nie działa** (brak takiego placeholdera). Fallback „pierwszy widoczny textarea" trafia w `aiPrompt`, bo jest pierwszy w DOM |
| `findButton('Dodaj fracht')` | działa |
| `findButton('Opublikuj fracht')` | działa |
| `findButton('Rozpoznaj dane')` | działa, ale tylko po wpisaniu tekstu |
| `findButton('Wyczyść formularz')` | link, nie `button`. Fallback w v4 to `a, button, span`, więc znajdzie |
| `ensureAddNextChecked` (label „Dodaj kolejny fracht") | **nie działa** w obecnej formie: element jest `span` w menu, a nie `label` |
| `waitForAiFill` (fioletowy blask) | **nie do użycia**. Trzeba czekać na pola (chip lokalizacji, wartość daty) |
| `correctBodyType` / Jumbo / WF | usunięte zgodnie z decyzją. AI samo ustawia typ nadwozia |

## Ryzyka do obsługi w v5

1. Przycisk „Wyślij zlecenie" w menu strzałki. Skrypt nigdy nie powinien go kliknąć.
2. Dialog „Zamknij formularz" przy czyszczeniu: skrypt musi go obsłużyć, inaczej zawiesi się w pętli.
3. Dane osobowe i z firmy (osoba odpowiedzialna, adresy) są widoczne w DOM. Nie logować ich do widżetu.
