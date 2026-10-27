# Vorschlag für 30 Sekunden aus Bild und Klang (Lab 0.1.11, Zusammenstellung seit 0.1.12, Video seit 0.1.14, Bewegung seit 0.1.15, 60 Motive seit 0.1.16, lebendige Effekte seit 0.1.17)

Christian wollte ein Bild und eine MP3 hochladen und von jev einen Vorschlag für eine Animation von 30 Sekunden bekommen. Der Bereich «Animation aus Bild und Klang (30 s)» steht unter **Material**, sobald das Projekt ein Bild und einen Ton hat.

## Ablauf

1. **Bild und Ton wählen** (MP3, WAV, OGG, FLAC, M4A …), dazu wo der Ton beginnen soll. Beides bleibt auf dem Gerät.
2. **Vorschlag machen:** Das Lab misst. *Tonsignal* (Hüllkurve, ab der gewählten Sekunde, höchstens 30 s, nicht gestreckt) und *Kompositorisches Profil* laufen als gewöhnliche Schritte und stehen im Protokoll. `merkmaleMessen()` übersetzt die Messwerte in feste Stufen:

   | Merkmal | Stufen | gemessen aus |
   |---|---|---|
   | Kontrast | niedrig, mittel, hoch | `kontrast.gesamt` < 0,14, > 0,26 |
   | Farbigkeit | grau, gedämpft, bunt | `farbe.saettigung` < 0,06, > 0,2 |
   | Symmetrie | symmetrisch, asymmetrisch | grössere der beiden Symmetrien ≥ 0,8 |
   | Helligkeit | dunkel, mittel, hell | `licht.helligkeit` < 0,35, > 0,65 |
   | Dichte | ruhig, bewegt, dicht | Anschläge ab Stärke 0,2 je Sekunde < 0,5, > 2 |
   | Dynamik | gleichmässig, anschwellend, abschwellend, wechselhaft | letztes gegen erstes Drittel der Hüllkurve (±0,15), sonst Streuung > 0,22 |

3. **jev oder Regeln:** Ist jev live bereit, fragt das Lab die Zwischenstelle `jev/wahl.php` mit `{ frage: "dramaturgie", merkmale, optionen }`. jev sieht nur diese Stufen und die sechs Beschreibungen, nie Bild oder Klang. Die Frage hat einen festen Wortlaut (`FRAGE_DRAMATURGIE` in `jev/fragen.js`, gleich in `wahl.php`). Ohne jev, oder wenn jev nicht antwortet, ordnen feste Regeln (`regelDramaturgie()`) die Dramaturgien, mit Gründen. Die Liste sagt, woher sie kommt.
4. **Wählen und rechnen:** Vorgewählt ist die erste. Der Mensch kann jede andere wählen. «Animation rechnen» führt das Rezept aus und rechnet den Film über Stationen mit dem Ton als Tonspur. Danach steht der Film auch unter **Nacheinander** und lässt sich dort wie jeder andere verändern.

## Zusammenstellung durch jev (seit Lab 0.1.12)

Christian wollte, dass jev viele verschiedene Bild- und Klangeffekte selbst zusammenstellt. Nach «Vorschlag machen» stellt jev in **einem** Aufruf zehn feste CHOICE-Fragen (`KOMPOSITION_FRAGEN` in `jev/fragen.js`, gleich in `wahl.php`), jede mit festem Katalog:

| Frage | Katalog |
|---|---|
| `aufbau` | Kette (jeder Abschnitt auf dem vorigen) oder Fächer (jeder auf dem Ausgangsbild) |
| `uebergang` | Schnitt, Überblendung, Schwelle |
| `klang1`, `klang2` | keine, schneller, langsamer, tiefer, zerlegt, neu rhythmisiert, Körner |
| `bild1` … `bild6` | Feedback, Wiederholung, Farbe, Glitch, Verzerrung, Licht, Raster (seit Lab 0.1.20 nur diese sieben lebendigen; bis 0.1.19 auch Komposition, Pixelsortierung, Neu setzen und Zerfall); seit 0.1.21 dazu die PHORMA-Szenen Gewebe, Irrfahrt, Lichtwürfel, Traube (seit 0.1.35 nur noch das Gewebe); seit 0.1.22 PHORMA II (Physarum, Tiefe, Wellenwanne, Tuch, Rasterdruck, Montage), PHORMA I (Fragmente, Strom, Körper, Scherben, Echo, Relief) und der Zerfall (The Fictory, lebendig) |

