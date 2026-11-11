// ORNAMENT LAB · Video – Effekte in Bewegung (seit Video 0.2). Zwei Arten:
//   am Bild selbst  Ken Burns (langsame Fahrt), Handkamera (Wackeln), Zoom-Puls im Takt, Glitch (zerrissene Streifen, Farbversatz).
//                   bewegung() und glitchBei() rechnen nur Zahlen; medien/zeichnen.js wendet sie an. In film.html kann eine Bewegung
//                   nicht stehen (OpenFilm: «the film's CSS has no time: what moves is a page»), darum stehen sie dort als data-ornament-effekte
//                   beim Clip und im Zustand des Editors; OpenFilm Studio zeigt den Clip ohne sie.
//   darüber         Filmkorn mit Kratzern und Staub, Lichtlecks. zeichneUeberlagerung() zeichnet sie so, wie eine Seite für OpenFilm sie
//                   zeichnet; in film.html liegen sie als eigene Seiten über dem Clip, mit mix-blend-mode (overlay, screen). So sieht Studio sie.
// Aller Zufall hängt nur vom Clip und von der Zeit ab: dasselbe Bild in Vorschau, Export und OpenFilm.

export const EFFEKT_STANDARD = Object.freeze({ kenburns: "aus", kbStaerke: 0.15, wackeln: 0, puls: 0, pulsBpm: 0, glitch: 0, korn: 0, kratzer: 0, licht: 0 });
export const KENBURNS = Object.freeze({ aus: "aus", hinein: "langsam hinein", heraus: "langsam heraus", links: "nach links fahren", rechts: "nach rechts fahren", hoch: "nach oben fahren" });
export const EFFEKT_REGLER = Object.freeze([
  { id: "wackeln", name: "Handkamera (wackeln)", min: 0, max: 1, schritt: 0.01 },
  { id: "puls", name: "Zoom-Puls im Takt", min: 0, max: 1, schritt: 0.01 },
  { id: "glitch", name: "Glitch", min: 0, max: 1, schritt: 0.01 },
  { id: "korn", name: "Filmkorn", min: 0, max: 1, schritt: 0.01 },
  { id: "kratzer", name: "Kratzer und Staub", min: 0, max: 1, schritt: 0.01 },
  { id: "licht", name: "Lichtlecks", min: 0, max: 1, schritt: 0.01 },
]);
export const EFFEKT_VORLAGEN = Object.freeze({
  ohne: { name: "Ohne", werte: {} },
  super8: { name: "Super 8", werte: { korn: 0.7, kratzer: 0.6, licht: 0.35, wackeln: 0.3 }, filter: "film" },
  hand: { name: "Handkamera", werte: { wackeln: 0.6, korn: 0.2 } },
  club: { name: "Club", werte: { puls: 0.8, glitch: 0.25, licht: 0.3 } },
  glitch: { name: "Glitch", werte: { glitch: 0.75, korn: 0.25, puls: 0.3 } },
  traum: { name: "Traum", werte: { licht: 0.7, korn: 0.15, kenburns: "hinein", kbStaerke: 0.1 }, filter: "traum" },
  doku: { name: "Langsame Fahrt", werte: { kenburns: "rechts", kbStaerke: 0.18 } },
});

/** alle Werte eines Clips (fehlende mit dem Standard) */
export const effekteVon = (c) => ({ ...EFFEKT_STANDARD, ...(c?.effekte ?? {}) });
/** hat ein Clip einen Effekt (für die Anzeige und für film.html) */
export const hatBewegung = (e) => e.kenburns !== "aus" || e.wackeln > 0 || e.puls > 0 || e.glitch > 0;

/** ein Zahlenzufall aus zwei ganzen Zahlen (für dieselben Bilder überall) */
export function zufall(a, b = 0) {
  let x = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35);
  x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
/** eine Zahl aus einer Id (der Same eines Clips) */
export function same(id) { let h = 2166136261; for (const z of String(id)) h = Math.imul(h ^ z.charCodeAt(0), 16777619); return h >>> 0; }
const weich = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/**
 * Die Bewegung des Bilds eines Clips: { s (Skala ≥ 1), x, y (Verschiebung in Anteilen des Kastens), r (Grad) }. lokal: Sekunden im Clip,
 * laenge: seine Länge im Film, t: die Filmzeit (für den Takt), marken: Filmzeiten der Schläge, id: der Clip (Same).
 */
