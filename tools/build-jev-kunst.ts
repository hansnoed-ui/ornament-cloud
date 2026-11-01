// «Kunst» (alpha/kunst/): Lässt jev EINMAL beim Bauen einschätzen, welcher Zettel aus «Zu seiner Zeit» und welche ORNA-Konstellation
// jedem freigegebenen Beitrag gedanklich am nächsten steht, und legt das Ergebnis fest in alpha/kunst/jev.js ab.
// Die Seite ruft jev nie auf und sendet nichts; markiert jemand bis zu vier Beiträge, zählt sie diese Werte zusammen.
// jev ist ein Beurteiler (Wahrscheinlichkeit je Auswahl), kein Texter (api.typesafe.ai, POST /v1/systemone).
//
//   node --experimental-strip-types --no-warnings tools/build-jev-kunst.ts            voller Lauf: ein Aufruf je Beitrag (zwei Fragen)
//   node --experimental-strip-types --no-warnings tools/build-jev-kunst.ts --probe    drei Beispiele ansehen, nichts schreiben
//
// Zugang: Läuft ein Proxy, der den Schlüssel einsetzt, genügt NODE_USE_ENV_PROXY=1; sonst TYPESAFE_API_KEY setzen
// (in GitHub Actions: Workflow «jev Kunst», mit dem Secret TYPESAFE_API_KEY).
// Abgerufene Antworten liegen in $TMPDIR/jev-kunst-cache.jsonl (Schlüssel: Kennung und Prüfsumme des Texts), ein abgebrochener Lauf setzt dort fort.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = new URL("../", import.meta.url);
const AUSGABE = new URL("alpha/kunst/jev.js", ROOT);
const CACHE = join(process.env.TMPDIR || tmpdir(), "jev-kunst-cache.jsonl");
const URL_API = "https://api.typesafe.ai/v1/systemone";
const MODELL = "jev-latest";
const LISTE = 8;           // so viele beste Ziele je Beitrag und Art
const PARALLEL = 6;
const TEXT_MAX = 2400;     // längere Beiträge gekürzt (jev bekommt nur Ausgangslage, keine Bilder)

const kurz = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);
const ersterSatz = (t: string) => t.split(/(?<=[.!?])\s+/)[0];
const pruef = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 12);

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

