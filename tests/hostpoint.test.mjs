// Umzug auf den Webspace bei Hostpoint (20. Oktober 2026, docs/hostpoint-umzug.md): Deploy-Workflow, Deploy-Skript mit Ausschlussliste, .htaccess,
// 404-Seite und robots.txt. Kein Netz, kein Server: geprüft wird, dass die Teile zusammenpassen und nichts Veröffentlichtes vom Ausschluss betroffen ist.
//   node --test tests/hostpoint.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");

test("Workflow: läuft nach jedem Push auf main und von Hand (Probelauf), tut ohne Variablen nichts, ruft das Deploy-Skript", () => {
  const wf = lies(".github/workflows/hostpoint.yml");
  assert.match(wf, /on:\n  push:\n    branches: \[main\]\n  workflow_dispatch:/);
  assert.match(wf, /if: vars\.HOSTPOINT_HOST != ''/, "ohne Variablen kein Lauf (der Workflow liegt schon vor dem Umzug im Repository)");
  for (const v of ["HOSTPOINT_HOST", "HOSTPOINT_USER", "HOSTPOINT_PFAD"]) assert.ok(wf.includes(`vars.${v}`), v);
  assert.ok(wf.includes("secrets.HOSTPOINT_SSH_KEY"));
  assert.ok(wf.includes("run: tools/hostpoint/deploy.sh"));
  assert.match(wf, /PROBE: \$\{\{ inputs\.probe && '1' \|\| '' \}\}/);
  assert.match(wf, /permissions:\n  contents: read/);
});

