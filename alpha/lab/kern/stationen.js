// ORNAMENT LAB – Animation über mehrere Stationen (Nacheinander als Film). Eine Station ist ein Bildzustand des Projekts: das Material,
// ein Schritt des Verlaufs oder eine Variante, die nebeneinander stand. Der Film hält jede Station und geht in die nächste über.
// Zuerst entsteht eine Partitur (rein, ohne DOM, getestet): Reihenfolge, Halten und Übergang je Station, wie im Schnittplan eines Films.
// Die Dauern sind Parameter wie die einer Operation, darum verteilt dieselbe Modulation (kern/modulation.js) sie über die Stationen:
// die Stelle u einer Station in der Folge ist hier die Zeit. Eine Ereignisfolge (die Einsätze eines Tons) kann statt eines gleichmässigen
// Masses den Takt geben: ein Einsatz löst den Wechsel aus. Danach rechnet filmbilder() die Bilder der Partitur, ebenfalls ohne DOM.
// Eine Bewegung (seit Lab 0.1.15) führt eine Kamera über jedes Bild: langsames Schweben und Drehen, der Zoom atmet mit einem Steuersignal.
// So ist jedes Bild des Films anders, auch während eine Station steht. Lebendig (seit Lab 0.1.17) rechnet die Grafikkarte den Effekt einer
// Station in jedem Bild neu, die Modulation folgt dem Klang Bild für Bild; ohne Grafikkarte bleibt es bei Stationen und Kamera.
import { GRENZEN, ergebnis, knoten, verlauf } from "./projekt.js";
import { moduliere, routeFuersProtokoll } from "./modulation.js";
import { bildfolge, routenAufloesen, eingaengeLaden } from "./ausfuehrung.js";
import { neuesBild, skalieren, luminanz, NACHT } from "./bilddaten.js";

export const STATIONEN_VERSION = "0.6.1";
/** der Eintritt (s, seit 0.6.0 / Lab 0.1.39): eine lebendige Quelle kommt über diese Zeit aus dem letzten Filmbild, statt mit ihrem ersten Bild zu beginnen */
export const EINTRITT = 2;

export const UEBERGAENGE = Object.freeze({
  blende: "Überblendung",
  schwelle: "Schwelle (die dunklen Stellen des Ziels zuerst)",
  verlauf: "Verlauf der Operation",
  schnitt: "Schnitt",
});

/** die zeitlichen Grössen des Films, beschrieben wie Parameter einer Operation: so kann moduliere() sie über die Stationen verteilen */
export const ZEITPARAMETER = Object.freeze([
  { id: "halten", name: "Halten je Station (s)", art: "zahl", min: 0, max: 12, standard: 1.5, schritt: 0.1 },
  { id: "uebergang", name: "Übergang (s)", art: "zahl", min: 0, max: 6, standard: 1, schritt: 0.1 },
]);
const ZEIT = { parameter: ZEITPARAMETER };
const rund = (x) => Math.round(x * 1000) / 1000;
const begrenze = (p, v) => Math.min(p.max, Math.max(p.min, Number.isFinite(Number(v)) ? Number(v) : p.standard));

/** die Bildzustände des Verlaufs bis zu einem Ergebnis (Material zuerst), die übliche Folge von Stationen */
export function stationenAusVerlauf(projekt, ergebnisId, typ = "IMAGE") {
  const { material, schritte } = verlauf(projekt, ergebnisId);
  return [material, ...schritte.map((s) => s.ergebnis)].filter((e) => e?.typ === typ).map((e) => e.id);
}

/** alle Varianten (Bilder, mit typ "AUDIO" Klänge) aller Schritte des Verlaufs bis zu einem Ergebnis, Schritt für Schritt (ohne Material) */
export function variantenAusVerlauf(projekt, ergebnisId, typ = "IMAGE") {
  return verlauf(projekt, ergebnisId).schritte.flatMap((s) => s.knoten.ausgaben).filter((id) => ergebnis(projekt, id)?.typ === typ);
}

