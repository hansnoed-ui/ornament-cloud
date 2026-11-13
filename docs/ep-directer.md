# Hörseite der Maxi «directer» von the i

Das Format heisst «Maxi», nicht EP; die Dateinamen `ep.json`, `ep-wav.mjs` usw. sind geblieben. Tracks: directer, making movies, directer reprise. Die Dateien auf dem Server heissen noch nach den Arbeitstiteln (`the-dancer`); beim Herunterladen bekommt die Datei den Titel aus `ep.json`.

Seit 10. November 2026 (Wunsch von Christian): eine schlichte Seite für Freunde. Link öffnen, einmal auf Play tippen, die ganze EP läuft durch, auch mit gesperrtem Bildschirm oder in einer anderen App. Die drei Tracks sind einzeln anwählbar und einzeln herunterladbar (seit 10. November 2026 drei statt vier: ohne «outro»).

Seit 11. November 2026 (Wunsch: «beim 3. track die ersten 35 sekunden wegschneiden und direkt mit dem hellen sample einsteigen … einen schönen, fliessenden einstieg»): «directer reprise» beginnt bei 36,46 s des bisherigen Masters, ein halbe Sekunde vor dem hellen Sample (Takt 12 bei 78 BPM, Marker «Fragment · wörtlich»), mit einer weichen Einblendung (sin², 0,5 s), die genau beim Anschwellen des Samples voll ist. Neuer Master `the dancer reprise (ab 36,46 s).wav` in `ornament-material/hoerproben/lucerne-feinschliff/`, das Original bleibt. Länge 5:39 statt 6:15, die Maxi 14:18. Neue Dateinamen `the-i-directer-2.wav` und `the-i-03-directer-reprise-2.wav` (Zwischenspeicher); Track 1 und 2 sind unverändert.

Seit 13. November 2026 (Entscheid von Christian: «öffentlich vorbereiten»): `ep.json` trägt `"oeffentlich": true`. Damit steht die Maxi auf `/b/hoeren/`, als «Neu» auf der Startseite und in der Sitemap (Block `HOEREN`, `tools/build-b.mjs`); die Seite hat die kanonische Adresse statt `noindex` und zuunterst den Link «ornament.cloud». Weitere Felder: `art` («Maxi»), `artEn`, `datum`, `social` (für `tools/social-paket.mjs`, siehe `docs/social-paket.md`). Wieder privat: `"oeffentlich": false`, in `index.html` `<meta name="robots" content="noindex">` statt der Zeile `<link rel="canonical" …>`, dann `node tools/build-b.mjs` und `src/register.json` auf `direktlink`.

- **Route:** `https://ornament.cloud/listen/directer/` (bis 13. November 2026 nur per Direktlink und `noindex`; eigene dunkle Oberfläche ohne Menü, Ausnahme in `tests/navigation.test.mjs`)
- **Lokal:** `node tools/ep-server.mjs` → http://localhost:8795/listen/directer/ (beantwortet Range-Anfragen mit 206 wie Apache; auf dem Telefon im selben WLAN `http://<IP des Rechners>:8795/listen/directer/`)

## Dateien

