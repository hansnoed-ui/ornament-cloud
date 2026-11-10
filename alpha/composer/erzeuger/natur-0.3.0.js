// Natur 0.3.0 – alle Familien aus Natur 0.2.0 (unverändert übernommen) und drei neue (Wunsch vom 10. November 2026: mehr Tierklänge
// für Ornament und Drum and Bass, «eine Ebene mit astronomischen Signalen aus dem Universum»). Alles synthetisch und so bezeichnet; die
// Modelle folgen veröffentlichten Messwerten (Frequenzen, Perioden, Dispersionsgesetze), keine Aufnahme und kein Code ist übernommen:
//   Delfine    Pfeiftöne (gleitende Konturen: Bogen, Welle, Schleife; real 4–20 kHz, hier wählbar tiefer) und Klicksalven der
//              Echoortung (breitbandige Klicks, die sich zum «Buzz» beschleunigen); unter Wasser gedämpft
//   Nachtwald  Unken (weiche, glockige «Uh»-Rufe um 400–500 Hz, mehrere Tiere im Wechsel), Froschknarren (Pulsfolgen durch Formanten),
//              Uhu (tiefes zweisilbiges «Uu-hu» um 300 Hz, selten), Blätterrauschen
//   Kosmos     Pulsar (Pulse mit Dispersion: jede Puls kommt hoch zuerst und gleitet nach unten; Perioden echter Pulsare oder im Takt),
//              Plasmawellen (Whistler: f = (D / t)², fallende Pfiffe; Chorus: steigende Zirpen), Gravitationswellen-Chirp
//              (f ∝ (1 − t/tc)^(−3/8), Amplitude ∝ f^(2/3), dann Abklingen), Radiorauschen (Jupiter-L-Bursts als Rauschwellen)
// Makros wie in 0.1.0 (Verwandlung, Dichte, Bewegung, Rauheit, Helligkeit, Raum, Tonalität). Nach der Veröffentlichung nicht verändern.

import natur020, { MAKROS as MAKROS020 } from "./natur-0.2.0.js";
import { glatt, resonatoren, ausdehnen, nahtlos, farbe, MAKRO, granular } from "./natur-0.1.0.js";
import { zufall, SVF, TAU } from "./grund.js";
import { LEITERN, grundFrequenz } from "../kern/linien.js";

const P = (key, name, gruppe, min, max, std, einheit = "", mehr = {}) => ({ key, name, gruppe, min, max, std, einheit, ...mehr });
const V = (name, beschreibung, werte) => ({ name, beschreibung, werte });
const pan2 = (p) => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];

/** nach Effektivwert pegeln, Spitzen über 0,5 weich runden (wie in 0.2.0) */
function pegelnLaut([L, R], rms = 0.07) {
  let e = 0; for (let i = 0; i < L.length; i++) e += L[i] * L[i] + R[i] * R[i];
  const g = rms / Math.max(1e-9, Math.sqrt(e / (2 * L.length))), k = 0.5;
  for (const s of [L, R]) for (let i = 0; i < s.length; i++) { const x = s[i] * g, a = Math.abs(x); s[i] = a <= k ? x : Math.sign(x) * (k + (0.6 - k) * Math.tanh((a - k) / (0.6 - k))); }
  return [L, R];
}

/** Verwandlung: Granularfläche aus dem eigenen Material, dann Resonatoren (wie in 0.2.0) */
function verwandeln(k, rate, w, kx, rnd, D, transpos = 0) {
  const vw = w.verwandlung / 100;
  if (vw > 0.05) {
    const src = { kanaele: [k[0].slice(0, Math.min(k[0].length, rate * 10))], rate };
    const g = granular(src, rate, D, w, rnd, { korngroesse: 0.06 + vw * 0.6, dehnung: 1 + vw * 6, transpos, kontext: kx, tonal: w.tonalitaet / 100 });
    for (let c = 0; c < 2; c++) for (let i = 0; i < k[c].length; i++) k[c][i] = k[c][i] * (1 - vw * 0.7) + g[c][i] * vw * 1.3;
  }
  return resonatoren(k, rate, kx, { oktave: 2, q: 30 + vw * 50, anteil: Math.min(1, (w.tonalitaet / 100) * 0.5 + vw * 0.2) });
}

