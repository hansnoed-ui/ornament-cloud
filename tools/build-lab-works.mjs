// ornament.lab · Works: die Werkschau der Ergebnisse aus ORNAMENT LAB unter /b/lab/works/ (23. Oktober 2026, Wunsch von Christian:
// «zukünftige Resultate aus dem Lab auf einer eigens dafür gemachten Portfolio website präsentieren … unter ornament.cloud/b/lab/works»).
// Eigenständig: nicht in der Navigation des Neubaus, nicht in der Sitemap, eigene Gestaltung (b/lab/works/works.css) mit Signet, Blaupause,
// Schriften und Fuss von ornament.cloud.
//
// Ein Werk ist ein Ordner b/lab/works/<ordner>/ mit werk.json und den Medien, so wie ihn der Export «Für Works» des Labs liefert
// (alpha/lab/app.js, werkExportieren): bild.png, film.mp4 (falls gerechnet), verlauf.json. Erscheinen wird ein Werk erst mit
// "veroeffentlicht": true in werk.json. Das Skript schreibt b/lab/works/index.html und je Werk <ordner>/index.html. Anleitung: docs/lab-works.md.
//
//   node tools/build-lab-works.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const PFAD = "/b/lab/works/";
const BASIS = "https://ornament.cloud";
const V = 1;   // Versionsmarke für works.css und works.js (?v=), bei Änderungen hochzählen

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const absaetze = (t) => String(t ?? "").split(/\n\s*\n/).map((a) => a.trim()).filter(Boolean).map((a) => `<p>${esc(a)}</p>`).join("");
const nr = (i) => String(i + 1).padStart(2, "0");

// Signet und Favicon wörtlich aus dem Neubau (tools/build-b.mjs schreibt sie), damit es nur eine Fassung gibt
const neubau = readFileSync(join(ROOT, "b/werke/index.html"), "utf8");
const SIGNET = neubau.match(/<a class="signet" href="\/b\/"[^>]*>(<svg[\s\S]*?<\/svg>)/)?.[1];
const ICON = neubau.match(/<link rel="icon" href="([^"]+)">/)?.[1];
if (!SIGNET || !ICON) throw new Error("Signet oder Favicon nicht in b/werke/index.html gefunden (tools/build-b.mjs gelaufen?)");

const FELDCHEN = `<a class="feldchen" href="/b/zettel/" aria-label="Zum Zettelkasten" title="Zum Zettelkasten">${"<i></i>".repeat(49)}</a>`;

/** werk.json lesen und prüfen; Fehler nennen den Ordner */
function ladeWerk(dir, ordner) {
  const datei = join(dir, ordner, "werk.json");
  const w = JSON.parse(readFileSync(datei, "utf8"));
  const fehlt = (n) => { throw new Error(`${ordner}/werk.json: ${n}`); };
  if (w.format !== "ornament-lab-werk") fehlt("format ist nicht «ornament-lab-werk»");
  if (!w.titel) fehlt("titel fehlt");
  for (const k of ["bild", "film", "verlauf"]) if (w[k] && !existsSync(join(dir, ordner, w[k]))) fehlt(`${k}: ${w[k]} liegt nicht im Ordner`);
  if (!w.bild) fehlt("bild fehlt");
  if (!/^[a-z0-9-]+$/.test(ordner)) fehlt("der Ordnername darf nur a–z, 0–9 und - enthalten");
  return { ...w, ordner, url: `${PFAD}${ordner}/` };
}

function seite({ titel, beschreibung, pfad, indexieren, inhalt, bild }) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titel)}</title>
  <meta name="description" content="${esc(beschreibung)}">
  ${indexieren ? `<link rel="canonical" href="${BASIS}${pfad}">` : `<meta name="robots" content="noindex">`}
  <meta name="author" content="Christian Strickler">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="${ICON}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="ornament.cloud">
  <meta property="og:locale" content="de_CH">
  <meta property="og:url" content="${BASIS}${pfad}">
  <meta property="og:title" content="${esc(titel)}">
  <meta property="og:description" content="${esc(beschreibung)}">${bild ? `\n  <meta property="og:image" content="${BASIS}${bild}">` : ""}
  <link rel="preload" href="/vendor/fonts/instrument-sans-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/vendor/fonts/newsreader-italic-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/vendor/fonts/fonts.css">
  <link rel="stylesheet" href="${PFAD}works.css?v=${V}">
