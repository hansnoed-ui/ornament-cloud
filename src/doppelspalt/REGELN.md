# Nebeneinander, Nacheinander – geltende Regeln

Stand: 26. September 2026 · 326 Konstellationen

Diese Datei ersetzt den Masterprompt als verbindliche Grundlage. Der Masterprompt liegt als
[`CLAUDE-CODE-MASTERPROMPT-2026-ARCHIV.md`](CLAUDE-CODE-MASTERPROMPT-2026-ARCHIV.md) im Archiv
und dokumentiert den Entstehungsstand.

## 0. Vorrang

- Bei einem Konflikt zwischen diesen Regeln und einem aktuellen Auftrag gilt der Auftrag.
- Der Konflikt wird aber zuerst benannt, und es wird auf Freigabe gewartet. Er wird nie
  stillschweigend aufgelöst.
- Freigegebene Klärungen werden hier nachgetragen (siehe 6a, 8, 9, 12 und 14).

## 1. Werk

- Titel: **Nebeneinander, Nacheinander**. «Doppelspalt der Wahrnehmung» ist der Begriff hinter dem
  Werk, nicht sein Titel.
- Ein konzentrisches Doppelrad: aussen 20 Künstler:innen, innen 20 Theoretiker:innen, gegenläufig,
  eine gemeinsame Achse.
- Keine Quiz-, Test-, Rangfolge-, Matching-, Casino- oder KI-Textmaschine. Eine Konstellationsmaschine.
- **Das Rad erzeugt keine Antworten. Es erzeugt Konstellationen.**

## 2. Bestand

- Der Möglichkeitsraum ist genau der kuratierte Bestand: zurzeit **326 Konstellationen** von
  400 rechnerisch möglichen Paarungen.
- Quelle ist die redaktionelle CSV, die in `manifest.json` → `editorialFile` steht.
- Übernahme nur über `tools/import-konstellationen.ts` und danach `tools/sync-doppelspalt-data.ts`.
  `js/data/*.js` wird nie von Hand bearbeitet.
- Jedes Personenpaar kommt genau einmal vor. Die Nummerierung ist lückenlos ab 1.
  Nur gültige Personen-IDs.
- 20 + 20 Personen und ihre IDs bleiben unverändert.
- Texte und Fragen werden nie umgeschrieben, gekürzt, ergänzt, übersetzt oder neu erzeugt.
  Die Schreibweise des Korpus bleibt, auch «ß».
- Im Code steht keine feste Korpusgrösse. Massgeblich ist die Länge des Bestands.
- Redaktionsgeschichte und Importgeschichte sind verschiedene Reihen. Redaktionell wuchs der Bestand
  in sechs Stufen: 99, 165, 205, 246, 286, 326 (Lieferung 2: 246 + 40 = 286, Lieferung 3: 286 → 326).
  Ins Repository übernommen wurden 99, 165, 205, 246 und 326; der Zwischenstand 286 wurde nie
  synchronisiert. Der Werkbericht folgt der Redaktionsgeschichte.

## 3. Auswahl

- Reihenfolge: kuratierter Bestand → ein Datensatz zufällig → Zielwinkel beider Ringe →
  Bewegung → Stillstand → Text → offene Frage.
- Nie: das 20 × 20-Produkt bilden, aus 400 ziehen, auf Gültigkeit prüfen oder eine Ziehung reparieren.
- Gleichverteilt über den ganzen Bestand, mit `crypto.getRandomValues` und Rejection Sampling.
  Keine Gewichtung nach Geschlecht, Bekanntheit, Person, Thema oder Häufigkeit.
- Einzige Ausnahme: derselbe Datensatz nie zweimal unmittelbar hintereinander.
- Die Geste bestimmt nur den Weg (Richtung, Kraft, Umdrehungen, Dauer), nie das Ergebnis.
- `editorialNumber` dient nur der Redaktion, nie der Auswahl.

## 4. Bewegung

