# Animation über Stationen (Lab 0.1.4)

Bisher zeigte das Lab die Bewegung eines einzelnen Schritts («Animation des letzten Schritts»). Ein Film über Stationen fasst mehrere Zustände eines Projekts zu einer Bewegung zusammen: Er hält jede Station und geht in die nächste über. Eine Station ist ein Bildzustand: das Material, ein Schritt des Verlaufs oder eine Variante, die nebeneinander stand und nicht weitergeführt wurde. So wird das Nacheinander selbst zum Material, und ein Verlauf kann als Film publiziert werden (Masterprompt §2 C und F).

Ein allgemeiner Videoeditor ist das nicht. Es gibt keine Spuren, keine Schnittkanten zum Ziehen und keine Effekte ausserhalb der Operationen. Die Zeit wird mit denselben Mitteln gestaltet wie die Parameter einer Operation.

## Bedienung

Unter **Nacheinander** steht der Bereich «Animation über Stationen».

- **Stationen:** Ohne eigene Auswahl ist es der Verlauf vom Material bis zum Ausgang. Unter **Nebeneinander** nimmt «Station» an jeder Karte einen Zustand auf. «alle als Stationen» nimmt alle Varianten eines Schritts, zum Beispiel die sechs Zustände der Fictory. Seit Lab 0.1.11 kommt das zu einer schon bestehenden Auswahl hinzu (ohne doppelte), und unter «Nebeneinander» wählt «Schritte» auch frühere Schritte des Verlaufs, so lassen sich die Varianten mehrerer Schritte sammeln. «alle Varianten aller Schritte» (unter «Nacheinander») nimmt sie auf einmal, Schritt für Schritt in ihrer Reihenfolge, ohne das Material (`variantenAusVerlauf`). ↑ ↓ ordnen um, ✕ entfernt eine Station, «Verlauf übernehmen» kehrt zum Verlauf zurück.
- **Zeit:** Halten je Station und Dauer des Übergangs in Sekunden. Für jede Station lässt sich der Übergang zur nächsten einzeln wählen.
- **Übergänge:**
  - *Überblendung:* weich, mit sanftem Anfang und Ende.
  - *Schwelle:* Ein Bildpunkt wechselt, sobald eine steigende Schwelle seine Helligkeit im Ziel erreicht. Die dunklen Stellen des Ziels erscheinen zuerst, die hellen zuletzt. Das Ziel wächst aus seiner eigenen Tonwertordnung heraus.
  - *Verlauf der Operation:* Ist die nächste Station durch eine Operation aus dieser entstanden, ist der Übergang ihre eigene Bildfolge, mit denselben Parametern, Startwerten und Zeitmodulationen (wie «Animation des letzten Schritts»). Zwischen Geschwistern gibt es keinen solchen Verlauf. Dort ist die Wahl gesperrt, und die Partitur fällt mit Hinweis auf die Überblendung zurück.
  - *Schnitt.*
