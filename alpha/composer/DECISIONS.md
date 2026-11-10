# ORNAMENT COMPOSER – Entscheidungen und Urteile

Hier steht, was Christian entschieden hat und wie er Klänge beurteilt hat, damit spätere Sitzungen es kennen. Neueste oben.

## 10. November 2026

**ornament.lucerne (Auftrag `Masterprompt_Claude_Code_ornament_lucerne.md`)**
- Neuer Stil aus Christians eigenen Aufnahmen, zuerst drei: `ly_trailer1.wav`, `ly_trailer_2.wav`, `ly_trailer_3.wav` in `ornament-material/samples/`. Weitere Samples kündigt er an («heute Abend und morgen sehr viele»); deshalb von Anfang an Klangsammlung mit stabilen IDs, Analyse nur neuer Dateien, Rollen getrennt von Dateien.
- Umgesetzt: Klangsammlung 0.1.0, Sampler 0.1.0, Profil ornament.lucerne 0.1.0 (Ausprägung Erinnerung, 88 BPM, Fis-Moll aus dem Material, 88 Takte), Oberfläche `lucerne-ui.js`, Werkzeug `tools/composer-lucerne.mjs`. Einzelheiten, Zeitmarken und Makro-Zuordnung in `LUCERNE.md`.
- Charakteristische Quelle des ersten Tracks: das ruhige Outro von `ly_trailer1.wav` (96–107 s) – Akkordschatten, Motivtöne, Umgebung. Das Hauptmotiv ist eine eigene Zelle, gespielt mit den Oberstimmen dieses Outros.
- Kammerton der Lucerne-Projekte 440 Hz (das Material ist so gestimmt), nicht 432.
- Ehrlich: nichts davon ist gehört. Urteil steht aus.

**Synth 0.2.0 und Melodien (Aufträge `synthesizer.md` und `melodien.md`)**
- Umgesetzt in einem Cloud-Strang (das Terminal war belegt), auf eigenem Zweig, Merge nur mit Christians OK.
- Synth 0.2.0 als neue Version neben 0.1.0 (alte Projekte klingen gleich). Neu: Velvet Dub, Raga Drift, Ice Organism, Signal Sparrow; Verfahren Saite und Glocke; sechs Klangcharaktere als Schlagwort, Filter und Färbung. 24 Presets.
- Glass Circuit Keys und Worn Electric Keys überarbeitet (Urteil 9.11.: «am schlimmsten die Glass Keys und die Keys allgemein»). Die übrigen zwölf Presets aus 0.1.0 bleiben bitgleich.
- Christian: «ich will keine popmelodien mit synthies». Der Melodie-Generator erzeugt jetzt vier Schichten (Fläche mit wandernden Stimmen, Spitzen, unregelmässige Off-Beats, klassische Anleihen über den Regler Klassik) statt einer Oberstimme; dazu Ruf, Alap, Tanpura. Notation `=` für gehaltene Stimmen.
- Track erzeugen: Ornament und DnB bekommen leise Spitzen und Off-Beats zur Schwebe dazu, Indien den Tanpura-Drone. Die bisherige Schwebe bleibt (gefiel).
- Raga- und Maqam-Tonleitern (Bayati, Rast, Saba, Shur mit Vierteltönen) als Inspiration bezeichnet.
- Kein GPL-Code, keine fremden Assets.

**Off-Beats neu (Urteil auf der Hörseite, 10.11.: «das meiste gefällt gut. die offbeats gehen noch nicht»)**
- Ursache: Die Off-Beats wichen allen Drumschlägen aus, auch der offenen Hi-Hat, die genau auf den Achtel-Off-Beats liegt. Übrig blieben zufällige Sechzehntel, dazu Zweiklänge, die in der Lage sprangen (teils Sekunden), rund 20 dB unter den Drums.
- Jetzt: kurze Akkord-Stiche auf den Achtel-Off-Beats (2, 6, 10, 14; Halftime 4 und 12), nie auf Kick oder Snare. Unregelmässig ist nur, in welchen Takten sie kommen: eine Figur, die wiederkehrt und ab und zu einen Stich verliert oder dazugewinnt. Enge Lage (Terz, Quinte, Septime oder Dreiklang, immer die nächste Umkehrung), Quartvorhalt mit Klassik.
- Off-Beats 6 dB lauter in Ornament und DnB, Echo-Anteil mindestens 40 % (Dub-Echo). Ornament nimmt Velvet Rhodes Haze statt Worn Electric Keys («nein» zweimal).
- Urteil zu den neuen Off-Beats: alle drei Dichten «gut» (30 «sehr gut»), Velvet Rhodes und Shadow Chord «gut», Glass Circuit Keys «nein». Vorgabe jetzt Off-Beat 30, Ornament bleibt bei Velvet Rhodes.