/** ein Ton auf der Tonleiter der Spur, nahe bei f (für gestimmte Rufe) */
function aufLeiter(f, kx) {
  const leiter = LEITERN[kx.leiter ?? "moll"].stufen, g = grundFrequenz(kx.grundton ?? 2, kx.kammerton);
  const ht = 12 * Math.log2(f / g), okt = Math.floor(ht / 12), r = ht - okt * 12;
  let best = leiter[0], d = 99; for (const s of [...leiter, 12]) if (Math.abs(s - r) < d) { d = Math.abs(s - r); best = s; }
  return g * 2 ** ((okt * 12 + best) / 12);
}

/** Ereigniszeiten: Poisson-Prozess mit proSek, oder auf den Einsätzen der Drums (modus «drums») */
function zeiten(rnd, D, proSek, kx, modus = "natur") {
  const out = [];
  if (modus === "drums" && kx.einsaetze?.length) {
    const L = kx.dauer, p = Math.min(1, proSek / Math.max(1, kx.einsaetze.length / L));
    for (let r = 0; r * L < D; r++) for (const e of kx.einsaetze) { const t = e + r * L; if (t < D && rnd() < p) out.push(t); }
    return out.sort((a, b) => a - b);
  }
  for (let t = rnd() / proSek; t < D; t += -Math.log(1 - rnd() + 1e-9) / proSek) out.push(t);
  return out;
}

// ---------- Delfine ----------
/** ein Pfeifton: Kontur (bogen | welle | schleife | steigend | fallend) um fc, Dauer d; mit schwachem Oberton und leichter Rauheit */
function pfiff(L, R, rate, i0, { fc, d, art, gl, gr, a, rauh, rnd }) {
  const m = Math.round(d * rate), n = L.length, tiefe = 0.25 + rnd() * 0.45, wellen = 1 + Math.floor(rnd() * 3), ph0 = rnd() * TAU;
  let ph = 0;
  for (let i = 0; i < m && i0 + i < n; i++) {
    const u = i / m;
    const kontur = art === "bogen" ? Math.sin(Math.PI * u) - 0.3 : art === "welle" ? Math.sin(TAU * wellen * u + ph0) * 0.6
      : art === "schleife" ? Math.sin(TAU * u) * 0.5 + u * 0.4 - 0.2 : art === "steigend" ? u * 1.2 - 0.6 : 0.6 - u * 1.1;
    const f = fc * 2 ** (kontur * tiefe), e = Math.sin(Math.PI * Math.min(1, u * 6)) ** 0.5 * Math.sin(Math.PI * Math.max(u, 0.5)) ** 0.8;
    const x = (Math.sin(ph) + 0.12 * Math.sin(2 * ph) + 0.04 * Math.sin(3 * ph)) * e * a * (1 + rauh * (rnd() - 0.5));
    ph += (TAU * f) / rate; L[i0 + i] += x * gl; R[i0 + i] += x * gr;
  }
}
/** eine Klicksalve der Echoortung: Abstände werden kürzer (Annäherung), am Ende oft ein schneller «Buzz» */
function klicksalve(L, R, rate, t0, { hell, gl, gr, a, rnd, D }) {
  const anz = 8 + Math.floor(rnd() * 30), buzz = rnd() < 0.6, f = new SVF(), fc = (2500 + rnd() * 3000) * (0.6 + hell * 0.8);
  let t = t0, ab = 0.04 + rnd() * 0.05;
  for (let k = 0; k < anz && t < D; k++) {
    const i0 = Math.round(t * rate), m = Math.round(0.0025 * rate), g = a * (0.6 + 0.4 * rnd());
    f.setze(fc * (0.9 + 0.2 * rnd()), 1.6, rate);
    for (let i = 0; i < m && i0 + i < L.length; i++) { const x = f.schritt(i < 2 ? (rnd() * 2 - 1) * 3 : 0).band * g; L[i0 + i] += x * gl; R[i0 + i] += x * gr; }
    t += ab; ab *= buzz && k > anz * 0.5 ? 0.82 : 0.96; ab = Math.max(0.003, ab);
  }
}

