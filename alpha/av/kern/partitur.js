// ORNAMENT AV STUDIO – audiovisuelle Partitur 0.2: Szenen statt eines festen Effekts je Film (Urteil 9. November 2026: «eher langweilige
// Effekte und nur der gleiche pro Film»). Eine Werkfamilie hat einen Vorrat an Szenen (je ein bis drei Ebenen aus den 23 Effekten von
// /animations, mit Zuordnungen Audiosignal → Regler) und legt fest, welche Szenen in welchem Abschnitt des Arrangements spielen. Lange
// Abschnitte wechseln je acht Takte die Szene. Zwischen zwei Szenen wird überblendet. Jede Szene kann ein anderes Material zeigen.
//
// Eine Zuordnung: { ebene, ziel: Reglerindex | "deck", quelle: "huelle.bass" | "impuls.kick" | "abschnitt.u" | "abschnitt.rueck" | …,
// von, bis, kurve }. Der Wert eines Reglers ist der Wert der Ebene (sonst der Standard des Effekts) plus die Zuordnungen, auf 0–1 begrenzt.
// Drei Beziehungen (av-studio.md §3): Synchronität (Impulse), Eigenbewegung (die Effekte laufen in ihrer Zeit), Gegenbewegung (von > bis).

import { wert, abschnittBei } from "./steuerung.js";
import { EFFEKTE } from "../../../animations/effekte.js?v=34";

export const PARTITUR_VERSION = "0.2.0";
const UEBERGANG = 0.8;   // s

const E = (effekt, werte = {}, mehr = {}) => ({ effekt, werte, modus: "normal", deckkraft: 1, ...mehr });
const Z = (ebene, ziel, quelle, von, bis, kurve = 1) => ({ ebene, ziel, quelle, von, bis, kurve });

/** Szenen: Name → { ebenen, zuordnungen }. werte: { Reglerindex: Wert } (fehlende = Standard des Effekts) */
export const SZENEN = Object.freeze({
  // ruhig, das Material lesbar
  klar: { ebenen: [E("bild", { 0: 0.2, 1: 0.15 }), E("strahlen", { 0: 0.4, 4: 1 }, { modus: "bildschirm", deckkraft: 0.6 })],
    zuordnungen: [Z(0, 0, "huelle.pad", 0, 0.6), Z(0, 1, "huelle.bass", 0, 0.4, 1.5), Z(1, 0, "huelle.pad", 0, 0.5), Z(1, 2, "huelle.natur", 0, 0.6)] },
  stroemung: { ebenen: [E("bild", { 0: 0.2 }), E("fluid", { 0: 0.15, 1: 0.5, 2: 0.3 }, { deckkraft: 0.55 })],
    zuordnungen: [Z(1, 0, "huelle.bass", 0, 0.6, 1.2), Z(1, 2, "huelle.natur", 0, 0.5), Z(1, "deck", "huelle.pad", 0, 0.3), Z(0, 3, "impuls.kick", 0, 0.35)] },
  geflecht: { ebenen: [E("bild", { 2: 0.3 }), E("geflecht", {}, { modus: "bildschirm", deckkraft: 0.85 })],
    zuordnungen: [Z(1, 1, "huelle.pad", 0, 0.5), Z(1, 4, "huelle.bass", 0, 0.5), Z(1, 3, "impuls.kick", 0, 0.4), Z(0, 0, "huelle.natur", 0, 0.4)] },
  glitzer: { ebenen: [E("glitzer")], zuordnungen: [Z(0, 2, "huelle.oben", 0, 0.7), Z(0, 1, "huelle.pad", 0, 0.5), Z(0, 3, "impuls.backbeat", 0, 0.5)] },
  voxel: { ebenen: [E("voxel")], zuordnungen: [Z(0, 3, "huelle.bass", 0, 0.7, 1.2), Z(0, 4, "huelle.pad", 0, 0.5), Z(0, 1, "impuls.kick", 0, 0.3)] },
  hoehen: { ebenen: [E("hoehenlinien")], zuordnungen: [Z(0, 1, "huelle.bass", 0, 0.6), Z(0, 3, "huelle.pad", 0, 0.5), Z(0, 0, "impuls.kick", 0, 0.3)] },
  wasser: { ebenen: [E("wasserglas")], zuordnungen: [Z(0, 0, "huelle.natur", 0, 0.6), Z(0, 2, "huelle.bass", 0, 0.5), Z(0, 3, "impuls.backbeat", 0, 0.5)] },
  aufloesen: { ebenen: [E("partikel", { 0: 0.2 })], zuordnungen: [Z(0, 0, "abschnitt.u", 0.15, 1), Z(0, 3, "huelle.bass", 0, 0.5), Z(0, 2, "huelle.oben", 0, 0.5)] },
  wiederkehr: { ebenen: [E("partikel", { 0: 0 })], zuordnungen: [Z(0, 0, "abschnitt.rueck", 0, 1, 2.5), Z(0, 2, "impuls.kick", 0, 0.5)] },
  strom: { ebenen: [E("bild", { 2: 0.6 }, { deckkraft: 0.6 }), E("strom", {}, { modus: "bildschirm" })], zuordnungen: [Z(1, 4, "huelle.oben", 0, 0.7), Z(1, 0, "huelle.bass", 0, 0.5), Z(1, 2, "huelle.pad", 0, 0.5)] },
  // Archiv: Raster, Montage, Sortieren, Zebra, Horizont, Lichtwürfel
  erinnerung: { ebenen: [E("bild", { 2: 0.7, 3: 0.2 }), E("echo", { 0: 0.5, 4: 0.4 }, { modus: "bildschirm", deckkraft: 0.7 })],
    zuordnungen: [Z(1, 0, "huelle.pad", 0, 0.5), Z(1, 4, "impuls.kick", 0, 0.5), Z(0, 0, "huelle.melodie", 0, 0.4)] },
  raster: { ebenen: [E("raster")], zuordnungen: [Z(0, 0, "impuls.kick", 0, 0.35), Z(0, 3, "huelle.pad", 0, 0.6), Z(0, 2, "huelle.bass", 0, 0.5)] },
  montage: { ebenen: [E("montage")], zuordnungen: [Z(0, 0, "impuls.backbeat", 0, 0.5), Z(0, 3, "huelle.oben", 0, 0.6), Z(0, 1, "huelle.bass", 0, 0.5)] },
  sortieren: { ebenen: [E("sortieren")], zuordnungen: [Z(0, 1, "huelle.bass", 0, 0.7), Z(0, 3, "huelle.pad", 0, 0.6), Z(0, 4, "impuls.kick", 0, 0.4)] },
  zebra: { ebenen: [E("zebra")], zuordnungen: [Z(0, 0, "huelle.bass", 0, 0.5), Z(0, 3, "huelle.summe", 0.6, 0), Z(0, 1, "impuls.kick", 0, 0.4)] },
  horizont: { ebenen: [E("horizont")], zuordnungen: [Z(0, 0, "abschnitt.u", 0.2, 0.8), Z(0, 3, "huelle.pad", 0, 0.6), Z(0, 2, "huelle.oben", 0, 0.5)] },
  blitze: { ebenen: [E("bild", { 2: 0.5 }, { deckkraft: 0.35 }), E("blitze", {}, { modus: "bildschirm" })], zuordnungen: [Z(1, 3, "impuls.kick", 0, 0.8), Z(1, 0, "huelle.oben", 0, 0.5), Z(1, 5, "huelle.bass", 0, 0.5)] },
});

