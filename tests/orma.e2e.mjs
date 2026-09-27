// ORMA – Browser-Tests (Playwright, Chromium): ganze Runde am Smartphone, Fortsetzen, Gedankenbuch,
// Sicherung und Import, Export, Ziehungsregel, Offline-Betrieb und Trennung von ORNA.
//   NODE_PATH=$(npm root -g) node tests/orma.e2e.mjs
// Baut zuerst den Produktionsbuild (src/orma/dist/) und liefert ihn unter /orma/ aus, die Website mit ORNA unter /.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const { chromium, devices } = playwright;

const root = new URL("../", import.meta.url);
const { buildOrma } = await import(new URL("tools/build-orma.ts", root).href);
const { startServer } = await import(new URL("tools/serve-orma.mjs", root).href);
const built = buildOrma();
const server = await startServer(0);
const origin = `http://localhost:${server.address().port}`;
const base = `${origin}/orma/`;
const PILOT = JSON.parse(readFileSync(new URL("src/orma/redaktion/pilot.json", root), "utf8")).konstellationen.map(k => k.id);

const browser = await chromium.launch();
const results = [];
async function check(name, fn) {
  try { await fn(); results.push(["ok", name]); console.log("ok  ", name); }
  catch (e) { results.push(["FAIL", name]); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 6).join("\n      ")); }
}
async function open(opts = {}, url = base) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce", ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(url);
  await page.waitForSelector("html[data-ready]");
  return { ctx, page, errors };
}
const noteMatches = (page, re) => page.waitForFunction(src => new RegExp(src).test(document.querySelector(".orma-note")?.textContent || ""), re.source, { timeout: 5000 });
const button = (page, name) => page.getByRole("button", { name, exact: true });
const tap = (page, name) => button(page, name).click();
const drawn = page => page.evaluate(() => JSON.parse(localStorage.getItem("orma:v1:entwurf") || "null")?.constellationId);

/** Eine Runde bis zur Ergebniskarte */
async function playRound(page, { a = "Erste Antwort", b = null, oralB = false, names = ["Mira", "Jon"], mode = "gemeinsam", start = true } = {}) {
  if (start) {
    await tap(page, "Zu zweit beginnen");
    await page.fill("#orma-name-a", names[0]);
    await page.fill("#orma-name-b", names[1]);
    await tap(page, "Beginnen");
  }
  await tap(page, "Drehen");
  await button(page, "Gemeinsam lesen").waitFor();
  const id = await drawn(page);
  await tap(page, "Gemeinsam lesen");
  await tap(page, "Einen Auftrag wählen");
  await page.click('[data-auftrag="gestaltung"]');
  await page.fill("#orma-answer-a", a);
  await tap(page, "Fertig, Gerät weitergeben");
  await tap(page, `Ich bin ${names[1] || "Person B"}`);
  if (oralB) { await tap(page, "Ich antworte mündlich"); await tap(page, "Weiter"); }
  else { await page.fill("#orma-answer-b", b ?? "Zweite Antwort"); await tap(page, "Fertig"); }
  await tap(page, "Aufdecken");
  await tap(page, "Weiterdenken");
  if (mode) {
    await page.check(`input[name="orma-mode"][value="${mode}"]`);
    if (mode === "gemeinsam") await page.fill("#orma-gemeinsam", "Ein neuer gemeinsamer Gedanke.");
  }
  await tap(page, "Zur Ergebniskarte");
  return id;
}

