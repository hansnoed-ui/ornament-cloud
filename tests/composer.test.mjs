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

// ---------- Klangerzeuger, Raum, Muster (Drums 0.1.0, Perkussion 0.1.0) ----------
const { ERZEUGER, stimmeVon } = await c("erzeuger/register.js");
const { STILE, taktLesen } = await c("kern/muster.js");
const { spurRechnen } = await c("kern/erzeugen.js");

test("Erzeuger: jede Stimme, Variante und Artikulation ist endlich, gleich laut und reproduzierbar", () => {
  for (const [id, e] of Object.entries(ERZEUGER)) if (!e.melodisch && !e.flaeche) for (const [k, s] of Object.entries(e.stimmen)) {
    const std = Object.fromEntries(s.parameter.map((p) => [p.key, p.std]));
    assert.ok(s.varianten.length >= 6, `${k}: mindestens sechs Varianten`);
    for (const p of s.parameter) assert.ok(p.min <= p.std && p.std <= p.max, `${k}.${p.key}`);
    for (const v of s.varianten) for (const a of s.artikulationen) {
      const [L, R] = s.rechne({ ...std, ...v.werte }, RATE, { art: a.key, staerke: 1, seed: 5 });
      let m = 0; for (const x of L) { assert.ok(Number.isFinite(x), `${id} ${k} ${v.name} ${a.key}`); m = Math.max(m, Math.abs(x)); }
      assert.ok(m > 0.2 && m <= 1.2, `${k} ${v.name} ${a.key}: Spitze ${m}`);
      assert.equal(R.length, L.length);
    }
    const a = s.rechne(std, RATE, { art: s.artikulationen[0].key, staerke: 0.8, seed: 9 }), b = s.rechne(std, RATE, { art: s.artikulationen[0].key, staerke: 0.8, seed: 9 });
    gleich(a[0], b[0], `${k} reproduzierbar`);
  }
});

test("Muster: Takte lesen (Sechzehntel, Achtel, Betonung, Artikulation)", () => {
  const t = taktLesen("x! . . . o . g . x . . . x_ . . .");
  assert.deepEqual(t.map((s) => [s.schritt, s.staerke]), [[0, 1], [4, 0.6], [6, 0.32], [8, 0.8], [12, 0.45]]);
  const a = taktLesen("dha . ge . na . ti .", "na");
  assert.deepEqual(a.map((s) => [s.art, s.stelle]), [["dha", 0], ["ge", 0.25], ["na", 0.5], ["ti", 0.75]]);
});

test("Stile: jede Spur hat Schläge, die Länge ist ein ganzes Vielfaches des Takts, Schleife ohne Naht, Startwert wirkt", () => {
  for (const st of STILE) for (const [i, s] of st.spuren.entries()) {
    const q = { ...s, werte: stimmeVon(s.erzeuger, s.stimme).varianten.find((v) => v.name === s.variante)?.werte ?? {}, anzahl: 4, bpm: st.bpm, swing: st.swing, menschlich: s.menschlich ?? st.menschlich, seed: 3 + i };
    assert.ok(stimmeVon(s.erzeuger, s.stimme).varianten.some((v) => v.name === s.variante), `${st.key}/${s.stimme}: Variante «${s.variante}» gibt es`);
    const r = spurRechnen(q, RATE);
    assert.ok(r.schlaege > 0, `${st.key}/${s.stimme}`);
    assert.equal(r.kanaele[0].length, Math.round(4 * (240 / st.bpm) * RATE));
  }
  const s = STILE[0].spuren[2], q = { ...s, werte: {}, anzahl: 2, bpm: 174, swing: 0, menschlich: 2, seed: 1 };
  const a = spurRechnen(q, RATE).kanaele[0], b = spurRechnen({ ...q, seed: 2 }, RATE).kanaele[0];
  assert.ok(a.some((v, i) => v !== b[i]), "anderer Startwert, andere kleine Abweichungen");
  gleich(spurRechnen(q, RATE).kanaele[0], a, "gleicher Startwert, gleiche Spur");
});

