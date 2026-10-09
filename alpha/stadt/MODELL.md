# Die Stadt, die weitergeht – So funktioniert das Modell

Alpha, Stand 9. Oktober 2026. Ein vereinfachtes Denkmodell, keine wissenschaftlich validierte Prognose.

Ausgangspunkt: Klaus Kusanowskys Grafik «Urbane Paradoxien: Die Systematik der Stadt», erarbeitet mit NotebookLM. Er hat damit soziologische Literatur ausgewertet und eine gegliederte Übersicht erstellt – nach seinen Worten den Anfang für eine ausführlich-systematische Erarbeitung des Themas.
Beobachtungsraster: Christian Strickler, «Nebeneinander, Nacheinander» und «Der Verteilapparat des Körpers».
Diese Anwendung ist eine eigenständige, vereinfachende Weiterentwicklung. Daraus folgt keine Freigabe oder Mitautorenschaft.

## Starten

Die Seite liegt unter `alpha/stadt/` und braucht keinen Build. Lokal:

    node tools/serve-orma.mjs 8771      → http://localhost:8771/alpha/stadt/

Adresszusätze: `?seed=7` (Startwert), `?figuren=72` (8 bis 80), `?debug` (stellt `window.stadtTest` bereit).
Ohne Angabe: Startwert 7, 72 Bewohner:innen, auf schwächeren Geräten (≤ 4 Kerne oder ≤ 2 GB) 40.

## Dateien

| Datei | Inhalt |
|---|---|
| `stadtplan.js` | Knoten, Wege, Querungen, Strassen, Orte, Häuser; was es bei welcher Massnahme gibt |
| `modell.js` | Simulation: Zustand, Schritt, Figuren, Autoverkehr, Entscheidungen, Messungen, Protokoll, Massnahmen, Vergleichszweige |
| `fragen.js` | die Lagen und Wahlmöglichkeiten, die jev beurteilt hat, und die Ersatzregeln |
| `jev.js` | erzeugt mit `tools/build-jev-stadt.ts`, nie von Hand bearbeiten |
| `raster.js` | die beiden Raster als Beobachtungshilfen (liest nur) |
| `ansicht.js` | Zeichnung auf der Canvas (liest nur) |
| `app.js`, `index.html` | Bedienung und Seite |

## Ein gemeinsamer Zustand

Alles steht in `stadt.z` (einfache Daten, mit `structuredClone` kopierbar). Die vier Kapitel fragen dieselbe Stadt; es gibt keine getrennten Minispiele.

- **Takt:** 1 Sekunde Stadtzeit je Schritt, 06.00 bis 22.00 Uhr, die Nacht wird übersprungen. Die Bildrate bestimmt nur, wie viele Schritte je Bild gerechnet werden (1, 5 oder 30 Minuten je Sekunde).
- **Zufall:** `zufall(seed, kanal, …)` ist ein Hash, kein fortlaufender Strom. Jede Ziehung hängt an Kanal, Tag, Figur oder Zeitfenster. Darum verschieben zusätzliche Ziehungen in einem Vergleichszweig die übrigen Ereignisse nicht: Tagesprogramme, Passant:innen und Fahrten von aussen sind in allen Zweigen gleich. Entscheidungen einzelner Figuren zählen je Figur mit und können nach einem Eingriff auseinanderlaufen.
- **Vorlauf:** Beim Anlegen laufen zwei Tage nur Verkehr und ein ganzer Tag mit allen Figuren (Tag 0, «Vorlauf»). So haben Wahrnehmungen, Gewohnheiten und Bekanntschaften eine Vorgeschichte. Sichtbar beginnt Tag 1 um 07.30 Uhr.
- **Vergleich «vorher»:** Jede Massnahme merkt den Zustand unmittelbar davor. Der Zweig mit dem Eingriff wiederholt den Live-Lauf genau (Test), der Zweig ohne läuft aus derselben Ausgangslage weiter.

## Figuren

72 Bewohner:innen mit Wohnung, Tagesprogramm (Arbeit mit dem Bus, Kind zur Schule bringen und abholen, Einkauf im Laden, Besorgung am Kiosk, Park, Platz, Runden mit dem Hund, Offener Abend im Atelier), Gehgeschwindigkeit, Kraft (Pausen auf Bänken), Zeitdruck (täglich neu gezogen), Wegwissen (Durchgang und Trampelpfad muss man erst entdecken), Glauben über die Strasse (wird nur am Ort selbst berichtigt), erwarteten Wartezeiten, Gewohnheiten, Bekanntschaften und einer kleinen Erinnerung.
Unterwegs mit Rollstuhl, mit Kinderwagen oder mit Pausenbedarf: jede Art kommt sicher mehrmals vor; sie wird nach Nummer verteilt, nicht nach Namen. Namen sagen nichts über Verhalten.

