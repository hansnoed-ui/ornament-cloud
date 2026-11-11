# Operations-Dossier: Modulation

Masterprompt §9 und §18, Phase 3 (Referenzforschung). Stand: 23. Oktober 2026.

Gefragt war, ob das Modulationsprinzip des Labs (`kern/modulation.js`) dem entspricht, was die Referenzprogramme tatsächlich tun. Bisher stand es in der REFERENZ-MATRIX nur als Hypothese. Untersucht wurden drei Programme, jedes auf dem Weg, den §9 vorsieht:

| Programm | Untersuchungsform (§9) | Quelle | abgerufen |
|---|---|---|---|
| **VCV Rack** | A, quelloffen: Quellcode gelesen | `github.com/VCVRack/Rack` (Commit `061ccf6`, 4. 11. 2025) und `github.com/VCVRack/Fundamental` (Commit `10dd016`, 10. 6. 2026), GPL-3.0-or-later | 23. 10. 2026 |
| **Bitwig Studio** (The Grid) | B, proprietär: offizielles Handbuch | `bitwig.com/userguide/latest/`: *The Unified Modulation System*, *Welcome to The Grid*, *Modulators* | 23. 10. 2026 |
| **TouchDesigner** | B, proprietär: offizielle Dokumentation | `docs.derivative.ca`: *TOP to CHOP*, *CHOP to TOP*, *Math CHOP*, *Hold CHOP*, *Lag CHOP*, *Feedback TOP*, *Export*, *Parameter* | 23. 10. 2026 |

**REA wurde nicht gebraucht.** Der Quellcode von VCV Rack liegt vollständig offen, also gilt §9 A: normale Repository-Werkzeuge vor REA. Bitwig und TouchDesigner sind nicht installiert und werden nicht dekompiliert (§9 B). Es gab keine Frage, die nur ein Laufzeit- oder Binärbefund hätte beantworten können.

**Kennzeichnung (§20):** **verifiziert** heisst, die Aussage steht so im Quellcode (mit Datei und Zeile) oder im Handbuch (mit Abschnitt). **Hypothese** heisst, die Aussage ist daraus geschlossen, aber nicht belegt. **Entscheidung** heisst, das Lab macht es bewusst so.

Aus VCV Rack ist **kein Code übernommen**. Übernommen sind Verfahren: Summe, Abschwächer, Begrenzung, Halten. Das sind allgemeine Rechenregeln. Das Lab bleibt darum ohne GPL-Bindung.

---

## 1. Kabel und Summierung (VCV Rack)

