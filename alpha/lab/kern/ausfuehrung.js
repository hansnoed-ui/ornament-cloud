// ORNAMENT LAB – Ausführung. Verbindet Register, Projekt und Medienspeicher: prüft Typen, löst Steuersignale auf, verteilt Varianten über
// Modulation, trägt Knoten, Ergebnisse und Entscheidungen ins Projekt ein und hält Fehler fest, statt sie zu verschlucken.
// Ohne DOM: der Medienspeicher wird hereingereicht (Browser: PNG über Canvas, Node: im Speicher). So laufen dieselben Ketten in Tests.
import { kompatibel } from "./typen.js";
import { bereinigeParameter, standardParameter } from "./register.js";
import { moduliere, stellen, routeFuersProtokoll } from "./modulation.js";
import { GRENZEN, ergebnis, fuegeKnotenHinzu, fuegeErgebnisHinzu, schliesseKnoten, entscheide, waehleVariante, verlauf } from "./projekt.js";
import { zufall } from "../../../alpha/the-fictory/analyse.js?v=23";

const jetzt = () => (globalThis.performance?.now?.() ?? Date.now());
export const neuerStartwert = () => { const b = new Uint32Array(1); crypto.getRandomValues(b); return b[0]; };

/** Eingänge einer Operation aus Ergebnissen des Projekts laden, mit Typprüfung */
async function eingaengeLaden(op, projekt, medien, eingaben) {
  const out = {};
  for (const e of op.eingaenge) {
    const id = eingaben[e.name];
    if (!id) { if (e.optional) continue; throw new Error(`${op.name}: Eingang «${e.name}» fehlt`); }
    const erg = ergebnis(projekt, id);
    if (!erg) throw new Error(`${op.name}: Ergebnis ${id} gibt es nicht`);
    if (!kompatibel(erg.typ, e.typ)) throw new Error(`${op.name}: Eingang «${e.name}» verlangt ${e.typ}, bekommt ${erg.typ}`);
    out[e.name] = erg.typ === "IMAGE" ? await medien.bild(erg) : erg.typ === "AUDIO" ? await medien.ton(erg) : erg.daten;
  }
  return out;
}

/** Angaben zu einem erzeugten Klang (wie bei Tonmaterial) und ein Umriss mit 200 Spitzenwerten für die Anzeige */
function tonAngaben({ pcm, rate }) {
  const n = 200, umriss = Array.from({ length: n }, (_, k) => {
    let m = 0;
    for (let i = Math.floor((k * pcm.length) / n), z = Math.floor(((k + 1) * pcm.length) / n); i < z; i++) m = Math.max(m, Math.abs(pcm[i]));
    return Math.round(m * 1000) / 1000;
  });
  return { dauer: Math.round((pcm.length / rate) * 1000) / 1000, abtastrate: rate, kanaele: 1, umriss };
}

/** Steuersignal-Quellen in Routen mit den Werten aus dem Projekt versehen (auch für die Zeitparameter eines Films, kern/stationen.js) */
export function routenAufloesen(projekt, routen = []) {
  return routen.map((r) => {
    if (r.modulator?.quelle !== "signal") return r;
    const s = ergebnis(projekt, r.modulator.ergebnis);
    if (!s || s.typ !== "CONTROL_SIGNAL") throw new Error(`Modulation: Steuersignal ${r.modulator.ergebnis} gibt es nicht`);
    return { ...r, modulator: { ...r.modulator, signal: s.daten } };
  });
}

/**
 * Eine Operation ausführen und ins Projekt eintragen.
 * auftrag: { operation, eingaben: { name: ergebnisId }, parameter, variation: { anzahl, achse: "varianten"|"zeit"|"beide", routen }, seed, wahl: { art, details } }
 * Gibt { knoten, ergebnisse } zurück; bei einem Fehler steht der Knoten mit Status «fehler» im Projekt und der Fehler wird weitergegeben.
 */
