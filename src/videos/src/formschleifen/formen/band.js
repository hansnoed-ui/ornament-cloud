// Band: ein Möbiusband aus fünf schmalen Streifen, Messing und Kreide im Wechsel, wie Bandelwerk und Flechtband. Das Band rollt in sich
// weiter (in 30 s eine halbe Drehung, danach liegt jeder Streifen am Ort seines Gegenübers, und die Farben sind symmetrisch), die Bahn
// atmet von einem flachen Ring zu einer dreizähligen Schlinge, die Streifen gehen auseinander, wiegen sich gegeneinander und schliessen sich.
import { T, TAU, welle, mix, stelleKamera } from './werkzeug.js';
import { flaeche } from '/alpha/formen/gemeinsam.js?v=1';

const N = 5, K = 3;

export function baue({ szene, kamera, mat }) {
  const halter = new T.Group(); szene.add(halter);
  const streifen = Array.from({ length: N }, (_, j) => {
    const m = new T.Mesh(new T.BufferGeometry(), j % 2 ? mat.kreideB : mat.messingB); halter.add(m); return m;
  });
  const c0 = new T.Vector3(), c1 = new T.Vector3(), c2 = new T.Vector3(), Tn = new T.Vector3(), Nn = new T.Vector3(), Bn = new T.Vector3();
  const ziel = new T.Vector3();

  function stelle(p) {
    const e = welle(p), e2 = welle(2 * p, 0.1);
    const a = mix(0.02, 0.16, e), b = mix(0.04, 0.3, welle(p, 0.06));
    const C = (u, v) => { const th = TAU * u, rr = 0.78 + a * Math.cos(K * th); return v.set(rr * Math.cos(th), rr * Math.sin(th), b * Math.sin(K * th)); };
    const breite = mix(0.34, 0.5, e);              // ganze Breite des Bandes
    const luecke = mix(0.08, 0.55, e2);            // Anteil der Lücken zwischen den Streifen
    const roll = Math.PI * p;                      // halbe Drehung je Schleife
    const w = breite / N, sw = w * (1 - luecke);
    for (let j = 0; j < N; j++) {
      const mitte = (j - (N - 1) / 2) * w, c = (j - (N - 1) / 2) / 2;
      const geo = flaeche(900, 2, false, false, (u, v, out) => {
        C(u, c0); C(u + 1e-3, c1); C(u - 1e-3, c2);
        Tn.subVectors(c1, c2).normalize();
        Nn.set(Math.cos(TAU * u), Math.sin(TAU * u), 0); Nn.addScaledVector(Tn, -Nn.dot(Tn)).normalize();
        Bn.crossVectors(Tn, Nn);
        // die Streifen fächern sich zweimal je Umlauf auf und wandern; gegengleich, damit es über die Naht des Möbiusbandes passt
        const d = 0.5 * w * luecke * c * Math.cos(TAU * 2 * u + TAU * p);
        const s = mitte + d + (v - 0.5) * sw, phi = Math.PI * u + roll;
        return out.copy(c0).addScaledVector(Nn, Math.cos(phi) * s).addScaledVector(Bn, Math.sin(phi) * s);
      });
      streifen[j].geometry.dispose(); streifen[j].geometry = geo;
    }
    halter.rotation.z = TAU * p;
    stelleKamera(kamera, ziel, mix(4.6, 5.0, e), mix(0.95, 0.4, welle(p, -0.05)), 0.5 * Math.sin(TAU * p));
  }
  return { stelle };
}
