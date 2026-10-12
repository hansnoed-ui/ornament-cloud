// «Principesse» (alpha/principesse/, seit 12. Oktober 2026): Pinselstriche, Glitzer, Ablauf, Signet, Aufbau der Seite.
//   node --test tests/principesse.test.mjs
// Im Browser (Beispiel, Malen, Glitzer, Foto und Satz, Signet, Video, Handy): NODE_PATH=$(npm root -g) node tests/principesse.e2e.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { malen, glaetten, kanaele, optimieren, klarbild } from "../alpha/principesse/malen.js";
import { glitzer, funkeln } from "../alpha/principesse/glitzer.js";
import { zeitachse, malplan, dateiname, filmMass } from "../alpha/principesse/ablauf.js";
import { linien, NAME, VON, DAUER } from "../alpha/principesse/signet.js";

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
  const a = malen(bild(), 240, 320, { massstab: 1080 / 240, auffrischen: false });
  assert.equal(a.stufen, 3);
  const stufen = a.striche.map((s) => s.stufe);
  for (let i = 1; i < stufen.length; i++) assert.ok(stufen[i] >= stufen[i - 1], "Reihenfolge nach Stufe");
  assert.ok(a.striche.filter((s) => s.stufe === 0).length > 20, "Untermalung über das ganze Bild");
  assert.ok(a.radien[0] > a.radien.at(-1) * 4, "von breit bis fein");
  // jeder Durchgang der Reihe nach von oben nach unten (Mitte der Striche, in Bändern)
  for (let st = 0; st < a.stufen; st++) {
    const y = a.striche.filter((s) => s.stufe === st).map((s) => s.pts.filter((_, k) => k % 2).reduce((x, v, _, l) => x + v / l.length, 0));
    const band = (a.radien[st] / (1080 / 240)) * 5 * (1080 / 240);
    for (let i = 1; i < y.length; i++) assert.ok(Math.floor(y[i] / band) >= Math.floor(y[i - 1] / band), `Stufe ${st} von oben nach unten`);
  }
  // Farben aus dem Bild; gemischt nur an Kanten, wo die feinen Pinsel nacharbeiten (dort liegen viele kleine Striche)
  const farben = [[20, 40, 140], [230, 200, 60], [200, 30, 40]];
  const nah = a.striche.filter((s) => farben.some((f) => Math.hypot(...f.map((v, k) => v - s.farbe[k])) < 40)).length;
  assert.ok(nah / a.striche.length > 0.6, `Farben aus dem Bild (${nah}/${a.striche.length})`);
  // im Film-Massstab und im Bild
  for (const s of a.striche) for (let k = 0; k < s.pts.length; k += 2) assert.ok(s.pts[k] > -80 && s.pts[k] < 1160 && s.pts[k + 1] > -80 && s.pts[k + 1] < 1520);
  const b = malen(bild(), 240, 320, { massstab: 1080 / 240, auffrischen: false });
  assert.deepEqual(b.striche.map((s) => s.farbe.join()), a.striche.map((s) => s.farbe.join()), "fest");
  // feinerer Pinsel → mehr Striche
  assert.ok(malen(bild(), 240, 320, { massstab: 4.5, pinsel: 0.7 }).striche.length > a.striche.length);
});

test("Glätten: Rauschen und Körnung weg, Kanten bleiben; das scharfe Schlussbild ebenso", () => {
  const w = 200, h = 120;
  let z = 3; const rnd = () => ((z = (z * 16807) % 2147483647) / 2147483647);
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, v = (x < w / 2 ? 60 : 190) + (rnd() - 0.5) * 50;
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  const g = glaetten(kanaele(d, w, h), w, h);
  const streuung = (k, x0, x1) => { let s = 0, q = 0, n = 0; for (let y = 10; y < h - 10; y++) for (let x = x0; x < x1; x++) { const v = k[y * w + x]; s += v; q += v * v; n++; } return Math.sqrt(q / n - (s / n) ** 2); };
  assert.ok(streuung(g.r, 10, 90) < streuung(kanaele(d, w, h).r, 10, 90) / 3, "Rauschen deutlich weniger");
  assert.ok(g.r[60 * w + 96] < 90 && g.r[60 * w + 104] > 160, "die Kante bleibt scharf");
  // das scharfe Bild für den Schluss: Körnung leiser, die Kante bleibt ganz scharf (Wunsch vom 12. Oktober 2026: das fertige Bild war zu unscharf)
  const k = klarbild(d, w, h), kr = (x, y) => k[(y * w + x) * 4];
  assert.equal(k.length, w * h * 4);
  assert.ok(kr(99, 60) < 90 && kr(100, 60) > 160, `Kante zwischen zwei Bildpunkten (${kr(99, 60)} | ${kr(100, 60)})`);
  const kk = { r: Float32Array.from({ length: w * h }, (_, i) => k[i * 4]) };
  assert.ok(streuung(kk.r, 10, 90) < streuung(kanaele(d, w, h).r, 10, 90), "Körnung leiser als im Foto, obwohl aufgefrischt");
});