</head>
<body>
  <a class="sprung" href="#inhalt">Zum Inhalt</a>
  <header class="kopf">
    <a class="signet" href="${PFAD}" aria-label="ornament.lab Works, Übersicht">${SIGNET}<span>ornament.lab</span><span class="still">Works</span></a>
    <nav class="kopfnav" aria-label="Werkschau"><a href="${PFAD}#werke">Index</a><a href="${PFAD}#info">Info</a><a href="/b/">ornament.cloud</a></nav>
  </header>
  <main id="inhalt">
${inhalt}
  </main>
  <footer class="fuss">
    ${FELDCHEN}
    <p class="zeile"><span>Christian Strickler, zwischen Zürich, Basel und Aarau</span><a href="mailto:hansnoed@gmail.com">hansnoed@gmail.com</a></p>
    <p class="zeile"><a href="/b/">ornament.cloud</a><a href="/impressum/">Impressum und Datenschutz</a></p>
    <p class="zeile"><span>Diese Seite lädt nichts von aussen: keine Cookies, keine Werbung, keine Tracker.</span></p>
  </footer>
  <script type="module" src="${PFAD}works.js?v=${V}"></script>
</body>
</html>
`;
}

/** Bild oder Film eines Werks; der Film läuft in der Übersicht nur beim Darüberfahren (works.js), auf der Werkseite mit Steuerung */
function medium(w, { gross = false } = {}) {
  const masse = w.breite && w.hoehe ? ` width="${w.breite}" height="${w.hoehe}"` : "";
  const bild = `${w.url}${w.bild}`;
  if (w.film && gross) return `<video src="${w.url}${w.film}" poster="${bild}"${masse} controls loop muted playsinline preload="metadata"></video>`;
  const img = `<img src="${bild}" alt="${esc(w.alt ?? `${w.titel}, Ergebnis aus ORNAMENT LAB`)}"${masse}${gross ? "" : ` loading="lazy"`}>`;
  return w.film && !gross ? `${img}<video data-film="${w.url}${w.film}" muted loop playsinline preload="none" aria-hidden="true"></video>` : img;
}

const PLATZHALTER = 3;   // so viele leere Felder zeigt die Übersicht, solange kein Werk veröffentlicht ist

function uebersicht(werke) {
  const kacheln = werke.length
    ? werke.map((w, i) => `      <li><a class="werk" href="${w.url}"><span class="medium${w.film ? " hat-film" : ""}">${medium(w)}</span><span class="zeile"><span class="nr">${nr(i)}</span><span class="titel">${esc(w.titel)}</span><span class="jahr">${esc(w.jahr ?? "")}</span></span></a></li>`).join("\n")
    : Array.from({ length: PLATZHALTER }, (_, i) => `      <li><div class="werk platzhalter" aria-label="Platzhalter, noch kein Werk"><span class="medium"><span class="schild">Platzhalter</span></span><span class="zeile"><span class="nr">${nr(i)}</span><span class="titel">Noch kein Werk</span><span class="jahr">–</span></span></div></li>`).join("\n");
  const liste = werke.length ? `
    <ol class="index" aria-label="Alle Werke als Liste">
${werke.map((w, i) => `      <li><a href="${w.url}"><span class="nr">${nr(i)}</span><span class="titel">${esc(w.titel)}</span><span class="ops">${esc((w.operationen ?? []).join(", "))}</span><span class="jahr">${esc(w.jahr ?? "")}</span></a></li>`).join("\n")}
    </ol>` : "";
  return seite({
    titel: "ornament.lab · Works",
    beschreibung: "Werke aus ORNAMENT LAB: Bilder und Filme, die aus Operationen, Varianten und Entscheidungen entstehen, jedes mit seinem Protokoll.",
    pfad: PFAD, indexieren: werke.length > 0, bild: werke[0] ? `${werke[0].url}${werke[0].bild}` : null,
    inhalt: `    <section class="auftakt">
      <h1>Works</h1>
      <p class="leitsatz">Ergebnisse aus ORNAMENT LAB. Bilder und Filme, die aus Operationen, Varianten und Entscheidungen entstehen, jedes mit dem Protokoll seines Wegs.</p>
    </section>
    <section id="werke" class="werke" aria-label="Werke">