test("Raum: endlich, klingt aus, Anteil 0 lässt das Signal unverändert", () => {
  const def = PLUGINS["raum@0.1.0"], n = RATE * 4, imp = [new Float32Array(n), new Float32Array(n)]; imp[0][0] = imp[1][0] = 1;
  const inst = def.erzeuge(RATE); inst.setze(bereinigeWerte(def, { anteil: 100, nachhall: 1.5 }));
  for (let o = 0; o < n; o += BLOCK) inst.prozess([imp[0].subarray(o), imp[1].subarray(o)], Math.min(BLOCK, n - o));
  const rms = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += imp[0][i] ** 2; return Math.sqrt(s / (b - a)); };
  assert.ok(imp[0].every(Number.isFinite));
  assert.ok(rms(RATE * 0.1, RATE * 0.3) > 1e-4, "es hallt");
  const abfall = 20 * Math.log10(rms(RATE * 1.6, RATE * 1.8) / rms(RATE * 0.1, RATE * 0.3));
  assert.ok(abfall < -40 && abfall > -110, `Abfall nach 1,5 s: ${abfall.toFixed(1)} dB`);
  assert.ok(imp[0].some((v, i) => v !== imp[1][i]), "stereo");
  const q = klang(0.5), k = q.map((x) => Float32Array.from(x)), i2 = def.erzeuge(RATE); i2.setze(bereinigeWerte(def, { anteil: 0 }));
  for (let o = 0; o < k[0].length; o += BLOCK) i2.prozess([k[0].subarray(o), k[1].subarray(o)], Math.min(BLOCK, k[0].length - o));
  gleich(k[0], q[0], "Anteil 0");
});

test("Projekt: erzeugte Spur speichert nur das Rezept und prüft den Erzeuger", () => {
  const p = PR.neuesProjekt({ rate: RATE });
  const sp = PR.erzeugteSpurDazu(p, { art: "erzeugt", erzeuger: "perkussion@0.1.0", stimme: "tabla", werte: {}, takte: ["dha . ge . na . ti ."], anzahl: 2, bpm: 92, seed: 1 }, { name: "Tabla", typ: "perkussion", raum: { anteil: 20 } });
  assert.equal(sp.datei, null); assert.deepEqual(sp.kette.map((g) => g.plugin), ["kanalzug@0.1.0", "raum@0.1.0"]);
  assert.deepEqual(PR.pruefe(p), []);
  assert.ok(PR.pruefe({ ...p, spuren: [{ ...sp, quelle: { ...sp.quelle, erzeuger: "gibts@1.0.0" } }] }).length > 0);
});

// ---------- Bass 0.1.0, Linien, Bassfett ----------
const L = await c("kern/linien.js");

test("Linien: Stufen lesen, Halbtöne, Bindebogen über den Taktstrich, Grundton 30–60 Hz", () => {
  assert.deepEqual(L.tonLesen("b3'~!"), { stufe: 3, vorzeichen: -1, oktave: 1, gleiten: true, staerke: 1 });
  assert.equal(L.halbtoene(L.tonLesen("3"), "moll"), 3); assert.equal(L.halbtoene(L.tonLesen("3"), "dur"), 4);
  assert.equal(L.halbtoene(L.tonLesen("8"), "moll"), 12); assert.equal(L.halbtoene(L.tonLesen("7,"), "moll"), -2);
  const n = L.notenLesen(["1 - - - . . . . 5 - - - - - - -", "- - - - 3 . . ."], { bpm: 120, anzahl: 2, leiter: "moll" });
  assert.deepEqual(n.map((x) => [x.beginn, x.dauer, x.halbtoene]), [[0, 0.5, 0], [1, 2, 7], [3, 0.25, 3]]);
  for (let g = 0; g < 12; g++) { const f = L.grundFrequenz(g); assert.ok(f >= 30 && f < 60, `${g}: ${f}`); }
  assert.ok(Math.abs(L.grundFrequenz(9) - 54) < 1e-9, "A = 432 Hz → A1 = 54 Hz");
});