Aus den Wahrscheinlichkeiten zieht das Lab mit Startwert (`zusammenstellen()` in `kern/zusammenstellung.js`): kein Bildeffekt zweimal hintereinander, der zweite Klangeffekt nicht derselbe wie der erste. «neu ziehen» zieht mit neuem Startwert aus denselben Antworten, ohne jev erneut zu fragen. Jede Stelle lässt sich von Hand ändern, dann ist die Zusammenstellung eine Entscheidung des **Menschen** (`details.geaendert`, `details.vorschlag`). Ohne jev wird gleichverteilt gezogen (**Zufall**).

«Zusammenstellung rechnen» (`zusammenstellungRechnen()`):

1. die zwei Klangeffekte nacheinander auf den Ton (Tempo, Zerlegen, Neu-Rhythmisierung, Körner)
2. *Tonsignal* misst den neuen Klang: Hüllkurve für die Modulation, Anschläge für den Takt; ein bearbeiteter Klang beginnt am Anfang
3. sechs Abschnitte zu je zehn Varianten (seit Lab 0.1.16, vorher drei), die Lautstärke verteilt den Hauptparameter jedes Effekts über die Varianten
4. Film über 61 Stationen (Bild und 60 Motive) mit dem neuen Klang als Tonspur, im Takt der stärksten Anschläge (jede Station einmal, höchstens zwei Wechsel je Sekunde, beim Schnitt 2,5) oder gleichmässig, wenn die Anschläge nicht für alle Motive reichen; mit Zettel oder ORNA-Konstellation (seit Lab 0.1.18, unten) dazu eine Karte vorn oder hinten

Kosten: ein Aufruf mit etwa 4000 Eingabe-Token, also etwa 0,02 Cent; gleiche Stufen kommen 30 Tage aus dem Zwischenspeicher. Am Desktop dauert das Rechnen etwa 50 s, am Telefon länger.

Im Projekt: Entscheidung `gegenstand: "zusammenstellung"` mit `gewaehlt: { aufbau, uebergang, klang, bild, zettel, orna, abschnitte }` (die beiden Bestände null, `"ziehen"` oder die gewählte Nummer bzw. Kennung; `abschnitte` seit 0.1.28, unten), Startwert, Antworten von jev, Merkmalen; jeder Schritt verweist mit `details.entscheidung` darauf; der Film unter `exporte` mit `dramaturgie: "zusammenstellung"`.

## Video als Eingang (seit Lab 0.1.14)

«Video wählen» unter Material (oder ein Video hineinziehen) liest MP4, WebM oder MOV, soweit der Browser es abspielen kann (H.264 und VP8/VP9 fast überall, HEVC je nach Gerät), höchstens 300 MB:

- **sechs Standbilder** gleichmässig über die Länge, in Arbeitsgrösse, als IMAGE-Material mit `herkunft.video` (Name, Prüfsumme, Länge, Zeitpunkt)
- **die Tonspur**, höchstens die ersten 120 s, als AUDIO-Material (WAV, 24 Bit, Abtastrate der Datei); ein Video ohne lesbaren Ton gibt nur Bilder

Die Tonspur liest zuerst Web Audio (`decodeAudioData`). Seit Lab 0.1.20 gibt es einen zweiten Leseweg (`medien/mp4ton.js`): Chrome für Android liest mit Web Audio keinen AAC-Ton, und der Ton eines Handyvideos ist fast immer AAC; Christian sah darum am 24. Oktober 2026 auf dem Handy den Vorschlag für ein Video nicht (ohne Ton im Projekt erscheint der Bereich nicht). Das Modul liest die Kästen der MP4-, MOV- oder M4A-Datei selbst (moov → trak «soun» → stbl), holt die kodierten Stücke und dekodiert sie mit WebCodecs (`AudioDecoder`, der Dekoder des Geräts): AAC, MP3 in MP4 und Opus; fragmentierte und verschlüsselte Dateien nicht. Dasselbe gilt für Tondateien (M4A). Bleibt die Tonspur unlesbar, steht der Grund bei den Standbildern (`herkunft.video.tonFehler`) und im Bereich «Animation aus Bild und Klang» mit der Bitte, den Ton als MP3 oder WAV dazuzuladen; die Tonspur trägt `herkunft.leseweg` («webaudio» oder «webcodecs»).

Das Video selbst kommt nicht ins Projekt, nur was daraus gelesen wurde. Im Vorschlag stehen danach das erste Standbild und die Tonspur vor. Bei der **Zusammenstellung** nimmt jeder Abschnitt das Standbild seiner Zeit (Abschnitt 1 und 2 das erste, 3 und 4 das zweite …, bei sechs Standbildern je eines), so folgt der Film dem Video; der Aufbau gilt dann nicht. Die Entscheidung trägt `details.video` mit den Standbildern. Die festen Dramaturgien nehmen das gewählte Standbild.

