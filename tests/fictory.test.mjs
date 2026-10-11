// «The Fictory» (alpha/the-fictory/): Analyse, Prozess, ORNA-Ableitung und jev-Tabelle ohne Browser.
//   node --experimental-strip-types --no-warnings --test tests/fictory.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const dir = new URL("alpha/the-fictory/", root);
const { analysiere, konturen } = await import(new URL("analyse.js", dir).href);
const O = await import(new URL("operationen.js", dir).href);
const { REGELN, REGEL_IDS, saetze, pruefsumme } = await import(new URL("regeln.js", dir).href);
const { JEV } = await import(new URL("jev.js", dir).href);
const { constellations } = await import(new URL("portfolio/nebeneinander-nacheinander/js/data/constellations.js", root).href);
const { zip, crc32 } = await import(new URL("zip.js", dir).href);
const { mitDauer } = await import(new URL("dauer.js", dir).href);

/** synthetisches Bild: heller Grund, zwei rote Rechtecke, blaue Scheibe mit gelbem Punkt, dunkler Balken, gelbe Scheibe */
function bild() {
  const w = 200, h = 140, data = new Uint8ClampedArray(w * h * 4);
  const set = (x, y, c) => { const i = (y * w + x) * 4; data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) set(x, y, [236, 230, 214]);
  const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, c); };
  const disc = (cx, cy, r, c) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) set(x, y, c); };
  rect(20, 20, 60, 60, [200, 40, 40]); disc(100, 50, 22, [30, 60, 160]); rect(140, 30, 180, 100, [200, 40, 40]);
  disc(60, 105, 18, [240, 190, 30]); rect(90, 90, 130, 100, [30, 30, 30]); disc(110, 52, 6, [240, 190, 30]); rect(10, 70, 190, 74, [30, 60, 160]);
  return { width: w, height: h, data };
}
const A = analysiere(bild());
function lauf(opt = {}) {
  const M = O.erzeugeLauf(A, { seed: 42, ...opt });
  const z = O.anfang(M), keys = [O.zustandsSchluessel(z)], zustaende = {};
  while (z.schritt < O.GESAMT) { O.schritt(M, z); const k = O.SCHLUESSEL.indexOf(z.schritt); if (k >= 0) { keys[k] = O.zustandsSchluessel(z); zustaende[k] = O.kopie(z); } }
  return { M, z, keys, zustaende };
}

test("Analyse: Flächen, Grund und Teile; Befund, Lesart und Eingriff getrennt zu allen sechs Untersuchungsfeldern", () => {
  assert.equal(A.flaechen.length, 7);
  assert.deepEqual(A.grund, [0], "der helle Randgrund");
  assert.equal(A.teile.length, 6);
  assert.deepEqual(A.befunde.map((b) => b.thema), ["Grenzen, Konturen und Flächen", "Nachbarschaften, Abstände und Anordnungen", "Wiederholungen von Farben und Formen",
    "Verbindungen und Unterbrechungen", "Überlagerungen und Verdeckungen", "Figur-Grund-Beziehungen und Gewichtungen"]);
  for (const b of A.befunde) for (const k of ["befund", "lesart", "eingriff"]) assert.ok(b[k].length > 20, `${b.id}.${k}`);
  assert.equal(A.regel, "farbe", "Farbwiederholung → neue Nachbarschaften nach Farbe");
  assert.ok(A.einschluesse.some((e) => A.flaechen[e.innen].cluster !== A.flaechen[e.aussen].cluster), "der gelbe Punkt liegt in der blauen Scheibe");
  assert.ok(!JSON.stringify(A.befunde).match(/Objekt|Gesicht|Person|Mensch|erkannt/), "keine semantischen Behauptungen");
});

