// Browsertests für „Nebeneinander, Nacheinander“ (benötigt Playwright)
//
//   node tests/doppelspalt.e2e.mjs
//
// Startet einen kleinen lokalen Server (ES-Module laden nicht über file://).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const { chromium, devices } = playwright;

const root = new URL("../", import.meta.url).pathname;
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (p.endsWith("/")) p += "index.html";
  try { res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" }); res.end(await readFile(join(root, p))); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, r));
const base = `http://localhost:${server.address().port}/portfolio/nebeneinander-nacheinander/`;

const results = [];
async function check(name, fn) {
  try { await fn(); results.push(`ok   ${name}`); }
  catch (e) { results.push(`FAIL ${name}: ${e.message}`); process.exitCode = 1; }
}

const browser = await chromium.launch();
const pairs = new Set((await import(new URL("../portfolio/nebeneinander-nacheinander/js/data/constellations.js", import.meta.url).href)).constellations.map(c => c.id));

async function open(ctxOpts = {}, query = "") {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(base + query);
  await page.waitForFunction(() => document.querySelector(".rad-wheel").__rad);
  return { ctx, page, errors };
}
const radState = page => page.evaluate(() => { const w = document.querySelector(".rad-wheel").__rad; return { state: w.state, rot: w.rotation, cur: w.current, plan: w.plan && { aDir: w.plan.artist.dir, tDir: w.plan.theorist.dir, dur: w.plan.duration, id: w.plan.record.id, aD: w.plan.artist.D, aV: w.plan.artist.n * w.plan.artist.D / w.plan.artist.T } }; });
async function waitSelected(page, timeout = 12000) { await page.waitForFunction(() => document.querySelector(".rad-wheel").__rad.state === "selected", null, { timeout }); }
async function assertLanding(page) {
  const s = await radState(page);
  assert.equal(s.state, "selected");
  assert.ok(pairs.has(s.cur.id), `nicht kuratiert: ${s.cur.id}`);
  const shown = await page.$eval(".rad-result", r => r.dataset.pair);
  assert.equal(shown, s.cur.id);
  return s;
}

// Mausgeste entlang eines Kreisbogens (Radius-Anteil 0.40 = äusserer Ring, 0.27 = innerer)
async function mouseArc(page, { from = Math.PI, steps = 8, stepAngle = 0.12, pause = 12, ring = 0.40, hold = 0 }) {
  const b = await (await page.$(".rad-wheel")).boundingBox();
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2, R = b.width * ring;
  await page.mouse.move(cx + R * Math.cos(from), cy + R * Math.sin(from));
  await page.mouse.down();
  for (let i = 1; i <= steps; i += 1) { const a = from + i * stepAngle; await page.mouse.move(cx + R * Math.cos(a), cy + R * Math.sin(a)); await page.waitForTimeout(pause); }
  if (hold) await page.waitForTimeout(hold);
  await page.mouse.up();
}

// echte Touch-Geste über CDP
async function touchArc(page, { from = Math.PI, steps = 8, stepAngle = 0.13, pause = 14, ring = 0.40 }) {
  await page.$eval(".rad-wheel", e => e.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(100);
  const b = await (await page.$(".rad-wheel")).boundingBox();
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2, R = b.width * ring;
  const cdp = await page.context().newCDPSession(page);
  const pt = a => ({ x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt(from)] });
  for (let i = 1; i <= steps; i += 1) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [pt(from + i * stepAngle)] }); await page.waitForTimeout(pause); }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

await check("Smartphone hochkant: Daumen-Flick, Landung, Text erst nach Stillstand, keine horizontale Verschiebung", async () => {
  const { ctx, page, errors } = await open({ ...devices["iPhone 13"] });
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  assert.equal(scrollW, false, "horizontales Scrollen");
  const w = await page.$eval(".rad-wheel", e => e.getBoundingClientRect().width);
  assert.ok(w >= 330, `Rad zu klein: ${w}`);
  await touchArc(page, {});
  await page.waitForTimeout(300);
  let s = await radState(page);
  assert.ok(["spinning", "settling"].includes(s.state), s.state);
  assert.equal(await page.$eval(".rad-names", e => getComputedStyle(e).opacity), "0", "Namen während der Bewegung sichtbar");
  await waitSelected(page);
  await assertLanding(page);
  await page.waitForTimeout(3200);
  const shown = await page.$$eval(".rad-result > .is-shown", e => e.length);
  assert.equal(shown, 4);
  // Zeichengrösse auf dem Handy
  const symPx = await page.$eval(".rad-ring--outer .sym", e => e.getBoundingClientRect().width);
  assert.ok(symPx >= 20, `Zeichen ${symPx}px`);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: "/tmp/rad-e2e-phone.png", fullPage: true });
  await ctx.close();
});

