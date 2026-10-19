// «Art» (seit 19. Oktober 2026) und OMNA COLOR als App (seit demselben Tag). node --test tests/art.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { bauen, chf, stand, mail, massstab, sitemapBlock } from "../tools/build-art.mjs";
import { bauen as omnaAbschrift } from "../tools/build-omna-app.mjs";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");
const daten = JSON.parse(lies("src/art/werke.json"));

test("Art: die Seiten entsprechen src/art/werke.json (sonst: node tools/build-art.mjs)", () => {
  for (const [p, html] of Object.entries(bauen())) assert.equal(lies(p), html, `veraltet: ${p}`);
  const block = sitemapBlock(bauen(), daten.stand);
  assert.ok(lies("sitemap.xml").includes(block), "der Block ART in der Sitemap ist aktuell");
});

test("Art: jedes Werk hat Titel, Art, Bild mit Beschreibung und Bilddateien; Gestaltung hat Leistungen", () => {
  const slugs = new Set();
  for (const w of daten.werke) {
    assert.ok(w.slug && !slugs.has(w.slug) && /^[a-z0-9-]+$/.test(w.slug), `${w.slug}: eindeutiger Slug`);
    slugs.add(w.slug);
    assert.ok(["original", "edition", "digital", "gestaltung"].includes(w.art), `${w.slug}: Art`);
    assert.ok(["verfuegbar", "reserviert", "verkauft"].includes(w.status), `${w.slug}: Stand`);
    if (w.art === "gestaltung") { assert.ok(w.leistungen?.length, `${w.slug}: Leistungen`); continue; }
    assert.ok(w.bilder?.length && w.bilder.every((b) => b.alt?.length > 20), `${w.slug}: Bild mit Beschreibung`);
    for (const g of [800, 1600]) assert.ok(existsSync(new URL(`art/bilder/${w.slug}-1-${g}.webp`, root)), `${w.slug}: Bild ${g} (tools/art-bilder.mjs)`);
    if (w.art === "edition") assert.ok(w.auflage && w.auflage.verfuegbar <= w.auflage.gesamt, `${w.slug}: Auflage`);
  }
});

test("Art: Preise in Franken mit Hochkomma, Stand in Worten (nie nur Farbe), Muster ehrlich gekennzeichnet", () => {
  assert.equal(chf(1400), "CHF 1’400.–");
  assert.equal(chf(48), "CHF 48.–");
  assert.deepEqual(stand({ art: "edition", status: "verfuegbar", auflage: { gesamt: 25, verfuegbar: 2 } }), ["Noch 2 von 25", "knapp"]);
  assert.deepEqual(stand({ art: "original", status: "verkauft" }), ["In Privatbesitz", "vergeben"]);
  assert.deepEqual(stand({ art: "edition", status: "verkauft" }), ["Vergriffen", "vergeben"]);
  const seiten = bauen();
  for (const w of daten.werke.filter((x) => x.art !== "gestaltung")) {
    const html = seiten[`art/${w.slug}/index.html`];
    assert.equal(html.includes('<meta name="robots" content="noindex">'), !!w.muster, `${w.slug}: Muster sind für Suchmaschinen gesperrt`);
    assert.equal(html.includes("Im Aufbau."), !!w.muster, `${w.slug}: Hinweis auf Muster`);
    assert.equal(html.includes("application/ld+json"), !w.muster, `${w.slug}: strukturierte Daten nur für echte Werke`);
    if (w.muster && w.status === "verfuegbar") assert.match(html, />Interesse melden</, `${w.slug}: Muster verkaufen nichts`);
  }
});

