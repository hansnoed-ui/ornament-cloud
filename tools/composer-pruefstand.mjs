// Prüfstand für den ORNAMENT COMPOSER: bedient die echte App im unsichtbaren Browser («Track erzeugen», «Track (WAV)», «Projekt
// speichern»), misst jeden Track und vergleicht mit dem letzten Stand (tests/composer-pruefstand/basis.json). Gemeldet wird nur, was sich
// verschlechtert hat, mit Zeitangabe. Der Zufall der App (Math.random) ist festgelegt: gleicher Code ergibt bitgleiche Tracks.
//
//   NODE_PATH=$(npm root -g) node tools/composer-pruefstand.mjs                 alle Stile, 90 s, Startwert 1, Vergleich mit der Basis
//   … --stile ornament,dnb --sekunden 60 --seed 3                              Auswahl
//   … --basis-schreiben                                                       den heutigen Stand als neue Basis festhalten
//   … --gemini                                                                zusätzlich gemini-4-hydrogen hören lassen (Hinweise, ungeprüft)
//   … --ziel ordner                                                           WAV, Projekte und bericht.md dorthin (sonst ./pruefstand/)
//
// Gemessen (Mischung): Lautheit (LUFS), wahrer Spitzenwert, Lautheitsumfang, Bänder, Knackser (Sprünge zwischen Abtastwerten gegen
// die Umgebung), Clipping (Abtastwerte an der Grenze), Löcher (Stille ≥ 50 ms mitten im Track). Aus dem Projekt: Spuren, Dropouts und
// stille Spur-Takte des Arrangements. Dazu die Rechenzeit der App als grobes Mass für die Last.
// Gemini allein ist kein Beleg (Eichtest 25.11.2026: 6 von 9 eingebauten Fehlern gefunden, kurze Knackser überhört, «keine Fehler» kein Beleg).
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { join, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const BASIS = join(ROOT, "tests/composer-pruefstand/basis.json");

// ---------- WAV ----------
/** liest PCM-WAV (16, 24 oder 32 Bit Ganzzahl, 32 Bit Gleitkomma) → { rate, kanaele: Float32Array[] } */
export function wavLesen(buf) {
  const d = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (String.fromCharCode(...buf.subarray(0, 4)) !== "RIFF") throw new Error("kein WAV");
  let o = 12, fmt = null;
  while (o + 8 <= buf.length) {
    const id = String.fromCharCode(...buf.subarray(o, o + 4)), n = d.getUint32(o + 4, true);
    if (id === "fmt ") fmt = { art: d.getUint16(o + 8, true), kanaele: d.getUint16(o + 10, true), rate: d.getUint32(o + 12, true), bits: d.getUint16(o + 22, true) };
    if (id === "data") {
      const { kanaele: k, bits, art } = fmt, b = bits / 8, z = Math.floor(n / (b * k)), out = Array.from({ length: k }, () => new Float32Array(z));
      for (let i = 0; i < z; i++) for (let c = 0; c < k; c++) {
        const p = o + 8 + (i * k + c) * b;
        out[c][i] = art === 3 ? d.getFloat32(p, true) : bits === 16 ? d.getInt16(p, true) / 32768 : bits === 24 ? ((d.getUint8(p) | (d.getUint8(p + 1) << 8) | (d.getInt8(p + 2) << 16)) / 8388608) : d.getInt32(p, true) / 2147483648;
      }
      return { rate: fmt.rate, kanaele: out };
    }
    o += 8 + n + (n & 1);
  }
  throw new Error("WAV ohne Daten");
}

// ---------- Messungen ----------
const runde = (x, s = 2) => Math.round(x * 10 ** s) / 10 ** s;

/**
 * Knackser: ein Sprung zwischen zwei Abtastwerten, der weit über dem liegt, was die Umgebung an Sprüngen hat. Verglichen wird |x[n]−x[n−1]|
 * mit dem Mittel der Sprünge 0,5–5 ms davor (Anschläge bauen sich über mehrere Abtastwerte auf und haben laute Nachbarn; ein Knackser kommt
 * aus der Ruhe). Treffer innerhalb von 20 ms gelten als einer. Gibt [{ zeit (s), sprung, verhaeltnis }].
 */
export function knackser(kanaele, rate, { faktor = 12, nachher = 12, mindest = 0.08 } = {}) {
  const treffer = [], vor = Math.round(rate * 0.005), luecke = Math.round(rate * 0.0005), sperre = Math.round(rate * 0.02);
  let letzte = -Infinity;
  for (const s of kanaele) {
    const n = s.length, dif = new Float32Array(n);
    for (let i = 1; i < n; i++) dif[i] = Math.abs(s[i] - s[i - 1]);
    // laufende Summe der Sprünge im Fenster [i−vor, i−luecke)
    const pre = new Float64Array(n + 1); for (let i = 0; i < n; i++) pre[i + 1] = pre[i] + dif[i];
    for (let i = vor; i < n; i++) {
      if (dif[i] < mindest) continue;
      if (i + vor >= n) break;
      const mittel = (pre[i - luecke] - pre[i - vor]) / (vor - luecke), danach = (pre[i + vor] - pre[i + luecke]) / (vor - luecke);
      // ein Anschlag klingt weiter (danach viel Bewegung), ein Knackser ist sofort vorbei
      if (dif[i] > faktor * Math.max(mittel, 1e-4) && dif[i] > nachher * Math.max(danach, 1e-4) && i - letzte > sperre) { treffer.push({ zeit: runde(i / rate, 3), sprung: runde(dif[i], 3), verhaeltnis: Math.round(dif[i] / Math.max(mittel, 1e-4)) }); letzte = i; }
    }
  }
  return treffer.sort((a, b) => a.zeit - b.zeit).filter((t, i, a) => i === 0 || t.zeit - a[i - 1].zeit > 0.02);
}

/** Clipping: Folgen von mindestens drei Abtastwerten an der Grenze (|x| ≥ 0,9999). Gibt [{ zeit, laenge (Abtastwerte) }]. */
export function clipping(kanaele, rate, { grenze = 0.9999, mindest = 3 } = {}) {
  const out = [];
  for (const s of kanaele) { let lauf = 0; for (let i = 0; i <= s.length; i++) { if (i < s.length && Math.abs(s[i]) >= grenze) { lauf++; continue; } if (lauf >= mindest) out.push({ zeit: runde((i - lauf) / rate, 3), laenge: lauf }); lauf = 0; } }
  return out.sort((a, b) => a.zeit - b.zeit);
}

/** Löcher: Stille (10-ms-Pegel unter −60 dBFS) von mindestens 50 ms zwischen dem ersten und dem letzten Klang. Gibt [{ von, bis }] in s. */
export function loecher(kanaele, rate, { schwelle = -60, mindest = 0.05 } = {}) {
  const h = Math.round(rate / 100), z = Math.floor(kanaele[0].length / h), still = new Uint8Array(z), g = 10 ** (schwelle / 20);
  for (let j = 0; j < z; j++) { let q = 0; for (const s of kanaele) for (let i = j * h; i < (j + 1) * h; i++) q += s[i] * s[i]; still[j] = Math.sqrt(q / (h * kanaele.length)) < g ? 1 : 0; }
  const erst = still.indexOf(0), letzt = still.lastIndexOf(0), out = [];
  for (let j = erst, von = -1; j <= letzt + 1; j++) {
    if (j <= letzt && still[j]) { if (von < 0) von = j; continue; }
    if (von >= 0 && (j - von) / 100 >= mindest) out.push({ von: von / 100, bis: j / 100 });
    von = -1;
  }
  return out;
}

/** aus dem gespeicherten Projekt: Spuren, Dropouts und stille Spur-Takte (Takte, in denen ein Dropout ohne Rest die Spur ganz stumm macht) */
export function arrangementZahlen(projekt) {
  const abschn = projekt.abschnitte ?? [], takte = abschn.length ? Math.max(...abschn.map((a) => a.bis)) : 0;
  let dropouts = 0, stilleTakte = 0;
  for (const sp of projekt.spuren ?? []) {
    const d = (sp.ereignisse ?? []).filter((e) => e.art === "dropout" && !e.aus && (e.werte?.rest ?? 0) === 0);
    dropouts += d.length;
    const stumm = new Set();
    for (const e of d) for (let t = Math.ceil(e.takt - 1e-9); t + 1 <= e.takt + e.schritte / 16 + 1e-9; t++) if (t < takte) stumm.add(t);
    stilleTakte += stumm.size;
  }
  return { spuren: (projekt.spuren ?? []).length, takte, dropouts, stilleTakte, abschnitte: abschn.map((a) => a.name ?? a.typ).join(" → ") };
}

/** alle Messungen eines Tracks */
export async function messeTrack(wav, projekt = null) {
  const { messen } = await import(new URL("../alpha/composer/kern/messen.js", import.meta.url).href);
  const { rate, kanaele } = wav, m = messen(kanaele, rate);
  return {
    dauer: runde(kanaele[0].length / rate, 1), lufs: runde(m.lufs, 1), tp: runde(m.tp, 1), lra: runde(m.lra ?? 0, 1),
    unter120: runde((m.baender?.unter120 ?? 0) * 100, 1), mitten: runde((m.baender?.mitten ?? 0) * 100, 1), ueber2k: runde((m.baender?.ueber2k ?? 0) * 100, 1),
    knackser: knackser(kanaele, rate), clipping: clipping(kanaele, rate), loecher: loecher(kanaele, rate),
    ...(projekt ? arrangementZahlen(projekt) : {}),
  };
}

// ---------- Vergleich ----------
/** Was hat sich gegenüber der Basis verschlechtert? Gibt { schlechter: [Text], anders: [Text] } (anders = auffällig, aber nicht schlechter). */
export function vergleichen(neu, alt) {
  const schlechter = [], anders = [], zeiten = (l) => l.slice(0, 6).map((x) => `${(x.zeit ?? x.von).toFixed(2)} s`).join(", ") + (l.length > 6 ? " …" : "");
  if (!alt) return { schlechter, anders: ["keine Basis für diesen Stil"] };
  if (Math.abs(neu.lufs - alt.lufs) > 0.5) anders.push(`Lautheit ${alt.lufs} → ${neu.lufs} LUFS`);
  if (neu.tp > -0.9 && neu.tp > alt.tp + 0.1) schlechter.push(`Spitzenwert ${alt.tp} → ${neu.tp} dBTP (über −1)`);
  if (Math.abs(neu.lra - alt.lra) > 2) anders.push(`Lautheitsumfang ${alt.lra} → ${neu.lra} LU`);
  for (const [k, name] of [["unter120", "Anteil unter 120 Hz"], ["mitten", "Anteil 120 Hz–2 kHz"], ["ueber2k", "Anteil über 2 kHz"]])
    if (Math.abs(neu[k] - alt[k]) > 5) anders.push(`${name} ${alt[k]} → ${neu[k]} %`);
  const neueZeiten = (l, la, tol = 0.05) => l.filter((x) => !la.some((y) => Math.abs((y.zeit ?? y.von) - (x.zeit ?? x.von)) < tol));
  const kn = neueZeiten(neu.knackser, alt.knackser ?? [], 0.02); if (kn.length) schlechter.push(`${kn.length} neue Knackser: ${zeiten(kn)}`);
  const cl = neueZeiten(neu.clipping, alt.clipping ?? []); if (cl.length) schlechter.push(`${cl.length} neue Clipping-Stellen: ${zeiten(cl)}`);
  const lo = neueZeiten(neu.loecher, alt.loecher ?? [], 0.1); if (lo.length) schlechter.push(`${lo.length} neue Löcher in der Mischung: ${lo.slice(0, 6).map((x) => `${x.von.toFixed(2)}–${x.bis.toFixed(2)} s`).join(", ")}`);
  if (alt.dropouts !== undefined && neu.dropouts > alt.dropouts) schlechter.push(`Dropouts ${alt.dropouts} → ${neu.dropouts}`);
  else if (alt.dropouts !== undefined && neu.dropouts < alt.dropouts) anders.push(`Dropouts ${alt.dropouts} → ${neu.dropouts}`);
  if (alt.stilleTakte !== undefined && neu.stilleTakte > alt.stilleTakte) schlechter.push(`stille Spur-Takte ${alt.stilleTakte} → ${neu.stilleTakte}`);
  else if (alt.stilleTakte !== undefined && neu.stilleTakte < alt.stilleTakte) anders.push(`stille Spur-Takte ${alt.stilleTakte} → ${neu.stilleTakte}`);
  if (alt.spuren !== undefined && neu.spuren !== alt.spuren) anders.push(`Spuren ${alt.spuren} → ${neu.spuren}`);
  if (alt.rechenzeit && neu.rechenzeit > alt.rechenzeit * 1.5 && neu.rechenzeit - alt.rechenzeit > 5) schlechter.push(`Rechenzeit ${alt.rechenzeit} → ${neu.rechenzeit} s (mehr Last)`);
  return { schlechter, anders };
}

// ---------- Gemini (zusätzliches Ohr) ----------
const FRAGE = "You are a mastering engineer doing a technical QA pass on an instrumental track rendered by a software synthesizer. Listen to the whole file. " +
  "Report every audible technical defect: clicks/pops, dropouts (sudden silence), digital clipping/distortion, stutter/buffer repeats, or other glitches. " +
  "Ignore intentional musical sounds (drum hits, percussion, reverb tails, intentional breaks, tape stop at the end) unless they are clearly a fault. " +
  'Answer ONLY with JSON: {"defects":[{"type":"click|dropout|clipping|stutter|other","time_s":<seconds, one decimal>,"confidence":0.0-1.0}]}. If there are none: {"defects":[]}.';
/** gemini-4-hydrogen hört den Track (als MP3, damit er unter der Grenze für Inline-Dateien bleibt); jeder Hinweis wird mit den Messungen abgeglichen */
export function geminiHoeren(wavDatei, m) {
  const mp3 = wavDatei.replace(/\.wav$/, ".mp3");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", wavDatei, "-c:a", "libmp3lame", "-b:a", "192k", mp3]);
  for (let v = 0; v < 3; v++) {
    try {
      const out = execFileSync("gemini-api", ["analyze", "-m", "gemini-4-hydrogen", "-i", mp3, "--system", "Technical audio QA. JSON only.", FRAGE], { encoding: "utf8", env: { GEMINI_API_KEY: "platzhalter", ...process.env } });
      const json = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));
      const gemessen = [...m.knackser.map((x) => x.zeit), ...m.clipping.map((x) => x.zeit), ...m.loecher.map((x) => x.von)];
      return (json.defects ?? []).map((d) => ({ art: d.type, zeit: d.time_s, sicherheit: d.confidence, gemessen: gemessen.some((t) => Math.abs(t - d.time_s) <= 1) }));
    } catch (e) { if (v === 2) return [{ art: "fehler", zeit: 0, text: String(e.message ?? e).slice(0, 160) }]; execFileSync("sleep", ["20"]); }
  }
  return [];
}