const delfine = {
  key: "delfine", name: "Delfine", rolle: "flaeche", pan: 0, pegel: -4,
  parameter: [...MAKRO({ dichte: 35, bewegung: 50, rauheit: 25, helligkeit: 40, raum: 75, tonalitaet: 0, verwandlung: 0 }),
    P("pfiffe", "Pfeiftöne", "Schichten", 0, 100, 75, "%"), P("klicks", "Klicks (Echoortung)", "Schichten", 0, 100, 35, "%"),
    P("lage", "Tonlage", "Detail", -24, 0, -12, "Halbtöne", { schritt: 1, hilfe: "0 = wie echte Delfine (sehr hoch, 6–15 kHz); −12 = eine Oktave tiefer, dunkler" }),
    P("wasser", "unter Wasser", "Detail", 0, 100, 50, "%", { hilfe: "dämpft die Höhen und legt ein leises Unterwasser-Grollen darunter" }),
    { key: "modus", name: "Klicks", gruppe: "Detail", wahl: [{ wert: "natur", name: "frei" }, { wert: "drums", name: "auf den Einsätzen der Drums" }], std: "natur" }],
  varianten: [
    V("Schule", "mehrere Tiere, Pfiffe und vereinzelte Klicks", {}),
    V("nah und hell", "Pfiffe in echter Tonlage, wenig Wasser", { lage: 0, wasser: 15, raum: 45, helligkeit: 60 }),
    V("Echoortung", "vor allem Klicksalven, im Groove der Drums", { klicks: 90, pfiffe: 25, modus: "drums", dichte: 45 }),
    V("Delfine singen", "Pfiffe auf den Tönen der Tonleiter, zwei Oktaven tiefer", { tonalitaet: 85, lage: -24, pfiffe: 90, klicks: 10, wasser: 40 }),
    V("Tiefe Bucht", "fern, gedämpft, viel Raum", { wasser: 90, raum: 95, dichte: 25, helligkeit: 20 }),
    V("Delfinfläche", "zur schwebenden Fläche verwandelt", { verwandlung: 85, tonalitaet: 50, lage: -19 }),
  ],
  rechne(w, rate, kx) {
    const rnd = zufall(kx.seed ?? 1), ueber = Math.min(4, kx.dauer / 4), D = kx.dauer + ueber, n = Math.round(D * rate), L = new Float32Array(n), R = new Float32Array(n);
    const hell = w.helligkeit / 100, lage = 2 ** (w.lage / 12), bew = glatt(rnd, 0.05 + (w.bewegung / 100) * 0.3), tiere = 3 + Math.floor(w.dichte / 25);
    const signatur = Array.from({ length: tiere }, () => ({ fc: 7000 + rnd() * 6000, art: ["bogen", "welle", "schleife", "steigend", "fallend"][Math.floor(rnd() * 5)], pan: (rnd() * 2 - 1) * (w.raum / 100) }));
    // Pfiffe: jedes Tier hat seine eigene «Signatur»-Kontur und wiederholt sie mit Abweichungen
    for (const t of zeiten(rnd, D, 0.2 + (w.dichte / 100) ** 1.3 * 3, kx)) {
      if (rnd() > w.pfiffe / 100) continue;
      const s = signatur[Math.floor(rnd() * tiere)], eigen = rnd() < 0.6, [gl, gr] = pan2(Math.max(-1, Math.min(1, s.pan + (bew(t) - 0.5) * 0.4)));
      let fc = (eigen ? s.fc : 6000 + rnd() * 8000) * lage * (0.95 + 0.1 * rnd());
      if (rnd() < w.tonalitaet / 100) fc = aufLeiter(fc, kx);
      const d = 0.25 + rnd() * 1.1, wdh = rnd() < 0.35 ? 2 : 1;
      for (let k = 0; k < wdh; k++) pfiff(L, R, rate, Math.round((t + k * (d + 0.08)) * rate), { fc, d, art: eigen ? s.art : ["bogen", "welle", "schleife", "steigend", "fallend"][Math.floor(rnd() * 5)], gl, gr, a: (0.3 + 0.7 * rnd()) * 0.35, rauh: w.rauheit / 100, rnd });
    }
    // Klicksalven
    for (const t of zeiten(rnd, D, 0.1 + (w.dichte / 100) * 0.9, kx, w.modus)) {
      if (rnd() > w.klicks / 100) continue;
      const [gl, gr] = pan2((rnd() * 2 - 1) * (w.raum / 100)); klicksalve(L, R, rate, t, { hell, gl, gr, a: 0.25 + 0.25 * rnd(), rnd, D });
    }
    // unter Wasser: leises tiefes Grollen und Blubbern
    if (w.wasser > 0) {
      const f = [new SVF().setze(180, 0.7, rate), new SVF().setze(210, 0.7, rate)], wog = glatt(rnd, 0.15);
      for (let i = 0; i < n; i++) { const a = (w.wasser / 100) * 0.35 * (0.5 + 0.5 * wog(i / rate)); L[i] += f[0].schritt(rnd() * 2 - 1).tief * a; R[i] += f[1].schritt(rnd() * 2 - 1).tief * a; }
    }
    let k = verwandeln([L, R], rate, w, kx, rnd, D);
    const tief = (2500 + hell * 15000) * (1 - (w.wasser / 100) * 0.7) * (w.lage < -6 ? 0.6 : 1);
    k = farbe(k, rate, { tief, hoch: 90 });
    return pegelnLaut(nahtlos(ausdehnen(k, rate, w.raum * 0.6), rate, kx.dauer, ueber), 0.065);
  },
};

