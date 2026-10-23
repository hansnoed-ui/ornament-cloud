# Audio-Operationsformat

Masterprompt §5. Stand: 23. Oktober 2026, Lab 0.1.7, Projektformat 0.7.0.

Dieses Format legt fest, in welchen Formen Klang im Lab vorkommen kann und wie er an Bildoperationen koppelt. Gebaut sind zwei Wege. Erstens wird eine eigene Tondatei Material, die Operation **Tonsignal** misst sie, und das Ergebnis moduliert Bildparameter über die vorhandene Modulation (`kern/modulation.js`), über die Varianten oder über die Zeit (Lab 0.1.3). Zweitens erzeugt der **Klangerzeuger** Klang ohne Tondatei, aus einem Bild, einem Steuersignal, dem Text einer Konstellation oder dem Startwert, und eine Animation kann einen Klang als Tonspur tragen (Lab 0.1.5; der Film über Stationen seit 0.1.4, docs/STATIONEN.md). Es gibt weiterhin keinen Audioeditor und keinen vollständigen Synthesizer (§23).

**Kennzeichnung (§20):** **geprüft** heisst, im Quellcode oder in der offiziellen Dokumentation nachgelesen, mit Fundstelle. **Hypothese** heisst, aus dem Wissensstand beschrieben, nicht einzeln nachgelesen. **Entscheidung** heisst, das Lab macht es bewusst so.

## Grundsatz: keine neuen Typen neben den vorhandenen

Klang bringt keine eigene Welt von Typen mit. Die acht Formen aus §5 werden in den Typen dargestellt, die das Lab schon hat (`kern/typen.js`, Register `KLANGFORMEN`). Unterschieden wird über Felder in den Daten oder über die Signatur einer Operation.

**Entscheidung:** Ein Steuerwert aus einem Klang ist dasselbe `CONTROL_SIGNAL` wie eines aus einem Bild. Darum steht er überall dort zur Wahl, wo heute ein Bildsignal steht, ohne neue Verbindungsregeln. Das ist die Übertragung aus VCV Rack, wo Audio und Steuerspannung dieselbe Form haben (MODULATION-DOSSIER, Abschnitt 1, geprüft). Die Trennung, die Reason und Pure Data sichtbar machen (Audio- und CV-Kabel, Signal- und Nachrichtenobjekte), bleibt erhalten: Das Signal selbst (`AUDIO`) koppelt nie direkt an einen Parameter, sondern immer über einen ausdrücklichen Wandler.

## Die acht Formen

| Form (§5) | Typ | Kennzeichen in den Daten | Beispiel | im Lab |
|---|---|---|---|---|
| **Audiosignal** | `AUDIO` | Material mit `ton: { dauer, abtastrate, kanaele }`, Datei unverändert unter `medien/<id>.wav` (oder mp3, ogg, flac, m4a, …) | eigene Aufnahme | **gebaut** (Import) |
| **Event / Trigger** | `EVENT_SEQUENCE` | `daten: { art, ereignisse: [{ t, staerke?, band? }], beginn, dauer, einheit: "s" }` | Anschläge, Schnitte | **gebaut** (Einsätze aus dem Tonsignal) |
| **Steuerwert** | `CONTROL_SIGNAL` | `daten.werte`: Folge 0–1 | Hüllkurve, Bildsignal | **gebaut** (seit 0.1.0) |
| **zeitlicher Parameterverlauf** | `CONTROL_SIGNAL` | zusätzlich `achse: "zeit"`, `beginn`, `dauer`, `je` (Sekunden je Wert) | Automationskurve | **gebaut** (Tonsignal) |
| **Frequenzspektrum** | `METADATA` | `daten: { art: "frequenzspektrum", baender: 32, grenzenHz: [...], je, werte: [[...32], …] }` | Analyse | vorgesehen |
| **rhythmisches Muster** | `EVENT_SEQUENCE` | zusätzlich `bpm`, `takt` (z. B. `[4, 4]`), `raster` (Teilung), `ereignisse[].schritt` | Pattern, Sequenz | **gebaut** (`lab.rhythmus`, 0.1.7) |
| **Klanggenerator** | `AUDIO` | eine Operation ohne `AUDIO`-Eingang mit Ausgang `AUDIO` (Klasse `zeitlich`) | Oszillator, Sonifikation eines Bildes | **gebaut** (`lab.klang`) |
| **Klangtransformation** | `AUDIO` | eine Operation `AUDIO → AUDIO` | Tempo, Zerlegen, Granular | **gebaut** (`lab.tempo`, `lab.zerlegen`, `lab.rhythmus`, `lab.koerner`, 0.1.7, KLANGTRANSFORMATION.md) |

