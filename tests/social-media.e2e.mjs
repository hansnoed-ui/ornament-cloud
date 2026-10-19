// Social Media – Browser-Tests (Playwright, Chromium), seit 19. Oktober 2026:
// Zeitleiste mit den erfundenen Beispielzetteln (Filter, Suche, Ordnung, Zeitband, Adresse, Handy ohne seitliches Wischen),
// Zettelseite, und die Redaktion von Anfang bis Ende gegen nachgebildete Dienste: GitHub (Git-Objekte, Commits, Zweig) und Anthropic (Claude als Datenstrom).
// Die Redaktion muss im Browser Zeichen für Zeichen dieselben Seiten erzeugen wie tools/build-social-media.mjs in Node.
//   NODE_PATH=$(npm root -g) node tests/social-media.e2e.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join, extname, normalize } from "node:path";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const { chromium, devices } = playwright;
const ROOT = fileURLToPath(new URL("../", import.meta.url));
const { alleSeiten } = await import(new URL("social-media/js/darstellung.js", `file://${ROOT}`).href);

// Vorschau mit den Beispielzetteln in einen eigenen Ordner bauen
const VORSCHAU = mkdtempSync(join(tmpdir(), "sm-vorschau-"));
execFileSync("node", [join(ROOT, "tools/build-social-media.mjs"), "--daten", join(ROOT, "tests/fixtures/social-media/eintraege.json"), "--ziel", VORSCHAU], { stdio: "pipe" });

const TYPEN = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".xml": "application/xml",
  ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".mp4": "video/mp4" };
function server(wurzel) {
  return new Promise((ok) => {
    const s = createServer((req, res) => {
      let p = normalize(join(wurzel, decodeURIComponent(new URL(req.url, "http://x").pathname)));
      if (!p.startsWith(wurzel)) { res.writeHead(403); return res.end(); }
      if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
      if (!existsSync(p)) { res.writeHead(404); return res.end("nicht gefunden"); }
      res.writeHead(200, { "content-type": TYPEN[extname(p)] ?? "application/octet-stream", "cache-control": "no-cache" });
      res.end(readFileSync(p));
    });
    s.listen(0, "127.0.0.1", () => ok(s));
  });
}
const sRepo = await server(ROOT), sVorschau = await server(VORSCHAU);
const REPO = `http://127.0.0.1:${sRepo.address().port}`, VOR = `http://127.0.0.1:${sVorschau.address().port}`;
const browser = await chromium.launch();
const ergebnisse = [];
async function check(name, fn) {
  try { await fn(); ergebnisse.push(true); console.log("ok  ", name); }
  catch (e) { ergebnisse.push(false); console.log("FAIL", name, "\n     ", String(e.stack ?? e).split("\n").slice(0, 8).join("\n      ")); }
}
async function seite(adresse, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce", ...opts });
  const page = await ctx.newPage();
  const fehler = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/goatcounter|favicon/.test(m.text())) fehler.push(m.text()); });
  if (adresse) await page.goto(adresse);
  return { ctx, page, fehler };
}
const sichtbareZettel = (page) => page.locator(".zettel:not([hidden])").evaluateAll((els) => els.map((e) => +e.dataset.nr));

// ---------- Zeitleiste ----------

