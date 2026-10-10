// «The Fictory» – EIN zusammenhängender Prozess in festen Schritten (30 je Sekunde, 30 Sekunden).
// Das ganze Eingangsbild wird zu Material: jede Fläche wird ein Teil, grosse Flächen werden in Kacheln zerschnitten. Nach dem
// Eingangsbild gibt es das Bild nur noch als seine Teile auf dunklem Grund. Sechs Operationen folgen aufeinander; jede plant ihren
// Verlauf aus dem Zustand, den die vorige hinterlassen hat:
//   1 Neue Nachbarschaften   → Fugen öffnen sich, alle Teile gehen in ein Archiv-Raster nach einer Regel; die Ankunftsreihenfolge bleibt im Zustand
//   2 Abfolge als Bild       → die Ankunftsreihenfolge wird zur Spirale (früh innen, spät aussen); Zwischenstände bleiben als Spur
//   3 Wirksame Spuren        → jeder Schritt meidet das Spurenfeld, das alle früheren Schritte hinterlassen haben
//   4 Gekoppelte Beziehungen → Kopplungen aus den Nachbarschaften im Bild versuchen es wieder zusammenzusetzen; Spuren machen zäh, ein Anstoss verdreht
//   5 Anders weitergehen     → ein einziger Schnitt durch das Gefüge (gelegt, wo die meiste Spur liegt) trennt alle Kopplungen über ihn; eine Seite bricht weg
// (Die frühere Station «Figur und Grund» ist seit dem 10. Oktober 2026 auf Wunsch von Christian entfernt.)
// Schlüsselzustände (Standbilder) sind die Zustände an den Stationsenden. Reine Rechnung ohne DOM.
import { zufall } from "./analyse.js?v=4";
import { REGELN } from "./regeln.js?v=4";

export const TAKT = 30;
export const STATIONEN = Object.freeze([
  { nr: 0, titel: "Eingangsbild", ende: 2 },
  { nr: 1, titel: "Neue Nachbarschaften", ende: 7.5 },
  { nr: 2, titel: "Abfolge als Bild", ende: 13 },
  { nr: 3, titel: "Wirksame Spuren", ende: 19 },
  { nr: 4, titel: "Gekoppelte Beziehungen", ende: 24.5 },
  { nr: 5, titel: "Anders weitergehen", ende: 30 },
]);
export const SCHLUESSEL = Object.freeze(STATIONEN.map((s) => Math.round(s.ende * TAKT)));   // [60, 225, 390, 570, 735, 900]
export const GESAMT = SCHLUESSEL[SCHLUESSEL.length - 1];
const RASTER = 48;                      // Zellen je Bildhöhe im Spurenfeld
const FELD = 80;                        // Zellen je Bildhöhe im wuchernden Feld (Reaktions-Diffusion)
// Gray-Scott nach Karl Sims (A, B, Diffusion 1 und 0.5, Zufuhr f, Abbau k): «Koralle», ein Muster, das von Keimen aus wuchert
const RD = Object.freeze({ dA: 1, dB: 0.5, f: 0.0545, k: 0.062, runden: 1 });
const HOECHSTENS = 72;                  // so viele Teile höchstens

const glatt = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const klemme = (v, a, b) => Math.max(a, Math.min(b, v));
const matrix = (rot, s) => [s * Math.cos(rot), s * Math.sin(rot), -s * Math.sin(rot), s * Math.cos(rot)];
export const teilName = (e) => (e.kachel >= 0 ? `F${e.region + 1}.${e.kachel + 1}` : `F${e.region + 1}`);
const name = teilName;
const grad = (w) => `${Math.round(((w * 180) / Math.PI + 360) % 180)}°`;

/** Spiegelung an einer Geraden durch die Bildmitte mit Winkel w (als 2 × 2-Matrix in Canvas-Reihenfolge a, b, c, d) */
const spiegel = (w) => [Math.cos(2 * w), Math.sin(2 * w), Math.sin(2 * w), -Math.cos(2 * w)];
const mal = (p, q) => [p[0] * q[0] + p[2] * q[1], p[1] * q[0] + p[3] * q[1], p[0] * q[2] + p[2] * q[3], p[1] * q[2] + p[3] * q[3]];

/**
 * Zerlegung: jede Fläche ein Teil, grosse Flächen in Kacheln eines Rasters. Ergebnis: Teilkarte (Teilnummer je Analysepixel) und Teile.
 * Figuren aus der Analyse (A.teile) sind als solche markiert; sie liegen obenauf und tragen den Anstoss.
 */
