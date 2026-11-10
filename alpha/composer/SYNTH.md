# Synth 0.2.0 und die vier Schichten der Melodie

Aufträge: `synthesizer.md` (Fassung vom 10. November 2026, mit Velvet Dub, Raga Drift, Ice Organism und den sechs Klangcharakteren) und `melodien.md` (10. November 2026: keine Popmelodien, sondern vier Schichten). Synth 0.1.0 bleibt unverändert im Repo; bestehende Projekte klingen wie vorher. Neue Synthspuren nehmen 0.2.0.

## Was neu ist

- **Zwei neue Verfahren in derselben Engine** (`erzeuger/synth-0.2.0.js`), kein zweiter Synthesizer:
  - **saite:** gezupfte Saite (Karplus-Strong). Der Steg staucht Auslenkungen über einem Bruchteil der laufenden Amplitude (Jawari-artig); der Bruchteil schwankt langsam, so wandern die Obertöne beim Ausklingen. Zweite, leicht verstimmte Saite, mitschwingende Saiten (Resonatoren), Gleiten über die Länge der Verzögerung (Meend). Schleifenverstärkung immer unter 1.
  - **glocke:** additive Synthese mit unharmonischen Teiltönen, jeder mit eigener Abklingzeit, kurzer Anschlagklick (Spieldose, Celesta).
- **Im analogen Verfahren:** Atem (Rauschen als schmales Band um den Grundton: Flöte, Chor), Vokalfilter, das zwischen Vokalen wandert (atmender Chor).
- **Ausdruck** (Detail-Regler): verzögertes Vibrato, Anschleifen von unten, längere Gleitzeit. Wirkt bei Presets mit Ausdruck (Smoked Flute, Sitar Glide, Signal Sparrow).
- **Nachbearbeitung der Spur, nur wo verlangt:** Wärme um 250 Hz, Wavefolder, Bitcrusher, Vinyl-Knistern mit Mikro-Klicks und Pops, Glanzhall mit Vorverzögerung, Schimmer (eine Oktave höher in den Hall), Fiepen (kleine hohe Figuren dort, wo die Spur leise ist). Hall und Schimmer rechnen die Schleife zweimal: kein Abriss an der Naht.
- **Klangcharaktere:** warm, weich, fiepsend, strahlen-flächig, knarzend, hallig-glänzend. Jedes Preset trägt seine Charaktere als Schlagwort (Filter «Charakter» neben «Synth dazu»). Dazu der Regler **Färbung** (Gruppe «Charakter», mit Menge), der jedes Preset in Richtung eines Charakters schiebt; Zuordnung in `CHARAKTERE` und `faerben()`.
- **Notation:** `3=` in einem Akkord heisst «dieser Ton klingt aus dem vorigen Akkord ohne neuen Anschlag weiter». So wandert in einer Fläche eine einzelne Stimme, während die anderen liegen. Alte Zeilen ohne `=` lesen sich wie bisher.
- **Tonleitern:** Raga-inspiriert Bhairav, Bhairavi, Yaman, Todi, Marwa (Tonvorrat, keine Raga-Praxis); Maqam Bayati, Rast, Saba, Kurd und Dastgah Shur, die meisten mit Vierteltönen (Halbtöne mit Nachkommastelle, gemessen auf 3 Cent genau, bezogen auf den Kammerton).

## Presets (24 in 11 Familien)

