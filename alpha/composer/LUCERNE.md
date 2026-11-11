# ornament.lucerne 0.1.0

Stilprofil `ornament.lucerne`, Schema 0.1.0 (Auftrag von Christian, 10. November 2026). Warme, leicht instabile Melodik aus eigenen
Aufnahmen, gebrochene, präzise gesetzte Rhythmen, ein wiederkehrendes Motiv, das sich verwandelt. Boards of Canada und Aphex Twin sind
Bezugspunkte für den Umgang mit Material. Die Regeln hier sind ein eigener Entwurf und keine Nachbildung.

**Gehört habe ich nichts.** Alle Angaben sind gemessen (librosa, Demucs, `kern/klangsammlung.js`) oder geschätzt. Ob es klingt,
entscheidet Christian beim Hören.

## Bausteine

| Datei | Aufgabe |
|---|---|
| `kern/klangsammlung.js` | Quellen (stabile ID aus SHA-256), Analyse, Ausschnitte mit Original-Zeitmarken, Varianten mit Eltern-Kette, Suche, «Quelle ersetzen» prüfen |
| `kern/sampler.js` | Sampler 0.1.0: Ausschnitt, Band, Zeitdehnung, Umkehr, Filter, Wärme, Instabilität, Alterung, Körner, Hülle, Pegel; Spur aus Ereignissen in musikalischer Zeit |
| `kern/lucerne.js` | Profil: Ausprägungen, Groove, Motivzelle, Harmonie, Arrangement, Makros, Sperren, Materialwahl, Plan, Zeitmarken |
| `lucerne-ui.js` | Oberfläche im Composer: Klangsammlung (IndexedDB), Import, Vorhören, Erzeugen, Variation, Ersetzen, Fassungen, Groove-Editor, Metronom |
| `tools/composer-lucerne.mjs` | dasselbe ohne Browser: `sammlung`, `vorhoeren`, `studie`, `track`, `test4` |

Die Audiodateien liegen nie im Repo. Im Browser bleiben sie in IndexedDB auf dem Gerät, für das Werkzeug in
`ornament-material/samples/`. Ein Projekt speichert Quell-ID, Name, Prüfsumme, Zeitbereiche und Bearbeitungen. Fehlt eine Datei,
nennt der Composer sie und bietet «Datei zuordnen / Ersatz» an.

### Band und Zeitdehnung

- **Band (Playback):** Tonhöhe und Tempo ändern sich gemeinsam (Umtasten mit gefenstertem Sinc). Eine Oktave tiefer heisst doppelt so lang. Ein transponierter Loop ändert seine Länge, das Arrangement muss sich dafür entscheiden.
- **Zeitdehnung:** WSOLA (`dehnen` aus `lab/kern/klangwerk.js`), danach umgetastet. Dauer und Tonhöhe sind getrennt. Bei dichtem, mehrstimmigem Material und grossen Faktoren wird das hörbar verschmiert.
- Über dem Faktor 2,5 werden Akkordschatten mit Körnern statt mit WSOLA verlängert (110-ms-Körner, die langsam durch den Ausschnitt wandern).

## Materialkarten der ersten drei Quellen

Zeitmarken in Sekunden der Originaldatei. Die Stimmung ist in Cent angegeben, korrigiert auf A = 440 Hz. Das ganze Projekt läuft
bei 440 Hz, nicht bei 432 Hz, weil das Material so gestimmt ist.

### `ly_trailer1.wav` · `src-3cdfb96a9e4f`

107,71 s, 48 kHz, 16 Bit, stereo, Spitze −2,8 dBFS.

- **Gemessen:** Beat-Tracking 42–95 s ergibt 107,7 BPM (Streuung 43 ms), 14–38 s ergibt 120,2 BPM. Tonklassen A-Moll/C-Dur. Pausen bei 95,9–96,4 s und ab 106,1 s. Über die ganze Länge Stimme (Demucs-Stimm-Stem −14 … −20 dB, stimmhaft 0,52), dazu Drums und Bass.
- **Outro 96,2–107,7 s:** fast solo (Drums −70 dB, Stimme −71 dB), eine weiche Fläche in Fis-Moll/A-Dur. Gemessene Akkorde: A (A2, E4, H4, E5) → Fis-Moll (Fis2, Fis3, A3, Cis5, Fis5) → A/E → Cis-Moll7 → D6. Die Oberstimme läuft E5 → A5 → Fis5 → Cis5 → E5 → Cis5 → H4, Stimmung etwa +8 Cent.
- **Rollen:**
  - Harmonie (fünf Akkorde)
  - Hauptmotiv (Oberstimmen E5 und Fis5, mit Hochpass)
  - Umgebung (das ganze Outro)
  - Fragmente (zwei Takte Rhythmus)
  - Stimme (gehaltenes E3)
