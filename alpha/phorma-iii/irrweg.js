// PHORMA III – der Weg der Irrfahrt (ohne DOM und three.js, auch in Node für die Tests): ein Zufallsweg im Würfel und Züge zu einem Weg verbunden,
// je PN Punkte (x, y, z, 1) für eine Zeile der Textur in irrfahrt.js.
export const PN = 2048, RAND = 0.47;

/** Mulberry32 */
export function zufallsfolge(s) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** ein Zufallsweg im Würfel (±RAND): er hält seine Richtung eine Weile (sonst bliebe er auf einem Fleck), schlägt Haken, springt selten weit,
 *  wird an den Wänden gespiegelt; darüber ein feines Zittern je Punkt wie im Vorbild. PN Punkte (x, y, z, 1) */
export function irrweg(saat, n = PN) {
  const r = zufallsfolge(saat * 7919 + 13), p = new Float32Array(n * 4);
  let x = (r() - 0.5) * 0.4, y = (r() - 0.5) * 0.4, z = (r() - 0.5) * 0.4, vx = r() - 0.5, vy = r() - 0.5, vz = r() - 0.5;
  const kurve = 0.3 + 0.35 * r(), weit = 0.004 + 0.003 * r(), zittern = 0.004 + 0.006 * r();
  for (let i = 0; i < n; i++) {
    const haken = r() < 0.025 ? 2.5 : kurve;
    vx += (r() - 0.5) * haken; vy += (r() - 0.5) * haken; vz += (r() - 0.5) * haken;
    const l = Math.hypot(vx, vy, vz) || 1; vx /= l; vy /= l; vz /= l;
    const s = weit * (0.4 + r()) * (r() < 0.02 ? 6 : 1);
    x += vx * s; y += vy * s; z += vz * s;
    if (Math.abs(x) > RAND) { x = Math.sign(x) * (2 * RAND - Math.abs(x)); vx = -vx; }
    if (Math.abs(y) > RAND) { y = Math.sign(y) * (2 * RAND - Math.abs(y)); vy = -vy; }
    if (Math.abs(z) > RAND) { z = Math.sign(z) * (2 * RAND - Math.abs(z)); vz = -vz; }
    p.set([x + (r() - 0.5) * zittern, y + (r() - 0.5) * zittern, z + (r() - 0.5) * zittern, 1], i * 4);
  }
  return p;
}

/** Züge (je [x, y, z, …]) zu einem Weg aus PN Punkten verbinden, gleichmässig nach der Länge abgetastet */
export function verbinden(zuege, n = PN) {
  const roh = zuege.flat();
  const m = roh.length / 3, L = [0];
  for (let i = 1; i < m; i++) L.push(L[i - 1] + Math.hypot(roh[3 * i] - roh[3 * i - 3], roh[3 * i + 1] - roh[3 * i - 2], roh[3 * i + 2] - roh[3 * i - 1]));
  const p = new Float32Array(n * 4), ges = L[m - 1] || 1;
  for (let k = 0, j = 0; k < n; k++) {
    const ziel = (k / (n - 1)) * ges;
    while (j < m - 2 && L[j + 1] < ziel) j++;
    const u = Math.min(1, Math.max(0, (ziel - L[j]) / (L[j + 1] - L[j] || 1)));
    for (let c = 0; c < 3; c++) p[k * 4 + c] = roh[3 * j + c] + (roh[3 * j + 3 + c] - roh[3 * j + c]) * u;
    p[k * 4 + 3] = 1;
  }
  return p;
}
