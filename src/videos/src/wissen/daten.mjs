// Daten des Videos «Wissen» (27. Oktober 2026): liest Christians Obsidian-Tresor (Wissensbasis «Wissen») unverändert und schreibt
// src/wissen/data/wissen.json – nicht von Hand bearbeiten, nicht eingecheckt. Läuft mit «npm run vorbereiten».
//   Notizen   jede .md-Datei ausser .obsidian/, .git/, .claude/; Titel aus dem Frontmatter (title) oder der ersten Überschrift
//   Links     jedes [[Ziel]] und [[Ziel|Text]], das auf eine Notiz des Tresors zeigt
//   Netz      zwei räumliche Anordnungen (frei und nach Bereichen), aus einer Kraftsimulation mit festem Startwert: dasselbe Netz bei jedem Lauf
//   Auszüge   Leitsatz einer Notiz (erster fetter Absatz, sonst erster Absatz nach der Überschrift), ohne Markdown; gekürzt nur mit «[…]»,
//             geprüft mit text.startsWith(auszug)
// Der Tresor liegt neben dem Repository (C:\Users\StartKlar\Documents\GitHub\Wissen); anderer Ort mit der Umgebungsvariablen WISSEN.
// Fehlt er (etwa in einer Cloud-Sitzung), schreibt das Skript nichts, und die anderen Videos lassen sich trotzdem vorbereiten.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

const hier = (p) => new URL(p, import.meta.url);
const TRESOR = globalThis.process.env.WISSEN ?? fileURLToPath(new URL("../../../../../Documents/GitHub/Wissen/", import.meta.url));

