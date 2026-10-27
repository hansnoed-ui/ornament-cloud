// ORNAMENT LAB – Mischpult (AUDIO → AUDIO, seit Lab 0.1.45, docs/KLANGTRANSFORMATION.md): eigene Töne und Beats in der Klangfarbe
// bearbeiten und fertig mischen. Drei Operationen nach Prinzipien der Studiotechnik:
//   Filter in Bewegung – das Zustandsvariable Filter der Synthesizer (Moog, Oberheim SEM), die Grenzfrequenz steht, schwingt (LFO),
//                        folgt dem Anschlag (Auto-Wah) oder einem Steuersignal (ein Bild öffnet das Filter)
//   Effekte            – Zerkleinern (Bitcrusher, Glitch), Sättigung (Band, Röhre, hart, Wavefolder), Chorus und Flanger, Echo im Tempo
//                        (Dub, Ping-Pong), Raum
//   Fertig mischen     – Mastering: Wärme und Glanz, Bass in der Mitte, Bus-Kompressor, Lautheit nach BS.1770 und Limiter
// Jede gibt einen Klang aus, der wieder Ausgang sein kann, die Zahlen sind modulierbar: sechs Filter, sechs Antriebe, sechs Lautheiten
// nebeneinander zum Anhören. Gerechnet wird in kern/mischpult.js, in der Abtastrate der Quelle.
import * as W from "../kern/klangwerk.js";
import * as M from "../kern/mischpult.js";

const DATEI = "alpha/lab/operationen/mischpult.js, alpha/lab/kern/mischpult.js";
const z = (x, s = 100) => String(W.rund(x, s)).replace(".", ",");
const PEGEL = { id: "pegel", name: "Pegel", art: "wahl", standard: "quelle", optionen: [{ wert: "quelle", name: "wie die Quelle (nur gegen Übersteuerung)" }, { wert: "normal", name: "auf −1 dBFS bringen" }] };
const ANTEIL = { id: "anteil", name: "Anteil (0 trocken, 1 nur Effekt)", art: "zahl", min: 0, max: 1, standard: 1, schritt: 0.05 };
const lies = (werte, u) => { const p = Math.min(1, Math.max(0, u)) * (werte.length - 1), a = Math.floor(p), b = Math.min(werte.length - 1, a + 1); return werte[a] + (werte[b] - werte[a]) * (p - a); };
const angaben = (spuren, rate) => ({ abtastrate: rate, kanaele: spuren.length, sekunden: W.rund(spuren[0].length / rate) });
const mischen = (trocken, nass, anteil) => nass.map((s, c) => { const q = trocken[Math.min(c, trocken.length - 1)], o = new Float32Array(s.length); for (let i = 0; i < s.length; i++) o[i] = q[i] * (1 - anteil) + s[i] * anteil; return o; });

/** Tempo der Quelle: angegeben, sonst geschätzt */
function quellTempo(spuren, rate, angegeben) {
  if (angegeben > 0) return { bpm: angegeben, art: "angegeben" };
  const t = W.tempoSchaetzen(W.mono(spuren), rate);
  return { bpm: t.bpm, art: "geschätzt", sicherheit: t.sicherheit };
}

