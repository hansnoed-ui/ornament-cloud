// ORNAMENT LAB · Video (alpha/lab/video/) – das Modell ohne Browser: Folge, Übergänge, Teilen, Trimmen, Umstellen, Einrasten, Titel und Ton,
// der Film im Format von OpenFilm (geprüft mit dessen Leser), Filter als CSS und als Farbmatrizen, die Titelseiten, das Mischen des Tons und
// die Projektdatei. Die Oberfläche, die Vorschau und der Export prüft tests/lab-video.e2e.mjs in Chromium.
//   node --test tests/lab-video.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const v = (p) => import(new URL(`alpha/lab/video/${p}`, root).href);
const F = await v("kern/folge.js");
const FI = await v("kern/filter.js");
const T = await v("kern/titel.js");
const TON = await v("kern/ton.js");
const OF = await import(new URL("vendor/openfilm-0.2.6/film-doc.js", root).href);
const nahe = (a, b, eps, text) => assert.ok(Math.abs(a - b) <= eps, `${text}: ${a} statt ${b} (± ${eps})`);

function beispiel(format = "16:9") {
  const p = F.neuesProjekt({ format, name: "Am Meer" });
  const a = F.mediumAufnehmen(p, { name: "Strand Nacht.MP4", art: "video", dauer: 10, breite: 1920, hoehe: 1080, ton: true });
  const b = F.mediumAufnehmen(p, { name: "foto.jpg", art: "bild", breite: 800, hoehe: 600 });
  const m = F.mediumAufnehmen(p, { name: "beat.wav", art: "ton", dauer: 30 });
  return { p, a, b, m };
}

test("Medien: Ids aus dem Namen, eindeutig, Pfade unter assets/; Bilder kommen nicht unter den Ton", () => {
  const { p, a, b, m } = beispiel();
  assert.equal(a, "strand-nacht"); assert.equal(p.medien[a].datei, "assets/strand-nacht.mp4");
  assert.equal(F.mediumAufnehmen(p, { name: "Strand Nacht.mp4", art: "video", dauer: 3 }), "strand-nacht-2");
  assert.equal(p.medien[b].datei, "assets/foto.jpg"); assert.equal(p.medien[m].datei, "assets/beat.wav");
  assert.throws(() => F.inFolge(p, m), /Videos und Bilder/);
  assert.throws(() => F.tonHinzu(p, b), /Töne/);
  assert.throws(() => F.mediumAufnehmen(p, { name: "x.txt", art: "text" }), /unbekannte Art/);
});

test("Folge: hintereinander, Blende überlappt und blendet immer den oberen Clip, Schwarz- und Weissblende ohne Überlappung", () => {
  const { p, a, b } = beispiel();
  const c1 = F.inFolge(p, a), c2 = F.inFolge(p, b), c3 = F.inFolge(p, a);
  let z = F.zeitplan(p).clips;
  assert.deepEqual(z.map((x) => [x.at, x.laenge, x.spur]), [[0, 10, 0], [10, 4, 1], [14, 10, 0]], "Bilder 4 s, alles hart geschnitten");
  assert.equal(F.dauer(p), 24, "ein Ton im Material zählt nicht, nur einer unter dem Film");
  F.finde(p, c1).c.uebergang = { art: "blende", dauer: 1 };
  F.finde(p, c2).c.uebergang = { art: "blende", dauer: 1 };
  z = F.zeitplan(p).clips;
  assert.deepEqual(z.map((x) => x.at), [0, 9, 12], "jede Blende überlappt um ihre Dauer");
  // c2 liegt oben (Spur 1): in die Blende hinein blendet er sich ein, aus der Blende hinaus blendet er aus (c3 liegt unten)
  assert.deepEqual(z.map((x) => x.fade), [[0, 0], [1, 1], [0, 0]]);
  F.finde(p, c1).c.uebergang = { art: "schwarz", dauer: 0.8 };
  F.finde(p, c2).c.uebergang = { art: "weiss", dauer: 0.6 };
  z = F.zeitplan(p).clips;
  assert.deepEqual(z.map((x) => x.at), [0, 10, 14], "Schwarz- und Weissblende überlappen nicht");
  assert.deepEqual(z.map((x) => x.fade), [[0, 0.4], [0.4, 0.3], [0.3, 0]]);
  // eine Blende ist höchstens ein Drittel des kürzeren Clips
  F.finde(p, c1).c.uebergang = { art: "blende", dauer: 3 };
  nahe(F.zeitplan(p).clips[1].at, 10 - 4 / 3, 1e-3, "Blende begrenzt auf ein Drittel des Bilds");
  assert.equal(F.folgeBei(p, 9.5).c.id, c2, "in der Blende ist der spätere Clip der sichtbare");
  assert.equal(F.folgeBei(p, 100), null);
});

