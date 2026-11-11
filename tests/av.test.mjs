// ORNAMENT AV STUDIO (alpha/av/): Steuersignale und Partitur ohne Browser.
//   node --test tests/av.test.mjs
import test from "node:test";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const imp = (p) => import(new URL(p, root).href);
const S = await imp("alpha/av/kern/steuerung.js");
const { FAMILIEN, stapelBei } = await imp("alpha/av/kern/partitur.js");
const { EFFEKTE } = await imp("animations/effekte.js");

const RATE = 48000;
/** ein künstlicher Export: Kick auf jeder Viertel (120 BPM), Bass als langer Ton, ein Stutter in Takt 3 */
function export_() {
  const sek = 8, n = RATE * sek, kick = [new Float32Array(n), new Float32Array(n)], bass = [new Float32Array(n), new Float32Array(n)];
  for (let b = 0; b < 16; b++) { const a = Math.round(b * 0.5 * RATE); for (let i = 0; i < RATE * 0.12 && a + i < n; i++) { const v = Math.sin((2 * Math.PI * 60 * i) / RATE) * Math.exp(-i / (RATE * 0.04)); kick[0][a + i] = kick[1][a + i] = v; } }
  for (let i = 0; i < n; i++) bass[0][i] = bass[1][i] = 0.3 * Math.sin((2 * Math.PI * 45 * i) / RATE) * (i > RATE * 4 ? 1 : 0.2);
  const summe = [kick[0].map((v, i) => v + bass[0][i]), kick[1].map((v, i) => v + bass[1][i])];
  const projekt = { tempo: { bpm: 120, beginn: 0 }, abschnitte: [{ typ: "intro", name: "Intro", von: 0, bis: 2 }, { typ: "haupt", name: "Hauptteil", von: 2, bis: 4 }],
    spuren: [{ name: "Kick", quelle: { erzeuger: "drums@0.1.0", stimme: "kick" }, ereignisse: [{ art: "stutter", takt: 2, schritte: 4, alle: 0, werte: { teilung: 16 } }, { art: "dropout", takt: 3, schritte: 64, alle: 0 }] },
      { name: "Bass · Reese", quelle: { erzeuger: "bass@0.1.0", stimme: "reese", leiter: "moll" } }] };
  return { projekt, summe, rate: RATE, stems: new Map([["kick", kick], ["bass-reese", bass]]) };
}

test("Steuerung: Gruppen, Einsätze der Kick genau auf den Vierteln, Abschnitte und Bildbrüche aus dem Projekt", () => {
  const s = S.signaleAus(export_(), 30);
  assert.equal(s.n, 240); assert.deepEqual(s.spuren.map((x) => x.gruppe), ["kick", "bass"]);
  assert.ok(s.einsaetze.kick.length >= 14 && s.einsaetze.kick.length <= 16, `${s.einsaetze.kick.length} Einsätze`);
  for (const t of s.einsaetze.kick) { const abw = Math.abs(t - Math.round(t * 2) / 2); assert.ok(abw <= 1 / 30 + 1e-9, `Einsatz ${t} liegt höchstens ein Filmbild neben der Viertel`); }
  assert.ok(S.wert(s.huelle.bass, 6, 30) > S.wert(s.huelle.bass, 1, 30) * 2, "Bass lauter ab 4 s");
  assert.deepEqual(s.abschnitte.map((a) => [a.a, a.b]), [[0, 4], [4, 8]]);
  assert.deepEqual(s.brueche.map((b) => b.art), ["stutter"], "das lange Dropout ist kein Bildbruch");
});

test("Bildzeit: Stutter wiederholt, Tape-Stop bremst stetig, Rückwärts läuft zurück, sonst die Musikzeit", () => {
  const takt = 2, br = [{ art: "stutter", a: 4, b: 4.5, werte: { teilung: 16 }, takt }, { art: "tapestop", a: 6, b: 7, werte: { kurve: 1 }, takt }, { art: "rueckwaerts", a: 8, b: 9, werte: {}, takt }];
  assert.equal(S.bildzeit(3, br).t, 3);
  assert.ok(Math.abs(S.bildzeit(4.13, br).t - 4.005) < 1e-9, "Stutter: 4,13 → 4,005");
  let alt = 6; for (let t = 6; t < 7; t += 0.05) { const b = S.bildzeit(t, br).t; assert.ok(b >= alt - 1e-12, "Tape-Stop läuft nie zurück"); alt = b; }
  assert.ok(S.bildzeit(6.99, br).t - S.bildzeit(6.98, br).t < 0.001, "am Ende fast stehend");
  assert.ok(Math.abs(S.bildzeit(8.25, br).t - 8.75) < 1e-9, "rückwärts");
});

test("Partitur 0.2: Szenen nutzen nur vorhandene Effekte und Regler, jede Familie deckt alle Abschnitte, Werte in 0–1, Überblendung", async () => {
  const { SZENEN, szeneBei } = await imp("alpha/av/kern/partitur.js");
  for (const [k, sz] of Object.entries(SZENEN)) {
    for (const e of sz.ebenen) { assert.ok(EFFEKTE[e.effekt], `${k}: ${e.effekt}`); for (const r of Object.keys(e.werte)) assert.ok(Number(r) < EFFEKTE[e.effekt].regler.length, `${k}: Regler ${r}`); }
    for (const z of sz.zuordnungen) assert.ok(z.ziel === "deck" || z.ziel < EFFEKTE[sz.ebenen[z.ebene].effekt].regler.length, `${k}: Zuordnung ${z.ziel}`);
  }
  const effekte = new Set(Object.values(SZENEN).flatMap((s) => s.ebenen.map((e) => e.effekt)));
  assert.ok(effekte.size >= 15, `${effekte.size} verschiedene Effekte in den Szenen`);
  const s = S.signaleAus(export_(), 30);
  for (const [k, f] of Object.entries(FAMILIEN)) {
    for (const typ of ["intro", "aufbau", "haupt", "gas", "stocken", "atmen", "verlieren", "wiederfinden", "outro"]) for (const n of f.folge[typ]) assert.ok(SZENEN[n], `${k}/${typ}: ${n}`);
    for (let t = 0; t < 8; t += 0.1) {
      const r = stapelBei(t, f, s, { materialien: 3 });
      for (const st of [r.stapel, r.vorher?.stapel].filter(Boolean)) { assert.match(st.bild, /^material[0-2]$/); for (const e of st.ebenen) { assert.ok(e.deckkraft >= 0 && e.deckkraft <= 1); for (const w of e.werte) assert.ok(w >= 0 && w <= 1, `${k} ${e.effekt} ${t}: ${w}`); } }
      if (r.vorher) assert.ok(r.vorher.gewicht > 0 && r.vorher.gewicht <= 1);
    }
  }
  assert.ok(szeneBei(1, FAMILIEN.organisch, s).name === "klar" && szeneBei(5, FAMILIEN.organisch, s).name !== undefined);
});

test("Register: alle 23 Effekte von /animations mit Reglern und stabilem Fingerabdruck", async () => {
  const R = await imp("alpha/av/kern/register.js");
  assert.equal(R.REGISTER.length, 23);
  for (const e of R.REGISTER) { assert.match(e.fingerabdruck, /^[0-9a-f]{8}$/); assert.ok(e.regler.length >= 3, e.id); }
  assert.deepEqual(R.abweichungen({ bild: R.fingerabdruck("bild") }), []);
  assert.equal(R.abweichungen({ bild: "00000000" }).length, 1);
});