| | |
|---|---|
| **1 Programm und Quelle** | VCV Rack 2, `src/engine/Engine.cpp` (`Engine_stepFrameCables`, Z. 352–420), `include/engine/Port.hpp` |
| **2 konkrete Funktion** | Ein Kabel überträgt die Spannungen eines Ausgangs auf einen Eingang. Mehrere Kabel dürfen auf demselben Eingang stecken («stackable inputs»). |
| **3 technisches Problem** | Viele Quellen sollen auf ein Ziel wirken, ohne dass ein eigener Mischer nötig ist und ohne dass Rückkopplungsschleifen die Rechnung blockieren. |
| **4 Operationsprinzip** | Jeder Takt läuft in zwei Phasen: Zuerst rechnen alle Module (`Engine_stepWorker`), danach kopiert die Engine alle Ausgänge auf die Eingänge (Z. 458). Jedes Kabel verzögert also um genau einen Takt. Darum sind Schleifen erlaubt. Stecken mehrere Kabel auf einem Eingang, werden sie **summiert** (Z. 400–416). Ein einkanaliges Signal wird dabei auf alle Kanäle verteilt. |
| **5 Ein- und Ausgabetypen** | Spannung (float) in bis zu 16 Kanälen (`PORT_MAX_CHANNELS = 16`, Port.hpp Z. 11). Audio, Steuerspannung und Gate haben dieselbe Form. |
| **6 Parameter** | keine. Die Anzahl der Kanäle folgt dem Ausgang. 0 Kanäle heisst «nicht verbunden». |
| **7 Kombinationen** | Summe + Abschwächer (Abschnitt 2) ergibt einen Mischer ohne eigenes Modul. Die Kanäle sind die Grundlage für Polyphonie, im Lab entsprechen sie den Varianten. |
| **8 nachweisbare Befunde** | **verifiziert:** Summe gestapelter Kabel (Z. 400–416). Nicht endliche Werte (NaN, ∞) werden beim Kopieren zu 0 (`finitize`, Z. 353–355, 377, 407, 415). Die Verzögerung um einen Takt folgt aus der Reihenfolge in `Engine_stepFrame` (Z. 452–458). |
| **9 Unsicherheiten, Grenzen** | **Hypothese:** Die Verzögerung um einen Takt ist der Preis für die freie Verkabelung. Im Lab gibt es keine Takte, sondern Ergebnisse. Rekursion ist dort ausdrücklich (Feedback, Ketten), die Grafik bleibt azyklisch (PROJEKTFORMAT.md). |
| **10 Lizenz** | GPL-3.0-or-later. Gelesen, nicht kopiert. |
| **11 eigenständige Implementierung** | ja, umgesetzt: `moduliere()` summiert alle Routen auf dasselbe Ziel und begrenzt erst danach. Ungültige Werte zählen als 0 (`endlich()`). |
| **12 Aufwand** | klein (wenige Zeilen, keine Abhängigkeit). |
| **13 künstlerische Relevanz** | **strukturelle Kopplung.** Zwei Quellen, etwa ein Bildsignal und ein LFO, können denselben Parameter gemeinsam bewegen. Das Ergebnis hängt nicht davon ab, in welcher Reihenfolge sie verbunden wurden. |

**Abweichung, die korrigiert wurde:** Das Lab begrenzte bisher nach **jeder** Route. Zwei gegenläufige Routen ergaben dadurch je nach Reihenfolge verschiedene Werte (Grundwert 3, Spanne ±20: +20 → 20 (begrenzt) → 0 statt 3). Seit Lab 0.1.1 wird erst summiert, dann begrenzt. Mit einer einzigen Route, wie sie die Oberfläche bisher anlegt, rechnet 0.1.1 genau wie 0.1.0.

## 2. Abschwächer, Attenuverter und Polarität (VCV Rack, Bitwig)

