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

51,5 s. Das fertige Video steht auf der Startseite unter OMNA COLOR (`assets/orna-erklaervideo.mp4`, Vorschaubild `assets/orna-erklaervideo.jpg`,
ein Standbild aus dem Intro bei 2,6 s). Nach einer Änderung neu rendern (`npm run render:orna`), nach `yuv420p` umwandeln (siehe unten) und beide Dateien ersetzen.

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

1. Die alte Frage (Zeitstrahl 1971–2025, «Immer. Sofort.», «Mensch, Niklas!»); Zwischentitel «Warum ich den Körper … bisher nicht gesucht habe – und trotzdem jetzt darüber spreche …»;
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

## Rendern ohne Internetzugang zu remotion.media

Remotion lädt sonst einen eigenen Browser herunter; stattdessen einen vorhandenen angeben:
`npx remotion render OrnaVideo out/orna-erklaervideo.mp4 --codec=h264 --crf=20 --browser-executable=/pfad/zu/headless_shell`.
Für Instagram und WhatsApp danach mit ffmpeg nach `yuv420p` umwandeln:
`ffmpeg -i out/orna-erklaervideo.mp4 -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart orna-erklaervideo.mp4`.
