# Klangtransformation

Masterprompt §5 (Sound) und §3 (Software als Forschungsmaterial). Stand: 23. Oktober 2026, Lab 0.1.7, Projektformat 0.7.0.

Christian möchte mit eigenen Beats arbeiten: sie schneller oder langsamer machen, zerlegen, neu rhythmisieren und in hoher Qualität ausspielen. Dafür hat das Lab seit 0.1.7 vier Operationen mit der Signatur `AUDIO → AUDIO`, die Form «Klangtransformation» aus dem Audio-Format (AUDIO-FORMAT.md). Sie sind Operationen wie alle anderen: sechs Varianten stehen nebeneinander zum Anhören, jede lässt sich weiterführen und wieder verwandeln, Startwert und Zufallsentscheidungen stehen im Protokoll, und ein Verlauf lässt sich als Kette auf einen anderen Beat anwenden. Es gibt weiterhin keinen DAW-Editor (§23): keine Spuren, keine Zeitleiste zum Schneiden von Hand.

**Kennzeichnung (§20):** **geprüft** heisst, im Quellcode oder in der offiziellen Dokumentation nachgelesen, mit Fundstelle. **Hypothese** heisst, aus dem Wissensstand beschrieben, nicht einzeln nachgelesen. **Entscheidung** heisst, das Lab macht es bewusst so.

## Ein Durchgang

1. «Ton wählen» und den eigenen Beat laden (WAV, FLAC, MP3, …). Er bleibt auf dem Gerät.
2. *Neu-Rhythmisierung*: sechs Varianten mit verschieden vielen Treffern je Takt, im Tempo der Quelle (geschätzt). Anhören, eins nach dem anderen; «in der Schleife hören» wiederholt sie nahtlos.
3. «weiterführen» bei einer Variante. Dann *Tempo und Tonhöhe*, Ziel-Tempo 140 BPM, Verfahren «Schnitte»: die Schläge bleiben knackig.
4. *Dekonstruktion* oder *Körner* darauf, und so weiter. Jeder Schritt steht im Nacheinander.
5. «WAV» speichert den Klang mit 24 Bit (oder 32 Bit Gleitkomma, oder 16 Bit mit Dither), in der eigenen Abtastrate oder umgetastet auf 44,1, 48, 88,2 oder 96 kHz.
6. Unter «Nacheinander» liegt der Klang als Tonspur unter einer Animation. Der Rhythmus (Ereignisfolge) gibt einem Film über Stationen den Takt, und sein eigener Klang ist dann die Tonspur.

## Die vier Operationen

### Tempo und Tonhöhe (`lab.tempo`)

| Verfahren | was geschieht | wofür |
|---|---|---|
| **dehnen** (WSOLA) | kurze Fenster (Standard 50 ms, Hann, halbe Überlappung) werden neu aneinandergelegt; jedes Fenster wird um höchstens ein Viertel seiner Länge verschoben, bis es am besten an die natürliche Fortsetzung des vorigen passt (Kreuzkorrelation auf einer vierfach verkleinerten Mischung). Tempo ändert sich, Tonhöhe bleibt. Mit «Tonhöhe» und Tempo 1 ändert sich nur die Tonhöhe (dehnen, dann umtasten). | Flächen, Stimmen, Melodien; Tonhöhe ohne Tempo |
| **Schnitte** | der Klang wird an seinen Einsätzen geschnitten; jeder Schnitt behält seine Geschwindigkeit und rückt an die neue Stelle (Zeitpunkt ÷ Tempo). Schneller: Schnitte werden mit 4 ms Ausblende gekürzt. Langsamer: dazwischen Stille. Die Tonhöhe verschiebt jeden Schnitt einzeln. | Beats: die Anschläge bleiben scharf |
| **Tonband** | neu lesen mit gefenstertem Sinc (Blackman, 16 Nulldurchgänge, beim Schnellerlesen mit Tiefpass gegen Aliasing). Tempo und Tonhöhe gehen zusammen: doppelt so schnell ist eine Oktave höher. | der Klang des Samplers, Re-Pitch |

**Ziel-Tempo:** Mit «Ziel-Tempo (BPM)» rechnet das Lab den Faktor aus dem Tempo der Quelle. Ist es nicht angegeben, wird es geschätzt (siehe Messen) und als Schätzung ins Protokoll geschrieben. Bei Halb- oder Doppeltempo gibt man es an.