| Pfad | Inhalt |
|---|---|
| `listen/directer/index.html` | die Seite. `<title>`, `og:title` und `og:image` stehen fest drin, weil Linkvorschauen (WhatsApp, Signal, iMessage) kein JavaScript ausführen; ein Test prüft, dass sie zu `ep.json` passen |
| `listen/directer/ep.json` | **alles Veränderliche an einer Stelle:** `anzeigename`, `titel` (EP), `cover`, `coverKlein` (512 px für den Sperrbildschirm), `audio` (Audioquelle), `abtastrate`, `tracks` mit `titel`, `startSample`, `samples` und `datei` (Einzeldatei zum Herunterladen; ohne `datei` kein Download-Knopf) |
| `listen/directer/player.js` | Wiedergabe, Trackliste, Media Session; die reinen Rechnungen sind exportiert und ohne Browser getestet |
| `listen/directer/player.css` | Gestaltung, fürs Telefon zuerst, immer dunkel |
| `listen/directer/cover.jpg`, `cover-512.jpg` | Christians Cover (1254 × 1254, «the i» oben links, «directer» unten rechts) |
| `listen/directer/og-directer.jpg` | Vorschaubild für Linkvorschauen (`og:image`, 1200 × 630, das Cover mittig auf seinem unscharfen Abbild, unter 300 KB). `og:type` ist `website`: Facebook lässt die Karte bei `music.album` ohne weitere `music:`-Angaben weg. Nach einer Änderung bei Facebook im [Sharing Debugger](https://developers.facebook.com/tools/debug/) die Adresse eingeben und «Erneut scrapen» |
| `listen/directer/audio/the-i-directer.wav` und `audio/the-i-01-….wav` bis `03` | **die EP und die drei Einzeldateien zum Herunterladen, nicht in Git** (`.gitignore`) und von `rsync --delete` ausgenommen (`tools/hostpoint/ausschluss.txt`) |
| `tools/ep-wav.mjs` | baut die WAV und schreibt die Marken in `ep.json` |
| `tools/ep-range.mjs` | prüft eine Audioquelle auf 206 Partial Content |
| `tools/ep-server.mjs` | lokaler Server mit Range |

Platzhalter tragen das Wort `PLATZHALTER` (Tracktitel) oder `null` (Marken). Solange einer übrig ist, zeigt die Seite unter der Trackliste einen gestrichelten Kasten «Vorschau mit Platzhaltern. Noch offen: …».

## Wie die Wiedergabe funktioniert

Genau ein natives `<audio preload="metadata">` spielt eine einzige WAV. Die Tracks sind Zeitmarken darin (`startSample / abtastrate`). Ein Tipp auf einen Titel setzt `currentTime`, die Datei bleibt dieselbe. Darum gibt es zwischen den Tracks nichts umzuschalten, und der Browser spielt am Sperrbildschirm einfach weiter. Der aktive Titel folgt der tatsächlichen Position (`timeupdate`, und beim Zurückkehren `visibilitychange`, `pageshow`, `focus`). Media Session setzt Titel, Anzeigename, EP und Cover sowie Play, Pause, Vor, Zurück und Spulen am Sperrbildschirm; die Position dort zählt je Track. Fehlt die Datei oder bricht sie ab, steht ein verständlicher Hinweis da.

**Browser in Apps (Facebook, Instagram, Messenger, TikTok …):** Deren eingebauter Browser hält die Musik an, sobald der Bildschirm gesperrt oder die App gewechselt wird; das lässt sich von der Seite aus nicht verhindern. Die Seite erkennt ihn am User-Agent (`inAppBrowser` in `player.js`) und zeigt über der Wiedergabe einen Hinweis: auf Android ein Knopf «In Chrome öffnen» (Intent-Link), auf dem iPhone die Anleitung «··· → Im externen Browser öffnen», dazu «Link kopieren».

## WAV exportieren

Braucht Node und `ffmpeg`/`ffprobe` im PATH. Die Master werden nur gelesen.

```bash
node tools/ep-wav.mjs track1.wav track2.wav track3.wav
```

- Reihenfolge der Argumente = Reihenfolge der Tracks in `ep.json`.
- Ziel ist ohne `--aus` der Pfad aus `audio` in `ep.json`, also `listen/directer/audio/the-i-directer.wav`.
- Jeder Master wird für sich vorbereitet: Stereo, 44,1 kHz (soxr), 16 Bit mit Dreiecks-Dither, wenn die Quelle mehr als 16 Bit hat. Kein Normalisieren, keine Pegeländerung, nichts gekürzt: Stille am Anfang und Ende jedes Masters bleibt, es kommt keine dazu. Ein Master, der schon 16 Bit / 44,1 kHz / Stereo ist, wird bitgleich übernommen.
- Die Startmarken sind die Summen der Samplezahlen der vorbereiteten Spuren; sie landen als `startSample` und `samples` in `ep.json`.
- Für jeden Track mit `datei` in `ep.json` entsteht daneben die Einzeldatei zum Herunterladen, mit denselben Samples wie in der durchgehenden WAV.
- Die Zwischenexporte liegen im Temp-Ordner und werden gelöscht (`--behalten` lässt sie liegen).
- Das Skript nennt je Track Format, Länge, Spitzenpegel und ob Samples am Anschlag liegen.

Grösse: 16 Bit / 44,1 kHz Stereo sind 10,1 MB pro Minute, diese EP (14:54) also 158 MB, die drei Einzeldateien zusammen noch einmal so viel. Das ist für Git zu gross (GitHub nimmt keine Dateien über 100 MB), darum liegt die WAV nie im Repository.

## Veröffentlichen

1. WAV exportieren (oben), `ep.json` mit den Marken und Titeln committen, PR mergen. Der Workflow «Hostpoint» lädt die Seite hoch.
2. Den **ganzen Ordner `audio/`** (vier WAV-Dateien) **von Hand** auf den Webspace laden, nach `www/ornament.cloud/listen/directer/audio/` (SFTP, z. B. FileZilla oder WinSCP, mit dem SSH-Zugang von Hostpoint; oder `scp listen/directer/audio/*.wav KONTO@KONTO.ssh.cloud.hostpoint.ch:www/ornament.cloud/listen/directer/audio/`). Der Ordner steht in `tools/hostpoint/ausschluss.txt`, darum löscht der nächste Deploy sie nicht.
3. Prüfen: `node tools/ep-range.mjs https://ornament.cloud/listen/directer/` muss «OK: 206 Partial Content» melden. Apache liefert statische Dateien mit Range aus; die `.htaccess` gibt `.wav` den Typ `audio/wav` und komprimiert Audio nicht (sonst gäbe es kein Range).

**Andere Audioquelle:** Ist die Datei für den Webspace zu gross oder soll sie woanders liegen, in `ep.json` unter `audio` eine `https://`-Adresse eintragen (der Server muss Range-Anfragen beantworten; CORS ist nicht nötig, weil die Seite die Datei nur abspielt). Dieselbe Seite spielt dann von dort. Mit `tools/ep-range.mjs` prüfen.

**Neue Fassung der WAV:** neu exportieren und unter **neuem Dateinamen** hochladen (z. B. `the-i-directer-2.wav`, `audio` in `ep.json` anpassen). Sonst kann ein Browser bis zu zehn Minuten die alte Datei mit den neuen Marken kombinieren.

## Prüfen

```bash
node --test tests/ep-directer.test.mjs                        # Konfiguration, Marken, WAV-Export (mit ffmpeg), Range-Server, Deployment
NODE_PATH=$(npm root -g) node tests/ep-directer.e2e.mjs        # Chromium als Pixel 7: Navigation, Marken, Play/Pause, Download, Media Session, Rückkehr, fehlende Datei
```

### Gerätetests (von Hand, auf dem Deployment)

Auf iPhone/Safari und Android/Chrome je:

1. Link öffnen, Play tippen, Track 1 läuft.
2. Bildschirm sperren, warten bis mindestens Track 2 (am Sperrbildschirm wechselt der Titel).
3. Am Sperrbildschirm Pause und wieder Play.
4. Entsperren: Die Seite zeigt den Track, der gerade läuft.
5. Auf Track 3 tippen, bevor die Datei ganz geladen ist: Der Sprung kommt sofort (dank 206).
6. Den Download-Pfeil neben einem Titel tippen: Die Datei wird gespeichert, die Wiedergabe läuft weiter.
