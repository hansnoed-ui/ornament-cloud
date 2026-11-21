// Sprachwahl des Composers (21. November 2026, Christian: «Kannst du den Composer noch übersetzen: Englisch, Spanisch, Französisch?»).
// Der Code schreibt weiterhin deutsche Texte. Dieses Modul übersetzt sie beim Anzeigen: Textknoten und die Attribute title, aria-label,
// placeholder, label und alt, auch alles, was später dazukommt (MutationObserver). Grundlage ist das Wörterbuch in sprache-texte.js:
//   1. ganzer Text bekannt → Übersetzung;
//   2. Muster mit Platzhaltern {0} {1} … (Meldungen mit Zahlen und Namen), die eingesetzten Stücke werden wieder übersetzt;
//   3. sonst in Stücke an « · », «: », «, », Klammern und « → » teilen und jedes Stück einzeln suchen.
// Unbekanntes bleibt deutsch. Fachbegriffe (BPM, LUFS, dBTP, Namen der Presets) stehen nicht im Wörterbuch und bleiben, wie sie sind.
// Was Leute selbst schreiben (Urteile, Projekttitel), steht in Elementen mit translate="no" und wird nie angefasst.
import { TEXTE, SPRACHEN } from "./sprache-texte.js?v=1";

const SPALTE = { en: 0, es: 1, fr: 2 };
const SCHLUESSEL = "composer-sprache";
const ATTRIBUTE = ["title", "aria-label", "placeholder", "label", "alt"];

