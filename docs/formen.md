# ORNAMENT FORMEN – Hintergrund, Formen, Ideen

Arbeitsdokument zu `alpha/formen/` (seit 26. November 2026). Entstanden in einem Chat mit Claude am
26. November 2026. Was Christian gesagt oder entschieden hat, steht als Zitat; der Rest sind Vorschläge von Claude.

## Verlauf und Entscheide

- Ausgangspunkt: das Repository [facebookresearch/sam-3d-objects](https://github.com/facebookresearch/sam-3d-objects)
  (siehe unten). Christian: «Das heisst ich kann das gar nicht nutzen?» – nach dem Hinweis auf 32 GB Grafikspeicher.
  Entscheid: «Wir behalten das mal für später».
- Frage: «Wie kann ich am einfachsten 3d bilder und animationen erstellen? Ganz allgemein». Von fünf Wegen
  (KI-Video, Bild → 3D, Handy-Scan, selbst modellieren, generativ mit Code) wählte Christian **«5»**: generativ mit Code.
- Erste Skizze **Ornamentkörper** (Ringe um einen Kern, Startwert, Regler, Rezept). Christian: «Das ist cool.»
- Frage: «Welche Formen sind möglich?» → Übersicht nach Ordnung, Element, Verfahren (unten). Christian:
  «Ja, bau den Formenkatalog». Danach: «wow, das sieht sehr gut aus.»
- Ort: «ich möchte damit im ornament-cloud repo arbeiten, nicht im /wissen». Die Fassungen aus dem Wissen-Repo
  (mit CDN) sind dort entfernt, ebenso die SAM-3D-Notiz («SAM-3D auch raus»). Ins Wiki kommt das Material
  später über `tools/ornament_holen.py`.
- Umsetzung hier: three.js aus `vendor/three-0.185.1`, Schriften der Website, Gestaltung wie ORNAMENT LAB,
  nur per Direktlink.

## SAM 3D Objects (Meta, für später)

- Repository: <https://github.com/facebookresearch/sam-3d-objects>, Stand Commit `f91db41` vom 2. Juni 2026.
  Paper: *SAM 3D: 3Dfy Anything in Images* (arXiv 2511.16624). Schwesterprojekt: SAM 3D Body (Menschen).
- Was es tut: aus einem einzelnen Bild und einer Maske ein Objekt mit Geometrie, Textur und Lage im Raum
  rekonstruieren, auch bei Verdeckung und Unordnung; mehrere Objekte einer Szene möglich. Ausgabe u. a. als
  Gaussian Splat (`.ply`).
- Voraussetzungen: Linux, NVIDIA-GPU mit mindestens 32 GB Grafikspeicher, Gewichte auf Hugging Face nach
  Zugangsanfrage. Kein Mac, kein gewöhnlicher Laptop, nicht im Browser.
- Wege, es trotzdem zu nutzen: Web-Demo von Meta
  (<https://www.aidemos.meta.com/segment-anything/editor/convert-image-to-3d>), gemietete Cloud-GPU
  (A100/H100, grob 1–3 USD pro Stunde), eventuell gehostete Dienste (Roboflow, nicht geprüft).
- Lizenz: SAM License (Meta, 19. November 2025): Nutzung, Bearbeitung und Weitergabe erlaubt; ausgeschlossen
  sind militärische, nukleare, Spionage- und Waffenanwendungen sowie sanktionierte Länder.
- Bezug zu FORMEN: ein fotografiertes Fundstück als 3D-Modell, das zum Baustein eines Ornaments wird.

## Welche Formen möglich sind

Drei Fragen getrennt: **wie** sich etwas wiederholt (Ordnung), **was** sich wiederholt (Element), **wie** es
entsteht (Verfahren). Jede Kombination ergibt eine Formfamilie.

**Ordnung**
- Rosette: Drehung um einen Punkt (unendlich viele, eine je Zahl n).
- Fries: Wiederholung entlang einer Linie; genau 7 Friesgruppen. Im Raum: Band um Zylinder, Säule, Turm.
- Fläche: Wiederholung in zwei Richtungen; genau 17 Flächengruppen. Im Raum: auf Kugel, Torus, Welle gelegt.
- Körpersymmetrie: Tetraeder, Würfel, Ikosaeder und Verwandte; Kugelornamente, Sterne, Radiolarien.
- Raumgitter: Wiederholung in drei Richtungen; 230 Raumgruppen (Kristall, Gitterwerk, Schaum).
- Quasiperiodisch: geordnet, aber nie exakt wiederholt (Penrose, Girih, Quasikristall). Jeder Ausschnitt kehrt
  irgendwo wieder, das Ganze nie – nahe an «Wiederkehr ohne Rückkehr».
- Ähnlichkeit: Wiederholung mit Massstabswechsel (Spirale, Schnecke, Fraktal).

**Element**
- Linie → Körper: Röhre, Draht, Kordel, Knoten (Torusknoten, Lissajousknoten).
- Fläche: Blatt, Band, Möbiusband, Minimalflächen (Gyroid).
- Volumen: gedrechselte Körper, Blasen; geschlossen, darum druck- und giessbar.
- Punkte: Teilchen, Staub; gut für Licht und Projektion.
- Fremdes Material: Scan eines Fundstücks, Buchstabe, Bildfragment.

**Verfahren**
- Regel und Parameter: in einem Schritt fertig.
- Wachstum: L-Systeme (Ranke, Akanthus), differenzielles Wachstum, Ablagerung, Reaktion–Diffusion. Jeder
  Schritt schliesst an den vorigen an.
- Verflechtung: über und unter (Flechtband, Knoten).
- Feld: Kräfte, Strömung, Ladungen ordnen die Elemente; die Form ist eine Spur.
- Gekoppelte Regeln: Schichten mit eigenen Regeln und Tempi stören einander.

Leicht im Browser: Rosetten, Friese, Körpersymmetrien, Kurven und Röhren, Teilchen, L-Systeme. Mehr Arbeit:
saubere Verflechtungen, Minimalflächen, alles, was als geschlossener Körper druckbar sein muss.

## Was im Katalog steht (0.1)

16 Familien, je mit Startwert: Rosette, Fries, Fläche, Körper, Raumgitter, Quasiperiodisch, Ähnlichkeit ·
Linie, Band, Volumen, Punkte · Wachstum, Reaktion–Diffusion, Verflechtung, Feld, Gekoppelte Tempi.

**Gekoppelte Tempi:** vier Ringe mit Markierung. Mit «Gemeinsame Uhr» laufen sie 1 : 3/2 : 4/3 : 5/4, die
Gesamtfigur kehrt alle 2 min 31 s genau zurück (Grundtempo 0,5 rad/s, kgV der Nenner 12). Ohne laufen sie
1 : φ : √2 : √3; jeder Ring kehrt wieder, die Gesamtfigur nie.

## Ideen (Vorschläge von Claude, noch nicht entschieden)

- **Eigenzeiten als Objekt:** die Gekoppelten Tempi ausbauen – «Wiederkehr ohne Rückkehr, keine gemeinsame Uhr»
  nicht als Beispiel, sondern als Form. Von Claude als stärkste Idee eingeschätzt.
- **Beobachter:** ein Körper, der von vorne Rosette, von der Seite Welle oder Schrift ist.
- **Identität:** der Startwert als Identität des Werks, jede Ausführung (Druck, Guss, Film) eine nichtidentische
  Wiederholung.
- **Edition:** 3D-Druck in Keramik oder Wachs für Messingguss; jedes Stück trägt sein Rezept als Titel.
- **Schmuck:** Anhänger, Broschen.
- **Mit dem Composer:** jeder Ring hört auf eine Spur (Kick → Perlen, Bass → Tiefe), wie das AV Studio.
- **Projektion:** langsam, ohne Wiederholung, für einen Raum wie den Oberen Turm in Kaiserstuhl.
- **Tagesornament:** das Datum als Startwert; jeder Tag hat seine Form.
- **Vermittlung:** wenige grosse Regler für Ateliers, Schulen, Teams; jede Person macht ihr Ornament.
- **Mit ORNA:** eine gezogene Konstellation bestimmt die Regel, wie im Lab.
- **Mit SAM 3D:** Fundstück → 3D → Baustein.

## Offen

- Export: Standbild in hoher Auflösung, Video, 3D-Modell (`.glb`, `.stl`) für Druck oder Blender.
- Varianten nebeneinander und weiterführen, wie im Lab.
- Kombinationen von Familien (z. B. Reaktion–Diffusion auf einem gedrechselten Körper).
- Zoom mit zwei Fingern im Ornamentkörper.