| Familie | Preset | Rolle | Verfahren | Charaktere |
|---|---|---|---|---|
| Velvet Dub | Velvet Rhodes Haze | Off-Beat | FM (Anschlag öffnet Bellen), Tremolo, Knistern | warm, weich |
| Velvet Dub | Smoked Flute Echo | Ruf | analog mit Atem, Vibrato, Echo | weich, knarzend |
| Shadow Dub | Shadow Chord, Deep Room Drone | Pad, Drone | wie 0.1.0 (bitgleich) | warm, knarzend / warm, weich |
| Ice Organism | Music Box Frost | Spitzen | Glocke, Glanzhall, Schimmer | hallig, fiepsend |
| Ice Organism | Breathing Choir Pad | Fläche | analog, Vokal wandert, Atem, Schimmer | strahlend, weich |
| Ice Organism | Crackle Glass Texture | Off-Beat | FM-Glas, starkes Knistern, Bitcrusher, Hall | knarzend, hallig, fiepsend |
| Raga Drift | Tanpura Glow Drone | Tanpura | Saite mit Jawari, zwei Saiten | warm, strahlend |
| Raga Drift | Sitar Glide Lead | Alap | Saite, mitschwingende Saiten, Meend | hallig, knarzend |
| Tape Memory | Amber Memory Pad | Pad | wie 0.1.0 | warm, weich |
| Tape Memory | Worn Electric Keys | Off-Beat | **überarbeitet:** weniger Zinke, länger, Tremolo, Knistern, Wärme | warm, knarzend |
| Glass Circuit | Glass Circuit Keys | Spitzen | **überarbeitet:** harmonischer Modulator, weicherer Anschlag, Hall | hallig, weich |
| Glass Circuit | Restless Poly Pulse | Akkord | wie 0.1.0 | knarzend |
| Glass Circuit | Signal Sparrow | Spitzen | analog, Sweep von unten, Fiepen | fiepsend |
| Spiral Goa, Open Trance, House Motion, Machine Pop, Dark Pop | je zwei wie in 0.1.0 | | bitgleich | siehe Preset-Wahl |

Überarbeitet wurden die beiden Keys, weil Christian sie am 9. November «am schlimmsten» fand. Alle anderen Presets aus 0.1.0 klingen in 0.2.0 bitgleich (Test). Makro «Charakter» heisst in den neuen Familien Bellen (Velvet), Jawari (Raga) und Glanz (Ice).

## Melodie: vier Schichten statt einer Oberstimme (`kern/sequenzen.js`)

Christian (10. November 2026): keine Popmelodien; «Melodie» heisst lange, sich verändernde Flächen, helle Spitzen, unregelmässige Off-Beats und Anleihen an Dvořák, Tschaikowsky, Rachmaninow.

- **Fläche:** lange Klänge, Harmonie alle 8, 4 oder 2 Takte (Wandel; bei Halftime doppelt so lang, bis 16 Takte), Stimmführung mit kleinsten Schritten, 3–6 Stimmen (Weite). Einzelne Stimmen wandern (Wechselnoten), die anderen halten mit `=`.
- **Spitzen:** 0–3 helle Einzelklänge je Viertakt-Phrase, kurz nach einer Snare oder am Phrasenende, nie auf jeder Snare.
- **Off-Beat:** Akkordfetzen neben dem Schlag, nur in den Lücken der Drums (aus den Drumspuren gelesen), mal dicht, mal lange nichts; bei raga- und maqam-inspirierten Tonleitern nach einem Zyklus von 7 oder 10 Sechzehnteln gegen den 4/4-Takt.
- **Ruf** (selten, Horn oder Flöte, pentatonisch), **Alap** (Ton für Ton vom Grundton aufwärts, Meend und Gamak-artiges Pendeln), **Tanpura** (Pa, Sa, Sa, Sa tief; der Grundton bleibt).
- **Klassik** wirkt in allen Schichten: Orgelpunkt, Vorhalt 4–3, chromatisch absteigende Innenstimme (Oktave, Septime, kleine Septime, Sexte), weite Lage, Glockenklang aus Oktave und Quinte bei den Spitzen. Keine Zitate.
- **Regler** im Klang-Reiter jeder Synthspur: Wandel, Weite, Spitzen, Off-Beat, Klassik, Ruhe. Skala über die Tonleiter des Basses, Ausdruck im Klang. Dazu **sechs Melodie-Varianten** (1–6, aus einem gemeinsamen Startwert) und «neue sechs». Alles bleibt im Muster editierbar.
- Die älteren Rollen (Pad, Keys, Arp, Lead …) bleiben für bestehende Projekte und als Werkzeug, stehen aber hinten in der Liste.
- **Track erzeugen:** Ornament und Drum and Bass bekommen zur Schwebe zwei leise Schichten: Spitzen (Music Box Frost) und Off-Beats (Worn Electric Keys bzw. Velvet Rhodes Haze). Indien bekommt den Tanpura-Drone.

## Quellen und Lizenzen

