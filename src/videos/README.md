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
  untitled/           «Untitled»: Cézanne zerfällt, Karussell, Strudel, Jet-Ski; Film aus Seedance (24. Oktober 2026)
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

## «Untitled» – Cézanne, Rothko, Kapoor, Holzinger (24. Oktober 2026)

39 s: Intro mit «Untitled» und «Cézanne • Rothko • Kapoor • Holzinger» (3 s), ein mit Seedance erzeugter Film (30 s, aus dem Grund ein- und ausgeblendet), Outro (6 s).
Im Film zerfällt Cézannes «Montagne Sainte-Victoire» in Farbflächen, daraus wird ein Karussell von Farbfeldern, das in einen schwarzen Strudel im Galerieboden abfliesst; auf dem Strudel fährt eine anonyme Performerin Jet-Ski.
Der Prompt (und warum Rothko und Kapoor nicht genannt sind und die Fahrerin anonym bleibt) steht in `src/untitled/seedance-prompt.md`.

Der Film ist nicht eingecheckt: den Clip von Seedance (720 × 1280) mit dem Skill `video-hochrendern` auf 1080 × 1920 bringen und als `public/untitled/clip.mp4` ablegen, dann
`npx remotion render UntitledVideo out/untitled.mp4 --codec=h264 --crf=20` und nach `yuv420p` umwandeln (siehe unten). Ohne Ton: der Clip wird stumm eingebunden.

## «Wissen» – der Obsidian-Tresor als Netz (27. Oktober 2026)

Wunsch: «ein spektakulären video, das den aktuellen stand meiner obisidian inhalte zeigt, ca 90 sekunden inklusive kleine (lab) intro und outro».
4:5 (1080 × 1350), etwa 86 s, ohne Ton, nur als Datei (nicht auf der Website). Composition `WissenVideo`, Quellcode `src/wissen/`.

- **Look des Labs** statt der Vorlage: schwarzer Grund, die Re-entry-Schlaufe mit dem blauen Punkt und «ornament.lab» als Intro und Outro (`LabSignet.tsx`,
  wie das Intro der Landing-Page `beta/lab/`), je Bereich eine Farbe (`farben.ts`). Die Vorlage (`vorlage/`) bleibt unverändert.
- **Daten** (`daten.mjs` → `data/wissen.json`, nicht eingecheckt) aus Christians Tresor «Wissen» (neben dem Repository unter
  `Documents/GitHub/Wissen`, sonst Umgebungsvariable `WISSEN`): jede Notiz, jeder Link `[[…]]`, die Bereiche nach Ordnern, der Stand aus dem
  letzten Commit des Tresors, zwei Anordnungen des Netzes aus einer Kraftsimulation mit festem Startwert. Auszüge sind der Leitsatz einer Notiz,
  wörtlich, nur mit «[…]» gekürzt und gegen den Text geprüft. Fehlt der Tresor (Cloud-Sitzung), überspringt das Skript ihn.
- **Szenen:** Intro mit «Wissen» und dem Stand · das Netz entsteht (Notizen und Verbindungen zählen mit) · die Bereiche · vier Werke (ORNA,
  Formen der Zeit, Zu seiner Zeit – Zyklus I, Prüfraster – Übersicht) · drei Konzepte mit ihren Quellen (Zeit und Eigenzeit, Kontingenz und
  Anschlussüberschuss, Zukunft als Überschuss) · die fünf meistverlinkten Notizen · das ganze Netz · Outro. Jede Station steht so lange, wie ihr
  Auszug zum Lesen braucht (1 s je 4 Wörter, dazu 2 s).
- «Verbindungen» im Zähler sind die Verweise (jedes `[[…]]` auf eine Notiz des Tresors); bei einer Station steht die Zahl der verknüpften Notizen.

```bash
cd src/videos && node vorbereiten.mjs
npx remotion render WissenVideo out/wissen.mp4 --codec=h264 --crf=20 --pixel-format=yuv420p
```

