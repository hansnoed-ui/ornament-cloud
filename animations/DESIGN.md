# Animationen – Gestaltung (`animations/`)

Stand: 4. November 2026. Gilt nur für diese Seite; die Website selbst folgt `styles.css`.

Richtung: ein Werkzeug, das wie die Seite eines Designstudios aussieht. Wenig Farbe, viel Luft, feine Linien, grosse Zeile,
ein einziger Akzent. Die Animationen sind das Bild, alles andere ist Beschriftung. Vorbilder, die Christian genannt hat:
lisovskiy.work (grosse Grotesk, gestreutes Kachelraster) und ijpowell.co.uk (Kopfzeile mit Ansichten, Reel in der Mitte,
Zähler unten); Schrift und Farben kommen von der Logo-Referenz ornament.cloud/gamma. Die Richtung ist nicht mit UXKIN
an fremden Seiten geprüft (nicht verbunden), sondern aus dem Projekt und diesen Referenzen abgeleitet.

## Farbe

Dunkel ist der Normalfall (die Animationen leben auf Schwarz), hell folgt `prefers-color-scheme`.

| Token | Dunkel | Hell | Rolle |
|---|---|---|---|
| `--grund` | `#0b090a` | `#f2efea` | Seite |
| `--flaeche` | `#141112` | `#ffffff` | Karten, Eingabefelder, Kachel der Vorschau |
| `--buehne` | `#000000` | `#0b090a` | Bühne hinter der Animation, immer dunkel |
| `--tinte` | `#f2ece6` | `#121010` | Text, Rahmen aktiver Knöpfe |
| `--leise` | `rgba(242,236,230,.56)` | `rgba(18,16,16,.56)` | Zweitzeilen, Beschriftungen (mindestens 4,5 : 1) |
| `--linie` | `rgba(242,236,230,.16)` | `rgba(18,16,16,.16)` | Haarlinien, Rahmen |
| `--akzent` | `#f08a5d` | `#c2410c` | ein Punkt pro Zustand: aktive Ansicht, Fortschritt, Fokus, laufende Ebene |

Keine Verläufe, kein Glas, keine Schatten. Der Akzent steht nie auf Flächen, nur als Punkt, Strich oder Wort.

## Schrift

- `--sans`: Instrument Sans 400 und 500 (lokal aus `vendor/fonts/`). Es gibt keine fetteren Schnitte: nichts künstlich verdicken.
- `--serif`: Newsreader kursiv 300 für je ein Wort in den grossen Zeilen («27 *Animationen*») und für Zitate.
- Stufen (px / Zeilenhöhe): 11/1.3 Beschriftung (Versalien, Laufweite .08em) · 13/1.4 Zweitzeile · 15/1.45 Bedienung · 17/1.4 Lauftext ·
  22/1.25 Zwischentitel · Grosse Zeile `clamp(40px, 6.4vw, 104px)` / .95, Laufweite −.035em.
- Zahlen tabellarisch (`font-variant-numeric: tabular-nums`) überall, wo sie laufen: Uhr, Zähler, Reglerwerte.

## Abstand und Mass

- Schritte: 4, 8, 12, 16, 24, 32, 48, 72, 120 px. Seitenrand `--rand`: 24 px, Handy 16 px.
- Inhalt bis 1680 px Breite, zentriert; die Bühne ist 4 : 5 und höchstens so hoch, dass Kopf und Fuss sichtbar bleiben.
- Abschnitte trennen Haarlinien, keine Flächen.

## Form

- Radius 0 für Bühne, Karten, Felder und Haarlinien. Pillen (999 px) nur für Schalter in Gruppen.
- Ein Rahmen, 1 px `--linie`; aktiv wird er `--tinte`.

## Bausteine

- **Kopf**: Marke links («ornament.cloud», Punkt im Akzent), Zeile in der Mitte, rechts die vier Ansichten mit Nummer; die aktive trägt den Akzentpunkt.
  Auf dem Handy wandern die Ansichten in eine feste Leiste am unteren Rand (Daumenweite), der Kopf behält nur die Marke.
- **Reel**: links Beschriftung des Werks (Nummer, Bild, Effekt, Grund, Länge), Mitte die Bühne, rechts die Handlungen in drei Gruppen
  (Wiedergabe, Ansicht, Laden). Darunter eine Fortschrittslinie über die ganze Breite, links die Uhr, rechts der Zähler «02 / 27».
  Pfeiltasten blättern, die Leertaste hält an.
- **Werke**: grosse Zeile links, die drei Bilder als Wortstapel rechts, darunter das gestreute Raster mit drei Kachelgrössen.
  Beschriftung: Nummer und Titel, darunter leise das Bild.
- **Mischpult**: Bühne links (klebt beim Rollen), Pult rechts 400 px. Gruppen mit Versalbeschriftung, Schalter als Pillen in einer Reihe,
  Ebenen als Karten mit Haarlinie, dünne Regler mit Wert rechts. Eine Haupttaste (MP4 laden, gefüllt), «Neu mischen» mit Rahmen, der Rest leise.
- **Info**: grosse Zeile, darunter Kolophon (Technik, Bilder, Jahr) und drei nummerierte Listen mit Haarlinien.
- **Fuss**: Haarlinie, eine Zeile: zurück zur Website, Bilder von Christian Strickler, alles im Browser gerechnet.
- **Zustände**: Hover unterstreicht oder kehrt um, Fokus ist ein 2-px-Ring im Akzent, Gedrücktes ist gefüllt (`aria-pressed`), Abgeschaltetes hat 35 % Deckkraft.
  Ansichten blenden in 240 ms ein; mit `prefers-reduced-motion` sofort. Touch-Ziele mindestens 44 px hoch.
