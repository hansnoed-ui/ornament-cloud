// Natur 0.1.0 – organische Klangwelt: Walchor, Vogelschwarm, Gezeiten, Pflanzentextur und klassische Pads.
// Naturklänge sollen als erkennbare Atmosphäre funktionieren und sich stufenlos in Flächen, Drones und Texturen verwandeln lassen.
//
// Quellen: (1) eine eigene Aufnahme (Import, mit Lizenzangaben im Projekt), (2) eine prozedurale Quelle, die hier gerechnet wird und immer
// als «synthetisch» bezeichnet ist. Walgesang und Vogelrufe der synthetischen Quelle sind Modelle nach Beschreibungen der Klänge
// (gleitende Töne mit Obertönen; frequenzmodulierte Zwitscher, Triller, Pfiffe), keine Aufnahmen und keine nachgebildeten Aufnahmen.
// Wasser, Wind und Blasen folgen den Modellen aus Andy Farnells «Designing Sound» (Ideen nachgebaut, kein Code übernommen):
// gefiltertes Rauschen mit langsam zufälligen Hüllkurven, Blasen als Sinus mit Minnaert-Frequenz, steigend und schnell abklingend.
// Pflanzen: echte Ultraschallaufnahmen nur aus einem Import; ohne Import gibt es einen ausdrücklich so bezeichneten Demonstrationsmodus
// und die Sonifikation von Messdaten (Zahlenreihe). Es werden keine Pflanzensignale erfunden.
//
// Makros (je Familie unterschiedlich umgesetzt, Zuordnung unten in MAKROS): Dichte, Bewegung, Rauheit, Helligkeit, Raum, Tonalität,
// Verwandlung (0 = Original erkennbar, 100 = Fläche). Jede Stimme: rechne(werte, rate, kontext) → [L, R], Länge = kontext.dauer, als
// Schleife ohne Naht (der Überhang wird über den Anfang geblendet). Nach der Veröffentlichung nicht mehr verändern.

import { zufall, SVF, TAU, spitze } from "./grund.js";
import { halbtoene, grundFrequenz, LEITERN } from "../kern/linien.js";

const P = (key, name, gruppe, min, max, std, einheit = "", mehr = {}) => ({ key, name, gruppe, min, max, std, einheit, ...mehr });
const V = (name, beschreibung, werte) => ({ name, beschreibung, werte });
const MAKROS_STD = { dichte: 50, bewegung: 40, rauheit: 30, helligkeit: 40, raum: 50, tonalitaet: 30, verwandlung: 30 };
const MAKRO = (std = {}) => {
  const s = { ...MAKROS_STD, ...std };
  return [
    P("verwandlung", "Original / Verwandlung", "Makro", 0, 100, s.verwandlung, "%", { hilfe: "0 = der Ausgangsklang bleibt erkennbar, 100 = zusammenhängende Fläche" }),
    P("dichte", "Dichte", "Makro", 0, 100, s.dichte, "%"), P("bewegung", "Bewegung", "Makro", 0, 100, s.bewegung, "%"),
    P("rauheit", "Rauheit", "Makro", 0, 100, s.rauheit, "%"), P("helligkeit", "Helligkeit", "Makro", 0, 100, s.helligkeit, "%"),
    P("raum", "Raum", "Makro", 0, 100, s.raum, "%", { hilfe: "Breite und Ausdehnung in der Spur; für Hall dazu das Plugin Raum" }),
    P("tonalitaet", "Tonalität", "Makro", 0, 100, s.tonalitaet, "%", { hilfe: "Anteil gestimmter Resonanzen (Tonart der Spur oder des Basses)" }),
  ];
};

/** Zuordnung der Makros je Familie (auch für die Doku) */
export const MAKROS = Object.freeze({
  walchor: { dichte: "Körner je Sekunde und Überlappung", bewegung: "Wandern der Leseposition, Panorama, langsame Tonhöhenschwankung", rauheit: "Zufall der Körner (Position, Tonhöhe), Rauschanteil", helligkeit: "Tiefpass", raum: "Stereobreite, Diffusion", tonalitaet: "Resonatoren auf den Akkordtönen", verwandlung: "Korngrösse und Dehnung: von den Rufen selbst zur Fläche" },
  vogel: { dichte: "Rufe je Sekunde", bewegung: "Wechsel der Arten, Wandern im Raum", rauheit: "Abweichung der Rufe", helligkeit: "Tonlage und Filter", raum: "Verteilung im Panorama, Ferne", tonalitaet: "Rufe auf die Tonleiter gezogen", verwandlung: "Rufe → dichte Granularfläche aus den Rufen" },
  gezeiten: { dichte: "Wellen und Blasen je Minute", bewegung: "Wind und Wellenstärke ändern sich", rauheit: "Brandung, Gischt", helligkeit: "Filter der Wellen", raum: "Breite, Entfernung", tonalitaet: "gestimmte Resonatoren im Rauschen (singendes Meer)", verwandlung: "Natur → Rauschfläche mit Resonanzen" },
  pflanzen: { dichte: "Impulse je Sekunde", bewegung: "Wandern der Resonatoren", rauheit: "Klicks statt Töne", helligkeit: "Tonlage der Resonatoren", raum: "Breite", tonalitaet: "Resonatoren auf der Tonleiter statt frei", verwandlung: "einzelne Impulse → verdichtete Textur" },
  pad: { dichte: "Stimmen je Ton", bewegung: "Filter- und Verstimmungsbewegung", rauheit: "Verstimmung und Rauschen", helligkeit: "Filter", raum: "Breite", tonalitaet: "Ton gegen Rauschen", verwandlung: "Akkord → Drone (Grundton und Quinte)" },
});