## «Fahrt» – 360°-Kamerafahrt um ein Bild als 3D-Modell (27./28. Oktober 2026)

Wunsch: «eine 360 grad kamerafahrt um das portrait» (Bild aus Christians Ordner KUNST). 4:5 (1080 × 1350), 18,5 s, ohne Ton, nur als Datei.
Composition `FahrtVideo`, Quellcode `src/fahrt/`: Lab-Intro (`wissen/LabSignet.tsx`), eine Umdrehung aus 300 Einzelbildern, Lab-Outro.

- **Modell** (`modell/modell.py`, kostenlos auf Hugging Face mit dem Token aus `hf auth login`, nach `data/<verfahren>.glb`, nicht eingecheckt):
  `trellis` (Form und Textur, weich; am besten gefallen, aber deutlich schwächer als eine Kamerafahrt aus ChatGPT/Descript),
  `hunyuan` (nur Form, am feinsten; die Textur übersteigt die Gratis-GPU-Zeit), `sf3d` (Textur, flach wie eine Maske, hinten ein zweites Gesicht).
- **Fahrt** (`modell/render.mjs` mit `modell/fahrt.html`): Three.js 0.185.1 in Chromium ohne Grafikkarte; Raumlicht, die Lichter fahren mit der Kamera,
  Grund #242424 (auf Schwarz verschwinden dunkle Teile). `MATERIAL=gips` für ein Modell ohne Textur, `MATERIAL=matt` nimmt SF3D das Metall.
- `probe` rendert erst acht Winkel zum Anschauen (`data/probe-<verfahren>/`), `fahrt` dann die 300 Bilder nach `public/fahrt-<verfahren>/`.

```bash
cd src/videos/src/fahrt/modell
py -P modell.py trellis pfad/zum/bild.png
THREE=…/node_modules/three NODE_PATH="$(npm root -g)" node render.mjs probe trellis
THREE=…/node_modules/three NODE_PATH="$(npm root -g)" node render.mjs fahrt trellis 0   # Startwinkel: wo das Gesicht zur Kamera schaut
cd ../../.. && npx remotion render FahrtVideo out/fahrt.mp4 --props='{"ordner":"fahrt-trellis"}'
```

## «Eigenzeit» – die Zeitfigur aus ORNAMENT FORMEN (27. November 2026)

Wunsch: «eine animation, 42 sekunden mit der zeitfigur bei den formen. genug bewegung und entwicklung, damit es interessant zum anschauen ist».
4:5 (1080 × 1350), 42 s, ohne Ton, nur als Datei. Composition `EigenzeitVideo`, Quellcode `src/eigenzeit/`. Szenenplan freigegeben («ja, so machen»).
Das helle Signet-Intro war «zu lasch», dann «bitte alles ohne weissen rahmen. wenn text dann wie die neuen videos von ornament.cloud.
passendes outro»: die Figur füllt das ganze Bild (1080 × 1350) von Anfang an, Schrift wie «Zettel 33 · Das Publikum» (Kennzeile gesperrt im Akzent,
Satz in der Serife, Leitsatz kursiv), Farben Grund #151412, Kreide, Messing; Outro das Signet dunkel mit Messing-Punkt.

- **Figur** (`bild/film.js` mit `bild/film.html`, gerendert von `bild/render.mjs`): dieselbe Rechnung wie `alpha/formen/eigenzeit/eigenzeit.js`
  (Startwert 2471, vier Ringe, Unterschied 70), Bild für Bild nach einem festen Zeitplan (`PLAN`): Koppelung 0 → 0,55 → 1 → 0,4, Beobachter ab 24,5 s,
  Kamera kippt und dreht. Die Rechnung läuft 3,2-mal so schnell wie die Bilder. Fäden und Feststellungen als dünne Stäbe statt Linien (fürs Telefon).
  Ändert sich die Rechnung der Seite, `film.js` nachziehen. three.js und die Bausteine kommen aus `vendor/` und `alpha/formen/gemeinsam.js`.
