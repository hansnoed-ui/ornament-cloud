// «Sketchory» – ein Bild des Films auf eine Leinwand zeichnen (Vorschau und Video verwenden dasselbe).
// Farben: weiss auf Schwarz («dunkel», Standard) oder schwarz auf Weiss («hell»), für alles im Film gleich.
// Die Zeichnung wächst auf einer eigenen Ebene Strich für Strich (nur vorwärts; geht die Zeit zurück, beginnt sie neu),
// darüber die Stiftspitze, dann der Satz und am Schluss das Signet.
import { BREITE, HOEHE, FPS, RAND, anteil, weich, zeitachse, zeichenplan, zeichenkurve, satzbild, versatz, WORT } from "./ablauf.js?v=4";
import { signet, FARBEN } from "./signet.js?v=4";

// Satz: standardmässig eine Grotesk nah an Helvetica Now Display (Wunsch vom 12. Oktober 2026). Helvetica Now selbst ist nicht frei;
// darum Inter Display Medium (OFL, vendor/fonts/, mit «G» mit Sporn) und knappe Laufweite. Ist Helvetica Now auf dem Gerät installiert,
// bietet die Seite sie zusätzlich an («helvetica»). sperrung: Laufweite in em (über ctx.letterSpacing, wo der Browser es kann).
export const SCHRIFTEN = {
  grotesk: { familie: '"Inter Display", "Helvetica Neue", Helvetica, Arial, sans-serif', gewicht: 500, groesse: 68, sperrung: -0.015, name: "Grotesk (Inter Display)" },
  helvetica: { familie: '"Helvetica Now Display", "Helvetica Now Text", "Inter Display", sans-serif', gewicht: 500, groesse: 68, sperrung: -0.01, name: "Helvetica Now" },
  sans: { familie: '"Instrument Sans", system-ui, sans-serif', gewicht: 400, groesse: 66, sperrung: 0, name: "Instrument Sans" },
  serif: { familie: 'Newsreader, Georgia, serif', gewicht: 300, groesse: 74, sperrung: 0, name: "Newsreader" },
};

/** Schrift und Laufweite auf einen Kontext setzen (für Messen und Zeichnen gleich) */
export function schriftSetzen(ctx, schrift, groesse) {
  const s = SCHRIFTEN[schrift] ?? SCHRIFTEN.grotesk;
  ctx.font = `${s.gewicht} ${groesse}px ${s.familie}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${(s.sperrung * groesse).toFixed(2)}px`;
}

/**
 * Szene aus dem Ergebnis von strich.js. optionen: stil ("gezeichnet" | "gleichmaessig"), staerke (Faktor für die Strichbreite),
 * zeichnen (Sekunden), text, schrift ("grotesk" | "helvetica" | "sans" | "serif"), messen(text, groesse, schrift) → Breite.
 */
export function szene(ergebnis, { stil = "gezeichnet", staerke = 1, zeichnen = 4.5, text = "", schrift = "grotesk", farbe = "dunkel", messen, leinwand } = {}) {
  const { striche, rTyp } = ergebnis;
  // Rahmen der Zeichnung (mit Strichbreite) → in das Bild einpassen, mittig, seitlich RAND, oben und unten etwas mehr
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of striche) for (let i = 0; i < s.x.length; i++) {
    const r = s.r[i];
    x0 = Math.min(x0, s.x[i] - r); x1 = Math.max(x1, s.x[i] + r); y0 = Math.min(y0, s.y[i] - r); y1 = Math.max(y1, s.y[i] + r);
  }
  if (!striche.length) { x0 = y0 = 0; x1 = y1 = 1; }
  const m = Math.min((BREITE - 2 * RAND) / (x1 - x0), (HOEHE - 2 * RAND * 1.3) / (y1 - y0));
  const ox = (BREITE - (x1 - x0) * m) / 2 - x0 * m, oy = (HOEHE - (y1 - y0) * m) / 2 - y0 * m;
  const breite = (r) => Math.max(1.3, (2 * (stil === "gleichmaessig" && r < 1.6 * rTyp ? rTyp : r) - 1) * m * staerke);
  const linie = breite(rTyp);
  const teile = striche.map((s) => {
    const n = s.x.length, x = new Float32Array(n), y = new Float32Array(n), w = new Float32Array(n), lang = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      x[i] = ox + s.x[i] * m; y[i] = oy + s.y[i] * m; w[i] = breite(s.r[i]);
      if (i) lang[i] = lang[i - 1] + Math.hypot(x[i] - x[i - 1], y[i] - y[i - 1]);
    }
    const teil = { x, y, w, lang, laenge: lang[n - 1] || 0 };
    if (s.flaeche) {
      // Fläche: Umriss (alle Ringe hintereinander), dann gefüllt
      const pfad = new Path2D(), ringe = [];
      let umfang = 0;
      for (const r of s.flaeche) {
        const rx = [], ry = [], rl = [0];
        for (let j = 0; j < r.length; j += 2) { rx.push(ox + r[j] * m); ry.push(oy + r[j + 1] * m); }
        rx.push(rx[0]); ry.push(ry[0]);
        for (let j = 1; j < rx.length; j++) rl.push(rl[j - 1] + Math.hypot(rx[j] - rx[j - 1], ry[j] - ry[j - 1]));
        pfad.moveTo(rx[0], ry[0]);
        for (let j = 1; j < rx.length; j++) pfad.lineTo(rx[j], ry[j]);
        pfad.closePath();
        ringe.push({ x: rx, y: ry, lang: rl, von: umfang });
        umfang += rl[rl.length - 1];
      }
      Object.assign(teil, { flaeche: pfad, ringe, laenge: umfang * 0.8 });
    }
    return teil;
  });
  const plan = zeichenplan(teile);
  const zeit = zeitachse({ zeichnen, text });
  const sb = text.trim() ? satzbild(text, (s, g) => messen(s, g, schrift), { groesse: SCHRIFTEN[schrift].groesse }) : null;
  const farben = FARBEN[farbe] ?? FARBEN.dunkel;
  return { teile, plan, zeit, satz: sb, schrift, farben, linie, text, ebene: leinwand(BREITE, HOEHE), stand: { p: -1, i: 0, l: 0 } };
}

