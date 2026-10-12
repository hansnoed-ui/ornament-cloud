// «Principesse» – das Signet am Schluss des Films: eine kleine Prinzessin zeichnet sich (nach der Vorlage vom 12. Oktober 2026:
// Krone mit fünf Kugeln, rundes Gesicht mit Wangen und Lächeln, Kleid mit Punkten, zwei Füsse; seit dem zweiten Wunsch ohne Locken),
// dann füllt sich die Krone golden und funkelt, die Kugeln werden himbeerrot, die Wangen rosa, das Kleid farbig gestreift wie in der Vorlage
// (die dunklen Streifen glitzern); darunter «Principesse» in der Grotesk und «by Katharina Strickler» in glitzerndem Gold.
// Alle Masse in Punkten der Vorlage (1500 × 2000), umgerechnet ins Bild; Figur und Name stehen in jedem Format mittig und passen hinein.
import { anteil, weich, ausblenden } from "../sketchory/ablauf.js?v=8";
import { zufall } from "./malen.js?v=5";
import { funkeln } from "./glitzer.js?v=5";

export const FARBEN = {
  hell: { grund: "#f7f3ec", tinte: "#24202e", gold: "#c99a2e", glanz: "#fff1b0", beere: "#b3264f", wange: "#f3b9c8" },
  dunkel: { grund: "#0e1430", tinte: "#f4efe6", gold: "#d9ad45", glanz: "#fff4c4", beere: "#d8486f", wange: "#e9a3b8" },
};
export const NAME = "Principesse";
export const DAUER = 5.2;                       // Sekunden, bis alles steht
export const SCHRIFT = { familie: '"Inter Display", "Helvetica Neue", Arial, sans-serif', gewicht: 500, groesse: 64, sperrung: 0.01 };
export const VON = "by Katharina Strickler";
export const VON_SCHRIFT = { familie: '"Inter Display", "Helvetica Neue", Arial, sans-serif', gewicht: 600, groesse: 30, sperrung: 0.06 };
// Streifen des Kleids von oben nach unten, wie in der Vorlage (hellblau, dunkles Petrol mit Glitzer, Indigo, Türkis); die Punkte indigo
const STREIFEN = ["#5a9fd8", "#1f5f63", "#3f4fc4", "#5a9fd8", "#1f5f63", "#3f4fc4", "#33a08b", "#5a9fd8", "#1f5f63"];
const GLITZERSTREIFEN = new Set([1, 4, 8]);
const PUNKT = "#3a43b4";

// ---------- die Figur (Vorlage 1500 × 2000) ----------
const bogen = (cx, cy, rx, ry, von, bis, n = 48, dreh = 0) => {
  const p = [];
  for (let k = 0; k <= n; k++) {
    const t = von + ((bis - von) * k) / n, x = rx * Math.cos(t), y = ry * Math.sin(t);
    p.push(cx + x * Math.cos(dreh) - y * Math.sin(dreh), cy + x * Math.sin(dreh) + y * Math.cos(dreh));
  }
  return p;
};
const kreis = (cx, cy, r) => bogen(cx, cy, r, r, -Math.PI / 2, Math.PI * 1.5, 28);
const quadratisch = (a, c, b, n = 24) => {
  const p = [];
  for (let k = 0; k <= n; k++) { const t = k / n, u = 1 - t; p.push(u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]); }
  return p;
};
// Gesicht: ein leicht nach rechts geneigtes Oval
const GESICHT = { cx: 790, cy: 745, rx: 505, ry: 205, dreh: 0.09 };
const KRONE = [[548, 522], [612, 196], [682, 378], [788, 206], [838, 392], [882, 238], [928, 384], [964, 250], [1012, 384], [1126, 256], [1062, 532]];
const KRONE_UNTEN = quadratisch([1062, 532], [800, 470], [548, 522], 16);
const KUGELN = [[612, 166, 30], [790, 164, 32], [882, 206, 30], [965, 220, 30], [1130, 224, 32]];
const KLEID = { ol: [645, 958], or: [905, 958], ul: [330, 1738], ur: [1188, 1748] };
const kleidX = (y, rechts) => {
  const t = (y - KLEID.ol[1]) / (KLEID.ul[1] - KLEID.ol[1]);
  return rechts ? KLEID.or[0] + (KLEID.ur[0] - KLEID.or[0]) * t : KLEID.ol[0] + (KLEID.ul[0] - KLEID.ol[0]) * t;
};

