# Social-Paket zu einer Musik-Veröffentlichung

Seit 13. November 2026. `tools/social-paket.mjs` rechnet aus einer Veröffentlichung unter `listen/<slug>/` (heute `directer`) alles, was ein Beitrag auf Instagram, TikTok oder Facebook braucht: je Track einen kurzen Film mit Ton in zwei Formaten, ein Standbild und die Beitragstexte. Alle Angaben kommen aus `listen/<slug>/ep.json`; die Audiodatei wird nur gelesen.

## Aufruf lokal

Braucht Node 22, `ffmpeg` im PATH und Playwright mit Chromium. Die Audiodatei ist nicht in Git (`docs/ep-directer.md`); sie muss unter `listen/<slug>/<audio aus ep.json>` liegen oder mit `--audio` genannt werden.

```bash
NODE_PATH=$(npm root -g) node tools/social-paket.mjs directer
NODE_PATH=$(npm root -g) node tools/social-paket.mjs directer --audio ~/Musik/the-i-directer-2.wav --sekunden 30 --nur 2
NODE_PATH=$(npm root -g) node tools/social-paket.mjs directer --probe --sekunden 8 --aus /tmp/social-probe
```

| Angabe | Bedeutung |
|---|---|
| `--audio <Pfad>` | die durchgehende WAV; ohne Angabe `listen/<slug>/<audio>` |
| `--aus <Ordner>` | Zielordner; ohne Angabe `docs/social/<slug>/` (`docs/` geht nicht auf den Webserver) |
| `--sekunden <n>` | Länge der Filme; ohne Angabe `social.sekunden` aus `ep.json`, sonst 24 |
| `--nur <n>` | nur dieser Track (1 = erster) |
| `--probe` | gerechneter Testton (`tools/beispielton.mjs`) statt der Musik, nur zum Prüfen von Bild und Ablauf. Die Dateien heissen dann `PROBE-…`, `texte.md` sagt es im Kopf. Nicht veröffentlichen. |

Fehlt die Audiodatei, sagt das Werkzeug, wo sie herkommt, und endet mit Exit 1.

## Felder in ep.json

Gelesen werden `anzeigename`, `titel`, `cover`, `audio`, `abtastrate` und `tracks` (`titel`, `startSample`, `samples`). Dazu, alle freiwillig:

| Feld | Bedeutung | ohne Angabe |
|---|---|---|
| `art` | z. B. «Maxi»; steht im Film unter dem Tracktitel und in den Texten | wird weggelassen |
| `artEn` | die Art in den englischen Texten, z. B. «Maxi single» | wie `art` |
| `jahr` | steht in den Texten | das Jahr aus `datum`, sonst weggelassen |
| `adresse` | steht im Film (ohne `https://`) und in den Texten | `https://ornament.cloud/listen/<slug>/` |
| `social.sekunden` | Länge der Filme | 24 |
| `social.ausschnitte` | `{ "<Tracktitel>": <Startsekunde im Track> }` | die lauteste Stelle (höchste mittlere Energie, Raster 1 s) |
| `social.texte.de`, `.en` | eigene erste Zeile der langen Beitragstexte | keine |

Der Ausschnitt geht nie über das Trackende hinaus; eine zu späte Startsekunde wird nach vorn geschoben. Welche Stelle gewählt wurde, steht in der Ausgabe und in `texte.md` – gefällt sie nicht, die Sekunde in `social.ausschnitte` eintragen.

## Was herauskommt

In `docs/social/<slug>/` (klein geschrieben, mit Bindestrichen, ohne Umlaute):

| Datei | Inhalt |
|---|---|
| `<slug>-01-<track>-9x16.mp4` | 1080 × 1920 für Reels, Stories, TikTok, Shorts |
| `<slug>-01-<track>-1x1.mp4` | 1080 × 1080 für den Feed |
| `<slug>-01-<track>-9x16.jpg` | Standbild (bei 40 % des Films), z. B. als Titelbild des Reels |
| `texte.md` | Beitragstexte kurz und lang, deutsch und englisch, für die Veröffentlichung als Ganzes und je Track |

