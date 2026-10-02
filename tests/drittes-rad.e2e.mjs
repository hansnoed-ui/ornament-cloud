// «Das Dritte Rad» – Browser-Tests (Playwright, Chromium): Rad ohne Text, Karten, Lesen im Rad, vier Wege, Rückkehr, Verlauf,
// Leiste auf den Originalseiten (Zettelkasten, ORNA, OMNA COLOR), Handy, alte Module im Zwischenspeicher (wie bei GitHub Pages), Hinweis bei Ladefehler.
//   NODE_PATH=$(npm root -g) node tests/drittes-rad.e2e.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const { chromium } = playwright;

const root = new URL("../", import.meta.url);
const { startServer } = await import(new URL("tools/serve-orma.mjs", root).href);
const E = await import(new URL("alpha/drittes-rad/engine.js", root).href);
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
const zufall = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const rel = (u) => u.replace(E.WURZEL, "");              // die Engine kennt im Test die Dateiwurzel, der Server die Adresse
const BEREICHE = ["rad", "zeit", "form", "farbe"], LABEL = ["Das Dritte Rad", "Zettelkasten", "ORNA", "OMNA COLOR"];
const kacheln = (page, wo) => page.locator(`${wo} a.drad-kachel`).evaluateAll((a) => a.map((x) => ({
  bereich: x.dataset.bereich, label: x.querySelector("small").textContent, titel: x.querySelector("b").textContent,
  grund: x.querySelector("em").textContent, href: x.getAttribute("href"), hier: x.classList.contains("hier"),
})));
const text = (page, sel) => page.locator(sel).first().textContent();
/** Abstand in px vom Ende des Titels bis zum oberen Rand des Rads, und vom unteren Rand des Rads bis zu den Knöpfen «Drehen» und «Brücke» */
const luftUnterTitel = (page) => page.evaluate(() => document.getElementById("wheel").getBoundingClientRect().top - document.querySelector("h1").getBoundingClientRect().bottom);
const luftUnterRad = (page) => page.evaluate(() => document.getElementById("go").getBoundingClientRect().top - document.getElementById("wheel").getBoundingClientRect().bottom);
/** Links in der Radseite (Karten, Lesen, Wege), die nicht im Rad selbst bleiben, also auf Originalseiten oder sonst woanders hin führen */
const ausDemRad = (page) => page.locator("main a[href]").evaluateAll((a) => a.map((x) => new URL(x.href, location.href)).filter((u) => u.origin !== location.origin || u.pathname !== location.pathname).map((u) => u.href));

/** Nachbildung von GitHub Pages: der Browser darf jede Datei zehn Minuten ohne Nachfrage behalten (Cache-Control: max-age=600), der Test-Server oben sagt dagegen no-cache.
 *  Mit alt.set(pfad, text) liefert sie für den Pfad (ohne Abfrage) vorübergehend eine ältere Fassung. Hat der Browser sie einmal geholt, hält er sie auch nach der «Aktualisierung».
 *  /probe holt die vier Module des Rads unter ihren Adressen ohne Marke und meldet deren Namen. */
async function pagesNachbildung() {
  const alt = new Map(), ursprung = base.replace("localhost", "127.0.0.1");
  const server = createServer(async (req, res) => {
    const u = new URL(req.url, "http://x");
    if (u.pathname === "/probe") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(`<!doctype html><meta charset="utf-8"><title>probe</title><script type="module">
        window.geholt = Object.fromEntries(await Promise.all(["engine", "kacheln", "daten", "jev"].map(async (n) => [n, Object.keys(await import("/alpha/drittes-rad/" + n + ".js"))])));
        window.fertig = true;</script>`);
      return;
    }
    if (alt.has(u.pathname) && !u.search) { res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "max-age=600" }); res.end(alt.get(u.pathname)); return; }
    const r = await fetch(ursprung + u.pathname.slice(1) + u.search);
    res.writeHead(r.status, { "content-type": r.headers.get("content-type") ?? "text/plain", "cache-control": "max-age=600" });
    res.end(Buffer.from(await r.arrayBuffer()));
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  return { alt, base: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() };
}

// ein fester Stand: Konstellation Sol LeWitt × Henri Bergson mit der Strophe und der Übung, die das Rad dazu findet
const z0 = E.rueckkehr({ art: "paar", id: "sol-lewitt__henri-bergson" }, zufall(7));
const ST = { strophe: z0.strophe, paar: z0.paar, uebung: z0.uebung, person: z0.person };
const stUrl = (fokus) => rel(E.adresse.spiel(ST, fokus));
const zeitTitel = (s) => `${s.n} · ${s.t}`, formTitel = (c) => `${E.nameVon(c.artistId)} × ${E.nameVon(c.theoristId)}`;