| | |
|---|---|
| **1 Programm und Quelle** | VCV Fundamental: `8vert.cpp`, `CVMix.cpp`, `Random.cpp`, `LFO.cpp`, `VCA-1.cpp`. Bitwig-Handbuch: *The Unified Modulation System* (Abschnitte «Modulation Sources Tab, Modulation Transfer Functions, and Modulation Scaling»), *Welcome to The Grid*. |
| **2 konkrete Funktion** | Ein Steuersignal wird skaliert, umgekehrt und zum Grundwert eines Parameters addiert. |
| **3 technisches Problem** | Dasselbe Signal soll auf verschiedene Ziele verschieden stark wirken. Der Regler des Parameters soll dabei bedienbar bleiben. |
| **4 Operationsprinzip** | VCV: **Grundwert + Signal / 10 V × Attenuverter, danach begrenzen** (Random.cpp Z. 99–101: `rand += cv / 10 * att; rand = clamp(rand, 0, 1)`; gleich für `prob` und `shape`). Der Attenuverter läuft von −1 bis +1 (8vert.cpp `configParam(…, -1, 1, 0)`). Bitwig: Jede Modulation hat eine eigene, relative Stärke («the modulation range is set relatively»). Der Regler des Parameters bleibt bedienbar und verschiebt den Bereich. |
| **5 Ein- und Ausgabetypen** | Steuersignal → Zahlparameter. |
| **6 Parameter** | Tiefe −1 … +1. Polarität: VCV-LFO mit Schalter OFFSET (LFO.cpp Z. 154–173), Bitwig mit Schalter «Bipolar (±)» an Modulatoren. Bitwig hat zusätzlich eine **Übertragungsfunktion je Verbindung** (Linear, Positives, Negatives, Absolute, Toward Zero, Exponential, Logarithmic) und eine **Skalierung** einer Verbindung durch eine zweite Quelle. |
| **7 Kombinationen** | Normalisierung: Ein unverbundener Eingang liefert 10 V (8vert.cpp Z. 35, CVMix.cpp Z. 51). So wird der Attenuverter selbst zur Quelle eines festen Werts. Grid: «In ports often have attenuators … Control busses sum, and unconnected ports use a value of zero». |
| **8 nachweisbare Befunde** | **verifiziert:** (a) Ein bipolares Signal ±5 V bei Tiefe 1 bewegt einen normierten Parameter um ±0,5, also um die **halbe Spannweite**. Das ist genau der Hub im Lab. (b) OFFSET rechnet `v += 1` vor `× 5 V` (LFO.cpp Z. 159–161). Einpolig verschiebt also den Nullpunkt, der Hub bleibt gleich (0 … 10 V statt ±5 V). (c) Bitwig dagegen skaliert beim Umschalten auf bipolar neu («minimum value is −1 and the middle value is now 0»). (d) Bitwig wendet erst die Übertragungsfunktion an, dann die Skalierung. (e) Der VCA biegt seine Steuerspannung wahlweise exponentiell (`cv⁴`, VCA-1.cpp Z. 49). Auch das ist eine Übertragungsfunktion. |
| **9 Unsicherheiten, Grenzen** | VCV und Bitwig verstehen «einpolig» verschieden: VCV verschiebt (gleicher Hub), Bitwig staucht (halber Hub). **Entscheidung:** Das Lab folgt VCV, weil dort der Quellcode prüfbar ist und weil der Wechsel der Polarität dann nur den Ausgangspunkt ändert, nicht die Stärke. Bitwigs Skalierung einer Route durch eine zweite Quelle ist nicht gebaut (siehe Ausblick). |
| **10 Lizenz** | VCV GPL-3.0 (gelesen). Bitwig: nur das öffentliche Handbuch, keine Software. |
| **11 eigenständige Implementierung** | ja, umgesetzt: `polaritaet: "bipolar" \| "einpolig"` je Route (`routenwert()`), in der Oberfläche als «Polarität». |
| **12 Aufwand** | klein. |
| **13 künstlerische Relevanz** | **Unterscheidung.** Bipolar heisst: Der Grundwert ist die Mitte, um die herum variiert wird. Einpolig heisst: Der Grundwert ist eine Grenze, von der aus etwas geschieht. Bei einem Bildsignal ändert einpolig die Bedeutung von Dunkel: Dunkle Stellen lassen den Parameter in Ruhe, nur Helles greift ein. |

## 3. Abtasten und halten (VCV Rack, Bitwig, TouchDesigner)

