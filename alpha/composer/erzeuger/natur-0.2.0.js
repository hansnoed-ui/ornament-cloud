// Natur 0.2.0 – die fünf Familien aus Natur 0.1.0 (unverändert übernommen) und drei neue: Regen, Feuer, Insekten. Alles prozedural und
// als synthetisch bezeichnet, nach den Modellen aus Andy Farnells «Designing Sound» (Ideen nachgebaut, kein Code übernommen):
//   Regen     Tropfen als kurze Rauschstösse und kleine gestimmte Blasen (Aufprall auf Wasser), dazu ein gefiltertes Rauschbett
//   Feuer     Knistern (scharfe Klicks durch Bandpässe), Zischen (hohes Rauschen, langsam schwankend), Brausen (tiefes Rauschen)
//   Insekten  Grillen (Zirpen: Träger um 4–5 kHz, in Pulsen geöffnet) und Zikaden (Rauschen mit schnellem Amplitudenpuls, an- und
//             abschwellend), mehrere Tiere verteilt im Raum
// Makros wie in 0.1.0 (Verwandlung, Dichte, Bewegung, Rauheit, Helligkeit, Raum, Tonalität). Nach der Veröffentlichung nicht verändern.

import natur010, { glatt, resonatoren, ausdehnen, nahtlos, farbe, MAKRO, granular, MAKROS as MAKROS010 } from "./natur-0.1.0.js";
import { zufall, SVF, TAU } from "./grund.js";
import { LEITERN, grundFrequenz } from "../kern/linien.js";

const P = (key, name, gruppe, min, max, std, einheit = "", mehr = {}) => ({ key, name, gruppe, min, max, std, einheit, ...mehr });
const V = (name, beschreibung, werte) => ({ name, beschreibung, werte });
const pan2 = (p) => [Math.cos((p + 1) * Math.PI / 4), Math.sin((p + 1) * Math.PI / 4)];

/**
 * nach Effektivwert pegeln statt nach Spitze: Knistern und Tropfen haben einzelne hohe Spitzen, die sonst alles leise machen. Danach
 * werden Spitzen über 0,5 weich gerundet (tanh), ohne den Grundpegel zu verändern.
 */
function pegelnLaut([L, R], rms = 0.07) {
  let e = 0; for (let i = 0; i < L.length; i++) e += L[i] * L[i] + R[i] * R[i];
  const g = rms / Math.max(1e-9, Math.sqrt(e / (2 * L.length))), k = 0.5;
  for (const s of [L, R]) for (let i = 0; i < s.length; i++) { const x = s[i] * g, a = Math.abs(x); s[i] = a <= k ? x : Math.sign(x) * (k + (0.6 - k) * Math.tanh((a - k) / (0.6 - k))); }
  return [L, R];
}

/** Verwandlung: das Material wird zunehmend zur Granularfläche aus sich selbst, durch die Resonatoren */
function verwandeln(k, rate, w, kx, rnd, D) {
  const vw = w.verwandlung / 100;
  if (vw > 0.05) {
    const src = { kanaele: [k[0].slice(0, Math.min(k[0].length, rate * 8))], rate };
    const g = granular(src, rate, D, w, rnd, { korngroesse: 0.05 + vw * 0.5, dehnung: 1 + vw * 6, kontext: kx, tonal: w.tonalitaet / 100 });
    for (let c = 0; c < 2; c++) for (let i = 0; i < k[c].length; i++) k[c][i] = k[c][i] * (1 - vw * 0.7) + g[c][i] * vw * 1.3;
  }
  return resonatoren(k, rate, kx, { oktave: 3, q: 30 + vw * 50, anteil: Math.min(1, (w.tonalitaet / 100) * 0.6 + vw * 0.2) });
}

