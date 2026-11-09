// ORNAMENT COMPOSER (alpha/composer/): Plugins, Motor, Messung, Projektformat ohne Browser.
//   node --test tests/composer.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const c = (p) => import(new URL(`alpha/composer/${p}`, root).href);
const { PLUGINS, neueste } = await c("plugins/register.js");
const { pruefePlugin, standardWerte, bereinigeWerte } = await c("kern/plugin.js");
const { Motor, BLOCK } = await c("kern/motor.js");
const { rendern } = await c("kern/rendern.js");
const { messen, lautheitIntegriert, wahrerSpitzenwert } = await c("kern/messen.js");
const { VARIANTEN, typAusName } = await c("kern/varianten.js");
const PR = await c("kern/projekt.js");

const RATE = 48000;
/** ein Klang mit Anschlägen, Bass und Rauschen, stereo, aus einem Startwert */
function klang(sek = 2, seed = 7) {
  let a = seed; const rnd = () => ((a = (Math.imul(a, 1664525) + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  const n = Math.round(sek * RATE), L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE, schlag = Math.exp(-((t % 0.5) * 30)), v = 0.4 * Math.sin(2 * Math.PI * 55 * t) * schlag + 0.15 * rnd() * Math.exp(-((t % 0.25) * 60)) + 0.1 * Math.sin(2 * Math.PI * 440 * t);
    L[i] = v; R[i] = v * 0.8 + 0.05 * rnd();
  }
  return [L, R];
}
const kette = (werte) => [{ plugin: "kanalzug@0.1.0", parameter: werte }];
const gleich = (a, b, msg) => { assert.equal(a.length, b.length, msg); for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) assert.fail(`${msg}: Abtastwert ${i}: ${a[i]} ≠ ${b[i]}`); };

test("Plugins: jedes beschreibt sich gültig, Versionen sind abrufbar", () => {
  for (const [k, d] of Object.entries(PLUGINS)) { assert.deepEqual(pruefePlugin(d), [], k); assert.equal(k, `${d.id}@${d.version}`); }
  assert.equal(neueste("kanalzug").version, "0.1.0");
  const w = bereinigeWerte(PLUGINS["kanalzug@0.1.0"], { hochpass: 5, unbekannt: 3, antrieb: 99 });
  assert.equal(w.hochpass, 20); assert.equal(w.antrieb, 24); assert.ok(!("unbekannt" in w));
});

test("Kanalzug: in Grundstellung bitgleich zur Quelle", () => {
  const [L, R] = klang(1), k = [Float32Array.from(L), Float32Array.from(R)], def = PLUGINS["kanalzug@0.1.0"], inst = def.erzeuge(RATE);
  inst.setze(standardWerte(def));
  for (let o = 0; o < L.length; o += BLOCK) { const n = Math.min(BLOCK, L.length - o); inst.prozess([k[0].subarray(o), k[1].subarray(o)], n); }
  gleich(k[0], L, "links"); gleich(k[1], R, "rechts");
});

test("Kanalzug: jede Variante bleibt endlich und im Pegel vernünftig", () => {
  const def = PLUGINS["kanalzug@0.1.0"], q = klang(1), roh = lautheitIntegriert(q, RATE);
  for (const [typ, liste] of Object.entries(VARIANTEN)) for (const v of liste) {
    const inst = def.erzeuge(RATE), k = q.map((s) => Float32Array.from(s));
    inst.setze(bereinigeWerte(def, v.werte));
    for (let o = 0; o < k[0].length; o += BLOCK) inst.prozess([k[0].subarray(o), k[1].subarray(o)], Math.min(BLOCK, k[0].length - o));
    assert.ok(k.every((s) => s.every(Number.isFinite)), `${typ}/${v.name} endlich`);
    const d = lautheitIntegriert(k, RATE) - roh;
    assert.ok(Math.abs(d) < 12, `${typ}/${v.name}: ${d.toFixed(1)} LU Unterschied`);
  }
});

test("Kanalzug: Kompressor reduziert, Sättigung lässt kleine Signale gleich laut", () => {
  const def = PLUGINS["kanalzug@0.1.0"], n = RATE / 2;
  const sinus = (amp) => { const s = Float32Array.from({ length: n }, (_, i) => amp * Math.sin((2 * Math.PI * 200 * i) / RATE)); return [s, Float32Array.from(s)]; };
  const lauf = (werte, k) => { const inst = def.erzeuge(RATE); inst.setze(bereinigeWerte(def, werte)); let red = 0; for (let o = 0; o < n; o += BLOCK) red = Math.min(red, inst.prozess([k[0].subarray(o), k[1].subarray(o)], Math.min(BLOCK, n - o)).reduktion); return red; };
  const k = sinus(0.5), red = lauf({ schwelle: -24, verhaeltnis: 4, angriff: 1 }, k);
  assert.ok(red < -8, `Reduktion ${red}`);
  const leise = sinus(0.001), vor = Float32Array.from(leise[0]);
  lauf({ antrieb: 18, waerme: 50 }, leise);
  const rms = (s) => Math.sqrt(s.slice(n / 2).reduce((a, v) => a + v * v, 0) / (n / 2));
  assert.ok(Math.abs(20 * Math.log10(rms(leise[0]) / rms(vor))) < 0.3, "kleiner Pegel bleibt");
});

test("Grenze: wahrer Spitzenwert bleibt unter der Decke, Latenz stimmt", async () => {
  const q = klang(2).map((s) => s.map((v) => v * 3));
  const r = await rendern({ rate: RATE, plugins: PLUGINS, spuren: [{ id: "a", kanaele: q }], zustand: { spuren: [{ id: "a", pegel: 0, kette: [] }], master: { pegel: 0, kette: [{ plugin: "grenze@0.1.0", parameter: { decke: -1 } }] } } });
  assert.ok(r.latenz > 0);
  const tp = wahrerSpitzenwert(r.summe);
  assert.ok(tp < -0.7, `wahrer Spitzenwert ${tp} dBTP`);
  // ohne Spitze über der Decke: nur verzögert, also nach dem Ausgleich gleich
  const leise = klang(1).map((s) => s.map((v) => v * 0.2));
  const r2 = await rendern({ rate: RATE, plugins: PLUGINS, spuren: [{ id: "a", kanaele: leise }], zustand: { spuren: [{ id: "a", kette: [] }], master: { kette: [{ plugin: "grenze@0.1.0", parameter: { decke: -1 } }] } } });
  for (let i = 0; i < leise[0].length; i += 997) assert.ok(Math.abs(r2.summe[0][i] - leise[0][i]) < 1e-6, `Stelle ${i}`);
});

test("Motor: Vorschau in Blöcken und Export sind Abtastwert für Abtastwert gleich", async () => {
  const a = klang(1.3, 1), b = klang(1.3, 2);
  const zustand = { spuren: [{ id: "a", pegel: -3, pan: -0.4, kette: kette(VARIANTEN.drums[2].werte) }, { id: "b", pegel: 1, pan: 0.2, kette: kette(VARIANTEN.bass[3].werte) }],
    master: { pegel: -1, kette: [{ plugin: "kanalzug@0.1.0", parameter: VARIANTEN.summe[1].werte }, { plugin: "grenze@0.1.0", parameter: { antrieb: 4 } }] } };
  const m = new Motor(RATE, PLUGINS); m.spurLaden("a", a); m.spurLaden("b", b); m.setze(zustand);
  for (const s of zustand.spuren) m.spuren.get(s.id).gAus = 10 ** (s.pegel / 20);
  m.master.pegel = 10 ** (-1 / 20);
  const n = a[0].length, lat = m.master.kette.latenz(), live = [new Float32Array(n + lat), new Float32Array(n + lat)], aus = [new Float32Array(BLOCK), new Float32Array(BLOCK)];
  for (let o = 0; o < n + lat; o += BLOCK) { const k = Math.min(BLOCK, n + lat - o); m.block(aus, k); live[0].set(aus[0].subarray(0, k), o); live[1].set(aus[1].subarray(0, k), o); }
  const r = await rendern({ rate: RATE, plugins: PLUGINS, spuren: [{ id: "a", kanaele: a }, { id: "b", kanaele: b }], zustand });
  gleich(r.summe[0], live[0].subarray(lat), "Summe links"); gleich(r.summe[1], live[1].subarray(lat), "Summe rechts");
  assert.equal(r.stems.size, 2);
});

test("Motor: Schleife springt, Stumm und Solo, Vorher mit Pegelausgleich", () => {
  const a = klang(1), m = new Motor(RATE, PLUGINS); m.spurLaden("a", a); m.spurLaden("b", klang(1, 3));
  m.setze({ spuren: [{ id: "a", kette: kette({ ausgang: 6 }) }, { id: "b", stumm: true, kette: [] }] });
  m.schleife = { a: 1000, b: 1100 }; m.pos = 1050;
  const aus = [new Float32Array(BLOCK), new Float32Array(BLOCK)];
  m.block(aus, BLOCK);
  assert.equal(m.pos, 1000 + ((1050 + BLOCK - 1100) % 100));
  // vorher: nach einigen Sekunden gleich laut wie nachher (+6 dB), also etwa +6 dB über der Quelle
  m.schleife = null; m.pos = 0; m.setze({ spuren: [{ id: "a", vorher: true, kette: kette({ ausgang: 6 }) }, { id: "b", solo: true, kette: [] }] });
  for (let i = 0; i < 4000; i++) { if (m.pos + BLOCK >= a[0].length) m.pos = 0; m.block(aus, BLOCK); }
  assert.ok(Math.abs(m.spuren.get("a").ausgleichDB - 6) < 0.5, `Ausgleich ${m.spuren.get("a").ausgleichDB}`);
  assert.ok(aus[0].every((v) => v === 0) === false, "Solo b klingt");
});

test("Messen: 1-kHz-Sinus mit 0 dBFS links ergibt −3,01 LUFS; wahrer Spitzenwert zwischen Abtastwerten", () => {
  const n = RATE * 5, L = Float32Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 1000 * i) / RATE)), R = new Float32Array(n);
  assert.ok(Math.abs(lautheitIntegriert([L, R], RATE) + 3.01) < 0.1, `${lautheitIntegriert([L, R], RATE)}`);
  // fs/4 mit 45° Phase: Abtastwerte bei ±0,707, Spitze dazwischen bei 1
  const s = Float32Array.from({ length: 4800 }, (_, i) => Math.sin((Math.PI / 2) * i + Math.PI / 4));
  const tp = wahrerSpitzenwert([s]);
  assert.ok(tp > -0.5 && tp < 0.3, `wahrer Spitzenwert ${tp}`);
  const m = messen(klang(3), RATE);
  assert.ok(m.baender.unter120 > 0.2 && Math.abs(m.baender.unter120 + m.baender.mitten + m.baender.ueber2k - 1) < 0.01, JSON.stringify(m.baender));
  assert.equal(m.spektrum.length, 29);
});