test("Analyse: gleich bei gleichem Bild; Korrekturen und verworfene Lesarten wirken", () => {
  assert.deepEqual([...analysiere(bild()).region], [...A.region]);
  const p = { x: A.flaechen[A.teile[0]].cx, y: A.flaechen[A.teile[0]].cy };
  const ohne = analysiere(bild(), { korrekturen: [{ ...p, art: "teil-" }] });
  assert.equal(ohne.teile.length, A.teile.length - 1, "ein Teil abgewählt");
  const grund = analysiere(bild(), { korrekturen: [{ ...p, art: "grund" }] });
  assert.ok(grund.grund.includes(A.teile[0]), "Fläche zum Grund gemacht");
  const v = analysiere(bild(), { verworfen: ["wiederholung"] });
  assert.notEqual(v.regel, "farbe");
  assert.equal(v.befunde.find((b) => b.id === "wiederholung").aktiv, false);
});

test("Konturen sind geschlossene Linienzüge", () => {
  const f = new Float32Array(10 * 10); for (let y = 3; y < 7; y++) for (let x = 2; x < 8; x++) f[y * 10 + x] = 1;
  const k = konturen(f, 10, 10, 0.5);
  assert.equal(k.length, 1);
  assert.deepEqual(k[0][0], k[0][k[0].length - 1]);
});

test("Prozess: genau sieben Stationen (Eingangsbild und sechs Schlüsselzustände), 30 Sekunden, reproduzierbar", () => {
  assert.deepEqual(O.SCHLUESSEL, [60, 210, 360, 525, 675, 780, 900]);
  assert.equal(O.GESAMT / O.TAKT, 30);
  const a = lauf(), b = lauf();
  assert.deepEqual(a.keys, b.keys, "gleicher Startwert, gleiche Zustände");
  assert.equal(new Set(a.keys).size, 7, "alle Schlüsselzustände verschieden");
  assert.notDeepEqual(lauf({ seed: 7 }).keys.slice(3), a.keys.slice(3), "anderer Startwert, anderer Verlauf ab Schritt 3");
  // Neustart: ein neuer Anfang hat keine Spuren
  const z = O.anfang(a.M);
  assert.equal(z.stempel.length, 0); assert.equal(z.spuren.reduce((s, v) => s + v, 0), 0);
  assert.ok(a.z.stempel.length > 20 && a.z.spuren.some((v) => v > 0));
});

test("Prozess: Momentaufnahme und Weiterrechnen ergeben denselben Zustand (Zeitleiste)", () => {
  const { M, keys } = lauf();
  const mitte = O.bis(M, 400);
  assert.equal(O.zustandsSchluessel(O.bis(M, O.SCHLUESSEL[4], mitte)), keys[4]);
});

test("Folgewirksamkeit: Wird das Spurenfeld vor Schritt 4 gelöscht, ändern sich die späteren Schlüsselzustände – die früheren nicht", () => {
  const a = lauf(), b = lauf({ neutralisiere: 4 });
  assert.deepEqual(b.keys.slice(0, 4), a.keys.slice(0, 4));
  for (const k of [4, 5, 6]) assert.notEqual(b.keys[k], a.keys[k], `Schlüsselzustand ${k}`);
  const verschiebung = a.zustaende[5].teile.reduce((s, t, i) => s + Math.hypot(t.x - b.zustaende[5].teile[i].x, t.y - b.zustaende[5].teile[i].y), 0);
  assert.ok(verschiebung > 0.02, `die Teile stehen anders (${verschiebung.toFixed(3)})`);
  // auch Schritt 3 hängt an den Spuren aus Schritt 2
  assert.notEqual(lauf({ neutralisiere: 3 }).keys[3], a.keys[3]);
  // Schritt 2 liest die Ankunftsreihenfolge aus Schritt 1
  assert.equal(a.zustaende[1].ankunft.length, a.M.teile.length);
});

