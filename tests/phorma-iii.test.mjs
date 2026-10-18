// PHORMA III (alpha/phorma-iii/) – Tests ohne Browser: Ablauf mit Logo oder Bild (Gewebe) und Stille (Irrfahrt), Analyse, Ton, Zustände und
// Höhenlinien fürs Gewebe, der Zufallsweg der Irrfahrt,
// Verfrickeln, MP4 mit Tonspur, Seite. Bis zum 18. Oktober 2026 waren sie Teil von tests/phorma-ii.test.mjs.
//   node --test tests/phorma-iii.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const P = new URL("alpha/phorma-iii/", root);
const A = await import(new URL("ablauf.js", P).href);
const { analysieren } = await import(new URL("analyse.js", P).href);
const T = await import(new URL("ton.js", P).href);
const Kv = await import(new URL("kurven.js", P).href);
const Fr = await import(new URL("frickeln.js", P).href);
const lies = (p) => readFileSync(new URL(p, P), "utf8");

test("Ablauf: Zeichen, Gewebe, dann mit Signet das Logo (danach nur der Schluss), ohne Signet das Bild und Stehen; mit Tonspur so lang wie die Musik", () => {
  const ohne = A.zeitachse({ tempo: "ruhig", signet: false });
  assert.deepEqual(ohne.phasen.map((p) => p.name), ["zeichen", "gewebe", "bild"]);
  assert.equal(ohne.tempo, 1.3); assert.ok(ohne.ab.stehen && !ohne.ab.signet);
  // mit Signet geht das Gewebe direkt ins Logo über (kein Bild, kein Stehen, kein leerer Abspann): danach nur noch 0,3 s Schluss
  const logo = A.zeitachse({ laenge: 40 });
  assert.deepEqual(logo.phasen.map((p) => p.name), ["zeichen", "gewebe", "logo"]);
  assert.equal(logo.ab.signet, undefined); assert.equal(logo.ab.stehen, undefined);
  assert.ok(Math.abs(logo.phasen[2].bis - logo.abschnitt.bis) < 1e-9 && Math.abs(logo.phasen[2].bis - logo.phasen[2].von - A.LOGO) < 1e-9);
  assert.ok(Math.abs(logo.dauer - logo.abschnitt.bis - A.NACH(true)) < 1e-9, "nach dem Logo nur der Schluss");
  assert.ok(Math.abs(A.zeitachse({ laenge: 40, signet: false }).dauer - 40 - 0.4 - A.NACH(false)) < 1e-9);
  const mit = A.zeitachse({ tempo: "ruhig", laenge: 40 });
  assert.equal(mit.tempo, 1, "mit Tonspur gibt die Musik das Tempo");
  assert.ok(Math.abs(mit.abschnitt.bis - mit.abschnitt.von - 40) < 1e-9, "der Effekt dauert so lange wie verlangt");
  const kurz = (signet) => A.zeitachse({ laenge: 2, signet }).phasen[1];
  assert.ok(kurz(false).bis - kurz(false).von >= 5 && kurz(true).bis - kurz(true).von >= 3.2, "mindestens 5 s Gewebe (mit Logo 3,2 s)");
  assert.ok(Math.abs(A.zeitachse({ laenge: 10 }).abschnitt.bis - 10.4) < 1e-9, "auch mit Logo so lang wie die Musik ab 10 s");
  // ein einziger Teil: laufend gibt ihn mit seiner eigenen Zeit, vor dem Anfang 0, nach dem Ende seine ganze Dauer
  const z = A.zeitachse({ signet: false }), [teil] = z.teile;
  assert.equal(z.teile.length, 1); assert.equal(teil.art, "gewebe");
  assert.equal(A.laufend(z, 0)[0].lokal, 0);
  assert.ok(Math.abs(A.laufend(z, 5)[0].lokal - (5 - teil.von)) < 1e-9);
  assert.ok(Math.abs(A.laufend(z, z.dauer)[0].lokal - (teil.bis - teil.von)) < 1e-9);
  assert.deepEqual(A.phase(teil, "gewebe"), [2.2, 16.2]); assert.equal(A.phase(teil, "logo"), null);
  assert.match(A.dateiname(new Date(2026, 9, 18, 9, 5), "mp4"), /^phorma-iii-2026-10-18-0905\.mp4$/);
});

