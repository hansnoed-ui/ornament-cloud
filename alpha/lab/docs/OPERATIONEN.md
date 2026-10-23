# Operationsverzeichnis – ORNAMENT LAB 0.1

Erzeugt aus dem Register mit `node alpha/lab/werkzeuge/operationsverzeichnis.mjs`. Die Beschreibungen in `alpha/lab/operationen/` sind die Quelle.

| Kennung | Name | Klasse | Herkunft | Eingänge → Ausgänge | Varianten |
|---|---|---|---|---|---|
| `orna.konstellation` 0.1.0 | ORNA-Konstellation | Selektionsoperation | Adapter: ORNA (Nebeneinander, Nacheinander) und The Fictory | – → Konstellation | eine |
| `fictory.prozess` 0.1.0 | The Fictory: Prozess in sechs Operationen | Zeitliche Operation | Adapter: The Fictory | Bild + Konstellation (opt.) → Bild | erzeugt selbst mehrere |
| `lab.feedback` 0.1.0 | Feedback | Rekursive Operation | neu, nach TouchDesigner Feedback TOP; Video-Feedback (Resolume); Kamera-Monitor-Schleife | Bild → Bild | über Modulation |
| `lab.wiederholung` 0.1.0 | Wiederholung mit Falloff | Räumliche Operation | neu, nach Cavalry Duplicator + Falloff; Blender Geometry Nodes (Instances) | Bild → Bild | über Modulation |
| `lab.farbe` 0.1.0 | Farbe modulieren | Räumliche Operation | neu, nach Fusion Color Corrector; p5.js filter() (POSTERIZE, INVERT); CSS Filter Effects (hue-rotate) | Bild → Bild | über Modulation |
| `lab.bildsignal` 0.1.0 | Bildsignal | Kopplungsoperation | neu, nach TouchDesigner TOP to CHOP; Max/Jitter (Matrix zu Zahlen) | Bild → Steuersignal | eine |
| `lab.differenz` 0.1.0 | Differenz | Beobachtungsoperation | neu, nach Difference-Komposition (Fusion Merge, After Effects, Resolume) | Bild + Bild → Bild | eine |

## ORNA-Konstellation (`orna.konstellation`)

Zieht eine Konstellation aus dem Bestand von 326 (oder nimmt eine gewählte) und leitet daraus eine Operationsregel R1–R7 für The Fictory ab.

- **Herkunft:** Adapter, ORNA (Nebeneinander, Nacheinander) und The Fictory; Datei alpha/the-fictory/orna.js, portfolio/nebeneinander-nacheinander/js/data/
- **Voraussetzungen:** crypto.getRandomValues
- **Ressourcen:** sofort; Speicher: gering
- **Reproduzierbar:** bedingt

| Parameter | Bereich |
|---|---|
| Konstellation (`konstellation`) | 327 Optionen, Standard «per Zufall ziehen (wie in ORNA)» |

## The Fictory: Prozess in sechs Operationen (`fictory.prozess`)

Das Bild zerfällt in seine Teile: neue Nachbarschaften, Abfolge als Bild, wirksame Spuren, gekoppelte Beziehungen, anders weitergehen, neu zusammengesetzt. Die sechs Schlüsselzustände sind die Varianten.

- **Herkunft:** Adapter, The Fictory; Datei alpha/the-fictory/analyse.js, operationen.js, zeichnen.js (v=23, unverändert)
- **Voraussetzungen:** Browser mit Canvas 2D (WebGL optional für das Feld)
- **Ressourcen:** 900 Schritte (30 s Animation), einige Sekunden Rechnung; Speicher: Material in Arbeitsauflösung
- **Reproduzierbar:** ja
- **Eigener Verlauf** (Bildfolge für Animation): ja

| Parameter | Bereich |
|---|---|
| Farbgruppen (`farben`) | 3 … 10, Standard 6 |
| kleinste Fläche (‰ des Bildes) (`mindestanteil`) | 1 … 20, Standard 4 |
| Operationsregel (`regel`) | **aus der Konstellation (oder keine)** / R1 Keine Rückkehr an dieselbe Stelle / R2 Verzögerter Spiegel / R3 Raster als Regel / R4 Nur Unterschiede, die Unterschiede machen / R5 Fortwirkende Last / R6 Die Leerstelle bleibt / R7 Verflechtung |
| Grösse der Zustände (längste Seite, px) (`seite`) | 480 … 2048, Standard 1200 |

## Feedback (`lab.feedback`)

Das Bild wird wiederholt auf sein eigenes Ergebnis angewandt: gezoomt, gedreht, verschoben, farblich gedreht und mit dem Eingang gemischt.

- **Herkunft:** neu im Lab; Datei alpha/lab/operationen/feedback.js; Prinzip nach TouchDesigner Feedback TOP; Video-Feedback (Resolume); Kamera-Monitor-Schleife
- **Voraussetzungen:** keine (läuft auch in Node)
- **Ressourcen:** Iterationen × Pixel (900 px, 24 Iterationen: etwa 1 s); Speicher: drei Gleitkommabilder
- **Reproduzierbar:** ja
- **Eigener Verlauf** (Bildfolge für Animation): ja