## Bewegung (seit Lab 0.1.15)

Vorher stand jede Station still, bis die nächste kam: ein Film von 900 Bildern zeigte so nur etwa zwei Dutzend Veränderungen. Jetzt führt der Film eine Kamera über jedes Bild (`bewegung` im Plan, siehe docs/STATIONEN.md): Die Zusammenstellung mit voller Stärke, deren Zoom mit der Lautstärke des neuen Klangs atmet, die festen Dramaturgien mit 0,6 und der Lautstärke des gemessenen Klangs. Überblendung und Schwelle der Zusammenstellung dauern zudem bis zum nächsten Anschlag (höchstens 1,2 s bzw. 1,5 s), das Bild verwandelt sich also fortlaufend. Unter «Nacheinander» lässt sich die Bewegung danach ändern oder auf 0 setzen.

## Lebendige Effekte (seit Lab 0.1.17)

Christian am 23. Oktober 2026: PHORMA hat einen flüssigen Film in kurzer Zeit. Dort rechnet die Grafikkarte jedes Bild aus der Zeit. Jetzt tut das Lab dasselbe für sieben Effekte (`medien/gpu.js`, Übersicht in docs/STATIONEN.md): In der Zusammenstellung und bei den Dramaturgien ist `lebendig` gesetzt, jede Station aus Farbe, Glitch, Verzerrung, Raster, Wiederholung, Feedback oder Licht ist in jedem der 900 Bilder ein neues Effektbild, und die Lautstärke moduliert den Hauptparameter Bild für Bild statt nur über die Varianten. Pixelsortierung, Neu setzen, Komposition und Zerfall bleiben Standbilder mit Kamera; seit Lab 0.1.20 sind sie vorerst nicht mehr in der Zusammenstellung (unten, «Nur fliessende Effekte»). Seit Lab 0.1.19 stehen der Schalter «lebendige Effekte» und der Regler «Bewegung» direkt in der Zusammenstellung (unter Zettel und ORNA; Christian: «so platzieren, dass ich sie nicht suchen muss»), vorgewählt an und 1; sie gehen als `plan.lebendig` und `plan.bewegung` in die Rechnung und stehen in der Entscheidung unter `details.film`. Dieselben Schalter stehen danach unter «Nacheinander». Ohne WebGL 2 ist der Schalter grau, der Film läuft dann mit Standbildern und Kamera.

## Zettelkasten und ORNA (seit Lab 0.1.18)

Christian wollte beides in die Zusammenstellung einbinden, **beides wahlweise**. Unter den zehn Stellen stehen zwei Schalter, «Zettel» und «ORNA», vorgewählt aus. jev sieht beide nie: Die Fragen an jev bleiben dieselben zehn, der Zettel und die Konstellation werden mit dem Startwert gezogen oder vom Menschen gewählt (Entscheidungen `gegenstand: "strophe"` und `"konstellation"`, Art **Zufall** oder **Mensch**). Die Texte bleiben wörtlich.

- **Zettel** (`zettel.strophe`, operationen/zettel.js): einer der 49 Zettel aus «Zu seiner Zeit» (die erzeugten Daten des Dritten Rads, alpha/drittes-rad/daten.js), als Befund mit Nummer, Zyklus, Titel, Leitsatz und Text. Er **eröffnet** den Film als Titelkarte: Kopfzeile «Zettelkasten · Zyklus · n / 49», der Titel, der Leitsatz, unten «Zu seiner Zeit».
- **ORNA** (`orna.konstellation`): eine der 326 Konstellationen. Sie **schliesst** den Film als Karte (Nummer, Künstler × Theoretiker, Gedanke, Operationsregel). Bis Lab 0.1.19 gab sie dem **Zerfall** (The Fictory) ihre Regel, und ohne Zerfall in der Zusammenstellung kam er als siebter Abschnitt dazu; seit 0.1.20 vorerst nicht mehr (unten), die Regel steht auf der Karte. Seit 0.1.22 bekommt der Zerfall die Regel wieder, wenn jev ihn als Bildeffekt wählt (`bild.zerfall`), und die Szenen von PHORMA I und II bekommen die Konstellation (Titel, oder bei leerem Ablauf die Regel → Ablauf).
- **Karten** zeichnet `lab.karte` (operationen/karte.js) im Mass des Ausgangsbilds, seit Lab 0.1.33 in der Gestaltung des Neubaus der Website (Instrument Sans, Newsreader kursiv, Weiss auf Schwarz oder Schwarz auf Weiss, die Blaupause als Akzent, Signet und beim Zettel das Feld 7 × 7 mit den Fäden zu den nahen Zetteln; vorher Papier auf Nacht in Systemschriften); sie braucht die Leinwand des Browsers (`verfuegbar()`), in Node fällt sie weg und der Zettel bleibt im Projekt. Jede Karte steht 2,5 s (`KARTE_DAUER`) und `einmal` ausserhalb der Runde im Takt (Partitur 0.4.0, docs/STATIONEN.md): die Runde der Motive beginnt beim ersten Anschlag nach der Zettelkarte, die ORNA-Karte steht bis zum Ende des Tons. Der Film hat dann bis 63 Stationen (Grenze 80; bis 0.1.19 mit dem Zerfall 69).

