# ORNAMENT LAB 0.1

Ein experimentelles Produktionslabor für ORNAMENT: Ein Bild wird Material, Operationen verändern es, Varianten stehen nebeneinander, jede kann weitergeführt werden, und der ganze Verlauf bleibt als Projekt mit allen Entscheidungen erhalten.
**Erzeugen, Beobachten, Weiterführen.**

Stand: 23. Oktober 2026, Masterprompt «ORNAMENT LAB» Version 0.2 von Christian. Die Website und die bestehenden Apps sind unverändert.

## Starten

```bash
node alpha/lab/starten.mjs            # → http://localhost:8790/alpha/lab/
```

Keine Installation und keine Abhängigkeiten, nur Node 18 oder neuer. Der Server liefert das Repository nur an `127.0.0.1` aus, weil das Lab The Fictory, ORNA und `vendor/` an ihren Orten liest. Ein Chromium-Browser wird empfohlen: Er erzeugt das MP4 über WebCodecs. Andere Browser fallen auf WebM in Echtzeit zurück.

**Online und Isolation:** Das Lab liegt in `alpha/lab/` und ist seit dem 23. Oktober 2026 auf Christians Wunsch unter <https://ornament.cloud/alpha/lab/> erreichbar. Es läuft ganz im Browser: Bilder und Projekte bleiben auf dem Gerät der Person, nichts wird hochgeladen. Wie die anderen Alpha-Apps ist es nur per Direktlink erreichbar, keine Seite verlinkt es, und `noindex` hält es aus der Suche. Nicht auf den Webspace kommen `docs/`, `werkzeuge/`, `starten.mjs`, `README.md` und `jev/worker-entwurf.js` (`tools/hostpoint/ausschluss.txt`). Die Website und die bestehenden Apps bleiben unverändert.

## Ein Durchgang

1. **Material:** «Bild wählen», das Bild hineinziehen oder «Beispielbild» (das Bild von Christian aus The Fictory). Das Arbeitsbild ist höchstens 2048 px gross. Name, Grösse und SHA-256 des Originals stehen im Projekt.
2. **Operationen:** Ziehe eine *ORNA-Konstellation*. Wähle dann *The Fictory*: Die Konstellation ist als zweiter Eingang vorgewählt und bestimmt die Regel R1–R7.
3. **Experiment, Nebeneinander:** Die sechs Zustände der Fictory stehen nebeneinander. «weiterführen» macht einen davon zum Ausgang.
4. Wähle *Feedback*. Unter «Variation und Modulation» verteilt ein Sinus (oder eine Rampe, gehaltener Zufall oder ein Steuersignal) einen Parameter über sechs Varianten. «Polarität» und «Abtasten und halten» verändern, wie die Quelle wirkt (nach VCV Rack, docs/MODULATION-DOSSIER.md). Danach wieder «weiterführen».
5. *Bildsignal* macht aus einem Bild ein Steuersignal. Bei *Wiederholung* und den anderen Operationen ist es als Modulationsquelle «Steuersignal» wählbar: Ein Bild steuert die nächste Operation.
6. **Komposition:** *Kompositorisches Profil* misst, wie ein Bild gebaut ist: Schwerpunkt, Symmetrie, Lichtgefälle, Mitte und Rand, Kontrast, Sättigung, Kantenrichtung. Es misst nur und bewertet nicht. *Komposition verändern* skaliert dieselben Komponenten mit Faktoren: 1 lässt stehen, 0 hebt auf, −1 kehrt um, 2 verdoppelt. Die Faktoren sind modulierbar. Mit einem *Zielprofil*, das an einem anderen eigenen Bild gemessen wurde, gleicht die Operation das Bild jenem an. Die Profile vorher und nachher stehen im Protokoll (docs/KOMPOSITION.md).
7. **Nacheinander:** zeigt den Verlauf vom Material bis zum gewählten Zustand, mit Parametern, Startwerten und Entscheidungen. Daneben stehen die anderen Varianten jedes Schritts. «Animation des letzten Schritts» rechnet die Bewegung als MP4, «Verlauf als ZIP» exportiert die Zustände als PNG samt `verlauf.json`.
8. **Protokoll:** Hier steht jede Ausführung und jede Entscheidung in einer von vier Arten: **Mensch**, **Zufall**, **Regel** oder **jev**. «Verlauf speichern» legt eine **Kette** an, die sich auf anderes Material anwenden lässt.
9. **Projekt speichern** ergibt eine `.ornalab.zip`, die `projekt.json` und `medien/` enthält. **Projekt öffnen** stellt alles wieder her, auch das Weiterarbeiten.

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
| [docs/PROJEKTFORMAT.md](docs/PROJEKTFORMAT.md) | `ornament-lab-projekt` 0.3.0 |
| [docs/KOMPOSITION.md](docs/KOMPOSITION.md) | kompositorisches Parametersystem: Messgrössen, Faktorprinzip, Zielprofil, Grenzen (§8, §18) |
| [docs/REFERENZ-MATRIX.md](docs/REFERENZ-MATRIX.md) | Recherche zu den Referenzprogrammen: Operationsmatrix und Auswahl, mit Stand (geprüft oder Hypothese) |
| [docs/MODULATION-DOSSIER.md](docs/MODULATION-DOSSIER.md) | Operations-Dossier zur Modulation: VCV Rack (Quellcode), Bitwig und TouchDesigner (Handbücher), je 13 Punkte nach §9 |
| [docs/REA-PROTOKOLL.md](docs/REA-PROTOKOLL.md) | REA: Prüfung, Setup-Probelauf, zwei Untersuchungen |
| [docs/JEV-STATUS.md](docs/JEV-STATUS.md) | jev: was eingebunden ist, was fehlt, wie es live wird |
| [docs/AUDIO-FORMAT.md](docs/AUDIO-FORMAT.md) | mögliches Audio-Operationsformat (nicht gebaut) |
| [docs/ERWEITERUNGEN.md](docs/ERWEITERUNGEN.md) | nächste Schritte und die grosse Vision |
