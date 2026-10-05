# ornament-cloud

Einfache statische Website (reines HTML/CSS), die eine Auswahl meiner Claude-Artefakte präsentiert.
Alles liegt auf dem eigenen Server – es werden keine Dateien von claude.ai, CDNs oder Google geladen.

- `index.html` – Startseite (Neuordnung vom 2. Oktober 2026, Wunsch von Christian; seit 3. Oktober ohne sichtbaren Titel, seit 5. Oktober auch ohne den Satz
  «Beobachtung ist Anlass für Veränderungen in der Realität.», der nur noch in Beschreibung und Vorschaukarte zum Teilen steht, `tests/teilen.test.mjs` hält beides zusammen):
  unter der Welle seit dem 4. Oktober 2026 **OMNA COLOR zum direkten Spielen**:
  ein `<iframe>` auf `alpha/omna-color/` (freigegebene Ausnahme von REGELN §14, ein Test prüft genau diese Einbettung), kein Beitrag und keine Karte; der Beitrag zu OMNA COLOR bleibt auf «Web».
  Eingebettet erkennt sich `alpha/omna-color/index.html` an `window.self !== window.top` (Klasse `eingebettet` am `<html>`): ohne Hauptlinks, Rand und eigenen Bildlauf, Grund durchsichtig;
  die Startseite setzt die Höhe des Rahmens auf die Höhe des Spiels (kleines Skript unten in `index.html`, ResizeObserver), so wächst er mit, wenn eine Übung erscheint. GoatCounter zählt Rahmen nicht.
  Sonst steht nichts auf der Seite: die Rückmeldungen (giscus, `kommentare.js`) sind auf Wunsch von Christian vom 2. Oktober 2026 entfernt.
  Das Stellenfeld (`werke/stellenfeld/`, früher hier eingebettet) ist seit dem 4. Oktober 2026 ein Beitrag auf «Web» (Vorschau `assets/vorschau-stellenfeld.jpg` aus `tools/start-og.mjs`).
  Es behält seinen Einbettungsmodus (`window.self !== window.top`: senkrechtes Wischen und das Mausrad blättern, Zoom nur mit Strg/Cmd), auch wenn es zurzeit nirgends eingebettet ist.
- Menü (`<nav class="menu">`, Neuordnung vom 2. Oktober 2026): vier Wörter ohne Symbole und Animationen, in der serifenlosen Schrift der Seite (`--font`, Gewicht 500; Wunsch vom 2. Oktober 2026: moderner als die frühere Serife), immer in dieser Reihenfolge: **Zettelkasten** (führt direkt zu `zu-seiner-zeit/`), **Apps** (`apps/`),
  **Masterprompts** (`masterprompts/`), **Web** (`web/`). Es steht in den Kopfzeilen von Startseite, News, Termine, Portfolio, den drei neuen Seiten und von ORNA (Rad, Feld und die App-Abschriften, dort ausgeblendet);
  Zettelkasten, Alpha-Seiten, ORMA und Werke haben es nicht. Aktiv ist, wo man ist (`aria-current="page"`; auf ORNA, das unter Apps hängt: `true`), der Eintrag ist dann unterstrichen.
  Das Markup steht von Hand in den Seiten (`tests/struktur.test.mjs` prüft Reihenfolge, Ziele und aktiven Eintrag auf allen elf Seiten). News, Termine und Portfolio bleiben unter ihren Adressen, tragen das Menü und sind sonst nicht verlinkt (Entscheid von Christian, 2. Oktober 2026)
- `apps/` – Seite «Apps»: die Beiträge ORNA und ORMA (ORMA als Alpha gekennzeichnet; Vorschau ist das drehende Rad aus `icons.js`), in dieser Reihenfolge
- `masterprompts/` – Seite «Masterprompts»: die vier Prüfraster als Beiträge, in der Reihenfolge der Alpha-Übersicht: «Nebeneinander und Nacheinander», «Der Verteilapparat des Körpers»,
  «Prüfraster für Gesellschaftskonzepte», «Prüfraster journalistischer Texte» (alle als Alpha gekennzeichnet, die letzten beiden «In Arbeit»); zwei mal zwei (`.grid--paare`), die Vorschauen sind gezeichnete Vierfelder, Dreieck und Zeilen (SVG in der Seite)