export async function fuehreAus({ register, projekt, medien, auftrag, melden = () => {}, abbrechen = null }) {
  const op = register.hole(auftrag.operation);
  const parameter = bereinigeParameter(op, { ...standardParameter(op), ...(auftrag.parameter ?? {}) });
  const seed = (auftrag.seed ?? neuerStartwert()) >>> 0;
  const v = auftrag.variation ?? {};
  const achse = v.achse ?? "varianten";
  const anzahl = op.varianten === "moduliert" && achse !== "zeit" ? Math.max(1, Math.min(GRENZEN.varianten, Math.round(v.anzahl ?? 1))) : 1;
  const routen = routenAufloesen(projekt, v.routen ?? []);
  const k = fuegeKnotenHinzu(projekt, {
    operation: op.id, operationVersion: op.version, eingaben: auftrag.eingaben ?? {}, parameter, seed,
    variation: { anzahl, achse, routen: (v.routen ?? []).map(routeFuersProtokoll) }, reproduzierbar: op.reproduzierbar,
  });
  if (auftrag.wahl) entscheide(projekt, { art: auftrag.wahl.art, gegenstand: "operation", optionen: auftrag.wahl.optionen ?? [], gewaehlt: op.id, details: auftrag.wahl.details ?? {}, knoten: k.id });
  const t0 = jetzt();
  try {
    const ein = await eingaengeLaden(op, projekt, medien, auftrag.eingaben ?? {});
    const zeitRouten = achse === "zeit" || achse === "beide" ? routen : [];
    const laeufe = anzahl > 1 ? stellen(anzahl) : [null];
    const ergebnisse = [], protokolle = [];
    for (let i = 0; i < laeufe.length; i++) {
      abbrechen?.throwIfAborted?.();
      const u = laeufe[i];
      const p = u === null ? parameter : moduliere(op, parameter, routen, u);
      melden(`${op.name}${laeufe.length > 1 ? `, Variante ${i + 1} von ${laeufe.length}` : ""} …`, i / laeufe.length);
      const r = await op.ausfuehren(ein, p, { seed: (seed + i) >>> 0, zeitRouten, melden, abbrechen, vorherigeKonstellation: auftrag.vorherigeKonstellation });
      protokolle.push(r.protokoll ?? null);
      for (const d of r.entscheidungen ?? []) entscheide(projekt, { ...d, knoten: k.id });
      for (const [j, a] of r.ausgaben.entries()) {
        const idx = ergebnisse.length;
        const e = fuegeErgebnisHinzu(projekt, k.id, { typ: a.typ, titel: laeufe.length > 1 ? `${a.titel} · ${i + 1}` : a.titel, daten: a.daten ?? null, befund: a.befund ?? null, index: idx });
        e.variante = { stelle: u, parameter: u === null ? null : p, seed: (seed + i) >>> 0, teil: j };
        if (a.bild) Object.assign(e, await medien.ablegen(e, a.bild));
        else if (a.ton) { Object.assign(e, await medien.ablegenKlang(e, a.ton)); e.ton = tonAngaben(a.ton); }
        else if (a.daten) Object.assign(e, await medien.ablegenDaten(e, a.daten));
        ergebnisse.push(e);
      }
    }
    schliesseKnoten(projekt, k.id, { protokoll: protokolle.length === 1 ? protokolle[0] : protokolle, dauerMs: Math.round(jetzt() - t0) });
    melden(`${op.name}: ${ergebnisse.length} Ergebnis${ergebnisse.length === 1 ? "" : "se"}`, 1);
    return { knoten: k, ergebnisse };
  } catch (fehler) {
    schliesseKnoten(projekt, k.id, { status: "fehler", fehler: String(fehler?.message ?? fehler), dauerMs: Math.round(jetzt() - t0) });
    throw fehler;
  }
}

/**
 * Die Bildfolge, die zu einem Ergebnis geführt hat (Nacheinander als Bewegung): die Operation rechnet ihren Verlauf mit denselben
 * Parametern und demselben Startwert noch einmal. Operationen ohne eigenen Verlauf werden als Überblendung vom Eingang zum Ergebnis gezeigt.
 */