// ---------- Ablauf ----------
await check("Runde am Smartphone: Namen, Drehen (Tippen aufs Rad), Lesen, Auftrag, verdeckte erste Antwort, mündlich, Aufdecken, Weiterdenken, Karte", async () => {
  const { ctx, page, errors } = await open({ reducedMotion: "no-preference" });
  assert.equal(await page.locator("h1").textContent(), "ORMA");
  assert.match(await page.textContent("main"), /Zehn Minuten zu zweit\. Zwei Sichtweisen\. Ein neuer Gedanke\./);
  await tap(page, "Zu zweit beginnen");
  await tap(page, "Beginnen");                                              // ohne Namen: Person A / Person B
  await page.locator(".orma-wheel").tap();                                  // Geste auf dem Rad
  await button(page, "Überspringen").waitFor();
  await tap(page, "Überspringen");                                          // Animation überspringbar
  await button(page, "Gemeinsam lesen").waitFor();
  const id = await drawn(page);
  assert.ok(PILOT.includes(id));
  await tap(page, "Gemeinsam lesen");
  const orig = page.locator("details.orma-origin");
  assert.equal(await orig.evaluate(d => d.open), false, "Originaltext zunächst zu");
  await orig.locator("summary").click();
  assert.match(await orig.textContent(), /Konstellation Nr\. \d+/);
  await tap(page, "Einen Auftrag wählen");
  assert.equal(await page.locator(".orma-option").count(), 3);
  await page.click('[data-auftrag="einwand"]');
  await page.locator("#orma-answer-a").click();
  await page.keyboard.type("Geheimer Gedanke von A, mit Umlauten äöü.");
  await tap(page, "Fertig, Gerät weitergeben");
  // Übergabe und Antwort B: nichts von A sichtbar oder im Dokument
  assert.ok(!(await page.content()).includes("Geheimer Gedanke"), "erste Antwort beim Übergeben sichtbar");
  await tap(page, "Ich bin Person B");
  assert.ok(!(await page.content()).includes("Geheimer Gedanke"), "erste Antwort bei B sichtbar");
  await tap(page, "Ich antworte mündlich");
  await tap(page, "Weiter");
  assert.ok(!(await page.content()).includes("Geheimer Gedanke"), "vor dem Aufdecken sichtbar");
  await tap(page, "Aufdecken");
  const answers = await page.locator(".orma-answer").allTextContents();
  assert.match(answers[0], /Person A.*Geheimer Gedanke von A, mit Umlauten äöü\./);
  assert.match(answers[1], /Person B.*mündlich/);
  assert.match(await page.textContent("main"), /Was hast du anders gesehen\?/);
  await tap(page, "Weiterdenken");
  await page.fill("#orma-ergaenzung-b", "Ergänzung von B");
  await page.check('input[name="orma-mode"][value="positionen"]');
  await page.fill("#orma-position-a", "Position A bleibt");
  await tap(page, "Zur Ergebniskarte");
  const card = await page.textContent(".orma-result");
  assert.match(card, /Position A bleibt/);
  assert.match(card, /Geheimer Gedanke von A/, "ursprüngliche Antwort bleibt erhalten");
  assert.match(card, /Ergänzung von B/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Tastatur: Start bis Rad nur mit Tab und Enter, sichtbarer Fokus; Eingabefelder mit ≥ 16 px (kein Zoom am Handy)", async () => {
  const { ctx, page } = await open({ ...devices["Desktop Chrome"], viewport: { width: 1024, height: 800 } });
  const tabTo = async label => {
    for (let i = 0; i < 25; i += 1) {
      await page.keyboard.press("Tab");
      if ((await page.evaluate(() => document.activeElement.textContent.trim())) === label) return;
    }
    throw new Error(`nicht per Tab erreichbar: ${label}`);
  };
  await tabTo("Zu zweit beginnen"); await page.keyboard.press("Enter");
  await page.keyboard.press("Tab"); await page.keyboard.press("Tab");
  await page.keyboard.type("Ada");
  await page.keyboard.press("Enter");                                        // Formular abschicken
  await page.focus(".orma-wheel"); await page.keyboard.press("Enter");       // Rad per Tastatur
  await button(page, "Gemeinsam lesen").waitFor();
  assert.equal(await page.evaluate(() => document.activeElement.textContent), "Gemeinsam lesen", "Fokus springt auf den nächsten Schritt");
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  assert.notEqual(outline, "none");
  await page.keyboard.press("Enter");
  await tabTo("Einen Auftrag wählen"); await page.keyboard.press("Enter");
  await tabTo("Ein Beispiel finden" + (await page.locator('[data-auftrag="beispiel"] span').textContent()));
  await page.keyboard.press("Enter");
  const size = await page.$eval("#orma-answer-a", e => parseFloat(getComputedStyle(e).fontSize));
  assert.ok(size >= 16, `Schrift ${size}`);
  await ctx.close();
});

await check("Bildschirmtastatur (nachgebildet: niedrige Ansicht): Antwortfeld und «Fertig» bleiben erreichbar, kein waagrechtes Scrollen", async () => {
  const { ctx, page } = await open({ viewport: { width: 412, height: 420 } });
  await tap(page, "Zu zweit beginnen"); await tap(page, "Beginnen");
  await tap(page, "Drehen"); await tap(page, "Gemeinsam lesen");
  await tap(page, "Einen Auftrag wählen"); await page.click('[data-auftrag="beispiel"]');
  await page.fill("#orma-answer-a", "Zeile\n".repeat(20));
  await button(page, "Fertig, Gerät weitergeben").scrollIntoViewIfNeeded();
  assert.ok(await button(page, "Fertig, Gerät weitergeben").isVisible());
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  const h = await button(page, "Fertig, Gerät weitergeben").boundingBox();
  assert.ok(h.height >= 48, "grosse Touch-Fläche");
  await ctx.close();
});

// ---------- Fortsetzen ----------
await check("Fortsetzen: Runde nach Schliessen wieder aufnehmen, Eingabe bleibt; bei B zuerst neutral übergeben; verwerfen mit Bestätigung", async () => {
  const { ctx, page } = await open();
  await tap(page, "Zu zweit beginnen");
  await page.fill("#orma-name-a", "Mira"); await page.fill("#orma-name-b", "Jon");
  await tap(page, "Beginnen"); await tap(page, "Drehen"); await tap(page, "Gemeinsam lesen");
  await tap(page, "Einen Auftrag wählen"); await page.click('[data-auftrag="beispiel"]');
  await page.fill("#orma-answer-a", "angefangen, nicht fertig");
  await page.reload(); await page.waitForSelector("html[data-ready]");      // App geschlossen und neu geöffnet
  await tap(page, "Runde fortsetzen");
  assert.equal(await page.inputValue("#orma-answer-a"), "angefangen, nicht fertig");
  await tap(page, "Fertig, Gerät weitergeben"); await tap(page, "Ich bin Jon");
  await page.fill("#orma-answer-b", "B schreibt");
  await page.reload(); await page.waitForSelector("html[data-ready]");
  await tap(page, "Runde fortsetzen");
  assert.match(await page.textContent("h2"), /Gib das Gerät an Jon/);
  assert.ok(!(await page.content()).includes("angefangen, nicht fertig"));
  await tap(page, "Ich bin Jon");
  assert.equal(await page.inputValue("#orma-answer-b"), "B schreibt");
  // zwischen Schritten geht nichts verloren
  await tap(page, "Fertig"); await tap(page, "Aufdecken"); await tap(page, "Weiterdenken");
  await page.fill("#orma-ergaenzung-a", "Ergänzung");
  await page.click(".orma-home");
  await tap(page, "Runde fortsetzen");
  assert.equal(await page.inputValue("#orma-ergaenzung-a"), "Ergänzung");
  await page.click(".orma-home");
  await tap(page, "Unterbrochene Runde verwerfen");
  await tap(page, "Verwerfen");
  assert.equal(await button(page, "Runde fortsetzen").count(), 0);
  await ctx.close();
});

// ---------- Ziehung ----------
await check("Ziehung in der App: jede Runde eine der 24, nie zweimal unmittelbar hintereinander, auch über «Noch eine Runde»", async () => {
  const { ctx, page } = await open();
  const seen = [];
  await tap(page, "Zu zweit beginnen"); await tap(page, "Beginnen");
  for (let i = 0; i < 24; i += 1) {
    await tap(page, "Drehen");
    await button(page, "Gemeinsam lesen").waitFor();
    seen.push(await drawn(page));
    await page.click(".orma-home");                                          // Runde abbrechen, neu …
    await tap(page, "Zu zweit beginnen"); await tap(page, "Neu beginnen"); await tap(page, "Beginnen");
  }
  const id = await playRound(page, { start: false, names: ["", ""] });
  seen.push(id);
  await tap(page, "Noch eine Runde");
  await tap(page, "Drehen"); await button(page, "Gemeinsam lesen").waitFor();
  seen.push(await drawn(page));
  for (const s of seen) assert.ok(PILOT.includes(s), s);
  for (let i = 1; i < seen.length; i += 1) assert.notEqual(seen[i], seen[i - 1], `Wiederholung bei ${i}`);
  assert.ok(new Set(seen).size >= 8, "Streuung über den Pilotbestand");
  await ctx.close();
});

// ---------- Gedankenbuch ----------
await check("Gedankenbuch: behalten, öffnen, Favorit, einzeln löschen, Sicherung herunterladen, alles löschen (bestätigt), Import ohne Überschreiben", async () => {
  const { ctx, page, errors } = await open();
  await playRound(page, { a: "Eintrag eins" });
  await tap(page, "Im Gedankenbuch behalten");
  assert.match(await page.textContent("main"), /Im Gedankenbuch behalten\./);
  await tap(page, "Noch eine Runde");
  await playRound(page, { a: "Eintrag zwei", start: false, mode: "" });
  await tap(page, "Im Gedankenbuch behalten");
  await tap(page, "Runde beenden");
  await tap(page, "Unsere Gedanken (2)");
  assert.equal(await page.locator(".orma-book li").count(), 2);
  assert.match(await page.textContent("main"), /Deine Gedanken bleiben auf diesem Gerät\. Beim Löschen der App-Daten können sie verloren gehen\./);
  await page.locator(".orma-fav").first().click();
  assert.equal(await page.locator(".orma-fav").first().getAttribute("aria-pressed"), "true");
  await page.locator(".orma-entry").first().click();
  assert.match(await page.textContent(".orma-result"), /Eintrag zwei/);
  const [dl] = await Promise.all([page.waitForEvent("download"), (async () => { await tap(page, "Zurück"); await tap(page, "Sicherung herunterladen"); })()]);
  const backup = readFileSync(await dl.path(), "utf8");
  assert.equal(JSON.parse(backup).entries.length, 2);
  assert.match(dl.suggestedFilename(), /^orma-gedankenbuch-\d{4}-\d{2}-\d{2}\.json$/);
  // einzeln löschen
  await page.locator(".orma-entry").nth(1).click();
  await tap(page, "Eintrag löschen"); await tap(page, "Löschen");
  assert.equal(await page.locator(".orma-book li").count(), 1);
  // alles löschen: erst Abbrechen, dann bestätigen
  await tap(page, "Alle ORMA-Einträge löschen"); await tap(page, "Abbrechen");
  assert.equal(await page.locator(".orma-book li").count(), 1);
  await tap(page, "Alle ORMA-Einträge löschen"); await tap(page, "Ja, alle löschen");
  assert.equal(await page.locator(".orma-book li").count(), 0);
  // Import: beide zurück, zweiter Import überschreibt nichts
  await page.setInputFiles("#orma-import", { name: "sicherung.json", mimeType: "application/json", buffer: Buffer.from(backup) });
  await noteMatches(page, /2 Eintrag\/Einträge übernommen/);
  assert.equal(await page.locator(".orma-book li").count(), 2);
  await page.setInputFiles("#orma-import", { name: "sicherung.json", mimeType: "application/json", buffer: Buffer.from(backup) });
  await noteMatches(page, /0 Eintrag\/Einträge übernommen, 2 schon vorhanden \(nicht überschrieben\)/);
  await page.setInputFiles("#orma-import", { name: "x.json", mimeType: "application/json", buffer: Buffer.from("{nein") });
  await noteMatches(page, /keine lesbare ORMA-Sicherung/);
  assert.equal(await page.locator(".orma-book li").count(), 2);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Beschädigte lokale Daten: verständliche Meldung, App bleibt nutzbar, alter Inhalt bleibt aufbewahrt; Eingaben erscheinen als Text", async () => {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce" });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem("gesetzt")) return;
    sessionStorage.setItem("gesetzt", "1");
    localStorage.setItem("orma:v1:buch", "{{ kaputt");
    localStorage.setItem("orma:v1:entwurf", "auch kaputt");
  });
  const page = await ctx.newPage();
  await page.goto(base); await page.waitForSelector("html[data-ready]");
  assert.match(await page.textContent(".orma-note"), /unterbrochene Runde liess sich nicht lesen/);
  await tap(page, "Unsere Gedanken");
  assert.match(await page.textContent(".orma-note"), /beschädigt/);
  await page.click(".orma-home");
  await playRound(page, { a: "<b>kein HTML</b><img src=x onerror=\"window.__xss=1\">" });
  await tap(page, "Im Gedankenbuch behalten");
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.match(await page.locator(".orma-answer").first().textContent(), /<b>kein HTML<\/b>/);
  assert.equal(await page.evaluate(() => localStorage.getItem("orma:v1:buch:beschaedigt")), "{{ kaputt");
  await ctx.close();
});

