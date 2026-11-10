// Hörseite der EP «directer» (listen/directer/, docs/ep-directer.md): Konfiguration, Trackmarken, WAV-Export und Range-Server, ohne Browser.
//   node --test tests/ep-directer.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");
const { startzeiten, aktiverTrack, trackEnde, zeitText, pruefeEp } = await import(new URL("listen/directer/player.js", root).href);
const { wavKopf, wavInfo, marken, markenEintragen } = await import(new URL("tools/ep-wav.mjs", root).href);
const { startServer, bereich } = await import(new URL("tools/ep-server.mjs", root).href);
const { pruefeRange } = await import(new URL("tools/ep-range.mjs", root).href);
const ep = JSON.parse(lies("listen/directer/ep.json"));
/** für die Exporttests: vier Tracks ohne Einzeldateien, unabhängig von der echten EP */
const ep4 = { ...ep, tracks: ["Eins", "Zwei", "Drei", "Vier"].map((titel) => ({ titel, startSample: null, samples: null })) };

test("ep.json: vollständig und ohne Fehler; Platzhalter sind als solche erkennbar", () => {
  const { fehler, platzhalter } = pruefeEp(ep);
  assert.deepEqual(fehler, []);
  assert.equal(ep.tracks.length, 3, "drei Tracks (10. November 2026: ohne «outro»)");
  assert.deepEqual(platzhalter, [], "keine Platzhalter mehr");
  for (const t of ep.tracks) assert.match(t.datei, /^audio\/[a-z0-9-]+\.wav$/, "Einzeldatei zum Herunterladen neben der EP-Datei (nicht in Git, vor rsync geschützt)");
  assert.equal(ep.abtastrate, 44100);
  assert.equal(ep.tracks[0].startSample, 0, "Track 1 beginnt am Anfang der Datei");
  for (const c of [ep.cover, ep.coverKlein].filter(Boolean)) assert.ok(existsSync(new URL(`listen/directer/${c}`, root)), `Cover ${c} liegt im Repository`);
  if (platzhalter.length) console.log(`  offen: ${platzhalter.join(", ")}`);
  for (const t of ep.tracks) if (t.startSample == null) assert.equal(t.samples, null, "ohne Marke auch keine Länge");
});