/** Verhalten je Abschnitt: Licht des Ganzen, Lichtstoss beim Wiederfinden, Ausblenden im Outro */
const LICHT = { intro: 0.8, aufbau: 0.92, haupt: 1, gas: 1.05, stocken: 0.95, atmen: 0.85, verlieren: 0.85, wiederfinden: 1.1, outro: "ab" };

export const FAMILIEN = Object.freeze({
  organisch: {
    name: "Organische Materie", beschreibung: "Wasser, Strömung, Geflecht, Glitzer; im Verlieren löst sich das Bild in Teilchen auf und setzt sich beim Wiederfinden zusammen",
    folge: { intro: ["klar"], aufbau: ["stroemung", "wasser"], haupt: ["geflecht", "glitzer", "stroemung", "hoehen"], gas: ["voxel", "strom", "glitzer"],
      stocken: ["hoehen", "wasser"], atmen: ["klar", "geflecht"], verlieren: ["aufloesen"], wiederfinden: ["wiederkehr"], outro: ["klar", "stroemung"] },
  },
  archiv: {
    name: "Lebendes Archiv", beschreibung: "Erinnerung, Raster, Montage, Pixel Sorting, Op-Art, Horizont, Lichtwürfel; das Material als Spur und Bruch",
    folge: { intro: ["erinnerung"], aufbau: ["raster", "horizont"], haupt: ["raster", "sortieren", "zebra", "montage"], gas: ["zebra", "blitze", "montage"],
      stocken: ["montage", "blitze"], atmen: ["erinnerung", "horizont"], verlieren: ["sortieren", "aufloesen"], wiederfinden: ["wiederkehr", "horizont"], outro: ["erinnerung"] },
  },
  gemischt: {
    name: "Wechsel", beschreibung: "beide Familien im Wechsel: organisch in den ruhigen Teilen, Archiv in den dichten",
    folge: { intro: ["klar"], aufbau: ["raster", "stroemung"], haupt: ["geflecht", "sortieren", "zebra", "glitzer", "raster"], gas: ["voxel", "zebra", "blitze", "strom"],
      stocken: ["montage", "hoehen"], atmen: ["klar", "erinnerung", "wasser"], verlieren: ["aufloesen", "sortieren"], wiederfinden: ["wiederkehr"], outro: ["erinnerung", "klar"] },
  },
});

