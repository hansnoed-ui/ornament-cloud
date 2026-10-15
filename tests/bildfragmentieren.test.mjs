// «Bildfragmentieren» (alpha/bildfragmentieren/, seit 15. Oktober 2026): Zerlegen (Zeilen, Kanten, Dreiecke), Ablauf, Farbauszüge, Aufbau der Seite.
//   node --test tests/bildfragmentieren.test.mjs
// Im Browser (Testbild, die vier Phasen, Video, Standbild, Formate, Handy): NODE_PATH=$(npm root -g) node tests/bildfragmentieren.e2e.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { zerlegen, delaunay, vereinfachen, kantenMaske, verketten, helligkeit, farbton, auszuege, zufall, hoehenlinien } from "../alpha/bildfragmentieren/fragmente.js";
import { zeitachse, filmMass, zeitcode, dateiname, PHASEN, TEMPO, FORMATE, SIGNET } from "../alpha/bildfragmentieren/ablauf.js";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");

/** künstliches Foto: oben ein Verlauf (Himmel), unten grün, in der Mitte eine rote Scheibe, etwas Rauschen */
function foto(w = 270, h = 480) {
  const d = new Uint8ClampedArray(w * h * 4), rnd = zufall(5);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, scheibe = Math.hypot(x - w / 2, y - h * 0.4) < w * 0.22;
    const [r, g, b] = scheibe ? [210, 50, 40] : y < h * 0.6 ? [40 + y / 4, 80, 190 - y / 5] : [50, 130, 60];
    const n = (rnd() - 0.5) * 10;
    d[i] = r + n; d[i + 1] = g + n; d[i + 2] = b + n; d[i + 3] = 255;
  }
  return d;
}