export function zerlege(A) {
  const { breite: aw, hoehe: ah, region } = A, n = aw * ah;
  const figuren = new Set(A.teile);
  const mindest = Math.max(6, Math.round((A.einstellungen?.mindestanteil ?? 0.004) * n));
  for (let kachel = Math.round(ah * 0.2); ; kachel = Math.round(kachel * 1.2)) {
    const grenze = kachel * kachel * 2.2;
    const schluessel = new Int32Array(n);
    const zaehl = new Map();
    const kx = Math.ceil(aw / kachel);
    for (let i = 0; i < n; i++) {
      const r = region[i], F = A.flaechen[r];
      const k = F.px > grenze ? Math.floor((i / aw) / kachel) * kx + Math.floor((i % aw) / kachel) : -1;
      const s = r * 100000 + (k + 1);
      schluessel[i] = s;
      zaehl.set(s, (zaehl.get(s) ?? 0) + 1);
    }
    // zu kleine Kachelreste gehen in die grösste Kachel derselben Fläche
    const groesste = new Map();
    for (const [s, c] of zaehl) { const r = Math.floor(s / 100000); if (!groesste.has(r) || c > zaehl.get(groesste.get(r))) groesste.set(r, s); }
    const ziel = new Map();
    for (const [s, c] of zaehl) ziel.set(s, c >= mindest ? s : groesste.get(Math.floor(s / 100000)));
    const arten = [...new Set(ziel.values())].sort((a, b) => a - b);
    if (arten.length > HOECHSTENS && kachel < ah) continue;
    const nummer = new Map(arten.map((s, i) => [s, i]));
    const karte = new Int32Array(n);
    for (let i = 0; i < n; i++) karte[i] = nummer.get(ziel.get(schluessel[i]));
    // Masse je Teil
    const T = arten.map((s, i) => ({ i, region: Math.floor(s / 100000), kachelRoh: (s % 100000) - 1, px: 0, sx: 0, sy: 0, x0: aw, y0: ah, x1: 0, y1: 0 }));
    for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) {
      const t = T[karte[y * aw + x]];
      t.px++; t.sx += x; t.sy += y;
      if (x < t.x0) t.x0 = x; if (x > t.x1) t.x1 = x; if (y < t.y0) t.y0 = y; if (y > t.y1) t.y1 = y;
    }
    // Nachbarschaften der Teile (gemeinsame Grenze in der Teilkarte)
    const nb = new Map();
    const kante = (a, b) => { if (a === b) return; const k = a < b ? `${a}-${b}` : `${b}-${a}`; nb.set(k, (nb.get(k) ?? 0) + 1); };
    for (let y = 0; y < ah; y++) for (let x = 0; x < aw; x++) {
      const i = y * aw + x;
      if (x < aw - 1) kante(karte[i], karte[i + 1]);
      if (y < ah - 1) kante(karte[i], karte[i + aw]);
    }
    const proFlaeche = new Map();
    const teile = T.map((t) => {
      const F = A.flaechen[t.region];
      const hx = (t.sx / t.px + 0.5) / ah, hy = (t.sy / t.px + 0.5) / ah;
      const ecken = [[t.x0, t.y0], [t.x1 + 1, t.y0], [t.x0, t.y1 + 1], [t.x1 + 1, t.y1 + 1]].map(([x, y]) => Math.hypot(x / ah - hx, y / ah - hy));
      const nr = proFlaeche.get(t.region) ?? 0;
      proFlaeche.set(t.region, nr + 1);
      return { i: t.i, region: t.region, kachel: t.kachelRoh >= 0 ? nr : -1, cluster: F.cluster, rgb: F.rgb, hx, hy, w: (t.x1 - t.x0 + 1) / ah, h: (t.y1 - t.y0 + 1) / ah,
        radius: Math.max(...ecken), bbox: { x0: t.x0, y0: t.y0, x1: t.x1, y1: t.y1 }, px: t.px, anteil: t.px / n, kontrast: F.kontrast,
        helligkeit: 0.2126 * F.rgb[0] + 0.7152 * F.rgb[1] + 0.0722 * F.rgb[2], eingeschlossen: F.eingeschlossenIn !== null, figur: figuren.has(t.region), rolle: F.rolle };
    });
    // Kachelnummern nur dort, wo eine Fläche wirklich geteilt ist
    for (const e of teile) if (proFlaeche.get(e.region) === 1) e.kachel = -1;
    const nachbarn = [...nb.entries()].map(([k, l]) => { const [a, b] = k.split("-").map(Number); return { a, b, l }; });
    return { karte, teile, nachbarn, kachel };
  }
}

/**
 * Baut das feste Modell eines Laufs aus der Analyse. lauf: { seed, regel (R1–R7 oder null), neutralisiere (Stationsnummer, vor der das Spurenfeld gelöscht wird; nur für die Gegenprobe) }
 */
export function erzeugeLauf(analyse, lauf = {}) {
  const seed = (lauf.seed ?? 1) >>> 0;
  const regel = lauf.regel && REGELN[lauf.regel] ? lauf.regel : null;
  const A = analyse, ah = A.hoehe, aw = A.breite, seite = A.seite;
  const gh = RASTER, gw = Math.ceil(seite * RASTER);
  const verworfen = new Set(A.einstellungen?.verworfen ?? []);
  const { karte, teile, nachbarn, kachel } = zerlege(A);
  // R4: nur Teile mit deutlichem Kontrast bewegen sich
  const kontraste = teile.map((e) => e.kontrast).sort((a, b) => a - b);
  const median = kontraste.length ? kontraste[Math.floor(kontraste.length / 2)] : 0;
  for (const e of teile) e.beweglich = regel === "R4" ? e.kontrast > median || e.figur : true;
  const groesster = Math.max(...teile.map((e) => e.anteil));
  for (const e of teile) e.last = regel === "R5" ? 1 + 3 * Math.sqrt(e.anteil / groesster) : 1;
  const fh = FELD, fw = Math.ceil(seite * FELD);
  // R6: die Herkunftsstellen der Figuren bleiben im wuchernden Feld offen (dort wächst nichts)
  let leer = null;
  if (regel === "R6") {
    leer = new Uint8Array(fw * fh);
    for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      const ax = Math.min(aw - 1, Math.floor(((x + 0.5) / fh) * ah)), ay = Math.min(ah - 1, Math.floor(((y + 0.5) / fh) * ah));
      const e = teile[karte[ay * aw + ax]];
      if (e.figur && e.beweglich) leer[y * fw + x] = 1;
    }
  }
  return { leer, analyse: A, seed, regel, neutralisiere: lauf.neutralisiere ?? null, seite, ah, aw, gw, gh, fw, fh, teile, karte, nachbarn, kachelGroesse: kachel, verworfen };
}

