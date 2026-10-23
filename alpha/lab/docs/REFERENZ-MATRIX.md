# Referenzprogramme – kompakte Operationsmatrix

Quellen sind die öffentlich dokumentierten Arbeitsprinzipien der Programme (offizielle Dokumentation und Handbücher) und, bei offener Software, der Quellcode. Die Spalte **Stand** sagt, wie belastbar ein Eintrag ist:

- **geprüft**: am Quellcode oder an der offiziellen Dokumentation nachgelesen, mit Fundstelle. Für die Modulation (VCV Rack, Bitwig, TouchDesigner) steht das in [MODULATION-DOSSIER.md](MODULATION-DOSSIER.md) (23. Oktober 2026), für p5.js und The Fictory in [REA-PROTOKOLL.md](REA-PROTOKOLL.md).
- **Hypothese**: aus dem Wissensstand des Entwicklers beschrieben, die Seiten wurden nicht einzeln abgerufen. Diese Einträge sind technische Hypothesen über dokumentierte Prinzipien.

Es wurde nichts dekompiliert und kein Code übernommen.

Ein **Effekt** ist das sichtbare Ergebnis, eine **Operation** das nachvollziehbare Verfahren dahinter. Gesucht sind Operationen.

## Matrix

| Programm | Operationsprinzip | Ein → Aus | Klasse | im Lab 0.1 | Stand |
|---|---|---|---|---|---|
| **TouchDesigner** | Operatorfamilien nach Datentyp (TOP Bild, CHOP Kanäle, SOP Geometrie, DAT Text, COMP Behälter); Medienwechsel über eigene Operatoren: TOP to CHOP legt Pixel (Punkt, Zeile, Spalte, Bereich) als Kanäle 0–1 ab, Math CHOP rechnet um (Range), Export legt Kanäle auf Parameter und **ersetzt** dabei deren Wert | Bild ↔ Kanäle | Kopplung | **Typen mit strenger Kompatibilität** (`typen.js`); **Bildsignal** = TOP→CHOP | **geprüft** (Dossier 4) |
| TouchDesigner Feedback TOP | Ausgabe des letzten Bildes wird Eingang, dazwischen Transformation und Komposition | Bild → Bild (rekursiv) | Rekursion | **Feedback** (`lab.feedback`) | **geprüft** (Dossier 5) |
| **Reason / Rack** | Geräte mit Audio- und CV-Buchsen, Kabel auf der Rückseite; Combinator fasst ein Gefüge zu einer Einheit mit eigenen Reglern | Signal, Steuerspannung | Kopplung | **Ketten** = Verlauf als wiederverwendbare Einheit (`ketteAusVerlauf`) | Hypothese |
| **Bitwig Grid** | Unified Modulation System: jede Verbindung hat eine eigene, relative Stärke, der Regler bleibt bedienbar; Übertragungsfunktion je Verbindung (linear, positiv, Betrag, zur Mitte, exp., log.); Skalierung einer Verbindung durch eine zweite Quelle; im Grid summieren Steuerbusse, Eingänge haben Abschwächer; S&H für jedes Signal | Steuersignal → Parameter | Kopplung | **Modulation** mit Routen und Tiefe (`modulation.js`) | **geprüft** (Dossier 2, 3) |
| **VCV Rack** (offen, GPL-3.0) | Audio und CV in derselben Form (Spannung, bis 16 Kanäle); gestapelte Kabel werden summiert, jedes Kabel verzögert um einen Takt; Grundwert + CV/10 V × Attenuverter (−1 … +1), erst dann begrenzt; OFFSET macht einpolig bei gleichem Hub; Sample & Hold für jedes Signal (SHASR) | Spannung | Kopplung, Selektion | **Summe vor Begrenzung**, **Tiefe −1 … +1**, **Polarität**, **Abtasten und halten** für jede Quelle | **geprüft** (Dossier 1–3) |
| **Cavalry** | Duplicator legt Kopien an, Falloff verteilt Eigenschaften über Lage oder Index; Behaviours sind modulare Modifikatoren | Form → viele Formen | Raum | **Wiederholung mit Falloff**; Varianten als verteilte Reihe (Stelle u) | Hypothese |
| **Houdini** | Attribute auf Punkten und Primitiven, Nodes ändern Attribute; prozedurale Ketten sind jederzeit rückverfolgbar und wieder auswertbar | Geometrie → Geometrie | Raum, Beobachtung | **unveränderliche Geschichte**: Knoten können neu gerechnet werden (`bildfolge`) | Hypothese |
| **Blender Geometry Nodes** | offene Node-Grafik, Felder werden je Element ausgewertet, Instanzen | Geometrie | Raum | Instanzen in **Wiederholung**; Typ GEOMETRY benannt | Hypothese |
| **vvvv** | Datenfluss mit Typen, Spreads (eine Operation auf viele Werte zugleich) | Daten | Kopplung | **Varianten** = Spread über einen Parameter | Hypothese |
| **Processing / p5.js** | `filter(op, wert)`: eine Operation, ein Parameter, Standardwerte, CPU- und GPU-Implementierung (geprüft, REA-PROTOKOLL) | Bild → Bild | Raum | **Farbe modulieren**; Operation und Implementierung getrennt | **geprüft** (REA-PROTOKOLL) |
| **Max/MSP/Jitter** | Matrizen für Bild, Signale für Klang; jit.matrix ↔ Zahlenlisten; derselbe Patch koppelt Bild und Klang | Bild ↔ Klang | Kopplung | Steuersignal 0–1 als gemeinsame Form für Bild und Ton (`lab.bildsignal`, `lab.tonsignal`) | Hypothese |
| **Ableton Live / M4L** | Clips und Szenen, Automationskurven über die Zeit | Zeit → Parameter | Zeit | Achse «über die Zeit» (Modulation im Verlauf) | Hypothese |
| **Pure Data** (offen, BSD) | Signal (`~`) und Nachricht getrennt; `env~` misst die Leistung über ein Hann-Fenster und gibt eine Zahl in dB aus, `bonk~` erkennt Anschläge über das Wachstum einer Filterbank mit Hysterese | Signal → Zahl, Ereignis | Kopplung | **Tonsignal**: `AUDIO → CONTROL_SIGNAL + EVENT_SEQUENCE`, Messung aus PHORMA III (AUDIO-FORMAT.md) | **geprüft** (Quellcode `d_ctl.c`, `bonk~.c`) |
| TouchDesigner Audio Spectrum CHOP | Spektrum als Kanäle (Betrag und Phase), FFT-Grösse einstellbar | Klang → Kanäle | Kopplung | Schwerpunkt aus 32 Bändern; Spektrum als Befund vorgesehen | **geprüft** (docs.derivative.ca) |
| **SuperCollider** | Server-Client, Audio- und Kontrollrate; Klang als formale Operation | Signal | Zeit | Klanggenerator und -transformation als Signaturen vorgesehen (AUDIO-FORMAT.md) | Hypothese |
| **DaVinci Resolve / Fusion** | nodebasiertes Compositing: Merge mit Modi, Masken, Keyframes, Vergleich zweier Pfade | Bild → Bild | Raum, Beobachtung | **Differenz** (Merge Difference); Vergleich im Nebeneinander | Hypothese |
| **Boris FX Sapphire** | Effektklassen (Glow, Lens, Distort, Glitch) mit vielen Parametern und Presets | Bild → Bild | Raum | nur als Klassen gelesen; keine Übernahme | Hypothese |
| **Resolume** | Ebenen, Effektketten, Feedback, Clips im Takt | Video | Zeit, Rekursion | Feedback; Kette | Hypothese |
| **Topaz Video** | Modelle für Entrauschen, Hochrechnen, Zwischenbilder | Video → Video | Zeit | nicht im Lab (es gibt `alpha/hochrendern/`). Artefakte bleiben erlaubt. | Hypothese |
| **After Effects** | Kompositionen in Kompositionen, Expressions koppeln Parameter | Ebenen | Kopplung | Expressions ≈ Routen; Verschachtelung später | Hypothese |
| **ComfyUI** | Arbeitsabläufe als Grafik, Seeds, Zwischenergebnisse, Grafik als Datei teilbar | Grafik | Beobachtung | **Projektformat**: Grafik, Startwerte, Zwischenergebnisse in einer Datei | Hypothese |
| **FFmpeg** | Filtergraphen als Text, Transkodierung, Einzelbilder | Video | Zeit | in 0.1 nicht nötig: MP4 über WebCodecs im Browser | Hypothese |
| **Figma** | Komponenten und Varianten mit Eigenschaften | Gestaltung | Selektion | Varianten mit Parametern sichtbar | Hypothese |
| **Rive** | State Machines: Zustände, Übergänge, Eingaben | Animation | Zeit | später: Ketten mit Bedingungen | Hypothese |
| **ShotDeck, FilmGrab, Flim, Frameset** | strukturierte Suche nach Bildausschnitt, Licht, Farbe, Kamera; visuelle Ähnlichkeit | Referenzbilder | Beobachtung | **nichts importiert, nichts erfasst**; ihre Kategorien wurden als Messgrössen des kompositorischen Profils übernommen (KOMPOSITION.md), die Dienste selbst nicht abgefragt | Hypothese |