Dazu Passant:innen von ausserhalb (50 bis 200 je Stunde): Sie gehen von Rand zu Rand oder von der Haltestelle zur Schule, entscheiden an der Strasse nach denselben Regeln, kennen die Strasse so, wie sie beim Betreten ist, und haben kein Gedächtnis.

## Entscheidungen und jev

**Querung der Hauptstrasse.** Wer auf die andere Seite muss, berechnet (nach dem, was er oder sie glaubt) den Weg über eine ebenerdige Querung, über eine Brücke und direkt zwischen den Autos. Die Lage wird beschrieben: Mehrzeit gegenüber dem direkten Weg (kurz unter 1 Minute, mittel 1–3, lang über 3), Art der Brücke, Verkehr ausserhalb der Querungen (ruhig, dicht, Zaun), Zweck (verschiebbar, fester Termin, Freizeit), Ersatzziel auf der eigenen Seite. Zu dieser Lage und der Person (zügig, eilig, Pausenbedarf, Rollstuhl, Kinderwagen, mit Kind) schlägt das Modell Wahrscheinlichkeiten nach und zieht. Gewohnheit: Wer dieselbe Wahl oft ohne schlechte Erfahrung getroffen hat, wiederholt sie mit einer Wahrscheinlichkeit bis 0,9, ohne neu abzuwägen; sie verblasst um 7 % je Tag ohne Gebrauch.

**Fahrten von aussen.** Je 5 Minuten und Richtung kommen mögliche Fahrten (Arbeitswege und verschiebbare Fahrten; Spitzen morgens nach Westen, abends nach Osten). Wahl: Auto, Bus, ruhigere Zeit, auslassen. Grundlage ist die wahrgenommene Fahrzeit: halb die Erfahrung derselben Stunde an den Vortagen (gleitend, 45 % neu), halb die aktuelle Lage (gleitendes Mittel der letzten Fahrten plus Rückstau). Zwischen den beschriebenen Lagen wird linear übergeblendet. Trägheit: Nur 35 % überlegen täglich neu, die übrigen fahren wie am Vortag. Wer die Nordstrasse kennt, nimmt sie, wenn sie schneller scheint; das Wissen wächst, wenn die Hauptstrasse in der Spitze zäh ist, und durch Weitererzählen.

**Offener Abend.** Um 16.30 Uhr entscheiden Interessierte nach den Bedingungen des Ateliers (Gebühr, Anmeldung, Einladung, Zeit, Rollen) und ihrer Lebenslage (knappes Budget, Kinderbetreuung, neu im Quartier, Arbeit bis 19 Uhr, Zeit und Interesse). Eine Einladung durch Bekannte entsteht aus Begegnungen und bindet an die einladende Person.

**Woher die Wahrscheinlichkeiten kommen.** jev (api.typesafe.ai, Modell jev-1.13.0) hat am 9. Oktober 2026 beim Bauen 377 beschriebene Lagen eingeschätzt (rund 450 000 Eingabe-Token, etwa 2 Cent). jev ist ein Beurteiler: Er gibt zu vorgegebenen Wahlmöglichkeiten Wahrscheinlichkeiten. Das ist ein Sprachmodell-Urteil über plausible Reaktionen, keine gemessene Häufigkeit. Unmögliche Wahlen (Treppen mit Rollstuhl oder Kinderwagen) werden nicht gefragt. Die Seite ruft jev nie auf und sendet nichts; fehlt `jev.js` oder passt die Prüfsumme nicht zu `fragen.js`, gelten einfache Ersatzregeln (Abwägung von Zeit, Zweck und Lage), und die Seite sagt es.

    NODE_USE_ENV_PROXY=1 node --experimental-strip-types --no-warnings tools/build-jev-stadt.ts            voller Lauf
    NODE_USE_ENV_PROXY=1 node --experimental-strip-types --no-warnings tools/build-jev-stadt.ts --probe    drei Beispiele

Zugang beim Bauen: ein Proxy, der den Schlüssel einsetzt, oder `TYPESAFE_API_KEY` in der Umgebung (nie in eine Datei).

## Autoverkehr

