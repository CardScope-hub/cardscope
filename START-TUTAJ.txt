# CardScope Web — komplet strony i aplikacji

Wersja źródeł: ab93493dba377d6bc72117f76fb37bdd07ea48f5
Data eksportu: 27 października 2026.
Aplikacja: https://cardscope.prettytang.chatgpt.site

Paczka zawiera komplet plików źródłowych aktualnej wersji projektu oraz wygenerowane zasoby OCR. Zawiera nowy układ przeglądarkowy, widoczne przyciski instalacji, stronę logowania i całą dotychczasową funkcjonalność CardScope. Kod aplikacji jest taki sam jak w opublikowanej wersji; niniejsza instrukcja i manifest opisują eksport.

## Nowa wersja przeglądarkowa

Otwórz https://cardscope.prettytang.chatgpt.site — to działająca strona z tym samym kontem, kolekcją, binderami i wycenami. Widoczność strony pozostaje taka jak wcześniej: prywatna, dla właściciela.

- Wygodniejsza nawigacja na komputerze, ten sam fioletowy styl na telefonie.
- Przycisk dodania do ekranu głównego i instrukcje dla trzech platform.
- Podsumowanie zapisanych cen kart w wybranej walucie, z uwzględnieniem liczby sztuk.
- Skróty systemowe do kolekcji i binderów, jeżeli system je obsługuje.
- Te same moduły skanera, katalogów i synchronizacji. Zaloguj się na to samo konto i poczekaj na zakończony zapis, aby odtworzyć dane na innym urządzeniu.

Główne pliki do edycji:

- `public/app.html` — treść i układ strony.
- `public/web.css` — nowy wygląd przeglądarkowy i sekcja instalacji.
- `public/web.js` — nawigacja, skróty i kopiowanie linku.
- `public/pwa.js` — instalacja i instrukcje zależne od urządzenia.
- `public/manifest.json` i `public/sw.js` — ikony, skróty i powłoka offline.
- `app/login/page.tsx` i `app/login/login.css` — strona konta/logowania.
- `docs/WEB-AND-PWA.md` — szczegóły wspólnego zapisu i działania strony.

Ten pakiet nie przełącza aplikacji na Supabase. Zachowuje obecny backend Sites/D1/R2 i logowanie ChatGPT. Wcześniejszy ZIP z połączeniem Supabase jest oddzielnym pakietem; pełna migracja nadal wymaga integracji z aplikacją.

## Co jest w środku

- `public/` — właściwy interfejs CardScope, style, skaner, kolekcja, bindery, instalacja PWA, waluty i service worker.
- `server/` — API katalogów, wycen, kolekcji i binderów oraz zachowane funkcje tłumaczenia.
- `data/` — wbudowane katalogi i teksty kart, wraz z dokumentacją pochodzenia.
- `scanner/` — kod pracownika OCR i licencje.
- `public/ocr-runtime/` — gotowy pakiet OCR, modele ONNX i WebAssembly. Dołączony również mimo tego, że normalnie powstaje podczas budowania.
- `db/` i `drizzle/` — schemat bazy i migracje SQL.
- `app/`, `build/`, `lib/`, `components/`, `hooks/` — szkielet aplikacji oraz integracja Vinext / Cloudflare / Sites.
- `scripts/` — budowanie, importy i narzędzia projektu.
- `tests/` — testy aplikacji.
- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml` — zależności i ich przypięte wersje.
- `docs/LEARNING-RESTORE.md` — informacje o zachowanej sekcji „Jak grać”.

## Uruchomienie deweloperskie

To projekt serwerowy, a nie pojedyncza strona uruchamiana przez dwukrotne kliknięcie HTML.

Wymagania wynikające z konfiguracji projektu: Node.js co najmniej 22.13.0 oraz pnpm 11.25.0. Pierwsza instalacja zależności wymaga internetu.

W terminalu, wewnątrz wypakowanego folderu `CardScope-Web` (tam, gdzie jest `package.json`). Jeśli nie masz pnpm, zainstaluj przypiętą wersję poleceniem `npm install --global pnpm@11.25.0`:

```sh
pnpm install --frozen-lockfile
node scripts/build-ocr.mjs
pnpm dev
```

Otwórz adres podany przez serwer, domyślnie `http://localhost:5173/app.html`. W trybie lokalnym projekt ma przygotowany testowy mechanizm logowania dla localhost. Nie łączy on z Twoją produkcyjną kolekcją. Lokalny zapis w IndexedDB jest osobny od zapisu na koncie.