- **Texte** (`daten.mjs`): unverändert aus der Eigenzeit-Seite, geprüft; der Beobachter-Satz als Auszug mit «[…]».
- **Szenen**: Intro (3 s, die Ringe tauchen auf) · Eigene Rhythmen · Keine Uhr · gekoppelt · aufgegangen · Beobachter · Leitsatz «Wiederkehr ohne Rückkehr» · Outro (Signet dunkel, 6 s).

```bash
cd src/videos/src/eigenzeit/bild
NODE_PATH="$(npm root -g)" node render.mjs probe   # je Szene ein Bild nach ../data/probe/
NODE_PATH="$(npm root -g)" node render.mjs film    # 1080 Bilder (Intro und Film, 1080 × 1350) nach public/eigenzeit/ (rund 15 min)
cd ../../.. && node vorbereiten.mjs && npx remotion render EigenzeitVideo out/eigenzeit.mp4 --codec=h264 --crf=18
```

## «Formenfahrt» – durch die Formen von ORNAMENT FORMEN (27. November 2026)

Wunsch: «mach noch ein anderes, flüssigeres video mit einer fahrt durch verschiedene formen, ohne text (mit intro und outro), ca 45 sekunden».
4:5 (1080 × 1350), 45 s, ohne Text und Ton, nur als Datei. Composition `FormenfahrtVideo`, Quellcode `src/formenfahrt/`. Plan freigegeben.

- **Fahrt** (`bild/film.js`, gerendert von `bild/render.mjs`): Rosette, Fries, Körper, Verflechtung, Wachstum, Reaktion–Diffusion und
  Quasiperiodisch aus `alpha/formen/familien.js` (Startwerte des Katalogs) in einer Reihe, am Schluss die Spur der Eigenzeit (vorab gerechnet,
  Koppelung 0,5). Die Kamera bleibt auf einer Seite der Reihe und fährt auf einer Catmull-Rom-Kurve nach Bogenlänge (gleichmässiges Tempo,
  sanfter Anfang und Schluss); das Ziel gleitet von Form zu Form. Nebel lässt die Formen in der Tiefe verschwinden.
- **Zweite Fassung** («mach die reaktion-diffusion feiner und die formen wachsend und bewegend»): jede Form baut sich auf, während die
  Kamera kommt (Zeichenbereich der Röhren und Flächen, Instanzen der Reihe nach, die Spur von unten), und bewegt sich in sich (Friesbänder in
  eigenen Tempi, atmende Scheibe, Schweben); Reaktion–Diffusion mit `fein: 2` (doppelt feines Raster, Option in `familien.js`).
- **Intro und Outro**: das Signet auf dem dunklen Grund, Punkt in Messing; im Intro «Ornament Formen» in Messing.

```bash
cd src/videos/src/formenfahrt/bild
NODE_PATH="$(npm root -g)" node render.mjs probe   # je Station ein Bild nach ../data/probe/
NODE_PATH="$(npm root -g)" node render.mjs film    # 1080 Bilder nach public/formenfahrt/
cd ../../.. && npx remotion render FormenfahrtVideo out/formenfahrt.mp4 --codec=h264 --crf=18
```

## «Die Mitte» – Wiederholung und Abweichung (27. November 2026)

Zu Christians Text «Reine Wiederholung ist Monotonie und sagt nichts. Reine Abweichung ist Rauschen. Das Ornament hält die Mitte […]» (bis zu
Bridget Riley). Wunsch: ohne Text, mit Intro und Outro; Szenenplan freigegeben. 4:5 (1080 × 1350), 45 s, ohne Ton, nur als Datei.
Composition `MitteVideo`, Quellcode `src/mitte/Video.tsx`, ganz in 2D (SVG), Bild für Bild aus der Bildnummer gerechnet, keine Einzelbilder nötig.

