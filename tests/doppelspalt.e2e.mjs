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
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".pdf": "application/pdf" };
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

// ---------- Paket 1: Adresse und Teilen ----------
await check("Adresse: nach jeder Drehung steht ?pair=<id> in der Leiste, ohne neuen Verlaufseintrag; Aufruf zeigt dieselbe Konstellation", async () => {
  const { ctx, page, errors } = await open({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const len0 = await page.evaluate(() => history.length);
  for (let i = 0; i < 3; i += 1) {
    await page.focus(".rad-wheel");
    await page.keyboard.press("Enter");
    await waitSelected(page, 3000);
    const s = await assertLanding(page);
    assert.equal(new URL(await page.evaluate(() => location.href)).searchParams.get("pair"), s.cur.id);
  }
  assert.equal(await page.evaluate(() => history.length), len0, "replaceState statt pushState");
  const url = await page.evaluate(() => location.href), id = new URL(url).searchParams.get("pair");
  await page.goto(url);
  await page.waitForFunction(() => document.querySelector(".rad-wheel").__rad.current);
  assert.equal((await radState(page)).cur.id, id);
  assert.equal(await page.$eval(".rad-result", r => r.dataset.pair), id);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Link kopieren: mit Tastatur erreichbar, kopiert die Adresse ohne ?debug, Rückmeldung in der Live-Region", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"] });
  await ctx.addInitScript(() => { Object.defineProperty(Navigator.prototype, "share", { value: undefined, configurable: true }); });
  const page = await ctx.newPage();
  await page.goto(base + "?debug");
  await page.waitForFunction(() => document.querySelector(".rad-wheel").__rad);
  await page.focus(".rad-wheel");
  await page.keyboard.press("Enter");
  await waitSelected(page, 3000);
  await page.waitForFunction(() => document.querySelector(".rad-actions").classList.contains("is-shown"), null, { timeout: 5000 });
  const id = (await radState(page)).cur.id;
  await page.focus(".rad-again");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.className), "rad-share");
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.getElementById("rad-live").textContent === "Link kopiert", null, { timeout: 3000 });
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const u = new URL(copied);
  assert.equal(u.searchParams.get("pair"), id);
  assert.equal(u.searchParams.has("debug"), false);
  await ctx.close();
});

await check("Teilen: navigator.share wird mit der Adresse aufgerufen, falls vorhanden", async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await ctx.addInitScript(() => { window.__shared = []; Object.defineProperty(Navigator.prototype, "share", { value: d => { window.__shared.push(d); return Promise.resolve(); }, configurable: true }); });
  const page = await ctx.newPage();
  await page.goto(base + "?pair=agnes-martin__niklas-luhmann");
  await page.waitForFunction(() => document.querySelector(".rad-wheel").__rad?.current);
  await page.click(".rad-share");
  const shared = await page.evaluate(() => window.__shared);
  assert.equal(shared.length, 1);
  assert.equal(new URL(shared[0].url).searchParams.get("pair"), "agnes-martin__niklas-luhmann");
  assert.match(shared[0].title, /Agnes Martin × Niklas Luhmann/);
  await ctx.close();
});

await check("Rückfall ohne Teilen und Zwischenablage: Adresse erscheint markiert zum Kopieren", async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  await ctx.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "share", { value: undefined, configurable: true });
    Object.defineProperty(Navigator.prototype, "clipboard", { value: undefined, configurable: true });
  });
  const page = await ctx.newPage();
  await page.goto(base + "?pair=agnes-martin__niklas-luhmann");
  await page.waitForFunction(() => document.querySelector(".rad-wheel").__rad?.current);
  await page.click(".rad-share");
  const r = await page.evaluate(() => { const i = document.querySelector(".rad-address input"); return { hidden: i.closest(".rad-address").hidden, value: i.value, focused: document.activeElement === i, sel: i.selectionEnd - i.selectionStart }; });
  assert.equal(r.hidden, false);
  assert.equal(new URL(r.value).searchParams.get("pair"), "agnes-martin__niklas-luhmann");
  assert.ok(r.focused && r.sel === r.value.length, "Adresse markiert");
  const sw = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  assert.ok(sw, "keine horizontale Verschiebung");
  await ctx.close();
});

