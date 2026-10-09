// Alpha: «Die Stadt, die weitergeht». Lässt jev EINMAL beim Bauen einschätzen, wie Figuren in beschriebenen Lagen am ehesten wählen
// (Querung der Hauptstrasse, Fahrt durch das Quartier, Teilnahme am Offenen Abend), und legt die Wahrscheinlichkeiten in alpha/stadt/jev.js ab.
// Die Seite ruft jev nie auf und sendet nichts. Die Fragen stehen in alpha/stadt/fragen.js; ändern sie sich, passt die Prüfsumme nicht mehr,
// die Seite nimmt bis zum nächsten Lauf die Ersatzregeln, und ein Test meldet es.
// jev ist ein Beurteiler (Wahrscheinlichkeit je Auswahl), kein Texter (api.typesafe.ai, POST /v1/systemone).
//
//   NODE_USE_ENV_PROXY=1 node --experimental-strip-types --no-warnings tools/build-jev-stadt.ts            voller Lauf, gut 500 Aufrufe, wenige Cent
//   NODE_USE_ENV_PROXY=1 node --experimental-strip-types --no-warnings tools/build-jev-stadt.ts --probe    drei Beispiele ansehen, nichts schreiben
//
// Zugang: Läuft ein Proxy, der den Schlüssel einsetzt, genügt NODE_USE_ENV_PROXY=1; sonst TYPESAFE_API_KEY setzen (nie in eine Datei).
// Abgerufene Antworten liegen in $TMPDIR/jev-stadt-cache.jsonl (nach Prüfsumme getrennt), ein abgebrochener Lauf setzt dort fort.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = new URL("../", import.meta.url);
const AUSGABE = new URL("alpha/stadt/jev.js", ROOT);
const CACHE = join(process.env.TMPDIR || tmpdir(), "jev-stadt-cache.jsonl");
const URL_API = "https://api.typesafe.ai/v1/systemone";
const MODELL = "jev-latest";
const PARALLEL = 6;

const QUARTIER = "Ein kleines Stadtquartier: Eine Hauptstrasse trennt die Wohngebiete im Norden und im Süden. Im Süden liegen Laden, Platz und Schule, im Norden Park, Atelier und ein kleiner Kiosk.";

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

const auswahl = (wahl: Record<string, string>, keys: string[]) => Object.fromEntries(keys.map((k) => [k, wahl[k]]));
const runde = (p: Record<string, number>) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, Math.round(v * 1000) / 1000]));