Generator und Transformation sind keine Datenformen, sondern Signaturen von Operationen. Sie brauchen kein neues Feld im Projekt, nur Operationen mit Beschreibung im Register. Ein Generator ohne jeden Eingang erscheint wie die ORNA-Konstellation immer in der Liste. Eine Sonifikation hätte die Signatur `IMAGE → AUDIO`, der Rückweg zu Tonsignal.

## Wie die Formen an Bildoperationen koppeln

```
Tondatei ──Import──► AUDIO ──lab.tonsignal──► CONTROL_SIGNAL (achse «zeit») ──Route──► jeder Zahlparameter jeder Bildoperation
                                     └──────► EVENT_SEQUENCE (Einsätze)        (Tiefe, Polarität, Abtasten und halten)
```

| Form | Kopplung an Bild | Stand |
|---|---|---|
| Steuerwert, Parameterverlauf | Modulationsquelle «Steuersignal»: Tiefe −1 … +1, bipolar oder einpolig, fortlaufend oder abgetastet, mehrere Routen summiert | gebaut |
| Ereignisfolge | als Takt für Abtasten und halten (Wert springt bei jedem Ereignis, wie Sample & Hold mit Trigger), als Auslöser einer neuen Variante oder eines Schnitts in einer Bildfolge | vorgesehen |
| Frequenzspektrum | 32 Bänder auf 32 Spalten einer Wiederholung oder Farbtöne einer Farbmodulation (Spektrum als Nebeneinander) | vorgesehen |
| rhythmisches Muster | Takt eines Films über Stationen (gebaut, 0.1.7), Muster für einen anderen Klang (gebaut); Takt der Iterationen eines Feedbacks | teils gebaut |
| Generator | Rückweg Bild → Klang: der Klangerzeuger liest ein Bild oder ein Steuersignal; jeder seiner Zahlparameter ist wie bei einer Bildoperation modulierbar | gebaut |
| Transformation | ein Klang wird gedehnt, zerstückelt, neu gesetzt, in Körner aufgelöst; Steuersignal (auch aus einem Bild) als Rhythmus oder Lesekopf | gebaut (0.1.7) |

### Die gemeinsame Uhr

Die Modulation kennt nur die Stelle u von 0 bis 1 (`kern/modulation.js`). Ein Steuersignal mit `achse: "zeit"` übersetzt sie in Klangzeit: **t = beginn + u · dauer**.

- **Über die Varianten (Nebeneinander):** Sechs Varianten lesen den Klang bei u = 0, 0,2, … 1, also sechs Momente gleichmässig über den Ausschnitt verteilt. Ein Nacheinander wird so als Nebeneinander sichtbar.
- **Über die Zeit (Nacheinander):** Das Feedback liest bei Iteration k die Stelle u = k / Iterationen, die Komposition je Bild ihrer Bildfolge. Die ganze Bildfolge durchläuft also den ganzen Ausschnitt. In Echtzeit synchron ist das, wenn die Bildfolge so viele Bilder hat wie der Ausschnitt mal 30 (Bildrate der Animation). Beim Feedback heisst das höchstens 4 s Klang bei 120 Iterationen. **Entscheidung:** Die Zeit bleibt gestreckt und nicht in Echtzeit. Seit 0.1.4 kann der Film über Stationen, seit 0.1.5 auch die Animation des letzten Schritts trotzdem eine Tonspur tragen (siehe unten). Sie läuft in Echtzeit ab dem `beginn` des Signals und ist darum nur dann genau synchron, wenn die Bildfolge so viele Bilder hat wie der Klang Sekunden mal 30.

