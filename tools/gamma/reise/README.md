# Reise durch gamma – Video als Aufnahme der Seite (1. November 2026)

Wunsch: eine neue Fassung des Videos «Reise durch die gamma-Website» mit der jetzigen Seite, in 16:9 und 4:5.
Nach den Apps kein Zoom in den Laptop, sondern wieder im Raum hinauf zum Zettel und zur Wolke; bei den Specials ins Intro von
«Das dritte Rad», aus dem Farbring wird das Signet wie am Anfang der Seite, dann die Lichtkugel. Ohne Ton, nur als Datei.

Die Seite wird **Bild für Bild mit einer virtuellen Uhr** aufgenommen (`uhr.mjs`): `performance.now`, `Date.now`,
`requestAnimationFrame`, Timer, CSS- und WAAPI-Animationen und Videos laufen nur, wenn das Skript 1/30 s weiterschaltet.
So ruckelt nichts, auch wenn ein Bild länger zum Rechnen braucht, und die Seite läuft in voller Schärfe
(die Leistungsmessung von gamma wird für die Aufnahme abgeschaltet). Edge ohne Fenster rechnet auf der Grafikkarte, rund 90 ms je Bild.

- `uhr.mjs`: virtuelle Uhr, Browser (Edge), Haken in gamma (`window.__g`), Bildschirmabzug in voller Auflösung
- `regie.mjs`: die vier Teile
  - A: Lichtkugel → Signet, Websites, Apps, Apps flach, zurück, hinauf bis zum Zettel mit der Wolke
  - B: Kunst → Specials, Specials flach, Zeiger auf die Karte «Das dritte Rad»
  - C: das Intro von «Das dritte Rad» (Startfarbe fest, Knopf «Intro überspringen» ausgeblendet)
  - D: Signet → Lichtkugel
- `montage.py`: Überblendungen, der Farbring wird zum Signet (Fläche weicht ins Schwarz, Ring schrumpft und gleitet an den Ort des Signets), Abblende am Schluss

```bash
py -m http.server 8765                       # im Wurzelordner des Repos
cd <arbeitsordner>
for T in A B C D; do FORMAT=4x5 NODE_PATH="$(npm root -g)" node <repo>/tools/gamma/reise/regie.mjs . $T; done   # ohne FORMAT: 16:9
py -X utf8 <repo>/tools/gamma/reise/montage.py 4x5                                                            # → final-4x5/
cd <repo>/src/videos && npx remotion ffmpeg -framerate 30 -i <arbeitsordner>/final-4x5/%05d.jpg \
  -vf "scale=in_range=pc:out_range=tv,format=yuv420p" -color_range tv -c:v libx264 -crf 19 -preset slow -movflags +faststart gamma-reise-2-4x5.mp4
```

Ändert sich die Seite (Lage von Signet oder Rad), in `montage.py` die Mitten `RC` (Farbring) und `RD` (Signet) neu messen.
