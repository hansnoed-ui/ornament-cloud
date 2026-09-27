// ORMA – lokaler Speicher: laufende Runde (Entwurf), Gedankenbuch, offene Schleifen (Re-Entry),
// Sicherung und Import.
// Alles bleibt auf dem Gerät (localStorage). Alle Schlüssel beginnen mit «orma:», damit ORMA nie
// Daten anderer Anwendungen derselben Adresse berührt (ORNA speichert nur «orna-intro» in sessionStorage).
// Nutzereingaben sind immer Text: sie werden hier nur geprüft und gekürzt, nie als HTML behandelt.

export const PREFIX = "orma:";
export const KEYS = {
  draft: "orma:v1:entwurf",
  book: "orma:v1:buch",
  bookDamaged: "orma:v1:buch:beschaedigt",
  last: "orma:v1:zuletzt",
  loops: "orma:v1:schleifen",
  loopsDamaged: "orma:v1:schleifen:beschaedigt",
};
export const MODES = ["paar", "allein"];
export const BACKUP_FORMAT = "orma-gedankenbuch";
export const BACKUP_VERSION = 1;
export const AUFTRAEGE = ["beispiel", "einwand", "gestaltung"];
export const STEPS = ["namen", "drehen", "wiedersehen", "lesen", "wahl", "antwort-a", "offen", "uebergabe", "antwort-b", "aufdecken", "weiterdenken", "karte"];
const MAX_TEXT = 4000, MAX_NAME = 40;

export function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return [...b].map(x => x.toString(16).padStart(2, "0")).join("");
}

const str = (v, max = MAX_TEXT) => (typeof v === "string" ? v : "").slice(0, max);
const isoOr = (v, fallback) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? v : fallback);

/** Eine neue, leere Runde */
export function newRound({ names = {}, now = new Date(), mode = "paar" } = {}) {
  return {
    id: newId(),
    startedAt: now.toISOString(),
    step: "drehen",
    mode: MODES.includes(mode) ? mode : "paar",
    loopId: "",                                  // Re-Entry: offene Schleife, zu der dieser zweite Durchgang gehört
    firstAt: "",                                 // Re-Entry: Zeitpunkt des ersten Durchgangs
    names: { a: str(names.a, MAX_NAME), b: str(names.b, MAX_NAME) },
    constellationId: "",
    contentVersion: "",
    auftrag: "",
    answers: { a: { text: "", oral: false }, b: { text: "", oral: false } },
    extensions: { a: "", b: "" },
    result: { mode: "", gemeinsam: "", a: "", b: "" },
    revealed: false,
    kept: false,
  };
}

/** Prüft und vereinheitlicht eine Runde oder einen Eintrag; ungültig → null. Fremde Felder fallen weg. */
export function sanitizeRound(r) {
  if (!r || typeof r !== "object" || Array.isArray(r)) return null;
  if (typeof r.id !== "string" || !r.id || r.id.length > 64) return null;
  if (typeof r.constellationId !== "string" || r.constellationId.length > 120) return null;
  const ans = x => ({ text: str(x && x.text), oral: !!(x && x.oral === true) });
  const res = r.result && typeof r.result === "object" ? r.result : {};
  return {
    id: r.id,
    startedAt: isoOr(r.startedAt, new Date(0).toISOString()),
    step: STEPS.includes(r.step) ? r.step : "drehen",
    mode: MODES.includes(r.mode) ? r.mode : "paar",
    loopId: str(r.loopId, 64),
    firstAt: isoOr(r.firstAt, ""),
    names: { a: str(r.names && r.names.a, MAX_NAME), b: str(r.names && r.names.b, MAX_NAME) },
    constellationId: r.constellationId,
    contentVersion: str(r.contentVersion, 40),
    auftrag: AUFTRAEGE.includes(r.auftrag) ? r.auftrag : "",
    answers: { a: ans(r.answers && r.answers.a), b: ans(r.answers && r.answers.b) },
    extensions: { a: str(r.extensions && r.extensions.a), b: str(r.extensions && r.extensions.b) },
    result: {
      mode: ["gemeinsam", "positionen"].includes(res.mode) ? res.mode : "",
      gemeinsam: str(res.gemeinsam), a: str(res.a), b: str(res.b),
    },
    revealed: r.revealed === true,
    kept: r.kept === true,
  };
}

