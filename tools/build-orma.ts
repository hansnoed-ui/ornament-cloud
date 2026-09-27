// Produktionsbuild von ORMA: src/orma/app/ + src/orma/redaktion/pilot.json → src/orma/dist/
//
//   node --experimental-strip-types tools/build-orma.ts           → src/orma/dist/ (Vorschau, nicht eingecheckt)
//   node --experimental-strip-types tools/build-orma.ts --alpha   → alpha/orma/ (Alpha-Seite der Website, eingecheckt)
//
// – prüft die Redaktionsdatei gegen den Bestand (IDs, Einstieg 40–70 Wörter, drei Aufträge);
// – schreibt js/data.js: Paarung, Originaltext und Originalfrage wörtlich aus dem Bestand,
//   dazu Einstieg und Aufträge der ORMA-Redaktion, Zeichen und Radplätze;
// – kopiert die App, hängt an Stylesheet und Module eine Inhaltsversion (?v=…) und setzt Version und
//   Dateiliste in den eigenen Service Worker.
// Die Ausgabe ist in sich geschlossen und nutzt nur relative Pfade: Sie läuft unter jedem Website-Pfad.
// ORNA wird dabei nur gelesen (Bestand), nie geschrieben.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { artists } from "../src/doppelspalt/src/data/artists.ts";
import { theorists } from "../src/doppelspalt/src/data/theorists.ts";
import { constellations } from "../src/doppelspalt/src/data/constellations.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
export const SRC = join(ROOT, "src/orma/app");
export const PILOT_FILE = join(ROOT, "src/orma/redaktion/pilot.json");
export const OUT = join(ROOT, "src/orma/dist");
export const ALPHA = join(ROOT, "alpha/orma");
const META = JSON.parse(readFileSync(join(ROOT, "src/orma/orma.json"), "utf8"));
const START = "// <!-- ORMA:START -->", END = "// <!-- ORMA:END -->";
const AUFTRAEGE = ["beispiel", "einwand", "gestaltung"];
export const PILOT_SIZE = 24;                                   // REGELN §14
export const RING_SLOTS = 12;                                   // Plätze je Ring (js/wheel.js)

