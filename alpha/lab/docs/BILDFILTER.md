# Bildfilter

Masterprompt §6 und §18 (Filter als kombinierbare, parametrisierte Operationen). Stand: 23. Oktober 2026, Lab 0.1.10, Projektformat 0.7.0 (unverändert).

Sechs neue Operationen verändern ein Bild. Sie sind keine abgeschlossenen Effekte, sondern Operationen wie Feedback oder Farbe: Sie stehen im Register, beschreiben ihre Herkunft und Parameter und lassen sich verketten, über Varianten oder die Zeit modulieren und als Kette auf anderes Material anwenden. Artefakte gehören zum Verfahren. Treppen, Brüche, Farbsäume und Fugen werden nicht geglättet.

| Kennung | Name | Verfahren | Zufall | Modulation (Standard) |
|---|---|---|---|---|
| `lab.glitch` | Glitch | Blöcke zeigen Inhalt von anderer Stelle, Zeilenbänder verrutschen, Rot und Blau trennen sich | ja (Startwert) | Kanalversatz |
| `lab.pixelsortierung` | Pixelsortierung | Abschnitte zwischen zwei Schwellen werden nach Helligkeit, Farbton, Sättigung, Rot oder Blau sortiert | Abschnittslänge | untere Schwelle |
| `lab.verzerrung` | Optische Verzerrung | Wirbel, Linse, Welle, Kaleidoskop, Versetzen nach Helligkeit (eigenes oder zweites Bild) | nein | Stärke |
| `lab.licht` | Licht: Glühen und Streifen | Auszug über der Schwelle, Unschärfe rund oder als Lichtfahnen, addiert oder aufgehellt | nein | Schwelle |
| `lab.raster` | Raster und Linien | Punkte, Linien, Kreuzschraffur, Wellenlinien, Mosaik im gedrehten Raster | nein | Rasterweite |
| `lab.neusetzen` | Zerlegen und neu setzen | Kacheln oder Streifen neu geordnet: Zufall, Helligkeit, umgekehrt; kippen, verrutschen, Fugen | ja (Startwert) | beteiligte Teile |

Die vollständigen Parameter stehen im Operationsverzeichnis ([OPERATIONEN.md](OPERATIONEN.md)).

## Gemeinsames Verhalten

Alle sechs teilen eine Hülle (`operationen/bildfilter.js`):

- **Anteil (Dry/Wet):** Wie bei einem Effektgerät im Rack (Reason, Bitwig) mischt der Anteil Eingang und Filter: 0 ist der Eingang, 1 der volle Filter. Der Anteil ist modulierbar. Über die Varianten ergibt er eine Reihe vom unveränderten zum ganz gefilterten Bild.
- **Verlauf:** Jeder Filter hat eine eigene Bildfolge, deshalb stehen bei ihm «über die Zeit» und «beides» zur Wahl, und «Animation des letzten Schritts» rechnet eine Bewegung. Die Länge stellt «Bilder im Verlauf» ein (2 bis 120, Standard 36). Ohne Zeitmodulation wächst der Anteil weich vom Eingang bis zum Ergebnis. Mit Zeitmodulation folgen die Parameter der Route, und der Anteil bleibt, wie er eingestellt ist. Das letzte Bild ist immer das Ergebnis. Der Verlauf rechnet höchstens 900 px.
- **Flackern:** Bei Glitch, Pixelsortierung und Neu setzen würfelt der Schalter «im Verlauf neu würfeln» jedes Bild mit einem eigenen Startwert. Bild k bekommt `seed + (n − 1 − k)`, so trägt das letzte Bild den protokollierten Startwert und gleicht dem Ergebnis.
- **Startwert:** Jede Variante bekommt wie bisher `seed + i`, alles ist damit wiederholbar. Das Protokoll hält fest, was gewürfelt wurde: versetzte Blöcke und Bänder, sortierte Abschnitte und die Zuordnung der Teile.
- **Rechengrösse:** «Rechengrösse» (256 bis 2048 px, Standard 1200) begrenzt das Arbeitsbild. Am Telefon lässt sie sich kleiner stellen.

## Die Verfahren und ihre Herkunft

Übernommen sind nur dokumentierte Prinzipien, kein Code. Der Stand ist «Hypothese» im Sinn der REFERENZ-MATRIX: aus Beschreibungen und eigener Praxis, nicht am Quellcode geprüft.

