// Neubau /b/: erzeugt alle Seiten unter b/ aus den Daten (Zettel aus src/data/, ORNA und ORMA aus src/doppelspalt/ und src/orma/,
// Werke aus src/art/werke.json, Beiträge aus social-media/daten/eintraege.json) und den eigenen Texten in src/b/inhalt.mjs.
// Die Fäden zwischen den Inhalten kommen aus src/b/jev.json (tools/build-b-jev.mjs) und aus gemeinsamen Personen der Zettel.
// Kopiert b.css und b.js, schreibt den Block B:START/END in sitemap.xml. Vorschaukarten: tools/b-kacheln.mjs, Werkstatt-PDFs: tools/build-b-pod.mjs.
//
//   node tools/build-b.mjs
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { SEITE, DIALOG, APPS, RASTER, ANGEBOTE, PRODUKTE, UEBER } from "../src/b/inhalt.mjs";
import { ladeZettel, ladeZettelkasten, ladeOrma, ladeWerke, ladeBeitraege, ladeOmna, ladeKonstellationen, ladePersonen } from "./b-daten.mjs";
import { pruefsumme } from "./build-b-jev.mjs";
import { zeichen } from "../src/b/zeichen.mjs";

const ROOT = new URL("../", import.meta.url);
const AUS = new URL("b/", ROOT);
const V = 10;                                     // Versionsmarke für b.css und b.js (?v=), bei Änderungen hochzählen
const BASIS = "https://ornament.cloud";
const HEUTE = new Date().toISOString().slice(0, 10);

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const attr = esc;
const kachelName = (pfad) => (pfad.replace(/\/$/, "").replace(/\//g, "-") || "start");
/** Beschreibung für Suchmaschinen: ein oder zwei Sätze, höchstens 200 Zeichen */
const beschreibung = (t) => { const s = t.split(/(?<=\.)\s/); return s[1] && (s[0] + " " + s[1]).length <= 200 ? s[0] + " " + s[1] : s[0].slice(0, 200); };
const personAus = (citation) => citation.split(",")[0].trim();

/* ---------- Daten ---------- */
const kasten = ladeZettelkasten();
const zettel = ladeZettel();
const orma = ladeOrma();
const werke = ladeWerke();
const echteWerke = werke.werke.filter((w) => !w.muster);   // Muster (muster: true) kommen nie in den Neubau (20. Oktober 2026: «die Beispiel-Werke von der Seite Werke entfernen»)
const beitraege = ladeBeitraege();
const omnaUebungen = ladeOmna();
const konstellationen = ladeKonstellationen();
const namen = ladePersonen();
let jev = null;
try {
  const j = JSON.parse(readFileSync(new URL("src/b/jev.json", ROOT), "utf8"));
  if (j.pruefsumme === pruefsumme(zettel, orma)) jev = j; else console.warn("jev.json passt nicht zur Prüfsumme – Fäden ohne jev (tools/build-b-jev.mjs neu laufen lassen)");
} catch { console.warn("kein src/b/jev.json – Fäden ohne jev"); }

const beste = (p, n = 1) => Object.entries(p || {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, w]) => ({ k, w }));
const jevZettel = (n) => jev?.zettel?.[n] || {};
/** umgekehrt: die Zettel, die zu einem Stück am besten passen */
const zettelZu = (art, slug, n = 3) => zettel.map((z) => ({ z, w: jevZettel(z.number)[art]?.[slug] || 0 })).filter((x) => x.w > 0).sort((a, b) => b.w - a.w).slice(0, n).map((x) => x.z);

// Resonanzen: Zettel, die dieselbe Person nennen
const personen = new Map();
for (const z of zettel) for (const r of z.references) { const p = personAus(r.citation); (personen.get(p) || personen.set(p, []).get(p)).push(z.number); }
const resonanz = (z) => {
  const treffer = new Map();
  for (const r of z.references) { const p = personAus(r.citation); for (const n of personen.get(p) || []) if (n !== z.number) (treffer.get(n) || treffer.set(n, []).get(n)).push(p); }
  return [...treffer.entries()].sort((a, b) => b[1].length - a[1].length || a[0] - b[0]).map(([n, p]) => ({ z: zettel[n - 1], personen: p }));
};
const allePaare = [];
for (const z of zettel) for (const r of resonanz(z)) if (r.z.number > z.number) allePaare.push([z.number, r.z.number, r.personen.length]);
allePaare.sort((a, b) => b[2] - a[2] || a[0] - b[0]);
// für die Startseite: die stärksten Paare, aber jede Zelle höchstens zweimal, damit das Ornament das ganze Feld erreicht
const startPaare = [];
const zaehl = new Map();
for (const [a, b] of allePaare) { if ((zaehl.get(a) || 0) >= 2 || (zaehl.get(b) || 0) >= 2) continue; startPaare.push([a, b]); zaehl.set(a, (zaehl.get(a) || 0) + 1); zaehl.set(b, (zaehl.get(b) || 0) + 1); if (startPaare.length >= 18) break; }

// für die Übersicht der Zettel: jede Zelle höchstens dreimal, sonst wird das Feld ein Spinnennetz
const indexPaare = [];
{ const z = new Map(); for (const [a, b] of allePaare) { if ((z.get(a) || 0) >= 3 || (z.get(b) || 0) >= 3) continue; indexPaare.push([a, b]); z.set(a, (z.get(a) || 0) + 1); z.set(b, (z.get(b) || 0) + 1); } }

const appVon = (slug) => APPS.find((a) => a.slug === slug);
const rasterVon = (slug) => RASTER.find((r) => r.slug === slug);
const angebotVon = (slug) => ANGEBOTE.find((a) => a.slug === slug);
const ormaVon = (id) => orma.find((k) => k.id === id);

/* ---------- Bausteine ---------- */
// das Signet: die Re-entry-Schlaufe der Videos (r = b + a·cos t) mit dem Punkt
const signetPfad = (() => {
  const LA = 1, LB = 0.45, LK = 1.2, LOFF = -0.84, N = 120;
  const pts = Array.from({ length: N + 1 }, (_, i) => { const t = (i / N) * Math.PI * 2, r = LB + LA * Math.cos(t); return [LK * r * Math.cos(t) + LOFF, LK * r * Math.sin(t)]; });
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2, sp = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const m = 22 / sp;
  const bild = ([x, y]) => [(17 + (x - mx) * m).toFixed(2), (12 + (y - my) * m).toFixed(2)];
  const d = pts.map((p, i) => (i ? "L" : "M") + bild(p).join(" ")).join("") + "Z";
  const punkt = bild(pts[Math.round(N * 0.42)]);
  return { d, punkt };
})();
// der Punkt läuft die Schlaufe entlang (SMIL; startet nur ohne «weniger Bewegung», b.js ruft beginElement): die Bahn relativ zum Punkt
const SIGNET_BAHN = signetPfad.d.replace(/([ML])([\d.]+) ([\d.]+)/g, (m, b, x, y) => `${b}${(+x - signetPfad.punkt[0]).toFixed(2)} ${(+y - signetPfad.punkt[1]).toFixed(2)}`);
const SIGNET = `<svg viewBox="0 0 34 24" aria-hidden="true" focusable="false"><path class="schlaufe" d="${signetPfad.d}"/><circle class="punkt" cx="${signetPfad.punkt[0]}" cy="${signetPfad.punkt[1]}" r="2.2"><animateMotion class="lauf" begin="indefinite" dur="16s" repeatCount="indefinite" path="${SIGNET_BAHN}"/></circle></svg>`;
const ICON = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 24"><path d="${signetPfad.d}" fill="none" stroke="#000" stroke-width="1.8"/><circle cx="${signetPfad.punkt[0]}" cy="${signetPfad.punkt[1]}" r="2.6" fill="#1d3fd6"/></svg>`)}`;

const NAV = [["zettel/", "Zettel"], ["apps/", "Apps"], ["raster/", "Raster"], ["angebot/", "Angebot"], ["werke/", "Werke"], ["zuletzt/", "Zuletzt"], ["ueber/", "Über"]];

// weiche Trennstellen für die Zellen des Felds (Chromium ohne Wörterbuch trennt sonst nicht; die Stellen nach Duden)
const TRENNUNG = { Beobachter: "Beob&shy;achter", Verspätung: "Ver&shy;spätung", Gedächtnis: "Ge&shy;dächtnis", Erinnerung: "Erin&shy;nerung", Vergessen: "Ver&shy;gessen", Geschichte: "Ge&shy;schichte", Erwartung: "Erwar&shy;tung", Verantwortung: "Verant&shy;wortung", Anerkennung: "Aner&shy;kennung", Berührung: "Berüh&shy;rung", Irritation: "Irri&shy;tation", Wahrnehmung: "Wahr&shy;nehmung", Übersetzung: "Über&shy;setzung", Koppelung: "Koppe&shy;lung", Ausstellung: "Aus&shy;stellung", Information: "Infor&shy;mation", Wahrscheinlichkeit: "Wahrschein&shy;lichkeit", Algorithmus: "Algo&shy;rithmus", Empfehlung: "Empfeh&shy;lung", Plattform: "Platt&shy;form", Identität: "Iden&shy;tität", Möglichkeit: "Möglich&shy;keit", Kontingenz: "Kontin&shy;genz", Unterbrechung: "Unter&shy;brechung" };
const weich = (titel) => esc(titel).replace(/\S+$/, (w) => TRENNUNG[w] || w);

/** Das kleine Feld (7 × 7 Punkte) führt zurück zum grossen (20. Oktober 2026, Wunsch: «der Klick auf dieses Symbol [soll] wieder zum grossen Zettelkasten-Raster zurückführen») */
function feldchen(n, nah = []) {
  const titel = n ? `Zum Zettelkasten – Zettel ${n} von 49 im Feld` : "Zum Zettelkasten";
  return `<a class="feldchen" href="/b/zettel/${n ? "#feld" : ""}" aria-label="${attr(titel)}" title="${attr(titel)}">${zettel.map((z) => `<i${z.number === n ? ' class="hier"' : nah.includes(z.number) ? ' class="nah"' : ""}></i>`).join("")}</a>`;
}
/** die Anleitung zum Feld: mit Zeiger «fahre über», ohne Zeiger (Telefon) «tippe an, noch einmal öffnet» – b.css blendet je nach (hover) ein */
const feldHinweis = (satz) => `<span class="mit-zeiger">Fahre über das Feld oder tippe eine Zelle an: ${satz}</span><span class="ohne-zeiger">Tippe eine Zelle an: ${satz} Noch einmal tippen öffnet den Zettel.</span>`;

/** Das Feld 7 × 7 als Links; Zeilen sind die Zyklen */
function feld({ gross = false, klein = false, aktuell = null, paare = startPaare, still = false } = {}) {
  return `<div class="feld-rahmen" data-faeden="${attr(JSON.stringify(paare))}"${still ? " data-still" : ""}>
  <nav class="feld${gross ? " gross" : ""}${klein ? " klein" : ""}" aria-label="Die 49 Zettel">${zettel.map((z) => `<a href="/b/zettel/${z.slug}/" data-n="${z.number}"${z.number === aktuell ? ' aria-current="page"' : ""} title="${attr(z.title)}"><span class="n">${z.number}</span><span class="t">${weich(z.title)}</span></a>`).join("")}</nav>
  <svg class="feld-faeden" aria-hidden="true" focusable="false"></svg>
  <div class="feld-zeile" aria-hidden="true">${kasten.movement.map((m) => `<span>${esc(m)}</span>`).join("")}</div>
</div>`;
}

function faeden(liste, { wie } = {}) {
  const eintraege = liste.filter(Boolean);
  if (!eintraege.length) return "";
  return `<section class="faeden" aria-labelledby="faeden-titel"><div class="spalte">
  <h2 id="faeden-titel">Fäden</h2>
  <p class="wie">${esc(wie || (jev ? `Verbindungen über die Gattungen hinweg. Gemeinsame Personen zählen, Nachbarn im Zyklus auch; wo es um Nähe im Gedanken geht, hat jev (${jev.modell}, api.typesafe.ai) einmal beim Bauen am ${jev.stand} eingeschätzt. Die Seite ruft nichts auf.` : "Verbindungen über die Gattungen hinweg: gemeinsame Personen und Nachbarn im Zyklus."))}</p>
  <ul>${eintraege.map((f) => `<li><a href="${attr(f.href)}"><span class="art">${zeichen({ Zettel: "zettel", App: "app", "Prüfraster": "raster", Angebot: "angebot", Konstellation: "konstellation" }[f.art] || "zettel")}${esc(f.art)}</span><span class="was">${esc(f.was)}${f.klein ? `<small>${esc(f.klein)}</small>` : ""}</span></a></li>`).join("")}</ul>
</div></section>`;
}

const fZettel = (z, klein) => ({ art: "Zettel", href: `/b/zettel/${z.slug}/`, was: `${z.number} · ${z.title}`, klein: klein ?? z.bottom_line });
const fApp = (a) => a && { art: "App", href: `/b/apps/${a.slug}/`, was: a.name, klein: a.kurz };
const fRaster = (r) => r && { art: "Prüfraster", href: `/b/raster/${r.slug}/`, was: r.name, klein: r.kurz };
const fAngebot = (a) => a && { art: "Angebot", href: `/b/angebot/${a.slug}/`, was: a.name, klein: a.kurz };
const fOrma = (k) => k && { art: "Konstellation", href: `/portfolio/nebeneinander-nacheinander/?pair=${k.id}`, was: `${k.kuenstler} × ${k.theoretiker}`, klein: k.frage };

/** Das Bild einer App: die gezeichnete Tafel (tools/b-app-bilder.mjs), hell oder dunkel nach dem Modus des Geräts */
function appBild(a, extra = "") {
  return `<picture><source srcset="/${attr(a.bildDunkel)}" media="(prefers-color-scheme: dark)"><img src="/${attr(a.bild)}" alt="${attr(a.bildAlt)}" width="1200" height="1200"${extra}></picture>`;
}
/** Das Signet in Bewegung (tools/b-app-bilder.mjs schreibt das Ruhebild; b/tafeln-leben.js lässt es leben) */
const SIGNET_TAFEL = `<figure class="tafel-lebt signet-tafel" data-tafel="signet"><picture><source srcset="/b/bilder/signet/signet-dunkel.svg" media="(prefers-color-scheme: dark)"><img src="/b/bilder/signet/signet.svg" alt="Das Signet von ornament.cloud, gezeichnet: die Re-entry-Schlaufe mit dem Punkt, der sie abläuft" width="1200" height="1200"></picture></figure>`;
/** Eine App als Kachel: immer quadratisch */
function appKachel(a) {
  return `<a class="stueck" href="/b/apps/${a.slug}/"><span class="bild quadrat">${appBild(a, ' loading="lazy"')}</span><h3>${zeichen(a.zeichen)}${esc(a.name)}</h3><p>${esc(a.kurz)}</p></a>`;
}

/** Beispiele: was aus einer App herauskommt (Bildpaar vorher/nachher, Video, oder Texte aus ORNA, ORMA und OMNA COLOR) */
function beispiele(a, { kurz = false } = {}) {
  const b = a.beispiele; if (!b) return "";
  if (Array.isArray(b)) {
    // mehrere Stücke: die Filme nebeneinander in einer Reihe, dann das Bildpaar; kurz (Galerie): nur das erste
    if (kurz) return beispiele({ ...a, beispiele: b[0] }, { kurz });
    const teile = []; let filme = [];
    const reihe = () => { if (filme.length) teile.push(filme.length > 1 ? `<div class="filme">${filme.join("")}</div>` : filme[0]); filme = []; };
    for (const x of b) { const s = beispiele({ ...a, beispiele: x }); if (x.art === "video") filme.push(s); else { reihe(); teile.push(s); } }
    reihe();
    return teile.join("");
  }
  if (b.art === "paar") return `<figure class="paar"><span class="bild"><img src="/${attr(b.vorher)}" alt="Vorher: das Ausgangsbild" loading="lazy"></span><span class="pfeil" aria-hidden="true"></span><span class="bild"><img src="/${attr(b.nachher)}" alt="Nachher: ${attr(a.name)}" loading="lazy"></span><figcaption>${esc(b.text)}</figcaption></figure>`;
  if (b.art === "video") return `<figure class="beispiel-video"><video controls muted loop playsinline preload="metadata" poster="/${attr(b.bild)}" width="${b.mass?.[0] || 1080}" height="${b.mass?.[1] || 1350}">${b.webm ? `<source src="/${attr(b.webm)}" type="video/webm">` : ""}<source src="/${attr(b.datei)}" type="video/mp4"></video><figcaption>${esc(b.text)}</figcaption></figure>`;
  if (b.art === "orna") return `<div class="beispiel-texte">${b.ids.slice(0, kurz ? 1 : 3).map((id) => { const k = konstellationen.find((x) => x.id === id); return k ? `<article class="konstellation"><h3>${esc(namen[k.artistId])} × ${esc(namen[k.theoristId])}</h3><p>${esc(k.text)}</p><p class="frage">${esc(k.question)}</p><p class="klein"><a href="/portfolio/nebeneinander-nacheinander/?pair=${attr(k.id)}">Diese Konstellation im Rad</a></p></article>` : ""; }).join("")}</div>`;
  if (b.art === "orma") { const k = ormaVon(b.id); if (!k) return ""; return `<div class="beispiel-texte eins"><article class="konstellation"><h3>${esc(k.kuenstler)} × ${esc(k.theoretiker)}</h3><p class="klein">Einstieg (ORMA-Redaktion)</p><p>${esc(k.einstieg)}</p><p class="klein">Drei Aufträge zur Wahl</p><ul class="auftraege">${Object.entries(k.auftraege).map(([n, t]) => `<li><span class="klein">${esc(n)}</span><span>${esc(t)}</span></li>`).join("")}</ul><p class="frage">${esc(k.frage)}</p></article></div>`; }
  if (b.art === "omna") return `<div class="beispiel-texte">${b.ids.slice(0, kurz ? 1 : 3).map((id) => { const u = omnaUebungen.find((x) => x.id === id); return u ? `<article class="uebung"><p class="klein">${esc(u.t)} · ${u.d} Minuten</p><h3>${esc(u.n)}</h3><ol>${u.a.map((t) => `<li>${esc(t)}</li>`).join("")}</ol><p class="klein">Material: ${esc(u.m)}</p><p class="frage">${esc(u.f)}</p></article>` : ""; }).join("")}</div>`;
  return "";
}

function teilen({ pfad, titel, text, karte }) {
  return `<div class="teilen">
  <button class="knopf teilen-knopf" type="button" data-url="${attr(BASIS + "/b/" + pfad)}" data-titel="${attr(titel)}" data-text="${attr(text || "")}">Teilen</button>
  ${karte ? `<a class="knopf still" href="/b/kacheln/${karte}" download>Karte herunterladen</a>` : ""}
  <span class="klein">Vorschau mit Bild auf allen Plattformen.</span>
</div>`;
}

/** Eine ganze Seite */
function seite({ pfad, titel, beschreibung, body, aktiv, noindex = false, jsonld = [], typ = "website", bild, bildAlt, kopfTitel, module = [] }) {
  const url = `${BASIS}/b/${pfad}`;
  const k = `/b/kacheln/${kachelName(pfad)}.png`;
  const og = bild || `${BASIS}${k}`;
  const ld = [{ "@context": "https://schema.org", "@type": "WebSite", name: "ornament.cloud", url: `${BASIS}/b/`, inLanguage: "de-CH", author: { "@type": "Person", name: SEITE.person.name } }, ...jsonld];
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(kopfTitel || (pfad ? `${titel} – ornament.cloud` : "ornament.cloud – Kunst, Design und Theorie, Christian Strickler"))}</title>
  <meta name="description" content="${attr(beschreibung)}">
  ${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${attr(url)}">`}
  <meta name="author" content="${attr(SEITE.person.name)}">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="${ICON}">
  <!-- Vorschaukarte beim Teilen (Open Graph, X); Bild: tools/b-kacheln.mjs -->
  <meta property="og:type" content="${typ}">
  <meta property="og:site_name" content="ornament.cloud">
  <meta property="og:locale" content="de_CH">
  <meta property="og:url" content="${attr(url)}">
  <meta property="og:title" content="${attr(titel)}">
  <meta property="og:description" content="${attr(beschreibung)}">
  <meta property="og:image" content="${attr(og)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${attr(bildAlt || `${titel} – ornament.cloud`)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${attr(titel)}">
  <meta name="twitter:description" content="${attr(beschreibung)}">
  <meta name="twitter:image" content="${attr(og)}">
  <link rel="alternate" type="application/rss+xml" title="ornament.cloud – News" href="/feed.xml">
  <link rel="preload" href="/vendor/fonts/instrument-sans-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/vendor/fonts/newsreader-italic-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/vendor/fonts/fonts.css">
  <link rel="stylesheet" href="/b/b.css?v=${V}">
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
</head>
<body>
  <a class="sprung" href="#inhalt">Zum Inhalt</a>
  <header class="kopf">
    <div class="spalte">
      <a class="signet" href="/b/"${pfad === "" ? ' aria-current="page"' : ""}>${SIGNET}<span>ornament.cloud</span></a>
      <nav class="hauptnav" aria-label="Hauptnavigation">${NAV.map(([p, n]) => `<a href="/b/${p}"${aktiv === p ? ' aria-current="page"' : ""}>${n}</a>`).join("")}</nav>
    </div>
  </header>
  <main id="inhalt">
${body}
  </main>
  <footer class="fuss">
    <div class="spalte">
      ${feldchen(0)}
      <p class="zeile"><span>${esc(SEITE.person.name)}, ${esc(SEITE.person.ort)}</span><a href="mailto:${SEITE.person.mail}">${SEITE.person.mail}</a></p>
      <p class="zeile"><a href="/b/ueber/">Über</a><a href="/impressum/">Impressum und Datenschutz</a><a href="/?bisher">Zur bisherigen Website</a><a href="/feed.xml">Feed</a></p>
      <p class="zeile"><span>Diese Seite lädt nichts von aussen: keine Cookies, keine Werbung, keine Tracker.</span></p>
    </div>
  </footer>

  <script type="module" src="/b/b.js?v=${V}"></script>${module.map((m) => `\n  <script type="module" src="/b/${m}?v=${V}"></script>`).join("")}
  <script data-goatcounter="https://ornament-cloud.goatcounter.com/count" async src="/vendor/goatcounter/count.js"></script>
</body>
</html>
`;
}

function schreibe(pfad, html) {
  const dir = new URL(pfad, AUS);
  mkdirSync(dir, { recursive: true });
  writeFileSync(new URL("index.html", dir), html);
}

const seiten = [];   // für die Sitemap
function veroeffentliche(opts) { schreibe(opts.pfad, seite(opts)); if (!opts.noindex) seiten.push(opts.pfad); }

/* ---------- Die Bühne: eine Web-Anwendung in der neuen Seite (20. Oktober 2026, Wunsch: «Wenn ich bei den Apps die Webanwendung öffne, lande ich immer noch
   auf der alten Seite. Diese Webanwendung in der neuen Seite darstellen. Nur die downloadbare App noch in der alten Fassung belassen.») ----------
   Eine Seite unter /b/apps/<app>/oeffnen/ mit der Leiste des Neubaus (Signet, Name, Vollbild, eigener Tab, zurück) und der Anwendung im Rahmen;
   die Anwendung blendet mit ?b=1 ihre alte Navigation aus (Skript und Stil im Kopf ihrer Seite). noindex, nicht in der Sitemap; die App-Seite bleibt kanonisch. */
function buehne({ pfad, name, ziel, zurueck }) {
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(name)} – ornament.cloud</title>
  <meta name="robots" content="noindex">
  <link rel="canonical" href="${BASIS}/b/${zurueck}">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="${ICON}">
  <link rel="stylesheet" href="/vendor/fonts/fonts.css">
  <link rel="stylesheet" href="/b/b.css?v=${V}">
</head>
<body class="buehne-seite">
  <div class="app-leiste">
    <span class="app-name"><a class="signet" href="/b/" title="ornament.cloud">${SIGNET}</a><b>${esc(name)}</b></span>
    <span class="app-knoepfe">
      <button type="button" class="vollbild" title="Vollbild">${zeichen("vollbild")}<span>Vollbild</span></button>
      <a class="tab" href="/${attr(ziel)}" target="_blank" rel="noopener" title="In eigenem Tab öffnen">${zeichen("tab")}<span>Eigener Tab</span></a>
      <a class="zurueck" href="/b/${zurueck}" title="Zurück zur Seite der App">${zeichen("schliessen")}<span>Zurück</span></a>
    </span>
  </div>
  <iframe class="app-rahmen" src="/${attr(ziel)}?b=1" title="${attr(name)}" allow="fullscreen; autoplay; microphone; camera; display-capture; clipboard-write" allowfullscreen loading="eager"></iframe>
  <script type="module" src="/b/b.js?v=${V}"></script>
</body>
</html>
`;
  schreibe(pfad, html);
}

/* ---------- Startseite ---------- */
{
  const erster = zettel[0];
  const daten = zettel.map((z) => ({ n: z.number, slug: z.slug, titel: z.title, leitsatz: z.bottom_line }));
  const body = `
<section class="einstieg" aria-labelledby="einstieg-titel">
  <div class="spalte">
    <div class="einstieg-kopf">
      <h1 class="titel" id="einstieg-titel">${esc(SEITE.titel)}<small>${esc(SEITE.lead)}</small></h1>
      ${SIGNET_TAFEL}
    </div>
    <div class="angebote" role="list">${ANGEBOTE.map((a) => `<a class="angebot" role="listitem" href="/b/angebot/${a.slug}/"><span class="zeichen-gross">${zeichen(a.slug)}</span><h2>${esc(a.name)}</h2><p>${esc(a.kurz)}</p><span class="weiter">Leistung und Briefing</span></a>`).join("")}</div>
    <p class="einstieg-satz">${esc(SEITE.claimAlt)} Diese Seite ist das Beispiel: ein Zettelkasten zum Lesen, sieben Apps zum Spielen, vier Prüfraster zum Hinsehen.</p>
  </div>
</section>

<section class="buehne" data-aktuell="${erster.number}" aria-labelledby="feld-titel">
  <div class="spalte">
    <div class="abschnitt-kopf"><h2 id="feld-titel">${zeichen("zettel")}Der Zettelkasten</h2><p>49 Zettel zu Operation, Kunst, Gesellschaft und künstlicher Kommunikation, in sieben Zyklen.</p><a class="weiter" href="/b/zettel/">Alle Zettel</a></div>
  </div>
  <div class="spalte sieben buehne-feld">
    <div class="buehne-satz s-3">
      <p class="klein kicker">Ein Zettel aus dem Zettelkasten, jedes Mal ein anderer. ${feldHinweis("die Fäden verbinden Zettel, die dieselben Personen nennen.")}</p>
      <p class="vorschau-titel"><span class="n">Zettel ${erster.number}</span><span class="t">${esc(erster.title)}</span></p>
      <p class="leitsatz">${esc(erster.bottom_line)}</p>
      <p class="woher knopfreihe"><a class="knopf voll lesen" href="/b/zettel/${erster.slug}/">${zeichen("lesen")}<span>Zettel lesen</span></a><button class="knopf still nochmal" type="button">${zeichen("zufall")}Noch einer</button></p>
    </div>
    <div class="s-4">${feld()}</div>
  </div>
  <script type="application/json" id="zettel-daten">${JSON.stringify(daten).replace(/</g, "\\u003c")}</script>
</section>

<section class="dialog" aria-labelledby="dialog-titel">
  <div class="spalte">
    <h2 id="dialog-titel">${esc(DIALOG.frage)}</h2>
    <div class="chips" role="radiogroup" aria-label="${attr(DIALOG.frage)}">
      ${DIALOG.wahlen.map((w) => `<input type="radio" name="mit" id="mit-${w.id}"><label class="chip" for="mit-${w.id}">${esc(w.wort)}</label>`).join("\n      ")}
    </div>
    ${DIALOG.wahlen.map((w) => `<div class="weg weg-${w.id}"><p>${esc(w.satz)}</p><ol>${w.weg.map(([h, t]) => `<li><a href="/b/${h}">${esc(t)}</a></li>`).join("")}</ol></div>`).join("\n    ")}
  </div>
</section>

<section class="abschnitt" aria-labelledby="denken-titel">
  <div class="spalte">
    <div class="abschnitt-kopf"><h2 id="denken-titel">${zeichen("denken")}Denken</h2><p>Ein Zettelkasten mit 49 Zetteln und vier Prüfraster, mit denen sich Theorien, Texte und Körperereignisse befragen lassen.</p></div>
    <div class="sieben">
      <div class="s-4">
        <ul class="liste-linien">${kasten.cycles.map((c) => `<li><a href="/b/zettel/#zyklus-${c.roman}"><span class="n">${c.roman}</span><span class="name">${esc(c.name)}</span><span class="pfeil">${c.stanzas[0]}–${c.stanzas[6]}</span><span class="kurz">${esc(c.deck)}</span></a></li>`).join("")}</ul>
      </div>
      <div class="s-3">
        <ul class="liste-linien">${RASTER.map((r, i) => `<li><a href="/b/raster/${r.slug}/"><span class="n">${zeichen(r.slug)}</span><span class="name">${esc(r.name)}</span><span class="pfeil">${esc(r.stand)}</span><span class="kurz">${esc(r.kurz)}</span></a></li>`).join("")}</ul>
      </div>
    </div>
  </div>
</section>

<section class="abschnitt" aria-labelledby="spielen-titel">
  <div class="spalte">
    <div class="abschnitt-kopf"><h2 id="spielen-titel">${zeichen("spielen")}Spielen</h2><p>Sieben Apps, die im Browser laufen und auf dem Gerät rechnen. Ohne Anmeldung, ohne Netz, ohne dass ein Bild das Gerät verlässt.</p><a class="weiter" href="/b/apps/">Alle Apps</a></div>
    <div class="reihe">${APPS.map(appKachel).join("")}</div>
  </div>
</section>

<section class="abschnitt" aria-labelledby="werke-titel">
  <div class="spalte">
    <div class="abschnitt-kopf"><h2 id="werke-titel">${zeichen("werke")}Werke</h2><p>${echteWerke.length ? "Originale, Prints in kleinen Auflagen und Arbeiten im Raum." : "Originale und Prints in kleinen Auflagen, Arbeiten im Raum und Editionen – in Vorbereitung."}</p><a class="weiter" href="/b/werke/">${echteWerke.length ? "Alle Werke" : "Was kommt"}</a></div>
    ${echteWerke.length ? `<div class="reihe">${echteWerke.map((w) => `<a class="stueck" href="/b/werke/#${w.slug}"><span class="bild"><img src="/art/bilder/${w.slug}-1-800.webp" alt="${attr(w.bilder[0].alt)}" loading="lazy" width="800" height="1067"></span><h3>${esc(w.titel)}</h3><p>${esc(w.technik)}, ${w.masse.b} × ${w.masse.h} cm</p></a>`).join("")}</div>` : ""}
  </div>
</section>

<section class="abschnitt" aria-labelledby="zuletzt-titel">
  <div class="spalte">
    <div class="abschnitt-kopf"><h2 id="zuletzt-titel">${zeichen("zuletzt")}Zuletzt</h2><p>Beiträge aus dem Zettelkasten für Social Media.</p><a class="weiter" href="/b/zuletzt/">Alle Beiträge</a></div>
    ${beitraege.eintraege.slice(-2).reverse().map(beitrag).join("")}
  </div>
</section>

<section class="abschnitt" aria-labelledby="liste-titel">
  <div class="spalte">
    <div class="liste-kasten" style="margin-top:0;border-top:0;padding-top:0">
      <h2 id="liste-titel">${esc(UEBER.liste.titel)}</h2>
      <p>${esc(UEBER.liste.text)}</p>
      <p class="knopfreihe"><a class="knopf" href="${attr(UEBER.liste.mailto)}">Eintragen lassen</a><a class="knopf still" href="/b/ueber/">Über Christian Strickler</a></p>
    </div>
  </div>
</section>`;
  veroeffentliche({ pfad: "", titel: "ornament.cloud", beschreibung: SEITE.beschreibung, body, jsonld: [personLd()], module: ["tafeln-leben.js"], bildAlt: "Das Feld: 49 Zettel in sieben Reihen, mit blauen Fäden dazwischen" });
}

function personLd() {
  return { "@context": "https://schema.org", "@type": "Person", name: SEITE.person.name, url: `${BASIS}/b/ueber/`, email: `mailto:${SEITE.person.mail}`,
    address: { "@type": "PostalAddress", streetAddress: SEITE.person.strasse, postalCode: "5466", addressLocality: "Kaiserstuhl", addressRegion: "AG", addressCountry: "CH" },
    jobTitle: "Webdesigner, Kurator, Künstler, Sozialarbeiter", knowsAbout: ["Systemtheorie", "Webdesign", "Kunstvermittlung", "Kuration", "Maltherapie", "Soziale Arbeit"],
    alumniOf: [{ "@type": "CollegeOrUniversity", name: "Universität Zürich" }, { "@type": "CollegeOrUniversity", name: "Fachhochschule für Soziale Arbeit St. Gallen" }, { "@type": "EducationalOrganization", name: "iac Zürich" }], makesOffer: ANGEBOTE.map((a) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: a.name, url: `${BASIS}/b/angebot/${a.slug}/` } })) };
}

