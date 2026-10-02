// «Das Dritte Rad» (alpha/drittes-rad/): Daten aktuell, vier Wege in jedem Schritt, Rückkehr ins Rad, jev beim Bauen bewertet,
// Auswahl nur mit ?rad=, kein Text im Rad, nichts von fremden Servern.
//   node --experimental-strip-types --no-warnings --test tests/drittes-rad.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");
const E = await import(new URL("alpha/drittes-rad/engine.js", root).href);
const { JEV } = await import(new URL("alpha/drittes-rad/jev.js", root).href);

const zufallsfolge = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const BEREICHE = ["zeit", "form", "farbe"];
const ART = { zeit: "strophe", form: "paar", farbe: "uebung" };
/** Adresse im Rad (…/alpha/drittes-rad/?t=…&f=…) zerlegen: Stand und offenes Stück */
function stand(url) {
  const u = new URL(url), [sl, pid, eid, ic, i_f] = u.searchParams.get("t").split("~");
  return { pfad: u.pathname, strophe: E.strophe(sl), paar: E.paar(pid), uebung: E.uebung(eid), ic: +ic, i_f: +i_f, fokus: u.searchParams.get("f") };
}
const stimmig = (s) => s.strophe && s.paar && s.uebung && E.THEMEN[s.ic]?.[0] === s.uebung.t && E.PERSONEN[s.i_f] && [s.paar.artistId, s.paar.theoristId].includes(E.PERSONEN[s.i_f].id);
/** Strophe und Konstellation, die jev nah beieinander sieht, ohne gemeinsames Wort und ohne gemeinsame Person */
function jevOhneWort() {
  for (const [i, s] of E.STROPHEN.entries()) for (const k of JEV.zf[i]) {
    const ps = E.profilStrophe(s), pp = E.profilPaar(E.KONSTELLATIONEN[k]);
    if (E.gemeinsam(ps.stems, pp.stems).wert < 3.2 && ![...ps.personen].some((p) => pp.personen.has(p))) return { s, c: E.KONSTELLATIONEN[k], ps, pp };
  }
  return null;
}

test("daten.js entspricht den Quellen (Zettelkasten, OMNA COLOR)", async () => {
  const b = await import(new URL("tools/build-drittes-rad.ts", root).href);
  for (const f of b.build()) assert.equal(lies(f.pfad), f.inhalt, `${f.pfad} veraltet: node --experimental-strip-types tools/build-drittes-rad.ts`);
});

// ---------- Versionsmarke: nach einer Aktualisierung keine alten Module aus dem Zwischenspeicher ----------
// GitHub Pages lässt Browser jede Datei zehn Minuten ohne Nachfrage behalten. Frische Seite plus altes Modul gibt «does not provide an export named …», und das Rad bleibt leer.
test("Versionsmarke: jeder Import eines Radmoduls trägt dieselbe, aktuelle Marke; Module ausserhalb der Marke gibt es nicht", async () => {
  const b = await import(new URL("tools/build-drittes-rad.ts", root).href);
  const marke = b.marke(Object.fromEntries(b.MODULE.map((n) => [n, lies(`alpha/drittes-rad/${n}`)])));
  assert.match(marke, /^[0-9a-f]{8}$/);
  const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*)["'](\.\/[^"'?]+)(\?v=[0-9a-f]{8})?["']/g;      // Importe innerhalb des Rad-Ordners (ORNA und symbols.js liegen ausserhalb und tragen keine Marke)
  const erwartet = { "index.html": 2, "engine.js": 2, "kacheln.js": 1, "weiter.js": 2 };
  assert.deepEqual([...b.MIT_MARKE].sort(), Object.keys(erwartet).sort(), "alle Dateien, die Radmodule importieren, werden gestempelt");
  for (const f of b.MIT_MARKE) {
    const importe = [...lies(`alpha/drittes-rad/${f}`).matchAll(IMPORT)];
    assert.equal(importe.length, erwartet[f], `${f}: Importe aus dem Rad-Ordner (neues Modul? dann in MODULE von tools/build-drittes-rad.ts aufnehmen)`);
    for (const [, datei, m] of importe) {
      assert.ok(b.MODULE.includes(datei.slice(2)), `${f}: ${datei} gehört nicht zu MODULE, die Marke würde es nicht erfassen`);
      assert.equal(m, `?v=${marke}`, `${f}: Import von ${datei} ohne aktuelle Marke (node --experimental-strip-types tools/build-drittes-rad.ts)`);
    }
  }
  const e = lies("alpha/drittes-rad/engine.js");
  assert.ok(!/(?<!\/)\/\/[^\n]*\bfrom\s+"\.\/(?:engine|kacheln|daten|jev)\.js"/.test(e), "kein auskommentierter Import mit alter Adresse");
  assert.ok(!lies("alpha/drittes-rad/daten.js").includes("?v="), "daten.js importiert nichts");
});