/** Liegt der normierte Punkt (px, py) im Teil e, wenn es in der Lage (x, y, m) steht? */
function belegt(M, e, x, y, m, px, py) {
  const dx = px - x, dy = py - y, det = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(det) < 1e-9) return false;
  const lx = (m[3] * dx - m[2] * dy) / det, ly = (-m[1] * dx + m[0] * dy) / det;
  const ax = Math.floor((e.hx + lx) * M.ah), ay = Math.floor((e.hy + ly) * M.ah);
  if (ax < e.bbox.x0 || ay < e.bbox.y0 || ax > e.bbox.x1 || ay > e.bbox.y1) return false;
  return M.karte[ay * M.aw + ax] === e.i;
}

/** alle Zellen des Spurenfelds, die das Teil in dieser Lage bedeckt */
function zellen(M, e, x, y, m, fn) {
  const s = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
  const r = e.radius * s + 1 / M.gh;
  const x0 = Math.max(0, Math.floor((x - r) * M.gh)), x1 = Math.min(M.gw - 1, Math.ceil((x + r) * M.gh));
  const y0 = Math.max(0, Math.floor((y - r) * M.gh)), y1 = Math.min(M.gh - 1, Math.ceil((y + r) * M.gh));
  let treffer = 0;
  for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++)
    if (belegt(M, e, x, y, m, (gx + 0.5) / M.gh, (gy + 0.5) / M.gh)) { fn(gy * M.gw + gx); treffer++; }
  // kleine Teile, die zwischen die Zellmitten fallen, belegen ihre Mittelzelle
  if (!treffer && x >= 0 && y >= 0 && x < M.seite && y < 1) fn(klemme(Math.floor(y * M.gh), 0, M.gh - 1) * M.gw + klemme(Math.floor(x * M.gh), 0, M.gw - 1));
}

/** Anfangszustand: alle Teile an ihrer Stelle im Bild, keine Spuren */
export function anfang(M) {
  return {
    schritt: 0,
    teile: M.teile.map((e, z) => ({ x: e.hx, y: e.hy, rot: 0, s: 1, a: 1, kontur: 0, z: (e.figur ? 1000 : 0) + z, loch: 0, fest: !e.beweglich, erschoepft: false })),
    grundAlpha: 1, spurAlpha: 1, gliederung: 0, stempel: [], spuren: new Float32Array(M.gw * M.gh),
    feldA: new Float32Array(M.fw * M.fh).fill(1), feldB: new Float32Array(M.fw * M.fh), feldAlpha: 0,
    ankunft: [], federn: [], kopplungAlpha: 0, anstoss: null, schnitt: null,
    plan: null, ereignisse: [],
  };
}

/** tiefe Kopie (für Momentaufnahmen und Zeitleiste); die Stempel wachsen nur an und werden flach kopiert */
export function kopie(z) {
  return { ...z, teile: z.teile.map((t) => ({ ...t })), stempel: z.stempel.slice(), spuren: z.spuren.slice(), feldA: z.feldA.slice(), feldB: z.feldB.slice(), ankunft: z.ankunft.slice(),
    federn: z.federn.map((f) => ({ ...f })), plan: z.plan ? JSON.parse(JSON.stringify(z.plan)) : null, ereignisse: z.ereignisse.slice() };
}

const station = (schritt) => { let i = 1; while (i < SCHLUESSEL.length - 1 && schritt >= SCHLUESSEL[i]) i++; return i; };   // laufende Station (1–5) für schritt ≥ 60

/** Ein Schritt des Prozesses (verändert z). */
export function schritt(M, z) {
  const n = z.schritt;
  if (n >= GESAMT) return z;
  if (n < SCHLUESSEL[0]) {
    // Station 0: das Eingangsbild, in der zweiten Sekunde zeigt sich die Zerlegung
    z.gliederung = glatt((n - TAKT) / (TAKT * 0.8));
  } else {
    const st = station(n), von = SCHLUESSEL[st - 1], bis = SCHLUESSEL[st];
    if (n === von) planen(M, z, st);
    OPS[st].lauf(M, z, (n - von) / (bis - von), n - von);
    wuchern(M, z);
    z.feldAlpha = Math.min(1, z.feldAlpha + 1 / 60);
  }
  z.schritt = n + 1;
  if (z.schritt === GESAMT) z.ereignisse.push({ schritt: GESAMT, text: "Ende des Laufs: Der Zustand bleibt stehen; es gibt keinen erzwungenen Rücksprung zum Anfang." });
  return z;
}

/** zu Beginn jeder Station: Verlauf aus dem erreichten Zustand planen */
function planen(M, z, st) {
  const r = zufall((M.seed ^ Math.imul(st + 1, 0x9e3779b1)) >>> 0);
  if (M.neutralisiere === st) {
    z.spuren.fill(0); z.feldA.fill(1); z.feldB.fill(0);
    z.ereignisse.push({ schritt: z.schritt, text: `Gegenprobe: Spurenfeld und wucherndes Feld vor Schritt ${st} gelöscht (gestempelte Spuren bleiben sichtbar, wirken aber nicht mehr).` });
  }
  z.plan = OPS[st].plan(M, z, r);
}