function beitrag(e) {
  const platt = { x: "X", facebook: "Facebook", instagram: "Instagram" }[e.plattform] || e.plattform;
  const datum = new Date(e.veroeffentlicht).toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" });
  return `<article class="beitrag">
  <p class="wer">${e.autor.avatar ? `<img src="/social-media/${attr(e.autor.avatar)}" alt="" width="28" height="28" loading="lazy">` : ""}<span>${esc(e.autor.name)}</span><span>${platt}, ${datum}</span></p>
  <p class="text">${esc(e.text)}</p>
  <p class="klein"><a href="/social-media/${attr(e.id)}/">Beleg, Schlagworte und Kommentar im Zettelkasten</a></p>
</article>`;
}

/* ---------- Zettel ---------- */
{
  const body = `
<section class="zettel-kopf">
  <div class="spalte">
    <h1 class="titel">Zettelkasten<small>${esc(kasten.subtitle)}. ${esc(kasten.structure)}. Jeder Zettel hat einen Leitsatz, einen Text und vier Verweise. Die Fäden zeigen, wer dieselben Personen nennt.</small></h1>
  </div>
</section>
<section class="buehne buehne-zettel" id="feld" data-aktuell="${zettel[0].number}" data-takt="0" aria-label="Das Feld">
  <div class="spalte sieben buehne-feld">
    <div class="buehne-satz s-3">
      <p class="klein kicker">${feldHinweis("hier erscheint der Leitsatz des Zettels, die Fäden zeigen, wer dieselben Personen nennt.")}</p>
      <p class="vorschau-titel"><span class="n">Zettel ${zettel[0].number}</span><span class="t">${esc(zettel[0].title)}</span></p>
      <p class="leitsatz">${esc(zettel[0].bottom_line)}</p>
      <p class="woher knopfreihe"><a class="knopf voll lesen" href="/b/zettel/${zettel[0].slug}/">${zeichen("lesen")}<span>Zettel lesen</span></a><button class="knopf still nochmal" type="button">${zeichen("zufall")}Noch einer</button></p>
    </div>
    <div class="s-4">${feld({ gross: true, paare: indexPaare, still: true })}</div>
  </div>
  <script type="application/json" id="zettel-daten">${JSON.stringify(zettel.map((z) => ({ n: z.number, slug: z.slug, titel: z.title, leitsatz: z.bottom_line }))).replace(/</g, "\\u003c")}</script>
</section>
${kasten.cycles.map((c) => `<section class="zyklus" id="zyklus-${c.roman}" aria-labelledby="zyklus-${c.roman}-titel">
  <div class="spalte">
    <h2 id="zyklus-${c.roman}-titel"><span class="roemisch">${c.roman}</span>${esc(c.name)}</h2>
    <p>${esc(c.deck)}</p>
    <ul class="liste-linien">${c.stanzas.map((n) => zettel[n - 1]).map((z) => `<li><a href="/b/zettel/${z.slug}/"><span class="n">${z.number}</span><span class="name">${esc(z.title)}</span><span class="kurz">${esc(z.bottom_line)}</span></a></li>`).join("")}</ul>
  </div>
</section>`).join("\n")}
<section class="abschnitt"><div class="spalte"><p class="klein">Der Zettelkasten in seiner ursprünglichen Form, auch auf Englisch und Spanisch: <a href="/zu-seiner-zeit/">zu-seiner-zeit</a>. Redaktionsfassung vom ${esc(kasten.date)}.</p></div></section>`;
  veroeffentliche({ pfad: "zettel/", aktiv: "zettel/", titel: "Zettelkasten – 49 Zettel", beschreibung: `${kasten.subtitle}. ${kasten.structure}, von der Brücke bis zur Zukunft, mit Leitsatz, Text und vier Verweisen je Zettel.`, body, bildAlt: "Das Feld der 49 Zettel" });
}

