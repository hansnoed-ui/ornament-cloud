// «Das Bild geht weiter» – EIN zusammenhängender Prozess in festen Schritten (30 je Sekunde, 30 Sekunden).
// Sechs Operationen folgen aufeinander; jede plant ihren Verlauf aus dem Zustand, den die vorige hinterlassen hat:
//   1 Neue Nachbarschaften   → die Ankunftsreihenfolge wird Teil des Zustands
//   2 Abfolge als Bild       → liest die Ankunftsreihenfolge; Staffelung und Zwischenstände hinterlassen Spuren
//   3 Wirksame Spuren        → jeder Schritt meidet das Spurenfeld, das alle früheren Schritte hinterlassen haben
//   4 Gekoppelte Beziehungen → Kopplungen aus dem Bild; das Spurenfeld macht Stellen zäh und lenkt so die Entspannung
//   5 Figur und Grund        → der Zwischenraum der erreichten Lage wird zur tragenden Form
//   6 Anders weitergehen     → eine Kopplung wird getrennt (gewählt nach den Spuren); die Folgen hängen an Netz und Spuren
// Schlüsselzustände (Standbilder) sind die Zustände an den Stationsenden. Reine Rechnung ohne DOM.
import { zufall, konturen } from "./analyse.js?v=1";
import { REGELN } from "./regeln.js?v=1";

export const TAKT = 30;
export const STATIONEN = Object.freeze([
  { nr: 0, titel: "Eingangsbild", ende: 2 },
  { nr: 1, titel: "Neue Nachbarschaften", ende: 6.5 },
  { nr: 2, titel: "Abfolge als Bild", ende: 11 },
  { nr: 3, titel: "Wirksame Spuren", ende: 16 },
  { nr: 4, titel: "Gekoppelte Beziehungen", ende: 21 },
  { nr: 5, titel: "Figur und Grund", ende: 25.5 },
  { nr: 6, titel: "Anders weitergehen", ende: 30 },
]);
export const SCHLUESSEL = Object.freeze(STATIONEN.map((s) => Math.round(s.ende * TAKT)));   // [60, 195, 330, 480, 630, 765, 900]
export const GESAMT = SCHLUESSEL[SCHLUESSEL.length - 1];
const RASTER = 48;                      // Zellen je Bildhöhe im Spurenfeld

const glatt = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const klemme = (v, a, b) => Math.max(a, Math.min(b, v));
const matrix = (rot, s) => [s * Math.cos(rot), s * Math.sin(rot), -s * Math.sin(rot), s * Math.cos(rot)];
const name = (e) => `F${e.region + 1}`;

/** Spiegelung an einer Geraden durch die Bildmitte mit Winkel w (als 2 × 2-Matrix in Canvas-Reihenfolge a, b, c, d) */
const spiegel = (w) => [Math.cos(2 * w), Math.sin(2 * w), Math.sin(2 * w), -Math.cos(2 * w)];
const mal = (p, q) => [p[0] * q[0] + p[2] * q[1], p[1] * q[0] + p[3] * q[1], p[0] * q[2] + p[2] * q[3], p[1] * q[2] + p[3] * q[3]];

/**
 * Baut das feste Modell eines Laufs aus der Analyse. lauf: { seed, regel (R1–R7 oder null), neutralisiere (Stationsnummer, vor der das Spurenfeld gelöscht wird; nur für die Gegenprobe) }
 */
export function erzeugeLauf(analyse, lauf = {}) {
  const seed = (lauf.seed ?? 1) >>> 0;
  const regel = lauf.regel && REGELN[lauf.regel] ? lauf.regel : null;
  const A = analyse, ah = A.hoehe, aw = A.breite, seite = A.seite;
  const gh = RASTER, gw = Math.ceil(seite * RASTER);
  const verworfen = new Set(A.einstellungen?.verworfen ?? []);
  const teile = A.teile.map((id, i) => {
    const f = A.flaechen[id];
    const b = f.bbox;
    const ecken = [[b.x0, b.y0], [b.x1 + 1, b.y0], [b.x0, b.y1 + 1], [b.x1 + 1, b.y1 + 1]].map(([x, y]) => Math.hypot(x / ah - f.cx, y / ah - f.cy));
    return { i, region: id, cluster: f.cluster, rgb: f.rgb, hx: f.cx, hy: f.cy, w: (b.x1 - b.x0 + 1) / ah, h: (b.y1 - b.y0 + 1) / ah, radius: Math.max(...ecken),
      anteil: f.anteil, kontrast: f.kontrast, helligkeit: 0.2126 * f.rgb[0] + 0.7152 * f.rgb[1] + 0.0722 * f.rgb[2], eingeschlossen: f.eingeschlossenIn !== null };
  });
  // R4: nur Teile mit deutlichem Kontrast bewegen sich
  const kontraste = teile.map((e) => e.kontrast).sort((a, b) => a - b);
  const median = kontraste.length ? kontraste[Math.floor(kontraste.length / 2)] : 0;
  for (const e of teile) e.beweglich = regel === "R4" ? e.kontrast >= median : true;
  if (teile.length && !teile.some((e) => e.beweglich)) teile[0].beweglich = true;
  const gesamt = teile.reduce((s, e) => s + e.anteil, 0) || 1;
  for (const e of teile) e.last = regel === "R5" ? 1 + 6 * e.anteil / gesamt * teile.length / 2 : 1;

  const modell = { analyse: A, seed, regel, neutralisiere: lauf.neutralisiere ?? null, seite, ah, aw, gw, gh, teile, verworfen, region: A.region };
  return modell;
}

