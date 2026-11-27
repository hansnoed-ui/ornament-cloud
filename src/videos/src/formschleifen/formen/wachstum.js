// Wachstum: eine Ranke wie in der Arabeske und im Rankenfries. Sechs Triebe wachsen aus einer Mitte, jeder krümmt sich immer enger und
// endet in einer Volute; aus jedem Trieb gehen Seitentriebe nach derselben Regel ab, mit kleinen Abweichungen von Arm zu Arm. Die Ranke
// wächst, steht einen Atemzug, und zieht sich dann denselben Weg zurück in die Mitte, aus der sie kam.
import { T, TAU, sanft, mix, stelleKamera, schlauchGeometrie, kugeln } from './werkzeug.js';
import { rngFrom, knopf } from '/alpha/formen/gemeinsam.js?v=1';

const ARME = 6, TIEFE = 3, TEMPO = 0.32, RING = 10;

export function baue({ szene, kamera, mat }) {
  const r = rngFrom(4731), aeste = [];
  const halter = new T.Group(), ranke = new T.Group(); halter.add(ranke); szene.add(halter);

  function ast(start, dir, bin, L, r0, tief, seite, t0, eigen) {
    const n = Math.max(30, Math.round(L / 0.008)), ds = L / n;
    const pkt = [start.clone()], rad = [r0], d = dir.clone(), b = bin.clone();
    const kinder = tief > 0 ? [{ f: 0.3 + 0.05 * eigen, s: -seite }, { f: 0.52 + 0.04 * eigen, s: seite }] : [];
    let kind = 0;
    for (let i = 1; i <= n; i++) {
      const u = i / n, kappa = seite * (0.9 + eigen * 0.1 + 22 * u * u * u) / L;
      d.applyAxisAngle(b, kappa * ds).normalize();
      b.applyAxisAngle(d, 0.35 * seite * ds).normalize();
      pkt.push(pkt[i - 1].clone().addScaledVector(d, ds));
      rad.push(r0 * (1 - 0.78 * u));
      if (kind < kinder.length && u >= kinder[kind].f) {
        const k = kinder[kind++], nd = d.clone().applyAxisAngle(b, -k.s * 1.2);
        ast(pkt[i].clone(), nd, b.clone(), L * (0.56 + 0.05 * (r() - 0.5)), rad[i] * 0.85, tief - 1, k.s, t0 + (u * L) / TEMPO, eigen);
      }
    }
    const mesh = new T.Mesh(schlauchGeometrie(pkt, rad, RING), tief === TIEFE ? mat.messing : mat.messing2);
    ranke.add(mesh);
    aeste.push({ mesh, pkt, rad, n, t0, dauer: L / TEMPO, ende: rad[n] * 2.6 + 0.012 });
  }
  for (let i = 0; i < ARME; i++) {
    const a = TAU * i / ARME, eigen = (r() - 0.5) * 2;   // jede Wiederholung weicht ein wenig ab
    const dir = new T.Vector3(Math.cos(a), Math.sin(a), 0.12).normalize();
    const bin = new T.Vector3(0, 0, 1); bin.addScaledVector(dir, -bin.dot(dir)).normalize();
    ast(new T.Vector3(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0), dir, bin, 0.82 * (1 + 0.06 * eigen), 0.03, TIEFE, 1, 0, eigen);
  }
  const knospen = kugeln(aeste.length, mat.perle); ranke.add(knospen);
  const mitte = knopf(0.085, 0.06, 2, 48, mat.messing); ranke.add(mitte);
  const gesamt = Math.max(...aeste.map(x => x.t0 + x.dauer));
  // Grösse so, dass die volle Ranke ins Bild passt
  let weit = 0; for (const x of aeste) for (const q of x.pkt) weit = Math.max(weit, Math.hypot(q.x, q.y));
  ranke.scale.setScalar(0.95 / weit);
  const v = new T.Vector3(), ziel = new T.Vector3();

  function stelle(p) {
    // wachsen (p 0,02–0,56), stehen, zurückziehen (p 0,7–0,98)
    const g = gesamt * (p < 0.63 ? sanft((p - 0.02) / 0.54) : 1 - sanft((p - 0.7) / 0.28));
    aeste.forEach((x, i) => {
      const f = Math.min(1, Math.max(0, (g - x.t0) / x.dauer)), k = f * x.n, i0 = Math.floor(k);
      x.mesh.geometry.setDrawRange(0, Math.min(x.n, i0) * RING * 6);
      x.mesh.visible = f > 0;
      if (f <= 0) { knospen.setze(i, v.set(0, 0, 0), 0); return; }
      const j = Math.min(x.n, i0 + 1), t = k - i0;
      v.lerpVectors(x.pkt[i0], x.pkt[j], t);
      const bluete = sanft((g - (x.t0 + x.dauer)) / 2.2);
      knospen.setze(i, v, mix(x.rad[i0] * 1.1, x.ende, bluete));
    });
    knospen.fertig();
    mitte.scale.setScalar(mix(0.6, 1, sanft(g / 1.5)));
    halter.rotation.z = 0.12 * Math.sin(TAU * p);
    stelleKamera(kamera, ziel, 4.4, 0.32 * Math.sin(TAU * p + 0.6), 0.38 * Math.sin(TAU * p), 0);
  }
  return { stelle };
}