- **Charakteristische Materialquelle des Tracks:** dieses Outro.

### `ly_trailer_2.wav` · `src-c2d3ea078ab9`

84,01 s, Spitze −0,7 dBFS.

- **Gemessen:** 99,4 BPM (36–74 s), am Anfang 116 BPM. Etwa +30 Cent hoch. Bassfigur E1–H2–D2–E2 alle 3,61 s (sechs Schläge) zwischen 51 und 73 s. Kaum Pausen, durchgehend dicht. Leiser Schluss 76–84 s.
- **Rollen:** Textur (26–34 s als Körner). Zweite Wahl für Fragmente (Bassfigur) und Umgebung (Ausklang).

### `ly_trailer_3.wav` · `src-397e649a6e08`

86,10 s, Spitze 0,0 dBFS.

- **Gemessen:** 97,5 BPM, sehr stabil (Streuung 8–16 ms). Etwa −45 Cent tief. Grosse Schläge 32,3–46 s alle 0,917 s (punktierte Viertel). Breitbandige helle Stelle 47–76 s. Am Schluss 76,5–84 s ein gehaltener, schwebender Ton um E6 (Teiltöne 1286–1355 Hz, chorartig, im Mittel −25 Cent).
- **Rollen:** Akzente (zwei Schläge), Gegenmotiv (E6-Schimmer). Zweite Wahl für Textur (helle Stelle).
- **Nicht verwendet: Anfang 0–5,3 s.** Der tiefe Drone B1/E1 reibt sich mit Fis-Moll (Ais gegen A) und mit dem Bass.

### Klangbank des ersten Tracks

| Rolle | Quelle | Zeitbereich | Bearbeitung im Track |
|---|---|---|---|
| Harmonie | trailer1 | 96,19–98,85 (A) · 98,95–100,85 (Fis-Moll) · 100,9–102,85 (A/E) · 102,9–105,0 (Cis-Moll7 = E6) · 105,85–107,4 (D6 = H-Moll7) | −8 Cent, normiert, Wärme; je Akkord auf zwei bis vier Takte verlängert (WSOLA oder Körner); gemeinsames Leiern; Tiefpass 6,5 kHz, Hochpass 160 Hz |
| Hauptmotiv | trailer1 | 97,14–98,6 (E5) · 99,76–101,0 (Fis5) | Hochpass 600/680 Hz (nimmt die Begleittöne zurück; Reste bleiben hörbar), Wärme, Band-Transposition auf jede Note (nächstgelegener Ton), Drift je Note, Echo punktierte Achtel |
| Gegenmotiv | trailer3 | 76,7–82,3 (E6) | +25 Cent, Band −12 … −17 Halbtöne (E5, Cis5, H4), langer Raum |
| Textur | trailer2 | 26,0–34,0 | Hochpass 250 Hz, Tiefpass 4,5 kHz, Körner 70 ms, 35 je Sekunde; in der Verwandlung Körner aus dem Outro (eine Oktave höher) |
| Fragmente | trailer1 | 42,662–47,12 (zwei Takte bei 107,7 BPM) | Band −3 Halbtöne (A-Moll → Fis-Moll, 107,7 → 90,5 BPM), in 32 Sechzehntel geschnitten, neu gesetzt |
| Akzente | trailer3 | 32,24–33,15 · 34,09–35,0 | normiert, Tiefpass 9 kHz; einmal rückwärts in der Verwandlung |
| Stimme | trailer1 | 39,45–41,75 | Band −3 (E3 → Cis3), Bandpass 220–3800 Hz; drei Stellen (Verwandlung zweimal, Nachbild rückwärts) |
| Umgebung | trailer1 | 96,19–106,9 | Körner 120 ms (langsamer Teppich), Tief- und Hochpass; im Nachbild Takt 84 einmal **unbearbeitet** als hörbarer Bezug zum Ausgangsmaterial |
| Nachbild | gerechnet | Motiv, Takt 9–12 | Resampling (zweite Generation): Band −12, dann rückwärts |

Die vollständige Auswahl steht in `ornament-material/samples/lucerne-auswahl.json`, mit dem Grund jeder Wahl.

## Urteil 10. November 2026 und was sich geändert hat