test("Linien: jede Art ergibt lesbare Takte in jeder Leiter", () => {
  const kicks = L.kickSchritte(["x! . . . . . . x . . x . . . . ."]);
  for (const art of L.LINIEN.map((l) => l.key)) for (const leiter of Object.keys(L.LEITERN)) {
    const z = L.linieErzeugen({ art, leiter, kicks, anzahl: 8, seed: 4 });
    if (art === "zyklus") assert.ok([3, 5, 7].includes(z.length), `${art}: Zyklus ${z.length} Takte`); else assert.equal(z.length, 8, `${art}/${leiter}`);
    const n = L.notenLesen(z, { bpm: 90, anzahl: 8, leiter });
    assert.ok(n.length >= 4, `${art}/${leiter}: ${n.length} Noten`);
    assert.ok(n.every((x) => Number.isFinite(x.halbtoene) && x.halbtoene > -24 && x.halbtoene < 30 && x.dauer > 0), `${art}/${leiter}`);
    for (const zl of z) for (const t of zl.split(" ")) assert.ok(t === "." || t === "-" || L.tonLesen(t), `${art}: «${t}»`);
  }
});

test("Bass: jede Stimme und Variante ist endlich, einstimmig unter 0 dBFS, unten mono", () => {
  const bass = ERZEUGER["bass@0.1.0"], takte = L.linieErzeugen({ art: "kick", kicks: L.kickSchritte(["x . . . . . . x . . x . . . . ."]), anzahl: 2, seed: 2 });
  for (const [k, st] of Object.entries(bass.stimmen)) {
    assert.ok(st.varianten.length >= 6, k);
    for (const v of st.varianten) {
      const r = spurRechnen({ erzeuger: "bass@0.1.0", stimme: k, werte: v.werte, takte, anzahl: 2, bpm: 100, grundton: 2, leiter: "moll", seed: 1 }, RATE);
      let m = 0; for (const s of r.kanaele) for (const x of s) { assert.ok(Number.isFinite(x), `${k} ${v.name}`); m = Math.max(m, Math.abs(x)); }
      assert.ok(m > 0.1 && m <= 0.95, `${k} ${v.name}: Spitze ${m}`);
      const me = messen(r.kanaele, RATE);
      assert.ok(me.korrelation > 0.8, `${k} ${v.name}: Korrelation ${me.korrelation}`);
    }
  }
});

test("Bass: Tonhöhe stimmt (Sub auf D, 432 Hz)", () => {
  const st = stimmeVon("bass@0.1.0", "sub"), w = Object.fromEntries(st.parameter.map((p) => [p.key, p.std]));
  const f = L.grundFrequenz(2) * 2, [s] = st.rechne({ ...w, waerme: 0, antrieb: 0 }, RATE, { frequenz: f, dauer: 1, staerke: 0.8 });
  let z = 0; for (let i = RATE * 0.2 + 1; i < RATE * 0.8; i++) if (s[i - 1] < 0 && s[i] >= 0) z++;
  assert.ok(Math.abs(z / 0.6 - f) < 2, `gemessen ${(z / 0.6).toFixed(1)} Hz, erwartet ${f.toFixed(1)}`);
});

