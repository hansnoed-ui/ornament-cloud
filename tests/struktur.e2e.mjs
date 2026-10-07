// Struktur der Website – Browser-Tests (Playwright, Chromium), Neuordnung vom 2. Oktober 2026: das Menü (Zettelkasten, Apps, Masterprompts, Web) auf allen Breiten,
// die Startseite mit OMNA COLOR zum Spielen (seit 4. Oktober 2026, eingebettet, der Rahmen wächst mit), die Seiten Apps, Masterprompts und Web (mit dem Stellenfeld).
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
async function startseite(opts = {}, url = "/") {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = fehler(page);
  await page.goto(origin + url);
  const frame = await rahmen(page);
  return { ctx, page, frame, errors };
}
/** Der Rahmen von OMNA COLOR, sobald das Rad gezeichnet ist und der Rahmen seine Höhe hat */
async function rahmen(page) {
  await page.waitForFunction(() => {
    const f = document.querySelector(".omna iframe"), d = f?.contentDocument;
    return d?.querySelectorAll("#outer path.seg").length > 0 && f.style.height;
  }, null, { timeout: 15000 });
  return page.frames().find((f) => f.url().endsWith("/alpha/omna-color/"));
}
/** Hat der Rahmen einen eigenen Bildlauf? (Inhalt höher als der Rahmen) */
const innenLauf = (frame) => frame.evaluate(() => document.body.getBoundingClientRect().height - innerHeight);
const box = (loc) => loc.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; });
const sich = (a, b) => a.x < b.r - 0.5 && b.x < a.r - 0.5 && a.y < b.b - 0.5 && b.y < a.b - 0.5;     // Rechtecke überlappen

