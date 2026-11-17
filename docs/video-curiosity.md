# Videoseite «the i – curiosity»

Seit 16. November 2026 (Wunsch von Christian: «ein neues Video damit visualisieren … gerne spektakuläre Effekte, aber basierend auf dem gleichen», dann «mit 4K rendern … gerne auf Repo, damit ich ihn mir online ansehen kann»).

- **Route:** `https://ornament.cloud/listen/curiosity/`, vorerst nur per Direktlink (`noindex`, Register-Status `direktlink`).
- **Track:** `s4-t4c-glut.wav` (3:25, 48 kHz / 24 Bit), Titel «curiosity».

## Bild

Ein einziger Milkdrop-Look, damit die Bildwelt gleich bleibt: das Preset **«Geiss – Tokamak Plus 2»** aus `butterchurn-presets` (feine Linien, die sich mit dem Klang biegen). Dazu ein Akzent nach dem Vorbild von «Eo.S. + Phat – cubetrace v2», das Christian wegen seines Aufleuchtens mochte: Auf jedem Schlag leuchtet das Bild kurz auf (unscharfe, aufgehellte Kopie des Bildes, additiv darübergelegt, Ausklingen etwa 0,2 s). Die Stärke folgt dem Anstieg der Lautheit gegenüber dem gleitenden Mittel, darum blitzt es im Breakdown kaum und im vollen Teil deutlich.

Gerendert offline in 3840 × 2160, 30 Bilder pro Sekunde: butterchurn in Chromium ohne Fenster (Software-WebGL), jedes Bild bekommt genau die 1024 Abtastwerte vor seinem Zeitpunkt, die Bilder gehen als JPEG an ffmpeg, der Ton ist die unveränderte WAV (AAC 256 kbit/s). Das Werkzeug liegt im Projektordner von Composer (`video-curiosity/werkzeug/`).

## Dateien

| Pfad | Inhalt |
|---|---|
| `listen/curiosity/index.html` | die Seite: ein `<video>`, Umschalter HD/4K (Start nach Bildschirmgrösse, Umschalten behält die Position) |
| `listen/curiosity/video.css` | Gestaltung, schwarz |
| `listen/curiosity/poster.jpg`, `og-curiosity.jpg` | Standbild vor dem Start und Vorschaubild für Linkvorschauen (1200 × 630) |
| `listen/curiosity/video/the-i-curiosity-1080p.mp4` und `-2160p.mp4` | **nicht in Git** (`.gitignore`) und von `rsync --delete` ausgenommen (`tools/hostpoint/ausschluss.txt`); von Hand per SFTP nach `www/ornament.cloud/listen/curiosity/video/` |

Neue Fassung des Videos immer unter neuem Dateinamen hochladen und in `index.html` anpassen, sonst mischen Browser bis zu zehn Minuten alt und neu.