- 20 Plätze à 18° pro Ring, Achse oben.
- Gegenläufig, mit unterschiedlichen Umdrehungen, Dauern und Auslaufkurven. Keine sichtbare Korrektur.
- Die Bewegung verrät das Ziel nicht vorzeitig. Die Zukunft bleibt unsichtbar.
- Übliche Dauer 3–6 s, nie unter 1,5 s, selten über 7 s.
- Die nächste Drehung beginnt aus der erreichten Stellung. Nie auf null zurücksetzen.
- Zustände: `idle`, `dragging`, `spinning`, `settling`, `selected`.
  Während `spinning` und `settling` gibt es keine neue Ziehung.
- Die Vergangenheit hinterlässt höchstens eine feine, verblassende Spur.

## 5. Gestaltung

- Kunstpublikation × wissenschaftliches Gerät × poetisches Instrument.
- Farben, Schriften und Abstände aus den Variablen in `styles.css`. Weiss, Schwarz und Grautöne.
  Keine Flächen und keine Farbakzente ausser den vorhandenen.
- Dünne Linien, zurückhaltend. Kein Neon, Chrom, Glanz, Schatten, Konfetti, Spiel-HUD oder KI-Futurismus.
- Präzision vor Spektakel, Weissraum vor Bedienelementen.

## 6. Zeichen und Namen

- 40 abstrakte Zeichen aus einer Grammatik. Keine Porträts, Werkabbildungen, Emojis oder Initialen.
- **Die Zeichen sind Adressen, keine Illustrationen.**
- Auf dem bewegten Rad haben die Zeichen Vorrang. Namen erscheinen nach dem Stillstand, dezent,
  nahe der Achse.
- Ergebnis im Format **Agnes Martin × Niklas Luhmann**. Immer «×», nie «versus», «Match» oder «Gewinner».

## 6a. Namen am Rad und Legende (Entscheidung zu Paket 3)

- **Am Rad** erscheinen nur die Namen der beiden getroffenen Plätze, nach dem Stillstand, und sie
  verschwinden beim Beginn der nächsten Drehung, gleich wie der Text (§7). Kein Mitlaufen, kein Lesefenster.
- Künstler:in: tangential ausserhalb des Aussenrands, neben der Achsenmarke.
  Theoretiker:in: tangential an der Innenkante des Innenrings, unter dem getroffenen Platz.
  Die Mitte bleibt leer.
- Grundsatz: Die Beschriftung gehört zum Zeichen, nicht zur Achse. Der vollständige Name steht
  ohnehin im Ergebnis.
- **Alle 40 Namen** stehen nicht auf den Ringen, sondern in einer Legende unter dem Rad: jeder Name
  neben seinem Zeichen, in Ringreihenfolge, zwei Spalten für Aussen- und Innenring. Voreingestellt
  geschlossen, mit einem Schalter «Namen zeigen».
- In der Legende werden ausschliesslich die beiden gezogenen Namen hervorgehoben, und erst beim
  Stillstand. Die Hervorhebung läuft nicht während der Drehung mit.
- Begründung: Bei 375 px Breite (Rad 355 px, Schrift 11 px) stehen pro Platz aussen etwa 53 px,
  innen 20–30 px zur Verfügung. Einzelne Vollnamen brauchen bis etwa 125 px. Alle 40 Namen lesbar und
  ohne Überlappung auf den Ringen gehen nicht, innen auch als Nachnamen nicht. Eine mitlaufende
  Beschriftung würde das bewegte Rad unruhig machen und den Zeichen den Vorrang nehmen (§6).

## 7. Ergebnis

- Nach dem Stillstand: kurze Pause, Namen, Text, Frage mit zusätzlichem Weissraum,
  dann die Knöpfe.
- Kein dramatischer Auftritt. Die Frage steht ohne Etikett.
- Während der Bewegung steht kein Text. Beim nächsten Spin verschwindet der alte Text.

## 8. Zählen (Klärung zu §17 des Archivs)

Auf der Radseite keine Fortschritts-, Gesehen- oder Restanzeige und keine Spielmechanik. In Feldansicht und Werkbericht sind 400 und 326 Werkaussagen und ausdrücklich erwünscht.