for (const z of zettel) {
  const j = jevZettel(z.number);
  const res = resonanz(z);
  const nah = res.slice(0, 2);
  const naechster = zettel[z.number % 49], voriger = zettel[(z.number + 47) % 49];
  const faedenListe = [
    ...nah.map((r) => fZettel(r.z, `nennt auch ${r.personen.join(" und ")}`)),
    fZettel(naechster, `der nächste Zettel${naechster.cycle.roman !== z.cycle.roman ? `, Zyklus ${naechster.cycle.roman} ${naechster.cycle.name}` : ""}`),
    fOrma(ormaVon(beste(j.orma)[0]?.k)),
    fApp(appVon(beste(j.app)[0]?.k)),
    fRaster(rasterVon(beste(j.raster)[0]?.k)),
    fAngebot(angebotVon(beste(j.angebot)[0]?.k)),
  ];
  const body = `
<article class="zettel-kopf">
  <div class="spalte">
    <div class="oben">
      <p class="meta"><span>${esc(z.cycle.roman)} · ${esc(z.cycle.name)}</span><span>${z.number} / 49</span><span>${esc(z.editorial_status)}</span></p>
      ${feldchen(z.number, nah.map((r) => r.z.number))}
    </div>
    <h1 class="titel">${esc(z.title)}</h1>
    <p class="leitsatz">${esc(z.bottom_line)}</p>
    <div class="lesen zettel-text"><p>${esc(z.text)}</p></div>
  </div>
</article>
<section class="verweise" aria-labelledby="verweise-titel">
  <div class="spalte">
    <h2 id="verweise-titel">Weiterdenken</h2>
    <ul>${z.references.map((r) => `<li><span class="gebiet">${esc(r.domain)}</span><span class="zitat">${esc(r.citation)}</span><span class="resonanz">${esc(r.resonance)}</span></li>`).join("")}</ul>
  </div>
</section>
<section class="spalte">
  <nav class="zettel-weiter" aria-label="Blättern"><a href="/b/zettel/${voriger.slug}/" rel="prev">← ${voriger.number} · ${esc(voriger.title)}</a><a href="/b/zettel/">Das Feld</a><a href="/b/zettel/${naechster.slug}/" rel="next">${naechster.number} · ${esc(naechster.title)} →</a></nav>
  ${teilen({ pfad: `zettel/${z.slug}/`, titel: `${z.title} – Zettelkasten`, text: z.bottom_line, karte: `zettel-${z.slug}-karte.png` })}
  <p class="klein" style="margin-top:14px">Derselbe Zettel im Zettelkasten, auch auf Englisch und Spanisch: <a href="/zu-seiner-zeit/strophe/${z.slug}/">zu-seiner-zeit/strophe/${z.slug}</a>.</p>
</section>
${faeden(faedenListe)}`;
  veroeffentliche({ pfad: `zettel/${z.slug}/`, aktiv: "zettel/", titel: `${z.title} – Zettel ${z.number}`, kopfTitel: `${z.title} – Zettelkasten, Zettel ${z.number} – ornament.cloud`, beschreibung: z.bottom_line.length >= 40 ? z.bottom_line : `${z.bottom_line} Zettel ${z.number} von 49 aus dem Zettelkasten, Zyklus ${z.cycle.roman} ${z.cycle.name}.`, body, typ: "article",
    jsonld: [{ "@context": "https://schema.org", "@type": "CreativeWork", name: z.title, headline: z.title, abstract: z.bottom_line, text: z.text, position: z.number, inLanguage: "de-CH", author: { "@type": "Person", name: SEITE.person.name }, isPartOf: { "@type": "CreativeWorkSeries", name: "Zettelkasten", url: `${BASIS}/b/zettel/` }, url: `${BASIS}/b/zettel/${z.slug}/`, citation: z.references.map((r) => r.citation) }],
    bildAlt: `Zettel ${z.number}, ${z.title}: ${z.bottom_line}` });
}