// ---------- gemeinsame Bausteine ----------
/** glatter Zufall (Wertrauschen mit Kosinus-Übergang) für langsame Bewegungen; rate = Änderungen je Sekunde */
function glatt(rnd, rate) {
  const w = Array.from({ length: 4096 }, () => rnd());
  return (t) => { const x = t * rate, i = Math.floor(x), f = x - i, a = w[i & 4095], b = w[(i + 1) & 4095]; return a + (b - a) * (0.5 - 0.5 * Math.cos(Math.PI * f)); };
}
/** Frequenz eines Akkordtons: stufe (1–7, darüber in die nächste Oktave) auf grundton/leiter, oktave über der Bassoktave */
function frequenzVon(kontext, stufe, oktave) { return grundFrequenz(kontext.grundton ?? 2, kontext.kammerton) * 2 ** (oktave + halbtoene({ stufe, vorzeichen: 0, oktave: 0 }, kontext.leiter ?? "moll") / 12); }
/** die Akkordstufe zur Zeit t (aus kontext.akkorde: [{ beginn, stufe }]), sonst 1 */
function stufeBei(kontext, t) { let s = 1; for (const a of kontext.akkorde ?? []) { if (a.beginn <= t) s = a.stufe; else break; } return s; }

/**
 * Körner aus einer Quelle (Kanäle, eigene Abtastrate). Je Korn: Position (s), Länge (s), Rate (Tonhöhe), Panorama, Pegel; Hann-Fenster,
 * lineare Interpolation. Addiert auf aus = [L, R].
 */
function korn(aus, rate, quelle, { beginn, pos, laenge, faktor, pan, pegel }) {
  const [ql, qr] = [quelle.kanaele[0], quelle.kanaele[1] ?? quelle.kanaele[0]], qn = ql.length, n = Math.round(laenge * rate), i0 = Math.round(beginn * rate);
  const schritt = (faktor * quelle.rate) / rate, gl = pegel * Math.cos((pan + 1) * Math.PI / 4), gr = pegel * Math.sin((pan + 1) * Math.PI / 4);
  let x = pos * quelle.rate;
  const N = aus[0].length;
  for (let i = 0; i < n; i++, x += schritt) {
    const j = i0 + i; if (j >= N) break;
    const k = Math.floor(x); if (k < 0 || k + 1 >= qn) break;
    const f = x - k, w = 0.5 - 0.5 * Math.cos((TAU * i) / n);
    aus[0][j] += (ql[k] + (ql[k + 1] - ql[k]) * f) * w * gl; aus[1][j] += (qr[k] + (qr[k + 1] - qr[k]) * f) * w * gr;
  }
}

/** Resonatorbank (Bandpässe hoher Güte) auf die Akkordtöne; wechselt mit den Akkorden, sanft überblendet */
function resonatoren(ein, rate, kontext, { oktave = 2, q = 40, anteil = 0.5, toene = [1, 3, 5, 8] } = {}) {
  if (anteil <= 0) return ein;
  return ein.map((s, c) => {
    const out = new Float32Array(s.length), filt = toene.map(() => new SVF()), block = 256;
    let stufeAlt = null;
    for (let o = 0; o < s.length; o += block) {
      const st = stufeBei(kontext, o / rate);
      if (st !== stufeAlt) { toene.forEach((t, k) => filt[k].setze(frequenzVon(kontext, st + t - 1, oktave + (c ? 0.003 : 0)), q, rate)); stufeAlt = st; }
      for (let i = o; i < Math.min(s.length, o + block); i++) { let y = 0; for (const f of filt) y += f.schritt(s[i]).band; out[i] = s[i] * (1 - anteil) + y * anteil * 2.5; }
    }
    return out;
  });
}

/** Breite und Diffusion: zwei verschiedene Allpassketten links und rechts, gemischt nach «raum» */
function ausdehnen([L, R], rate, raum) {
  if (raum <= 0) return [L, R];
  const ap = (s, ms) => { const d = Math.round((ms / 1000) * rate), b = new Float32Array(d), g = 0.6, out = new Float32Array(s.length); let p = 0; for (let i = 0; i < s.length; i++) { const z = b[p], y = -g * s[i] + z; b[p] = s[i] + g * y; p = (p + 1) % d; out[i] = y; } return out; };
  let l = L, r = R;
  for (const ms of [7.3, 11.9, 17.1, 23.7]) l = ap(l, ms);
  for (const ms of [8.9, 13.1, 19.3, 27.1]) r = ap(r, ms);
  const a = raum / 100;
  for (let i = 0; i < L.length; i++) { L[i] = L[i] * (1 - a * 0.5) + l[i] * a * 0.6; R[i] = R[i] * (1 - a * 0.5) + r[i] * a * 0.6; }
  return [L, R];
}

/** Schleife ohne Naht: die Spur ist dauer + ueber lang gerechnet; der Überhang wird mit gleicher Leistung über den Anfang geblendet */
function nahtlos([L, R], rate, dauer, ueber) {
  const n = Math.round(dauer * rate), u = Math.min(Math.round(ueber * rate), L.length - n);
  const out = [L.slice(0, n), R.slice(0, n)];
  for (let i = 0; i < u; i++) { const a = Math.sin((Math.PI / 2) * (i / u)), b = Math.cos((Math.PI / 2) * (i / u)); out[0][i] = L[i] * a + L[n + i] * b; out[1][i] = R[i] * a + R[n + i] * b; }
  return out;
}
/** Tiefpass auf beide Kanäle, mit Hochpass, der dem Bass den Raum unter etwa 120 Hz lässt (ausser bei einem Sub-Drone) */
function farbe([L, R], rate, { tief = 18000, hoch = 110 }) {
  for (const s of [L, R]) { const a = new SVF().setze(tief, 0.6, rate), b = new SVF().setze(hoch, 0.6, rate); for (let i = 0; i < s.length; i++) s[i] = b.schritt(a.schritt(s[i]).tief).hoch; }
  return [L, R];
}
function pegeln([L, R], ziel = 0.5) { const m = spitze(L, R) || 1, g = ziel / m; for (let i = 0; i < L.length; i++) { L[i] *= g; R[i] *= g; } return [L, R]; }