- `web/` – Seite «Web»: die Beiträge OMNA COLOR und Das Dritte Rad (Alpha, Prototyp) und seit dem 4. Oktober 2026 das Stellenfeld (kein Alpha). Die Vorschau ist je ein Bild (640 × 800, dunkel): `assets/vorschau-omna-color.jpg`, `assets/vorschau-drittes-rad.jpg` und `assets/vorschau-stellenfeld.jpg`, erzeugt mit `tools/start-og.mjs vorschau`
- `styles.css` – Gestaltung (inkl. automatischem Dark Mode und Farben des Hintergrunds)
- Navigation oben links (`<nav class="seitenweg">`, REGELN §14, Wunsch vom 2. Oktober 2026): auf jeder Seite «Ornament Cloud» (Startseite) und darunter «Das Dritte Rad» (Start des Rads),
  an die Stelle der früheren Zeile «Ornament Cloud · Alpha». Das Markup steht in den Seiten von Hand und in den Erzeugern `tools/build-zu-seiner-zeit.ts` und `tools/build-alpha-texte.ts`;
  die Gestaltung folgt der Seitenfamilie (`styles.css` für Website und Alpha-Texte, `zu-seiner-zeit/zsz.css`, bei OMNA COLOR und beim Dritten Rad in der Seite selbst).
  Auf der Website (alle Seiten ausser dem Dritten Rad) stehen beide Links in derselben Farbe, `--hauptlink`: im hellen Modus Anthrazit (`#353b40`), im dunklen ein helles Sonnengelb (`#ffd84d`); Wunsch vom 2. Oktober 2026, 19:00 UTC.
  Das Dritte Rad behält «Ornament Cloud» orange und «Das Dritte Rad» violett (`--weg-start`, `--weg-rad`; die Seite ist immer dunkel). Unter der Kopfzeile steht eine feine Linie in derselben Farbe: auf den Seiten mit Menü die Welle (`.divider`),
  auf Zettelkasten, Alpha-Texten und OMNA COLOR eine gerade Linie von 1 px, so breit wie die Spalte (`.seitenweg::after`); das Dritte Rad hat bewusst keine (Wunsch vom 2. Oktober 2026, 19:00 und 20:08 UTC). Im Zettelkasten bleiben bis zum Titel «Zu seiner Zeit» 28 px (vorher 12 px).
  Auf jeder Seite sind sie gleich gesetzt wie auf der Website (Schrift der Website, 0,8 rem, Gewicht 600, Grossbuchstaben, Laufweite 0,12 em); Wunsch vom 2. Oktober 2026.
  Sie stehen auf jeder Seite an genau derselben Stelle (Wunsch vom 2. Oktober 2026, 18:08 UTC): bündig mit einer Spalte von 1040 px, die in der Mitte steht (bis 1080 px Breite 20 px vom Rand), oben 55 px, bis 760 px Breite 40 px;
  Zettelkasten, Rad und OMNA COLOR setzen dieselben Werte, und `scrollbar-gutter: stable` hält den Platz für den Bildlaufbalken auf jeder Seite frei. `tests/drittes-rad.e2e.mjs` misst die Stelle auf allen Seitenfamilien.
  Beide Links sind Buttons mit ganz feinem Rahmen (1 px, Pillenform, gleich breit, Abstand 8 px; Rahmen blass, 40 % der Schriftfarbe). Der aktive trägt `aria-current` und ist invers gesetzt (Wunsch vom 2. Oktober 2026): Fläche und Rahmen in der Farbe des Buttons (je Link in der Variablen `--weg`),
  die Schrift in der Farbe der Seite (`--bg`, `--papier`, `--night`; Kontrast ab 4,5); in erzwungenen Farben (Windows, hoher Kontrast) bleibt er mit einem feinen Ring kenntlich. Aktiv ist im Rad «Das Dritte Rad» (`aria-current="page"`), auf der Startseite
  «Ornament Cloud» (`page`), auf allen anderen Seiten ebenfalls «Ornament Cloud» (`true`: man ist in der Website). Beim Darüberfahren wird der Rahmen voll, der Tastaturfokus ist ein Ring von 2 px in der Farbe des Buttons.
  Ausgenommen sind ORMA (eigene App), `werke/` (Vollbild) und die Weiterleitung `portfolio/rad-von-zeit-und-raum/`. Neue Seiten brauchen sie ebenfalls; `tests/navigation.test.mjs` meldet fehlende.
  Wird `styles.css` geändert, `?v=` hochzählen (zurzeit 32: in den Seiten, in `tools/build-alpha-texte.ts`, danach `tools/build-app.ts` für die App-Seiten und den Service Worker von ORNA)
