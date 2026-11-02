# skrypt-trans

Rozszerzenie Chrome do platform.trans.eu: dodawanie frachtów z kolejki i odświeżanie ofert.

Stan: trwa przebudowa z wersji 4.0 na 5.0.

| Ścieżka | Zawartość |
|---|---|
| `baseline-v4/` | Kod wersji 4.0 bez zmian (punkt wyjścia) |
| `docs/PLAN.md` | Decyzje, analiza błędów v4, architektura, fazy |
| `docs/FORMAT-KOLEJKI.md` | Format wklejki: wiele tras, prompt + auto-odpis, szkic parsera |
| `docs/PROMPTS.md` | Prompty do generowania wklejki i prompty implementacyjne per faza |
| `docs/RECON.md` | Jak zrzucić DOM nowego okna „Dodaj fracht" (faza 0) |

Następny krok: faza 0 (rozpoznanie okna), bo selektory nowego okna i pola auto-odpisu muszą oprzeć się na faktach.
