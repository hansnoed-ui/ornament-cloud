// Sonnenblume: Phyllotaxis wie im Blütenstand der Sonnenblume, im Pinienzapfen und in der Rosette. In der Mitte entsteht laufend ein neuer
// Kern, jeder im Winkel von rund 137,5° zum vorigen, und rückt nach aussen, während neue nachwachsen: Die Kerne strömen auf den Spiralarmen
// nach aussen und vergehen am Rand. Je Schleife wachsen genau 273 = 13 · 21 Kerne nach, darum steht am Ende dasselbe Bild wie am Anfang,
// auch die hervorgehobenen Spiralen zu 13 und zu 21. Die Scheibe wölbt sich zur Kuppel, die Kerne werden zu Stacheln wie bei der Distel,
// und der Divergenzwinkel schwankt um den goldenen Winkel: dann kippen die Spiralfamilien, und für einen Moment erscheinen Speichen.
import { T, TAU, welle, mix, sanft, stelleKamera } from './werkzeug.js';

const K = 273, M = 1500, C = 0.026, GOLD = Math.PI * (3 - Math.sqrt(5));

export function baue({ szene, kamera }) {
  const halter = new T.Group(); szene.add(halter);
  const stoff = new T.MeshStandardMaterial({ color: 0xffffff, metalness: 0.88, roughness: 0.28 });
  const kegel = new T.ConeGeometry(1, 1, 14); kegel.translate(0, 0.5, 0);
  const kerne = new T.InstancedMesh(kegel, stoff, M); kerne.frustumCulled = false;
  const kugel = new T.InstancedMesh(new T.SphereGeometry(1, 16, 12), stoff, M); kugel.frustumCulled = false;
  halter.add(kerne, kugel);
  const R = C * Math.sqrt(M) * 0.97;
  const messing = new T.Color(0xc8a05a), dunkel = new T.Color(0x7d5a22), perle = new T.Color(0xf3e4bc), farbe = new T.Color();
  const Mx = new T.Matrix4(), Q = new T.Quaternion(), S = new T.Vector3(), P = new T.Vector3(), N = new T.Vector3(), OBEN = new T.Vector3(0, 1, 0);
  const ziel = new T.Vector3();

  function stelle(p) {
    const tau = K * p, fr = tau - Math.floor(tau);
    const phi = GOLD + (0.45 * Math.PI / 180) * Math.sin(TAU * p) * welle(p, 0.25);   // Abweichung vom goldenen Winkel
    const kuppel = mix(0.04, 0.62, welle(p)), stachel = mix(0.25, 2.6, welle(p, 0.22));
    const w13 = 0.5 + 0.5 * Math.cos(TAU * p), w21 = 1 - w13;                       // welche Spiralfamilie leuchtet
    for (let j = 0; j < M; j++) {
      const n = j + fr, k = Math.floor(tau) - j;                                        // Alter n, Nummer k (fest je Kern)
      const r = C * Math.sqrt(n), a = -n * phi;
      const z = kuppel * R * (1 - (r / R) * (r / R));
      P.set(r * Math.cos(a), z, r * Math.sin(a));
      // Normale der Kuppel: die Kerne stehen senkrecht auf der Fläche
      const dz = -2 * kuppel * r / R;
      N.set(-dz * Math.cos(a), 1, -dz * Math.sin(a)).normalize();
      Q.setFromUnitVectors(OBEN, N);
      const gross = C * 0.8 * (0.55 + 0.45 * Math.sqrt(n / M)) * sanft(n / 6) * sanft((R - r) / (R * 0.08));
      Mx.compose(P, Q, S.set(gross, gross * stachel, gross)); kerne.setMatrixAt(j, Mx);
      Mx.compose(P, Q, S.set(gross * 0.92, gross * 0.92, gross * 0.92)); kugel.setMatrixAt(j, Mx);
      const kk = ((k % 273) + 273) % 273;
      const licht = w13 * (kk % 13 === 0 ? 1 : 0) + w21 * (kk % 21 === 0 ? 1 : 0);
      farbe.lerpColors(kk % 2 ? messing : dunkel, messing, 0.6).lerp(perle, licht);
      kerne.setColorAt(j, farbe); kugel.setColorAt(j, farbe);
    }
    kerne.instanceMatrix.needsUpdate = true; kugel.instanceMatrix.needsUpdate = true;
    kerne.instanceColor.needsUpdate = true; kugel.instanceColor.needsUpdate = true;
    halter.rotation.y = 0.3 * Math.sin(TAU * p);
    stelleKamera(kamera, ziel.set(0, kuppel * R * 0.35, 0), mix(4.3, 4.5, welle(p)), mix(1.35, 0.55, welle(p, 0.08)), 0.4 * Math.sin(TAU * p));
  }
  return { stelle };
}
