// ORNAMENT LAB · Video – Titel und Texte. Eine Zeichenfunktion für jeden Moment (zeichneTitel), die Vorschau und Export nutzen, und
// dieselbe Funktion als Seite für OpenFilm (titelSeite): eine Seite mit window.film.frame(t), die genau so zeichnet. Darum hängt
// zeichneTitel von nichts ausserhalb ab (sie wird als Text in die Seite geschrieben).

export const TITEL_STANDARD = Object.freeze({
  text: "Titel", unterzeile: "", schrift: "sans", gewicht: 600, groesse: 0.08, farbe: "#ffffff",
  lage: "mitte", band: "schatten", bandFarbe: "#000000", bandDeckkraft: 0.55, animation: "von-unten", blende: 0.5,
});
export const LAGEN = Object.freeze({ mitte: "Mitte", unten: "unten", oben: "oben", "unten-links": "unten links", "oben-links": "oben links", "unten-rechts": "unten rechts" });
export const ANIMATIONEN = Object.freeze({ keine: "keine", einblenden: "einblenden", "von-unten": "von unten", eintippen: "eintippen", sperren: "Buchstaben laufen zusammen", zoom: "heranzoomen" });
export const BAENDER = Object.freeze({ keins: "kein Hintergrund", schatten: "Schatten", band: "Band hinter dem Text", voll: "ganze Fläche" });
export const SCHRIFTEN = Object.freeze({ sans: "Instrument Sans", serif: "Newsreader", mono: "Monospace" });

/**
 * Einen Titel zur Zeit t (0 … dauer) auf ctx zeichnen, Bühne w × h. Nur was hier steht wird gebraucht (die Funktion wird in Seiten kopiert).
 */
