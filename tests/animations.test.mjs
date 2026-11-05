// «Animationen» (animations/, 3. November 2026; seit 4. November 2026 nur Mischpult und Info, ohne Beispielbilder, mit gesicherten Werken):
// die Effekte sind vollständig, «Neu mischen» liefert gültige Mischungen, die Seite lädt nichts von aussen, ist noindex und nicht in der
// Sitemap, trägt die Vorschaukarte, und die Ablage der Werke (werke.php) hat ihre Grenzen.
//   node --test tests/animations.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");
const { EFFEKTE, EFFEKT_IDS, wertVon } = await import(new URL("animations/effekte.js", root).href);
const { MODI, DAUER, FPS, LAENGEN, dauerVon } = await import(new URL("animations/motor.js", root).href);
const { zufall, EIGEN } = await import(new URL("animations/rezepte.js", root).href);

test("Effekte: 24, Regler zwischen 0 und 1, höchstens sechs, Shader mit effekt() oder punkt(), jeder mit Name und Herkunft", () => {
  // Scan entfernt am 3. November 2026 («der scan kann weg»); Seifenblase und Holo-Kugel am 4. November 2026 ersetzt durch vierzehn Effekte aus der Bildinformation;
  // Pinselstrom und Aquarell entfernt am 5. November 2026, Papierriss und Membran-Blüte dazu am 5. November 2026;
  // Metaballs, Wirbel, Linien, Tuscheblasen, Glaslinsen, Röntgen-Scan und Papierriss entfernt am 5. November 2026
  // Alkoholtinte entfernt am 5. November 2026
  // Traube, Physarum und Strömung entfernt am 5. November 2026; Strom und Körper aus PHORMA I dazu
  assert.equal(Object.keys(EFFEKTE).length, 24);
  assert.deepEqual(EFFEKT_IDS, Object.keys(EFFEKTE));
  for (const [id, e] of Object.entries(EFFEKTE)) {
    assert.ok(e.name && e.herkunft, id);
    assert.ok(e.regler.length >= 1 && e.regler.length <= 6, id);
    for (const r of e.regler) assert.ok(r.wert >= 0 && r.wert <= 1, `${id}: ${r.name}`);
    assert.match(e.glsl, e.punkte ? /void punkt\(int id/ : /vec4 effekt\(vec2 uv\)/, id);
  }
});

test("neu mischen: eine bis drei verschiedene Effekte, erste Ebene normal, das Bild bleibt", () => {
  assert.equal(EIGEN, "eigen");
  for (let i = 0; i < 200; i++) {
    const m = zufall();
    assert.equal(m.bild, EIGEN);
    assert.ok(["schwarz", "weiss"].includes(m.grund));
    assert.ok(m.ebenen.length >= 1 && m.ebenen.length <= 3);
    assert.equal(new Set(m.ebenen.map((e) => e.effekt)).size, m.ebenen.length);
    assert.equal(m.ebenen[0].modus, "normal");
    for (const e of m.ebenen) {
      assert.ok(EFFEKTE[e.effekt], e.effekt);
      assert.ok(e.modus in MODI);
      assert.ok(e.deckkraft > 0 && e.deckkraft <= 1);
      assert.ok(["bild", "unten"].includes(e.quelle));
      assert.equal(e.werte.length, EFFEKTE[e.effekt].regler.length);
      for (const v of e.werte) assert.ok(v >= 0 && v <= 1);
    }
  }
  assert.equal(zufall(Math.random, "w:abc").bild, "w:abc", "ein gesichertes Werk als Bild bleibt beim Mischen");
});

test("Schlaufe von 12 s mit 30 Bildern pro Sekunde, Längen 12/30/60", () => {
  assert.equal(DAUER, 12); assert.equal(FPS, 30);
  assert.deepEqual(LAENGEN, [12, 30, 60]);
  assert.equal(dauerVon({}), 12); assert.equal(dauerVon({ dauer: 30 }), 30); assert.equal(dauerVon({ dauer: 7 }), 12);
});

test("Seite: noindex, nicht in der Sitemap, nichts von aussen, zwei Ansichten, keine Beispielbilder, kein Name des Betreibers", () => {
  const html = lies("animations/index.html");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.ok(!lies("sitemap.xml").includes("/animations/"));
  for (const f of ["index.html", "seite.js", "motor.js", "effekte.js", "rezepte.js"]) assert.doesNotMatch(lies(`animations/${f}`), /(src|href)=["']https?:|import\(["']https?:|from ["']https?:/, f);
  const ansichten = [...html.matchAll(/data-ansicht="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ansichten, ["mischpult", "info"], "nur Mischpult und Info (4. November 2026)");
  assert.ok(!html.includes("Christian Strickler"), "kein Name des Betreibers auf der Seite (4. November 2026)");
  assert.ok(!existsSync(new URL("animations/bilder", root)) || readdirSync(new URL("animations/bilder", root)).length === 0, "keine Beispielbilder (4. November 2026)");
  for (const id of ["pult-bild", "pult-leer", "pult-waehlen", "pult-datei", "pult-zufall", "pult-mp4", "pult-zeigen", "pult-lauf", "pult-laenge", "pult-grund", "pult-ebenen", "pult-pause", "pult-bildpng", "pult-link",
    "sichern-titel", "sichern-name", "sichern-schutz", "pult-sichern", "sichern-meldung", "werke-raster", "werke-anzahl", "werke-meldung", "info-effekte", "export"]) assert.ok(html.includes(`id="${id}"`), id);
  assert.match(html, /id="pult-zufall"[^>]*>[\s\S]{0,80}Neu mischen/, "«Neu mischen» ist die Haupttaste unter der Bühne");
  assert.ok(html.indexOf('id="pult-zufall"') < html.indexOf('id="pult-mp4"'));
});

test("Teilen: die Seite trägt die Vorschaukarte (Open Graph und X) mit absoluten Adressen; das Bild erzeugt tools/animations-og.mjs", () => {
  const html = lies("animations/index.html");
  const m = new Map([...html.matchAll(/<meta (?:property|name)="([^"]+)" content="([^"]*)">/g)].map((x) => [x[1], x[2]]));
  assert.equal(m.get("og:url"), "https://ornament.cloud/animations/");
  assert.equal(m.get("og:title"), "Animationen");
  assert.equal(m.get("og:image"), "https://ornament.cloud/animations/og-animationen.jpg");
  assert.equal(m.get("twitter:card"), "summary_large_image");
  assert.ok(existsSync(new URL("animations/og-animationen.jpg", root)), "animations/og-animationen.jpg fehlt (NODE_PATH=$(npm root -g) node tools/animations-og.mjs)");
  assert.ok(lies("tools/animations-og.mjs").includes("og-animationen.jpg"));
});

test("Bild zeigen: aus (4. November 2026): Motor setzt uZeigen, Ql zeigt ein Raster, Kl liest weiter das Bild", () => {
  const motor = lies("animations/motor.js"), seite = lies("animations/seite.js"), html = lies("animations/index.html");
  assert.match(motor, /uniform float [^;]*uZeigen/);
  assert.match(motor, /vec4 Kl\(vec2 uv, float l\)/);
  assert.match(motor, /stapel\.ohneBild \? 0 : 1/);
  assert.match(html, /id="pult-zeigen"/);
  assert.match(seite, /-ohne-bild/);
  for (const id of ["partikel", "zebra", "glitzer", "raster", "relief", "hoehenlinien", "montage", "entrauschen", "echo", "voxel", "sortieren", "vertigo", "strahlen", "gewebe", "blitze", "geflecht", "lichtformen", "bluete", "strom", "koerper"]) assert.match(EFFEKTE[id].glsl, /Kl\(/, id);
});

test("Durchlauf (4. November 2026): Motor kennt uLauf und HZ(), Schalter und Länge im Mischpult", () => {
  const motor = lies("animations/motor.js"), html = lies("animations/index.html");
  assert.match(motor, /uLauf/); assert.match(motor, /float HZ\(float e\)/);
  assert.match(html, /id="pult-lauf"/); assert.match(html, /id="pult-laenge"/);
});

test("Werke sichern (4. November 2026): werke.php mit Herkunft, Grenzen und Schlüssel; der Ordner der Werke bleibt beim Deploy und im Repository aussen vor", () => {
  const php = lies("animations/werke.php"), seite = lies("animations/seite.js");
  assert.match(php, /^<\?php/);
  assert.match(php, /const HERKUNFT = 'https:\/\/ornament\.cloud';/);
  for (const k of ["MAX_BILD", "MAX_SEITE", "MAX_NAME", "MAX_TITEL", "MAX_STAPEL", "MAX_WERKE", "JE_STUNDE"]) assert.match(php, new RegExp(`const ${k} = `), k);
  assert.match(php, /HTTP_ORIGIN/); assert.match(php, /random_bytes/); assert.match(php, /hash\('sha256', \$schluessel\)/); assert.match(php, /hash_equals/);
  assert.match(php, /getimagesize/); assert.match(php, /'schutz'/);
  assert.doesNotMatch(php, /\beval\(|\bexec\(|\bshell_exec\(|\bsystem\(/);
  assert.match(seite, /werke\.php/); assert.match(seite, /FormData/); assert.match(seite, /aktion: "loeschen"/);
  assert.ok(lies("tools/hostpoint/ausschluss.txt").split(/\r?\n/).includes("animations/werke/"), "rsync --delete darf die Werke nicht löschen");
  assert.ok(lies(".gitignore").split(/\r?\n/).includes("animations/werke/"));
});

test("Format (4. November 2026, PR #615): 4:5, 1:1, 16:9 im Mischpult, Standbild und MP4 in der Grösse des Formats, Format in der gesicherten Mischung", () => {
  const seite = lies("animations/seite.js"), html = lies("animations/index.html"), php = lies("animations/werke.php");
  assert.match(html, /id="pult-format"/);
  assert.match(html, /:root\[data-format="16x9"\]/);
  for (const g of ["1080, 1350", "1080, 1080", "1920, 1080"]) assert.ok(seite.includes(`gross: [${g}]`), g);
  assert.match(seite, /breite, hoehe,/);
  assert.match(php, /const FORMATE = \['4x5', '1x1', '16x9'\];/);
});

test("Versionsmarke: index.html und alle Importe der Module tragen dieselbe ?v= (Zwischenspeicher zehn Minuten; 4. November 2026: alte seite.js zu neuer Seite)", () => {
  const html = lies("animations/index.html");
  const marke = html.match(/src="seite\.js\?v=(\d+)"/)?.[1];
  assert.ok(marke, "seite.js mit ?v= eingebunden");
  for (const f of ["seite.js", "rezepte.js", "motor.js"]) {
    const importe = [...lies(`animations/${f}`).matchAll(/from "\.\/([a-z]+\.js)([^"]*)"/g)];
    assert.ok(importe.length, f);
    for (const [, modul, v] of importe) assert.equal(v, `?v=${marke}`, `${f} → ${modul}`);
  }
});

test("Werk sichern: leere Ebenen («— keine —») gehen nicht mit, werke.php überspringt sie (Fehler live am 4. November 2026)", () => {
  assert.match(lies("animations/seite.js"), /stapel\.ebenen = stapel\.ebenen\.filter\(\(e\) => e\.effekt/);
  assert.match(lies("animations/werke.php"), /if \(\$effekt === ''\) continue;/);
});

test("Montage: Form als Wahl mit vier Stufen (5. November 2026), Vierecke bleibt der Standard, «neu mischen» trifft nur Stufen", async () => {
  const { stufe } = await import(new URL("animations/effekte.js", root).href);
  const form = EFFEKTE.montage.regler.find((r) => r.stufen);
  assert.deepEqual(form.stufen, ["Vierecke", "Dreiecke", "Vielecke", "Kreise"]);
  assert.equal(EFFEKTE.montage.regler.indexOf(form), 5, "Form liegt in P5, ältere Werke mit fünf Werten bleiben Vierecke");
  assert.equal(form.wert, 0);
  assert.deepEqual([0, 1 / 3, 2 / 3, 1, .49].map((v) => stufe(form, v)), [0, 1, 2, 3, 1]);
  assert.match(EFFEKTE.montage.glsl, /int form = int\(P5 \* 3\. \+ \.5\)/);
  for (let i = 0; i < 300; i++) for (const e of zufall().ebenen) if (e.effekt === "montage") assert.ok([0, 1, 2, 3].includes(stufe(form, e.werte[5])) && Math.abs(e.werte[5] * 3 - Math.round(e.werte[5] * 3)) < .01);
  assert.match(lies("animations/seite.js"), /r\.stufen \? stufenWahl/);
});

test("Kubismus bei Druckraster und Höhenlinien: eigener Regler, ältere Mischungen behalten ihr Aussehen", () => {
  for (const id of ["raster", "hoehenlinien"]) {
    const def = EFFEKTE[id], k = def.regler.findIndex((r) => r.name === "Kubismus");
    assert.equal(k, 5, id);
    assert.match(def.glsl, /Kub F = kubus\(P\(uv\), P5\)/, id);
    assert.ok(def.regler[k].wert > 0, `${id}: neu gemischt mit Kubismus`);
    assert.equal(wertVon(def, [.5, .5, .5, .5, 0], k), 0, `${id}: gesichert mit fünf Werten, also ohne Kubismus`);
    assert.equal(wertVon(def, [], k), def.regler[k].wert, `${id}: frisch gewählt mit der Vorgabe`);
    assert.equal(wertVon(def, [.5, .5, .5, .5, 0, .8], k), .8);
  }
  for (const id of ["pinsel", "aquarell"]) assert.ok(!EFFEKTE[id], `${id} entfernt`);
});

test("Handy (5. November 2026: «Diese Seite braucht WebGL 2 … gestern gings noch»): kein Kontext wird erklärt, verlorener Kontext baut neu auf, ein kaputter Effekt hält die Seite nicht an, schwere Punkt-Effekte rechnen sparsam", () => {
  const motor = lies("animations/motor.js"), seite = lies("animations/seite.js");
  assert.match(motor, /function ohneKontext\(/);
  assert.match(motor, /webglcontextlost[^]*preventDefault[^]*webglcontextrestored/);
  assert.match(motor, /motor\.kaputt\.set\(id/);
  assert.match(motor, /if \(!pr\) continue;/);
  assert.match(motor, /def\.punkte\(w, a, h, motor\.sparsam \? DICHTE_SPARSAM : 1\)/);
  assert.match(motor, /cols \* rows > PUNKTE_SPARSAM/, "Obergrenze der Punkte auf Handys");
  assert.match(seite, /const DROSSEL_MIN = \.7;/, "die Drossel macht das Bild nicht grob");
  assert.doesNotMatch(seite, /^const fehler = motor\.pruefen\(\)/m, "nicht mehr alle Effekte beim Start übersetzen");
  for (const id of ["physarum", "blitze", "stroemung", "strom"]) {
    const e = EFFEKTE[id]; if (!e) continue;
    const voll = e.punkte([.9, .9, .9, .9, .9, .9], .8, 1350), wenig = e.punkte([.9, .9, .9, .9, .9, .9], .8, 1350, .3);
    assert.ok(wenig.cols * wenig.rows < voll.cols * voll.rows * .7, id);
    assert.deepEqual(e.punkte([.9, .9, .9, .9, .9, .9], .8, 1350, 1), voll, `${id}: auf dem Desktop unverändert`);
  }
});

test("Laptop (5. November 2026: «ich hab zurzeit viele abstürze … am laptop»): Effekte in Streifen, schwache Grafik und ein Wächter schalten auf sparsam", () => {
  const motor = lies("animations/motor.js"), seite = lies("animations/seite.js");
  assert.match(motor, /function streifen\(b, h\)/); assert.match(motor, /gl\.scissor\(/); assert.match(motor, /\} else streifen\(b, h\);/);
  assert.match(motor, /SCHWACHE_GRAFIK = \/Intel/);
  assert.match(seite, /else if \(langsam >= 8 && !motor\.sparsam\)/);
});

test("kurze Links (link.js): jede Mischung kommt genau zurück und der Link bleibt kurz", async () => {
  const { kurz, lang } = await import(new URL("animations/link.js", root).href);
  for (let i = 0; i < 300; i++) {
    let s = i + 1; const zz = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const m = zufall(zz); delete m.bild;
    if (i % 3 === 0) Object.assign(m, { werk: "a1b2c3d4e5", ohneBild: true, durchlauf: true, dauer: 30, format: "16x9" });
    if (i % 5 === 0) m.ebenen[0].aus = true;
    const k = kurz(m);
    assert.ok(k, JSON.stringify(m));
    assert.deepEqual(lang(k), JSON.parse(JSON.stringify(m)), k);
    const alt = btoa(unescape(encodeURIComponent(JSON.stringify(m))));
    assert.ok(k.length < 130 && k.length * 3 < alt.length, `${k.length} gegen ${alt.length}`);
    assert.doesNotMatch(k, /[.\s%&#?]|_$/, "nichts, was Messenger abschneiden oder kodieren");
  }
  // leere Ebenen aus dem Pult, fehlende Felder und unbekannte Felder
  const leer = { grund: "schwarz", ebenen: [{ effekt: "", werte: [], modus: "normal", deckkraft: 1, quelle: "bild", seed: 0 }, { effekt: "zebra" }] };
  assert.deepEqual(lang(kurz(leer)), leer);
  assert.equal(kurz({ ebenen: [], neu: 1 }), null, "Unbekanntes geht in den alten Link");
  assert.equal(kurz({ ebenen: [{ effekt: "zebra", werte: [2] }] }), null);
  for (const kaputt of ["", "x", "_q", "_~zebra_zz_9_", "_~ze.bra_00_0__"]) assert.equal(lang(kaputt), null, kaputt);
});

test("Kurzlinks: .htaccess leitet /a/KURZ auf /animations/#a=KURZ, die Seite liest #a= und räumt ?fbclid=… weg", () => {
  assert.match(lies(".htaccess"), /RewriteRule \^a\/\(\[0-9A-Za-z\]\{6,10\}\)\/\?\$ \/animations\/#a=\$1 \[R=302,NE,L\]/);
  const seite = lies("animations/seite.js");
  assert.match(seite, /h\.startsWith\("a="\)/); assert.match(seite, /aktion: "kurz"/); assert.match(seite, /if \(location\.search\) history\.replaceState/);
  assert.match(lies("animations/werke.php"), /\$ordner\/kurz\//);
  assert.match(lies("tools/hostpoint/ausschluss.txt"), /^animations\/werke\/$/m, "die Kurzlinks liegen in werke/ und überstehen den Deploy");
});
