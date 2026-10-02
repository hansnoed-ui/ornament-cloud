// Navigation oben links (Wunsch von Christian, freigegeben am 2. Oktober 2026, REGELN §14):
// Jede Seite trägt oben links «Ornament Cloud» (zur Startseite) und darunter «Das Dritte Rad» (zum Start des Rads), beide als Buttons mit ganz
// feinem Rahmen; der aktive (aria-current) ist markiert, und zwar invers (Fläche in der Farbe des Buttons, Schrift in der Farbe der Seite):
// «Das Dritte Rad» im Rad, «Ornament Cloud» auf allen anderen Seiten. Auf der Website stehen beide Links in einer Farbe (hell Anthrazit, dunkel helles
// Sonnengelb) mit einer feinen Linie darunter (Wunsch vom 2. Oktober 2026, 19:00 UTC); das Dritte Rad behält Orange und Violett und hat keine Linie.
// Ausgenommen sind ORMA (eigene App, Trennung nach §14), die drei Werke im Vollbild und die Weiterleitung auf die frühere Adresse von ORNA.
//   node --experimental-strip-types --no-warnings --test tests/navigation.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");
const AUSNAHMEN = [
  ["ORMA (eigene App)", /^(alpha\/orma|src\/orma)\//],
  ["Werke im Vollbild", /^werke\//],
  ["Weiterleitung auf die frühere Adresse von ORNA", /^portfolio\/rad-von-zeit-und-raum\//],
];
const ueberspringen = new Set(["node_modules", "dist", "vendor", ".git"]);
const walk = (d, vor = "") => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  ueberspringen.has(e.name) ? [] : e.isDirectory() ? walk(new URL(e.name + "/", d), vor + e.name + "/") : e.name.endsWith(".html") ? [vor + e.name] : []);
const alle = walk(root);
const ausgenommen = (p) => AUSNAHMEN.some(([, re]) => re.test(p));
const seiten = alle.filter((p) => !ausgenommen(p));

test("Navigation: jede Seite trägt oben links genau «Ornament Cloud» und «Das Dritte Rad», vor dem Inhalt", () => {
  assert.ok(seiten.length >= 200, `die Seiten wurden gefunden (${seiten.length})`);
  for (const p of seiten) {
    const html = lies(p);
    const navs = [...html.matchAll(/<nav class="seitenweg" aria-label="Ornament Cloud">([\s\S]*?)<\/nav>/g)];
    assert.equal(navs.length, 1, `${p}: genau eine Navigation oben links`);
    const links = [...navs[0][1].matchAll(/<a href="([^"]+)"(?: aria-current="(page|true)")?>([^<]+)<\/a>/g)];
    assert.deepEqual(links.map((l) => l[3]), ["Ornament Cloud", "Das Dritte Rad"], `${p}: zwei Links in dieser Reihenfolge`);
    assert.equal(navs[0][1].replace(/<a [^>]*>[^<]*<\/a>/g, "").trim(), "", `${p}: sonst nichts in der Navigation`);
    const von = new URL(p, "http://x/");
    const ziel = links.map((l) => new URL(l[1], von).pathname);
    assert.deepEqual(ziel, ["/", "/alpha/drittes-rad/"], `${p}: Startseite und Start des Rads`);
    for (const z of ziel) assert.ok(existsSync(new URL(z.slice(1) + "index.html", root)), `${p}: ${z} gibt es`);
    // aktiv ist genau ein Link: im Rad «Das Dritte Rad», sonst «Ornament Cloud»; «page», wo der Link auf die Seite selbst zeigt (Startseite, Start des Rads), sonst «true»
    const imRad = p.startsWith("alpha/drittes-rad/");
    assert.deepEqual(links.map((l) => l[2] ?? null), imRad ? [null, "page"] : [p === "index.html" ? "page" : "true", null], `${p}: aria-current genau auf dem aktiven Link`);
    const ort = html.indexOf('<nav class="seitenweg"');
    const inhalt = ["<main", "<h1"].map((t) => html.indexOf(t)).filter((i) => i >= 0);          // nicht jede Seite hat eine h1 (OMNA COLOR)
    assert.ok(inhalt.length > 0 && ort > html.indexOf("<body") && inhalt.every((i) => ort < i), `${p}: die Navigation steht ganz oben, vor Titel und Inhalt`);
    assert.ok(!/Ornament Cloud<\/a> · <a|class="eyebrow brand"/.test(html), `${p}: die frühere Zeile «Ornament Cloud · Alpha» und der alte Name sind weg`);
  }
});

/** alle Regeln einer Seite: ihre eigenen <style> und die eingebundenen Stylesheets dieser Website */
const cssVon = (p) => {
  const html = lies(p);
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  for (const [, href] of html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)) {
    if (/^[a-z]+:|^\//i.test(href)) continue;
    const datei = new URL(href.replace(/[?#].*$/, ""), new URL(p, root));
    if (existsSync(datei)) css.push(readFileSync(datei, "utf8"));
  }
  return css.join("\n");
};

test("Navigation: jede Seite bringt die Gestaltung mit (eigene Regeln in der Seite oder im eingebundenen Stylesheet)", () => {
  for (const p of seiten) assert.match(cssVon(p), /\.seitenweg a\b/, `${p}: Regeln für .seitenweg fehlen`);
});

const imRad = (p) => p.startsWith("alpha/drittes-rad/");

test("Navigation: auf der Website stehen beide Links in derselben Farbe (hell Anthrazit, dunkel helles Sonnengelb), im Dritten Rad bleiben sie orange und violett; überall genau so gesetzt wie auf der Website (Wunsch von Christian, 2. Oktober 2026, 19:00 UTC)", () => {
  for (const p of seiten) {
    const css = cssVon(p), html = lies(p);
    const erster = css.match(/\.seitenweg a \{([^}]*)\}/);
    assert.ok(erster, `${p}: Regel für den ersten Link`);
    if (imRad(p)) {
      assert.match(erster[1], /--weg:\s*var\(--weg-start\)/, `${p}: «Ornament Cloud» im Rad in Orange (die Farbe des Buttons steht in --weg)`);
      assert.match(css, /\.seitenweg a \+ a \{[^}]*--weg:\s*var\(--weg-rad\)/, `${p}: «Das Dritte Rad» im Rad in Violett, davon getrennt`);
      assert.match(css, /--weg-rad:\s*#[0-9a-f]{6}/i, `${p}: das Violett ist festgelegt`);
      assert.doesNotMatch(css, /--hauptlink/, `${p}: das Rad kennt die Farbe der Website nicht`);
    } else {
      assert.match(erster[1], /--weg:\s*var\(--hauptlink\)/, `${p}: beide Links in der Farbe der Hauptlinks (die Farbe des Buttons steht in --weg)`);
      assert.doesNotMatch(css, /\.seitenweg a \+ a\s*\{/, `${p}: kein zweiter Farbton für «Das Dritte Rad»`);
      assert.match(css, /--hauptlink:\s*#[0-9a-f]{6}/i, `${p}: die Farbe ist festgelegt`);
      assert.doesNotMatch(css, /--weg-(start|rad)/, `${p}: Orange und Violett der früheren Navigation sind weg`);
    }
    assert.match(erster[1], /(?:^|[;\s])color:\s*var\(--weg\)/, `${p}: die Schrift steht in der Farbe des Buttons`);
    assert.match(erster[1], /text-transform:\s*uppercase/, `${p}: Grossbuchstaben wie auf der Website`);
    assert.match(erster[1], /font-weight:\s*600|font:\s*600\s/, `${p}: Gewicht 600 wie auf der Website`);
    assert.match(erster[1], /font-size:\s*0?\.8rem|font:\s*600\s+0?\.8rem/, `${p}: Schriftgrösse 0,8 rem wie auf der Website`);
    assert.match(erster[1], /letter-spacing:\s*0?\.12em/, `${p}: Laufweite 0,12 em wie auf der Website`);
    if (!/<link rel="stylesheet" href="[^"]*styles\.css/.test(html)) assert.match(erster[1], /system-ui, -apple-system, "Segoe UI", Roboto/, `${p}: dieselbe Schrift wie auf der Website`);
  }
  // die Farbe der Hauptlinks ist je ein Wert für hell und für dunkel, auf der ganzen Website derselbe; im Rad bleiben Orange und Violett (die Seite ist immer dunkel)
  const werte = (p, name) => [...cssVon(p).matchAll(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "gi"))].map((m) => m[1].toLowerCase());
  const sammlung = (name, auswahl) => new Set(seiten.filter(auswahl).flatMap((p) => werte(p, name)));
  assert.deepEqual([...sammlung("--hauptlink", (p) => !imRad(p))].sort(), ["#353b40", "#ffd84d"], "Hauptlinks auf der Website: hell Anthrazit #353b40, dunkel helles Sonnengelb #ffd84d");
  assert.deepEqual([...sammlung("--weg-rad", imRad)], ["#a794ff"], "Violett im Rad: #a794ff");
  assert.deepEqual([...sammlung("--weg-start", imRad)], ["#f08a5d"], "Orange im Rad: #f08a5d");
});

/** Regeln eines Stylesheets: Selektor (Leerraum vereinheitlicht) → Deklarationen (Eigenschaft → alle Werte in der Reihenfolge, in der sie stehen) */
const regeln = (css) => {
  const aus = new Map();
  for (const [, kopf, rumpf] of css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    for (const sel of kopf.split(",").map((t) => t.trim().replace(/\s+/g, " ")).filter(Boolean)) {
      const d = aus.get(sel) ?? new Map();
      for (const [, name, wert] of rumpf.matchAll(/([a-z-]+)\s*:\s*([^;]+);?/g)) d.set(name, [...(d.get(name) ?? []), wert.trim().replace(/\s+/g, " ")]);
      aus.set(sel, d);
    }
  }
  return aus;
};

/** Teilt ein Stylesheet in den Inhalt aller @media-Blöcke mit dieser Bedingung (Klammern gezählt) und den Rest */
const ausMedia = (css, bedingung) => {
  const kopf = new RegExp(`@media\\s*\\(\\s*${bedingung}\\s*\\)\\s*\\{`, "g");
  let innen = "", rest = css.replace(/\/\*[\s\S]*?\*\//g, ""), m;
  while ((m = kopf.exec(rest))) {
    let tiefe = 1, i = kopf.lastIndex;
    while (tiefe && i < rest.length) tiefe += rest[i] === "{" ? 1 : rest[i] === "}" ? -1 : 0, i++;
    innen += rest.slice(kopf.lastIndex, i - 1) + "\n";
    rest = rest.slice(0, m.index) + rest.slice(i);
    kopf.lastIndex = m.index;
  }
  return { innen, rest };
};

/** die Variable, in der die Seite ihren Grund hält: die letzte var(--…) im background von html oder body (Rad: hinter dem Sternenhimmel) */
const grundVariable = (r) => {
  const werte = ["html", "body"].flatMap((sel) => [...(r.get(sel)?.get("background") ?? []), ...(r.get(sel)?.get("background-color") ?? [])]);
  return werte.flatMap((v) => [...v.matchAll(/var\((--[a-z-]+)\)/g)].map((m) => m[1])).at(-1);
};

test("Navigation: die beiden Links sind Buttons mit ganz feinem Rahmen (1 px, blass); der aktive ist invers gesetzt, Fläche in der Farbe des Buttons, Schrift in der Farbe der Seite; überall gleich (Wunsch von Christian, 2. Oktober 2026)", () => {
  let gesehen = 0;
  const gruende = new Set();
  for (const p of seiten) {
    const { innen: erzwungen, rest } = ausMedia(cssVon(p), "forced-colors:\\s*active");
    const r = regeln(rest), w = (sel, name) => r.get(sel)?.get(name) ?? [];
    const was = (t) => `${p}: ${t}`;
    // der Button: Polster, Rahmen 1 px (blass, dazu ein voller Rahmen für Browser ohne color-mix), Pillenform, Text in der Mitte
    assert.deepEqual(w(".seitenweg a", "padding"), ["3px 14px"], was("Polster 3px 14px"));
    assert.deepEqual(w(".seitenweg a", "border"), ["1px solid var(--weg)", "1px solid color-mix(in srgb, var(--weg) 40%, transparent)"], was("Rahmen 1 px, blass (40 %), davor der volle Rahmen als Ersatz"));
    assert.deepEqual(w(".seitenweg a", "border-radius"), ["999px"], was("Pillenform"));
    assert.deepEqual(w(".seitenweg a", "text-align"), ["center"], was("Text in der Mitte der gleich breiten Buttons"));
    // beide gleich breit (so breit wie der längere), linksbündig, mit Abstand
    assert.deepEqual(w(".seitenweg", "grid-template-columns"), ["max-content"], was("beide Buttons gleich breit"));
    assert.deepEqual(w(".seitenweg", "justify-content"), ["start"], was("linksbündig"));
    assert.deepEqual(w(".seitenweg", "gap"), ["8px"], was("Abstand zwischen den Buttons (Platz für den Fokusring)"));
    // nicht aktiv: ohne Fläche, beim Darüberfahren der Rahmen voll
    for (const sel of [".seitenweg a", ".seitenweg a:hover"]) assert.equal(w(sel, "background").length + w(sel, "background-color").length, 0, was(`${sel}: ohne Fläche`));
    assert.deepEqual(w(".seitenweg a:hover", "border-color"), ["var(--weg)"], was("beim Darüberfahren: voller Rahmen"));
    // aktiv (aria-current): invers, die Fläche und der volle Rahmen in der Farbe des Buttons, die Schrift in der Farbe der Seite, kein zweiter Ring mehr
    const grund = grundVariable(r);
    assert.match(grund ?? "", /^--(bg|papier|night)$/, was(`die Seite hält ihren Grund in einer Variablen (${grund})`));
    gruende.add(grund);
    assert.deepEqual(w(".seitenweg a[aria-current]", "background"), ["var(--weg)"], was("aktiv: Fläche in der Farbe des Buttons"));
    assert.deepEqual(w(".seitenweg a[aria-current]", "border-color"), ["var(--weg)"], was("aktiv: voller Rahmen in der Farbe des Buttons"));
    assert.deepEqual(w(".seitenweg a[aria-current]", "color"), [`var(${grund})`], was("aktiv: Schrift in der Farbe der Seite"));
    assert.deepEqual(w(".seitenweg a[aria-current]", "outline"), [], was("aktiv: kein zweiter Ring ausserhalb mehr"));
    assert.deepEqual(w(".seitenweg a[aria-current]", "outline-offset"), [], was("aktiv: kein Ringabstand mehr"));
    // Tastaturfokus: Ring in der Farbe des Buttons (sichtbar auch auf dem aktiven)
    assert.deepEqual(w(".seitenweg a:focus-visible", "outline"), ["2px solid var(--weg)"], was("Tastaturfokus sichtbar, in der Farbe des Buttons"));
    assert.deepEqual(w(".seitenweg a:focus-visible", "outline-offset"), ["2px"], was("Tastaturfokus mit Abstand"));
    // erzwungene Farben (hoher Kontrast) nehmen die Fläche weg: nur dort bleibt der aktive mit einem feinen Ring kenntlich, sonst nichts
    const e = regeln(erzwungen);
    assert.deepEqual([...e.keys()], [".seitenweg a[aria-current]"], was("erzwungene Farben: nur der aktive Button hat eine eigene Regel"));
    assert.deepEqual(e.get(".seitenweg a[aria-current]")?.get("outline"), ["1px solid currentColor"], was("erzwungene Farben: feiner Ring um den aktiven"));
    assert.deepEqual(e.get(".seitenweg a[aria-current]")?.get("outline-offset"), ["2px"], was("erzwungene Farben: Ring mit Abstand"));
    // keine Unterstreichung mehr beim Darüberfahren (es sind Buttons)
    assert.equal(w(".seitenweg a:hover", "text-decoration").length + w(".seitenweg a:focus-visible", "text-decoration").length, 0, was("keine Unterstreichung bei Hover und Fokus"));
    gesehen += 1;
  }
  assert.ok(gesehen >= 200, `alle Seiten geprüft (${gesehen})`);
  assert.deepEqual([...gruende].sort(), ["--bg", "--night", "--papier"], "die vier Gestaltungen (Website, Zettelkasten, Rad, OMNA COLOR) nehmen je ihren Grund");
});

test("Navigation: unter der Kopfzeile steht eine feine Linie in der Farbe der Hauptlinks, auf den Seiten mit Menü die Welle, sonst eine gerade Linie von 1 px; das Dritte Rad hat keine; im Zettelkasten ist der Abstand bis zum Titel grösser (Wunsch von Christian, 2. Oktober 2026, 19:00 UTC)", () => {
  let wellen = 0, gerade = 0;
  for (const p of seiten) {
    const html = lies(p), css = cssVon(p), r = regeln(ausMedia(css, "forced-colors:\\s*active").rest), w = (sel, name) => r.get(sel)?.get(name) ?? [];
    const was = (t) => `${p}: ${t}`;
    const nachLinks = [...r.keys()].filter((k) => /\.seitenweg::after$/.test(k));
    if (imRad(p)) {
      assert.deepEqual(nachLinks, [], was("das Rad hat keine Linie unter den Links (Wunsch vom 2. Oktober 2026, 19:00 und 20:08 UTC)"));
      assert.deepEqual([w(".seitenweg", "padding-bottom"), w(".seitenweg", "border-bottom"), w(".seitenweg", "border-bottom-width")].flat(), [], was("und kein Polster und kein Rand unter den Buttons"));
      assert.ok(!html.includes('class="divider"'), was("das Rad hat keine Welle"));
      continue;
    }
    if (html.includes('class="divider"')) {
      // Seiten mit Menü: die Welle der Website, in der Farbe der Hauptlinks
      assert.deepEqual(w(".divider", "color"), ["var(--hauptlink)"], was("die Welle steht in der Farbe der Hauptlinks"));
      assert.deepEqual(w(".divider .wave", "stroke"), ["currentColor"], was("die Welle zeichnet in dieser Farbe"));
      assert.deepEqual(w(".divider .wave", "opacity"), [], was("die Welle ist voll deckend, nicht blasser als die Links"));
      assert.deepEqual(w(".divider .wave", "stroke-width"), ["0.8"], was("die Welle bleibt fein"));
      assert.deepEqual(nachLinks.filter((k) => k !== ".wrap > .seitenweg::after"), [], was("auf Seiten mit Menü keine zweite, gerade Linie"));
      wellen += 1;
    } else {
      // Zettelkasten, Alpha-Texte, OMNA COLOR: eine gerade Linie von 1 px am unteren Rand der Navigation
      assert.equal(nachLinks.length, 1, was(`genau eine Linie unter den Links (${nachLinks.join(", ")})`));
      const sel = nachLinks[0];
      assert.deepEqual(w(sel, "border-top"), ["1px solid var(--hauptlink)"], was("feine Linie, 1 px, in der Farbe der Hauptlinks"));
      assert.deepEqual(w(sel, "position"), ["absolute"], was("die Linie schiebt nichts"));
      assert.deepEqual(w(sel, "bottom"), ["0"], was("am unteren Rand der Navigation"));
      assert.deepEqual(w(sel, "content"), ['""'], was("leeres Element"));
      assert.deepEqual(w(sel.replace(/::after$/, ""), "position"), ["relative"], was("die Navigation ist der Bezug der Linie"));
      gerade += 1;
    }
    // Zettelkasten: mehr Raum zwischen den Hauptlinks (samt Linie) und dem Titel «Zu seiner Zeit»: 28 px statt 12 px
    if (/zsz\.css/.test(html)) assert.deepEqual(w(".seitenweg + .zsz-kopf", "padding-top"), ["28px"], was("Zettelkasten: 28 px bis zum Titel «Zu seiner Zeit»"));
  }
  assert.ok(wellen >= 10 && gerade >= 150, `alle Seiten geprüft (Wellen ${wellen}, gerade Linien ${gerade})`);
});

test("Navigation: ORMA, die Werke und die Weiterleitung bleiben ohne (Ausnahmen sind benannt und vorhanden)", () => {
  for (const [name, re] of AUSNAHMEN) {
    const treffer = alle.filter((p) => re.test(p));
    assert.ok(treffer.length > 0, `${name}: Seiten gefunden`);
    for (const p of treffer) assert.ok(!lies(p).includes("seitenweg"), `${p} (${name}) bleibt ohne Navigation`);
  }
});

test("Navigation: keine Seite verlinkt die Alpha-Übersicht (alpha/), sie ist nur per Adresse erreichbar (Entscheid von Christian, 2. Oktober 2026)", () => {
  assert.ok(existsSync(new URL("alpha/index.html", root)), "die Übersicht selbst gibt es weiter");
  for (const p of alle) {
    for (const [, href] of lies(p).matchAll(/<a\b[^>]*\shref="([^"]*)"/g)) {
      const u = new URL(href, new URL(p, "https://ornament.cloud/"));
      assert.ok(!(u.hostname === "ornament.cloud" && /^\/alpha\/(index\.html)?$/.test(u.pathname)), `${p}: ${href} führt zur Alpha-Übersicht`);
    }
  }
});

test("Navigation: REGELN §14 nennt die Freigabe vom 2. Oktober 2026 und die Ausnahmen", () => {
  const regeln = lies("src/doppelspalt/REGELN.md");
  assert.match(regeln, /\*\*Navigation oben links\*\* \(freigegeben am 2\. Oktober 2026/);
  for (const wort of ["«Ornament Cloud»", "«Das Dritte Rad»", "Alpha-Übersicht", "ORMA", "werke/", "Buttons", "aria-current", "tests/navigation.test.mjs", "Anthrazit", "Sonnengelb", "feine Linie", "--hauptlink"]) assert.ok(regeln.split("**Navigation oben links**")[1].includes(wort), `§14 nennt ${wort}`);
});
