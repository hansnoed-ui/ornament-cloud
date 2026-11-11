# ornament.bienne – Plan und Stand

Auftrag `bienne.md` (Christian, 10. November 2026): ein eigenständiger Stil für instrumentale Kompositionen aus Art-Rock, Post-Rock,
elektronischer Avantgarde, Minimal Music, Jazz und Kammermusik. Die Referenzen stehen für Verfahren und Eigenschaften, nicht für Stücke.
Es werden keine Songs, Riffs, Melodien, Akkordfolgen oder Klänge nachgebaut, und Bandnamen kommen in keinem Namen vor. Alle Klänge sind
synthetisch. Christians eigene Aufnahmen können später über die Klangsammlung dazukommen, nur lokal.

**Nichts gilt als gelungen, bevor Christian es gehört hat.** Alle Prüfungen hier sind technisch.

## Plan (Phasen, je ein PR, Merge nur mit OK)

| Phase | Inhalt | Stand |
|---|---|---|
| 1 | **Harmonik 0.1.0** (`kern/harmonik.js`): Vokabular, Modi, Stimmführung, harmonischer Rhythmus, Spannung, Generator, Voicings für Fläche, Klavier, Gitarre und Bass; dazu `lydisch`/`mixolydisch` in `LEITERN` und Noten als Ereignisse in `erzeugen.js` | **dieser PR** |
| 2 | **Metrum** (`kern/metrum.js`): zentrale Taktlänge `taktSek(tempo, taktart)` statt `240 / bpm`, Taktarten 3/4–12/8, Gruppierungen, echte Tuplets (rationale Zeiten), Polymetrik mit geplanten Treffpunkten, Humanisierung als Profil je Rolle (mit Korrelation) | offen |
| 3 | **Instrumente** als Proben: Gitarre (sechs Saiten auf der Karplus-Strong-Saite), E-Bass und Muted Bass (Bass 0.2.0), Drums 0.2.0 (Ghost-Stufen, Cross-Stick, Besen), Klavier (akustisch, präpariert), Streicherfläche, dunkler Mono-Lead | offen |
| 4 | **Interlocking** (Verteiler, Eigenständigkeit und Zusammengehörigkeit), **Echo 0.2.0** und Echos als Ereignisse im Plan | offen |
| 5 | **`kern/bienne.js`**: Profil, Ausprägung *Schichtung*, ganzer Track, drei Startwerte, Oberfläche | offen |

Ändert ein gemeinsamer Umbau (etwa die Taktlänge in Phase 2) den Klang alter Projekte, ist das erlaubt (Christian, 10.11.). Es wird
dann in `DECISIONS.md` vermerkt.

## Harmonik 0.1.0

**Datenmodell.** Ein Klang besteht aus `{ wurzel, intervalle[], bass }`, mit absoluten Tonklassen und Intervallen über der Wurzel.
Der Name wird aus der Struktur bestimmt (`akkordName`), z. B. `Cmaj7/E` oder `Dm9`, er wird nicht gespeichert. Das Voicing (konkrete
MIDI-Töne je Instrument) ist davon getrennt. Die Engine plant zuerst die Klänge, dann die Voicings.

**Vokabular.** Dur, Moll, vermindert, übermässig, maj7, m7, 7, m7b5, m(maj7), add9, m(add9), m9, maj9, 9, sus2, sus4, 7sus4, 6, m6, 6/9,
maj7#11, Quartschichtung, offene Quinte, 5add9, m11, dazu Umkehrungen und Slash-Bässe. Unbekannte Strukturen werden mit ihren Tönen
benannt. Verminderte Dreiklänge kommen nur als m7b5 vor. sus4 gibt es nur auf Stufen mit reiner Quarte.

**Modi und charakteristischer Ton** (Halbtöne über dem Zentrum):