/* ---------- Apps ---------- */
{
  const gruppen = [...new Set(APPS.map((a) => a.gattung))];
  const body = `
<section class="stueck-kopf"><div class="spalte">
  <h1 class="titel">Apps<small>Sieben Anwendungen, die im Browser laufen, sich auf den Startbildschirm legen lassen und ohne Netz weiterarbeiten. Alles rechnet auf deinem Gerät; Bilder und Antworten verlassen es nicht.</small></h1>
</div></section>
${gruppen.map((g) => `<section class="abschnitt" aria-labelledby="g-${g.replace(/\W+/g, "-")}"><div class="spalte">
  <div class="abschnitt-kopf"><h2 id="g-${g.replace(/\W+/g, "-")}">${esc(g)}</h2></div>
  <div class="reihe">${APPS.filter((a) => a.gattung === g).map(appKachel).join("")}</div>
</div></section>`).join("\n")}
<section class="abschnitt" aria-labelledby="resultate-titel"><div class="spalte">
  <div class="abschnitt-kopf"><h2 id="resultate-titel">Was dabei herauskommt</h2><p>Ein Foto vorher und nachher, ein Video aus Musik, eine Konstellation, eine Übung. Mehr auf den Seiten der Apps.</p></div>
  <div class="galerie">
    ${["phorma-i", "the-fictory"].map((sl) => { const a = appVon(sl); return `<div class="galerie-stueck"><p class="klein"><a href="/b/apps/${a.slug}/">${esc(a.name)}</a></p>${beispiele(a)}</div>`; }).join("")}
    ${["phorma-iii", "orna", "omna-color"].map((sl) => { const a = appVon(sl); return `<div class="galerie-stueck"><p class="klein"><a href="/b/apps/${a.slug}/">${esc(a.name)}</a></p>${beispiele(a, { kurz: true })}</div>`; }).join("")}
  </div>
</div></section>
<section class="abschnitt"><div class="spalte"><p class="klein">Weitere Versuche, die nicht im Menü stehen: <a href="/alpha/drittes-rad/">Das Dritte Rad</a>, <a href="/alpha/stadt/">Die Paradoxie der Stadt</a>, <a href="/alpha/sketchory/">Sketchory</a>, <a href="/alpha/aufnahme/">Aufnahme</a>.</p></div></section>`;
  veroeffentliche({ pfad: "apps/", aktiv: "apps/", titel: "Apps – sieben Anwendungen im Browser", beschreibung: "ORNA, ORMA, OMNA COLOR, PHORMA I bis III und The Fictory: Denkspiele, Farbräder und Bildmaschinen, die im Browser laufen und ohne Netz weiterarbeiten.", body, bildAlt: "Die sieben Apps von ornament.cloud" });
}
for (const a of APPS) {
  const zs = zettelZu("app", a.slug, 3);
  const schwester = APPS.filter((x) => x.gattung === a.gattung && x.slug !== a.slug)[0];
  const body = `
<article class="stueck-kopf"><div class="spalte">
  <p class="gattung">${esc(a.gattung)}${a.werk ? ` · zu «${esc(a.werk)}»` : ""}</p>
  <h1 class="titel" data-wort="${attr(a.name)}"><span class="zeichen-gross">${zeichen(a.zeichen)}</span>${esc(a.name)}</h1>
  <p class="lead">${esc(a.kurz)}</p>
  <p class="knopfreihe"><a class="knopf voll" href="/b/apps/${a.slug}/oeffnen/">${a.name} öffnen</a>${a.app ? `<a class="knopf" href="/${attr(a.app)}">Als App installieren</a>` : ""}${a.feld ? `<a class="knopf still" href="/b/apps/${a.slug}/feld/">Alle 326 im Feld</a>` : ""}</p>
  <figure class="stueck-bild quadrat">${appBild(a)}</figure>
  <div class="stueck-text"><p>${esc(a.text)}</p><p class="fuer">${esc(a.fuer)}</p></div>
</div></article>
<section class="abschnitt" aria-labelledby="beispiele-titel"><div class="spalte"><div class="abschnitt-kopf"><h2 id="beispiele-titel">Was dabei herauskommt</h2></div>
  <figure class="tafel-lebt" data-tafel="${a.slug}">${appBild(a)}<figcaption>${esc(a.bewegung)}</figcaption></figure>
  ${beispiele(a)}</div></section>
<section class="spalte">${teilen({ pfad: `apps/${a.slug}/`, titel: a.name, text: a.kurz })}</section>
${faeden([...zs.map((z) => fZettel(z)), fApp(schwester), fAngebot(angebotVon(a.gattung === "Bild und Video" ? "produkte" : "vermittlung")), a.werk ? fRaster(rasterVon("nebeneinander-nacheinander")) : fAngebot(angebotVon("webdesign"))])}`;
  buehne({ pfad: `apps/${a.slug}/oeffnen/`, name: a.name, ziel: a.url, zurueck: `apps/${a.slug}/` });
  if (a.feld) buehne({ pfad: `apps/${a.slug}/feld/`, name: `${a.name} – das Feld`, ziel: a.feld, zurueck: `apps/${a.slug}/` });
  veroeffentliche({ pfad: `apps/${a.slug}/`, aktiv: "apps/", titel: `${a.name} – ${a.kurz.replace(/\.$/, "")}`, beschreibung: beschreibung(a.text), body, bildAlt: a.bildAlt, module: ["tafeln-leben.js"],
    jsonld: [{ "@context": "https://schema.org", "@type": "SoftwareApplication", name: a.name, applicationCategory: "MultimediaApplication", operatingSystem: "Browser", url: `${BASIS}/${a.url}`, description: a.kurz, offers: { "@type": "Offer", price: "0", priceCurrency: "CHF" }, author: { "@type": "Person", name: SEITE.person.name } }] });
}

