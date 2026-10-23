// ORNAMENT LAB – Tonsignal (Kopplungsoperation, Medienwechsel Klang → Steuerdaten). Adapter auf die Tonanalyse von PHORMA III
// (alpha/phorma-iii/ton.js, unverändert und ohne DOM): Lautstärke, drei Bänder, spektraler Fluss, Einsätze, 32 Spektralbänder je Filmbild.
// Übertragen aus dem Hüllkurvenfolger der Modularsynthese, dem Audio Spectrum CHOP von TouchDesigner und env~/bonk~ in Pure Data:
// ein Klang wird zu einer Kurve, die wie jedes andere Steuersignal Parameter moduliert (docs/AUDIO-FORMAT.md).
//
// Das Steuersignal trägt seine Zeit mit (achse «zeit», dauer, je): ein zeitlicher Parameterverlauf. Die Modulation liest es an der Stelle
// u = 0 … 1, also an der Zeit beginn + u · dauer. Über die Varianten werden so Momente des Klangs nebeneinander gestellt, über die Zeit
// (Feedback, Komposition) folgt die Bildfolge dem Klang. Die Einsätze kommen zusätzlich als Ereignisfolge heraus.
import { tonAnalysieren, FPS, BAENDER } from "../../../alpha/phorma-iii/ton.js?v=23";

const MERKMALE = [
  { wert: "laut", name: "Hüllkurve (Lautstärke)" },
  { wert: "tief", name: "Band tief (unter 200 Hz)" },
  { wert: "mitte", name: "Band Mitte (200 Hz – 3 kHz)" },
  { wert: "hoch", name: "Band hoch (über 3 kHz)" },
  { wert: "schwerpunkt", name: "spektraler Schwerpunkt (hell oder dunkel)" },
  { wert: "fluss", name: "spektraler Fluss (wie stark es einsetzt)" },
  { wert: "einsaetze", name: "Einsätze (Hüllkurve je Anschlag)" },
];
const rund = (x, s = 10000) => Math.round(x * s) / s;

/** spektraler Schwerpunkt je Filmbild aus den 32 logarithmischen Bändern: 0 = alles im tiefsten Band, 1 = alles im höchsten */
function schwerpunkt(spektrum, n) {
  const out = new Float32Array(n);
  for (let b = 0; b < n; b++) {
    let s = 0, g = 0;
    for (let k = 0; k < BAENDER; k++) { const v = spektrum[b * BAENDER + k]; s += v * k; g += v; }
    out[b] = g > 1e-6 ? s / g / (BAENDER - 1) : 0;
  }
  return out;
}

