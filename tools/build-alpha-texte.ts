// Alpha-Bereich: Prüfraster, die als Markdown vorliegen und zurzeit in Arbeit sind, als eigene Seiten.
// Quelle: src/alpha/<datei>.md (Fassung des Autors; die Website ändert daran nichts). Erzeugt je Raster
// alpha/<seite>/index.html und die Markdown-Datei zum Herunterladen unter alpha/<datei>.md.
// Hat ein Raster einen Anwendungsprompt (src/alpha/<prompt>), steht er über dem Text wie bei den anderen
// Prüfrastern: Download, Kopieren, Textfeld (identisch mit der Datei) und «So gehst du vor»; die Datei liegt unter alpha/<prompt>.
// Ein Vorschlag zur nächsten Fassung (src/alpha/<vorschlag.datei>) steht als eigener, markierter Abschnitt unter dem Raster;
// das Raster selbst bleibt unverändert.
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
  // «Prüfraster für Gesellschaftskonzepte» hat seit dem 3. Oktober 2026 eine eigene Seite wie die ersten beiden Prüfraster
  // (PDF, Anwendungsprompt, Anleitung): alpha/gesellschaftskonzepte/index.html, von Hand gepflegt.
  {
    seite: "journalistische-texte", datei: "pruefraster-journalistische-texte-0.4.md", kopfZeilen: 5,
    titel: "Prüfraster journalistischer Texte", untertitel: "Ereignis · Kontext · Übergang · Gegenprobe · Systembezüge",
    meta: "Fassung 0.4 · 3. Oktober 2026 · Arbeitsfassung für das Projekt von Christian Strickler",
    beschreibung: "Wie macht ein journalistischer Text aus ausgewähltem Material eine Aussage, welche Unterscheidungen tragen diese Aussage, und was könnte ihre Geltung begrenzen oder verändern?",
    // seit dem 3. Oktober 2026: Anwendungsprompt aus Fassung 0.4, von Claude entworfen (Festlegungen A1–A3 gekennzeichnet)
    prompt: { datei: "journalistische-texte-anwendungsprompt-0.4.0.md", version: "0.4.0", datum: "3. Oktober 2026" },
    // seit dem 3. Oktober 2026: Modul W «Wissenschaftskommunikation», von Claude entworfen, zur Erprobung (nicht Teil von 0.4, nicht im Prompt)
    vorschlag: { datei: "pruefraster-journalistische-texte-0.5-vorschlag-modul-w.md", kurz: "Vorschlag für Fassung 0.5: Modul Wissenschaftskommunikation" },
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

type Raster = typeof RASTER[number];

/** Abschnitt «Anwendungsprompt» (nur für Raster mit Prompt) */
function promptBlock(r: Raster, text: string): string {
  const p = r.prompt;
  const kb = Math.round(Buffer.byteLength(text) / 1024);
  return `    <section class="pr-block" aria-labelledby="prompt">
      <h2 id="prompt">Anwendungsprompt</h2>
      <p class="pr-meta">Version ${p.version} · ${p.datum} · Textdatei (Markdown), ${kb} KB</p>
      <p>Übersetzt das Raster in Arbeitsanweisungen für einen KI-Assistenten (zum Beispiel Claude). Damit lässt sich ein journalistischer Text prüfen: Aussage und Modalität, der entscheidende Übergang vom Material zur Aussage, tragende Begriffe, Wechsel des Bewertungsmassstabs, gezielte Gegenproben und ein blinder Fleck nur mit Nachweis – als Kurz- oder Vollprüfung, mit Fundstellen und gekennzeichneten Befunden, oder mit «offen» und Rückfragen statt erfundener Belege.</p>
      <p class="pr-aktionen">
        <a class="pr-knopf" href="../${p.datei}" download="${p.datei}">Anwendungsprompt herunterladen <span aria-hidden="true">↓</span></a>
        <button class="pr-knopf" type="button" data-kopieren="../${p.datei}" hidden>Prompt kopieren</button>
      </p>
      <p class="pr-status" role="status" aria-live="polite"></p>
      <details class="pr-text">
        <summary>Prompt hier anzeigen – zum Markieren und Kopieren</summary>
        <p class="pr-meta">Ins Feld tippen, alles markieren und kopieren. Der Text ist identisch mit der Datei zum Herunterladen.</p>
        <textarea readonly rows="18" spellcheck="false" aria-label="Anwendungsprompt, Version ${p.version}">${esc(text).replace(/&quot;/g, '"')}</textarea>
        <p class="pr-aktionen pr-aktionen--klein"><button class="pr-knopf" type="button" data-markieren>Alles markieren</button></p>
      </details>
      <h3 class="pr-meta pr-schritte-titel">So gehst du vor</h3>
      <ol class="pr-schritte">
        <li>Den Prompt kopieren (Knopf oder Textfeld oben) oder herunterladen und die Datei mit einem Texteditor öffnen.</li>
        <li>Den ganzen Text in einen neuen Chat mit einem KI-Assistenten einfügen.</li>
        <li>Ganz unten bei «Meine Eingabe» eintragen: Kurz- oder Vollprüfung, Angaben zum Text (Titel, Autor:in, Medium, Datum, Textsorte), ob es eine Übersetzung ist und ob die Verweise vorliegen, und den Text selbst – Überschrift, Vorspann und Bildlegenden gesondert.</li>
        <li>Absenden. Die Antwort kommt als lesbarer Bericht: faire Wiedergabe der Aussage, höchstens drei Befunde mit Fundstellen, der entscheidende Übergang, die wichtigste Gegenprobe, ein blinder Fleck nur mit Nachweis und eine Quintessenz. Ohne Angabe wird eine Kurzprüfung gemacht.</li>
      </ol>
      <p class="pr-meta">Der Prompt ist eine Anwendungsversion, keine wortgetreue Abschrift des Rasters; seine eigenen Festlegungen (A1–A3) sind darin gekennzeichnet. Die beiden im Raster zurückgestellten Vorschläge wendet er nicht an. Darunter steht das Raster selbst.</p>
    </section>
`;
}

const PROMPT_SKRIPT = `  <script>
    // «Alles markieren»: markiert den ganzen Prompt im Textfeld (auch auf dem Handy)
    (function () {
      var m = document.querySelector("[data-markieren]"), t = document.querySelector(".pr-text textarea");
      if (!m || !t) return;
      m.addEventListener("click", function () { t.focus(); t.select(); t.setSelectionRange(0, t.value.length); });
    })();
    // «Prompt kopieren»: nur sichtbar, wo der Browser die Zwischenablage anbietet; sonst bleibt der Download
    (function () {
      var b = document.querySelector("[data-kopieren]"), status = document.querySelector(".pr-status");
      if (!b || !navigator.clipboard || !window.fetch) return;
      b.hidden = false;
      b.addEventListener("click", function () {
        fetch(b.getAttribute("data-kopieren")).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
          .then(function (t) { return navigator.clipboard.writeText(t); })
          .then(function () { status.textContent = "Kopiert. Jetzt in einen neuen Chat einfügen und unten «Meine Eingabe» ausfüllen."; })
          .catch(function () { status.textContent = "Kopieren ging nicht – bitte den Prompt herunterladen."; });
      });
    })();
  </script>
`;

/** Abschnitt «Vorschlag für die nächste Fassung» unter dem Raster */
function vorschlagBlock(text: string): string {
  return `    <article class="at-text at-vorschlag" id="vorschlag">
      <p class="at-vorschlag-marke">Vorschlag · nicht Bestandteil der geltenden Fassung</p>
${markdown(text)}
    </article>
`;
}

export function seite(r: Raster, md: string, prompt?: string, vorschlag?: string): string {
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
  <link rel="stylesheet" href="../../styles.css?v=34">
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
    /* Anwendungsprompt: gleich gesetzt wie auf den Seiten der anderen Prüfraster (alpha/gesellschaftskonzepte/) */
    /* Vorschlag zur nächsten Fassung: unter dem Raster, deutlich als Vorschlag markiert */
    .at-vorschlag { border-top: 2px solid var(--accent); }
    .at-vorschlag-marke { display: inline-block; margin: 0; padding: 4px 12px; border: 1.5px solid var(--accent); border-radius: 999px;
      color: var(--accent); font-size: 0.75rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
    .at-vorschlag-link { display: block; margin: 0.9rem 0 0; color: var(--text); font-size: 0.95rem; }
    .pr-block { margin: 2.5rem 0 0; padding: 1.75rem 0 0; border-top: 1px solid var(--border); }
    .pr-block h2 { margin: 0 0 0.4rem; font-family: var(--serif); font-weight: 400; font-size: 1.6rem; }
    .pr-block p { margin: 0.5rem 0 0; max-width: 38em; }
    .pr-meta { color: var(--muted); font-size: 0.9rem; }
    .pr-block .pr-aktionen { display: flex; flex-wrap: wrap; gap: 12px; margin: 1.75rem 0; }
    .pr-block .pr-status { margin: -0.75rem 0 1.75rem; }
    .pr-block .pr-status:empty { display: none; }
    .pr-block .pr-text { margin: 0; }
    .pr-block .pr-aktionen--klein { margin: 1rem 0 0; }
    .pr-knopf {
      display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 10px 20px;
      border: 1px solid var(--text); border-radius: 999px; background: none; color: var(--text);
      font: inherit; font-size: 0.95rem; text-decoration: none; cursor: pointer;
    }
    .pr-knopf:hover, .pr-knopf:focus-visible { background: var(--text); color: var(--bg); outline: none; }
    .pr-status { color: var(--muted); font-size: 0.9rem; }
    .pr-schritte-titel { margin: 1.25rem 0 0; font-weight: 600; }
    .pr-schritte { max-width: 38em; margin: 1rem 0 0; padding-left: 1.3rem; }
    .pr-schritte li { margin: 0.45rem 0; }
    .pr-text summary { cursor: pointer; font-size: 0.95rem; text-decoration: underline; text-underline-offset: 3px; }
    .pr-text textarea {
      display: block; box-sizing: border-box; width: 100%; margin: 0.75rem 0 0; padding: 14px;
      border: 1px solid var(--border); border-radius: 8px; background: var(--surface); color: var(--text);
      font: 0.85rem/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; resize: vertical;
    }
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
      <a class="at-knopf" href="../${r.datei}" download="${r.datei}">${r.prompt ? "Raster als Markdown herunterladen" : "Als Markdown herunterladen"} <span aria-hidden="true">↓</span></a>${vorschlag === undefined ? "" : `
      <a class="at-vorschlag-link" href="#vorschlag">${esc(r.vorschlag.kurz)} <span aria-hidden="true">↓</span></a>`}
    </div>
  </header>
  <main class="wrap">
${prompt === undefined ? "" : promptBlock(r, prompt)}    <article class="at-text">
${body}
    </article>
${vorschlag === undefined ? "" : vorschlagBlock(vorschlag)}  </main>

  <!-- Kontakt (seit 5. Oktober 2026 auf allen Seiten) -->
  <footer class="site-footer">
    <div class="wrap">
      <p>Fragen und Anmerkungen zur Website: <a href="mailto:hansnoed@gmail.com">hansnoed@gmail.com</a></p>
    </div>
  </footer>
${prompt === undefined ? "" : PROMPT_SKRIPT}  <!-- Besuchsstatistik ohne Cookies: https://ornament-cloud.goatcounter.com -->
  <script data-goatcounter="https://ornament-cloud.goatcounter.com/count" async src="../../vendor/goatcounter/count.js"></script>
</body>
</html>
`;
}

export function build(): { pfad: string; inhalt: string }[] {
  return RASTER.flatMap(r => {
    const md = readFileSync(new URL(`src/alpha/${r.datei}`, ROOT), "utf8");
    const prompt = r.prompt && readFileSync(new URL(`src/alpha/${r.prompt.datei}`, ROOT), "utf8");
    const vorschlag = r.vorschlag && readFileSync(new URL(`src/alpha/${r.vorschlag.datei}`, ROOT), "utf8");
    return [{ pfad: `alpha/${r.seite}/index.html`, inhalt: seite(r, md, prompt || undefined, vorschlag || undefined) }, { pfad: `alpha/${r.datei}`, inhalt: md },
      ...(prompt ? [{ pfad: `alpha/${r.prompt.datei}`, inhalt: prompt }] : [])];
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