export async function* bildfolge({ register, projekt, medien, ergebnisId, ueberblendung = 30, abbrechen = null }) {
  const e = ergebnis(projekt, ergebnisId);
  if (!e?.knoten || e.typ !== "IMAGE") throw new Error("Nur Bildergebnisse einer Operation haben einen Verlauf");
  const k = projekt.knoten.find((x) => x.id === e.knoten), op = register.hole(k.operation);
  const p = e.variante?.parameter ?? k.parameter;
  if (op.verlauf) {
    const ein = await eingaengeLaden(op, projekt, medien, k.eingaben);
    const zeitRouten = k.variation?.achse === "zeit" || k.variation?.achse === "beide" ? routenAufloesen(projekt, k.variation.routen) : [];
    let n = 0;
    for await (const f of op.verlauf(ein, p, { seed: e.variante?.seed ?? k.seed, zeitRouten, abbrechen, teil: e.variante?.teil ?? 0 })) {
      if (++n > GRENZEN.animationBilder) break;
      yield f.bild;
    }
    return;
  }
  const a = await medien.bild(ergebnis(projekt, Object.values(k.eingaben)[0])), b = await medien.bild(e);
  const { skalieren } = await import("./bilddaten.js");
  const a2 = a.width === b.width && a.height === b.height ? a : skalieren(a, b.width, b.height);
  for (let i = 0; i <= ueberblendung; i++) {
    const t = i / ueberblendung, s = t * t * (3 - 2 * t), out = { width: b.width, height: b.height, data: new Uint8ClampedArray(b.data.length) };
    for (let j = 0; j < out.data.length; j++) out.data[j] = a2.data[j] * (1 - s) + b.data[j] * s;
    yield out;
  }
}

/**
 * Vorschläge für die nächste Operation nach festen, offen gelegten Regeln (Entscheidungsart «regel»). Kein Urteil über Qualität:
 * die Regeln sorgen nur für Abwechslung der Operationsklassen und für die Kopplung über Steuersignale.
 */
export function regelVorschlaege(register, projekt, ergebnisId) {
  const e = ergebnis(projekt, ergebnisId);
  if (!e) return [];
  const klassen = verlauf(projekt, ergebnisId).schritte.map((s) => register.hole(s.knoten.operation).klasse);
  const zuletzt = klassen.slice(-2);
  const hatSignal = projekt.ergebnisse.some((x) => x.typ === "CONTROL_SIGNAL");
  return register.fuer(e.typ).map((op) => {
    let gewicht = 1; const gruende = [];
    if (!zuletzt.includes(op.klasse)) { gewicht += 1; gruende.push("andere Operationsklasse als die letzten Schritte"); }
    if (zuletzt.at(-1) === "rekursiv" && op.klasse === "beobachtung") { gewicht += 1; gruende.push("nach einer Rekursion: beobachten, was sie verändert hat"); }
    if (!hatSignal && op.klasse === "kopplung") { gewicht += 1; gruende.push("noch kein Steuersignal im Projekt: Kopplung möglich"); }
    if (op.eingaenge.some((x, i) => i > 0 && !x.optional)) { gewicht -= 0.5; gruende.push("braucht einen zweiten Eingang"); }
    return { operation: op.id, name: op.name, gewicht, gruende };
  }).sort((a, b) => b.gewicht - a.gewicht || a.name.localeCompare(b.name));
}

/**
 * Experimenteller Modus: das Lab verbindet selbst Operationen, innerhalb fester Grenzen (erlaubte Operationen, Schritte, Zeit).
 * Alle Wahlen sind Zufall mit protokolliertem Startwert und darum mit demselben Startwert wiederholbar (bis auf ORNA-Ziehungen).
 */
