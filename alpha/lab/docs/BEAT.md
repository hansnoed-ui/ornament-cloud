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

Acht Stellen aus festen Katalogen (`BEAT_FRAGEN` in `jev/fragen.js`, gleich in `jev/wahl.php`): Tempo (langsam, mittel, schnell, rasend), Groove (gerade, Halftime, Breakbeat, euklidisch, schleppend, Drum and Bass), Schlagzeug (trocken, elektronisch, metallisch, weich, Jazz, Handtrommeln), Tonart (Dur, Moll, dorisch, phrygisch, pentatonisch, Hijaz), Bass (keiner, liegend, pulsierend, laufend, Reese, Kontrabass), Melodie (keine, aus dem Bild gelesen, Arpeggio, Glocken), Verlauf (gleich, steigend, abschwellend, in Wellen, fein und wild im Wechsel), Fläche (keine, sphärisch, schimmernd).

Seit Lab 0.1.25 (Christian, 24. Oktober 2026: «die Beats sphärischer, drum n bass mässiger, 432 Hz, fein und wild abwechselnd»): Drum and Bass, Reese-Bass, die sphärische Fläche und der Wechsel sind der Standard der Regeln und gewinnen, solange keine Regel deutlich anders spricht. Drum and Bass hat sein eigenes Tempo (170–176), unabhängig von der Tempostufe. «Fein und wild im Wechsel»: je zwei Takte (bei einem Video je Abschnitt) zart (leise Snare, nur wenige Becken, keine Geisternoten), dann wild (Geisternoten, Sechzehntel-Becken, zusätzliche Bassdrums, Stottern der Snare, Wirbel am Ende). Gestimmt wird auf den Kammerton A = 432 Hz (Parameter «Stimmung», wahlweise 440 Hz).

Seit Lab 0.1.44 nach Christians Spotify-Playlist «Lieblingssongs» (25. Oktober 2026; Profil in den Projektdateien unter `musik/lieblingssongs-profil.md`): die Playlist ist vor allem Jazz und Weltjazz (Avishai Cohen, Anouar Brahem, Nubya Garcia), Boom Bap (The Roots, Kendrick Lamar), Soul und Trip-Hop (Massive Attack, James Blake), meist um 70–100 Schläge je Minute; echter Drum and Bass kommt kaum vor (Talvin Singh). Darum spielt Drum and Bass ausser in den wilden Takten als Halftime (Snare nur auf drei, 172 fühlt sich an wie 86) und mit mehr Swing (0,08); «mittel» liegt bei 84–96 statt 92–108. Der Standard der Regeln ist jetzt Schlagzeug «Jazz» (Besen, Ride, runde Bassdrum, Bläser als Melodie), Bass «Kontrabass» (gezupft, Viertel mit Annäherung von einem Halbton unter dem nächsten Grundton, im Drum and Bass auf den Bassdrums, darunter ein tragender Sinus), Tonart dorisch und Melodie «Glocken» (wenige Töne; im Jazz lange Bläsertöne). Reese bleibt für dunkle, heftig bewegte Bilder. Neu sind auch die Handtrommeln (nach Tabla und Zarb: die tiefe Trommel gleitet nach oben, die hohe klingt als Ton) und die Tonleiter Hijaz (kleine Sekunde, grosse Terz, wie bei Anouar Brahem). Auf Snare und Melodie liegt ein Echo wie im Dub (punktierte Achtel, Ping-Pong), so stark wie der Nachhall.

- **Ohne jev:** die Regeln `BEAT_REGELN` in `kern/beat.js` (je Regel Stelle, Wert, Merkmal, Stufe, Gewicht und Grund, z. B. «ein dunkles Bild steht in Moll»). Je Stelle gewinnt der Wert mit dem grössten Gewicht; ohne Treffer gilt ein Standard.
- **Mit jev:** eine Frage `{ frage: "beat", merkmale }` an die Zwischenstelle, sieben CHOICE-Fragen in einem Aufruf. jev sieht nur die acht Stufen, nie das Bild. Aus den Wahrscheinlichkeiten wird mit dem Startwert gezogen («neu ziehen»). Ist jev nicht erreichbar, gelten die Regeln, und der Grund steht da.

## Rechnen

Nicht gewählt, sondern abgebildet: der Farbton gibt den Grundton (Farbkreis in zwölf Halbtönen, Rot C; ohne Farbton A, gestimmt auf A = 432 Hz), die Feinheit die Stelle im Tempobereich und die Dichte zusätzlicher Becken, die Bildzeilen die Tonhöhe der Melodie (oben hoch), der Schwerpunkt waagrecht die Seite von Becken und Melodie. Das Tempo wird so angepasst, dass ganze Schläge genau die Dauer füllen. Jedes Standbild ist ein Abschnitt; am Ende eines Abschnitts ein Wirbel. Der Verlauf gibt je Takt eine Energie, mit der die Stimmen einsetzen (Bassdrum ab 0,3, Bass 0,4, Becken 0,45, Snare 0,55, Melodie 0,62); «in Wellen» folgt sie der Bewegung zwischen den Standbildern.

Klänge: Bassdrum als Sinus mit fallender Tonhöhe, Snare aus Ton und gefiltertem Rauschen oder Klatschen aus drei Stössen, Becken aus Rauschen oder sechs Rechtecken wie bei der Roland TR-808, Bass aus zwei bis sechs Teiltönen oder als Reese (zwei verstimmte Sägezähne, wanderndes Tiefpassfilter, Sinus darunter), der Bassdrum ausweichend (Sidechain), Fläche aus vier Stimmen je Akkord (je Seite ein leicht verstimmter, weich gefilterter Sägezahn, langsam ein- und ausgeblendet, viel Nachhall; «schimmernd» mit Tönen zwei Oktaven höher), Melodie mit den Klangfarben des Klangerzeugers. Nachhall auf Snare und Melodie (`nachhall()` aus `kern/klang.js`), sanfte Sättigung, Spitze −1 dBFS.

Das ist eine gestalterische Abbildung, keine Deutung des Bildes.