// ---------- synthetische Quellen ----------
/** Walrufe (Modell): langsam gleitende Töne mit Obertönen und Formanten, dazwischen Stille; ein Band von etwa 24 s */
export function walQuelle(rate, seed, sek = 24) {
  const rnd = zufall(seed), n = Math.round(sek * rate), s = new Float32Array(n);
  let t = 0.3;
  while (t < sek - 1) {
    const d = 0.8 + rnd() * 3.2, f0 = 70 + rnd() * 380, art = rnd(), f1 = art < 0.4 ? f0 * (1.5 + rnd()) : art < 0.75 ? f0 * (0.5 + rnd() * 0.3) : f0 * (0.9 + rnd() * 0.2);
    const vib = 2 + rnd() * 5, vibT = rnd() * 0.02, i0 = Math.round(t * rate), m = Math.round(d * rate), harm = 3 + Math.floor(rnd() * 5);
    const formant = new SVF().setze(400 + rnd() * 1200, 2 + rnd() * 3, rate);
    let ph = 0;
    for (let i = 0; i < m && i0 + i < n; i++) {
      const u = i / m, f = f0 * (f1 / f0) ** (u * u * (3 - 2 * u)) * (1 + vibT * Math.sin(TAU * vib * i / rate)), e = Math.sin(Math.PI * u) ** 0.7;
      let x = 0; for (let h = 1; h <= harm; h++) x += Math.sin(ph * h) / h ** 1.3;
      ph += (TAU * f) / rate;
      s[i0 + i] += (formant.schritt(x).band * 0.7 + x * 0.3) * e;
    }
    t += d + 0.2 + rnd() * 2.5;
  }
  return { kanaele: [s], rate, synthetisch: true, name: "Walrufe (synthetisches Modell)" };
}

/** ein Vogelruf (Modell); art: zwitscher | triller | pfiff | gurren | flöten. Gibt Float32Array zurück */
function vogelRuf(rate, rnd, art, { hell = 1, toene = null } = {}) {
  const out = [];
  const ton = (f, d, { gl = 1, fm = 0, fmF = 0, am = 0, amF = 0, harm = 0.1 }) => {
    const m = Math.round(d * rate), s = new Float32Array(m);
    let ph = 0;
    for (let i = 0; i < m; i++) { const u = i / m, fi = f * gl ** u * (1 + fm * Math.sin(TAU * fmF * i / rate)), e = Math.sin(Math.PI * u) ** 1.5 * (1 - am + am * (0.5 + 0.5 * Math.sin(TAU * amF * i / rate))); s[i] = (Math.sin(ph) + harm * Math.sin(2 * ph)) * e; ph += (TAU * fi) / rate; }
    return s;
  };
  const pause = (d) => new Float32Array(Math.round(d * rate));
  const f0 = (2200 + rnd() * 2600) * hell;
  if (art === "zwitscher") for (let k = 0, n = 2 + Math.floor(rnd() * 5); k < n; k++) { out.push(ton(f0 * (0.8 + rnd() * 0.5), 0.03 + rnd() * 0.06, { gl: rnd() < 0.5 ? 1.6 : 0.6 })); out.push(pause(0.02 + rnd() * 0.05)); }
  else if (art === "triller") out.push(ton(f0 * 0.9, 0.4 + rnd() * 0.8, { gl: 0.85 + rnd() * 0.3, am: 0.95, amF: 18 + rnd() * 22, fm: 0.04, fmF: 30 }));
  else if (art === "pfiff") { const tt = toene ?? [0, 0]; tt.forEach((h, k) => { out.push(ton(f0 * 0.7 * 2 ** (h / 12), 0.12 + rnd() * 0.2, { gl: k === tt.length - 1 ? 0.92 : 1, fm: 0.008, fmF: 6 })); out.push(pause(0.05)); }); }
  else if (art === "gurren") for (let k = 0; k < 3; k++) { out.push(ton(420 + rnd() * 160, 0.25 + rnd() * 0.25, { gl: 0.88, harm: 0.4, am: 0.3, amF: 12 })); out.push(pause(0.12)); }
  else { const tt = toene ?? [0, 3, 7, 5]; tt.forEach((h) => { out.push(ton(f0 * 0.55 * 2 ** (h / 12), 0.1 + rnd() * 0.15, { fm: 0.012, fmF: 7, harm: 0.25 })); out.push(pause(0.03 + rnd() * 0.05)); }); }
  const n = out.reduce((a, s) => a + s.length, 0), s = new Float32Array(n); let o = 0; for (const x of out) { s.set(x, o); o += x.length; }
  return s;
}
const ARTEN_VOGEL = ["zwitscher", "triller", "pfiff", "gurren", "floeten"];
/** ein Band aus Vogelrufen (Modell) für die Granularfläche */
function vogelQuelle(rate, seed, sek = 12) {
  const rnd = zufall(seed), s = new Float32Array(Math.round(sek * rate));
  for (let t = 0.1; t < sek - 1.5; t += 0.2 + rnd() * 0.6) { const r = vogelRuf(rate, rnd, ARTEN_VOGEL[Math.floor(rnd() * 5)]), i0 = Math.round(t * rate); for (let i = 0; i < r.length && i0 + i < s.length; i++) s[i0 + i] += r[i] * 0.6; }
  return { kanaele: [s], rate, synthetisch: true, name: "Vogelrufe (synthetisches Modell)" };
}

/** Granularfläche aus einer Quelle: dauer s; Dichte, Korngrösse, Dehnung, Tonhöhe, Zufall, Bewegung */
function granular(quelle, rate, dauer, w, rnd, { korngroesse, dehnung, transpos = 0, kontext = null, tonal = 0 }) {
  const n = Math.round(dauer * rate), aus = [new Float32Array(n), new Float32Array(n)], qd = quelle.kanaele[0].length / quelle.rate;
  const proSek = 3 + (w.dichte / 100) ** 1.5 * 90, zufallPos = 0.05 + (w.rauheit / 100) * 0.6, bew = glatt(rnd, 0.05 + (w.bewegung / 100) * 0.3);
  const anz = Math.round(proSek * dauer);
  for (let k = 0; k < anz; k++) {
    const t = rnd() * dauer, lauf = ((t / dehnung) % qd + qd) % qd;
    const pos = Math.max(0, Math.min(qd - korngroesse * 2.5, lauf + (rnd() - 0.5) * zufallPos * qd * 0.2));
    let halb = transpos + (rnd() - 0.5) * (w.rauheit / 100) * 2 + (bew(t) - 0.5) * (w.bewegung / 100) * 1.5;
    if (tonal > 0 && kontext && rnd() < tonal) { const leiter = LEITERN[kontext.leiter ?? "moll"].stufen; halb = Math.round(halb / 12) * 12 + leiter[Math.floor(rnd() * leiter.length)] * (rnd() < 0.5 ? 0 : 1); }
    korn(aus, rate, quelle, { beginn: t, pos, laenge: korngroesse * (0.7 + rnd() * 0.6), faktor: 2 ** (halb / 12), pan: (rnd() * 2 - 1) * (0.2 + 0.8 * (w.raum / 100)), pegel: 1 / Math.sqrt(proSek * korngroesse + 1) });
  }
  return aus;
}