| Parameter | Bereich |
|---|---|
| Iterationen (`iterationen`) | 1 … 120, Standard 24 – wie oft das Ergebnis wieder Eingang wird |
| Zoom je Iteration (`zoom`) | 0.8 … 1.25, Standard 1.04 |
| Drehung je Iteration (°) (`drehung`) | -20 … 20, Standard 3 |
| Versatz waagrecht (`versatzX`) | -0.08 … 0.08, Standard 0 |
| Versatz senkrecht (`versatzY`) | -0.08 … 0.08, Standard 0 |
| Anteil des Eingangs (`mischung`) | 0 … 1, Standard 0.15 – 0: nur Rückkopplung, 1: nur Eingang |
| Abklingen (`abklingen`) | 0.8 … 1, Standard 0.97 |
| Farbdrehung je Iteration (°) (`farbdrehung`) | -60 … 60, Standard 6 |
| Komposition (`mischart`) | **mischen** / heller / Differenz |
| Rand (`rand`) | **spiegeln** / wiederholen / dunkler Grund |
| Rechengrösse (längste Seite, px) (`seite`) | 256 … 1600, Standard 900 – begrenzt Rechenzeit und Speicher |

## Wiederholung mit Falloff (`lab.wiederholung`)

Das Bild wird im Raster wiederholt; Grösse und Drehung jeder Kopie folgen einem Falloff über die Lage.

- **Herkunft:** neu im Lab; Datei alpha/lab/operationen/wiederholung.js; Prinzip nach Cavalry Duplicator + Falloff; Blender Geometry Nodes (Instances)
- **Voraussetzungen:** keine (läuft auch in Node)
- **Ressourcen:** ein Durchgang über die Pixel; Speicher: ein Bild
- **Reproduzierbar:** ja

| Parameter | Bereich |
|---|---|
| Spalten (`spalten`) | 1 … 12, Standard 4 |
| Zeilen (`zeilen`) | 1 … 12, Standard 4 |
| Grösse der Kopien (`groesse`) | 0.2 … 1.6, Standard 0.9 |
| Drehung (°) (`drehung`) | -180 … 180, Standard 0 |
| Falloff auf Grösse (`falloffGroesse`) | -1 … 1, Standard 0.5 – −1 … +1: wie stark f die Grösse verändert |
| Falloff auf Drehung (`falloffDrehung`) | -1 … 1, Standard 0.25 – −1 … +1: f · 180° |
| Falloff (`falloff`) | linear (Lesereihenfolge) / **radial (von der Mitte)** / Zufall (gehalten) |
| jede zweite Kopie spiegeln (`spiegeln`) | ein/aus, Standard ein |
| Grund (`grund`) | **Nacht** / Papier |
| Rechengrösse (längste Seite, px) (`seite`) | 256 … 2048, Standard 1200 |

## Farbe modulieren (`lab.farbe`)

Farbdrehung, Sättigung, Kontrast, Tonwertstufen und Umkehr in fester Reihenfolge.

- **Herkunft:** neu im Lab; Datei alpha/lab/operationen/farbe.js; Prinzip nach Fusion Color Corrector; p5.js filter() (POSTERIZE, INVERT); CSS Filter Effects (hue-rotate)
- **Voraussetzungen:** keine (läuft auch in Node)
- **Ressourcen:** ein Durchgang über die Pixel; Speicher: ein Bild
- **Reproduzierbar:** ja

| Parameter | Bereich |
|---|---|
| Farbdrehung (°) (`farbdrehung`) | -180 … 180, Standard 0 |
| Sättigung (`saettigung`) | 0 … 2.5, Standard 1 |
| Kontrast (`kontrast`) | 0.2 … 2.5, Standard 1 |
| Tonwertstufen (0 = aus) (`stufen`) | 0 … 16, Standard 0 |
| umkehren (`umkehren`) | ein/aus, Standard aus |

## Bildsignal (`lab.bildsignal`)

Misst ein Merkmal entlang einer Achse und gibt es als Steuersignal aus, das andere Operationen modulieren kann.

- **Herkunft:** neu im Lab; Datei alpha/lab/operationen/bildsignal.js; Prinzip nach TouchDesigner TOP to CHOP; Max/Jitter (Matrix zu Zahlen)
- **Voraussetzungen:** keine (läuft auch in Node)
- **Ressourcen:** ein Durchgang über die Pixel; Speicher: gering
- **Reproduzierbar:** ja

| Parameter | Bereich |
|---|---|
| Achse (`achse`) | **waagrecht (links → rechts)** / senkrecht (oben → unten) / radial (Mitte → Rand) |
| Merkmal (`merkmal`) | **Helligkeit** / Sättigung / Kantenstärke |
| Proben (`proben`) | 8 … 256, Standard 48 |
| auf 0–1 strecken (`normieren`) | ein/aus, Standard ein |

## Differenz (`lab.differenz`)

Zeigt die Unterschiede zwischen zwei Zuständen und misst sie. Messung, keine Bewertung.

- **Herkunft:** neu im Lab; Datei alpha/lab/operationen/differenz.js; Prinzip nach Difference-Komposition (Fusion Merge, After Effects, Resolume)
- **Voraussetzungen:** keine (läuft auch in Node)
- **Ressourcen:** ein Durchgang über die Pixel; Speicher: ein Bild
- **Reproduzierbar:** ja

| Parameter | Bereich |
|---|---|
| Verstärkung der Anzeige (`verstaerkung`) | 1 … 8, Standard 2 |
| Schwelle für «verändert» (0–1) (`schwelle`) | 0.02 … 0.5, Standard 0.1 |