// ---------- Hilfen ----------
function stempeln(M, z, i, alpha, m = null, x = null, y = null) {
  const t = z.teile[i], e = M.teile[i];
  const mm = m ?? matrix(t.rot, t.s), xx = x ?? t.x, yy = y ?? t.y;
  z.stempel.push({ i, x: xx, y: yy, m: mm, a: alpha });
  zellen(M, e, xx, yy, mm, (k) => { z.spuren[k] += 1; });
  // jeder Stempel ist ein Keim des wuchernden Felds (3 × 3 Zellen um seine Mitte)
  const fx = Math.floor(xx * M.fh), fy = Math.floor(yy * M.fh);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const x = fx + dx, y = fy + dy;
    if (x >= 0 && y >= 0 && x < M.fw && y < M.fh) { z.feldB[y * M.fw + x] = 1; z.feldA[y * M.fw + x] = 0; }
  }
}
/** Reaktions-Diffusion (Gray-Scott, 9-Punkte-Laplace): das Feld wuchert von den Keimen aus weiter, auch wo nicht mehr gestempelt wird */
function wuchern(M, z) {
  const { fw: w, fh: h } = M, { dA, dB, f, k } = RD;
  let A = z.feldA, B = z.feldB;
  const A2 = new Float32Array(A.length), B2 = new Float32Array(B.length);
  for (let r = 0; r < RD.runden; r++) {
    for (let y = 0; y < h; y++) {
      const o = y > 0 ? -w : 0, u = y < h - 1 ? w : 0;
      for (let x = 0; x < w; x++) {
        const i = y * w + x, l = x > 0 ? -1 : 0, rr = x < w - 1 ? 1 : 0;
        const la = 0.2 * (A[i + l] + A[i + rr] + A[i + o] + A[i + u]) + 0.05 * (A[i + o + l] + A[i + o + rr] + A[i + u + l] + A[i + u + rr]) - A[i];
        const lb = 0.2 * (B[i + l] + B[i + rr] + B[i + o] + B[i + u]) + 0.05 * (B[i + o + l] + B[i + o + rr] + B[i + u + l] + B[i + u + rr]) - B[i];
        const abb = A[i] * B[i] * B[i];
        A2[i] = Math.min(1, Math.max(0, A[i] + dA * la - abb + f * (1 - A[i])));
        B2[i] = Math.min(1, Math.max(0, B[i] + dB * lb + abb - (k + f) * B[i]));
      }
    }
    A.set(A2); B.set(B2);
    if (M.leer && z.schritt >= SCHLUESSEL[0]) for (let i = 0; i < M.leer.length; i++) if (M.leer[i]) { A[i] = 1; B[i] = 0; }
  }
}
const feldAn = (M, z, x, y) => z.feldB[klemme(Math.floor(y * M.fh), 0, M.fh - 1) * M.fw + klemme(Math.floor(x * M.fh), 0, M.fw - 1)];
function spurUnter(M, z, i, x, y, m) {
  let s = 0, c = 0;
  zellen(M, M.teile[i], x, y, m, (k) => { s += z.spuren[k]; c++; });
  return c ? s / c : 0;
}
const spurAn = (M, z, x, y) => z.spuren[klemme(Math.floor(y * M.gh), 0, M.gh - 1) * M.gw + klemme(Math.floor(x * M.gh), 0, M.gw - 1)];
/** R2: die Anordnung eines früheren Zustands kehrt gespiegelt an der Hauptachse als Spur zurück */
function spiegelSpur(M, z, lagen, welcher) {
  const w = M.analyse.hauptachse.verwendet, S = spiegel(w), cx = M.seite / 2, cy = 0.5;
  for (const [i, l] of lagen.entries()) {
    const dx = l.x - cx, dy = l.y - cy;
    stempeln(M, z, i, 0.22, mal(S, matrix(l.rot, l.s)), cx + S[0] * dx + S[2] * dy, cy + S[1] * dx + S[3] * dy);
  }
  z.ereignisse.push({ schritt: z.schritt, text: `Regel R2: Die Anordnung von ${welcher} kehrt gespiegelt (Achse ${grad(w)}) als ${lagen.length} Spuren zurück.` });
}
function imBild(M, t, e) {
  const rand = Math.min(0.4, e.radius * t.s * 0.4 + 0.01);
  t.x = klemme(t.x, Math.min(rand, M.seite / 2), Math.max(M.seite - rand, M.seite / 2));
  t.y = klemme(t.y, Math.min(rand, 0.5), Math.max(1 - rand, 0.5));
}
function rasten(M, punkte, g) {
  return punkte.map((p) => ({ x: M.seite / 2 + Math.round((p.x - M.seite / 2) / g) * g, y: 0.5 + Math.round((p.y - 0.5) / g) * g }));
}
/** Bewegung von Lage zu Lage mit Verzögerung und Dauer (Anteile der Station) */
function bewege(t, q, p) {
  const u = glatt((p - q.start) / q.dauer);
  t.x = q.x0 + (q.x - q.x0) * u; t.y = q.y0 + (q.y - q.y0) * u; t.s = q.s0 + (q.s - q.s0) * u;
  if (q.rot !== undefined) t.rot = q.rot0 + (q.rot - q.rot0) * u;
  return u;
}