test("Zerlegen: Zeilen, Kanten und Dreiecke im Massstab des Films; gleiches Foto, gleiches Ergebnis", () => {
  const a = zerlegen(foto(), 270, 480, { massstab: 4, feinheit: "mittel" });
  assert.deepEqual([a.breite, a.hoehe], [1080, 1920]);
  // Zeilen: alle 18 Filmpunkte, über die ganze Breite, Helligkeit zwischen 0 und 1
  const z = a.zeilen;
  assert.equal(z.reihen, Math.floor(1920 / 18));
  assert.ok((z.spalten - 1) * z.schritt >= 1080, "über die ganze Breite");
  assert.ok(z.werte.every((v) => v >= 0 && v <= 1));
  assert.ok(z.oben >= 0 && z.oben + (z.reihen - 1) * z.abstand <= 1920, "alle Zeilen im Bild");
  // Kanten: die Scheibe und der Horizont, als Linienzüge im Bild
  assert.ok(a.kanten.length >= 2, `Kanten gefunden (${a.kanten.length})`);
  for (const k of a.kanten) {
    assert.ok(k.pts instanceof Float32Array && k.pts.length >= 4);
    for (let i = 0; i < k.pts.length; i += 2) assert.ok(k.pts[i] >= 0 && k.pts[i] <= 1080 && k.pts[i + 1] >= 0 && k.pts[i + 1] <= 1920);
  }
  const scheibe = a.kanten.some((k) => { let n = 0; for (let i = 0; i < k.pts.length; i += 2) if (Math.abs(Math.hypot(k.pts[i] - 540, k.pts[i + 1] - 768) - 238) < 20) n++; return n > k.pts.length / 4; });
  assert.ok(scheibe, "der Umriss der Scheibe ist eine Kante");
  // Dreiecke: bedecken das ganze Bild (Flächensumme), Farben aus dem Foto
  const D = a.dreiecke;
  assert.ok(D.n > 600, `genug Dreiecke (${D.n})`);
  let flaeche = 0;
  for (let t = 0; t < D.n; t++) {
    const e = D.ecken.subarray(6 * t, 6 * t + 6);
    flaeche += Math.abs((e[2] - e[0]) * (e[5] - e[1]) - (e[4] - e[0]) * (e[3] - e[1])) / 2;
  }
  assert.ok(Math.abs(flaeche / (1080 * 1920) - 1) < 0.002, `das Mosaik bedeckt das Bild (${(flaeche / (1080 * 1920)).toFixed(4)})`);
  const rot = [...Array(D.n).keys()].filter((t) => D.farben[3 * t] > 180 && D.farben[3 * t + 1] < 90).length;
  assert.ok(rot > 20, `die rote Scheibe ist rot (${rot} Dreiecke)`);
  assert.ok(D.hell.every((v) => v >= 0 && v <= 1));
  const b = zerlegen(foto(), 270, 480, { massstab: 4, feinheit: "mittel" });
  assert.deepEqual([...b.dreiecke.ecken.slice(0, 60)], [...D.ecken.slice(0, 60)], "fest");
  assert.equal(b.kanten.length, a.kanten.length);
  // feiner → mehr Dreiecke, und dichter an den Kanten als in ruhigen Flächen
  const grob = zerlegen(foto(), 270, 480, { massstab: 4, feinheit: "grob" }), fein = zerlegen(foto(), 270, 480, { massstab: 4, feinheit: "fein" });
  assert.ok(grob.dreiecke.n < D.n && D.n < fein.dreiecke.n, `${grob.dreiecke.n} < ${D.n} < ${fein.dreiecke.n}`);
  const groesse = (t) => { const e = D.ecken.subarray(6 * t, 6 * t + 6); return Math.abs((e[2] - e[0]) * (e[5] - e[1]) - (e[4] - e[0]) * (e[3] - e[1])) / 2; };
  const mitte = (t) => [(D.ecken[6 * t] + D.ecken[6 * t + 2] + D.ecken[6 * t + 4]) / 3, (D.ecken[6 * t + 1] + D.ecken[6 * t + 3] + D.ecken[6 * t + 5]) / 3];
  const amRand = [], ruhig = [];
  for (let t = 0; t < D.n; t++) { const [x, y] = mitte(t), r = Math.abs(Math.hypot(x - 540, y - 768) - 238); if (r < 30) amRand.push(groesse(t)); else if (y > 1300 && y < 1800) ruhig.push(groesse(t)); }
  const median = (l) => l.sort((p, q) => p - q)[l.length >> 1];
  assert.ok(median(amRand) < median(ruhig) * 0.7, `an der Kante kleiner (${median(amRand) | 0} gegen ${median(ruhig) | 0})`);
});

test("Delaunay: jede Kante höchstens zweimal, kein Punkt im Umkreis eines Dreiecks, alle Punkte verwendet", () => {
  const rnd = zufall(3), px = [], py = [];
  for (let i = 0; i < 400; i++) { px.push(rnd() * 500); py.push(rnd() * 300); }
  const t = delaunay(px, py), n = t.length / 3;
  assert.ok(n > 700 && n < 800, `Zahl der Dreiecke (${n})`);
  const kanten = new Map();
  for (let k = 0; k < n; k++) for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
    const p = t[3 * k + a], q = t[3 * k + b], s = p < q ? `${p},${q}` : `${q},${p}`;
    kanten.set(s, (kanten.get(s) ?? 0) + 1);
  }
  assert.ok([...kanten.values()].every((v) => v <= 2));
  assert.equal(new Set(t).size, 400);
  for (let k = 0; k < n; k += 7) {
    const [a, b, c] = [t[3 * k], t[3 * k + 1], t[3 * k + 2]];
    const ax = px[a], ay = py[a], bx = px[b], by = py[b], cx = px[c], cy = py[c];
    const D = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / D;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / D;
    const r2 = (ax - ux) ** 2 + (ay - uy) ** 2;
    for (let i = 0; i < 400; i++) if (i !== a && i !== b && i !== c) assert.ok((px[i] - ux) ** 2 + (py[i] - uy) ** 2 >= r2 * (1 - 1e-9), `Punkt ${i} im Umkreis von Dreieck ${k}`);
  }
});

