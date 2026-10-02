// Navigation oben links (Wunsch von Christian, freigegeben am 2. Oktober 2026, REGELN §14):
// Jede Seite trägt oben links «Ornament Cloud» (zur Startseite) und darunter «Das Dritte Rad» (zum Start des Rads).
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
    const links = [...navs[0][1].matchAll(/<a href="([^"]+)"( aria-current="page")?>([^<]+)<\/a>/g)];
    assert.deepEqual(links.map((l) => l[3]), ["Ornament Cloud", "Das Dritte Rad"], `${p}: zwei Links in dieser Reihenfolge`);
    assert.equal(navs[0][1].replace(/<a [^>]*>[^<]*<\/a>/g, "").trim(), "", `${p}: sonst nichts in der Navigation`);
    const von = new URL(p, "http://x/");
    const ziel = links.map((l) => new URL(l[1], von).pathname);
    assert.deepEqual(ziel, ["/", "/alpha/drittes-rad/"], `${p}: Startseite und Start des Rads`);
    for (const z of ziel) assert.ok(existsSync(new URL(z.slice(1) + "index.html", root)), `${p}: ${z} gibt es`);
    assert.deepEqual(links.map((l) => !!l[2]), [p === "index.html", p === "alpha/drittes-rad/index.html"], `${p}: aria-current nur auf der eigenen Seite`);
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

test("Navigation: die beiden Links sind farblich getrennt (Orange, Violett) und auf jeder Seite genau so gesetzt wie auf der Website (Wunsch von Christian, 2. Oktober 2026)", () => {
  for (const p of seiten) {
    const css = cssVon(p), html = lies(p);
    const erster = css.match(/\.seitenweg a \{([^}]*)\}/);
    assert.ok(erster, `${p}: Regel für den ersten Link`);
    assert.match(erster[1], /color:\s*var\(--(accent|weg-start)\)/, `${p}: «Ornament Cloud» in Orange`);
    assert.match(css, /\.seitenweg a \+ a \{[^}]*color:\s*var\(--weg-rad\)/, `${p}: «Das Dritte Rad» in Violett, davon getrennt`);
    assert.match(css, /--weg-rad:\s*#[0-9a-f]{6}/i, `${p}: das Violett ist festgelegt`);
    assert.match(erster[1], /text-transform:\s*uppercase/, `${p}: Grossbuchstaben wie auf der Website`);
    assert.match(erster[1], /font-weight:\s*600|font:\s*600\s/, `${p}: Gewicht 600 wie auf der Website`);
    assert.match(erster[1], /font-size:\s*0?\.8rem|font:\s*600\s+0?\.8rem/, `${p}: Schriftgrösse 0,8 rem wie auf der Website`);
    assert.match(erster[1], /letter-spacing:\s*0?\.12em/, `${p}: Laufweite 0,12 em wie auf der Website`);
    if (!/<link rel="stylesheet" href="[^"]*styles\.css/.test(html)) assert.match(erster[1], /system-ui, -apple-system, "Segoe UI", Roboto/, `${p}: dieselbe Schrift wie auf der Website`);
  }
  // das Violett und das Orange sind je ein Wert für hell und für dunkel, überall derselbe
  const werte = (p, name) => [...cssVon(p).matchAll(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, "gi"))].map((m) => m[1].toLowerCase());
  const sammlung = (name) => new Set(seiten.flatMap((p) => werte(p, name)));
  assert.deepEqual([...sammlung("--weg-rad")].sort(), ["#5b3fc4", "#a794ff"], "Violett: hell #5b3fc4, dunkel #a794ff");
  assert.deepEqual([...sammlung("--weg-start")].sort(), ["#c2410c", "#f08a5d"], "Orange: hell #c2410c, dunkel #f08a5d (auf der Website der Akzent)");
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
  for (const wort of ["«Ornament Cloud»", "«Das Dritte Rad»", "Alpha-Übersicht", "ORMA", "werke/", "tests/navigation.test.mjs"]) assert.ok(regeln.split("**Navigation oben links**")[1].includes(wort), `§14 nennt ${wort}`);
});