## 9. Teilen (Klärung zu §16 des Archivs)

Ein Teilen- oder Kopierlink ist erlaubt, klein und unterstrichen im Stil von "noch einmal drehen", nicht hervorgehoben.

Die Adresse jeder Konstellation ist `?pair=<id>`. Nach jeder Drehung wird sie per
`history.replaceState` gesetzt, nie per `pushState`.

## 10. Zugänglichkeit

- Smartphone hochkant zuerst, dann Tablet, dann Desktop. Kein horizontales Scrollen.
- Das Rad ist fokussierbar. Enter und Leertaste drehen.
- `prefers-reduced-motion`: kurze Bewegung mit gleichem Ergebnis. Kein Ein- und Ausblenden,
  nur an oder aus.
- Die Ringe bleiben `aria-hidden`, die 40 Zeichen sind keine Leseliste. Die Semantik tragen
  Ergebnis, Laufband und Feldansicht.
- Nach dem Stillstand sagt die Live-Region «Konstellation: A und B.» an, nie den ganzen Text.

## 11. Technik

- Reines HTML, CSS und ES-Module. Keine neuen Abhängigkeiten, keine CDNs, kein Framework.
- Daten, Geometrie, Zufall, Bewegung und Darstellung bleiben getrennt.
- Kommentare auf Deutsch. Bei geänderten Dateien wird `?v=` hochgezählt.
- Diagnose nur mit `?debug`.
- Die Tests in `tests/` müssen durchlaufen. Neues Verhalten bekommt Tests.
- Keine Forschungs- oder Quellenlinks in den Konstellationstexten (Text und Frage).
  Das Verbot gilt nicht für die Dokumentation: Im Literaturverzeichnis des Werkberichts sind Links
  und DOIs erwünscht, gesetzt dort, wo sie im Projektpaper vorhanden sind.

## 12. Feldansicht und Lückenbewertung

- Die Feldansicht (`feld/`) zeigt alle 400 Stellen: die kuratierten Konstellationen und die freien
  Felder. Sie wird aus denselben Daten erzeugt wie das Rad (`tools/build-feld.ts`).
- Zeilen und Spalten stehen in der Reihenfolge der Ringe, nicht alphabetisch.
- Die Bewertung der freien Felder (`redaktion/gaps.csv`, `mittel` | `schwach`) ist als Struktur
  vorbereitet. Die Klassen `feld-gap--mittel` und `feld-gap--schwach` werden gesetzt, bekommen aber
  vorerst keine sichtbare Auszeichnung. Begründung: Eine Bewertung ohne die Begründung daneben liest
  sich als Urteil über die genannte Person. Sichtbar wird sie erst als zuschaltbare Ebene mit
  erklärendem Satz.

## 14. ORMA (freigegeben am 27. September 2026)

ORMA ist eine eigenständige zweite App neben ORNA: ein Kunst- und Denkspiel für zwei Personen an einem
Gerät, auf Grundlage des Werks. Dazu kommt der Modus **allein (Re-Entry)** (freigegeben am 27. September
2026): Eine Person antwortet und lässt die Schleife offen. Bringt das Rad dieselbe Konstellation durch
Zufall wieder, antwortet sie noch einmal (derselbe Auftrag, ohne die erste Antwort zu sehen), deckt beide
auf und hält den dritten Gedanken fest. Offene Schleifen werden bei der Ziehung nicht bevorzugt; es gibt
keinen Mindestabstand. Nach dem zweiten Durchgang ist eine Schleife geschlossen; kommt die Konstellation
danach wieder, beginnt eine neue. Quelle, Build und Dokumentation: `src/orma/` (README dort).

- **Geltung:** §3 (Auswahl über den ganzen Bestand) und §8 (keine Spielmechanik auf der Radseite)
  gelten für ORNA. ORMA ist ausdrücklich ein Spiel, aber ohne Punkte, Ranglisten, Streaks,
  Zeitdruck und ohne Bewertung von Antworten. Alle übrigen Regeln gelten sinngemäss.
