// ORNAMENT LAB – Klangerzeuger (zeitliche Operation, Medienwechsel nach Klang). Der erste Klanggenerator des Audio-Formats
// (docs/AUDIO-FORMAT.md): Klang ohne Tondatei, aus dem Startwert oder aus Material, das schon im Projekt ist.
//   Bild:          gelesen wie ein Spektrogramm, Spalte für Spalte von links nach rechts. Oben hoch, unten tief, hell laut.
//                  Das Nebeneinander des Bildes wird zum Nacheinander des Klangs (Prinzip des ANS-Synthesizers und von UPIC).
//   Steuersignal:  der Verlauf wird zur Tonhöhe (der Rückweg zum Tonsignal: ein Bildsignal kann so klingen).
//   Konstellation: der Text der ORNA-Konstellation, Wort für Wort: Wortlänge gibt die Dauer, der Anfangsbuchstabe die Tonhöhe.
//   Startwert:     eine Tonfolge als Zufallsweg mit gelegentlichen Sprüngen, mit demselben Startwert immer dieselbe.
// Gerechnet wird in reinem JavaScript (kern/klang.js), nicht mit Web Audio: derselbe Startwert ist überall derselbe Klang.
// Das Ergebnis ist AUDIO wie eine eigene Tondatei: abspielbar, als WAV im Archiv, mit «Tonsignal» wieder Steuersignal für Bilder.
import { zufall } from "../../../alpha/the-fictory/analyse.js?v=23";
import { luminanz } from "../kern/bilddaten.js";
import { RATE, STIMMUNGEN, KLANGFARBEN, tonhoehe, schwingung, ton, nachhall, abschliessen } from "../kern/klang.js";

const QUELLEN = [
  { wert: "auto", name: "aus dem Eingang (Bild, sonst Signal, sonst Konstellation, sonst Startwert)" },
  { wert: "bild", name: "Bild lesen (Spalten nacheinander)" },
  { wert: "signal", name: "Steuersignal als Tonhöhe" },
  { wert: "konstellation", name: "Text der Konstellation, Wort für Wort" },
  { wert: "startwert", name: "Tonfolge aus dem Startwert" },
];
const rund = (x, s = 1000) => Math.round(x * s) / s;
const pause = () => new Promise((ok) => setTimeout(ok, 0));
const HOECHSTENS_TOENE = 2000;

/** Bild → Stärke je Band und Spalte (Mittel der Helligkeit, quadriert, damit Dunkles still bleibt); Band 0 ist oben */
function spektrogramm(b, baender, spalten) {
  const s = new Float32Array(baender * spalten), n = new Uint32Array(baender * spalten);
  for (let y = 0; y < b.height; y++) {
    const z = Math.min(baender - 1, Math.floor((y * baender) / b.height));
    for (let x = 0; x < b.width; x++) {
      const i = (y * b.width + x) * 4, k = z * spalten + Math.min(spalten - 1, Math.floor((x * spalten) / b.width));
      s[k] += (luminanz(b.data[i], b.data[i + 1], b.data[i + 2]) / 255) * (b.data[i + 3] / 255); n[k]++;
    }
  }
  for (let k = 0; k < s.length; k++) s[k] = n[k] ? (s[k] / n[k]) ** 2 : 0;
  return s;
}

/** Steuersignal an der Stelle u (0–1), linear zwischen den Werten */
const lies = (werte, u) => { const p = Math.min(1, Math.max(0, u)) * (werte.length - 1), a = Math.floor(p), b = Math.min(werte.length - 1, a + 1); return werte[a] + (werte[b] - werte[a]) * (p - a); };

/** Text → Töne: je Wort einer, Dauer nach Wortlänge, nach Satzzeichen eine Pause; Anfangsbuchstabe a … z → Tonraum unten … oben */
function textToene(text, dauer) {
  const woerter = text.split(/\s+/).filter((w) => /\p{L}/u.test(w)).slice(0, HOECHSTENS_TOENE);
  const gewichte = woerter.map((w) => w.replace(/[^\p{L}]/gu, "").length + (/[.;:!?]$/.test(w) ? 3 : /,$/.test(w) ? 1.5 : 0.5));
  const summe = gewichte.reduce((a, b) => a + b, 0) || 1;
  let t = 0;
  return woerter.map((w, i) => {
    const kern = w.replace(/[^\p{L}]/gu, ""), b = kern[0].toLowerCase().normalize("NFD")[0];
    const x = b >= "a" && b <= "z" ? (b.charCodeAt(0) - 97) / 25 : 0.5;
    const e = { t, x, staerke: (0.5 + 0.5 * Math.min(1, kern.length / 12)) * (kern[0] === kern[0].toUpperCase() ? 1 : 0.75), wort: kern };
    t += (gewichte[i] / summe) * dauer;
    return e;
  });
}

