// Neubau /b/: die Tafeln der sieben Apps – gezeichnet und in Bewegung (20. Oktober 2026).
// Wunsch von Christian: «Die Beitragsbilder bzw. Karten für die Apps möchte ich alle stilvoll re-designt … alles stilisiert, zur Seite passend»
// und «bei den Apps unter ‹Was dabei herauskommt› möchte ich tolle Animationen, … eine Art Vorstellungs- oder Erkläranimationen, stilisiert, stilvoll».
//
// Ein Modul für beides: tools/b-app-bilder.mjs schreibt aus dem Ruhezustand die SVG-Dateien (b/bilder/apps/), und b/tafeln-leben.js lässt
// dieselben Zeichnungen auf den App-Seiten leben. Je App ein Motiv aus ihrer Mechanik, 1200 × 1200, Tinte auf Papier, die Blaupause als Akzent,
// Farbe nur bei OMNA COLOR. Kein DOM, keine Abhängigkeiten: läuft in Node und im Browser.
//
//   TAFELN[slug].neu()            → Zustand im Ruhebild (das Standbild)
//   TAFELN[slug].schritt(z, dt)   → Zustand weiterrechnen (dt in Sekunden); der Zustand kennt seine Zeit z.t
//   TAFELN[slug].svg(z, farben)   → der Inhalt des SVG (ohne Hülle) für diesen Zustand
//   svg(slug, dunkel)             → die ganze SVG-Datei des Ruhebilds

export const W = 1200, M = 600;   // Seite und Mitte

/** fester Zufall (mulberry32), damit die Tafeln bei jedem Lauf gleich sind */
export function zufall(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const f = (n) => Number(n.toFixed(2));
const polar = (r, grad, cx = M, cy = M) => [f(cx + r * Math.cos((grad - 90) * Math.PI / 180)), f(cy + r * Math.sin((grad - 90) * Math.PI / 180))];
const bogen = (r, von, bis) => { const [x1, y1] = polar(r, von), [x2, y2] = polar(r, bis); return `M${x1} ${y1}A${r} ${r} 0 ${bis - von > 180 ? 1 : 0} 1 ${x2} ${y2}`; };
const weich = (t) => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);           // sanft hinein und hinaus
const aus = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);       // ausrollen
const dreh = (grad) => `transform="rotate(${f(grad)} ${M} ${M})"`;

/** Farben je Modus: Tinte, Papier, Grau, Linie, Faden (die Blaupause), Faden hell */
export const farben = (dunkel) => dunkel
  ? { papier: "#000000", tinte: "#ffffff", grau: "#9a9a9a", linie: "#2e2e2e", faden: "#8fb0ff", fadenHell: "rgba(143,176,255,0.22)" }
  : { papier: "#ffffff", tinte: "#000000", grau: "#6f6f6f", linie: "#dadada", faden: "#1d3fd6", fadenHell: "rgba(29,63,214,0.16)" };

