// Die Regeln aus .htaccess (Block «Der Neubau an der Wurzel», 16. November 2026) nachgespielt, wie mod_rewrite sie in .htaccess
// anwendet: Regel für Regel, nach einer internen Umschreibung von vorn, THE_REQUEST bleibt die ursprüngliche Anfrage.
// Für tests/wurzel.test.mjs und alle Tests, die von einer Adresse (Sitemap, og:image) auf die Datei im Repo schliessen.
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");
const htaccess = lies(".htaccess");
const block = htaccess.slice(htaccess.indexOf("# ---- Der Neubau an der Wurzel"), htaccess.indexOf("</IfModule>", htaccess.indexOf("# ---- Der Neubau an der Wurzel")));

/** die Regeln des Blocks: { conds: [[var, regex, negiert]], muster, ziel, flags } */
function regeln() {
  const out = []; let conds = [];
  for (const z of block.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))) {
    const c = z.match(/^RewriteCond %\{(\w+)\} (!?)(\S+)$/);
    if (c) { conds.push([c[1], new RegExp(c[3]), c[2] === "!"]); continue; }
    const r = z.match(/^RewriteRule (\S+) (\S+) \[([^\]]+)\]$/);
    assert.ok(r, `unbekannte Zeile: ${z}`);
    out.push({ conds, muster: new RegExp(r[1]), ziel: r[2], flags: r[3].split(",") });
    conds = [];
  }
  return out;
}
export const REGELN = regeln();

/** Was der Server auf eine Anfrage antwortet: { umleitung } oder { datei } (Pfad im Repo) oder { fehlt } */
export function anfrage(adresse) {
  const u = new URL(adresse, "https://ornament.cloud");
  const THE_REQUEST = `GET ${u.pathname}${u.search} HTTP/1.1`, QUERY_STRING = u.search.slice(1);
  let pfad = decodeURIComponent(u.pathname);
  for (let runde = 0; runde < 10; runde++) {
    let neu = null;
    for (const r of REGELN) {
      const m = pfad.slice(1).match(r.muster);
      if (!m) continue;
      const werte = { THE_REQUEST, QUERY_STRING, REQUEST_URI: pfad };
      if (!r.conds.every(([v, re, nicht]) => re.test(werte[v]) !== nicht)) continue;
      const ziel = r.ziel.replace(/\$(\d)/g, (_, i) => m[+i] ?? "");
      if (r.flags.includes("R=301")) return { umleitung: ziel + u.search, code: 301 };
      neu = ziel; break;
    }
    if (neu === null) break;
    if (neu === pfad) break;
    pfad = neu;
  }
  let datei = pfad.slice(1);
  const ort = new URL(datei || ".", root);
  if (existsSync(ort) && statSync(ort).isDirectory()) datei = (datei && !datei.endsWith("/") ? datei + "/" : datei) + "index.html";
  return existsSync(new URL(datei, root)) ? { datei } : { fehlt: datei };
}


/** die Datei im Repo, die unter einer Adresse ausgeliefert wird («/angebot/» → «b/angebot/index.html»), sonst null */
export function dateiZu(adresse) { const a = anfrage(adresse.startsWith("/") || adresse.startsWith("http") ? adresse : "/" + adresse); return a.datei ?? null; }
/** Adresse einer Seite aus ihrem Ordner im Repo («b/zettel/» → «zettel/»); was nicht unter b/ liegt, bleibt */
export const zuAdresse = (pfad) => String(pfad).replace(/^b\//, "");
export { block };