/* ---------- Raster ---------- */
function quadrant(r) {
  if (!r.felder) return `<div class="quadrant-leer" aria-hidden="true"><span>Einheit</span><span>Operation</span><span>Vermittlung</span></div>`;
  return `<div class="quadrant" aria-label="Die vier Felder">
  <span class="y">${esc(r.achsen.y)} →</span>
  <div class="vier">${r.felder.flat().map((f, i) => `<span${r.betont && r.betont[0] * 2 + r.betont[1] === i ? ' class="betont"' : ""}>${esc(f)}</span>`).join("")}</div>
  <span class="x">${esc(r.achsen.x)} →</span>
</div>`;
}
{
  const body = `
<section class="stueck-kopf"><div class="spalte">
  <h1 class="titel">Prüfraster<small>Vier Instrumente zum genaueren Hinsehen. Jedes hat ein Grundlagenpapier und einen Anwendungsprompt: Den Prompt kopierst du mit deinem Fall in einen KI-Assistenten, das Raster führt die Prüfung.</small></h1>
</div></section>
<section class="abschnitt"><div class="spalte">
  <div class="reihe">${RASTER.map((r) => `<a class="stueck" href="/b/raster/${r.slug}/"><span class="bild quadrat">${appBild(r, ' loading="lazy"')}</span><h3>${zeichen(r.slug)}${esc(r.name)}</h3><p>${esc(r.kurz)} ${esc(r.fassung)}, ${esc(r.stand)}.</p></a>`).join("")}</div>
</div></section>`;
  veroeffentliche({ pfad: "raster/", aktiv: "raster/", titel: "Prüfraster – vier Instrumente zum Hinsehen", beschreibung: "Nebeneinander und Nacheinander, der Verteilapparat des Körpers, ein Raster für Gesellschaftskonzepte und eines für journalistische Texte: Grundlagenpapiere und Anwendungsprompts.", body, bildAlt: "Die vier Prüfraster" });
}
for (const r of RASTER) {
  const zs = zettelZu("raster", r.slug, 3);
  const promptText = readFileSync(new URL(r.prompt, ROOT), "utf8");
  // Bedienung (20. Oktober 2026, «die Bedienung an den neuen, reduzierten Stil angepasst, analog zu den App-Beiträgen»): der Prompt wird hier kopiert, nicht heruntergeladen
  const body = `
<article class="stueck-kopf"><div class="spalte">
  <p class="gattung">Prüfraster · ${esc(r.fassung)} · ${esc(r.stand)}</p>
  <h1 class="titel"><span class="zeichen-gross">${zeichen(r.slug)}</span>${esc(r.name)}</h1>
  <p class="lead">${esc(r.kurz)}</p>
  <p class="knopfreihe"><button class="knopf voll prompt-kopieren" type="button" data-ziel="prompt-text">Prompt kopieren</button><a class="knopf" href="/${attr(r.prompt)}">Prompt lesen</a>${r.pdf ? `<a class="knopf" href="/${attr(r.pdf)}">Grundlagenpapier (PDF)</a>` : ""}${r.raster ? `<a class="knopf" href="/${attr(r.raster)}">Das Raster (Text)</a>` : ""}<a class="knopf still" href="/${attr(r.seite)}">Seite mit Anleitung</a></p>
  <script type="text/plain" id="prompt-text">${promptText.replace(/<\/script/gi, "<\\/script")}</script>
  <div class="stueck-text"><p>${esc(r.text)}</p></div>
</div></article>
<section class="abschnitt" aria-labelledby="arbeit-titel"><div class="spalte">
  <div class="abschnitt-kopf"><h2 id="arbeit-titel">So arbeitet das Raster</h2></div>
  <div class="raster-paar">
    <figure class="tafel-lebt" data-tafel="${r.slug}">${appBild(r)}<figcaption>${esc(r.bewegung)}</figcaption></figure>
    ${quadrant(r)}
  </div>
</div></section>
<section class="ablauf" aria-labelledby="ablauf-titel"><div class="spalte">
  <h2 id="ablauf-titel">So wendest du es an</h2>
  <ol>
    <li><span><b>Prompt kopieren.</b> Der ganze ${esc(r.fassung)} liegt dann in der Zwischenablage; wer lieber liest, öffnet ihn als Text.</span></li>
    <li><span><b>In einen KI-Assistenten einfügen</b> und dein Material dazugeben: ${esc(r.anwendung)}</span></li>
    <li><span><b>Lesen, was das Raster findet:</b> ${esc(r.ergebnis)}</span></li>
  </ol>
</div></section>
<section class="spalte">${teilen({ pfad: `raster/${r.slug}/`, titel: r.name, text: r.kurz })}</section>
${faeden([...zs.map((z) => fZettel(z)), r.slug === "nebeneinander-nacheinander" ? fApp(appVon("orna")) : fApp(appVon("orma")), fAngebot(angebotVon("vermittlung")), fRaster(RASTER.find((x) => x.slug !== r.slug && x.stand === r.stand) || RASTER.find((x) => x.slug !== r.slug))])}`;
  veroeffentliche({ pfad: `raster/${r.slug}/`, aktiv: "raster/", titel: `${r.name} – Prüfraster`, beschreibung: beschreibung(r.text), body, typ: "article", module: ["tafeln-leben.js"],
    jsonld: [{ "@context": "https://schema.org", "@type": "CreativeWork", name: r.name, description: r.kurz, url: `${BASIS}/b/raster/${r.slug}/`, author: { "@type": "Person", name: SEITE.person.name }, inLanguage: "de-CH" }] });
}

