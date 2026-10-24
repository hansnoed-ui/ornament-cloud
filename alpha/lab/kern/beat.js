// ORNAMENT LAB – Beat aus Bild oder Video (seit Lab 0.1.24; jazziger seit 0.1.26). Ohne DOM, in reinem JavaScript wie der Klangerzeuger (kern/klang.js):
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
  ["groove", "jazzstep", "bewegung", "heftig", 2, "heftige Bewegung trägt Drum and Bass mit Jazz"],
  ["groove", "jazzstep", "bewegung", "bewegt", 1.5, "deutliche Bewegung trägt Drum and Bass mit Jazz"],
  ["groove", "jazzstep", "detail", "fein", 1, "feine Einzelheiten werden zu genau gesetzten, gebrochenen Schlägen"],
  ["groove", "jungle", "helligkeit", "dunkel", 1, "ein dunkles Bild wird zu einem dunklen Break"],
  ["groove", "jazz", "bewegung", "ruhig", 1.5, "eine ruhige Bewegung swingt"],
  ["groove", "jazz", "farbton", "warm", 1, "warme Farben swingen"],
  ["kit", "trocken", "farbigkeit", "grau", 1.5, "ein Bild fast ohne Farbe klingt trocken"],
  ["kit", "elektronisch", "farbigkeit", "bunt", 1.5, "kräftige Farben klingen elektronisch"],
  ["kit", "elektronisch", "kontrast", "hoch", 1, "hoher Kontrast: tiefe Bassdrum und Klatschen"],
  ["kit", "metallisch", "detail", "fein", 1.5, "feine Kanten klirren"],
  ["kit", "metallisch", "farbton", "kalt", 0.5, "kalte Farben klingen metallisch"],
  ["kit", "weich", "kontrast", "niedrig", 1.5, "niedriger Kontrast klingt weich"],
  ["kit", "weich", "helligkeit", "hell", 0.5, "ein helles Bild klingt weich"],
  ["kit", "jazz", "farbigkeit", "gedaempft", 1, "gedämpfte Farben klingen nach Besen und Ride-Becken"],
  ["kit", "jungle", "helligkeit", "dunkel", 1, "ein dunkles Bild klingt nach gefilterten Breaks"],
  ["kit", "jazz", "detail", "mittel", 0.5, "mittlere Feinheit: gestimmte Trommeln"],
  ["tonart", "dur", "helligkeit", "hell", 2, "ein helles Bild steht in Dur"],
  ["tonart", "moll", "helligkeit", "dunkel", 2, "ein dunkles Bild steht in Moll"],
  ["tonart", "dorisch", "helligkeit", "mittel", 1, "mittlere Helligkeit: Moll mit einem hellen Ton"],
  ["tonart", "dur", "farbton", "warm", 0.5, "warme Farben klingen nach Dur"],
  ["tonart", "phrygisch", "farbton", "kalt", 0.75, "kalte Farben klingen fremd"],
  ["tonart", "pentatonik", "farbigkeit", "grau", 1.5, "ohne Farbe: fünf Töne, nichts reibt"],
  ["bass", "pulsierend", "schwerpunkt", "unten", 1.5, "ein Gewicht unten pulsiert im Bass"],
  ["bass", "liegend", "helligkeit", "dunkel", 1.5, "ein dunkles Bild trägt lange Basstöne"],
  ["bass", "liegend", "detail", "glatt", 0.5, "glatte Flächen tragen lange Basstöne"],
  ["bass", "laufend", "bewegung", "bewegt", 1.5, "Bewegung lässt den Bass laufen"],
  ["bass", "laufend", "bewegung", "heftig", 1, "heftige Bewegung lässt den Bass laufen"],
  ["bass", "keiner", "schwerpunkt", "oben", 1, "ein Gewicht oben braucht keinen Bass"],
  ["bass", "reese", "farbton", "kalt", 1, "kalte Farben schweben im Bass"],
  ["bass", "reese", "helligkeit", "dunkel", 1, "ein dunkles Bild trägt einen tiefen, schwebenden Bass"],
  ["bass", "kontrabass", "farbton", "warm", 1, "warme Farben tragen einen Kontrabass"],
  ["bass", "sub", "schwerpunkt", "unten", 1, "ein Gewicht unten trägt einen tiefen Sub-Bass"],
  ["bass", "sub", "helligkeit", "dunkel", 1, "ein dunkles Bild trägt einen tiefen Sub-Bass"],
  ["bass", "kontrabass", "bewegung", "bewegt", 1, "Bewegung lässt den Kontrabass gehen"],
  ["flaeche", "sphaere", "kontrast", "niedrig", 1.5, "niedriger Kontrast wird zu einer weichen Fläche"],
  ["flaeche", "sphaere", "helligkeit", "dunkel", 1, "ein dunkles Bild wird zu einem weiten Raum"],
  ["flaeche", "schimmer", "helligkeit", "hell", 1.5, "ein helles Bild schimmert"],
  ["flaeche", "schimmer", "farbigkeit", "bunt", 0.5, "kräftige Farben glitzern"],
  ["flaeche", "keine", "kontrast", "hoch", 1, "hoher Kontrast bleibt trocken"],
  // seit Beat 0.3.0 führen die Regeln nicht mehr zu einfachen Melodien (Bild, Arpeggio, Glocken), nur noch zu Linien und Akkorden
  ["melodie", "linie", "farbigkeit", "bunt", 1.5, "ein buntes Bild wird zu einer bewegten Linie"],
  ["melodie", "linie", "kontrast", "hoch", 1, "hoher Kontrast gibt eine deutliche Linie"],
  ["melodie", "linie", "detail", "fein", 1, "feine Einzelheiten werden zu einer dichten Linie"],
  ["melodie", "akkorde", "detail", "glatt", 1, "grosse ruhige Flächen tragen nur Akkorde"],
  ["melodie", "akkorde", "farbigkeit", "grau", 1, "ohne Farbe keine Linie, nur Akkorde"],
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
 * Der Standard je Stelle mit seinem Grundgewicht. Christians Richtung (24. Oktober 2026: «sphärischer, drum n bass mässiger, fein und
 * wild abwechselnd», dann «präziser, jazziger, bessere Bässe, keine einfachen Melodien», dann vom Klang her wie Tango, «Spellbound»,
 * 1996): Jungle-Break, dunkles Schlagzeug, rollender Sub-Bass, eine Jazzlinie, die sphärische Fläche und der Wechsel gewinnen, solange
 * keine Regel deutlich anders spricht.
 */
