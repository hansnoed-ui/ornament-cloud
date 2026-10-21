// Neubau /b/: erzeugt alle Seiten unter b/ aus den Daten (Zettel aus src/data/, ORNA und ORMA aus src/doppelspalt/ und src/orma/,
// Werke aus src/art/werke.json, Beiträge aus social-media/daten/eintraege.json) und den eigenen Texten in src/b/inhalt.mjs.
// Die Fäden zwischen den Inhalten kommen aus src/b/jev.json (tools/build-b-jev.mjs) und aus gemeinsamen Personen der Zettel.
// Kopiert b.css und b.js, schreibt den Block B:START/END in sitemap.xml. Vorschaukarten: tools/b-kacheln.mjs, Werkstatt-PDFs: tools/build-b-pod.mjs.
// Seit 20. Oktober 2026 zweisprachig (Wunsch: «die ganze Seite auf Englisch übersetzen und ganz oben neben dem Logo dezent die Wahl d (deutsch) und
// e (english) anbieten»): jede Seite entsteht zweimal, unter /b/ aus src/b/inhalt.mjs und unter /b/en/ aus src/b/inhalt.en.mjs, die Wörter der
// Oberfläche aus src/b/ui.mjs, die Zettel aus der englischen Fassung des Zettelkastens. Gleiche Pfade in beiden Sprachen; der Schalter «d · e» neben
// dem Signet führt auf dieselbe Seite in der anderen Sprache. Die Vorschaukarten und die Werkstatt gibt es nur einmal (deutsch).
//
//   node tools/build-b.mjs
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync } from "node:fs";
import * as DE from "../src/b/inhalt.mjs";
import * as EN from "../src/b/inhalt.en.mjs";
import { UI } from "../src/b/ui.mjs";
import { ladeZettel, ladeZettelkasten, ladeOrma, ladeWerke, ladeBeitraege, ladeOmna, ladeKonstellationen, ladePersonen } from "./b-daten.mjs";
import { pruefsumme } from "./build-b-jev.mjs";
import { zeichen } from "../src/b/zeichen.mjs";
import { createHash } from "node:crypto";

