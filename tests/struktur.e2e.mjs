// Struktur der Website – Browser-Tests (Playwright, Chromium), Neuordnung vom 2. Oktober 2026: das Menü (Zettelkasten, Apps, Masterprompts, Web) auf allen Breiten,
// die Startseite mit dem Stellenfeld, in die Seite eingebettet (Mausrad, Wischen, Pause ausserhalb des Bildes), die Seiten Apps, Masterprompts und Web.
//   NODE_PATH=$(npm root -g) node tests/struktur.e2e.mjs [Teil eines Prüfungsnamens]
// Das Stellenfeld braucht WebGL (Chromium bringt SwiftShader mit).
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
const origin = `http://localhost:${server.address().port}`;
const browser = await chromium.launch();
const results = [];
const nur = process.argv[2];            // nur Prüfungen, deren Name diesen Text enthält (zum Eingrenzen)
async function check(name, fn) {
  if (nur && !name.includes(nur)) return;
  try { await fn(); results.push(["ok", name]); console.log("ok  ", name); }
  catch (e) { results.push(["FAIL", name]); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 6).join("\n      ")); }
}
// Fehler der Seite; Anfragen ins Netz (Zählung) schlagen in der Prüfumgebung fehl und zählen nicht
function fehler(page) {
  const liste = [];
  page.on("pageerror", (e) => liste.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) liste.push(m.text()); });
  return liste;
}
/** Im Rahmen des Stellenfelds zählen: Bildschritte, Mausradereignisse, Zeigerereignisse der Szene */
const spaeher = () => {
  if (!location.pathname.includes("stellenfeld")) return;
  window.__raf = 0;
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => { window.__raf++; return raf(cb); };
  window.addEventListener("wheel", (e) => { window.__rad = { verhindert: e.defaultPrevented, strg: e.ctrlKey }; }, { passive: true });
  window.__zeiger = { runter: 0, bewegt: 0, abgebrochen: 0 };
  const haken = () => {
    const c = document.querySelector("canvas");
    if (!c) return setTimeout(haken, 50);
    c.addEventListener("pointerdown", () => window.__zeiger.runter++);
    c.addEventListener("pointermove", () => window.__zeiger.bewegt++);
    c.addEventListener("pointercancel", () => window.__zeiger.abgebrochen++);
  };
  haken();
};
async function startseite(opts = {}, url = "/") {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(spaeher);
  const page = await ctx.newPage();
  const errors = fehler(page);
  await page.goto(origin + url);
  const frame = await rahmen(page);
  return { ctx, page, frame, errors };
}
/** Der Rahmen des Stellenfelds, sobald die Szene steht (Canvas da) */
async function rahmen(page) {
  await page.waitForFunction(() => document.querySelector(".stellenfeld iframe")?.contentDocument?.querySelector("canvas"), null, { timeout: 15000 });
  return page.frames().find((f) => f.url().endsWith("/werke/stellenfeld/"));
}
const box = (loc) => loc.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; });
const sich = (a, b) => a.x < b.r - 0.5 && b.x < a.r - 0.5 && a.y < b.b - 0.5 && b.y < a.b - 0.5;     // Rechtecke überlappen

