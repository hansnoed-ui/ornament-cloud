// Multiverse – die neun Anwendungen (Wunsch vom 8. November 2026: «Auf einer Seite werden immer 4 meiner Anwendungen gleichzeitig nebeneinander
// gezeigt und sind direkt bedienbar»; KONSTELLATION als neunte am selben Tag). Je Anwendung: Adresse (relativ zu multiverse/), Name, Farbe des
// Lichtbogens und zwei Pixelzeichen auf 13 × 13 (aus, an) für den Schalter. Ohne DOM, damit auch tools/b-kacheln.mjs die Zeichen zeichnen kann.
//
// Adressen: ?b=1 ist die Bühne des Neubaus (ohne eigene Kopf- und Fusszeile, wo die Anwendung sie kennt), ?intro=0 schaltet ein eigenes Intro
// ab (nur ORNA hat eines, und das nur als App oder mit ?intro; die übrigen starten ohnehin direkt). «allein» öffnet die Anwendung für sich.
// «kompakt»: CSS, das die Seite in den Rahmen legt, sobald er geladen ist (gleicher Ursprung): ohne Titelkopf und Navigation, die Bedienung zuoberst.
// Nur hier im Multiverse; die Anwendungen selbst bleiben unverändert.
import { raster, N } from "../assets/pixel-schalter.js?v=1";

// ——— kleine Zeichenhilfen auf dem Raster ———
const M = (N - 1) / 2;
/** Punkte zusammenführen: je Stelle die grösste Deckkraft, nur innerhalb des Rasters */
function feld(...gruppen) {
  const m = new Map();
  for (const g of gruppen) for (const [x, y, a = 1] of g) {
    const X = Math.round(x), Y = Math.round(y);
    if (X < 0 || Y < 0 || X >= N || Y >= N) continue;
    const k = Y * N + X; if ((m.get(k) ?? 0) < a) m.set(k, a);
  }
  return [...m].map(([k, a]) => [k % N, Math.floor(k / N), a]);
}
/** gerade Linie von Pixel zu Pixel (Bresenham) */
function linie(x0, y0, x1, y1, a = 1) {
  const p = [], dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let f = dx + dy, x = x0, y = y0;
  for (;;) { p.push([x, y, a]); if (x === x1 && y === y1) break; const e = 2 * f; if (e >= dy) { f += dy; x += sx; } if (e <= dx) { f += dx; y += sy; } }
  return p;
}
const zug = (punkte, a = 1) => punkte.slice(1).flatMap((q, i) => linie(...punkte[i], ...q, a));
/** Kreislinie (Ring) um cx, cy */
function ring(cx, cy, r, a = 1, dicke = .5) {
  const p = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (Math.abs(Math.hypot(x - cx, y - cy) - r) < dicke) p.push([x, y, a]);
  return p;
}
const scheibe = (cx, cy, r, a = 1) => { const p = []; for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (Math.hypot(x - cx, y - cy) <= r) p.push([x, y, a]); return p; };
const block = (x, y, b = 2, h = b, a = 1) => Array.from({ length: b * h }, (_, i) => [x + (i % b), y + Math.floor(i / b), a]);

