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
| `bild1` … `bild6` | Feedback, Wiederholung, Farbe, Komposition, Glitch, Pixelsortierung, Verzerrung, Licht, Raster, Neu setzen, Zerfall (The Fictory) |

Aus den Wahrscheinlichkeiten zieht das Lab mit Startwert (`zusammenstellen()` in `kern/zusammenstellung.js`): kein Bildeffekt zweimal hintereinander, der zweite Klangeffekt nicht derselbe wie der erste. «neu ziehen» zieht mit neuem Startwert aus denselben Antworten, ohne jev erneut zu fragen. Jede Stelle lässt sich von Hand ändern, dann ist die Zusammenstellung eine Entscheidung des **Menschen** (`details.geaendert`, `details.vorschlag`). Ohne jev wird gleichverteilt gezogen (**Zufall**).

«Zusammenstellung rechnen» (`zusammenstellungRechnen()`):

1. die zwei Klangeffekte nacheinander auf den Ton (Tempo, Zerlegen, Neu-Rhythmisierung, Körner)
2. *Tonsignal* misst den neuen Klang: Hüllkurve für die Modulation, Anschläge für den Takt; ein bearbeiteter Klang beginnt am Anfang
3. sechs Abschnitte zu je zehn Varianten (seit Lab 0.1.16, vorher drei), die Lautstärke verteilt den Hauptparameter jedes Effekts über die Varianten (Zerfall: seine sechs Zustände)
4. Film über 61 Stationen (Bild und 60 Motive) mit dem neuen Klang als Tonspur, im Takt der stärksten Anschläge (jede Station einmal, höchstens zwei Wechsel je Sekunde, beim Schnitt 2,5) oder gleichmässig, wenn die Anschläge nicht für alle Motive reichen; mit Zettel oder ORNA-Konstellation (seit Lab 0.1.18, unten) dazu eine Karte vorn oder hinten und ein siebter Abschnitt

Kosten: ein Aufruf mit etwa 4000 Eingabe-Token, also etwa 0,02 Cent; gleiche Stufen kommen 30 Tage aus dem Zwischenspeicher. Am Desktop dauert das Rechnen etwa 50 s, am Telefon länger.

Im Projekt: Entscheidung `gegenstand: "zusammenstellung"` mit `gewaehlt: { aufbau, uebergang, klang, bild, zettel, orna }` (die beiden Bestände null, `"ziehen"` oder die gewählte Nummer bzw. Kennung), Startwert, Antworten von jev, Merkmalen; jeder Schritt verweist mit `details.entscheidung` darauf; der Film unter `exporte` mit `dramaturgie: "zusammenstellung"`.

## Video als Eingang (seit Lab 0.1.14)

«Video wählen» unter Material (oder ein Video hineinziehen) liest MP4, WebM oder MOV, soweit der Browser es abspielen kann (H.264 und VP8/VP9 fast überall, HEVC je nach Gerät), höchstens 300 MB:

- **sechs Standbilder** gleichmässig über die Länge, in Arbeitsgrösse, als IMAGE-Material mit `herkunft.video` (Name, Prüfsumme, Länge, Zeitpunkt)
- **die Tonspur**, höchstens die ersten 120 s, als AUDIO-Material (WAV, 24 Bit, Abtastrate der Datei); ein Video ohne lesbaren Ton gibt nur Bilder

Das Video selbst kommt nicht ins Projekt, nur was daraus gelesen wurde. Im Vorschlag stehen danach das erste Standbild und die Tonspur vor. Bei der **Zusammenstellung** nimmt jeder Abschnitt das Standbild seiner Zeit (Abschnitt 1 und 2 das erste, 3 und 4 das zweite …, bei sechs Standbildern je eines), so folgt der Film dem Video; der Aufbau gilt dann nicht. Die Entscheidung trägt `details.video` mit den Standbildern. Die festen Dramaturgien nehmen das gewählte Standbild.

## Bewegung (seit Lab 0.1.15)

Vorher stand jede Station still, bis die nächste kam: ein Film von 900 Bildern zeigte so nur etwa zwei Dutzend Veränderungen. Jetzt führt der Film eine Kamera über jedes Bild (`bewegung` im Plan, siehe docs/STATIONEN.md): Die Zusammenstellung mit voller Stärke, deren Zoom mit der Lautstärke des neuen Klangs atmet, die festen Dramaturgien mit 0,6 und der Lautstärke des gemessenen Klangs. Überblendung und Schwelle der Zusammenstellung dauern zudem bis zum nächsten Anschlag (höchstens 1,2 s bzw. 1,5 s), das Bild verwandelt sich also fortlaufend. Unter «Nacheinander» lässt sich die Bewegung danach ändern oder auf 0 setzen.

## Lebendige Effekte (seit Lab 0.1.17)

Christian am 23. Oktober 2026: PHORMA hat einen flüssigen Film in kurzer Zeit. Dort rechnet die Grafikkarte jedes Bild aus der Zeit. Jetzt tut das Lab dasselbe für sieben Effekte (`medien/gpu.js`, Übersicht in docs/STATIONEN.md): In der Zusammenstellung und bei den Dramaturgien ist `lebendig` gesetzt, jede Station aus Farbe, Glitch, Verzerrung, Raster, Wiederholung, Feedback oder Licht ist in jedem der 900 Bilder ein neues Effektbild, und die Lautstärke moduliert den Hauptparameter Bild für Bild statt nur über die Varianten. Pixelsortierung, Neu setzen, Komposition und Zerfall bleiben Standbilder mit Kamera. Unter «Nacheinander» lässt sich «lebendige Effekte» abschalten.