// FNV-1a mit Nachmischung (fmix32 aus MurmurHash3): FNV allein hat schwache untere Bits, «% 4» ergab dann immer dasselbe Material
const hash = (...t) => { let h = 2166136261; for (const c of t.join("|")) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return h >>> 0; };
const rampe = (u) => u * u * (3 - 2 * u);

/** welche Szene zur Zeit t spielt: { name, beginn, index (Abschnitt), phrase, material } */
export function szeneBei(t, familie, sig, { seed = 1, materialien = 1 } = {}) {
  const abs = sig.abschnitte, idx = Math.max(0, abs.findIndex((x) => t >= x.a && t < x.b)), a = abs[idx >= 0 ? idx : abs.length - 1];
  const takt = (a.b - a.a) / Math.max(1e-6, a.bis - a.von), phraseL = takt * 8, phrase = phraseL > 0 && a.bis - a.von > 8 ? Math.floor((t - a.a) / phraseL) : 0;
  const pool = familie.folge[a.typ] ?? familie.folge.haupt, h = hash(seed, idx);
  // das Material: reihum durch die Abschnitte (jedes kommt vor), versetzt um den Startwert
  return { name: pool[(h + phrase) % pool.length], beginn: a.a + phrase * phraseL, index: idx, phrase, material: (hash(seed) + idx + phrase) % Math.max(1, materialien), abschnitt: a };
}

function stapelVonSzene(name, t, sig, { u = 0, seed = 1, bild = "material", dauer = 60 }) {
  const s = SZENEN[name] ?? SZENEN.klar;
  const ebenen = s.ebenen.map((e, i) => {
    const def = EFFEKTE[e.effekt], werte = def.regler.map((r, k) => e.werte[k] ?? r.wert);
    return { effekt: e.effekt, werte, modus: e.modus, deckkraft: e.deckkraft, seed: seed + i * 7 };
  });
  for (const z of s.zuordnungen) {
    const e = ebenen[z.ebene]; if (!e) continue;
    const q = z.quelle === "abschnitt.u" ? u : z.quelle === "abschnitt.rueck" ? 1 - u : (() => { const [art, g] = z.quelle.split("."); return wert(sig[art]?.[g] ?? [], t, sig.fps); })();
    const d = z.von + (z.bis - z.von) * Math.max(0, Math.min(1, q)) ** z.kurve;
    if (z.ziel === "deck") e.deckkraft = Math.min(1, Math.max(0, e.deckkraft + d));
    else e.werte[z.ziel] = Math.min(1, Math.max(0, (z.von <= z.bis ? e.werte[z.ziel] : 0) + d));
  }
  return { bild, dauer, grund: "schwarz", durchlauf: true, ebenen };
}

/**
 * der Stapel zur Musikzeit t, dazu (in den ersten 0,8 s einer Szene) der Stapel der vorigen Szene mit seinem Gewicht für die Überblendung.
 * materialien: Anzahl geladener Materialien (Schlüssel «material0», «material1», …). Gibt { stapel, vorher, licht, dunkel, abschnitt, szene }.
 */
export function stapelBei(t, familie, sig, { seed = 1, dauer = 60, dunkel = 0, materialien = 1 } = {}) {
  const sz = szeneBei(t, familie, sig, { seed, materialien }), ab = abschnittBei(t, sig.abschnitte);
  const stapel = stapelVonSzene(sz.name, t, sig, { u: ab.u, seed, bild: `material${sz.material}`, dauer });
  let vorher = null;
  if (t - sz.beginn < UEBERGANG - 1e-6 && sz.beginn > 0) {
    const alt = szeneBei(sz.beginn - 1e-3, familie, sig, { seed, materialien }), abAlt = abschnittBei(sz.beginn - 1e-3, sig.abschnitte);
    if (alt.name !== sz.name || alt.material !== sz.material) vorher = { stapel: stapelVonSzene(alt.name, t, sig, { u: abAlt.u, seed, bild: `material${alt.material}`, dauer }), gewicht: 1 - rampe((t - sz.beginn) / UEBERGANG) };
  }
  const l = LICHT[ab.typ] ?? 1;
  let licht = l === "ab" ? 1 - rampe(ab.u) * 0.85 : l;
  if (ab.typ === "wiederfinden") licht += 0.6 * Math.exp(-(t - ab.a) / 0.35);
  return { stapel, vorher, licht, dunkel, abschnitt: ab, szene: sz.name };
}