test("Seite: ein natives <audio> mit preload=metadata, noindex, Titel für Linkvorschauen passt zu ep.json, keine fremden Quellen", () => {
  const html = lies("listen/directer/index.html");
  assert.equal(html.match(/<audio\b/g).length, 1, "genau ein Audioelement");
  assert.match(html, /<audio id="audio" preload="metadata"><\/audio>/);
  assert.doesNotMatch(html, /autoplay/, "der erste Start kommt vom Tipp");
  assert.match(html, /<meta name="robots" content="noindex">/);
  const titel = `${ep.anzeigename} – ${ep.titel}`;
  assert.ok(html.includes(`<title>${titel}</title>`) && html.includes(`<meta property="og:title" content="${titel}">`), "Titel und og:title wie in ep.json");
  assert.ok(html.includes(`<meta property="og:image" content="https://ornament.cloud/listen/directer/${ep.cover}">`), "Vorschaubild = Cover aus ep.json");
  assert.doesNotMatch(html + lies("listen/directer/player.css") + lies("listen/directer/player.js"), /(src|href)="https?:|@import|fonts\.googleapis/, "alles vom eigenen Server");
  assert.ok(!lies("sitemap.xml").includes("/listen/"), "nicht in der Sitemap");
  const js = lies("listen/directer/player.js");
  assert.doesNotMatch(js, /new Audio\(|createElement\("audio"\)|AudioContext/, "keine zweite Wiedergabe neben dem Audioelement");
  assert.match(js, /mediaSession/);
});

test("Marken: aktiver Track, Ende, Zeitanzeige", () => {
  const e = { abtastrate: 44100, tracks: [{ startSample: 0 }, { startSample: 441000 }, { startSample: 882000 }, { startSample: 1323000 }] };
  const s = startzeiten(e);
  assert.deepEqual(s, [0, 10, 20, 30]);
  assert.equal(aktiverTrack(0, s), 0);
  assert.equal(aktiverTrack(9.99, s), 0);
  assert.equal(aktiverTrack(10, s), 1);
  assert.equal(aktiverTrack(9.9995, s), 1, "Rundung beim Springen landet im richtigen Track");
  assert.equal(aktiverTrack(29.5, s), 2);
  assert.equal(aktiverTrack(400, s), 3);
  assert.equal(trackEnde(1, s, 40), 20);
  assert.equal(trackEnde(3, s, 40), 40);
  assert.equal(trackEnde(3, s, NaN), null);
  assert.equal(aktiverTrack(25, [0, null, 20, null]), 2, "fehlende Marken werden übersprungen");
  assert.equal(zeitText(0), "0:00"); assert.equal(zeitText(187.9), "3:07"); assert.equal(zeitText(3723), "1:02:03"); assert.equal(zeitText(NaN), "–:––");
});

test("Prüfung: erkennt Fehler und Platzhalter", () => {
  const gut = { anzeigename: "a", titel: "b", cover: "c.jpg", audio: "x.wav", abtastrate: 44100, tracks: [{ titel: "Eins", startSample: 0 }, { titel: "Zwei", startSample: 10 }] };
  assert.deepEqual(pruefeEp(gut), { fehler: [], platzhalter: [] });
  assert.deepEqual(pruefeEp({ ...gut, audio: "https://cdn.example.org/ep.wav" }).fehler, [], "separat bereitgestellte https-Adresse");
  assert.match(pruefeEp({ ...gut, audio: "http://cdn.example.org/ep.wav" }).fehler.join(), /https/);
  assert.match(pruefeEp({ ...gut, tracks: [{ titel: "a", startSample: 0 }, { titel: "b", startSample: 0 }] }).fehler.join(), /steigen nicht/);
  assert.match(pruefeEp({ ...gut, tracks: [{ titel: "a", startSample: 5 }] }).fehler.join(), /Sample 0/);
  assert.deepEqual(pruefeEp({ ...gut, audio: "", cover: "cover-platzhalter.svg", tracks: [{ titel: "PLATZHALTER 1", startSample: 0 }, { titel: "b", startSample: null }] }).platzhalter,
    ["Audioquelle (audio)", "Cover", "Titel von Track 1", "Startmarke von Track 2"]);
});

test("WAV: Kopf, Marken aus Samplezahlen, Eintrag in die Konfiguration", () => {
  const dir = mkdtempSync(join(tmpdir(), "ep-test-"));
  try {
    const f = join(dir, "a.wav");
    writeFileSync(f, Buffer.concat([wavKopf(1000), Buffer.alloc(4000)]));
    const i = wavInfo(f);
    assert.deepEqual([i.format, i.kanaele, i.rate, i.bits, i.frames, i.dataStart], [1, 2, 44100, 16, 1000, 44]);
    assert.deepEqual(marken([100, 250, 50, 7]).map((m) => m.startSample), [0, 100, 350, 400]);
    const e = markenEintragen(structuredClone(ep4), marken([100, 250, 50, 7]));
    assert.deepEqual(e.tracks.map((t) => [t.startSample, t.samples]), [[0, 100], [100, 250], [350, 50], [400, 7]]);
    assert.deepEqual(e.tracks.map((t) => t.titel), ep4.tracks.map((t) => t.titel), "Titel bleiben");
    assert.throws(() => markenEintragen(structuredClone(ep4), marken([1, 2])), /4 Tracks/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

const ffmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;
test("Export: vier Master → eine WAV 16 Bit / 44,1 kHz Stereo, Marken in ep.json, Master unverändert, 16/44,1-Master bitgleich", { skip: !ffmpeg && "ffmpeg fehlt" }, () => {
  const dir = mkdtempSync(join(tmpdir(), "ep-export-"));
  const ff = (...a) => assert.equal(spawnSync("ffmpeg", ["-v", "error", "-y", ...a]).status, 0);
  try {
    ff("-f", "lavfi", "-i", "sine=f=220:d=1", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s24le", join(dir, "1.wav"));
    ff("-f", "lavfi", "-i", "sine=f=330:d=0.5", "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", join(dir, "2.wav"));
    ff("-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo:d=0.25", "-c:a", "pcm_s16le", join(dir, "3.wav"));
    ff("-f", "lavfi", "-i", "sine=f=440:d=0.75", "-ar", "96000", "-ac", "1", "-c:a", "pcm_f32le", join(dir, "4.wav"));
    const vorher = [1, 2, 3, 4].map((n) => readFileSync(join(dir, `${n}.wav`)));
    ep4.tracks[1].datei = "einzeln/zwei.wav";
    writeFileSync(join(dir, "ep.json"), JSON.stringify(ep4));
    const r = spawnSync(process.execPath, [new URL("tools/ep-wav.mjs", root).pathname, "--ep", join(dir, "ep.json"), "--aus", join(dir, "ep.wav"), ...[1, 2, 3, 4].map((n) => join(dir, `${n}.wav`))], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    [1, 2, 3, 4].forEach((n, i) => assert.ok(readFileSync(join(dir, `${n}.wav`)).equals(vorher[i]), `Master ${n} unverändert`));
    const info = wavInfo(join(dir, "ep.wav"));
    assert.deepEqual([info.format, info.kanaele, info.rate, info.bits], [1, 2, 44100, 16]);
    const neu = JSON.parse(readFileSync(join(dir, "ep.json"), "utf8"));
    assert.deepEqual(neu.tracks.map((t) => t.startSample), [0, 44100, 66150, 77175]);
    assert.equal(info.frames, 77175 + 33075, "keine Lücke, nichts gekürzt");
    const quelle = wavInfo(join(dir, "2.wav")), ganz = readFileSync(join(dir, "ep.wav")), zwei = readFileSync(join(dir, "2.wav"));
    assert.ok(ganz.subarray(44 + 44100 * 4, 44 + 66150 * 4).equals(zwei.subarray(quelle.dataStart, quelle.dataStart + quelle.dataBytes)), "16/44,1-Master bitgleich übernommen");
    const einzel = readFileSync(join(dir, "einzeln/zwei.wav"));
    assert.deepEqual([wavInfo(join(dir, "einzeln/zwei.wav")).frames, neu.tracks[1].datei], [22050, "einzeln/zwei.wav"]);
    assert.ok(einzel.subarray(44).equals(ganz.subarray(44 + 44100 * 4, 44 + 66150 * 4)), "Einzeldatei = derselbe Ausschnitt der EP");
    assert.throws(() => { const x = spawnSync(process.execPath, [new URL("tools/ep-wav.mjs", root).pathname, "--ep", join(dir, "ep.json"), "--aus", join(dir, "1.wav"), ...[1, 2, 3, 4].map((n) => join(dir, `${n}.wav`))], { encoding: "utf8" }); if (x.status) throw new Error(x.stderr); }, /Master/);
    assert.ok(readFileSync(join(dir, "1.wav")).equals(vorher[0]), "Ziel = Master wird abgelehnt");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("Server und Prüfung: Range-Anfragen ergeben 206 Partial Content", async () => {
  assert.deepEqual(bereich("bytes=0-99", 1000), [0, 99]);
  assert.deepEqual(bereich("bytes=900-", 1000), [900, 999]);
  assert.deepEqual(bereich("bytes=-100", 1000), [900, 999]);
  assert.equal(bereich("bytes=2000-", 1000), null);
  const dir = mkdtempSync(join(tmpdir(), "ep-range-"));
  const seite = join(dir, "listen/directer");
  spawnSync("mkdir", ["-p", join(seite, "audio")]);
  writeFileSync(join(seite, "ep.json"), JSON.stringify({ ...ep4, audio: "audio/ep.wav" }));
  writeFileSync(join(seite, "audio/ep.wav"), Buffer.concat([wavKopf(200000), Buffer.alloc(800000, 1)]));
  const server = await startServer(0, dir);
  try {
    const r = await pruefeRange(`http://localhost:${server.address().port}/listen/directer/`);
    assert.ok(r.ok, r.fehler.join("; "));
  } finally { server.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("Deployment: WAV nicht in Git, auf dem Webspace vor rsync --delete geschützt, als audio/wav ausgeliefert und nicht komprimiert", () => {
  assert.match(lies(".gitignore"), /^listen\/directer\/audio\/$/m);
  assert.match(lies("tools/hostpoint/ausschluss.txt"), /^listen\/directer\/audio\/$/m);
  const ht = lies(".htaccess");
  assert.match(ht, /AddType audio\/wav \.wav/);
  for (const z of ht.split("\n").filter((z) => /DEFLATE|BROTLI/.test(z))) assert.doesNotMatch(z, /audio/, "Audio wird nicht komprimiert (sonst kein Range)");
});
