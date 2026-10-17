// PHORMA II (alpha/phorma-ii/) – Tests ohne Browser: Ablauf und Kette, Bildanalyse (Tiefe, Kanten, Keime, Tonumfang), Bahn des Tuchs, Seite.
//   node --test tests/phorma-ii.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const P = new URL("alpha/phorma-ii/", root);
const A = await import(new URL("ablauf.js", P).href);
const { analysieren, tiefeNormieren } = await import(new URL("analyse.js", P).href);
const lies = (p) => readFileSync(new URL(p, P), "utf8");

test("Ablauf: Effekte in fester Reihenfolge, Unbekanntes ergibt die ganze Kette", () => {
  assert.equal(A.ablaufName("tuch+physarum"), "physarum+tuch");
  assert.equal(A.ablaufName("quatsch"), A.KETTE);
  assert.equal(A.ablaufName(null), "physarum+tiefe+tuch");
  assert.deepEqual(A.effekte("tuch+tiefe"), ["tiefe", "tuch"]);
  assert.equal(A.ablaufName("stich"), A.KETTE, "der frühere Stich ergibt die ganze Kette");
  assert.equal(A.ablaufName("physarum+muster+tuch"), "physarum+tuch", "die frühere Morphogenese fällt weg");
});

test("Kette: Physarum geht über eine Zeitfront in die Tiefe über, die Tiefe über eine kurze Front ins Tuch", () => {
  const K = A.kette(A.KETTE);
  assert.deepEqual(K.teile.map((t) => t.art), A.EFFEKTE);
  const [p, t, u] = K.teile;
  assert.equal(p.uebergang, "front"); assert.ok(Math.abs(t.von - (p.bis - 1.8)) < 1e-9, "die Tiefe setzt 1,8 s vor dem Ende des Netzes ein");
  assert.ok(!t.vonFoto, "die Tiefe beginnt unter der Zeitfront, nicht beim Foto");
  assert.equal(t.uebergang, "front"); assert.ok(u.von < t.bis && !u.vonFoto);
  assert.ok(!p.phasen.some(([n]) => n === "bild"), "nur der letzte Effekt hat eine Phase «Bild»");
  assert.equal(u.phasen.at(-1)[0], "bild");
  for (let i = 1; i < K.phasen.length; i++) assert.ok(K.phasen[i].von >= K.phasen[i - 1].von && K.phasen[i - 1].bis <= K.phasen[i].von + 1e-9, "Phasen hintereinander");
  for (const e of A.EFFEKTE) { const k = A.kette(e); assert.equal(k.teile.length, 1); assert.equal(k.teile[0].phasen.at(-1)[1], "Bild", `${e} allein endet beim Bild`); }
  assert.ok(K.dauer < 21, `kürzer als mit vier Effekten (${K.dauer.toFixed(1)} s)`);
});

test("Zeitachse: Vorlauf, Kette im Tempo, Stehen und Signet; laufend gibt beim Übergang beide", () => {
  const z = A.zeitachse({ ablauf: A.KETTE });
  assert.equal(z.ab.vor[1], z.abschnitt.von);
  assert.ok(Math.abs(z.abschnitt.bis - z.abschnitt.von - A.kette(A.KETTE).dauer) < 1e-9);
  assert.ok(z.ab.signet && z.dauer > z.abschnitt.bis + 3.2 + A.SIGNET);
  assert.equal(z.bilder, Math.round(z.dauer * 30));
  const ruhig = A.zeitachse({ ablauf: A.KETTE, tempo: "ruhig", signet: false });
  assert.ok(Math.abs((ruhig.abschnitt.bis - ruhig.abschnitt.von) / (z.abschnitt.bis - z.abschnitt.von) - 1.3) < 1e-9);
  assert.equal(ruhig.ab.signet, undefined);
  const [p, s] = z.teile, mitte = (s.von + p.bis) / 2, L = A.laufend(z, mitte);
  assert.deepEqual(L.map((x) => x.teil.art), ["physarum", "tiefe"]);
  assert.ok(Math.abs(L[1].lokal - (mitte - s.von)) < 1e-9, "eigene Zeit des Effekts");
  assert.equal(A.laufend(z, 0)[0].lokal, 0);
  assert.match(A.dateiname(new Date(2026, 9, 17, 9, 5), "mp4"), /^phorma-ii-2026-10-17-0905\.mp4$/);
});

/** Testbild: Himmel mit Verlauf, Sonne, ein roter Block vorn, Wiese mit Rauschen (w × h, RGBA) */
function testbild(w, h) {
  const d = new Uint8ClampedArray(w * h * 4);
  let s = 7;
  const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, v = y / h;
    let c = [60 + 120 * v, 110 + 80 * v, 220, 255];
    if ((x - w * 0.65) ** 2 + (y - h * 0.22) ** 2 < (w * 0.08) ** 2) c = [255, 230, 120, 255];
    if (v > 0.62) { const n = r() * 50; c = [40 + n, 120 + n, 40, 255]; }
    if (x > w * 0.3 && x < w * 0.55 && v > 0.55 && v < 0.85) c = [200, 40, 30, 255];
    d.set(c, i);
  }
  return d;
}