### Dekonstruktion (`lab.zerlegen`)

Schneiden an den Einsätzen, in einem Raster (Schnitte je Schlag im geschätzten oder angegebenen Tempo) oder an den Zeitpunkten einer Ereignisfolge (Eingang, etwa die Einsätze aus *Tonsignal*). Dann:

- **Reihenfolge:** zufällig, unter Nachbarn vertauscht, rückwärts, vorwärts dann rückwärts, verschränkt (gerade, dann ungerade), nach dem Text einer Konstellation, behalten.
- **Wiederholen** mit Wahrscheinlichkeit und Höchstzahl; wiederholt wird der ganze Schnitt oder seine erste Hälfte, sein erstes Viertel, Achtel (Stottern, Ratchets).
- **Umkehren** und **Auslassen** (Stille in der Länge des Schnitts) mit Wahrscheinlichkeit.

Alle Zufallswahlen kommen aus dem Startwert und stehen als Entscheidung «Zufall» im Protokoll, mit Zählern (wiederholt, umgekehrt, ausgelassen). Die Ordnung der Stücke ist zusätzlich eine Ereignisfolge (`art: "schnitte"`).

**Entscheidung, Konstellation:** Dem Schnitt i fällt das Wort i (reihum) zu; die Schnitte werden stabil nach dem Anfangsbuchstaben ihres Wortes geordnet. Der Text wird gelesen, nicht gedeutet, wie beim Klangerzeuger.

### Neu-Rhythmisierung (`lab.rhythmus`)

Ein Raster aus Takten (4/4) und Schritten je Takt, im Tempo der Quelle oder einem neuen. Woher die Treffer kommen:

| Muster | Treffer |
|---|---|
| euklidisch | k Treffer möglichst gleichmässig auf n Schritte, mit Drehung (E(3,8) ist der Tresillo) |
| Zufall | Schritt 1 immer, sonst mit der Dichte, auf Schlägen öfter |
| die eigenen Einsätze | die Einsätze der Quelle ins neue Raster gesetzt (Quantisieren; mit neuem Tempo wie eine REX-Schleife) |
| Ereignisfolge | der Rhythmus eines anderen Klangs: Einsätze aus *Tonsignal* (Zeitpunkte, ins Raster gerundet) oder der Rhythmus einer anderen Neu-Rhythmisierung (Schritte, aufs neue Raster umgerechnet) |
| Steuersignal | über der Schwelle 1 − Dichte ein Treffer, Stärke aus dem Wert: ein Bildsignal gibt den Rhythmus |
| Konstellation | ein Treffer je Wort, Abstand 1 + (Buchstaben − 1) mod 4 Schritte, gross geschriebene Wörter betont (Entscheidung) |

Welcher Schnitt auf welchen Treffer: der an derselben Stelle der Quelle, der Reihe nach, zufällig, oder nach Stärke (die kräftigsten Schnitte auf die kräftigsten Treffer). Dazu Swing (jeder zweite Schritt später), Umkehren, gestreute Tonhöhe je Treffer, und ob ein Schnitt beim nächsten Treffer endet. **Nahtlos schleifbar:** Was über das Ende hinausklingt, läuft am Anfang weiter; die Datei hat genau die Länge der Takte und lässt sich ohne Lücke wiederholen.

Ausgabe ist neben dem Klang das **rhythmische Muster** aus dem Audio-Format (`EVENT_SEQUENCE` mit `bpm`, `takt`, `raster`, `ereignisse[].schritt`): damit ist auch diese Form seit 0.1.7 gebaut.

### Körner (`lab.koerner`)

Granularsynthese: ein Lesekopf wandert durch die Quelle (Geschwindigkeit −2 … 2, 0 friert ein) oder folgt einem Steuersignal. An ihm werden Körner gelesen (Grösse 5–500 ms, Überlappung 1–32), mit gestreuter Stelle, Tonhöhe, Richtung und Panorama, in der Form weich (Hann), flach oder perkussiv. Aus Mono wird mit der Stereobreite Stereo. Der Pegel wird auf −1 dBFS gebracht. Höchstens 40 000 Körner.

## Mischpult (seit Lab 0.1.45)

Drei weitere Operationen `AUDIO → AUDIO` färben und mischen einen Klang (`operationen/mischpult.js`, Kern `kern/mischpult.js`, reines JavaScript, kein fremder Code):

