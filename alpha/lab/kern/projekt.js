// ORNAMENT LAB – das Projektformat (Version 0.5.0, Beschreibung: docs/PROJEKTFORMAT.md). Reines JSON für die Struktur, Mediendateien
// getrennt daneben (im Archiv unter medien/). Ein Projekt ist eine gerichtete, azyklische Ausführungsgrafik:
//   Ergebnisse (Material und erzeugte Zustände)  ←ausgaben—  Knoten (eine Ausführung einer Operation)  —eingaben→  frühere Ergebnisse
// Ein Knoten kann nur auf Ergebnisse verweisen, die es schon gibt; damit sind Schleifen ausgeschlossen, und nichts wird überschrieben:
// Weiterverarbeitung legt immer neue Knoten und Ergebnisse an, die Geschichte bleibt vollständig.
// Entscheidungen sind eigene Einträge mit einer von vier Arten (mensch, zufall, regel, jev), damit sie unterscheidbar bleiben (§11).

export const FORMAT = "ornament-lab-projekt";
export const FORMAT_VERSION = "0.5.0";
export const LAB_VERSION = "0.1.4";

export const ENTSCHEIDUNGSARTEN = Object.freeze({
  mensch: "menschliche Entscheidung",
  zufall: "Zufall",
  regel: "regelbasierte Entscheidung",
  jev: "jev-Entscheidung",
});

export const BEFUNDARTEN = Object.freeze({
  verifiziert: "verifizierter Befund",
  hypothese: "technische Hypothese",
  gestaltung: "gestalterische Entscheidung",
  modell: "nicht reproduzierbares Modellresultat",
});

/** harte Grenzen gegen Endlosschleifen und unkontrollierten Ressourcenverbrauch */
export const GRENZEN = Object.freeze({
  knoten: 300,             // Ausführungen je Projekt
  varianten: 12,           // Varianten je Ausführung
  experimentSchritte: 8,   // Schritte im experimentellen Modus
  experimentSekunden: 120, // Rechenzeit im experimentellen Modus
  seite: 2048,             // längste Seite der Arbeitsbilder in Pixeln
  animationBilder: 900,    // Bilder je Animation
  tonSekunden: 600,        // Länge einer Tondatei (sie wird ganz dekodiert)
  stationen: 48,           // Stationen je Film (kern/stationen.js)
  filmBilder: 3600,        // Bilder je Film über Stationen (2 Minuten bei 30 Bildern/s)
});

let zaehler = 0;
export function neueId(praefix) {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return `${praefix}-${(Date.now() % 1e8).toString(36)}${(++zaehler).toString(36)}${b[0].toString(36).slice(0, 4)}`;
}

export function neuesProjekt({ titel = "Ohne Titel", modus = "manuell" } = {}) {
  const jetzt = new Date().toISOString();
  return {
    format: FORMAT, formatVersion: FORMAT_VERSION, labVersion: LAB_VERSION,
    id: neueId("p"), titel, modus, erstellt: jetzt, geaendert: jetzt,
    ergebnisse: [], knoten: [], entscheidungen: [], ketten: [], exporte: [], meldungen: [],
  };
}

const beruehrt = (p) => { p.geaendert = new Date().toISOString(); return p; };
export const ergebnis = (p, id) => p.ergebnisse.find((e) => e.id === id) ?? null;
export const knoten = (p, id) => p.knoten.find((k) => k.id === id) ?? null;

/** importiertes Material als Ergebnis ohne erzeugenden Knoten (Bild oder, seit 0.4.0, Ton) */
export function fuegeMaterialHinzu(p, { titel, typ = "IMAGE", datei, sha256, breite, hoehe, mime, herkunft, ton = null }) {
  const e = { id: neueId("m"), typ, titel, datei, sha256, breite, hoehe, mime, herkunft: { art: "import", ...herkunft }, knoten: null, index: null, erstellt: new Date().toISOString() };
  if (ton) e.ton = { dauer: ton.dauer, abtastrate: ton.abtastrate, kanaele: ton.kanaele };   // seit 0.4.0 bei AUDIO
  p.ergebnisse.push(e);
  beruehrt(p);
  return e;
}

/**
 * Eine Ausführung eintragen. k: { operation, operationVersion, eingaben: { name: ergebnisId }, parameter, variation, seed, entscheidung }
 * Gibt den Knoten zurück; seine Ergebnisse kommen danach mit fuegeErgebnisHinzu (sie verweisen auf ihn).
 */
