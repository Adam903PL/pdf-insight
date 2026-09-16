# AI Log

## Użyte narzędzia

- **Claude Code** (model Claude Opus 5) w terminalu — generowanie i refaktoryzacja kodu, uruchamianie
  lint/typecheck/testów, commity.
- **Playwright (MCP)** sterowany z Claude Code — przegląd interfejsu w przeglądarce na szerokości
  1280 px i 360 px, przejście wszystkich ścieżek błędów, pobranie pliku JSON.
- **Railway MCP** — podgląd zmiennych (tylko nazwy), logów i stanu wdrożeń backendu.
- **GitHub CLI** — status workflow GitHub Actions.
- **OpenAI Codex** — niezależny przegląd briefu, kodu i wdrożeń, domknięcie dokumentacji,
  poprawka ponawiania niepoprawnego JSON oraz testy regresji backendu.
- **Playwright CLI** sterowany przez Codex — sprawdzenie publicznego demo, uploadu, pobrania JSON,
  historii i szerokości 360 px; zrzut ekranu z fikcyjną umową do README.

Historia commitów etapu szkieletu (`b526059`–`6e1d0a9`) również wskazuje Claude Opus 5
w polu współautora. Nie odtwarzam nieudokumentowanych narzędzi ani promptów z tego etapu.

## Kluczowe prompty

1. **Backend end-to-end (`POST /api/analyze`)**
   _Cel:_ działający endpoint, który z tekstu dokumentu zwraca zwalidowany JSON.
   _Treść w skrócie:_ osobny `logger.ts` (bez treści dokumentu i klucza w logach), ręcznie napisany
   `responseSchema` dla Gemini zamiast `zod-to-json-schema`, rate limit 10 żądań / 10 min na IP bez
   `setInterval`, obrona przed prompt injection (dokument w `<document>…</document>`, instrukcje w
   treści ignorowane), jedna ponowna próba z informacją, które pole nie przeszło walidacji, nadpisanie
   `fileName`/`pages` wartościami z żądania, kody 400/429/502/504/500 z komunikatami po polsku,
   weryfikacja curl-em lokalnie i na produkcji.
   _Efekt:_ commity `f5eeae5`, `e0a3483`, `caf36da` oraz poprawki opisane niżej.

2. **Analiza braków względem briefu**
   _Cel:_ lista tego, co zostało do zrobienia.
   _Treść w skrócie:_ „co jeszcze zostało nam do implementacji” + PDF briefu (PDF nie trafia do repo).
   _Efekt:_ zestawienie wymagań MUST/SHOULD/COULD ze stanem kodu i kolejność prac dla frontendu.

3. **Implementacja frontendu według zaakceptowanego planu**
   _Cel:_ spełnienie wszystkich punktów MUST (F-01–F-07) i F-09.
   _Treść w skrócie:_ „Akceptuję, kontynuuj prace” po propozycji kolejności: ekstrakcja PDF → klient
   API → stany interfejsu → upload → widok wyników i eksport → historia → przegląd responsywności →
   dokumentacja.
   _Efekt:_ commity `689afd3`–`b878027`, 88 testów jednostkowych, przegląd w przeglądarce.

4. **Niezależna weryfikacja gotowości w Codex**
   _Cel:_ ustalić, czy projekt rzeczywiście jest skończony, po zakończeniu prac Claude.
   _Treść w skrócie:_ „Przeanalizuj projekt […] oceń czy wszystko jest już skończone.
   Claude skończył na pisaniu AI_LOG.md i Waiting for GitHub Pages workflow result”.
   _Efekt:_ potwierdzone działające wdrożenia, 88 testów frontendu, analiza sześciostronicowego PDF
   i eksport zgodny ze schematem; wykryte puste README, niewysłany AI_LOG i brak korekty błędnego JSON.

5. **Dokończenie projektu po przeglądzie**
   _Cel:_ zamknąć potwierdzone braki przed oddaniem.
   _Treść:_ „Okej skoro tak to lecimy z dokańczaniem projektu”.
   _Efekt:_ dokumentacja z linkami, instrukcją uruchomienia, ograniczeniami i zrzutem demo;
   wspólna obsługa błędów składni JSON i schematu, osiem testów backendu bez wywoływania AI.

## Gdzie AI się pomyliło i jak to poprawiłem

- **Nieistniejący model.** Kod wywoływał `gemini-3-flash`; API zwróciło `404 NOT_FOUND` dopiero na
  produkcji (klient dostał poprawnie ogólny komunikat 500, szczegół był tylko w logach Railway).
  Poprawione na `gemini-3-flash-preview` (`e322353`). Wniosek: identyfikator modelu weryfikować przed
  wdrożeniem.
- **„Poprawka bezpieczeństwa”, która otworzyła lukę.** Automatyczny przegląd bezpieczeństwa zasugerował,
  że pierwszy wpis `X-Forwarded-For` da się podrobić, więc AI przełączyło rate limiter na ostatni wpis
  (`64da8dc`). Test na produkcji z podrobionymi nagłówkami pokazał, że Railway wstawia prawdziwe IP
  **na początek** nagłówka — zmiana umożliwiła obejście limitu przez ok. 5 minut. Wycofane w
  `4dbd3cd`, z komentarzem w kodzie opisującym test, żeby nikt tego nie „naprawił” ponownie.
