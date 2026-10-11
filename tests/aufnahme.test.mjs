// «Aufnahme» (alpha/aufnahme/, seit 11. Oktober 2026): Rechnen mit Ausschnitt und Videogrösse, Aufbau der Seite.
//   node --test tests/aufnahme.test.mjs
// Im Browser (Freigabe, Ziehen, Aufnahme auf beiden Wegen): NODE_PATH=$(npm root -g) node tests/aufnahme.e2e.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { FORMATE, MIN, MAX_KANTE, einpassen, umformen, aufziehen, verschieben, ganz, ausgabe, bitrate, dateiname, formate, dauerText, KANDIDATEN } from "../alpha/aufnahme/rahmen.js";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");
const nah = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const imFeld = (r, b, h) => r.x >= -1e-9 && r.y >= -1e-9 && r.x + r.w <= b + 1e-9 && r.y + r.h <= h + 1e-9;

test("einpassen: grösstes Rechteck mit dem Verhältnis, in der Mitte; ohne Verhältnis das ganze Feld", () => {
  assert.deepEqual(einpassen(1920, 1080, null), { x: 0, y: 0, w: 1920, h: 1080 });
  const r = einpassen(1920, 1080, FORMATE["9:16"]);
  assert.ok(nah(r.h, 1080) && nah(r.w, 607.5) && nah(r.x, (1920 - 607.5) / 2) && r.y === 0);
  const q = einpassen(1080, 1920, 1);
  assert.ok(nah(q.w, 1080) && nah(q.h, 1080) && nah(q.y, 420));
  // um einen Punkt am Rand: bleibt im Feld
  assert.ok(imFeld(einpassen(1920, 1080, 1, 10, 10), 1920, 1080));
});

test("umformen: neues Verhältnis innerhalb des bisherigen Ausschnitts, gleiche Mitte", () => {
  const r = umformen({ x: 100, y: 100, w: 800, h: 400 }, 1920, 1080, 1);
  assert.deepEqual(r, { x: 300, y: 100, w: 400, h: 400 });
  assert.deepEqual(umformen({ x: 1800, y: 0, w: 400, h: 100 }, 1920, 1080, null), { x: 1520, y: 0, w: 400, h: 100 }, "frei: nur ins Feld schieben");
});

test("aufziehen: in alle vier Richtungen, mit Verhältnis, nie über den Rand, nie kleiner als MIN", () => {
  const v = 16 / 9;
  for (const [px, py] of [[900, 700], [100, 700], [900, 50], [100, 50]]) {
    const r = aufziehen(500, 400, px, py, 1920, 1080, v);
    assert.ok(imFeld(r, 1920, 1080), JSON.stringify(r));
    assert.ok(nah(r.w / r.h, v, 1e-9), `Verhältnis ${r.w / r.h}`);
    // die feste Ecke ist der Ankerpunkt
    assert.ok([r.x, r.x + r.w].some((x) => nah(x, 500)) && [r.y, r.y + r.h].some((y) => nah(y, 400)));
  }
  // zum Rand hin begrenzt: Anker nahe am rechten Rand, Zug weit nach rechts unten
  const eng = aufziehen(1800, 100, 5000, 5000, 1920, 1080, 1);
  assert.ok(nah(eng.w, 120) && nah(eng.h, 120) && imFeld(eng, 1920, 1080));
  // frei: genau bis zum Zeiger
  assert.deepEqual(aufziehen(100, 100, 300, 250, 1920, 1080, null), { x: 100, y: 100, w: 200, h: 150 });
  // ein winziger Zug ergibt die kleinste Grösse
  const klein = aufziehen(100, 100, 101, 101, 1920, 1080, null);
  assert.equal(klein.w, MIN); assert.equal(klein.h, MIN);
});

test("verschieben und ganz: bleibt im Feld, ganze Pixel", () => {
  assert.deepEqual(verschieben({ x: -50, y: 2000, w: 100, h: 100 }, 1920, 1080), { x: 0, y: 980, w: 100, h: 100 });
  assert.deepEqual(ganz({ x: 10.4, y: 9.6, w: 607.5, h: 1080 }, 1920, 1080), { x: 10, y: 10, w: 608, h: 1070 });
});

