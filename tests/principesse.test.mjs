// «Principesse» (alpha/principesse/, seit 12. Oktober 2026): Pinselstriche, Glitzer, Ablauf, Signet, Aufbau der Seite.
//   node --test tests/principesse.test.mjs
// Im Browser (Beispiel, Malen, Glitzer, Foto und Satz, Signet, Video, Handy): NODE_PATH=$(npm root -g) node tests/principesse.e2e.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { malen } from "../alpha/principesse/malen.js";
import { glitzer, funkeln } from "../alpha/principesse/glitzer.js";
import { zeitachse, malplan, dateiname, filmMass } from "../alpha/principesse/ablauf.js";
import { linien, NAME, DAUER } from "../alpha/principesse/signet.js";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");

/** künstliches Bild: links blau, rechts gelb, in der Mitte ein roter Kreis */
function bild(w = 240, h = 320) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, kreis = Math.hypot(x - w / 2, y - h / 2) < 50;
    const [r, g, b] = kreis ? [200, 30, 40] : x < w / 2 ? [20, 40, 140] : [230, 200, 60];
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
  return d;
}

test("Malen: breite Pinsel zuerst, dann feinere; Farben aus dem Bild; ganz bedeckt; gleiches Bild, gleiches Gemälde", () => {
  const a = malen(bild(), 240, 320, { massstab: 1080 / 240 });
  assert.equal(a.stufen, 5);
  const stufen = a.striche.map((s) => s.stufe);
  for (let i = 1; i < stufen.length; i++) assert.ok(stufen[i] >= stufen[i - 1], "Reihenfolge nach Stufe");
  assert.ok(a.striche.filter((s) => s.stufe === 0).length > 20, "Untermalung über das ganze Bild");
  assert.ok(a.radien[0] > a.radien.at(-1) * 8, "von breit bis fein");
  // Farben aus dem Bild; gemischt nur an Kanten, wo die feinen Pinsel nacharbeiten (dort liegen viele kleine Striche)
  const farben = [[20, 40, 140], [230, 200, 60], [200, 30, 40]];
  const nah = a.striche.filter((s) => farben.some((f) => Math.hypot(...f.map((v, k) => v - s.farbe[k])) < 40)).length;
  assert.ok(nah / a.striche.length > 0.6, `Farben aus dem Bild (${nah}/${a.striche.length})`);
  // im Film-Massstab und im Bild
  for (const s of a.striche) for (let k = 0; k < s.pts.length; k += 2) assert.ok(s.pts[k] > -80 && s.pts[k] < 1160 && s.pts[k + 1] > -80 && s.pts[k + 1] < 1520);
  const b = malen(bild(), 240, 320, { massstab: 1080 / 240 });
  assert.deepEqual(b.striche.map((s) => s.farbe.join()), a.striche.map((s) => s.farbe.join()), "fest");
  // feinerer Pinsel → mehr Striche
  assert.ok(malen(bild(), 240, 320, { massstab: 4.5, pinsel: 0.7 }).striche.length > a.striche.length);
});

test("Glitzer: dichte, helle Körner funkeln, glatte Farbe und vereinzelte Punkte nicht", () => {
  const w = 300, h = 200, d = new Uint8ClampedArray(w * h * 4);
  // Grund dunkelblau, links ein Glitzerband (viele helle Körner), rechts ein paar einzelne helle Punkte
  let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < w * h; i++) { d[i * 4] = 25; d[i * 4 + 1] = 35; d[i * 4 + 2] = 110; d[i * 4 + 3] = 255; }
  for (let y = 60; y < 140; y++) for (let x = 10; x < 140; x++) if (rnd() < 0.08) { const i = (y * w + x) * 4; d[i] = 250; d[i + 1] = 235; d[i + 2] = 170; }
  for (const [x, y] of [[200, 50], [250, 150], [280, 100]]) { const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = 250; }
  const g = glitzer(d, w, h);
  assert.ok(g.funken.length > 300, `Funken im Band (${g.funken.length})`);
  assert.ok(g.funken.every((f) => f.x < 150), "keine Funken ausserhalb des Bands");
  assert.ok(g.funken.some((f) => f.stern), "die hellsten mit Stern");
  assert.ok(g.anteil > 0.05 && g.anteil < 0.35);
  // funkeln: meist schwach, kurz hell
  const f = g.funken[0], werte = Array.from({ length: 200 }, (_, k) => funkeln(f, k / 50));
  assert.ok(Math.max(...werte) > 0.9 && Math.min(...werte) < 0.25);
  const leer = new Uint8ClampedArray(w * h * 4).fill(120);
  assert.equal(glitzer(leer, w, h).funken.length, 0);
});