## Gebaut: Tondatei als Steuersignal

### Material `AUDIO`

«Ton wählen» oder Hineinziehen liest WAV, MP3, OGG, FLAC, M4A, AAC, WebM und Opus, höchstens 60 MB und 10 Minuten. Die Datei bleibt unverändert und lokal im Browser. Sie liegt mit SHA-256 im Projekt und kommt so ins Archiv. Zum Messen dekodiert der Browser sie mit Web Audio (`OfflineAudioContext`) und mischt sie einkanalig (`medien/browser.js`). Seit 0.1.7 in der Abtastrate aus dem Kopf der Datei und mit beiden Kanälen (bis 0.1.6: 44,1 kHz mono), damit die Klangtransformationen in voller Qualität rechnen.

### Operation `lab.tonsignal` (Adapter)

Die Messung ist nicht neu geschrieben. Sie ist die Tonanalyse von **PHORMA III** (`alpha/phorma-iii/ton.js`, unverändert, ohne DOM, läuft auch in Node). Diese Analyse zerlegt einen Ton in Kurven je Filmbild (30 je Sekunde). Das Lab nimmt daraus:

| Merkmal | was es misst (ton.js) |
|---|---|
| Hüllkurve | Effektivwert je Filmbild, auf das 95. Perzentil normiert, geglättet (schnell herauf, langsam herunter) |
| Band tief / Mitte / hoch | dasselbe nach Einpol-Filtern: unter 200 Hz, 200 Hz – 3 kHz, über 3 kHz |
| spektraler Schwerpunkt | neu im Lab, aus den 32 Spektralbändern von ton.js (FFT 2048, Hann, logarithmisch 40 Hz – 12 kHz): Mittel der Bandnummer, gewichtet mit der Stärke. 0 dunkel, 1 hell |
| spektraler Fluss | wie stark der Klang gerade einsetzt: Anstieg der drei Bänder gegenüber den zwei Bildern davor, logarithmisch, mit Schwelle |
| Einsätze | Spitzen im Fluss über einer gleitenden Schwelle, mindestens 0,18 s auseinander, als Hüllkurve je Anschlag (0,2 s Abklingen) |

Parameter: Merkmal, Ausschnitt (ab, Länge), Proben (8–1024, Standard 120) und «auf 0–1 strecken». Jede Probe ist der Mittelwert über ihren Abschnitt, bei den Einsätzen das Maximum, damit kein Anschlag zwischen zwei Proben verschwindet. Das ist dieselbe Verdichtung wie beim Bildsignal, das über Streifen mittelt. Ausgaben:

1. `CONTROL_SIGNAL` «Ton: Hüllkurve, 0–12,5 s» mit `werte`, `achse: "zeit"`, `beginn`, `dauer`, `je`, `merkmal`, `quelle: "ton"`.
2. `EVENT_SEQUENCE` «Einsätze: 23, 0–12,5 s» mit Zeitpunkt, Stärke und tragendem Band jedes Einsatzes.

Das Protokoll des Knotens hält Ausschnitt, Abtastrate, Zahl der Filmbilder, Einsätze und Schnitte, den Rohbereich vor dem Strecken und den Hinweis «Messung, keine Bewertung» fest. Reproduzierbar: ja. Dieselben Abtastwerte ergeben dasselbe Signal. Komprimierte Formate dekodiert der Browser, dort können zwei Browser um Rundungen abweichen (Hypothese, nicht gemessen).

