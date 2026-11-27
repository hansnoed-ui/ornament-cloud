// Punkte: Staub wie Goldgrund, Sternenmuster und Streublumen. 70 000 Punkte liegen auf einer Fläche aus der Superformel; die Fläche
// wandert durch drei Gestalten (Stern, Kissen, Blüte) und zurück. Zwischen zwei Gestalten löst sich der Staub, treibt in einem Wirbel
// auseinander und sammelt sich zur nächsten. Jeder Punkt behält seine Stelle auf der Fläche, darum fliesst die Verwandlung.
import { T, TAU, welle, mix, stelleKamera, kreisGewichte } from './werkzeug.js';
import { rngFrom } from '/alpha/formen/gemeinsam.js?v=1';

const N = 70000;
const GESTALTEN = [
  { m1: 6, m2: 4, n1: 0.55, n2: 1.0, n3: 1.0 },
  { m1: 4, m2: 2, n1: 1.3, n2: 1.4, n3: 1.4 },
  { m1: 10, m2: 6, n1: 0.42, n2: 0.7, n3: 1.5 },
];
const sf = (w, g, mm) => Math.pow(Math.pow(Math.abs(Math.cos(mm * w / 4)), g.n2) + Math.pow(Math.abs(Math.sin(mm * w / 4)), g.n3), -1 / g.n1);

export function baue({ szene, kamera }) {
  const r = rngFrom(1599);
  const orte = GESTALTEN.map(() => new Float32Array(N * 3)), treib = new Float32Array(N * 3), eigen = new Float32Array(N);
  const farbe = new Float32Array(N * 3), messing = new T.Color(0xd9b46a), hell = new T.Color(0xfff2cf), kreide = new T.Color(0xd9d3c6), c = new T.Color();
  for (let i = 0; i < N; i++) {
    const th = (r() * 2 - 1) * Math.PI, ph = Math.asin(r() * 2 - 1);
    GESTALTEN.forEach((g, k) => {
      const r1 = sf(th, g, g.m1), r2 = sf(ph, g, g.m2);
      let x = r1 * Math.cos(th) * r2 * Math.cos(ph), y = r2 * Math.sin(ph), z = r1 * Math.sin(th) * r2 * Math.cos(ph);
      orte[k][i * 3] = x; orte[k][i * 3 + 1] = y; orte[k][i * 3 + 2] = z;
    });
    const a = r() * TAU, b = Math.acos(r() * 2 - 1);
    treib[i * 3] = Math.sin(b) * Math.cos(a); treib[i * 3 + 1] = Math.cos(b); treib[i * 3 + 2] = Math.sin(b) * Math.sin(a);
    eigen[i] = r();
    const q = r(); c.copy(q < 0.12 ? hell : q < 0.3 ? kreide : messing);
    farbe[i * 3] = c.r; farbe[i * 3 + 1] = c.g; farbe[i * 3 + 2] = c.b;
  }
  // jede Gestalt auf dieselbe Grösse bringen (die äussersten 2 % bestimmen den Rand nicht)
  for (const o of orte) {
    const l = []; for (let i = 0; i < N; i += 7) l.push(Math.hypot(o[i * 3], o[i * 3 + 1], o[i * 3 + 2]));
    l.sort((a, b) => a - b); const mass = 1 / l[Math.floor(l.length * 0.98)];
    for (let i = 0; i < o.length; i++) o[i] *= mass;
  }
  const pos = new Float32Array(N * 3), geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('color', new T.BufferAttribute(farbe, 3));
  const bild = globalThis.document.createElement('canvas'); bild.width = bild.height = 64;
  const g2 = bild.getContext('2d'), gr = g2.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g2.fillStyle = gr; g2.fillRect(0, 0, 64, 64);
  const stoff = new T.PointsMaterial({ size: 0.021, sizeAttenuation: true, vertexColors: true, map: new T.CanvasTexture(bild), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0.8 });
  const punkte = new T.Points(geo, stoff); punkte.frustumCulled = false;
  const halter = new T.Group(); halter.add(punkte); halter.scale.setScalar(0.95); szene.add(halter);
  const ziel = new T.Vector3();

  function stelle(p) {
    const w = kreisGewichte(p, 3, 9), los = Math.pow(Math.sin(3 * Math.PI * p), 4);   // zwischen zwei Gestalten löst sich der Staub
    for (let i = 0; i < N; i++) {
      const k = i * 3, e = eigen[i];
      let x = w[0] * orte[0][k] + w[1] * orte[1][k] + w[2] * orte[2][k];
      let y = w[0] * orte[0][k + 1] + w[1] * orte[1][k + 1] + w[2] * orte[2][k + 1];
      let z = w[0] * orte[0][k + 2] + w[1] * orte[1][k + 2] + w[2] * orte[2][k + 2];
      const d = los * (0.03 + 0.4 * e * e), wi = los * (0.4 + 1.4 * e) * (y > 0 ? 1 : -1) * 0.6, cw = Math.cos(wi), sw = Math.sin(wi);
      const x2 = x * cw - z * sw, z2 = x * sw + z * cw; x = x2; z = z2;
      pos[k] = x + treib[k] * d; pos[k + 1] = y + treib[k + 1] * d + 0.03 * Math.sin(TAU * (2 * p + e)); pos[k + 2] = z + treib[k + 2] * d;
    }
    geo.attributes.position.needsUpdate = true;
    stoff.size = mix(0.021, 0.014, los);
    halter.rotation.y = TAU * p;
    stelleKamera(kamera, ziel, mix(4.6, 4.2, welle(p)), 0.35 + 0.25 * Math.sin(TAU * p), 0);
  }
  return { stelle };
}