Pełna synchronizacja wymaga bazy D1 i magazynu R2 oraz zastosowania migracji SQL z `drizzle/` w używanym środowisku. Konfigurację lokalnych powiązań `DB` i `BUCKET` znajdziesz w `vite.config.ts`. Jeżeli lokalna baza jest pusta i zgłasza brak tabel, zastosuj obie migracje do tej lokalnej bazy przed testowaniem synchronizacji.

Budowanie:

```sh
pnpm build
```

Nie należy wgrywać samego folderu `public/` na hosting statyczny i oczekiwać działania wszystkich funkcji. API, synchronizacja, sesje i część katalogów wymagają backendu.

## Hosting i dane

Aktualne wdrożenie korzysta z Sites, Cloudflare Workers, D1 i R2. Dane kolekcji są przypisane do tożsamości dostarczanej przez Sites. Przy przenoszeniu na własny hosting trzeba skonfigurować bazę, magazyn zdjęć i uwierzytelnianie. Sam plik ZIP nie przenosi konta ani danych z działającej aplikacji.

Zachowano oryginalną konfigurację projektu w `.openai/hosting.json`; zawarty identyfikator projektu nie jest kluczem dostępu i nie nadaje uprawnień do hostingu.

W archiwum nie ma `node_modules`, historii Git, lokalnych plików sesji, haseł ani danych użytkowników z produkcyjnej bazy. Zależności odtwarza się z lockfile. Dane własnej kolekcji można wyeksportować osobno z aplikacji.

## Aktualne zachowanie

- Gry: Pokémon, Magic: The Gathering, One Piece, Riftbound oraz Weiß Schwarz EN i JP.
- Rozpoznawanie lokalne i opcjonalny odczyt ciągły; użytkownik potwierdza właściwą kartę.
- Bindery z układem stron, okładkami, animacją i historią wyceny.
- Udostępnianie bindera eksportuje plik HTML będący kopią stanu w danym momencie.
- Ceny preferują Cardmarket, gdy dostępna jest zgodna wycena; nie każda karta ma automatyczną cenę.
- Przyciski „Dodaj aplikację” otwierają dostępne okno instalacji lub ilustrowaną instrukcję dla iPhone, Androida i komputera. Instalacja jest opcjonalna.
- „Jak grać” jest ukryte, a kod i zapisane mechanizmy pozostają w projekcie. Obecny backend tłumaczeń nie korzysta z AI.
- Opcjonalny kod skanowania przez AI pozostaje w projekcie, ale wymaga osobnego klucza po stronie serwera. Lokalny skaner go nie potrzebuje.

Część starszych opisów w oryginalnym `README.md` dokumentuje wcześniejsze etapy rozwoju; powyższy opis dotyczy aktualnego eksportu.

## Sprawdzenie kodu

Przykładowe testy niezależne od prywatnych zdjęć testowych:

```sh
node --test tests/web-pwa.test.cjs tests/experience.test.cjs tests/binder-ui.test.mjs tests/currency.test.mjs
node tests/ui-flow.cjs
```

Niektóre testy fotograficzne wymagają własnych zdjęć wejściowych; zdjęcia użytkownika nie są częścią eksportu. Ta wersja przeszła budowanie, 22 testy funkcjonalne i test przepływu skan → karta → kolekcja/binder. Podgląd wizualny przeglądarki był niedostępny w środowisku wykonania. Ten eksport nie był ponownie uruchamiany od zera na innym komputerze ani testowany na fizycznym iPhonie.

## Prawa do zasobów

Zachowaj informacje o źródłach i licencje z `data/`, `scanner/licenses/`, `public/ocr-runtime/licenses/` i `vendor/`. Ilustracje kart i zewnętrzne katalogi mają własnych właścicieli; eksport kodu nie zmienia ich licencji.
