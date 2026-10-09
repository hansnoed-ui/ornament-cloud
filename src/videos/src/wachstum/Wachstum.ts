// Linienwachstum (differential line growth) für das Video «wachstum»: Nachbau des Processing-Sketches mit
// Punkten, die sich abstossen (minNodeDist), einer Feder zum nächsten Punkt, Teilung langer Kanten und einer Grenze,
// die die Punkte nach innen drückt. Alles ist deterministisch (fester Startwert), damit jedes Bild reproduzierbar ist.
//
// Gegenüber dem Sketch zwei Änderungen, ohne die er nicht wächst: Mit maxEdgeLength = 12 wird nie geteilt (der Abstand
// stellt sich bei 0,6 · minNodeDist = 9 ein), und unter 9 teilt jede Teilung die nächste aus (über 12 000 Punkte in
// 150 Schritten). Deshalb liegt maxEdge unter 9, und pro Schritt werden nur so viele Kanten geteilt, wie das Ziel des
// Rings verlangt (zufällig unter den zu langen Kanten).

export const BILD = 1080;

export type Knoten = { x: number; y: number; vx: number; vy: number; ax: number; ay: number };

/** Ein Keim: ein kleiner Ring, der ab Schritt `start` über `dauer` Schritte auf `ziel` Punkte wächst */
export type Ring = {
  x: number; y: number; r: number;
  n?: number;
  start: number; dauer: number; ziel: number;
  farbe: string;
};

export type Param = {
  minDist: number;   // Radius der Abstossung
  rep: number;       // Stärke der Abstossung
  att: number;       // Stärke der Feder zum Nachbarn
  bnd: number;       // Stärke der Grenze
  maxEdge: number;   // Kanten über dieser Länge dürfen sich teilen
  vmax: number;      // Höchstgeschwindigkeit
  reib: number;      // Reibung je Schritt
  rand: number;      // Abstand, den die Linie zur Grenze hält
  seed: number;
};

/** Abstand zur Grenze: innen positiv, ausserhalb negativ; schritt für eine atmende Grenze */
export type Form = (x: number, y: number, schritt: number) => number;

type Lebend = { ring: Ring; knoten: Knoten[]; gesaet: boolean; acc: number; n0: number };

