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

## «Drei im Doppelspalt» (6. Oktober 2026)

Gut 2 Minuten, nur **3:4** (1080 × 1440, `DreiervergleichVideo`), ohne Ton. Wie «Liebling …», aber farblich anders und mit viel Roy Lichtenstein
(Strahlenkranz, Knall mit Lautwort, Gedankenwolke, Stempel; Wunsch von Christian): zeigt witzig und auf den Punkt, wie die Vergleichende Analyse
«Nebeneinander, Nacheinander | Luhmann, Baecker, Lehmann» (Erweiterte Arbeitsfassung, 5. Oktober 2026) die drei Zugänge prüft und wo sie sich unterscheiden.
Quelle `src/dreiervergleich/`: `Video.tsx` (Szenen), `Pop.tsx` (Palette und Lichtenstein-Bausteine; jeder Autor in seiner Farbe aus der Streugrafik der Studie:
Luhmann türkis, Baecker gelb, Lehmann korallrot; Grundbausteine aus `doppelpruefung/Comic.tsx`), `zitate.ts` (alle Sätze wörtlich aus der Studie, mit Seitenangabe;
gegen den PDF-Text geprüft). Autoren nur als Namen, ihre Begriffe als Gegenstände.

0. Intro «Doppelspalt», darunter «Luhmann • Baecker • Lehmann»; Titel mit drei Namenskarten und «ZACK!»
1. Das Prüfraster: X (Bestimmbare Rückkehr), Y (Folgenreicher Vollzug), «Zeit ist die Bedingung dafür, dass es anders weitergehen kann»
2. Luhmann: Information · Mitteilung · Verstehen, Gedankenwolke «Verstehen ist zudem nicht Zustimmung.», Ereignisse vergehen, Entscheidung zweimal gestempelt
3. Baecker: Formzeichen, «Das Wort «nächste» begründet keinen hohen Y-Wert.», die grafische Eleganz einer Form («SCHICK!»)
4. Lehmann: Werk · Medium · Reflexion, re-exit, «BRUCH!» wird mit jeder Wiederholung blasser
5. Differenzen: Lehmann → Luhmann (keine schlichte Wahl «mit» oder «ohne Menschen»), Lehmann → Baecker (Rezension 2008)
6. Gegenprobe: dieselbe Klanginstallation – «Dies belegt zunächst die Übernahme von Worten.»
7. Streugrafik: die drei Punkte «zur Lesbarkeit» auseinandergezogen, dann «KORREKTUR»: gleiche Quadrantenlage, verschiedene Prüfleistungen
8. Siegertreppchen sackt zusammen: kein philosophisches Ranking; das Raster prüft sich selbst mit
9. Die offene Frage; 10. Outro

`npx remotion render DreiervergleichVideo out/dreiervergleich.mp4 --codec=h264 --crf=20`, danach nach `yuv420p` umwandeln (siehe unten).

## Rendern ohne Internetzugang zu remotion.media

Remotion lädt sonst einen eigenen Browser herunter; stattdessen einen vorhandenen angeben:
`npx remotion render OrnaVideo out/orna-erklaervideo.mp4 --codec=h264 --crf=20 --browser-executable=/pfad/zu/headless_shell`.
Für Instagram und WhatsApp danach mit ffmpeg nach `yuv420p` umwandeln:
`ffmpeg -i out/orna-erklaervideo.mp4 -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart orna-erklaervideo.mp4`.