// ---------- die fünf Operationen ----------
const OPS = {
  // 1 · Neue Nachbarschaften: Fugen öffnen sich, dann gehen alle Teile in ein Archiv-Raster, geordnet nach einer am Bild begründeten Regel
  1: {
    plan(M, z, r) {
      const A = M.analyse, w = A.hauptachse.verwendet;
      const nachRegel = {
        farbe: (a, b) => a.cluster - b.cluster || b.anteil - a.anteil,
        groesse: (a, b) => b.anteil - a.anteil,
        helligkeit: (a, b) => a.helligkeit - b.helligkeit,
      }[A.regel] ?? ((a, b) => b.anteil - a.anteil);
      const beweglich = M.teile.filter((e) => e.beweglich).sort((a, b) => nachRegel(a, b) || a.i - b.i);
      const N = beweglich.length;
      // Raster: Zeilen entlang der Hauptachse (waagrecht, wenn sie eher waagrecht liegt, sonst spaltenweise)
      const quer = Math.abs(Math.cos(w)) >= Math.abs(Math.sin(w));
      const spalten = Math.max(1, Math.round(Math.sqrt(N * (quer ? M.seite : 1 / M.seite) * 1.0)));
      const zeilen = Math.ceil(N / spalten);
      const [nx, ny] = quer ? [spalten, zeilen] : [zeilen, spalten];
      const rand = 0.06, zw = (M.seite - 2 * rand) / nx, zh = (1 - 2 * rand) / ny, zelle = Math.min(zw, zh);
      const ziel = {};
      beweglich.forEach((e, k) => {
        const t = z.teile[e.i];
        const a = k % spalten, b = Math.floor(k / spalten);
        const [cx, cy] = quer ? [a, b] : [b, a];
        let x = rand + (cx + 0.5) * zw, y = rand + (cy + 0.5) * zh;
        if (M.regel === "R3") ({ x, y } = rasten(M, [{ x, y }], zelle)[0]);
        if (M.regel === "R5") y = Math.min(0.94, y + 0.05 * (e.last - 1));
        const s = Math.min(2.2, (zelle * 0.86) / Math.max(e.w, e.h));       // jedes Teil auf die Zelle gebracht: kleine wachsen, grosse schrumpfen
        const weg = Math.hypot(x - t.x, y - t.y);
        ziel[e.i] = { x0: t.x, y0: t.y, s0: 0.88, x, y, s, rot0: 0, rot: 0, start: 0.2 + k * (0.25 / Math.max(1, N)), dauer: (0.15 + weg * 0.6) * e.last };
      });
      const ende = Math.max(...Object.values(ziel).map((q) => q.start + q.dauer), 1e-6);
      for (const q of Object.values(ziel)) { q.start = 0.2 + (q.start - 0.2) * 0.65 / (ende - 0.2); q.dauer *= 0.65 / (ende - 0.2); }
      const ankunft = Object.entries(ziel).sort((a, b) => a[1].start + a[1].dauer - (b[1].start + b[1].dauer) || a[0] - b[0]).map(([i]) => Number(i));
      z.ankunft = ankunft;
      const regeltext = { farbe: "nach Farbgruppe", groesse: "nach Fläche", helligkeit: "nach Helligkeit" }[A.regel];
      z.ereignisse.push({ schritt: z.schritt, text: `Schritt 1: Das Bild wird in ${M.teile.length} Teile zerlegt (Flächen, grosse Flächen in Kacheln); ${N} Teile gehen ${regeltext} in ein Archiv-Raster von ${nx} × ${ny} Feldern, jedes auf seine Feldgrösse gebracht${M.regel === "R3" ? ", eingerastet" : ""}. Zuerst angekommen: ${ankunft.slice(0, 4).map((i) => name(M.teile[i])).join(", ")} …` });
      return { ziel, nx, ny };
    },
    lauf(M, z, p) {
      z.gliederung = 1 - glatt(p / 0.15);
      z.grundAlpha = 1 - glatt(p / 0.18);                                   // das Original verschwindet; es bleiben die Teile
      const fuge = 1 - 0.12 * glatt(p / 0.15);                              // Fugen öffnen sich: jedes Teil schrumpft um seinen Schwerpunkt
      for (const [i, t] of z.teile.entries()) {
        const q = z.plan.ziel[i];
        if (!q || p < q.start) { t.s = fuge; continue; }
        bewege(t, q, p);
        if (M.regel === "R6" && M.teile[i].figur) t.loch = 1;              // R6: die verlassene Stelle einer Figur bleibt offen (Umriss; im Feld wächst dort nichts)
      }
    },
  },

  // 2 · Abfolge als Bild: die Ankunftsreihenfolge wird zur Spirale; früh Angekommenes innen und klein, spät Angekommenes aussen, gross und obenauf
  2: {
    plan(M, z, r) {
      if (M.regel === "R2") spiegelSpur(M, z, M.teile.map((e) => ({ x: e.hx, y: e.hy, rot: 0, s: 1 })), "Schlüsselzustand 0 (Eingangsbild)");
      const folge = z.ankunft.length ? z.ankunft : M.teile.map((e) => e.i);
      const N = folge.length, cx = M.seite / 2, cy = 0.5, gold = Math.PI * (3 - Math.sqrt(5));
      const dreh = M.analyse.hauptachse.verwendet;
      const ziel = {};
      folge.forEach((i, k) => {
        const t = z.teile[i], e = M.teile[i];
        const f = N > 1 ? k / (N - 1) : 1;
        const winkel = dreh + k * gold, radius = 0.46 * Math.sqrt((k + 0.5) / N);
        let x = cx + Math.cos(winkel) * radius * Math.max(1, M.seite) * 0.95, y = cy + Math.sin(winkel) * radius;
        if (M.regel === "R3") ({ x, y } = rasten(M, [{ x, y }], 0.06)[0]);
        const s = Math.min(1.6, (0.05 + 0.14 * f) / Math.max(0.02, Math.max(e.w, e.h)));
        ziel[i] = { x0: t.x, y0: t.y, s0: t.s, rot0: t.rot, x, y, s, rot: winkel + Math.PI / 2, start: f * 0.5, dauer: 0.3 * e.last, z: (e.figur ? 1000 : 0) + (e.eingeschlossen && !M.verworfen.has("ueberlagerung") ? 500 : 0) + k, stempel: [0, 0.5] };
        if (!e.beweglich) Object.assign(ziel[i], { x: t.x, y: t.y, s: t.s, rot: t.rot });
      });
      z.ereignisse.push({ schritt: z.schritt, text: `Schritt 2: Die Ankunftsreihenfolge aus Schritt 1 wird zur Spirale (Goldener Winkel ab ${grad(dreh)}): früh Angekommenes innen und klein, spät Angekommenes aussen, gross und obenauf; jeder Zwischenstand bleibt als Spur.` });
      return { ziel };
    },
    lauf(M, z, p) {
      for (const [i, q] of Object.entries(z.plan.ziel)) {
        const t = z.teile[i];
        const u = glatt((p - q.start) / q.dauer);
        for (let k = 0; k < q.stempel.length; k++) if (q.stempel[k] >= 0 && u > q.stempel[k]) { stempeln(M, z, Number(i), k === 0 ? 0.22 : 0.12); q.stempel[k] = -1; }
        bewege(t, q, p);
        if (u > 0) t.z = q.z;
      }
    },
  },

  // 3 · Wirksame Spuren: dieselbe Operation zehnmal; jedes Teil stempelt und rückt dorthin, wo am wenigsten Spur liegt, und dreht sich dabei in seine Richtung
  3: {
    plan(M, z, r) {
      z.ereignisse.push({ schritt: z.schritt, text: `Schritt 3: Zehnmal stempeln und weiterrücken; jedes Teil wählt die Nachbarstelle mit der geringsten Spur und dreht sich in seine Richtung (Spuren bisher: ${z.stempel.length}).` });
      return { runde: -1, runden: 10, ziel: {}, r: Math.floor(r() * 2 ** 31) };
    },
    lauf(M, z, p) {
      const P = z.plan, runde = Math.min(P.runden - 1, Math.floor((p / 0.9) * P.runden));
      if (runde > P.runde && p < 0.9) {
        P.runde = runde;
        const r = zufall((P.r + runde * 7919) >>> 0);
        const reihe = z.teile.map((t, i) => i).sort((a, b) => z.teile[a].z - z.teile[b].z);
        for (const i of reihe) {
          const t = z.teile[i], e = M.teile[i];
          if (!e.beweglich || t.erschoepft) continue;
          stempeln(M, z, i, 0.11);
          const weite = 0.6 * Math.max(e.w, e.h) * t.s + 0.035;
          let best = null;
          for (let k = 0; k < 12; k++) {
            const w = (k / 12) * 2 * Math.PI + r() * 0.4;
            const x = t.x + Math.cos(w) * weite, y = t.y + Math.sin(w) * weite;
            if (x < 0.02 || y < 0.02 || x > M.seite - 0.02 || y > 0.98) continue;
            if (M.regel === "R1" && spurAn(M, z, x, y) > 0.5) continue;           // keine Rückkehr auf eine Stelle mit Spur
            const wert = spurUnter(M, z, i, x, y, matrix(t.rot, t.s)) + 0.15 * r();
            if (!best || wert < best.wert) best = { x, y, w, wert };
          }
          if (!best) { t.erschoepft = true; z.ereignisse.push({ schritt: z.schritt, text: `Regel R1: ${name(e)} findet keine Stelle ohne Spur und bleibt stehen.` }); continue; }
          let dw = best.w - t.rot; dw = Math.atan2(Math.sin(dw), Math.cos(dw));
          P.ziel[i] = { x0: t.x, y0: t.y, x: best.x, y: best.y, rot0: t.rot, rot: t.rot + dw * 0.35, von: runde };
        }
      }
      const lokal = (p / 0.9) * P.runden - P.runde;
      for (const [i, q] of Object.entries(P.ziel)) {
        if (q.von !== P.runde) continue;
        const t = z.teile[i], u = glatt(p >= 0.9 ? 1 : lokal / 0.7);
        t.x = q.x0 + (q.x - q.x0) * u; t.y = q.y0 + (q.y - q.y0) * u; t.rot = q.rot0 + (q.rot - q.rot0) * u;
      }
    },
  },

  // 4 · Gekoppelte Beziehungen: Kopplungen zwischen Teilen, die im Bild aneinandergrenzten, mit der Distanz von damals; sie ziehen das Bild
  //     wieder zusammen, aber Spuren machen zäh und ein Anstoss am gewichtigsten Teil verdreht alles, was an ihm hängt
  4: {
    plan(M, z, r) {
      const T = M.teile, N = T.length;
      const d = (a, b) => Math.hypot(T[a].hx - T[b].hx, T[a].hy - T[b].hy);
      // Gerüst: minimaler Spannbaum über die Lagen im Eingangsbild (jedes Teil hängt am Netz)
      const imBaum = new Set([0]), kanten = [];
      const naechste = new Float64Array(N).fill(Infinity), von = new Int32Array(N).fill(0);
      for (let b = 1; b < N; b++) naechste[b] = d(0, b);
      while (imBaum.size < N) {
        let best = -1;
        for (let b = 0; b < N; b++) if (!imBaum.has(b) && (best < 0 || naechste[b] < naechste[best])) best = b;
        imBaum.add(best); kanten.push({ i: von[best], j: best, art: "baum" });
        for (let b = 0; b < N; b++) if (!imBaum.has(b)) { const l = d(best, b); if (l < naechste[b]) { naechste[b] = l; von[b] = best; } }
      }
      const schon = new Set(kanten.map((k) => `${Math.min(k.i, k.j)}-${Math.max(k.i, k.j)}`));
      const dazu = (i, j, art) => { const k = `${Math.min(i, j)}-${Math.max(i, j)}`; if (i !== j && !schon.has(k)) { schon.add(k); kanten.push({ i, j, art }); } };
      if (!M.verworfen.has("verbindung")) for (const { a, b, l } of M.nachbarn) if (l >= 3) dazu(a, b, "grenze");
      if (M.regel === "R7") for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (T[i].cluster === T[j].cluster && d(i, j) < 0.35) dazu(i, j, "farbe");
      z.federn = kanten.map((k) => ({ ...k, L: d(k.i, k.j), k: k.art === "baum" ? 0.6 : 0.4, aktiv: true }));
      const anstoss = [...T].filter((e) => e.figur).sort((a, b) => b.anteil - a.anteil)[0]?.i ?? [...T].sort((a, b) => b.anteil - a.anteil)[0].i;
      z.anstoss = anstoss;
      const t = z.teile[anstoss];
      z.ereignisse.push({ schritt: z.schritt, text: `Schritt 4: ${z.federn.length} Kopplungen mit der Distanz aus dem Eingangsbild (${kanten.filter((k) => k.art === "baum").length} Gerüst, ${kanten.filter((k) => k.art === "grenze").length} gemeinsame Grenzen${M.regel === "R7" ? `, ${kanten.filter((k) => k.art === "farbe").length} gleiche Farbe` : ""}) ziehen das Bild wieder zusammen; alle Teile kehren zur Originalgrösse zurück. Anstoss: ${name(T[anstoss])} dreht um 90°. Stellen mit Spur sind zäh.` });
      return { rot0: t.rot, s0: z.teile.map((x) => x.s) };
    },
    lauf(M, z, p) {
      const P = z.plan, d = z.teile[z.anstoss];
      d.rot = P.rot0 + (Math.PI / 2) * glatt(p / 0.5);
      for (const [i, t] of z.teile.entries()) if (!t.fest) t.s = P.s0[i] + (1 - P.s0[i]) * glatt(p / 0.6);
      z.kopplungAlpha = 0.8 * glatt(p / 0.15) * (1 - 0.6 * glatt((p - 0.6) / 0.4));
      entspannen(M, z, 2, 0.22);
      // das Ganze sammelt sich zur Bildmitte
      const mx = z.teile.reduce((s, t) => s + t.x, 0) / z.teile.length, my = z.teile.reduce((s, t) => s + t.y, 0) / z.teile.length;
      for (const [i, t] of z.teile.entries()) {
        if (t.fest) continue;
        const mu = beweglichkeit(M, z, i);
        t.x += (M.seite / 2 - mx) * 0.04 * mu; t.y += (0.5 - my) * 0.04 * mu;
        if (M.regel === "R5") t.y += 0.0015 * (M.teile[i].last - 1);
        imBild(M, t, M.teile[i]);
      }
    },
  },

  // 5 · Anders weitergehen: ein einziger Schnitt durch das Gefüge, gelegt durch die Stelle mit der meisten Spur; alle Kopplungen über ihn
  //     reissen, die abgetrennte Seite bricht weg und dreht sich
  5: {
    plan(M, z, r) {
      if (M.regel === "R2") spiegelSpur(M, z, z.teile.map((t) => ({ x: t.x, y: t.y, rot: t.rot, s: t.s })), "Schlüsselzustand 4");
      // Ort: das Teil mit der meisten Spur unter sich; Richtung: quer zur Hauptachse
      let ort = 0, meist = -1;
      z.teile.forEach((t, i) => { const s = spurUnter(M, z, i, t.x, t.y, matrix(t.rot, t.s)); if (s > meist) { meist = s; ort = i; } });
      const w = M.analyse.hauptachse.verwendet + Math.PI / 2;
      // die Linie geht durch die Mitte zwischen diesem Teil und dem Schwerpunkt des Gefüges
      const mx = z.teile.reduce((s, t) => s + t.x, 0) / z.teile.length, my = z.teile.reduce((s, t) => s + t.y, 0) / z.teile.length;
      const px = (z.teile[ort].x + mx) / 2, py = (z.teile[ort].y + my) / 2, nx = -Math.sin(w), ny = Math.cos(w);     // Normale der Schnittlinie
      const seite = (t) => (t.x - px) * nx + (t.y - py) * ny > 0;
      let gerissen = 0;
      for (const f of z.federn) if (f.aktiv && seite(z.teile[f.i]) !== seite(z.teile[f.j])) { f.aktiv = false; gerissen++; }
      const B = z.teile.map((t, i) => i).filter((i) => seite(z.teile[i]));
      const kleiner = B.length <= z.teile.length / 2;
      const weg = new Set(kleiner ? B : z.teile.map((t, i) => i).filter((i) => !seite(z.teile[i])));
      const richtung = kleiner ? 1 : -1;
      const drall = z.teile.map(() => (r() - 0.5) * 0.06);
      z.schnitt = { x: px, y: py, w };
      z.ereignisse.push({ schritt: z.schritt, text: `Schritt 5: Eingriff – ein Schnitt quer zur Hauptachse, zwischen ${name(M.teile[ort])} (das Teil mit der meisten Spur, ${meist.toFixed(1)}) und dem Schwerpunkt des Gefüges. ${gerissen} Kopplungen reissen; ${weg.size} Teile brechen weg und drehen sich, ${z.teile.length - weg.size} halten zusammen.` });
      return { weg: [...weg], dx: nx * richtung, dy: ny * richtung, drall, kopplung0: z.kopplungAlpha };
    },
    lauf(M, z, p) {
      const P = z.plan, weg = new Set(P.weg), v = 0.022 * (1 - glatt(p / 0.85));
      for (const [i, t] of z.teile.entries()) {
        if (t.fest) continue;
        const mu = beweglichkeit(M, z, i);
        if (weg.has(i)) {
          const nx = t.x + P.dx * v * (0.6 + 0.4 * mu), ny = t.y + P.dy * v * (0.6 + 0.4 * mu);
          if (!(M.regel === "R1" && spurAn(M, z, nx, ny) > 3 && spurAn(M, z, nx, ny) > spurAn(M, z, t.x, t.y))) { t.x = nx; t.y = ny; }
          t.rot += P.drall[i] * (1 - glatt(p / 0.85));
        }
        if (M.regel === "R5") t.y += 0.0012 * (M.teile[i].last - 1);
      }
      entspannen(M, z, 1, 0.12);
      for (const [i, t] of z.teile.entries()) imBild(M, t, M.teile[i]);
      z.kopplungAlpha = P.kopplung0 * (1 - glatt(p / 0.3));
      z.spurAlpha = 1 - 0.45 * glatt(p / 0.5);                              // die Spuren treten zurück, damit der Bruch lesbar bleibt
    },
  },
};