Keine fremden Assets, Samples, Presets oder Wellenformdateien; kein GPL-Code. Karplus-Strong, additive Glocken, FDN-Hall und Körner-Tonhöhenverschiebung sind allgemein bekannte Verfahren, selbst geschrieben. Die Klassik-Anleihen sind Satztechniken, keine Melodiezitate. Ein Asset-Manifest ist darum weiterhin nicht nötig.

## Prüfung

- `node --test tests/composer.test.mjs`: 43 grün, darunter
  - alle 24 Presets endlich, Spitze ≤ 0,5, mono-verträglich (Korrelation über 0,25), ohne Rumpeln, reproduzierbar; jede Familie mindestens zwei Presets; alle sechs Charaktere vertreten
  - die zwölf nicht überarbeiteten Presets aus 0.1.0 bitgleich
  - jede Färbung endlich, gleiche Spitze, hörbar anders
  - `=` hält Töne ohne neuen Anschlag; Spitzen selten; Off-Beats nie auf belegten Schritten oder auf dem Schlag; Ruhe macht nicht dichter
  - Maqam Bayati: zweite Stufe 150 Cent über dem Grundton, gemessen auf 3 Cent genau
- Browser (Chromium, headless, Linux): Track «Ornament» (88 s, 17 Spuren) in etwa 6 s; Breathing Choir dazu über den Charakter-Filter, Variante 3, Klassik 90, Abspielen; keine Fehler in der Konsole.
- Hörproben mit `node tools/composer-synth-hoerproben.mjs <ordner>`.
- **Nicht geprüft:** der Klang. Claude kann nicht hören; Messwerte sagen nichts darüber, ob es gut klingt.

## Vorbereitet, nicht gebaut

- Zyklen frei wählbar (heute aus der Tonleiter abgeleitet), Phrasengrenzen aus dem Arrangement für die Schichten, Wiederkehr mit Veränderung über den ganzen Track
- Stimmungen mit freien Cent-Werten je Stufe (heute als Tonleitern in Viertelton-Schritten)
- MIDI und Tastatur, Pitch Bend, Modwheel, Sustain-Pedal; Automation der Makros über die Zeit
- Wellenformen aus AKWF (CC0) mit Manifest, Vocoder mit der Klonstimme, DX7-Import, Faust- oder WASM-Fassung

---

# Synth 0.1.0 und ganze Tracks

Auftrag: `synthesizer.md` (Baustein-Prompt zum Masterprompt), 9. November 2026. Dazu Christians Wunsch: einen ganzen Track (z. B. 90 Sekunden) mit allen Spuren und Effekten erzeugen, um mögliche Ergebnisse zu hören und dann von Hand weiterzuarbeiten.

## Architektur

- **Eine gemeinsame Engine** (`erzeuger/synth-0.1.0.js`) mit fünf Verfahren im selben Notenweg: Tonhöhe, dann Oszillator, dann Filter (12 oder 24 dB, Zustandsvariable Filter), dann Hüllkurven, danach eine Nachbearbeitung der ganzen Spur.
  - **analog:** zwei Oszillatoren (Säge, Puls mit Pulsbreitenmodulation, Dreieck, Sinus, bandbegrenzt mit PolyBLEP), Sub, Rauschen, Unisono.
  - **fm:** drei Operatoren mit Phasenmodulation, parallel oder gestapelt, Rückkopplung. Anschlag und eine eigene Hüllkurve steuern den Index. Das ist keine DX7-Emulation.
  - **wavetable:** Rahmen aus Teiltonspektren, überblendet. Eine Tabelle pro Periode, nur mit Teiltönen unter der Nyquistgrenze.
  - **supersaw:** sieben verstimmte Sägezähne mit Pegelausgleich.
  - **orgel:** Zugriegel, Klick, Perkussion.
- **Nachbearbeitung der Spur:**
  - Wow/Flutter des Bandes, aus der absoluten Zeit gerechnet, darum für alle Stimmen gleich.
  - Davon getrennt eine Drift je Stimme.
  - Bandrauschen, Sättigung, Chorus.
  - Stereobreite höchstens wie im Original, damit Mono stabil bleibt.
  - Gleichanteil und Rumpeln unter 30 Hz werden entfernt.
- **Noten:**
  - Die Melodiezeile hat jetzt Akkorde (`1+3+5`).
  - Polyphone Presets klingen aus; ein langer Ausklang endet spätestens 2 s nach dem übernächsten Akkord.
  - Monophone Presets dämpfen die vorige Note ab. Ein Slide (`~`) gleitet und setzt die Hüllkurven nicht neu an (Legato). Ein Accent (`!`) öffnet das Filter stärker und kürzer.