test("Bassfett: Grundstellung unverändert, Unteroktave fügt tiefe Energie hinzu", () => {
  const def = PLUGINS["bassfett@0.1.0"], q = klang(1);
  const lauf = (werte) => { const k = q.map((x) => Float32Array.from(x)), i = def.erzeuge(RATE); i.setze(bereinigeWerte(def, werte)); for (let o = 0; o < k[0].length; o += BLOCK) i.prozess([k[0].subarray(o), k[1].subarray(o)], Math.min(BLOCK, k[0].length - o)); return k; };
  gleich(lauf({})[0], q[0], "Grundstellung");
  const sub = lauf({ sub: 100 }), mb = messen(q, RATE).spektrum, ms = messen(sub, RATE).spektrum;
  assert.ok(ms[1] > mb[1] + 3, `31,5-Hz-Band: ${mb[1]} → ${ms[1]} dB`);
  const ob = messen(lauf({ obertoene: 100 }), RATE);
  assert.ok(ob.spektrum[9] > mb[9], "Obertöne um 200 Hz");
});

// ---------- Unterbrechungen 0.1.0 ----------
const U = await c("kern/unterbrechungen.js");

test("Unterbrechungen: jede Art bleibt endlich, ändert nur ihren Bereich, die Quelle bleibt unberührt", () => {
  const q = klang(4), tempo = { bpm: 120, beginn: 0 }, takt = 2;   // 120 BPM: ein Takt = 2 s
  for (const art of Object.keys(U.ARTEN)) {
    const vor = q.map((s) => s.slice());
    const k = U.anwenden(q, RATE, [{ id: "e", art, takt: 0.5, schritte: 8, alle: 0, seed: 3 }], tempo);
    gleich(q[0], vor[0], `${art}: Quelle unverändert`);
    assert.equal(k[0].length, q[0].length);
    assert.ok(k.every((s) => s.every(Number.isFinite)), art);
    const a = 0.5 * takt * RATE, b = a + takt * 0.5 * RATE;
    for (let i = 0; i < a - 1; i += 101) assert.equal(k[0][i], q[0][i], `${art}: vor dem Bereich gleich`);
    for (let i = b + 1; i < k[0].length; i += 101) assert.equal(k[0][i], q[0][i], `${art}: nach dem Bereich gleich (${i})`);
    let diff = 0; for (let i = a; i < b; i++) diff += Math.abs(k[0][i] - q[0][i]);
    assert.ok(diff > 1, `${art}: wirkt`);
  }
});

test("Unterbrechungen: Stutter wiederholt das erste Stück, Tape-Stop endet leise, Muster wiederholt, aus wirkt nicht", () => {
  const q = klang(8), tempo = { bpm: 120, beginn: 0 }, st = (2 / 16) * RATE;
  const s = U.anwenden(q, RATE, [{ art: "stutter", takt: 1, schritte: 4, alle: 0, werte: { abfall: 0 } }], tempo)[0], a = 2 * RATE;
  for (let i = 100; i < st - 100; i += 37) assert.ok(Math.abs(s[a + st + i] - q[0][a + i]) < 1e-6, "zweites Stück = erstes");
  const t = U.anwenden(q, RATE, [{ art: "tapestop", takt: 1, schritte: 8, alle: 0 }], tempo)[0];
  let e = 0; for (let i = a + 0.9 * RATE; i < a + RATE; i++) e = Math.max(e, Math.abs(t[i]));
  assert.ok(e < 0.05, `Ende des Tape-Stops leise: ${e}`);
  const d = U.anwenden(q, RATE, [{ art: "dropout", takt: 0.5, schritte: 4, alle: 1, werte: { rest: 0 } }], tempo)[0];
  for (const takt of [0, 1, 2, 3]) { const m = Math.round((takt * 2 + 1.25) * RATE); assert.ok(Math.abs(d[m]) < 1e-9, `Takt ${takt + 1}: still`); }
  gleich(U.anwenden(q, RATE, [{ art: "dropout", takt: 0, schritte: 16, alle: 0, aus: true }], tempo)[0], q[0], "aus");
});

// ---------- Natur 0.1.0 (Flächen, Naturklänge) ----------
const { flaechenSpurRechnen } = await c("kern/erzeugen.js");

