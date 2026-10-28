// Struktur der Website – Browser-Tests (Playwright, Chromium), Neuordnung vom 2. Oktober 2026: das Menü (seit 10. Oktober 2026 vier Kästchen: Apps, Prompts, Web, Zettel; seit 19. Oktober 2026 fünf, dazu Social; seit dem Abend desselben Tags Art statt Web) auf allen Breiten,
// die Startseite (seit 9. Oktober 2026 Lead und drei Kästen; OMNA COLOR war vom 4. bis 9. Oktober 2026 eingebettet), die Seiten Apps, Masterprompts und Web (mit dem Stellenfeld).
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
// Die Startanimation (9. Oktober 2026) läuft in einer neuen Sitzung über der Startseite. Die übrigen Prüfungen laden die Startseite, als hätten sie sie schon gesehen;
// die Prüfungen «Startanimation …» unten legen ihre Kontexte mit neuerKontext an (ohne diese Marke).
const neuerKontext = browser.newContext.bind(browser);
browser.newContext = async (opts) => {
  const c = await neuerKontext(opts);
  await c.addInitScript(() => { try { sessionStorage.setItem("start-animation", "1"); } catch { /* ohne Speicher */ } });
  return c;
};
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
async function startseite(opts = {}, url = "/?bisher") {   // seit 20. Oktober 2026 leitet / in den Neubau (/b/); die bisherige Startseite unter /?bisher
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = fehler(page);
  await page.route(/\/b\/(en\/)?$/, (r) => r.fulfill({ status: 204 }));   // ohne Skript führte der meta refresh der Startseite nach /b/; 204 lässt die Seite stehen
  await page.goto(origin + url);
  return { ctx, page, errors };
}
const box = (loc) => loc.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; });
const sich = (a, b) => a.x < b.r - 0.5 && b.x < a.r - 0.5 && a.y < b.b - 0.5 && b.y < a.b - 0.5;     // Rechtecke überlappen

// ---------- Startseite: ein zufälliger Zettel ----------
// Seit 18. Oktober 2026 (Wunsch: «nach diesem coolen Intro passt für mich die Startseite mit dem OMNA-COLOR-Rad nicht mehr. Deshalb möchte ich die Seite mit
// dem Zettelkasten starten»; Entscheid: ein zufälliger Zettel): ohne Intro geht es sofort weiter, mit Intro an dessen Ende. OMNA COLOR (10. bis 18. Oktober
// 2026 hier) ist ein Beitrag auf «Web».
await check("Startseite: führt sofort zu einem zufälligen Zettel aus «Zu seiner Zeit» (jedes Mal ein anderer), dort das Menü mit «Zettel»; zurück führt nicht auf die Startseite", async () => {
  const ziele = new Set();
  for (let i = 0; i < 6; i++) {
    const { ctx, page, errors } = await startseite({ viewport: { width: 1200, height: 900 }, reducedMotion: "reduce" });
    await page.waitForURL(/\/zu-seiner-zeit\/strophe\/[^/]+\/$/);
    ziele.add(new URL(page.url()).pathname);
    assert.ok(await page.locator(".zsz-kopf").isVisible() && await page.locator(".menu").isVisible(), "der Zettel mit Kopf und Menü");
    assert.equal(await page.getByRole("navigation", { name: "Hauptmenü" }).getByRole("link", { name: "Zettel" }).getAttribute("aria-current"), "true");
    if (i === 0) { await page.goBack(); assert.equal(page.url(), "about:blank", "location.replace: zurück führt nicht auf die Startseite (sie leitete gleich wieder weiter)"); }
    assert.deepEqual(errors, []);
    await ctx.close();
  }
  assert.ok(ziele.size >= 2, `verschiedene Zettel (${[...ziele].join(", ")})`);
});