test("Versionsmarke: folgt dem Inhalt der Module (nicht den Marken selbst), Seite und weiter.js gehen nicht ein", async () => {
  const b = await import(new URL("tools/build-drittes-rad.ts", root).href);
  const d = Object.fromEntries(b.MODULE.map((n) => [n, lies(`alpha/drittes-rad/${n}`)]));
  const m = b.marke(d);
  assert.deepEqual([...b.MODULE].sort(), ["daten.js", "engine.js", "jev.js", "kacheln.js"], "die vier Module, die zusammen geladen werden müssen");
  // Fixpunkt: mit beliebigen oder ohne Marken im Text kommt dieselbe Marke heraus, und Stempeln ändert sie nicht
  const mit = (x) => Object.fromEntries(Object.entries(d).map(([n, t]) => [n, b.stempeln(t, x)]));
  assert.equal(b.marke(mit("00000000")), m);
  assert.equal(b.marke(mit("ffffffff")), m);
  assert.equal(b.marke(Object.fromEntries(Object.entries(d).map(([n, t]) => [n, t.replace(/\?v=[0-9a-f]{8}/g, "")]))), m);
  assert.equal(b.stempeln(b.stempeln('import x from "./engine.js";', "11111111"), "22222222"), 'import x from "./engine.js?v=22222222";');
  assert.equal(b.stempeln('import("../../portfolio/x/js/data/artists.js")', "11111111"), 'import("../../portfolio/x/js/data/artists.js")', "fremde Importe bleiben ohne Marke");
  // jede Änderung an einem Modul ergibt eine neue Marke, damit der Browser alle vier neu holt
  for (const n of b.MODULE) assert.notEqual(b.marke({ ...d, [n]: d[n] + "\n// geändert" }), m, `Änderung an ${n}`);
  assert.notEqual(b.marke({ ...d, "engine.js": d["engine.js"].replace('"./daten.js', '"./jev.js') }), m, "auch ein anderer Import ändert die Marke");
});