// ——— die Zeichen ———
const Z = {
  // The Fictory: die Fabrik mit Sheddach; an: Rauch aus dem Kamin, die Halle erleuchtet
  fictory: [raster([
    ".............",
    ".............",
    "..........#..",
    "..........#..",
    ".#...#....#..",
    ".##..##...#..",
    ".###.###..#..",
    ".###########.",
    ".#.........#.",
    ".#.#.#.#.#.#.",
    ".#.........#.",
    ".###########.",
    ".............",
  ]), raster([
    ".......+.:...",
    "........#.+..",
    "..........#..",
    "..........#..",
    ".#...#....#..",
    ".##..##...#..",
    ".###.###..#..",
    ".###########.",
    ".###########.",
    ".##:##:##:##.",
    ".###########.",
    ".###########.",
    ".............",
  ])],
  // PHORMA I: ein Bild, das in Splitter zerfällt
  "phorma-i": [raster([
    ".............",
    ".............",
    "..#########..",
    "..#########..",
    "..#########..",
    "..#########..",
    "..#########..",
    "..#########..",
    "..#########..",
    "..#########..",
    "..#########..",
    ".............",
    ".............",
  ]), raster([
    "##.......:...",
    "##..###......",
    "....###..##..",
    ".:..##...##..",
    ".........#...",
    "..##...###...",
    "..###..##...#",
    "..##........#",
    ".......##.:..",
    ".:.###.###...",
    "...##...#....",
    "..........##.",
    "...:......##.",
  ])],
  // PHORMA II: ein Raster, das zum wehenden Tuch wird
  "phorma-ii": [
    feld(...[2, 5, 8, 11].map((y) => linie(0, y, 12, y)), ...[2, 6, 10].map((x) => [[x, 3, .38], [x, 4, .38], [x, 6, .38], [x, 7, .38], [x, 9, .38], [x, 10, .38]])),
    feld(...[2, 5, 8, 11].map((y, i) => Array.from({ length: N }, (_, x) => [x, y + 1.3 * Math.sin(x * .62 + i * .9), 1]))),
  ],
  // PHORMA III: der Würfel aus Licht; an: ein Faden irrt durch ihn
  "phorma-iii": (() => {
    const vorn = [[1, 4], [8, 4], [8, 11], [1, 11], [1, 4]], hinten = [[4, 1], [11, 1], [11, 8], [4, 8], [4, 1]];
    const kanten = (a) => feld(zug(vorn, a), zug(hinten, a), ...[[1, 4], [8, 4], [8, 11], [1, 11]].map(([x, y]) => linie(x, y, x + 3, y - 3, a)));
    const faden = zug([[3, 9], [6, 6], [9, 7], [7, 3], [5, 5], [3, 6], [6, 9], [9, 5]]);
    return [kanten(1), feld(kanten(.38), faden)];
  })(),
  // ORNA: zwei Ringe; an: die Zeichen auf den Ringen und die Achsenmarke oben
  orna: [
    feld(ring(M, M, 5.6), ring(M, M, 3)),
    feld(ring(M, M, 5.6, .38), ring(M, M, 3, .38),
      ...Array.from({ length: 8 }, (_, i) => { const w = i * Math.PI / 4 + Math.PI / 8; return [[M + 4.4 * Math.cos(w), M + 4.4 * Math.sin(w), 1]]; }),
      ...Array.from({ length: 6 }, (_, i) => { const w = i * Math.PI / 3; return [[M + 1.6 * Math.cos(w), M + 1.6 * Math.sin(w), 1]]; }),
      [[M, 0, 1], [M - 1, 0, .6], [M + 1, 0, .6], [M, 1, 1], [M, M, 1]]),
  ],
  // Das Dritte Rad: zwei Räder; an: das dritte kommt dazu
  "drittes-rad": [
    feld(ring(3, 6.5, 2.4), ring(10, 6.5, 2.4), [[3, 6.5, 1], [10, 6.5, 1]]),
    feld(ring(3, 9.3, 2.4), ring(10, 9.3, 2.4), ring(6.5, 3, 2.4), [[3, 9.3, 1], [10, 9.3, 1], [6.5, 3, 1]]),
  ],
  // Facebook-Zettelkasten (Hypertext): ein Stapel Zettel; an: das Netz der Querverweise
  kunst: [raster([
    ".............",
    ".............",
    "...#######...",
    "...#.....#...",
    "..#######.#..",
    "..#.....#.#..",
    ".#######.##..",
    ".#.....#.#...",
    ".#.###.###...",
    ".#.....#.....",
    ".#.###.#.....",
    ".#######.....",
    ".............",
  ]), feld(
    ...[[1, 1], [9, 1], [5, 5], [1, 9], [10, 8], [5, 11]].map(([x, y]) => block(x, y)),
    linie(2, 2, 5, 5, .6), linie(9, 2, 6, 5, .6), linie(6, 6, 10, 8, .6), linie(5, 6, 2, 9, .6), linie(5, 6, 5, 11, .6), linie(2, 10, 5, 11, .38), linie(10, 9, 6, 11, .38), linie(2, 2, 9, 2, .38),
  )],
  // Animationen: ein Startzeichen; an: es dreht sich zur Spirale auf
  animations: [
    raster([
      ".............",
      ".............",
      "...#.........",
      "...###.......",
      "...#####.....",
      "...#######...",
      "...#########.",
      "...#######...",
      "...#####.....",
      "...###.......",
      "...#.........",
      ".............",
      ".............",
    ]),
    feld(zug([[1, 1], [11, 1], [11, 11], [1, 11], [1, 3], [9, 3], [9, 9], [3, 9], [3, 5], [7, 5], [7, 7], [5, 7]])),
  ],
  // KONSTELLATION: verstreute Sterne; an: verbunden zum Sternbild
  konstellation: (() => {
    const sterne = [[2, 3], [5, 1], [9, 2], [11, 6], [7, 6], [4, 9], [8, 11], [1, 11]];
    return [
      feld(sterne.map(([x, y], i) => [x, y, i % 3 === 0 ? 1 : .6]), [[3, 6, .38], [10, 10, .38], [6, 4, .38]]),
      feld(zug([[2, 3], [5, 1], [9, 2], [11, 6], [7, 6], [4, 9], [8, 11]], .38), linie(4, 9, 1, 11, .38),
        sterne.map(([x, y]) => [x, y, 1]), ...[[9, 2], [7, 6], [4, 9]].map(([x, y]) => [[x - 1, y, .6], [x + 1, y, .6], [x, y - 1, .6], [x, y + 1, .6]])),
    ];
  })(),
};

