// «Sketchory» (alpha/sketchory/, seit 12. Oktober 2026): Striche aus dem Bild, Ablauf des Films, MP4-Schreiber, Aufbau der Seite.
//   node --test tests/sketchory.test.mjs
// Im Browser (Beispielkarte, Vorschau, Video auf beiden Wegen, Handy): NODE_PATH=$(npm root -g) node tests/sketchory.e2e.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { striche, otsu, median, analyseMass, ANALYSE } from "../alpha/sketchory/strich.js";
import { zeitachse, umbrechen, satzbild, zeichenplan, zeichenkurve, bezier, textEin, dateiname, FPS, SIGNET } from "../alpha/sketchory/ablauf.js";
import { mp4, kisten } from "../alpha/sketchory/mp4.js";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");

/** künstliche Karte: Papier mit Verlauf (wie ein Foto mit Schatten), ein Kreis, eine Linie, ein ausgefüllter Punkt; Linien dunkel oder hell */
function karte({ hell = true, w = 600, h = 800 } = {}) {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const papier = 235 - (x / w) * 50 - (y / h) * 30;                       // Schatten nach rechts unten
    const kreis = Math.abs(Math.hypot(x - 300, y - 300) - 180) < 2.5;
    const linie = Math.abs(y - 650) < 2.5 && x > 100 && x < 500;
    const punkt = Math.hypot(x - 300, y - 300) < 14;
    const tinte = kreis || linie || punkt;
    const v = hell ? (tinte ? 30 : papier) : (tinte ? 235 : 20);
    const i = (y * w + x) * 4;
    rgba[i] = rgba[i + 1] = rgba[i + 2] = v; rgba[i + 3] = 255;
  }
  return { rgba, w, h };
}

test("Striche: dunkle Linien auf hellem Papier und helle auf dunklem ergeben dieselbe Zeichnung", () => {
  const a = karte({ hell: true }), b = karte({ hell: false });
  const ra = striche(a.rgba, a.w, a.h), rb = striche(b.rgba, b.w, b.h);
  assert.equal(ra.info.umgekehrt, true, "helles Papier wird umgekehrt");
  assert.equal(rb.info.umgekehrt, false);
  for (const r of [ra, rb]) {
    const flaechen = r.striche.filter((s) => s.flaeche), linien = r.striche.filter((s) => !s.flaeche);
    assert.equal(flaechen.length, 1, "der ausgefüllte Punkt ist eine Fläche");
    assert.equal(linien.length, 2, `Kreis und Linie, je ein Strich (${linien.length})`);
    const kreis = linien.find((s) => s.zu);
    assert.ok(kreis, "der Kreis ist geschlossen");
    // nah an der Form: alle Punkte auf dem Kreis (Radius 180, ±2)
    for (let i = 0; i < kreis.x.length; i++) assert.ok(Math.abs(Math.hypot(kreis.x[i] - 300, kreis.y[i] - 300) - 180) < 2, "Kreis bleibt Kreis");
    assert.ok(Math.abs(kreis.laenge - 2 * Math.PI * 180) < 30, `Länge ${kreis.laenge}`);
    const linie = linien.find((s) => !s.zu);
    assert.ok(linie.laenge > 380 && linie.laenge < 410, `Linie ${linie.laenge}`);
    assert.ok(linie.y.every((y) => Math.abs(y - 650) < 1.5));
    assert.ok(r.rTyp > 1.5 && r.rTyp < 4.5, `Halbbreite ${r.rTyp}`);
    // gleichmässig abgetastet
    for (let i = 1; i < linie.x.length - 1; i++) assert.ok(Math.abs(Math.hypot(linie.x[i] - linie.x[i - 1], linie.y[i] - linie.y[i - 1]) - 1.5) < 0.2);
  }
});

test("Striche: Staub fällt weg, die Empfindlichkeit verschiebt die Schwelle, ein leeres Blatt gibt nichts", () => {
  const { rgba, w, h } = karte();
  // ein paar kleine dunkle Flecken (Staub, 2 × 2 Pixel)
  for (const [x, y] of [[50, 50], [520, 90], [80, 760]]) for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { const i = ((y + dy) * w + x + dx) * 4; rgba[i] = rgba[i + 1] = rgba[i + 2] = 20; }
  const r = striche(rgba, w, h);
  assert.equal(r.striche.length, 3);
  assert.ok(r.info.staub >= 3);
  assert.ok(striche(rgba, w, h, { empfindlichkeit: 50 }).info.schwelle < striche(rgba, w, h, { empfindlichkeit: -50 }).info.schwelle);
  const leer = new Uint8ClampedArray(w * h * 4).fill(230);
  assert.equal(striche(leer, w, h).striche.length, 0);
});

test("Striche: Reihenfolge wie mit dem Stift, oben beginnend", () => {
  const { rgba, w, h } = karte();
  const r = striche(rgba, w, h);
  const oben = Math.min(...r.striche.map((s) => Math.min(s.y[0], s.y[s.y.length - 1])));
  assert.equal(Math.min(r.striche[0].y[0], r.striche[0].y.at(-1)), oben);
});

