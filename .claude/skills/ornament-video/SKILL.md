---
name: ornament-video
description: Kurze Videos (Hochformat 9:16 und 4:5) zu Werken von ornament.cloud im Stil des ORNA-Erklärvideos produzieren – mit Intro/Outro-Signet und gemeinsamer Vorlage in src/videos/, stumm oder als gesprochener Zettel mit Christians Stimme. Verwenden, wenn ein neues Video, ein Erklärvideo, ein Reel, ein vorgelesener Zettel oder eine Änderung an einem bestehenden Video gewünscht ist.
---

# Videos für ornament.cloud

Quellcode: `src/videos/` (Remotion, React → MP4). Lies zuerst `src/videos/README.md` (Aufbau, Stil, Befehle).
Für Remotion-Details helfen die Remotion-Skills (`npx skills add remotion-dev/skills`), falls installiert.

## Vorgehen

1. **Klären** (kurz, mit AskUserQuestion): Werk, Kernaussage, Länge (Richtwert 30–45 s, ORNA hatte 51,5 s), Kopfzeile fürs Intro
   (`{ titel, unter }`, z. B. `{ titel: "ORNA", unter: ["app", "web"] }`), Ziel (nur Datei oder auch auf der Website).
2. **Szenenplan** als Liste vorlegen (Szene, Dauer, Text wörtlich mit Quelle) und Freigabe abwarten.
3. **Gerüst**: `cd src/videos && npm run neu -- <name> <TITEL> <stichwort> …` → `src/<name>/Video.tsx`, Eintrag in `src/Root.tsx`.
4. **Daten**: Alles, was aus der Website stammt (Namen, Fragen, Texte, Zeichen), liest ein `src/<name>/daten.mjs` unverändert aus den
   Dateien der Website (Vorbild `src/orna/daten.mjs`) nach `src/<name>/data/` (nicht eingecheckt). Nie von Hand abtippen.
5. **Szenen** mit den Bausteinen aus `src/vorlage/Bausteine.tsx` bauen: `Oben`/`Unten` mit `blende` und `steig`, `Marke` (Kennzeile),
   `Titel` (Serife), `Leise` (Erklärung), `Auszug` (Textauszug). Neue, nur für ein Werk gebrauchte Bilder (wie `orna/Rad.tsx`) in den Ordner des Videos.
6. **Prüfen**: `npx tsc --noEmit`, `npx eslint src`, Standbilder rendern und anschauen (je Szene eines; als Kontaktbogen zeigen).
7. **Rendern**, nach `yuv420p` umwandeln, Video und Vorschaubild dem Nutzer schicken (SendUserFile). Erst auf Wunsch auf die Website.

## Stilregeln (verbindlich)

(Für gesprochene Zettel darf der Grund dunkel sein, wie in Christians Reel zu Zettel 33; Schrift, Abstände und Lesezeit gelten trotzdem.)

- Immer `Grund` als äusserste Ebene, `Intro` mit Kopf am Anfang (90 Bilder), `Outro` am Schluss (180 Bilder). Vorlage nicht pro Video kopieren:
  Änderungen an `src/vorlage/` gelten für alle Videos – dann das ORNA-Video gegen Referenz-Standbilder prüfen.
- Farben und Schriften nur aus `stil.ts` (`FARBE`, `SERIF`, `SANS`); Akzent Rot-Orange `#c2410c` sparsam (Kennzeilen, Punkt, Achse).
- Sicherer Bereich: 90 px seitlich, Text oben ab 150 px, unten ab 1475 px; das Bild dazwischen (bei ORNA das Rad etwas über der Mitte).
- Kräftige Striche (≥ 2,5 px im fertigen Bild), grosse Schrift (Titel 76 px, Erklärung 40 px, Auszug 62 px) – es wird auf dem Telefon geschaut.
- Lesezeit: mindestens etwa 1 s pro 4 Wörter stehen lassen; ruhige Übergänge (12 Bilder), keine harten Schnitte.
- Deutsch mit «ss», nie «ß». Bezeichnungen wie auf der Website.

## Korpus-Regeln

- Texte, Fragen und Namen aus dem Korpus nie verändern, kürzen nur als Auszug: wörtlich, mit «[…]» gekennzeichnet,
  im Datenskript mit `text.startsWith(auszug)` (oder gleichwertig) geprüft. Keine erfundenen Zitate, Zahlen oder Werkangaben.
- `js/data/*.js` der Website nie bearbeiten, nur lesen.

## Umgebung (Cloud-Sitzung)

- `node_modules` nicht ins Repository: in einem Ordner im Scratchpad installieren (`npm i` mit der `package.json` von `src/videos/`)
  und nach `src/videos/node_modules` verlinken; den Link vor dem Commit entfernen.
- remotion.media ist gesperrt, Remotion kann keinen Browser laden: bei `remotion still|render` immer
  `--browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell` angeben (Pfad bei Bedarf mit `ls /opt/pw-browsers` prüfen).
