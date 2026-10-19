// Social Media (seit 19. Oktober 2026): Adressen, Zeit, Zahlen, Text, Seiten, Commit der Redaktion, Claude-Schema.
// Die Seiten des Bereichs müssen auf dem Stand der Daten sein (sonst: node tools/build-social-media.mjs).
//   node --test tests/social-media.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, root), "utf8");
const D = await import(new URL("social-media/js/darstellung.js", root).href);
const Q = await import(new URL("social-media/js/quelle.js", root).href);
const { zusammenstellen, medienVon } = await import(new URL("social-media/js/redaktion/zusammenstellen.js", root).href);
const ER = await import(new URL("social-media/js/redaktion/erkennen.js", root).href);
const { blobSha, base64 } = await import(new URL("social-media/js/redaktion/github.js", root).href);
const BEISPIEL = JSON.parse(lies("tests/fixtures/social-media/eintraege.json"));

// ---------- Adresse ----------

test("Adresse: Plattform, Handle und Profil aus Adressen von X, Facebook und Instagram", () => {
  assert.deepEqual(Q.ausAdresse("https://twitter.com/Jack/status/20", Date.parse("2026-10-19")), { plattform: "x", handle: "Jack", profil: "https://x.com/Jack", veroeffentlicht: null });
  assert.equal(Q.plattformAusUrl("x.com/a/status/1"), "x");
  assert.equal(Q.plattformAusUrl("https://m.facebook.com/story.php?id=1"), "facebook");
  assert.equal(Q.handleAusUrl("https://m.facebook.com/story.php?id=1"), null);
  assert.equal(Q.handleAusUrl("https://www.facebook.com/zeitlupe/posts/123"), "zeitlupe");
  assert.equal(Q.handleAusUrl("https://www.instagram.com/p/DAbCdEfGhIj/"), null, "/p/ ist kein Handle");
  assert.equal(Q.handleAusUrl("https://www.instagram.com/stories/lou/123/"), "lou");
  assert.equal(Q.plattformAusUrl("https://example.org/x"), null);
  assert.equal(Q.profilUrl("instagram", "@lou.a"), "https://www.instagram.com/lou.a/");
  assert.equal(Q.profilUrl("x", "bad handle"), null);
});

test("Adresse: die Zeit steckt in der Kennung (X: Snowflake, Instagram: Medien-id), nur plausible Werte", () => {
  // X: (id >> 22) + 1288834974657 ms
  const id = 1846923501234567168n, ms = Number((id >> 22n) + 1288834974657n);
  assert.equal(Q.zeitAusUrl(`https://x.com/a/status/${id}`, Date.parse("2026-10-19")), new Date(Math.floor(ms / 1000) * 1000).toISOString().replace(".000Z", "Z"));
  assert.equal(Q.zeitAusUrl(`https://x.com/a/status/${id}`, Date.parse("2026-10-19")), "2024-10-17T14:37:31Z");
  assert.equal(Q.zeitAusUrl("https://x.com/jack/status/20"), null, "frühe Kennungen tragen keine Uhr");
  assert.equal(Q.zeitAusUrl(`https://x.com/a/status/${id}`, Date.parse("2020-01-01")), null, "nicht nach der Erfassung");
  const ig = Q.zeitAusUrl("https://www.instagram.com/p/DAbCdEfGhIj/", Date.parse("2026-10-19"));
  assert.match(ig, /^20(1\d|2\d)-\d\d-\d\dT/, "Instagram: ein Datum nach 2010");
  assert.equal(Q.zeitAusUrl("https://www.facebook.com/a/posts/1"), null);
});

// ---------- Zeit, Zahlen, Text ----------