/** Beweglichkeit eines Teils: Spuren unter ihm und das gewucherte Feld machen es zäh (Folgewirksamkeit), R5 macht grosse Teile schwer */
function beweglichkeit(M, z, i) {
  const t = z.teile[i];
  if (t.fest) return 0;
  return 1 / ((1 + 0.6 * spurUnter(M, z, i, t.x, t.y, matrix(t.rot, t.s)) + 2 * feldAn(M, z, t.x, t.y)) * M.teile[i].last);
}

/** Entspannung der Kopplungen (Lage, Drehung und Grösse übertragen sich) */
function entspannen(M, z, runden, staerke) {
  const mu = z.teile.map((t, i) => (i === z.anstoss ? 0.2 : 1) * beweglichkeit(M, z, i));
  for (let r = 0; r < runden; r++) {
    for (const f of z.federn) {
      if (!f.aktiv) continue;
      const a = z.teile[f.i], b = z.teile[f.j];
      const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1e-6;
      const fehler = ((l - f.L) / l) * f.k * staerke, ma = mu[f.i], mb = mu[f.j], summe = ma + mb;
      if (summe <= 0) continue;
      a.x += dx * fehler * (ma / summe); a.y += dy * fehler * (ma / summe);
      b.x -= dx * fehler * (mb / summe); b.y -= dy * fehler * (mb / summe);
      let dr = b.rot - a.rot; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
      a.rot += dr * 0.03 * ma; b.rot -= dr * 0.03 * mb;
    }
  }
}