test("Neu zusammengesetzt: am Ende steht jedes Teil an seiner Herkunftsstelle; die Spuren bestimmen die Reihenfolge", () => {
  const a = lauf(), b = lauf({ neutralisiere: 4 }), ende = a.zustaende[6];
  for (const [i, t] of ende.teile.entries()) {
    const e = a.M.teile[i];
    assert.ok(Math.abs(t.x - e.hx) < 1e-9 && Math.abs(t.y - e.hy) < 1e-9 && Math.abs(t.s - 1) < 1e-9, `${O.teilName(e)} an seiner Stelle`);
    assert.ok(Math.abs(Math.sin(t.rot)) < 1e-9 && Math.cos(t.rot) > 0, `${O.teilName(e)} ohne Drehung`);
  }
  assert.equal(ende.grundAlpha, 0, "aus den Teilen zusammengesetzt, nicht das Original eingeblendet");
  assert.ok(ende.gliederung > 0 && ende.gliederung < 0.5, "feine Fugen bleiben");
  assert.equal(ende.kopplungAlpha, 0); assert.equal(ende.schnittAlpha, 0);
  assert.ok(ende.stempel.length === a.zustaende[5].stempel.length, "beim Zusammensetzen wird nicht gestempelt");
  // unterwegs: ohne wirksame Spuren kehren die Teile in anderer Reihenfolge zurück
  const mitte = O.SCHLUESSEL[5] + 50, lage = (M) => O.bis(M, mitte).teile.map((t) => [t.x, t.y]);
  const la = lage(a.M), lb = lage(b.M);
  assert.ok(la.some(([x, y], i) => Math.hypot(x - lb[i][0], y - lb[i][1]) > 0.01), "andere Reihenfolge ohne Spuren");
});

test("Jede ORNA-Regel verändert den Lauf tatsächlich", () => {
  const ohne = lauf().keys;
  for (const r of REGEL_IDS) assert.notDeepEqual(lauf({ regel: r }).keys, ohne, r);
});

test("Zerlegung: das ganze Bild wird Material, grosse Flächen in Kacheln; das Original verschwindet; das Feld wuchert weiter; der Schnitt trennt", () => {
  const { karte, teile } = O.zerlege(A);
  assert.ok(teile.length > A.flaechen.length && teile.length <= 72, `${teile.length} Teile`);
  assert.ok([...karte].every((k) => k >= 0 && k < teile.length), "jedes Pixel gehört zu einem Teil");
  assert.equal(teile.reduce((s, e) => s + e.px, 0), A.breite * A.hoehe);
  assert.ok(teile.some((e) => e.kachel >= 0), "der grosse Grund ist in Kacheln geteilt");
  assert.deepEqual([...new Set(teile.filter((e) => e.figur).map((e) => e.region))].sort((a, b) => a - b), [...A.teile].sort((a, b) => a - b), "Figuren aus der Analyse");
  const { zustaende } = lauf();
  assert.equal(zustaende[0].grundAlpha, 1, "Eingangsbild");
  for (const k of [1, 2, 3, 4, 5, 6]) assert.equal(zustaende[k].grundAlpha, 0, `Schlüsselzustand ${k} ohne Original`);
  assert.ok(zustaende[5].federn.some((f) => !f.aktiv), "der Schnitt in Schritt 5 trennt Kopplungen");
  // das wuchernde Feld: leer bis zu den ersten Stempeln, danach wächst es weiter, auch wo nicht mehr gestempelt wird
  const flaeche = (z) => z.feldB.filter((v) => v > 0.2).length / z.feldB.length;
  assert.equal(flaeche(zustaende[1]), 0);
  assert.ok(flaeche(zustaende[3]) > 0.05, `Feld nach Schritt 3: ${flaeche(zustaende[3])}`);
  assert.notEqual(flaeche(zustaende[5]), flaeche(zustaende[4]), "es verändert sich nach dem letzten Stempel weiter");
  assert.equal(zustaende[4].stempel.length, zustaende[5].stempel.length);
  // R6: an den Herkunftsstellen der Figuren wächst nichts
  const r6 = lauf({ regel: "R6" });
  assert.ok(r6.M.leer.some((v) => v) && r6.M.leer.every((v, i) => !v || r6.zustaende[5].feldB[i] === 0), "R6 hält die Leerstellen frei");
});

test("Ereignisse beschreiben jede der sechs Operationen", () => {
  const { M, zustaende } = lauf({ regel: "R2" });
  const b = O.beschreibungen(M, zustaende);
  assert.deepEqual(b.map((x) => x.titel), ["Neue Nachbarschaften", "Abfolge als Bild", "Wirksame Spuren", "Gekoppelte Beziehungen", "Anders weitergehen", "Neu zusammengesetzt"]);
  for (const x of b) assert.match(x.text, new RegExp(`Schritt ${x.nr}`));
  assert.match(b[1].text, /R2/);
});

