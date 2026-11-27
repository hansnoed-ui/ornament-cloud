// Feld: Feldlinien zwischen Ladungen, die Form als Spur einer Kraft, wie Eisenfeilspäne, Guillochen und Moiré. Drei Quellen kreisen
// aussen, drei Senken innen gegenläufig (je um einen Platz weiter je Schleife), und beide Ringe heben und senken sich gegeneinander. Die
// Linien werden für jedes Bild neu gezogen: sie spannen sich, reissen ab, greifen zur nächsten Senke.
import { T, TAU, welle, mix, stelleKamera, kugeln, schlauchGeometrie } from './werkzeug.js';

const N = 3, M = 22, RA = 0.78, RI = 0.34, GOLD = Math.PI * (3 - Math.sqrt(5));

export function baue({ szene, kamera, mat }) {
  const halter = new T.Group(); szene.add(halter); halter.scale.setScalar(0.7);
  const linien = Array.from({ length: N * M }, () => { const x = new T.Mesh(new T.BufferGeometry(), mat.messing); x.frustumCulled = false; halter.add(x); return x; });
  const plus = kugeln(N, mat.perle, 24), minus = kugeln(N, mat.kreide, 24); halter.add(plus, minus);
  const d = new T.Vector3(), e1 = new T.Vector3(), mid = new T.Vector3(), ziel = new T.Vector3();
  const start = Array.from({ length: M }, (_, s) => { const y = 1 - 2 * (s + 0.5) / M, rad = Math.sqrt(1 - y * y), th = s * GOLD; return new T.Vector3(rad * Math.cos(th), rad * Math.sin(th), y); });

  function stelle(p) {
    const hub = 0.32 * Math.sin(TAU * p), ladungen = [];
    for (let i = 0; i < N; i++) {
      const a = TAU * (i + p) / N, b = TAU * (i + 0.5 - p) / N;
      ladungen.push({ c: new T.Vector3(RA * Math.cos(a), RA * Math.sin(a), hub), q: 1 });
      ladungen.push({ c: new T.Vector3(RI * Math.cos(b), RI * Math.sin(b), -hub), q: -mix(0.7, 1.5, welle(p, 0.2)) });
    }
    const E = (q, out) => {
      out.set(0, 0, 0);
      for (const ch of ladungen) { d.subVectors(q, ch.c); const l = d.length(); out.addScaledVector(d, ch.q / (l * l * l + 1e-6)); }
      return out;
    };
    let n = 0, pi = 0, mi = 0;
    for (const ch of ladungen) {
      if (ch.q < 0) { minus.setze(mi++, ch.c, 0.045 + 0.02 * -ch.q); continue; }
      plus.setze(pi++, ch.c, 0.06);
      for (let s = 0; s < M; s++) {
        const q = ch.c.clone().addScaledVector(start[s], 0.045), pkt = [q.clone()];
        for (let st = 0; st < 520; st++) {
          E(q, e1).normalize(); mid.copy(q).addScaledVector(e1, 0.006);
          E(mid, e1).normalize(); q.addScaledVector(e1, 0.012);
          if (st % 3 === 2) pkt.push(q.clone());
          if (q.length() > 2.3) break;
          if (ladungen.some(c2 => c2.q < 0 && c2.c.distanceTo(q) < 0.04)) { pkt.push(q.clone()); break; }
        }
        const x = linien[n++];
        x.geometry.dispose();
        if (pkt.length < 4) { x.visible = false; x.geometry = new T.BufferGeometry(); continue; }
        // Linien, die ins Weite laufen, verjüngen sich und verlöschen
        const frei = q.length() > 2.25, L = pkt.length;
        x.geometry = schlauchGeometrie(pkt, pkt.map((_, k) => 0.0085 * (frei ? Math.max(0.05, 1 - Math.pow(k / (L - 1), 2)) : 1)), 6);
        x.visible = true;
      }
    }
    plus.fertig(); minus.fertig();
    halter.rotation.x = -mix(0.2, 1.05, welle(p, 0.1));
    stelleKamera(kamera, ziel, mix(4.5, 4.0, welle(p)), 0.12, 0.5 * Math.sin(TAU * p));
  }
  return { stelle };
}