test("Deploy-Skript: rsync über SSH mit Prüfsummen, --delete und Ausschlussliste; Probelauf über PROBE", () => {
  const sh = lies("tools/hostpoint/deploy.sh");
  assert.ok((statSync(new URL("tools/hostpoint/deploy.sh", root)).mode & 0o111) !== 0, "ausführbar");
  assert.match(sh, /^#!\/usr\/bin\/env bash/);
  assert.ok(sh.includes("set -euo pipefail"));
  for (const o of ["--checksum", "--delete", "--omit-dir-times", "--chmod=D755,F644", "--exclude-from=tools/hostpoint/ausschluss.txt", "--dry-run"]) assert.ok(sh.includes(o), o);
  assert.ok(!/(^|\s)-a(\s|z)|--archive|--times/.test(sh), "keine Zeitstempel (-a/-t): Git setzt beim Auschecken neue, sonst würde jedes Mal alles übertragen");
  assert.match(sh, /StrictHostKeyChecking=accept-new/);
});

test("Ausschlussliste: Quellen, Werkzeuge, Tests, Dokumentation und Git bleiben zu Hause; keine veröffentlichte Seite lädt etwas von dort", () => {
  const liste = lies("tools/hostpoint/ausschluss.txt").split("\n").filter((z) => z && !z.startsWith("#"));
  for (const e of [".git/", ".github/", ".claude/", "src/", "tools/", "tests/", "docs/", "README.md", "CLAUDE.md", "node_modules/", ".well-known/"]) assert.ok(liste.includes(e), e);
  const ordner = liste.filter((e) => e.endsWith("/")).map((e) => e.slice(0, -1));
  const re = new RegExp(`(?:href|src|url\\(|from |import\\(|fetch\\(|new URL\\()\\s*=?\\s*["']?(?:\\.\\./)*(${ordner.join("|")})/`);
  const walk = (d, vor = "") => readdirSync(d, { withFileTypes: true }).flatMap((e) => liste.includes(e.name) || liste.includes(e.name + "/") || liste.includes(vor + e.name) || liste.includes(vor + e.name + "/") || e.name === "vendor" ? []
    : e.isDirectory() ? walk(new URL(e.name + "/", d), vor + e.name + "/") : /\.(html|css|js|mjs|xml|webmanifest)$/.test(e.name) ? [vor + e.name] : []);
  const treffer = walk(root).filter((p) => re.test(lies(p)));
  assert.deepEqual(treffer, [], "veröffentlichte Dateien verweisen auf Ausgeschlossenes");
});

test(".htaccess: HTTPS ohne www (Let's Encrypt ausgenommen), 404-Seite, Inhaltstypen, Zwischenspeicher zehn Minuten wie GitHub Pages, Service Worker frisch, Kompression; alles mit <IfModule> abgesichert", () => {
  const h = lies(".htaccess");
  assert.match(h, /RewriteCond %\{REQUEST_URI\} !\^\/\\\.well-known\//);
  assert.match(h, /RewriteCond %\{HTTPS\} !=on \[OR\]\n\s*RewriteCond %\{HTTP_HOST\} \^www\\\.ornament\\\.cloud\$ \[NC\]\n\s*RewriteRule \^ https:\/\/ornament\.cloud%\{REQUEST_URI\} \[R=301,L\]/);
  assert.ok(h.includes("ErrorDocument 404 /404.html"));
  for (const t of ["text/javascript .js .mjs", "application/manifest+json .webmanifest", "font/woff2 .woff2", "video/mp4 .mp4", "video/webm .webm", "image/webp .webp"]) assert.ok(h.includes(`AddType ${t}`), t);
  assert.ok(h.includes('ExpiresDefault "access plus 10 minutes"'), "zehn Minuten: die Versionsmarken der Seite rechnen damit (tests/drittes-rad.e2e.mjs «Zwischenspeicher»)");
  assert.match(h, /<FilesMatch "\^sw\\\.js\$">\s*Header set Cache-Control "no-cache"/);
  assert.ok(h.includes("AddOutputFilterByType DEFLATE text/html"));
  assert.ok(!/^\s*Options\b/m.test(h), "keine Options-Direktive: ist sie in .htaccess nicht erlaubt, fällt die ganze Seite mit 500 aus");
  const module = ["mod_rewrite", "mod_mime", "mod_expires", "mod_headers", "mod_deflate", "mod_brotli", "mod_autoindex"];
  for (const m of module) assert.ok(h.includes(`<IfModule ${m}.c>`), m);
  assert.equal((h.match(/^\s*<IfModule /gm) || []).length, (h.match(/^\s*<\/IfModule>/gm) || []).length, "jedes <IfModule> wird geschlossen");
});

test("404-Seite: Kopf und Fuss der Website mit absoluten Verweisen, noindex, nicht in der Sitemap; robots.txt zeigt auf die Sitemap", () => {
  const s = lies("404.html");
  assert.match(s, /<meta name="robots" content="noindex">/);
  assert.match(s, /<link rel="stylesheet" href="\/styles\.css\?v=\d+">/);
  assert.equal(s.match(/<link rel="stylesheet" href="\/styles\.css\?v=(\d+)">/)[1], lies("impressum/index.html").match(/styles\.css\?v=(\d+)/)[1], "dieselbe Versionsmarke wie die übrigen Seiten");
  for (const href of ['href="/"', 'href="/alpha/drittes-rad/"', 'href="/apps/"', 'href="/masterprompts/"', 'href="/zu-seiner-zeit/"', 'href="/social-media/"', 'href="/art/"', 'href="/impressum/"', 'href="/b/"']) assert.ok(s.includes(href), href);
  assert.ok(!/href="\.\.?\//.test(s), "keine relativen Verweise (die Seite erscheint unter jeder Adresse)");
  assert.match(s, /Fragen und Anmerkungen zur Website: <a href="mailto:hansnoed@gmail\.com">/);
  assert.ok(!lies("sitemap.xml").includes("404"));
  const r = lies("robots.txt");
  assert.match(r, /^User-agent: \*\nAllow: \/\n/m);
  assert.ok(r.includes("Sitemap: https://ornament.cloud/sitemap.xml"));
});
