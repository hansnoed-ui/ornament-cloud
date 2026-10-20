# ornament.cloud/b/ – Neubau der Website

Stand: 20. Oktober 2026 · Entwurf aus dem Auftrag vom 20. Oktober 2026 («komplettes Re-Design … unter ornament.cloud/b/»)

## Absicht

Die Website verbindet Kunst, Design, Webdesign, Therapie und Theorie. Bis jetzt ist sie eine Sammlung von Seiten, die nebeneinander
stehen. Der Neubau macht aus der Sammlung ein Gewebe: Jeder Inhalt hat Fäden zu anderen Inhalten, und die Besucher:innen bewegen sich
an diesen Fäden entlang. Die Seite soll schnell in Bann ziehen, zum Verweilen anregen, spielerisch mit dem Bestand umgehen und
zugleich als Referenz für die Angebote von Christian Strickler dienen.

## Das Bild: das Feld

Der Zettelkasten «Zu seiner Zeit» hat 7 Zyklen × 7 Strophen = 49 Zettel. Diese 7 × 7 sind das Ornament der Seite: ein Feld aus
49 Zellen. Alles andere (Konstellationen von ORNA und ORMA, Übungen, Bildmaschinen, Prüfraster, Angebote, Werke, Beiträge) hängt mit
Fäden an diesem Feld. Das Feld ist die Startseite, die Navigation und das Motiv zum Teilen.

Ornament heisst hier: eine Form, die aus der Form folgt (Luhmann, «Die Kunst der Gesellschaft»). Die Fäden sind die Anschlüsse.

## Ziele, Nicht-Ziele, Anti-Ziele

Ziele
- Erster Eindruck in unter zwei Sekunden: das Feld und ein Satz aus dem Zettelkasten, ohne Intro-Video, ohne Wartezeit.
- Jede Seite endet mit Fäden: drei bis fünf Verbindungen über die Gattungen hinweg.
- Gestaltungsdialog: Die Seite fragt, was jemand mitbringt (ein Bild, eine Frage, einen Auftrag, einen Begriff, eine Gruppe) und
  schlägt einen Weg vor. Auf den Angebotsseiten entsteht aus wenigen Wahlen ein Briefing, das per Mail abgeht.
- Fünf Leistungen als eigene Seiten, auffindbar für Suchmaschinen (Wunsch vom 20. Oktober 2026): Kunst, Webdesign, Vermittlung,
  Kuration, Soziale Arbeit.
- Teilen: jede Seite mit Vorschaukarte (1200 × 630) und Teilen-Knopf (Web Share, sonst Link kopieren); die Zettel zusätzlich als
  quadratische Karte zum Herunterladen.
- Suchmaschinen: Titel, Beschreibung, Canonical, Open Graph, JSON-LD (Person, WebSite, CreativeWork, Service), Sitemap-Block.
- Werkstatt (nicht verlinkt, noindex): Produkte für Print on Demand aus dem Bestand, mit Daten für Amazon KDP.

Nicht-Ziele
- Die Apps selbst bleiben, wie sie sind. /b/ verlinkt sie und stellt sie neu dar.
- Die bestehende Website unter / bleibt unverändert; /b/ steht daneben.
- Keine Dienste von aussen beim Aufruf, keine CDNs, kein Framework, keine Anmeldung (bleibt Hausregel).

Anti-Ziele (wäre ein Misserfolg, auch wenn es läuft)
- Ein Zettel-Text, der verändert, gekürzt oder umgeschrieben ist. Zettel, ORNA und ORMA sind tabu.
- Eine Seite, die wie ein Baukasten aussieht: Karten mit Schatten, Verläufe, Versal-Etiketten, Pfeile an jedem Link.
- Ein Intro, das vor den Inhalt tritt.

## Gestaltung

Farben (hell / dunkel)
- Papier `#ffffff` / `#000000` und Tinte `#000000` / `#ffffff`: echte Umkehr, wie das geteilte Symbol von ORMA.
- Grau `#6f6f6f` / `#9a9a9a`, Haarlinie `#dadada` / `#2e2e2e`, leichte Fläche `#f3f3f1` / `#161616`.
- Ein einziger Akzent, die Blaupause: `#1d3fd6` / `#8fb0ff`. Nur für Fäden und für das, was gerade aktiv ist.
  Das Orange der bisherigen Seite bleibt den Apps.

Schrift (beide liegen schon in `vendor/fonts/`)
- Instrument Sans: Oberfläche, Titel, grosse Sätze; eng gesetzt in grossen Graden.
- Newsreader: Zettel-Texte, Leitsätze (kursiv), Konstellationstexte; Zeilenlänge unter 70 Zeichen.

