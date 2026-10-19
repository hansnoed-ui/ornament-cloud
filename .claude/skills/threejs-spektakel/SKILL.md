---
name: threejs-spektakel
description: Spektakuläre Bewegtbilder aus einem Foto mit Three.js im Stil von TouchDesigner. Sieben geprüfte Rezepte – Partikelwolke, Relief mit Streiflicht und Höhenlinien, Splitter als Explosionszeichnung, Feedback-Schleife mit Kaleidoskop, Glaskörper mit Spektralsäumen, GPU-Physik (GPGPU) und WebGPU/TSL-Compute – und fünf aus PHORMA II: Physarum (Schleimpilz-Agenten), Morphogenese (Reaktion-Diffusion, Turing-Muster), fliessender Kupferstich aus Strömungslinien (Strukturtensor, Jobard–Lefer), Tiefe als Raum (geschätzt oder KI, Parallaxe, Tiefenschärfe), Foto als Seidentuch (Stoffsimulation), Montage (verschachtelte Rechtecke mit versetzten Ausschnitten, Rändern und Zahlentafeln, harte Schnitte im Takt), Wachstum (Differential Growth, eine leuchtende Linie zeichnet das Foto), Gewebe (Bänder aus feinen Linien aus Text, Foto oder Video, von einer Tonspur gesteuert, Musik verfrickelt, Video mit Ton) und Traube (glänzende Perlen mit Tiefenschärfe in einer Kugel aus Fäden, Bokeh, Glut im Takt) –, dazu Zeitfront-Übergänge, Bewegungsunschärfe im Export, Filmlook (Bloom, Farbsaum, Korn) und MP4-Export in 4:5 und 9:16. Verwenden, wenn ein Foto oder Werk von ornament.cloud als Video, Reel oder Installation animiert werden soll, wenn ein 3D- oder Shader-Effekt «krasser», «wertiger», «spektakulärer» oder «weniger billig» werden soll, oder wenn Partikel, GPGPU, Physarum, Reaction-Diffusion, Turing-Muster, Strömungslinien, Tiefenschätzung, Stoff/Tuch, Collage/Rechtecke/Glitch-Raster, Differential Growth/wachsende Linie, audioreaktive Linien, Text als Bild, Sample verfrickeln/zerschnipseln, Dynamik im Takt (Tor, harte Schnitte), Tonspur im Video, Perlen/Bokeh/Tiefenschärfe je Teilchen, Bewegungsunschärfe, Raymarching, Glas, Feedback, Postprocessing, WebGPU oder TSL gefragt sind. Grundlagen (Szene, Licht, Materialien, Loader) stehen in den Skills threejs-*.
---

# Spektakel mit Three.js: Foto → Film

Sieben Rezepte, jedes als lauffähiges Beispiel in `beispiele/` und mit `beispiele/pruefen.mjs` im Browser geprüft (three.js **0.185.1**).
Alle folgen demselben Ablauf: Am Anfang steht das Foto exakt da, dann passiert das Spektakel, am Ende steht das Foto wieder exakt.
Damit funktioniert jedes Rezept als Phase in einem Film wie Bildfragmentieren.

| Rezept | Datei | Technik | Look | Zustand |
|---|---|---|---|---|
| 1 Partikelwolke | `partikel.js` | Points, Vertex-Shader, Curl-Rauschen | Foto zerstäubt zu Sternenstaub, Kamerafahrt durch die Wolke | zustandslos |
| 2 Relief | `relief.js` | MeshStandardMaterial + `onBeforeCompile`, Schatten | Helligkeit wird Gebirge, Streiflicht wandert, Höhenlinien glühen unter einer Scan-Linie | zustandslos |
| 3 Splitter | `splitter.js` | Voronoi-Scherben in einem Draw-Call, Drehung im Shader | Explosionszeichnung: Scherben in Tiefenschichten, Schnittkanten glühen | zustandslos |
| 4 Feedback | `feedback.js` | Ping-Pong-Render-Targets, Sobel, YIQ-Farbdrehung | TouchDesigner-Feedback: Zoom-Tunnel, Spuren, Kaleidoskop | Simulation |
| 5 Glas | `glas.js` | Fragment-Shader, analytischer Schnitt mit konvexen Polyedern | Glaskörper bricht das Foto mit Spektralsäumen, Dodekaeder → Geode → Ikosaeder | zustandslos |
| 6 GPU-Physik | `gpgpu.js` | GPUComputationRenderer (Float-Texturen) | 262 144 Teilchen: Stosswelle, Strudel, Feder zurück ins Foto | Simulation |
| 7 WebGPU/TSL | `tsl.js` | WebGPURenderer, `instancedArray`, Compute in TSL, RenderPipeline + Bloom | wie 6, Teilchen sammeln sich zu Bändern und Tüchern; Rückfall auf WebGL 2 | Simulation |

Für Bildfragmentieren passen am besten Glas (5) und Splitter (3) als «konstruktive» Effekte, Relief (2) für Wertigkeit und Feedback (4) für den TouchDesigner-Moment.
Partikel (1, 6, 7) eignen sich für Auflösen und Zusammensetzen.

## Grundregeln (verbindlich)

1. **Der Film ist eine Funktion der Zeit.** Jedes Rezept liefert `bild(t)`. Zustandslose Effekte rechnen alles aus `t`.
   Simulationen (Feedback, GPGPU, TSL) laufen über `simulation({ zuruecksetzen, schritt })` aus `gemeinsam.js`: feste Schritte von 1/30 s, nach einem Sprung zurück von vorn.
   So ist Bild n beim Abspielen, Spulen und im Video immer gleich. `pruefen.mjs` misst das («Sprung zurück»).
2. **Das Foto steht am Anfang und am Ende exakt.** Dafür gibt es drei Wege:
   - emissiv statt beleuchtet (Relief: `emissiveIntensity = 1 − licht`)
   - Überblenden in der Anzeige, nie in der Schleife (Feedback)
   - Einrasten auf die Ausgangslage mit `mix(sim, heim, uEinrasten)` und einer Fotofläche darunter (GPGPU, TSL)
3. **Formate wie bei Bildfragmentieren:** 1080 × 1350 (4:5, Standard), 1080 × 1920 (9:16).
   Der Renderer bekommt `setPixelRatio(1)` und `setSize(B, H, false)`; CSS skaliert die Leinwand nur.
   Die Kamera steht so, dass die Fotofläche (Höhe 2, Breite 2·B/H) bei z = 0 das Bild genau füllt: `abstand = 1 / tan(fov/2)`.
4. **three.js fest über die Import-Map:** `three@0.185.1` von cdn.jsdelivr.net, mit `three/addons/` und für WebGPU zusätzlich `three/webgpu` und `three/tsl` (siehe `tsl.html`).
   Nie ohne Versionsnummer laden. Vor einem Versionswechsel `pruefen.mjs` laufen lassen.
5. **Farbräume:** Die Foto-Textur bekommt `colorSpace = SRGBColorSpace`; Shader lesen dann lineare Werte.
   Der `filmlook` (EffectComposer → OutputPass) wandelt am Schluss nach sRGB. Ein `ShaderMaterial` ohne Composer braucht `#include <colorspace_fragment>`.
6. **Telefon:** Weniger Teilchen bei `matchMedia("(pointer: coarse)")`. Die Teilchenzahlen stehen in den Rezepten (380 k → 160 k, 262 k → 65 k).
   `?test` halbiert die Grösse und spart Teilchen. So läuft auch die Prüfung ohne Grafikkarte.
7. **Aufräumen:** `entsorgen()` gibt Geometrien, Materialien, Render-Targets und den Composer frei. Beim Fotowechsel ruft `starte()` das auf.
8. **Zufall mit Startwert** (Mulberry32 oder ein linearer Kongruenzgenerator). Dann zerfällt dasselbe Foto bei jedem Laden gleich.

## Gerüst

```js
import { starte, filmlook, anteil, inOut, weich, simulation, TEST, GLSL_RAUSCHEN } from "./gemeinsam.js";
starte("name", ({ renderer, foto, B, H }) => {
  // foto: { textur (sRGB), leinwand, pixel (ImageData), hell(u, v) → 0..1 }, schon deckend auf B × H zugeschnitten
  const look = filmlook(renderer, szene, kamera, { staerke, radius, schwelle, saum, korn, vignette });
  return { dauer: 12, bild(t) { /* Uniforms aus t */ look.render(t); }, entsorgen() { /* dispose */ } };
});
```

