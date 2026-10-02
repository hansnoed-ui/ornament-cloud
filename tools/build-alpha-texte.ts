// Alpha-Bereich: Prüfraster, die als Markdown vorliegen und zurzeit in Arbeit sind, als eigene Seiten.
// Quelle: src/alpha/<datei>.md (Fassung des Autors; die Website ändert daran nichts). Erzeugt je Raster
// alpha/<seite>/index.html und die Markdown-Datei zum Herunterladen unter alpha/<datei>.md.
//
//   node --experimental-strip-types tools/build-alpha-texte.ts
//
// Der Kopf der Datei (Titel, Untertitel, Fassung) wird übersprungen und steht aus RASTER im Seitenkopf;
// Überschriften werden so verschoben, dass die oberste Ebene im Text ein <h2> ist.
// Markdown: Überschriften, Absätze, Listen (auch verschachtelt), Tabellen, Zitate, Trennlinien,
// **fett**, *kursiv* und [Links](https://…). Andere Links werden nicht verlinkt.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = new URL("../", import.meta.url);

export const RASTER = [
  {
    seite: "gesellschaftskonzepte", datei: "pruefraster-gesellschaftskonzepte-0.3.md", kopfZeilen: 6,
    titel: "Prüfraster für Gesellschaftskonzepte", untertitel: "Einheit · Operation · Vermittlung",
    meta: "Entwurf 0.3 · 30. September 2026 · Arbeitsfassung",
    beschreibung: "Ein voraussetzungsarmes Modell zur Vorprüfung von Ansätzen, die eine Gesellschaftsdiagnose beanspruchen.",
  },
  {
    seite: "journalistische-texte", datei: "pruefraster-journalistische-texte-0.3.md", kopfZeilen: 5,
    titel: "Prüfraster journalistischer Texte", untertitel: "Ereignis · Kontext · Übergang · Gegenprobe · Systembezüge",
    meta: "Fassung 0.3 · 29. September 2026 · Arbeitsfassung für das Projekt von Christian Strickler",
    beschreibung: "Wie macht ein journalistischer Text aus ausgewähltem Material eine Aussage, welche Unterscheidungen tragen diese Aussage, und was könnte ihre Geltung begrenzen oder verändern?",
  },
];

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(s: string): string {
  const links: string[] = [];
  let t = s.replace(/\[([^\]]+)\]\((https:\/\/[^)\s]+)\)/g, (_, text, url) => {
    links.push(`<a href="${esc(url)}" rel="noopener">${esc(text)}</a>`);
    return `\u0000${links.length - 1}\u0000`;
  });
  t = esc(t)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)/g, "$1<em>$2</em>");
  return t.replace(/\u0000(\d+)\u0000/g, (_, i) => links[Number(i)].replace(/<a href="([^"]*)" rel="noopener">(.*)<\/a>/, (__, u, x) => `<a href="${u}" rel="noopener">${x.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")}</a>`));
}

const anker = (h: string) => h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Markdown-Körper → HTML (ohne Kopf) */
export function markdown(md: string): string {
  const lines = md.split("\n");
  const min = Math.min(...lines.map(l => l.match(/^(#{1,6}) /)?.[1].length ?? 9));
  const shift = 2 - min;
  const out: string[] = [];
  const ids = new Set<string>();
  let i = 0;
  const liste = (start: number): [string, number] => {
    // verschachtelte Listen nach Einrückung
    const ind = (l: string) => l.match(/^(\s*)/)![1].length;
    const base = ind(lines[start]);
    const ordered = /^\s*\d+\. /.test(lines[start]);
    const items: string[] = [];
    let j = start;
    while (j < lines.length && lines[j].trim() && ind(lines[j]) >= base) {
      if (ind(lines[j]) > base) {
        const [sub, next] = liste(j);
        items[items.length - 1] += sub; j = next; continue;
      }
      const m = lines[j].match(/^\s*(?:[-*]|\d+\.) (.*)$/);
      if (!m) { items[items.length - 1] += " " + inline(lines[j].trim()); j++; continue; }
      items.push(inline(m[1])); j++;
    }
    const tag = ordered ? "ol" : "ul";
    return [`<${tag}>${items.map(x => `<li>${x}</li>`).join("")}</${tag}>`, j];
  };
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    const h = l.match(/^(#{1,6}) (.+)$/);
    if (h) {
      const lvl = Math.min(6, h[1].length + shift);
      let id = anker(h[2]); while (ids.has(id)) id += "-2"; ids.add(id);
      out.push(`<h${lvl} id="${id}">${inline(h[2])}</h${lvl}>`); i++; continue;
    }
    if (/^-{3,}\s*$/.test(l)) { out.push("<hr>"); i++; continue; }
    if (l.startsWith(">")) {
      const q: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) q.push(lines[i++].replace(/^>\s?/, ""));
      out.push(`<blockquote><p>${inline(q.join(" "))}</p></blockquote>`); continue;
    }
    if (l.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++].trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim()));
      const [head, , ...body] = rows;
      out.push(`<div class="at-tabelle"><table><thead><tr>${head.map(c => `<th scope="col">${inline(c)}</th>`).join("")}</tr></thead>` +
        `<tbody>${body.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^\s*(?:[-*]|\d+\.) /.test(l)) { const [html, next] = liste(i); out.push(html); i = next; continue; }
    const p: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6} |>|\||-{3,}\s*$|\s*(?:[-*]|\d+\.) )/.test(lines[i])) p.push(lines[i++].trim());
    out.push(`<p>${inline(p.join(" "))}</p>`);
  }
  return out.join("\n");
}

