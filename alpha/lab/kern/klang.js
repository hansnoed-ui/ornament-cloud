// ORNAMENT LAB – Klang ohne DOM: Stimmungen, Klangfarben, Hüllkurve, Nachhall und WAV. Der Klangerzeuger (operationen/klang.js) rechnet
// damit Abtastwerte in reinem JavaScript, nicht mit Web Audio: so ist derselbe Startwert in jedem Browser und in Node derselbe Klang
// (bis auf die Rundung auf 16 Bit). Web Audio braucht das Lab nur zum Lesen fremder Tondateien und zum Kodieren der Tonspur.

export const RATE = 44100;

export const STIMMUNGEN = [
  { wert: "pentatonik", name: "pentatonisch (5 Stufen je Oktave)" },
  { wert: "chromatisch", name: "chromatisch (12 Halbtöne)" },
  { wert: "obertoene", name: "Obertonreihe über dem Grundton" },
  { wert: "gleitend", name: "gleitend (stufenlos)" },
];
export const KLANGFARBEN = [
  { wert: "sinus", name: "Sinus" },
  { wert: "hell", name: "hell (vier Teiltöne 1, 1/2, 1/3, 1/4)" },
  { wert: "fm", name: "FM, harmonisch (Verhältnis 2:1)" },
  { wert: "glocke", name: "FM, glockenartig (Verhältnis 1,4:1)" },
];
const PENTA = [0, 2, 4, 7, 9];

/**
 * Stelle x (0 unten … 1 oben) im Tonraum → Frequenz in Hz. Der Raum reicht vom Grundton über «umfang» Oktaven;
 * die Stimmung rastet auf ihre Stufen ein (gleitend: gar nicht).
 */
export function tonhoehe(x, { grundton, umfang, stimmung }) {
  const u = Math.min(1, Math.max(0, x));
  if (stimmung === "gleitend") return grundton * 2 ** (u * umfang);
  if (stimmung === "obertoene") return grundton * (1 + Math.round(u * (2 ** umfang - 1)));
  if (stimmung === "chromatisch") return grundton * 2 ** (Math.round(u * umfang * 12) / 12);
  const stufen = Math.round(u * umfang * PENTA.length), okt = Math.floor(stufen / PENTA.length);
  return grundton * 2 ** (okt + PENTA[stufen % PENTA.length] / 12);
}

const TAU = 2 * Math.PI;
/** eine Schwingung an der Phase ph (in Zyklen) in der gewählten Klangfarbe, Spitze etwa 1 */
export function schwingung(ph, farbe) {
  if (farbe === "hell") return (Math.sin(TAU * ph) + Math.sin(2 * TAU * ph) / 2 + Math.sin(3 * TAU * ph) / 3 + Math.sin(4 * TAU * ph) / 4) / 1.6;
  if (farbe === "fm") return Math.sin(TAU * ph + 1.5 * Math.sin(2 * TAU * ph));
  if (farbe === "glocke") return Math.sin(TAU * ph + 2.2 * Math.sin(1.4 * TAU * ph));
  return Math.sin(TAU * ph);
}

/** ein Ton: { t, dauer, frequenz, staerke } mit Anschlag (linear) und Abklingen (exponentiell) in den Puffer addieren */
export function ton(puffer, rate, { t, frequenz, staerke }, { farbe, anschlag, abklingen }) {
  const a = Math.max(1, Math.round(anschlag * rate)), lang = a + Math.round(abklingen * 5 * rate);
  const start = Math.round(t * rate), ende = Math.min(puffer.length, start + lang), schritt = frequenz / rate;
  let ph = 0;
  for (let i = Math.max(0, start); i < ende; i++) {
    const k = i - start, h = k < a ? k / a : Math.exp(-(k - a) / (abklingen * rate));
    puffer[i] += staerke * h * schwingung(ph, farbe);
    ph += schritt;
  }
}

/** Nachhall: vier parallele Kammfilter mit Dämpfung, dann zwei Allpässe (Schroeder 1962, Verzögerungen wie in Freeverb, Hypothese) */
export function nachhall(pcm, rate, anteil) {
  if (anteil <= 0) return pcm;
  const f = rate / 44100, kaemme = [1116, 1188, 1277, 1356].map((d) => Math.round(d * f)), allpaesse = [556, 441].map((d) => Math.round(d * f));
  const nass = new Float32Array(pcm.length), rueck = 0.7 + 0.25 * anteil;
  for (const d of kaemme) {
    const p = new Float32Array(d); let j = 0, tief = 0;
    for (let i = 0; i < pcm.length; i++) { const y = p[j]; tief = y * 0.6 + tief * 0.4; p[j] = pcm[i] + tief * rueck; nass[i] += y / 4; j = (j + 1) % d; }
  }
  for (const d of allpaesse) {
    const p = new Float32Array(d); let j = 0;
    for (let i = 0; i < nass.length; i++) { const b = p[j], x = nass[i]; nass[i] = -x + b; p[j] = x + b * 0.5; j = (j + 1) % d; }
  }
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] * (1 - anteil * 0.5) + nass[i] * anteil;
  return out;
}

/** auf eine Spitze von −1 dBFS bringen, Anfang und Ende 10 ms einblenden; gibt die Verstärkung zurück */
export function abschliessen(pcm, rate) {
  let spitze = 0;
  for (const v of pcm) spitze = Math.max(spitze, Math.abs(v));
  const g = spitze > 1e-9 ? 0.89 / spitze : 0, rand = Math.min(pcm.length >> 1, Math.round(0.01 * rate));
  for (let i = 0; i < pcm.length; i++) pcm[i] *= g * Math.min(1, i / rand, (pcm.length - 1 - i) / rand);
  return g;
}

/** einkanaliges PCM → WAV-Datei (16 Bit) */
export function wavBytes(pcm, rate = RATE) {
  const n = pcm.length, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const text = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  text(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); text(8, "WAVE"); text(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); text(36, "data"); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, pcm[i])) * 32767), true);
  return new Uint8Array(buf);
}

/** eine 16-Bit-PCM-WAV lesen (mono oder gemischt) → { pcm, rate }; für Node und als Rückfall, der Browser nimmt Web Audio */
export function wavLesen(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (o) => String.fromCharCode(...bytes.subarray(o, o + 4));
  if (text(0) !== "RIFF" || text(8) !== "WAVE") throw new Error("keine WAV-Datei");
  let o = 12, rate = 0, kanaele = 1, bits = 16;
  while (o + 8 <= bytes.length) {
    const id = text(o), len = v.getUint32(o + 4, true);
    if (id === "fmt ") { kanaele = v.getUint16(o + 10, true); rate = v.getUint32(o + 12, true); bits = v.getUint16(o + 22, true); }
    if (id === "data") {
      if (bits !== 16) throw new Error(`WAV mit ${bits} Bit wird hier nicht gelesen`);
      const n = Math.floor(len / 2 / kanaele), pcm = new Float32Array(n);
      for (let i = 0; i < n; i++) { let s = 0; for (let c = 0; c < kanaele; c++) s += v.getInt16(o + 8 + (i * kanaele + c) * 2, true); pcm[i] = s / kanaele / 32768; }
      return { pcm, rate };
    }
    o += 8 + len + (len % 2);
  }
  throw new Error("WAV ohne Daten");
}