### Filter in Bewegung (`lab.filter`)

Ein Zustandsvariables Filter wie in analogen Synthesizern (Topologie nach V. Zavalishin, «The Art of VA Filter Design»; Hypothese: so klingen Oberheim SEM und ähnliche), Tiefpass, Hochpass, Bandpass oder Kerbe, Resonanz 0–1. Die Grenzfrequenz steht, schwingt frei (LFO) oder im Takt (Takte je Schwingung, das Tempo angegeben oder geschätzt), folgt dem Anschlag (Auto-Wah: die Hüllkurve öffnet das Filter), einem Steuersignal (ein Bild öffnet das Filter) oder öffnet sich über die Dauer. «Tiefe» sind Oktaven über der Grenzfrequenz. Für Filterfahrten im Drum and Bass und knurrende Bässe.

### Effekte (`lab.effekt`)

Ein Effekt mit einer «Stärke» 0–1 und einem «Anteil» (trocken/nass): **Zerkleinern** (Bitcrusher: 12 bis 2 Bit, die Abtastrate bis auf ein Zweiunddreissigstel; Glitch), **Sättigung** Band (weich, leicht unsymmetrisch) oder Röhre (stärker unsymmetrisch), **Verzerrung** (hart abgeschnitten), **Wavefolder** (was über 1 geht, klappt zurück, wie bei Buchla und Serge; Elektro), **Chorus** (eine Kopie 11–25 ms später, schwebend, links und rechts gegenläufig), **Flanger** (0,5–5 ms mit Rückkopplung), **Echo im Tempo** (punktierte Achtel, Achtel, Viertel, Sechzehntel oder Triolen; Ping-Pong, jede Wiederholung dunkler, wie im Dub) und **Raum** (der Nachhall des Klangerzeugers). Sättigung und Verzerrung bringen den Klang auf den Effektivwert der Quelle zurück, damit «lauter» nicht für «besser» gehalten wird.

### Fertig mischen (`lab.mastering`)

Mastering in einer festen Reihenfolge: Hochpass 25 Hz (Rumpeln), Wärme (Tiefenregal 120 Hz) und Glanz (Höhenregal 8 kHz, Biquads nach R. Bristow-Johnson), unter 120 Hz nur die Mitte (der Bass trägt auf dem Telefon und im Club), die Stereobreite darüber, ein sanfter Bus-Kompressor (weiches Knie, Anstieg 20 ms: die Anschläge bleiben), dann die Lautheit auf ein Ziel (−14, −10, −18 oder −23 LUFS) und ein Limiter mit 5 ms Vorlauf auf die höchste Spitze (Standard −1 dBFS). Die Lautheit wird nach ITU-R BS.1770-4 gemessen (K-Bewertung, Blöcke von 400 ms, Schwellen bei −70 LUFS und 10 LU unter dem Mittel; geprüft gegen die Kalibrierung: 1 kHz bei 0 dBFS auf einem Kanal ergibt −3,01 LUFS). Der Limiter kostet etwas Lautheit, darum wird bis zu dreimal nachgemessen. Die Spitze ist der höchste Abtastwert, nicht der wahre Spitzenwert zwischen den Abtastwerten (bis etwa 0,5 dB höher).

## Qualität

