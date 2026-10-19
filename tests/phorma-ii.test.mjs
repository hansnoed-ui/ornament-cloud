// PHORMA II (alpha/phorma-ii/) – Tests ohne Browser: Ablauf und Kette, Plan der Montage, Bahn des Wachstums, Bildanalyse (Tiefe, Kanten, Keime, Tonumfang), Bahn des Tuchs, MP4,
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
  for (const k of ["wachstum+montage", "physarum+montage", "tiefe+montage"]) assert.equal(A.kette(k).teile[0].uebergang, "felder", `${k}: in Rechtecken in die Montage`);
  assert.equal(A.kette("wachstum+montage").teile[0].phasen.at(-1)[0], "farbe", "das Wachstum zeigt vor der Montage das Foto nicht");
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
    assert.ok(!teil.vonFoto, "beginnt nie beim fertigen Foto");
    if (kette !== "montage") {
      const tuch = A.kette(kette).teile[0];
      assert.equal(tuch.uebergang, "felder", "Rechtecke schneiden das Tuch weg");
      assert.ok(!tuch.phasen.some(([n]) => n === "bild") && tuch.ueber > 0.5, "das Tuch zeigt das Foto nicht, die Montage liegt schon darunter");
    }
    const S = plan.schnitte;
    assert.ok(S.length >= 8, `genug Schnitte (${S.length})`);
    for (let i = 1; i < S.length; i++) {
      const schlag = S[i].stotter ? S[i].t - 0.3 * M.TAKT : S[i].t;   // ein Doppelschnitt kommt kurz nach dem Schlag
      assert.ok(S[i].t > S[i - 1].t && Math.abs(schlag / M.TAKT - Math.round(schlag / M.TAKT)) < 1e-9, "auf dem Schlag, aufsteigend");
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
    let geteilt = 0, alle = 0;
    for (const dicht of S.filter((s) => s.felder.length > 40)) {
      const zahl = new Map();
      for (const f of dicht.felder) zahl.set(f.tf, (zahl.get(f.tf) ?? 0) + 1);
      geteilt += dicht.felder.filter((f) => zahl.get(f.tf) > 1).length; alle += dicht.felder.length;
    }
    assert.ok(geteilt >= alle * 0.15, `viele Felder teilen den Ausschnitt mit Nachbarn aus demselben Elternfeld (${geteilt} von ${alle})`);
    const dicht = S.find((s) => s.felder.length > 40);
    assert.ok(new Set(dicht.felder.map((f) => f.art)).size >= 3, "verschiedene Arten");
    const alleFelder = S.flatMap((s) => s.felder);
    assert.ok(alleFelder.some((f) => f.stil) && alleFelder.some((f) => f.zeit), "Felder gespiegelt, verpixelt, versetzt … und mit Video zeitversetzt");
    assert.ok(S.some((s) => s.stotter), "Doppelschnitte");
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
  // das Signet am Schluss: bis in die Mitte seines Stehens, nur dichte Schnitte im schnellen Takt, die Zone nicht bis an den Rand, zuletzt exakt
  const teilS = M.signetTeil(), logo = M.montagePlan(G, teilS, { a: 0.8, takt: M.SIGNET_TAKT, n0: 12, raender: false, licht: false });
  assert.ok(Math.abs(teilS.dauer - (A.SIGNET + 0.3)) < 0.01, "so lang wie das Signet und die erste Hälfte seines Stehens");
  assert.ok(logo.schnitte.every((s, i) => i < 3 || s.dicht) && logo.schnitte.length >= 5, "nur dichte Schnitte");
  for (const s of logo.schnitte) assert.ok(s.zone[0] > 0 && s.zone[2] < 1 && s.zone[3] < 1, "die Zone bleibt um das Signet");
  assert.equal(M.montageBei(logo, teilS.dauer - 0.05).ende, 1);
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
  // endet die Kette mit der Montage, geht das Foto nach kurzem Stehen nahtlos ins Signet über
  const m = A.zeitachse({ ablauf: "tuch+montage" });
  assert.ok(m.nahtlos && !m.ab.bildAus && !m.ab.pause && Math.abs(m.ab.signet[0] - m.abschnitt.bis) < 1e-9, "nahtlos: ohne Schlussbild geradewegs ins Signet");
  assert.ok(!z.nahtlos && z.ab.bildAus, "sonst wie bisher: Foto aus, Pause, Signet");
  assert.ok(!A.zeitachse({ ablauf: "montage", signet: false }).nahtlos, "ohne Signet nichts zu überblenden");
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

test("Wachstum: die Linie wächst aus dem Keim ins Motiv (nicht in den Grund), dicht im Hellen, wiederholbar", async () => {
  const W = await import(new URL("wachstumsim.js", P).href);
  // ein heller Kreis (Motiv) vor einer ruhigen grünen Wand
  const w = 80, h = 100, rgb = new Uint8ClampedArray(w * h * 4), hell = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, drin = Math.hypot(x - 40, y - 48) < 26, c = drin ? [200 + (x % 7) * 5, 150, 120] : [150, 205, 185];
    rgb.set([...c, 255], i * 4); hell[i] = (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255 * (drin && x > 40 ? 1 : 0.6);
  }
  const maske = W.wachsfeld({ w, h, rgb });
  assert.ok(maske && maske[48 * w + 40] > 0.9 && maske[5 * w + 5] < 0.1, "der Grund ist aus der Farbe des Rands erkannt");
  assert.equal(W.wachsfeld({ w, h, rgb: new Uint8ClampedArray(w * h * 4).fill(128) }), null, "ein einfarbiges Bild: überall");
  const { abstand } = W.abstandsfeld({ w, h, hell, maske });
  assert.ok(abstand[48 * w + 60] < abstand[48 * w + 20], "im Hellen enger");
  const teil = A.kette("wachstum").teile[0], auftrag = { teil, w, h, hell, rgb, dichte: 1.2 };
  assert.deepEqual(teil.phasen.map((p) => p[0]), ["keim", "wachstum", "farbe", "bild"]);
  const b = W.wachstumBahn(auftrag), b2 = W.wachstumBahn(auftrag);
  assert.equal(b.bilder, Math.round((1.2 + 6.6 + 2.4) * 30) + 1);
  assert.ok(b.anzahl[0] < 40 && b.anzahl.at(-1) > 300, `wächst (${b.anzahl[0]} → ${b.anzahl.at(-1)} Punkte)`);
  let drin = 0;
  const n = b.anzahl.at(-1), o = b.ab.at(-2) * 2;
  for (let i = 0; i < n; i++) { const x = b.lagen[o + i * 2] / W.ACHTEL, y = b.lagen[o + i * 2 + 1] / W.ACHTEL; if (Math.hypot(x - 40, y - 48) < 30) drin++; }
  assert.ok(drin / n > 0.9, `die Linie bleibt im Motiv (${(100 * drin / n).toFixed(0)} %)`);
  assert.deepEqual(b.lagen, b2.lagen, "wiederholbar");
  // in Päckchen (für die Vorschau, während der Rest rechnet): dieselben Bilder
  const einzeln = [], jeBild = (f, l) => { einzeln[f] = l; };
  W.wachstumBahn({ ...auftrag, jeBild });
  assert.equal(jeBild.bilder, b.bilder);
  assert.deepEqual(Array.from(einzeln.at(-1)), Array.from(b.lagen.subarray(b.ab.at(-2) * 2)), "das letzte Bild gleich");
});

test("Video als Quelle: es läuft ab dem ersten von Montage und Wachstum bis zum Ende; das Standbild ist sein letztes Bild", async () => {
  const F = await import(new URL("filmquelle.js", P).href);
  const ohne = F.videoPlan("physarum+tiefe+tuch");
  assert.equal(ohne.lebendig, false); assert.equal(ohne.dauer, 0, "ohne Montage und Wachstum steht das Video: das Standbild ist sein erstes Bild");
  const K = A.kette("tuch+wachstum+montage"), p = F.videoPlan("tuch+wachstum+montage");
  assert.ok(p.lebendig && Math.abs(p.von - K.teile[1].von) < 1e-9 && Math.abs(p.von + p.dauer - K.dauer) < 1e-9, "vom Wachstum bis zum Schluss");
  assert.equal(F.videoStelle(p, 0), 0); assert.equal(F.videoStelle(p, p.von + 2), 2); assert.equal(F.videoStelle(p, 999), p.dauer);
  const z = A.zeitachse({ ablauf: "montage", tempo: "ruhig" }), pm = F.videoPlan("montage");
  assert.ok(Math.abs(F.videoStelleBei(z, pm, z.abschnitt.von + 1.3) - 1) < 1e-9, "ruhig: das Video läuft langsamer");
  assert.ok(Math.abs(F.videoStelleBei(z, pm, z.dauer) - pm.dauer) < 1e-9, "nach der Kette das Standbild");
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
  assert.ok(!/data-wahl="(gewebe|struktur)"|data-quelle=|id="(tondatei|videodatei|text|frickeln)"/.test(html), "kein Gewebe, kein Ton, kein Text: das ist PHORMA III");
  assert.match(html, /id="datei" accept="image\/\*,video\/\*"/, "Foto oder Video (seit Etappe 2 von Montage und Wachstum)");
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