test("Irrfahrt: Würfel, Irrfahrt, Logo oder Stille; kein Stehen, nach dem Effekt nur der Schluss; Unbekanntes ergibt das Gewebe", () => {
  assert.deepEqual(A.EFFEKTE, ["gewebe", "irrfahrt"]);
  assert.equal(A.ablaufName("irrfahrt"), "irrfahrt"); assert.equal(A.ablaufName("physarum"), "gewebe"); assert.equal(A.ablaufName(null), "gewebe");
  const mit = A.zeitachse({ ablauf: "irrfahrt", laenge: 30 }), ohne = A.zeitachse({ ablauf: "irrfahrt", laenge: 30, signet: false });
  assert.equal(mit.ablauf, "irrfahrt");
  assert.deepEqual(mit.phasen.map((p) => p.name), ["wuerfel", "irrfahrt", "logo"]);
  assert.deepEqual(ohne.phasen.map((p) => p.name), ["wuerfel", "irrfahrt", "stille"]);
  for (const z of [mit, ohne]) {
    assert.ok(Math.abs(z.abschnitt.bis - z.abschnitt.von - 30) < 1e-9, "so lang wie verlangt");
    assert.equal(z.ab.stehen, undefined); assert.ok(Math.abs(z.dauer - z.abschnitt.bis - 0.3) < 1e-9, "danach nur der Schluss");
  }
  assert.equal(A.NACH(false, "irrfahrt"), 0.3); assert.equal(A.NACH(false, "gewebe"), 3.5);
  assert.ok(A.zeitachse({ ablauf: "irrfahrt", laenge: 2 }).phasen[1].bis - A.zeitachse({ ablauf: "irrfahrt", laenge: 2 }).phasen[1].von >= 3.2);
  assert.equal(A.zeitachse({ ablauf: "irrfahrt", tempo: "ruhig", signet: false }).tempo, 1.3, "ohne Ton im Tempo");
});

test("Irrfahrt: der Zufallsweg bleibt im Würfel, kommt herum, ist wiederholbar und je Zustand ein anderer; Züge werden gleichmässig verbunden", async () => {
  const { irrweg, verbinden, PN } = await import(new URL("irrweg.js", P).href);
  const w = irrweg(3), n = w.length / 4;
  assert.equal(n, PN);
  let max = 0, min = [9, 9, 9], hoch = [-9, -9, -9];
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) { const v = w[i * 4 + c]; max = Math.max(max, Math.abs(v)); min[c] = Math.min(min[c], v); hoch[c] = Math.max(hoch[c], v); }
  assert.ok(max < 0.49, `im Würfel (${max.toFixed(3)})`);
  assert.ok(hoch.every((h, c) => h - min[c] > 0.35), `kommt herum (${hoch.map((h, c) => (h - min[c]).toFixed(2))})`);
  assert.deepEqual(irrweg(3), w, "wiederholbar"); assert.notDeepEqual(irrweg(4), w, "ein anderer Zustand, ein anderer Weg");
  const v = verbinden([[0, 0, 0, 1, 0, 0], [1, 1, 0, 1, 2, 0]], 31);
  assert.deepEqual([v[0], v[1], v[30 * 4], v[30 * 4 + 1]], [0, 0, 1, 2], "vom Anfang bis zum Ende");
  const abst = []; for (let k = 1; k < 31; k++) abst.push(Math.hypot(v[k * 4] - v[k * 4 - 4], v[k * 4 + 1] - v[k * 4 - 3]));
  assert.ok(Math.max(...abst) - Math.min(...abst) < 1e-6, "gleichmässig nach der Länge");
});

test("Analyse: Helligkeit und Tonumfang; gleiches Bild, gleiches Ergebnis", () => {
  const w = 40, h = 50, d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) d.set([255 * (i % w) / w, 100, 50, 255], i * 4);
  const a = analysieren(d, w, h);
  assert.equal(a.hell.length, w * h);
  assert.ok(a.hell.every((v) => v >= 0 && v <= 1) && a.hell[w - 1] > a.hell[0]);
  assert.ok(a.ton[0] < a.ton[1] && a.mittel > 0 && a.B === 2 * w);
  assert.deepEqual(analysieren(d, w, h).hell, a.hell);
});

