// Gotische Linie (17. Formschleife, zu docs/gotische-linie.md): eine einzige Linie. Am Anfang liegt sie als Mäander auf einem Ring, mit
// Periode, Mitte und Rahmen (Rapport: das Auge führt). Dann verliert sie nacheinander ihre Periode, ihre Mitte und ihren Massstab und
// läuft als Linie ohne Umriss über das ganze Feld und darüber hinaus (Worringers nordische Linie, bei Deleuze die Hand, die dem Auge
// davonläuft). Der Mäander bleibt als feine Kreidelinie stehen, als Schablone, von der sich die Linie löst und zu der sie zurückkehrt.
// Drei Perlen laufen als Federn auf der Linie, in der Kurve langsamer, wie eine Hand zeichnet (Zwei-Drittel-Gesetz: Tempo ~ Krümmung^(−1/3));
// die Linie schwillt in der Kurve an wie ein Federzug. In der Mitte der Schleife verlässt die Kamera den Überblick und fährt einer Feder nach.
import { T, TAU, welle, sanft, mix, kugeln, schlauchGeometrie } from './werkzeug.js';
import { rngFrom } from '/alpha/formen/gemeinsam.js?v=1';

const SEG = 3200, K = 14, R = 0.78, HARM = 26;

export function baue({ szene, kamera, mat }) {
  const r = rngFrom(1911);
  // die freie Linie: Summe von Schwingungen mit fallender Stärke, jede dreht ihre Phase um ganze Umläufe je Schleife
  const harm = [];
  for (let n = 1; n <= HARM; n++) {
    const st = (n === 1 ? 0.55 : 0.95 / Math.pow(n, 1.05)) * (0.6 + 0.8 * r());
    harm.push({ n, ax: st * (r() < 0.5 ? -1 : 1), ay: st * (r() < 0.5 ? -1 : 1), px: r() * TAU, py: r() * TAU, m: n === 1 ? 0 : Math.round(r() * 2 - 1) });
  }
  const halter = new T.Group(); szene.add(halter);
  const linie = new T.Mesh(new T.BufferGeometry(), mat.messing), schablone = new T.Mesh(new T.BufferGeometry(), mat.kreide);
  const federn = kugeln(3, mat.perle, 24);
  halter.add(schablone, linie, federn);
  /** der Mäander auf dem Ring; mit «los» verliert er zuerst seinen Takt (jeder Zahn anders), dann seine Zähne */
  const rapport = (s, out, los = 0) => {
    const th = TAU * s, w = Math.tanh(3.2 * Math.sin(K * th + 2.4 * los * Math.sin(3 * th + 1))) / Math.tanh(3.2);
    const rr = R + 0.13 * w * Math.pow(1 - los, 1.5) * (1 + 2.2 * los * Math.sin(5 * th + 1) * Math.sin(2 * th));
    return out.set(rr * Math.cos(th), rr * Math.sin(th), 0);
  };
  const sp = Array.from({ length: SEG + 1 }, (_, i) => rapport(i / SEG, new T.Vector3()).setZ(-0.05));
  schablone.geometry = schlauchGeometrie(sp, sp.map(() => 0.0045), 5);
  const pkt = Array.from({ length: SEG + 1 }, () => new T.Vector3()), rad = new Float32Array(SEG + 1), zeit = new Float32Array(SEG + 1);
  const a = new T.Vector3(), b = new T.Vector3(), ort = new T.Vector3(), vor = new T.Vector3(), blick = new T.Vector3(), mitte = new T.Vector3();

  /** Ort auf der Linie zur Federzeit q (0–1): die Feder ist in der Kurve langsamer */
  function anFeder(q, out) {
    const zq = ((q % 1) + 1) % 1 * zeit[SEG]; let lo = 0, hi = SEG;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (zeit[m] <= zq) lo = m; else hi = m; }
    return out.lerpVectors(pkt[lo], pkt[hi], (zq - zeit[lo]) / Math.max(1e-9, zeit[hi] - zeit[lo]));
  }

  function stelle(p) {
    const frei = sanft((welle(p) - 0.08) / 0.84);          // 0 Rapport, 1 freie Linie
    const gross = mix(1, 1.55, sanft((welle(p) - 0.45) / 0.55));   // die Linie wächst über das Bild hinaus
    for (let i = 0; i <= SEG; i++) {
      const s = i / SEG; let x = 0, y = 0;
      for (const h of harm) { x += h.ax * Math.cos(TAU * h.n * s + h.px + TAU * h.m * p); y += h.ay * Math.sin(TAU * h.n * s + h.py + TAU * h.m * p); }
      rapport(s, a, frei);
      pkt[i].set(mix(a.x, x * gross, frei), mix(a.y, y * gross, frei), 0.05 * frei * Math.sin(TAU * 37 * s));
    }
    // Krümmung je Punkt; daraus Federzeit (Zwei-Drittel-Gesetz) und Schwellzug
    zeit[0] = 0;
    for (let i = 0; i <= SEG; i++) {
      const v = pkt[(i + SEG - 1) % SEG], n = pkt[(i + 1) % SEG], m = pkt[i % SEG];
      a.subVectors(m, v); b.subVectors(n, m);
      const la = a.length(), lb = b.length(), kr = a.cross(b).length() / Math.max(1e-9, la * lb * (la + lb) / 2);
      const k3 = Math.cbrt(Math.min(60, kr) + 0.4);
      rad[i] = mix(0.016, 0.009 + 0.0075 * k3, frei);
      if (i > 0) zeit[i] = zeit[i - 1] + k3 * pkt[i].distanceTo(pkt[i - 1]);
    }
    linie.geometry.dispose(); linie.geometry = schlauchGeometrie(pkt, Array.from(rad), 8, true);
    for (let i = 0; i < 3; i++) federn.setze(i, anFeder(p + i / 3, ort), 0.04);
    federn.fertig();
    schablone.visible = true;
    // Kamera: Überblick, in der Mitte der Schleife Fahrt hinter der ersten Feder her
    const nah = 0.62 * sanft((welle(p) - 0.72) / 0.28);
    anFeder(p, ort); anFeder(p + 0.012, vor);
    mitte.set(0, -0.2 * welle(p), mix(4.4, 3.7, welle(p)));
    kamera.position.copy(mitte).lerp(a.set(ort.x * 0.9, ort.y * 0.9 - 0.5, 2.0), nah);
    blick.set(0, 0, 0).lerp(b.copy(ort).lerp(vor, 0.5), nah);
    kamera.up.set(0, 1, 0);
    kamera.lookAt(blick);
  }
  return { stelle };
}