- `icons.js` – gezeichnete, animierte Schwarz-Weiss-Symbole: die Welle unter dem Kopf, das Rad der Karten ORNA und ORMA, Prozess, Inklusion und Turm (News, Termine); die Symbole des früheren Menüs (reentry, zeit, stellen) sind entfernt (Dauer in `PERIOD`, Marke `?v=` zurzeit 14)
- `news/` – News als aufklappbare Einträge (nicht im Menü, nicht verlinkt); neuer Eintrag = `<details class="entry">`-Block kopieren und oben einfügen
- `termine/` – Termine als aufklappbare Einträge (nicht im Menü, nicht verlinkt); neuer Termin = `<details class="entry">`-Block kopieren und oben einfügen
- `portfolio/` – Werkübersicht (Karten), nicht im Menü und nicht verlinkt; jedes Werk mit eigener Seite, z. B. `portfolio/nebeneinander-nacheinander/`
- `portfolio/nebeneinander-nacheinander/` – interaktives Doppelrad: `index.html`, `rad.css`, `js/wheel.js` (Rad, Geste, Ablauf),
  `js/lib/spin.js` (Drehphysik), `js/lib/geometry.js`, `js/symbols.js` (40 Zeichen), `js/ticker.js` (Laufband mit allen Namen), `js/lib/random.js`, `js/lib/validation.js`;
  Namen der beiden getroffenen Plätze am Rad nach dem Stillstand, Legende aller 40 Namen mit Schalter «Namen zeigen» (REGELN §6a);
  Diagnose mit `?debug`, direkte Konstellation mit `?pair=<id>` (wird nach jeder Drehung per `history.replaceState` gesetzt; «Link kopieren» teilt sie)
- `portfolio/nebeneinander-nacheinander/feld/` – Feldansicht: alle Konstellationen als Matrix 20 × 20 (ab 760 px) und als Liste pro Künstler:in;
  der Teil zwischen `<!-- FELD:START -->` und `<!-- FELD:END -->` wird von `tools/build-feld.ts` aus den Daten geschrieben (läuft mit dem Sync),
  Einleitung und Kopf von Hand. Lücken bewerten (vorbereitet): `src/doppelspalt/redaktion/gaps.csv` mit
  `kuenstler_id;theoretiker_id;bewertung` (`mittel` | `schwach`), danach Sync
- Werkbericht: **zurzeit nicht veröffentlicht** (Seite, Projektpaper und die Hinweise zur Herkunft der Texte auf der Radseite
  sind entfernt). Die Quelle bleibt: `src/doppelspalt/werkbericht.md`, gesetzt mit `tools/build-werkbericht.ts`.
  Wieder einschalten: Ordner `portfolio/nebeneinander-nacheinander/werkbericht/` samt `projektpaper.pdf` und die beiden
  Absätze `rad-note` der Radseite aus dem Stand vor dem Commit «Werkbericht und Herkunftshinweis vorerst von der Website»
  zurückholen (`git checkout <commit>^ -- …`), Eintrag in `sitemap.xml` ergänzen