`starte()` baut die Bühne, eine Leiste (Abspielen, Zeitleiste, «Foto …», «Video», Format 4:5/9:16) und `window.__film` für Tests und Export.
`?bild=/pfad.jpg` lädt ein Foto, ohne Angabe kommt ein Testbild.
Zeitkurven: `anteil(t, a, b)` gibt 0..1, dazu `weich`, `inOut`. Eine Phase sieht typisch so aus: `inOut(anteil(t, 1, 4)) * (1 − inOut(anteil(t, 8, 10)))`.

## Die Rezepte

### 1 Partikelwolke – zustandslos (`partikel.js`)
- Ein Punkt je Rasterzelle (2 px, auf dem Telefon gröber). Attribute: `position` (Heimat), `aUv`, `aZufall`.
- Im Vertex-Shader: Farbe aus der Foto-Textur, Startzeit je Teilchen. Helle Stellen lösen sich zuerst: `start = 0.6·(0.55·(1−hell^0.6) + 0.45·zufall)`.
- Bewegung: erst Relief nach Helligkeit (z), dann **zwei Schritte durch ein Curl-Feld** und Ausdehnung. Mehr als zwei Schritte kosten auf dem Telefon zu viel.
- Punkte im Foto quadratisch und 1,25-fach überlappend (sonst Lücken), gelöst als **glänzende Kugel** (siehe «Teilchen als Kugeln»).
- Die Rückkehr läuft mit weiterlaufender Zeit im Feld. Darum ist sie ein anderer Weg und kein Rückwärtsspulen.
- Fallstrick: Helle Teilchen × Bloom ergeben weissen Brei. Aufhellen nur `1 + 1.8·los·hell`, Bloom-Stärke an `auf` koppeln.

### 2 Relief – eingebautes Material erweitern (`relief.js`)
- `PlaneGeometry` mit einer Ecke je 2,5 px. Höhe ist die geglättete Helligkeit; die Ableitung `aGrad` (dh/dx, dh/dy) wird auf der CPU gerechnet.
- `onBeforeCompile` ersetzt drei Teile:
  - `begin_vertex`: `transformed.z += aHoehe·uTiefe`
  - `beginnormal_vertex`: `normalize(vec3(−aGrad·uTiefe, 1))`. Das ist die **exakte Normale bei jeder Tiefe**, ohne Neuberechnung.
  - nach `emissivemap_fragment`: Höhenlinien mit `fwidth`, also auf jeder Grösse einen Pixel fein, verstärkt unter einer Scan-Linie.
- Licht: ein flaches Streiflicht mit Schatten (PCF, `normalBias`), das einmal um das Relief wandert, dazu ein kupferfarbenes Gegenlicht und ein schwaches Hemisphärenlicht.
- Die Kamera kippt bis 58° über die Fläche.

### 3 Splitter – Explosionszeichnung (`splitter.js`)
- Voronoi aus einem verwackelten Raster. Jede Zelle wird mit Sutherland–Hodgman an den Mittelsenkrechten der 5 × 5 Nachbarn beschnitten.
- Jede Scherbe hat Vorderseite (Foto), Rückseite und Schnittkanten. Alles liegt in **einer** BufferGeometry mit `aMitte`, `aZufall` (Achse + Wert) und `aSeite`.
- Vertex-Shader: Flug f je Scherbe (innen zuerst), Drehung um eine Zufallsachse (Rodrigues), Weg **vor allem in die Tiefe**.
  Flach (f = 0) ist das Foto lückenlos. Das funktioniert nur, weil die Vorderseiten bei z = 0 liegen.
- Gemessen: Seitlich weit fliegende, stark drehende Scherben lassen nichts vom Foto übrig. In Tiefenschichten mit wenig Drehung bleibt das Gesicht im Flug lesbar.
- Fallstrick: Glühende Kanten über 1 plus Bloom legen einen orangen Nebel über alles. Kanten bei 0,2–1,1 halten, Bloom-Schwelle 0,85.

### 4 Feedback – TouchDesigner (`feedback.js`)
- Zwei `WebGLRenderTarget` (HalfFloat) im Wechsel. Ein Durchgang macht:
  - Kaleidoskop (6 Spiegel) als Mischung
  - Zoom > 1, Drehung, Rauschverschiebung
  - Farbdrehung im YIQ-Raum, Zerfall 0,93
  - Einspeisen der Sobel-Kanten des Fotos
- **Maximum statt Summe:** `max(alt, kante·ein)`. Mit `alt + kante` schaukelt sich die Schleife auf das 1/(1 − Zerfall)-fache auf, und nach 2 s ist alles weiss (gemessen).
- **Das Foto nie in die Schleife:** Es wird nur in der Anzeige überblendet.
- **Feine Höhenlinien statt Sobel einspeisen** (Rückmeldung: «solche Konturen müssen feingliedriger sein»): Helligkeit aus der Mipmap (`textureLod(…, 2.0)`), Linien über `fwidth`, also immer etwa einen Bildpunkt breit. Sobel-Kanten waren je nach Kontrast zwei bis vier Bildpunkte breit.
- Zoom je Bild gross genug (≥ 1,5 %) und Zerfall um 0,85: Dann bleiben die Spuren einzelne Linien, statt zu einem milchigen Brei zuzuwachsen. Linien höchstens 0,8 hell, Ergebnis auf 1 begrenzen.
- Die ausgearbeitete Fassung steht in Bildfragmentieren (Ablauf «Echo»), mit der Zahl der Höhenlinien nach der Unruhe des Fotos.

### 5 Glas – exakte Brechung ohne Raymarching (`glas.js`)
- Ein konvexes Polyeder ist der Schnitt von Platten |n·p| ≤ r: Dodekaeder 6 Normalen, Ikosaeder 10.
  Ein- und Austritt eines Strahls sind dann exakt (Slab-Methode). Das ist billiger und schärfer als Raymarching.
- **Formwandel über die Radien:** (1 | 1,3) Dodekaeder → (1 | 1,06) Geode, ein abgestumpftes Ikosaeder → (1,3 | 1) Ikosaeder.
- Je Farbkanal eine Brechzahl (1,46 / 1,505 / 1,55) ergibt Spektralsäume. Beim Austritt wird erneut gebrochen, bei Totalreflexion gespiegelt.
  Das Ergebnis wird auf die Fotoebene hinter dem Körper projiziert.
- Kanten: Abstand der zweitnächsten Fläche ergibt feine helle Linien, vorn kräftig, hinten durch das Glas schwach.
  Fresnel nach Schlick mit Umgebungsverlauf und zwei Glanzlichtern. 2 × 2 Abtastungen je Pixel.
- Kurz so gross, dass man das ganze Foto durch das Glas sieht. Das ist der stärkste Moment.

### 6 GPU-Physik (`gpgpu.js`)
- `GPUComputationRenderer(S, S, renderer)`, S = 512 (Telefon 256). Variablen `textureLage` (xyz, w = Zufall) und `textureTempo`. Die Heimat liegt in einer `DataTexture`.
- Kräfte:
  - Stosswelle als Gauss-Puls in der Zeit
  - Rauschfeld gemischt mit Curl
  - Strudel 1/(0,25 + r²)
  - Feder nach Hause, Dämpfung wächst mit der Feder
  - **weiche Grenze**, sonst fliegen die Teilchen aus dem Bild (gemessen)
- Zwei Teilschritte je Bild. Die Punktgrösse ist nach oben begrenzt, sonst entstehen nahe der Kamera Riesenflecken.
- `zuruecksetzen`: `gpu.renderTexture(start, rt)` für beide Render-Targets jeder Variable.
- **Teilchen als Kugeln** (Rückmeldung zu weichen Punkten: «zu wenig kontrastreich und glänzend»): im Fragment-Shader aus `gl_PointCoord` die Normale einer Kugel `vec3(p, sqrt(1 − r²))`. Daraus Licht von links oben (`0.18 + 0.95·diff`), dunkler Rand (`0.55 + 0.45·n.z`) und ein weisser Glanzpunkt (`pow(…, 36)`); der Rand ist hart mit nur schmaler Kante. In TSL dasselbe mit `uv()` (siehe `tsl.js`).
- **Curl oder Rauschfeld:** Curl ist divergenzfrei und verteilt gleichmässig (Rauch, Schnee). Ein normales Rauschfeld lässt Teilchen zu Bändern und Tüchern zusammenlaufen. Das wirkt viel stärker (Rezept 7).

