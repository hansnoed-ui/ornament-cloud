// ORNAMENT LAB – Zusammenstellung durch jev (seit Lab 0.1.12): aus vielen Bild- und Klangeffekten eine Animation von 30 Sekunden.
// jev beantwortet in einem Aufruf zehn feste CHOICE-Fragen (jev/fragen.js, KOMPOSITION_FRAGEN): Aufbau, Übergang, zwei Klangeffekte
// nacheinander und je einen Bildeffekt für sechs Abschnitte. Aus den Wahrscheinlichkeiten wird mit Startwert gezogen (wie bei der
// Tabelle der Fictory): so wiederholt sich ein Bildeffekt nicht im nächsten Abschnitt, und derselbe Startwert ergibt dieselbe Wahl.
// Ohne jev zieht das Lab gleichverteilt (Entscheidungsart «zufall»). Der Mensch sieht die Zusammenstellung, zieht neu oder ändert einzelne
// Stellen, bevor gerechnet wird. Gerechnet wird mit gewöhnlichen Operationen des Registers; der Film ist ein Film über Stationen.
// Die Bestände (seit Lab 0.1.18, beide wahlweise, jev sieht sie nicht): ein Zettel aus dem Zettelkasten eröffnet den Film als Karte mit
// seinem Leitsatz; eine ORNA-Konstellation schliesst ihn als Karte mit ihrer Operationsregel. Bis 0.1.19 gab sie die Regel dem Zerfall
// (The Fictory) als siebtem Abschnitt; seit 0.1.20 bleiben nur lebendige Effekte in der Zusammenstellung, damit der Film fliesst
// (Christian, 24. Oktober 2026). Seit 0.1.22 sind das auch die Szenen von PHORMA I, II und III und der Zerfall selbst (eigene Bühnen): wählt jev
// den Zerfall, bekommt er die Regel der Konstellation; die Szenen von PHORMA I und II tragen den Titel des Zettels (sonst der Konstellation).
// Die Karten zeichnet lab.karte, nur im Browser. Seit 0.1.26 trägt der Film eine Signatur (Schalter, Standard an; kern/signatur.js): statt der Karten
// eröffnet ein Intro mit dem Zettel (Lichtwürfel → Raster des Zettelkastens → der Zettel mit Leitsatz und Verweisen → Scratch), ein Outro mit der
// Konstellation schliesst ihn (Körper → Kugel → Doppelrad von ORNA → Kugel), am Schluss steht immer das Signet «ornament.lab». Die 30 Sekunden der
// Animation bleiben; die Signatur kommt davor und danach dazu, auf einer eigenen Tonspur (der Klang läuft weiter, Scratch und Gefrickel).
// Seit 0.1.37 hat die Zusammenstellung ein Format (plan.format, Standard «wie das Material»; Christian, 25. Oktober 2026): das Material wird zuerst mit
// lab.format in das Seitenverhältnis eingepasst (Ausschnitt mittig), so entstehen Abschnitte, Karten, Signatur und Film in diesem Format.
// Ohne DOM, geprüft in tests/lab.test.mjs.
import { KOMPOSITION_FRAGEN, BILD_EFFEKTE, KLANG_EFFEKTE, ABSCHNITTE } from "../jev/fragen.js";
import { ergebnis, entscheide, GRENZEN } from "./projekt.js";
import { fuehreAus } from "./ausfuehrung.js";
import { taktSchwelle, DAUER } from "./vorschlag.js";
import { zufall } from "../../../alpha/the-fictory/analyse.js?v=23";
import { signaturZeiten, INTRO_DAUER, OUTRO_DAUER, SIGNATUR_VERSION } from "./signatur.js";
import { FORMATE } from "../operationen/format.js";

export { FORMATE };

export const ZUSAMMENSTELLUNG_VERSION = "0.6.4";
/** Dauer einer Karte (Zettel, ORNA) am Anfang oder Ende des Films, in Sekunden (seit 0.1.34 eine Sekunde länger, vorher 2,5) */
export const KARTE_DAUER = 3.5;
export const VARIANTEN_JE_ABSCHNITT = 10;   // seit Lab 0.1.16: 60 Motive in 30 s (vorher 3, also 18)