const ROOT = new URL("../", import.meta.url);
const AUS_DE = new URL("b/", ROOT);
const V = 21;                                     // Versionsmarke für b.css und b.js (?v=), bei Änderungen hochzählen
const BASIS = "https://ornament.cloud";
const HEUTE = new Date().toISOString().slice(0, 10);
const INHALT = { de: DE, en: EN };

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const attr = esc;
const kachelName = (pfad) => (pfad.replace(/\/$/, "").replace(/\//g, "-") || "start");
/** Beschreibung für Suchmaschinen: ein oder zwei Sätze, höchstens 200 Zeichen */
const beschreibung = (t) => { const s = t.split(/(?<=\.)\s/); return s[1] && (s[0] + " " + s[1]).length <= 200 ? s[0] + " " + s[1] : s[0].slice(0, 200); };
const personAus = (citation) => citation.split(",")[0].trim();

/* ---------- Daten, die in beiden Sprachen gleich sind ---------- */
const orma = ladeOrma();
const werke = ladeWerke();
const echteWerke = werke.werke.filter((w) => !w.muster);
// Versionsmarke aus dem Inhalt einer Datei (21. Oktober 2026: das neu gerechnete Beispielvideo von PHORMA II kam nicht an, weil Browser die alte
// Datei unter derselben Adresse behielten); ändert sich nur, wenn sich die Datei ändert
const MARKEN = new Map();
const mitMarke = (pfad) => { if (!MARKEN.has(pfad)) MARKEN.set(pfad, createHash("sha256").update(readFileSync(new URL(pfad, ROOT))).digest("hex").slice(0, 10)); return `/${pfad}?v=${MARKEN.get(pfad)}`; };   // Muster (muster: true) kommen nie in den Neubau (20. Oktober 2026: «die Beispiel-Werke von der Seite Werke entfernen»)
const beitraege = ladeBeitraege();
const omnaUebungen = ladeOmna();
const konstellationen = ladeKonstellationen();
const namen = ladePersonen();
let jev = null;
try {
  const j = JSON.parse(readFileSync(new URL("src/b/jev.json", ROOT), "utf8"));
  if (j.pruefsumme === pruefsumme(ladeZettel("de"), orma)) jev = j; else console.warn("jev.json passt nicht zur Prüfsumme – Fäden ohne jev (tools/build-b-jev.mjs neu laufen lassen)");
} catch { console.warn("kein src/b/jev.json – Fäden ohne jev"); }
const beste = (p, n = 1) => Object.entries(p || {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, w]) => ({ k, w }));
const jevZettel = (n) => jev?.zettel?.[n] || {};

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

// weiche Trennstellen für die Zellen des Felds (Chromium ohne Wörterbuch trennt sonst nicht; die Stellen nach Duden)
const TRENNUNG = { Beobachter: "Beob&shy;achter", Verspätung: "Ver&shy;spätung", Gedächtnis: "Ge&shy;dächtnis", Erinnerung: "Erin&shy;nerung", Vergessen: "Ver&shy;gessen", Geschichte: "Ge&shy;schichte", Erwartung: "Erwar&shy;tung", Verantwortung: "Verant&shy;wortung", Anerkennung: "Aner&shy;kennung", Berührung: "Berüh&shy;rung", Irritation: "Irri&shy;tation", Wahrnehmung: "Wahr&shy;nehmung", Übersetzung: "Über&shy;setzung", Koppelung: "Koppe&shy;lung", Ausstellung: "Aus&shy;stellung", Information: "Infor&shy;mation", Wahrscheinlichkeit: "Wahrschein&shy;lichkeit", Algorithmus: "Algo&shy;rithmus", Empfehlung: "Empfeh&shy;lung", Plattform: "Platt&shy;form", Identität: "Iden&shy;tität", Möglichkeit: "Möglich&shy;keit", Kontingenz: "Kontin&shy;genz", Unterbrechung: "Unter&shy;brechung", Responsibility: "Respon&shy;sibility", Recognition: "Recog&shy;nition", Interruption: "Inter&shy;ruption", Probability: "Proba&shy;bility", Recommendation: "Recommen&shy;dation", Contingency: "Contin&shy;gency", Possibility: "Possi&shy;bility", Translation: "Trans&shy;lation", Perception: "Percep&shy;tion", Expectation: "Expec&shy;tation", Exhibition: "Exhi&shy;bition" };
const weich = (titel) => esc(titel).replace(/\S+$/, (w) => TRENNUNG[w] || w);

/** Das Signet in Bewegung (tools/b-app-bilder.mjs schreibt das Ruhebild; b/tafeln-leben.js lässt es leben) */
const SIGNET_TAFEL = `<figure class="tafel-lebt signet-tafel" data-tafel="signet"><picture><source srcset="/b/bilder/signet/signet-dunkel.svg" media="(prefers-color-scheme: dark)"><img src="/b/bilder/signet/signet.svg" alt="Das Signet von ornament.cloud, gezeichnet: die Re-entry-Schlaufe mit dem Punkt, der sie abläuft" width="1200" height="1200"></picture></figure>`;
/** Das Bild einer App: die gezeichnete Tafel (tools/b-app-bilder.mjs), hell oder dunkel nach dem Modus des Geräts */
function appBild(a, extra = "") {
  return `<picture><source srcset="/${attr(a.bildDunkel)}" media="(prefers-color-scheme: dark)"><img src="/${attr(a.bild)}" alt="${attr(a.bildAlt)}" width="1200" height="1200"${extra}></picture>`;
}

const sitemapSeiten = [];   // b/… und b/en/… für die Sitemap
const kachelSeiten = { de: [], en: [] };    // je Sprache: die Vorschaukarten liegen unter b/kacheln/ und b/en/kacheln/ (tools/b-kacheln.mjs)

/* ========== Eine Sprache ========== */
function bau(sprache) {
  const T = UI[sprache], I = INHALT[sprache];
  const { SEITE, DIALOG, APPS, RASTER, ANGEBOTE, PRODUKTE, UEBER } = I;
  const B = T.praefix;                                   // "/b/" oder "/b/en/"
  const AUS = new URL(B.slice(1), ROOT);
  const kasten = ladeZettelkasten(sprache);
  const zettel = ladeZettel(sprache);
  const istDe = sprache === "de";

  /** umgekehrt: die Zettel, die zu einem Stück am besten passen */
  const zettelZu = (art, slug, n = 3) => zettel.map((z) => ({ z, w: jevZettel(z.number)[art]?.[slug] || 0 })).filter((x) => x.w > 0).sort((a, b) => b.w - a.w).slice(0, n).map((x) => x.z);

  // Resonanzen: Zettel, die dieselbe Person nennen (die Zitate sind in beiden Sprachen gleich)
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
  /** Das kleine Feld (7 × 7 Punkte) führt zurück zum grossen (20. Oktober 2026, Wunsch: «der Klick auf dieses Symbol [soll] wieder zum grossen Zettelkasten-Raster zurückführen») */
  function feldchen(n, nah = []) {
    const titel = T.feldchen(n);
    return `<a class="feldchen" href="${B}zettel/${n ? "#feld" : ""}" aria-label="${attr(titel)}" title="${attr(titel)}">${zettel.map((z) => `<i${z.number === n ? ' class="hier"' : nah.includes(z.number) ? ' class="nah"' : ""}></i>`).join("")}</a>`;
  }
  /** die Anleitung zum Feld: mit Zeiger «fahre über», ohne Zeiger (Telefon) «tippe an, noch einmal öffnet» – b.css blendet je nach (hover) ein */
  const feldHinweis = T.feldHinweis;

  /** Das Feld 7 × 7 als Links; Zeilen sind die Zyklen */
  function feld({ gross = false, klein = false, aktuell = null, paare = startPaare, still = false } = {}) {
    return `<div class="feld-rahmen" data-faeden="${attr(JSON.stringify(paare))}"${still ? " data-still" : ""}>
  <nav class="feld${gross ? " gross" : ""}${klein ? " klein" : ""}" aria-label="${attr(T.feldAria)}">${zettel.map((z) => `<a href="${B}zettel/${z.slug}/" data-n="${z.number}"${z.number === aktuell ? ' aria-current="page"' : ""} title="${attr(z.title)}"><span class="n">${z.number}</span><span class="t">${weich(z.title)}</span></a>`).join("")}</nav>
  <svg class="feld-faeden" aria-hidden="true" focusable="false"></svg>
  <div class="feld-zeile" aria-hidden="true">${kasten.movement.map((m) => `<span>${esc(m)}</span>`).join("")}</div>
</div>`;
  }

  function faeden(liste, { wie } = {}) {
    const eintraege = liste.filter(Boolean);
    if (!eintraege.length) return "";
    return `<section class="faeden" aria-labelledby="faeden-titel"><div class="spalte">
  <h2 id="faeden-titel">${esc(T.faeden)}</h2>
  <p class="wie">${esc(wie || T.faedenWie(jev))}</p>
  <ul>${eintraege.map((f) => `<li><a href="${attr(f.href)}"><span class="art">${zeichen(f.artId)}${esc(T.art[f.artId])}</span><span class="was">${esc(f.was)}${f.klein ? `<small${f.deutsch && !istDe ? ' lang="de"' : ""}>${esc(f.klein)}</small>` : ""}</span></a></li>`).join("")}</ul>
</div></section>`;
  }

  const fZettel = (z, klein) => ({ artId: "zettel", href: `${B}zettel/${z.slug}/`, was: `${z.number} · ${z.title}`, klein: klein ?? z.bottom_line });
  const fApp = (a) => a && { artId: "app", href: `${B}apps/${a.slug}/`, was: a.name, klein: a.kurz };
  const fRaster = (r) => r && { artId: "raster", href: `${B}raster/${r.slug}/`, was: r.name, klein: r.kurz };
  const fAngebot = (a) => a && { artId: "angebot", href: `${B}angebot/${a.slug}/`, was: a.name, klein: a.kurz };
  const fOrma = (k) => k && { artId: "konstellation", href: `/portfolio/nebeneinander-nacheinander/?pair=${k.id}`, was: `${k.kuenstler} × ${k.theoretiker}${T.konstellationDeutsch}`, klein: k.frage, deutsch: true };

  /** Eine App als Kachel: immer quadratisch */
  function appKachel(a) {
    return `<a class="stueck" href="${B}apps/${a.slug}/"><span class="bild quadrat">${appBild(a, ' loading="lazy"')}</span><h3>${zeichen(a.zeichen)}${esc(a.name)}</h3><p>${esc(a.kurz)}</p></a>`;
  }

  /** ein Beispielvideo mit Versionsmarke an Film und Poster */
  const video = (b) => `<video controls muted loop playsinline preload="metadata" poster="${attr(mitMarke(b.bild))}" width="${b.mass?.[0] || 1080}" height="${b.mass?.[1] || 1350}">${b.webm ? `<source src="${attr(mitMarke(b.webm))}" type="video/webm">` : ""}<source src="${attr(mitMarke(b.datei))}" type="video/mp4"></video>`;
  /** der gerechnete Film einer App (der letzte unter assets/beispiele/: bei PHORMA III der Film mit drei Effekten, nicht das Intro) */
  const filmVon = (a) => [].concat(a.beispiele || []).filter((b) => b.art === "video" && b.datei.startsWith("assets/beispiele/")).at(-1);

  /** Beispiele: was aus einer App herauskommt (Bildpaar vorher/nachher, Video, Texte aus ORNA, ORMA und OMNA COLOR – auf Englisch als «texte» übersetzt im Inhalt) */
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
    if (b.art === "paar") return `<figure class="paar"><span class="bild"><img src="/${attr(b.vorher)}" alt="${attr(T.vorher)}" loading="lazy"></span><span class="pfeil" aria-hidden="true"></span><span class="bild"><img src="/${attr(b.nachher)}" alt="${attr(T.nachher + a.name)}" loading="lazy"></span><figcaption>${esc(b.text)}</figcaption></figure>`;
    if (b.art === "video") return `<figure class="beispiel-video">${video(b)}<figcaption>${esc(b.text)}</figcaption></figure>`;
    if (b.art === "orna") return `<div class="beispiel-texte">${b.ids.slice(0, kurz ? 1 : 3).map((id) => { const k = konstellationen.find((x) => x.id === id); return k ? `<article class="konstellation"><h3>${esc(namen[k.artistId])} × ${esc(namen[k.theoristId])}</h3><p>${esc(k.text)}</p><p class="frage">${esc(k.question)}</p><p class="klein"><a href="/portfolio/nebeneinander-nacheinander/?pair=${attr(k.id)}">${esc(T.imRad)}</a></p></article>` : ""; }).join("")}</div>`;
    if (b.art === "orma") { const k = ormaVon(b.id); if (!k) return ""; return `<div class="beispiel-texte eins"><article class="konstellation"><h3>${esc(k.kuenstler)} × ${esc(k.theoretiker)}</h3><p class="klein">${esc(T.einstieg)}</p><p>${esc(k.einstieg)}</p><p class="klein">${esc(T.auftraege)}</p><ul class="auftraege">${Object.entries(k.auftraege).map(([n, t]) => `<li><span class="klein">${esc(n)}</span><span>${esc(t)}</span></li>`).join("")}</ul><p class="frage">${esc(k.frage)}</p></article></div>`; }
    if (b.art === "omna") return `<div class="beispiel-texte">${b.ids.slice(0, kurz ? 1 : 3).map((id) => { const u = omnaUebungen.find((x) => x.id === id); return u ? `<article class="uebung"><p class="klein">${esc(u.t)} · ${u.d} ${esc(T.minuten)}</p><h3>${esc(u.n)}</h3><ol>${u.a.map((t) => `<li>${esc(t)}</li>`).join("")}</ol><p class="klein">${esc(T.material)}${esc(u.m)}</p><p class="frage">${esc(u.f)}</p></article>` : ""; }).join("")}</div>`;
    if (b.art === "texte") return `<div class="beispiel-texte${b.eins ? " eins" : ""}">${b.stuecke.slice(0, kurz ? 1 : 3).map((s) => `<article class="${s.nummeriert ? "uebung" : "konstellation"}">${s.klein && s.nummeriert ? `<p class="klein">${esc(s.klein)}</p>` : ""}<h3>${esc(s.titel)}</h3>${s.klein && !s.nummeriert ? `<p class="klein">${esc(s.klein)}</p>` : ""}${s.text ? `<p>${esc(s.text)}</p>` : ""}${s.listeTitel ? `<p class="klein">${esc(s.listeTitel)}</p>` : ""}${s.liste ? (s.nummeriert ? `<ol>${s.liste.map(([, t]) => `<li>${esc(t)}</li>`).join("")}</ol>` : `<ul class="auftraege">${s.liste.map(([n, t]) => `<li><span class="klein">${esc(n)}</span><span>${esc(t)}</span></li>`).join("")}</ul>`) : ""}${s.nach ? `<p class="klein">${esc(s.nach)}</p>` : ""}${s.frage ? `<p class="frage">${esc(s.frage)}</p>` : ""}${s.link ? `<p class="klein"><a href="/${attr(s.link)}">${esc(s.linkText)}</a></p>` : ""}</article>`).join("")}</div>`;
    return "";
  }

  function teilen({ pfad, titel, text, karte }) {
    return `<div class="teilen">
  <button class="knopf teilen-knopf" type="button" data-url="${attr(BASIS + B + pfad)}" data-titel="${attr(titel)}" data-text="${attr(text || "")}">${esc(T.teilen)}</button>
  ${karte ? `<a class="knopf still" href="${B}kacheln/${karte}" download>${esc(T.karte)}</a>` : ""}
  <span class="klein">${esc(T.vorschau)}</span>
</div>`;
  }

  /** der Schalter d · e neben dem Signet: dieselbe Seite in der anderen Sprache (die Werkstatt gibt es nur deutsch) */
  const sprachwahl = (pfad, nurDe = false) => `<nav class="sprache" aria-label="${attr(T.sprache.aria)}"><a href="/b/${pfad}" lang="de" hreflang="de" title="${T.sprache.de}"${istDe ? ' aria-current="true"' : ""}>d</a>${nurDe ? "" : `<a href="/b/en/${pfad}" lang="en" hreflang="en" title="${T.sprache.en}"${istDe ? "" : ' aria-current="true"'}>e</a>`}</nav>`;

  /** Eine ganze Seite */
  function seite({ pfad, titel, beschreibung, body, aktiv, noindex = false, jsonld = [], typ = "website", bild, bildAlt, kopfTitel, module = [], nurDe = false }) {
    const url = `${BASIS}${B}${pfad}`;
    const k = `${B}kacheln/${kachelName(pfad)}.png`;
    const og = bild || `${BASIS}${k}`;
    const ld = [{ "@context": "https://schema.org", "@type": "WebSite", name: "ornament.cloud", url: `${BASIS}${B}`, inLanguage: T.inLanguage, author: { "@type": "Person", name: SEITE.person.name } }, ...jsonld];
    return `<!DOCTYPE html>
<html lang="${T.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(kopfTitel || (pfad ? `${titel} – ornament.cloud` : T.kopfTitelStart))}</title>
  <meta name="description" content="${attr(beschreibung)}">
  ${noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${attr(url)}">`}
  ${noindex || nurDe ? "" : `<link rel="alternate" hreflang="de" href="${BASIS}/b/${pfad}">\n  <link rel="alternate" hreflang="en" href="${BASIS}/b/en/${pfad}">\n  <link rel="alternate" hreflang="x-default" href="${BASIS}/b/${pfad}">`}
  <meta name="author" content="${attr(SEITE.person.name)}">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="${ICON}">
  <!-- Vorschaukarte beim Teilen (Open Graph, X); Bild: tools/b-kacheln.mjs -->
  <meta property="og:type" content="${typ}">
  <meta property="og:site_name" content="ornament.cloud">
  <meta property="og:locale" content="${T.ogLocale}">
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
  <link rel="alternate" type="application/rss+xml" title="${attr(T.feedTitel)}" href="/feed.xml">
  <link rel="preload" href="/vendor/fonts/instrument-sans-normal-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/vendor/fonts/newsreader-italic-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/vendor/fonts/fonts.css">
  <link rel="stylesheet" href="/b/b.css?v=${V}">
  <script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
</head>
<body>
  <a class="sprung" href="#inhalt">${esc(T.sprung)}</a>
  <header class="kopf">
    <div class="spalte">
      <div class="marke"><a class="signet" href="${B}"${pfad === "" ? ' aria-current="page"' : ""}>${SIGNET}<span>ornament.cloud</span></a>${sprachwahl(pfad, nurDe)}</div>
      <nav class="hauptnav" aria-label="${attr(T.hauptnav)}">${Object.entries(T.nav).map(([p, n]) => `<a href="${B}${p}"${aktiv === p ? ' aria-current="page"' : ""}>${n}</a>`).join("")}</nav>
    </div>
  </header>
  <main id="inhalt">
${body}
  </main>
  <footer class="fuss">
    <div class="spalte">
      ${feldchen(0)}
      <p class="zeile"><span>${esc(SEITE.person.name)}, ${esc(SEITE.person.ort)}</span><a href="mailto:${SEITE.person.mail}">${SEITE.person.mail}</a></p>
      <p class="zeile"><a href="${B}ueber/">${esc(T.fuss.ueber)}</a><a href="/impressum/">${esc(T.fuss.impressum)}</a><a href="/?bisher">${esc(T.fuss.bisher)}</a><a href="/feed.xml">${esc(T.fuss.feed)}</a></p>
      <p class="zeile"><span>${esc(T.fuss.ohne)}</span></p>
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

  function veroeffentliche(opts) {
    schreibe(opts.pfad, seite(opts));
    if (!opts.noindex) { sitemapSeiten.push(`${B.slice(1)}${opts.pfad}`); kachelSeiten[sprache].push(opts.pfad); }
  }

  /* ---------- Die Bühne: eine Web-Anwendung in der neuen Seite (20. Oktober 2026, Wunsch: «Wenn ich bei den Apps die Webanwendung öffne, lande ich immer noch
     auf der alten Seite. Diese Webanwendung in der neuen Seite darstellen. Nur die downloadbare App noch in der alten Fassung belassen.») ----------
     Eine Seite unter /b/apps/<app>/oeffnen/ mit der Leiste des Neubaus (Signet, Name, Vollbild, eigener Tab, zurück) und der Anwendung im Rahmen;
     die Anwendung blendet mit ?b=1 ihre alte Navigation aus (Skript und Stil im Kopf ihrer Seite). noindex, nicht in der Sitemap; die App-Seite bleibt kanonisch. */
  function buehne({ pfad, name, ziel, zurueck }) {
    const html = `<!DOCTYPE html>
<html lang="${T.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${esc(name)} – ornament.cloud</title>
  <meta name="robots" content="noindex">
  <link rel="canonical" href="${BASIS}${B}${zurueck}">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="${ICON}">
  <link rel="stylesheet" href="/vendor/fonts/fonts.css">
  <link rel="stylesheet" href="/b/b.css?v=${V}">
</head>
<body class="buehne-seite">
  <div class="app-leiste">
    <span class="app-name"><a class="signet" href="${B}" title="ornament.cloud">${SIGNET}</a><b>${esc(name)}</b></span>
    <span class="app-knoepfe">
      <button type="button" class="vollbild" title="${attr(T.buehne.vollbild)}">${zeichen("vollbild")}<span>${esc(T.buehne.vollbild)}</span></button>
      <a class="tab" href="/${attr(ziel)}?sprache=${sprache}" target="_blank" rel="noopener" title="${attr(T.buehne.tabTitel)}">${zeichen("tab")}<span>${esc(T.buehne.tab)}</span></a>
      <a class="zurueck" href="${B}${zurueck}" title="${attr(T.buehne.zurueckTitel)}">${zeichen("schliessen")}<span>${esc(T.buehne.zurueck)}</span></a>
    </span>
  </div>
  <iframe class="app-rahmen" src="/${attr(ziel)}?b=1&amp;sprache=${sprache}" title="${attr(name)}" allow="fullscreen; autoplay; microphone; camera; display-capture; clipboard-write" allowfullscreen loading="eager"></iframe>
  <script type="module" src="/b/b.js?v=${V}"></script>
</body>
</html>
`;
    schreibe(pfad, html);
  }

  function personLd() {
    return { "@context": "https://schema.org", "@type": "Person", name: SEITE.person.name, url: `${BASIS}${B}ueber/`, email: `mailto:${SEITE.person.mail}`,
      address: { "@type": "PostalAddress", streetAddress: SEITE.person.strasse, postalCode: "5466", addressLocality: "Kaiserstuhl", addressRegion: "AG", addressCountry: "CH" },
      jobTitle: T.person.jobTitle, knowsAbout: T.person.knowsAbout,
      alumniOf: [{ "@type": "CollegeOrUniversity", name: "Universität Zürich" }, { "@type": "CollegeOrUniversity", name: "Fachhochschule für Soziale Arbeit St. Gallen" }, { "@type": "EducationalOrganization", name: "iac Zürich" }], makesOffer: ANGEBOTE.map((a) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: a.name, url: `${BASIS}${B}angebot/${a.slug}/` } })) };
  }

  function beitrag(e) {
    const platt = { x: "X", facebook: "Facebook", instagram: "Instagram" }[e.plattform] || e.plattform;
    const datum = new Date(e.veroeffentlicht).toLocaleDateString(T.locale, { day: "numeric", month: "long", year: "numeric" });
    return `<article class="beitrag"${istDe ? "" : ' lang="de"'}>
  <p class="wer"${istDe ? "" : ` lang="${T.lang}"`}>${e.autor.avatar ? `<img src="/social-media/${attr(e.autor.avatar)}" alt="" width="28" height="28" loading="lazy">` : ""}<span>${esc(e.autor.name)}</span><span>${platt}, ${datum}</span></p>
  <p class="text">${esc(e.text)}</p>
  <p class="klein"${istDe ? "" : ` lang="${T.lang}"`}><a href="/social-media/${attr(e.id)}/">${esc(T.beitragLink)}</a></p>
</article>`;
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
    <div class="angebote" role="list">${ANGEBOTE.map((a) => `<a class="angebot" role="listitem" href="${B}angebot/${a.slug}/"><span class="zeichen-gross">${zeichen(a.slug)}</span><h2>${esc(a.name)}</h2><p>${esc(a.kurz)}</p><span class="weiter">${esc(T.start.leistung)}</span></a>`).join("")}</div>
    <p class="einstieg-satz">${esc(SEITE.claimAlt)} ${esc(T.start.satz)}</p>
  </div>
</section>

<section class="buehne" data-aktuell="${erster.number}" aria-labelledby="feld-titel">
  <div class="spalte">
    <div class="abschnitt-kopf"><h2 id="feld-titel">${zeichen("zettel")}${esc(T.start.kasten)}</h2><p>${esc(T.start.kastenText)}</p><a class="weiter" href="${B}zettel/">${esc(T.start.alleZettel)}</a></div>
  </div>
  <div class="spalte sieben buehne-feld">
    <div class="buehne-satz s-3">
      <p class="klein kicker">${esc(T.start.kicker)}${feldHinweis(esc(T.start.kickerSatz))}</p>
      <p class="vorschau-titel"><span class="n">${esc(T.zettelN(erster.number))}</span><span class="t">${esc(erster.title)}</span></p>
      <p class="leitsatz">${esc(erster.bottom_line)}</p>
      <p class="woher knopfreihe"><a class="knopf voll lesen" href="${B}zettel/${erster.slug}/">${zeichen("lesen")}<span>${esc(T.zettelLesen)}</span></a><button class="knopf still nochmal" type="button">${zeichen("zufall")}${esc(T.nochEiner)}</button></p>
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
    ${DIALOG.wahlen.map((w) => `<div class="weg weg-${w.id}"><p>${esc(w.satz)}</p><ol>${w.weg.map(([h, t]) => `<li><a href="/${attr(h)}">${esc(t)}</a></li>`).join("")}</ol></div>`).join("\n    ")}
  </div>
</section>

<!-- Prüfraster (seit 21. Oktober 2026 statt «Denken»: die sieben Zyklen standen doppelt, der Zettelkasten hat oben seinen Abschnitt; die Raster hatten keinen Titel) -->
<section class="abschnitt" aria-labelledby="raster-titel">
  <div class="spalte">
    <div class="abschnitt-kopf"><h2 id="raster-titel">${zeichen("raster")}${esc(T.start.raster)}</h2><p>${esc(T.start.rasterText)}</p><a class="weiter" href="${B}raster/">${esc(T.start.alleRaster)}</a></div>
    <ul class="liste-linien">${RASTER.map((r) => `<li><a href="${B}raster/${r.slug}/"><span class="n">${zeichen(r.slug)}</span><span class="name">${esc(r.name)}</span><span class="pfeil">${esc(r.stand)}</span><span class="kurz">${esc(r.kurz)}</span></a></li>`).join("")}</ul>
  </div>
</section>

<section class="abschnitt" aria-labelledby="spielen-titel">
  <div class="spalte">
    <div class="abschnitt-kopf"><h2 id="spielen-titel">${zeichen("spielen")}${esc(T.start.spielen)}</h2><p>${esc(T.start.spielenText)}</p><a class="weiter" href="${B}apps/">${esc(T.start.alleApps)}</a></div>
    <div class="reihe zeilen">${APPS.map(appKachel).join("")}</div>
  </div>
</section>

<section class="abschnitt" aria-labelledby="werke-titel">
  <div class="spalte">
    <div class="abschnitt-kopf"><h2 id="werke-titel">${zeichen("werke")}${esc(T.start.werke)}</h2><p>${esc(echteWerke.length ? T.start.werkeText : T.start.werkeBald)}</p><a class="weiter" href="${B}werke/">${esc(echteWerke.length ? T.start.alleWerke : T.start.wasKommt)}</a></div>
    ${echteWerke.length ? `<div class="reihe zeilen">${echteWerke.map((w) => `<a class="stueck" href="${B}werke/#${w.slug}"><span class="bild"><img src="/art/bilder/${w.slug}-1-800.webp" alt="${attr(w.bilder[0].alt)}" loading="lazy" width="800" height="1067"></span><h3>${esc(w.titel)}</h3><p>${esc(w.technik)}, ${w.masse.b} × ${w.masse.h} cm</p></a>`).join("")}</div>` : ""}
  </div>
</section>

<section class="abschnitt" aria-labelledby="zuletzt-titel">
  <div class="spalte">
    <div class="abschnitt-kopf"><h2 id="zuletzt-titel">${zeichen("zuletzt")}${esc(T.start.zuletzt)}</h2><p>${esc(T.start.zuletztText)}${T.beitraegeDeutsch ? ` ${esc(T.beitraegeDeutsch)}` : ""}</p><a class="weiter" href="${B}zuletzt/">${esc(T.start.alleBeitraege)}</a></div>
    ${beitraege.eintraege.slice(-2).reverse().map(beitrag).join("")}
  </div>
</section>

<section class="abschnitt" aria-labelledby="liste-titel">
  <div class="spalte">
    <div class="liste-kasten" style="margin-top:0;border-top:0;padding-top:0">
      <h2 id="liste-titel">${esc(UEBER.liste.titel)}</h2>
      <p>${esc(UEBER.liste.text)}</p>
      <p class="knopfreihe"><a class="knopf" href="${attr(UEBER.liste.mailto)}">${esc(T.start.eintragen)}</a><a class="knopf still" href="${B}ueber/">${esc(T.start.ueberPerson)}</a></p>
    </div>
  </div>
</section>`;
    veroeffentliche({ pfad: "", titel: "ornament.cloud", beschreibung: SEITE.beschreibung, body, jsonld: [personLd()], module: ["tafeln-leben.js"], bildAlt: T.start.bildAlt });
  }

  /* ---------- Zettel ---------- */
  {
    const body = `
<section class="zettel-kopf">
  <div class="spalte">
    <h1 class="titel">${esc(T.kasten.titel)}<small>${esc(kasten.subtitle)}. ${esc(kasten.structure)}. ${esc(T.kasten.small)}</small></h1>
  </div>
</section>
<section class="buehne buehne-zettel" id="feld" data-aktuell="${zettel[0].number}" data-takt="0" aria-label="${attr(T.kasten.feldAria)}">
  <div class="spalte sieben buehne-feld">
    <div class="buehne-satz s-3">
      <p class="klein kicker">${feldHinweis(esc(T.kasten.kickerSatz))}</p>
      <p class="vorschau-titel"><span class="n">${esc(T.zettelN(zettel[0].number))}</span><span class="t">${esc(zettel[0].title)}</span></p>
      <p class="leitsatz">${esc(zettel[0].bottom_line)}</p>
      <p class="woher knopfreihe"><a class="knopf voll lesen" href="${B}zettel/${zettel[0].slug}/">${zeichen("lesen")}<span>${esc(T.zettelLesen)}</span></a><button class="knopf still nochmal" type="button">${zeichen("zufall")}${esc(T.nochEiner)}</button></p>
    </div>
    <div class="s-4">${feld({ gross: true, paare: indexPaare, still: true })}</div>
  </div>
  <script type="application/json" id="zettel-daten">${JSON.stringify(zettel.map((z) => ({ n: z.number, slug: z.slug, titel: z.title, leitsatz: z.bottom_line }))).replace(/</g, "\\u003c")}</script>
</section>
${kasten.cycles.map((c) => `<section class="zyklus" id="zyklus-${c.roman}" aria-labelledby="zyklus-${c.roman}-titel">
  <div class="spalte">
    <h2 id="zyklus-${c.roman}-titel"><span class="roemisch">${c.roman}</span>${esc(c.name)}</h2>
    <p>${esc(c.deck)}</p>
    <ul class="liste-linien">${c.stanzas.map((n) => zettel[n - 1]).map((z) => `<li><a href="${B}zettel/${z.slug}/"><span class="n">${z.number}</span><span class="name">${esc(z.title)}</span><span class="kurz">${esc(z.bottom_line)}</span></a></li>`).join("")}</ul>
  </div>
</section>`).join("\n")}
<section class="abschnitt"><div class="spalte"><p class="klein">${esc(T.kasten.ursprung)}<a href="${T.kasten.ursprungPfad}">zu-seiner-zeit</a>. ${esc(T.kasten.fassung(kasten.date))}</p></div></section>`;
    veroeffentliche({ pfad: "zettel/", aktiv: "zettel/", titel: T.kasten.seitenTitel, beschreibung: T.kasten.beschreibung(kasten), body, bildAlt: T.kasten.bildAlt });
  }

  for (const z of zettel) {
    const j = jevZettel(z.number);
    const res = resonanz(z);
    const nah = res.slice(0, 2);
    const naechster = zettel[z.number % 49], voriger = zettel[(z.number + 47) % 49];
    const faedenListe = [
      ...nah.map((r) => fZettel(r.z, T.zettel.nenntAuch(r.personen))),
      fZettel(naechster, T.zettel.naechster(naechster, naechster.cycle.roman !== z.cycle.roman)),
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
    <h2 id="verweise-titel">${esc(T.zettel.weiterdenken)}</h2>
    <ul>${z.references.map((r) => `<li><span class="gebiet">${esc(r.domain)}</span><span class="zitat">${esc(r.citation)}</span><span class="resonanz">${esc(r.resonance)}</span></li>`).join("")}</ul>
  </div>
</section>
<section class="spalte">
  <nav class="zettel-weiter" aria-label="${attr(T.zettel.blaettern)}"><a href="${B}zettel/${voriger.slug}/" rel="prev">← ${voriger.number} · ${esc(voriger.title)}</a><a href="${B}zettel/">${esc(T.zettel.dasFeld)}</a><a href="${B}zettel/${naechster.slug}/" rel="next">${naechster.number} · ${esc(naechster.title)} →</a></nav>
  ${teilen({ pfad: `zettel/${z.slug}/`, titel: T.zettel.teilenTitel(z), text: z.bottom_line, karte: `zettel-${z.slug}-karte.png` })}
  <p class="klein" style="margin-top:14px">${esc(T.zettel.derselbe)}<a href="${T.zettel.strophePfad(z.slug)}">${T.zettel.strophePfad(z.slug).replace(/^\/|\/$/g, "")}</a>.</p>
</section>
${faeden(faedenListe)}`;
    veroeffentliche({ pfad: `zettel/${z.slug}/`, aktiv: "zettel/", titel: T.zettel.seitenTitel(z), kopfTitel: T.zettel.kopfTitel(z), beschreibung: z.bottom_line.length >= 40 ? z.bottom_line : T.zettel.beschreibung(z), body, typ: "article",
      jsonld: [{ "@context": "https://schema.org", "@type": "CreativeWork", name: z.title, headline: z.title, abstract: z.bottom_line, text: z.text, position: z.number, inLanguage: T.inLanguage, author: { "@type": "Person", name: SEITE.person.name }, isPartOf: { "@type": "CreativeWorkSeries", name: "Zettelkasten", url: `${BASIS}${B}zettel/` }, url: `${BASIS}${B}zettel/${z.slug}/`, citation: z.references.map((r) => r.citation) }],
      bildAlt: T.zettel.bildAlt(z) });
  }

  /* ---------- Apps ---------- */
  {
    const gruppen = [...new Set(APPS.map((a) => a.gattung))];
    const body = `
<section class="stueck-kopf"><div class="spalte">
  <h1 class="titel">${esc(T.apps.titel)}<small>${esc(T.apps.small)}</small></h1>
</div></section>
${gruppen.map((g) => `<section class="abschnitt" aria-labelledby="g-${g.replace(/\W+/g, "-")}"><div class="spalte">
  <div class="abschnitt-kopf"><h2 id="g-${g.replace(/\W+/g, "-")}">${esc(g)}</h2></div>
  <div class="reihe zeilen">${APPS.filter((a) => a.gattung === g).map(appKachel).join("")}</div>
</div></section>`).join("\n")}
<section class="abschnitt" aria-labelledby="resultate-titel"><div class="spalte">
  <div class="abschnitt-kopf"><h2 id="resultate-titel">${esc(T.apps.ergebnis)}</h2><p>${esc(T.apps.ergebnisText)}</p></div>
  <!-- die vier gerechneten Filme klein nebeneinander (21. Oktober 2026, Rückmeldung: «schlecht lesbar, weil gross», und es fehlten die neu
       gerechneten Beispiele), die Beschreibung steht auf der Seite der App; darunter eine Konstellation und eine Übung -->
  <div class="galerie-filme">${["phorma-i", "phorma-ii", "phorma-iii", "the-fictory"].map((sl) => { const a = appVon(sl), b = filmVon(a); return b ? `<figure class="galerie-film">${video(b)}<figcaption class="klein"><a href="${B}apps/${a.slug}/">${esc(a.name)}</a></figcaption></figure>` : ""; }).join("")}</div>
  <div class="galerie">
    ${["orna", "omna-color"].map((sl) => { const a = appVon(sl); return `<div class="galerie-stueck"><p class="klein"><a href="${B}apps/${a.slug}/">${esc(a.name)}</a></p>${beispiele(a, { kurz: true })}</div>`; }).join("")}
  </div>
</div></section>
<section class="abschnitt"><div class="spalte"><p class="klein">${esc(T.apps.weitere)}<a href="/alpha/drittes-rad/">Das Dritte Rad</a>, <a href="/alpha/stadt/">Die Paradoxie der Stadt</a>, <a href="/alpha/sketchory/">Sketchory</a>, <a href="/alpha/aufnahme/">Aufnahme</a>.</p></div></section>`;
    veroeffentliche({ pfad: "apps/", aktiv: "apps/", titel: T.apps.seitenTitel, beschreibung: T.apps.beschreibung, body, bildAlt: T.apps.bildAlt });
  }
  for (const a of APPS) {
    const zs = zettelZu("app", a.slug, 3);
    const schwester = APPS.filter((x) => x.gattung === a.gattung && x.slug !== a.slug)[0];
    const bildUndVideo = APPS.find((x) => x.slug === "phorma-i").gattung;
    const body = `
<article class="stueck-kopf"><div class="spalte">
  <p class="gattung">${esc(a.gattung)}${a.werk ? esc(T.apps.zu(a.werk)) : ""}</p>
  <h1 class="titel" data-wort="${attr(a.name)}"><span class="zeichen-gross">${zeichen(a.zeichen)}</span>${esc(a.name)}</h1>
  <p class="lead">${esc(a.kurz)}</p>
  <p class="knopfreihe"><a class="knopf voll" href="${B}apps/${a.slug}/oeffnen/">${esc(T.apps.oeffnen(a.name))}</a>${a.app ? `<a class="knopf" href="/${attr(a.app)}${a.app.includes("?") ? "&amp;" : "?"}sprache=${sprache}">${esc(T.apps.installieren)}</a>` : ""}${a.feld ? `<a class="knopf still" href="${B}apps/${a.slug}/feld/">${esc(T.apps.feld)}</a>` : ""}</p>
  ${T.apps.deutsch ? `<p class="klein hinweis-sprache">${esc(T.apps.deutsch)}</p>` : ""}
  <figure class="stueck-bild quadrat">${appBild(a)}</figure>
  <div class="stueck-text"><p>${esc(a.text)}</p><p class="fuer">${esc(a.fuer)}</p></div>
</div></article>
<section class="abschnitt" aria-labelledby="beispiele-titel"><div class="spalte"><div class="abschnitt-kopf"><h2 id="beispiele-titel">${esc(T.apps.ergebnis)}</h2></div>
  <figure class="tafel-lebt" data-tafel="${a.slug}">${appBild(a)}<figcaption>${esc(a.bewegung)}</figcaption></figure>
  ${beispiele(a)}</div></section>
<section class="spalte">${teilen({ pfad: `apps/${a.slug}/`, titel: a.name, text: a.kurz })}</section>
${faeden([...zs.map((z) => fZettel(z)), fApp(schwester), fAngebot(angebotVon(a.gattung === bildUndVideo ? "produkte" : "vermittlung")), a.werk ? fRaster(rasterVon("nebeneinander-nacheinander")) : fAngebot(angebotVon("webdesign"))])}`;
    buehne({ pfad: `apps/${a.slug}/oeffnen/`, name: a.name, ziel: a.url, zurueck: `apps/${a.slug}/` });
    if (a.feld) buehne({ pfad: `apps/${a.slug}/feld/`, name: `${a.name} – ${T.buehne.feld}`, ziel: a.feld, zurueck: `apps/${a.slug}/` });
    veroeffentliche({ pfad: `apps/${a.slug}/`, aktiv: "apps/", titel: `${a.name} – ${a.kurz.replace(/\.$/, "")}`, beschreibung: beschreibung(a.text), body, bildAlt: a.bildAlt, module: ["tafeln-leben.js"],
      jsonld: [{ "@context": "https://schema.org", "@type": "SoftwareApplication", name: a.name, applicationCategory: "MultimediaApplication", operatingSystem: "Browser", url: `${BASIS}/${a.url}`, description: a.kurz, inLanguage: "de-CH", offers: { "@type": "Offer", price: "0", priceCurrency: "CHF" }, author: { "@type": "Person", name: SEITE.person.name } }] });
  }

  /* ---------- Raster ---------- */
  function quadrant(r) {
    if (!r.felder) return `<div class="quadrant-leer" aria-hidden="true">${T.raster.leer.map((f) => `<span>${esc(f)}</span>`).join("")}</div>`;
    return `<div class="quadrant" aria-label="${attr(T.raster.felderAria)}">
  <span class="y">${esc(r.achsen.y)} →</span>
  <div class="vier">${r.felder.flat().map((f, i) => `<span${r.betont && r.betont[0] * 2 + r.betont[1] === i ? ' class="betont"' : ""}>${esc(f)}</span>`).join("")}</div>
  <span class="x">${esc(r.achsen.x)} →</span>
</div>`;
  }
  {
    const body = `
<section class="stueck-kopf"><div class="spalte">
  <h1 class="titel">${esc(T.raster.titel)}<small>${esc(T.raster.small)}</small></h1>
</div></section>
<section class="abschnitt"><div class="spalte">
  <div class="reihe zeilen">${RASTER.map((r) => `<a class="stueck" href="${B}raster/${r.slug}/"><span class="bild quadrat">${appBild(r, ' loading="lazy"')}</span><h3>${zeichen(r.slug)}${esc(r.name)}</h3><p>${esc(r.kurz)} ${esc(r.fassung)}, ${esc(r.stand)}.</p></a>`).join("")}</div>
</div></section>`;
    veroeffentliche({ pfad: "raster/", aktiv: "raster/", titel: T.raster.seitenTitel, beschreibung: T.raster.beschreibung, body, bildAlt: T.raster.bildAlt });
  }
  for (const r of RASTER) {
    const zs = zettelZu("raster", r.slug, 3);
    const promptText = readFileSync(new URL(r.prompt, ROOT), "utf8");
    // Bedienung (20. Oktober 2026, «die Bedienung an den neuen, reduzierten Stil angepasst, analog zu den App-Beiträgen»): der Prompt wird hier kopiert, nicht heruntergeladen
    const body = `
<article class="stueck-kopf"><div class="spalte">
  <p class="gattung">${esc(T.raster.gattung)} · ${esc(r.fassung)} · ${esc(r.stand)}</p>
  <h1 class="titel"><span class="zeichen-gross">${zeichen(r.slug)}</span>${esc(r.name)}</h1>
  <p class="lead">${esc(r.kurz)}</p>
  <p class="knopfreihe"><button class="knopf voll prompt-kopieren" type="button" data-ziel="prompt-text">${esc(T.raster.kopieren)}</button><a class="knopf" href="/${attr(r.prompt)}">${esc(T.raster.lesen)}</a>${r.pdf ? `<a class="knopf" href="/${attr(r.pdf)}">${esc(T.raster.papier)}</a>` : ""}${r.raster ? `<a class="knopf" href="/${attr(r.raster)}">${esc(T.raster.text)}</a>` : ""}<a class="knopf still" href="/${attr(r.seite)}">${esc(T.raster.anleitung)}</a></p>
  ${T.raster.deutsch ? `<p class="klein hinweis-sprache">${esc(T.raster.deutsch)}</p>` : ""}
  <script type="text/plain" id="prompt-text">${promptText.replace(/<\/script/gi, "<\\/script")}</script>
  <div class="stueck-text"><p>${esc(r.text)}</p></div>
</div></article>
<section class="abschnitt" aria-labelledby="arbeit-titel"><div class="spalte">
  <div class="abschnitt-kopf"><h2 id="arbeit-titel">${esc(T.raster.soArbeitet)}</h2></div>
  <div class="raster-paar">
    <figure class="tafel-lebt" data-tafel="${r.slug}">${appBild(r)}<figcaption>${esc(r.bewegung)}</figcaption></figure>
    ${quadrant(r)}
  </div>
</div></section>
<section class="ablauf" aria-labelledby="ablauf-titel"><div class="spalte">
  <h2 id="ablauf-titel">${esc(T.raster.anwenden)}</h2>
  <ol>
    <li><span>${T.raster.schritt1(esc(r.fassung))}</span></li>
    <li><span>${T.raster.schritt2(esc(r.anwendung))}</span></li>
    <li><span>${T.raster.schritt3(esc(r.ergebnis))}</span></li>
  </ol>
</div></section>
<section class="spalte">${teilen({ pfad: `raster/${r.slug}/`, titel: r.name, text: r.kurz })}</section>
${faeden([...zs.map((z) => fZettel(z)), r.slug === "nebeneinander-nacheinander" ? fApp(appVon("orna")) : fApp(appVon("orma")), fAngebot(angebotVon("vermittlung")), fRaster(RASTER.find((x) => x.slug !== r.slug && x.stand === r.stand) || RASTER.find((x) => x.slug !== r.slug))])}`;
    veroeffentliche({ pfad: `raster/${r.slug}/`, aktiv: "raster/", titel: T.raster.einzelTitel(r.name), beschreibung: beschreibung(r.text), body, typ: "article", module: ["tafeln-leben.js"],
      jsonld: [{ "@context": "https://schema.org", "@type": "CreativeWork", name: r.name, description: r.kurz, url: `${BASIS}${B}raster/${r.slug}/`, author: { "@type": "Person", name: SEITE.person.name }, inLanguage: T.inLanguage }] });
  }

  /* ---------- Angebote ---------- */
  {
    const body = `
<section class="stueck-kopf"><div class="spalte">
  <h1 class="titel">${esc(T.angebot.titel)}<small>${esc(T.angebot.small)}</small></h1>
</div></section>
<section class="abschnitt"><div class="spalte">
  <ul class="liste-linien am-ende">${ANGEBOTE.map((a) => `<li><a href="${B}angebot/${a.slug}/"><span class="n">${zeichen(a.slug)}</span><span class="name">${esc(a.name)}</span><span class="pfeil">${esc(T.angebot.briefing)}</span><span class="kurz">${esc(a.kurz)} ${esc(a.fuer)}</span></a></li>`).join("")}</ul>
</div></section>`;
    veroeffentliche({ pfad: "angebot/", aktiv: "angebot/", titel: T.angebot.seitenTitel, beschreibung: T.angebot.beschreibung, body, bildAlt: T.angebot.bildAlt });
  }
  for (const [i, a] of ANGEBOTE.entries()) {
    const zs = zettelZu("angebot", a.slug, 3);
    const appTop = beste(Object.fromEntries(APPS.map((x) => [x.slug, zs.reduce((s, z) => s + (jevZettel(z.number).app?.[x.slug] || 0), 0)])))[0]?.k;
    const mailto = `mailto:${SEITE.person.mail}?subject=${encodeURIComponent(T.angebot.anfrage + a.name)}`;
    const body = `
<article class="stueck-kopf"><div class="spalte">
  <p class="gattung">${esc(T.angebot.leistung)}</p>
  <h1 class="titel"><span class="zeichen-gross">${zeichen(a.slug)}</span>${esc(a.name)}</h1>
  <p class="lead">${esc(a.kurz)}</p>
  <p class="knopfreihe"><a class="knopf voll" href="#briefing">${esc(T.angebot.beginnen)}</a><a class="knopf" href="${attr(mailto)}">${esc(T.angebot.schreiben)}</a></p>
  <div class="stueck-text"><p>${esc(a.text)}</p><p class="fuer">${esc(a.fuer)}</p></div>
  ${a.hinweis ? `<p class="hinweis">${esc(a.hinweis)}</p>` : ""}
</div></article>
<section class="ablauf" aria-labelledby="ablauf-titel"><div class="spalte">
  <h2 id="ablauf-titel">${esc(T.angebot.soGeht)}</h2>
  <ol>${a.ablauf.map((s) => `<li><span>${esc(s)}</span></li>`).join("")}</ol>
</div></section>
${a.referenzen ? `<section class="referenzen" aria-labelledby="ref-titel"><div class="spalte"><h2 id="ref-titel">${esc(T.angebot.referenzen)}</h2><ol class="jahre">${a.referenzen.map(([j, t]) => `<li><span class="jahr">${esc(j)}</span><span>${esc(t)}</span></li>`).join("")}</ol></div></section>` : ""}
<section class="briefing" id="briefing" aria-labelledby="briefing-titel"><div class="spalte">
  <h2 id="briefing-titel">${esc(T.angebot.dein)}</h2>
  <p>${esc(T.angebot.deinText)}</p>
  <form class="brief" data-angebot="${attr(a.name)}" data-anfrage="${attr(T.angebot.anfrage)}" data-leer="${attr(T.angebot.leer)}" action="mailto:${SEITE.person.mail}" method="get">
    ${a.dialog.map((d, di) => `<fieldset><legend>${esc(d.frage)}</legend><div class="chips">${d.wahlen.map((w, wi) => `<input type="radio" name="f${di}" id="f${di}-${wi}" value="${attr(w)}"><label class="chip" for="f${di}-${wi}">${esc(w)}</label>`).join("")}</div></fieldset>`).join("\n    ")}
    <output aria-live="polite">${esc(T.angebot.leer)}</output>
    <p class="knopfreihe"><a class="knopf voll brief-mail" href="${attr(mailto)}">${esc(T.angebot.mail)}</a><button class="knopf still brief-kopieren" type="button">${esc(T.angebot.kopieren)}</button></p>
    <p class="klein ohne">${esc(T.angebot.ohne)}</p>
  </form>
</div></section>
<section class="spalte">${teilen({ pfad: `angebot/${a.slug}/`, titel: `${a.name} – ${SEITE.person.name}`, text: a.kurz })}</section>
${faeden([...zs.map((z) => fZettel(z)), fApp(appVon(appTop)), fAngebot(ANGEBOTE[(i + 1) % ANGEBOTE.length])])}`;
    veroeffentliche({ pfad: `angebot/${a.slug}/`, aktiv: "angebot/", titel: `${a.name} – ${a.kurz.replace(/\.$/, "")}`, kopfTitel: T.angebot.kopfTitel(a.name), beschreibung: beschreibung(`${a.kurz} ${a.fuer}`), body,
      jsonld: [{ "@context": "https://schema.org", "@type": "Service", name: a.name, description: a.text, serviceType: a.name, areaServed: ["CH", "DE", "AT"], url: `${BASIS}${B}angebot/${a.slug}/`, provider: { "@type": "Person", name: SEITE.person.name, address: { "@type": "PostalAddress", addressLocality: "Kaiserstuhl", addressRegion: "AG", addressCountry: "CH" }, workLocation: ["Zürich", "Basel", "Aarau"] } }] });
  }

  /* ---------- Werke ---------- */
  // Nur Ankündigungen, keine Beispiele (Wunsch vom 20. Oktober 2026: «die Beispiel-Werke von der Seite Werke entfernen. Nur die Ankündigungen für
  // Prints und Originale, Im Raum, Editionen lassen»): Muster aus werke.json (muster: true) kommen nie in den Neubau; echte Werke erscheinen, sobald es sie gibt.
  {
    const ankuendigung = T.werke.ankuendigung ?? (werke.ankuendigung?.text || "").replace(/\s*Ein erstes Beispiel zeigt schon[^.]*\.\s*/, "");   // der Satz zum Beispiel gilt nur noch auf den /art/-Seiten der bisherigen Website
    const body = `
<section class="stueck-kopf"><div class="spalte">
  <h1 class="titel">${esc(T.werke.titel)}<small>${esc(T.werke.small)}</small></h1>
</div></section>
<section class="abschnitt" aria-labelledby="prints-titel"><div class="spalte">
  <div class="abschnitt-kopf"><h2 id="prints-titel">${esc(T.werke.prints)}</h2><p>${esc(ankuendigung)}</p></div>
  ${echteWerke.length ? `<div class="reihe zeilen">${echteWerke.map((w) => `<article class="werk" id="${w.slug}"><a href="/art/${w.slug}/"><span class="bild"><img src="/art/bilder/${w.slug}-1-800.webp" alt="${attr(w.bilder[0].alt)}" loading="lazy" width="800" height="1067"></span></a><h3>${esc(w.titel)}</h3><p class="klein">${esc(w.technik)}, ${w.masse.b} × ${w.masse.h} cm, ${esc(T.werke.auflage(w.auflage.gesamt))}</p><p class="preis">CHF ${w.preis}.–</p><p><a href="/art/${w.slug}/">${esc(T.werke.bestellen)}</a></p></article>`).join("")}</div>` : ""}
</div></section>
<section class="abschnitt" aria-labelledby="raum-titel"><div class="spalte">
  <div class="abschnitt-kopf"><h2 id="raum-titel">${esc(T.werke.raum)}</h2><p>${esc(T.werke.raumText)}</p></div>
</div></section>
<section class="abschnitt" aria-labelledby="editionen-titel"><div class="spalte">
  <div class="abschnitt-kopf"><h2 id="editionen-titel">${esc(T.werke.editionen)}</h2><p>${esc(T.werke.editionenText)}</p></div>
  <p class="knopfreihe"><a class="knopf" href="${attr(UEBER.liste.mailto)}">${esc(T.start.eintragen)}</a></p>
</div></section>
<section class="spalte">${teilen({ pfad: "werke/", titel: T.werke.teilenTitel, text: T.werke.teilenText })}</section>
${faeden([fZettel(zettel[30]), fZettel(zettel[33]), fAngebot(angebotVon("produkte")), fApp(appVon("phorma-ii"))])}`;
    veroeffentliche({ pfad: "werke/", aktiv: "werke/", titel: T.werke.seitenTitel, beschreibung: T.werke.beschreibung, body, bildAlt: T.werke.bildAlt });
  }

  /* ---------- Zuletzt ---------- */
  {
    const body = `
<section class="stueck-kopf"><div class="spalte">
  <h1 class="titel">${esc(T.zuletzt.titel)}<small>${esc(T.zuletzt.small)}${T.beitraegeDeutsch ? ` ${esc(T.beitraegeDeutsch)}` : ""}</small></h1>
</div></section>
<section class="abschnitt"><div class="spalte">
  ${beitraege.eintraege.slice().reverse().map(beitrag).join("")}
  <p class="klein" style="margin-top:18px">${esc(T.zuletzt.alle)}<a href="/social-media/">social-media</a>. ${esc(T.zuletzt.neues)}<a href="/social-media/feed.xml">RSS</a>.</p>
</div></section>
${faeden([fZettel(zettel[40]), fZettel(zettel[36]), fApp(appVon("orna"))])}`;
    veroeffentliche({ pfad: "zuletzt/", aktiv: "zuletzt/", titel: T.zuletzt.seitenTitel, beschreibung: T.zuletzt.beschreibung, body, bildAlt: T.zuletzt.bildAlt });
  }

  /* ---------- Über ---------- */
  {
    const body = `
<section class="stueck-kopf"><div class="spalte sieben">
  <div class="s-4">
    <h1 class="titel">${esc(SEITE.person.name)}<small>${esc(T.ueber.small)}</small></h1>
    <div class="ueber-text" style="margin-top:32px">${UEBER.text.map((t) => `<p>${esc(t)}</p>`).join("")}</div>
    <div class="hintergrund" id="hintergrund">
      <h2>${esc(UEBER.hintergrund.titel)}</h2>
      ${UEBER.hintergrund.text.map((t) => `<p>${esc(t)}</p>`).join("")}
    </div>
    <div class="liste-kasten"><h2>${esc(UEBER.liste.titel)}</h2><p>${esc(UEBER.liste.text)}</p><p class="knopfreihe"><a class="knopf" href="${attr(UEBER.liste.mailto)}">${esc(T.start.eintragen)}</a></p><p class="klein">${esc(T.ueber.austragen)}</p></div>
  </div>
  <div class="s-3" style="padding-top:12px">
    ${SIGNET_TAFEL.replace('class="tafel-lebt signet-tafel"', 'class="tafel-lebt signet-tafel ueber-signet"')}
    <address class="adresse">${esc(SEITE.person.name)}<br>${esc(SEITE.person.strasse)}<br>${esc(SEITE.person.plz)}<br><a href="mailto:${SEITE.person.mail}">${SEITE.person.mail}</a></address>
    <p class="klein" style="margin-top:18px"><a href="/impressum/">${esc(T.ueber.impressum)}</a></p>
    <div style="margin-top:32px">${feld({ klein: true, paare: startPaare.slice(0, 8) })}</div>
  </div>
</div></section>
<section class="spalte">${teilen({ pfad: "ueber/", titel: `${SEITE.person.name} – ornament.cloud`, text: T.ueber.teilenText })}</section>
${faeden([fAngebot(angebotVon("webdesign")), fAngebot(angebotVon("kuration")), fZettel(zettel[16]), fApp(appVon("orma"))])}`;
    veroeffentliche({ pfad: "ueber/", aktiv: "ueber/", module: ["tafeln-leben.js"], titel: T.ueber.seitenTitel(SEITE.person.name), beschreibung: T.ueber.beschreibung(SEITE.person.name), body, typ: "profile", jsonld: [personLd()], bildAlt: `${SEITE.person.name}` });
  }

  /* ---------- Werkstatt (nicht verlinkt, noindex; nur deutsch) ---------- */
  if (istDe) {
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
    veroeffentliche({ pfad: "werkstatt/", titel: "Werkstatt – Print on Demand", beschreibung: "Produkte aus dem Bestand für Print on Demand.", body, noindex: true, nurDe: true });
  }
}