${werke.length ? "" : `    <p class="hinweis">Noch ist kein Werk veröffentlicht. Die Felder unten sind Platzhalter, keine Werke.</p>\n`}    <ul class="raster">
${kacheln}
    </ul>${liste}
    </section>
    <section id="info" class="info">
      <h2>Info</h2>
      <div class="lesen"><p>ORNAMENT LAB ist eine Werkstatt im Browser: Bilder durchlaufen Operationen aus den Apps von ornament.cloud, werden variiert, verglichen und weitergeführt. Mensch, Zufall, Regel und jev entscheiden mit, und jede Entscheidung bleibt im Protokoll.</p><p>Hier erscheinen die Ergebnisse, die bleiben sollen. Zu jedem Werk gehören das Bild, wo es einen gibt der Film, und der Verlauf vom Material bis zum letzten Schritt.</p></div>
    </section>`,
  });
}

function werkseite(w, i, werke) {
  const vor = werke[i - 1], nach = werke[i + 1];
  const angaben = [
    ["Jahr", esc(w.jahr ?? "")],
    w.operationen?.length ? ["Operationen", esc(w.operationen.join(", "))] : null,
    w.breite && w.hoehe ? ["Format", `${w.breite} × ${w.hoehe} px${w.film ? ", Bild und Film" : ""}`] : null,
    w.lab ? ["Entstanden mit", `ORNAMENT LAB ${esc(w.lab)}`] : null,
    ["Dateien", [`<a href="${w.url}${w.bild}">Bild</a>`, w.film ? `<a href="${w.url}${w.film}">Film</a>` : null, w.verlauf ? `<a href="${w.url}${w.verlauf}">Protokoll (verlauf.json)</a>` : null].filter(Boolean).join(" · ")],
  ].filter(Boolean);
  return seite({
    titel: `${w.titel} · ornament.lab Works`,
    beschreibung: w.kurz ?? `${w.titel}${w.jahr ? `, ${w.jahr}` : ""}. Ein Werk aus ORNAMENT LAB.`,
    pfad: w.url, indexieren: true, bild: `${w.url}${w.bild}`,
    inhalt: `    <article class="werkseite">
      <figure class="buehne">${medium(w, { gross: true })}</figure>
      <div class="werkkopf">
        <p class="nr">${nr(i)}</p>
        <h1>${esc(w.titel)}</h1>
        <dl class="angaben">${angaben.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>
        ${w.text ? `<div class="lesen">${absaetze(w.text)}</div>` : ""}
      </div>
      <nav class="blaettern" aria-label="Weitere Werke">${vor ? `<a href="${vor.url}" rel="prev"><span>Vorheriges</span>${esc(vor.titel)}</a>` : "<span></span>"}<a href="${PFAD}#werke">Alle Werke</a>${nach ? `<a href="${nach.url}" rel="next"><span>Nächstes</span>${esc(nach.titel)}</a>` : "<span></span>"}</nav>
    </article>`,
  });
}

/** alle Werke im Ordner lesen und die Seiten schreiben; ordner: die Werkschau (Vorgabe b/lab/works/) */
export function baue({ ordner = join(ROOT, "b/lab/works") } = {}) {
  const dir = resolve(ordner);
  const alle = readdirSync(dir).filter((n) => statSync(join(dir, n)).isDirectory() && existsSync(join(dir, n, "werk.json"))).map((n) => ladeWerk(dir, n));
  // neueste zuerst: «position» in werk.json ordnet von Hand, sonst das Exportdatum
  const werke = alle.filter((w) => w.veroeffentlicht === true)
    .sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity) || String(b.exportiert ?? "").localeCompare(String(a.exportiert ?? "")));
  writeFileSync(join(dir, "index.html"), uebersicht(werke));
  werke.forEach((w, i) => writeFileSync(join(dir, w.ordner, "index.html"), werkseite(w, i, werke)));
  return { werke: werke.map((w) => w.ordner), entwuerfe: alle.filter((w) => w.veroeffentlicht !== true).map((w) => w.ordner) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = baue({ ordner: process.argv[2] });
  console.log(`Works: ${r.werke.length} veröffentlicht${r.entwuerfe.length ? `, ${r.entwuerfe.length} noch nicht (${r.entwuerfe.join(", ")})` : ""}`);
}
