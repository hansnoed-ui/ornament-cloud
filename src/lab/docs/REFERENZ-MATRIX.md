# Referenzprogramme – kompakte Operationsmatrix

Quellen sind die öffentlich dokumentierten Arbeitsprinzipien der Programme (offizielle Dokumentation und Handbücher), beschrieben aus dem Wissensstand des Entwicklers. In dieser Sitzung wurden die Seiten nicht einzeln abgerufen. Die Einträge sind darum als **technische Hypothesen über dokumentierte Prinzipien** zu lesen, nicht als nachgeprüfte Detailbefunde. Nachgeprüft ist nur, was in REA-PROTOKOLL.md steht (The Fictory, p5.js). Es wurde nichts dekompiliert und nichts übernommen.

Ein **Effekt** ist das sichtbare Ergebnis, eine **Operation** das nachvollziehbare Verfahren dahinter. Gesucht sind Operationen.

## Matrix

| Programm | Operationsprinzip | Ein → Aus | Klasse | im Lab 0.1 |
|---|---|---|---|---|
| **TouchDesigner** | Operatorfamilien nach Datentyp (TOP Bild, CHOP Kanäle, SOP Geometrie, DAT Text, COMP Behälter); Netze verbinden typgleiche Ausgänge; Medienwechsel über Wandler (TOP→CHOP, CHOP→TOP) | Bild ↔ Kanäle | Kopplung | **Typen mit strenger Kompatibilität** (`typen.js`); **Bildsignal** = TOP→CHOP |
| TouchDesigner Feedback TOP | Ausgabe des letzten Bildes wird Eingang, dazwischen Transformation und Komposition | Bild → Bild (rekursiv) | Rekursion | **Feedback** (`lab.feedback`) |
| **Reason / Rack** | Geräte mit Audio- und CV-Buchsen, Kabel auf der Rückseite; Combinator fasst ein Gefüge zu einer Einheit mit eigenen Reglern | Signal, Steuerspannung | Kopplung | **Ketten** = Verlauf als wiederverwendbare Einheit (`ketteAusVerlauf`) |
| **Bitwig Grid** | modulare Patches; jeder Parameter hat Modulationseingänge, Modulatoren (LFO, Hüllkurve, Zufall) wirken mit Tiefe auf beliebige Ziele | Steuersignal → Parameter | Kopplung | **Modulation** mit Routen und Tiefe (`modulation.js`) |
| **VCV Rack** (offen, GPL-3.0) | Audio und CV in derselben Form (Spannung), Attenuverter skaliert und kehrt um, Sample & Hold | Spannung | Kopplung, Selektion | **Tiefe −1 … +1**, Quelle «Zufall, gehalten» |
| **Cavalry** | Duplicator legt Kopien an, Falloff verteilt Eigenschaften über Lage oder Index; Behaviours sind modulare Modifikatoren | Form → viele Formen | Raum | **Wiederholung mit Falloff**; Varianten als verteilte Reihe (Stelle u) |
| **Houdini** | Attribute auf Punkten und Primitiven, Nodes ändern Attribute; prozedurale Ketten sind jederzeit rückverfolgbar und wieder auswertbar | Geometrie → Geometrie | Raum, Beobachtung | **unveränderliche Geschichte**: Knoten können neu gerechnet werden (`bildfolge`) |
| **Blender Geometry Nodes** | offene Node-Grafik, Felder werden je Element ausgewertet, Instanzen | Geometrie | Raum | Instanzen in **Wiederholung**; Typ GEOMETRY benannt |
| **vvvv** | Datenfluss mit Typen, Spreads (eine Operation auf viele Werte zugleich) | Daten | Kopplung | **Varianten** = Spread über einen Parameter |
| **Processing / p5.js** | `filter(op, wert)`: eine Operation, ein Parameter, Standardwerte, CPU- und GPU-Implementierung (geprüft, REA-PROTOKOLL) | Bild → Bild | Raum | **Farbe modulieren**; Operation und Implementierung getrennt |
| **Max/MSP/Jitter** | Matrizen für Bild, Signale für Klang; jit.matrix ↔ Zahlenlisten; derselbe Patch koppelt Bild und Klang | Bild ↔ Klang | Kopplung | Steuersignal 0–1 als gemeinsame Form; Audio-Format vorbereitet |
| **Ableton Live / M4L** | Clips und Szenen, Automationskurven über die Zeit | Zeit → Parameter | Zeit | Achse «über die Zeit» (Modulation im Verlauf) |
| **SuperCollider / Pure Data** | Server-Client bzw. offene Patches; Klang als formale Operation | Signal | Zeit | nur Audio-Format (AUDIO-FORMAT.md) |
| **DaVinci Resolve / Fusion** | nodebasiertes Compositing: Merge mit Modi, Masken, Keyframes, Vergleich zweier Pfade | Bild → Bild | Raum, Beobachtung | **Differenz** (Merge Difference); Vergleich im Nebeneinander |
| **Boris FX Sapphire** | Effektklassen (Glow, Lens, Distort, Glitch) mit vielen Parametern und Presets | Bild → Bild | Raum | nur als Klassen gelesen; keine Übernahme |
| **Resolume** | Ebenen, Effektketten, Feedback, Clips im Takt | Video | Zeit, Rekursion | Feedback; Kette |
| **Topaz Video** | Modelle für Entrauschen, Hochrechnen, Zwischenbilder | Video → Video | Zeit | nicht im Lab (es gibt `alpha/hochrendern/`). Artefakte bleiben erlaubt. |
| **After Effects** | Kompositionen in Kompositionen, Expressions koppeln Parameter | Ebenen | Kopplung | Expressions ≈ Routen; Verschachtelung später |
| **ComfyUI** | Arbeitsabläufe als Grafik, Seeds, Zwischenergebnisse, Grafik als Datei teilbar | Grafik | Beobachtung | **Projektformat**: Grafik, Startwerte, Zwischenergebnisse in einer Datei |
| **FFmpeg** | Filtergraphen als Text, Transkodierung, Einzelbilder | Video | Zeit | in 0.1 nicht nötig: MP4 über WebCodecs im Browser |
| **Figma** | Komponenten und Varianten mit Eigenschaften | Gestaltung | Selektion | Varianten mit Parametern sichtbar |
| **Rive** | State Machines: Zustände, Übergänge, Eingaben | Animation | Zeit | später: Ketten mit Bedingungen |
| **ShotDeck, FilmGrab, Flim, Frameset** | strukturierte Suche nach Bildausschnitt, Licht, Farbe, Kamera; visuelle Ähnlichkeit | Referenzbilder | Beobachtung | **nichts importiert, nichts erfasst**; nur ein künftiges kompositorisches Profil (ERWEITERUNGEN.md) |

