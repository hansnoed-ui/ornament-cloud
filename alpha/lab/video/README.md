# ornament.lab · Video 0.3

Ein Video-Editor im Browser: Videos, Bilder und Töne laden, schneiden, blenden, mit Filtern, Titeln und Musik, und als MP4 ausgeben. Die Dateien bleiben auf dem Gerät, nichts wird hochgeladen.

Wunsch vom 27. Oktober 2026: «video hochladen, bearbeiten und allenfalls mit titeln und texten ergänzen, gute schnitte und filter. der video editor soll (noch) nicht direkt mit dem lab verbunden sein, sondern eher video produzieren, die ich später ins lab hineinnehmen».

- Online unter <https://ornament.cloud/alpha/lab/video/>, wie das Lab nur per Direktlink und mit `noindex`. Keine Seite verlinkt ihn, auch das Lab nicht.
- Lokal: `node alpha/lab/starten.mjs` und dann <http://localhost:8790/alpha/lab/video/>.
- Für den MP4-Export braucht es WebCodecs, also Chrome oder Edge (Desktop und Android). Bearbeiten und Speichern gehen auch in anderen Browsern.

## Ein Durchgang

1. **Material:** Videos, Bilder und Töne wählen oder hineinziehen. Liegt noch nichts in der Folge, kommen Videos und Bilder gleich in die Bildfolge und der erste Ton unter den Film. Ist das erste Video hochkant, wird das Format 9:16.
2. **Schneiden:** Die Bildfolge ist eine magnetische Zeitleiste. Löschen und Umstellen schliessen die Lücke.
   - Die Ränder eines Clips ziehen trimmt ihn.
   - Die Mitte ziehen stellt ihn um; eine gelbe Linie zeigt, wohin.
   - **S** teilt am Abspielkopf (auch Titel und Töne), **Entf** löscht.
   - **Strg+Z** macht rückgängig, **Strg+Umschalt+Z** wiederholt. Jeder Zug und jeder Regler ist ein Schritt.
   - Ränder rasten an anderen Rändern, am Abspielkopf und an Marken ein.
3. **Gute Schnitte:**
   - Zwischen zwei Clips steht ein Zeichen für den Übergang: │ Schnitt, ◇ Überblendung, ■ Schwarzblende, □ Weissblende. Ein Klick darauf wählt ihn in den Eigenschaften, mit seiner Dauer.
   - «zwischen allen Clips» gibt allen denselben Übergang.
   - «Takt als Marken» findet die Schläge eines Tons; Ränder und Schnitte rasten dann im Takt ein.
   - **Stellen markieren** (seit 0.3):
     - **Marke** (Taste M) setzt eine benannte Stelle am Abspielkopf, als blaues Fähnchen auf dem Lineal. Ein Klick darauf springt hin. Dort: «Schnitt hier», «Übergang hier» (Art und Dauer), «als Bereich markieren» (bis zur nächsten Marke), umbenennen, verschieben, löschen.
     - **Bereich ab hier** (I) und **bis hier** (O) markieren einen Abschnitt, als gelbes Band. Ihm lässt sich zuordnen: eine Effektvorlage oder ein Filter nur dort, Schnitte und ein Übergang an Anfang und Ende, ein Titel über den Bereich, oder ihn herausschneiden (die Lücke schliesst sich).
     - Ohne Auswahl stehen alle Marken in den Eigenschaften, mit «an allen Marken schneiden» und «Übergang an allen Marken».
     - Unter der Haube teilt der Editor die Clips an den Rändern und ordnet zu, was dazwischen liegt: jeder Schritt ist rückgängig zu machen, und der Film bleibt ein gewöhnlicher OpenFilm-Film. Liegt eine Stelle in einer Überblendung, ist dort schon eine Kante; ob ein Clip im Bereich liegt, entscheidet die Mitte der Überblendung.
     - Marken und Bereich rasten ein und werden mit dem Projekt gespeichert.