«neu ziehen» behält die Schalter, ändert aber Zettel und Konstellation mit dem neuen Startwert, wenn sie gezogen werden. Nach dem Rechnen nennt der Status beides. Im Projekt: `gewaehlt.zettel` und `gewaehlt.orna` in der Entscheidung, die Operationen `zettel.strophe`, `orna.konstellation`, zweimal `lab.karte` mit `details.entscheidung`.

## PHORMA-Szenen (seit Lab 0.1.21)

Christian am 24. Oktober 2026: «wieso sind die Effekte bei PHORMA so viel spektakulärer und fliessender?» – und dann «Ja» zum Vorschlag, PHORMAs Szenen ins Lab zu holen, damit jev sie wählen kann, und PHORMA-Videos im Lab re-mixen zu können. `operationen/phorma.js` macht aus den vier Szenen von PHORMA III Operationen (`phorma.gewebe`, `phorma.irrfahrt`, `phorma.lichtwuerfel`, `phorma.traube`; Adapter, PHORMA unverändert, `buehne.js` erst im Browser geladen, three.js über die Importmap in index.html): Eingang `bild` und wahlweise `ton`; Parameter `dauer` (Szene, 6–120 s), `beginn` (Ton ab), `bilder` (Standbilder als Varianten), `guete` (fein/grob), `seite`. `ausfuehren()` baut die Bühne (Bild zugeschnitten, Analyse auf halber Grösse, Tonanalyse von PHORMA ab `beginn`) und rechnet `bilder` Momente gleichmässig über die Szene; `lebend()` gibt dem Film über Stationen die Bühne selbst (docs/STATIONEN.md), so läuft die Szene im Film in jedem Bild weiter, im Takt des Klangs.

In der Zusammenstellung stehen sie als `bild.gewebe`, `bild.irrfahrt`, `bild.lichtwuerfel`, `bild.traube` im Katalog von jev (gleich in `wahl.php`); ihr Rezept gibt zehn Momente als Varianten (`bilder: 10`, `dauer: 30`), den neuen Klang als Eingang `ton` und dessen Beginn als `beginn` (bearbeitet 0, sonst der gemessene). Ohne WebGL 2 ist eine solche Stelle nicht verfügbar; die Rechnung meldet es klar, statt abzustürzen. Im jev-Katalog der nächsten Operation (`KATALOG`) stehen sie ebenfalls. Seit Lab 0.1.35 stehen in der Zusammenstellung nur noch `bild.gewebe` (Christian, 25. Oktober 2026: «Gewebe, Lichtwürfel, Irrfahrt und Traube als Effekte brauchts wohl nicht, weil sie nicht mit dem Bild arbeiten»; das Gewebe wächst aus den Umrissen des Bildes und kehrt zu ihm zurück, darum bleibt es); Irrfahrt, Lichtwürfel und Traube bleiben als Operationen im Register und im `KATALOG`, und der Lichtwürfel des Signatur-Intros ist davon unberührt.

## PHORMA I und II, The Fictory lebendig, die Bestände an die Szenen (seit Lab 0.1.22)

Christian am 24. Oktober 2026, nach dem Merge der PHORMA-III-Szenen: «phorma-ii, phorma-i und the fictory auch berücksichtigen» – und zuvor: «Workflows aus allen Bild- und Video-Apps mit Zettelkasten und ORNA verbinden, visuell und operational».

