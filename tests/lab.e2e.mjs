// ORNAMENT LAB – Browsertest (Playwright, Chromium) des ersten durchgehenden Prozesses mit dem Beispielbild:
// Bild → ORNA-Konstellation → The Fictory (sechs Zustände nebeneinander) → Variante wählen → Feedback mit modulierten Varianten → Variante wählen
// → Bildsignal koppelt Wiederholung → Animation → Projekt speichern und wieder öffnen; dazu jev-assistiert, experimentell, Kette,
// kompositorisches Profil mit Zielprofil, Tondatei als Steuersignal für ein Feedback über die Zeit, Animation über Stationen (auch im Takt
// der Toneinsätze mit Tonspur), PHORMA-Szenen auf der eigenen Bühne (I, II, III), The Fictory lebendig, Handy.
//   NODE_PATH=$(npm root -g) node tests/lab.e2e.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const root = new URL("../", import.meta.url);
const { startServer } = await import(new URL("tools/serve-orma.mjs", root).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/alpha/lab/`;
// WebGL 2 über SwiftShader, damit die lebendigen Effekte (medien/gpu.js) auch ohne Grafikkarte laufen
const browser = await playwright.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ergebnisse = [];
const NUR = process.env.LAB_E2E_NUR || "";   // nur die Prüfungen, deren Name das enthält (zum Entwickeln; die Startprüfungen laufen immer)
async function check(name, fn) {
  if (NUR && !name.includes(NUR) && ergebnisse.length >= 2) { console.log("--  ", name); return; }
  try { await fn(); ergebnisse.push(true); console.log("ok  ", name); }
  catch (e) { ergebnisse.push(false); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 8).join("\n      ")); }
}
async function oeffne(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, ...opts });
  const page = await ctx.newPage();
  const fehler = [], fremd = [];
  page.on("pageerror", (e) => { fehler.push(e.message); if (process.env.LAB_E2E_DEBUG) console.log("      pageerror:", e.message); });
  page.on("console", (m) => { if (m.type() === "error") { fehler.push(m.text()); if (process.env.LAB_E2E_DEBUG) console.log("      console:", m.text()); } });
  page.on("request", (r) => { const u = new URL(r.url()); if (!["localhost", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) fremd.push(r.url()); });
  page.on("dialog", (d) => d.accept());
  await page.goto(base);
  await page.waitForFunction(() => globalThis.ornamentLab);
  return { ctx, page, fehler, fremd };
}
const S = (page, fn) => page.evaluate(fn);
const zaehle = (page) => S(page, () => ({ ergebnisse: ornamentLab.projekt.ergebnisse.length, knoten: ornamentLab.projekt.knoten.length, laeuft: Boolean(ornamentLab.laeuft) }));
async function warteFertig(page, ms = 120000) { await page.waitForFunction(() => !ornamentLab.laeuft, null, { timeout: ms }); }
async function operation(page, id) { await page.locator(`.op input[value="${id}"]`).check(); await page.waitForSelector("#op-form:not([hidden]) #ausfuehren"); }
async function ausfuehren(page) { await page.click("#ausfuehren"); await page.waitForTimeout(50); await warteFertig(page); }

const { ctx, page, fehler, fremd } = await oeffne();
let gespeichert = null;

await check("Start: vier Bereiche, Register mit 40 wählbaren Operationen, 3 ausgemustert, keine Fehler", async () => {
  for (const id of ["material", "operationen", "experiment", "protokoll"]) assert.ok(await page.locator(`#${id}`).isVisible(), id);
  assert.match(await page.textContent("#status"), /40 Operationen im Register \(3 ausgemustert\)/);
  assert.deepEqual(fehler, []);
});

await check("Material: eigenes Bild importieren (Beispielbild), Ausgang gesetzt, Arbeitsbild begrenzt", async () => {
  await page.click("#beispiel");
  await page.waitForFunction(() => ornamentLab.aktuell);
  const e = await S(page, () => { const e = ornamentLab.projekt.ergebnisse[0]; return { typ: e.typ, breite: e.breite, hoehe: e.hoehe, sha: e.sha256, original: e.herkunft.original }; });
  assert.equal(e.typ, "IMAGE"); assert.ok(Math.max(e.breite, e.hoehe) <= 2048); assert.match(e.sha, /^[0-9a-f]{64}$/); assert.match(e.original.sha256, /^[0-9a-f]{64}$/);
  assert.equal(await page.locator("#materialien img").count(), 1);
});

await check("ORNA: Konstellation ziehen; Ziehung als Zufall, Regel mit Quelle protokolliert", async () => {
  await operation(page, "orna.konstellation");
  await ausfuehren(page);
  const d = await S(page, () => ornamentLab.projekt.entscheidungen.map((x) => [x.art, x.gegenstand]));
  assert.deepEqual(d[0], ["mensch", "operation"]);
  assert.deepEqual(d[1], ["zufall", "konstellation"]);
  assert.equal(d[2][1], "operationsregel");
  assert.ok(["jev", "regel", "zufall"].includes(d[2][0]));
  assert.ok(await page.locator(".text-karte").isVisible());
  assert.equal(await S(page, () => ornamentLab.projekt.ergebnisse.find((e) => e.id === ornamentLab.aktuell).typ), "IMAGE", "der Bildausgang bleibt");
});

await check("The Fictory mit Konstellation: sechs Zustände nebeneinander, verschieden, Regel aus ORNA", async () => {
  await operation(page, "fictory.prozess");
  const k = await page.locator("#op-form select").first().inputValue();
  assert.ok(k, "die Konstellation ist als zweiter Eingang vorgewählt");
  await page.locator('#op-form input[data-param="seite"]').fill("640");
  await ausfuehren(page);
  assert.equal(await page.locator("#buehne .karte").count(), 6);
  const r = await S(page, () => { const k = ornamentLab.projekt.knoten.at(-1); return { status: k.status, regel: k.protokoll.lauf.regel, herkunft: k.protokoll.lauf.regelHerkunft, sha: k.ausgaben.map((id) => ornamentLab.projekt.ergebnisse.find((e) => e.id === id).sha256) }; });
  assert.equal(r.status, "fertig");
  assert.match(r.regel, /^R[1-7]$/); assert.match(r.herkunft, /^ORNA/);
  assert.equal(new Set(r.sha).size, 6, "sechs verschiedene PNG");
});

await check("Weiterführen: Variante wählen (Mensch), Feedback mit sechs modulierten Varianten, zweite Wahl", async () => {
  await page.locator("#buehne .karte").nth(3).getByRole("button", { name: "weiterführen" }).click();
  const gewaehlt = await S(page, () => ornamentLab.aktuell);
  await operation(page, "lab.feedback");
  await page.locator('#op-form input[data-param="seite"]').fill("400");
  await ausfuehren(page);
  assert.equal(await page.locator("#buehne .karte").count(), 6);
  const k = await S(page, () => { const k = ornamentLab.projekt.knoten.at(-1); return { ein: Object.values(k.eingaben)[0], route: k.variation.routen[0], dreh: k.ausgaben.map((id) => ornamentLab.projekt.ergebnisse.find((e) => e.id === id).variante.parameter.drehung) }; });
  assert.equal(k.ein, gewaehlt, "Feedback liest die gewählte Variante");
  assert.equal(k.route.ziel, "drehung");
  assert.ok(new Set(k.dreh).size >= 4, `Drehung verteilt: ${k.dreh}`);
  await page.locator("#buehne .karte").nth(1).getByRole("button", { name: "weiterführen" }).click();
});

await check("Kopplung: Bildsignal → moduliert die Wiederholung (Quelle Steuersignal, einpolig, abgetastet)", async () => {
  await operation(page, "lab.bildsignal");
  await ausfuehren(page);
  assert.ok(await page.locator(".signal svg").isVisible());
  await operation(page, "lab.wiederholung");
  await page.locator('#op-form input[data-param="seite"]').fill("400");
  const sel = page.locator("#op-form select");
  for (let i = 0; i < await sel.count(); i++) if ((await sel.nth(i).locator("option").allTextContents()).includes("Steuersignal aus einem Ergebnis")) await sel.nth(i).selectOption("signal");
  // einpolig und abgetastet (nach VCV Rack: LFO-Schalter OFFSET, Sample & Hold)
  for (let i = 0; i < await sel.count(); i++) if ((await sel.nth(i).locator("option").allTextContents()).some((t) => t.startsWith("einpolig"))) await sel.nth(i).selectOption("einpolig");
  await page.locator('#op-form input[data-param="halten"]').fill("3");
  await ausfuehren(page);
  const route = await S(page, () => ornamentLab.projekt.knoten.at(-1).variation.routen[0]), r = route.modulator;
  assert.equal(r.quelle, "signal"); assert.match(r.ergebnis, /^e-/);
  assert.equal(route.polaritaet, "einpolig"); assert.equal(r.halten, 3);
  await page.locator("#buehne .karte").nth(2).getByRole("button", { name: "weiterführen" }).click();
});

await check("Vergleich: zwei Varianten nebeneinander → Differenz als Beobachtung", async () => {
  const kId = await S(page, () => ornamentLab.projekt.ergebnisse.find((e) => e.id === ornamentLab.aktuell).knoten);
  await page.locator('input[name="ansicht"][value="nach"]').check({ force: true });
  await page.locator('input[name="ansicht"][value="neben"]').check({ force: true });
  assert.equal(await page.locator("#buehne .karte").count(), 6, "die Varianten der gewählten Wiederholung");
  void kId;
  await page.locator(".karte label.vergleich input").nth(0).check();
  await page.locator(".karte label.vergleich input").nth(1).check();
  await page.getByRole("button", { name: "Differenz der beiden zeigen" }).click();
  await warteFertig(page);
  assert.match(await page.textContent("#status"), /Messung, keine Bewertung/);
});

await check("Nacheinander: Verlauf vom Material bis zum gewählten Zustand, Entscheidungsarten sichtbar", async () => {
  await page.locator('input[name="ansicht"][value="nach"]').check({ force: true });
  const schritte = await page.locator(".verlauf > li").count();
  assert.equal(schritte, 4, "Material + Fictory + Feedback + Wiederholung");
  assert.ok(await page.locator(".verlauf .art.mensch").count() >= 3);
});

await check("Animation des letzten Schritts: Video wird erzeugt und ins Projekt aufgenommen", async () => {
  await page.click("#animation");
  await warteFertig(page, 180000);
  const x = await S(page, () => ornamentLab.projekt.exporte.at(-1));
  assert.equal(x.art, "animation"); assert.ok(x.bilder >= 30, `${x.bilder} Bilder`);
  assert.ok(await page.locator(".film video").isVisible());
});

await check("Für Works: Ordner mit werk.json, bild.png, Film und verlauf.json; die Werkschau baut daraus eine Werkseite", async () => {
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Für Works" }).click()]);
  assert.match(dl.suggestedFilename(), /-works\.zip$/);
  const { leseZip } = await import(new URL("alpha/lab/kern/archiv.js", root).href);
  const dateien = Object.fromEntries(await leseZip(new Uint8Array(readFileSync(await dl.path()))));
  const namen = Object.keys(dateien), ordner = namen[0].split("/")[0];
  for (const n of ["werk.json", "bild.png", "film.mp4", "verlauf.json"]) assert.ok(namen.includes(`${ordner}/${n}`), `${n} fehlt: ${namen.join(", ")}`);
  const werk = JSON.parse(new TextDecoder().decode(dateien[`${ordner}/werk.json`]));
  assert.equal(werk.format, "ornament-lab-werk"); assert.equal(werk.film, "film.mp4"); assert.equal(werk.veroeffentlicht, false);
  assert.ok(werk.operationen.length >= 3, werk.operationen.join(", "));
  assert.equal((await S(page, () => ornamentLab.projekt.exporte.at(-1))).art, "werk");
  // dieselben Dateien in eine leere Werkschau gelegt: Übersicht und Werkseite entstehen, das Werk ist veröffentlicht erst mit «veroeffentlicht: true»
  const { mkdtempSync, mkdirSync, writeFileSync } = await import("node:fs"), { tmpdir } = await import("node:os");
  const ziel = mkdtempSync(join(tmpdir(), "works-"));
  mkdirSync(join(ziel, ordner));
  for (const [n, b] of Object.entries(dateien)) writeFileSync(join(ziel, n), b);
  const { baue } = await import(new URL("tools/build-lab-works.mjs", root).href);
  assert.equal(baue({ ordner: ziel }).werke.length, 0, "ein frischer Export ist noch nicht veröffentlicht");
  writeFileSync(join(ziel, ordner, "werk.json"), JSON.stringify({ ...werk, veroeffentlicht: true }));
  const r = baue({ ordner: ziel });
  assert.equal(r.werke.length, 1);
  const seite = readFileSync(join(ziel, ordner, "index.html"), "utf8");
  assert.match(seite, /film\.mp4/); assert.match(seite, /verlauf\.json/);
});