test("jev-Tabelle: gültige Prüfsumme, jede Konstellation mit Wahrscheinlichkeiten je Regel und einem Satz des Textes", () => {
  assert.ok(JEV, "jev.js ist erzeugt (tools/build-jev-fictory.ts)");
  assert.equal(JEV.pruefsumme, pruefsumme(constellations), "Tabelle veraltet: NODE_USE_ENV_PROXY=1 node --experimental-strip-types --no-warnings tools/build-jev-fictory.ts");
  assert.equal(Object.keys(JEV.eintraege).length, constellations.length);
  for (const k of constellations) {
    const e = JEV.eintraege[k.id];
    assert.deepEqual(Object.keys(e.regel).sort(), [...REGEL_IDS].sort(), k.id);
    for (const r of REGEL_IDS) assert.ok(e.satz[r] >= 0 && e.satz[r] < saetze(k.text).length, `${k.id} ${r}`);
  }
});

test("ORNA-Ableitung: reproduzierbar, Gedanke ist ein unveränderter Satz, Regel und Herkunft angegeben", async () => {
  globalThis.crypto ??= (await import("node:crypto")).webcrypto;
  const { ableiten, ziehe } = await import(new URL("orna.js", dir).href);
  for (const k of constellations.slice(0, 40)) {
    const a = ableiten(k.id, 12345), b = ableiten(k.id, 12345);
    assert.deepEqual(a, b);
    assert.ok(REGELN[a.regel]);
    assert.ok(k.text.includes(a.satz), `${k.id}: Satz wörtlich im Text`);
    assert.match(a.herkunft, new RegExp(k.id));
    assert.equal(a.quelle, "jev");
    assert.ok(["naheliegend", "möglich", "schwierig"].includes(a.passung));
  }
  const z = ziehe();
  assert.ok(constellations.some((k) => k.id === z.id) && Number.isInteger(z.seed));
  assert.notEqual(ziehe(z.id).id, z.id, "nie dieselbe zweimal unmittelbar hintereinander");
});

test("Seite: ruft keinen Dienst auf (nur das Beispielbild) und hält keine Schlüssel; ORNA wird nur gelesen", () => {
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".js") || f.endsWith(".html"))) {
    const s = readFileSync(new URL(f, dir), "utf8");
    const aufrufe = [...s.matchAll(/fetch\(([^)]*)\)/g)].map((m) => m[1]);
    // der Service Worker (seit 11. Oktober 2026) holt die Dateien der Seite für den Betrieb ohne Netz, nur von derselben Herkunft (eigener Test unten)
    if (f !== "sw.js") assert.ok(aufrufe.every((a) => a === '"beispiel.jpg"'), `${f}: ${aufrufe}`);
    assert.doesNotMatch(s, /XMLHttpRequest|sendBeacon|TYPESAFE_API_KEY|Bearer /, f);
    assert.doesNotMatch(s, /(src|href)="https?:\/\/(?!ornament-cloud\.goatcounter)/, f);
  }
  assert.doesNotMatch(readFileSync(new URL("orna.js", dir), "utf8"), /writeFile|localStorage/);
});