// ---------- Startseite ----------
await check("Startseite (Computer): kein sichtbarer Titel, der Satz grösser, darunter das Stellenfeld 16 : 9 in die Seite eingebettet; die Szene steht und läuft", async () => {
  const { ctx, page, frame, errors } = await startseite({ viewport: { width: 1200, height: 900 } });
  assert.equal(await page.locator("h1").textContent(), "Ornament Cloud");
  assert.equal(await page.locator("h1").evaluate((e) => e.getBoundingClientRect().width), 1, "der Titel ist nur für Vorlesegeräte da");
  const px = (sel) => page.locator(sel).evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  assert.ok(await px(".site-header .lead") >= 20, "der Satz ist grösser gesetzt");
  assert.equal(await page.locator("main .card, main article, main video").count(), 0, "kein Beitrag, keine Karte");
  const lead = await box(page.locator(".site-header .lead")), fig = await box(page.locator(".stellenfeld iframe"));
  assert.equal(await page.locator(".site-header .lead").textContent().then((t) => t.trim()), "Beobachtung ist Anlass für Veränderungen in der Realität.");
  assert.ok(lead.b <= fig.y + 1, `Satz und Stellenfeld untereinander: ${JSON.stringify([lead.y, lead.b, fig.y])}`);
  assert.ok(fig.w >= 1000 && Math.abs(fig.h / fig.w - 9 / 16) < 0.01, `16 : 9, ${fig.w} × ${fig.h}`);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.ok(await frame.evaluate(() => document.documentElement.classList.contains("eingebettet")), "das Stellenfeld erkennt, dass es eingebettet ist");
  const leinwand = await box(frame.locator("canvas"));
  assert.ok(Math.abs(leinwand.w - fig.w) < 1 && Math.abs(leinwand.h - fig.h) < 1, "die Szene füllt den Rahmen");
  // die Szene ist gezeichnet (kein leeres Schwarz) und bewegt sich
  const a = await page.locator(".stellenfeld iframe").screenshot();
  await page.waitForTimeout(900);
  const b = await page.locator(".stellenfeld iframe").screenshot();
  assert.ok(a.length > 20000, `die Szene ist gezeichnet (${a.length} Byte)`);
  assert.ok(!a.equals(b), "die Szene läuft");
  assert.equal(await frame.locator("#play").textContent(), "Pause");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Startseite (Handy): Satz, Menü zwei mal zwei, Stellenfeld 4 : 5, kein seitliches Wischen; bei «weniger Bewegung» steht die Szene still", async () => {
  const { ctx, page, frame, errors } = await startseite({ ...devices["Pixel 7"], reducedMotion: "reduce" });
  assert.ok(await page.locator(".site-header .lead").isVisible());
  const fig = await box(page.locator(".stellenfeld iframe"));
  assert.ok(Math.abs(fig.h / fig.w - 5 / 4) < 0.01, `4 : 5, ${fig.w} × ${fig.h}`);
  assert.ok(fig.w >= 340 && fig.r <= 412, "so breit wie die Seite");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const m = await page.locator(".menu-item").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y)]; }));
  assert.equal(new Set(m.map((p) => p[0])).size, 2, "zwei Spalten");
  assert.equal(new Set(m.map((p) => p[1])).size, 2, "zwei Zeilen");
  assert.equal(await frame.locator("#play").textContent(), "Abspielen", "ohne Bewegung beginnt die Szene angehalten");
  // die Bedienleiste blendet sich nach 2,6 s aus (in 0,5 s): erst danach ist das Bild ruhig
  await frame.waitForFunction(() => document.getElementById("bar").classList.contains("hidden"), null, { timeout: 8000 });
  await page.waitForTimeout(700);
  const a = await page.locator(".stellenfeld iframe").screenshot();
  await page.waitForTimeout(700);
  assert.ok((await page.locator(".stellenfeld iframe").screenshot()).equals(a), "die Szene steht still");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Startseite: «Als eigene Seite öffnen» zeigt dasselbe Stellenfeld allein auf der Seite; dort gelten Mausrad-Zoom und Tastenkürzel wie bisher", async () => {
  const { ctx, page, errors } = await startseite({ viewport: { width: 1200, height: 800 } });
  await page.getByRole("link", { name: "Als eigene Seite öffnen" }).click();
  await page.waitForURL(/\/werke\/stellenfeld\/$/);
  await page.waitForSelector("canvas");
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains("eingebettet")), false);
  assert.equal(await page.locator("canvas").evaluate((c) => getComputedStyle(c).touchAction), "none", "allein auf der Seite fängt die Szene jede Geste");
  // Mausrad zoomt (Ereignis abgefangen), Leertaste hält an
  await page.evaluate(() => window.addEventListener("wheel", (e) => { window.__verhindert = e.defaultPrevented; }, { passive: true }));
  await page.mouse.move(600, 400);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => window.__verhindert), true, "das Mausrad zoomt die Szene");
  assert.equal(await page.locator("#play").textContent(), "Pause");
  await page.keyboard.press("Space");
  assert.equal(await page.locator("#play").textContent(), "Abspielen", "Leertaste: anhalten");
  assert.deepEqual(errors, []);
  await ctx.close();
});

