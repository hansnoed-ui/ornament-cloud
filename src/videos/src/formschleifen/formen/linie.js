// Linie: ein Lissajousknoten als eine einzige geschlossene Linie, die sich aus dem Nichts zeichnet und am Ende wieder löst, die sich wie ein Schwellzug im Kupferstich verdickt und verjüngt.
// Die Phasen der drei Schwingungen laufen je um ganze Umläufe, darum verwandelt sich der Knoten fortwährend und kehrt zurück; Perlen
// gleiten auf der Linie wie auf einer Schnur, eine feine Kreidelinie folgt ihr als Schatten.
import { T, TAU, welle, sanft, mix, stelleKamera, kugeln } from './werkzeug.js';
import { Kurve } from '/alpha/formen/gemeinsam.js?v=1';

const NX = 3, NY = 2, NZ = 5, SEG = 1600, RAD = 16, PERLEN = 7;

export function baue({ szene, kamera, mat }) {
  const halter = new T.Group(); szene.add(halter);
  const linie = new T.Mesh(new T.BufferGeometry(), mat.messing), schatten = new T.Mesh(new T.BufferGeometry(), mat.kreide);
  const pl = kugeln(PERLEN, mat.perle, 24), feder = kugeln(2, mat.perle, 24);
  halter.add(linie, schatten, pl, feder); halter.scale.setScalar(0.68);
  const v = new T.Vector3(), ziel = new T.Vector3();

  function stelle(p) {
    const px = 0.7 + TAU * p, py = 2.1 - TAU * p, pz = 1.3 + 2 * TAU * p;
    const fn = (t, out) => out.set(Math.cos(NX * TAU * t + px), Math.cos(NY * TAU * t + py), Math.cos(NZ * TAU * t + pz));
    const kurve = new Kurve(fn), geo = new T.TubeGeometry(kurve, SEG, 1, RAD, true);
    // Schwellzug: der Radius je Ring wandert der Linie entlang
    const a = geo.attributes.position, c = new T.Vector3();
    for (let i = 0; i <= SEG; i++) {
      kurve.getPointAt(i / SEG, c);
      const r = 0.018 + 0.03 * Math.pow(0.5 + 0.5 * Math.sin(TAU * (6 * i / SEG) - TAU * p * 2), 2);
      for (let j = 0; j <= RAD; j++) {
        const k = i * (RAD + 1) + j;
        v.fromBufferAttribute(a, k).sub(c).multiplyScalar(r).add(c); a.setXYZ(k, v.x, v.y, v.z);
      }
    }
    geo.computeVertexNormals();
    linie.geometry.dispose(); linie.geometry = geo;
    schatten.geometry.dispose();
    schatten.geometry = new T.TubeGeometry(new Kurve((t, out) => fn(t, out).multiplyScalar(1.12 + 0.05 * Math.sin(TAU * (3 * t + p)))), SEG, 0.006, 6, true);
    // die Linie zeichnet sich wie mit einer Feder (p 0,02–0,42) und löst sich am Ende vom Anfang her (p 0,62–0,98)
    const kopf = sanft((p - 0.02) / 0.4), schwanz = sanft((p - 0.62) / 0.36), ring = RAD * 6;
    const von = Math.floor(schwanz * SEG), bis = Math.floor(kopf * SEG);
    linie.geometry.setDrawRange(von * ring, Math.max(0, bis - von) * ring);
    schatten.geometry.setDrawRange(von * 36, Math.max(0, bis - von) * 36);
    linie.visible = schatten.visible = bis > von;
    for (let i = 0; i < PERLEN; i++) {
      const t = (i / PERLEN + p) % 1, da = t >= schwanz && t <= kopf;
      pl.setze(i, fn(t, v), da ? 0.055 : 0);
    }
    // die Feder: eine Perle am Kopf, solange gezeichnet wird, und am Schwanz, solange gelöscht wird
    pl.fertig();
    feder.setze(0, fn(kopf % 1, v), kopf > 0.001 && kopf < 0.999 ? 0.07 : 0);
    feder.setze(1, fn(schwanz % 1, v), schwanz > 0.001 && schwanz < 0.999 ? 0.07 : 0);
    feder.fertig();
    stelleKamera(kamera, ziel, mix(4.2, 3.8, welle(p)), 0.3 * Math.sin(TAU * p + 0.5), 0.6 * Math.sin(TAU * p));
  }
  return { stelle };
}
