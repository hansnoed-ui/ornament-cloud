# Architektur von ORNAMENT LAB 0.1

Die zentrale Einheit ist die **Operation**, nicht die App. Vorhandene Anwendungen kommen über **Adapter** herein, neue Verfahren als eigene Module. Alles, was geschieht, steht in einem **Projekt**: einer gerichteten, azyklischen Ausführungsgrafik aus Ergebnissen, Knoten und Entscheidungen.

```
            ┌──────────── Operationsregister (kern/register.js) ────────────┐
            │ orna.konstellation  fictory.prozess  lab.feedback  lab.farbe  │
            │ lab.wiederholung    lab.bildsignal   lab.differenz            │
            │ lab.profil  lab.komposition  lab.tonsignal (Ton → Signal)     │
            │ lab.klang (Klangerzeuger: Bild, Signal, Text, Startwert → Ton)│
            └──────────────┬───────────────────────────────────────────────┘
                           │ beschreibt sich selbst: Kennung, Version, Herkunft, Klasse,
                           │ Ein-/Ausgänge mit Typen, Parameter (min/max = harte Grenzen),
                           │ Voraussetzungen, Ressourcen, ausfuehren(), optional verlauf()
                           ▼
 Material ──► Ausführung (kern/ausfuehrung.js) ──► Knoten + Ergebnisse + Entscheidungen ──► Projekt (kern/projekt.js)
   ▲            │ Typprüfung (kern/typen.js)                                                │
   │            │ Modulation verteilt Varianten (kern/modulation.js)                        │ Archiv (kern/archiv.js):
   │            │ Medienspeicher: Browser (medien/browser.js) / Node (Tests)                │ projekt.json + medien/*.png|json|mp4
   └── Weiterführen: ein gewähltes Ergebnis ist der Eingang des nächsten Knotens ◄────────┘
```

## Module

| Ordner/Datei | Aufgabe | DOM? |
|---|---|---|
| `kern/typen.js` | Datentypen. Implementiert: IMAGE, ANIMATION, CONSTELLATION, CONTROL_SIGNAL, METADATA, seit 0.1.3 AUDIO (als Material, seit 0.1.5 auch vom Klangerzeuger) und EVENT_SEQUENCE. Benannt für später: VIDEO, TEXT, GEOMETRY. Register `KLANGFORMEN`: die acht Formen des Audio-Operationsformats (docs/AUDIO-FORMAT.md). Verbindungen nur bei gleichem Typ. | nein |
| `kern/register.js` | prüft Operationsbeschreibungen, findet anwendbare Operationen, bereinigt und begrenzt Parameter | nein |
| `kern/modulation.js` | Modulatoren (Sinus, Dreieck, Säge, gehaltener Zufall, Steuersignal), Abtasten und halten, Routen mit Attenuverter und Polarität; mehrere Routen werden summiert, dann begrenzt (geprüft: docs/MODULATION-DOSSIER.md) | nein |
| `kern/komposition.js` | kompositorisches Profil (Schwerpunkt, Symmetrie, Licht, Kontrast, Farbe, Richtung) und die Zerlegung, mit der `lab.komposition` diese Komponenten skaliert oder einem Zielprofil angleicht (docs/KOMPOSITION.md) | nein |
| `kern/klang.js` | Klang in reinem JavaScript für `lab.klang`: Stimmungen, Klangfarben, Hüllkurve, Nachhall, WAV schreiben und lesen | nein |
| `kern/projekt.js` | Projektformat, Knoten, Ergebnisse, Entscheidungen (4 Arten), Verlauf, Geschwister, Ketten, Prüfung, Grenzen | nein |
| `kern/ausfuehrung.js` | `fuehreAus`, `bildfolge` (Animation), `regelVorschlaege`, `experiment`, `ketteAnwenden` | nein |
| `kern/stationen.js` | Animation über Stationen: Partitur (Reihenfolge, Halten, Übergänge, Modulation der Zeit, Takt aus Ereignisfolgen) und die Bilder des Films (docs/STATIONEN.md) | nein |
| `kern/archiv.js` | ZIP schreiben (ZIP-Schreiber der Fictory) und lesen, mit Prüfsummen und Pfadprüfung | nein |
| `kern/bilddaten.js` | reine Bildhilfen in ImageData-Form, Abtastung, Farbmatrix, SHA-256 | nein |
| `operationen/*.js` | die Operationen; `index.js` trägt sie ins Register ein | nur `fictory.js` und `karte.js` (Leinwand; `verfuegbar()` sagt es) |
| `medien/browser.js` | PNG-Kodierung, Import mit Typ-, Grössen- und Ausrichtungsprüfung, Objekt-URLs; Tondateien unverändert ablegen und mit Web Audio dekodieren (einkanalig, 44,1 kHz) | ja |
| `medien/video.js` | MP4 über WebCodecs und mp4-muxer (vendor/), seit 0.1.4 mit Tonspur, Rückfall WebM über MediaRecorder | ja |
| `jev/` | jev live: Lage, Frage, Seite, Worker-Entwurf (aus, solange keine Adresse eingetragen ist) | nein |
| `app.js`, `index.html`, `lab.css` | Oberfläche mit vier Bereichen und zwei Ansichten | ja |

