// Alpha: «Das Dritte Rad». Lässt jev EINMAL beim Bauen bewerten, welche Strophen, Konstellationen und Übungen gedanklich zusammenpassen,
// und legt das Ergebnis fest in alpha/drittes-rad/jev.js ab. Die Seite ruft jev nie auf, es werden keine Besuchertexte gesendet.
// jev ist ein Beurteiler (Wahrscheinlichkeit je Auswahl), kein Texter (api.typesafe.ai, POST /v1/systemone).
//
//   node --experimental-strip-types --no-warnings tools/build-jev-bruecken.ts            voller Lauf, etwa 560 Aufrufe, einige Cent
//   node --experimental-strip-types --no-warnings tools/build-jev-bruecken.ts --probe    drei Beispiele ansehen, nichts schreiben
//
// Zugang: Läuft ein Proxy, der den Schlüssel einsetzt, genügt NODE_USE_ENV_PROXY=1; sonst TYPESAFE_API_KEY setzen.
// Abgerufene Antworten liegen in $TMPDIR/jev-bruecken-cache.jsonl, ein abgebrochener Lauf setzt dort fort.
// Nach Änderungen an Strophen, Konstellationen oder Übungen (Anzahl, Reihenfolge) wird jev.js ungültig (Prüfsumme) und muss neu erzeugt werden.
// Danach tools/build-drittes-rad.ts laufen lassen: es setzt die Versionsmarke (?v=) in den Importen der Radmodule, die jev.js einschließt.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = new URL("../", import.meta.url);
const AUSGABE = new URL("alpha/drittes-rad/jev.js", ROOT);
const CACHE = join(process.env.TMPDIR || tmpdir(), "jev-bruecken-cache.jsonl");
const URL_API = "https://api.typesafe.ai/v1/systemone";
const MODELL = "jev-latest";
const LISTE = 8;           // so viele Nachbarn je Stück und Richtung
const PARALLEL = 6;

const kurz = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);
const ersterSatz = (t: string) => t.split(/(?<=[.!?])\s+/)[0];

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

/** Rang je Zeile (0 = beste Wahl) aus Wahrscheinlichkeiten */
const raenge = (probs: Record<string, number>) => {
  const reihe = Object.entries(probs).sort((a, b) => b[1] - a[1]);
  return new Map(reihe.map(([k, p], i) => [k, { rang: i, p }]));
};

