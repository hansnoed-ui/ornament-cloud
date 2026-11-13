// Social-Paket (tools/social-paket.mjs): die reinen Rechnungen ohne Browser und ohne Netz – WAV lesen, Hüllkurve, Wahl des Ausschnitts,
// Beitragstexte, Dateinamen – und der Workflow, der das Werkzeug auf GitHub startet.
//   node --test tests/social-paket.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { beispielton } from "../tools/beispielton.mjs";
import {
  wavKopf, wavBereich, wavBytes, wavDatei, huellkurve, glaetten, normieren, ausschnittWaehlen, striche, kurzname, dateiname, angaben, hashtags,
  beitragstexte, texteMd, argumente, FPS, STRICHE, FORMATE,
} from "../tools/social-paket.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const lies = (p) => readFileSync(join(root, p), "utf8");
const RATE = 44100;

/** 24 Bit Stereo, wahlweise als WAVE_FORMAT_EXTENSIBLE und mit einem fremden Chunk ungerader Länge vor fmt; links und rechts je ein Float32Array */
function wav24(links, rechts, { extensible = false, fremd = false } = {}) {
  const n = links.length, daten = Buffer.alloc(n * 6);
  for (let i = 0; i < n; i++) { daten.writeIntLE(Math.round(links[i] * 8388607), i * 6, 3); daten.writeIntLE(Math.round(rechts[i] * 8388607), i * 6 + 3, 3); }
  const fmt = Buffer.alloc(extensible ? 40 : 16);
  fmt.writeUInt16LE(extensible ? 0xfffe : 1, 0); fmt.writeUInt16LE(2, 2); fmt.writeUInt32LE(RATE, 4); fmt.writeUInt32LE(RATE * 6, 8); fmt.writeUInt16LE(6, 12); fmt.writeUInt16LE(24, 14);
  if (extensible) { fmt.writeUInt16LE(22, 16); fmt.writeUInt16LE(24, 18); fmt.writeUInt32LE(3, 20); fmt.writeUInt16LE(1, 24); }
  const chunk = (id, b) => { const k = Buffer.alloc(8); k.write(id, 0); k.writeUInt32LE(b.length, 4); return Buffer.concat([k, b, Buffer.alloc(b.length & 1)]); };
  const teile = [...(fremd ? [chunk("LIST", Buffer.from("abc"))] : []), chunk("fmt ", fmt), chunk("data", daten)];
  const kopf = Buffer.alloc(12); kopf.write("RIFF", 0); kopf.writeUInt32LE(4 + teile.reduce((s, t) => s + t.length, 0), 4); kopf.write("WAVE", 8);
  return Buffer.concat([kopf, ...teile]);
}

const sinus = (sekunden, pegel, hz = 220) => Float32Array.from({ length: Math.round(sekunden * RATE) }, (_, i) => pegel * Math.sin((2 * Math.PI * hz * i) / RATE));
const kette = (...teile) => { const a = new Float32Array(teile.reduce((s, t) => s + t.length, 0)); let o = 0; for (const t of teile) { a.set(t, o); o += t.length; } return a; };

const EP = {
  anzeigename: "the i", titel: "directer", cover: "cover.jpg", audio: "audio/x.wav", abtastrate: RATE, art: "Maxi", jahr: 2026,
  tracks: [{ titel: "directer", startSample: 0, samples: 245 * RATE }, { titel: "making movies", startSample: 245 * RATE, samples: 273 * RATE }, { titel: "directer reprise", startSample: 518 * RATE, samples: 339 * RATE }],
};

test("WAV: Beispielton (mono, 16 Bit) – Kopf und Bereich", () => {
  const b = beispielton({ dauer: 2 }), k = wavKopf(b);
  assert.deepEqual({ format: k.format, kanaele: k.kanaele, rate: k.rate, bits: k.bits, frames: k.frames, dataStart: k.dataStart }, { format: 1, kanaele: 1, rate: RATE, bits: 16, frames: 2 * RATE, dataStart: 44 });
  const pcm = wavBereich(b, k, RATE / 2, RATE);
  assert.equal(pcm.length, RATE);
  assert.ok(Math.abs(pcm[100] - b.readInt16LE(44 + (RATE / 2 + 100) * 2) / 32768) < 1e-6, "Sample an der richtigen Stelle");
  assert.ok(pcm.every((x) => x >= -1 && x <= 1));
  assert.equal(wavBereich(b, k, 1.5 * RATE, RATE).length, RATE / 2, "über das Ende hinaus: nur das Vorhandene");
});