test("Hilfen: Otsu, Median, Grösse des Analysebilds", () => {
  const werte = new Float32Array(1000).map((_, i) => (i < 700 ? 20 : 220));
  const s = otsu(werte);
  assert.ok(s > 20 && s < 220);
  assert.equal(median(werte), 20);
  assert.deepEqual(analyseMass(3023, 3779), [1120, ANALYSE]);
  assert.deepEqual(analyseMass(800, 600), [800, 600], "kleine Bilder bleiben");
});

test("Ablauf: Zeichnen 4,5 s, 2 s stehen, ausblenden, Satz, Signet in voller Länge am Schluss", () => {
  const z = zeitachse({ zeichnen: 4.5, text: "Wer zeichnet, denkt mit der Hand." });
  const { ab } = z;
  assert.deepEqual(Object.keys(ab), ["vor", "zeichnen", "stehen", "bildAus", "pause", "textEin", "textStehen", "textAus", "pause2", "signet", "nach"]);
  assert.equal(ab.zeichnen[1] - ab.zeichnen[0], 4.5);
  assert.equal(ab.stehen[1] - ab.stehen[0], 2);
  assert.ok(ab.textEin[0] >= ab.bildAus[1], "der Satz kommt erst nach dem Bild");
  assert.ok(ab.textStehen[1] - ab.textStehen[0] >= 2);
  assert.ok(Math.abs(ab.signet[1] - ab.signet[0] - SIGNET) < 1e-9);
  assert.equal(SIGNET * FPS, 180, "wie das Outro der Videos");
  assert.equal(ab.nach[1], z.dauer);
  assert.equal(z.bilder, Math.round(z.dauer * FPS));
  // ohne Satz kein Textteil
  const ohne = zeitachse({ zeichnen: 5, text: "  " });
  assert.ok(!("textEin" in ohne.ab));
  assert.ok(ohne.dauer < z.dauer);
  assert.ok(textEin(20) <= 2.1, "auch ein langer Satz blendet zügig ein");
});

test("Ablauf: Umbruch ausgeglichen und begrenzt, Schrift schrumpft bei langen Sätzen", () => {
  const messen = (s) => s.length * 10;
  const zeilen = umbrechen("eins zwei drei vier fünf sechs sieben".split(" "), messen, 250);
  assert.ok(zeilen.every((z) => messen(z.join(" ")) <= 250));
  const laengen = zeilen.map((z) => z.join(" ").length);
  assert.ok(Math.max(...laengen) - Math.min(...laengen) <= 8, `ausgeglichen: ${laengen}`);
  const lang = satzbild("Ein ".repeat(60).trim(), (s, g) => s.length * g * 0.5);
  assert.ok(lang.groesse < 66 && lang.zeilen.length <= 5 || lang.groesse === 40);
  assert.equal(satzbild("Kurz.", (s, g) => s.length * g * 0.5).zeilen.length, 1);
});

test("Ablauf: Zeichenplan nach Länge, Kurve, Bézier, Dateiname", () => {
  const plan = zeichenplan([{ laenge: 100 }, { laenge: 300 }, { laenge: 0 }]);
  assert.equal(plan[0][0], 0);
  assert.equal(plan.at(-1)[1], 1);
  for (let i = 1; i < plan.length; i++) assert.ok(plan[i][0] > plan[i - 1][1], "Pausen zum Absetzen dazwischen");
  assert.ok(plan[1][1] - plan[1][0] > 2.5 * (plan[0][1] - plan[0][0]), "längere Striche brauchen länger");
  assert.equal(zeichenkurve(0), 0); assert.equal(zeichenkurve(1), 1);
  for (let u = 0.05; u < 1; u += 0.05) assert.ok(zeichenkurve(u) > zeichenkurve(u - 0.05));
  const b = bezier(0.16, 1, 0.3, 1);
  assert.equal(b(0), 0); assert.equal(b(1), 1); assert.ok(b(0.3) > 0.8, "läuft sanft aus");
  assert.equal(dateiname(new Date(2026, 9, 12, 9, 5), "mp4"), "sketchory-2026-10-12-0905.mp4");
});

