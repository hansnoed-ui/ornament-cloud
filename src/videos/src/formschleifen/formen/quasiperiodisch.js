// Quasiperiodisch: eine runde Platte wie ein Medaillon oder ein Girih-Feld. Das Relief wächst aus der Mitte über die glatte Platte. Es entsteht aus Wellen aus n Richtungen; es gleitet
// von 5 über 7 und 8 zu 12 Richtungen und zurück, und die Wellen wandern dabei gegeneinander (jede um ganze Perioden je Schleife), so dass
// das Muster geordnet bleibt, sich aber nie genau wiederholt. Die Kamera kreist einmal und hebt sich vom Streiflicht zur Aufsicht.
import { T, TAU, welle, sanft, mix, stelleKamera, kreisGewichte } from './werkzeug.js';
import { flaeche } from '/alpha/formen/gemeinsam.js?v=1';

const NS = [5, 7, 8, 12], F = 26, AMP = 0.05, NR = 240, NW = 900;

export function baue({ szene, kamera, mat }) {
  const geo = flaeche(NR, NW, false, true, () => new T.Vector3());
  const pos = geo.attributes.position, farbe = new Float32Array(pos.count * 3);
  geo.setAttribute('color', new T.BufferAttribute(farbe, 3));
  const halter = new T.Group(); szene.add(halter);
  halter.add(new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, metalness: 0.75, roughness: 0.3, side: T.DoubleSide })));
  const rand = new T.Mesh(new T.TorusGeometry(1.01, 0.025, 12, 240), mat.perle); halter.add(rand);
  halter.rotation.x = -Math.PI / 2;
  const richt = NS.map(n => Array.from({ length: n }, (_, k) => [Math.cos(Math.PI * k / n), Math.sin(Math.PI * k / n), k % 2 ? 1 : -1]));
  const tief = new T.Color(0x2e2416), mittel = new T.Color(0x9a7639), hell = new T.Color(0xf1e2b8), c = new T.Color(), ziel = new T.Vector3();

  function stelle(p) {
    const w = kreisGewichte(p, NS.length, 4), arr = pos.array, cv = NW;
    // das Muster wächst Ring um Ring aus der Mitte (p 0–0,4) und zieht sich am Ende wieder zurück (p 0,72–1); die Platte wölbt sich
    const front = 1.25 * (p < 0.56 ? sanft(p / 0.4) : 1 - sanft((p - 0.72) / 0.28)), wolb = 0.28 * welle(p, 0.08);
    for (let i = 0; i <= NR; i++) for (let j = 0; j < NW; j++) {
      const u = i / NR, x = u * Math.cos(TAU * j / NW), y = u * Math.sin(TAU * j / NW);
      let s = 0;
      for (let m = 0; m < NS.length; m++) {
        if (w[m] < 0.002) continue;
        let t = 0; for (const [dx, dy, z] of richt[m]) t += Math.cos(F * (x * dx + y * dy) + z * TAU * p);
        s += w[m] * t / NS[m];
      }
      const k = (i * cv + j) * 3, h = s * 2 * (1 - Math.pow(u, 10)) * sanft((front - u) / 0.18);
      arr[k] = x; arr[k + 1] = y; arr[k + 2] = AMP * h - wolb * u * u;
      const q = Math.min(1, Math.max(0, 0.5 + 0.55 * h));
      if (q < 0.5) c.lerpColors(tief, mittel, q * 2); else c.lerpColors(mittel, hell, q * 2 - 1);
      farbe[k] = c.r; farbe[k + 1] = c.g; farbe[k + 2] = c.b;
    }
    pos.needsUpdate = true; geo.attributes.color.needsUpdate = true; geo.computeVertexNormals();
    halter.rotation.z = TAU * p;
    rand.position.z = -wolb;
    stelleKamera(kamera, ziel, mix(3.6, 4.3, welle(p, 0.15)), mix(0.45, 1.2, welle(p)), -0.7 * Math.sin(TAU * p));
  }
  return { stelle };
}
