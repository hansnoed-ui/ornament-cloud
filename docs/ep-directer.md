# Hörseite der EP «directer» von the i

Seit 10. November 2026 (Wunsch von Christian): eine schlichte Seite für Freunde. Link öffnen, einmal auf Play tippen, die ganze EP läuft durch, auch mit gesperrtem Bildschirm oder in einer anderen App. Die vier Tracks sind einzeln anwählbar.

- **Route:** `https://ornament.cloud/listen/directer/` (nur per Direktlink, `noindex`, nicht in der Sitemap, nicht im Menü; Ausnahme in `tests/navigation.test.mjs`)
- **Lokal:** `node tools/ep-server.mjs` → http://localhost:8795/listen/directer/ (beantwortet Range-Anfragen mit 206 wie Apache; auf dem Telefon im selben WLAN `http://<IP des Rechners>:8795/listen/directer/`)

## Dateien

| Pfad | Inhalt |
|---|---|
| `listen/directer/index.html` | die Seite. `<title>`, `og:title` und `og:image` stehen fest drin, weil Linkvorschauen (WhatsApp, Signal, iMessage) kein JavaScript ausführen; ein Test prüft, dass sie zu `ep.json` passen |
| `listen/directer/ep.json` | **alles Veränderliche an einer Stelle:** `anzeigename`, `titel` (EP), `cover`, `coverKlein` (512 px für den Sperrbildschirm), `audio` (Audioquelle), `abtastrate`, `tracks` mit `titel`, `startSample`, `samples` |
| `listen/directer/player.js` | Wiedergabe, Trackliste, Media Session; die reinen Rechnungen sind exportiert und ohne Browser getestet |
| `listen/directer/player.css` | Gestaltung, fürs Telefon zuerst, immer dunkel |
| `listen/directer/cover.jpg`, `cover-512.jpg` | Christians Cover (1254 × 1254, «the i» oben links, «directer» unten rechts) |
| `listen/directer/audio/the-i-directer.wav` | **die EP, nicht in Git** (`.gitignore`) und von `rsync --delete` ausgenommen (`tools/hostpoint/ausschluss.txt`) |
| `tools/ep-wav.mjs` | baut die WAV und schreibt die Marken in `ep.json` |
| `tools/ep-range.mjs` | prüft eine Audioquelle auf 206 Partial Content |
| `tools/ep-server.mjs` | lokaler Server mit Range |

Platzhalter tragen das Wort `PLATZHALTER` (Tracktitel) oder `null` (Marken). Solange einer übrig ist, zeigt die Seite unter der Trackliste einen gestrichelten Kasten «Vorschau mit Platzhaltern. Noch offen: …».

## Wie die Wiedergabe funktioniert

Genau ein natives `<audio preload="metadata">` spielt eine einzige WAV. Die Tracks sind Zeitmarken darin (`startSample / abtastrate`). Ein Tipp auf einen Titel setzt `currentTime`, die Datei bleibt dieselbe. Darum gibt es zwischen den Tracks nichts umzuschalten, und der Browser spielt am Sperrbildschirm einfach weiter. Der aktive Titel folgt der tatsächlichen Position (`timeupdate`, und beim Zurückkehren `visibilitychange`, `pageshow`, `focus`). Media Session setzt Titel, Anzeigename, EP und Cover sowie Play, Pause, Vor, Zurück und Spulen am Sperrbildschirm; die Position dort zählt je Track. Fehlt die Datei oder bricht sie ab, steht ein verständlicher Hinweis da.

## WAV exportieren

Braucht Node und `ffmpeg`/`ffprobe` im PATH. Die Master werden nur gelesen.

```bash
node tools/ep-wav.mjs track1.wav track2.wav track3.wav track4.wav
```