**Unregelmässiger verteilt (Notizen 10.11.: «haze und tampure könnten noch unregelmässiger verteilt sein, auch in der tonlänge», «fläche könnte noch unregelmässiger verteilt sein»)**
- Fläche, Spitzen, Off-Beats und Tanpura wiederholen sich erst nach bis zu 32 Takten statt nach 8; vorher wurde jede Unregelmässigkeit über den Track zur Schleife. Der ganze Track rechnet dadurch etwa 1 s länger.
- Tanpura: wechselnde Abstände (drei Viertel bis doppeltes Grundmass), manche Zupfer früh abgedämpft, ab und zu ein oder zwei Takte Pause; der Zyklus beginnt danach wieder mit Pa.
- Fläche: Harmonien halb bis doppelt so lang wie das Mass aus «Wandel», späte Einsätze, manchmal ein oder zwei Takte Luft; nach der Luft setzen alle Stimmen neu ein.
- Off-Beats: wechselnde Tonlänge, manchmal klingt ein Akkord über mehrere Schläge.

## 9. November 2026

**Bereiche und Fassungen (Auftrag `bereiche-und-spuren.md`)**
- Wunsch Christian: in der Summe einen Bereich markieren und daraus den nächsten Track machen; einzelne Spuren leicht ersetzen; in Spuren Bereiche stumm, lauter, leiser oder mit Effekten belegen.
- Umgesetzt in Bereiche 0.1.0 und Fassungen 0.1.0. Ein gezogener Bereich rastet auf Takte (Alt: Schläge, Umschalt: frei) und gilt für die Spur, auf der er gezogen wurde; auf dem Lineal für die Summe. Bereiche wirken wie die Unterbrechungen vor der Plugin-Kette (Hall der Spur klingt über einen stummen Bereich weiter) und stehen in Takten im Projekt.
- Ersetzen tauscht nur die Quelle; Kanalzug, Plugins, Pegel, Unterbrechungen und Bereiche bleiben. Beim Ersetzen werden Startpunkt (Einsätze, ±1 s) und Lautheit (LUFS) an die alte Quelle angeglichen, das Tempo nur angezeigt; Dehnen (WSOLA aus dem Lab) erst auf Knopfdruck. Tonart wird nicht erkannt.
- Neuer Track aus einem Summenbereich: neues Projekt mit jeder Spur als eigener Datei (nach Unterbrechungen und Bereichen, vor dem Kanalzug), Ketten, Pegel, Tempo, Kammerton, Herkunft; die Mischung des Bereichs als Referenz. Das alte Projekt wird vorher als Datei gespeichert, das neue kommt als ZIP. Erzeugte Spuren werden dabei zu Dateien (das Rezept steht unter `herkunft`).
- Handy: Browser hielten nach dem Merge die alte `composer.css` im Cache (Spurköpfe liefen in die Welle, ⇄ verdeckt). Seitdem tragen `composer.css` und `app.js` in `index.html` ein `?v=`; bei jeder Änderung an CSS oder Oberfläche hochzählen.
- Noch offen: Bereiche als Muster über den ganzen Track, Loop-Vorbereitung ohne Naht beim neuen Track, Tonart der Ersatzdatei erkennen, Automation neben den Bereichen.

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

**Ornament 0.3 (Urteil zu den ersten Ornament-Tracks)**
- «Die Tracks sind toll. Das Windgeräusch vielleicht etwas dominant (kann man ja mischen), die Drums und der Bass noch etwas eintönig, aber die Richtung ist toll.»
- Umgesetzt: Teile je Abschnitt (`quelle.teile`). Drums mit eigenen Grooves für Hauptteil, Gas geben (rollend), Atmen (nur Kick und Rim), Stocken und Wiederfinden, dazu ein Wirbel an jedem Abschnittsende. Bass je Abschnitt eine andere Linie (lang, Zyklus, der Kick folgend, Riff). Wind der Gezeiten 30 → 8. Rim gehört im Arrangement jetzt zu den Höhen.