test("Natur: jede Familie und Variante klingt, bleibt endlich, ist reproduzierbar und eine Schleife ohne Naht", () => {
  const natur = ERZEUGER["natur@0.1.0"], R = 24000;   // halbe Rate: der Test bleibt schnell, die Rechnung ist dieselbe
  const bezug = { akkorde: [0, 1, 2, 3].map((t) => ({ beginn: t * 2, stufe: [1, 6, 4, 5][t] })), einsaetze: [0, 0.5, 1, 1.5, 2, 2.5], huelle: Float32Array.from({ length: 900 }, (_, i) => Math.abs(Math.sin(i / 20))), daten: [1, 4, 2, 8, 5] };
  for (const [k, st] of Object.entries(natur.stimmen)) {
    assert.ok(st.varianten.length >= 6, k);
    for (const v of st.varianten) {
      const q = { erzeuger: "natur@0.1.0", stimme: k, werte: v.werte, flaeche: true, anzahl: 4, bpm: 120, grundton: 2, leiter: "moll", seed: 4 };
      const [L, Rr] = flaechenSpurRechnen(q, R, bezug).kanaele;
      assert.equal(L.length, Math.round(8 * R), `${k} ${v.name}: Länge = 4 Takte`);
      let m = 0, e = 0; for (const x of L) { assert.ok(Number.isFinite(x), `${k} ${v.name}`); m = Math.max(m, Math.abs(x)); e += x * x; }
      assert.ok(m > 0.05 && m <= 0.61, `${k} ${v.name}: Spitze ${m}`);
      assert.ok(Math.sqrt(e / L.length) > 0.002, `${k} ${v.name}: nicht stumm`);
      // Naht: der Sprung über das Ende in den Anfang ist nicht grösser als die grössten Sprünge innerhalb der Spur
      let d = 0; for (let i = 1; i < L.length; i++) d = Math.max(d, Math.abs(L[i] - L[i - 1]));
      assert.ok(Math.abs(L[0] - L[L.length - 1]) <= d + 1e-6, `${k} ${v.name}: Naht`);
    }
  }
  const q = { erzeuger: "natur@0.1.0", stimme: "gezeiten", werte: {}, flaeche: true, anzahl: 2, bpm: 120, grundton: 2, leiter: "moll", seed: 9 };
  gleich(flaechenSpurRechnen(q, R, {}).kanaele[0], flaechenSpurRechnen(q, R, {}).kanaele[0], "gleicher Startwert, gleiche Fläche");
});

test("Natur: eine eigene Aufnahme ersetzt die synthetische Quelle; Pflanzen-Aufnahme wird verlangsamt", () => {
  const R = 24000, n = R * 2, ruf = Float32Array.from({ length: n }, (_, i) => Math.sin((2 * Math.PI * 300 * i) / R) * Math.sin((Math.PI * i) / n));
  const q = { erzeuger: "natur@0.1.0", stimme: "walchor", werte: { verwandlung: 20 }, flaeche: true, anzahl: 2, bpm: 120, grundton: 2, leiter: "moll", seed: 1 };
  const mit = flaechenSpurRechnen(q, R, { sample: { kanaele: [ruf], rate: R } }).kanaele[0], ohne = flaechenSpurRechnen(q, R, {}).kanaele[0];
  assert.ok(mit.some((x, i) => Math.abs(x - ohne[i]) > 1e-3), "anderes Material, anderer Klang");
  // Ultraschall: Impulse bei 192 kHz; 16-fach verlangsamt liegen sie im hörbaren Zeitraster
  const U = 192000, us = new Float32Array(U / 4); for (const p of [1000, 9000, 20000, 33000]) for (let i = 0; i < 40; i++) us[p + i] = Math.sin(i * 2.4) * (1 - i / 40);
  const pf = flaechenSpurRechnen({ ...q, stimme: "pflanzen", werte: { weg: "aufnahme", verlangsamen: 16 } }, R, { sample: { kanaele: [us], rate: U } }).kanaele[0];
  assert.ok(pf.some((x) => Math.abs(x) > 0.05), "Impulse regen die Resonatoren an");
});

