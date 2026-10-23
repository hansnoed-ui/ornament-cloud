# Mögliche Erweiterungen

## Nächste kleine Schritte (0.2)

- **PHORMA-Adapter:** PHORMA II und III liefern ebenfalls Zustände und Filme (Physarum, Tiefe, Tuch, Raster, Gewebe). Ihre Rechenmodule (`montageplan.js`, `irrweg.js`, `traubenplan.js`, `kurven.js`) sind teilweise ohne DOM. Die Bühnen hängen an three.js. Ein Adapter würde wie bei der Fictory Zustände an festen Zeitpunkten ausgeben.
- **Sketchory-Adapter:** Strichanalyse (`strich.js`, ohne DOM) als Operation Bild → GEOMETRY (Striche), dazu eine Zeichenoperation GEOMETRY → Bild.
- **WebGL-Fassungen** von Feedback und Farbe mit derselben Kennung und denselben Parametern (Befund aus p5.js, REA-PROTOKOLL Fall 2), für grössere Bilder in Echtzeit.
- **Animation mit Zeitmodulation:** Die Achse «über die Zeit» gibt es schon. Als Nächstes käme eine Vorschau, die beim Ziehen eines Reglers live rechnet.
- **Kompositorisches Profil:** umgesetzt in 0.1.2 (`lab.profil`, `lab.komposition`, docs/KOMPOSITION.md). Offen sind das Profil als Steuersignal, örtliche Profile je Bildbereich und ein Eingriff in die Kantenrichtung.
- **Klang:** umgesetzt in 0.1.3 (`lab.tonsignal`, docs/AUDIO-FORMAT.md): eine Tondatei als Steuersignal für Bildparameter. Offen sind eine Tonspur im MP4, die Ereignisfolge als Takt fürs Abtasten und Halten, das Frequenzspektrum als Befund und der Rückweg Bild → Klang.
- **jev live** nach Zustimmung (JEV-STATUS.md). Danach eventuell NOUL für technische Kompatibilität.
- **Prüfraster:** Das NN-Raster und der Verteilapparat bleiben in 0.1 unangetastet. Eine Text-Operation könnte später Passagen nur zitieren und nichts erfinden. Dafür braucht es zuerst eine Absprache, welche Fassung gilt.
- **Online:** seit dem 23. Oktober 2026 unter `/alpha/lab/` (nur per Direktlink). Ein eigener Eintrag in der Navigation oder eine kürzere Adresse nur mit Zustimmung.

## Die grosse Vision (nicht gebaut)

ORNAMENT SOUND, MOTION, TEXT, CINEMA und EDITIONS kommen als weitere Typen und Adapter dazu, nicht als eigene Apps. Die Operation bleibt die Einheit, das Projekt die Grafik ihrer Zusammenhänge. Jede neue Domäne braucht drei Dinge: einen Typ, mindestens einen Wandler zum Steuersignal und Operationen mit Beschreibung. Edition ist eine Exportoperation mit Herkunftsnachweis aus dem Projekt (Druck, Film, Website).
