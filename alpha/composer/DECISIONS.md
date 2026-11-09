# ORNAMENT COMPOSER – Entscheidungen und Urteile

Hier steht, was Christian entschieden hat und wie er Klänge beurteilt hat, damit spätere Sitzungen es kennen. Neueste oben.

## 9. November 2026

**Grundlagen**
- Der Composer ist eine eigene Seite `alpha/composer/` (nur per Direktlink, noindex) und nutzt Bausteine des Lab per Import. Gemergt wird nur mit Christians OK.
- Das Material liegt ausserhalb des Repos in `C:\Users\StartKlar\ornament-material\` (`vorlagen/<spur>/`, `referenzen/`, `stems/`, `hoerproben/`, `vst-referenz/`). Stimmmaterial und fremde Samples kommen nie ins Repo.
- **Komplett neue Sounds.** Die bisherigen Tracks und die Beat-Klänge des Lab dienen höchstens als Richtung. Die Sound-Referenzen werden stark erweitert, hin zu neuen Klängen.
- Die Klangquelle ist eigene Synthese in JavaScript, reproduzierbar über Startwerte. Christian liefert Samples und Beispiele je Spur, an denen die Erzeuger gemessen und weiterentwickelt werden. Ganze Samples sollen später auch direkt als Clips in Spuren kommen.
- Fremder Code: AGPL-Quellen (z. B. aquanode-plugins, VoiceStudio) nur lesen, nicht übernehmen. FL-Studio-Samples nur als Messvorlage.

**Urteil zu den ersten ganzen Tracks (Christian, 9. November 2026, Mittag)**
- «halb gut». Gut: Drums und Bass bei Drum and Bass und Hip-Hop; die Perkussion Indien und Orient («toll»); die Naturgeräusche («sehr gut»).
- Nachtrag: «die Synths beim House-Track sind ok» (Velvet Organ Chord, Open Sky Saw).
- Nicht gut: die übrigen Tracks; am schlimmsten die Glass Keys und die Keys allgemein; Flächen und Bassläufe, die einfach im 4/4 spielen.
- Gewünscht: Flächen und Bässe in speziellen Takten, lang anhaltend, mit kurzen knarzenden Bewegungen. Die Sounds sollen mehr glänzen und knarzen. Mehr Abwechslung im Stilmix. Die Tracks sollen «atmen, stocken, Gas geben, sich verlieren und wiederfinden», «wirbeln, wummen», und mehr Natursounds.

**Umsetzung des Urteils (Composer 0.2, 9. November 2026, Nachmittag)**
- Bass-Linie «Zyklus» und Synth-Rolle «Schwebe»: lange Töne und Akkorde über 3, 5 oder 7 Takte, Wechsel quer zum Takt; beim Bass vor dem Wechsel kurzes Knarzen (Nachbarton oder Oktave, gleitend). Der Zyklus läuft gegen die Viertakt-Gruppen der Drums.
- Unterbrechungen 0.2.0: neu Knarzen (Ringmodulation, Formant, Bitcrush, Zittern), Wirbel (immer schneller wiederholt, lauter, steigend), Wumm (Sub-Drop, Spur geduckt).
- Plugin Glanz 0.1.0 (Exciter und Luft) auf Synths und Flächen im Track.
- Natur 0.2.0: Regen, Feuer und Insekten dazu; die fünf Familien aus 0.1.0 klingen unverändert (getestet).
- Arrangement 0.2.0: Intro, Aufbau, dann Hauptteil, Stocken, Atmen, Gas geben, Sich verlieren, Wiederfinden in einer Folge aus dem Startwert, Outro. Wer sich verliert, findet sich wieder (mit Wumm). Beim Stocken halten alle Spuren an denselben Stellen an.
- Stilmix: Perkussion aus einem zweiten Stil (z. B. Tabla unter DnB), zwei Naturschichten, keine Keys. DnB und Hip-Hop behalten ihren Bass (gefiel); House behält seine Synths (gefielen).

**Synthesizer und ganze Tracks**
- Auftrag `synthesizer.md`: musikalische Synth-Spuren mit Richtungen Boards of Canada, Radiohead, Massive Attack, Goa, Trance, House, Kraftwerk, Depeche Mode; Shadow Dub, Tape Memory und Glass Circuit zuerst.
- Umgesetzt in Synth 0.1.0: eine Engine mit fünf Verfahren (analog, FM, Wavetable, Supersaw, Orgel), acht Familien, 16 Presets, sechs Makros, Sequenzen aus Bass und Drums, Akkorde in der Notenzeile, Accent und Slide. Dazu das Plugin Echo 0.1.0 und der Kammerton als Projekteinstellung (Standard 432). Kein GPL-Code, keine fremden Assets. Ausführlich in `SYNTH.md`.
- Wunsch Christian: einen ganzen Track erzeugen können (z. B. 90 s, alle Spuren und Effekte), um Ergebnisse kennenzulernen, und danach alles von Hand ändern. Umgesetzt als «Track erzeugen» (Arrangement 0.1.0): Abschnitte und Übergänge als gewöhnliche Unterbrechungen; Rechenzeit im Browser etwa 5 s.

**Natur und Flächen (dritter Bereich)**
- Auftrag `organische-klangwelt.md`: Flächen, Naturklänge und Synthesizer als spielbares Instrument; Natur erkennbar oder stufenlos zur Fläche verwandelt.
- Umgesetzt in Natur 0.1.0: Walchor, Vogelschwarm, Gezeiten, Pflanzentextur und Pad, je sechs Varianten, sieben Makros. Synthetische Quellen sind so bezeichnet, eigene Aufnahmen kommen mit Lizenzfeldern, der Export warnt bei NC-Material. Gerechnet wird im Worker, als Schleife ohne Naht, auch in langer Fassung für Installationen. Tonart, Akkorde, Einsätze und Hüllkurve kommen von Bass und Drums. Ausführlich in `NATUR.md`.
- Startsammlung: acht NOAA-Walclips (vermutlich gemeinfrei, geringe Qualität) im Materialordner, nicht im Repo.

**Unterbrechungen**
- Wunsch aus dem Masterprompt: Spuren gezielt aufbrechen (Stutter, Tape-Stop, Gate, Dropouts, Echo-Schwänze, Reverse, Filterfahrten, Glitches), als Einzelereignis oder Muster.
- Umgesetzt in Unterbrechungen 0.1.0: neun Arten als Ereignisse auf der Zeitleiste (Takt, Länge in Sechzehnteln, einmal oder alle 1/2/4/8 Takte), pro Spur oder auf allen Spuren als Gruppe. Sie wirken vor der Plugin-Kette, der Hall klingt also über ein Dropout weiter. Das Projekt speichert nur die Ereignisse.

**Bass (zweite Spur)**
- Wunsch: warm und fett. Referenzen Drum and Bass (Ed Rush, Goldie), Kruder & Dorfmeister, Hip-Hop (Dr. Dre, Wu-Tang), dazu jazzige und akustische Bässe.
- Umgesetzt in Bass 0.1.0: Sub, Rund (Dub, Kruder & Dorfmeister), Analog (G-Funk, Wu, Boom Bap, Goa), Reese (Ed Rush, Goldie, Neuro), Kontrabass und E-Bass als gezupfte Saite, je sechs Varianten. Einstimmig: jede Note dämpft die vorige.
- Die Linie entsteht aus der Kick der Drumspur, bei Perkussion aus den tiefen Schlägen. Arten: folgt der Kick, lang (Halftime), Riff (Dub), Offbeat (House, Goa), Walking (Jazz). Tonart frei, Leitern Moll, Dorisch, Phrygisch, Hijaz, harmonisch Moll und Dur, A = 432 Hz.
- Plugin Bassfett 0.1.0: Unteroktave, Obertöne für kleine Lautsprecher (fehlender Grundton), Wärme. Prinzip wie Subhoofer (GPL), Code eigen.
- Repo `unfiltered-audio-bass-mint` ist ein Köder für Schadsoftware und wurde nicht verwendet.

**Drums und Perkussion (erste Spur)**
- Drums: modern und fett, auf der Höhe von DnB, Hip-Hop, Pop, Minimal, Goa und House. Umgesetzt in Drums 0.1.0: Kick, Snare, Clap, Hi-Hat (geschlossen und offen), Rim, Tom, Shaker, Ride, je 6–7 Varianten.
- Perkussion: organisch, Richtung Indien, Anouar Brahem und ECM, natürlich und orientalisch, mit schönem Raum, Klang und Hall und präzisen Rhythmen. Umgesetzt in Perkussion 0.1.0 (Tabla, Darbuka, Rahmentrommel, Riq, Zarb, Udu) und Raum 0.1.0 (FDN-Hall).
- Gemessen gegen die Drum-Samples aus FL Studio Mobile: Kick, Snare und Hat liegen in Abklingzeit und Spektralschwerpunkt im Bereich der Vorlagen. Die Hats waren zuerst zu hell und zu kurz und wurden korrigiert.

**Urteil (Christian, 9. November 2026, nach den Hörproben):** «Es tönt recht fett, und dank den Möglichkeiten des Mischens ist vieles veränderbar.» Drums 0.1.0 und Perkussion 0.1.0 bleiben als erste Version so. Weitere Perkussionsinstrumente kommen später dazu, Christian liefert dafür Vorlagen. Hörseite: https://claude.ai/artifact/Wn2jNitGDPDVymJzk86aMZ (Urteile im Speicher `urteile`).

**Einzelurteile:** noch keine. Die Urteile aus dem Feld «Urteil festhalten» werden mit dem Projekt gespeichert und hier gesammelt.