- `sitemap.xml` – alle Seiten (ohne die Weiterleitung `portfolio/rad-von-zeit-und-raum/`); neue Seiten hier eintragen, ein Test prüft das
- Installierbare Web-App (PWA) für Rad und Feld: `portfolio/nebeneinander-nacheinander/app.webmanifest`, `sw.js` (offline),
  `js/pwa.js` (Anmeldung), Symbole in `app/` (erzeugt mit `NODE_PATH=$(npm root -g) node tools/app-icons.mjs`:
  Android leeres Rad = erstes Bild des Startbilds, damit der Systemstartbildschirm nahtlos übergeht; iPhone volles Rad).
  Die App hat eine eigene Adresse `app/` (Manifest `start_url`/`scope`), damit Links der Website im Browser bleiben und
  nie die installierte App öffnen. `app/index.html` und `app/feld/index.html` werden aus Rad- und Feldseite erzeugt
  (nie von Hand bearbeiten); ältere Installationen auf der Website-Adresse leitet die Radseite nach `app/` weiter.
  Nach jeder Änderung an Rad- oder Feldseite: `node --experimental-strip-types tools/build-app.ts` (App-Seiten, neue Version,
  Dateiliste; läuft auch mit dem Sync, ein Test meldet, wenn es vergessen ging). Als App sind Menü und Portfolio-Link ausgeblendet.
  App-Name ORNA; beim Start der installierten App setzt sich das Rad zusammen (`js/intro.js`, einmal pro Sitzung,
  im Browser zum Ansehen mit `?intro`, entfällt bei reduzierter Bewegung).
  Hinweis «Als App installieren» auf der Radseite (`js/pwa.js`): nur wo möglich – Chrome/Edge/Android öffnen das
  Installationsfenster, iPhone/iPad zeigen die zwei Schritte; als App geöffnet kein Hinweis. Ereignisse `rad-app/hinweis`, `rad-app/installiert`.
- `src/orna-video/` – Quellcode des Erklärvideos zu ORNA (Remotion, Hochformat 9:16, 45 s, mit Signet von ornament.cloud am Schluss; 5. Oktober 2026). Nicht Teil der Website; Daten und Schriften holt `gen.mjs` aus ORNA und `vendor/fonts/`. Rendern: siehe `src/orna-video/README.md`
- `src/orma/` – ORMA, zweite eigenständige App (Spiel zu zweit oder allein als Re-Entry, 48 Konstellationen, Gedankenbuch, Ergebniskarte);
  eigener Build (`tools/build-orma.ts` → `src/orma/dist/`, nicht eingecheckt), noch nicht veröffentlicht. Alles Weitere in `src/orma/README.md`
- `zu-seiner-zeit/` – Hypertext «Zu seiner Zeit» (49 Strophen, Spur, Zufall, Verweise), erzeugt mit
  `node --experimental-strip-types tools/build-zu-seiner-zeit.ts` aus `src/data/zu-seiner-zeit.json` (unverändert) und
  `src/data/zu-seiner-zeit.extra.json`; Gestaltung `zu-seiner-zeit/zsz.css`, Verhalten `zu-seiner-zeit/zsz.js`. Englisch und Spanisch unter `zu-seiner-zeit/en/` und `/es/` (aus `src/data/zu-seiner-zeit.en.json`, `.es.json`, Sprachwechsel oben auf jeder Seite). Alles Weitere in `src/zu-seiner-zeit/README.md`
