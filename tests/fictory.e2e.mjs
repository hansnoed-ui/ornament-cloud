// «The Fictory» – Browser-Tests (Playwright, Chromium) mit dem Beispielbild: genau eine abspielbare Animation, genau sechs verschiedene PNG,
// Standbilder = Schlüsselzustände in höherer Auflösung, reproduzierbarer Neustart, Betrieb ohne ORNA und ohne jev, keine Anfragen nach aussen,
// Video, Protokoll und Wiederholung aus dem Protokoll, Gegenprobe, Handy ohne seitliches Scrollen.
//   NODE_PATH=$(npm root -g) node tests/fictory.e2e.mjs            (mit SCHNELL=1 ohne die Videoaufnahme von gut 30 Sekunden)
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const root = new URL("../", import.meta.url);
const { startServer } = await import(new URL("tools/serve-orma.mjs", root).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/alpha/the-fictory/`;
const browser = await playwright.chromium.launch();
const ergebnisse = [];
async function check(name, fn) {
  try { await fn(); ergebnisse.push(true); console.log("ok  ", name); }
  catch (e) { ergebnisse.push(false); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 8).join("\n      ")); }
}
async function oeffne(opts = {}, vorher = null) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, acceptDownloads: true, ...opts });
  const page = await ctx.newPage();
  const fehler = [], fremd = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  page.on("request", (r) => { const u = new URL(r.url()); if (!["localhost", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) fremd.push(r.url()); });
  if (vorher) await vorher(page);
  await page.goto(base);
  await page.waitForFunction(() => window.fictoryTest?.bereit);
  return { ctx, page, fehler, fremd };
}
async function mitBeispiel(page, orna = false) {
  await page.click("#beispiel");
  await page.waitForSelector("#schritt-analyse:not([hidden])");
  if (orna) await page.check('input[name="orna"][value="ziehen"]');
  await page.click("#erzeugen");
  await page.waitForSelector("#ergebnis:not([hidden])");
  await page.evaluate(() => window.fictoryTest.springe(0));
}
/** PNG-Blobs der sechs Standbilder als kleine Graustufen-Vektoren und die Vorschau des Schlüsselzustands im Vergleich */
const vergleiche = (page) => page.evaluate(async () => {
  const T = window.fictoryTest, out = [];
  const klein = async (quelle) => {
    const c = document.createElement("canvas"); c.width = 160; c.height = Math.round(160 / T.S.lauf.M.seite);
    const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(quelle, 0, 0, c.width, c.height);
    return [...x.getImageData(0, 0, c.width, c.height).data].filter((_, i) => i % 4 !== 3);
  };
  for (let nr = 1; nr <= 6; nr++) {
    const { blob, breite, hoehe, name } = await T.standbildPNG(nr);
    const bmp = await createImageBitmap(blob);
    const vorschau = document.querySelector(`canvas[data-standbild="${nr}"]`);
    out.push({ nr, name, typ: blob.type, breite, hoehe, vorschauBreite: vorschau.width, gross: await klein(bmp), klein: await klein(vorschau) });
  }
  return out;
});
const abstand = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;

await check("Ohne ORNA: Bild laden, Analyse mit getrenntem Befund, Lesart und Eingriff, genau eine Animation und sechs Standbilder", async () => {
  const { ctx, page, fehler, fremd } = await oeffne();
  await page.click("#beispiel");
  await page.waitForSelector("#schritt-analyse:not([hidden])");
  assert.equal(await page.locator(".bg-befund").count(), 6);
  for (const t of ["Befund", "Lesart", "Eingriff"]) assert.equal(await page.locator(".bg-befund dt", { hasText: t }).count(), 6, t);
  assert.match(await page.locator("#status-laden").textContent(), /1200 × 860 px/);
  assert.match(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--leit-roh")), /rgb\(/, "Leitfarbe aus dem Bild");
  assert.ok(await page.locator("#neu-ziehen").isHidden(), "ohne ORNA kein «Neu ziehen»");
  await page.click("#erzeugen");
  await page.waitForSelector("#ergebnis:not([hidden])");
  assert.equal(await page.locator("canvas#buehne").count(), 1, "genau eine Animation");
  assert.ok(await page.locator("#buehne").isVisible() && await page.locator("#ablage").isHidden(), "die Werkbank zeigt die Animation");
  assert.equal(await page.locator("video").count(), 0);
  assert.equal(await page.locator("#standbilder li").count(), 6);
  assert.equal(await page.locator("#standbilder li h3").allTextContents().then((t) => t.join("|")), "1Neue Nachbarschaften|2Abfolge als Bild|3Wirksame Spuren|4Gekoppelte Beziehungen|5Figur und Grund|6Anders weitergehen");
  for (const p of await page.locator("#standbilder li p").allTextContents()) assert.ok(p.length > 40, "Operationsbeschreibung");
  assert.equal(await page.evaluate(() => window.fictoryTest.S.orna), null);
  assert.deepEqual(fehler, []); assert.deepEqual(fremd, [], "keine Anfrage nach aussen");
  await ctx.close();
});

await check("Abspielen, Pause, Zeitleiste und Neustart; der Neustart löscht die Spuren und führt zu denselben Schlüsselzuständen", async () => {
  const { ctx, page } = await oeffne();
  await mitBeispiel(page);
  await page.click("#spielen");
  await page.waitForTimeout(1500);
  const n1 = await page.evaluate(() => window.fictoryTest.S.lauf.z.schritt);
  assert.ok(n1 > 15, `läuft (${n1})`);
  await page.click("#spielen");
  const n2 = await page.evaluate(() => window.fictoryTest.S.lauf.z.schritt); await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => window.fictoryTest.S.lauf.z.schritt), n2, "Pause hält an");
  await page.locator("#zeitleiste").fill("700");
  const spaet = await page.evaluate(() => { const z = window.fictoryTest.S.lauf.z; return { n: z.schritt, stempel: z.stempel.length, spur: z.spuren.reduce((s, v) => s + v, 0) }; });
  assert.equal(spaet.n, 700); assert.ok(spaet.stempel > 20 && spaet.spur > 0, "Spuren liegen vor");
  await page.click("#neustart"); await page.click("#spielen");     // Neustart spielt sofort; anhalten, um den Anfang zu prüfen
  const neu = await page.evaluate(() => { const L = window.fictoryTest.S.lauf; return { n: L.z.schritt, stempel: L.z.stempel.length, cache: [...L.cache.keys()].every((k) => k <= L.z.schritt) }; });
  assert.ok(neu.n < 30 && neu.stempel === 0 && neu.cache, `Neustart vom Anfang ohne Spuren (${JSON.stringify(neu)})`);
  // lebendig weiterrechnen bis Schritt 480 (wie die Wiedergabe) und mit dem gespeicherten Schlüsselzustand vergleichen
  const gleich = await page.evaluate(() => {
    const T = window.fictoryTest, L = T.S.lauf;
    return T.zustandsSchluessel(T.zustandBei(T.SCHLUESSEL[3])) === L.schluessel[3] && T.abweichungen() === 0;
  });
  assert.ok(gleich, "Schlüsselzustand nach dem Neustart identisch");
  await ctx.close();
});

await check("Sechs verschiedene PNG in höherer Auflösung, jedes aus demselben Schlüsselzustand wie sein Standbild", async () => {
  const { ctx, page } = await oeffne();
  await mitBeispiel(page);
  const r = await vergleiche(page);
  assert.equal(r.length, 6);
  for (const x of r) {
    assert.equal(x.typ, "image/png");
    assert.ok(x.breite >= 1600 && x.breite > x.vorschauBreite, `${x.nr}: höhere Auflösung (${x.breite} gegenüber ${x.vorschauBreite})`);
    assert.equal(Math.round((x.breite / x.hoehe) * 100), Math.round((1200 / 860) * 100), "Seitenverhältnis des Eingangsbildes");
    const d = abstand(x.gross, x.klein);
    assert.ok(d < 4, `${x.nr}: Standbild und Schlüsselzustand stimmen überein (mittlere Abweichung ${d.toFixed(2)})`);
  }
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
    const d = abstand(r[i].gross, r[j].gross);
    assert.ok(d > 6, `Standbild ${i + 1} und ${j + 1} unterscheiden sich (${d.toFixed(1)})`);
  }
  assert.equal(new Set(r.map((x) => x.name)).size, 6);
  // gemeinsamer Download
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#alle-png")]);
  assert.match(dl.suggestedFilename(), /standbilder\.zip$/);
  const fs = await import("node:fs");
  const zipBytes = fs.readFileSync(await dl.path());
  const namen = (zipBytes.toString("latin1").match(/the-fictory-[a-z0-9-]+\.(png|json)/g) ?? []);
  assert.equal(new Set(namen.filter((n) => n.endsWith(".png"))).size, 6, "sechs PNG im ZIP");
  assert.ok(namen.some((n) => n.endsWith("protokoll.json")));
  await ctx.close();
});

await check("Mit ORNA: Konstellation, Herkunft, Gedanke und Eingriff sichtbar und als Interpretation gekennzeichnet; Protokoll stellt den Lauf wieder her", async () => {
  const { ctx, page, fehler } = await oeffne();
  await mitBeispiel(page, true);
  const karte = await page.locator("#orna-karte").innerText();
  for (const t of ["Konstellation", "Herkunft", "Gedanke", "Eingriff", "Gestalterische Interpretation", "ORNA, «Nebeneinander, Nacheinander»"]) assert.ok(karte.includes(t), t);
  assert.match(karte, / × /);
  const p = await page.evaluate(() => window.fictoryTest.protokoll());
  assert.ok(p.orna.konstellation && Number.isInteger(p.lauf.startwert) && /^R[1-7]$/.test(p.lauf.regel));
  assert.equal(p.orna.regel, p.lauf.regel);
  const text = await page.evaluate((id) => import("../../portfolio/nebeneinander-nacheinander/js/data/constellations.js").then((m) => m.constellations.find((k) => k.id === id).text), p.orna.konstellation);
  assert.ok(text.includes(p.orna.gedanke), "der Gedanke steht wörtlich im Text");
  // Protokoll in einer frischen Seite einlesen: gleicher Lauf
  const { ctx: ctx2, page: p2 } = await oeffne();
  await p2.click("#beispiel"); await p2.waitForSelector("#schritt-analyse:not([hidden])");
  await p2.click("#erzeugen"); await p2.waitForSelector("#ergebnis:not([hidden])");
  await p2.setInputFiles("#protokoll-laden", { name: "protokoll.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(p)) });
  await p2.waitForFunction(() => /wiederholt/.test(document.getElementById("status-export").textContent));
  assert.match(await p2.locator("#status-export").textContent(), /alle sieben Schlüsselzustände stimmen überein/);
  assert.equal(await p2.evaluate(() => window.fictoryTest.S.orna.id), p.orna.konstellation);
  assert.deepEqual(fehler, []);
  await ctx2.close(); await ctx.close();
});

await check("Ohne jev-Tabelle: ORNA ordnet über Stichworte zu, alles andere läuft gleich", async () => {
  const { ctx, page, fehler } = await oeffne({}, (pg) => pg.route(/\/jev\.js(\?|$)/, (r) => r.fulfill({ contentType: "text/javascript", body: "export const JEV = null;\n" })));
  await mitBeispiel(page, true);
  const q = await page.evaluate(() => window.fictoryTest.S.orna.ableitung.quelle);
  assert.ok(["stichworte", "zufall"].includes(q), q);
  assert.match(await page.locator("#integrationen").textContent(), /keine gültige Tabelle/);
  assert.equal(await page.locator("#standbilder li").count(), 6);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Gegenprobe: ohne wirksame Spuren ein anderes Ende", async () => {
  const { ctx, page } = await oeffne();
  await mitBeispiel(page);
  const g = await page.evaluate(() => window.fictoryTest.gegenprobe());
  assert.notEqual(g.mit, g.ohne);
  assert.ok(g.verschiebung > 0.01, `Verschiebung ${g.verschiebung}`);
  assert.ok(await page.locator("#gegen-bilder").isVisible());
  await ctx.close();
});

await check("Handy: kein seitliches Scrollen, Bedienung erreichbar", async () => {
  const { ctx, page } = await oeffne({ viewport: { width: 375, height: 760 }, isMobile: true, hasTouch: true });
  await mitBeispiel(page);
  const breit = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(breit <= 375, `scrollWidth ${breit}`);
  for (const id of ["#spielen", "#neustart", "#zeitleiste"]) { const b = await page.locator(id).boundingBox(); assert.ok(b && b.x >= 0 && b.x + b.width <= 375 && b.height >= 30, id); }
  await page.locator("#gliederung").tap({ position: { x: 20, y: 20 } });
  await ctx.close();
});

if (!process.env.SCHNELL) await check("Video: eine Animation in einem unterstützten Format, abspielbar", async () => {
  const { ctx, page } = await oeffne();
  await mitBeispiel(page);
  const info = await page.evaluate(async () => {
    const T = window.fictoryTest, blob = await T.video();
    const v = document.createElement("video"); v.muted = true; v.src = URL.createObjectURL(blob);
    await new Promise((ok, nein) => { v.onloadedmetadata = ok; v.onerror = () => nein(new Error("Video nicht lesbar")); });
    return { typ: blob.type, groesse: blob.size, breite: v.videoWidth, hoehe: v.videoHeight };
  });
  assert.match(info.typ, /^video\/(webm|mp4)$/);
  assert.ok(info.groesse > 50000 && info.breite > 0 && info.hoehe > 0, JSON.stringify(info));
  await ctx.close();
});

await browser.close(); server.close();
const fehlgeschlagen = ergebnisse.filter((x) => !x).length;
console.log(`\n${ergebnisse.length - fehlgeschlagen} von ${ergebnisse.length} bestanden`);
process.exit(fehlgeschlagen ? 1 : 0);