test("Zeit: Zürcher Zeit mit Sommerzeit, Tag und Monat ohne Uhr; Abstand in Worten", () => {
  assert.equal(D.datum("2026-07-01T10:00:00Z"), "1. Juli 2026, 12:00");
  assert.equal(D.datum("2026-12-01T10:00:00Z"), "1. Dezember 2026, 11:00");
  assert.equal(D.datum("2026-03-29T00:59:00Z"), "29. März 2026, 01:59", "kurz vor der Umstellung");
  assert.equal(D.datum("2026-03-29T01:00:00Z"), "29. März 2026, 03:00", "danach");
  assert.equal(D.datum("2026-10-25T00:59:00Z"), "25. Oktober 2026, 02:59");
  assert.equal(D.datum("2026-10-25T01:00:00Z"), "25. Oktober 2026, 02:00");
  assert.equal(D.datum("2026-10-18"), "18. Oktober 2026");
  assert.equal(D.datum("2026-10"), "Oktober 2026");
  assert.equal(D.datum("2026-10-18T22:30:00Z", { kurz: true }), "19. Okt. 2026, 00:30", "nach Mitternacht in Zürich");
  assert.equal(D.datum("unsinn"), "");
  assert.equal(D.abstand("2026-10-18T10:00:00Z", "2026-10-18T13:10:00Z"), "nach 3 Stunden");
  assert.equal(D.abstand("2026-10-18", "2026-10-18T20:00:00Z"), "am selben Tag");
  assert.equal(D.abstand("2026-10-17", "2026-10-18T20:00:00Z"), "nach einem Tag");
  assert.equal(D.abstand("2024-10-17T14:03:12Z", "2026-09-02T07:41:00Z"), "nach 2 Jahren");
  assert.equal(D.abstand("2026-10-01T10:00:00Z", "2026-10-01T10:00:30Z"), "sofort");
  assert.equal(D.rfc822("2026-10-19T06:30:00Z"), "Mon, 19 Oct 2026 06:30:00 +0000");
});

test("Zahlen: Schweizer Schreibweise und Kürzel wie auf den Plattformen", () => {
  assert.deepEqual([0, 987, 4210, 9999, 12345, 99999, 412300, 1_000_000, 1_234_567, null].map(D.zahl), ["0", "987", "4’210", "9’999", "12,3 Tsd.", "100 Tsd.", "412 Tsd.", "1 Mio.", "1,2 Mio.", ""]);
});

test("Text: Zeilen, Adressen, @Erwähnungen und #Hashtags werden Links; alles andere bleibt Text (kein HTML aus Beiträgen)", () => {
  const h = D.beitragText("Hallo <b>Welt</b> & «du»\n@jemand schau https://example.org/a?b=1&c=2. #Stadt #zürich mail@example.org", "x", "../");
  assert.ok(h.includes("Hallo &lt;b&gt;Welt&lt;/b&gt; &amp; «du»<br>"));
  assert.ok(h.includes('<a href="https://x.com/jemand" rel="nofollow noopener ugc" target="_blank">@jemand</a>'));
  assert.ok(h.includes('<a href="https://example.org/a?b=1&amp;c=2" rel="nofollow noopener ugc" target="_blank">example.org/a?b=1&amp;c=2</a>.'), "Satzzeichen bleiben draussen");
  assert.ok(h.includes('<a class="hashtag" href="../?q=%23z%C3%BCrich">#zürich</a>'));
  assert.ok(!h.includes('href="https://x.com/example.org"'), "keine Erwähnung mitten in einer Mailadresse");
  assert.ok(!/<(script|img|iframe)/i.test(D.beitragText('<script>alert(1)</script><img src=x onerror=alert(1)> javascript:alert(1)', "x", "./")));
  assert.ok(!D.beitragText("javascript:alert(1)", "x", "./").includes("<a"), "nur http(s) wird ein Link");
  assert.equal(D.kommentarHtml("Ein *Satz* mit **Gewicht**.\n\n[Quelle](https://example.org) und <i>nichts</i>."), '<p>Ein <em>Satz</em> mit <strong>Gewicht</strong>.</p>\n<p><a href="https://example.org" rel="noopener">Quelle</a> und &lt;i&gt;nichts&lt;/i&gt;.</p>');
  assert.equal(D.kommentarHtml("[x](javascript:alert(1))"), "<p>[x](javascript:alert(1))</p>");
  assert.equal(D.auszug("eins zwei drei vier fünf sechs", 18), "eins zwei drei …");
  assert.equal(D.slug("Künstliche Intelligenz & Öffentlichkeit"), "kuenstliche-intelligenz-oeffentlichkeit");
});

test("Darstellung: ohne Intl und localeCompare, damit Browser und Node dieselben Seiten schreiben", () => {
  const code = lies("social-media/js/darstellung.js").replace(/\/\/.*$/gm, "");
  assert.ok(!/\bIntl\b|localeCompare|toLocale/.test(code));
});

// ---------- Prüfen, Register, Seiten ----------