test("Hinweis bei Ladefehler: verborgen, erscheint nur ohne Meldung des Moduls, die Meldung ist die letzte Zeile des Moduls", () => {
  const seite = lies("alpha/drittes-rad/index.html");
  assert.match(seite, /<p class="bridge-note" id="ladefehler" role="alert" hidden>[^<]*Strg\+Umschalt\+R/, "Hinweis vorhanden, verborgen, nennt das harte Neuladen");
  const klassisch = seite.split("<script>")[1].split("</script>")[0];
  assert.match(klassisch, /addEventListener\("load"[\s\S]*if \(!window\.radGeladen\) document\.getElementById\("ladefehler"\)\.hidden = false/, "klassisches Skript: ohne radGeladen erscheint der Hinweis");
  assert.ok(seite.indexOf("<script>") < seite.indexOf('<script type="module">'), "das klassische Skript steht vor dem Modul und läuft auch, wenn das Modul nicht lädt");
  const modul = seite.split('<script type="module">')[1].split("</script>")[0];
  assert.match(modul.trimEnd(), /\nwindow\.radGeladen = true;[^\n]*$/, "window.radGeladen = true ist die letzte Zeile des Moduls");
  assert.equal(modul.match(/radGeladen/g).length, 1);
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
  assert.equal(E.nameVon("judith-butler"), "Judith Butler");
  assert.ok(!/^[a-z]+(-[a-z]+)+$/.test(E.nameVon("aleida-assmann")), "auch Personen ausserhalb von ORNA tragen ihren Namen, nicht ihre Adresse");
});

// ---------- jev: beim Bauen bewertet, in jev.js abgelegt ----------
test("jev.js: Prüfsumme passt zu den Beständen, die sechs Listen haben die richtige Form", () => {
  assert.match(JEV.pruefsumme, /^[0-9a-f]{8}$/);
  assert.equal(JEV.pruefsumme, E.PRUEFSUMME, "Strophen, Konstellationen oder Übungen haben sich geändert: node --experimental-strip-types --no-warnings tools/build-jev-bruecken.ts");
  assert.equal(E.JEV_GUELTIG, true);
  assert.match(JEV.modell, /^jev-/);
  // [Anzahl Stücke, Anzahl möglicher Nachbarn]: z = Strophen, f = Konstellationen, c = Übungen
  const form = { zf: [49, 326], zc: [49, 180], fz: [326, 49], fc: [326, 180], cz: [180, 49], cf: [180, 326] };
  for (const [k, [n, max]] of Object.entries(form)) {
    assert.equal(JEV[k].length, n, k);
    for (const l of JEV[k]) {
      assert.equal(l.length, 8, `${k}: acht Nachbarn je Stück`);
      assert.equal(new Set(l).size, 8, `${k}: keine Doppelten`);
      assert.ok(l.every((i) => Number.isInteger(i) && i >= 0 && i < max), `${k}: Nummern im Bestand`);
    }
  }
});

test("jev wird nur beim Bauen gefragt: kein Aufruf aus Seite, Engine oder Leiste, kein Schlüssel in den Dateien", async () => {
  for (const f of ["alpha/drittes-rad/index.html", "alpha/drittes-rad/engine.js", "alpha/drittes-rad/kacheln.js", "alpha/drittes-rad/weiter.js", "alpha/drittes-rad/jev.js"]) {
    const t = lies(f);
    assert.ok(!/\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|typesafe/i.test(t.replace(/^\s*\/\/.*$/gm, "")), `${f}: keine Aufrufe nach aussen`);
  }
  const werkzeug = lies("tools/build-jev-bruecken.ts");
  assert.ok(!/Bearer\s+[A-Za-z0-9_-]{16,}|sk-[A-Za-z0-9]{16,}/.test(werkzeug + lies("alpha/drittes-rad/jev.js")), "kein Schlüssel im Quelltext");
  assert.match(werkzeug, /process\.env\.TYPESAFE_API_KEY/, "Schlüssel nur aus der Umgebung");
  const m = await import(new URL("tools/build-jev-bruecken.ts", root).href);       // Einlesen allein ruft nichts auf und schreibt nichts
  assert.equal(typeof m.main, "function");
});

test("jev wirkt: nennt jev eine Nähe, steht sie als Grund da, trägt über die Schwelle und kommt in die Fäden", () => {
  const f = jevOhneWort();
  assert.ok(f, "es gibt Paare, die nur jev nah beieinander sieht");
  assert.match(E.grund(f.ps, f.pp), /^jev sieht eine Nähe, auch ohne gemeinsames Wort$/);
  const w = E.beste(f.ps, "form", { nur: (x) => x === f.c, loseAnteil: 0, zufall: () => 0.5 });
  assert.equal(w.item, f.c);
  assert.equal(w.los, false, "jevs Nähe allein genügt als Zusammenhang");
  assert.match(w.grund, /jev sieht/);
  const zeilen = E.faeden(f.s, f.c, E.UEBUNGEN[0]);
  assert.ok(zeilen.some((t) => /^jev sieht Zeit und Form nah beieinander, auch ohne gemeinsames Wort\.$/.test(t)), zeilen.join(" | "));
  // Gegenprobe: ohne Nennung, ohne Wort, ohne Person bleibt es beim Los
  const nr = E.STROPHEN.indexOf(f.s);
  const fremd = E.KONSTELLATIONEN.find((c, k) => !JEV.zf[nr].includes(k) && !(JEV.fz[k] || []).includes(nr) && E.gemeinsam(f.ps.stems, E.profilPaar(c).stems).wert < 3.2 && !f.ps.personen.has(c.artistId) && !f.ps.personen.has(c.theoristId));
  const los = E.beste(f.ps, "form", { nur: (x) => x === fremd, loseAnteil: 0, zufall: () => 0.5 });
  assert.equal(los.los, true);
  assert.equal(los.grund, "Los, ohne erkennbaren Zusammenhang");
});

test("Nähe innerhalb eines Bereichs: Anklänge der Strophen, gleiches und benachbartes Thema bei OMNA COLOR", () => {
  const s = E.STROPHEN.find((x) => (x.v || []).length), an = E.STROPHEN.find((x) => x.n === s.v[0]);
  assert.match(E.grund(E.profilStrophe(s), E.profilStrophe(an)), /ein Anklang im Zettelkasten/);
  const e = E.UEBUNGEN.find((x) => (x.nb || []).length), gleich = E.UEBUNGEN.find((x) => x !== e && x.t === e.t), nach = E.UEBUNGEN.find((x) => x.t === e.nb[0]);
  assert.match(E.grund(E.profilUebung(e), E.profilUebung(gleich)), new RegExp(`gleiches Thema «${e.t}»`));
  assert.match(E.grund(E.profilUebung(e), E.profilUebung(nach)), new RegExp(`Nachbarthema «${e.nb[0]}»`));
});

// ---------- Ziehung, Brücke ----------
test("Ziehung: Strophe aus dem Zyklus, Konstellation mit der Person, Übung aus dem Thema (alle Sektoren)", () => {
  const z = zufallsfolge(11);
  for (let iz = 0; iz < 7; iz++) for (let ic = 0; ic < 7; ic++) {
    const i_f = (iz * 7 + ic) % 40, r = E.ziehung(iz, i_f, ic, z);
    assert.equal(r.strophe.c, E.ZYKLEN[iz][0]);
    assert.ok([E.nrVon(r.paar.artistId), E.nrVon(r.paar.theoristId)].includes(i_f));
    assert.equal(r.uebung.t, E.THEMEN[ic][0]);
  }
});

test("Brücke: drei Wege (Person, jev, Los), die Person gehört zur Konstellation, Adressen und Notizen stimmen", () => {
  const z = zufallsfolge(5), nach = { person: 0, jev: 0, los: 0 };
  for (let i = 0; i < 600; i++) {
    const b = E.bruecke(z);
    assert.ok(b.notiz.length > 20 && b.strophe && b.paar && b.uebung);
    assert.ok([b.paar.artistId, b.paar.theoristId].includes(b.person), "die Person gehört zur Konstellation");
    assert.notEqual(E.nrVon(b.person), undefined, "und hat ein Zeichen im Rad");
    nach[b.quelle]++;
    assert.equal(b.absurd, b.quelle === "los", "nur das Los ist absurd");
    if (b.quelle === "los") assert.match(b.notiz, /^Eine absurde Brücke/);
    if (b.quelle === "person") {
      assert.match(b.notiz, /^Brücke: /);
      assert.ok(b.strophe.r.some((r) => r.s === b.person), "die Strophe nennt die Person");
    }
    if (b.quelle === "jev") {
      assert.match(b.notiz, /^Brücke nach jev: /);
      const k = E.KONSTELLATIONEN.indexOf(b.paar);
      assert.ok(JEV.zf[E.STROPHEN.indexOf(b.strophe)].slice(0, 5).includes(k), "die Konstellation steht in jevs Liste zur Strophe");
      assert.ok(JEV.fc[k].slice(0, 5).includes(E.UEBUNGEN.indexOf(b.uebung)), "die Übung steht in jevs Liste zur Konstellation");
    }
  }
  assert.ok(nach.person > 0 && nach.jev > 0 && nach.los > 0, JSON.stringify(nach));
});

// ---------- vier Wege ----------
test("Vier Wege auf den Originalseiten (Rad, Zettelkasten, ORNA, OMNA COLOR): feste Reihenfolge, der eigene Bereich zeigt «hier», alle führen ins Rad", () => {
  const z = zufallsfolge(3);
  const fälle = [
    [{ art: "strophe", slug: E.STROPHEN[12].s, bereich: "zeit" }, "zeit"],
    [{ art: "paar", id: E.KONSTELLATIONEN[7].id, bereich: "form" }, "form"],
    [{ art: "uebung", id: E.UEBUNGEN[40].id, bereich: "farbe" }, "farbe"],
    [{ art: "person", slug: "donna-haraway", bereich: "zeit" }, "zeit"],
    [{ bereich: "zeit" }, "zeit"], [{ bereich: "form" }, "form"], [{ bereich: "farbe" }, "farbe"],
  ];
  for (const [a, hier] of fälle) {
    const w = E.wege(a, { zufall: z });
    assert.deepEqual(w.map((x) => x.bereich), ["rad", ...BEREICHE], JSON.stringify(a));
    assert.deepEqual(w.filter((x) => x.hier).map((x) => x.bereich), [hier], "nur der eigene Bereich ist «hier»");
    for (const x of w) {
      assert.ok(x.url.startsWith(E.adresse.start) && !x.url.includes("rad=1"), `${x.bereich}: führt in die Radseite, nicht ins Original`);
      assert.ok(x.titel && x.grund, x.bereich);
    }
    for (const b of BEREICHE) {
      const s = stand(w.find((x) => x.bereich === b).url);
      assert.ok(stimmig(s), `${b}: gültiger Stand`);
      assert.equal(s.fokus, b, `${b}: öffnet das Stück dieses Bereichs`);
    }
    if (a.art && a.art !== "person") {
      const x = stand(w.find((t) => t.bereich === hier).url), key = ART[hier];
      assert.notEqual(x[key], (a.art === "strophe" ? E.strophe(a.slug) : a.art === "paar" ? E.paar(a.id) : E.uebung(a.id)), "im eigenen Bereich kommt ein anderes Stück");
    }
  }
  assert.match(E.adresse.start, /alpha\/drittes-rad\/$/);
});

test("Der Weg ins Rad zurück trägt das Stück als Anker, ohne Stück dreht das Rad frei", () => {
  const rad = (a) => E.wege(a, { zufall: zufallsfolge(1) })[0];
  assert.equal(rad({ art: "strophe", slug: "13-das-archiv", bereich: "zeit" }).url, `${E.adresse.start}?von=strophe~13-das-archiv`);
  assert.equal(rad({ art: "paar", id: "sol-lewitt__henri-bergson", bereich: "form" }).url, `${E.adresse.start}?von=paar~sol-lewitt__henri-bergson`);
  assert.equal(rad({ art: "uebung", id: "040", bereich: "farbe" }).url, `${E.adresse.start}?von=uebung~040`);
  assert.equal(rad({ art: "person", slug: "donna-haraway", bereich: "zeit" }).url, `${E.adresse.start}?von=person~donna-haraway`);
  const frei = rad({ bereich: "zeit" });
  assert.equal(frei.url, `${E.adresse.start}?von=los`);
  assert.match(frei.grund, /dreht frei weiter/);
  assert.match(rad({ art: "strophe", slug: "13-das-archiv", bereich: "zeit" }).grund, /dreht von «Das Archiv» aus weiter/);
});

test("Vier Wege im Rad: die beiden anderen Bereiche öffnen, was schon im Stand liegt, der offene bringt ein neues, verwandtes Stück", () => {
  const z = zufallsfolge(9);
  for (let i = 0; i < 40; i++) {
    const i_f = (i * 7) % 40, st = { ...E.ziehung(i % 7, i_f, (i * 3) % 7, z), person: E.PERSONEN[i_f].id };
    for (const fokus of BEREICHE) {
      const w = E.wegeImSpiel(st, fokus, { zufall: z });
      assert.deepEqual(w.map((x) => x.bereich), ["rad", ...BEREICHE]);
      assert.deepEqual(w.filter((x) => x.hier).map((x) => x.bereich), [fokus]);
      assert.ok(w.every((x) => x.titel && x.grund && x.url.startsWith(E.adresse.start)));
      for (const b of BEREICHE.filter((b) => b !== fokus)) {
        const s = stand(w.find((x) => x.bereich === b).url);
        assert.deepEqual([s.strophe, s.paar, s.uebung, s.i_f, s.fokus], [st.strophe, st.paar, st.uebung, i_f, b], `${fokus} → ${b}: dasselbe Stück wie im Rad`);
      }
      const neu = stand(w.find((x) => x.bereich === fokus).url);
      assert.ok(stimmig(neu) && neu.fokus === fokus);
      assert.notEqual(neu[ART[fokus]], st[ART[fokus]], "ein anderes Stück derselben Art");
      const anker = { zeit: st.strophe.s, form: st.paar.id, farbe: st.uebung.id }[fokus];
      assert.equal(w[0].url, `${E.adresse.start}?von=${ART[fokus]}~${encodeURIComponent(anker)}`, "das offene Stück ist der Anker der Rückkehr");
    }
  }
});

test("Zurück ins Rad: das Stück bleibt liegen, die anderen kommen dazu, die Person gehört zur Konstellation und hat ein Zeichen", () => {
  const z = zufallsfolge(21);
  const prüfe = (r) => {
    assert.ok(r && r.strophe && r.paar && r.uebung && r.person);
    assert.ok([r.paar.artistId, r.paar.theoristId].includes(r.person), "die Person gehört zur Konstellation");
    assert.notEqual(E.nrVon(r.person), undefined, "und hat ein Zeichen im Rad");
    assert.equal(r.absurd, false);
    assert.match(r.notiz, /^Zurück im Rad: /);
    return r;
  };
  for (const s of E.STROPHEN) for (let i = 0; i < 3; i++) assert.equal(prüfe(E.rueckkehr({ art: "strophe", slug: s.s }, z)).strophe, s);
  for (const c of E.KONSTELLATIONEN) assert.equal(prüfe(E.rueckkehr({ art: "paar", id: c.id }, z)).paar, c);
  for (const e of E.UEBUNGEN) assert.equal(prüfe(E.rueckkehr({ art: "uebung", id: e.id }, z)).uebung, e);
  const slugs = new Set(E.STROPHEN.flatMap((s) => s.r.map((r) => r.s)));          // auch Personen, die ORNA nicht kennt
  for (const slug of slugs) {
    const r = prüfe(E.rueckkehr({ art: "person", slug }, z));
    assert.ok(r.strophe.r.some((x) => x.s === slug), `die Strophe nennt ${slug}`);
    if (E.nrVon(slug) !== undefined) assert.equal(r.person, slug, "eine ORNA-Person bleibt die Person im Zeichenring");
  }
  for (const a of [null, { art: "strophe", slug: "gibt-es-nicht" }, { art: "paar", id: "x__y" }, { art: "uebung", id: "999" }, { art: "unbekannt", id: "1" }]) assert.equal(E.rueckkehr(a, z), null, JSON.stringify(a));
});

test("Zurück ins Rad mit Vorgabe: gewünschte Person und Konstellation werden eingehalten", () => {
  const z = zufallsfolge(33);
  // Strophe, die zwei ORNA-Personen nennt: «→ in ORNA» für die zweite
  const s = E.STROPHEN.find((x) => new Set(x.r.map((r) => r.s).filter((id) => E.nrVon(id) !== undefined)).size >= 2);
  const namen = [...new Set(s.r.map((r) => r.s).filter((id) => E.nrVon(id) !== undefined))];
  for (const p of namen) for (let i = 0; i < 5; i++) {
    const r = E.rueckkehr({ art: "strophe", slug: s.s }, z, { person: p });
    assert.equal(r.strophe, s);
    assert.equal(r.person, p);
    assert.ok([r.paar.artistId, r.paar.theoristId].includes(p));
  }
  // Konstellation und Person festgelegt (so öffnet «Im Zettelkasten» die Strophe zur gerade offenen Begegnung)
  const c = E.KONSTELLATIONEN.find((k) => s.r.some((r) => r.s === k.artistId));
  const r = E.rueckkehr({ art: "strophe", slug: s.s }, z, { person: c.artistId, paar: c });
  assert.deepEqual([r.strophe, r.paar, r.person], [s, c, c.artistId]);
  // Konstellation als Anker, Person vorgegeben: die Strophe nennt sie, soweit eine sie nennt
  for (const id of [c.artistId, c.theoristId]) {
    const t = E.rueckkehr({ art: "paar", id: c.id }, z, { person: id });
    assert.equal(t.paar, c);
    assert.equal(t.person, id);
    if (E.STROPHEN.some((x) => x.r.some((y) => y.s === id))) assert.ok(t.strophe.r.some((y) => y.s === id), "die Strophe nennt die gewählte Person");
  }
});

test("Adressen im Rad: Stand und offenes Stück lassen sich wiederherstellen", () => {
  const z = zufallsfolge(2);
  for (let i = 0; i < 30; i++) {
    const r = E.bruecke(z), st = { strophe: r.strophe, paar: r.paar, uebung: r.uebung, person: r.person };
    for (const fokus of [undefined, ...BEREICHE]) {
      const u = E.adresse.spiel(st, fokus), s = stand(u);
      assert.ok(u.startsWith(E.adresse.start + "?t="));
      assert.deepEqual([s.strophe, s.paar, s.uebung, s.fokus], [st.strophe, st.paar, st.uebung, fokus ?? null]);
      assert.equal(E.PERSONEN[s.i_f].id, st.person);
      assert.equal(s.ic, E.THEMEN.findIndex((t) => t[0] === st.uebung.t));
    }
  }
  assert.equal(E.adresse.rad(null), `${E.adresse.start}?von=los`);
  assert.match(E.adresse.strophe(E.STROPHEN[0]), /zu-seiner-zeit\/strophe\/1-[^/]+\/\?rad=1$/);
  assert.match(E.adresse.paar(E.KONSTELLATIONEN[0]), /portfolio\/nebeneinander-nacheinander\/\?pair=[^&]+&rad=1$/);
  assert.match(E.adresse.uebung(E.UEBUNGEN[0]), /alpha\/omna-color\/\?u=\d+&rad=1$/);
});

test("Fäden: gemeinsame Person wird genannt", () => {
  const s = E.STROPHEN.find((x) => x.r.some((r) => E.nrVon(r.s) !== undefined));
  const person = s.r.find((r) => E.nrVon(r.s) !== undefined).s;
  const c = E.KONSTELLATIONEN.find((k) => k.artistId === person || k.theoristId === person);
  const f = E.faeden(s, c, E.UEBUNGEN[0]);
  assert.ok(f.some((t) => t.includes(E.nameVon(person))), f.join(" | "));
});

// ---------- Seiten ----------
test("Gestaltung: im Rad selbst kein Text und keine Zahlen, die Schrift ist Instrument Sans wie in den anderen Fassungen", () => {
  const seite = lies("alpha/drittes-rad/index.html");
  assert.ok(!/<text[\s>]|<textPath|<tspan|<foreignObject/i.test(seite), "kein Text im Rad (SVG)");
  assert.match(seite, /--body: "Instrument Sans"/);
  assert.match(seite, /<link rel="stylesheet" href="\.\.\/\.\.\/vendor\/fonts\/fonts\.css">/, "die lokal eingebundene Schrift");
  const alles = seite + lies("alpha/drittes-rad/kacheln.js") + lies("alpha/drittes-rad/weiter.js");
  assert.ok(!/(?<!sans-)\bserif\b|Newsreader|Georgia|Cormorant|Palatino|italic/i.test(alles.replace(/<!--[\s\S]*?-->/g, "")), "keine Serifen, keine Kursive");
  assert.ok(!/ZYKLEN\[[^\]]*\]\[0\]|romisch|römisch/i.test(seite.split("// ---- Zeit:")[1].split("// ---- Form:")[0]), "keine römischen Zahlen im Zeitring");
});