// ---------- Startseite: OMNA COLOR zum Spielen ----------
await check("Startseite (Computer): kein sichtbarer Titel und kein Satz, unter der Welle OMNA COLOR eingebettet und spielbar; der Rahmen wächst mit der Übung, ohne eigenen Bildlauf", async () => {
  const { ctx, page, frame, errors } = await startseite({ viewport: { width: 1200, height: 900 }, reducedMotion: "reduce" });
  assert.equal(await page.locator("h1").textContent(), "Ornament Cloud");
  assert.equal(await page.locator("h1").evaluate((e) => e.getBoundingClientRect().width), 1, "der Titel ist nur für Vorlesegeräte da");
  assert.equal(await page.locator(".site-header .lead").count(), 0, "kein Satz mehr unter der Welle");
  assert.equal(await page.locator("main .card, main article").count(), 0, "kein Beitrag, keine Karte");
  const welle = await box(page.locator(".site-header .divider")), f = await box(page.locator(".omna iframe"));
  assert.ok(welle.b <= f.y + 1 && f.y - welle.b <= 120, `unter der Welle gleich das Spiel (${Math.round(f.y - welle.b)} px)`);
  assert.ok(await frame.evaluate(() => document.documentElement.classList.contains("eingebettet")), "OMNA COLOR erkennt die Einbettung");
  assert.equal(await frame.locator(".seitenweg").isVisible(), false, "keine zweiten Hauptlinks im Rahmen");
  assert.ok(await frame.locator("#wheel").isVisible() && await frame.locator("#go").isVisible(), "Rad und Knopf sind da");
  assert.ok(Math.abs(await innenLauf(frame)) <= 2, `der Rahmen ist so hoch wie das Spiel (${await innenLauf(frame)})`);
  assert.ok(f.w >= 1000, `so breit wie die Spalte (${f.w})`);
  const vorher = f.h;
  await frame.locator("#go").click();
  await frame.locator("#card").waitFor({ state: "visible", timeout: 8000 });
  assert.ok((await frame.locator("#card h2").textContent()).trim().length > 0, "eine Übung erscheint");
  await page.waitForTimeout(300);
  assert.ok(Math.abs(await innenLauf(frame)) <= 2, `auch mit der Übung kein eigener Bildlauf (${await innenLauf(frame)})`);
  assert.ok((await box(page.locator(".omna iframe"))).h >= vorher - 1, "der Rahmen wächst mit oder bleibt");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Startseite (Handy): Menü zwei mal zwei, OMNA COLOR so breit wie die Seite und spielbar (Tippen aufs Rad dreht), kein seitliches Wischen", async () => {
  const { ctx, page, frame, errors } = await startseite({ ...devices["Pixel 7"], reducedMotion: "reduce" });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const m = await page.locator(".menu-item").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y)]; }));
  assert.equal(new Set(m.map((p) => p[0])).size, 2, "zwei Spalten");
  assert.equal(new Set(m.map((p) => p[1])).size, 2, "zwei Zeilen");
  const f = await box(page.locator(".omna iframe"));
  assert.ok(f.x >= 0 && f.r <= 412 && f.w >= 330, `so breit wie die Seite (${f.x}–${f.r})`);
  const rad = await box(frame.locator("#wheel"));
  assert.ok(rad.w >= 300 && rad.r <= f.w + 1, `das Rad passt in den Rahmen (${rad.w})`);
  await frame.locator("#wheel").tap();
  await frame.locator("#card").waitFor({ state: "visible", timeout: 8000 });
  await page.waitForTimeout(300);
  assert.ok(Math.abs(await innenLauf(frame)) <= 2, "kein eigener Bildlauf im Rahmen");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "auch mit der Übung kein seitliches Wischen");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Startseite: «Drehen» steht beim Laden im Fenster (Laptop, iPhone), das Rad höchstens so gross wie auf der eigenen Seite; darunter Welle und Erklärvideo", async () => {
  for (const opts of [{ viewport: { width: 1366, height: 657 } }, { ...devices["iPhone 13"] }, { viewport: { width: 1920, height: 1080 } }]) {
    const { ctx, page, frame, errors } = await startseite(opts);
    const f = await box(page.locator(".omna iframe"));
    const knopf = await frame.locator("#go").evaluate((e) => e.getBoundingClientRect().bottom);
    const rad = await frame.locator("#wheel").evaluate((e) => e.getBoundingClientRect().width);
    const h = page.viewportSize().height;
    assert.ok(f.y + knopf <= h, `«Drehen» im Fenster (${Math.round(f.y + knopf)} von ${h})`);
    assert.ok(rad <= 420.5, `das Rad höchstens 420 px (${rad})`);
    const welle = await box(page.locator("main .divider")), video = await box(page.locator(".erklaervideo video"));
    assert.ok(f.y + f.h <= welle.y + 1 && welle.b <= video.y + 1, "Spiel, Welle, Video untereinander");
    assert.ok(video.h <= h, `das Video passt ins Fenster (${video.h} von ${h})`);
    // seit 5. Oktober 2026 eingemittet, die Bildunterschrift so breit wie das Video
    const mitte = await box(page.locator("main")), unter = await box(page.locator(".erklaervideo figcaption"));
    assert.ok(Math.abs(video.x + video.w / 2 - (mitte.x + mitte.w / 2)) <= 1, `das Video steht in der Mitte (${video.x}, ${video.w}, ${mitte.x}, ${mitte.w})`);
    assert.ok(Math.abs(unter.x - video.x) <= 1 && Math.abs(unter.w - video.w) <= 1, "Bildunterschrift bündig mit dem Video");
    assert.equal(await page.locator(".erklaervideo video").evaluate((v) => v.preload), "none", "das Video lädt erst beim Abspielen");
    // Rückkanal (seit 5. Oktober 2026): in der Spalte der Seite, bündig mit dem Fuss, nie am Fensterrand
    const kasten = await box(page.locator(".rueckkanal")), fuss = await box(page.locator(".site-footer p").first());
    const breite = page.viewportSize().width;
    assert.ok(kasten.x >= 19.5 && kasten.r <= breite - 19.5, `Rückkanal mit Rand (${kasten.x}–${kasten.r} von ${breite})`);
    assert.ok(Math.abs(kasten.x - fuss.x) <= 1, `Rückkanal bündig mit dem Fuss (${kasten.x} / ${fuss.x})`);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

await check("Startseite: das Erklärvideo spielt von selbst, sobald es im Bild ist, und hält an, wenn es das Bild verlässt; bei «weniger Bewegung» nicht (Wunsch vom 5. Oktober 2026)", async () => {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion });
    // play() und pause() zählen: der Testbrowser spielt H.264 nicht unbedingt ab, gezählt wird der Versuch
    await ctx.addInitScript(() => {
      window.__video = { play: 0, pause: 0 };
      const play = HTMLMediaElement.prototype.play, pause = HTMLMediaElement.prototype.pause;
      HTMLMediaElement.prototype.play = function () { window.__video.play += 1; return play.call(this); };
      HTMLMediaElement.prototype.pause = function () { window.__video.pause += 1; return pause.call(this); };
    });
    const page = await ctx.newPage();
    await page.goto(origin + "/");
    await rahmen(page);
    const v = page.locator(".erklaervideo video");
    assert.equal(await v.evaluate((e) => e.muted), true, "stumm, sonst spielt es nicht von selbst");
    await page.waitForTimeout(300);
    assert.equal((await page.evaluate(() => window.__video)).play, 0, "beim Laden (Video nicht im Bild) spielt nichts");
    await v.scrollIntoViewIfNeeded();
    if (reducedMotion === "reduce") {
      await page.waitForTimeout(500);
      assert.equal((await page.evaluate(() => window.__video)).play, 0, "bei «weniger Bewegung» nur auf Knopfdruck");
    } else {
      await page.waitForFunction(() => window.__video.play > 0, null, { timeout: 5000 });
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForTimeout(500);
      const n = await page.evaluate(() => window.__video);
      assert.ok(n.pause > 0 || (await v.evaluate((e) => e.paused)), "ausserhalb des Bildes angehalten");
    }
    await ctx.close();
  }
});

