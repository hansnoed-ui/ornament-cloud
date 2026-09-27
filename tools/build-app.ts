// Schreibt die Dateiliste und die Version des Service Workers (portfolio/nebeneinander-nacheinander/sw.js).
// Ausgehend von Rad und Feld werden alle eingebundenen Stylesheets, Skripte und ES-Module
// (samt deren Importen) gesammelt, dazu Manifest und App-Symbole. Die Version ist ein Hash über
// alle Inhalte: Ändert sich eine Datei, lädt die installierte App beim nächsten Start neu.
//
//   node --experimental-strip-types tools/build-app.ts
//
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

const ROOT = new URL("../", import.meta.url);
const APP = new URL("../portfolio/nebeneinander-nacheinander/", import.meta.url);
const SW = new URL("sw.js", APP);
const START = "// <!-- APP:START -->", END = "// <!-- APP:END -->";
const PAGES = ["./", "feld/"];
const EXTRA = ["app.webmanifest", "app/icon-192.png", "app/icon-512.png", "app/icon-maskable-512.png", "app/apple-touch-icon.png"];

const fileOf = (u: URL) => new URL(u.pathname.endsWith("/") ? u.pathname + "index.html" : u.pathname, "file://");

export function collect(): { urls: string[]; version: string } {
  const seen = new Map<string, URL>();                 // Adresse relativ zu sw.js → absolute Adresse
  const rel = (u: URL) => {
    const a = u.pathname.split("/"), b = APP.pathname.split("/");
    let i = 0; while (i < a.length - 1 && i < b.length - 1 && a[i] === b[i]) i += 1;
    return "../".repeat(b.length - 1 - i) + a.slice(i).join("/") + u.search || "./";
  };
  const add = (u: URL) => { const r = rel(u) || "./"; if (!seen.has(r)) { seen.set(r, u); return true; } return false; };
  const scanJs = (u: URL) => {
    const src = readFileSync(fileOf(u), "utf8");
    for (const m of src.matchAll(/(?:from\s+|import\()\s*"([^"]+)"/g)) {
      const dep = new URL(m[1], u);
      if (add(dep)) scanJs(dep);
    }
  };
  for (const p of PAGES) {
    const page = new URL(p, APP);
    add(page);
    const html = readFileSync(fileOf(page), "utf8");
    for (const m of html.matchAll(/<(?:link[^>]+rel="stylesheet"[^>]*href|script[^>]+src)="([^"]+)"/g)) {
      const u = new URL(m[1], page);
      if (add(u) && u.pathname.endsWith(".js")) scanJs(u);
    }
  }
  for (const e of EXTRA) { const u = new URL(e, APP); if (add(u) && u.pathname.endsWith(".js")) scanJs(u); }
  const urls = [...seen.keys()].sort();
  const hash = createHash("sha256");
  for (const r of urls) {
    const f = fileOf(seen.get(r)!);
    if (!existsSync(f)) throw new Error(`fehlt: ${r}`);
    hash.update(r).update(readFileSync(f));
  }
  hash.update(readFileSync(SW, "utf8").replace(/\/\/ <!-- APP:START -->[\s\S]*\/\/ <!-- APP:END -->/, ""));
  return { urls, version: hash.digest("hex").slice(0, 12) };
}

export function buildBlock(): string {
  const { urls, version } = collect();
  return `const VERSION = "${version}";\nconst PRECACHE = ${JSON.stringify(urls, null, 2)};`;
}

export function writeApp(): string {
  const sw = readFileSync(SW, "utf8");
  const i = sw.indexOf(START), j = sw.indexOf(END);
  if (i < 0 || j < i) throw new Error("sw.js: Marken APP:START / APP:END fehlen");
  const block = buildBlock();
  writeFileSync(SW, sw.slice(0, i + START.length) + "\n" + block + "\n" + sw.slice(j));
  return block;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const block = writeApp();
  console.log(block.split("\n")[0], `· ${JSON.parse(block.slice(block.indexOf("["), block.lastIndexOf("]") + 1)).length} Dateien`);
}