/* ---------- ORNA: zwei Ringe zu je zwanzig Feldern drehen gegeneinander; wo sie stehen bleiben, die Begegnung in der Blaupause ---------- */
const orna = {
  alt: "ORNA, gezeichnet: zwei Ringe zu je zwanzig Feldern, gegeneinander gedreht; wo sie stehen bleiben, die Begegnung in Blau",
  // Ruhe: beide Ringe stehen, das Feld oben ist die Begegnung. Lauf: 2,4 s stehen → 3,6 s drehen (aussen und innen gegenläufig, ausrollend) → stehen …
  neu() { return { t: 0, z: zufall(3), aussen: 0, innen: 0, von: null, bis: null, phase: "stehen", seit: 0 }; },
  schritt(z, dt) {
    z.t += dt; z.seit += dt;
    if (z.phase === "stehen" && z.seit > 2.4) {
      z.phase = "drehen"; z.seit = 0;
      const n = 20;
      z.von = { aussen: z.aussen, innen: z.innen };
      z.bis = { aussen: z.aussen + 360 * 2 + Math.floor(z.z() * n) * 18, innen: z.innen - 360 * 1 - Math.floor(z.z() * n) * 18 };
    } else if (z.phase === "drehen") {
      const d = 3.6, p = aus(z.seit / d);
      z.aussen = z.von.aussen + (z.bis.aussen - z.von.aussen) * p;
      z.innen = z.von.innen + (z.bis.innen - z.von.innen) * aus(Math.min(1, z.seit / (d * 0.86)));
      if (z.seit >= d) { z.phase = "stehen"; z.seit = 0; z.aussen = z.bis.aussen % 360; z.innen = ((z.bis.innen % 360) + 360) % 360; }
    }
  },
  svg(z, c) {
    const steht = z.phase === "stehen";
    const da = steht ? Math.min(1, z.seit / 0.5) : 0;   // die Begegnung erscheint nach dem Stillstand
    const ring = (ra, ri, n, versatz, strich) => {
      const s = [`<circle cx="${M}" cy="${M}" r="${ra}" fill="none" stroke="${c.tinte}" stroke-width="${strich}"/>`, `<circle cx="${M}" cy="${M}" r="${ri}" fill="none" stroke="${c.tinte}" stroke-width="${strich}"/>`];
      for (let i = 0; i < n; i++) { const [x1, y1] = polar(ri, versatz + i * 360 / n), [x2, y2] = polar(ra, versatz + i * 360 / n); s.push(`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c.tinte}" stroke-width="2"/>`); }
      return s.join("");
    };
    const feld = (ra, ri, von, bis) => { const [ax, ay] = polar(ra, von), [bx, by] = polar(ra, bis), [cx, cy] = polar(ri, bis), [dx, dy] = polar(ri, von);
      return `<path d="M${ax} ${ay}A${ra} ${ra} 0 0 1 ${bx} ${by}L${cx} ${cy}A${ri} ${ri} 0 0 0 ${dx} ${dy}Z" fill="${c.fadenHell}" stroke="${c.faden}" stroke-width="3" opacity="${f(da)}"/>`; };
    const [ax, ay] = polar(400, 0), [bx, by] = polar(350, 0);
    return [
      `<g ${dreh(z.aussen)}>${ring(470, 400, 20, 9, 3)}</g>`,
      `<g ${dreh(z.innen)}>${ring(350, 280, 20, 9, 3)}</g>`,
      feld(470, 400, -9, 9), feld(350, 280, -9, 9),
      `<path d="M${ax} ${ay}L${bx} ${by}" stroke="${c.faden}" stroke-width="3" opacity="${f(da)}"/>`,
      `<path d="M${M} ${M - 490}l-11,-22h22Z" fill="${c.faden}"/>`,
      `<circle cx="${M}" cy="${M}" r="10" fill="${c.faden}"/>`,
      `<circle cx="${M}" cy="${M}" r="120" fill="none" stroke="${c.linie}" stroke-width="2"/>`,
      Array.from({ length: 20 }, (_, i) => { const [x, y] = polar(120, i * 18); return `<circle cx="${x}" cy="${y}" r="3.5" fill="${c.tinte}"/>`; }).join(""),
    ].join("");
  },
};