const STANDARD = Object.freeze({ tempo: ["mittel", 0.5], groove: ["jungle", 3], kit: ["jungle", 2.5], tonart: ["dorisch", 0.5], bass: ["sub", 2.5], melodie: ["linie", 2], verlauf: ["wechselnd", 2], flaeche: ["sphaere", 2] });
const STANDARD_GRUND = "Christians Richtung: sphärisch und dunkel wie atmosphärischer Jungle, mit Jazz, fein und wild im Wechsel";

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
export const TEMPI = Object.freeze({ langsam: [70, 84], mittel: [92, 108], schnell: [118, 132], rasend: [150, 170] });
export const TONLEITERN = Object.freeze({ dur: [0, 2, 4, 5, 7, 9, 11], moll: [0, 2, 3, 5, 7, 8, 10], dorisch: [0, 2, 3, 5, 7, 9, 10], phrygisch: [0, 1, 3, 5, 7, 8, 10], pentatonik: [0, 3, 5, 7, 10] });
// Stufenfolgen wie im Jazz (Dur: II–V–I–VI; die Akkorde sind Vierklänge mit None, siehe vierklang)
const FOLGEN = Object.freeze({ dur: [1, 4, 0, 5], moll: [0, 3, 6, 4], dorisch: [0, 3, 0, 4], phrygisch: [0, 1, 6, 0], pentatonik: [0, 2, 3, 1] });
/** die Töne eines Akkords auf der Stufe r als Stufen der Tonleiter: Grundton, Terz, Quinte, Septime, None */
const vierklang = (r) => [r, r + 2, r + 4, r + 6, r + 8];
export const NOTEN = Object.freeze(["C", "Cis", "D", "Es", "E", "F", "Fis", "G", "As", "A", "B", "H"]);
const muster = (s) => [...s].map((c) => c !== ".");
// Begleitmuster der Akkorde je Takt (Comping), meist zwischen den Schlägen
const KOMPING = Object.freeze(["x.....x.........", "...x......x.....", "......x....x....", "x.........x..x..", "..x.......x.....", "...x.......x..x."]);
const mensch = (rnd) => 0.94 + 0.12 * rnd();
const GROOVES = Object.freeze({
  gerade: { kick: "x...x...x...x...", snare: "....x.......x...", geist: "................", hat: "x.x.x.x.x.x.x.x.", offen: "..x...x...x...x.", swing: 0 },
  halftime: { kick: "x.........x.....", snare: "........x.......", geist: "...........x...x", hat: "x.x.x.x.x.x.x.x.", offen: "......x.......x.", swing: 0.04, wechsel: 2 },
  breakbeat: { kick: "x.x.......xx....", snare: "....x.......x...", geist: ".......x.x.....x", hat: "x.x.x.x.x.x.x.x.", offen: "..............x.", swing: 0.06 },
  euklidisch: { swing: 0 },
  schleppend: { kick: "x......x..x.....", snare: "....x.......x...", geist: ".....x.........x", hat: "x.x.x.x.x.x.x.x.", offen: "................", swing: 0.2 },
  // Drum and Bass: der Two-Step (Bassdrum auf eins und auf der Zehn, Snare auf zwei und vier), Geisternoten wie im Amen-Break
  dnb: { kick: "x.........x.....", snare: "....x.......x...", geist: ".......x.x....x.", hat: "x.x.x.x.x.x.x.x.", offen: "..............x.", swing: 0.03, wechsel: 2, tempo: [170, 176] },
  // Jazz: das Ride-Becken «ding, ding-a, ding, ding-a» in Triolen, die Hi-Hat mit dem Fuss auf zwei und vier, die Bassdrum leise auf jedem
  // Viertel (feathering), die Snare begleitet mit leisen Schlägen auf den späten Achteln
  jazz: { kick: "x...x...x...x...", snare: "................", geist: "......x.......x.", hat: "x...x.x.x...x.x.", offen: "................", fuss: "....x.......x...", triole: true, ride: true, kickLaut: 0.45 },
  // Jazzstep: der Two-Step genau auf dem Raster, darüber das Ride-Becken in Achteln, sehr leise Geisternoten
  // Jungle: der Break zerhackt (Bassdrum eins, kurz danach und vor drei, Snare zwei und vier mit Geisternoten), die Becken im halben Gefühl
  jungle: { kick: "x.x.......x.....", snare: "....x.......x...", geist: ".......x.x..x..x", hat: "x...x...x...x...", offen: "..x.......x.....", swing: 0.04, wechsel: 2, tempo: [170, 176] },
  jazzstep: { kick: "x.........x.....", snare: "....x.......x...", geist: ".x.....x.x...x..", hat: "x.x.x.x.x.x.x.x.", offen: "................", fuss: "..x...x...x...x.", swing: 0, wechsel: 2, tempo: [170, 176], ride: true },
});
/** Schlagzeug: Bassdrum (Ton mit fallender Höhe), Snare (Ton und Rauschen) oder Klatschen, Becken (Rauschen oder sechs Rechtecke wie die 808) */
const KITS = Object.freeze({
  trocken: { kick: { hoch: 150, tief: 52, fall: 0.03, ab: 0.16, klick: 0.5 }, snare: { ton: 190, rauschen: 0.75, ab: 0.12, klatschen: false }, hat: { ab: 0.035, offen: 0.16, metall: false, hell: 0.9, laut: 0.45 }, melodie: "hell", bass: 4 },
  elektronisch: { kick: { hoch: 120, tief: 44, fall: 0.05, ab: 0.42, klick: 0.15 }, snare: { ton: 210, rauschen: 0.8, ab: 0.16, klatschen: true }, hat: { ab: 0.045, offen: 0.22, metall: false, hell: 0.95, laut: 0.4 }, melodie: "fm", bass: 6 },
  metallisch: { kick: { hoch: 170, tief: 58, fall: 0.025, ab: 0.14, klick: 0.4 }, snare: { ton: 240, rauschen: 0.6, ab: 0.1, klatschen: false }, hat: { ab: 0.07, offen: 0.3, metall: true, hell: 0.8, laut: 0.35 }, melodie: "glocke", bass: 5 },
  weich: { kick: { hoch: 100, tief: 50, fall: 0.04, ab: 0.24, klick: 0 }, snare: { ton: 170, rauschen: 0.5, ab: 0.18, klatschen: false }, hat: { ab: 0.04, offen: 0.14, metall: false, hell: 0.6, laut: 0.25 }, melodie: "sinus", bass: 2 },
  // Jungle: rund und dunkel, Snare und Becken durch ein Tiefpassfilter (wie ein Break aus dem Sampler der Neunziger)
  jungle: { kick: { hoch: 95, tief: 46, fall: 0.03, ab: 0.22, klick: 0.05 }, snare: { ton: 185, rauschen: 0.65, ab: 0.13, klatschen: false }, hat: { ab: 0.04, offen: 0.2, metall: false, hell: 0.5, laut: 0.3 }, melodie: "rhodes", bass: 3, dunkel: 3200 },
  jazz: { kick: { hoch: 115, tief: 56, fall: 0.018, ab: 0.11, klick: 0.25 }, snare: { ton: 205, rauschen: 0.9, ab: 0.08, klatschen: false, besen: true }, hat: { ab: 0.03, offen: 0.18, metall: true, hell: 0.85, laut: 0.35 }, melodie: "rhodes", bass: 5 },
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
    ph += (k.tief + (k.hoch - k.tief) * fall) / RATE;
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
  let h1 = 1, h2 = 1;
  const d1 = abfall(k.ab), d2 = abfall(k.ab * 0.6), an = k.besen ? 0.006 * RATE : 1;
  spiele(bus, t, laenge, (i) => {
    const x = rauschen(rnd);
    hpY = 0.85 * (hpY + x - hpX); hpX = x; lp += (k.besen ? 0.3 : 0.5) * (hpY - lp);
    ph += k.ton / RATE;
    // Besen: das Rauschen setzt weich ein, wie ein Wischen
    const v = staerke * Math.min(1, i / an) * (k.rauschen * lp * h1 + (1 - k.rauschen) * Math.sin(2 * Math.PI * ph) * h2);
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
    const v = lp * h; h *= d;
    return v;
  });
}
/** Ride-Becken: sechs Rechtecke höher als bei der Hi-Hat, lang ausklingend, dazu die Glocke als kurzer Ton */
function ride(bus, t, staerke, rnd) {
  let hpX = 0, hpY = 0, h = staerke, g = staerke;
  const ph = Float64Array.from(METALL, () => rnd()), dph = Float64Array.from(METALL, (f) => (f * 3.1) / RATE), d = abfall(0.32), dg = abfall(0.06), wg = (2 * Math.PI * 2150) / RATE;
  spiele(bus, t, 0.8, (i) => {
    // die Phasen fortlaufend weiterzählen statt je Abtastwert zu teilen: das rechnet am Telefon schneller
    let x = 0; for (let j = 0; j < 6; j++) { let q = ph[j] + dph[j]; if (q >= 1) q -= 1; ph[j] = q; x += q < 0.5 ? 1 : -1; }
    x /= 6;
    hpY = 0.9 * (hpY + x - hpX); hpX = x;
    const v = hpY * h * 0.5 + g * 0.18 * Math.sin(wg * i);
    h *= d; g *= dg;
    return v;
  });
}
/** Basston (seit Beat 0.3.0): Sägezahn mit einem Filter, das sich nach dem Anschlag schliesst, darunter ein Sinus, sanft gesättigt.
 *  Die Obertöne lassen den Bass auch auf kleinen Lautsprechern hören, wo der Grundton fehlt. */
function basston(bus, t, dauer, frequenz, staerke, teiltoene) {
  let ph = 0, h = 1, lp = 0, lp2 = 0, auf = 1;
  const halten = Math.round(dauer * RATE), dh = abfall(dauer * 2.5), dl = abfall(0.015), an = 0.004 * RATE, df = abfall(0.09), k0 = 0.015 + 0.012 * teiltoene;
  spiele(bus, t, dauer + 0.06, (i) => {
    ph += frequenz / RATE;
    const k = k0 * (0.35 + 0.65 * auf);
    lp += k * (saege(ph) - lp); lp2 += k * (lp - lp2);
    const w = staerke * Math.min(1, i / an) * h * Math.tanh(1.5 * (0.8 * lp2 + 0.7 * Math.sin(2 * Math.PI * ph))) * 0.75;
    h *= i < halten ? dh : dl; auf *= df;
    return w;
  });
}
/** Kontrabass: eine gezupfte Saite (Karplus-Strong, 1983) aus gefiltertem Rauschen, dazu der Grundton als Körper und der Anschlag des Fingers */
function kontrabass(bus, t, dauer, f, staerke, rnd) {
  const N = Math.max(2, Math.round(RATE / f)), saite = new Float32Array(N);
  let lp = 0;
  for (let j = 0; j < N; j++) { lp += 0.25 * (rauschen(rnd) - lp); saite[j] = lp * 2.2; }
  let j = 0, h = 1, koerper = 1;
  const halten = Math.round(dauer * RATE), dl = abfall(0.04), dk = abfall(0.6), an = 0.002 * RATE;
  spiele(bus, t, dauer + 0.2, (i) => {
    const n = (j + 1) % N, y = saite[j];
    saite[j] = 0.5 * (y + saite[n]) * 0.997; j = n;
    const v = staerke * Math.min(1, i / an) * h * Math.tanh(1.3 * (0.9 * y + 0.55 * koerper * Math.sin((2 * Math.PI * f * i) / RATE)));
    koerper *= dk; if (i >= halten) h *= dl;
    return v;
  });
}
/**
 * Sub-Bass: eine einzige Stimme durch alle Töne, die von Ton zu Ton gleitet (30 ms), Sinus mit etwas zweitem und drittem Teilton, sanft
 * gesättigt; die Teiltöne tragen ihn bis in die warmen Mitten, so ist er auch ohne Tieftöner zu hören. noten: [{ t, dauer, f, staerke }], nach t geordnet.
 */
function subbass(bus, noten) {
  if (!noten.length) return;
  let ph = 0, f = noten[0].f, h = 0, j = 0;
  const gleiten = 1 - abfall(0.03), weich = 1 - abfall(0.006), a0 = Math.max(0, Math.round(noten[0].t * RATE));
  const z = Math.min(bus.length, Math.round((noten.at(-1).t + noten.at(-1).dauer + 0.1) * RATE));
  for (let i = a0; i < z; i++) {
    const s = i / RATE;
    while (j < noten.length - 1 && s >= noten[j + 1].t) j++;
    const x = noten[j], an = s >= x.t && s < x.t + x.dauer;
    f += (x.f - f) * gleiten; h += ((an ? x.staerke : 0) - h) * weich;
    ph += f / RATE;
    const w = 2 * Math.PI * ph;
    bus[i] += h * Math.tanh(1.8 * (Math.sin(w) + 0.4 * Math.sin(2 * w) + 0.2 * Math.sin(3 * w))) * 0.8;
  }
}
// rollende Basslinien je Takt: [Halbtöne über dem Grundton des Akkords, erster Schritt, Länge in Schritten]; die chromatischen
// Nachbartöne wie im atmosphärischen Jungle
const ROLLEN = Object.freeze([
  [[0, 0, 6], [1, 6, 4], [2, 10, 3], [7, 13, 3]],
  [[0, 0, 5], [-2, 5, 3], [-1, 8, 6], [0, 14, 2]],
  [[0, 0, 3], [0, 3, 3], [3, 6, 4], [5, 10, 2], [7, 12, 4]],
  [[7, 0, 6], [8, 6, 2], [7, 8, 4], [0, 12, 4]],
]);
/** E-Piano (wie ein Rhodes): Frequenzmodulation 1:1, deren Index nach dem Anschlag fällt, dazu die hohe Zunge als kurzer Glanz */
function rhodes(bus, t, f, staerke, dauer) {
  let h = 1, idx = 1, zunge = 1;
  const halten = Math.round(dauer * RATE), dh = abfall(1.4), dl = abfall(0.06), di = abfall(0.25), dz = abfall(0.03), an = 0.003 * RATE, w = (2 * Math.PI * f) / RATE;
  spiele(bus, t, dauer + 0.3, (i) => {
    const v = staerke * Math.min(1, i / an) * h * (Math.sin(w * i + (0.25 + 1.6 * idx) * Math.sin(w * i)) + 0.12 * zunge * Math.sin(w * 7 * i));
    h *= i < halten ? dh : dl; idx *= di; zunge *= dz;
    return v;
  });
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
    const v = staerke * Math.min(1, i / an) * h * Math.tanh(1.4 * (0.7 * lp2 + 0.8 * Math.sin((2 * Math.PI * f * i) / RATE)));
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
export function beatRechnen({ messung, plan, dauer, grundton, kammerton = 432, nachhall: hall = 0.25, seed = 1 }) {
  const rnd = zufall(seed >>> 0), kit = KITS[plan.kit], g = GROOVES[plan.groove], leiter = TONLEITERN[plan.tonart], folge = FOLGEN[plan.tonart];
  const { werte, abschnitte } = messung, S = abschnitte.length;
  // Tempo: die Stufe gibt den Bereich, die Feinheit die Stelle darin; dann so angepasst, dass ganze Schläge genau die Dauer füllen
  // (Drum and Bass hat sein eigenes Tempo, 170–176)
  const [lo, hi] = g.tempo ?? TEMPI[plan.tempo], fein = Math.min(1, Math.max(0, (werte.feinheit - 0.02) / 0.08));
  // (in ganzen Schlägen: der letzte Takt darf kürzer sein, das Tempo weicht so höchstens um einen halben Schlag ab)
  const bpmWunsch = lo + (hi - lo) * fein, schlaege = Math.max(4, Math.round((dauer * bpmWunsch) / 60)), bpm = (schlaege * 60) / dauer, takte = Math.ceil(schlaege / 4);
  const schritt = 60 / bpm / 4, n = Math.round(dauer * RATE);
  const bus = { kick: new Float32Array(n), snare: new Float32Array(n), hat: new Float32Array(n), bass: new Float32Array(n), melodie: new Float32Array(n), komp: new Float32Array(n) };
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
  } else G = { ...g, kick: muster(g.kick), snare: muster(g.snare), geist: muster(g.geist), hat: muster(g.hat), offen: muster(g.offen), fuss: muster(g.fuss ?? "................") };
  // Swing: als Anteil eines Schritts; beim Jazz liegen die Achtel genau auf den Triolen (das zweite Achtel auf zwei Dritteln des Viertels)
  const TRIOLE = [0, 1 / 3, 2 / 3, -1 / 3];
  const zeit = (takt, s) => (takt * 16 + s) * schritt + (G.triole ? TRIOLE[s % 4] * schritt : s % 4 === 2 ? G.swing * 2 * schritt : s % 2 === 1 ? G.swing * schritt : 0);
  const kicks = [];
  const grund = (kammerton / 8) * 2 ** ((((grundton - 9) % 12) + 12) % 12 / 12), basis = grund > kammerton * 0.1875 ? grund / 2 : grund;
  const hoehe = (k, oktave = 0) => basis * 2 ** (stufeHalbton(leiter, k) / 12 + oktave);
  const wechsel = g.wechsel ?? 1;

  for (let takt = 0; takt < takte; takt++) {
    const e = energie[takt], a = abschnitte[abschnittVon(takt)], letzter = takt === takte - 1 || abschnittVon(takt + 1) !== abschnittVon(takt);
    const dichte = Math.min(1, Math.max(0, (a.feinheit - 0.02) / 0.08)), zart = wechselnd && !wild[takt];
    const fill = (letzter || (wild[takt] && !wild[takt + 1] && takt < takte - 1)) && e >= 0.7 && takte > 1 && !zart;
    for (let s = 0; s < 16; s++) {
      // genau: die Schläge liegen auf dem Raster, die Stärke schwankt nur wenig (seit Beat 0.3.0, vorher ±10 %)
      const t = zeit(takt, s), mensch = 0.96 + 0.08 * rnd(), kl = G.kickLaut ?? 1;
      if (t >= dauer) continue;   // der letzte Takt kann kürzer sein
      const extraKick = wild[takt] && !G.kick[s] && (s === 7 || s === 13) && rnd() < 0.35;
      if (e >= 0.3 && (G.kick[s] || extraKick) && !(fill && s >= 12)) { kick(bus.kick, t, mensch * (extraKick ? 0.85 : kl * (s % 8 === 0 ? 1 : 0.85)) * (zart ? 0.8 : 1), kit.kick); kicks.push(t); partitur.push({ t, stimme: "bassdrum", staerke: 1, schritt: takt * 16 + s }); }
      if (e >= 0.55 && G.snare[s] && !(fill && s >= 12)) { snare(bus.snare, t, mensch * (zart ? 0.55 : 0.9), kit.snare, rnd); partitur.push({ t, stimme: "snare", staerke: 0.8, schritt: takt * 16 + s }); }
      // wild: am Taktende zwei Zweiunddreissigstel auf der Snare (Stottern)
      if (wild[takt] && s === 15 && !fill && rnd() < 0.5) for (const d of [0, schritt / 2]) { snare(bus.snare, t + d, 0.45 * mensch, kit.snare, rnd); partitur.push({ t: t + d, stimme: "snare", staerke: 0.4, schritt: takt * 16 + s }); }
      if (e >= 0.75 && G.geist[s] && rnd() < (wild[takt] ? 0.95 : 0.8)) { snare(bus.snare, t, (G.ride ? 0.16 : 0.25) * mensch, kit.snare, rnd); partitur.push({ t, stimme: "snare", staerke: 0.25, schritt: takt * 16 + s }); }
      if (e >= 0.45 && G.ride) {
        // Ride-Becken: Viertel betont, die Zwischenschläge leiser; in zarten Takten nur die Viertel; die Hi-Hat mit dem Fuss
        if (G.hat[s] && (!zart || s % 4 === 0)) { ride(bus.hat, t, mensch * (s % 4 === 0 ? 0.75 : 0.5) * (zart ? 0.7 : 1), rnd); partitur.push({ t, stimme: "ride", staerke: 0.3, schritt: takt * 16 + s }); }
        if (G.fuss[s]) { hat(bus.hat, t, 0.45 * mensch, kit.hat, false, rnd); partitur.push({ t, stimme: "becken", staerke: 0.15, schritt: takt * 16 + s }); }
        if (wild[takt] && !G.hat[s] && s % 2 === 1 && rnd() < 0.3) { ride(bus.hat, t, 0.3 * mensch, rnd); partitur.push({ t, stimme: "ride", staerke: 0.15, schritt: takt * 16 + s }); }
      } else if (e >= 0.45) {
        const offen = G.offen[s] && plan.kit !== "trocken" && !zart;
        if (zart) { if (s % 4 === 2) { hat(bus.hat, t, 0.4 * mensch, kit.hat, false, rnd); partitur.push({ t, stimme: "becken", staerke: 0.15, schritt: takt * 16 + s }); } }
        else if (G.hat[s] || offen) { hat(bus.hat, t, mensch * (s % 4 === 0 ? 0.9 : 0.65), kit.hat, offen, rnd); partitur.push({ t, stimme: offen ? "becken offen" : "becken", staerke: 0.3, schritt: takt * 16 + s }); }
        else if (e >= 0.8 && rnd() < (wild[takt] ? 0.6 : dichte * 0.7)) { hat(bus.hat, t, 0.35 * mensch, kit.hat, false, rnd); partitur.push({ t, stimme: "becken", staerke: 0.15, schritt: takt * 16 + s }); }
      }
      // Wirbel am Ende eines Abschnitts: Sechzehntel, lauter werdend (Halftime: Achtel)
      if (fill && s >= 12 && (plan.groove !== "halftime" || s % 2 === 0)) { snare(bus.snare, t, 0.4 + 0.15 * (s - 12), kit.snare, rnd); partitur.push({ t, stimme: "snare", staerke: 0.6, schritt: takt * 16 + s }); }
    }
  }
  const akkord = (takt) => folge[Math.floor(takt / wechsel) % folge.length];
  const toene = [], linie = { k: 7, rest: 0, pause: 1 }, subNoten = [];
  for (let takt = 0; takt < takte; takt++) {
    const e = energie[takt], r = akkord(takt), a = abschnitte[abschnittVon(takt)], zart = wechselnd && !wild[takt];
    if (plan.bass !== "keiner" && e >= 0.4) {
      if (plan.bass === "liegend") basston(bus.bass, zeit(takt, 0), 16 * schritt * 0.95, hoehe(r), 0.9, kit.bass);
      else if (plan.bass === "pulsierend") for (let s = 0; s < 16; s += 2) basston(bus.bass, zeit(takt, s), schritt * 1.6, hoehe(r, s % 4 === 2 && e >= 0.7 ? 1 : 0), s % 4 === 0 ? 0.85 : 0.65, kit.bass);
      else if (plan.bass === "reese") {
        // lange Töne von Bassdrum zu Bassdrum, wie im Drum and Bass
        const ks = [...Array(16).keys()].filter((x) => G.kick[x]);
        if (!ks.length || ks[0] !== 0) ks.unshift(0);
        ks.forEach((s0, j) => reese(bus.bass, zeit(takt, s0), ((ks[j + 1] ?? 16) - s0) * schritt * 0.97, hoehe(r + (j === ks.length - 1 && wild[takt] && rnd() < 0.4 ? 4 : 0)), 0.8));
      } else if (plan.bass === "sub") {
        // die Linie wählt der Startwert je Takt; im letzten Takt eines Akkords gleitet sie zum Halbton unter dem nächsten Grundton
        const linieB = ROLLEN[Math.floor(rnd() * ROLLEN.length)], wurzel = stufeHalbton(leiter, r), naechste = stufeHalbton(leiter, akkord(takt + 1));
        const wechseltNach = (takt + 1) % wechsel === 0 && naechste !== wurzel;
        linieB.forEach(([ht, s0, lang], q) => {
          let h = q === linieB.length - 1 && wechseltNach ? naechste - 1 : wurzel + ht;
          h = ((h % 12) + 12) % 12; if (h > 9) h -= 12;
          subNoten.push({ t: zeit(takt, s0), dauer: lang * schritt * 0.96, f: basis * 2 ** (h / 12), staerke: (s0 === 0 ? 0.95 : 0.8) * (zart ? 0.85 : 1) });
        });
      } else if (plan.bass === "kontrabass") {
        // Walking Bass: Grundton auf der Eins, dann Akkordtöne oder Schritte, zuletzt ein Halbton neben dem nächsten Grundton;
        // bei Drum-and-Bass-Tempo in halben Noten (das Viertel des halben Tempos)
        const abstand = bpm > 140 ? 8 : 4, ziel = stufeHalbton(leiter, akkord(takt + 1)), wege = [[0, 2, 4], [0, 4, 2], [0, 1, 2], [0, 2, 3]];
        const weg = wege[Math.floor(rnd() * wege.length)], schlaegeJe = 16 / abstand;
        let vorher = null;
        for (let q = 0; q < schlaegeJe; q++) {
          let ht = q === schlaegeJe - 1 && q > 0 ? ziel + (rnd() < 0.5 ? -1 : 1) : stufeHalbton(leiter, r + weg[q % weg.length]);
          ht = ((ht % 12) + 12) % 12; if (vorher !== null && ht - vorher > 7) ht -= 12; vorher = ht;
          kontrabass(bus.bass, zeit(takt, q * abstand), abstand * schritt * 0.92, basis * 2 ** (ht / 12), q === 0 ? 0.95 : 0.8, rnd);
          // wild: ein kurzer Vorschlag auf dem späten Achtel vor dem nächsten Schlag
          if (wild[takt] && q < schlaegeJe - 1 && rnd() < 0.35) kontrabass(bus.bass, zeit(takt, q * abstand + abstand - 2) + (G.triole ? 0 : schritt * 0.67), schritt * 0.9, basis * 2 ** (ht / 12), 0.55, rnd);
        }
      } else { const weg = [0, 2, 4, 2]; for (let q = 0; q < 4; q++) basston(bus.bass, zeit(takt, q * 4), schritt * 3.4, hoehe(r + weg[q] + (q === 3 && rnd() < 0.5 ? 1 : 0)), 0.8, kit.bass); }
    }
    // Akkorde (Comping) unter der Jazzlinie und allein: Vierklänge ohne Grundton (Terz, Quinte, Septime, None), synkopiert
    if ((plan.melodie === "linie" || plan.melodie === "akkorde") && e >= 0.55) {
      const komp = KOMPING[Math.floor(rnd() * KOMPING.length)], laut = plan.melodie === "akkorde" ? 0.16 : 0.09;
      for (let s = 0; s < 16; s++) if (komp[s] === "x" && (!zart || s < 8)) {
        const t = zeit(takt, s), lang = schritt * (rnd() < 0.5 ? 1.6 : 4);
        if (t >= dauer) continue;
        vierklang(r).slice(1).forEach((k, j) => rhodes(bus.komp, t + j * 0.004, hoehe(k, 2), laut * mensch(rnd), lang));
        partitur.push({ t, stimme: "akkord", staerke: laut, schritt: takt * 16 + s });
      }
    }
    if (plan.melodie === "keine" || plan.melodie === "akkorde" || e < 0.62) continue;
    const anfang = Math.floor((abschnittVon(takt) * takte) / S), ende = Math.max(anfang + 1, Math.floor(((abschnittVon(takt) + 1) * takte) / S));
    if (plan.melodie === "bild") {
      for (let s = 0; s < 16; s += 2) {
        const u = (takt - anfang + s / 16) / (ende - anfang), sp = a.spalten[Math.min(a.spalten.length - 1, Math.floor(u * a.spalten.length))];
        if (sp.spitze - sp.mittel < 0.12) continue;
        toene.push({ t: zeit(takt, s), frequenz: hoehe(Math.round((1 - sp.y) * 2 * leiter.length), 2), staerke: 0.25 + 0.4 * sp.spitze, dauer: schritt * 2 });
      }
    } else if (plan.melodie === "linie") {
      // Jazzlinie: Phrasen aus Achteln mit Pausen dazwischen; auf den schweren Zeiten ein Ton des Vierklangs, dazwischen Schritte
      // in der Tonleiter, vor einem schweren Ton manchmal ein Halbton darunter; die Richtung folgt der hellsten Stelle im Bild
      for (let s = 0; s < 16; s += 2) {
        if (linie.pause > 0) { linie.pause--; continue; }
        if (linie.rest <= 0) { linie.rest = 5 + Math.floor(rnd() * 8); linie.pause = 1 + Math.floor(rnd() * 4); continue; }
        const u = (takt - anfang + s / 16) / (ende - anfang), sp = a.spalten[Math.min(a.spalten.length - 1, Math.floor(u * a.spalten.length))];
        const zielK = 4 + Math.round((1 - sp.y) * 8), richtung = Math.sign(zielK - linie.k) || (rnd() < 0.5 ? 1 : -1);
        let k = linie.k, chrom = 0;
        if (s % 4 === 0) {
          const akk = vierklang(r).flatMap((x) => [x - leiter.length, x, x + leiter.length]);
          k = akk.reduce((b, x) => (Math.abs(x - (linie.k + richtung)) < Math.abs(b - (linie.k + richtung)) && x !== linie.k ? x : b), akk[0]);
        } else if (rnd() < 0.25) { k = linie.k + richtung; chrom = -1; }
        else k = linie.k + (rnd() < 0.75 ? richtung : -2 * richtung);
        k = Math.max(-2, Math.min(14, k)); linie.k = k; linie.rest--;
        const letzte = linie.rest === 0;
        toene.push({ t: zeit(takt, s), frequenz: basis * 2 ** ((stufeHalbton(leiter, k) + chrom) / 12 + 2), staerke: s % 4 === 2 ? 0.4 : 0.32, dauer: schritt * (letzte ? 4 : 1.8), rhodes: true });
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
        toene.push({ t: zeit(takt, s), frequenz: hoehe(k, 2), staerke: 0.2 + 0.4 * p.v, dauer: 1.2, glocke: true });
        if (toene.filter((x) => x.t >= zeit(takt, 0)).length >= 3) break;
      }
    }
  }
  // der Bass weicht der Bassdrum kurz aus (Sidechain)
  subbass(bus.bass, subNoten.filter((x) => x.t < dauer));
  const dk = abfall(0.07), tief = plan.bass === "kontrabass" ? 0.25 : plan.bass === "sub" ? 0.35 : 0.55;
  for (const k of kicks) { let d = tief; for (let i = Math.max(0, Math.round(k * RATE)), z = Math.min(n, i + Math.round(0.35 * RATE)); i < z; i++) { bus.bass[i] *= 1 - d; d *= dk; } }
  toene.splice(0, toene.length, ...toene.filter((x) => x.t < dauer));
  for (const x of toene) melodieTon(bus.melodie, x, kit);
  for (const x of toene) partitur.push({ t: x.t, stimme: "melodie", staerke: rund(x.staerke), hz: rund(x.frequenz, 100) });

  // die Fläche: je Akkord der Vierklang mit None (Grundton, darüber Terz, Septime, None und Quinte), lang überlappend, mit viel Raum
  const flL = new Float32Array(n), flR = new Float32Array(n);
  if (plan.flaeche && plan.flaeche !== "keine") for (let c = 0; c < takte; c += wechsel) {
    const r = akkord(c), t0 = zeit(c, 0);
    if (t0 >= dauer) break;
    const lang = Math.min(dauer - t0, wechsel * 16 * schritt) + 1.2;
    for (const [k, o] of [[r, 1], [r + 2, 1], [r + 6, 1], [r + 8, 1], [r + 4, 2]]) flaeche(flL, flR, t0, lang, hoehe(k, o), kit.dunkel ? 0.28 : 0.1, plan.flaeche === "schimmer");
  }
  const raumL = plan.flaeche && plan.flaeche !== "keine" ? nachhall(flL, RATE, 0.85) : flL, raumR = plan.flaeche && plan.flaeche !== "keine" ? nachhall(flR, RATE, 0.85) : flR;

  // mischen: Bassdrum und Bass in der Mitte, Becken und Melodie zur Seite des Schwerpunkts, Nachhall auf Snare und Melodie
  const pan = Math.max(-0.6, Math.min(0.6, werte.schwerpunktX * 2));
  // dunkles Schlagzeug: Snare und Becken durch zwei Tiefpässe erster Ordnung, dann leicht gesättigt
  if (kit.dunkel) {
    const c = 1 - Math.exp((-2 * Math.PI * kit.dunkel) / RATE);
    for (const b of [bus.snare, bus.hat]) { let a = 0, z = 0; for (let i = 0; i < n; i++) { a += c * (b[i] - a); z += c * (a - z); b[i] = Math.tanh(1.3 * z) / 1.1; } }
  }
  const melodie = nachhall(bus.melodie, RATE, Math.min(0.9, hall * 1.6)), sn = nachhall(bus.snare, RATE, hall * 0.6), komp = nachhall(bus.komp, RATE, Math.min(0.9, hall * 1.4));
  const L = new Float32Array(n), R = new Float32Array(n), flMix = kit.dunkel ? 0.7 : 0.5;
  const gl = (p) => Math.cos(((p + 1) * Math.PI) / 4), gr = (p) => Math.sin(((p + 1) * Math.PI) / 4);
  for (let i = 0; i < n; i++) {
    const mitte = bus.kick[i] * 0.6 + sn[i] * (kit.dunkel ? 0.9 : 0.45) + bus.bass[i] * (plan.bass === "sub" ? 0.6 : 0.45);
    L[i] = mitte + bus.hat[i] * 0.8 * gl(-pan * 0.5) + melodie[i] * 0.4 * gl(pan) + komp[i] * 0.5 * gl(-pan * 0.7) + raumL[i] * flMix;
    R[i] = mitte + bus.hat[i] * 0.8 * gr(-pan * 0.5) + melodie[i] * 0.4 * gr(pan) + komp[i] * 0.5 * gr(-pan * 0.7) + raumR[i] * flMix;
  }
  // sanft sättigen, auf −1 dBFS bringen, Anfang und Ende 5 ms einblenden
  for (const x of [L, R]) for (let i = 0; i < n; i++) x[i] = Math.tanh(x[i]);
  const verstaerkung = pegeln([L, R], "normal"), rand = Math.min(n >> 1, Math.round(0.005 * RATE));
  for (let i = 0; i < rand; i++) { const f = i / rand; L[i] *= f; R[i] *= f; L[n - 1 - i] *= f; R[n - 1 - i] *= f; }
  partitur.sort((a, b) => a.t - b.t);
  return {
    spuren: [L, R], rate: RATE, partitur: partitur.map((x) => ({ ...x, t: rund(x.t) })),
    angaben: { bpm: rund(bpm, 100), bpmWunsch: rund(bpmWunsch, 10), takte, abschnitte: S, grundton: NOTEN[grundton], kammerton, wild: wild.slice(0, takte).filter(Boolean).length, energie: energie.map((x) => rund(x, 100)), toene: toene.length, verstaerkung: rund(verstaerkung, 1e4) },
  };
}
function melodieTon(bus, x, kit) {
  if (x.rhodes || (kit.melodie === "rhodes" && !x.glocke)) return rhodes(bus, x.t, x.frequenz, x.staerke, x.dauer);
  ton(bus, RATE, { t: x.t, frequenz: x.frequenz, staerke: x.staerke }, { farbe: x.glocke ? "glocke" : kit.melodie, anschlag: 0.004, abklingen: x.glocke ? 0.5 : Math.max(0.08, x.dauer * 0.8) });
}