/** Liegt der normierte Punkt (px, py) im Teil e, wenn es in der Lage (x, y, m) steht? */
function belegt(M, e, x, y, m, px, py) {
  const dx = px - x, dy = py - y, det = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(det) < 1e-9) return false;
  const lx = (m[3] * dx - m[2] * dy) / det, ly = (-m[1] * dx + m[0] * dy) / det;
  const ax = Math.floor((e.hx + lx) * M.ah), ay = Math.floor((e.hy + ly) * M.ah);
  if (ax < 0 || ay < 0 || ax >= M.aw || ay >= M.ah) return false;
  return M.region[ay * M.aw + ax] === e.region;
}

/** alle Zellen des Spurenfelds, die das Teil in dieser Lage bedeckt */
function zellen(M, e, x, y, m, fn) {
  const s = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
  const r = e.radius * s + 1 / M.gh;
  const x0 = Math.max(0, Math.floor((x - r) * M.gh)), x1 = Math.min(M.gw - 1, Math.ceil((x + r) * M.gh));
  const y0 = Math.max(0, Math.floor((y - r) * M.gh)), y1 = Math.min(M.gh - 1, Math.ceil((y + r) * M.gh));
  for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++)
    if (belegt(M, e, x, y, m, (gx + 0.5) / M.gh, (gy + 0.5) / M.gh)) fn(gy * M.gw + gx);
}

/** Anfangszustand: alle Teile an ihrer Stelle im Bild, keine Spuren */
export function anfang(M) {
  return {
    schritt: 0,
    teile: M.teile.map((e, z) => ({ x: e.hx, y: e.hy, rot: 0, s: 1, a: 1, kontur: 0, z, loch: 0, fest: !e.beweglich, erschoepft: false })),
    grundAlpha: 1, spurAlpha: 1, gliederung: 0, stempel: [], spuren: new Float32Array(M.gw * M.gh),
    ankunft: [], federn: [], kopplungAlpha: 0, anstoss: null, schnitt: null,
    luecke: [], lueckeAlpha: 0, plan: null, ereignisse: [],
  };
}

/** tiefe Kopie (für Momentaufnahmen und Zeitleiste); die Stempel wachsen nur an und werden flach kopiert */
export function kopie(z) {
  return { ...z, teile: z.teile.map((t) => ({ ...t })), stempel: z.stempel.slice(), spuren: z.spuren.slice(), ankunft: z.ankunft.slice(),
    federn: z.federn.map((f) => ({ ...f })), luecke: z.luecke, plan: z.plan ? structuredCloneLite(z.plan) : null, ereignisse: z.ereignisse.slice() };
}
function structuredCloneLite(o) { return JSON.parse(JSON.stringify(o)); }

const station = (schritt) => { let i = 1; while (i < SCHLUESSEL.length - 1 && schritt >= SCHLUESSEL[i]) i++; return i; };   // laufende Station (1–6) für schritt ≥ 60

/** Ein Schritt des Prozesses (verändert z). */
export function schritt(M, z) {
  const n = z.schritt;
  if (n >= GESAMT) return z;
  if (n < SCHLUESSEL[0]) {
    // Station 0: das Eingangsbild, in der zweiten Sekunde zeigt sich die verwendete Gliederung
    z.gliederung = glatt((n - TAKT) / (TAKT * 0.8));
  } else {
    const st = station(n), von = SCHLUESSEL[st - 1], bis = SCHLUESSEL[st];
    if (n === von) planen(M, z, st);
    const p = (n - von) / (bis - von);
    OPS[st].lauf(M, z, p, n - von, bis - von);
  }
  z.schritt = n + 1;
  if (z.schritt === GESAMT) z.ereignisse.push({ schritt: GESAMT, text: "Ende des Laufs: Der Zustand bleibt stehen; es gibt keinen erzwungenen Rücksprung zum Anfang." });
  return z;
}

/** zu Beginn jeder Station: Verlauf aus dem erreichten Zustand planen */
function planen(M, z, st) {
  const r = zufall((M.seed ^ Math.imul(st + 1, 0x9e3779b1)) >>> 0);
  if (M.neutralisiere === st) {
    z.spuren.fill(0);
    z.ereignisse.push({ schritt: z.schritt, text: `Gegenprobe: Spurenfeld vor Schritt ${st} gelöscht (sichtbare Spuren bleiben, wirken aber nicht mehr).` });
  }
  z.plan = OPS[st].plan(M, z, r);
}

