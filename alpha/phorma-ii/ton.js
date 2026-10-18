// PHORMA II – Ton (ohne DOM, auch in Node für die Tests): eine Tonspur wird vorab in Kurven je Filmbild zerlegt, die die Effekte steuern
// (Wunsch vom 17. Oktober 2026 nach einem Video von Pauric Freeman – Modularsynthesizer, auf dem Bildschirm Bänder aus feinen Linien und Buchstaben –:
// «überlegen wir uns, wie wir solche Effekte hinbekommen, für Texte und Audiofiles»). Alles wird vorab gerechnet, der Film bleibt eine Funktion
// der Zeit.
//   laut, tief, mitte, hoch – Lautstärke und drei Bänder (Tiefpass 200 Hz, 200 Hz – 3 kHz, Hochpass 3 kHz), je Filmbild 0..1 (95 % = 1), geglättet
//                              (schnell herauf, langsam herunter)
//   fluss                    – wie stark der Klang gerade einsetzt (Anstieg der Bänder über die beiden Bilder davor, logarithmisch)
//   einsaetze                – [{ t, staerke }] Spitzen im Fluss über einer gleitenden Schwelle, mindestens 0,18 s auseinander
//   energie                  – die «Zeit der Musik»: Integral über (0,05 + 0,5 · laut² + 8 · stoss) – zwischen den Schlägen steht sie fast, bei
//                              jedem Schlag macht sie einen Satz –, springt bei Schnitten (um 0,8)
//   spektrum                 – je Filmbild 32 Bänder (FFT 2048, logarithmisch 40 Hz – 12 kHz), je Band normiert, herauf in 2, herunter in 6 Bildern
//   stoss, stossTief, stossHoch – Hüllkurven der Einsätze (alle; die mit vor allem Bass, 0,3 s; die mit vor allem Höhen, 0,12 s)
//   dreh                     – ein Winkel, der bei jedem kräftigen Einsatz in 0,3 s um ± Stärke schwingt (die Bänder schwingen im Takt)
//   tor                      – die Tinte: bei jedem Einsatz auf, 0,35 s halten, 0,7 s abklingen, nie unter 0,35 · laut (Rückmeldungen: «die Dynamik
//                              näher beim Video», dann «etwas viel Weiss»)
// (Rückmeldung vom 18. Oktober 2026: «nicht gesehen, dass die Animation sich auf die Musik bezog, sie scheint einfach ein wenig rumzuwabern»)
// Ohne Tonspur: ruhige, wiederholbare Ersatzkurven (ersatz).
export const FPS = 30;
export const BAENDER = 32;

const klemm = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
function perzentil(q, p) { const s = Float32Array.from(q).sort(); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] || 1; }