test("Alpha: Seite mit Navigation, noindex, in der Übersicht zuoberst, nicht in der Sitemap", () => {
  const html = readFileSync(new URL("index.html", dir), "utf8");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<nav class="seitenweg" aria-label="Ornament Cloud">\s*<a href="\.\.\/\.\.\/" aria-current="true">Ornament Cloud<\/a>\s*<a href="\.\.\/drittes-rad\/">Das Dritte Rad<\/a>\s*<\/nav>/);
  const uebersicht = readFileSync(new URL("alpha/index.html", root), "utf8");
  const eintraege = [...uebersicht.matchAll(/<li>\s*(?:<img[^>]*>\s*)?<div>\s*<a href="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(eintraege[0], "the-fictory/");
  assert.ok(!readFileSync(new URL("sitemap.xml", root), "utf8").includes("the-fictory"));
});

/** Breite und Höhe aus dem Kopf einer PNG-Datei */
const pngMass = (buf) => (buf.subarray(1, 4).toString() === "PNG" ? [buf.readUInt32BE(16), buf.readUInt32BE(20)] : null);

test("App (11. Oktober 2026): Manifest, Symbole und Anmeldung des Service Workers; installiert öffnet sie die Seite selbst", () => {
  const m = JSON.parse(readFileSync(new URL("manifest.webmanifest", dir), "utf8"));
  assert.equal(m.name, "The Fictory"); assert.equal(m.short_name, "The Fictory");
  assert.equal(m.start_url, "./"); assert.equal(m.scope, "./"); assert.equal(m.display, "standalone");
  assert.ok(m.description.length > 40 && m.lang === "de-CH");
  const symbole = Object.fromEntries(m.icons.map((i) => [i.purpose, i]));
  assert.deepEqual(m.icons.map((i) => [i.src, i.sizes, i.purpose]), [["icons/icon-192.png", "192x192", "any"], ["icons/icon-512.png", "512x512", "any"], ["icons/icon-maskable-512.png", "512x512", "maskable"]]);
  assert.ok(symbole.maskable, "maskierbares Symbol für Android");
  for (const [datei, mass] of [["icon-192.png", 192], ["icon-512.png", 512], ["icon-maskable-512.png", 512], ["apple-touch-icon.png", 180], ["favicon-32.png", 32]])
    assert.deepEqual(pngMass(readFileSync(new URL(`icons/${datei}`, dir))), [mass, mass], datei);
  const html = readFileSync(new URL("index.html", dir), "utf8");
  assert.match(html, /<link rel="manifest" href="manifest\.webmanifest">/);
  assert.match(html, /<link rel="apple-touch-icon" href="icons\/apple-touch-icon\.png">/);
  assert.match(html, /<link rel="icon" href="icons\/favicon-32\.png"/);
  assert.match(html, /<meta name="theme-color" content="#151412">/);
  assert.match(html, /<script type="module" src="pwa\.js\?v=14"><\/script>/);
  assert.match(html, /<div class="installieren" id="installieren" hidden>[\s\S]*?id="installieren-knopf"[\s\S]*?The Fictory als App installieren/);
  const pwa = readFileSync(new URL("pwa.js", dir), "utf8");
  assert.match(pwa, /serviceWorker\.register\(new URL\("sw\.js", import\.meta\.url\), \{ scope: "\.\/" \}\)/);
  assert.match(pwa, /display-mode: standalone/, "in der installierten App kein Knopf");
  // die Symbole erzeugt tools/fictory-icons.mjs aus Christians Raster
  const werkzeug = readFileSync(new URL("tools/fictory-icons.mjs", root), "utf8");
  assert.ok(werkzeug.includes("src/the-fictory/vorschau-quelle.jpg") && werkzeug.includes("icon-maskable-512.png") && werkzeug.includes("vorschau-the-fictory-app.jpg"));
});

test("App: der Service Worker bleibt bei derselben Herkunft, im eigenen Cache und folgt den Verweisen der Seite (ohne eigene Dateiliste)", () => {
  const sw = readFileSync(new URL("sw.js", dir), "utf8");
  assert.match(sw, /if \(req\.method !== "GET" \|\| url\.origin !== self\.location\.origin\) return;/, "Fremdes (Zählung) geht unberührt ans Netz");
  assert.match(sw, /if \(u\.origin === self\.location\.origin\) out\.push\(u\.href\);/, "beim Einrichten nur Verweise derselben Herkunft");
  assert.match(sw, /const CACHE = "fictory-\d+";/);
  assert.match(sw, /k\.startsWith\("fictory-"\) && k !== CACHE/, "räumt nur eigene, alte Caches auf");
  assert.ok(!/\?v=\d/.test(sw), "keine festen Versionsmarken: der Service Worker liest sie aus der Seite");
  for (const d of ["beispiel.jpg", "manifest.webmanifest", "icons/icon-512.png"]) assert.ok(sw.includes(`"${d}"`), d);
});

test("ZIP: Prüfsumme und Aufbau", () => {
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
  const z = zip([{ name: "a.txt", bytes: new TextEncoder().encode("hallo") }]);
  assert.equal(new DataView(z.buffer).getUint32(0, true), 0x04034b50);
  assert.equal(new DataView(z.buffer).getUint32(z.length - 22, true), 0x06054b50);
});

test("Video-Länge: fragmentiertes MP4 und WebM ohne Länge bekommen sie nachgetragen, das Bild bleibt unverändert", () => {
  // MP4 wie von MediaRecorder: Kopf mit Länge 0 (Film) und der Länge des ersten Stücks (Spur), danach zwei Stücke à 30 Proben zu 1000 (Zeitbasis 30000)
  const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const box = (t, ...inhalt) => { const b = inhalt.flat(); return [...u32(b.length + 8), ...[...t].map((c) => c.charCodeAt(0)), ...b]; };
  const voll = (v, f, ...rest) => [v, (f >>> 16) & 255, (f >>> 8) & 255, f & 255, ...rest.flat()];
  const mvhd = box("mvhd", voll(0, 0, u32(0), u32(0), u32(1000), u32(0), new Array(80).fill(0)));
  const tkhd = box("tkhd", voll(0, 3, u32(0), u32(0), u32(1), u32(0), u32(1000), new Array(60).fill(0)));
  const mdhd = box("mdhd", voll(0, 0, u32(0), u32(0), u32(30000), u32(30000), [0, 0, 0, 0]));
  const moov = box("moov", mvhd, box("trak", tkhd, box("mdia", mdhd)), box("mvex", box("trex", voll(0, 0, u32(1), u32(1), u32(0), u32(0), u32(0)))));
  const stueck = (basis) => box("moof", box("traf", box("tfhd", voll(0, 0x020000, u32(1))), box("tfdt", voll(1, 0, [0, 0, 0, 0], u32(basis))),
    box("trun", voll(0, 0x100, u32(30), ...Array.from({ length: 30 }, () => u32(1000)))))).concat(box("mdat", [1, 2, 3]));
  const datei = new Uint8Array([...box("ftyp", [..."isom"].map((c) => c.charCodeAt(0)), u32(0)), ...moov, ...stueck(0), ...stueck(30000)]);
  const neu = mitDauer(datei.slice(), 99), v = new DataView(neu.buffer);
  const bei = (t) => { for (let i = 0; i < neu.length - 4; i++) if (String.fromCharCode(...neu.subarray(i, i + 4)) === t) return i - 4; };
  assert.equal(neu.length, datei.length);
  assert.equal(v.getUint32(bei("mvhd") + 24), 2000, "Film: 2 s in Zeitbasis 1000 (aus den Stücken, nicht aus der Angabe 99)");
  assert.equal(v.getUint32(bei("tkhd") + 28), 2000, "Spur");
  assert.equal(v.getUint32(bei("mdhd") + 24), 60000, "Medium: 2 s in Zeitbasis 30000");
  assert.equal([...neu].filter((b, i) => b !== datei[i]).length <= 8, true, "nur die Längenfelder ändern sich");
  // WebM wie von MediaRecorder: Segment mit unbekannter Grösse, Info ohne Duration
  const ebml = [0x1a, 0x45, 0xdf, 0xa3, 0x84, 0x42, 0x86, 0x81, 0x01];
  const info = [0x15, 0x49, 0xa9, 0x66, 0x87, 0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40];
  const cluster = [0x1f, 0x43, 0xb6, 0x75, 0x83, 7, 8, 9];
  const webm = new Uint8Array([...ebml, 0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, ...info, ...cluster]);
  const w = mitDauer(webm, 31.5);
  const k = [...w].findIndex((b, i) => b === 0x44 && w[i + 1] === 0x89 && w[i + 2] === 0x88);
  assert.ok(k > 0, "Duration eingefügt");
  assert.equal(new DataView(w.buffer, w.byteOffset).getFloat64(k + 3), 31500, "31,5 s in Millisekunden (TimecodeScale 1 000 000)");
  assert.deepEqual([...w.subarray(w.length - cluster.length)], cluster, "der Cluster (das Bild) bleibt gleich");
  assert.deepEqual([...mitDauer(new Uint8Array([1, 2, 3]), 5)], [1, 2, 3], "Unbekanntes bleibt unverändert");
});