### 7 WebGPU mit TSL (`tsl.js`)
- `instancedArray(typedArray | n, "vec3")` als Storage-Buffer. Compute mit `Fn(() => { … })().compute(N)`, ausgeführt mit `renderer.compute(knoten)`.
- `SpriteNodeMaterial` mit `positionNode = buffer.toAttribute()` und `new THREE.Sprite(mat)` mit `count = N`.
- Bloom: `pass(szene, kamera).getTextureNode("output")` und `bloom(…)` aus `three/addons/tsl/display/BloomNode.js` in einer **`RenderPipeline`**.
  Bis r182 hiess sie `PostProcessing`; das gibt jetzt eine Warnung.
- `await renderer.init()` beim Erstellen, danach `render()` und `compute()` synchron. `renderAsync()` ist veraltet.
- **WebGL-Rückfall:** Ohne WebGPU (ältere Browser, manche Linux-Systeme, Chromium ohne Grafikkarte) läuft derselbe Code über WebGL 2. Dabei gibt es zwei gemessene Fallen:
  1. Storage-Buffer liegen doppelt vor (Transform Feedback). Das Zeichnen liest je nach gerader oder ungerader Zahl von Compute-Aufrufen den neuen oder den vorigen Stand.
     Abhilfe: vor dem Zeichnen ein Schritt mit `dt = 0`, dann stehen beide Hälften gleich.
  2. Der Renderer legt seinen WebGL-Kontext ohne `preserveDrawingBuffer` an. Abhilfe: einen eigenen Kontext als `context` übergeben (siehe `webgpu()` in `tsl.js`).
     Die Ausgabe deckend machen (`vec4(…rgb, 1)`), der Canvas hat immer Alpha.
- Echtes WebGPU ist hier nicht geprüft (Chromium ohne Grafikkarte hat kein `navigator.gpu`). Beim ersten Einsatz auf einem echten Gerät einmal ein Video exportieren und anschauen.

## PHORMA II: weitere Rezepte (seit 17. Oktober 2026)
Ausgearbeitet und geprüft in `alpha/phorma-ii/` – das Gewebe (13) seit dem 18. Oktober 2026 in `alpha/phorma-iii/`, einer eigenen Anwendung (keine eigenen Beispiele hier; dort lesen). Dieselben Grundregeln: Funktion der Zeit, Simulationen in festen Schritten, Anfang dunkel, Ende exakt beim Foto.
Aufbau: `analyse.js` (ohne DOM, im Worker) versteht das Foto, `buehne.js` mischt die Effekte, `physarum.js`, `stich.js`, `tiefe.js`, `tuch.js` sind die Rezepte.

### 8 Physarum – Agenten auf der GPU (`physarum.js`)
- Agenten (x, y, Richtung, Zufall) in einer Float-Textur S × S (512², Telefon 288²); je Schritt drei Durchgänge: bewegen (drei Fühler riechen Spur + Nahrung, drehen, gehen), Spur legen (`THREE.Points`, ein Punkt je Agent, Blending Eins + Eins in ein HalfFloat-Ziel), verlaufen (3 × 3 mitteln, Zerfall).
- Werte, die ein Zellennetz geben statt dicker Röhren: Fühlerwinkel 0,62, Drehung 0,42, Fühlerabstand 12 px, Schritt 1,2 px, Zerfall 0,86, Verlaufen 0,3.
- Nahrung = Kanten + etwas Helligkeit; ihr Gewicht steigt von 0,4 auf 11, dann legt sich das Netz auf die Formen. Keime an den Maxima der Nahrung mit Mindestabstand: die Agenten strömen sternförmig aus (schönster Moment).
- **Gemessen:** Spur p90 ≈ 5–14, p99 ≈ 100–190. Mit `1 − exp(−T·0,14)` war alles weiss; richtig ist 0,016. Die Spur-Menge je Agent mit 512²/N skalieren, sonst ist das Netz auf dem Telefon zu dunkel.
- **Bloom macht hier grauen Dunst** über das ganze Bild (gemessen: ohne Bloom ist der Grund schwarz). Stärke 0,28, Radius 0,15.
- Wiedereinstiegspunkte alle 120 Schritte (Kopien der Agenten- und Spurziele); Sprung zurück lädt den letzten davor statt von vorn zu rechnen.

### 9 Stich – Kupferstich aus Strömungslinien (bis 17. Oktober 2026 in PHORMA II, im Verlauf von Git: `alpha/phorma-ii/stich.js`)
- In PHORMA II durch die Morphogenese (12) ersetzt (Rückmeldung nach drei Fassungen: «diese Stich-Optiken mag ich nicht besonders»). Lehre: Linienbilder wirken schnell technisch/topografisch; organische, flächige Strukturen kamen besser an.
- Richtung aus dem Strukturtensor (Sobel → Jxx, Jxy, Jyy, zweimal geglättet: fein + 0,4 · grob, dazu ein winziger waagrechter Grundzug für ruhige Flächen). Bilinear **im doppelten Winkel** (cos 2θ, sin 2θ) abtasten, sonst kippt die Richtung.
- Gleichmässig verteilte Linien nach Jobard & Lefer: Abstand d (7 px bei 1080), Abbruch bei d/2 zu anderen Linien, neue Keime bei ±d neben jeder Linie, danach ein Raster für Inseln. Ein Gitter mit Zellen der Grösse d macht es schnell (≈ 1 s für 1080 × 1350 auf der halben Grösse).
- Alle Linien als Bänder in einer Geometrie; die **Breite rechnet der Fragment-Shader Bildpunkt für Bildpunkt** aus der Helligkeit (Kante mit `fwidth`). Hauptlage höchstens 0,8 der Bahn, sonst wird es eine Fläche.
- Die kreuzende Lage nur, wo die mittlere Kantenstärke der Linie > 0,12 ist: in ruhigen hellen Flächen (Himmel) gab sie ein technisches Gitter.
- **Helle Fotos auf Papier:** Auf Schwarz bedeutet hell = breit; ein helles Foto läuft dann weiss zu (Rückmeldung: «sieht wie meistens nicht gut aus»). Wie ein Stecher nach dem Bild entscheiden: mittlere Helligkeit > 0,45 → dunkle Tinte auf Papier (je dunkler, desto breiter), sonst Licht auf Schwarz. Den Ton immer auf den Umfang des Bilds strecken (3–97 %), Breite `pow(t, 1,25)` (Mitteltöne schmaler), höchstens 0,75 der Bahn. Bloom auf Papier aus, auf Schwarz 0,12.
- Zeichnen nach Wichtigkeit (Kantenstärke entlang der Linie), Start ∝ Rang^0,6, Stiftspitze `exp(−Abstand/16 px)`. Am Ende werden die Striche breiter, darunter blendet das Foto auf.

### 10 Tiefe – das Foto wird Raum (`analyse.js`, `tiefe.js`, `tiefe-ki.js`)
- Ohne KI: nah ist unten, scharf (Laplace-Energie), gegen die Mitte, satt; fern der helle, ruhige Himmel oben. Grob gemischt, stark geglättet, dann **zweimal ein geführter Filter** (He et al.) mit der Helligkeit: so folgt die Tiefe den Kanten. Plausibel, aber nur eine Schätzung (eine Sonne gilt z. B. als nah).
- Mit KI: transformers.js 3.8.1, `pipeline("depth-estimation", "onnx-community/depth-anything-v2-small")`, WebGPU sonst WASM; Ausgabe ist inverse Tiefe (gross = nah), durch denselben geführten Filter. In der Cloud-Sitzung nicht prüfbar (Hugging Face und jsDelivr gesperrt) – geprüft ist nur der Rückfall.
- Netz 16 % grösser als das Bild (uv über 0..1 hinaus, Textur am Rand gestreckt): sonst blitzt beim Schwenk Schwarz an den Rändern.
- Gestreckte Maschen an Tiefensprüngen nicht schwarz machen (sah aus wie dicke schwarze Kurven), sondern als feine kupferne Schnittkanten zeigen.
- Scan: eine Ebene gleicher Tiefe wandert von nah nach fern, dahinter Linien gleicher Tiefe über `fwidth`. Tiefenschärfe als eigener Durchgang: Unschärfekreis im Alpha, Sammeln auf einer Goldwinkel-Spirale.

