# ornament-cloud

Einfache statische Website (reines HTML/CSS), die eine Auswahl meiner Claude-Artefakte präsentiert.
Alles liegt auf dem eigenen Server – es werden keine Dateien von claude.ai, CDNs oder Google geladen.

- `index.html` – Startseite; jedes Artefakt ist ein `<article class="card">`-Block
- `styles.css` – Gestaltung (inkl. automatischem Dark Mode und Farben des Hintergrunds)
- `icons.js` – animierte Schwarz-Weiss-Symbole des Footer-Menüs (Dauer in `PERIOD`)
- `news/` – News als aufklappbare Einträge; neuer Eintrag = `<details class="entry">`-Block kopieren und oben einfügen
- `termine/` – Termine als aufklappbare Einträge; neuer Termin = `<details class="entry">`-Block kopieren und oben einfügen
- `portfolio/` – Werkübersicht (Karten); jedes Werk mit eigener Seite, z. B. `portfolio/rad-von-zeit-und-raum/`
- `portfolio/rad-von-zeit-und-raum/` – interaktives Doppelrad: `index.html`, `rad.css`, `js/wheel.js` (Rad, Geste, Ablauf),
  `js/lib/spin.js` (Drehphysik), `js/lib/geometry.js`, `js/symbols.js` (40 Zeichen), `js/lib/random.js`, `js/lib/validation.js`;
  Diagnose mit `?debug`, direkte Konstellation mit `?pair=<id>`
- `src/doppelspalt/` – Produktionspaket (verbindliche Quelle der 20 + 20 Personen und 99 Konstellationen, unverändert)
- `tools/sync-doppelspalt-data.ts` – erzeugt daraus `portfolio/rad-von-zeit-und-raum/js/data/*.js`:
  `node --experimental-strip-types tools/sync-doppelspalt-data.ts`
- `tests/` – Prüfungen des Rads: `node --experimental-strip-types --no-warnings --test tests/doppelspalt.test.mjs`
  und im Browser (Playwright): `node tests/doppelspalt.e2e.mjs`
- `slider.js` – Punkte unter der Wisch-Galerie der Artefakte auf dem Smartphone (Wischen selbst per CSS)
- `bg.js` – animierter Hintergrund (Lemniskaten und Schleifen als SVG, Tempo in `CONFIG`)
- `assets/` – Vorschau-Videos (.mp4/.webm) und Standbilder (.jpg)
- `werke/<name>/index.html` – lokale Kopien der Artefakte
- `vendor/three/` – three.js r128 (MIT-Lizenz) für die 3D-Artefakte
- `vendor/fonts/` – Schriften Newsreader und Instrument Sans (SIL Open Font License)

Veröffentlichen: den gesamten Inhalt dieses Ordners (ohne `.git`) per FTP/SFTP in das
Webverzeichnis der Domain hochladen.

Die Kopien unter `werke/` sind Momentaufnahmen. Wird ein Artefakt auf claude.ai geändert,
muss die Kopie neu übernommen werden.