await check("Animation über Stationen: der Verlauf als Stationen, Übergang als Verlauf der Operation, Film mit Partitur im Projekt", async () => {
  assert.equal(await page.locator(".stationen-liste > li").count(), 4, "Material, Fictory, Feedback, Wiederholung");
  await page.locator('.stationen input[data-param="halten"]').fill("0.4");
  await page.locator('.stationen input[data-param="uebergang"]').fill("0.4");
  await page.locator('.stationen input[data-param="seite"]').fill("400");
  await page.locator('.stationen-regler label:has(> span:text-is("Übergang")) select').selectOption("verlauf");
  await page.locator('.stationen-regler label:has(> span:text-is("Modulation über die Stationen")) select').selectOption("saege");
  assert.match(await page.textContent("#stationen-plan"), /4 Auftritte/);
  await page.click("#stationenfilm");
  await warteFertig(page, 240000);
  const x = await S(page, () => ornamentLab.projekt.exporte.at(-1));
  assert.equal(x.art, "stationen", await page.textContent("#status"));
  assert.equal(x.stationen.length, 4); assert.equal(x.zeitplan.length, 4);
  assert.deepEqual(x.partitur.folge.slice(0, 3).map((f) => f.uebergang.art), ["verlauf", "verlauf", "verlauf"], "jeder Schritt ist aus dem vorigen entstanden");
  assert.equal(x.partitur.routen[0].modulator.quelle, "saege");
  assert.ok(x.bilder >= x.partitur.bilder, `${x.bilder} Bilder`);
  assert.ok(Math.max(x.breite, x.hoehe) <= 400);
  assert.ok(await page.locator(".stationen video").isVisible());
  const d = await S(page, () => ornamentLab.projekt.entscheidungen.at(-1));
  assert.deepEqual([d.art, d.gegenstand, d.gewaehlt.length], ["mensch", "stationen", 4]);
  assert.match(await page.textContent("#ereignisse"), /Film über 4 Stationen/);
  // die Varianten eines Schritts als Stationen, umordnen, zurück zum Verlauf
  await page.locator('input[name="ansicht"][value="neben"]').check({ force: true });
  await page.getByRole("button", { name: "alle als Stationen" }).click();
  await page.locator('input[name="ansicht"][value="nach"]').check({ force: true });
  assert.equal(await page.locator(".stationen-liste > li").count(), 6);
  const vorher = await S(page, () => ornamentLab.stationen.map((x) => x.ergebnis));
  await page.getByRole("button", { name: "Station 1 nach hinten" }).click();
  assert.deepEqual(await S(page, () => ornamentLab.stationen.map((x) => x.ergebnis)), [vorher[1], vorher[0], ...vorher.slice(2)]);
  assert.equal(await page.locator('.stationen-liste option[value="verlauf"]:not([disabled])').count(), 0, "Geschwister haben keinen Verlauf zueinander");
  // frühere Schritte unter «Nebeneinander»: ihre Varianten kommen zur Auswahl hinzu
  await page.locator('input[name="ansicht"][value="neben"]').check({ force: true });
  const schritte = page.locator(".schritte button");
  assert.equal(await schritte.count(), 3, "Fictory, Feedback, Wiederholung");
  await schritte.nth(0).click();
  await page.getByRole("button", { name: "alle als Stationen dazu" }).click();
  const zusammen = await S(page, () => ornamentLab.stationen.length);
  assert.ok(zusammen > 6, `${zusammen} Stationen aus zwei Schritten`);
  await page.locator('input[name="ansicht"][value="nach"]').check({ force: true });
  assert.equal(await page.locator(".stationen-liste > li").count(), zusammen);
  const alle = page.getByRole("button", { name: /alle Varianten aller Schritte/ });
  const anzahl = Number((await alle.textContent()).match(/\((\d+)\)/)[1]);
  await alle.click();
  assert.equal(await page.locator(".stationen-liste > li").count(), anzahl, "alle Varianten aller Schritte");
  assert.ok(anzahl >= zusammen);
  await page.getByRole("button", { name: "Verlauf übernehmen" }).click();
  assert.equal(await page.locator(".stationen-liste > li").count(), 4);
});

await check("Kette speichern und auf das Material anwenden (wie ein Combinator)", async () => {
  await page.locator("#ketten input").fill("Fictory, Feedback, Raster");
  await page.getByRole("button", { name: "Verlauf speichern" }).click();
  await page.locator("#materialien button").first().click();
  const vorher = (await zaehle(page)).knoten;
  await page.getByRole("button", { name: "anwenden" }).click();
  await warteFertig(page, 180000);
  const r = await S(page, () => ({ ops: ornamentLab.projekt.knoten.slice(-3).map((k) => k.operation), arten: ornamentLab.projekt.entscheidungen.slice(-2).map((d) => d.art), meldungen: ornamentLab.projekt.meldungen.map((m) => m.text) }));
  assert.equal((await zaehle(page)).knoten, vorher + 3);
  assert.deepEqual(r.ops, ["fictory.prozess", "lab.feedback", "lab.wiederholung"]);
  assert.ok(r.arten.every((a) => a === "regel"));
});

await check("jev-assistiert: Regelvorschläge mit Gründen; jev live ehrlich als nicht eingerichtet", async () => {
  await page.locator('input[name="modus"][value="jev"]').check({ force: true });
  assert.ok(await page.locator("#vorschlaege .art.regel").count() >= 1);
  assert.ok(await page.getByRole("button", { name: "jev fragen" }).isDisabled());
  await page.locator("#vorschlaege").getByRole("button", { name: "übernehmen" }).first().click();
  await page.locator('#op-form input[data-param="seite"]').fill("320").catch(() => {});
  await ausfuehren(page);
  assert.equal(await S(page, () => ornamentLab.projekt.entscheidungen.filter((d) => d.gegenstand === "operation").at(-1).art), "regel");
});

await check("jev live über die Zwischenstelle (vorgetäuscht): Knopf frei, nur Kennungen gesendet, Übernahme als jev mit Quelle live im Protokoll", async () => {
  const c = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await c.newPage();
  const gesendet = [];
  await p.route("**/alpha/lab/jev/wahl.php", (r) => {
    if (r.request().method() === "GET") return r.fulfill({ contentType: "application/json", body: JSON.stringify({ bereit: true }) });
    const lage = r.request().postDataJSON(); gesendet.push(lage);
    return r.fulfill({ contentType: "application/json", body: JSON.stringify({ wahrscheinlichkeiten: Object.fromEntries(lage.optionen.map((o, i) => [o, o === "lab.farbe" ? 0.8 : 0.02 * i])), modell: "jev-test", zwischengespeichert: false }) });
  });
  await p.goto(base);
  await p.waitForFunction(() => globalThis.ornamentLab);
  await p.waitForFunction(() => /jev live: bereit/.test(document.querySelector("#status").textContent));
  await p.click("#beispiel");
  await p.waitForFunction(() => ornamentLab.aktuell);
  await p.locator('input[name="modus"][value="jev"]').check({ force: true });
  await p.getByRole("button", { name: "jev fragen" }).click();
  await p.waitForSelector("#vorschlaege .art.jev");
  assert.deepEqual(Object.keys(gesendet[0]), ["verlauf", "optionen"]);
  assert.ok(gesendet[0].optionen.every((o) => /^[a-z]+\.[a-z0-9-]+$/.test(o)));
  await p.locator("#vorschlaege li", { has: p.locator(".art.jev") }).first().getByRole("button", { name: "übernehmen" }).click();
  assert.equal(await S(p, () => ornamentLab.op ?? document.querySelector(".op input:checked")?.value), "lab.farbe", "der wahrscheinlichste Vorschlag steht oben");
  await ausfuehren(p);
  const d = await S(p, () => ornamentLab.projekt.entscheidungen.filter((x) => x.gegenstand === "operation").at(-1));
  assert.equal(d.art, "jev");
  assert.equal(d.details.quelle, "live"); assert.equal(d.details.modell, "jev-test"); assert.equal(d.details.wahrscheinlichkeit, 0.8);
  await c.close();
});

await check("Experimentell: höchstens die gewählten Schritte, Wahlen als Zufall mit Startwert", async () => {
  await page.locator('input[name="modus"][value="experimentell"]').check({ force: true });
  await page.locator("#materialien button").first().click();
  const vorher = (await zaehle(page)).knoten;
  await page.click("#experiment-start");
  await warteFertig(page, 180000);
  const n = (await zaehle(page)).knoten - vorher;
  assert.ok(n >= 1 && n <= 3, `${n} Schritte`);
  const arten = await S(page, () => ornamentLab.projekt.entscheidungen.slice(-2).map((d) => [d.art, typeof d.details.experimentStartwert]));
  assert.deepEqual(arten, [["zufall", "number"], ["zufall", "number"]]);
  await page.locator('input[name="modus"][value="manuell"]').check({ force: true });
});

await check("Projekt speichern: Archiv mit projekt.json und PNG; wieder öffnen ergibt dasselbe Projekt", async () => {
  const vorher = await S(page, () => JSON.parse(JSON.stringify({ e: ornamentLab.projekt.ergebnisse.map((e) => [e.id, e.sha256]), k: ornamentLab.projekt.knoten.length, d: ornamentLab.projekt.entscheidungen.length })));
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#speichern")]);
  assert.match(dl.suggestedFilename(), /\.ornalab\.zip$/);
  gespeichert = await dl.path();
  const roh = readFileSync(gespeichert);
  assert.ok(roh.includes(Buffer.from("projekt.json")));
  await page.click("#neu");
  assert.equal((await zaehle(page)).ergebnisse, 0);
  await page.setInputFiles("#oeffnen", gespeichert);
  await page.waitForFunction(() => ornamentLab.projekt.ergebnisse.length > 0);
  const nachher = await S(page, () => ({ e: ornamentLab.projekt.ergebnisse.map((e) => [e.id, e.sha256]), k: ornamentLab.projekt.knoten.length, d: ornamentLab.projekt.entscheidungen.length }));
  assert.deepEqual(nachher, vorher);
  await page.locator('input[name="ansicht"][value="nach"]').check({ force: true });
  await page.waitForFunction(() => [...document.querySelectorAll(".verlauf img")].every((i) => i.complete && i.naturalWidth > 0));
  // nach dem Öffnen weiterarbeiten: die Bilder werden aus den PNG des Archivs gelesen
  await page.locator('input[name="ansicht"][value="neben"]').check({ force: true });
  await operation(page, "lab.farbe");
  await ausfuehren(page);
  assert.equal(await S(page, () => ornamentLab.projekt.knoten.at(-1).status), "fertig");
});

await check("Kompositorisches Profil: messen, Skizze und Werte; Komposition verändern mit modulierten Varianten und mit Zielprofil", async () => {
  await page.locator("#materialien button").first().click();
  await operation(page, "lab.profil");
  await ausfuehren(page);
  assert.ok(await page.locator(".profil svg").isVisible());
  assert.match(await page.textContent(".profil dl"), /Symmetrie.*links–rechts/);
  assert.equal(await S(page, () => ornamentLab.projekt.ergebnisse.find((e) => e.id === ornamentLab.aktuell).typ), "IMAGE", "der Bildausgang bleibt");
  // ein anderer Ausgang: die zuletzt erzeugte Farbvariante, verändert über sechs Varianten der Asymmetrie
  const farbe = await S(page, () => ornamentLab.projekt.knoten.filter((k) => k.operation === "lab.farbe").at(-1).ausgaben[0]);
  await page.evaluate((id) => { ornamentLab.aktuell = id; }, farbe);
  await page.locator('input[name="ansicht"][value="nach"]').check({ force: true });
  await page.locator('input[name="ansicht"][value="neben"]').check({ force: true });
  await operation(page, "lab.komposition");
  const zielWahl = page.locator("#op-form select").first();
  assert.equal(await zielWahl.inputValue(), "", "das Zielprofil ist nicht vorgewählt");
  await page.locator('#op-form input[data-param="seite"]').fill("400");
  // vom Bildsignal-Schritt stehen noch «einpolig» und 3 Stufen in der Variation
  await page.locator('#op-form input[data-param="halten"]').fill("0");
  const auswahl = page.locator("#op-form select");
  for (let i = 0; i < await auswahl.count(); i++) if ((await auswahl.nth(i).locator("option").allTextContents()).some((t) => t.startsWith("bipolar"))) await auswahl.nth(i).selectOption("bipolar");
  await ausfuehren(page);
  assert.equal(await page.locator("#buehne .karte").count(), 6);
  const k = await S(page, () => { const k = ornamentLab.projekt.knoten.at(-1); return { ziel: k.variation.routen[0].ziel, prot: k.protokoll.map((x) => [x.faktoren.symmetrie, x.nachher.symmetrie.linksRechts]) }; });
  assert.equal(k.ziel, "symmetrie");
  assert.ok(new Set(k.prot.map((x) => x[0])).size >= 4, `Faktoren verteilt: ${JSON.stringify(k.prot)}`);
  await page.locator("#buehne .karte").nth(4).getByRole("button", { name: "weiterführen" }).click();
  await operation(page, "lab.komposition");
  const wahl = page.locator("#op-form select").first();
  const option = (await wahl.locator("option").allTextContents()).find((t) => t.startsWith("Profil von"));
  assert.ok(option, "das Profil des Materials steht als Ziel bereit");
  await wahl.selectOption({ label: option });
  await page.locator('#op-form input[data-param="anzahl"]').fill("1");
  await page.locator('#op-form input[data-param="seite"]').fill("400");
  await ausfuehren(page);
  const z = await S(page, () => { const k = ornamentLab.projekt.knoten.at(-1); return { ziel: k.protokoll.zielprofil, eingang: Object.keys(k.eingaben), kurz: ornamentLab.projekt.ergebnisse.find((e) => e.id === k.ausgaben[0]).befund.kurz }; });
  assert.ok(z.ziel); assert.deepEqual(z.eingang, ["bild", "profil"]); assert.match(z.kurz, /→|unverändert/);
  assert.ok(await page.locator("#buehne .karte .werte").first().isVisible());
});

