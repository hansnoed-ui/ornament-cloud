// Projektformat «ornament-composer-projekt» 0.1.0: eine lesbare JSON-Datei (<titel>.composer.json). Die Tondateien liegen daneben und
// werden über Name und SHA-256 wiedergefunden; sie werden nie neu gerechnet, wenn sich nur Mischung oder Schnitt ändern.
// Beschreibung: alpha/composer/README.md, Abschnitt «Projektdatei».

import { PLUGINS } from "../plugins/register.js";
import { standardWerte, bereinigeWerte } from "./plugin.js";
import { typAusName, variantenFuer } from "./varianten.js";
import { ERZEUGER } from "../erzeuger/register.js";

export const FORMAT = "ornament-composer-projekt", FORMAT_VERSION = "0.1.0", COMPOSER_VERSION = "0.1.0";
export const KANALZUG = "kanalzug@0.1.0", GRENZE = "grenze@0.1.0", RAUM = "raum@0.1.0", BASSFETT = "bassfett@0.1.0";

const jetzt = () => new Date().toISOString();
const neueId = (vor) => `${vor}-${Math.random().toString(36).slice(2, 8)}`;

export function neuesProjekt({ titel = "Ohne Titel", rate = 48000 } = {}) {
  return {
    format: FORMAT, formatVersion: FORMAT_VERSION, composerVersion: COMPOSER_VERSION,
    titel, erstellt: jetzt(), geaendert: jetzt(), rate,
    tempo: { bpm: 120, quelle: "standard", taktart: [4, 4], beginn: 0 },   // beginn: Sekunde der ersten Eins
    spuren: [],
    master: { pegel: 0, kette: [{ plugin: KANALZUG, parameter: standardWerte(PLUGINS[KANALZUG]), variante: 0 }, { plugin: GRENZE, parameter: standardWerte(PLUGINS[GRENZE]) }] },
    referenzen: [],   // [{ id, name, datei, rolle: "klang", gewicht }]
    schleife: null,   // { a, b } in Takten (ab 0)
    ausgabe: { ziel: "reels", lufs: -14, decke: -1, bits: "24" },
    urteile: [],      // [{ zeit, spur, plugin, text }]
  };
}

/** eine Spur aus einer Datei: { name, sha256, bytes, rate, kanaele, dauer } */
export function spurDazu(p, datei, { typ = typAusName(datei.name) } = {}) {
  const sp = {
    id: neueId("s"), name: datei.name.replace(/\.[a-z0-9]+$/i, ""), typ, datei,
    pegel: 0, pan: 0, stumm: false, solo: false, vorher: false,
    kette: [{ plugin: KANALZUG, parameter: standardWerte(PLUGINS[KANALZUG]), variante: 0 }],
  };
  p.spuren.push(sp); p.geaendert = jetzt();
  return sp;
}

/**
 * eine erzeugte Spur: Die Tondaten stehen nicht im Projekt, nur ihr Rezept (quelle). Beim Öffnen wird sie neu gerechnet, Abtastwert für
 * Abtastwert gleich. quelle: { art: "erzeugt", erzeuger, stimme, variante, werte, takte, fill, anzahl, bpm, swing, menschlich, versatz, seed, stil }
 */
export function erzeugteSpurDazu(p, quelle, { name, typ, pegel = 0, pan = 0, raum = null, bassfett = null } = {}) {
  const kette = [{ plugin: KANALZUG, parameter: standardWerte(PLUGINS[KANALZUG]), variante: 0 }];
  if (bassfett) kette.push({ plugin: BASSFETT, parameter: { ...standardWerte(PLUGINS[BASSFETT]), ...bassfett } });
  if (raum) kette.push({ plugin: RAUM, parameter: { ...standardWerte(PLUGINS[RAUM]), ...raum } });
  const sp = { id: neueId("s"), name, typ, quelle, datei: null, pegel, pan, stumm: false, solo: false, vorher: false, kette };
  p.spuren.push(sp); p.geaendert = jetzt();
  return sp;
}

/** eine Variante (Index in variantenFuer(typ)) auf das erste Glied einer Kette legen */
export function varianteSetzen(glied, typ, index) {
  const v = variantenFuer(typ)[index];
  if (!v) return;
  glied.parameter = bereinigeWerte(PLUGINS[glied.plugin], { ...standardWerte(PLUGINS[glied.plugin]), ...v.werte });
  glied.variante = index;
}

/** das, was der Motor braucht */
export function motorZustand(p, extra = {}) {
  return {
    spuren: p.spuren.map((s) => ({ id: s.id, pegel: s.pegel, pan: s.pan, stumm: s.stumm, solo: s.solo, vorher: s.vorher, kette: s.kette })),
    master: { pegel: p.master.pegel, kette: p.master.kette }, ...extra,
  };
}

export function pruefe(p) {
  const f = [];
  if (p.format !== FORMAT) f.push("Format");
  if (String(p.formatVersion).split(".")[0] !== FORMAT_VERSION.split(".")[0]) f.push(`Formatversion ${p.formatVersion}`);
  for (const k of [...(p.spuren ?? []).flatMap((s) => s.kette), ...(p.master?.kette ?? [])]) if (!PLUGINS[k?.plugin]) f.push(`Plugin ${k?.plugin} fehlt in dieser Version des Composers`);
  for (const s of p.spuren ?? []) if (s.quelle?.art === "erzeugt" && !ERZEUGER[s.quelle.erzeuger]) f.push(`Klangerzeuger ${s.quelle.erzeuger} fehlt in dieser Version des Composers`);
  return f;
}

export function lesen(text) {
  const p = JSON.parse(text);
  const f = pruefe(p);
  if (f.length) throw new Error(`Projekt nicht lesbar: ${f.join(", ")}`);
  return p;
}
export const schreiben = (p) => JSON.stringify({ ...p, geaendert: jetzt() }, null, 2);

/** Takte ↔ Sekunden */
export const taktDauer = (p) => (60 / p.tempo.bpm) * p.tempo.taktart[0] * (4 / p.tempo.taktart[1]);
export const taktZuSek = (p, t) => p.tempo.beginn + t * taktDauer(p);
export const sekZuTakt = (p, s) => (s - p.tempo.beginn) / taktDauer(p);
