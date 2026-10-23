# Videos von ornament.cloud

Kurze Videos zu den Werken von ornament.cloud, gebaut mit [Remotion](https://www.remotion.dev) (React → MP4).
Alle im gleichen Stil: Hochformat 9:16 (1080 × 1920), 30 fps, ohne Ton, mit dem animierten Signet als Intro und Outro.
Die Arbeitsweise (für Claude) steht im Skill `.claude/skills/ornament-video/SKILL.md`.

## Aufbau

```
src/
  Root.tsx            alle Videos als Compositions (neue trägt «npm run neu» ein)
  vorlage/            gemeinsam für alle Videos – Änderungen hier ändern jedes Video
    stil.ts           Farben, Schriften (Newsreader, Instrument Sans), Format
    Signet.tsx        Re-entry-Schlaufe mit Punkt, Schriftzug «ornament.cloud»; optional Kopfzeile darüber
    Bausteine.tsx     Intro (3 s), Outro (6 s), Grund, Marke, Titel, Leise, Oben, Unten, Auszug, blende, steig
  wachstum/           Linienwachstum spielt «ornament.cloud», 1 : 1, ohne Text (9. Oktober 2026); auch die Startanimation der Website
    Wachstum.ts       die Simulation (Punkte, Abstossung, Feder, Kantenteilung, Grenze), deterministisch
    Formen.ts         die beiden Grenzen: atmende Wolke aus Kreisen, Buchstaben des Namens (Maske, Abstandsfeld, Keime)
    Video.tsx         Zeitplan T und Szenen
  reel/               Werbe-Reel «Was bringst du mit?» für /b/ (22. Oktober 2026): Video.tsx, Format.tsx (Raster je Format), Teile.tsx (Schlagzeile, Textspalte, lebende Tafeln),
                      LogoVektor.tsx, szenen/*.tsx, daten.mjs, aufnahme.mjs
  neubau/             ornament.cloud/b/ in der Gestaltung des Neubaus, ohne die Vorlage (22. Oktober 2026)
    Video.tsx         Szenen mit TransitionSeries, Kopfzeile darüber; Teile.tsx (Farben, Schriften, Zeichen, Signet), Kopf.tsx, szenen/*.tsx
    daten.mjs         liest Farben, Texte, Zeichen und Fäden unverändert aus /b/ → neubau/data/neubau.json (nicht eingecheckt)
  rundgang/           Rundgang durch ornament.cloud (22. Oktober 2026)
    Video.tsx         Zeitplan T, das Menü als durchgehende Ebene, Szenen
    daten.mjs         liest Menü, Leads, Namen und den Zettel «Die Brücke» unverändert aus der Website → rundgang/data/rundgang.json (nicht eingecheckt)
  orna/               Erklärvideo zu ORNA (5. Oktober 2026)
    Video.tsx         Zeitplan T und Szenen
    Rad.tsx           das Doppelrad, nachgezeichnet nach portfolio/nebeneinander-nacheinander/js/wheel.js
    daten.mjs         liest Daten unverändert aus der Website → orna/data/orna.json (nicht eingecheckt)
vorbereiten.mjs       Schriften nach public/, alle src/*/daten.mjs ausführen
neues-video.mjs       Gerüst für ein neues Video
```

## Stil (Vorlage)

- **Intro** (90 Bilder, 3 s; andere Bildhöhen mit `hoehe`, z. B. 1440 für 3:4): das Signet in kurzer Fassung, darüber eine Kopfzeile im Rot-Orange der Seite,
  z. B. `{ titel: "ORNA", unter: ["app", "web"] }` → «ORNA», darunter «app • web» (kleiner Punkt dazwischen)
- **Outro** (180 Bilder, 6 s): das Signet in voller Länge – Schlaufe zeichnet sich, Punkt läuft, aus Kästchen werden
  die Buchstaben von «ornament.cloud», die dann zusammenrücken (Instrument Sans 400, 52 px, gesperrt; der Punkt im Rot-Orange)
- **Farben**: Grund `#f8f8f6`, Text `#1f1d1a`, leise `#6b665e`, Akzent `#c2410c` (wie die Website)
- **Schrift**: Titel und Auszüge in Newsreader (Serife), Kennzeilen und Erklärungen in Instrument Sans
- **Sicherer Bereich**: 90 px seitlich, Texte oben ab 150 px (`Oben`), unten ab 1475 px (`Unten`), dazwischen das Bild
- **Bewegung**: Abschnitte blenden in 12 Bildern ein und aus (`blende`) und steigen dabei um 24 px auf (`steig`)
- **Striche**: kräftig genug fürs Telefon (Linien ab etwa 2,5 px im fertigen Bild)
- **Texte aus dem Korpus** nie abändern; Auszüge wörtlich, mit «[…]» gekennzeichnet, im Datenskript gegen den Text geprüft (`Auszug`)

## Neues Video

```bash
cd src/videos
npm i
npm run neu -- stellenfeld STELLENFELD web werk   # Name, Titel im Intro, Stichworte darunter
npm run dev                                       # Vorschau im Browser (Remotion Studio)
npx remotion render StellenfeldVideo out/stellenfeld.mp4 --codec=h264 --crf=20
```

`neues-video.mjs` legt `src/<name>/Video.tsx` an (Intro mit Kopf, eine Platzhalterszene, Outro) und trägt es in `src/Root.tsx` ein.
Braucht das Video Daten aus der Website, kommt ein `src/<name>/daten.mjs` dazu (Vorbild: `src/orna/daten.mjs`); `vorbereiten.mjs` führt es aus.

## ORNA – Erklärvideo

51,5 s. Das fertige Video steht seit dem 9. Oktober 2026 auf «Web» (Videoseite `web/orna-erklaervideo/`, davor von 5. bis 9. Oktober 2026 auf der Startseite unter OMNA COLOR; `assets/orna-erklaervideo.mp4`, Standbild `assets/orna-erklaervideo.jpg`,
ein Standbild aus dem Intro bei 2,6 s; Vorschau der Karte `assets/vorschau-orna-erklaervideo.jpg`, 640 × 800, ein Ausschnitt aus dem Titelbild bei 5 s). Nach einer Änderung neu rendern (`npm run render:orna`), nach `yuv420p` umwandeln (siehe unten) und beide Dateien ersetzen.

0. Intro mit «ORNA» und «app • web»
1. Titel «Zufällige Begegnungen» (darüber ORNA), das Rad baut sich aus den 40 Zeichen auf
2. Oben die beiden Ringe (aussen 20 Künstler:innen, innen 20 Theoretiker:innen), unten «Zwei Ringe, gegenläufig»
3. Eine Drehung, eine Begegnung: Eva Hesse × Susan Leigh Star und ihre Frage
   – danach ein Auszug aus ihrem Text (die ersten beiden Sätze, Wort für Wort, mit «[…]»; `daten.mjs` prüft, dass er mit dem Text beginnt)
4. Achse 1, Verräumlichung (Prüfstein Rückkehr)
5. Achse 2, Verzeitlichung (Prüfstein Irreversibilität), die Ringe drehen gegeneinander
6. Die sechs Prüfdimensionen («Was eine Paarung leisten muss»)
7. Das Feld 20 × 20: 326 von 400 Paarungen
8. «Dieses Rad erzeugt keine Antworten. Es erzeugt Konstellationen.»
9. Outro: Signet

Namen, Zeichen, Paarungen und die Frage kommen unverändert aus den Daten von ORNA; die Achsen aus dem Prüfraster
«Nebeneinander und Nacheinander», die Prüfdimensionen und die Sätze zum Feld wörtlich aus `src/doppelspalt/werkbericht.md`.

## «Liebling, ich habe den Poststrukturalismus strukturiert» (6. Oktober 2026)

Etwa 2 Minuten, **3:4** (1080 × 1440, `DoppelpruefungVideo`), **9:16** (1080 × 1920, `DoppelpruefungHoch`; dieselbe Bühne mittig; auf der Videoseite `web/poststrukturalismus/` als 608 × 1080 ohne Ton, `assets/poststrukturalismus-9x16.mp4`), ohne Ton, Comic-Stil mit etwas Roy Lichtenstein (Ben-Day-Punkte, Grundfarben, gelbe Erzählkästen; Wunsch von Christian): zeigt spielerisch, wie die Studie
«Poststrukturalistische Theorie – Doppelprüfung» zwölf Positionen mit dem Prüfraster Nebeneinander / Nacheinander und dem
Verteilapparat des Körpers prüft. Quelle `src/doppelpruefung/`: `Video.tsx` (Szenen), `Comic.tsx` (eigener Stil nur für dieses Video:
dicke Konturen, harte Schatten, Punktraster, satte Farben), `zitate.ts` (alle Stellen wörtlich aus der Studie, mit Seitenangabe; gegen den
PDF-Text geprüft). Intro und Outro sind das Signet der Vorlage (`Intro`/`Outro` mit `hoehe={1440}`). Theoretiker:innen erscheinen nur als
Namen, ihre Operationen als Gegenstände; Lyotard (Leugnungsbeispiel) und Butler (Fall Reimer) nur als Punkte der Streugrafik, ohne Witz und Bild.

0. Intro «Poststrukturalismus», darunter «Doppelprüfung • 12 Positionen»; dann der Titel: zwölf Karten liegen durcheinander und rasten in ein Raster ein
1. Die Leitfrage in drei Sprechblasen
2. Zwei Raster: Stempel «dieselbe Stelle?» (X), Dominosteine (Y), sieben Schranken (Verteilapparat)
3. Zwölf Karten, Stempel «Begriff · Interpretation»
4. Förderband mit acht Prüffragen, Zusatzprüfung mit drei Lämpchen
5. Vier Miniaturen: Derrida (Unterschrift), Deleuze (AB AB A … B?), Foucault (Fenster, Register), Baudrillard (Ausstechform «Modell»)
6. Streugrafik der zwölf Positionen
7. Sieben Schranken am Beispiel von Foucaults Pestreglement
8. Sichtbarkeit ≠ Gehör
9. Die drei Schlussfragen
10. Outro

`npx remotion render DoppelpruefungVideo out/doppelpruefung.mp4 --codec=h264 --crf=20`, danach nach `yuv420p` umwandeln (siehe unten).

## «Drei im Doppelspalt der Wahrnehmung» (6. Oktober 2026)

Gut 2 Minuten (2:24; das Signet steht am Anfang 1,5 s und am Schluss 2 s länger), nur **3:4** (1080 × 1440, `DreiervergleichVideo`), ohne Ton. Wie «Liebling …», aber farblich anders und hochwertiger mit viel Roy Lichtenstein
(jede Szene ein gerahmtes Bildfeld, Halbton-Verläufe, Erzählkästen in Versalien, doppelt gezackte Knalle, Gedankenwolke, Stempel; Wunsch von Christian).
Vergleicht Luhmann, Baecker und Lehmann im Prüfraster Nebeneinander / Nacheinander, ausgehend von der Vergleichenden Analyse
«Nebeneinander, Nacheinander | Luhmann, Baecker, Lehmann» (5. Oktober 2026), aber nicht an sie gebunden.
Quelle `src/dreiervergleich/`: `Video.tsx` (Szenen, Kreisblenden), `Pop.tsx` (Palette, Lichtenstein-Bausteine, `Iris`, `PopIntro`/`PopOutro`; jeder Autor in seiner Farbe:
Luhmann türkis, Baecker gelb, Lehmann korallrot), `zitate.ts` (`Z`: wörtlich aus der Studie, gegen den PDF-Text geprüft, mit «…» gezeigt; `L`: eigene Lesart, ohne Anführungszeichen).
Intro und Outro sind das Signet der Vorlage im Pop-Stil (`Signet` mit `stil`; ohne `stil` bleibt es in allen anderen Videos unverändert, gegen Standbilder geprüft).

0. Intro: Signet mit gelbem Kopfkasten «Doppelspalt», darunter «Luhmann • Baecker • Lehmann»; Titel mit drei Namenskarten
1. Das Prüfraster: X (Bestimmbare Rückkehr), Y (Folgenreicher Vollzug)
2.–4. Die Grundoperationen: Luhmann (Information · Mitteilung · Verstehen, Ereignisse, Entscheidung), Baecker (Form, «nächste» mit einer Y-Skala im Bild, grafische Eleganz),
   Lehmann (Werk · Medium · Reflexion, re-exit, «BRUCH!» wird blasser)
5.–7. Raum und Zeit je Autor: Luhmann (Objekte verlassen ihre Stellen / Stellen verlassen ihre Objekte; die Y-Texte sagen jeweils, worin die Verzeitlichung liegt), Baecker (Form auf einen Blick / re-entry, Oszillation, Gedächtnis),
   Lehmann (Vergleichsmodell / Erfahrung lernt)
8. Duell: RE-ENTRY! gegen RE-EXIT!, je mit der Verzeitlichung (Oszillation, Gedächtnis / Kriterienwandel wirkt weiter); re-exit markiert: bei Lehmann nur in den Humanmedien Kunst, Liebe, Religion; nicht Wissenschaft, Recht, Wirtschaft
9. Differenzen: Lehmann → Luhmann (keine schlichte Wahl «mit» oder «ohne Menschen»), Lehmann → Baecker (Rezension 2008)
10. Siegertreppchen sackt zusammen: «Alle drei erschliessen Raum und Zeit – jeder auf seine Weise. Das Prüfraster vergibt keine Medaillen.», kein philosophisches Ranking; 11. Die offene Frage; 12. Outro

Die Szenen öffnen sich mit einer Kreisblende über der vorigen (18 Bilder Überlappung).
`npx remotion render DreiervergleichVideo out/dreiervergleich.mp4 --codec=h264 --crf=20`, danach nach `yuv420p` umwandeln (siehe unten).

## «Mensch, Niklas!» (7. Oktober 2026)

Gut drei Minuten, **3:4** (1080 × 1440, `MenschVideo`), ohne Ton, im Stil von «Drei im Doppelspalt der Wahrnehmung» (Bausteine aus `dreiervergleich/Pop.tsx`).
Christian erzählt in der Ich-Form, woran und warum er seit einigen Monaten arbeitet; mit ihm erarbeitet. Quelle `src/mensch/`: `Video.tsx` (Szenen),
`Figuren.tsx` (der Erzähler stilisiert: Brille, Wuschelkopf, um die 50; Luhmann als Laken-Geist mit Zettelkasten, der nur mit Zettelnummern antwortet),
`texte.ts` (eigene Lesart, keine Zitate; Jahreszahlen der Debatte recherchiert). Auf der Website: `web/mensch-niklas/` (`assets/mensch-niklas-3x4.mp4`, darunter englisch `assets/mensch-niklas-en-3x4.mp4`; 810 × 1080, crf 28, ohne Ton).

1. Die alte Frage (Zeitstrahl 1971–2025, «Immer. Sofort.», «Mensch, Niklas!»); Zwischentitel «Warum ich den Körper … bisher nicht gesucht habe – und warum ich jetzt trotzdem darüber spreche …»;
   «… und dafür zwei Prüfraster entwickelt habe …» (beide Vierfelder ohne Erklärung)
2. «Aber zurück zum Menschen bei Luhmann …»: ich in den Kopplungen von Körper, Bewusstsein, Kommunikation; sogar in der Organisation
3. Die Wende (Computer, Internet, Social Media, KI); der stille, nicht wahrgenommene Körper (gemessen statt gespürt)
4. Nebeneinander, Nacheinander als Kette in sechs Bildern bis zur Pointe Karen Barad; «Beschrieben ≠ gehört»; der Verteilapparat; zwei Beispiele
   («Scheininvalide», Recht auf Nichterreichbarkeit); in Theorien kaum Körperereignisse; ich im Feld (LLMs, soziale Medien)
5. The story so far … – Fortsetzung folgt; Outro

**Englische Fassung** (`MenschVideoEN`, gut drei Minuten zwanzig, Wunsch vom 7. Oktober 2026): gleiche Grafik, Texte aus `texte.ts` (`TEXTE.en`),
eigene Zeitachse `zeitplan("en")`. Die politischen Beispiele sind als Schweizer Kontext ausgewiesen («Two examples from Switzerland»).
Zusätzliche Szene «Meanwhile in England» nach den Beispielen: Studien zum (Nicht-)Gehörtwerden der Körper von Menschen mit Lernbehinderung
(Mencap 2007, CIPOLD 2013, PHE 2015 / STOMP 2016, LeDeR 2023; «diagnostic overshadowing»), Belege im Kopf von `texte.ts`.
Seit dem 7. Oktober 2026 zeigt auch die deutsche Fassung die Szene («Unterdessen in England»; Schild der Fälle «Zwei Beispiele aus der Schweiz»).
**Spanische Fassung** (`MenschVideoES`, gut drei Minuten dreissig, 7. Oktober 2026): wie die englische (Schweizer Kontext, Szene «Mientras tanto, en Inglaterra»),
Texte `TEXTE.es`, Zeitachse `zeitplan("es")` mit etwas mehr Lesezeit; der Stempel «DIAGNOSTIC OVERSHADOWING» bleibt als Fachbegriff englisch.

## «wachstum» – Linienwachstum spielt ornament.cloud (9. Oktober 2026)

36 s, **1 : 1** (1080 × 1080, `WachstumVideo`), ohne Ton und ohne Text. Nachbau eines Processing-Sketches zu «differential line growth»:
Punkte einer geschlossenen Linie stossen sich ab (`minNodeDist` 15), eine Feder zieht jeden zum nächsten, zu lange Kanten teilen sich,
eine Grenze drückt die Linie nach innen. Quelle `src/wachstum/` (`Wachstum.ts`, `Formen.ts`, `Video.tsx`), keine Daten aus der Website.

0. Intro: Signet kurz, **ohne Kopfzeile** (eigener Wrapper in `Video.tsx`, die Vorlage bleibt unverändert)
1. Das Ornament in der Wolke (10 s): ein Ring aus 30 Punkten wächst zum Labyrinth in einer atmenden Wolke (Kreise, flacher Boden); ihr Umriss im Rot-Orange, zum Schluss zieht sie ab
2. Die Zeichen (17 s): 14 kleine Ringe, einer je Zeichen von «orna / ment. / cloud» (Instrument Sans 700, dreizeilig, damit die Zeichen gross genug für das Muster sind),
   wachsen nacheinander in Leserichtung; Grenze ist die Form des Zeichens (Abstandsfeld der Schrift), der Punkt im Rot-Orange
3. Outro: Signet in voller Länge

**Zwei Änderungen am Sketch**, ohne die er nicht wächst: Mit `maxEdgeLength = 12` wird nie geteilt (der Abstand stellt sich bei 0,6 · `minNodeDist` = 9 ein, die Linie bleibt ein Ring von 30 Punkten),
und unter 9 teilt jede Teilung die nächste aus (über 12 000 Punkte in 150 Schritten). Darum liegt `maxEdge` bei 8, und je Schritt werden nur so viele Kanten geteilt (zufällig unter den zu langen,
fester Startwert), wie das Punktziel des Rings verlangt. Die Zeichen sind halb so gross gerechnet wie die Wolke (`minDist` 7,5). Alles ist deterministisch; wer ein früheres Bild verlangt, rechnet von vorn.

`npx remotion render WachstumVideo out/wachstum.mp4 --codec=h264 --crf=20`, danach nach `yuv420p` umwandeln (siehe unten).

### Startanimation der Website (9. Oktober 2026)

Seit dem 18. Oktober 2026 nicht mehr auf der Website: das Intro ist die Irrfahrt aus PHORMA III (`assets/start-intro.mp4`, `tools/phorma-intro.mjs`); die Dateien `assets/start-animation*.mp4` sind im Verlauf von Git.

Wunsch von Christian nach dem Video «wachstum»: nur die Zeichen (Sekunden 13–30 davon), ohne Wolke, ohne Intro und ohne das Signet am Ende; erst 1,4-mal so schnell, dann auf 11 Sekunden gekürzt (17 s → 11 s, gut 1,5-mal so schnell).
Compositions `StartAnimation` (hell, Farben der Website) und `StartAnimationDunkel` (dunkel: Grund `#171614`, Linie `#ece8e1`, Punkt `#f08a5d`, wie `styles.css` im dunklen Modus), beide 1080 × 1080, 330 Bilder.
Dieselben Rechenschritte wie im Video, nur dichter (`TEMPO_START` = 510 / 330 Schritte je Bild gegenüber dem Video «wachstum»); das fertige Wort steht von etwa 8,7 s bis 10,3 s, dann blenden die Zeichen in 20 Bildern aus (`AUS_START`, Wunsch vom 9. Oktober 2026),
und die Seite blendet den leeren Grund in die Startseite über. Sie läuft auf der Startseite vor dem Inhalt (siehe README im Hauptordner).

```bash
cd src/videos && npm run render:start        # out/start-hell.mp4 und out/start-dunkel.mp4 (Vollbereich, crf 18)
# für das Web: in den Bereich tv und BT.709 umrechnen, 3 MB statt 15 MB (Grund bleibt auf ±1 Stufe gleich wie die Seite)
ffmpeg -i out/start-hell.mp4 -vf "scale=in_range=pc:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,format=yuv420p" \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv -c:v libx264 -crf 28 -preset slow -movflags +faststart -an ../../assets/start-animation.mp4
# dunkel ebenso mit out/start-dunkel.mp4 nach ../../assets/start-animation-dunkel.mp4
```

## Rundgang durch ornament.cloud (22. Oktober 2026)

49,5 s, **9:16** (1080 × 1920, `RundgangVideo`), ohne Ton, im Stil des ORNA-Videos. Ein Rundgang durch das Menü der Website, Szene für Szene ein Kästchen.
Das Menü ist eine durchgehende Ebene: erst gross in der Mitte, ab «Apps» unten und kleiner, das Kästchen der Szene aktiv (kräftiger Rand, wie `aria-current` auf der Website).
Die Symbole kommen aus `kopfleiste.js` und zeichnen sich mit `pathLength`. Nur als Datei, nicht auf der Website.

0. Intro mit «ornament.cloud» und «apps • prompts • zettel»
1. «Beobachtung ist Anlass für Veränderung in der Realität.» (Beschreibung der Startseite), die fünf Kästchen bauen sich auf
2. Apps: Lead der Seite, die drei Gruppen mit ihren Apps
3. Prompts: Lead von «Masterprompts», die vier Prüfraster
4. Zettel: Titel und Beschreibung des Zettelkastens, das Raster 7 × 7 nach Zyklen, die Zählzeile; der erste Zettel leuchtet auf
5. Der Zettel «Die Brücke» als Karteikarte: Kennzeile, Titel, Schlusssatz, Weiterdenken (vier Verweise)
6. Social: Lead der Seite, grosses Symbol
7. Art: Lead der Seite, grosses Symbol
8. Outro: Signet

`daten.mjs` bricht ab, wenn sich ein Text auf der Website nicht mehr findet, und prüft die Kennzeile des Zettels gegen seine Seite.
`npx remotion render RundgangVideo out/rundgang.mp4 --codec=h264 --crf=20`, danach nach `yuv420p` umwandeln (siehe unten).

## «neubau» – ornament.cloud/b/ (22. Oktober 2026)

51,7 s, **9:16** (1080 × 1920, `NeubauVideo`), ohne Ton. Wunsch: ein Video zur neuen Website `/b/`, mit den Skills für Animation und Video, ohne den Stil der ORNA-Videos.
Darum **ohne die Vorlage** (`src/vorlage/`): eigene Gestaltung nach `b/b.css` (Papier und Tinte, die Blaupause `#1d3fd6` als einziger Akzent, Instrument Sans für Titel,
Newsreader für den Zettelkasten, Haarlinien statt Kästen), das Signet als Re-entry-Schlaufe mit blauem Punkt nach `src/b/tafeln.mjs`. Gebaut nach den Remotion-Skills:
jede Szene in `src/neubau/szenen/` und als eigene Composition im Ordner «Neubau-Szenen» (Root.tsx), verbunden mit `TransitionSeries` (`@remotion/transitions`, Blenden von 15 Bildern).
Über den Szenen die Kopfzeile des Neubaus (`Kopf.tsx`): Signet, «ornament.cloud», die Hauptnavigation; der Punkt der Szene ist blau unterstrichen.
`daten.mjs` liest Farben aus `b/b.css`, Texte aus `src/b/inhalt.mjs` und `src/b/ui.mjs`, die Zeichen aus `src/b/zeichen.mjs`, die Fäden aus `b/index.html` und den Zettel aus `zu-seiner-zeit/zsz-daten.json`.

1. Auftakt: das Signet zeichnet sich, der Punkt läuft, darunter «ornament.cloud»
2. Einstieg: «Gestalten, vermitteln, kuratieren.» Wort für Wort, der erste Satz des Leads, das atmende Signet
3. Die vier Leistungen mit ihren Zeichen (Navigation: Angebot)
4. «Theorie, die man anfassen kann.» und der Satz dazu
5. Der Zettelkasten: das Feld 7 × 7, die 18 Fäden wachsen; dann Zettel 1 aktiv, «Die Brücke» mit Leitsatz (Navigation: Zettel)
6. Prüfraster: die vier Raster mit Stand (Navigation: Raster)
7. Spielen: die sieben Apps (Navigation: Apps)
8. Schluss: Signet, «ornament.cloud», «Beobachtung ist Anlass für Veränderung in der Realität.»

`npx remotion render NeubauVideo out/neubau.mp4 --codec=h264 --crf=20`, danach nach `yuv420p` umwandeln (siehe unten).

## Reel «Was bringst du mit?» (22. und 23. Oktober 2026)

41,3 s, **9:16** (1080 × 1920, `ReelVideo`; mit dem anderen Logo `ReelVideoLogoIII`), ohne Ton.
Seit dem 23. Oktober 2026 auch in **4:5** (1080 × 1350, `ReelVideo45`), **1:1** (1080 × 1080, `ReelVideo11`) und **16:9** (1920 × 1080, `ReelVideo169`),
Wunsch: «nun bitte noch eine Version 4:5 (Hochformat), 1:1 und 16:9 Querformat». Nicht skaliert oder beschnitten: `src/reel/Format.tsx` hält je Format ein Raster
(Textspalte, Bildfläche, Fläche der Aufnahmen, Lage der Unterzeile, Mitte, Lage des Logos), alle Szenen lesen es über `useLage()`. Die Hochformate stapeln
(Schlagzeile oben, höchstens etwa neun Schriftgrössen breit, damit sie überall gleich umbricht); 16:9 hat zwei Spalten, links der Text senkrecht mittig
(mit Unterzeile, Konstellation, Zettel), rechts Aufnahme, Rad, Telefon oder Feld; «Was bringst du mit?» steht dort auf zwei Zeilen. `ReelVideoLogoIII` gibt es nur in 9:16.
**Englisch** (seit dem 23. Oktober 2026, Wunsch: «Bitte beide auch in englisch»): `ReelVideoEN` (9:16) und `ReelVideo169EN` (16:9). `daten.mjs` schreibt `data/reel.json` und
`data/reel-en.json`, die Szenen holen ihre Texte über `useDaten()` (`src/reel/Sprache.tsx`). Frage, Titel, Wege, Apps, Leistungen, «no cookies …», der Zettel
(«Note 24», Titel und Leitsatz wie unter `/b/en/`, geprüft) und die Frage der Konstellation kommen aus `/b/en/` (`inhalt.en.mjs`, `UI.en`, `ladeZettel("en")`,
`constellations.en.js`); die fünf Sätze hat Claude übersetzt (`ANTWORTEN.en`: «An image that seeks movement», «A sound you can see», «A question that seeks a counterpart»,
«An idea that comes into the world», «A concept that seeks connection»). Das Telefon zeigt die englische Startseite: einmal `NODE_PATH=$(npm root -g) node src/reel/aufnahme.mjs en`
(→ `public/reel/b-telefon-en.png`, `b-stellen-en.json`). «What do you bring along?» hat fünf Wörter: der Auftakt zeigt fünf Einzelwörter, im Querformat zwei Zeilen. Wunsch: «nicht bloss eine Aufzählung sondern ein professionelles Werbe-Reel, ohne ‹art› … sei kreativ».
Ein Werbefilm für `/b/`, gebaut um die Frage der Startseite, fünf Antworten mit je eigener Bildwelt; Papier und Tinte kippen bei jedem Schnitt (echte Umkehr wie hell und dunkel auf der Seite),
harte Schnitte auf einem Schlag von 0,5 s (`TAKT`), damit sich Musik mit 120 Schlägen je Minute darunterlegen lässt. Keine Werke und Prints.
Gestaltung aus `src/neubau/Teile.tsx`; jede Szene in `src/reel/szenen/` und als Composition im Ordner «Reel-Szenen».
**Antworten und Sätze seit dem 23. Oktober 2026 von Christian** («Einen Klang …» und «Einen Begriff …» im Akkusativ wie die Antwort auf die Frage) («Damit es sprachlich passt zu ‹Was bringst du mit?›»; `ANTWORTEN` in `daten.mjs`, nicht mehr die Wahlen des Dialogs der Startseite);
die Szene «Eine Gruppe» (OMNA COLOR) ist damit entfallen.

1. Tinte: «Was», «bringst», «du», «mit?» je allein und bildfüllend auf den Schlag, dann die ganze Frage als Block, das Fragezeichen in der Blaupause
2. Papier: die Antworten als Walze zwischen zwei Haarlinien (ein Bild, einen Klang, eine Frage, eine Idee, einen Begriff); sie bleibt auf «ein Bild» stehen, blau unterstrichen
3. Tinte: «Ein Bild, das Bewegung sucht» – PHORMA I (Glaskörper), PHORMA II (Rasterdruck, dann Montage), PHORMA I (Scherben)
4. Papier: «Einen Klang, der sich sehen lässt» – PHORMA III (Traube, Irrfahrt mit einem und mit drei Würfeln)
5. Tinte: «Eine Frage, die ein Gegenüber sucht» – die lebende Tafel von ORNA dreht, die Begegnung leuchtet; dann rückt das Rad nach oben und die Konstellation
   steht darunter: Doris Salcedo × George Spencer-Brown, «Kann eine Grenze erinnern?» (aus den Daten von ORNA; Wunsch: «ORNA könnte auch noch eine Konstellation zeigen»)
6. Papier: «Eine Idee, die in die Welt kommt» – ein Telefon kippt ins Bild und blättert durch die echte Startseite bis zu den vier Leistungen (Unterzeile «Angebot»)
7. Tinte: «Einen Begriff, der Verbindung sucht» – der Zettelkasten: das Feld 7 × 7 mit den Fäden der Startseite, ein Zettel leuchtet auf, der mit dem kürzesten Leitsatz
   unter denen mit mindestens zwei Fäden (zurzeit Zettel 24, «Die Irritation»), darunter Titel und Leitsatz (`szenen/Zettel.tsx`)
8. «Gestalten, vermitteln, kuratieren.» in drei Schlägen, Komma und Punkt in der Blaupause (Schriftgrösse nach der Wortlänge, damit das Komma im Bild bleibt)
9. Tinte: «keine Cookies, keine Werbung, keine Tracker», «made in Switzerland»
10. Tinte: eine Logo-Animation von Christian, der Punkt in die Blaupause gedreht (`hue-rotate`), am Ende stehend; darunter die Frage, blau unterstrichen.
    Standard (`ReelVideo`): **PHORMA II**, seit dem 23. Oktober 2026 erst ab Bild 92 der Aufnahme, wenn die Montage vorbei und der Grund schwarz ist
    («Vor der Logo Animation hängt noch eine Montage-Sequenz: die kann weg»): die Rahmen werden zum Signet; das Bild fährt auf das Logo zu (1,3-fach) und wird heller
    (`brightness(1.4) contrast(1.25)`, erst danach `hue-rotate`, sonst brennt der Punkt türkis aus). Ab Bild 150 blendet eine Vektorzeichnung desselben Logos darüber
    (`src/reel/LogoVektor.tsx`: die Zeichnung aus `alpha/sketchory/signet.js`, gegen Bild 162 der Aufnahme deckungsgleich geprüft, Schriftzug ohne Kerning wie auf der Leinwand);
    der Punkt läuft dann scharf weiter. Fassung `ReelVideoLogoIII`: **PHORMA III** – die Fäden ziehen sich zur Schlaufe, «ornament.cloud» tippt sich (hochkant die Mitte; ab Bild 160 stehend).

Die Tafeln kommen aus `src/b/tafeln.mjs` und werden je Bild um 1/30 s weitergerechnet (`LebendeTafel` in `src/reel/Teile.tsx`, deterministisch).
Die Aufnahme der Seite macht `src/reel/aufnahme.mjs` (Playwright, 430 px, doppelte Dichte → `public/reel/`), einmal vor `npm run vorbereiten`:

```bash
cd src/videos
NODE_PATH=$(npm root -g) node src/reel/aufnahme.mjs
npx remotion render ReelVideo out/reel.mp4 --codec=h264 --crf=18   # danach nach yuv420p umwandeln (siehe unten)
```

**Sechs Aufnahmen von Christian** liegen nicht im Repository (zusammen gut 70 MB); vor dem Rendern von Hand nach `public/reel/` legen:
`phorma-iii-lauf.mp4` (PHORMA III, 1080 × 1350, Export vom 21. Oktober 2026, 21:08), `phorma-i-lauf.mp4` (720 × 900, als «PHORMA ii» geschickt, zeigt aber den Ablauf «Verwandlung» von PHORMA I)
`phorma-iii-traube.mp4` (PHORMA III, Traube, 1080 × 1350, Export vom 23. Oktober 2026, 08:37), `phorma-ii-raster.mp4` (PHORMA II, Raster und Montage, 1080 × 1350, 08:44)
sowie die Logo-Animationen `phorma-ii-logo.mp4` (1080 × 1350, Export vom 21. Oktober 2026, 21:55) und `phorma-iii-logo.mp4` (1920 × 1080, Export vom 19. Oktober 2026, 14:10).
`daten.mjs` bricht ab, wenn eine fehlt.

Die Tafeln kommen aus `src/b/tafeln.mjs` und werden je Bild um 1/30 s weitergerechnet (`LebendeTafel` in `src/reel/Teile.tsx`, deterministisch).
Die Aufnahme der Seite macht `src/reel/aufnahme.mjs` (Playwright, 430 px, doppelte Dichte → `public/reel/`), einmal vor `npm run vorbereiten`:

```bash
cd src/videos
NODE_PATH=$(npm root -g) node src/reel/aufnahme.mjs
npx remotion render ReelVideo out/reel.mp4 --codec=h264 --crf=18   # danach nach yuv420p umwandeln (siehe unten)
```

## Rendern ohne Internetzugang zu remotion.media

Remotion lädt sonst einen eigenen Browser herunter; stattdessen einen vorhandenen angeben:
`npx remotion render OrnaVideo out/orna-erklaervideo.mp4 --codec=h264 --crf=20 --browser-executable=/pfad/zu/headless_shell`.
Für Instagram und WhatsApp danach mit ffmpeg nach `yuv420p` umwandeln:
`ffmpeg -i out/orna-erklaervideo.mp4 -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart orna-erklaervideo.mp4`.
