// PHORMA II (alpha/phorma-ii/) – Tests ohne Browser: Ablauf und Kette, Bildanalyse (Tiefe, Kanten, Keime, Tonumfang), Bahn des Tuchs, Ton und
// Höhenlinien fürs Gewebe, Verfrickeln, Seite.
//   node --test tests/phorma-ii.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const P = new URL("alpha/phorma-ii/", root);
const A = await import(new URL("ablauf.js", P).href);
const { analysieren, tiefeNormieren } = await import(new URL("analyse.js", P).href);
const T = await import(new URL("ton.js", P).href);
const Kv = await import(new URL("kurven.js", P).href);
const Fr = await import(new URL("frickeln.js", P).href);
const lies = (p) => readFileSync(new URL(p, P), "utf8");

test("Ablauf: Effekte in fester Reihenfolge, Unbekanntes ergibt die ganze Kette", () => {
  assert.equal(A.ablaufName("tuch+physarum"), "physarum+tuch");
  assert.equal(A.ablaufName("quatsch"), A.KETTE);
  assert.equal(A.ablaufName(null), "physarum+tiefe+tuch");
  assert.deepEqual(A.effekte("tuch+tiefe"), ["tiefe", "tuch"]);
  assert.equal(A.ablaufName("stich"), A.KETTE, "der frühere Stich ergibt die ganze Kette");
  assert.equal(A.ablaufName("physarum+muster+tuch"), "physarum+tuch", "die frühere Morphogenese fällt weg");
});

test("Kette: Physarum geht über eine Zeitfront in die Tiefe über, die Tiefe über eine kurze Front ins Tuch", () => {
  const K = A.kette(A.KETTE);
  assert.deepEqual(K.teile.map((t) => t.art), A.EFFEKTE);
  const [p, t, u] = K.teile;
  assert.equal(p.uebergang, "front"); assert.ok(Math.abs(t.von - (p.bis - 1.8)) < 1e-9, "die Tiefe setzt 1,8 s vor dem Ende des Netzes ein");
  assert.ok(!t.vonFoto, "die Tiefe beginnt unter der Zeitfront, nicht beim Foto");
  assert.equal(t.uebergang, "front"); assert.ok(u.von < t.bis && !u.vonFoto);
  assert.ok(!p.phasen.some(([n]) => n === "bild"), "nur der letzte Effekt hat eine Phase «Bild»");
  assert.equal(u.phasen.at(-1)[0], "bild");
  for (let i = 1; i < K.phasen.length; i++) assert.ok(K.phasen[i].von >= K.phasen[i - 1].von && K.phasen[i - 1].bis <= K.phasen[i].von + 1e-9, "Phasen hintereinander");
  for (const e of A.EFFEKTE) { const k = A.kette(e); assert.equal(k.teile.length, 1); assert.equal(k.teile[0].phasen.at(-1)[1], "Bild", `${e} allein endet beim Bild`); }
  assert.ok(K.dauer < 21, `kürzer als mit vier Effekten (${K.dauer.toFixed(1)} s)`);
});

test("Zeitachse: Vorlauf, Kette im Tempo, Stehen und Signet; laufend gibt beim Übergang beide", () => {
  const z = A.zeitachse({ ablauf: A.KETTE });
  assert.equal(z.ab.vor[1], z.abschnitt.von);
  assert.ok(Math.abs(z.abschnitt.bis - z.abschnitt.von - A.kette(A.KETTE).dauer) < 1e-9);
  assert.ok(z.ab.signet && z.dauer > z.abschnitt.bis + 3.2 + A.SIGNET);
  assert.equal(z.bilder, Math.round(z.dauer * 30));
  const ruhig = A.zeitachse({ ablauf: A.KETTE, tempo: "ruhig", signet: false });
  assert.ok(Math.abs((ruhig.abschnitt.bis - ruhig.abschnitt.von) / (z.abschnitt.bis - z.abschnitt.von) - 1.3) < 1e-9);
  assert.equal(ruhig.ab.signet, undefined);
  const [p, s] = z.teile, mitte = (s.von + p.bis) / 2, L = A.laufend(z, mitte);
  assert.deepEqual(L.map((x) => x.teil.art), ["physarum", "tiefe"]);
  assert.ok(Math.abs(L[1].lokal - (mitte - s.von)) < 1e-9, "eigene Zeit des Effekts");
  assert.equal(A.laufend(z, 0)[0].lokal, 0);
  assert.match(A.dateiname(new Date(2026, 9, 17, 9, 5), "mp4"), /^phorma-ii-2026-10-17-0905\.mp4$/);
});

