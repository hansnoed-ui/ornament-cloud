// PHORMA II – Ton (ohne DOM, auch in Node für die Tests): eine Tonspur wird vorab in Kurven je Filmbild zerlegt, die die Effekte steuern
// (Wunsch vom 17. Oktober 2026 nach einem Video von Pauric Freeman – Modularsynthesizer, auf dem Bildschirm Bänder aus feinen Linien und Buchstaben –:
// «überlegen wir uns, wie wir solche Effekte hinbekommen, für Texte und Audiofiles»). Alles wird vorab gerechnet, der Film bleibt eine Funktion
// der Zeit.
//   laut, tief, mitte, hoch – Lautstärke und drei Bänder (Tiefpass 200 Hz, 200 Hz – 3 kHz, Hochpass 3 kHz), je Filmbild 0..1 (95 % = 1), geglättet
//                              (schnell herauf, langsam herunter)
//   fluss                    – wie stark der Klang gerade einsetzt (Anstieg der Bänder über die beiden Bilder davor, logarithmisch)
//   einsaetze                – [{ t, staerke }] Spitzen im Fluss über einer gleitenden Schwelle, mindestens 0,18 s auseinander
//   energie                  – die «Zeit der Musik»: Integral über (0,15 + laut), springt bei starken Einsätzen (Schnitte)
// Ohne Tonspur: ruhige, wiederholbare Ersatzkurven (ersatz).
export const FPS = 30;

const klemm = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
function perzentil(q, p) { const s = Float32Array.from(q).sort(); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] || 1; }

/** pcm: Float32Array (mono), rate: Abtastrate. Ergebnis: { dauer, n, laut, tief, mitte, hoch, fluss, einsaetze, schnitte, energie } */
export function tonAnalysieren(pcm, rate) {
  const proBild = rate / FPS, n = Math.max(1, Math.ceil(pcm.length / proBild));
  const a = (f) => 1 - Math.exp((-2 * Math.PI * f) / rate);               // Einpol-Tiefpass
  const a200 = a(200), a3k = a(3000);
  let t200 = 0, t3k = 0;
  const roh = { laut: new Float32Array(n), tief: new Float32Array(n), mitte: new Float32Array(n), hoch: new Float32Array(n) };
  for (let b = 0; b < n; b++) {
    const i0 = Math.floor(b * proBild), i1 = Math.min(pcm.length, Math.floor((b + 1) * proBild));
    let sl = 0, st = 0, sm = 0, sh = 0;
    for (let i = i0; i < i1; i++) {
      const x = pcm[i];
      t200 += a200 * (x - t200); t3k += a3k * (x - t3k);
      sl += x * x; st += t200 * t200; sm += (t3k - t200) ** 2; sh += (x - t3k) ** 2;
    }
    const m = Math.max(1, i1 - i0);
    roh.laut[b] = Math.sqrt(sl / m); roh.tief[b] = Math.sqrt(st / m); roh.mitte[b] = Math.sqrt(sm / m); roh.hoch[b] = Math.sqrt(sh / m);
  }
  const fluss = new Float32Array(n);
  for (let b = 1; b < n; b++) {
    let f = 0;
    // gegen das Maximum der beiden Bilder davor und erst ab einem merklichen Anstieg: ein stehender Ton zittert sonst von Bild zu Bild
    for (const k of ["tief", "mitte", "hoch"]) f += Math.max(0, Math.log1p(roh[k][b] * 50) - Math.log1p(Math.max(roh[k][b - 1], roh[k][Math.max(0, b - 2)]) * 50) - 0.06);
    fluss[b] = f;
  }
  const kurven = {};
  for (const k of ["laut", "tief", "mitte", "hoch"]) {
    const p = perzentil(roh[k], 0.95), q = new Float32Array(n);
    let v = 0;
    for (let b = 0; b < n; b++) { const x = klemm(roh[k][b] / (p || 1)); v = x > v ? v + (x - v) * 0.6 : v + (x - v) * 0.12; q[b] = v; }
    kurven[k] = q;
  }
  const pf = perzentil(fluss, 0.98);
  for (let b = 0; b < n; b++) fluss[b] = klemm(fluss[b] / (pf || 1));
  return mitEinsaetzen({ dauer: pcm.length / rate, n, ...kurven, fluss, echt: true });
}

