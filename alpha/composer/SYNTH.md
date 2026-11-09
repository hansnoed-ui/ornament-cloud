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