Christian zum ganzen Track: «Sehr geile Arbeit», der erste Teil «noch nicht top», der zweite «genial», «etwas viel gebraucht», der Beat
«etwas schleppender und knarzender», «die Melodie könnte auch mal unterbrochen werden». Geändert (nicht gehört, nur gemessen):

- **Schleppender:** 84 statt 88 BPM. Snare 20 ms und Ghosts 16 ms hinter dem Schlag, Hi-Hats 60:40 und 9 ms später, die Kick bleibt vorn.
- **Knarzender:** neues Makro «Knarzen» (Standard 55). Sättigung auf Kick und Snare, Snare und Hi-Hats mit weniger Bits und tieferer
  Abtastrate (Halten wie ein alter Sampler), Knistern auf den Hi-Hats. Die Drums bekommen dafür `nach` wie die Sampler-Spuren.
- **Unterbrechungen:** neues Makro «Unterbrechung» (Standard 45). Eine Motivaussage bleibt ganz still oder reisst mitten in der Phrase ab,
  der letzte Ton kurz gestossen. Die erste Aussage jedes Abschnitts bleibt, nie zwei stille hintereinander. Bei 45 sind das etwa vier
  von vierzehn Aussagen.
- **«Etwas viel gebraucht»** gelesen als: das Motiv kommt zu oft. Die Unterbrechungen nehmen es zurück.

## Musikalische Entscheidungen (Ausprägung «Erinnerung», 84 BPM)

**Tonart Fis-Moll (äolisch).** Sie kommt aus dem Material: Die Akkorde des Outros (Fis-Moll, D, A, Cis-Moll) sind leitereigen.
`tonartAusMaterial()` wählt die Molltonart, in der die meisten Akkord-Ausschnitte passen.

**Harmonie.** Je Akkord zwei Takte:

- Grundfolge i–VI–III–VII (Fis-Moll, D, A, E)
- in der Vertiefung die zweite Perspektive i–iv–VI–v
- Freistellung: je vier Takte Fis-Moll und D
- Verwandlung: Orgelpunkt Fis
- Nachbild: Fis-Moll

**Motivzelle.** Eigene Zelle, vier Takte, Ruf und Antwort. Schritte und Dauern in Sechzehnteln:

- Ruf: Cis5 (1, 3) · E5 (4, 3) · Fis5 (7, 6) | E5 (3, 2) · Cis5 (5, 10)
- Antwort: Cis5 · E5 · A5 · E5 | Fis5, lang gehalten

Abwandlungen nach dem Makro «Wiederkehr»: Endton, Register, Dauer, Pause, Fragment. Wörtlich bleiben immer die erste Aussage im
Ersten Gedanken, in der Freistellung und in der Wiederkehr. Die Wiederkehr beginnt eine Achtel früher (vorgezogener Eintritt). Ab
Takt 73 liegen die Aussagen eine Oktave höher, und Takt 69 endet auf Cis statt auf Fis.

**Groove.** Zweitakter nach dem Auftrag (Schritte 1–16; 1, 5, 9, 13 sind die Zählzeiten):

| | Kick | Snare | Hi-Hat | offen | Ghost |
|---|---|---|---|---|---|
| Takt A | 1, 7, 9 | 5, 13 | Achtel | – | 12 |
| Takt B | 1, 8, 11 | 5, 13 | 1–11 Achtel | 15 | 16 |

- **Verwandlung, Takt V:** Kick 1, 4, 11; Snare 13 (halbe Zeit); Ghost 7, 15.
- **Wiederkehr:** Die Kick auf 4 kehrt jede vierte Taktgruppe als Erinnerung an die Verwandlung zurück.
- **Anschlag:**
  - Hauptschläge 0,8; zweite Kick-Schläge 0,6
  - Hi-Hat 0,6 auf Zählzeiten, 0,33 dazwischen
  - Ghost 0,32 bzw. 0,18
- **Swing und Lage (schleppend):**
  - Hi-Hat 60:40 (+9 ms, ±4 ms)
  - Ghost 59:41 (+16 ms, ±4 ms)
  - Snare gerade, aber +20 ms (±3 ms) hinter dem Schlag
  - Motiv 55:45
  - Kick gerade (±2 ms), Bass gerade und ohne Zufall
- **Choke:** Die geschlossene Hi-Hat schneidet die offene ab (6 ms).
- **Variation:**
  - alle vier Takte eine kleine Antwort: Kick verschoben, Ghost verschoben, Hi-Hat 13 weg oder Snare betont
  - alle acht Takte ein Fill: Snare-Ghosts, Pause der Kick in der zweiten Takthälfte oder Zweiunddreissigstel der Hi-Hat nur auf der letzten Zählzeit
  - vor der Freistellung brechen die Drums nach der halben Note ab