### Bedienung

1. «Ton wählen». Der Ton steht im Material als ♪ und auf der Bühne mit Wiedergabe.
2. Operation *Tonsignal*, Merkmal wählen, ausführen. Steuersignal und Einsätze stehen als Kurve und als Striche auf der Bühne.
3. Ein Bild im Material wählen, eine Operation wie *Feedback*, *Wiederholung* oder *Komposition verändern*. Unter «Variation und Modulation» die Quelle «Steuersignal» nehmen. Das neue Tonsignal ist vorgewählt. «Modulation wirkt» entscheidet: über die Varianten oder über die Zeit.
4. Im Nacheinander steht beim Schritt, welches Signal welchen Parameter bewegt hat. «Animation des letzten Schritts» rechnet die Bewegung mit derselben Zeitmodulation.

## Gebaut: Klangerzeuger (Lab 0.1.5)

### Operation `lab.klang`

Ein Generator: Alle Eingänge sind freiwillig, darum steht er wie die ORNA-Konstellation immer in der Liste, auch ohne Material. Eingänge sind ein Bild, ein Steuersignal und eine Konstellation. Ist der Ausgang eines davon, steht er als Eingang vor. Der Parameter **Quelle** entscheidet, was klingt. Bei «aus dem Eingang» gilt die Reihenfolge Bild, Signal, Konstellation, sonst Startwert.

| Quelle | Abbildung (Entscheidung) |
|---|---|
| **Bild** | gelesen wie ein Spektrogramm: Spalten werden nacheinander gespielt (links zuerst, über die ganze Dauer), Zeilen sind Bänder (oben hoch, unten tief), Helligkeit² ist die Stärke. Ein Oszillator je Band, die Stärke gleitet linear von Spalte zu Spalte. Das Nebeneinander des Bildes wird Nacheinander. |
| **Steuersignal** | der Verlauf ist die Tonhöhe. Bei gestufter Stimmung ein Ton je 1/Dichte Sekunden (abgetastet), bei «gleitend» ein einziger gleitender Ton. Ein Bildsignal wird so hörbar, ein Tonsignal ergibt einen Klang zweiter Ordnung. |
| **Konstellation** | der Text der ORNA-Konstellation, ein Ton je Wort: die Wortlänge gibt die Dauer, nach Satzzeichen folgt eine Pause, der Anfangsbuchstabe (a … z) gibt die Tonhöhe, gross geschriebene Wörter sind stärker. Der Text wird nicht gedeutet, nur gelesen. |
| **Startwert** | ein Zufallsweg im Tonraum (Schritt ±0,125, mit Wahrscheinlichkeit 0,2 ein Sprung), Abstände exponentiell mit der Dichte. Die Ziehung steht als Entscheidung «Zufall» mit Startwert im Protokoll. |

Weitere Parameter: Dauer (1–30 s), Grundton (40–880 Hz), Umfang (1–6 Oktaven), Stimmung (pentatonisch, chromatisch, Obertonreihe, gleitend), Klangfarbe (Sinus, vier Teiltöne, FM 2:1, FM 1,4:1 glockenartig), Dichte, Bänder, Anschlag, Abklingen, Nachhall. Alle Zahlen sind modulierbar: Sechs Varianten mit verschiedener Dauer, Grundton oder Nachhall stehen nebeneinander und lassen sich anhören.

Ausgaben: ein `AUDIO`-Ergebnis (WAV, 44,1 kHz, 16 Bit, mono, auf −1 dBFS gebracht, mit Umriss für die Anzeige) und ausser beim Bild eine **Partitur** als `EVENT_SEQUENCE` mit Zeit, Stärke und Frequenz jedes Tons. Der Klang ist ein Ergebnis wie jedes andere: «weiterführen» macht ihn zum Ausgang, dann misst **Tonsignal** ihn, und das Signal moduliert wieder Bilder. Der Kreis Bild → Klang → Steuersignal → Bild ist damit geschlossen.