const regen = {
  key: "regen", name: "Regen", rolle: "flaeche", pan: 0, pegel: -3,
  parameter: [...MAKRO({ dichte: 45, bewegung: 40, helligkeit: 45, raum: 80, tonalitaet: 0, verwandlung: 0 }),
    P("tropfen", "Tropfen", "Schichten", 0, 100, 70, "%"), P("bett", "Rauschen", "Schichten", 0, 100, 45, "%", { hilfe: "das gleichmässige Rauschen vieler entfernter Tropfen" }),
    P("pfuetze", "Pfütze", "Schichten", 0, 100, 30, "%", { hilfe: "Tropfen auf Wasser: kleine gestimmte Blasen" })],
  varianten: [
    V("Landregen", "gleichmässig, mittel dicht", {}),
    V("auf dem Dach", "nah, hart, wenig Bett", { tropfen: 90, bett: 20, pfuetze: 0, helligkeit: 60, raum: 40 }),
    V("Pfützen", "Tropfen auf Wasser, glucksend", { pfuetze: 85, tropfen: 40, dichte: 30 }),
    V("Gewitterguss", "sehr dicht, rauschend", { dichte: 95, bett: 80, bewegung: 80 }),
    V("Regen singt", "Resonanzen auf den Akkordtönen", { tonalitaet: 75, verwandlung: 35 }),
    V("Regenfläche", "zur Fläche verwandelt", { verwandlung: 85, tonalitaet: 40 }),
  ],
  rechne(w, rate, kx) {
    const rnd = zufall(kx.seed ?? 1), ueber = Math.min(4, kx.dauer / 4), D = kx.dauer + ueber, n = Math.round(D * rate), L = new Float32Array(n), R = new Float32Array(n);
    const hell = w.helligkeit / 100, bew = glatt(rnd, 0.04 + (w.bewegung / 100) * 0.2), proSek = 5 + (w.dichte / 100) ** 1.5 * 220;
    for (let t = rnd() / proSek; t < D; t += -Math.log(1 - rnd() + 1e-9) / (proSek * (0.5 + bew(t)))) {
      const [gl, gr] = pan2((rnd() * 2 - 1) * (w.raum / 100)), ferne = 0.3 + 0.7 * rnd() ** 2, i0 = Math.round(t * rate);
      if (rnd() < w.tropfen / 100) {   // Aufprall: kurzer Rauschstoss durch einen Bandpass
        const f = new SVF().setze((1500 + 5000 * rnd()) * (0.5 + hell), 1.2, rate), m = Math.round((0.002 + 0.006 * rnd()) * rate), a = ferne * 0.6;
        for (let i = 0; i < m && i0 + i < n; i++) { const x = f.schritt(rnd() * 2 - 1).band * a * (1 - i / m); L[i0 + i] += x * gl; R[i0 + i] += x * gr; }
      }
      if (rnd() < (w.pfuetze / 100) * 0.4) {   // Blase: steigender Sinus, schnell verklingend
        const radius = 0.001 + rnd() ** 2 * 0.004, f0 = 3.26 / radius, d = 0.015 + radius * 8, m = Math.round(d * rate), a = ferne * 0.35;
        let ph = 0; for (let i = 0; i < m && i0 + i < n; i++) { const u = i / rate, x = Math.sin(ph) * Math.exp(-u / (d * 0.3)) * a; ph += (TAU * f0 * (1 + 3 * u)) / rate; L[i0 + i] += x * gl; R[i0 + i] += x * gr; }
      }
    }
    if (w.bett > 0) { const f = [new SVF(), new SVF()]; for (let i = 0; i < n; i++) { if ((i & 63) === 0) { const fc = 1200 + hell * 5000 * (0.6 + 0.4 * bew(i / rate)); f[0].setze(fc, 0.5, rate); f[1].setze(fc * 1.1, 0.5, rate); } const a = (w.bett / 100) * 0.2 * (0.6 + 0.4 * bew(i / rate)); L[i] += f[0].schritt(rnd() * 2 - 1).band * a; R[i] += f[1].schritt(rnd() * 2 - 1).band * a; } }
    let k = verwandeln([L, R], rate, w, kx, rnd, D);
    k = farbe(k, rate, { tief: 3000 + hell * 13000, hoch: 150 });
    return pegelnLaut(nahtlos(ausdehnen(k, rate, w.raum * 0.6), rate, kx.dauer, ueber));
  },
};