/** Testbild: Himmel mit Verlauf, Sonne, ein roter Block vorn, Wiese mit Rauschen (w × h, RGBA) */
function testbild(w, h) {
  const d = new Uint8ClampedArray(w * h * 4);
  let s = 7;
  const r = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, v = y / h;
    let c = [60 + 120 * v, 110 + 80 * v, 220, 255];
    if ((x - w * 0.65) ** 2 + (y - h * 0.22) ** 2 < (w * 0.08) ** 2) c = [255, 230, 120, 255];
    if (v > 0.62) { const n = r() * 50; c = [40 + n, 120 + n, 40, 255]; }
    if (x > w * 0.3 && x < w * 0.55 && v > 0.55 && v < 0.85) c = [200, 40, 30, 255];
    d.set(c, i);
  }
  return d;
}

test("Analyse: Tiefe 0..1 (die Wiese vorn näher als der Himmel), Nahrung, Keime, Tonumfang; gleiches Foto, gleiches Ergebnis", () => {
  const w = 135, h = 169, d = testbild(w, h), E = analysieren(d, w, h, { massstab: 2 });
  assert.equal(E.tiefe.length, w * h);
  assert.ok(E.tiefe.every((v) => v >= 0 && v <= 1));
  const mittel = (y0, y1) => { let s = 0, n = 0; for (let y = Math.round(y0 * h); y < Math.round(y1 * h); y++) for (let x = 0; x < w; x++) { s += E.tiefe[y * w + x]; n++; } return s / n; };
  assert.ok(mittel(0.85, 1) > mittel(0, 0.15) + 0.2, `unten näher als oben (${mittel(0.85, 1).toFixed(2)} / ${mittel(0, 0.15).toFixed(2)})`);
  assert.ok(E.nahrung.length === w * h && E.nahrung.every((v) => v >= 0 && v <= 1));
  assert.ok(E.ton[0] < E.ton[1] && E.mittel > 0 && E.mittel < 1, "Tonumfang und mittlere Helligkeit");
  assert.ok(E.keime.length >= 5 && E.keime.length <= 22 && E.keime.every(([u, v]) => u >= 0 && u <= 1 && v >= 0 && v <= 1));
  const F = analysieren(d, w, h, { massstab: 2 });
  assert.deepEqual([...F.tiefe.slice(0, 50)], [...E.tiefe.slice(0, 50)]);
  assert.deepEqual(F.keime, E.keime);
});

test("Tuch: die Bahn wird ganz vorausgerechnet, ist wiederholbar und endet genau an ihrem Platz", async () => {
  const { tuchBahn } = await import(new URL("tuchsim.js", P).href);
  for (const kette of ["tuch", "tiefe+tuch"]) {
    const teil = A.kette(kette).teile.at(-1), tiefe = new Float32Array(64).fill(0.7);
    const a = tuchBahn({ teil, a: 0.8, nx: 24, tiefe, tw: 8, th: 8 }), b = tuchBahn({ teil, a: 0.8, nx: 24, tiefe, tw: 8, th: 8 });
    assert.equal(a.bilder, Math.ceil(teil.dauer * 30) + 1);
    assert.deepEqual(a.lagen.slice(0, 3000), b.lagen.slice(0, 3000), `${kette}: wiederholbar`);
    const ende = a.lagen.subarray((a.bilder - 1) * a.N * 3);
    assert.ok(ende.every((v, i) => Math.abs(v - a.heim[i]) < 1e-6), `${kette}: am Ende glatt an ihrem Platz`);
    const mitte = a.lagen.subarray(Math.round(a.bilder * 0.4) * a.N * 3, (Math.round(a.bilder * 0.4) + 1) * a.N * 3);
    assert.ok(Math.max(...mitte.map((v, i) => Math.abs(v - a.heim[i]))) > 0.2, `${kette}: dazwischen weht es`);
    if (kette === "tiefe+tuch") assert.ok(Math.abs(a.lagen[2 + 3 * 30] - 0.2 * 0.3) < 1e-6, "nach der Tiefe beginnt es als Relief");
  }
});