// ---------- Nachtwald ----------
/** Unkenruf: weiches «Uh», Sinus mit wenig Obertönen, sanft ein- und ausschwingend (glockig) */
function unke(L, R, rate, i0, { f, d, gl, gr, a }) {
  const m = Math.round(d * rate);
  let ph = 0;
  for (let i = 0; i < m && i0 + i < L.length; i++) { const u = i / m, e = Math.sin(Math.PI * Math.min(1, u * 3)) * Math.exp(-u * 2.2), x = (Math.sin(ph) + 0.18 * Math.sin(2 * ph) + 0.05 * Math.sin(3 * ph)) * e * a; ph += (TAU * f * (1 - 0.03 * u)) / rate; L[i0 + i] += x * gl; R[i0 + i] += x * gr; }
}
/** Froschknarren: Pulsfolge (Pulse je Sekunde), jeder Puls regt zwei Formanten an; ergibt das hölzerne Knarren */
function frosch(L, R, rate, i0, { pulse, d, f1, gl, gr, a, rnd }) {
  const m = Math.round(d * rate), F = [new SVF().setze(f1, 6, rate), new SVF().setze(f1 * 2.1, 5, rate)], abst = rate / pulse;
  let naechst = 0;
  for (let i = 0; i < m && i0 + i < L.length; i++) {
    const u = i / m, e = Math.sin(Math.PI * u) ** 0.6;
    let x = 0; if (i >= naechst) { x = (1 + rnd()) * 2; naechst += abst * (0.9 + 0.2 * rnd()); }
    const y = (F[0].schritt(x).band + 0.6 * F[1].schritt(x).band) * e * a; L[i0 + i] += y * gl; R[i0 + i] += y * gr;
  }
}
/** Uhu: «Uu-hu», tiefer Ton mit Atemrauschen, die zweite Silbe kürzer und etwas tiefer */
function uhu(L, R, rate, i0, { f, gl, gr, a, rnd }) {
  const silben = [[0, 0.45, 1], [0.6, 0.35, 0.92]], b = new SVF().setze(f, 3, rate);
  for (const [beg, d, fak] of silben) {
    const j0 = i0 + Math.round(beg * rate), m = Math.round(d * rate);
    let ph = 0;
    for (let i = 0; i < m && j0 + i < L.length; i++) { const u = i / m, e = Math.sin(Math.PI * u) ** 1.2, fi = f * fak * (1 + 0.04 * Math.sin(Math.PI * u)); const x = (Math.sin(ph) * 0.8 + 0.25 * Math.sin(2 * ph) + b.schritt(rnd() * 2 - 1).band * 0.5) * e * a; ph += (TAU * fi) / rate; L[j0 + i] += x * gl; R[j0 + i] += x * gr; }
  }
}

