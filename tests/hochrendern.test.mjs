// Hochrendern (alpha/hochrendern/) und das Werkzeug tools/hochrendern/ – ohne Browser: die Gewichte (Aufbau, Grösse, Umordnung für den Shader) und
// die Seite (Alpha, alles lokal, gleiche Marken). Die Rechnung selbst prüfen tests/hochrendern.e2e.mjs (WebGPU) und der Vergleich mit onnxruntime
// beim Bau (64 dB, siehe .claude/skills/video-hochrendern/SKILL.md).
//   node --test tests/hochrendern.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";

const root = new URL("../", import.meta.url);
const P = new URL("alpha/hochrendern/", root);
const lies = (p) => readFileSync(new URL(p, P), "utf8");
const { gewichteLesen, umordnen } = await import(new URL("netz.js", P).href);

test("Gewichte: zwei Modelle, je Faltung 3 × 3, PReLU dazwischen, zuletzt 48 Kanäle (PixelShuffle ×4)", () => {
  for (const [name, faltungen] of [["realesr-animevideov3", 18], ["realesr-general-x4v3", 34]]) {
    const datei = new URL(`modelle/${name}.bin`, P), b = readFileSync(datei);
    const s = gewichteLesen(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
    assert.equal(s.length, faltungen, `${name}: ${faltungen} Faltungen`);
    assert.deepEqual([s[0].cin, s[0].cout], [3, 64], `${name}: aus RGB 64 Kanäle`);
    assert.ok(s.slice(1, -1).every((x) => x.cin === 64 && x.cout === 64 && x.prelu), `${name}: dazwischen 64 → 64 mit PReLU`);
    assert.deepEqual([s.at(-1).cin, s.at(-1).cout, s.at(-1).prelu], [64, 48, false], `${name}: zuletzt 48 Kanäle ohne PReLU`);
    assert.ok(s.every((x) => x.w.every(Number.isFinite) && x.b.every(Number.isFinite)), `${name}: lauter Zahlen`);
    assert.ok(statSync(datei).size < 3e6, `${name}: klein (float16)`);
  }
});

test("Gewichte: die Umordnung für den Shader – [(3 · ky + kx) · CIN + ci] · cout + co, CIN auf Vielfache von 4", () => {
  const cin = 3, cout = 4, w = Float32Array.from({ length: cout * cin * 9 }, (_, i) => i + 1);
  const u = umordnen({ cin, cout, w });
  assert.equal(u.length, 9 * 4 * cout);
  for (let co = 0; co < cout; co++) for (let ci = 0; ci < 4; ci++) for (let k = 0; k < 9; k++)
    assert.equal(u[(k * 4 + ci) * cout + co], ci < cin ? w[(co * cin + ci) * 9 + k] : 0);
  assert.throws(() => gewichteLesen(new ArrayBuffer(16)), /keine Gewichte/);
});

test("Seite: Alpha (noindex), nichts von aussen, eigene Module mit einer Marke, das Netz in WebGPU, Real-ESRGAN genannt", () => {
  const html = lies("index.html");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<title>Hochrendern – Ornament Cloud · Alpha<\/title>/);
  assert.ok(!/<script[^>]+src="https?:/.test(html), "keine Skripte von aussen");
  assert.match(html, /data-modell="grafik"[\s\S]*data-modell="foto"/, "Grafik oder Film");
  assert.match(html, /data-faktor="2"[\s\S]*data-faktor="4"/, "×2 oder ×4");
  assert.match(html, /id="datei"[^>]*accept="video\/\*/, "eine Videodatei");
  assert.match(html, /id="probe"[\s\S]*id="los"[\s\S]*id="abbrechen"/, "Probe, Hochrendern, Abbrechen");
  assert.match(html, /Real-ESRGAN[^<]*BSD-3/, "das Netz und seine Lizenz");
  assert.match(html, /<script type="module" src="app\.js\?v=(\d+)"><\/script>/);
  const marken = new Set([html.match(/app\.js(\?v=\d+)/)[1]]);
  for (const f of readdirSync(P).filter((f) => f.endsWith(".js"))) {
    const js = lies(f);
    for (const m of js.matchAll(/"\.\/([a-z-]+\.js)(\?v=\d+)?"/g)) { assert.ok(m[2], `${f}: ${m[1]} mit Marke`); marken.add(m[2]); }
    assert.ok(!/https?:\/\//.test(js.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")), `${f}: keine Adressen von aussen`);
    // aus PHORMA III dieselbe Marke wie dort (sonst lädt der Browser die Module zweimal)
    const phorma = lies("../phorma-iii/app.js").match(/"\.\/film\.js(\?v=\d+)"/)[1];
    for (const m of js.matchAll(/"\.\.\/phorma-iii\/[a-z-]+\.js(\?v=\d+)"/g)) assert.equal(m[1], phorma, `${f}: PHORMA III mit ihrer Marke`);
  }
  assert.equal(marken.size, 1, `eine Marke für alle eigenen Module (${[...marken]})`);
  assert.match(lies("netz.js"), /@compute @workgroup_size\(8, 8, 1\)/, "WebGPU-Shader");
});

test("Werkzeug: tools/hochrendern (CPU) und der Export der Gewichte für die Seite; der Skill nennt beides", () => {
  for (const f of ["hochrendern", "hochrendern.py", "requirements.txt", "web-gewichte.py"]) assert.ok(existsSync(new URL(`tools/hochrendern/${f}`, root)), f);
  const py = readFileSync(new URL("tools/hochrendern/hochrendern.py", root), "utf8");
  assert.match(py, /realesr-animevideov3", "b8a8376811077954d82ca3fcf476f1ac3da3e8a68a4f4d71363008000a18b75d"/, "Prüfsumme der Gewichte");
  const skill = readFileSync(new URL(".claude/skills/video-hochrendern/SKILL.md", root), "utf8");
  for (const s of ["tools/hochrendern/hochrendern", "alpha/hochrendern/", "--scale=2", "PHORMA III"]) assert.ok(skill.includes(s), `Skill nennt ${s}`);
});
