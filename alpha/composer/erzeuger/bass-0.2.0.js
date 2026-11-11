// Bass 0.2.0 (ornament.bienne, Phase 3, Schritt b) – alle Stimmen aus Bass 0.1.0 unverändert (gleiche Objekte, bitgleich), dazu zwei neue:
//   gedaempft  Muted Bass: Schaumstoff am Steg dämpft die Saite sofort, dazu der Daumen als dumpfer Anschlag – kurz, rund, perkussiv
//              (Richtung Session-Bass der Siebziger, Post-Rock-Strophen)
//   verzerrt   Post-Rock-Bass: Plektrum, das Signal geteilt – unten sauber (Fundament bleibt), oben über eine Verzerrung mit Mittenbetonung
// Beide bauen auf der E-Bass-Saite von 0.1.0 auf und bearbeiten sie danach. Nach der Veröffentlichung nicht mehr verändern.

import bass010 from "./bass-0.1.0.js";
import { SVF, spitze, zufall } from "./grund.js";

const P = (key, name, gruppe, min, max, std, einheit = "", mehr = {}) => ({ key, name, gruppe, min, max, std, einheit, ...mehr });
const V = (name, beschreibung, werte) => ({ name, beschreibung, werte });
const E = bass010.stimmen.ebass, eStd = Object.fromEntries(E.parameter.map((p) => [p.key, p.std]));
const param = (key) => E.parameter.find((p) => p.key === key);

function fertig(L, R, staerke) {
  const m = spitze(L, R) || 1, g = (0.9 * Math.min(1.2, staerke)) / m, n = L.length, aus = Math.min(n, 144);
  for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; }
  for (let i = 0; i < aus; i++) { const k = i / aus; L[n - 1 - i] *= k; R[n - 1 - i] *= k; }
  return [L, R];
}

const gedaempft = {
  key: "gedaempft", name: "Muted Bass", rolle: "bass", pan: 0, pegel: -3,
  parameter: [param("oktave"), param("gleitZeit"),
    P("daempfer", "Dämpfer", "Saite", 0, 100, 70, "%", { hilfe: "wie stark der Schaumstoff die Saite bremst: viel = kurzer Ton" }),
    P("daumen", "Daumen", "Anschlag", 0, 100, 60, "%", { hilfe: "dumpfer Daumenanschlag statt Finger" }),
    P("ton", "Ton", "Klang", 300, 3000, 900, "Hz", { skala: "log" }),
    P("koerper", "Körper", "Klang", 0, 100, 50, "%", { hilfe: "Wärme um 100–200 Hz" }),
    P("antrieb", "Antrieb", "Farbe", 0, 18, 3, "dB", { schritt: 0.1 })],
  varianten: [
    V("Schaumstoff", "kurz und rund, mit Daumen", {}),
    V("Handballen", "etwas länger, mehr Saite", { daempfer: 45, daumen: 35, ton: 1300 }),
    V("Filz tief", "sehr kurz, sehr dunkel, fast nur Anschlag", { daempfer: 90, daumen: 80, ton: 600, koerper: 70 }),
  ],
  rechne(w, rate, o) {
    const d = w.daempfer / 100, werte = { ...eStd, oktave: w.oktave, gleitZeit: w.gleitZeit, finger: 40 + 55 * (w.daumen / 100), position: 0.16, saite: 2.2 - 1.9 * d, hell: 35 - 25 * d, ab: 60 - 35 * d, ton: w.ton, abnehmer: 0.2, antrieb: w.antrieb };
    const [L] = E.rechne(werte, rate, o), n = L.length, tau = (0.06 + 0.5 * (1 - d) ** 2) * rate;
    const k = new SVF().setze(140, 1.1, rate), daumen = new SVF().setze(220, 0.7, rate), rnd = zufall(o.seed ?? 1), dz = Math.round(0.012 * rate);
    for (let i = 0; i < n; i++) {
      const anschlag = i < dz ? Math.sin((Math.PI * i) / dz) * (w.daumen / 100) * 0.6 * (0.9 + 0.2 * rnd()) : 0;
      const x = L[i] * Math.exp(-i / tau) + daumen.schritt(anschlag).tief * 3;
      L[i] = x + k.schritt(x).band * (w.koerper / 100) * 1.4;
    }
    return fertig(L, Float32Array.from(L), o.staerke ?? 0.8);
  },
};

const verzerrt = {
  key: "verzerrt", name: "Bass verzerrt", rolle: "bass", pan: 0, pegel: -5,
  parameter: [param("oktave"), param("gleitZeit"),
    P("trennung", "Trennung", "Verzerrung", 80, 400, 180, "Hz", { skala: "log", hilfe: "darunter bleibt der Bass sauber" }),
    P("verzerrung", "Verzerrung", "Verzerrung", 0, 36, 18, "dB", { schritt: 0.1 }),
    P("mitte", "Mitten", "Verzerrung", 400, 2500, 900, "Hz", { skala: "log", hilfe: "Mittenbetonung des verzerrten Teils" }),
    P("mischung", "Mischung", "Verzerrung", 0, 100, 55, "%", { hilfe: "Anteil des verzerrten Teils" }),
    P("saite", "Nachklang", "Saite", 0.3, 8, 3, "s", { skala: "log" })],
  varianten: [
    V("Post-Rock", "sauberes Fundament, darüber knurrende Mitten", {}),
    V("Fuzz", "stark verzerrt, breit", { verzerrung: 30, mischung: 70, mitte: 700 }),
    V("angeraut", "nur leicht angezerrt", { verzerrung: 9, mischung: 40, mitte: 1200 }),
  ],
  rechne(w, rate, o) {
    const werte = { ...eStd, oktave: w.oktave, gleitZeit: w.gleitZeit, finger: 5, hell: 70, ton: 4500, position: 0.1, saite: w.saite, abnehmer: 0.1, antrieb: 0 };
    const [L] = E.rechne(werte, rate, o), n = L.length;
    const tief = new SVF().setze(w.trennung, 0.7, rate), tief2 = new SVF().setze(w.trennung, 0.7, rate), hoch = new SVF().setze(w.trennung * 1.3, 0.7, rate);
    const mitte = new SVF().setze(w.mitte, 0.9, rate), oben = new SVF().setze(5000, 0.7, rate), g = 10 ** (w.verzerrung / 20), mix = w.mischung / 100;
    const R = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const sauber = tief2.schritt(tief.schritt(L[i]).tief).tief, h = hoch.schritt(L[i]).hoch;
      const fz = Math.tanh(g * (h + 0.4 * mitte.schritt(h).band)) / Math.tanh(g);
      const z = oben.schritt(fz).tief * 0.35 * mix;
      L[i] = sauber + z; R[i] = sauber + z * 0.92;
    }
    return fertig(L, R, o.staerke ?? 0.8);
  },
};

export default {
  id: "bass", version: "0.2.0", name: "Bass", melodisch: true,
  beschreibung: "Bass 0.1.0 (Sub, Rund, Analog, Reese, Kontrabass, E-Bass) und neu Muted Bass und verzerrter Post-Rock-Bass.",
  stimmen: { ...bass010.stimmen, gedaempft, verzerrt },
};