**Bass** (`bass@0.1.0` «Rund · Kruder & Dorfmeister», stabil, ohne Leiern):

- Takt A: Grundton mit der Kick auf 1, gehalten; Kick 7 bleibt frei; mit Kick 9 kurz zusammen
- Takt B: Grundton bis 7, Quinte mit Kick 8, Grundton mit Kick 11, Annäherung an den nächsten Akkord auf 14
- Verwandlung: gehaltener Orgelpunkt
- Einsatz erst ab Takt 13

**Arrangement:** 88 Takte ≈ 251 s bei 84 BPM, dazu zwei Takte Ausklang.

| Takte | Abschnitt | Was geschieht |
|---|---|---|
| 1–8 | Auftauchen | Umgebung (Outro als Körnerteppich), Motivfragment Takt 5, Hi-Hat-Auftakt im letzten Takt |
| 9–24 | Erster Gedanke | Motiv, Groove, Akkordschatten; Bass ab Takt 13 |
| 25–40 | Vertiefung | neu im Vordergrund: Gegenmotiv (E6-Schimmer); ab Takt 33 die zweite harmonische Perspektive |
| 41–48 | Freistellung | Drums und Bass aus, Motiv allein mit Akkordschatten und Umgebung (Ruhephase) |
| 49–64 | Verwandlung | neu im Vordergrund: zerschnittene Rhythmusphrase; das Outro als Körner, Motiv rückwärts, Stimme, Groove V, Orgelpunkt, Akzent rückwärts in Takt 57,5 (überraschende Stelle) |
| 65–80 | Wiederkehr | Motiv wörtlich (vorgezogen), dann verändert; Gegenmotiv, Groove mit Erinnerung an V |
| 81–88 | Nachbild | Resampling des Motivs (langsam, dann rückwärts), Originalausschnitt des Outros, Drums lösen sich bis Takt 84 auf |

## Makros (tatsächliche Zuordnung)

| Makro | Standard | Wirkung |
|---|---|---|
| Wärme | 45 | tanh-Sättigung (Antrieb 1 + 5·W), Tiefpass 18 kHz − 11 kHz·W auf allen Sampler-Klängen ausser Akzenten |
| Instabilität | 35 | Drift je Note ±12 Cent·I; gemeinsames Leiern der Schichten Motiv, Harmonie, Textur und Umgebung (Wow bis 25 Cent·I, Flutter 3 Cent·I); ab 60 Alterung (Rauschen, 12 Bit). Bass und Drums bleiben stabil |
| Fragmentierung | 30 | in der Verwandlung: auslassen 15 % + 50 %·F, tauschen 10 % + 60 %·F, Zweiunddreissigstel 40 %·F; sonst Schnitte an Phrasenenden (ab 15) und zerteilte Motivnoten (30 %·F) |
| Wiederkehr | 60 | Anteil wörtlicher Motivaussagen |
| Unterbrechung | 45 | Motivaussage still (12 % + 40 %·U) oder abgerissen (10 % + 40 %·U); erste Aussage je Abschnitt bleibt, nie zwei stille hintereinander |
| Knarzen | 55 | Sättigung Kick (20 + 30·K) und Snare (30 + 60·K); Snare und Hi-Hats 12 − 5·K Bit, Abtastrate 22 − 12·K kHz; Knistern auf den Hi-Hats (2 + 8·K je s) |
| Raum | 45 | Hallanteil und Nachhall je Rolle gestaffelt, Echo des Motivs bis 30 %, Breite der Körner |

## Neue Samples: Arbeitsablauf