export async function main(argv: string[]) {
  const probe = argv.includes("--probe");
  const E: any = await import(new URL("alpha/drittes-rad/engine.js", ROOT).href);
  const { BEITRAEGE } = await import(new URL("alpha/kunst/beitraege.js", ROOT).href);
  const { STROPHEN, KONSTELLATIONEN, nameVon } = E;
  if (!BEITRAEGE.length) { console.log("Keine Beiträge in alpha/kunst/beitraege.js – nichts zu tun."); return; }

  const optZ = Object.fromEntries(STROPHEN.map((s: any, j: number) => [`z${j}`, `Zettel ${s.n} «${s.t}»: ${s.b}`]));
  const optK = Object.fromEntries(KONSTELLATIONEN.map((c: any, j: number) => [`k${j}`, `${nameVon(c.artistId)} × ${nameVon(c.theoristId)}: ${kurz(ersterSatz(c.text), 150)}`]));
  const fragen = {
    z: { type: "choice", instructions: "Welcher Zettel aus dem Zettelkasten «Zu seiner Zeit» steht diesem Beitrag über Kunst gedanklich am nächsten?", criteria: optZ },
    k: { type: "choice", instructions: "Welche Begegnung aus ORNA (eine Künstlerin oder ein Künstler und eine Theoretikerin oder ein Theoretiker) passt gedanklich am besten zu diesem Beitrag über Kunst?", criteria: optK },
  };

  const auftraege = BEITRAEGE.map((b: any) => ({ k: `${b.i}:${pruef(b.t)}`, i: b.i, zustand: { beitrag: kurz(b.t, TEXT_MAX), datum: b.d } }));
  const fertig = new Map<string, any>();
  if (existsSync(CACHE)) for (const z of readFileSync(CACHE, "utf8").split("\n")) if (z.trim()) { const j = JSON.parse(z); fertig.set(j.k, j); }
  let todo = auftraege.filter((a: any) => !fertig.has(a.k));
  if (probe) todo = todo.slice(0, 3);
  console.log(`${auftraege.length} Beiträge, ${fertig.size} im Zwischenspeicher, ${todo.length} offen`);

  let erledigt = 0, ein = 0, aus = 0;
  await Promise.all(Array.from({ length: PARALLEL }, async () => {
    while (todo.length) {
      const a = todo.shift()!;
      const r = await frage(a.zustand, fragen);
      const top = (probs: Record<string, number>) => Object.entries(probs).sort((x, y) => y[1] - x[1]).slice(0, LISTE).map(([key, p]) => [Number(key.slice(1)), Math.round(p * 1000) / 1000]);
      const eintrag = { k: a.k, modell: r.model, z: top(r.answers.z.probabilities), kk: top(r.answers.k.probabilities) };
      fertig.set(a.k, eintrag); ein += r.usage?.input_tokens ?? 0; aus += r.usage?.output_tokens ?? 0;
      if (probe) console.log(a.i, kurz(a.zustand.beitrag, 90), "\n   Zettel:", eintrag.z.slice(0, 3).map(([j, p]: any) => `${STROPHEN[j].t} ${p}`).join(" | "), "\n   ORNA:", eintrag.kk.slice(0, 3).map(([j, p]: any) => `${nameVon(KONSTELLATIONEN[j].artistId)} × ${nameVon(KONSTELLATIONEN[j].theoristId)} ${p}`).join(" | "));
      else appendFileSync(CACHE, JSON.stringify(eintrag) + "\n");
      if (++erledigt % 25 === 0) console.log(`  ${erledigt} fertig, ${ein} Eingabe-Token`);
    }
  }));
  console.log(`Fertig: ${erledigt} Aufrufe, ${ein} Eingabe-Token (bei 0,042 $ je Million etwa ${(ein * 0.042 / 1e6).toFixed(3)} $), ${aus} Ausgabe-Token`);
  if (probe) return;

  const z: Record<string, unknown> = {}, k: Record<string, unknown> = {};
  let modell = MODELL;
  for (const a of auftraege) { const e = fertig.get(a.k); if (!e) continue; z[a.i] = e.z; k[a.i] = e.kk; modell = e.modell ?? modell; }
  const pruefsumme = pruef(JSON.stringify([STROPHEN.map((s: any) => s.s), KONSTELLATIONEN.map((c: any) => c.id)]));
  const heute = new Date().toISOString().slice(0, 10);
  const inhalt =
    `// Automatisch erzeugt von tools/build-jev-kunst.ts – nicht von Hand bearbeiten.\n` +
    `// jev (${modell}, api.typesafe.ai) hat am ${heute} jeden freigegebenen Beitrag einmal eingeschätzt: welcher Zettel (z) und welche ORNA-Konstellation (k)\n` +
    `// ihm gedanklich am nächsten stehen. Je Beitrag die ${LISTE} besten als [Nummer im Bestand, Wahrscheinlichkeit]. Die Seite ruft jev nie auf.\n` +
    `// Gilt nur, solange Zettel und Konstellationen dieselben sind (pruefsumme).\n` +
    `export const JEV = { modell: ${JSON.stringify(modell)}, stand: ${JSON.stringify(heute)}, pruefsumme: ${JSON.stringify(pruefsumme)}, gueltig: true,\n` +
    `  z: ${JSON.stringify(z)},\n  k: ${JSON.stringify(k)},\n};\n`;
  writeFileSync(AUSGABE, inhalt);
  console.log(`geschrieben: alpha/kunst/jev.js (${Object.keys(z).length} Beiträge, ${(inhalt.length / 1024).toFixed(0)} KB)`);
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main(process.argv.slice(2));