## Ausgewählte Prinzipien für 0.1

1. **Rekursion (Feedback).** Ein Ergebnis wird mit offen gelegten Stellgrössen wieder Eingang. Jeder Zwischenstand ist ein Bild der Animation. → `lab.feedback`
2. **Modulation als universelle Kopplung.** Ein Modulator ist eine Funktion der Stelle u ∈ [0, 1]. Dieselbe Route verteilt Varianten (Nebeneinander) oder verändert über die Zeit (Nacheinander). Ein Steuersignal aus einem Bild ist eine gleichwertige Quelle. → `kern/modulation.js`, `lab.bildsignal`
3. **Verteilung statt Kopie (Duplicator/Falloff, Spread).** Varianten sind eine geordnete Reihe derselben Operation, nicht zufällige Würfe. → Variation in `fuehreAus`, `lab.wiederholung`
4. **Gefüge als Einheit (Combinator).** Ein Verlauf wird zur Kette und lässt sich auf anderes Material anwenden. → `ketteAusVerlauf`, `ketteAnwenden`

**Übertragene Erkenntnis in der Architektur:** Typisierte Ausgänge mit expliziten Wandlern (TouchDesigner) plus Modulationsrouten mit Tiefe (Bitwig, VCV) ergeben eine Kopplung über Medien hinweg. Das Lab koppelt so Bild an Parameter. Dieselbe Form (Werte 0–1 entlang u) kann später Klang an Bild koppeln, ohne neues Format.

## Filmästhetik als Operationsparameter (Ausblick, nichts gebaut)

Bildausschnitt, Symmetrie oder Asymmetrie, Gewicht der Lichtverteilung, Farbsättigung, Tiefenstaffelung und Bewegungsrichtung lassen sich an **eigenem oder freigegebenem** Material messen. Das Bildsignal ist ein erster Baustein dafür (Helligkeit oder Sättigung entlang x, y, radial). Ein kompositorisches Profil wäre ein METADATA-Ergebnis. Operationen könnten es verstärken, abschwächen oder umkehren. Geschützte Filmstills werden nicht importiert, nicht erfasst und nicht trainiert.
