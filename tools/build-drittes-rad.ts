// Alpha: «Das Dritte Rad». Erzeugt alpha/drittes-rad/daten.js aus den Quellen der drei Bereiche:
//   Zettelkasten  src/data/zu-seiner-zeit.json (+ extra) über model() aus tools/build-zu-seiner-zeit.ts: Strophen mit Volltext und Verweisen
//   OMNA COLOR    alpha/omna-color/index.html: Gestaltungsübungen (EX) und Farbthemen (THEMES), die dort als Daten im Skript stehen
// ORNA (Personen, 326 Konstellationen mit Text und Frage) wird zur Laufzeit direkt aus den Datenmodulen des Rads gelesen, nicht kopiert.
//
//   node --experimental-strip-types tools/build-drittes-rad.ts
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { model } from "./build-zu-seiner-zeit.ts";

const ROOT = new URL("../", import.meta.url);
export const AUSGABE = "alpha/drittes-rad/daten.js";

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
  return [{ pfad: AUSGABE, inhalt }];
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  for (const f of build()) {
    writeFileSync(new URL(f.pfad, ROOT), f.inhalt);
    console.log(`→ ${f.pfad} (${f.inhalt.length} Zeichen)`);
  }
}
