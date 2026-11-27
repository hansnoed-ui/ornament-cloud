// Raumgitter: eine Fahrt durch ein Kristallgitter, wie durch Masswerk oder ein Gitterwerk. In 30 s legt die Kamera genau einen
// Gittervektor zurück, darum ist das letzte Bild wieder das erste. Unterwegs wachsen in die Mitte jeder Zelle Perlen und Streben ein
// (aus dem kubischen wird ein raumzentriertes Gitter) und wieder aus; die Knoten pulsieren in einer Welle entlang der Fahrt.
import { T, TAU, welle, sanft, stabwerk, kugeln } from './werkzeug.js';

const X = 4, Z0 = -11, Z1 = 4, WEG = new T.Vector3(1, 0, -2), START = new T.Vector3(0.3, 0.18, 1.6);

export function baue({ szene, kamera, mat, grund }) {
  szene.fog = new T.Fog(grund, 1.2, 7.5);
  const ecken = [], mitten = [], kanten = [], diag = [];
  for (let i = -X; i <= X + 2; i++) for (let j = -X; j <= X; j++) for (let k = Z0; k <= Z1; k++) {
    const e = new T.Vector3(i, j, k); ecken.push(e);
    if (i < X + 2) kanten.push([e, new T.Vector3(i + 1, j, k)]);
    if (j < X) kanten.push([e, new T.Vector3(i, j + 1, k)]);
    if (k < Z1) kanten.push([e, new T.Vector3(i, j, k + 1)]);
    if (i < X + 2 && j < X && k < Z1) {
      const m = new T.Vector3(i + 0.5, j + 0.5, k + 0.5); mitten.push(m);
      for (const [a, b, c] of [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 0], [1, 0, 1], [0, 1, 1], [1, 1, 1]]) diag.push([m, new T.Vector3(i + a, j + b, k + c)]);
    }
  }
  const eS = stabwerk(kanten.length, mat.kreide, 6), eP = kugeln(ecken.length, mat.perle, 14);
  const mP = kugeln(mitten.length, mat.messing, 14), dS = stabwerk(diag.length, mat.messing2, 6);
  szene.add(eS, eP, mP, dS);
  const blick = new T.Vector3(), a = new T.Vector3(), m1 = new T.Vector3(), weg = WEG.clone().normalize();

  function stelle(p) {
    kamera.position.copy(START).addScaledVector(WEG, p);
    const w = welle(p, 0.25), k = kamera.position;
    // was der Kamera zu nahe kommt, wird dünn und verschwindet, statt durchs Bild zu fahren
    const nah = (q) => sanft((q.distanceTo(k) - 0.45) / 0.9);
    kanten.forEach(([a1, b1], i) => eS.setze(i, a1, b1, 0.012 * nah(m1.lerpVectors(a1, b1, 0.5)))); eS.fertig();
    // Welle entlang der Fahrt, Wellenlänge zwei Zellen in z: nach dem Weg von zwei Zellen steht sie wieder gleich zur Kamera
    ecken.forEach((e, i) => eP.setze(i, e, nah(e) * (0.045 + 0.025 * (0.5 + 0.5 * Math.sin(TAU * e.z / 2 + TAU * 2 * p))))); eP.fertig();
    mitten.forEach((m, i) => mP.setze(i, m, 0.075 * w * nah(m))); mP.fertig();
    diag.forEach(([m, e], i) => dS.setze(i, m, a.lerpVectors(m, e, w), 0.008 * Math.min(1, w * 2) * nah(m1.lerpVectors(m, e, 0.5)))); dS.fertig();
    blick.copy(kamera.position).addScaledVector(weg, 3);
    blick.x += 0.35 * Math.sin(TAU * p); blick.y += 0.3 * Math.sin(TAU * p + 1.1);
    kamera.up.set(Math.sin(0.25 * Math.sin(TAU * p)), Math.cos(0.25 * Math.sin(TAU * p)), 0);
    kamera.lookAt(blick);
  }
  return { stelle };
}
