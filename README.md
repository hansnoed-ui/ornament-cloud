# ornament-cloud

Einfache statische Website (reines HTML/CSS), die eine Auswahl meiner Claude-Artefakte präsentiert.
Alles liegt auf dem eigenen Server – es werden keine Dateien von claude.ai, CDNs oder Google geladen.

- `index.html` – Startseite: Apps, Zettelkasten («Zu seiner Zeit»), Prüfraster und Rückmeldungen; jede Karte ist ein `<article class="card">`-Block.
  Die Artefakte (Videos) stehen seit dem 29. September 2026 unten im Portfolio
- `kommentare.js` – Rückmeldungen auf der Startseite über giscus (GitHub Discussions dieses Repositorys, ohne Prüfung sichtbar);
  lädt `giscus.app` erst, wenn der Abschnitt in Sicht kommt, und nur wenn `CATEGORY_ID` eingetragen ist (Einrichten: Kommentar im Skript).
  Einzige Ausnahme von «keine fremden Dateien» (freigegeben am 29. September 2026)
- `styles.css` – Gestaltung (inkl. automatischem Dark Mode und Farben des Hintergrunds)
- `icons.js` – animierte Schwarz-Weiss-Symbole des Footer-Menüs (Dauer in `PERIOD`)
- `news/` – News als aufklappbare Einträge; neuer Eintrag = `<details class="entry">`-Block kopieren und oben einfügen
- `termine/` – Termine als aufklappbare Einträge; neuer Termin = `<details class="entry">`-Block kopieren und oben einfügen
- `portfolio/` – Werkübersicht (Karten); jedes Werk mit eigener Seite, z. B. `portfolio/nebeneinander-nacheinander/`
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
- `src/orma/` – ORMA, zweite eigenständige App (Spiel zu zweit oder allein als Re-Entry, 48 Konstellationen, Gedankenbuch, Ergebniskarte);
  eigener Build (`tools/build-orma.ts` → `src/orma/dist/`, nicht eingecheckt), noch nicht veröffentlicht. Alles Weitere in `src/orma/README.md`
- `zu-seiner-zeit/` – Hypertext «Zu seiner Zeit» (49 Strophen, Spur, Zufall, Verweise), erzeugt mit
  `node --experimental-strip-types tools/build-zu-seiner-zeit.ts` aus `src/data/zu-seiner-zeit.json` (unverändert) und
  `src/data/zu-seiner-zeit.extra.json`; Gestaltung `zu-seiner-zeit/zsz.css`, Verhalten `zu-seiner-zeit/zsz.js`. Alles Weitere in `src/zu-seiner-zeit/README.md`
- `alpha/` – Alpha-Versionen, öffentlich erreichbar, nicht in der Sitemap, `noindex`; ORMA und die Seiten der Grundlagenpapiere (`alpha/pruefraster/`, `alpha/verteilapparat/`) sind von Startseite und News verlinkt (REGELN §14, Test prüft das);
  `alpha/orma/` ist ORMA, erzeugt mit `node --experimental-strip-types tools/build-orma.ts --alpha`
- `src/doppelspalt/` – Produktionspaket (verbindliche Quelle der 20 + 20 Personen und der Konstellationen)
- `src/doppelspalt/REGELN.md` – geltende Regeln des Werks in Kurzform (verbindlich)
- `src/doppelspalt/CLAUDE-CODE-MASTERPROMPT-2026-ARCHIV.md` – ursprünglicher Auftrag, Entstehungsstand mit 99 Konstellationen, nicht mehr verbindlich
- `src/doppelspalt/redaktion/` – redaktionelle Fassung der Konstellationen als CSV (aktuelle Datei in `manifest.json` → `editorialFile`); neue Fassung übernehmen:
  `node --experimental-strip-types tools/import-konstellationen.ts src/doppelspalt/redaktion/<datei>.csv`, danach den Sync unten
- `tools/sync-doppelspalt-data.ts` – erzeugt daraus `portfolio/nebeneinander-nacheinander/js/data/*.js` und die Feldansicht:
  `node --experimental-strip-types tools/sync-doppelspalt-data.ts`
- `tools/og-image.mjs` – erzeugt das Vorschaubild für Facebook/X (`assets/og-nebeneinander-nacheinander.png`) aus dem Rad:
  `NODE_PATH=$(npm root -g) node tools/og-image.mjs`
- `tests/` – Prüfungen des Rads: `node --experimental-strip-types --no-warnings --test tests/doppelspalt.test.mjs`
  und im Browser (Playwright): `node tests/doppelspalt.e2e.mjs`
- `slider.js` – Punkte über einer Wisch-Galerie auf dem Smartphone (Wischen selbst per CSS); zurzeit auf keiner Seite eingebunden,
  alle Raster stehen auf dem Handy untereinander (`.grid--stapel`). Wieder einschalten: `<div class="slider-dots" …>` vor das Raster, `.grid--stapel` weg, Skript einbinden
- `bg.js` – animierter Hintergrund (Lemniskaten und Schleifen als SVG, Tempo in `CONFIG`); zurzeit auf keiner Seite eingebunden. Wieder einschalten: `<div class="bg" aria-hidden="true"><svg class="bg-field" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"></svg></div>` direkt nach `<body>` und `<script src="bg.js?v=2" defer></script>` vor `</body>`
- `assets/` – Vorschau-Videos (.mp4/.webm) und Standbilder (.jpg)
- `werke/<name>/index.html` – lokale Kopien der Artefakte
- `vendor/three/` – three.js r128 (MIT-Lizenz) für die 3D-Artefakte
- `vendor/goatcounter/count.js` – Zählskript von GoatCounter (ISC-Lizenz), lokal eingebunden auf allen Seiten.
  Statistik: https://ornament-cloud.goatcounter.com – ohne Cookies und ohne persönliche Daten; auf localhost wird nicht gezählt.
  Eigene Besuche ausschliessen: einmal `…/ornament-cloud/#toggle-goatcounter` im jeweiligen Browser aufrufen.
  Ereignisse des Rads: `rad-drehung/<wischen|tippen|taste|nochmal>`, `rad-paar/<id>`, `rad-direktlink/<id>`, `rad-teilen/<id>`
- `vendor/fonts/` – Schriften Newsreader und Instrument Sans (SIL Open Font License)

Veröffentlichen: den gesamten Inhalt dieses Ordners (ohne `.git`) per FTP/SFTP in das
Webverzeichnis der Domain hochladen.

Die Kopien unter `werke/` sind Momentaufnahmen. Wird ein Artefakt auf claude.ai geändert,
muss die Kopie neu übernommen werden.
