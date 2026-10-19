// PHORMA III – der Plan der Traube (ohne DOM und three.js, auch in Node für die Tests): wo jede Perle steht, wie gross sie ist, welche Einstellung
// die Kamera hat und wie die Schlaufe des Signets als Perlenschnur liegt. Gezeichnet wird in traube.js.
//   Perlen: in Ketten zu M; eine Kette ist entweder eine Schnur (die Perlen folgen einem Kopf auf seinem Weg, je weiter hinten, desto kleiner – wie
//   ein Wurm aus Beeren) oder eine Traube (ein Büschel um einen Mittelpunkt). Der Weg hängt nur von s ab, der Zeit der Musik: zwischen den
//   Schlägen steht er fast, beim Schlag macht er einen Satz. Je Zustand eine Art (Kugel, Nah, Säule, Schwarm) und ein eigener Wurf.
//   Welt: die Bildebene z = 0 füllt das Bild (Höhe 2, Breite 2 · B / H) wie im Gewebe und in der Irrfahrt; die Traube liegt um den Ursprung.
import { zufallsfolge } from "./irrweg.js?v=16";

export const ARTEN = ["kugel", "nah", "saeule", "schwarm"];
/** wiederholbarer Zufall aus zwei Zahlen (0..1) */
export const h1 = (a, b) => { const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return x - Math.floor(x); };
const TAU = Math.PI * 2;

/** die festen Zufallszahlen je Perle (8 je Perle) und ihre Ketten zu M */
export function traubenBau(n, M = 14) {
  const r = zufallsfolge(4711), z = new Float32Array(n * 8);
  for (let i = 0; i < z.length; i++) z[i] = r();
  return { n, M, z, ketten: Math.ceil(n / M) };
}

/**
 * Die Art des Zustands nr (0: die Kugel): je acht Zustände die Säule nur einmal – halb so oft wie vorher (Wunsch vom 19. Oktober 2026: «den
 * Strang find ich auch gut: aber nicht zu oft bringen … bitte nur halb so viel») –, die Kugel dreimal, Nah und Schwarm je zweimal; in gewürfelter
 * Folge, nie zweimal dieselbe hintereinander.
 */
