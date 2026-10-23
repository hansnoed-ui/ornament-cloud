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
| `lab.tonsignal` 0.1.0 | Tonsignal | Kopplungsoperation | Adapter: PHORMA III (Tonanalyse) | Audiosignal → Steuersignal, Ereignisfolge | eine |
| `lab.klang` 0.1.0 | Klangerzeuger | Zeitliche Operation | neu, nach ANS-Synthesizer (Murzin), UPIC (Xenakis): Bild als Partitur; Oszillator und Hüllkurve der Modularsynthese | Bild (opt.) + Steuersignal (opt.) + Konstellation (opt.) → Audiosignal, Ereignisfolge | über Modulation |
| `lab.differenz` 0.1.0 | Differenz | Beobachtungsoperation | neu, nach Difference-Komposition (Fusion Merge, After Effects, Resolume) | Bild + Bild → Bild | eine |
| `lab.profil` 0.1.0 | Kompositorisches Profil | Beobachtungsoperation | neu, nach Kategorien von ShotDeck, FilmGrab und Flim (Bildausschnitt, Licht, Farbe, Symmetrie) als Messgrössen; Strukturtensor (Bildanalyse) | Bild → Befund | eine |
| `lab.komposition` 0.1.0 | Komposition verändern | Räumliche Operation | neu, nach Attenuverter (VCV Rack) auf gemessene Bildkomponenten übertragen; Kategorien von ShotDeck, FilmGrab und Flim | Bild + Befund (opt.) → Bild | über Modulation |

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

## Tonsignal (`lab.tonsignal`)

Misst ein Merkmal einer Tondatei über die Zeit und gibt es als Steuersignal aus, dazu die Einsätze als Ereignisfolge.

- **Herkunft:** Adapter, PHORMA III (Tonanalyse); Datei alpha/phorma-iii/ton.js (v=23, unverändert), alpha/lab/operationen/tonsignal.js; Prinzip nach Hüllkurvenfolger (Modularsynthese); TouchDesigner Audio Spectrum CHOP; Pure Data env~ und bonk~
- **Voraussetzungen:** Web Audio (decodeAudioData) zum Lesen der Datei; die Analyse selbst läuft auch in Node
- **Ressourcen:** ein Durchgang über die Abtastwerte, mit Spektrum eine FFT (2048) je Filmbild; Speicher: der Klang einkanalig als Gleitkommazahlen
- **Reproduzierbar:** ja

| Parameter | Bereich |
|---|---|
| Merkmal (`merkmal`) | **Hüllkurve (Lautstärke)** / Band tief (unter 200 Hz) / Band Mitte (200 Hz – 3 kHz) / Band hoch (über 3 kHz) / spektraler Schwerpunkt (hell oder dunkel) / spektraler Fluss (wie stark es einsetzt) / Einsätze (Hüllkurve je Anschlag) |
| Ausschnitt ab (s) (`beginn`) | 0 … 600, Standard 0 |
| Ausschnitt Länge (s, 0 = bis zum Ende) (`laenge`) | 0 … 600, Standard 0 |
| Proben (Mittelung über gleich lange Abschnitte) (`proben`) | 8 … 1024, Standard 120 |
| auf 0–1 strecken (`normieren`) | ein/aus, Standard ein |

## Klangerzeuger (`lab.klang`)

Erzeugt Klang ohne Tondatei: liest ein Bild wie eine Partitur, macht ein Steuersignal oder den Text einer Konstellation hörbar oder zieht eine Tonfolge aus dem Startwert.

- **Herkunft:** neu im Lab; Datei alpha/lab/operationen/klang.js, alpha/lab/kern/klang.js; Prinzip nach ANS-Synthesizer (Murzin), UPIC (Xenakis): Bild als Partitur; Oszillator und Hüllkurve der Modularsynthese
- **Voraussetzungen:** keine (reines JavaScript); zum Anhören ein Browser mit <audio>
- **Ressourcen:** Bild: Bänder × Abtastwerte (24 Bänder, 8 s: etwa 8 Millionen Schritte); sonst je Ton einige tausend; Speicher: der Klang einkanalig, 44,1 kHz, höchstens 30 s
- **Reproduzierbar:** ja

| Parameter | Bereich |
|---|---|
| Quelle (`quelle`) | **aus dem Eingang (Bild, sonst Signal, sonst Konstellation, sonst Startwert)** / Bild lesen (Spalten nacheinander) / Steuersignal als Tonhöhe / Text der Konstellation, Wort für Wort / Tonfolge aus dem Startwert |
| Dauer (s) (`dauer`) | 1 … 30, Standard 8 |
| Grundton (Hz) (`grundton`) | 40 … 880, Standard 110 |
| Umfang (Oktaven) (`umfang`) | 1 … 6, Standard 4 |
| Stimmung (`stimmung`) | **pentatonisch (5 Stufen je Oktave)** / chromatisch (12 Halbtöne) / Obertonreihe über dem Grundton / gleitend (stufenlos) |
| Klangfarbe (`klangfarbe`) | **Sinus** / hell (vier Teiltöne 1, 1/2, 1/3, 1/4) / FM, harmonisch (Verhältnis 2:1) / FM, glockenartig (Verhältnis 1,4:1) |
| Dichte (Töne je s; Startwert und Signal) (`dichte`) | 0.5 … 16, Standard 3 |
| Bänder (Zeilen des Bildes) (`baender`) | 4 … 64, Standard 24 |
| Anschlag (s) (`anschlag`) | 0.002 … 0.5, Standard 0.01 |
| Abklingen (s) (`abklingen`) | 0.05 … 4, Standard 0.6 |
| Nachhall (`nachhall`) | 0 … 0.9, Standard 0.3 |

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