if (!existsSync(join(TRESOR, ".obsidian"))) {
  console.log(`wissen: kein Obsidian-Tresor unter ${TRESOR} (WISSEN setzen), übersprungen`);
} else {
  const dateien = [];
  (function lauf(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith(".")) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) lauf(p); else if (e.name.endsWith(".md")) dateien.push(p.slice(TRESOR.length).replace(/^[\\/]/, "").replaceAll("\\", "/"));
    }
  })(TRESOR);
  dateien.sort();

  /** Bereich einer Notiz nach ihrem Ordner */
  const bereichVon = (p) => p.startsWith("wiki/werke/") ? "werke" : p.startsWith("wiki/konzepte/") ? "konzepte" : p.startsWith("wiki/quellen/") ? "quellen"
    : p.startsWith("raw/ornament/") ? "ornament" : p.startsWith("raw/chats/") ? "chats" : p.startsWith("raw/") ? "artikel" : "uebrig";
  // Zeilenenden vereinheitlichen (unter Windows ausgecheckt: \r\n)
  const text = Object.fromEntries(dateien.map((p) => [p, readFileSync(join(TRESOR, p), "utf8").replace(/\r\n/g, "\n")]));
  const titelVon = (p) => {
    const t = text[p], fm = /^---\n([\s\S]*?)\n---/.exec(t)?.[1] ?? "";
    return (/^title:\s*"?(.*?)"?\s*$/m.exec(fm)?.[1] || /^#\s+(.+)$/m.exec(t)?.[1] || basename(p, ".md")).trim();
  };
  const knoten = dateien.map((p, i) => ({ i, pfad: p, name: basename(p, ".md"), titel: titelVon(p), bereich: bereichVon(p) }));
  const nachName = new Map(knoten.map((k) => [k.name, k]));

  // Links: jede Erwähnung zählt (das ist «Verbindungen» im Video); für das Bild jede Paarung einmal
  let verweise = 0;
  const paare = new Map(), grad = new Array(knoten.length).fill(0);
  for (const k of knoten) for (const m of text[k.pfad].matchAll(/\[\[([^\]|#]+)/g)) {
    const z = nachName.get(m[1].trim().split("/").pop());
    if (!z) continue;
    verweise++; grad[z.i]++;
    if (z.i === k.i) continue;
    const s = k.i < z.i ? `${k.i}-${z.i}` : `${z.i}-${k.i}`;
    paare.set(s, (paare.get(s) ?? 0) + 1);
  }
  const kanten = [...paare.entries()].map(([s, n]) => [...s.split("-").map(Number), n]);

  // Anordnung: Kraftsimulation in 3D (Abstossung zwischen allen, Federn an den Kanten, leichter Zug zur Mitte), fester Startwert
  let saat = 20261027;
  const zufall = () => { saat = (Math.imul(saat, 1664525) + 1013904223) >>> 0; return saat / 4294967296; };
  const BEREICHE = ["werke", "konzepte", "quellen", "ornament", "chats", "artikel", "uebrig"];
  // Mittelpunkte der Bereiche für die zweite Anordnung: auf einem Kreis, Werke und Konzepte nah beieinander
  const MITTE = Object.fromEntries(BEREICHE.map((b, j) => { const w = (j / 5) * Math.PI * 2 - Math.PI / 2; return [b, j < 5 ? [Math.cos(w) * 430, Math.sin(w) * 300, Math.sin(w * 2) * 140] : [(j - 5.5) * 160, 0, 0]]; }));
  function anordnen(nachBereich) {
    const p = knoten.map(() => [(zufall() - 0.5) * 400, (zufall() - 0.5) * 400, (zufall() - 0.5) * 400]);
    for (let schritt = 0; schritt < 500; schritt++) {
      const temp = 1 - schritt / 500, f = knoten.map(() => [0, 0, 0]);
      for (let a = 0; a < p.length; a++) for (let b = a + 1; b < p.length; b++) {
        const d = [0, 1, 2].map((k) => p[a][k] - p[b][k]), l2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2 + 1, s = 2600 / l2;
        for (let k = 0; k < 3; k++) { f[a][k] += d[k] * s / Math.sqrt(l2); f[b][k] -= d[k] * s / Math.sqrt(l2); }
      }
      for (const [a, b, n] of kanten) {
        const d = [0, 1, 2].map((k) => p[b][k] - p[a][k]), l = Math.hypot(...d) + 1e-6, quer = nachBereich && knoten[a].bereich !== knoten[b].bereich ? 0.12 : 1, s = 0.02 * quer * Math.min(3, n) * (l - 60);
        for (let k = 0; k < 3; k++) { f[a][k] += (d[k] / l) * s; f[b][k] -= (d[k] / l) * s; }
      }
      p.forEach((q, i) => {
        const ziel = nachBereich ? MITTE[knoten[i].bereich] : [0, 0, 0], zug = nachBereich ? 0.12 : 0.01;
        for (let k = 0; k < 3; k++) { f[i][k] += (ziel[k] - q[k]) * zug; q[k] += Math.max(-12, Math.min(12, f[i][k])) * temp; }
      });
    }
    return p.map((q) => q.map((v) => Math.round(v * 10) / 10));
  }
  const frei = anordnen(false), gruppen = anordnen(true);

  /** Leitsatz einer Notiz ohne Markdown: der erste fette Absatz, sonst der erste Absatz nach der Überschrift */
  const ohneMarkdown = (s) => s.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2").replace(/\[\[([^\]]+)\]\]/g, (_, z) => nachName.get(z.split("/").pop())?.titel ?? z)
    .replace(/\*\*/g, "").replace(/(^|[^*])\*([^*]+)\*/g, "$1$2").replace(/`/g, "").replace(/\s+/g, " ").trim();
  function leitsatz(name) {
    const k = nachName.get(name);
    if (!k) throw new Error(`wissen: Notiz ${name} fehlt`);
    const koerper = text[k.pfad].replace(/^---\n[\s\S]*?\n---\n/, "").replace(/^#\s+.*$/m, "");
    const absaetze = koerper.split(/\n\s*\n/).map((a) => a.trim()).filter((a) => a && !a.startsWith("#") && !a.startsWith("*") || a.startsWith("**"));
    const fett = absaetze.find((a) => a.startsWith("**"));
    return { k, voll: ohneMarkdown(fett ?? absaetze[0]) };
  }
  /** Auszug: ganze Sätze bis höchstens «woerter» Wörter, sonst die ersten Wörter mit «[…]»; geprüft gegen den Text */
  function auszug(name, woerter = 26) {
    const { k, voll } = leitsatz(name);
    // an einem Satzende schneiden (Punkt, Ausrufe- oder Fragezeichen vor Leerraum oder am Schluss), so viele Sätze, wie in «woerter» passen
    let teil = "";
    for (const m of voll.matchAll(/[.!?](?=\s|$)/g)) {
      const kandidat = voll.slice(0, m.index + 1);
      if (kandidat.split(/\s+/).length > woerter) break;
      teil = kandidat;
    }
    let gekuerzt = teil.length < voll.length;
    if (!teil) {
      // ein langer erster Satz: bis zur letzten Gliederung (Komma, Doppelpunkt, Gedankenstrich) innerhalb der Wörter, sonst nach den Wörtern
      const roh = voll.split(/\s+/).slice(0, woerter).join(" ");
      const glied = Math.max(roh.lastIndexOf(","), roh.lastIndexOf(":"), roh.lastIndexOf(" –"));
      teil = (glied > roh.length * 0.4 ? roh.slice(0, glied) : roh).replace(/[,;:–\s-]+$/, "");
      gekuerzt = true;
    }
    if (!voll.startsWith(teil)) throw new Error(`wissen: Auszug weicht vom Text ab (${name})`);
    return { name, titel: k.titel, bereich: k.bereich, i: k.i, text: gekuerzt ? `${teil.replace(/:$/, "")} […]` : teil, nachbarn: kanten.filter(([a, b]) => a === k.i || b === k.i).map(([a, b]) => (a === k.i ? b : a)) };
  }

  const zaehle = Object.fromEntries(BEREICHE.map((b) => [b, knoten.filter((k) => k.bereich === b).length]));
  const stand = (() => { try { return execFileSync("git", ["-C", TRESOR, "log", "-1", "--format=%cs"], { encoding: "utf8" }).trim(); } catch { return null; } })();
  const meist = grad.map((g, i) => ({ i, g })).sort((a, b) => b.g - a.g).slice(0, 5).map(({ i, g }) => ({ i, titel: knoten[i].titel, bereich: knoten[i].bereich, verweise: g }));

  mkdirSync(hier("data/"), { recursive: true });
  writeFileSync(hier("data/wissen.json"), JSON.stringify({
    stand, notizen: knoten.length, verweise, paare: kanten.length, zaehle,
    knoten: knoten.map((k) => ({ titel: k.titel, bereich: k.bereich, grad: grad[k.i], frei: frei[k.i], gruppen: gruppen[k.i] })),
    kanten: kanten.map(([a, b]) => [a, b]),
    werke: ["orna", "formen-der-zeit", "zu-seiner-zeit-zyklus-1-operation", "pruefraster-uebersicht"].map((n) => auszug(n, 20)),
    denken: ["zeit-und-eigenzeit", "kontingenz-und-anschlussueberschuss", "zukunft-als-ueberschuss"].map((n) => auszug(n, 18)),
    meist,
  }));
  console.log(`wissen: ${knoten.length} Notizen, ${verweise} Verweise (${kanten.length} Paare), Stand ${stand}`);
}