- **`phorma.ii`** (operationen/phorma2.js): PHORMA II als eine Operation mit dem Parameter `ablauf` – Physarum, Tiefe, Wellenwanne, Tuch, Rasterdruck, Montage einzeln oder als Kette (Alle sechs, Physarum → Tiefe → Tuch, Physarum → Montage, Tiefe → Tuch, Rasterdruck → Montage). `buehne.js` rechnet mit three.js, `film.js` setzt das Bild mit Beschriftung (ohne Signet); `dauer` streckt oder rafft die Kette (numerisches Tempo der App), `guete` grob wie am Telefon.
- **`phorma.i`** (operationen/phorma1.js): PHORMA I (Bildfragmentieren) als eine Operation – Fragmente (Leinwand 2D, geht ohne WebGL), die Verwandlung aus Strom, Körper, Scherben, Echo, Relief (einzeln oder Ketten) und der Relief-Flug (`raum.js`, WebGL 2). `feinheit` und `grund` wie in der App.
- **Zettelkasten, visuell:** beide nehmen am Eingang `text` einen Zettel (METADATA von `zettel.strophe`): sein Titel steht als Beschriftung oben links im Bild (`beschriftung` «auto»: an, sobald ein Zettel oder eine Konstellation am Eingang liegt). Ohne Zettel nennt die Beschriftung Künstler × Theoretiker der Konstellation.
- **ORNA, operational:** am Eingang `konstellation` wählt die Operationsregel R1–R7 den Ablauf, wenn der Mensch keinen wählt (`ablauf` leer). Die Tabellen `REGEL_ABLAUF` stehen offen in beiden Dateien und werden als Entscheidung `gegenstand: "ablauf"` (Art «regel») protokolliert:

| Regel | PHORMA II | PHORMA I |
| --- | --- | --- |
| R1 Keine Rückkehr an dieselbe Stelle | Rasterdruck (kehrt nie ins Foto zurück) | Strom (die Teilchen fliegen einmal an ihren Platz) |
| R2 Verzögerter Spiegel | Wellenwanne | Echo |
| R3 Raster als Regel | Rasterdruck → Montage | Fragmente |
| R4 Nur Unterschiede, die Unterschiede machen | Tiefe | Scherben |
| R5 Fortwirkende Last | Tuch | Relief |
| R6 Die Leerstelle bleibt | Montage | Körper |
| R7 Verflechtung | Physarum | Verwandlung (alle fünf) |

- **The Fictory lebendig** (`fictory.prozess`, `lebend()`): im Film über Stationen läuft der Prozess von Zustand zu Zustand weiter statt als Standbilder zu stehen (docs/STATIONEN.md, Zeit ab dem Auftritt, Lage der Station). Darum ist der **Zerfall** zurück: als Bildeffekt `bild.zerfall` in der Zusammenstellung und als Dramaturgie `vorschlag.zerfall`, mit `verfuegbar()` (braucht die Leinwand).
- **In der Zusammenstellung** stehen die neuen Abläufe als `bild.physarum`, `bild.tiefe`, `bild.welle`, `bild.tuch`, `bild.druck`, `bild.montage`, `bild.fragmente`, `bild.strom`, `bild.koerper`, `bild.scherben`, `bild.echo`, `bild.relief` und `bild.zerfall` im Katalog von jev (gleich in `wahl.php`); die Szenen bekommen als `dauer` die Dauer ihres Abschnitts plus 1 s (seit 0.1.41; vorher `SZENE_DAUER` = 8 s, in einem Abschnitt von 5 s kamen die Fragmente kaum über Linien und Formen hinaus). Die Bestände gehen an alle Operationen, die sie annehmen: die Konstellation an den Zerfall (Regel) und an die Szenen von PHORMA I und II, der Zettel an die Szenen (Titel). jev wählt den Effekt; die Regel wählt den Ablauf nur, wenn der Mensch die Operation von Hand mit leerem Ablauf ausführt.

## Abschnitte ausschalten und ihre Dauer setzen (seit Lab 0.1.28)

Christian am 24. Oktober 2026: «Wenn jev eine Zusammenstellung macht: wie kann ich einzeln Schritte ausschalten und wie ihre Länge verändern.» Bis 0.1.27 ging beides nur nach dem Rechnen unter «Nacheinander», Station für Station. Jetzt steht es in der Zusammenstellung selbst: neben jedem der sechs Abschnitte ein Schalter **an/aus** und die **Dauer** in Sekunden (1 bis 20, in halben Sekunden; Standard 5, zusammen die 30).

