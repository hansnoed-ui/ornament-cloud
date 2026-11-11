// ORNAMENT LAB – Beat aus Bild oder Video (seit Lab 0.1.24). Ohne DOM, in reinem JavaScript wie der Klangerzeuger (kern/klang.js):
// derselbe Startwert ergibt in jedem Browser und in Node denselben Beat.
//   messen:   jedes Bild (bei einem Video jedes Standbild) wird gemessen: Helligkeit, Kontrast, Sättigung und Farbton, Feinheit der
//             Kanten, Schwerpunkt und Symmetrie (kompositorisches Profil, kern/komposition.js); zwischen den Standbildern die Bewegung.
//             Daraus feste Stufen (BEAT_MERKMALE in jev/fragen.js). jev sieht nur diese Stufen, nie das Bild.
//   wählen:   acht Stellen (Tempo, Groove, Schlagzeug, Tonart, Bass, Melodie, Verlauf, Fläche) aus festen Katalogen (BEAT_FRAGEN), entweder nach
//             offen gelegten Regeln (regelPlan) oder aus den Wahrscheinlichkeiten von jev gezogen (planAusJev).
//   rechnen:  beatRechnen() spielt den Plan als Schlagzeug, Bass und Melodie in Stereo. Abbildungen, die nicht gewählt werden: der Farbton
//             gibt den Grundton (Farbkreis in zwölf Halbtönen), die Feinheit das Tempo innerhalb seiner Stufe und die Dichte der Becken,
//             die Bildzeilen die Tonhöhe der Melodie, jedes Standbild eines Videos einen Abschnitt.
// Das ist eine gestalterische Abbildung, keine Deutung des Bildes.
import { begrenzen, skalieren, luminanz } from "./bilddaten.js";
import { profil } from "./komposition.js";
import { RATE, ton, nachhall } from "./klang.js";
import { euklid, pegeln } from "./klangwerk.js";
import { mastern, bewegtesFilter, zerkleinern } from "./mischpult.js";
import { BEAT_FRAGEN } from "../jev/fragen.js";
import { zufall } from "../../../alpha/the-fictory/analyse.js?v=23";

export const BEAT_VERSION = "0.4.0";
export const ABSCHNITTE_HOECHSTENS = 6;
const rund = (x, s = 1000) => Math.round(x * s) / s;
const mittel = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
const stufe = (v, unten, oben, [a, b, c]) => (v < unten ? a : v > oben ? c : b);

// ---------- messen ----------
/** Feinheit: mittlerer Helligkeitsunterschied zu den Nachbarn rechts und unten (0 ganz glatt; ein Foto liegt meist bei 0,02–0,1) */
function feinheit(b) {
  const { width: w, height: h, data: d } = b, L = new Float32Array(w * h);
  for (let i = 0; i < L.length; i++) L[i] = luminanz(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) / 255;
  let s = 0, n = 0;
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) { const i = y * w + x; s += Math.abs(L[i + 1] - L[i]) + Math.abs(L[i + w] - L[i]); n++; }
  return { wert: n ? s / n : 0, L };
}
/** die Helligkeit je Spalte: Zeile und Wert der hellsten Stelle und das Mittel (für die Melodie aus dem Bild) */
function spalten(L, w, h) {
  return Array.from({ length: w }, (_, x) => {
    let best = 0, by = 0, s = 0;
    for (let y = 0; y < h; y++) { const v = L[y * w + x]; s += v; if (v > best) { best = v; by = y; } }
    return { y: h > 1 ? by / (h - 1) : 0.5, spitze: best, mittel: s / h };
  });
}
/** die hellsten Punkte, je Zelle eines groben Rasters höchstens einer (für die Glocken) */
function lichter(L, w, h, anzahl) {
  const zx = 8, zy = 6, out = [];
  for (let cy = 0; cy < zy; cy++) for (let cx = 0; cx < zx; cx++) {
    let best = -1, bx = 0, by = 0;
    for (let y = Math.floor((cy * h) / zy); y < Math.floor(((cy + 1) * h) / zy); y++) for (let x = Math.floor((cx * w) / zx); x < Math.floor(((cx + 1) * w) / zx); x++) {
      const v = L[y * w + x]; if (v > best) { best = v; bx = x; by = y; }
    }
    if (best >= 0) out.push({ x: w > 1 ? bx / (w - 1) : 0.5, y: h > 1 ? by / (h - 1) : 0.5, v: best });
  }
  return out.sort((a, b) => b.v - a.v || a.x - b.x).slice(0, anzahl);
}
/** mittlerer Helligkeitsunterschied zweier Standbilder (0 gleich, 1 schwarz gegen weiss) */
function unterschied(a, b) {
  const c = b.width === a.width && b.height === a.height ? b : skalieren(b, a.width, a.height);
  let s = 0;
  for (let i = 0; i < a.data.length; i += 4) s += Math.abs(luminanz(a.data[i], a.data[i + 1], a.data[i + 2]) - luminanz(c.data[i], c.data[i + 1], c.data[i + 2])) / 255;
  return s / (a.width * a.height);
}

/**
 * Bilder messen: eines oder (bei einem Video) bis zu sechs Standbilder in zeitlicher Folge. Gibt { merkmale, werte, abschnitte } zurück;
 * merkmale in den Stufen von BEAT_MERKMALE, werte als Zahlen fürs Protokoll, abschnitte je Bild das, was die Melodie und die Dichte lesen.
 */
export function beatMessen(bilder) {
  if (!bilder?.length) throw new Error("Beat: kein Bild");
  const klein = bilder.slice(0, ABSCHNITTE_HOECHSTENS).map((b) => begrenzen(b, 128));
  const abschnitte = klein.map((b) => {
    const p = profil(b), f = feinheit(b);
    return { b, profil: p, feinheit: f.wert, spalten: spalten(f.L, b.width, b.height), lichter: lichter(f.L, b.width, b.height, 12) };
  });
  const bewegung = klein.slice(1).map((b, i) => unterschied(klein[i], b));
  abschnitte.forEach((a, i) => { a.bewegung = bewegung.length ? (bewegung[i - 1] ?? bewegung[0]) : 0; });
  const P = abschnitte.map((a) => a.profil);
  // Farbton als Kreismittel, gewichtet mit Sättigung und Bündelung (ein bunter, einheitlicher Farbton zählt mehr)
  let fx = 0, fy = 0, fw = 0;
  for (const p of P) { const g = p.farbe.saettigung * p.farbe.buendelung, r = (p.farbe.farbton * Math.PI) / 180; fx += g * Math.cos(r); fy += g * Math.sin(r); fw += p.farbe.saettigung; }
  const farbton = (((Math.atan2(fy, fx) * 180) / Math.PI) + 360) % 360, buendelung = fw > 1e-9 ? Math.hypot(fx, fy) / fw : 0;
  const werte = {
    helligkeit: rund(mittel(P.map((p) => p.licht.helligkeit))), kontrast: rund(mittel(P.map((p) => p.kontrast.gesamt))),
    saettigung: rund(mittel(P.map((p) => p.farbe.saettigung))), farbton: Math.round(farbton), buendelung: rund(buendelung),
    feinheit: rund(mittel(abschnitte.map((a) => a.feinheit)), 1e4), schwerpunktX: rund(mittel(P.map((p) => p.schwerpunkt.x))), schwerpunktY: rund(mittel(P.map((p) => p.schwerpunkt.y))),
    symmetrie: rund(mittel(P.map((p) => Math.max(p.symmetrie.linksRechts, p.symmetrie.obenUnten)))),
    bewegung: rund(mittel(bewegung), 1e4), bilder: abschnitte.length,
  };
  const warm = farbton >= 330 || farbton < 75, kalt = farbton >= 120 && farbton < 300;
  const merkmale = {
    helligkeit: stufe(werte.helligkeit, 0.35, 0.65, ["dunkel", "mittel", "hell"]),
    kontrast: stufe(werte.kontrast, 0.14, 0.26, ["niedrig", "mittel", "hoch"]),
    farbigkeit: stufe(werte.saettigung, 0.06, 0.2, ["grau", "gedaempft", "bunt"]),
    farbton: werte.saettigung < 0.04 || buendelung < 0.25 ? "neutral" : warm ? "warm" : kalt ? "kalt" : "neutral",
    detail: stufe(werte.feinheit, 0.035, 0.08, ["glatt", "mittel", "fein"]),
    schwerpunkt: stufe(werte.schwerpunktY, -0.06, 0.06, ["oben", "mitte", "unten"]),
    symmetrie: werte.symmetrie >= 0.8 ? "symmetrisch" : "asymmetrisch",
    bewegung: abschnitte.length < 2 ? "still" : stufe(werte.bewegung, 0.05, 0.14, ["ruhig", "bewegt", "heftig"]),
  };
  return { merkmale, werte, abschnitte };
}

