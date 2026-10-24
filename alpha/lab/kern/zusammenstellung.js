// ORNAMENT LAB – Zusammenstellung durch jev (seit Lab 0.1.12): aus vielen Bild- und Klangeffekten eine Animation von 30 Sekunden.
// jev beantwortet in einem Aufruf zehn feste CHOICE-Fragen (jev/fragen.js, KOMPOSITION_FRAGEN): Aufbau, Übergang, zwei Klangeffekte
// nacheinander und je einen Bildeffekt für sechs Abschnitte. Aus den Wahrscheinlichkeiten wird mit Startwert gezogen (wie bei der
// Tabelle der Fictory): so wiederholt sich ein Bildeffekt nicht im nächsten Abschnitt, und derselbe Startwert ergibt dieselbe Wahl.
// Ohne jev zieht das Lab gleichverteilt (Entscheidungsart «zufall»). Der Mensch sieht die Zusammenstellung, zieht neu oder ändert einzelne
// Stellen, bevor gerechnet wird. Gerechnet wird mit gewöhnlichen Operationen des Registers; der Film ist ein Film über Stationen.
// Die Bestände (seit Lab 0.1.18, beide wahlweise, jev sieht sie nicht): ein Zettel aus dem Zettelkasten eröffnet den Film als Karte mit
// seinem Leitsatz; eine ORNA-Konstellation schliesst ihn als Karte mit ihrer Operationsregel. Bis 0.1.19 gab sie die Regel dem Zerfall
// (The Fictory) als siebtem Abschnitt; seit 0.1.20 bleiben vorerst nur lebendige Effekte in der Zusammenstellung, damit der Film fliesst
// (Christian, 24. Oktober 2026). Die Karten zeichnet lab.karte, nur im Browser.
// Ohne DOM, geprüft in tests/lab.test.mjs.
import { KOMPOSITION_FRAGEN, BILD_EFFEKTE, KLANG_EFFEKTE } from "../jev/fragen.js";
import { ergebnis, entscheide, GRENZEN } from "./projekt.js";
import { fuehreAus } from "./ausfuehrung.js";
import { taktSchwelle, DAUER } from "./vorschlag.js";
import { zufall } from "../../../alpha/the-fictory/analyse.js?v=23";

export const ZUSAMMENSTELLUNG_VERSION = "0.3.0";
/** Dauer einer Karte (Zettel, ORNA) am Anfang oder Ende des Films, in Sekunden */
export const KARTE_DAUER = 2.5;
export const VARIANTEN_JE_ABSCHNITT = 10;   // seit Lab 0.1.16: 60 Motive in 30 s (vorher 3, also 18)

/** Bildeffekt → Operation: Parameter, und welcher Parameter der Lautstärke folgt (ohne Angabe: was die Operation selbst vorschlägt) */
export const BILD_REZEPTE = Object.freeze({
  "bild.feedback": { operation: "lab.feedback", parameter: { seite: 720 }, ziel: "zoom", tiefe: 0.35 },
  "bild.wiederholung": { operation: "lab.wiederholung", parameter: { seite: 1200 }, ziel: "groesse", tiefe: 0.5 },
  "bild.farbe": { operation: "lab.farbe", parameter: { saettigung: 1.3 }, ziel: "farbdrehung", tiefe: 1 },
  "bild.glitch": { operation: "lab.glitch", parameter: { seite: 1000, bilder: 18 }, tiefe: 0.6 },
  "bild.verzerrung": { operation: "lab.verzerrung", parameter: { seite: 1000, bilder: 18 }, tiefe: 0.6 },
  "bild.licht": { operation: "lab.licht", parameter: { seite: 1000, bilder: 18 }, tiefe: 0.5 },
  "bild.raster": { operation: "lab.raster", parameter: { seite: 1000, bilder: 18 }, tiefe: 0.5 },
});   // seit 0.1.20 vorerst nur lebendige Effekte (jev/fragen.js, BILD_EFFEKTE)
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
const FILM = { "film.schnitt": { art: "schnitt", uebergang: 0, jeSekunde: 2.5 }, "film.blende": { art: "blende", uebergang: 1.2, jeSekunde: 2 }, "film.schwelle": { art: "schwelle", uebergang: 1.5, jeSekunde: 2 } };
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
  return { aufbau, uebergang, klang: [k1, k2], bild, seed: seed >>> 0, zettel: null, orna: null, lebendig: true, bewegung: BEWEGUNG };
}