Szenen: Monotonie (starres Raster eines Mäanderhakens) · Rauschen (jedes Motiv springt für sich) · die Mitte (ein Band mit kleinen Abweichungen
im Takt, ein Motiv bricht in Messing aus und fängt sich) · Mäander (die Linie zeichnet sich) · Raum (Rapport als Fries, die Kamera fährt
entlang) · Zeit (das Motiv im Takt, dann ein Triller zweier Zustände) · Streifen und Wellen (eine kleinste Abweichung in Messing setzt das
Feld in Bewegung; nur das Prinzip aus dem Text, kein Werk von Riley nachgebildet). Kreide auf dem dunklen Grund, Abweichungen in Messing,
Intro und Outro das dunkle Signet.

Zweite Fassung («ästhetisch anspruchsvoller»): Linien als Stich (Doppellinie, feste Breite in Bildpunkten), Messing mit Verlauf und Glanz,
warmes Schwarz mit Vignette und Korn über allem. Eine Kamera wechselt die Massstäbe (vom einzelnen Haken zum Feld, ins Fries, hinein in
einen Haken), und die Szenen verwandeln sich ineinander: das Rauschen treibt wie eine Strömung und sinkt zum Band, das Band entrollt sich
zum Mäander, der Mäander öffnet sich Reihe um Reihe zum Fries. Streifen dichter und in wechselnder Breite, zwei Wellen mit Interferenz.
Alles im Takt von 96 Schlägen pro Minute (`SCHLAG`).

```bash
cd src/videos && npx remotion render MitteVideo out/die-mitte.mp4 --codec=h264 --crf=18
```

## Formschleifen – je Formfamilie eine Schleife von 30 s (27. November 2026)

Wunsch: zu jeder der 16 Formfamilien aus ORNAMENT FORMEN ein Video, «lose, intuitiv, künstlerisch und ohne texte», 30 s, «in sich
geschlossen», das sich «aus sich heraus» verwandelt; Thema die ornamentale Kunst allgemein. Freigegeben: 4:5, ohne Signet, nahtlose Schleife,
alle 16 in Paketen zu vier. Kein Remotion: `src/formschleifen/render.mjs` rechnet die Bilder mit `film.html` (three.js, SwiftShader) und setzt
sie mit ffmpeg zusammen. Jedes Formmodul `formen/<form>.js` rechnet aus der Phase p (0 bis 1) statt aus der Zeit, Bild 900 gleicht Bild 0.
Vignette und Korn macht `film.js` im 2D-Bild.

Erstes Paket: `rosette` (fünf Ringe, Blätter, Kordel und Welle treiben aus und legen sich wieder), `band` (Möbiusband aus fünf Streifen in
Messing und Kreide, rollt in sich eine halbe Drehung), `wachstum` (sechsarmige Ranke mit Voluten wächst und zieht sich zurück),
`reaktion-diffusion` (Gray-Scott auf dem Torus: Flecken, Würmer, Labyrinth, Zerfall).

Zweites Paket: `fries` (kannelierte Säule, fünf Bänder gleiten durch Welle, Zinnen, Zickzack, Schlaufen, ein Kreidestrang flicht sich ein),
`flaeche` (Fliesenmuster auf dem Torus von Quadrat über Raute zum Sechseck, Kamerafahrt dicht um den Ring), `koerper` (Ikosaeder in
geodätischem Netz, Stacheln in zwei wandernden Kronen), `raumgitter` (Fahrt um einen Gittervektor durch ein Kristallgitter, das
raumzentriert wird und wieder kubisch; was der Kamera zu nahe kommt, verschwindet).

Drittes Paket (Christian: «etwas mehr bewegung und wachstum/transformation»): `quasiperiodisch` (Relief aus 5, 7, 8, 12 Richtungen wächst
aus der Mitte über die Platte, die sich wölbt und dreht), `aehnlichkeit` (Schnecke als logarithmische Spirale, Zoom um zwei Windungen,
vom Faden zum Gehäuse, vom Wirbel zum Kegel), `sonnenblume` (zusätzlich, weil Christian sich von Schnecke und Sonnenblume viel verspricht:
Phyllotaxis, je Schleife 273 = 13 · 21 neue Kerne, Kuppel, Stacheln, Divergenzwinkel schwankt um den goldenen), `linie` (Lissajousknoten
als Schwellzug, zeichnet sich und löst sich), `volumen` (gedrechselter Körper wächst aus dem Keim, Wülste steigen, Schaft windet sich).