- **Glitch:** Databending und Datamoshing (Rosa Menkman, *The Glitch Moment(um)*, 2011), dazu der RGB-Split von Resolume («Shift RGB») und After Effects («Channel Offset»). Die Reihenfolge ist fest: Blöcke, dann Zeilen, dann Kanäle. Abgetastet wird ohne Glättung.
- **Pixelsortierung:** Kim Asendorf, ASDFPixelSort (Processing, 2010). Nur die Abschnitte zwischen den Schwellen werden sortiert. «ausserhalb» kehrt die Auswahl um. Die Sortierung ist stabil und läuft in linearer Zeit: kurze Abschnitte durch Einfügen, lange durch Zählen in 256 Fächern.
- **Verzerrung:** die Verzerrungsfilter der Bildbearbeitung (Strudel, Wölben, Wellen, Versetzen in Photoshop und GIMP), das Displace TOP in TouchDesigner und das Kaleidoskop. Jede Art bildet das Zielpixel auf eine Stelle der Quelle ab und tastet dort bilinear ab. «Versetzen» nimmt ohne zweites Bild das eigene. Mit einem gewählten Bild unter «Versetzen durch Bild» steuert dieses die Verschiebung, ähnlich wie Bildsignal eine Operation steuert, nur hier Pixel für Pixel.
- **Licht:** der Bloom der Echtzeitgrafik (TouchDesigner Bloom TOP, Post-Processing in Unity und Unreal), der Glow in Fusion und After Effects und die anamorphotischen Lichtfahnen des Kinos. Die Unschärfe besteht aus drei laufenden Kastenfiltern je Richtung. Ihre Rechenzeit hängt nicht vom Radius ab.
- **Raster:** die amplitudenmodulierte Rasterung des Drucks, Kupferstich und Schraffur und das Grundprinzip von Processing und p5.js: das Bild abtasten und an jeder Stelle eine Form zeichnen. Die Wellenlinien folgen den gestapelten Profilen von *Unknown Pleasures*. Gerechnet wird analytisch je Pixel, mit einem Pixel weicher Kante.
- **Neu setzen:** Cut-up (Brion Gysin, William S. Burroughs), Collage und Montage, die Kachelfilter von GIMP. Anders als The Fictory, die nach Bildinhalt segmentiert, teilt diese Operation nach einem gesetzten Raster.

## Rechenzeit

Alle Filter laufen auf der CPU in reinem JavaScript, im Browser wie in den Tests in Node, Bild für Bild reproduzierbar. Gemessen am Beispielbild (848 × 1200) in Node auf einem Desktop-Prozessor: Glitch 40–50 ms, Pixelsortierung 50–70 ms, Verzerrung 160–250 ms, Licht 180–380 ms, Raster 100–350 ms, Neu setzen 30–50 ms. Der Browsertest rechnet sechs Varianten am Telefon (384 × 854, Rechenleistung auf ein Viertel gedrosselt, etwa wie ein Samsung S21 FE). Gemessen samt Ablegen als PNG brauchten sechs Varianten Glitch 11 s, Pixelsortierung 6 s und Raster 8 s, also 1 bis 2 s je Bild. Die Zeiten gibt `tests/lab.e2e.mjs` bei jedem Lauf aus. Während eines Verlaufs gibt jeder Filter nach vier Bildern die Seite kurz frei, so bleibt sie bedienbar.

## Offen

- **WebGL-Fassungen** mit denselben Kennungen und Parametern, für eine Vorschau in Echtzeit (ERWEITERUNGEN.md).
- **Datamosh über die Zeit:** Bewegungsdaten eines Bildes auf das nächste übertragen. Dafür braucht es eine Bildfolge als Eingang (Typ ANIMATION oder VIDEO), nicht nur ein Bild.
- **Masken:** einen Filter nur in den Segmenten der Fictory oder nach einem Steuerbild wirken lassen.
- **Pixelsortierung schräg** und mit einem Steuerbild für die Schwellen.

## Linienbilder nach den Plotter-Umwandlern von Makelangelo (Lab 0.1.35)