- **Abtastrate und Kanäle der Quelle (Entscheidung):** Bis 0.1.6 wurde jeder Ton beim Lesen auf 44,1 kHz mono gebracht. `decodeAudioData` rechnet immer auf die Rate des Kontexts um, darum liest das Lab jetzt die Abtastrate aus dem Kopf der Datei (WAV, FLAC, MP3, Ogg Vorbis/Opus, MP4/M4A; sonst 48 kHz) und dekodiert in dieser Rate, mit beiden Kanälen. Für Messungen (Tonsignal) gibt es weiterhin die einkanalige Mischung.
- **Rechnen in Gleitkomma, Ablegen mit 24 Bit:** Die Transformationen rechnen in 32 Bit Gleitkomma und legen ihr Ergebnis als WAV mit 24 Bit ab (Projektarchiv). Der Klangerzeuger bleibt bei 16 Bit mono (0.6.0).
- **Pegel:** Standard ist «wie die Quelle»: nur wo das Übereinanderlegen über −0,3 dBFS ginge, wird abgesenkt. Wahlweise auf −1 dBFS.
- **Ausspielen:** 24 Bit, 32 Bit Gleitkomma oder 16 Bit mit dreieckigem Dither (TPDF); Abtastrate wie der Klang oder umgetastet (Sinc). Höher umtasten fügt keine Information hinzu, es passt die Datei nur an eine Sitzung mit 88,2 oder 96 kHz an. Jedes Ausspielen steht als Export `art: "wav"` im Protokoll.
- **Tonspur im MP4:** in Stereo, zuerst AAC mit 320 kbit/s (eigener Versuch in `medien/video.js`), sonst wie bisher `tonspur.js` aus PHORMA III (AAC 256, 192, 128, dann Opus). AAC kodieren die Browser nur mit 44,1 und 48 kHz, darum wird ein Klang mit anderer Rate für die Tonspur auf 48 kHz umgetastet. Chromium ohne AAC-Encoder (etwa der Testbrowser) nimmt Opus.

## Messen

- **Einsätze:** spektraler Fluss (FFT 1024 bei 44,1/48 kHz, alle 256 Abtastwerte, Betrag logarithmisch verdichtet, nur Zunahmen) in drei Bändern (unter 200 Hz, bis 3 kHz, darüber), jedes auf seine eigene Spitze gebracht, dann das stärkste. Ohne diese Trennung verschwindet ein Bassschlag neben dem Rauschen eines Beckens (im Test so gefunden). Spitzen über dem Mittel der Umgebung (±120 ms) plus einem Abstand, der mit der Empfindlichkeit sinkt; mindestens 70 ms auseinander. Dann wird jeder Einsatz in 1-ms-Blöcken der ersten Differenz auf den Anschlag selbst gesetzt (stärkster Anstieg, zurück bis zur leisesten Stelle davor). Im Test liegen die Einsätze höchstens 12 ms neben dem Anschlag, meist 2–3 ms davor.
- **Tempo:** Autokorrelation der Einsatzkurve über 60–200 BPM in halben Schritten, plus halbe Gewichtung des doppelten Abstands, mal einer flachen Glocke um 120 BPM. **Hypothese:** die Vorliebe für mittlere Tempi ist aus der Literatur zur Schlagerkennung übernommen, nicht nachgelesen. Ergebnis ist eine Schätzung mit `sicherheit`, kein Befund über die Musik.

## Referenzen