/** pcm: Float32Array (mono), rate: Abtastrate. Ergebnis: { dauer, n, laut, tief, mitte, hoch, fluss, einsaetze, schnitte, energie } */
export function tonAnalysieren(pcm, rate, { spektrum = true } = {}) {
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
  const fluss = new Float32Array(n), flussBand = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  for (let b = 1; b < n; b++) {
    let f = 0, j = 0;
    // gegen das Maximum der beiden Bilder davor und erst ab einem merklichen Anstieg: ein stehender Ton zittert sonst von Bild zu Bild
    for (const k of ["tief", "mitte", "hoch"]) { const d = Math.max(0, Math.log1p(roh[k][b] * 50) - Math.log1p(Math.max(roh[k][b - 1], roh[k][Math.max(0, b - 2)]) * 50) - 0.06); flussBand[j++][b] = d; f += d; }
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
  return mitEinsaetzen({ dauer: pcm.length / rate, n, ...kurven, fluss, flussBand, spektrum: spektrum ? spektrumRechnen(pcm, rate, n) : null, echt: true });
}

/** je Filmbild 32 logarithmische Bänder aus einer FFT (2048, Hann), je Band auf das 95. Perzentil normiert, schnell herauf, rasch herunter */
function spektrumRechnen(pcm, rate, n) {
  const N = 2048, proBild = rate / FPS, fenster = new Float32Array(N), re = new Float32Array(N), im = new Float32Array(N);
  for (let i = 0; i < N; i++) fenster[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  const rev = new Uint16Array(N);
  for (let i = 0, j = 0; i < N; i++) { rev[i] = j; let bit = N >> 1; while (j & bit) { j ^= bit; bit >>= 1; } j |= bit; }
  const cos = new Float32Array(N / 2), sin = new Float32Array(N / 2);
  for (let i = 0; i < N / 2; i++) { cos[i] = Math.cos((2 * Math.PI * i) / N); sin[i] = -Math.sin((2 * Math.PI * i) / N); }
  const oben = Math.min(12000, rate * 0.45), grenzen = [];
  for (let k = 0; k <= BAENDER; k++) grenzen.push(Math.max(1, Math.round(((40 * Math.pow(oben / 40, k / BAENDER)) / rate) * N)));
  const roh = new Float32Array(n * BAENDER);
  for (let b = 0; b < n; b++) {
    const mitte = Math.round((b + 0.5) * proBild);
    for (let i = 0; i < N; i++) { const j = mitte - N / 2 + i, x = j >= 0 && j < pcm.length ? pcm[j] * fenster[i] : 0; re[rev[i]] = x; im[rev[i]] = 0; }
    for (let groesse = 2; groesse <= N; groesse <<= 1) {
      const halb = groesse >> 1, schritt = N / groesse;
      for (let i = 0; i < N; i += groesse) for (let j = 0; j < halb; j++) {
        const c = cos[j * schritt], s = sin[j * schritt], a = i + j, e = a + halb;
        const tr = re[e] * c - im[e] * s, ti = re[e] * s + im[e] * c;
        re[e] = re[a] - tr; im[e] = im[a] - ti; re[a] += tr; im[a] += ti;
      }
    }
    for (let k = 0; k < BAENDER; k++) {
      const a = grenzen[k], z = Math.max(a + 1, grenzen[k + 1]);
      let m = 0; for (let i = a; i < z && i < N / 2; i++) m += Math.hypot(re[i], im[i]);
      roh[b * BAENDER + k] = Math.log1p((m / (z - a)) * 8);
    }
  }
  const sp = new Float32Array(n * BAENDER), spalte = new Float32Array(n);
  for (let k = 0; k < BAENDER; k++) {
    for (let b = 0; b < n; b++) spalte[b] = roh[b * BAENDER + k];
    const p = perzentil(spalte, 0.95) || 1, q = perzentil(spalte, 0.2);
    let v = 0;
    for (let b = 0; b < n; b++) { const x = klemm((spalte[b] - q) / Math.max(1e-4, p - q)); v = x > v ? v + (x - v) * 0.5 : v + (x - v) * 0.15; sp[b * BAENDER + k] = v; }
  }
  return sp;
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
  // Hüllkurven der Einsätze und ein Winkel, der bei jedem kräftigen Einsatz springt
  const stoss = new Float32Array(n), stossTief = new Float32Array(n), stossHoch = new Float32Array(n), dreh = new Float32Array(n);
  einsaetze.forEach((e, i) => {
    const b0 = Math.round(e.t * FPS), fb = T.flussBand;
    // welches Band trägt den Einsatz? (ohne Bänder, im Ersatz: wiederholbar abwechselnd)
    let band = i % 3;
    if (fb) { let best = -1; for (let j = 0; j < 3; j++) if (fb[j][b0] > best) { best = fb[j][b0]; band = j; } }
    e.band = band;
    for (let b = b0; b < Math.min(n, b0 + FPS * 1.5); b++) {
      const dt = (b - b0) / FPS, an = Math.min(1, (b - b0 + 1) / 3);         // in drei Bildern herauf: keine Sprünge zwischen den Lagen
      stoss[b] = Math.max(stoss[b], an * e.staerke * Math.exp(-dt / 0.2));
      if (band === 0) stossTief[b] = Math.max(stossTief[b], an * e.staerke * Math.exp(-dt / 0.3));
      if (band === 2) stossHoch[b] = Math.max(stossHoch[b], an * e.staerke * Math.exp(-dt / 0.12));
    }
  });
  let fertig = 0, ei = 0, laufend = [];
  const kraeftig = einsaetze.filter((e) => e.staerke > 0.35);
  for (let b = 0; b < n; b++) {
    const t = b / FPS;
    while (ei < kraeftig.length && kraeftig[ei].t <= t) { const e = kraeftig[ei]; laufend.push({ t: e.t, w: (Math.sin(e.t * 12.9898 + ei * 4.1) > 0 ? 1 : -1) * e.staerke * 1.3 }); ei++; }
    let summe = fertig;
    laufend = laufend.filter((s) => { const x = Math.min(1, (t - s.t) / 0.3); if (x >= 1) { fertig += s.w; summe += s.w; return false; } summe += s.w * x * x * (3 - 2 * x); return true; });
    dreh[b] = summe;
  }
  // die Zeit der Musik: sie läuft vor allem bei den Einsätzen – zwischen den Schlägen steht die Form fast, bei jedem Schlag macht sie einen Satz
  const energie = new Float32Array(n);
  let E = 0, si = 0;
  for (let b = 0; b < n; b++) {
    while (si < schnitte.length && schnitte[si] <= b / FPS) { E += 0.8; si++; }
    E += (0.05 + 0.5 * laut[b] ** 2 + 8 * stoss[b]) / FPS; energie[b] = E;
  }
  // das Tor: bei jedem Einsatz geht die Tinte auf (in zwei Bildern), hält 0,25 s und klingt in 0,4 s ab – zwischen den Schlägen leeres Papier
  // (wie im Video von Pauric Freeman: jedes Bild erscheint mit einem Ton und verschwindet mit ihm)
  const tor = new Float32Array(n);
  for (const e of einsaetze) {
    const b0 = Math.round(e.t * FPS), h = 0.55 + 0.45 * Math.min(1, e.staerke * 1.4);
    for (let b = b0; b < Math.min(n, b0 + FPS * 3); b++) {
      const dt = (b - b0) / FPS, v = h * Math.min(1, (b - b0 + 1) / 2) * (dt < 0.35 ? 1 : Math.exp(-(dt - 0.35) / 0.7));
      if (v > tor[b]) tor[b] = v;
    }
  }
  for (let b = 0; b < n; b++) tor[b] = Math.max(tor[b], 0.35 * laut[b]);   // seit «etwas viel Weiss»: länger offen, nie ganz zu, solange es klingt
  return { ...T, einsaetze, schnitte, energie, stoss, stossTief, stossHoch, dreh, tor };
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
  const spektrum = new Float32Array(n * BAENDER);
  for (let b = 0; b < n; b++) for (let k = 0; k < BAENDER; k++) {
    const t = b / FPS, x = k / BAENDER;
    spektrum[b * BAENDER + k] = klemm(0.35 + 0.3 * Math.sin(t * (1.1 + 2 * x) + k * 0.7) * Math.sin(t * 0.4 + x * 5) + 0.25 * Math.sin(t * 3.1 + k));
  }
  return mitEinsaetzen({ dauer, n, laut, tief, mitte, hoch, fluss, spektrum, echt: false });
}

let vorrat = null;
/** die echte Tonspur oder ohne sie überall (Gewebe, Fragmente, Video-Linien) derselbe Ersatz – gleiche Einsätze, gleiche Schnitte */
export const tonOderErsatz = (ton) => ton ?? (vorrat ??= ersatz(130));

/** Filmzeiten, zu denen das Gewebe eines Videos neue Linien bekommt: die Schnitte im Gewebe (G: { von, bis } in Filmzeit), höchstens max */
export const wechselZeiten = (T, G, max = 23) => T.schnitte.filter((s) => s > G.von + 0.3 && s < G.bis - 1).slice(0, max);

/**
 * Gewebe: die Zustände – bei jedem kräftigen Einsatz (Stärke ≥ 0,45, mindestens 0,7 s nach dem letzten) ein neues Bild: andere Fläche, andere
 * Einstellung; Lücken über 4 s alle 3 s gefüllt. Je Zustand wiederholbar gewürfelt: nacht (Weiss auf Schwarz, etwa jeder dritte, nur ab einem
 * Schnitt) und zeichen (das Zeichen selbst statt der Fläche, etwa jeder fünfte; nur mit Text, Foto oder Video). [{ t, nr, nacht, zeichen }] in Filmzeit.
 */
export function gewebeZustaende(T, von, bis) {
  const z = [];
  let letzt = von;
  const dazu = (t) => { const nr = z.length + 1, h = (k) => { const x = Math.sin(nr * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
    z.push({ t, nr, nacht: T.schnitte.some((s) => Math.abs(s - t) < 0.05) ? h(1) < 0.5 : h(1) < 0.15, zeichen: h(2) < 0.2 }); letzt = t; };
  for (const e of T.einsaetze) {
    if (e.t <= von + 0.4 || e.t >= bis - 0.8) continue;
    while (e.t - letzt > 4) dazu(letzt + 3);
    if (e.staerke >= 0.45 && e.t - letzt >= 0.7) dazu(e.t);
  }
  while (bis - 0.8 - letzt > 4) dazu(letzt + 3);
  return z;
}

/** der Zustand zur Filmzeit t: { nr (0 = der erste), t0, nacht, zeichen } */
export function zustandBei(Z, t, von) {
  let i = -1;
  for (let k = 0; k < Z.length && Z[k].t <= t; k++) i = k;
  return i < 0 ? { nr: 0, t0: von, nacht: false, zeichen: false } : { ...Z[i], t0: Z[i].t };
}

/** Wert einer Kurve zur Zeit t (Sekunden), linear zwischen den Filmbildern */
export function wert(kurve, t) {
  const f = klemm(t * FPS, 0, kurve.length - 1), i = Math.floor(f), u = f - i;
  return kurve[i] + ((kurve[Math.min(kurve.length - 1, i + 1)] ?? kurve[i]) - kurve[i]) * u;
}
