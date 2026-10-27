// ORNAMENT LAB · Video – Titel und Texte. Eine Zeichenfunktion für jeden Moment (zeichneTitel), die Vorschau und Export nutzen, und
// dieselbe Funktion als Seite für OpenFilm (titelSeite): eine Seite mit window.film.frame(t), die genau so zeichnet. Darum hängt
// zeichneTitel von nichts ausserhalb ab (sie wird als Text in die Seite geschrieben), und ihr Zufall (Glitch) hängt nur von t ab.
// Seit Video 0.2: Auftritte Wort für Wort und Buchstabe für Buchstabe, Wischen mit Kante, aus der Unschärfe, Glitch; ein eigener Abgang;
// Hintergrund «Linie»; Vorlagen.

export const TITEL_STANDARD = Object.freeze({
  text: "Titel", unterzeile: "", schrift: "sans", gewicht: 600, groesse: 0.08, farbe: "#ffffff",
  lage: "mitte", band: "schatten", bandFarbe: "#000000", bandDeckkraft: 0.55, animation: "von-unten", abgang: "wie", blende: 0.5, akzent: "#f2c14e",
});
export const LAGEN = Object.freeze({ mitte: "Mitte", unten: "unten", oben: "oben", "unten-links": "unten links", "oben-links": "oben links", "unten-rechts": "unten rechts" });
export const ANIMATIONEN = Object.freeze({
  keine: "keine", einblenden: "einblenden", "von-unten": "von unten", woerter: "Wort für Wort", buchstaben: "Buchstabe für Buchstabe",
  maske: "wischen (mit Kante)", unschaerfe: "aus der Unschärfe", glitch: "Glitch", eintippen: "eintippen", sperren: "Buchstaben laufen zusammen", zoom: "heranzoomen",
});
export const ABGAENGE = Object.freeze({ wie: "wie der Auftritt", ...ANIMATIONEN });
export const BAENDER = Object.freeze({ keins: "kein Hintergrund", schatten: "Schatten", band: "Band hinter dem Text", linie: "Linie in der Akzentfarbe", voll: "ganze Fläche" });
export const SCHRIFTEN = Object.freeze({ sans: "Instrument Sans", serif: "Newsreader", mono: "Monospace" });

/** fertige Titel: setzen alles ausser Text, Unterzeile, Beginn und Dauer */
export const TITEL_VORLAGEN = Object.freeze({
  kino: { name: "Kinotitel", werte: { schrift: "serif", gewicht: 400, groesse: 0.11, lage: "mitte", band: "keins", animation: "unschaerfe", abgang: "einblenden", blende: 1.2, farbe: "#ffffff" } },
  wort: { name: "Wort für Wort", werte: { schrift: "sans", gewicht: 600, groesse: 0.085, lage: "mitte", band: "schatten", animation: "woerter", abgang: "einblenden", blende: 0.8 } },
  bauchbinde: { name: "Bauchbinde", werte: { schrift: "sans", gewicht: 600, groesse: 0.045, lage: "unten-links", band: "linie", animation: "maske", abgang: "maske", blende: 0.5, akzent: "#f2c14e" } },
  kapitel: { name: "Kapitel", werte: { schrift: "mono", gewicht: 400, groesse: 0.05, lage: "oben-links", band: "keins", animation: "eintippen", abgang: "einblenden", blende: 0.6 } },
  glitch: { name: "Glitch", werte: { schrift: "mono", gewicht: 600, groesse: 0.1, lage: "mitte", band: "keins", animation: "glitch", abgang: "glitch", blende: 0.6, farbe: "#ffffff" } },
  welle: { name: "Buchstabenwelle", werte: { schrift: "sans", gewicht: 600, groesse: 0.1, lage: "mitte", band: "schatten", animation: "buchstaben", abgang: "buchstaben", blende: 1 } },
  schluss: { name: "Schlusstitel", werte: { schrift: "serif", gewicht: 400, groesse: 0.09, lage: "mitte", band: "voll", bandFarbe: "#000000", bandDeckkraft: 1, animation: "einblenden", abgang: "einblenden", blende: 1.2 } },
});