test("WAV: 24 Bit Stereo aus einer Datei, auch EXTENSIBLE und mit fremdem Chunk; nur der verlangte Bereich", () => {
  const links = sinus(1, 0.5), rechts = sinus(1, 0.25), dir = mkdtempSync(join(tmpdir(), "social-wav-"));
  try {
    for (const art of [{}, { extensible: true, fremd: true }]) {
      const datei = join(dir, "t.wav"); writeFileSync(datei, wav24(links, rechts, art));
      const k = wavKopf(datei);
      assert.deepEqual({ format: k.format, kanaele: k.kanaele, bits: k.bits, blockAlign: k.blockAlign, frames: k.frames }, { format: 1, kanaele: 2, bits: 24, blockAlign: 6, frames: RATE });
      const pcm = wavBereich(datei, k, 1000, 2000);
      assert.equal(pcm.length, 2000);
      for (const i of [0, 7, 1999]) assert.ok(Math.abs(pcm[i] - (links[1000 + i] + rechts[1000 + i]) / 2) < 1e-5, `Mono-Mittel bei ${i}`);
      // der Ausschnitt als eigene kleine WAV: bitgleich, wieder lesbar
      const klein = wavDatei(k, wavBytes(datei, k, 1000, 2000)), kk = wavKopf(klein);
      assert.equal(kk.frames, 2000);
      assert.deepEqual([...wavBereich(klein, kk, 0, 2000)], [...pcm]);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("WAV: 32 Bit Float und 32 Bit PCM; Unlesbares wird verständlich abgelehnt", () => {
  const n = 100, f = Buffer.alloc(n * 4), p = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) { f.writeFloatLE(i / 200, i * 4); p.writeInt32LE(Math.round((i / 200) * 2147483647), i * 4); }
  const fl = wavDatei({ format: 3, kanaele: 1, rate: RATE, blockAlign: 4, bits: 32 }, f), pc = wavDatei({ format: 1, kanaele: 1, rate: RATE, blockAlign: 4, bits: 32 }, p);
  assert.ok(Math.abs(wavBereich(fl, wavKopf(fl), 0, n)[50] - 0.25) < 1e-6);
  assert.ok(Math.abs(wavBereich(pc, wavKopf(pc), 0, n)[50] - 0.25) < 1e-6);
  assert.throws(() => wavKopf(Buffer.from("das ist keine WAV-Datei")), /keine RIFF\/WAVE/);
  assert.throws(() => wavKopf(wavDatei({ format: 1, kanaele: 1, rate: RATE, blockAlign: 1, bits: 8 }, Buffer.alloc(10))), /nicht unterstützt/);
});

test("Hüllkurve: ein Wert je Filmbild, 0–1, laut über leise; der Tiefenanteil folgt dem Bass, nicht den Höhen", () => {
  const pcm = kette(sinus(2, 0.05), sinus(2, 0.8), sinus(2, 0.05)), h = huellkurve(pcm, RATE);
  assert.equal(h.huelle.length, 6 * FPS);
  assert.equal(h.tiefe.length, 6 * FPS);
  assert.equal(h.energie.length, 6 * FPS);
  for (const reihe of [h.huelle, h.tiefe]) assert.ok(reihe.every((x) => x >= 0 && x <= 1));
  assert.ok(Math.max(...h.huelle) > 0.99, "normiert auf 1");
  assert.ok(h.huelle[3 * FPS] > 5 * h.huelle[FPS / 2], "laute Stelle deutlich über der leisen");
  assert.equal(huellkurve(sinus(2.5, 0.3), RATE, { fps: 24 }).huelle.length, 60, "andere Bildrate");
  const bass = huellkurve(kette(sinus(2, 0.5, 60), sinus(2, 0.5, 4000)), RATE);
  assert.ok(bass.tiefe[FPS] > 0.8 && bass.tiefe[3 * FPS] < 0.1, "60 Hz zählt als Tiefe, 4 kHz nicht");
  assert.ok(Math.abs(bass.huelle[FPS] - bass.huelle[3 * FPS]) < 0.05, "die Hüllkurve sieht beide gleich laut");
  assert.ok(huellkurve(new Float32Array(RATE), RATE).huelle.every((x) => x === 0), "Stille bleibt 0, ohne NaN");
});

test("Glätten und Normieren: kein Zappeln, Länge bleibt", () => {
  const zack = Float32Array.from({ length: 60 }, (_, i) => i % 2), g = glaetten(zack, 4);
  assert.equal(g.length, 60);
  let sprung = 0; for (let i = 1; i < g.length; i++) sprung = Math.max(sprung, Math.abs(g[i] - g[i - 1]));
  assert.ok(sprung < 0.2, `grösster Sprung ${sprung}`);
  assert.deepEqual([...normieren([0, 2, 4])], [0, 0.5, 1]);
  const s = striche(huellkurve(kette(sinus(1, 0.1), sinus(1, 0.9)), RATE).huelle);
  assert.equal(s.length, STRICHE);
  assert.ok(s.every((x) => x >= 0 && x <= 1) && s[STRICHE - 10] > s[10]);
});

test("Ausschnitt: findet das laute Fenster, hält sich an ep.json, bleibt im Track", () => {
  const { energie } = huellkurve(kette(sinus(7, 0.05), sinus(4, 0.8), sinus(9, 0.05)), RATE);   // 20 s, laut von 7 bis 11
  const auto = ausschnittWaehlen(energie, { sekunden: 4 });
  assert.deepEqual({ start: auto.start, dauer: auto.dauer, gewaehlt: auto.gewaehlt }, { start: 7, dauer: 4, gewaehlt: "Energie" });
  const sechs = ausschnittWaehlen(energie, { sekunden: 6 });
  assert.ok(sechs.start >= 5 && sechs.start <= 7 && Number.isInteger(sechs.start), "Raster 1 s, das laute Stück liegt ganz im Fenster");
  assert.deepEqual(ausschnittWaehlen(energie, { sekunden: 4, vorgabe: 2.5 }), { start: 2.5, dauer: 4, gewaehlt: "ep.json" });
  assert.equal(ausschnittWaehlen(energie, { sekunden: 4, vorgabe: 0 }).start, 0, "Vorgabe 0 gilt");
  assert.equal(ausschnittWaehlen(energie, { sekunden: 4, vorgabe: 19 }).start, 16, "Vorgabe zu spät: ans Ende geschoben");
  assert.equal(ausschnittWaehlen(energie, { sekunden: 4, vorgabe: -3 }).start, 0);
  const lautAmEnde = huellkurve(kette(sinus(8, 0.05), sinus(2.4, 0.8)), RATE).energie, e = ausschnittWaehlen(lautAmEnde, { sekunden: 4 });
  assert.ok(e.start + e.dauer <= lautAmEnde.length / FPS + 1e-9, "nie über das Trackende hinaus");
  assert.equal(e.start, 6);
  assert.deepEqual(ausschnittWaehlen(huellkurve(sinus(3, 0.5), RATE).energie, { sekunden: 24 }), { start: 0, dauer: 3, gewaehlt: "Energie" }, "kürzerer Track: der ganze Track");
});

test("Beitragstexte: nur Angaben aus ep.json, deutsch und englisch, schlicht", () => {
  const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/u;
  const deutsch = /\b(Tracks am Stück|Hören|Aus der|von|Minuten|und|der|die|das)\b/;
  for (const track of [null, 1, 2, 3]) {
    const t = beitragstexte(EP, "directer", track), titel = track ? EP.tracks[track - 1].titel : "directer";
    for (const sprache of ["de", "en"]) for (const laenge of ["kurz", "lang"]) {
      const text = t[sprache][laenge], wo = `${track ?? "ganz"}/${sprache}/${laenge}`;
      assert.ok(text.includes(titel), `${wo}: Titel`);
      assert.ok(text.includes("the i") && text.includes("directer"), `${wo}: Name und Veröffentlichung`);
      assert.ok(text.includes("https://ornament.cloud/listen/directer/"), `${wo}: Adresse`);
      assert.ok(!text.includes("ß"), `${wo}: kein ß`);
      assert.ok(!emoji.test(text), `${wo}: keine Emojis`);
      assert.ok((text.match(/#/g) || []).length <= 3, `${wo}: höchstens drei Hashtags`);
      assert.ok(!/[!]/.test(text), `${wo}: keine Ausrufezeichen`);
    }
    assert.equal(t.de.kurz.split("\n").length, 2, "kurz: eine Zeile plus Adresse");
    assert.equal(t.en.kurz.split("\n").length, 2);
    for (const s of ["de", "en"]) { const z = t[s].lang.split("\n").length; assert.ok(z >= 3 && z <= 5, `lang: ${z} Zeilen`); }
    assert.ok(!deutsch.test(t.en.kurz) && !deutsch.test(t.en.lang), `englisch ohne deutsche Wörter: ${t.en.lang}`);
    assert.match(t.en.lang, /Listen: /);
    assert.match(t.de.lang, /Hören: /);
    assert.match(t.de.lang, /#thei #directer$/);
  }
  const ganz = beitragstexte(EP, "directer");
  assert.match(ganz.de.lang, /3 Tracks am Stück, 14 Minuten: directer, making movies, directer reprise/);
  assert.match(ganz.en.lang, /3 tracks in one piece, 14 minutes/);
  assert.match(ganz.de.kurz, /^the i – «directer» \(Maxi, 2026\)\n/);
  assert.match(beitragstexte(EP, "directer", 2).de.lang, /Track 2 von 3 aus der Maxi «directer» \(2026\)/);
  assert.match(beitragstexte(EP, "directer", 2).en.lang, /Track 2 of 3 from the Maxi “directer” \(2026\)/);
});

test("Beitragstexte: eigene Zeile aus social.texte zuerst; ohne art, jahr, adresse gelten die Vorgaben", () => {
  const mit = beitragstexte({ ...EP, social: { texte: { de: "Seit heute zu hören.", en: "Out today." } } }, "directer", 1);
  assert.equal(mit.de.lang.split("\n")[0], "Seit heute zu hören.");
  assert.equal(mit.en.lang.split("\n")[0], "Out today.");
  assert.ok(!mit.de.kurz.includes("Seit heute"));
  const { art, jahr, ...karg } = EP, a = angaben(karg, "directer");
  assert.deepEqual({ art: a.art, jahr: a.jahr, adresse: a.adresse, kurz: a.adresseKurz, minuten: a.minuten }, { art: "", jahr: "", adresse: "https://ornament.cloud/listen/directer/", kurz: "ornament.cloud/listen/directer", minuten: 14 });
  const t = beitragstexte(karg, "directer", 2);
  assert.equal(t.de.kurz, "the i – «making movies». Aus «directer».\nhttps://ornament.cloud/listen/directer/");
  assert.ok(!/undefined|null|\(\)/.test(JSON.stringify(t)));
  assert.equal(angaben({ ...EP, adresse: "https://example.org/x/" }, "directer").adresseKurz, "example.org/x");
  assert.equal(hashtags(angaben({ ...EP, anzeigename: "directer" }, "directer")), "#directer", "gleiche Hashtags nur einmal");
  const neu = beitragstexte({ ...karg, art: "Maxi", artEn: "Maxi single", datum: "2026-11-10" }, "directer");
  assert.equal(neu.de.kurz.split("\n")[0], "the i – «directer» (Maxi, 2026)", "Jahr aus dem Datum");
  assert.equal(neu.en.kurz.split("\n")[0], "the i – “directer” (Maxi single, 2026)", "englische Art aus artEn");
});

test("texte.md: Ganzes und jeder Track; die Probe steht deutlich im Kopf", () => {
  const md = texteMd(EP, "directer", { filme: [{ nr: 2, titel: "making movies", dateien: ["a.mp4", "b.mp4"], start: 95, dauer: 24, gewaehlt: "Energie" }] });
  assert.match(md, /^# Beitragstexte: the i – directer\n/);
  for (const k of ["## Die Veröffentlichung als Ganzes", "## 01 directer", "## 02 making movies", "## 03 directer reprise", "### Deutsch", "### English", "Ausschnitt: ab 1:35 im Track, 24,0 s"]) assert.ok(md.includes(k), k);
  assert.ok(!md.includes("PROBE") && !md.includes("ß"));
  assert.match(texteMd(EP, "directer", { probe: true }), /^# PROBE – /);
});

test("Dateinamen: klein, mit Bindestrichen, ohne Umlaute; Probe mit PROBE- davor", () => {
  assert.equal(dateiname("directer", 1, "directer", "9x16", "mp4"), "directer-01-directer-9x16.mp4");
  assert.equal(dateiname("directer", 2, "making movies", "1x1", "mp4"), "directer-02-making-movies-1x1.mp4");
  assert.equal(dateiname("directer", 3, "Über die Strasse – Größe (Café)!", "9x16", "jpg"), "directer-03-ueber-die-strasse-groesse-cafe-9x16.jpg");
  assert.equal(dateiname("directer", 12, "???", "1x1", "mp4"), "directer-12-track-1x1.mp4");
  assert.equal(dateiname("directer", 1, "directer", "9x16", "mp4", { probe: true }), "PROBE-directer-01-directer-9x16.mp4");
  assert.equal(kurzname("  Zu seiner Zeit  "), "zu-seiner-zeit");
  assert.deepEqual(FORMATE.map((f) => [f.name, f.breite, f.hoehe]), [["9x16", 1080, 1920], ["1x1", 1080, 1080]]);
});

test("Aufruf: Argumente; ohne Audiodatei eine verständliche Meldung und Exit 1; der Import startet keinen Lauf", () => {
  assert.deepEqual(argumente(["directer", "--probe", "--nur", "2", "--sekunden", "8", "--aus", "/tmp/x"]), { slug: "directer", audio: null, aus: "/tmp/x", sekunden: 8, nur: 2, probe: true });
  assert.throws(() => argumente([]), /Aufruf/);
  assert.throws(() => argumente(["../x"]), /Aufruf/);
  assert.throws(() => argumente(["directer", "--nur", "0"]), /Tracknummer/);
  assert.throws(() => argumente(["directer", "--sekunden"]), /Wert/);
  const dir = mkdtempSync(join(tmpdir(), "social-arg-"));
  try {
    const r = spawnSync(process.execPath, [join(root, "tools/social-paket.mjs"), "directer", "--audio", join(dir, "fehlt.wav"), "--aus", dir], { encoding: "utf8" });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Audiodatei fehlt/);
    assert.match(r.stderr, /https:\/\/ornament\.cloud\/listen\/directer\/audio\//);
    assert.match(r.stderr, /--probe/);
    const k = spawnSync(process.execPath, [join(root, "tools/social-paket.mjs"), "gibt-es-nicht"], { encoding: "utf8" });
    assert.equal(k.status, 1);
    assert.match(k.stderr, /ep\.json fehlt/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("Szene: zeichnet Bild für Bild ohne Uhr und Zufall, Schrift vom eigenen Server", () => {
  const html = lies("tools/social/szene.html");
  for (const k of ["window.einrichten", "window.bild =", "document.fonts.ready", "/vendor/fonts/fonts.css", "Instrument Sans", "#ffd84d", "#ece8e1"]) assert.ok(html.includes(k), k);
  assert.ok(!/Math\.random|Date\.now|performance\.now|requestAnimationFrame|new Date/.test(html), "keine Uhr, kein Zufall");
  assert.ok(!/https?:\/\//.test(html.replace(/<!--[\s\S]*?-->/g, "")), "keine fremden Quellen");
  assert.ok(existsSync(join(root, "vendor/fonts/instrument-sans-normal-latin.woff2")));
});

test("Workflow: von Hand zu starten, nennt das Werkzeug, reicht Eingaben nur über env weiter, lädt das Paket als Artefakt hoch", () => {
  const wf = lies(".github/workflows/social.yml");
  assert.match(wf, /^name: Social-Paket$/m);
  assert.match(wf, /on:\n  workflow_dispatch:\n    inputs:\n      slug:/);
  assert.match(wf, /default: directer/);
  assert.match(wf, /default: "24"/);
  assert.ok(wf.includes("node tools/social-paket.mjs"));
  assert.ok(wf.includes("npx playwright install --with-deps chromium"));
  assert.match(wf, /curl [^\n]*--fail/);
  assert.ok(wf.includes("^[a-z0-9-]+$"));
  assert.match(wf, /name: social-\$\{\{ inputs\.slug \}\}/);
  assert.match(wf, /retention-days: 14/);
  assert.ok(!/secrets\./.test(wf), "keine Secrets");
  // keine ${{ }} in Shell-Schritten: jede Zeile eines run-Blocks ist frei davon
  const zeilen = wf.split("\n");
  let inRun = false, einzug = 0;
  for (const z of zeilen) {
    const m = z.match(/^(\s*)(- )?run:(.*)$/);
    if (m) { inRun = true; einzug = m[1].length + (m[2] ? 2 : 0); assert.ok(!m[3].includes("${{"), z); continue; }
    if (inRun && z.trim() && z.search(/\S/) <= einzug) inRun = false;
    if (inRun) assert.ok(!z.includes("${{"), `\${{ }} in run: ${z}`);
  }
  for (const a of ["actions/checkout@v4", "actions/setup-node@v4"]) assert.ok(wf.includes(a), a);
  assert.match(lies("docs/social-paket.md"), /tools\/social-paket\.mjs/);
});