// ---------- wählen ----------
/** feste, offen gelegte Regeln: [Stelle, Wert, Merkmal, Stufe, Gewicht, Grund]. Kein Urteil über das Bild, nur eine Zuordnung. */
export const BEAT_REGELN = Object.freeze([
  ["tempo", "rasend", "bewegung", "heftig", 2, "heftige Bewegung trägt ein rasendes Tempo"],
  ["tempo", "schnell", "bewegung", "bewegt", 2, "deutliche Bewegung trägt ein schnelles Tempo"],
  ["tempo", "mittel", "bewegung", "ruhig", 1.5, "wenig Bewegung: ein mittleres Tempo"],
  ["tempo", "schnell", "detail", "fein", 1, "viele feine Einzelheiten werden zu schnellen Schlägen"],
  ["tempo", "langsam", "detail", "glatt", 1.5, "grosse ruhige Flächen tragen ein langsames Tempo"],
  ["tempo", "langsam", "helligkeit", "dunkel", 0.5, "ein dunkles Bild wird langsamer"],
  ["tempo", "schnell", "kontrast", "hoch", 0.5, "hoher Kontrast macht es schneller"],
  ["groove", "gerade", "symmetrie", "symmetrisch", 2, "ein spiegelgleiches Bild wird zu einem geraden Groove"],
  ["groove", "breakbeat", "symmetrie", "asymmetrisch", 1, "ein asymmetrisches Bild wird synkopiert"],
  ["groove", "halftime", "schwerpunkt", "unten", 1.5, "ein Gewicht unten wird schwer und breit"],
  ["groove", "euklidisch", "detail", "fein", 1, "feine Einzelheiten verteilen sich gleichmässig"],
  ["groove", "schleppend", "bewegung", "ruhig", 1, "eine ruhige Bewegung schleppt"],
  ["groove", "schleppend", "farbton", "warm", 0.5, "warme Farben swingen"],
  ["groove", "breakbeat", "bewegung", "heftig", 1, "heftige Bewegung bricht den Takt"],
  ["groove", "dnb", "bewegung", "heftig", 2, "heftige Bewegung trägt Drum and Bass"],
  ["groove", "dnb", "bewegung", "bewegt", 1.5, "deutliche Bewegung trägt Drum and Bass"],
  ["groove", "dnb", "detail", "fein", 1, "feine Einzelheiten werden zu gebrochenen Schlägen"],
  ["kit", "trocken", "farbigkeit", "grau", 1.5, "ein Bild fast ohne Farbe klingt trocken"],
  ["kit", "elektronisch", "farbigkeit", "bunt", 1.5, "kräftige Farben klingen elektronisch"],
  ["kit", "elektronisch", "kontrast", "hoch", 1, "hoher Kontrast: tiefe Bassdrum und Klatschen"],
  ["kit", "metallisch", "detail", "fein", 1.5, "feine Kanten klirren"],
  ["kit", "metallisch", "farbton", "kalt", 0.5, "kalte Farben klingen metallisch"],
  ["kit", "weich", "kontrast", "niedrig", 1.5, "niedriger Kontrast klingt weich"],
  ["kit", "weich", "helligkeit", "hell", 0.5, "ein helles Bild klingt weich"],
  ["kit", "jazz", "farbigkeit", "gedaempft", 1, "gedämpfte Farben klingen nach Besen und Ride"],
  ["kit", "jazz", "helligkeit", "dunkel", 0.5, "ein dunkles Bild klingt nach einem Jazzkeller"],
  ["kit", "hand", "farbton", "warm", 1, "warme Farben klingen nach Handtrommeln"],
  ["kit", "hand", "schwerpunkt", "unten", 0.5, "ein Gewicht unten klingt nach tiefen Fellen"],
  ["kit", "glitch", "detail", "fein", 1.5, "feine Kanten zerfallen in Klicks"],
  ["kit", "glitch", "kontrast", "hoch", 1, "harte Kontraste klingen nach kaputter Elektronik"],
  ["groove", "gefrikel", "detail", "fein", 0.75, "viele feine Einzelheiten werden zu Elektro-Gefrikel"],
  ["groove", "gefrikel", "kontrast", "hoch", 0.5, "harte Kontraste stottern"],
  ["groove", "maqsum", "farbton", "warm", 1, "warme Farben gehen im Maqsum, dem Grundrhythmus des Orients"],
  ["tonart", "dur", "helligkeit", "hell", 2, "ein helles Bild steht in Dur"],
  ["tonart", "moll", "helligkeit", "dunkel", 2, "ein dunkles Bild steht in Moll"],
  ["tonart", "dorisch", "helligkeit", "mittel", 1, "mittlere Helligkeit: Moll mit einem hellen Ton"],
  ["tonart", "dur", "farbton", "warm", 0.5, "warme Farben klingen nach Dur"],
  ["tonart", "phrygisch", "farbton", "kalt", 0.75, "kalte Farben klingen fremd"],
  ["tonart", "pentatonik", "farbigkeit", "grau", 1.5, "ohne Farbe: fünf Töne, nichts reibt"],
  ["tonart", "phrygisch", "helligkeit", "dunkel", 1, "ein dunkles Bild klingt dunkel und fremd"],
  ["tonart", "hijaz", "farbton", "warm", 1, "warme Farben klingen nach dem Orient"],
  ["tonart", "hijaz", "detail", "fein", 0.5, "feine Ornamente klingen nach dem Orient"],
  ["tonart", "bayati", "farbton", "warm", 0.75, "warme Farben klingen nach Bayati, mit dem Viertelton"],
  ["tonart", "bayati", "kontrast", "niedrig", 0.5, "ein weiches Bild klingt nach dem Viertelton"],
  ["tonart", "nahawand", "helligkeit", "dunkel", 0.75, "ein dunkles Bild klingt nach Nahawand"],
  ["bass", "pulsierend", "schwerpunkt", "unten", 1.5, "ein Gewicht unten pulsiert im Bass"],
  ["bass", "liegend", "helligkeit", "dunkel", 1.5, "ein dunkles Bild trägt lange Basstöne"],
  ["bass", "liegend", "detail", "glatt", 0.5, "glatte Flächen tragen lange Basstöne"],
  ["bass", "laufend", "bewegung", "bewegt", 1.5, "Bewegung lässt den Bass laufen"],
  ["bass", "laufend", "bewegung", "heftig", 1, "heftige Bewegung lässt den Bass laufen"],
  ["bass", "keiner", "schwerpunkt", "oben", 1, "ein Gewicht oben braucht keinen Bass"],
  ["bass", "reese", "farbton", "kalt", 1, "kalte Farben schweben im Bass"],
  ["bass", "reese", "helligkeit", "dunkel", 1, "ein dunkles Bild trägt einen tiefen, schwebenden Bass"],
  ["bass", "reese", "bewegung", "heftig", 1.5, "heftige Bewegung trägt einen schwebenden Bass wie im Drum and Bass"],
  ["bass", "kontrabass", "farbigkeit", "gedaempft", 1, "gedämpfte Farben tragen einen gezupften Kontrabass"],
  ["bass", "kontrabass", "farbton", "warm", 0.5, "warme Farben tragen einen Kontrabass"],
  ["bass", "neuro", "bewegung", "heftig", 1, "heftige Bewegung knurrt im Bass wie im Neurofunk"],
  ["bass", "neuro", "kontrast", "hoch", 1, "harte Kontraste knurren im Bass"],
  ["flaeche", "bordun", "farbton", "warm", 1, "warme Farben tragen einen Bordun wie die Tanpura"],
  ["melodie", "oud", "farbton", "warm", 1.5, "warme Farben werden zu einer gezupften Oud"],
  ["melodie", "rhodes", "kontrast", "niedrig", 1, "ein weiches Bild trägt Akkorde auf dem E-Piano"],
  ["flaeche", "sphaere", "kontrast", "niedrig", 1.5, "niedriger Kontrast wird zu einer weichen Fläche"],
  ["flaeche", "sphaere", "helligkeit", "dunkel", 1, "ein dunkles Bild wird zu einem weiten Raum"],
  ["flaeche", "schimmer", "helligkeit", "hell", 1.5, "ein helles Bild schimmert"],
  ["flaeche", "schimmer", "farbigkeit", "bunt", 0.5, "kräftige Farben glitzern"],
  ["flaeche", "keine", "kontrast", "hoch", 1, "hoher Kontrast bleibt trocken"],
  ["melodie", "bild", "farbigkeit", "bunt", 1.5, "ein buntes Bild wird als Melodie gelesen"],
  ["melodie", "bild", "kontrast", "hoch", 1, "hoher Kontrast gibt deutliche Töne"],
  ["melodie", "arpeggio", "detail", "fein", 1, "feine Einzelheiten werden zu einem Arpeggio"],
  ["melodie", "glocken", "helligkeit", "hell", 1, "helle Punkte klingen wie Glocken"],
  ["melodie", "keine", "farbigkeit", "grau", 1, "ohne Farbe keine Melodie"],
  ["melodie", "keine", "helligkeit", "dunkel", 0.5, "ein dunkles Bild bleibt beim Rhythmus"],
  ["verlauf", "steigend", "bewegung", "still", 1.5, "ein einzelnes Bild baut sich nach und nach auf"],
  ["verlauf", "wellen", "bewegung", "bewegt", 1.5, "das Video bewegt sich: der Beat folgt in Wellen"],
  ["verlauf", "wellen", "bewegung", "heftig", 2, "das Video bewegt sich heftig: der Beat folgt in Wellen"],
  ["verlauf", "gleich", "bewegung", "ruhig", 1, "wenig Bewegung: der Beat bleibt gleich"],
  ["verlauf", "abschwellend", "helligkeit", "dunkel", 0.5, "ein dunkles Bild lichtet sich aus"],
  ["verlauf", "wechselnd", "detail", "fein", 1, "feine Einzelheiten neben ruhigen Flächen: fein und wild im Wechsel"],
  ["verlauf", "wechselnd", "kontrast", "hoch", 1, "hoher Kontrast: fein und wild im Wechsel"],
]);
/**
 * Der Standard je Stelle mit seinem Grundgewicht. Seit Christians Wunsch (24. Oktober 2026: «sphärischer, drum n bass mässiger, fein und
 * wild abwechselnd») gewinnen Drum and Bass, die sphärische Fläche und der Wechsel, solange keine Regel deutlich anders spricht. Seit
 * Lab 0.1.44 nach seiner Playlist «Lieblingssongs» (Jazz, Boom Bap, Soul, Trip-Hop; /mnt/project-files/musik/lieblingssongs-profil.md):
 * Schlagzeug mit Besen und Ride, Kontrabass statt Reese (der bleibt für dunkle, heftig bewegte Bilder), dorisch statt Moll, wenige Töne
 * statt einer Melodie aus dem Bild; Drum and Bass in seinen zarten Takten als Halftime.
 */