const nachtwald = {
  key: "nachtwald", name: "Nachtwald", rolle: "flaeche", pan: 0, pegel: -4,
  parameter: [...MAKRO({ dichte: 40, bewegung: 35, rauheit: 40, helligkeit: 35, raum: 80, tonalitaet: 20, verwandlung: 0 }),
    P("unken", "Unken", "Schichten", 0, 100, 70, "%", { hilfe: "weiche, glockige «Uh»-Rufe, mehrere Tiere im Wechsel" }),
    P("froesche", "Froschknarren", "Schichten", 0, 100, 45, "%"), P("eulen", "Uhu", "Schichten", 0, 100, 40, "%", { hilfe: "tiefes «Uu-hu», selten" }),
    P("blaetter", "Blätterrauschen", "Schichten", 0, 100, 25, "%")],
  varianten: [
    V("Teich bei Nacht", "Unken, Frösche, ab und zu der Uhu", {}),
    V("Unkenchor", "viele Unken, auf den Tönen der Tonleiter", { unken: 100, froesche: 10, eulen: 15, tonalitaet: 80, dichte: 60 }),
    V("Froschknarren", "hölzern knarzend, nah", { froesche: 95, unken: 30, rauheit: 70, raum: 50 }),
    V("Uhu im Nebel", "der Uhu ruft, sonst fast Stille", { eulen: 100, unken: 25, froesche: 0, blaetter: 45, raum: 95, dichte: 25 }),
    V("Wind im Wald", "Blätter und vereinzelte Rufe", { blaetter: 90, unken: 30, froesche: 15, eulen: 30, bewegung: 70 }),
    V("Nachtfläche", "zur dunklen Fläche verwandelt", { verwandlung: 85, tonalitaet: 50 }),
  ],
  rechne(w, rate, kx) {
    const rnd = zufall(kx.seed ?? 1), ueber = Math.min(4, kx.dauer / 4), D = kx.dauer + ueber, n = Math.round(D * rate), L = new Float32Array(n), R = new Float32Array(n);
    const hell = w.helligkeit / 100, dichte = w.dichte / 100, bew = glatt(rnd, 0.04 + (w.bewegung / 100) * 0.25);
    // Unken: jedes Tier ruft in seinem eigenen, ruhigen Takt (1–2,5 s) auf seiner eigenen Tonhöhe
    const anzUnken = Math.round((w.unken / 100) * (2 + dichte * 8));
    for (let u = 0; u < anzUnken; u++) {
      const [gl, gr] = pan2((rnd() * 2 - 1) * (w.raum / 100)), ferne = 0.3 + 0.7 * rnd();
      let f = 380 + rnd() * 160; if (rnd() < w.tonalitaet / 100) f = aufLeiter(f, kx);
      const takt = 1 + rnd() * 1.5, d = 0.18 + rnd() * 0.15;
      for (let t = rnd() * takt; t < D; t += takt * (0.92 + 0.16 * rnd())) if (rnd() < 0.5 + 0.5 * bew(t)) unke(L, R, rate, Math.round(t * rate), { f, d, gl, gr, a: ferne * 0.35 });
    }
    // Frösche: Rufserien
    for (const t of zeiten(rnd, D, 0.05 + dichte * 0.6, kx)) {
      if (rnd() > w.froesche / 100) continue;
      const [gl, gr] = pan2((rnd() * 2 - 1) * (w.raum / 100)), serie = 1 + Math.floor(rnd() * 4), pulse = 25 + rnd() * 45 * (0.5 + w.rauheit / 100), f1 = (500 + rnd() * 500) * (0.7 + hell * 0.6), a = 0.15 + 0.2 * rnd();
      for (let k = 0; k < serie; k++) frosch(L, R, rate, Math.round((t + k * (0.5 + rnd() * 0.3)) * rate), { pulse, d: 0.2 + rnd() * 0.35, f1, gl, gr, a, rnd });
    }
    // Uhu: selten, tief, fern
    for (const t of zeiten(rnd, D, 0.03 + dichte * 0.1, kx)) {
      if (rnd() > w.eulen / 100) continue;
      const [gl, gr] = pan2((rnd() * 2 - 1) * (w.raum / 100) * 0.8); let f = 280 + rnd() * 50; if (rnd() < w.tonalitaet / 100) f = aufLeiter(f, kx);
      uhu(L, R, rate, Math.round(t * rate), { f, gl, gr, a: 0.4 + 0.2 * rnd(), rnd });
    }
    // Blätter: Rauschen in Böen, links und rechts verschieden
    if (w.blaetter > 0) {
      const f = [new SVF(), new SVF()], boe = [glatt(rnd, 0.2 + (w.bewegung / 100) * 0.6), glatt(rnd, 0.25 + (w.bewegung / 100) * 0.6)];
      for (let i = 0; i < n; i++) {
        if ((i & 63) === 0) { f[0].setze(2500 + hell * 4000, 0.5, rate); f[1].setze(2800 + hell * 4000, 0.5, rate); }
        const t = i / rate, a = (w.blaetter / 100) * 0.12; L[i] += f[0].schritt(rnd() * 2 - 1).band * a * boe[0](t) ** 2; R[i] += f[1].schritt(rnd() * 2 - 1).band * a * boe[1](t) ** 2;
      }
    }
    let k = verwandeln([L, R], rate, w, kx, rnd, D);
    k = farbe(k, rate, { tief: 2500 + hell * 10000, hoch: 120 });
    return pegelnLaut(nahtlos(ausdehnen(k, rate, w.raum * 0.6), rate, kx.dauer, ueber), 0.065);
  },
};