/**
 * Die Abschnitte des Menschen (seit Lab 0.1.28; Christian, 24. Oktober 2026: «wie kann ich einzeln Schritte ausschalten und wie ihre Länge verändern»):
 * je Abschnitt an oder aus und seine Dauer in Sekunden. Standard: alle sechs an, je DAUER / ABSCHNITTE (5 s), zusammen die 30 Sekunden. Ein Abschnitt,
 * der aus ist, wird nicht gerechnet; die Varianten eines Abschnitts folgen seiner Dauer (zwei je Sekunde wie bisher, höchstens GRENZEN.varianten), ohne
 * Takt hält jede seiner Stationen so lange, dass der Abschnitt seine Dauer bekommt, im Takt bekommt er entsprechend viele Stationen auf den Anschlägen.
 * jev sieht davon nichts: es wählt weiterhin die sechs Effekte; was der Mensch schaltet, macht die Zusammenstellung zu seiner Entscheidung.
 */
export const ABSCHNITT_DAUER = DAUER / ABSCHNITTE;
export const ABSCHNITT_DAUER_MAX = 20;
export const standardAbschnitte = () => Array.from({ length: ABSCHNITTE }, () => ({ an: true, dauer: ABSCHNITT_DAUER }));
/** plan.abschnitte lesen, fehlende Angaben ergänzen: [{ an, dauer }] je Stelle von plan.bild; Dauer in halben Sekunden, 1 bis ABSCHNITT_DAUER_MAX */
export function abschnitteNormieren(plan) {
  return plan.bild.map((_, i) => {
    const a = plan.abschnitte?.[i] ?? {}, d = Number(a.dauer);
    return { an: a.an !== false, dauer: Number.isFinite(d) && d > 0 ? Math.min(ABSCHNITT_DAUER_MAX, Math.max(1, Math.round(d * 2) / 2)) : ABSCHNITT_DAUER };
  });
}
/** Varianten (Stationen) für einen Abschnitt dieser Dauer: wie bisher zwei je Sekunde, mindestens eine, höchstens die Grenze je Ausführung */
export const variantenFuer = (dauer) => Math.max(1, Math.min(GRENZEN.varianten, Math.round((dauer / ABSCHNITT_DAUER) * VARIANTEN_JE_ABSCHNITT)));
/** hat der Mensch an den Abschnitten etwas geschaltet (sonst läuft alles wie bis 0.1.27: 60 Varianten, gleiches Halten) */
export const abschnitteEigen = (abschnitte) => abschnitte.some((a) => !a.an || a.dauer !== ABSCHNITT_DAUER);