| Programm | Prinzip | übertragen als | Stand |
|---|---|---|---|
| **SuperCollider** `Warp1` | ein Lesekopf (`pointer`, 0–1 der Datei) unabhängig von der Tonhöhe (`freqScale`); Fensterlänge (`windowSize`), Überlappung (`overlaps`: der nächste Korn beginnt nach Fensterlänge ÷ Überlappung), zufällige Fensterlänge (`windowRandRatio`), Fensterform aus einem Puffer oder eingebaut, Interpolation 1/2/4 Punkte (`server/plugins/GrainUGens.cpp`, `Warp1_next`, Z. 1329–1440) | Körner: Lesekopf, Korngrösse, Überlappung, Streuung; vierpunktige Interpolation. Dehnen ohne Tonhöhe ist dasselbe Prinzip mit Suche nach der passenden Stelle (WSOLA) | **geprüft** (Quellcode, `supercollider/supercollider`, develop, 23. 10. 2026; GPL, kein Code übernommen) |
| **SuperCollider** `GrainBuf` | ein Korn je Auslöser mit Dauer, Rate, Position, Panorama und Hüllkurve aus einem Puffer (ebd., `GrainBufG`, `GrainBuf_next`) | Körner: Panorama je Korn, Fensterformen | **geprüft** (ebd.) |
| **Pure Data** B12 «sampler.transpose» | Transponieren durch eine kurze Schleife (chunk), deren Frequenz aus der gewünschten Transposition und der Chunk-Grösse folgt; ein Sample & Hold verhindert Doppler-Effekte beim Wechsel der Chunk-Grösse (`doc/3.audio.examples/B12.sampler.transpose.pd`) | Tonhöhe ohne Tempo über kurze Fenster (hier WSOLA, dann umtasten) | **geprüft** (Patch-Kommentare, `pure-data/pure-data`, master, 23. 10. 2026) |
| **Reason**: ReCycle/REX, Dr. Octo Rex | ein Loop wird an den Anschlägen in Slices zerlegt; jedes Slice wird im Tempo des Songs an seine Stelle gesetzt, die Tonhöhe bleibt; Slices einzeln umkehrbar, transponierbar | Tempo «Schnitte», Neu-Rhythmisierung mit «die eigenen Einsätze» | Hypothese (Wissensstand) |
| **Ableton Live** Warp-Modi | Beats (Slices an Transienten), Tones/Texture (granular), Re-Pitch (Tonband), Complex (Phasenvocoder) | die drei Verfahren von Tempo und Tonhöhe; Complex nicht gebaut | Hypothese (ableton.com aus dem Container nicht erreichbar) |
| **Ableton Live** Simpler «Slice» | Slices auf Pads, einzeln auslösbar | Dekonstruktion | Hypothese |
| **Bitwig Grid, VCV Rack** | Step-Sequencer und Taktteiler als Module; Trigger und Signal in derselben Form | Raster, Ereignisfolge als Muster; das rhythmische Muster als Ereignisfolge, die andere Operationen lesen | Hypothese (Sequencer), geprüft (Signalform, MODULATION-DOSSIER) |
| **Max/MSP** `groove~`, `munger~` | Sample-Wiedergabe mit Geschwindigkeit und Schleife; Granulator | Tonband, Körner | Hypothese |
| **SuperCollider** Patterns (`Pbind`, `Pseq`) | Ereignisfolgen als eigene, verschachtelbare Daten | Ereignisfolge als Muster für einen anderen Klang | Hypothese |
| **Euklidische Rhythmen** (Godfried Toussaint, 2005) | k Treffer gleichmässig auf n Schritte (Bjorklund) | Muster «euklidisch» | Hypothese (Wissensstand); im Test: E(3,8) ergibt den Tresillo |
| **WSOLA** (Verhelst und Roelands, 1993) | Overlap-Add mit Suche nach der ähnlichsten Fortsetzung | Verfahren «dehnen» | Hypothese (Wissensstand) |

**Was nicht übernommen ist:** kein Phasenvocoder (Ableton «Complex», Paulstretch): für Beats bringen Schnitte mehr, für Flächen reicht WSOLA. Kein Filter, kein Hall als eigene Transformation (der Klangerzeuger hat einen Nachhall). Keine Echtzeit-Wiedergabe mit Reglern: jede Änderung ist eine neue Ausführung mit Protokoll.

## Kopplung

- Klang → Klang: jede Transformation nimmt jeden Klang, auch einen erzeugten oder schon transformierten (Rekursion).
- Klang → Bild: *Tonsignal* misst einen transformierten Klang wie eine Tondatei.
- Bild → Rhythmus: *Bildsignal* gibt ein Steuersignal, die Neu-Rhythmisierung setzt daraus Treffer. Die Körner folgen einem Steuersignal mit dem Lesekopf.
- Klang → Rhythmus → Klang: die Einsätze eines Beats (Tonsignal) oder sein neuer Rhythmus sind Muster für einen anderen Beat.
- Rhythmus → Film: die Ereignisfolge einer Neu-Rhythmisierung gibt dem Film über Stationen den Takt; die Tonspur ist dann der neu rhythmisierte Klang selbst (`kern/stationen.js`).
- Konstellation → Ordnung: der Text einer ORNA-Konstellation ordnet Schnitte oder setzt Treffer.

## Grenzen und nächste Schritte

- Die Einsatzerkennung ist für Schläge gebaut. In weichen Flächen findet sie wenig; dann Raster oder eine Ereignisfolge nehmen.
- Das Tempo ist eine Schätzung. Swing und ungerade Takte (3/4, 7/8) erkennt sie nicht; das Raster der Neu-Rhythmisierung ist immer 4/4 mit frei wählbaren Schritten.
- Lange Dateien (über einige Minuten) brauchen beim Dehnen und Umtasten einige Sekunden; die Oberfläche bleibt dabei bedienbar, ein Abbruch ist möglich.
- Offen: Phasenvocoder für sehr starke Dehnung, Hüllkurven als Transformation, wahrer Spitzenwert (Überabtastung) im Limiter, Spektrum als Befund (AUDIO-FORMAT.md), Rhythmus als Takt für Abtasten und Halten einer Bildmodulation.
