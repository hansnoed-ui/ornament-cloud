// PHORMA II (alpha/phorma-ii/) – Tests ohne Browser: Ablauf und Kette, Plan der Montage, Bildanalyse (Tiefe, Kanten, Keime, Tonumfang), Bahn des Tuchs, MP4,
// Seite. Die Tests fürs Gewebe (Ton, Höhenlinien, Verfrickeln) stehen seit dem 18. Oktober 2026 in tests/phorma-iii.test.mjs.
//   node --test tests/phorma-ii.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const P = new URL("alpha/phorma-ii/", root);
const A = await import(new URL("ablauf.js", P).href);
const { analysieren, tiefeNormieren } = await import(new URL("analyse.js", P).href);
const lies = (p) => readFileSync(new URL(p, P), "utf8");

test("Ablauf: Effekte in fester Reihenfolge, Unbekanntes ergibt die ganze Kette", () => {
  assert.equal(A.ablaufName("tuch+physarum"), "physarum+tuch");
  assert.equal(A.ablaufName("quatsch"), A.KETTE);
  assert.equal(A.ablaufName(null), "physarum+tiefe+tuch");
  assert.deepEqual(A.effekte("tuch+tiefe"), ["tiefe", "tuch"]);
  assert.equal(A.ablaufName("stich"), A.KETTE, "der frühere Stich ergibt die ganze Kette");
  assert.equal(A.ablaufName("physarum+muster+tuch"), "physarum+tuch", "die frühere Morphogenese fällt weg");
  assert.equal(A.ablaufName("gewebe"), A.KETTE, "ein gemerktes Gewebe (seit dem 18. Oktober 2026 PHORMA III) ergibt die ganze Kette");
  assert.equal(A.ablaufName("struktur"), A.KETTE);
  assert.equal(A.ablaufName("montage+tuch"), "tuch+montage", "die Montage steht immer am Schluss");
});

test("Montage: der Plan – Schnitte im Takt, Felder ohne Lücke und Überlappung, geerbte Ausschnitte, Anfang dunkel, Ende exakt, wiederholbar", async () => {
  const M = await import(new URL("montageplan.js", P).href);
  // ein Kopf in der Mitte (nah, mit Kanten), der Grund fern
  const w = 60, h = 75, n = w * h, tiefe = new Float32Array(n), nahrung = new Float32Array(n), hell = new Float32Array(n).fill(0.7);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = Math.hypot((x - 30) / 14, (y - 35) / 22); tiefe[y * w + x] = d < 1 ? 0.9 : 0.2; nahrung[y * w + x] = Math.abs(d - 1) < 0.1 ? 1 : 0.05; }
  const G = M.wichtigkeit({ w, h, tiefe, nahrung, hell });
  const [m0, m1, m2, m3] = G.motiv;
  assert.ok(m0 > 0.15 && m2 < 0.85 && m1 > 0.05 && m3 < 0.95, `die Zone liegt um den Kopf (${G.motiv.map((v) => v.toFixed(2))})`);
  for (const kette of ["montage", "tuch+montage"]) {
    const teil = A.kette(kette).teile.at(-1), plan = M.montagePlan(G, teil, { a: 0.8 }), [, , bild] = teil.phasen;
    assert.deepEqual(teil.phasen.map((p) => p[0]), ["schnitte", "montage", "bild"]);
    assert.equal(teil.vonFoto, kette !== "montage", "nach dem Tuch beginnt sie beim Foto");
    const S = plan.schnitte;
    assert.ok(S.length >= 8, `genug Schnitte (${S.length})`);
    for (let i = 1; i < S.length; i++) {
      assert.ok(S[i].t > S[i - 1].t && Math.abs(S[i].t / M.TAKT - Math.round(S[i].t / M.TAKT)) < 1e-9, "auf dem Schlag, aufsteigend");
      assert.ok(S[i].t < plan.Bp[0], "im Bild kein Schnitt mehr");
    }
    assert.ok(S.at(-1).dicht && S.at(-1).felder.length >= 30, "die letzte Aufteilung ist dicht");
    for (const s of S) {
      const [z0, z1, z2, z3] = s.zone;
      let flaeche = 0;
      for (const f of s.felder) {
        const [x0, y0, x1, y1] = f.rect;
        assert.ok(x0 >= z0 - 1e-9 && y0 >= z1 - 1e-9 && x1 <= z2 + 1e-9 && y1 <= z3 + 1e-9 && x1 > x0 && y1 > y0, "Feld in der Zone");
        flaeche += (x1 - x0) * (y1 - y0);
      }
      assert.ok(Math.abs(flaeche - (z2 - z0) * (z3 - z1)) < 1e-9, "die Felder füllen die Zone genau");
    }
    const dicht = S.find((s) => s.felder.length > 40), geteilt = new Set(dicht.felder.map((f) => f.tf));
    assert.ok(geteilt.size < dicht.felder.length * 0.8, `viele Felder erben den Ausschnitt ihres Elternfelds (${geteilt.size} von ${dicht.felder.length})`);
    assert.ok(new Set(dicht.felder.map((f) => f.art)).size >= 3, "verschiedene Arten");
    // Ende: alle Felder an ihrem Platz
    const ende = M.montageBei(plan, teil.dauer - 1 / 30);
    assert.equal(ende.ende, 1);
    for (const f of ende.felder) {
      const [x0, y0, x1, y1] = f.rect, q = f.quelle;
      assert.ok(Math.abs(q[0] - (x0 + x1) / 2) < 1e-9 && Math.abs(q[2] - (x1 - x0)) < 1e-9 && f.rand < 1e-9, "eingerastet");
    }
    // Mitte: versetzt
    const mitte = M.montageBei(plan, (teil.phasen[0][2] + teil.phasen[1][2] / 2));
    assert.ok(mitte.felder.filter((f) => Math.abs(f.quelle[2] - (f.rect[2] - f.rect[0])) > 1e-6 || Math.abs(f.quelle[0] - (f.rect[0] + f.rect[2]) / 2) > 1e-6).length > 5, "in der Mitte zeigen viele Felder anderes");
    assert.deepEqual(M.montageBei(M.montagePlan(G, teil, { a: 0.8 }), 4.2), M.montageBei(plan, 4.2), "wiederholbar");
    assert.ok(bild[2] > 2);
  }
  const erst = M.montagePlan(G, A.kette("montage").teile[0], { a: 0.8 });
  assert.ok(M.montageBei(erst, 0.15).felder.every((f) => f.licht === 0), "als erster Effekt beginnt sie im Dunkeln");
  const t = M.aufteilung(G, { n: 60, dicht: true }, 5, 0.8).tafeln;
  assert.ok(t.length >= 1 && t.every((x) => x.y >= 0.08 && x.y <= 0.82 && /^index/.test(x.zeilen[0])), "Zahlentafeln mit Kopf, nicht unter der Beschriftung");
});

