# Animationen – Gestaltung (`animations/`)

Stand: 4. November 2026 (spät). Gilt nur für diese Seite; die Website selbst folgt `styles.css`.

Richtung: ein Werkzeug, das wie die Seite eines Designstudios aussieht. Zwei Ansichten (Mischpult, Info), keine Beispielbilder, kein Name des Betreibers; die Werke der Besucher sind die Galerie. Wenig Farbe, viel Luft, feine Linien, grosse Zeile,
ein einziger Akzent. Die Animationen sind das Bild, alles andere ist Beschriftung. Vorbilder, die Christian genannt hat:
lisovskiy.work (grosse Grotesk, gestreutes Kachelraster) und ijpowell.co.uk (Kopfzeile mit Ansichten, Reel in der Mitte,
Zähler unten). Schrift und Farben kamen zuerst von der Logo-Referenz ornament.cloud/gamma (Warmweiss, Koralle, Instrument Sans,
Newsreader kursiv); am 4. November spät wollte Christian sie «etwas cooler … und nicht in diesem claude classic design». Seither: kalte Palette
(Blauschwarz, Kaltweiss, ein Akzent in Säuregrün) und drei Schriften (Bricolage Grotesque, Geist, Geist Mono). Die Form der Seite blieb.
Die Richtung ist nicht mit UXKIN an fremden Seiten geprüft (nicht verbunden), sondern aus dem Projekt und diesen Referenzen abgeleitet.

## Farbe

Dunkel ist der Normalfall (die Animationen leben auf Schwarz), hell folgt `prefers-color-scheme`. Alle Grautöne sind kalt (ein Hauch Blau), nichts ist warm.

| Token | Dunkel | Hell | Rolle |
|---|---|---|---|
| `--grund` | `#08090c` | `#eceef2` | Seite |
| `--flaeche` | `#11131a` | `#ffffff` | Karten, Eingabefelder, Kachel der Vorschau |
| `--buehne` | `#000000` | `#08090c` | Bühne hinter der Animation, immer dunkel |
| `--tinte` | `#e9ecf2` | `#0e1016` | Text, Rahmen aktiver Knöpfe |
| `--leise` | `rgba(233,236,242,.56)` | `rgba(14,16,22,.6)` | Zweitzeilen, Beschriftungen (mindestens 4,5 : 1) |
| `--linie` | `rgba(233,236,242,.14)` | `rgba(14,16,22,.16)` | Haarlinien, Rahmen |
| `--akzent` | `#c9ff3d` | `#3a7000` | ein Punkt pro Zustand: aktive Ansicht, Fortschritt, Fokus, laufende Ebene, das Gegenwort in grossen Zeilen |
| `--dunkel` | `#08090c` | `#08090c` | Text auf dem Akzent (Haupttaste beim Darüberfahren) |

Keine Verläufe, kein Glas, keine Schatten. Der Akzent steht nie auf grossen Flächen, nur als Punkt, Strich oder Wort; die einzige Fläche
im Akzent ist die Haupttaste «Neu mischen» beim Darüberfahren (Schrift darauf `--dunkel`). Kontraste (WCAG): Akzent dunkel 16,9 : 1,
Akzent hell 5,2 : 1, `--leise` 5,6 : 1 dunkel und 4,5 : 1 hell.

## Schrift

Drei Schriften, alle lokal aus `vendor/fonts/animationen.css` als variable Schnitte (latin, latin-ext):

- `--display`: **Bricolage Grotesque** 600 für die grossen Zeilen (`font-optical-sizing: auto`, Laufweite −.03em), 500 für die Aufforderung
  auf der leeren Bühne und die Meldung bei den Werken. Das eine Gegenwort in den grossen Zeilen («Werke *12*», «drei *Ebenen*») steht nicht mehr
  kursiv in einer Serife, sondern in Schnitt 300 und im Akzent.
