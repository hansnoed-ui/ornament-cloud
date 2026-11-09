# Bereiche, Fassungen, neuer Track aus einem Bereich

Bereiche 0.1.0 (`kern/bereiche.js`) und Fassungen 0.1.0 (`kern/fassungen.js`). Auftrag: `composer/prompts/bereiche-und-spuren.md` in den Claude-Projektdateien.

## Bedienung

- **Bereich ziehen** auf der Welle einer Spur (gilt für diese Spur) oder auf dem Lineal über den Spuren (gilt für die Summe). Er rastet auf Takte; mit Alt auf Schläge, mit Umschalt frei. Esc hebt die Auswahl auf. Die Leiste unter dem Transport zeigt Takt und Länge.
- **Spur:** stumm (M), leiser −6 dB (−, nochmal: weitere −3 dB), lauter +3 dB (+), ausblenden, einblenden, Effekt (E: Dub-Echo, Hallfahne, Filter zu, dünn, Sättigung, Glanz, Bass fett), Unterbrechung (Stutter, Tape-Stop … genau auf den Bereich). «alle Spuren» legt es auf alle Spuren gleichzeitig.
- **Reiter «Bereiche»** der Spur: von/bis, Blenden ein und aus (Klickschutz 6 ms bis 4 Takte), Kurve (gleiche Leistung, linear, S), Pegel am Anfang und Ende, beim Effekt Plugin, alle Regler und «Ausklang» (Fahne bis 8 s über das Ende). An/aus zum Vergleichen, hinhören, löschen.
- **Spur ersetzen:** ⇄ am Spurkopf oder eine Datei auf die Welle ziehen. Kanalzug, Plugins, Pegel, Unterbrechungen und Bereiche bleiben. Der Startpunkt wird an die Einsätze der alten Quelle gelegt, die Lautheit angeglichen; ist die Datei kürzer, wird sie wiederholt. **Reiter «Fassungen»:** A/B zur vorigen Fassung, ältere Fassungen aktiv machen, Versatz, Angleich, Wiederholen, Tempo der Datei und «auf Projekttempo dehnen». Erzeugte Spuren: «neu erzeugen (anderer Startwert)» als neue Fassung.
- **Summe:** «neuer Track aus diesem Bereich» speichert das jetzige Projekt (Download), lädt ein ZIP mit den Einzelspuren des Bereichs, der Mischung und der neuen Projektdatei herunter und öffnet das neue Projekt. Die alte Mischung liegt als Referenz auf R. «Bereich als WAV» lädt nur die Mischung des Bereichs (24 Bit, Name mit Takten und BPM).

## Projektdatei

An einer Spur, alles optional (ältere Projekte laden unverändert):

- `bereiche: [{ id, art: "stumm"|"pegel"|"effekt", von, bis (Takte ab 0), db, dbEnde, ein, aus (Sechzehntel), kurve, effekt: { plugin, parameter, name }, ausklang, bypass, gruppe }]`
- `fassungen: [{ id, name, zeit, datei | quelle, versatz, wiederholen, angleich, dehnung }]` (die nicht aktiven), dazu an der Spur selbst `fassungName`, `versatz` (s), `wiederholen`, `angleich` (dB), `dehnung` (Faktor), `tempoErkannt`.
- Spuren eines neuen Tracks aus einem Bereich: `herkunft: { projekt, spur, von, bis, quelle, datei }`; am Projekt `herkunft: { projekt, von, bis, bpm, zeit }`.

Reihenfolge der Rechnung je Spur: Quelle (Dehnung beim Laden) → Versatz, Wiederholen, Angleich → Unterbrechungen → Bereiche → Plugin-Kette im Motor. Vorschau und Export rechnen dasselbe.

## Unterbrechungen löschen

- Eine orange Markierung oben in der Welle antippen: Die Spur wird gewählt, der Reiter «Unterbrechungen» öffnet sich, die Karte ist blau umrandet; dort «löschen» oder «an/aus». Ein Band unten in der Welle öffnet ebenso den Bereich im Reiter «Bereiche».
- «alle einer Art» im Reiter «Unterbrechungen»: z. B. alle Dropouts auf dieser Spur oder auf allen Spuren löschen (mit Rückfrage). «Track erzeugen» legt Unterbrechungen auf jeder Spur einzeln an, darum gibt es das.