/** Eintrag im Gedankenbuch: abgeschlossene Runde, mit Speicherdatum und Favorit */
export function sanitizeEntry(e) {
  const r = sanitizeRound(e);
  if (!r || !r.constellationId) return null;
  delete r.step; delete r.revealed; delete r.kept; delete r.loopId;
  return { ...r, savedAt: isoOr(e.savedAt, r.startedAt), favorite: e.favorite === true };
}

function read(storage, key) {
  try { return storage.getItem(key); } catch { return null; }
}
function write(storage, key, value) {
  try { storage.setItem(key, value); return true; } catch { return false; }
}

// ---------- Entwurf ----------
export function loadDraft(storage) {
  const raw = read(storage, KEYS.draft);
  if (raw == null) return { draft: null };
  try {
    const d = sanitizeRound(JSON.parse(raw));
    return d ? { draft: d } : { draft: null, error: "Die unterbrochene Runde liess sich nicht lesen und wurde nicht fortgesetzt." };
  } catch {
    return { draft: null, error: "Die unterbrochene Runde liess sich nicht lesen und wurde nicht fortgesetzt." };
  }
}
export const saveDraft = (storage, round) => write(storage, KEYS.draft, JSON.stringify(round));
export const clearDraft = storage => { try { storage.removeItem(KEYS.draft); } catch { /* egal */ } };

// ---------- Gedankenbuch ----------
/**
 * Liest das Gedankenbuch. Ist es beschädigt, wird der Rohinhalt einmalig unter KEYS.bookDamaged
 * aufbewahrt (nie still verworfen); einzelne unlesbare Einträge werden übersprungen und gemeldet.
 */
export function loadBook(storage) {
  const raw = read(storage, KEYS.book);
  if (raw == null) return { entries: [] };
  let list;
  try { list = JSON.parse(raw); } catch { list = null; }
  if (!Array.isArray(list)) {
    if (read(storage, KEYS.bookDamaged) == null) write(storage, KEYS.bookDamaged, raw);
    return { entries: [], error: "Das Gedankenbuch auf diesem Gerät ist beschädigt. Der alte Inhalt wurde aufbewahrt; neue Einträge werden getrennt davon gespeichert." };
  }
  const entries = list.map(sanitizeEntry).filter(Boolean);
  if (entries.length < list.length) {
    if (read(storage, KEYS.bookDamaged) == null) write(storage, KEYS.bookDamaged, raw);
    return { entries, error: `${list.length - entries.length} Eintrag/Einträge liessen sich nicht lesen und werden nicht angezeigt. Der alte Inhalt wurde aufbewahrt.` };
  }
  return { entries };
}

export function saveBook(storage, entries) {
  return write(storage, KEYS.book, JSON.stringify(entries));
}

/** Runde ins Gedankenbuch übernehmen (neuester Eintrag zuerst) */
export function keepRound(storage, round, now = new Date()) {
  const { entries } = loadBook(storage);
  const entry = sanitizeEntry({ ...round, savedAt: now.toISOString(), favorite: false });
  if (!entry) return { ok: false };
  const rest = entries.filter(e => e.id !== entry.id);
  return { ok: saveBook(storage, [entry, ...rest]), entry };
}

export function setFavorite(storage, id, favorite) {
  const { entries } = loadBook(storage);
  return saveBook(storage, entries.map(e => (e.id === id ? { ...e, favorite: !!favorite } : e)));
}

export function deleteEntry(storage, id) {
  const { entries } = loadBook(storage);
  return saveBook(storage, entries.filter(e => e.id !== id));
}

/** Alle ORMA-Einträge löschen: Gedankenbuch und offene Schleifen (samt aufbewahrter beschädigter Fassungen) */
export function deleteAllEntries(storage) {
  try { for (const k of [KEYS.book, KEYS.bookDamaged, KEYS.loops, KEYS.loopsDamaged]) storage.removeItem(k); return true; } catch { return false; }
}

// ---------- Offene Schleifen (Re-Entry) ----------
// Erster Durchgang allein: Konstellation, Auftrag, Antwort und Zeitpunkt. Bringt das Rad dieselbe
// Konstellation wieder, folgt der zweite Durchgang; danach ist die Schleife geschlossen.
export function sanitizeLoop(l) {
  if (!l || typeof l !== "object" || Array.isArray(l)) return null;
  if (typeof l.id !== "string" || !l.id || l.id.length > 64) return null;
  if (typeof l.constellationId !== "string" || !l.constellationId || l.constellationId.length > 120) return null;
  if (!AUFTRAEGE.includes(l.auftrag)) return null;
  return { id: l.id, constellationId: l.constellationId, contentVersion: str(l.contentVersion, 40), auftrag: l.auftrag, text: str(l.text), at: isoOr(l.at, new Date(0).toISOString()) };
}

