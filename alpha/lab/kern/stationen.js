// ORNAMENT LAB – Animation über mehrere Stationen (Nacheinander als Film). Eine Station ist ein Bildzustand des Projekts: das Material,
// ein Schritt des Verlaufs oder eine Variante, die nebeneinander stand. Der Film hält jede Station und geht in die nächste über.
// Zuerst entsteht eine Partitur (rein, ohne DOM, getestet): Reihenfolge, Halten und Übergang je Station, wie im Schnittplan eines Films.
// Die Dauern sind Parameter wie die einer Operation, darum verteilt dieselbe Modulation (kern/modulation.js) sie über die Stationen:
// die Stelle u einer Station in der Folge ist hier die Zeit. Eine Ereignisfolge (die Einsätze eines Tons) kann statt eines gleichmässigen
// Masses den Takt geben: ein Einsatz löst den Wechsel aus. Danach rechnet filmbilder() die Bilder der Partitur, ebenfalls ohne DOM.
import { GRENZEN, ergebnis, knoten, verlauf } from "./projekt.js";
import { moduliere, routeFuersProtokoll } from "./modulation.js";
import { bildfolge, routenAufloesen } from "./ausfuehrung.js";
import { neuesBild, skalieren, luminanz, NACHT } from "./bilddaten.js";

export const STATIONEN_VERSION = "0.1.0";

export const UEBERGAENGE = Object.freeze({
  blende: "Überblendung",
  schwelle: "Schwelle (die dunklen Stellen des Ziels zuerst)",
  verlauf: "Verlauf der Operation",
  schnitt: "Schnitt",
});

/** die zeitlichen Grössen des Films, beschrieben wie Parameter einer Operation: so kann moduliere() sie über die Stationen verteilen */
export const ZEITPARAMETER = Object.freeze([
  { id: "halten", name: "Halten je Station (s)", art: "zahl", min: 0, max: 10, standard: 1.5, schritt: 0.1 },
  { id: "uebergang", name: "Übergang (s)", art: "zahl", min: 0, max: 6, standard: 1, schritt: 0.1 },
]);
const ZEIT = { parameter: ZEITPARAMETER };
const rund = (x) => Math.round(x * 1000) / 1000;
const begrenze = (p, v) => Math.min(p.max, Math.max(p.min, Number.isFinite(Number(v)) ? Number(v) : p.standard));

/** die Bildzustände des Verlaufs bis zu einem Ergebnis (Material zuerst), die übliche Folge von Stationen */
export function stationenAusVerlauf(projekt, ergebnisId) {
  const { material, schritte } = verlauf(projekt, ergebnisId);
  return [material, ...schritte.map((s) => s.ergebnis)].filter((e) => e?.typ === "IMAGE").map((e) => e.id);
}

/** Ist «nach» aus «von» durch eine Operation entstanden? Dann kann der Übergang deren eigener Verlauf sein. */
export function verlaufMoeglich(projekt, von, nach) {
  const e = ergebnis(projekt, nach);
  if (!e?.knoten || e.typ !== "IMAGE") return false;
  return Object.values(knoten(projekt, e.knoten)?.eingaben ?? {})[0] === von;
}

/** die Einsätze einer Ereignisfolge ab einer Mindeststärke, in Sekunden ab ihrem Beginn, aufsteigend und mindestens ein Bild auseinander */
function taktzeiten(daten, schwelle, fps) {
  const t = (daten?.ereignisse ?? []).filter((x) => (x.staerke ?? 1) >= schwelle && x.t > 0).map((x) => x.t).sort((a, b) => a - b);
  return t.filter((x, i) => i === 0 || x - t[i - 1] >= 1 / fps);
}

/**
 * Die Partitur: welche Station wann steht und wie sie in die nächste übergeht.
 * plan: { stationen: [ergebnisId | { ergebnis, uebergang? }], halten, uebergang, art, routen, takt: { ereignisfolge, schwelle, wiederholen } | null, fps }
 * Ein Übergang «verlauf» ohne festen Takt behält die Länge, mit der die Operation ihren Verlauf rechnet (dauer null).
 */
