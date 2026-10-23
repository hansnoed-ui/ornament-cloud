# ORNAMENT LAB 0.1

Ein experimentelles Produktionslabor für ORNAMENT: Ein Bild wird Material, Operationen verändern es, Varianten stehen nebeneinander, jede kann weitergeführt werden, und der ganze Verlauf bleibt als Projekt mit allen Entscheidungen erhalten.
**Erzeugen, Beobachten, Weiterführen.**

Stand: 23. Oktober 2026, Masterprompt «ORNAMENT LAB» Version 0.2 von Christian. Die Website und die bestehenden Apps sind unverändert.

## Starten

```bash
node src/lab/starten.mjs            # → http://localhost:8790/src/lab/
```

Keine Installation und keine Abhängigkeiten, nur Node 18 oder neuer. Der Server liefert das Repository nur an `127.0.0.1` aus, weil das Lab The Fictory, ORNA und `vendor/` an ihren Orten liest. Ein Chromium-Browser wird empfohlen: Er erzeugt das MP4 über WebCodecs. Andere Browser fallen auf WebM in Echtzeit zurück.

**Isolation:** Das Lab liegt in `src/lab/`. `src/` steht in `tools/hostpoint/ausschluss.txt` und wird darum nicht auf den Webspace geladen, auch nicht nach einem Merge auf `main`. Eine spätere Einbindung unter `/lab` braucht Christians ausdrückliche Zustimmung.

## Ein Durchgang

1. **Material:** «Bild wählen», das Bild hineinziehen oder «Beispielbild» (das Bild von Christian aus The Fictory). Das Arbeitsbild ist höchstens 2048 px gross. Name, Grösse und SHA-256 des Originals stehen im Projekt.
2. **Operationen:** Ziehe eine *ORNA-Konstellation*. Wähle dann *The Fictory*: Die Konstellation ist als zweiter Eingang vorgewählt und bestimmt die Regel R1–R7.
3. **Experiment, Nebeneinander:** Die sechs Zustände der Fictory stehen nebeneinander. «weiterführen» macht einen davon zum Ausgang.
4. Wähle *Feedback*. Unter «Variation und Modulation» verteilt ein Sinus (oder eine Rampe, gehaltener Zufall oder ein Steuersignal) einen Parameter über sechs Varianten. Danach wieder «weiterführen».
5. *Bildsignal* macht aus einem Bild ein Steuersignal. Bei *Wiederholung* und den anderen Operationen ist es als Modulationsquelle «Steuersignal» wählbar: Ein Bild steuert die nächste Operation.
6. **Nacheinander:** zeigt den Verlauf vom Material bis zum gewählten Zustand, mit Parametern, Startwerten und Entscheidungen. Daneben stehen die anderen Varianten jedes Schritts. «Animation des letzten Schritts» rechnet die Bewegung als MP4, «Verlauf als ZIP» exportiert die Zustände als PNG samt `verlauf.json`.
7. **Protokoll:** Hier steht jede Ausführung und jede Entscheidung in einer von vier Arten: **Mensch**, **Zufall**, **Regel** oder **jev**. «Verlauf speichern» legt eine **Kette** an, die sich auf anderes Material anwenden lässt.
8. **Projekt speichern** ergibt eine `.ornalab.zip`, die `projekt.json` und `medien/` enthält. **Projekt öffnen** stellt alles wieder her, auch das Weiterarbeiten.

Arbeitsmodi: **Manuell**. **jev-assistiert** zeigt Vorschläge nach offen gelegten Regeln und, sobald eingerichtet, Wahrscheinlichkeiten von jev live. **Experimentell** lässt das Lab selbst Operationen verbinden, in Grenzen und mit Startwert.

## Prüfen

```bash
node --test tests/lab.test.mjs                       # Kern, Operationen, Format, Archiv, jev-Lage (ohne Browser)
NODE_PATH=$(npm root -g) node tests/lab.e2e.mjs      # der ganze Prozess in Chromium, auch Speichern/Öffnen, Video, Handy
```

## Dokumentation

| Datei | Inhalt |
|---|---|
| [docs/ARCHITEKTUR.md](docs/ARCHITEKTUR.md) | Module, Datenfluss, Grenzen, Erweiterung |
| [docs/OPERATIONEN.md](docs/OPERATIONEN.md) | Operationsverzeichnis mit Herkunft, Ein- und Ausgängen, Parametern |
| [docs/PROJEKTFORMAT.md](docs/PROJEKTFORMAT.md) | `ornament-lab-projekt` 0.1.0 |
| [docs/REFERENZ-MATRIX.md](docs/REFERENZ-MATRIX.md) | Recherche zu den Referenzprogrammen: Operationsmatrix und Auswahl |
| [docs/REA-PROTOKOLL.md](docs/REA-PROTOKOLL.md) | REA: Prüfung, Setup-Probelauf, zwei Untersuchungen |
| [docs/JEV-STATUS.md](docs/JEV-STATUS.md) | jev: was eingebunden ist, was fehlt, wie es live wird |
| [docs/AUDIO-FORMAT.md](docs/AUDIO-FORMAT.md) | mögliches Audio-Operationsformat (nicht gebaut) |
| [docs/ERWEITERUNGEN.md](docs/ERWEITERUNGEN.md) | nächste Schritte und die grosse Vision |