test("Ablauf: malen, stehen, ausblenden; Foto und Satz nur wenn gewählt; Signet mit Ausblenden am Schluss", () => {
  const ohne = zeitachse({ malen: 6 });
  assert.deepEqual(Object.keys(ohne.ab), ["vor", "malen", "stehen", "bildAus", "pause2", "signet", "signetStehen", "signetAus", "schluss"]);
  assert.equal(ohne.ab.malen[1] - ohne.ab.malen[0], 6);
  assert.equal(ohne.ab.stehen[1] - ohne.ab.stehen[0], 3);
  assert.ok(Math.abs(ohne.ab.signet[1] - ohne.ab.signet[0] - DAUER) < 1e-9);
  const mitFoto = zeitachse({ malen: 6, foto: true }), mitText = zeitachse({ malen: 6, text: "Eine Krone für jeden Tag." }), beides = zeitachse({ malen: 8, foto: true, text: "Eine Krone für jeden Tag." });
  for (const z of [mitFoto, mitText, beides]) assert.ok("fotoEin" in z.ab && "zweitAus" in z.ab);
  assert.ok(beides.dauer > ohne.dauer + 4);
  assert.equal(beides.bilder, Math.round(beides.dauer * 30));
  assert.equal(dateiname(new Date(2026, 9, 12, 9, 5), "mp4"), "principesse-2026-10-12-0905.mp4");
});

test("Format: wie das Bild (kurze Seite 1080, lange höchstens 1920, gerade), 3 : 4, 1 : 1", () => {
  assert.deepEqual(filmMass("3:4", 2000, 1000), [1080, 1440]);
  assert.deepEqual(filmMass("1:1", 2000, 3000), [1080, 1080]);
  assert.deepEqual(filmMass("bild", 2576, 3427), [1080, 1436], "Meerjungfrau, fast 3 : 4");
  assert.deepEqual(filmMass("bild", 2287, 2407), [1080, 1136], "Fische, fast quadratisch");
  assert.deepEqual(filmMass("bild", 3000, 2000), [1620, 1080], "quer");
  assert.deepEqual(filmMass("bild", 1000, 3000), [1080, 1920], "sehr schmal: höchstens 9 : 16");
  for (const [b, h] of [[1234, 2345], [3333, 1111]]) assert.ok(filmMass("bild", b, h).every((n) => n % 2 === 0));
});

test("Malplan: Stufe um Stufe, innerhalb der Malzeit, breite Züge langsamer als feine", () => {
  const striche = [0, 0, 0, 1, 1, 2, 2, 2, 3, 4].map((stufe) => ({ stufe }));
  const plan = malplan(striche, 5, 6);
  assert.ok(plan.every(([a, b]) => a >= 0 && b <= 6 + 1e-9 && b > a));
  for (let i = 1; i < plan.length; i++) if (striche[i].stufe > striche[i - 1].stufe) assert.ok(plan[i][0] >= plan[i - 1][0]);
  assert.ok(plan[0][1] - plan[0][0] > plan.at(-1)[1] - plan.at(-1)[0]);
});