export function partitur(projekt, plan) {
  const fps = plan.fps ?? 30;
  const st = (plan.stationen ?? []).map((s) => (typeof s === "string" ? { ergebnis: s } : s));
  if (st.length < 2) throw new Error("Eine Animation über Stationen braucht mindestens zwei Stationen");
  if (st.length > GRENZEN.stationen) throw new Error(`Grenze: höchstens ${GRENZEN.stationen} Stationen`);
  for (const s of st) if (ergebnis(projekt, s.ergebnis)?.typ !== "IMAGE") throw new Error(`Station ${s.ergebnis} ist kein Bild dieses Projekts`);
  const grund = { halten: begrenze(ZEITPARAMETER[0], plan.halten), uebergang: begrenze(ZEITPARAMETER[1], plan.uebergang) };
  const art = UEBERGAENGE[plan.art] ? plan.art : "blende";
  const routen = routenAufloesen(projekt, plan.routen ?? []);

  // Takt aus einer Ereignisfolge: die Einsätze, und der Ton, aus dem sie gemessen wurden (für die Tonspur)
  let takt = null, zeiten = [];
  if (plan.takt?.ereignisfolge) {
    const f = ergebnis(projekt, plan.takt.ereignisfolge);
    if (f?.typ !== "EVENT_SEQUENCE") throw new Error(`Takt: Ereignisfolge ${plan.takt.ereignisfolge} gibt es nicht`);
    const schwelle = Math.min(1, Math.max(0, Number(plan.takt.schwelle) || 0));
    zeiten = taktzeiten(f.daten, schwelle, fps);
    if (!zeiten.length) throw new Error("Takt: die Ereignisfolge hat keine Einsätze über der Schwelle");
    const tonId = f.knoten ? Object.values(knoten(projekt, f.knoten).eingaben).find((id) => ergebnis(projekt, id)?.typ === "AUDIO") ?? null : null;
    takt = { ereignisfolge: f.id, schwelle, wiederholen: Boolean(plan.takt.wiederholen), einsaetze: zeiten.length, ton: tonId, tonBeginn: f.daten.beginn ?? 0, tonDauer: f.daten.dauer ?? null };
  }
  // die Folge: jede Station einmal, oder im Takt reihum, bis die Einsätze aufgebraucht sind
  const folge = takt?.wiederholen ? Array.from({ length: Math.min(GRENZEN.stationen * 8, zeiten.length + 1) }, (_, i) => st[i % st.length]) : st;

  let t = 0, offen = 0;
  const eintraege = folge.map((s, j) => {
    const u = folge.length > 1 ? j / (folge.length - 1) : 0.5;
    const p = moduliere(ZEIT, grund, routen, u);
    return { ergebnis: s.ergebnis, stelle: rund(u), p, art: UEBERGAENGE[s.uebergang] ? s.uebergang : art };
  });
  const out = eintraege.map((x, j) => {
    const naechste = eintraege[j + 1];
    const beginn = t;
    if (!naechste) {   // die letzte Station: halten, im Takt bis zum Ende des Tons
      const halten = takt?.tonDauer ? Math.max(1 / fps, takt.tonDauer - beginn) : x.p.halten;
      t += halten;
      return { ergebnis: x.ergebnis, stelle: x.stelle, beginn: rund(beginn), halten: rund(halten), uebergang: null };
    }
    let a = x.art, hinweis;
    if (a === "verlauf" && !verlaufMoeglich(projekt, x.ergebnis, naechste.ergebnis)) { a = "blende"; hinweis = "kein eigener Verlauf: die nächste Station ist nicht aus dieser entstanden, darum Überblendung"; }
    let halten = x.p.halten, dauer = a === "schnitt" ? 0 : x.p.uebergang;
    const ein = takt ? zeiten[j] : undefined;
    if (ein !== undefined) {   // ein Einsatz löst den Wechsel aus; der Übergang endet spätestens beim nächsten Einsatz
      halten = Math.max(0, ein - beginn);
      const luecke = (zeiten[j + 1] ?? Infinity) - ein;
      if (a !== "schnitt") dauer = Math.min(dauer, luecke);
      if (dauer < 1 / fps) { dauer = 0; if (a !== "schnitt") hinweis = "zu wenig Zeit bis zum nächsten Einsatz, darum Schnitt"; a = "schnitt"; }
    } else if (a === "verlauf") { dauer = null; offen++; }   // eigene Länge der Operation
    t += halten + (dauer ?? 0);
    return { ergebnis: x.ergebnis, stelle: x.stelle, beginn: rund(beginn), halten: rund(halten), uebergang: { art: a, dauer: dauer === null ? null : rund(dauer), ...(hinweis ? { hinweis } : {}) } };
  });
  const bilder = Math.max(1, Math.round(t * fps));
  if (bilder > GRENZEN.filmBilder) throw new Error(`Grenze: höchstens ${GRENZEN.filmBilder} Bilder (${Math.round(GRENZEN.filmBilder / fps)} s), geplant sind ${bilder}`);
  return {
    version: STATIONEN_VERSION, fps, art, halten: grund.halten, uebergang: grund.uebergang,
    routen: (plan.routen ?? []).map(routeFuersProtokoll), takt, folge: out, dauer: rund(t), bilder, offen,
  };
}

/** ein Bild unverzerrt in w × h einpassen, auf dem dunklen Grund der Fictory */
export function einpassen(b, w, h) {
  if (b.width === w && b.height === h) return b;
  const f = Math.min(w / b.width, h / b.height), bw = Math.max(1, Math.round(b.width * f)), bh = Math.max(1, Math.round(b.height * f));
  const s = skalieren(b, bw, bh), out = neuesBild(w, h, NACHT), x0 = Math.floor((w - bw) / 2), y0 = Math.floor((h - bh) / 2);
  for (let y = 0; y < bh; y++) out.data.set(s.data.subarray(y * bw * 4, (y + 1) * bw * 4), ((y0 + y) * w + x0) * 4);
  return out;
}