/** WAV (16 Bit, mono, 22,05 kHz), 4 s: Anschläge alle 0,5 s, ab 2 s ein lauter Ton dazu */
function wav(rate = 22050, dauer = 4) {
  const n = rate * dauer, b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  let z = 3;
  for (let i = 0; i < n; i++) {
    const t = i / rate, nach = (t - 0.25) % 0.5;
    let v = t < 2 ? 0.03 * Math.sin(2 * Math.PI * 110 * t) : 0.45 * Math.sin(2 * Math.PI * 880 * t);
    if (t >= 0.25 && nach < 0.02) { z = (z * 1103515245 + 12345) & 0x7fffffff; v += (z / 0x7fffffff - 0.5) * (1 - nach / 0.02); }
    b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2);
  }
  return b;
}

await check("Ton: eine Tondatei wird Material, Tonsignal misst sie, das Signal dreht ein Feedback über die Zeit; Speichern und Öffnen mit Ton", async () => {
  const datei = { name: "takt.wav", mimeType: "audio/wav", buffer: wav() };
  await page.setInputFiles("#tondatei", datei);
  await page.waitForFunction(() => ornamentLab.projekt.ergebnisse.find((e) => e.id === ornamentLab.aktuell)?.typ === "AUDIO");
  const m = await S(page, () => { const e = ornamentLab.projekt.ergebnisse.find((x) => x.id === ornamentLab.aktuell); return { datei: e.datei, ton: e.ton, sha: e.sha256 }; });
  assert.match(m.datei, /^medien\/m-.*\.wav$/); assert.equal(m.ton.dauer, 4); assert.equal(m.ton.kanaele, 1); assert.match(m.sha, /^[0-9a-f]{64}$/);
  assert.ok(await page.locator("#buehne .ton-karte audio").isVisible());
  assert.ok(await page.locator("#materialien .ton-symbol").count() >= 1);
  await operation(page, "lab.tonsignal");
  await ausfuehren(page);
  const sig = await S(page, () => { const k = ornamentLab.projekt.knoten.at(-1); const [s, e] = k.ausgaben.map((id) => ornamentLab.projekt.ergebnisse.find((x) => x.id === id)); return { id: s.id, typ: [s.typ, e.typ], werte: s.daten.werte, dauer: s.daten.dauer, einsaetze: e.daten.ereignisse.length, aktuell: ornamentLab.aktuell }; });
  assert.deepEqual(sig.typ, ["CONTROL_SIGNAL", "EVENT_SEQUENCE"]);
  assert.equal(sig.dauer, 4);
  const mitte = sig.werte.length / 2, avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  assert.ok(avg(sig.werte.slice(mitte + 5)) > avg(sig.werte.slice(0, mitte - 5)) + 0.2, "die zweite Hälfte ist lauter");
  assert.ok(sig.einsaetze >= 4, `${sig.einsaetze} Einsätze`);
  assert.equal(await page.locator("#buehne .signal svg").count(), 2, "Steuersignal und Ereignisfolge");
  // ein Bild wählen, Feedback über die Zeit vom Ton steuern lassen
  await page.locator("#materialien button").first().click();
  await operation(page, "lab.feedback");
  await page.locator('#op-form input[data-param="seite"]').fill("300");
  await page.locator('#op-form input[data-param="iterationen"]').fill("12");
  const sel = page.locator("#op-form select");
  for (let i = 0; i < await sel.count(); i++) if ((await sel.nth(i).locator("option").allTextContents()).includes("Steuersignal aus einem Ergebnis")) await sel.nth(i).selectOption("signal");
  const opts = async (text) => { for (let i = 0; i < await sel.count(); i++) { const t = await sel.nth(i).locator("option").allTextContents(); if (t.some((x) => x.startsWith(text))) return sel.nth(i); } return null; };
  assert.equal(await (await opts("Ton: Hüllkurve")).inputValue(), sig.id, "das neue Tonsignal ist als Quelle vorgewählt");
  await (await opts("über die Zeit")).selectOption("zeit");
  await ausfuehren(page);
  const k = await S(page, () => { const k = ornamentLab.projekt.knoten.at(-1); return { status: k.status, achse: k.variation.achse, route: k.variation.routen[0], n: k.ausgaben.length }; });
  assert.equal(k.status, "fertig"); assert.equal(k.achse, "zeit"); assert.equal(k.n, 1);
  assert.equal(k.route.modulator.quelle, "signal"); assert.equal(k.route.modulator.ergebnis, sig.id);
  await page.locator('input[name="ansicht"][value="nach"]').check({ force: true });
  assert.match(await page.locator(".verlauf .parameter").allTextContents().then((t) => t.join(" ")), /Ton: Hüllkurve/);
  await page.click("#animation");
  await warteFertig(page, 120000);
  const anim = await S(page, () => ornamentLab.projekt.exporte.at(-1));
  assert.equal(anim.bilder, 120, "Bildfolge so lang wie der Klang: 4 s × 30, der Verlauf aus 13 Bildern gedehnt");
  if (anim.tonspur.codec) assert.equal(anim.tonspur.sekunden, 4);
  assert.equal(await page.locator(".film video").first().evaluate((v) => v.muted), !anim.tonspur.codec, "die Vorschau spielt den Ton");
  // eine frei gewählte Länge geht vor: 6 s Bild, der 4 s lange Ton endet vorher
  await page.locator("#laenge").fill("6");
  await page.locator("#laenge").dispatchEvent("change");
  await page.click("#animation");
  await warteFertig(page, 120000);
  const lang = await S(page, () => ornamentLab.projekt.exporte.at(-1));
  assert.deepEqual([lang.bilder, lang.laenge], [180, 6], "Länge 6 s = 180 Bilder");
  if (lang.tonspur.codec) assert.equal(lang.tonspur.sekunden, 4);
  await page.locator("#laenge").fill("");
  await page.locator("#laenge").dispatchEvent("change");
  // ohne Takt (gleichmässig): der Klang steht trotzdem als Tonspur vor, die Halten lassen sich an seine Länge anpassen
  assert.ok(await page.getByText("Einen anderen Takt gibt es").count() === 0, "Ereignisfolgen sind da, kein Hinweis");
  const tonWahl = page.locator('.stationen-regler label:has(> span:text-is("Tonspur")) select');
  assert.equal(await tonWahl.inputValue(), await S(page, () => ornamentLab.projekt.ergebnisse.find((e) => e.typ === "AUDIO").id));
  await page.getByRole("button", { name: "Halten an den Klang anpassen" }).click();
  const halten = await S(page, () => ornamentLab.film.halten), stationen = await page.locator(".stationen-liste > li").count();
  assert.ok(Math.abs(stationen * halten + (stationen - 1) * (await S(page, () => ornamentLab.film.uebergang)) - 4) < 0.2 * stationen, `Halten ${halten} s bei ${stationen} Stationen`);
  // Ton als Taktgeber: die Einsätze lösen die Wechsel zwischen den Stationen aus, der Ton wird Tonspur
  await page.locator('.stationen-regler label:has(> span:text-is("Takt")) select').selectOption({ label: await S(page, () => ornamentLab.projekt.ergebnisse.filter((e) => e.typ === "EVENT_SEQUENCE").at(-1).titel) });
  await page.locator('.stationen input[data-param="seite"]').fill("320");
  assert.equal(await tonWahl.inputValue(), await S(page, () => ornamentLab.projekt.ergebnisse.find((e) => e.typ === "AUDIO").id), "der gemessene Ton des Takts als Tonspur");
  await page.click("#stationenfilm");
  await warteFertig(page, 120000);
  const film = await S(page, () => ornamentLab.projekt.exporte.at(-1));
  assert.equal(film.art, "stationen", await page.textContent("#status"));
  assert.ok(film.partitur.takt.einsaetze >= 4 && film.partitur.folge.length === film.partitur.takt.einsaetze + 1, "reihum bis die Einsätze aufgebraucht sind");
  assert.ok(Math.abs(film.partitur.dauer - 4) < 0.05, `so lang wie der Ton: ${film.partitur.dauer}`);
  assert.ok(film.ton, `Tonspur: ${await page.textContent("#status")}`);
  assert.equal(film.tonQuelle, await S(page, () => ornamentLab.projekt.ergebnisse.find((e) => e.typ === "AUDIO").id));
  // speichern und öffnen: die WAV kommt unverändert mit, das Tonsignal lässt sich aus dem Archiv neu rechnen
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#speichern")]);
  const pfad = await dl.path();
  await page.click("#neu");
  await page.setInputFiles("#oeffnen", pfad);
  await page.waitForFunction(() => ornamentLab.projekt.ergebnisse.length > 0);
  const ton = await S(page, () => ornamentLab.projekt.ergebnisse.find((e) => e.typ === "AUDIO"));
  assert.equal(ton.sha256, m.sha);
  await page.locator('input[name="ansicht"][value="neben"]').check({ force: true });
  await page.locator("#materialien button").nth(await S(page, () => ornamentLab.projekt.ergebnisse.filter((e) => !e.knoten).findIndex((e) => e.typ === "AUDIO"))).click();
  await operation(page, "lab.tonsignal");
  await page.locator("#op-form select").first().selectOption("schwerpunkt");
  await ausfuehren(page);
  assert.equal(await S(page, () => ornamentLab.projekt.knoten.at(-1).status), "fertig");
});

