---
name: video-hochrendern
description: Fertige Videos in höherer Auflösung ausgeben (hochrendern, upscalen, 4K, schärfer, Super-Resolution) – eigene Remotion- und PHORMA-III-Videos neu rendern, alle anderen mit Real-ESRGAN, im Container über tools/hochrendern/ (CPU) oder im Browser auf der eigenen Grafikkarte über alpha/hochrendern/ (WebGPU), ohne API und ohne Kosten. Verwenden, wenn ein Video grösser, schärfer oder in 4K gewünscht ist, auch für Videos, die nicht aus diesem Repo stammen.
---

# Videos hochrendern

## 1. Gibt es eine Quelle? Dann neu rendern statt hochrechnen

Ein Upscaler errät Details, ein neuer Render zeichnet sie: Schrift und Linien bleiben gestochen scharf, und es geht viel schneller.

- **Remotion** (`src/videos/`, alle Videos aus `assets/`, deren Quelle in `src/videos/README.md` steht): dieselbe Zeile wie dort, dazu `--scale=2`, zum Beispiel
  `cd src/videos && npx remotion render OrnaVideo out/orna-2160x3840.mp4 --codec=h264 --crf=20 --scale=2`
  (danach wie im README nach `yuv420p` umwandeln). Die Web-Fassungen in `assets/` sind oft kleiner als die Composition (z. B. 810 × 1080 statt 1080 × 1440); `--scale` rechnet von der Composition aus.
- **PHORMA III** (`alpha/phorma-iii/`): am Computer unter «Format» die **Auflösung «doppelt (4K)»** wählen (2160 × 2700, 2160 × 3840, 3840 × 2160). Gezeichnet wird
  mit doppeltem Massstab, die 1-px-Fäden zeichnet die Bühne zweimal zwei Mal versetzt (`fein()` in `buehne.js`), damit das Bild dem einfachen gleicht.
  Ohne Browser hier im Container: `NODE_PATH=$(npm root -g) node tools/phorma-intro.mjs <ton> --ablauf … --format … --faktor 2` (rund viermal so lange).
- **Andere Three.js-Exporte** (Skill `threejs-spektakel` u. Ä.): in höherer Auflösung neu exportieren.

## 2. Sonst: `tools/hochrendern/hochrendern`

```bash
tools/hochrendern/hochrendern EINGABE.mp4                        # ×2, Modell «grafik», neben die Eingabe
tools/hochrendern/hochrendern EINGABE.mp4 --start 5 --dauer 2    # Probe: 2 Sekunden ab Sekunde 5
tools/hochrendern/hochrendern EINGABE.mp4 --faktor 3 --modell foto -o AUSGABE.mp4
tools/hochrendern/hochrendern EINGABE.mp4 --methode lanczos      # ohne KI, in Sekunden fertig
```

- Der erste Aufruf legt `tools/hochrendern/.venv` an (numpy, onnx, onnxruntime von PyPI) und lädt die Gewichte von GitHub (Real-ESRGAN, BSD-3, Prüfsumme fest im Skript) nach `~/.cache/ornament-hochrendern/`.
- **Modell:** `grafik` (realesr-animevideov3) für Grafik, Schrift, Comic, Animation, Renderings; `foto` (realesr-general-x4v3) für gefilmtes Material. Im Zweifel beide als Probe rechnen und vergleichen.
- **Faktor:** Das Netz rechnet immer ×4, ffmpeg verkleinert danach mit Lanczos. ×2 ist der Normalfall; bei 1080p-Eingaben nicht über ×2 (sonst grösser als 4K, viele Player streiken).
- Ton wird unverändert übernommen, Ausgabe H.264, `yuv420p`, crf 18, `+faststart`.

### Dauer (Container mit 4 Kernen, ohne GPU)

| Eingabe | pro Bild | 10 s bei 30 fps |
|---|---|---|
| 560 × 700 | ~2–3 s | ~12 min |
| 1080 × 1080 | ~6 s | ~30 min |
| 1080 × 1920 | ~12 s | ~60 min |

Das Modell `foto` braucht etwa 40 % länger. Das Skript zeigt die Restzeit laufend an.

### Vorgehen

1. Video beschaffen: Datei im Repo, vom Nutzer hochgeladen, oder per `curl` von einer URL (das Netzwerk der Umgebung kann Hosts sperren).
2. `ffprobe` für Auflösung und Länge, Dauer anhand der Tabelle schätzen und nennen.
3. Immer zuerst eine **Probe** von 1–2 Sekunden an einer aussagekräftigen Stelle (Schrift, feine Linien) und einen Vergleich zeigen:
   `ffmpeg -i probe.mp4 -i EINGABE.mp4 -filter_complex "[1]scale=W:H:flags=lanczos[b];[b][0]hstack" -frames:v 1 vergleich.png` (links Lanczos, rechts KI).
4. Den ganzen Lauf im Hintergrund starten (`run_in_background`), bei über ~1 Stunde vorher fragen oder kürzen/teilen.
5. Ergebnis mit `SendUserFile` schicken. Nur einchecken (`assets/`), wenn es auf die Website soll; dann Grösse beachten und die Seite nachführen.

Bekannt: Das Netz entfernt Kompressionsrauschen und macht sehr feine leuchtende Linien etwas dünner; Flächen werden um ein, zwei Helligkeitsstufen sauberer.

## 3. Für den Nutzer selbst: die Seite `alpha/hochrendern/`

ornament.cloud/alpha/hochrendern/ rechnet dasselbe Netz im Browser auf der Grafikkarte des eigenen Geräts (WebGPU, `netz.js`; Gewichte als float16 in
`modelle/`, erzeugt mit `tools/hochrendern/.venv/bin/python tools/hochrendern/web-gewichte.py`). Video hineinziehen, Probe vorher/nachher (1 : 1),
×2 oder ×4 bis 4K, MP4 mit Ton (H.264, sonst VP9). Dazu **Schrift über dem Video** (`schrift.js`): Ebenen mit 24 lokalen Schriften
(`vendor/schriften/`, `tools/schriften-holen.mjs`), Stil, Lage zum Ziehen, Zeitfenster und Auftritt; «× 1» setzt nur Schrift, ohne KI. Auf einer Grafikkarte viel schneller als hier im Container – für lange oder grosse Videos dorthin
verweisen. Gegen onnxruntime geprüft: 64 dB, höchstens 1/255 Abweichung; Kacheln bitgleich zum ganzen Bild.
Tests: `node --test tests/hochrendern.test.mjs`, `NODE_PATH=$(npm root -g) node tests/hochrendern.e2e.mjs` (WebGPU über SwiftShader).

## 4. Bezahlte Alternative: Topaz

Der Skill `topaz-upscale-video` (each::labs-API) liefert auf einer GPU in Minuten, braucht aber `EACHLABS_API_KEY`, freigeschalteten Host `api.eachlabs.ai` in der Netzwerk-Einstellung der Umgebung und eine öffentliche URL des Videos. Kostet pro Video; nur auf Wunsch.
