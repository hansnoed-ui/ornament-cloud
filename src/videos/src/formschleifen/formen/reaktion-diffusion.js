// Reaktion–Diffusion: zwei Stoffe nach Gray-Scott auf einem Torus. Aus wenigen Keimen wächst ein Muster über die glatte Fläche, wandert
// durch die Musterarten, die die Natur dem Ornament vorgemacht hat (Flecken wie im Fell, Würmer, Labyrinth), und löst sich am Ende auf:
// Der Zerfall (grosses k) lässt den zweiten Stoff verschwinden, die Fläche wird wieder glatt und dunkel wie am Anfang.
// Die Rechnung läuft der Reihe nach Bild für Bild (90 Schritte je Bild); Relief und Farbe sind mit einer Hülle gewichtet, die bei p = 0
// und p = 1 null ist, darum schliesst die Schleife.
import { T, TAU, welle, sanft, mix, stelleKamera } from './werkzeug.js';
import { rngFrom, flaeche } from '/alpha/formen/gemeinsam.js?v=1';

const W = 512, H = 192, N = W * H, SCHRITTE = 90, R0 = 0.62, RR = 0.3, AMP = 0.028;
// Wegpunkte im Raum der Parameter (p, F, k)
const WEG = [[0, 0.0367, 0.0649], [0.3, 0.0367, 0.0649], [0.45, 0.046, 0.063], [0.6, 0.029, 0.057], [0.82, 0.029, 0.057], [0.9, 0.03, 0.075], [1, 0.03, 0.075]];

export function baue({ szene, kamera }) {
  const r = rngFrom(3388);
  let A = new Float32Array(N).fill(1), B = new Float32Array(N), A2 = new Float32Array(N), B2 = new Float32Array(N);
  for (let s = 0; s < 60; s++) {
    const cx = Math.floor(r() * W), cy = Math.floor(r() * H);
    for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) B[((cy + dy + H) % H) * W + (cx + dx + W) % W] = 1;
  }
  const geo = flaeche(W, H, true, true, (u, v, out) => out.set(0, 0, 0));
  const pos = geo.attributes.position, farbe = new Float32Array(N * 3);
  geo.setAttribute('color', new T.BufferAttribute(farbe, 3));
  const stoff = new T.MeshStandardMaterial({ vertexColors: true, metalness: 0.88, roughness: 0.3 });
  const mesh = new T.Mesh(geo, stoff);
  const halter = new T.Group(); halter.add(mesh); szene.add(halter);
  const dunkel = new T.Color(0x3a2a12), hell = new T.Color(0xead39d), mittel = new T.Color(0xb98d47), c = new T.Color(), ziel = new T.Vector3();

  let F = WEG[0][1], K = WEG[0][2];
  function rechne(n) {
    for (let s = 0; s < n; s++) {
      for (let y = 0; y < H; y++) {
        const ym = ((y - 1 + H) % H) * W, y0 = y * W, yp = ((y + 1) % H) * W;
        for (let x = 0; x < W; x++) {
          const xm = (x - 1 + W) % W, xp = (x + 1) % W, i = y0 + x;
          const a = A[i], b = B[i];
          const la = 0.2 * (A[y0 + xm] + A[y0 + xp] + A[ym + x] + A[yp + x]) + 0.05 * (A[ym + xm] + A[ym + xp] + A[yp + xm] + A[yp + xp]) - a;
          const lb = 0.2 * (B[y0 + xm] + B[y0 + xp] + B[ym + x] + B[yp + x]) + 0.05 * (B[ym + xm] + B[ym + xp] + B[yp + xm] + B[yp + xp]) - b;
          const re = a * b * b;
          A2[i] = Math.min(1, Math.max(0, a + la - re + F * (1 - a)));
          B2[i] = Math.min(1, Math.max(0, b + 0.5 * lb + re - (K + F) * b));
        }
      }
      let t = A; A = A2; A2 = t; t = B; B = B2; B2 = t;
    }
  }
  function parameter(p) {
    for (let i = 1; i < WEG.length; i++) if (p <= WEG[i][0]) {
      const [p0, f0, k0] = WEG[i - 1], [p1, f1, k1] = WEG[i], t = sanft((p - p0) / (p1 - p0));
      F = mix(f0, f1, t); K = mix(k0, k1, t); return;
    }
  }
  let bildNr = -1;
  function stelle(p, n) {
    while (bildNr < n && n < 900) { bildNr++; parameter(bildNr / 900); rechne(SCHRITTE); }
    const huelle = sanft(p / 0.06) * (1 - sanft((p - 0.92) / 0.075));
    const rr = RR * (1 + 0.12 * Math.sin(TAU * p)), arr = pos.array;
    for (let i = 0; i < W; i++) for (let j = 0; j < H; j++) {
      const U = TAU * i / W, V = TAU * j / H, k = (i * H + j) * 3, b = huelle * Math.min(1, B[j * W + i] * 2.4);
      const d = rr + AMP * b, ring = R0 + d * Math.cos(V);
      arr[k] = ring * Math.cos(U); arr[k + 1] = d * Math.sin(V); arr[k + 2] = ring * Math.sin(U);
      if (b < 0.5) c.lerpColors(dunkel, mittel, b * 2); else c.lerpColors(mittel, hell, b * 2 - 1);
      farbe[k] = c.r; farbe[k + 1] = c.g; farbe[k + 2] = c.b;
    }
    pos.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();
    halter.rotation.y = TAU * p;
    halter.rotation.x = 0.25 * Math.sin(TAU * p);
    stelleKamera(kamera, ziel, mix(4.5, 3.7, welle(p, 0.1)), mix(0.8, 0.4, welle(p)), 0);
  }
  return { stelle };
}
