// Struktur der Website (Neuordnung vom 2. Oktober 2026, Wunsch von Christian): Die Startseite trägt den Titel «Raumstellen, Zeitobjekte» und darunter das
// Stellenfeld, in die Seite eingebettet (kein Beitrag). Das Menü hat vier Wörter ohne Symbole und Animationen: Zettelkasten (führt direkt in den Zettelkasten),
// Apps (ORNA, ORMA), Masterprompts (die vier Prüfraster in der Reihenfolge der Alpha-Übersicht), Web (OMNA COLOR, Das Dritte Rad). Die Karten liegen auf den
// Seiten apps/, masterprompts/ und web/. News, Termine und Portfolio bleiben unter ihren Adressen, tragen das Menü und sind sonst nicht verlinkt.
//   node --experimental-strip-types --no-warnings --test tests/struktur.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");

const MENU = [["Zettelkasten", "zu-seiner-zeit/"], ["Apps", "apps/"], ["Masterprompts", "masterprompts/"], ["Web", "web/"]];
const ORNA = "portfolio/nebeneinander-nacheinander/";
// Seiten mit dem Menü → Eintrag, der aktiv ist ([Ordner, aria-current]); null: keiner (die Seite hängt an keinem Menüpunkt)
const MENUSEITEN = {
  "index.html": null,
  "news/index.html": null,
  "termine/index.html": null,
  "portfolio/index.html": null,
  "apps/index.html": ["apps/", "page"],
  "masterprompts/index.html": ["masterprompts/", "page"],
  "web/index.html": ["web/", "page"],
  [`${ORNA}index.html`]: ["apps/", "true"],           // ORNA gehört zu den Apps
  [`${ORNA}feld/index.html`]: ["apps/", "true"],
  [`${ORNA}app/index.html`]: ["apps/", "true"],       // die App-Seiten sind Abschriften, ihre Kopfzeile ist ausgeblendet
  [`${ORNA}app/feld/index.html`]: ["apps/", "true"],
};

function htmlSeiten(dir = root, skip = new Set(["node_modules", "dist", ".git", "src", "tests", "tools", "vendor"])) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => skip.has(e.name) || e.name.startsWith(".") ? []
    : e.isDirectory() ? htmlSeiten(new URL(e.name + "/", dir), skip) : e.name.endsWith(".html") ? [new URL(e.name, dir).pathname.slice(root.pathname.length)] : []);
}
const karten = (html) => [...html.matchAll(/<article class="card[^"]*">([\s\S]*?)<\/article>/g)].map((m) => ({
  titel: m[1].match(/<h2>([^<]+)<\/h2>/)[1],
  ziel: m[1].match(/<a class="link" href="([^"]+)"/)[1],
  tags: [...m[1].matchAll(/<li>([^<]+)<\/li>/g)].map((t) => t[1]),
  html: m[1],
}));
const jpegMass = (buf) => {            // Breite und Höhe aus dem ersten Rahmenkopf (SOF)
  let i = 2;
  while (i < buf.length) {
    const marker = buf[i + 1], laenge = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + laenge;
  }
  throw new Error("kein JPEG");
};

test("Menü: vier Wörter in fester Reihenfolge, ohne Symbole und Animationen, auf allen Seiten der Website; aktiv ist, wo man ist", () => {
  for (const [datei, aktiv] of Object.entries(MENUSEITEN)) {
    const html = lies(datei);
    const nav = html.match(/<nav class="menu" aria-label="Hauptmenü">([\s\S]*?)<\/nav>/);
    assert.ok(nav, `${datei}: Menü fehlt`);
    assert.ok(!/<svg|data-icon|menu-icon|menu-text|menu-sub|menu-title/.test(nav[1]), `${datei}: das Menü hat keine Symbole und keine Untertitel mehr`);
    const eintraege = [...nav[1].matchAll(/<a class="menu-item" href="([^"]+)"(?: aria-current="(page|true)")?>([^<]+)<\/a>/g)];
    assert.equal(eintraege.length, 4, `${datei}: vier Einträge`);
    assert.deepEqual(eintraege.map((e) => e[3]), MENU.map((m) => m[0]), `${datei}: Reihenfolge Zettelkasten, Apps, Masterprompts, Web`);
    for (const [i, e] of eintraege.entries()) {
      const ziel = new URL(e[1], new URL(datei, root));
      assert.equal(ziel.pathname, new URL(MENU[i][1], root).pathname, `${datei}: ${MENU[i][0]} führt nach ${MENU[i][1]}`);
      assert.ok(existsSync(new URL(MENU[i][1] + "index.html", root)), `${datei}: ${MENU[i][1]} gibt es`);
    }
    // genau der Eintrag der Seite ist aktiv (page: man ist auf der Seite, true: auf einer Seite darunter), sonst keiner
    assert.deepEqual(eintraege.map((e) => e[2] ?? null), MENU.map((m) => (aktiv && m[1] === aktiv[0] ? aktiv[1] : null)), `${datei}: aktiver Eintrag`);
  }
  // das Menü gibt es nur auf diesen Seiten (nicht auf Zettelkasten, Alpha, ORMA, Werken)
  const mitMenu = htmlSeiten().filter((p) => lies(p).includes('<nav class="menu"')).sort();
  assert.deepEqual(mitMenu, Object.keys(MENUSEITEN).sort(), "Seiten mit Menü");
});

