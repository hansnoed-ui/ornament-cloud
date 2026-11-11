# ORNAMENT COMPOSER – Entscheidungen und Urteile

Hier steht, was Christian entschieden hat und wie er Klänge beurteilt hat, damit spätere Sitzungen es kennen. Neueste oben.

## 11. November 2026

**Drums aus Grooves (Groove 0.1.0)**
- Christian: «bringt drum n bass eigentlich immer den gleichen beat?» Ja, die Drums von DnB (und die Teile von Ornament) waren feste Zeilen. Vorschlag Groove-Generator, Christian: «ja».
- Umgesetzt: `kern/grooves.js` mit fünf Familien (Two-Step, Halftime, Steppers, Jungle-Break, Rollend), Phrase über vier Takte, je Abschnitt eine Abwandlung und ein eigener Wirbel; Schalter «Drums aus Grooves» (an), Regler Familie, Dichte, Komplexität in der Drum-Spur. Einzelheiten in `GROOVES.md`. Gleiche Linie wie bei lucerne: Grooves sollen sich je Track unterscheiden.
- Urteil (11.11.): «ja, sehr gut». **gut** DnB Rollend, Two-Step, Jungle-Break, Steppers und Ornament Rollend; **geht** Ornament Halftime; DnB Halftime ohne Urteil. Der alte feste Beat war auch «gut»: die Familien behalten ihre Gewichte.

**ornament.bienne, Phase 2 (Metrum) in kleinen Schritten**
- Christian: «also jetzt bienne», nach dem Wunsch, langsam weiterzufahren. Phase 2 ist darum geteilt: a Taktlänge und Taktarten, b Tuplets, c Polymetrik, d Humanisierung, je mit Hörproben und Urteil.
- Schritt a ändert nichts am Klang von 4/4 (`taktSek` = `240 / bpm`, geprüft).
- Urteil zu den Hörproben (11.11.): **gut** 4/4, 7/8 (2+2+3), 12/8 (3+3+3+3), 11/8 (3+3+3+2); **geht** 5/4 (3+2), 6/8 (3+3); keine weg. «da ist gutes Zeug dabei zum Mitnehmen». Für `kern/bienne.js` (Phase 5): die vier guten Taktarten bevorzugt, 5/4 und 6/8 seltener.
- Urteil Gitarre 0.1.0 (11.11.): **gut** Schwelle «weit» (4/4 G lydisch) und clean «gedämpft» (11/8 C dorisch); **geht** clean «Hals rund» (Arpeggio 12/8) und Stahl «offen» (geschlagen 4/4); **weg** clean «Steg glasig» (7/8 A äolisch) und Nylon «warm» (Fingerpicking 6/8 E phrygisch). Die weggelegten Klänge bleiben im Erzeuger (Projekte sollen laden), `kern/bienne.js` wählt sie aber nicht von sich aus.
- Urteil Timing (11.11.): **gut** starr und Profile je Rolle, **geht** alter Zufall. «ja sehr schön».
- **Grundsatz Vielfalt** (Christian, 11.11.): «bleib aber trotz meinen Vorlieben nicht zu redundant. Ich möchte gerne verschiedenste Tracks mit Bienne erzeugen. Bei Lucerne muss ich nachträglich noch einige wieder auflockern.» Urteile sind darum sanfte Gewichte, kein Filter: «geht» bleibt gut im Spiel (Ionisch, Lydisch, 5/4, 6/8, 12/8-Duolen, alter Zufall), auch starres Timing ist eine Farbe. `kern/bienne.js` streut Taktart, Modus, Tempo, Tuplets, Polymetrik und Timing über die Startwerte und vermeidet, dass dieselben Lieblingsbausteine in jedem Track stehen.
- Urteil Polymetrik (11.11.): **gut** 11/8 Bass-Riff in 4/4 («sehr cooles Bassriff»), 7/8 Rimshot in Fünfachteln («nice»); **geht** 4/4 Rhodes-Motiv 3 gegen 4 («nice. Melodie-Sound sehr schlecht, und die Melodie zu langweilig») – die Polymetrik trägt, das hohe Rhodes-Motiv (eine Oktave hoch, drei Akkordtöne absteigend) nicht. Für Melodien später eigener Klang (Phase 3: Mono-Lead) und mehr Bewegung.
- Urteil Tuplets (11.11.): **gut** 4/4 (Achteltriolen, Bass in Halbe-Triolen), 7/8 (4 gegen 3), 11/8 (Quintole als Wirbel); **geht** 12/8 (Duolen, 2 gegen 3).
- Nachgereichte Urteile Phase 1 (Hörseite speicherte vorher nicht): gut Äolisch, Dorisch, Mixolydisch, Phrygisch (je glatt und Bruch); geht Ionisch, Lydisch.