bau("de");
bau("en");

/* ---------- Dateien, Sitemap ---------- */
copyFileSync(new URL("src/b/b.css", ROOT), new URL("b.css", AUS_DE));
copyFileSync(new URL("src/b/b.js", ROOT), new URL("b.js", AUS_DE));
copyFileSync(new URL("src/b/tafeln.mjs", ROOT), new URL("tafeln.mjs", AUS_DE));
writeFileSync(new URL("tafeln-leben.js", AUS_DE), readFileSync(new URL("src/b/tafeln-leben.js", ROOT), "utf8").replace('from "./tafeln.mjs"', `from "./tafeln.mjs?v=${V}"`));
mkdirSync(new URL("kacheln/", AUS_DE), { recursive: true });
writeFileSync(new URL("kacheln/liste.json", AUS_DE), JSON.stringify(kachelSeiten.de.concat(["werkstatt/"]), null, 1) + "\n");
mkdirSync(new URL("en/kacheln/", AUS_DE), { recursive: true });
writeFileSync(new URL("en/kacheln/liste.json", AUS_DE), JSON.stringify(kachelSeiten.en, null, 1) + "\n");

{
  const sm = new URL("sitemap.xml", ROOT);
  let xml = readFileSync(sm, "utf8");
  const block = `  <!-- B:START (erzeugt aus tools/build-b.mjs, der Neubau unter /b/ und /b/en/) -->\n${sitemapSeiten.map((p) => `  <url><loc>${BASIS}/${p}</loc><lastmod>${HEUTE}</lastmod></url>`).join("\n")}\n  <!-- B:END -->\n`;
  xml = /<!-- B:START/.test(xml) ? xml.replace(/  <!-- B:START[\s\S]*?<!-- B:END -->\n/, block) : xml.replace("</urlset>", block + "</urlset>");
  writeFileSync(sm, xml);
}
console.log(`${sitemapSeiten.length} Seiten unter b/ und b/en/ geschrieben${jev ? "" : " (ohne jev)"}`);