const STANDARD = Object.freeze({ tempo: ["mittel", 0.5], groove: ["dnb", 2], kit: ["jazz", 1], tonart: ["dorisch", 0.5], bass: ["kontrabass", 1.5], melodie: ["glocken", 0.5], verlauf: ["wechselnd", 2], flaeche: ["sphaere", 1.5] });
const STANDARD_GRUND = "Christians Richtung: sphärisch, Drum and Bass als Halftime, Jazz, fein und wild im Wechsel";

/** die Regeln anwenden: je Stelle der Wert mit dem grössten Gewicht, mit den Gründen. Gibt { plan, gruende, gewichte } zurück. */
export function regelPlan(merkmale) {
  const plan = {}, gruende = {}, gewichte = {};
  for (const [frage, f] of Object.entries(BEAT_FRAGEN)) {
    const w = Object.fromEntries(Object.keys(f.katalog).map((k) => [k, k === STANDARD[frage][0] ? STANDARD[frage][1] : 0]));
    for (const [fr, wert, m, s, g] of BEAT_REGELN) if (fr === frage && merkmale[m] === s) w[wert] += g;
    const best = Object.entries(w).sort((a, b) => b[1] - a[1])[0][0];
    plan[frage] = best; gewichte[frage] = w;
    gruende[frage] = BEAT_REGELN.filter(([fr, wert, m, s]) => fr === frage && wert === best && merkmale[m] === s).map((r) => r[5]);
    if (best === STANDARD[frage][0] && STANDARD[frage][1] > 0.5) gruende[frage].push(STANDARD_GRUND);
    if (!gruende[frage].length) gruende[frage] = ["keine Regel trifft zu, darum der Standard"];
  }
  return { plan, gruende, gewichte };
}

/** gleichverteilte Wahrscheinlichkeiten (ohne jev, «zufällig») */
export const beatGleichverteilt = () => Object.fromEntries(Object.entries(BEAT_FRAGEN).map(([k, f]) => [k, Object.fromEntries(Object.keys(f.katalog).map((o) => [o, 1]))]));

/** aus den Wahrscheinlichkeiten je Stelle ziehen (mit dem Startwert wiederholbar) */
export function planAusJev(antworten, seed = 1) {
  const rnd = zufall(seed >>> 0), plan = {};
  for (const frage of Object.keys(BEAT_FRAGEN)) {
    const e = Object.entries(antworten?.[frage] ?? {}).filter(([k, p]) => p > 0 && Object.hasOwn(BEAT_FRAGEN[frage].katalog, k));
    const liste = e.length ? e : Object.keys(BEAT_FRAGEN[frage].katalog).map((k) => [k, 1]);
    const summe = liste.reduce((s, [, p]) => s + p, 0);
    let r = rnd() * summe;
    plan[frage] = liste.at(-1)[0];
    for (const [k, p] of liste) { r -= p; if (r <= 0) { plan[frage] = k; break; } }
  }
  return plan;
}

// ---------- rechnen ----------
export const TEMPI = Object.freeze({ langsam: [70, 84], mittel: [84, 96], schnell: [118, 132], rasend: [150, 170] });
export const TONLEITERN = Object.freeze({ dur: [0, 2, 4, 5, 7, 9, 11], moll: [0, 2, 3, 5, 7, 8, 10], dorisch: [0, 2, 3, 5, 7, 9, 10], phrygisch: [0, 1, 3, 5, 7, 8, 10], pentatonik: [0, 3, 5, 7, 10], hijaz: [0, 1, 4, 5, 7, 8, 10],
  // seit 0.1.45: Bayati mit dem Viertelton auf der zweiten Stufe (1,5 Halbtöne, wie auf der Oud gegriffen), Nahawand wie harmonisch Moll
  bayati: [0, 1.5, 3, 5, 7, 8, 10], nahawand: [0, 2, 3, 5, 7, 8, 11] });