// ---------- Hilfen für Spuren ----------
function stempeln(M, z, i, alpha, m = null, x = null, y = null) {
  const t = z.teile[i], e = M.teile[i];
  const mm = m ?? matrix(t.rot, t.s), xx = x ?? t.x, yy = y ?? t.y;
  z.stempel.push({ i, x: xx, y: yy, m: mm, a: alpha });
  zellen(M, e, xx, yy, mm, (k) => { z.spuren[k] += 1; });
}
function spurUnter(M, z, i, x, y, m) {
  let s = 0, c = 0;
  zellen(M, M.teile[i], x, y, m, (k) => { s += z.spuren[k]; c++; });
  return c ? s / c : 0;
}
const spurAn = (M, z, x, y) => {
  const gx = klemme(Math.floor(x * M.gh), 0, M.gw - 1), gy = klemme(Math.floor(y * M.gh), 0, M.gh - 1);
  return z.spuren[gy * M.gw + gx];
};
/** R2: die Anordnung eines früheren Zustands kehrt gespiegelt an der Hauptachse als Spur zurück */
function spiegelSpur(M, z, lagen, welcher) {
  const w = M.analyse.hauptachse.verwendet, S = spiegel(w), cx = M.seite / 2, cy = 0.5;
  for (const [i, l] of lagen.entries()) {
    const dx = l.x - cx, dy = l.y - cy;
    const x = cx + S[0] * dx + S[2] * dy, y = cy + S[1] * dx + S[3] * dy;
    stempeln(M, z, i, 0.2, mal(S, matrix(l.rot, l.s)), x, y);
  }
  z.ereignisse.push({ schritt: z.schritt, text: `Regel R2: Die Anordnung von ${welcher} kehrt gespiegelt (Achse ${Math.round(w * 180 / Math.PI)}°) als ${lagen.length} Spuren zurück.` });
}

/** Rand: Mittelpunkte bleiben im Bild */
function imBild(M, t, e) {
  const rand = Math.min(0.45, e.radius * t.s * 0.6 + 0.02);
  t.x = klemme(t.x, Math.min(rand, M.seite / 2), Math.max(M.seite - rand, M.seite / 2));
  t.y = klemme(t.y, Math.min(rand, 0.5), Math.max(1 - rand, 0.5));
}

/** Zielpunkte entlang einer Geraden durch die Mitte (Richtung w), mit Breiten b, in Reihen */
function reihe(M, breiten, w, abstandFaktor = 1.1) {
  const ux = Math.cos(w), uy = Math.sin(w), nx = -uy, ny = ux, cx = M.seite / 2, cy = 0.5;
  // verfügbare Länge der Geraden im Bild
  const tx = Math.abs(ux) > 1e-6 ? (M.seite / 2) / Math.abs(ux) : Infinity, ty = Math.abs(uy) > 1e-6 ? 0.5 / Math.abs(uy) : Infinity;
  const laenge = 2 * Math.min(tx, ty) * 0.86;
  const summe = breiten.reduce((a, b) => a + b, 0) * abstandFaktor;
  let reihen = 1, s = Math.min(1, laenge / summe);
  if (s < 0.55 && breiten.length >= 4) { reihen = 2; s = Math.min(1, laenge / (summe / 2 + Math.max(...breiten))); }
  const ziele = [];
  const proReihe = Math.ceil(breiten.length / reihen);
  for (let rr = 0; rr < reihen; rr++) {
    const teil = breiten.slice(rr * proReihe, (rr + 1) * proReihe);
    const gesamt = teil.reduce((a, b) => a + b * s * abstandFaktor, 0);
    let pos = -gesamt / 2;
    const versatz = reihen === 1 ? 0 : (rr - 0.5) * Math.max(...breiten) * s * 1.25;
    for (const b of teil) {
      pos += (b * s * abstandFaktor) / 2;
      ziele.push({ x: cx + ux * pos + nx * versatz, y: cy + uy * pos + ny * versatz });
      pos += (b * s * abstandFaktor) / 2;
    }
  }
  return { ziele, s, reihen };
}
function rasten(M, punkte, s) {
  const groessen = M.teile.map((e) => Math.max(e.w, e.h) * s).sort((a, b) => a - b);
  const g = Math.max(0.04, groessen[Math.floor(groessen.length / 2)] * 0.9);
  return { g, punkte: punkte.map((p) => ({ x: M.seite / 2 + Math.round((p.x - M.seite / 2) / g) * g, y: 0.5 + Math.round((p.y - 0.5) / g) * g })) };
}

