# Start nowej sesji Claude Code

## Jak uruchomić

```
git clone https://github.com/olubiec/skrypt-trans
cd skrypt-trans
claude
```

`CLAUDE.md` w korzeniu wczyta się sam. Jeśli chcesz, żeby sesja testowała na żywo na Trans.eu, włącz w Claude Code rozszerzenie Chrome (Claude in Chrome) i bądź zalogowany na platform.trans.eu.

## Prompt 1: przejęcie kontekstu i faza 1

Wklej na początku sesji:

```
Przeczytaj CLAUDE.md i dokumenty, które wskazuje (PLAN, ZBADANIE-ELEMENTOW, OKNO-TRANS, FORMAT-KOLEJKI, PROMPTS). Potem w 5 zdaniach powiedz, jak rozumiesz zadanie, i wypisz wątpliwości. Niczego jeszcze nie koduj.

Gdy potwierdzę, zrealizuj fazę 1 z docs/PROMPTS.md (sekcja B) na gałęzi feature/v5-faza-1. Zasady z CLAUDE.md obowiązują. Po zakończeniu pokaż listę zmian i co mam sprawdzić ręcznie w przeglądarce.
```

## Prompt 2: faza 2 (selektory i selftest, z testem na żywo)

```
Faza 2 z docs/PROMPTS.md. Selektory weź z tabeli w CLAUDE.md i z docs/ZBADANIE-ELEMENTOW.md. Po napisaniu selftestu uruchom go na żywo w Chrome: otwórz nową kartę na platform.trans.eu, otwórz okno „Dodaj fracht" (tylko otwarcie), uruchom selftest i pokaż wynik. Niczego nie publikuj ani nie zapisuj. Na końcu wyczyść formularz i zamknij okno.

Dodatkowo sprawdź otwarte kwestie z CLAUDE.md (Enter w szybkim wypełnianiu, reset pola odpisu po „Dodaj kolejny fracht") i zaktualizuj dokumentację.
```

## Prompt 3: faza 3 (dodawarka z auto-odpisem)

```
Faza 3 z docs/PROMPTS.md. Parser według docs/FORMAT-KOLEJKI.md z testami (node --test). Dodawarka krok po kroku z walidacją, auto-odpisem i limitem 600 znaków. Test na żywo: zaimplementuj tryb „na sucho" (dry run), który wykonuje wszystko poza kliknięciem „Opublikuj fracht" i kończy czyszczeniem formularza. Uruchom dry run na 2 trasach z różnymi odpisami i pokaż log oraz zrzuty ekranu przed czyszczeniem (checkbox zaznaczony, treść odpisu, licznik n / 600).

Prawdziwą publikację testową zaproponuj dopiero po dry runie i poczekaj na moją zgodę z opisem, co zostanie opublikowane.
```

## Prompty 4-6

Z `docs/PROMPTS.md` sekcja B: faza 4 (refresh), faza 5 (design), faza 6 (dopięcie). Przed fazą 5 poproś o 2-3 propozycje wyglądu (zrzuty) i wybierz razem z właścicielem.

## Prompt kontrolny po każdej fazie

```
Zrób przegląd zmian z tej fazy według promptu przeglądowego z docs/PROMPTS.md. Wypisz problemy z plikiem i linią, nie poprawiaj bez pytania. Zaktualizuj tabelę „Stan prac" w CLAUDE.md.
```
