// Stein, gemeisselt (28. November 2026). Kerbschnitt: Schlag um Schlag wird ein dreieckiger Span aus dem Marmor gehoben, bis eine
// sechszählige Rosette aus Dreiecken dasteht; die Schläge folgen einem Takt, von der Mitte nach aussen, und jeder frische Span ist
// kurz hell (frischer Stein). Am Ende verwittert die Rosette wieder, von aussen nach innen; Regen füllt die Kerben.
// Bezüge: Kerbschnitt in Holz und Stein (Truhen, Grabsteine, Alpenraum) *(G)*; Steinmetzzeichen; Constantin Brâncuşi, der direkt
// in den Stein schlug statt ein Modell übertragen zu lassen («taille directe») *(G)*. Theorie: Rhythmus (3/2, Ornament in der Zeit:
// dasselbe Motiv nacheinander), Herstellen (7/2), der Körper geht voraus (7/3).
import { welle, sanft, mix } from './werkzeug.js';
import { steinplatte } from './stein-gemeinsam.js';

const MITTE = [0.1, -0.3], S = 0.1, R = 0.95, TIEF = 0.045, TAKT = 0.62;   // TAKT: Anteil der Schleife, in dem gemeisselt wird
const W3 = Math.sqrt(3);

export async function baue({ szene, kamera, renderer }) {
  const s = await steinplatte({ szene, renderer });
  // Dreiecksgitter: jeder Punkt der Platte liegt in genau einem Dreieck; Lage im Dreieck ergibt die Tiefe (umgekehrte Pyramide)
  const drei = new Map(), nr = new Int32Array(s.N).fill(-1), prof = new Float32Array(s.N), liste = [];
  for (let i = 0; i < s.N; i++) {
    const x = (s.pos.getX(i) - MITTE[0]) / S, y = (s.pos.getY(i) - MITTE[1]) / S;
    const r = Math.hypot(x, y) * S; if (r > R + 0.05) continue;
    // schiefe Koordinaten im Dreiecksgitter
    const b = y * 2 / W3, a = x - b / 2, ia = Math.floor(a), ib = Math.floor(b), fa = a - ia, fb = b - ib, oben = fa + fb > 1 ? 1 : 0;
    // Abstände zu den drei Kanten in Einheiten der Inkreishöhe
    const e1 = oben ? 1 - fa : fa, e2 = oben ? 1 - fb : fb, e3 = oben ? fa + fb - 1 : 1 - fa - fb, m = Math.min(e1, e2, e3) * 3;
    const ring = Math.floor(Math.hypot(ia + ib / 2 + 0.5, (ib + 0.5) * W3 / 2) * 1.0);
    // Muster: in geraden Ringen die aufrechten, in ungeraden die hängenden Dreiecke; dazu ein Kranz aussen
    const dabei = (ring % 2 === 0 ? oben === 1 : oben === 0) || (r > R - 0.1 && r < R);
    if (!dabei) continue;
    const key = `${ia},${ib},${oben}`;
    if (!drei.has(key)) { const cx = (ia + ib / 2 + (oben ? 2 / 3 : 1 / 3)) * S, cy = (ib + (oben ? 2 / 3 : 1 / 3)) * S * W3 / 2; drei.set(key, liste.length); liste.push({ r: Math.hypot(cx, cy), w: Math.atan2(cy, cx) }); }
    nr[i] = drei.get(key); prof[i] = Math.min(1, m * 1.1);
  }
  // Reihenfolge der Schläge: von innen nach aussen, im Kreis herum
  const reihe = liste.map((d, k) => [d.r * 6 + ((d.w + Math.PI) / (2 * Math.PI)), k]).sort((a, b) => a[0] - b[0]);
  const zeit = new Float32Array(liste.length); reihe.forEach(([, k], j) => { zeit[k] = 0.04 + TAKT * j / liste.length; });
  const anteil = new Float32Array(liste.length), frisch = new Float32Array(liste.length);

  function stelle(p) {
    for (let k = 0; k < liste.length; k++) {
      const ein = sanft((p - zeit[k]) / 0.004), aus = sanft((p - (0.74 + 0.22 * Math.min(1, liste[k].r / R))) / 0.03);   // ein Schlag ist kurz; Verwittern von aussen
      anteil[k] = ein * (1 - aus); frisch[k] = ein * Math.exp(-Math.max(0, p - zeit[k]) * 40);
    }
    for (let i = 0; i < s.N; i++) {
      const k = nr[i]; if (k < 0) continue;
      const t = anteil[k] * prof[i];
      s.pos.setZ(i, s.grund[i] - TIEF * t);
      const hell = 1 + 0.18 * t + 0.35 * frisch[k] * prof[i];
      s.farbeV[i * 3] = hell; s.farbeV[i * 3 + 1] = hell; s.farbeV[i * 3 + 2] = hell * 0.98;
    }
    s.fertig();
    s.licht(p, mix(0.06, 0.3, Math.pow(welle(2 * p, 0.15), 2)), 1.9);
    s.kamera(kamera, p, MITTE);
  }
  return { stelle };
}
