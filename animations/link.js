// Animationen – kurze Links (5. November 2026, Christian: «Wenn ich einen Link eines Werkes zum Weiterarbeiten teilen möchte, ist dieser
// endlos lang»). Bis dahin stand die ganze Mischung als JSON in Base64 im Link (#m=…, oft 600 bis 1000 Zeichen). Jetzt:
//   #w=ID     ein gesichertes Werk, unverändert: nur seine Kennung (das Werk liegt in werke.php)
//   #k=…      eine Mischung kompakt, je Ebene ein kurzes Stück, Werte als Tausendstel in zwei Zeichen Base36
//   #m=…      der alte Link, wird weiter gelesen; geschrieben nur noch, wenn eine Mischung nicht in die kompakte Form passt
// Aufbau von #k: Kopf~Ebene~Ebene…  Kopf = Werk-ID (oder leer) "_" Schalter; Schalter: w Grund weiss, o ohne Bild, r Durchlauf,
// d<s> Länge in Sekunden, f<1|2> Format 1:1 bzw. 16:9. Ebene = Effekt "_" Werte "_" Modus Quelle Aus "_" Deckkraft "_" Seed;
// Unterstrich statt Punkt, weil Messenger einen Punkt am Ende eines Links gern abschneiden.
// ein leeres Feld heisst «nicht gesetzt», so kommt die Mischung genau so zurück, wie sie war.
import { MODI } from "./motor.js?v=33";

const MODUS = Object.keys(MODI);
const FORMAT = { "1x1": "1", "16x9": "2" }, FORMAT_ZURUECK = { 1: "1x1", 2: "16x9" };
const ZAHL = /^[0-9a-z]{2}$/;
const KENNUNG = /^[A-Za-z0-9-]{1,40}$/, EFFEKT = /^[A-Za-z0-9-]{1,40}$/;

/** 0…1 in zwei Zeichen (Tausendstel, Base36); null, wenn der Wert nicht passt */
const zahl = (v) => (typeof v === "number" && v >= 0 && v <= 1.295) ? Math.round(v * 1000).toString(36).padStart(2, "0") : null;
const zurueck = (s) => +(parseInt(s, 36) / 1000).toFixed(3);

const EBENE_FELDER = new Set(["effekt", "werte", "modus", "deckkraft", "quelle", "seed", "aus"]);
const KOPF_FELDER = new Set(["ebenen", "grund", "werk", "ohneBild", "durchlauf", "dauer", "format"]);

/** die Mischung (wie im Link: mit werk, ohneBild, durchlauf, dauer, format, ohne bild) kompakt; null, wenn sie nicht hineinpasst */
export function kurz(m) {
  if (!m || !Array.isArray(m.ebenen) || Object.keys(m).some((k) => m[k] !== undefined && !KOPF_FELDER.has(k))) return null;
  if (m.werk != null && !KENNUNG.test(m.werk)) return null;
  let s = "";
  if (m.grund === "weiss") s += "w"; else if (m.grund !== undefined && m.grund !== "schwarz") return null;
  if (m.ohneBild) s += "o";
  if (m.durchlauf) s += "r";
  if (m.dauer !== undefined) { if (!Number.isInteger(m.dauer) || m.dauer < 1 || m.dauer > 999) return null; s += `d${m.dauer}`; }
  if (m.format !== undefined && m.format !== "4x5") { if (!FORMAT[m.format]) return null; s += `f${FORMAT[m.format]}`; }
  const teile = [`${m.werk ?? ""}_${s}`];
  for (const e of m.ebenen) {
    if (!e || typeof e !== "object" || Object.keys(e).some((k) => e[k] !== undefined && !EBENE_FELDER.has(k))) return null;
    const effekt = e.effekt ?? "";
    if (effekt !== "" && !EFFEKT.test(effekt)) return null;
    if (e.werte !== undefined && !Array.isArray(e.werte)) return null;
    const werte = (e.werte ?? []).map(zahl);
    if (werte.includes(null)) return null;
    const modus = e.modus === undefined ? "" : MODUS.indexOf(e.modus);
    if (modus === -1) return null;
    const quelle = e.quelle === undefined ? "" : e.quelle === "bild" ? "b" : e.quelle === "unten" ? "u" : null;
    if (quelle === null) return null;
    const deck = e.deckkraft === undefined ? "" : zahl(e.deckkraft);
    if (deck === null) return null;
    if (e.seed !== undefined && !(Number.isInteger(e.seed) && e.seed >= 0 && e.seed < 1e6)) return null;
    const aus = e.aus ? "a" : e.aus === false ? "n" : "";
    // «nicht gesetzt» und «gesetzt, aber leer» bei den Werten unterscheiden: ein Strich steht für «keine Werte-Liste»
    teile.push([effekt, e.werte === undefined ? "-" : werte.join(""), `${modus}${quelle}${aus}`, deck, e.seed === undefined ? "" : e.seed.toString(36)].join("_"));
  }
  return teile.join("~");
}

/** liest #k=…; null bei einem kaputten Link */
export function lang(k) {
  const [kopf, ...ebenen] = String(k).split("~");
  const p = kopf.indexOf("_");
  if (p < 0) return null;
  const werk = kopf.slice(0, p), s = kopf.slice(p + 1);
  if (werk && !KENNUNG.test(werk)) return null;
  const m = { ebenen: [] };
  if (werk) m.werk = werk;
  if (!/^w?o?r?(d\d{1,3})?(f[12])?$/.test(s)) return null;
  m.grund = s.includes("w") ? "weiss" : "schwarz";   // ohne Angabe schwarz, wie im Pult
  if (s.includes("o")) m.ohneBild = true;
  if (s.includes("r")) m.durchlauf = true;
  const d = s.match(/d(\d{1,3})/); if (d) m.dauer = +d[1];
  const f = s.match(/f([12])/); if (f) m.format = FORMAT_ZURUECK[f[1]];
  for (const t of ebenen) {
    const [effekt, werte, art, deck, seed, ...rest] = t.split("_");
    if (rest.length || seed === undefined || (effekt && !EFFEKT.test(effekt))) return null;
    const e = { effekt };
    if (werte !== "-") {
      if (werte.length % 2) return null;
      e.werte = [];
      for (let i = 0; i < werte.length; i += 2) { const z = werte.slice(i, i + 2); if (!ZAHL.test(z)) return null; e.werte.push(zurueck(z)); }
    }
    const a = art.match(/^(\d?)([bu]?)([an]?)$/);
    if (!a) return null;
    if (a[1] !== "") { if (!MODUS[+a[1]]) return null; e.modus = MODUS[+a[1]]; }
    if (a[2]) e.quelle = a[2] === "u" ? "unten" : "bild";
    if (a[3]) e.aus = a[3] === "a";
    if (deck) { if (!ZAHL.test(deck)) return null; e.deckkraft = zurueck(deck); }
    if (seed) { if (!/^[0-9a-z]{1,4}$/.test(seed)) return null; e.seed = parseInt(seed, 36); }
    m.ebenen.push(e);
  }
  return m;
}
