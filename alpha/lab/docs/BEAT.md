# Beat aus Bild oder Video (seit Lab 0.1.24)

Christian (24. Oktober 2026): «einen kleinen Beat-Erzeuger im Lab, der aufgrund eines Bildes oder Videos einen Soundtrack dazu erstellt, mit und ohne jev.»

Im Bereich **1 · Material** steht unter «Animation aus Bild und Klang» der Kasten **Beat aus Bild oder Video**: Bild wählen, Dauer, dann **Beat nach Regeln** oder **Beat mit jev**. Ein Knopf misst, wählt und rechnet; am Telefon (390 px, vierfach gedrosselt) dauert ein Beat von 15 s im Browsertest etwa 6 s. Danach lässt sich jede der sieben Stellen ändern und **neu rechnen** (die Entscheidung ist dann menschlich). Der Beat ist ein Ton im Projekt wie jeder andere: «Animation aus Bild und Klang» nimmt ihn als Tonspur, seine Schläge (Ereignisfolge mit `bpm` und Raster 16) taugen als Takt für den Film über Stationen.

Dieselbe Rechnung ist die Operation **Beat aus Bild** (`lab.beat`, zeitliche Operation, `operationen/beat.js`, Kern `kern/beat.js`): Eingang ein Bild, dazu bis zu fünf weitere (`bild2` … `bild6`), Ausgänge AUDIO (Stereo, 44,1 kHz) und EVENT_SEQUENCE. Jede Stelle ist ein Parameter mit «nach Regeln aus dem Bild»; was so gewählt wird, steht als Entscheidung «regel» mit den Gründen im Protokoll. Reines JavaScript wie der Klangerzeuger: derselbe Startwert ist derselbe Beat.

## Messen

Gemessen wird auf höchstens 128 Pixeln je Seite, mit dem kompositorischen Profil (`kern/komposition.js`) und zwei eigenen Massen:

| Merkmal | Messung | Stufen |
|---|---|---|
| helligkeit | mittlere Leuchtdichte | dunkel < 0,35 ≤ mittel ≤ 0,65 < hell |
| kontrast | Effektivwert der Leuchtdichte | niedrig < 0,14 ≤ mittel ≤ 0,26 < hoch |
| farbigkeit | Sättigung (Abweichung vom Grau) | grau < 0,06 ≤ gedämpft ≤ 0,2 < bunt |
| farbton | Kreismittel des Farbtons, gewichtet mit Sättigung und Bündelung | warm (330°–75°), kalt (120°–300°), sonst oder bei wenig Farbe neutral |
| detail | Feinheit: mittlerer Helligkeitsunterschied zu den Nachbarn | glatt < 0,035 ≤ mittel ≤ 0,08 < fein |
| schwerpunkt | Schwerpunkt des Gewichts senkrecht | oben < −0,06 ≤ Mitte ≤ 0,06 < unten |
| symmetrie | grössere der beiden Spiegelungen | symmetrisch ab 0,8 |
| bewegung | mittlerer Helligkeitsunterschied aufeinanderfolgender Standbilder | still (ein Bild), ruhig < 0,05 ≤ bewegt ≤ 0,14 < heftig |

Bei einem Video nimmt der Kasten alle Standbilder desselben Videos (die sechs, die der Import über die Länge verteilt), und die Dauer ist die Länge des Videos.

## Wählen

Sieben Stellen aus festen Katalogen (`BEAT_FRAGEN` in `jev/fragen.js`, gleich in `jev/wahl.php`): Tempo (langsam, mittel, schnell, rasend), Groove (gerade, Halftime, Breakbeat, euklidisch, schleppend), Schlagzeug (trocken, elektronisch, metallisch, weich), Tonart (Dur, Moll, dorisch, phrygisch, pentatonisch), Bass (keiner, liegend, pulsierend, laufend), Melodie (keine, aus dem Bild gelesen, Arpeggio, Glocken), Verlauf (gleich, steigend, abschwellend, in Wellen).

- **Ohne jev:** die Regeln `BEAT_REGELN` in `kern/beat.js` (je Regel Stelle, Wert, Merkmal, Stufe, Gewicht und Grund, z. B. «ein dunkles Bild steht in Moll»). Je Stelle gewinnt der Wert mit dem grössten Gewicht; ohne Treffer gilt ein Standard.
- **Mit jev:** eine Frage `{ frage: "beat", merkmale }` an die Zwischenstelle, sieben CHOICE-Fragen in einem Aufruf. jev sieht nur die acht Stufen, nie das Bild. Aus den Wahrscheinlichkeiten wird mit dem Startwert gezogen («neu ziehen»). Ist jev nicht erreichbar, gelten die Regeln, und der Grund steht da.

## Rechnen

Nicht gewählt, sondern abgebildet: der Farbton gibt den Grundton (Farbkreis in zwölf Halbtönen, Rot C; ohne Farbton A), die Feinheit die Stelle im Tempobereich und die Dichte zusätzlicher Becken, die Bildzeilen die Tonhöhe der Melodie (oben hoch), der Schwerpunkt waagrecht die Seite von Becken und Melodie. Das Tempo wird so angepasst, dass ganze Schläge genau die Dauer füllen. Jedes Standbild ist ein Abschnitt; am Ende eines Abschnitts ein Wirbel. Der Verlauf gibt je Takt eine Energie, mit der die Stimmen einsetzen (Bassdrum ab 0,3, Bass 0,4, Becken 0,45, Snare 0,55, Melodie 0,62); «in Wellen» folgt sie der Bewegung zwischen den Standbildern.

Klänge: Bassdrum als Sinus mit fallender Tonhöhe, Snare aus Ton und gefiltertem Rauschen oder Klatschen aus drei Stössen, Becken aus Rauschen oder sechs Rechtecken wie bei der Roland TR-808, Bass aus zwei bis sechs Teiltönen, der Bassdrum ausweichend (Sidechain), Melodie mit den Klangfarben des Klangerzeugers. Nachhall auf Snare und Melodie (`nachhall()` aus `kern/klang.js`), sanfte Sättigung, Spitze −1 dBFS.

Das ist eine gestalterische Abbildung, keine Deutung des Bildes.