// ---------- Walchor ----------
const walchor = {
  key: "walchor", name: "Walchor", rolle: "flaeche", pan: 0, pegel: -1,
  parameter: [...MAKRO({ dichte: 45, bewegung: 35, verwandlung: 45, helligkeit: 30, raum: 60 }), P("transposition", "Transposition", "Detail", -24, 12, -5, "Halbtöne", { schritt: 1 }), P("dehnung", "Dehnung", "Detail", 1, 16, 3, "×", { skala: "log", hilfe: "wie langsam die Quelle durchlaufen wird (Tonhöhe bleibt)" })],
  varianten: [
    V("Ruf nah", "die Rufe selbst, wenig bearbeitet", { verwandlung: 10, dichte: 30, dehnung: 1, transposition: 0, raum: 40 }),
    V("Chor", "überlappende Stimmen, mittel verwandelt", {}),
    V("Tiefsee-Drone", "stark gedehnt und tief, fast eine Fläche", { verwandlung: 85, dichte: 75, dehnung: 10, transposition: -12, helligkeit: 15, tonalitaet: 40 }),
    V("singend gestimmt", "Resonanzen auf den Akkordtönen", { verwandlung: 55, tonalitaet: 80, helligkeit: 45 }),
    V("Strömung", "viel Bewegung, breit", { bewegung: 85, raum: 90, verwandlung: 60, dichte: 55 }),
    V("Sub-Drone", "ganz tief, für Installationen (nimmt den Bassbereich)", { verwandlung: 95, dichte: 85, dehnung: 16, transposition: -24, helligkeit: 10, tonalitaet: 20 }),
  ],
  rechne(w, rate, kx) {
    const rnd = zufall(kx.seed ?? 1), quelle = kx.sample ?? walQuelle(rate, (kx.seed ?? 1) + 11), ueber = Math.min(4, kx.dauer / 4);
    const vw = w.verwandlung / 100, korngroesse = 0.08 + vw * vw * 1.6 + (1 - vw) * 0.6 * (vw < 0.2 ? 1 : 0), dehnung = w.dehnung * (1 + vw * 2);
    let k = granular(quelle, rate, kx.dauer + ueber, w, rnd, { korngroesse: vw < 0.15 ? 1.2 : korngroesse, dehnung, transpos: w.transposition, kontext: kx, tonal: (w.tonalitaet / 100) * 0.5 });
    k = resonatoren(k, rate, kx, { oktave: 2, q: 30, anteil: (w.tonalitaet / 100) * 0.6 });
    k = farbe(k, rate, { tief: 400 + (w.helligkeit / 100) ** 1.5 * 9000, hoch: w.transposition <= -18 ? 25 : 90 });
    return pegeln(nahtlos(ausdehnen(k, rate, w.raum), rate, kx.dauer, ueber), 0.6);
  },
};

// ---------- Vogelschwarm ----------
const vogel = {
  key: "vogel", name: "Vogelschwarm", rolle: "flaeche", pan: 0, pegel: -3,
  parameter: [...MAKRO({ dichte: 35, verwandlung: 10, tonalitaet: 0, helligkeit: 55, raum: 70 }),
    { key: "modus", name: "Ordnung", gruppe: "Detail", wahl: [{ wert: "natur", name: "natürlich (frei)" }, { wert: "raster", name: "am Raster (Sechzehntel)" }, { wert: "drums", name: "auf den Einsätzen der Drums" }], std: "natur" },
    P("arten", "Arten", "Detail", 1, 5, 3, "", { schritt: 1, hilfe: "wie viele verschiedene Rufarten" })],
  varianten: [
    V("Morgen", "frei, verschiedene Arten, weit verteilt", {}),
    V("Garten nah", "wenige Vögel, nah", { dichte: 15, raum: 35, arten: 2 }),
    V("im Groove", "Rufe auf den Einsätzen der Drums", { modus: "drums", dichte: 45, tonalitaet: 60, arten: 2 }),
    V("Raster gestimmt", "am Sechzehntelraster, auf der Tonleiter", { modus: "raster", dichte: 40, tonalitaet: 100 }),
    V("Schwarm-Fläche", "dichte Granularfläche aus den Rufen", { verwandlung: 85, dichte: 70, helligkeit: 40 }),
    V("Dämmerung", "weit, dunkel, wenige Rufe, halb verwandelt", { dichte: 20, helligkeit: 25, verwandlung: 45, raum: 95 }),
  ],
  rechne(w, rate, kx) {
    const rnd = zufall(kx.seed ?? 1), ueber = Math.min(3, kx.dauer / 4), D = kx.dauer + ueber, n = Math.round(D * rate), aus = [new Float32Array(n), new Float32Array(n)];
    const vw = w.verwandlung / 100, arten = ARTEN_VOGEL.slice(0, w.arten).map((a) => ({ a, hell: 0.8 + rnd() * 0.5, pan: rnd() * 2 - 1 })), bew = glatt(rnd, 0.1);
    const leiter = LEITERN[kx.leiter ?? "moll"].stufen, tonal = w.tonalitaet / 100, hell = 0.6 + (w.helligkeit / 100) * 0.8;
    const melodie = () => Array.from({ length: 2 + Math.floor(rnd() * 4) }, () => leiter[Math.floor(rnd() * leiter.length)] + (rnd() < 0.3 ? 12 : 0));
    const zeiten = [];
    if (w.modus === "drums" && kx.einsaetze?.length) for (const t of kx.einsaetze) { if (rnd() < (w.dichte / 100) * 0.8) zeiten.push(t); }
    else if (w.modus === "raster") { const st = 60 / (kx.bpm ?? 100) / 4; for (let t = 0; t < kx.dauer; t += st) if (rnd() < (w.dichte / 100) * 0.35) zeiten.push(t); }
    else { const proSek = 0.1 + (w.dichte / 100) ** 1.4 * 6; let t = rnd() / proSek; while (t < kx.dauer) { zeiten.push(t); t += (-Math.log(1 - rnd() + 1e-9) / proSek) * (rnd() < 0.3 ? 0.15 : 1); } }
    const fund = (1 - vw) * 1;
    for (const t of zeiten) {
      const sp = arten[Math.floor((bew(t) * 0.7 + rnd() * 0.3 * (1 + w.bewegung / 100)) * arten.length) % arten.length];
      const tonGenau = rnd() < tonal;
      const r = vogelRuf(rate, rnd, sp.a, { hell: sp.hell * hell * (tonGenau ? 1 : 1 + (rnd() - 0.5) * (w.rauheit / 100) * 0.4), toene: tonGenau ? melodie() : null });
      if (tonGenau) { /* gestimmt: die Grundfrequenz liegt nach dem Modell schon auf Stufen relativ zum Ruf; nichts weiter */ }
      const pan = Math.max(-1, Math.min(1, sp.pan * (w.raum / 100) + (rnd() - 0.5) * 0.4)), ferne = 0.35 + 0.65 * rnd() ** ((w.raum / 100) + 0.3);
      const i0 = Math.round(t * rate), gl = Math.cos((pan + 1) * Math.PI / 4) * ferne * fund, gr = Math.sin((pan + 1) * Math.PI / 4) * ferne * fund;
      for (let i = 0; i < r.length && i0 + i < n; i++) { aus[0][i0 + i] += r[i] * gl; aus[1][i0 + i] += r[i] * gr; }
    }
    let k = aus;
    if (vw > 0.05) {
      const g = granular(vogelQuelle(rate, (kx.seed ?? 1) + 5), rate, D, w, rnd, { korngroesse: 0.04 + vw * 0.35, dehnung: 1 + vw * 6, kontext: kx, tonal });
      const mg = vw * vw * 1.4; for (let c = 0; c < 2; c++) for (let i = 0; i < n; i++) k[c][i] += g[c][i] * mg;
    }
    k = farbe(k, rate, { tief: 3000 + (w.helligkeit / 100) * 12000, hoch: 600 });
    return pegeln(nahtlos(ausdehnen(k, rate, w.raum * 0.6), rate, kx.dauer, ueber), 0.55);
  },
};