await check("Klangerzeuger: Klang ohne Tondatei aus dem Startwert und aus einem Bild, Tonsignal daraus, Animation mit Tonspur", async () => {
  await page.click("#neu");
  await page.waitForFunction(() => ornamentLab.projekt.ergebnisse.length === 0);
  await operation(page, "lab.klang");   // ohne jedes Material wählbar
  await page.locator('#op-form input[data-param="dauer"]').fill("2");
  await ausfuehren(page);
  const a = await S(page, () => ornamentLab.projekt.ergebnisse.filter((e) => e.typ === "AUDIO").map((e) => ({ datei: e.datei, dauer: e.ton.dauer, sha: e.sha256 })));
  assert.equal(a.length, 6, "sechs Varianten nebeneinander");
  assert.ok(new Set(a.map((x) => x.dauer)).size > 1, "die Dauer ist moduliert");
  for (const x of a) { assert.match(x.datei, /\.wav$/); assert.match(x.sha, /^[0-9a-f]{64}$/); }
  assert.equal(await page.locator("#buehne .karte.klang").count(), 6);
  assert.equal(await page.locator("#buehne .karte.klang svg").count(), 6, "Umriss");
  const dauer = await page.locator("#buehne .karte.klang audio").first().evaluate((au) => new Promise((ok, nein) => { au.preload = "metadata"; au.onloadedmetadata = () => ok(au.duration); au.onerror = () => nein(new Error("WAV nicht abspielbar")); au.load(); }));
  assert.ok(Math.abs(dauer - a[0].dauer) < 0.05, `der Browser spielt die WAV: ${dauer} s`);
  assert.ok(await page.locator("#buehne .signal svg").count() >= 1, "Partitur");
  assert.equal(await S(page, () => ornamentLab.projekt.entscheidungen.filter((d) => d.gegenstand === "tonfolge" && d.art === "zufall").length), 6);
  // aus einem Bild: das Bild steht als Eingang vor
  await page.click("#beispiel");
  await page.waitForFunction(() => ornamentLab.projekt.ergebnisse.find((e) => e.id === ornamentLab.aktuell)?.typ === "IMAGE");
  await operation(page, "lab.klang");
  await page.locator('#op-form input[data-param="dauer"]').fill("1.5");
  await page.locator('#op-form input[data-param="anzahl"]').fill("1");
  await ausfuehren(page);
  const k = await S(page, () => { const k = ornamentLab.projekt.knoten.at(-1); return { quelle: k.protokoll.quelle, eingaben: Object.keys(k.eingaben), klang: k.ausgaben[0] }; });
  assert.equal(k.quelle, "bild"); assert.deepEqual(k.eingaben, ["bild"]);
  // weiterführen: der Klang ist Ausgang, Tonsignal misst ihn
  await page.locator("#buehne .karte.klang").getByRole("button", { name: "weiterführen" }).click();
  assert.equal(await S(page, () => ornamentLab.aktuell), k.klang);
  await operation(page, "lab.tonsignal");
  await ausfuehren(page);
  const sig = await S(page, () => ornamentLab.projekt.knoten.at(-1).ausgaben[0]);
  // das Bild über die Zeit vom Klang steuern und mit Tonspur exportieren
  await page.locator("#materialien button").last().click();
  await operation(page, "lab.feedback");
  await page.locator('#op-form input[data-param="seite"]').fill("300");
  await page.locator('#op-form input[data-param="iterationen"]').fill("12");
  const sel = page.locator("#op-form select");
  for (let i = 0; i < await sel.count(); i++) if ((await sel.nth(i).locator("option").allTextContents()).includes("Steuersignal aus einem Ergebnis")) await sel.nth(i).selectOption("signal");
  for (let i = 0; i < await sel.count(); i++) if ((await sel.nth(i).locator("option").allTextContents()).some((t) => t.startsWith("über die Zeit"))) await sel.nth(i).selectOption("zeit");
  await ausfuehren(page);
  assert.equal(await S(page, () => ornamentLab.projekt.knoten.at(-1).variation.routen[0].modulator.ergebnis), sig);
  await page.locator('input[name="ansicht"][value="nach"]').check({ force: true });
  assert.equal(await page.locator("#tonspur").inputValue(), k.klang, "der Klang, der das Signal gab, steht als Tonspur vor");
  await page.click("#animation");
  await warteFertig(page, 120000);
  const x = await S(page, () => ornamentLab.projekt.exporte.at(-1));
  assert.equal(x.tonspur.ergebnis, k.klang);
  assert.ok(x.tonspur.codec || x.tonspur.fehlt, JSON.stringify(x.tonspur));
  if (x.tonspur.codec) {
    assert.equal(x.tonspur.sekunden, 1.5, "der ganze Klang");
    assert.equal(x.bilder, 45, "die Bildfolge so lang wie der Klang");
    const boxen = await S(page, async () => { const t = new TextDecoder("latin1").decode(await (await fetch([...ornamentLab.filme.values()].at(-1).url)).arrayBuffer()); return { soun: t.includes("soun"), ton: t.includes("Opus") || t.includes("mp4a") }; });
    assert.deepEqual(boxen, { soun: true, ton: true }, "das MP4 hat eine Tonspur");
  }
  console.log("      Tonspur:", JSON.stringify(x.tonspur));
  await page.locator('input[name="ansicht"][value="neben"]').check({ force: true });
});

/** ein Beat als WAV mit 24 Bit, stereo, 48 kHz: Bass auf jedem Schlag (120 BPM), Rauschen dazwischen, rechts leiser */
function beatWav(rate = 48000, dauer = 4) {
  const n = rate * dauer, b = Buffer.alloc(44 + n * 6);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 6, 4); b.write("WAVE", 8); b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 6, 28); b.writeUInt16LE(6, 32); b.writeUInt16LE(24, 34); b.write("data", 36); b.writeUInt32LE(n * 6, 40);
  let z = 5;
  for (let i = 0; i < n; i++) {
    const t = i / rate, k = (t % 0.5) * rate, h = ((t + 0.25) % 0.5) * rate;
    let v = Math.sin((2 * Math.PI * (55 + 80 * Math.exp(-k / 2000)) * k) / rate) * Math.exp(-k / 5000) * 0.7, w = v;
    if (h < 0.04 * rate) { z = (z * 1103515245 + 12345) & 0x7fffffff; const r = (z / 0x7fffffff - 0.5) * Math.exp(-h / 500) * 0.5; v += r; w += r * 0.6; }
    b.writeIntLE(Math.round(Math.max(-1, Math.min(1, v)) * 8388607), 44 + i * 6, 3); b.writeIntLE(Math.round(Math.max(-1, Math.min(1, w)) * 8388607), 47 + i * 6, 3);
  }
  return b;
}

await check("Klangtransformation: eigener Beat in 48 kHz stereo, sechs Rhythmen nebeneinander, weiterführen ins Tempo, WAV mit 24 Bit und 96 kHz", async () => {
  await page.setInputFiles("#tondatei", { name: "beat.wav", mimeType: "audio/wav", buffer: beatWav() });
  await page.waitForFunction(() => ornamentLab.projekt.ergebnisse.find((e) => e.id === ornamentLab.aktuell)?.titel === "beat.wav");
  const m = await S(page, () => ornamentLab.projekt.ergebnisse.find((e) => e.id === ornamentLab.aktuell).ton);
  assert.deepEqual([m.abtastrate, m.kanaele, m.dauer], [48000, 2, 4], "die eigene Abtastrate und beide Kanäle bleiben");
  for (const id of ["lab.tempo", "lab.zerlegen", "lab.rhythmus", "lab.koerner"]) assert.equal(await page.locator(`.op input[value="${id}"]`).count(), 1, id);
  await operation(page, "lab.rhythmus");
  assert.equal(await S(page, () => ornamentLab.variation.ziel), "treffer", "die Treffer verteilen sich über die Varianten");
  await ausfuehren(page);
  const k = await S(page, () => { const k = ornamentLab.projekt.knoten.at(-1), aus = k.ausgaben.map((id) => ornamentLab.projekt.ergebnisse.find((x) => x.id === id)); return { op: k.operation, klaenge: aus.filter((x) => x.typ === "AUDIO").map((x) => ({ id: x.id, ton: x.ton })), treffer: aus.filter((x) => x.typ === "EVENT_SEQUENCE").map((x) => x.daten.ereignisse.length), bpm: k.protokoll[0].bpm }; });
  assert.equal(k.op, "lab.rhythmus"); assert.equal(k.klaenge.length, 6);
  assert.ok(k.klaenge.every((x) => x.ton.abtastrate === 48000 && x.ton.kanaele === 2), "stereo, 48 kHz");
  assert.ok(Math.abs(k.bpm - 120) < 1, `Tempo geschätzt: ${k.bpm}`);
  assert.ok(new Set(k.treffer).size >= 4, `verschiedene Rhythmen nebeneinander: ${k.treffer}`);
  assert.equal(await page.locator("#buehne .karte.klang").count(), 6);
  assert.ok(await page.locator("#buehne .ausspielen").isVisible());
  // weiterführen: der dritte Rhythmus wird Ausgang, dann schneller ohne Tonhöhe
  await page.locator("#buehne .karte.klang").nth(2).getByRole("button", { name: "weiterführen" }).click();
  assert.equal(await S(page, () => ornamentLab.aktuell), k.klaenge[2].id);
  await operation(page, "lab.tempo");
  await page.locator('#op-form input[data-param="tempo"]').fill("1.5");
  await page.locator('#op-form input[data-param="anzahl"]').fill("1");
  await ausfuehren(page);
  const t = await S(page, () => { const k = ornamentLab.projekt.knoten.at(-1); const e = ornamentLab.projekt.ergebnisse.find((x) => x.id === k.ausgaben[0]); return { eingang: k.eingaben.ton, dauer: e.ton.dauer, id: e.id }; });
  assert.equal(t.eingang, k.klaenge[2].id); assert.ok(Math.abs(t.dauer - k.klaenge[2].ton.dauer / 1.5) < 0.01, `${t.dauer}`);
  // ausspielen: 24 Bit, 96 kHz
  const leiste = page.locator("#buehne .ausspielen select");
  await leiste.nth(0).selectOption("24"); await leiste.nth(1).selectOption("96000");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator("#buehne .karte.klang").first().getByRole("button", { name: "WAV" }).click()]);
  const kopf = readFileSync(await dl.path()).subarray(0, 44);
  assert.deepEqual([kopf.readUInt16LE(22), kopf.readUInt32LE(24), kopf.readUInt16LE(34)], [2, 96000, 24], "stereo, 96 kHz, 24 Bit");
  assert.match(dl.suggestedFilename(), /-24bit-96khz\.wav$/);
  assert.equal(await S(page, () => ornamentLab.projekt.exporte.at(-1).art), "wav");
});

await check("Klang über Stationen: die Rhythmen eines früheren Schritts und der letzte Klang hintereinander, als neuer Klang im Projekt", async () => {
  await page.locator('input[name="ansicht"][value="neben"]').check({ force: true });
  await page.locator("#buehne .karte.klang").first().getByRole("button", { name: "weiterführen" }).click();   // der schnellere Klang wird Ausgang
  await page.locator(".schritte button").first().click();   // zurück zu «Neu-Rhythmisierung»
  await page.getByRole("button", { name: "alle Klänge als Stationen" }).click();
  assert.equal(await S(page, () => ornamentLab.klangstationen.length), 6);
  await page.locator('input[name="ansicht"][value="nach"]').check({ force: true });
  assert.equal(await page.locator(".klangstationen .stationen-liste > li").count(), 6);
  const alle = page.getByRole("button", { name: /alle Klänge aller Schritte/ });
  assert.match(await alle.textContent(), /\(7\)/);
  await alle.click();
  assert.equal(await page.locator(".klangstationen .stationen-liste > li").count(), 7);
  await page.getByRole("button", { name: "Klang 1 nach hinten" }).click();
  await page.locator('.klangstationen input[data-param="klangblende"]').fill("0.1");
  const ids = await S(page, () => ornamentLab.klangstationen.map((x) => x.ergebnis));
  const summe = await S(page, () => ornamentLab.klangstationen.reduce((a, x) => a + ornamentLab.projekt.ergebnisse.find((y) => y.id === x.ergebnis).ton.dauer, 0));
  await page.click("#klangfolge");
  await warteFertig(page);
  const e = await S(page, () => ornamentLab.projekt.ergebnisse.at(-1));
  assert.equal(e.typ, "AUDIO", await page.textContent("#status"));
  assert.equal(e.herkunft.art, "klangfolge"); assert.deepEqual(e.herkunft.stationen, ids); assert.equal(e.herkunft.blende, 0.1);
  assert.ok(Math.abs(e.ton.dauer - (summe - 6 * 0.1)) < 0.01, `${e.ton.dauer} statt ${summe - 0.6}`);
  assert.deepEqual([e.ton.abtastrate, e.ton.kanaele, e.ton.umriss.length], [48000, 2, 200]);
  const d = await S(page, () => ornamentLab.projekt.entscheidungen.at(-1));
  assert.deepEqual([d.art, d.gegenstand, d.gewaehlt.length], ["mensch", "klangstationen", 7]);
  assert.ok(await page.locator(".klangstationen .ton-karte audio").isVisible());
  // der neue Klang ist Material wie eine Tondatei: unter Material, als WAV ausspielbar
  assert.equal(await page.locator(`#materialien button[aria-label="Ton: ${e.titel}"]`).count(), 1, "unter Material");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.locator(".klangstationen .ton-karte").getByRole("button", { name: "WAV" }).click()]);
  assert.match(dl.suggestedFilename(), /klang-uber-7-stationen/);
});

await check("Keine Fehler in der Konsole, keine Anfragen nach aussen", async () => {
  assert.deepEqual(fehler, []);
  assert.deepEqual(fremd, []);
});
await ctx.close();