### 11 Tuch – Stoffsimulation (`tuchsim.js`, `tuchrechner.js`, `tuch.js`)
- PBD auf dem Prozessor (exakt wiederholbar): 72 × 90 Punkte, Abstände längs/quer (1), diagonal (0,7), über zwei Maschen (0,12), 4 Iterationen, 120 Teilschritte je Sekunde; Verlet mit Dämpfung 0,992.
- **Nie im Zeichnen simulieren** (gemessen: ein Sprung ans Ende = 1000 Teilschritte am Stück, 18 s Stillstand; auf dem Telefon stürzte die Seite ab). Ein Worker rechnet die ganze Bahn einmal voraus und speichert sie je Filmbild (≈ 20 MB Float32); gezeichnet wird nachgeschlagen und zwischen zwei Filmbildern linear gemischt (auch für die Proben der Bewegungsunschärfe). Video und Standbild warten auf `bereit`.
- Tempo der inneren Schleife: `Math.hypot` ist in V8 langsam (Faktor 2,3 gemessen), Indizes als `Int32Array`, Lagen als `Float64Array`, «festgehalten» als `Uint8Array` statt `includes`; das Rauschen der Böen nur einmal je Filmbild. 72 × 90 Punkte: 4,2 s in Node, 52 × 65 (Telefon): 2,4 s.
- Wind wirkt **entlang der Normalen** mit der Relativgeschwindigkeit (`dot(n, w − v)·n`), Böen aus Rauschen plus eine Welle, die durch das Tuch läuft. Oben fünf Haken: die Kante wirft Bögen wie ein Vorhang.
- **Riffeln** (Knicken über eine Masche beim Stauchen, gemessen beim Glattziehen): die Tiefe mit den Nachbarn mitteln, 0,04 immer, im Bild bis 0,44.
- Gezeichnet doppelt so fein (Catmull-Rom zwischen den Punkten), `MeshPhysicalMaterial` mit `sheen`, Selbstschatten, Streiflicht von links oben und kupfernes Gegenlicht. Die Kamera tritt zurück, solange es weht.
- Ende exakt: alle Punkte an ihren Platz, Farbe 0 und Emission = Foto (wie beim Relief).

### 12 Morphogenese – Reaktion-Diffusion (bis 17. Oktober 2026 in PHORMA II, im Verlauf von Git: `alpha/phorma-ii/muster.js`)
- Technisch gelungen, gefiel aber nicht («die Morphogenese gefällt mir nicht») und ist wieder entfernt. Lehre wie beim Stich: grafische Flächenmuster kommen bei diesem Auftraggeber nicht an; räumliche, physische, konstruierte Effekte schon (Relief, Glas, Tuch).
- Gray-Scott mit Du = 1, Dv = 0,5, dt = 1, Laplace 3 × 3 (0,2 Kanten, 0,05 Ecken), 600 Schritte je Sekunde eigener Zeit; Zustand (U, V) in Float-Zielen, **nur mit `texelFetch` gelesen**, auch die Anzeige (bilinear von Hand): Telefone ohne `OES_texture_float_linear` liefern sonst Schwarz.
- **Keime mindestens 7 × 7 Punkte** (U 0,5, V 0,25): gemessen sterben einzelne Punkte, 3 × 3 und 5 × 5 im Labyrinth-Bereich ab. Dicht an Kanten (Wahrscheinlichkeit 0,004 · Kantenstärke), vereinzelt sonst (0,0003), dazu die Keime von Physarum.
- Erst überall f 0,055 / k 0,062 (Labyrinth, füllt das Bild), dann f, k nach dem Ton: dunkel (0,018 / 0,060) leer, Mitte Flecken, hell (0,056 / 0,062) Labyrinth – ein lebendes Druckraster.
- Anzeige: Maske `smoothstep(0,17, 0,27, V)`, Normale aus dem Gefälle von V, Glanzlicht `pow(…, 36)`, kupferne Kanten; Bloom schwach (0,12, Radius 0,15), sonst Dunst.
- Ende weich: zuerst füllt das Foto die Lücken (`foto · hinter · (1 − Maske)`), dann löst es die Muster ab, wo sie dicht sind; mit einer Schwelle allein erschien es fast auf einen Schlag.
- Vorschau: höchstens 400 Schritte je Bild aufholen (Video exakt), Wiedereinstiegspunkte alle 2 s.