/** Ist «nach» aus «von» durch eine Operation entstanden? Dann kann der Übergang deren eigener Verlauf sein. */
export function verlaufMoeglich(projekt, von, nach) {
  const e = ergebnis(projekt, nach);
  if (!e?.knoten || e.typ !== "IMAGE") return false;
  return Object.values(knoten(projekt, e.knoten)?.eingaben ?? {})[0] === von;
}

/** Liefert die Operation hinter einem Ergebnis ihre Bildzahl vorab (oder hat sie keinen eigenen Verlauf)? Dann streckt bildfolge() in einem Durchgang. */
function verlaufGestreckt(register, projekt, id) {
  const k = knoten(projekt, ergebnis(projekt, id)?.knoten), op = k ? register.hole(k.operation) : null;
  return Boolean(op && (!op.verlauf || op.verlaufBilder));
}

/** die Einsätze einer Ereignisfolge ab einer Mindeststärke, in Sekunden ab ihrem Beginn, aufsteigend und mindestens ein Bild auseinander */
function taktzeiten(daten, schwelle, fps) {
  const t = (daten?.ereignisse ?? []).filter((x) => (x.staerke ?? 1) >= schwelle && x.t > 0).map((x) => x.t).sort((a, b) => a - b);
  return t.filter((x, i) => i === 0 || x - t[i - 1] >= 1 / fps);
}