/** Dauer eines Ablaufs von PHORMA I oder II in der Zusammenstellung (s): etwas länger als ein Abschnitt, damit er beim Wechsel noch läuft */
export const SZENE_DAUER = 8;
/** das Bild am Anfang des Films (s, seit 0.1.39): einmal vorn, ausserhalb der Runde im Takt */
export const BILD_DAUER = 1;
/** Bildeffekt → Operation: Parameter, und welcher Parameter der Lautstärke folgt (ohne Angabe: was die Operation selbst vorschlägt) */
export const BILD_REZEPTE = Object.freeze({
  "bild.feedback": { operation: "lab.feedback", parameter: { seite: 720 }, ziel: "zoom", tiefe: 0.35 },
  "bild.wiederholung": { operation: "lab.wiederholung", parameter: { seite: 1200 }, ziel: "groesse", tiefe: 0.5 },
  // Farbe: die Drehung steht auf 90° und die Lautstärke dreht sie weiter (seit 0.1.39; vorher 0°: in leisen Momenten stand das Ausgangsbild)
  "bild.farbe": { operation: "lab.farbe", parameter: { saettigung: 1.3, farbdrehung: 90 }, ziel: "farbdrehung", tiefe: 1 },
  "bild.glitch": { operation: "lab.glitch", parameter: { seite: 1000, bilder: 18 }, tiefe: 0.6 },
  "bild.verzerrung": { operation: "lab.verzerrung", parameter: { seite: 1000, bilder: 18 }, tiefe: 0.6 },
  "bild.licht": { operation: "lab.licht", parameter: { seite: 1000, bilder: 18 }, tiefe: 0.5 },
  "bild.raster": { operation: "lab.raster", parameter: { seite: 1000, bilder: 18 }, tiefe: 0.5 },
  // die Linienbilder (seit 0.1.36, nach den Plotter-Umwandlern von Makelangelo): lebendig auf der Grafikkarte, «lauf» bewegt sie von selbst.
  // In der Zusammenstellung zeichnen sie seit 0.1.41 mit den Farben des Bildes (auf Papier oder auf Nacht), nicht mit Tinte: Christian (25. Oktober
  // 2026): «Das Video ist jetzt zum grossen Teil schwarz/weiss» – seit die Effekte rein laufen (0.1.39), stand kein buntes Ausgangsbild mehr dazwischen.
  // Im Register bleibt «Tinte auf Papier» der Standard der Operationen.
  "bild.puls": { operation: "lab.puls", parameter: { farbe: "papier", seite: 1000, bilder: 18 }, tiefe: 0.5 },
  "bild.spirale": { operation: "lab.puls", parameter: { traeger: "spirale", abstand: 0.012, farbe: "nacht", seite: 1000, bilder: 18 }, tiefe: 0.5 },
  "bild.schraffur": { operation: "lab.schraffur", parameter: { farbe: "papier", seite: 1000, bilder: 18 }, tiefe: 0.25 },
  "bild.fluss": { operation: "lab.fluss", parameter: { farbe: "nacht", seite: 800, bilder: 18 }, tiefe: 0.5 },
  "bild.punktieren": { operation: "lab.punktieren", parameter: { farbe: "papier", seite: 1000, bilder: 18 }, tiefe: 0.5 },
  "bild.glasfenster": { operation: "lab.punktieren", parameter: { art: "mosaik", abstand: 0.014, seite: 1000, bilder: 18 }, ziel: "abstand", tiefe: 0.3 },
  "bild.teilung": { operation: "lab.teilung", parameter: { seite: 1000, bilder: 18 }, tiefe: 0.3 },
  "bild.truchet": { operation: "lab.teilung", parameter: { fuellung: "truchet", tiefe: 5, linien: 3, seite: 1000, bilder: 18 }, ziel: "schwelle", tiefe: 0.3 },
  // das Gewebe von PHORMA III (seit 0.1.21, operationen/phorma.js): zehn Momente der Szene als Varianten, der Film rechnet die Bühne lebendig;
  // es bekommt den neuen Klang als Eingang «ton» und seinen Beginn (unten). Irrfahrt, Lichtwürfel und Traube sind seit 0.1.35 nicht mehr dabei:
  // sie arbeiten nicht mit dem Bild (Christian, 25. Oktober 2026); das Gewebe wächst aus seinen Umrissen und kehrt zu ihm zurück
  "bild.gewebe": { operation: "phorma.gewebe", parameter: { bilder: VARIANTEN_JE_ABSCHNITT, dauer: DAUER }, ziel: null },
  // PHORMA II und PHORMA I (seit 0.1.22, operationen/phorma2.js, phorma1.js): zehn Momente des Ablaufs als Varianten; im Film läuft der Ablauf ab dem
  // Auftritt seiner Stationen (zeitbasis «auftritt») in SZENE_DAUER Sekunden; ein Zettel oder eine Konstellation am Eingang gibt ihnen den Titel
  ...Object.fromEntries(["physarum", "tiefe", "welle", "tuch", ["druck", "raster"], "montage"].map((e) => { const [k, a] = Array.isArray(e) ? e : [e, e]; return [`bild.${k}`, { operation: "phorma.ii", parameter: { ablauf: a, bilder: VARIANTEN_JE_ABSCHNITT, dauer: SZENE_DAUER }, ziel: null }]; })),
  ...Object.fromEntries(["fragmente", "strom", "koerper", "scherben", "echo", "relief"].map((a) => [`bild.${a}`, { operation: "phorma.i", parameter: { ablauf: a, bilder: VARIANTEN_JE_ABSCHNITT, dauer: SZENE_DAUER }, ziel: null }])),
  // The Fictory (seit 0.1.22 wieder, lebendig): die sechs Zustände als Varianten, im Film läuft der Prozess von Zustand zu Zustand; die Konstellation gibt die Regel
  "bild.zerfall": { operation: "fictory.prozess", parameter: { seite: 1000 }, ziel: null },
});   // seit 0.1.20 nur lebendige Effekte (jev/fragen.js, BILD_EFFEKTE): GPU-Fassung oder eigene Bühne
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
  return { aufbau, uebergang, klang: [k1, k2], bild, seed: seed >>> 0, zettel: null, orna: null, lebendig: true, bewegung: BEWEGUNG, signatur: true, mastering: true, abschnitte: standardAbschnitte() };
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
 * plan.lebendig (Schalter, Standard an) und plan.bewegung (Stärke der Kamera 0–1, Standard BEWEGUNG) sind die Filmeinstellungen des Menschen (seit 0.1.19);
 * plan.signatur (Standard an, seit 0.1.26): Intro (mit Zettel), Outro (mit Konstellation) und Signet statt der Karten, wo der Browser zeichnen kann.
 * plan.abschnitte (seit 0.1.28): je Abschnitt { an, dauer } (oben); die Länge der Animation ist die Summe der Dauern der Abschnitte, die an sind.
 * plan.format (seit 0.1.37): "material" (Standard) oder eine Kennung aus FORMATE; das Material wird zuerst eingepasst, alles Weitere entsteht im Format.
 * Zuerst die Klangeffekte nacheinander, dann misst ein Tonsignal den neuen Klang
 * (Takt und Steuersignal), dann sechs Abschnitte zu je zehn Varianten. Gibt { entscheidung, ergebnisse, klang, plan } zurück; plan wie bei
 * vorschlagAusfuehren(): { stationen, art, halten, uebergang, takt, bewegung, tonspur, tonBeginn, dauer }.
 */