// ---------- die App bedienen ----------
const TYPEN = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
function server() {
  return new Promise((ok) => {
    const s = createServer(async (q, r) => {
      const p = decodeURIComponent(new URL(q.url, "http://x").pathname), f = resolve(ROOT, "." + (p.endsWith("/") ? p + "index.html" : p));
      if (!f.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
      try { const b = await readFile(f); r.writeHead(200, { "content-type": TYPEN[extname(f)] ?? "application/octet-stream" }); r.end(b); } catch { r.writeHead(404); r.end(); }
    }).listen(0, () => ok(s));
  });
}
/** fester Zufall: dieselbe Folge in jeder Seite (mulberry32), damit Synth-Startwerte und Ereignisse reproduzierbar sind */
const festerZufall = () => { let a = 12345; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

/**
 * Datei abholen: Die App lädt direkt herunter, wenn der Klick weniger als 4 s her ist, sonst zeigt sie einen Knopf «Speichern»
 * (herunterladen() in app.js). Beides wird abgewartet; knopf ist die Taste, die das Herunterladen auslöst.
 */
async function abholen(seite, knopf, ziel) {
  const direkt = seite.waitForEvent("download", { timeout: 900000 }).then((dl) => ({ dl }));
  const leiste = seite.waitForSelector(".speichern a", { timeout: 900000 }).then(() => ({ leiste: true }));
  await seite.click(knopf, { force: true });
  let r = await Promise.race([direkt, leiste]);
  if (!r.dl) { const [dl] = await Promise.all([seite.waitForEvent("download"), seite.click(".speichern a")]); r = { dl }; }
  direkt.catch(() => {}); leiste.catch(() => {});
  await r.dl.saveAs(ziel);
  await seite.evaluate(() => document.querySelector(".speichern")?.remove());
}
async function trackAusApp(browser, url, stil, { sekunden, seed, ziel }) {
  const ctx = await browser.newContext({ acceptDownloads: true, locale: "de-CH" });   // Meldungen deutsch (sonst übersetzt die App)
  await ctx.addInitScript(festerZufall);
  const seite = await ctx.newPage(), fehler = [];
  seite.on("pageerror", (e) => fehler.push(e.message));
  seite.on("dialog", (d) => d.accept(`${stil}-${sekunden}s-seed${seed}`));
  await seite.goto(url);
  await seite.waitForFunction(() => document.querySelectorAll("#stil option").length > 0);
  await seite.selectOption("#stil", stil); await seite.fill("#seed", String(seed));
  await seite.selectOption("#trackDauer", String(sekunden));
  const t0 = Date.now();
  await seite.click("#trackErzeugen", { force: true });
  await seite.waitForFunction(() => /ganzer Track|whole track/i.test(document.getElementById("meldung").textContent), null, { timeout: 900000 });
  const meldung = await seite.$eval("#meldung", (m) => m.textContent);
  const wav = join(ziel, `${stil}.wav`); await abholen(seite, "#trackLaden", wav);
  const rechenzeit = runde((Date.now() - t0) / 1000, 0);
  const json = join(ziel, `${stil}.composer.json`); await abholen(seite, "#projektSpeichern", json);
  await ctx.close();
  return { wav, json, rechenzeit, meldung, fehler };
}

// ---------- Ablauf ----------
async function main() {
  const arg = process.argv.slice(2), wert = (k, std) => { const i = arg.indexOf(k); return i >= 0 ? arg[i + 1] : std; };
  const sekunden = Number(wert("--sekunden", 90)), seed = Number(wert("--seed", 1)), ziel = resolve(wert("--ziel", "pruefstand"));
  const require = createRequire(import.meta.url), { chromium } = require("playwright");
  await mkdir(ziel, { recursive: true });
  const s = await server(), url = `http://localhost:${s.address().port}/alpha/composer/`;
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
  const alleStile = await (async () => { const c = await browser.newContext({ locale: "de-CH" }), p = await c.newPage(); await p.goto(url); await p.waitForFunction(() => document.querySelectorAll("#stil option").length > 0); const l = await p.$$eval("#stil option", (o) => o.map((x) => x.value)); await c.close(); return l; })();
  const stile = wert("--stile", null)?.split(",") ?? alleStile;
  const basis = existsSync(BASIS) ? JSON.parse(readFileSync(BASIS, "utf8")) : {}, schluessel = `${sekunden}s-seed${seed}`, alt = basis[schluessel] ?? {};
  const ergebnis = {}, zeilen = [`# Composer-Prüfstand`, ``, `${new Date().toISOString().slice(0, 16).replace("T", " ")} · ${sekunden} s · Startwert ${seed} · Basis: ${basis[schluessel] ? "vorhanden" : "keine"}`, ``];
  let schlecht = 0;
  for (const stil of stile) {
    process.stderr.write(`${stil} …`);
    const t = await trackAusApp(browser, url, stil, { sekunden, seed, ziel });
    const m = { ...(await messeTrack(wavLesen(await readFile(t.wav)), JSON.parse(await readFile(t.json, "utf8")))), rechenzeit: t.rechenzeit };
    if (arg.includes("--gemini")) m.gemini = geminiHoeren(t.wav, m);
    ergebnis[stil] = m;
    const v = vergleichen(m, alt[stil]); schlecht += v.schlechter.length;
    process.stderr.write(` ${m.lufs} LUFS, ${m.tp} dBTP, ${m.knackser.length} Knackser, ${m.loecher.length} Löcher, ${m.dropouts} Dropouts, ${m.rechenzeit} s${v.schlechter.length ? " – SCHLECHTER" : ""}\n`);
    zeilen.push(`## ${stil}${v.schlechter.length ? " – schlechter" : ""}`, ``, t.meldung, ``,
      `| Lautheit | Spitze | LRA | < 120 Hz | Knackser | Clipping | Löcher | Dropouts | stille Spur-Takte | Rechenzeit |`, `|---|---|---|---|---|---|---|---|---|---|`,
      `| ${m.lufs} LUFS | ${m.tp} dBTP | ${m.lra} LU | ${m.unter120} % | ${m.knackser.length} | ${m.clipping.length} | ${m.loecher.length} | ${m.dropouts} | ${m.stilleTakte} | ${m.rechenzeit} s |`, ``);
    for (const x of v.schlechter) zeilen.push(`- **schlechter:** ${x}`);
    for (const x of v.anders) zeilen.push(`- anders: ${x}`);
    if (m.knackser.length) zeilen.push(`- Knackser bei ${m.knackser.slice(0, 10).map((x) => `${x.zeit.toFixed(2)} s`).join(", ")}${m.knackser.length > 10 ? " …" : ""}`);
    if (m.loecher.length) zeilen.push(`- Löcher bei ${m.loecher.slice(0, 10).map((x) => `${x.von.toFixed(2)}–${x.bis.toFixed(2)} s`).join(", ")}`);
    for (const g of m.gemini ?? []) zeilen.push(`- Gemini (Hinweis, ungeprüft): ${g.art} bei ${g.zeit} s${g.sicherheit !== undefined ? `, Sicherheit ${g.sicherheit}` : ""}${g.text ? ` – ${g.text}` : ""} – ${g.gemessen ? "Messung zeigt dort etwas" : "Messung zeigt dort nichts"}`);
    if (t.fehler.length) zeilen.push(`- Fehler in der Seite: ${t.fehler.slice(0, 3).join(" · ")}`);
    zeilen.push(``);
  }
  await browser.close(); s.close();
  zeilen.splice(3, 0, schlecht ? `**${schlecht} Verschlechterung(en)** gegenüber der Basis.` : `Keine Verschlechterung gegenüber der Basis.`, ``);
  await writeFile(join(ziel, "bericht.md"), zeilen.join("\n"));
  if (arg.includes("--basis-schreiben")) {
    for (const st of Object.values(ergebnis)) delete st.gemini;
    basis[schluessel] = { ...alt, ...ergebnis }; await mkdir(join(ROOT, "tests/composer-pruefstand"), { recursive: true });
    await writeFile(BASIS, JSON.stringify(basis, null, 1) + "\n"); process.stderr.write(`Basis geschrieben: ${BASIS}\n`);
  }
  process.stderr.write(`Bericht: ${join(ziel, "bericht.md")}\n`);
  process.exitCode = schlecht && !arg.includes("--basis-schreiben") ? 1 : 0;
}

// nur als Befehl ausführen, nicht beim Import (Tests); Vergleich über Pfade, nicht über file://-URLs (Windows)
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) await main();