// ---------- Gezeiten ----------
const gezeiten = {
  key: "gezeiten", name: "Gezeiten", rolle: "flaeche", pan: 0, pegel: -2,
  parameter: [...MAKRO({ dichte: 40, bewegung: 50, helligkeit: 35, raum: 80, tonalitaet: 0, verwandlung: 0 }),
    P("wellen", "Wellen", "Schichten", 0, 100, 80, "%"), P("wind", "Wind", "Schichten", 0, 100, 30, "%"), P("blasen", "Blasen", "Schichten", 0, 100, 10, "%"), P("unterwasser", "Unterwasser", "Schichten", 0, 100, 0, "%", { hilfe: "dumpfes Rauschen und Grollen wie unter der Oberfläche" }),
    P("folgen", "folgt dem Bass", "Bezug", 0, 100, 0, "%", { hilfe: "die Hüllkurve der Bassspur öffnet die Wellen" })],
  varianten: [
    V("Brandung", "Meer an der Küste, Wellen kommen und gehen", {}),
    V("Wind über Wasser", "Wind mit Böen, leise Wellen", { wellen: 35, wind: 85, blasen: 0, bewegung: 70 }),
    V("Unterwasser", "dumpf, Blasen, Grollen", { wellen: 15, wind: 0, blasen: 55, unterwasser: 90, helligkeit: 15 }),
    V("singendes Meer", "Resonanzen auf den Akkordtönen im Rauschen", { tonalitaet: 75, verwandlung: 40, helligkeit: 45 }),
    V("Rauschfläche", "zur Fläche verwandelt, gleichmässig", { verwandlung: 90, tonalitaet: 50, bewegung: 25 }),
    V("atmend mit dem Bass", "die Wellen öffnen sich mit dem Bass", { folgen: 80, wellen: 70, wind: 20 }),
  ],
  rechne(w, rate, kx) {
    const rnd = zufall(kx.seed ?? 1), ueber = Math.min(6, kx.dauer / 3), D = kx.dauer + ueber, n = Math.round(D * rate), L = new Float32Array(n), R = new Float32Array(n);
    const hell = w.helligkeit / 100, vw = w.verwandlung / 100, bew = glatt(rnd, 0.03 + (w.bewegung / 100) * 0.15), staerke = glatt(rnd, 0.02);
    // Wellen: Ereignisse mit zufälliger Dauer und Lage; Tiefpass öffnet beim Anlaufen und schliesst beim Auslaufen
    if (w.wellen > 0) {
      const proMin = 4 + (w.dichte / 100) * 14;
      for (let t = -rnd() * 6; t < D; t += (60 / proMin) * (0.5 + rnd())) {
        const d = 4 + rnd() * 8, a = (0.4 + 0.6 * rnd()) * (0.5 + 0.5 * staerke(t)) * (w.wellen / 100), pan = (rnd() * 2 - 1) * (w.raum / 100) * 0.8, top = (300 + hell * 5000) * (0.6 + 0.8 * rnd());
        const i0 = Math.max(0, Math.round(t * rate)), m = Math.round(d * rate), f = [new SVF(), new SVF()], spitzeU = 0.3 + rnd() * 0.3, gisch = (w.rauheit / 100) * rnd();
        const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
        for (let i = Math.max(0, -Math.round(t * rate)); i < m && i0 + i < n; i++) {
          const u = i / m, e = u < spitzeU ? (u / spitzeU) ** 2 : Math.exp(-4 * (u - spitzeU) / (1 - spitzeU));
          if (i % 64 === 0 || f[0].a1 === undefined) { const fc = 120 + top * e; f[0].setze(fc, 0.7, rate); f[1].setze(fc * 1.07, 0.7, rate); }
          const brand = u > spitzeU * 0.9 && u < spitzeU * 1.6 ? 1 + gisch * 2 : 1;
          L[i0 + i] += f[0].schritt(rnd() * 2 - 1).tief * e * a * gl * brand; R[i0 + i] += f[1].schritt(rnd() * 2 - 1).tief * e * a * gr * brand;
        }
      }
    }
    // Wind: Bandpass, dessen Mitte und Stärke sich glatt-zufällig bewegen; Böen
    if (w.wind > 0) {
      const f = [new SVF(), new SVF()], boe = glatt(rnd, 0.25);
      for (let i = 0; i < n; i++) {
        const t = i / rate;
        if (i % 64 === 0) { const fc = 250 + (bew(t) * 1200 + boe(t) * 600) * (0.4 + hell); f[0].setze(fc, 2.5, rate); f[1].setze(fc * 1.12, 2.5, rate); }
        const a = (w.wind / 100) * (0.25 + 0.75 * boe(t) ** 2) * 1.6;
        L[i] += f[0].schritt(rnd() * 2 - 1).band * a; R[i] += f[1].schritt(rnd() * 2 - 1).band * a;
      }
    }
    // Blasen: Minnaert-Frequenz f ≈ 3,26 / Radius (m); steigt beim Aufsteigen, klingt schnell ab
    if (w.blasen > 0) {
      const proSek = 0.5 + (w.dichte / 100) * 25 * (w.blasen / 100);
      for (let t = rnd() / proSek; t < D; t += -Math.log(1 - rnd() + 1e-9) / proSek) {
        const radius = 0.0008 + rnd() ** 2 * 0.006, f0 = 3.26 / radius, d = 0.02 + radius * 12, i0 = Math.round(t * rate), m = Math.round(d * rate), a = (w.blasen / 100) * (0.15 + rnd() * 0.35) * (1 - (w.unterwasser / 100) * 0.4);
        const pan = (rnd() * 2 - 1) * (w.raum / 100), gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
        let ph = 0;
        for (let i = 0; i < m && i0 + i < n; i++) { const u = i / rate, x = Math.sin(ph) * Math.exp(-u / (d * 0.3)); ph += (TAU * f0 * (1 + 4 * u)) / rate; L[i0 + i] += x * a * gl; R[i0 + i] += x * a * gr; }
      }
    }
    // Unterwasser: braunes Rauschen, stark tiefpassgefiltert, langsam schwellend
    if (w.unterwasser > 0) {
      const f = [new SVF().setze(180 + hell * 300, 0.7, rate), new SVF().setze(200 + hell * 300, 0.7, rate)]; let bl = 0, br = 0;
      for (let i = 0; i < n; i++) { bl = 0.995 * bl + (rnd() * 2 - 1) * 0.1; br = 0.995 * br + (rnd() * 2 - 1) * 0.1; const a = (w.unterwasser / 100) * (0.5 + 0.5 * bew(i / rate)) * 1.2; L[i] += f[0].schritt(bl).tief * a; R[i] += f[1].schritt(br).tief * a; }
    }
    // folgt dem Bass: Hüllkurve (100 Werte je Sekunde) öffnet die Schichten
    if (w.folgen > 0 && kx.huelle?.length) {
      const h = kx.huelle, f = w.folgen / 100, m = Math.max(1e-6, ...h);
      for (let i = 0; i < n; i++) { const j = Math.floor(((i / rate) % kx.dauer) * 100), g = 1 - f + f * Math.min(1, (h[j] ?? 0) / m) * 1.6; L[i] *= g; R[i] *= g; }
    }
    let k = [L, R];
    // Verwandlung: zunehmend durch die Resonatoren und eine weiche, gleichmässige Rauschfläche ersetzt
    k = resonatoren(k, rate, kx, { oktave: 2, q: 25 + vw * 60, anteil: Math.min(1, (w.tonalitaet / 100) * 0.7 + vw * 0.3) });
    if (vw > 0.05) { const f = [new SVF().setze(300 + hell * 2500, 0.6, rate), new SVF().setze(320 + hell * 2500, 0.6, rate)]; for (let c = 0; c < 2; c++) { const s = k[c]; let rauh = 0; for (let i = 0; i < n; i++) { rauh = f[c].schritt(rnd() * 2 - 1).tief; s[i] = s[i] * (1 - vw * 0.7) + rauh * vw * 0.25 * (0.7 + 0.3 * bew(i / rate)); } } }
    k = farbe(k, rate, { tief: 800 + hell * 12000, hoch: w.unterwasser > 50 ? 40 : 90 });
    return pegeln(nahtlos(ausdehnen(k, rate, w.raum * 0.5), rate, kx.dauer, ueber), 0.6);
  },
};