// ---------- Kosmos ----------
/** Perioden echter Pulsare (s) aus den Katalogen; «takt» rastet die Periode von B0329+54 auf das nächste Vielfache eines Schlags ein */
export const PULSARE = Object.freeze({
  b0329: { name: "PSR B0329+54 (0,714 s)", periode: 0.714520 },
  vela: { name: "Vela-Pulsar (11,2 je Sekunde)", periode: 0.089328 },
  b0950: { name: "PSR B0950+08 (0,253 s)", periode: 0.253065 },
  krebs: { name: "Krebsnebel-Pulsar (30 je Sekunde)", periode: 0.033392 },
  takt: { name: "im Takt (B0329+54 eingerastet)", periode: null },
});

/** ein Pulsarpuls: Rauschen durch einen Bandpass, der von hoch nach tief gleitet (Dispersion im interstellaren Medium) und ein dumpfer Kern */
function puls(L, R, rate, i0, { dauer, hoch, tief, a, gl, gr, rnd, kern }) {
  const m = Math.round(dauer * rate), f = new SVF(), k = new SVF().setze(Math.max(70, tief), 3, rate);
  for (let i = 0; i < m && i0 + i < L.length; i++) {
    const u = i / m;
    if ((i & 15) === 0) f.setze(tief + (hoch - tief) * (1 - u) ** 2.5, 4, rate);   // Ankunftszeit ∝ 1/f²: hohe Frequenzen zuerst
    const e = Math.sin(Math.PI * Math.min(0.5, u * 8)) * (1 - u) ** 0.8;
    const x = (f.schritt(rnd() * 2 - 1).band * 1.6 + k.schritt(i < 24 ? (rnd() * 2 - 1) * Math.sin(Math.PI * i / 24) : 0).band * kern * 3) * e * a;
    L[i0 + i] += x * gl; R[i0 + i] += x * gr;
  }
}