// ---------------------------------------------------------------------------------------------------------------------------------
const BEWEGUNG = [
  { wert: "steht", name: "steht" }, { wert: "lfo", name: "schwingt (LFO, Geschwindigkeit unten)" }, { wert: "takt", name: "schwingt im Takt (Takte je Schwingung)" },
  { wert: "anschlag", name: "folgt dem Anschlag (Auto-Wah)" }, { wert: "signal", name: "folgt dem Steuersignal (Eingang)" }, { wert: "auf", name: "öffnet sich über die Dauer" },
];
export const filter = {
  id: "lab.filter",
  name: "Filter in Bewegung",
  version: "0.1.0",
  klasse: "zeitlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Zustandsvariables Filter der analogen Synthesizer (Oberheim SEM; V. Zavalishin, «The Art of VA Filter Design»), Auto-Wah, Filterfahrten im Drum and Bass und in der elektronischen Musik", datei: DATEI },
  beschreibung: "Formt die Klangfarbe mit einem Filter wie im Synthesizer: Tiefpass, Hochpass, Bandpass oder Kerbe, mit Resonanz. Die Grenzfrequenz steht, schwingt frei oder im Takt, folgt dem Anschlag (Auto-Wah), einem Steuersignal oder öffnet sich über die Dauer.",
  eingaenge: [{ name: "ton", typ: "AUDIO" }, { name: "signal", typ: "CONTROL_SIGNAL", optional: true, vorwaehlen: false }],
  ausgaenge: [{ name: "klang", typ: "AUDIO" }],
  parameter: [
    { id: "art", name: "Filter", art: "wahl", standard: "tiefpass", optionen: [{ wert: "tiefpass", name: "Tiefpass (dunkler)" }, { wert: "hochpass", name: "Hochpass (dünner)" }, { wert: "bandpass", name: "Bandpass (wie durch ein Telefon)" }, { wert: "kerbe", name: "Kerbe (ein Loch im Klang)" }] },
    { id: "frequenz", name: "Grenzfrequenz (Hz)", art: "zahl", min: 40, max: 16000, standard: 800, schritt: 10 },
    { id: "resonanz", name: "Resonanz", art: "zahl", min: 0, max: 1, standard: 0.4, schritt: 0.05 },
    { id: "bewegung", name: "Bewegung", art: "wahl", standard: "takt", optionen: BEWEGUNG },
    { id: "tiefe", name: "Tiefe der Bewegung (Oktaven nach oben)", art: "zahl", min: 0, max: 7, standard: 3, schritt: 0.1 },
    { id: "lfo", name: "Geschwindigkeit (Hz, beim LFO)", art: "zahl", min: 0.02, max: 20, standard: 0.5, schritt: 0.01 },
    { id: "takte", name: "Takte je Schwingung (im Takt; 0,25 = je Schlag)", art: "zahl", min: 0.25, max: 16, standard: 2, schritt: 0.25 },
    { id: "bpm", name: "Tempo der Quelle (BPM, 0 = schätzen)", art: "zahl", min: 0, max: 300, standard: 0, schritt: 0.5 },
    ANTEIL,
    PEGEL,
  ],
  voraussetzungen: ["keine (reines JavaScript)"],
  ressourcen: { zeit: "je Abtastwert und Kanal ein Filterschritt, alle 16 Abtastwerte eine neue Grenzfrequenz", speicher: "der Klang zweimal" },
  reproduzierbar: "ja",
  varianten: "moduliert",
  moduliert: "frequenz",

  async ausfuehren({ ton, signal }, p, kontext = {}) {
    if (p.bewegung === "signal" && !signal?.werte?.length) throw new Error("Filter: die Bewegung «folgt dem Steuersignal» braucht ein Steuersignal als Eingang");
    const spuren = W.spurenVon(ton), rate = ton.rate, n = spuren[0].length;
    const tempo = p.bewegung === "takt" ? quellTempo(spuren, rate, p.bpm) : null;
    const anschlag = p.bewegung === "anschlag" ? M.huellkurve(W.mono(spuren), rate) : null;
    // m(i) ∈ [0, 1]: wie weit das Filter um «tiefe» Oktaven über der Grenzfrequenz offen steht
    const m = {
      steht: () => 0,
      lfo: (i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * p.lfo * i) / rate),
      takt: (i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (rate * p.takte * 4 * (60 / tempo.bpm))),
      anschlag: (i) => anschlag[i],
      signal: (i) => lies(signal.werte, i / Math.max(1, n - 1)),
      auf: (i) => i / Math.max(1, n - 1),
    }[p.bewegung];
    kontext.melden?.(`Filter: ${p.art} …`);
    await W.pause();
    const nass = spuren.map((s) => M.bewegtesFilter(s, rate, (i) => p.frequenz * 2 ** (p.tiefe * m(i)), { art: p.art, resonanz: p.resonanz }));
    const aus = p.anteil < 1 ? mischen(spuren, nass, p.anteil) : nass;
    const verstaerkung = W.pegeln(aus, p.pegel);
    const bew = BEWEGUNG.find((b) => b.wert === p.bewegung).name.split(" (")[0];
    return {
      ausgaben: [{ typ: "AUDIO", titel: `Filter: ${p.art} ${Math.round(p.frequenz)} Hz, ${bew}${p.bewegung === "steht" ? "" : ` (+${z(p.tiefe, 10)} Okt.)`}`, ton: W.alsTon(aus, rate) }],
      protokoll: { art: p.art, frequenz: p.frequenz, resonanz: p.resonanz, bewegung: p.bewegung, tiefe: p.tiefe, tempo, ...angaben(spuren, rate), verstaerkung: W.rund(verstaerkung, 1e4) },
    };
  },
};