test("Kanten: dünn, verkettet, vereinfacht; ruhige Flächen und Rauschen ergeben keine", () => {
  const w = 120, h = 80, d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { const x = i % w, v = x < 60 ? 30 : 220; d[4 * i] = d[4 * i + 1] = d[4 * i + 2] = v; d[4 * i + 3] = 255; }
  const L = helligkeit(d, w, h), { maske } = kantenMaske(L, w, h);
  const spalten = new Set();
  for (let i = 0; i < w * h; i++) if (maske[i]) spalten.add(i % w);
  assert.ok(spalten.size <= 2 && [...spalten].every((x) => Math.abs(x - 59.5) < 2), `eine dünne senkrechte Kante (${[...spalten]})`);
  const zuege = verketten(maske, w, h, { minLaenge: 10 });
  assert.equal(zuege.length, 1, "ein Zug");
  assert.equal(vereinfachen(zuege[0], 0.9).length, 4, "eine Gerade bleibt mit zwei Punkten");
  const flach = new Float32Array(w * h).fill(0.5);
  assert.equal(kantenMaske(flach, w, h).maske.reduce((a, b) => a + b, 0), 0, "keine Kanten in einer ruhigen Fläche");
});

test("Höhenlinien: Linien gleicher Helligkeit, um einen hellen Fleck geschlossene Kreise, mit der Farbe des Fotos; im Zerlegen in Filmkoordinaten", () => {
  const w = 160, h = 120, d = new Uint8ClampedArray(w * h * 4), L = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, v = Math.max(0, 1 - Math.hypot(x - 80, y - 60) / 70);
    L[i] = v; d[4 * i] = 255 * v; d[4 * i + 1] = 40; d[4 * i + 2] = 255 * (1 - v); d[4 * i + 3] = 255;
  }
  const stufen = hoehenlinien(L, d, w, h, { stufen: 6 });
  assert.equal(stufen.length, 6);
  for (const s of stufen) {
    assert.ok(s.pts.length > 40 && s.pts.length % 4 === 0);
    // jeder Punkt liegt (fast) auf dem Kreis, der zu dieser Helligkeit gehört
    const r = (1 - s.wert) * 70;
    for (let k = 0; k < s.pts.length; k += 2) assert.ok(Math.abs(Math.hypot(s.pts[k] - 80, s.pts[k + 1] - 60) - r) < 2.5, `Stufe ${s.wert.toFixed(2)}`);
  }
  assert.ok(stufen.at(-1).farbe[0] > stufen[0].farbe[0] && stufen.at(-1).farbe[2] < stufen[0].farbe[2], "die hellen Stufen sind rot, die dunklen blau");
  const a = zerlegen(foto(), 270, 480, { massstab: 4 });
  assert.ok(a.hoehen.length >= 4, `Stufen (${a.hoehen.length}; gleiche Stufen flacher Flächen fallen zusammen)`);
  for (const s of a.hoehen) for (let k = 0; k < s.pts.length; k += 2) assert.ok(s.pts[k] >= 0 && s.pts[k] <= 1080 && s.pts[k + 1] >= 0 && s.pts[k + 1] <= 1920);
});

test("Farbton und Farbauszüge: zusammengezählt (auf Schwarz) oder multipliziert (auf Weiss) wieder das Foto", () => {
  assert.deepEqual(farbton(255, 0, 0), { ton: 0, satt: 1 });
  assert.ok(Math.abs(farbton(0, 0, 255).ton - 2 / 3) < 1e-9);
  assert.equal(farbton(90, 90, 90).satt, 0);
  const d = new Uint8ClampedArray([200, 100, 50, 255, 10, 20, 30, 255]);
  const s = auszuege(d, 2, 1, "schwarz");
  for (let i = 0; i < 8; i += 4) for (let k = 0; k < 3; k++) assert.equal(s[0][i + k] + s[1][i + k] + s[2][i + k], d[i + k]);
  const w = auszuege(d, 2, 1, "weiss");
  for (let i = 0; i < 8; i += 4) for (let k = 0; k < 3; k++) assert.equal(Math.round((w[0][i + k] * w[1][i + k] * w[2][i + k]) / 255 / 255), d[i + k]);
});