test("Menü: Gestaltung ohne Symbole, in der serifenlosen Schrift der Seite (Wörter in einer Reihe, aktiver unterstrichen, auf dem Handy zwei mal zwei)", () => {
  const css = lies("styles.css");
  assert.ok(!/menu-icon|menu-sub|menu-text|menu-title/.test(css), "keine Regeln für Symbole und Untertitel des früheren Menüs");
  const regel = (sel) => css.match(new RegExp(`(?:^|\\n)${sel.replace(/[.[\]()*+?^$|\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
  assert.match(regel(".menu"), /display:\s*flex/);
  assert.match(regel(".menu"), /flex-wrap:\s*wrap/);
  // moderner (Wunsch von Christian, 2. Oktober 2026): serifenlos, in der Schrift der Seite wie die Buttons oben links, nicht mehr die Serife der Überschriften
  assert.match(regel(".menu-item"), /font-family:\s*var\(--font\)/, "Schrift der Seite");
  assert.doesNotMatch(regel(".menu-item"), /var\(--serif\)|Georgia|Times/, "keine Serife");
  assert.match(css, /--font:\s*system-ui[^;]*,\s*sans-serif;/, "die Schrift der Seite ist serifenlos (system-ui … sans-serif)");
  assert.match(regel(".menu-item"), /font-weight:\s*500/, "Gewicht 500");
  assert.match(regel(".menu-item"), /text-decoration:\s*none/);
  assert.ok(parseFloat(regel(".menu-item").match(/font-size:\s*([\d.]+)rem/)?.[1]) >= 1, "die Wörter des Menüs sind mindestens 1 rem gross");
  assert.match(css, /\.menu-item\[aria-current\][^{]*\{[^}]*border-bottom-color:\s*currentColor/, "aktiver Eintrag unterstrichen");
  assert.match(css, /@media \(max-width: 520px\)\s*\{\s*\.menu\s*\{[^}]*display:\s*grid[^}]*repeat\(2, max-content\)/, "Handy: zwei mal zwei");
});

test("Startseite: Titel «Raumstellen, Zeitobjekte», darunter der Satz und das Stellenfeld eingebettet; keine Karten und keine Rückmeldungen", () => {
  const html = lies("index.html").replace(/<!--[\s\S]*?-->/g, "");        // geprüft wird, was die Seite zeigt, nicht die Kommentare
  assert.match(html, /<h1>Raumstellen, Zeitobjekte<\/h1>/);
  assert.ok(!/<h1 class="sr-only">/.test(html), "der Titel ist sichtbar");
  const lead = html.match(/<p class="lead">\s*([^<]+?)\s*<\/p>/)[1];
  assert.equal(lead, "Beobachtung ist Anlass für Veränderungen in der Realität.", "der Satz steht weiter unter dem Titel (die Vorschaukarte trägt ihn)");
  const stelle = (s) => { const i = html.indexOf(s); assert.ok(i > 0, s); return i; };
  assert.ok(stelle("<h1>") < stelle('<p class="lead">') && stelle('<p class="lead">') < stelle('<figure class="stellenfeld">') && stelle('<figure class="stellenfeld">') < stelle("</main>"),
    "Reihenfolge: Titel, Satz, Stellenfeld, dann endet die Seite (sie hat nur noch den Fuss)");
  assert.deepEqual([...html.slice(stelle("<main"), stelle("</main>")).matchAll(/<(figure|section|article|div)\b/g)].map((m) => m[1]), ["figure"], "in main steht nur das Stellenfeld");
  const rahmen = html.match(/<figure class="stellenfeld">\s*<iframe ([^>]*)><\/iframe>/);
  assert.ok(rahmen, "das Stellenfeld ist ein iframe in einer figure, keine Karte");
  assert.match(rahmen[1], /src="werke\/stellenfeld\/"/);
  assert.match(rahmen[1], /title="Stellenfeld: [^"]+"/, "der Rahmen trägt einen Titel für Vorlesegeräte");
  assert.match(rahmen[1], /loading="lazy"/);
  assert.match(rahmen[1], /allow="fullscreen"/, "Vollbild im eingebetteten Stellenfeld");
  assert.match(html, /<a href="werke\/stellenfeld\/">Als eigene Seite öffnen<\/a>/);
  assert.ok(!/<article|class="card|<video|class="grid/.test(html), "keine Beiträge und keine Karten mehr auf der Startseite");
  assert.deepEqual([...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1]), [], "keine Überschriften unter dem Stellenfeld");
  assert.ok(!/href="(zu-seiner-zeit|alpha|portfolio)\//.test(html.replace(/<nav class="(seitenweg|menu)"[\s\S]*?<\/nav>/g, "")), "die Wege führen über Menü und Navigation, nicht über Karten");
  assert.deepEqual([...html.matchAll(/data-icon="([a-z]+)"/g)].map((m) => m[1]), ["wave"], "nur die Welle ist animiert");
});

test("Startseite: die Rückmeldungen (giscus) sind auf Wunsch von Christian weg, mit Skript und Gestaltung (2. Oktober 2026)", () => {
  const html = lies("index.html").replace(/<!--[\s\S]*?-->/g, "");        // was die Seite zeigt und lädt, nicht die Kommentare
  assert.ok(!/giscus|kommentare|rueckmeldung|Rückmeldung/i.test(html), "die Startseite spricht nirgends mehr von Rückmeldungen und lädt kein Skript dafür");
  assert.ok(!existsSync(new URL("kommentare.js", root)), "kommentare.js ist gelöscht");
  assert.ok(!/\.rueckmeldung|\.kommentare|giscus/i.test(lies("styles.css")), "keine Regeln mehr für die Rückmeldungen");
  assert.deepEqual([...html.matchAll(/<script\b[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1].replace(/\?.*$/, "")), ["icons.js", "vendor/goatcounter/count.js"], "nur die Skripte der Wellenzeichnung und der Besuchsstatistik");
  assert.ok(!/^- `kommentare\.js`/m.test(lies("README.md")), "die README führt kommentare.js nicht mehr als Datei auf");
});

test("Stellenfeld eingebettet: senkrechtes Wischen und das Mausrad blättern die Seite, Zoomen mit Strg, Pause ausserhalb des Bildes", () => {
  const seite = lies("werke/stellenfeld/index.html");
  assert.match(seite, /window\.self !== window\.top\) document\.documentElement\.classList\.add\('eingebettet'\)/, "Erkennung im Kopf, vor dem ersten Anstrich");
  assert.ok(seite.indexOf("classList.add('eingebettet')") < seite.indexOf("<style>"), "die Klasse steht vor dem Stylesheet");
  assert.match(seite, /\.eingebettet #stage canvas\{touch-action:pan-y\}/, "senkrecht blättert die Seite, waagrecht dreht die Kamera");
  assert.match(seite, /#stage canvas\{[^}]*touch-action:none/, "allein auf der Seite bleibt es bei none");
  assert.match(seite, /\.eingebettet:fullscreen #stage canvas\{touch-action:none\}/, "im Vollbild dreht jede Geste");
  assert.match(seite, /if \(eingebettet && !document\.fullscreenElement && !e\.ctrlKey && !e\.metaKey\) return;/, "Mausrad: eingebettet nur mit Strg zoomen");
  assert.match(seite, /if \(\(eingebettet && !document\.fullscreenElement\) \|\| \(e\.target && e\.target\.tagName === 'INPUT'\)\) return;/, "eingebettet keine Tastenkürzel (die Leertaste soll blättern), im Vollbild schon");
  assert.match(seite, /new IntersectionObserver/, "ausserhalb des Sichtbereichs rechnet die Szene nicht weiter");
  assert.match(seite, /if \(sichtbar\) requestAnimationFrame\(frame\); else laeuft = false;/);
});

const SEITEN = {
  apps: { titel: "Apps", karten: [["ORNA", "../portfolio/nebeneinander-nacheinander/"], ["ORMA", "../alpha/orma/"]] },
  masterprompts: { titel: "Masterprompts", karten: [] },     // die Reihenfolge kommt aus der Alpha-Übersicht, siehe unten
  web: { titel: "Web", karten: [["OMNA COLOR", "../alpha/omna-color/"], ["Das Dritte Rad", "../alpha/drittes-rad/"]] },
};

test("Apps, Masterprompts, Web: eigene Seiten mit Titel, Kopfzeile, Adresse und Eintrag in der Sitemap", () => {
  const sitemap = lies("sitemap.xml");
  const stand = (css) => [...new Set(css.map((m) => m[1]))];
  for (const [ordner, s] of Object.entries(SEITEN)) {
    const html = lies(`${ordner}/index.html`);
    assert.match(html, new RegExp(`<title>${s.titel} – Ornament Cloud</title>`));
    assert.match(html, new RegExp(`<h1>${s.titel}</h1>`));
    assert.match(html, /<p class="lead">[^<]{10,}<\/p>/);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://ornament\\.cloud/${ordner}/">`));
    assert.match(html, /<meta name="description" content="[^"]{20,}">/);
    assert.ok(sitemap.includes(`<loc>https://ornament.cloud/${ordner}/</loc>`), `${ordner}/ steht in der Sitemap`);
    assert.match(html, /<p class="back"><a href="\.\.\/">← Zur Startseite<\/a><\/p>/);
    assert.match(html, /<nav class="seitenweg" aria-label="Ornament Cloud">\s*<a href="\.\.\/" aria-current="true">Ornament Cloud<\/a>\s*<a href="\.\.\/alpha\/drittes-rad\/">Das Dritte Rad<\/a>\s*<\/nav>/);
    assert.ok(!/class="card--b|card--d|<video/.test(html));
    assert.equal(stand([...html.matchAll(/styles\.css\?v=(\d+)/g)]).length, 1);
  }
});

