// Gekoppelte Tempi: ein Räderwerk aus vier Ringen wie Epizykel, Guillochiermaschine und Astrolabium. Jeder Ring sitzt auf der Marke des
// vorigen und dreht in seinem eigenen Tempo (1, −3, 5 und −7 Umdrehungen je Schleife). Weil die Tempi ganzzahlig gekoppelt sind, kehrt die
// Figur nach 30 s genau zurück. Die Spitze zeichnet eine Spur, die hinter ihr dünner wird und verlischt; die Radien der Ringe atmen, darum
// wandelt sich die Rosette, die sie schreibt, fortwährend: Stern, Blüte, Schleifen.
import { T, TAU, welle, mix, stelleKamera, kugeln, schlauchGeometrie } from './werkzeug.js';

const TEMPI = [1, -3, 5, -7], PERLEN = [12, 9, 7, 5], SPUR = 0.46, SCHRITTE = 900;

export function baue({ szene, kamera, mat }) {
  const halter = new T.Group(); szene.add(halter); halter.scale.setScalar(0.92);
  const reife = TEMPI.map((_, i) => { const x = new T.Mesh(new T.BufferGeometry(), i % 2 ? mat.kreide : mat.messing2); halter.add(x); return x; });
  const perlen = TEMPI.map((_, i) => { const x = kugeln(PERLEN[i], i % 2 ? mat.kreide : mat.messing, 14); halter.add(x); return x; });
  const marken = kugeln(TEMPI.length + 1, mat.perle, 24); halter.add(marken);
  const spur = new T.Mesh(new T.BufferGeometry(), mat.messing), geist = new T.Mesh(new T.BufferGeometry(), mat.kreide); halter.add(spur, geist);
  const v = new T.Vector3(), ziel = new T.Vector3();
  const radien = q => [0.5, mix(0.2, 0.3, welle(q)), mix(0.06, 0.2, welle(q, 0.3)), mix(0.03, 0.11, welle(2 * q, 0.1))];
  /** Mittelpunkte der Ringe und die Spitze zur Phase q; die Radien gehören zur Phase r */
  const kette = (q, r) => {
    const rad = radien(r), pkt = [new T.Vector3(0, 0, 0)];
    TEMPI.forEach((t, i) => { const a = TAU * t * q + Math.PI / 2, o = pkt[i]; pkt.push(new T.Vector3(o.x + rad[i] * Math.cos(a), o.y + rad[i] * Math.sin(a), 0.03 * (i + 1))); });
    return { pkt, rad };
  };

  function stelle(p) {
    const { pkt, rad } = kette(p, p);
    TEMPI.forEach((t, i) => {
      reife[i].geometry.dispose(); reife[i].geometry = new T.TorusGeometry(rad[i], 0.011, 8, 160);
      reife[i].position.copy(pkt[i]);
      for (let j = 0; j < PERLEN[i]; j++) {
        const a = TAU * t * p + Math.PI / 2 + TAU * (j + 0.5) / PERLEN[i];
        perlen[i].setze(j, v.set(pkt[i].x + rad[i] * Math.cos(a), pkt[i].y + rad[i] * Math.sin(a), pkt[i].z), 0.022);
      }
      perlen[i].fertig();
      marken.setze(i, pkt[i], i ? 0.034 : 0.05);
    });
    marken.setze(TEMPI.length, pkt[TEMPI.length], 0.045); marken.fertig();
    // die Spur der Spitze: die letzten 46 % der Schleife, jeder Punkt mit den Radien seines eigenen Augenblicks
    const sp = [], sr = [];
    for (let k = 0; k <= SCHRITTE; k++) {
      const f = k / SCHRITTE, q = p - SPUR * (1 - f), e = kette(q, q).pkt[TEMPI.length];
      sp.push(e.setZ(0.15)); sr.push(0.003 + 0.03 * Math.pow(f, 1.6));
    }
    spur.geometry.dispose(); spur.geometry = schlauchGeometrie(sp, sr, 8);
    // die ganze Figur zu den Radien dieses Augenblicks als feine Kreidelinie: was die Spitze schriebe, wenn nichts sich wandelte
    const gp = [];
    for (let k = 0; k <= 1400; k++) gp.push(kette(k / 1400, p).pkt[TEMPI.length].setZ(-0.02));
    geist.geometry.dispose(); geist.geometry = schlauchGeometrie(gp, gp.map(() => 0.0055), 5);
    halter.rotation.x = -mix(0.1, 0.8, welle(p, 0.08));
    stelleKamera(kamera, ziel, mix(4.5, 4.1, welle(p)), 0.1, 0.4 * Math.sin(TAU * p));
  }
  return { stelle };
}