export const klang = {
  id: "lab.klang",
  name: "Klangerzeuger",
  version: "0.1.0",
  klasse: "zeitlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "ANS-Synthesizer (Murzin), UPIC (Xenakis): Bild als Partitur; Oszillator und Hüllkurve der Modularsynthese", datei: "alpha/lab/operationen/klang.js, alpha/lab/kern/klang.js" },
  beschreibung: "Erzeugt Klang ohne Tondatei: liest ein Bild wie eine Partitur, macht ein Steuersignal oder den Text einer Konstellation hörbar oder zieht eine Tonfolge aus dem Startwert.",
  eingaenge: [{ name: "bild", typ: "IMAGE", optional: true }, { name: "signal", typ: "CONTROL_SIGNAL", optional: true }, { name: "konstellation", typ: "CONSTELLATION", optional: true }],
  ausgaenge: [{ name: "klang", typ: "AUDIO" }, { name: "partitur", typ: "EVENT_SEQUENCE" }],
  parameter: [
    { id: "quelle", name: "Quelle", art: "wahl", standard: "auto", optionen: QUELLEN },
    { id: "dauer", name: "Dauer (s)", art: "zahl", min: 1, max: 30, standard: 8, schritt: 0.5 },
    { id: "grundton", name: "Grundton (Hz)", art: "zahl", min: 40, max: 880, standard: 110, schritt: 1 },
    { id: "umfang", name: "Umfang (Oktaven)", art: "zahl", min: 1, max: 6, standard: 4, schritt: 0.5 },
    { id: "stimmung", name: "Stimmung", art: "wahl", standard: "pentatonik", optionen: STIMMUNGEN },
    { id: "klangfarbe", name: "Klangfarbe", art: "wahl", standard: "sinus", optionen: KLANGFARBEN },
    { id: "dichte", name: "Dichte (Töne je s; Startwert und Signal)", art: "zahl", min: 0.5, max: 16, standard: 3, schritt: 0.5 },
    { id: "baender", name: "Bänder (Zeilen des Bildes)", art: "zahl", min: 4, max: 64, standard: 24, schritt: 1 },
    { id: "anschlag", name: "Anschlag (s)", art: "zahl", min: 0.002, max: 0.5, standard: 0.01, schritt: 0.002 },
    { id: "abklingen", name: "Abklingen (s)", art: "zahl", min: 0.05, max: 4, standard: 0.6, schritt: 0.05 },
    { id: "nachhall", name: "Nachhall", art: "zahl", min: 0, max: 0.9, standard: 0.3, schritt: 0.05 },
  ],
  voraussetzungen: ["keine (reines JavaScript); zum Anhören ein Browser mit <audio>"],
  ressourcen: { zeit: "Bild: Bänder × Abtastwerte (24 Bänder, 8 s: etwa 8 Millionen Schritte); sonst je Ton einige tausend", speicher: "der Klang einkanalig, 44,1 kHz, höchstens 30 s" },
  reproduzierbar: "ja",
  varianten: "moduliert",

  async ausfuehren({ bild, signal, konstellation }, p, kontext = {}) {
    const quelle = p.quelle !== "auto" ? p.quelle : bild ? "bild" : signal ? "signal" : konstellation ? "konstellation" : "startwert";
    const fehlt = { bild: !bild && "ein Bild", signal: !signal && "ein Steuersignal", konstellation: !konstellation && "eine Konstellation" }[quelle];
    if (fehlt) throw new Error(`Klangerzeuger: die Quelle «${QUELLEN.find((q) => q.wert === quelle).name}» braucht ${fehlt} als Eingang`);
    const n = Math.round(p.dauer * RATE), pcm = new Float32Array(n), raum = { grundton: p.grundton, umfang: p.umfang, stimmung: p.stimmung };
    const farbe = { farbe: p.klangfarbe, anschlag: p.anschlag, abklingen: p.abklingen };
    const seed = (kontext.seed ?? 1) >>> 0, entscheidungen = [];
    let toene = null, protokoll = {};

    if (quelle === "bild") {
      const baender = Math.round(p.baender), spalten = Math.max(2, Math.min(bild.width, 512)), s = spektrogramm(bild, baender, spalten);
      for (let z = 0; z < baender; z++) {
        kontext.abbrechen?.throwIfAborted?.();
        const f = tonhoehe(1 - (z + 0.5) / baender, raum), schritt = f / RATE;
        let ph = 0;
        for (let i = 0; i < n; i++) {
          const pos = Math.max(0, (i / n) * spalten - 0.5), a = Math.min(spalten - 1, Math.floor(pos)), b = Math.min(spalten - 1, a + 1);
          const amp = s[z * spalten + a] + (s[z * spalten + b] - s[z * spalten + a]) * (pos - a);
          if (amp > 1e-4) pcm[i] += amp * schwingung(ph, p.klangfarbe);
          ph += schritt;
        }
        if (z % 4 === 3) { kontext.melden?.(`Klangerzeuger: Band ${z + 1} von ${baender}`); await pause(); }
      }
      protokoll = { gelesen: { breite: bild.width, hoehe: bild.height, baender, spalten, jeSpalte: rund(p.dauer / spalten, 1e5) }, abbildung: "Zeile → Tonhöhe (oben hoch), Helligkeit² → Stärke, Spalte → Zeit (links zuerst)" };
    } else if (quelle === "signal" && p.stimmung === "gleitend") {
      // ein gleitender Ton: das Signal ist die Tonhöhe, stärker, wo es hoch ist
      let ph = 0;
      for (let i = 0; i < n; i++) { const v = lies(signal.werte, i / n); pcm[i] = (0.3 + 0.7 * v) * schwingung(ph, p.klangfarbe); ph += tonhoehe(v, raum) / RATE; }
      protokoll = { gelesen: { werte: signal.werte.length, merkmal: signal.merkmal ?? null, quelle: signal.quelle ?? null }, abbildung: "Signal → Tonhöhe, stufenlos gleitend" };
    } else {
      if (quelle === "signal") {
        const k = Math.min(HOECHSTENS_TOENE, Math.max(1, Math.floor(p.dauer * p.dichte)));
        toene = Array.from({ length: k }, (_, j) => { const t = j / p.dichte, v = lies(signal.werte, t / p.dauer); return { t, x: v, staerke: 0.4 + 0.6 * v }; });
        protokoll = { gelesen: { werte: signal.werte.length, merkmal: signal.merkmal ?? null, quelle: signal.quelle ?? null }, abbildung: "Signal → Tonhöhe, abgetastet im Takt der Dichte" };
      } else if (quelle === "konstellation") {
        const text = konstellation.text || konstellation.frage || konstellation.gedanke || "";
        if (!text.trim()) throw new Error("Klangerzeuger: die Konstellation hat keinen Text");
        toene = textToene(text, p.dauer);
        protokoll = { gelesen: { konstellation: konstellation.id ?? null, nummer: konstellation.nummer ?? null, woerter: toene.length }, abbildung: "Wort → Ton: Länge → Dauer, Anfangsbuchstabe → Tonhöhe, gross geschrieben → stärker, Satzzeichen → Pause" };
      } else {
        const rnd = zufall(seed);
        let t = 0, x = rnd(), spruenge = 0;
        toene = [];
        while (t < p.dauer - 0.05 && toene.length < HOECHSTENS_TOENE) {
          toene.push({ t, x, staerke: 0.35 + 0.65 * rnd() });
          if (rnd() < 0.2) { x = rnd(); spruenge++; } else { x += (rnd() - 0.5) * 0.25; x = x < 0 ? -x : x > 1 ? 2 - x : x; }
          t += Math.max(0.03, -Math.log(1 - rnd()) / p.dichte);
        }
        entscheidungen.push({ art: "zufall", gegenstand: "tonfolge", gewaehlt: `${toene.length} Töne`, details: { startwert: seed, verfahren: "Zufallsweg im Tonraum (Schritt ±0,125), mit Wahrscheinlichkeit 0,2 ein Sprung; Abstände exponentiell verteilt mit der Dichte", spruenge } });
        protokoll = { abbildung: "Startwert → Zufallsweg im Tonraum", spruenge };
      }
      for (const [j, e] of toene.entries()) {
        e.frequenz = tonhoehe(e.x, raum);
        ton(pcm, RATE, e, farbe);
        if (j % 200 === 199) { kontext.abbrechen?.throwIfAborted?.(); await pause(); }
      }
    }

    const fertig = nachhall(pcm, RATE, p.nachhall), verstaerkung = abschliessen(fertig, RATE);
    if (verstaerkung === 0) throw new Error(quelle === "bild" ? "Klangerzeuger: das Bild ist ganz dunkel, es bleibt still" : "Klangerzeuger: es entsteht kein Klang");
    const titel = { bild: "Bild gelesen", signal: "Signal hörbar", konstellation: "Konstellation gelesen", startwert: `Tonfolge ${seed}` }[quelle];
    const ausgaben = [{ typ: "AUDIO", titel: `Klang: ${titel}, ${rund(p.dauer, 10)} s`, ton: { pcm: fertig, rate: RATE } }];
    if (toene) ausgaben.push({ typ: "EVENT_SEQUENCE", titel: `Partitur: ${toene.length} Töne`, daten: {
      art: "partitur", ereignisse: toene.map((e) => ({ t: rund(e.t), staerke: rund(e.staerke), hz: rund(e.frequenz, 100), ...(e.wort ? { wort: e.wort } : {}) })),
      beginn: 0, dauer: rund(p.dauer), einheit: "s", quelle: "klang" } });
    return {
      ausgaben, entscheidungen,
      protokoll: { quelle, ...protokoll, abtastrate: RATE, abtastwerte: n, toene: toene?.length ?? null, verstaerkung: rund(verstaerkung, 1e4),
        hinweis: "Abbildung, keine Deutung: welche Eigenschaft welchen Klang ergibt, ist eine gestalterische Entscheidung des Labs." },
    };
  },
};
