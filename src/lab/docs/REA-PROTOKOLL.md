# REA-Forschungsprotokoll – ORNAMENT LAB 0.1

REA: <https://github.com/morluto/rea>, Paket `rea-agents` 6.7.0 (npm), Installationsanleitung `docs/installation.md` (gelesen am 23.10.2026).

## 1. Prüfung der Umgebung (23.10.2026, Cloud-Container von Claude Code)

| Prüfpunkt | Befund |
|---|---|
| Betriebssystem | Linux x86_64 (kurzlebiger Container) |
| Node.js / npm | v22.22.0 / 10.9.4 |
| bestehende REA-Installation | keine (kein Skill, keine Registrierung) |
| MCP-Server im Repository | `.mcp.json`: nur `mcpmarket` |
| Skills im Repository | `.claude/skills/` (three.js, Video, Topaz u. a.), kein REA |
| Analyse-Engines | Ghidra, IDA, Hopper, jadx und Kuna sind nicht vorhanden (`doctor`: `missing_analysis_engine`). Für JavaScript werden sie nicht gebraucht. |

**Setup-Probelauf** mit `npx rea-agents@6.7.0 setup --client claude_code --dry-run --json` hatte den Status `planned` und änderte nichts. Geplant waren:
- `configure_client:claude_code` → `/root/.claude.json` ergänzen (MCP-Registrierung `npx -y rea-agents@6.7.0 mcp`), mit Sicherung `/root/.claude.json.rea.backup`
- `install_skill:claude_code` → `/root/.claude/skills/reverse-engineer-anything`

Das Setup ist **nicht ausgeführt**. Es ändert die Konfiguration von Claude Code und braucht darum Christians Zustimmung. In diesem Container würde die Änderung mit der Sitzung verschwinden. Für die beiden Untersuchungen genügte die REA-Kommandozeile über `npx`, ohne jede Änderung am System. Auf dem eigenen Rechner wird so eingerichtet:

```bash
npx rea-agents setup --client claude_code --dry-run      # Plan ansehen
npx rea-agents setup --client claude_code                # nach Zustimmung; danach Claude Code neu starten
npx rea-agents doctor --client claude_code --skill --json
```

Ghidra und Hopper nur dann einrichten, wenn eine konkrete Untersuchung von Maschinencode sie verlangt.

## 2. Untersuchungsfall 1: Grenze zwischen Rechnung und Darstellung in The Fictory

- **Frage:** Welche Module von The Fictory sind reine Rechnung und lassen sich als Operationen ohne Browser wiederverwenden, und welche brauchen DOM, Canvas, Zufallsquelle oder Worker? Das entscheidet, wie der Adapter geschnitten wird.
- **Berechtigung:** eigene Software von Christian im eigenen Repository.
- **Befehl:** `npx rea-agents@6.7.0 analyze-javascript-application <kopie von analyse, operationen, zeichnen, orna, regeln, feld, rechner, zip, dauer>`
- **Evidence:** `ev_986451eb362dd084731dadc5b3d31f4aa391bf226e00457a9f74b0e5c3688388`, Artefakt-SHA-256 `f1eb843a…a1ba5fe68`. Statisch analysiert (der Code wurde nicht ausgeführt): 9 Dateien, 24 062 AST-Knoten, 293 Funktionen, Vertrauensangabe `derived` / `shipped-artifact`.
- **Verifizierte Befunde (statisch):**
  - Auf `document`, `createElement` und `getContext` greifen nur `zeichnen.js` und `feld.js` zu.
  - `crypto.getRandomValues` gibt es nur in `orna.js` (die Ziehung), `postMessage` nur in `rechner.js` (der Worker).
  - `analyse.js` (89 Funktionen), `operationen.js` (129), `regeln.js`, `zip.js` und `dauer.js` haben keine Plattformgrenze.
  - Die Importe mit `?v=23` löst REA im Artefakt nicht auf (`unresolved`). Das ist eine Grenze der statischen Auflösung, kein Fehler im Code.