// ---------- Pflanzentextur ----------
const pflanzen = {
  key: "pflanzen", name: "Pflanzentextur", rolle: "flaeche", pan: 0, pegel: -2,
  parameter: [...MAKRO({ dichte: 35, tonalitaet: 70, helligkeit: 50, verwandlung: 20, raum: 60 }),
    { key: "weg", name: "Quelle", gruppe: "Detail", wahl: [{ wert: "demo", name: "Demonstration (synthetisch)" }, { wert: "aufnahme", name: "Pflanzenaufnahme (Import)" }, { wert: "daten", name: "Messdaten (Zahlenreihe)" }], std: "demo" },
    P("verlangsamen", "Verlangsamen", "Detail", 1, 64, 16, "×", { skala: "log", hilfe: "Ultraschall hörbar machen: die Aufnahme so viel langsamer abspielen" }),
    P("schwelle", "Impulsschwelle", "Detail", 0, 100, 40, "%", { hilfe: "ab welcher Stärke ein Impuls in der Aufnahme die Resonatoren anregt" }),
    P("nachklang", "Nachklang", "Detail", 0.1, 4, 1.2, "s", { skala: "log" })],
  varianten: [
    V("Tropfen", "einzelne Impulse auf gestimmten Resonatoren", {}),
    V("Glasgarten", "hell, lange Resonanzen", { helligkeit: 80, nachklang: 2.8, dichte: 25 }),
    V("Holz", "dunkel, kurz, frei gestimmt", { helligkeit: 25, nachklang: 0.4, tonalitaet: 20 }),
    V("Knistern", "rau, viele Klicks", { rauheit: 85, dichte: 80, tonalitaet: 10, nachklang: 0.2 }),
    V("verdichtet", "Impulse zur Textur verdichtet", { verwandlung: 85, dichte: 70 }),
    V("Daten-Melodie", "Messwerte werden zu Tönen (Zahlenreihe nötig)", { weg: "daten", tonalitaet: 100, nachklang: 1.6 }),
  ],
  rechne(w, rate, kx) {
    const rnd = zufall(kx.seed ?? 1), ueber = Math.min(4, kx.dauer / 4), D = kx.dauer + ueber, n = Math.round(D * rate), L = new Float32Array(n), R = new Float32Array(n);
    const leiter = LEITERN[kx.leiter ?? "moll"].stufen, hell = w.helligkeit / 100, tonal = w.tonalitaet / 100, vw = w.verwandlung / 100;
    // Impulse: aus der Aufnahme (verlangsamt, Spitzen über der Schwelle), aus Messdaten (Werte → Stufen) oder Demonstration (Poisson)
    let impulse = [];
    if (w.weg === "aufnahme" && kx.sample) {
      const s = kx.sample.kanaele[0], q = kx.sample.rate, fenster = Math.max(1, Math.round(q * 0.0005)); let m = 0; for (const x of s) m = Math.max(m, Math.abs(x));
      const schw = m * (0.05 + 0.9 * (w.schwelle / 100) ** 2); let letzte = -1e9;
      for (let i = 0; i < s.length; i += fenster) { let p = 0; for (let j = i; j < Math.min(s.length, i + fenster); j++) p = Math.max(p, Math.abs(s[j])); const t = (i / q) * w.verlangsamen; if (p > schw && t - letzte > 0.03) { impulse.push({ t: t % kx.dauer, a: p / m, h: null }); letzte = t; } }
    } else if (w.weg === "daten" && kx.daten?.length) {
      const d = kx.daten, lo = Math.min(...d), hi = Math.max(...d), schritt = kx.dauer / d.length;
      d.forEach((v, i) => { const u = hi > lo ? (v - lo) / (hi - lo) : 0.5; impulse.push({ t: i * schritt, a: 0.5 + 0.5 * u, h: Math.round(u * 14) }); });
    } else {
      const proSek = 0.3 + (w.dichte / 100) ** 1.5 * 20; for (let t = rnd() / proSek; t < kx.dauer; t += -Math.log(1 - rnd() + 1e-9) / proSek) impulse.push({ t, a: 0.3 + 0.7 * rnd() ** 2, h: null });
    }
    const basis = frequenzVon(kx, 1, 3) * (0.5 + hell);
    for (const im of impulse) {
      const stufe = im.h ?? Math.floor(rnd() * 15), okt = Math.floor(stufe / leiter.length), ht = leiter[stufe % leiter.length] + 12 * okt;
      const f = tonal > rnd() ? basis * 2 ** (ht / 12) : basis * (0.7 + rnd() * 3), d = w.nachklang * (0.6 + rnd() * 0.8), m = Math.round(d * rate), i0 = Math.round(im.t * rate);
      const pan = (rnd() * 2 - 1) * (w.raum / 100), gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4), klick = w.rauheit / 100;
      const modi = [[1, 1], [2.76, 0.4 * hell], [5.4, 0.2 * hell]];
      for (let i = 0; i < m && i0 + i < n; i++) {
        const u = i / rate; let x = 0; for (const [r, a] of modi) x += Math.sin(TAU * f * r * u) * a * Math.exp(-u * 6.9 / (d / r ** 0.5));
        if (i < 48) x = x * (1 - klick) + (rnd() * 2 - 1) * klick * (1 - i / 48) * 2;
        L[i0 + i] += x * im.a * gl * 0.4; R[i0 + i] += x * im.a * gr * 0.4;
      }
    }
    let k = [L, R];
    if (vw > 0.05) { const src = { kanaele: [L.slice(0, Math.min(n, rate * 8))], rate }; const g = granular(src, rate, D, w, rnd, { korngroesse: 0.05 + vw * 0.4, dehnung: 1 + vw * 4, kontext: kx, tonal }); for (let c = 0; c < 2; c++) for (let i = 0; i < n; i++) k[c][i] = k[c][i] * (1 - vw * 0.6) + g[c][i] * vw * 1.2; }
    k = farbe(k, rate, { tief: 2000 + hell * 14000, hoch: 150 });
    return pegeln(nahtlos(ausdehnen(k, rate, w.raum * 0.7), rate, kx.dauer, ueber), 0.5);
  },
};

