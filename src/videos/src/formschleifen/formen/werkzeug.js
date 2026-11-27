// Werkzeuge für die Formschleifen: periodische Hüllkurven, Kamera auf einer geschlossenen Bahn, Schlauch mit veränderlicher Dicke.
import { T, TAU } from '/alpha/formen/gemeinsam.js?v=1';
export { T, TAU };

/** 0 bei p = 0 und p = 1, 1 bei p = mitte; periodisch und glatt */
export const welle = (p, versatz = 0) => 0.5 - 0.5 * Math.cos(TAU * (p - versatz));
export const glatt = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
export const sanft = x => x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
export const mix = (a, b, t) => a + (b - a) * t;

/** Kamera auf einer Kugelbahn um ziel: Abstand, Höhenwinkel, Seitenwinkel (Bogenmass) */
export function stelleKamera(kamera, ziel, abstand, hoehe, seite, rollen = 0) {
  kamera.position.set(
    ziel.x + abstand * Math.cos(hoehe) * Math.sin(seite),
    ziel.y + abstand * Math.sin(hoehe),
    ziel.z + abstand * Math.cos(hoehe) * Math.cos(seite));
  kamera.up.set(Math.sin(rollen), Math.cos(rollen), 0);
  kamera.lookAt(ziel);
}

/**
 * Schlauch entlang einer Punktreihe mit Radius je Punkt (Rahmen durch Paralleltransport, ohne Verdrehen).
 * Die Indizes laufen der Reihe nach, darum lässt sich der Schlauch mit setDrawRange(0, k * ring * 6) wachsen.
 */
export function schlauchGeometrie(punkte, radien, ring = 10, geschlossen = false) {
  const n = punkte.length, pos = new Float32Array(n * ring * 3), tan = [], nor = [];
  for (let i = 0; i < n; i++) {
    const a = punkte[Math.max(0, i - 1)], b = punkte[Math.min(n - 1, i + 1)];
    tan.push(new T.Vector3().subVectors(b, a).normalize());
  }
  if (geschlossen) tan[0] = tan[n - 1] = new T.Vector3().subVectors(punkte[1], punkte[n - 2]).normalize();
  const hilfe = Math.abs(tan[0].z) < 0.9 ? new T.Vector3(0, 0, 1) : new T.Vector3(1, 0, 0);
  nor.push(new T.Vector3().crossVectors(tan[0], hilfe).normalize());
  for (let i = 1; i < n; i++) {
    const v = nor[i - 1].clone(), q = new T.Quaternion().setFromUnitVectors(tan[i - 1], tan[i]);
    v.applyQuaternion(q); v.addScaledVector(tan[i], -v.dot(tan[i])).normalize(); nor.push(v);
  }
  const bi = new T.Vector3(), p = new T.Vector3();
  for (let i = 0; i < n; i++) {
    bi.crossVectors(tan[i], nor[i]);
    for (let j = 0; j < ring; j++) {
      const w = TAU * j / ring, k = (i * ring + j) * 3;
      p.copy(punkte[i]).addScaledVector(nor[i], Math.cos(w) * radien[i]).addScaledVector(bi, Math.sin(w) * radien[i]);
      pos[k] = p.x; pos[k + 1] = p.y; pos[k + 2] = p.z;
    }
  }
  const idx = [];
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < ring; j++) {
    const a = i * ring + j, b = i * ring + (j + 1) % ring, c = (i + 1) * ring + (j + 1) % ring, d = (i + 1) * ring + j;
    idx.push(a, d, b, b, d, c);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** ersetzt die Geometrie eines Meshes und gibt die alte frei */
export function tausche(mesh, geo) { if (mesh.geometry) mesh.geometry.dispose(); mesh.geometry = geo; }

/** Kugeln als Instanzen; setze(i, ort, r) */
export function kugeln(n, mat, fein = 20) {
  const m = new T.InstancedMesh(new T.SphereGeometry(1, fein, Math.round(fein * 0.75)), mat, n);
  m.frustumCulled = false;
  const M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3();
  m.setze = (i, ort, r) => { M.compose(ort, Q, S.setScalar(Math.max(1e-5, r))); m.setMatrixAt(i, M); };
  m.fertig = () => { m.instanceMatrix.needsUpdate = true; };
  return m;
}

/** Stäbe als Instanzen; setze(i, a, b, rad) */
export function stabwerk(n, mat, rund = 8) {
  const m = new T.InstancedMesh(new T.CylinderGeometry(1, 1, 1, rund), mat, n);
  m.frustumCulled = false;
  const M = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), P = new T.Vector3(), D = new T.Vector3(), OBEN = new T.Vector3(0, 1, 0);
  m.setze = (i, a, b, rad) => {
    D.subVectors(b, a); const len = D.length() || 1e-5;
    P.addVectors(a, b).multiplyScalar(0.5); Q.setFromUnitVectors(OBEN, D.multiplyScalar(1 / len));
    M.compose(P, Q, S.set(Math.max(1e-5, rad), len, Math.max(1e-5, rad))); m.setMatrixAt(i, M);
  };
  m.fertig = () => { m.instanceMatrix.needsUpdate = true; };
  return m;
}

/** Gewichte für n Zustände im Kreis: bei p = i/n ist Zustand i rein, dazwischen gleiten sie ineinander */
export function kreisGewichte(p, n, schaerfe = 3) {
  const w = Array.from({ length: n }, (_, i) => Math.pow(0.5 + 0.5 * Math.cos(TAU * (p - i / n)), schaerfe));
  const s = w.reduce((a, b) => a + b, 0);
  return w.map(x => x / s);
}