// ---------- die sechs Operationen ----------
const OPS = {
  // 1 · Neue Nachbarschaften: Teile nach einer am Bild begründeten Regel entlang der Hauptachse reihen
  1: {
    plan(M, z, r) {
      const A = M.analyse, w = A.hauptachse.verwendet;
      const nachRegel = {
        farbe: (a, b) => a.cluster - b.cluster || b.anteil - a.anteil,
        groesse: (a, b) => b.anteil - a.anteil,
        helligkeit: (a, b) => a.helligkeit - b.helligkeit,
      }[A.regel] ?? ((a, b) => b.anteil - a.anteil);
      // Farbgruppen in der Reihenfolge ihres Farbtons, damit «nach Farbe» eine nachvollziehbare Reihe ist
      const beweglich = M.teile.filter((e) => e.beweglich).sort((a, b) => nachRegel(a, b) || a.region - b.region);
      const breiten = beweglich.map((e) => Math.abs(e.w * Math.cos(w)) + Math.abs(e.h * Math.sin(w)));
      let { ziele, s, reihen } = reihe(M, breiten, w);
      let raster = null;
      if (M.regel === "R3") { const rr = rasten(M, ziele, s); ziele = rr.punkte; raster = rr.g; }
      const ziel = {};
      beweglich.forEach((e, k) => {
        const t = z.teile[e.i];
        let { x, y } = ziele[k];
        if (M.regel === "R5") y = Math.min(0.92, y + 0.12 * (e.last - 1) / 3);
        const weg = Math.hypot(x - t.x, y - t.y);
        ziel[e.i] = { x0: t.x, y0: t.y, x, y, s0: t.s, s, start: k * 0.045, dauer: 0.18 + weg * 0.55 * e.last };
      });
      // Ankunft = Start + Weg: eine Folge, die erst aus der Bewegung entsteht; auf 82 % der Station gestreckt
      const ende = Math.max(...Object.values(ziel).map((q) => q.start + q.dauer), 1e-6);
      for (const q of Object.values(ziel)) { q.start *= 0.82 / ende; q.dauer *= 0.82 / ende; }
      const ankunft = Object.entries(ziel).sort((a, b) => a[1].start + a[1].dauer - (b[1].start + b[1].dauer) || a[0] - b[0]).map(([i]) => Number(i));
      z.ankunft = ankunft;
      const regeltext = { farbe: "nach Farbgruppe", groesse: "nach Fläche", helligkeit: "nach Helligkeit" }[A.regel];
      z.ereignisse.push({ schritt: z.schritt, text: `Schritt 1: ${beweglich.length} Teile ${regeltext} entlang ${Math.round(((w * 180 / Math.PI) + 180) % 180)}° gereiht (${reihen} Reihe${reihen > 1 ? "n" : ""}, Massstab ${s.toFixed(2)}${raster ? `, Raster ${raster.toFixed(3)}` : ""}). Ankunftsreihenfolge: ${ankunft.map((i) => name(M.teile[i])).join(" → ")}.` });
      return { ziel, s, reihen, raster, regel: A.regel, winkel: w };
    },
    lauf(M, z, p) {
      z.gliederung = 1 - glatt(p / 0.25);
      z.grundAlpha = 1 - 0.45 * glatt(p / 0.6);
      for (const [i, q] of Object.entries(z.plan.ziel)) {
        const t = z.teile[i], u = glatt((p - q.start) / q.dauer);
        t.x = q.x0 + (q.x - q.x0) * u; t.y = q.y0 + (q.y - q.y0) * u; t.s = q.s0 + (q.s - q.s0) * u;
        t.loch = Math.max(t.loch, glatt((p - q.start) / (q.dauer * 0.3)));
      }
    },
  },

  // 2 · Abfolge als Bild: die Ankunftsreihenfolge wird zur Staffelung; jeder Zwischenstand bleibt als Spur
  2: {
    plan(M, z, r) {
      if (M.regel === "R2") spiegelSpur(M, z, M.teile.map((e) => ({ x: e.hx, y: e.hy, rot: 0, s: 1 })), "Schlüsselzustand 0 (Eingangsbild)");
      const folge = z.ankunft.length ? z.ankunft : M.teile.map((e) => e.i);
      const w = M.analyse.hauptachse.verwendet;
      const nx = -Math.sin(w), ny = Math.cos(w);
      // Richtung der Staffelung: entlang der Achse, um 30° zur Normalen geneigt
      const vx = Math.cos(w) * 0.87 + nx * 0.5, vy = Math.sin(w) * 0.87 + ny * 0.5;
      const N = folge.length, cx = M.seite / 2, cy = 0.5;
      const reichweite = Math.min(Math.abs(vx) > 1e-6 ? M.seite / 2 / Math.abs(vx) : 9, Math.abs(vy) > 1e-6 ? 0.5 / Math.abs(vy) : 9) * 1.3;
      const ziel = {};
      folge.forEach((i, k) => {
        const t = z.teile[i], e = M.teile[i];
        const u = N > 1 ? k / (N - 1) - 0.5 : 0;
        const sZiel = Math.min(t.s * (0.8 + 0.4 * (N > 1 ? k / (N - 1) : 1)), 0.28 / Math.max(0.01, e.radius));   // was später ankam, steht grösser und weiter vorn (nie über gut die halbe Bildhöhe)
        let x = cx + vx * u * reichweite, y = cy + vy * u * reichweite;
        if (M.regel === "R3") ({ x, y } = rasten(M, [{ x, y }], sZiel).punkte[0]);
        ziel[i] = { x0: t.x, y0: t.y, s0: t.s, x, y, s: sZiel, start: (k / Math.max(1, N)) * 0.5, dauer: 0.32 * (e.beweglich ? e.last : 1), z: k + (e.eingeschlossen && !M.verworfen.has("ueberlagerung") ? N : 0), stempel: [0, 0.5] };
        if (!e.beweglich) { ziel[i].x = t.x; ziel[i].y = t.y; ziel[i].s = t.s; }
      });
      z.ereignisse.push({ schritt: z.schritt, text: `Schritt 2: Die Ankunftsreihenfolge aus Schritt 1 wird zur Staffelung (zuerst angekommen hinten und kleiner); jeder Zwischenstand bleibt als Spur.` });
      return { ziel, folge };
    },
    lauf(M, z, p) {
      for (const [i, q] of Object.entries(z.plan.ziel)) {
        const t = z.teile[i], u = glatt((p - q.start) / q.dauer);
        // Zwischenstände beim Losgehen und auf halbem Weg werden gestempelt
        for (let k = 0; k < q.stempel.length; k++) if (u > q.stempel[k] && q.stempel[k] >= 0) { stempeln(M, z, Number(i), k === 0 ? 0.2 : 0.11); q.stempel[k] = -1; }
        t.x = q.x0 + (q.x - q.x0) * u; t.y = q.y0 + (q.y - q.y0) * u; t.s = q.s0 + (q.s - q.s0) * u;
        if (u > 0) t.z = q.z;
      }
    },
  },

  // 3 · Wirksame Spuren: dieselbe Operation achtmal; jeder Schritt meidet das Spurenfeld, das die früheren hinterlassen haben
  3: {
    plan(M, z, r) {
      z.ereignisse.push({ schritt: z.schritt, text: `Schritt 3: Achtmal stempeln und weiterrücken; jedes Teil wählt die Nachbarstelle mit der geringsten Spur (Spuren bisher: ${z.stempel.length}).` });
      return { runde: -1, runden: 8, ziel: {}, r: Math.floor(r() * 2 ** 31), gesperrt: 0 };
    },
    lauf(M, z, p) {
      const P = z.plan, runde = Math.min(P.runden - 1, Math.floor((p / 0.88) * P.runden));
      if (runde > P.runde && p < 0.88) {
        P.runde = runde;
        const r = zufall((P.r + runde * 7919) >>> 0);
        const reihe = z.teile.map((t, i) => i).sort((a, b) => z.teile[a].z - z.teile[b].z);
        for (const i of reihe) {
          const t = z.teile[i], e = M.teile[i];
          if (!e.beweglich || t.erschoepft) continue;
          const m = matrix(t.rot, t.s);
          stempeln(M, z, i, 0.13);
          const schrittweite = 0.55 * Math.max(e.w, e.h) * t.s + 0.025;
          let best = null;
          for (let k = 0; k < 12; k++) {
            const w = (k / 12) * 2 * Math.PI + r() * 0.3;
            const x = t.x + Math.cos(w) * schrittweite, y = t.y + Math.sin(w) * schrittweite;
            const rand = e.radius * t.s * 0.5;
            if (x < rand || y < rand || x > M.seite - rand || y > 1 - rand) continue;
            if (M.regel === "R1" && spurAn(M, z, x, y) > 0.5) continue;           // keine Rückkehr auf eine Stelle mit Spur
            const wert = spurUnter(M, z, i, x, y, m) + 0.12 * r() + 0.35 * Math.hypot(x - M.seite / 2, y - 0.5);
            if (!best || wert < best.wert) best = { x, y, wert };
          }
          if (!best) { t.erschoepft = true; P.gesperrt++; z.ereignisse.push({ schritt: z.schritt, text: `Regel R1: ${name(e)} findet keine Stelle ohne Spur und bleibt stehen.` }); continue; }
          P.ziel[i] = { x0: t.x, y0: t.y, x: best.x, y: best.y, von: runde };
        }
      }
      const lokal = ((p / 0.88) * P.runden) - P.runde;
      for (const [i, q] of Object.entries(P.ziel)) {
        if (q.von !== P.runde) continue;
        const t = z.teile[i], u = glatt(p >= 0.88 ? 1 : lokal / 0.7);
        t.x = q.x0 + (q.x - q.x0) * u; t.y = q.y0 + (q.y - q.y0) * u;
      }
      z.grundAlpha = 0.55 - 0.1 * glatt(p);
      if (M.regel !== "R6") for (const t of z.teile) t.loch = Math.min(t.loch, 1 - 0.35 * glatt(p));
    },
  },

  // 4 · Gekoppelte Beziehungen: Federn aus den Nachbarschaften im Bild; ein Anstoss am gewichtigsten Teil überträgt sich, das Spurenfeld macht zäh
  4: {
    plan(M, z, r) {
      const A = M.analyse, T = M.teile, N = T.length;
      const d = (a, b) => Math.hypot(T[a].hx - T[b].hx, T[a].hy - T[b].hy);
      // Gerüst: minimaler Spannbaum über die Lagen im Eingangsbild (jedes Teil hängt am Netz)
      const imBaum = new Set([0]), kanten = [];
      while (imBaum.size < N) {
        let best = null;
        for (const a of imBaum) for (let b = 0; b < N; b++) if (!imBaum.has(b)) { const l = d(a, b); if (!best || l < best.l) best = { a, b, l }; }
        imBaum.add(best.b); kanten.push({ i: best.a, j: best.b, art: "baum" });
      }
      const schon = new Set(kanten.map((k) => `${Math.min(k.i, k.j)}-${Math.max(k.i, k.j)}`));
      const dazu = (i, j, art) => { const k = `${Math.min(i, j)}-${Math.max(i, j)}`; if (i !== j && !schon.has(k)) { schon.add(k); kanten.push({ i, j, art }); } };
      if (!M.verworfen.has("verbindung")) for (const [a, b] of A.kontakte) { const i = T.findIndex((e) => e.region === a), j = T.findIndex((e) => e.region === b); if (i >= 0 && j >= 0) dazu(i, j, "beruehrung"); }
      if (M.regel === "R7") for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) if (T[i].cluster === T[j].cluster) dazu(i, j, "farbe");
      const mittelS = z.teile.reduce((s, t) => s + t.s, 0) / Math.max(1, N);
      z.federn = kanten.map((k) => ({ ...k, L: d(k.i, k.j) * mittelS, k: k.art === "baum" ? 0.5 : 0.35, aktiv: true }));
      const anstoss = [...T].sort((a, b) => b.anteil - a.anteil)[0]?.i ?? 0;
      z.anstoss = anstoss;
      const t = z.teile[anstoss];
      const wachstum = Math.max(1, Math.min(1.35, 0.34 / Math.max(0.01, T[anstoss].radius * t.s)));
      z.ereignisse.push({ schritt: z.schritt, text: `Schritt 4: ${z.federn.length} Kopplungen (${kanten.filter((k) => k.art === "baum").length} Gerüst, ${kanten.filter((k) => k.art === "beruehrung").length} Berührung${M.regel === "R7" ? `, ${kanten.filter((k) => k.art === "farbe").length} gleiche Farbe` : ""}); Anstoss: ${name(T[anstoss])} dreht um 60°${wachstum > 1.01 ? ` und wächst um ${Math.round((wachstum - 1) * 100)} %` : ""}. Stellen mit Spur sind zäh.` });
      return { rot0: t.rot, s0: t.s, wachstum };
    },
    lauf(M, z, p) {
      const P = z.plan, d = z.teile[z.anstoss];
      d.rot = P.rot0 + (Math.PI / 3) * glatt(p / 0.6);
      d.s = P.s0 * (1 + (P.wachstum - 1) * glatt(p / 0.6));
      z.kopplungAlpha = glatt(p / 0.2) * 0.9;
      entspannen(M, z, 1);
      if (M.regel === "R5") for (const [i, t] of z.teile.entries()) if (!t.fest) t.y += 0.0012 * (M.teile[i].last - 1);
      for (const [i, t] of z.teile.entries()) imBild(M, t, M.teile[i]);
      if (M.regel !== "R6") for (const t of z.teile) t.loch = Math.min(t.loch, 0.65);
    },
  },

  // 5 · Figur und Grund: der Zwischenraum der erreichten Lage wird mit dem Material des Grundes zur tragenden Form, die Teile treten als Kontur zurück
  5: {
    plan(M, z) {
      z.luecke = zwischenraum(M, z);
      const flaeche = z.luecke.reduce((s, l) => s + Math.abs(polyFlaeche(l)), 0);
      z.ereignisse.push({ schritt: z.schritt, text: `Schritt 5: Der Zwischenraum der erreichten Lage (${Math.round(flaeche / M.seite * 100)} % des Bildes, ${z.luecke.length} Form${z.luecke.length === 1 ? "" : "en"}) wird mit dem Material des Grundes gefüllt${M.regel === "R6" ? "; die offenen Leerstellen gehen in ihn ein" : ""}.` });
      return {};
    },
    lauf(M, z, p) {
      z.lueckeAlpha = glatt(p / 0.6);
      z.kopplungAlpha = 0.9 * (1 - glatt(p / 0.4));
      z.grundAlpha = 0.45 - 0.35 * glatt(p / 0.6);
      z.spurAlpha = 1 - 0.7 * glatt(p / 0.6);
      for (const t of z.teile) { t.a = 1 - 0.85 * glatt(p / 0.6); t.kontur = glatt(p / 0.5); }
    },
  },

  // 6 · Anders weitergehen: ein kleiner Eingriff – eine Gerüst-Kopplung wird getrennt (die mit der meisten Spur auf ihrer Strecke); Netz und Spuren bestimmen die Folgen
  6: {
    plan(M, z, r) {
      if (M.regel === "R2") spiegelSpur(M, z, z.teile.map((t) => ({ x: t.x, y: t.y, rot: t.rot, s: t.s })), "Schlüsselzustand 5");
      // Ziel des Eingriffs: die Gerüst-Kopplung, über der am meisten Spur liegt; Kopplungen, deren Trennung das Netz teilt, gehen vor
      const zusammen = (ohne) => {
        const nb = z.teile.map(() => []);
        z.federn.forEach((g, k) => { if (g.aktiv && k !== ohne) { nb[g.i].push(g.j); nb[g.j].push(g.i); } });
        const gesehen = new Set([0]), st = [0];
        while (st.length) for (const k of nb[st.pop()]) if (!gesehen.has(k)) { gesehen.add(k); st.push(k); }
        return gesehen.size === z.teile.length;
      };
      let best = -1, wert = -1, spurMenge = 0;
      z.federn.forEach((f, k) => {
        if (f.art !== "baum" || !f.aktiv) return;
        const a = z.teile[f.i], b = z.teile[f.j];
        let s = 0;
        for (let q = 1; q < 12; q++) s += spurAn(M, z, a.x + (b.x - a.x) * q / 12, a.y + (b.y - a.y) * q / 12);
        const w = s / 11 + (zusammen(k) ? 0 : 1000);
        if (w > wert) { wert = w; best = k; spurMenge = s / 11; }
      });
      const a0 = z.teile.map((t) => t.a), k0 = z.teile.map((t) => t.kontur);
      if (best < 0) return { a0, k0 };
      const f = z.federn[best];
      f.aktiv = false; z.schnitt = best;
      // welche Teile hängen danach noch mit f.j zusammen (über alle verbleibenden Kopplungen)?
      const nb = z.teile.map(() => []);
      for (const g of z.federn) if (g.aktiv) { nb[g.i].push(g.j); nb[g.j].push(g.i); }
      const seiteB = new Set([f.j]), st = [f.j];
      while (st.length) for (const k of nb[st.pop()]) if (!seiteB.has(k)) { seiteB.add(k); st.push(k); }
      const getrennt = !seiteB.has(f.i);
      const a = z.teile[f.i], b = z.teile[f.j];
      let dx = b.x - a.x, dy = b.y - a.y; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const staerke = 0.016;
      z.ereignisse.push({ schritt: z.schritt, text: `Schritt 6: Eingriff – die Kopplung ${name(M.teile[f.i])}–${name(M.teile[f.j])} (mittlere Spur ${spurMenge.toFixed(1)} auf ihrer Strecke) wird getrennt. ${getrennt ? `Das Netz zerfällt in zwei Gruppen (${seiteB.size} und ${z.teile.length - seiteB.size} Teile), die auseinanderdriften.` : "Andere Kopplungen halten das Netz zusammen; nur die Spannung löst sich."} Der Zwischenraum wird laufend neu bestimmt.` });
      return { seiteB: [...seiteB], getrennt, dx, dy, staerke, a0, k0 };
    },
    lauf(M, z, p, k) {
      const P = z.plan;
      if (P.seiteB) {
        const B = new Set(P.seiteB), v = P.staerke * (1 - glatt(p / 0.8)) * (P.getrennt ? 1 : 0.35);
        for (const [i, t] of z.teile.entries()) {
          if (t.fest) continue;
          const sgn = B.has(i) ? 1 : -1, mu = beweglichkeit(M, z, i);
          let nx = t.x + sgn * P.dx * v * mu, ny = t.y + sgn * P.dy * v * mu;
          if (M.regel === "R1" && spurAn(M, z, nx, ny) > 2.5 && spurAn(M, z, nx, ny) > spurAn(M, z, t.x, t.y)) continue;   // nicht tiefer in die Spur
          t.x = nx; t.y = ny;
          if (M.regel === "R5") t.y += 0.0012 * (M.teile[i].last - 1);
        }
      }
      entspannen(M, z, 1);
      for (const [i, t] of z.teile.entries()) imBild(M, t, M.teile[i]);
      for (const [i, t] of z.teile.entries()) { t.a = P.a0[i] + (1 - P.a0[i]) * glatt(p / 0.5); t.kontur = P.k0[i] * (1 - 0.65 * glatt(p / 0.5)); }
      z.kopplungAlpha = 0.5 * glatt((p - 0.1) / 0.3);
      if (k % 6 === 0 || p >= 0.999) z.luecke = zwischenraum(M, z);
      z.lueckeAlpha = 1 - 0.15 * glatt(p);
    },
  },
};

