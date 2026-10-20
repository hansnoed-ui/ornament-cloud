// Das Musikstück für die Beispielvideos aus PHORMA III (tools/beispielton.mjs): eine gültige WAV, wiederholbar, ausgesteuert, mit Ausklang.
//   node --test tests/beispielton.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { beispielton } from "../tools/beispielton.mjs";

test("beispielton: WAV mit Kopf, 44,1 kHz mono 16 Bit, der Dauer entsprechend", () => {
  const b = beispielton({ dauer: 3 });
  assert.equal(b.toString("latin1", 0, 4), "RIFF"); assert.equal(b.toString("latin1", 8, 12), "WAVE");
  assert.equal(b.readUInt16LE(22), 1, "mono"); assert.equal(b.readUInt32LE(24), 44100); assert.equal(b.readUInt16LE(34), 16);
  assert.equal(b.readUInt32LE(40), 3 * 44100 * 2, "Datenlänge"); assert.equal(b.length, 44 + 3 * 44100 * 2);
});

test("beispielton: wiederholbar, ausgesteuert, Schläge im Takt, am Ende Stille", () => {
  const a = beispielton({ dauer: 4 }), b = beispielton({ dauer: 4 });
  assert.ok(a.equals(b), "zweimal dasselbe");
  const probe = (von, bis) => { let s = 0, n = 0; for (let i = Math.round(von * 44100); i < Math.round(bis * 44100); i++) { const v = a.readInt16LE(44 + i * 2) / 32768; s += v * v; n++; } return Math.sqrt(s / n); };
  let spitze = 0; for (let i = 0; i < 4 * 44100; i++) spitze = Math.max(spitze, Math.abs(a.readInt16LE(44 + i * 2)));
  assert.ok(spitze > 20000 && spitze <= 32767, `ausgesteuert (${spitze})`);
  const schlag = 60 / 112;
  assert.ok(probe(schlag, schlag + 0.05) > probe(schlag - 0.1, schlag - 0.05) * 1.3, "die Bassdrum auf dem zweiten Schlag ist lauter als kurz davor");
  assert.ok(probe(3.95, 4) < probe(1, 2) * 0.3, "Ausklang am Ende");
});