Aufbau
- Ein Raster aus sieben Spalten am Computer; das Feld setzt den Takt. Inhalt linksbündig, Spalte bis 1120 px.
- Dünne Linien statt Kästen, keine Schatten, keine Rundungen ausser an Wahl-Chips.
- Bewegung: ein inszenierter Moment, das Wachsen der Fäden durch das Feld beim ersten Aufruf. Alles andere bewegt sich nur auf eine
  Handlung hin. Bei «weniger Bewegung» steht alles.
- Handy hochkant zuerst: das Feld bleibt 7 × 7, die Zellen werden Quadrate ohne Text, der Titel erscheint beim Tippen.

Geprüft gegen die Voreinstellungen: kein Cremeton mit Terrakotta (das ist die alte Seite), kein Schwarz mit Neon, keine
Zeitungsspalten mit Nummernmarken. Das Blau kommt aus den Blaupausen und aus dem Nachtblau der PHORMA-Bilder; das Feld kommt aus dem
Bestand selbst.

## Seiten unter /b/

| Adresse | Inhalt |
|---|---|
| `/b/` | Das Feld mit einem wechselnden Leitsatz; der Dialog «Was bringst du mit?»; Denken, Spielen, Arbeiten, Werke, Zuletzt, Kontakt |
| `/b/zettel/` | Das Feld gross, die sieben Zyklen |
| `/b/zettel/<n>-<slug>/` | Der Zettel unverändert (Titel, Leitsatz, Text, vier Verweise), dazu Fäden, Teilen, Karte |
| `/b/apps/` und `/b/apps/<slug>/` | Die sieben Apps: ORNA, ORMA, OMNA COLOR, PHORMA I–III, The Fictory |
| `/b/raster/` und `/b/raster/<slug>/` | Die vier Prüfraster, das Feld der Achsen zum Antippen, Prompt zum Kopieren, PDF |
| `/b/angebot/` und `/b/angebot/<slug>/` | Die fünf Leistungen mit Gestaltungsdialog |
| `/b/werke/` | Originale, Prints, Editionen |
| `/b/zuletzt/` | Beiträge aus dem Social-Media-Zettelkasten |
| `/b/ueber/` | Christian Strickler, Kontakt, Liste, Impressum |
| `/b/werkstatt/` | Werkstatt für Print on Demand, nicht verlinkt, noindex |

## Fäden (jev beim Bauen)

jev (api.typesafe.ai) ist ein Beurteiler, kein Texter. `tools/build-b-jev.mjs` fragt ihn einmal beim Bauen je Zettel, welche Angebote,
Apps, Prüfraster und ORMA-Konstellationen gedanklich am nächsten liegen, und legt die Wahrscheinlichkeiten in `src/b/jev.json` ab.
Die Seite ruft jev nie auf. Zettel zu Zettel: gemeinsame Personen (wie bisher) und Nachbarn im Zyklus. Fällt die Tabelle weg oder
passt die Prüfsumme nicht, bleiben die Fäden über gemeinsame Personen und feste Zuordnungen bestehen.

Live (Gestaltungsdialog mit jev): vorbereitet über einen eigenen Worker wie in `alpha/stadt/` (`JEV_LIVE_ADRESSE`); ohne Adresse
rechnet die Seite mit der Tabelle. Das Aufsetzen des Workers ist Sache von Christian.

## Technik

- `src/b/inhalt.mjs`: alle eigenen Texte und das Verzeichnis der Apps, Raster, Angebote, Produkte.
- `tools/build-b.mjs`: erzeugt alle Seiten unter `b/` aus den Daten (Zettel aus `src/data/`, ORMA aus `src/orma/redaktion/pilot.json`,
  Werke aus `src/art/werke.json`, Beiträge aus `social-media/daten/eintraege.json`), kopiert `b.css`, `b.js`, schreibt den Sitemap-Block.
- `tools/b-kacheln.mjs`: Vorschaukarten (Playwright), `tools/build-b-pod.mjs`: PDFs für die Werkstatt (Playwright).
- `tests/b.test.mjs`: Zettel-Texte wörtlich gleich der Quelle, jede Seite mit Titel, Beschreibung, Canonical, OG, keine Aufrufe nach
  aussen, Sitemap, Werkstatt nicht verlinkt und noindex.
- Hausregeln, die /b/ bewusst nicht übernimmt (REGELN §14, benannt nach §0): eigene Kopfzeile statt «Ornament Cloud · Das Dritte
  Rad» und Menü-Kästchen; eigenes CSS statt `styles.css`. Die Tests `navigation` und `struktur` nehmen `b/` aus.

## Offen (Entscheide von Christian)

- Preise und Setting für Maltherapie und Vermittlung (Ausbildung, Stationen und Referenzen stehen seit dem 20. Oktober 2026 auf «Über»).
- Ob die Werkstatt ein Kennwort braucht (zurzeit: nur per Adresse, noindex) und welche Produkte zuerst auf Amazon gehen.
- Wann /b/ die bisherige Startseite ersetzt.
