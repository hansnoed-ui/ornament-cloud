// «Die Stadt, die weitergeht» – das Modell. Reine Rechnung, kein Zeichnen, kein DOM: läuft im Browser und in den Tests.
// Ein fester Zeitschritt (1 Sekunde Stadtzeit), ein Startwert, Zufall nur über zufall(): Jede Ziehung hängt an einem eigenen Schlüssel
// (Kanal, Tag, Figur, Zähler), damit zusätzliche Ziehungen in einem Vergleichszweig die übrigen Ereignisse nicht verschieben.
// Der ganze Zustand liegt in stadt.z (einfache Daten, klonbar); stadt.r hält nur abgeleitete Hilfen (Graph, jev-Tabelle).
import { KNOTEN, KANTEN, KANTE, ORTE, BANK, BAENKE, WOHNUNGEN, VERBINDUNG, KORRIDORE, HALT_S, AMPEL_S, ZEBRA_S, X_AMPEL, X_ZEBRA,
  bedingungen, verfuegbar, ampelZeiten, tempoHaupt, spurenHaupt, BREITE } from "./stadtplan.js?v=1";
import * as F from "./fragen.js?v=1";

export const DT = 1;                        // Sekunden Stadtzeit je Schritt
export const TAG_DAUER = 16 * 3600;         // 06.00 bis 22.00 Uhr; die Nacht wird übersprungen
export const START = 1.5 * 3600;            // der Lauf beginnt am ersten Tag um 07.30 Uhr
export const FREI_ZEIT = 55;                // Fahrt über die Hauptstrasse bei freier Strasse (Tempo 50, Ampel), Sekunden
export const uhr = (t) => { const m = Math.floor(t / 60) + 360; return `${String(Math.floor(m / 60)).padStart(2, "0")}.${String(m % 60).padStart(2, "0")}`; };

