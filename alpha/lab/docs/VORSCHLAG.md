# Vorschlag für 30 Sekunden aus Bild und Klang (Lab 0.1.11, Zusammenstellung seit 0.1.12)

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
3. sechs Abschnitte zu je drei Varianten, die Lautstärke verteilt den Hauptparameter jedes Effekts über die Varianten (Zerfall: drei der sechs Zustände)
4. Film über 19 Stationen mit dem neuen Klang als Tonspur, im Takt der stärksten Anschläge (jede Station einmal) oder gleichmässig

Kosten: ein Aufruf mit etwa 4000 Eingabe-Token, also etwa 0,02 Cent; gleiche Stufen kommen 30 Tage aus dem Zwischenspeicher. Am Desktop dauert das Rechnen etwa 50 s, am Telefon länger.

Im Projekt: Entscheidung `gegenstand: "zusammenstellung"` mit `gewaehlt: { aufbau, uebergang, klang, bild }`, Startwert, Antworten von jev, Merkmalen; jeder Schritt verweist mit `details.entscheidung` darauf; der Film unter `exporte` mit `dramaturgie: "zusammenstellung"`.

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

- **Zettelkasten und ORNA** in die Zusammenstellung einbinden (Christians nächster Wunsch).
- **Video als Eingang:** Ein Video als Material (Standbilder als Stationen, Bewegung als Steuersignal) ist der nächste Schritt. Heute nimmt der Vorschlag ein Bild.
- jev könnte auch Parameter wählen (Tiefe der Modulation, Takt), über eine weitere feste Frage.
- Klangfarbe (spektraler Schwerpunkt) als Merkmal und als zweite Route.