Zwei Strassen von Rand zu Rand, Autos folgen einander (Abstand, Beschleunigung), halten an Rot und am besetzten Zebrastreifen. Ampel bei der Haltestelle (Umlauf, Autogrün, Fussgrün in Sekunden): heute 90/35/20, mit zusätzlicher Spur 90/45/15, Tempo 30 60/25/20, Schnellverbindung mit Ampel 100/60/15; mit Brücke keine Ampel. Tempo 50, Schnellverbindung 60, Tempo 30 mit Pförtnerampel (ein Auto je 8 Sekunden und Richtung). Nordstrasse rund 34 km/h mit Verlangsamung an drei Kreuzungen. Rand des Modells: Stehen vor dem Quartier mehr als 150 Autos, weichen weitere auf andere Strassen der Region aus (gezählt als «umgeleitet»).

Regionale Nachfrage (verschiebbare Fahrten): gering 0,25, mittel 1, hoch 3 (Faktor). Was beobachtet wurde (Startwert 7 und 11): Die zusätzliche Spur senkt die Spitzenfahrt am ersten Tag (rund 75 s auf 60 s); danach fahren über Tage deutlich mehr Autos (in der Spitze bis rund drei Viertel mehr), weniger nehmen den Bus. Bei geringer Nachfrage bleibt die kürzere Fahrzeit, bei hoher Nachfrage steigt sie langsam wieder. Die Nordstrasse wird ohne Eingriff allmählich zum Schleichweg; mit der Spur verliert sie ihn, mit Tempo 30 auf der Hauptstrasse bekommt sie viel mehr. Ist die Wahl unabhängig von der Fahrzeit (Gegenprobe im Test), entsteht nach der Spur keine zusätzliche Nachfrage.

## Messset

Je Tag: Autos je Stunde und Strasse, Fahrzeitverteilung, Wahl der Fahrten von aussen; abgeschlossene, ersetzte und aufgegebene Wege der Bewohner:innen mit modelliertem Grund, nach Art der Fortbewegung; Wartezeiten an Querungen; Aufenthaltsminuten und Begegnungen (flüchtig, Gespräch, Störung) je Ort; Zählungen am Laden, an der Querung, im Park und im Durchgang; Offener Abend (erreicht, anwesend, beteiligt, mitbestimmend, nach Lebenslage); Kurzbefragung am Laden (40 % der Ankommenden) und an der Haustür (sechs Wohnungen je Abend, die Hälfte macht mit), gekürzt auf sieben Kategorien. Keine Glücksvariable, keine Gesamtnote.

Sichtweisen bekommen nur ihre Daten. Was nur das Modell weiss (alle Wege, Gespräche, Umwege einzelner), heisst «Modellblick» und ist keine Messung.

## Was entsteht, ohne dass jemand eingreift

Gewohnheiten, Bekanntschaften, Treffpunkte (an drei Tagen nacheinander mehrere Gespräche an einem Ort), ein Trampelpfad über die Parkwiese, der Schleichweg durch die Nordstrasse, Einladungen durch Bekannte. Nichts davon wird als gut oder schlecht ausgegeben. Es gibt keinen Knopf «Gemeinschaft erzeugen».

## Zurücknehmen ist nicht Zurücksetzen

«Nur Massnahme zurücknehmen» stellt die Strasse wieder her. Was die Figuren erlebt, gelernt und sich angewöhnt haben, bleibt, bis eigene Erfahrung es ändert: Sie glauben die Strasse im veränderten Zustand, bis sie wieder dort vorbeikommen; Gewohnheiten verblassen langsam; Fahrten von aussen kennen die Fahrzeiten der Vortage. «Lauf zurücksetzen» löscht alles. Das ist eine ausdrückliche Annahme dieses Modells, keine Behauptung, reale soziale Folgen seien grundsätzlich irreversibel.

## Prüfraster «Nebeneinander und Nacheinander» – Kurzkarte zur eigenen Operation

Anwendungsprompt 3.2.0, Ausgabeform «kurz». Auswertungsrahmen: Einzelanalyse (Auswahlprüfung: nicht angewandt).

1. **Fall:** diese Simulation; **Operation:** Rücknahme einer Massnahme ohne Zurücksetzen des Laufs; **Untersuchungseinheit:** ein Lauf (Startwert 7, 72 Figuren) mit Schnellverbindung samt Rampenbrücke an Tag 2 und 3, Rücknahme an Tag 4 um 06.00 Uhr; **Zeitraum:** Tag 1 bis 4; **relevante Folge:** Wege der Figuren und Verkehr nach der Rücknahme.
2. **Register: Vollzug**, weil das ausgeführte Programm untersucht wird und sein Lauf protokolliert vorliegt (M1: Protokoll und Tagesbilanzen des Laufs; M2: `tests/stadt.test.mjs`). Der Befund betrifft das Programm, nicht reale Städte.
3. **X (Verräumlichung): 5.** Feste Orte, Zählstellen und Tagesbilanzen; derselbe Startwert und der gemerkte Zustand führen gezielt an dieselbe Stelle zurück, der Zweig mit dem Eingriff wiederholt den Lauf genau (M2, Test «Vergleich vorher»).
   **Y (Verzeitlichung): 4.** Nach der Rücknahme gingen am selben Vormittag 8 Figuren weiter zum Ersatzziel oder liessen Wege aus (M1, Protokoll Tag 4, 10.00 Uhr); einen Tag später waren es 23 Figuren mit 29 solchen Wegen, 13 glaubten die Strasse noch verändert, 18 hatten eine feste Gewohnheit abseits der Ampel; über die Hauptstrasse fuhren 16 765 Autos statt 14 560 am Tag vor dem Eingriff (M1). Nicht 5, weil Gewohnheiten und Irrtümer im erklärten Umfang verblassen und «Lauf zurücksetzen» alle Folgen aufhebt.