test("Apps: ORNA und ORMA als Beiträge, in dieser Reihenfolge, ORMA als Alpha gekennzeichnet", () => {
  const k = karten(lies("apps/index.html"));
  assert.deepEqual(k.map((x) => [x.titel, x.ziel]), SEITEN.apps.karten);
  assert.ok(k[1].tags.includes("Alpha") && !k[0].tags.includes("Alpha"));
  assert.ok(k.every((x) => /data-icon="rad"/.test(x.html)), "beide Karten zeigen das drehende Rad");
  assert.match(k[1].html, /class="thumb split-invert"/, "ORMA: vertikal geteilt, rechts invers (REGELN §14)");
});

test("Masterprompts: die vier Prüfraster als Beiträge, in der Reihenfolge der Alpha-Übersicht, alle als Alpha gekennzeichnet", () => {
  const reihe = [...lies("alpha/index.html").matchAll(/<a href="(pruefraster|verteilapparat|gesellschaftskonzepte|journalistische-texte)\/">/g)].map((m) => m[1]);
  assert.deepEqual(reihe, ["pruefraster", "verteilapparat", "gesellschaftskonzepte", "journalistische-texte"], "Reihenfolge der Alpha-Übersicht");
  const html = lies("masterprompts/index.html");
  const k = karten(html);
  assert.deepEqual(k.map((x) => x.ziel), reihe.map((r) => `../alpha/${r}/`));
  assert.deepEqual(k.map((x) => x.titel), ["Nebeneinander und Nacheinander", "Der Verteilapparat des Körpers", "Prüfraster für Gesellschaftskonzepte", "Prüfraster journalistischer Texte"]);
  assert.ok(k.every((x) => x.tags.includes("Alpha")), "alle vier als Alpha gekennzeichnet");
  assert.ok(k.slice(2).every((x) => x.tags.includes("In Arbeit")), "die beiden neueren sind in Arbeit (wie in der Alpha-Übersicht)");
  for (const x of k) assert.ok(existsSync(new URL(x.ziel.replace("../", "") + "index.html", root)), `${x.ziel} gibt es`);
  assert.match(html, /<section class="grid grid--stapel grid--paare"/, "vier Karten zwei mal zwei");
  assert.ok(k.every((x) => /<svg [^>]*role="img" aria-label="[^"]{20,}"/.test(x.html)), "jede Karte trägt eine gezeichnete Vorschau mit Beschreibung");
});

test("Web: OMNA COLOR und Das Dritte Rad als Beiträge mit Bild (4 : 5, dunkel), Alpha gekennzeichnet; die Bilder erzeugt tools/start-og.mjs", () => {
  const html = lies("web/index.html");
  const k = karten(html);
  assert.deepEqual(k.map((x) => [x.titel, x.ziel]), SEITEN.web.karten);
  assert.ok(k.every((x) => x.tags.includes("Alpha") && x.tags.includes("Prototyp")));
  const erzeuger = lies("tools/start-og.mjs");
  for (const [i, datei] of ["vorschau-omna-color.jpg", "vorschau-drittes-rad.jpg"].entries()) {
    assert.match(k[i].html, new RegExp(`<img src="\\.\\./assets/${datei}" alt="" width="640" height="800" loading="lazy">`));
    const bild = readFileSync(new URL(`assets/${datei}`, root));
    assert.deepEqual(bild.subarray(0, 3), Buffer.from([0xff, 0xd8, 0xff]), `${datei}: JPEG`);
    assert.deepEqual(jpegMass(bild), [640, 800], `${datei}: 640 × 800`);
    assert.ok(bild.length < 150_000, `${datei}: ${bild.length} Byte, unter 150 KB`);
    assert.ok(erzeuger.includes(datei), `tools/start-og.mjs erzeugt ${datei}`);
  }
});

test("Versionsmarken: styles.css und icons.js tragen auf allen Seiten dieselbe Marke, icons.js kennt nur Symbole, die es noch gibt", () => {
  const marken = (re, texte) => [...new Set(texte.flatMap((t) => [...t.matchAll(re)].map((m) => m[1])))];
  const dateien = [...htmlSeiten().filter((p) => !p.startsWith("zu-seiner-zeit/")), "tools/build-alpha-texte.ts", `${ORNA}sw.js`];
  const texte = dateien.map(lies);
  const css = marken(/styles\.css\?v=(\d+)/g, texte), js = marken(/icons\.js\?v=(\d+)/g, texte);
  assert.equal(css.length, 1, `styles.css: eine Marke, gefunden ${css}`);
  assert.equal(js.length, 1, `icons.js: eine Marke, gefunden ${js}`);
  const readme = lies("README.md");
  assert.ok(readme.includes(`zurzeit ${css[0]}`), `README nennt die Marke ${css[0]} («zurzeit ${css[0]}»)`);
  const icons = lies("icons.js");
  const bekannt = icons.match(/var FACTORY = \{([^}]*)\}/)[1].split(",").map((s) => s.split(":")[0].trim());
  assert.deepEqual(bekannt.sort(), ["inklusion", "prozess", "rad", "turm", "wave"], "reentry, zeit und stellen (frühere Menü-Symbole) sind entfernt");
  for (const p of htmlSeiten()) for (const m of lies(p).matchAll(/data-icon="([a-z]+)"/g)) assert.ok(bekannt.includes(m[1]), `${p}: Symbol «${m[1]}» gibt es nicht in icons.js`);
});

test("News, Termine und Portfolio: bleiben unter ihren Adressen (mit Menü, in der Sitemap), werden aber von keiner Seite verlinkt", () => {
  const sitemap = lies("sitemap.xml");
  const eigene = ["news/", "termine/", "portfolio/"];
  for (const o of eigene) {
    assert.ok(existsSync(new URL(o + "index.html", root)), `${o} gibt es weiter`);
    assert.ok(sitemap.includes(`<loc>https://ornament.cloud/${o}</loc>`), `${o} steht in der Sitemap`);
  }
  for (const p of htmlSeiten()) {
    for (const [, href] of lies(p).replace(/<!--[\s\S]*?-->/g, "").matchAll(/<a [^>]*href="([^"]+)"/g)) {
      if (/^[a-z]+:/i.test(href)) continue;
      const ziel = new URL(href, new URL(p, root)).pathname.slice(root.pathname.length);
      assert.ok(!eigene.includes(ziel), `${p} verlinkt ${ziel} (${href}); die drei Seiten stehen weder im Menü noch sonst irgendwo`);
    }
  }
});