/* ---------- ORMA: ein Kreis, in der Mitte geteilt; zwei Personen an einem Tisch; der Re-Entry: die Seite wechselt ---------- */
const orma = {
  alt: "ORMA, gezeichnet: ein Kreis, in der Mitte geteilt, links Papier, rechts Tinte; zwei Personen an einem Tisch",
  // Lauf (8 s): die beiden Gedanken wachsen aus den Personen (0–1,5 s), halten, dann wandert die Tinte auf die andere Seite (3,5–4,5 s), halten, die Gedanken ziehen sich zurück (6,5–8 s)
  neu() { return { t: 0, seite: 1 }; },
  schritt(z, dt) { const vorher = z.t % 8; z.t += dt; if (vorher < 4 && z.t % 8 >= 4 && z.t % 8 < 4.5) {} },
  svg(z, c) {
    const r = 360, u = z.t % 8;
    const gedanke = u < 1.5 ? weich(u / 1.5) : u < 6.5 ? 1 : 1 - weich((u - 6.5) / 1.5);
    const wechsel = u < 3.5 ? 0 : u < 4.5 ? weich((u - 3.5) / 1) : 1;        // 0: Tinte rechts, 1: Tinte links
    const zyklus = Math.floor(z.t / 8) % 2;                                    // jeder zweite Lauf beginnt links
    const links = (zyklus ? 1 - wechsel : wechsel);
    // die Tinte: eine Halbscheibe, deren Trennlinie von rechts nach links wandert (als Pfad mit einem Bogen und einer Sehne)
    const x = M + r * (1 - 2 * links) * 0; // Sehne bleibt in der Mitte; die Seite wechselt über die Deckkraft zweier Hälften
    const rechts = `<path d="M${M} ${M - r}A${r} ${r} 0 0 1 ${M} ${M + r}Z" fill="${c.tinte}" opacity="${f(1 - links)}"/>`;
    const linke = `<path d="M${M} ${M - r}A${r} ${r} 0 0 0 ${M} ${M + r}Z" fill="${c.tinte}" opacity="${f(links)}"/>`;
    const gr = 60 * gedanke, pr = 12 * gedanke;
    const posL = M - r - 80 + (M - 150 - (M - r - 80)) * gedanke, posR = M + r + 80 - (M + r + 80 - (M + 150)) * gedanke;
    return [
      `<circle cx="${M}" cy="${M}" r="${r}" fill="none" stroke="${c.tinte}" stroke-width="4"/>`,
      rechts, linke,
      `<path d="M${M} 90L${M} ${W - 90}" stroke="${c.tinte}" stroke-width="2"/>`,
      `<circle cx="${M - r - 80}" cy="${M}" r="20" fill="none" stroke="${c.tinte}" stroke-width="4"/>`,
      `<circle cx="${M + r + 80}" cy="${M}" r="20" fill="${c.tinte}"/>`,
      gedanke > 0.01 ? `<circle cx="${f(posL)}" cy="${M}" r="${f(pr)}" fill="${c.faden}"/><circle cx="${f(posR)}" cy="${M}" r="${f(pr)}" fill="${c.faden}"/>` : "",
      gedanke > 0.01 ? `<circle cx="${f(posL)}" cy="${M}" r="${f(gr)}" fill="none" stroke="${c.faden}" stroke-width="3"/><circle cx="${f(posR)}" cy="${M}" r="${f(gr)}" fill="none" stroke="${c.faden}" stroke-width="3"/>` : "",
    ].join("");
  },
};
// Ruhebild von ORMA: die Gedanken sind da, die Tinte rechts (t = 2)
orma.neu = () => ({ t: 2 });