test("Kette: Physarum geht über eine Zeitfront in die Tiefe über, die Tiefe über eine kurze Front ins Tuch", () => {
  const K = A.kette(A.KETTE);
  assert.deepEqual(K.teile.map((t) => t.art), ["physarum", "tiefe", "tuch"], "die Karte «Alle drei» ohne die Montage");
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

test("MP4 in Teilen: dieselben Bytes wie mp4-muxer am Stück, moov vorn; nie die ganze Datei in einem Block", async () => {
  const { mp4Schreiber } = await import(new URL("mp4.js", P).href);
  const { Muxer, ArrayBufferTarget } = await import(new URL("vendor/mp4-muxer-5.2.2/mp4-muxer.js", root).href);
  const avcC = new Uint8Array([1, 0x64, 0, 0x28, 0xff, 0xe1, 0, 1, 0x67, 1, 0, 1, 0x68]), N = 400;
  const bild = (i) => new Uint8Array(3000 + ((i * 37) % 900)).map((_, j) => (i * 7 + j) & 255);
  const uhr = Date.now; Date.now = () => 1.7e12;   // mp4-muxer schreibt die Entstehungszeit in Sekunden: beide gleich
  try {
    const w = mp4Schreiber({ breite: 1080, hoehe: 1350, fps: 30, codec: "avc1.640028", bilder: N });
    for (let i = 0; i < N; i++) w.bild(bild(i), i % 60 === 0, Math.round((i * 1e6) / 30), avcC);
    const a = new Uint8Array(await w.fertig().arrayBuffer());
    const m = new Muxer({ target: new ArrayBufferTarget(), firstTimestampBehavior: "offset", fastStart: { expectedVideoChunks: N }, video: { codec: "avc", width: 1080, height: 1350, frameRate: 30 } });
    for (let i = 0; i < N; i++) m.addVideoChunkRaw(bild(i), i % 60 === 0 ? "key" : "delta", Math.round((i * 1e6) / 30), Math.round(1e6 / 30), i ? undefined : { decoderConfig: { codec: "avc1.640028", codedWidth: 1080, codedHeight: 1350, description: avcC } });
    m.finalize();
    assert.deepEqual(a, new Uint8Array(m.target.buffer));
    const f = new DataView(a.buffer).getUint32(0);
    assert.equal(String.fromCharCode(...a.subarray(f + 4, f + 8)), "moov", "moov gleich nach ftyp (schnelles Abspielen)");
  } finally { Date.now = uhr; }
});

test("Seite: Alpha (noindex), three.js lokal mit fester Version, gleiche ?v=-Marken, nichts von aussen ausser der KI auf Wunsch", () => {
  const html = lies("index.html");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<title>PHORMA II – Ornament Cloud · Alpha<\/title>/);
  assert.match(html, /"three": "\.\.\/\.\.\/vendor\/three-0\.185\.1\/three\.module\.min\.js"/);
  assert.ok(!/<script[^>]+src="https?:/.test(html), "keine Skripte von aussen");
  for (const e of A.EFFEKTE) { assert.match(html, new RegExp(`data-effekt="${e}"`)); assert.match(html, new RegExp(`data-wahl="${e}"`), `${e} einzeln wählbar`); }
  assert.match(html, /data-wahl="physarum\+tiefe\+tuch"/, "die ganze Kette als Karte");
  assert.ok(!/data-wahl="(gewebe|struktur)"|data-quelle=|id="(tondatei|videodatei|text|frickeln)"/.test(html), "kein Gewebe, kein Ton, kein Text, kein Video: das ist PHORMA III");
  assert.match(html, /href="\.\.\/phorma-iii\/"/, "Hinweis auf PHORMA III");
  for (const f of ["gewebe.js", "ton.js", "tonspur.js", "frickeln.js", "kurven.js", "textbild.js"]) assert.ok(!readdirSync(P).includes(f), `ohne ${f}`);
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