| Modus | Ton | |
|---|---|---|
| Ionisch | 11 | grosse Septime |
| Lydisch | 6 | übermässige Quarte |
| Mixolydisch | 10 | kleine Septime |
| Dorisch | 9 | grosse Sexte |
| Äolisch | 8 | kleine Sexte |
| Phrygisch | 1 | kleine Sekunde |

Jede Grundidee enthält mindestens einen Klang mit dem charakteristischen Ton; fehlt er, wird ein Klang ersetzt. In Voicings, die den Ton
enthalten, wird er belohnt.

**Gewichtung der Modi** (`MODI[m].gewicht`, `modusWaehlen(rnd, gewichte)`): Wählt der Stil den Modus selbst, geschieht das nach Gewicht.
Ionisch hat Gewicht 0 (Christian, 11.11.2026, nach den Hörproben der Phase 1: «die ersten gefallen noch nicht so»): er wird nur gespielt,
wenn er ausdrücklich verlangt ist, bleibt aber als Tonvorrat und für geliehene Klänge erhalten. Die anderen fünf Modi sind gleich
gewichtet (20), bis weitere Urteile vorliegen; `kern/bienne.js` (Phase 5) kann die Gewichte je Ausprägung überschreiben.

**Vorrat** (Kandidaten-Graph):

- alle Stufen des Modus als Dreiklang, Septakkord, add9, sus2 und sus4
- **geliehen** (Modal Interchange): Septakkorde der parallelen Modi mit einem Ton, den der eigene Modus nicht hat
- **Medianten**: Dur und maj7 eine kleine oder grosse Terz über oder unter dem Zentrum
- **parallel**: Dur und Moll über demselben Grundton

**Grundidee (Zelle).** Zwei bis vier Klänge mit einer gespeicherten Eigenschaft:

| Art | Eigenschaft |
|---|---|
| `gemeinsamerTon` | ein Ton bleibt oben |
| `bassAbwaerts` | der Bass steigt stufenweise ab |
| `mediante` | hin und zurück über einen gemeinsamen Ton |
| `durMoll` | Dur und Moll über demselben Grundton |
| `orgelpunkt` | Zentrum im Bass |

Gewählt wird unter den Kandidaten nach gemeinsamen Tönen, Herkunft und charakteristischem Ton, mit dem Startwert unter den besten drei.

**Abwandlungen** (benannt):

- ersetzen (durch einen geliehenen Klang oder eine Mediante mit gemeinsamem Ton)
- Umkehrung (anderer Bass)
- erweitern (None) und reduzieren (Dreiklang)
- rotieren

«Wiederkehr» (0–100) bestimmt den Anteil wörtlicher Aussagen. Die erste Aussage ist immer wörtlich. Fällt die Wiedererkennbarkeit
(gemeinsame Tonklassen 70 %, Basskontur 30 %) unter 0,5, ist die nächste Aussage wieder wörtlich.

**Harmonischer Rhythmus.** Die Dauern sind unregelmässig, zum Beispiel 3 + 2 + ½ + 2½ Takte. «Wandel» macht sie kürzer. Ein Wechsel
kommt mit 25 % Wahrscheinlichkeit eine Achtel früher oder später (nie an Abschnittsgrenzen). In langen Klängen (ab 2 Takten) bewegt
sich zuerst eine Oberstimme um einen Schritt und später, ab 3 Takten, der Bass. Der Klang wird dabei neu gedeutet und benannt
(Ereignisart `oberstimme` bzw. `bass`), aber nur, wenn der neue Klang eine bekannte Struktur hat.

**Spannung** (0–1 je Klang), gewichtete Summe:

| Grösse | Gewicht | Bedeutung |
|---|---|---|
| Dissonanz | 0,35 | Halbton 1, Tritonus 0,8, Ganzton 0,35 je Tonpaar |
| Chromatik | 0,25 | Anteil leiterfremder Töne |
| Instabilität | 0,2 | Slash-Bass, Dominante, sus, vermindert; Tonika entspannt |
| Dichte | 0,1 | enge Sekunden im Voicing |
| ohne Grundton | 0,1 | Voicing ohne Grundton |

