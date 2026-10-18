// Setzt die Kopfleiste (Menü und Welle, tools/kopfleiste.mjs) in Seiten, die von Hand gepflegt werden und erst die Hauptlinks haben (seit
// 18. Oktober 2026: «das Menü müsste überall auf der Seite sichtbar sein»). Seiten mit Menü bleiben, wie sie sind; erzeugte Seiten (Zettelkasten,
// Alpha-Texte) holen die Kopfleiste in ihren Erzeugern. Fehlt icons.js (zeichnet die Welle), kommt es vor den Zähler.
//   node tools/kopfleiste-einsetzen.mjs alpha/index.html alpha/sketchory/index.html …
import { readFileSync, writeFileSync } from "node:fs";
import { relative, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { kopfleiste } from "./kopfleiste.mjs";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

/** html: die Seite; datei: ihr Pfad ab der Wurzel; aktiv: Name des Kästchens, unter dem sie steht (oder null) → neue Seite (oder null, wenn nichts zu tun) */
export function einsetzen(html, datei, { aktiv = null } = {}) {
  if (html.includes('<nav class="menu"')) return null;
  const m = html.match(/\n([ \t]*)<nav class="seitenweg" aria-label="Ornament Cloud">[\s\S]*?<\/nav>/);
  if (!m) return null;
  const einzug = m[1], tiefe = datei.split("/").length - 1, site = "../".repeat(tiefe);
  const alt = m[0].slice(1), neu = alt.split("\n").map((z) => `  ${z}`).join("\n");
  let aus = html.replace(alt, kopfleiste(neu, site, { aktiv, einzug: `${einzug}  ` }));
  if (!/icons\.js\?v=\d+/.test(aus)) {
    const zaehler = aus.match(/\n([ \t]*)<script data-goatcounter=/);
    const tag = `<script src="${site}icons.js?v=14" defer></script>`;
    aus = zaehler ? aus.replace(zaehler[0], `\n${zaehler[1]}${tag}${zaehler[0]}`) : aus.replace("</body>", `  ${tag}\n</body>`);
  }
  return aus;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const arg of process.argv.slice(2)) {
    const p = resolve(ROOT, arg), datei = relative(ROOT, p), html = readFileSync(p, "utf8"), aus = einsetzen(html, datei);
    if (aus) { writeFileSync(p, aus); console.log(`→ ${datei}`); } else console.log(`  ${datei} (schon mit Menü oder ohne Hauptlinks)`);
  }
}
