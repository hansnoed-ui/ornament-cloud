// Neubau /b/: die Bilder der sieben Apps (20. Oktober 2026, Wunsch von Christian: «Die Beitragsbilder bzw. Karten für die Apps möchte ich alle
// stilvoll re-designt, nicht dieses farbige Durcheinander. Gerne die eine oder andere Farbe, aber alles stilisiert, zur Seite passend.»).
// Sieben Tafeln, 1200 × 1200, als SVG geschrieben (scharf in jeder Grösse, wenige Kilobyte): Tinte auf Papier, die Blaupause als Akzent, je App ein
// Motiv aus ihrer eigenen Mechanik (Zeichen aus src/b/zeichen.mjs, ins Grosse gebaut). Jede Tafel hell und dunkel (echte Umkehr, wie die Seite;
// die Seite wählt mit <picture> nach prefers-color-scheme). Nur OMNA COLOR trägt Farbe – dort ist Farbe der Inhalt. Die Striche sind für die
// Kachel bemessen (etwa 250 bis 420 px breit): 3 für Hauptlinien, 2 für Nebenlinien. Alles aus einem festen Startwert, darum bei jedem Lauf gleich.
//
//   node tools/b-app-bilder.mjs                                   alle nach b/bilder/apps/<slug>.svg und <slug>-dunkel.svg
//   node tools/b-app-bilder.mjs phorma                            nur Apps, deren Kennung so beginnt
//   NODE_PATH=$(npm root -g) node tools/b-app-bilder.mjs --png    zusätzlich PNG-Abzüge zum Anschauen (Playwright), nicht eingecheckt
import { writeFileSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const AUS = new URL("../b/bilder/apps/", import.meta.url);
mkdirSync(AUS, { recursive: true });
const argv = process.argv.slice(2);
const png = argv.includes("--png");
const filter = argv.find((a) => !a.startsWith("--")) || "";
const W = 1200, M = 600;   // Seite und Mitte

/** fester Zufall (mulberry32), damit die Tafeln bei jedem Lauf gleich sind */
function zufall(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const f = (n) => Number(n.toFixed(2));
const polar = (r, grad, cx = M, cy = M) => [f(cx + r * Math.cos((grad - 90) * Math.PI / 180)), f(cy + r * Math.sin((grad - 90) * Math.PI / 180))];
const bogen = (r, von, bis) => { const [x1, y1] = polar(r, von), [x2, y2] = polar(r, bis); return `M${x1} ${y1}A${r} ${r} 0 ${bis - von > 180 ? 1 : 0} 1 ${x2} ${y2}`; };

/** Farben je Modus: Tinte, Papier, Grau, Linie, Faden (die Blaupause), Faden hell */
const farben = (dunkel) => dunkel
  ? { papier: "#000000", tinte: "#ffffff", grau: "#9a9a9a", linie: "#2e2e2e", faden: "#8fb0ff", fadenHell: "rgba(143,176,255,0.22)" }
  : { papier: "#ffffff", tinte: "#000000", grau: "#6f6f6f", linie: "#dadada", faden: "#1d3fd6", fadenHell: "rgba(29,63,214,0.16)" };

/* ---------- die Motive: jede Funktion gibt den Inhalt des SVG (ohne Hülle) ---------- */

/** ORNA: zwei Ringe zu je zwanzig Feldern, gegeneinander gedreht; wo sie stehen bleiben, die Begegnung in der Blaupause */
function orna(c) {
  const s = [];
  const ring = (ra, ri, n, versatz, strich) => {
    s.push(`<circle cx="${M}" cy="${M}" r="${ra}" fill="none" stroke="${c.tinte}" stroke-width="${strich}"/>`);
    s.push(`<circle cx="${M}" cy="${M}" r="${ri}" fill="none" stroke="${c.tinte}" stroke-width="${strich}"/>`);
    for (let i = 0; i < n; i++) { const [x1, y1] = polar(ri, versatz + i * 360 / n), [x2, y2] = polar(ra, versatz + i * 360 / n); s.push(`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c.tinte}" stroke-width="2"/>`); }
  };
  ring(470, 400, 20, 0, 3);
  ring(350, 280, 20, 9, 3);
  // die Begegnung: ein Feld aussen und eines innen, aufeinander zu, in der Blaupause gefüllt; dazwischen der Faden
  const feld = (ra, ri, von, bis) => { const [ax, ay] = polar(ra, von), [bx, by] = polar(ra, bis), [cx, cy] = polar(ri, bis), [dx, dy] = polar(ri, von);
    return `<path d="M${ax} ${ay}A${ra} ${ra} 0 0 1 ${bx} ${by}L${cx} ${cy}A${ri} ${ri} 0 0 0 ${dx} ${dy}Z" fill="${c.fadenHell}" stroke="${c.faden}" stroke-width="3"/>`; };
  s.push(feld(470, 400, -9, 9));
  s.push(feld(350, 280, 0, 18));
  const [ax, ay] = polar(400, 0), [bx, by] = polar(350, 9);
  s.push(`<path d="M${ax} ${ay}L${bx} ${by}" stroke="${c.faden}" stroke-width="3"/>`);
  s.push(`<circle cx="${M}" cy="${M}" r="10" fill="${c.faden}"/>`);
  s.push(`<circle cx="${M}" cy="${M}" r="120" fill="none" stroke="${c.linie}" stroke-width="2"/>`);
  for (let i = 0; i < 20; i++) { const [x, y] = polar(120, i * 18); s.push(`<circle cx="${x}" cy="${y}" r="3.5" fill="${c.tinte}"/>`); }
  return s.join("");
}

/** ORMA: ein Kreis, in der Mitte geteilt – links Papier, rechts Tinte; zwei Personen an einem Tisch, der Re-Entry als Punkt in der Blaupause */
function orma(c) {
  const r = 360;
  return [
    `<circle cx="${M}" cy="${M}" r="${r}" fill="none" stroke="${c.tinte}" stroke-width="4"/>`,
    `<path d="M${M} ${M - r}A${r} ${r} 0 0 1 ${M} ${M + r}Z" fill="${c.tinte}"/>`,
    `<path d="M${M} 90L${M} ${W - 90}" stroke="${c.tinte}" stroke-width="2"/>`,
    `<circle cx="${M - r - 80}" cy="${M}" r="20" fill="none" stroke="${c.tinte}" stroke-width="4"/>`,
    `<circle cx="${M + r + 80}" cy="${M}" r="20" fill="${c.tinte}"/>`,
    `<circle cx="${M - 150}" cy="${M}" r="12" fill="${c.faden}"/>`,
    `<circle cx="${M + 150}" cy="${M}" r="12" fill="${c.faden}"/>`,
    `<circle cx="${M - 150}" cy="${M}" r="60" fill="none" stroke="${c.faden}" stroke-width="3"/>`,
    `<circle cx="${M + 150}" cy="${M}" r="60" fill="none" stroke="${c.faden}" stroke-width="3"/>`,
  ].join("");
}

/** OMNA COLOR: zwei Farbräder mit je sieben Themen, gegeneinander gedreht; aussen die Farbe, innen die Linie; der Lesestrich oben */
function omnaColor(c) {
  const s = [];
  const n = 7, toene = [8, 36, 62, 150, 200, 250, 300];   // sieben Farbtöne, gedämpft
  for (let i = 0; i < n; i++) {
    const von = i * 360 / n, bis = (i + 1) * 360 / n;
    s.push(`<path d="${bogen(385, von + 0.6, bis - 0.6)}" fill="none" stroke="hsl(${toene[i]} 46% 66%)" stroke-width="110"/>`);
  }
  s.push(`<circle cx="${M}" cy="${M}" r="440" fill="none" stroke="${c.tinte}" stroke-width="3"/>`);
  s.push(`<circle cx="${M}" cy="${M}" r="330" fill="none" stroke="${c.tinte}" stroke-width="3"/>`);
  for (let i = 0; i < n; i++) { const [x1, y1] = polar(330, i * 360 / n), [x2, y2] = polar(440, i * 360 / n); s.push(`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c.papier}" stroke-width="5"/>`); }
  const v = 26;   // das innere Rad steht anders
  s.push(`<circle cx="${M}" cy="${M}" r="290" fill="none" stroke="${c.tinte}" stroke-width="3"/>`);
  s.push(`<circle cx="${M}" cy="${M}" r="190" fill="none" stroke="${c.tinte}" stroke-width="3"/>`);
  for (let i = 0; i < n; i++) {
    const [x1, y1] = polar(190, v + i * 360 / n), [x2, y2] = polar(290, v + i * 360 / n);
    s.push(`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c.tinte}" stroke-width="3"/>`);
    for (let k = 1; k <= 3; k++) { const [a, b] = polar(190 + k * 25, v + (i + 0.5) * 360 / n); s.push(`<circle cx="${a}" cy="${b}" r="${k === 2 ? 6 : 3.5}" fill="${c.tinte}"/>`); }
  }
  const [lx, ly] = polar(470, 0), [mx, my] = polar(160, 0);
  s.push(`<path d="M${lx} ${ly}L${mx} ${my}" stroke="${c.faden}" stroke-width="4"/>`);
  s.push(`<circle cx="${M}" cy="${M}" r="10" fill="${c.faden}"/>`);
  return s.join("");
}

/** Delaunay (Bowyer–Watson) für PHORMA I */
function delaunay(punkte) {
  const sup = [[-1e5, -1e5], [3e5, -1e5], [-1e5, 3e5]];
  const P = [...punkte, ...sup];
  const umkreis = (a, b, c) => {
    const [ax, ay] = P[a], [bx, by] = P[b], [cx, cy] = P[c];
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    return { x: ux, y: uy, r2: (ax - ux) ** 2 + (ay - uy) ** 2 };
  };
  let dreiecke = [{ p: [P.length - 3, P.length - 2, P.length - 1], u: umkreis(P.length - 3, P.length - 2, P.length - 1) }];
  for (let i = 0; i < punkte.length; i++) {
    const [x, y] = P[i];
    const schlecht = dreiecke.filter((t) => (x - t.u.x) ** 2 + (y - t.u.y) ** 2 < t.u.r2);
    const kanten = new Map();
    for (const t of schlecht) for (let k = 0; k < 3; k++) { const a = t.p[k], b = t.p[(k + 1) % 3]; const key = a < b ? `${a}-${b}` : `${b}-${a}`; kanten.set(key, (kanten.get(key) || 0) + 1); }
    dreiecke = dreiecke.filter((t) => !schlecht.includes(t));
    for (const [key, n] of kanten) if (n === 1) { const [a, b] = key.split("-").map(Number); dreiecke.push({ p: [a, b, i], u: umkreis(a, b, i) }); }
  }
  return dreiecke.filter((t) => t.p.every((k) => k < punkte.length)).map((t) => t.p);
}

/** PHORMA I: ein Kristall aus Scherben – Dreiecke über zufälligen Punkten in einer Scheibe, eine Scherbe in der Blaupause, einige hell */
function phormaI(c) {
  const z = zufall(7);
  const punkte = [];
  for (let i = 0; i < 14; i++) punkte.push(polar(420 + z() * 30, i * 360 / 14 + z() * 12));
  for (let i = 0; i < 34; i++) { const r = 80 + Math.sqrt(z()) * 320, a = z() * 360; punkte.push(polar(r, a)); }
  const dreiecke = delaunay(punkte);
  const s = [];
  const flaeche = (t) => { const [a, b, d] = t.map((k) => punkte[k]); return Math.abs((b[0] - a[0]) * (d[1] - a[1]) - (d[0] - a[0]) * (b[1] - a[1])) / 2; };
  const sortiert = [...dreiecke].sort((p, q) => flaeche(q) - flaeche(p));
  const voll = sortiert[6], hell = [sortiert[2], sortiert[9], sortiert[14], sortiert[20]];
  for (const t of dreiecke) {
    const d = `M${t.map((k) => punkte[k].join(" ")).join("L")}Z`;
    const fuell = t === voll ? c.faden : hell.includes(t) ? c.fadenHell : "none";
    s.push(`<path d="${d}" fill="${fuell}" stroke="${c.tinte}" stroke-width="2.4" stroke-linejoin="round"/>`);
  }
  return s.join("");
}

/** PHORMA II: eine Linie wächst – Differential Growth aus einem Keim, bis sie die Scheibe füllt; der Keim in der Blaupause */
function phormaII(c) {
  const z = zufall(11);
  let pts = [];
  for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; pts.push([M + Math.cos(a) * (70 + z() * 8), M + Math.sin(a) * (70 + z() * 8)]); }
  const R = 430, MAX = 2200;
  for (let schritt = 0; schritt < 420 && pts.length < MAX; schritt++) {
    // Gitter für die Abstossung
    const zelle = 28, g = new Map();
    pts.forEach((p, i) => { const k = `${Math.floor(p[0] / zelle)},${Math.floor(p[1] / zelle)}`; (g.get(k) || g.set(k, []).get(k)).push(i); });
    const neu = pts.map((p, i) => {
      const n = pts.length, vor = pts[(i + n - 1) % n], nach = pts[(i + 1) % n];
      let dx = ((vor[0] + nach[0]) / 2 - p[0]) * 0.09, dy = ((vor[1] + nach[1]) / 2 - p[1]) * 0.09;   // Zug zu den Nachbarn
      const gx = Math.floor(p[0] / zelle), gy = Math.floor(p[1] / zelle);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const j of g.get(`${gx + a},${gy + b}`) || []) {
        if (j === i) continue;
        const ex = p[0] - pts[j][0], ey = p[1] - pts[j][1], d2 = ex * ex + ey * ey;
        if (d2 < 26 * 26 && d2 > 0.01) { const d = Math.sqrt(d2), kraft = (26 - d) / 26 * 1.1; dx += ex / d * kraft; dy += ey / d * kraft; }
      }
      dx += (z() - 0.5) * 0.3; dy += (z() - 0.5) * 0.3;
      let x = p[0] + dx, y = p[1] + dy;
      const rx = x - M, ry = y - M, r = Math.hypot(rx, ry);
      if (r > R) { x = M + rx / r * R; y = M + ry / r * R; }   // die Scheibe hält
      return [x, y];
    });
    // lange Kanten teilen
    pts = [];
    for (let i = 0; i < neu.length; i++) {
      const p = neu[i], q = neu[(i + 1) % neu.length];
      pts.push(p);
      if (Math.hypot(q[0] - p[0], q[1] - p[1]) > 11 && pts.length < MAX) pts.push([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]);
    }
  }
  const d = pts.map((p, i) => (i ? "L" : "M") + f(p[0]) + " " + f(p[1])).join("") + "Z";
  return [
    `<circle cx="${M}" cy="${M}" r="${R + 30}" fill="none" stroke="${c.linie}" stroke-width="2"/>`,
    `<path d="${d}" fill="none" stroke="${c.tinte}" stroke-width="3.2" stroke-linejoin="round"/>`,
    `<circle cx="${f(pts[0][0])}" cy="${f(pts[0][1])}" r="12" fill="${c.faden}"/>`,
  ].join("");
}