export const ANWENDUNGEN = [
  { id: "fictory", kompakt: "body > header.site-header { display: none !important; }", name: "The Fictory", satz: "Ein Bild zerfällt und geht weiter", farbe: "#ffc23d", adresse: "../alpha/the-fictory/?b=1&sprache=de&intro=0", allein: "../alpha/the-fictory/" },
  { id: "phorma-i", kompakt: "body > header.site-header { display: none !important; }", name: "PHORMA I", satz: "Ein Foto in Splittern", farbe: "#8fb0ff", adresse: "../alpha/bildfragmentieren/?b=1&sprache=de&intro=0", allein: "../alpha/bildfragmentieren/" },
  { id: "phorma-ii", kompakt: "body > header.site-header { display: none !important; }", name: "PHORMA II", satz: "Schleimpilz, Tuch, Wasser", farbe: "#4fe0bd", adresse: "../alpha/phorma-ii/?b=1&sprache=de&intro=0", allein: "../alpha/phorma-ii/" },
  { id: "phorma-iii", kompakt: "body > header.site-header { display: none !important; }", name: "PHORMA III", satz: "Aus Klang wird Bild", farbe: "#ff6b5e", adresse: "../alpha/phorma-iii/?b=1&sprache=de&intro=0", allein: "../alpha/phorma-iii/" },
  { id: "orna", kompakt: "body > header.site-header, .rad-install { display: none !important; }", name: "ORNA", satz: "Zwei Ringe, eine Begegnung", farbe: "#c7a8ff", adresse: "../portfolio/nebeneinander-nacheinander/?b=1&sprache=de&intro=0", allein: "../portfolio/nebeneinander-nacheinander/" },
  { id: "drittes-rad", kompakt: "body > nav.seitenweg { display: none !important; }", name: "Das Dritte Rad", satz: "Zeichen, Farben, Begriffe", farbe: "#ff9d3a", adresse: "../alpha/drittes-rad/?intro=0", allein: "../alpha/drittes-rad/" },
  { id: "kunst", name: "Zettelkasten", satz: "Facebook-Beiträge als Hypertext", farbe: "#f2f2f2", adresse: "../alpha/kunst/?intro=0", allein: "../alpha/kunst/" },
  { id: "animations", name: "Animations", satz: "Drei Ebenen, ein Bild", farbe: "#c9ff3d", adresse: "../animations/?intro=0", allein: "../animations/" },
  { id: "konstellation", name: "Konstellation", satz: "Name, Ort, Augenblick", farbe: "#ffe08a", adresse: "../alpha/konstellation/?intro=0", allein: "../alpha/konstellation/" },
].map((a) => ({ ...a, aus: Z[a.id][0], an: Z[a.id][1] }));