await check("Vorschlag für 30 s: Bild und Ton wählen, jev (vorgetäuscht) bekommt nur Stufen, Dramaturgie übernehmen, Film mit Tonspur", async () => {
  const c = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await c.newPage();
  const fehler2 = [];
  p.on("pageerror", (e) => fehler2.push(e.message));
  const gesendet = [];
  await p.route("**/alpha/lab/jev/wahl.php", (r) => {
    if (r.request().method() === "GET") return r.fulfill({ contentType: "application/json", body: JSON.stringify({ bereit: true }) });
    const lage = r.request().postDataJSON(); gesendet.push(lage);
    // die Zusammenstellung: Glitch überall wahrscheinlich, Klang zuerst schneller, dann zerlegt
    if (lage.frage === "komposition") return r.fulfill({ contentType: "application/json", body: JSON.stringify({ modell: "jev-test", zwischengespeichert: false, antworten: {
      aufbau: { "aufbau.kette": 0.8, "aufbau.faecher": 0.2 }, uebergang: { "film.schnitt": 0.1, "film.blende": 0.8, "film.schwelle": 0.1 },
      klang1: { "klang.schneller": 1 }, klang2: { "klang.zerlegt": 1 },
      ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((i) => [`bild${i}`, { "bild.glitch": 0.9, "bild.farbe": 0.05, "bild.raster": 0.05 }])) } }) });
    return r.fulfill({ contentType: "application/json", body: JSON.stringify({ wahrscheinlichkeiten: Object.fromEntries(lage.optionen.map((o) => [o, o === "vorschlag.farbwelle" ? 0.7 : 0.05])), modell: "jev-test", zwischengespeichert: false }) });
  });
  await p.goto(base);
  await p.waitForFunction(() => globalThis.ornamentLab);
  await p.waitForFunction(() => /jev live: bereit/.test(document.querySelector("#status").textContent));
  await p.click("#beispiel");
  await p.waitForFunction(() => ornamentLab.aktuell);
  assert.match(await p.textContent("#vorschlag30"), /Mit einem Ton dazu/);
  await p.setInputFiles("#tondatei", { name: "beat.wav", mimeType: "audio/wav", buffer: beatWav() });
  await p.waitForSelector("#vorschlag-machen");
  await p.click("#vorschlag-machen");
  await p.waitForSelector('#vorschlag30 input[name="dramaturgie"]');
  await warteFertig(p);
  const dr = gesendet.find((g) => g.frage === "dramaturgie"), ko = gesendet.find((g) => g.frage === "komposition");
  assert.deepEqual(Object.keys(dr), ["frage", "merkmale", "optionen"]);
  assert.deepEqual(Object.keys(ko), ["frage", "merkmale"]);
  assert.ok(Object.values(dr.merkmale).every((v) => /^[a-z]+$/.test(v)), "nur Stufen");
  assert.match(await p.textContent("#vorschlag30 .zusammenstellung legend"), /jev stellt zusammen \(jev-test\)/);
  const stellen = await p.$$eval("#vorschlag30 .stellen select[data-frage]", (l) => l.map((x) => [x.dataset.frage, x.value]));
  assert.equal(stellen.length, 10);
  const bilder = stellen.filter(([k]) => k.startsWith("bild")).map(([, w]) => w);
  assert.ok(bilder.every((b, i) => i === 0 || b !== bilder[i - 1]), `kein Effekt zweimal hintereinander: ${bilder}`);
  assert.deepEqual(stellen.filter(([k]) => k.startsWith("klang")).map(([, w]) => w), ["klang.schneller", "klang.zerlegt"]);
  assert.equal(await p.locator('#vorschlag30 input[name="dramaturgie"]:checked').getAttribute("value"), "vorschlag.farbwelle", "der wahrscheinlichste steht vorgewählt");
  assert.match(await p.textContent("#vorschlag30"), /Gemessen\. Bild: .*Klang/);
  await p.locator('#vorschlag30 input[value="vorschlag.raster"]').check();
  await p.click("#vorschlag-rechnen");
  await p.waitForTimeout(50);
  await warteFertig(p, 180000);
  await p.waitForSelector("#vorschlag30 video");
  const x = await S(p, () => { const pr = ornamentLab.projekt; return { export: pr.exporte.at(-1), d: pr.entscheidungen.find((y) => y.gegenstand === "dramaturgie"), ops: pr.knoten.map((k) => k.operation), ton: pr.ergebnisse.find((e) => e.titel === "beat.wav").id }; });
  assert.equal(x.d.art, "jev"); assert.equal(x.d.gewaehlt, "vorschlag.raster"); assert.equal(x.d.details.modell, "jev-test"); assert.equal(x.d.details.wahrscheinlichkeit, 0.05); assert.ok(x.d.details.rang > 1, "der Mensch hat einen anderen als den ersten gewählt");
  assert.deepEqual(x.ops, ["lab.tonsignal", "lab.profil", "lab.wiederholung"]);
  assert.equal(x.export.art, "stationen"); assert.equal(x.export.dramaturgie, "vorschlag.raster"); assert.equal(x.export.stationen.length, 7);
  assert.ok(Math.abs(x.export.partitur.dauer - 4) < 0.05, `so lang wie der Klang: ${x.export.partitur.dauer}`);
  assert.ok(x.export.partitur.takt, "im Takt der Anschläge");
  assert.equal(x.export.tonQuelle ?? x.ton, x.ton);
  // unter «Nacheinander» steht derselbe Film mit den Stationen des Vorschlags
  await p.locator('input[name="ansicht"][value="nach"]').check({ force: true });
  assert.equal(await p.locator(".stationen-liste li").count(), 7);
  // die Zusammenstellung von jev: einen Abschnitt von Hand ändern, dann rechnen
  await p.locator('input[name="ansicht"][value="neben"]').check({ force: true });
  await p.locator('#vorschlag30 select[data-frage="bild6"]').selectOption("bild.raster");
  // die Abschnitte (0.1.28): Abschnitt 5 aus, Abschnitt 1 zehn Sekunden lang; der Hinweis rechnet die Animation vor
  assert.equal(await p.locator("#vorschlag30 input[data-abschnitt]:checked").count(), 6, "alle sechs Abschnitte an");
  await p.locator('#vorschlag30 input[data-abschnitt="5"]').uncheck();
  await p.locator('#vorschlag30 input[data-abschnitt-dauer="1"]').fill("10");
  await p.locator('#vorschlag30 input[data-abschnitt-dauer="1"]').dispatchEvent("change");
  assert.equal(await p.locator('#vorschlag30 input[data-abschnitt-dauer="5"]').isDisabled(), true, "die Dauer eines Abschnitts, der aus ist, ist gesperrt");
  assert.match(await p.textContent("#zusammenstellung-plan"), /\(1 von 6 aus\); 30 s Animation, 52 Varianten/);
  // dazu beide Bestände (seit 0.1.18): ein Zettel aus dem Zettelkasten (Nummer 7 gewählt) und eine ORNA-Konstellation (gezogen)
  assert.equal(await p.locator("#vorschlag30 [data-bestand]:checked").count(), 0, "ohne Zettel und ORNA, bis man sie einschaltet");
  await p.locator('#vorschlag30 [data-bestand="zettel"]').check();
  await p.locator('#vorschlag30 select[data-bestand-wahl="zettel"]').selectOption("7");
  await p.locator('#vorschlag30 [data-bestand="orna"]').check();
  assert.equal(await p.locator('#vorschlag30 select[data-frage="bild6"]').inputValue(), "bild.raster", "die eigene Änderung bleibt");
  // die Filmeinstellungen stehen direkt in der Zusammenstellung (0.1.19): lebendig vorgewählt, Bewegung voll; die Kamera auf 0,6 setzen
  assert.equal(await p.locator("#zusammenstellung-lebendig").isChecked(), true, "lebendige Effekte vorgewählt");
  assert.equal(await p.locator("#zusammenstellung-lebendig").isDisabled(), false, "WebGL 2 ist da");
  assert.equal(await p.locator('#vorschlag30 input[data-param="zusammenstellung-bewegung"]').inputValue(), "1");
  await p.locator('#vorschlag30 input[data-param="zusammenstellung-bewegung"]').fill("0.6");
  // die Karten (bis 0.1.25): ohne Signatur; mit Signatur prüft «Signatur (0.1.26)» weiter unten
  assert.equal(await p.locator("#zusammenstellung-signatur").isChecked(), true, "Signatur vorgewählt");
  assert.equal(await p.locator("#zusammenstellung-mastering").isChecked(), true, "Tonspur fertig mischen vorgewählt (0.1.45)");
  await p.locator("#zusammenstellung-signatur").uncheck();
  // das Format (0.1.37): Standard «wie das Material»; 9:16 gewählt wird das Material zuerst eingepasst, der Film und die Karten sind hochkant
  assert.equal(await p.locator("#zusammenstellung-format").inputValue(), "material");
  assert.equal(await p.locator("#zusammenstellung-format-hinweis").count(), 0);
  await p.locator("#zusammenstellung-format").selectOption("9:16");
  assert.match(await p.textContent("#zusammenstellung-format-hinweis"), /9:16 hoch .*mittig .*eingepasst/);
  await p.click("#zusammenstellung-rechnen");
  await p.waitForTimeout(50);
  await warteFertig(p, 420000);
  await p.waitForSelector("#vorschlag30 .zusammenstellung video");
  const z = await S(p, () => { const pr = ornamentLab.projekt; const d = pr.entscheidungen.find((y) => y.gegenstand === "zusammenstellung"); return { d, ops: pr.knoten.slice(-13).map((k) => k.operation), x: pr.exporte.at(-1), status: document.querySelector("#status").textContent, abschnitte: pr.knoten.slice(-7, -2).map((k) => k.ausgaben.length),
    strophe: pr.entscheidungen.find((y) => y.gegenstand === "strophe"), konstellation: pr.entscheidungen.find((y) => y.gegenstand === "konstellation"), karten: pr.knoten.filter((k) => k.operation === "lab.karte").map((k) => k.protokoll.inhalt), kartenP: pr.knoten.filter((k) => k.operation === "lab.karte").map((k) => ({ gestaltung: k.protokoll.gestaltung, schriften: k.protokoll.schriften, feld: k.protokoll.feld })), fictory: pr.knoten.find((k) => k.operation === "fictory.prozess") ?? null }; });
  assert.equal(z.d.art, "mensch", "eine Stelle geändert: die Entscheidung ist menschlich"); assert.deepEqual([...z.d.details.geaendert].sort(), ["abschnitt1", "abschnitt5", "bild6"]); assert.equal(z.d.details.vorschlag, "jev");
  assert.equal(z.d.gewaehlt.bild[5], "bild.raster"); assert.deepEqual(z.d.gewaehlt.abschnitte.map((a) => a.an), [true, true, true, true, false, true]); assert.equal(z.d.gewaehlt.abschnitte[0].dauer, 10);
  assert.deepEqual(z.abschnitte, [12, 10, 10, 10, 10], "fünf Abschnitte, der erste mit zwölf Varianten (10 s, die Grenze je Ausführung)"); assert.equal(z.d.gewaehlt.zettel, "7"); assert.equal(z.d.gewaehlt.orna, "ziehen");
  assert.deepEqual(z.ops.slice(0, 6), ["lab.tempo", "lab.zerlegen", "lab.mastering", "lab.tonsignal", "zettel.strophe", "orna.konstellation"]);
  assert.deepEqual(z.ops.slice(-2), ["lab.karte", "lab.karte"], "zuletzt die zwei Karten");
  assert.equal(z.strophe.art, "mensch"); assert.equal(z.strophe.gewaehlt, 7); assert.equal(z.konstellation.art, "zufall");
  assert.equal(z.fictory, null, "seit 0.1.20 kein Zerfall in der Zusammenstellung (Standbilder)");
  assert.match(z.karten[0].kopf, /^Zettelkasten · .* · 7 \/ 49$/); assert.match(z.karten[1].kopf, /^ORNA · Konstellation /); assert.match(z.karten[1].fuss, /^Operationsregel R/);
  assert.match(z.status, /Zettel 7: .*ORNA \d+: /);
  // die Karten in der Gestaltung des Neubaus (0.1.33): Schriften der Website geladen, das Feld; Weiss auf Schwarz mit der Blaupause, kein Orange
  assert.deepEqual(z.kartenP.map((k) => k.gestaltung), ["Neubau", "Neubau"]); assert.deepEqual(z.kartenP.map((k) => k.schriften), [{ sans: true, serif: true }, { sans: true, serif: true }]);
  assert.equal(z.kartenP[0].feld.hier, 7); assert.ok(z.kartenP[0].feld.nah >= 1, "Fäden zu nahen Zetteln"); assert.deepEqual(z.kartenP[1].feld, { hier: null, nah: 0 }, "bei ORNA das leere Feld");
  const farben = await S(p, async () => {
    const pr = ornamentLab.projekt, m = (id) => pr.ergebnisse.find((e) => e.id === id), k = pr.knoten.filter((k) => k.operation === "lab.karte");
    const nah = (a, b) => Math.abs(a[0] - b[0]) < 24 && Math.abs(a[1] - b[1]) < 24 && Math.abs(a[2] - b[2]) < 24;
    const zaehle = (b) => { const z = { blau: 0, orange: 0, schwarz: 0, weiss: 0 }; for (let i = 0; i < b.data.length; i += 4) { const px = [b.data[i], b.data[i + 1], b.data[i + 2]]; if (nah(px, [143, 176, 255])) z.blau++; if (nah(px, [240, 138, 93])) z.orange++; if (px[0] < 8 && px[1] < 8 && px[2] < 8) z.schwarz++; if (px[0] > 247 && px[1] > 247 && px[2] > 247) z.weiss++; } z.n = b.data.length / 4; return z; };
    return Promise.all(k.map(async (k) => zaehle(await ornamentLab.medien.bild(m(k.ausgaben[0])))));
  });
  for (const f of farben) { assert.ok(f.schwarz / f.n > 0.6, `Grund Schwarz: ${JSON.stringify(f)}`); assert.ok(f.weiss > 0, "Tinte Weiss"); assert.ok(f.blau > 0, `die Blaupause: ${JSON.stringify(f)}`); assert.equal(f.orange, 0, "kein Orange"); }
  assert.equal(z.x.dramaturgie, "zusammenstellung"); assert.equal(z.x.stationen.length, 55, "Zettelkarte, Bild, 52 Varianten, ORNA-Karte"); assert.ok(z.x.ton, "mit Tonspur");
  assert.equal(z.x.partitur.folge[0].einmal, true); assert.equal(z.x.partitur.folge[0].halten, 3.5, "die Zettelkarte 3,5 s (seit 0.1.34)"); assert.equal(z.x.partitur.folge.at(-1).halten, 3.5, "die ORNA-Karte 3,5 s"); assert.equal(z.x.partitur.folge.at(-1).einmal, true);
  assert.equal(z.x.partitur.folge[0].ergebnis, z.x.stationen[0]); assert.equal(z.x.partitur.folge.at(-1).ergebnis, z.x.stationen.at(-1));
  assert.ok(z.x.partitur.lebendig, "die Zusammenstellung ist lebendig");
  assert.equal(z.x.partitur.bewegung.staerke, 0.6, "die Kamera wie in der Zusammenstellung eingestellt"); assert.deepEqual(z.d.details.film, { lebendig: true, bewegung: 0.6, signatur: "aus", mastering: "−14 LUFS", format: "9:16" });
  assert.ok(Math.abs(z.x.breite / z.x.hoehe - 9 / 16) < 0.02, `der Film ist 9:16: ${z.x.breite} × ${z.x.hoehe}`); assert.equal(z.x.breite % 2, 0); assert.equal(z.d.gewaehlt.format, "9:16");
  assert.ok(z.x.zeitplan.some((y) => y.lebendig), `die Grafikkarte rechnet Stationen in jedem Bild neu: ${JSON.stringify(z.x.zeitplan.slice(0, 3))}`);
  assert.deepEqual(fehler2, []);
  await c.close();
});