/** die Wahrscheinlichkeit, mit der jev eine Stelle der Zusammenstellung gewählt hat (fürs Protokoll und die Anzeige) */
export function wahrscheinlichkeit(antworten, frage, wahl) {
  const w = antworten?.[frage]; if (!w) return null;
  const s = Object.values(w).reduce((a, b) => a + b, 0);
  return s > 0 ? Math.round(((w[wahl] ?? 0) / s) * 1000) / 1000 : null;
}

/**
 * Eine Zusammenstellung rechnen. messung: von messen() (kern/vorschlag.js); plan: von zusammenstellen(), vom Menschen ggf. geändert;
 * wahl: { art: "jev"|"zufall"|"mensch", details }. plan.zettel: null | { strophe: "" | Nummer }, plan.orna: null | { konstellation: "" | Kennung };
 * plan.lebendig (Schalter, Standard an) und plan.bewegung (Stärke der Kamera 0–1, Standard BEWEGUNG) sind die Filmeinstellungen des Menschen (seit 0.1.19).
 * Zuerst die Klangeffekte nacheinander, dann misst ein Tonsignal den neuen Klang
 * (Takt und Steuersignal), dann sechs Abschnitte zu je zehn Varianten. Gibt { entscheidung, ergebnisse, klang, plan } zurück; plan wie bei
 * vorschlagAusfuehren(): { stationen, art, halten, uebergang, takt, bewegung, tonspur, tonBeginn, dauer }.
 */