let sprache = "de";
const exakt = new Map();      // deutscher Text → [en, es, fr]
const muster = [];            // { re, ziel: [en, es, fr], n }
for (const [de, ziel] of Object.entries(TEXTE)) {
  if (/\{\d\}/.test(de)) {
    const teile = de.split(/(\{\d\})/);
    const reihe = [];
    const re = teile.map((t) => { const m = /^\{(\d)\}$/.exec(t); if (m) { reihe.push(Number(m[1])); return "(.+?)"; } return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("");
    muster.push({ re: new RegExp(`^${re}$`, "s"), ziel, reihe, fest: de.replace(/\{\d\}/g, "").length });
  } else exakt.set(de, ziel);
}
muster.sort((a, b) => b.fest - a.fest);   // das genaueste Muster zuerst
// lange Sätze, die in längeren Texten vorkommen (Beschreibung mit Doppelpunkt in einem Hinweis): längste zuerst
const LANGE = [...exakt.keys()].filter((k) => k.length >= 20).sort((a, b) => b.length - a.length);

const merk = new Map();       // Zwischenspeicher je Sprache: deutscher Text → übersetzt
const DEZIMAL_PUNKT = new Set(["en"]);

function nachschlagen(de) {
  const z = exakt.get(de);
  return z ? z[SPALTE[sprache]] || null : null;
}

function mitMuster(de, tiefe) {
  for (const m of muster) {
    const t = m.re.exec(de);
    if (!t) continue;
    const ziel = m.ziel[SPALTE[sprache]];
    if (!ziel) return null;
    const stuecke = []; m.reihe.forEach((nr, i) => { stuecke[nr] = t[i + 1]; });
    return ziel.replace(/\{(\d)\}/g, (_, nr) => uebersetzeKern(stuecke[Number(nr)] ?? "", tiefe + 1));
  }
  return null;
}

// Trenner, vom gröbsten zum feinsten: erst ganze Teile («Name · Rolle», «Titel: Satz»), dann Aufzählungen, zuletzt Klammern
const STUFEN = [/( · )/, /( → )/, /( – | — )/, /(: )/, /(; )/, /(\. )/, /(, )/, /( \/ )/];
const NOTEN = ["C", "Cis", "D", "Es", "E", "F", "Fis", "G", "As", "A", "B", "H"];
const NOTEN_ZIEL = {
  en: ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"],
  es: ["Do", "Do♯", "Re", "Mi♭", "Mi", "Fa", "Fa♯", "Sol", "La♭", "La", "Si♭", "Si"],
  fr: ["do", "do♯", "ré", "mi♭", "mi", "fa", "fa♯", "sol", "la♭", "la", "si♭", "si"],
};
/** deutscher Notenname (C, Cis, … B, H) in der gewählten Sprache; sonst null */
export function note(de) { const i = NOTEN.indexOf(de); return i < 0 || sprache === "de" ? null : NOTEN_ZIEL[sprache][i]; }

function inStuecken(de, tiefe) {
  for (const stufe of STUFEN) {
    const teile = de.split(stufe);
    if (teile.length < 2) continue;
    let treffer = 0;
    const neu = teile.map((t, i) => {
      if (i % 2 || !t.trim()) return t;
      const u = uebersetzeKern(t, tiefe + 1, true);
      if (u !== t) treffer++;
      return u;
    });
    if (treffer) return neu.join("");
  }
  // «Name (Zusatz)»
  const kl = /^(.+?) \((.+)\)$/s.exec(de);
  if (kl) {
    const a = uebersetzeKern(kl[1], tiefe + 1, true), b = uebersetzeKern(kl[2], tiefe + 1, true);
    if (a !== kl[1] || b !== kl[2]) return `${a} (${b})`;
  }
  // «Natur und Flächen 0.3.0»: Version abtrennen
  const ve = /^(.+) (\d+\.\d+\.\d+)$/s.exec(de);
  if (ve) { const a = uebersetzeKern(ve[1], tiefe + 1, true); if (a !== ve[1]) return `${a} ${ve[2]}`; }
  // «D Hijaz», «Fis Dorisch»: Grundton und Tonleiter
  const nt = /^(Cis|Fis|Es|As|[CDEFGABH]) (.+)$/s.exec(de);
  if (nt) { const r = uebersetzeKern(nt[2], tiefe + 1, true); if (r !== nt[2] || exakt.has(nt[2])) return `${note(nt[1])} ${r}`; }
  return null;
}

function satzende(kurz, tiefe) {
  const satz = /^(.*?)([.…!?]+)$/s.exec(kurz);
  if (!satz || !satz[1]) return null;
  const k = nachschlagen(satz[1]) ?? mitMuster(satz[1], tiefe);
  return k != null ? k + satz[2] : null;
}

function uebersetzeKern(de, tiefe = 0, teilstueck = false) {
  if (tiefe > 8) return de;
  const kurz = de.trim();
  if (!kurz || !/[A-Za-zÄÖÜäöü]/.test(kurz)) return de;
  const vorne = de.slice(0, de.indexOf(kurz)), hinten = de.slice(de.indexOf(kurz) + kurz.length);
  let u = nachschlagen(kurz);
  if (u == null) u = mitMuster(kurz, tiefe);
  if (u == null) u = satzende(kurz, tiefe);
  if (u == null && kurz.length > 40) {
    let neu = kurz;
    for (const k of LANGE) if (k.length < neu.length && neu.includes(k)) { const z = nachschlagen(k); if (z) neu = neu.split(k).join(z); }
    if (neu !== kurz) u = inStuecken(neu, tiefe) ?? neu;
  }
  if (u == null) u = inStuecken(kurz, tiefe);
  return u == null ? de : vorne + u + hinten;
}

/** einen deutschen Text in die gewählte Sprache; Deutsch gibt ihn unverändert zurück */
export function t(de) {
  if (sprache === "de" || de == null) return de;
  const s = String(de);
  let u = merk.get(s);
  if (u === undefined) {
    u = uebersetzeKern(s);
    if (DEZIMAL_PUNKT.has(sprache)) u = u.replace(/(\d),(\d)/g, "$1.$2");
    if (merk.size > 5000) merk.clear();
    merk.set(s, u);
  }
  return u;
}

export const aktuelleSprache = () => sprache;

// ---------- DOM ----------
const urText = new WeakMap();     // Textknoten → { de, gezeigt }
const urAttr = new WeakMap();     // Element → { [attr]: { de, gezeigt } }
let beobachter = null, schreibe = false;

const gesperrt = (n) => { const e = n.nodeType === 1 ? n : n.parentElement; return !e || !!e.closest("[translate='no'], script, style, textarea, code, kbd"); };

function textKnoten(n) {
  if (gesperrt(n)) return;
  const jetzt = n.nodeValue;
  let r = urText.get(n);
  if (!r || jetzt !== r.gezeigt) { r = { de: jetzt, gezeigt: jetzt }; urText.set(n, r); }
  const neu = (n.parentElement?.tagName === "OPTION" && note(r.de.trim())) || t(r.de);
  if (neu !== jetzt) { r.gezeigt = neu; n.nodeValue = neu; }
  else r.gezeigt = jetzt;
}

function attribute(e) {
  if (gesperrt(e)) return;
  let alle = urAttr.get(e);
  for (const a of ATTRIBUTE) {
    if (!e.hasAttribute(a)) continue;
    const jetzt = e.getAttribute(a);
    alle ??= {}; let r = alle[a];
    if (!r || jetzt !== r.gezeigt) r = alle[a] = { de: jetzt, gezeigt: jetzt };
    const neu = t(r.de);
    if (neu !== jetzt) e.setAttribute(a, neu);
    r.gezeigt = neu;
  }
  if (alle) urAttr.set(e, alle);
}

function baum(wurzel) {
  if (wurzel.nodeType === 3) { textKnoten(wurzel); return; }
  if (wurzel.nodeType !== 1) return;
  attribute(wurzel);
  const gang = document.createTreeWalker(wurzel, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = gang.nextNode(); n; n = gang.nextNode()) n.nodeType === 3 ? textKnoten(n) : attribute(n);
}

function allesUebersetzen() {
  schreibe = true;
  try {
    baum(document.body);
    document.title = t(document.documentElement.dataset.titel ??= document.title);
    document.documentElement.lang = sprache;
  } finally { schreibe = false; }
}

function beobachten() {
  beobachter = new MutationObserver((liste) => {
    if (schreibe) return;
    schreibe = true;
    try {
      for (const m of liste) {
        if (m.type === "characterData") textKnoten(m.target);
        else if (m.type === "attributes") attribute(m.target);
        else m.addedNodes.forEach(baum);
      }
    } finally { beobachter.takeRecords(); schreibe = false; }
  });
  beobachter.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRIBUTE });
}

