// «Das Dritte Rad» – Browser-Tests (Playwright, Chromium): Rad ohne Text, Karten, Lesen im Rad, vier Wege, Rückkehr, Verlauf,
// Leiste auf den Originalseiten (Zettelkasten, ORNA, OMNA COLOR), Handy, alte Module im Zwischenspeicher (wie bei GitHub Pages), Hinweis bei Ladefehler.
//   NODE_PATH=$(npm root -g) node tests/drittes-rad.e2e.mjs        (mit NUR=Finger oder einem anderen Wort aus dem Namen nur ein Teil der Tests)
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
const { SYMBOL_COUNT } = await import(new URL("portfolio/nebeneinander-nacheinander/js/symbols.js", root).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/`;
const browser = await chromium.launch();
const results = [];

const nur = process.env.NUR && new RegExp(process.env.NUR);      // NUR=Finger node tests/drittes-rad.e2e.mjs: nur die Tests, deren Name dazu passt
async function check(name, fn) {
  if (nur && !nur.test(name)) return;
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
/** Abstand in px vom unteren Rand der Navigation oben links bis zum oberen Rand des Rads (der Titel steht nicht mehr dazwischen), und vom unteren Rand des Rads bis zu den Knöpfen «Drehen» und «Brücke».
 *  Auf der Startseite des Rads ist er grösser (Wunsch vom 2. Oktober 2026), im späteren Verlauf mit den Karten und beim Lesen sind es die engen Abstände von früher: oben max(8, clamp(16, 5 vh, 56)), unten 32 px. */
const luftUnterNav = (page) => page.evaluate(() => document.getElementById("wheel").getBoundingClientRect().top - document.querySelector("nav.seitenweg").getBoundingClientRect().bottom);
const luftUnterRad = (page) => page.evaluate(() => document.getElementById("go").getBoundingClientRect().top - document.getElementById("wheel").getBoundingClientRect().bottom);
/** Links in der Radseite (Karten, Lesen, Wege), die nicht im Rad selbst bleiben, also auf Originalseiten oder sonst woanders hin führen */
const ausDemRad = (page) => page.locator("main a[href]").evaluateAll((a) => a.map((x) => new URL(x.href, location.href)).filter((u) => u.origin !== location.origin || u.pathname !== location.pathname).map((u) => u.href));

const HANDY = { viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true };
const MIT_BEWEGUNG = { reducedMotion: "no-preference" };      // open() setzt sonst «weniger Bewegung» voraus; der Auslauf nach der Geste läuft nur mit Bewegung über requestAnimationFrame

/** Drehung der drei Ringe (Zeit, Form, Farbe) in Grad, so wie die Seite sie setzt */
const ringe = (page) => page.evaluate(() => ["zeit", "form", "farbe"].map((id) => parseFloat(document.getElementById(id).style.transform.replace("rotate(", "")) || 0));
const winkelAbstand = (a, b) => { const d = (((a - b) % 360) + 360) % 360; return Math.min(d, 360 - d); };
/** Finger auf dem Rad mit echten Touch-Ereignissen (CDP): ein Bogen um die Mitte. radius in Einheiten der Zeichnung (viewBox 240: Zeit 70 bis 124, Form 44 bis 69, Farbe bis 43),
 *  von und schritt in Grad im Uhrzeigersinn ab oben. Mit loslassen: false bleibt der Finger liegen, die Verbindung kommt zurück, mit loslassen(cdp) hebt man ihn. */
async function fingerBogen(page, { radius = 100, von = 270, schritte = 8, schritt = 8, pause = 16, loslassen: hebt = true } = {}) {
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));               // nach der Landung blättert die Seite zu den Karten: das Rad steht wieder oben im Bild
  await page.waitForTimeout(120);
  const b = await page.locator("#wheel").boundingBox();
  const cx = b.x + b.width / 2, cy = b.y + b.height / 2, R = radius * b.width / 240;
  const pt = (a) => ({ x: cx + R * Math.sin(a * Math.PI / 180), y: cy - R * Math.cos(a * Math.PI / 180) });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [pt(von)] });
  for (let i = 1; i <= schritte; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [pt(von + i * schritt)] }); await page.waitForTimeout(pause); }
  if (hebt) await loslassen(cdp);
  return cdp;
}
const loslassen = (cdp) => cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
/** wartet, bis das Rad steht: Karten da, «Drehen» wieder frei */
const steht = (page) => page.waitForFunction(() => !document.getElementById("go").disabled && !document.getElementById("result").hidden, null, { timeout: 15000 });
/** Die Ringe stehen auf den Stücken der Karten: die Adresse (?t=Strophe~Konstellation~Übung~Farbe~Zeichen) gegen die Winkel der Ringe; im Stück liegt der Zeiger zwischen 20 und 80 Prozent */
async function pruefeLandung(page, was) {
  const [sl, , , ic, i_f] = new URL(page.url()).searchParams.get("t").split("~");
  const soll = [E.ZYKLEN.findIndex((z) => z[0] === E.strophe(sl).c), +i_f, +ic], schritt = [360 / E.ZYKLEN.length, 360 / SYMBOL_COUNT, 360 / E.THEMEN.length];
  (await ringe(page)).forEach((deg, i) => {
    const x = (((-deg % 360) + 360) % 360) / schritt[i], name = ["Zeit", "Form", "Farbe"][i];
    assert.equal(Math.floor(x), soll[i], `${was}: der Ring ${name} steht auf dem Stück der Karte (${x.toFixed(2)} statt ${soll[i]})`);
    assert.ok(x - Math.floor(x) >= .18 && x - Math.floor(x) <= .82, `${was}: der Ring ${name} steht innerhalb des Stücks, nicht an der Kante (${x.toFixed(2)})`);
  });
}

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

await check("Schlichte Seite: kein Titel über dem Rad, «Drehen» und «Brücke» sehen gleich aus, kein «Zurück zum Start», kein Kasten «Fäden», keine Links zu den Originalseiten, keine Texteingaben", async () => {
  const { ctx, page, errors } = await open("alpha/drittes-rad/");
  assert.equal(await page.locator("header").count(), 0, "kein Kopf mit Titel über dem Rad");
  const titel = await page.locator("h1").evaluate((h) => { const b = h.getBoundingClientRect(); return { text: h.textContent, breite: b.width, hoehe: b.height, position: getComputedStyle(h).position }; });
  assert.equal(titel.text, "Das Dritte Rad", "die Überschrift bleibt für Vorlesegeräte");
  assert.ok(titel.breite <= 1 && titel.hoehe <= 1 && titel.position === "absolute", "der Titel steht nicht mehr über dem Rad: er ist nicht zu sehen");
  assert.deepEqual(await page.locator(".wheelbox .row button").allTextContents(), ["Drehen", "Brücke"], "zwei Knöpfe unter dem Rad");
  const stil = (id) => page.locator(id).evaluate((b) => { const c = getComputedStyle(b); return Object.fromEntries(["fontSize", "fontWeight", "letterSpacing", "textTransform", "color", "borderTopColor", "borderTopWidth", "borderRadius",
    "paddingTop", "paddingLeft", "boxShadow", "backgroundColor"].map((k) => [k, c[k]])); });
  assert.deepEqual(await stil("#bridge"), await stil("#go"), "«Brücke» ist wie «Drehen» gestaltet");
  assert.equal(await page.locator("#bridge").getAttribute("aria-label"), "Brücke schlagen", "vorgelesen bleibt es verständlich");
  const oben = await luftUnterNav(page);
  assert.ok(oben >= 56 && oben <= 120, `das Rad folgt auf die Navigation, kein Titel dazwischen, mit Raum nach oben (${Math.round(oben)} px)`);
  assert.ok(await luftUnterRad(page) >= 48, "zwischen Rad und den Knöpfen ist viel mehr Luft als die früheren 14 px");
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
    const oben = await luftUnterNav(page);
    assert.ok(oben >= 56 && oben <= 120 && await luftUnterRad(page) >= 48, `Handy: das Rad folgt auf die Navigation mit Raum nach oben (${Math.round(oben)} px), viel Luft zwischen Rad und Knöpfen`);
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

// ---------- Das Rad mit dem Finger drehen (Wunsch vom 2. Oktober 2026) ----------
await check("Finger: der angefasste Ring folgt der Geste, die anderen laufen gegenläufig; nach dem Loslassen läuft das Rad in Richtung der Geste aus und landet genau auf den Stücken der Karten (im und gegen den Uhrzeigersinn)", async () => {
  const { ctx, page, errors } = await open("alpha/drittes-rad/", { ...HANDY, ...MIT_BEWEGUNG });
  await page.waitForFunction(() => window.radGeladen === true);
  assert.equal(await page.locator("#wheel").evaluate((w) => getComputedStyle(w).cursor), "grab", "die Hand zum Greifen");
  for (const richtung of [1, -1]) {
    const was = richtung > 0 ? "im Uhrzeigersinn" : "gegen den Uhrzeigersinn";
    const vor = await ringe(page);
    const cdp = await fingerBogen(page, { radius: 100, von: 270, schritte: 8, schritt: 8 * richtung, loslassen: false });
    const weg = (await ringe(page)).map((x, i) => x - vor[i]);
    assert.ok(Math.abs(weg[0] - 64 * richtung) < 2, `${was}: die Zeit (angefasst) folgt dem Finger genau (${weg[0].toFixed(1)}° statt ${64 * richtung}°)`);
    assert.ok(Math.abs(weg[1] + .8 * 64 * richtung) < 2, `${was}: die Form läuft gegenläufig (${weg[1].toFixed(1)}°)`);
    assert.ok(Math.abs(weg[2] - .64 * 64 * richtung) < 2, `${was}: die Farbe läuft mit der Zeit (${weg[2].toFixed(1)}°)`);
    const gesehen = await page.locator("#zeit").evaluate((g) => { const m = new DOMMatrixReadOnly(getComputedStyle(g).transform); return Math.atan2(m.b, m.a) * 180 / Math.PI; });
    assert.ok(winkelAbstand(gesehen, vor[0] + weg[0]) < 1.5, `${was}: auch auf dem Bildschirm folgt der Ring dem Finger ohne Verzögerung (${gesehen.toFixed(1)}°)`);
    assert.equal(await page.locator("#wheel").evaluate((w) => w.classList.contains("zieht") && getComputedStyle(w).cursor === "grabbing"), true, `${was}: beim Ziehen die geschlossene Hand`);
    await loslassen(cdp);
    const a0 = (await ringe(page))[0];
    await page.waitForTimeout(250);
    const a1 = (await ringe(page))[0];
    await page.waitForTimeout(250);
    const a2 = (await ringe(page))[0];
    assert.ok((a1 - a0) * richtung > 5 && (a2 - a1) * richtung > 5, `${was}: das Rad läuft mit dem Schwung weiter (${a0.toFixed(0)}° → ${a1.toFixed(0)}° → ${a2.toFixed(0)}°)`);
    assert.equal(await page.locator("#go").isDisabled(), true, `${was}: «Drehen» ist gesperrt, solange das Rad läuft`);
    assert.equal(await page.locator("#result").isHidden(), true, `${was}: keine Karten während des Laufs`);
    assert.equal(await page.locator("#wheel").evaluate((w) => w.classList.contains("zieht")), false, `${was}: nach dem Loslassen keine geschlossene Hand mehr`);
    const zweite = await fingerBogen(page, { radius: 100, von: 90, schritte: 2, schritt: 5, loslassen: false });   // ein laufendes Rad lässt sich nicht greifen
    assert.equal(await page.locator("#wheel").evaluate((w) => w.classList.contains("zieht")), false, `${was}: ein laufendes Rad lässt sich nicht greifen`);
    await loslassen(zweite);
    await steht(page);
    await pruefeLandung(page, was);
    assert.match(page.url(), /\?t=/, `${was}: die Adresse hält den Stand`);
  }
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Finger: auf der Form (mittlerer Ring) und auf der Farbe (innerer Ring) folgt der angefasste Ring, die beiden anderen laufen gegenläufig", async () => {
  for (const [radius, name, faktor] of [[56, "Form", [-.8, 1, -.8]], [30, "Farbe", [.64, -.8, 1]]]) {
    const { ctx, page, errors } = await open("alpha/drittes-rad/", { ...HANDY, ...MIT_BEWEGUNG });
    await page.waitForFunction(() => window.radGeladen === true);
    const vor = await ringe(page);
    const cdp = await fingerBogen(page, { radius, von: 300, schritte: 6, schritt: 7, loslassen: false });
    const weg = (await ringe(page)).map((x, i) => x - vor[i]);
    faktor.forEach((f, i) => assert.ok(Math.abs(weg[i] - 42 * f) < 2, `${name}: Ring ${["Zeit", "Form", "Farbe"][i]} dreht um ${weg[i].toFixed(1)}° statt ${(42 * f).toFixed(1)}°`));
    await loslassen(cdp);
    await steht(page);
    await pruefeLandung(page, name);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

await check("Maus: Ziehen am Rad dreht es wie der Finger, ein Klick ohne Ziehen dreht wie bisher", async () => {
  const { ctx, page, errors } = await open("alpha/drittes-rad/", { viewport: { width: 1200, height: 900 }, ...MIT_BEWEGUNG });
  await page.waitForFunction(() => window.radGeladen === true);
  const b = await page.locator("#wheel").boundingBox(), cx = b.x + b.width / 2, cy = b.y + b.height / 2, R = 100 * b.width / 240;
  const pt = (a) => [cx + R * Math.sin(a * Math.PI / 180), cy - R * Math.cos(a * Math.PI / 180)];
  const vor = await ringe(page);
  await page.mouse.move(...pt(270));
  await page.mouse.down();
  for (let i = 1; i <= 6; i++) { await page.mouse.move(...pt(270 + i * 10)); await page.waitForTimeout(14); }
  const weg = (await ringe(page)).map((x, i) => x - vor[i]);
  assert.ok(Math.abs(weg[0] - 60) < 2 && Math.abs(weg[1] + 48) < 2, `die Maus führt die Ringe (${weg.map((x) => x.toFixed(1)).join("°, ")}°)`);
  assert.equal(await page.locator("#wheel").evaluate((w) => getComputedStyle(w).cursor), "grabbing");
  await page.mouse.up();
  await steht(page);
  await pruefeLandung(page, "Maus");
  assert.equal(await page.locator("#wheel").evaluate((w) => getComputedStyle(w).cursor), "grab");
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(120);
  await page.mouse.click(...pt(0));                                        // Klick ohne Ziehen: dreht wie bisher (über click)
  assert.equal(await page.locator("#go").isDisabled(), true, "der Klick hat das Rad gedreht");
  await steht(page);
  await pruefeLandung(page, "Klick");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Finger: ein Antippen dreht das Rad wie bisher, auch ein Antippen mitten im Rad; bei «weniger Bewegung» dreht auch die Geste ohne Auslauf und landet genau", async () => {
  const { ctx, page, errors } = await open("alpha/drittes-rad/", HANDY);          // weniger Bewegung
  await page.waitForFunction(() => window.radGeladen === true);
  const b = await page.locator("#wheel").boundingBox();
  await page.touchscreen.tap(b.x + b.width / 2 + 30, b.y + b.height / 2 - 100);
  await page.locator("#result").waitFor({ state: "visible" });
  assert.match(page.url(), /\?t=/);
  await pruefeLandung(page, "Antippen");
  const url = page.url();
  await fingerBogen(page, { radius: 100, von: 200, schritte: 6, schritt: 14, pause: 12 });      // Geste bei «weniger Bewegung»
  await page.waitForFunction((u) => location.href !== u, url, { timeout: 5000 });
  await steht(page);
  await pruefeLandung(page, "Geste bei weniger Bewegung");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Finger: ein Wisch in der Ecke neben dem Kreis blättert die Seite (das Rad sperrt das Blättern), er dreht nichts", async () => {
  const { ctx, page, errors } = await open("alpha/drittes-rad/", { ...HANDY, viewport: { width: 390, height: 520 }, ...MIT_BEWEGUNG });
  await page.waitForFunction(() => window.radGeladen === true);
  const b = await page.locator("#wheel").boundingBox();
  const platz = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  assert.ok(platz >= 60, `die Seite lässt sich blättern (${platz} px)`);
  const weg = Math.min(100, platz - 4), x = b.x + 12, y = b.y + b.height - 12;
  assert.ok(y + 4 < 520, "die Ecke liegt im Bild");
  const vor = await ringe(page);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let i = 1; i <= 10; i++) { await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - i * weg / 10 }] }); await page.waitForTimeout(12); }
  await loslassen(cdp);
  await page.waitForTimeout(150);
  const gescrollt = await page.evaluate(() => scrollY);
  assert.ok(Math.abs(gescrollt - weg) < 4, `die Seite blättert mit dem Finger (${gescrollt} px statt ${weg} px)`);
  assert.deepEqual(await ringe(page), vor, "das Rad hat sich nicht gedreht");
  assert.equal(await page.locator("#go").isDisabled(), false, "und läuft auch nicht");
  assert.equal(await page.locator("#result").isHidden(), true);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Finger: führt man das Rad während des Auslaufs mit «Das Dritte Rad» auf den Start zurück, endet der Auslauf, und es erscheinen keine Karten nachträglich", async () => {
  const { ctx, page, errors } = await open("alpha/drittes-rad/", { ...HANDY, ...MIT_BEWEGUNG });
  await page.waitForFunction(() => window.radGeladen === true);
  await fingerBogen(page, { radius: 100, von: 270, schritte: 6, schritt: 12, pause: 10 });
  await page.waitForTimeout(400);
  assert.equal(await page.locator("#go").isDisabled(), true, "das Rad läuft");
  await page.locator("nav.seitenweg a", { hasText: "Das Dritte Rad" }).click();
  await page.waitForFunction(() => !document.getElementById("go").disabled);
  assert.deepEqual(await ringe(page), [0, 0, 0], "die Ringe stehen wieder am Anfang");
  await page.waitForTimeout(1800);                                          // der abgebrochene Auslauf darf nichts mehr zeigen
  assert.equal(await page.locator("#result").isHidden(), true, "keine nachträglichen Karten");
  assert.equal(new URL(page.url()).search, "", "und keine Adresse eines Stands");
  assert.deepEqual(await ringe(page), [0, 0, 0], "die Ringe bleiben stehen");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Startseite des Rads: mehr Raum über und unter dem Rad (Wunsch vom 2. Oktober 2026), im späteren Verlauf mit Karten und beim Lesen bleiben die engen Abstände von früher; Computer und Handy", async () => {
  const messen = async (page) => {                                                                       // ganz oben, sonst hält «sticky» das Rad fest, während die Navigation wegscrollt
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    return { oben: Math.round(await luftUnterNav(page)), unten: Math.round(await luftUnterRad(page)) };
  };
  for (const [wo, opts, hoehe] of [["Computer", { viewport: { width: 1280, height: 800 } }, 800], ["Handy", HANDY, 800]]) {
    const { ctx, page, errors } = await open("alpha/drittes-rad/", opts);
    await page.waitForFunction(() => window.radGeladen === true);
    const eng = { oben: Math.round(Math.max(8, Math.min(56, Math.max(16, hoehe * .05)))), unten: 32 };          // die Abstände von früher
    const start = await messen(page);
    assert.ok(start.oben >= eng.oben + 24 && start.unten >= eng.unten + 16, `${wo}: Startseite mit mehr Raum als früher: ${JSON.stringify(start)} gegen ${JSON.stringify(eng)}`);
    assert.ok(start.oben <= 130 && start.unten <= 90, `${wo}: nicht masslos (${JSON.stringify(start)})`);
    if (wo === "Computer") assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), "Computer: die Startseite passt bei 1280 × 800 ohne Blättern (die gemeinsame Stelle der Hauptlinks rückt sie nach unten, unten bleiben darum nur 24 px Rand)");
    // gedreht: die Karten stehen da, die engen Abstände von früher
    await page.click("#go");
    await page.locator("#result").waitFor({ state: "visible" });
    assert.deepEqual(await messen(page), eng, `${wo}: mit den Karten bleiben die engen Abstände`);
    // ein Stück geöffnet (Lesen): ebenso
    await page.click("#cZeit h2 a");
    await page.locator("#lese").waitFor({ state: "visible" });
    assert.deepEqual(await messen(page), eng, `${wo}: beim Lesen bleiben die engen Abstände`);
    // zurück auf den Start (die Navigation «Das Dritte Rad»): wieder der weite Abstand
    await page.locator("nav.seitenweg a", { hasText: "Das Dritte Rad" }).click();
    await page.waitForFunction(() => document.getElementById("lese").hidden && document.getElementById("result").hidden);
    assert.deepEqual(await messen(page), start, `${wo}: zurück auf der Startseite wieder der weite Abstand`);
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

await check("Startseite des Rads: die Abstände weichen sanft, sobald die Karten erscheinen; bei «weniger Bewegung» springen sie", async () => {
  const reihe = (page) => page.evaluate(() => new Promise((fertig) => {
    const m = document.querySelector("main"), g = document.querySelector(".wheelbox"), w = (e, k) => parseFloat(getComputedStyle(e)[k]), reihe = [];
    reihe.push([w(m, "marginTop"), w(g, "rowGap")]);
    document.getElementById("result").hidden = false;                                  // wie wenn die Karten erscheinen
    const t0 = performance.now();
    (function bild() { reihe.push([w(m, "marginTop"), w(g, "rowGap")]); if (performance.now() - t0 < 1000) requestAnimationFrame(bild); else fertig(reihe); })();
  }));
  for (const [wie, opts] of [["mit Bewegung", MIT_BEWEGUNG], ["weniger Bewegung", {}]]) {
    const { ctx, page, errors } = await open("alpha/drittes-rad/", { viewport: { width: 1280, height: 800 }, ...opts });
    await page.waitForFunction(() => window.radGeladen === true);
    const r = await reihe(page), oben = r.map((x) => x[0]), gap = r.map((x) => x[1]);
    assert.equal(oben[0], 72, `${wie}: Startseite: Abstand nach oben 9 vh = 72 px`);
    assert.equal(gap[0], 56, `${wie}: Startseite: Abstand zu den Knöpfen 7 vh = 56 px`);
    assert.equal(oben.at(-1), 40, `${wie}: mit den Karten 5 vh = 40 px wie früher`);
    assert.equal(gap.at(-1), 32, `${wie}: mit den Karten 32 px wie früher`);
    assert.ok(oben.every((v, i) => !i || v <= oben[i - 1]) && gap.every((v, i) => !i || v <= gap[i - 1]), `${wie}: nur enger werden, nie zurückspringen`);
    const dazwischen = (xs, von, bis) => xs.filter((v) => v > bis && v < von).length;
    if (wie === "mit Bewegung") assert.ok(dazwischen(oben, 72, 40) >= 3 && dazwischen(gap, 56, 32) >= 3, `mit Bewegung gleiten die Abstände in mehreren Bildschritten (${oben.length} Messungen, oben ${dazwischen(oben, 72, 40)}, unten ${dazwischen(gap, 56, 32)})`);
    else assert.ok(dazwischen(oben, 72, 40) === 0 && dazwischen(gap, 56, 32) === 0, "bei «weniger Bewegung» gibt es keine Zwischenschritte");
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

await check("Navigation oben links: «Ornament Cloud» und darunter «Das Dritte Rad» auf Computer und Handy, auf Startseite, Zettelkasten, ORNA, Alpha-Seiten und im Rad", async () => {
  const seiten = ["", "news/", "termine/", "portfolio/", "portfolio/nebeneinander-nacheinander/", "portfolio/nebeneinander-nacheinander/feld/", "zu-seiner-zeit/", "zu-seiner-zeit/strophe/13-das-archiv/",
    "zu-seiner-zeit/verweis/yoko-ono/", "alpha/", "alpha/pruefraster/", "alpha/verteilapparat/", "alpha/gesellschaftskonzepte/", "alpha/journalistische-texte/", "alpha/omna-color/", "alpha/drittes-rad/"];
  for (const [wo, opts] of [["Computer", { viewport: { width: 1280, height: 800 } }], ["Handy", { viewport: { width: 390, height: 800 }, isMobile: true, hasTouch: true }]]) {
    const ctx = await browser.newContext({ reducedMotion: "reduce", ...opts });
    for (const u of seiten) {
      const page = await ctx.newPage(), fehler = [];
      page.on("pageerror", (e) => fehler.push(e.message));
      await page.goto(base + u);
      const nav = await page.locator("nav.seitenweg a").evaluateAll((a) => a.map((x) => { const b = x.getBoundingClientRect(); return { text: x.textContent, left: b.left, top: b.top, bottom: b.bottom, hoehe: b.height, sichtbar: x.offsetParent !== null }; }));
      const was = `${wo} ${u || "Startseite"}`;
      assert.deepEqual(nav.map((x) => x.text), ["Ornament Cloud", "Das Dritte Rad"], was);
      assert.ok(nav.every((x) => x.sichtbar && x.hoehe >= 24), `${was}: sichtbar, mindestens 24 px hoch zum Tippen`);
      assert.ok(Math.abs(nav[0].left - nav[1].left) < 1 && nav[1].top >= nav[0].bottom - 1, `${was}: «Das Dritte Rad» steht linksbündig unter «Ornament Cloud»`);
      assert.ok(nav[0].top < 120 && nav[0].left < 200, `${was}: ganz oben links (${Math.round(nav[0].left)}, ${Math.round(nav[0].top)})`);
      assert.deepEqual(fehler, [], was);
      await page.close();
    }
    await ctx.close();
  }
});

await check("Navigation: die beiden Hauptlinks stehen auf jeder Seite an genau derselben Stelle (Wunsch vom 2. Oktober 2026, 18:08 UTC), auf Computer, Tablet und Handy, hell und dunkel, mit und ohne Bildlaufbalken, und im Rad bleiben sie beim Drehen und Lesen dort", async () => {
  const seiten = ["", "news/", "termine/", "portfolio/", "apps/", "masterprompts/", "web/",
    "portfolio/nebeneinander-nacheinander/", "portfolio/nebeneinander-nacheinander/feld/", "portfolio/nebeneinander-nacheinander/app/", "portfolio/nebeneinander-nacheinander/app/feld/",
    "alpha/", "alpha/pruefraster/", "alpha/verteilapparat/", "alpha/gesellschaftskonzepte/", "alpha/journalistische-texte/", "alpha/omna-color/", "alpha/drittes-rad/",
    "zu-seiner-zeit/", "zu-seiner-zeit/spur/", "zu-seiner-zeit/strophe/13-das-archiv/", "zu-seiner-zeit/verweis/", "zu-seiner-zeit/verweis/yoko-ono/"];       // «zufall/» springt gleich zu einer Strophe weiter und ist damit schon dabei
  /** Stelle der beiden Links im Dokument (also mit dem Bildlauf gerechnet), ihre Grösse, ob man sie trifft (nichts liegt darüber), und der linke Rand der Spalte der Seite, wo sie eine eigene hat */
  const stelle = (page) => page.evaluate(() => {
    const links = [...document.querySelectorAll("nav.seitenweg a")].map((x) => {
      const b = x.getBoundingClientRect(), hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return { x: b.left + scrollX, y: b.top + scrollY, b: b.width, h: b.height, trifft: hit === x || x.contains(hit) };
    });
    const werk = document.querySelector(".zsz-werk"), haupt = document.querySelector("body > main");
    return { links, breite: document.documentElement.getBoundingClientRect().width, seitlich: scrollX, zettelkasten: werk ? werk.getBoundingClientRect().left : null, haupt: haupt ? haupt.getBoundingClientRect().left : null };
  });
  const rund = (l) => l.map((e) => [e.x, e.y, e.b, e.h].map((v) => Math.round(v * 2) / 2));
  // die Stelle der Website: bündig mit einer Spalte von 1040 px, in der Mitte (bis 1080 px Breite der Seite 20 px vom Rand), oben 55 px, bis 760 px Fensterbreite 40 px; die Breite der Seite ohne den Platz für den Bildlaufbalken
  const soll = (breite, fenster) => ({ x: Math.max(20, (breite - 1040) / 2), y: fenster <= 760 ? 40 : 55 });
  const darstellungen = [["hell", "light", 1920, 1080], ["hell", "light", 1280, 800], ["hell", "light", 1024, 768], ["hell", "light", 768, 1024], ["hell", "light", 760, 900], ["hell", "light", 390, 844],
    ["dunkel", "dark", 1280, 800], ["dunkel", "dark", 390, 844]];
  // zweiter Browser mit klassischen Bildlaufbalken (wie unter Windows): Seiten, die zu kurz zum Blättern sind, würden die Spalte sonst um die halbe Balkenbreite verschieben
  const mitBalken = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
  // dritter Browser mit Bildlaufbalken, die sich über die Seite legen und keinen Platz brauchen (wie auf dem Mac und auf dem Handy): dort bleibt die Stelle der Website unverändert, bei 1280 px Breite 120 px vom Rand
  const ueberlagert = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"], args: ["--enable-features=OverlayScrollbar,FluentOverlayScrollbar"] });
  try {
    for (const [wie, b, modus, scheme, w, h] of [...darstellungen.map((d) => ["ohne Balken", browser, ...d]), ["mit Balken", mitBalken, "hell", "light", 1280, 800], ["mit Balken", mitBalken, "hell", "light", 1920, 1080], ["mit Balken", mitBalken, "dunkel", "dark", 1440, 900],
      ["Balken darüber", ueberlagert, "hell", "light", 1280, 800], ["Balken darüber", ueberlagert, "dunkel", "dark", 390, 844]]) {
      const ctx = await b.newContext({ reducedMotion: "reduce", colorScheme: scheme, viewport: { width: w, height: h } });
      const page = await ctx.newPage(), fehler = [];
      page.on("pageerror", (e) => fehler.push(e.message));
      let start = null;
      for (const u of seiten) {
        const was = `${modus}, ${w} × ${h}, ${wie}, ${u || "Startseite"}`;
        await page.goto(base + u);
        if (u === "alpha/drittes-rad/") await page.waitForFunction(() => window.radGeladen === true);
        const m = await stelle(page), links = m.links;
        assert.equal(links.length, 2, `${was}: zwei Links`);
        if (u === "") {                                                     // die Website ist der Massstab: ihre Stelle nach der Formel, alle anderen Seiten daneben
          start = rund(links);
          const s = soll(m.breite, w);
          assert.ok(Math.abs(links[0].x - s.x) <= .5 && Math.abs(links[0].y - s.y) <= .5, `${was}: die Stelle der Website (${links[0].x}, ${links[0].y}) statt (${s.x}, ${s.y})`);
        }
        assert.deepEqual(rund(links), start, `${was}: gleiche Stelle und Grösse wie auf der Startseite (x, y, Breite, Höhe)`);
        assert.ok(links.every((l) => l.trifft), `${was}: beide Links liegen frei, nichts steht darüber`);
        assert.equal(m.seitlich, 0, `${was}: kein seitlicher Bildlauf`);
        // bündig mit der Spalte der Seite: der Kopf des Zettelkastens, das Rad und OMNA COLOR beginnen links dort, wo die Navigation beginnt
        if (m.zettelkasten !== null) assert.ok(Math.abs(m.zettelkasten - links[0].x) <= .5, `${was}: «Zu seiner Zeit» steht bündig unter der Navigation (${m.zettelkasten} gegen ${links[0].x})`);
        if (/^alpha\/(drittes-rad|omna-color)\//.test(u)) assert.ok(Math.abs(m.haupt - links[0].x) <= .5, `${was}: der Inhalt steht bündig unter der Navigation (${m.haupt} gegen ${links[0].x})`);
      }
      assert.deepEqual(fehler, [], `${modus}, ${w} × ${h}, ${wie}`);
      await ctx.close();
    }
  } finally { await mitBalken.close(); await ueberlagert.close(); }
  // im Rad bleibt die Navigation beim Drehen, beim Lesen und beim Zurückkehren auf dem Start an ihrer Stelle
  for (const [wo, opts] of [["Computer", { viewport: { width: 1280, height: 800 } }], ["Handy", HANDY]]) {
    const { ctx, page, errors } = await open("alpha/drittes-rad/", opts);
    await page.waitForFunction(() => window.radGeladen === true);
    const start = rund((await stelle(page)).links);
    const wieStart = async (was) => assert.deepEqual(rund((await stelle(page)).links), start, `${wo}: ${was} steht die Navigation an derselben Stelle`);
    await page.click("#go");
    await page.locator("#result").waitFor({ state: "visible" });
    await wieStart("mit den Karten");
    await page.click("#cZeit h2 a");
    await page.locator("#lese").waitFor({ state: "visible" });
    await wieStart("beim Lesen");
    await page.locator("nav.seitenweg a", { hasText: "Das Dritte Rad" }).click();
    await page.waitForFunction(() => document.getElementById("lese").hidden && document.getElementById("result").hidden);
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await wieStart("zurück auf dem Start");
    assert.deepEqual(errors, []);
    await ctx.close();
  }
});

await check("Navigation: die beiden Links sind Buttons mit ganz feinem Rahmen, der aktive ist invers gesetzt (Fläche in der Farbe des Buttons, Schrift in der Farbe der Seite); farblich getrennt (Orange und Violett, je mit Kontrast ab 4,5) und auf jeder Seite genau so gross gesetzt wie auf der Website, hell und dunkel, Computer und Handy", async () => {
  const seiten = ["", "news/", "portfolio/", "portfolio/nebeneinander-nacheinander/", "zu-seiner-zeit/", "zu-seiner-zeit/strophe/13-das-archiv/", "alpha/", "alpha/pruefraster/", "alpha/gesellschaftskonzepte/", "alpha/omna-color/", "alpha/drittes-rad/"];
  const FARBEN = { hell: ["rgb(194, 65, 12)", "rgb(91, 63, 196)"], dunkel: ["rgb(240, 138, 93)", "rgb(167, 148, 255)"] };           // «Ornament Cloud» orange, «Das Dritte Rad» violett
  const rgb = (c) => c.match(/[\d.]+/g).slice(0, 3).map(Number);
  const hell = (c) => { const [r, g, b] = (typeof c === "string" ? rgb(c) : c).map((v) => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
  const kontrast = (a, b) => { const [x, y] = [hell(a), hell(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
  /** rgb(…), rgba(…) oder color(srgb … / a) aus getComputedStyle → { rgb: [0 bis 255], a } */
  const farbe = (c) => { const z = c.match(/-?[\d.]+(?:e-?\d+)?/g).map(Number), k = c.startsWith("color(") ? 255 : 1; return { rgb: z.slice(0, 3).map((v) => v * k), a: z.length > 3 ? z[3] : 1 }; };
  const naheBei = (x, y, d) => x.every((v, i) => Math.abs(v - y[i]) <= d);
  for (const [modus, scheme] of [["hell", "light"], ["dunkel", "dark"]]) for (const [wo, opts] of [["Computer", { viewport: { width: 1280, height: 800 } }], ["Handy", HANDY]]) {
    const ctx = await browser.newContext({ reducedMotion: "reduce", colorScheme: scheme, ...opts });
    let website = null;
    for (const u of seiten) {
      const page = await ctx.newPage(), was = `${modus}, ${wo}, ${u || "Startseite"}`;
      await page.goto(base + u);
      const m = await page.locator("nav.seitenweg a").evaluateAll((a) => a.map((x) => { const c = getComputedStyle(x), b = x.getBoundingClientRect();
        return { color: c.color, aktiv: x.getAttribute("aria-current"), rahmen: [c.borderTopWidth, c.borderRightWidth, c.borderBottomWidth, c.borderLeftWidth, c.borderTopStyle, c.borderTopLeftRadius].join(" "), rahmenFarbe: c.borderTopColor, flaeche: c.backgroundColor,
          ring: [c.outlineStyle, c.outlineWidth, c.outlineOffset].join(" "), ringFarbe: c.outlineColor,
          stil: [c.fontSize, c.fontWeight, c.letterSpacing, c.textTransform, c.fontFamily, c.lineHeight, c.paddingTop, c.paddingLeft, c.textAlign].join(" | "), breite: Math.round(b.width), hoehe: Math.round(b.height) }; }));
      const grund = await page.evaluate(() => { const n = (e) => getComputedStyle(e).backgroundColor, ok = (c) => !/^rgba\(.*, 0\)$|^transparent$/.test(c); return [n(document.body), n(document.documentElement)].find(ok) || "rgb(255, 255, 255)"; });
      const farben = u === "alpha/drittes-rad/" ? FARBEN.dunkel : FARBEN[modus];          // das Rad ist immer dunkel
      // Buttons: ganz feiner Rahmen (1 px, rund), beide gleich breit; aktiv ist im Rad «Das Dritte Rad», sonst «Ornament Cloud»
      assert.deepEqual(m.map((x) => x.aktiv), u === "alpha/drittes-rad/" ? [null, "page"] : [u === "" ? "page" : "true", null], `${was}: aria-current auf dem aktiven Button`);
      assert.equal(m[0].breite, m[1].breite, `${was}: beide Buttons gleich breit`);
      m.forEach((x, i) => {
        const aktiv = x.aktiv !== null, weg = rgb(farben[i]), r = farbe(x.rahmenFarbe), f = farbe(x.flaeche), schrift = farbe(x.color), nr = `${was}: Button ${i + 1}`;
        assert.equal(x.rahmen, "1px 1px 1px 1px solid 999px", `${nr}: Rahmen 1 px ringsum, durchgezogen, Pillenform`);
        assert.ok(x.ring.startsWith("none"), `${nr}: kein Ring ausserhalb (der aktive hat keinen zweiten Ring mehr): ${x.ring}`);
        if (aktiv) {
          // invers: Fläche und voller Rahmen in der Farbe des Buttons, die Schrift in der Farbe der Seite
          assert.ok(naheBei(f.rgb, weg, 1.5) && f.a === 1, `${nr}: aktiv, die Fläche in der Farbe des Buttons (${farben[i]}): ${x.flaeche}`);
          assert.ok(naheBei(r.rgb, weg, 1.5) && Math.abs(r.a - 1) < .02, `${nr}: aktiv, voller Rahmen in der Farbe des Buttons: ${x.rahmenFarbe}`);
          assert.ok(naheBei(schrift.rgb, rgb(grund), 1.5), `${nr}: aktiv, die Schrift in der Farbe der Seite (${grund}): ${x.color}`);
          assert.ok(kontrast(x.color, x.flaeche) >= 4.5, `${nr}: aktiv, Kontrast Schrift auf Fläche ${kontrast(x.color, x.flaeche).toFixed(2)} (${x.color} auf ${x.flaeche})`);
        } else {
          // nicht aktiv: Schrift in der Farbe des Buttons, ohne Fläche, blasser Rahmen
          assert.ok(naheBei(schrift.rgb, weg, 1.5), `${nr}: Schrift in der Farbe des Buttons (${farben[i]}): ${x.color}`);
          assert.ok(kontrast(x.color, grund) >= 4.5, `${nr}: Kontrast ${kontrast(x.color, grund).toFixed(2)} (${x.color} auf ${grund})`);
          assert.equal(f.a, 0, `${nr}: nicht aktiv ohne Fläche: ${x.flaeche}`);
          assert.ok(naheBei(r.rgb, weg, 1.5) && Math.abs(r.a - .4) < .02, `${nr}: blasser Rahmen in der Farbe des Buttons, 40 %: ${x.rahmenFarbe}`);
        }
      });
      // Tastaturfokus: Ring 2 px im Abstand 2 px in der Farbe des Buttons, auch beim aktiven, dessen Schrift in der Farbe der Seite steht
      for (let i = 0; i < 2; i++) {
        let da = false;
        for (let n = 0; n < 8 && !da; n++) { await page.keyboard.press("Tab"); da = await page.evaluate((k) => document.activeElement === document.querySelectorAll("nav.seitenweg a")[k], i); }
        assert.ok(da, `${was}: Button ${i + 1} per Tab erreichbar`);
        const fo = await page.evaluate(() => { const c = getComputedStyle(document.activeElement); return { ring: [c.outlineStyle, c.outlineWidth, c.outlineOffset].join(" "), farbe: c.outlineColor, sichtbar: document.activeElement.matches(":focus-visible") }; });
        assert.ok(fo.sichtbar && fo.ring === "solid 2px 2px" && naheBei(farbe(fo.farbe).rgb, rgb(farben[i]), 1.5) && farbe(fo.farbe).a === 1, `${was}: Button ${i + 1}: Fokusring 2 px in der Farbe des Buttons: ${fo.ring} ${fo.farbe}`);
        assert.ok(kontrast(fo.farbe, grund) >= 3, `${was}: Button ${i + 1}: Fokusring gegen den Grund mindestens 3 : 1 (${kontrast(fo.farbe, grund).toFixed(2)})`);
      }
      if (!website) website = m;
      assert.deepEqual(m.map(({ stil, rahmen, breite, hoehe }) => ({ stil, rahmen, breite, hoehe })), website.map(({ stil, rahmen, breite, hoehe }) => ({ stil, rahmen, breite, hoehe })), `${was}: Schrift, Rahmen, Grösse und Breite wie auf der Startseite der Website`);
      await page.close();
    }
    await ctx.close();
  }
});

await check("Navigation: in erzwungenen Farben (Windows, hoher Kontrast) fällt die Fläche weg, dort bleibt der aktive Button mit einem feinen Ring kenntlich und der andere hat keinen", async () => {
  for (const u of ["", "zu-seiner-zeit/", "alpha/omna-color/", "alpha/drittes-rad/"]) {
    const ctx = await browser.newContext({ reducedMotion: "reduce", forcedColors: "active", viewport: { width: 1000, height: 700 } });
    const page = await ctx.newPage();
    await page.goto(base + u);
    assert.equal(await page.evaluate(() => matchMedia("(forced-colors: active)").matches), true, "erzwungene Farben sind an");
    const m = await page.locator("nav.seitenweg a").evaluateAll((a) => a.map((x) => { const c = getComputedStyle(x); return { aktiv: x.hasAttribute("aria-current"), ring: [c.outlineStyle, c.outlineWidth, c.outlineOffset].join(" ") }; }));
    assert.equal(m.length, 2, u);
    for (const x of m) assert.equal(x.ring.startsWith("solid 1px 2px"), x.aktiv, `${u || "Startseite"}: ${x.aktiv ? "der aktive Button hat den feinen Ring" : "der andere hat keinen Ring"} (${x.ring})`);
    await ctx.close();
  }
});

await check("Navigation: «Ornament Cloud» führt zur Startseite, «Das Dritte Rad» zum Start des Rads; im Rad bleibt man auf der Seite, der Verlauf stimmt", async () => {
  const gehe = async (page, von, link, ziel) => {
    await page.goto(base + von);
    await Promise.all([page.waitForURL((u) => u.pathname === ziel), page.locator("nav.seitenweg a", { hasText: link }).click()]);
  };
  const { ctx, page, errors } = await open("");
  await gehe(page, "", "Das Dritte Rad", "/alpha/drittes-rad/");
  await page.waitForFunction(() => window.radGeladen === true);
  assert.equal(await page.locator("#result").isHidden(), true, "der Start des Rads: noch keine Karten");
  assert.equal(await page.locator("nav.seitenweg a[aria-current='page']").textContent(), "Das Dritte Rad");
  await gehe(page, "alpha/drittes-rad/", "Ornament Cloud", "/");
  assert.ok(await page.locator(".site-header .menu").count(), "die Startseite der Website");
  for (const [von, link, ziel] of [["zu-seiner-zeit/strophe/13-das-archiv/", "Ornament Cloud", "/"], ["zu-seiner-zeit/strophe/13-das-archiv/", "Das Dritte Rad", "/alpha/drittes-rad/"],
    ["portfolio/nebeneinander-nacheinander/", "Das Dritte Rad", "/alpha/drittes-rad/"], ["alpha/pruefraster/", "Ornament Cloud", "/"], ["alpha/omna-color/", "Das Dritte Rad", "/alpha/drittes-rad/"]]) await gehe(page, von, link, ziel);
  // im Rad: «Das Dritte Rad» setzt auf den Start zurück, ohne Neuladen; Zurück bringt den Stand wieder
  await page.goto(base + stUrl("zeit"));
  await page.locator("#lese").waitFor({ state: "visible" });
  await page.evaluate(() => { window.nichtNeuGeladen = true; });
  const stand = page.url();
  await page.locator("nav.seitenweg a", { hasText: "Das Dritte Rad" }).click();
  await page.waitForFunction(() => location.search === "");
  assert.equal(await page.evaluate(() => window.nichtNeuGeladen), true, "kein Neuladen");
  assert.equal(await page.locator("#lese").isHidden(), true);
  assert.equal(await page.locator("#wege").isHidden(), true);
  assert.equal(await page.locator("#result").isHidden(), true);
  assert.equal(await page.locator("#wheel").getAttribute("data-fokus"), "", "kein Ring leuchtet");
  await page.goBack();
  await page.waitForFunction((u) => location.href === u, stand);
  await page.locator("#lese").waitFor({ state: "visible" });
  assert.equal(await text(page, "#lese h2"), zeitTitel(ST.strophe), "Zurück: das offene Stück");
  await page.locator("nav.seitenweg a", { hasText: "Ornament Cloud" }).click();
  await page.waitForURL((u) => u.pathname === "/");
  assert.deepEqual(errors, []);
  await ctx.close();
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