- `alpha/` – Alpha-Versionen, öffentlich erreichbar, nicht in der Sitemap, `noindex`; von der Startseite aus ist nichts verlinkt (ausser «Das Dritte Rad» in der Navigation oben links); ORMA, die vier Prüfraster, OMNA COLOR und das Dritte Rad hängen an den Seiten Apps, Masterprompts und Web, ORMA und die Seiten der beiden Grundlagenpapiere (`alpha/pruefraster/`, `alpha/verteilapparat/`) auch an den News (REGELN §14, `tests/orma.test.mjs` prüft das); die Übersicht `alpha/` selbst ist von keiner Seite verlinkt (Entscheid vom 2. Oktober 2026, `tests/navigation.test.mjs` prüft das), nur per Adresse erreichbar;
  `alpha/orma/` ist ORMA, erzeugt mit `node --experimental-strip-types tools/build-orma.ts --alpha`
  `alpha/gesellschaftskonzepte/` ist seit dem 3. Oktober 2026 eine Seite wie `alpha/pruefraster/` (PDF, Anwendungsprompt 0.4.0, Anleitung,
  Vorschaubild aus `tools/alpha-og.mjs`), weiterhin «Zurzeit in Arbeit».
  Prüfraster in Arbeit als Textseite (`alpha/journalistische-texte/`, unten in der Übersicht direkt vor OMNA COLOR, «Zurzeit in Arbeit»):
  Quelle `src/alpha/*.md`, Seiten und Markdown-Download erzeugt mit `node --experimental-strip-types tools/build-alpha-texte.ts`
  (neue Fassung: Datei in `src/alpha/` ersetzen, Eintrag in `RASTER` anpassen, Build laufen lassen; ein Test meldet veraltete Seiten)
  Seit dem 3. Oktober 2026 mit Anwendungsprompt (`src/alpha/journalistische-texte-anwendungsprompt-0.4.0.md`, im `RASTER`-Eintrag unter `prompt`):
  der Build setzt ihn über das Raster (Download, Kopieren, Textfeld, «So gehst du vor») und legt die Datei unter `alpha/` ab
  `alpha/omna-color/` ist OMNA COLOR (Prototyp, zuunterst in der Übersicht): Farbkreis mit Gegenrad, zieht eine von 180 Gestaltungsübungen;
  eine einzige Datei `index.html` mit den Übungen als Daten im Skript (Stand Kartographie v0.5), von Hand gepflegt
  `alpha/drittes-rad/` ist «Das Dritte Rad» (Prototyp, zuunterst in der Übersicht): drei Ringe auf einer Achse (Zeit = sieben Zyklen aus «Zu seiner Zeit», Form = 40 Zeichen aus ORNA,
  Farbe = sieben Themen aus OMNA COLOR) zeigen drei Karten. Jede Karte öffnet ihr Stück im Rad selbst (ganze Strophe, ganze Begegnung, ganze Übung, mit Verknüpfungen in die anderen Bereiche),
  und in jedem Schritt gibt es vier Wege: zurück ins Rad (es dreht vom offenen Stück aus weiter), Zettelkasten, ORNA, OMNA COLOR. Beim offenen Stück stehen die vier Wege («Wie geht es weiter?») über dem Stück,
  nicht darunter, damit das Weitergehen vorn liegt (Wunsch vom 2. Oktober 2026). Das Rad selbst trägt keinen Text und keine Zahlen,
  die Schrift ist Instrument Sans wie in den anderen Fassungen. Die Seite ist schlicht (auf Wunsch vom 2. Oktober 2026): Rad ohne sichtbaren Titel (die Überschrift «Das Dritte Rad» bleibt für Vorlesegeräte, `.nur-lesen`), darunter zwei gleich gestaltete Knöpfe, «Drehen» und «Brücke»
  (drei Wege, eine Brücke zu schlagen: eine Strophe, die eine ORNA-Person tatsächlich nennt; eine Brücke, die jev beim Bauen als nah bewertet hat; in jedem fünften Fall eine absurde), dann die drei Karten mit den leisen Knöpfen «Karte kopieren» und «Noch einmal drehen».
  Oben links steht die Navigation der ganzen Website («Ornament Cloud», darunter «Das Dritte Rad»); «Das Dritte Rad» setzt das Rad auf den Start zurück, ohne die Seite neu zu laden.
  Das Rad dreht auf Tippen, Enter, «Drehen» und mit dem Finger oder der Maus (Wunsch vom 2. Oktober 2026): Der angefasste Ring (aussen die Zeit, in der Mitte die Form, innen die Farbe) folgt der Geste,
  die beiden anderen laufen gegenläufig wie ineinandergreifende Zahnräder, nach dem Loslassen läuft das Rad mit dem Schwung aus. Die Auslaufkurve kommt aus ORNA (`portfolio/nebeneinander-nacheinander/js/lib/spin.js`):
  sie beginnt mit dem Tempo der Geste und endet mit Tempo null genau auf dem Ziel, 2,6 bis 6,8 Sekunden. Die Geste bestimmt nur Richtung, Tempo und Dauer, welche Stücke das Rad zeigt, bleibt Zufall.
  Ein Antippen dreht wie bisher; bei «weniger Bewegung» dreht auch die Geste ohne Auslauf; ein Wisch in den Ecken neben dem Kreis blättert auf dem Handy die Seite (das Rad sperrt das Blättern, `touch-action: none`).
  Mehr Luft zwischen Rad und Knöpfen (Wunsch vom 2. Oktober 2026), und auf der Startseite des Rads (noch nichts gedreht oder geöffnet) mehr Raum über und unter dem Rad: oben `clamp(40px, 9vh, 96px)`, zwischen Rad und Knöpfen `clamp(40px, 7vh, 72px)`,
  mit Karten und beim Lesen die engen Abstände von früher (oben `clamp(16px, 5vh, 56px)`, unten 32 px; Wunsch vom 2. Oktober 2026, «im späteren Verlauf mit den Kästchen sieht es gut aus»). Das regelt eine CSS-Regel mit `:has()` auf `#result` und `#lese`, der Übergang dauert 0,45 s (bei «weniger Bewegung» springt er). Keine Texteingaben: das Satzfeld unter den Karten ist weg, «Karte kopieren» kopiert nur die Karte (Zeit, Form, Farbe).
  Kein Titel über dem Rad und kein Text darunter, kein «Zurück zum Start», kein Kasten «Fäden»; `faeden()` bleibt in `engine.js` (ein Test deckt sie ab), damit eine ältere Seite im Zwischenspeicher des Browsers keinen Export vermisst.
  Adressen: `?t=<Strophe>~<Konstellation>~<Übung>~<Farbe>~<Zeichen>` (mit `&f=zeit|form|farbe` für das offene Stück) stellt einen Stand wieder her, `?von=<strophe|paar|uebung|person>~<Kennung>` dreht von einem Stück aus weiter;
  «Zurück» im Browser folgt dem Verlauf. Auf den Originalseiten (Strophe, ORNA, OMNA COLOR) erscheint nur mit `?rad=1` am unteren Rand dieselbe Auswahl aus `weiter.js` (Kacheln aus `kacheln.js`).
  Alle vier Wege führen von dort ins Rad zurück, wo das Spiel weitergeht. Die Radseite selbst verlinkt nicht mehr auf die Originalseiten (kein «… öffnen ↗», Wunsch vom 2. Oktober 2026): Strophe, Begegnung und Übung werden ganz im Rad gelesen.
  Die Originalseiten bleiben unter ihren Adressen erreichbar, und die Leiste mit `?rad=1` bleibt bestehen; sie erreicht man nur noch über eine direkte Adresse.
  Zielseiten laden `weiter.js` per `import()` (Zettelkasten in `zu-seiner-zeit/zsz.js`, ORNA und OMNA COLOR als Einzeiler am Seitenende); ohne `?rad=` ändert sich dort nichts.
  Dateien: `index.html` (Rad und Ansichten, von Hand), `engine.js` (Verknüpfung: Wörter auf den Stamm gekürzt, seltene gemeinsame Wörter, gemeinsame Personen und jevs Nähe zählen, Ziehung unter den besten vier, nie ganz berechenbar; Rückkehr ins Rad),
  `kacheln.js` (die vier Wege als Kacheln, gemeinsam für Rad und Leiste), `weiter.js` (Leiste auf den Originalseiten),
  `daten.js` (erzeugt mit `node --experimental-strip-types tools/build-drittes-rad.ts` aus `src/data/zu-seiner-zeit.json` und `alpha/omna-color/index.html`; ein Test meldet, wenn sie veraltet ist),
  `jev.js` (erzeugt mit `tools/build-jev-bruecken.ts`, siehe unten).
  Versionsmarke: GitHub Pages lässt Browser jede Datei zehn Minuten ohne Nachfrage behalten. Direkt nach einer Aktualisierung bekäme eine frische Seite sonst alte Module aus dem Zwischenspeicher
  («does not provide an export named …»), und das Rad bliebe leer. Darum tragen alle Importe der Radmodule in `index.html`, `engine.js`, `kacheln.js` und `weiter.js` ein `?v=<Marke>`. Die Marke folgt dem Inhalt der vier Module
  (`engine.js`, `kacheln.js`, `daten.js`, `jev.js`) und wird vom selben Aufruf gesetzt wie `daten.js` (`tools/build-drittes-rad.ts`): nach jeder Änderung an einer dieser Dateien ausführen, ein Test meldet fehlende oder veraltete Marken
  und Importe von Modulen, die die Marke nicht erfasst. `weiter.js` selbst bleibt ohne Marke (die Zeile auf den Originalseiten bleibt, wie sie ist), holt seine Module aber mit Marke; ORNA-Daten und `symbols.js` gehören ORNA und tragen keine.
  Neue Exporte dürfen dazukommen, vorhandene sollten bleiben, solange ältere Seiten noch im Zwischenspeicher liegen können (zehn Minuten). Startet das Rad trotzdem nicht, steht auf der Seite ein Hinweis mit dem harten Neuladen (`#ladefehler`, nach 2,5 Sekunden).
  Der Test-Server `tools/serve-orma.mjs` liefert `no-cache` und zeigt solche Fehler nie; darum bildet der Test «Zwischenspeicher» in `tests/drittes-rad.e2e.mjs` GitHub Pages nach (`max-age=600`, alte Module im Browser).
  ORNA (Personen, 326 Konstellationen) wird direkt aus `portfolio/nebeneinander-nacheinander/js/data/` gelesen. OMNA COLOR zeigt mit `?u=<Nummer>` eine bestimmte Übung.
  Symbolik nach drei alten Kreisen, nur als Gestaltung und ohne Beschriftung: Tierkreis (Sternenband, zwölf selbst gezeichnete Zeichen, Sonne), Alchemie-Kreis (Zeichen der vier Elemente, sieben Planetenzeichen, Siebenstern, Dreieck mit drei Zeichen),
  Goethes Farbenkreis von 1809 (schön, edel, gut, nützlich, gemein, unnötig je Farbe, nur auf den Karten; «Phantasie» für den Indigo-Sektor ergänzt). Die Seite ist bewusst dunkel und mystisch (REGELN §5 gilt für ORNA).
  Zählen, Speichern und Senden: nichts. jev (api.typesafe.ai, ein Beurteiler, kein Texter) wird nur beim Bauen gefragt: `NODE_USE_ENV_PROXY=1 node --experimental-strip-types --no-warnings tools/build-jev-bruecken.ts`
  lässt ihn einmal bewerten, welche Strophen, Konstellationen und Übungen gedanklich zusammenpassen (rund 560 Aufrufe mit den eigenen Beständen als Text, erster Lauf am 2. Oktober 2026, geschätzt rund 22 Cent),
  und legt je Stück die acht nächsten Nachbarn in `jev.js` ab. Die Seite ruft jev nie auf und sendet keine Besuchertexte. Ändern sich Strophen, Konstellationen oder Übungen (Anzahl, Reihenfolge),
  passt die Prüfsumme nicht mehr: ein Test meldet es, bis `jev.js` neu erzeugt ist, und bis dahin bleibt jev in der Seite still. Zugang beim Bauen: ein Proxy, der den Schlüssel einsetzt, oder `TYPESAFE_API_KEY` in der Umgebung (nie in eine Datei);
  Antworten liegen zwischengespeichert in `$TMPDIR/jev-bruecken-cache.jsonl`, `--probe` zeigt drei Beispiele, ohne etwas zu schreiben.
  Tests: `node --experimental-strip-types --no-warnings --test tests/drittes-rad.test.mjs` und `NODE_PATH=$(npm root -g) node tests/drittes-rad.e2e.mjs`
