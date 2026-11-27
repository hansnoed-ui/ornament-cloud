// Fläche: ein Flächenmuster wie auf Fliesen und Wandverkleidungen, auf einen Torus gelegt. Es gleitet von Quadrat über Raute zum Sechseck
// und zurück und wandert dabei über die Fläche (in jeder Richtung um ganze Perioden). Die Kamera fährt einmal dicht um den Ring, im
// Streiflicht, das die Erhebungen zeichnet.
import { T, TAU, welle, mix, kreisGewichte } from './werkzeug.js';
import { flaeche } from '/alpha/formen/gemeinsam.js?v=1';

const MU = 24, NU = 6, R = 0.62, RR = 0.26, AMP = 0.04, NX = 720, NY = 220;

export function baue({ szene, kamera }) {
  const geo = flaeche(NX, NY, true, true, (u, v, out) => out.set(0, 0, 0));
  const pos = geo.attributes.position, farbe = new Float32Array(NX * NY * 3);
  geo.setAttribute('color', new T.BufferAttribute(farbe, 3));
  const mesh = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, metalness: 0.6, roughness: 0.32 }));
  szene.add(mesh);
  const tief = new T.Color(0x2e2416), mittel = new T.Color(0x9a7639), hell = new T.Color(0xf1e2b8), c = new T.Color();

  function stelle(p) {
    const [wq, wr, ws] = kreisGewichte(p, 3, 3), schieb = TAU * p, arr = pos.array;
    for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
      const U = TAU * i / NX, V = TAU * j / NY, a = MU * U + schieb, b = NU * V - 2 * schieb;
      const f = wq * Math.cos(a) * Math.cos(b) + wr * Math.cos(a + b) * Math.cos(a - b) + ws * ((Math.cos(a) + Math.cos(b) + Math.cos(a + b)) / 1.5 - 0.33);
      const d = AMP * Math.sign(f) * Math.pow(Math.abs(f), 0.7), rr = RR + d, k = (i * NY + j) * 3;
      arr[k] = (R + rr * Math.cos(V)) * Math.cos(U); arr[k + 1] = rr * Math.sin(V); arr[k + 2] = (R + rr * Math.cos(V)) * Math.sin(U);
      const h = Math.min(1, Math.max(0, 0.5 + 0.6 * f));
      if (h < 0.5) c.lerpColors(tief, mittel, h * 2); else c.lerpColors(mittel, hell, h * 2 - 1);
      farbe[k] = c.r; farbe[k + 1] = c.g; farbe[k + 2] = c.b;
    }
    pos.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();
    // Fahrt um den Ring: aussen, leicht erhöht, der Blick streift die Fläche
    const w = -TAU * p, ab = mix(1.55, 1.2, welle(p, 0.15)), h = mix(0.75, 0.45, welle(2 * p));
    kamera.position.set(ab * Math.cos(w), h, ab * Math.sin(w));
    const vor = w - 0.75;
    kamera.up.set(0, 1, 0);
    kamera.lookAt(R * Math.cos(vor), -0.05, R * Math.sin(vor));
  }
  return { stelle };
}