test("Teilen, Trimmen, Umstellen, Entfernen", () => {
  const { p, a, b, m } = beispiel();
  const c1 = F.inFolge(p, a), c2 = F.inFolge(p, b);
  F.finde(p, c1).c.uebergang = { art: "blende", dauer: 0.5 };
  F.finde(p, c1).c.filter = { vorlage: "noir" };
  const neu = F.teilen(p, c1, 4);
  assert.deepEqual(p.folge.map((c) => [c.id, c.ein, c.aus, c.uebergang.art]), [[c1, 0, 4, "schnitt"], [neu, 4, 10, "blende"], [c2, 0, 4, "schnitt"]], "der erste Teil endet mit einem Schnitt, der zweite übernimmt die Blende");
  assert.deepEqual(F.finde(p, neu).c.filter, { vorlage: "noir" }, "der Filter geht mit");
  assert.equal(F.teilen(p, c1, 0.05), null, "zu nah am Rand");
  // mit Tempo: die Stelle in der Datei folgt dem Tempo
  F.finde(p, neu).c.tempo = 2;
  const n2 = F.teilen(p, neu, 5);
  assert.equal(F.finde(p, neu).c.aus, 6, "4 + (5 − 4) · 2"); assert.equal(F.finde(p, n2).c.ein, 6);
  // trimmen: in der Datei, nicht kürzer als 0,1 s (beim Tempo 2 also 0,2 s der Datei)
  F.trimmen(p, n2, "aus", 50); assert.equal(F.finde(p, n2).c.aus, 10, "nicht über das Ende der Datei");
  F.trimmen(p, n2, "ein", 9.99); nahe(F.finde(p, n2).c.ein, 9.8, 1e-9, "mindestens 0,1 s im Film");
  F.trimmen(p, c2, "aus", 12); assert.equal(F.finde(p, c2).c.aus, 12, "ein Bild steht so lange, wie es soll");
  // umstellen und entfernen schliessen die Lücke
  F.verschieben(p, c2, 0);
  assert.equal(p.folge[0].id, c2); assert.equal(F.zeitplan(p).clips[1].at, 12);
  assert.equal(F.entfernen(p, c2), "folge"); assert.equal(F.zeitplan(p).clips[0].at, 0);
  // Titel und Ton teilen
  const t = F.titelHinzu(p, { at: 1, dauer: 4, text: "Hallo" }), t2 = F.teilen(p, t, 2);
  assert.deepEqual([F.finde(p, t).c.dauer, F.finde(p, t2).c.at, F.finde(p, t2).c.dauer, F.finde(p, t2).c.text], [1, 2, 3, "Hallo"]);
  const s = F.tonHinzu(p, m, 1); Object.assign(F.finde(p, s).c, { einblenden: 1, ausblenden: 2 });
  const s2 = F.teilen(p, s, 11);
  assert.deepEqual([F.finde(p, s).c.aus, F.finde(p, s).c.ausblenden, F.finde(p, s2).c.ein, F.finde(p, s2).c.at, F.finde(p, s2).c.einblenden, F.finde(p, s2).c.ausblenden], [10, 0, 10, 11, 0, 2]);
});

test("Einrasten: an Rändern, am Abspielkopf und an Marken, nur innerhalb des Fangs", () => {
  const { p, a, m } = beispiel();
  const c = F.inFolge(p, a); F.tonHinzu(p, m, 2.5); F.titelHinzu(p, { at: 3, dauer: 2 });
  const st = F.rastStellen(p, { kopf: 6.2, marken: [7.75] });
  assert.deepEqual(st, [0, 2.5, 3, 5, 6.2, 7.75, 10, 32.5]);
  assert.equal(F.einrasten(6.1, st, 0.15), 6.2); assert.equal(F.einrasten(6.5, st, 0.15), 6.5);
  assert.ok(!F.rastStellen(p, { ausser: c }).includes(10), "der gezogene Clip rastet nicht an sich selbst");
});