/* ---------- OMNA COLOR: zwei Räder zu sieben Feldern drehen gegeneinander; der Lesestrich oben trifft zwei Felder ---------- */
const omnaColor = {
  alt: "OMNA COLOR, gezeichnet: zwei Räder mit je sieben Feldern, aussen in sieben Farben, innen als Linie, gegeneinander gedreht",
  neu() { return { t: 0, z: zufall(5), aussen: 0, innen: 26, von: null, bis: null, phase: "stehen", seit: 0 }; },
  schritt(z, dt) {
    z.t += dt; z.seit += dt;
    const s = 360 / 7;
    if (z.phase === "stehen" && z.seit > 2.6) {
      z.phase = "drehen"; z.seit = 0;
      z.von = { aussen: z.aussen, innen: z.innen };
      z.bis = { aussen: z.aussen + 360 + Math.floor(z.z() * 7) * s, innen: z.innen - 360 * 2 - Math.floor(z.z() * 7) * s };
    } else if (z.phase === "drehen") {
      const d = 3.2;
      z.aussen = z.von.aussen + (z.bis.aussen - z.von.aussen) * aus(z.seit / d);
      z.innen = z.von.innen + (z.bis.innen - z.von.innen) * aus(Math.min(1, z.seit / (d * 0.8)));
      if (z.seit >= d) { z.phase = "stehen"; z.seit = 0; z.aussen = z.bis.aussen % 360; z.innen = ((z.bis.innen % 360) + 360) % 360; }
    }
  },
  svg(z, c) {
    const s = [], n = 7, toene = [8, 36, 62, 150, 200, 250, 300];
    const a = [];
    for (let i = 0; i < n; i++) { const von = i * 360 / n, bis = (i + 1) * 360 / n; a.push(`<path d="${bogen(385, von + 0.6, bis - 0.6)}" fill="none" stroke="hsl(${toene[i]} 46% 66%)" stroke-width="110"/>`); }
    a.push(`<circle cx="${M}" cy="${M}" r="440" fill="none" stroke="${c.tinte}" stroke-width="3"/>`, `<circle cx="${M}" cy="${M}" r="330" fill="none" stroke="${c.tinte}" stroke-width="3"/>`);
    for (let i = 0; i < n; i++) { const [x1, y1] = polar(330, i * 360 / n), [x2, y2] = polar(440, i * 360 / n); a.push(`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c.papier}" stroke-width="5"/>`); }
    s.push(`<g ${dreh(z.aussen)}>${a.join("")}</g>`);
    const b = [`<circle cx="${M}" cy="${M}" r="290" fill="none" stroke="${c.tinte}" stroke-width="3"/>`, `<circle cx="${M}" cy="${M}" r="190" fill="none" stroke="${c.tinte}" stroke-width="3"/>`];
    for (let i = 0; i < n; i++) {
      const [x1, y1] = polar(190, i * 360 / n), [x2, y2] = polar(290, i * 360 / n);
      b.push(`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${c.tinte}" stroke-width="3"/>`);
      for (let k = 1; k <= 3; k++) { const [p, q] = polar(190 + k * 25, (i + 0.5) * 360 / n); b.push(`<circle cx="${p}" cy="${q}" r="${k === 2 ? 6 : 3.5}" fill="${c.tinte}"/>`); }
    }
    s.push(`<g ${dreh(z.innen)}>${b.join("")}</g>`);
    // beim Stillstand: die beiden getroffenen Felder innen und aussen in der Blaupause umrandet
    if (z.phase === "stehen") {
      const da = Math.min(1, z.seit / 0.5), st = 360 / 7;
      const feldA = Math.floor((((-z.aussen) % 360 + 360) % 360) / st), feldI = Math.floor((((-z.innen) % 360 + 360) % 360) / st);
      const rand = (ra, ri, von, bis) => { const [ax, ay] = polar(ra, von), [bx, by] = polar(ra, bis), [cx, cy] = polar(ri, bis), [dx, dy] = polar(ri, von);
        return `<path d="M${ax} ${ay}A${ra} ${ra} 0 0 1 ${bx} ${by}L${cx} ${cy}A${ri} ${ri} 0 0 0 ${dx} ${dy}Z" fill="none" stroke="${c.faden}" stroke-width="4" opacity="${f(da)}"/>`; };
      s.push(`<g ${dreh(z.aussen)}>${rand(440, 330, feldA * st, (feldA + 1) * st)}</g>`, `<g ${dreh(z.innen)}>${rand(290, 190, feldI * st, (feldI + 1) * st)}</g>`);
    }
    const [lx, ly] = polar(470, 0), [mx, my] = polar(160, 0);
    s.push(`<path d="M${lx} ${ly}L${mx} ${my}" stroke="${c.faden}" stroke-width="4"/>`, `<circle cx="${M}" cy="${M}" r="10" fill="${c.faden}"/>`);
    return s.join("");
  },
};