test("Ablauf: vier Phasen in dieser Reihenfolge, Tempo, Abspann nach Wahl; Formate und Dateiname", () => {
  const z = zeitachse();
  assert.deepEqual(PHASEN.map(([n]) => n), ["linien", "formen", "farben", "zusammen"]);
  const reihe = ["vor", ...PHASEN.map(([n]) => n), "stehen", "bildAus", "pause", "signet", "signetStehen", "signetAus", "schluss"];
  assert.deepEqual(Object.keys(z.ab), reihe);
  for (let i = 1; i < reihe.length; i++) assert.equal(z.ab[reihe[i]][0], z.ab[reihe[i - 1]][1], `${reihe[i]} schliesst an`);
  assert.ok(Math.abs(z.ab.signet[1] - z.ab.signet[0] - 2.3) < 1e-9 && Math.abs(SIGNET - 2.3) < 1e-9, "das Signet kurz: 2,3 s (Wunsch vom 15. Oktober 2026)");
  const abspann = z.dauer - z.ab.stehen[1];
  assert.ok(Math.abs(abspann - 4.75) < 1e-9, `Abspann 4,75 s statt 10 s (${abspann})`);
  assert.equal(z.bilder, Math.round(z.dauer * 30));
  const ohne = zeitachse({ signet: false });
  assert.ok(!ohne.ab.signet && !ohne.ab.bildAus, "ohne Abspann endet der Film auf dem Foto");
  assert.ok(ohne.dauer > 14 && ohne.dauer < 22, `rund 18 s (${ohne.dauer})`);
  const phasen = (zz) => zz.ab.zusammen[1] - zz.ab.linien[0];
  assert.ok(Math.abs(phasen(zeitachse({ tempo: "ruhig" })) / phasen(z) - TEMPO.ruhig) < 1e-9);
  assert.ok(Math.abs(phasen(zeitachse({ tempo: "schnell" })) / phasen(z) - TEMPO.schnell) < 1e-9);
  // Hochformat 4 : 5 als Standard, wahlweise 9 : 16 (Wunsch vom 15. Oktober 2026); Unbekanntes (etwa eine früher gespeicherte Wahl) wird 4 : 5
  assert.deepEqual(FORMATE, ["4:5", "9:16"]);
  assert.deepEqual(filmMass(), [1080, 1350]);
  assert.deepEqual(filmMass("4:5"), [1080, 1350]);
  assert.deepEqual(filmMass("9:16"), [1080, 1920]);
  assert.deepEqual(filmMass("1:1"), [1080, 1350]);
  assert.equal(zeitcode(61.5), "01:01:15");
  assert.equal(dateiname(new Date(2026, 9, 15, 9, 5), "mp4"), "bildfragmentieren-2026-10-15-0905.mp4");
});

