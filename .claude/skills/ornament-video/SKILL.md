---
name: ornament-video
description: Kurze Videos (Hochformat 9:16, ohne Ton) zu Werken von ornament.cloud im Stil des ORNA-Erklärvideos produzieren – mit Intro/Outro-Signet und gemeinsamer Vorlage in src/videos/. Verwenden, wenn ein neues Video, ein Erklärvideo, ein Reel oder eine Änderung an einem bestehenden Video gewünscht ist.
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

## Auf die Website (nur auf Wunsch)

- Datei nach `assets/<name>.mp4`, Vorschaubild 540 × 960 als `assets/<name>.jpg` (Standbild aus dem Intro, ffmpeg).
- Einbinden wie auf der Startseite: `<video controls playsinline preload="none" poster=… width="1080" height="1920" aria-label="…, ohne Ton">`,
  Höhe auf das Fenster begrenzt (siehe `.erklaervideo` in `styles.css`). Tests (`tests/struktur.*`) ergänzen, `?v=` erhöhen.
- Quellcode des Videos immer mit einchecken (`src/videos/src/<name>/`), README in `src/videos/` ergänzen.
