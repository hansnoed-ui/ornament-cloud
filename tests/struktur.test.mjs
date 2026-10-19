// Struktur der Website (Neuordnung vom 2. Oktober 2026, Wunsch von Christian): Die Startseite trägt den Satz «Beobachtung ist Anlass …» (seit 3. Oktober 2026
// ohne den sichtbaren Titel «Raumstellen, Zeitobjekte», etwas grösser gesetzt) und darunter seit 4. Oktober 2026 OMNA COLOR zum direkten Spielen (eingebettet, bis 9. Oktober 2026; seitdem Lead und drei Kästen; kein Beitrag; das Stellenfeld ist ein Beitrag auf «Web»). Das Menü hat vier Wörter ohne Symbole und Animationen: Zettelkasten (führt direkt in den Zettelkasten),
// Apps (ORNA, ORMA), Masterprompts (die vier Prüfraster in der Reihenfolge der Alpha-Übersicht), Web (OMNA COLOR, Das Dritte Rad). Die Karten liegen auf den
// Seiten apps/, masterprompts/ und web/. News, Termine und Portfolio bleiben unter ihren Adressen, tragen das Menü und sind sonst nicht verlinkt.
//   node --experimental-strip-types --no-warnings --test tests/struktur.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");

const MENU = [["Apps", "apps/"], ["Prompts", "masterprompts/"], ["Zettel", "zu-seiner-zeit/"], ["Social", "social-media/"], ["Art", "art/"]];   // seit 19. Oktober 2026 (abends) ohne «Web» (die Seite bleibt, nur nicht im Menü), dahinter «Art»;   // «Social» seit 19. Oktober 2026;   // seit 10. Oktober 2026 Kästchen mit Symbol (vorher die Wörter Zettelkasten, Apps, Masterprompts, Web)
const ORNA = "portfolio/nebeneinander-nacheinander/";
// Seiten mit dem Menü → Eintrag, der aktiv ist ([Ordner, aria-current]); null: keiner (die Seite hängt an keinem Menüpunkt)
const MENUSEITEN = {
  "index.html": null,
  "news/index.html": null,
  "termine/index.html": null,
  "portfolio/index.html": null,
  "apps/index.html": ["apps/", "page"],
  "masterprompts/index.html": ["masterprompts/", "page"],
  "web/index.html": null,                                   // «Web» ist seit dem 19. Oktober 2026 nicht mehr im Menü; die Seite und ihre Videoseiten bleiben unter ihren Adressen
  "web/orna-erklaervideo/index.html": null,
  "web/poststrukturalismus/index.html": null,
  "web/mensch-niklas/index.html": null,
  [`${ORNA}index.html`]: ["apps/", "true"],           // ORNA gehört zu den Apps
  [`${ORNA}feld/index.html`]: ["apps/", "true"],
  [`${ORNA}app/index.html`]: ["apps/", "true"],       // die App-Seiten sind Abschriften, ihre Kopfzeile ist ausgeblendet
  [`${ORNA}app/feld/index.html`]: ["apps/", "true"],
  "alpha/omna-color/index.html": ["apps/", "true"],         // OMNA COLOR ist seit dem 19. Oktober 2026 eine App auf «Apps» (vorher ein Beitrag auf «Web»)
  "alpha/omna-color/rad/index.html": ["apps/", "true"],     // die Seite der installierten App, eine Abschrift (tools/build-omna-app.mjs)
  "art/index.html": ["art/", "page"],                       // «Art» (19. Oktober 2026): Übersicht; Werkseiten und «Danke» darunter
  "zu-seiner-zeit/index.html": ["zu-seiner-zeit/", "page"],
  "social-media/index.html": ["social-media/", "page"],      // Social Media (19. Oktober 2026): die Zeitleiste; alle Seiten darunter (Zettel, Register, Redaktion) unter «Social»
};
// seit 18. Oktober 2026 steht das Menü auf allen Seiten mit Kopf (Wunsch: «das Menü müsste überall auf der Seite sichtbar sein, auch wenn man in den
// Beiträgen, Anwendungen etc. ist»): auch im Zettelkasten (jede Seite darin unter «Zettel»), auf den Alpha-Seiten und in OMNA COLOR – nur das Dritte Rad
// bleibt ohne (Entscheid: «Zettelkasten mit Menü, das Dritte Rad ohne»)
const aktivVon = (p) => (p in MENUSEITEN ? MENUSEITEN[p] : p.startsWith("zu-seiner-zeit/") ? ["zu-seiner-zeit/", "true"] : p.startsWith("social-media/") ? ["social-media/", "true"] : p.startsWith("art/") ? ["art/", "true"] : null);

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

