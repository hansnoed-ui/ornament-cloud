// Bereiche 0.1.0 – Bearbeitungen auf einem markierten Bereich einer Spur: stumm, lauter oder leiser (auch als Steigerung oder Abfall) und
// Effekte, die nur dort wirken. Wie die Unterbrechungen rechnen sie auf einer Kopie der Tondaten, bevor die Plugin-Kette der Spur sie
// bekommt: Der Hall der Spur klingt also über einen stummen Bereich weiter, wie bei einem Mute vor dem Effektweg. Vorschau und Export
// sind dadurch gleich, die Rohdaten bleiben unverändert.
//
// Ein Bereich: { id, art: "stumm" | "pegel" | "effekt", von, bis (in Takten ab 0, gebrochen: 4.5 = Mitte von Takt 5),
//                db, dbEnde (nur «pegel»: Pegel am Anfang und am Ende des Bereichs, dazwischen gleitend),
//                ein, aus (Blenden in Sechzehnteln; 0 = nur der Klickschutz von 6 ms), kurve: "gleich" | "lin" | "s",
//                effekt: { plugin: "raum@0.1.0", parameter }, ausklang (Effektfahne klingt über das Ende hinaus), bypass, gruppe }.
// Gespeichert wird in musikalischer Zeit: Wird die Spur ersetzt, bleiben die Bereiche auf denselben Takten.

import { BLOCK } from "./motor.js";
import { ausDB } from "./dsp.js";
import { bereinigeWerte, standardWerte } from "./plugin.js";

export const BEREICHE_VERSION = "0.1.0";
export const KLICKSCHUTZ_MS = 6;
export const AUSKLANG_SEK = 8;

export const KURVEN = Object.freeze({
  gleich: { name: "gleiche Leistung", f: (u) => Math.sin((Math.PI / 2) * u) },
  lin: { name: "linear", f: (u) => u },
  s: { name: "S-Kurve", f: (u) => 0.5 - 0.5 * Math.cos(Math.PI * u) },
});
export const BLENDEN = Object.freeze([
  { wert: 0, name: "nur Klickschutz" }, { wert: 0.25, name: "1/64" }, { wert: 1, name: "1/16" }, { wert: 2, name: "1/8" },
  { wert: 4, name: "1 Schlag" }, { wert: 8, name: "2 Schläge" }, { wert: 16, name: "1 Takt" }, { wert: 32, name: "2 Takte" }, { wert: 64, name: "4 Takte" },
]);
export const ARTEN = Object.freeze({ stumm: { name: "Stumm" }, pegel: { name: "Pegel" }, effekt: { name: "Effekt" } });
/** Effekte für Bereiche: Plugins des Composers (ohne die Grenze, die eine Latenz hat) */
export const EFFEKT_PLUGINS = Object.freeze(["raum@0.1.0", "echo@0.1.0", "kanalzug@0.1.0", "glanz@0.1.0", "bassfett@0.1.0"]);

/** schnelle Effekte; zeit (Echo) wird beim Anlegen aus dem Tempo gesetzt */
export const SCHNELL_EFFEKTE = Object.freeze([
  { key: "dubecho", name: "Dub-Echo", plugin: "echo@0.1.0", parameter: { anteil: 55, rueck: 65, dunkel: 2200, duenn: 250, saettigung: 40 }, ausklang: true, tempoEcho: 0.75 },
  { key: "hallfahne", name: "Hallfahne", plugin: "raum@0.1.0", parameter: { anteil: 60, nachhall: 4.5, groesse: 1.8, daempfung: 4000, tiefschnitt: 180 }, ausklang: true },
  { key: "dunkel", name: "Filter zu", plugin: "kanalzug@0.1.0", parameter: { tiefpass: 1500 }, ausklang: false },
  { key: "duenn", name: "dünn (Telefon)", plugin: "kanalzug@0.1.0", parameter: { hochpass: 400, tiefpass: 3500, mitteF: 1500, mitteDB: 4 }, ausklang: false },
  { key: "sattigung", name: "Sättigung", plugin: "kanalzug@0.1.0", parameter: { antrieb: 14, waerme: 60, ausgang: -4 }, ausklang: false },
  { key: "glanz", name: "Glanz", plugin: "glanz@0.1.0", parameter: { menge: 60, biss: 60, luft: 4 }, ausklang: false },
  { key: "bassfett", name: "Bass fett", plugin: "bassfett@0.1.0", parameter: { sub: 60, obertoene: 40, waerme: 40 }, ausklang: false },
]);

export const taktSek = (tempo) => (60 / tempo.bpm) * (tempo.taktart?.[0] ?? 4) * (4 / (tempo.taktart?.[1] ?? 4));

/** ein Effekt-Bereich aus einem schnellen Effekt; tempo für die Echozeit */
export function effektAus(v, plugins, tempo) {
  const def = plugins[v.plugin], p = { ...standardWerte(def), ...v.parameter };
  if (v.tempoEcho) p.zeit = Math.round(v.tempoEcho * (60000 / (tempo.bpm >= 140 ? tempo.bpm / 2 : tempo.bpm)));
  return { effekt: { plugin: v.plugin, parameter: bereinigeWerte(def, p), name: v.name }, ausklang: v.ausklang };
}

