// Hörseite der EP «directer» im Browser (Chromium, Pixel 7): direkte Navigation, alle vier Trackmarken, Play/Pause, Media Session,
// Aktualisieren beim Zurückkehren, verständlicher Hinweis bei fehlender Audiodatei, keine Seite breiter als der Bildschirm.
// Die Test-WAV (vier Töne) entsteht im Test; die echte EP liegt nicht im Repository.
//   NODE_PATH=$(npm root -g) node tests/ep-directer.e2e.mjs
import assert from "node:assert/strict";
import { cpSync, mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const { chromium, devices } = createRequire(import.meta.url)("playwright");
const root = fileURLToPath(new URL("../", import.meta.url));
const { wavKopf } = await import(new URL("../tools/ep-wav.mjs", import.meta.url).href);
const { startServer } = await import(new URL("../tools/ep-server.mjs", import.meta.url).href);

const RATE = 44100, LAENGEN = [2, 2.5, 3, 1.5], FREQ = [220, 330, 440, 550];
const dir = mkdtempSync(join(tmpdir(), "ep-e2e-")), seite = join(dir, "listen/directer");
cpSync(join(root, "listen/directer"), seite, { recursive: true, filter: (p) => !p.includes("/audio") });
mkdirSync(join(seite, "audio"));
const frames = LAENGEN.map((s) => Math.round(s * RATE)), gesamt = frames.reduce((a, b) => a + b, 0);
const pcm = Buffer.alloc(gesamt * 4);
let o = 0;
frames.forEach((n, k) => { for (let i = 0; i < n; i++, o++) { const v = Math.round(8000 * Math.sin((2 * Math.PI * FREQ[k] * i) / RATE)); pcm.writeInt16LE(v, o * 4); pcm.writeInt16LE(v, o * 4 + 2); } });
writeFileSync(join(seite, "audio/the-i-directer.wav"), Buffer.concat([wavKopf(gesamt), pcm]));
const ep = JSON.parse(readFileSync(join(seite, "ep.json"), "utf8"));
let summe = 0;
ep.tracks.forEach((t, i) => { t.startSample = summe; t.samples = frames[i]; summe += frames[i]; });
writeFileSync(join(seite, "ep.json"), JSON.stringify(ep));
const starts = ep.tracks.map((t) => t.startSample / RATE);

const server = await startServer(0, dir), url = `http://localhost:${server.address().port}/listen/directer/`;
const browser = await chromium.launch();
let fehler = 0;
const pruefe = async (name, f) => { try { await f(); console.log(`ok   ${name}`); } catch (e) { fehler++; console.log(`FEHLER ${name}\n  ${e.message}`); } };

try {
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  const p = await ctx.newPage();
  const konsole = [];
  p.on("pageerror", (e) => konsole.push(e.message));

  await pruefe("Navigation direkt zur Hörseite, auch ohne Schrägstrich", async () => {
    const r = await p.goto(url.slice(0, -1));
    assert.equal(r.status(), 200);
    assert.equal(new URL(p.url()).pathname, "/listen/directer/");
    await p.waitForFunction(() => document.querySelector("#regler").max !== "0", null, { timeout: 10000 });
    assert.equal(await p.title(), "the i – directer");
    assert.equal(await p.locator("audio").count(), 1);
    assert.equal(await p.getAttribute("audio", "preload"), "metadata");
    assert.equal(await p.locator(".track").count(), 4);
    assert.equal(await p.locator(".marken span").count(), 3, "drei Striche an den Trackgrenzen");
    assert.equal(await p.evaluate(() => __ep.audio.paused), true, "spielt erst nach dem Tipp");
  });

  await pruefe("Telefonbreite: nichts breiter als der Bildschirm", async () => {
    assert.deepEqual(await p.evaluate(() => [innerWidth, document.documentElement.scrollWidth]), [412, 412]);
  });

  await pruefe("Play startet Track 1, Media Session kennt Titel, EP und Cover", async () => {
    await p.click("#play");
    await p.waitForFunction(() => !__ep.audio.paused && __ep.audio.currentTime > 0.1);
    const ms = await p.evaluate(() => ({ t: navigator.mediaSession.metadata.title, a: navigator.mediaSession.metadata.artist, al: navigator.mediaSession.metadata.album, art: navigator.mediaSession.metadata.artwork.map((x) => x.src), st: navigator.mediaSession.playbackState }));
    assert.equal(ms.t, ep.tracks[0].titel); assert.equal(ms.a, ep.anzeigename); assert.equal(ms.al, ep.titel); assert.equal(ms.st, "playing");
    assert.ok(ms.art.some((s) => s.endsWith(ep.cover)), "Cover am Sperrbildschirm");
    assert.equal(await p.getAttribute("#play", "aria-label"), "Pause");
  });

  for (const i of [3, 1, 2, 0]) await pruefe(`Trackmarke ${i + 1}: Tipp springt zu ${starts[i]} s, dieselbe Datei bleibt geladen`, async () => {
    const src = await p.evaluate(() => __ep.audio.currentSrc);
    await p.click(`.track[data-track="${i}"]`);
    await p.waitForFunction((s) => __ep.audio.currentTime >= s && __ep.audio.currentTime < s + 0.6 && !__ep.audio.seeking, starts[i]);
    assert.equal(await p.evaluate(() => __ep.audio.currentSrc), src);
    assert.equal(await p.getAttribute(".track[aria-current]", "data-track"), String(i));
    assert.equal(await p.evaluate(() => navigator.mediaSession.metadata.title), ep.tracks[i].titel);
  });

  await pruefe("Durchgehend: Track 1 läuft ohne Zutun in Track 2 hinüber, Anzeige folgt", async () => {
    await p.evaluate((s) => { __ep.audio.currentTime = s - 0.3; }, starts[1]);
    await p.waitForFunction((s) => __ep.audio.currentTime > s + 0.2, starts[1], { timeout: 5000 });
    assert.equal(await p.getAttribute(".track[aria-current]", "data-track"), "1");
    assert.equal(await p.evaluate(() => navigator.mediaSession.metadata.title), ep.tracks[1].titel);
  });

  await pruefe("Pause und wieder Play", async () => {
    await p.click("#play");
    await p.waitForFunction(() => __ep.audio.paused && document.querySelector("#play").getAttribute("aria-label") === "Abspielen");   // nach dem pause-Ereignis
    assert.equal(await p.evaluate(() => navigator.mediaSession.playbackState), "paused");
    const t = await p.evaluate(() => __ep.audio.currentTime);
    await p.waitForTimeout(300);
    assert.equal(await p.evaluate(() => __ep.audio.currentTime), t, "steht");
    await p.click("#play");
    await p.waitForFunction((t) => !__ep.audio.paused && __ep.audio.currentTime > t, t);
  });

  await pruefe("Zurück auf der Seite: aktiver Track nach der tatsächlichen Position", async () => {
    // Anzeige veralten lassen (wie bei gedrosselter Seite im Hintergrund), dann Rückkehr melden
    await p.evaluate((s) => { __ep.audio.pause(); document.querySelector(".track[aria-current]").removeAttribute("aria-current"); }, starts[3]);
    await p.evaluate((s) => new Promise((ok) => { __ep.audio.addEventListener("seeked", ok, { once: true }); __ep.audio.currentTime = s + 0.4; }), starts[3]);
    await p.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    assert.equal(await p.getAttribute(".track[aria-current]", "data-track"), "3");
  });

  await pruefe("Fortschrittsregler springt in der EP", async () => {
    await p.evaluate((s) => { const r = document.querySelector("#regler"); r.value = String(s + 0.5); r.dispatchEvent(new Event("input")); r.dispatchEvent(new Event("change")); }, starts[2]);
    await p.waitForFunction((s) => Math.abs(__ep.audio.currentTime - (s + 0.5)) < 0.2, starts[2]);
    assert.equal(await p.getAttribute(".track[aria-current]", "data-track"), "2");
  });

  await pruefe("Keine Fehler im Browser", async () => assert.deepEqual(konsole, []));

  await pruefe("Fehlt die Audiodatei, steht ein verständlicher Hinweis da", async () => {
    unlinkSync(join(seite, "audio/the-i-directer.wav"));
    const q = await ctx.newPage();
    await q.goto(url);
    await q.waitForSelector("#hinweis:not([hidden])", { timeout: 10000 });
    assert.match(await q.textContent("#hinweis"), /Audiodatei fehlt oder kann nicht geladen werden/);
    assert.equal(await q.isDisabled("#play"), true);
  });
} finally {
  await browser.close();
  server.close();
  rmSync(dir, { recursive: true, force: true });
}
if (fehler) { console.log(`\n${fehler} Fehler`); process.exit(1); }
console.log("\nalles in Ordnung");
