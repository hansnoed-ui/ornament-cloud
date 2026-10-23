# Audio-Operationsformat

Masterprompt §5. Stand: 23. Oktober 2026, Lab 0.1.3, Projektformat 0.4.0.

Das Lab produziert keinen Klang. Es gibt keinen Audioeditor und keine Synthese. Dieses Format legt fest, in welchen Formen Klang im Lab vorkommen kann und wie er an Bildoperationen koppelt. Ein erster Teil ist gebaut: Eine eigene Tondatei wird Material, die Operation **Tonsignal** misst sie, und das Ergebnis moduliert Bildparameter über die vorhandene Modulation (`kern/modulation.js`), über die Varianten oder über die Zeit.

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
| **rhythmisches Muster** | `EVENT_SEQUENCE` | zusätzlich `bpm`, `takt` (z. B. `[4, 4]`), `raster` (Teilung), `ereignisse[].schritt` | Pattern, Sequenz | vorgesehen |
| **Klanggenerator** | `AUDIO` | eine Operation ohne `AUDIO`-Eingang mit Ausgang `AUDIO` (Klasse `zeitlich`) | Oszillator, Rauschen, Sonifikation eines Bildes | vorgesehen |
| **Klangtransformation** | `AUDIO` | eine Operation `AUDIO → AUDIO` | Filter, Hall, Granular | vorgesehen |

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
| rhythmisches Muster | Takt der Iterationen eines Feedbacks: eine Iteration je Schritt des Rasters | vorgesehen |
| Generator, Transformation | Rückweg Bild → Klang: ein Bildsignal moduliert einen Klangparameter, dieselbe Route in Gegenrichtung | vorgesehen |

### Die gemeinsame Uhr

Die Modulation kennt nur die Stelle u von 0 bis 1 (`kern/modulation.js`). Ein Steuersignal mit `achse: "zeit"` übersetzt sie in Klangzeit: **t = beginn + u · dauer**.

- **Über die Varianten (Nebeneinander):** Sechs Varianten lesen den Klang bei u = 0, 0,2, … 1, also sechs Momente gleichmässig über den Ausschnitt verteilt. Ein Nacheinander wird so als Nebeneinander sichtbar.
- **Über die Zeit (Nacheinander):** Das Feedback liest bei Iteration k die Stelle u = k / Iterationen, die Komposition je Bild ihrer Bildfolge. Die ganze Bildfolge durchläuft also den ganzen Ausschnitt. In Echtzeit synchron ist das, wenn die Bildfolge so viele Bilder hat wie der Ausschnitt mal 30 (Bildrate der Animation). Beim Feedback heisst das höchstens 4 s Klang bei 120 Iterationen. **Entscheidung:** Für 0.1.3 bleibt die Zeit gestreckt und nicht in Echtzeit, darum steht keine Tonspur in der exportierten Animation. Der Zeitbezug steht im Signal (`beginn`, `dauer`, `je`) und kann später für eine Tonspur im MP4 genutzt werden.

## Gebaut: Tondatei als Steuersignal

### Material `AUDIO`

«Ton wählen» oder Hineinziehen liest WAV, MP3, OGG, FLAC, M4A, AAC, WebM und Opus, höchstens 60 MB und 10 Minuten. Die Datei bleibt unverändert und lokal im Browser. Sie liegt mit SHA-256 im Projekt und kommt so ins Archiv. Zum Messen dekodiert der Browser sie mit Web Audio (`OfflineAudioContext`, 44,1 kHz) und mischt sie einkanalig (`medien/browser.js`).

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

## Referenzen

| Programm | Prinzip | Stand |
|---|---|---|
| **Pure Data** `env~` | Hüllkurvenfolger: mittlere Leistung (Quadrate der Abtastwerte, mit einem Hann-Fenster gewichtet, Standard 1024 Abtastwerte), alle halbe Fensterlänge ein Wert, ausgegeben in dB (`powtodb`) als Zahl, also als Nachricht und nicht als Signal (`src/d_ctl.c`, «env~ – simple envelope follower», Z. 614–750) | **geprüft** (Quellcode, `pure-data/pure-data`, master, 23. 10. 2026; BSD) |
| **Pure Data** `bonk~` | Anschlagerkennung: Wachstum der Energie in einer Filterbank gegenüber einer nachlaufenden Maske, Auslösen über `hithresh`, Wiederbereitschaft unter `lothresh` (Hysterese), Ausgabe Nummer und Stärke (`extra/bonk~/bonk~.c`, Z. 219–239, 640–730) | **geprüft** (Quellcode, ebd.) |
| **TouchDesigner** Audio Spectrum CHOP | Spektrum der Eingangskanäle, wahlweise Betrag und Phase je Kanal (`chan1_m`, `chan1_p`), FFT-Grösse einstellbar (Standard 8192) | **geprüft** (docs.derivative.ca, 23. 10. 2026) |
| PHORMA III `ton.js` | Effektivwert, drei Bänder, 32 Spektralbänder, Fluss mit gleitender Schwelle und Mindestabstand (wie bonk~: Wachstum gegen Vorgeschichte, Schwelle), Einsatz-Hüllkurven | **geprüft** (eigener Code, unverändert wiederverwendet) |
| Reason / Rack | Audio- und CV-Kabel getrennt, Combinator als Einheit | Hypothese |
| Bitwig Grid, VCV Rack | Signal und Steuerspannung in derselben Form, Summe und Abschwächer | geprüft (MODULATION-DOSSIER) |
| Max/MSP | Signal (`~`) neben Nachricht, `snapshot~` und `peakamp~` als Wandler vom Signal zur Zahl | Hypothese |
| Ableton Live | Automationskurven auf der Zeitachse von Clips | Hypothese |
| SuperCollider | Audio- und Kontrollrate (`.ar`, `.kr`), Server mit Synth-Graphen | Hypothese |

**Was übertragen ist:** Pure Data trennt das Signal von der Zahl, die aus ihm gemessen wird. `env~` und `bonk~` haben ein Signal als Eingang und Nachrichten als Ausgang. Genau das ist die Signatur von `lab.tonsignal`: `AUDIO → CONTROL_SIGNAL + EVENT_SEQUENCE`. Aus Pure Data ist kein Code übernommen, nur diese Trennung. Die Rechnung selbst stammt aus PHORMA III.

## Projektformat

Neu in 0.4.0 (PROJEKTFORMAT.md): AUDIO-Material mit `ton`, EVENT_SEQUENCE-Ergebnisse, die Felder `achse: "zeit"`, `beginn`, `dauer`, `je` an Steuersignalen. Die Hauptversion bleibt gleich, Projekte 0.1.0 bis 0.3.0 öffnen unverändert. Vorbereitet, aber nicht gebaut: `METADATA` mit `art: "frequenzspektrum"` und Rhythmusfelder an Ereignisfolgen. Beides fügt nur Felder hinzu und braucht keine neue Hauptversion.

## Nächste Schritte

- Tonspur im MP4, wenn die Bildfolge in Echtzeit zum Ausschnitt passt (mp4-muxer kann Audio, AudioEncoder im Browser).
- Ereignisfolge als Takt fürs Abtasten und Halten.
- Frequenzspektrum als Befund, Bänder auf Spalten der Wiederholung.
- Rückweg Bild → Klang (Sonifikation) als erster Klanggenerator. Das ist der Schritt zu ORNAMENT SOUND und gehört nicht mehr in 0.1.