test("Art: Bestellen ohne Shop – eine fertige Mail mit Werk, Preis und den nötigen Angaben; Zahlungslinks nur, wo eingetragen", () => {
  const w = { slug: "x", titel: "Probe", art: "edition", serie: "Probe", jahr: 2026, technik: "Giclée", masse: { b: 30, h: 40 }, auflage: { gesamt: 10, verfuegbar: 4 }, preis: 240, status: "verfuegbar" };
  const m = decodeURIComponent(mail(daten, w));
  assert.ok(m.startsWith(`mailto:${daten.kontakt}?subject=Bestellung: Probe – CHF 240.–`));
  for (const z of ["Ich bestelle: Probe (2026)", "Preis: CHF 240.–", "Lieferadresse:", "QR-Rechnung", "fünf Tage für mich reserviert"]) assert.ok(m.includes(z), z);
  assert.ok(decodeURIComponent(mail(daten, { ...w, muster: true })).includes("subject=Interesse: Probe"));
  const seiten = bauen({ ...daten, werke: [{ ...w, bilder: [{ alt: "eine Probe für den Test der Bestellung" }], zahlungslink: "https://buy.stripe.com/test_123" }] }, {});
  assert.match(seiten["art/x/index.html"], /<a class="kaufen" href="https:\/\/buy\.stripe\.com\/test_123">Kaufen<\/a>\s*<a class="knopf-text" href="mailto:[^"]+">Lieber per Rechnung<\/a>/);
});

test("Art: nichts von fremden Servern, Apps über die Seite «Apps» (REGELN §11, §14), Massstab gezeichnet", () => {
  for (const [p, html] of Object.entries(bauen())) {
    assert.ok(!/(src|href)="(https?:)?\/\//.test(html.replace(/<!--[\s\S]*?-->/g, "").replace(/<link rel="canonical"[^>]*>/, "")), `${p}: nichts von aussen`);
    assert.ok(!/href="[^"]*alpha\/(?!drittes-rad\/")/.test(html), `${p}: kein Link in den Alpha-Bereich ausser der Navigation`);
  }
  assert.match(massstab({ b: 50, h: 70 }), /1,70 m/);
  assert.match(massstab({ b: 21, h: 29.7 }), /A4/);
  assert.equal(massstab(undefined), "");
  assert.match(lies("art/art.css"), /prefers-reduced-motion/);
});

test("OMNA COLOR als App: Manifest mit eigener Startadresse, Abschrift aktuell, Service Worker mit eigenem Cache, Symbole und App-Seite", () => {
  const m = JSON.parse(lies("alpha/omna-color/manifest.webmanifest"));
  assert.equal(m.start_url, "rad/");
  assert.equal(m.scope, "rad/");
  assert.equal(m.display, "standalone");
  for (const i of m.icons) assert.ok(existsSync(new URL(`alpha/omna-color/${i.src}`, root)), i.src);
  assert.equal(lies("alpha/omna-color/rad/index.html"), omnaAbschrift(lies("alpha/omna-color/index.html")), "veraltet (sonst: node tools/build-omna-app.mjs)");
  const sw = lies("alpha/omna-color/sw.js");
  assert.match(sw, /const CACHE = "omna-\d+";/);
  assert.match(sw, /k\.startsWith\("omna-"\)/, "räumt nur eigene Caches");
  const seite = lies("alpha/omna-color/index.html");
  assert.match(seite, /<link rel="manifest" href="manifest\.webmanifest">/);
  assert.match(seite, /<script type="module" src="pwa\.js\?v=\d+"><\/script>/);
  assert.match(seite, /id="installieren" hidden/);
  const app = lies("alpha/omna-color/app/index.html");
  assert.match(app, /<meta property="og:image" content="https:\/\/ornament\.cloud\/alpha\/omna-color\/app\/og-omna-color-app\.jpg">/);
  assert.ok(existsSync(new URL("alpha/omna-color/app/og-omna-color-app.jpg", root)));
  assert.match(app, /<a class="link" href="\.\.\/">Im Browser öffnen/);
  assert.ok(!/ictory/.test(app.replace(/<!--[\s\S]*?-->/g, "")), "keine Reste der Vorlage");
});