**Entscheidung: reines JavaScript statt Web Audio.** Die Abtastwerte rechnet `kern/klang.js` selbst (Oszillatoren über die Phase, Hüllkurve, Nachhall aus vier Kammfiltern und zwei Allpässen nach Schroeder). Ein `OfflineAudioContext` wäre bequemer, aber seine Oszillatoren und Filter sind in jedem Browser etwas anders gebaut. So ergibt derselbe Startwert überall dieselbe Rechnung (`reproduzierbar: "ja"`, in Node getestet). Zwischen Browsern kann `Math.sin` in den letzten Stellen abweichen, nach der Rundung auf 16 Bit fällt das kaum ins Gewicht (Hypothese, nur Node und Chromium geprüft). Web Audio braucht das Lab weiterhin zum Lesen fremder Tondateien und zum Abspielen.

### Tonspur im MP4

Unter «Nacheinander» steht neben «Animation des letzten Schritts» die Wahl **Tonspur**: keine oder ein Klang des Projekts (Tondatei oder erzeugt). Hat ein Tonsignal den Verlauf gesteuert, steht sein Klang vor, und die Spur beginnt beim `beginn` seines Ausschnitts. Der Klang läuft ab dort in Echtzeit und ganz, höchstens 30 s (die längste Animation). Er kann also länger oder kürzer sein als das Bild, weil die Bildzahl erst nach dem Rechnen feststeht. Genau im Takt ist der **Film über Stationen** (docs/STATIONEN.md): Er schneidet den Ton auf die Länge des Films.

Kodiert wird wie beim Film über Stationen mit `tonspur.js` aus PHORMA III (unverändert): AAC, sonst Opus, gemuxt mit mp4-muxer 5.2.2. AAC kommt zuerst, weil manche Programme Opus im MP4 stumm abspielen. Ohne `AudioEncoder` und im Rückfall MediaRecorder entsteht das Video ohne Ton, der Grund steht im Export (`tonspur.fehlt`) und in der Statuszeile. Ein erzeugter Klang ist ein AUDIO-Ergebnis wie eine Tondatei: Über *Tonsignal* gibt er auch dem Film über Stationen Takt und Tonspur.

## Referenzen

| Programm | Prinzip | Stand |
|---|---|---|
| **Pure Data** `env~` | Hüllkurvenfolger: mittlere Leistung (Quadrate der Abtastwerte, mit einem Hann-Fenster gewichtet, Standard 1024 Abtastwerte), alle halbe Fensterlänge ein Wert, ausgegeben in dB (`powtodb`) als Zahl, also als Nachricht und nicht als Signal (`src/d_ctl.c`, «env~ – simple envelope follower», Z. 614–750) | **geprüft** (Quellcode, `pure-data/pure-data`, master, 23. 10. 2026; BSD) |
| **Pure Data** `bonk~` | Anschlagerkennung: Wachstum der Energie in einer Filterbank gegenüber einer nachlaufenden Maske, Auslösen über `hithresh`, Wiederbereitschaft unter `lothresh` (Hysterese), Ausgabe Nummer und Stärke (`extra/bonk~/bonk~.c`, Z. 219–239, 640–730) | **geprüft** (Quellcode, ebd.) |
| **TouchDesigner** Audio Spectrum CHOP | Spektrum der Eingangskanäle, wahlweise Betrag und Phase je Kanal (`chan1_m`, `chan1_p`), FFT-Grösse einstellbar (Standard 8192) | **geprüft** (docs.derivative.ca, 23. 10. 2026) |
| **ANS-Synthesizer** (Jewgeni Murzin, 1958) | ein Bild als Partitur: auf Glas gezeichnete Spuren, waagrecht die Zeit, senkrecht die Tonhöhe, abgetastet von Licht | Hypothese (Wissensstand, nicht nachgelesen) |
| **UPIC** (Iannis Xenakis, 1977) | Zeichnungen auf einem Grafiktablett werden Tonhöhenverläufe und Wellenformen | Hypothese |
| **Schroeder-Nachhall** (Freeverb) | parallele Kammfilter mit Dämpfung, danach Allpässe; die Verzögerungen 1116–1356 und 556/441 Abtastwerte stammen aus Freeverb | Hypothese (Zahlen aus dem Wissensstand) |
| PHORMA III `ton.js` | Effektivwert, drei Bänder, 32 Spektralbänder, Fluss mit gleitender Schwelle und Mindestabstand (wie bonk~: Wachstum gegen Vorgeschichte, Schwelle), Einsatz-Hüllkurven | **geprüft** (eigener Code, unverändert wiederverwendet) |
| Reason / Rack | Audio- und CV-Kabel getrennt, Combinator als Einheit | Hypothese |
| Bitwig Grid, VCV Rack | Signal und Steuerspannung in derselben Form, Summe und Abschwächer | geprüft (MODULATION-DOSSIER) |
| Max/MSP | Signal (`~`) neben Nachricht, `snapshot~` und `peakamp~` als Wandler vom Signal zur Zahl | Hypothese |
| Ableton Live | Automationskurven auf der Zeitachse von Clips | Hypothese |
| SuperCollider | Audio- und Kontrollrate (`.ar`, `.kr`), Server mit Synth-Graphen | Hypothese |