// ---------- Stellenfeld eingebettet: Mausrad, Tasten, Wischen, Pause ----------
await check("Stellenfeld eingebettet (Computer): das Mausrad blättert die Seite, Strg + Rad zoomt die Szene, die Leertaste hält nicht an", async () => {
  const { ctx, page, frame } = await startseite({ viewport: { width: 1200, height: 400 } });
  const fig = await box(page.locator(".stellenfeld iframe"));
  await page.evaluate(() => scrollTo(0, 300));
  await page.waitForTimeout(300);
  const y = (await box(page.locator(".stellenfeld iframe"))).y + 100;       // ein Punkt im Rahmen
  await page.mouse.move(fig.x + fig.w / 2, y);
  // mit Strg: die Seite bleibt, die Szene zoomt (Ereignis abgefangen)
  const y0 = await page.evaluate(() => scrollY);
  await page.keyboard.down("Control");
  await page.mouse.wheel(0, 200);
  await page.keyboard.up("Control");
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => scrollY), y0, "Strg + Rad blättert nicht");
  assert.deepEqual(await frame.evaluate(() => window.__rad), { verhindert: true, strg: true });
  // ohne Strg: die Seite blättert, die Szene fängt nichts ab
  await page.mouse.wheel(0, 150);
  await page.waitForTimeout(400);
  assert.ok(await page.evaluate(() => scrollY) > y0 + 100, "das Mausrad blättert die Seite");
  assert.deepEqual(await frame.evaluate(() => window.__rad), { verhindert: false, strg: false });
  // Tasten: in den Rahmen klicken, Leertaste: die Szene läuft weiter (die Seite soll blättern dürfen)
  await page.evaluate(() => scrollTo(0, 300));
  await page.mouse.click(fig.x + fig.w / 2, (await box(page.locator(".stellenfeld iframe"))).y + 100);
  await page.keyboard.press("Space");
  assert.equal(await frame.locator("#play").textContent(), "Pause");
  await ctx.close();
});

await check("Stellenfeld eingebettet (Computer): im Vollbild gelten Mausrad-Zoom und Tastenkürzel wieder wie auf der eigenen Seite", async () => {
  const { ctx, page, frame } = await startseite({ viewport: { width: 1200, height: 900 } });
  await frame.locator("#full").focus();
  await page.keyboard.press("Enter");                                    // die Tastatur zählt als Benutzeraktion, die Leiste muss nicht sichtbar sein
  await frame.waitForFunction(() => document.fullscreenElement === document.documentElement && innerWidth >= 1190 && innerHeight >= 890, null, { timeout: 8000 });
  assert.equal(await frame.locator("canvas").evaluate((c) => getComputedStyle(c).touchAction), "none", "im Vollbild fängt die Szene jede Geste");
  // nichts zum Blättern: das Mausrad zoomt auch ohne Strg, die Leertaste hält an
  await page.mouse.move(600, 400);
  await page.mouse.wheel(0, 200);
  await frame.waitForFunction(() => window.__rad, null, { timeout: 4000 });
  assert.deepEqual(await frame.evaluate(() => window.__rad), { verhindert: true, strg: false });
  assert.equal(await frame.locator("#play").textContent(), "Pause");
  await page.keyboard.press("Space");
  assert.equal(await frame.locator("#play").textContent(), "Abspielen", "im Vollbild hält die Leertaste an");
  await ctx.close();
});

await check("Stellenfeld eingebettet (Handy): senkrechtes Wischen blättert die Seite, waagrechtes Ziehen dreht die Szene", async () => {
  const { ctx, page, frame } = await startseite({ ...devices["Pixel 7"] });
  assert.equal(await frame.locator("canvas").evaluate((c) => getComputedStyle(c).touchAction), "pan-y");
  await page.evaluate(() => scrollTo(0, 100));
  await page.waitForTimeout(300);
  const cdp = await ctx.newCDPSession(page);
  const wisch = async (x, y, dx, dy, schritte = 12) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= schritte; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + dx * i / schritte, y: y + dy * i / schritte }] });
      await new Promise((r) => setTimeout(r, 16));
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(700);
  };
  const f = await box(page.locator(".stellenfeld iframe"));
  const y0 = await page.evaluate(() => scrollY);
  await wisch(Math.round(f.x + f.w / 2), Math.round(f.y + f.h / 3), 0, -200);
  const y1 = await page.evaluate(() => scrollY);
  assert.ok(y1 > y0 + 100, `die Seite blättert (${y0} → ${y1})`);
  assert.ok((await frame.evaluate(() => window.__zeiger)).abgebrochen >= 1, "der Browser übernimmt die Geste (pointercancel)");
  await frame.evaluate(() => { window.__zeiger = { runter: 0, bewegt: 0, abgebrochen: 0 }; });
  const g = await box(page.locator(".stellenfeld iframe"));
  await wisch(Math.round(g.x + g.w * 0.7), Math.round(g.y + g.h / 3), -150, 0);
  assert.equal(await page.evaluate(() => scrollY), y1, "waagrecht blättert nichts");
  const z = await frame.evaluate(() => window.__zeiger);
  assert.ok(z.bewegt >= 5 && z.abgebrochen === 0, `die Szene bekommt die Geste (${JSON.stringify(z)})`);
  await ctx.close();
});