export function bewegung(e, { lokal, laenge, t, marken = [], id = "" }) {
  let s = 1, x = 0, y = 0, r = 0;
  const u = laenge > 0 ? weich(lokal / laenge) : 0, k = e.kbStaerke ?? 0.15;
  if (e.kenburns === "hinein") s *= 1 + k * u;
  else if (e.kenburns === "heraus") s *= 1 + k * (1 - u);
  else if (e.kenburns === "links" || e.kenburns === "rechts") { s *= 1 + k; x = (k / 2) * (e.kenburns === "links" ? u - 0.5 : 0.5 - u) * 2 / (1 + k); }
  else if (e.kenburns === "hoch") { s *= 1 + k; y = (k / 2) * (0.5 - u) * 2 / (1 + k); }
  if (e.wackeln > 0) {
    // weiches Zittern aus drei Sinus mit eigenen Phasen je Clip, etwas vergrössert, damit kein Rand sichtbar wird
    const f = same(id), a = e.wackeln, p = (i) => zufall(f, i) * 6.283;
    x += a * 0.012 * (Math.sin(t * 1.7 + p(1)) + 0.6 * Math.sin(t * 3.9 + p(2)) + 0.25 * Math.sin(t * 9.1 + p(3)));
    y += a * 0.012 * (Math.sin(t * 1.3 + p(4)) + 0.6 * Math.sin(t * 4.3 + p(5)) + 0.25 * Math.sin(t * 8.3 + p(6)));
    r += a * 0.7 * Math.sin(t * 1.1 + p(7));
    s *= 1 + 0.05 * a;
  }
  if (e.puls > 0) {
    const schlag = letzterSchlag(t, marken, e.pulsBpm);
    if (schlag !== null) s *= 1 + e.puls * 0.07 * Math.exp(-(t - schlag) / 0.11);
  }
  return { s, x, y, r };
}
/** der letzte Schlag bis t: aus den Marken des Projekts, sonst im Raster des Tempos (bpm, ab 0) */
export function letzterSchlag(t, marken, bpm = 0) {
  if (bpm > 0) { const d = 60 / bpm; return Math.floor(t / d + 1e-9) * d; }
  let best = null;
  for (const m of marken) if (m <= t + 1e-9 && (best === null || m > best)) best = m;
  return best;
}

/**
 * Glitch zur Filmzeit t: null (kein Zucken in diesem Bild) oder { streifen: [{ y, h, dx }] in Anteilen des Kastens, versatz (Anteil der
 * Breite für den Farbversatz) }. Zuckt in Schüben: je Achtelsekunde entscheidet der Zufall, gehalten für ein paar Bilder.
 */
export function glitchBei(e, t, id = "") {
  if (!(e.glitch > 0)) return null;
  const f = same(id), schub = Math.floor(t * 8), bild = Math.floor(t * 24);
  if (zufall(f, schub) > e.glitch * 0.55) return null;
  const n = 2 + Math.floor(zufall(f + 1, bild) * (2 + 6 * e.glitch)), streifen = [];
  for (let i = 0; i < n; i++) {
    streifen.push({ y: zufall(f + 2, bild * 31 + i), h: 0.02 + 0.12 * zufall(f + 3, bild * 17 + i), dx: (zufall(f + 4, bild * 7 + i) - 0.5) * 0.18 * e.glitch });
  }
  return { streifen, versatz: (0.004 + 0.016 * zufall(f + 5, bild)) * e.glitch };
}

/**
 * Eine Überlagerung zur Zeit t zeichnen, so wie ihre Seite für OpenFilm: art «korn» (Grau 50 % mit Korn, Kratzern und Staub, gedacht für
 * mix-blend-mode: overlay) oder «licht» (farbige Lichtflecken auf Schwarz, für mix-blend-mode: screen). p: { korn, kratzer, licht, same }.
 * Hängt von nichts ausserhalb ab, weil sie in Seiten kopiert wird.
 */