test("Gewebe: Zustände bei kräftigen Einsätzen, Lücken gefüllt; das Tor öffnet beim Schlag und schliesst dazwischen", () => {
  const ein = [1, 1.3, 2, 2.4, 9, 9.5, 16].map((t, i) => ({ t, staerke: i % 2 ? 0.3 : 0.8 }));
  const Tk = { einsaetze: ein, schnitte: [9] };
  const z = T.gewebeZustaende(Tk, 0.5, 20);
  assert.deepEqual(z.map((x) => x.t), [1, 2, 4, 6, 9, 11, 13, 16, 18], "kräftige Einsätze ≥ 0,45 s auseinander (auch vom Anfang), Lücken über 3 s alle 2 s gefüllt");
  assert.deepEqual(T.gewebeZustaende(Tk, 0.5, 20), z, "wiederholbar");
  assert.ok(z.every((x) => typeof x.nacht === "boolean" && typeof x.zeichen === "boolean"));
  assert.equal(T.zustandBei(z, 0.8, 0.5).nr, 0); assert.equal(T.zustandBei(z, 9.2, 0.5).t0, 9);
});

test("Ton: Lautstärke, Bänder und Einsätze aus einer Tonspur; Schnitte an den stärksten, die Zeit der Musik steigt", () => {
  const rate = 22050, dauer = 12, pcm = new Float32Array(rate * dauer), schlaege = [1, 2.5, 4, 5.5, 7, 8.5, 10];
  for (let i = 0; i < pcm.length; i++) pcm[i] = 0.02 * Math.sin(i * 0.05);
  for (const [j, s] of schlaege.entries()) for (let i = 0; i < rate * 0.25; i++) {
    const k = Math.round(s * rate) + i, a = (j % 3 === 0 ? 0.9 : 0.4) * Math.exp(-i / (rate * 0.06));
    pcm[k] += a * (Math.sin(i * 0.03) + 0.5 * Math.sin(i * 1.1));
  }
  const t = T.tonAnalysieren(pcm, rate);
  assert.ok(Math.abs(t.dauer - dauer) < 1e-9 && t.n === dauer * T.FPS && t.echt);
  for (const k of ["laut", "tief", "mitte", "hoch", "fluss"]) assert.ok(t[k].every((v) => v >= 0 && v <= 1), `${k} in 0..1`);
  for (const s of schlaege) assert.ok(t.einsaetze.some((e) => Math.abs(e.t - s) < 0.1), `Einsatz bei ${s} s`);
  assert.ok(t.einsaetze.length <= schlaege.length + 2, `nicht zu viele Einsätze (${t.einsaetze.length})`);
  assert.ok(t.schnitte.length >= 1 && t.schnitte.every((s, i) => s >= 0.8 && (i === 0 || s - t.schnitte[i - 1] >= 2)), "Schnitte: mindestens 2 s auseinander");
  assert.ok(t.energie.every((v, i) => i === 0 || v > t.energie[i - 1]), "die Zeit der Musik steigt");
  assert.ok(T.wert(t.laut, 1.1) > T.wert(t.laut, 0.5), "laut beim Schlag");
  assert.deepEqual(T.tonAnalysieren(pcm, rate).einsaetze, t.einsaetze, "gleiche Tonspur, gleiches Ergebnis");
  // die Musik sichtbar machen: Spektrum je Filmbild, Hüllkurven der Einsätze, ein Winkel, der bei Einsätzen schwingt, eine Zeit, die bei Schlägen springt
  assert.equal(t.spektrum.length, t.n * T.BAENDER);
  assert.ok(t.spektrum.every((v) => v >= 0 && v <= 1) && Math.max(...t.spektrum) > 0.9, "Spektrum 0..1");
  for (const k of ["stoss", "stossTief", "stossHoch"]) assert.ok(t[k].length === t.n && t[k].every((v) => v >= 0 && v <= 1.0001), k);
  const b1 = Math.round(schlaege[0] * T.FPS);
  assert.ok(t.stoss[b1 + 2] > 0.3 && t.stoss[b1 - 3] < 0.05, "der Stoss setzt mit dem Schlag ein");
  assert.ok(t.einsaetze.every((e) => [0, 1, 2].includes(e.band)), "jeder Einsatz einem Band zugeordnet");
  const lauf = (a, b) => t.energie[b] - t.energie[a];
  assert.ok(lauf(b1, b1 + 6) > 2 * lauf(b1 + 20, b1 + 26), "die Zeit der Musik läuft beim Schlag schneller als dazwischen");
  assert.ok(Math.abs(t.dreh[b1 + 12] - t.dreh[b1 - 2]) > 0.2, "bei einem kräftigen Einsatz schwingt der Winkel");
  assert.equal(T.tonAnalysieren(pcm, rate, { spektrum: false }).spektrum, null, "ohne Spektrum (fürs Verfrickeln)");
  assert.ok(t.tor[b1 + 3] > 0.5 && t.tor[b1 + 3] > 2.5 * t.tor[b1 + 43], "das Tor: auf beim Schlag, zu (fast) bis zum nächsten");
  assert.equal(T.tonOderErsatz(null), T.tonOderErsatz(null), "ohne Ton überall derselbe Ersatz");
  assert.equal(T.tonOderErsatz(t), t);
  const w = T.wechselZeiten(t, { von: 2, bis: 11 });
  assert.ok(w.every((s) => s > 2.3 && s < 10) && w.length === t.schnitte.filter((s) => s > 2.3 && s < 10).length, "Wechsel der Videobilder an den Schnitten im Gewebe");
  const e = T.ersatz(20);
  assert.ok(!e.echt && e.einsaetze.length > 5 && e.energie.length === e.n);
  assert.deepEqual(T.ersatz(20).einsaetze, e.einsaetze, "der Ersatz ist wiederholbar");
});

