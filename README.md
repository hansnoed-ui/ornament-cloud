# ornament-cloud

Einfache statische Website (reines HTML/CSS), die eine Auswahl meiner Claude-Artefakte präsentiert.
Alles liegt auf dem eigenen Server – es werden keine Dateien von claude.ai, CDNs oder Google geladen.

- `index.html` – Startseite; jedes Artefakt ist ein `<article class="card">`-Block
- `styles.css` – Gestaltung (inkl. automatischem Dark Mode und Farben des Hintergrunds)
- `icons.js` – animierte Schwarz-Weiss-Symbole des Footer-Menüs (Dauer in `PERIOD`)
- `news/` – News als aufklappbare Einträge; neuer Eintrag = `<details class="entry">`-Block kopieren und oben einfügen
- `termine/` – Termine als aufklappbare Einträge; neuer Termin = `<details class="entry">`-Block kopieren und oben einfügen
- `portfolio/` – Werkübersicht (Karten); jedes Werk mit eigener Seite, z. B. `portfolio/nebeneinander-nacheinander/`
- `portfolio/nebeneinander-nacheinander/` – interaktives Doppelrad: `index.html`, `rad.css`, `js/wheel.js` (Rad, Geste, Ablauf),
  `js/lib/spin.js` (Drehphysik), `js/lib/geometry.js`, `js/symbols.js` (40 Zeichen), `js/ticker.js` (Laufband mit allen Namen), `js/lib/random.js`, `js/lib/validation.js`;
  Diagnose mit `?debug`, direkte Konstellation mit `?pair=<id>`
- `src/doppelspalt/` – Produktionspaket (verbindliche Quelle der 20 + 20 Personen und der Konstellationen)
- `src/doppelspalt/redaktion/` – redaktionelle Fassung der Konstellationen als CSV (zurzeit 165, Redaktion V3); neue Fassung übernehmen:
  `node --experimental-strip-types tools/import-konstellationen.ts src/doppelspalt/redaktion/<datei>.csv`, danach den Sync unten
- `tools/sync-doppelspalt-data.ts` – erzeugt daraus `portfolio/nebeneinander-nacheinander/js/data/*.js`:
  `node --experimental-strip-types tools/sync-doppelspalt-data.ts`
- `tests/` – Prüfungen des Rads: `node --experimental-strip-types --no-warnings --test tests/doppelspalt.test.mjs`
  und im Browser (Playwright): `node tests/doppelspalt.e2e.mjs`
- `slider.js` – Punkte unter der Wisch-Galerie der Artefakte auf dem Smartphone (Wischen selbst per CSS)
- `bg.js` – animierter Hintergrund (Lemniskaten und Schleifen als SVG, Tempo in `CONFIG`); zurzeit auf keiner Seite eingebunden. Wieder einschalten: `<div class="bg" aria-hidden="true"><svg class="bg-field" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"></svg></div>` direkt nach `<body>` und `<script src="bg.js?v=2" defer></script>` vor `</body>`
- `assets/` – Vorschau-Videos (.mp4/.webm) und Standbilder (.jpg)
- `werke/<name>/index.html` – lokale Kopien der Artefakte
- `vendor/three/` – three.js r128 (MIT-Lizenz) für die 3D-Artefakte
- `vendor/fonts/` – Schriften Newsreader und Instrument Sans (SIL Open Font License)

Veröffentlichen: den gesamten Inhalt dieses Ordners (ohne `.git`) per FTP/SFTP in das
Webverzeichnis der Domain hochladen.

Die Kopien unter `werke/` sind Momentaufnahmen. Wird ein Artefakt auf claude.ai geändert,
muss die Kopie neu übernommen werden.