- `src/doppelspalt/` – Produktionspaket (verbindliche Quelle der 20 + 20 Personen und der Konstellationen)
- `src/doppelspalt/REGELN.md` – geltende Regeln des Werks in Kurzform (verbindlich)
- `src/doppelspalt/CLAUDE-CODE-MASTERPROMPT-2026-ARCHIV.md` – ursprünglicher Auftrag, Entstehungsstand mit 99 Konstellationen, nicht mehr verbindlich
- `src/doppelspalt/redaktion/` – redaktionelle Fassung der Konstellationen als CSV (aktuelle Datei in `manifest.json` → `editorialFile`); neue Fassung übernehmen:
  `node --experimental-strip-types tools/import-konstellationen.ts src/doppelspalt/redaktion/<datei>.csv`, danach den Sync unten
- `tools/sync-doppelspalt-data.ts` – erzeugt daraus `portfolio/nebeneinander-nacheinander/js/data/*.js` und die Feldansicht:
  `node --experimental-strip-types tools/sync-doppelspalt-data.ts`
- `tools/og-image.mjs` – erzeugt das Vorschaubild für Facebook/X (`assets/og-nebeneinander-nacheinander.png`) aus dem Rad:
  `NODE_PATH=$(npm root -g) node tools/og-image.mjs`
