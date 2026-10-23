// ornament.lab · Works: die Werkschau der Ergebnisse aus ORNAMENT LAB unter /b/lab/works/ (23. Oktober 2026, Wunsch von Christian:
// «zukünftige Resultate aus dem Lab auf einer eigens dafür gemachten Portfolio website präsentieren … unter ornament.cloud/b/lab/works»,
// «sich an dieser Website orientieren, mit einigen typischen ornament.cloud elementen ergänzt: https://mubien.com/»).
// Eigenständig: nicht in der Navigation des Neubaus, nicht in der Sitemap.
//
// Von mubien.com übernommen ist das Prinzip, nicht Inhalt oder Material: die Bühne (ein Werk füllt den Bildschirm, Titel links, Zähler «01 / 06»
// unten links, Rad, Pfeiltasten oder Wischen blättern), daneben das Raster (zwei Spalten, schmale Fugen, beim Darüberfahren ein farbiges Etikett),
// der Umschalter «Bühne · Raster» als Pille oben rechts, das schwebende Dock unten in der Mitte (Werk, Satz, Menü) mit dem kleinen Menü aus Kacheln,
// und die Werkseite mit Schlagworten, grossem Satz, Akkordeon links und Bildfolge rechts. Von ornament.cloud: Signet mit laufendem Punkt,
// Blaupause als Akzent (und als Vorgabe der Etiketten), Instrument Sans und Newsreader, echte Umkehr im Dunkeln, das Feldchen, das animierte Signet im Menü
// und der Fuss «lädt nichts von aussen».
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
const V = 4;   // Versionsmarke für works.css und works.js (?v=), bei Änderungen hochzählen

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const absaetze = (t) => String(t ?? "").split(/\n\s*\n/).map((a) => a.trim()).filter(Boolean).map((a) => `<p>${esc(a)}</p>`).join("");
const nr = (i) => String(i + 1).padStart(2, "0");

// Signet und Favicon wörtlich aus dem Neubau (tools/build-b.mjs schreibt sie), damit es nur eine Fassung gibt
const neubau = readFileSync(join(ROOT, "b/werke/index.html"), "utf8");
const SIGNET = neubau.match(/<a class="signet" href="\/b\/"[^>]*>(<svg[\s\S]*?<\/svg>)/)?.[1];
const ICON = neubau.match(/<link rel="icon" href="([^"]+)">/)?.[1];
if (!SIGNET || !ICON) throw new Error("Signet oder Favicon nicht in b/werke/index.html gefunden (tools/build-b.mjs gelaufen?)");

const FELDCHEN = (cls = "feldchen") => `<span class="${cls}" aria-hidden="true">${"<i></i>".repeat(49)}</span>`;
const BESCHREIBUNG = "Werke aus ORNAMENT LAB: Bilder und Filme, die aus Operationen, Varianten und Entscheidungen entstehen, jedes mit seinem Protokoll.";

/** werk.json lesen und prüfen; Fehler nennen den Ordner */
function ladeWerk(dir, ordner) {
  const datei = join(dir, ordner, "werk.json");
  const w = JSON.parse(readFileSync(datei, "utf8"));
  const fehlt = (n) => { throw new Error(`${ordner}/werk.json: ${n}`); };
  if (w.format !== "ornament-lab-werk") fehlt("format ist nicht «ornament-lab-werk»");
  if (!w.titel) fehlt("titel fehlt");
  if (!w.bild) fehlt("bild fehlt");
  for (const k of ["bild", "film", "verlauf"]) if (w[k] && !existsSync(join(dir, ordner, w[k]))) fehlt(`${k}: ${w[k]} liegt nicht im Ordner`);
  if (w.bilder != null && !Array.isArray(w.bilder)) fehlt("bilder ist keine Liste");
  const bilder = (w.bilder ?? []).map((b) => (typeof b === "string" ? { datei: b } : b));
  for (const b of bilder) if (!b?.datei || !existsSync(join(dir, ordner, b.datei))) fehlt(`bilder: ${b?.datei ?? "?"} liegt nicht im Ordner`);
  if (w.farbe != null && !/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(w.farbe)) fehlt("farbe ist keine Farbe wie #1d3fd6");
  if (!/^[a-z0-9-]+$/.test(ordner)) fehlt("der Ordnername darf nur a–z, 0–9 und - enthalten");
  return { ...w, bilder, ordner, url: `${PFAD}${ordner}/` };
}