/**
 * Die Partitur: welche Station wann steht und wie sie in die nächste übergeht.
 * plan: { stationen: [ergebnisId | { ergebnis, uebergang?, halten?, einmal? }], halten, uebergang, art, routen, takt: { ereignisfolge, schwelle, wiederholen } | null, fps }
 * Eine Station mit eigenem halten (s) hält so lange statt wie eingestellt; mit einmal am Anfang oder Ende steht sie ausserhalb der Runde
 * im Takt (eine Titelkarte): sie kommt genau einmal, die Runde beginnt beim ersten Einsatz nach ihr (seit Partitur 0.4.0). Mit dehnen (einmal, hinten,
 * nicht die letzte) nimmt sie im Takt die übrige Zeit bis zum Ende des Tons auf, statt der letzten (seit 0.5.0, die Signatur: Outro vor dem Signet).
 * Ein Übergang «verlauf» ohne festen Takt behält die Länge, mit der die Operation ihren Verlauf rechnet (dauer null).
 * bewegung: { staerke 0–1, signal: CONTROL_SIGNAL | null } führt eine Kamera über die Bilder (0 oder ohne Angabe: keine Bewegung).
 * lebendig: true rechnet Stationen mit lebendiger Fassung ihrer Operation in jedem Bild neu (filmbilder({ lebendig }), medien/gpu.js).
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
  const staerke = Math.min(1, Math.max(0, Number(plan.bewegung?.staerke) || 0));
  if (staerke && plan.bewegung.signal && ergebnis(projekt, plan.bewegung.signal)?.typ !== "CONTROL_SIGNAL") throw new Error(`Bewegung: Steuersignal ${plan.bewegung.signal} gibt es nicht`);
  const bewegung = staerke ? { staerke: rund(staerke), signal: plan.bewegung.signal || null } : null;
  const lebendig = Boolean(plan.lebendig);

  // Takt aus einer Ereignisfolge: die Einsätze, und der Ton, aus dem sie gemessen wurden (für die Tonspur)
  let takt = null, zeiten = [];
  if (plan.takt?.ereignisfolge) {
    const f = ergebnis(projekt, plan.takt.ereignisfolge);
    if (f?.typ !== "EVENT_SEQUENCE") throw new Error(`Takt: Ereignisfolge ${plan.takt.ereignisfolge} gibt es nicht`);
    const schwelle = Math.min(1, Math.max(0, Number(plan.takt.schwelle) || 0));
    zeiten = taktzeiten(f.daten, schwelle, fps);
    if (!zeiten.length) throw new Error("Takt: die Ereignisfolge hat keine Einsätze über der Schwelle");
    // eine Klangtransformation (Rhythmus, Dekonstruktion) gibt die Ereignisfolge zu ihrem eigenen Klang aus: dann trägt dieser die Tonspur
    const k = f.knoten ? knoten(projekt, f.knoten) : null;
    const eigen = k?.ausgaben.map((id) => ergebnis(projekt, id)).find((x) => x?.typ === "AUDIO" && x.variante?.seed === f.variante?.seed);
    const tonId = eigen?.id ?? (k ? Object.values(k.eingaben).find((id) => ergebnis(projekt, id)?.typ === "AUDIO") ?? null : null);
    takt = { ereignisfolge: f.id, schwelle, wiederholen: Boolean(plan.takt.wiederholen), einsaetze: zeiten.length, ton: tonId, tonBeginn: f.daten.beginn ?? 0, tonDauer: f.daten.dauer ?? null };
  }
  // die Folge: jede Station einmal, oder im Takt reihum, bis die Einsätze aufgebraucht sind. Stationen mit «einmal» am Anfang oder
  // Ende stehen ausserhalb der Runde: vorn mit eigener Dauer, dann die Runde ab dem ersten Einsatz danach, hinten bis zum Schluss
  let folge;
  if (takt?.wiederholen) {
    const vorne = [], hinten = [];
    let a = 0, b = st.length;
    while (a < b && st[a].einmal) vorne.push(st[a++]);
    while (b > a && st[b - 1].einmal) hinten.unshift(st[--b]);
    const mitte = b > a ? st.slice(a, b) : st;
    const dauerVon = (k) => k.reduce((s, x) => s + begrenze(ZEITPARAMETER[0], x.halten ?? grund.halten) + (x.uebergang === "schnitt" ? 0 : grund.uebergang), 0);
    const t0 = dauerVon(vorne), tEnde = hinten.length && takt.tonDauer ? takt.tonDauer - dauerVon(hinten) : Infinity;   // die Karten hinten brauchen ihre Zeit vor dem Ende des Tons
    const rest = zeiten.filter((z) => z > t0 && z <= tEnde);
    const runde = Math.max(1, Math.min(GRENZEN.stationen * 8, rest.length + (hinten.length ? 0 : 1)));
    folge = [...vorne.map((s) => ({ ...s, ein: undefined })), ...Array.from({ length: runde }, (_, i) => ({ ...mitte[i % mitte.length], ein: rest[i] })), ...hinten.map((s) => ({ ...s, ein: undefined }))];
  } else folge = st.map((s) => ({ ...s, ein: undefined }));

  let t = 0, offen = 0;
  const eintraege = folge.map((s, j) => {
    const u = folge.length > 1 ? j / (folge.length - 1) : 0.5;
    const p = { ...moduliere(ZEIT, grund, routen, u) };
    if (Number.isFinite(Number(s.halten))) p.halten = begrenze(ZEITPARAMETER[0], s.halten);   // eigene Dauer der Station
    return { ergebnis: s.ergebnis, stelle: rund(u), p, art: UEBERGAENGE[s.uebergang] ? s.uebergang : art, ein: s.ein, einmal: Boolean(s.einmal), dehnen: Boolean(s.dehnen) };
  });
  const out = eintraege.map((x, j) => {
    const naechste = eintraege[j + 1];
    const beginn = t;
    if (!naechste) {   // die letzte Station: halten, im Takt bis zum Ende des Tons
      const halten = takt?.tonDauer ? Math.max(1 / fps, takt.tonDauer - beginn) : x.p.halten;
      t += halten;
      return { ergebnis: x.ergebnis, stelle: x.stelle, beginn: rund(beginn), halten: rund(halten), uebergang: null, ...(x.einmal ? { einmal: true } : {}), ...(x.dehnen ? { dehnen: true } : {}) };
    }
    let a = x.art, hinweis;
    if (a === "verlauf" && !verlaufMoeglich(projekt, x.ergebnis, naechste.ergebnis)) { a = "blende"; hinweis = "kein eigener Verlauf: die nächste Station ist nicht aus dieser entstanden, darum Überblendung"; }
    let halten = x.p.halten, dauer = a === "schnitt" ? 0 : x.p.uebergang;
    const ein = x.ein;
    if (ein !== undefined) {   // ein Einsatz löst den Wechsel aus; der Übergang endet spätestens beim nächsten Einsatz
      halten = Math.max(0, ein - beginn);
      const luecke = (zeiten.find((z) => z > ein) ?? Infinity) - ein;   // bis zum nächsten Einsatz (vor der Runde können Karten stehen, darum nicht über j)
      if (a !== "schnitt") dauer = Math.min(dauer, luecke);
      if (dauer < 1 / fps) { dauer = 0; if (a !== "schnitt") hinweis = "zu wenig Zeit bis zum nächsten Einsatz, darum Schnitt"; a = "schnitt"; }
    } else if (a === "verlauf") { dauer = null; offen++; }   // eigene Länge der Operation
    t += halten + (dauer ?? 0);
    return { ergebnis: x.ergebnis, stelle: x.stelle, beginn: rund(beginn), halten: rund(halten), uebergang: { art: a, dauer: dauer === null ? null : rund(dauer), ...(hinweis ? { hinweis } : {}) }, ...(x.einmal ? { einmal: true } : {}), ...(x.dehnen ? { dehnen: true } : {}) };
  });
  // dehnen (seit Partitur 0.5.0, die Signatur): im Takt bis zum Ende des Tons bekommt nicht die letzte Station die übrige Zeit, sondern die
  // gedehnte davor (das Outro); die letzte (das Signet) behält ihre eigene Dauer und endet mit dem Ton
  const d = takt?.tonDauer ? eintraege.findIndex((x, j) => x.dehnen && x.einmal && j < eintraege.length - 1) : -1;
  if (d >= 0) {
    const letzte = out.at(-1), soll = eintraege.at(-1).p.halten, rest = rund(letzte.halten - soll);
    if (rest > 0) {
      out[d].halten = rund(out[d].halten + rest);
      for (let j = d + 1; j < out.length; j++) out[j].beginn = rund(out[j].beginn + rest);
      letzte.halten = rund(soll);
    }
  }
  const bilder = Math.max(1, Math.round(t * fps));
  if (bilder > GRENZEN.filmBilder) throw new Error(`Grenze: höchstens ${GRENZEN.filmBilder} Bilder (${Math.round(GRENZEN.filmBilder / fps)} s), geplant sind ${bilder}`);
  return {
    version: STATIONEN_VERSION, fps, art, halten: grund.halten, uebergang: grund.uebergang,
    routen: (plan.routen ?? []).map(routeFuersProtokoll), takt, bewegung, lebendig, folge: out, dauer: rund(t), bilder, offen,
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
export async function* filmbilder({ partitur: pt, projekt, ...rest }) {
  const quelle = stationsbilder({ partitur: pt, projekt, ...rest });
  if (!pt.bewegung) { yield* quelle; return; }
  const sig = pt.bewegung.signal ? ergebnis(projekt, pt.bewegung.signal)?.daten : null, ruhe = kartenRuhe(pt);
  let n = 0;
  for await (const b of quelle) { const t = n++ / pt.fps, k = ruhe(t); yield k <= 0 ? b : kamera(b, t, pt.bewegung.staerke * k, sig); }
}

/** Titelkarten («einmal») stehen still: Faktor 0 der Kamera, solange sie stehen; über den Übergang hinaus oder hinein eine Rampe; sonst 1 */
function kartenRuhe(pt) {
  const fenster = [];
  pt.folge.forEach((x, j) => {
    if (!x.einmal) return;
    const ende = x.beginn + x.halten, d = x.uebergang?.dauer ?? 0, vor = pt.folge[j - 1], dv = vor?.uebergang?.dauer ?? 0;
    fenster.push({ von: x.beginn, bis: ende, a: 0, b: 0 });
    if (d > 0) fenster.push({ von: ende, bis: ende + d, a: 0, b: 1 });   // hinaus: die Kamera kommt
    if (vor && !vor.einmal && dv > 0) fenster.push({ von: x.beginn - dv, bis: x.beginn, a: 1, b: 0 });   // hinein: die Kamera geht
  });
  if (!fenster.length) return () => 1;
  return (t) => { for (const f of fenster) if (t >= f.von && t < f.bis) return f.a + ((f.b - f.a) * (t - f.von)) / (f.bis - f.von); return 1; };
}

