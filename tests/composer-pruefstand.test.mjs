// Prüfstand des Composers (tools/composer-pruefstand.mjs): die Messungen an künstlichen Signalen mit bekannten Fehlern, der Vergleich
// mit der Basis und die Zahlen aus dem Projekt. Den ganzen Lauf durch die App prüft man mit dem Werkzeug selbst (braucht Playwright).
import { test } from "node:test";
import assert from "node:assert/strict";
import { knackser, clipping, loecher, vergleichen, arrangementZahlen, wavLesen } from "../tools/composer-pruefstand.mjs";

const RATE = 48000;
/** zwei Sekunden: leiser Sinus, alle 0,5 s ein Anschlag (Rauschen, das abklingt) – so etwas darf nie als Knackser gelten */
function musik() {
  const n = RATE * 2, l = new Float32Array(n);
  let z = 7; const rausch = () => { z = (z * 16807) % 2147483647; return z / 2147483647 - 0.5; };
  for (let i = 0; i < n; i++) l[i] = 0.2 * Math.sin((2 * Math.PI * 110 * i) / RATE);
  for (let t = 0.25; t < 2; t += 0.5) for (let i = 0; i < RATE * 0.08; i++) l[Math.round(t * RATE) + i] += 0.6 * rausch() * Math.exp(-i / (RATE * 0.015));
  return [l, Float32Array.from(l)];
}

test("Knackser: ein eingebauter Sprung wird gefunden, Anschläge nicht", () => {
  const k = musik();
  assert.deepEqual(knackser(k, RATE), [], "Anschläge sind keine Knackser");
  const i = Math.round(1.1 * RATE); k[0][i] += 0.7; k[0][i + 1] -= 0.6;
  const t = knackser(k, RATE);
  assert.equal(t.length, 1); assert.ok(Math.abs(t[0].zeit - 1.1) < 0.002, `bei ${t[0].zeit} s`);
});

test("Clipping und Löcher", () => {
  const k = musik(), a = Math.round(0.6 * RATE);
  for (let i = 0; i < 40; i++) k[0][a + i] = 1;
  assert.deepEqual(clipping(k, RATE).map((x) => x.zeit), [0.6]);
  const b = Math.round(1.3 * RATE); for (const s of k) s.fill(0, b, b + Math.round(0.12 * RATE));
  const l = loecher(k, RATE);
  assert.equal(l.length, 1); assert.ok(Math.abs(l[0].von - 1.3) <= 0.01 && Math.abs(l[0].bis - 1.42) <= 0.01, JSON.stringify(l));
  // Stille am Anfang und am Ende ist kein Loch
  const s = musik(); for (const c of s) { c.fill(0, 0, RATE * 0.3); c.fill(0, RATE * 1.7); }
  assert.deepEqual(loecher(s, RATE), []);
});

test("Vergleich: nur Neues und Schlechteres wird gemeldet", () => {
  const alt = { lufs: -14, tp: -1, lra: 6, unter120: 60, mitten: 30, ueber2k: 10, knackser: [{ zeit: 3.2 }], clipping: [], loecher: [], dropouts: 30, stilleTakte: 90, spuren: 9, rechenzeit: 30 };
  assert.deepEqual(vergleichen({ ...alt }, alt), { schlechter: [], anders: [] }, "gleicher Stand");
  const neu = { ...alt, tp: -0.5, knackser: [{ zeit: 3.205 }, { zeit: 10.4 }], loecher: [{ von: 5, bis: 5.2 }], dropouts: 33, rechenzeit: 50 };
  const v = vergleichen(neu, alt);
  assert.equal(v.schlechter.length, 5, v.schlechter.join(" | "));
  assert.match(v.schlechter.join(" "), /1 neue Knackser: 10\.40 s/);
  assert.deepEqual(vergleichen({ ...alt, dropouts: 25 }, alt).anders, ["Dropouts 30 → 25"], "weniger Dropouts ist keine Verschlechterung");
  assert.deepEqual(vergleichen(alt, undefined).anders, ["keine Basis für diesen Stil"]);
});

test("Arrangement-Zahlen aus dem Projekt", () => {
  const p = { abschnitte: [{ name: "Intro", von: 0, bis: 4 }, { name: "Hauptteil", von: 4, bis: 12 }], spuren: [
    { ereignisse: [{ art: "dropout", takt: 0, schritte: 64, werte: { rest: 0 } }, { art: "dropout", takt: 7.5, schritte: 8, werte: { rest: 0 } }] },
    { ereignisse: [{ art: "dropout", takt: 2, schritte: 16, werte: { rest: 0.5 } }, { art: "filter", takt: 3, schritte: 16 }] }] };
  assert.deepEqual(arrangementZahlen(p), { spuren: 2, takte: 12, dropouts: 2, stilleTakte: 4, abschnitte: "Intro → Hauptteil" });
});

test("WAV lesen: 24 Bit", () => {
  const n = 4, b = new Uint8Array(44 + n * 6), d = new DataView(b.buffer), w = (o, s) => [...s].forEach((c, i) => (b[o + i] = c.charCodeAt(0)));
  w(0, "RIFF"); d.setUint32(4, 36 + n * 6, true); w(8, "WAVE"); w(12, "fmt "); d.setUint32(16, 16, true); d.setUint16(20, 1, true); d.setUint16(22, 2, true);
  d.setUint32(24, RATE, true); d.setUint32(28, RATE * 6, true); d.setUint16(32, 6, true); d.setUint16(34, 24, true); w(36, "data"); d.setUint32(40, n * 6, true);
  const werte = [0, 0.5, -0.5, -1];
  werte.forEach((v, i) => { const x = Math.max(-8388608, Math.round(v * 8388608)) & 0xffffff; for (const c of [0, 1]) { const o = 44 + (i * 2 + c) * 3; b[o] = x & 255; b[o + 1] = (x >> 8) & 255; b[o + 2] = (x >> 16) & 255; } });
  const r = wavLesen(b);
  assert.equal(r.rate, RATE); assert.deepEqual([...r.kanaele[1]], werte);
});