// ---------- Zufall ----------
const K = { passant: 17, figur: 1, programm: 2, pendelZahl: 3, pendelZeit: 4, pendelWahl: 5, route: 6, wahl: 7, begegnung: 8, verweilen: 9, befragung: 10, entdecken: 11, teilnahme: 12, spur: 13, gewohnheit: 14, tageslage: 15, haustuer: 16 };
/** gleichverteilte Zahl in [0, 1) aus Startwert und bis zu fünf ganzen Schlüsseln (Hash, kein fortlaufender Strom) */
export function zufall(seed, a, b = 0, c = 0, d = 0, e = 0) {
  let h = (seed | 0) ^ 0x9e3779b9;
  for (const x of [a, b, c, d, e]) { h = Math.imul(h ^ (x | 0), 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; }
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}
const ziehe = (probs, u) => { let s = 0; const e = Object.entries(probs); for (const [k, p] of e) { s += p; if (u < s) return k; } return e[e.length - 1][0]; };

// ---------- Figuren ----------
const NAMEN = ["Lea", "Noah", "Amira", "Luca", "Mila", "Elias", "Sara", "Jonas", "Yara", "Nico", "Ilir", "Mia", "Samuel", "Leonie", "Arben", "Chiara",
  "David", "Zoe", "Tim", "Nora", "Emil", "Aylin", "Jan", "Lina", "Matteo", "Ana", "Ruth", "Kofi", "Ida", "Marco", "Selin", "Paul", "Hanna", "Deniz",
  "Vera", "Tenzin", "Elif", "Simon", "Maja", "Ravi", "Greta", "Omar", "Julia", "Bruno", "Lou", "Mattia", "Esther", "Finn", "Nadia", "Urs",
  "Alma", "Jakob", "Fatma", "Levin", "Rosa", "Nikola", "Helen", "Dario", "Iris", "Malik", "Sofia", "Beat", "Mira", "Yusuf", "Clara", "Pablo",
  "Annika", "Theo", "Leyla", "Felix", "Edith", "Karim", "Jana", "Moritz", "Laila", "Ben", "Wanda", "Sami", "Olga", "Rico"];

export const BESCHREIBUNG = {
  pause: "braucht auf längeren Wegen eine Pause",
  rollstuhl: "unterwegs mit Rollstuhl",
  kinderwagen: "unterwegs mit Kinderwagen",
  elternteil: "holt um 16 Uhr ein Kind von der Schule ab",
  arbeit: "fährt morgens mit dem Bus zur Arbeit",
  spaet: "arbeitet bis 19 Uhr",
  knapp: "hat diesen Monat ein knappes Budget",
  neu: "ist neu im Quartier",
  interesse: "interessiert sich für das Atelier",
  hund: "geht dreimal am Tag mit dem Hund",
};

function neueFigur(seed, i, wohnung) {
  const u = (k) => zufall(seed, K.figur, i, k);
  // jede Art kommt sicher mehrmals vor (nach Nummer verteilt, nicht nach Namen); alles Übrige variiert mit dem Startwert
  const mobil = i % 16 === 3 ? "rollstuhl" : i % 9 === 5 ? "kinderwagen" : i % 7 === 2 ? "pause" : "gehend";
  const tempo = { gehend: 1.15 + u(2) * 0.4, pause: 0.85 + u(2) * 0.2, rollstuhl: 1.0 + u(2) * 0.25, kinderwagen: 1.0 + u(2) * 0.25 }[mobil];
  const arbeit = u(3) < 0.42;
  return {
    id: i, name: NAMEN[i % NAMEN.length], wohnung: wohnung.id, heim: wohnung.knoten, seite: wohnung.seite, hx: wohnung.x, hy: wohnung.y,
    hund: u(15) < 0.18, mobil, tempo, arbeit, spaet: arbeit && u(4) < 0.4 && !(mobil !== "rollstuhl" && u(5) < 0.2), elternteil: mobil !== "rollstuhl" && u(5) < 0.2, knapp: u(6) < 0.25, neu: u(7) < 0.18, interesse: u(8) < 0.5,
    x: wohnung.x, y: wohnung.y, zustand: "heim", ort: null, pfad: null, pi: 0, d: 0, wartetSeit: null, bis: 0,
    aufgabe: null, programm: [], energie: 1, mitKind: false, eilig: false,
    glaubt: null, kennt: { trampel: false, durchgang: false }, erwartet: {},
    gewohnheit: {}, bekannt: {}, ortGut: {}, erlebt: [], wege: [], befragt: [], zaehler: 0, entscheid: null, atelierEntscheid: null,
    atelier: { erreicht: 0, anwesend: 0, beteiligt: 0, gruppe: false, rolle: false, einladung: null },
  };
}

/** Wie die Figur heute gefragt wird (Schlüssel in fragen.js): Personenart je Weg, Lebenslage für den Abend */
export function personArt(f) {
  if (f.mobil === "rollstuhl") return "rollstuhl";
  if (f.mobil === "kinderwagen") return "kinderwagen";
  if (f.mitKind) return "kind";
  if (f.mobil === "pause") return "pause";
  return f.eilig ? "eilig" : "zuegig";
}
export function lebenslage(f) {
  if (f.spaet) return "spaet";
  if (f.elternteil) return "betreuung";
  if (f.knapp) return "knapp";
  if (f.neu) return "neu";
  return "zeit";
}
export function beschreibe(f) {
  const t = [];
  if (f.mobil !== "gehend") t.push(BESCHREIBUNG[f.mobil]);
  for (const k of ["elternteil", "arbeit", "spaet", "knapp", "neu", "interesse", "hund"]) if (f[k]) t.push(BESCHREIBUNG[k]);
  return t;
}

// ---------- Graph ----------
const NACHBARN = {};
for (const e of KANTEN) { (NACHBARN[e.a] ??= []).push([e, e.b]); (NACHBARN[e.b] ??= []).push([e, e.a]); }
const QUERUNG_ARTEN = new Set(["ampel", "zebra", "frei", "treppe", "rampe"]);

/** Was die Figur über eine Kante glaubt (ob es sie gibt) */
function glaubtKante(f, e) {
  switch (e.art) {
    case "ampel": return f.glaubt.ampel;
    case "zebra": return f.glaubt.zebra;
    case "frei": return !f.glaubt.zaun && (e.q !== "frei150" || !f.glaubt.zebra);
    case "treppe": return f.glaubt.treppe;
    case "rampe": return f.glaubt.rampe;
    case "deck": return f.glaubt.treppe || f.glaubt.rampe;
    case "durchgang": return f.glaubt.durchgang && f.kennt.durchgang;
    case "trampel": return f.kennt.trampel;
    default: return true;
  }
}
function tempoAuf(f, art) {
  let v = f.tempo * (f.mitKind ? 0.72 : 1);
  if (art === "treppe") v *= f.mobil === "pause" ? 0.28 : f.mitKind ? 0.3 : 0.4;
  if (art === "rampe") v *= f.mobil === "rollstuhl" ? 0.62 : f.mobil === "pause" ? 0.75 : 0.92;
  if (art === "park" || art === "trampel") v *= 0.95;
  return v;
}
function erwarteteWarte(f, e, z) {
  if (e.art === "ampel") return f.erwartet.ampel300 ?? (z ? ampelMittel(z.m) : 25);
  if (e.art === "zebra") return f.erwartet.zebra150 ?? 6;
  if (e.art === "frei") return f.erwartet.frei ?? 20;
  return 0;
}
const ampelMittel = (m) => { const a = ampelZeiten(m); return a ? (a[0] - a[2]) ** 2 / (2 * a[0]) : 0; };

/** Kürzester Weg nach dem, was die Figur glaubt. erlaubt: Menge erlaubter Querungsarten (null = alle). Ergebnis: { knoten, kanten, zeit, laenge } */
function weg(f, von, nach, erlaubt, z) {
  if (von === nach) return { knoten: [von], kanten: [], zeit: 0, laenge: 0, querung: null };
  const dist = { [von]: 0 }, vor = {}, offen = [[0, von]], fertig = new Set();
  while (offen.length) {
    let bi = 0; for (let i = 1; i < offen.length; i++) if (offen[i][0] < offen[bi][0]) bi = i;
    const [d, k] = offen.splice(bi, 1)[0];
    if (fertig.has(k)) continue;
    fertig.add(k);
    if (k === nach) break;
    for (const [e, n] of NACHBARN[k] || []) {
      if (fertig.has(n)) continue;
      if (e.art === "tuer" && n !== nach && k !== von) continue;
      if (!glaubtKante(f, e)) continue;
      if (QUERUNG_ARTEN.has(e.art) && erlaubt && !erlaubt.has(e.art === "rampe" || e.art === "treppe" ? "bruecke" : e.art === "zebra" ? "ampel" : e.art)) continue;
      if (e.art === "treppe" && F.OHNE_TREPPE.has(personArt(f))) continue;
      const nd = d + e.len / tempoAuf(f, e.art) + erwarteteWarte(f, e, z);
      if (nd < (dist[n] ?? Infinity)) { dist[n] = nd; vor[n] = [k, e]; offen.push([nd, n]); }
    }
  }
  if (!(nach in dist)) return null;
  const knoten = [nach], kanten = [];
  let k = nach, laenge = 0, querung = null;
  while (k !== von) { const [p, e] = vor[k]; kanten.unshift(e.id); knoten.unshift(p); laenge += e.len; if (QUERUNG_ARTEN.has(e.art)) querung = e.art; k = p; }
  return { knoten, kanten, zeit: dist[nach], laenge, querung };
}
/** Bezug für «Umweg»: der kürzeste denkbare Weg, als gäbe es überall eine Querung ohne Warten */
function direktZeit(f, von, nach) {
  const g = { ...f, glaubt: { ampel: true, zebra: true, zaun: false, treppe: true, rampe: true, durchgang: false }, erwartet: { ampel300: 0, zebra150: 0, frei: 0 }, kennt: { trampel: f.kennt.trampel, durchgang: false } };
  return weg(g, von, nach, null, null)?.zeit ?? 0;
}

// ---------- Stadt anlegen ----------
export const MASSNAHMEN_START = {
  spur: false, bus: false, querung: false, ruhe: false,
  verbindung: "heute", bank: "platz", durchgang: false, zwischennutzung: false,
  atelier: { gebuehr: "hoch", anmeldung: "konto", einladung: "keine", beginn: "18", rolle: "vorgegeben", programm: "leitung" },
};
export const LATENT = { gering: 0.25, mittel: 1, hoch: 3 };

/**
 * Neue Stadt. seed: Startwert; figuren: Zahl der Bewohner:innen (für schwächere Geräte kleiner);
 * latent: wie viele verschiebbare Fahrten es in der Region gibt (gering, mittel, hoch); tabelle: jev-Tabelle oder null (Ersatzregeln).
 */
export function neueStadt({ seed = 7, figuren = 72, latent = "mittel", tabelle = null, vorlauf = true } = {}) {
  const wohnungen = WOHNUNGEN;
  const fig = [];
  for (let i = 0; i < figuren; i++) fig.push(neueFigur(seed, i, wohnungen[Math.floor(zufall(seed, K.figur, i, 99) * wohnungen.length)]));
  const z = {
    seed, tag: vorlauf ? 0 : 1, t: 0, params: { figuren, latent },
    m: structuredClone(MASSNAHMEN_START),
    figuren: fig, passanten: [], naechsterPassant: 100000, autos: [], eingang: { Ho: [], Hw: [], No: [], Nw: [] }, spaeter: [], naechsteAutoId: 1,
    busse: [], naechsterBus: { o: 0, w: 0 },
    pendel: {
      wahr: { Ho: Array(16).fill(0), Hw: Array(16).fill(0), No: Array(16).fill(0), Nw: Array(16).fill(0) },
      wissen: { o: 0.08, w: 0.08 },
      aktuell: { Ho: FREI_ZEIT, Hw: FREI_ZEIT, No: 80, Nw: 80 },   // was man gerade hört und sieht (gleitendes Mittel der letzten Fahrten)
      gestern: {},          // Wahl je Richtung, Stunde und Zweck am Vortag (Anteile); heute überlegt nur ein Teil neu
    },
    zebraBesetzt: false, trampel: 0, trampelSichtbar: false,
    messung: { heute: null, tage: [] },
    protokoll: [], naechstesEreignis: 1, merker: {},
    rueckgenommen: [],
  };
  // Startwahrnehmung der Fahrzeiten: etwas über frei in den Spitzen; der Vorlauf stellt sie dann ein
  for (const k of Object.keys(z.pendel.wahr)) for (let h = 0; h < 16; h++) z.pendel.wahr[k][h] = k[0] === "N" ? 80 : FREI_ZEIT * (spitzeStunde(h) ? 1.4 : 1.05);
  for (const f of fig) f.glaubt = wirklichkeit(z.m);
  const stadt = { z, r: { tabelle: tabelleGueltig(tabelle) ? tabelle : null } };
  neuerTag(stadt);
  if (vorlauf) {
    // Vorlauf des Verkehrs: einige Tage nur Autos, bis Wahrnehmung und Wahl ungefähr eingeschwungen sind
    for (let d = 0; d < VORLAUF_VERKEHR; d++) { z.messung.heute = leereMessung(); for (let i = 0; i < TAG_DAUER; i++) schritt(stadt, true); }
    z.messung.heute = leereMessung(); neuerTag(stadt);
    // Vorlauf: ein ganzer Tag und der erste Morgen, damit Wahrnehmungen, Gewohnheiten und Bekanntschaften eine Vorgeschichte haben.
    while (z.tag === 0) schritt(stadt);
    z.messung.tage = []; z.protokoll = []; z.naechstesEreignis = 1;
    z.vorlauf = true;
  }
  while (z.t < START) schritt(stadt);
  return stadt;
}
export const VORLAUF_VERKEHR = 2;
/** Nacht im Verkehrsvorlauf: Wahrnehmung und Wahl wie am Tagesende, sonst nichts */
function verkehrNacht(z) {
  const mh = z.messung.heute;
  for (const k of Object.keys(z.pendel.wahr)) for (let h = 0; h < 16; h++) { const l = mh.reiseStunde[k][h]; if (l.length >= 4) z.pendel.wahr[k][h] = 0.55 * z.pendel.wahr[k][h] + 0.45 * (l.reduce((a, b) => a + b, 0) / l.length); }
  z.pendel.gestern = { ...z.pendel.gestern, ...(z.pendel.heute ?? {}) }; z.pendel.heute = {};
  z.autos = []; z.eingang = { Ho: [], Hw: [], No: [], Nw: [] }; z.spaeter = []; z.naechsterBus = { o: 0, w: 0 };
  z.pendel.aktuell = { Ho: FREI_ZEIT, Hw: FREI_ZEIT, No: 80, Nw: 80 };
  z.messung.heute = leereMessung();
}
export const tabelleGueltig = (t) => !!(t && t.pruefsumme === F.PRUEFSUMME && t.querung && t.fahrt && t.teilnahme);
export const quelle = (stadt) => (stadt.r.tabelle ? `jev (${stadt.r.tabelle.modell}, ${stadt.r.tabelle.stand})` : "Ersatzregeln");

/** Was die Figuren am Anfang über die Infrastruktur wissen: die Wirklichkeit */
export function wirklichkeit(m) {
  const b = bedingungen(m);
  return { ampel: b.ampel, zebra: b.zebra, zaun: !b.frei, treppe: b.treppe, rampe: b.rampe, durchgang: b.durchgang };
}
const spitzeStunde = (h) => h === 1 || h === 2 || h === 10 || h === 11 || h === 12;   // 07–09 und 16–19 Uhr (Stunden ab 06.00)

export const kopie = (stadt) => ({ z: structuredClone(stadt.z), r: stadt.r });

// ---------- jev oder Ersatzregel ----------
function querungWahrsch(stadt, lage, person) {
  const t = stadt.r.tabelle;
  const p = t?.querung[F.querungSchluessel(lage)]?.[person];
  const opt = F.querungOptionen(lage, person);
  if (p) { const w = {}; for (const o of opt) w[o] = (p[o] ?? 0) + 1e-4; return F.normiere(w); }
  return F.querungErsatz(lage, person);
}
const ZEIT_STUFEN = [["frei", 1.0], ["etwas", 1.35], ["deutlich", 2.2], ["sehr", 3.5]];
/** Fahrt: zwischen den beschriebenen Lagen linear übergeblendet (Verhältnis Fahrzeit zu freier Fahrt), damit kleine Änderungen keine Sprünge machen */
function fahrtWahrsch(stadt, verh, rest) {
  const t = stadt.r.tabelle;
  const lage = (zeit) => ({ zeit, ...rest });
  const hole = (zeit) => t?.fahrt[F.fahrtSchluessel(lage(zeit))] ?? F.fahrtErsatz(lage(zeit));
  let i = 0; while (i < ZEIT_STUFEN.length - 1 && verh > ZEIT_STUFEN[i + 1][1]) i++;
  if (i === ZEIT_STUFEN.length - 1 || verh <= ZEIT_STUFEN[0][1]) return hole(ZEIT_STUFEN[i][0]);
  const [a, va] = ZEIT_STUFEN[i], [b, vb] = ZEIT_STUFEN[i + 1], w = (verh - va) / (vb - va);
  const pa = hole(a), pb = hole(b), aus = {};
  for (const o of F.fahrtOptionen(lage(a))) aus[o] = (pa[o] ?? 0) * (1 - w) + (pb[o] ?? 0) * w;
  return F.normiere(aus);
}
function teilnahmeWahrsch(stadt, bed, lage) {
  const p = stadt.r.tabelle?.teilnahme[F.teilnahmeSchluessel(bed)]?.[lage];
  return p ? F.normiere({ ...p }) : F.teilnahmeErsatz(bed, lage);
}

// ---------- Tageslauf ----------
function neuerTag(stadt) {
  const z = stadt.z, s = z.seed;
  z.messung.heute = leereMessung();
  for (const f of z.figuren) {
    const u = (k) => zufall(s, K.programm, f.id, z.tag, k);
    f.eilig = zufall(s, K.tageslage, f.id, z.tag) < 0.28;
    f.programm = [];
    const p = (art, ort, ab, bis, zweck, extra = {}) => f.programm.push({ art, ort, ab, bis, zweck, status: "offen", ...extra });
    // morgens das Kind zur Schule bringen, nachmittags abholen (fester Termin)
    if (f.elternteil) p("bringen", "schule", 1.2 * 3600 + u(10) * 600, 2.1 * 3600, "fest");
    if (f.arbeit) p("arbeit", "haltN", (f.elternteil ? 2.2 : 1) * 3600 + u(1) * (f.elternteil ? 1800 : 5400), 4 * 3600, "fest", { zurueck: (f.spaet ? 13.2 : f.elternteil ? 8.6 : 10 + u(2) * 2.5) * 3600 });
    // kleine Besorgung am Kiosk im Norden (Zeitung, Brot), verschiebbar
    if (u(9) < 0.35) { const ab = (f.arbeit ? 11.5 + u(11) * 2 : 1 + u(11) * 5) * 3600; p("besorgung", "kiosk", ab, ab + 2 * 3600, "verschiebbar"); }
    const verschoben = f.wege.some((w) => w.tag === z.tag - 1 && w.ziel === "laden" && w.status === "aufgegeben");
    if (u(3) < (verschoben ? 0.85 : 0.55)) { const ab = (f.arbeit ? (f.spaet ? 13.4 : 12.6) : 2.5 + u(4) * 9) * 3600; p("einkauf", "laden", ab, Math.min(ab + 3 * 3600, 14.5 * 3600), "verschiebbar"); }
    if (f.elternteil) p("abholen", "schule", 9.6 * 3600, 10.2 * 3600, "fest");
    if (u(5) < (f.arbeit ? 0.3 : 0.6) && !(f.arbeit && f.spaet)) { const ort = u(6) < 0.55 ? "park" : "platz"; const ab = (f.arbeit ? 12.4 + u(7) * 2 : 1.5 + u(7) * 11) * 3600; p("freizeit", ort, ab, ab + 2 * 3600, "freizeit"); }
    if (!f.arbeit && u(12) < 0.3) { const ab = (1 + u(13) * 3) * 3600; p("freizeit", u(14) < 0.6 ? "park" : "platz", ab, ab + 3600, "freizeit"); }
    if (!f.arbeit && u(16) < 0.5) { const ab = (8.5 + u(17) * 4) * 3600; p("freizeit", u(18) < 0.5 ? "park" : "platz", ab, ab + 3600, "freizeit"); }
    // mit dem Hund: drei kurze Runden in den Park
    if (f.hund) for (const [i, h] of [[0, 0.6], [1, 6], [2, 13.8]]) { const ab = (h + u(20 + i) * 0.8) * 3600; if (!(f.arbeit && h > 1 && h < 11)) p("hund", "park", ab, ab + 3600, "freizeit"); }
    if (f.interesse) p("atelier", "atelier", 0, 0, "freizeit", { abend: true });
    f.programm.sort((a, b) => a.ab - b.ab);
  }
  for (const f of z.figuren) { f.energie = 1; f.zurueckAb = null; if (f.zustand !== "heim") { f.zustand = "heim"; f.x = f.hx; f.y = f.hy; f.pfad = null; f.aufgabe = null; f.mitKind = false; f.ort = null; f.heimweg = false; f.wartetSeit = null; } }
}
const leereMessung = () => ({
  autos: { Ho: 0, Hw: 0, No: 0, Nw: 0 }, autosStunde: { H: Array(16).fill(0), N: Array(16).fill(0) },
  reise: { H: [], N: [] }, reiseStunde: { Ho: Array(16).fill(0).map(() => []), Hw: Array(16).fill(0).map(() => []), No: Array(16).fill(0).map(() => []), Nw: Array(16).fill(0).map(() => []) },
  pendel: { auto: 0, bus: 0, spaeter: 0, auslassen: 0, nord: 0, umgeleitet: 0 }, rueckstauMax: 0,
  wege: [], warten: { ampel: [], zebra: [], frei: [] }, querungen: { ampel: 0, zebra: 0, frei: 0, treppe: 0, rampe: 0 },
  aufenthalt: {}, begegnungen: {}, zaehlung: { laden: Array(16).fill(0), querung300: Array(16).fill(0), park: Array(16).fill(0), durchgang: Array(16).fill(0) },
  atelier: null, befragung: { laden: [], haustuer: [] }, bus: { mitfahrten: 0 }, passanten: { unterwegs: 0, erreicht: 0, abgebrochen: 0 },
});

// ---------- ein Schritt ----------
export function schritt(stadt, nurVerkehr = false) {
  const z = stadt.z;
  if (z.t % 300 === 0) pendelSlot(stadt);
  if (z.t % 300 === 0 && !nurVerkehr && z.tag > 0) passantenSlot(stadt);   // im Vorlauf (Tag 0) ohne Passant:innen: sie lernen nichts
  if (z.t % 60 === 0) busFahrplan(stadt);
  autosSchritt(stadt);
  if (nurVerkehr) { z.t += DT; if (z.t >= TAG_DAUER) { z.t = 0; verkehrNacht(z); } return; }
  figurenSchritt(stadt);
  if (z.t % 10 === 0) begegnungen(stadt);
  if (z.t % 3600 === 0 && z.t > 0) stundenBlick(stadt);
  if (z.t === 10.5 * 3600) atelierEntscheid(stadt);
  z.t += DT;
  if (z.t >= TAG_DAUER) tagesende(stadt);
}
export function laufe(stadt, sekunden) { for (let i = 0; i < sekunden; i++) schritt(stadt); }
export const gesamtzeit = (z) => z.tag * TAG_DAUER + z.t;

// ---------- Autoverkehr ----------
/** mögliche Fahrten je Stunde und Richtung: [Arbeitswege, verschiebbare Fahrten]; morgens stadteinwärts nach Westen, abends nach Osten */
export function nachfrage(h, r, latent) {
  const f = LATENT[latent];
  const schwer = (h <= 2 && h >= 1 && r === "w") || (h >= 10 && h <= 12 && r === "o");
  const leicht = (h <= 2 && h >= 1) || (h >= 10 && h <= 12);
  const arbeit = schwer ? 1100 : leicht ? 450 : h === 0 || h === 3 || h === 9 || h === 13 ? 400 : 260;
  const versch = (leicht ? 400 : 160) * f;
  return [arbeit, versch];
}
function pendelSlot(stadt) {
  const z = stadt.z, s = z.seed, h = Math.floor(z.t / 3600), slot = Math.floor(z.t / 300);
  const busOft = z.m.bus ? "oft" : "selten", spitze = spitzeStunde(h) ? "ja" : "nein";
  for (const r of ["o", "w"]) {
    const [arbeit, versch] = nachfrage(h, r, z.params.latent);
    const zahl = (n, k) => { const x = (n * 300) / 3600; return Math.floor(x) + (zufall(s, K.pendelZahl, z.tag, slot, k + (r === "o" ? 0 : 7)) < x - Math.floor(x) ? 1 : 0); };
    const nA = zahl(arbeit, 1), nV = zahl(versch, 2);
    // Wahrnehmung: halb Erfahrung derselben Stunde an den Vortagen, halb die aktuelle Lage (Verkehrsmeldung, Blick auf die Strasse)
    const wahrH = 0.5 * z.pendel.wahr["H" + r][h] + 0.5 * aktuelleLage(z, "H" + r), wahrN = 0.5 * z.pendel.wahr["N" + r][h] + 0.5 * aktuelleLage(z, "N" + r);
    for (let i = 0; i < nA + nV; i++) {
      const zweck = i < nA ? "arbeit" : "verschiebbar";
      const key = i + (r === "o" ? 0 : 5000);
      const kenntN = zufall(s, K.pendelZeit, z.tag, slot, key, 9) < z.pendel.wissen[r];
      const nord = kenntN && wahrN < wahrH;
      const verh = (nord ? wahrN : wahrH) / FREI_ZEIT;
      const p = fahrtTraege(z, `${r}${h}${zweck}`, fahrtWahrsch(stadt, verh, { bus: busOft, zweck, spitze }));
      const wahl = ziehe(p, zufall(s, K.pendelWahl, z.tag, slot, key));
      const zeit = slot * 300 + zufall(s, K.pendelZeit, z.tag, slot, key) * 300;
      z.messung.heute.pendel[wahl]++;
      if (wahl === "auto") {
        const q = z.eingang[(nord ? "N" : "H") + r];
        // Rand des Modells: steht vor dem Quartier schon ein sehr langer Rückstau, weichen weitere Fahrten auf andere Strassen der Region aus
        if (q.length > RUECKSTAU_GRENZE) { z.messung.heute.pendel.umgeleitet++; continue; }
        q.push({ t0: zeit }); if (nord) z.messung.heute.pendel.nord++;
      }
      else if (wahl === "spaeter") z.spaeter.push({ t0: zeit + (h < 6 ? 2.2 : 2.6) * 3600, r });
    }
  }
  // verschobene Fahrten dieses Zeitfensters: jetzt auf der Hauptstrasse
  const jetzt = z.spaeter.filter((x) => x.t0 < z.t + 300 && x.t0 >= z.t);
  for (const x of jetzt) z.eingang["H" + x.r].push({ t0: x.t0 });
  z.spaeter = z.spaeter.filter((x) => x.t0 >= z.t + 300);
  for (const k of Object.keys(z.eingang)) z.eingang[k].sort((a, b) => a.t0 - b.t0);
}
/** Trägheit: Wer gestern so gefahren ist, fährt meist wieder so; etwa ein Drittel überlegt neu (nach jev-Tabelle oder Ersatzregel) */
export const NEU_UEBERLEGEN = 0.35;
export const RUECKSTAU_GRENZE = 150;
/** aktuelle Fahrzeit, wie man sie gerade erfährt: gleitendes Mittel der letzten Fahrten plus Wartezeit im Rückstau vor dem Quartier */
function aktuelleLage(z, key) {
  const wartend = z.eingang[key].filter((x) => x.t0 <= z.t && !x.bus).length;
  const a = key[0] === "H" ? ampelZeiten(z.m) : null;
  const kap = key[0] === "H" ? spurenHaupt(z.m) * (a ? a[1] / a[0] : 1) * 0.48 : 0.3;   // Autos je Sekunde, grob
  return z.pendel.aktuell[key] + wartend / Math.max(0.05, kap);
}
function fahrtTraege(z, key, neu) {
  const g = z.pendel.gestern[key];
  const heute = g ? F.normiere(Object.fromEntries(Object.keys(neu).map((k) => [k, (1 - NEU_UEBERLEGEN) * (g[k] ?? 0) + NEU_UEBERLEGEN * neu[k]]))) : neu;
  (z.pendel.heute ??= {})[key] = heute;
  return heute;
}
function busFahrplan(stadt) {
  const z = stadt.z, takt = z.m.bus ? 450 : 900;
  for (const r of ["o", "w"]) {
    if (z.t >= z.naechsterBus[r]) { z.eingang["H" + r].unshift({ t0: z.t, bus: true }); z.naechsterBus[r] = z.t + takt; }
  }
}
function autosSchritt(stadt) {
  const z = stadt.z, m = z.m, tg = gesamtzeit(z);
  const ampel = ampelZeiten(m), vH = tempoHaupt(m), spuren = spurenHaupt(m);
  const rot = ampel ? tg % ampel[0] >= ampel[1] : false;
  // einfahren
  for (const key of ["Ho", "Hw", "No", "Nw"]) {
    const q = z.eingang[key], k = key[0], r = key[1];
    const nSpur = k === "H" ? spuren : 1;
    let raus = 0;
    while (q.length && q[0].t0 <= z.t && raus < nSpur) {
      // freie Spur mit Platz am Anfang suchen
      let best = -1, bestGap = 0;
      for (let sp = 0; sp < nSpur; sp++) {
        let min = Infinity;
        for (const a of z.autos) if (a.k === k && a.r === r && a.spur === sp && a.s < min) min = a.s;
        if (min > bestGap) { bestGap = min; best = sp; }
      }
      if (bestGap < 12) break;
      if (m.ruhe && k === "H") { const jetzt = gesamtzeit(z), letzte = z.merker["pfoertner" + r] ?? -99; if (jetzt - letzte < 8) break; z.merker["pfoertner" + r] = jetzt; }
      const x = q.shift();
      z.autos.push({ id: z.naechsteAutoId++, k, r, spur: best, s: 0, v: k === "H" ? Math.min(vH, 10) : 6, t0: x.t0, bus: !!x.bus, halt: 0, haltBis: 0 });
      raus++;
    }
    const wartend = q.filter((x) => x.t0 <= z.t).length;
    if (k === "H" && wartend > z.messung.heute.rueckstauMax) z.messung.heute.rueckstauMax = wartend;
  }
  // folgen: je Strasse, Richtung und Spur von vorn nach hinten
  const gruppen = {};
  for (const a of z.autos) (gruppen[a.k + a.r + a.spur] ??= []).push(a);
  const weg = [];
  for (const g of Object.values(gruppen)) {
    g.sort((a, b) => b.s - a.s);
    for (let i = 0; i < g.length; i++) {
      const a = g[i], vor = g[i - 1];
      let ziel = a.k === "H" ? vH : KORRIDORE.N.tempo;
      if (a.k === "N") for (const x of KORRIDORE.N.kreuzungen) { const sx = a.r === "o" ? x : BREITE - x; if (Math.abs(a.s - sx) < 10) ziel = Math.min(ziel, 4.5); }
      if (vor) ziel = Math.min(ziel, Math.max(0, (vor.s - a.s - (vor.bus ? 14 : 7)) / 1.9));
      if (a.k === "H") {
        if (ampel && rot) ziel = Math.min(ziel, halteVor(a.s, AMPEL_S[a.r]));
        if (z.zebraBesetzt && m.querung) ziel = Math.min(ziel, halteVor(a.s, ZEBRA_S[a.r]));
        if (a.bus) {
          if (a.haltBis > z.t) ziel = 0;
          else if (a.halt === 0) { const d = HALT_S[a.r] - a.s; if (d <= -2) { a.halt = 1; busHalt(stadt, a); } else if (d < 0.5) { a.halt = 1; a.haltBis = z.t + 14; busHalt(stadt, a); ziel = 0; } else ziel = Math.min(ziel, Math.max(0, d) / 1.2 + 0.5); }
        }
      }
      a.v = Math.max(0, Math.min(ziel, a.v + 1.8 * DT));
      a.s += a.v * DT;
      if (a.s >= BREITE) weg.push(a);
    }
  }
  if (weg.length) {
    const h = Math.min(15, Math.floor(z.t / 3600)), mh = z.messung.heute;
    for (const a of weg) {
      if (!a.bus) {
        const dauer = z.t - a.t0;
        mh.reise[a.k].push(Math.round(dauer)); mh.reiseStunde[a.k + a.r][h].push(dauer);
        z.pendel.aktuell[a.k + a.r] = 0.92 * z.pendel.aktuell[a.k + a.r] + 0.08 * dauer;
        mh.autos[a.k + a.r]++; mh.autosStunde[a.k][h]++;
      }
    }
    z.autos = z.autos.filter((a) => a.s < BREITE);
  }
}
const halteVor = (s, linie) => { const d = linie - s; if (d < -1 || d > 60) return Infinity; return Math.max(0, d - 1) / 1.1; };
function busHalt(stadt, bus) {
  const z = stadt.z, ort = bus.r === "w" ? "haltN" : "haltS";
  for (const f of z.figuren) {
    if (f.zustand === "wartet_bus" && f.ort === ort) {
      f.zustand = "weg"; f.ort = null; erinnere(z, f, `steigt um ${uhr(z.t)} in den Bus (${Math.round((z.t - f.wartetSeit) / 60)} min gewartet)`, "bus");
      z.messung.heute.bus.mitfahrten++;
    }
  }
  if (bus.r === "o") for (const f of z.figuren) if (f.zustand === "weg" && f.zurueckAb && z.t >= f.zurueckAb) {
    f.zustand = "heim"; f.x = 390; f.y = 238; f.zurueckAb = null;
    const a = f.programm.find((p) => p.art === "arbeit");
    if (a) a.status = "erledigt";
    starteHeimweg(stadt, f, "hs390");
  }
}

// ---------- Figuren ----------
function figurenSchritt(stadt) {
  const z = stadt.z;
  let zebra = false;
  for (const f of z.passanten) {
    if (f.zustand === "geht") gehe(stadt, f);
    if (f.zustand === "geht" && KANTE[f.pfad?.kanten[f.pi]]?.art === "zebra") zebra = true;
  }
  if (z.passanten.some((f) => f.zustand === "fertig")) z.passanten = z.passanten.filter((f) => f.zustand !== "fertig");
  for (const f of z.figuren) {
    switch (f.zustand) {
      case "heim": naechsteAufgabe(stadt, f); break;
      case "geht": gehe(stadt, f); break;
      case "drinnen": case "verweilt": case "pause":
        f.energie = Math.min(1, f.energie + (f.zustand === "pause" ? 0.004 : 0.002) * DT);
        if (z.t >= f.bis) weiter(stadt, f);
        break;
      case "zuhause_bleibt": break;
    }
    if (f.zustand === "geht" && f.wartetSeit !== null && KANTE[f.pfad.kanten[f.pi]]?.art === "zebra") zebra = true;
    if (f.zustand === "geht" && f.wartetSeit === null && KANTE[f.pfad?.kanten[f.pi]]?.art === "zebra") zebra = true;
  }
  z.zebraBesetzt = zebra;
}

function naechsteAufgabe(stadt, f) {
  const z = stadt.z;
  if (f.zustand !== "heim") return;
  const a = f.programm.find((p) => p.status === "offen" && !p.abend && p.ab <= z.t);
  if (!a) return;
  if (z.t > a.bis) { a.status = "aufgegeben"; buche(z, f, a.ort, "aufgegeben", "keine Zeit mehr"); return; }
  if (a.art === "bringen") f.mitKind = true;
  starteAufgabe(stadt, f, a, f.heim);
}

/** Plant den Weg zu einer Aufgabe; muss die Hauptstrasse gequert werden, entscheidet die Figur nach jev-Tabelle (oder Ersatzregel) und Gewohnheit */
function starteAufgabe(stadt, f, a, von) {
  const z = stadt.z;
  a.status = "unterwegs";
  const ort = ORTE[a.ort];
  const entscheid = querungsEntscheid(stadt, f, von, a.ort, a.zweck);
  f.aufgabe = { a, ziel: a.ort, start: z.t, wahl: entscheid.wahl, lage: entscheid.lage, gewohnheit: entscheid.gewohnheit, irrtum: entscheid.irrtum, p: entscheid.p, person: entscheid.person, direkt: entscheid.direkt, warten: 0, umweg: 0 };
  if (entscheid.wahl === "auslassen") {
    if (a.art === "bringen") f.mitKind = false;
    a.status = a.zweck === "verschiebbar" ? "verschoben" : "aufgegeben";
    f.aufgabe = null;
    buche(z, f, a.ort, "aufgegeben", entscheid.grund, entscheid);
    erinnere(z, f, `lässt den Weg zum ${ORTE[a.ort]?.name ?? a.ort} heute aus (${entscheid.grund})`, "verzicht");
    if (a.art === "atelier") f.atelier.heute = "nicht_erreicht";
    if (f.passant) f.zustand = "fertig";
    return;
  }
  let ziel = a.ort;
  if (entscheid.wahl === "ersatz") { ziel = ERSATZ[a.ort]?.(z) ?? a.ort; f.aufgabe.ziel = ziel; }
  const p = entscheid.wege[entscheid.wahl] ?? weg(f, von, ORTE[ziel]?.knoten ?? ziel, null, z);
  if (!p) { a.status = "aufgegeben"; f.aufgabe = null; buche(z, f, a.ort, "aufgegeben", "kein Weg bekannt"); if (f.passant) f.zustand = "fertig"; return; }
  f.aufgabe.umweg = Math.max(0, p.laenge - (entscheid.direktLaenge ?? p.laenge));
  losgehen(f, p);
  if (ort && ziel !== a.ort) erinnere(z, f, `geht zum ${ORTE[ziel].name} statt zum ${ort.name}`, "ersatz");
}

// ---------- Passant:innen ----------
// Menschen von ausserhalb, die durch das Quartier gehen: von Rand zu Rand, von der Haltestelle zur Schule. Sie entscheiden an der Strasse
// nach denselben Regeln (jev-Tabelle oder Ersatzregel), kennen die Strasse so, wie sie beim Betreten ist, und haben kein Gedächtnis.
const RAENDER = ["hn20", "hs20", "hn580", "hs580", "nn40", "nn560", "su40", "su560", "hn390", "hs390", "schule"];
export const passantenJeStunde = (h) => (h === 1 || h === 2 ? 200 : h >= 10 && h <= 12 ? 170 : h >= 15 ? 50 : h >= 13 ? 90 : 120);
function passantenSlot(stadt) {
  const z = stadt.z, s = z.seed, slot = Math.floor(z.t / 300), h = Math.floor(z.t / 3600);
  const x = (passantenJeStunde(h) * 300) / 3600, n = Math.floor(x) + (zufall(s, K.passant, z.tag, slot, 0) < x - Math.floor(x) ? 1 : 0);
  for (let i = 1; i <= n; i++) {
    const u = (k) => zufall(s, K.passant, z.tag, slot, i * 16 + k);
    const von = RAENDER[Math.floor(u(1) * RAENDER.length)];
    let nach = RAENDER[Math.floor(u(2) * RAENDER.length)];
    if (nach === von || (von.startsWith("h") && nach.startsWith("h") && von.slice(2) === nach.slice(2))) nach = von.startsWith("s") || von.startsWith("hs") ? "nn40" : "su560";
    const r = u(3);
    const mobil = r < 0.05 ? "rollstuhl" : r < 0.14 ? "kinderwagen" : r < 0.24 ? "pause" : "gehend";
    const k = KNOTEN[von];
    const f = {
      id: z.naechsterPassant++, passant: true, name: "Passant:in", mobil, tempo: mobil === "gehend" ? 1.15 + u(4) * 0.45 : 0.9 + u(4) * 0.3,
      heim: von, seite: k.y < 210 ? "n" : "s", hx: k.x, hy: k.y, x: k.x, y: k.y, zustand: "geht", eilig: u(5) < 0.35, mitKind: mobil === "gehend" && u(6) < 0.1,
      glaubt: wirklichkeit(z.m), kennt: { trampel: false, durchgang: false }, erwartet: {}, gewohnheit: {}, wege: [], erlebt: [], zaehler: 0, energie: 1,
      wartetSeit: null, pfad: null, pi: 0, d: 0, aufgabe: null, heimweg: false,
    };
    z.passanten.push(f);
    z.messung.heute.passanten.unterwegs++;
    starteAufgabe(stadt, f, { art: "durchgang", ort: nach, ab: z.t, bis: z.t + 3600, zweck: "fest", status: "offen" }, von);
  }
}
/** Ersatzziele auf der eigenen Strassenseite */
const ERSATZ = {
  laden: () => "kiosk",
  kiosk: () => "laden",
  park: () => "platz",
  platz: (z) => (z.m.zwischennutzung ? "zwischen" : "park"),
};
const ersatzMoeglich = (z, f, ort) => !!ERSATZ[ort] && ORTE[ERSATZ[ort](z)].seite === f.seite && (!ORTE[ERSATZ[ort](z)].nur || z.m[ORTE[ERSATZ[ort](z)].nur]);

function querungsEntscheid(stadt, f, von, ziel, zweck, heimweg = false) {
  const z = stadt.z;
  const nach = ORTE[ziel]?.knoten ?? ziel;
  const seiteVon = KNOTEN[von].y < 210 ? "n" : "s", seiteNach = KNOTEN[nach].y < 210 ? "n" : "s";
  if (seiteVon === seiteNach) return { wahl: "gleich", wege: { gleich: weg(f, von, nach, null, z) }, lage: null };
  const direkt = direktZeit(f, von, nach);
  const direktLaenge = weg({ ...f, glaubt: { ampel: true, zebra: true, zaun: false, treppe: true, rampe: true, durchgang: false }, kennt: { trampel: f.kennt.trampel, durchgang: false } }, von, nach, null, null)?.laenge;
  const wege = { eben: weg(f, von, nach, new Set(["ampel"]), z), bruecke: weg(f, von, nach, new Set(["bruecke"]), z), frei: weg(f, von, nach, new Set(["frei"]), z) };
  const extra = (w) => (w ? w.zeit - direkt : Infinity);
  const stufe = (x) => (x < 60 ? "kurz" : x < 180 ? "mittel" : "lang");
  const person = personArt(f);
  const lage = {
    eben: wege.eben ? stufe(extra(wege.eben)) : "keine",
    bruecke: !wege.bruecke ? "keine" : f.glaubt.treppe ? "treppe" : extra(wege.bruecke) < 180 ? "rampe_mittel" : "rampe_lang",
    frei: !wege.frei ? "nein" : verkehrDicht(z) ? "dicht" : "ruhig",
    zweck: heimweg ? "fest" : zweck,
    ersatz: !heimweg && zweck !== "fest" && ersatzMoeglich(z, f, ziel) ? "ja" : "nein",
  };
  let p = querungWahrsch(stadt, lage, person);
  if (heimweg) { delete p.auslassen; delete p.ersatz; p = Object.keys(p).length ? F.normiere(p) : { eben: 1 }; }
  // Gewohnheit: wer denselben Weg schon oft gleich gegangen ist, prüft nicht jedes Mal neu
  const g = f.gewohnheit[ziel];
  const u = zufall(z.seed, K.wahl, f.id, z.tag, f.zaehler++);
  let wahl, ausGewohnheit = false;
  if (g && p[g.wahl] !== undefined && zufall(z.seed, K.gewohnheit, f.id, z.tag, f.zaehler) < g.staerke) { wahl = g.wahl; ausGewohnheit = true; }
  else wahl = ziehe(p, u);
  if (!wege[wahl] && wahl !== "ersatz" && wahl !== "auslassen") wahl = Object.keys(wege).find((k) => wege[k]) ?? "auslassen";
  const grund = wahl !== "auslassen" ? null
    : lage.eben === "keine" && lage.bruecke === "keine" ? "keine Querung"
    : lage.bruecke === "treppe" && F.OHNE_TREPPE.has(person) && lage.eben === "keine" ? "nur Treppen"
    : lage.bruecke.startsWith("rampe") && lage.eben === "keine" ? "Umweg über die Rampe"
    : lage.eben === "lang" || lage.eben === "mittel" ? "Umweg oder Wartezeit" : f.eilig ? "keine Zeit" : "anderes";
  const w = wirklichkeit(z.m), irrtum = Object.keys(w).some((k) => f.glaubt[k] !== w[k]);
  // für die Begleitansicht: wie zuletzt über die Hauptstrasse entschieden wurde (Lage, Wahrscheinlichkeiten, Wahl)
  f.entscheid = { tag: z.tag, t: z.t, ziel, lage, person, p, wahl, gewohnheit: ausGewohnheit, irrtum, heimweg, quelle: stadt.r.tabelle ? "jev" : "ersatz" };
  return { wahl, wege, lage, person, p, gewohnheit: ausGewohnheit, direkt, direktLaenge, grund, irrtum };
}
function verkehrDicht(z) {
  let n = 0; for (const a of z.autos) if (a.k === "H" && !a.bus) n++;
  return n > 20 * spurenHaupt(z.m);
}

function losgehen(f, p) {
  f.pfad = p; f.pi = 0; f.d = 0; f.wartetSeit = null; f.zustand = "geht";
  const k = KNOTEN[p.knoten[0]]; f.x = k.x; f.y = k.y;
  if (!p.kanten.length) f.d = Infinity;
}

function gehe(stadt, f) {
  const z = stadt.z;
  const p = f.pfad;
  if (f.pi >= p.kanten.length) return angekommen(stadt, f);
  const e = KANTE[p.kanten[f.pi]];
  const von = p.knoten[f.pi], nach = p.knoten[f.pi + 1];
  // am Anfang einer Kante: gibt es sie wirklich? muss gewartet werden?
  if (f.d === 0) {
    const b = bedingungen(z.m);
    if (!verfuegbar(e, b)) return ueberraschung(stadt, f, e, von);
    if (QUERUNG_ARTEN.has(e.art) && e.art !== "treppe" && e.art !== "rampe") {
      if (f.wartetSeit === null) f.wartetSeit = z.t;
      if (!darfQueren(z, e, f)) {
        if (e.art === "frei" && z.t - f.wartetSeit > (f.eilig ? 70 : 110)) return gibFreiAuf(stadt, f, von);
        return;
      }
      const w = z.t - f.wartetSeit;
      z.messung.heute.warten[e.art].push(w); z.messung.heute.querungen[e.art]++;
      if (f.aufgabe) f.aufgabe.warten += w;
      const key = e.art === "ampel" ? "ampel300" : e.art === "zebra" ? "zebra150" : "frei";
      f.erwartet[key] = f.erwartet[key] === undefined ? w : 0.6 * f.erwartet[key] + 0.4 * w;
      if (w > 90) erinnere(z, f, `wartet ${Math.round(w)} s an der ${e.art === "ampel" ? "Ampel" : e.art === "zebra" ? "Querung" : "Strasse"}`, "warten");
      f.wartetSeit = null;
      if (e.art === "ampel") z.messung.heute.zaehlung.querung300[Math.floor(z.t / 3600)]++;
    }
    if (e.art === "treppe" || e.art === "rampe") z.messung.heute.querungen[e.art] += e.id.startsWith("rm") || e.id.endsWith("rmn") || e.id.endsWith("rms") ? 0.25 : 0.5;
    if (e.art === "deck") z.messung.heute.zaehlung.querung300[Math.floor(z.t / 3600)]++;
    if (e.art === "durchgang") z.messung.heute.zaehlung.durchgang[Math.floor(z.t / 3600)] += 0.5;
    if (e.art === "trampel") { z.trampel++; if (!z.trampelSichtbar && z.trampel >= 25) { z.trampelSichtbar = true; protokolliere(z, "entstehung", "Über die Wiese im Park zeichnet sich ein Trampelpfad ab.", { mechanismus: "Figuren, die die Abkürzung kennen, nehmen sie; wer den Pfad sieht, lernt ihn eher kennen.", frage: "Soll daraus ein Weg werden – und wer entscheidet das?", belege: { benutzungen: z.trampel } }); } }
  }
  // gehen
  let v = tempoAuf(f, e.art);
  if (f.energie < 0.25) v *= 0.65;
  f.d += v * DT;
  f.energie = Math.max(0, f.energie - DT * (f.mobil === "pause" ? 0.0013 : 0.0005) * (e.art === "treppe" ? 3 : e.art === "rampe" ? 1.8 : 1));
  const a = KNOTEN[von], b2 = KNOTEN[nach];
  const q = Math.min(1, f.d / e.len);
  f.x = a.x + (b2.x - a.x) * q; f.y = a.y + (b2.y - a.y) * q;
  if (f.d >= e.len) {
    f.d = 0; f.pi++;
    beobachte(stadt, f, nach);
    if (f.energie < 0.3 && f.mobil !== "rollstuhl" && !f.passant && f.pi < p.kanten.length) {
      const bank = bankBei(z, nach);
      if (bank) { f.zustand = "pause"; f.ort = bank; f.bis = z.t + 120 + zufall(z.seed, K.verweilen, f.id, z.tag, f.zaehler++) * 120; f.aufenthaltSeit = z.t; erinnere(z, f, `macht eine Pause auf der Bank ${bankName(bank)}`, "pause"); }
      else if (!f.ohneBankGemeldet) { f.ohneBankGemeldet = true; erinnere(z, f, "müsste eine Pause machen, findet aber keine Bank", "pause"); }
    }
    if (f.pi >= p.kanten.length) angekommen(stadt, f);
  }
}
function darfQueren(z, e, f) {
  if (e.art === "ampel") { const a = ampelZeiten(z.m); const tg = gesamtzeit(z) % a[0]; return tg >= a[1] && tg < a[1] + a[2] - 4; }
  const x = KNOTEN[e.a].x;
  if (e.art === "zebra") {
    for (const a of z.autos) if (a.k === "H") { const sx = a.r === "o" ? x : BREITE - x; const d = sx - a.s; if (d > 0 && d < 18 && a.v > 1) return false; }
    return true;
  }
  // frei: eine Lücke von 60 m in beiden Richtungen
  for (const a of z.autos) if (a.k === "H") { const sx = a.r === "o" ? x : BREITE - x; const d = sx - a.s; if (d > -6 && d < 60) return false; }
  return true;
}
/** Die Wirklichkeit weicht vom Geglaubten ab: Figur lernt und plant vom aktuellen Knoten neu */
function ueberraschung(stadt, f, e, von) {
  const z = stadt.z;
  Object.assign(f.glaubt, wirklichkeit(z.m));
  erinnere(z, f, `${e.art === "ampel" ? "findet die Ampel nicht mehr vor" : e.art === "durchgang" ? "findet den Durchgang geschlossen" : e.art === "frei" ? "kommt wegen des Zauns nicht über die Strasse" : "findet die Querung nicht mehr vor"} und muss umplanen`, "ueberraschung");
  replane(stadt, f, von);
}
function gibFreiAuf(stadt, f, von) {
  const z = stadt.z;
  f.wartetSeit = null;
  erinnere(z, f, "findet keine Lücke im Verkehr und geht zur Querung", "warten");
  f.erwartet.frei = Math.max(f.erwartet.frei ?? 0, 120);
  replane(stadt, f, von, new Set(["ampel", "bruecke"]));
}
function replane(stadt, f, von, erlaubt = null) {
  const z = stadt.z;
  const ziel = f.aufgabe ? ORTE[f.aufgabe.ziel]?.knoten ?? f.aufgabe.ziel : f.heim;
  let p = weg(f, von, ziel, erlaubt, z);
  if (!p && erlaubt) p = weg(f, von, ziel, null, z);
  if (!p) {
    erinnere(z, f, "findet keinen Weg und kehrt um", "verzicht");
    if (f.aufgabe?.a) { f.aufgabe.a.status = "aufgegeben"; buche(z, f, f.aufgabe.a.ort, "aufgegeben", "kein Weg"); }
    f.aufgabe = null;
    const h = weg(f, von, f.heim, null, z) ?? weg({ ...f, glaubt: wirklichkeit(z.m) }, von, f.heim, null, z);
    if (h) { f.heimweg = true; return losgehen(f, h); }
    f.zustand = f.passant ? "fertig" : "heim"; f.x = f.hx; f.y = f.hy; return;
  }
  if (f.aufgabe) f.aufgabe.umweg += Math.max(0, p.laenge - (f.pfad.laenge - wegLaengeBis(f)));
  losgehen(f, p);
}
const wegLaengeBis = (f) => f.pfad.kanten.slice(0, f.pi).reduce((s, id) => s + KANTE[id].len, 0);

/** Was eine Figur unterwegs sieht: Querungen in der Nähe, den Durchgang, den Trampelpfad, andere, die eine Abkürzung nehmen */
function beobachte(stadt, f, knoten) {
  if (f.passant) return;
  const z = stadt.z, k = KNOTEN[knoten], w = wirklichkeit(z.m);
  if (Math.abs(k.x - X_AMPEL) < 50 && Math.abs(k.y - 210) < 40) { f.glaubt.ampel = w.ampel; f.glaubt.treppe = w.treppe; f.glaubt.rampe = w.rampe; }
  if (Math.abs(k.x - X_ZEBRA) < 50 && Math.abs(k.y - 210) < 40) f.glaubt.zebra = w.zebra;
  if (Math.abs(k.y - 210) < 30) f.glaubt.zaun = w.zaun;
  if (k.x === 150 && (k.y === 232 || k.y === 330)) {
    f.glaubt.durchgang = w.durchgang;
    if (w.durchgang && !f.kennt.durchgang) {
      const andere = z.figuren.some((g) => g !== f && g.zustand === "geht" && Math.abs(g.x - 150) < 6 && g.y > 240 && g.y < 322);
      if (zufall(z.seed, K.entdecken, f.id, z.tag, f.zaehler++) < (andere ? 0.6 : 0.3)) { f.kennt.durchgang = true; erinnere(z, f, "entdeckt den offenen Durchgang durch den Hof", "entdeckt"); }
    }
  }
  if ((knoten === "hn150" || knoten === "pn" || knoten === "ns150" || knoten === "ps") && !f.kennt.trampel) {
    if (zufall(z.seed, K.entdecken, f.id, z.tag, f.zaehler++) < (z.trampelSichtbar ? 0.35 : 0.04)) { f.kennt.trampel = true; erinnere(z, f, z.trampelSichtbar ? "sieht den Trampelpfad und nimmt ihn" : "kürzt über die Wiese ab", "entdeckt"); }
  }
}
function bankBei(z, knoten) {
  for (const b of BAENKE) if (b.knoten === knoten) return `fest:${knoten}`;
  if (BANK[z.m.bank].knoten === knoten) return "versetzbar";
  return null;
}
const bankName = (b) => (b === "versetzbar" ? "(versetzt)" : b === "fest:pz" ? "im Park" : b === "fest:pl" ? "am Platz" : "an der Haltestelle");

function angekommen(stadt, f) {
  const z = stadt.z;
  f.ohneBankGemeldet = false;
  if (f.passant) { if (!f.heimweg) z.messung.heute.passanten.erreicht++; f.zustand = "fertig"; return; }
  if (f.heimweg || !f.aufgabe) {
    f.heimweg = false; f.zustand = "heim"; f.pfad = null; f.x = f.hx; f.y = f.hy; f.ort = null;
    if (f.mitKind) { f.mitKind = false; }
    return;
  }
  const au = f.aufgabe, a = au.a;
  au.dauer = z.t - au.start;
  // Gewohnheit festigen
  if (au.lage) {
    const g = f.gewohnheit[a.ort];
    const schlecht = au.warten > 120 || au.dauer > (au.direkt ?? 0) + 300;
    if (g && g.wahl === au.wahl) g.staerke = Math.max(0, Math.min(0.9, g.staerke + (schlecht ? -0.3 : 0.2)));
    else if (!schlecht) f.gewohnheit[a.ort] = { wahl: au.wahl, staerke: 0.2, seit: z.tag };
  }
  const ziel = au.ziel;
  if (ziel === "laden") z.messung.heute.zaehlung.laden[Math.floor(z.t / 3600)]++;
  if (ziel === "park") z.messung.heute.zaehlung.park[Math.floor(z.t / 3600)]++;
  if (a.art === "arbeit") {
    f.zustand = "wartet_bus"; f.ort = "haltN"; f.wartetSeit = z.t; f.zurueckAb = a.zurueck; f.pfad = null;
    buche(z, f, "haltN", "erreicht", null);
    return;
  }
  if (a.art === "atelier") return atelierAnkunft(stadt, f);
  buche(z, f, a.ort, ziel === a.ort ? "erreicht" : "ersetzt", ziel === a.ort ? null : "Ersatzziel auf der eigenen Seite");
  a.status = "erledigt";
  f.pfad = null; f.ort = ziel;
  const u = zufall(z.seed, K.verweilen, f.id, z.tag, f.zaehler++);
  if (a.art === "einkauf") { f.zustand = "drinnen"; f.bis = z.t + 180 + u * 240; befrageAmLaden(stadt, f); }
  else if (a.art === "abholen") { f.zustand = "drinnen"; f.bis = Math.max(z.t + 60, 10 * 3600) + 120; }
  else if (a.art === "bringen") { f.zustand = "drinnen"; f.bis = z.t + 90 + u * 120; }
  else if (a.art === "besorgung") { f.zustand = "drinnen"; f.bis = z.t + 60 + u * 120; }
  else if (a.art === "hund") { f.zustand = "verweilt"; f.aufenthaltSeit = z.t; f.bis = z.t + 300 + u * 600; }
  else { f.zustand = "verweilt"; f.aufenthaltSeit = z.t; f.bis = z.t + (ziel === "park" ? 1200 + u * 2400 : 900 + u * 1800); }
}
/** nach Laden, Schule, Aufenthalt: noch bleiben? dann heim */
function weiter(stadt, f) {
  const z = stadt.z;
  if (f.zustand === "pause") {
    bucheAufenthalt(z, f, z.t - f.aufenthaltSeit);
    f.zustand = "geht"; f.ort = null; f.aufenthaltSeit = null;
    if (f.pi >= f.pfad.kanten.length) angekommen(stadt, f);
    return;
  }
  if (f.zustand === "verweilt" && f.aufenthaltSeit !== null) bucheAufenthalt(z, f, z.t - f.aufenthaltSeit);
  const a = f.aufgabe?.a;
  if (f.zustand === "drinnen" && a?.art === "abholen") { f.mitKind = true; erinnere(z, f, "holt das Kind ab", "abholen"); }
  if (f.zustand === "drinnen" && a?.art === "bringen") f.mitKind = false;
  if (f.zustand === "drinnen" && (a?.art === "einkauf" || a?.art === "besorgung")) {
    // vor dem Laden oder am Kiosk stehen bleiben? hängt an Lärm, Zeit und guten Erfahrungen an diesem Ort
    const ort = f.aufgabe.ziel;
    const pBleib = Math.min(0.85, 0.2 + (f.ortGut[ort] ?? 0) - laerm(z, ort) * 0.25 - (f.eilig ? 0.15 : 0));
    if (zufall(z.seed, K.verweilen, f.id, z.tag, f.zaehler++) < pBleib) { f.zustand = "verweilt"; f.aufenthaltSeit = z.t; f.bis = z.t + 240 + zufall(z.seed, K.verweilen, f.id, z.tag, f.zaehler++) * 900; return; }
  }
  if (f.zustand === "verweilt" && a?.art === "atelier") atelierEnde(z, f);
  const von = ORTE[f.ort]?.knoten ?? f.ort ?? f.heim;
  f.ort = null; f.aufenthaltSeit = null;
  starteHeimweg(stadt, f, von);
}
function starteHeimweg(stadt, f, von) {
  const z = stadt.z;
  f.aufgabe = null;
  const e = querungsEntscheid(stadt, f, von, f.heim, "fest", true);
  const p = e.wege[e.wahl] ?? weg(f, von, f.heim, null, z) ?? weg({ ...f, glaubt: wirklichkeit(z.m) }, von, f.heim, null, z);
  f.heimweg = true;
  if (!p) { f.zustand = "heim"; f.x = f.hx; f.y = f.hy; f.heimweg = false; return; }
  losgehen(f, p);
}

// ---------- Aufenthalt und Begegnungen ----------
const AUFENTHALT_ORTE = ["laden", "kiosk", "platz", "park", "haltN", "haltS", "zwischen", "atelier"];
function laerm(z, ort) {
  const o = ORTE[ort] ?? (ort === "versetzbar" ? BANK[z.m.bank] : null);
  if (!o) return 0;
  let n = 0;
  for (const a of z.autos) { const y = a.k === "H" ? 210 : 55; const x = a.r === "o" ? a.s : BREITE - a.s; if (Math.abs(o.y - y) < 60 && Math.abs(o.x - x) < 90) n++; }
  return Math.min(1, n / 10);
}
function ortVon(z, f) {
  if (f.zustand === "verweilt" || f.zustand === "drinnen") return f.ort;
  if (f.zustand === "pause") return f.ort === "versetzbar" ? "bank" : f.ort === "fest:pz" ? "park" : f.ort === "fest:pl" ? "platz" : "haltN";
  if (f.zustand === "wartet_bus") return f.ort;
  return null;
}
function begegnungen(stadt) {
  const z = stadt.z, nach = {};
  for (const f of z.figuren) { const o = ortVon(z, f); if (o) (nach[o] ??= []).push(f); }
  for (const [ort, liste] of Object.entries(nach)) {
    if (liste.length < 2) continue;
    for (let i = 0; i < liste.length; i++) for (let j = i + 1; j < liste.length; j++) {
      const a = liste[i], b = liste[j];
      const key = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}-${ort}`;
      if (z.merker.begegnet?.[key] === `${z.tag}-${Math.floor(z.t / 1800)}`) continue;
      (z.merker.begegnet ??= {})[key] = `${z.tag}-${Math.floor(z.t / 1800)}`;
      const u = zufall(z.seed, K.begegnung, Math.min(a.id, b.id) * 100 + Math.max(a.id, b.id), z.tag, Math.floor(z.t / 10));
      const kennen = (a.bekannt[b.id] ?? 0) > 0;
      const pGespraech = 0.22 + (kennen ? 0.18 : 0) + ((a.ortGut[ort] ?? 0) + (b.ortGut[ort] ?? 0)) * 0.15 - laerm(z, ort) * 0.15;
      const pStoerung = 0.05 + laerm(z, ort) * 0.2;
      const art = u < pStoerung ? "stoerung" : u < pStoerung + pGespraech ? "gespraech" : "fluechtig";
      const mb = (z.messung.heute.begegnungen[ort] ??= { fluechtig: 0, gespraech: 0, stoerung: 0 });
      mb[art]++;
      for (const [x, y] of [[a, b], [b, a]]) {
        if (art === "gespraech") {
          x.bekannt[y.id] = (x.bekannt[y.id] ?? 0) + 1; x.ortGut[ort] = Math.min(0.6, (x.ortGut[ort] ?? 0) + 0.08);
          if (x.neu && Object.values(x.bekannt).filter((n) => n >= 2).length >= 2) { x.neu = false; erinnere(z, x, "kennt inzwischen ein paar Leute im Quartier", "bekannt"); }
        }
        if (art === "stoerung") x.ortGut[ort] = Math.max(-0.4, (x.ortGut[ort] ?? 0) - 0.1);
      }
      if (art === "gespraech") { erinnere(z, a, `kommt ${ortText(ort)} mit ${b.name} ins Gespräch`, "begegnung"); erinnere(z, b, `kommt ${ortText(ort)} mit ${a.name} ins Gespräch`, "begegnung"); }
      if (art === "stoerung") { erinnere(z, a, `wird ${ortText(ort)} gestört (Lärm oder Gedränge)`, "begegnung"); }
      treffpunkt(z, ort);
    }
  }
}
const ortText = (o) => ({ schule: "vor der Schule", laden: "vor dem Laden", kiosk: "am Kiosk", platz: "auf dem Platz", park: "im Park", haltN: "an der Haltestelle", haltS: "an der Haltestelle", zwischen: "in der Zwischennutzung", atelier: "im Atelier", bank: "auf der versetzten Bank" }[o] ?? o);
function treffpunkt(z, ort) {
  // ein Ort wird zum Treffpunkt, wenn sich dort an drei Tagen nacheinander mehrere Paare unterhalten, die sich schon kennen
  const tage = [...z.messung.tage.slice(-2).map((t) => t.begegnungen[ort]?.gespraech ?? 0), z.messung.heute.begegnungen[ort]?.gespraech ?? 0];
  if (tage.length === 3 && tage.every((n) => n >= 3) && !z.merker["treffpunkt-" + ort]) {
    z.merker["treffpunkt-" + ort] = z.tag;
    protokolliere(z, "entstehung", `${ORTE[ort]?.name ?? "Die versetzte Bank"} ist zum Treffpunkt geworden: an drei Tagen nacheinander kamen dort mehrere Leute ins Gespräch.`, { mechanismus: "Gute Gespräche an einem Ort machen das Verweilen dort wahrscheinlicher; Lärm und Störungen wirken dagegen.", frage: "Wem nützt dieser Treffpunkt – und wer kommt hier gar nicht vorbei?", belege: { ort, gespraeche: tage } });
  }
}
function bucheAufenthalt(z, f, dauer) {
  const o = ortVon(z, f) ?? f.ort; if (!o || dauer <= 0) return;
  z.messung.heute.aufenthalt[o] = (z.messung.heute.aufenthalt[o] ?? 0) + dauer / 60;
}

// ---------- Atelier: Offener Abend (Kapitel D) ----------
function atelierBedingungen(z, f) {
  const m = z.m.atelier;
  let einladung = m.einladung === "atelier" ? "atelier" : "keine";
  // Einladung durch Bekannte entsteht aus Begegnungen: jemand, mit dem f schon zweimal gesprochen hat, geht regelmässig hin
  const einlader = z.figuren.find((g) => g !== f && (f.bekannt[g.id] ?? 0) >= 2 && g.atelier.anwesend >= 2 && g.atelier.heute === "geht");
  if (einlader) einladung = "bekannte";
  return { bed: { gebuehr: m.gebuehr, anmeldung: m.anmeldung, einladung, beginn: m.beginn, rolle: m.rolle }, einlader };
}
function atelierEntscheid(stadt) {
  const z = stadt.z, m = z.m.atelier;
  const beginn = m.beginn === "18" ? 12 * 3600 : 13.5 * 3600;
  const abend = { beginn: m.beginn, bedingungen: { ...m }, eingeladen: 0, wahl: {}, erreicht: 0, zuSpaet: 0, anwesend: 0, beteiligt: 0, mitbestimmend: 0, nachLage: {} };
  z.messung.heute.atelier = abend;
  // erst die Regelmässigen, dann die übrigen: so wissen Eingeladene, ob die einladende Person geht
  const reihe = z.figuren.filter((f) => f.interesse).sort((a, b) => b.atelier.anwesend - a.atelier.anwesend || a.id - b.id);
  for (const f of z.figuren) f.atelier.heute = null;
  for (const f of reihe) {
    const { bed, einlader } = atelierBedingungen(z, f);
    const lage = lebenslage(f);
    let p = teilnahmeWahrsch(stadt, bed, lage);
    if (f.atelier.rolle && bed.rolle === "vorgegeben") p = F.normiere({ ...p, einbringen: p.einbringen * 0.6 });
    const wahl = ziehe(p, zufall(z.seed, K.teilnahme, f.id, z.tag));
    f.atelierEntscheid = { tag: z.tag, bed, lage, p, wahl, einlader: einlader?.id ?? null, quelle: stadt.r.tabelle ? "jev" : "ersatz" };
    abend.wahl[wahl] = (abend.wahl[wahl] ?? 0) + 1;
    (abend.nachLage[lage] ??= { gefragt: 0, geht: 0, verhindert: 0, anderes: 0 }).gefragt++;
    f.atelier.einladung = bed.einladung === "bekannte" ? einlader.id : null;
    if (bed.einladung !== "keine") abend.eingeladen++;
    if (wahl === "verhindert" || wahl === "anderes") { abend.nachLage[lage][wahl]++; f.atelier.heute = wahl; erinnere(z, f, wahl === "verhindert" ? "würde gern ins Atelier, aber die Bedingungen halten ab" : "geht heute nicht ins Atelier (anderes vor)", "atelier"); continue; }
    abend.nachLage[lage].geht++;
    f.atelier.heute = "geht"; f.atelier.wahl = wahl;
    const a = f.programm.find((x) => x.art === "atelier");
    if (!a) continue;
    // losgehen etwa eine Viertelstunde vor Beginn; wer bis 19 Uhr arbeitet, kommt erst um 19.15 heim
    a.ab = Math.max(beginn - 900, f.spaet ? 13.3 * 3600 : 0); a.bis = beginn + 7200 - 600; a.abend = false;
  }
}
function atelierAnkunft(stadt, f) {
  const z = stadt.z, abend = z.messung.heute.atelier, m = z.m.atelier;
  const beginn = m.beginn === "18" ? 12 * 3600 : 13.5 * 3600;
  f.pfad = null; f.ort = "atelier"; f.aufgabe.a.status = "erledigt";
  f.atelier.erreicht++; abend.erreicht++;
  if (z.t > beginn + 7200 - 900) {
    abend.zuSpaet++; buche(z, f, "atelier", "erreicht", "zu spät, der Abend ist fast vorbei");
    erinnere(z, f, "kommt beim Atelier an, aber der Abend ist schon fast vorbei", "atelier");
    f.zustand = "verweilt"; f.aufenthaltSeit = z.t; f.bis = z.t + 60; return;
  }
  buche(z, f, "atelier", "erreicht", null);
  f.atelier.anwesend++; abend.anwesend++;
  const einbringen = f.atelier.wahl === "einbringen";
  if (einbringen) {
    f.atelier.beteiligt++; abend.beteiligt++;
    if (m.rolle === "vorgegeben" && !f.atelier.rolle) {
      f.atelier.rolle = true;
      protokolliere(z, "szene", `Erfundene Modellszene: Die Leitung bietet ${f.name} eine Rolle an, so wie sie sich jemanden aus dem Quartier vorstellt. ${f.name} spielt mit; ob beim nächsten Mal wieder, ist offen.`,
        { perspektive: true, mechanismus: "Mit vorgegebener Rolle bringt sich die Figur beim nächsten Abend seltener aktiv ein (Annahme des Modells).", frage: "Wer beschreibt hier wen – und kann die Figur die Beschreibung ändern?", belege: { figur: f.id }, anregung: "angeregt von Motiven aus Hanif Kureishis «The Buddha of Suburbia» (1990); kein Zitat" });
    }
    if (m.programm === "gruppe" && f.atelier.beteiligt >= 2 && !f.atelier.gruppe) {
      f.atelier.gruppe = true;
      protokolliere(z, "teilnahme", `${f.name} ist jetzt in der Programmgruppe des Ateliers und bestimmt mit, wie die Abende aussehen.`, { belege: { figur: f.id } });
    }
  }
  if (f.atelier.gruppe && m.programm === "gruppe") abend.mitbestimmend++;
  const dauer = f.atelier.wahl === "vorbei" ? 900 : beginn + 7200 - z.t;
  f.zustand = "verweilt"; f.aufenthaltSeit = z.t; f.bis = z.t + Math.max(300, dauer);
  erinnere(z, f, `ist im Atelier (${einbringen ? "bringt sich ein" : f.atelier.wahl === "rand" ? "bleibt eher am Rand" : "schaut kurz vorbei"}${f.atelier.einladung !== null ? `, eingeladen von ${z.figuren[f.atelier.einladung].name}` : ""})`, "atelier");
}
function atelierEnde(z, f) { f.atelier.heute = null; }
/** Die Programmgruppe entscheidet am Ende des Tages: Mitbestimmung ändert Bedingungen */
function programmgruppe(z) {
  const m = z.m.atelier;
  if (m.programm !== "gruppe") return;
  const gruppe = z.figuren.filter((f) => f.atelier.gruppe);
  if (gruppe.length < 2) return;
  if (m.beginn === "18" && gruppe.some((f) => f.spaet || f.elternteil)) {
    m.beginn = "1930";
    protokolliere(z, "teilnahme", "Die Programmgruppe verlegt den Offenen Abend auf 19.30 Uhr – auf Wunsch von Mitgliedern, die bis 19 Uhr arbeiten oder Kinder betreuen.", { mechanismus: "Mitbestimmung: Die Gruppe kann Bedingungen der Einrichtung ändern.", frage: "Wem passt die neue Zeit nicht mehr?", belege: { gruppe: gruppe.map((f) => f.id) } });
  }
  if (m.rolle === "vorgegeben" && gruppe.some((f) => f.atelier.rolle)) {
    m.rolle = "mitgestalten";
    protokolliere(z, "teilnahme", "Die Programmgruppe beschliesst: Wer mitspielt, gestaltet die eigene Rolle mit.", { mechanismus: "Mitbestimmung: Ein Mitglied hat die vorgegebene Rolle erlebt.", frage: "Was ändert sich für die, die nicht in der Gruppe sind?", belege: { gruppe: gruppe.map((f) => f.id) } });
  }
}

// ---------- Kurzbefragung (Beobachtungsinstrument, verändert nichts an den Figuren ausser ihrer eigenen Auskunft) ----------
const KATEGORIEN = ["kein Hindernis", "Wartezeit an der Querung", "Umweg", "Treppen oder Steigung", "Verkehr oder Lärm", "keine Zeit", "anderes"];
export { KATEGORIEN };
function kategorie(text) {
  if (!text) return "kein Hindernis";
  if (/Treppe|Rampe|Steigung/.test(text)) return /Umweg/.test(text) ? "Umweg" : "Treppen oder Steigung";
  if (/Umweg|Querung|Weg/.test(text)) return /Wartezeit/.test(text) ? "Wartezeit an der Querung" : "Umweg";
  if (/Zeit/.test(text)) return "keine Zeit";
  if (/Lärm|Verkehr|Lücke/.test(text)) return "Verkehr oder Lärm";
  return "anderes";
}
function antwortAus(f, tag) {
  const heute = f.wege.filter((w) => w.tag >= tag - 2);
  const verzicht = heute.find((w) => w.status === "aufgegeben");
  if (verzicht) return { kategorie: kategorie(verzicht.grund), verzichtet: true };
  const lang = f.erlebt.filter((e) => e.tag >= tag - 1 && (e.art === "warten" || e.art === "ueberraschung")).length;
  if (lang) return { kategorie: "Wartezeit an der Querung", verzichtet: false };
  const ersatz = heute.find((w) => w.status === "ersetzt");
  if (ersatz) return { kategorie: "Umweg", verzichtet: false };
  return { kategorie: "kein Hindernis", verzichtet: false };
}
function befrageAmLaden(stadt, f) {
  const z = stadt.z;
  if (zufall(z.seed, K.befragung, f.id, z.tag, Math.floor(z.t / 60)) > 0.4) return;
  const a = { figur: f.id, ...antwortAus(f, z.tag), t: z.t };
  z.messung.heute.befragung.laden.push(a); f.befragt.push({ tag: z.tag, ort: "am Laden", ...a });
}
function befrageHaustuer(z) {
  // sechs zufällig gewählte Wohnungen am Abend; etwa die Hälfte macht mit
  for (let i = 0; i < 6; i++) {
    const f = z.figuren[Math.floor(zufall(z.seed, K.haustuer, z.tag, i) * z.figuren.length)];
    if (zufall(z.seed, K.haustuer, z.tag, i, 1) > 0.5 || z.messung.heute.befragung.haustuer.some((x) => x.figur === f.id)) continue;
    const a = { figur: f.id, ...antwortAus(f, z.tag), t: z.t };
    z.messung.heute.befragung.haustuer.push(a); f.befragt.push({ tag: z.tag, ort: "an der Haustür", ...a });
  }
}

// ---------- Buchführung ----------
function buche(z, f, ziel, status, grund, entscheid = null) {
  if (f.passant) { if (status === "aufgegeben") z.messung.heute.passanten.abgebrochen++; return; }
  const w = { tag: z.tag, t: z.t, figur: f.id, ziel, status, grund, wahl: f.aufgabe?.wahl ?? entscheid?.wahl ?? null, person: personArt(f), mobil: f.mobil,
    dauer: f.aufgabe ? z.t - f.aufgabe.start : 0, warten: f.aufgabe?.warten ?? 0, umweg: Math.round(f.aufgabe?.umweg ?? 0), gewohnheit: !!(f.aufgabe?.gewohnheit || entscheid?.gewohnheit), irrtum: !!(f.aufgabe?.irrtum || entscheid?.irrtum) };
  z.messung.heute.wege.push(w);
  f.wege.push(w); if (f.wege.length > 40) f.wege.shift();
}
function erinnere(z, f, text, art) {
  if (f.passant) return;
  f.erlebt.push({ tag: z.tag, t: z.t, text, art });
  if (f.erlebt.length > 16) f.erlebt.shift();
}
export function protokolliere(z, art, text, extra = {}) {
  const e = { id: z.naechstesEreignis++, tag: z.tag, t: z.t, art, text, ...extra };
  z.protokoll.push(e);
  if (z.protokoll.length > 200) z.protokoll.shift();
  return e;
}

// ---------- Beobachtungen zur vollen Stunde und am Tagesende ----------
function stundenBlick(stadt) {
  const z = stadt.z, h = Math.floor(z.t / 3600) - 1;
  const gestern = z.messung.tage.at(-1);
  // Laden: deutlich weniger Menschen als gestern zur selben Stunde (Zählung am Eingang)
  if (gestern && h >= 3 && h <= 12) {
    const a = z.messung.heute.zaehlung.laden[h], b = gestern.zaehlung.laden[h];
    if (b >= 3 && a <= b * 0.6 && !z.merker["laden-weniger-" + z.tag]) {
      z.merker["laden-weniger-" + z.tag] = true;
      const gruende = z.messung.heute.wege.filter((w) => w.ziel === "laden" && w.status !== "erreicht");
      protokolliere(z, "beobachtung", `Am Laden gehen heute weniger Menschen ein und aus: ${a} statt ${b} zwischen ${uhr(h * 3600)} und ${uhr((h + 1) * 3600)}. Die Zählung erklärt noch nicht, warum.`,
        { mechanismus: gruende.length ? `Im Modell (nicht in der Zählung): ${gruende.length} Wege zum Laden endeten heute anders – ${zusammenfassen(gruende.map((w) => w.status === "ersetzt" ? "Kiosk statt Laden" : w.grund ?? "aufgegeben"))}.` : "Im Modell: heute wollten weniger Figuren einkaufen (Tagesprogramme).", frage: "Wer fehlt in dieser Zählung – und wo ist diese Person stattdessen?", belege: { stunde: h, heute: a, gestern: b, wege: gruende.length } });
    }
  }
  // Erste volle Stunde nach einer Massnahme an der Hauptstrasse: was die Zählung zeigt (nur wenn es einen Vergleichswert von gestern gibt)
  const m = [...z.protokoll].reverse().find((e) => (e.art === "massnahme" || e.art === "ruecknahme") && e.tag === z.tag && z.t - e.t <= 3600 && z.t - e.t > 0 && ["spur", "bus", "querung", "ruhe", "verbindung"].includes(e.schluessel));
  if (m && gestern && !z.merker["erste-stunde-" + m.id]) {
    z.merker["erste-stunde-" + m.id] = true;
    const mittel = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);
    const heuteH = z.messung.heute.autosStunde.H[h], gesternH = gestern.autosStunde.H[h];
    const tHeute = mittel([...z.messung.heute.reiseStunde.Ho[h], ...z.messung.heute.reiseStunde.Hw[h]]);
    const nordHeute = z.messung.heute.reiseStunde.No[h].length + z.messung.heute.reiseStunde.Nw[h].length;
    if (tHeute !== null) protokolliere(z, "beobachtung", `Erste Stunde nach «${m.text.replace(/^Zurückgenommen: /, "").replace(/\. Nur die Massnahme.*$/, "")}»: ${heuteH} Autos über die Hauptstrasse (gestern zur selben Stunde ${gesternH}), mittlere Fahrt ${dauerText(tHeute)}; ${nordHeute} durch die Nordstrasse.`,
      { mechanismus: "Heute fahren noch fast dieselben Leute wie gestern; wer anders fährt, entscheidet nach der Erfahrung der Vortage und nach der aktuellen Lage.", frage: "Was wird sich ändern, wenn sich das herumspricht?", belege: { stunde: h, heute: heuteH, gestern: gesternH } });
  }
  // Zurückgenommene Massnahme: bleibt etwas bestehen?
  for (const r of z.rueckgenommen) if (!r.gemeldet && gesamtzeit(z) - r.zeit > 3 * 3600) {
    const fort = fortbestehend(z, r);
    if (fort.figuren.length) {
      r.gemeldet = true;
      protokolliere(z, "rueckkehr", `${r.text} ist zurückgenommen. ${fort.figuren.length === 1 ? `${z.figuren[fort.figuren[0]].name} geht` : `${fort.figuren.length} Figuren gehen`} trotzdem weiterhin zum Ersatzziel oder ${fort.figuren.length === 1 ? "lässt" : "lassen"} den Weg aus – aus Gewohnheit oder weil sie die Änderung noch nicht gesehen ${fort.figuren.length === 1 ? "hat" : "haben"}.`,
        { mechanismus: "Gewohnheiten und das, was Figuren über die Strasse glauben, bleiben im Modell bestehen, bis eigene Erfahrung sie ändert.", frage: "Was müsste geschehen, damit diese Folge wirklich aufgehoben wäre?", belege: { figuren: fort.figuren } });
    }
  }
}
const zusammenfassen = (liste) => Object.entries(liste.reduce((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {})).map(([k, n]) => `${n}× ${k}`).join(", ");

/** Was von einer zurückgenommenen Massnahme im Modell fortbesteht (für Protokoll und Rückkehrprobe):
 *  Wege seit der Rücknahme, die zum Ersatzziel führten oder ausfielen, weil die Figur es so gewohnt war oder die Änderung noch nicht gesehen hatte;
 *  Figuren, die etwas anderes glauben, als die Strasse jetzt ist; feste Gewohnheiten; das Wissen um den Schleichweg. */
export function fortbestehend(z, r) {
  const w = wirklichkeit(z.m), nach = (x) => x.tag > r.tag || (x.tag === r.tag && x.t > r.t);
  const wege = z.figuren.flatMap((f) => f.wege.filter((x) => nach(x) && (x.status === "ersetzt" || x.status === "aufgegeben") && (x.gewohnheit || x.irrtum)));
  return {
    figuren: [...new Set(wege.map((x) => x.figur))], wege: wege.length,
    irrtum: z.figuren.filter((f) => Object.keys(w).some((k) => f.glaubt[k] !== w[k])).map((f) => f.id),
    gewohnt: z.figuren.filter((f) => Object.values(f.gewohnheit).some((g) => g.staerke >= 0.4 && g.wahl !== "eben" && g.wahl !== "gleich")).map((f) => f.id),
    wie: "zum Ersatzziel oder lassen den Weg aus – aus Gewohnheit oder weil sie die Änderung noch nicht gesehen haben",
    wissenNord: { ...z.pendel.wissen }, wahr: { Hw: z.pendel.wahr.Hw[1], Ho: z.pendel.wahr.Ho[11] },
  };
}

function tagesende(stadt) {
  const z = stadt.z, mh = z.messung.heute;
  // Rest des Tages: Figuren, die noch unterwegs sind, kommen ohne weitere Messung heim
  befrageHaustuer(z);
  for (const f of z.figuren) for (const a of f.programm) if (a.status === "offen" && !a.abend && a.art !== "atelier") { a.status = "aufgegeben"; buche(z, f, a.ort, "aufgegeben", "keine Zeit mehr"); }
  // Wahrnehmung der Fahrzeiten: Mittel aus heute und früher (die Erfahrung wirkt mit einem Tag Verzögerung)
  for (const k of Object.keys(z.pendel.wahr)) for (let h = 0; h < 16; h++) {
    const l = mh.reiseStunde[k][h];
    if (l.length >= 4) z.pendel.wahr[k][h] = 0.55 * z.pendel.wahr[k][h] + 0.45 * (l.reduce((a, b) => a + b, 0) / l.length);
  }
  z.pendel.gestern = { ...z.pendel.gestern, ...(z.pendel.heute ?? {}) }; z.pendel.heute = {};
  // Wissen um den Schleichweg: wächst, wenn die Hauptstrasse in der Spitze zäh ist, und durch Weitererzählen
  for (const r of ["o", "w"]) {
    const spitze = [1, 2, 10, 11, 12].map((h) => z.pendel.wahr["H" + r][h]);
    const zaeh = Math.max(0, Math.min(1, (Math.max(...spitze) - 62) / 80));
    const w = z.pendel.wissen[r];
    const nordBesser = [1, 2, 10, 11, 12].some((h) => z.pendel.wahr["N" + r][h] < z.pendel.wahr["H" + r][h]);
    z.pendel.wissen[r] = Math.max(0.03, Math.min(0.85, nordBesser ? w + 0.18 * zaeh * (1 - w) + 0.05 * w * (1 - w) : w * 0.93));
  }
  const nordHeute = mh.autos.No + mh.autos.Nw, nordGestern = z.messung.tage.at(-1) ? z.messung.tage.at(-1).autos.No + z.messung.tage.at(-1).autos.Nw : null;
  if (nordGestern !== null && nordHeute > 200 && nordHeute > nordGestern * 1.3 && !z.merker.schleichweg) z.merker.schleichweg = z.tag, protokolliere(z, "entstehung", `Durch die Nordstrasse fuhren heute ${nordHeute} Autos, gestern ${nordGestern}. Die Wohnstrasse wird zum Schleichweg.`, { mechanismus: "Wer die Hauptstrasse in der Spitze als zäh erlebt, lernt die Nordstrasse kennen und erzählt davon.", frage: "Wer wohnt an der Nordstrasse – und wer wurde gefragt?", belege: { heute: nordHeute, gestern: nordGestern } });
  else if (nordGestern !== null && nordHeute > 200 && nordHeute > nordGestern * 1.4) protokolliere(z, "beobachtung", `Durch die Nordstrasse fuhren heute ${nordHeute} Autos, gestern ${nordGestern}.`, { belege: { heute: nordHeute, gestern: nordGestern } });
  if (nordGestern !== null && nordGestern > 200 && nordHeute < nordGestern * 0.6) protokolliere(z, "beobachtung", `Durch die Nordstrasse fuhren heute ${nordHeute} Autos, gestern ${nordGestern}.`, { belege: { heute: nordHeute, gestern: nordGestern } });
  programmgruppe(z);
  // Tagesbilanz
  const zus = tagesbilanz(z, mh);
  z.messung.tage.push(zus);
  if (z.messung.tage.length > 14) z.messung.tage.shift();
  const vorher = z.messung.tage.at(-2);
  if (vorher && zus.reiseMittel.H && vorher.reiseMittel.H && Math.abs(zus.reiseMittel.H - vorher.reiseMittel.H) / vorher.reiseMittel.H > 0.25)
    protokolliere(z, "beobachtung", `Mittlere Autofahrt über die Hauptstrasse heute ${dauerText(zus.reiseMittel.H)}, am Vortag ${dauerText(vorher.reiseMittel.H)}; ${zus.autos.H} Autos (Vortag ${vorher.autos.H}).`, { belege: { heute: zus.reiseMittel.H, vortag: vorher.reiseMittel.H } });
  // Gewohnheiten verblassen langsam, wenn sie nicht gebraucht werden
  for (const f of z.figuren) for (const [k, g] of Object.entries(f.gewohnheit)) if (!f.wege.some((w) => w.tag === z.tag && w.ziel === k)) { g.staerke *= 0.93; if (g.staerke < 0.05) delete f.gewohnheit[k]; }
  z.tag++; z.t = 0; z.merker.begegnet = {};
  z.autos = []; z.eingang = { Ho: [], Hw: [], No: [], Nw: [] }; z.spaeter = []; z.naechsterBus = { o: 0, w: 0 }; z.passanten = [];
  z.pendel.aktuell = { Ho: FREI_ZEIT, Hw: FREI_ZEIT, No: 80, Nw: 80 };
  neuerTag(stadt);
}
export const dauerText = (s) => (s < 90 ? `${Math.round(s)} s` : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")} min`);

function tagesbilanz(z, mh) {
  const mittel = (l) => (l.length ? l.reduce((a, b) => a + b, 0) / l.length : null);
  const wege = mh.wege.filter((w) => w.ziel !== "haltN");
  const nachTyp = {};
  for (const w of wege) { const t = (nachTyp[w.mobil] ??= { erreicht: 0, ersetzt: 0, aufgegeben: 0 }); t[w.status]++; }
  return {
    tag: z.tag, autos: { H: mh.autos.Ho + mh.autos.Hw, N: mh.autos.No + mh.autos.Nw, ...mh.autos }, autosStunde: mh.autosStunde,
    reiseMittel: { H: mittel(mh.reise.H), N: mittel(mh.reise.N) }, reise: { H: verteilung(mh.reise.H), N: verteilung(mh.reise.N) },
    reiseSpitze: { Hw: mittel(mh.reiseStunde.Hw[1].concat(mh.reiseStunde.Hw[2])), Ho: mittel(mh.reiseStunde.Ho[11].concat(mh.reiseStunde.Ho[12])) },
    pendel: { ...mh.pendel }, rueckstauMax: mh.rueckstauMax,
    wege: { erreicht: wege.filter((w) => w.status === "erreicht").length, ersetzt: wege.filter((w) => w.status === "ersetzt").length, aufgegeben: wege.filter((w) => w.status === "aufgegeben").length, nachTyp },
    warten: Object.fromEntries(Object.entries(mh.warten).map(([k, l]) => [k, { n: l.length, mittel: mittel(l), max: l.length ? Math.max(...l) : null }])),
    querungen: { ...mh.querungen }, aufenthalt: { ...mh.aufenthalt }, begegnungen: structuredClone(mh.begegnungen),
    zaehlung: structuredClone(mh.zaehlung), atelier: mh.atelier ? structuredClone(mh.atelier) : null, befragung: structuredClone(mh.befragung),
    gewohnheiten: z.figuren.reduce((n, f) => n + Object.values(f.gewohnheit).filter((g) => g.staerke >= 0.4).length, 0),
    bekanntschaften: z.figuren.reduce((n, f) => n + Object.values(f.bekannt).filter((x) => x >= 2).length, 0) / 2,
    wissenNord: { ...z.pendel.wissen },
  };
}
/** Verteilung in Klassen von 30 s (bis 10 min) */
function verteilung(l) { const v = Array(21).fill(0); for (const x of l) v[Math.min(20, Math.floor(x / 30))]++; return v; }

// ---------- Massnahmen ----------
export const MASSNAHME_TEXT = {
  spur: "Zusätzliche Fahrspur", bus: "Bus öfter", querung: "Zusätzliche Querung", ruhe: "Tempo 30 und weniger Autoverkehr",
  verbindung: "Verbindung", bank: "Bank versetzt", durchgang: "Durchgang offen", zwischennutzung: "Zwischennutzung",
};
/** Setzt eine Massnahme. Merkt den Zustand davor für den Vergleich «vorher». atelier: Teilschlüssel als «atelier.gebuehr». */
export function setzeMassnahme(stadt, schluessel, wert) {
  const z = stadt.z;
  const [a, b] = schluessel.split(".");
  const alt = b ? z.m[a][b] : z.m[a];
  if (alt === wert) return null;
  stadt.vorEingriff = { z: structuredClone(z), schluessel, wert, alt };
  wendeAn(z, schluessel, wert);
  const text = massnahmeText(schluessel, wert);
  z.rueckgenommen = z.rueckgenommen.filter((r) => r.schluessel !== schluessel);
  return protokolliere(z, "massnahme", text, { schluessel, wert, alt });
}
/** Nimmt nur die Massnahme zurück (Ausgangswert), ohne den Lauf zurückzusetzen: Erinnerungen, Gewohnheiten und Wissen bleiben */
export function nimmZurueck(stadt, schluessel) {
  const z = stadt.z;
  const [a, b] = schluessel.split(".");
  const start = b ? MASSNAHMEN_START[a][b] : MASSNAHMEN_START[a];
  const jetzt = b ? z.m[a][b] : z.m[a];
  if (jetzt === start) return null;
  const text = massnahmeText(schluessel, jetzt);
  stadt.vorEingriff = { z: structuredClone(z), schluessel, wert: start, alt: jetzt };
  wendeAn(z, schluessel, start);
  const r = { schluessel, text, tag: z.tag, t: z.t, zeit: gesamtzeit(z) };
  z.rueckgenommen.push(r);
  return protokolliere(z, "ruecknahme", `Zurückgenommen: ${text}. Nur die Massnahme – Erinnerungen, Gewohnheiten und Wissen der Figuren bleiben.`, { schluessel, wert: start, alt: jetzt });
}
/** setzt den Wert einer Massnahme im Zustand; ohne zweite Spur fahren alle Autos auf der ersten weiter */
function wendeAn(z, schluessel, wert) {
  const [a, b] = schluessel.split(".");
  if (b) z.m[a][b] = wert; else z.m[a] = wert;
  if (a === "spur" && !wert) for (const x of z.autos) x.spur = 0;
}
export function massnahmeText(schluessel, wert) {
  const [a, b] = schluessel.split(".");
  if (a === "verbindung") return VERBINDUNG[wert].name;
  if (a === "bank") return `Bank ${BANK[wert].name}`;
  if (a === "atelier") return `Atelier: ${ATELIER_TEXT[b][wert]}`;
  return MASSNAHME_TEXT[a] + (wert === false ? " (aus)" : "");
}
export const ATELIER_TEXT = {
  gebuehr: { hoch: "spürbare Gebühr", tief: "kleine Gebühr", frei: "kostenlos" },
  anmeldung: { konto: "Anmeldung nur online mit Konto", formular: "kurzes Formular", vorort: "ohne Anmeldung" },
  einladung: { keine: "nur Aushang", atelier: "persönliche Einladung" },
  beginn: { "18": "18 bis 20 Uhr", "1930": "19.30 bis 21.30 Uhr" },
  rolle: { vorgegeben: "Rolle vorgegeben", mitgestalten: "Rolle mitgestalten" },
  programm: { leitung: "Programm macht die Leitung", gruppe: "offene Programmgruppe" },
};

/** Lauf vom gemerkten Zustand aus wiederholen (für Vergleiche): Zustand klonen, Massnahmen setzen, Sekunden rechnen */
export function zweig(stadt, z0, massnahmen = {}) {
  const s = { z: structuredClone(z0), r: stadt.r };
  for (const [k, v] of Object.entries(massnahmen)) wendeAn(s.z, k, v);
  return s;
}

// ---------- Kennzahlen für Ansichten und Vergleiche (lesen nur) ----------
/** Kennzahlen eines Laufs über die abgeschlossenen Tage ab «abTag» und den laufenden Tag */
export function kennzahlen(z, abTag = 1) {
  const tage = z.messung.tage.filter((t) => t.tag >= abTag);
  const heute = tagesbilanz(z, z.messung.heute);
  const alle = [...tage, heute];
  const summe = (f) => alle.reduce((s, t) => s + f(t), 0);
  const reise = alle.flatMap((t) => [t.reiseMittel.H].filter((x) => x !== null));
  const wege = summe((t) => t.wege.erreicht + t.wege.ersetzt + t.wege.aufgegeben);
  const wartenAlle = [...z.messung.heute.warten.ampel, ...z.messung.heute.warten.zebra, ...z.messung.heute.warten.frei];
  return {
    tage: alle.length, autosH: summe((t) => t.autos.H), autosN: summe((t) => t.autos.N),
    reiseH: reise.length ? reise.reduce((a, b) => a + b, 0) / reise.length : null,
    reiseVerteilung: alle.reduce((v, t) => v.map((x, i) => x + t.reise.H[i]), Array(21).fill(0)),
    wege, erreicht: summe((t) => t.wege.erreicht), ersetzt: summe((t) => t.wege.ersetzt), aufgegeben: summe((t) => t.wege.aufgegeben),
    nachTyp: alle.reduce((m, t) => { for (const [k, v] of Object.entries(t.wege.nachTyp)) { const x = (m[k] ??= { erreicht: 0, ersetzt: 0, aufgegeben: 0 }); for (const s of Object.keys(x)) x[s] += v[s]; } return m; }, {}),
    wartenMittel: (() => { const l = alle.flatMap((t) => Object.values(t.warten).filter((w) => w.n).map((w) => [w.mittel, w.n])); const n = l.reduce((s, x) => s + x[1], 0); return n ? l.reduce((s, x) => s + x[0] * x[1], 0) / n : null; })(),
    wartenMax: wartenAlle.length ? Math.max(...wartenAlle) : null,
    aufenthalt: summe((t) => Object.values(t.aufenthalt).reduce((a, b) => a + b, 0)),
    gespraeche: summe((t) => Object.values(t.begegnungen).reduce((a, b) => a + b.gespraech, 0)),
    begegnungen: summe((t) => Object.values(t.begegnungen).reduce((a, b) => a + b.gespraech + b.fluechtig + b.stoerung, 0)),
    pendel: alle.reduce((p, t) => { for (const k of Object.keys(p)) p[k] += t.pendel[k]; return p; }, { auto: 0, bus: 0, spaeter: 0, auslassen: 0, nord: 0, umgeleitet: 0 }),
    belastung: z.figuren.map((f) => { const w = f.wege.filter((x) => x.tag >= abTag); return { id: f.id, umweg: w.reduce((s, x) => s + x.umweg, 0), warten: w.reduce((s, x) => s + x.warten, 0), aufgegeben: w.filter((x) => x.status === "aufgegeben").length }; }),
  };
}
export { ORTE, KNOTEN, KANTE, KANTEN, BANK, VERBINDUNG };