**ornament.bienne, Hörproben Phase 1 (Harmonik)**
- Christian: «diese sounds sind nice», die Klänge (Rhodes, Fläche, Bass) und die Verläufe stimmen. **Ionisch gefällt nicht** («die ersten gefallen noch nicht so», die beiden Ionisch-Proben).
- Folge: `MODI[m].gewicht`, Ionisch 0, die anderen fünf gleich (20). `modusWaehlen(rnd, gewichte)` wählt danach; Ionisch nur noch, wenn ausdrücklich verlangt. Lydisch, Mixolydisch, Dorisch, Äolisch, Phrygisch bleiben, bis weitere Urteile kommen.

## 10. November 2026

**Perkussion aus Zyklen (Auftrag `prompts/perkussion.md`, Phase A)**
- Christian schickte einen langen Masterprompt «Global Percussion Engine», gemeint für den Composer allgemein, nicht für ornament.lucerne. Gestrafft zu `prompts/perkussion.md` in drei Phasen; «Phase A los».
- Umgesetzt: Rhythmus 0.1.0 (`kern/zyklen.js`) mit 15 Vorlagen (Tala, Iqa, persisch, frei) und einem Generator (Dichte, Komplexität, Variation, Polyrhythmus, Tihai vor jedem Abschnittswechsel, Sam am Beginn jedes Abschnitts); Perkussion 0.2.0 mit Mridangam, Kanjira, Ghatam, Dholak, Daf, Davul/Dohol, Naqareh, Manjira, Sagat. Einzelheiten in `PERKUSSION.md`.
- Die Stile nehmen ihre Perkussion jetzt aus Zyklen (Schalter «Perkussion aus Zyklen», an); die alten festen Muster bleiben über den Schalter. Rückwärtskompatibilität nicht nötig, 0.1.0 bleibt trotzdem bitgleich.
- Lizenzen der vorgeschlagenen Sample-Quellen geprüft: Mridangam-Dataset CC BY-NC (nur Messvorlage), Berklee BISA CC BY 4.0, M III D O und Black Octopus ohne Weitergabe, Freesound-API nur nicht-kommerziell gratis. Samples kommen später und nur lokal.
- Handy: Die Reiter einer Spur (Klang, Unterbrechungen, … Raum) machten die Seite bei Perkussion mit Raum breiter als 412 px; sie brechen jetzt um.
- Ehrlich: nichts davon ist gehört. Urteil steht aus.

**ornament.bienne (Auftrag `bienne.md`), Phase 1: Harmonik 0.1.0**
- Neuer Stil in fünf Phasen (Plan in `BIENNE.md`), jede als eigener PR. Phase 1 ist die Harmonik-Engine `kern/harmonik.js`, ohne Abhängigkeit von bienne, damit Ornament, DnB und Lucerne sie später nutzen können.
- `LEITERN` hat jetzt auch Lydisch und Mixolydisch. Ionisch bleibt `dur`. Bestehende Leitern sind unverändert.
- `erzeugen.js` kann Noten als Ereignisse mit festen MIDI-Tönen rechnen (`q.noten`), für Klänge, die nicht als Stufen einer Leiter zu schreiben sind. Bestehende Rezepte klingen gleich.
- Rückwärtskompatibilität alter Projekte ist nicht mehr nötig (Christian, 10.11.); was sich dadurch ändert, wird hier vermerkt.
- Referenzen nur als Verfahren: keine Bandnamen in Presets, Abschnitten oder Dateinamen, keine nachgebauten Folgen. Der Generator kennt nur Regeln.


**ornament.lucerne: Urteil zum ganzen Track**
- Christian: «Sehr geile Arbeit», erster Teil «noch nicht top», zweiter «genial», «etwas viel gebraucht», Beat «etwas schleppender und knarzender», die Melodie «könnte auch mal unterbrochen werden».
- Umgesetzt: 84 statt 88 BPM, Snare und Ghosts hinter dem Schlag, mehr Swing auf den Hi-Hats; Makros «Knarzen» (Sättigung, Bits, Abtastrate, Knistern auf den Drums) und «Unterbrechung» (Motivaussagen still oder abgerissen). «Viel gebraucht» als «das Motiv kommt zu oft» gelesen. Einzelheiten in `LUCERNE.md`.