4. **Voraussetzung, benannt:** Das Gedächtnis der Figuren ist eine Setzung des Modells; die Seite zeigt sie, untersucht ihre Herkunft aber nicht. Konsequenz: Der Befund gilt für dieses Modell, nicht für Menschen.
5. **Gegenlesart:** Wer als Einheit nur die Strasse (Massnahmenzustand) nimmt, findet nach der Rücknahme den Ausgangszustand, also kaum Verzeitlichung. Das ist ein anderer, für die Wege der Figuren zu enger Zugriff; abweichende Koordinaten wären kein Widerspruch.
6. **Offen:** ob mehrere Läufe mit anderen Startwerten ähnlich ausfallen (Auswahlprüfung mit zweitem Startwert); wie lange die Folgen über Tag 5 hinaus bleiben.

Feldtendenz: Doppelspalt – keine Bestnote und keine Sollposition. Kurzfassung – die vollständige Prüfung (acht Fragen, Zusatzprüfung, Rückkehrprobe) liefere ich auf Nachfrage. Die Rückkehrprobe rechnet die Seite unter «Modell → Genauer hinsehen» für jede Rücknahme im eigenen Lauf.

## Quellen

Aus der Grafik (Inspiration und Untersuchungsmaterial; die Modellregeln sind daraus nicht belegt):
- Frank Eckardt (Hg.), Handbuch Stadtsoziologie, 2012. Relevante Beiträge: Annette Harth, «Stadtplanung», S. 337–364; Detlef Sack, «Urbane Governance», S. 311–335; Sybille Frank, «Eigenlogik der Städte», S. 289–309. https://doi.org/10.1007/978-3-531-94112-7
- Eberhard Brandt, Manfred Haack, Bernd Törkel: Verkehrskollaps. Diagnose und Therapie, 1994.
- Martin Burkhardt: Die gesellschaftlichen Kosten des Autoverkehrs, 1980.
- Christian Ude (Hg.): Titel in der Grafik nicht genannt, offen.
- J. G. Ballard: Concrete Island / Die Betoninsel, Original 1974; die Grafik nennt 1979, die verwendete Ausgabe ist ungeklärt.
- Hanif Kureishi: The Buddha of Suburbia / Der Buddha aus der Vorstadt, 1990. Die Szene mit der vorgegebenen Rolle ist eine erfundene Modellszene, kein Zitat.

Empirische Anregungen: Anciaes und Jones (2016), «Pedestrians avoid busy roads», https://discovery.ucl.ac.uk/id/eprint/1496266/ · Mindell et al. (2017), Triangulation zur Messung von Trennwirkung, https://discovery.ucl.ac.uk/id/eprint/1542116/ · Jane Jacobs (1958), «Downtown is for People».

Im Raster «Nebeneinander und Nacheinander» bleiben Koordinaten für diese Werke offen: Als Material liegt nur die Grafik vor, und ein Titel ist noch kein gelesener Beleg.

## Grenzen

- Ein Lauf ist kein Kausalnachweis; die Zahlen sind nicht kalibriert und gelten für keine reale Stadt.
- Die Entscheidungsneigungen sind Urteile eines Sprachmodells über beschriebene Lagen, keine Beobachtungen.
- Nicht modelliert: Unfälle und Sicherheit beim Queren zwischen den Autos, Lärm über das Verweilen hinaus, Mieten und Wegzug, Wetter, Wochenenden, Einspruch gegen Planungen (im Verteilapparat «offen»).
- Glaubwürdigkeit von Auskünften bildet das Modell nicht ab.

## Tests

    node --experimental-strip-types --no-warnings --test tests/stadt.test.mjs     (rund eine Minute)
    NODE_PATH=$(npm root -g) node tests/stadt.e2e.mjs