export function loadLoops(storage) {
  const raw = read(storage, KEYS.loops);
  if (raw == null) return { loops: [] };
  let list;
  try { list = JSON.parse(raw); } catch { list = null; }
  if (!Array.isArray(list)) {
    if (read(storage, KEYS.loopsDamaged) == null) write(storage, KEYS.loopsDamaged, raw);
    return { loops: [], error: "Die offenen Schleifen auf diesem Gerät sind beschädigt. Der alte Inhalt wurde aufbewahrt." };
  }
  return { loops: list.map(sanitizeLoop).filter(Boolean) };
}
export const saveLoops = (storage, loops) => write(storage, KEYS.loops, JSON.stringify(loops));

/** Älteste offene Schleife zu einer Konstellation, oder null */
export function openLoopFor(storage, constellationId) {
  return loadLoops(storage).loops.filter(l => l.constellationId === constellationId).sort((a, b) => (a.at < b.at ? -1 : 1))[0] || null;
}

/** Ersten Durchgang als offene Schleife speichern (einmal je Runde) */
export function openLoop(storage, round, now = new Date()) {
  const { loops } = loadLoops(storage);
  if (loops.some(l => l.id === round.id)) return { ok: true, loop: loops.find(l => l.id === round.id) };
  const loop = sanitizeLoop({ id: round.id, constellationId: round.constellationId, contentVersion: round.contentVersion, auftrag: round.auftrag, text: round.answers.a.text, at: now.toISOString() });
  if (!loop) return { ok: false };
  return { ok: saveLoops(storage, [...loops, loop]), loop };
}

export function closeLoop(storage, id) {
  const { loops } = loadLoops(storage);
  return saveLoops(storage, loops.filter(l => l.id !== id));
}

// ---------- Sicherung und Import ----------
export function makeBackup(entries, now = new Date(), loops = []) {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), entries, loops };
}

/**
 * Prüft eine Sicherungsdatei und fügt ihre Einträge hinzu. Vorhandene Einträge (gleiche ID) werden
 * nie überschrieben, sondern übersprungen. Ergebnis: neue Gesamtliste und Zählung.
 */
export function mergeBackup(text, existing, existingLoops = []) {
  let data;
  try { data = JSON.parse(text); } catch { return { error: "Die Datei ist keine lesbare ORMA-Sicherung." }; }
  if (!data || data.format !== BACKUP_FORMAT || !Array.isArray(data.entries)) return { error: "Die Datei ist keine ORMA-Sicherung." };
  if (data.version !== BACKUP_VERSION) return { error: `Diese Sicherung hat ein unbekanntes Format (Version ${String(data.version).slice(0, 10)}).` };
  const have = new Set(existing.map(e => e.id));
  const added = [];
  let skipped = 0, invalid = 0;
  for (const raw of data.entries) {
    const e = sanitizeEntry(raw);
    if (!e) { invalid += 1; continue; }
    if (have.has(e.id)) { skipped += 1; continue; }
    have.add(e.id);
    added.push(e);
  }
  const entries = [...existing, ...added].sort((x, y) => (y.savedAt > x.savedAt ? 1 : y.savedAt < x.savedAt ? -1 : 0));
  // offene Schleifen (ältere Sicherungen haben keine): ebenfalls ohne Überschreiben
  const haveLoops = new Set(existingLoops.map(l => l.id));
  const loopsAdded = [];
  for (const raw of Array.isArray(data.loops) ? data.loops : []) {
    const l = sanitizeLoop(raw);
    if (!l) { invalid += 1; continue; }
    if (haveLoops.has(l.id)) { skipped += 1; continue; }
    haveLoops.add(l.id);
    loopsAdded.push(l);
  }
  return { entries, added: added.length, skipped, invalid, loops: [...existingLoops, ...loopsAdded], loopsAdded: loopsAdded.length };
}

/** Kleine Einstellungen (Namen, zuletzt gezeigte Konstellation) */
export const loadText = (storage, key) => read(storage, key);
export const saveText = (storage, key, value) => write(storage, key, value);