await check("Tablet: Flick auf dem inneren Ring, innerer Ring folgt der Geste, äusserer gegenläufig", async () => {
  const { ctx, page, errors } = await open({ ...devices["iPad (gen 7)"] });
  await touchArc(page, { ring: 0.27, stepAngle: 0.15 });
  await page.waitForTimeout(200);
  const s = await radState(page);
  assert.notEqual(s.plan.aDir, s.plan.tDir);
  assert.equal(s.plan.tDir, 1, "innerer Ring sollte im Uhrzeigersinn der Geste folgen");
  await waitSelected(page);
  await assertLanding(page);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Desktop: kräftiger Flick → schneller und mehr Umdrehungen als langsames Ziehen; Gegenrichtung", async () => {
  const { ctx, page, errors } = await open({ viewport: { width: 1280, height: 900 } });
  await mouseArc(page, { steps: 5, stepAngle: 0.5, pause: 8 });           // kräftig
  await page.waitForTimeout(100);
  const fast = await radState(page);
  await waitSelected(page);
  await assertLanding(page);
  await mouseArc(page, { steps: 10, stepAngle: 0.03, pause: 40, hold: 200 });   // langsam, am Ende gehalten
  await page.waitForTimeout(100);
  const slow = await radState(page);
  assert.ok(fast.plan.aV > 3 * slow.plan.aV, `Anfangsgeschwindigkeit ${fast.plan.aV} vs ${slow.plan.aV}`);
  assert.ok(fast.plan.aD > slow.plan.aD, "mehr Umdrehungen bei kräftiger Geste");
  for (const d of [fast.plan.dur, slow.plan.dur]) assert.ok(d >= 2.2 && d <= 6.8, `Dauer ${d}`);
  await waitSelected(page);
  await assertLanding(page);
  await mouseArc(page, { stepAngle: -0.2, pause: 10 });                    // Gegenrichtung
  await page.waitForTimeout(100);
  const rev = await radState(page);
  assert.equal(rev.plan.aDir, -1);
  assert.equal(rev.plan.tDir, 1);
  await waitSelected(page);
  await assertLanding(page);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Nächster Spin beginnt aus der erreichten Stellung, kein Zurückspringen; Text verschwindet beim neuen Spin", async () => {
  const { ctx, page } = await open({ viewport: { width: 1280, height: 900 } });
  await mouseArc(page, {});
  await waitSelected(page);
  await page.waitForTimeout(3000);
  const before = (await radState(page)).rot;
  await page.focus(".rad-wheel");
  await page.keyboard.press("Enter");                                        // neuer Spin ohne Ziehen
  const from = await page.evaluate(() => { const p = document.querySelector(".rad-wheel").__rad.plan; return { a: p.artist.from, t: p.theorist.from }; });
  const d = (x, y) => Math.abs(((x - y) % 360 + 540) % 360 - 180);
  assert.ok(d(from.a, before.artist) < 1e-6 && d(from.t, before.theorist) < 1e-6, `Start ${JSON.stringify(from)} statt ${JSON.stringify(before)}`);
  assert.equal(await page.$$eval(".rad-result > .is-shown", e => e.length), 0, "alter Text noch sichtbar");
  await waitSelected(page);
  await ctx.close();
});

await check("Schnelles Mehrfachtippen während der Bewegung erzeugt keine neue Ziehung", async () => {
  const { ctx, page } = await open({ viewport: { width: 1280, height: 900 } });
  await mouseArc(page, {});
  await page.waitForTimeout(150);
  const id = (await radState(page)).plan.id;
  const b = await (await page.$(".rad-wheel")).boundingBox();
  for (let i = 0; i < 12; i += 1) { await page.mouse.click(b.x + b.width * 0.12, b.y + b.height / 2); await page.keyboard.press("Enter"); }
  const s = await radState(page);
  assert.equal(s.plan.id, id);
  await waitSelected(page);
  await assertLanding(page);
  await ctx.close();
});