**Ornament Style (Christian, 9. November 2026, Abend)**
- «Die Klänge sind jetzt recht grossartig.» Richtung: Drum and Bass, Naturgeräusche, indische und orientalische Perkussion. House weiterverfolgen; Pop und ECM raus; Hip-Hop und Goa offen; die übrigen bleiben.
- Umgesetzt: neuer Stil «Ornament» zuoberst und Standard. 174 BPM Halftime, DnB-Kick und -Snare, helle enge Hats; Tabla, Darbuka, Zarb, Riq sparsam für 174 BPM gesetzt und im ganzen Track je Abschnitt im Wechsel (eine, bei Gas geben und Wiederfinden zwei Stimmen); Reese im ungeraden Zyklus in Hijaz; Deep Room Drone als Schwebe; Gezeiten, Walchor, Vögel 3–4 dB lauter als sonst.
- Pop und ECM sind aus der Auswahl ausgeblendet, nicht gelöscht (alte Projekte bleiben lesbar, die ECM-Muster bleiben Bausteine).

**Urteil zu den Tracks 0.2 (Christian, 9. November 2026)**
- DnB 0.2: «sehr gut, ausser diese nervige durchgehende Cowbell». Ursache gemessen: eine auf die Tonleiter gestimmte Grille der Insekten-Schicht bei 1150 Hz (kurze Sinuspulse klingen in dieser Lage wie eine Kuhglocke). Behoben: gestimmte Grillen nur über 2,3 kHz, Pulse mit fallender Tonhöhe und etwas Rauschen, im DnB-Track ungestimmt.

- ECM 0.2 «auch gut», Goa: dasselbe nervige, durchgehende perkussive Geräusch; Hip-Hop «zum ersten Mal nicht drin, Drums könnten präziser sein»; Minimal «geile Sounds! Glocken wieder überflüssig, Glocken sind keine Naturgeräusche».
- Schluss: Das Geräusch ist die Tabla aus dem Stilmix (in DnB, ECM, Goa; im Hip-Hop lag Darbuka). Behoben: Tabla aus dem Mix, Mischperkussion nur in Hauptteil, Gas und Wiederfinden, jeden zweiten Viertakt still, 5 dB leiser, bei schnellem Tempo halb so schnell. Perkussive Naturtexturen (Regen, Feuer, Insekten, Vögel, Pflanzen) nur in den ruhigen Teilen (Intro, Atmen, Verlieren, Outro). Pflanzentextur nicht mehr in der Standardbesetzung. Hip-Hop: Timing-Abweichung 4 → 1,5 ms, Snare 12 → 5 ms hinter dem Schlag.

- Orient 0.2 «auch toll, auch hier nervige Perkussion, lieber heller, präzisere Hi-Hats». «Insgesamt aber eine grosse Verbesserung bei den Sounds und dem Arrangement.» Umgesetzt: Orient ohne Riq und ohne Rahmentrommel-Mix, dafür helle, enge Hi-Hats aus dem DnB-Kit.

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

## Seite verlassen und Bildschirmsperre (10. November 2026)

Christian: Läuft Musik und die Seite wird verlassen oder der Bildschirm sperrt, bricht der Ton ab und knistert danach lange. Ursache: Mobil (vor allem iOS) hält das System den AudioContext an oder unterbricht ihn; kommt er zurück, liefert er oft gestört weiter, bis die Seite neu geladen wird.

- Verschwindet die Seite, während Musik läuft, wird sie in 15 ms ausgeblendet und angehalten, der AudioContext ruht. Die Stelle bleibt; beim Zurückkommen sagt eine Meldung, dass ▶ dort weiterspielt. Kein automatisches Weiterspielen nach der Sperre.
- Mobil wird der AudioContext beim nächsten ▶ neu gebaut und mit Spuren, Referenz, Zustand, Schleife und Stelle gefüllt; ebenso überall, wenn das System den Ton unterbrochen hat oder der Kontext nicht innerhalb einer Sekunde wieder läuft.
- Start und Halt blenden im Worklet 15 ms ein und aus (auch beim normalen ■), der Motor selbst bleibt bitgleich zum Export.
- Weiterspielen im Hintergrund wurde nicht gewählt: Web Audio läuft mobil im Hintergrund nicht verlässlich, und der Motor rechnet in Echtzeit.
