// ORNAMENT LAB – Zusammenstellung durch jev (seit Lab 0.1.12): aus vielen Bild- und Klangeffekten eine Animation von 30 Sekunden.
// jev beantwortet in einem Aufruf zehn feste CHOICE-Fragen (jev/fragen.js, KOMPOSITION_FRAGEN): Aufbau, Übergang, zwei Klangeffekte
// nacheinander und je einen Bildeffekt für sechs Abschnitte. Aus den Wahrscheinlichkeiten wird mit Startwert gezogen (wie bei der
// Tabelle der Fictory): so wiederholt sich ein Bildeffekt nicht im nächsten Abschnitt, und derselbe Startwert ergibt dieselbe Wahl.
// Ohne jev zieht das Lab gleichverteilt (Entscheidungsart «zufall»). Der Mensch sieht die Zusammenstellung, zieht neu oder ändert einzelne
// Stellen, bevor gerechnet wird. Gerechnet wird mit gewöhnlichen Operationen des Registers; der Film ist ein Film über Stationen.
// Ohne DOM, geprüft in tests/lab.test.mjs.
import { KOMPOSITION_FRAGEN, BILD_EFFEKTE, KLANG_EFFEKTE } from "../jev/fragen.js";
import { ergebnis, entscheide, GRENZEN } from "./projekt.js";
import { fuehreAus } from "./ausfuehrung.js";
import { taktSchwelle, DAUER } from "./vorschlag.js";
import { zufall } from "../../../alpha/the-fictory/analyse.js?v=23";

export const ZUSAMMENSTELLUNG_VERSION = "0.1.0";
export const VARIANTEN_JE_ABSCHNITT = 3;

/** Bildeffekt → Operation: Parameter, und welcher Parameter der Lautstärke folgt (ohne Angabe: was die Operation selbst vorschlägt) */
export const BILD_REZEPTE = Object.freeze({
  "bild.feedback": { operation: "lab.feedback", parameter: { seite: 720 }, ziel: "zoom", tiefe: 0.35 },
  "bild.wiederholung": { operation: "lab.wiederholung", parameter: { seite: 1200 }, ziel: "groesse", tiefe: 0.5 },
  "bild.farbe": { operation: "lab.farbe", parameter: { saettigung: 1.3 }, ziel: "farbdrehung", tiefe: 1 },
  "bild.komposition": { operation: "lab.komposition", parameter: { seite: 900 }, ziel: "symmetrie", tiefe: 0.9 },
  "bild.glitch": { operation: "lab.glitch", parameter: { seite: 1000 }, tiefe: 0.6 },
  "bild.pixelsortierung": { operation: "lab.pixelsortierung", parameter: { seite: 1000 }, tiefe: 0.5 },
  "bild.verzerrung": { operation: "lab.verzerrung", parameter: { seite: 1000 }, tiefe: 0.6 },
  "bild.licht": { operation: "lab.licht", parameter: { seite: 1000 }, tiefe: 0.5 },
  "bild.raster": { operation: "lab.raster", parameter: { seite: 1000 }, tiefe: 0.5 },
  "bild.neusetzen": { operation: "lab.neusetzen", parameter: { seite: 1000 }, tiefe: 0.6 },
  "bild.fictory": { operation: "fictory.prozess", parameter: {}, ziel: null },
});
/** Klangeffekt → Operation (null: der Klang bleibt) */
export const KLANG_REZEPTE = Object.freeze({
  "klang.keine": null,
  "klang.schneller": { operation: "lab.tempo", parameter: { tempo: 1.25 } },
  "klang.langsamer": { operation: "lab.tempo", parameter: { tempo: 0.8 } },
  "klang.tiefer": { operation: "lab.tempo", parameter: { halbtoene: -5 } },
  "klang.zerlegt": { operation: "lab.zerlegen", parameter: {} },
  "klang.rhythmus": { operation: "lab.rhythmus", parameter: { takte: 16 } },
  "klang.koerner": { operation: "lab.koerner", parameter: { dauer: DAUER } },
});
/** Übergang → Film: Art, Dauer des Übergangs (s) und höchstens so viele Wechsel je Sekunde auf den Anschlägen */
//   Überblendung und Schwelle dauern bis zum nächsten Anschlag (höchstens so lange), so verwandelt sich das Bild fortlaufend
const FILM = { "film.schnitt": { art: "schnitt", uebergang: 0, jeSekunde: 2.5 }, "film.blende": { art: "blende", uebergang: 1.2, jeSekunde: 1.5 }, "film.schwelle": { art: "schwelle", uebergang: 1.5, jeSekunde: 1 } };
/** die Kamera über jedem Bild des Films (kern/stationen.js): ihr Zoom atmet mit der Lautstärke des neuen Klangs */
export const BEWEGUNG = 1;