- `plan.abschnitte = [{ an, dauer }]` je Stelle von `plan.bild` (`standardAbschnitte()`, `abschnitteNormieren()` in `kern/zusammenstellung.js`). jev wählt weiterhin alle sechs Effekte; was der Mensch schaltet, steht in `details.geaendert` als `abschnitt1` … `abschnitt6`, und die Zusammenstellung ist seine Entscheidung.
- Ein Abschnitt, der **aus** ist, wird nicht gerechnet und nicht geprüft (ein Effekt, der in diesem Browser nicht geht, stört dort nicht). Die Kette läuft über die Abschnitte, die an sind; aus einem Video nimmt jeder Abschnitt weiterhin das Standbild seiner Stelle unter den sechs. Mindestens einer muss an sein.
- Die **Dauer** bestimmt die Varianten des Abschnitts (`variantenFuer()`: zwei je Sekunde wie bisher, höchstens `GRENZEN.varianten` = 12, mindestens eine) und seine Zeit im Film: ohne Takt hält jede seiner Stationen so lange, dass der Abschnitt seine Dauer bekommt (`halten` je Station in der Partitur, Übergänge eingerechnet); im Takt der Anschläge entscheiden die Anschläge, dort hat ein längerer Abschnitt entsprechend mehr Stationen. Die Länge der Animation ist die Summe der Dauern der Abschnitte, die an sind (`haupt`); Tonsignal, PHORMA-Szenen (Filmzeit) und die Signatur rechnen damit, die Szenen von PHORMA I und II laufen etwas länger als ihr Abschnitt.
- Bleibt alles beim Standard, läuft die Zusammenstellung wie bis 0.1.27 (60 Varianten, gleiches Halten für alle). Der Hinweis unter den Stellen rechnet vor: Abschnitte mit Dauer, Sekunden der Animation, Zahl der Varianten.

## Format (seit Lab 0.1.37)

Christian am 25. Oktober 2026: «Wie ist es mit dem Ausgabeformat im Lab. Ich vermute, der Zettel und die Orna Konstellation müssen ins Format passen. Welche Möglichkeiten haben wir?» Bis 0.1.35 nahm der Film immer das Format des Materials (die längste Seite in Rechengrösse); Karten und Signatur zeichnen im Mass des Bildes am Eingang und haben je einen Satz für quer, quadratisch und hoch, passen also immer. Gewählt: das Format soll wählbar sein.

- In den Filmeinstellungen der Zusammenstellung steht **Format**: «wie das Material» (Standard), 9:16 hoch (Reels, Stories), 4:5 hoch (Instagram), 1:1 quadratisch, 16:9 quer (Video); `plan.format`, Kennungen aus `FORMATE` (`operationen/format.js`).
- Mit einem Format passt die Zusammenstellung das Material **zuerst** ein (`lab.format`, Schritt 0, vor den Klangeffekten): das Bild, aus einem Video jedes Standbild. Der Ausschnitt ist mittig, ohne Rand, ohne Skalierung oder Verzerrung, mit geraden Massen (H.264). Alles Weitere rechnet auf dem eingepassten Material: die Abschnitte, die Karten (`lab.karte` im Mass des Bildes), die Signatur (Intro, Outro, Signet im Mass des Bildes) und der Film (er nimmt das Format seiner ersten Station). Die Auflösung bleibt die Rechengrösse des Films (längste Seite, Standard 1280 px): 9:16 aus einem 1280 px breiten Material gibt 720 × 1280.
- Im Projekt: `gewaehlt.format` und `details.film.format` der Entscheidung, die Format-Knoten mit `protokoll.ausschnitt`; `zusammenstellungRechnen()` gibt `format` und `grundbild` (das eingepasste Bild) zurück. Zusammenstellung 0.6.0.
- `lab.format` steht auch für sich im Register (Parameter `format`, `lage` 0–1: der Ausschnitt von links/oben nach rechts/unten, moduliert über Varianten ein Schwenk) und im Katalog von jev für die nächste Operation.
- Nicht gemacht: mehrere Formate aus einer Zusammenstellung auf einmal (etwa beim Export «Für Works»); das wäre der nächste Schritt, falls gewünscht.

## Tonspur fertig gemischt (seit Lab 0.1.45)

Wunsch vom 27. Oktober 2026: «mastering auch in den vorschlag für 30 s einbauen».

- In den Einstellungen der Zusammenstellung steht neben «Signatur» der Schalter **Tonspur fertig mischen** (Standard an, `plan.mastering`). Ältere Pläne ohne den Schalter werden gemischt.
- Die Tonspur geht als letzter Klangschritt durch `lab.mastering` (KLANGTRANSFORMATION.md): nach den Klangeffekten und nach der Tonspur der Signatur, **bevor** das Tonsignal sie misst. So folgen Takt und Kamera dem, was zu hören ist. Ziel −14 LUFS, Kompressor, Limiter auf −1 dBFS.
- Das Mastering ändert die Länge nicht: Ohne Klangeffekt und Signatur wird der ganze Ton gemischt, und der Film beginnt wie bisher bei «Ton ab Sekunde». Die Lautheit ist dann über den ganzen Ton gemessen, nicht nur über die 30 Sekunden des Films.
- Im Projekt: ein Knoten `lab.mastering` mit Lautheit und Spitze im Protokoll, `details.film.mastering` der Entscheidung («−14 LUFS» oder «aus»); `zusammenstellungRechnen()` gibt die gemischte Tonspur als `klang` zurück.