1. **Zur Klangsammlung hinzufügen:** Nur neue Dateien werden analysiert. Eine bekannte Prüfsumme nutzt die vorhandene Analyse. Kein Track ändert sich.
2. Die Analyse schlägt 3–8 Ausschnitte je Quelle vor, je Rolle der Reihe nach. Tonale Stellen bekommen einen Akkord aus den Tonklassen und einen spielbaren Ton, der als «mehrstimmig» gekennzeichnet ist. Rhythmische Stellen werden zu Fragment und Akzent, ruhige zu Textur und Umgebung. Rolle, Zeitbereich und Grundton (MIDI-Nummer) sind änderbar, «aus» schliesst einen Ausschnitt aus.
3. Im Kästchen vor jeder Quelle wählst du, welche Quellen neue Tracks und «mit neuem Material weiterentwickeln» verwenden.
4. **Quelle ersetzen / in diesen Track übernehmen:** Rolle und Quelle wählen, «prüfen» zeigt Dauer, Grundton, Transienten und neue Marker. «Übernehmen» besetzt nur diese Rolle neu. Motiv, Groove, Bass, Tempo, Tonart und die anderen Rollen bleiben.
5. **Variation:** neue Startwerte nur für das, was nicht gesperrt ist (Motiv, Groove, Bass, Samples, Tempo, Tonart, einzelne Abschnitte).
6. **Fassungen:** Jede Fassung bleibt in der Liste. Wählen rechnet sie wieder, «rückgängig» holt die vorige zurück.
7. **Grenzen:** je Datei höchstens 250 MB und 15 min. Im Speicher braucht eine Minute stereo bei 48 kHz etwa 22 MB, die Sammlung sollte unter etwa 1,2 GB bleiben. Viele Dateien werden nacheinander gelesen und analysiert.

`test4` im Werkzeug prüft das alles mit einer synthetischen `TESTQUELLE_lucerne_synthetisch.wav`:

- Die bisherigen IDs bleiben.
- Der gespeicherte Track bleibt gleich.
- Beim Ersetzen bleiben Motiv, Harmonie, Groove, Bass, Positionen, Tempo und Tonart.
- Rückgängig ergibt dieselben Ereignisse.
- Ein neues Projekt kann aus einer Teilmenge entstehen.

## Remix eines fertigen Tracks (seit 11. November 2026)

Ein Remix rechnet denselben Track mit demselben Gerüst, denselben Makros, demselben Material und demselben Startwert. So bleibt das Arrangement gleich, und nur der Klang ändert sich über `LUC_SPUREN`. Dazu kennt jede Spur neben `raum`, `echo`, `pegel`, `ohneWaerme`, `schritteDazu` und `stumm` jetzt auch:

- `werte`: Parameter des Erzeugers für Kick, Snare, Ghost und Bass, etwa `{"halten":45,"sub":30}` für eine sattere Kick.
- `nach`: ersetzt die Nachbearbeitung der Spur, `[]` heisst keine. Damit entfallen zum Beispiel Bitreduktion und Staub.
- `nachMenge`: setzt die Menge einzelner Schritte der Nachbearbeitung, etwa `{"instabil":18}`.
- `breite` (0–1): Ereignisse einer Sampler-Spur abwechselnd links und rechts.
- `legato`: ein Faktor auf Dauer und Ausklang der Ereignisse.
- `cent`: ein Faktor auf die Verstimmung je Ereignis, `0` heisst rein.

Erstes Beispiel ist «directer reprise» als «Meditation» (WKW 2 Engel, Startwert 13).

## Prüfung (technisch, nicht gehört)

- **Motivnoten:** 129 von 144 erkannten Noten treffen die Tonklasse, Median der Abweichung 5 Cent (pyin auf dem Motiv-Stem).
- **Pegel:** Track −14 LUFS, −1 dBTP. Die Studie und ihre drei Varianten liegen auf −16 LUFS, damit sie gleich laut verglichen werden können.
- **Tiefen:** Hochpässe auf Akkordschatten (160 Hz), Umgebung (140 Hz), Textur (200/250 Hz) und Fragmenten (90 Hz) gegen Überlagerungen mit Bass und Kick (gemessen: vorher −6 dB unter 120 Hz).

## Was noch offen ist

- **Bruch (138 BPM) und Nacht (72 BPM)** sind angelegt, werden aber noch wie «Erinnerung» geplant (der Plan sagt das).
- **Weitere Aufnahmen**, bezogen auf das, was den drei Quellen fehlt:
  - **ein trockener Einzelton oder zwei**, z. B. Klavier, Gitarre oder Synth mit vollem Ausklang. Sie ersetzen die gefilterten Oberstimmen, die noch Reste der Begleitung tragen.
  - **eine eigene Miniatur** (4–8 Takte, Tempo notiert) als Motivquelle statt der hier erfundenen Zelle.
  - **Einzelereignisse** (Glas, Holz, Wasser) für Akzente und eigene Perkussion. Bisher sind die Akzente Trailer-Schläge.
  - **eine Umgebung** (Wasser, Raum), die nicht schon Musik ist. Die Umgebung ist im Moment das Outro selbst.
  - **Stimme und Atem trocken.** Die Stimme liegt bisher nur im Mix vor.
