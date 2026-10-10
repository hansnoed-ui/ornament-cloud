// Alpha: «The Fictory». Lässt jev EINMAL beim Bauen prüfen, welche der sieben Operationsregeln (alpha/the-fictory/regeln.js)
// sich am ehesten aus einem Gedanken jeder ORNA-Konstellation ableiten lässt, und welcher Satz des Textes diesen Gedanken trägt.
// Ergebnis: alpha/the-fictory/jev.js (Wahrscheinlichkeiten je Regel, Satznummer je Regel). Die Seite ruft jev nie auf und sendet nichts;
// sie zieht die Regel reproduzierbar aus diesen Wahrscheinlichkeiten. jev ist ein Beurteiler (Wahrscheinlichkeit je Auswahl), kein Texter
// (api.typesafe.ai, POST /v1/systemone). Texte und Sätze bleiben unverändert; jev wählt nur aus.
//
//   NODE_USE_ENV_PROXY=1 node --experimental-strip-types --no-warnings tools/build-jev-fictory.ts            voller Lauf (326 Aufrufe)
//   NODE_USE_ENV_PROXY=1 node --experimental-strip-types --no-warnings tools/build-jev-fictory.ts --probe    drei Beispiele ansehen, nichts schreiben
//
// Zugang: Läuft ein Proxy, der den Schlüssel einsetzt, genügt NODE_USE_ENV_PROXY=1; sonst TYPESAFE_API_KEY setzen (nie in eine Datei).
// Abgerufene Antworten liegen in $TMPDIR/jev-fictory-cache.jsonl (nach Prüfsumme getrennt), ein abgebrochener Lauf setzt dort fort.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = new URL("../", import.meta.url);
const AUSGABE = new URL("alpha/the-fictory/jev.js", ROOT);
const CACHE = join(process.env.TMPDIR || tmpdir(), "jev-fictory-cache.jsonl");
const URL_API = "https://api.typesafe.ai/v1/systemone";
const MODELL = "jev-latest";
const PARALLEL = 6;

async function frage(zustand: unknown, fragen: Record<string, unknown>): Promise<any> {
  const kopf: Record<string, string> = { "content-type": "application/json" };
  if (process.env.TYPESAFE_API_KEY) kopf.authorization = `Bearer ${process.env.TYPESAFE_API_KEY}`;
  for (let versuch = 0; ; versuch++) {
    try {
      const r = await fetch(URL_API, { method: "POST", headers: kopf, body: JSON.stringify({ model: MODELL, state: zustand, questions: fragen }), signal: AbortSignal.timeout(120000) });
      if (r.ok) return await r.json();
      if (r.status < 500 && r.status !== 429) throw new Error(`jev: HTTP ${r.status} ${(await r.text()).slice(0, 300)}`);
      if (versuch >= 6) throw new Error(`jev: HTTP ${r.status} nach ${versuch + 1} Versuchen`);
    } catch (e: any) {
      if (/^jev:/.test(e.message) || versuch >= 6) throw e;
    }
    await new Promise((ok) => setTimeout(ok, 1500 * 2 ** versuch));
  }
}

const runde = (p: Record<string, number>) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Math.round(v * 1000) / 1000]));

