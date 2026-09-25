# ornament-cloud

Einfache statische Website (reines HTML/CSS), die eine Auswahl meiner Claude-Artefakte präsentiert.
Alles liegt auf dem eigenen Server – es werden keine Dateien von claude.ai, CDNs oder Google geladen.

- `index.html` – Startseite; jedes Artefakt ist ein `<article class="card">`-Block
- `styles.css` – Gestaltung (inkl. automatischem Dark Mode und Farben des Hintergrunds)
- `icons.js` – animierte Schwarz-Weiss-Symbole des Footer-Menüs (Dauer in `PERIOD`)
- `news/` – News; neuer Eintrag = `<article class="post">`-Block kopieren und oben einfügen
- `termine/` – Termine als aufklappbare Einträge; neuer Termin = `<details class="entry">`-Block kopieren und oben einfügen
- `portfolio/` – Platzhalterseite
- `bg.js` – animierter Hintergrund (Lemniskaten und Schleifen als SVG, Tempo in `CONFIG`)
- `assets/` – Vorschau-Videos (.mp4/.webm) und Standbilder (.jpg)
- `werke/<name>/index.html` – lokale Kopien der Artefakte
- `vendor/three/` – three.js r128 (MIT-Lizenz) für die 3D-Artefakte
- `vendor/fonts/` – Schriften Newsreader und Instrument Sans (SIL Open Font License)

Veröffentlichen: den gesamten Inhalt dieses Ordners (ohne `.git`) per FTP/SFTP in das
Webverzeichnis der Domain hochladen.

Die Kopien unter `werke/` sind Momentaufnahmen. Wird ein Artefakt auf claude.ai geändert,
muss die Kopie neu übernommen werden.