const FOLGEN = Object.freeze({ dur: [0, 4, 5, 3], moll: [0, 5, 2, 6], dorisch: [0, 3, 4, 3], phrygisch: [0, 1, 0, 6], pentatonik: [0, 2, 3, 1], hijaz: [0, 1, 0, 6], bayati: [0, 3, 6, 0], nahawand: [0, 3, 4, 0] });
export const NOTEN = Object.freeze(["C", "Cis", "D", "Es", "E", "F", "Fis", "G", "As", "A", "B", "H"]);
const muster = (s) => [...s].map((c) => c !== ".");
const GROOVES = Object.freeze({
  gerade: { kick: "x...x...x...x...", snare: "....x.......x...", geist: "................", hat: "x.x.x.x.x.x.x.x.", offen: "..x...x...x...x.", swing: 0 },
  halftime: { kick: "x.........x.....", snare: "........x.......", geist: "...........x...x", hat: "x.x.x.x.x.x.x.x.", offen: "......x.......x.", swing: 0.04, wechsel: 2 },
  breakbeat: { kick: "x.x.......xx....", snare: "....x.......x...", geist: ".......x.x.....x", hat: "x.x.x.x.x.x.x.x.", offen: "..............x.", swing: 0.06 },
  euklidisch: { swing: 0 },
  schleppend: { kick: "x......x..x.....", snare: "....x.......x...", geist: ".....x.........x", hat: "x.x.x.x.x.x.x.x.", offen: "................", swing: 0.2 },
  // Drum and Bass: der Two-Step (Bassdrum auf eins und auf der Zehn, Snare auf zwei und vier), Geisternoten wie im Amen-Break;
  // seit 0.1.44 mit mehr Swing und in den zarten Takten als Halftime (Snare nur auf drei: 172 fühlt sich an wie 86, das Tempo von Boom Bap)
  dnb: { kick: "x.........x.....", snare: "....x.......x...", geist: ".......x.x....x.", hat: "x.x.x.x.x.x.x.x.", offen: "..............x.", swing: 0.08, wechsel: 2, tempo: [170, 176], halb: "........x......." },
  // Maqsum (seit 0.1.45), der Grundrhythmus der arabischen Musik: Dum Tek . Tek Dum . Tek . in Achteln, dazwischen leise «Ka»
  maqsum: { kick: "x.......x.......", snare: "..x...x.....x...", geist: "....x.....x...x.", hat: "x...x...x...x...", offen: "................", swing: 0.05 },
  // Elektro-Gefrikel (seit 0.1.45), nach IDM und Glitch: Bassdrum fünf aus sechzehn, Becken auf jedem Sechzehntel, dazu Ratschen
  // (ein Schlag zwei- bis viermal innerhalb eines Sechzehntels), die in den wilden Takten zunehmen
  gefrikel: { kick: "x..x..x...x..x..", snare: "....x.......x..x", geist: "..x....x.x....x.", hat: "xxxxxxxxxxxxxxxx", offen: "......x.........", swing: 0, ratschen: true },
});
/** Schlagzeug: Bassdrum (Ton mit fallender Höhe), Snare (Ton und Rauschen) oder Klatschen, Becken (Rauschen oder sechs Rechtecke wie die 808) */
const KITS = Object.freeze({
  trocken: { kick: { hoch: 150, tief: 52, fall: 0.03, ab: 0.16, klick: 0.5 }, snare: { ton: 190, rauschen: 0.75, ab: 0.12, klatschen: false }, hat: { ab: 0.035, offen: 0.16, metall: false, hell: 0.9, laut: 0.45 }, melodie: "hell", bass: 4 },
  elektronisch: { kick: { hoch: 120, tief: 44, fall: 0.05, ab: 0.42, klick: 0.15 }, snare: { ton: 210, rauschen: 0.8, ab: 0.16, klatschen: true }, hat: { ab: 0.045, offen: 0.22, metall: false, hell: 0.95, laut: 0.4 }, melodie: "fm", bass: 6 },
  metallisch: { kick: { hoch: 170, tief: 58, fall: 0.025, ab: 0.14, klick: 0.4 }, snare: { ton: 240, rauschen: 0.6, ab: 0.1, klatschen: false }, hat: { ab: 0.07, offen: 0.3, metall: true, hell: 0.8, laut: 0.35 }, melodie: "glocke", bass: 5 },
  weich: { kick: { hoch: 100, tief: 50, fall: 0.04, ab: 0.24, klick: 0 }, snare: { ton: 170, rauschen: 0.5, ab: 0.18, klatschen: false }, hat: { ab: 0.04, offen: 0.14, metall: false, hell: 0.6, laut: 0.25 }, melodie: "sinus", bass: 2 },
  // Jazz (seit 0.1.44): runde Bassdrum, Besen auf der Snare (Rauschen, das langsam einsetzt), Ride statt Hi-Hat, Bläser als Melodie
  jazz: { kick: { hoch: 95, tief: 46, fall: 0.035, ab: 0.22, klick: 0.08 }, snare: { ton: 180, rauschen: 0.9, ab: 0.2, klatschen: false, besen: true }, hat: { ab: 0.22, offen: 0.6, metall: true, hell: 0.45, laut: 0.28, ride: true }, melodie: "blaeser", bass: 3 },
  // Handtrommeln (seit 0.1.44), nach Tabla und Zarb: die tiefe Trommel gleitet nach oben, die hohe klingt als Ton, dazu Fingerschläge
  hand: { kick: { hoch: 70, tief: 58, fall: 0.12, ab: 0.35, klick: 0.2, gleiten: 1.35 }, snare: { ton: 410, rauschen: 0.2, ab: 0.14, klatschen: false, fell: true }, hat: { ab: 0.025, offen: 0.08, metall: false, hell: 0.7, laut: 0.35 }, melodie: "glocke", bass: 3 },
  // Glitch (seit 0.1.45): kurze, klickende Bassdrum, Snare als Knistern, winzige Becken; Snare und Becken laufen durch den Zerkleinerer
  glitch: { kick: { hoch: 260, tief: 48, fall: 0.01, ab: 0.13, klick: 1 }, snare: { ton: 330, rauschen: 0.95, ab: 0.05, klatschen: false }, hat: { ab: 0.012, offen: 0.05, metall: true, hell: 1, laut: 0.4 }, melodie: "fm", bass: 5, zerkleinern: { bits: 6, teilung: 3 } },
});

/** ein Mono-Bus je Stimme; addiert wird mit einer Funktion des Abstands k (in Abtastwerten) vom Anschlag */
function spiele(bus, t, laenge, fn) {
  const a = Math.round(t * RATE), z = Math.min(bus.length, a + Math.round(laenge * RATE));
  for (let i = Math.max(0, a); i < z; i++) bus[i] += fn(i - a);
}
// Hüllkurven als fortlaufendes Produkt (ein Faktor je Abtastwert) statt Math.exp je Abtastwert: das rechnet am Telefon schneller
const abfall = (zeit) => Math.exp(-1 / (zeit * RATE));
function kick(bus, t, staerke, k) {
  let ph = 0, h = 1, fall = 1, klick = 1;
  const dh = abfall(k.ab), df = abfall(k.fall), dk = abfall(0.0015);
  spiele(bus, t, Math.min(1, k.ab * 5), (i) => {
    // Handtrommel: die tiefe Trommel gleitet nach dem Anschlag nach oben (der Handballen drückt auf das Fell)
    ph += ((k.tief + (k.hoch - k.tief) * fall) * (k.gleiten ? 1 + (k.gleiten - 1) * (1 - h) : 1)) / RATE;
    // der Anschlag: ein kurzer, schnell abklingender hoher Ton statt eines harten Sprungs
    const v = staerke * (Math.sin(2 * Math.PI * ph) * h + k.klick * 0.5 * klick * Math.sin((2 * Math.PI * 2800 * i) / RATE));
    h *= dh; fall *= df; klick *= dk;
    return v;
  });
}
function rauschen(rnd) { return rnd() * 2 - 1; }
function snare(bus, t, staerke, k, rnd) {
  let lp = 0, hpX = 0, hpY = 0, ph = 0;
  const laenge = k.ab * 5;
  if (k.klatschen) {
    // drei kurze Stösse und ein Ausklingen, bandbegrenzt
    spiele(bus, t, laenge + 0.03, (i) => {
      const s = i / RATE, x = rauschen(rnd);
      hpY = 0.92 * (hpY + x - hpX); hpX = x; lp += 0.35 * (hpY - lp);
      const stoss = s < 0.03 ? Math.exp(-((s % 0.01) / 0.003)) : Math.exp(-(s - 0.03) / k.ab);
      return staerke * lp * stoss * 1.6;
    });
    return;
  }
  if (k.besen) {
    // Besen: weiches Rauschen, das in etwa 12 ms einsetzt und lang ausklingt, ohne Ton
    let h = 1;
    const d = abfall(k.ab), an = 0.012 * RATE;
    spiele(bus, t, laenge, (i) => {
      const x = rauschen(rnd);
      hpY = 0.9 * (hpY + x - hpX); hpX = x; lp += 0.3 * (hpY - lp);
      const v = staerke * 1.3 * lp * Math.min(1, i / an) * h; h *= d;
      return v;
    });
    return;
  }
  if (k.fell) {
    // die hohe Handtrommel: ein klingender Ton mit zwei Obertönen (wie bei der Tabla nahezu harmonisch) und einem kurzen Schlag
    let h = 1, ph2 = 0, ph3 = 0;
    const d = abfall(k.ab), dk = abfall(0.004);
    let schlag = 1;
    spiele(bus, t, laenge, () => {
      ph += k.ton / RATE; ph2 += (k.ton * 2.01) / RATE; ph3 += (k.ton * 2.98) / RATE;
      const x = rauschen(rnd);
      hpY = 0.85 * (hpY + x - hpX); hpX = x;
      const v = staerke * (h * (Math.sin(2 * Math.PI * ph) + 0.5 * Math.sin(2 * Math.PI * ph2) + 0.3 * Math.sin(2 * Math.PI * ph3)) * 0.6 + k.rauschen * hpY * schlag);
      h *= d; schlag *= dk;
      return v;
    });
    return;
  }
  let h1 = 1, h2 = 1;
  const d1 = abfall(k.ab), d2 = abfall(k.ab * 0.6);
  spiele(bus, t, laenge, () => {
    const x = rauschen(rnd);
    hpY = 0.85 * (hpY + x - hpX); hpX = x; lp += 0.5 * (hpY - lp);
    ph += k.ton / RATE;
    const v = staerke * (k.rauschen * lp * h1 + (1 - k.rauschen) * Math.sin(2 * Math.PI * ph) * h2);
    h1 *= d1; h2 *= d2;
    return v;
  });
}
const METALL = [263, 400, 421, 474, 587, 845];
function hat(bus, t, staerke, k, offen, rnd) {
  let hpX = 0, hpY = 0, lp = 0;
  const ab = offen ? k.offen : k.ab, ph = METALL.map(() => rnd()), d = abfall(ab);
  let h = staerke * k.laut;
  spiele(bus, t, ab * 5, (i) => {
    let x;
    if (k.metall) { x = 0; for (let j = 0; j < METALL.length; j++) x += (((ph[j] + (METALL[j] * 1.6 * i) / RATE) % 1) < 0.5 ? 1 : -1) / METALL.length; }
    else x = rauschen(rnd);
    hpY = 0.97 * (hpY + x - hpX); hpX = x; lp += k.hell * (hpY - lp);
    // Ride: dazu die Glocke des Beckens, ein heller Ton, der länger klingt als das Rauschen
    const v = lp * h + (k.ride ? 0.18 * h * Math.sin((2 * Math.PI * 3150 * i) / RATE) : 0); h *= d;
    return v;
  });
}
function basston(bus, t, dauer, frequenz, staerke, teiltoene) {
  let ph = 0, h = 1;
  const halten = Math.round(dauer * RATE), dh = abfall(dauer * 2.5), dl = abfall(0.015), an = 0.006 * RATE;
  spiele(bus, t, dauer + 0.06, (i) => {
    ph += frequenz / RATE;
    let v = 0; for (let k = 1; k <= teiltoene; k++) v += Math.sin(2 * Math.PI * k * ph) / k;
    const w = staerke * Math.min(1, i / an) * h * v * 0.6;
    h *= i < halten ? dh : dl;
    return w;
  });
}