## Zettelkasten und ORNA (seit Lab 0.1.18)

Christian wollte beides in die Zusammenstellung einbinden, **beides wahlweise**. Unter den zehn Stellen stehen zwei Schalter, «Zettel» und «ORNA», vorgewählt aus. jev sieht beide nie: Die Fragen an jev bleiben dieselben zehn, der Zettel und die Konstellation werden mit dem Startwert gezogen oder vom Menschen gewählt (Entscheidungen `gegenstand: "strophe"` und `"konstellation"`, Art **Zufall** oder **Mensch**). Die Texte bleiben wörtlich.

- **Zettel** (`zettel.strophe`, operationen/zettel.js): einer der 49 Zettel aus «Zu seiner Zeit» (die erzeugten Daten des Dritten Rads, alpha/drittes-rad/daten.js), als Befund mit Nummer, Zyklus, Titel, Leitsatz und Text. Er **eröffnet** den Film als Titelkarte: Kopfzeile «Zettelkasten · Zyklus · n / 49», der Titel, der Leitsatz, unten «Zu seiner Zeit».
- **ORNA** (`orna.konstellation`): eine der 326 Konstellationen. Sie **schliesst** den Film als Karte (Nummer, Künstler × Theoretiker, Gedanke, Operationsregel) und gibt dem **Zerfall** (The Fictory) ihre Regel; steht kein Zerfall in der Zusammenstellung, kommt er als siebter Abschnitt dazu (sechs Zustände, auf dem letzten Bild der Kette).
- **Karten** zeichnet `lab.karte` (operationen/karte.js) im Mass des Ausgangsbilds, Papier auf Nacht, in den Systemschriften des Zettelkastens; sie braucht die Leinwand des Browsers (`verfuegbar()`), in Node fällt sie weg und der Zettel bleibt im Projekt. Jede Karte steht 2,5 s (`KARTE_DAUER`) und `einmal` ausserhalb der Runde im Takt (Partitur 0.4.0, docs/STATIONEN.md): die Runde der Motive beginnt beim ersten Anschlag nach der Zettelkarte, die ORNA-Karte steht bis zum Ende des Tons. Der Film hat dann bis 69 Stationen (Grenze 80).

«neu ziehen» behält die Schalter, ändert aber Zettel und Konstellation mit dem neuen Startwert, wenn sie gezogen werden. Nach dem Rechnen nennt der Status beides. Im Projekt: `gewaehlt.zettel` und `gewaehlt.orna` in der Entscheidung, die Operationen `zettel.strophe`, `orna.konstellation`, zweimal `lab.karte` mit `details.entscheidung`, der Zerfall mit dem Eingang `konstellation`.

## Die sechs Dramaturgien (`kern/vorschlag.js`, `REZEPTE`)

| Kennung | Name | Operationen | Film |
|---|---|---|---|
| `vorschlag.puls` | Puls | Feedback, 6 Varianten, Zoom ← Lautstärke | Schnitt, im Takt (höchstens 2,5 Wechsel/s) |
| `vorschlag.zerfall` | Zerfall | The Fictory, 6 Zustände | Schwelle, gleichmässig |
| `vorschlag.spiegel` | Spiegelung | Komposition verändern, 6 Varianten, Asymmetrie ← Lautstärke | Überblendung, im Takt (1/s) |
| `vorschlag.farbwelle` | Farbwelle | Farbe modulieren, 8 Varianten, Farbdrehung ← Lautstärke | Überblendung, im Takt (1,2/s) |
| `vorschlag.raster` | Vervielfältigung | Wiederholung, 6 Varianten, Grösse ← Lautstärke | Schnitt, im Takt (2/s) |
| `vorschlag.steigerung` | Steigerung | Farbe → Wiederholung → Feedback | Schwelle, gleichmässig |

Stationen sind immer das Bild und danach die Ergebnisse. Im Takt laufen die Stationen reihum, bis die Anschläge aufgebraucht sind. Die Schwelle der Anschläge wird so gesetzt, dass die stärksten zählen (`taktSchwelle()`). Gibt es weniger als vier, läuft der Film gleichmässig. Gleichmässig füllt das Halten die Dauer, bei kurzem Klang werden die Übergänge kürzer. Der Film dauert so lang wie der gemessene Ausschnitt, höchstens 30 s.

## Im Projekt

- Entscheidung `gegenstand: "dramaturgie"`, Art **jev** (mit Modell, Wahrscheinlichkeiten, Lage, Rang) oder **Regel** (Gewicht, Gründe, warum ohne jev), dazu `details.merkmale` und `details.werte`.
- Jeder Schritt des Rezepts als Ausführung, mit derselben Entscheidungsart und `details.entscheidung`.
- Der Film unter `exporte` mit `art: "stationen"`, `dramaturgie` und `tonBeginn` (ohne neue Formatversion).

## Kosten

Eine Frage an jev je «Vorschlag machen», gleiche Stufen kommen 30 Tage aus dem Zwischenspeicher. Es gelten dieselben Grenzen wie für die Wahl der Operation (`docs/JEV-STATUS.md`).

## Offen

- Zettel und Konstellation auch in den sechs festen Dramaturgien; eine Karte mit dem Text des Zettels (nicht nur dem Leitsatz) als zweite Zwischentitelkarte.
- Bewegung im Video als Steuersignal (Unterschied zwischen Bildern) und mehr Standbilder bei langen Videos.
- jev könnte auch Parameter wählen (Tiefe der Modulation, Takt), über eine weitere feste Frage.
- Klangfarbe (spektraler Schwerpunkt) als Merkmal und als zweite Route.