- `tools/start-og.mjs` – erzeugt die Vorschaukarten (1200 × 630) für das Teilen auf Social Media (Wunsch vom 2. Oktober 2026): für die Startseite `assets/og-ornament-cloud.png`
  (eine Wolke aus den 40 Zeichen von ORNA neben dem Satz der Startseite) und für das Dritte Rad `alpha/drittes-rad/og-drittes-rad.jpg` (das Rad aus der Seite; JPEG, damit die Datei unter 300 KB bleibt):
  `NODE_PATH=$(npm root -g) node tools/start-og.mjs` (mit `start` oder `rad` nur ein Bild). Die Angaben für Facebook, X, LinkedIn und WhatsApp (`og:*`, `twitter:*`) stehen im Kopf der beiden Seiten,
  `tests/teilen.test.mjs` prüft sie. Ändert sich der Satz der Startseite oder das Rad, das Bild neu erzeugen. Mit `vorschau` entstehen die beiden Bilder der Seite «Web» (4 : 5, 640 × 800, JPEG).
- `tests/` – Prüfungen des Rads: `node --experimental-strip-types --no-warnings --test tests/doppelspalt.test.mjs`
  und im Browser (Playwright): `node tests/doppelspalt.e2e.mjs`. Aufbau der Website (Menü, Startseite, Apps, Masterprompts, Web, Versionsmarken): `tests/struktur.test.mjs`;
  im Browser `NODE_PATH=$(npm root -g) node tests/struktur.e2e.mjs` (Menü auf allen Breiten, OMNA COLOR eingebettet auf der Startseite, die Seite Web mit dem Stellenfeld)
