# Nebeneinander, Nacheinander – geltende Regeln

Stand: 26. September 2026 · 326 Konstellationen

Diese Datei ersetzt den Masterprompt als verbindliche Grundlage. Der Masterprompt liegt als
[`CLAUDE-CODE-MASTERPROMPT-2026-ARCHIV.md`](CLAUDE-CODE-MASTERPROMPT-2026-ARCHIV.md) im Archiv
und dokumentiert den Entstehungsstand.

## 0. Vorrang

- Bei einem Konflikt zwischen diesen Regeln und einem aktuellen Auftrag gilt der Auftrag.
- Der Konflikt wird aber zuerst benannt, und es wird auf Freigabe gewartet. Er wird nie
  stillschweigend aufgelöst.
- Freigegebene Klärungen werden hier nachgetragen (siehe 8 und 9).

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
- Keine Forschungs- oder Quellenlinks im Werktext.

## 12. Nicht mehr gültig (aus dem Archiv)

- 99 Konstellationen, fünf doppelte Personenpaare und `DATA-REVIEW.md` als offene Prüfung:
  erledigt und überholt.
- Pflicht-Einführungstext «Der Doppelspalt der Wahrnehmung» mit «mehr lesen»: auf Wunsch entfernt.
- «Noch keinen prominenten Teilen-Knopf»: ersetzt durch Klärung 9.
- «Niemand muss die Anzahl kennen»: eingeschränkt durch Klärung 8.

## Schluss

Stabilisiere die Anordnung. Lass ein Ereignis geschehen. Zeige die entstandene Differenz.
Schliesse sie nicht.