/** Beweglichkeit eines Teils: Spuren unter ihm machen es zäh (Folgewirksamkeit), R5 macht grosse Teile schwer */
function beweglichkeit(M, z, i) {
  const t = z.teile[i];
  if (t.fest) return 0;
  return 1 / ((1 + 0.9 * spurUnter(M, z, i, t.x, t.y, matrix(t.rot, t.s))) * M.teile[i].last);
}

/** eine Runde Entspannung der Kopplungen (Lage, Drehung und Grösse übertragen sich) */
function entspannen(M, z, runden) {
  const mu = z.teile.map((t, i) => (i === z.anstoss ? 0.25 : 1) * beweglichkeit(M, z, i));
  for (let r = 0; r < runden; r++) {
    for (const f of z.federn) {
      if (!f.aktiv) continue;
      const a = z.teile[f.i], b = z.teile[f.j];
      const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1e-6;
      const fehler = (l - f.L) / l * f.k * 0.12, ma = mu[f.i], mb = mu[f.j], summe = ma + mb;
      if (summe <= 0) continue;
      a.x += dx * fehler * (ma / summe); a.y += dy * fehler * (ma / summe);
      b.x -= dx * fehler * (mb / summe); b.y -= dy * fehler * (mb / summe);
      // Drehung und Grösse gleichen sich über die Kopplung an
      const dr = b.rot - a.rot;
      a.rot += dr * 0.02 * ma; b.rot -= dr * 0.02 * mb;
      const ds = b.s - a.s;
      a.s += ds * 0.006 * ma; b.s -= ds * 0.006 * mb;
    }
  }
}