test("KI-Tiefe: wird an die Kanten gelegt und auf 0..1 gebracht", () => {
  const w = 60, h = 80, roh = new Float32Array(w * h), hell = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { roh[y * w + x] = 3 + 7 * (y / h); hell[y * w + x] = x < w / 2 ? 0.2 : 0.8; }
  const d = tiefeNormieren(roh, w, h, hell);
  assert.ok(d.every((v) => v >= 0 && v <= 1));
  assert.ok(d[(h - 2) * w + 5] > d[w + 5] + 0.5, "unten nah bleibt nah");
});

test("Gewebe: für sich, nicht in der Kette; mit Tonspur so lang wie die Musik und ohne Tempo", () => {
  assert.equal(A.ablaufName("gewebe"), "gewebe");
  assert.equal(A.ablaufName("gewebe+tuch"), "tuch", "das Gewebe lässt sich nicht verketten");
  const ohne = A.zeitachse({ ablauf: "gewebe", tempo: "ruhig" });
  assert.deepEqual(ohne.phasen.map((p) => p.name), ["zeichen", "gewebe", "bild"]);
  assert.equal(ohne.tempo, 1.3);
  const mit = A.zeitachse({ ablauf: "gewebe", tempo: "ruhig", laenge: 40 });
  assert.equal(mit.tempo, 1, "mit Tonspur gibt die Musik das Tempo");
  assert.ok(Math.abs(mit.abschnitt.bis - mit.abschnitt.von - 40) < 1e-9, "der Effekt dauert so lange wie verlangt");
  assert.ok(A.zeitachse({ ablauf: "gewebe", laenge: 2 }).phasen[1].bis - A.zeitachse({ ablauf: "gewebe", laenge: 2 }).phasen[1].von >= 5, "mindestens 5 s Gewebe");
  assert.equal(A.zeitachse({ ablauf: A.KETTE, laenge: 40 }).dauer, A.zeitachse({ ablauf: A.KETTE }).dauer, "die Kette kümmert sich nicht um die Länge");
});

