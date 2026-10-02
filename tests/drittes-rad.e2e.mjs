// «Das Dritte Rad» – Browser-Tests (Playwright, Chromium): Rad, Karten, Brücke, Rückkehr, Auswahl auf den Zielseiten, Handy.
//   NODE_PATH=$(npm root -g) node tests/drittes-rad.e2e.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const { chromium } = playwright;

const root = new URL("../", import.meta.url);
const { startServer } = await import(new URL("tools/serve-orma.mjs", root).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const results = [];

async function check(name, fn) {
  try { await fn(); results.push(["ok", name]); console.log("ok  ", name); }
  catch (e) { results.push(["FAIL", name]); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 6).join("\n      ")); }
}
async function open(url, opts = { viewport: { width: 1200, height: 900 } }) {
  const ctx = await browser.newContext({ reducedMotion: "reduce", ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("response", r => { if (r.status() >= 400 && !/favicon/.test(r.url())) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(base + url);
  return { ctx, page, errors };
}
const wege = (page) => page.locator(".drad li a").evaluateAll(a => a.map(x => ({ bereich: x.querySelector("small").textContent, titel: x.querySelector("b").textContent, href: x.getAttribute("href") })));

await check("Rad: Drehen zeigt drei Karten mit Weiterleitung, Fäden und Adresse zum Wiederherstellen", async () => {
  const { ctx, page, errors } = await open("alpha/drittes-rad/");
  assert.equal(await page.locator("#result").isHidden(), true);
  await page.click("#go");
  await page.locator("#result").waitFor({ state: "visible" });
  const links = await page.locator("#result h2 a").evaluateAll(a => a.map(x => x.getAttribute("href")));
  assert.equal(links.length, 3);
  assert.match(links[0], /zu-seiner-zeit\/strophe\/\d+-[^/]+\/\?rad=1$/);
  assert.match(links[1], /portfolio\/nebeneinander-nacheinander\/\?pair=[^&]+&rad=1$/);
  assert.match(links[2], /alpha\/omna-color\/\?u=\d+&rad=1$/);
  assert.ok(await page.locator("#faeden").textContent());
  assert.match(page.url(), /\?t=/);
  const url = page.url();
  await page.goto("about:blank");
  await page.goto(url);                                    // Rückkehr: gleiche Karten ohne Drehen
  assert.equal(await page.locator("#result").isVisible(), true);
  assert.deepEqual(await page.locator("#result h2 a").evaluateAll(a => a.map(x => x.getAttribute("href"))), links);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Rad: Brücke schlagen nennt die Brücke, Karten stimmen mit der Adresse überein", async () => {
  const { ctx, page, errors } = await open("alpha/drittes-rad/");
  await page.click("#bridge");
  await page.locator("#result").waitFor({ state: "visible" });
  assert.match(await page.locator("#note").textContent(), /^(Brücke:|Eine absurde Brücke)/);
  assert.equal(await page.locator("#result h2 a").count(), 3);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Zettelkasten: Auswahl mit zwei Wegen (ORNA, OMNA COLOR) und «Zurück zum Start»; Spur-Link bleibt im Spiel", async () => {
  const { ctx, page, errors } = await open("zu-seiner-zeit/strophe/13-das-archiv/?rad=1");
  await page.locator(".drad").waitFor();
  const w = await wege(page);
  assert.deepEqual(w.map(x => x.bereich), ["ORNA", "OMNA COLOR"]);
  assert.equal(await page.locator(".drad-start").getAttribute("href"), `${base}alpha/drittes-rad/`);
  await page.locator(".zsz-nav a", { hasText: "Spur" }).click();
  await page.waitForURL(/\/spur\/\?rad=1/);
  await page.locator(".drad").waitFor();
  assert.deepEqual((await wege(page)).map(x => x.bereich), ["ORNA", "OMNA COLOR"]);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("ORNA: Auswahl mit Zettelkasten und OMNA COLOR; nach einer Drehung folgen die Vorschläge", async () => {
  const { ctx, page, errors } = await open("portfolio/nebeneinander-nacheinander/?pair=sol-lewitt__henri-bergson&rad=1");
  await page.locator(".drad").waitFor();
  assert.deepEqual((await wege(page)).map(x => x.bereich), ["Zettelkasten", "OMNA COLOR"]);
  assert.equal(await page.locator(".rad-result").getAttribute("data-pair"), "sol-lewitt__henri-bergson");
  await page.locator(".rad-stage svg").first().focus();      // nächste Drehung in ORNA (Enter): andere Konstellation, die Auswahl bleibt und folgt
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector(".rad-result").dataset.pair !== "sol-lewitt__henri-bergson", null, { timeout: 15000 });
  await page.waitForTimeout(500);
  assert.equal(await page.locator(".drad li").count(), 2);
  assert.match(page.url(), /rad=1/);
  await page.locator(".drad-start").click();
  await page.waitForURL(/alpha\/drittes-rad\/$/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("OMNA COLOR: ?u= zeigt die Übung, Auswahl mit Zettelkasten und ORNA", async () => {
  const { ctx, page, errors } = await open("alpha/omna-color/?u=040&rad=1");
  await page.locator(".drad").waitFor();
  assert.match(await page.locator("#card .idline").textContent(), /Übung 040/);
  assert.deepEqual((await wege(page)).map(x => x.bereich), ["Zettelkasten", "ORNA"]);
  const ziel = (await wege(page))[1].href;
  await page.locator(".drad li a").nth(1).click();
  await page.waitForURL(/portfolio\/nebeneinander-nacheinander\/\?pair=/);
  assert.ok(page.url().endsWith(ziel.slice(ziel.indexOf("/portfolio"))) || page.url().includes("rad=1"));
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Ohne ?rad= bleibt alles wie vorher: keine Auswahl auf Strophe, ORNA und OMNA COLOR", async () => {
  for (const u of ["zu-seiner-zeit/strophe/13-das-archiv/", "portfolio/nebeneinander-nacheinander/", "alpha/omna-color/", "alpha/omna-color/?u=040"]) {
    const { ctx, page } = await open(u);
    await page.waitForTimeout(300);
    assert.equal(await page.locator(".drad").count(), 0, u);
    await ctx.close();
  }
});

await check("Handy: kein waagerechtes Scrollen, Rad und Karten sichtbar", async () => {
  const { ctx, page } = await open("alpha/drittes-rad/", { viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true });
  await page.click("#go");
  await page.locator("#result").waitFor({ state: "visible" });
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  assert.ok(w[0] <= w[1], `scrollWidth ${w[0]} > ${w[1]}`);
  await ctx.close();
});

await browser.close();
server.close();
const failed = results.filter(r => r[0] !== "ok");
console.log(`\n${results.length - failed.length}/${results.length} ok`);
process.exit(failed.length ? 1 : 0);
