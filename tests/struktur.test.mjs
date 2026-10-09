// Struktur der Website (Neuordnung vom 2. Oktober 2026, Wunsch von Christian): Die Startseite trägt den Satz «Beobachtung ist Anlass …» (seit 3. Oktober 2026
// ohne den sichtbaren Titel «Raumstellen, Zeitobjekte», etwas grösser gesetzt) und darunter seit 4. Oktober 2026 OMNA COLOR zum direkten Spielen (eingebettet, kein Beitrag; das Stellenfeld ist ein Beitrag auf «Web»). Das Menü hat vier Wörter ohne Symbole und Animationen: Zettelkasten (führt direkt in den Zettelkasten),
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
  "web/poststrukturalismus/index.html": ["web/", "true"],
  "web/mensch-niklas/index.html": ["web/", "true"],          // die Videoseite «Mensch, Niklas!» (7. Oktober 2026)   // die Videoseite gehört zu «Web» (6. Oktober 2026)
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

test("Startseite: kein sichtbarer Titel und kein Satz, unter der Welle gleich OMNA COLOR zum Spielen eingebettet; keine Karten und keine Rückmeldungen", () => {
  const html = lies("index.html").replace(/<!--[\s\S]*?-->/g, "");        // geprüft wird, was die Seite zeigt, nicht die Kommentare
  // Wunsch vom 3. Oktober 2026: Titel «Raumstellen, Zeitobjekte» gestrichen; für Vorlesegeräte bleibt eine unsichtbare Überschrift
  assert.ok(!html.includes("Raumstellen, Zeitobjekte"), "der frühere Titel ist weg");
  assert.match(html, /<h1 class="sr-only">Ornament Cloud<\/h1>/);
  // Wunsch vom 5. Oktober 2026: auch der Satz «Beobachtung ist Anlass …» steht nicht mehr auf der Seite (er bleibt in Beschreibung und Vorschaukarte)
  assert.ok(!/<p class="lead/.test(html) && !/>\s*Beobachtung ist Anlass/.test(html), "kein Satz mehr unter der Welle");
  assert.ok(!lies("styles.css").includes(".lead--start"), "keine Regel mehr für den Satz");
  const stelle = (s) => { const i = html.indexOf(s); assert.ok(i > 0, s); return i; };
  assert.ok(stelle("<h1") < stelle('<figure class="omna">') && stelle('<figure class="omna">') < stelle("</main>"),
    "Reihenfolge: (unsichtbarer) Titel, OMNA COLOR, dann endet die Seite (sie hat nur noch den Fuss)");
  assert.deepEqual([...html.slice(stelle("<main"), stelle("</main>")).matchAll(/<(figure|section|article|div)\b/g)].map((m) => m[1]), ["figure", "figure"], "in main stehen OMNA COLOR und das Erklärvideo");
  // seit 5. Oktober 2026: unter OMNA COLOR, durch die Welle getrennt, das Erklärvideo zu ORNA (Quellcode src/videos/src/orna/)
  const unten = html.slice(stelle('<figure class="omna">'));
  assert.ok(unten.indexOf('<svg class="divider" data-icon="wave"') < unten.indexOf('<figure class="erklaervideo">'), "Welle, dann das Video");
  assert.match(html, /<video controls playsinline preload="none" poster="assets\/orna-erklaervideo\.jpg"[^>]*>\s*<source src="assets\/orna-erklaervideo\.mp4" type="video\/mp4">/, "das Video lädt erst beim Abspielen");
  for (const datei of ["assets/orna-erklaervideo.mp4", "assets/orna-erklaervideo.jpg"]) assert.ok(existsSync(new URL(datei, root)), datei);
  // Wunsch vom 5. Oktober 2026: im Fuss die Adresse für Fragen und Anmerkungen zur Website
  assert.match(html, /<footer class="site-footer">[\s\S]*<p>Fragen und Anmerkungen zur Website: <a href="mailto:hansnoed@gmail\.com">hansnoed@gmail\.com<\/a><\/p>[\s\S]*<\/footer>/, "Kontakt im Fuss");
  assert.match(lies("alpha/omna-color/index.html"), /\.eingebettet \.wheel \{ width: min\(100%, 420px, var\(--rad-max, 420px\)\); \}/, "eingebettet höchstens so gross wie auf der eigenen Seite");
  assert.match(html, /setProperty\("--rad-max"/, "die Startseite begrenzt das Rad auf die Fensterhöhe");
  // Wunsch vom 4. Oktober 2026: OMNA COLOR direkt zum Spielen (kein Bild, keine Vorschau), aus dem Alpha-Bereich eingebettet – freigegebene Ausnahme von REGELN §14
  const rahmen = html.match(/<figure class="omna">\s*<iframe ([^>]*)><\/iframe>/);
  assert.ok(rahmen, "OMNA COLOR ist ein iframe in einer figure, keine Karte");
  assert.match(rahmen[1], /src="alpha\/omna-color\/"/);
  assert.match(rahmen[1], /title="OMNA COLOR: [^"]+"/, "der Rahmen trägt einen Titel für Vorlesegeräte");
  assert.deepEqual([...html.matchAll(/<iframe [^>]*src="([^"]+)"/g)].map((m) => m[1]), ["alpha/omna-color/"], "genau diese eine Einbettung");
  assert.match(html, /Mehr dazu unter <a href="web\/">Web<\/a>/, "der Beitrag bleibt auf «Web»");
  assert.ok(!html.includes("stellenfeld"), "das Stellenfeld ist nicht mehr auf der Startseite");
  const omna = lies("alpha/omna-color/index.html");
  assert.match(omna, /if \(window\.self !== window\.top\) document\.documentElement\.classList\.add\('eingebettet'\)/, "OMNA COLOR erkennt die Einbettung");
  assert.ok(omna.indexOf("classList.add('eingebettet')") < omna.indexOf("<style>"), "vor dem ersten Anstrich");
  assert.match(omna, /\.eingebettet \.seitenweg \{ display: none; \}/, "eingebettet ohne Hauptlinks (die Startseite hat sie schon)");
  assert.match(omna, /\.eingebettet main \{ margin-top: 0; \}/, "eingebettet kein vh-Abstand (er hinge an der Höhe des Rahmens)");
  assert.match(html, /new ResizeObserver\(passe\)\.observe\(f\.contentDocument\.body\)/, "der Rahmen wächst mit dem Spiel");
  assert.ok(!/<article|class="card|class="grid/.test(html), "keine Beiträge und keine Karten auf der Startseite");
  // Seit dem 5. Oktober 2026 steht unter dem Fuss der Rückkanal (Anmeldung für die Mail); er ist das Einzige
  // ausserhalb von <main> und bringt die einzige Überschrift mit. Sonst bleibt die Seite ohne Überschriften.
  const ohneRueckkanal = html.replace(/<section class="rueckkanal[\s\S]*?<\/section>/, "");
  assert.deepEqual([...ohneRueckkanal.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1]), [], "ausser dem Rückkanal keine Überschriften");
  assert.equal([...html.matchAll(/<section class="rueckkanal/g)].length, 1, "der Rückkanal steht genau einmal");
  assert.ok(html.indexOf("</main>") < html.indexOf('<section class="rueckkanal'), "der Rückkanal steht nach dem Inhalt, vor dem Fuss");
  assert.ok(!/href="(zu-seiner-zeit|alpha|portfolio)\//.test(html.replace(/<nav class="(seitenweg|menu)"[\s\S]*?<\/nav>/g, "")), "die Wege führen über Menü und Navigation, nicht über Karten");
  assert.deepEqual([...html.matchAll(/data-icon="([a-z]+)"/g)].map((m) => m[1]), ["wave", "wave"], "nur die Wellen sind animiert (unter dem Kopf und vor dem Video)");
});

test("Startseite: Startanimation (9. Oktober 2026) – Video hell und dunkel, nur auf dieser Seite, einmal pro Sitzung, nicht bei «weniger Bewegung», Überspringen, Notausgang", () => {
  const roh = lies("index.html");
  const html = roh.replace(/<!--[\s\S]*?-->/g, "");
  // Markup: gleich nach <body>, vor Kopf und Inhalt, ausserhalb von <main>; das Video hat keine Quelle im Markup (das Skript wählt hell oder dunkel)
  assert.match(html, /<body>\s*<div class="start" id="start">\s*<video muted playsinline preload="auto" aria-hidden="true" tabindex="-1" disablepictureinpicture disableremoteplayback><\/video>\s*<button class="start-weiter" type="button">Überspringen<\/button>\s*<\/div>\s*<header class="site-header">/);
  assert.ok(html.indexOf('id="start"') < html.indexOf("<main"), "die Startanimation liegt vor dem Inhalt");
  // Dateien: hell und dunkel, quadratisch, ohne Ton
  for (const d of ["assets/start-animation.mp4", "assets/start-animation-dunkel.mp4"]) {
    assert.ok(existsSync(new URL(d, root)), d);
    assert.ok(readFileSync(new URL(d, root)).length < 5_000_000, `${d} bleibt unter 5 MB (es lädt vor der Seite)`);
    assert.match(html, new RegExp(d.replace(/[.-]/g, "\\$&") + "\\?v=\\d+"), `${d} trägt eine Marke ?v=`);
  }
  // Kopf: die Klasse start-an kommt vor dem ersten Anstrich; Bedingungen: einmal pro Sitzung (sessionStorage), nicht bei «weniger Bewegung», nicht bei «Daten sparen», Vorschau mit ?start
  const kopf = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));
  assert.match(kopf, /sessionStorage\.getItem\("start-animation"\) === "1"/);
  assert.match(kopf, /prefers-reduced-motion: reduce/);
  assert.match(kopf, /navigator\.connection && navigator\.connection\.saveData/);
  assert.match(kopf, /\/\[\?&\]start\(=\|&\|#\|\$\)\/\.test\(location\.search\)/, "?start spielt sie noch einmal");
  assert.match(kopf, /classList\.add\("start-an"\)/);
  // Gestaltung: ohne Skript nie sichtbar; deckt die ganze Seite; blendet aus; fällt das Skript aus, gibt die Seite sich nach 45 Sekunden selbst frei
  assert.match(kopf, /\.start \{ display: none; \}/);
  assert.match(kopf, /html\.start-an \.start \{[^}]*position: fixed; inset: 0;[^}]*background: var\(--bg\);/);
  assert.match(kopf, /html\.start-an \.start\.start-weg \{ opacity: 0; pointer-events: none; \}/);
  assert.match(kopf, /animation: start-notaus 0s linear 45s forwards/);
  assert.match(kopf, /@keyframes start-notaus \{ to \{ visibility: hidden; pointer-events: none; \} \}/);
  assert.match(kopf, /\.start video \{[^}]*aspect-ratio: 1 \/ 1;/, "das Video ist quadratisch");
  assert.ok(!lies("styles.css").includes(".start-weiter"), "die Gestaltung steht in der Startseite, styles.css (?v=) bleibt unberührt");
  // Skript: Video nach Farbschema, Ende, Fehler, Hängen, Tippen, Taste, Knopf; die Seite darunter ist währenddessen inert
  const skript = html.slice(html.indexOf('var d = document.documentElement, el = document.getElementById("start")'));
  assert.match(skript, /matchMedia\("\(prefers-color-scheme: dark\)"\)\.matches/);
  assert.match(skript, /v\.src = dunkel \? "assets\/start-animation-dunkel\.mp4\?v=\d+" : "assets\/start-animation\.mp4\?v=\d+"/);
  for (const ereignis of ['v.addEventListener("ended", weg)', 'v.addEventListener("error", weg)', 'el.addEventListener("pointerdown", weg)', 'knopf.addEventListener("click", weg)', 'addEventListener("keydown", weg, { once: true })']) assert.ok(skript.includes(ereignis), ereignis);
  assert.match(skript, /p\.catch\(weg\)/, "lässt der Browser das Video nicht von selbst spielen, kommt die Seite sofort");
  assert.match(skript, /setTimeout\(weg, 6000\)/, "bleibt das Video hängen, kommt die Seite nach sechs Sekunden");
  assert.match(skript, /k\.inert = true/);
  assert.match(skript, /k\.inert = false/);
  assert.ok(!skript.includes(".focus("), "kein erzwungener Fokus (er zeigte einen Ring auf dem Handy)");
  // Die Videos kommen aus src/videos (Composition StartAnimation, hell und dunkel; die Zeichen in 11 statt 17 Sekunden wie im Video «wachstum», ohne Signet, die Zeichen blenden am Ende aus)
  const root_ = lies("src/videos/src/Root.tsx");
  assert.match(root_, /<Composition id="StartAnimation" /);
  assert.match(root_, /<Composition id="StartAnimationDunkel" [^>]*defaultProps=\{\{ dunkel: true \}\}/);
  assert.match(lies("src/videos/src/wachstum/Video.tsx"), /const DAUER_START = 330;[\s\S]*export const TEMPO_START = T\.buchstabenLaenge \/ DAUER_START;/, "11 Sekunden (330 Bilder), dieselben Rechenschritte wie das Video «wachstum»");
  assert.match(lies("src/videos/src/wachstum/Video.tsx"), /const AUS_START = 20;[\s\S]*aus=\{AUS_START\}/, "die letzten 20 Bilder blenden die Zeichen aus");
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
  web: { titel: "Web", karten: [["Mensch, Niklas!", "mensch-niklas/"], ["Liebling, ich habe den Poststrukturalismus strukturiert", "poststrukturalismus/"], ["OMNA COLOR", "../alpha/omna-color/"], ["Das Dritte Rad", "../alpha/drittes-rad/"], ["Stellenfeld", "../werke/stellenfeld/"]] },
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
    assert.ok(!/class="card--b|card--d/.test(html) && (ordner === "web" || !/<video/.test(html)), "Videos nur auf «Web»");
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

test("Web: zuoberst «Mensch, Niklas!», dann das Comic-Video «Liebling …», OMNA COLOR und Das Dritte Rad (Alpha) und das Stellenfeld, alle als Beiträge mit Bild (4 : 5); die Bilder der drei Werke erzeugt tools/start-og.mjs", () => {
  const html = lies("web/index.html");
  const alle = karten(html);
  assert.deepEqual(alle.map((x) => [x.titel, x.ziel]), SEITEN.web.karten);
  // das Comic-Video (6. Oktober 2026): zuoberst, klickbar mit Vorschaubild, führt auf die eigene Videoseite und verlinkt die Studie als PDF
  const [m, v, ...k] = alle;
  // «Mensch, Niklas!» (7. Oktober 2026): ganz zuoberst, klickbar mit Vorschaubild, führt nur auf die eigene Videoseite
  assert.match(m.html, /<a class="thumb" href="mensch-niklas\/" tabindex="-1" aria-hidden="true">\s*<img src="\.\.\/assets\/vorschau-mensch-niklas\.jpg" alt="" width="640" height="800" loading="lazy">/);
  assert.deepEqual([...m.html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((x) => x[1]), ["mensch-niklas/", "mensch-niklas/"], "Bild und «Öffnen»");
  const vorschauMensch = readFileSync(new URL("assets/vorschau-mensch-niklas.jpg", root));
  assert.deepEqual(jpegMass(vorschauMensch), [640, 800], "Vorschaubild 640 × 800");
  assert.ok(vorschauMensch.length < 150_000, `Vorschaubild ${vorschauMensch.length} Byte, unter 150 KB`);
  assert.match(v.html, /<a class="thumb" href="poststrukturalismus\/" tabindex="-1" aria-hidden="true">\s*<img src="\.\.\/assets\/vorschau-poststrukturalismus\.jpg" alt="" width="640" height="800" loading="lazy">/, "das Vorschaubild führt auf die Videoseite");
  assert.deepEqual([...v.html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]), ["poststrukturalismus/", "poststrukturalismus/", "../alpha/poststrukturalismus-doppelpruefung.pdf"], "Bild, «Öffnen» und die Studie als PDF");
  assert.ok(!/<video/.test(html), "auf «Web» selbst läuft kein Video mehr, es spielt auf der Videoseite");
  const vorschau = readFileSync(new URL("assets/vorschau-poststrukturalismus.jpg", root));
  assert.deepEqual(jpegMass(vorschau), [640, 800], "Vorschaubild 640 × 800");
  assert.ok(vorschau.length < 150_000, `Vorschaubild ${vorschau.length} Byte, unter 150 KB`);
  assert.ok(k.slice(0, 2).every((x) => x.tags.includes("Alpha") && x.tags.includes("Prototyp")), "die beiden Räder sind Alpha");
  assert.ok(!k[2].tags.includes("Alpha"), "das Stellenfeld liegt nicht im Alpha-Bereich");
  const erzeuger = lies("tools/start-og.mjs");
  for (const [i, datei] of ["vorschau-omna-color.jpg", "vorschau-drittes-rad.jpg", "vorschau-stellenfeld.jpg"].entries()) {
    assert.match(k[i].html, new RegExp(`<img src="\\.\\./assets/${datei}" alt="" width="640" height="800" loading="lazy">`));
    const bild = readFileSync(new URL(`assets/${datei}`, root));
    assert.deepEqual(bild.subarray(0, 3), Buffer.from([0xff, 0xd8, 0xff]), `${datei}: JPEG`);
    assert.deepEqual(jpegMass(bild), [640, 800], `${datei}: 640 × 800`);
    assert.ok(bild.length < 150_000, `${datei}: ${bild.length} Byte, unter 150 KB`);
    assert.ok(erzeuger.includes(datei), `tools/start-og.mjs erzeugt ${datei}`);
  }
});

test("Videoseite web/poststrukturalismus/: das Comic-Video (9 : 16) spielt von selbst, sobald es zur Hälfte im Bild ist; Link zur Studie als PDF und zurück zu «Web»", () => {
  const html = lies("web/poststrukturalismus/index.html");
  assert.match(html, /<title>Liebling, ich habe den Poststrukturalismus strukturiert – Ornament Cloud<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/ornament\.cloud\/web\/poststrukturalismus\/">/);
  assert.ok(lies("sitemap.xml").includes("<loc>https://ornament.cloud/web/poststrukturalismus/</loc>"), "in der Sitemap");
  assert.match(html, /<figure class="erklaervideo">\s*<video controls muted playsinline preload="none" poster="\.\.\/\.\.\/assets\/poststrukturalismus-9x16\.jpg" width="608" height="1080"[^>]*>\s*<source src="\.\.\/\.\.\/assets\/poststrukturalismus-9x16\.mp4" type="video\/mp4">/);
  for (const d of ["poststrukturalismus-9x16.mp4", "poststrukturalismus-9x16.jpg", "vorschau-poststrukturalismus.jpg"]) assert.ok(existsSync(new URL(`assets/${d}`, root)), d);
  assert.deepEqual(jpegMass(readFileSync(new URL("assets/poststrukturalismus-9x16.jpg", root))), [608, 1080], "Standbild 9 : 16");
  assert.ok(readFileSync(new URL("assets/poststrukturalismus-9x16.mp4", root)).length < 14_000_000, "Video unter 14 MB");
  assert.match(html, /new IntersectionObserver/, "Autoplay über IntersectionObserver");
  assert.match(html, /prefers-reduced-motion: reduce/, "bei «weniger Bewegung» nicht von selbst");
  assert.match(html, /<a href="\.\.\/\.\.\/alpha\/poststrukturalismus-doppelpruefung\.pdf">Studie als PDF<\/a>/);
  assert.ok(existsSync(new URL("alpha/poststrukturalismus-doppelpruefung.pdf", root)), "das PDF liegt im Alpha-Bereich");
  assert.match(html, /<p class="back"><a href="\.\.\/">← Zu Web<\/a><\/p>/);
});

test("Videoseite web/mensch-niklas/: «Mensch, Niklas!» (3 : 4) spielt von selbst, sobald es zur Hälfte im Bild ist; zurück zu «Web» (7. Oktober 2026)", () => {
  const html = lies("web/mensch-niklas/index.html");
  assert.match(html, /<title>Mensch, Niklas! – Ornament Cloud<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/ornament\.cloud\/web\/mensch-niklas\/">/);
  assert.ok(lies("sitemap.xml").includes("<loc>https://ornament.cloud/web/mensch-niklas/</loc>"), "in der Sitemap");
  assert.match(html, /<figure class="erklaervideo erklaervideo--34">\s*<video controls muted playsinline preload="none" poster="\.\.\/\.\.\/assets\/mensch-niklas-3x4\.jpg" width="810" height="1080"[^>]*>\s*<source src="\.\.\/\.\.\/assets\/mensch-niklas-3x4\.mp4" type="video\/mp4">/);
  assert.deepEqual(jpegMass(readFileSync(new URL("assets/mensch-niklas-3x4.jpg", root))), [810, 1080], "Standbild 3 : 4");
  assert.ok(readFileSync(new URL("assets/mensch-niklas-3x4.mp4", root)).length < 14_000_000, "Video unter 14 MB");
  // Englische Fassung darunter (7. Oktober 2026): eigenes Video und Standbild, ebenfalls 3 : 4
  assert.match(html, /<figure class="erklaervideo erklaervideo--34" lang="en">\s*<video controls muted playsinline preload="none" poster="\.\.\/\.\.\/assets\/mensch-niklas-en-3x4\.jpg" width="810" height="1080"[^>]*>\s*<source src="\.\.\/\.\.\/assets\/mensch-niklas-en-3x4\.mp4" type="video\/mp4">/);
  assert.match(html, /<figcaption><strong>English version\.<\/strong>/);
  assert.deepEqual(jpegMass(readFileSync(new URL("assets/mensch-niklas-en-3x4.jpg", root))), [810, 1080], "englisches Standbild 3 : 4");
  assert.ok(readFileSync(new URL("assets/mensch-niklas-en-3x4.mp4", root)).length < 14_000_000, "englisches Video unter 14 MB");
  assert.match(html, /querySelectorAll\("\.erklaervideo video"\)/, "Autoplay für beide Videos");
  // Herunterladen (Wunsch vom 7. Oktober 2026): unter jedem Video ein Link auf dieselbe Datei
  assert.match(html, /<a href="\.\.\/\.\.\/assets\/mensch-niklas-3x4\.mp4" download="mensch-niklas\.mp4">Video herunterladen \(MP4\)<\/a>/);
  assert.match(html, /<a href="\.\.\/\.\.\/assets\/mensch-niklas-en-3x4\.mp4" download="mensch-niklas-english\.mp4">Download video \(MP4\)<\/a>/);
  // Spanische Fassung zuunterst (7. Oktober 2026), ebenfalls mit Download
  assert.match(html, /<figure class="erklaervideo erklaervideo--34" lang="es">\s*<video controls muted playsinline preload="none" poster="\.\.\/\.\.\/assets\/mensch-niklas-es-3x4\.jpg" width="810" height="1080"[^>]*>\s*<source src="\.\.\/\.\.\/assets\/mensch-niklas-es-3x4\.mp4" type="video\/mp4">/);
  assert.match(html, /<a href="\.\.\/\.\.\/assets\/mensch-niklas-es-3x4\.mp4" download="mensch-niklas-espanol\.mp4">Descargar vídeo \(MP4\)<\/a>/);
  assert.deepEqual(jpegMass(readFileSync(new URL("assets/mensch-niklas-es-3x4.jpg", root))), [810, 1080], "spanisches Standbild 3 : 4");
  assert.ok(readFileSync(new URL("assets/mensch-niklas-es-3x4.mp4", root)).length < 14_000_000, "spanisches Video unter 14 MB");
  assert.match(html, /new IntersectionObserver/, "Autoplay über IntersectionObserver");
  assert.match(html, /prefers-reduced-motion: reduce/, "bei «weniger Bewegung» nicht von selbst");
  assert.ok(!html.includes("/alpha/") || !/href="[^"]*alpha\/(?!drittes-rad)/.test(html), "verlinkt nichts im Alpha-Bereich ausser der Navigation");
  assert.match(html, /<p class="back"><a href="\.\.\/">← Zu Web<\/a><\/p>/);
  assert.match(lies("styles.css"), /\.erklaervideo--34 video \{[^}]*aspect-ratio: 3 \/ 4;/, "eigene Breite und Seitenverhältnis für 3 : 4");
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

test("Rückkanal: auf Startseite, Apps, Masterprompts, Web und News, zwischen Inhalt und Fuss, als mailto ohne Dienst (5. Oktober 2026)", () => {
  // Entscheid vom 5. Oktober 2026: kein Formular und kein fremder Dienst, sondern ein mailto-Link.
  // Beim Aufruf der Seite wird nichts von aussen geholt, beim Klick nichts an Dritte geschickt (REGELN §11).
  const mit = ["index.html", "apps/index.html", "masterprompts/index.html", "web/index.html", "news/index.html"];
  for (const seite of mit) {
    const html = lies(seite);
    const block = html.match(/<section class="rueckkanal[\s\S]*?<\/section>/);
    assert.ok(block, `${seite}: kein Rückkanal`);
    assert.equal([...html.matchAll(/<section class="rueckkanal/g)].length, 1, `${seite}: der Rückkanal steht genau einmal`);
    assert.ok(html.indexOf("</main>") < html.indexOf('<section class="rueckkanal'), `${seite}: der Rückkanal steht nach dem Inhalt`);
    assert.ok(html.indexOf('<section class="rueckkanal') < html.indexOf('<footer class="site-footer">'), `${seite}: und vor dem Fuss`);
    assert.match(block[0], /href="mailto:hansnoed@gmail\.com\?subject=Liste&amp;body=[^"]+"/, `${seite}: mailto mit Betreff und fertigem Text`);
    assert.ok(!/<form|<input|<button/.test(block[0]), `${seite}: kein Formular — der Entscheid war der mailto-Link`);
    assert.match(block[0], /<h2 id="rueckkanal-titel">Wenn etwas fertig ist, schreibe ich<\/h2>/, `${seite}: Überschrift`);
    assert.match(block[0], /aria-labelledby="rueckkanal-titel"/, `${seite}: der Abschnitt trägt seinen Namen für Vorlesegeräte`);
  }
  // Auf allen fünf Seiten derselbe Block, Zeichen für Zeichen
  const bloecke = new Set(mit.map((s) => lies(s).match(/<section class="rueckkanal[\s\S]*?<\/section>/)[0]));
  assert.equal(bloecke.size, 1, "der Rückkanal ist auf allen Seiten gleich");
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

test("Kontakt: «Fragen und Anmerkungen zur Website» unten auf allen Seiten mit Text (Wunsch vom 5. Oktober 2026), im Zettelkasten in allen drei Sprachen", () => {
  const MAIL = '<a href="mailto:hansnoed@gmail.com">hansnoed@gmail.com</a>';
  const seiten = ["index.html", "web/index.html", "web/poststrukturalismus/index.html", "web/mensch-niklas/index.html", "apps/index.html", "masterprompts/index.html", "news/index.html", "termine/index.html", "portfolio/index.html",
    "portfolio/nebeneinander-nacheinander/index.html", "portfolio/nebeneinander-nacheinander/feld/index.html",
    "portfolio/nebeneinander-nacheinander/app/index.html", "portfolio/nebeneinander-nacheinander/app/feld/index.html",
    "alpha/index.html", "alpha/pruefraster/index.html", "alpha/verteilapparat/index.html", "alpha/gesellschaftskonzepte/index.html", "alpha/journalistische-texte/index.html"];
  for (const s of seiten) {
    const html = lies(s);
    assert.match(html, new RegExp(`</main>[\\s\\S]*<footer class="site-footer">[\\s\\S]*<p>Fragen und Anmerkungen zur Website: ${MAIL.replace(/[.]/g, "\\.")}</p>[\\s\\S]*</footer>`), s);
  }
  const omna = lies("alpha/omna-color/index.html");
  assert.ok(omna.includes(`<footer class="kontakt">\n  <p>Fragen und Anmerkungen zur Website: ${MAIL}</p>`), "OMNA COLOR");
  assert.ok(omna.includes(".eingebettet .kontakt { display: none; }"), "OMNA COLOR eingebettet ohne Kontakt (die Startseite hat ihn im Fuss)");
  for (const [s, satz] of [["zu-seiner-zeit/index.html", "Fragen und Anmerkungen zur Website"], ["zu-seiner-zeit/en/index.html", "Questions and comments about the website"], ["zu-seiner-zeit/es/spur/index.html", "Preguntas y comentarios sobre el sitio web"]]) {
    assert.ok(lies(s).includes(`<footer class="zsz-fuss">`) && lies(s).includes(`<p>${satz}: ${MAIL}</p>`), s);
  }
});

test("OMNA COLOR: Rad im Entwurf A (6. Oktober 2026) – ohne Papierring und Körnung, durchsichtige Fugen, Nadeln als Zeiger, eckige Knöpfe", () => {
  const html = lies("alpha/omna-color/index.html");
  assert.ok(!html.includes('id="grain"') && !html.includes("var(--paper2)"), "kein Papierring, keine Körnung");
  assert.match(html, /const FUGE = [\d.]+;/, "Felder mit gleich breiter, durchsichtiger Fuge");
  assert.match(html, /build\(\$\("outer"\), 66, 104\);[\s\S]*build\(\$\("inner"\), 30, 60\);/, "zwei Ringe mit Luft dazwischen");
  assert.equal([...html.matchAll(/<path class="tick" d="M 0 -\d+ V -\d+"/g)].length, 2, "zwei Nadeln als Zeiger");
  assert.match(html, /button\.go \{[^}]*border-radius: 5px;/, "«Drehen» eckig mit leicht gerundeten Ecken");
  assert.match(html, /\.again \{[^}]*border-radius: 5px;/, "«Noch einmal» ebenso");
});