- **Sequenzen** (`kern/sequenzen.js`): pad, drone, chord, keys, arp, pluck, acid, lead, puls.
  - Die Grundtöne kommen vom ersten Ton jedes Bass-Takts, Rhythmus und Akzente von der Kick.
  - Ab 140 BPM wechseln Pads und Akkorde nur alle zwei Takte (Halftime-Gefühl).
  - Erzeugst du den Bass neu, folgt die Sequenz. Hast du das Muster von Hand geändert, folgt sie nicht mehr.
- **Rechenzeit:**
  - Eine Sequenz wiederholt sich nach höchstens 8 Takten. Gerechnet wird ein Durchlauf als Schleife, der dann über die Länge gelegt wird.
  - Die Steuerwerte laufen alle 16 Abtastwerte.
  - Bis zu drei Worker rechnen gleichzeitig.
  - Gemessen in Node: 64 Takte Drone 1,3 s, Keys 0,9 s (vorher 17 s und 11 s). Im Browser (Chromium, headless, Windows) braucht ein ganzer Track von 90 s etwa 5 s.
- **Kammerton** als Projekteinstellung (`A = … Hz`, Standard 432). Eine Änderung stimmt Bass, Synths und Flächen neu.
- **Echo 0.1.0** (Plugin): Dub- und Bandecho mit Filtern und Sättigung im Rückkopplungsweg, Ping-Pong. Die Zeit wird beim Anlegen aus dem Tempo gesetzt (punktierte Achtel, ab 140 BPM im halben Tempo).

## Presets (16) und Makros

| Familie | Presets | Richtung |
|---|---|---|
| Shadow Dub | Shadow Chord (pad, analog) · Deep Room Drone (drone, wavetable) | dunkle Akkorde, gefilterte Anschläge, Sättigung |
| Tape Memory | Amber Memory Pad (pad, analog) · Worn Electric Keys (keys, FM) | warm, instabil, Wow/Flutter, Rauschen |
| Glass Circuit | Glass Circuit Keys (keys, FM) · Restless Poly Pulse (chord, analog, Filter-LFO im Sechzehnteltakt) | gläsern, rhythmisch |
| Spiral Goa | Spiral Acid Lead (acid, analog, einstimmig, Accent und Slide) · Liquid Resonance Arp (arp) | resonant, ineinandergreifend |
| Open Trance | Open Sky Saw (pad, supersaw) · Crystal Trance Pluck (pluck, supersaw) | breit, klar |
| House Motion | Velvet Organ Chord (chord, orgel) · Warm House Stab (chord, analog) | Stabs, Orgel |
| Machine Pop | Motor Pulse (puls, analog, einstimmig) · Machine Strings (pad, analog mit Vokalfilter) | präzise Pulse, synthetische Streicher |
| Dark Pop | Dark Brass (chord, analog) · Industrial Bell Keys (keys, FM, metallischer Anschlag) | markant, metallisch |

Die Zuordnung zu Künstlern ist eine gestalterische Richtung. Es sind keine Originalpatches und keine Emulationen bestimmter Geräte.

Jede Familie hat sechs Makros (Zuordnung in `MAKROS`, auch im Klang-Reiter unter «Was die Makros hier tun»):
- **Helligkeit:** Filter ±1,6 Oktaven; bei FM der Index, bei Wavetable die Lage.
- **Bewegung:** alle LFO-Tiefen, die Filterhüllkurve, das Wandern im Wavetable.
- **Wärme:** Sättigung und etwas dunkler.
- **Alter:** Drift, Wow/Flutter, Rauschen, Verstimmung.
- **Breite:** Unisono, Chorus, Stereo.
- **Charakter:** je Familie benannt (Spannung, Glanz, Metall, Resonanz, Biss): Resonanz oder FM-Index.

Dazu kommt die Lage in Oktaven. Im Klang-Reiter gibt es eine Preset-Wahl über alle Familien, Rolle, «Sequenz neu» und «Variation» (die Makros werden begrenzt zufällig verschoben, «zurück» macht das rückgängig). Neben «Synth dazu» filtern zwei Listen nach Rolle und Verfahren.