// ---------- Synth 0.1.0, Sequenzen, Echo, Kammerton ----------
const { PATCHES } = await c("erzeuger/synth-0.1.0.js");
const { sequenzErzeugen, ROLLEN } = await c("kern/sequenzen.js");

test("Synth: 16 Presets in 8 Familien klingen, bleiben endlich, sind mono-verträglich und reproduzierbar", () => {
  const syn = ERZEUGER["synth@0.1.0"], R = 32000;
  assert.equal(Object.keys(PATCHES).length, 16); assert.equal(Object.keys(syn.stimmen).length, 8);
  for (const [fam, st] of Object.entries(syn.stimmen)) for (const k of st.parameter[0].wahl.map((o) => o.wert)) {
    const p = PATCHES[k], takte = sequenzErzeugen({ rolle: p.rolle, akkorde: [1, 6], kicks: [[0, 10]], anzahl: 2, seed: 2 });
    const q = { erzeuger: "synth@0.1.0", stimme: fam, werte: { patch: k }, takte, anzahl: 2, bpm: 110, grundton: 2, leiter: "dorisch", seed: 1 };
    const r = spurRechnen(q, R);
    let m = 0; for (const s of r.kanaele) for (const x of s) { assert.ok(Number.isFinite(x), `${p.name}`); m = Math.max(m, Math.abs(x)); }
    assert.ok(m > 0.3 && m <= 0.51, `${p.name}: Spitze ${m}`);
    const me = messen(r.kanaele, R);
    assert.ok(me.korrelation > 0.25, `${p.name}: Korrelation ${me.korrelation}`);
    assert.ok(me.baender.unter120 < 0.5, `${p.name}: kein Gleichanteil/Rumpeln (${me.baender.unter120})`);
    gleich(spurRechnen(q, R).kanaele[0], r.kanaele[0], `${p.name}: reproduzierbar`);
  }
});

test("Synth: Akkorde in der Notenzeile, polyphon gegen einstimmig, Legato bei Slide", async () => {
  const n = L.notenLesen(["1+3+5! - . 5,~"], { bpm: 120, anzahl: 1, leiter: "moll" });
  assert.deepEqual(n.map((x) => [x.halbtoene, x.staerke, x.gruppe]), [[0, 1, 1], [3, 1, 1], [7, 1, 1], [-5, 0.8, 2]]);
  assert.equal(n[0].dauer, 1); assert.ok(n[3].gleiten);
  const syn = ERZEUGER["synth@0.1.0"].stimmen;
  assert.equal(syn.shadow.poly({ patch: "shadowChord" }), true); assert.equal(syn.goa.poly({ patch: "spiralAcid" }), false);
  // Legato: beim Slide setzt die Hüllkurve nicht neu an, sie beginnt auf dem Haltepegel
  const { _huellkurve } = await c("erzeuger/synth-0.1.0.js"), h = PATCHES.spiralAcid.amp;
  assert.equal(_huellkurve(h, 32000, 0.2)[0], 0); assert.equal(_huellkurve(h, 32000, 0.2, { legato: true })[0], h.s);
});

test("Sequenzen: jede Rolle ergibt lesbare Takte; Kammerton verschiebt die Stimmung", () => {
  for (const r of ROLLEN) {
    const z = sequenzErzeugen({ rolle: r.key, akkorde: [1, 4, 6, 5], kicks: [[0, 7, 10]], anzahl: 8, seed: 3, halftime: r.key === "pad" });
    if (r.key === "schwebe") assert.ok([3, 5, 7].includes(z.length)); else assert.equal(z.length, 8);
    const n = L.notenLesen(z, { bpm: 100, anzahl: 8, leiter: "phrygisch" });
    assert.ok(n.length >= 4 && n.every((x) => Number.isFinite(x.halbtoene)), r.key);
  }
  assert.ok(Math.abs(L.grundFrequenz(9, 440) / L.grundFrequenz(9) - 440 / 432) < 1e-12);
});

