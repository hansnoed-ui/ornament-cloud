// Der Neubau an der Wurzel (16. November 2026, SEO): die Dateien liegen unter b/, die Seiten heissen /, /en/, /angebot/… .
// Apache läuft hier nicht; der Test spielt die Regeln aus .htaccess (Block «Der Neubau an der Wurzel») nach, so wie mod_rewrite sie
// in .htaccess anwendet: Regel für Regel, nach einer internen Umschreibung von vorn, THE_REQUEST bleibt die ursprüngliche Anfrage.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";

import { anfrage, block } from "./wurzel-regeln.mjs";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");

const seitenUnterB = (() => {
  const out = [];
  const gehe = (d) => { for (const e of readdirSync(new URL(d, root), { withFileTypes: true })) if (e.isDirectory()) { const p = `${d}${e.name}/`; if (existsSync(new URL(p + "index.html", root))) out.push(p); gehe(p); } };
  gehe("b/"); return out;
})();

test("Wurzel: die Startseite ist der Neubau, die bisherige bleibt unter /?bisher", () => {
  assert.deepEqual(anfrage("/"), { datei: "b/index.html" });
  assert.deepEqual(anfrage("/en/"), { datei: "b/en/index.html" });
  assert.deepEqual(anfrage("/?bisher"), { datei: "index.html" });
  assert.deepEqual(anfrage("/angebot/webdesign/"), { datei: "b/angebot/webdesign/index.html" });
  assert.deepEqual(anfrage("/en/zettel/7-die-zeit/"), { datei: "b/en/zettel/7-die-zeit/index.html" });
});

test("Wurzel: gleicher Name an der Wurzel – der Neubau gewinnt (apps/, werke/); ältere Werke unter werke/ bleiben erreichbar", () => {
  assert.deepEqual(anfrage("/apps/"), { datei: "b/apps/index.html" });
  assert.deepEqual(anfrage("/werke/"), { datei: "b/werke/index.html" });
  for (const w of ["reentry", "stellenfeld", "formen-der-zeit"]) if (existsSync(new URL(`werke/${w}/index.html`, root))) assert.deepEqual(anfrage(`/werke/${w}/`), { datei: `werke/${w}/index.html` });
  for (const p of ["/impressum/", "/alpha/lab/", "/zu-seiner-zeit/", "/social-media/", "/animations/"]) assert.equal(anfrage(p).datei, p.slice(1) + "index.html", p);
});

test("Wurzel: jede Seite unter /b/ leitet dauerhaft (301) auf dieselbe Seite ohne /b/ um; Dateien unter /b/ bleiben, wo sie sind", () => {
  for (const p of seitenUnterB) {
    const alt = "/" + p, neu = "/" + p.slice(2);
    assert.deepEqual(anfrage(alt), { umleitung: neu, code: 301 }, alt);
    assert.deepEqual(anfrage(neu), { datei: p + "index.html" }, `${neu} liefert ${p}index.html`);
  }
  assert.deepEqual(anfrage("/b/"), { umleitung: "/", code: 301 });
  assert.deepEqual(anfrage("/b/?bisher"), { umleitung: "/?bisher", code: 301 });
  for (const f of ["b/b.css", "b/b.js", "b/tafeln-leben.js", "b/bilder/signet/signet.svg"]) assert.deepEqual(anfrage("/" + f), { datei: f }, f);
});

test("Wurzel: die Liste der Bereiche in .htaccess passt zu den Ordnern unter b/ (ein neuer Bereich muss dort eingetragen werden)", () => {
  const liste = block.match(/\(\?:en\/\)\?\(\?:([a-z|-]+)\)/)[1].split("|").sort();
  const bereiche = new Set(seitenUnterB.map((p) => p.replace(/^b\/(en\/)?/, "").split("/")[0]).filter((n) => n && n !== "en" && n !== "werke"));
  assert.deepEqual(liste, [...bereiche].sort());
});

test("Wurzel: jede Adresse der Sitemap wird ausgeliefert (keine /b/-Seiten mehr darin), Neubau-Seiten mit passendem canonical", () => {
  const locs = [...lies("sitemap.xml").matchAll(/<loc>https:\/\/ornament\.cloud(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.length > 200, "Sitemap gelesen");   // seit 22. November 2026 ohne die rund 400 Verweis-Seiten des Zettelkastens (noindex)
  for (const p of locs) {
    assert.ok(!p.startsWith("/b/"), `${p}: noch mit /b/ in der Sitemap`);
    const a = anfrage(p);
    assert.ok(a.datei, `${p}: ${JSON.stringify(a)}`);
    if (a.datei.startsWith("b/")) assert.equal(lies(a.datei).match(/<link rel="canonical" href="([^"]+)">/)?.[1], `https://ornament.cloud${p}`, `${p}: canonical`);
  }
});
