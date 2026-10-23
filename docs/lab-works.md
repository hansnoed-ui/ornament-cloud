# ornament.lab · Works (`/b/lab/works/`)

Die Werkschau der Ergebnisse aus ORNAMENT LAB. Eigenständig: nicht in der Navigation des Neubaus, nicht in der Sitemap. Solange kein Werk veröffentlicht ist, zeigen Bühne und Raster sechs Beispiele aus der PHORMA-Serie (Filme und Standbilder aus `assets/`), jedes als «Platzhalter» beschriftet und mit einem Link zu seiner App; die Übersicht trägt `noindex`. Mit dem ersten veröffentlichten Werk verschwinden sie (Liste `PLATZHALTER` in `tools/build-lab-works.mjs`).

## Aufbau (nach dem Prinzip von mubien.com, ohne deren Inhalte oder Material)

- **Bühne** (Vorgabe): ein Karussell nach dem Vorbild von mubien.com, ein flacher Ring auf Augenhöhe auf weissem Grund. Vorn steht eine grosse Karte im Hochformat mit Titel, die Nachbarn sind kleiner und am Rand angeschnitten, die hinteren stehen klein dahinter. Rad, Pfeiltasten, Wischen oder ein Klick auf eine Karte drehen den Ring; ein Klick auf die vordere Karte öffnet das Werk. Das Dock zeigt das vordere Werk. Kein selbständiges Drehen. Ein Film läuft stumm auf der vorderen Karte, auf Telefonen bleibt das Standbild stehen.
- **Raster**: auf 62 % der Breite, zwei Spalten mit schmalen Fugen, Kacheln im Hochformat. Beim Darüberfahren erscheint oben links ein Etikett in der Farbe des Werks (Vorgabe: Blaupause) mit Titel, Jahr und Kurztext; auf dem Telefon steht das Etikett unter dem Bild. Filme laufen beim Darüberfahren.
- **Pille** oben rechts schaltet zwischen Bühne und Raster; der Browser merkt sich die Wahl, `#raster` oder `#buehne` im Link gehen vor.
- **Dock** unten in der Mitte: links das gezeigte Werk (oder das Signet), Mitte «Werk ansehen» bzw. «Zurück zu Works», rechts das Menü aus Kacheln (Works, Info, ORNAMENT LAB, ornament.cloud und das animierte Signet).
- **Werkseite**: Schlagworte (Jahr, Operationen), Titel und Kurztext gross, links das Akkordeon «Über das Werk · Verlauf · Angaben», rechts die Bildfolge (Film, Bild, weitere Bilder: das erste über die ganze Breite, danach paarweise breit und schmal).
- Von ornament.cloud: Signet mit laufendem Punkt, Blaupause, Instrument Sans und Newsreader, echte Umkehr im Dunkeln, Feldchen und Fuss.

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

Freiwillig: `kurz` (ein Satz: Etikett im Raster, grosser Satz auf der Werkseite, Beschreibung für Suchmaschinen), `farbe` (z. B. `"#c2410c"`, Farbe des Etiketts; sonst Blaupause), `bilder` (weitere Bilder aus dem Ordner für die Bildfolge, z. B. `["detail-1.jpg", {"datei": "detail-2.jpg", "alt": "…"}]`), `alt` (Bildbeschreibung, sonst «Titel, Ergebnis aus ORNAMENT LAB»), `position` (Zahl; kleinere stehen vorne, sonst das neueste Exportdatum zuerst).

## Dateien

- `tools/build-lab-works.mjs` – liest die Ordner, schreibt `b/lab/works/index.html` und `b/lab/works/<ordner>/index.html`; Signet und Favicon aus `b/werke/index.html`.
- `b/lab/works/works.css`, `works.js` – Gestaltung, Bühne und Raster, Dock und Menü, Filme; Versionsmarke `V` im Skript.
- Test: `tests/lab.e2e.mjs`, Schritt «Für Works» (Export aus dem Lab, Bau einer Werkschau in einem Temp-Ordner).