export function fuegeKnotenHinzu(p, k) {
  if (p.knoten.length >= GRENZEN.knoten) throw new Error(`Grenze erreicht: höchstens ${GRENZEN.knoten} Ausführungen je Projekt`);
  for (const [name, id] of Object.entries(k.eingaben ?? {})) if (!ergebnis(p, id)) throw new Error(`Eingang ${name}: Ergebnis ${id} gibt es nicht`);
  const n = {
    id: neueId("k"), operation: k.operation, operationVersion: k.operationVersion, eingaben: { ...(k.eingaben ?? {}) },
    parameter: { ...(k.parameter ?? {}) }, variation: k.variation ?? null, seed: k.seed ?? null, entscheidung: k.entscheidung ?? null,
    ausgaben: [], gewaehlt: null, status: "laeuft", warnungen: [], fehler: null, protokoll: null,
    start: new Date().toISOString(), dauerMs: null, reproduzierbar: k.reproduzierbar ?? "ja",
  };
  p.knoten.push(n);
  beruehrt(p);
  return n;
}

export function fuegeErgebnisHinzu(p, knotenId, { typ, titel, datei = null, sha256 = null, breite = null, hoehe = null, mime = null, daten = null, index = 0, befund = null }) {
  const k = knoten(p, knotenId);
  if (!k) throw new Error(`Knoten ${knotenId} gibt es nicht`);
  const e = { id: neueId("e"), typ, titel, datei, sha256, breite, hoehe, mime, daten, befund, knoten: knotenId, index, herkunft: { art: "operation", operation: k.operation }, erstellt: new Date().toISOString() };
  p.ergebnisse.push(e);
  k.ausgaben.push(e.id);
  beruehrt(p);
  return e;
}

export function schliesseKnoten(p, knotenId, { status = "fertig", fehler = null, warnungen = [], protokoll = null, dauerMs = null } = {}) {
  const k = knoten(p, knotenId);
  Object.assign(k, { status, fehler, warnungen: [...k.warnungen, ...warnungen], protokoll, dauerMs });
  beruehrt(p);
  return k;
}

/** eine Entscheidung festhalten; art ∈ ENTSCHEIDUNGSARTEN. Wird sie an einen Knoten gebunden, steht sie dort zusätzlich als Verweis. */
export function entscheide(p, { art, gegenstand, optionen = [], gewaehlt, details = {}, knoten: knotenId = null }) {
  if (!ENTSCHEIDUNGSARTEN[art]) throw new Error(`unbekannte Entscheidungsart: ${art}`);
  const e = { id: neueId("d"), zeit: new Date().toISOString(), art, gegenstand, optionen, gewaehlt, details, knoten: knotenId };
  p.entscheidungen.push(e);
  if (knotenId) { const k = knoten(p, knotenId); if (k) (k.entscheidungen ??= []).push(e.id); }
  beruehrt(p);
  return e;
}

/** eine Variante wählen (Ergebnis eines Knotens), mit Entscheidungsart */
export function waehleVariante(p, ergebnisId, art = "mensch", details = {}) {
  const e = ergebnis(p, ergebnisId);
  if (!e?.knoten) throw new Error("nur Ergebnisse einer Operation können gewählt werden");
  const k = knoten(p, e.knoten);
  k.gewaehlt = e.id;
  return entscheide(p, { art, gegenstand: "variante", optionen: k.ausgaben, gewaehlt: e.id, details, knoten: k.id });
}

/** Nacheinander: die Kette der Knoten von einem Ergebnis zurück bis zum Material (älteste zuerst) */
export function verlauf(p, ergebnisId) {
  const kette = [];
  const gesehen = new Set();
  let e = ergebnis(p, ergebnisId);
  while (e?.knoten) {
    if (gesehen.has(e.id)) throw new Error("Zyklus im Projekt");
    gesehen.add(e.id);
    const k = knoten(p, e.knoten);
    kette.unshift({ knoten: k, ergebnis: e });
    const haupt = Object.values(k.eingaben)[0];
    e = haupt ? ergebnis(p, haupt) : null;
  }
  return { material: e ?? null, schritte: kette };
}