export async function main(argv: string[]) {
  const probe = argv.includes("--probe");
  const F: any = await import(new URL("alpha/stadt/fragen.js", ROOT).href);

  // Aufträge: je Lage eine Anfrage; bei Querung und Teilnahme eine Frage je Person bzw. Lebenslage
  const auftraege: { k: string; teil: string; schluessel: string; zustand: unknown; fragen: Record<string, unknown> }[] = [];
  for (const l of F.querungLagen()) {
    const fragen: Record<string, unknown> = {};
    for (const [p, wer] of Object.entries<string>(F.PERSONEN)) {
      const opt = F.querungOptionen(l, p);
      if (opt.length < 2) continue;
      fragen[p] = { type: "choice", instructions: `Was tut ${wer} in dieser Lage am ehesten?`, criteria: auswahl(F.QUERUNG_WAHL, opt) };
    }
    if (!Object.keys(fragen).length) continue;
    const zustand = { quartier: QUARTIER, lage: "Jemand will zu Fuss auf die andere Seite der Hauptstrasse.", querung: F.QUERUNG.eben[l.eben], bruecke: F.QUERUNG.bruecke[l.bruecke], ausserhalb: F.QUERUNG.frei[l.frei], zweck: F.QUERUNG.zweck[l.zweck], ersatz: F.QUERUNG.ersatz[l.ersatz] };
    auftraege.push({ k: `q:${F.querungSchluessel(l)}`, teil: "querung", schluessel: F.querungSchluessel(l), zustand, fragen });
  }
  for (const l of F.fahrtLagen()) {
    const zustand = { quartier: QUARTIER, lage: "Jemand aus der Region könnte mit dem Auto durch das Quartier fahren, über die Hauptstrasse.", reisezeit: F.FAHRT.zeit[l.zeit], bus: F.FAHRT.bus[l.bus], zweck: F.FAHRT.zweck[l.zweck], tageszeit: F.FAHRT.spitze[l.spitze] };
    auftraege.push({ k: `f:${F.fahrtSchluessel(l)}`, teil: "fahrt", schluessel: F.fahrtSchluessel(l), zustand,
      fragen: { wahl: { type: "choice", instructions: `Was tut ${F.FAHRT_PERSON} in dieser Lage am ehesten?`, criteria: auswahl(F.FAHRT_WAHL, F.fahrtOptionen(l)) } } });
  }
  for (const l of F.teilnahmeLagen()) {
    const zustand = { quartier: QUARTIER, lage: "Das Atelier im Norden lädt zu einem Offenen Abend ein, an dem gemalt und Theater gespielt wird.", gebuehr: F.TEILNAHME.gebuehr[l.gebuehr], anmeldung: F.TEILNAHME.anmeldung[l.anmeldung], einladung: F.TEILNAHME.einladung[l.einladung], zeit: F.TEILNAHME.beginn[l.beginn], rolle: F.TEILNAHME.rolle[l.rolle] };
    const fragen: Record<string, unknown> = {};
    for (const [lage, wer] of Object.entries<string>(F.LAGEN)) fragen[lage] = { type: "choice", instructions: `Was tut ${wer} am ehesten?`, criteria: F.TEILNAHME_WAHL };
    auftraege.push({ k: `t:${F.teilnahmeSchluessel(l)}`, teil: "teilnahme", schluessel: F.teilnahmeSchluessel(l), zustand, fragen });
  }

  const fertig = new Map<string, any>();
  if (existsSync(CACHE)) for (const z of readFileSync(CACHE, "utf8").split("\n")) if (z.trim()) { const j = JSON.parse(z); if (j.pruefsumme === F.PRUEFSUMME) fertig.set(j.k, j); }
  const beispiele = [auftraege[37], auftraege.find((a) => a.teil === "fahrt" && a.schluessel.startsWith("deutlich"))!, auftraege.find((a) => a.teil === "teilnahme")!];
  let todo = (probe ? beispiele : auftraege).filter((a) => !fertig.has(a.k));
  console.log(`${auftraege.length} Aufträge, ${fertig.size} im Zwischenspeicher, ${todo.length} offen`);

  let erledigt = 0, ein = 0, aus = 0;
  const arbeiter = Array.from({ length: PARALLEL }, async () => {
    while (todo.length) {
      const a = todo.shift()!;
      const r = await frage(a.zustand, a.fragen);
      const probs: Record<string, Record<string, number>> = {};
      for (const [n, v] of Object.entries<any>(r.answers)) probs[n] = runde(v.probabilities);
      const eintrag = { k: a.k, pruefsumme: F.PRUEFSUMME, modell: r.model, usage: r.usage, probs };
      fertig.set(a.k, eintrag); ein += r.usage.input_tokens; aus += r.usage.output_tokens;
      if (!probe) appendFileSync(CACHE, JSON.stringify(eintrag) + "\n");
      if (++erledigt % 25 === 0) console.log(`  ${erledigt} fertig, ${ein} Eingabe-Token`);
    }
  });
  await Promise.all(arbeiter);
  console.log(`Fertig: ${erledigt} Aufrufe, ${ein} Eingabe-Token (bei 0,042 $ je Million etwa ${(ein * 0.042 / 1e6).toFixed(3)} $), ${aus} Ausgabe-Token`);

  if (probe) {
    for (const a of beispiele) console.log(a.k, "\n   ", JSON.stringify(fertig.get(a.k)?.probs));
    return;
  }
  const tab: Record<string, Record<string, unknown>> = { querung: {}, fahrt: {}, teilnahme: {} };
  for (const a of auftraege) {
    const r = fertig.get(a.k);
    if (!r) throw new Error(`fehlt: ${a.k}`);
    tab[a.teil][a.schluessel] = a.teil === "fahrt" ? r.probs.wahl : r.probs;
  }
  const modell = [...fertig.values()][0]?.modell ?? MODELL;
  const heute = new Date().toISOString().slice(0, 10);
  const block = (n: string) => `  ${n}: {\n${Object.entries(tab[n]).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n")}\n  },\n`;
  const inhalt =
    `// Automatisch erzeugt von tools/build-jev-stadt.ts – nicht von Hand bearbeiten.\n` +
    `// jev (${modell}, api.typesafe.ai) hat am ${heute} einmal eingeschätzt, wie Figuren in den Lagen aus fragen.js am ehesten wählen.\n` +
    `// Ein Sprachmodell-Urteil über plausible Reaktionen, keine empirische Häufigkeit. Die Seite ruft jev nie auf.\n` +
    `// Gilt nur, solange die Prüfsumme zu fragen.js passt; sonst nimmt die Simulation die Ersatzregeln.\n` +
    `export const JEV = {\n  modell: ${JSON.stringify(modell)}, stand: ${JSON.stringify(heute)}, pruefsumme: ${JSON.stringify(F.PRUEFSUMME)}, aufrufe: ${auftraege.length},\n` +
    block("querung") + block("fahrt") + block("teilnahme") + `};\n`;
  writeFileSync(AUSGABE, inhalt);
  console.log(`geschrieben: alpha/stadt/jev.js (${(inhalt.length / 1024).toFixed(0)} KB)`);
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main(process.argv.slice(2));