/** die Linien der Figur in Zeichenreihenfolge, Vorlage-Koordinaten */
export function linien() {
  const L = [];
  L.push({ teil: "krone", pts: [...KRONE.flat(), ...KRONE_UNTEN.slice(2)] });
  for (const [x, y, r] of KUGELN) L.push({ teil: "kugel", pts: kreis(x, y, r) });
  L.push({ teil: "gesicht", pts: bogen(GESICHT.cx, GESICHT.cy, GESICHT.rx, GESICHT.ry, Math.PI, Math.PI * 3, 80, GESICHT.dreh) });
  L.push({ teil: "auge", pts: kreis(575, 688, 17) });
  L.push({ teil: "auge", pts: kreis(946, 742, 17) });
  L.push({ teil: "mund", pts: quadratisch([552, 786], [770, 925], [1072, 802]) });
  L.push({ teil: "wange", pts: kreis(445, 778, 56) });
  L.push({ teil: "wange", pts: kreis(1142, 818, 56) });
  L.push({ teil: "kleid", pts: [KLEID.ol[0], KLEID.ol[1], KLEID.ul[0], KLEID.ul[1], ...quadratisch(KLEID.ul, [760, 1766], KLEID.ur, 12).slice(2), KLEID.or[0], KLEID.or[1]] });
  L.push({ teil: "kette", pts: quadratisch([672, 962], [770, 1430], [878, 962], 20) });
  for (let k = 0; k < 6; k++) { const x = kleidX(1650, false) + 70 + (k * (kleidX(1650, true) - kleidX(1650, false) - 140)) / 5; L.push({ teil: "punkt", pts: kreis(x, 1650, 22) }); }
  L.push({ teil: "fuss", pts: [455, 1762, 455, 1838, 565, 1838] });
  L.push({ teil: "fuss", pts: [765, 1768, 765, 1842, 858, 1842] });
  return L;
}

// ---------- Lage im Bild ----------
// Figur (Vorlage y 134–1845) und Name zusammen mittig im Bild; bei niedrigen Formaten (1 : 1, quer) entsprechend kleiner
function lage(breite, hoehe) {
  const mass = Math.min(0.44, (hoehe * 0.82 - 190) / 1711);
  const hoch = (1845 - 134) * mass + 190;
  const links = breite / 2 - 785 * mass, oben = (hoehe - hoch) / 2 - 134 * mass;
  return { mass, insBild: (x, y) => [links + x * mass, oben + y * mass], schriftY: oben + 1845 * mass + 110 * Math.max(0.75, mass / 0.44), schrift: SCHRIFT.groesse * Math.max(0.75, mass / 0.44), vonY: oben + 1845 * mass + 166 * Math.max(0.75, mass / 0.44), von: VON_SCHRIFT.groesse * Math.max(0.8, mass / 0.44) };
}

