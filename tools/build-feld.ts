// Erzeugt den Inhalt der Feldansicht (portfolio/nebeneinander-nacheinander/feld/index.html)
// aus denselben Daten wie das Rad: Matrix 20 × 20 und Liste pro Künstler:in.
// Geschrieben wird nur zwischen den Marken <!-- FELD:START --> und <!-- FELD:END -->;
// der Rest der Seite (Kopf, Einleitung) wird von Hand gepflegt.
//
//   node --experimental-strip-types tools/build-feld.ts
//
// Wird von tools/sync-doppelspalt-data.ts mit aufgerufen, damit Rad und Feld nie auseinanderlaufen.
//
// Lücken bewerten (vorbereitet): Liegt src/doppelspalt/redaktion/gaps.csv vor
// (Spalten kuenstler_id;theoretiker_id;bewertung, bewertung = mittel | schwach),
// erhalten die freien Felder die Klasse feld-gap--<bewertung>. Ohne Datei bleiben alle
// freien Felder gleich. Die Ansicht muss dafür nicht umgebaut werden.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { artists } from "../src/doppelspalt/src/data/artists.ts";
import { theorists } from "../src/doppelspalt/src/data/theorists.ts";
import { constellations } from "../src/doppelspalt/src/data/constellations.ts";

const PAGE = new URL("../portfolio/nebeneinander-nacheinander/feld/index.html", import.meta.url);
const GAPS = new URL("../src/doppelspalt/redaktion/gaps.csv", import.meta.url);
const START = "<!-- FELD:START -->", END = "<!-- FELD:END -->";
const RATINGS = ["mittel", "schwach"];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const href = (id: string) => `../?pair=${encodeURIComponent(id)}`;

const byPair = new Map(constellations.map(c => [c.pairKey, c]));

/** Bewertung der freien Felder: Text einer gaps.csv → Map "künstler__theoretiker" → mittel | schwach */
export function parseGaps(text: string): Map<string, string> {
  const gaps = new Map<string, string>();
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return gaps;
  const [head, ...rows] = lines;
  if (head.split(";").slice(0, 3).join(";") !== "kuenstler_id;theoretiker_id;bewertung") throw new Error(`gaps.csv: unerwartete Spalten: ${head}`);
  for (const row of rows) {
    const [a, t, r] = row.split(";").map(s => s.trim());
    const key = `${a}__${t}`;
    if (!artists.some(p => p.id === a) || !theorists.some(p => p.id === t)) throw new Error(`gaps.csv: unbekannte ID in ${row}`);
    if (byPair.has(key)) throw new Error(`gaps.csv: ${key} ist kein freies Feld`);
    if (!RATINGS.includes(r)) throw new Error(`gaps.csv: Bewertung "${r}" in ${row} (erlaubt: ${RATINGS.join(", ")})`);
    gaps.set(key, r);
  }
  return gaps;
}

function readGaps(): Map<string, string> {
  return existsSync(GAPS) ? parseGaps(readFileSync(GAPS, "utf8")) : new Map();
}

/** Kleines Bild des Feldes für schmale Bildschirme: 20 × 20 Zellen à 14, nicht anklickbar, aria-hidden */
function miniFeld(): string {
  const S = 14, W = S * theorists.length, H = S * artists.length;
  let grid = "", dots = "", gaps = "";
  for (let i = 0; i <= artists.length; i += 1) grid += `M0,${i * S}H${W}`;
  for (let j = 0; j <= theorists.length; j += 1) grid += `M${j * S},0V${H}`;
  artists.forEach((a, i) => theorists.forEach((t, j) => {
    const x = j * S, y = i * S;
    if (byPair.has(`${a.id}__${t.id}`)) dots += `M${x + S / 2 - 1.6},${y + S / 2}a1.6,1.6 0 1,0 3.2,0a1.6,1.6 0 1,0 -3.2,0`;
    else gaps += `M${x},${y + S}L${x + S},${y}`;
  }));
  return `<svg class="feld-mini" viewBox="-0.5 -0.5 ${W + 1} ${H + 1}" aria-hidden="true" focusable="false">` +
    `<path class="feld-mini-grid" d="${grid}"/><path class="feld-mini-leer" d="${gaps}"/><path class="feld-mini-voll" d="${dots}"/></svg>`;
}