- **Grenzen:** REA sagt selbst, dass statische Beziehungen keine Ausführung beweisen und dass eine unvollständige Abdeckung nicht als Abwesenheit gelesen werden darf. Gegenprobe: `tests/fictory.test.mjs` lädt Analyse und Prozess seit jeher in Node, und `tests/lab.test.mjs` tut es jetzt auch über die Adapter.
- **Verwendung im Lab:** Der Adapter `operationen/fictory.js` rechnet mit `analysiere`, `erzeugeLauf` und `schritt` und braucht den Browser nur für `baueMaterial` und `zeichne`. Er nennt diese Voraussetzung in seiner Beschreibung. Alle anderen Operationen sind rein und laufen deshalb auch in Node. Die Architektur trennt den Kern (ohne DOM) vom Medienspeicher (mit DOM).

## 3. Untersuchungsfall 2: Wie organisiert p5.js Filter als Operationen?

- **Frage:** Wie ordnet eine offene Creative-Coding-Bibliothek Bildfilter so, dass sie unter einem Namen mit einem Parameter kombinierbar sind? (Grundlage für «parametrisierte Filteroperation», Masterprompt §18)
- **Berechtigung:** p5.js 1.9.4, Lizenz LGPL-2.1, rechtmässig aus npm (`npm pack p5@1.9.4`), Bündel `lib/p5.js` mit SHA-256 `64058f17…c41112b86`. Nur gelesen, nichts übernommen.
- **REA-Befehl:** `analyze-javascript-application` auf das Bündel, auch mit `--max-heap-mb 3500`.
- **Evidence:** `ev_958c7d4db43629f537e170c32ddbdcf09a793a23f56c8caaa59d486c41112b86`. Der Anwendungsgraph ist erstellt (359 149 AST-Knoten), der **semantische Graph aber nur teilweise**: REA meldet «Owned JavaScript worker exhausted its heap while analyzing p5.js during semantic». Die Blockade wird so festgehalten. Vermutlich ist ein einzelnes Bündel von 5 MB zu gross für die semantische Rekonstruktion in einem Durchgang (Hypothese).
- **Ersatz nach Masterprompt §9 A** (offene Software: normale Werkzeuge vor REA): den Quelltext im Bündel lesen.
- **Verifizierte Befunde (Quelltext, Zeilen im Bündel):**
  - `p5.prototype.filter(operation, value, useWebGL)` (um Z. 98465) wählt eine Operation über eine Konstante (THRESHOLD, GRAY, OPAQUE, INVERT, POSTERIZE, BLUR, ERODE, DILATE). Für dieselbe Operation gibt es **zwei Implementierungen**: Pixelrechnung (`filters.apply(canvas, filters[operation], value)`) und WebGL-Shader.
  - Die Standardwerte stehen je Operation in einer Tabelle (BLUR 3, POSTERIZE 4, THRESHOLD 0.5, um Z. 140180).
  - Shader werden beim ersten Gebrauch erzeugt und zwischengespeichert (`defaultFilterShaders[operation]`). BLUR läuft in mehreren Durchgängen, alle anderen in einem.
  - Beim Umweg über eine versteckte WebGL-Ebene wird diese danach geleert, mit dem Kommentar «prevent feedback effects». Feedback gilt dort als Störung, die vermieden wird.
- **Verwendung im Lab:**
  1. **Operation und Implementierung trennen.** Kennung, Parameter und Standardwerte stehen in der Beschreibung, die Rechnung ist austauschbar. `lab.farbe` und `lab.feedback` rechnen in 0.1 auf der CPU. Eine spätere WebGL-Fassung kann dieselbe Kennung und dieselben Parameter behalten (Versionssprung in `version`).
  2. **Standardwerte in der Beschreibung** (`parameter[].standard`), damit Ketten und Projekte sie kennen.
  3. **Mehrfachdurchgänge als Parameter** (`iterationen` im Feedback). Was p5.js als Störung ausschliesst, wird im Lab zur eigenen, gestaltbaren Operation.

## 4. Nicht untersucht (bewusst)

Proprietäre Programme (TouchDesigner, Notch, Reason, Bitwig, Resolume, Fusion, Sapphire, After Effects, Topaz) wurden **nicht** dekompiliert. Sie wurden nur über öffentliche Dokumentation gelesen (REFERENZ-MATRIX.md). Für eine berechtigte Laufzeituntersuchung bräuchte es ein rechtmässig installiertes Programm und eine klar begrenzte Frage. Kandidaten für eine nächste Runde: Bitwig Grid oder VCV Rack mit offenem Quellcode, und zwar das Modulationsrouting im Quellcode von VCV Rack (GPL-3.0), nicht als Binärdatei.