test("OpenFilm: der Film ist gültig (Leser von OpenFilm 0.2.6), Spuren von oben, Bildausschnitt, Filter, Blenden, Titel als Seiten, Ton", () => {
  const { p, a, b, m } = beispiel("9:16");
  const c1 = F.inFolge(p, a), c2 = F.inFolge(p, b), c3 = F.inFolge(p, a);
  Object.assign(F.finde(p, c1).c, { uebergang: { art: "blende", dauer: 1 }, tempo: 1.5, lautstaerke: 0.4 });
  Object.assign(F.finde(p, c2).c, { uebergang: { art: "weiss", dauer: 0.8 }, passen: "einpassen", zoom: 1.5, x: 0.1 });
  F.finde(p, c3).c.filter = { vorlage: "film", werte: { unschaerfe: 2 } };
  F.titelHinzu(p, { at: 0.5, dauer: 3, text: "Am Meer\nNacht" }); F.titelHinzu(p, { at: 2, dauer: 2, text: "zweiter" });
  const s = F.tonHinzu(p, m, 0); Object.assign(F.finde(p, s).c, { lautstaerke: 0.7, einblenden: 1, ausblenden: 3, aus: 20 });
  F.tonHinzu(p, a, 5);   // der Ton des Videos allein
  const f = F.film(p);
  assert.deepEqual(f.value.stage, { w: 1080, h: 1920 });
  const r = OF.readFilmFile(f.html);
  assert.deepEqual(r.problems, [], "OpenFilm liest den Film ohne Beanstandung");
  const art = (c) => OF.kindOf(c), spuren = r.value.tracks.map((t) => t.clips.map((c) => `${art(c)}:${c.id}`));
  assert.deepEqual(spuren, [["page:titel-1"], ["page:titel-2"], [`still:${c2}`], [`video:${c1}`, `video:${c3}`], [`page:weiss-${c2}`], ["sound:ton-1"], ["sound:ton-2"]],
    "Titel oben (überlappende auf zwei Spuren), die Folge auf zwei Spuren (die obere zuerst), das Weiss darunter, der Ton (überlappend auf zwei Spuren)");
  const v1 = r.value.tracks[3].clips[0];
  assert.equal(v1.speed, 1.5); assert.equal(v1.volume, 0.4); assert.deepEqual(v1.time, [0, 10]);
  const bild = r.value.tracks[2].clips[0];
  assert.deepEqual(bild.box, { x: -162, y: -480, w: 1620, h: 2880 }, "Zoom 1,5 um die Mitte, um 0,1 der Breite nach rechts");
  assert.match(bild.style, /object-fit: contain/);
  assert.deepEqual(OF.clipFade(bild), [1, 0.4], "das Bild liegt oben: es blendet sich ein und zur Weissblende hin aus");
  assert.match(r.value.tracks[3].clips[1].style, /filter: brightness\(1\.02\) contrast\(1\.08\) saturate\(0\.85\) sepia\(0\.12\) blur\(2px\)/);
  const ton = r.value.tracks[5].clips[0];
  assert.equal(ton.volume, 0.7); assert.deepEqual(OF.clipFade(ton), [1, 3]); assert.deepEqual(ton.time, [0, 20]);
  assert.equal(r.value.tracks[6].clips[0].sound, true, "der Ton eines Videos allein");
  // die Seiten: Titel mit frame(t) und den Einstellungen als JSON
  assert.deepEqual(Object.keys(f.seiten).sort(), ["titel/titel-1.html", "titel/titel-2.html", "titel/weiss.html"]);
  const seite = f.seiten["titel/titel-1.html"];
  assert.match(seite, /<meta name="viewport" content="width=1080, height=1920">/);
  assert.match(seite, /window\.film = \{\s*frame\(t\)/); assert.match(seite, /function zeichneTitel\(ctx, t, dauer, p, w, h\)/);
  assert.equal(T.titelAusSeite(seite).text, "Am Meer\nNacht"); assert.equal(T.titelAusSeite("<html></html>"), null);
  assert.ok(!/<\/script>[\s\S]*Nacht[\s\S]*<script/.test(seite.split('id="titel">')[1].split("</script>")[0]), "der Text bricht das Skript nicht");
  const boese = F.zuFilm({ ...structuredClone(p), titel: [{ ...p.titel[0], text: "</script><script>alert(1)</script>" }] }).seiten["titel/titel-1.html"];
  assert.equal((boese.match(/<\/script>/g) ?? []).length, 2, "Text mit </script> wird maskiert");
});

test("Vorschau und Export lesen den OpenFilm-Film: was bei t zu sehen und zu hören ist", () => {
  const { p, a, b, m } = beispiel();
  const c1 = F.inFolge(p, a), c2 = F.inFolge(p, b);
  F.finde(p, c1).c.uebergang = { art: "blende", dauer: 1 };
  F.titelHinzu(p, { at: 0, dauer: 2 });
  const s = F.tonHinzu(p, m, 0); F.finde(p, s).c.aus = 5;
  const f = F.film(p);
  const bei = (t) => F.bildBei(p, f.doc, t).map((x) => [x.art, x.clip.id, Math.round(x.deckkraft * 100) / 100]);
  assert.deepEqual(bei(1), [["video", c1, 1], ["titel", "titel-1", 1]], "von unten nach oben");
  assert.deepEqual(bei(9.5), [["video", c1, 1], ["bild", c2, 0.5]], "mitten in der Blende: das Bild halb über dem Video");
  assert.equal(F.bildBei(p, f.doc, 9.5)[0].quelle, 9.5);
  const q = F.tonQuellen(p, f.doc);
  assert.deepEqual(q.map((x) => [x.medium, x.at, x.von, x.bis]), [["strand-nacht", 0, 0, 10], ["beat", 0, 0, 5]], "das Bild hat keinen Ton");
  F.finde(p, c1).c.lautstaerke = 0;
  assert.equal(F.tonQuellen(p, F.film(p).doc).length, 1, "ein stummes Video fällt weg");
});

test("Filter: Vorlagen und Regler als CSS; Farbmatrizen nach der Spezifikation", () => {
  assert.equal(FI.filterCss({}), ""); assert.equal(FI.filterWert({}), "none");
  assert.equal(FI.filterCss({ vorlage: "noir" }), "filter: brightness(0.95) contrast(1.35) grayscale(1)");
  assert.equal(FI.filterCss({ vorlage: "noir", werte: { kontrast: 1, unschaerfe: 99 } }), "filter: brightness(0.95) grayscale(1) blur(20px)", "Regler über der Vorlage, begrenzt");
  for (const [k, vl] of Object.entries(FI.VORLAGEN)) for (const id of Object.keys(vl.werte)) assert.ok(FI.REGLER.some((r) => r.id === id), `${k}.${id}`);
  const px = (rgb, f) => [...FI.farbeAnwenden(new Uint8ClampedArray([...rgb, 255]), f)].slice(0, 3);
  assert.deepEqual(px([255, 0, 0], { werte: { grau: 1 } }), [54, 54, 54], "grayscale(1): 0,2126 · 255");
  assert.deepEqual(px([100, 150, 200], { werte: { helligkeit: 2 } }), [200, 255, 255], "brightness(2), begrenzt auf 255");
  assert.deepEqual(px([0, 255, 0], { werte: { kontrast: 0.5 } }), [64, 191, 64], "contrast(0,5): 0,5 · x + 0,25");
  const s = px([200, 100, 50], { werte: { saettigung: 0 } });
  assert.ok(s[0] === s[1] && s[1] === s[2], `saturate(0) ist grau: ${s}`);
  for (const grad of [37, 90, -150]) assert.deepEqual(px([128, 128, 128], { werte: { farbton: grad } }), [128, 128, 128], `hue-rotate(${grad}deg) lässt Grau grau`);
  assert.notDeepEqual(px([200, 100, 50], { werte: { farbton: 180 } }), [200, 100, 50]);
  assert.deepEqual(px([10, 20, 30], {}), [10, 20, 30]);
});

test("Ton: Zuschnitt, Beginn, Lautstärke, Blenden und Tempo (Länge folgt dem Tempo, die Tonhöhe bleibt); Takt als Marken", () => {
  const rate = 8000, n = rate * 4, sinus = new Float32Array(n);
  for (let i = 0; i < n; i++) sinus[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / rate);
  const daten = new Map([["s", { spuren: [sinus], rate }]]);
  const r = TON.mischen([{ medium: "s", at: 1, von: 1, bis: 3, tempo: 1, laenge: 2, lautstaerke: 0.5, fade: [0.5, 0] }], daten, 4, { rate });
  const [L, R] = r.spuren, eff = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += L[i] * L[i]; return Math.sqrt(s / (b - a)); };
  assert.equal(L.length, 4 * rate); assert.deepEqual([...L.subarray(0, 100)], [...R.subarray(0, 100)], "Mono auf beiden Seiten");
  nahe(eff(0, rate), 0, 1e-6, "vor dem Beginn still"); nahe(eff(3.05 * rate, 4 * rate), 0, 1e-6, "nach dem Ende still");
  nahe(eff(2 * rate, 3 * rate), 0.5 * 0.5 / Math.SQRT2, 0.01, "Lautstärke 0,5");
  assert.ok(eff(rate, 1.2 * rate) < eff(1.4 * rate, 1.5 * rate), "eingeblendet");
  // doppeltes Tempo: halb so lang, dieselbe Tonhöhe (Nulldurchgänge je Sekunde)
  const t2 = TON.mischen([{ medium: "s", at: 0, von: 0, bis: 4, tempo: 2, laenge: 2, lautstaerke: 1, fade: null }], daten, 3, { rate }).spuren[0];
  let still = 0; for (let i = 2.1 * rate; i < 3 * rate; i++) still = Math.max(still, Math.abs(t2[i]));
  assert.ok(still < 1e-6, "nach 2 s still");
  let z = 0; for (let i = 0.2 * rate; i < 1.8 * rate; i++) if ((t2[i - 1] < 0) !== (t2[i] < 0)) z++;
  nahe(z / 1.6, 880, 30, "440 Hz bleiben 440 Hz (880 Nulldurchgänge je Sekunde)");
  // übersteuert nicht
  const laut = TON.mischen([0, 0, 0].map(() => ({ medium: "s", at: 0, von: 0, bis: 4, tempo: 1, laenge: 4, lautstaerke: 1, fade: null })), daten, 4, { rate });
  assert.ok(laut.spitze <= 0.967, `${laut.spitze}`);
  // Takt: Schläge alle 0,5 s, ab Sekunde 2 im Film
  const schlag = new Float32Array(rate * 3);
  for (let k = 0; k < 6; k++) for (let i = 0; i < 400; i++) schlag[k * rate / 2 + i] = Math.exp(-i / 60) * Math.sin(i / 3);
  const marken = TON.taktMarken({ at: 2, von: 0, bis: 3, tempo: 1, laenge: 3 }, { spuren: [schlag], rate });
  assert.ok(marken.length >= 5, `${marken}`);
  for (const mk of marken) assert.ok(Math.abs(((mk - 2) * 2) - Math.round((mk - 2) * 2)) < 0.06, `${mk} liegt im Takt`);
});