test("Höhenlinien: ein Kreis ergibt eine geschlossene Linie auf seinem Rand; das Gewebe nimmt die längsten, gleichmässig abgetastet", () => {
  const w = 64, h = 48, feld = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) feld[y * w + x] = Math.hypot(x - 24, y - 24) < 12 ? 1 : 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.hypot(x - 52, y - 10) < 4) feld[y * w + x] = 1;
  const linien = Kv.hoehenlinien(feld, w, h, 0.5);
  assert.equal(linien.length, 2);
  const gross = linien.reduce((a, b) => (a.length > b.length ? a : b));
  for (let i = 0; i < gross.length; i += 2) assert.ok(Math.abs(Math.hypot(gross[i] - 24, gross[i + 1] - 24) - 12) < 1.2, "auf dem Rand");
  const k = Kv.gewebeKurven(feld, w, h, { anzahl: 5, punkte: 30, maxLaenge: 1 });
  assert.ok(k.length >= 1 && k.every((c) => c.length === 60));
  const abst = []; for (let u = 1; u < 30; u++) abst.push(Math.hypot(k[0][2 * u] - k[0][2 * u - 2], k[0][2 * u + 1] - k[0][2 * u - 1]));
  assert.ok(Math.max(...abst) < 2.5 * Math.min(...abst), "gleichmässig abgetastet");
  assert.deepEqual(Kv.gewebeKurven(new Float32Array(w * h), w, h), [], "ein leeres Feld hat keine Linien");
});

