// «Die Stadt, die weitergeht» (alpha/stadt/) – Prüfungen des Modells ohne Browser. Sie folgen den Abnahmepunkten des Auftrags vom 9. Oktober 2026.
//   node --experimental-strip-types --no-warnings --test tests/stadt.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const M = await import(new URL("alpha/stadt/modell.js", root).href);
const F = await import(new URL("alpha/stadt/fragen.js", root).href);
const R = await import(new URL("alpha/stadt/raster.js", root).href);
const { JEV } = await import(new URL("alpha/stadt/jev.js", root).href);

const neu = (o = {}) => M.neueStadt({ seed: 11, figuren: 40, tabelle: JEV, ...o });
const abdruck = (z) => createHash("sha1").update(JSON.stringify(z)).digest("hex");
const bisTagesende = (s) => { const d = s.z.tag; while (s.z.tag === d) M.schritt(s); return s.z.messung.tage.at(-1); };
const tage = (s, n) => Array.from({ length: n }, () => bisTagesende(s));

test("jev-Tabelle: passt zu den Fragen (sonst tools/build-jev-stadt.ts laufen lassen) und deckt jede Lage ab", () => {
  assert.equal(JEV.pruefsumme, F.PRUEFSUMME, "jev.js ist veraltet: NODE_USE_ENV_PROXY=1 node --experimental-strip-types --no-warnings tools/build-jev-stadt.ts");
  assert.ok(M.tabelleGueltig(JEV));
  for (const l of F.querungLagen()) for (const p of Object.keys(F.PERSONEN)) if (F.querungOptionen(l, p).length > 1) assert.ok(JEV.querung[F.querungSchluessel(l)]?.[p], `Querung ${F.querungSchluessel(l)} ${p}`);
  for (const l of F.fahrtLagen()) assert.ok(JEV.fahrt[F.fahrtSchluessel(l)], `Fahrt ${F.fahrtSchluessel(l)}`);
  for (const l of F.teilnahmeLagen()) for (const lage of Object.keys(F.LAGEN)) assert.ok(JEV.teilnahme[F.teilnahmeSchluessel(l)]?.[lage]);
  // die Seite ruft jev nie auf: kein Netzaufruf in den Modulen der Seite
  for (const d of ["modell.js", "app.js", "ansicht.js", "raster.js", "fragen.js", "stadtplan.js", "index.html"]) assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(readFileSync(new URL(`alpha/stadt/${d}`, root), "utf8")), d);
});

test("Ohne jev-Tabelle (fehlt oder falsche Prüfsumme) läuft die Stadt mit den Ersatzregeln", () => {
  assert.equal(M.tabelleGueltig({ ...JEV, pruefsumme: "00000000" }), false);
  const s = M.neueStadt({ seed: 3, figuren: 24, tabelle: null });
  assert.equal(M.quelle(s), "Ersatzregeln");
  const b = bisTagesende(s);
  assert.ok(b.autos.H > 1000 && b.wege.erreicht > 20, "Verkehr und Wege laufen");
});

test("Dieselbe Ausgangslage ergibt bei gleichem Startwert denselben Lauf; ein anderer Startwert einen anderen", () => {
  const a = neu(), b = neu();
  assert.equal(abdruck(a.z), abdruck(b.z));
  M.laufe(a, 7200); M.laufe(b, 7200);
  assert.equal(abdruck(a.z), abdruck(b.z));
  const c = M.neueStadt({ seed: 12, figuren: 40, tabelle: JEV });
  assert.notEqual(abdruck(c.z), abdruck(a.z));
});

test("Vergleich «vorher»: der Zweig mit dem Eingriff wiederholt den Lauf genau, der Zweig ohne läuft anders", () => {
  const s = neu();
  M.laufe(s, 1800);
  M.setzeMassnahme(s, "spur", true);
  const mit = M.zweig(s, s.vorEingriff.z, { spur: true }), ohne = M.zweig(s, s.vorEingriff.z);
  M.laufe(s, 5400); M.laufe(mit, 5400); M.laufe(ohne, 5400);
  const nurDynamik = (z) => abdruck({ ...z, protokoll: null, naechstesEreignis: null, merker: null });
  assert.equal(nurDynamik(mit.z), nurDynamik(s.z), "gleiche Vorgeschichte, gleicher Zufall, gleicher Lauf");
  assert.notEqual(nurDynamik(ohne.z), nurDynamik(s.z));
});