const MENUE = `<div class="menue" id="menue" hidden>
      <a class="kachel" href="${PFAD}"><span class="kachel-bild kachel-raster" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span>Works<small>Alle Werke</small></span></a>
      <a class="kachel" href="${PFAD}#info"><span class="kachel-bild kachel-text" aria-hidden="true">Aa</span><span>Info<small>Über die Werkschau</small></span></a>
      <a class="kachel breit kachel-lab" href="/alpha/lab/">${FELDCHEN("feldchen gross")}<span>ORNAMENT LAB<small>Die Werkstatt öffnen</small></span></a>
      <a class="kachel" href="/b/"><span class="kachel-bild kachel-signet" aria-hidden="true">${SIGNET}</span><span>ornament.cloud<small>Zur Hauptseite</small></span></a>
      <div class="kachel kachel-logo" aria-hidden="true">${SIGNET}</div>
    </div>`;

/** das schwebende Dock unten in der Mitte: links das Werk (oder das Signet), Mitte ein Satz, rechts das Menü */
function dock({ text, href, bild }) {
  const marke = `<span class="dock-marke" aria-hidden="true">${bild ? `<img src="${esc(bild)}" alt="">` : SIGNET}</span>`;
  const mitte = href ? `<a class="dock-mitte" href="${esc(href)}">${marke}<span class="dock-text">${esc(text)}</span></a>` : `<span class="dock-mitte">${marke}<span class="dock-text">${esc(text)}</span></span>`;
  return `  <nav class="dock" aria-label="Werkschau">
    ${MENUE}
    <div class="dock-leiste">${mitte}<button class="dock-menue" type="button" aria-expanded="false" aria-controls="menue" aria-label="Menü"><i></i><i></i></button></div>
  </nav>`;
}

function seite({ titel, beschreibung, pfad, indexieren, inhalt, bild, klasse, kopfRechts, dockInfo }) {
  return `<!DOCTYPE html>
<html lang="de" class="${klasse}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
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
  <script>/* Ansicht vor dem ersten Bild setzen, damit nichts springt (works.js) */ (() => { const h = document.documentElement; h.classList.add("js"); if (!h.classList.contains("uebersicht")) return; let a = { "#raster": "raster", "#buehne": "buehne" }[location.hash]; try { a ??= localStorage.getItem("works-ansicht"); } catch {} h.dataset.ansicht = a === "raster" ? "raster" : "buehne"; })();</script>
</head>
<body>
  <a class="sprung" href="#inhalt">Zum Inhalt</a>
  <header class="kopf">
    <a class="signet" href="${PFAD}" aria-label="ornament.lab Works, Übersicht">${SIGNET}<span>ornament.lab</span><span class="still">Works</span></a>
    ${kopfRechts}
  </header>
  <main id="inhalt">
${inhalt}
  </main>
  <footer class="fuss">
    <a class="feldchen-link" href="/b/zettel/" aria-label="Zum Zettelkasten" title="Zum Zettelkasten">${FELDCHEN()}</a>
    <p class="zeile"><span>Christian Strickler, zwischen Zürich, Basel und Aarau</span><a href="mailto:hansnoed@gmail.com">hansnoed@gmail.com</a></p>
    <p class="zeile"><a href="/b/">ornament.cloud</a><a href="/alpha/lab/">ORNAMENT LAB</a><a href="/impressum/">Impressum und Datenschutz</a></p>
    <p class="zeile"><span>Diese Seite lädt nichts von aussen: keine Cookies, keine Werbung, keine Tracker.</span></p>
  </footer>
${dock(dockInfo)}
  <script type="module" src="${PFAD}works.js?v=${V}"></script>
</body>
</html>
`;
}

const altText = (w) => w.alt ?? `${w.titel}, Ergebnis aus ORNAMENT LAB`;
const masse = (w) => (w.breite && w.hoehe ? ` width="${w.breite}" height="${w.hoehe}"` : "");

/** Bild eines Werks für Bühne und Raster; der Film wartet stumm (preload none) und läuft erst, wenn works.js ihn startet */
function vorschau(w, { laden = "lazy" } = {}) {
  const img = `<img src="${w.url}${w.bild}" alt="${esc(altText(w))}"${masse(w)} loading="${laden}" decoding="async">`;
  return w.film ? `${img}<video data-film="${w.url}${w.film}" muted loop playsinline preload="none" aria-hidden="true"></video>` : img;
}