**Zielkurven je Abschnitt:**

- steigt, hält, fällt
- offen: steigt langsam, ohne Auflösung
- Plateau mit Ausreisser

Liegt eine Aussage mehr als 0,2 unter dem Ziel, wird sie erweitert, liegt sie mehr als 0,25 darüber, reduziert. «Auflösung» heisst hier
nie automatisch Dominante–Tonika.

**Stimmführung (Kostentabelle, `KOSTEN`):**

| Kriterium | Kosten |
|---|---|
| Bewegung | +1 je Halbton |
| Sprung über eine Quarte | +3 |
| Stimmkreuzung oder Überholen | +6 |
| Quint- und Oktavparallelen der Aussenstimmen | +4 (in Profil A schwächer: `parallelGewicht`) |
| gemeinsamer Ton gehalten | −2 |
| zu enge Lage unter E3 (enger als eine Quinte) | +5 |
| fehlende Terz | +4 |
| charakteristischer Ton im Voicing | −1,5 |

Der Regler **«glatte Stimmführung ↔ harmonischer Bruch»** (0–100) kehrt die Bewegungsgewichte um (Faktor 1 − 2·B). Bei 100 werden Sprünge,
Lagenwechsel und Fortschreitungen ohne gemeinsamen Ton belohnt. An Abschnittsgrenzen wirkt er voll, sonst zu 45 %. Er verändert auch die
Wahl der Klänge in der Zelle: Bei Bruch gewinnen Klänge mit wenigen gemeinsamen Tönen und geliehene Klänge. Gewählt wird mit dem
Startwert unter den besten drei Lagen (60 / 30 / 10 %).

**Lagen und Spielbarkeit:**

| Rolle | Lagen und Regeln |
|---|---|
| Fläche | E3–G5, 3–5 Stimmen; enge Lage, Drop-2, ohne Grundton, Quartenlage |
| Klavier | links Grundton, Quinte oder Oktave tief (C2–A3), rechts eng (G3–C6); je Hand höchstens eine None |
| Gitarre | Standardstimmung E2–E4, Bünde 0–15, höchstens vier Bünde Spannweite, Leersaiten bevorzugt, höchstens eine gedämpfte Saite zwischen klingenden, tiefster Ton = Bass des Klangs |
| Bass | einstimmig E1–E3, nächste Lage zum vorigen Ton |

Kann die Gitarre einen Klang mit seinem Slash-Bass nicht greifen, übernimmt diesen Bass die Bassstimme. Geht es auch ohne Terz nicht,
fällt der Klang auf der Gitarre weg.

**Prüfung:** `node tools/harmonik-pruefen.mjs 8`, sechs Modi × 8 Startwerte × vier Instrumente × Regler 0 und 100:

- keine Kreuzungen und kein Ton ausserhalb des Umfangs
- Gitarrengriffe greifbar
- mittlere Bewegung bei Regler 0: **1,5 Halbtöne** (Grenze 4)

Dazu kommen zwei Tests in `tests/composer.test.mjs`.

## Hörproben Phase 1

`node tools/bienne-hoerproben.mjs harmonik <ziel>`:

- je Modus ein Verlauf auf D, 12 Takte bei 90 BPM (zwei Abschnitte: steigt, Plateau)
- gespielt von Velvet Rhodes Haze (Klavier-Voicings, je Takt neu angeschlagen), Shadow Chord (Fläche) und Bass «Rund»
- Stimmführung 0 und 100, gleich laut (−16 LUFS)
- `harmonik.json` nennt die Grundidee, die Klänge mit Takt, die Rhodes-Töne und die Abwandlungen jeder Aussage

Die Gitarre gibt es erst in Phase 3, die Griffe sind aber schon berechnet.
