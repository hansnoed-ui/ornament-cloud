// Falte · Draperie: das Bild als Tuch, das auf einem Tisch liegt (Position Based Dynamics, auf dem Prozessor)
// Gitter aus Punkten mit Abständen längs, quer, diagonal und über zwei Maschen (Biegung). Der Tisch hält das Tuch mit
// Reibung fest; wer es an einer Stelle hebt und zieht, staucht den Stoff davor und spannt ihn dahinter: die Falten
// entstehen von selbst, weil der Stoff nicht kürzer werden kann und nur nach oben ausweichen kann.
// Gerechnet in Bildhöhen (x bis zum Seitenverhältnis), y nach oben, z über dem Tisch.

export function tuchBauen(seite, punkte) {
  // Maschenweite so, dass rund «punkte» Punkte das Bild bedecken
  const m = Math.sqrt(seite / punkte);
  const NX = Math.max(8, Math.round(seite / m) + 1), NY = Math.max(8, Math.round(1 / m) + 1), N = NX * NY;
  const hx = seite / (NX - 1), hy = 1 / (NY - 1);
  const x = new Float64Array(N), y = new Float64Array(N), z = new Float64Array(N);
  const ox = new Float64Array(N), oy = new Float64Array(N), oz = new Float64Array(N);
  const rx = new Float64Array(N), ry = new Float64Array(N);
  const frei = new Float64Array(N).fill(1);   // 1: frei, 0: von der Hand gehalten
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) { const k = j * NX + i; rx[k] = i * hx; ry[k] = j * hy; }

  // Bindungen: a, b, Ruhelänge, Art (0 längs/quer, 1 diagonal, 2 Biegung)
  const A = [], B = [], R = [], T = [];
  const bind = (a, b, t) => { A.push(a); B.push(b); R.push(Math.hypot(rx[a] - rx[b], ry[a] - ry[b])); T.push(t); };
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
    const k = j * NX + i;
    if (i + 1 < NX) bind(k, k + 1, 0);
    if (j + 1 < NY) bind(k, k + NX, 0);
    if (i + 1 < NX && j + 1 < NY) { bind(k, k + NX + 1, 1); bind(k + 1, k + NX, 1); }
    if (i + 2 < NX) bind(k, k + 2, 2);
    if (j + 2 < NY) bind(k, k + 2 * NX, 2);
  }
  // in Schachbrett-Reihenfolge, damit sich die Korrekturen nicht in eine Richtung aufschaukeln
  const nb = A.length, ca = new Int32Array(nb), cb = new Int32Array(nb), cr = new Float64Array(nb), ct = new Uint8Array(nb);
  const ord = [...Array(nb).keys()].sort((p, q) => (T[p] - T[q]) || (((A[p] % NX) + ((A[p] / NX) | 0)) % 2) - (((A[q] % NX) + ((A[q] / NX) | 0)) % 2));
  ord.forEach((o, n) => { ca[n] = A[o]; cb[n] = B[o]; cr[n] = R[o]; ct[n] = T[o]; });

  const t = {
    NX, NY, N, seite, hx, hy, x, y, z, rx, ry,
    aktiv: false, heim: 0, energie: 0, hoehe: 0, stauchung: 0,
    griffe: [],
    // Ausgaben für die Grafik: Verschiebung (dx, dy, z, Stauchung) und Normale (nx, ny, nz, Höhle)
    lage: new Float32Array(N * 4), normale: new Float32Array(N * 4),
  };
  const zufall = (k) => { const s = Math.sin(k * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };

  t.ruhe = () => {
    for (let k = 0; k < N; k++) { x[k] = ox[k] = rx[k]; y[k] = oy[k] = ry[k]; z[k] = oz[k] = 0; frei[k] = 1; }
    t.aktiv = false; t.heim = 0; t.griffe = []; t.energie = 0; t.hoehe = 0;
  };
  t.ruhe();

  // eine Hand fasst zu: alle Punkte in einem kleinen Kreis werden gehalten, die Mitte am höchsten
  t.fassen = (id, px, py, radius) => {
    if (!t.aktiv) {
      // ein Hauch Unebenheit, sonst weiss der Stoff nicht, nach welcher Seite er ausweichen soll
      for (let k = 0; k < N; k++) { z[k] = oz[k] = 0.0006 * zufall(k); }
      t.aktiv = true;
    }
    t.heim = 0;
    const halt = [];
    for (let k = 0; k < N; k++) {
      const dx = x[k] - px, dy = y[k] - py, d2 = dx * dx + dy * dy;
      if (d2 < radius * radius && z[k] < 0.25) halt.push({ k, ox: dx, oy: dy, w: 1 - d2 / (radius * radius), z0: z[k] });
    }
    if (!halt.length) return false;
    t.griffe = t.griffe.filter((g) => g.id !== id);
    t.griffe.push({ id, hx: px, hy: py, zx: px, zy: py, halt, heben: 0 });
    for (const h of halt) frei[h.k] = 0;
    return true;
  };
  t.ziehen = (id, px, py) => { const g = t.griffe.find((g) => g.id === id); if (g) { g.zx = px; g.zy = py; } };
  t.lassen = (id) => {
    const g = t.griffe.find((g) => g.id === id); if (!g) return;
    t.griffe = t.griffe.filter((q) => q !== g);
    for (const h of g.halt) if (!t.griffe.some((q) => q.halt.some((e) => e.k === h.k))) frei[h.k] = 1;
  };
  // tau: wie rasch der Stoff zurückgleitet (Sekunden)
  t.loesen = (tau = 0.35) => { for (const g of [...t.griffe]) t.lassen(g.id); t.heim = tau; };

  // ein Schritt der Welt; p: { gewicht 0..1, falten 0..1, hub (Höhe der Hand) }
  t.schritt = (dt, p) => {
    if (!t.aktiv) return;
    const sub = Math.max(1, Math.min(6, Math.round(dt / (1 / (p.takt || 240)))));
    const h = dt / sub;
    const g = 2.2 + 3.0 * p.gewicht;                       // schwerer Stoff fällt rascher
    const kBieg = 0.06 + 0.42 * (1 - p.falten) * (0.6 + 0.8 * p.gewicht);   // weich: viele kleine Falten, steif: wenige grosse, runde
    const kDiag = 0.85;
    const reib = 0.55 + 0.35 * p.gewicht;                 // Haftung am Tisch
    const iter = p.iter || 4;
    let e = 0;
    for (let s = 0; s < sub; s++) {
      // die Hände gleiten innerhalb des Bildes gleichmässig zu ihrem Ziel
      for (const G of t.griffe) {
        const a = 1 / (sub - s);
        G.hx += (G.zx - G.hx) * a; G.hy += (G.zy - G.hy) * a;
        G.heben = Math.min(1, G.heben + h / 0.22);
      }
      // Verlet: Schwung, Schwere
      for (let k = 0; k < N; k++) {
        if (!frei[k]) continue;
        const vx = (x[k] - ox[k]) * 0.995, vy = (y[k] - oy[k]) * 0.995, vz = (z[k] - oz[k]) * 0.99;
        ox[k] = x[k]; oy[k] = y[k]; oz[k] = z[k];
        x[k] += vx; y[k] += vy; z[k] += vz - g * h * h;
      }
      // gehaltene Punkte folgen der Hand
      for (const G of t.griffe) {
        const hb = G.heben * G.heben * (3 - 2 * G.heben);
        for (const q of G.halt) {
          const k = q.k; ox[k] = x[k]; oy[k] = y[k]; oz[k] = z[k];
          x[k] = G.hx + q.ox; y[k] = G.hy + q.oy;
          z[k] = q.z0 + (p.hub * (0.35 + 0.65 * q.w)) * hb;
        }
      }
      // Bindungen
      for (let it = 0; it < iter; it++) {
        for (let n = 0; n < nb; n++) {
          const a = ca[n], b = cb[n];
          const wa = frei[a], wb = frei[b], w = wa + wb; if (w === 0) continue;
          const dx = x[b] - x[a], dy = y[b] - y[a], dz = z[b] - z[a];
          const l = Math.sqrt(dx * dx + dy * dy + dz * dz); if (l < 1e-9) continue;
          const art = ct[n];
          let k = art === 0 ? 1 : art === 1 ? kDiag : kBieg;
          let c = (l - cr[n]) / l;
          // Biegung wehrt sich nur gegen das Stauchen, nicht gegen das Dehnen (das tun die Maschen)
          if (art === 2 && c > 0) continue;
          c *= k / w;
          x[a] += dx * c * wa; y[a] += dy * c * wa; z[a] += dz * c * wa;
          x[b] -= dx * c * wb; y[b] -= dy * c * wb; z[b] -= dz * c * wb;
        }
      }
      // der Tisch: nichts sinkt unter ihn, und was aufliegt, haftet
      for (let k = 0; k < N; k++) {
        if (!frei[k]) continue;
        if (z[k] < 0) {
          const tief = -z[k]; z[k] = 0; oz[k] = Math.min(oz[k], 0);
          const vx = x[k] - ox[k], vy = y[k] - oy[k], v = Math.hypot(vx, vy);
          // Haften: kleine Verschiebungen hält der Tisch ganz auf, grosse bremst er
          const halt = reib * (tief * 6 + 0.00025);
          const f = v <= halt ? 1 : halt / v;
          x[k] -= vx * f; y[k] -= vy * f;
        }
      }
      // zurück an den Platz (Lösen, oder von selbst nach dem Loslassen): nach der Haftung, damit der Tisch es nicht
      // aufhebt; der Stoff behält seine Reibung und glättet sich so gleichmässig, im Takt von tau
      if (t.heim > 0) {
        const kh = 1 - Math.exp(-h / t.heim);
        for (let k = 0; k < N; k++) { if (!frei[k]) continue; const ax = (rx[k] - x[k]) * kh, ay = (ry[k] - y[k]) * kh; x[k] += ax; y[k] += ay; ox[k] += ax; oy[k] += ay; z[k] -= z[k] * kh * 0.3; }
      }
    }
    // Bewegung (für den Ton) und Höhe
    let hoch = 0;
    for (let k = 0; k < N; k++) { const vx = x[k] - ox[k], vy = y[k] - oy[k], vz = z[k] - oz[k]; e += vx * vx + vy * vy + vz * vz; if (z[k] > hoch) hoch = z[k]; }
    t.energie = Math.sqrt(e / N) / h;
    t.hoehe = hoch;
    if (t.heim > 0) {
      let fehl = 0; for (let k = 0; k < N; k++) fehl = Math.max(fehl, Math.abs(x[k] - rx[k]) + Math.abs(y[k] - ry[k]) + z[k]);
      if (fehl < 0.0004) t.ruhe();
    }
  };

  // für die Grafik: Verschiebung, Normale und wie tief eine Stelle zwischen den Falten liegt
  const zw = new Float64Array(N), zw2 = new Float64Array(N);
  t.ausgeben = () => {
    const L = t.lage, M = t.normale;
    let st = 0;
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const k = j * NX + i;
      const kl = i > 0 ? k - 1 : k, kr = i < NX - 1 ? k + 1 : k, ku = j > 0 ? k - NX : k, ko = j < NY - 1 ? k + NX : k;
      const ux = x[kr] - x[kl], uy = y[kr] - y[kl], uz = z[kr] - z[kl];
      const vx = x[ko] - x[ku], vy = y[ko] - y[ku], vz = z[ko] - z[ku];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      // Stauchung: wie viel kleiner die Masche von oben gesehen ist als in Ruhe
      const flaeche = Math.abs(ux * vy - uy * vx) / ((rx[kr] - rx[kl]) * (ry[ko] - ry[ku]) || 1);
      const sc = Math.max(0, Math.min(1, 1 - flaeche));
      st += sc;
      L[k * 4] = x[k] - rx[k]; L[k * 4 + 1] = y[k] - ry[k]; L[k * 4 + 2] = z[k]; L[k * 4 + 3] = sc;
      M[k * 4] = nx; M[k * 4 + 1] = ny; M[k * 4 + 2] = nz;
      zw[k] = z[k];
    }
    // Höhle: die Höhe der Umgebung (zweimal weich gemittelt) über der eigenen
    for (let r = 0; r < 2; r++) {
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
        const k = j * NX + i; let s = 0, n = 0;
        for (let d = -2; d <= 2; d++) { const ii = i + d; if (ii >= 0 && ii < NX) { s += zw[k + d]; n++; } }
        zw2[k] = s / n;
      }
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
        const k = j * NX + i; let s = 0, n = 0;
        for (let d = -2; d <= 2; d++) { const jj = j + d; if (jj >= 0 && jj < NY) { s += zw2[k + d * NX]; n++; } }
        zw[k] = s / n;
      }
    }
    for (let k = 0; k < N; k++) M[k * 4 + 3] = Math.max(0, zw[k] - z[k]);
    t.stauchung = st / N;   // wie viel vom Tuch gestaucht in Falten liegt (Mittel)
  };
  return t;
}