**Natur 0.3.0: Tiere und Kosmos**
- Christian: mehr Natur- und vor allem Tierklänge für Ornament und Drum and Bass, «der walchor ist grosse spitze», dazu «eine ebene mit astronomischen signalen aus dem universum».
- Umgesetzt in einem Cloud-Strang: Delfine, Nachtwald (Unken, Frösche, Uhu, Blätter) und Kosmos (Pulsar, Plasmawellen, Gravitationswellen, Radiorauschen), alles synthetisch nach veröffentlichten Messwerten. Keine fremden Aufnahmen (Lizenzen von NASA-Sonifikationen und ESA-Material uneinheitlich). Ausführlich in `NATUR.md`.
- Ornament: dazu Delfine singen und Kosmos «Tiefer Raum». Drum and Bass: dazu Teich bei Nacht und Kosmos «Magnetosphäre».
- Urteil zu den Hörproben: alle Delfine «gut», Nachtwald gut bis auf «der hohe Uhu ist komisch» (jetzt tiefer, runder). Kosmos: Vela, Magnetosphäre, Verschmelzung «gut»; der Pulsar als einzelne Schläge «zu dominant, zu wenig fein», «zu grell», «muss raus». Die langsamen Pulsare sind entfernt. Vorgeschlagen, noch nicht gebaut: Elefanten-Grollen, Fledermäuse, Wolfsheulen, Specht.

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

**Spiral Goa entfernt** (Urteil auf der Hörseite «nein», dann «spiral goa soll raus»; «auf alte projekte musst du nicht schauen»)
- Familie und beide Presets aus Synth 0.2.0 gelöscht, nicht nur ausgeblendet: Projekte gelten in der Alpha nicht als zu schützender Bestand. 0.1.0 bleibt unverändert.
- Der Stil «Goa, Psytrance» spielt statt Spiral Acid Lead die Schichten: Schwebe, Spitzen (Music Box Frost), Off-Beats (Crystal Trance Pluck, Dichte 30).

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

## Stopp und Neuaufbau der Tonausgabe (10. November 2026, Nachtrag)

Christian: Stopp funktioniert nicht, der Ton «überschlägt» sich bzw. verdoppelt sich. Ursache im Neuaufbau aus dem Eintrag oben: Kam `resume()` nicht innerhalb einer Sekunde zurück (belastetes Gerät), wurde die Ausgabe neu gebaut, auch wenn eine andere Anfrage schon dabei war. So konnten sich Aufbauten überholen, Motoren auf dem falschen Kontext landen und einer davon unerreichbar weiterspielen; Stopp erreichte nur den neuesten.

- Es gibt höchstens einen Aufbau gleichzeitig (Kontext, Neuaufbau und Wecken warten jeweils auf den laufenden). Ein Motor, der nicht mehr der aktuelle ist, wird sofort stumm geschaltet und abgehängt; seine Meldungen werden ignoriert.
- Neu gebaut wird nach Ablauf der Wartezeit (jetzt 1,5 s) nur noch, wenn der Kontext wirklich nicht läuft.
- ■ gilt sofort, auch während ▶ noch auf den Ton wartet; der Start fällt dann weg.
- Nachtrag 2: Die eigentliche Ursache war ein Vorzeichenfehler in der Ausblende des Worklets (#695): Beim ■ stieg der Pegel, statt zu fallen, die Wiedergabe hielt nie an und wurde immer lauter. Behoben; ein Test prüft jetzt, dass ■ leiser wird und die Stelle steht.

## Export am Handy: Knopf «Speichern» (10. November 2026)

Christian (Samsung S23, Chrome): Nach «rechne … %» kam beim Export nichts. Chrome lässt einen Download nur kurz nach einem Tippen zu; nach längerem Rechnen wird er still verworfen. Liegt die letzte Geste länger als 4 s zurück, startet der Download darum nicht mehr selbst: Unter den Export-Knöpfen erscheint «Fertig: Datei (MB) · Speichern», das Tippen darauf lädt herunter. Die Leiste steht im Fluss der Seite, nicht fest am Rand (feste Elemente liegen am Handy bei breiter Seite ausserhalb des sichtbaren Bereichs). Gilt für Track (WAV), Export (ZIP), Bereich als WAV und alle anderen Downloads.