- `--sans`: **Geist** 400 und 500 für Lauftext, Bedienung, Marke, Ansichten.
- `--mono`: **Geist Mono** 500 für alle Beschriftungen (Versalien, 11 px, Laufweite .08em), für Nummern und laufende Zahlen (Uhr, Zähler,
  Reglerwerte, Werk-Nummern, Listenzahlen, Exportzeile) mit `font-variant-numeric: tabular-nums`.
- Stufen (px / Zeilenhöhe): 11/1.3 Beschriftung · 13/1.4 Zweitzeile und Uhr · 15/1.45 Bedienung · 17/1.4 Lauftext · 22/1.25 Zwischentitel ·
  26/1.15 Aufforderung · Grosse Zeile `clamp(40px, 6.4vw, 104px)` / .95.
- Nichts kursiv. Keine Schrift von aussen.

## Abstand und Mass

- Schritte: 4, 8, 12, 16, 24, 32, 48, 72, 120 px. Seitenrand `--rand`: 24 px, Handy 16 px.
- Inhalt bis 1680 px Breite, zentriert; die Bühne ist 4 : 5 und höchstens so hoch, dass Kopf und Fuss sichtbar bleiben.
- Abschnitte trennen Haarlinien, keine Flächen.

## Form

- Radius 0 für Bühne, Karten, Felder und Haarlinien. Pillen (999 px) nur für Schalter in Gruppen.
- Ein Rahmen, 1 px `--linie`; aktiv wird er `--tinte`.

## Bausteine

- **Kopf**: Marke links («ornament.cloud», Punkt im Akzent), Zeile in der Mitte, rechts die zwei Ansichten mit Nummer; die aktive trägt den Akzentpunkt.
  Auf dem Handy wandern die Ansichten in eine feste Leiste am unteren Rand (Daumenweite), der Kopf behält nur die Marke.
- **Mischpult**: Bühne links (klebt beim Rollen), darunter Uhr, Fortschrittslinie und Schlaufe, dann die Haupttaste **«Neu mischen»** (gefüllt, mit
  Akzentpunkt, 52 px hoch) und daneben «MP4 laden». Ohne Bild zeigt die Bühne die Aufforderung (gestrichelter Rahmen, Satz mit kursivem Wort,
  «Bild wählen …»). Pult rechts 400 px: Gruppen mit Versalbeschriftung, Schalter als Pillen, Ebenen als Karten mit Haarlinie, dünne Regler mit
  Wert rechts, leise Tasten (Pause, Standbild, Link), zuunterst «Werk sichern» mit Titel und Name.
- **Werke**: unter dem Mischpult, von einer Haarlinie getrennt: grosse Zeile «Werke» mit der Anzahl leicht und im Akzent, daneben ein Satz,
  darunter das gestreute Raster mit drei Kachelgrössen (12 Spalten, Tablet 8, Handy 4). Beschriftung: Nummer, Titel, darunter leise
  «von Name · Datum»; eigene Werke mit «Löschen». Darüberfahren lässt die Animation laufen, Klick lädt sie ins Mischpult.
- **Info**: grosse Zeile, Kolophon (Technik, Schlaufe, Werke, Schrift), drei nummerierte Listen (So geht es, Effekte, Ebenen) mit Haarlinien.
- **Fuss**: Haarlinie, eine Zeile: zurück zur Website, Hinweis auf die Namen der Werke, alles im Browser gerechnet.
- **Vorschaukarte** (`og-animationen.jpg`, 1200 × 630, `tools/animations-og.mjs`): links «Animationen.» und darunter «Mischpult» leicht im Akzent, rechts sechs Effekte
  ohne Bild als Kacheln, getrennt durch Haarlinien.
- **Zustände**: Hover unterstreicht oder kehrt um, Fokus ist ein 2-px-Ring im Akzent, Gedrücktes ist gefüllt (`aria-pressed`), Abgeschaltetes hat 35 % Deckkraft.
  Meldungen beim Sichern stehen unter der Taste (Erfolg im Akzent). Ansichten blenden in 240 ms ein; mit `prefers-reduced-motion` sofort. Touch-Ziele mindestens 44 px hoch.