// Solange kein Werk veröffentlicht ist, stehen Beispiele aus der PHORMA-Serie als Platzhalter auf Bühne und Raster (Wunsch von Christian,
// 23. Oktober 2026: «Füll einige sachen aus der PHORMA Serie als Platzhalter»). Sie sind als Platzhalter beschriftet, führen zur jeweiligen App
// und verschwinden, sobald das erste Werk erscheint. Material aus assets/ (dieselben Filme und Bilder wie auf /b/apps/).
const PLATZHALTER = [
  { titel: "PHORMA I", kurz: "Verwandlung: Funken, Glaskörper, Scherben, Höhenlinien.", bild: "/assets/beispiele/phorma-i.jpg", film: "/assets/beispiele/phorma-i.mp4", breite: 540, hoehe: 676, href: "/b/apps/phorma-i/" },
  { titel: "PHORMA II", kurz: "Physarum, Tuch und Montage in einer Kette.", bild: "/assets/beispiele/phorma-ii.jpg", film: "/assets/beispiele/phorma-ii.mp4", breite: 540, hoehe: 676, href: "/b/apps/phorma-ii/" },
  { titel: "PHORMA III", kurz: "Aus Klang wird Bild: ein Gewebe aus feinen Linien.", bild: "/assets/beispiele/phorma-iii.jpg", film: "/assets/beispiele/phorma-iii.mp4", breite: 540, hoehe: 676, href: "/b/apps/phorma-iii/" },
  { titel: "PHORMA I, Standbild", kurz: "Ein Foto, in Fragmente zerlegt.", bild: "/assets/vorschau-phorma-i-2x.jpg", breite: 1280, hoehe: 1600, href: "/b/apps/phorma-i/" },
  { titel: "PHORMA II, Standbild", kurz: "Ein Netz findet die Formen des Fotos.", bild: "/assets/vorschau-phorma-ii-2x.jpg", breite: 1080, hoehe: 1350, href: "/b/apps/phorma-ii/" },
  { titel: "PHORMA III, Standbild", kurz: "Linien wie zerknitterte Seide.", bild: "/assets/vorschau-phorma-iii.jpg", breite: 640, hoehe: 800, href: "/b/apps/phorma-iii/" },
];
for (const p of PLATZHALTER) for (const d of [p.bild, p.film].filter(Boolean)) if (!existsSync(join(ROOT, d))) throw new Error(`Platzhalter: ${d} fehlt`);

/** Bild (und Film) eines Platzhalters, wie vorschau() für ein Werk */
function platzhalterMedium(p, { laden = "lazy" } = {}) {
  const img = `<img src="${p.bild}" alt="${esc(p.titel)}, Beispiel aus der PHORMA-Serie" width="${p.breite}" height="${p.hoehe}" loading="${laden}" decoding="async">`;
  return p.film ? `${img}<video data-film="${p.film}" muted loop playsinline preload="none" aria-hidden="true"></video>` : img;
}
const stil = (w) => (w.farbe ? ` style="--farbe: ${esc(w.farbe)}"` : "");