// ---------- klassische Pads ----------
const pad = {
  key: "pad", name: "Pad", rolle: "flaeche", pan: 0, pegel: -3,
  parameter: [...MAKRO({ dichte: 50, bewegung: 40, rauheit: 25, helligkeit: 35, raum: 70, tonalitaet: 85, verwandlung: 0 }),
    { key: "art", name: "Art", gruppe: "Detail", wahl: [{ wert: "warm", name: "warm, verstimmt (Sägezähne)" }, { wert: "luft", name: "Luft (Rauschen durch Resonanzen)" }, { wert: "drone", name: "resonanter Drone" }], std: "warm" },
    P("oktave", "Lage", "Detail", 0, 3, 2, "", { schritt: 1 }), P("einsatz", "Einschwingen", "Detail", 0.05, 6, 1.5, "s", { skala: "log" }),
    { key: "akkord", name: "Akkord", gruppe: "Detail", wahl: [{ wert: "drei", name: "Dreiklang" }, { wert: "sept", name: "mit Septime" }, { wert: "none", name: "mit None" }, { wert: "quint", name: "Grundton und Quinte" }], std: "sept" }],
  varianten: [
    V("warm", "verstimmte Sägezähne, weich, dunkel", {}),
    V("Analog breit", "mehr Stimmen, mehr Bewegung", { dichte: 85, bewegung: 65, raum: 90 }),
    V("Luft", "Rauschen durch gestimmte Resonanzen", { art: "luft", helligkeit: 50, tonalitaet: 70 }),
    V("Drone", "Grundton und Quinte, resonant, bewegt", { art: "drone", akkord: "quint", verwandlung: 60, bewegung: 50 }),
    V("Sub-Drone", "tief, für Installation (nimmt den Bassbereich)", { art: "drone", akkord: "quint", oktave: 0, helligkeit: 15, verwandlung: 80 }),
    V("Glas", "hoch, hell, mit None", { oktave: 3, helligkeit: 70, akkord: "none", rauheit: 10 }),
  ],
  rechne(w, rate, kx) {
    const rnd = zufall(kx.seed ?? 1), ueber = Math.min(4, kx.dauer / 4), D = kx.dauer + ueber, n = Math.round(D * rate), L = new Float32Array(n), R = new Float32Array(n);
    const hell = w.helligkeit / 100, vw = w.verwandlung / 100, bew = glatt(rnd, 0.05 + (w.bewegung / 100) * 0.3);
    const intervalle = vw > 0.6 || w.akkord === "quint" ? [1, 5, 8] : w.akkord === "drei" ? [1, 3, 5] : w.akkord === "none" ? [1, 3, 5, 9] : [1, 3, 5, 7];
    const stimmen = 1 + Math.round((w.dichte / 100) * 4), verst = 4 + (w.rauheit / 100) * 22;
    // Akkordwechsel: Stufen über die Zeit, je Ton eine Hüllkurve mit Einschwingen, damit Wechsel weich gleiten
    const akk = (kx.akkorde?.length ? kx.akkorde : [{ beginn: 0, stufe: 1 }]).filter((a) => a.beginn < D);
    const ton = (t) => stufeBei(kx, t % kx.dauer);
    if (w.art === "luft") {
      const f = [new SVF(), new SVF()];
      for (let i = 0; i < n; i++) { const x = rnd() * 2 - 1; L[i] = x; R[i] = rnd() * 2 - 1; }
      const k = resonatoren([L, R], rate, { ...kx, akkorde: akk }, { oktave: w.oktave, q: 20 + (w.tonalitaet / 100) * 120, anteil: 0.92, toene: intervalle });
      for (let c = 0; c < 2; c++) { f[c].setze(600 + hell * 7000, 0.6, rate); for (let i = 0; i < n; i++) k[c][i] = f[c].schritt(k[c][i]).tief * (0.8 + 0.2 * bew(i / rate)); }
      return pegeln(nahtlos(ausdehnen(farbe(k, rate, { hoch: 120 }), rate, w.raum), rate, kx.dauer, ueber), 0.5);
    }
    const osz = intervalle.flatMap((iv, k) => Array.from({ length: stimmen }, (_, s) => ({ iv, k, cent: (s - (stimmen - 1) / 2) * (verst / Math.max(1, stimmen - 1)) + (rnd() - 0.5) * 3, p: rnd(), pan: (rnd() * 2 - 1) * (w.raum / 100) })));
    const lp = [new SVF(), new SVF()], einsatz = w.einsatz, saw = w.art === "warm";
    for (const o of osz) {
      const gl = Math.cos((o.pan + 1) * Math.PI / 4), gr = Math.sin((o.pan + 1) * Math.PI / 4), drift = glatt(rnd, 0.1 + (w.bewegung / 100) * 0.4);
      let p = o.p, alt = ton(0), amp = 0, f = frequenzVon(kx, alt + o.iv - 1, w.oktave);
      for (let i = 0; i < n; i++) {
        const t = i / rate;
        if (i % 512 === 0) { const st = ton(t); if (st !== alt) alt = st; f = frequenzVon(kx, alt + o.iv - 1, w.oktave) * 2 ** ((o.cent + (drift(t) - 0.5) * (w.bewegung / 100) * 12) / 1200); }
        amp += (1 - amp) / Math.max(1, einsatz * rate);
        const d = f / rate; p = (p + d) % 1;
        let x = saw ? 2 * p - 1 : Math.sin(TAU * p) + 0.35 * Math.sin(2 * TAU * p) + 0.2 * Math.sin(3 * TAU * p);
        if (saw) { if (p < d) { const u = p / d; x -= u + u - u * u - 1; } else if (p > 1 - d) { const u = (p - 1) / d; x -= u * u + u + u + 1; } }
        const g = amp / osz.length; L[i] += x * g * gl; R[i] += x * g * gr;
      }
    }
    for (let c = 0; c < 2; c++) { const s = c ? R : L; for (let i = 0; i < n; i++) { if (i % 64 === 0) lp[c].setze(250 + hell * 5000 * (0.7 + 0.3 * bew(i / rate)) + (w.art === "drone" ? 200 * Math.sin(TAU * 0.05 * i / rate) : 0), w.art === "drone" ? 4 + (w.tonalitaet / 100) * 6 : 0.8, rate); s[i] = lp[c].schritt(s[i]).tief; } }
    let k = [L, R];
    if (w.rauheit > 40) { const a = ((w.rauheit - 40) / 60) * 0.05; for (let c = 0; c < 2; c++) for (let i = 0; i < n; i++) k[c][i] += (rnd() * 2 - 1) * a; }
    k = farbe(k, rate, { tief: 16000, hoch: w.oktave === 0 ? 25 : 120 });
    return pegeln(nahtlos(ausdehnen(k, rate, w.raum), rate, kx.dauer, ueber), 0.5);
  },
};

export default {
  id: "natur", version: "0.1.0", name: "Natur und Flächen", flaeche: true,
  beschreibung: "Walchor, Vogelschwarm, Gezeiten, Pflanzentextur, Pads. Synthetische Quellen sind als solche bezeichnet; eigene Aufnahmen über den Import.",
  stimmen: Object.fromEntries([walchor, vogel, gezeiten, pflanzen, pad].map((s) => [s.key, s])),
};

// Bausteine für spätere Versionen (natur-0.2.0.js); der Klang von 0.1.0 bleibt unverändert
export { glatt, resonatoren, ausdehnen, nahtlos, farbe, pegeln, MAKRO, granular, frequenzVon };