test("Seite: Alpha (noindex), steht für sich ohne Navigation oben links, nichts von aussen, Versionsmarken überall gleich", () => {
  const html = lies("alpha/bildfragmentieren/index.html");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.ok(!html.includes('class="seitenweg"'), "ohne Navigation oben links (steht für sich)");
  assert.ok(!/(src|href)="(https?:)?\/\//.test(html.replace(/<!--[\s\S]*?-->/g, "")), "nichts von fremden Servern");
  for (const id of ["vorschau", "datei", "testbild", "zeit", "spielen", "video", "png", "titel", "tempo", "signet", "beschriftung", "zu-linien", "zu-formen", "zu-farben", "zu-bild"])
    assert.match(html, new RegExp(`id="${id}"`), `#${id}`);
  for (const [attr, werte] of [["format", ["4:5", "9:16"]], ["feinheit", ["grob", "mittel", "fein"]], ["grund", ["schwarz", "weiss"]]])
    assert.deepEqual([...html.matchAll(new RegExp(`<button type="button" data-${attr}="([^"]+)"`, "g"))].map((m) => m[1]), werte);
  // dieselbe Marke in der Seite und in allen eigenen Modulen
  const dir = new URL("alpha/bildfragmentieren/", root);
  const texte = [html, ...readdirSync(dir).filter((f) => f.endsWith(".js")).map((f) => readFileSync(new URL(f, dir), "utf8"))];
  const eigene = new Set(texte.flatMap((t) => [...t.matchAll(/"\.\/[a-z]+\.js\?v=(\d+)"|"app\.js\?v=(\d+)"/g)].map((m) => m[1] ?? m[2])));
  assert.equal(eigene.size, 1, `eine Marke (${[...eigene]})`);
  // die Module von Sketchory und The Fictory mit deren Marken
  const sketchory = lies("alpha/sketchory/index.html").match(/app\.js\?v=(\d+)/)[1];
  for (const t of texte) for (const m of t.matchAll(/\.\.\/sketchory\/[a-z0-9]+\.js\?v=(\d+)/g)) assert.equal(m[1], sketchory);
  // von keiner Seite verlinkt (nur per Direktlink)
  const seiten = (d, vor = "") => readdirSync(d, { withFileTypes: true }).flatMap((e) => ["node_modules", ".git", "vendor", "src"].includes(e.name) ? []
    : e.isDirectory() ? seiten(new URL(e.name + "/", d), vor + e.name + "/") : e.name.endsWith(".html") ? [vor + e.name] : []);
  for (const p of seiten(root)) if (!p.startsWith("alpha/bildfragmentieren/")) assert.ok(!lies(p).includes("bildfragmentieren"), `${p} verlinkt Bildfragmentieren`);
  assert.ok(!lies("sitemap.xml").includes("bildfragmentieren"));
  // im Abspann läuft der Punkt des Signets ruhig, obwohl sich das Signet doppelt so schnell zeichnet (15. Oktober 2026)
  assert.match(lies("alpha/bildfragmentieren/szene.js"), /punktTempo: SIGNET_TEMPO \* 1\.25/);
  assert.match(lies("alpha/sketchory/signet.js"), /punktTempo = 1 \}/, "für Sketchory unverändert");
});

test("Körper (Farbwellen): Ikosaeder, Dodekaeder und Geodäte mit den richtigen Zahlen, Ecken auf der Kugel, gleich lange Kanten; Abbilden um die Mitte", async () => {
  const { KOERPER, abbilden } = await import("../alpha/bildfragmentieren/koerper.js");
  const zahlen = Object.fromEntries(Object.entries(KOERPER).map(([n, k]) => [n, [k.ecken.length, k.kanten.length, k.flaechen.length]]));
  assert.deepEqual(zahlen, { ikosaeder: [12, 30, 20], dodekaeder: [20, 30, 0], geode: [162, 480, 320] });
  for (const k of Object.values(KOERPER)) for (const e of k.ecken) assert.ok(Math.abs(Math.hypot(...e) - 1) < 1e-9, "auf der Einheitskugel");
  for (const n of ["ikosaeder", "dodekaeder"]) {
    const k = KOERPER[n], l = k.kanten.map(([a, b]) => Math.hypot(...k.ecken[a].map((x, i) => x - k.ecken[b][i])));
    assert.ok(Math.max(...l) - Math.min(...l) < 1e-9, `${n}: alle Kanten gleich lang`);
  }
  const p = abbilden(KOERPER.ikosaeder, 500, 400, 100, [0.3, 0.7, 0.1]);
  const mx = p.reduce((s, q) => s + q[0], 0) / p.length, my = p.reduce((s, q) => s + q[1], 0) / p.length;
  assert.ok(Math.abs(mx - 500) < 8 && Math.abs(my - 400) < 8, "um die Mitte");
  assert.ok(p.every(([x, y]) => Math.hypot(x - 500, y - 400) < 100 / (1 - 0.22) + 1e-6), "im Radius (mit Perspektive)");
});
