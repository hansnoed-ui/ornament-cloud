// Ähnlichkeit: eine Schnecke wie beim Nautilus und bei der Volute, eine logarithmische Spirale, die beim Wachsen ihre Form behält. Die
// Kamera taucht unendlich in die Windungen, während die Schnecke vom dünnen Faden zum vollen Gehäuse und vom flachen Wirbel zum Kegel wird: In 30 s wird alles um genau eine Windung grösser und dreht sich um genau eine Umdrehung, und
// weil die Spirale sich selbst ähnlich ist, liegt am Ende dieselbe Form da wie am Anfang. Rippen und Perlen wachsen im selben Mass mit.
import { T, TAU, welle, mix, kugeln } from './werkzeug.js';

const B = Math.log(2.6) / TAU, RIPPEN = 24, VON = -16 * Math.PI, BIS = 4 * Math.PI, SEG = 260;

export function baue({ szene, kamera, mat }) {
  const halter = new T.Group(); szene.add(halter);
  const n = Math.round((BIS - VON) / TAU * SEG), ring = 28, N = (n + 1) * ring;
  const pos = new Float32Array(N * 3), wTh = new Float32Array(N), wV = new Float32Array(N), rippe = new Float32Array(N), idx = [];
  for (let i = 0; i <= n; i++) {
    const th = VON + (BIS - VON) * i / n;
    for (let j = 0; j < ring; j++) { const k = i * ring + j; wTh[k] = th; wV[k] = TAU * j / ring; rippe[k] = Math.pow(Math.abs(Math.sin(RIPPEN * th / 2)), 6); }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < ring; j++) {
    const a = i * ring + j, b = i * ring + (j + 1) % ring, c = (i + 1) * ring + (j + 1) % ring, d = (i + 1) * ring + j;
    idx.push(a, b, d, b, c, d);
  }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setIndex(idx);
  const schale = new T.Group(); halter.add(schale);
  schale.add(new T.Mesh(geo, mat.messingB));
  // Perlen auf dem Rücken der Windung, 12 je Umlauf
  const je = 12, anzahl = Math.floor((BIS - VON) / TAU * je), pl = kugeln(anzahl, mat.perle, 16), perlen = [];
  for (let i = 0; i < anzahl; i++) perlen.push(VON + TAU * i / je);
  schale.add(pl);
  const v3 = new T.Vector3();
  kamera.fov = 30; kamera.updateProjectionMatrix();

  function stelle(p) {
    // zwei Windungen je Schleife: grösser um exp(B·4π), gedreht um 4π
    schale.scale.setScalar(Math.exp(B * 2 * TAU * p));
    schale.rotation.z = 2 * TAU * p;
    // die Form verwandelt sich (überall im gleichen Mass, darum bleibt sie sich selbst ähnlich): vom dünnen Spiralfaden zum vollen
    // Gehäuse, vom flachen Wirbel zum hohen Kegel, die Rippen atmen
    const rohr = mix(0.07, 0.42, welle(p)), hoch = mix(0.1, 0.9, welle(p, 0.12)), tief = mix(0.0, 0.12, welle(p, 0.2)), arr = pos;
    for (let k = 0; k < wTh.length; k++) {
      const th = wTh[k], e = Math.exp(B * th), v = wV[k], r = rohr * e * (1 + tief * rippe[k]);
      arr[k * 3] = e * Math.cos(th) + Math.cos(th) * Math.cos(v) * r;
      arr[k * 3 + 1] = e * Math.sin(th) + Math.sin(th) * Math.cos(v) * r;
      arr[k * 3 + 2] = -hoch * e + Math.sin(v) * r * 0.8;
    }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
    // Lichtpulse laufen die Naht entlang nach aussen, dreimal je Schleife (periodisch im Winkel, passt also zur Selbstähnlichkeit)
    perlen.forEach((th, i) => {
      const e = Math.exp(B * th);
      v3.set(e * Math.cos(th), e * Math.sin(th), -hoch * e + rohr * e * 0.85);
      pl.setze(i, v3, 0.045 * e * (0.4 + welle(p)) * (1 + 1.3 * Math.pow(Math.max(0, Math.sin(th - 3 * TAU * p)), 10)));
    });
    pl.fertig();
    halter.rotation.x = mix(-0.45, -0.85, welle(p, 0.1));
    kamera.position.set(0, 0.25, 2.6);
    kamera.lookAt(0, 0, -0.2);
  }
  return { stelle };
}