const feuer = {
  key: "feuer", name: "Feuer", rolle: "flaeche", pan: 0, pegel: -3,
  parameter: [...MAKRO({ dichte: 40, bewegung: 50, rauheit: 50, helligkeit: 45, raum: 50, tonalitaet: 0, verwandlung: 0 }),
    P("knistern", "Knistern", "Schichten", 0, 100, 70, "%"), P("zischen", "Zischen", "Schichten", 0, 100, 30, "%"), P("brausen", "Brausen", "Schichten", 0, 100, 50, "%", { hilfe: "das tiefe Rauschen der Flammen" })],
  varianten: [
    V("Kaminfeuer", "ruhig knisternd", {}),
    V("Lagerfeuer", "grösser, mehr Brausen", { brausen: 85, knistern: 60, raum: 80, bewegung: 70 }),
    V("Glut", "leise, wenig Flammen, vereinzeltes Knacken", { dichte: 15, brausen: 25, zischen: 10 }),
    V("Funkenregen", "sehr viele helle Knister", { dichte: 90, knistern: 100, helligkeit: 70 }),
    V("Feuer singt", "Resonanzen im Brausen", { tonalitaet: 70, verwandlung: 40 }),
    V("Glutfläche", "zur Fläche verwandelt", { verwandlung: 85, tonalitaet: 35 }),
  ],
  rechne(w, rate, kx) {
    const rnd = zufall(kx.seed ?? 1), ueber = Math.min(4, kx.dauer / 4), D = kx.dauer + ueber, n = Math.round(D * rate), L = new Float32Array(n), R = new Float32Array(n);
    const hell = w.helligkeit / 100, bew = glatt(rnd, 0.1 + (w.bewegung / 100) * 0.8), lodern = glatt(rnd, 0.6);
    const proSek = 2 + (w.dichte / 100) ** 1.3 * 60;
    for (let t = rnd() / proSek; t < D; t += -Math.log(1 - rnd() + 1e-9) / proSek) {   // Knistern: Gruppen scharfer Klicks
      if (rnd() > w.knistern / 100) continue;
      const [gl, gr] = pan2((rnd() * 2 - 1) * (w.raum / 100) * 0.7), anz = 1 + Math.floor(rnd() * 4 * (0.5 + w.rauheit / 100));
      for (let c = 0; c < anz; c++) {
        const i0 = Math.round((t + c * (0.002 + rnd() * 0.012)) * rate), f = new SVF().setze((800 + 6000 * rnd()) * (0.5 + hell), 2 + 3 * rnd(), rate), m = Math.round((0.001 + 0.004 * rnd()) * rate), a = 0.5 + 0.5 * rnd();
        for (let i = 0; i < m && i0 + i < n; i++) { const x = f.schritt(i < 3 ? (rnd() * 2 - 1) * 4 : 0).band * a * Math.exp(-i / (m * 0.3)); L[i0 + i] += x * gl; R[i0 + i] += x * gr; }
      }
    }
    const fz = [new SVF(), new SVF()], fb = [new SVF(), new SVF()];
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      if ((i & 63) === 0) { fz[0].setze(4000 + hell * 6000, 0.6, rate); fz[1].setze(4400 + hell * 6000, 0.6, rate); const fc = 150 + 500 * lodern(t) * (0.5 + hell); fb[0].setze(fc, 0.6, rate); fb[1].setze(fc * 1.1, 0.6, rate); }
      const z = (w.zischen / 100) * 0.08 * (0.4 + 0.6 * bew(t)), b = (w.brausen / 100) * 0.9 * (0.3 + 0.7 * lodern(t));
      L[i] += fz[0].schritt(rnd() * 2 - 1).hoch * z + fb[0].schritt(rnd() * 2 - 1).tief * b; R[i] += fz[1].schritt(rnd() * 2 - 1).hoch * z + fb[1].schritt(rnd() * 2 - 1).tief * b;
    }
    let k = verwandeln([L, R], rate, w, kx, rnd, D);
    k = farbe(k, rate, { tief: 4000 + hell * 12000, hoch: 70 });
    return pegelnLaut(nahtlos(ausdehnen(k, rate, w.raum * 0.5), rate, kx.dauer, ueber));
  },
};