// ---------- Paket 2: Feldansicht ----------
const feldUrl = base + "feld/";
await check("Feld ohne JavaScript, Desktop: Matrix 20 × 20 mit allen Konstellationen als Links, freie Felder leer", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(feldUrl);
  assert.equal(await page.$eval(".feld-matrix-wrap", e => getComputedStyle(e).display), "block");
  assert.equal(await page.$eval(".feld-liste", e => getComputedStyle(e).display), "none");
  assert.match(await page.$eval(".feld-legende", e => e.textContent), /Reihenfolge der Ringe, nicht alphabetisch/);
  const links = await page.$$eval(".feld-matrix a", as => as.map(a => new URL(a.href).searchParams.get("pair")));
  assert.equal(links.length, pairs.size);
  assert.deepEqual(new Set(links), pairs);
  assert.equal(await page.$$eval(".feld-matrix td.feld-leer", e => e.length), 400 - pairs.size);
  assert.equal(await page.$$eval(".feld-matrix td.feld-leer a", e => e.length), 0);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "horizontal");
  await ctx.close();
});

await check("Feld ohne JavaScript, Telefon 320 und 390 px: Liste statt Matrix, nichts rutscht horizontal weg", async () => {
  for (const width of [320, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, javaScriptEnabled: false, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(feldUrl);
    assert.equal(await page.$eval(".feld-matrix-wrap", e => getComputedStyle(e).display), "none");
    const links = await page.$$eval(".feld-person a", as => as.map(a => new URL(a.href).searchParams.get("pair")));
    assert.deepEqual(new Set(links), pairs);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `horizontal bei ${width}`);
    const mini = await page.$eval(".feld-mini", e => ({ w: e.getBoundingClientRect().width, right: e.getBoundingClientRect().right, hidden: e.getAttribute("aria-hidden") }));
    assert.ok(mini.w >= 270 && mini.right <= width, `Bild des Feldes ${JSON.stringify(mini)}`);
    assert.equal(mini.hidden, "true");
    await page.click(".feld-sprung a:nth-of-type(12)");
    assert.equal(await page.evaluate(() => location.hash), "#feld-sol-lewitt");
    await ctx.close();
  }
});

await check("Feld: ein Link führt zum Rad mit genau dieser Konstellation; Matrix per Tastatur erreichbar", async () => {
  const { ctx, page, errors } = await open({ viewport: { width: 1280, height: 900 } });
  await page.goto(feldUrl);
  const a = page.locator(".feld-matrix a").nth(17);
  const id = new URL(await a.evaluate(e => e.href)).searchParams.get("pair");
  await a.focus();
  assert.equal(await page.evaluate(() => document.activeElement.closest(".feld-matrix") !== null), true);
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector(".rad-wheel")?.__rad?.current);
  assert.equal((await radState(page)).cur.id, id);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Verweise auf das Feld: von der Radseite und vom Portfolio", async () => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base);
  assert.equal(await page.$eval('.rad-about a[href="feld/"]', a => a.textContent.includes("Das Feld")), true);
  await page.goto(new URL("../", base).href);
  assert.equal(await page.$$eval('a[href="nebeneinander-nacheinander/feld/"]', a => a.length), 1);
  await ctx.close();
});

// ---------- Paket 3: Namen am Rad und Legende ----------
const hitNames = page => page.evaluate(() => {
  const g = document.querySelector(".rad-hitnames"), [a, t] = g.querySelectorAll("textPath");
  return { shown: g.classList.contains("is-shown"), opacity: getComputedStyle(g).opacity, artist: a.textContent, theorist: t.textContent, hidden: g.getAttribute("aria-hidden") };
});
const legendHits = page => page.$$eval(".rad-legend li.is-hit", lis => lis.map(li => li.dataset.id));