const kosmos = {
  key: "kosmos", name: "Kosmos", rolle: "flaeche", pan: 0, pegel: -3,
  parameter: [...MAKRO({ dichte: 40, bewegung: 40, rauheit: 30, helligkeit: 35, raum: 80, tonalitaet: 20, verwandlung: 0 }),
    P("pulsar", "Pulsar", "Schichten", 0, 100, 55, "%"), P("plasma", "Plasmawellen", "Schichten", 0, 100, 50, "%", { hilfe: "Whistler (fallende Pfiffe aus Blitzen) und Chorus (steigende Zirpen aus dem Strahlungsgürtel)" }),
    P("chirp", "Gravitationswellen", "Schichten", 0, 100, 30, "%", { hilfe: "das ansteigende «Wuup» zweier verschmelzender schwarzer Löcher" }),
    P("rauschen", "Radiorauschen", "Schichten", 0, 100, 40, "%", { hilfe: "Rauschwellen wie in Jupiters Radiostürmen, dazu das kosmische Hintergrundrauschen" }),
    { key: "stern", name: "Pulsar", gruppe: "Detail", wahl: Object.entries(PULSARE).map(([wert, p]) => ({ wert, name: p.name })), std: "b0329" },
    P("dispersion", "Dispersion", "Detail", 0, 100, 50, "%", { hilfe: "wie stark jeder Puls von hoch nach tief gleitet (Weg durch das interstellare Gas)" })],
  varianten: [
    V("Tiefer Raum", "alle vier Signale, ruhig gemischt", {}),
    V("Pulsar B0329+54", "der Pulsar allein, 84 Pulse je Minute", { pulsar: 100, plasma: 0, chirp: 0, rauschen: 30 }),
    V("Pulsar im Takt", "Pulse auf dem Raster des Tracks", { stern: "takt", pulsar: 90, plasma: 20, chirp: 0, rauschen: 25 }),
    V("Vela schnarrt", "der Vela-Pulsar: ein schnarrender Ton aus 11 Pulsen je Sekunde", { stern: "vela", pulsar: 90, plasma: 15, dispersion: 25, rauschen: 30 }),
    V("Magnetosphäre", "Whistler und Chorus, wie im Strahlungsgürtel der Erde", { plasma: 100, pulsar: 0, chirp: 0, rauschen: 30, dichte: 55 }),
    V("Verschmelzung", "Gravitationswellen-Chirps über Radiorauschen", { chirp: 100, rauschen: 70, pulsar: 0, plasma: 15 }),
    V("Kosmische Fläche", "zur schwebenden Fläche verwandelt", { verwandlung: 85, tonalitaet: 55 }),
  ],
  rechne(w, rate, kx) {
    const rnd = zufall(kx.seed ?? 1), ueber = Math.min(4, kx.dauer / 4), D = kx.dauer + ueber, n = Math.round(D * rate), L = new Float32Array(n), R = new Float32Array(n);
    const hell = w.helligkeit / 100, dichte = w.dichte / 100, bew = glatt(rnd, 0.03 + (w.bewegung / 100) * 0.2);
    // Pulsar: streng periodisch; die Stärke schwankt von Puls zu Puls, manchmal fällt ein Puls aus («Nulling»)
    if (w.pulsar > 0) {
      const p = PULSARE[w.stern] ?? PULSARE.b0329, schlag = 60 / (kx.bpm ?? 90);
      const roh = p.periode ?? schlag * Math.max(1, Math.round(PULSARE.b0329.periode / schlag));
      // Schleife ohne Naht: eine ganze Zahl von Perioden in der Spurdauer (weicht höchstens um eine halbe Periode auf die ganze Spur ab)
      const periode = kx.dauer / Math.max(1, Math.round(kx.dauer / roh));
      const schnell = periode < 0.15, disp = w.dispersion / 100, [gl, gr] = pan2(0);
      const dauer = Math.min(periode * 0.8, 0.04 + disp * 0.4), hoch = (900 + hell * 3500) * (schnell ? 0.7 : 1), tief = 90 + (1 - disp) * 300;
      for (let t = 0.05, k = 0; t < D; t += periode, k++) {
        if (rnd() < 0.04 + (w.rauheit / 100) * 0.1) continue;
        const a = (w.pulsar / 100) * (schnell ? 0.18 : 0.45) * (0.45 + 0.55 * rnd()) * (0.6 + 0.4 * bew(t));
        puls(L, R, rate, Math.round(t * rate), { dauer, hoch, tief, a, gl, gr, rnd, kern: schnell ? 0.3 : 1 });
      }
    }
    // Plasmawellen: Whistler f(t) = (Dw / (t + t0))², Chorus als steigende Zirpen in Gruppen
    if (w.plasma > 0) {
      const lage = 0.35 + hell * 0.65;
      for (const t of zeiten(rnd, D, 0.08 + dichte * 0.35, kx)) {
        const [gl, gr] = pan2((rnd() * 2 - 1) * (w.raum / 100) * 0.7), a = (w.plasma / 100) * (0.15 + 0.15 * rnd());
        const fHoch = (5000 + rnd() * 3000) * lage, fTief = (600 + rnd() * 500) * lage, dauer = 0.6 + rnd() * 1.6;
        const t0 = dauer / (Math.sqrt(fHoch / fTief) - 1), Dw = Math.sqrt(fHoch) * t0, m = Math.round(dauer * rate), i0 = Math.round(t * rate);
        let ph = 0;
        for (let i = 0; i < m && i0 + i < n; i++) { const u = i / rate, f = (Dw / (u + t0)) ** 2, e = Math.min(1, u * 40) * (1 - i / m) ** 1.3; const x = Math.sin(ph) * e * a; ph += (TAU * f) / rate; L[i0 + i] += x * gl; R[i0 + i] += x * gr; }
      }
      for (const t of zeiten(rnd, D, 0.06 + dichte * 0.25, kx)) {   // Chorus: eine Gruppe von 5–20 steigenden Zirpen
        const anz = 5 + Math.floor(rnd() * 15 * (0.4 + dichte)), basis = (900 + rnd() * 900) * lage;
        for (let c = 0; c < anz; c++) {
          const tc = t + c * (0.06 + rnd() * 0.18), [gl, gr] = pan2((rnd() * 2 - 1) * (w.raum / 100)), d = 0.08 + rnd() * 0.35;
          let f0 = basis * (0.8 + 0.5 * rnd()); if (rnd() < w.tonalitaet / 100) f0 = aufLeiter(f0, kx);
          const f1 = f0 * (1.4 + rnd() * 0.8), m = Math.round(d * rate), i0 = Math.round(tc * rate), a = (w.plasma / 100) * (0.05 + 0.08 * rnd());
          let ph = 0;
          for (let i = 0; i < m && i0 + i < n; i++) { const u = i / m, e = Math.sin(Math.PI * u) ** 1.5; const x = Math.sin(ph) * e * a; ph += (TAU * f0 * (f1 / f0) ** u) / rate; L[i0 + i] += x * gl; R[i0 + i] += x * gr; }
        }
      }
    }
    // Gravitationswellen-Chirp: Frequenz und Amplitude steigen bis zur Verschmelzung, danach klingt das neue Loch ab (Ringdown)
    if (w.chirp > 0) {
      for (const t of zeiten(rnd, D, 0.04 + dichte * 0.08, kx)) {
        const tc = 1.2 + rnd() * 2.5, fStart = 55 + rnd() * 15, fEnde = 300 + rnd() * 150, fr = fEnde * 1.15, tau = 0.05 + rnd() * 0.08, a = (w.chirp / 100) * 0.5;
        const [gl, gr] = pan2((rnd() * 2 - 1) * 0.3), i0 = Math.round(t * rate), tEnde = tc * (1 - (fStart / fEnde) ** (8 / 3)), m = Math.round((tEnde + 6 * tau) * rate);
        let ph = 0;
        for (let i = 0; i < m && i0 + i < n; i++) {
          const u = i / rate; let f, amp;
          if (u < tEnde) { f = fStart * (1 - u / tc) ** (-3 / 8); f = Math.min(f, fEnde); amp = (f / fEnde) ** (2 / 3) * Math.min(1, u * 4); }
          else { f = fEnde + (fr - fEnde) * (1 - Math.exp(-(u - tEnde) / tau)); amp = Math.exp(-(u - tEnde) / tau); }
          const x = (Math.sin(ph) + 0.3 * Math.sin(2 * ph)) * amp * a; ph += (TAU * f) / rate; L[i0 + i] += x * gl; R[i0 + i] += x * gr;
        }
      }
    }
    // Radiorauschen: Rauschwellen (L-Bursts) und ein feines Hintergrundrauschen
    if (w.rauschen > 0) {
      const f = [new SVF(), new SVF()], welle = [glatt(rnd, 0.3 + (w.bewegung / 100) * 1.2), glatt(rnd, 0.35 + (w.bewegung / 100) * 1.2)], h = [new SVF(), new SVF()];
      for (let i = 0; i < n; i++) {
        const t = i / rate;
        if ((i & 63) === 0) for (let c = 0; c < 2; c++) { f[c].setze((400 + hell * 2500) * (0.7 + 0.6 * welle[c](t)), 1.5, rate); h[c].setze(5000 + hell * 6000, 0.5, rate); }
        const a = (w.rauschen / 100);
        L[i] += f[0].schritt(rnd() * 2 - 1).band * a * 0.35 * welle[0](t) ** 3 + h[0].schritt(rnd() * 2 - 1).band * a * 0.025;
        R[i] += f[1].schritt(rnd() * 2 - 1).band * a * 0.35 * welle[1](t) ** 3 + h[1].schritt(rnd() * 2 - 1).band * a * 0.025;
      }
    }
    let k = verwandeln([L, R], rate, w, kx, rnd, D);
    k = farbe(k, rate, { tief: 3000 + hell * 12000, hoch: w.chirp > 50 ? 45 : 90 });
    return pegelnLaut(nahtlos(ausdehnen(k, rate, w.raum * 0.6), rate, kx.dauer, ueber), w.pulsar > 70 ? 0.045 : 0.06);
  },
};