test("A: Die zusätzliche Spur entlastet zuerst; mehr Verkehr entsteht nur über die Wahlregel; mit wenig regionaler Nachfrage bleibt die Entlastung", () => {
  for (const latent of ["gering", "hoch"]) {
    const s = neu({ latent });
    const vorher = tage(s, 2).at(-1);
    M.setzeMassnahme(s, "spur", true);
    const nach = tage(s, 5);
    assert.ok(nach[0].reiseSpitze.Hw < vorher.reiseSpitze.Hw, `${latent}: am ersten Tag kürzere Fahrt in der Spitze (${Math.round(nach[0].reiseSpitze.Hw)} < ${Math.round(vorher.reiseSpitze.Hw)})`);
    assert.ok(nach.at(-1).autos.H > nach[0].autos.H * 1.05, `${latent}: über die Tage mehr Autos (${nach[0].autos.H} → ${nach.at(-1).autos.H})`);
    if (latent === "gering") assert.ok(nach.at(-1).reiseSpitze.Hw < vorher.reiseSpitze.Hw, "gering: die Entlastung hält an");
  }
  // Gegenprobe: Ist die Wahl unabhängig von der Fahrzeit, entsteht nach der Spur keine zusätzliche Nachfrage
  const starr = { ...JEV, fahrt: Object.fromEntries(Object.entries(JEV.fahrt).map(([k, v]) => [k, JEV.fahrt[k.replace(/^[a-z]+/, "deutlich")]])) };
  const s = M.neueStadt({ seed: 11, figuren: 24, tabelle: starr });
  const mittel = (l) => l.reduce((a, d) => a + d.pendel.auto, 0) / l.length;
  const vorher = mittel(tage(s, 3));
  M.setzeMassnahme(s, "spur", true);
  const nach = mittel(tage(s, 3));
  assert.ok(Math.abs(nach - vorher) / vorher < 0.05, `ohne Rückkopplung nur Zufallsschwankung (${Math.round(vorher)} → ${Math.round(nach)} Autofahrten je Tag)`);
});

test("B: Dieselbe Verbindung betrifft Figuren verschieden – mit Treppenbrücke verzichten Figuren mit Rollstuhl oder Kinderwagen häufiger", () => {
  const s = neu({ figuren: 72 });
  M.setzeMassnahme(s, "verbindung", "bruecke_treppe");
  const t = tage(s, 3);
  const anteil = (typen) => { let a = 0, n = 0; for (const d of t) for (const k of typen) { const x = d.wege.nachTyp[k]; if (x) { a += x.aufgegeben; n += x.erreicht + x.ersetzt + x.aufgegeben; } } return a / Math.max(1, n); };
  const ohneTreppe = anteil(["rollstuhl", "kinderwagen"]), gehend = anteil(["gehend"]);
  assert.ok(ohneTreppe > gehend + 0.05, `aufgegeben: ohne Treppen ${ohneTreppe.toFixed(2)}, zu Fuss ${gehend.toFixed(2)}`);
  assert.equal(t.at(-1).querungen.ampel, 0, "keine Ampel mehr");
  assert.ok(t.at(-1).querungen.treppe > 0, "die Brücke wird benutzt");
});

test("C: Sichtweisen, Raster und Kennzahlen lesen nur – kein Zustand ändert sich", () => {
  const s = neu();
  M.laufe(s, 3600);
  const vorher = abdruck(s.z);
  for (const sicht of ["fluss", "erreichbarkeit", "aufenthalt", "belastung"]) for (const f of s.z.figuren) R.verteilapparat(s.z, f, sicht);
  M.kennzahlen(s.z, 1); R.nebeneinanderNacheinander(s.z); R.befragungAuswertung(s.z, "laden"); R.befragungAuswertung(s.z, "haustuer");
  assert.equal(abdruck(s.z), vorher);
});

test("Rücknahme ist nicht Zurücksetzen: Strasse wie am Anfang, Erinnerungen bleiben; Zurücksetzen gibt den Anfang genau wieder", () => {
  const s = neu({ figuren: 72 });
  const start = abdruck(s.z);
  M.setzeMassnahme(s, "verbindung", "bruecke_rampe");
  tage(s, 2);
  M.nimmZurueck(s, "verbindung");
  assert.deepEqual(s.z.m, M.MASSNAHMEN_START, "alle Massnahmen auf dem Ausgangswert");
  const fort = M.fortbestehend(s.z, s.z.rueckgenommen[0]);
  assert.ok(fort.irrtum.length + fort.gewohnt.length > 0, "Figuren glauben noch an die Brücke oder haben eine Gewohnheit daraus");
  M.laufe(s, 4 * 3600);
  const r = R.rueckkehrprobe(s.z, s.z.rueckgenommen[0]);
  assert.ok(r.fortbestehende_folgen.length >= 3 && r.weitergehende_aufhebung.includes("Lauf zurücksetzen"));
  assert.equal(abdruck(neu({ figuren: 72 }).z), start, "ein neuer Lauf mit demselben Startwert ist der Anfang");
});

