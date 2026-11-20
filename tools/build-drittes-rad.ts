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
import vm from "node:vm";
import { model } from "./build-zu-seiner-zeit.ts";

const ROOT = new URL("../", import.meta.url);
export const AUSGABE = "alpha/drittes-rad/daten.js";
// Englische Fassung (20. November 2026, Christian: «Ja mach es auch Englisch»): Strophen aus src/data/zu-seiner-zeit.en.json (über model(…, "en")),
// Übungen aus alpha/omna-color/ex.en.js, Themen aus alpha/omna-color/sprache.js. Die Radseite lädt sie erst, wenn jemand Englisch wählt.
export const AUSGABE_EN = "alpha/drittes-rad/daten.en.js";

// ---------- Versionsmarke der Radmodule ----------
// GitHub Pages lässt Browser jede Datei zehn Minuten ohne Nachfrage behalten. Direkt nach einer Aktualisierung bekäme eine frische Seite sonst alte Module aus dem
// Zwischenspeicher («does not provide an export named …»), und das Rad bliebe leer. Darum tragen alle Importe der Radmodule ?v=<Marke>, und die Marke folgt dem Inhalt
// der Module (engine, kacheln, daten, jev): Ändert sich eines, holt der Browser alle neu. Die Originalseiten laden weiter.js ohne Marke (ihre Zeile bleibt, wie sie ist);
// weiter.js holt seine Module aber mit Marke, die Teile einer Seite stammen also immer aus demselben Stand.
export const MODULE = ["engine.js", "kacheln.js", "daten.js", "daten.en.js", "jev.js"];
export const MIT_MARKE = ["index.html", "engine.js", "kacheln.js", "weiter.js"];
const IMPORT = /"(\.\/(?:engine|kacheln|daten|daten\.en|jev)\.js)(?:\?v=[0-9a-f]{8})?"/g;
const ohneMarke = (text: string) => text.replace(IMPORT, '"$1"');
/** Marke aus dem Inhalt der Module (ohne die Marken selbst, damit sie sich nicht selbst verändert) */
export function marke(dateien: Record<string, string>): string {
  const h = createHash("sha1");
  for (const n of MODULE) h.update(`${n}\0${ohneMarke(dateien[n])}\0`);
  return h.digest("hex").slice(0, 8);
}
export const stempeln = (text: string, m: string) => text.replace(IMPORT, `"$1?v=${m}"`);
// Die Beta-Fassung (beta/drittes-rad/, 28. Oktober 2026) lädt dieselben Module aus alpha/drittes-rad/ und trägt dieselbe Marke, sonst hätte sie zwei Stände im Speicher.
export const BETA = ["beta/drittes-rad/index.html"];
const IMPORT_BETA = /"(\.\.\/\.\.\/alpha\/drittes-rad\/(?:engine|kacheln|daten|daten\.en|jev)\.js)(?:\?v=[0-9a-f]{8})?"/g;
export const stempelnBeta = (text: string, m: string) => text.replace(IMPORT_BETA, `"$1?v=${m}"`);

export function build(): { pfad: string; inhalt: string }[] {
  const m = model();
  const omna = readFileSync(new URL("alpha/omna-color/index.html", ROOT), "utf8");
  const ex = omna.match(/const EX = (\[.*?\]);\r?\n/s);   // \r?: Arbeitskopien unter Windows haben CRLF
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
  const inhaltEn = englisch(strophen, uebungen, themen);
  const lies = (f: string) => readFileSync(new URL(`alpha/drittes-rad/${f}`, ROOT), "utf8");
  const v = marke(Object.fromEntries(MODULE.map(n => [n, n === "daten.js" ? inhalt : n === "daten.en.js" ? inhaltEn : lies(n)])));
  return [{ pfad: AUSGABE, inhalt }, { pfad: AUSGABE_EN, inhalt: inhaltEn }, ...MIT_MARKE.map(f => ({ pfad: `alpha/drittes-rad/${f}`, inhalt: stempeln(lies(f), v) })),
    ...BETA.map(f => ({ pfad: f, inhalt: stempelnBeta(readFileSync(new URL(f, ROOT), "utf8"), v) }))];
}

/** Englisch je Schlüssel: Zyklen (römische Zahl), Themen (deutscher Name), Strophen (Adresse), Übungen (Nummer). Namen, Werktitel und Adressen bleiben. */
function englisch(strophen: any[], uebungen: any[], themen: string[][]): string {
  const m = model(undefined, undefined, "en");
  const ex: any = { window: {} };
  vm.runInNewContext(readFileSync(new URL("alpha/omna-color/ex.en.js", ROOT), "utf8"), ex);
  const exEn = ex.window.EX_EN;
  const spr = readFileSync(new URL("alpha/omna-color/sprache.js", ROOT), "utf8");
  const enTeil = spr.slice(spr.indexOf("const EN"));
  const themenEn = Object.fromEntries(themen.map(([de]) => {
    const t = enTeil.match(new RegExp(`"thema\\.${de.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}":\\s*"([^"]+)"`));
    if (!t) throw new Error(`OMNA COLOR: Thema ${de} ohne Englisch (alpha/omna-color/sprache.js)`);
    return [de, t[1]];
  }));
  const zyklen = Object.fromEntries(m.cycles.map((c: any) => [c.roman, c.name]));
  const st = Object.fromEntries(m.stanzas.map((s: any, i: number) => {
    if (s.slug !== strophen[i].s) throw new Error(`Englisch: Strophe ${s.id} hat eine andere Adresse`);
    return [s.slug, { t: s.title, b: s.bottomLine, x: s.text, r: s.references.map((r: any) => ({ w: r.work, d: r.discipline, n: r.note })) }];
  }));
  const ue = Object.fromEntries(uebungen.map((e: any) => {
    const x = exEn[e.id];
    if (!x || !x.n || !x.a?.length) throw new Error(`OMNA COLOR: Übung ${e.id} ohne Englisch (alpha/omna-color/ex.en.js)`);
    return [e.id, { n: x.n, a: x.a, m: x.m ?? e.m, f: x.f ?? e.f }];
  }));
  const obj = (name: string, o: Record<string, unknown>) => `export const ${name} = {\n${Object.entries(o).map(([k, x]) => `  ${JSON.stringify(k)}: ${JSON.stringify(x)}`).join(",\n")}\n};\n`;
  return `// Automatisch erzeugt von tools/build-drittes-rad.ts aus src/data/zu-seiner-zeit.en.json, alpha/omna-color/ex.en.js und alpha/omna-color/sprache.js – nicht von Hand bearbeiten.\n` +
    `// Das Rad auf Englisch: dieselben Schlüssel wie daten.js (Zyklus, Thema, Strophe, Übung). ORNA auf Englisch liest das Rad aus constellations.en.js.\n` +
    obj("ZYKLEN_EN", zyklen) + obj("THEMEN_EN", themenEn) + obj("STROPHEN_EN", st) + obj("UEBUNGEN_EN", ue);
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  for (const f of build()) {
    writeFileSync(new URL(f.pfad, ROOT), f.inhalt);
    console.log(`→ ${f.pfad} (${f.inhalt.length} Zeichen)`);
  }
}