test("Beispielzettel: gültig, alle Seiten mit Kopf, Menü (Social aktiv), Fuss; Register, Feed und Verweise", () => {
  const alle = BEISPIEL.eintraege;
  for (const e of alle) assert.deepEqual(D.pruefen(e, alle), [], `Zettel ${e.nr}`);
  const seiten = D.alleSeiten(BEISPIEL);
  assert.deepEqual([...seiten.keys()].sort(), ["social-media/autorinnen/index.html", "social-media/feed.xml", "social-media/index.html", "social-media/schlagworte/index.html", ...alle.map((e) => `social-media/${e.id}/index.html`)].sort());
  for (const [p, html] of seiten) {
    if (!p.endsWith(".html")) continue;
    assert.match(html, /<nav class="seitenweg" aria-label="Ornament Cloud">/, p);
    assert.match(html, new RegExp(`<a class="menu-item" href="[./]*social-media/" aria-current="${p === "social-media/index.html" ? "page" : "true"}">`), p);
    assert.match(html, /<footer class="site-footer">[\s\S]*Fragen und Anmerkungen zur Website: <a href="mailto:hansnoed@gmail.com">hansnoed@gmail.com<\/a>/, p);
    assert.match(html, /<link rel="canonical" href="https:\/\/ornament\.cloud\/social-media\//, p);
    assert.ok(!/<script>|onerror=|javascript:/i.test(html), `${p}: nichts Ausführbares aus den Daten`);
  }
  const z1 = seiten.get("social-media/1-wer-beobachtet-die-beobachter/index.html");
  assert.match(z1, /<meta property="og:title" content="Wer beobachtet die Beobachter\?">/);
  assert.match(z1, /Veröffentlicht <time datetime="2024-10-17T14:37:31Z">17\. Oktober 2024, 16:37<\/time> <span class="leise">\(aus der Adresse errechnet\)<\/span>/);
  assert.match(z1, /Zettel 4: Eine Antwort auf das Archiv<\/a> <span class="verweis-art">Antwort darauf<\/span>/);
  assert.match(seiten.get("social-media/schlagworte/index.html"), /<dt><a href="\.\.\/\?schlagwort=oeffentlicher-raum">Öffentlicher Raum<\/a> <span class="anzahl">1<\/span><\/dt>/);
  assert.match(seiten.get("social-media/autorinnen/index.html"), /<h2>Instagram<\/h2>/);
  const feed = seiten.get("social-media/feed.xml");
  assert.equal([...feed.matchAll(/<item>/g)].length, 6);
  assert.match(feed, /<title>Zettel 6: Kein Ort ohne Zeit<\/title>[\s\S]*<title>Zettel 5:/, "neueste zuerst");
  // Zeitleiste: Daten für die Filter an jedem Zettel
  assert.match(seiten.get("social-media/index.html"), /<li class="zettel" id="zettel-2" data-nr="2" data-plattform="facebook" data-autor="facebook-beispiel-seefeld" data-schlagworte="\|stadt\|oeffentlicher-raum\|beobachtung\|"/);
  // verwandt: geteilte Schlagworte
  assert.deepEqual(D.verwandte(alle[1], alle).map((e) => e.nr), [6, 3, 1].filter((n) => !(alle[1].verweise ?? []).some((v) => v.id.startsWith(`${n}-`))));
});

test("Prüfen: fehlende Angaben, ungültige Pfade und Doppelte werden benannt", () => {
  const e = BEISPIEL.eintraege[0];
  assert.deepEqual(D.pruefen(e, BEISPIEL.eintraege), []);
  assert.ok(D.pruefen({ ...e, plattform: "tiktok" }).some((f) => /Plattform/.test(f)));
  assert.ok(D.pruefen({ ...e, autor: { ...e.autor, name: " " } }).some((f) => /Name/.test(f)));
  assert.ok(D.pruefen({ ...e, erfasst: "2026-10-19" }).some((f) => /Erfassung/.test(f)));
  assert.ok(D.pruefen({ ...e, medien: [{ typ: "bild", datei: "../../index.html" }] }).some((f) => /ungültigem Pfad/.test(f)));
  assert.ok(D.pruefen({ ...e, quelle: "javascript:alert(1)" }).some((f) => /https/.test(f)));
  assert.ok(D.pruefen({ ...e, id: "2-anders" }).some((f) => /Nummer/.test(f)));
  assert.ok(D.pruefen({ ...e, nr: 2, id: "2-x" }, BEISPIEL.eintraege).some((f) => /gibt es schon/.test(f)));
  assert.deepEqual(D.neueId(BEISPIEL.eintraege, "Über Öffentlichkeit!"), { nr: 7, id: "7-ueber-oeffentlichkeit" });
});

test("Website: die Seiten von Social Media sind auf dem Stand der Daten (sonst: node tools/build-social-media.mjs), Sitemap ebenso", () => {
  const daten = JSON.parse(lies("social-media/daten/eintraege.json"));
  for (const [p, inhalt] of D.alleSeiten(daten)) assert.equal(lies(p), inhalt, `${p} ist veraltet`);
  assert.equal(lies("social-media/daten/eintraege.json"), D.datenText(daten), "eintraege.json ist so geschrieben, wie die Redaktion schreibt");
  const sitemap = lies("sitemap.xml");
  assert.equal(D.sitemapEinsetzen(sitemap, daten.eintraege), sitemap, "Sitemap veraltet");
  const ids = new Set(daten.eintraege.map((e) => e.id));
  for (const e of readdirSync(new URL("social-media/", root), { withFileTypes: true })) if (e.isDirectory() && /^\d+-/.test(e.name)) assert.ok(ids.has(e.name), `social-media/${e.name}/ gehört zu keinem Zettel`);
  for (const e of daten.eintraege) for (const m of medienVon(e)) assert.ok(existsSync(new URL(m, root)), `${m} fehlt`);
});

test("Redaktion: von keiner Seite verlinkt, noindex, nicht in der Sitemap, mit Inhaltssicherheitsrichtlinie; das SDK liegt mit Lizenz bei", () => {
  const html = lies("social-media/redaktion/index.html");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self';/);
  assert.ok(!html.includes("goatcounter"), "keine Besuchsstatistik in der Redaktion");
  assert.ok(!lies("sitemap.xml").includes("redaktion"));
  assert.ok(!lies("social-media/index.html").includes("redaktion/"));
  assert.match(lies("vendor/anthropic-sdk-0.135.0/anthropic.js"), /0\.135\.0/);
  assert.match(lies("vendor/anthropic-sdk-0.135.0/LICENSE"), /Copyright 2023 Anthropic, PBC\.[\s\S]*Permission is hereby granted, free of charge/);
  assert.match(lies("social-media/js/redaktion/erkennen.js"), /from "\.\.\/\.\.\/\.\.\/vendor\/anthropic-sdk-0\.135\.0\/anthropic\.js"/);
});

// ---------- Commit der Redaktion ----------

const LEER = '{\n  "version": 1,\n  "eintraege": []\n}\n';
const SITEMAP = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://ornament.cloud/</loc></url>\n</urlset>\n';

test("Commit: ein neuer Zettel bringt Daten, Seiten, Feed und Sitemap; Fehler halten ihn auf", () => {
  const e = BEISPIEL.eintraege[0];
  const r = zusammenstellen({ daten: LEER, sitemap: SITEMAP, aenderung: { art: "speichern", eintrag: { ...e, verweise: [] } } });
  assert.deepEqual(r.fehler, []);
  assert.ok(r.schreiben.has("social-media/1-wer-beobachtet-die-beobachter/index.html"));
  assert.ok(r.schreiben.has("social-media/feed.xml"));
  assert.match(r.schreiben.get("sitemap.xml"), /<!-- SOCIAL:START[\s\S]*1-wer-beobachtet-die-beobachter\/[\s\S]*<!-- SOCIAL:END -->\n<\/urlset>/);
  assert.equal(JSON.parse(r.schreiben.get("social-media/daten/eintraege.json")).eintraege.length, 1);
  const kaputt = zusammenstellen({ daten: LEER, sitemap: SITEMAP, aenderung: { art: "speichern", eintrag: { ...e, autor: { name: "" } } } });
  assert.ok(kaputt.fehler.length);
});

test("Commit: bearbeiten räumt ersetzte Medien weg, löschen nimmt Seite, Medien und Verweise darauf mit – fremde Medien bleiben", () => {
  const daten = JSON.stringify({ version: 1, eintraege: BEISPIEL.eintraege });
  const vorhanden = ["social-media/medien/LIESMICH.md", "social-media/medien/2/avatar.webp", "social-media/medien/2/bild-1.webp", "social-media/medien/2/bild-2.webp", "social-media/medien/2/alt.webp",
    "social-media/2-stadt-fuer-alle/index.html", "social-media/index.html", "social-media/99-alt/index.html"];
  // bearbeiten: ein Bild weniger
  const z2 = structuredClone(BEISPIEL.eintraege[1]);
  z2.medien = z2.medien.slice(0, 1);
  const b = zusammenstellen({ daten, sitemap: SITEMAP, aenderung: { art: "speichern", eintrag: z2 }, vorhandene: vorhanden });
  assert.deepEqual(b.loeschen.sort(), ["social-media/99-alt/index.html", "social-media/medien/2/alt.webp", "social-media/medien/2/bild-2.webp"]);
  // löschen: Zettel 2; sein Avatar wird von Zettel 6 weiter gebraucht
  const l = zusammenstellen({ daten, sitemap: SITEMAP, aenderung: { art: "loeschen", id: "2-stadt-fuer-alle" }, vorhandene: vorhanden });
  assert.deepEqual(l.fehler, []);
  assert.deepEqual(l.loeschen.sort(), ["social-media/2-stadt-fuer-alle/index.html", "social-media/99-alt/index.html", "social-media/medien/2/alt.webp", "social-media/medien/2/bild-1.webp", "social-media/medien/2/bild-2.webp"]);
  assert.ok(!l.daten.eintraege.find((e) => e.nr === 6).verweise.length, "der Verweis von Zettel 6 auf Zettel 2 fällt weg");
  assert.ok(zusammenstellen({ daten, sitemap: SITEMAP, aenderung: { art: "loeschen", id: "gibts-nicht" } }).fehler.length);
});

test("Commit: Blob-SHA wie git hash-object; Base64 auch für grosse Dateien", async () => {
  for (const inhalt of ["", "Hallo\n", "äöü «»"]) {
    const buf = Buffer.from(inhalt);
    assert.equal(await blobSha(inhalt), createHash("sha1").update(Buffer.concat([Buffer.from(`blob ${buf.length}\0`), buf])).digest("hex"));
  }
  const gross = new Uint8Array(200_000).map((_, i) => i % 251);
  assert.equal(base64(gross), Buffer.from(gross).toString("base64"));
});

// ---------- Claude ----------

test("Claude: Schema für strukturierte Ausgabe (jedes Objekt geschlossen, alle Felder verlangt), Modell, Anfrage", () => {
  const pruefe = (s, weg = "SCHEMA") => {
    if (s.anyOf) return s.anyOf.forEach((x, i) => pruefe(x, `${weg}.anyOf[${i}]`));
    if (s.type === "object") {
      assert.equal(s.additionalProperties, false, `${weg}: additionalProperties`);
      assert.deepEqual([...s.required].sort(), Object.keys(s.properties).sort(), `${weg}: required`);
      for (const [k, v] of Object.entries(s.properties)) pruefe(v, `${weg}.${k}`);
    }
    if (s.type === "array") pruefe(s.items, `${weg}[]`);
  };
  pruefe(ER.SCHEMA);
  assert.equal(ER.MODELL, "claude-opus-5-5");
  const inhalt = ER.frage([{ daten: "AAA", typ: "image/jpeg", oben: 0, hoehe: 0.6 }, { daten: "BBB", typ: "image/jpeg", oben: 0.5, hoehe: 0.5 }],
    { erfasst: "2026-10-19T06:30:00Z", erfasstText: "19. Oktober 2026, 08:30", adresse: "https://x.com/a/status/1", ausAdresse: { plattform: "x", handle: "a", veroeffentlicht: null }, schlagworte: ["Stadt"], autoren: [] });
  assert.deepEqual(inhalt.map((b) => b.type), ["image", "image", "text"]);
  assert.match(inhalt[2].text, /2 überlappenden Teilen/);
  assert.match(inhalt[2].text, /Bestehende Schlagworte: Stadt/);
  assert.match(ER.SYSTEM, /Zeichen für Zeichen/);
  assert.match(ER.SYSTEM, /Du schreibst keinen/);
});

test("Claude: Bereiche aus Teilen ins ganze Bild, Doppelte aus der Überlappung zusammengelegt, ein Profilbild; JSON auch aus Text", () => {
  const teile = [{ oben: 0, hoehe: 0.6 }, { oben: 0.5, hoehe: 0.5 }];
  const r = ER.bereicheImGanzen([
    { art: "bild", teil: 0, x: 0.1, y: 0.9, b: 0.8, h: 0.1, beschreibung: "a" },        // ganz: y 0.54–0.6
    { art: "bild", teil: 1, x: 0.1, y: 0.08, b: 0.8, h: 0.12, beschreibung: "b" },      // ganz: y 0.54–0.6 (dasselbe Bild)
    { art: "avatar", teil: 0, x: 0.02, y: 0.02, b: 0.1, h: 0.05, beschreibung: "" },
    { art: "avatar", teil: 1, x: 0.02, y: 0.5, b: 0.1, h: 0.05, beschreibung: "" },
    { art: "dritte", teil: 1, x: 0.5, y: 0.9, b: 0.9, h: 0.5, beschreibung: "" },        // ragt hinaus: wird gekappt
  ], teile);
  assert.equal(r.filter((x) => x.art === "bild").length, 1);
  assert.equal(r.filter((x) => x.art === "avatar").length, 1);
  assert.ok(Math.abs(r.find((x) => x.art === "avatar").y - 0.012) < 1e-9);
  const d = r.find((x) => x.art === "dritte");
  assert.ok(d.x + d.b <= 1 && d.y + d.h <= 1.0000001);
  assert.deepEqual(ER.jsonAusText('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(ER.jsonAusText('Hier: {"a":{"b":2}} fertig'), { a: { b: 2 } });
  assert.throws(() => ER.jsonAusText("nichts"));
});

test("Claude: die Rückfallstufen – ohne Fallback-Parameter, dann ohne Schema; Ablehnung und falscher Schlüssel werden klar gemeldet", async () => {
  class Fehler extends Error {}
  class BadRequestError extends Fehler {} class AuthenticationError extends Fehler {} class PermissionDeniedError extends Fehler {} class RateLimitError extends Fehler {} class APIConnectionError extends Fehler {}
  const ergebnis = { bereiche: [], titel: "T" };
  const machen = (antworten) => {
    const anfragen = [];
    class Klient {
      static BadRequestError = BadRequestError; static AuthenticationError = AuthenticationError; static PermissionDeniedError = PermissionDeniedError; static RateLimitError = RateLimitError; static APIConnectionError = APIConnectionError;
      constructor(o) { assert.equal(o.dangerouslyAllowBrowser, true); }
      beta = { messages: { stream: (a) => { anfragen.push(a); const x = antworten[anfragen.length - 1]; return { finalMessage: async () => { if (x instanceof Error) throw x; return x; } }; } } };
    }
    return { Klient, anfragen };
  };
  const ok = (text, stop = "end_turn") => ({ stop_reason: stop, content: [{ type: "text", text }], usage: { input_tokens: 1, output_tokens: 1 }, model: "claude-opus-5-5" });
  const teile = [{ daten: "A", typ: "image/jpeg", oben: 0, hoehe: 1 }], kontext = { erfasst: "x", erfasstText: "x" };
  let m = machen([new BadRequestError("fallbacks"), new BadRequestError("schema"), ok(`Bitte: ${JSON.stringify(ergebnis)}`)]);
  const r = await ER.erkennen({ schluessel: "k", teile, kontext, Klient: m.Klient });
  assert.equal(r.ergebnis.titel, "T");
  assert.equal(m.anfragen[0].fallbacks, "default");
  assert.deepEqual(m.anfragen[0].betas, ["server-side-fallback-2026-07-01"]);
  assert.equal(m.anfragen[1].fallbacks, undefined);
  assert.equal(m.anfragen[1].output_config.format.type, "json_schema");
  assert.equal(m.anfragen[2].output_config.format, undefined);
  assert.match(m.anfragen[2].system, /Antworte nur mit einem JSON-Objekt/);
  for (const a of m.anfragen) { assert.equal(a.model, "claude-opus-5-5"); assert.deepEqual(a.thinking, { type: "adaptive" }); assert.equal(a.output_config.effort, "medium"); }
  m = machen([ok("", "refusal")]);
  await assert.rejects(ER.erkennen({ schluessel: "k", teile, kontext, Klient: m.Klient }), /abgelehnt/);
  m = machen([new AuthenticationError("401")]);
  await assert.rejects(ER.erkennen({ schluessel: "k", teile, kontext, Klient: m.Klient }), /Schlüssel nicht/);
});

// ---------- ohne Schlüssel: über claude.ai (seit 19. Oktober 2026) ----------

test("claude.ai: die Anweisung trägt dieselben Regeln, den Zusammenhang und eine Vorlage, die selbst gültiges JSON ist", () => {
  const a = ER.anweisungFuerChat({ erfasst: "2026-10-19T08:00:00Z", erfasstText: "19. Oktober 2026, 10:00", adresse: "https://x.com/a/status/1", ausAdresse: { plattform: "x", handle: "a", veroeffentlicht: null }, schlagworte: ["Stadt", "Archiv"], autoren: [] });
  assert.ok(a.includes(ER.SYSTEM), "dieselben Regeln wie mit Schlüssel");
  assert.match(a, /Erfasst: 19\. Oktober 2026, 10:00/);
  assert.match(a, /Aus der Adresse gelesen .*Handle a/);
  assert.match(a, /Bestehende Schlagworte: Stadt, Archiv/);
  assert.match(a, /Das Bildschirmfoto kommt in einem Teil/);
  const vorlage = a.match(/```json\n([\s\S]*?)\n```/)[1];
  assert.deepEqual(JSON.parse(vorlage), ER.VORLAGE);
  assert.deepEqual(Object.keys(ER.VORLAGE).sort(), Object.keys(ER.SCHEMA.properties).sort(), "die Vorlage hat genau die Felder des Schemas");
});

test("claude.ai: Zahlen wie auf den Plattformen", () => {
  assert.deepEqual(["1,2K", "1.2K", "1,2 Tsd.", "3,4 Mio.", "12.345", "12’345", "987", 45000, "", null, "viele", -3].map(ER.zahlAusText),
    [1200, 1200, 1200, 3400000, 12345, 12345, 987, 45000, null, null, null, null]);
});

test("claude.ai: die eingefügte Antwort wird nachsichtig gelesen (Codeblock mit Text drumherum, Prozent, fehlende Felder) – und ohne Beitrag abgelehnt", () => {
  const antwort = 'Hier ist das Ergebnis:\n```json\n' + JSON.stringify({
    plattform: "X", autor: { name: "Mira", handle: "@mira", verifiziert: "true" }, text: "Hallo\nWelt",
    veroeffentlicht: "2026-10-18", kennzahlen: { likes: "1,2K", antworten: 3 },
    bereiche: [{ art: "bild", x: 5, y: 40, b: 90, h: 30, beschreibung: "Foto" }, { art: "unsinn", x: 0, y: 0, b: 1, h: 1 }],
    zitiert: { autor: { name: "Jon", handle: "jon" }, text: "zitiert" }, schlagworte: ["Stadt", " ", "Archiv"],
  }) + '\n```\nSag Bescheid, wenn …';
  const r = ER.antwortLesen(antwort);
  assert.equal(r.plattform, "x");
  assert.deepEqual(r.autor, { name: "Mira", handle: "mira", verifiziert: true });
  assert.equal(r.text, "Hallo\nWelt");
  assert.deepEqual(r.veroeffentlicht, { angezeigt: null, iso: "2026-10-18", genauigkeit: "unbekannt" });
  assert.equal(r.kennzahlen.likes, 1200);
  assert.equal(r.kennzahlen.reposts, null);
  assert.equal(r.bereiche.length, 1);
  assert.ok(Math.abs(r.bereiche[0].x - 0.05) < 1e-9 && Math.abs(r.bereiche[0].h - 0.3) < 1e-9, "Prozent werden zu Anteilen");
  assert.deepEqual(r.zitiert, { name: "Jon", handle: "jon", text: "zitiert" });
  assert.deepEqual(r.schlagworte, ["Stadt", "Archiv"]);
  assert.equal(r.sprache, "de");
  assert.throws(() => ER.antwortLesen("Ich kann das Bild leider nicht sehen."), /kein JSON/);
  assert.throws(() => ER.antwortLesen('{"titel": "nur ein Titel"}'), /weder Text noch Name/);
  assert.throws(() => ER.antwortLesen("[1,2]"), ER.ErkennenFehler);
});