await check("Startseite: der Rahmen ist durchsichtig, das Spiel steht auf dem Grund der Seite (hell und dunkel)", async () => {
  for (const colorScheme of ["light", "dark"]) {
    const { ctx, page } = await startseite({ viewport: { width: 1200, height: 900 }, colorScheme });
    const f = await box(page.locator(".omna iframe"));
    // ein Punkt im Rahmen neben dem Rad (links oben), und einer auf der Seite darüber
    const bild = await page.screenshot({ clip: { x: f.x + 2, y: f.y + 2, width: 2, height: 2 } });
    const seite = await page.screenshot({ clip: { x: f.x + 2, y: f.y - 6, width: 2, height: 2 } });
    const farbe = (png) => page.evaluate(async (b64) => {
      const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
      const c = document.createElement("canvas"); c.width = c.height = 2; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
      return [...g.getImageData(0, 0, 1, 1).data.slice(0, 3)];
    }, png.toString("base64"));
    const [a, b] = [await farbe(bild), await farbe(seite)];
    assert.ok(a.every((v, i) => Math.abs(v - b[i]) <= 3), `${colorScheme}: im Rahmen ${a}, daneben ${b}`);
    await ctx.close();
  }
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
await check("Videoseiten: «Mensch, Niklas!» (3 : 4) und «Liebling …» (9 : 16) spielen von selbst, sobald sie zur Hälfte im Bild sind, und halten an, wenn sie das Bild verlassen; bei «weniger Bewegung» nicht", async () => {
  for (const [titel, adresse, format] of [["Mensch, Niklas!", /\/web\/mensch-niklas\/$/, 4 / 3], ["Liebling, ich habe den Poststrukturalismus strukturiert", /\/web\/poststrukturalismus\/$/, 16 / 9]]) for (const reducedMotion of ["no-preference", "reduce"]) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion });
    await ctx.addInitScript(() => {
      window.__video = { play: 0, pause: 0 };
      const play = HTMLMediaElement.prototype.play, pause = HTMLMediaElement.prototype.pause;
      HTMLMediaElement.prototype.play = function () { window.__video.play += 1; return play.call(this); };
      HTMLMediaElement.prototype.pause = function () { window.__video.pause += 1; return pause.call(this); };
    });
    const page = await ctx.newPage();
    await page.goto(origin + "/web/");
    await page.locator("main .card").filter({ has: page.getByRole("heading", { name: titel, exact: true }) }).getByRole("link", { name: "Öffnen" }).click();
    await page.waitForURL(adresse);
    const v = page.locator(".erklaervideo video");
    assert.equal(await v.evaluate((e) => e.muted), true, "stumm");
    assert.equal(await v.evaluate((e) => e.preload), "none");
    const b = await box(v);
    assert.ok(Math.abs(b.h / b.w - format) < 0.02, `${titel}: Format ${b.w} × ${b.h}`);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await v.scrollIntoViewIfNeeded();
    if (reducedMotion === "reduce") {
      await page.waitForTimeout(500);
      assert.equal((await page.evaluate(() => window.__video)).play, 0, "bei «weniger Bewegung» nur auf Knopfdruck");
      assert.ok(await v.isVisible(), "das Video bleibt mit Bedienelementen sichtbar");
    } else {
      await page.waitForFunction(() => window.__video.play > 0, null, { timeout: 5000 });
      // ganz nach oben und das Fenster niedrig machen: dann ist das Video sicher nicht mehr zur Hälfte im Bild (das grosse 3 : 4 bliebe es sonst)
      await page.setViewportSize({ width: 1366, height: 300 });
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForTimeout(500);
      const n = await page.evaluate(() => window.__video);
      assert.ok(n.pause > 0 || (await v.evaluate((e) => e.paused)), "ausserhalb des Bildes angehalten");
    }
    await ctx.close();
  }
});