test("Echo: Anteil 0 unverändert, sonst eine Wiederholung nach der eingestellten Zeit", () => {
  const def = PLUGINS["echo@0.1.0"], n = RATE, imp = [new Float32Array(n), new Float32Array(n)]; imp[0][0] = imp[1][0] = 1;
  const lauf = (werte, k) => { const i = def.erzeuge(RATE); i.setze(bereinigeWerte(def, werte)); for (let o = 0; o < n; o += BLOCK) i.prozess([k[0].subarray(o), k[1].subarray(o)], Math.min(BLOCK, n - o)); return k; };
  const q = klang(1), k0 = lauf({ anteil: 0 }, q.map((x) => Float32Array.from(x))); gleich(k0[0], q[0], "Anteil 0");
  const k = lauf({ anteil: 100, zeit: 250, pingpong: 0, dunkel: 16000, duenn: 20 }, imp.map((x) => Float32Array.from(x)));
  let m = 0, wo = 0; for (let i = 100; i < n; i++) if (Math.abs(k[0][i]) > m) { m = Math.abs(k[0][i]); wo = i; }
  assert.ok(Math.abs(wo / RATE - 0.25) < 0.01, `erste Wiederholung bei ${(wo / RATE).toFixed(3)} s`);
});

// ---------- Composer 0.2: Zyklus, Schwebe, Knarzen, Wirbel, Wumm, Glanz, Natur 0.2.0, Arrangement 0.2.0 ----------
const A = await c("kern/arrangement.js");

test("Arrangement 0.2: Abschnitte füllen die Länge, wer sich verliert, findet sich wieder, gemeinsames Stocken", () => {
  for (const [s, b] of [[60, 100], [90, 90], [90, 174], [120, 124], [180, 72]]) for (let seed = 1; seed <= 6; seed++) {
    const { takte, abschnitte } = A.abschnitte(s, b, { seed });
    assert.equal(takte % 4, 0); assert.equal(abschnitte.at(-1).bis, takte); assert.equal(abschnitte[0].typ, "intro"); assert.equal(abschnitte.at(-1).typ, "outro");
    for (let i = 1; i < abschnitte.length; i++) assert.equal(abschnitte[i].von, abschnitte[i - 1].bis);
    const typen = abschnitte.map((a) => a.typ);
    if (typen.includes("verlieren")) assert.ok(typen.indexOf("wiederfinden") > typen.indexOf("verlieren"), `${s}/${b}/${seed}: ${typen}`);
    for (const f of ["kick", "backbeat", "oben", "perkussion", "bass", "pad", "melodie", "natur", "fremd"]) for (const e of A.ereignisseFuer(f, abschnitte, { seed, takte })) {
      assert.ok(U.ARTEN[e.art], e.art); assert.ok(e.takt >= 0 && e.takt < takte); assert.ok(e.arr);
    }
  }
  const { takte, abschnitte } = A.abschnitte(90, 90, { seed: 1 });
  if (abschnitte.some((a) => a.typ === "stocken")) {
    const loecher = (f) => A.ereignisseFuer(f, abschnitte, { seed: 1, takte }).filter((e) => e.art === "dropout" && e.schritte <= 8).map((e) => e.takt).join();
    assert.equal(loecher("bass"), loecher("pad"), "alle stocken an denselben Stellen");
  }
});