Viertes Paket: `punkte` (70 000 Staubpunkte auf der Superformel, drei Gestalten, dazwischen löst sich der Staub im Wirbel), `verflechtung`
(drei Reife schlagen zum Zopf und lösen sich, innen zwei Kreidestränge gegenläufig), `feld` (drei Quellen und drei Senken kreisen
gegenläufig, die Feldlinien werden je Bild neu gezogen), `gekoppelte-tempi` (Epizykel mit Tempi 1, −3, 5, −7; die Spitze zeichnet eine
Spur, die Radien atmen).

Siebzehnte Schleife `gotische-linie` (zu `docs/gotische-linie.md`): eine einzige Linie löst sich vom Mäander auf dem Ring, verliert
Takt, Zähne, Mitte und Massstab und läuft über das Feld hinaus; die Schablone bleibt als Kreidelinie; drei Federn laufen nach dem
Zwei-Drittel-Gesetz (in der Kurve langsamer), die Linie schwillt in der Kurve an; die Kamera geht vom Überblick in die Nähe einer Feder.

Vorgemerkt (27. November 2026, Christian: «für später merken und mich nach diesen 16 videos daran erinnern»): nach dem vierten Paket an
cinecode (github.com/sarpstar/cinecode, MIT) erinnern. Drei Möglichkeiten: `scripts/qc.py` zum Prüfen (Schleifennaht, Aufblitzer,
Standbilder; ausführen braucht seine Erlaubnis), Bildveredelung nach ihrem Finish (Bloom, Lichthof, Filmkorn) selbst nachgebaut, leiser
Ton je Form mit Web Audio. Empfehlung: die Bildveredelung.
Ebenfalls vorgemerkt: every-frame-is-code («motion-kit», github.com/kiselas/every-frame-is-code, MIT), eine Wissenssammlung für
Grafik in Code (jedes Bild eine reine Funktion der Zeit): Bewegung und Easing, Übergänge, Montage, Effektrezepte, three.js mit Bloom,
Prüfen mit Kontaktbogen, Ton im selben Takt, Pixel/Retro und Demoszene; dazu `render/analyze.mjs`, das Schnitte und Tempo eines fremden
Videos misst. Für uns am ehesten: Übergänge, Effektrezepte, Analyse von Vorbildern.
Ebenfalls vorgemerkt: cinematic-video-skill (github.com/mylxsw/cinematic-video-skill, MIT), ein Claude-Code-Skill für erzählende
Motion-Graphics-Filme mit Remotion (wie unsere Vorlage): Ablauf Brief → Recherche → Akte → Szenen → Musik → Prüfen → Rendern; eine
`timeline.json` steuert Bild und Musik zugleich, Musik mit numpy synthetisiert, eine Prüfung im Browser meldet abgeschnittenen oder
überlappenden Text. Für uns am ehesten: die Textprüfung für die Zettel-Videos und die Musik aus derselben Zeitleiste.
Ebenfalls vorgemerkt: video-motion-craft (github.com/vibegameengine/video-motion-craft, MIT/Apache-2.0), ein Claude-Code-Skill für
Bewegungsgestaltung mit Remotion und Schnitt echter Aufnahmen mit FFmpeg und Whisper. Kern sind Regeln aus echten Überarbeitungen
(«langsamer, länger stehen lassen», keine gleichzeitigen Auftritte, kein reines Ein- und Ausblenden), 157 benannte Techniken, Schnitt auf
Musik bis auf drei Bilder genau, Tongestaltung und eine Abnahmeliste mit Bildnummern. Für uns am ehesten: die Bewegungsregeln und die
Abnahmeliste für die Zettel-Videos, der Musikschnitt für Videos mit Christians Tracks.
Ebenfalls vorgemerkt: escapement (github.com/Leonxlnx/escapement, MIT), kein Werkzeug, sondern ein Beispielfilm von 36 s: Claude Code
steuert Blender 5.2 ohne Oberfläche aus Python, alles (Zahnräder, Auto, Schlucht, Tempel) in Code erzeugt, ein Agent je Akt und ein
Regie-Agent, der kritisiert. Lehrreich: `tools/exposure_check.py` (misst ausgefressene Lichter, flaue Schwärzen, matte Farben),
`tools/edit.py` (Übergänge, Farbkorrektur, Lichthof, Korn mit numpy und ffmpeg), Schnitt auf 120 BPM. Für uns am ehesten: Blender als
zweiter Weg für Bilder mit echtem Licht (Pfadverfolgung statt WebGL) und die Belichtungsmessung.