### 13 Gewebe – Bänder aus feinen Linien, vom Ton gesteuert, und die Irrfahrt (seit 17. Oktober 2026; seit 18. Oktober 2026 PHORMA III, `alpha/phorma-iii/`: `gewebe.js`, `irrfahrt.js`, `kurven.js`, `ton.js`, `tonspur.js`)
- Vorbild: ein Video von Pauric Freeman (Modularsynthesizer, auf dem Bildschirm schwarze, durchscheinende Bänder aus feinen Linien auf Weiss, grosse kalligrafische Zeichen, kurze Textfragmente mit dunklem Blockcursor, Schnitte ins Schwarz). Wunsch: «wie wir solche Effekte hinbekommen, für Texte und Audiofiles», «vor allem Video 2».
- **Ton vorab zerlegen** (`ton.js`, ohne DOM): je Filmbild RMS und drei Bänder (Einpol-Filter 200 Hz / 3 kHz), auf das 95. Perzentil normiert, schnell herauf, langsam herunter. Fluss = Anstieg der Bänder (log1p(50x)) **gegen das Maximum der beiden Bilder davor, minus 0,06** – ohne das erzeugt schon ein stehender Ton von Bild zu Bild Einsätze (gemessen). Einsätze über einer gleitenden Schwelle; Schnitte = die stärksten, ≥ 2 s auseinander; «Zeit der Musik» = ∫(0,15 + laut), springt bei Schnitten. Ohne Tonspur ein wiederholbarer Ersatz.
- **Linien aus dem Bild:** Marching Squares (`kurven.js`) auf dem Text (Stufe 0,5) oder dem geglätteten Foto (Stufen 0,32 / 0,5 / 0,68), die längsten Kurven gleichmässig abgetastet, **dann viermal [¼ ½ ¼] geglättet** – Serifen und Pixelstufen werden sonst zu Splittern.
- **Bänder ohne Simulation:** je Kurve NH Lagen (90, Telefon 56), Lage k zeigt die Kurve zur Zeit t − k/45 s; der Vertex-Shader rechnet die Lage aus der Zeit (Ton als Textur, `texelFetch`): eigene kleine Drehung je Kurve, **eine gemeinsame Drehung und ein gemeinsames Rauschfeld für alle** (sonst zerfällt die Wolke in Einzelteile, gemessen), wenig Drift. Alpha je Lage `0,2 · (1 − k/NH)^1,3`, Tinte vormultipliziert auf Papier – Überlagerungen werden dunkel wie im Vorbild. Erst wenn sich das Zeichen löst, sind die Linien sichtbar.
- **Text als Bild** (`textbild.js`): Inter Display Semibold (seit 18. Oktober 2026 auf Wunsch eine moderne Grotesk; vorher Newsreader kursiv) auf Papier, kleiner werdend bis er passt; Fragmente (zwei Zeichen, Instrument Sans dünn und grau, hoher Blockcursor in Nachtblau) bei Einsätzen, getippt, in `film.js` über das Bild gelegt. Schnitt: 4 Bilder weisse Tinte auf Schwarz.
- **Tonspur im Video** (`tonspur.js`): `AudioEncoder` AAC (sonst Opus), 4096er Stücke, am Ende 1,2 s ausgeblendet, mit mp4-muxer 5.2.2 (lokal in `vendor/`, als `.js` – `.mjs` liefert der lokale Server als `application/octet-stream`, das Modul lädt dann nicht) zusammen mit den H.264-Stücken geschrieben. Mit Tonspur dauert das Gewebe so lange wie sie (ohne Tempo, mindestens 10 s), die Vorschau spielt sie mit.
- **Musik sichtbar machen** (Rückmeldung: «scheint einfach ein wenig rumzuwabern»): gemessen mit der mittleren Bildänderung je Filmbild gegen die Hüllkurve der Einsätze (Korrelation) und einer Zeile Zeichen je Bild unter den Einsätzen – ein stetiges Rauschen überdeckt jeden Schlag. Darum: die «Zeit der Musik» vor allem bei Schlägen weiterlaufen lassen (0,05 + 0,5 · laut² + 8 · Stoss), dazu Stösse direkt auf Form (Bass: aufreissen, drehen), Ganzes (Schwung um ± Stärke in 0,3 s), Tinte und Kamera (Ruck). Spektrum je Filmbild (FFT) quer zur Linie, zwischen Bändern interpoliert (sonst Zacken). **Haare statt Bänder**, wenn sich aufeinanderfolgende Lagen zu weit unterscheiden: Lagen dichter (1/90 s), Einsätze über drei Bilder einsetzen lassen, schnelles Rauschen (Flirren) langsam halten, weniger und kürzere Kurven, Zoom ≤ 1,9. Kamera: je Schnitt eine Einstellung als Uniform (gilt für alle Lagen gleich, erzeugt keine Haare). Aufsummierte Schwünge vor dem Ende um ganze Umdrehungen kürzen, sonst entsteht beim Zurückdrehen eine Spirale.
- **Struktur** (Punkte, Netz, Knoten, Moiré, Fraktal; 18. Oktober 2026, im Verlauf von Git `alpha/phorma-ii/struktur.js`) wieder entfernt: «einfach paar Formen, die unmotiviert zoomen». Lehre: abstrakte Motive ohne Bezug wirken beliebig; die Dynamik muss aus der Musik kommen, nicht aus Wachsen und Zoomen.
- **Dynamik wie Pauric Freeman** (im Vorbild Bild für Bild bei 8 fps nachgesehen): jedes Bild erscheint mit einem Ton (in 2–3 Bildern), hält 0,5–1 s fast still und verschwindet; kräftige Schläge schneiden hart auf ein anderes Bild, auch sekundenlang Weiss auf Schwarz. Umgesetzt: Tor-Hüllkurve (auf, halten, abklingen) als Deckkraft; Zustände je kräftigem Einsatz mit eigenem Zufall (Fläche, Kamera, Auswahl, Nacht, Zeichen). Die Fläche: Lagen nebeneinander statt hintereinander in der Zeit – `q = p0 + s · breite · (rausch(p0·1,0, s·2,0) + 0,35 · rausch(p0·2,2, s·4,5))`, dazu ein Drall um die Mitte der Kurve; so ist sie dicht, auch wenn sie stillsteht (Spuren der Bewegung waren entweder dünn oder zerfielen in Haare). Auf Papier Dichte 0,34 je Lage, auf Schwarz 0,16 (weiss addiert sich schneller).
- **MP4 nie am Stück** (Telefon: «Array buffer allocation failed» bei 100+ MB): mp4-muxer mit `StreamTarget` und `fastStart: { expectedVideoChunks, expectedAudioChunks }` (moov vorn reserviert), die Bilder gleich im `output` des Encoders hineingeben, die Teile sammeln (Lücke für moov mit Nullen, späte Schreibvorgänge in die Teile kopieren) und als `new Blob(teile)` ausgeben; geprüft: byte-gleich mit `ArrayBufferTarget`.
- **Klang des Verfrickelns messen** (ohne Zuhören): Klicks an einem weichen Prüfsignal (Töne mit Kosinus-Einsätzen, die ineinander abklingen – echte Musik hat zu viele natürliche Transienten) als Spitzen der zweiten Ableitung über ihrem gleitenden Mittel; Lautheit nach BS.1770 (K-Filter für die Abtastrate neu berechnet, Gates −70 / −10). Befunde: Bitcrush mit hartem Halten klickt (Tiefpass ~3,5 kHz über den Stufen, halb beimischen), ein Kompressor mit Spitzenerkennung zuckt mit (Effektivwert über 30 ms), ein Begrenzer mit sofortigem Angriff klickt (1 ms).
- **Logo aus dem Effekt statt Abspann** (Rückmeldung: «der Weissraum einige Sekunden vor dem Logo ist unnötig. Bitte direkt vom Gewebe zum Logo»): die Schlaufe des Signets als letzter Satz Kurven (dieselbe Formel wie `sketchory/signet.js`, in Analysepunkte umgerechnet und mit `abtasten` auf P Punkte gebracht), Wechsel mit dem Beginn der Phase «logo»; dort Fläche aus der Schlaufe, die sich mit `ruhig` (1,6–2,8 s) glatt legt, als Strich mit `uDicke · (lage − 0,5)` quer zur Kurve verbreitert (90 Lagen ergeben ~3 px). Schrift, Cursor und Punkt in 2D darüber; Glitch-Streifen auf das ganze zusammengesetzte Bild (Gewebe + Schrift auf eine Leinwand in Pixelgrösse, dann in Streifen versetzt; dahinter Papier, sonst blitzt der schwarze Grund durch). Stottern = Bühne und Schrift mit einer früheren Zeit zeichnen (das Gewebe hängt nur von der Zeit ab). Farbgebung des letzten Zustands übernehmen (`zustandBei` an derselben Stelle wie im Shader). Leeres Papier messen: Anteil Pixel, die deutlich (> 30 Stufen) vom Median abweichen – Streuung der Helligkeit taugt nicht (Vignette und Korn). Bei wenigen Kurven (Nur Ton: 10) wählt ein Anteil von 0,12 oft keine – immer eine Pflichtkurve (`uPflicht`).
- **Irrfahrt** (PHORMA III, `irrfahrt.js`; Vorbild: Faden im Lichtwürfel, der mit der Musik zu Rauch aufquillt): Zufallsweg je Zustand vorab als Zeile einer Float-Textur (PN = 2048 Punkte), das sichtbare Stück hinter einem Kopf (`uKopf`, `uSchritt` – Schritt > 1 zeigt einen ganzen Umriss oder die Logoschlaufe), S Fäden als LineSegments, die den Weg mit eigenem Rauschen (zwei Oktaven, Phase = Zeit der Musik) und eigener Verzögerung abtasten; additiv (One, One). Fallen: ein reiner Zufallsweg (starke Richtungswechsel) bleibt auf einem Fleck (Weite ~ √N) – Richtung halten und das Zittern getrennt je Punkt addieren; die Helligkeit je Faden nicht 1/√S, sonst ist das Bündel aufeinander zehnfach überbelichtet (2,4–3,4 / S); laut nur heller, nicht breiter, gibt ausgebrannte Klumpen – breiter und heller zugleich. Gemessen gegen das Vorbild: Korrelation Lautstärke ~ mittlere Helligkeit und ~ Bildänderung. Bei Sprache nur kräftige, auseinanderliegende Einsätze (Stärke ≥ 0,6, ≥ 0,4 s Abstand) für neue Lagen und Störungen erst ab 0,75 – sonst springt und flackert der Würfel bei jeder Silbe und wirkt verzogen. **Haarlinien und Bewegungsunschärfe:** Prüfbilder immer mit derselben Probenzahl wie der Export rechnen – mit 8 Proben wurden die Würfelkanten beim Zoomstoss zu Stapeln, bei einem Sprung im Verschluss lagen zwei Würfel übereinander und ein gemitteltes Negativ wusch das Bild grau aus. Abhilfe: Proben nur aus derselben Lage (Schlüssel je Effekt), dünne Linien scharf aus der letzten Probe nach dem Bloom (mit Gewicht = Probenzahl), Negativ binär. **Drahtwürfel und Necker-Täuschung:** mit wenig Perspektive (langes Objektiv) kippt ein Drahtwürfel für das Auge beim Drehen, er scheint sich zu verziehen – die Kanten nach der Tiefe abdunkeln (vorn hell, hinten 5 %), dann ist die Lage eindeutig.
- **Drahtwürfel, der nicht «verzogen» wirkt (PHORMA III, Irrfahrt/Lichtwürfel)**: genug Perspektive (35°, vordere Kante gut 1,5-mal so lang wie die hintere) – mit einem langen Objektiv (15°) wird der Drahtwürfel fast orthografisch, und beim Drehen kippt für das Auge, welche Seite vorn ist (Necker); Zoom und Versatz nach der Projektion (`c.xy = (c.xy + versatz · c.w) · zoom`), nie im Raum, sonst werden seitliche Würfel schräg angeschnitten; Kanten als Bänder (zwei Dreiecke je Kante, im Bild quer verbreitert, mit `smoothstep` an den Rändern) statt `LineSegments` (die bleiben 1 Pixel). Kontrast für feine Linien auf Papier: nicht mit einer S-Kurve (die hellt die meist hellgrauen Haarlinien auf), sondern Weisspunkt und Gamma (Papier → Weiss, Grautöne dunkler).
- **Bild folgt dem Ton (Video-Scratching, PHORMA III)**: der Ton-Ablauf schreibt einen Fahrplan (je 1/240 s Quellstelle und Fader) – Scratch, Hüpfer und die Scheiben des Verfrickelns –, das Bild liest die Filmspur an dieser Stelle; Tempo = Ableitung des Fahrplans nur innerhalb eines Abschnitts, Schmier und Farbsaum nach Tempo, Fader als Helligkeit, Bewegungsunschärfe nur innerhalb eines Abschnitts. So bleiben Bild und Ton ohne Abgleich synchron.
- **Video-Cracks im Shader (PHORMA III, `video.js`, `risse.js`)**: *Datamosh* wie ein echter Decoder ohne I-Frame – Blocksuche (8 × 8, ±6, SAD an 3 × 3 Stellen, kleiner Strafterm für lange Vektoren) in ein Ziel mit einem Punkt je Block (Nearest), dann `alt(p − mv) + Rest(b(p) − a(p − mv))`. Ohne Totzone im Rest und ohne übersprungene ruhige Blöcke (Rest bei Vektor 0 klein) wird das Bild nach 10 Schritten graues Rauschen; mit beiden bleibt das alte Bild erkennbar und wird nur geschoben. Nach einem Schnitt die Bewegung aus dem Bild davor in der Quelle nehmen, nicht über den Sprung. Zustand nur als Zwischenspeicher (letzter und vorletzter Schritt im Ping-Pong-Paar; die Proben des Verschlusses fragen Schritt S−1 nach S), rückwärts neu ab dem stehenden Bild. *Pixel-Sortierung* ohne Compute: Odd-Even-Transposition je Spalte, ein Pass je Schritt, Maske aus dem Original (die Strecken bleiben, die Punkte wandern). *Slit-Scan* mit acht Zeitschichten als einzelne Sampler (Sampler-Arrays darf GLSL ES 3 nur mit konstantem Index lesen – die Schleifenvariable zählt nicht). *Makroblöcke*: Fehlerläufe über die lineare Blocknummer (Zeile × Spalten + Spalte), so laufen sie wie im Decoder bis ans Zeilenende weiter; Blöcke von 1/30 der Breite, sonst sieht man auf dem Telefon nur Striche. Uniforms immer über `.value` setzen, nie das Objekt ersetzen (three.js hält die Verweise). **Falle Texturgrösse:** three.js legt den Speicher einer Textur fest an (texStorage2D) – wechselt das Bild einer `THREE.Texture` die Grösse (Vorschau halb, Export ganz), schlägt jedes weitere Hochladen still fehl (`GL_INVALID_VALUE: Offset overflows texture dimensions`, nur als Warnung in der Konsole), und es bleibt das alte Bild stehen; bei anderer Grösse vorher `texture.dispose()`. Im Test zuerst die Vorschau, dann den Export zeichnen.
- **Video-Gefrickel aus dem Plan des Tons (PHORMA III, `bildfrickel.js`)**: der Verfrickler schreibt je Scheibe ihre Art mit (Scheibe, Wirbel mit Teilung, Korn), das Bild leitet daraus alles ab – Kacheln = Teilung des Wirbels (`fract(uv · n)`, mittig beschnitten nach `ny / nx`), Pixel = Bitcrush, Flecken aus anderen Zeiten = Körner (ein Pass je Fleck mit `discard` ausserhalb des Rechtecks, Ort und Grösse aus einem Hash der Nummer), Step-Sequencer-Streifen = die letzten Scheiben, Datamosh = harter Schnitt. Kein eigener Zufall im Bild: was man sieht, ist, was man hört.
- **Video bildgenau im Browser** (PHORMA III, `filmspur.js`): mp4box.js zerlegt MP4/MOV (die Proben ab dem Schlüsselbild vor dem Ausschnitt), VideoDecoder dekodiert, die Matrix der Spur gibt die Drehung (das Element `<video>` dreht selbst, VideoFrame nicht); WebM über das Spulen des Elements. Je Filmbild ein JPEG im Filmformat, entpackt erst bei Bedarf (Vorschau klein mit Vorausladen, Export gross mit `vorbereiten` vor jedem Bild). Testen ohne H.264 (Chromium von Playwright): ein MP4 mit VP9 im Browser bauen (VideoEncoder + mp4-muxer, `rotation`), jedes Bild trägt seine Nummer als Bitmuster.
- **Stimme säubern ohne Zuhören** (PHORMA III, `stimme.js`): Spektral-Gate mit Rauschen je Band aus den leisesten Momenten (Betrag geglättet, 5. Perzentil × 1,9 – an reinem Rauschen kalibriert; das 15. Perzentil aller Fenster versagt bei Sprache fast ohne Pausen), Verstärkung zeitlich und über Nachbarbänder geglättet. Messen: Sprachprobe mit espeak-ng erzeugen, Rauschen/Brummen/Raum mit ffmpeg dazumischen, dann den Pegel in den echten Pausen der sauberen Probe gegen die Sprache – das Grundrauschen als 10. Perzentil taugt dort nicht (Echos). Falle: der «leichte» Hall füllte die Pausen bei −33 dB; Ziel rund −40 dB. Scratching als Funktion Ort(t) je Zug (sin-Hin-und-Her, Fader-Rampen 3 ms), gelesen mit Hermite, Tiefpass nach |Geschwindigkeit|. Den Ausschnitt wählt man in der Anwendung (Wellenform mit Fenster, Regler «ab»/«Länge», Anhören des Rohen über eine AudioBufferSourceNode mit `start(0, von, dauer)`); erst schneiden, dann säubern. Drum and Bass erst einen Takt vor dem Gefrickel («kurz vor Gefrickel»).
- **Video als Quelle:** Standbild als Foto, Ton des Videos als Tonspur; die Kurven als Sätze in einer Textur (Zeile = Satz · NK + Kurve, `w = 0` für leere Plätze), der Vertex-Shader wählt den Satz nach `tk` (Zeit der Lage) gegen `uWechsel[23]` – ältere Lagen zeigen noch das vorige Bild, so geht es fliessend über. Bilder durch Spulen eines `<video>` (`seeked` abwarten, mit Zeitlimit); WebM aus `MediaRecorder` hat Dauer `Infinity` → einmal auf 1e7 spulen. Ohne Tonspur dieselben Ersatzkurven überall (`tonOderErsatz`), sonst laufen Schnitte von Gewebe und Fragmenten auseinander. Tonumfang vor den Höhenlinien auf 2–98 % strecken, sonst liefert ein dunkles Video kaum Linien.
- **Verfrickeln** (`frickeln.js`, ohne DOM, rund 0,5 s für 40 s Stereo): Scheiben an den Einsätzen (zu kurze an die vorige, lange in 0,5 s), Tempo aus dem Median der Einsatzabstände auf eine Oktave gefaltet (80–160 BPM), Sechzehntelraster; Anschläge je nach Taktposition und Bogen der Stärke, Markov-Wahl der Scheibe (weiter 55 %, gleich 25 %, Sprung 20 %), Varianten rückwärts / Tonhöhe durch Abtasten mit anderem Schritt / Bitcrush, Wirbel 1-2-4-8 am Taktende, Körnerwolken; Ein- und Ausblenden je Schnipsel 3 / 12 ms gegen Klicks; Bus: TPT-SVF-Tiefpass (Koeffizienten alle 32 Proben), Ping-Pong im punktierten Achtel mit dumpfer werdender Rückkopplung, Schroeder-Hall, tanh, Spitze −0,5 dB. Zufall mulberry32 je Wurf: dasselbe Stück bei jedem Aufruf.