/** Lauf bis zu einem Schritt (ab Anfang oder ab einer Momentaufnahme) */
export function bis(M, ziel, start = null) {
  const z = start ? kopie(start) : anfang(M);
  while (z.schritt < ziel) schritt(M, z);
  return z;
}

/** Schlüssel eines Zustands (für Prüfungen: gleiche Zustände, gleicher Schlüssel) */
export function zustandsSchluessel(z) {
  const r = (v) => Math.round(v * 1e5);
  let h = 0x811c9dc5;
  const add = (v) => { h ^= v & 0xffffffff; h = Math.imul(h, 0x01000193) >>> 0; };
  add(z.schritt);
  for (const t of z.teile) [t.x, t.y, t.rot, t.s, t.a, t.kontur, t.loch, t.z].forEach((v) => add(r(v)));
  [z.grundAlpha, z.spurAlpha, z.kopplungAlpha].forEach((v) => add(r(v)));
  add(z.stempel.length);
  for (let k = 0; k < z.spuren.length; k++) if (z.spuren[k]) add(k * 31 + r(z.spuren[k]));
  let feld = 0; for (let k = 0; k < z.feldB.length; k++) feld += z.feldB[k] * ((k % 97) + 1);
  add(r(feld / 1000));
  for (const f of z.federn) add(f.aktiv ? 1 : 0);
  return h.toString(16).padStart(8, "0");
}

/** Beschreibung der fünf Operationen für die Standbilder, aus dem tatsächlichen Lauf */
export function beschreibungen(M, schluesselZustaende) {
  const aus = (st) => (schluesselZustaende[st]?.ereignisse ?? []).filter((e) => e.schritt >= SCHLUESSEL[st - 1] && e.schritt < SCHLUESSEL[st]).map((e) => e.text);
  return STATIONEN.slice(1).map((s) => ({ nr: s.nr, titel: s.titel, text: aus(s.nr).join(" ") }));
}