const FUELLEN = 0.75;

/** #rrggbb mit Deckkraft a */
const mitAlpha = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;   // bei Flächen: bis hier der Umriss, danach blendet die Füllung ein

/** Stück eines Strichs von Länge von bis bis (Breite je Abschnitt; gleiche Breiten in einem Pfad) */
function strecke(ctx, t, von, bis) {
  const { x, y, w, lang } = t, n = x.length;
  if (n === 1 || t.laenge === 0) {
    if (von <= 0) { ctx.beginPath(); ctx.arc(x[0], y[0], w[0] / 2, 0, Math.PI * 2); ctx.fill(); }
    return;
  }
  let k = 1;
  while (k < n - 1 && lang[k] <= von) k++;
  const punkt = (l, j) => { const f = (l - lang[j - 1]) / (lang[j] - lang[j - 1] || 1); return [x[j - 1] + (x[j] - x[j - 1]) * f, y[j - 1] + (y[j] - y[j - 1]) * f]; };
  let breite = Math.round(w[k] * 4) / 4;
  ctx.beginPath();
  ctx.moveTo(...punkt(Math.max(von, 0), k));
  for (; k < n; k++) {
    const b = Math.round(w[k] * 4) / 4;
    if (b !== breite) { ctx.lineWidth = breite; ctx.stroke(); ctx.beginPath(); ctx.moveTo(x[k - 1], y[k - 1]); breite = b; }
    if (lang[k] >= bis) { ctx.lineTo(...punkt(bis, k)); break; }
    ctx.lineTo(x[k], y[k]);
  }
  ctx.lineWidth = breite;
  ctx.stroke();
}

/** Umriss einer Fläche von Länge von bis bis (über alle Ringe) */
function umriss(ctx, t, von, bis, linie) {
  ctx.lineWidth = linie;
  for (const r of t.ringe) {
    const ende = r.von + r.lang[r.lang.length - 1];
    if (bis <= r.von || von >= ende) continue;
    strecke(ctx, { x: r.x, y: r.y, w: r.x.map(() => linie), lang: r.lang, laenge: ende - r.von }, von - r.von, Math.min(bis, ende) - r.von);
  }
}

/** Länge eines Teils, die bei Fortschritt q (0–1 innerhalb des Teils) gezeichnet ist */
const strich = (t, q) => (t.flaeche ? Math.min(1, q / FUELLEN) * (t.laenge / 0.8) : q * t.laenge);

/** die Ebene mit der Zeichnung bis zum Fortschritt p (0–1) bringen; gibt die Stiftspitze und die halb gefüllte Fläche zurück */
function fortschreiben(sz, p) {
  const { teile, plan, ebene, linie } = sz;
  const ctx = ebene.getContext("2d");
  if (p < sz.stand.p) { ctx.clearRect(0, 0, BREITE, HOEHE); sz.stand = { p: -1, i: 0, l: 0 }; }
  Object.assign(ctx, { strokeStyle: sz.farben.tinte, fillStyle: sz.farben.tinte, lineCap: "round", lineJoin: "round" });
  let { i, l } = sz.stand;
  let spitze = null, offen = null;
  while (i < teile.length) {
    const t = teile[i], [a, b] = plan[i];
    if (p <= a) break;
    const q = Math.min(1, (p - a) / (b - a || 1));
    const bis = strich(t, q);
    if (t.flaeche) {
      if (bis > l) umriss(ctx, t, l, bis, linie);
      if (q >= 1) { ctx.fill(t.flaeche, "evenodd"); i++; l = 0; continue; }
      l = bis;
      if (q > FUELLEN) offen = { t, a: (q - FUELLEN) / (1 - FUELLEN) };
      const r = t.ringe.find((r) => bis <= r.von + r.lang[r.lang.length - 1]) ?? t.ringe[0];
      spitze = stelle(r, bis - r.von, linie);
      break;
    }
    if (bis > l || (l === 0 && bis === 0)) strecke(ctx, t, l, bis);
    if (q >= 1) { i++; l = 0; continue; }
    l = bis;
    spitze = stelle(t, bis, null);
    break;
  }
  sz.stand = { p, i, l };
  return { spitze, offen };
}