test("Analyse: Tiefe 0..1 (die Wiese vorn näher als der Himmel), Nahrung, Keime, Tonumfang; gleiches Foto, gleiches Ergebnis", () => {
  const w = 135, h = 169, d = testbild(w, h), E = analysieren(d, w, h, { massstab: 2 });
  assert.equal(E.tiefe.length, w * h);
  assert.ok(E.tiefe.every((v) => v >= 0 && v <= 1));
  const mittel = (y0, y1) => { let s = 0, n = 0; for (let y = Math.round(y0 * h); y < Math.round(y1 * h); y++) for (let x = 0; x < w; x++) { s += E.tiefe[y * w + x]; n++; } return s / n; };
  assert.ok(mittel(0.85, 1) > mittel(0, 0.15) + 0.2, `unten näher als oben (${mittel(0.85, 1).toFixed(2)} / ${mittel(0, 0.15).toFixed(2)})`);
  assert.ok(E.nahrung.length === w * h && E.nahrung.every((v) => v >= 0 && v <= 1));
  assert.ok(E.ton[0] < E.ton[1] && E.mittel > 0 && E.mittel < 1, "Tonumfang und mittlere Helligkeit");
  assert.ok(E.keime.length >= 5 && E.keime.length <= 22 && E.keime.every(([u, v]) => u >= 0 && u <= 1 && v >= 0 && v <= 1));
  const F = analysieren(d, w, h, { massstab: 2 });
  assert.deepEqual([...F.tiefe.slice(0, 50)], [...E.tiefe.slice(0, 50)]);
  assert.deepEqual(F.keime, E.keime);
});

test("Tuch: die Bahn wird ganz vorausgerechnet, ist wiederholbar und endet genau an ihrem Platz", async () => {
  const { tuchBahn } = await import(new URL("tuchsim.js", P).href);
  for (const kette of ["tuch", "tiefe+tuch"]) {
    const teil = A.kette(kette).teile.at(-1), tiefe = new Float32Array(64).fill(0.7);
    const a = tuchBahn({ teil, a: 0.8, nx: 24, tiefe, tw: 8, th: 8 }), b = tuchBahn({ teil, a: 0.8, nx: 24, tiefe, tw: 8, th: 8 });
    assert.equal(a.bilder, Math.ceil(teil.dauer * 30) + 1);
    assert.deepEqual(a.lagen.slice(0, 3000), b.lagen.slice(0, 3000), `${kette}: wiederholbar`);
    const ende = a.lagen.subarray((a.bilder - 1) * a.N * 3);
    assert.ok(ende.every((v, i) => Math.abs(v - a.heim[i]) < 1e-6), `${kette}: am Ende glatt an ihrem Platz`);
    const mitte = a.lagen.subarray(Math.round(a.bilder * 0.4) * a.N * 3, (Math.round(a.bilder * 0.4) + 1) * a.N * 3);
    assert.ok(Math.max(...mitte.map((v, i) => Math.abs(v - a.heim[i]))) > 0.2, `${kette}: dazwischen weht es`);
    if (kette === "tiefe+tuch") assert.ok(Math.abs(a.lagen[2 + 3 * 30] - 0.2 * 0.3) < 1e-6, "nach der Tiefe beginnt es als Relief");
  }
});

test("KI-Tiefe: wird an die Kanten gelegt und auf 0..1 gebracht", () => {
  const w = 60, h = 80, roh = new Float32Array(w * h), hell = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { roh[y * w + x] = 3 + 7 * (y / h); hell[y * w + x] = x < w / 2 ? 0.2 : 0.8; }
  const d = tiefeNormieren(roh, w, h, hell);
  assert.ok(d.every((v) => v >= 0 && v <= 1));
  assert.ok(d[(h - 2) * w + 5] > d[w + 5] + 0.5, "unten nah bleibt nah");
});

test("Seite: Alpha (noindex), three.js lokal mit fester Version, gleiche ?v=-Marken, nichts von aussen ausser der KI auf Wunsch", () => {
  const html = lies("index.html");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<title>PHORMA II – Ornament Cloud · Alpha<\/title>/);
  assert.match(html, /"three": "\.\.\/\.\.\/vendor\/three-0\.185\.1\/three\.module\.min\.js"/);
  assert.ok(!/<script[^>]+src="https?:/.test(html), "keine Skripte von aussen");
  for (const e of A.EFFEKTE) { assert.match(html, new RegExp(`data-effekt="${e}"`)); assert.match(html, new RegExp(`data-wahl="${e}"`), `${e} einzeln wählbar`); }
  assert.match(html, /data-wahl="physarum\+tiefe\+tuch"/, "die ganze Kette als Karte");
  assert.ok(!/data-(wahl|effekt)="(stich|muster)"|data-(strich|muster)=/.test(html), "weder Stich noch Morphogenese");
  const dateien = readdirSync(P).filter((f) => f.endsWith(".js")), marken = new Set();
  for (const f of dateien) {
    const js = lies(f);
    for (const m of js.matchAll(/"\.\/([a-z-]+\.js)(\?v=\d+)?"/g)) { assert.ok(m[2], `${f}: ${m[1]} mit Marke`); marken.add(m[2]); }
    if (f !== "tiefe-ki.js") assert.ok(!/https?:\/\//.test(js.replace(/\/\/.*$/gm, "")), `${f}: keine Adressen von aussen`);
  }
  assert.match(lies("tiefe-ki.js"), /const VERSION = "3\.8\.1";[\s\S]*@huggingface\/transformers@\$\{VERSION\}\/dist\//, "transformers.js mit fester Version");
  assert.equal(marken.size, 1, `eine Marke für alle eigenen Module (${[...marken]})`);
  assert.match(lies("app.js"), /import\("\.\/tiefe-ki\.js\?v=\d+"\)/, "die KI erst auf Wunsch geladen");
});