test("Gewebe: Zustände bei kräftigen Einsätzen, Lücken gefüllt; das Tor öffnet beim Schlag und schliesst dazwischen; die Struktur gibt es nicht mehr", () => {
  assert.equal(A.ablaufName("struktur"), "gewebe", "eine gespeicherte Struktur wird zum Gewebe");
  assert.deepEqual(A.MIT_TON, ["gewebe"]);
  const ein = [1, 1.3, 2, 2.4, 9, 9.5, 16].map((t, i) => ({ t, staerke: i % 2 ? 0.3 : 0.8 }));
  const Tk = { einsaetze: ein, schnitte: [9] };
  const z = T.gewebeZustaende(Tk, 0.5, 20);
  assert.deepEqual(z.map((x) => x.t), [2, 5, 9, 12, 16], "kräftige Einsätze ≥ 0,7 s auseinander (auch vom Anfang), Lücken über 4 s alle 3 s gefüllt");
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
  assert.ok(t.tor[b1 + 3] > 0.4 && t.tor[b1 + 3] > 3 * t.tor[b1 + 35], "das Tor: auf beim Schlag, zu dazwischen");
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
  assert.ok(!nan && max <= 0.95 && max > 0.9, `Spitze ${max}`);
  assert.ok(unterschied > 0, "stereo: Panorama und Ping-Pong-Echo");
  const mono = f.kanaele[0].map((v, i) => (v + f.kanaele[1][i]) / 2), t = T.tonAnalysieren(mono, rate);
  assert.ok(t.einsaetze.length > 2 * f.takte, `ein Stück mit vielen Einsätzen (${t.einsaetze.length})`);
  assert.deepEqual(Fr.frickeln([pcm], rate, { samen: 3 }).kanaele[0].slice(0, 50000), f.kanaele[0].slice(0, 50000), "derselbe Wurf, dasselbe Stück");
  assert.notDeepEqual(Fr.frickeln([pcm], rate, { samen: 4 }).kanaele[0].slice(0, 50000), f.kanaele[0].slice(0, 50000), "ein neuer Wurf klingt anders");
  for (const q of [new Float32Array(rate), Float32Array.from({ length: 300 }, (_, i) => Math.sin(i))]) {
    const s = Fr.frickeln([q, q], rate, { samen: 1, takte: 2 });
    assert.ok(s.kanaele.every((c) => c.every((v) => Number.isFinite(v) && Math.abs(v) <= 0.95)));
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

test("Seite: Alpha (noindex), three.js lokal mit fester Version, gleiche ?v=-Marken, nichts von aussen ausser der KI auf Wunsch", () => {
  const html = lies("index.html");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<title>PHORMA II – Ornament Cloud · Alpha<\/title>/);
  assert.match(html, /"three": "\.\.\/\.\.\/vendor\/three-0\.185\.1\/three\.module\.min\.js"/);
  assert.ok(!/<script[^>]+src="https?:/.test(html), "keine Skripte von aussen");
  for (const e of A.EFFEKTE) { assert.match(html, new RegExp(`data-effekt="${e}"`)); assert.match(html, new RegExp(`data-wahl="${e}"`), `${e} einzeln wählbar`); }
  assert.match(html, /data-wahl="physarum\+tiefe\+tuch"/, "die ganze Kette als Karte");
  assert.match(html, /data-wahl="gewebe"/, "das Gewebe als eigene Karte");
  assert.ok(!/data-wahl="struktur"/.test(html), "keine Struktur mehr");
  assert.match(html, /data-quelle="foto"[\s\S]*data-quelle="text"[\s\S]*data-quelle="video"[\s\S]*data-quelle="ton">Nur Ton/, "Foto, Text, Video oder nur Ton als Quelle");
  assert.match(html, /id="videodatei"[^>]*accept="video\/\*/, "eine Videodatei");
  assert.match(html, /id="tondatei"[^>]*accept="audio\/\*/, "eine Audiodatei");
  assert.match(html, /id="ton-im-video" checked> Ton an/, "Ton ausschaltbar");
  assert.match(html, /id="frickeln"> Verfrickeln[\s\S]*id="wuerfeln"/, "Verfrickeln als Option, mit neuem Wurf");
  assert.ok(!/data-(wahl|effekt)="(stich|muster)"|data-(strich|muster)=/.test(html), "weder Stich noch Morphogenese");
  const dateien = readdirSync(P).filter((f) => f.endsWith(".js")), marken = new Set();
  for (const f of dateien) {
    const js = lies(f);
    for (const m of js.matchAll(/"\.\/([a-z-]+\.js)(\?v=\d+)?"/g)) { assert.ok(m[2], `${f}: ${m[1]} mit Marke`); marken.add(m[2]); }
    if (f !== "tiefe-ki.js") assert.ok(!/https?:\/\//.test(js.replace(/\/\/.*$/gm, "")), `${f}: keine Adressen von aussen`);
  }
  assert.match(lies("tiefe-ki.js"), /const VERSION = "3\.8\.1";[\s\S]*@huggingface\/transformers@\$\{VERSION\}\/dist\//, "transformers.js mit fester Version");
  assert.equal(marken.size, 1, `eine Marke für alle eigenen Module (${[...marken]})`);
  assert.match(lies("app.js"), /import\("\.\/tiefe-ki\.js\?v=\d+"\)/, "die KI erst auf Wunsch geladen");
});