```bash
cd src/formschleifen
NODE_PATH=$(npm root -g) node render.mjs rosette probe   # neun Bilder nach out/formschleifen/probe-rosette/
NODE_PATH=$(npm root -g) node render.mjs rosette film    # 900 Bilder, dann out/formschleifen/rosette.mp4 (rund 10 min)
```

## «Reise» – durch den Zettelkasten und ORNA (28. Oktober 2026)

Wunsch: «eine weitere obsidian animation als video: diesmal eine reise durch orna und den zettelkasten: mit begriffen, verweise, quellen und namen»,
«in der obsidian ästhetik mit viel bewegung, aber auch lesbarkeit», ohne den eigenen Namen. Etwa 94 s, ohne Ton, nur als Datei.
Drei Formate aus derselben Zeitachse: `ReiseHoch` (9:16, 1080 × 1920), `ReiseVideo` (4:5, 1080 × 1350), `ReiseQuer` (16:9, 1920 × 1080). Quellcode `src/reise/`.

- **Look** der Graphansicht von Obsidian: dunkler Grund, ruhende Punkte gedämpft, Beschriftung unter dem Punkt, die aktive Notiz und ihre Nachbarn leuchten,
  alles atmet leise. Farben aus der Palette des Neubaus: Strophen weiss, Werke Senf, Namen Blaupause, ORNA Rosa, Zyklen Tannengrün, die Spur Rot.
  Intro und Outro wie bei «Wissen» (`wissen/LabSignet.tsx`, im Querformat verkleinert).
- **Daten** (`daten.mjs` → `data/reise.json`): Zyklen, Strophen, Kernsätze und Verweise («Name, Werk») aus `src/data/zu-seiner-zeit.json`, die Personen aus
  `zu-seiner-zeit/zsz-daten.json`, ORNA aus `portfolio/nebeneinander-nacheinander/js/data/`. Knoten Zyklus, Strophe, Werk, Name; ein Name aus beiden Werken ist
  ein Knoten (19 Brücken). Anordnung aus einer Kraftsimulation mit festem Startwert, ORNA als Doppelrad daneben.
- **Spur**: sieben Stationen, jede über echte Kanten (das Skript prüft sie): 1 Die Brücke → über das Werk von Karen Barad → 28 Die Koppelung → über Karen Barad →
  Mona Hatoum × Karen Barad → über Mona Hatoum → 22 Die Grenze → über Susan Leigh Star → On Kawara × Susan Leigh Star → über On Kawara → 2 Das Ereignis →
  über das Werk von Whitehead → 49 Die Zukunft. Bei einer Strophe stehen Begriff, Kernsatz und die vier Verweise, bei einer Konstellation die Frage und die Strophen des Brückennamens.

```bash
cd src/videos && WISSEN=… node vorbereiten.mjs   # ohne Tresor fehlt data/wissen.json, und Root.tsx lässt sich nicht bündeln
npx remotion render ReiseHoch out/reise-9x16.mp4 --codec=h264 --crf=20 --pixel-format=yuv420p   # ebenso ReiseVideo (4:5) und ReiseQuer (16:9)
```