export async function main(argv: string[]) {
  const probe = argv.includes("--probe");
  const { REGELN, REGEL_IDS, saetze, pruefsumme } = await import(new URL("alpha/the-fictory/regeln.js", ROOT).href);
  const { constellations } = await import(new URL("portfolio/nebeneinander-nacheinander/js/data/constellations.js", ROOT).href);
  const { artists } = await import(new URL("portfolio/nebeneinander-nacheinander/js/data/artists.js", ROOT).href);
  const { theorists } = await import(new URL("portfolio/nebeneinander-nacheinander/js/data/theorists.js", ROOT).href);
  const PS = pruefsumme(constellations);
  const person = (id: string) => [...artists, ...theorists].find((p: any) => p.id === id)?.name ?? id;

  const regelKriterien = Object.fromEntries(REGEL_IDS.map((k: string) => [k, `${REGELN[k].name}: ${REGELN[k].eingriff}`]));
  const auftraege = constellations.map((k: any) => {
    const s: string[] = saetze(k.text);
    const satzKriterien = Object.fromEntries(s.map((t, i) => [`s${i + 1}`, t]));
    const fragen: Record<string, unknown> = {
      regel: { type: "choice", instructions: "Aus einem Gedanken dieses Textes soll eine Regel für die Umgestaltung eines Bildes abgeleitet werden (eine gestalterische Übersetzung, keine Aussage über die Personen). Welche der folgenden Bildregeln lässt sich am ehesten mit einem Gedanken stützen, der im Text tatsächlich steht?", criteria: regelKriterien },
    };
    for (const r of REGEL_IDS) fragen[`satz_${r}`] = { type: "choice", instructions: `Welcher Satz des Textes trägt am ehesten einen Gedanken, aus dem sich diese Bildregel ableiten liesse: «${REGELN[r].name} – ${REGELN[r].kurz}»?`, criteria: satzKriterien };
    return { k: k.id, zustand: { konstellation: `${person(k.artistId)} × ${person(k.theoristId)}`, text: k.text }, fragen, saetze: s.length };
  });

  const fertig = new Map<string, any>();
  if (existsSync(CACHE)) for (const z of readFileSync(CACHE, "utf8").split("\n")) if (z.trim()) { const j = JSON.parse(z); if (j.pruefsumme === PS) fertig.set(j.k, j); }
  const beispiele = [auftraege[0], auftraege[1], auftraege[2]];
  const todo = (probe ? beispiele : auftraege).filter((a: any) => !fertig.has(a.k));
  console.log(`${auftraege.length} Aufträge, ${fertig.size} im Zwischenspeicher, ${todo.length} offen`);

  let erledigt = 0, ein = 0, aus = 0;
  const arbeiter = Array.from({ length: PARALLEL }, async () => {
    while (todo.length) {
      const a = todo.shift()!;
      const r = await frage(a.zustand, a.fragen);
      const regel = runde(r.answers.regel.probabilities);
      const satz: Record<string, number> = {};
      for (const k of REGEL_IDS) {
        const p = r.answers[`satz_${k}`]?.probabilities ?? {};
        const best = Object.entries<number>(p).sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0];
        satz[k] = best ? Number(best[0].slice(1)) - 1 : 0;
      }
      const eintrag = { k: a.k, pruefsumme: PS, modell: r.model, usage: r.usage, regel, satz };
      fertig.set(a.k, eintrag); ein += r.usage.input_tokens; aus += r.usage.output_tokens;
      if (!probe) appendFileSync(CACHE, JSON.stringify(eintrag) + "\n");
      if (++erledigt % 25 === 0) console.log(`  ${erledigt} fertig, ${ein} Eingabe-Token`);
    }
  });
  await Promise.all(arbeiter);
  console.log(`Fertig: ${erledigt} Aufrufe, ${ein} Eingabe-Token (bei 0,042 $ je Million etwa ${(ein * 0.042 / 1e6).toFixed(3)} $), ${aus} Ausgabe-Token`);

  if (probe) {
    for (const a of beispiele) {
      const e = fertig.get(a.k);
      const s = saetze(constellations.find((k: any) => k.id === a.k).text);
      const top = Object.entries<number>(e.regel).sort((x, y) => y[1] - x[1])[0][0];
      console.log(a.k, "\n   ", JSON.stringify(e.regel), "\n    beste Regel", top, "→ Satz:", s[e.satz[top]]);
    }
    return;
  }
  const modell = [...fertig.values()][0]?.modell ?? MODELL;
  const heute = new Date().toISOString().slice(0, 10);
  const zeilen = auftraege.map((a: any) => {
    const e = fertig.get(a.k);
    if (!e) throw new Error(`fehlt: ${a.k}`);
    return `    ${JSON.stringify(a.k)}: { regel: ${JSON.stringify(e.regel)}, satz: ${JSON.stringify(e.satz)} }`;
  });
  const inhalt =
    `// Automatisch erzeugt von tools/build-jev-fictory.ts – nicht von Hand bearbeiten.\n` +
    `// jev (${modell}, api.typesafe.ai) hat am ${heute} einmal eingeschätzt, welche Operationsregel aus regeln.js sich am ehesten aus einem Gedanken\n` +
    `// jeder ORNA-Konstellation ableiten lässt (regel: Wahrscheinlichkeiten) und welcher Satz des Textes ihn trägt (satz: Satznummer ab 0 je Regel).\n` +
    `// Ein Sprachmodell-Urteil über eine gestalterische Übersetzung, keine Aussage über die Personen. Die Seite ruft jev nie auf.\n` +
    `// Gilt nur, solange die Prüfsumme zu Regeln und Bestand passt; sonst nimmt die Seite die Stichwort-Zuordnung.\n` +
    `export const JEV = {\n  modell: ${JSON.stringify(modell)}, stand: ${JSON.stringify(heute)}, pruefsumme: ${JSON.stringify(PS)}, aufrufe: ${auftraege.length},\n  eintraege: {\n${zeilen.join(",\n")}\n  },\n};\n`;
  writeFileSync(AUSGABE, inhalt);
  console.log(`geschrieben: alpha/the-fictory/jev.js (${(inhalt.length / 1024).toFixed(0)} KB)`);
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main(process.argv.slice(2));
