// Animationen – Schwerkraft für die Montage (6. November 2026, Christian zum Prototyp mit Planck.js: «Oh toll ja gerne»).
// Ein Teil der Quadtree-Kacheln löst sich, fällt vor dem Bild herunter, stösst aneinander und stapelt sich unten; dann läuft alles
// rückwärts, bis das Bild wieder ganz ist. Physik hat ein Gedächtnis, der Motor aber hängt nur von der Zeit in der Schlaufe ab
// (Bild N ist wieder Bild 0, das MP4 entsteht Bild für Bild). Darum wird der Fall einmal vorgerechnet und gespeichert: die erste
// Hälfte eines Zyklus spielt ihn vorwärts, die zweite rückwärts. Am Ende liegen die Kacheln still, die Umkehr ist also ruhig.
// Die Kacheln entstehen wie in der Montage selbst (Teilung nach der Helligkeit, Start bei Kacheln von einer halben Bildhöhe),
// gemessen beim mittleren Atem der Teilung. Physik: Planck.js 1.4.2 (MIT, Box2D in JavaScript), lokal in vendor/, erst bei Bedarf geladen.

let pl = null, laden = null;
/** lädt Planck.js einmal (dynamischer Import), danach rechnet kachelBahn sofort */
export function physikLaden() {
  laden ??= import("../vendor/planck-1.4.2/planck.js").then((m) => { pl = m; return m; }).catch((f) => { laden = null; throw f; });
  return laden;
}

export const FPS = 30;
const S = 16;                                   // eine Bildhöhe sind 16 m in der Physik (Box2D mag Körper von 0,1 bis 10 m)
const HELL_ZEILEN = 400;                        // Auflösung der Helligkeit für die Teilung

function zufall(s) {
  return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

// Helligkeit des Bildes so, wie die Bühne es zeigt (bildfüllend, wie Q im Shader), als Summentabelle für Mittelwerte über Rechtecke
const hellCache = new WeakMap();
function helligkeit(img, a) {
  let je = hellCache.get(img);
  if (!je) { je = new Map(); hellCache.set(img, je); }
  const k = a.toFixed(4);
  if (je.has(k)) return je.get(k);
  const h = HELL_ZEILEN, b = Math.max(1, Math.round(h * a));
  const c = document.createElement("canvas"); c.width = b; c.height = h;
  const x = c.getContext("2d", { willReadFrequently: true });
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, s = Math.max(b / iw, h / ih);
  x.drawImage(img, (b - iw * s) / 2, (h - ih * s) / 2, iw * s, ih * s);
  const d = x.getImageData(0, 0, b, h).data;     // wirft bei einem fremden Bild ohne CORS: dann ohne Schwerkraft
  const T = new Float64Array((b + 1) * (h + 1));
  for (let j = 0; j < h; j++) for (let i = 0; i < b; i++) {
    const o = ((h - 1 - j) * b + i) * 4, a1 = (j + 1) * (b + 1) + i + 1;   // j zählt von unten, wie uv im Shader
    T[a1] = (.299 * d[o] + .587 * d[o + 1] + .114 * d[o + 2]) / 255 + T[a1 - 1] + T[a1 - b - 1] - T[a1 - b - 2];
  }
  const r = { b, h, T };
  je.set(k, r);
  return r;
}

/** mittlere Helligkeit im Rechteck um die Mitte (x, y) mit halber Breite r, in Koordinaten der Bühne (P: Höhe 1, Mitte 0) */
function mittel(H, a, x, y, r) {
  const { b, h, T } = H;
  const px = (v) => Math.max(0, Math.min(b, Math.round((v / a + .5) * b))), py = (v) => Math.max(0, Math.min(h, Math.round((v + .5) * h)));
  let x0 = px(x - r), x1 = px(x + r), y0 = py(y - r), y1 = py(y + r);
  if (x1 <= x0) { if (x0 >= b) x0 = b - 1; x1 = x0 + 1; }
  if (y1 <= y0) { if (y0 >= h) y0 = h - 1; y1 = y0 + 1; }
  const w = b + 1;
  return (T[y1 * w + x1] - T[y0 * w + x1] - T[y1 * w + x0] + T[y0 * w + x0]) / ((x1 - x0) * (y1 - y0));
}

/**
 * die Kacheln zum Fallen: wie in der Montage von einer halben Bildhöhe aus geteilt, wo die vier Viertel verschieden hell sind, aber
 * mindestens zweimal (ein Achtel der Bildhöhe, sonst fällt in ruhigen Bildern nur eine Handvoll grosser Platten) und höchstens
 * viermal (ein Zweiunddreissigstel, kleinere Stücke wären nur noch Staub)
 */
function kacheln(H, a, teilung) {
  const thr = .3 + (.035 - .3) * teilung, out = [];
  const teile = (cx, cy, sz, lv) => {
    const q = sz / 4;
    const m = q / 2, v = [mittel(H, a, cx - q, cy - q, m), mittel(H, a, cx + q, cy - q, m), mittel(H, a, cx - q, cy + q, m), mittel(H, a, cx + q, cy + q, m)];
    const sp = Math.max(...v) - Math.min(...v);
    if (lv < 2 || (lv < 4 && sp >= thr)) { const n = sz / 2; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) teile(cx + dx * n / 2, cy + dy * n / 2, n, lv + 1); }
    else if (Math.abs(cx) - sz / 2 < a / 2 && Math.abs(cy) - sz / 2 < .5) out.push({ cx, cy, hw: sz / 2, lv, sp });
  };
  const sz = .5;
  for (let y = Math.floor(-.5 / sz) * sz; y < .5; y += sz) for (let x = Math.floor(-a / 2 / sz) * sz; x < a / 2; x += sz) teile(x + sz / 2, y + sz / 2, sz, 0);
  return out;
}

