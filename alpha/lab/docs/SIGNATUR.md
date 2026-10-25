# Signatur: Intro, Outro und Signet (seit Lab 0.1.26)

Christian (24. Oktober 2026): «Ich möchte nun noch ein Signatur-Intro (falls Zettelkasten) und ein Signatur-Outro (falls Orna). Und am Schluss das Signet ‹ornament.lab› (analog zu ornament.cloud, aber zusätzlich im Raum drehend).»

In der **Zusammenstellung** (Animation aus Bild und Klang) steht neben «lebendige Effekte» der Schalter **Signatur: Intro, Outro und Signet ornament.lab** (Standard an). Mit ihm ersetzen Intro und Outro die beiden Textkarten; ohne ihn bleibt alles wie bis 0.1.25. Die 30 Sekunden der Animation bleiben, die Signatur kommt davor und danach dazu:

| Bestände | Film |
|---|---|
| Zettel und ORNA | Intro 11 s · Animation 30 s · Outro 9 s (oder länger) · Signet 6,5 s = 56,5 s |
| nur Zettel | Intro 11 s · Animation 30 s · Signet mit Auftakt 8,1 s = 49,1 s |
| nur ORNA | Animation 30 s · Outro 9 s · Signet 6,5 s = 45,5 s |
| keiner | Animation 30 s · Signet mit Auftakt 8,1 s = 38,1 s |

## Intro (`signatur.intro`, falls ein Zettel dabei ist)

1. **Lichtwürfel** (0–3,6 s): ein Licht im Nichts, der Würfel zeichnet seine Kanten und dreht sich; in ihm irrt der Faden aus PHORMA III (derselbe Weg, `alpha/phorma-iii/irrweg.js`, unverändert). Er pulsiert auf den Einsätzen der Tonspur, einige Schläge lang.
2. **Entfalten** (3,4–5 s): seine 49 Felder lösen sich von den sechs Seiten und legen sich zum Raster des Zettelkastens, sieben Zyklen (Zeilen I–VII) zu sieben Strophen.
3. **Das Feld leuchtet** (4,9–5,6 s) im Rot-Orange des Signets, die Zyklen stehen daneben, darunter Zyklus, Nummer und Titel.
4. **Der Zettel wird gezogen** (5,6–6,4 s): das Feld kommt nach vorn und wird zur Karte (seit Lab 0.1.33 in der Gestaltung des Neubaus: Schwarz auf Weiss, Kopf in Grau, das Feld 7 × 7 als Punkte mit den Fäden zu den nahen Zetteln, die Blaupause als Akzent; vorher Papier `#f4f1ea` mit dem Punkt `#f08a5d`).
5. **Der Zettel** (6,4–10,25 s; seit Lab 0.1.34 eine Sekunde länger): Zettelkasten · Zyklus, die Nummer mit dem kleinen Raster, der Titel (Instrument Sans), der Leitsatz (Newsreader kursiv) und die **vier Verweise** (Person, Werk, Disziplin), einer nach dem anderen.
6. **Scratch** (10,25–11 s): wie eine Platte unter der Hand läuft der Streifen Zettel | Animation vor und zurück, an den Umkehrungen macht der Fader zu; am Ende steht das erste Bild der Animation. Im Ton derselbe Scratch (dieselbe Kurve `scratch()` in `kern/signatur.js`).

## Outro (`signatur.outro`, falls eine ORNA-Konstellation dabei ist)

1. **Körper** (0–1,6 s): die letzte Sequenz (das letzte Bild der Animation) zerfällt in Stücke, die sich zu einem Würfel falten.
2. **Kugel** (1,45–2,7 s): die Stücke legen sich auf eine Kugel aus 160 Lichtpunkten.
3. **ORNA-Rad** (2,6–5,4 s): die Punkte werden zum Doppelrad von ORNA, 20 Künstlerinnen und Künstler aussen, 20 Theoretikerinnen und Theoretiker innen, mit den 40 Zeichen aus `portfolio/nebeneinander-nacheinander/js/symbols.js` (unverändert); die Ringe drehen gegenläufig ein und bleiben mit den beiden gezogenen Personen auf der Achse stehen.
4. **Die Konstellation** (ab 5,2 s, bis 7,7 s; seit Lab 0.1.34 eine Sekunde länger): die Treffer leuchten, darunter (quer: daneben) «ORNA · Konstellation n», die Namen, die offene Frage und die Operationsregel. Steht die Station länger als 8 s, dehnt sich nur dieser Teil.
5. **Wieder Kugel** (die letzten 1,3 s): das Rad zieht sich zurück zur Kugel, in derselben Drehung, mit der das Signet beginnt.