export function seite(r: typeof RASTER[number], md: string): string {
  const body = markdown(md.split("\n").slice(r.kopfZeilen).join("\n"));
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(r.titel)} – Ornament Cloud · Alpha</title>
  <!-- Alpha-Bereich: öffentlich erreichbar, nicht in der Sitemap, für Suchmaschinen gesperrt (REGELN §14).
       Erzeugt mit tools/build-alpha-texte.ts aus src/alpha/${r.datei} – nicht von Hand bearbeiten. -->
  <meta name="robots" content="noindex">
  <meta name="description" content="${esc(r.beschreibung)}">
  <link rel="stylesheet" href="../../styles.css?v=29">
  <style>
    .at-arbeit { display: inline-block; margin: 1.25rem 0 0; padding: 6px 14px; border: 1.5px solid var(--accent); border-radius: 999px;
      color: var(--accent); font-size: 0.8rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; }
    .at-hinweis { margin: 0.6rem 0 0; max-width: 38em; color: var(--muted); font-size: 0.9rem; }
    .at-knopf { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; margin: 1.5rem 0 0; padding: 10px 20px;
      border: 1px solid var(--text); border-radius: 999px; color: var(--text); font-size: 0.95rem; text-decoration: none; }
    .at-knopf:hover, .at-knopf:focus-visible { background: var(--text); color: var(--bg); outline: none; }
    .at-text { max-width: 44em; margin: 2.5rem 0 4rem; padding-top: 1.5rem; border-top: 1px solid var(--border); }
    .at-text h2 { margin: 2.6rem 0 0.6rem; font-family: var(--serif); font-weight: 400; font-size: 1.7rem; line-height: 1.2; }
    .at-text h3 { margin: 2rem 0 0.4rem; font-family: var(--serif); font-weight: 400; font-size: 1.3rem; }
    .at-text h4 { margin: 1.6rem 0 0.3rem; font-size: 1rem; }
    .at-text p, .at-text li { line-height: 1.6; }
    .at-text ul, .at-text ol { padding-left: 1.3rem; }
    .at-text li { margin: 0.3rem 0; }
    .at-text blockquote { margin: 1.5rem 0; padding: 0.2rem 0 0.2rem 1.1rem; border-left: 2px solid var(--accent); font-family: var(--serif); font-size: 1.1rem; }
    .at-text hr { margin: 2.5rem 0; border: 0; border-top: 1px solid var(--border); }
    .at-text a { color: inherit; }
    .at-tabelle { overflow-x: auto; margin: 1.25rem 0; }
    .at-tabelle table { border-collapse: collapse; min-width: 34em; font-size: 0.9rem; }
    .at-tabelle th, .at-tabelle td { padding: 8px 10px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: top; }
    .at-tabelle th { border-bottom-color: var(--text); font-weight: 600; }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="wrap">
      <nav class="seitenweg" aria-label="Ornament Cloud">
        <a href="../../" aria-current="true">Ornament Cloud</a>
        <a href="../drittes-rad/">Das Dritte Rad</a>
      </nav>
      <h1>${esc(r.titel)}</h1>
      <p class="lead">${esc(r.untertitel)}</p>
      <p class="at-arbeit">Zurzeit in Arbeit</p>
      <p class="at-hinweis">${esc(r.meta)}</p>
      <a class="at-knopf" href="../${r.datei}" download="${r.datei}">Als Markdown herunterladen <span aria-hidden="true">↓</span></a>
    </div>
  </header>
  <main class="wrap">
    <article class="at-text">
${body}
    </article>
  </main>
  <!-- Besuchsstatistik ohne Cookies: https://ornament-cloud.goatcounter.com -->
  <script data-goatcounter="https://ornament-cloud.goatcounter.com/count" async src="../../vendor/goatcounter/count.js"></script>
</body>
</html>
`;
}

export function build(): { pfad: string; inhalt: string }[] {
  return RASTER.flatMap(r => {
    const md = readFileSync(new URL(`src/alpha/${r.datei}`, ROOT), "utf8");
    return [{ pfad: `alpha/${r.seite}/index.html`, inhalt: seite(r, md) }, { pfad: `alpha/${r.datei}`, inhalt: md }];
  });
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  for (const f of build()) {
    const url = new URL(f.pfad, ROOT);
    mkdirSync(new URL("./", url), { recursive: true });
    writeFileSync(url, f.inhalt);
    console.log(`→ ${f.pfad}`);
  }
}
