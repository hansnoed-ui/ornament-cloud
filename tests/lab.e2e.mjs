// ORNAMENT LAB – Browsertest (Playwright, Chromium) des ersten durchgehenden Prozesses mit dem Beispielbild:
// Bild → ORNA-Konstellation → The Fictory (sechs Zustände nebeneinander) → Variante wählen → Feedback mit modulierten Varianten → Variante wählen
// → Bildsignal koppelt Wiederholung → Animation → Projekt speichern und wieder öffnen; dazu jev-assistiert, experimentell, Kette, Handy.
//   NODE_PATH=$(npm root -g) node tests/lab.e2e.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const root = new URL("../", import.meta.url);
const { startServer } = await import(new URL("tools/serve-orma.mjs", root).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/alpha/lab/`;
const browser = await playwright.chromium.launch();
const ergebnisse = [];
async function check(name, fn) {
  try { await fn(); ergebnisse.push(true); console.log("ok  ", name); }
  catch (e) { ergebnisse.push(false); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 8).join("\n      ")); }
}
async function oeffne(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, ...opts });
  const page = await ctx.newPage();
  const fehler = [], fremd = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  page.on("request", (r) => { const u = new URL(r.url()); if (!["localhost", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) fremd.push(r.url()); });
  page.on("dialog", (d) => d.accept());
  await page.goto(base);
  await page.waitForFunction(() => globalThis.ornamentLab);
  return { ctx, page, fehler, fremd };
}
const S = (page, fn) => page.evaluate(fn);
const zaehle = (page) => S(page, () => ({ ergebnisse: ornamentLab.projekt.ergebnisse.length, knoten: ornamentLab.projekt.knoten.length, laeuft: Boolean(ornamentLab.laeuft) }));
async function warteFertig(page, ms = 120000) { await page.waitForFunction(() => !ornamentLab.laeuft, null, { timeout: ms }); }
async function operation(page, id) { await page.locator(`.op input[value="${id}"]`).check(); await page.waitForSelector("#op-form:not([hidden]) #ausfuehren"); }
async function ausfuehren(page) { await page.click("#ausfuehren"); await page.waitForTimeout(50); await warteFertig(page); }

const { ctx, page, fehler, fremd } = await oeffne();
let gespeichert = null;

await check("Start: vier Bereiche, Register mit sieben Operationen, keine Fehler", async () => {
  for (const id of ["material", "operationen", "experiment", "protokoll"]) assert.ok(await page.locator(`#${id}`).isVisible(), id);
  assert.match(await page.textContent("#status"), /7 Operationen/);
  assert.deepEqual(fehler, []);
});

await check("Material: eigenes Bild importieren (Beispielbild), Ausgang gesetzt, Arbeitsbild begrenzt", async () => {
  await page.click("#beispiel");
  await page.waitForFunction(() => ornamentLab.aktuell);
  const e = await S(page, () => { const e = ornamentLab.projekt.ergebnisse[0]; return { typ: e.typ, breite: e.breite, hoehe: e.hoehe, sha: e.sha256, original: e.herkunft.original }; });
  assert.equal(e.typ, "IMAGE"); assert.ok(Math.max(e.breite, e.hoehe) <= 2048); assert.match(e.sha, /^[0-9a-f]{64}$/); assert.match(e.original.sha256, /^[0-9a-f]{64}$/);
  assert.equal(await page.locator("#materialien img").count(), 1);
});

await check("ORNA: Konstellation ziehen; Ziehung als Zufall, Regel mit Quelle protokolliert", async () => {
  await operation(page, "orna.konstellation");
  await ausfuehren(page);
  const d = await S(page, () => ornamentLab.projekt.entscheidungen.map((x) => [x.art, x.gegenstand]));
  assert.deepEqual(d[0], ["mensch", "operation"]);
  assert.deepEqual(d[1], ["zufall", "konstellation"]);
  assert.equal(d[2][1], "operationsregel");
  assert.ok(["jev", "regel", "zufall"].includes(d[2][0]));
  assert.ok(await page.locator(".text-karte").isVisible());
  assert.equal(await S(page, () => ornamentLab.projekt.ergebnisse.find((e) => e.id === ornamentLab.aktuell).typ), "IMAGE", "der Bildausgang bleibt");
});

await check("The Fictory mit Konstellation: sechs Zustände nebeneinander, verschieden, Regel aus ORNA", async () => {
  await operation(page, "fictory.prozess");
  const k = await page.locator("#op-form select").first().inputValue();
  assert.ok(k, "die Konstellation ist als zweiter Eingang vorgewählt");
  await page.locator('#op-form input[data-param="seite"]').fill("640");
  await ausfuehren(page);
  assert.equal(await page.locator("#buehne .karte").count(), 6);
  const r = await S(page, () => { const k = ornamentLab.projekt.knoten.at(-1); return { status: k.status, regel: k.protokoll.lauf.regel, herkunft: k.protokoll.lauf.regelHerkunft, sha: k.ausgaben.map((id) => ornamentLab.projekt.ergebnisse.find((e) => e.id === id).sha256) }; });
  assert.equal(r.status, "fertig");
  assert.match(r.regel, /^R[1-7]$/); assert.match(r.herkunft, /^ORNA/);
  assert.equal(new Set(r.sha).size, 6, "sechs verschiedene PNG");
});