- **Modulation über die Stationen:** Halten und Übergang sind beschrieben wie Parameter einer Operation (`ZEITPARAMETER`). Darum verteilt dieselbe Modulation sie über die Folge: Sinus, Dreieck, Rampe, gehaltener Zufall oder ein Steuersignal aus dem Projekt, zum Beispiel ein Bildsignal oder ein Tonsignal. Die Stelle u einer Station (0 bis 1) ist hier ihre Lage in der Zeit des Films. Ein Beispiel: Eine Rampe auf «Halten» lässt den Film immer langsamer werden.
- **Takt:** Statt gleichmässig kann eine Ereignisfolge den Takt geben, also die Einsätze aus *Tonsignal*. Jeder Einsatz über der gewählten Stärke löst einen Wechsel aus. Der Übergang endet spätestens beim nächsten Einsatz und wird zum Schnitt, wenn dafür weniger als ein Bild bleibt. Mit «Stationen reihum» kehren die Stationen wieder, bis die Einsätze aufgebraucht sind. Der Film dauert so lang wie der gemessene Ausschnitt. Verläufe von Operationen werden dafür in der Zeit gestaucht oder gedehnt: Aus ihren Bildern wird gleichmässig ausgewählt.
- **Takt** zeigt nur Ereignisfolgen. Gibt es noch keine, steht dort ein Hinweis: den Klang wählen und *Tonsignal* (Merkmal «Einsätze») oder *Neu-Rhythmisierung* ausführen.
- **Tonspur** (seit Lab 0.1.8 frei wählbar): keine oder ein Klang des Projekts. Vorgewählt ist der Ton des Takts, ohne Takt der zuletzt entstandene Klang. Kommt der Takt aus diesem Ton, liegt derselbe Ausschnitt unter dem MP4. Sonst beginnt der Ton am Anfang und endet mit dem Film. «Halten an den Klang anpassen» setzt das Halten so, dass ein gleichmässiger Film etwa so lang ist wie der Klang (höchstens 10 s je Station). Kodiert wird mit `tonspur.js` aus PHORMA III (unverändert): AAC, sonst Opus. Ohne WebCodecs (Rückfall WebM) bleibt der Film stumm, und der Status sagt das.
- **lebendige Effekte** (seit Lab 0.1.16, vorgewählt): Stationen, die aus Farbe, Glitch, Verzerrung, Raster, Wiederholung, Feedback oder Licht entstanden sind, rechnet die Grafikkarte (WebGL 2, `medien/gpu.js`) in jedem Bild des Films neu, mit den Parametern zu diesem Zeitpunkt: Die Route, die ihre Varianten verteilt hat (etwa die Lautstärke auf die Farbdrehung), läuft nun über die Zeit des Films, die Welle läuft, das Kaleidoskop dreht sich, der Glitch würfelt etwa zehnmal je Sekunde neu, das Feedback iteriert Bild für Bild weiter. So ist jedes Bild ein echtes Effektbild, wie bei PHORMA. Die Fassungen entsprechen den CPU-Operationen bis auf Abtastung und Zufall (Glitch: andere Bänder und Blöcke); im Projekt bleibt das Ergebnis der CPU. Ohne WebGL 2 oder abgeschaltet bleibt es bei Standbildern, Kamera und Übergängen. Stationen aus anderen Operationen (Pixelsortierung, Neu setzen, Komposition, Zerfall, Material) bleiben Standbilder.
- **Bewegung** (seit Lab 0.1.14), 0 bis 1: eine Kamera über jedem Bild des Films. Sie schwebt langsam, dreht sich leicht und zoomt; mit «Zoom atmet mit» und einem Steuersignal (etwa der Lautstärke eines Tonsignals) geht sie bei lauten Stellen näher heran. So ist jedes Bild anders, auch während eine Station steht. 0 lässt die Stationen ruhig stehen wie bisher.
- **Filmgrösse:** die längste Seite, 320 bis 2048 px. Stationen anderer Form werden unverzerrt eingepasst, auf dem dunklen Grund der Fictory.

## Rechnung

`kern/stationen.js` arbeitet ohne DOM und ist in `tests/lab.test.mjs` geprüft.

1. `partitur(projekt, plan)` ergibt die Folge mit `beginn`, `halten` und `uebergang { art, dauer, hinweis? }` je Auftritt, dazu `dauer`, `bilder`, `takt` und die Routen ohne Signaldaten. Ein Verlauf ohne Takt hat `dauer: null`: Er behält die Länge, mit der die Operation ihn rechnet.
2. `filmbilder({ … partitur })` erzeugt die Bilder. Gehaltene Bilder sind dasselbe Objekt, der Kodierer malt sie nur einmal. Der `zeitplan` hält fest, ab welchem Bild jede Station tatsächlich steht, auch nach Verläufen mit eigener Länge. Mit `partitur.lebendig` und einer Grafikkarte (`filmbilder({ lebendig: gpuEffekte() })`) wird jede Station mit lebendiger Fassung in jedem Bild neu gerechnet (im `zeitplan` steht dann `lebendig: true`), auch unter Überblendung und Schwelle. Mit `partitur.bewegung { staerke, signal }` geht jedes Bild danach durch die Kamera (`kameraLage(t, staerke, laut)`: Zoom, Versatz, Drehung; bilinear abgetastet), dann ist kein Bild mehr dasselbe Objekt.
3. `videoAus` in `medien/video.js` kodiert wie bisher, auf Wunsch mit Tonspur.

## Im Projekt

Der Film steht unter `exporte` mit `art: "stationen"`, der vollständigen Partitur und dem Zeitplan (PROJEKTFORMAT.md, seit 0.5.0). Die Auswahl der Stationen ist eine menschliche Entscheidung mit `gegenstand: "stationen"`. Im Protokoll zeigt «Partitur» beides an. Die Filmdatei liegt als `medien/<id>-stationen.mp4` im Archiv. Fehlt sie beim Öffnen, wird das gemeldet.

## Grenzen

- höchstens 64 Stationen (bis Lab 0.1.14: 48) und 3600 Bilder (2 Minuten bei 30 Bildern/s) je Film, bei «reihum» höchstens 512 Auftritte
- Halten 0 bis 10 s, Übergang 0 bis 6 s (harte Grenzen, auch nach Modulation)
- Verläufe werden neu gerechnet. Bei grossen Arbeitsbildern dauert das so lange wie die Operation selbst, bei festem Takt doppelt so lange, weil zuerst gezählt wird.

## Offen

- Übergänge als eigene Operationen im Register, damit sie Parameter haben und moduliert werden können (Kante der Schwelle, Richtung)
- die Einsätze nach Band trennen (tief schneidet, hoch blendet)
- Kamerabewegung innerhalb einer Station (Zoom, Fahrt) als Zeitparameter