4. **Clip:** Zuschnitt in der Datei, Tempo (0,25–4, die Tonhöhe bleibt), Lautstärke und Bildausschnitt (füllen oder ganz zeigen, Zoom, Lage).
   - **Filter:** neun Vorlagen (Natürlich, Film, Noir, Warm, Kühl, Verblasst, Kräftig, Nacht, Traum), darüber sieben Regler: Helligkeit, Kontrast, Sättigung, Farbton, Wärme, Schwarzweiss, Unschärfe.
   - «für alle Clips» gibt allen denselben Filter.
   - **Effekte** (seit 0.2, `kern/effekte.js`): sieben Vorlagen (Ohne, Super 8, Handkamera, Club, Glitch, Traum, Langsame Fahrt), darüber:
     - **Kamerafahrt** (Ken Burns): hinein, heraus, nach links, rechts oder oben, mit Weite. Ein Bild, das in die Folge kommt, fährt von selbst langsam hinein.
     - **Handkamera:** weiches Zittern, je Clip anders, leicht vergrössert, damit kein Rand sichtbar wird.
     - **Zoom-Puls im Takt:** auf den Takt-Marken eines Tons oder in einem Tempo (BPM).
     - **Glitch:** in Schüben zerrissene Streifen und Farbversatz.
     - **Filmkorn**, **Kratzer und Staub**, **Lichtlecks.**
     - In der Zeitleiste trägt ein Clip mit Effekten ein ✦; «für alle Clips» gibt allen dieselben Effekte.
5. **Titel und Texte:** «Titel hinzufügen» legt einen Titel an den Abspielkopf.
   - **Vorlagen** (seit 0.2): Kinotitel (aus der Unschärfe), Wort für Wort, Bauchbinde (Linie und Wischkante), Kapitel (getippt), Glitch, Buchstabenwelle, Schlusstitel (auf Schwarz). Eine Vorlage behält Text, Beginn und Dauer.
   - Text (mehrzeilig) und Unterzeile, Schrift (Instrument Sans, Newsreader, Monospace), Stärke, Grösse, Farbe und Lage.
   - Hintergrund: Schatten, Band, Linie in der Akzentfarbe oder die ganze Fläche.
   - **Auftritt und Abgang** getrennt wählbar: einblenden, von unten, Wort für Wort, Buchstabe für Buchstabe, wischen (mit Kante), aus der Unschärfe, Glitch, eintippen (mit blinkendem Strich), Buchstaben laufen zusammen, heranzoomen.
   - Titel dürfen sich überlappen.
6. **Ton:** Töne unter dem Film mit Beginn, Zuschnitt, Lautstärke, Ein- und Ausblenden. Der Ton eines Videos lässt sich auch für sich unter den Film legen.
7. **MP4 exportieren:** volle Grösse (1080 p) oder 720 p, 25, 30 oder 60 Bilder je Sekunde.
   - Jedes Bild wird genau gesucht und so gezeichnet wie in der Vorschau. Das dauert je nach Gerät etwa so lange wie der Film oder länger.
   - Bild: H.264 (sonst VP9). Ton: AAC (sonst Opus), gemischt aus dem Ton der Videos und den Tönen darunter.
   - **Ins Lab:** dort «Video wählen» und das MP4 laden.
8. **Speichern:** ergibt `Name.film.zip`. **Öffnen** stellt das Projekt mit allen Dateien wieder her.

## OpenFilm