const insekten = {
  key: "insekten", name: "Insekten", rolle: "flaeche", pan: 0, pegel: -6,
  parameter: [...MAKRO({ dichte: 40, bewegung: 40, helligkeit: 50, raum: 85, tonalitaet: 30, verwandlung: 0 }),
    P("grillen", "Grillen", "Schichten", 0, 100, 80, "%"), P("zikaden", "Zikaden", "Schichten", 0, 100, 20, "%"), P("tiere", "Tiere", "Schichten", 1, 12, 5, "", { schritt: 1 })],
  varianten: [
    V("Sommernacht", "Grillen weit verteilt", {}),
    V("Mittagshitze", "Zikaden schwellen an und ab", { grillen: 20, zikaden: 90, tiere: 4, helligkeit: 65 }),
    V("eine Grille nah", "eine einzelne Grille", { tiere: 1, raum: 30, dichte: 60 }),
    V("Schwarm", "viele Tiere, dicht", { tiere: 12, dichte: 80, zikaden: 50 }),
    V("Grillen gestimmt", "auf den Tönen der Tonleiter", { tonalitaet: 100, tiere: 4 }),
    V("Insektenfläche", "zur flimmernden Fläche verwandelt", { verwandlung: 80, tonalitaet: 60 }),
  ],
  rechne(w, rate, kx) {
    const rnd = zufall(kx.seed ?? 1), ueber = Math.min(3, kx.dauer / 4), D = kx.dauer + ueber, n = Math.round(D * rate), L = new Float32Array(n), R = new Float32Array(n);
    const hell = w.helligkeit / 100, leiter = LEITERN[kx.leiter ?? "moll"].stufen, basis = grundFrequenz(kx.grundton ?? 2, kx.kammerton) * 64;
    for (let tier = 0; tier < w.tiere; tier++) {
      const [gl, gr] = pan2((rnd() * 2 - 1) * (w.raum / 100)), ferne = 0.35 + 0.65 * rnd(), zikade = rnd() < (w.zikaden / (w.grillen + w.zikaden + 1e-9));
      const f = rnd() < w.tonalitaet / 100 ? basis * 2 ** (leiter[Math.floor(rnd() * leiter.length)] / 12) * (rnd() < 0.5 ? 1 : 0.5) : (3500 + rnd() * 2000) * (0.8 + hell * 0.4);
      const bew = glatt(rnd, 0.05 + (w.bewegung / 100) * 0.3);
      if (!zikade) {   // Grille: Zirpen aus 3–5 Pulsen, im eigenen Takt (1–3 je Sekunde), leicht schwankend
        const takt = 0.35 + rnd() * 0.6, pulse = 3 + Math.floor(rnd() * 3), pl = 0.012 + rnd() * 0.01;
        for (let t = rnd() * takt; t < D; t += takt * (0.9 + 0.2 * rnd())) {
          if (rnd() > 0.3 + 0.7 * (w.dichte / 100)) continue;
          for (let p = 0; p < pulse; p++) {
            const i0 = Math.round((t + p * pl * 1.6) * rate), m = Math.round(pl * rate), a = ferne * 0.4 * (0.6 + 0.4 * bew(t));
            for (let i = 0; i < m && i0 + i < n; i++) { const x = Math.sin((TAU * f * (i0 + i)) / rate) * Math.sin((Math.PI * i) / m) * a; L[i0 + i] += x * gl; R[i0 + i] += x * gr; }
          }
        }
      } else {   // Zikade: Rauschband mit schnellem Puls, schwillt über Sekunden an und ab
        const fb = new SVF().setze(Math.max(4000, f * 1.4), 4, rate), puls = 90 + rnd() * 120, welle = 4 + rnd() * 6, ph0 = rnd() * TAU;
        for (let i = 0; i < n; i++) {
          const t = i / rate, schwell = Math.max(0, Math.sin((TAU * t) / welle + ph0)) ** 2 * (w.dichte / 100 + 0.2);
          const x = fb.schritt(rnd() * 2 - 1).band * (0.5 + 0.5 * Math.sin(TAU * puls * t)) * schwell * ferne * 0.5;
          L[i] += x * gl; R[i] += x * gr;
        }
      }
    }
    let k = verwandeln([L, R], rate, w, kx, rnd, D);
    k = farbe(k, rate, { tief: 6000 + hell * 12000, hoch: 1200 });
    return pegelnLaut(nahtlos(ausdehnen(k, rate, w.raum * 0.5), rate, kx.dauer, ueber), 0.05);
  },
};

export const MAKROS = Object.freeze({
  ...MAKROS010,
  regen: { dichte: "Tropfen je Sekunde", bewegung: "Schwanken der Stärke", rauheit: "Abweichung der Körner bei Verwandlung", helligkeit: "Filter der Tropfen und des Rauschens", raum: "Verteilung im Panorama", tonalitaet: "gestimmte Resonatoren im Rauschen", verwandlung: "Regen → Granularfläche aus dem Regen" },
  feuer: { dichte: "Knistergruppen je Sekunde", bewegung: "Schwanken von Zischen und Lodern", rauheit: "Klicks je Gruppe", helligkeit: "Filter von Knistern und Brausen", raum: "Breite", tonalitaet: "Resonatoren im Brausen", verwandlung: "Feuer → Glutfläche" },
  insekten: { dichte: "wie oft die Tiere zirpen, wie stark Zikaden anschwellen", bewegung: "Schwanken der Stärke", rauheit: "Abweichung bei Verwandlung", helligkeit: "Tonlage und Filter", raum: "Verteilung im Raum", tonalitaet: "Anteil der Tiere, die auf der Tonleiter zirpen", verwandlung: "Zirpen → flimmernde Fläche" },
});

export default {
  id: "natur", version: "0.2.0", name: "Natur und Flächen", flaeche: true,
  beschreibung: "Walchor, Vogelschwarm, Gezeiten, Pflanzentextur, Pad (wie 0.1.0), dazu Regen, Feuer, Insekten. Synthetisch und so bezeichnet.",
  stimmen: { ...natur010.stimmen, regen, feuer, insekten },
};