## Signet (`signatur.signet`, immer am Schluss)

Aus der Kugel fliessen die Punkte auf die Schlaufe des Signets; es zeichnet sich wie das von ornament.cloud (`alpha/sketchory/signet.js`: dieselbe Kurve, derselbe Zeitplan, dieselben Farben): der Punkt läuft die Schlaufe entlang, Kästchen erscheinen und werden zu den Buchstaben von **ornament.lab**, der Punkt im Namen in Rot-Orange. Dazu dreht sich das Signet einmal im Raum (Schlaufe als Linie im Raum, Schriftzug auf einer Tafel in Perspektive) und steht am Ende von vorn. Seit Lab 0.1.30 steht es dann still (ohne Pendeln), der Schriftzug wird direkt auf die Bühne gezeichnet statt über die Tafel umgerechnet, der Schein geht fast ganz zurück, und die Bühne hat immer die volle Rechengrösse (auch wenn das letzte Bild kleiner ist): so bleibt das Schlussbild scharf. **Leichte Montage:** auf jedem kräftigen Einsatz des Gefrickels schneiden zwei bis fünf Felder kurz versetzt oder aus dem Moment davor ins Bild und rasten in 0,16 s wieder ein. Ohne Outro davor legt sich zuerst das letzte Bild der Animation auf die Kugel (Auftakt 1,6 s).

## Tonspur (`signatur.ton`)

Der Klang (nach den Klangeffekten der Zusammenstellung) läuft ab «Ton ab» durch den ganzen Film, ist er zu kurz, beginnt er von vorn. Am Ende des Intros der Scratch, unter dem Signet das **Gefrickel**: `frickeln.js` aus PHORMA III (unverändert) verfrickelt die acht Sekunden Klang davor zu vier Takten, daraus ein dichter Ausschnitt, weich überblendet und am Ende ausgeblendet. Die Zusammenstellung misst dann den ganzen Film auf dieser Tonspur (Takt und Kamera stehen in der Zeit des Films), die Szenen von PHORMA III laufen über Intro und Animation.

## Film

Intro, Outro und Signet sind Stationen mit `einmal` (die Kamera steht still) und eigener Bühne (`lebend()`, Zeit ab dem Auftritt), gezeichnet mit der Leinwand des Browsers (2D, eigene Perspektive, Leuchten über einen weichgezeichneten Abzug), jedes Bild nur aus der Zeit. Damit das Signet im Takt genau mit dem Ton endet, gibt die Partitur (0.5.0) die übrige Zeit der Station mit `dehnen` (dem Outro) statt der letzten; Intro und Outro gehen mit einem Schnitt weiter (ihre Bilder schliessen an). Jede Station hält höchstens 12 s. In das Outro führt der Übergang des Films (Schnitt, Überblendung oder Schwelle); bei der Schwelle ist die Maske seit Lab 0.1.35 das laufende Bild des Outros, nicht sein Standbild mit dem Rad (Christian, 25. Oktober 2026: «vor dieser Würfel-Animation erscheint kurz im Hintergrund das ORNA-Rad»).

## Prüfen

- `node --test tests/lab.test.mjs`: Zeitpläne, Geometrie, Scratch, Montage, Tonspur, Plätze im Rad, Partitur mit `dehnen`, Zusammenstellung mit Stellvertretern (mit Zettel und ORNA, nur Zettel, ohne Signatur).
- `tests/lab.e2e.mjs`: «Signatur (0.1.26)» rechnet am Telefon (412 px) eine Zusammenstellung mit Zettel und ORNA und prüft Stationen, Partitur, Tonspur und einzelne Bilder.