export async function zusammenstellungRechnen({ register, projekt, medien, messung, plan, wahl, seed = 1, melden = () => {}, abbrechen = null }) {
  for (const k of plan.klang) if (!(k in KLANG_REZEPTE)) throw new Error(`Klangeffekt ${k} gibt es nicht`);
  // die Abschnitte (seit 0.1.28): nur die, die an sind, werden geprüft und gerechnet; ihre Dauern zusammen sind die Länge der Animation
  const abschnitte = abschnitteNormieren(plan), eigen = abschnitteEigen(abschnitte);
  const aktiv = plan.bild.map((bild, i) => ({ bild, i, ...abschnitte[i], anzahl: variantenFuer(abschnitte[i].dauer) })).filter((a) => a.an);
  if (!aktiv.length) throw new Error("Mindestens ein Abschnitt muss an sein");
  const haupt = Math.round(aktiv.reduce((s, a) => s + a.dauer, 0) * 2) / 2;
  for (const b of aktiv.map((a) => a.bild)) {
    if (!BILD_REZEPTE[b]) throw new Error(`Bildeffekt ${b} gibt es nicht`);
    const op = register.hole(BILD_REZEPTE[b].operation);
    if (op.verfuegbar && !op.verfuegbar()) throw new Error(`${op.name} ist in diesem Browser nicht verfügbar (${op.voraussetzungen.join(", ")}); eine andere Stelle wählen`);
  }
  if (!FILM[plan.uebergang]) throw new Error(`Übergang ${plan.uebergang} gibt es nicht`);
  const format = plan.format && plan.format !== "material" ? plan.format : null;
  if (format && !FORMATE[format]) throw new Error(`Format ${format} gibt es nicht`);
  if (plan.zettel && !register.hat("zettel.strophe")) throw new Error("Der Zettelkasten ist nicht im Register");
  if (plan.orna && !register.hat("orna.konstellation")) throw new Error("ORNA ist nicht im Register");
  const lebendig = plan.lebendig !== false, staerke = Math.min(1, Math.max(0, Number(plan.bewegung ?? BEWEGUNG) || 0));
  // die Signatur braucht die Leinwand des Browsers; ohne sie (Node, Tests) bleibt es bei den Karten
  const sigOp = register.hat("signatur.signet") ? register.hole("signatur.signet") : null;
  const signatur = plan.signatur !== false && Boolean(sigOp && (sigOp.verfuegbar?.() ?? true));
  const zeiten = signatur ? signaturZeiten({ intro: Boolean(plan.zettel), outro: Boolean(plan.orna), haupt }) : null;
  // fertig mischen (seit 0.1.45, Standard an): die Tonspur am Schluss auf −14 LUFS, mit Kompressor und Limiter (lab.mastering)
  const mastering = plan.mastering !== false && register.hat("lab.mastering");
  const d = entscheide(projekt, { art: wahl.art, gegenstand: "zusammenstellung", optionen: [], gewaehlt: { aufbau: plan.aufbau, uebergang: plan.uebergang, klang: plan.klang, bild: plan.bild,
      zettel: plan.zettel ? (plan.zettel.strophe || "ziehen") : null, orna: plan.orna ? (plan.orna.konstellation || "ziehen") : null, abschnitte, format: format ?? "material" },
    details: { ...(wahl.details ?? {}), ...(messung.videoBilder?.length > 1 ? { video: messung.videoBilder } : {}), startwert: plan.seed, merkmale: messung.merkmale, werte: messung.werte, film: { lebendig, bewegung: staerke, signatur: zeiten ? { ...zeiten, version: SIGNATUR_VERSION } : (plan.signatur === false ? "aus" : "nicht verfügbar"), mastering: mastering ? "−14 LUFS" : "aus", format: format ?? "material" }, version: ZUSAMMENSTELLUNG_VERSION } });
  const schritt = (anlass) => ({ art: wahl.art, details: { anlass, entscheidung: d.id } });

  // 0 · das Format (seit 0.1.37): das Material (das Bild, aus einem Video jedes Standbild) wird mit lab.format in das Seitenverhältnis eingepasst,
  //     bevor etwas gerechnet wird; die Abschnitte, Karten, Signatur und der Film nehmen dann dieses Format. Ohne Format bleibt alles, wie es ist
  let grundbild = messung.bild, videoBilder = messung.videoBilder?.length > 1 ? messung.videoBilder : null;
  if (format) {
    melden(`Format ${format}: das Material einpassen …`, null);
    const einpassen = async (id, anlass) => {
      const f = await fuehreAus({ register, projekt, medien, melden, abbrechen, auftrag: { operation: "lab.format", eingaben: { bild: id }, parameter: { format }, seed, wahl: schritt(anlass) } });
      return f.ergebnisse.find((e) => e.typ === "IMAGE").id;
    };
    grundbild = await einpassen(messung.bild, "Zusammenstellung, Format");
    if (videoBilder) { const aus = []; for (const [i, id] of videoBilder.entries()) aus.push(await einpassen(id, `Zusammenstellung, Format des Standbilds ${i + 1}`)); videoBilder = aus; }
  }

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
  let beginn = ton === messung.ton ? messung.beginn : 0;
  // mit Signatur: eine eigene Tonspur über den ganzen Film (der Klang läuft weiter, Scratch am Ende des Intros, Gefrickel unter dem Signet);
  // der ganze Film wird dann auf ihr gemessen, so stehen die Anschläge für Takt und Kamera in der Zeit des Films
  if (zeiten) {
    melden("Signatur: die Tonspur mit Scratch und Gefrickel …", null);
    const s = await fuehreAus({ register, projekt, medien, melden, abbrechen,
      auftrag: { operation: "signatur.ton", eingaben: { ton }, parameter: { beginn, dauer: zeiten.gesamt, vor: zeiten.vor, frickel: zeiten.signetDauer }, seed: (seed + 3) >>> 0, wahl: schritt("Zusammenstellung, Tonspur der Signatur") } });
    ton = s.ergebnisse.find((e) => e.typ === "AUDIO").id; beginn = 0;
  }
  // die fertige Tonspur mischen, bevor sie gemessen wird: Takt und Kamera folgen dem, was zu hören ist; die Länge bleibt, also auch der Beginn
  if (mastering) {
    melden("Die Tonspur fertig mischen (−14 LUFS) …", null);
    const f = await fuehreAus({ register, projekt, medien, melden, abbrechen,
      auftrag: { operation: "lab.mastering", eingaben: { ton }, parameter: { ziel: "-14" }, seed, wahl: schritt("Zusammenstellung, fertig mischen") } });
    ton = f.ergebnisse.find((e) => e.typ === "AUDIO").id;
  }
  const laenge = zeiten ? zeiten.gesamt : haupt;
  const t = await fuehreAus({ register, projekt, medien, melden, abbrechen,
    auftrag: { operation: "lab.tonsignal", eingaben: { ton }, parameter: { merkmal: "laut", beginn, laenge, proben: Math.round(laenge * 4), normieren: false }, wahl: schritt("Zusammenstellung, Klang messen") } });
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

  // 3 · Bild: die Abschnitte, die an sind (sechs, wenn der Mensch nichts schaltet), in der Kette auf dem vorigen, im Fächer jeweils auf dem Ausgangsbild;
  //     aus einem Video (messung.videoBilder) nimmt jeder Abschnitt das Standbild seiner Zeit (seiner Stelle unter den sechs), so folgt der Film dem Video
  const video = videoBilder;
  let eingang = video?.[0] ?? grundbild;
  const ergebnisse = [], uebergaenge = new Set(), abschnittVon = new Map(), abschnittVarianten = [];
  for (const [j, a] of aktiv.entries()) {
    const b = a.bild, i = a.i, anzahl = a.anzahl;
    const r = BILD_REZEPTE[b], op = register.hole(r.operation), mitTon = op.eingaenge.some((x) => x.name === "ton");
    // die Bestände an die Operationen, die sie annehmen (seit 0.1.22): die Konstellation gibt dem Zerfall die Regel und den Szenen den Titel, der Zettel den Titel
    const mitKonstellation = konstellation && op.eingaenge.some((x) => x.name === "konstellation"), mitText = zettel && op.eingaenge.some((x) => x.name === "text");
    const ziel = r.ziel === null ? null : r.ziel ?? op.moduliert ?? op.parameter.find((p) => p.art === "zahl" && p.id !== "seite")?.id;
    const routen = ziel && op.varianten === "moduliert" ? [{ ziel, tiefe: r.tiefe ?? 0.5, modulator: { quelle: "signal", ergebnis: signal.id } }] : [];
    melden(`Abschnitt ${j + 1} von ${aktiv.length}: ${BILD_EFFEKTE[b].split(":")[0]} …`, null);
    // die Parameter des Rezepts; eigene Dauer des Abschnitts: so viele Standbilder, PHORMA III über die ganze Animation (Filmzeit, mit dem Ton).
    // Die Szenen von PHORMA I und II laufen in der Dauer ihres Abschnitts plus einer Sekunde (der Übergang hinaus; seit 0.1.41, vorher
    // SZENE_DAUER = 8 s, mindestens 3 s länger als der Abschnitt): in fünf Sekunden eines Abschnitts kamen die Fragmente kaum über Linien und Formen
    // hinaus, die Farben und das Bild am Schluss des Ablaufs fehlten im Film (Christian: «zum grossen Teil schwarz/weiss»)
    const parameter = { ...r.parameter, ...(r.parameter.bilder !== undefined ? { bilder: anzahl } : {}),
      ...(r.parameter.dauer === SZENE_DAUER ? { dauer: Math.max(3, Math.round(a.dauer + 1)) } : {}),
      ...(mitTon ? { beginn, ...(r.parameter.dauer === DAUER ? { dauer: (zeiten ? zeiten.vor : 0) + haupt } : {}) } : {}) };
    const x = await fuehreAus({ register, projekt, medien, melden, abbrechen,
      auftrag: { operation: r.operation, eingaben: { bild: video ? video[Math.min(video.length - 1, Math.floor((i * video.length) / plan.bild.length))] : plan.aufbau === "aufbau.faecher" ? grundbild : eingang, ...(mitTon ? { ton } : {}),
          ...(mitKonstellation ? { konstellation: konstellation.id } : {}), ...(mitText ? { text: zettel.id } : {}) },
        parameter, seed: (seed + 101 * (i + 1)) >>> 0,
        variation: { anzahl, achse: "varianten", routen }, wahl: schritt(`Zusammenstellung, Abschnitt ${j + 1} von ${aktiv.length}`) } });
    const bilder = x.ergebnisse.filter((e) => e.typ === "IMAGE");
    // The Fictory gibt sechs Zustände aus: davon so viele wie der Abschnitt Varianten hat (jeder zweite bei zehn), damit jeder Abschnitt seine Zeit bekommt
    const genommen = bilder.length > anzahl ? bilder.filter((_, k) => k % Math.ceil(bilder.length / anzahl) === Math.ceil(bilder.length / anzahl) - 1) : bilder;
    // in der Kette entsteht der Abschnitt aus dem letzten Bild des vorigen: dieser Wechsel ist der Verlauf der Operation selbst
    if (!video && plan.aufbau !== "aufbau.faecher" && j > 0) uebergaenge.add(eingang);
    ergebnisse.push(...genommen);
    for (const e of genommen) abschnittVon.set(e.id, a);
    abschnittVarianten.push({ a, ids: genommen.map((e) => e.id) });
    eingang = genommen.at(-1).id;
  }

  // 3b · die Karten: der Zettel eröffnet den Film, die Konstellation schliesst ihn (nur wo lab.karte zeichnen kann: im Browser)
  const karteOp = register.hat("lab.karte") ? register.hole("lab.karte") : null, kartenMoeglich = Boolean(karteOp && (karteOp.verfuegbar?.() ?? true));
  const karte = async (eingaben, anlass) => {
    if (!kartenMoeglich) return null;
    const k = await fuehreAus({ register, projekt, medien, melden, abbrechen,
      auftrag: { operation: "lab.karte", eingaben: { bild: video?.[0] ?? grundbild, ...eingaben }, parameter: {}, seed, wahl: schritt(anlass) } });
    return k.ergebnisse.find((e) => e.typ === "IMAGE")?.id ?? null;
  };
  // 3c · die Signatur (seit 0.1.26): Intro mit dem Zettel, Outro mit der Konstellation, Signet; je ein Standbild als Station, im Film lebendig
  const signaturSchritt = async (operation, eingaben, parameter, anlass) => {
    const k = await fuehreAus({ register, projekt, medien, melden, abbrechen, auftrag: { operation, eingaben, parameter, seed: (seed + 31) >>> 0, wahl: schritt(anlass) } });
    return k.ergebnisse.find((e) => e.typ === "IMAGE")?.id ?? null;
  };
  let intro = null, outro = null, signet = null;
  if (zeiten) {
    const erstes = video?.[0] ?? grundbild, letztes = ergebnisse.at(-1)?.id ?? erstes;
    if (zettel) { melden("Signatur: das Intro mit dem Zettel …", null); intro = await signaturSchritt("signatur.intro", { text: zettel.id, bild: erstes, ton }, { beginn: 0 }, "Zusammenstellung, Signatur: Intro"); }
    if (konstellation) { melden("Signatur: das Outro mit ORNA …", null); outro = await signaturSchritt("signatur.outro", { konstellation: konstellation.id, bild: letztes }, { dauer: OUTRO_DAUER }, "Zusammenstellung, Signatur: Outro"); }
    melden("Signatur: das Signet ornament.lab …", null);
    signet = await signaturSchritt("signatur.signet", { ton, bild: letztes }, { auftakt: konstellation ? "kugel" : "bild", beginn: zeiten.signet }, "Zusammenstellung, Signatur: Signet");
  }
  const zettelKarte = zettel && !zeiten ? await karte({ text: zettel.id }, "Zusammenstellung, Zettelkarte") : null;
  const ornaKarte = konstellation && !zeiten ? await karte({ konstellation: konstellation.id }, "Zusammenstellung, ORNA-Karte") : null;
  const vorne = [...(intro ? [{ ergebnis: intro, einmal: true, halten: INTRO_DAUER, uebergang: "schnitt" }] : []), ...(zettelKarte ? [{ ergebnis: zettelKarte, einmal: true, halten: KARTE_DAUER }] : [])];
  const hinten = [...(outro ? [{ ergebnis: outro, einmal: true, halten: OUTRO_DAUER, uebergang: "schnitt", dehnen: true }] : []), ...(signet ? [{ ergebnis: signet, einmal: true, halten: zeiten.signetDauer }] : []),
    ...(ornaKarte ? [{ ergebnis: ornaKarte, einmal: true, halten: KARTE_DAUER }] : [])];
  // das Bild steht wie eine Karte einmal vorn (seit 0.1.39, BILD_DAUER): im Takt reihum kehrte die Runde sonst beim Bild wieder, sobald die Anschläge
  // über die Stationen hinausreichen (gleich starke Anschläge an der Schwelle), und mitten im Film stand das Ausgangsbild
  // mit dem Intro der Signatur steht das Bild nicht mehr als Station (seit 0.1.40): der Scratch des Intros führt direkt in den ersten Abschnitt
  // (lage.folgend, docs/SIGNATUR.md), ein Standbild dazwischen wäre wieder das Ausgangsbild
  const bildStationen = intro ? [] : [{ ergebnis: video?.[0] ?? grundbild, einmal: true, halten: BILD_DAUER }];
  const karten = vorne.length + bildStationen.length + hinten.length, kartenDauer = [...vorne, ...bildStationen, ...hinten].reduce((s, x) => s + x.halten, 0);

  // 4 · Film: Zettel (Intro), Bild, alle Abschnitte, Konstellation (Outro), Signet; im Takt der Anschläge reihum, sonst gleichmässig über die Dauer
  let stationen = [...vorne, ...bildStationen, ...ergebnisse.map((e) => e.id).slice(0, GRENZEN.stationen - karten), ...hinten];
  const f = FILM[plan.uebergang], folge = ergebnis(projekt, einsaetze.id).daten;
  const dauer = Math.min(laenge, folge?.dauer ?? laenge), n = stationen.length;
  // die Runde der Abschnitte spielt zwischen den Karten vorn und hinten (Partitur: ab dem ersten Anschlag nach den Karten vorn, bis die Karten hinten
  // ihre Zeit vor dem Ende des Tons haben). Die Schwelle der Anschläge wird darum in diesem Fenster gewählt, so dass dort so viele Anschläge liegen,
  // wie die Runde Wechsel hat (seit 0.1.40; vorher über den ganzen Ton: mit der Signatur lagen die Anschläge des Intros und des Outros ausserhalb,
  // und die Runde brach nach etwa der Hälfte der Stationen ab – Christian, 25. Oktober 2026: «nur 2–3 Effekte, als hätte es eine Zeitbeschränkung
  // zwischen Zettel und ORNA-Karte»). Jede Station kommt so einmal; reichen die Anschläge im Fenster nicht, läuft der Film gleichmässig
  // das Fenster rechnet wie die Partitur: Karten mit Halten und Übergang (ein Schnitt braucht keinen); die Runde braucht je Station einen Anschlag,
  // einer mehr für die Anschläge, die die Partitur zusammenfasst (näher als ein Bild); die Dichte folgt den Varianten (zwei je Sekunde), nicht der Grenze f.jeSekunde
  const kartenZeit = (k) => k.reduce((s, x) => s + x.halten + (x.uebergang === "schnitt" ? 0 : f.uebergang), 0);
  const runde = n - karten, fensterVon = kartenZeit([...vorne, ...bildStationen]), fensterBis = dauer - kartenZeit(hinten);
  const imFenster = (folge?.ereignisse ?? []).filter((x) => x.t > fensterVon && x.t <= fensterBis), fenster = Math.max(1, fensterBis - fensterVon);
  let schwelle = folge ? taktSchwelle({ ...folge, ereignisse: imFenster, dauer: fenster }, (runde + 1) / fenster) : null;
  const anschlaege = schwelle === null ? 0 : imFenster.filter((x) => (x.staerke ?? 1) >= schwelle).length;
  if (schwelle !== null && anschlaege < runde) {
    // die Anschläge reichen nicht für alle Varianten: der Takt bleibt, jeder Abschnitt bekommt so viele seiner Varianten, wie ihm Anschläge zustehen
    // (nach seiner Dauer, grösster Rest), gleichmässig aus seinen Varianten gewählt, die letzte immer dabei (sie ist der Eingang des nächsten Abschnitts)
    if (anschlaege < Math.max(4, 2 * abschnittVarianten.length)) schwelle = null;   // zu wenige für zwei Varianten je Abschnitt: gleichmässig, alle Varianten
    else {
      const gesamt = abschnittVarianten.reduce((q, v) => q + v.a.dauer, 0);
      const anteile = abschnittVarianten.map((v) => Math.max(1, Math.floor((anschlaege * v.a.dauer) / gesamt)));
      const reste = abschnittVarianten.map((v, i) => (anschlaege * v.a.dauer) / gesamt - anteile[i]);
      for (let frei = anschlaege - anteile.reduce((q, k) => q + k, 0); frei > 0; frei--) { const i = reste.indexOf(Math.max(...reste)); anteile[i]++; reste[i] = -1; }
      const genommen = abschnittVarianten.flatMap((v, i) => { const k = Math.min(v.ids.length, anteile[i]); return Array.from({ length: k }, (_, q) => v.ids[Math.round(((q + 1) * v.ids.length) / k) - 1]); });
      stationen = [...vorne, ...bildStationen, ...genommen, ...hinten];
    }
  }
  const takt = schwelle === null ? null : { ereignisfolge: einsaetze.id, schwelle: Math.round(schwelle * 1000) / 1000, wiederholen: true };
  const uebergang = takt ? f.uebergang : Math.min(f.uebergang, (0.5 * dauer) / Math.max(1, n - 1));
  // im Takt hat jeder Wechsel eine feste Länge, auch der Verlauf zwischen zwei Abschnitten (ohne Takt bliebe seine Länge offen)
  if (takt) stationen = stationen.map((s) => (typeof s === "string" && uebergaenge.has(s) ? { ergebnis: s, uebergang: "verlauf" } : s));
  // ohne Takt füllt das Halten die Dauer; die Karten haben ihre eigene
  const schnitte = stationen.filter((s) => s.uebergang === "schnitt").length;
  const halten = takt ? 1 : Math.max(0, Math.min(10, Math.round(((dauer - kartenDauer - (n - 1 - schnitte) * uebergang) / Math.max(1, n - karten)) * 100) / 100));
  // eigene Abschnitte (seit 0.1.28) ohne Takt: jede Station eines Abschnitts hält so lange, dass der Abschnitt seine Dauer bekommt (Übergänge eingerechnet);
  // im Takt entscheiden die Anschläge, dort hat ein längerer Abschnitt mehr Stationen
  if (eigen && !takt) {
    const je = (a) => Math.max(0, Math.min(10, Math.round((a.dauer / a.anzahl - (f.art === "schnitt" ? 0 : uebergang)) * 100) / 100));
    stationen = stationen.map((s) => (typeof s === "string" && abschnittVon.has(s) ? { ergebnis: s, halten: je(abschnittVon.get(s)) } : s));
  }
  return { entscheidung: d, ergebnisse, klang: ton, signal: signal.id, format: format ?? "material", grundbild, zettel: zettel?.daten ?? null, konstellation: konstellation?.daten ?? null, karten: { zettel: zettelKarte, orna: ornaKarte },
    signatur: zeiten ? { ...zeiten, intro, outro, signet } : null, abschnitte, haupt,
    plan: { stationen, art: f.art, halten, uebergang: Math.round(uebergang * 100) / 100, takt, bewegung: staerke ? { staerke, signal: signal.id } : null, lebendig, tonspur: ton, tonBeginn: beginn, dauer } };
}
