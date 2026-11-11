// ORNAMENT LAB – das Operationsregister. Die Operation ist die zentrale Einheit des Labs, nicht die App: vorhandene Anwendungen kommen
// über Adapter herein (operationen/fictory.js, operationen/orna.js), neue Verfahren als eigene Module. Jede Operation beschreibt sich
// vollständig selbst (Kennung, Herkunft, Version, Ein- und Ausgänge, Parameter, Voraussetzungen, Ressourcen), damit Projektdateien,
// Oberfläche und Protokoll nur mit dieser Beschreibung arbeiten.
import { TYPEN, kompatibel } from "./typen.js";

export const KLASSEN = Object.freeze({
  raeumlich: "Räumliche Operation",
  zeitlich: "Zeitliche Operation",
  kopplung: "Kopplungsoperation",
  rekursiv: "Rekursive Operation",
  selektion: "Selektionsoperation",
  beobachtung: "Beobachtungsoperation",
});

const PFLICHT = ["id", "name", "version", "klasse", "herkunft", "eingaenge", "ausgaenge", "parameter", "ausfuehren"];

/** prüft eine Operationsbeschreibung; wirft mit allen Mängeln auf einmal */
export function pruefeOperation(op) {
  const fehler = [];
  for (const k of PFLICHT) if (op?.[k] === undefined) fehler.push(`${k} fehlt`);
  if (op?.id && !/^[a-z]+\.[a-z0-9-]+$/.test(op.id)) fehler.push(`Kennung «${op.id}» muss «bereich.name» sein`);
  if (op?.version && !/^\d+\.\d+\.\d+$/.test(op.version)) fehler.push(`Version «${op.version}» ist keine Semver`);
  if (op?.klasse && !KLASSEN[op.klasse]) fehler.push(`unbekannte Klasse «${op.klasse}»`);
  for (const e of [...(op?.eingaenge ?? []), ...(op?.ausgaenge ?? [])]) {
    if (!TYPEN[e.typ]) fehler.push(`unbekannter Typ «${e.typ}»`);
    else if (!TYPEN[e.typ].implementiert) fehler.push(`Typ «${e.typ}» ist in 0.1 noch nicht implementiert`);
  }
  for (const p of op?.parameter ?? []) {
    if (!p.id || !p.name || !["zahl", "wahl", "schalter"].includes(p.art)) fehler.push(`Parameter ${p.id ?? "?"} unvollständig`);
    if (p.art === "zahl" && !(p.min <= p.standard && p.standard <= p.max)) fehler.push(`Parameter ${p.id}: Standard ausserhalb von min–max`);
    if (p.art === "wahl" && !p.optionen?.some((o) => o.wert === p.standard)) fehler.push(`Parameter ${p.id}: Standard nicht unter den Optionen`);
  }
  if (fehler.length) throw new Error(`Operation ${op?.id ?? "?"}: ${fehler.join("; ")}`);
  return op;
}

export function erstelleRegister() {
  const ops = new Map();
  return {
    registriere(op) {
      pruefeOperation(op);
      if (ops.has(op.id)) throw new Error(`Operation ${op.id} ist schon registriert`);
      ops.set(op.id, Object.freeze(op));
      return op;
    },
    hole(id) {
      const op = ops.get(id);
      if (!op) throw new Error(`unbekannte Operation: ${id}`);
      return op;
    },
    hat: (id) => ops.has(id),
    alle: () => [...ops.values()],
    // Ausgemusterte Operationen (op.ausgemustert, ein Datum) bleiben im Register, damit gespeicherte Projekte mit ihnen aufgehen und ihr
    // Verlauf sich zeigen lässt; zur Wahl stehen sie nicht mehr: anwendbar, fuer und generatoren lassen sie weg
    /** Operationen, deren Pflichteingänge sich aus den vorhandenen Typen füllen lassen */
    anwendbar(vorhandeneTypen) {
      return [...ops.values()].filter((op) => !op.ausgemustert && op.eingaenge.every((e) => e.optional || vorhandeneTypen.some((t) => kompatibel(t, e.typ))));
    },
    /** Operationen, die ein Ergebnis eines bestimmten Typs als Haupteingang annehmen (für Weiterverarbeitung); ohne Generatoren */
    fuer(typ) {
      return [...ops.values()].filter((op) => !op.ausgemustert && op.eingaenge.length && !istGenerator(op) && kompatibel(typ, op.eingaenge[0].typ));
    },
    /** Generatoren: Operationen ohne Pflichteingang (ORNA, Klangerzeuger); sie stehen immer zur Wahl */
    generatoren: () => [...ops.values()].filter((op) => !op.ausgemustert && istGenerator(op)),
  };
}

/** ohne Pflichteingang: kann aus dem Nichts (Startwert) oder aus beliebigen vorhandenen Ergebnissen erzeugen */
export const istGenerator = (op) => op.eingaenge.every((e) => e.optional);

/** Standardwerte aller Parameter einer Operation */
export const standardParameter = (op) => Object.fromEntries(op.parameter.map((p) => [p.id, p.standard]));

/** Parameter gegen die Beschreibung prüfen und begrenzen (Ressourcenbegrenzung gehört dazu: min/max sind harte Grenzen) */
export function bereinigeParameter(op, roh = {}) {
  const out = {};
  for (const p of op.parameter) {
    const v = roh[p.id] ?? p.standard;
    if (p.art === "zahl") { const z = Number(v); out[p.id] = Number.isFinite(z) ? Math.min(p.max, Math.max(p.min, z)) : p.standard; }
    else if (p.art === "wahl") out[p.id] = p.optionen.some((o) => o.wert === v) ? v : p.standard;
    else out[p.id] = Boolean(v);
  }
  return out;
}
