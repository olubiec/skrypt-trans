# Okno „Dodaj fracht" (stan z 02.11.2026)

Zrzut: `docs/img/okno-dodaj-fracht.png`. Okno ma dwie części.

## Lewa część: formularz frachtu

- Nagłówek: „Wybierz szablon", „Wyczyść formularz".
- **Szybkie wypełnianie**: fioletowa strefa „Dodaj plik z danymi frachtu lub przeciągnij go tutaj. Możesz też wkleić tekst...". Na zrzucie nie ma przycisku „Rozpoznaj dane".
- Załadunek i Rozładunek: dzień (data + przedział), godzina, „Kraj, kod pocztowy, miasto" (autouzupełnianie, placeholder „Wybierz lokalizację"), „Dodaj kolejną lokalizację".
- Trasa: „Ustaw dystans", „Roundtrip".
- Wymagania pojazdu: wielkość (z naczepą, solo, bus, z przyczepą), typ nadwozia (lista), ładowność, metry ładowne, FTL/LTL/multifracht, typ ładunku, ilość, „Dodatkowy opis" (0/2000), „Pokaż inne wymagania".

## Prawa część: „Znajdź przewoźników"

- Karta „Giełda Trans.eu" (checkbox, kurs, waluta, termin płatności) i karta „Oferty bezpośrednie" (checkbox).
- Pole wiadomości: placeholder „Wiadomość zwrotna dla pytających o ofertę na komunikatorze..." z licznikiem **0 / 600**.
- Checkbox **„Odpisuj automatycznie"** pod polem wiadomości.
- Osoba odpowiedzialna, przycisk „Opublikuj fracht" z rozwijaną strzałką obok.

## Co to zmienia względem kodu v4

| Kod v4 zakłada | Stan w oknie | Skutek |
|---|---|---|
| Pole szybkiego wypełniania to `textarea` z placeholderem zawierającym „Wklej tekst" | Placeholder jest inny, a element może nie być `textarea` | `findQuickFillInput()` nie trafi, a awaryjne „pierwszy widoczny textarea" wskaże „Dodatkowy opis" lub pole wiadomości |
| Przycisk „Rozpoznaj dane" | Nie widać go na zrzucie | Rozpoznawanie prawdopodobnie startuje po wklejeniu. Do potwierdzenia w fazie 0 |
| Pola tras mają placeholdery „załadunku"/„rozładunku" | Placeholder to „Wybierz lokalizację" | Zapasowe wykrycie końca AI w `waitForAiFill` nigdy nie zadziała. Trzeba czekać na wartości pól (miejsce, data, godzina) |
| Checkbox „Dodaj kolejny fracht" w oknie | Nie widać go | Możliwe, że jest w menu strzałki przy „Opublikuj fracht" |
| `isModalOpen()` = jest jakiś widoczny `textarea` | Textarea istnieją też poza oknem | Fałszywe wykrycie. Okno rozpoznawać po nagłówku „Dodaj fracht" i polach |

## Auto-odpis: wnioski

- Limit wiadomości to **600 znaków**. Parser i generator muszą to pilnować.
- Pole wiadomości jest osobne od „Dodatkowy opis" (2000 znaków). Nie mylić.
- Do sprawdzenia w fazie 0: czy wiadomość jest zapisywana tylko przy zaznaczonym „Odpisuj automatycznie", i czy po zaznaczeniu pojawia się dodatkowe pole.
- Wartość wstawiamy tak jak w v4 (setter z prototypu + `input`/`change`), bo to pole Reacta. Po wpisaniu sprawdzamy licznik `n / 600` jako potwierdzenie.