### 14 Montage – das Foto in verschachtelten Rechtecken (seit 19. Oktober 2026, `montageplan.js`, `montage.js`)
- Vorbild: der Clip «UVA» (Porträt in Rechtecken, feine helle Ränder, Zahlentafeln, harte Schnitte im Takt). Der Plan ohne Grafik (testbar), gezeichnet als eine instanzierte Schar von Vierecken in einem Zug (höchstens 400), Zahlentafeln auf einer 2D-Leinwand je Schnitt darüber.
- Teilen nach Wichtigkeit (Tiefe nah und Kanten, grobes Raster mit Summenbild): nur in einer Zone um das Motiv, grosse und wichtige Felder zuerst, manchmal in Streifen. Entscheidend für den Look: **Teilfelder erben meist den Ausschnitt ihres Elternfelds** (q = (p − anker) / z + anker + o) – dann laufen die feinen Ränder über zusammenhängende, vergrösserte Stücke wie im Vorbild; jedes Feld mit eigenem Ausschnitt wirkte als buntes Mosaik zu wild.
- Gezogene Streifen: im Fragment-Shader ab einer Linie die letzte Spalte halten (`min(l.x, ab)`), am Bildrand klemmen. Nach einem Schnitt wächst die neue Aufteilung in wenigen Bildern (Verzug nach Stufe); Ende: Felder rasten nacheinander ein, dann exakt das Foto. Dasselbe Zeichnen schneidet am Schluss das Signet (2D-Leinwand als Textur, Wichtigkeit aus dem fertigen Signet, Zone nicht bis an den Rand, nur dichte Schnitte im doppelten Takt).

