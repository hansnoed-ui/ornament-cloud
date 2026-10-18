// PHORMA III (alpha/phorma-iii/) – Browser-Tests (Playwright, Chromium, WebGL über SwiftShader): Gewebe aus Text mit Ton (verfrickelt, das Logo
// aus dem Gewebe, Video mit Tonspur), Video als Quelle, nur Ton, nur Musik geladen, die Irrfahrt, Foto in beiden Formaten exakt, keine Anfragen nach aussen,
// Handy ohne seitliches Scrollen. Mit ?test (gröbere Netze). Bis zum 18. Oktober 2026 Teil von tests/phorma-ii.e2e.mjs.
//   NODE_PATH=$(npm root -g) node tests/phorma-iii.e2e.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); } catch { playwright = require(join(process.env.NODE_PATH || "", "playwright")); }
const root = new URL("../", import.meta.url);
const { startServer } = await import(new URL("tools/serve-orma.mjs", root).href);
const { kisten } = await import(new URL("alpha/sketchory/mp4.js", root).href);
const server = await startServer(0);
const base = `http://localhost:${server.address().port}/alpha/phorma-iii/?test`;
const browser = await playwright.chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ergebnisse = [];
async function check(name, fn) {
  if (process.env.NUR && !name.includes(process.env.NUR)) return;      // NUR=Video: nur die Prüfungen mit diesem Wort
  try { await fn(); ergebnisse.push(true); console.log("ok  ", name); }
  catch (e) { ergebnisse.push(false); console.log("FAIL", name, "\n     ", e.message.split("\n").slice(0, 8).join("\n      ")); }
}
async function oeffne({ vorher = null, ...opts } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 }, acceptDownloads: true, ...opts });
  const page = await ctx.newPage();
  const fehler = [], fremd = [];
  page.on("pageerror", (e) => fehler.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") fehler.push(m.text()); });
  page.on("request", (r) => { const u = new URL(r.url()); if (!["localhost", "127.0.0.1"].includes(u.hostname) && u.protocol.startsWith("http")) fremd.push(r.url()); });
  if (vorher) await page.addInitScript(vorher);
  await page.goto(base);
  return { ctx, page, fehler, fremd };
}
// Testfoto, im Browser gezeichnet: Himmel, Sonne, eine rote Fläche, Wiese; quer (3 : 2)
const FOTO = await (async () => {
  const p = await (await browser.newContext()).newPage();
  const url = await p.evaluate(() => {
    const w = 1500, h = 1000, c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 0, h * 0.6); g.addColorStop(0, "#2f5fb0"); g.addColorStop(1, "#9cc2ee");
    x.fillStyle = g; x.fillRect(0, 0, w, h * 0.6);
    x.fillStyle = "#3c8a3a"; x.fillRect(0, h * 0.6, w, h * 0.4);
    for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(20,60,20,${(i % 7) / 14})`; x.fillRect((i * 7919) % w, h * 0.6 + ((i * 104729) % (h * 0.4)), 3, 9); }
    x.fillStyle = "#ffd23f"; x.beginPath(); x.arc(w * 0.5, h * 0.3, 140, 0, 7); x.fill();
    x.fillStyle = "#d0302a"; x.fillRect(w * 0.35, h * 0.62, w * 0.3, h * 0.25);
    return c.toDataURL("image/jpeg", 0.92);
  });
  await p.context().close();
  return Buffer.from(url.split(",")[1], "base64");
})();
const laden = (page) => page.setInputFiles("#datei", { name: "foto.jpg", mimeType: "image/jpeg", buffer: FOTO });
const bereit = (page) => page.waitForFunction(() => !document.getElementById("video").disabled && window.__phorma?.sz && window.__phorma?.buehne && window.__phorma.buehneFertig, null, { timeout: 180_000 });

/** ein Bild des Films zur Zeit t in halber Grösse: mittlere Helligkeit und ihre Streuung, Anteil Tinte (deutlich anders als das Papier: leer 0), Anteil fast schwarz, grösste Abweichung vom Foto, ein Fingerabdruck */
const messe = (page, t, { proben = 1 } = {}) => page.evaluate(async ([t, proben]) => {
  const { bild } = await import("./film.js?v=3");
  const S = window.__phorma; S.laeuft = false;
  const sz = { ...S.sz, buehne: S.buehne, beschriftung: false };   // die Szene der Seite (mit Ton, Text und Signet wie eingestellt)
  const w = S.mass[0] / 2, h = S.mass[1] / 2, c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
  x.setTransform(0.5, 0, 0, 0.5, 0, 0);
  bild(x, sz, t, { proben });
  const d = x.getImageData(0, 0, w, h).data;
  const f = document.createElement("canvas"); f.width = w; f.height = h; const fx = f.getContext("2d"); fx.drawImage(S.foto, 0, 0, w, h);
  const q = fx.getImageData(0, 0, w, h).data;
  let hell = 0, hell2 = 0, schwarz = 0, abw = 0, mittelAbw = 0, n = 0, abdruck = 0, tinte = 0;
  const L = new Float32Array(d.length / 4); for (let i = 0; i < d.length; i += 4) L[i / 4] = (d[i] + d[i + 1] + d[i + 2]) / 3;
  const median = Float32Array.from(L).sort()[L.length >> 1];
  for (const l of L) if (Math.abs(l - median) > 30) tinte++;
  for (let i = 0; i < d.length; i += 4) {
    const l = (d[i] + d[i + 1] + d[i + 2]) / 3; hell += l; hell2 += l * l; n++; if (l < 8) schwarz++;
    const a = Math.max(Math.abs(d[i] - q[i]), Math.abs(d[i + 1] - q[i + 1]), Math.abs(d[i + 2] - q[i + 2])); if (a > abw) abw = a; mittelAbw += a;
    abdruck = (abdruck * 31 + d[i] * 7 + d[i + 1] * 3 + d[i + 2]) >>> 0;
  }
  return { hell: hell / n, streu: Math.sqrt(Math.max(0, hell2 / n - (hell / n) ** 2)), tinte: tinte / n, schwarz: schwarz / n, abw, mittelAbw: mittelAbw / n, abdruck, dauer: sz.zeit.dauer, zeit: { teile: sz.zeit.teile.map((tl) => [tl.art, tl.von, tl.bis]), phasen: sz.zeit.phasen.map((p) => [p.art, p.name, p.von, p.bis]), abschnitt: sz.zeit.abschnitt, stehen: sz.zeit.ab.stehen } };
}, [t, proben]);

// Ersatz für den H.264-Encoder (SwiftShader hat keinen): liefert kleine Stücke und eine Beschreibung
const ERSATZ_ENCODER = () => {
  window.VideoEncoder = class {
    static async isConfigSupported(cfg) { return { supported: cfg.codec === "avc1.640028", config: cfg }; }
    constructor({ output }) { this.output = output; this.encodeQueueSize = 0; this.n = 0; }
    configure(cfg) { window.__cfg = cfg; }
    encode(frame, { keyFrame }) {
      const daten = new Uint8Array(16).fill(this.n & 255);
      this.output({ type: keyFrame ? "key" : "delta", timestamp: frame.timestamp, byteLength: 16, copyTo: (z) => z.set(daten) },
        this.n++ ? {} : { decoderConfig: { description: new Uint8Array([1, 0x64, 0, 0x28, 0xff, 0xe1, 0, 1, 0x67, 1, 0, 1, 0x68]).buffer } });
    }
    async flush() {}
    close() {}
  };
};

// eine kurze Tonspur (WAV, mono, 22,05 kHz): leises Summen und Schläge alle 1,5 s
const WAV = (() => {
  const rate = 22050, n = rate * 12, b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / rate, s = t % 1.5, schlag = t > 0.9 ? Math.exp(-s / 0.06) * (Math.sin(i * 0.03) + 0.5 * Math.sin(i * 1.1)) * 0.6 : 0;
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, 0.03 * Math.sin(i * 0.05) + schlag)) * 32000), 44 + i * 2);
  }
  return b;
})();

await check("Gewebe aus Text mit Ton: verfrickeln und neu würfeln, Ton aus; Zeichen, Bänder aus Linien, Fragmente bei den Einsätzen, am Ende exakt der Text; Video mit Tonspur", async () => {
  const { ctx, page, fehler, fremd } = await oeffne({ vorher: ERSATZ_ENCODER });
  assert.equal(await page.getAttribute('[data-quelle="foto"]', "aria-pressed"), "true", "zuerst ein Foto");
  await page.click('[data-quelle="text"]');
  assert.ok(await page.isVisible("#text") && !(await page.isVisible("#ablage")), "Textfeld statt Ablage");
  await page.fill("#text", "ki me");
  await bereit(page);
  await page.setInputFiles("#tondatei", { name: "schlaege.wav", mimeType: "audio/wav", buffer: WAV });
  await page.waitForFunction(() => window.__phorma.ton && window.__phorma.buehneFertig && window.__phorma.sz.fragmente.length, null, { timeout: 120_000 });
  await bereit(page);
  assert.match(await page.textContent("#ton-info"), /schlaege\.wav · 12,0 s · \d+ Einsätze/);
  // Verfrickeln: ein neues Stück, ein neuer Wurf ein anderes, das Gewebe folgt ihm; zurück zur Datei, wie sie ist
  await page.check("#frickeln");
  await page.waitForFunction(() => window.__phorma.ton?.name.includes("verfrickelt"), null, { timeout: 60_000 });
  assert.match(await page.textContent("#ton-info"), /schlaege\.wav · verfrickelt, Wurf \d+ · \d+ BPM, \d+ Takte aus \d+ Schnipseln · \d+,\d s/);
  assert.ok(await page.isVisible("#wuerfeln"));
  const erst = await page.evaluate(() => [window.__phorma.ton.name, window.__phorma.ton.analyse.einsaetze.length, window.__phorma.ton.buffer.numberOfChannels]);
  assert.equal(erst[2], 2, "verfrickelt in Stereo");
  await page.click("#wuerfeln");
  await page.waitForFunction((n) => window.__phorma.ton.name !== n, erst[0], { timeout: 60_000 });
  await page.uncheck("#frickeln");
  await page.waitForFunction(() => !window.__phorma.ton.name.includes("verfrickelt"), null, { timeout: 60_000 });
  assert.ok(await page.isHidden("#wuerfeln"));
  // ein- und gleich wieder ausschalten (Rückmeldung: «wenn ich das Verfrickeln ausschalte, kommt das immer noch verfrickelt»): das Original bleibt
  await page.evaluate(() => { const k = document.getElementById("frickeln"); k.click(); k.click(); });
  await page.waitForTimeout(3000);
  assert.deepEqual(await page.evaluate(() => [window.__phorma.ton.name.includes("verfrickelt"), document.getElementById("tonspur").src === window.__phorma.tonQuelle.url, window.__phorma.ton.buffer === window.__phorma.tonQuelle.buffer]), [false, true, true], "ausgeschaltet: das Original");
  // Ton an/aus: ohne Haken ist die Vorschau stumm
  await page.uncheck("#ton-im-video"); assert.equal(await page.evaluate(() => document.getElementById("tonspur").muted), true);
  await page.check("#ton-im-video"); assert.equal(await page.evaluate(() => document.getElementById("tonspur").muted), false);
  await page.waitForFunction(() => window.__phorma.buehneFertig && window.__phorma.sz.fragmente.length, null, { timeout: 120_000 });
  await bereit(page);
  const s = await page.evaluate(() => { const S = window.__phorma; return { phasen: S.sz.zeit.phasen.map((p) => [p.name, p.von, p.bis]), abschnitt: S.sz.zeit.abschnitt, dauer: S.sz.zeit.dauer, tonDauer: S.ton.analyse.dauer, einsaetze: S.ton.analyse.einsaetze.length, fragmente: S.sz.fragmente.length, schnitte: S.sz.schnitte }; });
  // mit Signet direkt vom Gewebe ins Logo (Rückmeldung: «der Weissraum einige Sekunden vor dem Logo ist unnötig»), danach nur 0,3 s Schluss
  assert.deepEqual(s.phasen.map((p) => p[0]), ["zeichen", "gewebe", "logo"]);
  assert.ok(Math.abs(s.dauer - s.abschnitt.bis - 0.3) < 1e-6, `nach dem Logo nur der Schluss (${s.dauer}, ${s.abschnitt.bis})`);
  assert.ok(Math.abs(s.dauer - Math.max(s.tonDauer, 10.7)) < 1e-6, `mit Ton: so lang wie die Musik, der Effekt mindestens 10 s (${s.dauer}, Ton ${s.tonDauer})`);
  assert.ok(s.einsaetze >= 6 && s.fragmente >= 2, `Einsätze ${s.einsaetze}, Fragmente ${s.fragmente}`);
  // das Logo verfrickelt sich im Takt (Wunsch: «eine verfrickelte Animation des Logos»): Störungen im Logo; mitten in einer anders als ohne; der
  // Schriftzug wird getippt und steht nach 2,6 s
  const logo = await page.evaluate(async () => {
    const { bild, logoZeichen } = await import("./film.js?v=3");
    const S = window.__phorma, sz = { ...S.sz, buehne: null, beschriftung: false }, L = sz.logo, e = L.plan.find((x) => x.art >= 0.2 && x.t < L.bis - 1);
    const zeichne = (z, t) => { const c = document.createElement("canvas"); c.width = 270; c.height = 338; const x = c.getContext("2d"); x.setTransform(0.25, 0, 0, 0.25, 0, 0); bild(x, z, t); return c.toDataURL(); };
    const t = e.t + e.dauer * 0.3;
    return { n: L.plan.length, gleich: zeichne(sz, t) === zeichne({ ...sz, logo: { ...L, plan: [] } }, t), nacht: typeof L.nacht, zeichen: [logoZeichen(L, L.von), logoZeichen(L, L.von + 1.2), logoZeichen(L, L.tipp)] };
  });
  assert.ok(logo.n >= 3 && !logo.gleich, `Logo verfrickelt (${JSON.stringify(logo)})`);
  assert.ok(logo.nacht === "boolean" && logo.zeichen[0] === 0 && logo.zeichen[1] > 0 && logo.zeichen[1] < 14 && logo.zeichen[2] === 14, `getippt (${logo.zeichen})`);
  // kaum leeres Papier: im Logo und im Schluss überall Linien und Schrift (Wunsch: «maximal kurz einen leeren Bildschirm zeigen»)
  const L = s.phasen[2];
  for (const t of [L[1] + 0.1, L[1] + 1.2, L[2] - 0.6, s.dauer - 0.05]) { const m = await messe(page, t); assert.ok(m.tinte > 0.001, `bei ${t.toFixed(2)} s nicht leer (Tinte ${m.tinte.toFixed(4)})`); }
  const G = s.phasen[1], zeichen = await messe(page, s.phasen[0][1] + 0.9), mitte = await messe(page, (G[1] + G[2]) / 2), mitte2 = await messe(page, (G[1] + G[2]) / 2 + 0.5);
  // ohne Signet wie bisher: am Ende das Bild, hier exakt der Text
  await page.uncheck("#unschaerfe"); await page.uncheck("#signet");
  await page.waitForFunction(() => window.__phorma.sz.zeit.phasen.at(-1).name === "bild" && window.__phorma.buehneSchluessel.endsWith("|false|"));
  await bereit(page);
  const ende = await messe(page, (await messe(page, 0)).zeit.abschnitt.bis + 1);
  assert.ok(zeichen.mittelAbw < 10 && mitte.mittelAbw > zeichen.mittelAbw, `zuerst steht der Text (${zeichen.mittelAbw.toFixed(2)}, später ${mitte.mittelAbw.toFixed(2)})`);
  assert.ok(mitte.hell > 150, `Papier mit Linien (${mitte.hell.toFixed(0)}, ${mitte.mittelAbw.toFixed(2)})`);
  assert.notEqual(mitte.abdruck, mitte2.abdruck, "die Bänder bewegen sich");
  assert.ok(ende.abw <= 2, `am Ende exakt der Text (${ende.abw})`);
  // Video mit Ton (Bild aus dem Ersatz-Encoder, Ton vom Browser)
  await page.click("#video");
  await page.waitForSelector("#ergebnis:not([hidden])", { timeout: 600_000 });
  await page.evaluate(() => { const gl = window.__phorma.buehne.canvas.getContext("webgl2"); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4)); });
  const info = await page.textContent("#film-info");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#laden")]);
  const d = new Uint8Array(readFileSync(await dl.path())), moov = kisten(d).find((k) => k.typ === "moov");
  const spuren = moov.kinder.filter((k) => k.typ === "trak");
  const art = (t) => { const h = t.kinder.find((k) => k.typ === "mdia").kinder.find((k) => k.typ === "hdlr"); return String.fromCharCode(...d.subarray(h.o + 16, h.o + 20)); };
  assert.deepEqual(spuren.map(art).sort(), ["soun", "vide"], `Bild und Ton im MP4 (${info})`);
  assert.match(info, /Ton (AAC|Opus)/);
  assert.deepEqual(fehler, []); assert.deepEqual(fremd, []);
  await ctx.close();
});

await check("Video als Quelle: Standbild, sein Ton als Tonspur, im Gewebe neue Linien aus dem Video ab den Schnitten", async () => {
  const { ctx, page, fehler, fremd } = await oeffne();
  // ein kurzes WebM (6 s) im Browser aufnehmen: Formen, die jede Sekunde wechseln, dazu Schläge
  const webm = await page.evaluate(async () => {
    const c = document.createElement("canvas"); c.width = 320; c.height = 240; const x = c.getContext("2d");
    const ac = new AudioContext(), ziel = ac.createMediaStreamDestination(), o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = 110; o.connect(g); g.connect(ziel); g.gain.value = 0; o.start();
    for (let k = 1; k < 6; k++) { g.gain.setValueAtTime(0.9, ac.currentTime + k); g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + k + 0.3); }
    const strom = new MediaStream([...c.captureStream(30).getVideoTracks(), ...ziel.stream.getAudioTracks()]);
    const rec = new MediaRecorder(strom, { mimeType: "video/webm" }), teile = [];
    rec.ondataavailable = (e) => teile.push(e.data);
    const t0 = performance.now();
    const malen = () => {
      const s = Math.floor((performance.now() - t0) / 1000);
      x.fillStyle = "#eee"; x.fillRect(0, 0, 320, 240); x.fillStyle = "#222";
      x.beginPath(); if (s % 2) x.arc(160, 120, 40 + 12 * s, 0, 7); else x.rect(60 + 10 * s, 50, 200 - 20 * s, 140); x.fill();
      if (performance.now() - t0 < 6000) requestAnimationFrame(malen);
    };
    malen(); rec.start(500);
    await new Promise((ok) => setTimeout(ok, 6000));
    rec.stop(); await new Promise((ok) => { rec.onstop = ok; }); ac.close();
    return Array.from(new Uint8Array(await new Blob(teile).arrayBuffer()));
  });
  await page.uncheck("#signet");                                         // ohne Logo: am Ende das Standbild
  await page.click('[data-quelle="video"]');
  assert.ok(await page.isVisible("#video-teil") && !(await page.isVisible("#ablage")), "Videoteil statt Ablage");
  await page.setInputFiles("#videodatei", { name: "probe.webm", mimeType: "video/webm", buffer: Buffer.from(webm) });
  await page.waitForFunction(() => window.__phorma.video && window.__phorma.A, null, { timeout: 60_000 });
  assert.match(await page.textContent("#video-info"), /probe\.webm · \d+,\d s · 320 × 240/);
  const ton = await page.evaluate(() => window.__phorma.ton?.name);
  assert.equal(ton, "Ton von probe.webm", "der Ton des Videos ist die Tonspur");
  await bereit(page);
  const s = await page.evaluate(() => { const S = window.__phorma; return { saetze: S.video.saetze?.liste.length ?? 0, schnitte: S.sz.schnitte, zaehler: S.buehne.zaehler ? null : null, quelle: S.quelle }; });
  assert.equal(s.quelle, "video");
  assert.ok(s.saetze >= 1, `Bilder aus dem Video (${s.saetze}), Schnitte ${s.schnitte}`);
  const vorher = await messe(page, s.schnitte[0] - 0.2), nachher = await messe(page, s.schnitte[0] + 0.6);
  assert.notEqual(vorher.abdruck, nachher.abdruck);
  const ende = await messe(page, (await page.evaluate(() => window.__phorma.sz.zeit.abschnitt.bis)) + 1);
  assert.ok(ende.abw <= 2, `am Ende exakt das Standbild (${ende.abw})`);
  assert.deepEqual(fehler, []); assert.deepEqual(fremd, []);
  await ctx.close();
});

await check("Nur Ton: gleich Flächen aus Schlaufen, bei kräftigen Einsätzen neue Bilder; am Ende das Logo, ohne Signet leeres Papier", async () => {
  const { ctx, page, fehler, fremd } = await oeffne();
  await page.click('[data-quelle="ton"]');
  assert.ok(await page.isVisible("#ton-teil") && !(await page.isVisible("#ablage")));
  await page.setInputFiles("#tondatei", { name: "schlaege.wav", mimeType: "audio/wav", buffer: WAV });
  await page.waitForFunction(() => window.__phorma.ton && window.__phorma.A, null, { timeout: 60_000 });
  await bereit(page);
  const s = await page.evaluate(() => { const S = window.__phorma; return { quelle: S.quelle, phasen: S.sz.zeit.phasen.map((p) => [p.name, p.von, p.bis]), bis: S.sz.zeit.abschnitt.bis, ein: S.ton.analyse.einsaetze.map((e) => e.t) }; });
  assert.equal(s.quelle, "ton");
  const G = s.phasen[1], start = await messe(page, 1.4);

  // ein Schlag mitten im Gewebe: kurz davor und kurz danach verschieden, das Bild dunkler (mehr Tinte beim Stoss)
  const e = s.ein.find((t) => t > G[1] + 1.5 && t < G[2] - 1.5);
  const vor = await messe(page, e - 0.1), nach = await messe(page, e + 0.12);
  assert.notEqual(vor.abdruck, nach.abdruck, "der Schlag bewegt das Gewebe");
  assert.ok(nach.mittelAbw > 0.3, `Punkte und Linien zu sehen (${nach.mittelAbw.toFixed(2)})`);
  // die Zustände wechseln: zu drei Zeiten im Abschnitt mindestens zwei verschiedene
  const zust = await page.evaluate(([a, b]) => [a + 1, (a + b) / 2, b - 1].map((t) => window.__phorma.buehne.zaehler(window.__phorma.sz.zeit, t).split(" · ")[0]), [G[1], G[2]]);
  assert.ok(new Set(zust).size >= 2, `neue Bilder (${zust})`);
  // mit Signet am Ende das Logo, das aus dem Gewebe entsteht
  assert.equal(s.phasen[2][0], "logo");
  const logo = await messe(page, s.phasen[2][2] - 0.3);
  assert.ok(logo.tinte > 0.001, `am Ende das Logo (Tinte ${logo.tinte.toFixed(4)})`);
  // ohne Signet: am Ende leeres Papier, schon im «Bild» kein Knäuel der ruhenden Schlaufen (Rückmeldung: «einzig die Form, die am Schluss gezeigt wird, stört»)
  await page.uncheck("#signet");
  await page.waitForFunction(() => window.__phorma.sz.zeit.phasen.at(-1).name === "bild" && window.__phorma.buehneSchluessel.endsWith("|false|"));
  await bereit(page);
  const z = (await messe(page, 0)).zeit, ende = await messe(page, z.abschnitt.bis + 1);
  assert.ok(ende.abw <= 2, `am Ende leeres Papier (${ende.abw})`);
  assert.ok(start.tinte > 0.001 && ende.tinte < 0.0005, `gleich von Anfang an Flächen, kein leeres Papier (Tinte ${start.tinte.toFixed(4)}, leer ${ende.tinte.toFixed(4)})`);
  const B = z.phasen[2].slice(2), bild = await messe(page, (B[0] + B[1]) / 2);
  assert.ok(bild.abw < 40, `im Bild leeres Papier, nur Korn und Vignette (grösste Abweichung ${bild.abw})`);
  assert.deepEqual(fehler, []); assert.deepEqual(fremd, []);
  await ctx.close();
});

await check("Nur Musik geladen, kein Bild: «Nur Ton» wird gewählt und die Vorschau läuft", async () => {
  const { ctx, page, fehler } = await oeffne();
  await page.setInputFiles("#tondatei", { name: "schlaege.wav", mimeType: "audio/wav", buffer: WAV });
  await bereit(page);
  const s = await page.evaluate(() => ({ quelle: window.__phorma.quelle, ton: window.__phorma.ton?.name }));
  assert.deepEqual(s, { quelle: "ton", ton: "schlaege.wav" });
  assert.equal(await page.getAttribute('[data-quelle="ton"]', "aria-pressed"), "true");
  // der Ton läuft mit der Vorschau (Rückmeldung: «der Ton wird nicht abgespielt während der Animation» – die Vorschau lief schon, als die Musik kam)
  await page.mouse.click(5, 5);                                                   // einmal getippt: der Browser darf Ton spielen
  await page.waitForTimeout(1500);
  const lauf = await page.evaluate(() => { const a = document.getElementById("tonspur"), S = window.__phorma; return { laeuft: S.laeuft, pausiert: a.paused, ton: a.currentTime, bild: S.t }; });
  assert.ok(lauf.laeuft && !lauf.pausiert, `Vorschau und Ton laufen (${JSON.stringify(lauf)})`);
  assert.ok(Math.abs(lauf.ton - lauf.bild) < 0.6, `Ton und Bild zusammen (${lauf.ton.toFixed(2)} / ${lauf.bild.toFixed(2)} s)`);
  // die Seite neu öffnen (Rückmeldung vom 18. Oktober 2026: «Cannot access 'tiefeKnoepfe' before initialization» – «Nur Ton» war gemerkt und
  // lud das Papier, bevor alle Knöpfe standen): sie startet mit «Nur Ton», ohne Fehler
  await page.reload();
  await bereit(page);
  assert.equal(await page.evaluate(() => window.__phorma.quelle), "ton");
  assert.ok(!/before initialization|is not defined/.test(await page.textContent("#startfehler")), "kein Fehler beim Start");
  assert.deepEqual(fehler, []);
  await ctx.close();
});


await check("Irrfahrt: als Effekt wählbar und gemerkt; schwarz, beim Schlag heller und anders, am Ende das Logo; ohne Signet die Stille, dann hält das letzte Bild", async () => {
  const { ctx, page, fehler, fremd } = await oeffne();
  await page.click('[data-wahl="irrfahrt"]');
  assert.equal(await page.getAttribute('[data-wahl="irrfahrt"]', "aria-pressed"), "true");
  await page.click('[data-quelle="ton"]');
  await page.setInputFiles("#tondatei", { name: "schlaege.wav", mimeType: "audio/wav", buffer: WAV });
  await page.waitForFunction(() => window.__phorma.ton && window.__phorma.A, null, { timeout: 60_000 });
  await bereit(page);
  const s = await page.evaluate(() => { const S = window.__phorma; return { ablauf: S.ablauf, phasen: S.sz.zeit.phasen.map((p) => [p.name, p.von, p.bis]), dauer: S.sz.zeit.dauer, bis: S.sz.zeit.abschnitt.bis, ein: S.ton.analyse.einsaetze.map((e) => e.t), knoepfe: [...document.querySelectorAll(".phasen button")].map((b) => b.textContent) }; });
  assert.equal(s.ablauf, "irrfahrt");
  assert.deepEqual(s.phasen.map((p) => p[0]), ["wuerfel", "irrfahrt", "logo"]);
  assert.deepEqual(s.knoepfe, ["01 Würfel", "02 Irrfahrt", "03 Logo"]);
  assert.ok(Math.abs(s.dauer - s.bis - 0.3) < 1e-6, "nach dem Logo nur der Schluss");
  const G = s.phasen[1], e = s.ein.find((t) => t > G[1] + 1.5 && t < G[2] - 1.5);
  const vor = await messe(page, e - 0.25), schlag = await messe(page, e + 0.06);
  assert.ok(vor.hell < 60 && vor.schwarz > 0.3, `schwarz (${vor.hell.toFixed(1)}, ${vor.schwarz.toFixed(2)})`);
  assert.ok(vor.tinte > 0.0005, `der Faden ist zu sehen (${vor.tinte.toFixed(4)})`);
  assert.ok(schlag.hell > vor.hell && schlag.abdruck !== vor.abdruck, `beim Schlag heller (${vor.hell.toFixed(1)} → ${schlag.hell.toFixed(1)})`);
  const logo = await messe(page, s.phasen[2][2] - 0.3);
  assert.ok(logo.tinte > 0.001, `am Ende das Logo (${logo.tinte.toFixed(4)})`);
  // ohne Signet: die Stille, danach hält das letzte Bild (kein Stehen auf dem Papier)
  await page.uncheck("#signet");
  await page.waitForFunction(() => window.__phorma.sz.zeit.phasen.at(-1).name === "stille" && window.__phorma.buehneSchluessel.endsWith("|false|"));
  await bereit(page);
  const z = (await messe(page, 0)).zeit, a = await messe(page, z.abschnitt.bis + 0.05), b = await messe(page, z.abschnitt.bis + 0.25);
  assert.equal(z.stehen, undefined);
  assert.equal(a.abdruck, b.abdruck, "das letzte Bild hält");
  assert.ok(a.hell < 60, `auch am Schluss schwarz (${a.hell.toFixed(1)})`);
  // die Wahl bleibt
  await page.reload(); await bereit(page);
  assert.equal(await page.evaluate(() => window.__phorma.ablauf), "irrfahrt");
  assert.deepEqual(fehler, []); assert.deepEqual(fremd, []);
  await ctx.close();
});

await check("Foto als Quelle, Format 9 : 16 und zurück: ohne Logo steht am Ende das Foto exakt; mit Logo am Ende das Logo", async () => {
  const { ctx, page, fehler, fremd } = await oeffne();
  await laden(page); await bereit(page);
  assert.equal(await page.evaluate(() => window.__phorma.sz.zeit.phasen.at(-1).name), "logo");
  await page.uncheck("#signet");
  await page.waitForFunction(() => window.__phorma.sz.zeit.phasen.at(-1).name === "bild");
  for (const [format, mass] of [["9:16", [1080, 1920]], ["4:5", [1080, 1350]]]) {
    await page.click(`[data-format="${format}"]`);
    await page.waitForFunction((m) => window.__phorma.sz?.breite === m[0] && window.__phorma.sz?.hoehe === m[1] && window.__phorma.buehne?.H === m[1] && !document.getElementById("video").disabled, mass, { timeout: 120_000 });
    await bereit(page);
    const box = await page.locator("#vorschau").boundingBox();
    assert.ok(Math.abs(box.width / box.height - mass[0] / mass[1]) < 0.01);
    const z = (await messe(page, 0)).zeit, mitte = await messe(page, (z.phasen[1][2] + z.phasen[1][3]) / 2), ende = await messe(page, z.stehen[0] + 0.4);
    assert.ok(mitte.mittelAbw > 3, `${format}: im Gewebe nicht das Foto (${mitte.mittelAbw.toFixed(1)})`);
    assert.ok(ende.abw <= 3, `${format}: am Ende das Foto exakt (${ende.abw})`);
  }
  assert.deepEqual(fehler, []); assert.deepEqual(fremd, []);
  await ctx.close();
});

await check("Handy: nichts ragt seitlich hinaus, Beschriftungen auf einer Zeile", async () => {
  const { ctx, page, fehler } = await oeffne({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true });
  await laden(page); await bereit(page);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  assert.ok(await page.evaluate(() => [...document.querySelectorAll(".segment button")].every((x) => x.scrollWidth <= x.clientWidth + 1)), "Beschriftungen auf einer Zeile");
  assert.ok(await page.evaluate(() => [...document.querySelectorAll("[data-wahl], .phasen button")].every((x) => x.getBoundingClientRect().right <= window.innerWidth)), "Effekte und Phasen passen");
  assert.deepEqual(fehler, []);
  await ctx.close();
});

await browser.close();
server.close();
const ok = ergebnisse.filter(Boolean).length;
console.log(`\n${ok}/${ergebnisse.length} bestanden`);
process.exit(ok === ergebnisse.length ? 0 : 1);