/** die vier beim ersten Besuch: verschieden in Art und Farbe, alle sofort lebendig */
export const STANDARD = ["orna", "phorma-iii", "drittes-rad", "fictory"];
export const PLAETZE = 4;

/**
 * Die Regel: höchstens vier laufen (seit 8. November 2026 abends, Rückmeldung: «weniger als vier dürfen auch laufen»; vorher genau vier).
 * «plaetze» sind die vier Felder (fest, damit ein Wechsel nur ein Feld neu lädt; null = frei), «reihe» die laufenden in der Reihenfolge, in der
 * sie eingeschaltet wurden (vorne die am längsten laufende), «ruhe» die übrigen. Einschalten nimmt ein freies Feld, sonst löst es die am längsten
 * laufende ab; ausschalten macht das Feld frei. Gibt den neuen Zustand, das betroffene Feld und wer geht (raus) und kommt (rein, null = frei) zurück.
 */
export function umschalten(zustand, id) {
  const { plaetze, reihe, ruhe } = zustand;
  if (!ANWENDUNGEN.some((a) => a.id === id)) return { zustand, platz: -1 };
  if (plaetze.includes(id)) {
    const platz = plaetze.indexOf(id);
    return { platz, raus: id, rein: null, zustand: { plaetze: plaetze.map((p) => (p === id ? null : p)), reihe: reihe.filter((r) => r !== id), ruhe: [...ruhe, id] } };
  }
  const frei = plaetze.indexOf(null);
  if (frei >= 0) return { platz: frei, raus: null, rein: id, zustand: { plaetze: plaetze.map((p, i) => (i === frei ? id : p)), reihe: [...reihe, id], ruhe: ruhe.filter((r) => r !== id) } };
  const alt = reihe[0], platz = plaetze.indexOf(alt);
  return { platz, raus: alt, rein: id, zustand: { plaetze: plaetze.map((p) => (p === alt ? id : p)), reihe: [...reihe.slice(1), id], ruhe: [...ruhe.filter((r) => r !== id), alt] } };
}

/** gültiger Zustand aus dem Gemerkten (oder der Standard): vier Felder, bekannte und verschiedene Anwendungen oder frei, Reihe und Ruhe vollständig */
export function zustandAus(gemerkt) {
  const ids = ANWENDUNGEN.map((a) => a.id), ok = (l) => Array.isArray(l) && l.every((x) => ids.includes(x)) && new Set(l).size === l.length;
  const plaetze = gemerkt?.plaetze, belegt = Array.isArray(plaetze) ? plaetze.filter((p) => p !== null) : null;
  if (belegt && plaetze.length === PLAETZE && ok(belegt) && ok(gemerkt.reihe ?? []) && ok(gemerkt.ruhe ?? [])) {
    const reihe = gemerkt.reihe.filter((r) => belegt.includes(r)), fehlt = belegt.filter((p) => !reihe.includes(p));
    return { plaetze: [...plaetze], reihe: [...fehlt, ...reihe], ruhe: ids.filter((i) => !belegt.includes(i)).sort((x, y) => (gemerkt.ruhe.indexOf(x) + 1 || 99) - (gemerkt.ruhe.indexOf(y) + 1 || 99)) };
  }
  return { plaetze: [...STANDARD], reihe: [...STANDARD], ruhe: ids.filter((i) => !STANDARD.includes(i)) };
}