/* ---------- PHORMA I: ein Kristall aus Scherben – die Punkte treiben, die Dreiecke folgen (Delaunay), eine Scherbe wandert in Blau ---------- */
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
const phormaI = {
  alt: "PHORMA I, gezeichnet: ein Kristall aus Scherben, Dreiecke über einer Scheibe, eine Scherbe in Blau",
  neu() {
    const z = zufall(7), ruhe = [], bahn = [];
    for (let i = 0; i < 14; i++) { ruhe.push(polar(420 + z() * 30, i * 360 / 14 + z() * 12)); bahn.push([0, 0, 0]); }
    for (let i = 0; i < 34; i++) { const r = 80 + Math.sqrt(z()) * 320, a = z() * 360; ruhe.push(polar(r, a)); bahn.push([z() * Math.PI * 2, 0.25 + z() * 0.35, 10 + z() * 22]); }
    return { t: 0, ruhe, bahn, punkte: ruhe.map((p) => [...p]) };
  },
  schritt(z, dt) {
    z.t += dt;
    z.punkte = z.ruhe.map((p, i) => { const [ph, v, amp] = z.bahn[i]; return amp ? [p[0] + Math.cos(ph + z.t * v) * amp, p[1] + Math.sin(ph * 1.7 + z.t * v * 0.8) * amp] : p; });
  },
  svg(z, c) {
    const punkte = z.punkte, dreiecke = delaunay(punkte), s = [];
    const flaeche = (t) => { const [a, b, d] = t.map((k) => punkte[k]); return Math.abs((b[0] - a[0]) * (d[1] - a[1]) - (d[0] - a[0]) * (b[1] - a[1])) / 2; };
    const sortiert = [...dreiecke].sort((p, q) => flaeche(q) - flaeche(p));
    const voll = sortiert[6], hell = [sortiert[2], sortiert[9], sortiert[14], sortiert[20]];
    for (const t of dreiecke) {
      const d = `M${t.map((k) => punkte[k].map(f).join(" ")).join("L")}Z`;
      const fuell = t === voll ? c.faden : hell.includes(t) ? c.fadenHell : "none";
      s.push(`<path d="${d}" fill="${fuell}" stroke="${c.tinte}" stroke-width="2.4" stroke-linejoin="round"/>`);
    }
    return s.join("");
  },
};

/* ---------- PHORMA II: eine Linie wächst – Differential Growth aus einem Keim, bis sie die Scheibe füllt ---------- */
const R2 = 430, MAX2 = 2200, SCHRITTE2 = 420;
function wachsen(z) {
  const zelle = 28, g = new Map(), pts = z.pts, zf = z.z;
  pts.forEach((p, i) => { const k = `${Math.floor(p[0] / zelle)},${Math.floor(p[1] / zelle)}`; (g.get(k) || g.set(k, []).get(k)).push(i); });
  const neu = pts.map((p, i) => {
    const n = pts.length, vor = pts[(i + n - 1) % n], nach = pts[(i + 1) % n];
    let dx = ((vor[0] + nach[0]) / 2 - p[0]) * 0.09, dy = ((vor[1] + nach[1]) / 2 - p[1]) * 0.09;
    const gx = Math.floor(p[0] / zelle), gy = Math.floor(p[1] / zelle);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const j of g.get(`${gx + a},${gy + b}`) || []) {
      if (j === i) continue;
      const ex = p[0] - pts[j][0], ey = p[1] - pts[j][1], d2 = ex * ex + ey * ey;
      if (d2 < 26 * 26 && d2 > 0.01) { const d = Math.sqrt(d2), kraft = (26 - d) / 26 * 1.1; dx += ex / d * kraft; dy += ey / d * kraft; }
    }
    dx += (zf() - 0.5) * 0.3; dy += (zf() - 0.5) * 0.3;
    let x = p[0] + dx, y = p[1] + dy;
    const rx = x - M, ry = y - M, r = Math.hypot(rx, ry);
    if (r > R2) { x = M + rx / r * R2; y = M + ry / r * R2; }
    return [x, y];
  });
  const aus2 = [];
  for (let i = 0; i < neu.length; i++) {
    const p = neu[i], q = neu[(i + 1) % neu.length];
    aus2.push(p);
    if (Math.hypot(q[0] - p[0], q[1] - p[1]) > 11 && aus2.length < MAX2) aus2.push([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]);
  }
  z.pts = aus2; z.n += 1;
}
const phormaII = {
  alt: "PHORMA II, gezeichnet: eine einzige Linie, die aus einem Keim gewachsen ist und eine Scheibe füllt",
  keim() { const z = zufall(11), pts = []; for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2; pts.push([M + Math.cos(a) * (70 + z() * 8), M + Math.sin(a) * (70 + z() * 8)]); } return { t: 0, z, pts, n: 0, rest: 0, pause: 0 }; },
  neu() { const z = phormaII.keim(); while (z.n < SCHRITTE2 && z.pts.length < MAX2) wachsen(z); return z; },   // Ruhe: ausgewachsen
  // Lauf: aus dem Keim wachsen (etwa 70 Schritte je Sekunde), dann 3 s halten, dann von vorn
  schritt(z, dt) {
    z.t += dt;
    if (z.n >= SCHRITTE2 || z.pts.length >= MAX2) { z.pause += dt; if (z.pause > 3) Object.assign(z, phormaII.keim(), { t: z.t }); return; }
    z.rest += dt * 70;
    while (z.rest >= 1 && z.n < SCHRITTE2 && z.pts.length < MAX2) { wachsen(z); z.rest -= 1; }
  },
  svg(z, c) {
    const d = z.pts.map((p, i) => (i ? "L" : "M") + f(p[0]) + " " + f(p[1])).join("") + "Z";
    return [
      `<circle cx="${M}" cy="${M}" r="${R2 + 30}" fill="none" stroke="${c.linie}" stroke-width="2"/>`,
      `<path d="${d}" fill="none" stroke="${c.tinte}" stroke-width="3.2" stroke-linejoin="round"/>`,
      `<circle cx="${f(z.pts[0][0])}" cy="${f(z.pts[0][1])}" r="12" fill="${c.faden}"/>`,
    ].join("");
  },
};