/* ---------- Angebote ---------- */
{
  const body = `
<section class="stueck-kopf"><div class="spalte">
  <h1 class="titel">Angebot<small>Webdesign, Vermittlung und Beratung, kuratorische Projekte, Produkte: vier Leistungen von Christian Strickler, zwischen Zürich, Basel und Aarau. Jede beginnt mit einem Gespräch. Wähle auf der Seite der Leistung, was du brauchst: Daraus entsteht ein Briefing, das du per Mail schickst.</small></h1>
</div></section>
<section class="abschnitt"><div class="spalte">
  <ul class="liste-linien">${ANGEBOTE.map((a, i) => `<li><a href="/b/angebot/${a.slug}/"><span class="n">${zeichen(a.slug)}</span><span class="name">${esc(a.name)}</span><span class="pfeil">Briefing</span><span class="kurz">${esc(a.kurz)} ${esc(a.fuer)}</span></a></li>`).join("")}</ul>
</div></section>`;
  veroeffentliche({ pfad: "angebot/", aktiv: "angebot/", titel: "Angebot – Webdesign, Vermittlung, Kuration, Produkte", beschreibung: "Webdesign, Vermittlung und Beratung, kuratorische Projekte und Produkte: vier Leistungen von Christian Strickler, zwischen Zürich, Basel und Aarau, von der Website bis zur Ausstellung.", body, bildAlt: "Die sieben Angebote" });
}
for (const [i, a] of ANGEBOTE.entries()) {
  const zs = zettelZu("angebot", a.slug, 3);
  const appTop = beste(Object.fromEntries(APPS.map((x) => [x.slug, zs.reduce((s, z) => s + (jevZettel(z.number).app?.[x.slug] || 0), 0)])))[0]?.k;
  const body = `
<article class="stueck-kopf"><div class="spalte">
  <p class="gattung">Leistung</p>
  <h1 class="titel"><span class="zeichen-gross">${zeichen(a.slug)}</span>${esc(a.name)}</h1>
  <p class="lead">${esc(a.kurz)}</p>
  <p class="knopfreihe"><a class="knopf voll" href="#briefing">Briefing beginnen</a><a class="knopf" href="mailto:${SEITE.person.mail}?subject=${encodeURIComponent("Anfrage: " + a.name)}">Direkt schreiben</a></p>
  <div class="stueck-text"><p>${esc(a.text)}</p><p class="fuer">${esc(a.fuer)}</p></div>
  ${a.hinweis ? `<p class="hinweis">${esc(a.hinweis)}</p>` : ""}
</div></article>
<section class="ablauf" aria-labelledby="ablauf-titel"><div class="spalte">
  <h2 id="ablauf-titel">So geht es</h2>
  <ol>${a.ablauf.map((s) => `<li><span>${esc(s)}</span></li>`).join("")}</ol>
</div></section>
${a.referenzen ? `<section class="referenzen" aria-labelledby="ref-titel"><div class="spalte"><h2 id="ref-titel">Referenzen</h2><ol class="jahre">${a.referenzen.map(([j, t]) => `<li><span class="jahr">${esc(j)}</span><span>${esc(t)}</span></li>`).join("")}</ol></div></section>` : ""}
<section class="beweis" aria-labelledby="beweis-titel"><div class="spalte">
  <h2 id="beweis-titel">Zum Anschauen</h2>
  <ul>${a.beweis.map(([h, t]) => `<li><a href="/${attr(h)}">${esc(t)}</a></li>`).join("")}</ul>
</div></section>
<section class="briefing" id="briefing" aria-labelledby="briefing-titel"><div class="spalte">
  <h2 id="briefing-titel">Dein Briefing</h2>
  <p>Drei Fragen, je eine Wahl. Was dabei herauskommt, schickst du als Mail; alles Weitere besprechen wir.</p>
  <form class="brief" data-angebot="${attr(a.name)}" action="mailto:${SEITE.person.mail}" method="get">
    ${a.dialog.map((d, di) => `<fieldset><legend>${esc(d.frage)}</legend><div class="chips">${d.wahlen.map((w, wi) => `<input type="radio" name="f${di}" id="f${di}-${wi}" value="${attr(w)}"><label class="chip" for="f${di}-${wi}">${esc(w)}</label>`).join("")}</div></fieldset>`).join("\n    ")}
    <output aria-live="polite">Wähle oben, dann steht hier dein Briefing.</output>
    <p class="knopfreihe"><a class="knopf voll brief-mail" href="mailto:${SEITE.person.mail}?subject=${encodeURIComponent("Anfrage: " + a.name)}">Per Mail schicken</a><button class="knopf still brief-kopieren" type="button">Kopieren</button></p>
    <p class="klein ohne">Die Mail öffnet sich in deinem Mailprogramm; nichts wird hier gespeichert oder gesendet.</p>
  </form>
</div></section>
<section class="spalte">${teilen({ pfad: `angebot/${a.slug}/`, titel: `${a.name} – ${SEITE.person.name}`, text: a.kurz })}</section>
${faeden([...zs.map((z) => fZettel(z)), fApp(appVon(appTop)), fAngebot(ANGEBOTE[(i + 1) % ANGEBOTE.length])])}`;
  veroeffentliche({ pfad: `angebot/${a.slug}/`, aktiv: "angebot/", titel: `${a.name} – ${a.kurz.replace(/\.$/, "")}`, kopfTitel: `${a.name} – Christian Strickler, Zürich, Basel, Aarau – ornament.cloud`, beschreibung: beschreibung(`${a.kurz} ${a.fuer}`), body,
    jsonld: [{ "@context": "https://schema.org", "@type": "Service", name: a.name, description: a.text, serviceType: a.name, areaServed: ["CH", "DE", "AT"], url: `${BASIS}/b/angebot/${a.slug}/`, provider: { "@type": "Person", name: SEITE.person.name, address: { "@type": "PostalAddress", addressLocality: "Kaiserstuhl", addressRegion: "AG", addressCountry: "CH" }, workLocation: ["Zürich", "Basel", "Aarau"] } }] });
}