await check("Zeitleiste: alle sechs Beispielzettel, zuletzt gesicherte zuerst, nach Monaten; Zähler, Zeitband, Filter erscheinen mit Skript", async () => {
  const { ctx, page, fehler } = await seite(`${VOR}/social-media/`);
  assert.deepEqual(await sichtbareZettel(page), [6, 5, 4, 3, 2, 1]);
  assert.deepEqual(await page.locator(".monat:not([hidden]) h2").allTextContents(), ["Oktober 2026", "September 2026"]);
  assert.ok(await page.locator(".filter").isVisible(), "Filter sichtbar");
  assert.equal(await page.locator(".zeitband .woche-alle").count() > 0, true);
  assert.match(await page.locator(".sm-zaehler").textContent(), /6 Zettel, 5 Autor:innen, 10 Schlagworte/);
  assert.equal(await page.locator('.menu-item[aria-current="page"] span').textContent(), "Social");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Zeitleiste: Schlagwort, Plattform, Person und Suche filtern zusammen; Anzahl in den Knöpfen; Adresse merkt sich den Stand", async () => {
  const { ctx, page, fehler } = await seite(`${VOR}/social-media/`);
  await page.locator('button[data-schlagwort="stadt"]').click();
  assert.deepEqual(await sichtbareZettel(page), [6, 3, 2]);
  assert.match(await page.locator(".filter-stand").textContent(), /3 von 6 Zetteln/);
  assert.match(page.url(), /schlagwort=stadt/);
  await page.locator('button[data-plattform="facebook"]').click();
  assert.deepEqual(await sichtbareZettel(page), [6, 2]);
  assert.equal(await page.locator('button[data-plattform="x"]').isDisabled(), true, "X hat mit diesen Filtern keinen Zettel");
  await page.locator(".filter-block").nth(1).locator("summary").click();
  await page.locator('button[data-autor="facebook-beispiel-seefeld"]').click();
  assert.deepEqual(await sichtbareZettel(page), [6, 2]);
  await page.locator('input[type="search"]').fill("kaffee");
  assert.deepEqual(await sichtbareZettel(page), [2]);
  // die Adresse trägt alles; neu laden zeigt dasselbe
  await page.reload();
  assert.deepEqual(await sichtbareZettel(page), [2]);
  assert.equal(await page.locator('input[type="search"]').inputValue(), "kaffee");
  await page.locator(".filter .filter-zurueck").click();
  assert.equal((await sichtbareZettel(page)).length, 6);
  assert.equal(new URL(page.url()).search, "");
  // nichts passt: Hinweis mit Knopf
  await page.locator('input[type="search"]').fill("gibtsnichtxyz");
  assert.ok(await page.locator(".sm-leer-gefiltert").isVisible());
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Zeitleiste: Schlagworte und Hashtags in den Zetteln filtern auf der Seite, statt sie neu zu laden", async () => {
  const { ctx, page } = await seite(`${VOR}/social-media/`);
  await page.locator('#zettel-1 a[data-schlagwort="archiv"]').click();
  assert.deepEqual(await sichtbareZettel(page), [4, 1]);
  await page.locator(".filter .filter-zurueck").click();
  await page.locator("#zettel-3 a.hashtag").first().click();
  assert.equal(await page.locator('input[type="search"]').inputValue(), "#architecture");
  assert.deepEqual(await sichtbareZettel(page), [3]);
  await ctx.close();
});

await check("Zeitleiste: nach Veröffentlichung ordnen – andere Reihenfolge und Monate, das Datum der Veröffentlichung in der Zeitspalte", async () => {
  const { ctx, page } = await seite(`${VOR}/social-media/?ordnung=veroeffentlicht`);
  assert.deepEqual(await sichtbareZettel(page), [6, 5, 2, 3, 4, 1]);
  assert.deepEqual(await page.locator(".monat h2").allTextContents(), ["Oktober 2026", "September 2026", "August 2026", "Oktober 2024"]);
  assert.match(await page.locator("#zettel-1 .zettel-zeit").innerText(), /17\.\s*Okt\. 2024/);
  await page.locator('button[data-ordnung="erfasst"]').click();
  assert.deepEqual(await sichtbareZettel(page), [6, 5, 4, 3, 2, 1]);
  await ctx.close();
});

await check("Zeitleiste: eine Woche im Zeitband wählen (Klick oder Tastatur), noch einmal löst sie", async () => {
  const { ctx, page } = await seite(`${VOR}/social-media/`);
  const woche = page.locator(".zeitband .woche[role=button]").last();
  await woche.click();
  assert.deepEqual(await sichtbareZettel(page), [6]);
  assert.match(page.url(), /woche=\d+/);
  await woche.focus();
  await page.keyboard.press("Enter");
  assert.equal((await sichtbareZettel(page)).length, 6);
  await ctx.close();
});