| | |
|---|---|
| **1 Programm und Quelle** | VCV Fundamental `SHASR.cpp` (Sample & Hold mit Schieberegister), `Random.cpp`. Rack `include/dsp/digital.hpp` (`SchmittTrigger`). Bitwig: Modulatoren *Sample and Hold* und *Quantize*. TouchDesigner: *Hold CHOP*, *Lag CHOP*. |
| **2 konkrete Funktion** | Ein fortlaufendes Signal wird zu bestimmten Zeitpunkten gemessen. Der gemessene Wert bleibt bis zur nächsten Messung stehen. |
| **3 technisches Problem** | Aus einem kontinuierlichen Verlauf eine Folge diskreter Zustände machen und Zufall reproduzierbar «einfrieren». |
| **4 Operationsprinzip** | SHASR: Beim Trigger übernimmt Stufe i den Eingang. Ist der Eingang unverbunden, übernimmt sie den alten Wert der vorigen Stufe (Z. 83, 90). Ist auch die erste Stufe unverbunden, liest sie Zufall (Z. 78–80). Random: Bei jedem Takt mit Wahrscheinlichkeit `prob` (Z. 114) wird ein neuer Wert gezogen, mit dem alten überblendet (`crossfade(…, rand)`, Z. 129) und je nach Ausgang gestuft, linear, weich oder exponentiell zum neuen Wert geführt (Z. 183–232). Bitwig S&H: «sustains … an incoming signal's value at the moment of each clock event», mit *Smooth* als Übergangszeit. Hold CHOP: liest den ersten Eingang beim Schritt 0 → 1 am zweiten. |
| **5 Ein- und Ausgabetypen** | Signal + Takt (Trigger) → gehaltenes Signal. |
| **6 Parameter** | Takt oder Rate, Wahrscheinlichkeit, Zufallsanteil, Glättung bzw. Form. Auslöseschwellen: VCV-Schmitt-Trigger 0,1 V / 1 V bzw. 2 V (SHASR Z. 67, Random Z. 144). Bitwig *Quantize*: Auflösung und Rasterform. |
| **7 Kombinationen** | Halten + Glätten (Lag CHOP, Bitwig *Smooth*) ergibt Treppen mit weichen Kanten. Halten + Schieberegister ergibt Kanon und Verzögerung einer Zufallsfolge. Halten eines Bildsignals ergibt eine Rasterung der Bildinformation. |
| **8 nachweisbare Befunde** | **verifiziert:** In allen drei Programmen ist Abtasten und Halten ein **eigener Verarbeitungsschritt**, der jedes Signal annimmt, nicht nur Zufall (SHASR `IN_INPUTS`, Bitwig «modulating the Input parameter with any other modulator(s)», Hold CHOP Input 0). |
| **9 Unsicherheiten, Grenzen** | Bisher war im Lab nur der Zufall gehalten (`zufall` mit `stufen`). **Abweichung, korrigiert:** Abtasten und Halten gilt jetzt für jede Quelle. Glätten (Smooth, Lag), Wahrscheinlichkeit und Schieberegister sind **nicht** gebaut. Sie wären sinnvoll, wenn Varianten und Zeit sich einmal einen Takt teilen. |
| **10 Lizenz** | VCV GPL-3.0 (gelesen). Bitwig und TouchDesigner: öffentliche Dokumentation. |
| **11 eigenständige Implementierung** | ja, umgesetzt: `halte(u, h)` und das Feld `halten` an jedem Modulator ausser `zufall`. Die Stelle u wird auf h Stufen gehalten. Jede Stufe trägt den Wert an ihrem Anfang, die letzte endet bei 1. In der Oberfläche heisst es «Abtasten und halten (Stufen, 0 = fortlaufend)». |
| **12 Aufwand** | klein. |
| **13 künstlerische Relevanz** | **Nebeneinander und Nacheinander.** Halten macht aus einem Verlauf eine Folge von Zuständen: Sechs Varianten können sich drei Werte teilen, dann stehen Paare nebeneinander. Über die Zeit wird eine gleitende Bewegung zu einer Abfolge von Einstellungen. Die Kontingenz bleibt dabei sichtbar, denn der Zufall ist über den Startwert reproduzierbar. |

## 4. Bild → Steuerdaten → Parameter (TouchDesigner)