test("Verfrickeln: aus einem kurzen Sample ein neues Stück im Raster, wiederholbar je Wurf, ohne Übersteuern; auch Stille und Winziges", () => {
  const rate = 22050, n = Math.round(rate * 2.4), pcm = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / rate, s = t % 0.6; pcm[i] = Math.exp(-s / 0.08) * (Math.sin(i * (0.03 + 0.01 * Math.floor(t / 0.6))) + 0.4 * Math.sin(i * 0.9)) * 0.7; }
  const f = Fr.frickeln([pcm], rate, { samen: 3 });
  const schritt = Math.round((60 / f.bpm / 4) * rate);
  assert.ok(f.bpm >= 80 && f.bpm <= 160, `Tempo ${f.bpm}`);
  assert.equal(f.kanaele[0].length, f.takte * 16 * schritt + Math.round(3 * rate), "Takte im Raster und ein Nachhall von 3 s");
  assert.ok(f.dauer > 20 && f.dauer < 45 && f.scheiben >= 3 && f.anschlaege > f.takte * 4, JSON.stringify({ dauer: f.dauer, scheiben: f.scheiben, anschlaege: f.anschlaege }));
  let max = 0, nan = false, unterschied = 0;
  for (let i = 0; i < f.kanaele[0].length; i++) { const l = f.kanaele[0][i], r = f.kanaele[1][i]; if (Number.isNaN(l + r)) nan = true; max = Math.max(max, Math.abs(l), Math.abs(r)); unterschied += Math.abs(l - r); }
  assert.ok(!nan && max <= 0.892 && max > 0.85, `Spitze bei −1 dBFS (${max})`);
  const lufs = Fr.lautheit(f.kanaele[0], f.kanaele[1], rate);
  assert.ok(Math.abs(lufs + 14) < 0.8, `auf −14 LUFS gemastert (${lufs.toFixed(1)})`);
  assert.ok(unterschied > 0, "stereo: Panorama und Ping-Pong-Echo");
  const mono = f.kanaele[0].map((v, i) => (v + f.kanaele[1][i]) / 2), t = T.tonAnalysieren(mono, rate);
  assert.ok(t.einsaetze.length > 2 * f.takte, `ein Stück mit vielen Einsätzen (${t.einsaetze.length})`);
  assert.deepEqual(Fr.frickeln([pcm], rate, { samen: 3 }).kanaele[0].slice(0, 50000), f.kanaele[0].slice(0, 50000), "derselbe Wurf, dasselbe Stück");
  assert.notDeepEqual(Fr.frickeln([pcm], rate, { samen: 4 }).kanaele[0].slice(0, 50000), f.kanaele[0].slice(0, 50000), "ein neuer Wurf klingt anders");
  // ein weiches Signal (Töne mit sanften Einsätzen, ohne einen einzigen Sprung) gibt verfrickelt kaum Klicks (vorher 73–255 je Wurf: der Bitcrush)
  const r44 = 44100, weich = new Float32Array(r44 * 8);
  for (let i = 0; i < weich.length; i++) {
    const t = i / r44; let e = 0;
    for (let k = 0.2; k < t && k < 8; k += 0.5) e += (0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, (t - k) / 0.03))) * Math.exp(-(t - k) / 0.25);   // weiche Einsätze, die ineinander abklingen
    weich[i] = 0.3 * e * (Math.sin(2 * Math.PI * 110 * t) + 0.6 * Math.sin(2 * Math.PI * 165 * t + 1) + 0.4 * Math.sin(2 * Math.PI * 440 * t + 2));
  }
  for (const samen of [1, 2]) {
    const [l, r] = Fr.frickeln([weich], r44, { samen }).kanaele;
    let klicks = 0, mittel = 1e-4;
    for (let i = 2; i < l.length; i++) { const d = Math.abs(l[i] - 2 * l[i - 1] + l[i - 2]) + Math.abs(r[i] - 2 * r[i - 1] + r[i - 2]); mittel += (d - mittel) * 0.002; if (d > 12 * mittel + 0.02) { klicks++; i += 200; } }
    assert.ok(klicks <= 30, `Wurf ${samen}: ${klicks} Klicks`);
  }
  for (const q of [new Float32Array(rate), Float32Array.from({ length: 300 }, (_, i) => Math.sin(i))]) {
    const s = Fr.frickeln([q, q], rate, { samen: 1, takte: 2 });
    assert.ok(s.kanaele.every((c) => c.every((v) => Number.isFinite(v) && Math.abs(v) <= 0.892)));
  }
  const w = Fr.wav(f.kanaele, rate);
  assert.equal(String.fromCharCode(...w.subarray(0, 4)), "RIFF"); assert.equal(w.length, 44 + f.kanaele[0].length * 4);
});

test("MP4 in Teilen: dieselben Bytes wie mp4-muxer am Stück, moov vorn; nie die ganze Datei in einem Block", async () => {
  const { mp4Schreiber } = await import(new URL("tonspur.js", P).href);
  const { Muxer, ArrayBufferTarget } = await import(new URL("vendor/mp4-muxer-5.2.2/mp4-muxer.js", root).href);
  const avcC = new Uint8Array([1, 0x64, 0, 0x28, 0xff, 0xe1, 0, 1, 0x67, 1, 0, 1, 0x68]), N = 400;
  const ton = { codec: "opus", kanaele: 2, rate: 48000, meta: { decoderConfig: { codec: "opus", sampleRate: 48000, numberOfChannels: 2 } },
    proben: Array.from({ length: 700 }, (_, i) => ({ daten: new Uint8Array(90 + (i % 13)).fill(i & 255), key: true, zeit: i * 20000, dauer: 20000 })) };
  const bild = (i) => new Uint8Array(3000 + ((i * 37) % 900)).map((_, j) => (i * 7 + j) & 255);
  const uhr = Date.now; Date.now = () => 1.7e12;   // mp4-muxer schreibt die Entstehungszeit in Sekunden: beide gleich
  try { for (const t of [null, ton]) {
    const w = mp4Schreiber({ breite: 1080, hoehe: 1350, fps: 30, codec: "avc1.640028", bilder: N, ton: t });
    for (let i = 0; i < N; i++) w.bild(bild(i), i % 60 === 0, Math.round((i * 1e6) / 30), avcC);
    const blob = w.fertig(), a = new Uint8Array(await blob.arrayBuffer());
    const m = new Muxer({ target: new ArrayBufferTarget(), firstTimestampBehavior: "offset", fastStart: { expectedVideoChunks: N, expectedAudioChunks: t ? t.proben.length : 0 },
      video: { codec: "avc", width: 1080, height: 1350, frameRate: 30 }, ...(t ? { audio: { codec: "opus", numberOfChannels: 2, sampleRate: 48000 } } : {}) });
    t?.proben.forEach((p, i) => m.addAudioChunkRaw(p.daten, "key", p.zeit, p.dauer, i ? undefined : t.meta));
    for (let i = 0; i < N; i++) m.addVideoChunkRaw(bild(i), i % 60 === 0 ? "key" : "delta", Math.round((i * 1e6) / 30), Math.round(1e6 / 30), i ? undefined : { decoderConfig: { codec: "avc1.640028", codedWidth: 1080, codedHeight: 1350, description: avcC } });
    m.finalize();
    assert.deepEqual(a, new Uint8Array(m.target.buffer), t ? "mit Ton" : "ohne Ton");
    const f = new DataView(a.buffer).getUint32(0);
    assert.equal(String.fromCharCode(...a.subarray(f + 4, f + 8)), "moov", "moov gleich nach ftyp (schnelles Abspielen)");
  } } finally { Date.now = uhr; }
});

