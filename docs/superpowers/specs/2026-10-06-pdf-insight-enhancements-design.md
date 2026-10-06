# PDF Insight: interfejs, narzędzia i charakter

## Cel

Rozwinąć istniejący PDF Insight w trzech zaznaczonych przez użytkownika kierunkach: dopracowany
interfejs, większa użyteczność wyników i historii oraz przyjazny, lekko żartobliwy charakter.
Zmiany dotyczą frontendu i korzystają z już zapisanych wyników.

## Kierunki

Rozważono trzy warianty: wdrożenie wszystkiego jako jednej dużej zmiany, etapowe wdrożenie pełnego
zakresu oraz ograniczenie się do lekkiego odświeżenia. Wybrany został wariant etapowy: obejmuje
wszystkie trzy kierunki, ale dzieli pracę na niezależne, możliwe do sprawdzenia części. Ogranicza to
ryzyko nakładania się nowych zachowań w głównym widoku.

## Zakres funkcjonalny

### 1. Dopracowany interfejs i animacje

- Zachować obecny styl „papier i pieczęć”: istniejącą paletę, typografię i fioletowy akcent.
- Dodać krótką animację stanu przeciągania pliku oraz delikatne wejście wyniku.
- Uatrakcyjnić dwa rzeczywiste etapy przetwarzania: odczyt tekstu w przeglądarce i analizę AI.
  Dekoracyjna animacja nie może udawać procentowego postępu ani zmieniać komunikatów o stanie.
- Animacje muszą respektować `prefers-reduced-motion`; bez ruchu interfejs nadal jasno komunikuje
  stan i kolejność kroków.
- Dodać prostą nawigację do sekcji długiego wyniku. Na szerokim ekranie może być przyklejona
  podczas przewijania; na telefonie pozostaje zwykłą, zwijaną listą linków.

### 2. Narzędzia do historii i wyniku

- W historii dodać wyszukiwanie bez rozróżniania wielkości liter i polskich znaków. Przeszukiwać
  tytuł, nazwę pliku i etykietę typu dokumentu.
- Dodać filtry złożone warunkiem AND: zakres daty zapisania analizy oraz przełącznik „zawiera kwoty”.
  Filtrowanie odbywa się wyłącznie po danych z `localStorage`; brak pasujących analiz pokazuje
  osobny stan pusty z możliwością wyczyszczenia filtrów.
- Pozwolić zaznaczyć najwyżej dwie zapisane analizy i otworzyć widok porównania obok siebie.
  Porównanie pokazuje tytuł, typ i sekcje wyniku (streszczenie, punkty, osoby i organizacje,
  kwoty oraz daty). Nie wylicza semantycznych różnic ani nie wywołuje AI.
- Dodać kopiowanie treści streszczenia i kluczowych sekcji w czytelnym tekście, obok istniejącego
  kopiowania JSON.
- Dodać eksport wyniku do pliku Markdown. Zachować dotychczasowy eksport JSON bez zmian.

### 3. Przyjazny charakter

- Użyć krótkich, naturalnych polskich komunikatów w stanie oczekiwania, podczas odczytu i po udanej
  analizie. Komunikaty nie mogą sugerować, że AI gwarantuje poprawność danych.
- Po sukcesie pokazać dyskretny efekt świętowania z wariantem statycznym dla osób ograniczających
  ruch.
- Zachować działanie istniejącego easter egga Rickroll; nie włączać go ponownie ani nie zmieniać
  jego warunków uruchomienia.

## Architektura i przepływ danych

Zmiany pozostają w `web/`. Źródłem historii nadal jest `HistoryState` ładowany z `localStorage`.
Tekst zapytania, filtry i zaznaczone identyfikatory porównania są stanem interfejsu — nie są
zapisywane. Widoczna lista historii jest wyliczana z wpisów pochodzących z `loadHistory()`.
Porównanie odwołuje się do dwóch istniejących wpisów, a eksport Markdown i kopiowanie formatują
bieżący `AnalysisResult` w przeglądarce. Żądanie analizy, backend, schemat odpowiedzi i struktura
historycznych wpisów nie zmieniają się.

Główne granice komponentów:

- `HistoryPanel` obsługuje wyszukiwanie, filtry, wybór do porównania i stan braku wyników.
- Nowy widok porównania przyjmuje dwa wpisy historii i prezentuje ich sekcje obok siebie.
- `ResultView` dostarcza nawigację sekcji, akcje kopiowania oraz eksport Markdown.
- `LoadingState` i `FileDropzone` otrzymują wyłącznie dekoracyjne animacje i dopracowany tekst.
- Małe funkcje formatowania w `web/src/lib/` odpowiadają za tekst do schowka i plik Markdown;
  nie zmieniają wspólnego schematu danych.

## Błędy i dostępność

- Odmowa dostępu do schowka pokazuje komunikat inline z instrukcją ręcznego skopiowania treści.
- Nieudany eksport pokazuje krótki komunikat błędu i pozostawia dostępny eksport JSON.
- Wyczyść historię resetuje także zaznaczenie porównania i widoczne filtry.
- Zmiana wyszukiwania nie przenosi fokusu; akcje i linki mają etykiety dostępne dla czytników
  ekranu oraz widoczny fokus klawiatury.
- Porównanie jest używalne na wąskim ekranie: kolumny układają się pionowo, bez przewijania
  strony w poziomie.
- Zachować obecne ograniczenia prywatności: żaden nowy widok nie wysyła treści ani historii
  dokumentów do backendu.

## Etapy

1. Dopracowanie ruchu, stanu przeciągania, nawigacji wyniku i polskiego mikrocopy.
2. Wyszukiwanie i filtrowanie historii, kopiowanie sekcji oraz eksport Markdown.
3. Porównanie dwóch analiz i dopasowanie układu mobilnego.

Każdy etap zachowuje istniejącą obsługę uploadu, analizę, eksport JSON, historię i easter egg.

## Kryteria odbioru

- Nowe animacje nie zasłaniają treści, nie sugerują fałszywego postępu i respektują ograniczenie
  ruchu.
- Wyszukiwanie działa dla polskich znaków i pól wskazanych w specyfikacji; filtry daty i kwot
  łączą się zgodnie z AND.
- Użytkownik może porównać dwie, ale nie trzy analizy; widok działa również na telefonie.
- Skopiowane sekcje i pobrany Markdown są czytelną reprezentacją istniejącego wyniku; JSON
  pozostaje dostępny.
- Historia pozostaje lokalna, a nowy przepływ nie dodaje wywołań API ani zmian backendu.

## Sprawdzenie odbiorcze

Po wdrożeniu przejść ręcznie: pełną analizę od uploadu do wyniku; wyszukiwanie i kombinacje
filtrów na kilku wpisach historii; porównanie dwóch wpisów i wyczyszczenie historii; kopiowanie
sekcji przy dozwolonym i zablokowanym schowku; oba formaty pobierania; układ mobilny; ustawienie
systemowe ograniczenia ruchu. Sprawdzić też, że istniejący easter egg zachowuje dotychczasowy
warunek aktywacji.
