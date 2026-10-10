# ornament-cloud

Einfache statische Website (reines HTML/CSS), die eine Auswahl meiner Claude-Artefakte präsentiert.
Alles liegt auf dem eigenen Server – es werden keine Dateien von claude.ai, CDNs oder Google geladen.

- `index.html` – Startseite (Neuordnung vom 2. Oktober 2026, Wunsch von Christian; seit 3. Oktober ohne sichtbaren Titel, seit 5. Oktober auch ohne den Satz
  «Beobachtung ist Anlass für Veränderungen in der Realität.», der nur noch in Beschreibung und Vorschaukarte zum Teilen steht, `tests/teilen.test.mjs` hält beides zusammen;
  der Lead «Dreh- und Wendepunkte für Theorie und Praxis» (9. bis 10. Oktober 2026) ist auf Wunsch von Christian wieder weg; der Titel `<h1>` bleibt unsichtbar.
  Unter dem Kopf (Hauptlinks, Welle, Menü) steht direkt **OMNA COLOR zum direkten Spielen** (seit 10. Oktober 2026 wieder, Wunsch von Christian): ein `<iframe>` auf `alpha/omna-color/` (freigegebene Ausnahme von REGELN §14, wie schon vom 4. bis 9. Oktober 2026;
  `tests/orma.test.mjs` lässt nur diese eine Einbettung zu). Der Rahmen wächst mit dem Spiel; «Drehen» muss beim Laden nicht im Fenster stehen. Nach dem Drehen meldet das Spiel
  `postMessage({ omna: "uebung" })`, und die Startseite blättert zur gezogenen Übung. Der Beitrag zu OMNA COLOR steht weiter auf «Web». Die drei Kästen Apps, Prompts und Web, die vom 9. bis
  10. Oktober 2026 unter dem Lead standen, sind seit dem 10. Oktober 2026 mit «Zettel» das Menü oben auf allen Seiten.
- Menü (`<nav class="menu">`, seit 10. Oktober 2026, Wunsch von Christian): **vier Kästchen mit gezeichnetem Symbol und Namen**, immer in dieser Reihenfolge: **Apps** (vier Felder, `apps/`), **Prompts** (Sprechblase mit Eingabezeichen, `masterprompts/`),
  **Web** (Globus, `web/`), **Zettel** (Karteikarte, führt direkt zu `zu-seiner-zeit/`; seit 10. Oktober 2026 zuletzt); vorher, vom 2. bis 10. Oktober 2026, vier Wörter (Zettelkasten, Apps, Masterprompts, Web).
  Die Symbole sind nicht animiert und für Vorlesegeräte verborgen; Schrift der Seite (`--font`, Gewicht 500). Vier gleich breite Spalten, auch auf dem Handy (dort unter der Welle, bis 320 px Breite nebeneinander); am Computer rechts oben neben den Hauptlinks, die Welle darunter.
  Es steht in den Kopfzeilen von Startseite, News, Termine, Portfolio, Apps, Masterprompts, Web mit den Videoseiten und von ORNA (Rad, Feld und die App-Abschriften, dort ausgeblendet);
  Zettelkasten, Alpha-Seiten, ORMA und Werke haben es nicht. Aktiv ist, wo man ist (`aria-current="page"`; auf ORNA, das unter Apps hängt: `true`), das Kästchen hat dann einen kräftigeren Rand.
  Das Markup steht von Hand in den Seiten (`tests/struktur.test.mjs` prüft Reihenfolge, Ziele, Symbole und aktiven Eintrag auf allen 14 Seiten). News, Termine und Portfolio bleiben unter ihren Adressen, tragen das Menü und sind sonst nicht verlinkt (Entscheid von Christian, 2. Oktober 2026)
- `apps/` – Seite «Apps»: die Beiträge ORNA und ORMA (ORMA als Alpha gekennzeichnet; Vorschau ist das drehende Rad aus `icons.js`), in dieser Reihenfolge
- `masterprompts/` – Seite «Masterprompts»: die vier Prüfraster als Beiträge, in der Reihenfolge der Alpha-Übersicht: «Nebeneinander und Nacheinander», «Der Verteilapparat des Körpers»,
  «Prüfraster für Gesellschaftskonzepte», «Prüfraster journalistischer Texte» (alle als Alpha gekennzeichnet, die letzten beiden «In Arbeit»); zwei mal zwei (`.grid--paare`), die Vorschauen sind gezeichnete Vierfelder, Dreieck und Zeilen (SVG in der Seite)
- `web/` – Seite «Web»: zuoberst die Beiträge OMNA COLOR und Das Dritte Rad («Die Paradoxie der Stadt» stand vom 9. bis 10. Oktober 2026 zuoberst und ist zurzeit nur auf Alpha; ihr Vorschaubild `assets/vorschau-stadt.jpg` aus `NODE_PATH=$(npm root -g) node tools/start-og.mjs stadt` bleibt für später), beide Alpha und Prototyp, und seit dem 4. Oktober 2026 das Stellenfeld (kein Alpha). Reihenfolge seit dem 9. Oktober 2026 (Wunsch von Christian): OMNA COLOR, Das Dritte Rad, Stellenfeld, dann zuunterst die drei Videos, zuerst das Erklärvideo zu ORNA (`web/orna-erklaervideo/`, vorher auf der Startseite), dann «Liebling …», als letzter Beitrag «Mensch, Niklas!». Seit dem 6. Oktober 2026 gibt es das Comic-Video «Liebling, ich habe den Poststrukturalismus strukturiert» (Vorschau `assets/vorschau-poststrukturalismus.jpg`, ein Standbild aus dem Titel, 640 × 800). Es führt auf die eigene Videoseite `web/poststrukturalismus/` (Menü, Navigation, in der Sitemap): die Hochformat-Fassung 9 : 16 (`assets/poststrukturalismus-9x16.mp4`, 608 × 1080, ohne Ton, Quelle `src/videos/src/doppelpruefung/`, Composition `DoppelpruefungHoch`), spielt stumm von selbst, sobald sie zur Hälfte im Bild ist. Karte und Videoseite verlinken die Studie `alpha/poststrukturalismus-doppelpruefung.pdf` (Freigabe 6. Oktober 2026). Die Vorschau ist je ein Bild (640 × 800, dunkel): `assets/vorschau-omna-color.jpg`, `assets/vorschau-drittes-rad.jpg` und `assets/vorschau-stellenfeld.jpg`, erzeugt mit `tools/start-og.mjs vorschau`. Seit dem 7. Oktober 2026 gibt es «Mensch, Niklas!» (Vorschau `assets/vorschau-mensch-niklas.jpg`), ein Comic-Video in eigener Sache, gut drei Minuten, 3 : 4; es führt auf die Videoseite `web/mensch-niklas/` (`assets/mensch-niklas-3x4.mp4`, 810 × 1080, ohne Ton, Quelle `src/videos/src/mensch/`, Composition `MenschVideo`; Breite über `.erklaervideo--34` in `styles.css`); darunter die englische Fassung (`assets/mensch-niklas-en-3x4.mp4`, Composition `MenschVideoEN`, mit Schweizer Kontext und der Szene «Meanwhile in England»), die ebenfalls von selbst spielt. Seit dem 7. Oktober 2026 hat auch die deutsche Fassung die Szene «Unterdessen in England», und unter jedem Video steht ein Link zum Herunterladen (MP4). Zuunterst die spanische Fassung (`assets/mensch-niklas-es-3x4.mp4`, Composition `MenschVideoES`), ebenfalls mit Download.
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
  Wird `styles.css` geändert, `?v=` hochzählen (zurzeit 45: in den Seiten, in `tools/build-alpha-texte.ts`, danach `tools/build-app.ts` für die App-Seiten und den Service Worker von ORNA)
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
- `.claude/skills/` – Skills für Claude: `ornament-video` (Videos nach der Vorlage in `src/videos/`) und seit 6. Oktober 2026 `frontend-design` (Leitlinien für eigenständiges Webdesign, unverändert übernommen aus github.com/anthropics/skills, Stand 683bc88, Apache-Lizenz 2.0 in `LICENSE.txt`)
- `src/videos/` – Quellcode der Videos von ornament.cloud (Remotion, Hochformat 9:16, ohne Ton), seit 5. Oktober 2026 mit gemeinsamer Vorlage `src/videos/src/vorlage/` (Stil, Signet als Intro mit Kopfzeile und als Outro, Bausteine für Szenen); neues Video mit `npm run neu -- <name>`, Arbeitsweise im Skill `.claude/skills/ornament-video/`. Erstes Video: das Erklärvideo zu ORNA (`src/videos/src/orna/`, 51,5 s), seit dem 5. Oktober 2026 auf der Startseite (`assets/orna-erklaervideo.mp4`). Daten und Schriften holt `vorbereiten.mjs` aus der Website und `vendor/fonts/`. Rendern: siehe `src/videos/README.md`
- `src/orma/` – ORMA, zweite eigenständige App (Spiel zu zweit oder allein als Re-Entry, 48 Konstellationen, Gedankenbuch, Ergebniskarte);
  eigener Build (`tools/build-orma.ts` → `src/orma/dist/`, nicht eingecheckt), noch nicht veröffentlicht. Alles Weitere in `src/orma/README.md`
- `zu-seiner-zeit/` – Hypertext «Zu seiner Zeit» (49 Strophen, Spur, Zufall, Verweise), erzeugt mit
  `node --experimental-strip-types tools/build-zu-seiner-zeit.ts` aus `src/data/zu-seiner-zeit.json` (unverändert) und
  `src/data/zu-seiner-zeit.extra.json`; Gestaltung `zu-seiner-zeit/zsz.css`, Verhalten `zu-seiner-zeit/zsz.js`. Englisch und Spanisch unter `zu-seiner-zeit/en/` und `/es/` (aus `src/data/zu-seiner-zeit.en.json`, `.es.json`, Sprachwechsel oben auf jeder Seite). Alles Weitere in `src/zu-seiner-zeit/README.md`
- `alpha/` – Alpha-Versionen, öffentlich erreichbar, nicht in der Sitemap, `noindex`; von der Startseite aus ist nichts verlinkt (ausser «Das Dritte Rad» in der Navigation oben links); ORMA, die vier Prüfraster, OMNA COLOR und das Dritte Rad hängen an den Seiten Apps, Masterprompts und Web, ORMA und die Seiten der beiden Grundlagenpapiere (`alpha/pruefraster/`, `alpha/verteilapparat/`) auch an den News (REGELN §14, `tests/orma.test.mjs` prüft das); die Übersicht `alpha/` selbst ist von keiner Seite verlinkt (Entscheid vom 2. Oktober 2026, `tests/navigation.test.mjs` prüft das), nur per Adresse erreichbar;
  `alpha/orma/` ist ORMA, erzeugt mit `node --experimental-strip-types tools/build-orma.ts --alpha`
  `alpha/gesellschaftskonzepte/` ist seit dem 3. Oktober 2026 eine Seite wie `alpha/pruefraster/` (PDF, Anwendungsprompt 0.4.0, Anleitung,
  Vorschaubild aus `tools/alpha-og.mjs`), weiterhin «Zurzeit in Arbeit».
  `alpha/metastabilitaet/` (seit 5. Oktober 2026) steht für sich: die Analyse «Allgemeines, Konkretes und Metastabilität» als PDF
  (`alpha/allgemeines-konkretes-metastabilitaet.pdf`) mit Vorschaubild zum Teilen (`NUR=metastabilitaet node tools/alpha-og.mjs`); ohne Navigation oben links,
  von keiner Seite verlinkt, auch nicht von der Übersicht `alpha/` (Ausnahme in REGELN §14, `tests/navigation.test.mjs` und `tests/orma.test.mjs`)
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
  `alpha/stadt/` ist «Die Paradoxie der Stadt» (Prototyp seit 9. Oktober 2026, zuunterst in der Übersicht mit dem Link «Im Vollbild öffnen»; vom 9. bis 10. Oktober 2026 auch zuoberst auf «Web»; Knopf «Vollbild» in der Seite: Fullscreen-Schnittstelle, wo vorhanden, sonst füllt die Stadt das Fenster, etwa auf dem iPhone; `?vollbild` öffnet gleich so): ein interaktives Stadtlabor nach Klaus Kusanowskys Grafik
  «Urbane Paradoxien: Die Systematik der Stadt» (NotebookLM). Ein Quartier mit 72 Bewohner:innen (auf schwächeren Geräten 40), Passant:innen, Autos von aussen, Bus und Ampel lebt mit festem Takt und Startwert;
  vier Erfahrungsfelder an derselben Stadt: A Fahrspur, Bus, Zebrastreifen, Tempo 30 (echte Rückkopplung Kapazität → Fahrzeit → Nachfrage, kein Zeitschalter), B Verbindung mit Zaun, Brücke mit Treppen oder Rampen,
  C Sichtweisen (Verkehrsfluss, Erreichbarkeit, Aufenthalt, Belastung einzelner; Gewichtung nur als gewählte Wertung), D Offener Abend im Atelier (erreicht, anwesend, beteiligt, mitbestimmend; erfundene Modellszene nach Motiven von Kureishi, kein Zitat).
  Dazu Begleiten einer Person, Protokoll mit «Warum?», Vergleich «vorher» aus dem gemerkten Zustand und Alternativen, «Nur Massnahme zurücknehmen» getrennt von «Lauf zurücksetzen», und die beiden Prüfraster als «Genauer hinsehen».
  jev (api.typesafe.ai) hat beim Bauen 377 beschriebene Lagen eingeschätzt (Querung, Fahrt, Teilnahme): `NODE_USE_ENV_PROXY=1 node --experimental-strip-types --no-warnings tools/build-jev-stadt.ts` schreibt `alpha/stadt/jev.js`
  (Fragen in `alpha/stadt/fragen.js`, Prüfsumme; erster Lauf am 9. Oktober 2026, etwa 2 Cent). Ohne gültige Tabelle laufen Ersatzregeln.
  **jev live** (seit 9. Oktober 2026, Wunsch von Christian): Die Seite ruft jev nie direkt auf und holt beim Laden nichts von aussen. Nur wenn beim Begleiten «jev live fragen» eingeschaltet wird, fragt `alpha/stadt/live.js`
  für die begleitete Person einen eigenen Cloudflare Worker (`tools/jev-worker/`, Anleitung dort): Er hält den Schlüssel, nimmt nur eine streng geprüfte Lage aus Zahlen und festen Wörtern an (kein Name, kein freier Text),
  baut die Frage an jev selbst und speichert Antworten 30 Tage zwischen. Die Person bleibt stehen, bis die Antwort da ist; ohne Antwort gilt die Tabelle. Vergleichszweige fragen nie live.
  Die Adresse des Workers steht in `alpha/stadt/live.js` (`JEV_LIVE_ADRESSE`); leer heisst: kein Schalter. Tests: `node --test tests/jev-worker.test.mjs`. Modell, Parameter, Grenzen und eine Prüfraster-Karte: `alpha/stadt/MODELL.md`. Vorschaukarte zum Teilen (Open Graph und X, 1200 × 630): `alpha/stadt/og-stadt.jpg`, erzeugt zusammen mit dem Bild für «Web» von `NODE_PATH=$(npm root -g) node tools/start-og.mjs stadt`; `tests/teilen.test.mjs` prüft die Angaben.
  Module mit `?v=1`; bei Änderungen an einem Modul die Marke in allen Importen und in `index.html` hochzählen.
  Tests: `node --experimental-strip-types --no-warnings --test tests/stadt.test.mjs` und `NODE_PATH=$(npm root -g) node tests/stadt.e2e.mjs`
  `alpha/the-fictory/` ist «The Fictory» (Prototyp seit 10. Oktober 2026, zuoberst in der Übersicht, Wunsch von Christian; sonst nicht verlinkt): Ein eigenes Bild laden (bleibt im Browser), seine Gliederung prüfen und korrigieren,
  dann EIN Prozess von 30 Sekunden (30 Schritte je Sekunde) mit sechs Operationen nach dem Prüfraster «Nebeneinander, Nacheinander»: Neue Nachbarschaften, Abfolge als Bild, Wirksame Spuren, Gekoppelte Beziehungen, Figur und Grund, Anders weitergehen.
  Seit Fassung 2 (10. Oktober 2026, Wunsch von Christian: «zu wenig dekonstruiert») wird das ganze Bild Material: jede Fläche ein Teil, grosse Flächen in Kacheln (`zerlege()`, höchstens 72 Teile); nach dem Eingangsbild verschwindet das Original, es bleiben die Teile auf dunklem Grund.
  Schritt 1 öffnet die Fugen und legt alle Teile in ein Archiv-Raster, Schritt 2 legt sie nach Ankunft in eine Spirale, Schritt 3 lässt sie dem Spurenfeld ausweichen, Schritt 4 zieht sie über Kopplungen aus den gemeinsamen Grenzen wieder zum Bild zusammen (verdreht, durch Spuren gebremst),
  Schritt 5 kehrt Figur und Grund um (Silhouetten, Zwischenraum mit dem Material des Grundes), Schritt 6 legt einen einzigen Schnitt durch das Gefüge, eine Seite bricht weg.
  Jede Operation plant aus dem Zustand, den die vorige hinterlassen hat (Ankunftsreihenfolge, Spurenfeld, Kopplungen, Zwischenraum); die sechs Standbilder sind die Schlüsselzustände an den Stationsenden (Schritte 195, 330, 480, 630, 765, 900), als PNG in höherer Auflösung aus demselben Zustand gezeichnet.
  Zeitleiste mit Momentaufnahmen alle 15 Schritte, Neustart löscht Zustand und Spuren; Gegenprobe (Spurenfeld vor Schritt 4 gelöscht); Export: sechs PNG einzeln oder als ZIP (mit Protokoll), Video über `MediaRecorder` (MP4, wo der Browser es kann, sonst WebM), Protokoll als JSON (Bild-Prüfsumme, Einstellungen, Startwert, Regel, Schlüsselzustände), das den Lauf mit demselben Bild wiederholt.
  Analyse (`analyse.js`): k-Means im Lab-Raum, zusammenhängende Flächen, Sobel-Kanten, Momente, Nachbarschaften; farb- und geometriebasiert, kein semantisches Bildverständnis; Befund, Lesart und Eingriff getrennt, Lesarten verwerfbar.
  Prozess `operationen.js`, Zeichnen `zeichnen.js` (alles Material aus dem Eingangsbild, keine Schrift in den Bildern), Bedienung `app.js`, ZIP `zip.js`.
  ORNA (optional, `orna.js`): Ziehung wie in ORNA aus dem ganzen Bestand (ORNA-Daten werden nur gelesen), ein unveränderter Satz des Textes wird in eine von sieben Operationsregeln übersetzt (`regeln.js`), als gestalterische Interpretation gekennzeichnet.
  jev (api.typesafe.ai) hat beim Bauen je Konstellation Regel und tragenden Satz eingeschätzt: `NODE_USE_ENV_PROXY=1 node --experimental-strip-types --no-warnings tools/build-jev-fictory.ts` schreibt `jev.js` (326 Aufrufe, erster Lauf am 10. Oktober 2026, etwa 3,5 Cent; `--probe` zeigt drei Beispiele).
  Die Seite ruft jev nie auf; ohne gültige Tabelle (Prüfsumme über Regeln und Bestand) ordnet sie über Stichworte zu. Ändern sich Name oder Eingriff einer Regel, die Tabelle neu erzeugen. Beispielbild `beispiel.jpg` aus `NODE_PATH=$(npm root -g) node tools/fictory-beispiel.mjs`.
  Seit Fassung 3 (10. Oktober 2026, Wunsch von Christian: «TouchDesigner-Ästhetik», Richtungen «Spuren als Feld» und «Raster und Scanlines»): Jeder Stempel ist Keim eines wuchernden Felds (Reaktions-Diffusion nach Gray-Scott, 80 Zellen je Bildhöhe, Teil des Zustands, macht Teile zäh, wird von der Gegenprobe mit gelöscht),
  gezeichnet mit einem WebGL-Shader (`feld.js`, ohne WebGL ein einfacher Ersatz) als Kontur und Höhenlinien in der Leitfarbe des Bildes; das Raster des Spurenfelds als Punktgitter (heller, wo Spur liegt) und Scanlines im Verhältnis zur Bildhöhe, beides auch in Standbild und Video.
  Die Datenebene (Fadenkreuze, Namen der Figuren, Zähler; Knopf «Daten») liegt nur über der Live-Ansicht. Seite als «Werkbank» (dunkles Band, Leitfarbe aus dem Bild, Massstab, Kontaktbogen), gestaltet mit dem Skill `frontend-design`.
  Module mit `?v=3`; bei Änderungen die Marke in allen Importen und in `index.html` hochzählen.
  Tests: `node --experimental-strip-types --no-warnings --test tests/fictory.test.mjs` und `NODE_PATH=$(npm root -g) node tests/fictory.e2e.mjs` (mit `SCHNELL=1` ohne die Videoaufnahme)
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
  im Browser `NODE_PATH=$(npm root -g) node tests/struktur.e2e.mjs` (Menü auf allen Breiten, die Startseite mit OMNA COLOR, die Seite Web mit dem Stellenfeld)
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