function gespeichert() {
  try { return localStorage.getItem(SCHLUESSEL); } catch { return null; }
}

/** Sprache setzen und die ganze Seite neu beschriften (ohne Neuladen: das Projekt bleibt offen) */
export function spracheSetzen(neu) {
  if (!SPRACHEN.some((s) => s.code === neu)) neu = "de";
  sprache = neu; merk.clear();
  if (typeof document === "undefined") return;   // Tests unter Node
  try { localStorage.setItem(SCHLUESSEL, neu); } catch { /* privates Fenster */ }
  const wahl = document.getElementById("sprache");
  if (wahl) wahl.value = neu;
  allesUebersetzen();
  document.dispatchEvent(new CustomEvent("sprache", { detail: neu }));
}

/** Start: gespeicherte Wahl, sonst die Sprache des Browsers, sonst Deutsch */
export function spracheStarten() {
  const browser = (navigator.languages ?? [navigator.language]).map((l) => String(l).slice(0, 2).toLowerCase()).find((l) => SPRACHEN.some((s) => s.code === l));
  sprache = gespeichert() ?? browser ?? "de";
  if (!SPRACHEN.some((s) => s.code === sprache)) sprache = "de";
  const wahl = document.getElementById("sprache");
  if (wahl) {
    wahl.replaceChildren(...SPRACHEN.map((s) => Object.assign(document.createElement("option"), { value: s.code, textContent: s.kurz, title: s.name })));
    wahl.value = sprache;
    wahl.addEventListener("change", () => spracheSetzen(wahl.value));
  }
  beobachten();
  if (sprache !== "de") allesUebersetzen();
}