// ---------- Export ----------
await check("Export: Vorschau vor dem Speichern; ohne Auswahl nur Paarung und Frage (gleich hoch wie leer); lange Texte machen die Karte höher; PNG wird gespeichert", async () => {
  const { ctx, page } = await open();
  const long = "Ein sehr langer Gedanke mit Umlauten äöü und einem Wort Donaudampfschifffahrtsgesellschaftskapitän. ".repeat(18);
  await playRound(page, { a: long, b: long });
  await tap(page, "Karte exportieren");
  const heightOf = async () => { await page.waitForFunction(() => document.querySelector(".orma-preview").dataset.height); return Number(await page.getAttribute(".orma-preview", "data-height")); };
  const plain = await heightOf();
  assert.equal(plain, 1350, "ohne Persönliches: Grundformat");
  const img = await page.$eval(".orma-preview", i => new Promise(r => (i.complete && i.naturalWidth ? r([i.naturalWidth, i.naturalHeight]) : i.addEventListener("load", () => r([i.naturalWidth, i.naturalHeight])))));
  assert.deepEqual(img, [1080, 1350]);
  await page.check('[data-opt="answers"]');
  await page.waitForFunction(() => Number(document.querySelector(".orma-preview").dataset.height) > 1350);
  const tall = await heightOf();
  assert.ok(tall > 2500, `Höhe ${tall}`);
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: "Bild speichern" }).click()]);
  const png = readFileSync(await dl.path());
  assert.equal(png.subarray(1, 4).toString(), "PNG");
  assert.equal(png.readUInt32BE(20), tall);
  await ctx.close();
});