test("Unterbrechungen 0.2: Knarzen, Wirbel und Wumm wirken nur in ihrem Bereich; Wumm fügt tiefe Energie hinzu", () => {
  const q = klang(4), tempo = { bpm: 120, beginn: 0 };
  for (const art of ["knarz", "wirbel", "wumm"]) {
    const k = U.anwenden(q, RATE, [{ art, takt: 0.5, schritte: 16, alle: 0, seed: 5 }], tempo);
    assert.ok(k.every((s) => s.every(Number.isFinite)), art);
    for (let i = 0; i < RATE - 1; i += 97) assert.equal(k[0][i], q[0][i], `${art}: vorher gleich`);
    for (let i = 3 * RATE + 1; i < k[0].length; i += 97) assert.equal(k[0][i], q[0][i], `${art}: nachher gleich`);
  }
  const still = [new Float32Array(RATE * 2), new Float32Array(RATE * 2)];
  const w = U.anwenden(still, RATE, [{ art: "wumm", takt: 0, schritte: 16, alle: 0 }], tempo);
  assert.ok(messen(w, RATE).baender.unter120 > 0.8, "Wumm ist tief");
});

test("Glanz: Grundstellung unverändert, sonst mehr Energie über der Frequenz", () => {
  const def = PLUGINS["glanz@0.1.0"], q = klang(1);
  const lauf = (werte) => { const k = q.map((x) => Float32Array.from(x)), i = def.erzeuge(RATE); i.setze(bereinigeWerte(def, werte)); for (let o = 0; o < k[0].length; o += BLOCK) i.prozess([k[0].subarray(o), k[1].subarray(o)], Math.min(BLOCK, k[0].length - o)); return k; };
  gleich(lauf({})[0], q[0], "Grundstellung");
  assert.ok(messen(lauf({ menge: 100, luft: 6 }), RATE).baender.ueber2k > messen(q, RATE).baender.ueber2k);
});

test("Natur 0.2.0: Regen, Feuer, Insekten klingen und sind Schleifen; die Familien aus 0.1.0 klingen wie in 0.1.0", () => {
  const R = 24000, n2 = ERZEUGER["natur@0.2.0"];
  for (const k of ["regen", "feuer", "insekten"]) for (const v of n2.stimmen[k].varianten) {
    const [L0] = flaechenSpurRechnen({ erzeuger: "natur@0.2.0", stimme: k, werte: v.werte, flaeche: true, anzahl: 2, bpm: 120, grundton: 2, leiter: "moll", seed: 2 }, R, {}).kanaele;
    let m = 0, e = 0; for (const x of L0) { assert.ok(Number.isFinite(x), `${k} ${v.name}`); m = Math.max(m, Math.abs(x)); e += x * x; }
    assert.ok(m <= 0.61 && Math.sqrt(e / L0.length) > 0.005, `${k} ${v.name}: Spitze ${m}`);
  }
  const q = { stimme: "gezeiten", werte: {}, flaeche: true, anzahl: 2, bpm: 120, grundton: 2, leiter: "moll", seed: 3 };
  gleich(flaechenSpurRechnen({ ...q, erzeuger: "natur@0.2.0" }, R, {}).kanaele[0], flaechenSpurRechnen({ ...q, erzeuger: "natur@0.1.0" }, R, {}).kanaele[0], "Gezeiten 0.2.0 = 0.1.0");
});

test("Ornament Style: zuoberst, Pop und ECM ausgeblendet, Perkussion wechselt je Abschnitt", () => {
  assert.equal(STILE[0].key, "ornament");
  assert.ok(STILE.find((s) => s.key === "pop").versteckt && STILE.find((s) => s.key === "ecm").versteckt);
  const { abschnitte } = A.abschnitte(90, 174, { seed: 2 }), stimmen = A.BESETZUNG.ornament.wechsel, w = A.wechselPerkussion(stimmen, abschnitte, { seed: 2 });
  for (const a of abschnitte) {
    const still = stimmen.filter((s) => w.get(s).some((e) => e.takt === a.von));
    const spielen = stimmen.length - still.length;
    assert.ok(spielen >= 1 && spielen <= 2, `${a.name}: ${spielen} Perkussionsstimmen`);
  }
});