## Ganzer Track (Arrangement 0.1.0)

«Track erzeugen» nimmt den gewählten Stil und die gewählte Dauer (60, 90, 120 oder 180 s):
1. Drums und Bass über die volle Länge (in ganzen Viertakt-Gruppen).
2. Die Synths und die Fläche des Stils (`BESETZUNG` in `kern/arrangement.js`).
3. Ein Arrangement: Intro, Aufbau, Hauptteil, Breakdown, Hauptteil 2, Outro.
   - Je nach Funktion der Spur (Kick, Backbeat, Höhen, Perkussion, Bass, Pad, Melodie, Fläche) setzen Spuren mit Dropouts ein und aus.
   - Im Aufbau fährt ein Filter, an dessen Ende ein Stutter folgt.
   - In den Hauptteilen kommen Echo-Würfe auf die Melodie.
   - Am Ende des Breakdowns läuft die Fläche rückwärts, und die Kick kehrt mit einem Hochpass zurück, der sich öffnet.
   - Am Schluss kommt ein Tape-Stop.
4. Die Summe wird schnell auf etwa −14 LUFS geschätzt; gemessen waren es −14,0 und −14,2. «auf Ziel bringen» macht es genau.

Alle Ereignisse des Arrangements sind gewöhnliche Unterbrechungen mit der Markierung `arr` und stehen in der Liste jeder Spur. Die Abschnitte erscheinen auf dem Lineal. Danach ist alles von Hand änderbar.

## Quellen und Lizenzen

Es werden keine fremden Assets verwendet. Alle Klänge sind eigene Synthese, es gibt keine Wellenformdateien, Samples oder Presets aus Fremdquellen. AKWF, Legowelt, PresetShare, Samples From Mars und Reverb Machine wurden nicht eingebunden. Kein GPL-Code (Surge, Dexed, Vital, OB-Xd), nur allgemein bekannte Verfahren selbst geschrieben (PolyBLEP, Phasenmodulation, Zustandsvariable Filter, Supersaw-Prinzip). Darum ist auch kein Asset-Manifest nötig.

## Prüfung

- **Tests** (`node --test tests/composer.test.mjs`, 28 grün):
  - Alle 16 Presets sind endlich, liegen bei einer Spitze von höchstens 0,5, sind mono-verträglich (Korrelation über 0,25) und haben keinen Gleichanteil.
  - Sie sind reproduzierbar.
  - Akkorde, polyphon gegen einstimmig, Legato, alle Sequenzrollen, Kammerton und Echo-Zeit stimmen.
- **Browser** (Chromium, headless, Windows):
  - Synths zu einem Hip-Hop-Stil, Presetwechsel, Variation und zurück.
  - Bass neu erzeugt: die Synths folgen.
  - Kammerton 440, Export.
  - Ganzer Track in DnB und ECM (88 s mit 9 Spuren, 93 s mit 8 Spuren) in etwa 5 s; Messung danach −14,2 bzw. −14,0 LUFS bei −1,0 dBTP.
  - Keine Fehler in der Konsole.
- **Hörbeispiele** in `ornament-material/hoerproben/synth/`, je Preset:
  - Demophrase
  - dieselbe Vergleichsfolge trocken und mit Effekten (auf −14 LUFS angeglichen)
  - Helligkeit von 0 bis 100
  - mit Drums und Bass
  
  Dazu sechs ganze Tracks in `ornament-material/hoerproben/tracks/`.
- **Nicht geprüft:** der Klang. Claude kann nicht hören; das Urteil liegt bei Christian.

## Vorbereitet, nicht gebaut

- Weitere Presets; Favoriten, Duplizieren und Speichern eigener Presets (bisher als Teil des Projekts)
- Spielen über MIDI und Tastatur, Pitch Bend, Modwheel, Sustain-Pedal
- Automation der Makros über die Zeit
- DX7-Import, Faust- oder WASM-Fassung für VST/AU
- Ein echter Vocoder (Idee: die Klonstimme aus `ornament-studio` als Modulator; die Stimmvorlagen bleiben privat)
- Externe Plugin-Hosts, KI-Klangerzeugung
- Wellenformen aus AKWF (CC0): erst nach Prüfung und mit Manifest