export function buildFeld(gaps: Map<string, string> = readGaps()): string {
  const out: string[] = [];

  // ---------- Matrix (ab 760 px) ----------
  out.push(`<div class="feld-matrix-wrap">`);
  out.push(`<table class="feld-matrix">`);
  out.push(`<caption class="sr-only">Zeilen: Künstler:innen, Spalten: Theoretiker:innen. Besetzte Felder führen zur jeweiligen Konstellation.</caption>`);
  out.push(`<thead><tr><td class="feld-corner"></td>${theorists.map(t => `<th scope="col"><span>${esc(t.name)}</span></th>`).join("")}</tr></thead>`);
  out.push(`<tbody>`);
  for (const a of artists) {
    const cells = theorists.map(t => {
      const c = byPair.get(`${a.id}__${t.id}`);
      if (c) return `<td class="feld-voll"><a href="${href(c.id)}" title="${esc(c.question)}"><span class="sr-only">${esc(a.name)} × ${esc(t.name)}</span></a></td>`;
      const g = gaps.get(`${a.id}__${t.id}`);
      return `<td class="feld-leer${g ? ` feld-gap--${g}` : ""}"${g ? ` data-gap="${g}"` : ""}><span class="sr-only">keine Konstellation</span></td>`;
    }).join("");
    out.push(`<tr><th scope="row">${esc(a.name)}</th>${cells}</tr>`);
  }
  out.push(`</tbody></table></div>`);

  // ---------- Liste pro Künstler:in (schmal) ----------
  out.push(`<div class="feld-liste">`);
  out.push(miniFeld());
  // Sprungmarken auf die zwanzig Abschnitte
  out.push(`<nav class="feld-sprung" aria-label="Künstler:innen">${artists.map(a => `<a href="#feld-${a.id}">${esc(a.name)}</a>`).join(`<span aria-hidden="true"> · </span>`)}</nav>`);
  for (const a of artists) {
    const own = theorists.map(t => byPair.get(`${a.id}__${t.id}`)).filter(Boolean) as typeof constellations[number][];
    const free = theorists.filter(t => !byPair.has(`${a.id}__${t.id}`));
    out.push(`<section class="feld-person" aria-labelledby="feld-${a.id}">`);
    out.push(`<h2 id="feld-${a.id}">${esc(a.name)}</h2>`);
    out.push(`<ul>`);
    for (const c of own) {
      const t = theorists.find(p => p.id === c.theoristId)!;
      out.push(`<li><a href="${href(c.id)}"><span class="feld-name">${esc(t.name)}</span><span class="feld-frage">${esc(c.question)}</span></a></li>`);
    }
    out.push(`</ul>`);
    if (free.length) out.push(`<p class="feld-frei">Keine Konstellation mit ${free.map(t => esc(t.name)).join(", ")}.</p>`);
    out.push(`</section>`);
  }
  out.push(`</div>`);
  return out.join("\n");
}

export function writeFeld(): void {
  const page = readFileSync(PAGE, "utf8");
  const i = page.indexOf(START), j = page.indexOf(END);
  if (i < 0 || j < i) throw new Error("Feldansicht: Marken FELD:START / FELD:END fehlen");
  writeFileSync(PAGE, page.slice(0, i + START.length) + "\n" + buildFeld() + "\n" + page.slice(j));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  writeFeld();
  console.log(`Feldansicht geschrieben: ${constellations.length} Konstellationen, ${artists.length * theorists.length - constellations.length} freie Felder`);
}