/** ein gewichteter Zug; ausser: Optionen, die nicht gezogen werden sollen (solange andere Gewicht haben) */
function ziehe(w, rnd, ausser = []) {
  let e = Object.entries(w).filter(([k, p]) => p > 0 && !ausser.includes(k));
  if (!e.length) e = Object.keys(w).filter((k) => !ausser.includes(k)).map((k) => [k, 1]);
  if (!e.length) e = Object.keys(w).map((k) => [k, 1]);
  const summe = e.reduce((s, [, p]) => s + p, 0);
  let r = rnd() * summe;
  for (const [k, p] of e) { r -= p; if (r <= 0) return k; }
  return e.at(-1)[0];
}

/** gleichverteilte Wahrscheinlichkeiten für alle Fragen (ohne jev) */
export const gleichverteilt = () => Object.fromEntries(Object.entries(KOMPOSITION_FRAGEN).map(([k, f]) => [k, Object.fromEntries(Object.keys(f.katalog).map((o) => [o, 1]))]));

/**
 * Aus den Wahrscheinlichkeiten je Frage eine Zusammenstellung ziehen. Bildeffekte wiederholen sich nicht im nächsten Abschnitt,
 * der zweite Klangeffekt ist nicht derselbe wie der erste (ausser «keine»). Gibt { aufbau, uebergang, klang: [2], bild: [6], seed } zurück.
 */
export function zusammenstellen(antworten, seed = 1) {
  const rnd = zufall(seed >>> 0), bild = [];
  const aufbau = ziehe(antworten.aufbau, rnd), uebergang = ziehe(antworten.uebergang, rnd);
  const k1 = ziehe(antworten.klang1, rnd), k2 = ziehe(antworten.klang2, rnd, k1 === "klang.keine" ? [] : [k1]);
  for (const k of Object.keys(KOMPOSITION_FRAGEN).filter((x) => x.startsWith("bild"))) bild.push(ziehe(antworten[k], rnd, bild.slice(-1)));
  return { aufbau, uebergang, klang: [k1, k2], bild, seed: seed >>> 0 };
}

/** die Wahrscheinlichkeit, mit der jev eine Stelle der Zusammenstellung gewählt hat (fürs Protokoll und die Anzeige) */
export function wahrscheinlichkeit(antworten, frage, wahl) {
  const w = antworten?.[frage]; if (!w) return null;
  const s = Object.values(w).reduce((a, b) => a + b, 0);
  return s > 0 ? Math.round(((w[wahl] ?? 0) / s) * 1000) / 1000 : null;
}

/**
 * Eine Zusammenstellung rechnen. messung: von messen() (kern/vorschlag.js); plan: von zusammenstellen(), vom Menschen ggf. geändert;
 * wahl: { art: "jev"|"zufall"|"mensch", details }. Zuerst die Klangeffekte nacheinander, dann misst ein Tonsignal den neuen Klang
 * (Takt und Steuersignal), dann sechs Abschnitte zu je drei Varianten. Gibt { entscheidung, ergebnisse, klang, plan } zurück; plan wie bei
 * vorschlagAusfuehren(): { stationen, art, halten, uebergang, takt, bewegung, tonspur, tonBeginn, dauer }.
 */