Die Trennung zwischen Rechnung und Darstellung ist durch REA belegt (REA-PROTOKOLL.md, Fall 1): In The Fictory greifen nur `zeichnen.js` und `feld.js` auf `document` und Canvas zu, `orna.js` auf `crypto`, `rechner.js` ist ein Worker. Alles andere ist reine Rechnung. Darum laufen im Lab alle Operationen ausser dem Fictory-Adapter und der Textkarte auch in Node.

## Wiederverwendet, unverändert

- `alpha/the-fictory/analyse.js`, `operationen.js`, `zeichnen.js`, `feld.js`, `regeln.js`, `jev.js`, `orna.js`, `zip.js`, `dauer.js` (Importe mit `?v=23` wie in der Fictory, damit jedes Modul nur einmal geladen wird)
- `alpha/phorma-iii/ton.js` (Tonanalyse: Hüllkurve, Bänder, Spektrum, Fluss, Einsätze) für `lab.tonsignal`
- `alpha/phorma-iii/tonspur.js` (`tonKodieren`: AAC, sonst Opus) für die Tonspur eines Films über Stationen
- `portfolio/nebeneinander-nacheinander/js/data/` (ORNA-Bestand) und `js/lib/random.js` (Ziehung)
- `alpha/drittes-rad/daten.js` (die 49 Zettel von «Zu seiner Zeit», erzeugt aus `src/data/zu-seiner-zeit.json`) für `zettel.strophe`
- `vendor/mp4-muxer-5.2.2/`, `vendor/fonts/`
- `tools/serve-orma.mjs` (lokaler Server)

## Grenzen gegen Schleifen und Verbrauch (`GRENZEN` in kern/projekt.js)

- höchstens 300 Ausführungen je Projekt, 12 Varianten je Ausführung, 900 Bilder je Animation, 80 Stationen und 3600 Bilder je Film über Stationen
- Experiment: höchstens 8 Schritte und 120 s, nur erlaubte Operationen
- Arbeitsbilder höchstens 2048 px, Importdateien höchstens 60 MB und nur Bild- oder Tontypen, Töne höchstens 10 Minuten
- Parametergrenzen sind hart (`bereinigeParameter`). Rechengrösse und Iterationen sind Parameter und darum sichtbar.
- Zyklen sind nicht möglich: Ein Knoten liest nur Ergebnisse, die vor ihm entstanden sind (`pruefeProjekt` prüft das beim Öffnen).
- Abbrechen ist jederzeit möglich (AbortController). Ein abgebrochener oder fehlerhafter Knoten bleibt mit Status und Fehler im Protokoll.

## Eine neue Operation hinzufügen

1. Ein Modul unter `operationen/` mit der Beschreibung (siehe `farbe.js` als kleinstes Beispiel) und `ausfuehren(eingaben, parameter, kontext)` → `{ ausgaben, protokoll?, entscheidungen? }`. Optional `async *verlauf()` für eine eigene Bildfolge.
2. In `operationen/index.js` eintragen. Das Register prüft die Beschreibung beim Start, `tests/lab.test.mjs` prüft alle.
3. Steht die Operation jev zur Wahl, kommt ein Eintrag in `jev/fragen.js` (KATALOG) dazu. Der Test verlangt, dass der Katalog zum Register passt.

## Befunde unterscheiden

Im Protokoll sind getrennt: **verifizierte Befunde** (Messungen, z. B. Differenz, Analyse der Fictory), **gestalterische Entscheidungen** (Lesarten der Fictory, ORNA-Ableitungen, gekennzeichnet als «gestalterische Interpretation»), **jev-Urteile** (mit Modell, Stand, Wahrscheinlichkeiten) und **technische Hypothesen** (in den Dokumenten als solche markiert). Generative Modelle mit nicht reproduzierbaren Ergebnissen gibt es in 0.1 nicht. Das Format sieht sie vor (`BEFUNDARTEN.modell`, `reproduzierbar: "nein"`).