// ---------- Offline ----------
await check("Offline: nach der Einrichtung startet ORMA ohne Netz; ganze Runde, Behalten, Wiederöffnen und Export funktionieren", async () => {
  const { ctx, page, errors } = await open({ serviceWorkers: "allow" });
  // erst neu laden, wenn der Service Worker fertig aktiviert ist (sonst übernimmt er die Seite erst beim nächsten Mal)
  await page.waitForFunction(async () => { const r = await navigator.serviceWorker.getRegistration(); return r?.active?.state === "activated"; }, null, { timeout: 15000 });
  // Einrichtung abgeschlossen, sobald der Service Worker die Seite übernimmt. Chromium lässt eine Navigation
  // unmittelbar nach der Aktivierung gelegentlich noch am Service Worker vorbei; dann zählt das nächste Laden.
  let controlled = false;
  for (let i = 0; i < 5 && !controlled; i += 1) {
    await page.reload(); await page.waitForSelector("html[data-ready]");
    controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
    if (!controlled) await page.waitForTimeout(300);
  }
  assert.ok(controlled, "Service Worker übernimmt die Seite nicht");
  await ctx.setOffline(true);
  await page.goto(base); await page.waitForSelector("html[data-ready]");
  await page.goto(base + "?von=homescreen"); await page.waitForSelector("html[data-ready]");
  await playRound(page, { a: "offline gedacht" });
  await tap(page, "Im Gedankenbuch behalten");
  await tap(page, "Runde beenden");
  await page.reload(); await page.waitForSelector("html[data-ready]");
  await tap(page, "Unsere Gedanken (1)");
  await page.locator(".orma-entry").first().click();
  assert.match(await page.textContent(".orma-result"), /offline gedacht/);
  await tap(page, "Karte exportieren");
  await page.waitForFunction(() => document.querySelector(".orma-preview").dataset.height);
  await ctx.setOffline(false);
  assert.deepEqual(errors.filter(e => !/ERR_INTERNET_DISCONNECTED/.test(e)), []);
  await ctx.close();
});