test("Menü: fünf Kästchen mit Symbol und Namen (Apps, Prompts, Zettel, Social, Art; bis 19. Oktober 2026 mit Web statt Art) in fester Reihenfolge auf allen Seiten der Website; aktiv ist, wo man ist", () => {
  const mitKopf = htmlSeiten().filter((p) => lies(p).includes('<nav class="seitenweg"') && !p.startsWith("alpha/drittes-rad/")).sort();
  assert.ok(mitKopf.length > 580, `alle Seiten mit Kopf (${mitKopf.length})`);
  for (const datei of mitKopf) {
    const html = lies(datei), aktiv = aktivVon(datei);
    const nav = html.match(/<nav class="menu" aria-label="Hauptmenü">([\s\S]*?)<\/nav>/);
    assert.ok(nav, `${datei}: Menü fehlt`);
    // seit 10. Oktober 2026: die Welle direkt unter den beiden Hauptlinks, darunter das Menü
    assert.match(html, /<div class="topbar">\s*<nav class="seitenweg" aria-label="Ornament Cloud">[\s\S]*?<\/nav>\s*<svg class="divider" data-icon="wave" aria-hidden="true" preserveAspectRatio="none"><\/svg>\s*<nav class="menu"/, `${datei}: Hauptlinks, Welle, Menü`);
    assert.ok(!/data-icon|menu-sub|menu-title/.test(nav[1]), `${datei}: keine animierten Symbole, keine Untertitel`);
    const eintraege = [...nav[1].matchAll(/<a class="menu-item" href="([^"]+)"(?: aria-current="(page|true)")?>(<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">[\s\S]*?<\/svg>)<span>([^<]+)<\/span><\/a>/g)];
    assert.equal(eintraege.length, MENU.length, `${datei}: fünf Kästchen mit verborgenem Symbol und Namen`);
    assert.deepEqual(eintraege.map((e) => e[4]), MENU.map((m) => m[0]), `${datei}: Reihenfolge Apps, Prompts, Zettel, Social, Art (Web seit 19. Oktober 2026 nicht mehr im Menü, Art zuletzt)`);
    for (const [i, e] of eintraege.entries()) {
      const basis = html.match(/<base href="([^"]+)"/)?.[1], ziel = new URL(e[1], new URL(basis ?? "", new URL(datei, root)));   // die Werkbank steht mit <base href="../">
      assert.equal(ziel.pathname, new URL(MENU[i][1], root).pathname, `${datei}: ${MENU[i][0]} führt nach ${MENU[i][1]}`);
      assert.ok(existsSync(new URL(MENU[i][1] + "index.html", root)), `${datei}: ${MENU[i][1]} gibt es`);
    }
    // überall dieselben Symbole
    if (datei !== "index.html") assert.deepEqual(eintraege.map((e) => e[3]), [...lies("index.html").match(/<nav class="menu"[\s\S]*?<\/nav>/)[0].matchAll(/<svg[\s\S]*?<\/svg>/g)].map((m) => m[0]), `${datei}: dieselben Symbole wie auf der Startseite`);
    // genau der Eintrag der Seite ist aktiv (page: man ist auf der Seite, true: auf einer Seite darunter), sonst keiner
    assert.deepEqual(eintraege.map((e) => e[2] ?? null), MENU.map((m) => (aktiv && m[1] === aktiv[0] ? aktiv[1] : null)), `${datei}: aktiver Eintrag`);
  }
  // das Menü gibt es genau auf den Seiten mit Kopf (nicht im Dritten Rad, in ORMA, den Werken und den Anwendungen im Vollbild)
  assert.ok(!lies("alpha/drittes-rad/index.html").includes('<nav class="menu"'), "das Dritte Rad bleibt ohne Menü");
  const mitMenu = htmlSeiten().filter((p) => lies(p).includes('<nav class="menu"')).sort();
  assert.deepEqual(mitMenu, mitKopf, "Seiten mit Menü");
  for (const p of Object.keys(MENUSEITEN)) assert.ok(mitMenu.includes(p), `${p}: Menü`);
  // die Erzeuger und tools/kopfleiste-einsetzen.mjs holen das Menü aus tools/kopfleiste.mjs; kopfleiste.css hat dieselben Regeln wie styles.css
  const regel = (css, sel) => css.match(new RegExp(`\\n${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`))?.[1].trim();
  for (const sel of [".topbar", ".divider", ".divider .wave", ".menu", ".menu-item span", ".menu-item svg", ".menu-item svg *"])
    assert.equal(regel(lies("kopfleiste.css"), sel), regel(lies("styles.css"), sel), `kopfleiste.css: ${sel} wie in styles.css`);
});