export function zeichneTitel(ctx, t, dauer, p, w, h) {
  const familie = { sans: '"Instrument Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', serif: 'Newsreader, "Iowan Old Style", Georgia, serif', mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' }[p.schrift] ?? "system-ui, sans-serif";
  const k = (x) => (x < 0 ? 0 : x > 1 ? 1 : x), weich = (x) => 1 - (1 - x) ** 3;
  const e = Math.max(0.01, Math.min(p.blende ?? 0.5, dauer / 2));
  const ein = p.animation === "keine" ? 1 : k(t / e), aus = p.animation === "keine" ? 1 : k((dauer - t) / e);
  const kurz = Math.min(w, h), rand = 0.07 * kurz;
  ctx.save();
  ctx.globalAlpha = 1;
  if (p.band === "voll") {
    ctx.globalAlpha = (p.bandDeckkraft ?? 1) * Math.min(ein, aus);
    ctx.fillStyle = p.bandFarbe ?? "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
  const zeilen = String(p.text ?? "").split("\n").filter((z, i, a) => z.length || a.length === 1);
  const unter = String(p.unterzeile ?? "").trim();
  const gross = Math.max(8, (p.groesse ?? 0.08) * h), klein = gross * 0.42, abstand = gross * 1.12;
  const alle = zeilen.join("\n").length;
  let sichtbar = Infinity;
  if (p.animation === "eintippen") sichtbar = Math.floor(alle * k(t / Math.max(e, Math.min(dauer * 0.6, 0.045 * alle))));
  const sperren = p.animation === "sperren" ? (1 - weich(ein)) * 0.35 * gross : 0;
  ctx.font = `${p.gewicht ?? 600} ${gross}px ${familie}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${sperren}px`;
  const breiten = zeilen.map((z) => ctx.measureText(z).width + sperren * Math.max(0, z.length - 1));
  ctx.font = `400 ${klein}px ${familie}`;
  const unterBreite = unter ? ctx.measureText(unter).width : 0;
  const blockW = Math.max(unterBreite, ...breiten, 1), blockH = zeilen.length * abstand + (unter ? klein * 1.6 : 0);
  const [lageY, lageX] = { mitte: ["m", "m"], unten: ["u", "m"], oben: ["o", "m"], "unten-links": ["u", "l"], "oben-links": ["o", "l"], "unten-rechts": ["u", "r"] }[p.lage] ?? ["m", "m"];
  const x0 = lageX === "l" ? rand : lageX === "r" ? w - rand - blockW : (w - blockW) / 2;
  let y0 = lageY === "o" ? rand * 1.2 : lageY === "u" ? h - rand * 1.4 - blockH : (h - blockH) / 2;
  if (p.animation === "von-unten") y0 += (1 - weich(ein)) * abstand * 0.6;
  const skala = p.animation === "zoom" ? 1.15 - 0.15 * weich(ein) : 1;
  ctx.translate(w / 2, h / 2); ctx.scale(skala, skala); ctx.translate(-w / 2, -h / 2);
  ctx.globalAlpha = p.animation === "eintippen" ? aus : Math.min(ein, aus);
  if (p.band === "band") {
    const pad = gross * 0.35, r = pad * 0.6, bx = x0 - pad, by = y0 - pad * 0.6, bw = blockW + 2 * pad, bh = blockH + pad * 1.2;
    const a = ctx.globalAlpha;
    ctx.globalAlpha = a * (p.bandDeckkraft ?? 0.55);
    ctx.fillStyle = p.bandFarbe ?? "#000";
    ctx.beginPath(); ctx.moveTo(bx + r, by); ctx.arcTo(bx + bw, by, bx + bw, by + bh, r); ctx.arcTo(bx + bw, by + bh, bx, by + bh, r); ctx.arcTo(bx, by + bh, bx, by, r); ctx.arcTo(bx, by, bx + bw, by, r); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = a;
  }
  if (p.band === "schatten") { ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = gross * 0.35; ctx.shadowOffsetY = gross * 0.04; }
  ctx.fillStyle = p.farbe ?? "#fff";
  ctx.textBaseline = "alphabetic";
  let rest = sichtbar;
  zeilen.forEach((z, i) => {
    const teil = rest >= z.length ? z : z.slice(0, Math.max(0, rest));
    rest -= z.length + 1;
    const x = lageX === "r" ? x0 + blockW - breiten[i] : lageX === "l" ? x0 : x0 + (blockW - breiten[i]) / 2;
    ctx.font = `${p.gewicht ?? 600} ${gross}px ${familie}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${sperren}px`;
    ctx.fillText(teil, x, y0 + i * abstand + gross * 0.85);
  });
  if (unter && rest >= 0) {
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    ctx.font = `400 ${klein}px ${familie}`;
    ctx.globalAlpha *= 0.9;
    const x = lageX === "r" ? x0 + blockW - unterBreite : lageX === "l" ? x0 : x0 + (blockW - unterBreite) / 2;
    ctx.fillText(unter, x, y0 + zeilen.length * abstand + klein * 1.2);
  }
  ctx.restore();
}

const html = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/**
 * Der Titel als Seite für OpenFilm (§2 des SPEC): eine Leinwand in der Grösse der Bühne, window.film.frame(t) zeichnet mit zeichneTitel.
 * Die Einstellungen stehen als JSON in der Seite (script#titel), so liest der Editor sie zurück.
 */
export function titelSeite(t, buehne) {
  const p = Object.fromEntries(Object.keys(TITEL_STANDARD).map((k) => [k, t[k] ?? TITEL_STANDARD[k]]));
  const json = JSON.stringify({ ...p, dauer: t.dauer ?? null }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${buehne.w}, height=${buehne.h}">
<title>${html(p.text.split("\n")[0] || "Titel")}</title>
<style>html, body { margin: 0; background: transparent; } canvas { display: block; width: ${buehne.w}px; height: ${buehne.h}px; }</style>
</head>
<body>
<canvas width="${buehne.w}" height="${buehne.h}"></canvas>
<!-- ein Titel aus ORNAMENT LAB · Video: die Einstellungen (der Editor liest sie zurück) und die Zeichenfunktion -->
<script type="application/json" id="titel">${json}</script>
<script type="module">
const p = JSON.parse(document.getElementById("titel").textContent);
const canvas = document.querySelector("canvas"), ctx = canvas.getContext("2d");
${zeichneTitel.toString()}
window.film = {
  frame(t) { ctx.clearRect(0, 0, ${buehne.w}, ${buehne.h}); zeichneTitel(ctx, t, p.dauer ?? 4, p, ${buehne.w}, ${buehne.h}); },
  ready: document.fonts ? document.fonts.ready : Promise.resolve(),
};
</script>
</body>
</html>
`;
}

/** die Einstellungen aus einer Titelseite zurücklesen (null, wenn es keine Titelseite des Editors ist) */
export function titelAusSeite(text) {
  const m = /<script type="application\/json" id="titel">([\s\S]*?)<\/script>/.exec(text);
  if (!m) return null;
  try { const p = JSON.parse(m[1]); return { ...TITEL_STANDARD, ...p }; } catch { return null; }
}