export async function zusammenstellungRechnen({ register, projekt, medien, messung, plan, wahl, seed = 1, melden = () => {}, abbrechen = null }) {
  for (const k of plan.klang) if (!(k in KLANG_REZEPTE)) throw new Error(`Klangeffekt ${k} gibt es nicht`);
  for (const b of plan.bild) if (!BILD_REZEPTE[b]) throw new Error(`Bildeffekt ${b} gibt es nicht`);
  if (!FILM[plan.uebergang]) throw new Error(`Übergang ${plan.uebergang} gibt es nicht`);
  const d = entscheide(projekt, { art: wahl.art, gegenstand: "zusammenstellung", optionen: [], gewaehlt: { aufbau: plan.aufbau, uebergang: plan.uebergang, klang: plan.klang, bild: plan.bild },
    details: { ...(wahl.details ?? {}), ...(messung.videoBilder?.length > 1 ? { video: messung.videoBilder } : {}), startwert: plan.seed, merkmale: messung.merkmale, werte: messung.werte, version: ZUSAMMENSTELLUNG_VERSION } });
  const schritt = (anlass) => ({ art: wahl.art, details: { anlass, entscheidung: d.id } });

  // 1 · Klang: die Effekte nacheinander, jeder auf dem Ergebnis des vorigen
  let ton = messung.ton;
  for (const [i, k] of plan.klang.entries()) {
    const r = KLANG_REZEPTE[k];
    if (!r) continue;
    melden(`Klang ${i + 1}: ${KLANG_EFFEKTE[k].split(":")[0]} …`, null);
    const x = await fuehreAus({ register, projekt, medien, melden, abbrechen,
      auftrag: { operation: r.operation, eingaben: { ton }, parameter: r.parameter, seed: (seed + 7 * i) >>> 0, wahl: schritt(`Zusammenstellung, Klang ${i + 1}`) } });
    ton = x.ergebnisse.find((e) => e.typ === "AUDIO").id;
  }
  // 2 · der neue Klang wird gemessen: Hüllkurve für die Modulation, Anschläge für den Takt; bearbeitet beginnt er am Anfang
  const beginn = ton === messung.ton ? messung.beginn : 0;
  const t = await fuehreAus({ register, projekt, medien, melden, abbrechen,
    auftrag: { operation: "lab.tonsignal", eingaben: { ton }, parameter: { merkmal: "laut", beginn, laenge: DAUER, proben: 120, normieren: false }, wahl: schritt("Zusammenstellung, Klang messen") } });
  const [signal, einsaetze] = t.ergebnisse;

  // 3 · Bild: sechs Abschnitte, in der Kette auf dem vorigen, im Fächer jeweils auf dem Ausgangsbild;
  //     aus einem Video (messung.videoBilder) nimmt jeder Abschnitt das Standbild seiner Zeit, so folgt der Film dem Video
  const video = messung.videoBilder?.length > 1 ? messung.videoBilder : null;
  let eingang = video?.[0] ?? messung.bild;
  const ergebnisse = [];
  for (const [i, b] of plan.bild.entries()) {
    const r = BILD_REZEPTE[b], op = register.hole(r.operation);
    const ziel = r.ziel === null ? null : r.ziel ?? op.moduliert ?? op.parameter.find((p) => p.art === "zahl" && p.id !== "seite")?.id;
    const routen = ziel && op.varianten === "moduliert" ? [{ ziel, tiefe: r.tiefe ?? 0.5, modulator: { quelle: "signal", ergebnis: signal.id } }] : [];
    melden(`Abschnitt ${i + 1} von ${plan.bild.length}: ${BILD_EFFEKTE[b].split(":")[0]} …`, null);
    const x = await fuehreAus({ register, projekt, medien, melden, abbrechen,
      auftrag: { operation: r.operation, eingaben: { bild: video ? video[Math.min(video.length - 1, Math.floor((i * video.length) / plan.bild.length))] : plan.aufbau === "aufbau.faecher" ? messung.bild : eingang }, parameter: r.parameter, seed: (seed + 101 * (i + 1)) >>> 0,
        variation: { anzahl: VARIANTEN_JE_ABSCHNITT, achse: "varianten", routen }, wahl: schritt(`Zusammenstellung, Abschnitt ${i + 1} von ${plan.bild.length}`) } });
    const bilder = x.ergebnisse.filter((e) => e.typ === "IMAGE");
    // The Fictory gibt sechs Zustände aus: davon jeder zweite, damit jeder Abschnitt etwa gleich viel Zeit bekommt
    const genommen = bilder.length > VARIANTEN_JE_ABSCHNITT ? bilder.filter((_, j) => j % Math.ceil(bilder.length / VARIANTEN_JE_ABSCHNITT) === Math.ceil(bilder.length / VARIANTEN_JE_ABSCHNITT) - 1) : bilder;
    ergebnisse.push(...genommen);
    eingang = genommen.at(-1).id;
  }

  // 4 · Film: Bild, dann alle Abschnitte; im Takt der Anschläge reihum, sonst gleichmässig über die Dauer
  const stationen = [video?.[0] ?? messung.bild, ...ergebnisse.map((e) => e.id)].slice(0, GRENZEN.stationen);
  const f = FILM[plan.uebergang], folge = ergebnis(projekt, einsaetze.id).daten;
  const dauer = Math.min(DAUER, folge?.dauer ?? DAUER), n = stationen.length;
  // nicht reihum: jede Station kommt einmal, darum höchstens so viele Wechsel wie Stationen, verteilt auf die stärksten Anschläge
  const schwelle = taktSchwelle(folge, Math.min(f.jeSekunde, (n - 1) / dauer));
  const takt = schwelle === null ? null : { ereignisfolge: einsaetze.id, schwelle: Math.round(schwelle * 1000) / 1000, wiederholen: true };
  const uebergang = takt ? f.uebergang : Math.min(f.uebergang, (0.5 * dauer) / Math.max(1, n - 1));
  const halten = takt ? 1 : Math.max(0, Math.min(10, Math.round(((dauer - (n - 1) * uebergang) / n) * 10) / 10));
  return { entscheidung: d, ergebnisse, klang: ton, signal: signal.id,
    plan: { stationen, art: f.art, halten, uebergang: Math.round(uebergang * 100) / 100, takt, bewegung: { staerke: BEWEGUNG, signal: signal.id }, tonspur: ton, tonBeginn: beginn, dauer } };
}
