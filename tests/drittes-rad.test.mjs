// «Das Dritte Rad» (alpha/drittes-rad/): Daten aktuell, Verknüpfung stimmig, Auswahl nur mit ?rad=, nichts von fremden Servern.
//   node --experimental-strip-types --no-warnings --test tests/drittes-rad.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");
const E = await import(new URL("alpha/drittes-rad/engine.js", root).href);

const zufallsfolge = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

test("daten.js entspricht den Quellen (Zettelkasten, OMNA COLOR)", async () => {
  const b = await import(new URL("tools/build-drittes-rad.ts", root).href);
  for (const f of b.build()) assert.equal(lies(f.pfad), f.inhalt, `${f.pfad} veraltet: node --experimental-strip-types tools/build-drittes-rad.ts`);
});

test("Bestand: 40 Personen, 326 Konstellationen, 49 Strophen mit Volltext, 180 Übungen, 7 Zyklen und 7 Themen", () => {
  assert.equal(E.PERSONEN.length, 40);
  assert.equal(E.KONSTELLATIONEN.length, 326);
  assert.equal(E.STROPHEN.length, 49);
  assert.ok(E.STROPHEN.every((s) => s.x.length > 200 && s.s && s.b), "Volltext, Adresse und Leitsatz je Strophe");
  assert.equal(E.UEBUNGEN.length, 180);
  assert.equal(E.ZYKLEN.length, 7);
  assert.equal(E.THEMEN.length, 7);
  assert.ok(E.UEBUNGEN.every((u) => E.THEMEN.some((t) => t[0] === u.t)), "jede Übung hat ein bekanntes Thema");
  for (let i = 0; i < 40; i++) assert.ok(E.paareVon(i).length >= 1, `Person ${i} hat Konstellationen`);
  for (const [r] of E.ZYKLEN) assert.ok(E.strophenAus(r).length === 7, `Zyklus ${r} hat sieben Strophen`);
  for (const [t] of E.THEMEN) assert.ok(E.uebungenAus(t).length >= 1, `Thema ${t} hat Übungen`);
});

test("Namen zählen nicht als gemeinsame Wörter, Befehle auch nicht", () => {
  const w = E.woerter("Judith Butler schreibt. Wähle einen Gegenstand und zeichne die Wiederholung, bevor du Verbindungen herstellst.");
  const stämme = [...w.values()];
  assert.ok(stämme.includes("Wiederholung") && stämme.includes("Gegenstand") && stämme.includes("Verbindungen"));
  assert.ok(!stämme.includes("Judith") && !stämme.includes("Butler") && !stämme.includes("Wähle"));
  assert.equal(E.stamm("wiederholungen"), E.stamm("wiederholung"));
});

test("Ziehung: Strophe aus dem Zyklus, Konstellation mit der Person, Übung aus dem Thema (alle Sektoren)", () => {
  const z = zufallsfolge(11);
  for (let iz = 0; iz < 7; iz++) for (let ic = 0; ic < 7; ic++) {
    const i_f = (iz * 7 + ic) % 40, r = E.ziehung(iz, i_f, ic, z);
    assert.equal(r.strophe.c, E.ZYKLEN[iz][0]);
    assert.ok([E.nrVon(r.paar.artistId), E.nrVon(r.paar.theoristId)].includes(i_f));
    assert.equal(r.uebung.t, E.THEMEN[ic][0]);
  }
});

test("Brücke: Strophe nennt die Person der Konstellation (ausser bei der absurden Brücke), Adressen stimmen", () => {
  const z = zufallsfolge(5);
  let echt = 0, absurd = 0;
  for (let i = 0; i < 300; i++) {
    const b = E.bruecke(z);
    assert.ok(b.notiz.length > 20 && b.strophe && b.paar && b.uebung);
    if (b.absurd) { absurd++; continue; }
    echt++;
    assert.ok(b.strophe.r.some((r) => r.s === b.person), "die Strophe nennt die Person");
    assert.ok([b.paar.artistId, b.paar.theoristId].includes(b.person), "die Konstellation enthält die Person");
  }
  assert.ok(echt > 0 && absurd > 0, "echte und absurde Brücken kommen vor");
});

test("Auswahl auf den Zielseiten: höchstens zwei Wege, in den beiden anderen Bereichen, mit ?rad=1", () => {
  const z = zufallsfolge(3), W = E.WURZEL;
  const fälle = [
    [{ art: "strophe", slug: E.STROPHEN[12].s }, ["form", "farbe"]],
    [{ art: "paar", id: E.KONSTELLATIONEN[7].id }, ["zeit", "farbe"]],
    [{ art: "uebung", id: E.UEBUNGEN[40].id }, ["zeit", "form"]],
    [{ art: "person", slug: "donna-haraway" }, ["form", "farbe"]],
    [{ bereich: "form" }, ["zeit", "farbe"]],
    [{ bereich: "zeit" }, ["form", "farbe"]],
  ];
  for (const [a, soll] of fälle) {
    const w = E.wege(a, { zufall: z });
    assert.deepEqual(w.map((x) => x.bereich), soll, JSON.stringify(a));
    for (const x of w) { assert.ok(x.url.startsWith(W) && x.url.includes("rad=1")); assert.ok(x.titel && x.grund); }
  }
  assert.match(E.adresse.start, /alpha\/drittes-rad\/$/);
});

test("Fäden: gemeinsame Person wird genannt", () => {
  const s = E.STROPHEN.find((x) => x.r.some((r) => E.nrVon(r.s) !== undefined));
  const person = s.r.find((r) => E.nrVon(r.s) !== undefined).s;
  const c = E.KONSTELLATIONEN.find((k) => k.artistId === person || k.theoristId === person);
  const f = E.faeden(s, c, E.UEBUNGEN[0]);
  assert.ok(f.some((t) => t.includes(E.nameVon(person))), f.join(" | "));
});

test("Seiten: nichts von fremden Servern, jev bleibt aus, Auswahl nur mit ?rad=, kein Eintrag in der Sitemap", () => {
  const seite = lies("alpha/drittes-rad/index.html");
  assert.ok(!/(src|href)="https?:\/\/(?!ornament-cloud\.goatcounter)/.test(seite), "keine fremden Server");
  assert.match(seite, /const JEV_URL = "";/);
  assert.match(seite, /<meta name="robots" content="noindex/);
  assert.match(seite, /<a href="\.\.\/\.\.\/">Ornament Cloud<\/a> · <a href="\.\.\/">Alpha<\/a>/);
  assert.match(lies("zu-seiner-zeit/zsz.js"), /\[\?&\]rad=\/\.test\(location\.search\)\) import\("\.\.\/alpha\/drittes-rad\/weiter\.js"\)/);
  assert.match(lies("portfolio/nebeneinander-nacheinander/index.html"), /\[\?&\]rad=\/\.test\(location\.search\)\) import\("\.\.\/\.\.\/alpha\/drittes-rad\/weiter\.js"\)/);
  assert.match(lies("alpha/omna-color/index.html"), /\[\?&\]rad=\/\.test\(location\.search\)\) import\("\.\.\/drittes-rad\/weiter\.js"\)/);
  assert.ok(!lies("sitemap.xml").includes("drittes-rad"));
  const weiter = lies("alpha/drittes-rad/weiter.js");
  assert.ok(!/https?:\/\//.test(weiter.replace(/\/\/ .*$/gm, "")), "weiter.js lädt nichts von aussen");
});