/** die Lautstärke (0–1) eines Steuersignals zur Zeit t (s), linear zwischen den Proben; ohne Signal 0 */
function signalBei(sig, t) {
  const w = sig?.werte;
  if (!w?.length) return 0;
  const je = sig.je ?? (sig.dauer ?? 30) / w.length, p = Math.min(w.length - 1, Math.max(0, t / je)), i = Math.floor(p), f = p - i;
  return (w[i] ?? 0) * (1 - f) + (w[Math.min(w.length - 1, i + 1)] ?? 0) * f;
}

/** die Lage der Kamera zur Zeit t: Zoom (atmet mit dem Signal), Versatz (Anteil der Bildgrösse) und Drehung (rad); langsame, teilerfremde Perioden */
export function kameraLage(t, staerke, laut = 0) {
  const w = (p) => Math.sin((2 * Math.PI * t) / p);
  return {
    zoom: 1 + staerke * (0.1 + 0.03 * w(9.7) + 0.16 * laut),
    dx: staerke * 0.035 * w(11.3), dy: staerke * 0.025 * Math.cos((2 * Math.PI * t) / 13.1),
    drehung: staerke * 0.025 * w(17.9),
  };
}

/** ein Bild durch die Kamera: um die Mitte gezoomt, gedreht und verschoben, bilinear abgetastet, am Rand gehalten */
function kamera(b, t, staerke, sig) {
  const { zoom, dx, dy, drehung } = kameraLage(t, staerke, signalBei(sig, t));
  const W = b.width, H = b.height, out = neuesBild(W, H), d = b.data, o = out.data;
  const c = Math.cos(drehung) / zoom, s = Math.sin(drehung) / zoom, mx = W / 2 + dx * W, my = H / 2 + dy * H;
  for (let y = 0, k = 0; y < H; y++) {
    const v = y - H / 2 + 0.5, u = 0.5 - W / 2;
    let sx = mx + u * c - v * s - 0.5, sy = my + u * s + v * c - 0.5;
    for (let x = 0; x < W; x++, k += 4, sx += c, sy += s) {
      const px = Math.min(W - 1.001, Math.max(0, sx)), py = Math.min(H - 1.001, Math.max(0, sy));
      const x0 = px | 0, y0 = py | 0, fx = px - x0, fy = py - y0, i = (y0 * W + x0) * 4, j = i + W * 4;
      const a = (1 - fx) * (1 - fy), e = fx * (1 - fy), g = (1 - fx) * fy, h = fx * fy;
      o[k] = d[i] * a + d[i + 4] * e + d[j] * g + d[j + 4] * h;
      o[k + 1] = d[i + 1] * a + d[i + 5] * e + d[j + 1] * g + d[j + 5] * h;
      o[k + 2] = d[i + 2] * a + d[i + 6] * e + d[j + 2] * g + d[j + 6] * h;
      o[k + 3] = 255;
    }
  }
  return out;
}