## Kompositorisches Profil (`lab.profil`)

Misst, wie ein Bild gebaut ist: Schwerpunkt und Ausschnitt, Symmetrie, Lichtgefälle, Mitte und Rand, Kontrast, Sättigung, Farbton und Kantenrichtung. Messung, keine Bewertung.

- **Herkunft:** neu im Lab; Datei alpha/lab/operationen/komposition.js; Prinzip nach Kategorien von ShotDeck, FilmGrab und Flim (Bildausschnitt, Licht, Farbe, Symmetrie) als Messgrössen; Strukturtensor (Bildanalyse)
- **Voraussetzungen:** keine (läuft auch in Node)
- **Ressourcen:** einige Durchgänge über höchstens 512 × 512 Messpunkte; Speicher: ein Gleitkommabild
- **Reproduzierbar:** ja

| Parameter | Bereich |
|---|---|

## Komposition verändern (`lab.komposition`)

Verstärkt, hebt auf oder kehrt um, was das Profil misst: Lage des Schwerpunkts, Nähe, Symmetrie, Lichtgefälle, Mitte und Rand, Binnenkontrast, Sättigung. Mit einem Zielprofil gleicht sie das Bild einem anderen an. Profil vorher und nachher stehen im Protokoll.

- **Herkunft:** neu im Lab; Datei alpha/lab/operationen/komposition.js; Prinzip nach Attenuverter (VCV Rack) auf gemessene Bildkomponenten übertragen; Kategorien von ShotDeck, FilmGrab und Flim
- **Voraussetzungen:** keine (läuft auch in Node)
- **Ressourcen:** sechs Schritte mit je einer Messung (1200 px: unter 1 s); Speicher: zwei Gleitkommabilder
- **Reproduzierbar:** ja
- **Eigener Verlauf** (Bildfolge für Animation): ja

| Parameter | Bereich |
|---|---|
| Ausschnitt: Versatz des Schwerpunkts (`ausschnitt`) | -1 … 2, Standard 1 – Lage des Gewichts gegenüber der Bildmitte, 0 rückt es in die Mitte. 1 lässt stehen, 0 hebt auf, −1 kehrt um, 2 verdoppelt |
| Nähe (Zoom um den Schwerpunkt) (`naehe`) | 0.5 … 3, Standard 1 – über 1 näher heran, unter 1 weiter weg |
| Rand beim Verschieben (`rand`) | **wiederholen (im Kreis, aller Inhalt bleibt)** / spiegeln / dunkler Grund |
| Asymmetrie (`symmetrie`) | -1 … 2, Standard 1 – der asymmetrische Teil zur gewählten Achse, 0 macht spiegelgleich, −1 spiegelt. 1 lässt stehen, 0 hebt auf, −1 kehrt um, 2 verdoppelt |
| Spiegelachse (`achse`) | **links–rechts** / oben–unten |
| Lichtgefälle (`licht`) | -1 … 2, Standard 1 – die Zunahme der Helligkeit quer über das Bild, −1 lässt das Licht von der anderen Seite kommen. 1 lässt stehen, 0 hebt auf, −1 kehrt um, 2 verdoppelt |
| Mitte/Rand (`mitte`) | -1 … 2, Standard 1 – der Unterschied zwischen heller oder dunkler Mitte und Rand. 1 lässt stehen, 0 hebt auf, −1 kehrt um, 2 verdoppelt |
| Binnenkontrast (`kontrast`) | -1 … 2, Standard 1 – die Tonwerte ohne Mittel und Lichtverteilung, −1 kehrt sie um. 1 lässt stehen, 0 hebt auf, −1 kehrt um, 2 verdoppelt |
| Sättigung (`saettigung`) | -1 … 2, Standard 1 – die Farbabweichung vom Grau, −1 ergibt Gegenfarben. 1 lässt stehen, 0 hebt auf, −1 kehrt um, 2 verdoppelt |
| Angleichung an das Zielprofil (`angleichung`) | 0 … 1, Standard 1 – nur mit Zielprofil: 0 gelten die Faktoren, 1 gilt das Ziel |
| Rechengrösse (längste Seite, px) (`seite`) | 256 … 2048, Standard 1200 – begrenzt Rechenzeit und Speicher |