// ---------------------------------------------------------------------------------------------------------------------------------
const EFFEKTE = [
  { wert: "zerkleinern", name: "Zerkleinern: weniger Bit und Abtastrate (Bitcrusher, Glitch)" },
  { wert: "band", name: "Sättigung: Band, warm" }, { wert: "roehre", name: "Sättigung: Röhre, rau" },
  { wert: "hart", name: "Verzerrung: hart abgeschnitten" }, { wert: "falten", name: "Wavefolder: die Welle klappt zurück (Westküste, Elektro)" },
  { wert: "chorus", name: "Chorus: schwebende Verdopplung" }, { wert: "flanger", name: "Flanger: wandernder Kammfilter" },
  { wert: "echo", name: "Echo im Tempo (Dub, Ping-Pong)" }, { wert: "raum", name: "Raum (Nachhall)" },
];
const TEILUNGEN = [{ wert: "0.75", name: "punktierte Achtel (Dub)" }, { wert: "0.5", name: "Achtel" }, { wert: "1", name: "Viertel" }, { wert: "0.25", name: "Sechzehntel" }, { wert: "0.6667", name: "Achteltriolen" }];

export const effekt = {
  id: "lab.effekt",
  name: "Effekte",
  version: "0.1.0",
  klasse: "zeitlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Studioeffekte: Bitcrusher, Bandsättigung, Röhre, Wavefolder (Buchla, Serge), Chorus und Flanger (verzögerte Kopie mit LFO), Bandecho wie im Dub (Roland Space Echo), Nachhall nach Schroeder", datei: DATEI },
  beschreibung: "Färbt einen Klang mit einem Studioeffekt: zerkleinert wie im Glitch, gesättigt wie auf Band oder durch eine Röhre, verzerrt oder gefaltet, verdoppelt im Chorus, im Flanger, mit einem Echo im Tempo oder in einem Raum.",
  eingaenge: [{ name: "ton", typ: "AUDIO" }],
  ausgaenge: [{ name: "klang", typ: "AUDIO" }],
  parameter: [
    { id: "effekt", name: "Effekt", art: "wahl", standard: "band", optionen: EFFEKTE },
    { id: "staerke", name: "Stärke (0–1: Antrieb, Zerkleinerung, Tiefe, Rückkopplung, Grösse)", art: "zahl", min: 0, max: 1, standard: 0.5, schritt: 0.05 },
    { id: "teilung", name: "Echo: Abstand", art: "wahl", standard: "0.75", optionen: TEILUNGEN },
    { id: "bpm", name: "Echo: Tempo der Quelle (BPM, 0 = schätzen)", art: "zahl", min: 0, max: 300, standard: 0, schritt: 0.5 },
    { id: "geschwindigkeit", name: "Chorus, Flanger: Geschwindigkeit (Hz)", art: "zahl", min: 0.05, max: 8, standard: 0.6, schritt: 0.05 },
    { ...ANTEIL, standard: 0.5 },
    PEGEL,
  ],
  voraussetzungen: ["keine (reines JavaScript)"],
  ressourcen: { zeit: "je Abtastwert und Kanal wenige Rechenschritte; Echo mit geschätztem Tempo: eine Messung der Einsätze", speicher: "der Klang zwei- bis dreimal, Stereo" },
  reproduzierbar: "ja",
  varianten: "moduliert",
  moduliert: "staerke",

  async ausfuehren({ ton }, p, kontext = {}) {
    const spuren = W.spurenVon(ton), rate = ton.rate, s = p.staerke;
    kontext.melden?.(`Effekte: ${p.effekt} …`);
    await W.pause();
    let nass, tempo = null, einstellung;
    if (p.effekt === "zerkleinern") {
      einstellung = { bits: Math.round(12 - 10 * s), teilung: Math.max(1, Math.round(2 ** (s * 5))) };
      nass = spuren.map((x) => M.zerkleinern(x, einstellung));
    } else if (["band", "roehre", "hart", "falten"].includes(p.effekt)) {
      einstellung = { art: p.effekt, antrieb: W.rund(3 + 30 * s, 10) };
      nass = spuren.map((x) => M.saettigen(x, einstellung));
    } else if (p.effekt === "chorus" || p.effekt === "flanger") {
      einstellung = { art: p.effekt, geschwindigkeit: p.effekt === "flanger" ? p.geschwindigkeit / 3 : p.geschwindigkeit, tiefe: 0.3 + 0.7 * s, rueck: p.effekt === "flanger" ? 0.3 + 0.55 * s : 0, anteil: 1 };
      nass = M.chorus(spuren, rate, einstellung);
    } else if (p.effekt === "echo") {
      tempo = quellTempo(spuren, rate, p.bpm);
      einstellung = { verzoegerung: W.rund((60 / tempo.bpm) * Number(p.teilung), 1e4), rueck: 0.25 + 0.6 * s, anteil: 1, dunkel: 0.5 };
      nass = M.echo(spuren, rate, einstellung);
    } else {
      einstellung = { anteil: 0.2 + 0.75 * s };
      nass = M.raum(spuren, rate, einstellung);
    }
    const aus = mischen(spuren, nass, p.anteil);
    const verstaerkung = W.pegeln(aus, p.pegel);
    const name = EFFEKTE.find((e) => e.wert === p.effekt).name.split(":")[0].split(" (")[0];
    return {
      ausgaben: [{ typ: "AUDIO", titel: `${name}${p.effekt === "band" || p.effekt === "roehre" ? ` (${p.effekt === "band" ? "Band" : "Röhre"})` : ""}: Stärke ${z(s)}, Anteil ${z(p.anteil)}`, ton: W.alsTon(aus, rate) }],
      protokoll: { effekt: p.effekt, staerke: s, anteil: p.anteil, einstellung, tempo, ...angaben(spuren, rate), kanaeleAus: aus.length, verstaerkung: W.rund(verstaerkung, 1e4) },
    };
  },
};

