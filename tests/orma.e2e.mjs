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

await check("Startansicht: «Unterbrochene Runde verwerfen» und «ORMA als App installieren» stehen untereinander, nicht in einer Zeile", async () => {
  const { ctx, page } = await open({ viewport: { width: 986, height: 800 }, isMobile: false, hasTouch: false });
  await tap(page, "Zu zweit beginnen"); await tap(page, "Beginnen"); await tap(page, "Drehen");
  await page.reload(); await page.waitForSelector("html[data-ready]");
  const a = await button(page, "Unterbrochene Runde verwerfen").boundingBox();
  const b = await button(page, "ORMA als App installieren").boundingBox();
  assert.ok(b.y >= a.y + a.height - 1, `überlappen oder stehen nebeneinander: ${JSON.stringify([a, b])}`);
  assert.ok(Math.abs(a.x - b.x) <= 1, "linksbündig untereinander");
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
await check("Ziehung in der App: jede Runde eine der 48, nie zweimal unmittelbar hintereinander, auch über «Noch eine Runde»", async () => {
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

// ---------- Re-Entry (allein) ----------
const soloStart = page => page.getByRole("button", { name: /^Allein: Re-Entry/ }).click();
const PILOT_RAW = JSON.parse(readFileSync(new URL("src/orma/redaktion/pilot.json", root), "utf8")).konstellationen;

await check("Re-Entry, erster Durchgang: allein drehen, lesen, Auftrag, antworten – die Schleife bleibt offen, die Antwort verborgen", async () => {
  const { ctx, page, errors } = await open();
  await soloStart(page);
  await tap(page, "Drehen");
  await tap(page, "Lesen");
  await tap(page, "Einen Auftrag wählen");
  // allein: die Aufträge in der Du-Form
  const drawnId = await page.evaluate(() => JSON.parse(localStorage.getItem("orma:v1:entwurf")).constellationId);
  const raw = PILOT_RAW.find(x => x.id === drawnId);
  assert.deepEqual(await page.locator(".orma-option span").allTextContents(), [raw.auftraege_allein.beispiel, raw.auftraege_allein.einwand, raw.auftraege_allein.gestaltung]);
  assert.equal(await page.textContent("h2"), "Was willst du damit machen?");
  await page.click('[data-auftrag="einwand"]');
  assert.equal(await button(page, "Ich antworte mündlich").count(), 0, "allein keine mündliche Antwort");
  assert.match(await page.textContent(".orma-task"), new RegExp(raw.auftraege_allein.einwand.slice(0, 30).replace(/[.?*+()]/g, "\\$&")));
  await page.fill("#orma-answer-a", "Mein früher Gedanke");
  await tap(page, "Fertig");
  assert.equal(await page.textContent("h2"), "Die Schleife ist offen");
  const loops = await page.evaluate(() => JSON.parse(localStorage.getItem("orma:v1:schleifen")));
  assert.equal(loops.length, 1);
  assert.equal(loops[0].text, "Mein früher Gedanke");
  assert.equal(loops[0].auftrag, "einwand");
  assert.equal(await page.evaluate(() => localStorage.getItem("orma:v1:entwurf")), null, "Runde abgeschlossen");
  await page.locator("main").getByRole("button", { name: "Zur Startansicht", exact: true }).click();
  await page.getByRole("button", { name: "Allein: Re-Entry (1 offen)" }).waitFor();
  await tap(page, "Unsere Gedanken");
  assert.match(await page.textContent("main"), /Offene Schleifen \(1\)/);
  assert.ok(!(await page.content()).includes("Mein früher Gedanke"), "Antwort in der Liste sichtbar");
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Re-Entry, zweiter Durchgang: dieselbe Konstellation kehrt zurück – derselbe Auftrag, erste Antwort verborgen, dann aufdecken, dritter Gedanke, Schleife geschlossen", async () => {
  const { ctx, page, errors } = await open();
  // für jede Konstellation eine offene Schleife: jede Ziehung trifft auf einen zweiten Durchgang
  await page.evaluate(ids => localStorage.setItem("orma:v1:schleifen", JSON.stringify(ids.map((id, i) =>
    ({ id: `s${i}`, constellationId: id, contentVersion: "x", auftrag: "gestaltung", text: `Frühere Antwort ${i}`, at: "2026-09-01T09:00:00.000Z" })))), PILOT);
  await page.reload(); await page.waitForSelector("html[data-ready]");
  await page.getByRole("button", { name: `Allein: Re-Entry (${PILOT.length} offen)` }).click();
  await tap(page, "Drehen");
  await tap(page, "Lesen");
  const id = await drawn(page);
  const n = PILOT.indexOf(id);
  assert.equal(await page.textContent("h2"), "Du warst schon einmal hier");
  assert.match(await page.textContent("main"), /Am 1\. September 2026/);
  assert.ok(!(await page.content()).includes(`Frühere Antwort ${n}`), "erste Antwort beim Wiedersehen sichtbar");
  await tap(page, "Lesen");
  await tap(page, "Noch einmal antworten");                                 // keine Auftragswahl: derselbe Auftrag
  assert.match(await page.textContent(".orma-task"), /Etwas daraus machen/);
  assert.ok((await page.textContent(".orma-task")).includes(PILOT_RAW.find(x => x.id === id).auftraege_allein.gestaltung), "Du-Fassung im zweiten Durchgang");
  assert.ok(!(await page.content()).includes(`Frühere Antwort ${n}`), "erste Antwort beim zweiten Schreiben sichtbar");
  await page.fill("#orma-answer-b", "Heute sehe ich es anders");
  // Schliessen mitten im zweiten Durchgang: Fortsetzen ohne Übergabe, erste Antwort weiter verborgen
  await page.reload(); await page.waitForSelector("html[data-ready]");
  await tap(page, "Runde fortsetzen");
  assert.equal(await page.inputValue("#orma-answer-b"), "Heute sehe ich es anders");
  assert.ok(!(await page.content()).includes(`Frühere Antwort ${n}`));
  await tap(page, "Fertig");
  await tap(page, "Aufdecken");
  const answers = await page.locator(".orma-answer").allTextContents();
  assert.match(answers[0], new RegExp(`Ich, am 1\\. September 2026.*Frühere Antwort ${n}`));
  assert.match(answers[1], /Ich, am .*Heute sehe ich es anders/);
  assert.match(await page.textContent("main"), /Was hat sich verändert\?/);
  await tap(page, "Weiterdenken");
  await page.fill("#orma-veraendert", "Ich bin vorsichtiger geworden.");
  await page.fill("#orma-dritter", "Ein dritter Gedanke, der beide hält.");
  await tap(page, "Zur Ergebniskarte");
  const card = await page.textContent(".orma-result");
  assert.match(card, /Der dritte Gedanke/);
  assert.match(card, /Ein dritter Gedanke, der beide hält\./);
  const left = await page.evaluate(() => JSON.parse(localStorage.getItem("orma:v1:schleifen")));
  assert.equal(left.length, PILOT.length - 1, "Schleife geschlossen");
  assert.ok(!left.some(l => l.constellationId === id));
  await tap(page, "Im Gedankenbuch behalten");
  await tap(page, "Karte exportieren");
  assert.equal(await page.locator('[data-opt="names"]').count(), 0, "allein keine Namen");
  await page.check('[data-opt="answers"]');
  await page.check('[data-opt="result"]');
  await page.waitForFunction(() => Number(document.querySelector(".orma-preview").dataset.height) >= 1350);
  await tap(page, "Zurück");
  await tap(page, "Runde beenden");
  await tap(page, "Unsere Gedanken (1)");
  assert.match(await page.textContent(".orma-book"), /Re-Entry/);
  assert.deepEqual(errors, []);
  await ctx.close();
});

// ---------- Startbild (wie ORNA, geteilt) ----------
/** Helligkeit eines Bildpunkts aus einem Bildschirmfoto (0 dunkel … 255 hell) */
async function brightness(page, x, y) {
  const shot = (await page.screenshot()).toString("base64");
  return page.evaluate(async ({ shot, x, y }) => {
    const img = new Image(); img.src = `data:image/png;base64,${shot}`; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const d = g.getImageData(Math.round(x * devicePixelRatio), Math.round(y * devicePixelRatio), 1, 1).data;
    return (d[0] + d[1] + d[2]) / 3;
  }, { shot, x, y });
}

await check("Startbild: wie ORNA 40 Zeichen und Name, links hell, rechts dunkel – auch im Dunkelmodus; als App einmal pro Sitzung", async () => {
  const { ctx, page, errors } = await open({ reducedMotion: "no-preference", colorScheme: "dark" }, base + "?intro");
  await page.waitForSelector(".orma-intro.is-assembling");
  assert.equal(await page.$$eval(".orma-intro .oi-sym", e => e.length), 40);
  assert.equal(await page.textContent(".oi-name"), "ORMA");
  assert.equal(await page.$eval(".oi-invert", e => getComputedStyle(e).backdropFilter || getComputedStyle(e).webkitBackdropFilter), "invert(1)");
  const w = await page.evaluate(() => innerWidth);
  assert.ok(await brightness(page, w * 0.1, 40) > 200, "links hell");
  assert.ok(await brightness(page, w * 0.9, 40) < 40, "rechts dunkel");
  await page.waitForSelector(".orma-intro", { state: "detached", timeout: 6000 });
  await button(page, "Zu zweit beginnen").waitFor();
  assert.deepEqual(errors, []);
  await ctx.close();
  // installierte App: beim ersten Öffnen das Startbild, beim Neuladen in derselben Sitzung nicht
  const c2 = await browser.newContext({ ...devices["Pixel 7"] });
  await c2.addInitScript(() => { Object.defineProperty(Navigator.prototype, "standalone", { value: true, configurable: true }); });
  const p2 = await c2.newPage();
  await p2.goto(base);
  await p2.waitForSelector(".orma-intro");
  await p2.mouse.click(200, 400);                                            // Antippen überspringt
  await p2.waitForSelector(".orma-intro", { state: "detached", timeout: 2000 });
  await p2.reload(); await p2.waitForSelector("html[data-ready]");
  await p2.waitForTimeout(400);
  assert.equal(await p2.$(".orma-intro"), null);
  await c2.close();
  // reduzierte Bewegung: kein Startbild, Seite sofort sichtbar
  const r = await open({}, base + "?intro");
  await r.page.waitForTimeout(300);
  assert.equal(await r.page.$(".orma-intro"), null);
  assert.equal(await r.page.evaluate(() => document.documentElement.classList.contains("oi-pre")), false);
  await r.ctx.close();
});

// ---------- Alpha-Bereich ----------
for (const [titel, seite, datei, anfang] of [
  ["Prüfraster: Nebeneinander und Nacheinander", "pruefraster", "pruefraster-anwendungsprompt-1.0.0.md", /^# Prüfraster: Nebeneinander und Nacheinander/],
  ["Der Verteilapparat des Körpers", "verteilapparat", "verteilapparat-anwendungsprompt-1.0.0.txt", /^DER VERTEILAPPARAT DES KÖRPERS/],
]) await check(`Alpha, ${titel}: Seite aus der Übersicht, Prompt lässt sich herunterladen, kopieren und im Textfeld markieren`, async () => {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce", permissions: ["clipboard-read", "clipboard-write"] });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(`${origin}/alpha/`);
  await page.getByRole("link", { name: titel, exact: true }).click();
  await page.waitForURL(new RegExp(`/alpha/${seite}/$`));
  // Knopfzeilen: gleicher Abstand zum Abschnitt davor und danach (die leere Kopiermeldung macht keine Lücke)
  const abstaende = await page.locator(".pr-block > .pr-aktionen").evaluateAll(zeilen => zeilen.map(z => {
    const sichtbar = e => e && e.getBoundingClientRect().height > 0;
    let vor = z.previousElementSibling, nach = z.nextElementSibling;
    while (nach && !sichtbar(nach)) nach = nach.nextElementSibling;
    const r = z.getBoundingClientRect();
    return [Math.round(r.top - vor.getBoundingClientRect().bottom), nach ? Math.round(nach.getBoundingClientRect().top - r.bottom) : null];
  }));
  for (const [oben, unten] of abstaende) {
    assert.ok(oben >= 20, `zu knapp über den Knöpfen: ${JSON.stringify(abstaende)}`);
    if (unten !== null) assert.ok(Math.abs(oben - unten) <= 2, `ungleich oben/unten: ${JSON.stringify(abstaende)}`);
  }
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /Anwendungsprompt herunterladen/ }).click()]);
  assert.equal(dl.suggestedFilename(), datei);
  await page.getByRole("button", { name: "Prompt kopieren" }).click();
  await page.locator(".pr-status", { hasText: "Kopiert" }).waitFor();
  const kopiert = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(kopiert, anfang);
  // Textfeld: aufklappen, alles markieren – die Auswahl ist der ganze Prompt
  await page.getByText("Prompt hier anzeigen").click();
  await page.getByRole("button", { name: "Alles markieren" }).click();
  const [auswahl, text] = await page.evaluate(async d => {
    const t = document.querySelector(".pr-text textarea");
    return [t.value.slice(t.selectionStart, t.selectionEnd), await (await fetch("../" + d)).text()];
  }, datei);
  assert.equal(auswahl, text);
  assert.equal(kopiert, text);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("News: Eintrag zu den beiden Prüfrastern zuoberst, Links führen zu beiden Seiten", async () => {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${origin}/news/`);
  const e = page.locator("details.entry").first();
  assert.match(await e.locator("h2").textContent(), /Zwei Prüfraster/);
  await e.locator("summary").click();
  assert.ok(await e.locator("svg[role=img]").isVisible());
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await e.getByRole("link", { name: "Der Verteilapparat des Körpers" }).click();
  await page.waitForURL(/\/alpha\/verteilapparat\/$/);
  await page.goBack();
  const e2 = page.locator("details.entry").first();
  if (!(await e2.evaluate(d => d.open))) await e2.locator("summary").click();   // nach Zurück wieder zugeklappt
  await e2.getByRole("link", { name: "Prüfraster: Nebeneinander und Nacheinander" }).click();
  await page.waitForURL(/\/alpha\/pruefraster\/$/);
  await ctx.close();
});

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

await check("Installierte App: startet in alpha/orma/app/, spielbar, vom selben Service Worker betreut; alpha/orma/ bleibt Website", async () => {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce", serviceWorkers: "allow" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(`${origin}/alpha/orma/app/`);
  await page.waitForSelector("html[data-ready]");
  const m = await page.evaluate(async () => { const l = document.querySelector('link[rel="manifest"]'); return { href: l.href, json: await (await fetch(l.href)).json() }; });
  assert.equal(new URL(m.href).pathname, "/alpha/orma/manifest.webmanifest");
  assert.equal(new URL(m.json.scope, m.href).pathname, "/alpha/orma/app/");
  assert.equal(new URL(m.json.start_url, m.href).pathname, "/alpha/orma/app/");
  await tap(page, "Zu zweit beginnen"); await tap(page, "Beginnen"); await tap(page, "Drehen");
  await button(page, "Gemeinsam lesen").waitFor();
  await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === "activated", null, { timeout: 15000 });
  // ohne Netz öffnet die App-Seite aus dem Speicher
  for (let i = 0; i < 5 && !(await page.evaluate(() => !!navigator.serviceWorker.controller)); i++) await page.reload();
  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector("html[data-ready]");
  assert.equal(new URL(page.url()).pathname, "/alpha/orma/app/");
  await ctx.setOffline(false);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Installieren: Knopf überall ausser in der App; iPhone erklärt «Teilen» → «Zum Home-Bildschirm», Chrome ruft das Installationsfenster", async () => {
  const inst = page => page.getByRole("button", { name: "ORMA als App installieren" });
  // iPhone (Safari bietet nie selbst an): Knopf da, Tippen zeigt die Schritte
  const a = await open({ ...devices["iPhone 13"] });
  await inst(a.page).click();
  assert.equal(await inst(a.page).getAttribute("aria-expanded"), "true");
  assert.match(await a.page.locator(".orma-install-help").textContent(), /«Teilen».*«Zum Home-Bildschirm»/);
  assert.ok(await a.page.locator(".orma-install-help").isVisible());
  assert.deepEqual(a.errors, []);
  await a.ctx.close();
  // Android/Chrome mit Angebot «installierbar»: Tippen öffnet das Installationsfenster, danach ist der Knopf weg
  const b = await open();
  await b.page.evaluate(() => {
    window.__prompted = 0;
    const e = new Event("beforeinstallprompt", { cancelable: true });
    e.prompt = () => { window.__prompted += 1; };
    e.userChoice = Promise.resolve({ outcome: "accepted" });
    dispatchEvent(e);
  });
  await inst(b.page).click();
  assert.equal(await b.page.evaluate(() => window.__prompted), 1);
  await inst(b.page).waitFor({ state: "hidden" });
  await b.ctx.close();
  // in der installierten App: kein Knopf
  const ctx = await browser.newContext({ ...devices["iPhone 13"], reducedMotion: "reduce" });
  await ctx.addInitScript(() => { Object.defineProperty(Navigator.prototype, "standalone", { value: true, configurable: true }); });
  const page = await ctx.newPage();
  await page.goto(base);
  await page.waitForSelector("html[data-ready]");
  assert.equal(await inst(page).count(), 0);
  await ctx.close();
});

await check("Rückfall «Verknüpfung erstellen»: auf Android in der Startansicht, nicht auf dem iPhone, nicht in der App", async () => {
  const a = await open();
  assert.match(await a.page.locator(".orma-install-alt").textContent(), /«Zum Startbildschirm hinzufügen».*«Verknüpfung erstellen»/);
  await a.ctx.close();
  const b = await open({ ...devices["iPhone 13"] });
  assert.equal(await b.page.locator(".orma-install-alt").count(), 0);
  await b.ctx.close();
  const ctx = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce" });
  await ctx.addInitScript(() => { const m = window.matchMedia.bind(window); window.matchMedia = q => q.includes("standalone") ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : m(q); });
  const page = await ctx.newPage();
  await page.goto(base);
  await page.waitForSelector("html[data-ready]");
  assert.equal(await page.locator(".orma-install-alt").count(), 0);
  await ctx.close();
});

await check("Aktualisieren: neue Fassung sofort beim nächsten Öffnen, auch wenn der Server 10 Minuten Zwischenspeicher erlaubt (wie GitHub Pages)", async () => {
  // Vorschaltserver: wie GitHub Pages «max-age=600»; jede ausgelieferte Seite trägt eine laufende Nummer
  const http = await import("node:http");
  let n = 0;
  const proxy = http.createServer(async (req, res) => {
    const r = await fetch(origin + req.url);
    let body = Buffer.from(await r.arrayBuffer());
    const type = r.headers.get("content-type") || "";
    if (type.includes("text/html")) body = Buffer.from(String(body).replace("<title>", `<title>[${++n}] `));
    res.writeHead(r.status, { "content-type": type, "cache-control": "max-age=600" });
    res.end(body);
  });
  await new Promise(ok => proxy.listen(0, ok));
  try {
    const url = `http://localhost:${proxy.address().port}/orma/`;
    const ctx = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce", serviceWorkers: "allow" });
    const page = await ctx.newPage();
    await page.goto(url);
    await page.waitForFunction(async () => (await navigator.serviceWorker.getRegistration())?.active?.state === "activated", null, { timeout: 15000 });
    for (let i = 0; i < 5 && !(await page.evaluate(() => !!navigator.serviceWorker.controller)); i++) await page.reload();
    // zweimal neu öffnen: jedes Mal fragt der Service Worker beim Server nach, statt die Browser-Kopie zu nehmen
    const nr = async () => Number((await page.title()).match(/^\[(\d+)\]/)[1]);
    await page.goto(url); const a = await nr();
    await page.goto(url); const b = await nr();
    assert.ok(b > a, `Seite kam aus dem Zwischenspeicher (${a} → ${b})`);
    await ctx.close();
  } finally {
    proxy.closeAllConnections();               // auch bei Fehlschlag: offene Verbindungen halten den Testlauf sonst am Leben
    proxy.close();
  }
});

// ---------- Startseite: Apps als Wisch-Galerie ----------
await check("Startseite (Handy): ORMA steht bei den Apps zuerst, Diamanten über Apps und Artefakten folgen dem Wischen", async () => {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(`${origin}/index.html`);
  const apps = page.getByRole("group", { name: "Apps durchblättern" });
  const dots = apps.getByRole("button");
  await dots.first().waitFor();
  assert.equal(await dots.count(), 2);
  assert.equal(await dots.nth(0).getAttribute("aria-label"), "App 1 von 2: ORMA");
  assert.equal(await dots.nth(1).getAttribute("aria-label"), "App 2 von 2: ORNA");
  assert.equal(await dots.nth(0).getAttribute("aria-current"), "true");
  // Antippen des zweiten Diamanten wischt zu ORNA
  await dots.nth(1).click();
  await page.waitForFunction(() => document.querySelector('[aria-label="App 2 von 2: ORNA"]').getAttribute("aria-current") === "true");
  // die Artefakte-Galerie behält ihre eigenen Diamanten
  const art = page.getByRole("group", { name: "Artefakte durchblättern" }).getByRole("button");
  assert.ok(await art.count() >= 2);
  assert.match(await art.first().getAttribute("aria-label"), /^Artefakt 1 von /);
  assert.deepEqual(errors, []);
  await ctx.close();
});

await check("Startseite und News: ORMA zeigt dasselbe drehende Rad wie ORNA, vertikal geteilt, rechts invers (kein Bild mit Text)", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${origin}/index.html`);
  const thumb = page.locator('.grid--apps a.thumb[href="alpha/orma/"]');
  await thumb.scrollIntoViewIfNeeded();
  assert.equal(await thumb.locator('svg.post-anim[data-icon="rad"]').count(), 1);
  assert.equal(await thumb.locator("img").count(), 0);
  assert.ok(await thumb.evaluate(e => e.classList.contains("split-invert")));
  // links hell, rechts dunkel (Hell-Modus), gemessen nahe am oberen Rand, ausserhalb des Rads
  const r = await thumb.boundingBox();
  const links = await brightness(page, r.x + r.width * 0.1, r.y + 8), rechts = await brightness(page, r.x + r.width * 0.9, r.y + 8);
  assert.ok(links > 200 && rechts < 60, `links ${links}, rechts ${rechts}`);
  // das Rad dreht: zwei Aufnahmen im Abstand unterscheiden sich
  const a = await thumb.screenshot(); await page.waitForTimeout(800); const b = await thumb.screenshot();
  assert.ok(!a.equals(b), "Rad steht still");
  await page.goto(`${origin}/news/`);
  const fig = page.locator("details.entry", { has: page.locator("h2", { hasText: "ORMA – ein neues Spiel" }) }).locator(".split-invert svg.post-anim[data-icon=rad]");
  assert.equal(await fig.count(), 1);
  assert.equal(await page.locator('details.entry img[src*="og-orma"]').count(), 0);
  await ctx.close();
});

// ---------- Termine: Einträge ausblenden, ohne sie zu löschen ----------
await check("Termine: ausgeblendete Einträge (hidden) sind unsichtbar, dann steht der Hinweis; einer sichtbar → Hinweis weg", async () => {
  const ctx = await browser.newContext({ ...devices["Pixel 7"], reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.goto(`${origin}/termine/`);
  assert.equal(await page.locator("details.entry").count(), 2);
  assert.equal(await page.locator("details.entry:visible").count(), 0);
  assert.ok(await page.getByText("Zurzeit sind keine Termine eingetragen.").isVisible());
  await page.evaluate(() => document.querySelector("details.entry").removeAttribute("hidden"));
  assert.equal(await page.locator("details.entry:visible").count(), 1);
  assert.equal(await page.getByText("Zurzeit sind keine Termine eingetragen.").isVisible(), false);
  await ctx.close();
});

await browser.close();
server.close();
const failed = results.filter(r => r[0] !== "ok");
console.log(`\n${results.length - failed.length}/${results.length} ok`);
process.exit(failed.length ? 1 : 0);