/* ---------- PHORMA III: ein Gewebe – Bänder aus feinen Linien, vom Takt bewegt; ein Band in der Blaupause ---------- */
const phormaIII = {
  alt: "PHORMA III, gezeichnet: drei Bänder aus feinen Linien wie zerknitterte Seide, eines in Blau",
  neu() { const z = zufall(23), rauschen = []; for (let i = 0; i < 3 * 48 * 25; i++) rauschen.push((z() - 0.5) * 2); return { t: 0, rauschen }; },
  schritt(z, dt) { z.t += dt; },
  svg(z, c) {
    const s = []; let r = 0;
    const takt = 1 + 0.18 * Math.max(0, Math.sin(z.t * Math.PI * 1.1)) ** 6;   // ein Schlag, etwa alle 1,8 s
    const band = (y0, amp, phase, neigung, farbe, n, deck, lauf) => {
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        let d = "";
        for (let k = 0; k <= 24; k++) {
          const x = 60 + k / 24 * (W - 120), u = k / 24;
          const ph = phase + z.t * lauf;
          const welle = Math.sin(u * Math.PI * 2 * 1.3 + ph + t * 0.9) * amp * takt * (0.5 + t) + Math.sin(u * Math.PI * 7 + ph * 3 + t * 5) * 14 * t;
          const y = y0 + (u - 0.5) * neigung + welle + t * 160 + z.rauschen[r++ % z.rauschen.length];
          d += (k ? "L" : "M") + f(x) + " " + f(Math.max(40, Math.min(W - 40, y)));
        }
        s.push(`<path d="${d}" fill="none" stroke="${farbe}" stroke-width="1.3" stroke-opacity="${deck}"/>`);
      }
    };
    band(300, 90, 0.4, 260, c.tinte, 48, 0.8, 0.5);
    band(520, 70, 2.1, -380, c.tinte, 48, 0.8, -0.35);
    band(640, 110, 4.0, 180, c.faden, 40, 0.95, 0.7);
    return s.join("");
  },
};

