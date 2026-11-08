# Animationen – Gestaltung (`animations/`)

Stand: 5. November 2026. Gilt nur für diese Seite; die Website selbst folgt `styles.css`.

Richtung: ein Werkzeug, das wie die Seite eines Designstudios aussieht. Zwei Ansichten (Mischpult, Info), keine Beispielbilder, kein Name des Betreibers; die Werke der Besucher sind die Galerie. Wenig Farbe, viel Luft, feine Linien, grosse Zeile,
ein einziger Akzent. Die Animationen sind das Bild, alles andere ist Beschriftung. Vorbilder, die Christian genannt hat:
lisovskiy.work (grosse Grotesk, gestreutes Kachelraster) und ijpowell.co.uk (Kopfzeile mit Ansichten, Reel in der Mitte,
Zähler unten). Schrift und Farben kamen zuerst von der Logo-Referenz ornament.cloud/gamma (Warmweiss, Koralle, Instrument Sans,
Newsreader kursiv); am 4. November spät wollte Christian sie «etwas cooler … und nicht in diesem claude classic design». Seither: kalte Palette
(Blauschwarz, Kaltweiss, ein Akzent in Säuregrün); die Schrift nach zweitem Feedback Hanken Grotesk, die Knöpfe leicht abgerundet. Die Form der Seite blieb.
Die Richtung ist nicht mit UXKIN an fremden Seiten geprüft (nicht verbunden), sondern aus dem Projekt und diesen Referenzen abgeleitet.

## Farbe

Dunkel ist der Normalfall (die Animationen leben auf Schwarz), hell folgt `prefers-color-scheme`. Seit 8. November 2026 übersteuert der Schalter im Kopf (`thema.js`) das Gerät: `data-thema="hell|dunkel"` auf `<html>`, gemerkt im Browser. Alle Grautöne sind kalt (ein Hauch Blau), nichts ist warm.

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

Zwei Schriften, lokal aus `vendor/fonts/animationen.css` als variable Schnitte (latin, latin-ext). Christians Richtung (4. November, spät):
«irgendetwas richtung helvetica now». Helvetica Now ist nicht frei; die nächste freie Verwandte ist **Hanken Grotesk** (neutrale Grotesk mit
geschlossenen Formen, eng in gross). Geprüft gegen Inter (optische Grösse), Schibsted Grotesk, Archivo und Instrument Sans.

- `--sans` (= `--display`): **Hanken Grotesk** für alles, was man liest: 400 Lauftext, Hinweise, Kolophon, Fuss, Marke und Kopfzeile; 600 grosse Zeilen
  (Laufweite −.04em). Das eine Gegenwort in den grossen Zeilen («Werke *12*», «drei *Ebenen*») steht in 300 und im Akzent.
- `--mono`: **Geist Mono** für alles, was man bedient (Christian, 5. November: «mir gefällt der schrifttyp mit welchem der zeitstempel unter dem bild
  angezeigt wird gut … vor allem in den bedienfeldern»): Uhr und Schlaufenzeile, Ansichten im Kopf, Beschriftungen (Versalien, 11 px, 500, Laufweite .08em),
  Knöpfe und Schalter (13 px, 500), Haupttaste (15 px), Auswahllisten und Felder (13 px), Reglernamen und -werte (12 px), Werk-Zeilen unter den Kacheln (12 px),
  Listenzahlen, Exportbox. Immer `font-variant-numeric: tabular-nums`.
- Stufen (px / Zeilenhöhe): 11/1.3 Beschriftung · 12 Regler und Werk-Zeilen · 13/1.2 Knöpfe, Felder, Uhr · 13/1.45 Hinweise · 15/1.45 Bedienungstext ·
  17/1.4 Lauftext · 22/1.25 Zwischentitel · 26/1.15 Aufforderung · Grosse Zeile `clamp(40px, 6.4vw, 104px)` / .95.
- Nichts kursiv. Keine Schrift von aussen.

## Abstand und Mass

- Schritte: 4, 8, 12, 16, 24, 32, 48, 72, 120 px. Seitenrand `--rand`: 24 px, Handy 16 px.
- Inhalt bis 1680 px Breite, zentriert; die Bühne ist 4 : 5 und höchstens so hoch, dass Kopf und Fuss sichtbar bleiben.
- Abschnitte trennen Haarlinien, keine Flächen.

## Form

- Radius 0 für Bühne, Karten und Haarlinien. Knöpfe, Schalter, Felder und Auswahllisten `--radius` 6 px, die Haupttaste und die Exportbox 8 px
  (Christian, 4. November spät: «die button nur leicht abgerundet und cooler», «minimal designte knöpfe … mit einem individuellen touch, also natürlich alle
  auf der seite gleich»). Keine Pillen mehr.
- **Ein Knopf, überall gleich:** flach, ohne Fläche, 1 px `--linie`, Geist Mono 13 px / 500 in `--leise`. Darüberfahren: Rahmen und Schrift `--tinte`.
  **An** (`aria-pressed`): Rahmen `--tinte`, und der Punkt der Marke wächst in 180 ms vor dem Wort (6 px, Akzent); nichts wird gefüllt. Das ist der
  individuelle Touch der Seite: derselbe Punkt steht in «ornament.cloud», auf der Haupttaste und an der aktiven Ansicht.
  Ausnahmen: die Haupttaste «Neu mischen» ist gefüllt (`--tinte`, Punkt immer da, beim Darüberfahren Akzentfläche), leise Tasten (Pause, Standbild, Link)
  haben keinen Rahmen und bekommen Fläche und Rahmen erst beim Darüberfahren.

## Bausteine

- **Schalter Hell / Dunkel** (8. November 2026, nach Christians Video, `thema.js`): im Kopf vor den Sprachen, 68 × 38 px (Handy 58 × 32). Die eine bewusste
  Ausnahme von «kein Glas, keine Schatten, keine Verläufe»: Knauf mit Verlauf und Schatten, Pixelzeichen auf 13 × 13 (hell Sonne, dunkel Mond mit Stern),
  leuchtender Bogen um den Knauf (hell Bernstein `#ffb21c` oben rechts, dunkel Blauviolett `#8f8cff` unten links). Umschalten: Pixel zerstieben und setzen sich
  neu, der Bogen wandert, die Seite wechselt in einem Kreis vom Schalter aus (View Transitions). `role="switch"`, ohne Bewegung bei `prefers-reduced-motion`.
  Unter 420 px Breite weicht dafür der Seitenname neben der Marke.

- **Kopf**: Marke links («ornament.cloud», Punkt im Akzent), Zeile in der Mitte, rechts die zwei Ansichten mit Nummer; die aktive trägt den Akzentpunkt.
  Auf dem Handy wandern die Ansichten in eine feste Leiste am unteren Rand (Daumenweite), der Kopf behält nur die Marke.
- **Mischpult**: Bühne links (klebt beim Rollen), darunter Uhr, Fortschrittslinie und Schlaufe, dann die Haupttaste **«Neu mischen»** (gefüllt, mit
  Akzentpunkt, 52 px hoch) und daneben «MP4 laden». Ohne Bild zeigt die Bühne die Aufforderung (gestrichelter Rahmen, Satz mit kursivem Wort,
  «Bild wählen …»). Pult rechts 400 px: Gruppen mit Versalbeschriftung, Schalter als flache Knöpfe mit 6 px Radius, Ebenen als Karten mit Haarlinie, dünne Regler mit
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