- **Auswahl:** ORMA zieht aus 48 freigegebenen Pilot-Konstellationen
  (`src/orma/redaktion/pilot.json`; erweitert von zwölf auf 24 und auf 48 am 27. September 2026). Die
  erste Ziehung erfolgt gleichverteilt, danach ist die zuletzt gezeigte ausgeschlossen, und es wird
  gleichverteilt aus den übrigen 47 gezogen. Gezogen wird ein
  ganzer Datensatz, die Radstellung folgt daraus; die Geste bestimmt nur den Weg.
- **Texte:** Paarung, Originaltext, Originalfrage und IDs bleiben unverändert und werden immer mit
  angezeigt (§2 gilt). Neu hinzu kommen je Konstellation ein Einstieg (40–70 Wörter, aus dem
  Originaltext abgeleitet) und drei Spielaufträge (Beispiel, Einwand, Gestaltung), für den Modus allein
  zusätzlich in der Du-Form. Sie liegen getrennt
  vom Bestand, sind als ORMA-Redaktion gekennzeichnet, sind keine Zitate und keine Äusserungen der
  genannten Personen und gelten als Entwurf, bis sie freigegeben sind. Die App erzeugt zur Laufzeit
  keine Texte (§1).
- **Symbol, Startbild und Vorschaubild** (freigegeben am 27. September 2026, Ausnahme zu §5): dasselbe
  Motiv und dieselbe Startanimation wie ORNA, vertikal in der Mitte geteilt – links schwarz auf weiss,
  rechts weiss auf schwarz. Die schwarze Hälfte ist die einzige Fläche; die App selbst bleibt ohne Flächen.
- **Trennung:** eigene Kennung, eigener Service Worker und Cache (`orma-`), eigener Speicher
  (`orma:`). ORMA verändert keine ORNA-Dateien und keine ORNA-Daten.
- **Veröffentlichung:** Bis zur Freigabe liegt ORMA als Alpha-Version unter `alpha/orma/`: öffentlich
  erreichbar, nicht in der Sitemap und für Suchmaschinen gesperrt (Entscheid vom 27. September 2026,
  ersetzt «bleibt auf dem Branch `orma`»). Verlinkt wird ORMA nur von der Seite «Apps» (`apps/`) und aus
  den News, stets als Alpha gekennzeichnet (freigegeben am 27. September 2026; bis zur Neuordnung vom
  2. Oktober 2026 stand der Link auf der Startseite). Aus den News verlinkt werden ausserdem die Seiten der
  beiden Grundlagenpapiere `alpha/pruefraster/` und `alpha/verteilapparat/` (freigegeben am
  28. September 2026). Alle vier Prüfraster verlinkt die Seite «Masterprompts» (`masterprompts/`, als Alpha
  gekennzeichnet; seit dem 29. September 2026 standen sie auf der Startseite), OMNA COLOR und das Dritte Rad
  die Seite «Web» (`web/`, als Alpha gekennzeichnet; Wunsch von Christian, 2. Oktober 2026). Die Startseite
  verlinkt keine Alpha-Seite mehr; andere Seiten verlinken den Alpha-Bereich nicht (Ausnahme: die
  Navigation oben links, siehe unten). Aktualisiert wird die
  Alpha-Version mit `node --experimental-strip-types tools/build-orma.ts --alpha`.
