// Setzt den Werkbericht (src/doppelspalt/werkbericht.md) als HTML in
// portfolio/nebeneinander-nacheinander/werkbericht/index.html, zwischen
// <!-- WERKBERICHT:START --> und <!-- WERKBERICHT:END -->. Kopf und Rahmen der Seite werden von Hand gepflegt.
//
//   node --experimental-strip-types tools/build-werkbericht.ts
//
// Bewusst kleiner Umwandler ohne Abhängigkeiten. Er kennt genau das, was der Bericht braucht:
// Überschriften (#, ##), Absätze, Listen (- ), Tabellen (| … |), Trennlinien (---),
// **fett**, *kursiv* und [Links](ziel). Das Inhaltsverzeichnis entsteht aus den H2.
// Der Text selbst wird nicht verändert.
import { readFileSync, writeFileSync } from "node:fs";

const SRC = new URL("../src/doppelspalt/werkbericht.md", import.meta.url);
const PAGE = new URL("../portfolio/nebeneinander-nacheinander/werkbericht/index.html", import.meta.url);
const START = "<!-- WERKBERICHT:START -->", END = "<!-- WERKBERICHT:END -->";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(s: string): string {
  return esc(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${u.replace(/"/g, "&quot;")}">${t}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

/** Anker aus einer Überschrift wie «3. Entwicklung» → «entwicklung» */
export function slug(h: string): string {
  return h.replace(/^\d+\.\s*/, "").toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function buildWerkbericht(md: string = readFileSync(SRC, "utf8")): { html: string; toc: { id: string; title: string }[] } {
  const blocks = md.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
  const out: string[] = [], toc: { id: string; title: string }[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    const first = lines[0];
    if (/^# /.test(first)) continue;                                   // Titel steht im Seitenkopf
    if (/^---+$/.test(first.trim())) { out.push("<hr>"); continue; }
    if (/^## /.test(first)) {
      const title = first.slice(3).trim(), id = slug(title);
      toc.push({ id, title });
      out.push(`<h2 id="${id}">${inline(title)}</h2>`);
      if (lines.length > 1) out.push(`<p>${inline(lines.slice(1).join(" "))}</p>`);
      continue;
    }
    if (lines.every(l => /^- /.test(l))) {
      out.push(`<ul>${lines.map(l => `<li>${inline(l.slice(2))}</li>`).join("")}</ul>`);
      continue;
    }
    if (lines.every(l => /^\|.*\|$/.test(l.trim()))) {
      const rows = lines.map(l => l.trim().slice(1, -1).split("|").map(c => c.trim()));
      const [head, , ...body] = rows;                                   // zweite Zeile ist |---|
      out.push(`<div class="wb-table"><table><thead><tr>${head.map(c => `<th scope="col">${inline(c)}</th>`).join("")}</tr></thead>` +
        `<tbody>${body.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    // Stand-Zeile direkt unter dem Titel (ganz kursiv)
    if (/^\*[^*].*\*$/.test(block.trim()) && out.length === 0) { out.push(`<p class="wb-stand">${inline(block.trim().slice(1, -1))}</p>`); continue; }
    out.push(`<p>${inline(lines.join(" "))}</p>`);
  }
  const nav = `<nav class="wb-toc" aria-labelledby="wb-toc-titel"><h2 id="wb-toc-titel">Inhalt</h2><ol>${toc.map(t =>
    `<li><a href="#${t.id}">${inline(t.title.replace(/^\d+\.\s*/, ""))}</a></li>`).join("")}</ol></nav>`;
  // Inhaltsverzeichnis nach dem einleitenden Absatz, vor dem ersten Kapitel
  const firstH2 = out.findIndex(x => x.startsWith("<h2"));
  const hrBefore = out[firstH2 - 1] === "<hr>" ? firstH2 - 1 : firstH2;
  out.splice(hrBefore, 0, nav);
  return { html: out.join("\n"), toc };
}

export function writeWerkbericht(): number {
  const page = readFileSync(PAGE, "utf8");
  const i = page.indexOf(START), j = page.indexOf(END);
  if (i < 0 || j < i) throw new Error("Werkbericht: Marken WERKBERICHT:START / WERKBERICHT:END fehlen");
  const { html, toc } = buildWerkbericht();
  writeFileSync(PAGE, page.slice(0, i + START.length) + "\n" + html + "\n" + page.slice(j));
  return toc.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`Werkbericht geschrieben: ${writeWerkbericht()} Kapitel`);
}