await check("Web: fünf Karten mit Bild (640 × 800), zuoberst «Mensch, Niklas!», drei in einer Reihe; die Karten führen zu den Videoseiten, zu OMNA COLOR, zum Dritten Rad und zum Stellenfeld", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const errors = fehler(page);
  await page.goto(origin + "/web/");
  await page.locator("main img").last().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll("main img")].every((i) => i.complete && i.naturalWidth > 0));
  assert.deepEqual(await page.locator("main img").evaluateAll((els) => els.map((i) => [i.naturalWidth, i.naturalHeight])), [[640, 800], [640, 800], [640, 800], [640, 800], [640, 800]]);
  const ys = await page.locator("main .card").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().y)));
  assert.deepEqual(ys.length, 5);
  assert.equal(ys[0], ys[1], "nebeneinander");
  assert.equal(ys[1], ys[2], "drei in einer Reihe");
  const t = await box(page.locator("main .thumb").first());
  assert.ok(Math.abs(t.h / t.w - 5 / 4) < 0.01, "Bild im Format 4 : 5");
  // die Karte nach ihrer Überschrift wählen (der Text des Dritten Rads nennt auch OMNA COLOR)
  const karte = (titel) => page.locator("main .card").filter({ has: page.getByRole("heading", { name: titel, exact: true }) });
  await karte("OMNA COLOR").getByRole("link", { name: "Öffnen" }).click();
  await page.waitForURL(/\/alpha\/omna-color\/$/);
  assert.ok(await page.locator("#wheel").isVisible());
  assert.ok(await page.locator(".seitenweg").isVisible(), "allein auf der Seite mit den Hauptlinks");
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains("eingebettet")), false);
  await page.goBack();
  await karte("Das Dritte Rad").getByRole("link", { name: "Öffnen" }).click();
  await page.waitForURL(/\/alpha\/drittes-rad\/$/);
  await page.waitForFunction(() => window.radGeladen === true);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Web: «Stellenfeld» öffnet die Szene allein auf der Seite; dort gelten Mausrad-Zoom und Tastenkürzel", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await ctx.newPage();
  const errors = fehler(page);
  await page.goto(origin + "/web/");
  await page.locator("main .card").filter({ has: page.getByRole("heading", { name: "Stellenfeld", exact: true }) }).getByRole("link", { name: "Öffnen" }).click();
  await page.waitForURL(/\/werke\/stellenfeld\/$/);
  await page.waitForSelector("canvas");
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains("eingebettet")), false);
  assert.equal(await page.locator("canvas").evaluate((c) => getComputedStyle(c).touchAction), "none", "allein auf der Seite fängt die Szene jede Geste");
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

await browser.close();
server.close();
const failed = results.filter((r) => r[0] !== "ok");
console.log(`\n${results.length - failed.length}/${results.length} ok`);
process.exit(failed.length ? 1 : 0);