### 15 Wachstum – Differential Growth als leuchtende Linie (seit 19. Oktober 2026, `wachstumsim.js`, `wachstumrechner.js`, `wachstum.js`)
- Eine geschlossene Linie (Punkte im Ring): Glätten zur Mitte der Nachbarn, Abstossen aller Punkte im Radius R(x) aus dem Foto (Raster mit kleinen Zellen, je Punkt so viele Zellen ringsum, wie R reicht; Lagen nach Zellen sortiert kopieren), Teilen zu langer Kanten (> R/2). Wachstum: zufällige Teilungen und ein Druck nach aussen (Normale aus dem Umlaufsinn), beides nur wo Platz ist (wenige Nachbarn) und solange die Zahl der Punkte unter einem Plan liegt – so hängt der Ablauf nicht an der Rechenzeit.
- Stabil nur mit Schritt ≤ 0,2 · R: mit festem Höchstschritt (1 Punkt) schaukelte sich die Linie in dichten Stellen auf und teilte sich lawinenartig (20 000 → 160 000 Punkte).
- Wo sie wächst: Farbabstand zum ruhigen Bildrand (Porträt vor Wand), sonst Tiefe; der Abstand aus der Helligkeit im Tonumfang des Motivs. Die Tonwerte zusätzlich beim Zeichnen (heller und breiter im Hellen) – die Dichte allein liest sich zu schwach.
- Zeichnen: instanzierte Vierecke je Strecke, Abstand zur Strecke im Fragment-Shader, `side: DoubleSide` (die y-Spiegelung dreht die Windung), Mischen mit `MaxEquation`; wächst der Puffer, `geometry._maxInstanceCount = undefined` setzen – three.js zeichnet sonst nie mehr Instanzen als beim ersten Puffer.
- Mit Video: die Abstände je zwei Filmbilder aus einem kleinen Bild des Videos, die Maske aber fest vom Standbild – wechselt sie mit, schiebt sie die Punkte zusammen und die Nachbarsuche explodiert; die Nachbarsuche nicht nach einer Zahl abbrechen (zählt nur die oberen Zeilen, die Linie verzieht sich).

### 16 Traube – glänzende Perlen mit Tiefenschärfe in einer Kugel aus Fäden (seit 19. Oktober 2026, PHORMA III: `traubenplan.js`, `traube.js`)
- Vorbild: der Clip «UVA» (rote, glänzende Beeren und Schnüre in einem Knäuel aus weissen Fäden, Rauch, starke Tiefenschärfe, rote Glut). Zustandslos: der Plan (ohne Grafik, testbar) rechnet je Bild alle Perlen auf dem Prozessor (1120, Telefon 560 – 0,3 s je Bild in SwiftShader bei halber Grösse), sortiert sie nach der Tiefe und lädt die Lagen als Instanz-Attribute hoch.
- **Schnüre ohne Simulation:** der Kopf einer Kette läuft auf einer Lissajous-Bahn in der Zeit der Musik s; Perle j zeigt den Kopf zur Zeit s − j · dl mit dl = 1,55 · r / (mittleres Tempo) – so liegen die Perlen etwa um ihren Durchmesser auseinander, nach hinten kleiner (ein Wurm aus Beeren).
- **Kugel als Viereck** (`gl_FragCoord` nicht nötig): Normale aus dem Ort im Viereck, Licht von links oben mit wenig Umgriff (0,12 – mit 0,3 wirkten sie flach wie Plastik), Karmin fast schwarz im Schatten, Licht durch den Rand auf der Schattenseite, harter Glanzpunkt `pow(…, 80)`.
- **Tiefenschärfe je Perle statt als Nachbearbeitung:** Unschärfe im Raum b = Apertur · |d − Schärfe| / Schärfe, das Viereck r + b, Deckung `min(1, r²/b²) · (1 − smoothstep(|r − b|, r + b, ρ))` (Energie bleibt), unscharf zur mittleren Farbe. Hinten zuerst sortiert, vormultipliziert gemischt (One, OneMinusSrcAlpha). Danach ein Durchgang nur in die Tiefe, wo die Perle deckt (> 0,55): additive Fäden dahinter fallen weg, die davor bleiben. **Falle:** ganz nahe Perlen auf eine Höchstgrösse begrenzen, indem man r, b und das Viereck gemeinsam kleiner macht – nur das Viereck zu kappen gab eckige Flecken.
- Gemessen am Bild: in der Nähe mitten in der Traube war alles eine Wand aus unscharfen Flecken; die Kamera von aussen auf eine Kette am Rand und nur ein Drittel der Ketten, dann bleibt Schwarz zwischen den Flecken wie im Vorbild. Fäden in Strängen (sieben fast parallele) statt jeder für sich – einzeln wirkten sie wie ein gleichmässiger Wollknäuel. Farbsaum bei Haarlinien klein (0,0012), sonst farbige Säume.
- **Perlmutt** (Rückmeldung «mehr in Richtung Perlmutt-Schimmer»): `iri = 0.5 + 0.5 · cos(2π · (schicht + (0, ⅓, ⅔)))` mit schicht aus Blickwinkel (1 − n.z), Ort auf der Perle und einem Wert je Perle; als `(iri − 0,35) · 0,5 · Fresnel · Licht` dazu (um den Mittelwert, sonst wird die Perle nur milchig heller), der Glanzpunkt leicht mitgefärbt, der Schatten bleibt tiefes Karmin.
- **Falle NaN auf dem Telefon** (gemessen nur dort: das ganze Bild schwarz, in SwiftShader alles gut): `pow(x, y)` mit x < 0 oder pow(0, 0) und `smoothstep(a, b, x)` mit a ≥ b sind in GLSL nicht festgelegt; Grafikchips von Telefonen geben NaN, und ein einziger NaN-Punkt wird vom Bloom über das ganze Bild geschmiert. Typisch: `pow(sin(π · u), e)` am Ende einer Linie (sin(π) ist knapp negativ). Immer `max(…, 0.0)` vor `pow`, bei variablen Grenzen `max(b, a + ε)`, und im Fragment `if (!(wert >= 0.0)) discard;` (fängt NaN, weil jeder Vergleich mit NaN falsch ist).
- Logo: Perlen nach der Länge auf die Schlaufe (`perlenAufZuegen`, Halbmesser schwankt wie bei Beeren, Büschel daneben); die Fäden des Strangs je mit 0,16 der Helligkeit – voll überstrahlte der Strang mit Bloom das ganze Bild grau.

