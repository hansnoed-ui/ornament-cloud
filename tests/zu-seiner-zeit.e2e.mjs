// «Zu seiner Zeit» – Browser-Tests (Playwright, Chromium): Strophe, Seitenpanel, Blättern, Spur, Zufall, Handy.
//   NODE_PATH=$(npm root -g) node tests/zu-seiner-zeit.e2e.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const { chromium, devices } = playwright;

const root = new URL("../", import.meta.url);
const { startServer } = await import(new URL("tools/serve-orma.mjs", root).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/zu-seiner-zeit/`;
const browser = await chromium.launch();
const results = [];

async function check(name, fn) {
  try { await fn(); results.push(["ok", name]); console.log("ok  ", name); }
  catch (e) { results.push(["FAIL", name]); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 6).join("\n      ")); }
}
async function open(url, opts = { viewport: { width: 1280, height: 900 } }) {
  const ctx = await browser.newContext({ reducedMotion: "reduce", ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(base + url);
  return { ctx, page, errors };
}
const box = (page, sel) => page.locator(sel).first().boundingBox();

await check("Strophe (Computer): Titel, direkt darunter die Bottom-Line, Lesespalte 680–760 px, vier Verweise nebeneinander", async () => {
  const { ctx, page, errors } = await open("strophe/37-die-information/");
  assert.equal(await page.locator(".zsz-meta").first().textContent(), "VI · Plattform · 37 / 49");
  assert.equal(await page.locator("h1").textContent(), "Die Information");
  const h1 = await box(page, "h1"), bl = await box(page, ".strophe .bottom-line"), txt = await box(page, ".strophe-text");
  assert.ok(bl.y > h1.y + h1.height - 1 && bl.y - (h1.y + h1.height) < 40, "Bottom-Line direkt unter dem Titel");
  assert.ok(txt.y > bl.y + bl.height);
  assert.ok(txt.width >= 680 && txt.width <= 760, `Lesespalte ${txt.width}`);
  const v = await page.locator("li.verweis").evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y)]; }));
  assert.equal(v.length, 4);
  assert.ok(new Set(v.map(x => x[1])).size === 1 && v[0][0] < v[1][0] && v[1][0] < v[2][0] && v[2][0] < v[3][0], `vier Spalten: ${JSON.stringify(v)}`);
  assert.deepEqual(await page.locator("li.verweis .zsz-label").allTextContents(), ["Soziologie", "Philosophie", "Kunst", "Literatur"]);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Strophe (Handy): gut lesbar, Verweise untereinander, kein seitliches Scrollen", async () => {
  const { ctx, page } = await open("strophe/37-die-information/", { ...devices["Pixel 7"] });
  const v = await page.locator("li.verweis").evaluateAll(els => els.map(e => e.getBoundingClientRect().y));
  assert.ok(v[0] < v[1] && v[1] < v[2] && v[2] < v[3], "untereinander");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const fs = await page.locator(".strophe-text p").evaluate(e => parseFloat(getComputedStyle(e).fontSize));
  assert.ok(fs >= 17, `Schriftgrösse ${fs}`);
  await ctx.close();
});

await check("Seitenpanel: Klick öffnet es mit eigener Adresse, Zurück schliesst es, Esc auch; Direktlink öffnet es", async () => {
  const { ctx, page, errors } = await open("strophe/37-die-information/");
  await page.getByRole("link", { name: "Karen Barad" }).click();
  const dlg = page.locator("dialog#verweis-karen-barad");
  await dlg.waitFor({ state: "visible" });
  assert.equal(new URL(page.url()).hash, "#verweis-karen-barad");
  assert.match(await dlg.textContent(), /Meeting the Universe Halfway/);
  assert.match(await dlg.textContent(), /Für diese Strophe/);
  assert.deepEqual(await dlg.locator(".zsz-liste a").allTextContents(), ["1 Die Brücke", "28 Die Koppelung"]);
  assert.equal(await dlg.locator('a[href^="http"]').count(), 0, "ohne eingetragenen Link kein externer Link");
  await page.goBack();
  await dlg.waitFor({ state: "hidden" });
  assert.equal(new URL(page.url()).pathname, "/zu-seiner-zeit/strophe/37-die-information/");
  assert.equal(new URL(page.url()).hash, "");
  // Esc schliesst und nimmt den Eintrag zurück
  await page.getByRole("link", { name: "Hito Steyerl" }).click();
  await page.locator("dialog#verweis-hito-steyerl").waitFor({ state: "visible" });
  await page.keyboard.press("Escape");
  await page.locator("dialog#verweis-hito-steyerl").waitFor({ state: "hidden" });
  await page.waitForFunction(() => location.hash === "");
  // Direktlink mit Anker
  await page.goto(base + "strophe/37-die-information/#verweis-klaus-kusanowsky");
  await page.locator("dialog#verweis-klaus-kusanowsky").waitFor({ state: "visible" });
  await page.locator("dialog#verweis-klaus-kusanowsky").getByRole("link", { name: /Alle Stellen zu Klaus Kusanowsky/ }).click();
  await page.waitForURL(/\/verweis\/klaus-kusanowsky\/$/);
  assert.equal(await page.locator("h1").textContent(), "Klaus Kusanowsky");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Ohne JavaScript: Verweis führt zur Verweisseite", async () => {
  const { ctx, page } = await open("strophe/37-die-information/", { viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
  await page.getByRole("link", { name: "Stanisław Lem" }).click();
  await page.waitForURL(/\/verweis\/stanislaw-lem\/$/);
  assert.match(await page.locator("main").textContent(), /His Master’s Voice/);
  await ctx.close();
});

await check("Blättern: vorherige und nächste Strophe, Zurück/Vor des Browsers", async () => {
  const { ctx, page } = await open("strophe/36-das-profil/");
  await page.locator('a[rel="next"]').click();
  await page.waitForURL(/37-die-information/);
  await page.locator('a[rel="next"]').click();
  await page.waitForURL(/38-die-wahrscheinlichkeit/);
  await page.goBack(); await page.waitForURL(/37-die-information/);
  await page.goForward(); await page.waitForURL(/38-die-wahrscheinlichkeit/);
  await page.goto(base + "strophe/1-die-bruecke/");
  assert.equal(await page.locator('a[rel="prev"]').count(), 0);
  await ctx.close();
});

await check("Spur: nur die Nachbarschaft; Klick macht einen Knoten zum Mittelpunkt, Zurück stellt den vorigen her", async () => {
  const { ctx, page, errors } = await open("spur/?s=37");
  await page.waitForSelector(".spur-titel");
  const gruppe = t => page.locator(".spur-gruppe", { has: page.locator("h2", { hasText: t }) }).locator("a").allTextContents();
  assert.match(await page.locator(".spur-titel").textContent(), /37\s+Die Information/);
  assert.deepEqual(await gruppe("Vorher"), ["36 Das Profil"]);
  assert.deepEqual(await gruppe("Danach"), ["38 Die Wahrscheinlichkeit"]);
  assert.deepEqual(await gruppe("Resonanzen"), ["Klaus Kusanowsky", "Karen Barad", "Hito Steyerl", "Stanisław Lem"]);
  assert.ok((await gruppe("Verwandt")).includes("28 Die Koppelung"));
  assert.ok(await page.locator(".spur-knoten").count() < 49, "nie das ganze Netz");
  await page.locator(".spur-knoten", { hasText: "38 Die Wahrscheinlichkeit" }).click();
  await page.waitForFunction(() => /38/.test(document.querySelector(".spur-titel").textContent));
  assert.equal(new URL(page.url()).search, "?s=38");
  assert.match(await page.locator(".spur-pfad").textContent(), /37 Die Information → 38 Die Wahrscheinlichkeit/);
  await page.locator(".spur-knoten", { hasText: "Barbara Adam" }).click();
  await page.waitForFunction(() => document.querySelector(".spur-titel").textContent === "Barbara Adam");
  assert.equal(new URL(page.url()).search, "?p=barbara-adam");
  assert.deepEqual(await gruppe("In den Strophen"), ["2 Das Ereignis", "6 Die Verspätung", "38 Die Wahrscheinlichkeit"]);
  await page.goBack();
  await page.waitForFunction(() => /38/.test(document.querySelector(".spur-titel").textContent));
  await page.goBack();
  await page.waitForFunction(() => /37/.test(document.querySelector(".spur-titel").textContent));
  await page.getByRole("link", { name: /Strophe lesen/ }).click();
  await page.waitForURL(/37-die-information/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Zufall: landet auf einer Strophe, nie auf der gerade geöffneten; Zurück führt zur vorherigen Seite", async () => {
  const { ctx, page, errors } = await open("strophe/37-die-information/");
  const seen = new Set();
  for (let i = 0; i < 12; i++) {
    await page.goto(base + "strophe/37-die-information/");
    await page.locator('.zsz-nav a[data-zufall]').click();
    await page.waitForURL(/\/strophe\/\d+-/);
    const n = Number(new URL(page.url()).pathname.match(/strophe\/(\d+)-/)[1]);
    assert.notEqual(n, 37); seen.add(n);
    await page.goBack();
    await page.waitForURL(/37-die-information/);
  }
  assert.ok(seen.size >= 5, `zu wenig Streuung: ${[...seen]}`);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Durchklicken: «Mit dem Zufall beginnen» führt in eine Strophe, «Weiter mit dem Zufall» in eine andere", async () => {
  const { ctx, page, errors } = await open("");
  const knopf = page.getByRole("link", { name: "Mit dem Zufall beginnen" });
  const k = await knopf.boundingBox(), z = await page.locator(".zyklus").first().boundingBox();
  assert.ok(k.y + k.height <= z.y, "vor dem ersten Zyklus");
  await knopf.click();
  await page.waitForURL(/\/strophe\/\d+-/);
  const nr = () => Number(new URL(page.url()).pathname.match(/strophe\/(\d+)-/)[1]);
  let vorher = nr();
  for (let i = 0; i < 6; i++) {
    const w = page.getByRole("link", { name: "Weiter mit dem Zufall" });
    const b = await w.boundingBox(), t = await page.locator(".strophe-text").boundingBox(), v = await page.locator(".weiterdenken").boundingBox();
    assert.ok(b.y >= t.y + t.height && b.y + b.height <= v.y, "unter der Strophe, vor Weiterdenken");
    await w.click();
    await page.waitForURL(u => /\/strophe\/\d+-/.test(u.pathname) && Number(u.pathname.match(/strophe\/(\d+)-/)[1]) !== vorher);
    vorher = nr();
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Verweise: deutlicher Abstand über jeder Disziplin; sortiert nach Nachname (ohne «(Hg.)»)", async () => {
  const { ctx, page } = await open("verweis/", { ...devices["Pixel 7"] });
  const meta = await box(page, ".zsz-spalte > .zsz-meta");
  const soz = await box(page, "#g-soziologie");
  assert.ok(soz.y - (meta.y + meta.height) >= 48, `Abstand über «Soziologie»: ${soz.y - (meta.y + meta.height)}`);
  const phil = await box(page, "#g-philosophie"), vorher = await page.locator(".verweis-gruppe").first().boundingBox();
  assert.ok(phil.y - (vorher.y + vorher.height) >= 48, "Abstand über «Philosophie»");
  const namen = await page.locator(".verweis-gruppe").first().locator("a").allTextContents();
  assert.notEqual(namen[0], "Marilyn Strathern (Hg.)");
  const nach = n => n.replace(/\s*\([^)]*\)/g, "").split(" ").pop();
  const i = namen.indexOf("Marilyn Strathern (Hg.)");
  assert.ok(i > 0 && nach(namen[i - 1]).localeCompare("Strathern", "de") <= 0 && (i === namen.length - 1 || nach(namen[i + 1]).localeCompare("Strathern", "de") >= 0),
    `Strathern an falscher Stelle: ${namen.slice(i - 1, i + 2)}`);
  await ctx.close();
});

await check("Startseite und Portfolio: 49 Strophen mit Bottom-Line; Portfolio verlinkt das Projekt", async () => {
  const { ctx, page } = await open("");
  assert.equal(await page.locator(".zyklus-strophen li").count(), 49);
  assert.equal(await page.locator(".zyklus-strophen .bottom-line").count(), 49);
  await page.goto(base.replace("zu-seiner-zeit/", "portfolio/"));
  await page.getByRole("link", { name: "Lesen" }).click();
  await page.waitForURL(/\/zu-seiner-zeit\/$/);
  assert.equal(await page.locator("h1").textContent(), "Zu seiner Zeit");
  await ctx.close();
});

await browser.close();
server.close();
const failed = results.filter(r => r[0] !== "ok");
console.log(`\n${results.length - failed.length}/${results.length} ok`);
process.exit(failed.length ? 1 : 0);