await check("Namen am Rad: erst nach dem Stillstand, die beiden gezogenen, weg mit der nächsten Drehung; Legende hebt nur diese hervor, nie während der Drehung", async () => {
  const { ctx, page, errors } = await open({ viewport: { width: 1280, height: 900 } });
  const cs = (await import(new URL("../portfolio/nebeneinander-nacheinander/js/data/constellations.js", import.meta.url).href)).constellations;
  assert.equal((await hitNames(page)).shown, false);
  assert.deepEqual(await legendHits(page), []);
  await mouseArc(page, {});
  await page.waitForTimeout(300);
  assert.equal((await hitNames(page)).shown, false, "keine Namen während der Drehung");
  assert.deepEqual(await legendHits(page), [], "keine Hervorhebung während der Drehung");
  await waitSelected(page);
  const s = await assertLanding(page), rec = cs.find(c => c.id === s.cur.id);
  assert.deepEqual((await legendHits(page)).sort(), [rec.artistId, rec.theoristId].sort());
  await page.waitForFunction(() => document.querySelector(".rad-hitnames").classList.contains("is-shown"), null, { timeout: 3000 });
  const h = await hitNames(page);
  assert.equal(h.hidden, "true");
  assert.equal(h.artist, await page.$eval(".rad-artist", e => e.textContent));
  assert.equal(h.theorist, await page.$eval(".rad-theorist", e => e.textContent));
  await page.waitForTimeout(1500);
  await page.click(".rad-again");
  assert.equal((await hitNames(page)).shown, false, "weg mit Beginn der nächsten Drehung");
  assert.deepEqual(await legendHits(page), []);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Legende: voreingestellt geschlossen, Schalter per Tastatur, 40 Namen neben ihrem Zeichen in Ringreihenfolge", async () => {
  const { ctx, page } = await open({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const A = (await import(new URL("../portfolio/nebeneinander-nacheinander/js/data/artists.js", import.meta.url).href)).artists;
  const T = (await import(new URL("../portfolio/nebeneinander-nacheinander/js/data/theorists.js", import.meta.url).href)).theorists;
  assert.equal(await page.$eval(".rad-legend", e => e.hidden), true);
  assert.equal(await page.$eval(".rad-legend-toggle", e => e.getAttribute("aria-expanded")), "false");
  await page.focus(".rad-legend-toggle");
  await page.keyboard.press("Enter");
  assert.equal(await page.$eval(".rad-legend", e => e.hidden), false);
  assert.equal(await page.$eval(".rad-legend-toggle", e => e.getAttribute("aria-expanded")), "true");
  const cols = await page.$$eval(".rad-legend section", ss => ss.map(s => [...s.querySelectorAll("li")].map(li => ({ id: li.dataset.id, name: li.textContent, sym: !!li.querySelector("svg.rad-legend-sym path, svg.rad-legend-sym circle") }))));
  assert.deepEqual(cols[0].map(x => x.id), A.map(p => p.id));
  assert.deepEqual(cols[1].map(x => x.id), T.map(p => p.id));
  assert.ok(cols.flat().every(x => x.sym), "jedes Zeichen vorhanden");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "horizontal");
  await page.keyboard.press("Space");
  assert.equal(await page.$eval(".rad-legend", e => e.hidden), true);
  await ctx.close();
});

await check("Namen am Rad bei 375 px: lesbar gross, innerhalb des Rads, ohne Überlappung mit Ringen und Mitte", async () => {
  const { ctx, page } = await open({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true }, "?pair=felix-gonzalez-torres__wendy-hui-kyong-chun");
  await page.waitForFunction(() => document.querySelector(".rad-hitnames").classList.contains("is-shown"));
  const r = await page.evaluate(() => {
    const svg = document.querySelector(".rad-wheel"), box = svg.getBoundingClientRect(), k = box.width / 1000;
    const cx = box.left + box.width / 2, cy = box.top + box.height / 2;
    const texts = [...document.querySelectorAll(".rad-hitnames text")].map(t => {
      // Abstand aller Zeichen vom Mittelpunkt (in 1000er-Einheiten)
      const n = t.getNumberOfChars(), rs = [];
      for (let i = 0; i < n; i += 1) { const e = t.getExtentOfChar(i), m = svg.getScreenCTM(), p = new DOMPoint(e.x + e.width / 2, e.y + e.height / 2).matrixTransform(m); rs.push(Math.hypot(p.x - cx, p.y - cy) / k); }
      return { min: Math.min(...rs), max: Math.max(...rs) };
    });
    const fs = parseFloat(document.querySelector(".rad-hitnames").getAttribute("font-size")) * k;
    return { texts, fs, right: box.right, vw: innerWidth };
  });
  assert.ok(r.fs >= 10.5, `Schrift ${r.fs.toFixed(1)} px`);
  const [a, t] = r.texts;
  assert.ok(a.min > 462 && a.max < 500, `Künstler:in ausserhalb des Aussenrands: ${JSON.stringify(a)}`);
  assert.ok(t.max < 208 && t.min > 150, `Theoretiker:in an der Innenkante, Mitte frei: ${JSON.stringify(t)}`);
  assert.ok(r.right <= r.vw);
  await ctx.close();
});

await check("Reduzierte Bewegung: Namen am Rad ohne Ein- und Ausblenden", async () => {
  const { ctx, page } = await open({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" }, "?pair=agnes-martin__niklas-luhmann");
  assert.equal(await page.$eval(".rad-hitnames", e => getComputedStyle(e).transitionDuration), "0s");
  await ctx.close();
});

// ---------- Installierbare Web-App ----------
await check("App: Service Worker übernimmt, danach funktionieren Rad, Direktlink und Feld ohne Netz", async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", serviceWorkers: "allow" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(base);
  await page.waitForFunction(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && r.active); }, null, { timeout: 15000 });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 10000 });
  const manifest = await page.$eval('link[rel="manifest"]', l => l.href);
  assert.match(manifest, /app\.webmanifest$/);

  await ctx.setOffline(true);
  await page.goto(base);                                         // Start ohne Netz
  await page.waitForFunction(() => document.querySelector(".rad-wheel")?.__rad);
  await page.focus(".rad-wheel");
  await page.keyboard.press("Enter");
  await waitSelected(page, 4000);
  const s = await assertLanding(page);
  assert.ok(await page.$eval(".rad-text", e => e.textContent.length > 40), "Text offline vorhanden");

  await page.goto(base + "?pair=agnes-martin__niklas-luhmann");  // Direktlink ohne Netz
  await page.waitForFunction(() => document.querySelector(".rad-wheel")?.__rad?.current);
  assert.equal((await radState(page)).cur.id, "agnes-martin__niklas-luhmann");

  await page.goto(base + "feld/");                               // Feld ohne Netz
  assert.equal(await page.$$eval(".feld-matrix a, .feld-person a", a => a.length) > 0, true);
  await ctx.setOffline(false);
  assert.deepEqual(errors, []);
  assert.ok(s.cur.id);
  await ctx.close();
});