await check("Stellenfeld eingebettet: ausserhalb des Bildes rechnet die Szene nicht, beim Zurückblättern läuft sie weiter", async () => {
  // Die Seite endet seit dem 2. Oktober 2026 nach dem Stellenfeld (die Rückmeldungen darunter sind weg): man kann den Rahmen nicht mehr nach oben aus dem Fenster blättern.
  // Ein niedriges Fenster legt ihn dafür von Anfang an unter den unteren Rand: Kopf und Satz stehen davor (seit dem 3. Oktober 2026 ohne Titel, darum 200 px).
  const { ctx, page, frame } = await startseite({ viewport: { width: 1200, height: 200 } });
  const lauf = async () => { const a = await frame.evaluate(() => window.__raf); await page.waitForTimeout(700); return [a, await frame.evaluate(() => window.__raf)]; };
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(1000);
  assert.ok((await box(page.locator(".stellenfeld iframe"))).y > 200, "der Rahmen liegt unter dem unteren Rand des Fensters");
  let [a, b] = await lauf();
  assert.equal(b, a, `ausserhalb des Bildes steht sie still (${a} → ${b})`);
  await page.evaluate(() => scrollTo(0, 340));
  await page.waitForTimeout(500);
  [a, b] = await lauf();
  assert.ok(b > a, `im Bild läuft sie (${a} → ${b})`);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(1000);
  [a, b] = await lauf();
  assert.equal(b, a, `wieder ausserhalb steht sie still (${a} → ${b})`);
  await page.evaluate(() => scrollTo(0, 340));
  await page.waitForTimeout(800);
  [a, b] = await lauf();
  assert.ok(b > a, `zurück im Bild läuft sie wieder (${a} → ${b})`);
  await ctx.close();
});

