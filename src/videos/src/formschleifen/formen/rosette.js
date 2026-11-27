// Rosette: fünf Ringe um einen Punkt, achtzählig. Bei p = 0 liegen sie als glatte Kreise flach (reine Wiederholung); von innen nach aussen
// treiben Blätter, Kordeln und Wellen aus, die Ringe drehen gegeneinander, die Scheibe wölbt sich zur Schale und kippt; dann legt sich alles
// wieder zu Kreisen. Jeder Ring dreht in 30 s um ein ganzes Vielfaches von 1/8 Umdrehung, darum schliesst die Schleife.
import { T, TAU, welle, mix, kugeln } from './werkzeug.js';
import { Kurve, knopf } from '/alpha/formen/gemeinsam.js?v=1';

const S = 8;
const RINGE = [
  // k Zähligkeit, a Ausschlag in der Ebene, b Ausschlag in der Höhe, art, m Drehung in Achteln je Schleife, Perlen
  { R: 0.2, k: S, a: 0.06, b: 0.05, art: 'rose', m: 1, perlen: false },
  { R: 0.4, k: 2 * S, a: 0.035, b: 0.04, art: 'kordel', m: -1, perlen: false },
  { R: 0.6, k: S, a: 0.1, b: 0.09, art: 'rose', m: 2, perlen: true, versatz: 0.5 },
  { R: 0.8, k: 2 * S, a: 0.04, b: 0.045, art: 'welle', m: -1, perlen: false },
  { R: 1.0, k: S, a: 0.13, b: 0.14, art: 'rose', m: 1, perlen: true },
];

export function baue({ szene, kamera, mat }) {
  const halter = new T.Group(), scheibe = new T.Group();
  halter.add(scheibe); szene.add(halter); halter.scale.setScalar(0.76);
  const ringe = RINGE.map((x, i) => {
    const mesh = new T.Mesh(new T.BufferGeometry(), i % 2 ? mat.kreide : mat.messing);
    const pl = x.perlen ? kugeln(x.k, mat.perle) : null;
    if (pl) mesh.add(pl);
    scheibe.add(mesh);
    return { ...x, mesh, pl };
  });
  const mitte = knopf(0.13, 0.08, 2, 48, mat.messing); scheibe.add(mitte);
  const v = new T.Vector3();

  function stelle(p) {
    const zweite = welle(2 * p);   // zweimal je Schleife kommt eine feinere Teilung dazu
    for (const [i, x] of ringe.entries()) {
      const e = welle(p, 0.05 * i);   // aussen etwas später
      const schale = 0.4 * e * x.R * x.R;
      const ph = (x.versatz || 0) * TAU / x.k;
      const fn = (u, out) => {
        const th = u * TAU; let rr, z;
        if (x.art === 'rose') { rr = x.R + e * (x.a * Math.cos(x.k * th + ph) + 0.35 * x.a * zweite * Math.cos(2 * x.k * th)); z = e * x.b * Math.sin(x.k * th + ph); }
        else if (x.art === 'kordel') { rr = x.R + e * x.a * Math.cos(x.k * th); z = e * x.a * 1.2 * Math.sin(x.k * th); }
        else { rr = x.R + e * x.a * 0.5 * Math.cos(2 * x.k * th); z = e * x.b * Math.cos(x.k * th + TAU * p); }
        return out.set(rr * Math.cos(th), rr * Math.sin(th), z + schale);
      };
      x.mesh.geometry.dispose();
      x.mesh.geometry = new T.TubeGeometry(new Kurve(fn), x.art === 'kordel' ? 900 : 600, 0.016 * (x.art === 'kordel' ? 0.8 : 1), 8, true);
      x.mesh.rotation.z = (TAU / S) * x.m * p;
      if (x.pl) {
        for (let j = 0; j < x.k; j++) x.pl.setze(j, fn((j - ph / TAU) / x.k, v), 0.03 * Math.min(1, e * 1.6));
        x.pl.fertig();
      }
    }
    mitte.position.z = 0.04 * welle(p);
    mitte.rotation.z = (TAU / S) * p;
    // die Scheibe kippt zur Schale und dreht sich ein wenig; Kamera kommt näher
    scheibe.rotation.x = -0.78 * welle(p, 0.04);
    scheibe.rotation.y = 0.22 * Math.sin(TAU * p);
    kamera.position.set(0, -0.15 * welle(p), mix(4.3, 4.0, welle(p)));
    kamera.lookAt(0, 0, 0);
  }
  return { stelle };
}