## Suchaufträge – weitere Reisen durch Zettelkasten und ORNA (seit 29. Oktober 2026)

Wunsch: «weitere "Reisen" durch den Zettelkasten und ORNA im Obsidian-Stil … statt der Titelsequenz eine Animation des Zettelkastens (Punktkugel, Gitter, Raster)
wie im ersten Teil des Intros des ornament lab, danach den jeweiligen "Suchauftrag" … 90–120 Sekunden, 4:5 und 16:9».
Dasselbe Video wie «Reise» (`src/reise/Video.tsx`) mit dem Parameter `auftrag`; die Aufträge stehen in `AUFTRAEGE` in `src/reise/daten.mjs`.

- **Stationen von Hand, Wege vom Skript:** Eine Station ist eine Strophe (`{ strophe: 36 }`) oder ein ORNA-Paar (`{ orna: [Künstler:in, Theoretiker:in] }`).
  Den Weg dazwischen sucht `daten.mjs` als kürzesten über echte Kanten (Werke, Namen, Konstellationen; erst wenn es keinen gibt, über den Zyklus) und
  beschreibt ihn («über On Kawara · Judith Butler»). ORNA-Stationen zeigen die Praxis (den ersten Satz der Konstellation) und die Frage.
- **Adressen:** `FRAUEN` und `MAENNER` ordnen jeden Namen einer Spur ein; das Skript bricht ab, wenn ein Name fehlt oder weniger als die Hälfte weiblich ist.
- **Intro** (`src/reise/ZettelIntro.tsx`, 280 Bilder): Punktkugel → Box mit Lichtweg → Feld 7 × 7 aus dem Intro von `beta/lab/`, als Funktion der Zeit.
  Das Feld sind die 49 Strophen (Zeilen = Zyklen); die Ziele leuchten rot, die Umwege weiss, die Spur verbindet sie in der Reihenfolge der Reise.
- **1. Auftrag `profil`** «Vom Profil zum Feed zur Plattform», mit Umwegen über Ereignis, Person und Archiv: 36 Das Profil · Hanne Darboven × Elena Esposito ·
  2 Das Ereignis · 17 Die Person · Louise Bourgeois × Judith Butler · 13 Das Archiv · 41 Der Feed · Marina Abramović × Wendy Hui Kyong Chun · 42 Die Plattform.
  16 von 28 Adressen weiblich, 119,7 s. Compositions `ProfilVideo` (4:5) und `ProfilQuer` (16:9).
- **2. Auftrag `koerper`** «Vom Körper zum blinden Fleck zum Material zur Kunst», ORNA frei gewählt, **nicht über dasselbe Werk** (`gleichesWerk: false`):
  25 Der Körper · Mona Hatoum × Susan Leigh Star · 5 Der blinde Fleck · Agnes Martin × George Spencer-Brown · Eva Hesse × Karen Barad · 29 Das Material ·
  Doris Salcedo × Hannah Arendt · 35 Die Kunst. 14 von 22 Adressen weiblich, 114,7 s. Compositions `KoerperVideo` (4:5) und `KoerperQuer` (16:9).
  Die Suche ohne dasselbe Werk (`ohneGleichesWerk`) verbietet Strophe → Werk → Strophe und Werk → Name → Werk mit demselben Titel (dasselbe Werk, anders
  zitiert); ein Schritt über den Zyklus kostet 2, alle anderen 1.

```bash
cd src/videos && node src/reise/daten.mjs
npx remotion render ProfilVideo out/profil-4x5.mp4    # ebenso ProfilQuer (16:9)
```

### Fassungen «organisch» und «Gewebe» (Tests vom 29. Oktober 2026, noch nicht der Standard)