// ---------- Menü ----------
await check("Menü: vier Wörter auf allen Breiten sichtbar, nichts überlappt, kein seitliches Wischen; Computer in einer Reihe rechts, Handy zwei mal zwei", async () => {
  const ctx = await browser.newContext();
  for (const pfad of ["/apps/", "/masterprompts/", "/web/", "/news/"]) {
    for (const w of [320, 360, 390, 412, 600, 768, 1024, 1280]) {
      const page = await ctx.newPage();
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto(origin + pfad);
      const items = page.locator(".menu-item");
      assert.equal(await items.count(), 4);
      const bs = [];
      for (let i = 0; i < 4; i++) { assert.ok(await items.nth(i).isVisible(), `${pfad} ${w}: Eintrag ${i + 1} sichtbar`); bs.push(await box(items.nth(i))); }
      for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) assert.ok(!sich(bs[i], bs[j]), `${pfad} ${w}: Einträge ${i + 1} und ${j + 1} überlappen`);
      for (let i = 0; i < 3; i++) if (Math.round(bs[i].y) === Math.round(bs[i + 1].y)) assert.ok(bs[i + 1].x - bs[i].r >= 16, `${pfad} ${w}: zwischen den Einträgen ${i + 1} und ${i + 2} bleibt Luft (${bs[i + 1].x - bs[i].r} px)`);
      const nav = await box(page.locator(".seitenweg"));
      for (const [i, b] of bs.entries()) assert.ok(!sich(nav, b), `${pfad} ${w}: Navigation und Eintrag ${i + 1} überlappen`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${pfad} ${w}: seitliches Wischen`);
      const wrap = await box(page.locator(".site-header .wrap"));
      for (const [i, b] of bs.entries()) assert.ok(b.x >= wrap.x - 1 && b.r <= wrap.r + 1, `${pfad} ${w}: Eintrag ${i + 1} liegt innerhalb der Seite`);
      if (w <= 520) {
        assert.equal(new Set(bs.map((b) => Math.round(b.x))).size, 2, `${pfad} ${w}: zwei Spalten`);
        assert.equal(new Set(bs.map((b) => Math.round(b.y))).size, 2, `${pfad} ${w}: zwei Zeilen`);
      }
      if (w >= 1024) {
        assert.equal(new Set(bs.map((b) => Math.round(b.y))).size, 1, `${pfad} ${w}: eine Reihe`);
        assert.ok(Math.abs(bs[3].r - wrap.r + 20) <= 2, `${pfad} ${w}: rechtsbündig (${bs[3].r} gegen ${wrap.r - 20})`);
      }
      await page.close();
    }
  }
  await ctx.close();
});

await check("Menü: der Eintrag der Seite ist unterstrichen (aria-current), die anderen nicht; Darüberfahren und Tastaturfokus zeigen sich", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await ctx.newPage();
  const strich = (name) => page.getByRole("navigation", { name: "Hauptmenü" }).getByRole("link", { name }).evaluate((e) => {
    const c = getComputedStyle(e);
    return { unten: c.borderBottomColor, breite: c.borderBottomWidth, kontur: c.outlineStyle === "none" ? 0 : parseFloat(c.outlineWidth), schrift: c.color, aktiv: e.getAttribute("aria-current") };
  });
  const durchsichtig = (c) => /^rgba\(.*, 0\)$|^transparent$/.test(c);
  for (const [pfad, aktiv, art] of [["/apps/", "Apps", "page"], ["/masterprompts/", "Masterprompts", "page"], ["/web/", "Web", "page"], ["/portfolio/nebeneinander-nacheinander/", "Apps", "true"], ["/", null, null], ["/news/", null, null]]) {
    await page.goto(origin + pfad);
    for (const name of ["Zettelkasten", "Apps", "Masterprompts", "Web"]) {
      const s = await strich(name);
      if (name === aktiv) {
        assert.equal(s.aktiv, art, `${pfad}: ${name} ist aktiv (${art})`);
        assert.ok(!durchsichtig(s.unten) && s.breite === "1px" && s.unten === s.schrift, `${pfad}: ${name} unterstrichen in der Schriftfarbe (${JSON.stringify(s)})`);
      } else {
        assert.equal(s.aktiv, null, `${pfad}: ${name} nicht aktiv`);
        assert.ok(durchsichtig(s.unten), `${pfad}: ${name} ohne Strich`);
      }
    }
  }
  // der Strich blendet in 0,2 s ein und aus: so lange warten, bis die Farbe steht
  const warte = async (bedingung, text) => {
    const ende = Date.now() + 3000;
    for (;;) {
      if (await bedingung()) return;
      if (Date.now() > ende) assert.fail(text);
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  await page.goto(origin + "/apps/");
  await page.getByRole("navigation", { name: "Hauptmenü" }).getByRole("link", { name: "Web" }).hover();
  await warte(async () => { const s = await strich("Web"); return s.breite === "1px" && s.unten === s.schrift; }, "Darüberfahren: Strich in der Schriftfarbe");
  await page.mouse.move(5, 500);
  await warte(async () => durchsichtig((await strich("Web")).unten), "Maus weg: kein Strich mehr");
  await page.getByRole("navigation", { name: "Ornament Cloud" }).getByRole("link", { name: "Das Dritte Rad" }).focus();
  await page.keyboard.press("Tab");              // Tastaturfokus: erster Eintrag des Menüs
  const f = await page.evaluate(() => { const e = document.activeElement, c = getComputedStyle(e); return { text: e.textContent, kontur: c.outlineStyle, breite: c.outlineWidth }; });
  assert.deepEqual(f, { text: "Zettelkasten", kontur: "solid", breite: "2px" });
  await ctx.close();
});

await check("Menü: serifenlose Schrift der Seite in mittlerem Gewicht (Wunsch vom 2. Oktober 2026: moderner als die frühere Serife); die Überschriften bleiben in der Serife", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await ctx.newPage();
  for (const pfad of ["/", "/apps/", "/masterprompts/", "/web/", "/news/", "/portfolio/nebeneinander-nacheinander/"]) {
    await page.goto(origin + pfad);
    const s = await page.evaluate(() => {
      const st = (e) => getComputedStyle(e);
      return { menu: [...document.querySelectorAll(".menu-item")].map((e) => ({ familie: st(e).fontFamily, gewicht: st(e).fontWeight, px: parseFloat(st(e).fontSize), aktiv: e.hasAttribute("aria-current") })),
        text: st(document.body).fontFamily, h1: st(document.querySelector("h1")).fontFamily };
    });
    assert.equal(s.menu.length, 4, pfad);
    for (const [i, m] of s.menu.entries()) {
      assert.equal(m.familie, s.text, `${pfad}: Eintrag ${i + 1} in der Schrift der Seite`);
      assert.ok(/^system-ui/.test(m.familie) && /sans-serif$/.test(m.familie) && !/Georgia|Times/.test(m.familie), `${pfad}: Eintrag ${i + 1} serifenlos (${m.familie})`);
      assert.equal(m.gewicht, "500", `${pfad}: Eintrag ${i + 1} im Gewicht 500, auch der aktive`);
      assert.ok(m.px >= 16, `${pfad}: Eintrag ${i + 1} mindestens 16 px gross (${m.px})`);
    }
    assert.ok(/Georgia/.test(s.h1), `${pfad}: die Überschrift bleibt in der Serife (${s.h1})`);
  }
  await ctx.close();
});

await check("Menü führt zu den Seiten: Zettelkasten direkt in den Zettelkasten, Apps, Masterprompts, Web; auch von ORNA aus", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await ctx.newPage();
  for (const [name, url, h1] of [["Zettelkasten", /\/zu-seiner-zeit\/$/, "Zu seiner Zeit"], ["Apps", /\/apps\/$/, "Apps"], ["Masterprompts", /\/masterprompts\/$/, "Masterprompts"], ["Web", /\/web\/$/, "Web"]]) {
    for (const von of ["/", "/news/", "/portfolio/nebeneinander-nacheinander/feld/"]) {
      await page.goto(origin + von);
      await page.getByRole("navigation", { name: "Hauptmenü" }).getByRole("link", { name }).click();
      await page.waitForURL(url);
      assert.equal(await page.locator("h1").first().textContent(), h1, `${von} → ${name}`);
    }
  }
  // die Spur zurück: von ORNA und dem Feld zu den Apps, nicht mehr zum Portfolio
  await page.goto(origin + "/portfolio/nebeneinander-nacheinander/feld/");
  await page.locator(".work-kicker").getByRole("link", { name: "Apps" }).click();
  await page.waitForURL(/\/apps\/$/);
  await page.goto(origin + "/portfolio/nebeneinander-nacheinander/");
  await page.locator(".work-kicker").getByRole("link", { name: "Apps" }).click();
  await page.waitForURL(/\/apps\/$/);
  await page.goto(origin + "/portfolio/nebeneinander-nacheinander/");
  await page.getByRole("link", { name: "← Zu den Apps" }).click();
  await page.waitForURL(/\/apps\/$/);
  await ctx.close();
});

// ---------- Web ----------
await check("Web: beide Karten mit Bild (640 × 800, dunkel) nebeneinander; die Karten führen zu OMNA COLOR und zum Dritten Rad", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const errors = fehler(page);
  await page.goto(origin + "/web/");
  await page.locator("main img").last().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll("main img")].every((i) => i.complete && i.naturalWidth > 0));
  assert.deepEqual(await page.locator("main img").evaluateAll((els) => els.map((i) => [i.naturalWidth, i.naturalHeight])), [[640, 800], [640, 800]]);
  const ys = await page.locator("main .card").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().y)));
  assert.deepEqual(ys.length, 2);
  assert.equal(ys[0], ys[1], "nebeneinander");
  const t = await box(page.locator("main .thumb").first());
  assert.ok(Math.abs(t.h / t.w - 5 / 4) < 0.01, "Bild im Format 4 : 5");
  // die Karte nach ihrer Überschrift wählen (der Text des Dritten Rads nennt auch OMNA COLOR)
  const karte = (titel) => page.locator("main .card").filter({ has: page.getByRole("heading", { name: titel, exact: true }) });
  await karte("OMNA COLOR").getByRole("link", { name: "Öffnen" }).click();
  await page.waitForURL(/\/alpha\/omna-color\/$/);
  assert.ok(await page.locator("#wheel").isVisible());
  await page.goBack();
  await karte("Das Dritte Rad").getByRole("link", { name: "Öffnen" }).click();
  await page.waitForURL(/\/alpha\/drittes-rad\/$/);
  await page.waitForFunction(() => window.radGeladen === true);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await browser.close();
server.close();
const failed = results.filter((r) => r[0] !== "ok");
console.log(`\n${results.length - failed.length}/${results.length} ok`);
process.exit(failed.length ? 1 : 0);