function uebersicht(werke) {
  const leer = werke.length === 0;
  const anzahl = leer ? PLATZHALTER.length : werke.length;
  const dias = leer
    ? PLATZHALTER.map((p, i) => `        <li class="dia platzhalter${i ? "" : " ist"}${p.film ? " hat-film" : ""}" data-href="${p.href}" data-text="Platzhalter · ${esc(p.titel)}" data-bild="${p.bild}"><a class="dia-flaeche" href="${p.href}" tabindex="${i ? -1 : 0}">${platzhalterMedium(p, { laden: i ? "lazy" : "eager" })}</a><span class="schild">Platzhalter</span><h2 class="dia-titel"><a href="${p.href}" tabindex="-1">${esc(p.titel)}</a></h2></li>`)
    : werke.map((w, i) => `        <li class="dia${i ? "" : " ist"}${w.film ? " hat-film" : ""}" data-href="${w.url}" data-text="Werk ansehen" data-bild="${w.url}${w.bild}"${stil(w)}><a class="dia-flaeche" href="${w.url}" tabindex="${i ? -1 : 0}">${vorschau(w, { laden: i ? "lazy" : "eager" })}</a><h2 class="dia-titel"><a href="${w.url}" tabindex="-1">${esc(w.titel)}</a></h2></li>`);
  const kacheln = leer
    ? PLATZHALTER.map((p, i) => `      <li><a class="werk platzhalter" href="${p.href}"><span class="medium${p.film ? " hat-film" : ""}">${platzhalterMedium(p)}<span class="schild">Platzhalter</span></span><span class="etikett"><span class="etikett-titel">${nr(i)} · Platzhalter · ${esc(p.titel)}</span><span class="etikett-text">${esc(p.kurz)}</span></span></a></li>`)
    : werke.map((w, i) => `      <li><a class="werk" href="${w.url}"${stil(w)}><span class="medium${w.film ? " hat-film" : ""}">${vorschau(w)}</span><span class="etikett"><span class="etikett-titel">${nr(i)} · ${esc(w.titel)}${w.jahr ? `, ${esc(w.jahr)}` : ""}</span><span class="etikett-text">${esc(w.kurz ?? (w.operationen ?? []).join(" · "))}</span></span></a></li>`);
  return seite({
    klasse: "uebersicht",
    titel: "ornament.lab · Works",
    beschreibung: BESCHREIBUNG,
    pfad: PFAD, indexieren: !leer, bild: leer ? null : `${werke[0].url}${werke[0].bild}`,
    kopfRechts: `<div class="ansicht" role="group" aria-label="Ansicht"><button type="button" data-ansicht="buehne" aria-pressed="true">Bühne</button><button type="button" data-ansicht="raster" aria-pressed="false">Raster</button></div>`,
    dockInfo: leer ? { text: `Platzhalter · ${PLATZHALTER[0].titel}`, href: PLATZHALTER[0].href, bild: PLATZHALTER[0].bild } : { text: "Werk ansehen", href: werke[0].url, bild: `${werke[0].url}${werke[0].bild}` },
    inhalt: `    <section class="buehne" aria-roledescription="Bühne" aria-label="Werke, eines nach dem anderen">
      <ol class="dias">
${dias.join("\n")}
      </ol>
      <p class="zaehler" aria-live="polite"><span class="zaehler-jetzt">01</span> / ${nr(anzahl - 1)}</p>
      <p class="buehne-satz">${leer ? "Noch kein Werk veröffentlicht. Bis dahin: Beispiele aus der PHORMA-Serie als Platzhalter." : "Ergebnisse aus ORNAMENT LAB."}</p>
      <div class="buehne-tasten"><button type="button" class="zurueck" aria-label="Vorheriges Werk">↑</button><button type="button" class="weiter" aria-label="Nächstes Werk">↓</button></div>
    </section>
    <div class="raster-ansicht">
      <section class="auftakt">
        <h1>Bilder und Filme, die aus Operationen, Varianten und Entscheidungen entstehen.</h1>
        <p class="leitsatz">Ergebnisse aus ORNAMENT LAB, jedes mit dem Protokoll seines Wegs.</p>
      </section>
      <section id="werke" class="werke" aria-label="Werke">
${leer ? `      <p class="hinweis">Noch ist kein Werk veröffentlicht. Bis dahin stehen hier Beispiele aus der PHORMA-Serie als Platzhalter, keine Werke aus dem Lab.</p>\n` : ""}      <ul class="raster">
${kacheln.join("\n")}
      </ul>
      </section>
      <section id="info" class="info">
        <h2><span class="punkt" aria-hidden="true"></span>Info</h2>
        <div class="lesen"><p>ORNAMENT LAB ist eine Werkstatt im Browser: Bilder durchlaufen Operationen aus den Apps von ornament.cloud, werden variiert, verglichen und weitergeführt. Mensch, Zufall, Regel und jev entscheiden mit, und jede Entscheidung bleibt im Protokoll.</p><p>Hier erscheinen die Ergebnisse, die bleiben sollen. Zu jedem Werk gehören das Bild, wo es einen gibt der Film, und der Verlauf vom Material bis zum letzten Schritt.</p></div>
      </section>
    </div>`,
  });
}

