# ornament.lab · Works (`/b/lab/works/`)

Die Werkschau der Ergebnisse aus ORNAMENT LAB. Eigenständig: nicht in der Navigation des Neubaus, nicht in der Sitemap. Solange kein Werk veröffentlicht ist, zeigt die Übersicht drei als «Platzhalter» beschriftete Felder und trägt `noindex`.

## Ein Werk ergänzen

1. Im Lab (`/alpha/lab/`) den Zustand wählen und unter «Nacheinander» optional «Animation des letzten Schritts» rechnen.
2. «Für Works» drücken. Das Lab lädt `<ordner>-works.zip` herunter, darin ein Ordner mit
   - `werk.json` (vorbereitet, siehe unten)
   - `bild.png` (der gewählte Zustand)
   - `film.mp4` oder `film.webm` (nur wenn vorher gerechnet)
   - `verlauf.json` (das Protokoll: Material, Operationen, Parameter, Startwerte, Entscheidungen)
3. Den Ordner nach `b/lab/works/` legen. Der Name darf nur `a–z`, `0–9` und `-` enthalten.
4. In `werk.json` Titel, Jahr und Text ergänzen und `"veroeffentlicht": true` setzen.
5. `node tools/build-lab-works.mjs` schreibt die Übersicht und die Werkseite. Committen; der Merge auf `main` veröffentlicht.

Ein Ordner ohne `"veroeffentlicht": true` bleibt ein Entwurf und erscheint nirgends (die Medien liegen nach einem Merge trotzdem auf dem Server).

## werk.json

```json
{
  "format": "ornament-lab-werk", "version": 1,
  "titel": "…", "jahr": 2026, "text": "Absätze, getrennt durch eine Leerzeile",
  "bild": "bild.png", "breite": 1280, "hoehe": 960, "film": "film.mp4", "verlauf": "verlauf.json",
  "lab": "0.1.6", "operationen": ["The Fictory", "Feedback"], "exportiert": "2026-10-23T…",
  "veroeffentlicht": false
}
```

Freiwillig: `kurz` (Beschreibung für Suchmaschinen und Vorschau), `alt` (Bildbeschreibung, sonst «Titel, Ergebnis aus ORNAMENT LAB»), `position` (Zahl; kleinere stehen vorne, sonst das neueste Exportdatum zuerst).

## Dateien

- `tools/build-lab-works.mjs` – liest die Ordner, schreibt `b/lab/works/index.html` und `b/lab/works/<ordner>/index.html`; Signet und Favicon aus `b/werke/index.html`.
- `b/lab/works/works.css`, `works.js` – Gestaltung und das Abspielen der Filme beim Darüberfahren; Versionsmarke `V` im Skript.
- Test: `tests/lab.e2e.mjs`, Schritt «Für Works» (Export aus dem Lab, Bau einer Werkschau in einem Temp-Ordner).