## Fliessend zwischen den Effekten (seit Lab 0.1.39)

Christian am 25. Oktober 2026: «Beim Resultat Video gibt es zwischendurch immer wieder kurze schwarze Bilder oder das Ausgangsbild wird gezeigt. Ich möchte das etwas fliessender zwischen den Effekten.» Drei Ursachen, in einem Prüffilm nachgemessen (Kette, Schnitt, sechs Abschnitte zu 3 s):

- Die Szenen von PHORMA I und II beginnen schwarz (Keime, Linien, Funken wachsen aus dem Dunkel), bis zu 1,6 s lang (Tuch); unter einer Überblendung oder Schwelle wurde der Wechsel so eine Blende ins Schwarze.
- Die Rückkopplung (Feedback) begann an jeder Station wieder beim Eingang: im Fächer das Ausgangsbild, in der Kette das letzte Standbild des vorigen Abschnitts, alle halbe Sekunde ein Sprung.
- An jedem Abschnittswechsel stand ein Sprung vom laufenden Bild des einen Effekts in das erste Bild des nächsten (bei Schnitt direkt; der Verlauf der Operation im Takt ging von Standbild zu Standbild).
- Im Takt reihum kehrte die Runde beim Bild wieder, sobald die Anschläge über die Stationen hinausreichten (gleich starke Anschläge an der Schwelle): mitten im Film stand kurz das Ausgangsbild, dann der erste Abschnitt noch einmal.

Die Lösung liegt im Film über Stationen (docs/STATIONEN.md, Partitur 0.6.0): jede lebendige Quelle kommt über 2 s aus dem letzten Filmbild (**Eintritt**), die Rückkopplung läuft über alle Stationen eines Abschnitts weiter, ein Verlauf in eine lebendige Station wird eine Überblendung. Dazu steht die Farbe (`bild.farbe`) auf 90° Farbdrehung, und die Lautstärke dreht von dort: vorher stand sie auf 0°, und in leisen Momenten war das Bild das Ausgangsbild mit etwas mehr Sättigung. Das Bild steht seit 0.1.39 wie eine Karte `einmal` vorn (`BILD_DAUER` = 1 s, ausserhalb der Runde, die Kamera steht still): kehrt die Runde wieder, beginnt sie beim ersten Abschnitt, nicht beim Ausgangsbild. Mit dem Intro der Signatur steht das Bild seit 0.1.40 nicht als Station: der Scratch des Intros führt direkt in den ersten Abschnitt (docs/SIGNATUR.md). Die übrigen Zeiten des Films (Halten, Übergänge, Takt) bleiben gleich; der Eintritt liegt auf den ersten Bildern des Abschnitts.

**Farbe (seit Lab 0.1.41).** Christian am 25. Oktober 2026: «Das Video ist jetzt zum grossen Teil schwarz/weiss. Fehlt jetzt die Farbinformation des Ausgangsbildes, weil es nicht mehr gezeigt wird nach dem Zettel?» Die Farbe fehlte nicht am Eingang: jeder Effekt bekommt das Material. Aber zwei Arten von Effekten zeichnen ohne Farbe, und seit 0.1.39 laufen sie rein, ohne das bunte Ausgangsbild, das vorher alle halbe Sekunde dazwischenstand: die Linienbilder (Puls, Spirale, Schraffur, Fliessfeld, Punktieren) mit «Tinte auf Papier», und die Szenen von PHORMA I, deren Ablauf mit Linien und Formen beginnt (die Fragmente: 8 von 15 s ohne Farbe) und bei 8 s Szenendauer in einem Abschnitt von 5 s die Farben und das Bild nicht mehr erreichte. Im Prüffilm lagen die Linienbilder bei einer Buntheit von 6 und die Fragmente bei 0 (das Material bei etwa 35). Darum zeichnen die Linienbilder in der Zusammenstellung mit den Farben des Bildes (`farbe: "papier"` oder `"nacht"`, im Register bleibt Tinte der Standard), und die Szenen von PHORMA I und II laufen in der Dauer ihres Abschnitts plus 1 s, so dass jeder Ablauf bis zu seinem Bild kommt. Die Karten der Signatur (Zettel, ORNA) bleiben Papier und Tinte.

## Nur fliessende Effekte (seit Lab 0.1.20)

