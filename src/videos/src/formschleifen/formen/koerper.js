// Körper: eine Kugel wie eine Radiolarie oder ein Kugelornament. Innen ein Ikosaeder aus Messing, der in 30 s um eine fünfzählige Achse
// eine Fünfteldrehung macht (danach deckt er sich mit sich selbst), aussen ein geodätisches Netz aus Kreide, das atmet, und darauf Stacheln,
// die in zwei Kronen über die Kugel wandern.
import { T, TAU, welle, mix, stelleKamera, stabwerk, kugeln } from './werkzeug.js';
import { polyeder } from '/alpha/formen/gemeinsam.js?v=1';

export function baue({ szene, kamera, mat }) {
  const halter = new T.Group(); szene.add(halter);
  const ik = polyeder(new T.IcosahedronGeometry(1, 0)), netz = polyeder(new T.IcosahedronGeometry(1, 2));
  const innen = new T.Group(); halter.add(innen);
  const ikS = stabwerk(ik.kanten.length, mat.messing), ikP = kugeln(ik.ecken.length, mat.perle);
  innen.add(ikS, ikP);
  const RI = 0.42;
  ik.kanten.forEach(([a, b], i) => ikS.setze(i, ik.ecken[a].clone().multiplyScalar(RI), ik.ecken[b].clone().multiplyScalar(RI), 0.022)); ikS.fertig();
  ik.ecken.forEach((e, i) => ikP.setze(i, e.clone().multiplyScalar(RI), 0.05)); ikP.fertig();
  const achse = ik.ecken[0].clone();
  const nS = stabwerk(netz.kanten.length, mat.kreide, 6), nP = kugeln(netz.ecken.length, mat.messing, 12);
  const sp = new T.InstancedMesh(new T.ConeGeometry(1, 1, 12), mat.messing2, netz.ecken.length); sp.frustumCulled = false;
  halter.add(nS, nP, sp);
  const a = new T.Vector3(), b = new T.Vector3(), kr = new T.Vector3(), M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), P = new T.Vector3();
  const OBEN = new T.Vector3(0, 1, 0), ziel = new T.Vector3();

  function stelle(p) {
    innen.quaternion.setFromAxisAngle(achse, (TAU / 5) * p);
    const RN = mix(0.92, 1.04, welle(p, 0.1));
    // zwei Kronen: Achse wandert auf einem Kegel einmal herum
    kr.set(Math.sin(1.0) * Math.cos(TAU * p), Math.cos(1.0), Math.sin(1.0) * Math.sin(TAU * p));
    const lang = netz.ecken.map(e => { const c = e.dot(kr); return 0.03 + 0.75 * Math.pow(Math.max(0, Math.abs(c) * 1.15 - 0.15), 3) * mix(0.4, 1, welle(p, 0.3)); });
    netz.kanten.forEach(([i, j], n) => nS.setze(n, a.copy(netz.ecken[i]).multiplyScalar(RN), b.copy(netz.ecken[j]).multiplyScalar(RN), 0.0065)); nS.fertig();
    netz.ecken.forEach((e, i) => {
      nP.setze(i, a.copy(e).multiplyScalar(RN), 0.014 + 0.05 * lang[i]);
      Q.setFromUnitVectors(OBEN, e); P.copy(e).multiplyScalar(RN + lang[i] / 2);
      M.compose(P, Q, S.set(0.016 + 0.02 * lang[i], lang[i], 0.016 + 0.02 * lang[i])); sp.setMatrixAt(i, M);
    });
    nP.fertig(); sp.instanceMatrix.needsUpdate = true;
    halter.rotation.y = 0;
    stelleKamera(kamera, ziel, mix(4.6, 4.1, welle(p)), 0.35 * Math.sin(TAU * p + 0.4), TAU * p);
  }
  return { stelle };
}