/** Kontrabass (seit 0.1.44): gezupft, mit kurzem Anschlag, der nach oben schnalzt, Teiltönen, die schneller verklingen als der Grundton, und
 * darunter ein Sinus auf dem Grundton, der länger trägt (der Sub wie bei Massive Attack und James Blake) */
function kontrabass(bus, t, dauer, f, staerke) {
  let ph = 0, h = 1, ho = 1, ab = 1;
  const halten = Math.round(dauer * RATE), dh = abfall(0.9), dob = abfall(0.18), dab = abfall(0.02), dl = abfall(0.025), an = 0.003 * RATE;
  spiele(bus, t, dauer + 0.08, (i) => {
    ph += (f * (1 + 0.02 * ab)) / RATE;
    const o = Math.sin(4 * Math.PI * ph) / 2.5 + Math.sin(6 * Math.PI * ph) / 5 + Math.sin(8 * Math.PI * ph) / 9;
    const v = staerke * Math.min(1, i / an) * (h * Math.sin(2 * Math.PI * ph) + ho * o * 0.9);
    h *= i < halten ? dh : dl; ho *= i < halten ? dob : dl; ab *= dab;
    return v;
  });
}
/** Bläser (seit 0.1.44), nach Trompete und Saxofon: der Ton setzt mit dem Atem langsam ein, Vibrato kommt spät, ungerade Teiltöne gedämpft */
function blaeser(bus, x) {
  let ph = 0, lp = 0;
  const n = Math.round(x.dauer * RATE), an = 0.06 * RATE, aus = 0.12 * RATE;
  spiele(bus, x.t, x.dauer, (i) => {
    const vib = 1 + 0.006 * Math.min(1, i / (0.35 * RATE)) * Math.sin((2 * Math.PI * 5.2 * i) / RATE);
    ph += (x.frequenz * vib) / RATE;
    const roh = Math.sin(2 * Math.PI * ph) + 0.45 * Math.sin(4 * Math.PI * ph) + 0.3 * Math.sin(6 * Math.PI * ph) + 0.12 * Math.sin(10 * Math.PI * ph);
    lp += 0.25 * (roh - lp);
    return x.staerke * 0.55 * lp * Math.min(1, i / an, Math.max(0, n - i) / aus);
  });
}
/**
 * Oud (seit 0.1.45): eine gezupfte Saite nach Karplus und Strong (1983), eine Verzögerung von einer Schwingung, in der ein Rauschstoss
 * kreist und durch ein Mittel bei jedem Umlauf dunkler wird. Die Risha (das Plektrum) zupft hell; «von» lässt den Ton aus einem anderen
 * gleiten (das Rutschen auf dem bundlosen Griffbrett), «tremolo» schlägt ihn in Zweiunddreissigsteln neu an.
 */
function oud(bus, x, rnd) {
  const n = Math.round((x.dauer + 0.4) * RATE), P = Math.ceil(RATE / (Math.min(x.frequenz, x.von ?? x.frequenz) * 0.9)) + 4;
  const ring = new Float32Array(P), gleit = 0.06 * RATE, neu = x.tremolo ? Math.max(1, Math.round(x.tremolo * RATE)) : 0;
  let w = 0, vor = 0, lp = 0, h = 1;
  const anregen = (st) => { for (let k = 0; k < P; k++) { lp += 0.6 * (rauschen(rnd) - lp); ring[k] += st * lp; } };
  anregen(x.staerke);
  const aus = abfall(0.05), halten = Math.round(x.dauer * RATE);
  spiele(bus, x.t, n / RATE, (i) => {
    if (neu && i > 0 && i % neu === 0 && i < halten) anregen(x.staerke * 0.5);
    const f = x.von && i < gleit ? x.von * (x.frequenz / x.von) ** (i / gleit) : x.frequenz, d = RATE / f;
    const pos = w - d + P, a = Math.floor(pos), r = pos - a, y = ring[a % P] * (1 - r) + ring[(a + 1) % P] * r;
    const z = 0.497 * (y + vor); vor = y;
    ring[w % P] = z; w++;
    if (i >= halten) h *= aus;
    return 0.8 * y * h;
  });
}
/** Rhodes (seit 0.1.45), FM wie im DX7-E-Piano: Träger und Modulator 1:1 (der warme Ton), dazu ein kurzer heller Anschlag bei 14:1 (das Klingen der Zinke), etwas Tremolo */
function rhodes(bus, x) {
  let h = 1, hm = 1, hz = 1;
  const dh = abfall(1.6), dm = abfall(0.35), dz = abfall(0.02), aus = abfall(0.08), halten = Math.round(x.dauer * RATE);
  spiele(bus, x.t, x.dauer + 0.5, (i) => {
    const ph = (x.frequenz * i) / RATE;
    const v = Math.sin(2 * Math.PI * ph + 1.3 * hm * Math.sin(2 * Math.PI * ph)) * h + 0.25 * hz * Math.sin(2 * Math.PI * 14 * ph);
    const trem = 1 - 0.12 * (0.5 - 0.5 * Math.cos((2 * Math.PI * 4.5 * i) / RATE));
    h *= i < halten ? dh : aus; hm *= dm; hz *= dz;
    return x.staerke * 0.5 * v * trem;
  });
}
/**
 * Neuro-Bass (seit 0.1.45), wie im Neurofunk des Drum and Bass: der Reese durch ein resonantes Tiefpassfilter, das im Rhythmus auf- und
 * zugeht (in den zarten Takten in Achteln, in den wilden in Sechzehnteln und Triolen), dann gesättigt. Rechnet auf dem fertigen Bassbus.
 */
function neuro(bass, schritt, wildBei, rnd) {
  const stufen = [];
  for (let s = 0; s * schritt * RATE < bass.length; s += 2) stufen.push(rnd());
  const gefiltert = bewegtesFilter(bass, RATE, (i) => {
    const s = i / (schritt * RATE), wild = wildBei(s), teil = wild ? 1 : 2, u = (s % teil) / teil;
    const offen = stufen[Math.floor(s / 2) % stufen.length] * (wild ? 1 : 0.6);
    return 90 * 2 ** (1 + 5 * offen * (1 - u) ** 2);
  }, { art: "tiefpass", resonanz: 0.75 });
  for (let i = 0; i < bass.length; i++) bass[i] = Math.tanh(2.2 * gefiltert[i]) * 0.8;
}

/** Echo wie im Dub (seit 0.1.44): punktierte Achtel (drei Sechzehntel), Ping-Pong (die erste Wiederholung links, die zweite rechts …),
 * jede Wiederholung dunkler und leiser */
function echo(quelle, L, R, verzoegerung, rueck, anteil) {
  const d = Math.max(1, Math.round(verzoegerung * RATE)), n = quelle.length, eL = new Float32Array(n), eR = new Float32Array(n);
  let lpL = 0, lpR = 0;
  for (let i = d; i < n; i++) {
    lpL += 0.35 * (quelle[i - d] + rueck * eR[i - d] - lpL); eL[i] = lpL;
    lpR += 0.35 * (rueck * eL[i - d] - lpR); eR[i] = lpR;
    L[i] += anteil * eL[i]; R[i] += anteil * eR[i];
  }
}

