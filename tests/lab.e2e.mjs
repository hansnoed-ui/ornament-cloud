// ORNAMENT LAB – Browsertest (Playwright, Chromium) des ersten durchgehenden Prozesses mit dem Beispielbild:
// Bild → ORNA-Konstellation → The Fictory (sechs Zustände nebeneinander) → Variante wählen → Feedback mit modulierten Varianten → Variante wählen
// → Bildsignal koppelt Wiederholung → Animation → Projekt speichern und wieder öffnen; dazu jev-assistiert, experimentell, Kette,
// kompositorisches Profil mit Zielprofil, Tondatei als Steuersignal für ein Feedback über die Zeit, Animation über Stationen (auch im Takt
// der Toneinsätze mit Tonspur), Handy.
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
const browser = await playwright.chromium.launch();
const ergebnisse = [];
async function check(name, fn) {
  try { await fn(); ergebnisse.push(true); console.log("ok  ", name); }
  catch (e) { ergebnisse.push(false); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 8).join("\n      ")); }
}
async function oeffne(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, ...opts });
  const page = await ctx.newPage();
  const fehler = [], fremd = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
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

await check("Start: vier Bereiche, Register mit elf Operationen, keine Fehler", async () => {
  for (const id of ["material", "operationen", "experiment", "protokoll"]) assert.ok(await page.locator(`#${id}`).isVisible(), id);
  assert.match(await page.textContent("#status"), /11 Operationen/);
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
  assert.ok((await S(page, () => ornamentLab.projekt.exporte.at(-1).bilder)) >= 13);
  // Ton als Taktgeber: die Einsätze lösen die Wechsel zwischen den Stationen aus, der Ton wird Tonspur
  await page.locator('.stationen-regler label:has(> span:text-is("Takt")) select').selectOption({ label: await S(page, () => ornamentLab.projekt.ergebnisse.filter((e) => e.typ === "EVENT_SEQUENCE").at(-1).titel) });
  await page.locator('.stationen input[data-param="seite"]').fill("320");
  assert.ok(await page.getByText("den gemessenen Ton als Tonspur").isVisible());
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
    const boxen = await S(page, async () => { const t = new TextDecoder("latin1").decode(await (await fetch([...ornamentLab.filme.values()].at(-1).url)).arrayBuffer()); return { soun: t.includes("soun"), ton: t.includes("Opus") || t.includes("mp4a") }; });
    assert.deepEqual(boxen, { soun: true, ton: true }, "das MP4 hat eine Tonspur");
  }
  console.log("      Tonspur:", JSON.stringify(x.tonspur));
  await page.locator('input[name="ansicht"][value="neben"]').check({ force: true });
});

await check("Keine Fehler in der Konsole, keine Anfragen nach aussen", async () => {
  assert.deepEqual(fehler, []);
  assert.deepEqual(fremd, []);
});
await ctx.close();

await check("Telefon: kein seitliches Scrollen, Bereiche untereinander", async () => {
  const t = await oeffne({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const breit = await t.page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  assert.ok(breit <= 0, `${breit}px zu breit`);
  const [a, b] = await Promise.all(["#material", "#experiment"].map((s) => t.page.locator(s).boundingBox()));
  assert.ok(b.y > a.y && Math.abs(b.x - a.x) < 2);
  await t.ctx.close();
});

await browser.close(); server.close();
const ok = ergebnisse.filter(Boolean).length;
console.log(`\n${ok} von ${ergebnisse.length} bestanden`);
process.exit(ok === ergebnisse.length ? 0 : 1);
