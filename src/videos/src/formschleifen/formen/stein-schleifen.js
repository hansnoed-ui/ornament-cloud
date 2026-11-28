// Stein, geschliffen (28. November 2026). Christian: «Zusätzlich verbinde ich mit Stein: meisseln, schneiden, schleifen etc.»
// Eine zwölfzählige Rosette wird in den rohen Marmor geschliffen, von der Mitte nach aussen: wo der Stein geschliffen ist, sind die
// Höcker abgetragen, die Fläche ist eben und glänzt; die Risse bleiben als feine Linien im Spiegel stehen. Sichtbar wird die Rosette
// vor allem, wenn die Sonne gegenüber steht und die Fläche aufleuchtet; sonst ist sie nur ein etwas dunklerer, tieferer Ton.
// Am Ende verwittert der Glanz wieder (Regen), von aussen nach innen. Bezüge: Cosmatenarbeit, Pietra dura, polierter Marmorboden.
// Begriffe: nie fertig gesehen (3/4), Rahmen und Werk (3/5), Material als Widerstand (7/1).
import { welle, sanft, mix } from './werkzeug.js';
import { steinplatte } from './stein-gemeinsam.js';

const MITTE = [0.1, -0.3], R = 1.08, Z = 12;

/** die Rosette als Maske (0 bis 1, weiche Kante): Kreisband, zwölf Blätter, innerer Stern, Mitte */
function rosette(x, y) {
  const dx = x - MITTE[0], dy = y - MITTE[1], r = Math.hypot(dx, dy) / R, a = Math.atan2(dy, dx);
  const kante = (d, b = 0.008) => Math.min(1, Math.max(0, 0.5 + d / b));
  const band = Math.min(kante(r - 0.86), kante(0.96 - r));
  const blatt = kante(0.84 * (0.35 + 0.65 * Math.pow(Math.abs(Math.cos(Z / 2 * a)), 0.7)) - r) * kante(r - 0.24);
  const stern = kante(0.2 * (0.55 + 0.45 * Math.abs(Math.cos(Z / 2 * a + Math.PI / 2))) - r);
  const fuge = 1 - kante(0.012 - Math.abs(r * Math.sin(Z / 2 * a + Math.PI / 2)) * 0.5, 0.004) * kante(r - 0.24) * kante(0.84 - r);   // feine Fugen zwischen den Blättern
  return Math.max(band, blatt * fuge, stern);
}

export async function baue({ szene, kamera, renderer }) {
  const s = await steinplatte({ szene, renderer });
  const maske = new Float32Array(s.N), abstand = new Float32Array(s.N);
  let ebene = 0, z = 0;
  for (let i = 0; i < s.N; i++) {
    const x = s.pos.getX(i), y = s.pos.getY(i);
    maske[i] = rosette(x, y); abstand[i] = Math.hypot(x - MITTE[0], y - MITTE[1]) / R;
    if (maske[i] > 0.5) { ebene += s.grund[i]; z++; }
  }
  ebene = ebene / Math.max(1, z) - 0.01;   // geschliffen wird bis knapp unter die mittlere Höhe der Rosette
  s.stoff.envMapIntensity = 0.3;

  function stelle(p) {
    const front = 1.05 * sanft((p - 0.04) / 0.5), regen = 1.05 * sanft((p - 0.72) / 0.25);
    for (let i = 0; i < s.N; i++) {
      const m = maske[i]; if (m <= 0) continue;
      const d = abstand[i], g = m * sanft((front - d) / 0.06) * (1 - sanft((d - (1.05 - regen)) / 0.06) * (regen > 0 ? 1 : 0));
      s.pos.setZ(i, mix(s.grund[i], Math.min(s.grund[i], ebene), g));
      s.glanz[i] = g;
      const t = 1 - 0.14 * g; s.farbeV[i * 3] = t; s.farbeV[i * 3 + 1] = t * 0.99; s.farbeV[i * 3 + 2] = t * 0.97;
    }
    s.fertig();
    s.licht(p, mix(0.05, 0.3, welle(2 * p, 0.25)), 0.7);
    s.kamera(kamera, p, MITTE);
  }
  return { stelle };
}