// ---------------------------------------------------------------------------------------------------------------------------------
export const mastering = {
  id: "lab.mastering",
  name: "Fertig mischen (Mastering)",
  version: "0.1.0",
  klasse: "zeitlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Mastering: Bus-Kompressor (SSL), Bass in der Mitte (Elliptic EQ), Lautheit nach ITU-R BS.1770 und EBU R 128, Limiter mit Vorlauf", datei: DATEI },
  beschreibung: "Mischt einen Klang fertig: Wärme und Glanz, der Bass in der Mitte, ein sanfter Kompressor, der zusammenhält, und die Lautheit auf ein Ziel wie bei Streaming (−14 LUFS), mit einem Limiter, damit keine Spitze übersteuert.",
  eingaenge: [{ name: "ton", typ: "AUDIO" }],
  ausgaenge: [{ name: "klang", typ: "AUDIO" }],
  parameter: [
    { id: "ziel", name: "Lautheit", art: "wahl", standard: "-14", optionen: M.LAUTHEIT_ZIELE },
    { id: "kompression", name: "Kompression (0 keine, 1 dicht)", art: "zahl", min: 0, max: 1, standard: 0.5, schritt: 0.05 },
    { id: "waerme", name: "Wärme (dB unter 120 Hz)", art: "zahl", min: -6, max: 6, standard: 1, schritt: 0.5 },
    { id: "glanz", name: "Glanz (dB über 8 kHz)", art: "zahl", min: -6, max: 6, standard: 1.5, schritt: 0.5 },
    { id: "breite", name: "Stereobreite (1 wie die Quelle; der Bass bleibt in der Mitte)", art: "zahl", min: 0, max: 2, standard: 1.1, schritt: 0.05 },
    { id: "decke", name: "Höchste Spitze (dBFS)", art: "zahl", min: -6, max: -0.1, standard: -1, schritt: 0.1 },
  ],
  voraussetzungen: ["keine (reines JavaScript)"],
  ressourcen: { zeit: "Filter, Kompressor und Limiter je Abtastwert, die Lautheit drei- bis fünfmal gemessen (60 s Stereo: etwa eine Sekunde)", speicher: "der Klang vier- bis fünfmal" },
  reproduzierbar: "ja",
  varianten: "moduliert",
  moduliert: "kompression",

  async ausfuehren({ ton }, p, kontext = {}) {
    const spuren = W.spurenVon(ton), rate = ton.rate;
    kontext.melden?.("Fertig mischen …");
    await W.pause();
    const r = M.mastern(spuren, rate, { ziel: Number(p.ziel), decke: p.decke, waerme: p.waerme, glanz: p.glanz, breite: p.breite, kompression: p.kompression });
    if (r.angaben.lautheit === null) throw new Error("Fertig mischen: der Klang ist still");
    const a = r.angaben;
    return {
      ausgaben: [{ typ: "AUDIO", titel: `Fertig gemischt: ${z(a.lautheit, 10)} LUFS, Spitze ${z(a.spitze, 10)} dBFS`, ton: W.alsTon(r.spuren, rate) }],
      protokoll: { ...a, ziel: Number(p.ziel), ...angaben(spuren, rate),
        hinweis: "Lautheit nach ITU-R BS.1770 (integriert, mit Schwellen); die Spitze ist der höchste Abtastwert, Spitzen zwischen den Abtastwerten können bis etwa 0,5 dB höher liegen." },
    };
  },
};