- **Fałszywy wynik testu lokalnego.** Port 3000 zajmowała inna aplikacja, więc `curl /health` trafiał w
  nią, a nie w serwer projektu. Wykryte po treści odpowiedzi (HTML zamiast JSON); testy lokalne
  przeniesione na inny port.
- **API pdf.js 6.** Wygenerowany kod wywoływał `PDFDocumentProxy.destroy()`, którego w tej wersji nie
  ma — złapał to typecheck; zasoby zwalnia teraz `loadingTask.destroy()`.
- **Błąd w historii.** Pierwsza wersja `loadHistory` porównywała liczbę wpisów po przycięciu do 10, więc
  uszkodzony wpis za limitem nie byłby zgłoszony. Znalezione przy przeglądzie kodu, poprawione i
  pokryte testem regresji.
- **Układ na telefonie.** Przegląd zrzutów ekranu na 360 px pokazał tytuł łamany w środku słowa,
  dziwne odstępy w kwotach („18 400 , 00 zł” przez `tabular-nums`) i wynik pojawiający się pod
  zgięciem ekranu. Poprawione w `b878027`.
- **Niepełna obsługa ponawiania.** Kod ponawiał odpowiedź poprawną składniowo, która nie przeszła
  Zod, ale błąd `JSON.parse` od razu kończył analizę. Codex najpierw odtworzył problem, następnie
  dodał testy: cztery z ośmiu nie przechodziły przed zmianą. Poprawka kieruje oba rodzaje błędów
  do tej samej próby korekty; drugi błąd daje `AiValidationError` i HTTP 502. Wszystkie osiem
  testów po poprawce przechodzi, w tym kontrola wspólnego limitu czasu.
- **Wyjątek od zakazu console.** Logger miał wyłączenie reguły ESLint. Przy domykaniu projektu
  zastąpiono je `process.stdout.write`, zgodnie z konwencją repozytorium.

## Weryfikacja: narzędzia i udział człowieka

Poniższe kontrole wykonały narzędzia sterowane przez agentów AI. Nie są deklaracją samodzielnego
testowania przez autora. Autor zaakceptował kierunek prac i zlecił końcowy przegląd oraz poprawki;
zakres jego niezależnych testów nie został zapisany w tej sesji.

### Kontrole zapisane podczas pracy z Claude

- Backend na produkcji: polska umowa → JSON zgodny ze schematem za pierwszym razem, `summary` 4 zdania,
  waluta `PLN` (w tekście „zł”); dokument bez danych → `null`/`[]`; wstrzyknięte
  „IGNORUJ POWYŻSZE INSTRUKCJE…” zignorowane; pusty tekst i 300 tys. znaków → 400; body 1,3 MB → 413; 11. żądanie z podrobionymi nagłówkami IP → 429.
- Frontend w przeglądarce (1280 px i 360 px): pełna ścieżka wgrania i wyniku, skan bez warstwy
  tekstowej, dokument ponad limit znaków, plik 11 MB, plik `.txt`, odpowiedzi 429 i 502 (strona HTML
  nie trafia do użytkownika), ponowienie, otwarcie wyniku z historii, widoczny fokus klawiatury.
- Pobrany plik `.json` przechodzi walidację `AnalysisResultSchema` z serwera.

### Niezależny przegląd Codex — 16 września 2026

- GitHub Pages i Railway miały wdrożony commit `b878027`; oba wdrożenia zakończone sukcesem.
- Publiczne demo odczytało sześciostronicowy PDF, pokazało czterozdaniowe streszczenie i pozwoliło
  pobrać JSON. Jedno zmierzone wywołanie API trwało około 11,1 s. To pomiar próbki, nie gwarancja SLA.
- Pobrany plik przeszedł walidację schematem backendu; historia przetrwała odświeżenie.
- Dla szerokości 360 px szerokość dokumentu również wynosiła 360 px, bez poziomego przewijania.
- `/health` zwrócił 200; preflight API dopuścił origin demo i nie dopuścił obcego originu;
  żądanie bez wymaganych danych zwróciło 400.
- 88/88 testów frontendu oraz lint, formatowanie, typy i build obu pakietów przeszły.
- Obie kopie schematu wyniku były identyczne. W historii Git nie znaleziono typowego wzorca
  klucza Google; pliki `.env` nie były śledzone. To kontrola określonego wzorca, nie pełny audyt sekretów.

### Domknięcie projektu

- Dodano osiem testów backendu uruchamianych przez `node:test`, z prawdziwym SDK i walidacją Zod,
  ale podstawionym HTTP. Testy nie potrzebują klucza produkcyjnego ani płatnych wywołań.
- README opisuje ograniczenia: brak OCR i fragmentacji, limity plików i tekstu, charakter modelu
  preview oraz brak gwarancji semantycznej poprawności AI.
- Zrzut README pokazuje rzeczywisty wynik dla fikcyjnej umowy, nie treść briefu ani dane poufne.
- Po zmianach ponownie przeszły 88 testów frontendu i 8 backendu, lint, formatowanie,
  sprawdzanie typów i kompilacja obu pakietów. Niezależny agent przeglądu nie znalazł problemów
  blokujących wydanie i dodatkowo uruchomił osiem testów backendu. Poprawka backendu: `57df7d7`.