// Sägezahn aus 16 Teiltönen als Tabelle (bandbegrenzt, schnell): für den Reese-Bass und die Flächen
const TABELLE = 2048;
const SAEGE = (() => { const t = new Float32Array(TABELLE + 1); for (let i = 0; i <= TABELLE; i++) { let v = 0; for (let k = 1; k <= 16; k++) v += Math.sin((2 * Math.PI * k * i) / TABELLE) / k; t[i] = v * 0.55; } return t; })();
const saege = (ph) => { const x = (ph - Math.floor(ph)) * TABELLE, i = x | 0; return SAEGE[i] + (SAEGE[i + 1] - SAEGE[i]) * (x - i); };
/** Reese-Bass: zwei gegeneinander verstimmte Sägezähne, langsam wanderndes Tiefpassfilter, darunter ein Sinus */
function reese(bus, t, dauer, f, staerke) {
  let a = 0, b = 0.37, lp = 0, lp2 = 0, h = 1;
  const an = 0.008 * RATE, halten = Math.round(dauer * RATE), dl = abfall(0.03);
  spiele(bus, t, dauer + 0.15, (i) => {
    a += (f * 1.008) / RATE; b += (f * 0.992) / RATE;
    const k = 0.035 + 0.025 * Math.sin((2 * Math.PI * 0.7 * i) / RATE);
    lp += k * (saege(a) + saege(b) - lp); lp2 += k * (lp - lp2);
    const v = staerke * Math.min(1, i / an) * h * (0.7 * lp2 + 0.7 * Math.sin((2 * Math.PI * f * i) / RATE));
    if (i >= halten) h *= dl;
    return v;
  });
}
/** sphärische Fläche: je Seite ein leicht verstimmter, weich gefilterter Sägezahn, langsam ein- und ausgeblendet; «schimmernd» mit Tönen zwei Oktaven höher */
function flaeche(L, R, t, dauer, f, staerke, schimmer) {
  const a0 = Math.round(t * RATE), n = Math.round(dauer * RATE), an = 0.9 * RATE, aus = 1.2 * RATE;
  let a = 0, b = 0.5, lpL = 0, lpR = 0;
  for (let i = 0; i < n && a0 + i < L.length; i++) {
    a += (f * 1.003) / RATE; b += (f * 0.997) / RATE;
    lpL += 0.05 * (saege(a) - lpL); lpR += 0.05 * (saege(b) - lpR);
    const h = staerke * Math.min(1, i / an, (n - i) / aus);
    const glanz = schimmer ? 0.35 * Math.sin(2 * Math.PI * a * 4) * (0.5 + 0.5 * Math.sin((2 * Math.PI * 0.25 * i) / RATE)) : 0;
    if (a0 + i >= 0) { L[a0 + i] += h * (lpL + glanz); R[a0 + i] += h * (lpR + glanz); }
  }
}

/** Stufe einer Tonleiter (auch über die Oktave hinaus und darunter) → Halbtöne über dem Grundton */
export function stufeHalbton(leiter, k) {
  const n = leiter.length, o = Math.floor(k / n);
  return leiter[((k % n) + n) % n] + 12 * o;
}
/** Grundton aus dem Farbton: der Farbkreis in zwölf Halbtönen (Rot C, Orange D, Gelb E …, je 30°); ohne Farbton A */
export const grundtonAusFarbton = (merkmale, werte) => (merkmale.farbton === "neutral" ? 9 : Math.round(werte.farbton / 30) % 12);

/**
 * Den Beat rechnen. messung: von beatMessen(); plan: alle acht Stellen; dauer in Sekunden; grundton 0–11 (C … H); kammerton: das A in Hz
 * (seit 0.1.25 432, vorher 440); seed für die kleinen Abweichungen (Anschlagstärke, Geisternoten). Gibt { spuren: [L, R], rate, partitur, angaben } zurück.
 */
