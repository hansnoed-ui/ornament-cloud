# Maltherapie – DESIGN.md

Eigenständige Website für das Maltherapie-Angebot von Christian Strickler. Liegt vorerst unter
`ornament.cloud/maltherapie/`, zieht später auf eine eigene Adresse bei Hostpoint. Darum ist der Ordner
in sich geschlossen: eigene Schriften (`fonts/`), eigenes CSS, nur relative Verweise.

Richtung: **der Malort**. Ruhig, hell, viel Luft, wie ein aufgeräumtes Atelier vor der Stunde. Die Farbe
kommt nicht aus der Oberfläche, sondern aus den Pigmenten: eine Palette aus acht Farbfeldern mit gemalten
Rändern ist das einzige laute Element. Alles andere ist Tinte auf kühlem Papier, Haarlinien, keine Kisten.

Bewusst nicht: Cream-Töne, Orange als Akzent, Georgia, Verläufe, Schatten, drei gleiche Karten.
(Die Richtung beruht auf dem Neubau unter `/b/` und auf diesen Regeln, nicht auf einem Vergleich mit
anderen Sites; UXKIN war nicht erreichbar.)

## Farbe

| Token | hell | dunkel | Rolle |
|---|---|---|---|
| `--grund` | `#f5f7f6` | `#111514` | Seitenhintergrund, kühles Papier (kein Cream) |
| `--flaeche` | `#ffffff` | `#181d1b` | Hervorgehobene Flächen (Preise, Kontakt) |
| `--tinte` | `#18201d` | `#e5eae7` | Text, Titel |
| `--grau` | `#59635f` | `#9ba6a1` | Nebentext, Bildlegenden (Kontrast ≥ 5,5 : 1) |
| `--linie` | `#d6dcd9` | `#2a3230` | Haarlinien, Trenner |
| `--primaer` | `#1d5a4f` | `#86c9b8` | Viridian: Links, Knöpfe, Fokus (≥ 7 : 1) |
| `--auf-primaer` | `#ffffff` | `#0d1412` | Schrift auf dem Knopf |
| `--offen` | `#1d5a4f` @ 10 % | `#86c9b8` @ 14 % | Markierung für Platzhalter (nur im Entwurf) |

Pigmente (nur in der Palette und als kleiner Pinselstrich bei den Schritten):
Ultramarin `#2c3c9c`, Krapplack `#a1263d`, Kadmiumgelb `#e3b52a`, Viridian `#1f6b5b`,
Coelinblau `#3b8cbd`, Kobaltviolett `#6b3f8e`, Umbra `#6a4e3a`, Zinnober `#c8432f`.

## Schrift

- **Newsreader** (Serif, 300/400, kursiv 300): Titel und Leitsätze. Ruhig, menschlich.
- **Instrument Sans** (400/500): Fliesstext, Navigation, Knöpfe.

| Stufe | Grösse | Zeilenhöhe | Verwendung |
|---|---|---|---|
| `--t-klein` | 0.875rem | 1.5 | Legenden, Fuss |
| `--t-text` | 1.0625rem (17 px) | 1.65 | Fliesstext |
| `--t-gross` | 1.25rem | 1.55 | Lead |
| `--t-h3` | 1.5rem | 1.3 | Untertitel (Serif) |
| `--t-h2` | clamp(1.9rem, 5vw, 2.6rem) | 1.15 | Abschnittstitel (Serif 300) |
| `--t-h1` | clamp(2.5rem, 9vw, 4.4rem) | 1.04 | Haupttitel (Serif 300, −0.015em) |

Zeilen höchstens 64 Zeichen (`--mass: 34rem`).

## Abstand und Form

- Skala 4 px: 4, 8, 12, 16, 24, 32, 48, 64, 96 (`--a1` … `--a9`).
- Abschnitte: `--a8` am Handy, `--a9` ab 760 px; Seitenrand 20 px, Spalte max. 1080 px.
- Rundung: 999 px nur an Knöpfen; sonst 0. Keine Schatten.

## Bausteine

- **Knopf primär**: Viridian gefüllt, Pille, 48 px hoch; hover dunkler, Fokus 2 px Ring mit Abstand.
- **Knopf ruhig**: Rand 1 px `--tinte`, transparent.
- **Link**: `--primaer`, Unterstreichung 1 px, Abstand 0.2em.
- **Liste mit Linien**: Zielgruppen und Preise als Zeilen mit Haarlinie oben, nicht als Karten.
- **Schritte**: Nummer in Serif, darunter ein kurzer Pinselstrich in einem Pigment.
- **Kopf**: Wortmarke links, Ankerlinks rechts; am Handy eine Zeile, die waagrecht wischt.
- **Platzhalter** (`.offen`): getönter Hintergrund und gestrichelte Unterlinie, damit fehlende Inhalte sofort sichtbar sind. Verschwinden, sobald echte Inhalte da sind.

## Bilder

Noch keine Fotos. Vorgesehen: Atelier im Tageslicht, Hände mit Pinsel, Farbtöpfe; keine Bilder von
Klient:innen oder ihren Werken ohne Einwilligung. Fotos randlos, Seitenverhältnis 4 : 5 am Handy,
3 : 2 am Computer. Keine Symbole aus Bibliotheken; die Palette ist das Zeichen der Seite.
