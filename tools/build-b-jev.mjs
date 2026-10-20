// Neubau /b/: Lässt jev EINMAL beim Bauen einschätzen, welche Angebote, Apps, Prüfraster und ORMA-Konstellationen jedem der 49 Zettel
// gedanklich am nächsten liegen, und legt die Wahrscheinlichkeiten in src/b/jev.json ab. Daraus zieht tools/build-b.mjs die Fäden.
// Die Seite ruft jev nie auf und sendet nichts. jev ist ein Beurteiler (Wahrscheinlichkeit je Auswahl), kein Texter (api.typesafe.ai, POST /v1/systemone).
//
//   NODE_USE_ENV_PROXY=1 node --no-warnings tools/build-b-jev.mjs            voller Lauf, 49 Aufrufe mit je vier Fragen, wenige Cent
//   NODE_USE_ENV_PROXY=1 node --no-warnings tools/build-b-jev.mjs --probe    drei Zettel ansehen, nichts schreiben
//
// Zugang: Läuft ein Proxy, der den Schlüssel einsetzt, genügt NODE_USE_ENV_PROXY=1; sonst TYPESAFE_API_KEY setzen (nie in eine Datei).
// Abgerufene Antworten liegen in $TMPDIR/b-jev-cache.jsonl (nach Prüfsumme getrennt), ein abgebrochener Lauf setzt dort fort.
// Ändern sich Zettel, Angebote, Apps, Raster oder die ORMA-Auswahl, passt die Prüfsumme nicht mehr; der Bau meldet es und nimmt bis zum
// nächsten Lauf nur die festen Fäden (gemeinsame Personen, Nachbarn im Zyklus).
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { APPS, RASTER, ANGEBOTE } from "../src/b/inhalt.mjs";
import { ladeZettel, ladeOrma } from "./b-daten.mjs";

const ROOT = new URL("../", import.meta.url);
const AUSGABE = new URL("src/b/jev.json", ROOT);
const CACHE = join(process.env.TMPDIR || tmpdir(), "b-jev-cache.jsonl");
const URL_API = "https://api.typesafe.ai/v1/systemone";
const MODELL = "jev-latest";
const PARALLEL = 6;

const ersterSatz = (t) => t.split(/(?<=[.!?])\s+/)[0];
const runde = (p) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Math.round(v * 1000) / 1000]));

async function frage(zustand, fragen) {
  const kopf = { "content-type": "application/json" };
  if (process.env.TYPESAFE_API_KEY) kopf.authorization = `Bearer ${process.env.TYPESAFE_API_KEY}`;
  for (let versuch = 0; ; versuch++) {
    try {
      const r = await fetch(URL_API, { method: "POST", headers: kopf, body: JSON.stringify({ model: MODELL, state: zustand, questions: fragen }), signal: AbortSignal.timeout(120000) });
      if (r.ok) return await r.json();
      if (r.status < 500 && r.status !== 429) throw new Error(`jev: HTTP ${r.status} ${(await r.text()).slice(0, 300)}`);
      if (versuch >= 6) throw new Error(`jev: HTTP ${r.status} nach ${versuch + 1} Versuchen`);
    } catch (e) {
      if (/^jev:/.test(e.message) || versuch >= 6) throw e;
    }
    await new Promise((ok) => setTimeout(ok, 1500 * 2 ** versuch));
  }
}

/** Prüfsumme über alles, was die Fragen bestimmt: Zettel, Angebote, Apps, Raster, ORMA-Auswahl */
export function pruefsumme(zettel, orma) {
  const h = createHash("sha256");
  for (const z of zettel) h.update(`${z.number}|${z.title}|${z.bottom_line}|${z.text}\n`);
  for (const a of ANGEBOTE) h.update(`A|${a.slug}|${a.kurz}\n`);
  for (const a of APPS) h.update(`P|${a.slug}|${a.kurz}\n`);
  for (const r of RASTER) h.update(`R|${r.slug}|${r.kurz}\n`);
  for (const k of orma) h.update(`O|${k.id}\n`);
  return h.digest("hex").slice(0, 12);
}