/* ---------- Werke ---------- */
// Nur Ankündigungen, keine Beispiele (Wunsch vom 20. Oktober 2026: «die Beispiel-Werke von der Seite Werke entfernen. Nur die Ankündigungen für
// Prints und Originale, Im Raum, Editionen lassen»): Muster aus werke.json (muster: true) kommen nie in den Neubau; echte Werke erscheinen, sobald es sie gibt.
{
  const body = `
<section class="stueck-kopf"><div class="spalte">
  <h1 class="titel">Werke<small>Originale und Prints in kleinen Auflagen, Arbeiten im Raum und Editionen. Alles ist in Vorbereitung; was fertig ist, steht hier.</small></h1>
</div></section>
<section class="abschnitt" aria-labelledby="prints-titel"><div class="spalte">
  <div class="abschnitt-kopf"><h2 id="prints-titel">Prints und Originale</h2><p>${esc((werke.ankuendigung?.text || "").replace(/\s*Ein erstes Beispiel zeigt schon[^.]*\.\s*/, ""))}</p></div>
  ${echteWerke.length ? `<div class="reihe">${echteWerke.map((w) => `<article class="werk" id="${w.slug}"><a href="/art/${w.slug}/"><span class="bild"><img src="/art/bilder/${w.slug}-1-800.webp" alt="${attr(w.bilder[0].alt)}" loading="lazy" width="800" height="1067"></span></a><h3>${esc(w.titel)}</h3><p class="klein">${esc(w.technik)}, ${w.masse.b} × ${w.masse.h} cm, Auflage ${w.auflage.gesamt}</p><p class="preis">CHF ${w.preis}.–</p><p><a href="/art/${w.slug}/">Bestellen</a></p></article>`).join("")}</div>` : ""}
</div></section>
<section class="abschnitt" aria-labelledby="raum-titel"><div class="spalte">
  <div class="abschnitt-kopf"><h2 id="raum-titel">Im Raum</h2><p>In Vorbereitung: Arbeiten in 3D für Bildschirm und Projektion, die im Browser laufen.</p></div>
</div></section>
<section class="abschnitt" aria-labelledby="editionen-titel"><div class="spalte">
  <div class="abschnitt-kopf"><h2 id="editionen-titel">Editionen</h2><p>In Vorbereitung: der Zettelkasten als Buch, als Kartenset und als Poster, dazu sieben Notizbücher. Wer es wissen will, wenn es so weit ist, lässt sich in die Liste eintragen.</p></div>
  <p class="knopfreihe"><a class="knopf" href="${attr(UEBER.liste.mailto)}">Eintragen lassen</a></p>
</div></section>
<section class="spalte">${teilen({ pfad: "werke/", titel: "Werke – Christian Strickler", text: "Originale, Prints und Arbeiten im Raum." })}</section>
${faeden([fZettel(zettel[30]), fZettel(zettel[33]), fAngebot(angebotVon("produkte")), fApp(appVon("phorma-ii"))])}`;
  veroeffentliche({ pfad: "werke/", aktiv: "werke/", titel: "Werke – Originale, Prints und Arbeiten im Raum", beschreibung: "Originale und Prints in kleinen Auflagen von Christian Strickler, Arbeiten im Raum und Editionen – in Vorbereitung.", body, bildAlt: "Werke von Christian Strickler" });
}