/** Einsätze, Schnitte und die Zeit der Musik aus dem Fluss */
function mitEinsaetzen(T) {
  const { n, fluss, laut } = T, einsaetze = [], fenster = Math.round(FPS * 0.5);
  let zuletzt = -1e9;
  for (let b = 1; b < n - 1; b++) {
    let s = 0, c = 0;
    for (let j = Math.max(0, b - fenster); j < Math.min(n, b + fenster); j++) { s += fluss[j]; c++; }
    const schwelle = (s / c) * 1.6 + 0.08;
    if (fluss[b] > schwelle && fluss[b] >= fluss[b - 1] && fluss[b] >= fluss[b + 1] && b - zuletzt >= FPS * 0.18) { einsaetze.push({ t: b / FPS, staerke: fluss[b] }); zuletzt = b; }
  }
  // Schnitte: die stärksten Einsätze, mindestens 2 s auseinander, nicht gleich am Anfang
  const schnitte = [];
  for (const e of [...einsaetze].sort((x, y) => y.staerke - x.staerke)) {
    if (e.staerke < 0.6) break;
    if (e.t >= 0.8 && schnitte.every((s) => Math.abs(s - e.t) >= 2)) schnitte.push(e.t);
  }
  schnitte.sort((x, y) => x - y);
  const energie = new Float32Array(n);
  let E = 0, si = 0;
  for (let b = 0; b < n; b++) {
    while (si < schnitte.length && schnitte[si] <= b / FPS) { E += 2.5; si++; }
    E += (0.15 + laut[b]) / FPS; energie[b] = E;
  }
  return { ...T, einsaetze, schnitte, energie };
}

/** Ersatz ohne Tonspur: ein ruhiges Atmen und Einsätze in einem wiederholbaren, etwas unregelmässigen Takt */
export function ersatz(dauer) {
  const n = Math.ceil(dauer * FPS) + 1, laut = new Float32Array(n), tief = new Float32Array(n), mitte = new Float32Array(n), hoch = new Float32Array(n), fluss = new Float32Array(n);
  let s = 11;
  const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let b = 0; b < n; b++) {
    const t = b / FPS;
    laut[b] = 0.45 + 0.2 * Math.sin(t * 0.9) + 0.1 * Math.sin(t * 2.3 + 1);
    tief[b] = 0.4 + 0.25 * Math.sin(t * 0.6 + 2); mitte[b] = laut[b]; hoch[b] = 0.3 + 0.15 * Math.sin(t * 1.7);
  }
  for (let t = 1.2; t < dauer - 0.5; t += 0.9 + r() * 1.1) { const b = Math.round(t * FPS); fluss[b] = 0.5 + 0.5 * r(); }
  return mitEinsaetzen({ dauer, n, laut, tief, mitte, hoch, fluss, echt: false });
}

let vorrat = null;
/** die echte Tonspur oder ohne sie überall (Gewebe, Fragmente, Video-Linien) derselbe Ersatz – gleiche Einsätze, gleiche Schnitte */
export const tonOderErsatz = (ton) => ton ?? (vorrat ??= ersatz(130));

/** Filmzeiten, zu denen das Gewebe eines Videos neue Linien bekommt: die Schnitte im Gewebe (G: { von, bis } in Filmzeit), höchstens max */
export const wechselZeiten = (T, G, max = 23) => T.schnitte.filter((s) => s > G.von + 0.3 && s < G.bis - 1).slice(0, max);

/** Wert einer Kurve zur Zeit t (Sekunden), linear zwischen den Filmbildern */
export function wert(kurve, t) {
  const f = klemm(t * FPS, 0, kurve.length - 1), i = Math.floor(f), u = f - i;
  return kurve[i] + ((kurve[Math.min(kurve.length - 1, i + 1)] ?? kurve[i]) - kurve[i]) * u;
}