await check("Tastatur: Fokus auf dem Rad, Enter und Leertaste drehen", async () => {
  const { ctx, page } = await open({ viewport: { width: 1280, height: 900 } });
  await page.focus(".rad-wheel");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(100);
  assert.equal((await radState(page)).state, "spinning");
  await waitSelected(page);
  const first = await assertLanding(page);
  await page.keyboard.press(" ");
  await page.waitForTimeout(100);
  assert.equal((await radState(page)).state, "spinning");
  await waitSelected(page);
  const second = await assertLanding(page);
  assert.notEqual(first.cur.id, second.cur.id, "unmittelbare Wiederholung");
  await ctx.close();
});

await check("Reduzierte Bewegung: kurze Bewegung, gleiches vollständiges Ergebnis", async () => {
  const { ctx, page } = await open({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  await page.focus(".rad-wheel");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(80);
  assert.ok((await radState(page)).plan.dur <= 1);
  await waitSelected(page, 3000);
  await assertLanding(page);
  await page.waitForTimeout(3200);
  assert.equal(await page.$$eval(".rad-result > .is-shown", e => e.length), 4);
  await ctx.close();
});

await check("Screenreader-Struktur: Rad als Schaltfläche, Zeichen verborgen, Ansage ohne Essay", async () => {
  const { ctx, page } = await open({ viewport: { width: 1280, height: 900 } });
  const a = await page.$eval(".rad-wheel", e => ({ role: e.getAttribute("role"), tab: e.getAttribute("tabindex"), rings: [...e.querySelectorAll(".rad-ring")].every(r => r.getAttribute("aria-hidden") === "true") }));
  assert.deepEqual(a, { role: "button", tab: "0", rings: true });
  await page.focus(".rad-wheel");
  await page.keyboard.press("Enter");
  await waitSelected(page);
  const live = await page.$eval("#rad-live", e => e.textContent);
  assert.match(live, /^Konstellation: .+ und .+\.$/);
  assert.ok(live.length < 90, "Ansage enthält mehr als die Namen");
  assert.equal(await page.$eval("#rad-live", e => e.getAttribute("aria-live")), "polite");
  await ctx.close();
});

await check("Lange Namen: Umbruch ohne Überlauf auf 320 px", async () => {
  const cs = (await import(new URL("../portfolio/nebeneinander-nacheinander/js/data/constellations.js", import.meta.url).href)).constellations;
  const longOnes = ["wendy-hui-kyong-chun", "n-katherine-hayles", "george-spencer-brown"].map(t => cs.find(c => c.theoristId === t));
  longOnes.push(cs.find(c => c.artistId === "felix-gonzalez-torres"));
  for (const r of longOnes) {
    const { ctx, page } = await open({ viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true }, `?pair=${r.id}`);
    await page.waitForTimeout(400);
    const o = await page.evaluate(() => ({ over: document.documentElement.scrollWidth > innerWidth, names: [...document.querySelectorAll(".rad-names span")].every(s => s.getBoundingClientRect().right <= innerWidth + 0.5) }));
    assert.deepEqual(o, { over: false, names: true }, r.id);
    await ctx.close();
  }
});

await check("Adressierung eines Datensatzes per ?pair= zeigt genau diesen Datensatz", async () => {
  const id = [...pairs][42];
  const { ctx, page } = await open({ viewport: { width: 1280, height: 900 } }, `?pair=${id}`);
  const s = await radState(page);
  assert.equal(s.state, "selected");
  assert.equal(s.cur.id, id);
  await ctx.close();
});

await check("Ohne ?debug keine Diagnose sichtbar", async () => {
  const { ctx, page } = await open({ viewport: { width: 1280, height: 900 } });
  assert.equal(await page.$(".rad-debug"), null);
  await ctx.close();
});

await check("Zehn Spins nacheinander: nur kuratierte Paare, nie zweimal direkt dasselbe", async () => {
  const { ctx, page, errors } = await open({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  let prev = null;
  for (let i = 0; i < 10; i += 1) {
    await page.focus(".rad-wheel");
    await page.keyboard.press("Enter");
    await waitSelected(page, 3000);
    const s = await assertLanding(page);
    assert.notEqual(s.cur.id, prev);
    prev = s.cur.id;
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});

await browser.close();
server.close();
console.log(results.join("\n"));