| | |
|---|---|
| **1 Programm und Quelle** | TouchDesigner-Dokumentation: *TOP to CHOP*, *CHOP to TOP*, *Math CHOP*, *Export*, *Parameter* |
| **2 konkrete Funktion** | Pixel werden zu Kanälen (TOP to CHOP). Kanäle werden umgerechnet (Math CHOP) und auf Parameter beliebiger Operatoren gelegt (Export). |
| **3 technisches Problem** | Ein Medienwechsel: Bildinformation soll Parameter steuern, und Steuerdaten sollen wieder Bild werden. |
| **4 Operationsprinzip** | TOP to CHOP legt jede Farbkomponente in einen eigenen Kanal. Ausgelesen wird ein Pixel, eine Zeile, eine Spalte oder ein Bereich («Crop»), wahlweise je Zeile als eigener Kanalsatz. Die Einheit ist wählbar (0–1, 0–255, 0–65535). Math CHOP rechnet in fester Reihenfolge: Pre-OP (z. B. Betrag, Quadrat), Kanäle verbinden (Summe, Produkt, Maximum …), Post-OP, dann Mult-Add bzw. «Range» (Eingangsbereich → Ausgangsbereich). Export setzt den Parameter in den Export-Modus. Der Kanalwert **überschreibt** dann den Parameterwert («overriding that parameter's value»). |
| **5 Ein- und Ausgabetypen** | IMAGE → CONTROL_SIGNAL → Parameter. Rückweg mit CHOP to TOP: CONTROL_SIGNAL → IMAGE. |
| **6 Parameter** | Ausschnitt (Pixel, Zeile, Spalte, Bereich), Farbkomponente, Einheit; Range: von/bis → nach/bis. |
| **7 Kombinationen** | Bildsignal → Abtasten → Polarität → Route. Verbinden mehrerer Signale (Summe, Produkt) entspricht gestapelten Routen. |
| **8 nachweisbare Befunde** | **verifiziert:** Medienwechsel als eigene Operatoren mit ausdrücklichen Ein- und Ausgabetypen (TOP ↔ CHOP). Export ersetzt den Wert, Bitwig und VCV dagegen addieren zum Grundwert. |
| **9 Unsicherheiten, Grenzen** | Das Lab mittelt ein Merkmal (Helligkeit, Sättigung, Kante) über Streifen entlang einer Achse (`lab.bildsignal`). Das ist kein einzelnes Pixel wie bei TOP to CHOP, sondern eine Verdichtung. **Entscheidung:** Das Lab bleibt additiv wie VCV und Bitwig, nicht ersetzend wie Export. So bleibt der Regler des Parameters wirksam, und die Tiefe hat einen Sinn. Der Rückweg (Signal → Bild) ist nicht gebaut. |
| **10 Lizenz** | proprietär. Nur öffentliche Dokumentation, keine Installation. |
| **11 eigenständige Implementierung** | vorhanden (`lab.bildsignal`, Quelle `signal`). Neu dazu: Abtasten und Polarität auch für Signale. |
| **12 Aufwand** | erledigt. Der Rückweg Signal → Bild wäre mittel (eine Operation CONTROL_SIGNAL → IMAGE). |
| **13 künstlerische Relevanz** | **Beobachtung und Gegenbeobachtung.** Ein Bild beobachtet ein anderes und greift in dessen Transformation ein. Ein Bild kann auch auf sich selbst zurückwirken. |

## 5. Feedback TOP (TouchDesigner), Gegenprobe

| | |
|---|---|
| **1 Programm und Quelle** | TouchDesigner-Dokumentation: *Feedback TOP* |
| **2 konkrete Funktion** | Das letzte Bild eines späteren Operators («Target TOP») wird wieder Eingang. |
| **3 technisches Problem** | Rekursion in einem Netz, das sonst nur vorwärts fliesst. |
| **4 Operationsprinzip** | Ist Feedback aktiv, gibt der Feedback TOP das Bild des Target TOP aus. Bei *Reset* reicht er sein Eingangsbild durch, *Reset Pulse* setzt ihn für ein Bild zurück. Die Schleife ist also ein ausdrücklicher Operator mit Rücksetzpunkt, wie das Kabel mit einem Takt Verzögerung in VCV (Abschnitt 1). |
| **5 Ein- und Ausgabetypen** | IMAGE → IMAGE. |
| **6 Parameter** | Target TOP, Reset, Reset Pulse. Transformation und Komposition liegen in den Operatoren dazwischen. |
| **7 Kombinationen** | mit Modulation über die Zeit (im Lab: Achse «über die Zeit»). |
| **8 nachweisbare Befunde** | **verifiziert:** wie in der Matrix angenommen. |
| **9 Unsicherheiten, Grenzen** | Im Lab ist die Transformation in die Operation eingebaut (Zoom, Drehung, Versatz, Farbe, Abklingen), nicht frei verdrahtet. |
| **10 Lizenz** | proprietär, nur Dokumentation. |
| **11 eigenständige Implementierung** | vorhanden (`lab.feedback`). Keine Änderung nötig. |
| **12 Aufwand** | – |
| **13 künstlerische Relevanz** | **Rekursion:** Eine Operation wird auf ihr eigenes Ergebnis angewandt, und jeder Zwischenstand bleibt als Bild erhalten. |

---

## Was im Lab geändert wurde

`kern/modulation.js` (Lab 0.1.1, Projektformat 0.2.0):

1. **Summe vor Begrenzung** (Abschnitt 1). Mehrere Routen auf ein Ziel werden summiert, dann begrenzt. Das Ergebnis hängt nicht mehr von der Reihenfolge ab.
2. **Polarität je Route** (Abschnitt 2). `einpolig` verschiebt den Nullpunkt bei gleichem Hub, wie der Schalter OFFSET am VCV-LFO.
3. **Abtasten und halten für jede Quelle** (Abschnitt 3). Feld `halten` am Modulator, auch für Steuersignale.
4. **Ungültige Werte zählen als 0** (Abschnitt 1, `finitize`).

Geprüft und **unverändert** gelassen:

- **Hub = halbe Spannweite bei Tiefe 1:** Das entspricht VCV (±5 V von 10 V). Verifiziert.
- **Sinus und Dreieck:** Sie haben dieselbe Phasenlage wie der VCV-LFO (beide beginnen bei 0 und steigen, Spitze bei ¼). Verifiziert, LFO.cpp Z. 156–168.
- **Sägezahn:** Der VCV-LFO beginnt bei 0 (`2·(p − round(p))`, LFO.cpp Z. 180), das Lab bei −1. **Entscheidung:** Das Lab bleibt bei −1 → +1. Über eine Reihe von Varianten ergibt das eine stetige Rampe vom einen Rand zum anderen, wie ein Falloff. Mit der VCV-Phase gäbe es mitten in der Reihe einen Sprung.
- **Additiv statt ersetzend:** wie VCV und Bitwig, nicht wie der TouchDesigner-Export (Abschnitt 4).

Tests: `tests/lab.test.mjs` (Summe in beiden Reihenfolgen, einpolig, Abtasten, ungültige Werte, Protokoll) und `tests/lab.e2e.mjs` (Bildsignal → Wiederholung, einpolig, drei Stufen, über die Oberfläche).

## Ausblick (nicht gebaut)

- **Skalierung einer Route durch eine zweite Quelle** (Bitwig «modulation scaling»). Ein Bildsignal könnte so bestimmen, wie stark ein LFO wirkt. Das wäre eine Kopplung zweiter Ordnung.
- **Übertragungsfunktionen je Route** (Bitwig: Absolute, Toward Zero, Exponential; VCV-VCA `cv⁴`).
- **Glätten gehaltener Werte** (Bitwig *Smooth*, TouchDesigner *Lag*, VCV Random «Smooth»), **Wahrscheinlichkeit** und **Schieberegister** (SHASR).
- **Rückweg Signal → Bild** (CHOP to TOP).
- **Spreizung nach Reihen** (Bitwig *Stack Spread*: 1, ½, ⅓ …, Primzahlen, Fibonacci). Varianten würden dann nicht gleichmässig, sondern nach einer Zahlenreihe verteilt. Das ist ein Kandidat für ORNA-nahe Verteilungen.