export const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Redaktionsdatei prüfen und mit dem Bestand verbinden */
export function buildPilot(pilotText: string = readFileSync(PILOT_FILE, "utf8")) {
  const pilot = JSON.parse(pilotText);
  const errors: string[] = [];
  const list = pilot.konstellationen;
  if (!Array.isArray(list) || list.length !== PILOT_SIZE) errors.push(`genau ${PILOT_SIZE} Konstellationen erwartet, gefunden: ${Array.isArray(list) ? list.length : "keine"}`);
  if (typeof pilot.inhaltsversion !== "string" || !pilot.inhaltsversion) errors.push("inhaltsversion fehlt");
  const ids = new Set<string>();
  const items = (list || []).map((k: any) => {
    const c = constellations.find(x => x.id === k.id);
    if (!c) { errors.push(`${k.id}: nicht im Bestand`); return null; }
    if (ids.has(k.id)) errors.push(`${k.id}: doppelt`);
    ids.add(k.id);
    const w = words(k.einstieg || "");
    if (w < 40 || w > 70) errors.push(`${k.id}: Einstieg hat ${w} Wörter (erlaubt 40–70)`);
    for (const a of AUFTRAEGE) {
      if (typeof k.auftraege?.[a] !== "string" || !k.auftraege[a].trim()) errors.push(`${k.id}: Auftrag «${a}» fehlt`);
      // Modus allein: dieselben Aufträge in der Du-Form (eine Person)
      if (typeof k.auftraege_allein?.[a] !== "string" || !k.auftraege_allein[a].trim()) errors.push(`${k.id}: Auftrag «${a}» für den Modus allein fehlt`);
    }
    const ai = artists.findIndex(p => p.id === c.artistId), ti = theorists.findIndex(p => p.id === c.theoristId);
    return {
      id: c.id, nr: c.editorialNumber,
      artist: { id: c.artistId, name: artists[ai].name, symbol: ai, ringIndex: ai },
      theorist: { id: c.theoristId, name: theorists[ti].name, symbol: artists.length + ti, ringIndex: ti },
      text: c.text, question: c.question,
      einstieg: k.einstieg.trim(),
      auftraege: Object.fromEntries(AUFTRAEGE.map(a => [a, k.auftraege[a].trim()])),
      auftraegeAllein: Object.fromEntries(AUFTRAEGE.map(a => [a, k.auftraege_allein[a].trim()])),
    };
  }).filter(Boolean) as any[];
  // Das Rad hat zwölf Plätze je Ring: genau zwölf Künstler:innen und zwölf Theoretiker:innen
  for (const key of ["artist", "theorist"]) {
    const n = new Set(items.map((x: any) => x[key].id)).size;
    if (items.length && n !== RING_SLOTS) errors.push(`${key === "artist" ? "Künstler:innen" : "Theoretiker:innen"}: ${n} verschiedene, das Rad hat ${RING_SLOTS} Plätze`);
  }
  if (errors.length) throw new Error("ORMA-Redaktion ungültig:\n  " + errors.join("\n  "));
  // Radplätze gehören den Personen (eine Person kann in mehreren Konstellationen vorkommen):
  // Reihenfolge der Ringe wie in ORNA, unter den ausgewählten Personen
  const rank = (key: "artist" | "theorist") => {
    const persons = [...new Map(items.map(x => [x[key].id, x[key].ringIndex])).entries()].sort((x, y) => x[1] - y[1]).map(x => x[0]);
    for (const it of items) it[key].slot = persons.indexOf(it[key].id);
  };
  rank("artist"); rank("theorist");
  for (const it of items) { delete it.artist.ringIndex; delete it.theorist.ringIndex; }
  return { contentVersion: pilot.inhaltsversion as string, status: pilot.status as string, items };
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(n => { const p = join(dir, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
}

/** Ganzer Build; liefert Version und Dateiliste */
export function buildOrma(out: string = OUT) {
  if (![OUT, ALPHA].includes(out) && !out.startsWith(join(tmpdir(), "orma-"))) throw new Error(`Ausgabe nur nach src/orma/dist, alpha/orma oder in einen Testordner: ${out}`);
  const { contentVersion, items } = buildPilot();
  const files = new Map<string, Buffer | string>();          // Pfad in der Ausgabe → Inhalt
  for (const f of walk(SRC)) {
    const rel = relative(SRC, f).split("\\").join("/");
    if (rel === "js/data.js") continue;                        // wird erzeugt
    files.set(rel, readFileSync(f));
  }
  if (!files.has("sw.js") || !files.has("index.html")) throw new Error("src/orma/app unvollständig");
  files.set("js/data.js",
    "// Erzeugt von tools/build-orma.ts – nicht von Hand bearbeiten.\n" +
    "// Paarung, Text und Frage stammen wörtlich aus dem Bestand von «Nebeneinander, Nacheinander»;\n" +
    "// Einstieg und Aufträge sind Ergänzungen der ORMA-Redaktion (src/orma/redaktion/pilot.json).\n" +
    `export const APP = Object.freeze(${JSON.stringify({ name: META.name, version: META.version })});\n` +
    `export const CONTENT_VERSION = ${JSON.stringify(contentVersion)};\n` +
    `export const PILOT = Object.freeze(${JSON.stringify(items, null, 2)});\n`);

  // Version: Hash über alle Inhalte ausser dem Service Worker
  const hash = createHash("sha256");
  for (const k of [...files.keys()].sort()) if (k !== "sw.js") hash.update(k).update(files.get(k)!);
  const version = hash.digest("hex").slice(0, 12);
  const v = (p: string) => `${p}?v=${version}`;

  // Zwischenspeicher umgehen: Stylesheet und Module tragen die Version
  const html = String(files.get("index.html"))
    .replace('href="orma.css"', `href="${v("orma.css")}"`)
    .replace(/src="(js\/[^"?]+\.js)"/g, (_, p) => `src="${v(p)}"`)
    .replace(/%%URL%%/g, META.url);                            // Vorschaubild: absolute Adresse (orma.json)
  files.set("index.html", html);
  for (const k of files.keys()) {
    if (!k.startsWith("js/") || !k.endsWith(".js")) continue;
    files.set(k, String(files.get(k)).replace(/(from\s+|import\()\s*"(\.\/[^"?]+\.js)"/g, (_, a, p) => `${a}"${v(p)}"`));
  }
  const precache = ["./", ...[...files.keys()]
    .filter(k => k !== "sw.js" && k !== "index.html")
    .map(k => (k === "orma.css" || k.startsWith("js/") ? v(k) : k))].sort();
  const sw = String(files.get("sw.js"));
  const i = sw.indexOf(START), j = sw.indexOf(END);
  if (i < 0 || j < i) throw new Error("sw.js: Marken ORMA:START / ORMA:END fehlen");
  files.set("sw.js", sw.slice(0, i + START.length) + `\nconst VERSION = "${version}";\nconst PRECACHE = ${JSON.stringify(precache, null, 2)};\n` + sw.slice(j));

  // Ausgabe frisch schreiben (nur den eigenen Ordner)
  if (existsSync(out)) rmSync(out, { recursive: true, force: true });
  for (const [k, c] of files) { const p = join(out, k); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, c); }
  return { version, contentVersion, precache, count: files.size };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv.includes("--alpha") ? ALPHA : OUT;
  const r = buildOrma(out);
  console.log(`ORMA ${META.version} · Build ${r.version} · Inhalt ${r.contentVersion} · ${r.count} Dateien → ${relative(ROOT, out)}/`);
}
