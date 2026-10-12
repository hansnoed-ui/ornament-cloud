// «Principesse» – das Signet am Schluss des Films: eine kleine Prinzessin zeichnet sich (nach der Vorlage vom 12. Oktober 2026:
// Krone mit fünf Kugeln, Lockenkopf, rundes Gesicht mit Wangen und Lächeln, Kleid mit Streifen und Punkten, zwei Füsse),
// dann füllt sich die Krone golden und funkelt, die Kugeln werden himbeerrot, die Wangen rosa; darunter erscheint «Principesse».
// Alle Masse in Punkten der Vorlage (1500 × 2000), umgerechnet ins Bild; Figur und Name stehen in jedem Format mittig und passen hinein.
import { anteil, weich, ausblenden } from "../sketchory/ablauf.js?v=8";
import { zufall } from "./malen.js?v=1";
import { funkeln } from "./glitzer.js?v=1";

export const FARBEN = {
  hell: { grund: "#f7f3ec", tinte: "#24202e", gold: "#c99a2e", glanz: "#fff1b0", beere: "#b3264f", wange: "#f3b9c8" },
  dunkel: { grund: "#0e1430", tinte: "#f4efe6", gold: "#d9ad45", glanz: "#fff4c4", beere: "#d8486f", wange: "#e9a3b8" },
};
export const NAME = "Principesse";
export const DAUER = 5.2;                       // Sekunden, bis alles steht
export const SCHRIFT = { familie: "Newsreader, Georgia, serif", gewicht: 400, stil: "italic", groesse: 104 };

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
/** Locken: kleine Bögen entlang einer Linie (nach aussen gewölbt) */
function locken(punkte, anzahl, tiefe) {
  const p = [];
  for (let k = 0; k < anzahl; k++) {
    const a = punkte(k / anzahl), b = punkte((k + 1) / anzahl);
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = dy / l, ny = -dx / l;                           // nach aussen (oben/links)
    p.push(...quadratisch(a, [mx + nx * tiefe, my + ny * tiefe], b, 10).slice(k ? 2 : 0));
  }
  return p;
}
// Gesicht: ein leicht nach rechts geneigtes Oval
const GESICHT = { cx: 790, cy: 745, rx: 505, ry: 205, dreh: 0.09 };
const aufGesicht = (t, aussen = 0) => {
  const { cx, cy, rx, ry, dreh } = GESICHT, x = (rx + aussen) * Math.cos(t), y = (ry + aussen) * Math.sin(t);
  return [cx + x * Math.cos(dreh) - y * Math.sin(dreh), cy + x * Math.sin(dreh) + y * Math.cos(dreh)];
};
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
  L.push({ teil: "haar", pts: locken((t) => aufGesicht(Math.PI * 0.98 + t * Math.PI * 1.06, 62), 15, 38) });
  L.push({ teil: "gesicht", pts: bogen(GESICHT.cx, GESICHT.cy, GESICHT.rx, GESICHT.ry, Math.PI, Math.PI * 3, 80, GESICHT.dreh) });
  L.push({ teil: "auge", pts: kreis(575, 688, 17) });
  L.push({ teil: "auge", pts: kreis(946, 742, 17) });
  L.push({ teil: "mund", pts: quadratisch([552, 786], [770, 925], [1072, 802]) });
  L.push({ teil: "wange", pts: kreis(445, 778, 56) });
  L.push({ teil: "wange", pts: kreis(1142, 818, 56) });
  L.push({ teil: "kleid", pts: [KLEID.ol[0], KLEID.ol[1], KLEID.ul[0], KLEID.ul[1], ...quadratisch(KLEID.ul, [760, 1766], KLEID.ur, 12).slice(2), KLEID.or[0], KLEID.or[1]] });
  L.push({ teil: "kette", pts: quadratisch([672, 962], [770, 1430], [878, 962], 20) });
  for (const y of [1100, 1250, 1400, 1550]) L.push({ teil: "streifen", pts: [kleidX(y, false) + 14, y, kleidX(y, true) - 14, y] });
  for (let k = 0; k < 6; k++) { const x = kleidX(1650, false) + 70 + (k * (kleidX(1650, true) - kleidX(1650, false) - 140)) / 5; L.push({ teil: "punkt", pts: kreis(x, 1650, 22) }); }
  L.push({ teil: "fuss", pts: [455, 1762, 455, 1838, 565, 1838] });
  L.push({ teil: "fuss", pts: [765, 1768, 765, 1842, 858, 1842] });
  return L;
}

// ---------- Lage im Bild ----------
// Figur (Vorlage y 134–1845) und Name zusammen mittig im Bild; bei niedrigen Formaten (1 : 1, quer) entsprechend kleiner
function lage(breite, hoehe) {
  const mass = Math.min(0.44, (hoehe * 0.82 - 150) / 1711);
  const hoch = (1845 - 134) * mass + 150;
  const links = breite / 2 - 785 * mass, oben = (hoehe - hoch) / 2 - 134 * mass;
  return { mass, insBild: (x, y) => [links + x * mass, oben + y * mass], schriftY: oben + 1845 * mass + 132 * Math.max(0.75, mass / 0.44), schrift: SCHRIFT.groesse * Math.max(0.75, mass / 0.44) };
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
  return { striche, krone, funken, L };
}
const FIGUREN = new Map();

/** Bild t (Sekunden seit Beginn des Signets) auf ctx; Grund ist gemalt. farben: FARBEN.hell oder FARBEN.dunkel */
export function signet(ctx, t, farben, breite = 1080, hoehe = 1440) {
  const schluessel = `${breite}x${hoehe}`;
  if (!FIGUREN.has(schluessel)) FIGUREN.set(schluessel, vorbereiten(breite, hoehe));
  const { striche, krone, funken, L } = FIGUREN.get(schluessel), MASS = L.mass;
  // die Linien zeichnen sich (0,1–2,4 s), gleichmässig der Länge nach
  const p = anteil(t, 0.1, 2.4);
  // Flächen: Krone golden, Kugeln, Wangen (ab 2,0 s)
  const fuell = weich(anteil(t, 2.0, 2.7));
  if (fuell > 0) {
    ctx.save();
    ctx.globalAlpha = fuell;
    ctx.fillStyle = farben.gold;
    ctx.beginPath(); krone.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
    for (const s of striche) if (s.teil === "kugel" || s.teil === "wange") {
      ctx.fillStyle = s.teil === "kugel" ? farben.beere : farben.wange;
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
  if (glanz > 0) funkenZeichnen(ctx, funken, t, glanz, farben.glanz);
  // der Name, Buchstabe um Buchstabe
  ctx.save();
  ctx.font = `${SCHRIFT.stil} ${SCHRIFT.gewicht} ${Math.round(L.schrift)}px ${SCHRIFT.familie}`;
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left"; ctx.fillStyle = farben.tinte;
  const weite = ctx.measureText(NAME).width;
  [...NAME].forEach((z, i) => {
    const e = weich(anteil(t, 2.7 + i * 0.075, 3.2 + i * 0.075));
    const bx = breite / 2 - weite / 2 + ctx.measureText(NAME.slice(0, i)).width;
    if (e > 0) { ctx.globalAlpha = e; ctx.fillText(z, bx, L.schriftY + (1 - e) * 14); }
  });
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