await check("Startseite ohne Skript: kein Zettel von selbst, ein Hinweis mit den Wegen in den Zettelkasten, Menü und Rückkanal", async () => {
  const { ctx, page, errors } = await startseite({ viewport: { width: 1200, height: 900 }, javaScriptEnabled: false });
  assert.equal(new URL(page.url()).pathname, "/");
  assert.deepEqual(await page.locator("main a").evaluateAll((as) => as.map((a) => a.getAttribute("href"))), ["zu-seiner-zeit/zufall/", "zu-seiner-zeit/"]);
  assert.ok(await page.locator(".menu").isVisible() && await page.locator(".rueckkanal").isVisible());
  assert.equal(await page.locator("iframe").count(), 0, "kein OMNA COLOR mehr");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Startseite (Handy): der Zettel mit Hauptlinks, darunter die Welle, darunter die sechs Kästchen des Menüs in einer Reihe; kein seitliches Wischen", async () => {
  for (const opts of [{ ...devices["Pixel 7"] }, { ...devices["iPhone 13"] }, { viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true }]) {
    const { ctx, page, errors } = await startseite({ ...opts, reducedMotion: "reduce" });
    await page.waitForURL(/\/zu-seiner-zeit\/strophe\//);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const m = await page.locator(".menu-item").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y)]; }));
    assert.equal(new Set(m.map((p) => p[1])).size, 1, "eine Reihe");
    assert.equal(new Set(m.map((p) => p[0])).size, 6, "sechs Spalten (seit 27. Oktober 2026 mit «Lab»)");
    const links = await box(page.locator(".seitenweg")), welle = await box(page.locator(".divider")), menu = await box(page.locator(".menu"));
    assert.ok(links.b <= welle.y + 1 && welle.b <= menu.y + 1 && menu.b <= page.viewportSize().height, "Hauptlinks, Welle, Menü, alles beim Laden im Fenster");
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

await check("Rückkanal in der Spalte der Seite, bündig mit dem Fuss, nie am Fensterrand (seit 5. Oktober 2026; seit 18. Oktober 2026 hier auf «Apps» geprüft, die Startseite führt weiter)", async () => {
  for (const opts of [{ viewport: { width: 1366, height: 657 } }, { ...devices["iPhone 13"] }, { viewport: { width: 1920, height: 1080 } }]) {
    const { ctx, page, errors } = await startseite({ ...opts, reducedMotion: "reduce" }, "/apps/");
    const kasten = await box(page.locator(".rueckkanal")), fuss = await box(page.locator(".site-footer p").first());
    const breite = page.viewportSize().width;
    assert.ok(kasten.x >= 19.5 && kasten.r <= breite - 19.5, `Rückkanal mit Rand (${kasten.x}–${kasten.r} von ${breite})`);
    assert.ok(Math.abs(kasten.x - fuss.x) <= 1, `Rückkanal bündig mit dem Fuss (${kasten.x} / ${fuss.x})`);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

// ---------- Menü ----------
await check("Menü: sechs Kästchen (Lab, Apps, Prompts, Zettel, Social, Art) mit Symbol auf allen Breiten in einer Reihe, gleich breit, nichts überlappt, kein seitliches Wischen; Handy unter der Welle, Computer rechts oben über der Welle", async () => {
  const ctx = await browser.newContext();
  for (const pfad of ["/apps/", "/masterprompts/", "/web/", "/news/", "/social-media/", "/zu-seiner-zeit/", "/zu-seiner-zeit/en/strophe/17-die-person/", "/alpha/sketchory/", "/art/", "/art/harbouring/"]) {
    for (const w of [320, 360, 390, 412, 600, 768, 1024, 1280]) {
      const page = await ctx.newPage();
      await page.addInitScript(() => { try { sessionStorage.setItem("start-animation", "1"); } catch {} });
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto(origin + pfad);
      const items = page.locator(".menu-item");
      assert.equal(await items.count(), 6);
      assert.deepEqual(await items.locator("span").allTextContents(), ["Beta", "Apps", "Prompts", "Zettel", "Social", "Art"], `${pfad} ${w}: Namen`);
      const bs = [];
      for (let i = 0; i < 6; i++) { assert.ok(await items.nth(i).isVisible(), `${pfad} ${w}: Kästchen ${i + 1} sichtbar`); bs.push(await box(items.nth(i))); }
      for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) assert.ok(!sich(bs[i], bs[j]), `${pfad} ${w}: Kästchen ${i + 1} und ${j + 1} überlappen`);
      assert.equal(new Set(bs.map((b) => Math.round(b.y))).size, 1, `${pfad} ${w}: eine Reihe`);
      // seit 19. Oktober 2026 fünf Kästchen: auf den schmalsten Handys (bis 400 px) mindestens 48 px breit, sonst wie vorher 60 px;
      // seit 27. Oktober 2026 sechs: auf 320 px noch 40 px, bis 440 px 54 px
      const minB = w <= 340 ? 40 : w <= 400 ? 48 : w <= 440 ? 54 : 60;
      assert.ok(bs.every((b) => Math.abs(b.w - bs[0].w) < 1 && b.w >= minB && b.h >= 56), `${pfad} ${w}: gleich gross, mindestens ${minB} × 56 px (${Math.round(bs[0].w)} × ${Math.round(bs[0].h)})`);
      for (let i = 0; i < 6; i++) {
        const svg = await box(items.nth(i).locator("svg"));
        assert.ok(svg.w >= 22 && svg.h >= 22, `${pfad} ${w}: Symbol ${i + 1} sichtbar`);
        const t = await items.nth(i).locator("span").evaluate((e) => e.scrollWidth <= e.clientWidth + 0.5);
        assert.ok(t, `${pfad} ${w}: Name ${i + 1} passt ins Kästchen`);
      }
      const nav = await box(page.locator(".seitenweg"));
      for (const [i, b] of bs.entries()) assert.ok(!sich(nav, b), `${pfad} ${w}: Navigation und Kästchen ${i + 1} überlappen`);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${pfad} ${w}: seitliches Wischen`);
      const leiste = await box(page.locator(".topbar"));
      for (const [i, b] of bs.entries()) assert.ok(b.x >= leiste.x - 1 && b.r <= leiste.r + 1 && b.r <= w, `${pfad} ${w}: Kästchen ${i + 1} liegt innerhalb der Seite`);
      // das Dritte Rad ohne Welle (es bleibt ohne Linie unter den Hauptlinks); sonst die Welle unter den Hauptlinks
      const welle = pfad.includes("drittes-rad") ? { y: nav.b + 10, b: nav.b + 10 } : await box(page.locator(".topbar .divider"));
      assert.ok(nav.b <= welle.y + 1, `${pfad} ${w}: die Welle steht unter den Hauptlinks`);
      if (w <= 760) {
        assert.ok(nav.b <= bs[0].y + 1 && Math.abs(bs[0].x - nav.x) <= 1 && (pfad.includes("drittes-rad") || welle.b <= bs[0].y + 1), `${pfad} ${w}: Handy: unter der Welle, linksbündig mit der Navigation`);
      } else {
        assert.ok(bs[0].b <= welle.y + 1 && Math.abs(bs.at(-1).r - leiste.r) <= 2, `${pfad} ${w}: Computer: rechts oben neben den Hauptlinks, die Welle unter beiden (${bs.at(-1).r} gegen ${leiste.r})`);
      }
      await page.close();
    }
  }
  await ctx.close();
});

await check("Menü: das Kästchen der Seite hat einen kräftigeren Rand (aria-current), die anderen nicht; Darüberfahren und Tastaturfokus zeigen sich", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await ctx.newPage();
  const rand = (name) => page.getByRole("navigation", { name: "Hauptmenü" }).getByRole("link", { name }).evaluate((e) => {
    const c = getComputedStyle(e);
    return { rand: c.borderTopColor, schatten: c.boxShadow, schrift: c.color, aktiv: e.getAttribute("aria-current") };
  });
  for (const [pfad, aktiv, art] of [["/apps/", "Apps", "page"], ["/masterprompts/", "Prompts", "page"], ["/art/", "Art", "page"], ["/art/harbouring/", "Art", "true"], ["/web/", null, null], ["/portfolio/nebeneinander-nacheinander/", "Apps", "true"], ["/zu-seiner-zeit/", "Zettel", "page"], ["/zu-seiner-zeit/strophe/17-die-person/", "Zettel", "true"], ["/alpha/sketchory/", null, null], ["/news/", null, null]]) {
    await page.goto(origin + pfad);
    for (const name of ["Apps", "Prompts", "Zettel", "Social", "Art"]) {
      const s = await rand(name);
      if (name === aktiv) {
        assert.equal(s.aktiv, art, `${pfad}: ${name} ist aktiv (${art})`);
        assert.ok(s.rand === s.schrift && s.schatten !== "none", `${pfad}: ${name} mit kräftigem Rand in der Schriftfarbe (${JSON.stringify(s)})`);
      } else {
        assert.equal(s.aktiv, null, `${pfad}: ${name} nicht aktiv`);
        assert.ok(s.rand !== s.schrift && s.schatten === "none", `${pfad}: ${name} mit feinem Rand`);
      }
    }
  }
  const warte = async (bedingung, text) => {
    const ende = Date.now() + 3000;
    for (;;) {
      if (await bedingung()) return;
      if (Date.now() > ende) assert.fail(text);
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  await page.goto(origin + "/apps/");
  await page.getByRole("navigation", { name: "Hauptmenü" }).getByRole("link", { name: "Art" }).hover();
  await warte(async () => { const s = await rand("Art"); return s.rand === s.schrift; }, "Darüberfahren: Rand in der Schriftfarbe");
  await page.mouse.move(5, 500);
  await warte(async () => { const s = await rand("Art"); return s.rand !== s.schrift; }, "Maus weg: wieder der feine Rand");
  await page.getByRole("navigation", { name: "Ornament Cloud" }).getByRole("link", { name: "Das Dritte Rad" }).focus();
  await page.keyboard.press("Tab");              // Tastaturfokus: erstes Kästchen des Menüs
  const f = await page.evaluate(() => { const e = document.activeElement, c = getComputedStyle(e); return { text: e.textContent, kontur: c.outlineStyle, breite: c.outlineWidth }; });
  assert.deepEqual(f, { text: "Apps", kontur: "solid", breite: "2px" });
  await ctx.close();
});

await check("Menü: serifenlose Schrift der Seite in mittlerem Gewicht (Wunsch vom 2. Oktober 2026: moderner als die frühere Serife); die Überschriften bleiben in der Serife", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await ctx.newPage();
  for (const pfad of ["/alpha/sketchory/", "/apps/", "/masterprompts/", "/web/", "/news/"]) {   // ORNA seit 20. Oktober 2026 in der Gestaltung des Neubaus (Instrument Sans als Schrift der Seite), ihr Kopf wird zum Kopf der App
    await page.goto(origin + pfad);
    const s = await page.evaluate(() => {
      const st = (e) => getComputedStyle(e);
      return { menu: [...document.querySelectorAll(".menu-item")].map((e) => ({ familie: st(e).fontFamily, gewicht: st(e).fontWeight, px: parseFloat(st(e).fontSize), aktiv: e.hasAttribute("aria-current") })),
        text: st(document.body).fontFamily, h1: st(document.querySelector("h1")).fontFamily };
    });
    assert.equal(s.menu.length, 6, pfad);   // seit 19. Oktober 2026 fünf Kästchen, seit 27. Oktober 2026 sechs
    for (const [i, m] of s.menu.entries()) {
      assert.equal(m.familie, s.text, `${pfad}: Eintrag ${i + 1} in der Schrift der Seite`);
      assert.ok(/^system-ui/.test(m.familie) && /sans-serif$/.test(m.familie) && !/Georgia|Times/.test(m.familie), `${pfad}: Eintrag ${i + 1} serifenlos (${m.familie})`);
      assert.equal(m.gewicht, "500", `${pfad}: Eintrag ${i + 1} im Gewicht 500, auch der aktive`);
      assert.ok(m.px >= 12.5, `${pfad}: Eintrag ${i + 1} mindestens 12,5 px gross (${m.px})`);
    }
    assert.ok(/Georgia/.test(s.h1), `${pfad}: die Überschrift bleibt in der Serife (${s.h1})`);
  }
  await ctx.close();
});

await check("Menü führt zu den Seiten: Apps, Prompts, Art und Zettel direkt in den Zettelkasten; auch von ORNA aus", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const page = await ctx.newPage();
  for (const [name, url, h1] of [["Zettel", /\/zu-seiner-zeit\/$/, "Zettelkasten"], ["Apps", /\/apps\/$/, "Apps"], ["Prompts", /\/masterprompts\/$/, "Masterprompts"], ["Art", /\/art\/$/, "Art"]]) {
    for (const von of ["/zu-seiner-zeit/strophe/17-die-person/", "/alpha/sketchory/", "/news/", "/portfolio/nebeneinander-nacheinander/feld/"]) {
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
  await page.getByRole("link", { name: "Alle Apps" }).click();            // seit 21. Oktober 2026 in den Neubau
  await page.waitForURL(/\/b\/apps\/$/);
  await ctx.close();
});

// ---------- Web ----------
await check("Videoseiten: ORNA (9 : 16, seit 9. Oktober 2026 hier statt auf der Startseite) und «Liebling …» (9 : 16) spielen von selbst, sobald sie zur Hälfte im Bild sind, und halten an, wenn sie das Bild verlassen; bei «weniger Bewegung» nicht", async () => {
  for (const [titel, adresse, format] of [["ORNA – Zufällige Begegnungen", /\/web\/orna-erklaervideo\/$/, 16 / 9], ["Liebling, ich habe den Poststrukturalismus strukturiert", /\/web\/poststrukturalismus\/$/, 16 / 9]]) for (const reducedMotion of ["no-preference", "reduce"]) {
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
    const v = page.locator(".erklaervideo video").first();
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

await check("Videoseite «Mensch, Niklas!» (seit 11. Oktober 2026 nur über die Adresse): das 3 : 4-Video spielt von selbst; die englische Fassung darunter spielt von selbst, sobald sie zur Hälfte im Bild ist, die deutsche hält dann an (7. Oktober 2026)", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  // gezählt wird der Aufruf von play() je Sprache (der Testbrowser spielt H.264 nicht unbedingt ab)
  await ctx.addInitScript(() => {
    window.__gespielt = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { window.__gespielt.push(this.closest("[lang]").lang); return play.call(this); };
  });
  const page = await ctx.newPage();
  const errors = fehler(page);
  await page.goto(origin + "/web/mensch-niklas/");
  const [de, en] = [page.locator(".erklaervideo video").first(), page.locator('.erklaervideo[lang="en"] video')];
  assert.equal(await page.locator(".erklaervideo video").count(), 3, "deutsch, englisch, spanisch");
  assert.equal(await en.evaluate((e) => e.muted), true, "stumm");
  const b = await box(de);
  assert.ok(Math.abs(b.h / b.w - 4 / 3) < 0.02, `Format ${b.w} × ${b.h}`);
  await en.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
  await page.waitForFunction(() => window.__gespielt.includes("en"), null, { timeout: 5000 });
  assert.equal(await de.evaluate((e) => e.paused), true, "die deutsche Fassung ist ausserhalb des Bildes angehalten");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Web: sechs Karten mit Bild (640 × 800; OMNA COLOR seit 19. Oktober 2026 auf «Apps»), zuoberst Sketchory (seit 12. Oktober 2026), dann The Fictory, zuunterst die Videos («Mensch, Niklas!» seit 11. Oktober 2026 nicht sichtbar), drei in einer Reihe; die Karten führen zu den Videoseiten, zu OMNA COLOR, zum Dritten Rad und zum Stellenfeld; die Stadt steht zurzeit nur auf Alpha (seit 10. Oktober 2026)", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const errors = fehler(page);
  await page.goto(origin + "/web/");
  await page.locator("main img").last().scrollIntoViewIfNeeded();
  await page.waitForFunction(() => [...document.querySelectorAll("main img")].every((i) => i.complete && i.naturalWidth > 0));
  assert.deepEqual(await page.locator("main img").evaluateAll((els) => els.map((i) => [i.naturalWidth, i.naturalHeight])), Array(6).fill([640, 800]));
  const ys = await page.locator("main .card").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().y)));
  assert.deepEqual(ys.length, 6);
  assert.ok(ys[0] === ys[1] && ys[1] === ys[2], "drei in einer Reihe");
  assert.ok(ys[3] > ys[2] && ys[3] === ys[4] && ys[4] === ys[5], "drei in der zweiten Reihe");
  assert.deepEqual(await page.locator("main .card h2").allTextContents(), ["Sketchory", "The Fictory", "Das Dritte Rad", "Stellenfeld", "ORNA – Zufällige Begegnungen", "Liebling, ich habe den Poststrukturalismus strukturiert"], "Reihenfolge: zuunterst die Videos");
  const t = await box(page.locator("main .thumb").first());
  assert.ok(Math.abs(t.h / t.w - 5 / 4) < 0.01, "Bild im Format 4 : 5");
  // die Karte nach ihrer Überschrift wählen (der Text des Dritten Rads nennt auch OMNA COLOR)
  const karte = (titel) => page.locator("main .card").filter({ has: page.getByRole("heading", { name: titel, exact: true }) });
  await page.goto(origin + "/apps/");                                // OMNA COLOR seit 19. Oktober 2026 auf «Apps»: «Im Browser spielen»
  await karte("OMNA COLOR").getByRole("link", { name: "Im Browser spielen" }).click();
  await page.waitForURL(/\/alpha\/omna-color\/$/);
  assert.ok(await page.locator("#wheel").isVisible());
  assert.ok(await page.locator(".app-kopf").isVisible(), "allein auf der Seite, mit dem Kopf der App (seit 20. Oktober 2026)");
  assert.equal(await page.evaluate(() => document.documentElement.classList.contains("eingebettet")), false);
  await page.goto(origin + "/web/");
  await karte("Das Dritte Rad").getByRole("link", { name: "Öffnen" }).click();
  await page.waitForURL(/\/alpha\/drittes-rad\/$/);
  await page.waitForFunction(() => window.radGeladen === true);
  assert.equal(await page.goBack().then(() => page.locator('main a[href*="alpha/stadt"]').count()), 0, "keine Karte zur Stadt auf «Web»");
  // die Stadt öffnet sich von der Alpha-Seite aus auch gleich im Vollbild
  await page.goto(origin + "/alpha/");
  await page.getByRole("link", { name: "Im Vollbild öffnen" }).click();
  await page.waitForURL(/\/alpha\/stadt\/\?vollbild$/);
  await page.waitForSelector(".stadt.bereit.vollbild", { timeout: 30000 });
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


// ---------- Startanimation (9. Oktober 2026) ----------
// Chromium der Prüfumgebung spielt kein H.264: Das Video wird ersetzt (Quelle merken, play() hängt), das Ende löst die Prüfung selbst aus.
const stubVideo = () => {
  window.__start = { src: [], play: 0 };
  Object.defineProperty(HTMLMediaElement.prototype, "src", { configurable: true, get() { return this.__src || ""; }, set(v) { window.__start.src.push(v); this.__src = v; } });
  HTMLMediaElement.prototype.play = function () { window.__start.play += 1; return new Promise(() => {}); };
  HTMLMediaElement.prototype.load = function () {};
};
async function startKontext(opts = {}, { stub = true, url = "/?bisher" } = {}) {
  const ctx = await neuerKontext({ viewport: { width: 1200, height: 800 }, ...opts });
  if (stub) await ctx.addInitScript(stubVideo);
  const page = await ctx.newPage();
  const errors = fehler(page);
  await page.route(/\/b\/(en\/)?$/, (r) => r.fulfill({ status: 204 }));   // wie in startseite(): ohne Skript bleibt die Seite stehen
  await page.goto(origin + url);
  return { ctx, page, errors };
}
const startAn = (page) => page.evaluate(() => document.documentElement.classList.contains("start-an"));
const startFrei = (page) => page.waitForFunction(() => !document.documentElement.classList.contains("start-an"), null, { timeout: 5000 });

await check("Startanimation: verweigert der Browser den Ton (noch nicht getippt), läuft das Intro stumm mit «Ton an»", async () => {
  const ctx = await neuerKontext({ viewport: { width: 1200, height: 800 } });
  await ctx.addInitScript(stubVideo);
  await ctx.addInitScript(() => {
    const stumm = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { if (!this.muted) { window.__start.play += 1; return Promise.reject(new DOMException("noch nicht getippt", "NotAllowedError")); } return stumm.call(this); };
  });
  const page = await ctx.newPage(), errors = fehler(page);
  await page.goto(origin + "/?bisher");
  await page.waitForFunction(() => window.__start.play >= 2);
  assert.equal(await startAn(page), true, "die Animation läuft weiter");
  assert.deepEqual(await page.evaluate(() => [document.querySelector("#start video").muted, document.querySelector(".start-ton").textContent, document.querySelector(".start-ton").getAttribute("aria-pressed")]), [true, "Ton an", "false"]);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Startanimation: neue Sitzung deckt die Seite schwarz ab, spielt das Intro mit Ton, sperrt die Seite dahinter; «Ton aus» / «Ton an» schaltet den Ton, ohne zu beenden; «Skip intro» führt zu einem Zettel, danach läuft sie nicht wieder", async () => {
  const { ctx, page, errors } = await startKontext();
  assert.equal(await startAn(page), true);
  const flaeche = await page.locator("#start").evaluate((e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return { w: r.width, h: r.height, pos: c.position, z: +c.zIndex, bg: c.backgroundColor, frei: document.documentElement.clientWidth }; });
  assert.deepEqual([flaeche.h, flaeche.pos], [800, "fixed"]);
  assert.ok(flaeche.frei - flaeche.w <= 20, "deckt das ganze Fenster (höchstens der reservierte Streifen des Bildlaufbalkens bleibt, scrollbar-gutter: stable)");
  assert.ok(flaeche.z >= 1000);
  assert.equal(flaeche.bg, "rgb(0, 0, 0)", "schwarz wie das Video");
  const v = await page.evaluate(() => window.__start);
  assert.deepEqual(v.src, ["assets/start-intro-quer.mp4?v=2"], "im Querformat die Fassung 16 : 9");
  assert.equal(v.play, 1, "einmal, mit Ton (der Browser lässt es hier zu)");
  const video = await page.locator("#start video").evaluate((e) => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, x: r.left + r.width / 2, y: r.top + r.height / 2, muted: e.muted }; });
  const [vw, vh] = await page.evaluate(() => [innerWidth, innerHeight]), voll = Math.min(vw, (vh * 16) / 9);   // wie 100vw / 100vh (mit dem Streifen des Bildlaufbalkens)
  assert.ok(Math.abs(video.w - 0.67 * voll) < 2 && Math.abs(video.w / video.h - 16 / 9) < 0.01 && !video.muted, `16 : 9, zwei Drittel so gross wie das Fenster («ein Drittel kleiner»), mit Ton (${video.w} × ${video.h})`);
  assert.ok(Math.abs(video.x - flaeche.w / 2) < 2 && Math.abs(video.y - flaeche.h / 2) < 2, `mittig im Schwarz (${video.x} / ${video.y})`);
  const knopf = await page.getByRole("button", { name: "Skip intro" }).evaluate((e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return { r: r.right, b: r.bottom, h: r.height, farbe: c.color, rand: c.borderTopColor, radius: parseFloat(c.borderTopLeftRadius), innen: innerWidth }; });
  assert.equal(knopf.farbe, "rgb(240, 138, 93)", "Schrift orange (auf Schwarz lesbar)");
  assert.equal(knopf.rand, "rgb(240, 138, 93)", "Rahmen orange");
  assert.ok(knopf.radius > 0 && knopf.radius <= 8, `nur leicht gerundet, keine Pille (${knopf.radius} px)`);
  assert.ok(knopf.h >= 44, "mindestens 44 px hoch");
  assert.equal(Math.round(800 - knopf.b), 24, "24 px über dem unteren Rand");
  assert.ok(knopf.innen - knopf.r >= 24 && knopf.innen - knopf.r <= 60, "unten rechts, mit Abstand zum Rand");
  assert.equal(await page.evaluate(() => sessionStorage.getItem("start-animation")), "1", "gemerkt, sobald sie läuft");
  assert.equal(await page.evaluate(() => document.querySelector("main").inert && document.querySelector("header").inert && document.querySelector("footer").inert && !document.getElementById("start").inert), true, "Kopf, Inhalt und Fuss sind gesperrt, die Animation nicht");
  assert.equal(await page.evaluate(() => document.documentElement.style.overflow), "hidden", "kein Blättern dahinter");
  // Ton aus und wieder an (seit 20. Oktober 2026 zuerst mit Ton, Wunsch: «defaultmässig auf Ton an»): die Animation läuft weiter
  const tonZustand = () => page.evaluate(() => [document.querySelector("#start video").muted, document.querySelector(".start-ton").textContent, document.querySelector(".start-ton").getAttribute("aria-pressed")]);
  assert.deepEqual(await tonZustand(), [false, "Ton aus", "true"], "zuerst mit Ton");
  const ton = page.getByRole("button", { name: "Ton aus" });
  const tk = await ton.evaluate((e) => { const r = e.getBoundingClientRect(); return { b: r.bottom, h: r.height, r: r.right }; });
  assert.ok(tk.h >= 44 && Math.round(800 - tk.b) === 24 && tk.r < knopf.r, "«Ton aus» links neben «Skip intro»");
  await ton.click();
  assert.deepEqual(await tonZustand(), [true, "Ton an", "false"], "stumm");
  assert.equal(await startAn(page), true, "«Ton aus» beendet die Animation nicht");
  await page.getByRole("button", { name: "Ton an" }).focus(); await page.keyboard.press("Enter");
  assert.deepEqual(await tonZustand(), [false, "Ton aus", "true"], "mit der Tastatur wieder mit Ton");
  assert.equal(await startAn(page), true, "auch die Taste auf «Ton an» beendet nichts");
  // seit 18. Oktober 2026: das Ende des Intros führt zu einem zufälligen Zettel (die schwarze Fläche bleibt bis dahin)
  await page.getByRole("button", { name: "Skip intro" }).click();
  await page.waitForURL(/\/zu-seiner-zeit\/strophe\/[^/]+\/$/);
  assert.equal(await page.evaluate(() => document.documentElement.style.overflow), "", "Blättern möglich");
  await page.goto(origin + "/?bisher");
  await page.waitForURL(/\/zu-seiner-zeit\/strophe\//);
  assert.equal(await startAn(page), false, "in derselben Sitzung läuft sie nicht noch einmal: gleich ein Zettel");
  assert.equal(await page.evaluate(() => window.__start.play), 0);
  await page.goto(origin + "/?start&bisher");
  assert.equal(await startAn(page), true, "?start zeigt sie wieder (Vorschau)");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Startanimation: im dunklen Modus dasselbe Intro auf Schwarz", async () => {
  const { ctx, page, errors } = await startKontext({ colorScheme: "dark" });
  assert.deepEqual((await page.evaluate(() => window.__start)).src, ["assets/start-intro-quer.mp4?v=2"]);
  assert.equal(await page.locator("#start").evaluate((e) => getComputedStyle(e).backgroundColor), "rgb(0, 0, 0)");
  assert.equal(await page.locator(".start-weiter").evaluate((e) => getComputedStyle(e).color), "rgb(240, 138, 93)");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Startanimation: hochkant (Telefon) die Fassung 4 : 5, so breit wie das Fenster", async () => {
  const { ctx, page, errors } = await startKontext({ viewport: { width: 390, height: 844 } });
  assert.deepEqual((await page.evaluate(() => window.__start)).src, ["assets/start-intro.mp4?v=3"]);
  const [w, h, breite] = await page.locator("#start video").evaluate((e) => { const r = e.getBoundingClientRect(); return [r.width, r.height, e.parentElement.getBoundingClientRect().width]; });
  assert.ok(Math.abs(w - breite) < 1 && Math.abs(w / h - 0.8) < 0.01, `4 : 5, so breit wie das Fenster (${w} × ${h})`);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Startanimation: bei «weniger Bewegung», bei «Daten sparen» und ohne Skript läuft sie nie", async () => {
  for (const [name, opts, init] of [["weniger Bewegung", { reducedMotion: "reduce" }, null], ["Daten sparen", {}, () => Object.defineProperty(navigator, "connection", { value: { saveData: true } })], ["ohne Skript", { javaScriptEnabled: false }, null]]) {
    const ctx = await neuerKontext({ viewport: { width: 1200, height: 800 }, ...opts });
    await ctx.addInitScript(stubVideo);
    if (init) await ctx.addInitScript(init);
    const page = await ctx.newPage();
    await page.route(/\/b\/(en\/)?$/, (r) => r.fulfill({ status: 204 }));   // ohne Skript bleibt die bisherige Startseite stehen (sonst der meta refresh nach /b/)
    await page.goto(origin + "/?bisher");
    if (opts.javaScriptEnabled === false) assert.equal(await page.locator("#start").evaluate((e) => getComputedStyle(e).display), "none", `${name}: nichts verdeckt die Seite`);
    else {
      await page.waitForURL(/\/zu-seiner-zeit\/strophe\//);                 // ohne Intro gleich ein Zettel
      assert.equal(await page.evaluate(() => window.__start.play), 0, `${name}: nichts wird geladen`);
    }
    assert.equal(await startAn(page), false, name);
    await page.goto(origin + "/?start&bisher");
    if (opts.reducedMotion) assert.equal(await startAn(page), false, "auch ?start hält sich an «weniger Bewegung»");
    await ctx.close();
  }
});

await check("Startanimation: Ende des Videos, Fehler, Tippen, Taste und abgelehntes play() führen zum Zettel", async () => {
  for (const [name, aktion] of [
    ["Ende", (page) => page.evaluate(() => document.querySelector("#start video").dispatchEvent(new Event("ended")))],
    ["Fehler", (page) => page.evaluate(() => document.querySelector("#start video").dispatchEvent(new Event("error")))],
    ["Tippen", (page) => page.mouse.click(300, 300)],
    ["Taste", (page) => page.keyboard.press("Escape")],
  ]) {
    const { ctx, page, errors } = await startKontext();
    assert.equal(await startAn(page), true, name);
    await aktion(page);
    await page.waitForURL(/\/zu-seiner-zeit\/strophe\//, { timeout: 5000 });
    assert.deepEqual(errors, [], name);
    await ctx.close();
  }
});

await check("Startanimation: lässt der Browser das Video nicht von selbst spielen, kommt die Seite sofort", async () => {
  const ctx = await neuerKontext({ viewport: { width: 1200, height: 800 } });
  await ctx.addInitScript(() => {
    Object.defineProperty(HTMLMediaElement.prototype, "src", { configurable: true, get() { return this.__src || ""; }, set(v) { this.__src = v; } });
    HTMLMediaElement.prototype.play = () => Promise.reject(new DOMException("blockiert", "NotAllowedError"));
    HTMLMediaElement.prototype.load = function () {};
  });
  const page = await ctx.newPage();
  await page.goto(origin + "/?bisher");
  await startFrei(page);
  await ctx.close();
});

await browser.close();
server.close();
const failed = results.filter((r) => r[0] !== "ok");
console.log(`\n${results.length - failed.length}/${results.length} ok`);
process.exit(failed.length ? 1 : 0);