const zufall = (seed: number) => {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export class Wachstum {
  schritt = 0;
  ringe: Lebend[] = [];
  private rnd = zufall(0);
  private alle: Knoten[] = [];
  private kopf = new Int32Array(0);
  private folge = new Int32Array(0);

  constructor(private p: Param, private form: Form, private vorgabe: Ring[]) {
    this.reset();
  }

  reset() {
    this.schritt = 0;
    this.rnd = zufall(this.p.seed);
    this.ringe = this.vorgabe.map((ring) => ({ ring, knoten: [], gesaet: false, acc: 0, n0: 0 }));
  }

  /** bis zu diesem Schritt rechnen (rückwärts: von vorn beginnen) */
  bringe(auf: number) {
    if (auf < this.schritt) this.reset();
    while (this.schritt < auf) this.step();
  }

  private saee(l: Lebend) {
    const { ring } = l;
    const gleich = (this.p.minDist * this.p.rep) / (this.p.rep + this.p.att);   // Abstand, bei dem sich Abstossung und Feder die Waage halten
    const n = ring.n ?? Math.max(6, Math.round((2 * Math.PI * ring.r) / gleich));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      l.knoten.push({ x: ring.x + Math.cos(a) * ring.r, y: ring.y + Math.sin(a) * ring.r, vx: 0, vy: 0, ax: 0, ay: 0 });
    }
    l.n0 = n;
    l.gesaet = true;
  }

  step() {
    const { minDist, rep, att, bnd, maxEdge, vmax, reib, rand } = this.p;
    this.schritt++;
    for (const l of this.ringe) if (!l.gesaet && this.schritt > l.ring.start) this.saee(l);

    const alle = this.alle;
    alle.length = 0;
    for (const l of this.ringe) for (const k of l.knoten) { k.ax = 0; k.ay = 0; alle.push(k); }
    const n = alle.length;

    // 1. Abstossung: Raster mit Zellen der Grösse minDist, nur Nachbarzellen prüfen
    const gw = Math.ceil(BILD / minDist) + 3;
    const zellen = gw * gw;
    if (this.kopf.length !== zellen) this.kopf = new Int32Array(zellen);
    if (this.folge.length < n) this.folge = new Int32Array(n * 2);
    const kopf = this.kopf, folge = this.folge;
    kopf.fill(-1);
    const zelle = (v: number) => Math.min(gw - 1, Math.max(0, Math.floor(v / minDist) + 1));
    for (let i = 0; i < n; i++) {
      const c = zelle(alle[i].y) * gw + zelle(alle[i].x);
      folge[i] = kopf[c];
      kopf[c] = i;
    }
    for (let i = 0; i < n; i++) {
      const a = alle[i];
      const cx = zelle(a.x), cy = zelle(a.y);
      for (let dy = -1; dy <= 1; dy++) {
        const yy = cy + dy;
        if (yy < 0 || yy >= gw) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = cx + dx;
          if (xx < 0 || xx >= gw) continue;
          for (let j = kopf[yy * gw + xx]; j >= 0; j = folge[j]) {
            if (j <= i) continue;
            const b = alle[j];
            let ex = b.x - a.x, ey = b.y - a.y;
            const d = Math.hypot(ex, ey);
            if (d < minDist && d > 0.001) {
              ex /= d; ey /= d;
              const f = (minDist - d) * rep;
              b.ax += ex * f; b.ay += ey * f;
              a.ax -= ex * f; a.ay -= ey * f;
            }
          }
        }
      }
    }

    // 2. Feder zum nächsten Punkt der eigenen Linie
    for (const l of this.ringe) {
      const m = l.knoten.length;
      for (let i = 0; i < m; i++) {
        const c = l.knoten[i], nx = l.knoten[(i + 1) % m];
        const fx = (nx.x - c.x) * att, fy = (nx.y - c.y) * att;
        c.ax += fx; c.ay += fy;
        nx.ax -= fx; nx.ay -= fy;
      }
    }

    // 3. Grenze: wer ihr näher als `rand` kommt, wird nach innen gedrückt
    const e = 0.7;
    for (const k of alle) {
      const s = this.form(k.x, k.y, this.schritt);
      if (s < rand) {
        const gx = this.form(k.x + e, k.y, this.schritt) - this.form(k.x - e, k.y, this.schritt);
        const gy = this.form(k.x, k.y + e, this.schritt) - this.form(k.x, k.y - e, this.schritt);
        const gl = Math.hypot(gx, gy) || 1;
        const tiefe = (rand - s) * bnd;
        k.ax += (gx / gl) * tiefe; k.ay += (gy / gl) * tiefe;
      }
    }

    // Bewegung
    for (const k of alle) {
      k.vx += k.ax; k.vy += k.ay;
      const v = Math.hypot(k.vx, k.vy);
      if (v > vmax) { k.vx *= vmax / v; k.vy *= vmax / v; }
      k.x += k.vx; k.y += k.vy;
      k.vx *= reib; k.vy *= reib;
    }

    // 4. Wachstum: zu lange Kanten teilen sich, aber nur so schnell, wie das Ziel des Rings es verlangt
    for (const l of this.ringe) {
      const { ring } = l;
      const m = l.knoten.length;
      if (!l.gesaet || this.schritt - ring.start > ring.dauer || m >= ring.ziel) continue;
      l.acc += (ring.ziel - l.n0) / ring.dauer;
      const lang: number[] = [];
      for (let i = 0; i < m; i++) {
        const c = l.knoten[i], nx = l.knoten[(i + 1) % m];
        if (Math.hypot(c.x - nx.x, c.y - nx.y) > maxEdge) lang.push(i);
      }
      const wahl: number[] = [];
      while (l.acc >= 1 && lang.length) {
        l.acc--;
        wahl.push(lang.splice(Math.floor(this.rnd() * lang.length), 1)[0]);
      }
      wahl.sort((a, b) => b - a);
      for (const i of wahl) {
        const c = l.knoten[i], nx = l.knoten[(i + 1) % l.knoten.length];
        l.knoten.splice(i + 1, 0, { x: (c.x + nx.x) / 2, y: (c.y + nx.y) / 2, vx: 0, vy: 0, ax: 0, ay: 0 });
      }
    }
  }
}

/** Geschlossener, weich durchgezogener Pfad durch die Punkte (quadratische Kurven über die Mitten der Kanten) */
export const pfad = (knoten: Knoten[]): string => {
  const m = knoten.length;
  if (m < 3) return "";
  const f = (v: number) => v.toFixed(1);
  const a = knoten[m - 1], b = knoten[0];
  const teile = [`M${f((a.x + b.x) / 2)},${f((a.y + b.y) / 2)}`];
  for (let i = 0; i < m; i++) {
    const c = knoten[i], nx = knoten[(i + 1) % m];
    teile.push(`Q${f(c.x)},${f(c.y)} ${f((c.x + nx.x) / 2)},${f((c.y + nx.y) / 2)}`);
  }
  return teile.join("");
};

/** Fläche (px²) innerhalb der Grenze, mit Rand abgezogen (Raster 4 px) */
export const flaecheInnen = (form: Form, rand: number, schritt = 0): number => {
  let z = 0;
  for (let y = 0; y < BILD; y += 4) for (let x = 0; x < BILD; x += 4) if (form(x, y, schritt) > rand) z++;
  return z * 16;
};