// ---------- ORNA: Startbild der App ----------
await check("ORNA-Startbild: das Rad setzt sich aus 40 Zeichen zusammen, gibt danach das Rad frei; Antippen überspringt", async () => {
  const { ctx, page, errors } = await open({ viewport: { width: 390, height: 844 } }, "?intro");
  await page.waitForSelector(".orna-intro.is-assembling");
  assert.equal(await page.$$eval(".orna-intro .orna-sym", e => e.length), 40);
  assert.equal(await page.$eval(".orna-name", e => e.textContent), "ORNA");
  assert.equal(await page.$eval(".orna-intro", e => e.getAttribute("aria-hidden")), "true");
  await page.waitForSelector(".orna-intro", { state: "detached", timeout: 6000 });
  await page.focus(".rad-wheel");
  await page.keyboard.press("Enter");
  await waitSelected(page);
  await assertLanding(page);
  await page.goto(base + "?intro");
  await page.waitForSelector(".orna-intro.is-assembling");
  await page.mouse.click(195, 400);
  await page.waitForSelector(".orna-intro", { state: "detached", timeout: 1500 });
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("ORNA-Startbild: nicht im normalen Browser, nicht bei reduzierter Bewegung", async () => {
  const a = await open({ viewport: { width: 390, height: 844 } });
  await a.page.waitForTimeout(300);
  assert.equal(await a.page.$(".orna-intro"), null);
  await a.ctx.close();
  const b = await open({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" }, "?intro");
  await b.page.waitForTimeout(300);
  assert.equal(await b.page.$(".orna-intro"), null);
  await b.ctx.close();
});

await check("ORNA-Startbild: vor der Animation blitzt die Seite nicht auf; ohne Startbild wird sie trotzdem sichtbar", async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.route("**/js/intro.js*", async r => { await new Promise(res => setTimeout(res, 1200)); r.continue(); });
  await page.goto(base + "?intro", { waitUntil: "commit" });
  await page.waitForSelector(".rad-stage", { state: "attached" });
  // solange das Startbild noch lädt, ist vom Rad nichts zu sehen
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains("orna-pre")), true);
  assert.equal(await page.$eval(".rad-stage", e => getComputedStyle(e).visibility), "hidden");
  await page.waitForSelector(".orna-intro");
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains("orna-pre")), false);
  await ctx.close();
  // kommt das Startbild gar nicht, erscheint die Seite nach kurzer Zeit dennoch
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx2.newPage();
  await p2.route("**/js/intro.js*", r => r.abort());
  await p2.goto(base + "?intro");
  await p2.waitForFunction(() => !document.documentElement.classList.contains("orna-pre"), null, { timeout: 6000 });
  assert.equal(await p2.$eval(".rad-stage", e => getComputedStyle(e).visibility), "visible");
  await ctx2.close();
  // im normalen Browser: gar nichts verborgen
  const c = await open({ viewport: { width: 390, height: 844 } });
  assert.equal(await c.page.evaluate(() => document.documentElement.classList.contains("orna-pre")), false);
  await c.ctx.close();
});