/** Bildfolge der Werkseite: das erste Stück über die ganze Breite, danach paarweise, abwechselnd breit und schmal (wie die Bildfolgen auf mubien.com) */
function bildfolge(w) {
  const stuecke = [];
  if (w.film) stuecke.push(`<video src="${w.url}${w.film}" poster="${w.url}${w.bild}"${masse(w)} controls loop muted playsinline preload="metadata"></video>`);
  stuecke.push(`<img src="${w.url}${w.bild}" alt="${esc(altText(w))}"${masse(w)}${stuecke.length ? ` loading="lazy"` : ""}>`);
  for (const b of w.bilder) stuecke.push(`<img src="${w.url}${esc(b.datei)}" alt="${esc(b.alt ?? `${w.titel}, Ansicht`)}" loading="lazy">`);
  const breiten = ["voll"];
  for (let i = 1, paar = 0; i < stuecke.length; i += 2, paar++) {
    if (i + 1 >= stuecke.length) { breiten.push("voll"); break; }
    breiten.push(...(paar % 2 ? ["schmal", "breit"] : ["breit", "schmal"]));
  }
  return stuecke.map((s, i) => `<figure class="stueck ${breiten[i]}">${s}</figure>`).join("\n        ");
}

function werkseite(w, i, werke) {
  const vor = werke[i - 1], nach = werke[i + 1];
  const schlagworte = [w.jahr, ...(w.operationen ?? [])].filter((x) => x != null && x !== "");
  const angaben = [
    w.jahr ? ["Jahr", esc(w.jahr)] : null,
    w.breite && w.hoehe ? ["Format", `${w.breite} × ${w.hoehe} px${w.film ? ", Bild und Film" : ""}`] : null,
    w.lab ? ["Entstanden mit", `ORNAMENT LAB ${esc(w.lab)}`] : null,
    ["Dateien", [`<a href="${w.url}${w.bild}">Bild</a>`, w.film ? `<a href="${w.url}${w.film}">Film</a>` : null, w.verlauf ? `<a href="${w.url}${w.verlauf}">Protokoll (verlauf.json)</a>` : null].filter(Boolean).join(" · ")],
  ].filter(Boolean);
  const teile = [
    w.text ? ["Über das Werk", `<div class="lesen">${absaetze(w.text)}</div>`] : null,
    w.operationen?.length ? ["Verlauf", `<ol class="schritte">${w.operationen.map((o) => `<li>${esc(o)}</li>`).join("")}</ol>${w.verlauf ? `<p><a href="${w.url}${w.verlauf}">Das ganze Protokoll</a></p>` : ""}`] : null,
    ["Angaben", `<dl class="angaben">${angaben.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`],
  ].filter(Boolean);
  return seite({
    klasse: "werkseite",
    titel: `${w.titel} · ornament.lab Works`,
    beschreibung: w.kurz ?? `${w.titel}${w.jahr ? `, ${w.jahr}` : ""}. Ein Werk aus ORNAMENT LAB.`,
    pfad: w.url, indexieren: true, bild: `${w.url}${w.bild}`,
    kopfRechts: `<p class="kopf-nr">${nr(i)} / ${nr(werke.length - 1)}</p>`,
    dockInfo: { text: "Zurück zu Works", href: PFAD },
    inhalt: `    <article class="werk-seite"${stil(w)}>
      <header class="werk-kopf">
        ${schlagworte.length ? `<ul class="schlagworte">${schlagworte.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
        <h1>${esc(w.titel)}</h1>
        ${w.kurz ? `<p class="werk-satz">${esc(w.kurz)}</p>` : ""}
      </header>
      <div class="werk-koerper">
        <aside class="werk-leiste">
          ${teile.map(([t, inhalt], k) => `<details name="werk"${k ? "" : " open"}><summary><span class="punkt" aria-hidden="true"></span>${t}</summary>${inhalt}</details>`).join("\n          ")}
        </aside>
        <div class="bildfolge">
        ${bildfolge(w)}
        </div>
      </div>
      <nav class="blaettern" aria-label="Weitere Werke">${vor ? `<a href="${vor.url}" rel="prev"><span>Vorheriges</span>${esc(vor.titel)}</a>` : "<span></span>"}<a href="${PFAD}#raster">Alle Werke</a>${nach ? `<a href="${nach.url}" rel="next"><span>Nächstes</span>${esc(nach.titel)}</a>` : "<span></span>"}</nav>
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
