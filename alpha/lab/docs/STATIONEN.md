# Animation über Stationen (Lab 0.1.4)

Bisher zeigte das Lab die Bewegung eines einzelnen Schritts («Animation des letzten Schritts»). Ein Film über Stationen fasst mehrere Zustände eines Projekts zu einer Bewegung zusammen: Er hält jede Station und geht in die nächste über. Eine Station ist ein Bildzustand: das Material, ein Schritt des Verlaufs oder eine Variante, die nebeneinander stand und nicht weitergeführt wurde. So wird das Nacheinander selbst zum Material, und ein Verlauf kann als Film publiziert werden (Masterprompt §2 C und F).

Ein allgemeiner Videoeditor ist das nicht. Es gibt keine Spuren, keine Schnittkanten zum Ziehen und keine Effekte ausserhalb der Operationen. Die Zeit wird mit denselben Mitteln gestaltet wie die Parameter einer Operation.

## Bedienung

Unter **Nacheinander** steht der Bereich «Animation über Stationen».

- **Stationen:** Ohne eigene Auswahl ist es der Verlauf vom Material bis zum Ausgang. Unter **Nebeneinander** nimmt «Station» an jeder Karte einen Zustand auf. «alle als Stationen» nimmt alle Varianten eines Schritts, zum Beispiel die sechs Zustände der Fictory. ↑ ↓ ordnen um, ✕ entfernt eine Station, «Verlauf übernehmen» kehrt zum Verlauf zurück.
- **Zeit:** Halten je Station und Dauer des Übergangs in Sekunden. Für jede Station lässt sich der Übergang zur nächsten einzeln wählen.
- **Übergänge:**
  - *Überblendung:* weich, mit sanftem Anfang und Ende.
  - *Schwelle:* Ein Bildpunkt wechselt, sobald eine steigende Schwelle seine Helligkeit im Ziel erreicht. Die dunklen Stellen des Ziels erscheinen zuerst, die hellen zuletzt. Das Ziel wächst aus seiner eigenen Tonwertordnung heraus.
  - *Verlauf der Operation:* Ist die nächste Station durch eine Operation aus dieser entstanden, ist der Übergang ihre eigene Bildfolge, mit denselben Parametern, Startwerten und Zeitmodulationen (wie «Animation des letzten Schritts»). Zwischen Geschwistern gibt es keinen solchen Verlauf. Dort ist die Wahl gesperrt, und die Partitur fällt mit Hinweis auf die Überblendung zurück.
  - *Schnitt.*
- **Modulation über die Stationen:** Halten und Übergang sind beschrieben wie Parameter einer Operation (`ZEITPARAMETER`). Darum verteilt dieselbe Modulation sie über die Folge: Sinus, Dreieck, Rampe, gehaltener Zufall oder ein Steuersignal aus dem Projekt, zum Beispiel ein Bildsignal oder ein Tonsignal. Die Stelle u einer Station (0 bis 1) ist hier ihre Lage in der Zeit des Films. Ein Beispiel: Eine Rampe auf «Halten» lässt den Film immer langsamer werden.
- **Takt:** Statt gleichmässig kann eine Ereignisfolge den Takt geben, also die Einsätze aus *Tonsignal*. Jeder Einsatz über der gewählten Stärke löst einen Wechsel aus. Der Übergang endet spätestens beim nächsten Einsatz und wird zum Schnitt, wenn dafür weniger als ein Bild bleibt. Mit «Stationen reihum» kehren die Stationen wieder, bis die Einsätze aufgebraucht sind. Der Film dauert so lang wie der gemessene Ausschnitt. Verläufe von Operationen werden dafür in der Zeit gestaucht oder gedehnt: Aus ihren Bildern wird gleichmässig ausgewählt.
- **Tonspur:** Kommt der Takt aus einem Ton des Projekts, kann derselbe Ausschnitt als Tonspur unter das MP4. Kodiert wird mit `tonspur.js` aus PHORMA III (unverändert): AAC, sonst Opus. Ohne WebCodecs (Rückfall WebM) bleibt der Film stumm, und der Status sagt das.
- **Filmgrösse:** die längste Seite, 320 bis 2048 px. Stationen anderer Form werden unverzerrt eingepasst, auf dem dunklen Grund der Fictory.

## Rechnung

`kern/stationen.js` arbeitet ohne DOM und ist in `tests/lab.test.mjs` geprüft.

1. `partitur(projekt, plan)` ergibt die Folge mit `beginn`, `halten` und `uebergang { art, dauer, hinweis? }` je Auftritt, dazu `dauer`, `bilder`, `takt` und die Routen ohne Signaldaten. Ein Verlauf ohne Takt hat `dauer: null`: Er behält die Länge, mit der die Operation ihn rechnet.
2. `filmbilder({ … partitur })` erzeugt die Bilder. Gehaltene Bilder sind dasselbe Objekt, der Kodierer malt sie nur einmal. Der `zeitplan` hält fest, ab welchem Bild jede Station tatsächlich steht, auch nach Verläufen mit eigener Länge.
3. `videoAus` in `medien/video.js` kodiert wie bisher, auf Wunsch mit Tonspur.

## Im Projekt

Der Film steht unter `exporte` mit `art: "stationen"`, der vollständigen Partitur und dem Zeitplan (PROJEKTFORMAT.md, seit 0.5.0). Die Auswahl der Stationen ist eine menschliche Entscheidung mit `gegenstand: "stationen"`. Im Protokoll zeigt «Partitur» beides an. Die Filmdatei liegt als `medien/<id>-stationen.mp4` im Archiv. Fehlt sie beim Öffnen, wird das gemeldet.

## Grenzen

- höchstens 48 Stationen und 3600 Bilder (2 Minuten bei 30 Bildern/s) je Film, bei «reihum» höchstens 384 Auftritte
- Halten 0 bis 10 s, Übergang 0 bis 6 s (harte Grenzen, auch nach Modulation)
- Verläufe werden neu gerechnet. Bei grossen Arbeitsbildern dauert das so lange wie die Operation selbst, bei festem Takt doppelt so lange, weil zuerst gezählt wird.

## Offen

- eine Tonspur auch ohne Takt (ein beliebiger Ton des Projekts unter einem gleichmässigen Film)
- Übergänge als eigene Operationen im Register, damit sie Parameter haben und moduliert werden können (Kante der Schwelle, Richtung)
- die Einsätze nach Band trennen (tief schneidet, hoch blendet)
- Kamerabewegung innerhalb einer Station (Zoom, Fahrt) als Zeitparameter