/** PHORMA III: ein Gewebe – Bänder aus feinen Linien, wie zerknitterte Seide, vom Ton bewegt; ein Band in der Blaupause */
function phormaIII(c) {
  const z = zufall(23);
  const s = [];
  const band = (y0, amp, phase, neigung, farbe, n, deck) => {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      let d = "";
      for (let k = 0; k <= 24; k++) {
        const x = 60 + k / 24 * (W - 120);
        const u = k / 24;
        const welle = Math.sin(u * Math.PI * 2 * 1.3 + phase + t * 0.9) * amp * (0.5 + t) + Math.sin(u * Math.PI * 7 + phase * 3 + t * 5) * 14 * t;
        const y = y0 + (u - 0.5) * neigung + welle + t * 160 + (z() - 0.5) * 2;
        d += (k ? "L" : "M") + f(x) + " " + f(Math.max(40, Math.min(W - 40, y)));
      }
      s.push(`<path d="${d}" fill="none" stroke="${farbe}" stroke-width="1.3" stroke-opacity="${deck}"/>`);
    }
  };
  band(300, 90, 0.4, 260, c.tinte, 48, 0.8);
  band(520, 70, 2.1, -380, c.tinte, 48, 0.8);
  band(640, 110, 4.0, 180, c.faden, 40, 0.95);
  return s.join("");
}