/** Nebeneinander: alle Varianten derselben Ausführung */
export const geschwister = (p, ergebnisId) => {
  const e = ergebnis(p, ergebnisId);
  return e?.knoten ? knoten(p, e.knoten).ausgaben.map((id) => ergebnis(p, id)) : [e];
};

/** eine Kette (wie ein Combinator: ein Gefüge von Operationen als wiederverwendbare Einheit) aus dem Verlauf eines Ergebnisses */
export function ketteAusVerlauf(p, ergebnisId, name) {
  const { schritte } = verlauf(p, ergebnisId);
  if (!schritte.length) throw new Error("Dieses Ergebnis hat keinen Verlauf");
  const kette = {
    id: neueId("c"), name: name || `Kette ${p.ketten.length + 1}`, erstellt: new Date().toISOString(),
    schritte: schritte.map(({ knoten: k, ergebnis: e }) => ({
      operation: k.operation, operationVersion: k.operationVersion, parameter: k.parameter, variation: k.variation,
      auswahl: k.ausgaben.indexOf(e.id),   // welche Variante weitergeführt wurde (Stelle in der Reihe)
      nebeneingaenge: Object.keys(k.eingaben).slice(1),
    })),
  };
  p.ketten.push(kette);
  beruehrt(p);
  return kette;
}

/** prüft Form und Verweise; gibt eine Liste von Mängeln zurück (leer = in Ordnung) */
export function pruefeProjekt(p) {
  const m = [];
  if (p?.format !== FORMAT) m.push(`kein ${FORMAT}`);
  if (typeof p?.formatVersion !== "string" || p.formatVersion.split(".")[0] !== FORMAT_VERSION.split(".")[0]) m.push(`Formatversion ${p?.formatVersion} wird nicht unterstützt`);
  for (const k of ["ergebnisse", "knoten", "entscheidungen", "ketten"]) if (!Array.isArray(p?.[k])) m.push(`${k} fehlt`);
  if (m.length) return m;
  const ids = new Set();
  for (const x of [...p.ergebnisse, ...p.knoten, ...p.entscheidungen, ...p.ketten]) { if (ids.has(x.id)) m.push(`doppelte Kennung ${x.id}`); ids.add(x.id); }
  // Reihenfolge = Entstehung: ein Knoten darf nur Ergebnisse lesen, die vor ihm entstanden (keine Zyklen)
  const vorhanden = new Set(p.ergebnisse.filter((e) => !e.knoten).map((e) => e.id));
  for (const k of p.knoten) {
    for (const id of Object.values(k.eingaben)) if (!vorhanden.has(id)) m.push(`Knoten ${k.id} liest ${id}, das nicht vor ihm entstanden ist`);
    for (const id of k.ausgaben) { const e = ergebnis(p, id); if (!e || e.knoten !== k.id) m.push(`Knoten ${k.id}: Ausgabe ${id} passt nicht`); vorhanden.add(id); }
    if (k.gewaehlt && !k.ausgaben.includes(k.gewaehlt)) m.push(`Knoten ${k.id}: gewählte Variante ist keine seiner Ausgaben`);
  }
  for (const e of p.ergebnisse) if (e.knoten && !knoten(p, e.knoten)) m.push(`Ergebnis ${e.id}: Knoten ${e.knoten} fehlt`);
  for (const d of p.entscheidungen) if (!ENTSCHEIDUNGSARTEN[d.art]) m.push(`Entscheidung ${d.id}: unbekannte Art ${d.art}`);
  // seit 0.5.0: ein Film über Stationen verweist auf Bildergebnisse des Projekts
  for (const x of p.exporte ?? []) if (x.art === "stationen") for (const id of x.stationen ?? []) if (ergebnis(p, id)?.typ !== "IMAGE") m.push(`Film ${x.id}: Station ${id} ist kein Bild des Projekts`);
  return m;
}

export function serialisiere(p) {
  return JSON.stringify(p, (k, v) => (v instanceof Uint8ClampedArray || v instanceof Float32Array ? undefined : v), 2);
}

export function ladeProjekt(json) {
  const p = typeof json === "string" ? JSON.parse(json) : json;
  const m = pruefeProjekt(p);
  if (m.length) throw new Error(`Projekt ungültig: ${m.slice(0, 5).join("; ")}${m.length > 5 ? ` (+${m.length - 5})` : ""}`);
  return p;
}