/* ---------- Zuletzt ---------- */
{
  const body = `
<section class="stueck-kopf"><div class="spalte">
  <h1 class="titel">Zuletzt<small>Beiträge aus X, Facebook und Instagram, gesichert mit Beleg und Schlagworten im Zettelkasten für Social Media.</small></h1>
</div></section>
<section class="abschnitt"><div class="spalte">
  ${beitraege.eintraege.slice().reverse().map(beitrag).join("")}
  <p class="klein" style="margin-top:18px">Alle Beiträge mit Schlagworten, Autor:innen und Feed: <a href="/social-media/">social-media</a>. Neues per <a href="/social-media/feed.xml">RSS</a>.</p>
</div></section>
${faeden([fZettel(zettel[40]), fZettel(zettel[36]), fApp(appVon("orna"))])}`;
  veroeffentliche({ pfad: "zuletzt/", aktiv: "zuletzt/", titel: "Zuletzt – Beiträge aus Social Media", beschreibung: "Ausgewählte Beiträge aus X, Facebook und Instagram, gesichert mit Beleg und Schlagworten.", body, bildAlt: "Zuletzt: Beiträge aus Social Media" });
}

/* ---------- Über ---------- */
{
  const body = `
<section class="stueck-kopf"><div class="spalte sieben">
  <div class="s-4">
    <h1 class="titel">${esc(SEITE.person.name)}<small>Webdesign, Vermittlung und Beratung, kuratorische Projekte und Produkte. Lebt und arbeitet zwischen Zürich, Basel und Aarau.</small></h1>
    <div class="ueber-text" style="margin-top:32px">${UEBER.text.map((t) => `<p>${esc(t)}</p>`).join("")}</div>
    <div class="hintergrund" id="hintergrund">
      <h2>${esc(UEBER.hintergrund.titel)}</h2>
      ${UEBER.hintergrund.text.map((t) => `<p>${esc(t)}</p>`).join("")}
    </div>
    <div class="liste-kasten"><h2>${esc(UEBER.liste.titel)}</h2><p>${esc(UEBER.liste.text)}</p><p class="knopfreihe"><a class="knopf" href="${attr(UEBER.liste.mailto)}">Eintragen lassen</a></p><p class="klein">Der Link öffnet eine fertige Mail. Austragen mit einer Antwort; die Adresse bleibt bei mir.</p></div>
  </div>
  <div class="s-3" style="padding-top:12px">
    ${SIGNET_TAFEL.replace('class="tafel-lebt signet-tafel"', 'class="tafel-lebt signet-tafel ueber-signet"')}
    <address class="adresse">${esc(SEITE.person.name)}<br>${esc(SEITE.person.strasse)}<br>${esc(SEITE.person.plz)}<br><a href="mailto:${SEITE.person.mail}">${SEITE.person.mail}</a></address>
    <p class="klein" style="margin-top:18px"><a href="/impressum/">Impressum, AGB und Datenschutz</a></p>
    <div style="margin-top:32px">${feld({ klein: true, paare: startPaare.slice(0, 8) })}</div>
  </div>
</div></section>
<section class="spalte">${teilen({ pfad: "ueber/", titel: `${SEITE.person.name} – ornament.cloud`, text: "Kunst, Design, Webdesign, Therapie und Theorie." })}</section>
${faeden([fAngebot(angebotVon("webdesign")), fAngebot(angebotVon("kuration")), fZettel(zettel[16]), fApp(appVon("orma"))])}`;
  veroeffentliche({ pfad: "ueber/", aktiv: "ueber/", module: ["tafeln-leben.js"], titel: `Über ${SEITE.person.name}`, beschreibung: `${SEITE.person.name}, zwischen Zürich, Basel und Aarau: Webdesign, Vermittlung und Beratung, kuratorische Projekte, Produkte. Hintergrund, Kontakt und Liste.`, body, typ: "profile", jsonld: [personLd()], bildAlt: `${SEITE.person.name}` });
}

/* ---------- Werkstatt (nicht verlinkt, noindex) ---------- */
{
  const body = `
<section class="stueck-kopf"><div class="spalte">
  <p class="gattung">Werkstatt · nicht verlinkt, für Suchmaschinen gesperrt</p>
  <h1 class="titel">Print on Demand<small>Produkte aus dem Bestand, vorbereitet für Amazon KDP und ähnliche Plattformen. Die PDFs erzeugt tools/build-b-pod.mjs aus denselben Daten wie die Seiten; die Angaben darunter sind zum Einfügen in das Formular der Plattform.</small></h1>
</div></section>
<section class="abschnitt"><div class="spalte">
  ${PRODUKTE.map((p) => `<article class="produkt" id="${p.slug}">
    <h3>${esc(p.name)}</h3>
    <p>${esc(p.untertitel)}</p>
    <dl>
      <dt>Form</dt><dd>${esc(p.art)}</dd>
      <dt>Dateien</dt><dd><a href="/b/werkstatt/${attr(p.datei)}">${esc(p.datei.replace("pod/", ""))}</a>${p.cover ? ` · <a href="/b/werkstatt/${attr(p.cover)}">${esc(p.cover.replace("pod/", ""))}</a>` : ""}${existsSync(new URL(`werkstatt/${p.datei}`, AUS)) ? "" : ' <span class="klein">(noch nicht erzeugt: node tools/build-b-pod.mjs)</span>'}</dd>
      <dt>Preis</dt><dd>${esc(p.preis)}</dd>
      <dt>Kategorien</dt><dd>${p.kategorien.map(esc).join(" · ")}</dd>
    </dl>
    <pre>Titel: ${esc(p.name)}
Untertitel: ${esc(p.untertitel)}
Autor: ${esc(SEITE.person.name)}
Sprache: Deutsch
Beschreibung:
${esc(p.beschreibung)}
Schlagworte: ${p.schlagworte.map(esc).join("; ")}</pre>
  </article>`).join("\n  ")}
  <p class="klein" style="margin-top:24px">Reihenfolge für den Start: zuerst das Buch (ein Produkt, eine Rezension genügt für Sichtbarkeit), dann die Notizbücher (sieben Varianten, wenig Aufwand), dann Poster und Karten über eine Plattform mit Druck in Europa. Die Texte des Zettelkastens bleiben in allen Produkten wörtlich gleich.</p>
</div></section>`;
  veroeffentliche({ pfad: "werkstatt/", titel: "Werkstatt – Print on Demand", beschreibung: "Produkte aus dem Bestand für Print on Demand.", body, noindex: true });
}

/* ---------- Dateien, Sitemap ---------- */
copyFileSync(new URL("src/b/b.css", ROOT), new URL("b.css", AUS));
copyFileSync(new URL("src/b/b.js", ROOT), new URL("b.js", AUS));
copyFileSync(new URL("src/b/tafeln.mjs", ROOT), new URL("tafeln.mjs", AUS));
writeFileSync(new URL("tafeln-leben.js", AUS), readFileSync(new URL("src/b/tafeln-leben.js", ROOT), "utf8").replace('from "./tafeln.mjs"', `from "./tafeln.mjs?v=${V}"`));
mkdirSync(new URL("kacheln/", AUS), { recursive: true });
writeFileSync(new URL("kacheln/liste.json", AUS), JSON.stringify(seiten.concat(["werkstatt/"]), null, 1) + "\n");

{
  const sm = new URL("sitemap.xml", ROOT);
  let xml = readFileSync(sm, "utf8");
  const block = `  <!-- B:START (erzeugt aus tools/build-b.mjs, der Neubau unter /b/) -->\n${seiten.map((p) => `  <url><loc>${BASIS}/b/${p}</loc><lastmod>${HEUTE}</lastmod></url>`).join("\n")}\n  <!-- B:END -->\n`;
  xml = /<!-- B:START/.test(xml) ? xml.replace(/  <!-- B:START[\s\S]*?<!-- B:END -->\n/, block) : xml.replace("</urlset>", block + "</urlset>");
  writeFileSync(sm, xml);
}
console.log(`${seiten.length} Seiten unter b/ geschrieben${jev ? "" : " (ohne jev)"}`);
