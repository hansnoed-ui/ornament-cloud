# ORNAMENT COMPOSER – Entscheidungen und Urteile

Hier steht, was Christian entschieden hat und wie er Klänge beurteilt hat, damit spätere Sitzungen es kennen. Neueste oben.

## 9. November 2026

**Grundlagen**
- Der Composer ist eine eigene Seite `alpha/composer/` (nur per Direktlink, noindex) und nutzt Bausteine des Lab per Import. Gemergt wird nur mit Christians OK.
- Das Material liegt ausserhalb des Repos in `C:\Users\StartKlar\ornament-material\` (`vorlagen/<spur>/`, `referenzen/`, `stems/`, `hoerproben/`, `vst-referenz/`). Stimmmaterial und fremde Samples kommen nie ins Repo.
- **Komplett neue Sounds.** Die bisherigen Tracks und die Beat-Klänge des Lab dienen höchstens als Richtung. Die Sound-Referenzen werden stark erweitert, hin zu neuen Klängen.
- Die Klangquelle ist eigene Synthese in JavaScript, reproduzierbar über Startwerte. Christian liefert Samples und Beispiele je Spur, an denen die Erzeuger gemessen und weiterentwickelt werden. Ganze Samples sollen später auch direkt als Clips in Spuren kommen.
- Fremder Code: AGPL-Quellen (z. B. aquanode-plugins, VoiceStudio) nur lesen, nicht übernehmen. FL-Studio-Samples nur als Messvorlage.

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