- ffmpeg: `/usr/local/lib/python3.11/dist-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2` (sonst `ffmpeg`).
- Für Instagram und WhatsApp umwandeln:
  `ffmpeg -i out/x.mp4 -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart x.mp4`.

## Gesprochene Zettel (mit Christians Stimme)

Seit 13./14. November 2026: ein Zettel aus «Zu seiner Zeit», von Christians Stimme vorgelesen, der Text Satz für Satz, darunter eine kleine
Animation zum Gedanken des Zettels. Vorbilder: `src/zettel-33/` (Ablauf, Zeiten, Ton; hell, ohne Animation) und Christians Reel
«zettel-33-das-publikum-animation» (4:5, dunkles Petrol, Akzent Gelb, Strichfiguren mit Denkblasen vor einem gerahmten Bild), das er am
14. November 2026 lokal gebaut hat. Christian: «ich möchte weitere videos produzieren».

1. **Text**: wörtlich aus `src/data/zu-seiner-zeit.json` (Nummer, Titel, Zyklus, Text, Leitsatz). Nichts abtippen, nichts umformulieren.
2. **Stimme**: im privaten Repository `hansnoed-ui/ornament-studio` den Workflow «Stimme» (`stimme.yml`) starten. Text:
   «Zettel <Zahl in Worten>. <Titel>.», Leerzeile, dann der Zettel; Stil `g` (ruhig). Oder über ornament.cloud/alpha/voice/ (mit Passwort).
   Die Sprechweise vorher mit Christian abstimmen (bei Zettel 33: Betonung, Pause nach Strichpunkt → Satz dort teilen).
3. **Tonspur holen**: Der Speicher der Artefakte ist aus Cloud-Sitzungen gesperrt. Darum einen Zweig `ablage/<name>` in ornament-studio pushen
   mit `ablage.txt` = Lauf-Kennung; der Workflow «Ablage» legt die MP3 nach `ablage/<artefakt>/stimme.mp3` und committet sie. Lokal geht
   auch `gh run download`. Die Stimme nie ins öffentliche Repository ornament-cloud.
4. **Zeiten**: Satzanfänge aus den Pausen messen (`ffmpeg -af silencedetect=noise=-36dB:d=0.15`; nicht erkannte Grenzen mit `astats`
   im Ausschnitt suchen) und in `src/<name>/daten.mjs` festhalten. Dort prüfen, dass die Abschnitte zusammen genau `text` ergeben
   (Vorbild `src/zettel-33/daten.mjs`). `daten.mjs` kopiert die MP3 nach `public/<name>/` (nicht eingecheckt).
5. **Bauen**: Intro mit Kopf `{ titel: "ZETTEL <n>", unter: ["zu seiner zeit", "<zyklus>"] }`, Ton ab Bild 90, Titel während Nummer und
   Titel gesprochen werden, jeder Satz 0,2 s vor dem Sprechen sichtbar und so lange, wie er gesprochen wird, danach der Leitsatz still
   (etwa 3 s), dann das Outro. Sätze schnell einblenden (8 Bilder), damit sie lesbar sind, sobald sie gesprochen werden.
   Die Animation zeigt den Gedanken des Zettels mit wenigen Strichen; keine Bilder von Personen, keine erfundenen Zitate.
6. **Formate**: 9:16 (1080 × 1920) für Reels und Stories und 4:5 (1080 × 1350) für den Feed, je eine Composition.
   Umwandeln: `ffmpeg -i out/x.mp4 -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart x.mp4`.
   Prüfen, dass die Stimme nach dem Intro einsetzt (silencedetect auf dem fertigen Video: erste Stille endet bei 3,0 s).
7. **Sichern**: Quellcode (`src/<name>/`, Eintrag in `src/Root.tsx`, README) auf einen Zweig `claude/video-<name>` pushen und einen
   Pull Request öffnen, nicht mergen. Die fertigen MP4 nicht ins Repository, ausser sie kommen auf Wunsch auf die Website (`assets/`).
   Lokal gebaute Videos immer pushen: sonst kann keine andere Sitzung sie in ein anderes Format bringen oder verbessern.
8. **Melden**: in drei Sätzen, welcher Zettel, welche Animation, wo Quellcode und Dateien liegen; Video und Standbild schicken.

## Auf die Website (nur auf Wunsch)

- Datei nach `assets/<name>.mp4`, Vorschaubild 540 × 960 als `assets/<name>.jpg` (Standbild aus dem Intro, ffmpeg).
- Einbinden als Beitrag auf «Web» mit eigener Videoseite, wie `web/orna-erklaervideo/`, `web/poststrukturalismus/` und `web/mensch-niklas/` (Karte mit Vorschau 640 × 800 in `web/index.html`, Seite mit `<video controls muted playsinline preload="none" poster=… width="1080" height="1920" aria-label="…, ohne Ton">`,
  Höhe auf das Fenster begrenzt, siehe `.erklaervideo` in `styles.css`; Eintrag in `sitemap.xml`). Tests (`tests/struktur.*`) ergänzen, `?v=` erhöhen.
- Quellcode des Videos immer mit einchecken (`src/videos/src/<name>/`), README in `src/videos/` ergänzen.