export const MAKROS = Object.freeze({
  ...MAKROS020,
  delfine: { dichte: "Pfiffe und Klicksalven je Sekunde, Anzahl der Tiere", bewegung: "Wandern der Tiere im Raum", rauheit: "Rauheit der Pfiffe", helligkeit: "Filter, Lage der Klicks", raum: "Verteilung im Panorama", tonalitaet: "Anteil der Pfiffe auf der Tonleiter", verwandlung: "Rufe → schwebende Fläche" },
  nachtwald: { dichte: "Anzahl der Unken, Rufe der Frösche und des Uhus", bewegung: "Schwanken der Rufe und Böen", rauheit: "Pulsdichte des Froschknarrens", helligkeit: "Formanten und Filter", raum: "Verteilung im Raum", tonalitaet: "Anteil der Unken und Uhurufe auf der Tonleiter", verwandlung: "Rufe → dunkle Fläche" },
  kosmos: { dichte: "Plasmawellen und Chirps je Minute", bewegung: "Schwanken der Pulse und des Rauschens", rauheit: "ausfallende Pulse (Nulling)", helligkeit: "Lage der Plasmawellen, Filter", raum: "Breite", tonalitaet: "Chorus-Zirpen auf der Tonleiter, Resonatoren", verwandlung: "Signale → kosmische Fläche" },
});

export default {
  id: "natur", version: "0.3.0", name: "Natur und Flächen", flaeche: true,
  beschreibung: "Alle Familien aus 0.2.0, dazu Delfine, Nachtwald und Kosmos (Pulsare, Plasmawellen, Gravitationswellen, Radiorauschen). Synthetisch und so bezeichnet.",
  stimmen: { ...natur020.stimmen, delfine, nachtwald, kosmos },
};