await check("Rad: Drehen zeigt drei Karten und eine Adresse, die den Stand wiederherstellt; Zurück im Verlauf", async () => {
  const { ctx, page, errors } = await open("alpha/drittes-rad/");
  assert.equal(await page.locator("#result").isHidden(), true);
  await page.click("#go");
  await page.locator("#result").waitFor({ state: "visible" });
  const karten = () => page.locator("#result h2 a").evaluateAll(a => a.map(x => x.getAttribute("href")));
  const links = await karten();
  assert.equal(links.length, 3);
  ["zeit", "form", "farbe"].forEach((f, i) => assert.match(links[i], new RegExp(`/alpha/drittes-rad/\\?t=[^&]+&f=${f}$`), "jede Karte öffnet ihr Stück im Rad"));
  assert.match(page.url(), /\?t=[^&]+$/);
  const url = page.url();
  await page.goto("about:blank");
  await page.goto(url);                                    // Rückkehr: gleiche Karten ohne Drehen
  assert.equal(await page.locator("#result").isVisible(), true);
  assert.deepEqual(await karten(), links);
  // zweites Drehen legt einen Verlaufseintrag an, «Zurück» bringt den ersten Stand wieder
  await page.click("#go");
  await page.waitForFunction((u) => location.href !== u && !document.getElementById("go").disabled, url);
  await page.goBack();
  await page.waitForFunction((u) => location.href === u, url);
  assert.deepEqual(await karten(), links);
  // Tastatur: das Rad dreht auf Enter
  await page.locator("#wheel").focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction((u) => location.href !== u && !document.getElementById("go").disabled, url);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Schlichte Seite: unter dem Titel steht nichts, «Drehen» und «Brücke» sehen gleich aus, kein «Zurück zum Start», kein Kasten «Fäden», keine Links zu den Originalseiten, keine Texteingaben", async () => {
  const { ctx, page, errors } = await open("alpha/drittes-rad/");
  assert.equal((await page.locator("header").innerText()).trim(), "Das Dritte Rad", "nur der Titel");
  assert.deepEqual(await page.locator(".wheelbox .row button").allTextContents(), ["Drehen", "Brücke"], "zwei Knöpfe unter dem Rad");
  const stil = (id) => page.locator(id).evaluate((b) => { const c = getComputedStyle(b); return Object.fromEntries(["fontSize", "fontWeight", "letterSpacing", "textTransform", "color", "borderTopColor", "borderTopWidth", "borderRadius",
    "paddingTop", "paddingLeft", "boxShadow", "backgroundColor"].map((k) => [k, c[k]])); });
  assert.deepEqual(await stil("#bridge"), await stil("#go"), "«Brücke» ist wie «Drehen» gestaltet");
  assert.equal(await page.locator("#bridge").getAttribute("aria-label"), "Brücke schlagen", "vorgelesen bleibt es verständlich");
  assert.ok(await luftUnterTitel(page) >= 48, "zwischen Titel und Rad ist mehr Luft als die früheren 28 px");
  assert.ok(await luftUnterRad(page) >= 28, "zwischen Rad und den Knöpfen ist mehr Luft als die früheren 14 px");
  const kein = async () => {
    assert.equal(await page.locator("#start, #faeden, .drad-start").count(), 0);
    assert.equal(await page.locator("button, a", { hasText: /Zurück zum Start/ }).count(), 0, "kein «Zurück zum Start»");
    assert.equal(await page.locator("h3", { hasText: /^Fäden$/ }).count(), 0, "kein Kasten «Fäden»");
    assert.equal(await page.locator("a", { hasText: "öffnen ↗" }).count(), 0, "keine Links «… öffnen ↗» zu den Originalseiten");
    assert.deepEqual(await ausDemRad(page), [], "alle Links bleiben im Rad");
    assert.equal(await page.locator("textarea, input, select, label, [contenteditable]").count(), 0, "keine Texteingaben");
  };
  await kein();
  await page.click("#go");
  await page.locator("#result").waitFor({ state: "visible" });
  await kein();
  await page.click("#bridge");
  await page.waitForFunction(() => !document.getElementById("bridge").disabled);
  await page.locator("#result").waitFor({ state: "visible" });
  await kein();
  for (const fokus of ["form", "zeit", "farbe"]) {                  // alle drei Ansichten zum Lesen
    await page.goto(base + stUrl(fokus));
    await page.locator("#lese").waitFor({ state: "visible" });
    await kein();
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Rad: unter den Karten nur «Karte kopieren» und «Noch einmal drehen»; kopiert wird die Karte ohne Satz, ohne Fehler; «Noch einmal drehen» dreht neu", async () => {
  const { ctx, page, errors } = await open(stUrl());
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.locator("#result").waitFor({ state: "visible" });
  assert.deepEqual(await page.locator("#result .row button").allTextContents(), ["Karte kopieren", "Noch einmal drehen"]);
  await page.click("#copy");
  await page.waitForFunction(() => document.getElementById("copy").textContent === "Kopiert");
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()),
    ["Das Dritte Rad", `Zeit: ${zeitTitel(ST.strophe)}`, `Form: ${formTitel(ST.paar)}`, `Farbe: ${ST.uebung.n} (${ST.uebung.t})`].join("\n"), "die Karte, ohne Satz und ohne leere Zeile am Ende");
  await page.click("#again");
  await page.waitForFunction(() => !document.getElementById("go").disabled);
  await page.locator("#result").waitFor({ state: "visible" });
  assert.equal(await page.locator("#result h2 a").count(), 3, "neue Karten");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Rad: kein Text und keine Zahlen im Rad, Schrift Instrument Sans wie in den anderen Fassungen", async () => {
  const { ctx, page, errors } = await open("alpha/drittes-rad/");
  assert.equal(await page.locator("#svg text, #svg textPath, #svg tspan").count(), 0);
  assert.equal((await page.locator("#svg").evaluate(s => s.textContent)).trim(), "", "nicht einmal ein Text-Knoten im Rad");
  assert.ok(await page.locator("#svg path").count() > 100, "das Rad ist gezeichnet (Zeichen, Dreiecke, Siegel)");
  await page.click("#go");
  await page.locator("#result").waitFor({ state: "visible" });
  await page.click("#cZeit h2 a");
  await page.locator("#lese").waitFor({ state: "visible" });
  const s = await page.evaluate(async () => {
    await document.fonts.ready;
    const f = (sel) => { const c = getComputedStyle(document.querySelector(sel)); return [c.fontFamily, c.fontStyle]; };
    return { felder: ["body", "h1", "#lese h2", "#lese .text", "#wege .drad-kachel b", "button.go"].map(f),
      geladen: [...document.fonts].some(x => x.family.replace(/["']/g, "") === "Instrument Sans" && x.status === "loaded") };
  });
  for (const [familie, stil] of s.felder) { assert.match(familie, /^"?Instrument Sans"?,/); assert.equal(stil, "normal", "keine Kursive"); }
  assert.equal(s.geladen, true, "die lokale Schrift ist geladen");
  assert.equal(await page.locator("#svg text").count(), 0);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Rad: «Brücke» nennt die Brücke und zeigt drei Karten", async () => {
  const { ctx, page, errors } = await open("alpha/drittes-rad/");
  await page.click("#bridge");
  await page.locator("#result").waitFor({ state: "visible" });
  assert.match(await page.locator("#note").textContent(), /^(Brücke: |Brücke nach jev: |Eine absurde Brücke)/);
  assert.equal(await page.locator("#result h2 a").count(), 3);
  assert.match(page.url(), /\?t=/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Rad: jede Karte öffnet ihr Stück im Rad (ganze Strophe, ganze Begegnung, ganze Übung), mit den vier Wegen darüber; Zurück bringt die Karten wieder", async () => {
  const { ctx, page, errors } = await open(stUrl());
  await page.locator("#result").waitFor({ state: "visible" });
  const kartenVorher = await page.locator("#result").innerText();
  assert.deepEqual(await ausDemRad(page), [], "auch die Karten verlinken nur ins Rad");
  const e = ST.uebung, c = ST.paar, s = ST.strophe;
  const lesen = {
    zeit: async () => {
      assert.equal(await text(page, "#lese h2"), zeitTitel(s));
      assert.equal(await page.locator("#lese p.text").count(), s.x.split(/\n{2,}/).length, "der ganze Text");
      assert.equal(await text(page, "#lese .lead"), s.b);
      assert.ok(await page.locator("#lese h3", { hasText: "Verweise" }).count());
    },
    form: async () => {
      assert.equal(await text(page, "#lese h2"), formTitel(c));
      assert.equal(await page.locator("#lese .zeichen-paar figure").count(), 2, "beide Zeichen");
      assert.equal(await text(page, "#lese p.text"), c.text);
      assert.ok((await text(page, "#lese .frage")).includes(c.question));
    },
    farbe: async () => {
      assert.equal(await text(page, "#lese h2"), e.n);
      assert.equal(await text(page, "#lese .chip"), `Thema ${e.t}`);
      assert.ok((await page.locator("#lese .chips").innerText()).includes(`${e.d} Min.`) && (await page.locator("#lese .chips").innerText()).includes("Goethe 1809"));
      assert.ok((await page.locator("#lese").innerText()).includes("Material: " + e.m));
      assert.equal(await text(page, "#lese p.text"), e.a);
      assert.ok((await text(page, "#lese .frage")).includes(e.f));
    },
  };
  for (const [karte, fokus] of [["#cZeit", "zeit"], ["#cForm", "form"], ["#cFarbe", "farbe"]]) {
    await page.click(`${karte} h2 a`);
    await page.locator("#lese").waitFor({ state: "visible" });
    assert.equal(await page.locator("#result").isHidden(), true, "die Karten machen dem offenen Stück Platz");
    assert.equal(new URL(page.url()).pathname, "/alpha/drittes-rad/", "kein Neuladen, kein Seitenwechsel");
    assert.match(page.url(), new RegExp(`&f=${fokus}$`));
    assert.equal(await page.locator("#wheel").getAttribute("data-fokus"), fokus, "der Ring des offenen Stücks leuchtet");
    assert.equal(await page.evaluate(() => document.activeElement?.closest("#lese") !== null && document.activeElement.tagName), "H2", "der Fokus liegt auf der Überschrift");
    await lesen[fokus]();
    assert.deepEqual(await ausDemRad(page), [], "kein Link führt aus dem Rad auf eine Originalseite («… öffnen ↗» gibt es nicht mehr)");
    const k = await kacheln(page, "#wege");
    assert.deepEqual(k.map(x => x.bereich), BEREICHE, "vier Wege in fester Reihenfolge");
    assert.deepEqual(k.map(x => x.label), LABEL);
    assert.deepEqual(k.filter(x => x.hier).map(x => x.bereich), [fokus], "der Weg im eigenen Bereich zeigt «hier weiter»");
    assert.ok(k.every(x => x.titel && x.grund && x.href.includes("/alpha/drittes-rad/")), "alle Wege führen ins Rad");
    assert.equal(await page.locator("#wege a").count(), 4, "nur die vier Wege, kein «Zurück zum Start»");
    const lage = await page.evaluate(() => { const r = (id) => { const b = document.getElementById(id).getBoundingClientRect(); return { top: b.top, bottom: b.bottom }; }; return { wege: r("wege"), lese: r("lese"), hoehe: innerHeight }; });
    assert.ok(lage.wege.bottom <= lage.lese.top + 1, "die vier Wege stehen über dem offenen Stück");
    assert.ok(lage.wege.top >= 0 && lage.wege.bottom <= lage.hoehe, "nach dem Öffnen sind die vier Wege im Bild, ohne zu scrollen");
    assert.equal(await page.locator("#wege h2").textContent(), "Wie geht es weiter?");
    await page.goBack();
    await page.locator("#result").waitFor({ state: "visible" });
    assert.equal(await page.locator("#lese").isHidden(), true);
    assert.equal(await page.locator("#result").innerText(), kartenVorher, "dieselben Karten wie vorher");
    assert.ok(!/&f=/.test(page.url()));
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Rad: von jedem Stück aus in jeden Bereich: die beiden anderen öffnen, was im Rad liegt, der eigene bringt ein verwandtes Stück", async () => {
  const { ctx, page, errors } = await open(stUrl("form"));
  await page.locator("#lese").waitFor({ state: "visible" });
  const tile = (b) => page.locator(`#wege a.drad-kachel[data-bereich="${b}"]`);
  await tile("zeit").click();
  await page.waitForFunction(() => /&f=zeit$/.test(location.search));
  assert.equal(await text(page, "#lese h2"), zeitTitel(ST.strophe), "Zettelkasten: die Strophe, die im Rad liegt");
  await tile("farbe").click();
  await page.waitForFunction(() => /&f=farbe$/.test(location.search));
  assert.equal(await text(page, "#lese h2"), ST.uebung.n, "OMNA COLOR: die Übung, die im Rad liegt");
  await tile("form").click();
  await page.waitForFunction(() => /&f=form$/.test(location.search));
  assert.equal(await text(page, "#lese h2"), formTitel(ST.paar), "ORNA: die Begegnung, die im Rad liegt");
  // der Stand im Rad ist dabei gleich geblieben
  assert.equal(new URL(page.url()).searchParams.get("t"), new URL(base + stUrl()).searchParams.get("t"));
  // das eigene Feld (hier): ein anderes, verwandtes Stück derselben Art
  await tile("form").click();
  await page.waitForFunction((alt) => location.search !== alt, new URL(base + stUrl("form")).search);
  assert.notEqual(await text(page, "#lese h2"), formTitel(ST.paar), "eine andere Begegnung");
  assert.match(page.url(), /&f=form$/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Rad: Verknüpfungen im Lesen (→ in ORNA, Anklänge, weitere Begegnungen, im Zettelkasten) bleiben im Rad", async () => {
  const { ctx, page, errors } = await open("alpha/drittes-rad/");
  // Strophe, die ORNA-Personen nennt und Anklänge hat
  const s = E.STROPHEN.find((x) => x.r.some((r) => E.nrVon(r.s) !== undefined) && (x.v || []).some((n) => E.STROPHEN.some((y) => y.n === n)));
  const r0 = s.r.find((r) => E.nrVon(r.s) !== undefined), an = E.STROPHEN.find((y) => y.n === s.v.find((n) => E.STROPHEN.some((x) => x.n === n)));
  const z = E.rueckkehr({ art: "strophe", slug: s.s }, zufall(4));
  await page.goto(base + rel(E.adresse.spiel(z, "zeit")));
  await page.locator("#lese").waitFor({ state: "visible" });
  // Anklang: eine andere Strophe im Rad
  await page.locator("#lese a", { hasText: zeitTitel(an) }).first().click();
  await page.waitForFunction((t) => document.querySelector("#lese h2")?.textContent === t, zeitTitel(an));
  assert.match(page.url(), /&f=zeit$/);
  await page.goBack();
  await page.waitForFunction((t) => document.querySelector("#lese h2")?.textContent === t, zeitTitel(s));
  // → in ORNA: die Konstellation der genannten Person
  await page.locator("#lese a", { hasText: "→ in ORNA" }).first().click();
  await page.waitForFunction(() => /&f=form$/.test(location.search));
  assert.ok((await page.locator("#lese .zeichen-paar").innerText()).includes(E.nameVon(r0.s)), `die Begegnung nennt ${E.nameVon(r0.s)}`);
  assert.equal(new URL(page.url()).pathname, "/alpha/drittes-rad/");
  // weitere Begegnungen derselben Person (die in der Strophe genannte, damit auch «Im Zettelkasten» etwas zeigt)
  const vorher = await text(page, "#lese h2"), person = E.nameVon(r0.s);
  await page.locator("#lese li", { hasText: person }).locator("a", { hasText: /^mit / }).first().click();
  await page.waitForFunction((v) => document.querySelector("#lese h2")?.textContent !== v, vorher);
  assert.ok((await text(page, "#lese h2")).includes(person), "eine weitere Begegnung derselben Person");
  assert.match(page.url(), /&f=form$/);
  // im Zettelkasten: eine Strophe zur Begegnung; ORNA daneben öffnet weiterhin dieselbe Begegnung
  const begegnung = await text(page, "#lese h2");
  await page.locator("#lese h3", { hasText: "Im Zettelkasten" }).waitFor();
  await page.locator("#lese h3", { hasText: "Im Zettelkasten" }).locator("xpath=following-sibling::ul[1]//a").first().click();
  await page.waitForFunction(() => /&f=zeit$/.test(location.search));
  await page.locator('#wege a.drad-kachel[data-bereich="form"]').click();
  await page.waitForFunction(() => /&f=form$/.test(location.search));
  assert.equal(await text(page, "#lese h2"), begegnung, "die Begegnung bleibt im Rad liegen");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Rad: «Zurück ins Rad» dreht von dem Stück aus weiter, bei dem man steht", async () => {
  const { ctx, page, errors } = await open(stUrl("zeit"));
  await page.locator("#lese").waitFor({ state: "visible" });
  await page.locator('#wege a.drad-kachel[data-bereich="rad"]').click();
  await page.locator("#result").waitFor({ state: "visible" });
  assert.equal(await text(page, "#cZeit h2 a"), zeitTitel(ST.strophe), "die Strophe bleibt liegen");
  assert.match(page.url(), /\?t=[^&]+$/);
  await page.goBack();                                                    // zurück ins offene Stück
  await page.locator("#lese").waitFor({ state: "visible" });
  assert.equal(await text(page, "#lese h2"), zeitTitel(ST.strophe));
  assert.match(page.url(), /&f=zeit$/);
  // von der Übung aus
  await page.goto(base + stUrl("farbe"));
  await page.locator("#lese").waitFor({ state: "visible" });
  await page.locator('#wege a.drad-kachel[data-bereich="rad"]').click();
  await page.locator("#result").waitFor({ state: "visible" });
  assert.ok((await text(page, "#cFarbe h2 a")).startsWith(ST.uebung.n), "die Übung bleibt liegen");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Rad: ?von= dreht von einem Stück aus weiter (Strophe, Begegnung, Übung), auch ohne oder mit unbekanntem Stück", async () => {
  const e = E.uebung("040"), s = E.strophe("13-das-archiv");
  for (const [von, pruefe] of [
    [`strophe~${s.s}`, async (p) => assert.equal(await text(p, "#cZeit h2 a"), zeitTitel(s))],
    ["paar~sol-lewitt__henri-bergson", async (p) => assert.equal(await text(p, "#cForm h2 a"), formTitel(E.paar("sol-lewitt__henri-bergson")))],
    ["uebung~040", async (p) => assert.ok((await text(p, "#cFarbe h2 a")).startsWith(e.n))],
    ["person~donna-haraway", async (p) => assert.ok((await p.locator("#cForm").innerText()).includes("Donna Haraway") || (await p.locator("#cZeit").innerText()).includes("Donna Haraway"))],
    ["los", async () => {}],
    ["strophe~gibt-es-nicht", async () => {}],
    ["unsinn", async () => {}],
  ]) {
    const { ctx, page, errors } = await open("alpha/drittes-rad/?von=" + von);
    await page.locator("#result").waitFor({ state: "visible" });
    await pruefe(page);
    assert.match(page.url(), /\?t=[^&]+$/, `${von}: die Adresse hält den neuen Stand fest`);
    assert.deepEqual(errors, [], von);
    await ctx.close();
  }
});

await check("Rad: ungültige Adressen (?t=, &f=) fallen auf den Start zurück, ohne Fehler", async () => {
  for (const u of ["?t=kaputt", "?t=1-die-bruecke~gibt~es~nicht~1", "?t=1-die-bruecke~sol-lewitt__henri-bergson~040~99~99", "?f=zeit", `${stUrl("zeit").replace(/f=zeit/, "f=quatsch")}`]) {
    const { ctx, page, errors } = await open(u.startsWith("?") ? "alpha/drittes-rad/" + u : u);
    await page.waitForTimeout(150);
    const gueltig = u.includes("f=quatsch");
    assert.equal(await page.locator("#lese").isHidden(), true, u);
    assert.equal(await page.locator("#result").isVisible(), gueltig, u);                // nur der gültige Stand zeigt die Karten (ohne offenes Stück)
    assert.deepEqual(errors, [], u);
    await ctx.close();
  }
});

await check("Zettelkasten: Leiste mit vier Wegen (Rad zuerst), sonst nichts; Spur-Link bleibt im Spiel; ein Weg führt ins Rad", async () => {
  const { ctx, page, errors } = await open("zu-seiner-zeit/strophe/13-das-archiv/?rad=1");
  await page.locator(".drad").waitFor();
  const w = await kacheln(page, ".drad");
  assert.deepEqual(w.map(x => x.label), LABEL);
  assert.deepEqual(w.map(x => x.bereich), BEREICHE);
  assert.deepEqual(w.filter(x => x.hier).map(x => x.bereich), ["zeit"], "hier steht der Zettelkasten");
  assert.equal(w[0].href, `${base}alpha/drittes-rad/?von=strophe~13-das-archiv`, "das Rad dreht von dieser Strophe aus weiter");
  assert.ok(w.slice(1).every(x => x.href.startsWith(`${base}alpha/drittes-rad/?t=`)), "die Wege führen ins Rad");
  assert.equal(await page.locator(".drad a:not(.drad-kachel)").count(), 0, "kein «Zurück zum Start» in der Leiste");
  await page.locator(".zsz-nav a", { hasText: "Spur" }).click();
  await page.waitForURL(/\/spur\/\?rad=1/);
  await page.locator(".drad").waitFor();
  assert.deepEqual((await kacheln(page, ".drad")).map(x => x.bereich), BEREICHE);
  await page.goBack();
  await page.waitForURL(/strophe\/13-das-archiv\/\?rad=1/);
  await page.locator(".drad").waitFor();
  await page.locator('.drad a.drad-kachel[data-bereich="form"]').click();          // ORNA: die Begegnung im Rad lesen
  await page.waitForURL(/\/alpha\/drittes-rad\/\?t=.*&f=form$/);
  await page.locator("#lese .zeichen-paar").waitFor();
  assert.equal(await page.locator(".drad").count(), 0, "im Rad selbst gibt es keine zweite Leiste");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("ORNA: Leiste mit vier Wegen folgt der Drehung; Rad-Kachel führt ins Rad zurück", async () => {
  const start = "sol-lewitt__henri-bergson";
  const { ctx, page, errors } = await open(`portfolio/nebeneinander-nacheinander/?pair=${start}&rad=1`);
  await page.locator(".drad").waitFor();
  let w = await kacheln(page, ".drad");
  assert.deepEqual(w.map(x => x.label), LABEL);
  assert.deepEqual(w.filter(x => x.hier).map(x => x.bereich), ["form"], "hier steht ORNA");
  assert.equal(w[0].href, `${base}alpha/drittes-rad/?von=paar~${start}`);
  assert.equal(await page.locator(".rad-result").getAttribute("data-pair"), start);
  await page.locator(".rad-stage svg").first().focus();      // nächste Drehung in ORNA (Enter): andere Konstellation, die Leiste bleibt und folgt
  await page.keyboard.press("Enter");
  await page.waitForFunction((p) => document.querySelector(".rad-result").dataset.pair !== p, start, { timeout: 15000 });
  const neu = await page.locator(".rad-result").getAttribute("data-pair");
  await page.waitForFunction((p) => document.querySelector('.drad a.drad-kachel[data-bereich="rad"]')?.href.endsWith("von=paar~" + p), neu, { timeout: 5000 });
  w = await kacheln(page, ".drad");
  assert.equal(w.length, 4);
  assert.match(page.url(), /rad=1/);
  await page.locator('.drad a.drad-kachel[data-bereich="rad"]').click();
  await page.waitForURL(/\/alpha\/drittes-rad\//);
  await page.locator("#result").waitFor({ state: "visible" });
  assert.equal(await text(page, "#cForm h2 a"), formTitel(E.paar(neu)), "die Konstellation aus ORNA bleibt im Rad liegen");
  await page.goBack();                                       // zurück in ORNA, die Leiste ist wieder da
  await page.waitForURL(/portfolio\/nebeneinander-nacheinander\//);
  await page.locator(".drad").waitFor();
  assert.equal((await kacheln(page, ".drad")).length, 4);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("OMNA COLOR: ?u= zeigt die Übung, Leiste mit vier Wegen; Rad-Kachel dreht von der Übung aus, ORNA-Kachel liest die Begegnung im Rad", async () => {
  const { ctx, page, errors } = await open("alpha/omna-color/?u=040&rad=1");
  await page.locator(".drad").waitFor();
  assert.match(await page.locator("#card .idline").textContent(), /Übung 040/);
  const w = await kacheln(page, ".drad");
  assert.deepEqual(w.map(x => x.label), LABEL);
  assert.deepEqual(w.filter(x => x.hier).map(x => x.bereich), ["farbe"]);
  assert.equal(w[0].href, `${base}alpha/drittes-rad/?von=uebung~040`);
  await page.locator('.drad a.drad-kachel[data-bereich="form"]').click();
  await page.waitForURL(/\/alpha\/drittes-rad\/\?t=.*&f=form$/);
  await page.locator("#lese .zeichen-paar").waitFor();
  assert.equal((await page.locator("#lese .zeichen-paar figure").count()), 2);
  await page.goBack();
  await page.waitForURL(/alpha\/omna-color\/\?u=040&rad=1/);
  await page.locator(".drad").waitFor();
  await page.locator('.drad a.drad-kachel[data-bereich="rad"]').click();
  await page.waitForURL(/\/alpha\/drittes-rad\//);
  await page.locator("#result").waitFor({ state: "visible" });
  assert.ok((await text(page, "#cFarbe h2 a")).startsWith(E.uebung("040").n), "die Übung bleibt im Rad liegen");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Ohne ?rad= bleibt alles wie vorher: keine Leiste auf Strophe, ORNA und OMNA COLOR, auch nicht im Rad selbst", async () => {
  for (const u of ["zu-seiner-zeit/strophe/13-das-archiv/", "portfolio/nebeneinander-nacheinander/", "alpha/omna-color/", "alpha/omna-color/?u=040", "alpha/drittes-rad/"]) {
    const { ctx, page } = await open(u);
    await page.waitForTimeout(300);
    assert.equal(await page.locator(".drad").count(), 0, u);
    await ctx.close();
  }
});

await check("Handy: kein waagerechtes Scrollen, Karten, Lesen, Wege und Leiste passen in die Breite", async () => {
  const handy = { viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true };
  const passt = async (page, wo) => {
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    assert.ok(w[0] <= w[1], `${wo}: scrollWidth ${w[0]} > ${w[1]}`);
    const aussen = await page.locator("a.drad-kachel").evaluateAll(a => a.filter(x => x.offsetParent).map(x => { const r = x.getBoundingClientRect(); return r.left < -0.5 || r.right > innerWidth + 0.5; }));
    assert.ok(aussen.length && !aussen.some(Boolean), `${wo}: Kacheln innerhalb der Breite`);
  };
  {
    const { ctx, page } = await open("alpha/drittes-rad/", handy);
    assert.ok(await luftUnterTitel(page) >= 48 && await luftUnterRad(page) >= 28, "Handy: mehr Luft zwischen Titel, Rad und Knöpfen");
    await page.click("#go");
    await page.locator("#result").waitFor({ state: "visible" });
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    assert.ok(w[0] <= w[1], `Rad: scrollWidth ${w[0]} > ${w[1]}`);
    for (const k of ["#cZeit", "#cForm", "#cFarbe"]) {
      await page.goto(base + stUrl());
      await page.locator("#result").waitFor({ state: "visible" });
      await page.click(`${k} h2 a`);
      await page.locator("#lese").waitFor({ state: "visible" });
      await passt(page, `Lesen ${k}`);
      const oben = await page.evaluate(() => [document.getElementById("wege").getBoundingClientRect().top, document.getElementById("lese").getBoundingClientRect().top, innerHeight]);
      assert.ok(oben[0] >= 0 && oben[0] < oben[1] && oben[0] < oben[2], `Lesen ${k}: die vier Wege stehen oben im Bild, vor dem Stück`);
    }
    await ctx.close();
  }
  for (const u of ["zu-seiner-zeit/strophe/13-das-archiv/?rad=1", "portfolio/nebeneinander-nacheinander/?pair=sol-lewitt__henri-bergson&rad=1", "alpha/omna-color/?u=040&rad=1"]) {
    const { ctx, page } = await open(u, handy);
    await page.locator(".drad").waitFor();
    await passt(page, u);
    const h = await page.locator(".drad").evaluate(n => n.offsetHeight / innerHeight);
    assert.ok(h < 0.3, `${u}: die Leiste nimmt ${Math.round(h * 100)} % des Bildschirms`);
    await ctx.close();
  }
});

await check("Zwischenspeicher: hält der Browser nach einer Aktualisierung noch alte Module (zehn Minuten wie bei GitHub Pages), startet das Rad trotzdem, auch die Auswahl auf einer Originalseite", async () => {
  const pages = await pagesNachbildung();
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  const page = await ctx.newPage(), fehler = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  try {
    // vorher: der Browser holt die Module in einer älteren Fassung, der die neuen Namen fehlen, und behält sie
    for (const n of ["engine", "kacheln", "daten", "jev"]) pages.alt.set(`/alpha/drittes-rad/${n}.js`, "export const alt = true;");
    await page.goto(pages.base + "probe");
    await page.waitForFunction(() => window.fertig);
    // «Aktualisierung»: der Server liefert wieder die heutige Fassung, im Browser liegen noch die alten Dateien
    pages.alt.clear();
    await page.goto(pages.base + "probe");
    await page.waitForFunction(() => window.fertig);
    assert.deepEqual(await page.evaluate(() => window.geholt.engine), ["alt"], "Voraussetzung des Versuchs: der Browser liefert die alte engine.js aus seinem Zwischenspeicher");
    // die Seite selbst kommt frisch vom Server, ihre Module teils aus dem Zwischenspeicher
    await page.goto(pages.base + "alpha/drittes-rad/");
    const geladen = Date.now();
    await page.waitForFunction(() => window.radGeladen === true, null, { timeout: 8000 }).catch(() => {});
    assert.deepEqual(fehler, [], "Das Rad bricht beim Laden nicht ab (sonst: «does not provide an export named …»)");
    assert.equal(await page.evaluate(() => window.radGeladen), true, "das Rad ist gestartet");
    assert.ok(await page.locator("#sonne > *").count() > 0, "der Kern ist gezeichnet");
    assert.ok(await page.locator("#zeit path").count() > 0 && await page.locator("#form path").count() > 0 && await page.locator("#farbe path").count() > 0, "alle drei Ringe sind gezeichnet");
    await page.click("#go");
    await page.locator("#result").waitFor({ state: "visible", timeout: 12000 });
    assert.equal(await page.locator("#result h2 a").count(), 3, "Drehen zeigt drei Karten");
    await page.waitForTimeout(Math.max(0, 2800 - (Date.now() - geladen)));           // länger als die Frist des Hinweises (2,5 s nach dem Laden)
    assert.equal(await page.locator("#ladefehler").isHidden(), true, "kein Hinweis auf einen Ladefehler, wenn das Rad läuft");
    // die Auswahl auf einer Originalseite lädt weiter.js ohne Marke und holt ihre Module mit Marke
    await page.goto(pages.base + "zu-seiner-zeit/strophe/13-das-archiv/?rad=1");
    await page.locator(".drad").waitFor({ timeout: 8000 });
    assert.equal(await page.locator(".drad a.drad-kachel").count(), 4, "vier Wege");
    assert.deepEqual(fehler, []);
  } finally { await ctx.close(); pages.close(); }
});

await check("Hinweis bei Ladefehler: lädt das Rad nicht, steht kurz danach ein Hinweis mit dem harten Neuladen auf der Seite; sonst bleibt er verborgen", async () => {
  {
    const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1200, height: 900 } });
    const page = await ctx.newPage();
    await page.route("**/alpha/drittes-rad/engine.js*", (route) => route.abort());
    await page.goto(base + "alpha/drittes-rad/");
    await page.locator("#ladefehler").waitFor({ state: "visible", timeout: 8000 });
    assert.match(await page.locator("#ladefehler").textContent(), /nicht geladen werden.*Strg\+Umschalt\+R.*Cmd\+Umschalt\+R/);
    assert.equal(await page.evaluate(() => window.radGeladen), undefined);
    assert.equal(await page.locator("h1").textContent(), "Das Dritte Rad", "die Seite selbst bleibt stehen");
    await ctx.close();
  }
  {
    const { ctx, page, errors } = await open("alpha/drittes-rad/");
    await page.waitForFunction(() => window.radGeladen === true);
    await page.waitForTimeout(2800);                          // länger als die Frist des Hinweises
    assert.equal(await page.locator("#ladefehler").isHidden(), true);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

await browser.close();
server.close();
const failed = results.filter(r => r[0] !== "ok");
console.log(`\n${results.length - failed.length}/${results.length} ok`);
process.exit(failed.length ? 1 : 0);
