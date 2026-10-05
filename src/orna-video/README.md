# ORNA – Erklärvideo

Kurzes Video zu ORNA («Nebeneinander, Nacheinander»), gebaut mit [Remotion](https://www.remotion.dev) (React → MP4).
Hochformat 9:16 (1080 × 1920), 30 fps, 51,5 s, ohne Ton. Entstanden am 5. Oktober 2026.
Das Video ist nicht Teil der Website; hier liegt nur der Quellcode, damit es sich später anpassen lässt.

## Ablauf

0. Intro: das Signet von ornament.cloud in kurzer Fassung (doppelt so schnell, 3 s)
1. Titel «Zufällige Begegnungen» (darüber ORNA), das Rad baut sich aus den 40 Zeichen auf
2. Oben die beiden Ringe (aussen 20 Künstler:innen, innen 20 Theoretiker:innen), unten «Zwei Ringe, gegenläufig»
3. Eine Drehung, eine Begegnung: Eva Hesse × Susan Leigh Star und ihre Frage
   – danach ein Auszug aus ihrem Text (die ersten beiden Sätze, Wort für Wort, mit «[…]» als Auszug gekennzeichnet; `gen.mjs` prüft, dass er mit dem Text beginnt)
4. Achse 1, Verräumlichung (Prüfstein Rückkehr)
5. Achse 2, Verzeitlichung (Prüfstein Irreversibilität), die Ringe drehen gegeneinander
6. Die sechs Prüfdimensionen («Was eine Paarung leisten muss»)
7. Das Feld 20 × 20: 326 von 400 Paarungen
8. «Dieses Rad erzeugt keine Antworten. Es erzeugt Konstellationen.»
9. Signet von ornament.cloud (`src/Signet.tsx`): heller Bildschirm, die Re-entry-Schlaufe zeichnet sich (flache Ausgangsform
   des Artefakts «Re-entry-Knoten», `werke/reentry/`), ein orangeroter Punkt durchläuft sie; darunter erscheinen Kästchen,
   aus jedem bildet sich ein Buchstabe von «ornament.cloud», dann rücken sie zusammen
   (Instrument Sans, Gewicht 400, 62 px, gesperrt)

Zeitplan in `src/Video.tsx` (`T`), das Rad in `src/Rad.tsx` (nachgezeichnet nach `portfolio/nebeneinander-nacheinander/js/wheel.js`),
Farben und Schriften in `src/theme.ts`. Namen, Zeichen, Paarungen und die Frage kommen unverändert aus den Daten von ORNA (`gen.mjs`);
die Achsen aus dem Prüfraster «Nebeneinander und Nacheinander», die Prüfdimensionen und die Sätze zum Feld wörtlich aus `src/doppelspalt/werkbericht.md`.

## Rendern

```bash
cd src/orna-video
npm i
npm run daten        # src/data/orna.json und die Schriften in public/
npm run dev          # Vorschau im Browser (Remotion Studio)
npm run render       # → out/orna-erklaervideo.mp4
```

Ohne Zugang zu remotion.media (Download des Browsers) einen vorhandenen Chromium angeben, z. B.
`npx remotion render OrnaVideo out/orna-erklaervideo.mp4 --codec=h264 --crf=20 --browser-executable=/pfad/zu/headless_shell`.
Für Instagram und WhatsApp danach mit ffmpeg nach `yuv420p` umwandeln:
`ffmpeg -i out/orna-erklaervideo.mp4 -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart orna-erklaervideo.mp4`.