/** The Fictory: ein Bild in Teilen – ein Raster von Kacheln, jede aus ihrer Herkunft gewandert und gedreht; die Herkunft als Spur, Kopplungen als Fäden */
function fictory(c) {
  const z = zufall(5);
  const s = [], spalten = 6, zeilen = 6, k = 118, luecke = 14;
  const breite = spalten * k + (spalten - 1) * luecke, x0 = (W - breite) / 2, y0 = (W - (zeilen * k + (zeilen - 1) * luecke)) / 2;
  const kacheln = [];
  for (let r = 0; r < zeilen; r++) for (let q = 0; q < spalten; q++) {
    const x = x0 + q * (k + luecke), y = y0 + r * (k + luecke);
    const cx = x + k / 2, cy = y + k / 2;
    const weit = Math.hypot(cx - M, cy - M) / 420;
    const dx = (cx - M) * 0.22 * weit + (z() - 0.5) * 60, dy = (cy - M) * 0.22 * weit + (z() - 0.5) * 60;
    const dreh = (z() - 0.5) * 36 * (0.4 + weit);
    kacheln.push({ x, y, cx, cy, dx, dy, dreh });
    s.push(`<rect x="${x}" y="${y}" width="${k}" height="${k}" fill="none" stroke="${c.linie}" stroke-width="2" stroke-dasharray="6 7"/>`);
  }
  for (let i = 0; i < 9; i++) {
    const a = kacheln[Math.floor(z() * kacheln.length)], b = kacheln[Math.floor(z() * kacheln.length)];
    if (a !== b) s.push(`<path d="M${f(a.cx + a.dx)} ${f(a.cy + a.dy)}L${f(b.cx + b.dx)} ${f(b.cy + b.dy)}" stroke="${c.grau}" stroke-width="1.6"/>`);
  }
  kacheln.forEach((t, i) => {
    const fuell = i === 15 ? c.faden : [8, 22, 27].includes(i) ? c.fadenHell : c.papier;
    s.push(`<rect x="${t.x}" y="${t.y}" width="${k}" height="${k}" fill="${fuell}" stroke="${c.tinte}" stroke-width="2.6" transform="translate(${f(t.dx)} ${f(t.dy)}) rotate(${f(t.dreh)} ${t.cx} ${t.cy})"/>`);
  });
  return s.join("");
}