- `slider.js` – Punkte über einer Wisch-Galerie auf dem Smartphone (Wischen selbst per CSS); zurzeit auf keiner Seite eingebunden,
  alle Raster stehen auf dem Handy untereinander (`.grid--stapel`). Wieder einschalten: `<div class="slider-dots" …>` vor das Raster, `.grid--stapel` weg, Skript einbinden
- `bg.js` – animierter Hintergrund (Lemniskaten und Schleifen als SVG, Tempo in `CONFIG`); zurzeit auf keiner Seite eingebunden. Wieder einschalten: `<div class="bg" aria-hidden="true"><svg class="bg-field" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"></svg></div>` direkt nach `<body>` und `<script src="bg.js?v=2" defer></script>` vor `</body>`
- `assets/` – Vorschau-Videos (.mp4/.webm) und Standbilder (.jpg), dazu die Vorschaukarten zum Teilen (`og-*.png`) und die Bilder der Seite «Web» (`vorschau-*.jpg`)
- `werke/<name>/index.html` – lokale Kopien der Artefakte
- `vendor/three/` – three.js r128 (MIT-Lizenz) für die 3D-Artefakte
- `vendor/goatcounter/count.js` – Zählskript von GoatCounter (ISC-Lizenz), lokal eingebunden auf allen Seiten (seit 5. Oktober 2026 auch auf der Alpha-Übersicht und den drei Prüfrastern; ohne Zählung bleiben ORMA und die ältere Seite `portfolio/rad-von-zeit-und-raum/`).
  Statistik: https://ornament-cloud.goatcounter.com – ohne Cookies und ohne persönliche Daten; auf localhost wird nicht gezählt.
  Eigene Besuche ausschliessen: einmal `https://ornament.cloud/#toggle-goatcounter` im jeweiligen Browser aufrufen
  (gilt pro Browser und Adresse; seit dem Umzug auf ornament.cloud heissen die Pfade `/news/` statt `/ornament-cloud/news/`).
  Ereignisse des Rads: `rad-drehung/<wischen|tippen|taste|nochmal>`, `rad-paar/<id>`, `rad-direktlink/<id>`, `rad-teilen/<id>`
- `vendor/fonts/` – Schriften Newsreader und Instrument Sans (SIL Open Font License)

Veröffentlichen: den gesamten Inhalt dieses Ordners (ohne `.git`) per FTP/SFTP in das
Webverzeichnis der Domain hochladen.

Die Kopien unter `werke/` sind Momentaufnahmen. Wird ein Artefakt auf claude.ai geändert,
muss die Kopie neu übernommen werden.