await check("Weiterführen: Variante wählen (Mensch), Feedback mit sechs modulierten Varianten, zweite Wahl", async () => {
  await page.locator("#buehne .karte").nth(3).getByRole("button", { name: "weiterführen" }).click();
  const gewaehlt = await S(page, () => ornamentLab.aktuell);
  await operation(page, "lab.feedback");
  await page.locator('#op-form input[data-param="seite"]').fill("400");
  await ausfuehren(page);
  assert.equal(await page.locator("#buehne .karte").count(), 6);
  const k = await S(page, () => { const k = ornamentLab.projekt.knoten.at(-1); return { ein: Object.values(k.eingaben)[0], route: k.variation.routen[0], dreh: k.ausgaben.map((id) => ornamentLab.projekt.ergebnisse.find((e) => e.id === id).variante.parameter.drehung) }; });
  assert.equal(k.ein, gewaehlt, "Feedback liest die gewählte Variante");
  assert.equal(k.route.ziel, "drehung");
  assert.ok(new Set(k.dreh).size >= 4, `Drehung verteilt: ${k.dreh}`);
  await page.locator("#buehne .karte").nth(1).getByRole("button", { name: "weiterführen" }).click();
});

await check("Kopplung: Bildsignal → moduliert die Wiederholung (Quelle Steuersignal)", async () => {
  await operation(page, "lab.bildsignal");
  await ausfuehren(page);
  assert.ok(await page.locator(".signal svg").isVisible());
  await operation(page, "lab.wiederholung");
  await page.locator('#op-form input[data-param="seite"]').fill("400");
  const sel = page.locator("#op-form select");
  for (let i = 0; i < await sel.count(); i++) if ((await sel.nth(i).locator("option").allTextContents()).includes("Steuersignal aus einem Ergebnis")) await sel.nth(i).selectOption("signal");
  await ausfuehren(page);
  const r = await S(page, () => ornamentLab.projekt.knoten.at(-1).variation.routen[0].modulator);
  assert.equal(r.quelle, "signal"); assert.match(r.ergebnis, /^e-/);
  await page.locator("#buehne .karte").nth(2).getByRole("button", { name: "weiterführen" }).click();
});

await check("Vergleich: zwei Varianten nebeneinander → Differenz als Beobachtung", async () => {
  const kId = await S(page, () => ornamentLab.projekt.ergebnisse.find((e) => e.id === ornamentLab.aktuell).knoten);
  await page.locator('input[name="ansicht"][value="nach"]').check({ force: true });
  await page.locator('input[name="ansicht"][value="neben"]').check({ force: true });
  assert.equal(await page.locator("#buehne .karte").count(), 6, "die Varianten der gewählten Wiederholung");
  void kId;
  await page.locator(".karte label.vergleich input").nth(0).check();
  await page.locator(".karte label.vergleich input").nth(1).check();
  await page.getByRole("button", { name: "Differenz der beiden zeigen" }).click();
  await warteFertig(page);
  assert.match(await page.textContent("#status"), /Messung, keine Bewertung/);
});

await check("Nacheinander: Verlauf vom Material bis zum gewählten Zustand, Entscheidungsarten sichtbar", async () => {
  await page.locator('input[name="ansicht"][value="nach"]').check({ force: true });
  const schritte = await page.locator(".verlauf > li").count();
  assert.equal(schritte, 4, "Material + Fictory + Feedback + Wiederholung");
  assert.ok(await page.locator(".verlauf .art.mensch").count() >= 3);
});

await check("Animation des letzten Schritts: Video wird erzeugt und ins Projekt aufgenommen", async () => {
  await page.click("#animation");
  await warteFertig(page, 180000);
  const x = await S(page, () => ornamentLab.projekt.exporte.at(-1));
  assert.equal(x.art, "animation"); assert.ok(x.bilder >= 30, `${x.bilder} Bilder`);
  assert.ok(await page.locator(".film video").isVisible());
});