### Bühne: Zeitfront, Bewegungsunschärfe, Einrasten (`buehne.js`)
- **Zeitfront** statt Überblenden: die Pixel wechseln nach der Tiefe (nah zuerst), an der Front ein Spalt, der das alte Bild verzieht (Slit-Scan-Anmutung), Kupfer nur schwach (0,18), sonst ein Schleier.
- **Bewegungsunschärfe:** Weil jedes Bild nur von der Zeit abhängt, rechnet der Export 8 Proben in der halben Bilddauer davor und mittelt sie linear (Float-Ziel, Blending Eins + Eins). Simulationen laufen dabei nur vorwärts.
- **Ende exakt:** Jeder Effekt meldet `ende` (0..1), die Ausgabe mischt zuletzt das Foto. Ist es 1, zeichnet `film.js` das Foto selbst: verkleinert unterscheiden sich Mipmap-Textur und 2D-Verkleinerung um bis zu 40 Stufen (gemessen auf einem fein gezeichneten Bild).
- **Telefon** (Rückmeldungen: «reagiert nicht», «neues Bild laden, danach: Absturz»): Fotos beim Laden auf ≤ 2400 Punkte verkleinern und die volle Bitmap schliessen; beim Fotowechsel die alte Bühne sofort freigeben; Programme vorab einzeln übersetzen (`compile` + ein Bild in ein 4 × 4-Ziel je Programm, mit Pausen; nicht `compileAsync`, dessen Nachfragen nach dem Freigeben weiterlaufen); Karten in HalfFloat; Mischen in Float32 vermeiden (`EXT_float_blend`); `webglcontextlost` abfangen, aber nicht beim eigenen `forceContextLoss`; `?diagnose` zeigt Grafikchip, Erweiterungen und Blockaden.
- Abspann: das leuchtende Signet aus PHORMA I (`glanzSignet`, exportiert aus `alpha/bildfragmentieren/raum.js`) läuft auf derselben Bühne.
- Prüfen: `node --test tests/phorma-ii.test.mjs tests/phorma-iii.test.mjs`, `NODE_PATH=$(npm root -g) node tests/phorma-ii.e2e.mjs` und `… tests/phorma-iii.e2e.mjs` (Chromium mit `--use-angle=swiftshader`).
  Falle: Der Ersatz-Encoder liest die Bilder nie; dann hängt SwiftShader Minuten hinterher und Klicks warten. Einmal `gl.readPixels` wartet es ab.

## Filmlook (`filmlook()` in `gemeinsam.js`)
Die Kette ist RenderPass → UnrealBloomPass → eigener ShaderPass → OutputPass.
- Der ShaderPass macht Farbsaum (radial, zum Rand stärker), Korn je Bild und Vignette.
- Korn mit **Ganzzahl-Hash** (`uvec2`). Der übliche `fract(p·…)`-Hash erzeugt bei Pixelkoordinaten sichtbare Streifen (gemessen).
- Korn vor allem in den Mitteltönen (`4·l·(1−l)`), nicht im Schwarz.
- Bloom-Stärke in `bild(t)` an die Phase koppeln: ruhiges Foto 0,1, Spektakel 0,5–1,0.
- Schwelle so hoch, dass nur Glanz und Funken blühen (0,5–0,9).

## Video
`video(F)` in `gemeinsam.js` rechnet jedes Bild mit `await F.bild(i / 30)`, dann `new VideoFrame(canvas)`.
Daraus macht WebCodecs H.264, die Datei schreibt der MP4-Schreiber von Sketchory (`alpha/sketchory/mp4.js`).
- Das Bild muss im selben Task stehen, in dem `VideoFrame` liest. Deshalb gelten zwei Regeln:
  - WebGL immer mit `preserveDrawingBuffer: true`
  - nie `await` zwischen Rendern und Lesen, das auf einen anderen Task wartet
- Für Instagram umwandeln, wie im Skill ornament-video: `ffmpeg -i x.mp4 -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart y.mp4`.

## Prüfen
```bash
# Cloud-Sitzung: das CDN ist gesperrt → three einmal in den Scratchpad installieren
cd "$SCRATCH" && npm i three@0.185.1
cd /home/user/ornament-cloud
THREE="$SCRATCH/node_modules/three" NODE_PATH=$(npm root -g) node .claude/skills/threejs-spektakel/beispiele/pruefen.mjs            # alle
THREE=… BILD=/pfad/foto.jpg AUSGABE=/tmp/x NODE_PATH=$(npm root -g) node …/pruefen.mjs glas splitter --video                       # eigenes Foto, mit Video
```
- Je Beispiel wird geprüft: lädt ohne Fehler, fünf Bilder (5 %, 25 %, 50 %, 75 %, 98 %) nicht leer und verschieden, derselbe Zeitpunkt nach einem Sprung zurück gleich.
  `--video` exportiert mit einem Ersatz-Encoder, weil Chromium hier kein H.264 hat.
- **Die Bilder in `AUSGABE` immer anschauen** (als Kontaktbogen nebeneinander). Mindestens ein flaches Grafikbild, ein Porträt und ein feines Muster nehmen.
  Die meisten Fehler oben waren nur so zu sehen (weisser Brei, Farbnebel, leeres Bild, zerstreute Teilchen).
- Lokal: `node tools/serve-orma.mjs` und dann `http://localhost:8766/.claude/skills/threejs-spektakel/beispiele/glas.html?bild=/alpha/bildfragmentieren/beispiel.jpg`.

## In ein Werk übernehmen
- `.claude/` wird nicht veröffentlicht (GitHub Pages lässt Punkt-Ordner weg). Ein Effekt für die Website kommt als eigene Seite nach `alpha/<name>/`.
  Dort gelten die Konventionen der Website: `noindex`, Ausnahme in `tests/navigation.test.mjs`, `?v=`-Marken, eigene Tests nach dem Muster `tests/bildfragmentieren.*`.
- Den Pfad zu `mp4.js` anpassen (`../sketchory/mp4.js?v=8`). three.js weiter über die Import-Map mit fester Version.
- **Vorbild Bildfragmentieren** (seit 16. Oktober 2026): die Abläufe «Kristall» (Glas → Bruch → Montage) und «Echo» (Höhenlinien → Rückkopplung → Kaleidoskop
  → Tonstufen) in `alpha/bildfragmentieren/raum.js`, dazu ein leuchtendes Signet mit Glaskristall als Punkt.
  - three.js liegt lokal in `vendor/three-0.185.1/` (Import-Map, nur die nötigen Addons). `raum.js` wird erst auf Wahl mit `import()` geladen.
  - Jedes Bild entsteht auf einer eigenen WebGL-Leinwand in der Auflösung des Ziels (`ctx.getTransform()`) und wird mit `drawImage` in die 2D-Szene gesetzt (`preserveDrawingBuffer: true`).
  - Beide beginnen im Dunkeln und enden exakt beim Foto: Bloom, Farbsaum und Blitze hängen an der Bewegung, in Ruhe ist das Bild unverändert.
  - Rückmeldungen, die dort eingeflossen sind:
    - kleine Körper brauchen eine Rolle (sie verschmelzen zum grossen)
    - das Endbild muss sich zusammensetzen, nicht einfach erscheinen (Montage der Scherben, Tonstufen)
    - Konturen feingliedrig: Höhenlinien über `fwidth`, ihre Zahl nach der Unruhe des Bilds
    - ein linear addierter «Blitz» von 0,04 wird nach sRGB ein grauer Schleier (≈ 22 %), also keinen konstanten Zusatz
  - Neue Abläufe nach diesem Muster: Phasen in `ABLAEUFE` (`ablauf.js`), Funktion in `raum.js`, Karte in `index.html`, Tests ergänzen.
    Simulationen zählen ihre Schritte in Filmbildern (`bild(u, k, N)`), dann ist jedes Bild beim Spulen gleich.

## Siehe auch
threejs-fundamentals, threejs-shaders, threejs-postprocessing, threejs-geometry (Grundlagen und API); ornament-video (Signet, Umwandlung, Website).