- Reihenfolge der Argumente = Reihenfolge der Tracks in `ep.json`.
- Ziel ist ohne `--aus` der Pfad aus `audio` in `ep.json`, also `listen/directer/audio/the-i-directer.wav`.
- Jeder Master wird für sich vorbereitet: Stereo, 44,1 kHz (soxr), 16 Bit mit Dreiecks-Dither, wenn die Quelle mehr als 16 Bit hat. Kein Normalisieren, keine Pegeländerung, nichts gekürzt: Stille am Anfang und Ende jedes Masters bleibt, es kommt keine dazu. Ein Master, der schon 16 Bit / 44,1 kHz / Stereo ist, wird bitgleich übernommen.
- Die Startmarken sind die Summen der Samplezahlen der vorbereiteten Spuren; sie landen als `startSample` und `samples` in `ep.json`.
- Die Zwischenexporte liegen im Temp-Ordner und werden gelöscht (`--behalten` lässt sie liegen).
- Das Skript nennt je Track Format, Länge, Spitzenpegel und ob Samples am Anschlag liegen.

Grösse: 16 Bit / 44,1 kHz Stereo sind 10,1 MB pro Minute, eine EP von 20 Minuten also rund 200 MB. Das ist für Git zu gross (GitHub nimmt keine Dateien über 100 MB), darum liegt die WAV nie im Repository.

## Veröffentlichen

1. WAV exportieren (oben), `ep.json` mit den Marken und Titeln committen, PR mergen. Der Workflow «Hostpoint» lädt die Seite hoch.
2. Die WAV **von Hand** auf den Webspace laden, nach `www/ornament.cloud/listen/directer/audio/the-i-directer.wav` (SFTP, z. B. FileZilla oder WinSCP, mit dem SSH-Zugang von Hostpoint; oder `scp listen/directer/audio/the-i-directer.wav KONTO@KONTO.ssh.cloud.hostpoint.ch:www/ornament.cloud/listen/directer/audio/`). Der Ordner steht in `tools/hostpoint/ausschluss.txt`, darum löscht der nächste Deploy sie nicht.
3. Prüfen: `node tools/ep-range.mjs https://ornament.cloud/listen/directer/` muss «OK: 206 Partial Content» melden. Apache liefert statische Dateien mit Range aus; die `.htaccess` gibt `.wav` den Typ `audio/wav` und komprimiert Audio nicht (sonst gäbe es kein Range).

**Andere Audioquelle:** Ist die Datei für den Webspace zu gross oder soll sie woanders liegen, in `ep.json` unter `audio` eine `https://`-Adresse eintragen (der Server muss Range-Anfragen beantworten; CORS ist nicht nötig, weil die Seite die Datei nur abspielt). Dieselbe Seite spielt dann von dort. Mit `tools/ep-range.mjs` prüfen.

**Neue Fassung der WAV:** neu exportieren und unter **neuem Dateinamen** hochladen (z. B. `the-i-directer-2.wav`, `audio` in `ep.json` anpassen). Sonst kann ein Browser bis zu zehn Minuten die alte Datei mit den neuen Marken kombinieren.

## Prüfen

```bash
node --test tests/ep-directer.test.mjs                        # Konfiguration, Marken, WAV-Export (mit ffmpeg), Range-Server, Deployment
NODE_PATH=$(npm root -g) node tests/ep-directer.e2e.mjs        # Chromium als Pixel 7: Navigation, vier Marken, Play/Pause, Media Session, Rückkehr, fehlende Datei
```

### Gerätetests (von Hand, auf dem Deployment)

Auf iPhone/Safari und Android/Chrome je:

1. Link öffnen, Play tippen, Track 1 läuft.
2. Bildschirm sperren, warten bis mindestens Track 2 (am Sperrbildschirm wechselt der Titel).
3. Am Sperrbildschirm Pause und wieder Play.
4. Entsperren: Die Seite zeigt den Track, der gerade läuft.
5. Auf Track 4 tippen, bevor die Datei ganz geladen ist: Der Sprung kommt sofort (dank 206).