await check("Kette speichern und auf das Material anwenden (wie ein Combinator)", async () => {
  await page.locator("#ketten input").fill("Fictory, Feedback, Raster");
  await page.getByRole("button", { name: "Verlauf speichern" }).click();
  await page.locator("#materialien button").first().click();
  const vorher = (await zaehle(page)).knoten;
  await page.getByRole("button", { name: "anwenden" }).click();
  await warteFertig(page, 180000);
  const r = await S(page, () => ({ ops: ornamentLab.projekt.knoten.slice(-3).map((k) => k.operation), arten: ornamentLab.projekt.entscheidungen.slice(-2).map((d) => d.art), meldungen: ornamentLab.projekt.meldungen.map((m) => m.text) }));
  assert.equal((await zaehle(page)).knoten, vorher + 3);
  assert.deepEqual(r.ops, ["fictory.prozess", "lab.feedback", "lab.wiederholung"]);
  assert.ok(r.arten.every((a) => a === "regel"));
});

await check("jev-assistiert: Regelvorschläge mit Gründen; jev live ehrlich als nicht eingerichtet", async () => {
  await page.locator('input[name="modus"][value="jev"]').check({ force: true });
  assert.ok(await page.locator("#vorschlaege .art.regel").count() >= 1);
  assert.ok(await page.getByRole("button", { name: "jev fragen" }).isDisabled());
  await page.locator("#vorschlaege").getByRole("button", { name: "übernehmen" }).first().click();
  await page.locator('#op-form input[data-param="seite"]').fill("320").catch(() => {});
  await ausfuehren(page);
  assert.equal(await S(page, () => ornamentLab.projekt.entscheidungen.filter((d) => d.gegenstand === "operation").at(-1).art), "regel");
});

await check("Experimentell: höchstens die gewählten Schritte, Wahlen als Zufall mit Startwert", async () => {
  await page.locator('input[name="modus"][value="experimentell"]').check({ force: true });
  await page.locator("#materialien button").first().click();
  const vorher = (await zaehle(page)).knoten;
  await page.click("#experiment-start");
  await warteFertig(page, 180000);
  const n = (await zaehle(page)).knoten - vorher;
  assert.ok(n >= 1 && n <= 3, `${n} Schritte`);
  const arten = await S(page, () => ornamentLab.projekt.entscheidungen.slice(-2).map((d) => [d.art, typeof d.details.experimentStartwert]));
  assert.deepEqual(arten, [["zufall", "number"], ["zufall", "number"]]);
  await page.locator('input[name="modus"][value="manuell"]').check({ force: true });
});

await check("Projekt speichern: Archiv mit projekt.json und PNG; wieder öffnen ergibt dasselbe Projekt", async () => {
  const vorher = await S(page, () => JSON.parse(JSON.stringify({ e: ornamentLab.projekt.ergebnisse.map((e) => [e.id, e.sha256]), k: ornamentLab.projekt.knoten.length, d: ornamentLab.projekt.entscheidungen.length })));
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#speichern")]);
  assert.match(dl.suggestedFilename(), /\.ornalab\.zip$/);
  gespeichert = await dl.path();
  const roh = readFileSync(gespeichert);
  assert.ok(roh.includes(Buffer.from("projekt.json")));
  await page.click("#neu");
  assert.equal((await zaehle(page)).ergebnisse, 0);
  await page.setInputFiles("#oeffnen", gespeichert);
  await page.waitForFunction(() => ornamentLab.projekt.ergebnisse.length > 0);
  const nachher = await S(page, () => ({ e: ornamentLab.projekt.ergebnisse.map((e) => [e.id, e.sha256]), k: ornamentLab.projekt.knoten.length, d: ornamentLab.projekt.entscheidungen.length }));
  assert.deepEqual(nachher, vorher);
  await page.locator('input[name="ansicht"][value="nach"]').check({ force: true });
  await page.waitForFunction(() => [...document.querySelectorAll(".verlauf img")].every((i) => i.complete && i.naturalWidth > 0));
  // nach dem Öffnen weiterarbeiten: die Bilder werden aus den PNG des Archivs gelesen
  await page.locator('input[name="ansicht"][value="neben"]').check({ force: true });
  await operation(page, "lab.farbe");
  await ausfuehren(page);
  assert.equal(await S(page, () => ornamentLab.projekt.knoten.at(-1).status), "fertig");
});

await check("Keine Fehler in der Konsole, keine Anfragen nach aussen", async () => {
  assert.deepEqual(fehler, []);
  assert.deepEqual(fremd, []);
});
await ctx.close();

await check("Telefon: kein seitliches Scrollen, Bereiche untereinander", async () => {
  const t = await oeffne({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const breit = await t.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(breit <= 0, `${breit}px zu breit`);
  const [a, b] = await Promise.all(["#material", "#experiment"].map((s) => t.page.locator(s).boundingBox()));
  assert.ok(b.y > a.y && Math.abs(b.x - a.x) < 2);
  await t.ctx.close();
});

await browser.close(); server.close();
const ok = ergebnisse.filter(Boolean).length;
console.log(`\n${ok} von ${ergebnisse.length} bestanden`);
process.exit(ok === ergebnisse.length ? 0 : 1);
