# ORNAMENT AV STUDIO – Bestand, Entscheidungen, Stand

Auftrag: `av-studio.md` (Baustein-Prompt zum Masterprompt), 9. November 2026. Stand: Etappe A (Bestand, Register, Probe) und der Anfang von Etappe B (ein ganzer Filmablauf mit Ton).

## Bestandsaufnahme (Etappe A)

| Baustein | Pfad | Befund |
|---|---|---|
| Animationen | `animations/motor.js`, `effekte.js`, `video.js`, `schwerkraft.js` | WebGL 2, **23 Effekte** (die Zahl auf der Website stimmt), bis zu drei Ebenen mit Mischmodus und Deckkraft. Je Effekt 3–7 Regler (0–1) als `uP[6]`. Ein Bild hängt nur von der Zeit t ab (Schlaufe 12/30/60 s, `uPhi`); Effekte sind zustandslos, darum ist jedes Bild aus seiner Zeit reproduzierbar. Video wird in JPEG-Einzelbilder zerlegt (bis 13 s, `videoZerlegen`) und als Schleife mit Überblendung gezeigt. MP4-Export mit WebCodecs, ohne Ton. |
| Lab | `alpha/lab/operationen/tonsignal.js`, `alpha/phorma-iii/ton.js`, `tonspur.js`, `alpha/lab/medien/video.js` | Tonsignal (Hüllkurve, drei Bänder, Fluss, Einsätze je Filmbild), Ton als AAC ins MP4 (mp4-muxer 5.2.2, MIT). |
| Composer | `alpha/composer/` | Export als ZIP mit Summe, Stems (je Spur, nach Pegel und Unterbrechungen) und Projekt (`*.composer.json` mit Tempo, Abschnitten des Arrangements 0.2, Unterbrechungen je Spur). Das ist die genaueste Steuerquelle. |
| Video-Editor | `alpha/lab/video/` | eigene Seite, ausdrücklich nicht mit dem Lab verbunden (Entscheid 27.10.2026); hier nicht benutzt. |
| Rechner | Intel-Grafik (D3D11 über ANGLE), keine NVIDIA-GPU | Chromium rendert damit 1080p mit etwa 39 Bildern/s, 540p mit etwa 52 Bildern/s. |

Fehlend: Zeitleiste mit Szenen und Automationskurven, Masken, Tiefe, Optical Flow, Bildgedächtnis, Undo/Redo, Speichern eines AV-Projekts, 4K, eigene Effekt-Versionen.

## Entscheidungen

- **Eigener Bereich `alpha/av/`**, nur per Direktlink, `noindex`. /animations bleibt unverändert; dessen Motor wird über einen Adapter benutzt (`import` von `animations/motor.js`, `effekte.js`, `video.js`), kein Code kopiert.
- **Effektregister** (`kern/register.js`): Die Effekte von /animations sind nicht versioniert. Darum hält das Register je Effekt einen Fingerabdruck (GLSL, Regler) fest, und ein Projekt kann später melden, wenn sich ein benutzter Effekt verändert hat. Eingefrorene Kopien folgen, sobald ein Werk das braucht.
- **Steuerung aus dem Composer** (`kern/steuerung.js`): Die Stems werden nach der Funktion ihrer Spur gruppiert (Kick, Backbeat, Höhen, Perkussion, Bass, Pad, Melodie, Natur, Summe). Je Filmbild gibt es Hüllkurve, Impuls und Einsätze; die Abschnitte und Bildbrüche kommen aus dem Projekt (Stutter, Wirbel, Tape-Stop, Rückwärts, kurzes Stocken der Kick-Spur). Gemessen wird an den Stems, nicht an der Summe geschätzt.
- **Partitur als Daten** (`kern/partitur.js`): Eine Werkfamilie legt die Ebenen fest, dazu die Zuordnungen (Signal → Regler, Bereich, Kennlinie, auch Gegenbewegung) und das Verhalten je Abschnitt (Ebenen ein und aus, Grau, Licht, ein Lichtstoss beim Wiederfinden). Gebaut sind die ersten zwei Familien des Prompts: **Organische Materie** (Bild, Tusche-Fluid, Lichtstrahlen) und **Lebendes Archiv** (Bild grau, Entrauschen, Echo).
- **Zeit:** Im Export entsteht Bild i aus der Zeit i/30 s. Die Bildzeit des Materials folgt den Bildbrüchen. Die Vorschau zeichnet im Takt des Bildschirms an der Zeit des AudioContext.
- **Export im Browser** mit WebCodecs (H.264), Ton aus der Summe, ohne Ausblenden und ohne Pegeländerung. Formate 16:9 1920 × 1080, 4:5 1080 × 1350, 9:16 1080 × 1920 und eine schnelle Probe 960 × 540. 4K ist vorbereitet, aber auf der Intel-Grafik nicht geprüft.

## Geprüft

- `node --test tests/av.test.mjs`:
  - Einsätze liegen höchstens ein Filmbild neben dem Schlag.
  - Abschnitte und Bildbrüche kommen richtig aus dem Projekt.
  - Bildzeit: Stutter, Tape-Stop und Rückwärts stimmen.
  - Partitur: alle Werte in 0–1, nur vorhandene Effekte und Regler.
  - Register: 23 Effekte.
- Browser (Chromium, Intel-Grafik):
  - DnB 60 s mit dem Eis-Video (Organische Materie, 960 × 540) in 35 s gerechnet.
  - ECM 93 s mit dem Tal-Video (Lebendes Archiv, 1920 × 1080) in 72 s gerechnet.
  - Keine Fehler.
- MP4:
  - Bild- und Tonlänge gleich.
  - Ton gegen den Composer-Master um **0 Abtastwerte** versetzt (Kreuzkorrelation).
  - Lautheit −13,6 LUFS wie der Master.
- Kontaktbögen angesehen. Organische Materie wirkt sichtbar: lesbar in den ruhigen Teilen, Strömung und Regenbogenkanten im Hauptteil. **Lebendes Archiv ist zu schwach**: Rauschen und Echo kaum zu sehen, nur Grau und Licht.

## Offen und bekannt

- **AAC höchstens 192 kbit/s im Browser:** Chromium kodiert nicht mit 320 kbit/s. Für 320 kbit/s den Ton nachträglich ersetzen: `ffmpeg -i film.mp4 -i summe.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k film-320.mp4`. Später kann das ein lokaler Renderschritt übernehmen.
- **Video als Schleife von höchstens 20 s** (Zerlegen in Einzelbilder, wie /animations); längeres Material folgt mit WebCodecs-Dekodierung.
- **Ton im Export:** Der Musikmaster ist unverändert, der Spitzenwert nach AAC liegt bei −0,4 dBFS (Abtastwert).
- **Etappe B bis D:** Zeitleiste mit Szenen, Material je Abschnitt, Masken, Bildgedächtnis, Speichern und Öffnen, vertikale Fassung als eigene Komposition, Credits und Asset-Manifest, Bild-zu-Klang.