Christian am 24. Oktober 2026: «nimm bitte vorerst die Effekte raus, die einem fliessenden Video à la PHORMA entgegenstehen». Darum stehen in der Zusammenstellung nur noch die sieben lebendigen Effekte (Feedback, Wiederholung, Farbe, Glitch, Verzerrung, Licht, Raster), und von den Dramaturgien bleiben vier (Puls, Farbwelle, Vervielfältigung, Steigerung). Komposition, Pixelsortierung, Neu setzen und der Zerfall (The Fictory) sowie die Dramaturgien Zerfall und Spiegelung ergaben Standbilder mit Kamera; sie bleiben als Operationen im Register und unter «Nebeneinander» wählbar, nur jev bekommt sie vorerst nicht mehr zur Wahl (`BILD_EFFEKTE`, `DRAMATURGIEN` in `jev/fragen.js` und `wahl.php`, `BILD_REZEPTE`, `REZEPTE`). Alte Projekte mit diesen Kennungen öffnen weiter. Wenn Pixelsortierung, Neu setzen, Komposition und Zerfall eine lebendige Fassung haben, kommen sie zurück.

## Die Dramaturgien (`kern/vorschlag.js`, `REZEPTE`; seit Lab 0.1.20 ohne Spiegelung, seit 0.1.22 wieder mit Zerfall: fünf)

| Kennung | Name | Operationen | Film |
|---|---|---|---|
| `vorschlag.puls` | Puls | Feedback, 6 Varianten, Zoom ← Lautstärke | Schnitt, im Takt (höchstens 2,5 Wechsel/s) |
| `vorschlag.farbwelle` | Farbwelle | Farbe modulieren, 8 Varianten, Farbdrehung ← Lautstärke | Überblendung, im Takt (1,2/s) |
| `vorschlag.raster` | Vervielfältigung | Wiederholung, 6 Varianten, Grösse ← Lautstärke | Schnitt, im Takt (2/s) |
| `vorschlag.steigerung` | Steigerung | Farbe → Wiederholung → Feedback | Schwelle, gleichmässig |

Stationen sind immer das Bild und danach die Ergebnisse. Im Takt laufen die Stationen reihum, bis die Anschläge aufgebraucht sind. Die Schwelle der Anschläge wird so gesetzt, dass die stärksten zählen (`taktSchwelle()`). Gibt es weniger als vier, läuft der Film gleichmässig. In der Zusammenstellung wird die Schwelle seit Lab 0.1.40 im Fenster der Runde gewählt, zwischen den Karten vorn (Intro, Zettel) und hinten (Outro, Signet, ORNA-Karte), so dass dort je Station ein Anschlag liegt: jeder Abschnitt kommt vor. Liegen im Fenster weniger Anschläge als Varianten, bleibt der Takt, und jeder Abschnitt bekommt so viele seiner Varianten, wie ihm Anschläge zustehen (nach seiner Dauer, gleichmässig gewählt, die letzte immer dabei); erst unter zwei Anschlägen je Abschnitt läuft der Film gleichmässig mit allen Varianten. Vorher zählte der ganze Ton, und mit der Signatur lagen die Anschläge des Intros und des Outros ausserhalb der Runde; sie brach nach etwa der Hälfte der Stationen ab (Christian, 25. Oktober 2026: «nur 2–3 Effekte, als hätte es eine Zeitbeschränkung zwischen Zettel und ORNA-Karte»). Gleichmässig füllt das Halten die Dauer, bei kurzem Klang werden die Übergänge kürzer. Der Film dauert so lang wie der gemessene Ausschnitt, höchstens 30 s.

## Im Projekt

- Entscheidung `gegenstand: "dramaturgie"`, Art **jev** (mit Modell, Wahrscheinlichkeiten, Lage, Rang) oder **Regel** (Gewicht, Gründe, warum ohne jev), dazu `details.merkmale` und `details.werte`.
- Jeder Schritt des Rezepts als Ausführung, mit derselben Entscheidungsart und `details.entscheidung`.
- Der Film unter `exporte` mit `art: "stationen"`, `dramaturgie` und `tonBeginn` (ohne neue Formatversion).

## Kosten

Eine Frage an jev je «Vorschlag machen», gleiche Stufen kommen 30 Tage aus dem Zwischenspeicher. Es gelten dieselben Grenzen wie für die Wahl der Operation (`docs/JEV-STATUS.md`).

## Offen

- Zettel und Konstellation auch in den festen Dramaturgien; eine Karte mit dem Text des Zettels (nicht nur dem Leitsatz) als zweite Zwischentitelkarte.
- Bewegung im Video als Steuersignal (Unterschied zwischen Bildern) und mehr Standbilder bei langen Videos.
- jev könnte auch Parameter wählen (Tiefe der Modulation, Takt), über eine weitere feste Frage.
- Klangfarbe (spektraler Schwerpunkt) als Merkmal und als zweite Route.
