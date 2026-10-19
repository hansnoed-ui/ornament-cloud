// PHORMA III – Verfrickeln (ohne DOM, auch in Node für die Tests): aus einer hochgeladenen Musik oder einem Sample wird ein neues Stück, wie es ein
// Modularsynthesizer aus Schnipseln baut (Wunsch vom 17. Oktober 2026: «Musik hochladen können, z. B. ein Sample, die dann verfrickelt wird – als
// Option»). Wiederholbar: derselbe Wurf (samen) ergibt dasselbe Stück.
//   Scheiben  – das Material wird an seinen Einsätzen zerschnitten (ton.js), lange Stücke in halbe Sekunden
//   Tempo     – aus dem mittleren Abstand der Einsätze, gefaltet auf 80–160 BPM; ein Raster aus Sechzehnteln, 12 oder 16 Takte
//   Muster    – je Sechzehntel ein Anschlag (auf den Schlägen fast immer, dazwischen je nach Stärke des Abschnitts); die Scheibe läuft meist weiter,
//               wiederholt sich oder springt; rückwärts, eine Oktave oder Quinte höher oder tiefer, zerhackt (Bitcrush), Wirbel am Taktende
//               (Stotter-Rolls), selten eine Wolke aus Körnern
//   Bogen     – leise und gefiltert hinein, dichter und offener zur Mitte, am Ende verebbt es; Tiefpass mit Resonanz, Ping-Pong-Echo im
//               punktierten Achtel, Hall (wie Freeverb)
//   Mastering – Gleichanteil weg, sanft verdichtet, auf −14 LUFS, Begrenzer mit Vorausschau auf −1 dBFS (seit 18. Oktober 2026, Wunsch: «den Sound
//               qualitativ optimieren»; vorher tanh-Sättigung auf −0,5 dB, je nach Material −9 bis −16 LUFS und Klicks aus dem Bitcrush)
import { tonAnalysieren } from "./ton.js?v=13";

