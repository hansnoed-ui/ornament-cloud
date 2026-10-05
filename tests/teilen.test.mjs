// Teilen auf Social Media (Wunsch von Christian, 2. Oktober 2026; Masterprompts seit 3. Oktober): Startseite, Masterprompts und «Das Dritte Rad» tragen eine Vorschaukarte
// (Open Graph für Facebook, LinkedIn, WhatsApp, Messenger; X-Karte), Bilder 1200 × 630 unter absoluter Adresse. Erzeugt mit tools/start-og.mjs.
//   node --experimental-strip-types --no-warnings --test tests/teilen.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, statSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");
const SEITEN = [
  { datei: "index.html", url: "https://ornament.cloud/", titel: "Ornament Cloud", bild: "assets/og-ornament-cloud.png", art: "png", canonical: true },
  { datei: "masterprompts/index.html", url: "https://ornament.cloud/masterprompts/", titel: "Masterprompts", bild: "assets/og-masterprompts.png", art: "png", canonical: true },
  { datei: "alpha/drittes-rad/index.html", url: "https://ornament.cloud/alpha/drittes-rad/", titel: "Das Dritte Rad", bild: "alpha/drittes-rad/og-drittes-rad.jpg", art: "jpg", canonical: false },
];
/** alle meta-Angaben einer Seite: property oder name → content */
const metas = (html) => new Map([...html.matchAll(/<meta (?:property|name)="([^"]+)" content="([^"]*)">/g)].map((m) => [m[1], m[2]]));
/** Art, Breite und Höhe aus dem Kopf einer PNG- oder JPEG-Datei */
function bildmass(buf) {
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { art: "png", b: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = 2; i + 9 < buf.length;) {
      if (buf[i] !== 0xff) { i++; continue; }
      const t = buf[i + 1];
      if (t >= 0xc0 && t <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(t)) return { art: "jpg", h: buf.readUInt16BE(i + 5), b: buf.readUInt16BE(i + 7) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  throw new Error("weder PNG noch JPEG");
}

test("Teilen: Startseite und Das Dritte Rad tragen alle Angaben für die Vorschaukarte (Open Graph und X), mit absoluten Adressen", () => {
  for (const s of SEITEN) {
    const html = lies(s.datei), m = metas(html);
    assert.equal(m.get("og:type"), "website", `${s.datei}: og:type`);
    assert.equal(m.get("og:site_name"), "ornament.cloud", `${s.datei}: og:site_name`);
    assert.equal(m.get("og:locale"), "de_CH", `${s.datei}: og:locale`);
    assert.equal(m.get("og:url"), s.url, `${s.datei}: og:url`);
    assert.equal(m.get("og:title"), s.titel, `${s.datei}: og:title`);
    const beschreibung = m.get("og:description");
    assert.ok(beschreibung && beschreibung.length >= 40 && beschreibung.length <= 200, `${s.datei}: og:description, 40 bis 200 Zeichen (${beschreibung?.length})`);
    assert.equal(m.get("og:image"), `https://ornament.cloud/${s.bild}`, `${s.datei}: og:image, absolut`);
    assert.equal(m.get("og:image:width"), "1200"); assert.equal(m.get("og:image:height"), "630");
    assert.ok((m.get("og:image:alt") || "").length >= 40, `${s.datei}: og:image:alt beschreibt das Bild`);
    assert.equal(m.get("twitter:card"), "summary_large_image", `${s.datei}: grosse Karte auf X`);
    assert.equal(m.get("twitter:title"), s.titel, `${s.datei}: twitter:title`);
    assert.equal(m.get("twitter:description"), beschreibung, `${s.datei}: twitter:description wie og:description`);
    assert.equal(m.get("twitter:image"), m.get("og:image"), `${s.datei}: twitter:image wie og:image`);
    if (s.canonical) assert.ok(html.includes(`<link rel="canonical" href="${s.url}">`), `${s.datei}: canonical`);
    for (const [k, v] of m) assert.ok(!/<|>|"/.test(v), `${s.datei}: ${k} ohne Tags und Anführungszeichen`);
  }
});

test("Teilen: die Bilder gibt es, genau 1200 × 630, klein genug für WhatsApp (unter 300 KB)", () => {
  for (const s of SEITEN) {
    assert.ok(existsSync(new URL(s.bild, root)), `${s.bild} fehlt (sonst: NODE_PATH=$(npm root -g) node tools/start-og.mjs)`);
    const dm = bildmass(readFileSync(new URL(s.bild, root)));
    assert.equal(dm.art, s.art, `${s.bild}: Dateiart passt zur Endung`);
    assert.deepEqual([dm.b, dm.h], [1200, 630], `${s.bild}: Mass`);
    assert.ok(statSync(new URL(s.bild, root)).size < 300_000, `${s.bild}: ${statSync(new URL(s.bild, root)).size} Bytes, über 300 KB`);
  }
});

test("Teilen: die Startseite steht in der Sitemap, Das Dritte Rad nicht und bleibt für Suchmaschinen gesperrt (die Vorschau holen die Dienste trotzdem)", () => {
  const sitemap = lies("sitemap.xml");
  assert.ok(sitemap.includes("<loc>https://ornament.cloud/</loc>"));
  assert.ok(!sitemap.includes("drittes-rad"));
  assert.match(lies("alpha/drittes-rad/index.html"), /<meta name="robots" content="noindex/);
  assert.ok(!/Disallow/i.test(existsSync(new URL("robots.txt", root)) ? lies("robots.txt") : ""), "kein robots.txt, das die Dienste von der Vorschau aussperrt");
});

test("Teilen: tools/start-og.mjs erzeugt genau diese beiden Bilder und trägt den Satz der Startseite; README nennt es", () => {
  const erzeuger = lies("tools/start-og.mjs");
  for (const s of SEITEN) assert.ok(erzeuger.includes(s.bild.split("/").slice(-2).join("/")) || erzeuger.includes(s.bild.split("/").pop()), `${s.bild} im Erzeuger`);
  // der Satz steht seit dem 5. Oktober 2026 nicht mehr auf der Startseite, wohl aber in der Bildbeschreibung der Vorschaukarte und im Bild selbst
  const satz = lies("index.html").match(/<meta property="og:image:alt" content="[^"]*«([^»]+)»/)[1];
  assert.ok(erzeuger.includes(satz), `der Satz der Vorschaukarte («${satz}») steht im Bild; ändert er sich, Bild neu erzeugen`);
  assert.ok(erzeuger.includes("Das Dritte<br>Rad"), "der Titel des Rads steht im Bild");
  const readme = lies("README.md");
  assert.ok(readme.includes("tools/start-og.mjs") && readme.includes("og-ornament-cloud.png") && readme.includes("og-drittes-rad.jpg"), "README nennt Erzeuger und Bilder");
});
