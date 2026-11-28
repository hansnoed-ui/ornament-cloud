// Stein, geschnitten (28. November 2026). Ein Mäander wird in einen Marmorstreifen gesägt (die Säge selbst bleibt unsichtbar, man sieht die Schnittfront), und eine Stelle weiter hinten wird die Fuge
// mit Messing vergossen und bündig geschliffen. Die Säge steht still, der Stein gleitet unter ihr durch, wie auf dem Wagen einer
// Steinsäge. Der Scan ist kachelbar: Nach einer Schleife ist der Stein genau um eine Kachel weitergeglitten, darum schliesst sie.
// Bezüge: Cosmatenarbeit und Opus sectile (geschnittener Stein); Bleiverguss in Steinfugen, Metallintarsie (Damaszierung) *(G)*;
// Theorie: Fries und Rapport (3/2: Ornament im Raum ist dasselbe Motiv nebeneinander), Material als Widerstand (7/1).
import { T, sanft, mix } from './werkzeug.js';
import { steinplatte, BREIT } from './stein-gemeinsam.js';

const PER = BREIT / 4, BAND = 0.5, Y0 = 0.05, FUGE = 0.009, TIEF = 0.07, SAEGE = 0.32;
// ein Mäanderhaken je Periode, im Einheitsquadrat, in der Reihenfolge, in der geschnitten wird: zuerst der Haken von unten links
// hinauf, hinüber und in die Spirale hinein, dann (die Säge wird abgesetzt) die Grundlinie bis zum nächsten Haken
const HAKEN = [[0, 0], [0, 1], [0.75, 1], [0.75, 0.3], [0.35, 0.3], [0.35, 0.62], [0.52, 0.62]];
const SEGS = [];
for (let i = 0; i < HAKEN.length - 1; i++) SEGS.push([HAKEN[i], HAKEN[i + 1]]);
SEGS.push([[0, 0], [1, 0]]);
// Länge des Wegs je Periode und Anfang jedes Teilstücks (in Metern auf dem Stein)
const GUSSWEG = 2.3;   // Abstand des Vergusses hinter dem Kopf, in Metern Weg (rund drei Viertel einer Periode)
const LSEG = SEGS.map(([[ax, ay], [bx, by]]) => Math.hypot((bx - ax) * PER, (by - ay) * BAND));
const ANF = LSEG.reduce((l, x, i) => (l.push(i ? l[i - 1] + LSEG[i - 1] : 0), l), []), LPER = ANF[ANF.length - 1] + LSEG[LSEG.length - 1];
/** Abstand zum Mäander und Weglänge der nächsten Stelle, gezählt vom Anfang des Steins (über alle Perioden) */
function maeander(xs, y) {
  const k0 = Math.floor(xs / PER), v = (y - (Y0 - BAND / 2)) / BAND;
  let d = Infinity, weg = 0;
  for (const k of [k0 - 1, k0, k0 + 1]) SEGS.forEach(([[ax, ay], [bx, by]], j) => {
    const px = xs - k * PER, py = v * BAND, x1 = ax * PER, y1 = ay * BAND, x2 = bx * PER, y2 = by * BAND;
    const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)));
    const e = Math.hypot(px - x1 - t * dx, py - y1 - t * dy);
    if (e < d) { d = e; weg = k * LPER + ANF[j] + t * LSEG[j]; }
  });
  return [d, weg];
}

export async function baue({ szene, kamera, renderer }) {
  const s = await steinplatte({ szene, renderer });
  for (const t of [s.stoff.map, s.stoff.normalMap]) { t.wrapS = t.wrapT = T.RepeatWrapping; t.needsUpdate = true; }
  const xs0 = new Float32Array(s.N), ys = new Float32Array(s.N), nah = new Uint8Array(s.N);
  for (let i = 0; i < s.N; i++) { xs0[i] = s.pos.getX(i); ys[i] = s.pos.getY(i); nah[i] = Math.abs(ys[i] - Y0) < BAND / 2 + 0.03 ? 1 : 0; }
  // die Höhe des Steins muss mitgleiten: Höhenwerte einer Zeile werden verschoben gelesen
  const NX = s.geo.parameters.widthSegments + 1, SP = NX - 1;   // Punkte je Zeile; Spalte 0 und SP sind dieselbe Stelle (Kachel)
  const zeile = (i) => Math.floor(i / NX);
  function stelle(p) {
    const schub = p * BREIT;   // so weit ist der Stein unter der Säge durchgeglitten
    // so weit hat der Schneidkopf den Weg abgefahren: im Mittel bleibt er an derselben Stelle im Bild, auf den senkrechten und
    // gewundenen Stücken bleibt er zurück, auf der Grundlinie holt er auf (nach einer Schleife genau vier Perioden)
    const kopf = (SAEGE + schub) / PER * LPER;
    s.stoff.map.offset.x = s.stoff.normalMap.offset.x = p;
    for (let i = 0; i < s.N; i++) {
      // Höhe des Steins an der verschobenen Stelle (die Kachel wiederholt sich)
      const j = zeile(i), k = i - j * NX, q = k + p * SP, k0 = Math.floor(q), f = q - k0, a0 = k0 % SP, a1 = (k0 + 1) % SP;
      const g = s.grund[j * NX + a0] * (1 - f) + s.grund[j * NX + a1] * f;
      let z = g, glanz = 0, r = 1, gg = 1, b = 1;
      if (nah[i]) {
        const x = xs0[i], [d, weg] = maeander(x + schub, ys[i]);
        const kante = Math.max(0, Math.min(1, 0.5 + (FUGE - d) / 0.0025));
        // der Schneidkopf folgt dem Weg: geschnitten ist, was er schon abgefahren hat; vergossen wird eine Strecke dahinter
        const geschnitten = sanft((kopf - weg) / 0.01), vergossen = sanft((kopf - GUSSWEG - weg) / 0.06);
        const staub = kante * Math.exp(-Math.max(0, kopf - weg) / 0.05) * geschnitten;
        if (kante > 0 && geschnitten > 0) {
          z = g - TIEF * kante * geschnitten * (1 - vergossen);
          const dunkel = 1 - 0.72 * kante * geschnitten * (1 - vergossen) + 1.6 * staub;   // frischer Steinstaub am Kopf ist hell
          r = dunkel; gg = dunkel; b = dunkel * 0.98;
          if (vergossen > 0) {   // Messing in der Fuge, bündig geschliffen
            z = mix(z, Math.min(g, 0.075), vergossen * kante);
            r = mix(r, 1.55, vergossen * kante); gg = mix(gg, 1.08, vergossen * kante); b = mix(b, 0.36, vergossen * kante);
            glanz = vergossen * kante;
          }
        }
      }
      s.pos.setZ(i, z); s.glanz[i] = glanz; s.farbeV[i * 3] = r; s.farbeV[i * 3 + 1] = gg; s.farbeV[i * 3 + 2] = b;
    }
    s.fertig();
    s.licht(p, mix(0.08, 0.32, 0.5 + 0.5 * Math.sin(Math.PI * 2 * p)), 1.2);
    kamera.position.set(-0.05, 2.55, -Y0 + 1.35); kamera.lookAt(-0.05, 0, -Y0 - 0.05);
  }
  return { stelle };
}