await check("Video als Eingang: Standbilder und Tonspur werden Material, die Zusammenstellung folgt dem Video", async () => {
  const { spawnSync } = await import("node:child_process");
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const ordner = mkdtempSync(join(tmpdir(), "lab-video-")), datei = join(ordner, "clip.webm");
  const ff = spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=320x240:rate=15:duration=6", "-f", "lavfi", "-i", "aevalsrc=0.6*sin(2*PI*110*t)*exp(-8*mod(t\\,0.5)):s=48000:d=6", "-c:v", "libvpx", "-b:v", "400k", "-c:a", "libopus", "-shortest", datei]);
  if (ff.status !== 0) { console.log("      (ohne ffmpeg übersprungen)"); return; }
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await c.newPage();
  const fehler3 = [];
  p.on("pageerror", (e) => fehler3.push(e.message));
  await p.goto(base); await p.waitForFunction(() => globalThis.ornamentLab);
  await p.setInputFiles("#videodatei", datei);
  await p.waitForFunction(() => ornamentLab.projekt.ergebnisse.length >= 7, null, { timeout: 60000 });
  await warteFertig(p);
  const m = await S(p, () => ornamentLab.projekt.ergebnisse.map((e) => ({ typ: e.typ, titel: e.titel, video: e.herkunft?.video ?? null, dauer: e.ton?.dauer })));
  const bilder = m.filter((x) => x.typ === "IMAGE"), ton = m.find((x) => x.typ === "AUDIO");
  assert.equal(bilder.length, 6); assert.ok(bilder.every((x) => x.video?.dauer > 5.5), "Standbilder mit Herkunft Video");
  const zeiten = bilder.map((x) => x.video.zeit);
  assert.ok(zeiten.every((z, i) => z > (zeiten[i - 1] ?? 0) && z < bilder[0].video.dauer) && Math.abs(zeiten[0] - 0.5) < 0.05, `gleichmässig über die Länge: ${zeiten}`);
  assert.ok(ton && Math.abs(ton.dauer - 6) < 0.2, `Tonspur: ${JSON.stringify(ton)}`);
  assert.equal(await p.locator("#materialien img").count(), 6);
  await p.click("#vorschlag-machen");
  await p.waitForSelector("#vorschlag30 .zusammenstellung");
  await warteFertig(p);
  assert.match(await p.textContent("#vorschlag30 .zusammenstellung"), /Aus dem Video: jeder Abschnitt nimmt das Standbild seiner Zeit \(6 Standbilder\)/);
  for (const [i, w] of ["bild.farbe", "bild.raster", "bild.raster", "bild.farbe", "bild.glitch", "bild.raster"].entries()) await p.locator(`#vorschlag30 select[data-frage="bild${i + 1}"]`).selectOption(w);
  await p.click("#zusammenstellung-rechnen"); await p.waitForTimeout(50);
  await warteFertig(p, 300000);
  await p.waitForSelector("#vorschlag30 .zusammenstellung video");
  const z = await S(p, () => { const pr = ornamentLab.projekt, stills = pr.ergebnisse.filter((e) => e.typ === "IMAGE" && !e.knoten).map((e) => e.id); abschnitte = pr.knoten.filter((k) => !k.operation.startsWith("signatur.")); return { stills, eingaben: abschnitte.slice(-6).map((k) => k.eingaben.bild), signatur: pr.knoten.filter((k) => k.operation.startsWith("signatur.")).map((k) => k.operation), x: pr.exporte.at(-1) }; });
  assert.deepEqual(z.eingaben, z.stills, "jeder Abschnitt auf seinem Standbild");
  assert.deepEqual(z.signatur, ["signatur.ton", "signatur.signet"], "ohne Zettel und ORNA nur Tonspur und Signet");
  assert.equal(z.x.stationen[0], z.stills[0]); assert.ok(z.x.ton, "mit Tonspur aus dem Video");
  assert.deepEqual(fehler3, []);
  await c.close();
});