export async function main(argv) {
  const probe = argv.includes("--probe");
  const zettel = ladeZettel();
  const orma = ladeOrma();
  const summe = pruefsumme(zettel, orma);
  const kriterien = {
    angebot: Object.fromEntries(ANGEBOTE.map((a) => [a.slug, `${a.name}: ${a.kurz} ${a.fuer}`])),
    app: Object.fromEntries(APPS.map((a) => [a.slug, `${a.name}: ${a.kurz} ${a.fuer}`])),
    raster: Object.fromEntries(RASTER.map((r) => [r.slug, `${r.name}: ${r.kurz}`])),
    orma: Object.fromEntries(orma.map((k) => [k.id, `${k.kuenstler} × ${k.theoretiker}: ${ersterSatz(k.einstieg)}`])),
  };
  const fragen = {
    angebot: { type: "choice", instructions: "Welches Angebot liegt diesem Zettel gedanklich am nächsten – wo würde sein Gedanke in der Praxis gebraucht?", criteria: kriterien.angebot },
    app: { type: "choice", instructions: "Welche App setzt den Gedanken dieses Zettels am ehesten in eine Erfahrung um?", criteria: kriterien.app },
    raster: { type: "choice", instructions: "Welches Prüfraster teilt die Unterscheidungen dieses Zettels am ehesten?", criteria: kriterien.raster },
    orma: { type: "choice", instructions: "Welche Konstellation (Künstler:in × Theoretiker:in) denkt am ehesten dasselbe wie dieser Zettel?", criteria: kriterien.orma },
  };

  const fertig = new Map();
  if (existsSync(CACHE)) for (const z of readFileSync(CACHE, "utf8").split("\n")) if (z.trim()) { const j = JSON.parse(z); if (j.pruefsumme === summe) fertig.set(j.n, j); }
  const todo = (probe ? zettel.slice(0, 3) : zettel).filter((z) => !fertig.has(z.number));
  console.log(`${zettel.length} Zettel, ${fertig.size} im Zwischenspeicher, ${todo.length} offen (Prüfsumme ${summe})`);

  let modell = "", ein = 0, aus = 0, i = 0;
  await Promise.all(Array.from({ length: PARALLEL }, async () => {
    while (i < todo.length) {
      const z = todo[i++];
      const zustand = { zettel: `${z.number} · ${z.title} (${z.cycle.roman} ${z.cycle.name})`, leitsatz: z.bottom_line, text: z.text };
      const a = await frage(zustand, fragen);
      modell = a.model || modell; ein += a.usage?.input_tokens || 0; aus += a.usage?.output_tokens || 0;
      const eintrag = { n: z.number, pruefsumme: summe, modell: a.model, antworten: Object.fromEntries(Object.entries(a.answers).map(([k, v]) => [k, runde(v.probabilities)])) };
      if (probe) { console.log(z.number, z.title); for (const [k, p] of Object.entries(eintrag.antworten)) console.log("  ", k, Object.entries(p).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([s, w]) => `${s} ${w}`).join(" · ")); continue; }
      fertig.set(z.number, eintrag);
      appendFileSync(CACHE, JSON.stringify(eintrag) + "\n");
      process.stdout.write(`${fertig.size}/${zettel.length} ${z.title}\n`);
    }
  }));
  console.log(`Token: ${ein} ein, ${aus} aus${modell ? ` (${modell})` : ""}`);
  if (probe) return;
  const heute = new Date().toISOString().slice(0, 10);
  const ausgabe = { modell: [...fertig.values()][0]?.modell || modell, stand: heute, pruefsumme: summe, zettel: {} };
  for (const z of zettel) ausgabe.zettel[z.number] = fertig.get(z.number).antworten;
  writeFileSync(AUSGABE, JSON.stringify(ausgabe, null, 1) + "\n");
  console.log(`geschrieben: ${AUSGABE.pathname}`);
}

if (import.meta.url === new URL(process.argv[1], "file://").href || process.argv[1]?.endsWith("build-b-jev.mjs")) await main(process.argv.slice(2));