/**
 * Einen Titel zur Zeit t (0 … dauer) auf ctx zeichnen, Bühne w × h. Nur was hier steht wird gebraucht (die Funktion wird in Seiten kopiert).
 */
export function zeichneTitel(ctx, t, dauer, p, w, h) {
  const familie = { sans: '"Instrument Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', serif: 'Newsreader, "Iowan Old Style", Georgia, serif', mono: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' }[p.schrift] ?? "system-ui, sans-serif";
  const k = (x) => (x < 0 ? 0 : x > 1 ? 1 : x), weich = (x) => 1 - (1 - k(x)) ** 3;
  const zufall = (n) => { let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
  const e = Math.max(0.01, Math.min(p.blende ?? 0.5, dauer / 2));
  const ein = k(t / e), aus = k((dauer - t) / e);
  // welcher Übergang gerade läuft: der Auftritt (q steigt), der Abgang (q fällt) oder keiner (q = 1)
  const abgang = !p.abgang || p.abgang === "wie" ? p.animation : p.abgang;
  const [anim, q, raus] = ein < 1 && (aus >= 1 || t < dauer / 2) ? [p.animation, ein, false] : aus < 1 ? [abgang, aus, true] : [p.animation, 1, false];
  const a = anim === "keine" ? 1 : q;
  const kurz = Math.min(w, h), rand = 0.07 * kurz;
  ctx.save();
  if (p.band === "voll") {
    ctx.globalAlpha = (p.bandDeckkraft ?? 1) * (p.animation === "keine" ? 1 : Math.min(ein, aus));
    ctx.fillStyle = p.bandFarbe ?? "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }
  const zeilen = String(p.text ?? "").split("\n").filter((z, i, l) => z.length || l.length === 1);
  const unter = String(p.unterzeile ?? "").trim();
  const gross = Math.max(8, (p.groesse ?? 0.08) * h), klein = gross * 0.42, abstand = gross * 1.12;
  const alle = zeilen.join("\n").length;
  const sperren = anim === "sperren" ? (1 - weich(a)) * 0.35 * gross : anim === "unschaerfe" ? (1 - weich(a)) * 0.12 * gross : 0;
  const schrift = (gw, px) => { ctx.font = `${gw} ${px}px ${familie}`; };
  schrift(p.gewicht ?? 600, gross);
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${sperren}px`;
  const breiten = zeilen.map((z) => ctx.measureText(z).width + ("letterSpacing" in ctx ? 0 : sperren * Math.max(0, z.length - 1)));
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  schrift(400, klein);
  const unterBreite = unter ? ctx.measureText(unter).width : 0;
  const blockW = Math.max(unterBreite, ...breiten, 1), blockH = zeilen.length * abstand + (unter ? klein * 1.6 : 0);
  const [lageY, lageX] = { mitte: ["m", "m"], unten: ["u", "m"], oben: ["o", "m"], "unten-links": ["u", "l"], "oben-links": ["o", "l"], "unten-rechts": ["u", "r"] }[p.lage] ?? ["m", "m"];
  const linie = p.band === "linie" ? gross * 0.12 : 0, luft = linie ? gross * 0.45 : 0;
  const x0 = (lageX === "l" ? rand : lageX === "r" ? w - rand - blockW : (w - blockW) / 2) + (lageX === "r" ? -luft : luft) / (lageX === "m" ? 2 : 1);
  let y0 = lageY === "o" ? rand * 1.2 : lageY === "u" ? h - rand * 1.4 - blockH : (h - blockH) / 2;
  if (anim === "von-unten") y0 += (raus ? -1 : 1) * (1 - weich(a)) * abstand * 0.6;
  const skala = anim === "zoom" ? (raus ? 1 + 0.12 * (1 - weich(a)) : 1.15 - 0.15 * weich(a)) : 1;
  ctx.translate(w / 2, h / 2); ctx.scale(skala, skala); ctx.translate(-w / 2, -h / 2);
  const proEinheit = anim === "woerter" || anim === "buchstaben";
  let alpha = ["eintippen", "maske", "glitch"].includes(anim) || proEinheit ? 1 : anim === "keine" ? 1 : weich(a);
  // Glitch: im Übergang flackert der Titel und zerreisst; danach ab und zu ein kurzes Zucken
  const bild = Math.floor(t * 24), glitchStaerke = anim === "glitch" ? (q < 1 ? 1 - q : zufall(bild * 7 + 3) < 0.04 ? 0.35 : 0) : 0;
  if (glitchStaerke > 0 && zufall(bild * 13 + 1) < glitchStaerke * 0.5) alpha *= 0.25;
  ctx.globalAlpha = alpha;
  // Wischen: der Text erscheint hinter einer Kante, die von links nach rechts läuft (beim Abgang verschwindet er nach rechts)
  if (anim === "maske") {
    const pad = gross * 0.5, u = weich(a), x1 = x0 - pad - luft, b = blockW + 2 * pad + luft;
    ctx.beginPath();
    if (raus) ctx.rect(x1 + b * (1 - u), y0 - pad, b * u, blockH + 2 * pad); else ctx.rect(x1, y0 - pad, b * u, blockH + 2 * pad);
    ctx.clip();
  }
  if (p.band === "band") {
    const pad = gross * 0.35, r = pad * 0.6, bx = x0 - pad, by = y0 - pad * 0.6, bw = blockW + 2 * pad, bh = blockH + pad * 1.2;
    const vorher = ctx.globalAlpha;
    ctx.globalAlpha = vorher * (p.bandDeckkraft ?? 0.55);
    ctx.fillStyle = p.bandFarbe ?? "#000";
    ctx.beginPath(); ctx.moveTo(bx + r, by); ctx.arcTo(bx + bw, by, bx + bw, by + bh, r); ctx.arcTo(bx + bw, by + bh, bx, by + bh, r); ctx.arcTo(bx, by + bh, bx, by, r); ctx.arcTo(bx, by, bx + bw, by, r); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = vorher;
  }
  if (linie) {
    // eine senkrechte Linie in der Akzentfarbe neben dem Block; sie wächst mit dem Auftritt
    const lx = lageX === "r" ? x0 + blockW + luft - linie : x0 - luft, hoehe = blockH * (proEinheit || anim === "eintippen" ? weich(Math.min(1, a * 2)) : 1);
    ctx.fillStyle = p.akzent ?? "#f2c14e";
    ctx.fillRect(lx, y0 + (blockH - hoehe) / 2, linie, hoehe);
  }
  if (p.band === "schatten") { ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = gross * 0.35; ctx.shadowOffsetY = gross * 0.04; }
  if (anim === "unschaerfe" && a < 1 && "filter" in ctx) ctx.filter = `blur(${((1 - weich(a)) * gross * 0.22).toFixed(2)}px)`;
  ctx.textBaseline = "alphabetic";
  const xZeile = (i, bw) => (lageX === "r" ? x0 + blockW - bw : lageX === "l" ? x0 : x0 + (blockW - bw) / 2);
  // die Einheiten (Wörter oder Buchstaben) mit ihrem eigenen Fortschritt: jede setzt etwas später ein
  const einheiten = [];
  zeilen.forEach((z, i) => {
    if (!proEinheit) return;
    schrift(p.gewicht ?? 600, gross);
    const teile = anim === "woerter" ? z.split(/(\s+)/) : [...z];
    let x = xZeile(i, breiten[i]), vor = "";
    for (const s of teile) { const xs = x + ctx.measureText(vor).width; vor += s; if (s.trim()) einheiten.push({ s, x: xs, y: y0 + i * abstand + gross * 0.85 }); }
  });
  const n = Math.max(1, einheiten.length), breite = anim === "woerter" ? 0.45 : 0.3;
  const ziehen = (txt, x, y) => {
    if (glitchStaerke > 0) {
      const d = gross * 0.1 * glitchStaerke * (1 + zufall(bild * 31 + 5) * 2);
      const v = ctx.globalAlpha, schatten = ctx.shadowColor;
      ctx.shadowColor = "transparent";
      ctx.globalAlpha = v * 0.85; ctx.fillStyle = "#ff2a55"; ctx.fillText(txt, x + d, y);
      ctx.fillStyle = "#22e0ff"; ctx.fillText(txt, x - d, y + d * 0.3);
      ctx.globalAlpha = v; ctx.shadowColor = schatten;
      ctx.fillStyle = p.farbe ?? "#fff";
      // zerrissen: ein paar waagrechte Streifen seitlich versetzt
      const streifen = 1 + Math.floor(zufall(bild * 17 + 2) * 3 * glitchStaerke + 0.5);
      for (let j = 0; j < streifen; j++) {
        const sy = y - gross * (0.9 * zufall(bild * 101 + j * 7)), sh = gross * (0.08 + 0.18 * zufall(bild * 53 + j)), sx = (zufall(bild * 71 + j * 3) - 0.5) * gross * 0.5 * glitchStaerke;
        ctx.save(); ctx.beginPath(); ctx.rect(0, sy, w, sh); ctx.clip(); ctx.fillText(txt, x + sx, y); ctx.restore();
      }
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.fillText(txt, x, y); ctx.restore();
      return;
    }
    ctx.fillStyle = p.farbe ?? "#fff";
    ctx.fillText(txt, x, y);
  };
  if (proEinheit) {
    schrift(p.gewicht ?? 600, gross);
    const grund = ctx.globalAlpha;
    einheiten.forEach((u, i) => {
      const reihe = raus ? n - 1 - i : i, start = n > 1 ? ((1 - breite) * reihe) / (n - 1) : 0;
      const qi = anim === "keine" ? 1 : weich((a - start) / breite);
      if (qi <= 0) return;
      ctx.globalAlpha = grund * qi;
      const dy = (1 - qi) * gross * (anim === "buchstaben" ? 0.55 : 0.35) * (raus ? -1 : 1);
      ziehen(u.s, u.x, u.y + dy);
    });
    ctx.globalAlpha = grund;
  } else {
    let rest = anim === "eintippen" ? Math.floor(alle * a) : Infinity;
    zeilen.forEach((z, i) => {
      const teil = rest >= z.length ? z : z.slice(0, Math.max(0, rest));
      rest -= z.length + 1;
      schrift(p.gewicht ?? 600, gross);
      if ("letterSpacing" in ctx) ctx.letterSpacing = `${sperren}px`;
      ziehen(teil, xZeile(i, breiten[i]), y0 + i * abstand + gross * 0.85);
      // eintippen: ein blinkender Strich am Ende der Zeile, in der getippt wird
      if (anim === "eintippen" && a < 1 && rest < 0 && rest > -z.length - 2 && Math.floor(t * 3) % 2 === 0) {
        const xs = xZeile(i, breiten[i]) + ctx.measureText(teil).width + gross * 0.05;
        ctx.fillRect(xs, y0 + i * abstand + gross * 0.1, gross * 0.06, gross * 0.85);
      }
    });
  }
  ctx.filter = "none";
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  const zeigeUnter = unter && !(anim === "eintippen" && a < 1);
  if (zeigeUnter) {
    schrift(400, klein);
    ctx.fillStyle = p.farbe ?? "#fff";
    ctx.globalAlpha *= 0.9 * (proEinheit ? weich((a - 0.5) * 2) : 1);
    const x = lageX === "r" ? x0 + blockW - unterBreite : lageX === "l" ? x0 : x0 + (blockW - unterBreite) / 2;
    ctx.fillText(unter, x, y0 + zeilen.length * abstand + klein * 1.2);
  }
  if (anim === "maske" && a < 1 && a > 0) {
    // die Kante des Wischens in der Akzentfarbe
    const pad = gross * 0.5, u = weich(a), x1 = x0 - pad - luft, b = blockW + 2 * pad + luft, kx = raus ? x1 + b * (1 - u) : x1 + b * u;
    ctx.restore(); ctx.save();
    ctx.globalAlpha = 1; ctx.fillStyle = p.akzent ?? "#f2c14e";
    ctx.translate(w / 2, h / 2); ctx.scale(skala, skala); ctx.translate(-w / 2, -h / 2);
    ctx.fillRect(kx - gross * 0.04, y0 - pad * 0.6, gross * 0.08, blockH + pad * 1.2);
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