test("Signet: die Figur nach der Vorlage (Krone mit fünf Kugeln, Gesicht, Kleid, Füsse) und der Name «Principesse»", () => {
  const L = linien(), teile = L.map((l) => l.teil);
  assert.equal(NAME, "Principesse");
  assert.equal(teile.filter((t) => t === "kugel").length, 5);
  for (const t of ["krone", "haar", "gesicht", "auge", "mund", "wange", "kleid", "streifen", "punkt", "fuss"]) assert.ok(teile.includes(t), t);
  assert.equal(teile[0], "krone", "die Krone zuerst");
  for (const l of L) for (let k = 0; k < l.pts.length; k += 2) assert.ok(l.pts[k] > 100 && l.pts[k] < 1450 && l.pts[k + 1] > 100 && l.pts[k + 1] < 1900, "in der Vorlage");
});

test("Seite: steht für sich (noindex, keine Navigation, von keiner Seite verlinkt, nicht in der Sitemap), Versionsmarken, nichts von fremden Servern, Beispiele", () => {
  const html = lies("alpha/principesse/index.html");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.ok(!html.includes('class="seitenweg"'), "ohne die Navigation oben links");
  assert.ok(!lies("sitemap.xml").includes("principesse"));
  // keine andere Seite verweist hierher (Wunsch vom 12. Oktober 2026: nur per Direktlink)
  const ueberspringen = new Set(["node_modules", "dist", "vendor", ".git", "principesse"]);
  const walk = (d, vor = "") => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    ueberspringen.has(e.name) ? [] : e.isDirectory() ? walk(new URL(e.name + "/", d), vor + e.name + "/") : e.name.endsWith(".html") ? [vor + e.name] : []);
  for (const p of walk(root)) assert.ok(!/principesse/i.test(lies(p)), `${p} verweist auf Principesse`);
  assert.ok(!/(src|href)="https?:\/\/(?!ornament-cloud\.goatcounter)/.test(html));
  const marke = html.match(/<script type="module" src="app\.js\?v=(\d+)"><\/script>/)?.[1];
  assert.ok(marke);
  for (const f of ["app.js", "szene.js", "signet.js", "rechner.js", "glitzer.js", "ablauf.js"]) {
    const marken = [...lies(`alpha/principesse/${f}`).matchAll(/"\.\/[a-z]+\.js\?v=(\d+)"/g)].map((m) => m[1]);
    assert.ok(marken.every((m) => m === marke), `${f}: ${marken}`);
  }
  // Module von Sketchory und The Fictory mit deren aktuellen Marken
  const sk = lies("alpha/sketchory/index.html").match(/app\.js\?v=(\d+)/)[1];
  for (const f of ["app.js", "szene.js", "ablauf.js", "malen.js", "glitzer.js", "signet.js"]) for (const m of lies(`alpha/principesse/${f}`).matchAll(/"\.\.\/sketchory\/[a-z0-9]+\.js\?v=(\d+)"/g)) assert.equal(m[1], sk, `${f}: Marke von Sketchory`);
  assert.equal(lies("alpha/principesse/app.js").match(/the-fictory\/dauer\.js\?v=(\d+)/)[1], lies("alpha/the-fictory/app.js").match(/dauer\.js\?v=(\d+)/)[1]);
  const js = ["app.js", "malen.js", "glitzer.js", "szene.js", "signet.js", "ablauf.js", "rechner.js"].map((f) => lies(`alpha/principesse/${f}`)).join("\n");
  assert.ok(!/https?:\/\//.test(js) && !/XMLHttpRequest|sendBeacon/.test(js));
  assert.ok(!/ß/.test(html + js), "Schweizer Schreibweise");
  for (const b of ["meerjungfrau", "fische", "hund"]) assert.ok(html.includes(`data-beispiel="${b}"`) && readFileSync(new URL(`alpha/principesse/beispiel-${b}.jpg`, root)).length < 600_000, b);
});