export const TAFELN = {
  orna: { zeichne: orna, alt: "ORNA, gezeichnet: zwei Ringe zu je zwanzig Feldern, gegeneinander gedreht; wo sie stehen bleiben, die Begegnung in Blau" },
  orma: { zeichne: orma, alt: "ORMA, gezeichnet: ein Kreis, in der Mitte geteilt, links Papier, rechts Tinte; zwei Personen an einem Tisch" },
  "omna-color": { zeichne: omnaColor, alt: "OMNA COLOR, gezeichnet: zwei Räder mit je sieben Feldern, aussen in sieben Farben, innen als Linie, gegeneinander gedreht" },
  "phorma-i": { zeichne: phormaI, alt: "PHORMA I, gezeichnet: ein Kristall aus Scherben, Dreiecke über einer Scheibe, eine Scherbe in Blau" },
  "phorma-ii": { zeichne: phormaII, alt: "PHORMA II, gezeichnet: eine einzige Linie, die aus einem Keim gewachsen ist und eine Scheibe füllt" },
  "phorma-iii": { zeichne: phormaIII, alt: "PHORMA III, gezeichnet: drei Bänder aus feinen Linien wie zerknitterte Seide, eines in Blau" },
  "the-fictory": { zeichne: fictory, alt: "The Fictory, gezeichnet: ein Raster von Kacheln, jede aus ihrer Herkunft gewandert und gedreht, mit Spuren und Fäden" },
};

