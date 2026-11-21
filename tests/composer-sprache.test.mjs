// Sprachwahl des Composers (21. November 2026): Wörterbuch vollständig, Platzhalter stimmen, die Seite selbst ist ganz übersetzt.
//   node --test tests/composer-sprache.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TEXTE, SPRACHEN } from "../alpha/composer/sprache-texte.js";
import { t, spracheSetzen } from "../alpha/composer/sprache.js";

test("jeder Eintrag hat Englisch, Spanisch, Französisch mit denselben Platzhaltern", () => {
  assert.deepEqual(SPRACHEN.map((s) => s.code), ["de", "en", "es", "fr"]);
  for (const [de, ziel] of Object.entries(TEXTE)) {
    assert.equal(ziel.length, 3, de);
    const ph = (s) => (s.match(/\{\d\}/g) ?? []).sort().join();
    for (const z of ziel) { assert.ok(z && z.trim(), de); assert.equal(ph(z), ph(de), de); }
  }
});

test("alle Texte der Seite (index.html) stehen im Wörterbuch", () => {
  const html = readFileSync(new URL("../alpha/composer/index.html", import.meta.url), "utf8").replace(/<head>[\s\S]*?<\/head>/, "").replace(/<code>[\s\S]*?<\/code>|<kbd>[\s\S]*?<\/kbd>/g, "<i></i>");
  const texte = new Set();
  for (const m of html.matchAll(/>([^<]+)</g)) { const s = m[1].trim(); if (/[a-zäöü]{3}/i.test(s)) texte.add(s); }
  for (const m of html.matchAll(/(?:title|aria-label|placeholder)="([^"]+)"/g)) texte.add(m[1]);
  const fehlt = [...texte].filter((s) => !(s in TEXTE) && !["ornament.cloud", "ORNAMENT COMPOSER", "Hz", "LUFS", "BPM", "GR", "TP"].includes(s));
  assert.deepEqual(fehlt, []);
});

test("Meldungen mit Zahlen, Namen und Noten", () => {
  spracheSetzen("en");
  assert.equal(t("3 Spuren geladen, 48,0 kHz. Leertaste spielt."), "3 tracks loaded, 48.0 kHz. Space plays.");
  assert.equal(t("Drum and Bass: 5 Spuren, 8 Takte, 174 BPM, Fis Dorisch. Leertaste spielt in der Schleife."), "Drum and Bass: 5 tracks, 8 bars, 174 BPM, F♯ Dorian. Space plays in the loop.");
  spracheSetzen("es");
  assert.equal(t("Delfine: Natur und Flächen 0.3.0"), "Delfines: Naturaleza y pads 0.3.0");
  assert.equal(t("D Hijaz"), "Re Hijaz");
  spracheSetzen("fr");
  assert.equal(t("Spuren laden"), "Charger des pistes");
  assert.equal(t("eigene_datei_ohne_eintrag.wav"), "eigene_datei_ohne_eintrag.wav");
  spracheSetzen("de");
  assert.equal(t("Spuren laden"), "Spuren laden");
});