await check("Tonspur über WebCodecs (0.1.20): AAC aus MP4 über den Dekoder des Geräts, gleich laut wie über Web Audio; unlesbarer Ton wird im Vorschlag erklärt", async () => {
  const { spawnSync } = await import("node:child_process");
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const ordner = mkdtempSync(join(tmpdir(), "lab-mp4ton-"));
  const ton = ["-f", "lavfi", "-i", "aevalsrc=0.6*sin(2*PI*110*t)*exp(-8*mod(t\\,0.5)):s=48000:d=6"];
  const ff = (name, ...a) => { const r = spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=320x240:rate=15:duration=6", ...ton, "-c:v", "libvpx-vp9", "-b:v", "300k", ...a, "-shortest", join(ordner, name)]); return r.status === 0 ? join(ordner, name) : null; };
  const aac = ff("clip-aac.mp4", "-c:a", "aac"), ac3 = ff("clip-ac3.mp4", "-c:a", "ac3");
  if (!aac || !ac3) { console.log("      (ohne ffmpeg übersprungen)"); return; }
  const t = await oeffne({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const probe = async (datei, leseweg) => t.page.evaluate(async ({ bytes, leseweg }) => {
    const f = new File([new Uint8Array(bytes)], "clip.mp4", { type: "video/mp4" });
    const imp = await ornamentLab.medien.importiereVideo(f, { leseweg });
    const pcm = imp.ton?.dekodiert.pcm, rms = pcm ? Math.sqrt(pcm.reduce((s, x) => s + x * x, 0) / pcm.length) : null;
    return { bilder: imp.bilder.length, ton: imp.ton ? { leseweg: imp.ton.leseweg, dauer: imp.ton.ton.dauer, rate: imp.ton.ton.abtastrate, rms } : null, tonFehler: imp.tonFehler };
  }, { bytes: [...readFileSync(datei)], leseweg });
  const w = await probe(aac, "webcodecs"), a = await probe(aac, "auto");
  assert.equal(w.bilder, 6); assert.ok(w.ton, `WebCodecs liest die Tonspur: ${w.tonFehler}`);
  assert.equal(w.ton.leseweg, "webcodecs"); assert.ok(Math.abs(w.ton.dauer - 6) < 0.2, `${w.ton.dauer} s`); assert.equal(w.ton.rate, 48000);
  assert.ok(w.ton.rms > 0.1, `Ton mit Pegel: ${w.ton.rms}`);
  assert.ok(a.ton && Math.abs(a.ton.rms - w.ton.rms) < 0.01, `beide Lesewege gleich laut: ${a.ton?.rms} / ${w.ton.rms} (${a.ton?.leseweg})`);
  // AC-3 kann weder Web Audio noch der Dekoder: die Standbilder kommen, der Grund steht beim Vorschlag, mit einem Ton dazu erscheint er
  await t.page.setInputFiles("#videodatei", ac3);
  await t.page.waitForFunction(() => ornamentLab.projekt.ergebnisse.length >= 6, null, { timeout: 60000 });
  await warteFertig(t.page);
  assert.match(await t.page.textContent("#status"), /ohne lesbaren Ton \(.*WebCodecs: /);
  const h = await S(t.page, () => ({ stumm: ornamentLab.projekt.ergebnisse.filter((e) => e.typ === "IMAGE").map((e) => e.herkunft.video.tonFehler), toene: ornamentLab.projekt.ergebnisse.filter((e) => e.typ === "AUDIO").length }));
  assert.equal(h.toene, 0); assert.ok(h.stumm.every((x) => /WebCodecs/.test(x)), `${h.stumm[0]}`);
  assert.match(await t.page.textContent("#vorschlag30"), /Tonspur des Videos «clip-ac3\.mp4» liess sich in diesem Browser nicht lesen \(.*\)\. Lade den Ton dazu/);
  assert.equal(await t.page.locator("#vorschlag-machen").count(), 0);
  await t.page.setInputFiles("#tondatei", { name: "beat.wav", mimeType: "audio/wav", buffer: beatWav() });
  await t.page.waitForSelector("#vorschlag-machen");
  assert.equal(await t.page.locator("#vorschlag-bild option").count(), 6, "die Standbilder stehen zur Wahl");
  assert.deepEqual(t.fehler, []);
  await t.ctx.close();
});

await check("Telefon: kein seitliches Scrollen, Bereiche untereinander", async () => {
  const t = await oeffne({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const breit = await t.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(breit <= 0, `${breit}px zu breit`);
  // mit Bild und Ton steht der Vorschlag für 30 s im Material, ohne Überbreite
  await t.page.click("#beispiel");
  await t.page.waitForFunction(() => ornamentLab.aktuell);
  await t.page.setInputFiles("#tondatei", { name: "beat.wav", mimeType: "audio/wav", buffer: beatWav() });
  await t.page.waitForSelector("#vorschlag-machen");
  await t.page.click("#vorschlag-machen");
  await t.page.waitForSelector('#vorschlag30 input[name="dramaturgie"]');
  await t.page.waitForFunction(() => !ornamentLab.laeuft);
  assert.match(await t.page.textContent("#vorschlag30"), /nach festen Regeln/, "ohne jev: Regeln");
  assert.ok(await t.page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, "Vorschlag ohne Überbreite");
  const [a, b] = await Promise.all(["#material", "#experiment"].map((s) => t.page.locator(s).boundingBox()));
  assert.ok(b.y > a.y && Math.abs(b.x - a.x) < 2);
  await t.ctx.close();
});

await check("PHORMA-Szenen (0.1.21): Gewebe aus Bild und Beat als Operation, zwei Standbilder, dann als lebendiger Film auf der eigenen Bühne", async () => {
  const t = await oeffne();
  await t.page.click("#beispiel");
  await t.page.waitForFunction(() => ornamentLab.aktuell);
  await t.page.setInputFiles("#tondatei", { name: "beat.wav", mimeType: "audio/wav", buffer: beatWav() });
  await t.page.waitForFunction(() => ornamentLab.projekt.ergebnisse.find((e) => e.id === ornamentLab.aktuell)?.titel === "beat.wav");
  const tonId = await S(t.page, () => ornamentLab.projekt.ergebnisse.find((e) => e.typ === "AUDIO").id);
  await t.page.locator("#materialien button").first().click();
  for (const id of ["phorma.gewebe", "phorma.irrfahrt", "phorma.lichtwuerfel", "phorma.traube"]) assert.equal(await t.page.locator(`.op input[value="${id}"]`).count(), 1, id);
  await operation(t.page, "phorma.gewebe");
  await t.page.locator('#op-form input[data-param="seite"]').fill("256");
  await t.page.locator('#op-form input[data-param="bilder"]').fill("2");
  await t.page.locator('#op-form input[data-param="dauer"]').fill("6");
  const wahlen = t.page.locator("#op-form select");
  for (let i = 0; i < await wahlen.count(); i++) {
    const werte = await wahlen.nth(i).evaluate((s) => [...s.options].map((o) => o.value));
    if (werte.includes("grob")) await wahlen.nth(i).selectOption("grob");
    if (werte.includes(tonId)) await wahlen.nth(i).selectOption(tonId);
  }
  await t.page.click("#ausfuehren"); await t.page.waitForTimeout(50);
  await warteFertig(t.page, 300000);
  const k = await S(t.page, () => { const k = ornamentLab.projekt.knoten.at(-1); return { status: k.status, fehler: k.fehler ?? null, aus: k.ausgaben.length, eingaben: k.eingaben, p: k.protokoll }; });
  assert.equal(k.status, "fertig", JSON.stringify(k.fehler));
  assert.equal(k.aus, 2, "zwei Standbilder");
  assert.equal(k.eingaben.ton, tonId, "der Beat ist der Ton der Szene");
  assert.equal(k.p.art, "gewebe"); assert.equal(k.p.zeiten.length, 2); assert.equal(k.p.guete, "grob");
  assert.ok(k.p.ton.einsaetze >= 4, `Einsätze des Beats: ${JSON.stringify(k.p.ton)}`);
  assert.ok(Math.max(...k.p.mass) === 256, `Rechengrösse ${k.p.mass}`);
  assert.equal(await t.page.locator("#buehne .karte").count(), 2);
  // die beiden Momente als Stationen: der Film rechnet sie auf der Bühne von PHORMA in jedem Bild neu
  await t.page.getByRole("button", { name: "alle als Stationen" }).click();
  await t.page.locator('input[name="ansicht"][value="nach"]').check({ force: true });
  assert.equal(await t.page.locator(".stationen-liste > li").count(), 2);
  await t.page.locator('.stationen input[data-param="halten"]').fill("0.4");
  await t.page.locator('.stationen input[data-param="uebergang"]').fill("0.2");
  await t.page.locator('.stationen input[data-param="seite"]').fill("320");
  await t.page.click("#stationenfilm");
  await warteFertig(t.page, 300000);
  const x = await S(t.page, () => { const x = ornamentLab.projekt.exporte.at(-1); return { art: x.art, zeitplan: x.zeitplan, bilder: x.bilder, breite: x.breite, hoehe: x.hoehe, ton: Boolean(x.ton) }; });
  assert.equal(x.art, "stationen", await t.page.textContent("#status"));
  assert.deepEqual(x.zeitplan.map((z) => z.lebendig), [true, true], "beide Stationen lebendig auf der eigenen Bühne");
  assert.equal(x.bilder, 30); assert.ok(Math.max(x.breite, x.hoehe) <= 320);
  assert.ok(x.ton, "der Beat ist die Tonspur");
  assert.ok(await t.page.locator(".stationen video").isVisible());
  assert.deepEqual(t.fehler, []);
  await t.ctx.close();
});

await check("PHORMA I und II (0.1.22): Fragmente mit Zettel als Titel, Physarum aus der ORNA-Regel, dann als lebendiger Film mit dem Zerfall", async () => {
  const t = await oeffne();
  await t.page.click("#beispiel");
  await t.page.waitForFunction(() => ornamentLab.aktuell);
  // ein Zettel und eine Konstellation als Material (ohne Bild gewählt: beide ohne Eingang)
  await t.page.locator("#materialien button").first().click();
  await operation(t.page, "zettel.strophe");
  await t.page.locator("#op-form select").first().selectOption("7");
  await ausfuehren(t.page);
  await t.page.locator("#materialien button").first().click();
  await operation(t.page, "orna.konstellation");
  await ausfuehren(t.page);
  const ids = await S(t.page, () => ({ zettel: ornamentLab.projekt.ergebnisse.find((e) => e.typ === "METADATA" && e.daten?.leitsatz).id, orna: ornamentLab.projekt.ergebnisse.find((e) => e.typ === "CONSTELLATION").id, regel: ornamentLab.projekt.ergebnisse.find((e) => e.typ === "CONSTELLATION").daten.regel }));
  assert.ok(ids.zettel && ids.orna && /^R[1-7]$/.test(ids.regel), JSON.stringify(ids));
  // PHORMA I, Fragmente (Leinwand 2D), zwei Momente, der Zettel gibt den Titel der Beschriftung
  await t.page.locator("#materialien button").first().click();
  await operation(t.page, "phorma.i");
  await t.page.locator('#op-form input[data-param="seite"]').fill("320");
  await t.page.locator('#op-form input[data-param="bilder"]').fill("2");
  await t.page.locator('#op-form input[data-param="dauer"]').fill("6");
  const waehle = async (werte) => { const l = t.page.locator("#op-form select"); for (let i = 0; i < await l.count(); i++) { const o = await l.nth(i).evaluate((s) => [...s.options].map((x) => x.value)); for (const w of werte) if (o.includes(w)) await l.nth(i).selectOption(w); } };
  await waehle(["fragmente", "grob", ids.zettel]);
  await t.page.click("#ausfuehren"); await t.page.waitForTimeout(50);
  await warteFertig(t.page, 300000);
  const k1 = await S(t.page, () => { const k = ornamentLab.projekt.knoten.at(-1); return { status: k.status, fehler: k.fehler ?? null, aus: k.ausgaben.length, eingaben: k.eingaben, p: k.protokoll }; });
  assert.equal(k1.status, "fertig", JSON.stringify(k1.fehler));
  assert.equal(k1.aus, 2); assert.equal(k1.p.ablauf, "fragmente"); assert.equal(k1.p.ablaufHerkunft, "mensch"); assert.equal(k1.eingaben.text, ids.zettel);
  assert.ok(k1.p.titel && k1.p.zerlegung.dreiecke > 50, `Titel «${k1.p.titel}», ${JSON.stringify(k1.p.zerlegung)}`);
  const fragmente = await S(t.page, () => ornamentLab.projekt.knoten.at(-1).ausgaben.slice());
  // PHORMA II ohne Ablauf: die Regel der Konstellation wählt ihn (Tabelle REGEL_ABLAUF), protokolliert als Entscheidung «regel»
  await t.page.locator("#materialien button").first().click();
  await operation(t.page, "phorma.ii");
  await t.page.locator('#op-form input[data-param="seite"]').fill("256");
  await t.page.locator('#op-form input[data-param="bilder"]').fill("2");
  await t.page.locator('#op-form input[data-param="dauer"]').fill("6");
  await waehle(["grob", ids.orna]);
  await t.page.click("#ausfuehren"); await t.page.waitForTimeout(50);
  await warteFertig(t.page, 300000);
  const k2 = await S(t.page, () => { const k = ornamentLab.projekt.knoten.at(-1); const d = ornamentLab.projekt.entscheidungen.filter((x) => x.gegenstand === "ablauf").at(-1); return { status: k.status, fehler: k.fehler ?? null, aus: k.ausgaben.length, eingaben: k.eingaben, p: k.protokoll, d }; });
  assert.equal(k2.status, "fertig", JSON.stringify(k2.fehler));
  assert.equal(k2.aus, 2); assert.equal(k2.p.ablaufHerkunft, "orna"); assert.equal(k2.p.regel, ids.regel); assert.equal(k2.eingaben.konstellation, ids.orna);
  assert.ok(k2.p.ablauf && k2.d && k2.d.art === "regel" && k2.d.gewaehlt === k2.p.ablauf, `Ablauf ${k2.p.ablauf} aus ${ids.regel}: ${JSON.stringify(k2.d)}`);
  assert.ok(Math.max(...k2.p.mass) === 256);
  console.log(`      PHORMA II aus ${ids.regel}: ${k2.p.ablauf}; PHORMA I Titel: ${k1.p.titel}`);
  // der Zerfall mit der Konstellation (Regel), dann ein Film: Fragmente, Physarum-Momente und zwei Zustände als Stationen, alle lebendig
  await t.page.locator("#materialien button").first().click();
  await operation(t.page, "fictory.prozess");
  await t.page.locator('#op-form input[data-param="seite"]').fill("480");
  await waehle([ids.orna]);
  await t.page.click("#ausfuehren"); await t.page.waitForTimeout(50);
  await warteFertig(t.page, 300000);
  const k3 = await S(t.page, () => { const k = ornamentLab.projekt.knoten.at(-1); return { status: k.status, aus: k.ausgaben, regel: k.protokoll?.lauf?.regel }; });
  assert.equal(k3.status, "fertig"); assert.equal(k3.aus.length, 6); assert.equal(k3.regel, ids.regel, "die Regel aus der Konstellation");
  const physarum = await S(t.page, () => ornamentLab.projekt.knoten.filter((k) => k.operation === "phorma.ii").at(-1).ausgaben.slice());
  await t.page.evaluate((ids) => { ornamentLab.stationen = ids.map((id) => ({ ergebnis: id, uebergang: "schnitt" })); }, [...fragmente, ...physarum, k3.aus[1], k3.aus[3]]);
  await t.page.locator('input[name="ansicht"][value="nach"]').check({ force: true });
  assert.equal(await t.page.locator(".stationen-liste > li").count(), 6);
  await t.page.locator('.stationen input[data-param="halten"]').fill("0.4");
  await t.page.locator('.stationen input[data-param="uebergang"]').fill("0");
  await t.page.locator('.stationen input[data-param="seite"]').fill("320");
  await t.page.click("#stationenfilm");
  await warteFertig(t.page, 300000);
  const x = await S(t.page, () => { const x = ornamentLab.projekt.exporte.at(-1); return { art: x.art, zeitplan: x.zeitplan, bilder: x.bilder, breite: x.breite, hoehe: x.hoehe }; });
  assert.equal(x.art, "stationen", await t.page.textContent("#status"));
  assert.deepEqual(x.zeitplan.map((z) => Boolean(z.lebendig)), [true, true, true, true, true, true], "alle sechs Stationen lebendig: PHORMA I, PHORMA II und der Zerfall auf ihren Bühnen");
  assert.equal(x.bilder, 72); assert.ok(Math.max(x.breite, x.hoehe) <= 320);
  assert.ok(await t.page.locator(".stationen video").isVisible());
  assert.deepEqual(t.fehler, []);
  await t.ctx.close();
});

await check("Beat aus Bild oder Video (0.1.24): am Telefon nach Regeln und mit jev (vorgetäuscht), aus einem Video sechs Abschnitte", async () => {
  const t = await oeffne({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const cdp = await t.ctx.newCDPSession(t.page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const gesendet = [];
  await t.page.route("**/alpha/lab/jev/wahl.php", (r) => {
    if (r.request().method() === "GET") return r.fulfill({ contentType: "application/json", body: JSON.stringify({ bereit: true }) });
    const lage = r.request().postDataJSON(); gesendet.push(lage);
    const antworten = { tempo: { langsam: 0, mittel: 0, schnell: 0, rasend: 1 }, groove: { gerade: 0, halftime: 1, breakbeat: 0, euklidisch: 0, schleppend: 0, dnb: 0 }, kit: { trocken: 0, elektronisch: 0, metallisch: 1, weich: 0 },
      tonart: { dur: 0, moll: 0, dorisch: 0, phrygisch: 1, pentatonik: 0 }, bass: { keiner: 0, liegend: 0, pulsierend: 0, laufend: 1, reese: 0 }, melodie: { keine: 0, bild: 0, arpeggio: 1, glocken: 0 }, verlauf: { gleich: 1, steigend: 0, abschwellend: 0, wellen: 0, wechselnd: 0 }, flaeche: { keine: 0, sphaere: 0, schimmer: 1 } };
    return r.fulfill({ contentType: "application/json", body: JSON.stringify({ antworten, modell: "jev-test", zwischengespeichert: false }) });
  });
  await t.page.reload(); await t.page.waitForFunction(() => globalThis.ornamentLab);
  await t.page.waitForFunction(() => /jev live: bereit/.test(document.querySelector("#status").textContent));
  await t.page.click("#beispiel");
  await t.page.waitForSelector("#beat-regeln");
  const t0 = Date.now();
  await t.page.click("#beat-regeln"); await t.page.waitForTimeout(50); await warteFertig(t.page);
  const zeit = Date.now() - t0;
  await t.page.waitForSelector("#beat-ergebnis audio");
  const a = await S(t.page, () => { const p = ornamentLab.projekt, k = p.knoten.at(-1), e = p.ergebnisse.find((x) => x.id === k.ausgaben[0]), f = p.ergebnisse.find((x) => x.id === k.ausgaben[1]);
    return { op: k.operation, status: k.status, ton: e.ton, typ: e.typ, folge: f.daten, d: p.entscheidungen.filter((x) => x.knoten === k.id).map((x) => ({ art: x.art, gegenstand: x.gegenstand, gruende: x.details.gruende })), param: k.parameter }; });
  assert.equal(a.op, "lab.beat"); assert.equal(a.status, "fertig"); assert.equal(a.typ, "AUDIO");
  assert.equal(a.ton.kanaele, 2, "Stereo"); assert.ok(Math.abs(a.ton.dauer - 15) < 0.01, `15 s: ${a.ton.dauer}`);
  assert.equal(a.folge.art, "rhythmus"); assert.ok(a.folge.bpm > 60 && a.folge.ereignisse.length > 20);
  assert.equal(a.d[0].art, "regel"); assert.ok(Object.keys(a.d[0].gruende).length === 8, "Gründe je Stelle");
  assert.match(await t.page.textContent("#beat"), /nach festen Regeln/);
  console.log(`      Beat 15 s gedrosselt: ${(zeit / 1000).toFixed(1)} s`);
  assert.ok(zeit < 30000, `${zeit} ms`);
  // eine Stelle ändern: die Entscheidung ist dann menschlich
  await t.page.locator('#beat select[data-beat="kit"]').selectOption("weich");
  await t.page.click("#beat-rechnen"); await t.page.waitForTimeout(50); await warteFertig(t.page);
  const m = await S(t.page, () => { const p = ornamentLab.projekt, k = p.knoten.at(-1); return { kit: k.parameter.kit, art: p.entscheidungen.filter((x) => x.knoten === k.id)[0].art }; });
  assert.deepEqual(m, { kit: "weich", art: "mensch" });
  // mit jev: nur die Stufen gehen hinaus, der Plan folgt den Wahrscheinlichkeiten
  await t.page.click("#beat-jev"); await t.page.waitForTimeout(50); await warteFertig(t.page);
  assert.deepEqual(Object.keys(gesendet[0]), ["frage", "merkmale"]);
  assert.equal(gesendet[0].frage, "beat");
  assert.deepEqual(Object.keys(gesendet[0].merkmale), ["helligkeit", "kontrast", "farbigkeit", "farbton", "detail", "schwerpunkt", "symmetrie", "bewegung"]);
  const j = await S(t.page, () => { const p = ornamentLab.projekt, k = p.knoten.at(-1), d = p.entscheidungen.filter((x) => x.knoten === k.id)[0]; return { param: k.parameter, art: d.art, quelle: d.details.quelle, modell: d.details.modell }; });
  assert.deepEqual({ tempo: j.param.tempo, groove: j.param.groove, kit: j.param.kit, tonart: j.param.tonart, bass: j.param.bass, melodie: j.param.melodie, verlauf: j.param.verlauf, flaeche: j.param.flaeche },
    { tempo: "rasend", groove: "halftime", kit: "metallisch", tonart: "phrygisch", bass: "laufend", melodie: "arpeggio", verlauf: "gleich", flaeche: "schimmer" });
  assert.deepEqual([j.art, j.quelle, j.modell], ["jev", "live", "jev-test"]);
  assert.match(await t.page.textContent("#beat"), /jev wählt \(jev-test\)/);
  assert.match(await t.page.textContent("#beat"), /p = 1/);
  assert.ok(await t.page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, "ohne Überbreite");
  // aus einem Video: die Standbilder werden Abschnitte, die Dauer ist die Länge des Videos
  const { spawnSync } = await import("node:child_process");
  const { mkdtempSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const datei = join(mkdtempSync(join(tmpdir(), "lab-beat-")), "clip.webm");
  const ff = spawnSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=size=320x240:rate=15:duration=6", "-c:v", "libvpx", "-b:v", "400k", datei]);
  if (ff.status === 0) {
    await t.page.setInputFiles("#videodatei", datei);
    await t.page.waitForFunction(() => ornamentLab.projekt.ergebnisse.filter((e) => e.herkunft?.video).length >= 6, null, { timeout: 60000 });
    await warteFertig(t.page);
    const still = await S(t.page, () => ornamentLab.projekt.ergebnisse.find((e) => e.herkunft?.video).id);
    await t.page.locator("#beat-bild").selectOption(still);
    assert.match(await t.page.textContent("#beat"), /6 Standbilder werden 6 Abschnitte/);
    assert.equal(await t.page.inputValue("#beat-dauer"), "6");
    await t.page.click("#beat-regeln"); await t.page.waitForTimeout(50); await warteFertig(t.page);
    const v = await S(t.page, () => { const p = ornamentLab.projekt, k = p.knoten.at(-1); return { eingaben: Object.keys(k.eingaben), dauer: p.ergebnisse.find((x) => x.id === k.ausgaben[0]).ton.dauer, bewegung: k.protokoll.merkmale.bewegung }; });
    assert.deepEqual(v.eingaben, ["bild", "bild2", "bild3", "bild4", "bild5", "bild6"]);
    assert.ok(Math.abs(v.dauer - 6) < 0.01); assert.notEqual(v.bewegung, "still");
  } else console.log("      (Video ohne ffmpeg übersprungen)");
  assert.deepEqual(t.fehler, []);
  await t.ctx.close();
});

await check("Signatur (0.1.26): am Telefon Intro mit dem Zettel, Outro mit ORNA, Signet ornament.lab; eigene Tonspur, das Signet endet mit dem Ton", async () => {
  const t = await oeffne({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  await t.page.click("#beispiel");
  await t.page.waitForFunction(() => ornamentLab.aktuell);
  await t.page.setInputFiles("#tondatei", { name: "beat.wav", mimeType: "audio/wav", buffer: beatWav() });
  await t.page.waitForSelector("#vorschlag-machen");
  await t.page.click("#vorschlag-machen");
  await t.page.waitForSelector("#vorschlag30 .zusammenstellung");
  await warteFertig(t.page);
  await t.page.locator('#vorschlag30 [data-bestand="zettel"]').check();
  await t.page.locator('#vorschlag30 select[data-bestand-wahl="zettel"]').selectOption("17");
  await t.page.locator('#vorschlag30 [data-bestand="orna"]').check();
  await t.page.locator('#vorschlag30 select[data-bestand-wahl="orna"]').selectOption("tehching-hsieh__wendy-hui-kyong-chun");
  assert.equal(await t.page.locator("#zusammenstellung-signatur").isChecked(), true);
  assert.match(await t.page.textContent("#vorschlag30 .zusammenstellung"), /Lichtwürfel .* Rad von ORNA .* Signet ornament\.lab.* 56[.,]5 s/);
  await S(t.page, () => { ornamentLab.film.seite = 360; });   // kleiner Film, damit die Prüfung in SwiftShader nicht zu lange rechnet (seit 0.1.40 kommen alle Abschnitte vor)
  await t.page.click("#zusammenstellung-rechnen");
  await t.page.waitForTimeout(50);
  await warteFertig(t.page, 1500000);
  await t.page.waitForSelector("#vorschlag30 .zusammenstellung video");
  const z = await S(t.page, () => { const pr = ornamentLab.projekt, x = pr.exporte.at(-1), k = (op) => pr.knoten.filter((y) => y.operation === op);
    return { x, ops: pr.knoten.map((y) => y.operation), status: document.querySelector("#status").textContent, ton: k("signatur.ton")[0], gemischt: k("lab.mastering").at(-1), intro: k("signatur.intro")[0], outro: k("signatur.outro")[0], signet: k("signatur.signet")[0],
      film: pr.entscheidungen.find((y) => y.gegenstand === "zusammenstellung").details.film }; });
  for (const k of ["intro", "outro", "signet", "ton"]) assert.equal(z[k]?.status, "fertig", `${k}: ${JSON.stringify(z[k]?.fehler ?? null)}`);
  assert.ok(!z.ops.includes("lab.karte"), "keine Karten");
  assert.equal(z.intro.protokoll.zettel, 17); assert.equal(z.intro.protokoll.verweise, 4);
  assert.equal(z.outro.eingaben.konstellation !== undefined, true);
  assert.equal(z.film.signatur.gesamt, 56.5);
  const pt = z.x.partitur, ende = pt.folge.at(-1), outro = pt.folge.at(-2);
  assert.equal(pt.folge[0].ergebnis, z.intro.ausgaben[0]); assert.equal(pt.folge[0].halten, 11); assert.equal(pt.folge[0].uebergang.art, "schnitt");
  assert.equal(outro.ergebnis, z.outro.ausgaben[0]); assert.equal(outro.dehnen, true); assert.ok(outro.halten >= 9);
  assert.equal(ende.ergebnis, z.signet.ausgaben[0]); assert.equal(ende.halten, 6.5);
  assert.ok(Math.abs(pt.dauer - 56.5) < 0.05, `${pt.dauer}`); assert.ok(Math.abs(ende.beginn - 50) < 0.05, `das Signet beginnt bei ${ende.beginn} s`);
  assert.equal(z.gemischt.eingaben.ton, z.ton.ausgaben[0], "gemischt wird die Tonspur der Signatur"); assert.equal(z.x.tonQuelle, z.gemischt.ausgaben[0], "die gemischte Tonspur (0.1.45)"); assert.ok(z.x.ton, "mit Ton");
  assert.ok(z.ton.protokoll.scratch && z.ton.protokoll.frickel.von === 50);
  assert.ok(z.x.zeitplan[0].lebendig && z.x.zeitplan.at(-1).lebendig, "Intro und Signet laufen auf ihrer eigenen Bühne");
  // einzelne Bilder: der Zettel ist hell (Papier), das Signet dunkel mit wenig Weiss
  const hell = await S(t.page, async () => {
    const pr = ornamentLab.projekt, m = (id) => pr.ergebnisse.find((e) => e.id === id), x = pr.exporte.at(-1);
    const mittel = (b) => { let s = 0; for (let i = 0; i < b.data.length; i += 4) s += b.data[i]; return s / (b.data.length / 4) / 255; };
    const nah = (a, b) => Math.abs(a[0] - b[0]) < 24 && Math.abs(a[1] - b[1]) < 24 && Math.abs(a[2] - b[2]) < 24;
    const zaehle = (b) => { const z = { blau: 0, blauHell: 0, orange: 0 }; for (let i = 0; i < b.data.length; i += 4) { const px = [b.data[i], b.data[i + 1], b.data[i + 2]]; if (nah(px, [29, 63, 214])) z.blau++; if (nah(px, [143, 176, 255])) z.blauHell++; if (nah(px, [240, 138, 93])) z.orange++; } return z; };
    const intro = await ornamentLab.medien.bild(m(x.partitur.folge[0].ergebnis)), signet = await ornamentLab.medien.bild(m(x.partitur.folge.at(-1).ergebnis));
    return { intro: mittel(intro), signet: mittel(signet), introFarben: zaehle(intro), signetFarben: zaehle(signet) };
  });
  assert.ok(hell.intro > 0.5, `Zettel auf Papier: ${hell.intro}`); assert.ok(hell.signet < 0.1, `Signet auf Schwarz: ${hell.signet}`);
  // seit 0.1.33 in den Farben des Neubaus: die Blaupause statt des Punkts #f08a5d
  assert.ok(hell.introFarben.blau > 0, `die Blaupause auf der Zettelkarte: ${JSON.stringify(hell.introFarben)}`); assert.equal(hell.introFarben.orange, 0);
  assert.ok(hell.signetFarben.blauHell > 0, `der Punkt des Signets in der Blaupause: ${JSON.stringify(hell.signetFarben)}`); assert.equal(hell.signetFarben.orange, 0);
  assert.match(z.status, /Signatur: Intro, Outro, Signet/);
  const breit = await t.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(breit <= 0, `${breit}px zu breit`);
  assert.deepEqual(t.fehler, []); assert.deepEqual(t.fremd, []);
  await t.ctx.close();
});

await check("Telefon (wie Samsung S21 FE, Rechenleistung gedrosselt): je sechs Varianten von Glitch, Pixelsortierung und Raster", async () => {
  const t = await oeffne({ viewport: { width: 384, height: 854 }, deviceScaleFactor: 2.8, isMobile: true, hasTouch: true });
  const cdp = await t.ctx.newCDPSession(t.page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });   // ein Mittelklasse-Telefon rechnet etwa viermal langsamer
  await t.page.click("#beispiel");
  await t.page.waitForFunction(() => ornamentLab.aktuell);
  const zeiten = {};
  for (const id of ["lab.glitch", "lab.pixelsortierung", "lab.raster"]) {
    await operation(t.page, id);
    const t0 = Date.now();
    await ausfuehren(t.page);
    zeiten[id] = Date.now() - t0;
    const k = await S(t.page, () => ornamentLab.projekt.knoten.at(-1));
    assert.equal(k.status, "fertig", id);
    assert.equal(k.ausgaben.length, 6, `${id}: sechs Varianten nebeneinander`);
    await t.page.getByRole("button", { name: "weiterführen", exact: true }).nth(2).click();
  }
  console.log("      Rechenzeit gedrosselt:", Object.entries(zeiten).map(([k, v]) => `${k} ${(v / 1000).toFixed(1)} s`).join(", "));
  for (const [id, ms] of Object.entries(zeiten)) assert.ok(ms < 30000, `${id}: ${ms} ms`);
  const breit = await t.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(breit <= 0, `${breit}px zu breit`);
  assert.deepEqual(t.fehler, []);
  await t.ctx.close();
});

await browser.close(); server.close();
const ok = ergebnisse.filter(Boolean).length;
console.log(`\n${ok} von ${ergebnisse.length} bestanden`);
process.exit(ok === ergebnisse.length ? 0 : 1);
