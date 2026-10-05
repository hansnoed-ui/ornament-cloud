// RSS-Feed (feed.xml): Er wird aus news/index.html erzeugt und darf nicht von Hand geändert werden.
// Dieser Test hält beides zusammen — er meldet, wenn ein Eintrag auf der News-Seite ergänzt oder
// geändert wurde, ohne den Feed neu zu bauen, und prüft, dass der Feed selbst gültig bleibt.
//   node --experimental-strip-types --no-warnings --test tests/feed.test.mjs
// Neu bauen:
//   node --experimental-strip-types tools/build-feed.ts
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lesen, feed } from "../tools/build-feed.ts";

const wurzel = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, wurzel), "utf8");
const news = lies("news/index.html");
const xml = lies("feed.xml");
const eintraege = lesen(news);

test("Jeder Beitrag der News-Seite hat eine eigene id", () => {
  assert.ok(eintraege.length > 0, "news/index.html enthält keinen Beitrag");
  const ids = eintraege.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, `Doppelte id: ${ids.join(", ")}`);
  for (const id of ids) {
    assert.match(id, /^[a-z0-9-]+$/, `id «${id}»: nur Kleinbuchstaben, Ziffern und Bindestriche`);
  }
});

test("feed.xml ist auf dem Stand von news/index.html", () => {
  // Das Baudatum wird ausgeklammert: Es ändert sich täglich und sagt nichts über den Inhalt.
  const ohneDatum = (s) => s.replace(/<lastBuildDate>[^<]*<\/lastBuildDate>/, "");
  const erwartet = feed(eintraege, new Date());
  assert.equal(ohneDatum(xml), ohneDatum(erwartet),
    "feed.xml weicht von news/index.html ab. Neu bauen: node --experimental-strip-types tools/build-feed.ts");
});

test("Der Feed trägt Kanalangaben und die Selbstadresse", () => {
  for (const stueck of [
    "<rss version=\"2.0\"",
    "<title>Ornament Cloud</title>",
    "<link>https://ornament.cloud/news/</link>",
    "rel=\"self\"",
    "<language>de-ch</language>",
  ]) {
    assert.ok(xml.includes(stueck), `feed.xml fehlt: ${stueck}`);
  }
});

test("Jeder Eintrag hat Titel, Adresse, unveränderliche guid und ein Datum", () => {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  assert.equal(items.length, eintraege.length, "Zahl der Einträge in Feed und News-Seite ist verschieden");
  items.forEach((item, i) => {
    const e = eintraege[i];
    assert.ok(item.includes(`<title>`), `${e.id}: kein Titel`);
    assert.ok(item.includes(`https://ornament.cloud/news/#${e.id}`), `${e.id}: falsche oder fehlende Adresse`);
    assert.ok(item.includes(`isPermaLink="false"`), `${e.id}: guid muss isPermaLink="false" tragen`);
    assert.match(item, /<pubDate>[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} \+0000<\/pubDate>/,
      `${e.id}: pubDate nicht im Format von RSS (RFC 822)`);
  });
});

test("Die Einträge stehen vom neuesten zum ältesten", () => {
  const daten = eintraege.map((e) => e.datum);
  const sortiert = [...daten].sort().reverse();
  assert.deepEqual(daten, sortiert,
    "Auf der News-Seite steht der neueste Eintrag zuoberst; im Feed ist die Reihenfolge dieselbe");
});

test("Im Feed stehen keine Links, die nur auf der News-Seite gelten", () => {
  // Leser zeigen den Text ausserhalb der Seite: Ein Link wie ../alpha/ ginge dort ins Leere.
  const beschreibungen = [...xml.matchAll(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/g)].map((m) => m[1]);
  assert.equal(beschreibungen.length, eintraege.length, "Nicht jeder Eintrag hat einen Text");
  for (const b of beschreibungen) {
    assert.ok(!/(href|src)="(\.\.?\/|\/)/.test(b), `Relativer Link im Feed: ${b.slice(0, 120)}`);
  }
});

test("Jede Seite mit Menü weist im Kopf auf den Feed hin", () => {
  // Damit Leser und Browser den Feed von jeder Seite aus finden, ohne dass man ihn sucht.
  for (const seite of ["index.html", "news/index.html"]) {
    const html = lies(seite);
    assert.match(html, /<link rel="alternate" type="application\/rss\+xml"[^>]*href="[^"]*feed\.xml"/,
      `${seite}: kein <link rel="alternate"> auf feed.xml im <head>`);
  }
});