- **Menü und Seiten** (Neuordnung vom 2. Oktober 2026, Wunsch von Christian): Die Startseite trägt den Titel
  «Raumstellen, Zeitobjekte», darunter das Stellenfeld (`werke/stellenfeld/`), in die Seite eingebettet und
  kein Beitrag; sonst nichts (die Rückmeldungen über giscus sind auf Wunsch vom 2. Oktober 2026 entfernt).
  Das Menü in der Kopfzeile hat vier Einträge, nur Text, in der serifenlosen Schrift der Seite, ohne die
  kleinen Animationen: «Zettelkasten» (führt direkt in den Zettelkasten, `zu-seiner-zeit/`), «Apps» (`apps/`:
  ORNA, ORMA), «Masterprompts» (`masterprompts/`: die vier Prüfraster in der bisherigen Reihenfolge) und
  «Web» (`web/`: OMNA COLOR, Das Dritte Rad). Der Eintrag der aktuellen Seite ist unterstrichen
  (`aria-current`; auf den ORNA-Seiten «Apps»). News, Termine und Portfolio bleiben unter ihren Adressen und
  tragen das neue Menü, sind aber nirgends mehr verlinkt (Entscheid vom 2. Oktober 2026). Das eingebettete
  Stellenfeld ist die drehbare 3D-Ansicht selbst: Ziehen dreht, senkrechtes Wischen und das Mausrad blättern
  die Seite, Strg + Mausrad zoomt, die Tastenkürzel sind aus (die Leertaste blättert), im Vollbild gilt alles
  wie auf der eigenen Seite, ausserhalb des Bildes rechnet die Szene nicht, bei «weniger Bewegung» steht sie
  still. Aufbau und Verhalten halten `tests/struktur.test.mjs` und `tests/struktur.e2e.mjs` fest.
- **Navigation oben links** (freigegeben am 2. Oktober 2026, Ausnahme zu «andere Seiten verlinken den
  Alpha-Bereich nicht»): Jede Seite trägt oben links «Ornament Cloud» (zur Startseite) und darunter
  «Das Dritte Rad» (zum Start des Rads, `alpha/drittes-rad/`). Das ist der einzige Alpha-Link, den alle
  Seiten haben. Die frühere Zeile «Ornament Cloud · Alpha» entfällt, ebenso der Link «← Zur Alpha-Übersicht»
  unten auf den Alpha-Textseiten: Die Alpha-Übersicht `alpha/` ist von keiner Seite verlinkt (Entscheid
  von Christian am 2. Oktober 2026) und nur per Adresse erreichbar. Ausgenommen sind ORMA (eigene App,
  siehe Trennung), die drei Werke unter `werke/` (Vollbild) und die Weiterleitung `portfolio/rad-von-zeit-und-raum/`.
  Die Gestaltung folgt der jeweiligen Seitenfamilie (`styles.css`, `zu-seiner-zeit/zsz.css`, bei OMNA COLOR
  und beim Dritten Rad in der Seite selbst). Die beiden Links sind farblich getrennt («Ornament Cloud» orange,
  «Das Dritte Rad» violett) und auf jeder Seite gleich gesetzt wie auf der Website (Schrift der Website, 0,8 rem,
  Gewicht 600, Grossbuchstaben, Laufweite 0,12 em; Wunsch von Christian, 2. Oktober 2026). Beide sind Buttons
  mit ganz feinem Rahmen (1 px, Pillenform, gleich breit); der aktive ist markiert (`aria-current`) und invers gesetzt
  (Fläche und Rahmen in der Farbe des Buttons, die Schrift in der Farbe der Seite, Kontrast ab 4,5): im Rad
  «Das Dritte Rad», auf allen anderen Seiten «Ornament Cloud» (Wunsch von Christian, 2. Oktober 2026). Aufbau, Farben, Rahmen, Markierung,
  Grösse und Ausnahmen hält `tests/navigation.test.mjs` fest.

## 13. Nicht mehr gültig (aus dem Archiv)

- 99 Konstellationen, fünf doppelte Personenpaare und `DATA-REVIEW.md` als offene Prüfung:
  erledigt und überholt.
- Pflicht-Einführungstext «Der Doppelspalt der Wahrnehmung» mit «mehr lesen»: auf Wunsch entfernt.
- «Noch keinen prominenten Teilen-Knopf»: ersetzt durch Klärung 9.
- «Niemand muss die Anzahl kennen»: eingeschränkt durch Klärung 8.

## Schluss

Stabilisiere die Anordnung. Lass ein Ereignis geschehen. Zeige die entstandene Differenz.
Schliesse sie nicht.
