// ORNAMENT LAB – die Schriften der Website (Neubau, b/b.css) für die Leinwand: Instrument Sans und Newsreader aus vendor/fonts/, einmal
// geladen und dem Dokument hinzugefügt (seit Lab 0.1.33; vorher nur in operationen/signatur.js). Die Leinwand kennt keine CSS-Regeln einer
// anderen Seite, darum werden die Schnitte hier als FontFace angemeldet; ohne FontFace (Node) oder bei einem Fehler zeichnet die Leinwand
// in den Ersatzschriften. Die Farben des Neubaus stehen daneben, für Karten und Signatur: Papier und Tinte in echter Umkehr, die Blaupause
// («Faden», #1d3fd6, im Dunkeln #8fb0ff) als einziger Akzent, Grau für Nebensächliches.
const LATIN = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const LATIN_EXT = "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";

export const SANS = '"Instrument Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
export const SERIF = 'Newsreader, "Iowan Old Style", Georgia, "Times New Roman", serif';

/** die Farben des Neubaus (b/b.css): hell = Tinte auf Papier, dunkel = die echte Umkehr */
export const NEUBAU = {
  hell: { papier: "#ffffff", tinte: "#000000", grau: "#6f6f6f", linie: "#dadada", faden: "#1d3fd6", fadenHell: "rgba(29, 63, 214, 0.25)", leer: "#8a8a8a" },
  dunkel: { papier: "#000000", tinte: "#ffffff", grau: "#9a9a9a", linie: "#2e2e2e", faden: "#8fb0ff", fadenHell: "rgba(143, 176, 255, 0.28)", leer: "#6f6f6f" },
};

let geladen = null;
/** die Schriften laden, einmal; gibt ein Promise, das immer erfüllt wird */
export function schriftenLaden() {
  if (geladen) return geladen;
  geladen = (async () => {
    if (typeof FontFace === "undefined" || typeof document === "undefined" || !document.fonts) return false;
    const url = (f) => `url(${new URL(`../../../vendor/fonts/${f}`, import.meta.url).href}) format("woff2")`;
    const ff = [
      ["Instrument Sans", "instrument-sans-normal-latin.woff2", "normal", LATIN], ["Instrument Sans", "instrument-sans-normal-latin-ext.woff2", "normal", LATIN_EXT],
      ["Newsreader", "newsreader-normal-latin.woff2", "normal", LATIN], ["Newsreader", "newsreader-normal-latin-ext.woff2", "normal", LATIN_EXT],
      ["Newsreader", "newsreader-italic-latin.woff2", "italic", LATIN], ["Newsreader", "newsreader-italic-latin-ext.woff2", "italic", LATIN_EXT],
    ].map(([f, d, style, unicodeRange]) => new FontFace(f, url(d), { style, weight: "200 800", unicodeRange }));
    const ok = await Promise.all(ff.map(async (f) => { try { await f.load(); document.fonts.add(f); return true; } catch { return false; } }));
    return ok.every(Boolean);
  })().catch(() => false);
  return geladen;
}

/** ob die beiden Schriften dem Dokument bekannt sind (für das Protokoll) */
export const schriftenDa = () => (typeof document !== "undefined" && document.fonts?.check
  ? { sans: document.fonts.check(`500 20px ${SANS}`), serif: document.fonts.check(`italic 400 20px ${SERIF}`) }
  : { sans: false, serif: false });

/** das Signet von ornament.cloud als Linie: die Re-entry-Schlaufe r = b + a·cos t (wie tools/build-b.mjs), dazu die Lage des Punkts.
 *  Gibt Punkte in einem Kasten der Breite 34 und Höhe 24 (wie die SVG-Ansicht des Neubaus), zum Skalieren. */
export const SIGNET = (() => {
  const LA = 1, LB = 0.45, LK = 1.2, N = 120;
  const p = Array.from({ length: N + 1 }, (_, i) => { const t = (i / N) * Math.PI * 2, r = LB + LA * Math.cos(t); return [LK * r * Math.cos(t), LK * r * Math.sin(t)]; });
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2, sp = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const norm = ([x, y]) => [17 + ((x - mx) / sp) * 22, 12 + ((y - my) / sp) * 22];
  return { breite: 34, hoehe: 24, bahn: p.map(norm), punkt: norm(p[50]), punktRadius: 2.2 };
})();

/** das Signet auf eine Leinwand zeichnen: x, y die linke obere Ecke, h die Höhe; Schlaufe in tinte, Punkt in faden */
export function signetZeichnen(ctx, x, y, h, { tinte, faden }) {
  const s = h / SIGNET.hoehe;
  ctx.save(); ctx.strokeStyle = tinte; ctx.lineWidth = Math.max(1, 1.5 * s); ctx.lineJoin = "round";
  ctx.beginPath(); SIGNET.bahn.forEach(([px, py], i) => ctx[i ? "lineTo" : "moveTo"](x + px * s, y + py * s)); ctx.closePath(); ctx.stroke();
  ctx.fillStyle = faden; ctx.beginPath(); ctx.arc(x + SIGNET.punkt[0] * s, y + SIGNET.punkt[1] * s, SIGNET.punktRadius * s, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  return SIGNET.breite * s;
}

/** das Feld 7 × 7 des Zettelkasten als Punkte, mit Fäden vom Zettel zu den nahen (wie die Karten des Neubaus, tools/b-kacheln.mjs):
 *  x, y die linke obere Ecke, a der Abstand der Punkte; hier die Nummer des Zettels (1–49) oder null, nah die Nummern der nahen Zettel */
export function feldZeichnen(ctx, x, y, a, { hier = null, nah = [] }, farben) {
  const r = a / 6, pos = (n) => [x + ((n - 1) % 7) * a + a / 2, y + Math.floor((n - 1) / 7) * a + a / 2];
  ctx.save(); ctx.lineWidth = Math.max(1, a * 0.035);
  if (hier) {
    ctx.strokeStyle = farben.faden; ctx.globalAlpha = 0.8;
    for (const n of nah) {
      const [x1, y1] = pos(hier), [x2, y2] = pos(n), dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, k = Math.min(a * 1.1, l * 0.22);
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo((x1 + x2) / 2 - (dy / l) * k, (y1 + y2) / 2 + (dx / l) * k, x2, y2); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  for (let n = 1; n <= 49; n++) {
    const [px, py] = pos(n), h = n === hier, m = nah.includes(n);
    ctx.beginPath(); ctx.arc(px, py, h ? r * 1.6 : r, 0, Math.PI * 2);
    if (h || m) { ctx.fillStyle = h ? farben.faden : farben.fadenHell; ctx.fill(); }
    ctx.strokeStyle = h || m ? farben.faden : farben.leer; ctx.stroke();
  }
  ctx.restore();
  return 7 * a;
}