export function zeichneUeberlagerung(ctx, t, art, p, w, h) {
  const z = (a, b) => { let x = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul((b | 0) + 0x632be5ab, 0xc2b2ae35); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
  const bild = Math.floor(t * 24), s = p.same | 0;
  ctx.save();
  if (art === "licht") {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    const farben = [[255, 120, 40], [255, 60, 30], [255, 190, 90], [240, 80, 140]];
    const flackern = 0.85 + 0.15 * Math.sin(t * 7.3 + (s % 13)) * Math.sin(t * 2.1);
    for (let i = 0; i < 3; i++) {
      const ph = z(s, i) * 6.283, c = farben[(s + i) % farben.length];
      const x = w * (0.5 + 0.55 * Math.sin(t * (0.11 + 0.05 * i) + ph)), y = h * (0.5 + 0.45 * Math.cos(t * (0.07 + 0.04 * i) + ph * 1.7));
      const r = Math.max(w, h) * (0.35 + 0.2 * Math.sin(t * 0.3 + i));
      const g = ctx.createRadialGradient(x, y, 0, x, y, r), st = (p.licht ?? 0) * flackern * (0.55 - 0.12 * i);
      g.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${st})`); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
    return;
  }
  ctx.fillStyle = "rgb(128,128,128)"; ctx.fillRect(0, 0, w, h);
  if ((p.korn ?? 0) > 0) {
    // Korn: ein kleines Rauschbild, je Bild neu, vergrössert; 50 % Grau ist im Modus overlay neutral
    const kw = 320, kh = Math.max(2, Math.round((320 * h) / w));
    const puffer = zeichneUeberlagerung.puffer ??= (typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(kw, kh) : Object.assign(document.createElement("canvas"), { width: kw, height: kh }));
    if (puffer.width !== kw || puffer.height !== kh) { puffer.width = kw; puffer.height = kh; }
    const pc = puffer.getContext("2d"), d = pc.createImageData(kw, kh), a = 34 * p.korn;
    for (let i = 0; i < kw * kh; i++) { const v = 128 + (z(s + bild, i) - 0.5) * 2 * a; d.data[i * 4] = d.data[i * 4 + 1] = d.data[i * 4 + 2] = v; d.data[i * 4 + 3] = 255; }
    pc.putImageData(d, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(puffer, 0, 0, w, h);
  }
  if ((p.kratzer ?? 0) > 0) {
    const k = p.kratzer;
    // Kratzer: helle und dunkle senkrechte Linien, die ein paar Bilder stehen und wandern
    const n = Math.floor(z(s + 7, Math.floor(bild / 3)) * 3 * k + k);
    for (let i = 0; i < n; i++) {
      const x = w * z(s + 11, Math.floor(bild / 3) * 5 + i) + Math.sin(t * 3 + i) * w * 0.003, hell = z(s + 13, i + bild) < 0.4;
      ctx.fillStyle = hell ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.7)";
      ctx.fillRect(x, 0, Math.max(1, w * 0.0012 * (1 + z(s + 17, i))), h);
    }
    // Staub: Punkte und Fusseln, jedes Bild andere
    const m = Math.floor(12 * k);
    for (let i = 0; i < m; i++) {
      if (z(s + 19, bild * 97 + i) > 0.5) continue;
      ctx.fillStyle = z(s + 23, bild + i) < 0.5 ? "rgba(0,0,0,0.85)" : "rgba(255,255,255,0.8)";
      const x = w * z(s + 29, bild * 13 + i), y = h * z(s + 31, bild * 19 + i), r = Math.max(1, Math.min(w, h) * 0.004 * (0.5 + z(s + 37, i + bild)));
      ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.4 + z(s, bild + i) * 2), z(s + 41, i) * 3, 0, 6.283); ctx.fill();
    }
  }
  ctx.restore();
}

const html = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/** die Überlagerung als Seite für OpenFilm: Leinwand der Bühne, frame(t) zeichnet mit zeichneUeberlagerung (t ist die Zeit im Clip) */
export function ueberlagerungSeite(art, p, buehne) {
  const json = JSON.stringify({ art, korn: p.korn ?? 0, kratzer: p.kratzer ?? 0, licht: p.licht ?? 0, same: p.same ?? 0 });
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${buehne.w}, height=${buehne.h}">
<title>${html(art === "licht" ? "Lichtlecks" : "Filmkorn")}</title>
<style>html, body { margin: 0; background: transparent; } canvas { display: block; width: ${buehne.w}px; height: ${buehne.h}px; }</style>
</head>
<body>
<canvas width="${buehne.w}" height="${buehne.h}"></canvas>
<!-- eine Überlagerung aus ORNAMENT LAB · Video («${art}»): im Film mit mix-blend-mode ${art === "licht" ? "screen" : "overlay"} über dem Clip -->
<script type="application/json" id="effekt">${json}</script>
<script type="module">
const p = JSON.parse(document.getElementById("effekt").textContent);
const ctx = document.querySelector("canvas").getContext("2d");
${zeichneUeberlagerung.toString()}
window.film = { frame(t) { ctx.clearRect(0, 0, ${buehne.w}, ${buehne.h}); zeichneUeberlagerung(ctx, t, p.art, p, ${buehne.w}, ${buehne.h}); } };
</script>
</body>
</html>
`;
}