test("Spurtyp aus dem Dateinamen", () => {
  assert.equal(typAusName("drums.wav"), "drums"); assert.equal(typAusName("bass.wav"), "bass"); assert.equal(typAusName("stimme.wav"), "stimme");
  assert.equal(typAusName("rest-raum.wav"), "rest"); assert.equal(typAusName("neuland-primo-beat-heller.wav"), "summe");
});

test("Projektformat: neu, Spur dazu, prüfen, hin und zurück", () => {
  const p = PR.neuesProjekt({ titel: "Neuland Primo", rate: 44100 });
  PR.spurDazu(p, { name: "drums.wav", sha256: "ab".repeat(32), bytes: 10, rate: 44100, kanaele: 2, dauer: 184.3 });
  assert.equal(p.spuren[0].typ, "drums"); assert.equal(p.spuren[0].kette[0].plugin, "kanalzug@0.1.0");
  const zurueck = PR.lesen(JSON.stringify(p));
  assert.deepEqual(zurueck, p);
  assert.deepEqual(PR.pruefe(p), []);
  assert.ok(PR.pruefe({ ...p, spuren: [{ ...p.spuren[0], kette: [{ plugin: "gibts@9.9.9" }] }] }).length > 0);
  assert.throws(() => PR.lesen(JSON.stringify({ format: "anderes" })));
});