function vorbereiten(breite, hoehe) {
  const L = lage(breite, hoehe), { insBild } = L;
  const striche = linien().map((l) => {
    const pts = [];
    for (let k = 0; k < l.pts.length; k += 2) pts.push(...insBild(l.pts[k], l.pts[k + 1]));
    let lang = 0;
    const kum = [0];
    for (let k = 2; k < pts.length; k += 2) { lang += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]); kum.push(lang); }
    return { ...l, pts, kum, lang };
  });
  const gesamt = striche.reduce((a, s) => a + s.lang, 0);
  let bisher = 0;
  for (const s of striche) { s.von = bisher / gesamt; bisher += s.lang; s.bis = bisher / gesamt; }
  // Funken in der Krone (fest, damit jedes Video gleich funkelt)
  const rnd = zufall(5);
  const krone = KRONE.map(([x, y]) => insBild(x, y));
  const innen = (x, y) => { let c = false; for (let i = 0, j = krone.length - 1; i < krone.length; j = i++) { const [xi, yi] = krone[i], [xj, yj] = krone[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const xs = krone.map((p) => p[0]), ys = krone.map((p) => p[1]);
  const funken = [];
  while (funken.length < 70) {
    const x = Math.min(...xs) + rnd() * (Math.max(...xs) - Math.min(...xs)), y = Math.min(...ys) + rnd() * (Math.max(...ys) - Math.min(...ys));
    if (innen(x, y)) funken.push({ x, y, groesse: 1.2 + rnd() * 1.8, phase: rnd(), takt: 0.6 + rnd() * 1.2, stern: rnd() < 0.12 });
  }
  // das Kleid: Umriss und Streifen; Funken auf den dunklen Streifen
  const kleid = striche.find((x) => x.teil === "kleid").pts;
  const kys = kleid.filter((_, k) => k % 2), oben = Math.min(...kys), unten = Math.max(...kys), band = (unten - oben) / STREIFEN.length;
  const kleidPfad = [];
  for (let k = 0; k < kleid.length; k += 2) kleidPfad.push([kleid[k], kleid[k + 1]]);
  const imKleid = (x, y) => { let c = false; for (let i = 0, j = kleidPfad.length - 1; i < kleidPfad.length; j = i++) { const [xi, yi] = kleidPfad[i], [xj, yj] = kleidPfad[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const kxs = kleid.filter((_, k) => k % 2 === 0), kx0 = Math.min(...kxs), kx1 = Math.max(...kxs);
  const kleidFunken = [];
  for (let n = 0; kleidFunken.length < 90 && n < 6000; n++) {
    const x = kx0 + rnd() * (kx1 - kx0), y = oben + rnd() * (unten - oben), b = Math.floor((y - oben) / band);
    if (GLITZERSTREIFEN.has(b) && imKleid(x, y)) kleidFunken.push({ x, y, groesse: 1 + rnd() * 1.4, phase: rnd(), takt: 0.6 + rnd() * 1.2, stern: rnd() < 0.1, farbe: [205, 245, 238] });
  }
  return { striche, krone, funken, L, kleidPfad, kleidOben: oben, band, kleidFunken, von: null };
}
const FIGUREN = new Map();

/** Bild t (Sekunden seit Beginn des Signets) auf ctx; Grund ist gemalt. farben: FARBEN.hell oder FARBEN.dunkel */
export function signet(ctx, t, farben, breite = 1080, hoehe = 1440) {
  const schluessel = `${breite}x${hoehe}`;
  if (!FIGUREN.has(schluessel)) FIGUREN.set(schluessel, vorbereiten(breite, hoehe));
  const fig = FIGUREN.get(schluessel), { striche, krone, funken, L } = fig, MASS = L.mass;
  const dunkel = farben.grund === FARBEN.dunkel.grund;
  // die Linien zeichnen sich (0,1–2,4 s), gleichmässig der Länge nach
  const p = anteil(t, 0.1, 2.4);
  // Flächen: Krone golden, Kugeln, Wangen (ab 2,0 s)
  const fuell = weich(anteil(t, 2.0, 2.7));
  if (fuell > 0) {
    ctx.save();
    ctx.globalAlpha = fuell;
    ctx.fillStyle = farben.gold;
    ctx.beginPath(); krone.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
    // das Kleid in Streifen (im Umriss)
    ctx.save();
    ctx.beginPath(); fig.kleidPfad.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.clip();
    STREIFEN.forEach((farbe, i) => { ctx.fillStyle = farbe; ctx.fillRect(0, fig.kleidOben + i * fig.band - 0.5, breite, fig.band + 1); });
    ctx.restore();
    for (const s of striche) if (s.teil === "kugel" || s.teil === "wange" || s.teil === "punkt") {
      ctx.fillStyle = s.teil === "kugel" ? farben.beere : s.teil === "wange" ? farben.wange : PUNKT;
      ctx.beginPath(); for (let k = 0; k < s.pts.length; k += 2) (k ? ctx.lineTo(s.pts[k], s.pts[k + 1]) : ctx.moveTo(s.pts[k], s.pts[k + 1])); ctx.fill();
    }
    ctx.restore();
  }
  Object.assign(ctx, { strokeStyle: farben.tinte, fillStyle: farben.tinte, lineWidth: Math.max(3.4, 5 * MASS / 0.44), lineCap: "round", lineJoin: "round" });
  for (const s of striche) {
    if (p <= s.von) break;
    const bis = Math.min(1, (p - s.von) / (s.bis - s.von)) * s.lang;
    ctx.beginPath();
    ctx.moveTo(s.pts[0], s.pts[1]);
    for (let k = 1; k < s.kum.length; k++) {
      if (s.kum[k] <= bis) { ctx.lineTo(s.pts[2 * k], s.pts[2 * k + 1]); continue; }
      const f = (bis - s.kum[k - 1]) / (s.kum[k] - s.kum[k - 1] || 1);
      ctx.lineTo(s.pts[2 * k - 2] + (s.pts[2 * k] - s.pts[2 * k - 2]) * f, s.pts[2 * k - 1] + (s.pts[2 * k + 1] - s.pts[2 * k - 1]) * f);
      break;
    }
    ctx.stroke();
    if (s.teil === "auge" && bis >= s.lang) { ctx.beginPath(); ctx.arc(s.pts[0], s.pts[1] + 17 * MASS, 17 * MASS, 0, Math.PI * 2); ctx.fill(); }
  }
  // die Krone funkelt
  const glanz = anteil(t, 2.3, 3.0);
  if (glanz > 0) { funkenZeichnen(ctx, funken, t, glanz, farben.glanz); funkenZeichnen(ctx, fig.kleidFunken, t, glanz * 0.9, farben.glanz); }
  // der Name, Buchstabe um Buchstabe, in der Grotesk
  ctx.save();
  const gross = Math.round(L.schrift);
  ctx.font = `${SCHRIFT.gewicht} ${gross}px ${SCHRIFT.familie}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${(SCHRIFT.sperrung * gross).toFixed(1)}px`;
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left"; ctx.fillStyle = farben.tinte;
  const weite = ctx.measureText(NAME).width;
  [...NAME].forEach((z, i) => {
    const e = weich(anteil(t, 2.7 + i * 0.07, 3.15 + i * 0.07));
    const bx = breite / 2 - weite / 2 + ctx.measureText(NAME.slice(0, i)).width;
    if (e > 0) { ctx.globalAlpha = e; ctx.fillText(z, bx, L.schriftY + (1 - e) * 12); }
  });
  // «by Katharina Strickler» in Gold, das glitzert: Körner in den Buchstaben, ein Glanz, der darüber zieht, ein paar Sterne
  const vonEin = weich(anteil(t, 3.7, 4.4));
  if (vonEin > 0) {
    const klein = Math.round(L.von);
    fig.von ??= vonZeile(klein);
    const z = fig.von, vx = breite / 2 - z.weite / 2, vy = L.vonY + (1 - vonEin) * 8;
    ctx.restore(); ctx.save();
    ctx.globalAlpha = vonEin;
    ctx.drawImage(vonBild(z, t, farben, dunkel), vx - z.rand, vy - z.grund);
    ctx.globalAlpha = 1;
    sterne(ctx, z.sterne.map((s) => ({ ...s, x: vx + s.x, y: vy + s.y })), t, vonEin, dunkel ? farben.glanz : farben.gold, dunkel);
  }
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  ctx.restore();
}

const leinwandFuer = (w, h) => (typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h }));

/** die Zeile «by Katharina Strickler» einmal vorbereiten: Mass, Körner in den Buchstaben, Sterne an den Oberkanten */
function vonZeile(klein) {
  const font = `${VON_SCHRIFT.gewicht} ${klein}px ${VON_SCHRIFT.familie}`, sperrung = `${(VON_SCHRIFT.sperrung * klein).toFixed(1)}px`;
  const rand = Math.ceil(klein * 0.6), grund = Math.ceil(klein * 1.2);
  const c0 = leinwandFuer(8, 8).getContext("2d");
  c0.font = font; if ("letterSpacing" in c0) c0.letterSpacing = sperrung;
  const weite = Math.ceil(c0.measureText(VON).width), w = weite + 2 * rand, h = grund + Math.ceil(klein * 0.6);
  const bild = leinwandFuer(w, h), m = bild.getContext("2d", { willReadFrequently: true });
  m.font = font; if ("letterSpacing" in m) m.letterSpacing = sperrung;
  m.textBaseline = "alphabetic"; m.fillStyle = "#000"; m.fillText(VON, rand, grund);
  const d = m.getImageData(0, 0, w, h).data, rnd = zufall(23), koerner = [], oben = [];
  const voll = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 140;
  for (let n = 0; koerner.length < 320 && n < 40000; n++) {
    const px = Math.floor(rnd() * w), py = Math.floor(rnd() * h);
    if (voll(px, py)) koerner.push({ x: px, y: py, groesse: 0.5 + rnd() * 0.9, phase: rnd(), takt: 0.6 + rnd() * 1.4, hell: rnd() < 0.7 });
  }
  for (let x = rand + 2; x < w - rand; x += 2) for (let y = 0; y < h; y++) if (voll(x, y)) { oben.push([x, y]); break; }
  const sterne = [];
  for (let k = 0; k < 7 && oben.length; k++) {
    const [x, y] = oben[Math.floor(((k + 0.2 + rnd() * 0.6) / 7) * oben.length)];
    sterne.push({ x: x - rand, y: y - grund - 1, groesse: klein * (0.08 + rnd() * 0.04), phase: rnd(), takt: 0.45 + rnd() * 0.5, stern: true });
  }
  return { font, sperrung, weite, rand, grund, bild, koerner, sterne };
}

/** die Zeile in Gold, mit funkelnden Körnern und einem Glanz, der langsam darüber zieht */
function vonBild(z, t, farben, dunkel) {
  const m = z.bild.getContext("2d"), w = z.bild.width, h = z.bild.height;
  m.save();
  m.clearRect(0, 0, w, h);
  m.globalCompositeOperation = "source-over"; m.globalAlpha = 1;
  m.font = z.font; if ("letterSpacing" in m) m.letterSpacing = z.sperrung;
  const tief = dunkel ? farben.gold : "#a8791c", mitte = dunkel ? "#e7c25e" : farben.gold, hoch = dunkel ? farben.glanz : "#e9c95f";
  const g = m.createLinearGradient(0, 0, w, h * 0.4), s = ((t * 0.32) % 1.7) - 0.35;
  g.addColorStop(0, tief); g.addColorStop(Math.min(1, Math.max(0, s - 0.18)), mitte);
  g.addColorStop(Math.min(1, Math.max(0, s)), hoch); g.addColorStop(Math.min(1, Math.max(0, s + 0.18)), mitte); g.addColorStop(1, tief);
  m.fillStyle = g; m.fillText(VON, z.rand, z.grund);
  m.globalCompositeOperation = "source-atop";
  for (const k of z.koerner) {
    const a = funkeln(k, t);
    if (a < 0.08) continue;
    m.globalAlpha = Math.min(1, a * (k.hell ? 1 : 0.6));
    m.fillStyle = k.hell ? (dunkel ? "#fffbe6" : "#fff4c8") : dunkel ? "#8a6414" : "#7a560f";
    m.beginPath(); m.arc(k.x, k.y, k.groesse * (0.7 + 0.6 * a), 0, Math.PI * 2); m.fill();
  }
  m.restore();
  return z.bild;
}

/** kleine Sterne aus zwei Strahlen; auf hellem Grund in Gold mit weisser Mitte */
function sterne(ctx, liste, t, staerke, farbe, dunkel) {
  ctx.save();
  ctx.globalCompositeOperation = dunkel ? "lighter" : "source-over";
  ctx.lineCap = "round";
  for (const f of liste) {
    const h = funkeln(f, t) * staerke;
    if (h < 0.3) continue;
    const s = f.groesse * 3.2 * h, r = Math.max(1, f.groesse * 0.35);
    ctx.globalAlpha = Math.min(1, h);
    ctx.strokeStyle = farbe; ctx.lineWidth = r;
    ctx.beginPath(); ctx.moveTo(f.x - s, f.y); ctx.lineTo(f.x + s, f.y); ctx.moveTo(f.x, f.y - s); ctx.lineTo(f.x, f.y + s); ctx.stroke();
    ctx.fillStyle = dunkel ? farbe : "#fffaf0";
    ctx.beginPath(); ctx.arc(f.x, f.y, r * 1.1, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Funken: ein weicher Lichtpunkt, die hellsten mit einem kleinen Stern aus zwei Strahlen */
export function funkenZeichnen(ctx, funken, t, staerke, glanz, skala = 1) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const f of funken) {
    const h = funkeln(f, t) * staerke;
    if (h < 0.05) continue;
    const r = f.groesse * skala * (0.8 + 1.4 * h);
    const farbe = f.farbe ? `rgb(${f.farbe[0]},${f.farbe[1]},${f.farbe[2]})` : glanz;
    ctx.globalAlpha = Math.min(1, h);
    ctx.fillStyle = farbe;
    ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.fill();
    if (f.stern && h > 0.45) {
      const s = r * 5.5 * h;
      ctx.globalAlpha = Math.min(1, h * 0.85);
      ctx.strokeStyle = farbe; ctx.lineWidth = Math.max(1, r * 0.45); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(f.x - s, f.y); ctx.lineTo(f.x + s, f.y); ctx.moveTo(f.x, f.y - s); ctx.lineTo(f.x, f.y + s); ctx.stroke();
    }
  }
  ctx.restore();
}

export const ausblendKurve = ausblenden;