test("Menü: Kästchen in der serifenlosen Schrift der Seite, fünf in einer Reihe (auch auf dem Handy), der aktive mit kräftigerem Rand", () => {
  const css = lies("styles.css");
  assert.ok(!/menu-icon|menu-sub|menu-text|menu-title/.test(css), "keine Regeln für das Menü vor dem 2. Oktober 2026");
  const regel = (sel) => css.match(new RegExp(`(?:^|\\n)${sel.replace(/[.[\]()*+?^$|\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
  assert.match(regel(".menu"), /display:\s*grid/);
  assert.match(regel(".menu"), /grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/, "fünf gleich breite Spalten, auf allen Breiten (seit 19. Oktober 2026)");
  assert.match(regel(".menu-item"), /font-family:\s*var\(--font\)/, "Schrift der Seite");
  assert.doesNotMatch(regel(".menu-item"), /var\(--serif\)|Georgia|Times/, "keine Serife");
  assert.match(css, /--font:\s*system-ui[^;]*,\s*sans-serif;/, "die Schrift der Seite ist serifenlos (system-ui … sans-serif)");
  assert.match(regel(".menu-item"), /font-weight:\s*500/, "Gewicht 500");
  assert.match(regel(".menu-item"), /text-decoration:\s*none/);
  assert.match(regel(".menu-item"), /border:\s*1px solid var\(--border\)/, "ein Kästchen mit feinem Rand");
  assert.match(css, /\.menu-item\[aria-current\]\s*\{[^}]*border-color:\s*var\(--text\)/, "aktiver Eintrag mit kräftigerem Rand");
  assert.ok(!/@media[^{]*\{\s*\.menu\s*\{[^}]*repeat\(2/.test(css), "auf dem Handy nicht mehr zwei mal zwei");
});

test("Startseite: kein sichtbarer Titel und kein Lead; sie führt zu einem zufälligen Zettel aus «Zu seiner Zeit» (seit 18. Oktober 2026, vorher OMNA COLOR zum Spielen); kein Video, keine Karten", async () => {
  const html = lies("index.html").replace(/<!--[\s\S]*?-->/g, "");        // geprüft wird, was die Seite zeigt, nicht die Kommentare
  // Wunsch vom 3. Oktober 2026: Titel «Raumstellen, Zeitobjekte» gestrichen; für Vorlesegeräte bleibt eine unsichtbare Überschrift
  assert.ok(!html.includes("Raumstellen, Zeitobjekte"), "der frühere Titel ist weg");
  assert.match(html, /<h1 class="sr-only">Ornament Cloud<\/h1>/);
  // Wunsch vom 5. Oktober 2026: auch der Satz «Beobachtung ist Anlass …» steht nicht mehr auf der Seite (er bleibt in Beschreibung und Vorschaukarte)
  assert.ok(!/>\s*Beobachtung ist Anlass/.test(html), "der frühere Satz steht nicht mehr auf der Seite");
  // Der Lead «Dreh- und Wendepunkte für Theorie und Praxis» (9. bis 10. Oktober 2026) ist auf Wunsch vom 10. Oktober 2026 wieder weg
  assert.ok(!/class="lead|Dreh- und Wendepunkte|\.lead--start/.test(html), "kein Lead auf der Startseite");
  assert.match(html, /<\/nav>\s*<\/div>\s*<h1 class="sr-only">Ornament Cloud<\/h1>\s*<\/div>\s*<\/header>/, "im Kopf nach dem Menü nur noch der unsichtbare Titel");
  // Die drei Kästen Apps, Prompts und Web standen vom 9. bis 10. Oktober 2026 unter dem Lead; seit dem 10. Oktober 2026 sind sie mit «Zettel» das Menü oben
  assert.ok(!/class="kaesten|class="kasten|\.kaesten \{/.test(html), "keine Kästen mehr unter dem Lead (sie sind jetzt das Menü)");
  const stelle = (s) => { const i = html.indexOf(s); assert.ok(i > 0, s); return i; };
  assert.ok(stelle('<nav class="menu"') < stelle("<h1") && stelle("<h1") < stelle("<main") && stelle("<main") < stelle("</main>"), "Reihenfolge: das Menü mit den Kästchen, (unsichtbarer) Titel, main");
  assert.deepEqual([...html.slice(stelle("<main"), stelle("</main>")).matchAll(/<(figure|section|article|div|iframe|video|nav)\b/g)].map((m) => m[1]), [], "in main nur der Hinweis für Besuche ohne Skript");
  // Wunsch vom 18. Oktober 2026: «nach diesem coolen Intro passt für mich die Startseite mit dem OMNA-COLOR-Rad nicht mehr. Deshalb möchte ich die Seite mit
  // dem Zettelkasten starten» – Entscheid: ein zufälliger Zettel; ohne Intro gleich (vor dem ersten Anstrich), mit Intro an dessen Ende
  const kopf = html.slice(html.indexOf("<head>"), html.indexOf("</head>"));
  assert.match(kopf, /window\.zumZettel = function \(\)/);
  assert.match(kopf, /if \(!document\.documentElement\.classList\.contains\("start-an"\) && zettelDa\(\)\) zumZettel\(\);/, "ohne Intro sofort");
  assert.match(kopf, /location\.replace\("zu-seiner-zeit\/strophe\/" \+ Z\[i\] \+ "\/"\)/, "ersetzt die Adresse (zurück führt nicht in eine Schleife)");
  assert.match(html, /function weg\(\) \{[\s\S]*?if \(window\.zumZettel && zettelDa\(\)\) \{ v\.pause\(\); zumZettel\(\); return; \}/, "das Ende des Intros führt zum Zettel");
  const { zettelListe } = await import(new URL("tools/build-zu-seiner-zeit.ts", root).href);
  const liste = kopf.match(/\/\* ZETTEL:START \*\/[\s\S]*?\/\* ZETTEL:END \*\//)[0];
  assert.equal(liste, zettelListe(), "die Liste ist die aktuelle (node --experimental-strip-types tools/build-zu-seiner-zeit.ts)");
  const slugs = JSON.parse(liste.replace(/\/\*[^*]*\*\//g, ""));
  assert.equal(slugs.length, 49);
  for (const z of slugs) assert.ok(existsSync(new URL(`zu-seiner-zeit/strophe/${z}/index.html`, root)), z);
  // Wunsch vom 9. Oktober 2026: das Erklärvideo zu ORNA (5. bis 9. Oktober 2026 auf der Startseite) ist von der Startseite weg und steht auf «Web» (web/orna-erklaervideo/);
  // die Startanimation (ausserhalb von main) hat ihr eigenes Video
  const inMain = html.slice(stelle("<main"), stelle("</main>"));
  assert.ok(!/<video|erklaervideo|orna-erklaervideo/.test(inMain), "kein Video in main");
  assert.ok(!html.includes("orna-erklaervideo"), "die Startseite verweist nicht mehr auf das Video");
  for (const datei of ["assets/orna-erklaervideo.mp4", "assets/orna-erklaervideo.jpg", "assets/vorschau-orna-erklaervideo.jpg"]) assert.ok(existsSync(new URL(datei, root)), `${datei} liegt weiter da (Videoseite und Karte auf «Web»)`);
  // Wunsch vom 9. Oktober 2026: der Link im Fuss («Präsentiert von ornament.cloud») führt zur Startseite, nicht zu «bisherige-projekte»
  assert.match(html, /<footer class="site-footer">[\s\S]*<p>Präsentiert von <a href="\.\/">ornament\.cloud<\/a> · © 2026<\/p>[\s\S]*<\/footer>/, "Fusslink zur Startseite");
  assert.ok(!html.includes("bisherige-projekte"), "kein Link mehr auf «bisherige-projekte»");
  // Wunsch vom 5. Oktober 2026: im Fuss die Adresse für Fragen und Anmerkungen zur Website
  assert.match(html, /<footer class="site-footer">[\s\S]*<p>Fragen und Anmerkungen zur Website: <a href="mailto:hansnoed@gmail\.com">hansnoed@gmail\.com<\/a><\/p>[\s\S]*<\/footer>/, "Kontakt im Fuss");
  assert.deepEqual([...html.matchAll(/<iframe [^>]*src="([^"]+)"/g)], [], "kein Rahmen mehr (OMNA COLOR stand vom 10. bis 18. Oktober 2026 hier)");
  assert.ok(!html.includes("stellenfeld"), "das Stellenfeld ist nicht auf der Startseite");
  assert.ok(existsSync(new URL("alpha/omna-color/index.html", root)) && lies("apps/index.html").includes('<h2>OMNA COLOR</h2>'), "OMNA COLOR bleibt unter seiner Adresse, seit 19. Oktober 2026 als App auf «Apps»");
  assert.ok(!/<article|class="card|class="grid/.test(html), "keine Beiträge und keine Karten auf der Startseite");
  // Seit dem 5. Oktober 2026 steht unter dem Fuss der Rückkanal (Anmeldung für die Mail); er ist das Einzige
  // ausserhalb von <main> und bringt die einzige Überschrift mit. Sonst bleibt die Seite ohne Überschriften.
  const ohneRueckkanal = html.replace(/<section class="rueckkanal[\s\S]*?<\/section>/, "");
  assert.deepEqual([...ohneRueckkanal.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1]), [], "ausser dem Rückkanal keine Überschriften");
  assert.equal([...html.matchAll(/<section class="rueckkanal/g)].length, 1, "der Rückkanal steht genau einmal");
  assert.ok(html.indexOf("</main>") < html.indexOf('<section class="rueckkanal'), "der Rückkanal steht nach dem Inhalt, vor dem Fuss");
  assert.deepEqual([...html.replace(/<nav class="(seitenweg|menu)"[\s\S]*?<\/nav>/g, "").matchAll(/href="((?:zu-seiner-zeit|alpha|portfolio)\/[^"]*)"/g)].map((m) => m[1]), ["zu-seiner-zeit/zufall/", "zu-seiner-zeit/"], "ausser Menü und Navigation nur der Hinweis ohne Skript");
  assert.deepEqual([...html.matchAll(/data-icon="([a-z]+)"/g)].map((m) => m[1]), ["wave"], "nur die Welle unter dem Kopf ist animiert");
});

test("Startseite: Startanimation (9. Oktober 2026; seit 18. Oktober 2026 die Irrfahrt aus PHORMA III) – ein Video auf Schwarz, Ton an/aus, nur auf dieser Seite, einmal pro Sitzung, nicht bei «weniger Bewegung», Überspringen, Notausgang", () => {
  const roh = lies("index.html");
  const html = roh.replace(/<!--[\s\S]*?-->/g, "");
  // Markup: gleich nach <body>, vor Kopf und Inhalt, ausserhalb von <main>; das Video hat keine Quelle im Markup (das Skript setzt sie, sonst lädt es ohne Skript)
  assert.match(html, /<body>\s*<div class="start" id="start">\s*<video muted playsinline preload="auto" aria-hidden="true" tabindex="-1" disablepictureinpicture disableremoteplayback><\/video>\s*<div class="start-knoepfe">\s*<button class="start-ton" type="button" aria-pressed="false">Ton an<\/button>\s*<button class="start-weiter" type="button" lang="en">Skip intro<\/button>\s*<\/div>\s*<\/div>\s*<header class="site-header">/);
  assert.ok(html.indexOf('id="start"') < html.indexOf("<main"), "die Startanimation liegt vor dem Inhalt");
  // Dateien: quer 16 : 9 (Laptop, Bildschirm) und hoch 4 : 5 (Telefon), mit Ton, in beiden Modi dasselbe; die früheren hellen und dunklen sind weg
  for (const d of ["assets/start-animation.mp4", "assets/start-animation-dunkel.mp4"]) assert.ok(!existsSync(new URL(d, root)), `${d} ist ersetzt`);
  for (const [d, mb] of [["assets/start-intro.mp4", 5], ["assets/start-intro-quer.mp4", 10]]) {
    assert.ok(existsSync(new URL(d, root)), d);
    assert.ok(readFileSync(new URL(d, root)).length < mb * 1e6, `${d} bleibt unter ${mb} MB (es lädt vor der Seite)`);
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
  assert.match(kopf, /html\.start-an \.start \{[^}]*position: fixed; inset: 0;[^}]*background: #000;/, "schwarz wie das Video, in beiden Modi");
  assert.match(kopf, /html\.start-an \.start\.start-weg \{ opacity: 0; pointer-events: none; \}/);
  assert.match(kopf, /animation: start-notaus 0s linear 45s forwards/);
  assert.match(kopf, /@keyframes start-notaus \{ to \{ visibility: hidden; pointer-events: none; \} \}/);
  assert.match(kopf, /\.start video \{[^}]*aspect-ratio: 4 \/ 5;/, "das Video ist 4 : 5");
  // die Knöpfe «Ton an» und «Skip intro» (englische Beschriftung, darum lang="en"): unten rechts, orange wie die dunkle Seite (#f08a5d, auf Schwarz lesbar), nur leicht gerundet, mindestens 44 px hoch
  assert.match(kopf, /\.start-knoepfe \{[^}]*right: max\(24px, env\(safe-area-inset-right\)\); bottom: max\(24px, env\(safe-area-inset-bottom\)\);/, "unten rechts");
  assert.match(kopf, /\.start-weiter, \.start-ton \{[^}]*min-height: 44px;/, "Tippfläche");
  assert.match(kopf, /\.start-weiter, \.start-ton \{[^}]*color: #f08a5d;[^}]*border: 1\.5px solid #f08a5d; border-radius: 6px;/, "orange, nur leicht gerundet (keine Pille)");
  assert.ok(!lies("styles.css").includes(".start-weiter"), "die Gestaltung steht in der Startseite, styles.css (?v=) bleibt unberührt");
  // Skript: Ende, Fehler, Hängen, Tippen (nicht auf «Ton an»), Taste, Knopf; der Ton schaltet stumm/laut; die Seite darunter ist währenddessen inert
  const skript = html.slice(html.indexOf('var d = document.documentElement, el = document.getElementById("start")'));
  assert.match(skript, /v\.src = matchMedia\("\(min-aspect-ratio: 1\/1\)"\)\.matches \? "assets\/start-intro-quer\.mp4\?v=\d+" : "assets\/start-intro\.mp4\?v=\d+"/, "quer die Fassung 16 : 9, hoch 4 : 5");
  for (const ereignis of ['v.addEventListener("ended", weg)', 'v.addEventListener("error", weg)', 'el.addEventListener("pointerdown", function (e) { if (!amTon(e)) weg(); })', 'knopf.addEventListener("click", weg)', 'removeEventListener("keydown", taste); weg();']) assert.ok(skript.includes(ereignis), ereignis);
  assert.match(skript, /v\.muted = !v\.muted;/, "Ton an und aus");
  assert.match(skript, /v\.muted = false; tonZeigen\(\);\s*var p = v\.play\(\);/, "zuerst mit Ton (Wunsch vom 20. Oktober 2026: «defaultmässig auf Ton an»)");
  assert.match(skript, /e\.name !== "NotAllowedError"\) \{ weg\(\); return; \}\s*v\.muted = true; tonZeigen\(\);/, "verweigert der Browser den Ton, stumm mit «Ton an»");
  assert.match(skript, /q\.catch\(weg\)/, "lässt der Browser das Video auch stumm nicht spielen, kommt die Seite sofort");
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
  apps: { titel: "Apps", karten: [["PHORMA I", "../alpha/bildfragmentieren/app/"], ["The Fictory", "../alpha/the-fictory/app/"], ["ORNA", "../portfolio/nebeneinander-nacheinander/"], ["ORMA", "../alpha/orma/"], ["OMNA COLOR", "../alpha/omna-color/app/"]] },   // OMNA COLOR seit 19. Oktober 2026 als letzte   // The Fictory vom 11. Oktober 2026 an zuerst, seit 17. Oktober 2026 PHORMA I
  masterprompts: { titel: "Masterprompts", karten: [] },     // die Reihenfolge kommt aus der Alpha-Übersicht, siehe unten
  web: { titel: "Web", karten: [["Sketchory", "../alpha/sketchory/"], ["The Fictory", "../alpha/the-fictory/"], ["Das Dritte Rad", "../alpha/drittes-rad/"], ["Stellenfeld", "../werke/stellenfeld/"], ["ORNA – Zufällige Begegnungen", "orna-erklaervideo/"], ["Liebling, ich habe den Poststrukturalismus strukturiert", "poststrukturalismus/"]] },
};

test("Apps, Masterprompts, Web: eigene Seiten mit Titel, Kopfzeile, Adresse und Eintrag in der Sitemap", () => {
  const sitemap = lies("sitemap.xml");
  const stand = (css) => [...new Set(css.map((m) => m[1]))];
  for (const [ordner, s] of Object.entries(SEITEN)) {
    const html = lies(`${ordner}/index.html`);
    assert.match(html, new RegExp(`<title>${s.titel} – Ornament Cloud</title>`));
    assert.match(html, new RegExp(`<h1>${s.titel}</h1>`));
    assert.match(html, /<p class="lead">[^<]{5,}<\/p>/);   // «Tests» auf «Web» (Wunsch von Christian, 9. Oktober 2026) ist kurz
    assert.match(html, new RegExp(`<link rel="canonical" href="https://ornament\\.cloud/${ordner}/">`));
    assert.match(html, /<meta name="description" content="[^"]{20,}">/);
    assert.ok(sitemap.includes(`<loc>https://ornament.cloud/${ordner}/</loc>`), `${ordner}/ steht in der Sitemap`);
    assert.match(html, /<p class="back"><a href="\.\.\/">← Zur Startseite<\/a><\/p>/);
    assert.match(html, /<nav class="seitenweg" aria-label="Ornament Cloud">\s*<a href="\.\.\/" aria-current="true">Ornament Cloud<\/a>\s*<a href="\.\.\/alpha\/drittes-rad\/">Das Dritte Rad<\/a>\s*<\/nav>/);
    assert.ok(!/class="card--b|card--d/.test(html) && (ordner === "web" || !/<video/.test(html)), "Videos nur auf «Web»");
    assert.equal(stand([...html.matchAll(/styles\.css\?v=(\d+)/g)]).length, 1);
  }
});

test("Apps: PHORMA I (seit 17. Oktober 2026, zuerst), The Fictory, ORNA, ORMA und OMNA COLOR (seit 19. Oktober 2026, zuletzt) als Beiträge, in dieser Reihenfolge, alle ausser ORNA als Alpha gekennzeichnet", () => {
  const k = karten(lies("apps/index.html"));
  assert.deepEqual(k.map((x) => [x.titel, x.ziel]), SEITEN.apps.karten);
  assert.ok(k[0].tags.includes("Alpha") && k[1].tags.includes("Alpha") && k[3].tags.includes("Alpha") && k[4].tags.includes("Alpha") && !k[2].tags.includes("Alpha"));
  assert.ok(k.slice(2, 4).every((x) => /data-icon="rad"/.test(x.html)), "ORNA und ORMA zeigen das drehende Rad");
  // OMNA COLOR (Wunsch vom 19. Oktober 2026: «sowohl als APP wie als Web-Anwendung … bei den APPs (als letzte)»): die App-Seite und die Web-Anwendung
  assert.match(k[4].html, /<img src="\.\.\/assets\/vorschau-omna-color-app\.jpg" alt="" width="640" height="800" loading="lazy">/);
  assert.deepEqual(jpegMass(readFileSync(new URL("assets/vorschau-omna-color-app.jpg", root))), [640, 800]);
  assert.deepEqual([...k[4].html.matchAll(/<a class="link[^"]*" href="([^"]+)"/g)].map((m) => m[1]), ["../alpha/omna-color/app/", "../alpha/omna-color/"], "Als App, im Browser spielen");
  // PHORMA I: eine Kristallansicht aus der Anwendung als Beitragsbild (tools/phorma-bilder.mjs), dazu der Satz vom 17. Oktober 2026
  assert.match(k[0].html, /<img src="\.\.\/assets\/vorschau-phorma-i\.jpg" alt="" width="640" height="800" loading="lazy">/);
  assert.deepEqual(jpegMass(readFileSync(new URL("assets/vorschau-phorma-i.jpg", root))), [640, 800]);
  assert.ok(k[0].html.includes("Als erste Anwendung in einer langen Reihe: PHORMA I."), "PHORMA I: der Satz der Erklärung");
  assert.ok(k[0].tags.includes("App") && k[0].tags.includes("Video") && /installieren/.test(k[0].html) && /ohne Netz/.test(k[0].html));
  // The Fictory: das App-Symbol im Format der Karten (tools/fictory-icons.mjs)
  assert.match(k[1].html, /<img src="\.\.\/assets\/vorschau-the-fictory-app\.jpg" alt="" width="640" height="800" loading="lazy">/);
  assert.deepEqual(jpegMass(readFileSync(new URL("assets/vorschau-the-fictory-app.jpg", root))), [640, 800]);
  assert.ok(k[1].tags.includes("App") && /installieren/.test(k[1].html) && /ohne Netz/.test(k[1].html));
  assert.match(k[3].html, /class="thumb split-invert"/, "ORMA: vertikal geteilt, rechts invers (REGELN §14)");
  assert.match(lies("apps/index.html"), /<section class="grid grid--stapel grid--paare" aria-label="Apps">/, "zwei Karten je Reihe");
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

test("Web (seit 19. Oktober 2026 nicht im Menü): Sketchory und The Fictory zuoberst, Das Dritte Rad (Alpha; OMNA COLOR bis 19. Oktober 2026, seither auf «Apps»), das Stellenfeld, dann zuunterst die Videos: das Erklärvideo zu ORNA und «Liebling …» («Mensch, Niklas!» seit 11. Oktober 2026 nicht sichtbar), alle als Beiträge mit Bild (4 : 5); die Bilder der drei Werke erzeugt tools/start-og.mjs; «Die Paradoxie der Stadt» zurzeit nur auf Alpha", () => {
  const html = lies("web/index.html");
  const alle = karten(html);
  assert.deepEqual(alle.map((x) => [x.titel, x.ziel]), SEITEN.web.karten);
  // Wunsch vom 9. Oktober 2026: die beiden Videos stehen zuunterst, «Mensch, Niklas!» als letztes
  const [sk, f] = alle, k = alle.slice(2, 4), [o, v] = alle.slice(4);
  // «Sketchory» (12. Oktober 2026) zuoberst, Alpha, Bild aus tools/sketchory-og.mjs
  assert.ok(sk.tags.includes("Alpha") && sk.tags.includes("Prototyp"));
  assert.match(sk.html, /<img src="\.\.\/assets\/vorschau-sketchory\.jpg" alt="" width="640" height="800" loading="lazy">/);
  const vorschauSketchory = readFileSync(new URL("assets/vorschau-sketchory.jpg", root));
  assert.deepEqual(jpegMass(vorschauSketchory), [640, 800]);
  assert.ok(vorschauSketchory.length < 150_000, `Vorschaubild ${vorschauSketchory.length} Byte, unter 150 KB`);
  assert.ok(lies("tools/sketchory-og.mjs").includes("vorschau-sketchory.jpg"));
  // «The Fictory» (10. Oktober 2026) danach, Alpha, Bild aus tools/fictory-og.mjs
  assert.ok(f.tags.includes("Alpha") && f.tags.includes("Prototyp"));
  assert.match(f.html, /<img src="\.\.\/assets\/vorschau-the-fictory\.jpg" alt="" width="640" height="800" loading="lazy">/);
  const vorschauFictory = readFileSync(new URL("assets/vorschau-the-fictory.jpg", root));
  assert.deepEqual(jpegMass(vorschauFictory), [640, 800]);
  assert.ok(vorschauFictory.length < 150_000, `Vorschaubild ${vorschauFictory.length} Byte, unter 150 KB`);
  assert.ok(lies("tools/fictory-og.mjs").includes("vorschau-the-fictory.jpg"));
  // «Die Paradoxie der Stadt» (Wunsch vom 10. Oktober 2026): zurzeit nicht auf «Web», nur auf der Alpha-Seite, dort auch direkt im Vollbild
  assert.ok(!/href="[^"]*alpha\/stadt\//.test(html), "keine Karte und kein Link zur Stadt auf «Web»");
  assert.match(lies("alpha/index.html"), /<a href="stadt\/">Die Paradoxie der Stadt<\/a>[\s\S]*?<a href="stadt\/\?vollbild">Im Vollbild öffnen<\/a>/);
  const vorschauStadt = readFileSync(new URL("assets/vorschau-stadt.jpg", root));
  assert.deepEqual(jpegMass(vorschauStadt), [640, 800], "das Vorschaubild für später bleibt: 640 × 800");
  // das Erklärvideo zu ORNA (9. Oktober 2026, bis dahin auf der Startseite): vor den beiden anderen Videos, klickbar mit Vorschaubild, führt nur auf die eigene Videoseite
  assert.match(o.html, /<a class="thumb" href="orna-erklaervideo\/" tabindex="-1" aria-hidden="true">\s*<img src="\.\.\/assets\/vorschau-orna-erklaervideo\.jpg" alt="" width="640" height="800" loading="lazy">/);
  assert.deepEqual([...o.html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((x) => x[1]), ["orna-erklaervideo/", "orna-erklaervideo/"], "Bild und «Öffnen»");
  const vorschauOrna = readFileSync(new URL("assets/vorschau-orna-erklaervideo.jpg", root));
  assert.deepEqual(jpegMass(vorschauOrna), [640, 800], "Vorschaubild 640 × 800");
  assert.ok(vorschauOrna.length < 150_000, `Vorschaubild ${vorschauOrna.length} Byte, unter 150 KB`);
  // das Comic-Video (6. Oktober 2026): klickbar mit Vorschaubild, führt auf die eigene Videoseite und verlinkt die Studie als PDF
  // «Mensch, Niklas!» (Wunsch vom 11. Oktober 2026): nicht sichtbar – keine Karte und kein Link auf «Web», das Vorschaubild bleibt für später
  assert.ok(!/href="[^"]*mensch-niklas/.test(html.replace(/<!--[\s\S]*?-->/g, "")), "keine Karte und kein Link zu «Mensch, Niklas!» auf «Web»");
  assert.ok(!html.includes("Mensch, Niklas!\">"), "auch nicht in der Beschreibung der Seite");
  const vorschauMensch = readFileSync(new URL("assets/vorschau-mensch-niklas.jpg", root));
  assert.deepEqual(jpegMass(vorschauMensch), [640, 800], "Vorschaubild 640 × 800");
  assert.ok(vorschauMensch.length < 150_000, `Vorschaubild ${vorschauMensch.length} Byte, unter 150 KB`);
  assert.match(v.html, /<a class="thumb" href="poststrukturalismus\/" tabindex="-1" aria-hidden="true">\s*<img src="\.\.\/assets\/vorschau-poststrukturalismus\.jpg" alt="" width="640" height="800" loading="lazy">/, "das Vorschaubild führt auf die Videoseite");
  assert.deepEqual([...v.html.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]), ["poststrukturalismus/", "poststrukturalismus/", "../alpha/poststrukturalismus-doppelpruefung.pdf"], "Bild, «Öffnen» und die Studie als PDF");
  assert.ok(!/<video/.test(html), "auf «Web» selbst läuft kein Video mehr, es spielt auf der Videoseite");
  const vorschau = readFileSync(new URL("assets/vorschau-poststrukturalismus.jpg", root));
  assert.deepEqual(jpegMass(vorschau), [640, 800], "Vorschaubild 640 × 800");
  assert.ok(vorschau.length < 150_000, `Vorschaubild ${vorschau.length} Byte, unter 150 KB`);
  assert.ok(k[0].tags.includes("Alpha") && k[0].tags.includes("Prototyp"), "das Dritte Rad ist Alpha");
  assert.ok(!k[1].tags.includes("Alpha"), "das Stellenfeld liegt nicht im Alpha-Bereich");
  const erzeuger = lies("tools/start-og.mjs");
  for (const [i, datei] of ["vorschau-drittes-rad.jpg", "vorschau-stellenfeld.jpg"].entries()) {
    assert.match(k[i].html, new RegExp(`<img src="\\.\\./assets/${datei}" alt="" width="640" height="800" loading="lazy">`));
    const bild = readFileSync(new URL(`assets/${datei}`, root));
    assert.deepEqual(bild.subarray(0, 3), Buffer.from([0xff, 0xd8, 0xff]), `${datei}: JPEG`);
    assert.deepEqual(jpegMass(bild), [640, 800], `${datei}: 640 × 800`);
    assert.ok(bild.length < 150_000, `${datei}: ${bild.length} Byte, unter 150 KB`);
    assert.ok(erzeuger.includes(datei), `tools/start-og.mjs erzeugt ${datei}`);
  }
});

test("Videoseite web/orna-erklaervideo/: das Erklärvideo zu ORNA (9 : 16) spielt von selbst, sobald es zur Hälfte im Bild ist; zurück zu «Web» (9. Oktober 2026, vorher auf der Startseite)", () => {
  const html = lies("web/orna-erklaervideo/index.html");
  assert.match(html, /<title>ORNA – Zufällige Begegnungen – Ornament Cloud<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/ornament\.cloud\/web\/orna-erklaervideo\/">/);
  assert.ok(lies("sitemap.xml").includes("<loc>https://ornament.cloud/web/orna-erklaervideo/</loc>"), "in der Sitemap");
  assert.match(html, /<h1>ORNA – Zufällige Begegnungen<\/h1>/);
  assert.match(html, /<figure class="erklaervideo">\s*<video controls muted playsinline preload="none" poster="\.\.\/\.\.\/assets\/orna-erklaervideo\.jpg" width="1080" height="1920"[^>]*>\s*<source src="\.\.\/\.\.\/assets\/orna-erklaervideo\.mp4" type="video\/mp4">/, "das Video lädt erst beim Abspielen");
  for (const d of ["orna-erklaervideo.mp4", "orna-erklaervideo.jpg", "vorschau-orna-erklaervideo.jpg"]) assert.ok(existsSync(new URL(`assets/${d}`, root)), d);
  assert.deepEqual(jpegMass(readFileSync(new URL("assets/orna-erklaervideo.jpg", root))), [540, 960], "Standbild 9 : 16");
  assert.ok(readFileSync(new URL("assets/orna-erklaervideo.mp4", root)).length < 14_000_000, "Video unter 14 MB");
  assert.match(html, /new IntersectionObserver\(/, "spielt von selbst, sobald es zur Hälfte im Bild ist");
  assert.match(html, /prefers-reduced-motion: reduce/, "bei «weniger Bewegung» nur auf Knopfdruck");
  assert.match(html, /<a href="\.\.\/\.\.\/apps\/">Apps<\/a>/, "Verweis auf die App");
  assert.match(html, /<p class="back"><a href="\.\.\/">← Zu Web<\/a><\/p>/);
  assert.match(html, /Fragen und Anmerkungen zur Website/, "Kontakt im Fuss");
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
  // seit 11. Oktober 2026 nicht sichtbar: bleibt unter der Adresse, aber noindex und nicht in der Sitemap
  assert.ok(!lies("sitemap.xml").includes("mensch-niklas"), "nicht in der Sitemap");
  assert.match(html, /<meta name="robots" content="noindex">/);
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
  const seiten = ["index.html", "web/index.html", "web/orna-erklaervideo/index.html", "web/poststrukturalismus/index.html", "web/mensch-niklas/index.html", "apps/index.html", "masterprompts/index.html", "news/index.html", "termine/index.html", "portfolio/index.html",
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

test("Impressum (19. Oktober 2026, Pflicht für den Verkauf auf «Art»): eigene Seite mit Name, Postadresse und Mail, verlinkt im Fuss aller Seiten mit dem Kontakt (ausser der Analyse «Metastabilität», die für sich steht)", () => {
  const html = lies("impressum/index.html");
  assert.match(html, /<address class="impressum">\s*Christian Strickler<br>\s*Rheingasse 8b<br>\s*CH-5466 Kaiserstuhl<br>\s*<a href="mailto:hansnoed@gmail\.com">hansnoed@gmail\.com<\/a>\s*<\/address>/);
  assert.ok(lies("sitemap.xml").includes("<loc>https://ornament.cloud/impressum/</loc>"));
  // seit demselben Tag auch AGB und Datenschutz auf dieser Seite (Wunsch: «AGB und Datenschutz beim Impressum»); die Werkseiten auf «Art» verweisen auf die AGB
  assert.match(html, /<section class="recht" id="agb"[\s\S]*<h2 id="agb-titel">Allgemeine Geschäftsbedingungen<\/h2>[\s\S]*<\/ol>\s*<\/section>/);
  assert.equal([...html.matchAll(/<li><strong>[^<]+\.<\/strong>/g)].length, 9, "neun Punkte");
  assert.match(html, /<section class="recht" id="datenschutz"[\s\S]*Verantwortlich:[\s\S]*GitHub Pages[\s\S]*GoatCounter[\s\S]*EDÖB/);
  assert.match(lies("art/harbouring/index.html"), /Es gelten die <a href="\.\.\/\.\.\/impressum\/#agb">AGB<\/a>\./);
  const kontakt = /(Fragen und Anmerkungen zur Website|Questions and comments about the website|Preguntas y comentarios sobre el sitio web): <a href="mailto:hansnoed@gmail\.com">/;
  for (const p of htmlSeiten()) {
    if (p === "impressum/index.html" || p === "alpha/metastabilitaet/index.html") continue;
    const s = lies(p);
    if (!kontakt.test(s)) continue;
    const m = s.match(/<a href="([^"]*)impressum\/"(?: hreflang="de")?>(Impressum|Legal notice|Aviso legal)<\/a>/);
    assert.ok(m, `${p}: Impressum im Fuss`);
    const basis = s.match(/<base href="([^"]+)"/)?.[1] ?? "";
    assert.equal(new URL(basis + m[1] + "impressum/", new URL(p, root)).pathname, new URL("impressum/", root).pathname, `${p}: der Link führt zum Impressum`);
  }
});