Die Filme: 30 Bilder/s, H.264 (crf 20, yuv420p, faststart), Ton AAC 192 kbit/s, Bild und Ton 0,5 s ein- und 1 s ausgeblendet. Bei 24 s rund 15 bis 20 MB je Film.

Das Bild: das Cover scharf in der Mitte auf seinem unscharfen, abgedunkelten Abbild. Es atmet mit dem Bass (höchstens 2,5 %). Darunter 96 feine Striche: die Lautstärke des Ausschnitts als Fortschritt, der aktuelle Strich im Gelb der Hörseite. Oben der Name, unter den Strichen der Tracktitel, darunter Titel und Art, unten die Adresse. Im 9:16 bleiben oben 250 px und unten 340 px frei, weil dort die Bedienelemente der Apps liegen.

Die Texte enthalten nur Angaben aus `ep.json` (Name, Titel, Art, Jahr, Tracktitel, Zahl der Tracks, Dauer in Minuten, Adresse) und höchstens zwei Hashtags. Keine Beschreibung der Musik – die schreibt Christian selbst, am einfachsten als `social.texte`.

## Vom Handy: der Workflow

1. GitHub → Repository → **Actions** → links **Social-Paket** → **Run workflow**.
2. `slug` (Vorgabe `directer`) und `sekunden` (Vorgabe 24) stehen lassen oder ändern → **Run workflow**.
3. Warten, bis der Lauf grün ist (bei drei Tracks und 24 s geschätzt fünf bis zehn Minuten).
4. Den Lauf öffnen, unten bei **Artifacts** `social-directer` herunterladen (ZIP, 14 Tage verfügbar). Darin liegen Filme, Standbilder und `texte.md`.

Der Workflow (`.github/workflows/social.yml`) holt die Audiodatei mit `curl` von `https://ornament.cloud/listen/<slug>/<audio>`, braucht keine Secrets und schreibt nichts ins Repository.

## So funktioniert es

1. Aus der WAV wird nur der Bereich des Tracks gelesen (RIFF von Hand: PCM 16/24/32 Bit, 32 Bit Float, mono/stereo, auch `WAVE_FORMAT_EXTENSIBLE`) und zu Mono gemischt.
2. Je Filmbild: Hüllkurve (RMS) und Tiefenanteil (einpoliger Tiefpass bei 150 Hz, dann RMS), vorwärts und rückwärts geglättet, auf 0–1 normiert.
3. `tools/social/szene.html` zeichnet in Chromium Bild für Bild auf einen 2D-Canvas (`window.bild(i)`, ohne Uhr und Zufall: gleiches Bild bei jedem Lauf). Die JPEG gehen über eine Pipe an ffmpeg; der Ton des Ausschnitts kommt bitgleich als kleine WAV dazu.

## Prüfen

```bash
node --test tests/social-paket.test.mjs
NODE_PATH=$(npm root -g) node --test tests/social-paket.e2e.mjs
```

## Grenzen

- Nur WAV (PCM oder Float, mono oder stereo). Andere Formate vorher mit ffmpeg umwandeln.
- Die automatische Wahl nimmt die lauteste Stelle, nicht die schönste. Im Zweifel `social.ausschnitte` setzen.
- Jeder Film beginnt und endet schwarz (Blende). Als Titelbild darum das Standbild nehmen.
- Das Cover muss annähernd quadratisch sein; sonst wird es mittig beschnitten.
- Lange Tracktitel werden bis 44 px verkleinert, danach gestaucht.
- Ein Probelauf (`--probe`) rechnet den Testton je Track neu; das dauert bei langen Tracks einige Sekunden.
- `docs/social/` ist nicht in `.gitignore`: lokal gerechnete Filme nicht versehentlich committen.
- Der Workflow hängt davon ab, dass die WAV öffentlich unter der Adresse aus `ep.json` liegt.