/** wiederholbarer Zufall (mulberry32) */
function zufall(samen) {
  let a = (samen * 2654435761) >>> 0 || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const klemm = (x, a, b) => Math.min(b, Math.max(a, x));

/** Stärke des Abschnitts 0..1 über das Stück (x = 0..1): hinein, steigern, Höhepunkt, verebben */
export function bogen(x) {
  if (x < 0.25) return 0.3 + x;
  if (x < 0.75) return 0.55 + (x - 0.25) * 0.9;
  if (x < 0.875) return 1;
  return klemm(1 - (x - 0.875) * 6, 0.25, 1);
}

/**
 * kanaele: [Float32Array] (ein oder zwei), rate: Abtastrate. Ergebnis: { kanaele: [L, R], rate, dauer, bpm, takte, scheiben, anschlaege, plan }
 * (plan: die gesetzten Scheiben { start, m, a, b, tempo, rueck, versatz, gain, crush, art, teil, k } in Proben – daraus liest der Effekt Video, welche
 * Stelle läuft und was es ist: art "scheibe", "wirbel" (teil-mal wiederholt, die k-te) oder "korn"). koerner: wie oft eine Wolke aus Körnern kommt
 */
export function frickeln(kanaele, rate, { samen = 1, takte: wunsch = null, koerner = 0.05 } = {}) {
  const L0 = kanaele[0], R0 = kanaele[1] ?? kanaele[0], n = L0.length, r = zufall(samen);
  const mono = new Float32Array(n);
  let spitze = 1e-6;
  for (let i = 0; i < n; i++) { mono[i] = (L0[i] + R0[i]) / 2; spitze = Math.max(spitze, Math.abs(L0[i]), Math.abs(R0[i])); }
  const g0 = 0.8 / spitze, A = tonAnalysieren(mono, rate, { spektrum: false });

  // Scheiben an den Einsätzen; zu kurze an die vorige, lange in halbe Sekunden
  const schnitte = [0, ...A.einsaetze.map((e) => Math.round(Math.max(0, e.t - 0.01) * rate)), n].filter((v, i, a) => i === 0 || v > a[i - 1]);
  const scheiben = [], kurz = Math.round(0.06 * rate), halb = Math.round(0.5 * rate);
  for (let i = 0; i < schnitte.length - 1; i++) {
    let a = schnitte[i]; const b = schnitte[i + 1];
    if (b - a < kurz && scheiben.length) { scheiben.at(-1)[1] = b; continue; }
    while (b - a > 2 * halb) { scheiben.push([a, a + halb]); a += halb; }
    scheiben.push([a, b]);
  }
  if (!scheiben.length) scheiben.push([0, n]);
  const ns = scheiben.length;

  // Tempo aus dem mittleren Abstand der Einsätze, gefaltet auf 80–160 BPM (eine Oktave); langsam 12 Takte, sonst 16 – rund 25–36 s
  const abst = A.einsaetze.slice(1).map((e, i) => e.t - A.einsaetze[i].t).sort((x, y) => x - y);
  let schlag = abst.length >= 3 ? abst[abst.length >> 1] : 60 / 112;
  while (schlag < 60 / 160) schlag *= 2;
  while (schlag > 60 / 80) schlag /= 2;
  const bpm = Math.round(60 / schlag), takte = wunsch ?? (bpm < 110 ? 12 : 16), schritt = Math.round(((60 / bpm) / 4) * rate);
  const N = takte * 16 * schritt + Math.round(3 * rate);
  const L = new Float32Array(N), R = new Float32Array(N), sL = new Float32Array(N), sR = new Float32Array(N);

  // eine Scheibe ab «start» spielen: tempo (Tonhöhe), rückwärts, Panorama, Bitcrush, Anteil ins Echo. Gelesen mit 4-Punkt-Hermite (lineares Lesen
  // raut transponierte Schnipsel auf), weich ein- und ausgeblendet (Kosinus, 5 / 15 ms)
  const hermite = (x, j, f) => {
    const xm = x[j > 0 ? j - 1 : 0], x0 = x[j], x1 = x[j + 1], x2 = x[j + 2 < n ? j + 2 : j + 1];
    const c1 = 0.5 * (x1 - xm), c2 = xm - 2.5 * x0 + 2 * x1 - 0.5 * x2, c3 = 0.5 * (x2 - xm) + 1.5 * (x0 - x1);
    return ((c3 * f + c2) * f + c1) * f + x0;
  };
  function setzen(start, laenge, [a, b], { tempo = 1, rueck = false, pan = 0, gain = 1, crush = 0, senden = 0, versatz = 0, art = "scheibe", teil = 1, k = 0 } = {}) {
    const m = Math.min(laenge, Math.floor((b - a - versatz - 3) / tempo));
    if (m < 32) return 0;
    // der Fahrplan für das Bild (PHORMA III, Effekt Video): wo welche Stelle läuft, und was es ist – Scheibe, Wirbel (teil-mal, der k-te) oder Korn
    plan.push({ start, m, a, b, tempo, rueck, versatz, gain, crush, art, teil, k });
    const ein = Math.min(m / 4, 0.005 * rate), aus = Math.min(m / 2, 0.015 * rate);
    const w = ((klemm(pan, -1, 1) + 1) * Math.PI) / 4, gl = gain * g0 * Math.cos(w) * Math.SQRT2, gr = gain * g0 * Math.sin(w) * Math.SQRT2;
    // Bitcrush (Rückmeldung «den Sound qualitativ optimieren»): grobe Stufen und gehaltene Proben wie bisher, aber geglättet und nur zum Teil
    // beigemischt – vorher klickte jede Stufe (gemessen: alle Klicks im Ergebnis kamen von hier)
    const glatt = crush ? 1 - Math.exp(-2 * Math.PI * (3500 / rate)) : 0;     // Tiefpass um 3,5 kHz über den Stufen
    let hl = 0, hr = 0, zl = 0, zr = 0;
    for (let i = 0; i < m; i++) {
      const o = start + i; if (o >= N) break;
      const p = rueck ? b - 3 - versatz - i * tempo : a + 1 + versatz + i * tempo, j = p | 0, f = p - j;
      let l = hermite(L0, j, f), q = R0 === L0 ? l : hermite(R0, j, f);
      if (crush) {
        if (i % crush === 0) { hl = Math.round(l * g0 * 12) / (12 * g0); hr = Math.round(q * g0 * 12) / (12 * g0); }
        zl += (hl - zl) * glatt; zr += (hr - zr) * glatt;
        l = 0.5 * l + 0.5 * zl; q = 0.5 * q + 0.5 * zr;
      }
      const e = i < ein ? 0.5 - 0.5 * Math.cos((Math.PI * i) / ein) : 1, x = m - i < aus ? 0.5 - 0.5 * Math.cos((Math.PI * (m - i)) / aus) : 1, h = e * x;
      L[o] += l * h * gl; R[o] += q * h * gr;
      if (senden) { sL[o] += l * h * gl * senden; sR[o] += q * h * gr * senden; }
    }
    return m;
  }

  let zeiger = 0, anschlaege = 0;
  const plan = [];
  for (let t = 0; t < takte; t++) {
    const I = bogen((t + 0.5) / takte), zerhackt = t >= takte * 0.4 && r() < 0.35, wirbel = r() < 0.25 + 0.45 * I;
    for (let s = 0; s < 16;) {
      const start = (t * 16 + s) * schritt;
      if (wirbel && s >= 12) {
        // Wirbel am Taktende: dieselbe Scheibe immer kürzer wiederholt, lauter werdend
        const sc = scheiben[zeiger], teil = [1, 2, 4, 8][s - 12], g = schritt / teil;
        for (let k = 0; k < teil; k++) setzen(Math.round(start + k * g), Math.round(g), sc, { gain: 0.55 + 0.15 * (s - 12), pan: (s % 2 ? 0.3 : -0.3) * I, senden: s === 15 ? 0.7 : 0, art: "wirbel", teil, k });
        anschlaege++; s++; continue;
      }
      const druck = s % 4 === 0 ? 0.92 : s % 2 === 0 ? 0.3 + 0.45 * I : 0.12 + 0.45 * I;
      if (r() > druck) { s++; continue; }
      const w = r();
      if (w < 0.55) zeiger = (zeiger + 1) % ns; else if (w >= 0.8) zeiger = Math.floor(r() * ns);
      const dauer = Math.min(16 - s, [1, 1, 2, 2, 3, 4][Math.floor(r() * 6)]);
      const tempo = r() < 0.05 + 0.25 * I ? [0.5, 0.75, 1.5, 2, 0.5][Math.floor(r() * 5)] : 1;
      setzen(start, dauer * schritt, scheiben[zeiger], {
        tempo, rueck: r() < 0.08 + 0.12 * I, pan: (r() * 2 - 1) * 0.55 * I, gain: s % 4 === 0 ? 1 : 0.78,
        crush: zerhackt && r() < 0.6 ? [3, 5, 9][Math.floor(r() * 3)] : 0, senden: r() < 0.35 ? 0.6 : 0,
      });
      anschlaege++;
      // selten eine Wolke aus Körnern über zwei Sechzehntel
      if (r() < koerner * I) for (let k = 0; k < 24; k++) {
        const lang = Math.round((0.025 + 0.045 * r()) * rate), von = Math.floor(r() * Math.max(1, n - lang * 2));
        setzen(start + Math.floor(r() * 2 * schritt), lang, [von, Math.min(n, von + lang * 2 + 2)], { tempo: [1, 2, 0.5, 1.5][Math.floor(r() * 4)], pan: r() * 1.8 - 0.9, gain: 0.3, senden: 0.8, art: "korn" });
      }
      s += dauer;
    }
  }

  // Tiefpass mit Resonanz (TPT-SVF) über das Ganze: zu Beginn zu, zur Mitte offen, im Höhepunkt ein Wobbeln im Takt
  const ende = takte * 16 * schritt, takt = 16 * schritt;
  for (const [K, st] of [[L, { a: 0, b: 0 }], [R, { a: 0, b: 0 }]]) {
    let a1 = 1, a2 = 0, a3 = 0;
    for (let i = 0; i < N; i++) {
      if ((i & 31) === 0) {
        const x = Math.min(1, i / ende), I = bogen(x);
        const fc = klemm(500 * Math.pow(30, Math.min(1, x / 0.45)) * Math.pow(2, I > 0.9 ? 1.3 * Math.sin((2 * Math.PI * i) / (2 * takt)) : 0) * (x > 0.9 ? 1 - (x - 0.9) * 6 : 1), 200, rate * 0.45);
        const g = Math.tan((Math.PI * fc) / rate), k = 1 / (0.75 + 1.6 * I);
        a1 = 1 / (1 + g * (g + k)); a2 = g * a1; a3 = g * a2;
      }
      const v3 = K[i] - st.b, v1 = a1 * st.a + a2 * v3, v2 = st.b + a2 * st.a + a3 * v3;
      st.a = 2 * v1 - st.a; st.b = 2 * v2 - st.b; K[i] = v2;
    }
  }
  // Ping-Pong-Echo im punktierten Achtel auf dem Anteil, der dahin geschickt wurde
  const d = 3 * schritt, eL = new Float32Array(d), eR = new Float32Array(d);
  let tl = 0, tr = 0;
  for (let i = 0; i < N; i++) {
    const j = i % d, yl = eL[j], yr = eR[j];
    tl += 0.35 * (yr - tl); tr += 0.35 * (yl - tr);                      // die Wiederholungen werden dumpfer
    eL[j] = sL[i] + 0.45 * tr; eR[j] = sR[i] + 0.45 * tl;
    L[i] += 0.55 * yl; R[i] += 0.55 * yr;
  }
  // Hall wie Freeverb (je Seite acht Kammfilter mit Dämpfung, vier Allpässe, rechts gespreizt), 15 ms Vorverzögerung – der frühere mit vier
  // Kammfiltern klang metallisch
  const vor = Math.round(0.015 * rate), hl = hallFilter(rate, 0), hr = hallFilter(rate, 23);
  { const qL = new Float32Array(N), qR = new Float32Array(N);
    for (let i = vor; i < N; i++) { const x = (L[i - vor] + R[i - vor]) * 0.015; qL[i] = hl(x); qR[i] = hr(x); }
    for (let i = 0; i < N; i++) { L[i] += 0.55 * qL[i]; R[i] += 0.55 * qR[i]; } }

  meistern(L, R, rate);
  return { kanaele: [L, R], rate, dauer: N / rate, bpm, takte, scheiben: ns, anschlaege, plan };
}

/** der Hall wie Freeverb (acht Kammfilter mit Dämpfung, vier Allpässe; spreiz: Versatz der Längen für die rechte Seite) – auch für die Stimme */
export function hallFilter(rate, spreiz = 0, { rueck = 0.82, daempfung = 0.4 } = {}) {
  const m = rate / 44100;
  const kamm = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((l) => ({ b: new Float32Array(Math.round((l + spreiz) * m)), i: 0, z: 0 }));
  const all = [556, 441, 341, 225].map((l) => ({ b: new Float32Array(Math.round((l + spreiz) * m)), i: 0 }));
  return (x) => {
    let y = 0;
    for (const c of kamm) { const o = c.b[c.i]; c.z = o * (1 - daempfung) + c.z * daempfung; c.b[c.i] = x + c.z * rueck; if (++c.i === c.b.length) c.i = 0; y += o; }
    for (const a of all) { const o = a.b[a.i]; a.b[a.i] = y + o * 0.5; if (++a.i === a.b.length) a.i = 0; y = o - y; }
    return y;
  };
}

/**
 * Mastering (an Ort und Stelle): Gleichanteil weg (Hochpass), sanft verdichten (Effektivwert über 30 ms, 10 / 150 ms), auf eine Lautheit (BS.1770;
 * −14 LUFS ist üblich für soziale Medien), dann ein Begrenzer mit 3 ms Vorausschau auf −1 dBFS statt der früheren tanh-Sättigung (sie verzerrte je
 * nach Material verschieden stark); am Ende ausgeblendet. Auch für die Stimme (stimme.js).
 */
export function meistern(L, R, rate, { lufs = -14, schwelleDb = -20, verhaeltnis = 2, hochpass = 25, ausblenden = 1.5 } = {}) {
  const hp = Math.exp((-2 * Math.PI * hochpass) / rate), N = L.length;
  for (const K of [L, R]) { let x1 = 0, y1 = 0; for (let i = 0; i < N; i++) { const y = hp * (y1 + K[i] - x1); x1 = K[i]; y1 = y; K[i] = y; } }
  { const mittel = Math.exp(-1 / (0.03 * rate)), an = Math.exp(-1 / (0.01 * rate)), ab = Math.exp(-1 / (0.15 * rate)), schwelle = Math.pow(10, schwelleDb / 20);
    let quadrat = 0, g = 1;   // Effektivwert über 30 ms (eine Spitzenerkennung zuckte bei jeder Bitcrush-Stufe und klickte), Verstärkung geglättet
    for (let i = 0; i < N; i++) {
      quadrat = mittel * quadrat + (1 - mittel) * 0.5 * (L[i] * L[i] + R[i] * R[i]);
      const pegel = Math.sqrt(quadrat), ziel = pegel > schwelle ? Math.pow(pegel / schwelle, 1 / verhaeltnis - 1) : 1;
      g = ziel < g ? an * g + (1 - an) * ziel : ab * g + (1 - ab) * ziel;
      L[i] *= g; R[i] *= g;
    } }
  const lauf = lautheit(L, R, rate), auf = Number.isFinite(lauf) ? Math.pow(10, (lufs - lauf) / 20) : 1;
  { const decke = Math.pow(10, -1 / 20), voraus = Math.round(0.003 * rate), frei = Math.exp(-1 / (0.08 * rate)), angriff = 1 - Math.exp(-1 / (0.001 * rate)), spitze = new Float32Array(N);
    for (let i = 0; i < N; i++) spitze[i] = Math.max(Math.abs(L[i]), Math.abs(R[i])) * auf;
    let g = 1;
    const aus = Math.max(1, Math.round(ausblenden * rate));
    for (let i = 0; i < N; i++) {
      let p = 0; for (let k = i; k < Math.min(N, i + voraus); k += 4) p = Math.max(p, spitze[k]);
      const ziel = p > decke ? decke / p : 1;
      g = ziel < g ? g + (ziel - g) * angriff : frei * g + (1 - frei) * ziel;   // in 1 ms herunter (sofort klickte es), langsam wieder herauf
      const h = Math.min(1, (N - i) / aus);
      L[i] = Math.max(-decke, Math.min(decke, L[i] * auf * g)) * h; R[i] = Math.max(-decke, Math.min(decke, R[i] * auf * g)) * h;
    } }
}

/** Lautheit nach BS.1770 (K-Filter, Blöcke von 400 ms, absolutes und relatives Gate) in LUFS */
export function lautheit(L, R, rate) {
  // die Koeffizienten der Norm gelten für 48 kHz; für andere Raten aus den analogen Grössen neu berechnet
  const regal = (() => { const f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196, K = Math.tan((Math.PI * f0) / rate), Vh = 10 ** (G / 20), Vb = Vh ** 0.4996667741545416, a0 = 1 + K / Q + K * K;
    return [(Vh + (Vb * K) / Q + K * K) / a0, (2 * (K * K - Vh)) / a0, (Vh - (Vb * K) / Q + K * K) / a0, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0]; })();
  const hoch = (() => { const f0 = 38.13547087602444, Q = 0.5003270373238773, K = Math.tan((Math.PI * f0) / rate), a0 = 1 + K / Q + K * K;
    return [1, -2, 1, (2 * (K * K - 1)) / a0, (1 - K / Q + K * K) / a0]; })();
  const filter = (x, [b0, b1, b2, a1, a2]) => { const y = new Float32Array(x.length); let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < x.length; i++) { const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v; } return y; };
  const k = (x) => filter(filter(x, regal), hoch), kL = k(L), kR = k(R), blk = Math.round(0.4 * rate), hop = Math.round(0.1 * rate), bl = [];
  for (let s = 0; s + blk <= L.length; s += hop) { let e = 0; for (let i = s; i < s + blk; i++) e += kL[i] * kL[i] + kR[i] * kR[i]; bl.push(e / blk); }
  const lk = (z) => -0.691 + 10 * Math.log10(z), mittel = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const abs = bl.filter((z) => z > 0 && lk(z) > -70);
  if (!abs.length) return -Infinity;
  const rel = lk(mittel(abs)) - 10, g = abs.filter((z) => lk(z) > rel);
  return lk(mittel(g.length ? g : abs));
}

/** Stereo-WAV (16 Bit, mit dreieckigem Dither) für die Vorschau */
export function wav(kanaele, rate) {
  const k = kanaele.length, n = kanaele[0].length, b = new DataView(new ArrayBuffer(44 + n * k * 2));
  const text = (o, s) => { for (let i = 0; i < s.length; i++) b.setUint8(o + i, s.charCodeAt(i)); };
  text(0, "RIFF"); b.setUint32(4, 36 + n * k * 2, true); text(8, "WAVEfmt "); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, k, true);
  b.setUint32(24, rate, true); b.setUint32(28, rate * k * 2, true); b.setUint16(32, k * 2, true); b.setUint16(34, 16, true); text(36, "data"); b.setUint32(40, n * k * 2, true);
  let o = 44;
  let z = 12345;
  const zufall = () => { z = (z * 1103515245 + 12345) & 0x7fffffff; return z / 0x7fffffff; };
  for (let i = 0; i < n; i++) for (let c = 0; c < k; c++) { b.setInt16(o, Math.round(klemm(kanaele[c][i] * 32767 + zufall() - zufall(), -32768, 32767)), true); o += 2; }
  return new Uint8Array(b.buffer);
}
