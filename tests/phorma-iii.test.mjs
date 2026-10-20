// PHORMA III (alpha/phorma-iii/) – Tests ohne Browser: Ablauf mit Logo oder Bild (Gewebe) und Stille (Irrfahrt), Analyse, Ton, Zustände und
// Höhenlinien fürs Gewebe, der Zufallsweg der Irrfahrt,
// Verfrickeln, MP4 mit Tonspur, Seite. Bis zum 18. Oktober 2026 waren sie Teil von tests/phorma-ii.test.mjs.
//   node --test tests/phorma-iii.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const P = new URL("alpha/phorma-iii/", root);
const A = await import(new URL("ablauf.js", P).href);
const { analysieren } = await import(new URL("analyse.js", P).href);
const T = await import(new URL("ton.js", P).href);
const Kv = await import(new URL("kurven.js", P).href);
const Fr = await import(new URL("frickeln.js", P).href);
const St = await import(new URL("stimme.js", P).href);
const Ri = await import(new URL("risse.js", P).href);
const Bf = await import(new URL("bildfrickel.js", P).href);
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

test("Video: das Video, dann Logo oder Ende; so lang wie der Ton, danach nur der Schluss", () => {
  const mit = A.zeitachse({ ablauf: "video", laenge: 16 }), ohne = A.zeitachse({ ablauf: "video", laenge: 16, signet: false });
  assert.equal(A.ablaufName("video"), "video"); assert.equal(A.TITEL.video, "Video");
  assert.deepEqual(mit.phasen.map((p) => p.name), ["video", "logo"]);
  assert.deepEqual(ohne.phasen.map((p) => p.name), ["video", "ende"]);
  for (const z of [mit, ohne]) {
    assert.ok(Math.abs(z.abschnitt.bis - z.abschnitt.von - 16) < 1e-9, "so lang wie verlangt");
    assert.equal(z.ab.stehen, undefined); assert.ok(Math.abs(z.dauer - z.abschnitt.bis - 0.3) < 1e-9, "danach nur der Schluss");
  }
  assert.equal(A.NACH(false, "video"), 0.3);
});

test("Filmspur: Drehung aus der Matrix der Spur, Zuordnung der dekodierten Bilder zu den Filmbildern", async () => {
  const F = await import(new URL("alpha/phorma-iii/filmspur.js", root).href);
  const E = 65536;
  assert.equal(F.drehungAusMatrix([E, 0, 0, 0, E, 0, 0, 0, 1 << 30]), 0);
  assert.equal(F.drehungAusMatrix([0, E, 0, -E, 0, 0, 1080, 0, 1 << 30]), 90, "hochkant vom Telefon");
  assert.equal(F.drehungAusMatrix([-E, 0, 0, 0, -E, 0, 1920, 1080, 1 << 30]), 180);
  assert.equal(F.drehungAusMatrix([0, -E, 0, E, 0, 0, 0, 1920, 1 << 30]), 270);
  assert.equal(F.drehungAusMatrix(null), 0);
  // ein Video mit 25 Bildern je Sekunde ab 2 s: Filmbild k (30 je Sekunde) zeigt das Bild, das zuletzt begonnen hat
  const zeiten = Array.from({ length: 60 }, (_, i) => 1.96 + i / 25), k = F.zuordnen(zeiten, 2, 45);
  for (let i = 0; i < 45; i++) {
    const t = 2 + i / 30, j = k[i];
    assert.ok(zeiten[j] <= t + 1e-4 && (j + 1 >= zeiten.length || zeiten[j + 1] > t + 1e-4), `Filmbild ${i}`);
  }
  assert.equal(F.zuordnen([5, 6], 0, 3)[0], 0, "vor dem ersten Bild: das erste");
  assert.equal(F.HOECHSTENS, 30);
});