test("Projektdatei: ZIP wie ein OpenFilm-Ordner (film.html, titel/, assets/, .film/), zurück dasselbe Projekt", async () => {
  const { projektPacken, projektEntpacken, ZUSTAND } = await v("medien/projektdatei.js");
  const { leseZip } = await import(new URL("alpha/lab/kern/archiv.js", root).href);
  const { p, a, b } = beispiel();
  F.inFolge(p, a); F.inFolge(p, b); F.titelHinzu(p, { at: 1, dauer: 2, text: "Ä ö ü" });
  const bytes = new Map([[a, new Uint8Array([1, 2, 3])], [b, new Uint8Array([4, 5])], ["beat", new Uint8Array([6])]]);
  const blob = await projektPacken(p, bytes);
  const zipBytes = new Uint8Array(await blob.arrayBuffer()), dateien = await leseZip(zipBytes);
  assert.deepEqual([...dateien.keys()].sort(), [ZUSTAND, "assets/beat.wav", "assets/foto.jpg", "assets/strand-nacht.mp4", "film.html", "titel/titel-1.html"].sort());
  assert.deepEqual(OF.readFilmFile(new TextDecoder().decode(dateien.get("film.html"))).problems, []);
  const r = await projektEntpacken(zipBytes);
  assert.deepEqual(r.projekt, F.normieren(structuredClone(p))); assert.deepEqual(r.fehlt, []);
  assert.deepEqual([...r.bytes.get(a)], [1, 2, 3]);
  await assert.rejects(projektPacken(p, new Map()), /fehlt/);
});