**Was übertragen ist:** Pure Data trennt das Signal von der Zahl, die aus ihm gemessen wird. `env~` und `bonk~` haben ein Signal als Eingang und Nachrichten als Ausgang. Genau das ist die Signatur von `lab.tonsignal`: `AUDIO → CONTROL_SIGNAL + EVENT_SEQUENCE`. Aus Pure Data ist kein Code übernommen, nur diese Trennung. Die Rechnung selbst stammt aus PHORMA III.

## Projektformat

Neu in 0.4.0 (PROJEKTFORMAT.md): AUDIO-Material mit `ton`, EVENT_SEQUENCE-Ergebnisse, die Felder `achse: "zeit"`, `beginn`, `dauer`, `je` an Steuersignalen. Die Hauptversion bleibt gleich, Projekte 0.1.0 bis 0.3.0 öffnen unverändert. Vorbereitet, aber nicht gebaut: `METADATA` mit `art: "frequenzspektrum"` und Rhythmusfelder an Ereignisfolgen. Beides fügt nur Felder hinzu und braucht keine neue Hauptversion.

Neu in 0.7.0: Klangtransformationen mit Stereo und eigener Abtastrate (24 Bit WAV), Ereignisfolgen `rhythmus` und `schnitte`, Export `wav`. Projekte 0.1.0 bis 0.6.0 öffnen unverändert.

Neu in 0.6.0: AUDIO-Ergebnisse des Klangerzeugers mit `ton.umriss`, die Partitur (`art: "partitur"`) und `tonspur` an exportierten Animationen. Projekte 0.1.0 bis 0.5.0 öffnen unverändert.

## Nächste Schritte

- Echtzeit-Synchronität: Feedback oder Komposition so viele Bilder rechnen lassen, wie der Klang Sekunden mal 30 hat, damit die Tonspur genau passt.
- Ereignisfolge als Takt fürs Abtasten und Halten.
- Frequenzspektrum als Befund, Bänder auf Spalten der Wiederholung.
- Klangtransformation: gebaut in 0.1.7 (Tempo, Dekonstruktion, Neu-Rhythmisierung, Körner; KLANGTRANSFORMATION.md). Offen bleiben Filter, Hall und ein Phasenvocoder.
- Der Klangerzeuger liest das Bild bisher nur als Helligkeit. Farbe als Klangfarbe oder Raum wäre eine nächste, eigene Entscheidung.