test("MP4: ftyp, moov vor mdat, Bilder, Schlüsselbilder, Länge und Lage stimmen", () => {
  const proben = Array.from({ length: 45 }, (_, i) => ({ daten: new Uint8Array(10 + i).fill(i), key: i % 30 === 0 }));
  const avcC = new Uint8Array([1, 0x64, 0, 0x28, 0xff, 0xe1, 0, 4, 0x67, 0x64, 0, 0x28, 1, 0, 2, 0x68, 0xee]);
  const d = mp4({ breite: 1080, hoehe: 1440, fps: 30, avcC, proben });
  const k = kisten(d);
  assert.deepEqual(k.map((x) => x.typ), ["ftyp", "moov", "mdat"], "moov vorne (faststart)");
  const finde = (liste, ...pfad) => pfad.reduce((l, t) => (Array.isArray(l) ? l : l.kinder).find((x) => x.typ === t), liste);
  const v = new DataView(d.buffer);
  const mvhd = finde(k, "moov").kinder.find((x) => x.typ === "mvhd");
  assert.equal(v.getUint32(mvhd.o + 20), 1000, "Zeitbasis des Films");
  assert.equal(v.getUint32(mvhd.o + 24), 1500, "45 Bilder bei 30/s = 1,5 s");
  const stbl = finde(k, "moov", "trak", "mdia", "minf", "stbl");
  const kind = (t) => stbl.kinder.find((x) => x.typ === t);
  assert.equal(v.getUint32(kind("stsz").o + 16), 45);
  assert.equal(v.getUint32(kind("stsz").o + 20 + 4 * 44), 54, "Grösse des letzten Bilds");
  assert.equal(v.getUint32(kind("stss").o + 12), 2, "zwei Schlüsselbilder");
  assert.deepEqual([v.getUint32(kind("stss").o + 16), v.getUint32(kind("stss").o + 20)], [1, 31]);
  const lage = v.getUint32(kind("stco").o + 16), mdat = k[2];
  assert.equal(lage, mdat.o + 8, "die Bilder beginnen gleich nach dem Kopf von mdat");
  assert.equal(d[lage + 10], 1, "zweites Bild an seinem Platz");
  assert.equal(mdat.groesse, 8 + proben.reduce((s, p) => s + p.daten.length, 0));
  // avcC unverändert in der Beschreibung
  const text = String.fromCharCode(...d);
  assert.ok(text.includes("avc1") && text.includes("avcC") && text.includes("colr"));
  const at = text.indexOf("avcC") + 4;
  assert.deepEqual([...d.subarray(at, at + avcC.length)], [...avcC]);
});

test("Seite: Alpha (noindex, Navigation, nur aus der Übersicht verlinkt), Versionsmarken, nichts von fremden Servern", () => {
  const html = lies("alpha/sketchory/index.html");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<nav class="seitenweg" aria-label="Ornament Cloud">\s*<a href="\.\.\/\.\.\/" aria-current="true">Ornament Cloud<\/a>\s*<a href="\.\.\/drittes-rad\/">Das Dritte Rad<\/a>\s*<\/nav>/);
  assert.ok(!/(src|href)="https?:\/\/(?!ornament-cloud\.goatcounter)/.test(html), "lädt nichts von fremden Servern");
  const marke0 = html.match(/<script type="module" src="app\.js\?v=(\d+)"><\/script>/)?.[1];
  assert.ok(marke0, "app.js mit Versionsmarke");
  // alle eigenen Module mit derselben Marke
  for (const f of ["app.js", "szene.js", "signet.js", "rechner.js"]) {
    const marken = [...lies(`alpha/sketchory/${f}`).matchAll(/"\.\/[a-z0-9]+\.js\?v=(\d+)"/g)].map((m) => m[1]);
    assert.ok(marken.length, f);
    assert.ok(marken.every((m) => m === marke0), `${f}: ${marken} (Seite: ${marke0})`);
  }
  // dauer.js von The Fictory mit derselben Marke wie dort
  const marke = (datei) => lies(datei).match(/from "\.{1,2}\/(?:the-fictory\/)?dauer\.js\?v=(\d+)"/)?.[1];
  assert.equal(marke("alpha/sketchory/app.js"), marke("alpha/the-fictory/app.js"));
  const js = ["app.js", "strich.js", "szene.js", "signet.js", "ablauf.js", "mp4.js", "rechner.js"].map((f) => lies(`alpha/sketchory/${f}`)).join("\n");
  assert.ok(!/https?:\/\//.test(js), "keine Adressen nach aussen");
  assert.ok(!/XMLHttpRequest|sendBeacon/.test(js));
  assert.ok(!/ß/.test(html + js), "Schweizer Schreibweise (ss)");
  const uebersicht = lies("alpha/index.html");
  assert.ok(uebersicht.includes('<a href="sketchory/">Sketchory</a>'));
});

test("Signet: dieselbe Zeichnung und derselbe Zeitplan wie im Outro der Videos", () => {
  const tsx = lies("src/videos/src/vorlage/Signet.tsx"), js = lies("alpha/sketchory/signet.js");
  for (const stueck of ["const LA = 1, LB = 0.45, LK = 1.2, LOFF = -0.84", "520 / SPANNE", "540 + (x - MX) * MASS, 820 + (y - MY) * MASS", 'const NAME = "ornament.cloud"', "SPERRUNG = 0.14 *"]) {
    assert.ok(tsx.includes(stueck), `Vorlage: ${stueck}`);
    assert.ok(js.includes(stueck), `Sketchory: ${stueck}`);
  }
  for (const zeit of ["14, 56", "40, 48", "128, 146", "58 + i * 2", "78 + i * 3"]) assert.ok(tsx.includes(zeit) && js.includes(zeit), zeit);
});
