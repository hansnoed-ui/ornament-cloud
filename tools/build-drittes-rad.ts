// Alpha: «Das Dritte Rad». Erzeugt alpha/drittes-rad/daten.js aus den Quellen der drei Bereiche:
//   Zettelkasten  src/data/zu-seiner-zeit.json (+ extra) über model() aus tools/build-zu-seiner-zeit.ts: Strophen mit Volltext und Verweisen
//   OMNA COLOR    alpha/omna-color/index.html: Gestaltungsübungen (EX) und Farbthemen (THEMES), die dort als Daten im Skript stehen
// ORNA (Personen, 326 Konstellationen mit Text und Frage) wird zur Laufzeit direkt aus den Datenmodulen des Rads gelesen, nicht kopiert.
// Setzt außerdem die Versionsmarke (?v=) in die Importe der Radmodule, siehe unten.
//
//   node --experimental-strip-types tools/build-drittes-rad.ts
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { model } from "./build-zu-seiner-zeit.ts";

const ROOT = new URL("../", import.meta.url);
export const AUSGABE = "alpha/drittes-rad/daten.js";

// ---------- Versionsmarke der Radmodule ----------
// GitHub Pages lässt Browser jede Datei zehn Minuten ohne Nachfrage behalten. Direkt nach einer Aktualisierung bekäme eine frische Seite sonst alte Module aus dem
// Zwischenspeicher («does not provide an export named …»), und das Rad bliebe leer. Darum tragen alle Importe der Radmodule ?v=<Marke>, und die Marke folgt dem Inhalt
// der Module (engine, kacheln, daten, jev): Ändert sich eines, holt der Browser alle neu. Die Originalseiten laden weiter.js ohne Marke (ihre Zeile bleibt, wie sie ist);
// weiter.js holt seine Module aber mit Marke, die Teile einer Seite stammen also immer aus demselben Stand.
export const MODULE = ["engine.js", "kacheln.js", "daten.js", "jev.js"];
export const MIT_MARKE = ["index.html", "engine.js", "kacheln.js", "weiter.js"];
const IMPORT = /"(\.\/(?:engine|kacheln|daten|jev)\.js)(?:\?v=[0-9a-f]{8})?"/g;
const ohneMarke = (text: string) => text.replace(IMPORT, '"$1"');
/** Marke aus dem Inhalt der Module (ohne die Marken selbst, damit sie sich nicht selbst verändert) */
export function marke(dateien: Record<string, string>): string {
  const h = createHash("sha1");
  for (const n of MODULE) h.update(`${n}\0${ohneMarke(dateien[n])}\0`);
  return h.digest("hex").slice(0, 8);
}
export const stempeln = (text: string, m: string) => text.replace(IMPORT, `"$1?v=${m}"`);

export function build(): { pfad: string; inhalt: string }[] {
  const m = model();
  const omna = readFileSync(new URL("alpha/omna-color/index.html", ROOT), "utf8");
  const ex = omna.match(/const EX = (\[.*?\]);\n/s);
  const th = omna.match(/const THEMES = \[(.*?)\];/s);
  if (!ex || !th) throw new Error("alpha/omna-color/index.html: EX oder THEMES nicht gefunden");
  const uebungen = JSON.parse(ex[1]);
  const themen = [...th[1].matchAll(/name:\s*"([^"]+)",\s*c:\s*"(#[0-9a-fA-F]{6})"/g)].map(x => [x[1], x[2]]);
  if (uebungen.length < 1 || themen.length !== 7) throw new Error(`OMNA COLOR: ${uebungen.length} Übungen, ${themen.length} Themen`);

  const zyklen = m.cycles.map((c: any) => [c.roman, c.name]);
  const strophen = m.stanzas.map((s: any) => ({
    n: s.id, s: s.slug, c: s.cycle, t: s.title, b: s.bottomLine, x: s.text,
    r: s.references.map((r: any) => ({ p: r.person, s: r.slug, w: r.work, d: r.discipline, n: r.note })),
    v: s.related.resonances.map((r: any) => r.id),
  }));
  const zeilen = (name: string, a: unknown[]) => `export const ${name} = [\n${a.map(x => "  " + JSON.stringify(x)).join(",\n")}\n];\n`;
  const inhalt =
    `// Automatisch erzeugt von tools/build-drittes-rad.ts aus src/data/zu-seiner-zeit.json und alpha/omna-color/index.html – nicht von Hand bearbeiten.\n` +
    `// Texte bleiben unverändert (REGELN §1). ORNA liest das Rad direkt aus portfolio/nebeneinander-nacheinander/js/data/.\n` +
    zeilen("ZYKLEN", zyklen) + zeilen("THEMEN", themen) + zeilen("STROPHEN", strophen) + zeilen("UEBUNGEN", uebungen);
  const lies = (f: string) => readFileSync(new URL(`alpha/drittes-rad/${f}`, ROOT), "utf8");
  const v = marke(Object.fromEntries(MODULE.map(n => [n, n === "daten.js" ? inhalt : lies(n)])));
  return [{ pfad: AUSGABE, inhalt }, ...MIT_MARKE.map(f => ({ pfad: `alpha/drittes-rad/${f}`, inhalt: stempeln(lies(f), v) }))];
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  for (const f of build()) {
    writeFileSync(new URL(f.pfad, ROOT), f.inhalt);
    console.log(`→ ${f.pfad} (${f.inhalt.length} Zeichen)`);
  }
}
