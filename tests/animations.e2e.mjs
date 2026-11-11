// «Animationen» – Browser-Test (Playwright, Chromium mit SwiftShader): alle 24 Effekte übersetzen und zeichnen mit einem eigenen Bild etwas,
// die Schlaufe hat keine Naht, die leere Bühne fordert ein Bild, «Neu mischen» schreibt die Mischung in die Adresse, «Werk sichern» legt
// das Werk ab (werke.php hier vorgetäuscht), es erscheint bei den Werken, lässt sich über #w=ID öffnen und wieder löschen, Pause und Standbild,
// kein seitliches Scrollen auf dem Handy.
//   NODE_PATH=$(npm root -g) node tests/animations.e2e.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const { chromium } = playwright;
const root = new URL("../", import.meta.url);
const { startServer } = await import(new URL("tools/serve-orma.mjs", root).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/animations/`;
const BILD = new URL("alpha/drittes-rad/og-drittes-rad.jpg", root).pathname.replace(/^\/([A-Za-z]:)/, "$1");   // irgendein JPEG aus dem Repository als eigenes Bild
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ergebnisse = [];
async function check(name, fn) {
  try { await fn(); ergebnisse.push(true); console.log("ok  ", name); }
  catch (e) { ergebnisse.push(false); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 6).join("\n      ")); }
}

// werke.php vorgetäuscht: eine Ablage im Speicher je Browserkontext; das Bild aus dem Formular wird unter werke/ID.jpg wieder ausgeliefert
function ablage() {
  const werke = [], bilder = new Map(), kurze = new Map();
  const teil = (buf, name) => {   // ein Feld aus multipart/form-data
    const kopf = Buffer.from(`name="${name}"`);
    const i = buf.indexOf(kopf); if (i < 0) return null;
    const a = buf.indexOf("\r\n\r\n", i) + 4, grenze = buf.subarray(0, buf.indexOf("\r\n")), b = buf.indexOf(grenze, a) - 2;
    return buf.subarray(a, b);
  };
  return {
    werke, bilder, kurze,
    async route(route, request) {
      const url = new URL(request.url());
      const json = (status, d) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(d) });
      if (url.searchParams.has("kurz")) { const d = kurze.get(url.searchParams.get("kurz")); return d ? json(200, d) : json(404, { fehler: "Diesen Link gibt es nicht." }); }
      if (/\/werke\/[a-f0-9]+\.jpg$/.test(url.pathname)) { const b = bilder.get(url.pathname.split("/").pop()); return b ? route.fulfill({ status: 200, contentType: "image/jpeg", body: b }) : route.fulfill({ status: 404 }); }
      if (request.method() === "GET") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ werke: [...werke].reverse(), anzahl: werke.length }) });
      if ((request.headers()["content-type"] || "").startsWith("application/json")) {
        const d = JSON.parse(request.postData());
        if (d.aktion === "kurz") { const kurz = `kz${String(kurze.size + 1).padStart(4, "0")}`; kurze.set(kurz, { kurz, werk: d.werk || null, stapel: d.stapel }); return json(201, { kurz }); }
        const i = werke.findIndex((w) => w.id === d.id && w.schluessel === d.schluessel);
        if (i < 0) return route.fulfill({ status: 403, contentType: "application/json", body: '{"fehler":"Der Schlüssel passt nicht."}' });
        werke.splice(i, 1);
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ geloescht: true }) });
      }
      const buf = request.postDataBuffer();
      const name = teil(buf, "name")?.toString("utf8"), titel = teil(buf, "titel")?.toString("utf8"), stapel = JSON.parse(teil(buf, "stapel").toString("utf8")), bild = teil(buf, "bild");
      if (!name) return route.fulfill({ status: 400, contentType: "application/json", body: '{"fehler":"Bitte einen Namen angeben."}' });
      const id = (werke.length + 1).toString(16).padStart(10, "a"), schluessel = "f".repeat(32);
      bilder.set(`${id}.jpg`, bild);
      const werk = { id, titel, name, zeit: new Date().toISOString(), bild: `werke/${id}.jpg`, breite: 1200, hoehe: 630, stapel };
      werke.push({ ...werk, schluessel });
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ id, schluessel, werk }) });
    },
  };
}
async function oeffne(viewport = { width: 1300, height: 900 }, hash = "", speicher = ablage()) {
  const ctx = await browser.newContext({ viewport });
  await ctx.route(/werke\.php|\/werke\/[a-f0-9]+\.jpg$/, (route, request) => speicher.route(route, request));
  const page = await ctx.newPage();
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  await page.goto(base + hash, { timeout: 120000 });
  await page.waitForFunction(() => document.documentElement.classList.contains("bereit"), null, { timeout: 120000 });
  return { ctx, page, fehler, speicher };
}
const bildBringen = async (page) => { await page.setInputFiles("#pult-datei", BILD); await page.waitForFunction(() => window.animationen.motor.hatBild("eigen"), null, { timeout: 60000 }); };

await check("leere Bühne: fordert ein Bild, Sichern und MP4 warten; mit Bild zeichnet die Bühne, «Neu mischen» ändert Mischung und Adresse", async () => {
  const { ctx, page, fehler } = await oeffne();
  assert.deepEqual(await page.evaluate(() => window.animationen.motor.pruefen()), []);
  assert.ok(await page.locator("#pult-leer").isVisible(), "die leere Bühne zeigt die Aufforderung");
  assert.ok(await page.locator("#pult-sichern").isDisabled(), "ohne Bild kein Sichern");
  assert.match(await page.locator("#werke-meldung").textContent(), /Noch keine Werke/);
  await bildBringen(page);
  assert.ok(!(await page.locator("#pult-leer").isVisible()));
  await page.waitForTimeout(600);
  const hell = await page.evaluate(() => { const c = document.getElementById("pult-bild"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s / (d.length / 4); });
  assert.ok(hell > 3, `die Bühne zeigt etwas (${hell})`);
  const vorher = await page.evaluate(() => JSON.stringify(window.animationen.S.mix));
  await page.getByRole("button", { name: "Neu mischen" }).click();
  await page.waitForTimeout(200);
  assert.notEqual(await page.evaluate(() => JSON.stringify(window.animationen.S.mix)), vorher);
  assert.match(page.url(), /#k=[^#]{10,200}$/, "kurzer Link");
  assert.equal(await page.evaluate(() => window.animationen.S.mix.bild), "eigen", "Neu mischen behält das Bild");
  // Format 16:9 (PR #615): die Bühne wird breit, die Leinwand rechnet im Seitenverhältnis, das Format steht im Link
  await page.getByRole("button", { name: "16:9", exact: true }).click();
  // die Leinwand wechselt mit dem nächsten Bild; ein schwerer Effekt in der Mischung braucht in SwiftShader dafür länger als 400 ms
  await page.waitForFunction(() => { const c = document.getElementById("pult-bild"); return Math.abs(c.width / c.height - 16 / 9) < .02; }, null, { timeout: 20000 }).catch(() => {});
  assert.equal(await page.evaluate(() => document.documentElement.dataset.format), "16x9");
  const [cb, ch, rb, rh] = await page.evaluate(() => { const c = document.getElementById("pult-bild"), r = c.getBoundingClientRect(); return [c.width, c.height, r.width, r.height]; });
  assert.ok(Math.abs(cb / ch - 16 / 9) < .02, `Leinwand ${cb} × ${ch}`); assert.ok(Math.abs(rb / rh - 16 / 9) < .02, `Bühne ${rb} × ${rh}`);
  assert.match(page.url().split("#k=")[1].split("~")[0], /^_.*f2$/, "16:9 steht im kurzen Link");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("alle 24 Effekte zeichnen mit dem eigenen Bild ein sichtbares Bild, und die Schlaufe schliesst ohne Naht", async () => {
  const { ctx, page } = await oeffne();
  await bildBringen(page);
  const ids = await page.evaluate(async () => (await import("./effekte.js")).EFFEKT_IDS);
  const probleme = await page.evaluate((ids) => {
    const { motor } = window.animationen, gl = motor.gl, dt = 1 / 30;
    const lesen = (t, s) => { motor.zeichnen(s, t, 64, 80); const p = new Uint8Array(64 * 80 * 4); gl.readPixels(0, 0, 64, 80, gl.RGBA, gl.UNSIGNED_BYTE, p); return p; };
    const mittel = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length; };
    return ids.flatMap((id) => {
      const s = { bild: "eigen", grund: "schwarz", ebenen: [{ effekt: id, werte: [], modus: "normal", deckkraft: 1, quelle: "bild", seed: 0 }] };
      const px = lesen(4.2, s); let min = 255, max = 0; for (let i = 0; i < px.length; i += 4) { const v = px[i] + px[i + 1] + px[i + 2]; min = Math.min(min, v); max = Math.max(max, v); }
      const letztes = lesen(12 - dt, s), erstes = lesen(0, s), zweites = lesen(dt, s), vorletztes = lesen(12 - 2 * dt, s);
      const naht = mittel(letztes, erstes), normal = Math.max(mittel(erstes, zweites), mittel(vorletztes, letztes));
      const aus = [];
      if (max - min < 30) aus.push(`${id}: leer`);
      if (naht > normal * 3 + 1.5) aus.push(`${id}: Naht ${naht.toFixed(2)} gegen ${normal.toFixed(2)}`);
      return aus;
    });
  }, ids);
  assert.deepEqual(probleme, []);
  await ctx.close();
});

await check("Werk sichern: mit Titel und Name abgelegt, erscheint bei den Werken, #w=ID öffnet es wieder, Löschen nimmt es weg", async () => {
  const { ctx, page, fehler, speicher } = await oeffne();
  await bildBringen(page);
  await page.getByRole("button", { name: "Werk sichern" }).click();
  assert.match(await page.locator("#sichern-meldung").textContent(), /Namen/, "ohne Namen kein Sichern");
  await page.fill("#sichern-titel", "Probe am Abend");
  await page.fill("#sichern-name", "Testerin");
  await page.getByRole("button", { name: "Werk sichern" }).click();
  await page.waitForFunction(() => /Gesichert/.test(document.getElementById("sichern-meldung").textContent), null, { timeout: 30000 });
  assert.equal(speicher.werke.length, 1);
  assert.equal(speicher.werke[0].name, "Testerin"); assert.equal(speicher.werke[0].titel, "Probe am Abend");
  assert.ok(Array.isArray(speicher.werke[0].stapel.ebenen) && !("bild" in speicher.werke[0].stapel), "die Mischung ohne den Bildschlüssel");
  assert.ok(speicher.werke[0].stapel.ebenen.length >= 1 && speicher.werke[0].stapel.ebenen.every((e) => e.effekt), "keine leere Ebene in der gesicherten Mischung");
  assert.ok(speicher.bilder.values().next().value.subarray(0, 2).equals(Buffer.from([0xff, 0xd8])), "das Bild kommt als JPEG an");
  assert.match(page.url(), /#w=[a-f0-9]{10}$/);
  assert.equal(await page.locator(".kachel").count(), 1);
  assert.match(await page.locator(".kachel .text").textContent(), /Probe am Abend.*von Testerin/);
  assert.equal(await page.locator("#werke-anzahl").textContent(), "1");
  assert.ok(await page.locator(".kachel .loeschen").isVisible(), "das eigene Werk lässt sich löschen");
  // über die Adresse wieder öffnen
  const url = page.url();
  await page.click('[data-ansicht="info"]');
  const zweite = await ctx.newPage(); await zweite.goto(url, { timeout: 120000 });
  await zweite.waitForFunction(() => document.documentElement.classList.contains("bereit"), null, { timeout: 120000 });
  assert.match(await zweite.evaluate(() => window.animationen.S.mix.bild), /^w:[a-f0-9]{10}$/, "das Werk ist im Mischpult");
  assert.ok(!(await zweite.locator("#pult-leer").isVisible()), "die Bühne zeigt das Werk");
  assert.match(await zweite.locator("#pult-meldung").textContent(), /von Testerin/);
  assert.equal(await zweite.locator("input#sichern-titel").inputValue(), "Probe am Abend (Variante)");
  // kurze Links: das unveränderte Werk bleibt #w=ID; weitergemischt wird es ein kurzer #k-Link, der das Werk mit der Änderung öffnet
  assert.equal(zweite.url(), url, "ein geöffnetes, unverändertes Werk teilt sich mit seiner Kennung");
  await zweite.locator('.regler input[type="range"]').first().evaluate((r) => { r.value = "0.37"; r.dispatchEvent(new Event("input")); r.dispatchEvent(new Event("change")); });
  const weiter = zweite.url();
  assert.match(weiter, /#k=[a-f0-9]{10}_[^#]{0,190}$/, `kurzer Link zum Weiterarbeiten: ${weiter}`);
  const geordnet = () => { const o = (v) => Array.isArray(v) ? v.map(o) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, o(v[k])])) : v; return JSON.stringify(o(window.animationen.S.mix)); };
  const mix = await zweite.evaluate(geordnet);
  const dritte = await ctx.newPage(); await dritte.goto(weiter, { timeout: 120000 });
  await dritte.waitForFunction(() => document.documentElement.classList.contains("bereit"), null, { timeout: 120000 });
  assert.equal(await dritte.evaluate(geordnet), mix, "der kurze Link bringt die weitergemischte Fassung zurück");
  assert.ok(!(await dritte.locator("#pult-leer").isVisible()), "mit dem Bild des Werks");
  await dritte.close();
  // «Link kopieren» gibt einen Kurzlink /a/KURZ (5. November 2026: «immer noch seeeehr lang»); #a=KURZ (dorthin leitet .htaccess) öffnet die Fassung
  await zweite.getByRole("button", { name: "Link kopieren" }).click();
  await zweite.waitForFunction(() => /\/a\/kz\d{4}$/.test(document.getElementById("pult-meldung").textContent), null, { timeout: 10000 });
  assert.equal(speicher.kurze.size, 1);
  const k = [...speicher.kurze.values()][0];
  assert.match(k.werk, /^[a-f0-9]{10}$/, "der Kurzlink kennt das Werk"); assert.ok(!("werk" in k.stapel) && !("bild" in k.stapel));
  const vierte = await ctx.newPage(); await vierte.goto(`${base}#a=${k.kurz}`, { timeout: 120000 });
  await vierte.waitForFunction(() => document.documentElement.classList.contains("bereit"), null, { timeout: 120000 });
  assert.equal(await vierte.evaluate(geordnet), mix, "der Kurzlink bringt die weitergemischte Fassung zurück");
  assert.ok(!(await vierte.locator("#pult-leer").isVisible()), "mit dem Bild des Werks");
  await vierte.close();
  // Anhängsel von Facebook (?fbclid=…) verschwinden beim Öffnen aus der Adresse
  const fuenfte = await ctx.newPage(); await fuenfte.goto(url.replace("#", "?fbclid=IwAR0abcdefghijklmnopqrstuvwxyz_aem_123#"), { timeout: 120000 });
  await fuenfte.waitForFunction(() => document.documentElement.classList.contains("bereit"), null, { timeout: 120000 });
  assert.equal(fuenfte.url(), url, "ohne ?fbclid");
  await fuenfte.close();
  await zweite.close();
  // löschen
  page.once("dialog", (d) => d.accept());
  await page.click('[data-ansicht="mischpult"]');
  await page.locator(".kachel .loeschen").click();
  await page.waitForFunction(() => document.querySelectorAll(".kachel").length === 0, null, { timeout: 10000 });
  assert.equal(speicher.werke.length, 0);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Pause hält an (auch per Leertaste und Klick auf die Bühne); Standbild lädt ein PNG in 1080 × 1350", async () => {
  const { ctx, page, fehler } = await oeffne();
  await bildBringen(page);
  await page.getByRole("button", { name: "Pause" }).click();
  await page.waitForTimeout(800);
  const a = await page.locator("#pult-uhr").textContent(); await page.waitForTimeout(1500);
  assert.equal(await page.locator("#pult-uhr").textContent(), a, "die Zeit steht");
  assert.equal(await page.locator("#pult-pause").textContent(), "Abspielen");
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press("Space");
  assert.equal(await page.locator("#pult-pause").textContent(), "Pause", "Leertaste spielt wieder ab");
  await page.locator("#pult-bild").click();
  assert.equal(await page.locator("#pult-pause").textContent(), "Abspielen", "Klick auf die Bühne hält an");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Standbild" }).click()]);
  assert.match(download.suggestedFilename(), /^ornament-animation-mischung-\d\ds\d-4x5\.png$/);
  const kopf = readFileSync(await download.path());
  assert.equal(kopf.subarray(1, 4).toString(), "PNG");
  assert.deepEqual([kopf.readUInt32BE(16), kopf.readUInt32BE(20)], [1080, 1350]);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("ohne Ablage: die Seite läuft, Sichern bleibt aus, die Werke melden es", async () => {
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  await ctx.route(/werke\.php/, (route) => route.fulfill({ status: 500, body: "kaputt" }));
  const page = await ctx.newPage();
  await page.goto(base, { timeout: 120000 });
  await page.waitForFunction(() => document.documentElement.classList.contains("bereit"), null, { timeout: 120000 });
  assert.match(await page.locator("#werke-meldung").textContent(), /liessen sich nicht laden/);
  await bildBringen(page);
  assert.ok(await page.locator("#pult-sichern").isDisabled());
  await ctx.close();
});

await check("Grafik setzt aus (5. November 2026, Handy: «Diese Seite braucht WebGL 2»): verlorener Kontext kommt zurück und zeichnet wieder, ein kaputter Effekt bleibt leer statt die Seite anzuhalten", async () => {
  const { ctx, page, fehler } = await oeffne();
  await bildBringen(page);
  const r = await page.evaluate(async () => {
    const { motor } = window.animationen, ext = motor.gl.getExtension("WEBGL_lose_context");
    ext.loseContext(); await new Promise((ok) => setTimeout(ok, 300));
    const weg = document.getElementById("pult-meldung").textContent;
    motor.zeichnen({ bild: "eigen", ebenen: [{ effekt: "bild" }] }, 1, 80, 100);   // darf nicht werfen
    ext.restoreContext(); await new Promise((ok) => setTimeout(ok, 500));
    motor.zeichnen({ bild: "eigen", ebenen: [{ effekt: "bild" }] }, 1, 80, 100);
    const px = new Uint8Array(4 * 80 * 100); motor.gl.readPixels(0, 0, 80, 100, motor.gl.RGBA, motor.gl.UNSIGNED_BYTE, px);
    let s = 0; for (let i = 0; i < px.length; i += 4) s += px[i] + px[i + 1] + px[i + 2];
    return { weg, zurueck: document.getElementById("pult-meldung").textContent, hell: s / (px.length / 4), sparsam: motor.sparsam };
  });
  assert.match(r.weg, /ausgesetzt/); assert.match(r.zurueck, /wieder/); assert.ok(r.hell > 3, `zeichnet wieder (${r.hell})`); assert.equal(r.sparsam, true);
  // ein Effekt, der nicht übersetzt: seine Ebene bleibt leer, die andere wird gezeichnet, die Seite meldet ihn
  const k = await page.evaluate(async () => {
    const marke = document.querySelector('script[src^="seite.js"]').getAttribute("src").split("?")[1];   // dieselbe Versionsmarke wie die Seite, sonst kommt ein zweites Modul (5. November 2026)
    const { EFFEKTE } = await import(`./effekte.js?${marke}`);
    EFFEKTE.kaputt = { name: "Kaputt", herkunft: "", regler: [], glsl: "vec4 effekt(vec2 uv){ return nichtDa; }" };
    const { motor, S } = window.animationen;
    S.mix = { bild: "eigen", grund: "schwarz", ebenen: [{ effekt: "kaputt" }, { effekt: "bild", modus: "normal", deckkraft: 1 }] };
    await new Promise((ok) => setTimeout(ok, 400));
    const ergebnis = { kaputt: [...motor.kaputt.keys()], meldung: document.getElementById("pult-meldung").textContent };
    delete EFFEKTE.kaputt;
    return ergebnis;
  });
  assert.deepEqual(k.kaputt, ["kaputt"]); assert.match(k.meldung, /«Kaputt» lässt sich auf diesem Gerät nicht rechnen/);
  assert.deepEqual(fehler.filter((f) => !/Kaputt/.test(f)), []);
  await ctx.close();
});

await check("Handy: kein seitliches Scrollen in beiden Ansichten, die Ansichten als Leiste unten", async () => {
  const { ctx, page } = await oeffne({ width: 360, height: 760 });
  for (const a of ["mischpult", "info"]) {
    await page.click(`[data-ansicht="${a}"]`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, a);
  }
  const lage = await page.evaluate(() => getComputedStyle(document.querySelector(".ansichten")).position);
  assert.equal(lage, "fixed");
  await ctx.close();
});

await check("Sprachen (5. November 2026): /animations/en/ und /es/ mischen, sichern und zeigen die Werke in ihrer Sprache, der Umschalter nimmt die Mischung mit", async () => {
  const speicher = ablage();
  for (const [sprache, mischen, sichern, gesichert, effekt, ebene] of [["en", "Remix", "Save work", /^Saved: “Abendprobe” by Testerin/, "Contour lines", "Layer 1"], ["es", "Mezclar de nuevo", "Guardar obra", /^Guardada: «Abendprobe» de Testerin/, "Curvas de nivel", "Capa 1"]]) {
    const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 } });
    await ctx.route(/werke\.php|\/werke\/[a-f0-9]+\.jpg$/, (route, request) => speicher.route(route, request));
    const page = await ctx.newPage();
    const fehler = [];
    page.on("pageerror", (e) => fehler.push(e.message));
    page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
    const anfragen = [];
    page.on("request", (r) => { if (/werke/.test(r.url())) anfragen.push(new URL(r.url()).pathname); });
    await page.goto(`${base}${sprache}/`, { timeout: 120000 });
    await page.waitForFunction(() => document.documentElement.classList.contains("bereit"), null, { timeout: 120000 });
    await bildBringen(page);
    await page.getByRole("button", { name: mischen }).click();
    await page.locator("#pult-ebenen select").first().selectOption("hoehenlinien");
    assert.equal(await page.locator("#pult-ebenen select").first().locator("option:checked").textContent(), effekt);
    assert.equal(await page.locator("#pult-ebenen legend").first().textContent(), ebene);
    await page.fill("#sichern-titel", "Abendprobe"); await page.fill("#sichern-name", "Testerin");
    await page.getByRole("button", { name: sichern, exact: true }).click();
    await page.waitForFunction((n) => document.querySelectorAll("#werke-raster .kachel").length >= n, speicher.werke.length, { timeout: 30000 });
    assert.match(await page.locator("#sichern-meldung").textContent(), gesichert);
    assert.ok(anfragen.every((a) => a.startsWith("/animations/werke")), `die Ablage liegt neben dem Modul: ${anfragen.join(", ")}`);
    // die Kachel zeichnet das Werk (Bild aus /animations/werke/ID.jpg, nicht aus /animations/en/werke/)
    await page.locator("#werke-raster .kachel").first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => { const c = document.querySelector("#werke-raster canvas"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 0; i < d.length; i += 40) s += d[i]; return s > 0; }, null, { timeout: 30000 });
    // Info: die Effekte in der Sprache der Seite
    await page.click('[data-ansicht="info"]');
    assert.match(await page.locator("#info-effekte").textContent(), sprache === "en" ? /Contour lines/ : /Curvas de nivel/);
    await page.click('[data-ansicht="mischpult"]');
    // Umschalter: Deutsch mit derselben Mischung
    const hash = new URL(page.url()).hash;
    await page.click('.sprachen a[hreflang="de"]');
    await page.waitForFunction(() => document.documentElement.classList.contains("bereit"), null, { timeout: 120000 });
    assert.equal(new URL(page.url()).pathname, "/animations/");
    assert.equal(new URL(page.url()).hash, hash, "die Mischung geht mit");
    assert.equal(await page.evaluate(() => document.documentElement.lang), "de");
    assert.deepEqual(fehler, []);
    await ctx.close();
  }
  // Handy: kein seitliches Scrollen mit dem Umschalter im Kopf
  const ctx = await browser.newContext({ viewport: { width: 360, height: 760 } });
  const page = await ctx.newPage();
  await page.goto(`${base}es/`, { timeout: 120000 });
  await page.waitForFunction(() => document.documentElement.classList.contains("bereit"), null, { timeout: 120000 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  assert.ok(await page.locator('.sprachen a[hreflang="en"]').isVisible());
  await ctx.close();
});

await browser.close();
server.close();
const fehlgeschlagen = ergebnisse.filter((e) => !e).length;
console.log(`\n${ergebnisse.length - fehlgeschlagen} von ${ergebnisse.length} bestanden`);
process.exit(fehlgeschlagen ? 1 : 0);