test("Seite: Alpha (noindex), three.js lokal mit fester Version, gleiche ?v=-Marken, nichts von aussen; nur das Gewebe, mit Foto, Text, Video oder Ton", () => {
  const html = lies("index.html");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<title>PHORMA III – Ornament Cloud · Alpha<\/title>/);
  assert.match(html, /"three": "\.\.\/\.\.\/vendor\/three-0\.185\.1\/three\.module\.min\.js"/);
  assert.ok(!/<script[^>]+src="https?:/.test(html), "keine Skripte von aussen");
  assert.match(html, /data-quelle="foto"[\s\S]*data-quelle="text"[\s\S]*data-quelle="video"[\s\S]*data-quelle="ton">Nur Ton/, "Foto, Text, Video oder nur Ton als Quelle");
  assert.match(html, /id="videodatei"[^>]*accept="video\/\*/, "eine Videodatei");
  assert.match(html, /id="tondatei"[^>]*accept="audio\/\*/, "eine Audiodatei");
  assert.match(html, /id="ton-im-video" checked> Ton an/, "Ton ausschaltbar");
  assert.match(html, /id="frickeln"> Verfrickeln[\s\S]*id="wuerfeln"/, "Verfrickeln als Option, mit neuem Wurf");
  assert.match(html, /id="signet" checked> Logo am Schluss/);
  assert.match(html, /data-wahl="gewebe" aria-pressed="true"[\s\S]*data-wahl="irrfahrt"/, "zwei Effekte: Gewebe und Irrfahrt");
  assert.ok(!/data-(effekt|tiefe)=|data-wahl="(physarum|tiefe|tuch)/.test(html), "keine Kette und keine Tiefe: das ist PHORMA II");
  assert.match(html, /href="\.\.\/phorma-ii\/"/, "Hinweis auf PHORMA II");
  const dateien = readdirSync(P).filter((f) => f.endsWith(".js")), marken = new Set();
  for (const f of ["ablauf.js", "analyse.js", "app.js", "buehne.js", "film.js", "frickeln.js", "gemeinsam.js", "gewebe.js", "irrfahrt.js", "irrweg.js", "kurven.js", "rechner.js", "textbild.js", "ton.js", "tonspur.js"]) assert.ok(dateien.includes(f), f);
  for (const f of ["physarum.js", "tiefe.js", "tuch.js", "tuchsim.js", "tiefe-ki.js"]) assert.ok(!dateien.includes(f), `ohne ${f}`);
  for (const f of dateien) {
    const js = lies(f);
    for (const m of js.matchAll(/"\.\/([a-z-]+\.js)(\?v=\d+)?"/g)) { assert.ok(m[2], `${f}: ${m[1]} mit Marke`); marken.add(m[2]); }
    assert.ok(!/https?:\/\//.test(js.replace(/\/\/.*$/gm, "")), `${f}: keine Adressen von aussen`);
    assert.ok(!/phorma-ii\//.test(js), `${f}: lädt nichts aus PHORMA II`);
  }
  assert.equal(marken.size, 1, `eine Marke für alle eigenen Module (${[...marken]})`);
  assert.match(html, /<script type="module" src="app\.js\?v=\d+"><\/script>/);
});
