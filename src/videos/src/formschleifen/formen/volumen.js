// Volumen: ein gedrechselter Körper wie Baluster, Vase und Säulenschaft. Er wächst aus einem flachen Keim in die Höhe und sinkt zurück; die Wülste steigen langsam durch den Körper nach oben, entstehen
// unten und vergehen oben; die Kanneluren vertiefen sich und verflachen, und der Schaft dreht sich wie eine gewundene Säule hin und zurück.
import { T, TAU, welle, mix, stelleKamera } from './werkzeug.js';
import { flaeche } from '/alpha/formen/gemeinsam.js?v=1';

const WUELSTE = [{ a: 0.26, w: 0.07 }, { a: 0.14, w: 0.04 }, { a: 0.3, w: 0.09 }, { a: 0.11, w: 0.035 }], KANN = 16, NU = 320, NV = 240;

export function baue({ szene, kamera, mat }) {
  const halter = new T.Group(); szene.add(halter);
  const mesh = new T.Mesh(new T.BufferGeometry(), mat.messing); halter.add(mesh);
  const ziel = new T.Vector3();

  function stelle(p) {
    const tief = mix(0.015, 0.09, welle(p, 0.1)), dreh = Math.PI * 1.2 * Math.sin(TAU * p);
    // wachsen aus einem flachen Keim und zurück: Höhe und Fülle
    const hoch = mix(0.08, 1, Math.pow(welle(p), 0.7)), fuelle = mix(0.55, 1.15, welle(p, 0.06));
    const wl = WUELSTE.map((x, i) => { const c = (i / WUELSTE.length + p) % 1; return { ...x, c, s: Math.pow(Math.sin(Math.PI * c), 2) }; });
    const geo = flaeche(NU, NV, false, true, (u, v, out) => {
      let rad = 0.1; for (const b of wl) rad += b.a * b.s * Math.exp(-Math.pow((u - b.c) / b.w, 2));
      rad *= Math.pow(Math.sin(Math.PI * u), 0.35);
      const phi = TAU * v + dreh * (u - 0.5);
      rad *= 1 - tief * Math.pow(Math.abs(Math.sin(KANN * TAU * v / 2)), 2);
      return out.set(fuelle * rad * Math.cos(phi), (u - 0.5) * 1.8 * hoch, fuelle * rad * Math.sin(phi));
    });
    mesh.geometry.dispose(); mesh.geometry = geo;
    halter.rotation.y = TAU * p;
    stelleKamera(kamera, ziel, 3.5, mix(0.55, 0.12, welle(p)), 0.5 * Math.sin(TAU * p));
  }
  return { stelle };
}