export function beatRechnen({ messung, plan, dauer, grundton, kammerton = 432, nachhall: hall = 0.25, seed = 1, mischung = "roh" }) {
  const rnd = zufall(seed >>> 0), kit = KITS[plan.kit], g = GROOVES[plan.groove], leiter = TONLEITERN[plan.tonart], folge = FOLGEN[plan.tonart];
  const { werte, abschnitte } = messung, S = abschnitte.length;
  // Tempo: die Stufe gibt den Bereich, die Feinheit die Stelle darin; dann so angepasst, dass ganze Schläge genau die Dauer füllen
  // (Drum and Bass hat sein eigenes Tempo, 170–176)
  const [lo, hi] = g.tempo ?? TEMPI[plan.tempo], fein = Math.min(1, Math.max(0, (werte.feinheit - 0.02) / 0.08));
  // (in ganzen Schlägen: der letzte Takt darf kürzer sein, das Tempo weicht so höchstens um einen halben Schlag ab)
  const bpmWunsch = lo + (hi - lo) * fein, schlaege = Math.max(4, Math.round((dauer * bpmWunsch) / 60)), bpm = (schlaege * 60) / dauer, takte = Math.ceil(schlaege / 4);
  const schritt = 60 / bpm / 4, n = Math.round(dauer * RATE);
  const bus = { kick: new Float32Array(n), snare: new Float32Array(n), hat: new Float32Array(n), bass: new Float32Array(n), melodie: new Float32Array(n) };
  const partitur = [];
  const abschnittVon = (takt) => Math.min(S - 1, Math.floor((takt * S) / takte));
  // die Energie je Takt; sie lässt Stimmen ein- und aussetzen
  const maxB = Math.max(1e-6, ...abschnitte.map((a) => a.bewegung));
  // fein und wild im Wechsel: je zwei Takte (bei einem Video je Abschnitt) zart, dann dicht und gebrochen
  const wechselnd = plan.verlauf === "wechselnd";
  const wild = Array.from({ length: takte + 1 }, (_, t) => wechselnd && (S > 1 ? abschnittVon(Math.min(t, takte - 1)) % 2 === 1 : Math.floor(t / 2) % 2 === 1));
  const energie = Array.from({ length: takte }, (_, t) => {
    const u = takte > 1 ? t / (takte - 1) : 1;
    if (wechselnd) return wild[t] ? 1 : 0.7;
    if (plan.verlauf === "steigend") return 0.35 + 0.65 * u;
    if (plan.verlauf === "abschwellend") return 1 - 0.6 * u;
    if (plan.verlauf === "wellen") return S > 1 ? 0.4 + 0.6 * (abschnitte[abschnittVon(t)].bewegung / maxB) : 0.7 + 0.3 * Math.cos((2 * Math.PI * t) / 4);
    return 1;
  });
  // Groove: feste Muster, euklidisch aus der Feinheit
  let G = g;
  if (plan.groove === "euklidisch") {
    const k = 3 + Math.round(fein * 4), kickM = euklid(k, 16), snareM = euklid(2, 16, 4).map((x, i) => x && !kickM[i]);
    G = { kick: kickM, snare: snareM, geist: euklid(3, 16, 2).map((x, i) => x && !kickM[i] && !snareM[i]), hat: euklid(9 + Math.round(fein * 4), 16), offen: euklid(1, 16, 14), swing: 0 };
  } else G = { ...g, kick: muster(g.kick), snare: muster(g.snare), geist: muster(g.geist), hat: muster(g.hat), offen: muster(g.offen), halb: g.halb ? muster(g.halb) : null };
  const zeit = (takt, s) => (takt * 16 + s) * schritt + (s % 4 === 2 ? G.swing * 2 * schritt : s % 2 === 1 ? G.swing * schritt : 0);
  const kicks = [];
  const grund = (kammerton / 8) * 2 ** ((((grundton - 9) % 12) + 12) % 12 / 12), basis = grund > kammerton * 0.1875 ? grund / 2 : grund;
  const hoehe = (k, oktave = 0) => basis * 2 ** (stufeHalbton(leiter, k) / 12 + oktave);
  const wechsel = g.wechsel ?? 1;

  for (let takt = 0; takt < takte; takt++) {
    const e = energie[takt], a = abschnitte[abschnittVon(takt)], letzter = takt === takte - 1 || abschnittVon(takt + 1) !== abschnittVon(takt);
    const dichte = Math.min(1, Math.max(0, (a.feinheit - 0.02) / 0.08)), zart = wechselnd && !wild[takt];
    const fill = (letzter || (wild[takt] && !wild[takt + 1] && takt < takte - 1)) && e >= 0.7 && takte > 1 && !zart;
    // Drum and Bass: ausser in den wilden Takten als Halftime (seit 0.1.44)
    const halb = G.halb && !wild[takt] ? G.halb : null;
    for (let s = 0; s < 16; s++) {
      const t = zeit(takt, s), mensch = 0.9 + 0.2 * rnd();
      if (t >= dauer) continue;   // der letzte Takt kann kürzer sein
      const extraKick = wild[takt] && !G.kick[s] && (s === 7 || s === 13) && rnd() < 0.35;
      if (e >= 0.3 && (G.kick[s] || extraKick) && !(fill && s >= 12)) { kick(bus.kick, t, mensch * (s % 4 === 0 ? 1 : 0.85) * (zart ? 0.8 : 1), kit.kick); kicks.push(t); partitur.push({ t, stimme: "bassdrum", staerke: 1, schritt: takt * 16 + s }); }
      if (e >= 0.55 && (halb ? halb[s] : G.snare[s]) && !(fill && s >= 12)) { snare(bus.snare, t, mensch * (zart ? 0.55 : 0.9), kit.snare, rnd); partitur.push({ t, stimme: "snare", staerke: 0.8, schritt: takt * 16 + s }); }
      // wild: am Taktende zwei Zweiunddreissigstel auf der Snare (Stottern)
      if (wild[takt] && s === 15 && !fill && rnd() < 0.5) for (const d of [0, schritt / 2]) { snare(bus.snare, t + d, 0.45 * mensch, kit.snare, rnd); partitur.push({ t: t + d, stimme: "snare", staerke: 0.4, schritt: takt * 16 + s }); }
      if (e >= 0.75 && G.geist[s] && rnd() < (wild[takt] ? 0.95 : 0.8)) { snare(bus.snare, t, 0.25 * mensch, kit.snare, rnd); partitur.push({ t, stimme: "snare", staerke: 0.25, schritt: takt * 16 + s }); }
      if (e >= 0.45) {
        const offen = G.offen[s] && plan.kit !== "trocken" && !zart;
        if (zart) { if (s % 4 === 2) { hat(bus.hat, t, 0.4 * mensch, kit.hat, false, rnd); partitur.push({ t, stimme: "becken", staerke: 0.15, schritt: takt * 16 + s }); } }
        else if (G.hat[s] || offen) { hat(bus.hat, t, mensch * (s % 4 === 0 ? 0.9 : 0.65), kit.hat, offen, rnd); partitur.push({ t, stimme: offen ? "becken offen" : "becken", staerke: 0.3, schritt: takt * 16 + s }); }
        else if (e >= 0.8 && rnd() < (wild[takt] ? 0.6 : dichte * 0.7)) { hat(bus.hat, t, 0.35 * mensch, kit.hat, false, rnd); partitur.push({ t, stimme: "becken", staerke: 0.15, schritt: takt * 16 + s }); }
      }
      // Elektro-Gefrikel: Ratschen, ein Schlag zwei- bis viermal im Sechzehntel, leiser werdend (in den zarten Takten selten);
      // mit dem Glitch-Schlagzeug auch in jedem anderen Groove, dort nur in den wilden Takten
      if ((G.ratschen || (kit.zerkleinern && wild[takt])) && e >= 0.45 && !(fill && s >= 12) && rnd() < (wild[takt] ? 0.35 : zart ? 0.06 : 0.16)) {
        const mal = 2 + Math.floor(rnd() * 3), aufSnare = rnd() < 0.4;
        for (let r = 1; r < mal; r++) {
          const tr = t + (r * schritt) / mal, st = mensch * (0.5 - 0.3 * (r / mal));
          if (aufSnare) snare(bus.snare, tr, st * 0.8, kit.snare, rnd); else hat(bus.hat, tr, st, kit.hat, false, rnd);
          partitur.push({ t: tr, stimme: aufSnare ? "snare" : "becken", staerke: 0.2, schritt: takt * 16 + s });
        }
      }
      // Wirbel am Ende eines Abschnitts: Sechzehntel, lauter werdend (Halftime: Achtel)
      if (fill && s >= 12 && (plan.groove !== "halftime" || s % 2 === 0)) { snare(bus.snare, t, 0.4 + 0.15 * (s - 12), kit.snare, rnd); partitur.push({ t, stimme: "snare", staerke: 0.6, schritt: takt * 16 + s }); }
    }
  }
  const akkord = (takt) => folge[Math.floor(takt / wechsel) % folge.length];
  const toene = [];
  for (let takt = 0; takt < takte; takt++) {
    const e = energie[takt], r = akkord(takt), a = abschnitte[abschnittVon(takt)];
    if (plan.bass !== "keiner" && e >= 0.4) {
      if (plan.bass === "liegend") basston(bus.bass, zeit(takt, 0), 16 * schritt * 0.95, hoehe(r), 0.9, kit.bass);
      else if (plan.bass === "pulsierend") for (let s = 0; s < 16; s += 2) basston(bus.bass, zeit(takt, s), schritt * 1.6, hoehe(r, s % 4 === 2 && e >= 0.7 ? 1 : 0), s % 4 === 0 ? 0.85 : 0.65, kit.bass);
      else if (plan.bass === "reese" || plan.bass === "neuro") {
        // lange Töne von Bassdrum zu Bassdrum, wie im Drum and Bass
        const ks = [...Array(16).keys()].filter((x) => G.kick[x]);
        if (!ks.length || ks[0] !== 0) ks.unshift(0);
        ks.forEach((s0, j) => reese(bus.bass, zeit(takt, s0), ((ks[j + 1] ?? 16) - s0) * schritt * 0.97, hoehe(r + (j === ks.length - 1 && wild[takt] && rnd() < 0.4 ? 4 : 0)), 0.8));
      } else if (plan.bass === "kontrabass") {
        // gezupft: im Drum and Bass auf den Bassdrums (dazu ein später Nachschlag), sonst Viertel, die zum Grundton des nächsten Akkords
        // gehen; der letzte Ton davor ist ein Halbton darunter (Annäherung wie im Jazz)
        const naechster = akkord(takt + 1), ziel = (q) => (q === 3 ? stufeHalbton(leiter, naechster) - 1 : stufeHalbton(leiter, r + [0, 2, 4][q]));
        const hz = (halbtoene) => basis * 2 ** (halbtoene / 12);
        if (plan.groove === "dnb") {
          const ks = [...Array(16).keys()].filter((x) => G.kick[x]);
          if (!ks.length || ks[0] !== 0) ks.unshift(0);
          ks.forEach((s0, j) => kontrabass(bus.bass, zeit(takt, s0), ((ks[j + 1] ?? 16) - s0) * schritt * 0.9, hz(stufeHalbton(leiter, r + (j ? 4 : 0))), 0.9));
          if (rnd() < 0.6) kontrabass(bus.bass, zeit(takt, 15), schritt * 0.9, hz(ziel(3)), 0.55);
        } else for (let q = 0; q < 4; q++) kontrabass(bus.bass, zeit(takt, q * 4), schritt * 3.6, hz(ziel(q)), q === 0 ? 0.9 : 0.75);
      } else { const weg = [0, 2, 4, 2]; for (let q = 0; q < 4; q++) basston(bus.bass, zeit(takt, q * 4), schritt * 3.4, hoehe(r + weg[q] + (q === 3 && rnd() < 0.5 ? 1 : 0)), 0.8, kit.bass); }
    }
    if (plan.melodie === "keine" || e < 0.62) continue;
    const anfang = Math.floor((abschnittVon(takt) * takte) / S), ende = Math.max(anfang + 1, Math.floor(((abschnittVon(takt) + 1) * takte) / S));
    if (plan.melodie === "bild") {
      for (let s = 0; s < 16; s += 2) {
        const u = (takt - anfang + s / 16) / (ende - anfang), sp = a.spalten[Math.min(a.spalten.length - 1, Math.floor(u * a.spalten.length))];
        if (sp.spitze - sp.mittel < 0.12) continue;
        toene.push({ t: zeit(takt, s), frequenz: hoehe(Math.round((1 - sp.y) * 2 * leiter.length), 2), staerke: 0.25 + 0.4 * sp.spitze, dauer: schritt * 2 });
      }
    } else if (plan.melodie === "oud") {
      // Oud: eine Phrase je Takt, schrittweise durch die Tonleiter wie in einem Taqsim; die Zeilen der hellsten Stellen geben die Richtung,
      // jeder Ton geht höchstens eine Stufe weiter und gleitet manchmal aus dem vorigen; lange Töne in den wilden Takten mit Tremolo
      let k = toene.findLast?.((x) => x.oud)?.stufe ?? r + leiter.length;
      for (const [j, s] of [0, 3, 6, 8, 10, 12, 14].entries()) {
        if (j && rnd() < 0.25) continue;
        const sp = a.spalten[Math.min(a.spalten.length - 1, Math.floor(((takt - anfang + s / 16) / (ende - anfang)) * a.spalten.length))];
        const ziel = r + Math.round((1 - sp.y) * leiter.length * 1.5), alt = k;
        k += Math.sign(ziel - k);
        const lang = s === 0 || s === 8, f = hoehe(k, 1);
        toene.push({ t: zeit(takt, s), frequenz: f, staerke: 0.35 + 0.3 * sp.spitze, dauer: (lang ? 3 : 1.6) * schritt, oud: true, stufe: k,
          von: alt !== k && rnd() < 0.4 ? hoehe(alt, 1) : undefined, tremolo: lang && wild[takt] ? schritt / 2 : 0 });
      }
    } else if (plan.melodie === "rhodes") {
      // Rhodes: Akkorde mit Septime auf eins und kurz vor drei (wie Comping im Jazz), der zweite kürzer
      for (const [s, lang] of [[0, 6], [7, 3]]) {
        if (s && rnd() < 0.3) continue;
        for (const [j, st] of [0, 2, 4, 6].entries()) toene.push({ t: zeit(takt, s) + j * 0.008, frequenz: hoehe(r + st, 1), staerke: 0.22, dauer: lang * schritt, rhodes: true });
      }
    } else if (plan.melodie === "arpeggio") {
      const lauf = [0, 2, 4, 7, 4, 2], jede = plan.tempo === "rasend" ? 2 : 1;
      for (let s = 0; s < 16; s += jede) toene.push({ t: zeit(takt, s), frequenz: hoehe(r + lauf[(s / jede) % lauf.length], 2), staerke: s % 4 === 0 ? 0.45 : 0.3, dauer: schritt });
    } else {
      // Glocken: die hellsten Punkte des Bildes, im Abschnitt von links nach rechts verteilt, höchstens drei je Takt
      for (const p of a.lichter) {
        const u = p.x * (ende - anfang) - (takt - anfang);
        if (u < 0 || u >= 1) continue;
        const s = Math.round(u * 15), k = r + [0, 2, 4][Math.round((1 - p.y) * 2)] + 7 * (p.y < 0.33 ? 1 : 0);
        // im Jazz-Schlagzeug lange Töne von Bläsern statt Glocken, eine Oktave tiefer
        toene.push(kit.melodie === "blaeser" ? { t: zeit(takt, s), frequenz: hoehe(k, 1), staerke: 0.25 + 0.4 * p.v, dauer: 8 * schritt } : { t: zeit(takt, s), frequenz: hoehe(k, 2), staerke: 0.2 + 0.4 * p.v, dauer: 1.2, glocke: true });
        if (toene.filter((x) => x.t >= zeit(takt, 0)).length >= 3) break;
      }
    }
  }
  if (plan.bass === "neuro") neuro(bus.bass, schritt, (s) => wild[Math.min(takte - 1, Math.floor(s / 16))], rnd);
  // der Bass weicht der Bassdrum kurz aus (Sidechain)
  const dk = abfall(0.07);
  for (const k of kicks) { let d = 0.55; for (let i = Math.max(0, Math.round(k * RATE)), z = Math.min(n, i + Math.round(0.35 * RATE)); i < z; i++) { bus.bass[i] *= 1 - d; d *= dk; } }
  toene.splice(0, toene.length, ...toene.filter((x) => x.t < dauer));
  for (const x of toene) melodieTon(bus.melodie, x, kit, rnd);
  for (const x of toene) partitur.push({ t: x.t, stimme: "melodie", staerke: rund(x.staerke), hz: rund(x.frequenz, 100) });
  // Glitch: Snare und Becken durch den Zerkleinerer
  if (kit.zerkleinern) for (const k of ["snare", "hat"]) bus[k] = zerkleinern(bus[k], kit.zerkleinern);

  // die Fläche: je Akkord vier Stimmen (Grundton und Quinte, darüber Terz und Quinte), lang überlappend, mit viel Raum
  const flL = new Float32Array(n), flR = new Float32Array(n);
  if (plan.flaeche && plan.flaeche !== "keine") for (let c = 0; c < takte; c += wechsel) {
    const r = akkord(c), t0 = zeit(c, 0);
    if (t0 >= dauer) break;
    const lang = Math.min(dauer - t0, wechsel * 16 * schritt) + 1.2;
    if (plan.flaeche === "bordun") continue;
    for (const [k, o] of [[r, 1], [r + 4, 1], [r + 2, 2], [r + 4, 2]]) flaeche(flL, flR, t0, lang, hoehe(k, o), 0.12, plan.flaeche === "schimmer");
  }
  // Bordun (seit 0.1.45), wie die Tanpura: Grundton, Quinte und Oktave liegen über die ganze Dauer, ohne den Akkorden zu folgen
  if (plan.flaeche === "bordun") for (const [h, o, st] of [[0, 1, 0.16], [7, 1, 0.11], [0, 2, 0.08]]) flaeche(flL, flR, 0, dauer, basis * 2 ** (h / 12 + o), st, true);
  const raumL = plan.flaeche && plan.flaeche !== "keine" ? nachhall(flL, RATE, 0.85) : flL, raumR = plan.flaeche && plan.flaeche !== "keine" ? nachhall(flR, RATE, 0.85) : flR;

  // mischen: Bassdrum und Bass in der Mitte, Becken und Melodie zur Seite des Schwerpunkts, Nachhall auf Snare und Melodie
  const pan = Math.max(-0.6, Math.min(0.6, werte.schwerpunktX * 2));
  const melodie = nachhall(bus.melodie, RATE, Math.min(0.9, hall * 1.6)), sn = nachhall(bus.snare, RATE, hall * 0.6);
  const L = new Float32Array(n), R = new Float32Array(n);
  // Echo wie im Dub auf Snare und Melodie, so stark wie der Nachhall
  if (hall > 0) { const quelle = new Float32Array(n); for (let i = 0; i < n; i++) quelle[i] = bus.snare[i] * 0.3 + bus.melodie[i] * 0.35; echo(quelle, L, R, 3 * schritt, 0.45, Math.min(0.9, hall * 1.6)); }
  const gl = (p) => Math.cos(((p + 1) * Math.PI) / 4), gr = (p) => Math.sin(((p + 1) * Math.PI) / 4);
  for (let i = 0; i < n; i++) {
    const mitte = bus.kick[i] * 0.6 + sn[i] * 0.45 + bus.bass[i] * 0.35;
    L[i] += mitte + bus.hat[i] * 0.8 * gl(-pan * 0.5) + melodie[i] * 0.4 * gl(pan) + raumL[i] * 0.5;
    R[i] += mitte + bus.hat[i] * 0.8 * gr(-pan * 0.5) + melodie[i] * 0.4 * gr(pan) + raumR[i] * 0.5;
  }
  // sanft sättigen; «roh» auf −1 dBFS bringen, «fertig» (seit 0.1.45) durch das Mastering des Mischpults auf −14 LUFS (kern/mischpult.js);
  // dann Anfang und Ende 5 ms einblenden
  for (const x of [L, R]) for (let i = 0; i < n; i++) x[i] = Math.tanh(x[i]);
  let verstaerkung = 1, gemischt = null;
  if (mischung === "fertig") {
    const m = mastern([L, R], RATE, { ziel: -14, decke: -1, waerme: 1, glanz: 1.5, breite: 1.1, kompression: 0.5 });
    L.set(m.spuren[0]); R.set(m.spuren[1]); gemischt = m.angaben;
  } else verstaerkung = pegeln([L, R], "normal");
  const rand = Math.min(n >> 1, Math.round(0.005 * RATE));
  for (let i = 0; i < rand; i++) { const f = i / rand; L[i] *= f; R[i] *= f; L[n - 1 - i] *= f; R[n - 1 - i] *= f; }
  partitur.sort((a, b) => a.t - b.t);
  return {
    spuren: [L, R], rate: RATE, partitur: partitur.map((x) => ({ ...x, t: rund(x.t) })),
    angaben: { bpm: rund(bpm, 100), bpmWunsch: rund(bpmWunsch, 10), takte, abschnitte: S, grundton: NOTEN[grundton], kammerton, wild: wild.slice(0, takte).filter(Boolean).length, energie: energie.map((x) => rund(x, 100)), toene: toene.length, verstaerkung: rund(verstaerkung, 1e4), mischung, ...(gemischt ? { lautheit: gemischt.lautheit, spitze: gemischt.spitze } : {}) },
  };
}
function melodieTon(bus, x, kit, rnd) {
  if (x.oud) { oud(bus, x, rnd); return; }
  if (x.rhodes) { rhodes(bus, x); return; }
  if (kit.melodie === "blaeser" && !x.glocke) { blaeser(bus, x); return; }
  ton(bus, RATE, { t: x.t, frequenz: x.frequenz, staerke: x.staerke }, { farbe: x.glocke ? "glocke" : kit.melodie, anschlag: 0.004, abklingen: x.glocke ? 0.5 : Math.max(0.08, x.dauer * 0.8) });
}
