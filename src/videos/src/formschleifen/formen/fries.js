// Fries: eine kannelierte Säule mit fünf Friesbändern, wie an Kapitell, Gesims und Vase. Jedes Band gleitet durch die Motive Welle,
// Zinnen, Zickzack und Schlaufen, gegeneinander versetzt wie ein Kanon, und dreht in seinem eigenen Tempo (ganze Vielfache einer
// Teilung je Schleife). Ein zweiter Strang in Kreide flicht sich gegenläufig ein und legt sich wieder zur glatten Linie.
import { T, TAU, welle, mix, stelleKamera, kreisGewichte } from './werkzeug.js';
import { Kurve, flaeche } from '/alpha/formen/gemeinsam.js?v=1';

const RC = 0.5, H = 1.9, BAENDER = [{ k: 8, m: 1 }, { k: 12, m: -1 }, { k: 10, m: 1 }, { k: 14, m: -2 }, { k: 9, m: 1 }];

export function baue({ szene, kamera, mat }) {
  const halter = new T.Group(); szene.add(halter);
  const saeule = new T.Mesh(flaeche(240, 2, true, false, (u, v, out) => {
    const th = TAU * u, r = RC * 0.86 * (1 - 0.04 * Math.pow(Math.abs(Math.sin(12 * th)), 0.6));
    return out.set(r * Math.cos(th), (v - 0.5) * H * 1.04, r * Math.sin(th));
  }), mat.kreideB);
  halter.add(saeule);
  for (const v of [-1, 1]) {
    const deckel = new T.Mesh(new T.CircleGeometry(RC * 0.87, 96), mat.messing2);
    deckel.rotation.x = -v * Math.PI / 2; deckel.position.y = v * H * 0.52; halter.add(deckel);
  }
  const nb = BAENDER.length;
  for (let j = 0; j <= nb; j++) {
    const rand = new T.Mesh(new T.TorusGeometry(RC * 0.9, 0.016, 10, 128), mat.messing);
    rand.rotation.x = Math.PI / 2; rand.position.y = -H / 2 + j * H / nb; halter.add(rand);
  }
  const baender = BAENDER.map((x, j) => {
    const a = new T.Mesh(new T.BufferGeometry(), mat.messing), b = new T.Mesh(new T.BufferGeometry(), mat.kreide);
    halter.add(a, b); return { ...x, j, a, b, y: -H / 2 + (j + 0.5) * H / nb, bh: H / nb * 0.3 };
  });
  const ziel = new T.Vector3();

  function stelle(p) {
    for (const x of baender) {
      const [ww, wz, wzz, ws] = kreisGewichte(p + x.j * 0.2, 4, 4), zweit = welle(p, x.j * 0.13);
      const kurve = (vz) => (t, v) => {
        const th = t * TAU, s = x.k * th, a = th - ws * (1.7 / x.k) * Math.sin(s);
        const dy = ww * Math.sin(s) + wz * Math.tanh(3.5 * Math.sin(s)) / Math.tanh(3.5) + wzz * (2 / Math.PI) * Math.asin(Math.sin(s)) + ws * Math.cos(s);
        return v.set(RC * Math.cos(a), x.y + vz * dy * x.bh, RC * Math.sin(a));
      };
      x.a.geometry.dispose(); x.a.geometry = new T.TubeGeometry(new Kurve(kurve(1)), x.k * 56, 0.018, 8, true);
      x.b.geometry.dispose(); x.b.geometry = new T.TubeGeometry(new Kurve(kurve(-zweit)), x.k * 56, 0.012, 8, true);
      x.a.rotation.y = x.b.rotation.y = (TAU / x.k) * x.m * p;
    }
    saeule.rotation.y = (TAU / 12) * p;
    stelleKamera(kamera, ziel, mix(4.4, 3.9, welle(p, 0.2)), mix(-0.3, 0.5, welle(p)), 0.7 * Math.sin(TAU * p));
  }
  return { stelle };
}