Stand: 25. Oktober 2026. Christian suchte Effekte, die mit der Bildinformation arbeiten, und schlug [Makelangelo](https://github.com/MarginallyClever/Makelangelo-software) vor, die Software einer Zeichenmaschine (Commit `94ff58e`, 9. Juni 2026). Sie enthält rund zwanzig Umwandler, die ein Bild in Linien für einen Stift übersetzen. Die Software steht unter der **GPL-2.0**. Darum ist kein Code übernommen: Gelesen wurden die Umwandler, um ihr Prinzip zu verstehen (Masterprompt §3), und das Lab setzt die Prinzipien eigenständig um. Wie die Untersuchung lief, steht im [REA-Protokoll](REA-PROTOKOLL.md), Fall 4.

Der wichtigste Unterschied: Makelangelo erzeugt Pfade für einen Stift, Schritt um Schritt. Das Lab rechnet jede Stelle für sich (Abstand zur Linie, ein Pixel weich). Nur so läuft dieselbe Rechnung als Shader auf der Grafikkarte und damit lebendig in jedem Bild des Films (`medien/gpu.js`). Alle fünf stehen deshalb auch in der Zusammenstellung durch jev.

| Kennung | Name | Prinzip (Vorbild in Makelangelo) | lebendig im Film | Modulation (Standard) |
|---|---|---|---|---|
| `lab.puls` | Pulslinien | Eine Trägerlinie (parallel, Spirale, Kreise) schwingt im Dunkeln. Der Ton regelt Hub und Frequenz zugleich, die Phase ist das Integral der Frequenz entlang der Linie. «Schwelle» setzt in vier Stufen ab, statt zu schwingen (Pulse, Spiral Pulse, Sandy, Spiral) | die Schwingungen wandern entlang der Linien | Hub |
| `lab.schraffur` | Schraffur in Lagen | Das Dunkel wird in Stufen geteilt, jede Stufe bekommt eine Lage paralleler Linien in eigenem Winkel; Linien schwellen an, die Hand zittert (Crosshatch, Multipass) | die Lagen wandern quer | Schwelle |
| `lab.fluss` | Fliessfeld | Striche folgen einem Feld: entlang der Kanten, quer dazu, Rauschen oder Wirbel, gerechnet als Faltung entlang der Feldlinien (Flow Field; Cabral und Leedom 1993) | eine Welle läuft entlang der Striche, das Rauschen wandelt sich | Strichlänge |
| `lab.punktieren` | Punktieren | Der Ton wird zur Dichte gewürfelter Punkte; aus denselben Punkten Voronoi-Zellen oder ein Mosaik in Bildfarben (Voronoi Stippling, Voronoi) | die Punkte schimmern um ihre Plätze | Punktgrösse |
| `lab.teilung` | Teilung | Quadtree: geviertelt, solange ein Feld dunkel genug ist (oder seine Viertel verschieden genug), mit jeder Tiefe strenger; gefüllt als Mosaik, Rahmen, Truchet-Bögen oder wachsende Quadrate (QuadTree, Truchet from Image, Boxxy) | Truchet-Kacheln drehen sich einzeln, die Teilung atmet mit dem Klang | Schwelle |

Gemeinsam (`operationen/linienbild.js`): der Ton als geglättetes Feld (der Stift mittelt eine kleine Fläche; die Grafikkarte nimmt dafür eine gröbere Stufe der Textur), «Gewicht der Tonwerte», «Licht statt Dunkel zeichnen», die Farben wie beim Raster (Tinte auf Papier, Bildfarben auf Papier oder auf Nacht) und «Lauf im Film». Der Lauf wirkt nur im Film; im Projekt, auf der CPU, steht die Zeichnung still.

Was anders ist als im Vorbild:

- **Pulslinien:** Makelangelo schreitet die Linie ab und zählt die Phase hoch. Das Lab legt je Linie eine Tabelle der Phase an (CPU) oder summiert 48 feste Stützstellen (Grafikkarte). Kreise und Windungen der Spirale schliessen mit einer ganzen Zahl von Schwingungen, darum gibt es keine Naht. In der Mitte der Spirale wird der Hub kleiner, weil die Windungen dort zu eng sind.
- **Punktieren:** Makelangelo verteilt die Punkte mit gewichteter Voronoi-Relaxation über viele Durchgänge (Secord 2002). Das Lab würfelt einen Punkt je Zelle und behält ihn mit der Wahrscheinlichkeit des Tons. Das ist kein Gleichgewicht, aber es läuft in jedem Filmbild neu.
- **Teilung:** Gemessen wird über Summentabellen, exakt und unabhängig von der Tiefe. «Kontrast» fragt, wie verschieden die vier Viertel eines Feldes sind. Die Truchet-Richtung wählt der Ton gegen eine gewürfelte Schwelle, nicht gegen eine feste (sonst hätte ein dunkles Bild nur eine Richtung). Mehrere Bögen je Kachel treffen sich auf der Diagonalen, weil gleiche Radien um gegenüberliegende Ecken sich dort schneiden.

In der Zusammenstellung (jev wählt mit) stehen acht neue Bildeffekte: `bild.puls`, `bild.spirale`, `bild.schraffur`, `bild.fluss`, `bild.punktieren`, `bild.glasfenster` (Mosaik), `bild.teilung` und `bild.truchet`. Die Zwischenstelle `jev/wahl.php` kennt denselben Wortlaut.

Rechenzeit am Beispielbild (509 × 720, Node, Desktop): Pulslinien 120–190 ms, Schraffur 160 ms, Fliessfeld 300 ms, Punktieren 220 ms, Teilung 230–340 ms. Auf der Grafikkarte (SwiftShader, also ohne echte Grafikkarte, 540 × 960) 60–700 ms je Bild, am längsten das Fliessfeld. Eine echte Grafikkarte ist um ein Vielfaches schneller.

Nicht umgesetzt: die Linie durch alle Punkte (Voronoi Zig Zag, ein Problem des Handlungsreisenden, braucht viele Durchgänge), die CMYK-Fassungen (der Rasterdruck von PHORMA II deckt sie ab), Boxxy und Hexxy als eigene Formen des Rasters, Intensity to Height (die Wellenlinien des Rasters ohne Verdeckung) und Moiré.