export async function main(argv: string[]) {
  const probe = argv.includes("--probe");
  const E: any = await import(new URL("alpha/drittes-rad/engine.js", ROOT).href);
  const { STROPHEN, KONSTELLATIONEN, UEBUNGEN, nameVon } = E;
  const nS = STROPHEN.length, nK = KONSTELLATIONEN.length, nU = UEBUNGEN.length;

  const optS = Object.fromEntries(STROPHEN.map((s: any) => [`z${s.n}`, `Strophe ${s.n} «${s.t}»: ${s.b}`]));
  const optU = Object.fromEntries(UEBUNGEN.map((e: any) => [`u${e.id}`, `Übung «${e.n}» (${e.t}): ${kurz(e.a, 170)}`]));
  const keyS = STROPHEN.map((s: any) => `z${s.n}`), keyU = UEBUNGEN.map((e: any) => `u${e.id}`);
  const frS = (was: string) => ({ type: "choice", instructions: `Welche Strophe aus dem Zettelkasten «Zu seiner Zeit» steht ${was} gedanklich am nächsten?`, criteria: optS });
  const frU = (was: string) => ({ type: "choice", instructions: `Welche Gestaltungsübung passt gedanklich am besten zu ${was}?`, criteria: optU });

  // Aufträge: Konstellation → Strophe und Übung (eine Anfrage, zwei Fragen), Übung → Strophe, Strophe → Übung
  const auftraege: { k: string; zustand: unknown; fragen: Record<string, unknown> }[] = [];
  KONSTELLATIONEN.forEach((c: any, i: number) => auftraege.push({ k: `k${i}`, zustand: { konstellation: `${nameVon(c.artistId)} × ${nameVon(c.theoristId)}`, text: c.text, frage: c.question }, fragen: { s: frS("dieser Konstellation"), u: frU("dieser Konstellation") } }));
  UEBUNGEN.forEach((e: any, i: number) => auftraege.push({ k: `u${i}`, zustand: { uebung: e.n, thema: e.t, aufgabe: e.a, zum_schluss: e.f }, fragen: { s: frS("dieser Übung") } }));
  STROPHEN.forEach((s: any, i: number) => auftraege.push({ k: `s${i}`, zustand: { strophe: s.t, leitsatz: s.b, text: s.x }, fragen: { u: frU("dieser Strophe") } }));

  const fertig = new Map<string, any>();
  if (existsSync(CACHE)) for (const z of readFileSync(CACHE, "utf8").split("\n")) if (z.trim()) { const j = JSON.parse(z); fertig.set(j.k, j); }
  let todo = auftraege.filter((a) => !fertig.has(a.k));
  if (probe) todo = [auftraege[0], auftraege[nK + 40], auftraege[nK + nU + 12]].filter((a) => !fertig.has(a.k));
  console.log(`${auftraege.length} Aufträge, ${fertig.size} im Zwischenspeicher, ${todo.length} offen`);

  let erledigt = 0, ein = 0, aus = 0;
  const arbeiter = Array.from({ length: PARALLEL }, async () => {
    while (todo.length) {
      const a = todo.shift()!;
      const r = await frage(a.zustand, a.fragen);
      const probs: Record<string, Record<string, number>> = {};
      for (const [n, v] of Object.entries<any>(r.answers)) probs[n] = v.probabilities;
      const eintrag = { k: a.k, modell: r.model, usage: r.usage, probs };
      fertig.set(a.k, eintrag); ein += r.usage.input_tokens; aus += r.usage.output_tokens;
      if (!probe) appendFileSync(CACHE, JSON.stringify(eintrag) + "\n");
      if (++erledigt % 25 === 0) console.log(`  ${erledigt} fertig, ${ein} Eingabe-Token`);
    }
  });
  await Promise.all(arbeiter);
  console.log(`Fertig: ${erledigt} Aufrufe, ${ein} Eingabe-Token (bei 0,042 $ je Million etwa ${(ein * 0.042 / 1e6).toFixed(3)} $), ${aus} Ausgabe-Token`);

  // Rangmatrizen: Zeile = Ausgangsstück, Spalte = Auswahl; Wert 1 = beste Wahl, 0 = schlechteste
  const norm = (m: Map<string, { rang: number; p: number }>, key: string, n: number) => { const x = m.get(key); return x ? 1 - x.rang / (n - 1) + x.p * 1e-3 : 0; };
  const kz: number[][] = [], ku: number[][] = [], uz: number[][] = [], su: number[][] = [];
  for (let i = 0; i < nK; i++) { const r = fertig.get(`k${i}`); if (!r) continue; const ms = raenge(r.probs.s), mu = raenge(r.probs.u); kz[i] = keyS.map((k: string) => norm(ms, k, nS)); ku[i] = keyU.map((k: string) => norm(mu, k, nU)); }
  for (let i = 0; i < nU; i++) { const r = fertig.get(`u${i}`); if (!r) continue; uz[i] = keyS.map((k: string) => norm(raenge(r.probs.s), k, nS)); }
  for (let i = 0; i < nS; i++) { const r = fertig.get(`s${i}`); if (!r) continue; su[i] = keyU.map((k: string) => norm(raenge(r.probs.u), k, nU)); }

  const beste = (werte: number[], n = LISTE) => werte.map((w, i) => [w, i] as [number, number]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, n).map((x) => x[1]);
  const spalte = (m: number[][], j: number) => m.map((z) => (z ? z[j] : 0));
  // Strophe ↔ Übung: beide Richtungen zusammen (Strophe fragt nach Übungen, Übung fragt nach Strophen)
  const sue = (i: number, j: number) => (su[i]?.[j] ?? 0) + (uz[j]?.[i] ?? 0);
  const listen = {
    zf: Array.from({ length: nS }, (_, i) => beste(spalte(kz, i))),                                        // Strophe → Konstellationen
    zc: Array.from({ length: nS }, (_, i) => beste(Array.from({ length: nU }, (_, j) => sue(i, j)))),      // Strophe → Übungen
    fz: Array.from({ length: nK }, (_, i) => beste(kz[i] ?? [])),                                           // Konstellation → Strophen
    fc: Array.from({ length: nK }, (_, i) => beste(ku[i] ?? [])),                                           // Konstellation → Übungen
    cz: Array.from({ length: nU }, (_, j) => beste(Array.from({ length: nS }, (_, i) => sue(i, j)))),      // Übung → Strophen
    cf: Array.from({ length: nU }, (_, j) => beste(spalte(ku, j))),                                         // Übung → Konstellationen
  };

  if (probe) {
    for (const a of [auftraege[0], auftraege[nK + 40], auftraege[nK + nU + 12]]) {
      const r = fertig.get(a.k);
      const top = (probs: Record<string, number>) => Object.entries(probs).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([k, p]) => `${k} ${p.toFixed(2)}`).join(" | ");
      console.log(a.k, JSON.stringify(a.zustand).slice(0, 120), "\n   ", Object.entries(r.probs).map(([n, p]: any) => `${n}: ${top(p)}`).join("\n    "));
    }
    return;
  }
  const modell = [...fertig.values()][0]?.modell ?? MODELL;
  const heute = new Date().toISOString().slice(0, 10);
  const zeilen = (n: string, a: number[][]) => `  ${n}: [\n${a.map((x) => "    " + JSON.stringify(x)).join(",\n")}\n  ],\n`;
  const inhalt =
    `// Automatisch erzeugt von tools/build-jev-bruecken.ts – nicht von Hand bearbeiten.\n` +
    `// jev (${modell}, api.typesafe.ai) hat am ${heute} einmal bewertet, welche Strophen, Konstellationen und Übungen gedanklich zusammenpassen.\n` +
    `// Die Seite ruft jev nie auf. Listen: Nummern der Nachbarn je Stück, nächster zuerst (z = Zeit/Strophe, f = Form/Konstellation, c = Farbe/Übung).\n` +
    `// Gilt nur, solange die Prüfsumme zu den Beständen passt (engine.js, PRUEFSUMME).\n` +
    `export const JEV = {\n  modell: ${JSON.stringify(modell)}, stand: ${JSON.stringify(heute)}, pruefsumme: ${JSON.stringify(E.PRUEFSUMME)},\n` +
    zeilen("zf", listen.zf) + zeilen("zc", listen.zc) + zeilen("fz", listen.fz) + zeilen("fc", listen.fc) + zeilen("cz", listen.cz) + zeilen("cf", listen.cf) + `};\n`;
  writeFileSync(AUSGABE, inhalt);
  console.log(`geschrieben: alpha/drittes-rad/jev.js (${(inhalt.length / 1024).toFixed(0)} KB)\nDanach die Versionsmarke setzen: node --experimental-strip-types --no-warnings tools/build-drittes-rad.ts`);
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main(process.argv.slice(2));