test("Schlichte Seite (Wunsch vom 2. Oktober 2026): nichts unter dem Titel, «Brücke» wie «Drehen», kein «Zurück zum Start», kein Kasten «Fäden», keine Links zu den Originalseiten", () => {
  const seite = lies("alpha/drittes-rad/index.html");
  assert.match(seite, /<header>\s*<h1>Das Dritte Rad<\/h1>\s*<\/header>/, "unter dem Titel steht nichts");
  assert.match(seite, /<button class="go" id="go" type="button">Drehen<\/button><button class="go" id="bridge" type="button" aria-label="Brücke schlagen">Brücke<\/button><\/div>/, "zwei gleich gestaltete Knöpfe, sonst keiner");
  for (const f of ["index.html", "engine.js", "kacheln.js", "weiter.js"])
    assert.ok(!/Zurück zum Start|id="start"|drad-start|class="quiet start"/.test(lies(`alpha/drittes-rad/${f}`)), `${f}: kein «Zurück zum Start»`);
  assert.ok(!/id="faeden"|\.faeden|\bfaeden\(|text: "Fäden"/.test(seite), "kein Kasten «Fäden» auf der Seite");
  assert.ok(!/öffnen ↗|class: "original"|\.original\b|adresse\.(strophe|paar|uebung)\(/.test(seite), "keine Links zu den Originalseiten («… öffnen ↗»)");
  assert.equal(typeof E.faeden, "function", "die Funktion bleibt im Modul, damit eine ältere Seite im Zwischenspeicher keinen Export vermisst");
});

test("Weitergehen vorn, keine Texteingaben (Wunsch vom 2. Oktober 2026): die vier Wege über dem offenen Stück, kein Satzfeld", () => {
  const seite = lies("alpha/drittes-rad/index.html");
  const html = seite.slice(seite.indexOf("<body>"), seite.indexOf("<script"));
  assert.ok(html.indexOf('id="wege"') > 0 && html.indexOf('id="wege"') < html.indexOf('id="lese"'), "#wege steht vor #lese: oben der Weg weiter, darunter das Stück");
  assert.ok(!/<textarea|<input|<label|contenteditable|id="satz"|Ein Satz, der|\$\("satz"\)|class="satz"|\.satz\b|textarea\s*\{/.test(seite), "kein Textfeld, keine Beschriftung eines Textfelds, kein Rest davon im Skript oder in den Regeln");
  assert.match(html, /<div class="row">\s*<button class="quiet" id="copy" type="button">Karte kopieren<\/button>\s*<button class="quiet" id="again" type="button">Noch einmal drehen<\/button>\s*<\/div>/, "unter den Karten bleiben die beiden leisen Knöpfe");
  assert.match(seite, /\$\("wege"\)\.replaceChildren\(h\("h2", \{ text: "Wie geht es weiter\?" \}\)/, "die Überschrift der Wege steht vor der Überschrift des Stücks und ist darum eine h2");
});

test("Seiten: nichts von fremden Servern, Auswahl nur mit ?rad=, kein Eintrag in der Sitemap", () => {
  const seite = lies("alpha/drittes-rad/index.html");
  assert.ok(!/(src|href)="https?:\/\/(?!ornament-cloud\.goatcounter)/.test(seite), "keine fremden Server");
  assert.match(seite, /<meta name="robots" content="noindex/);
  assert.match(seite, /<a href="\.\.\/\.\.\/">Ornament Cloud<\/a> · <a href="\.\.\/">Alpha<\/a>/);
  assert.match(lies("zu-seiner-zeit/zsz.js"), /\[\?&\]rad=\/\.test\(location\.search\)\) import\("\.\.\/alpha\/drittes-rad\/weiter\.js"\)/);
  assert.match(lies("portfolio/nebeneinander-nacheinander/index.html"), /\[\?&\]rad=\/\.test\(location\.search\)\) import\("\.\.\/\.\.\/alpha\/drittes-rad\/weiter\.js"\)/);
  assert.match(lies("alpha/omna-color/index.html"), /\[\?&\]rad=\/\.test\(location\.search\)\) import\("\.\.\/drittes-rad\/weiter\.js"\)/);
  assert.ok(!lies("sitemap.xml").includes("drittes-rad"));
  for (const f of ["alpha/drittes-rad/weiter.js", "alpha/drittes-rad/kacheln.js", "alpha/drittes-rad/engine.js"])
    assert.ok(!/https?:\/\//.test(lies(f).replace(/\/\/ .*$/gm, "")), `${f} lädt nichts von aussen`);
});