async function* stationsbilder({ register, projekt, medien, partitur: pt, seite = 1280, abbrechen = null, zeitplan = [], lebendig = null }) {
  const roh = async (id) => medien.bild(ergebnis(projekt, id));
  const { breite: W, hoehe: H } = filmgroesse(await roh(pt.folge[0].ergebnis), seite);
  const vorrat = new Map();
  const bild = async (id) => { if (!vorrat.has(id)) { if (vorrat.size > 3) vorrat.delete(vorrat.keys().next().value); vorrat.set(id, einpassen(await roh(id), W, H)); } return vorrat.get(id); };
  const fps = pt.fps;
  let n = 0, soll = 0;
  // lebendig (medien/gpu.js): eine Station, die eine Operation mit lebendiger Fassung ergeben hat, wird in jedem Bild neu gerechnet,
  // auf ihrem Eingang, mit den Parametern zu diesem Zeitpunkt: dieselben Routen, die die Varianten verteilt haben, laufen über die Zeit des Films.
  // Eigene Bühnen (seit 0.1.21, op.lebend, PHORMA): die Operation baut ihre Bühne einmal je Knoten und gibt bild(t, lage) zur Filmzeit t, so läuft die
  // Szene im Takt der Tonspur weiter, während ihre Standbilder als Stationen stehen; am Ende wird jede Bühne entsorgt. Seit 0.1.22 kann die Bühne
  // ihre Zeit ab dem Auftritt ihrer Stationen zählen (zeitbasis "auftritt": PHORMA I und II, The Fictory) und bekommt die Lage der Station mit
  const mitGpu = pt.lebendig && lebendig ? lebendig : null, lagen = new Map(), eingaenge = new Map(), eigene = new Map();
  const lage = async (id) => {
    if (!pt.lebendig) return null;
    if (lagen.has(id)) return lagen.get(id);
    const e = ergebnis(projekt, id), k = e?.knoten ? knoten(projekt, e.knoten) : null;
    const op = k && register.hat(k.operation) ? register.hole(k.operation) : null;
    const nurBild = k && Object.entries(k.eingaben ?? {}).every(([name, v]) => name === "bild" || !v);
    let l = null;
    if (op?.lebend && (op.verfuegbar?.() ?? true)) {
      if (!eigene.has(k.id)) {
        const ein = await eingaengeLaden(op, projekt, medien, k.eingaben);
        eigene.set(k.id, await op.lebend(ein, e.variante?.parameter ?? k.parameter, { seed: (e.variante?.seed ?? k.seed ?? 1) >>> 0, abbrechen }));
      }
      l = { eigen: eigene.get(k.id), quelle: `eigen:${k.id}` };
    } else if (k && nurBild && k.eingaben.bild && mitGpu?.kann(k.operation)) {
      // seit 0.6.0 je Knoten (nicht je Station): die Varianten eines Knotens sind dasselbe lebendige Bild zur Filmzeit, darum behält die Rückkopplung
      // ihren Zustand über alle Stationen des Knotens (schluessel) und beginnt nicht an jeder Station wieder beim Eingang (das war das Ausgangsbild,
      // das im Film alle halbe Sekunde aufblitzte); auch der Startwert ist der des Knotens, damit kein Rauschen springt
      const op = register.hole(k.operation), routen = routenAufloesen(projekt, k.variation?.routen ?? []), fest = e.variante?.parameter ?? k.parameter;
      l = { operation: k.operation, eingang: k.eingaben.bild, seed: (k.seed ?? e.variante?.seed ?? 1) >>> 0, schluessel: k.id, quelle: `gpu:${k.id}`,
        parameter: (t) => (routen.length ? moduliere(op, k.parameter, routen, Math.min(1, Math.max(0, t / Math.max(1e-3, pt.dauer)))) : fest) };
    }
    lagen.set(id, l);
    return l;
  };
  // anteil: wie weit die Station in ihrem Halten ist (0..1; beim Übergang 1 für die gehende, 0 für die kommende) – für Bühnen, die ihre Stationen
  // kennen (The Fictory läuft so von Zustand zu Zustand); eine Bühne mit zeitbasis «auftritt» zählt ihre Zeit ab dem ersten Bild ihrer Stationen
  // der Eintritt (seit 0.6.0): das erste Bild einer lebendigen Quelle (ein Knoten auf der Grafikkarte, eine eigene Bühne) ist selten das, was vorher
  // lief – eine Szene von PHORMA beginnt schwarz, die Rückkopplung beim Eingang, der Zerfall beim ganzen Bild, das Outro beim Standbild. Darum
  // kommt jede Quelle über EINTRITT Sekunden aus dem letzten Filmbild vor ihrem ersten Bild (Überblendung), bei einem Schnitt wie in einem
  // Übergang; danach läuft ihr Bild rein. Christian (25. Oktober 2026): «kurze schwarze Bilder oder das Ausgangsbild … etwas fliessender»
  let letztes = null;   // das zuletzt ausgegebene Filmbild
  const merk = (b) => { letztes = b; return b; };
  const eintritte = new Map(), rohe = new Map(), je = Math.max(1, Math.round(EINTRITT * fps));
  const eintritt = (quelle, b) => {
    rohe.set(quelle, b);   // das reine Bild der Quelle (die Maske einer Schwelle nimmt es, nicht die Mischung)
    let e = eintritte.get(quelle);
    if (!e) { e = { ab: n, von: letztes }; eintritte.set(quelle, e); }
    if (!e.von) return b;
    const k = (n - e.ab + 1) / (je + 1);
    if (k >= 1 || e.von.width !== b.width || e.von.height !== b.height) { e.von = null; return b; }
    return blende(e.von, b, k);
  };
  const bilder = new Map();   // je Quelle das Bild dieses Filmbilds (ein Übergang zwischen zwei Stationen desselben Knotens fragt zweimal)
  // eine Quelle loslassen, wenn ihre letzte Station vorbei ist (seit 0.6.0 je Knoten, vorher je Station): Eintritt, Bild, Zustand der Rückkopplung
  const loslassen = async (id) => { const l = await lage(id); if (!l) return; eintritte.delete(l.quelle); bilder.delete(l.quelle); rohe.delete(l.quelle); if (l.schluessel) mitGpu?.vergiss?.(l.schluessel); };
  const lebend = async (j, id, anteil = 0) => {
    const l = await lage(id);
    if (!l) return null;
    if (l.eigen) {
      const e = l.eigen;
      if (e.zeitbasis === "auftritt") e.auftrittBild ??= n;
      const t = (n - (e.zeitbasis === "auftritt" ? e.auftrittBild : 0)) / fps, erg = ergebnis(projekt, id);
      // das Folgende (seit 0.6.1): eine Bühne, die ab e.folgendAb (s ihrer Zeit) in die nächste Station führt (der Scratch des Intros), bekommt deren
      // laufendes Bild als lage.folgend; die folgende Quelle tritt damit schon hier auf, ihr Eintritt beginnt bei ihrem eigenen Standbild (nicht bei
      // der Bühne), und nach dem Schnitt läuft sie weiter. Christian (25. Oktober 2026): «besser, wenn der Scratch mit dem ersten Effekt einsetzt»
      let folgend = null;
      if (Number.isFinite(e.folgendAb) && t >= e.folgendAb && j + 1 < pt.folge.length) {
        const zielId = pt.folge[j + 1].ergebnis, lz = await lage(zielId);
        if (lz && !eintritte.has(lz.quelle)) eintritte.set(lz.quelle, { ab: n, von: await bild(zielId) });
        folgend = (await lebend(j + 1, zielId, 0)) ?? (await bild(zielId));
      }
      const b = await e.bild(t, { station: j, ergebnis: id, variante: erg?.variante ?? null, anteil: Math.min(1, Math.max(0, anteil)), halten: pt.folge[j]?.halten ?? null, folgend });
      return eintritt(l.quelle, b.width === W && b.height === H ? b : einpassen(b, W, H));
    }
    const schon = bilder.get(l.quelle);
    if (schon?.n === n) return schon.bild;
    if (!eingaenge.has(l.eingang)) { if (eingaenge.size > 3) eingaenge.delete(eingaenge.keys().next().value); eingaenge.set(l.eingang, await roh(l.eingang)); }
    const t = n / fps;
    const b = eintritt(l.quelle, mitGpu.bild({ operation: l.operation, eingang: eingaenge.get(l.eingang), parameter: l.parameter(t), seed: l.seed, t, schritt: n, schluessel: l.schluessel, W, H }));
    bilder.set(l.quelle, { n, bild: b });
    return b;
  };
  const grenze = () => { if (n > GRENZEN.filmBilder) throw new Error(`Grenze: höchstens ${GRENZEN.filmBilder} Bilder je Film`); };
  try {
  for (const [j, x] of pt.folge.entries()) {
    abbrechen?.throwIfAborted?.();
    const a = await bild(x.ergebnis), ab = n;
    soll += x.halten;
    const bis = Math.max(ab + 1, Math.round(soll * fps));
    do { yield merk((await lebend(j, x.ergebnis, (n - ab) / Math.max(1, bis - 1 - ab))) ?? a); n++; } while (n < Math.round(soll * fps));
    const ue = x.uebergang, eintrag = { ergebnis: x.ergebnis, ab: rund(ab / fps), bild: ab, uebergang: ue?.art ?? null, bilder: 0, ...((await lage(x.ergebnis)) ? { lebendig: true } : {}) };
    zeitplan.push(eintrag);
    if (!ue) { eintrag.bilder = n - ab; await loslassen(x.ergebnis); break; }
    const ziel = pt.folge[j + 1].ergebnis;
    // ein Verlauf in eine lebendige Station (seit 0.6.0): der Verlauf der Operation geht von Standbild zu Standbild, während davor und danach das
    // laufende Bild steht – zwei Sprünge. Die lebendige Station entwickelt sich selbst aus ihrem Eingang (Rückkopplung, Szene), darum wird der
    // Wechsel eine Überblendung gleicher Länge (ohne feste Länge: die des Plans), und die Quelle kommt mit ihrem Eintritt
    let art = ue.art, dauerUe = ue.dauer;
    if (art === "verlauf" && (await lage(ziel))) { art = "blende"; dauerUe = ue.dauer ?? pt.uebergang; eintrag.hinweis = "lebendig: Überblendung statt Verlauf"; }
    if (art === "verlauf") {
      const folge = () => bildfolge({ register, projekt, medien, ergebnisId: ziel, abbrechen });
      if (ue.dauer === null) {   // eigene Länge: jedes Bild des Verlaufs
        for await (const f of folge()) { yield merk(einpassen(f, W, H)); n++; grenze(); }
        soll = n / fps;
      } else if (verlaufGestreckt(register, projekt, ziel)) {   // feste Länge, die Operation kennt ihre Bildzahl: in einem Durchgang gestreckt
        const m = Math.round((soll + ue.dauer) * fps) - n;
        let q = 0;
        if (m > 0) for await (const f of bildfolge({ register, projekt, medien, ergebnisId: ziel, abbrechen, bilder: m })) { if (q >= m) break; yield merk(einpassen(f, W, H)); n++; q++; }
        while (q > 0 && q < m) { yield letztes; n++; q++; }
        soll += ue.dauer;
      } else {   // feste Länge (Takt): die Bilder des Verlaufs gleichmässig auswählen, dafür erst zählen
        const m = Math.round((soll + ue.dauer) * fps) - n;
        let N = 0;
        for await (const f of folge()) { void f; N++; }
        const stelle = (q) => (m === 1 ? N - 1 : Math.round((q * (N - 1)) / (m - 1)));   // aufsteigend: Bild q des Films zeigt Bild stelle(q) des Verlaufs
        let i = 0, q = 0;
        for await (const f of folge()) {
          if (q < m && stelle(q) === i) { const b = einpassen(f, W, H); while (q < m && stelle(q) === i) { yield merk(b); n++; q++; } }
          i++;
        }
        soll += ue.dauer;
      }
    } else if (art !== "schnitt") {
      // Schwelle: die Maske ist die Helligkeit im Ziel. Bei einer lebendigen Station ist das Ziel das laufende Bild, nicht ihr Standbild (seit 0.1.35):
      // das Standbild des Outros der Signatur zeigt das Rad von ORNA mit der Konstellation, und als Maske liess es das Rad schon über den Kacheln erscheinen
      const b = await bild(ziel), lz = await lage(ziel), hell = art === "schwelle" && !lz ? helligkeit(b) : null;
      const m = Math.round((soll + dauerUe) * fps) - n;
      for (let i = 1; i <= m; i++) {
        abbrechen?.throwIfAborted?.();
        const a1 = (await lebend(j, x.ergebnis, 1)) ?? a;
        // im Übergang kommt die neue Quelle aus dem laufenden Bild der gehenden Station, nicht aus einem eingefrorenen (ihr Eintritt läuft weiter)
        const ez = lz && lz.quelle !== (await lage(x.ergebnis))?.quelle ? eintritte.get(lz.quelle) : null; if (ez?.von) ez.von = a1;
        const b1 = (await lebend(j + 1, ziel, 0)) ?? b;
        const maske = art === "schwelle" ? hell ?? helligkeit((lz && rohe.get(lz.quelle)) || b1) : null;
        yield merk(maske ? schwelle(a1, b1, maske, i / (m + 1)) : blende(a1, b1, i / (m + 1))); n++;
      }
      soll += dauerUe;
    }
    eintrag.bilder = n - ab;
    if ((await lage(x.ergebnis))?.quelle !== (await lage(ziel))?.quelle) await loslassen(x.ergebnis);   // die nächste Station hat eine andere Quelle
    grenze();
  }
  } finally { for (const b of eigene.values()) { try { b.entsorgen?.(); } catch { /* schon weg */ } } }
}