export const FOLGE = ["kugel", "kugel", "kugel", "nah", "nah", "schwarm", "schwarm", "saeule"];
const bloecke = [];
function block(b) {
  while (bloecke.length <= b) {
    const k = bloecke.length, davor = k ? bloecke[k - 1].at(-1) : "kugel";
    for (let versuch = 0; ; versuch++) {
      const a = [...FOLGE];
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(h1(k + 1, i + 40 + versuch * 13) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      if (a.every((x, i) => x !== (i ? a[i - 1] : davor))) { bloecke.push(a); break; }
    }
  }
  return bloecke[b];
}
export function artBei(nr) {
  if (nr <= 0) return "kugel";
  return block(Math.floor((nr - 1) / FOLGE.length))[(nr - 1) % FOLGE.length];
}

/** gleichmässig auf der Kugel (u, v ∈ 0..1) */
const richtung = (u, v) => { const z = 2 * u - 1, r = Math.sqrt(Math.max(0, 1 - z * z)), w = v * TAU; return [r * Math.cos(w), z, r * Math.sin(w)]; };

/** der Mittelpunkt der Kette c im Zustand mit dem Wurf saat und der Art art (auch das Ziel der Kamera in der Nähe) */
export function kettenBasis(c, saat, art) {
  const k = (q) => h1(c + 1, q + saat * 17.31);
  if (art === "schwarm") { const d = richtung(k(1), k(2)), r = 1.5 * Math.cbrt(k(3)); return [d[0] * r, d[1] * r * 0.7, d[2] * r]; }
  if (art === "saeule") return [0, -1.1 + 2.2 * k(4), 0];
  // gut die Hälfte hängt als eine grosse Traube unten in der Kugel (wie im Vorbild), die übrigen verteilt
  const d = richtung(k(1), k(2));
  if (k(13) < 0.55) { const r = 0.36 * Math.cbrt(k(3)); return [0.12 + d[0] * r, -0.26 + d[1] * r * 0.9, 0.08 + d[2] * r]; }
  const r = 0.62 * Math.cbrt(k(3));
  return [d[0] * r, d[1] * r * 0.85 - 0.05, d[2] * r];
}

/**
 * Die Perlen zur Zeit s (Zeit der Musik) im Zustand { art, saat }: schreibt x, y, z, r und die Art (0 Perle, 1 Funke) je Perle in aus
 * (Float32Array n · 5). opt: knall (der Bass sprengt die Traube auseinander), puls (die Perlen schwellen beim Schlag), laut.
 */
export function perlenLegen(bau, { art, saat }, s, aus, { knall = 0, puls = 0, laut = 0 } = {}) {
  const { n, M, z } = bau;
  for (let i = 0; i < n; i++) {
    const c = Math.floor(i / M), j = i % M, zi = i * 8, k = (q) => h1(c + 1, q + saat * 17.31);
    const b = kettenBasis(c, saat, art), funke = z[zi + 7] < 0.07, traube = !funke && art !== "saeule" && k(0) < 0.42;
    let x, y, zz, r;
    if (funke) {
      // Funken: winzige helle Punkte in einem weiten Raum, langsam treibend
      const d = richtung(z[zi], z[zi + 1]), w = (art === "schwarm" ? 1.8 : 1.15) * Math.cbrt(z[zi + 2]);
      x = d[0] * w + 0.05 * Math.sin(s * 0.7 + z[zi + 3] * TAU); y = d[1] * w + 0.06 * s * (z[zi + 4] - 0.3); zz = d[2] * w;
      y = ((y + 1.4) % 2.8 + 2.8) % 2.8 - 1.4;
      r = 0.0025 + 0.004 * z[zi + 5];
    } else if (traube) {
      // ein Büschel: innen grosse, aussen kleine Beeren, das Ganze schwankt
      const R = 0.04 + 0.07 * k(4), d = richtung(z[zi], z[zi + 1]), e = Math.cbrt(z[zi + 2]);
      const sw = 0.04 + 0.05 * k(5), w = s * (0.4 + 0.5 * k(6));
      x = b[0] + d[0] * R * e + sw * Math.sin(w + k(7) * TAU); y = b[1] + d[1] * R * e + sw * Math.sin(w * 1.3 + k(8) * TAU); zz = b[2] + d[2] * R * e + sw * Math.sin(w * 0.8 + k(9) * TAU);
      r = (0.007 + 0.017 * z[zi + 3]) * (1.15 - 0.55 * e) * (0.7 + 0.6 * k(10));
    } else if (art === "saeule") {
      // die Säule: Schnüre steigen in Schrauben auf und treten oben wieder unten ein
      const v = 0.22 + 0.3 * k(3), rc = 0.012 + 0.02 * k(12), dl = (1.7 * rc) / (v * 1.6), sg = s - j * dl;
      const yy = (((sg * v + k(4) * 2.4) % 2.4) + 2.4) % 2.4 - 1.2, rho = (0.03 + 0.2 * k(2) ** 1.5) * (0.55 + 1.1 * yy * yy), th = k(1) * TAU + sg * (1.1 + k(5));
      x = rho * Math.cos(th); y = yy; zz = rho * Math.sin(th);
      r = rc * (1 - 0.5 * j / M) * (0.85 + 0.3 * z[zi + 3]) * Math.min(1, Math.max(0, (1.2 - Math.abs(yy)) / 0.25));
    } else {
      // eine Schnur: die Perle j zeigt den Kopf der Kette zur Zeit s − j · dl
      const A = (art === "schwarm" ? 0.28 : 0.12) + 0.2 * k(5), wx = 0.5 + 1.1 * k(6), wy = 0.5 + 1.1 * k(7), wz = 0.5 + 1.1 * k(8);
      const rc = (art === "schwarm" ? 0.026 : 0.012) + (art === "schwarm" ? 0.03 : 0.022) * k(12), v = A * ((wx + wy + wz) / 3) * 0.64, dl = (1.55 * rc) / v, sg = s - j * dl;
      x = b[0] + A * Math.sin(wx * sg + k(9) * TAU); y = b[1] + A * Math.sin(wy * sg + k(10) * TAU); zz = b[2] + A * Math.sin(wz * sg + k(11) * TAU);
      r = rc * (1 - 0.6 * j / M) * (0.85 + 0.3 * z[zi + 3]);
    }
    // nicht alle Ketten in jeder Art: nah nur gut ein Drittel und die, auf der die Schärfe liegt (sonst eine Wand aus Flecken), sonst die meisten
    if (!funke && k(14) >= (art === "nah" ? 0.36 : art === "kugel" ? 0.8 : art === "schwarm" ? 0.7 : 1) && !(art === "nah" && c === nahKette(saat))) r = 0;
    // in der Kugel (Kugel und Nah): weich an den Rand der Fäden gedrückt
    if (art === "kugel" || art === "nah") { const L = Math.hypot(x, y, zz), G = 0.78, f = L > 1e-6 ? (G * Math.tanh(L / G)) / L : 1; x *= f; y *= f; zz *= f; }
    // der Bass sprengt sie auseinander, der Schlag lässt sie schwellen
    const kn = 1 + knall * (0.25 + 0.75 * z[zi + 5]);
    aus[i * 5] = x * kn; aus[i * 5 + 1] = y * kn; aus[i * 5 + 2] = zz * kn;
    aus[i * 5 + 3] = r * (0.88 + 0.24 * laut) * (1 + puls * (0.2 + 0.5 * z[zi + 4]));
    aus[i * 5 + 4] = funke ? 1 : 0;
  }
  return aus;
}

/** die Kette, auf die die Kamera in der Nähe schaut */
export const nahKette = (saat) => Math.floor(h1(saat + 3, 1) * 40);

/**
 * Die Einstellung der Kamera im Zustand { art, saat } seit seinem Beginn (Sekunden): { pos, ziel, fokus (Abstand der Schärfe), apertur }.
 * Die Unschärfe einer Perle im Abstand d ist apertur · |d − fokus| / fokus (in Welteinheiten bei ihr).
 */
export function einstellung({ art, saat }, seit) {
  const k = (q) => h1(saat + 3, q);
  const um = (w, h, D, m = [0, 0, 0]) => [m[0] + D * Math.sin(w) * Math.cos(h), m[1] + D * Math.sin(h), m[2] + D * Math.cos(w) * Math.cos(h)];
  const ab = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
  if (art === "nah") {
    // nah an einer Kette, die Schärfe zieht in zwei Sekunden von vorn auf sie (Schärfenzug wie im Vorbild)
    // von aussen auf eine Kette am Rand der Traube (mitten in ihr war es eine Wand aus Flecken): die Kamera steht weiter draussen in derselben Richtung
    const ziel = kettenBasis(nahKette(saat), saat, "kugel"), l = Math.hypot(...ziel) || 1, aus = ziel.map((q) => q / l);
    const D = 0.7 + 0.3 * k(4) - 0.03 * seit, w = Math.atan2(aus[0], aus[2]) + (k(2) - 0.5) * 1.1 + seit * 0.05 * (k(3) - 0.5), hh = Math.asin(Math.max(-1, Math.min(1, aus[1]))) * 0.6 + (k(5) - 0.5) * 0.5;
    const pos = um(w, hh, D, ziel), d = ab(pos, ziel), zug = Math.min(1, seit / 2.2);
    return { pos, ziel, fokus: d * (0.84 + 0.16 * zug * zug * (3 - 2 * zug)), apertur: 0.042 };
  }
  if (art === "saeule") {
    const w = k(2) * TAU + seit * 0.18, pos = um(w, -0.15 + 0.2 * k(3), 2.3 - 0.06 * seit), ziel = [0, 0.05, 0];
    return { pos, ziel, fokus: ab(pos, ziel) - 0.1, apertur: 0.03 };
  }
  if (art === "schwarm") {
    // mitten im Schwarm, langsam vorwärts: was vorbeizieht, wird zu grossen, weichen Flecken
    const d = richtung(k(1), k(2)), vor = [-d[0], -d[1] * 0.3, -d[2]], l = Math.hypot(...vor) || 1, v = vor.map((q) => q / l);
    const pos = d.map((q, i) => q * 1.2 + v[i] * seit * 0.16), ziel = pos.map((q, i) => q + v[i] + (i === 1 ? 0.1 * Math.sin(seit * 0.3) : 0));
    return { pos, ziel, fokus: 0.9 + 0.3 * k(3), apertur: 0.06 };
  }
  // die Kugel: von aussen, langsam um sie herum, wenig Unschärfe (der Rand der Fäden weich)
  // meist ganz im Bild mit Rand (wie im Vorbild), manchmal näher, angeschnitten
  const D = k(5) < 0.35 ? 2.3 + 0.3 * k(6) : 3.25 + 0.45 * k(6);
  const w = k(2) * TAU + seit * 0.1 * (k(3) < 0.5 ? 1 : -1), pos = um(w, (k(4) - 0.5) * 0.7, D - 0.05 * seit), ziel = [0, -0.05, 0];
  return { pos, ziel, fokus: ab(pos, ziel), apertur: 0.025 };
}

/** die Schlaufe des Signets in Welteinheiten (dieselbe Kurve wie in sketchory/signet.js, gezeichnet für 1080 × 1920, mittig auf B × H): [x, y, 0, …] */
export function schlaufeWelt(B, H, n = 720) {
  const a = B / H, pk = (t) => { const r = 0.45 + Math.cos(t); return [1.2 * r * Math.cos(t) - 0.84, 1.2 * r * Math.sin(t)]; };
  const roh = Array.from({ length: n + 1 }, (_, i) => pk((i / n) * TAU)), xs = roh.map((q) => q[0]), ys = roh.map((q) => q[1]);
  const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2, sp = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  return roh.flatMap(([x, y]) => { const px = B / 2 + (x - mx) * (420 / sp), py = 870 + (y - my) * (420 / sp) + (H - 1920) / 2; return [(px / B * 2 - 1) * a, 1 - (py / H) * 2, 0]; });
}

/**
 * Perlen auf Züge ([x, y, z, …] in Welteinheiten) aufgefädelt, gleichmässig nach der Länge, höchstens n; r: der Halbmesser (schwankt entlang der
 * Schnur wie bei Beeren), abstand: wie weit auseinander in Halbmessern. Mit beeren > 0 sitzen so viele kleinere Beeren seitlich daneben.
 * Ergebnis: Float32Array n · 4 (x, y, z, r; r = 0 für die übrigen) und die Zahl der gesetzten Perlen.
 */
export function perlenAufZuegen(zuege, n, { r = 0.012, abstand = 1.9, beeren = 0, saat = 1 } = {}) {
  const teile = [], aus = new Float32Array(n * 4);
  let ges = 0;
  for (const z of zuege) for (let i = 3; i < z.length; i += 3) {
    const l = Math.hypot(z[i] - z[i - 3], z[i + 1] - z[i - 2], z[i + 2] - z[i - 1]);
    if (l > 0) { teile.push([z[i - 3], z[i - 2], z[i - 1], z[i], z[i + 1], z[i + 2], ges, l]); ges += l; }
  }
  const haupt = Math.max(0, n - beeren);
  let m = Math.min(haupt, Math.floor(ges / (abstand * r)));
  if (!m || !teile.length) return { lage: aus, anzahl: 0 };
  const schritt = ges / m, rr = Math.min(r, schritt / abstand), rnd = zufallsfolge(saat * 131 + 7);
  const stelle = (L) => {
    let lo = 0, hi = teile.length - 1;
    while (lo < hi) { const mi = (lo + hi + 1) >> 1; if (teile[mi][6] <= L) lo = mi; else hi = mi - 1; }
    const t = teile[lo], u = Math.min(1, Math.max(0, (L - t[6]) / t[7]));
    return [t[0] + (t[3] - t[0]) * u, t[1] + (t[4] - t[1]) * u, t[2] + (t[5] - t[2]) * u, (t[3] - t[0]) / t[7], (t[4] - t[1]) / t[7]];
  };
  for (let i = 0; i < m; i++) {
    const L = (i + 0.5) * schritt, [x, y, zz] = stelle(L);
    aus.set([x, y, zz, rr * (0.78 + 0.32 * (0.5 + 0.5 * Math.sin(L * 23 + 1.3) * Math.sin(L * 7.1)))], i * 4);
  }
  // Beeren daneben, in kleinen Büscheln an einigen Stellen der Schnur
  let gesetzt = m;
  for (let b = 0; b < beeren && gesetzt < n; b++) {
    const L = ((Math.floor(rnd() * 9) + rnd() * 0.35) / 9) * ges, [x, y, zz, tx, ty] = stelle(L), seite = rnd() < 0.5 ? -1 : 1, w = rr * (1.3 + 0.9 * rnd());
    aus.set([x - ty * seite * w, y + tx * seite * w, zz + (rnd() - 0.5) * rr * 2, rr * (0.45 + 0.35 * rnd())], gesetzt * 4);
    gesetzt++;
  }
  return { lage: aus, anzahl: gesetzt };
}