test("Ereignisse im Protokoll lassen sich im Zustand nachweisen", () => {
  const s = neu({ figuren: 72 });
  tage(s, 2);
  M.setzeMassnahme(s, "verbindung", "bruecke_rampe");
  tage(s, 2);
  M.nimmZurueck(s, "verbindung");
  tage(s, 2);
  const p = s.z.protokoll;
  assert.ok(p.some((e) => e.art === "massnahme") && p.some((e) => e.art === "ruecknahme"));
  for (const e of p) {
    if (e.art === "szene") { assert.ok(e.perspektive && /Modellszene/.test(e.text) && /kein Zitat/.test(e.anregung)); assert.ok(s.z.figuren[e.belege.figur].atelier.rolle); }
    if (e.art === "rueckkehr") for (const id of e.belege.figuren) assert.ok(s.z.figuren[id].wege.some((w) => (w.status === "ersetzt" || w.status === "aufgegeben") && (w.gewohnheit || w.irrtum)), `Figur ${id}`);
    if (/Am Laden gehen heute weniger/.test(e.text)) { const t = s.z.messung.tage.find((x) => x.tag === e.tag); if (t) assert.equal(t.zaehlung.laden[e.belege.stunde], e.belege.heute); }
    if (/Nordstrasse fuhren heute/.test(e.text)) { const t = s.z.messung.tage.find((x) => x.tag === e.tag); assert.equal(t.autos.N, e.belege.heute); }
  }
});

test("Ohne Eingriff: Aufenthalt, Begegnungen, Gewohnheiten und eine nachteilige Entwicklung entstehen aus dem Zusammenspiel", () => {
  const s = neu({ figuren: 72 });
  const t = tage(s, 5);
  assert.ok(t.at(-1).gewohnheiten > 0, "Gewohnheiten");
  assert.ok(t.at(-1).bekanntschaften > 0, "Bekanntschaften");
  assert.ok(t.some((d) => Object.values(d.aufenthalt).reduce((a, b) => a + b, 0) > 100), "Aufenthalt");
  assert.ok(t.at(-1).autos.N > t[0].autos.N, `Schleichweg durch die Nordstrasse wächst ohne Plan (${t[0].autos.N} → ${t.at(-1).autos.N})`);
  assert.ok(s.z.protokoll.every((e) => e.art !== "massnahme"), "niemand hat eingegriffen");
});

test("D: erreicht, anwesend, beteiligt, mitbestimmend sind getrennt; Mitbestimmung kann Bedingungen ändern", () => {
  const s = neu({ figuren: 72 });
  for (const [k, v] of [["gebuehr", "frei"], ["anmeldung", "vorort"], ["programm", "gruppe"]]) M.setzeMassnahme(s, `atelier.${k}`, v);
  const t = tage(s, 5);
  for (const d of t) { const a = d.atelier; assert.ok(a.erreicht >= a.anwesend && a.anwesend >= a.beteiligt, JSON.stringify(a)); }
  assert.ok(t.some((d) => d.atelier.mitbestimmend > 0), "mit offener Programmgruppe gibt es Mitbestimmende");
  const leitung = neu({ figuren: 72 });
  assert.ok(tage(leitung, 3).every((d) => d.atelier.mitbestimmend === 0), "ohne Programmgruppe bestimmt niemand mit");
});

test("Wege: jede Kante hat eine eigene Kennung; mit Zebrastreifen bleibt niemand an der Strasse hängen", async () => {
  const P = await import(new URL("alpha/stadt/stadtplan.js", root).href);
  const ids = P.KANTEN.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  const s = neu();
  M.setzeMassnahme(s, "querung", true);
  M.laufe(s, 4 * 3600);
  assert.ok(s.z.passanten.length < 40, `Passant:innen unterwegs: ${s.z.passanten.length}`);
  assert.ok(s.z.messung.heute.querungen.zebra > 0, "der Zebrastreifen wird benutzt");
});