const glatt = (s) => s * s * (3 - 2 * s);
function blende(a, b, s) {
  const out = neuesBild(a.width, a.height), k = glatt(s);
  for (let i = 0; i < out.data.length; i++) out.data[i] = a.data[i] * (1 - k) + b.data[i] * k;
  return out;
}
/** Schwelle: ein Bildpunkt wechselt, sobald die Schwelle über seine Helligkeit im Ziel steigt (weiche Kante 0,12) */
function schwelle(a, b, hell, s) {
  const out = neuesBild(a.width, a.height), w = 0.12, g = s * (1 + w);
  for (let i = 0, j = 0; j < hell.length; i += 4, j++) {
    const k = Math.min(1, Math.max(0, (g - hell[j]) / w));
    out.data[i] = a.data[i] * (1 - k) + b.data[i] * k; out.data[i + 1] = a.data[i + 1] * (1 - k) + b.data[i + 1] * k;
    out.data[i + 2] = a.data[i + 2] * (1 - k) + b.data[i + 2] * k; out.data[i + 3] = 255;
  }
  return out;
}
const helligkeit = (b) => { const h = new Float32Array(b.width * b.height); for (let i = 0, j = 0; j < h.length; i += 4, j++) h[j] = luminanz(b.data[i], b.data[i + 1], b.data[i + 2]) / 255; return h; };

/** Filmgrösse: die erste Station, auf die längste Seite begrenzt, gerade Masse (H.264) */
export function filmgroesse(b, seite) {
  const f = Math.min(1, seite / Math.max(b.width, b.height)), gerade = (x) => Math.max(2, Math.round(x * f) & ~1);
  return { breite: gerade(b.width), hoehe: gerade(b.height) };
}

/**
 * Die Bilder einer Partitur (async iterierbar, für videoAus). zeitplan bekommt je Station { ergebnis, ab, bild, uebergang, bilder },
 * so stehen auch die eigenen Längen von Verläufen nachher im Protokoll. Gehaltene Bilder sind dasselbe Objekt (der Kodierer malt sie nur einmal).
 */
export async function* filmbilder({ register, projekt, medien, partitur: pt, seite = 1280, abbrechen = null, zeitplan = [] }) {
  const roh = async (id) => medien.bild(ergebnis(projekt, id));
  const { breite: W, hoehe: H } = filmgroesse(await roh(pt.folge[0].ergebnis), seite);
  const vorrat = new Map();
  const bild = async (id) => { if (!vorrat.has(id)) { if (vorrat.size > 3) vorrat.delete(vorrat.keys().next().value); vorrat.set(id, einpassen(await roh(id), W, H)); } return vorrat.get(id); };
  const fps = pt.fps;
  let n = 0, soll = 0;
  const grenze = () => { if (n > GRENZEN.filmBilder) throw new Error(`Grenze: höchstens ${GRENZEN.filmBilder} Bilder je Film`); };
  for (const [j, x] of pt.folge.entries()) {
    abbrechen?.throwIfAborted?.();
    const a = await bild(x.ergebnis), ab = n;
    soll += x.halten;
    do { yield a; n++; } while (n < Math.round(soll * fps));
    const ue = x.uebergang, eintrag = { ergebnis: x.ergebnis, ab: rund(ab / fps), bild: ab, uebergang: ue?.art ?? null, bilder: 0 };
    zeitplan.push(eintrag);
    if (!ue) { eintrag.bilder = n - ab; break; }
    const ziel = pt.folge[j + 1].ergebnis;
    if (ue.art === "verlauf") {
      const folge = () => bildfolge({ register, projekt, medien, ergebnisId: ziel, abbrechen });
      if (ue.dauer === null) {   // eigene Länge: jedes Bild des Verlaufs
        for await (const f of folge()) { yield einpassen(f, W, H); n++; grenze(); }
        soll = n / fps;
      } else {   // feste Länge (Takt): die Bilder des Verlaufs gleichmässig auswählen, dafür erst zählen
        const m = Math.round((soll + ue.dauer) * fps) - n;
        let N = 0;
        for await (const f of folge()) { void f; N++; }
        const stelle = (q) => (m === 1 ? N - 1 : Math.round((q * (N - 1)) / (m - 1)));   // aufsteigend: Bild q des Films zeigt Bild stelle(q) des Verlaufs
        let i = 0, q = 0;
        for await (const f of folge()) {
          if (q < m && stelle(q) === i) { const b = einpassen(f, W, H); while (q < m && stelle(q) === i) { yield b; n++; q++; } }
          i++;
        }
        soll += ue.dauer;
      }
    } else if (ue.art !== "schnitt") {
      const b = await bild(ziel), hell = ue.art === "schwelle" ? helligkeit(b) : null;
      const m = Math.round((soll + ue.dauer) * fps) - n;
      for (let i = 1; i <= m; i++) { abbrechen?.throwIfAborted?.(); yield hell ? schwelle(a, b, hell, i / (m + 1)) : blende(a, b, i / (m + 1)); n++; }
      soll += ue.dauer;
    }
    eintrag.bilder = n - ab;
    grenze();
  }
}