test("Irrfahrt und Lichtwürfel: Würfel, Irrfahrt, Logo oder Stille; kein Stehen, nach dem Effekt nur der Schluss; Unbekanntes ergibt das Gewebe", () => {
  assert.deepEqual(A.EFFEKTE, ["gewebe", "irrfahrt", "lichtwuerfel", "traube", "video"]);
  assert.equal(A.TITEL.lichtwuerfel, "Lichtwürfel");
  // der Lichtwürfel hat dieselbe Rolle wie die Irrfahrt
  const lw = A.zeitachse({ ablauf: "lichtwuerfel", laenge: 30 });
  assert.equal(lw.ablauf, "lichtwuerfel"); assert.deepEqual(lw.phasen.map((p) => p.name), ["wuerfel", "irrfahrt", "logo"]);
  assert.ok(Math.abs(lw.dauer - A.zeitachse({ ablauf: "irrfahrt", laenge: 30 }).dauer) < 1e-9); assert.equal(A.NACH(false, "lichtwuerfel"), 0.3);
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

test("Traube: Traube, Logo oder Stille (ohne eigene Phase Keim); kein Stehen, nach dem Effekt nur der Schluss; so lang wie der Ton", () => {
  assert.equal(A.TITEL.traube, "Traube"); assert.equal(A.ablaufName("traube"), "traube"); assert.equal(A.NACH(false, "traube"), 0.3);
  const mit = A.zeitachse({ ablauf: "traube", laenge: 30 }), ohne = A.zeitachse({ ablauf: "traube", laenge: 30, signet: false });
  assert.deepEqual(mit.phasen.map((p) => p.name), ["traube", "logo"]);
  assert.deepEqual(ohne.phasen.map((p) => p.name), ["traube", "stille"]);
  for (const z of [mit, ohne]) {
    assert.ok(Math.abs(z.abschnitt.bis - z.abschnitt.von - 30) < 1e-9, "so lang wie verlangt");
    assert.equal(z.ab.stehen, undefined); assert.ok(Math.abs(z.dauer - z.abschnitt.bis - 0.3) < 1e-9, "danach nur der Schluss");
  }
  assert.ok(Math.abs(mit.phasen[1].bis - mit.phasen[1].von - A.LOGO) < 1e-9);
  assert.ok(A.zeitachse({ ablauf: "traube", laenge: 2 }).phasen[0].bis - A.zeitachse({ ablauf: "traube", laenge: 2 }).phasen[0].von >= 3.2);
  // die Shader der Traube: keine Potenz einer Zahl, die negativ werden kann, und smoothstep nie mit gleichen Grenzen – beides ist auf Telefonen NaN,
  // und der Bloom schmiert ein NaN über das ganze Bild (Rückmeldung vom Telefon: «das Video bleibt dunkel»)
  const tr = lies("traube.js");
  assert.ok(!/pow\(\s*(sin|cos|1\.0 - n\.z|dot)\(/.test(tr) && !/pow\(1\.0 - n\.z/.test(tr), "pow nur von sicher nicht negativen Werten");
  assert.match(tr, /smoothstep\(abs\(vR - vB\), max\(vR \+ vB, abs\(vR - vB\) \+ 1e-5\)/, "smoothstep der Deckung mit verschiedenen Grenzen");
});

test("Traube: Perlen wiederholbar, in der Kugel, Ketten nach hinten kleiner; jede Art je vier Zustände einmal; die Schlaufe als Perlenschnur", async () => {
  const Tp = await import(new URL("traubenplan.js", P).href);
  const bau = Tp.traubenBau(560), a = new Float32Array(560 * 5), b = new Float32Array(560 * 5);
  Tp.perlenLegen(bau, { art: "kugel", saat: 10 }, 3.2, a); Tp.perlenLegen(bau, { art: "kugel", saat: 10 }, 3.2, b);
  assert.deepEqual(a, b, "dieselbe Zeit, dasselbe Bild");
  Tp.perlenLegen(bau, { art: "kugel", saat: 10 }, 3.4, b);
  assert.notDeepEqual(a, b, "mit der Zeit der Musik bewegt");
  let sichtbar = 0;
  for (let i = 0; i < 560; i++) {
    const r = a[i * 5 + 3], l = Math.hypot(a[i * 5], a[i * 5 + 1], a[i * 5 + 2]);
    assert.ok(Number.isFinite(l) && r >= 0 && r < 0.06, `Perle ${i}`);
    if (r > 0 && a[i * 5 + 4] < 0.5) { sichtbar++; assert.ok(l < 0.8, `in der Kugel der Fäden (${l.toFixed(2)})`); }
  }
  assert.ok(sichtbar > 300, `die meisten Perlen zu sehen (${sichtbar})`);
  // der Bass sprengt auf, der Schlag lässt schwellen
  const k = new Float32Array(560 * 5); Tp.perlenLegen(bau, { art: "kugel", saat: 10 }, 3.2, k, { knall: 1, puls: 1 });
  const weite = (q) => q.reduce((s, _, i) => (i % 5 === 0 ? s + Math.hypot(q[i], q[i + 1], q[i + 2]) : s), 0), groesse = (q) => q.reduce((s, v, i) => (i % 5 === 3 ? s + v : s), 0);
  assert.ok(weite(k) > weite(a) * 1.3 && groesse(k) > groesse(a) * 1.2);
  // nah: deutlich weniger Perlen, die Kette im Blick dabei
  const n = new Float32Array(560 * 5); Tp.perlenLegen(bau, { art: "nah", saat: 10 }, 3.2, n);
  const zahl = (q) => q.filter((v, i) => i % 5 === 3 && v > 0).length;
  assert.ok(zahl(n) < zahl(a) * 0.65, `nah weniger Perlen (${zahl(n)} gegen ${zahl(a)})`);
  // die Zeit der Traube: gleichmässig, ohne Sätze bei Schlägen und Sprünge bei Schnitten (Rückmeldung: «ruckelt stark, also verlangsamt und
  // verschnellert kontra-intuitiv»); laut nur sanft schneller
  const Tn = T.tonAnalysieren(Float32Array.from({ length: 22050 * 8 }, (_, i) => { const t = i / 22050, sc = t % 0.5; return (t > 4 ? 0.8 : 0.15) * Math.exp(-sc / 0.05) * Math.sin(i * 0.07); }), 22050);
  const zt = Tp.traubenZeit(Tn.laut), v = Array.from(zt.slice(1), (x, i) => (x - zt[i]) * 30);
  assert.ok(v.every((x) => x >= 0.359 && x <= 0.561), `Tempo zwischen 0,36 und 0,56 je Sekunde (${Math.min(...v).toFixed(3)} … ${Math.max(...v).toFixed(3)})`);
  assert.ok(v.slice(1).every((x, i) => Math.abs(x - v[i]) < 0.01), "kein Ruck von Bild zu Bild");
  assert.ok(v.at(-1) > v[30] + 0.05, "laut schneller als leise");
  // die Arten: in jedem Block zu acht die Säule nur einmal (halb so oft wie in Blöcken zu vier), alle Arten dabei, nie dieselbe zweimal hintereinander
  const arten = Array.from({ length: 80 }, (_, i) => Tp.artBei(i + 1));
  assert.equal(Tp.artBei(0), "kugel");
  for (let i = 0; i < 80; i += 8) { const b = arten.slice(i, i + 8); assert.deepEqual([...b].sort(), [...Tp.FOLGE].sort()); assert.equal(b.filter((a) => a === "saeule").length, 1); }
  for (let i = 1; i < 80; i++) assert.notEqual(arten[i], arten[i - 1], `Zustand ${i + 1}`);
  assert.deepEqual(Array.from({ length: 80 }, (_, i) => Tp.artBei(i + 1)), arten, "wiederholbar");
  // die Kamera: Ziel und Schärfe endlich, die Schärfe in der Nähe zieht nach
  for (const art of Tp.ARTEN) { const e = Tp.einstellung({ art, saat: 17 }, 1); assert.ok([...e.pos, ...e.ziel, e.fokus, e.apertur].every(Number.isFinite) && e.fokus > 0); }
  assert.ok(Tp.einstellung({ art: "nah", saat: 17 }, 0).fokus < Tp.einstellung({ art: "nah", saat: 17 }, 2.5).fokus);
  // die Schlaufe: mittig, wie im Signet 420 von 1920 Punkten hoch; Perlen gleichmässig, ohne sich zu überdecken, mit Beeren daneben
  const sw = Tp.schlaufeWelt(1080, 1350), xs = sw.filter((_, i) => i % 3 === 0), ys = sw.filter((_, i) => i % 3 === 1);
  assert.ok(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2) < 1e-6, "mittig");
  assert.ok(Math.abs(Math.max(...xs) - Math.min(...xs) - (420 / 1350) * 2) < 0.01 || Math.abs(Math.max(...ys) - Math.min(...ys) - (420 / 1350) * 2) < 0.01, "so gross wie im Signet");
  const { lage, anzahl } = Tp.perlenAufZuegen([sw], 150, { r: 0.017, abstand: 1.9, beeren: 30, saat: 9 });
  assert.ok(anzahl > 100 && anzahl <= 150, `${anzahl} Perlen`);
  for (let i = 1; i < anzahl - 30; i++) {
    const d = Math.hypot(lage[i * 4] - lage[i * 4 - 4], lage[i * 4 + 1] - lage[i * 4 - 3]);
    assert.ok(d > 0.9 * Math.max(lage[i * 4 + 3], lage[i * 4 - 1]) * 1.6, `Perle ${i} zu nah`);
  }
  assert.ok(lage[(anzahl - 1) * 4 + 3] > 0 && lage[anzahl * 4 + 3] === 0, "die übrigen leer");
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

/** eine künstliche Stimme: Silben (Grundton 120–180 Hz, drei Formanten), kurze und lange Pausen, dazu Rauschen und Brummen (50 Hz) */
function kunststimme(rate, dauer, { rauschen = 0.01 } = {}) {
  const n = Math.round(rate * dauer), x = new Float32Array(n), stimmhaft = new Uint8Array(n);
  let z = 9; const rnd = () => { z = (z * 1103515245 + 12345) & 0x7fffffff; return z / 0x7fffffff; };
  for (let t = 0.6; t < dauer - 0.8;) {
    const d = 0.12 + 0.25 * rnd(), f = 120 + 60 * rnd();
    for (let i = Math.round(t * rate); i < Math.round((t + d) * rate); i++) {
      const u = (i / rate - t) / d, huelle = Math.max(0, Math.sin(Math.PI * u)) ** 0.6, ph = 2 * Math.PI * f * (i / rate);
      let v = 0;
      for (let h = 1; h < 30; h++) { const fh = f * h; v += (Math.exp(-(((fh - 700) / 300) ** 2)) + 0.6 * Math.exp(-(((fh - 1800) / 400) ** 2)) + 0.3 * Math.exp(-(((fh - 2800) / 500) ** 2))) * Math.sin(ph * h) / h ** 0.3; }
      x[i] += 0.12 * huelle * v; stimmhaft[i] = 1;
    }
    t += d + (rnd() < 0.2 ? 0.45 : 0.06);
  }
  for (let i = 0; i < n; i++) x[i] += rauschen * (rnd() - 0.5) * 2 + 0.006 * Math.sin((2 * Math.PI * 50 * i) / rate);
  return { x, stimmhaft };
}

test("Stimme säubern: Rauschen und Brummen weg (Abstand zur Stimme über 40 dB statt gut 20), die Stimme bleibt, −16 LUFS, nie über −1 dBFS", () => {
  const rate = 44100, { x, stimmhaft } = kunststimme(rate, 8);
  const vorher = Fr.lautheit(x, x, rate) - St.grundrauschen(x, rate);
  const s = St.saeubern([x], rate), [L, R] = s.kanaele, m = L.map((v, i) => (v + R[i]) / 2);
  const nachher = Fr.lautheit(L, R, rate) - St.grundrauschen(m, rate);
  assert.ok(vorher < 30 && nachher > 40, `Abstand Stimme – Rauschen: ${vorher.toFixed(1)} → ${nachher.toFixed(1)} dB`);
  assert.ok(s.rauschenNachher < s.rauschenVorher - 10, `Grundrauschen ${s.rauschenVorher.toFixed(1)} → ${s.rauschenNachher.toFixed(1)} dBFS`);
  assert.ok(Math.abs(Fr.lautheit(L, R, rate) + 16) < 0.8, `−16 LUFS (${Fr.lautheit(L, R, rate).toFixed(1)})`);
  // Stille in den langen Pausen: mindestens 0,15 s von jeder Silbe entfernt (in kurzen Lücken klingt der Raum nach)
  const summe = new Int32Array(L.length + 1), rand = Math.round(0.15 * rate);
  for (let i = 0; i < L.length; i++) summe[i + 1] = summe[i] + stimmhaft[i];
  let max = 0, ein = 0, aus = 0, ne = 0, na = 0;
  for (let i = 0; i < L.length; i++) {
    max = Math.max(max, Math.abs(L[i]), Math.abs(R[i]));
    if (stimmhaft[i]) { ein += m[i] * m[i]; ne++; }
    else if (summe[Math.min(L.length, i + rand)] - summe[Math.max(0, i - rand)] === 0) { aus += m[i] * m[i]; na++; }
  }
  assert.ok(max <= 0.892 && L.every(Number.isFinite), `Spitze ${max.toFixed(3)}`);
  assert.ok(na > rate * 0.3 && 10 * Math.log10(ein / ne / (aus / na)) > 35, `in den Silben die Stimme, in den Pausen Stille (${(10 * Math.log10(ein / ne / (aus / na))).toFixed(1)} dB)`);
  // 50 Hz weg: das Brummen in einer langen Pause
  const brumm = (y) => { let c = 0, s2 = 0; for (let i = 0; i < y.length; i++) { c += y[i] * Math.cos((2 * Math.PI * 50 * i) / rate); s2 += y[i] * Math.sin((2 * Math.PI * 50 * i) / rate); } return Math.hypot(c, s2) / y.length; };
  assert.ok(brumm(m) < brumm(x) / 10, "das Brummen ist weg");
  assert.deepEqual(St.saeubern([x], rate).kanaele[0].slice(0, 5000), L.slice(0, 5000), "wiederholbar");
});

test("Stimm-Ablauf: 3,5 s Scratching, dann rund 10 s Stimme mit zwei, drei Hüpfern, am Ende 3,5 s Gefrickel; wiederholbar je Wurf, gemastert", () => {
  const rate = 22050, { x } = kunststimme(rate, 14, { rauschen: 0.002 });
  const s = St.saeubern([x], rate), a = St.stimmAblauf(s.kanaele, rate, { samen: 2 });
  assert.deepEqual(a.teile.map((t) => t.name), ["scratch", "stimme", "frickel"]);
  const [sc, st, fr] = a.teile, d = (t) => t.bis - t.von;
  assert.ok(Math.abs(d(sc) - 3.5) < 1e-6 && sc.von === 0, `Scratch ${d(sc)}`);
  assert.ok(d(st) > 9 && d(st) < 12, `Stimme ${d(st).toFixed(2)} s`);
  assert.ok(Math.abs(d(fr) - 3.5) < 0.05 && Math.abs(fr.bis - a.dauer) < 1e-6 && Math.abs(fr.von - st.bis) < 1e-6, `Gefrickel ${d(fr).toFixed(2)} s am Ende`);
  assert.ok(a.huepfer.length >= 2 && a.huepfer.length <= 3, `${a.huepfer.length} Hüpfer`);
  assert.ok(a.huepfer.every((h) => h.t > st.von + 1 && h.t < st.bis - 0.5 && ["stotter", "sprung", "rueck"].includes(h.art)), JSON.stringify(a.huepfer));
  assert.ok(a.zuege.length >= 8 && new Set(a.zuege.map((z) => z.art)).size >= 3, `Scratch-Züge: ${a.zuege.map((z) => z.art)}`);
  const [L, R] = a.kanaele;
  let max = 0; for (let i = 0; i < L.length; i++) max = Math.max(max, Math.abs(L[i]), Math.abs(R[i]));
  assert.ok(max <= 0.892 && L.every(Number.isFinite) && Math.abs(Fr.lautheit(L, R, rate) + 14) < 1.5, `Spitze ${max.toFixed(3)}, ${Fr.lautheit(L, R, rate).toFixed(1)} LUFS`);
  // Scratching: die Tonhöhe springt (Züge vor und zurück) – in der klaren Stimme nicht; jeder Wurf anders, derselbe gleich
  const nulldurch = (a0, b0) => { let z = 0; for (let i = Math.round(a0 * rate) + 1; i < Math.round(b0 * rate); i++) if ((L[i - 1] < 0) !== (L[i] < 0)) z++; return z / (b0 - a0); };
  assert.ok(nulldurch(0, 3.5) > 0, "im Scratching ist etwas zu hören");
  assert.deepEqual(St.stimmAblauf(s.kanaele, rate, { samen: 2 }).kanaele[0].slice(0, 30000), L.slice(0, 30000), "derselbe Wurf, dasselbe Stück");
  assert.notDeepEqual(St.stimmAblauf(s.kanaele, rate, { samen: 3 }).kanaele[0].slice(0, 30000), L.slice(0, 30000), "ein neuer Wurf scratcht anders");
  // der Fahrplan für das Bild (Effekt Video, seit 18. Oktober 2026): je 1/240 s die Stelle der Quelle und der Fader, so lang wie der Ton
  const k = a.karte, n = s.kanaele[0].length / rate, bei = (t) => k.pos[Math.round(t * k.rate)];
  assert.equal(k.rate, St.FAHRPLAN); assert.equal(k.pos.length, Math.ceil(a.dauer * k.rate));
  assert.ok(k.pos.every((p) => p >= 0 && p <= n), "alle Stellen in der Quelle");
  const [tSc, tSt, tFr] = a.teile;
  const imScratch = k.pos.slice(0, Math.round(tSc.bis * k.rate));
  assert.ok(Math.max(...imScratch) - Math.min(...imScratch) < 1.3, "beim Scratchen um das erste Wort");
  let vor = 0, zurueck = 0; for (let i = 1; i < imScratch.length; i++) { if (imScratch[i] > imScratch[i - 1]) vor++; else if (imScratch[i] < imScratch[i - 1]) zurueck++; }
  assert.ok(vor > 50 && zurueck > 50, `vor und zurück (${vor} / ${zurueck})`);
  assert.ok(k.hell.slice(0, imScratch.length).some((h) => h < 0.1) && k.hell.slice(Math.round(tSt.von * k.rate)).every((h) => h === 1), "der Fader nur beim Scratchen");
  // die klare Stimme läuft (bis auf die Hüpfer) im Tempo 1 durch
  let gerade = 0, alle = 0; for (let t = tSt.von + 0.2; t < tSt.bis - 0.2; t += 0.1) { alle++; if (Math.abs(bei(t + 0.1) - bei(t) - 0.1) < 0.01) gerade++; }
  assert.ok(gerade / alle > 0.8, `die Stimme läuft durch (${gerade} / ${alle})`);
  // das Gefrickel springt (viele Schnitte über 0,1 s)
  let spruenge = 0; for (let i = Math.round(tFr.von * k.rate) + 1; i < k.pos.length; i++) if (Math.abs(k.pos[i] - k.pos[i - 1]) > 0.1) spruenge++;
  assert.ok(spruenge >= 4, `im Gefrickel springt das Bild mit (${spruenge} Schnitte)`);
  // Drum and Bass gegen das Gefrickel hin: einen Takt (174 BPM) vorher herein («etwas später, kurz vor gefrickel»), bis zum Schluss; abschaltbar
  assert.ok(a.unterlegt && a.unterlegt.bpm === 174 && Math.abs(fr.von - a.unterlegt.von - 240 / 174) < 1e-6 && Math.abs(a.unterlegt.bis - a.dauer) < 1e-6, JSON.stringify(a.unterlegt));
  const ohne = St.stimmAblauf(s.kanaele, rate, { samen: 2, dnb: false });
  assert.equal(ohne.unterlegt, null);
  assert.deepEqual(ohne.teile, a.teile, "dieselben Teile");
  let dazu = 0; for (let i = Math.round(fr.von * rate); i < L.length; i += 7) dazu = Math.max(dazu, Math.abs(ohne.kanaele[0][i] - L[i]));
  assert.ok(dazu > 0.05, `im Gefrickel ist das Drum and Bass zu hören (${dazu.toFixed(3)})`);
  const d1 = St.drumAndBass(rate, 3, { samen: 4 }), d2 = St.drumAndBass(rate, 3, { samen: 4 });
  assert.deepEqual(d1[0].slice(0, 20000), d2[0].slice(0, 20000), "wiederholbar");
  assert.ok(d1.every((k) => k.every(Number.isFinite)));
  // die Kick auf jeder Eins: im ersten Takt bei 0, im zweiten bei 240 / 174 s viel Tiefe
  const tief = (t) => { let e = 0; for (let i = Math.round(t * rate); i < Math.round((t + 0.05) * rate); i++) e += d1[0][i] ** 2; return e; };
  assert.ok(tief(240 / 174) > 4 * tief(240 / 174 - 0.12), "die Kick auf der Eins");
  // eine kurze Aufnahme (4 s): weniger Stimme, höchstens ein Hüpfer, kein Fehler
  const kurz = St.stimmAblauf(St.saeubern([kunststimme(rate, 4).x], rate).kanaele, rate, { samen: 1 });
  assert.ok(kurz.huepfer.length <= 1 && kurz.dauer > 7 && kurz.kanaele[0].every(Number.isFinite), `kurz: ${kurz.dauer.toFixed(1)} s, ${kurz.huepfer.length} Hüpfer`);
});

test("Cracks des Videos (risse.js): je Hüpfer einer, alle verschieden, wiederholbar je Wurf; der Datamosh beim Sprung; nie ins Gefrickel; was sie brauchen", () => {
  const hs = [{ t: 5.1, art: "stotter" }, { t: 8.0, art: "sprung" }, { t: 11.2, art: "rueck" }];
  const arten = new Set();
  for (let samen = 1; samen <= 40; samen++) {
    const r = Ri.rissePlanen(hs, { samen, grenze: 12 });
    assert.equal(r.length, 3); assert.equal(new Set(r.map((x) => x.art)).size, 3, "alle verschieden");
    assert.deepEqual(r.map((x) => x.von), [5.1, 8.0, 11.2]);
    assert.ok(r.every((x, i) => x.bis - x.von <= Ri.DAUER[x.art] + 1e-9 && x.bis <= (hs[i + 1]?.t ?? Infinity) - 0.15 + 1e-9 && x.bis <= 11.95 + 1e-9), JSON.stringify(r));
    if (r.some((x) => x.art === "mosh")) assert.equal(r[1].art, "mosh", "den Datamosh bekommt der Sprung");
    for (const x of r) arten.add(x.art);
    assert.deepEqual(Ri.rissePlanen(hs, { samen, grenze: 12 }), r, "wiederholbar");
  }
  assert.deepEqual([...arten].sort(), [...Ri.ARTEN].sort(), "über die Würfe kommen alle vier vor");
  assert.notDeepEqual(Ri.rissePlanen(hs, { samen: 1 }).map((x) => x.art), Ri.rissePlanen(hs, { samen: 4 }).map((x) => x.art), "ein anderer Wurf, andere Cracks");
  assert.deepEqual(Ri.rissePlanen([], { samen: 1 }), []);
  // rissBei: der Crack zur Zeit, wie weit, welcher Schritt
  const r = Ri.rissePlanen(hs, { samen: 1, grenze: 14 });
  assert.equal(Ri.rissBei(r, 5.0), null); assert.equal(Ri.rissBei(r, 5.1).i, 0); assert.equal(Ri.rissBei(r, 8.2).schritt, 6);
  assert.ok(Math.abs(Ri.rissBei(r, (r[0].von + r[0].bis) / 2).u - 0.5) < 1e-9);
  // der Datamosh: das stehende Bild vor dem Hüpfer, dann je Schritt ein Paar; nach einem Schnitt das Bild davor in der Quelle
  const m = { art: "mosh", von: 8.0, bis: 9.3 }, karte = (t) => (t < 8.0 ? t + 2 : t - 0.5);
  const { q0, paare } = Ri.moshQuellen(m, 3, karte);
  assert.ok(Math.abs(q0 - karte(8.0 - 1 / 30)) < 1e-9);
  assert.equal(paare.length, 3);
  assert.ok(Math.abs(paare[0][0] - (paare[0][1] - 1 / 30)) < 1e-9, "über den Sprung: das Bild davor in der Quelle");
  assert.ok(Math.abs(paare[1][0] - paare[0][1]) < 1e-9, "sonst das Bild davor im Lauf");
  assert.equal(Ri.bedarf([m], 8.1, karte).length, 1 + 2 * 3);
  assert.equal(Ri.bedarf([{ art: "schlitz", von: 1, bis: 2 }], 1.5, karte).length, Ri.SCHICHTEN);
  assert.equal(Ri.bedarf([m], 7.9, karte).length, 0);
});

test("Video-Gefrickel (bildfrickel.js): Wirbel als Kacheln, Bitcrush verpixelt, Körner als Flecken, Step-Sequencer, Datamosh an harten Schnitten; der Plan kommt aus dem Ton", () => {
  // der Plan aus dem Stimm-Ablauf: jede Scheibe mit Zeit, Stelle, Art; im Gefrickel, Körner mit kleiner Lautstärke
  const rate = 22050, n = rate * 14, x = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / rate; x[i] = Math.sin(t * 900) * (0.5 + 0.5 * Math.sin(t * 7)) * 0.4 * (t % 0.5 < 0.3 ? 1 : 0.1); }
  let wirbel = 0, koerner = 0, crush = 0;
  for (let samen = 1; samen <= 12; samen++) {
    const a = St.stimmAblauf([x], rate, { samen }), F = a.karte.frickel, fr = a.teile[2];
    assert.ok(F.length > 3 && F.every((e, i) => i === 0 || e.t >= F[i - 1].t), "nach der Zeit");
    assert.ok(F.every((e) => e.t >= fr.von - 0.05 && e.t < fr.bis + 1e-6 && ["scheibe", "wirbel", "korn"].includes(e.art) && e.dauer > 0), JSON.stringify(F.slice(0, 3)));
    assert.ok(F.filter((e) => e.art === "korn").every((e) => e.gain < 0.35), "Körner leise");
    wirbel += F.filter((e) => e.art === "wirbel").length; koerner += F.filter((e) => e.art === "korn").length; crush += F.filter((e) => e.crush).length;
    // zwischen den Scheiben steht das Bild der letzten (kein Sprung ans Ende der Stimme)
    const k = a.karte, i0 = Math.round((fr.von + 0.1) * k.rate);
    for (let i = i0 + 1; i < k.pos.length; i++) {
      const t = i / k.rate, laeuft = F.some((e) => e.art !== "korn" && e.gain > 0.35 && t >= e.t - 0.01 && t < e.t + e.dauer + 0.01);
      if (!laeuft) assert.ok(Math.abs(k.pos[i] - k.pos[i - 1]) < 0.02, `t ${t.toFixed(2)}: steht (${k.pos[i - 1].toFixed(2)} → ${k.pos[i].toFixed(2)})`);
    }
  }
  assert.ok(wirbel > 0 && koerner > 0 && crush > 0, `über die Würfe Wirbel ${wirbel}, Körner ${koerner}, Bitcrush ${crush}`);
  // die Regeln an einem gebauten Plan
  const S = (t, q, o = {}) => ({ t, dauer: 0.25, q, tempo: 1, gain: 1, crush: 0, art: "scheibe", teil: 1, k: 0, ...o });
  const E = [S(10, 1), S(10.25, 1.25, { gain: 0.78 }), S(10.5, 1.5), S(10.75, 1.75, { crush: 9 }), S(11.0, 4, { gain: 0.78 }),
    S(11.25, 4.25, { art: "wirbel", teil: 4, gain: 0.85, dauer: 0.06 }), S(11.3, 6, { art: "korn", gain: 0.3, dauer: 0.05 })];
  assert.equal(Bf.frickelBild(E, 9.9), null, "vor dem Gefrickel nichts");
  assert.deepEqual(Bf.frickelBild(E, 10.1).kacheln, [1, 1]);
  assert.ok(Bf.frickelBild(E, 10.01).blitz > 1.2 && Bf.frickelBild(E, 10.3).blitz === 1, "der volle Schlag blitzt, der halbe nicht");
  assert.ok(Math.abs(Bf.frickelBild(E, 10.8).pixel - 1 / 22) < 1e-9, "Bitcrush 9: grobe Pixel");
  assert.deepEqual(Bf.frickelBild(E, 11.27, { hoch: true }).kacheln, [2, 2]);
  assert.deepEqual(Bf.kacheln(8, true), [2, 4]); assert.deepEqual(Bf.kacheln(8, false), [4, 2]); assert.deepEqual(Bf.kacheln(2, true), [1, 2]);
  const korn = Bf.frickelBild(E, 11.32);
  assert.equal(korn.flecken.length, 1); const [x0, y0, x1, y1] = korn.flecken[0].rect;
  assert.ok(x0 >= 0 && y0 >= 0 && x1 <= 1 && y1 <= 1 && x1 > x0 + 0.1 && Math.abs(korn.flecken[0].q - 6.02) < 1e-9, JSON.stringify(korn.flecken));
  assert.equal(Bf.frickelBild(E, 11.4).flecken.length, 0, "das Korn ist verklungen");
  // ein harter Schnitt (1,75 + 0,25 → 4): bei manchen ein kurzer Datamosh, nur am Anfang; sonst nie
  const schnitt = [];
  for (let off = 0; off < 40; off++) {
    const E2 = E.map((e) => ({ ...e, t: e.t + off * 10 })), b = Bf.frickelBild(E2, 11.0 + off * 10 + 0.05), spaet = Bf.frickelBild(E2, 11.0 + off * 10 + 0.2);
    assert.equal(spaet.mosh, null); schnitt.push(!!b.mosh);
    if (b.mosh) assert.ok(Math.abs(b.mosh.bis - b.mosh.von - Bf.SCHNITT_MOSH) < 1e-9);
  }
  assert.equal(Bf.frickelBild(E, 10.3).mosh, null, "ohne Sprung kein Datamosh");
  // der Step-Sequencer: auf einem vollen Schlag mit drei Scheiben davor drei Streifen, je ein Viertel breit
  let raster = null;
  for (let off = 0; off < 60 && !raster; off++) {
    const E3 = [S(0, 1), S(0.25, 2), S(0.5, 3), S(0.75, 3.25)].map((e) => ({ ...e, t: e.t + off }));
    const b = Bf.frickelBild(E3, off + 0.8); if (b.art === "raster") raster = b;
  }
  assert.ok(raster && raster.flecken.length === 3 && raster.flecken.every((f, m) => Math.abs(f.rect[0] - m / 4) < 1e-9 && f.rect[3] === 1), JSON.stringify(raster));
  assert.deepEqual(Bf.frickelBedarf(E, 11.32).quellen.length, 1);
});

test("Verfrickeln nach dem Herauslösen von Hall und Mastering (frickeln.js, auch für die Stimme): Klang wie vorher", () => {
  const rate = 22050, n = Math.round(rate * 2.4), pcm = new Float32Array(n);
  for (let i = 0; i < n; i++) { const t = i / rate, s = t % 0.6; pcm[i] = Math.exp(-s / 0.08) * (Math.sin(i * (0.03 + 0.01 * Math.floor(t / 0.6))) + 0.4 * Math.sin(i * 0.9)) * 0.7; }
  const f = Fr.frickeln([pcm], rate, { samen: 3 });
  let h = 0; for (const c of f.kanaele) for (let i = 0; i < c.length; i++) h = (h * 31 + Math.round(c[i] * 1e6)) | 0;
  assert.equal(h, 634774473, "dieselben Proben wie vor dem Umbau");
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

test("Seite: Alpha (noindex), three.js lokal mit fester Version, gleiche ?v=-Marken, nichts von aussen; Quelle nur Ton oder Video (Foto und Text seit dem 19. Oktober 2026 nicht mehr)", () => {
  const html = lies("index.html");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<title>PHORMA III – Ornament Cloud · Alpha<\/title>/);
  assert.match(html, /"three": "\.\.\/\.\.\/vendor\/three-0\.185\.1\/three\.module\.min\.js"/);
  assert.ok(!/<script[^>]+src="https?:/.test(html), "keine Skripte von aussen");
  assert.match(html, /data-quelle="ton">Nur Ton<\/button>\s*<button type="button" data-quelle="video">Video/, "Nur Ton oder ein Video als Quelle");
  // Foto und Text sind weg (Rückmeldung: «es läuft einfach der gewählte Effekt, aber weder das Bild noch der Text werden angezeigt. Ich find, das kann raus»)
  assert.ok(!/data-quelle="(foto|text)"|id="(datei|testbild|text|ablage)"/.test(html), "kein Foto, kein Text, kein Beispielbild");
  for (const t of [html, lies("app/index.html"), lies("manifest.webmanifest")]) assert.ok(!/Text, Foto|Foto oder Video|Foto, Text/.test(t), "die Beschreibungen nennen weder Foto noch Text");
  assert.match(lies("app.js"), /wahl\("data-quelle", "quelle", \["video", "ton"\]/, "eine gemerkte Wahl «foto» oder «text» ergibt «Nur Ton»");
  assert.match(html, /id="videodatei"[^>]*accept="video\/\*/, "eine Videodatei");
  assert.match(html, /id="tondatei"[^>]*accept="audio\/\*/, "eine Audiodatei");
  assert.match(html, /id="ton-im-video" checked> Ton an/, "Ton ausschaltbar");
  assert.match(html, /id="frickeln"> Verfrickeln[\s\S]*id="wuerfeln"/, "Verfrickeln als Option, mit neuem Wurf");
  assert.match(html, /data-tonart="musik">Musik[\s\S]*data-tonart="stimme">Stimme/, "Musik oder Stimme");
  assert.match(html, /id="saeubern" checked> Säubern und klären[\s\S]*id="stimm-ablauf" checked> Scratch → Stimme → Gefrickel[\s\S]*id="stimm-dnb" checked> mit Drum and Bass/, "die Stimme: säubern, der Ablauf, Drum and Bass");
  assert.match(html, /id="signet" checked> Logo am Schluss/);
  assert.match(html, /data-aufloesung="1">einfach[\s\S]*data-aufloesung="2">doppelt \(4K\)/, "Auflösung einfach oder doppelt (19. Oktober 2026)");
  assert.match(html, /data-wahl="gewebe" aria-pressed="true"[\s\S]*data-wahl="irrfahrt"[\s\S]*data-wahl="lichtwuerfel"[\s\S]*data-wahl="traube"[\s\S]*data-wahl="video"/, "fünf Effekte: Gewebe, Irrfahrt, Lichtwürfel, Traube und Video");
  assert.match(html, /id="ausschnitt-film"[\s\S]*id="ausschnitt-bild"/, "beim Ton aus dem Video: Filmstreifen über der Wellenform");
  assert.match(html, /id="video-ausschnitt"[\s\S]*id="video-streifen"[\s\S]*id="video-von"/, "mit eigener Audiodatei: der Ausschnitt des Videos");
  assert.ok(!/data-(effekt|tiefe)=|data-wahl="(physarum|tiefe|tuch)/.test(html), "keine Kette und keine Tiefe: das ist PHORMA II");
  assert.match(html, /href="\.\.\/phorma-ii\/"/, "Hinweis auf PHORMA II");
  const dateien = readdirSync(P).filter((f) => f.endsWith(".js")), marken = new Set();
  for (const f of ["ablauf.js", "analyse.js", "app.js", "buehne.js", "film.js", "frickeln.js", "gemeinsam.js", "gewebe.js", "irrfahrt.js", "irrweg.js", "kurven.js", "stimme.js", "rechner.js", "ton.js", "tonspur.js", "traube.js", "traubenplan.js"]) assert.ok(dateien.includes(f), f);
  for (const f of ["physarum.js", "tiefe.js", "tuch.js", "tuchsim.js", "tiefe-ki.js", "textbild.js"]) assert.ok(!dateien.includes(f), `ohne ${f}`);
  for (const f of dateien) {
    const js = lies(f);
    for (const m of js.matchAll(/"\.\/([a-z-]+\.js)(\?v=\d+)?"/g)) { assert.ok(m[2], `${f}: ${m[1]} mit Marke`); marken.add(m[2]); }
    assert.ok(!/https?:\/\//.test(js.replace(/\/\/.*$/gm, "")), `${f}: keine Adressen von aussen`);
    assert.ok(!/phorma-ii\//.test(js), `${f}: lädt nichts aus PHORMA II`);
  }
  assert.equal(marken.size, 1, `eine Marke für alle eigenen Module (${[...marken]})`);
  assert.match(html, /<script type="module" src="app\.js\?v=\d+"><\/script>/);
});

test("App (19. Oktober 2026): Manifest, Symbole, Service Worker mit eigenem Cache, studio/ aktuell, App-Seite und Eintrag auf der Alpha-Seite", async () => {
  const html = lies("index.html"), app = lies("app/index.html");
  // Manifest und Symbole (tools/phorma-iii-bilder.mjs); eigene Adresse studio/ wie bei PHORMA I: die Website (./ und app/) bleibt im Browser
  const m = JSON.parse(lies("manifest.webmanifest"));
  assert.equal(m.name, "PHORMA III"); assert.equal(m.short_name, "PHORMA III"); assert.equal(m.id, "phorma-iii");
  assert.equal(m.start_url, "studio/"); assert.equal(m.scope, "studio/"); assert.equal(m.display, "standalone"); assert.equal(m.lang, "de-CH");
  for (const seite of ["/alpha/phorma-iii/", "/alpha/phorma-iii/app/"]) assert.ok(!seite.startsWith(new URL(m.scope, "https://x/alpha/phorma-iii/").pathname), `${seite} liegt ausserhalb der installierten App`);
  const png = (f) => { const b = readFileSync(new URL(f, P)); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
  for (const i of m.icons) assert.deepEqual(png(i.src).map(String), i.sizes.split("x"), i.src);
  assert.deepEqual(png("icons/apple-touch-icon.png"), [180, 180]); assert.deepEqual(png("icons/favicon-32.png"), [32, 32]);
  assert.ok(m.icons.some((i) => i.purpose === "maskable"));
  for (const h of [html, app]) {
    assert.match(h, /<link rel="manifest" href="(\.\.\/)?manifest\.webmanifest">/);
    assert.match(h, /<link rel="apple-touch-icon" href="(\.\.\/)?icons\/apple-touch-icon\.png">/);
    assert.match(h, /id="installieren-knopf"[^>]*>.*PHORMA III als App installieren/);
    assert.match(h, /<meta property="og:image" content="https:\/\/ornament\.cloud\/alpha\/phorma-iii\/app\/og-phorma-iii\.jpg">/);
  }
  assert.equal(html.match(/pwa\.js\?v=(\d+)/)[1], html.match(/app\.js\?v=(\d+)/)[1], "pwa.js mit der Marke der Anwendung");
  assert.equal(app.match(/pwa\.js\?v=(\d+)/)[1], html.match(/app\.js\?v=(\d+)/)[1], "App-Seite: pwa.js mit der Marke der Anwendung");
  assert.ok(existsSync(new URL("app/og-phorma-iii.jpg", P)), "Vorschaukachel");
  // Service Worker: eigener Cache, der nicht mit «phorma-» beginnt – der von PHORMA I löscht alle «phorma-…» Caches beim Aktualisieren
  const sw = lies("sw.js"), cache = sw.match(/const CACHE = "([^"]+)"/)[1];
  assert.ok(!cache.startsWith("phorma-"), `Cache ${cache} überlebt das Aufräumen von PHORMA I`);
  assert.match(sw, new RegExp(`k\\.startsWith\\("${cache.replace(/\d+$/, "")}"\\)`), "räumt nur die eigenen Caches auf");
  const phormaI = readFileSync(new URL("alpha/bildfragmentieren/sw.js", root), "utf8").match(/k\.startsWith\("([^"]+)"\)/)[1];
  assert.ok(!cache.startsWith(phormaI), "PHORMA I räumt diesen Cache nicht weg");
  assert.match(lies("pwa.js"), /new URL\("sw\.js", import\.meta\.url\)/);
  // three.js über die Import-Map kann er nicht auflösen: alles, was die Bühne und die Effekte daraus laden, steht in seiner Liste
  const dazu = new Function(`${sw.match(/const THREE = [^\n]+/)[0]}\n${sw.match(/const DAZU = [\s\S]*?\];/)[0]}\nreturn DAZU;`)();
  for (const d of dazu) assert.ok(existsSync(new URL(d.endsWith("/") ? d + "index.html" : d, P)), `${d} gibt es`);
  const geladen = new Set(["three.module.min.js", "three.core.min.js", "addons/shaders/CopyShader.js", "addons/shaders/LuminosityHighPassShader.js"]);
  for (const f of readdirSync(P).filter((f) => f.endsWith(".js"))) for (const [, z] of lies(f).matchAll(/from "(three[^"]*)"/g)) geladen.add(z === "three" ? "three.module.min.js" : z.replace("three/addons/", "addons/"));
  for (const z of geladen) assert.ok(dazu.includes(`../../vendor/three-0.185.1/${z}`), `sw.js speichert ${z}`);
  // studio/: die aktuelle Abschrift mit <base href="../"> (sonst: node tools/build-phorma-iii-app.mjs)
  const { bauen } = await import(new URL("tools/build-phorma-iii-app.mjs", root).href);
  assert.equal(lies("studio/index.html"), bauen(html), "studio/ veraltet: node tools/build-phorma-iii-app.mjs");
  assert.ok(sw.includes('"studio/"'), "der Service Worker speichert die Seite der App für den Start ohne Netz");
  // App-Seite: Navigation oben links, noindex, Im Browser öffnen
  assert.match(app, /<nav class="seitenweg" aria-label="Ornament Cloud">/);
  assert.match(app, /<meta name="robots" content="noindex">/);
  assert.match(app, /<a class="link" href="\.\.\/">Im Browser öffnen/);
  // auf der Alpha-Seite: gleich nach Sketchory und The Fictory, mit dem Symbol, zur App-Seite
  const alpha = readFileSync(new URL("alpha/index.html", root), "utf8");
  const eintraege = [...alpha.matchAll(/<li>\s*(?:<img[^>]*>\s*)?<div>\s*<a href="([^"]+)"/g)].map((x) => x[1]);
  assert.deepEqual(eintraege.slice(0, 3), ["sketchory/", "the-fictory/", "phorma-iii/app/"]);
  assert.match(alpha, /<img src="phorma-iii\/icons\/apple-touch-icon\.png" alt="" width="56" height="56">\s*<div>\s*<a href="phorma-iii\/app\/">PHORMA III<\/a>/);
  assert.ok(!readFileSync(new URL("sitemap.xml", root), "utf8").includes("phorma-iii"), "nicht in der Sitemap");
});