export function svg(slug, dunkel) {
  const c = farben(dunkel);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}"><rect width="${W}" height="${W}" fill="${c.papier}"/>${TAFELN[slug].zeichne(c)}</svg>`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const slugs = Object.keys(TAFELN).filter((s) => s.startsWith(filter));
  for (const slug of slugs) for (const dunkel of [false, true]) {
    const datei = new URL(`${slug}${dunkel ? "-dunkel" : ""}.svg`, AUS);
    writeFileSync(datei, svg(slug, dunkel));
    console.log(`${slug}${dunkel ? " dunkel" : ""}: ${Math.round(statSync(datei).size / 1024)} KB`);
  }
  if (png) {
    let playwright;
    try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage({ viewport: { width: W, height: W }, deviceScaleFactor: 1 });
    const vorschau = new URL("vorschau/", AUS); mkdirSync(vorschau, { recursive: true });
    for (const slug of slugs) for (const dunkel of [false, true]) {
      await page.setContent(`<!doctype html><html><body style="margin:0">${svg(slug, dunkel)}</body></html>`);
      await page.screenshot({ path: fileURLToPath(new URL(`${slug}${dunkel ? "-dunkel" : ""}.png`, vorschau)), clip: { x: 0, y: 0, width: W, height: W } });
    }
    await browser.close();
    console.log("PNG-Abzüge in b/bilder/apps/vorschau/ (nicht einchecken)");
  }
}