function stelle(t, l, w) {
  const n = t.x.length;
  let k = 1;
  while (k < n - 1 && t.lang[k] < l) k++;
  if (n === 1) return { x: t.x[0], y: t.y[0], w: w ?? t.w[0] };
  const f = Math.min(1, Math.max(0, (l - t.lang[k - 1]) / (t.lang[k] - t.lang[k - 1] || 1)));
  return { x: t.x[k - 1] + (t.x[k] - t.x[k - 1]) * f, y: t.y[k - 1] + (t.y[k] - t.y[k - 1]) * f, w: w ?? t.w[k] };
}

/** Bild zur Zeit t (Sekunden) */
export function bild(ctx, sz, t) {
  const { ab } = sz.zeit;
  ctx.globalAlpha = 1;
  ctx.fillStyle = sz.farben.grund;
  ctx.fillRect(0, 0, BREITE, HOEHE);
  // die Zeichnung
  if (t < ab.bildAus[1]) {
    const p = zeichenkurve(anteil(t, ab.zeichnen[0], ab.zeichnen[1]));
    const { spitze, offen } = fortschreiben(sz, p);
    const sicht = 1 - weich(anteil(t, ab.bildAus[0], ab.bildAus[1]));
    ctx.globalAlpha = sicht;
    ctx.drawImage(sz.ebene, 0, 0);
    if (offen) { ctx.globalAlpha = sicht * offen.a; ctx.fillStyle = sz.farben.tinte; ctx.fill(offen.t.flaeche, "evenodd"); }
    if (spitze && p < 1) {
      // die Stiftspitze: ein kleiner, weicher Lichtpunkt
      const r = Math.max(7, spitze.w * 2.4);
      const g = ctx.createRadialGradient(spitze.x, spitze.y, 0, spitze.x, spitze.y, r);
      // auf Weiss etwas schwächer, sonst wirkt der Lichtpunkt wie ein Fleck
      g.addColorStop(0, mitAlpha(sz.farben.tinte, sz.farben.grund === "#000000" ? 0.55 : 0.3)); g.addColorStop(1, mitAlpha(sz.farben.tinte, 0));
      ctx.globalAlpha = 1; ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(spitze.x, spitze.y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // der Satz, Wort für Wort
  if (sz.satz && ab.textEin && t >= ab.textEin[0] && t < ab.textAus[1]) satz(ctx, sz, t);
  // das Signet
  if (t >= ab.signet[0]) signet(ctx, (t - ab.signet[0]) * FPS, { hoehe: HOEHE, farben: sz.farben });
}

function satz(ctx, sz, t) {
  const { ab } = sz.zeit, { groesse, zeilen, zeilenhoehe } = sz.satz;
  schriftSetzen(ctx, sz.schrift, groesse);
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left"; ctx.fillStyle = sz.farben.tinte;
  const aus = 1 - weich(anteil(t, ab.textAus[0], ab.textAus[1]));
  const n = zeilen.reduce((a, z) => a + z.length, 0), vs = versatz(n);
  const m = ctx.measureText("Hg"), auf = m.fontBoundingBoxAscent ?? groesse * 0.9, abw = m.fontBoundingBoxDescent ?? groesse * 0.25;
  const hoch = zeilen.length * zeilenhoehe;
  let y = HOEHE * 0.48 - hoch / 2 + (zeilenhoehe - (auf + abw)) / 2 + auf;
  let nr = 0;
  const leer = ctx.measureText(" ").width;
  for (const zeile of zeilen) {
    const breiten = zeile.map((w) => ctx.measureText(w).width);
    let x = (BREITE - (breiten.reduce((a, b) => a + b, 0) + leer * (zeile.length - 1))) / 2;
    zeile.forEach((w, i) => {
      const a0 = ab.textEin[0] + nr * vs, e = weich(anteil(t, a0, a0 + WORT));
      if (e > 0) { ctx.globalAlpha = e * aus; ctx.fillText(w, x, y + (1 - e) * 16); }
      x += breiten[i] + leer; nr++;
    });
    y += zeilenhoehe;
  }
  ctx.globalAlpha = 1;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
}

/** die fertige Zeichnung allein (für das Standbild) */
export function standbild(ctx, sz) {
  ctx.fillStyle = sz.farben.grund;
  ctx.fillRect(0, 0, BREITE, HOEHE);
  fortschreiben(sz, 1);
  ctx.drawImage(sz.ebene, 0, 0);
}
