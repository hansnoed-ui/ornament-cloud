# Mögliches Audio-Operationsformat (Entwurf, nicht gebaut)

Version 0.1 baut keine Klangproduktion. Dieses Format zeigt, wie Klang später in dieselbe Operationsarchitektur kommt, ohne das Projektformat zu brechen. Grundlage sind Reason und Rack (Audio und CV getrennt verkabelt), Bitwig Grid und VCV Rack (Signal und Steuerspannung in einer Form), Max/MSP (Signal neben Nachricht) und SuperCollider (Server mit Synth-Graphen).

## Typen

| Typ | Form | Beispiel | Bezug zum Bild |
|---|---|---|---|
| `AUDIO` (Audiosignal) | PCM, Abtastrate, Kanäle; Datei `medien/<id>.wav` | Aufnahme, Synthese | Spektrum oder Hüllkurve → Steuersignal |
| `EVENT_SEQUENCE` (Ereignis/Trigger) | `[{ t: Sekunden, wert?, kanal? }]` | Anschläge, Schnitte, Wechsel | löst Varianten oder Schnitte aus |
| `CONTROL_SIGNAL` (Steuerwert) | **vorhanden**: `werte` 0–1 entlang u | LFO, Bildsignal | moduliert jede Zahl jeder Operation |
| Zeitlicher Parameterverlauf | `CONTROL_SIGNAL` mit `achse: "zeit"`, `dauer`, `abtastung` | Automationskurve | Achse «über die Zeit» der Modulation |
| Frequenzspektrum | `METADATA` `{ baender: [...], je: s }` (z. B. 32 Bänder wie `alpha/phorma-iii/ton.js`) | Analyse | Spalten oder Farben aus Bändern |
| Rhythmisches Muster | `EVENT_SEQUENCE` mit `takt`, `bpm`, `raster` | Pattern | Iterationstakt des Feedbacks |
| Klanggenerator | Operation ohne Eingang, Ausgang `AUDIO` | Oszillator, Rauschen | – |
| Klangtransformation | Operation `AUDIO → AUDIO` | Filter, Hall, Granular | dieselben Routen wie im Bild |

## Kopplung mit Bildoperationen

Die gemeinsame Form ist das Steuersignal (Werte 0–1 über u). Ein Klang wird über eine Wandler-Operation wie `ton.huellkurve` (AUDIO → CONTROL_SIGNAL) dieselbe Art Quelle wie heute ein Bildsignal. Umgekehrt kann ein Bildsignal einen Klangparameter modulieren. Zeitlich gekoppelte Abläufe brauchen nur eine gemeinsame Uhr (`fps` der Animation, Abtastrate des Klangs). Die Bildfolge einer Operation (`verlauf`) bekommt dann einen Zeitstempel je Bild. PHORMA III hat dafür schon reine Rechenmodule (`ton.js`: Bänder, Schnitte, Kurven; `frickeln.js`, `stimme.js`), die ein späterer Adapter wie bei The Fictory nutzen kann.

## Was das Projektformat dafür schon hat

Benannte Typen (`kern/typen.js`), die Achse «Zeit» in Routen, Ergebnisse mit beliebigen Dateien unter `medien/`, Exporte mit Codec und `reproduzierbar` je Knoten. Neu wären nur die Typen und Wandler. Die Hauptversion des Formats bleibt dieselbe.