/** Grenzen eines Bereichs in Abtastwerten, mit den Blendenlängen (zusammen höchstens die Länge des Bereichs) */
export function grenzen(b, rate, tempo, n) {
  const t = taktSek(tempo), beginn = tempo.beginn ?? 0;
  const a = Math.max(0, Math.round((beginn + b.von * t) * rate)), e = Math.min(n, Math.round((beginn + b.bis * t) * rate));
  const schutz = Math.round((KLICKSCHUTZ_MS / 1000) * rate), sech = (t / 16) * rate;
  let ein = Math.max(schutz, Math.round((b.ein ?? 0) * sech)), aus = Math.max(schutz, Math.round((b.aus ?? 0) * sech));
  const m = e - a;
  if (ein + aus > m) { const f = m / (ein + aus); ein = Math.floor(ein * f); aus = Math.floor(aus * f); }
  return { a, e, ein, aus };
}

/** Fenster je Abtastwert im Bereich: 0 an den Rändern, 1 innen, mit der gewählten Kurve */
function fenster(i, g, kurve) {
  const u = Math.min(1, g.ein > 0 ? (i - g.a) / g.ein : 1, g.aus > 0 ? (g.e - i) / g.aus : 1);
  return (KURVEN[kurve] ?? KURVEN.gleich).f(Math.max(0, u));
}

/**
 * Bereiche auf eine Kopie der Spur anwenden (die Quelle bleibt). tempo: { bpm, beginn, taktart }. Die Bereiche wirken nach ihrem Beginn
 * geordnet, ein späterer liest den schon veränderten Stand.
 */
export function anwenden(quelle, rate, bereiche, tempo, plugins) {
  const liste = (bereiche ?? []).filter((b) => ARTEN[b.art] && !b.bypass && b.bis > b.von).sort((x, y) => x.von - y.von);
  // einkanalig auf beide Seiten (wie im Motor), damit Effekte in Stereo rechnen können
  const k = (liste.length && quelle.length === 1 ? [quelle[0], quelle[0]] : quelle).map((s) => Float32Array.from(s));
  const n = k[0].length;
  for (const b of liste) {
    const g = grenzen(b, rate, tempo, n);
    if (g.e - g.a < 16) continue;
    WIRKUNG[b.art](k, g, b, rate, plugins);
  }
  return k;
}

const WIRKUNG = {
  stumm(k, g, b) {
    for (let i = g.a; i < g.e; i++) { const v = 1 - fenster(i, g, b.kurve); for (const s of k) s[i] *= v; }
  },
  pegel(k, g, b) {
    const d0 = Number.isFinite(b.db) ? b.db : 0, d1 = Number.isFinite(b.dbEnde) ? b.dbEnde : d0, m = g.e - g.a;
    for (let i = g.a; i < g.e; i++) {
      const ziel = ausDB(d0 + ((d1 - d0) * (i - g.a)) / m), v = 1 + (ziel - 1) * fenster(i, g, b.kurve);
      for (const s of k) s[i] *= v;
    }
  },
  effekt(k, g, b, rate, plugins) {
    const def = plugins?.[b.effekt?.plugin];
    if (!def) return;
    const n = k[0].length, m = g.e - g.a, fahne = b.ausklang ? Math.min(n - g.e, Math.round(AUSKLANG_SEK * rate)) : 0, L = m + fahne;
    // Eingang: das Stück im Bereich, an den Rändern ausgeblendet; danach Stille, damit nur die Fahne des Effekts weiterklingt
    const w = new Float32Array(m);
    for (let i = 0; i < m; i++) w[i] = fenster(g.a + i, g, b.kurve);
    const ein = k.map((s) => { const x = new Float32Array(L + BLOCK); for (let i = 0; i < m; i++) x[i] = s[g.a + i] * w[i]; return x; });
    const inst = def.erzeuge(rate);
    inst.setze(bereinigeWerte(def, b.effekt.parameter));
    for (let o = 0; o < L; o += BLOCK) inst.prozess([ein[0].subarray(o), ein[1].subarray(o)], Math.min(BLOCK, L - o));
    // trocken aus-, nass einblenden; ohne Ausklang wird auch der Effekt am Ende ausgeblendet
    for (let c = 0; c < k.length; c++) {
      const s = k[c], y = ein[c];
      for (let i = 0; i < m; i++) s[g.a + i] = s[g.a + i] * (1 - w[i]) + y[i] * (b.ausklang ? 1 : w[i]);
      const ende = Math.min(fahne, Math.round(0.05 * rate));
      for (let i = 0; i < fahne; i++) { const r = i > fahne - ende ? (fahne - i) / ende : 1; s[g.e + i] += y[m + i] * r; }
    }
  },
};

/** Kurztext für Liste und Zeitleiste */
export function beschreibung(b) {
  const f = (x) => `${x > 0 ? "+" : x < 0 ? "−" : "±"}${Math.abs(x).toFixed(1).replace(".", ",")} dB`;
  if (b.art === "stumm") return "stumm";
  if (b.art === "pegel") return Number.isFinite(b.dbEnde) && b.dbEnde !== b.db ? `${f(b.db)} → ${f(b.dbEnde)}` : f(b.db);
  return b.effekt?.name ?? b.effekt?.plugin ?? "Effekt";
}