## Ausgewählte Prinzipien für 0.1

1. **Rekursion (Feedback).** Ein Ergebnis wird mit offen gelegten Stellgrössen wieder Eingang. Jeder Zwischenstand ist ein Bild der Animation. → `lab.feedback`
2. **Modulation als universelle Kopplung.** Ein Modulator ist eine Funktion der Stelle u ∈ [0, 1]. Geprüft an VCV Rack, Bitwig und TouchDesigner: Grundwert plus Signal mal Tiefe, mehrere Routen summiert und dann begrenzt, bipolar oder einpolig, fortlaufend oder abgetastet (MODULATION-DOSSIER.md). Dieselbe Route verteilt Varianten (Nebeneinander) oder verändert über die Zeit (Nacheinander). Ein Steuersignal aus einem Bild ist eine gleichwertige Quelle. → `kern/modulation.js`, `lab.bildsignal`
3. **Verteilung statt Kopie (Duplicator/Falloff, Spread).** Varianten sind eine geordnete Reihe derselben Operation, nicht zufällige Würfe. → Variation in `fuehreAus`, `lab.wiederholung`
4. **Gefüge als Einheit (Combinator).** Ein Verlauf wird zur Kette und lässt sich auf anderes Material anwenden. → `ketteAusVerlauf`, `ketteAnwenden`

**Übertragene Erkenntnis in der Architektur:** Typisierte Ausgänge mit expliziten Wandlern (TouchDesigner) plus Modulationsrouten mit Tiefe, Polarität und Summe (Bitwig, VCV, geprüft) ergeben eine Kopplung über Medien hinweg. Das Lab koppelt so Bild an Parameter. Dieselbe Form (Werte 0–1 entlang u) kann später Klang an Bild koppeln, ohne neues Format.

## Filmästhetik als Operationsparameter (seit 0.1.2)

Bildausschnitt, Symmetrie, Lichtverteilung, Kontrast und Sättigung werden an **eigenem oder freigegebenem** Material gemessen und als Faktor verändert (1 stehen lassen, 0 aufheben, −1 umkehren, 2 verdoppeln). Die Kantenrichtung wird nur gemessen. Tiefenstaffelung, Einstellungslänge und Rhythmus bleiben offen. → `lab.profil`, `lab.komposition`, KOMPOSITION.md. Geschützte Filmstills werden nicht importiert, nicht erfasst und nicht trainiert.
