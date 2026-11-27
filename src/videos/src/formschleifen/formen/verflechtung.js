// Verflechtung: ein Flechtband wie im keltischen und langobardischen Ornament, als Ring geschlossen. Drei Stränge liegen zuerst als
// glatte Reife nebeneinander, dann schlagen sie über- und untereinander zum Zopf, der Zopf wandert um den Ring und löst sich wieder.
// Innen flechten sich zwei Kreidestränge gegenläufig, aussen fassen zwei feine Reife das Band wie eine Bordüre.
import { T, TAU, welle, mix, stelleKamera, kugeln } from './werkzeug.js';
import { Kurve } from '/alpha/formen/gemeinsam.js?v=1';

const K = 8, K2 = 5, R = 0.72, R2 = 0.36;

export function baue({ szene, kamera, mat }) {
  const halter = new T.Group(); szene.add(halter); halter.scale.setScalar(0.88);
  const aussen = [mat.messing, mat.messing2, mat.perle].map(m => { const x = new T.Mesh(new T.BufferGeometry(), m); halter.add(x); return x; });
  const innen = [mat.kreide, mat.kreide].map(m => { const x = new T.Mesh(new T.BufferGeometry(), m); halter.add(x); return x; });
  const rand = [0, 1].map(() => { const x = new T.Mesh(new T.BufferGeometry(), mat.perle); halter.add(x); return x; });
  const schiff = kugeln(3, mat.perle, 24); halter.add(schiff);
  const v = new T.Vector3(), ziel = new T.Vector3();

  function stelle(p) {
    const e = welle(p), e2 = welle(p, 0.15), lauf = TAU * p;
    const a = 0.15 * e, b = 0.085 * e, dick = mix(0.03, 0.044, e);
    aussen.forEach((x, i) => {
      const fn = (t, out) => {
        const th = TAU * t, s = K * th + TAU * i / 3 + lauf, rr = R + a * Math.sin(s) + (1 - e) * (i - 1) * 0.085;
        return out.set(rr * Math.cos(th), rr * Math.sin(th), b * Math.sin(2 * s));
      };
      x.geometry.dispose(); x.geometry = new T.TubeGeometry(new Kurve(fn), K * 70, dick, 12, true);
      schiff.setze(i, fn(((i / 3 - p) % 1 + 1) % 1, v), dick * 1.9);
    });
    schiff.fertig();
    innen.forEach((x, j) => {
      const fn = (t, out) => {
        const th = TAU * t, s = K2 * th + Math.PI * j - lauf, rr = R2 + 0.12 * e2 * Math.cos(s) + (1 - e2) * (j - 0.5) * 0.07;
        return out.set(rr * Math.cos(th), rr * Math.sin(th), 0.06 * e2 * Math.sin(s));
      };
      x.geometry.dispose(); x.geometry = new T.TubeGeometry(new Kurve(fn), K2 * 70, 0.022, 10, true);
    });
    rand.forEach((x, j) => {
      const rr = R + (j ? 1 : -1) * mix(0.16, 0.26, e);
      x.geometry.dispose(); x.geometry = new T.TorusGeometry(rr, 0.01, 8, 200);
    });
    halter.rotation.z = -(TAU / K) * p;
    halter.rotation.x = -mix(0.25, 0.95, welle(p, 0.05));
    stelleKamera(kamera, ziel, mix(4.4, 4.0, e), 0.1, 0.45 * Math.sin(TAU * p));
  }
  return { stelle };
}