// ---------- Hinweis «Als App installieren» ----------
await check("Installationshinweis: Chrome/Android öffnet das Installationsfenster, iPhone erklärt die Schritte, sonst kein Hinweis", async () => {
  // ohne Installationsmöglichkeit: kein Hinweis
  const a = await open({ viewport: { width: 1280, height: 900 } });
  await a.page.waitForTimeout(300);
  assert.equal(await a.page.$eval(".rad-install", e => e.hidden), true);

  // Chrome/Android: Browser meldet «installierbar» → Knopf erscheint, Klick ruft das Installationsfenster
  await a.page.evaluate(() => {
    window.__prompted = 0;
    const e = new Event("beforeinstallprompt", { cancelable: true });
    e.prompt = () => { window.__prompted += 1; };
    e.userChoice = Promise.resolve({ outcome: "accepted" });
    dispatchEvent(e);
  });
  assert.equal(await a.page.$eval(".rad-install", e => e.hidden), false);
  await a.page.focus(".rad-install-btn");
  await a.page.keyboard.press("Enter");
  assert.equal(await a.page.evaluate(() => window.__prompted), 1);
  await a.page.waitForFunction(() => document.querySelector(".rad-install").hidden);
  await a.ctx.close();

  // iPhone: Knopf sichtbar, Klick zeigt die zwei Schritte
  const b = await open({ ...devices["iPhone 13"] });
  assert.equal(await b.page.$eval(".rad-install", e => e.hidden), false);
  assert.equal(await b.page.$eval(".rad-install-hilfe", e => e.hidden), true);
  await b.page.tap(".rad-install-btn");
  assert.equal(await b.page.$eval(".rad-install-hilfe", e => e.hidden), false);
  assert.equal(await b.page.$eval(".rad-install-btn", e => e.getAttribute("aria-expanded")), "true");
  assert.match(await b.page.$eval(".rad-install-hilfe", e => e.textContent), /Zum Home-Bildschirm/);
  assert.ok(await b.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await b.ctx.close();
});

await browser.close();
server.close();
console.log(results.join("\n"));