/** Belegung der Teile im Spurenraster (0/1) */
function belegung(M, z) {
  const O = new Float32Array(M.gw * M.gh);
  z.teile.forEach((t, i) => zellen(M, M.teile[i], t.x, t.y, matrix(t.rot, t.s), (k) => { O[k] = 1; }));
  return O;
}
function weich(F, w, h, r) {
  let A = F;
  for (let pass = 0; pass < 2; pass++) {
    const B = new Float32Array(w * h), C = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, c = 0; for (let d = -r; d <= r; d++) { const xx = x + d; if (xx >= 0 && xx < w) { s += A[y * w + xx]; c++; } } B[y * w + x] = s / c; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let s = 0, c = 0; for (let d = -r; d <= r; d++) { const yy = y + d; if (yy >= 0 && yy < h) { s += B[yy * w + x]; c++; } } C[y * w + x] = s / c; }
    A = C;
  }
  return A;
}
/** Zwischenraum: Stellen in der Nähe der Teile, die keines bedeckt (mit R6 dazu die offenen Leerstellen), als Linienzüge in normierten Koordinaten */
function zwischenraum(M, z) {
  const { gw, gh } = M;
  const O = belegung(M, z);
  const naehe = weich(O, gw, gh, 4);
  const G = new Float32Array(gw * gh);
  for (let k = 0; k < G.length; k++) G[k] = naehe[k] > 0.06 && O[k] === 0 ? 1 : 0;
  if (M.regel === "R6") M.teile.forEach((e, i) => { if (z.teile[i].loch > 0.5) zellen(M, e, e.hx, e.hy, [1, 0, 0, 1], (k) => { if (!O[k]) G[k] = 1; }); });
  const W = weich(G, gw, gh, 1);
  return konturen(W, gw, gh, 0.5).map((zug) => zug.map(([x, y]) => [(x + 0.5) / gh, (y + 0.5) / gh]));
}
function polyFlaeche(p) { let s = 0; for (let i = 0; i < p.length; i++) { const [x1, y1] = p[i], [x2, y2] = p[(i + 1) % p.length]; s += x1 * y2 - x2 * y1; } return s / 2; }

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
  [z.grundAlpha, z.spurAlpha, z.lueckeAlpha, z.kopplungAlpha].forEach((v) => add(r(v)));
  add(z.stempel.length);
  for (let k = 0; k < z.spuren.length; k++) if (z.spuren[k]) add(k * 31 + r(z.spuren[k]));
  for (const l of z.luecke) for (const [x, y] of l) { add(r(x)); add(r(y)); }
  for (const f of z.federn) add(f.aktiv ? 1 : 0);
  return h.toString(16).padStart(8, "0");
}

/** Beschreibung der sechs Operationen für die Standbilder, aus dem tatsächlichen Lauf */
export function beschreibungen(M, schluesselZustaende) {
  const aus = (st) => (schluesselZustaende[st]?.ereignisse ?? []).filter((e) => e.schritt >= SCHLUESSEL[st - 1] && e.schritt < SCHLUESSEL[st]).map((e) => e.text);
  return STATIONEN.slice(1).map((s) => ({ nr: s.nr, titel: s.titel, text: aus(s.nr).join(" ") }));
}