export async function zusammenstellungRechnen({ register, projekt, medien, messung, plan, wahl, seed = 1, melden = () => {}, abbrechen = null }) {
  for (const k of plan.klang) if (!(k in KLANG_REZEPTE)) throw new Error(`Klangeffekt ${k} gibt es nicht`);
  for (const b of plan.bild) if (!BILD_REZEPTE[b]) throw new Error(`Bildeffekt ${b} gibt es nicht`);
  if (!FILM[plan.uebergang]) throw new Error(`Übergang ${plan.uebergang} gibt es nicht`);
  if (plan.zettel && !register.hat("zettel.strophe")) throw new Error("Der Zettelkasten ist nicht im Register");
  if (plan.orna && !register.hat("orna.konstellation")) throw new Error("ORNA ist nicht im Register");
  const lebendig = plan.lebendig !== false, staerke = Math.min(1, Math.max(0, Number(plan.bewegung ?? BEWEGUNG) || 0));
  const d = entscheide(projekt, { art: wahl.art, gegenstand: "zusammenstellung", optionen: [], gewaehlt: { aufbau: plan.aufbau, uebergang: plan.uebergang, klang: plan.klang, bild: plan.bild,
      zettel: plan.zettel ? (plan.zettel.strophe || "ziehen") : null, orna: plan.orna ? (plan.orna.konstellation || "ziehen") : null },
    details: { ...(wahl.details ?? {}), ...(messung.videoBilder?.length > 1 ? { video: messung.videoBilder } : {}), startwert: plan.seed, merkmale: messung.merkmale, werte: messung.werte, film: { lebendig, bewegung: staerke }, version: ZUSAMMENSTELLUNG_VERSION } });
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

  // 2b · die Bestände, beide wahlweise: ein Zettel aus dem Zettelkasten, eine ORNA-Konstellation (gezogen oder gewählt, nie von jev)
  const bestand = (gewaehlt, anlass) => ({ art: gewaehlt ? "mensch" : "zufall", details: { anlass, entscheidung: d.id } });
  let zettel = null, konstellation = null;
  if (plan.zettel) {
    melden("Ein Zettel aus dem Zettelkasten …", null);
    const z = await fuehreAus({ register, projekt, medien, melden, abbrechen,
      auftrag: { operation: "zettel.strophe", eingaben: {}, parameter: { strophe: plan.zettel.strophe ? String(plan.zettel.strophe) : "" }, seed: (seed + 977) >>> 0, wahl: bestand(plan.zettel.strophe, "Zusammenstellung, Zettel") } });
    zettel = z.ergebnisse.find((e) => e.typ === "METADATA");
  }
  if (plan.orna) {
    melden("Eine Konstellation aus ORNA …", null);
    const o = await fuehreAus({ register, projekt, medien, melden, abbrechen,
      auftrag: { operation: "orna.konstellation", eingaben: {}, parameter: { konstellation: plan.orna.konstellation || "" }, seed: (seed + 1409) >>> 0, wahl: bestand(plan.orna.konstellation, "Zusammenstellung, ORNA") } });
    konstellation = o.ergebnisse.find((e) => e.typ === "CONSTELLATION");
  }
  // seit 0.1.20 vorerst ohne den Zerfall als siebten Abschnitt (Standbilder): die Konstellation nennt ihre Regel auf der Schlusskarte
  const abschnitte = plan.bild;

  // 3 · Bild: sechs Abschnitte, in der Kette auf dem vorigen, im Fächer jeweils auf dem Ausgangsbild;
  //     aus einem Video (messung.videoBilder) nimmt jeder Abschnitt das Standbild seiner Zeit, so folgt der Film dem Video
  const video = messung.videoBilder?.length > 1 ? messung.videoBilder : null;
  let eingang = video?.[0] ?? messung.bild;
  const ergebnisse = [], uebergaenge = new Set();
  for (const [i, b] of abschnitte.entries()) {
    const r = BILD_REZEPTE[b], op = register.hole(r.operation);
    const ziel = r.ziel === null ? null : r.ziel ?? op.moduliert ?? op.parameter.find((p) => p.art === "zahl" && p.id !== "seite")?.id;
    const routen = ziel && op.varianten === "moduliert" ? [{ ziel, tiefe: r.tiefe ?? 0.5, modulator: { quelle: "signal", ergebnis: signal.id } }] : [];
    melden(`Abschnitt ${i + 1} von ${abschnitte.length}: ${BILD_EFFEKTE[b].split(":")[0]} …`, null);
    const x = await fuehreAus({ register, projekt, medien, melden, abbrechen,
      auftrag: { operation: r.operation, eingaben: { bild: video ? video[Math.min(video.length - 1, Math.floor((i * video.length) / abschnitte.length))] : plan.aufbau === "aufbau.faecher" ? messung.bild : eingang },
        parameter: r.parameter, seed: (seed + 101 * (i + 1)) >>> 0,
        variation: { anzahl: VARIANTEN_JE_ABSCHNITT, achse: "varianten", routen }, wahl: schritt(`Zusammenstellung, Abschnitt ${i + 1} von ${abschnitte.length}`) } });
    const bilder = x.ergebnisse.filter((e) => e.typ === "IMAGE");
    // The Fictory gibt sechs Zustände aus: davon jeder zweite, damit jeder Abschnitt etwa gleich viel Zeit bekommt
    const genommen = bilder.length > VARIANTEN_JE_ABSCHNITT ? bilder.filter((_, j) => j % Math.ceil(bilder.length / VARIANTEN_JE_ABSCHNITT) === Math.ceil(bilder.length / VARIANTEN_JE_ABSCHNITT) - 1) : bilder;
    // in der Kette entsteht der Abschnitt aus dem letzten Bild des vorigen: dieser Wechsel ist der Verlauf der Operation selbst
    if (!video && plan.aufbau !== "aufbau.faecher" && i > 0) uebergaenge.add(eingang);
    ergebnisse.push(...genommen);
    eingang = genommen.at(-1).id;
  }

  // 3b · die Karten: der Zettel eröffnet den Film, die Konstellation schliesst ihn (nur wo lab.karte zeichnen kann: im Browser)
  const karteOp = register.hat("lab.karte") ? register.hole("lab.karte") : null, kartenMoeglich = Boolean(karteOp && (karteOp.verfuegbar?.() ?? true));
  const karte = async (eingaben, anlass) => {
    if (!kartenMoeglich) return null;
    const k = await fuehreAus({ register, projekt, medien, melden, abbrechen,
      auftrag: { operation: "lab.karte", eingaben: { bild: video?.[0] ?? messung.bild, ...eingaben }, parameter: {}, seed, wahl: schritt(anlass) } });
    return k.ergebnisse.find((e) => e.typ === "IMAGE")?.id ?? null;
  };
  const zettelKarte = zettel ? await karte({ text: zettel.id }, "Zusammenstellung, Zettelkarte") : null;
  const ornaKarte = konstellation ? await karte({ konstellation: konstellation.id }, "Zusammenstellung, ORNA-Karte") : null;
  const karten = [zettelKarte, ornaKarte].filter(Boolean).length;

  // 4 · Film: Zettel, Bild, alle Abschnitte, Konstellation; im Takt der Anschläge reihum, sonst gleichmässig über die Dauer
  let stationen = [
    ...(zettelKarte ? [{ ergebnis: zettelKarte, einmal: true, halten: KARTE_DAUER }] : []),
    ...[video?.[0] ?? messung.bild, ...ergebnisse.map((e) => e.id)].slice(0, GRENZEN.stationen - karten),
    ...(ornaKarte ? [{ ergebnis: ornaKarte, einmal: true, halten: KARTE_DAUER }] : []),
  ];
  const f = FILM[plan.uebergang], folge = ergebnis(projekt, einsaetze.id).daten;
  const dauer = Math.min(DAUER, folge?.dauer ?? DAUER), n = stationen.length;
  // nicht reihum: jede Station kommt einmal, darum höchstens so viele Wechsel wie Stationen, verteilt auf die stärksten Anschläge
  // reichen die Anschläge nicht für alle Stationen, läuft der Film gleichmässig, damit jedes Motiv vorkommt
  let schwelle = taktSchwelle(folge, Math.min(f.jeSekunde, (n - 1) / dauer));
  if (schwelle !== null && (folge?.ereignisse ?? []).filter((x) => x.t > 0 && (x.staerke ?? 1) >= schwelle).length < n - 1) schwelle = null;
  const takt = schwelle === null ? null : { ereignisfolge: einsaetze.id, schwelle: Math.round(schwelle * 1000) / 1000, wiederholen: true };
  const uebergang = takt ? f.uebergang : Math.min(f.uebergang, (0.5 * dauer) / Math.max(1, n - 1));
  // im Takt hat jeder Wechsel eine feste Länge, auch der Verlauf zwischen zwei Abschnitten (ohne Takt bliebe seine Länge offen)
  if (takt) stationen = stationen.map((s) => (typeof s === "string" && uebergaenge.has(s) ? { ergebnis: s, uebergang: "verlauf" } : s));
  // ohne Takt füllt das Halten die Dauer; die Karten haben ihre eigene
  const halten = takt ? 1 : Math.max(0, Math.min(10, Math.round(((dauer - karten * KARTE_DAUER - (n - 1) * uebergang) / Math.max(1, n - karten)) * 100) / 100));
  return { entscheidung: d, ergebnisse, klang: ton, signal: signal.id, zettel: zettel?.daten ?? null, konstellation: konstellation?.daten ?? null, karten: { zettel: zettelKarte, orna: ornaKarte },
    plan: { stationen, art: f.art, halten, uebergang: Math.round(uebergang * 100) / 100, takt, bewegung: staerke ? { staerke, signal: signal.id } : null, lebendig, tonspur: ton, tonBeginn: beginn, dauer } };
}