// ---------- Trennung von ORNA ----------
await check("Trennung: ORNA und ORMA nebeneinander – eigene Service Worker, eigene Caches, ORMA löscht nichts von ORNA", async () => {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce", serviceWorkers: "allow" });
  const page = await ctx.newPage();
  const orna = `${origin}/portfolio/nebeneinander-nacheinander/app/`;
  await page.goto(orna);
  await page.waitForFunction(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && r.active); }, null, { timeout: 15000 });
  await page.evaluate(() => { localStorage.setItem("fremd", "bleibt"); sessionStorage.setItem("orna-intro", "1"); });
  await page.goto(base); await page.waitForSelector("html[data-ready]");
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistrations()).filter(r => r.active).length === 2, null, { timeout: 15000 });
  const scopes = (await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).map(r => new URL(r.scope).pathname))).sort();
  assert.deepEqual(scopes, ["/orma/", "/portfolio/nebeneinander-nacheinander/"]);
  // beide Caches vorhanden (kurz warten: der Cache-Eintrag kann dem Registrierungsstatus leicht nachlaufen)
  const want = `orma-${built.version}`;
  const ok = await page.waitForFunction(w => caches.keys().then(k => k.some(x => x.startsWith("nn-")) && k.includes(w)), want, { timeout: 10000 }).then(() => true, () => false);
  assert.ok(ok, `Caches: ${(await page.evaluate(() => caches.keys())).join(", ")}`);
  await playRound(page);
  await tap(page, "Im Gedankenbuch behalten"); await tap(page, "Runde beenden");
  await tap(page, "Unsere Gedanken (1)");
  await tap(page, "Alle ORMA-Einträge löschen"); await tap(page, "Ja, alle löschen");
  assert.equal(await page.evaluate(() => localStorage.getItem("fremd")), "bleibt");
  assert.equal(await page.evaluate(() => sessionStorage.getItem("orna-intro")), "1");
  assert.ok((await page.evaluate(() => caches.keys())).some(k => k.startsWith("nn-")), "ORNA-Cache unberührt");
  // ORMA-Schlüssel: nur mit Präfix «orma:»
  const ownKeys = await page.evaluate(() => Object.keys(localStorage).filter(k => k !== "fremd"));
  assert.ok(ownKeys.every(k => k.startsWith("orma:")), ownKeys.join(", "));
  // ORNA läuft danach weiter
  await page.goto(orna);
  await page.waitForFunction(() => document.querySelector(".rad-wheel")?.__rad);
  await ctx.close();
});

// ---------- Alpha-Bereich ----------
await check("Alpha: alpha/ listet ORMA; alpha/orma/ läuft unter dem Website-Pfad mit eigenem Service Worker", async () => {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce", serviceWorkers: "allow" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(`${origin}/alpha/`);
  await page.getByRole("link", { name: "ORMA" }).click();
  await page.waitForSelector("html[data-ready]");
  assert.equal(new URL(page.url()).pathname, "/alpha/orma/");
  await tap(page, "Zu zweit beginnen"); await tap(page, "Beginnen"); await tap(page, "Drehen");
  await button(page, "Gemeinsam lesen").waitFor();
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === "activated", null, { timeout: 15000 });
  assert.equal(new URL((await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).scope))).pathname, "/alpha/orma/");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await browser.close();
server.close();
const failed = results.filter(r => r[0] !== "ok");
console.log(`\n${results.length - failed.length}/${results.length} ok`);
process.exit(failed.length ? 1 : 0);