export async function experiment({ register, projekt, medien, start, erlaubt, schritte = 3, varianten = 3, seed = neuerStartwert(), melden = () => {}, abbrechen = null }) {
  const rnd = zufall(seed >>> 0);
  const n = Math.max(1, Math.min(GRENZEN.experimentSchritte, Math.round(schritte)));
  const t0 = jetzt(), verlaufIds = [];
  let aktuell = start;
  for (let s = 0; s < n; s++) {
    if ((jetzt() - t0) / 1000 > GRENZEN.experimentSekunden) { projekt.meldungen.push({ zeit: new Date().toISOString(), art: "warnung", text: `Experiment nach ${s} Schritten beendet: Zeitgrenze von ${GRENZEN.experimentSekunden} s erreicht` }); break; }
    const e = ergebnis(projekt, aktuell);
    const moeglich = register.fuer(e.typ).filter((op) => erlaubt.includes(op.id) && op.eingaenge.every((x, i) => i === 0 || x.optional || x.typ === "IMAGE"));
    if (!moeglich.length) break;
    const op = moeglich[Math.floor(rnd() * moeglich.length)];
    const eingaben = { [op.eingaenge[0].name]: aktuell };
    for (const x of op.eingaenge.slice(1)) if (!x.optional) {
      const bilder = projekt.ergebnisse.filter((y) => y.typ === "IMAGE" && y.id !== aktuell);
      eingaben[x.name] = bilder.length ? bilder[Math.floor(rnd() * bilder.length)].id : aktuell;
    }
    // zufällige, aber protokollierte Parameter: höchstens zwei Zahlen weichen vom Standard ab
    const parameter = standardParameter(op);
    const zahlen = op.parameter.filter((p) => p.art === "zahl" && p.id !== "seite");
    for (let j = 0; j < Math.min(2, zahlen.length); j++) {
      const p = zahlen[Math.floor(rnd() * zahlen.length)];
      parameter[p.id] = p.min + rnd() * (p.max - p.min);
    }
    const route = zahlen.length ? { ziel: zahlen[Math.floor(rnd() * zahlen.length)].id, tiefe: 0.6, modulator: { quelle: "sinus", frequenz: 0.5, phase: 0 } } : null;
    melden(`Experiment, Schritt ${s + 1} von ${n}: ${op.name}`, s / n);
    const { ergebnisse } = await fuehreAus({
      register, projekt, medien, abbrechen,
      auftrag: { operation: op.id, eingaben, parameter, seed: Math.floor(rnd() * 2 ** 32), variation: { anzahl: varianten, achse: "varianten", routen: route ? [route] : [] },
        wahl: { art: "zufall", optionen: moeglich.map((o) => o.id), details: { modus: "experimentell", experimentStartwert: seed, schritt: s + 1 } } },
    });
    const bilder = ergebnisse.filter((x) => x.typ === "IMAGE");
    if (!bilder.length) break;
    const w = bilder[Math.floor(rnd() * bilder.length)];
    waehleVariante(projekt, w.id, "zufall", { modus: "experimentell", experimentStartwert: seed, schritt: s + 1 });
    verlaufIds.push(w.id);
    aktuell = w.id;
  }
  return { seed, ergebnisse: verlaufIds };
}

/** eine gespeicherte Kette (Combinator) auf ein Material anwenden; Varianten werden an derselben Stelle der Reihe gewählt wie beim Speichern */
export async function ketteAnwenden({ register, projekt, medien, kette, start, melden = () => {} }) {
  let aktuell = start;
  for (const [i, s] of kette.schritte.entries()) {
    const op = register.hole(s.operation);
    const pflicht = (s.nebeneingaenge ?? []).filter((n) => !op.eingaenge.find((e) => e.name === n)?.optional);
    if (pflicht.length) throw new Error(`Schritt ${i + 1} (${op.name}) braucht weitere Eingänge (${pflicht.join(", ")}); Ketten mit mehreren Pflichteingängen folgen später`);
    if (s.nebeneingaenge?.length) projekt.meldungen.push({ zeit: new Date().toISOString(), art: "hinweis", text: `${op.name}: der optionale Eingang ${s.nebeneingaenge.join(", ")} wird in der Kette nicht mitgeführt` });
    if (op.version !== s.operationVersion) projekt.meldungen.push({ zeit: new Date().toISOString(), art: "warnung", text: `${op.name}: Kette mit Version ${s.operationVersion} gespeichert, ausgeführt mit ${op.version}` });
    melden(`Kette «${kette.name}», Schritt ${i + 1} von ${kette.schritte.length}`, i / kette.schritte.length);
    const { ergebnisse } = await fuehreAus({
      register, projekt, medien,
      auftrag: { operation: s.operation, eingaben: op.eingaenge.length ? { [op.eingaenge[0].name]: aktuell } : {}, parameter: s.parameter, variation: s.variation,
        wahl: { art: "regel", details: { kette: kette.id, name: kette.name, schritt: i + 1 } } },
    });
    const w = ergebnisse[Math.min(ergebnisse.length - 1, Math.max(0, s.auswahl))];
    waehleVariante(projekt, w.id, "regel", { kette: kette.id, regel: "dieselbe Stelle der Reihe wie beim Speichern", stelle: s.auswahl });
    aktuell = w.id;
  }
  return aktuell;
}