await check("Zeitleiste und Zettel auf dem Handy (320, 390 px): kein seitliches Wischen, Karussell blättert", async () => {
  for (const opts of [{ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true }, { ...devices["iPhone 13"] }]) {
    for (const pfad of ["/social-media/", "/social-media/3-fassaden-als-tagebuch/", "/social-media/schlagworte/", "/social-media/autorinnen/"]) {
      const { ctx, page, fehler } = await seite(`${VOR}${pfad}`, opts);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${pfad} ${page.viewportSize().width}: seitliches Wischen`);
      assert.deepEqual(fehler, [], pfad);
      await ctx.close();
    }
  }
  const { ctx, page } = await seite(`${VOR}/social-media/3-fassaden-als-tagebuch/`);
  const k = page.locator(".karussell");
  await k.focus();
  await page.keyboard.press("ArrowRight");
  await page.waitForFunction(() => document.querySelector(".karussell").scrollLeft > 10);
  await page.waitForFunction(() => document.querySelectorAll(".karussell-punkte span")[1].classList.contains("an"));
  await ctx.close();
});

await check("Zettelseite: Zitiervorschlag kopieren, Beleg-Hinweise, Verweise in beide Richtungen, gelöschtes Original markiert", async () => {
  const { ctx, page, fehler } = await seite(`${VOR}/social-media/4-antwort-auf-das-archiv/`);
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.locator("[data-kopieren]").click();
  assert.match(await page.evaluate(() => navigator.clipboard.readText()), /^Jon Brändli \(@beispiel_jon\) \(18\. Oktober 2024\): «Ein Archiv/);
  assert.equal(await page.locator("[data-kopieren]").textContent(), "Kopiert");
  assert.match(await page.locator(".status--weg").textContent(), /nicht mehr online \(festgestellt am 17\. Oktober 2026\)/);
  assert.match(await page.locator(".verweise").textContent(), /Antwort auf\s+Zettel 1/);
  assert.match(await page.locator(".zeitstrahl-abstand").textContent(), /nach 2 Jahren gesichert/);
  await page.goto(`${VOR}/social-media/1-wer-beobachtet-die-beobachter/`);
  assert.match(await page.locator(".verweise").textContent(), /Zettel 4: Eine Antwort auf das Archiv\s*Antwort darauf/);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Social Media auf der Website: ohne Zettel die leere Seite, mit Menü und ohne Fehler", async () => {
  const { ctx, page, fehler } = await seite(`${REPO}/social-media/`);
  const daten = JSON.parse(readFileSync(join(ROOT, "social-media/daten/eintraege.json"), "utf8"));
  if (!daten.eintraege.length) assert.ok(await page.locator(".sm-leer").isVisible());
  else assert.equal(await page.locator(".zettel").count(), daten.eintraege.length);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

// ---------- Redaktion gegen nachgebildete Dienste ----------

/** ein Git-Repository im Speicher: Dateien des Zweigs, Commits, Bäume, Blobs; genug von der REST-API von GitHub für die Redaktion */
function githubNachbau(dateien) {
  const sha1 = (s) => createHash("sha1").update(s).digest("hex");
  const blobSha = (buf) => sha1(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf]));
  const blobs = new Map(), baeume = new Map(), commits = new Map();
  const baumAus = (map) => { const id = sha1(`baum${baeume.size}${Math.random()}`); baeume.set(id, new Map(map)); return id; };
  let kopf = sha1("commit 0");
  commits.set(kopf, baumAus(dateien));
  const anfragen = [];
  const g = {
    anfragen, aktuell: () => baeume.get(commits.get(kopf)),
    text: (p) => g.aktuell().get(p)?.toString("utf8"),
    /** jemand anderes schreibt dazwischen (für den Test des Wiederholens) */
    dazwischen(p, inhalt) { const neu = new Map(g.aktuell()); neu.set(p, Buffer.from(inhalt)); const c = sha1(`commit ${commits.size}`); commits.set(c, baumAus(neu)); kopf = c; },
    async route(route) {
      const req = route.request(), u = new URL(req.url()), pfad = u.pathname.replace(/^\/repos\/[^/]+\/[^/]+/, ""), m = req.method();
      anfragen.push(`${m} ${pfad}`);
      const json = (status, body) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
      if (m === "GET" && pfad === "") return json(200, { full_name: "hansnoed-ui/ornament-cloud", permissions: { push: true } });
      if (m === "GET" && pfad.startsWith("/contents/")) {
        const datei = g.aktuell().get(decodeURIComponent(pfad.slice(10)));
        return datei ? route.fulfill({ status: 200, contentType: "text/plain", headers: { "access-control-allow-origin": "*" }, body: datei }) : json(404, { message: "Not Found" });
      }
      if (m === "GET" && pfad.startsWith("/git/ref/heads/")) return json(200, { object: { sha: kopf } });
      if (m === "GET" && pfad.startsWith("/git/commits/")) return json(200, { tree: { sha: commits.get(pfad.split("/").pop()) } });
      if (m === "GET" && pfad.startsWith("/git/trees/")) return json(200, { truncated: false, tree: [...baeume.get(pfad.split("/").pop())].map(([p, b]) => ({ path: p, type: "blob", sha: blobSha(b) })) });
      const body = req.postDataJSON?.() ?? null;
      if (m === "POST" && pfad === "/git/blobs") { const buf = Buffer.from(body.content, "base64"); const sha = blobSha(buf); blobs.set(sha, buf); return json(201, { sha }); }
      if (m === "POST" && pfad === "/git/trees") {
        const neu = new Map(baeume.get(body.base_tree));
        for (const t of body.tree) {
          if (t.sha === null) { if (!neu.delete(t.path)) return json(422, { message: `path ${t.path} does not exist` }); }
          else neu.set(t.path, t.content !== undefined ? Buffer.from(t.content, "utf8") : blobs.get(t.sha));
        }
        return json(201, { sha: baumAus(neu) });
      }
      if (m === "POST" && pfad === "/git/commits") { const c = sha1(`commit ${commits.size}`); commits.set(c, body.tree); g.letzteNachricht = body.message; g.eltern = body.parents; return json(201, { sha: c }); }
      if (m === "PATCH" && pfad.startsWith("/git/refs/heads/")) {
        if (g.eltern[0] !== kopf) return json(422, { message: "Update is not a fast forward" });
        kopf = body.sha;
        return json(200, { object: { sha: body.sha } });
      }
      return json(404, { message: `nicht nachgebildet: ${m} ${pfad}` });
    },
  };
  return g;
}

/** Claude als Datenstrom (Server-Sent Events), mit einer festen Antwort */
function claudeNachbau(antworten) {
  const anfragen = [];
  return {
    anfragen,
    async route(route) {
      const req = route.request();
      if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST" } });
      const body = req.postDataJSON();
      anfragen.push({ body, headers: req.headers(), url: req.url() });
      const a = antworten[Math.min(anfragen.length - 1, antworten.length - 1)];
      if (a.status) return route.fulfill({ status: a.status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: a.nachricht } }) });
      const text = JSON.stringify(a.ergebnis);
      const ev = (name, data) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
      const sse = ev("message_start", { type: "message_start", message: { id: "msg_test", type: "message", role: "assistant", model: body.model, content: [], stop_reason: null, usage: { input_tokens: 2400, output_tokens: 1 } } })
        + ev("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } })
        + ev("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: text.slice(0, 40) } })
        + ev("content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: text.slice(40) } })
        + ev("content_block_stop", { type: "content_block_stop", index: 0 })
        + ev("message_delta", { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 900 } })
        + ev("message_stop", { type: "message_stop" });
      return route.fulfill({ status: 200, contentType: "text/event-stream", headers: { "access-control-allow-origin": "*" }, body: sse });
    },
  };
}

const ERGEBNIS = {
  plattform: "x",
  autor: { name: "Test Person", handle: "test_person", verifiziert: true },
  kontext: null,
  text: "Das ist ein Test <script>alert(1)</script> mit #Hashtag und @jemand.\nZweite Zeile.",
  text_abgeschnitten: false,
  sprache: "de",
  uebersetzung: null,
  veroeffentlicht: { angezeigt: "vor 2 Std.", iso: "2026-10-18T10:00:00Z", genauigkeit: "minute" },
  zitiert: null,
  kennzahlen: { antworten: 3, reposts: 1200, likes: 45000, ansichten: 1200000, lesezeichen: null, reaktionen: null, kommentare: null, teilungen: null },
  bereiche: [
    { art: "avatar", teil: 0, x: 0.04, y: 0.05, b: 0.12, h: 0.06, beschreibung: "" },
    { art: "bild", teil: 0, x: 0.04, y: 0.4, b: 0.9, h: 0.3, beschreibung: "Ein orangefarbenes Rechteck auf hellem Grund." },
    { art: "dritte", teil: 0, x: 0.04, y: 0.85, b: 0.5, h: 0.05, beschreibung: "" },
  ],
  titel: "Ein Test für die Redaktion",
  schlagworte: ["Archiv", "Test"],
  hinweise: null,
};

/** ein erfundenes Bildschirmfoto (PNG), im Browser gezeichnet */
async function bildschirmfoto() {
  const { ctx, page } = await seite(null);
  const b64 = await page.evaluate(() => {
    const c = document.createElement("canvas"); c.width = 600; c.height = 1000; const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, 600, 1000); g.fillStyle = "#2f4858"; g.beginPath(); g.arc(60, 80, 35, 0, 7); g.fill();
    g.fillStyle = "#111"; g.font = "bold 26px sans-serif"; g.fillText("Test Person", 110, 75); g.font = "22px sans-serif"; g.fillText("@test_person", 110, 105);
    g.fillText("Das ist ein Test mit #Hashtag und @jemand.", 30, 200); g.fillStyle = "#c2410c"; g.fillRect(30, 400, 540, 300);
    g.fillStyle = "#555"; g.fillText("Antwort von Dritte Person", 30, 870);
    return c.toDataURL("image/png").split(",")[1];
  });
  await ctx.close();
  return Buffer.from(b64, "base64");
}

async function redaktion(gh, claude) {
  const s = await seite(null);
  await s.ctx.addInitScript(() => { sessionStorage.setItem("sm-redaktion:einstellungen", JSON.stringify({ github: "github_pat_test", anthropic: "sk-ant-test", repo: "hansnoed-ui/ornament-cloud", zweig: "main" })); });
  await s.ctx.route("https://api.github.com/**", (r) => gh.route(r));
  await s.ctx.route("https://api.anthropic.com/**", (r) => claude.route(r));
  // «online»: die Website liefert die Daten aus dem nachgebildeten Repository
  await s.ctx.route("**/social-media/daten/eintraege.json*", (r) => r.fulfill({ status: 200, contentType: "application/json", body: gh.text("social-media/daten/eintraege.json") ?? '{"eintraege":[]}' }));
  await s.ctx.route("**/social-media/medien/**", (r) => { const p = new URL(r.request().url()).pathname.slice(1), b = gh.aktuell().get(p); return b ? r.fulfill({ status: 200, body: b }) : r.fulfill({ status: 404 }); });
  await s.page.goto(`${REPO}/social-media/redaktion/`);
  await s.page.waitForSelector("body.rd-bereit");
  return s;
}
const anfangsdateien = () => new Map([
  ["social-media/daten/eintraege.json", Buffer.from('{\n  "version": 1,\n  "eintraege": []\n}\n')],
  ["sitemap.xml", readFileSync(join(ROOT, "sitemap.xml"))],
  ["social-media/index.html", readFileSync(join(ROOT, "social-media/index.html"))],
  ["social-media/medien/LIESMICH.md", readFileSync(join(ROOT, "social-media/medien/LIESMICH.md"))],
  ["index.html", readFileSync(join(ROOT, "index.html"))],
]);

let ghNachVeroeffentlichen = null;
await check("Redaktion: Bildschirmfoto einfügen, Claude liest, Bereiche, Kommentar, veröffentlichen – ein Commit mit Medien, Daten, Seiten und Sitemap; die Seiten gleichen denen aus Node", async () => {
  const gh = githubNachbau(anfangsdateien()), claude = claudeNachbau([{ ergebnis: ERGEBNIS }]);
  const { ctx, page, fehler } = await redaktion(gh, claude);
  assert.equal(await page.locator("#einstellungen").evaluate((d) => d.open), false, "mit Schlüssel bleiben die Einstellungen zu");
  await page.locator("#f-quelle").fill("https://x.com/test_person/status/1979512345678901248");
  assert.match(await page.locator("#quelle-info").textContent(), /X, @test_person, veröffentlicht/);
  await page.locator("#dateien").setInputFiles({ name: "bildschirmfoto.png", mimeType: "image/png", buffer: await bildschirmfoto() });
  await page.waitForSelector("#schritt-beleg:not([hidden])");
  await page.locator("#lesen").click();
  await page.waitForFunction(() => /Gelesen/.test(document.querySelector("#lesen-meldung").textContent));
  // was Claude bekam
  const a = claude.anfragen[0];
  assert.equal(a.body.model, "claude-opus-5-5");
  assert.deepEqual(a.body.thinking, { type: "adaptive" });
  assert.equal(a.body.output_config.format.type, "json_schema");
  assert.equal(a.body.output_config.effort, "medium");
  assert.equal(a.body.fallbacks, "default");
  assert.match(a.headers["anthropic-beta"] ?? "", /server-side-fallback-2026-07-01/);
  assert.equal(a.headers["anthropic-dangerous-direct-browser-access"], "true");
  assert.equal(a.body.messages[0].content[0].type, "image");
  assert.match(a.body.messages[0].content.at(-1).text, /Aus der Adresse gelesen .*Handle test_person, veröffentlicht 2025-10-18T/);
  // was im Formular steht
  assert.equal(await page.locator("#f-name").inputValue(), "Test Person");
  assert.equal(await page.locator("#f-handle").inputValue(), "test_person");
  assert.equal(await page.locator('input[name="plattform"][value="x"]').isChecked(), true);
  assert.match(await page.locator("#f-text").inputValue(), /^Das ist ein Test <script>/);
  assert.match(await page.locator("#f-veroeffentlicht").inputValue(), /^2025-10-18 \d\d:\d\d$/, "die Zeit aus der Adresse geht vor");
  assert.equal(await page.locator("#f-profil").inputValue(), "https://x.com/test_person");
  assert.equal(await page.locator(".rd-bereich").count(), 3);
  assert.equal(await page.locator('[data-zahl="likes"]').inputValue(), "45000");
  assert.deepEqual(await page.locator(".rd-marke").allInnerTexts().then((t) => t.map((x) => x.replace("×", "").trim())), ["Archiv", "Test"]);
  // ein Bereich von Hand dazu: ziehen
  await page.locator('input[name="werkzeug"][value="dritte"]').check();
  const box = await page.locator("#leinwand").boundingBox();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.25, { steps: 4 });
  await page.mouse.up();
  assert.equal(await page.locator(".rd-bereich--dritte").count(), 2);
  await page.locator("#f-kommentar").fill("Ein *Kommentar* der Redaktion.");
  await page.setViewportSize({ width: 390, height: 844 });            // auch auf dem Handy: nichts ragt über den Rand
  const breit = await page.evaluate(() => [...document.querySelectorAll("main *")].filter((x) => x.getClientRects().length && x.getBoundingClientRect().right > innerWidth + 0.5).map((x) => `${x.tagName}.${x.className}`));
  assert.deepEqual(breit.slice(0, 5), [], "Redaktion auf dem Handy: seitliches Wischen");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.locator("#f-schlagwort").fill("archiv");
  await page.keyboard.press("Enter");
  assert.equal(await page.locator(".rd-marke").count(), 2, "«archiv» ist dasselbe wie «Archiv»");
  // Vorschau: der Text ist entschärft, Kommentar und Titel stehen
  await page.waitForFunction(() => document.querySelector("#vorschau .zettel-titel")?.textContent === "Ein Test für die Redaktion");
  assert.equal(await page.locator("#vorschau script").count(), 0);
  assert.match(await page.locator("#vorschau .beitrag-text").innerText(), /<script>alert\(1\)<\/script>/);
  // veröffentlichen
  await page.locator("#veroeffentlichen").click();
  await page.waitForFunction(() => /Online: Zettel 1 öffnen/.test(document.querySelector("#fortschritt").textContent), null, { timeout: 30000 });
  const daten = JSON.parse(gh.text("social-media/daten/eintraege.json"));
  assert.equal(daten.eintraege.length, 1);
  const e = daten.eintraege[0];
  assert.equal(e.id, "1-ein-test-fuer-die-redaktion");
  assert.equal(e.veroeffentlichtQuelle, "adresse");
  assert.equal(e.kommentar, "Ein *Kommentar* der Redaktion.");
  assert.equal(e.beleg.geschwaerzt, true);
  assert.match(e.beleg.sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(e.medien.map((m) => [m.typ, m.datei, m.alt]), [["bild", "medien/1/bild-1.webp", "Ein orangefarbenes Rechteck auf hellem Grund."]]);
  assert.equal(e.autor.avatar, "medien/1/avatar.webp");
  for (const p of ["beleg.webp", "bild-1.webp", "avatar.webp", "karte.jpg"]) assert.ok(gh.aktuell().get(`social-media/medien/1/${p}`)?.length > 200, p);
  const karte = gh.aktuell().get("social-media/medien/1/karte.jpg");
  assert.equal(karte[0], 0xff, "Vorschaukarte ist ein JPEG");
  // die Seiten aus dem Browser gleichen denen aus Node
  for (const [p, inhalt] of alleSeiten(daten)) assert.equal(gh.text(p), inhalt, `${p}: im Browser anders als in Node`);
  assert.match(gh.text("sitemap.xml"), /<loc>https:\/\/ornament\.cloud\/social-media\/1-ein-test-fuer-die-redaktion\/<\/loc>/);
  assert.equal(gh.text("index.html"), readFileSync(join(ROOT, "index.html"), "utf8"), "sonst nichts angefasst");
  assert.match(gh.letzteNachricht, /^Social Media: Zettel 1 – Ein Test für die Redaktion/);
  assert.equal(gh.anfragen.filter((x) => x.startsWith("PATCH")).length, 1, "genau ein Commit");
  // danach ist der Entwurf leer
  assert.equal(await page.locator("#f-text").inputValue(), "");
  assert.deepEqual(fehler, []);
  ghNachVeroeffentlichen = gh;
  await ctx.close();
});

await check("Redaktion: lehnt die API den Fallback-Parameter ab, fragt sie ohne; ist der Zweig inzwischen weiter, baut sie den Commit neu", async () => {
  const gh = githubNachbau(anfangsdateien());
  const claude = claudeNachbau([{ status: 400, nachricht: "fallbacks: Extra inputs are not permitted" }, { ergebnis: ERGEBNIS }]);
  const { ctx, page, fehler } = await redaktion(gh, claude);
  await page.locator("#dateien").setInputFiles({ name: "b.png", mimeType: "image/png", buffer: await bildschirmfoto() });
  await page.locator("#lesen").click();
  await page.waitForFunction(() => /Gelesen/.test(document.querySelector("#lesen-meldung").textContent));
  assert.equal(claude.anfragen.length, 2);
  assert.equal(claude.anfragen[1].body.fallbacks, undefined);
  assert.equal(claude.anfragen[1].body.output_config.format.type, "json_schema");
  // jemand anderes veröffentlicht dazwischen: beim ersten Commit-Versuch ist der Zweig weiter
  let einmal = true;
  await ctx.route("https://api.github.com/**", async (r) => {
    if (einmal && r.request().method() === "POST" && r.request().url().endsWith("/git/commits")) { einmal = false; gh.dazwischen("README.md", "von anderswo"); }
    return gh.route(r);
  });
  await page.locator("#veroeffentlichen").click();
  await page.waitForFunction(() => /Online/.test(document.querySelector("#fortschritt").textContent), null, { timeout: 30000 });
  assert.match(await page.locator("#fortschritt").textContent(), /inzwischen verändert/);
  assert.equal(gh.text("README.md"), "von anderswo", "die fremde Änderung bleibt");
  assert.equal(JSON.parse(gh.text("social-media/daten/eintraege.json")).eintraege.length, 1);
  assert.deepEqual(fehler.filter((f) => !/status of (400|422)/.test(f)), [], "nur die absichtlichen Absagen der Dienste");
  await ctx.close();
});

await check("Redaktion: Zettel bearbeiten (Kommentar, Schlagwort, Status) und löschen – Seite und Medien verschwinden mit", async () => {
  const gh = ghNachVeroeffentlichen;
  assert.ok(gh, "braucht den veröffentlichten Zettel aus dem Test davor");
  const claude = claudeNachbau([{ ergebnis: ERGEBNIS }]);
  const { ctx, page, fehler } = await redaktion(gh, claude);
  await page.locator("#reiter-alle").click();
  await page.locator('[data-bearbeiten="1-ein-test-fuer-die-redaktion"]').click();
  await page.waitForFunction(() => /Zettel 1/.test(document.querySelector("#bearbeiten-hinweis").textContent));
  assert.equal(await page.locator("#f-kommentar").inputValue(), "Ein *Kommentar* der Redaktion.");
  await page.locator("#f-kommentar").fill("Neu kommentiert.");
  await page.locator("#f-status").selectOption("geloescht");
  await page.locator("#f-geprueft").fill("2026-10-19");
  await page.locator("#veroeffentlichen").click();
  await page.waitForFunction(() => /Online/.test(document.querySelector("#fortschritt").textContent), null, { timeout: 30000 });
  const e = JSON.parse(gh.text("social-media/daten/eintraege.json")).eintraege[0];
  assert.equal(e.kommentar, "Neu kommentiert.");
  assert.equal(e.status, "geloescht");
  assert.equal(e.beleg.datei, "medien/1/beleg.webp", "die Medien bleiben, wo sie sind");
  assert.match(gh.text("social-media/1-ein-test-fuer-die-redaktion/index.html"), /Das Original ist nicht mehr online \(festgestellt am 19\. Oktober 2026\)/);
  // löschen
  page.on("dialog", (d) => d.accept());
  await page.locator("#reiter-alle").click();
  await page.locator('[data-loeschen="1-ein-test-fuer-die-redaktion"]').click();
  await page.waitForFunction(() => /ist gelöscht/.test(document.querySelector("#alle-meldung").textContent));
  assert.equal(JSON.parse(gh.text("social-media/daten/eintraege.json")).eintraege.length, 0);
  assert.equal(gh.aktuell().has("social-media/1-ein-test-fuer-die-redaktion/index.html"), false);
  assert.equal([...gh.aktuell().keys()].filter((p) => p.startsWith("social-media/medien/1/")).length, 0);
  assert.ok(gh.aktuell().has("social-media/medien/LIESMICH.md"));
  assert.ok(!gh.text("sitemap.xml").includes("1-ein-test"));
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Redaktion: die Einstellungen bleiben offen, während man Schlüssel einträgt (Rückmeldung vom 19. Oktober 2026: «klappt sofort wieder ein»)", async () => {
  const { ctx, page, fehler } = await seite(`${REPO}/social-media/redaktion/`);
  await page.waitForSelector("body.rd-bereit");
  assert.equal(await page.locator("#einstellungen").evaluate((d) => d.open), true, "ohne Schlüssel offen");
  await page.locator("#gh-schluessel").fill("github_pat_neu");
  await page.locator("#an-schluessel").click();                // verlässt das Feld: change
  assert.equal(await page.locator("#einstellungen").evaluate((d) => d.open), true, "nach dem GitHub-Schlüssel noch offen");
  await page.locator("#an-schluessel").fill("sk-ant-neu");
  await page.locator("#merken").check();
  assert.equal(await page.locator("#einstellungen").evaluate((d) => d.open), true, "nach dem Anthropic-Schlüssel noch offen");
  assert.match(await page.locator("#zustand").textContent(), /GitHub bereit, Claude bereit/);
  await page.reload();
  await page.waitForSelector("body.rd-bereit");
  assert.equal(await page.locator("#einstellungen").evaluate((d) => d.open), false, "mit Schlüssel beim nächsten Öffnen zu");
  assert.equal(await page.locator("#an-schluessel").inputValue(), "sk-ant-neu", "gemerkt");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await check("Redaktion: der Entwurf übersteht das Neuladen (IndexedDB), ohne GitHub-Schlüssel kein Veröffentlichen, die Seite trägt CSP und noindex", async () => {
  const gh = githubNachbau(anfangsdateien()), claude = claudeNachbau([{ ergebnis: ERGEBNIS }]);
  const { ctx, page, fehler } = await redaktion(gh, claude);
  await page.locator("#f-text").fill("Entwurf, der bleibt.");
  await page.waitForFunction(() => /Entwurf gesichert/.test(document.querySelector("#entwurf-stand").textContent));
  await page.reload();
  await page.waitForSelector("body.rd-bereit");
  assert.equal(await page.locator("#f-text").inputValue(), "Entwurf, der bleibt.");
  await page.locator("#einstellungen summary").click();
  await page.locator("#vergessen").click();
  assert.equal(await page.locator("#veroeffentlichen").isDisabled(), true);
  assert.match(await page.locator("#fehler").textContent(), /GitHub-Schlüssel/);
  const html = readFileSync(join(ROOT, "social-media/redaktion/index.html"), "utf8");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /Content-Security-Policy" content="default-src 'self'; script-src 'self';[^"]*connect-src 'self' https:\/\/api\.github\.com https:\/\/api\.anthropic\.com/);
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await browser.close();
sRepo.close(); sVorschau.close();
rmSync(VORSCHAU, { recursive: true, force: true });
const fails = ergebnisse.filter((x) => !x).length;
console.log(`\n${ergebnisse.length - fails} von ${ergebnisse.length} bestanden`);
process.exit(fails ? 1 : 0);