/**
 * rechnet den Fall vor. a: Seitenverhältnis der Bühne, teilung: Regler «Teilung» der Montage, anteil: Regler «Schwerkraft»,
 * seed: Seed der Ebene, sekunden: Länge eines Zyklus. Ergebnis: n Kacheln (rect: Mitte und halbe Grösse in P), start (Bild, in dem
 * sie sich löst), halb (Bilder je Hälfte) und bahn (je Bild und Kachel x, y, Winkel). null, wenn Planck noch nicht geladen ist.
 */
export function kachelBahn(img, { a, teilung, anteil, seed, sekunden, sparsam }) {
  if (!pl || !img) return null;
  const alle = kacheln(helligkeit(img, a), a, teilung);
  const r = zufall(1 + seed * 7919);
  const MAX = sparsam ? 160 : 420;
  // wer fällt: Zufall, detailreiche Kacheln etwas eher; die Schwerkraft bestimmt den Anteil, höchstens MAX Körper
  const rang = alle.map((k, i) => ({ i, v: -k.lv * .12 - k.sp * .5 + (r() - .5) })).sort((x, y) => x.v - y.v);
  const nFall = Math.min(MAX, Math.round(alle.length * Math.min(1, anteil * 1.15)));
  const fall = rang.slice(0, nFall).map((e) => alle[e.i]);
  const n = fall.length;
  const halb = Math.max(2, Math.round(sekunden * FPS / 2));
  const rect = new Float32Array(n * 4), start = new Int32Array(n), bahn = new Float32Array(halb * n * 3);
  if (!n) return { n, rect, start, halb, bahn };

  const welt = new pl.World({ gravity: { x: 0, y: -10 } });
  const rand = welt.createBody();
  const W = a * S / 2, B = S / 2;
  rand.createFixture(new pl.Edge({ x: -W - 2, y: -B }, { x: W + 2, y: -B }), { friction: .7 });
  rand.createFixture(new pl.Edge({ x: -W, y: -B }, { x: -W, y: B * 6 }), { friction: .3 });
  rand.createFixture(new pl.Edge({ x: W, y: -B }, { x: W, y: B * 6 }), { friction: .3 });
  // Ablösen nach einer Welle, die der Seed von einer Seite schräg durchs Bild schickt, mit Zufall; bis 45 % der Hälfte haben sich alle gelöst
  const halt = Math.round(.5 * FPS), ende = Math.max(halt + 1, Math.round(halb * .45));
  const wink = r() * Math.PI * 2, dx = Math.cos(wink), dy = Math.sin(wink);
  const welle = fall.map((k, i) => ({ i, v: k.cx * dx + k.cy * dy + (r() - .5) * .5 })).sort((x, y) => x.v - y.v);
  welle.forEach((e, j) => { start[e.i] = halt + Math.round((j / Math.max(1, n - 1)) ** .9 * (ende - halt)); });
  const koerper = fall.map((k, i) => {
    rect.set([k.cx, k.cy, k.hw, k.hw], i * 4);
    const b = welt.createBody({ type: "static", position: { x: k.cx * S, y: k.cy * S }, angle: 0, angularDamping: .4, linearDamping: .05 });
    const fuge = Math.min(.004, k.hw * .04) * S;   // eine Spur kleiner, damit Nachbarn sich nicht schon beim Loslassen stossen
    // noch hängende Kacheln stossen mit nichts zusammen (Maske 0), gelöste nur untereinander und mit Boden und Wänden
    b.createFixture(new pl.Box(k.hw * S - fuge, k.hw * S - fuge), { density: 1, friction: .55, restitution: .06, filterCategoryBits: 2, filterMaskBits: 0 });
    return b;
  });
  const tempo = .75, schritte = sparsam ? 2 : 3, dt = tempo / FPS / schritte;
  for (let f = 0; f < halb; f++) {
    for (let i = 0; i < n; i++) if (start[i] === f) {
      const b = koerper[i];
      b.setDynamic(); b.getFixtureList().setFilterData({ groupIndex: 0, categoryBits: 2, maskBits: 3 });
      b.setLinearVelocity({ x: (r() - .5) * .6, y: r() * .4 });
      b.setAngularVelocity((r() - .5) * 1.6);
    }
    if (f >= halt) for (let s = 0; s < schritte; s++) welt.step(dt, 8, 3);
    for (let i = 0; i < n; i++) {
      const p = koerper[i].getPosition(), o = (f * n + i) * 3;
      bahn[o] = p.x / S; bahn[o + 1] = p.y / S; bahn[o + 2] = koerper[i].getAngle();
    }
  }
  // Ausklingen: die letzten 15 % weich in den Endzustand, damit die Umkehr ohne Ruck ist
  const ruhe = Math.max(1, Math.round(halb * .15)), last = (halb - 1) * n * 3;
  for (let f = halb - ruhe; f < halb; f++) {
    const u = (f - (halb - ruhe)) / ruhe, e = u * u * (3 - 2 * u);
    for (let i = 0; i < n * 3; i++) { const o = f * n * 3 + i; bahn[o] += (bahn[last + i] - bahn[o]) * e; }
  }
  return { n, rect, start, halb, bahn };
}

/** Lage aller Kacheln zur Zeit tz (0 … 1 im Zyklus) als x, y, Winkel, gelöst (0/1) je Kachel, in ziel */
export function lageZur(B, tz, ziel) {
  const { n, halb, bahn, start } = B, F = halb * 2, ff = (((tz % 1) + 1) % 1) * F;
  const f = Math.max(0, Math.min(halb - 1, ff < halb ? ff : F - ff)), f0 = Math.floor(f), f1 = Math.min(halb - 1, f0 + 1), w = f - f0;
  for (let i = 0; i < n; i++) {
    const o0 = (f0 * n + i) * 3, o1 = (f1 * n + i) * 3, z = i * 4;
    ziel[z] = bahn[o0] + (bahn[o1] - bahn[o0]) * w; ziel[z + 1] = bahn[o0 + 1] + (bahn[o1 + 1] - bahn[o0 + 1]) * w;
    ziel[z + 2] = bahn[o0 + 2] + (bahn[o1 + 2] - bahn[o0 + 2]) * w; ziel[z + 3] = f0 >= start[i] ? 1 : 0;
  }
  return ziel;
}