test("ausgabe: kurze Seite wie gewählt, genaues Verhältnis bei festem Format, gerade Zahlen, höchstens 3840", () => {
  assert.deepEqual(ausgabe(608, 1080, "1080", FORMATE["9:16"]), { w: 1080, h: 1920 }, "9 : 16 → 1080 × 1920, nicht 1080 × 1918");
  assert.deepEqual(ausgabe(1920, 1080, "720", FORMATE["16:9"]), { w: 1280, h: 720 });
  assert.deepEqual(ausgabe(1000, 1000, "original", 1), { w: 1000, h: 1000 });
  assert.deepEqual(ausgabe(333, 201, "original"), { w: 334, h: 202 }, "gerade Zahlen für H.264");
  const gross = ausgabe(3000, 1000, "2160");
  assert.equal(gross.w, MAX_KANTE, "längste Kante begrenzt");
  assert.ok(gross.w % 2 === 0 && gross.h % 2 === 0);
  assert.deepEqual(ausgabe(400, 300, "1080"), { w: 1440, h: 1080 }, "kleine Ausschnitte werden hochgerechnet");
});

test("bitrate: zwischen 4 und 40 Mbit/s, wächst mit Grösse und Bildrate", () => {
  assert.equal(bitrate(100, 100, 30), 4e6);
  assert.equal(bitrate(3840, 2160, 60), 40e6);
  assert.ok(bitrate(1080, 1920, 60) > bitrate(1080, 1920, 30));
});

test("formate: MP4 (H.264) vor WebM, je Name eine Fassung, ohne doppelte allgemeine Einträge", () => {
  const alle = formate(() => true).map((f) => f.name);
  assert.deepEqual(alle, ["MP4 (H.264)", "WebM (VP9)", "WebM (VP8)"]);
  assert.deepEqual(formate((t) => t.startsWith("video/webm")).map((f) => f.typ), ["video/webm;codecs=vp9", "video/webm;codecs=vp8"]);
  assert.deepEqual(formate((t) => t === "video/mp4" || t === "video/webm").map((f) => f.name), ["MP4", "WebM"], "nur allgemeine Typen");
  assert.deepEqual(formate(() => false), []);
  for (const k of KANDIDATEN) assert.ok(k.typ.startsWith(`video/${k.endung}`), k.typ);
});

test("dateiname und dauerText", () => {
  assert.equal(dateiname(new Date(2026, 9, 11, 9, 5), "mp4"), "aufnahme-2026-10-11-0905.mp4");
  assert.equal(dauerText(0), "0:00");
  assert.equal(dauerText(7900), "0:07");
  assert.equal(dauerText(83000), "1:23");
});

test("Seite: Alpha (noindex, nicht in der Sitemap), in der Übersicht, alles vom eigenen Server", () => {
  const html = lies("alpha/aufnahme/index.html");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.ok(!lies("sitemap.xml").includes("/alpha/aufnahme/"));
  assert.match(lies("alpha/index.html"), /<a href="aufnahme\/">Aufnahme<\/a>/);
  for (const [, ziel] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^mailto:|^#$/.test(ziel)) continue;
    assert.ok(!/^[a-z]+:/i.test(ziel), `nur eigene Dateien: ${ziel}`);
    assert.ok(existsSync(new URL(ziel.replace(/[?#].*$/, "").replace(/\/$/, "/index.html"), new URL("alpha/aufnahme/", root))), `gibt es: ${ziel}`);
  }
  const js = lies("alpha/aufnahme/aufnahme.js");
  assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|sendBeacon/.test(js), "die Aufnahme verlässt den Browser nicht");
  for (const id of [...js.matchAll(/\$\("([a-z-]+)"\)/g)].map((m) => m[1])) assert.match(html, new RegExp(`id="${id}"`), `#${id} gibt es`);
});

test("Länge im Dateikopf: dauer.js von The Fictory, mit derselben Versionsmarke wie dort", () => {
  const marke = (datei) => lies(datei).match(/from "\.{1,2}\/(?:the-fictory\/)?dauer\.js\?v=(\d+)"/)?.[1];
  assert.ok(marke("alpha/the-fictory/app.js"), "The Fictory bindet dauer.js mit Marke ein");
  assert.equal(marke("alpha/aufnahme/aufnahme.js"), marke("alpha/the-fictory/app.js"), "Marke nachziehen, wenn The Fictory sie hochzählt");
  assert.match(lies("alpha/aufnahme/aufnahme.js"), /new Blob\(\[mitDauer\(roh, dauer \/ 1000\)\]/);
});