Wunsch: «wie die verbindungen noch etwas organischer wirken könnten … das ganze video darf gerne eine art digitales kunstwerk sein», dann «etwas neuronales»
und «ein viel organischeres netzwerk … mehr ein gewebe, nicht einfach pünktchen … differenzierter als beim PHORMA III effekte». Schalter am Video: `organisch`, `gewebe`.

- **organisch** (`KoerperOrganisch`, `KoerperOrganischQuer`): Verbindungen als langsam schwingende Kurven, die Spur als weicher, leuchtender Bogen, Lichtpunkte an der
  Station; neuronal: spontane Impulse auf jeder dritten Verbindung, an der Station eine Welle über zwei Schritte mit Blitz an den Knoten. Ohne Zahlen und Listen
  in Intro, Aufbau und Schluss.
- **Gewebe** (`KoerperGewebe`, `KoerperGewebeQuer`, `src/reise/Gewebe.tsx`): WebGL 2 ohne Bibliothek, darüber das SVG (Beschriftung, Spur) mit derselben Projektion.
  Jede Verbindung ein Band aus 4–16 Fasern, an den Enden zu Knoten gezogen, in der Mitte offen, verdreht und flatternd; die Farbe läuft entlang der Faser,
  die Leuchtkraft je Faser sehr verschieden; an der Station spannt sich das Band, Impulse laufen als Licht durch die Fasern. An der Station treten die übrigen
  Namen zurück, die gewählten stehen gross und zuoberst. Schrift Inter Display (`src/reise/schrift.ts`, im Stil von Helvetica Now; `vorbereiten.mjs` kopiert sie).
  Rendern mit `--gl=angle`, etwa 4 Minuten je 40 s.

## Rendern ohne Internetzugang zu remotion.media

Remotion lädt sonst einen eigenen Browser herunter; stattdessen einen vorhandenen angeben:
`npx remotion render OrnaVideo out/orna-erklaervideo.mp4 --codec=h264 --crf=20 --browser-executable=/pfad/zu/headless_shell`.
Für Instagram und WhatsApp danach mit ffmpeg nach `yuv420p` umwandeln:
`ffmpeg -i out/orna-erklaervideo.mp4 -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart orna-erklaervideo.mp4`.

## «Zettel 33 · Das Publikum» (14. November 2026)

61,4 s, **4:5** (1080 × 1350, `PublikumVideo`), **mit Ton**: Christians gesprochene Fassung der Strophe 33, dazu eine Bildergeschichte.
Quelle `src/publikum/`: `Video.tsx` (Zeitplan `SATZ` nach der Stimme, Figuren, Denkblasen), `daten.mjs` (acht Sätze und Leitsatz wörtlich aus
`src/data/zu-seiner-zeit.json`). Fünf Strichfiguren vor einem Bild (darin die Schlaufe des Signets), jede mit einer Denkblase: Kreis, Quadrat,
Spirale, Fisch, nichts. Die Blase lässt sich nicht weiterreichen (platzt), Fäden von Hand zu Hand (Anschlüsse), Fühler (empfindlich werden),
die Blasen prallen aneinander ab, verändern sich gegenseitig, die Zuspätgekommene sieht einen Fisch auf Beinen, am Schluss ein Ring um das Bild.

- Eigene Farben nur für dieses Video (Wunsch: ohne Warmweiss und Orange): Petrol `#0f3038`, Kreide `#e6f0ee`, Punkt Gelb `#ffd84a`.
- **Das erste Bild ist eine fertige Titelkarte** (Signet vorgespult), weil Reels es als Vorschaubild nehmen – nie mit leerer Fläche beginnen.
- Der Ton liegt nicht im Repository. Stumm rendern, dann aus der Aufnahme übernehmen:
  `npx remotion render PublikumVideo out/publikum-stumm.mp4 --codec=h264 --crf=18`, danach
  `ffmpeg -i out/publikum-stumm.mp4 -i <aufnahme>.mp4 -map 0:v -map 1:a -c:v libx264 -crf 19 -pix_fmt yuv420p -c:a copy -movflags +faststart <ziel>.mp4`.