/* ---------- The Fictory: ein Bild in Teilen – das Raster zerfällt, hinterlässt Spuren und Fäden, und findet zurück ---------- */
const fictory = {
  alt: "The Fictory, gezeichnet: ein Raster von Kacheln, jede aus ihrer Herkunft gewandert und gedreht, mit Spuren und Fäden",
  neu() {
    const z = zufall(5), kacheln = [], spalten = 6, zeilen = 6, k = 118, luecke = 14;
    const breite = spalten * k + (spalten - 1) * luecke, x0 = (W - breite) / 2, y0 = (W - (zeilen * k + (zeilen - 1) * luecke)) / 2;
    for (let r = 0; r < zeilen; r++) for (let q = 0; q < spalten; q++) {
      const x = x0 + q * (k + luecke), y = y0 + r * (k + luecke), cx = x + k / 2, cy = y + k / 2, weit = Math.hypot(cx - M, cy - M) / 420;
      kacheln.push({ x, y, cx, cy, dx: (cx - M) * 0.22 * weit + (z() - 0.5) * 60, dy: (cy - M) * 0.22 * weit + (z() - 0.5) * 60, dreh: (z() - 0.5) * 36 * (0.4 + weit) });
    }
    const faeden = [];
    for (let i = 0; i < 9; i++) { const a = Math.floor(z() * kacheln.length), b = Math.floor(z() * kacheln.length); if (a !== b) faeden.push([a, b]); }
    return { t: 3, k, kacheln, faeden };   // Ruhe: zerfallen (t = 3 liegt im Halten nach dem Zerfall)
  },
  schritt(z, dt) { z.t += dt; },
  svg(z, c) {
    // Lauf (9 s): 0–1 s Raster, 1–3 s zerfallen, 3–5,5 s halten (Fäden), 5,5–7,5 s zurück, 7,5–9 s Raster
    const u = z.t % 9;
    const p = u < 1 ? 0 : u < 3 ? weich((u - 1) / 2) : u < 5.5 ? 1 : u < 7.5 ? 1 - weich((u - 5.5) / 2) : 0;
    const fd = u < 3 ? 0 : u < 3.6 ? (u - 3) / 0.6 : u < 5.5 ? 1 : u < 6 ? 1 - (u - 5.5) / 0.5 : 0;   // Fäden
    const s = [], k = z.k;
    for (const t of z.kacheln) s.push(`<rect x="${t.x}" y="${t.y}" width="${k}" height="${k}" fill="none" stroke="${c.linie}" stroke-width="2" stroke-dasharray="6 7" opacity="${f(p)}"/>`);
    for (const [a, b] of z.faeden) { const A = z.kacheln[a], B = z.kacheln[b]; s.push(`<path d="M${f(A.cx + A.dx * p)} ${f(A.cy + A.dy * p)}L${f(B.cx + B.dx * p)} ${f(B.cy + B.dy * p)}" stroke="${c.grau}" stroke-width="1.6" opacity="${f(fd)}"/>`); }
    z.kacheln.forEach((t, i) => {
      const fuell = i === 15 ? c.faden : [8, 22, 27].includes(i) ? c.fadenHell : c.papier;
      s.push(`<rect x="${t.x}" y="${t.y}" width="${k}" height="${k}" fill="${fuell}" stroke="${c.tinte}" stroke-width="2.6" transform="translate(${f(t.dx * p)} ${f(t.dy * p)}) rotate(${f(t.dreh * p)} ${t.cx} ${t.cy})"/>`);
    });
    return s.join("");
  },
};

export const TAFELN = { orna, orma, "omna-color": omnaColor, "phorma-i": phormaI, "phorma-ii": phormaII, "phorma-iii": phormaIII, "the-fictory": fictory };

/** die ganze SVG-Datei des Ruhebilds */
export function svg(slug, dunkel) {
  const c = farben(dunkel), t = TAFELN[slug];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="${W}" height="${W}"><rect width="${W}" height="${W}" fill="${c.papier}"/>${t.svg(t.neu(), c)}</svg>`;
}