test("Auffrischen: kein stärkerer Farbstich, blasse Gründe behalten ihre Farbe, sanft mehr Kontrast mit matten Tiefen, nicht grell; nichts ausserhalb 0–255", () => {
  // ein flaues, gelbstichiges Foto: weisses Papier wirkt cremig, das Blau matt, kein echtes Schwarz
  const w = 160, h = 120, d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, [r, g, b] = x < 60 ? [212, 200, 170] : x < 120 ? [80, 100, 140] : [70, 64, 55];
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
  const o = optimieren(kanaele(d, w, h), w, h), p = (x) => [o.r[60 * w + x], o.g[60 * w + x], o.b[60 * w + x]];
  const [pr, pg, pb] = p(30), [br, bg, bb] = p(90), [sr, sg, sb] = p(140);
  // Weissabgleich auf ein warmes Weiss (Wunsch vom 12. Oktober 2026: etwas wärmer): das Papier bleibt warm, wird aber nicht gelber als im Foto
  // ein getöntes Papier wird nicht neutralisiert (es könnte gewollt sein wie ein blasser lila Grund), aber auch nicht deutlich gelber
  assert.ok((pr - pb) / pr < ((212 - 170) / 212) * 1.25 && pr > pb, `Papier nicht deutlich gelber (${pr | 0}, ${pg | 0}, ${pb | 0})`);
  // edel statt grell (12. Oktober 2026): hell wird heller, aber nicht weiss; dunkel wird dunkler, aber nicht schwarz (matte Tiefen)
  assert.ok((pr + pg + pb) / 3 > (212 + 200 + 170) / 3 + 10 && Math.max(pr, pg, pb) <= 240, `hell heller, nicht weiss (${pr | 0}, ${pg | 0}, ${pb | 0})`);
  assert.ok((sr + sg + sb) / 3 < (70 + 64 + 55) / 3 - 10 && Math.min(sr, sg, sb) > 10, `dunkel dunkler, matt (${sr | 0}, ${sg | 0}, ${sb | 0})`);
  // eine schon kräftige Farbe wird nicht greller
  const rot = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) rot.set(i % w < 80 ? [215, 35, 40, 255] : [235, 230, 222, 255], i * 4);
  const ro = optimieren(kanaele(rot, w, h), w, h), q = 60 * w + 40, satt = (r, g, b) => (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(r, g, b);
  assert.ok(satt(ro.r[q], ro.g[q], ro.b[q]) <= satt(215, 35, 40) + 0.01, `Rot nicht greller (${ro.r[q] | 0}, ${ro.g[q] | 0}, ${ro.b[q] | 0})`);
  assert.ok((bb - br) / bb >= (140 - 80) / 140 - 0.02, `das matte Blau bleibt mindestens so farbig (${br | 0}, ${bg | 0}, ${bb | 0})`);
  for (const k of ["r", "g", "b"]) assert.ok(o[k].every((v) => Number.isFinite(v) && v >= 0 && v <= 255), k);
  // ein blasser lila Grund behält seine Farbe und wird kaum heller (Rückmeldung vom 12. Oktober 2026: «Hintergrundfarbe fast nicht sichtbar»)
  const lila = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, c = x < 90 ? [200, 195, 222] : x < 120 ? [245, 235, 215] : [25, 90, 35]; lila.set([...c, 255], i); }
  const l = optimieren(kanaele(lila, w, h), w, h), li = 60 * w + 40, hell = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b;
  assert.ok(l.b[li] - l.g[li] >= 222 - 195 && l.b[li] - l.r[li] >= (222 - 200) * 0.7, `Lila bleibt (${l.r[li] | 0}, ${l.g[li] | 0}, ${l.b[li] | 0})`);
  assert.ok(hell(l.r[li], l.g[li], l.b[li]) < hell(200, 195, 222) + 15, "kaum heller");
  assert.ok(l.r[60 * w + 100] < 255 || l.b[60 * w + 100] < 235, "Creme wird nicht zu Weiss");
  // Stärke 0 lässt das Bild unverändert
  const n = optimieren(kanaele(d, w, h), w, h, 0);
  assert.ok(Math.abs(n.r[60 * w + 30] - 212) < 1.5 && Math.abs(n.b[60 * w + 90] - 140) < 1.5);
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
  assert.equal(ohne.ab.stehen[1] - ohne.ab.stehen[0], 5, "das fertige Bild steht länger (Wunsch vom 12. Oktober 2026)");
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

test("Signet: die Figur nach der Vorlage (Krone mit fünf Kugeln, Gesicht, Kleid, Füsse), der Name «Principesse» und «by Katharina Strickler»", () => {
  const L = linien(), teile = L.map((l) => l.teil);
  assert.equal(NAME, "Principesse");
  assert.equal(VON, "by Katharina Strickler");
  assert.equal(teile.filter((t) => t === "kugel").length, 5);
  for (const t of ["krone", "gesicht", "auge", "mund", "wange", "kleid", "punkt", "fuss"]) assert.ok(teile.includes(t), t);
  assert.ok(!teile.includes("haar"), "ohne die Wellenlinie über dem Kopf (Wunsch vom 12. Oktober 2026)");
  assert.equal(teile[0], "krone", "die Krone zuerst");
  for (const l of L) for (let k = 0; k < l.pts.length; k += 2) assert.ok(l.pts[k] > 100 && l.pts[k] < 1450 && l.pts[k + 1] > 100 && l.pts[k + 1] < 1900, "in der Vorlage");
});

test("App (12. Oktober 2026): Manifest und Symbole aus dem Signet, eigener Service Worker, Knopf nur auf dieser Seite; keine Vorschaukarte, kein Eintrag", () => {
  const html = lies("alpha/principesse/index.html"), m = JSON.parse(lies("alpha/principesse/manifest.webmanifest"));
  assert.equal(m.name, "Principesse"); assert.equal(m.display, "standalone");
  assert.equal(m.start_url, "./"); assert.equal(m.scope, "./");
  const png = (p) => { const b = readFileSync(new URL(`alpha/principesse/${p}`, root)); assert.equal(b.toString("ascii", 1, 4), "PNG", p); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  for (const i of m.icons) assert.deepEqual(png(i.src), i.sizes.split("x").map(Number), i.src);
  assert.ok(m.icons.some((i) => i.purpose === "maskable") && m.icons.some((i) => i.sizes === "512x512" && i.purpose === "any"));
  assert.deepEqual(png("icons/apple-touch-icon.png"), [180, 180]); assert.deepEqual(png("icons/favicon-32.png"), [32, 32]);
  for (const v of ['rel="manifest" href="manifest.webmanifest"', 'rel="apple-touch-icon" href="icons/apple-touch-icon.png"', 'id="installieren"', "Principesse als App installieren"]) assert.ok(html.includes(v), v);
  assert.match(lies("alpha/principesse/sw.js"), /const CACHE = "principesse-\d+"/);
  assert.match(lies("alpha/principesse/pwa.js"), /register\(new URL\("sw\.js", import\.meta\.url\)/);
  // keine Vorschaukarte und kein Eintrag (Wunsch: nur über die eigene Seite)
  assert.ok(!/<meta[^>]+(og:|twitter:)/.test(html), "ohne Vorschaukarte");
  assert.ok(!/principesse/i.test(lies("apps/index.html")), "nicht auf «Apps»");
  assert.ok(!/principesse/i.test(lies("alpha/index.html")), "nicht in der Alpha-Übersicht");
});

test("Seite: steht für sich (noindex, keine Navigation, von keiner Seite verlinkt, nicht in der Sitemap), Versionsmarken, nichts von fremden Servern, sechs Beispiele", () => {
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
  assert.ok(html.includes(`<script type="module" src="pwa.js?v=${marke}"></script>`), "pwa.js mit derselben Marke");
  for (const f of ["app.js", "szene.js", "signet.js", "rechner.js", "glitzer.js", "ablauf.js"]) {
    const marken = [...lies(`alpha/principesse/${f}`).matchAll(/"\.\/[a-z]+\.js\?v=(\d+)"/g)].map((m) => m[1]);
    assert.ok(marken.every((m) => m === marke), `${f}: ${marken}`);
  }
  // Module von Sketchory und The Fictory mit deren aktuellen Marken
  const sk = lies("alpha/sketchory/index.html").match(/app\.js\?v=(\d+)/)[1];
  for (const f of ["app.js", "szene.js", "ablauf.js", "malen.js", "glitzer.js", "signet.js"]) for (const m of lies(`alpha/principesse/${f}`).matchAll(/"\.\.\/sketchory\/[a-z0-9]+\.js\?v=(\d+)"/g)) assert.equal(m[1], sk, `${f}: Marke von Sketchory`);
  assert.equal(lies("alpha/principesse/app.js").match(/the-fictory\/dauer\.js\?v=(\d+)/)[1], lies("alpha/the-fictory/app.js").match(/dauer\.js\?v=(\d+)/)[1]);
  const js = ["app.js", "malen.js", "glitzer.js", "szene.js", "signet.js", "ablauf.js", "rechner.js", "pwa.js", "sw.js"].map((f) => lies(`alpha/principesse/${f}`)).join("\n");
  assert.ok(!/https?:\/\//.test(js) && !/XMLHttpRequest|sendBeacon/.test(js));
  assert.ok(!/ß/.test(html + js), "Schweizer Schreibweise");
  // sechs Beispiele (neu seit dem 12. Oktober 2026; die früheren drei sind gelöscht), auf der Seite und im Speicher der App
  const BEISPIELE = ["sterne", "gold", "rosa", "streifen", "blumen", "krone"];
  for (const b of BEISPIELE) {
    assert.ok(html.includes(`data-beispiel="${b}"`), b);
    assert.ok(readFileSync(new URL(`alpha/principesse/beispiel-${b}.jpg`, root)).length < 600_000, `${b}: klein genug`);
    assert.ok(lies("alpha/principesse/sw.js").includes(`"beispiel-${b}.jpg"`), `${b}: auch ohne Netz`);
  }
  assert.deepEqual(readdirSync(new URL("alpha/principesse/", root)).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort(), BEISPIELE.map((b) => `beispiel-${b}.jpg`).sort(), "nur diese Bilder im Ordner");
});