Das Projekt ist ein Film im Format von [OpenFilm](https://github.com/openfilm/openfilm) (MIT): `film.html` mit Spuren und Clips, die Titel als Seiten mit `window.film.frame(t)` unter `titel/`, die Dateien unter `assets/`. Den Zustand des Editors (Folge, Übergänge, Filter, Titel) legt er unter `.film/ornament-video.json` ab; nach OpenFilm gehört der eigene Zustand eines Editors dorthin.

- Ausgepackt öffnet `npx openfilm open` den Film in OpenFilm Studio, und `npx openfilm render` rechnet ihn, auch in 4K.
- Den Leser und Schreiber von film.html übernimmt der Editor unverändert aus OpenFilm 0.2.6 (`vendor/openfilm-0.2.6/film-doc.js`, mit `LICENSE` und `HERKUNFT.txt`). Jeder Film, den der Editor schreibt, ist damit geprüft.
- Vorschau und Export zeichnen den Film so, wie er in film.html steht (`bildBei` und `tonQuellen` in `kern/folge.js`, mit `clipSpan` und `fadeGain` von OpenFilm).

So wird das Projekt zu einem OpenFilm-Film:

| im Editor | in film.html |
|---|---|
| Bildfolge | abwechselnd auf zwei Spuren |
| Überblendung | Die beiden Clips überlappen. Der obere blendet: der spätere ein oder der frühere aus. |
| Schwarzblende | Der eine Clip blendet aus, der andere ein (`fade`), ohne Überlappung. |
| Weissblende | wie die Schwarzblende, darunter eine weisse Seite |
| Filter | CSS `filter` im Stil des Clips |
| Bildausschnitt | `left`, `top`, `width`, `height` und `object-fit` |
| Tempo, Lautstärke | `speed`, `volume` |
| Filmkorn, Kratzer, Lichtlecks | Seiten mit `frame(t)` über dem Clip (`effekt/`), mit `mix-blend-mode: overlay` oder `screen` und denselben Blenden. So zeigt Studio sie auch. |
| Kamerafahrt, Handkamera, Puls, Glitch | Eine Bewegung kann film.html nicht ausdrücken. Sie steht beim Clip als `data-ornament-effekte` und im Zustand des Editors; Studio zeigt den Clip ohne sie. |
| Titel | Seiten mit `frame(t)`. Die Zeichenfunktion ist dieselbe wie in der Vorschau (`kern/titel.js`), so sieht Studio, was der Editor zeigt. |

Fremde OpenFilm-Filme öffnet der Editor noch nicht, nur seine eigenen.

## Dateien

| Datei | Inhalt |
|---|---|
| `kern/folge.js` | Modell: Medien, Folge, Titel, Ton; Zeitplan der Übergänge; teilen, trimmen, umstellen, einrasten; der Film für OpenFilm; was bei t zu sehen und zu hören ist |
| `kern/filter.js` | Vorlagen und Regler als CSS, dieselben als Farbmatrizen (W3C Filter Effects) für Browser ohne `ctx.filter` |
| `kern/titel.js` | Titel zeichnen (Auftritte, Abgänge, Vorlagen), die Titelseite für OpenFilm |
| `kern/effekte.js` | Effekte: Bewegung (Ken Burns, Handkamera, Puls), Glitch, Überlagerungen (Korn, Kratzer, Licht) und ihre Seiten für OpenFilm |
| `kern/ton.js` | den Ton mischen (Tempo mit WSOLA aus dem Klangwerk des Labs), Takt als Marken (Einsätze aus dem Klangwerk) |
| `medien/zeichnen.js` | ein Bild des Films zeichnen (Vorschau und Export), Quellen je Clip |
| `medien/export.js` | MP4 mit WebCodecs und mp4-muxer, Ton dekodieren und kodieren |
| `medien/projektdatei.js` | `.film.zip` packen und öffnen |
| `app.js`, `index.html`, `video.css` | Oberfläche; die Gestaltung baut auf `../lab.css` |

Aus dem Lab nutzt der Editor nur Hilfen ohne Verbindung zu dessen Projekten: das Klangwerk, das Lesen von Dateien in Stücken, den Ton aus MP4 über WebCodecs, den ZIP-Leser, die Schriften.

## Prüfen

```bash
node --test tests/lab-video.test.mjs                        # Modell, OpenFilm, Filter, Titel, Ton, Projektdatei (ohne Browser)
NODE_PATH=$(npm root -g) node tests/lab-video.e2e.mjs       # der ganze Ablauf in Chromium, mit MP4-Export und Telefon
```

## Grenzen und nächste Schritte

- Alles liegt im Arbeitsspeicher: sehr lange oder sehr viele Videos machen Telefone langsam. Das Projekt wird nicht von selbst gespeichert; beim Schliessen fragt der Browser nach.
- Der Export sucht jedes Bild einzeln; bei langen Filmen dauert das. Schneller ginge es, die Videos mit WebCodecs selbst zu dekodieren.
- In der Vorschau ist eine Lautstärke über 100 % nicht hörbar (das `<audio>` des Browsers endet bei 1). Darum geht der Regler nur bis 100 %.
- Safari bis 17 zeichnet Filter ohne `ctx.filter`: die Farben stimmen, die Unschärfe fehlt.
- Offen: fremde OpenFilm-Filme öffnen, Wischblenden und andere Übergänge als Seiten, Bild-in-Bild, Ken-Burns-Fahrt über Bilder, Wellenform der Töne, Untertitel (WebVTT wie in OpenFilm), automatisches Zwischenspeichern.