export const tonsignal = {
  id: "lab.tonsignal",
  name: "Tonsignal",
  version: "0.1.0",
  klasse: "kopplung",
  herkunft: { art: "adapter", quelle: "PHORMA III (Tonanalyse)", referenz: "Hüllkurvenfolger (Modularsynthese); TouchDesigner Audio Spectrum CHOP; Pure Data env~ und bonk~", datei: "alpha/phorma-iii/ton.js (v=23, unverändert), alpha/lab/operationen/tonsignal.js" },
  beschreibung: "Misst ein Merkmal einer Tondatei über die Zeit und gibt es als Steuersignal aus, dazu die Einsätze als Ereignisfolge.",
  eingaenge: [{ name: "ton", typ: "AUDIO" }],
  ausgaenge: [{ name: "signal", typ: "CONTROL_SIGNAL" }, { name: "einsaetze", typ: "EVENT_SEQUENCE" }],
  parameter: [
    { id: "merkmal", name: "Merkmal", art: "wahl", standard: "laut", optionen: MERKMALE },
    { id: "beginn", name: "Ausschnitt ab (s)", art: "zahl", min: 0, max: 600, standard: 0, schritt: 0.5 },
    { id: "laenge", name: "Ausschnitt Länge (s, 0 = bis zum Ende)", art: "zahl", min: 0, max: 600, standard: 0, schritt: 0.5 },
    { id: "proben", name: "Proben (Mittelung über gleich lange Abschnitte)", art: "zahl", min: 8, max: 1024, standard: 120, schritt: 1 },
    { id: "normieren", name: "auf 0–1 strecken", art: "schalter", standard: true },
  ],
  voraussetzungen: ["Web Audio (decodeAudioData) zum Lesen der Datei; die Analyse selbst läuft auch in Node"],
  ressourcen: { zeit: "ein Durchgang über die Abtastwerte, mit Spektrum eine FFT (2048) je Filmbild", speicher: "der Klang einkanalig als Gleitkommazahlen" },
  reproduzierbar: "ja",
  varianten: "keine",

  async ausfuehren({ ton }, p) {
    const { pcm, rate } = ton, gesamt = pcm.length / rate;
    const beginn = Math.min(p.beginn, gesamt), ende = p.laenge > 0 ? Math.min(gesamt, beginn + p.laenge) : gesamt;
    if (ende - beginn < 0.1) throw new Error(`Tonsignal: der Ausschnitt ist leer (Ton ${rund(gesamt, 100)} s, ab ${p.beginn} s)`);
    const stueck = pcm.subarray(Math.floor(beginn * rate), Math.floor(ende * rate)), dauer = stueck.length / rate;
    const A = tonAnalysieren(stueck, rate, { spektrum: p.merkmal === "schwerpunkt" });
    const kurve = p.merkmal === "schwerpunkt" ? schwerpunkt(A.spektrum, A.n) : p.merkmal === "einsaetze" ? A.stoss : A[p.merkmal];
    // je Probe der Mittelwert über ihren Abschnitt (bei Einsätzen das Maximum, damit ein Anschlag nicht verschwimmt)
    const n = Math.round(p.proben), spitze = p.merkmal === "einsaetze";
    let werte = Array.from({ length: n }, (_, k) => {
      const a = Math.floor((k * A.n) / n), z = Math.max(a + 1, Math.floor(((k + 1) * A.n) / n));
      let s = 0, m = 0;
      for (let b = a; b < Math.min(z, A.n); b++) { s += kurve[b]; m = Math.max(m, kurve[b]); }
      return spitze ? m : s / (Math.min(z, A.n) - a || 1);
    });
    const roh = { min: Math.min(...werte), max: Math.max(...werte) };
    if (p.normieren && roh.max - roh.min > 1e-6) werte = werte.map((v) => (v - roh.min) / (roh.max - roh.min));
    werte = werte.map((v) => rund(Math.min(1, Math.max(0, v))));
    const name = MERKMALE.find((m) => m.wert === p.merkmal).name.split(" (")[0];
    const zeit = `${rund(beginn, 10)}–${rund(ende, 10)} s`;
    const ereignisse = A.einsaetze.map((e) => ({ t: rund(e.t, 1000), staerke: rund(e.staerke, 1000), band: ["tief", "mitte", "hoch"][e.band] }));
    return {
      ausgaben: [
        { typ: "CONTROL_SIGNAL", titel: `Ton: ${name}, ${zeit}`, daten: { werte, achse: "zeit", merkmal: p.merkmal, einheit: "0–1", beginn: rund(beginn, 1000), dauer: rund(dauer, 1000), je: rund(dauer / n, 1e6), quelle: "ton" } },
        { typ: "EVENT_SEQUENCE", titel: `Einsätze: ${ereignisse.length}, ${zeit}`, daten: { art: "einsaetze", ereignisse, beginn: rund(beginn, 1000), dauer: rund(dauer, 1000), einheit: "s", quelle: "ton" } },
      ],
      protokoll: {
        ausschnitt: { beginn: rund(beginn, 1000), ende: rund(ende, 1000), dauer: rund(dauer, 1000), gesamt: rund(gesamt, 1000) }, abtastrate: rate,
        analyse: { filmbilder: A.n, fps: FPS, einsaetze: A.einsaetze.length, schnitte: A.schnitte.length, spektrum: p.merkmal === "schwerpunkt" ? `${BAENDER} Bänder` : "nicht gerechnet" },
        rohbereich: { min: rund(roh.min, 1000), max: rund(roh.max, 1000) }, proben: n,
        hinweis: "Messung, keine Bewertung. Hüllkurven und Bänder sind auf das 95. Perzentil normiert und geglättet (schnell herauf, langsam herunter), wie in PHORMA III.",
      },
    };
  },
};
