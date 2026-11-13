// Register aller Arbeiten (src/register.json, seit 13. November 2026): Das Register beschreibt, wie sichtbar eine Arbeit ist. Dieser Test hält
// Beschreibung und Website zusammen – wer eine Seite öffnet oder sperrt, muss es im Register nachtragen (und umgekehrt), sonst schlägt er an.
//   node --test tests/register.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { APPS, RASTER, ANGEBOTE } from "../src/b/inhalt.mjs";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");
const register = JSON.parse(lies("src/register.json"));
const sitemap = lies("sitemap.xml");
const lokal = register.arbeiten.filter((e) => e.status !== "extern" && !e.adresse.startsWith("?"));

test("Register: jede Arbeit mit Kennung, Name, Tür, Art, Status und Adresse; Kennungen und Adressen kommen nur einmal vor", () => {
  const status = ["oeffentlich", "verlinkt", "direktlink", "extern"];
  for (const e of register.arbeiten) {
    for (const k of ["id", "name", "tuer", "art", "status", "adresse"]) assert.ok(typeof e[k] === "string" && e[k], `${e.id}: ${k}`);
    assert.ok(register.tueren.includes(e.tuer), `${e.id}: Tür «${e.tuer}»`);
    assert.ok(status.includes(e.status), `${e.id}: Status «${e.status}»`);
    assert.match(e.id, /^[a-z0-9-]+$/, `${e.id}: Kennung klein, mit Bindestrichen`);
    assert.ok(!JSON.stringify(e).includes("ß"), `${e.id}: Schweizer Schreibung`);
  }
  for (const k of ["id", "adresse"]) assert.equal(new Set(register.arbeiten.map((e) => e[k])).size, register.arbeiten.length, `${k} eindeutig`);
});

test("Register: jede Adresse gibt es; «oeffentlich» steht in der Sitemap und ist nicht gesperrt, «verlinkt» und «direktlink» stehen nicht in der Sitemap", () => {
  for (const e of lokal) {
    const datei = `${e.adresse}index.html`;
    assert.ok(existsSync(new URL(datei, root)), `${e.id}: ${datei} gibt es`);
    const gesperrt = /<meta name="robots" content="noindex/.test(lies(datei)), drin = sitemap.includes(`<loc>https://ornament.cloud/${e.adresse}</loc>`);
    if (e.status === "oeffentlich") { assert.ok(!gesperrt, `${e.id}: öffentlich, aber noindex`); assert.ok(drin, `${e.id}: öffentlich, aber nicht in der Sitemap`); }
    else assert.ok(!drin, `${e.id}: «${e.status}», aber in der Sitemap`);
    if (e.status === "verlinkt") assert.ok(gesperrt, `${e.id}: «verlinkt» heisst noindex (sonst: oeffentlich)`);
  }
});

test("Register: alle Apps, Prüfraster und Leistungen des Neubaus stehen drin; die Hörseiten folgen ep.json", () => {
  const adressen = new Set(register.arbeiten.map((e) => e.adresse));
  for (const a of APPS) assert.ok(adressen.has(`b/apps/${a.slug}/`), `App ${a.slug}`);
  for (const r of RASTER) assert.ok(adressen.has(`b/raster/${r.slug}/`), `Raster ${r.slug}`);
  for (const a of ANGEBOTE) assert.ok(adressen.has(`b/angebot/${a.slug}/`), `Leistung ${a.slug}`);
  for (const e of register.arbeiten.filter((x) => x.adresse.startsWith("listen/"))) {
    const ep = JSON.parse(lies(`${e.adresse}ep.json`));
    assert.equal(e.status === "oeffentlich", ep.oeffentlich === true, `${e.id}: Status im Register und "oeffentlich" in ep.json stimmen überein`);
  }
});

test("Cockpit: tools/cockpit.mjs zeigt jede Arbeit, alles Wartende und sechs Wochen; die Datei im Repo ist auf dem Stand der Daten", async () => {
  const { cockpitDaten, cockpitHtml } = await import("../tools/cockpit.mjs");
  const d = cockpitDaten(), html = cockpitHtml(d);
  assert.equal(d.plan.wochen.length, 6);
  for (const e of register.arbeiten) assert.ok(html.includes(`>${e.name.replace(/&/g, "&amp;")}</a>`), `${e.id} steht im Cockpit`);
  for (const e of register.arbeiten.filter((x) => x.wartet)) assert.ok(html.includes(`id="p-w-${e.id}"`), `${e.id}: wartet`);
  assert.ok(!html.includes("ß") && !/<html|<body/.test(html), "Schweizer Schreibung; ein Bruchstück ohne eigenen Rahmen");
  assert.equal(lies("docs/cockpit/cockpit.html"), html, "sonst: node tools/cockpit.mjs");
});