test("Seite: Alpha (noindex), nur eigene und lokale Dateien, OpenFilm mit Lizenz und Herkunft, nicht verlinkt", () => {
  const html = readFileSync(new URL("alpha/lab/video/index.html", root), "utf8");
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.ok(![...html.matchAll(/(?:src|href)="([^"]+)"/g)].some((m) => /^(https?:)?\/\//.test(m[1])), "nichts von aussen");
  assert.match(readFileSync(new URL("vendor/openfilm-0.2.6/LICENSE", root), "utf8"), /MIT License[\s\S]*OpenFilm contributors/);
  assert.match(readFileSync(new URL("vendor/openfilm-0.2.6/HERKUNFT.txt", root), "utf8"), /unverändert/);
  for (const f of ["app.js", "kern/folge.js", "kern/filter.js", "kern/titel.js", "kern/ton.js", "medien/zeichnen.js", "medien/export.js", "medien/projektdatei.js"]) {
    const t = readFileSync(new URL(`alpha/lab/video/${f}`, root), "utf8");
    assert.ok(!/fetch\(\s*["']https?:/.test(t), `${f}: keine Aufrufe nach aussen`);
  }
  assert.ok(!/href="(?:\.\/)?video\//.test(readFileSync(new URL("alpha/lab/index.html", root), "utf8")), "das Lab verlinkt den Editor (noch) nicht");
});
