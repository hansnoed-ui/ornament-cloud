// ornament.lucerne ohne Browser: Klangsammlung anlegen/ergänzen, Vorhörproben, Studie (16 Takte) mit drei Varianten, ganzer Track,
// Export (ZIP mit Summe, Stems, Projekt und Zeitmarken), Test mit einer vierten Quelle. Gleiche Module wie im Composer.
//   node tools/composer-lucerne.mjs sammlung <ordner>                 Quellen analysieren (nur neue), Auswahl/Vorschläge eintragen
//   node tools/composer-lucerne.mjs vorhoeren <ordner> <ziel>         je Ausschnitt: Original, bearbeitet (lautheitsgleich), Rolle
//   node tools/composer-lucerne.mjs studie <ordner> <ziel> [seed]     16 Takte + drei Varianten (Fragmentierung/Instabilität)
//   node tools/composer-lucerne.mjs track <ordner> <ziel> [seed]      88 Takte (≈ 251 s bei 84 BPM) + ZIP
//   node tools/composer-lucerne.mjs test4 <ordner> <ziel>             vierte Quelle (synthetische TESTQUELLE): hinzufügen, ersetzen, neu
// Die Audiodateien bleiben im Ordner (nie im Repo); die Sammlung liegt daneben als klangsammlung.json.
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const root = new URL("../alpha/", import.meta.url);
const imp = (p) => import(new URL(p, root).href);
const { wavSpuren, wavSchreiben } = await imp("lab/kern/klangwerk.js");
const K = await imp("composer/kern/klangsammlung.js");
const S = await imp("composer/kern/sampler.js");
const LU = await imp("composer/kern/lucerne.js");
const { spurRechnen } = await imp("composer/kern/erzeugen.js");
const { rendern } = await imp("composer/kern/rendern.js");
const { PLUGINS } = await imp("composer/plugins/register.js");
const { messen } = await imp("composer/kern/messen.js");
const PR = await imp("composer/kern/projekt.js");
const { zipBlob } = await imp("composer/kern/zip.js");
const RATE = 48000;

const sha = (b) => createHash("sha256").update(b).digest("hex");
const r2 = (x) => Math.round(x * 100) / 100;

// ---------- Sammlung ----------
function sammlungLaden(ordner) {
  const datei = join(ordner, "klangsammlung.json");
  return existsSync(datei) ? JSON.parse(readFileSync(datei, "utf8")) : K.neueSammlung();
}
const sammlungSpeichern = (ordner, s) => writeFileSync(join(ordner, "klangsammlung.json"), JSON.stringify(s, null, 1));

/** alle WAV im Ordner: neue analysieren, bekannte (gleiche Prüfsumme) mit ihrer Analyse behalten; kuratierte Auswahl oder Vorschläge */
function sammlungAktualisieren(ordner, { nur = null } = {}) {
  let s = sammlungLaden(ordner);
  const auswahl = existsSync(join(ordner, "lucerne-auswahl.json")) ? JSON.parse(readFileSync(join(ordner, "lucerne-auswahl.json"), "utf8")).quellen : {};
  for (const name of wavListe(ordner).filter((f) => !nur || nur.includes(f))) {
    const bytes = readFileSync(join(ordner, name)), h = sha(bytes), id = K.quelleId(h), hk = herkunftVon(ordner, name);
    if (s.quellen.some((q) => q.id === id)) {
      // bekannte Quelle: Analyse bleibt; neu kuratierte Ausschnitte (gleiche ID = schon da) kommen dazu
      const neu = (auswahl[name] ?? []).map((c) => ({ ...c, id: K.ausschnittId(id, c.von, c.bis, c.rolle), quelle: id, rollen: [c.rolle], kuratiert: true })).filter((c) => !s.ausschnitte.some((a) => a.id === c.id));
      if (neu.length) s = K.ausschnitteHinzufuegen(s, neu);
      console.log(`= ${name} (${id}): bekannt, Analyse wiederverwendet${neu.length ? `, ${neu.length} kuratierte Ausschnitte ergänzt` : ""}`); continue;
    }
    const t0 = Date.now(), w = wavSpuren(new Uint8Array(bytes)), an = K.analysieren(w.spuren, w.rate);
    const test = /TEST/i.test(name);
    const r = K.quelleHinzufuegen(s, { name, sha256: h, bytes: bytes.length, rate: w.rate, kanaele: w.spuren.length, dauer: an.dauer, herkunft: test ? "test" : hk?.herkunft ?? "eigen", lizenz: hk?.lizenz, notiz: test ? "synthetische Testquelle (kein musikalisches Material)" : hk?.notiz ?? "" }, an);
    if (hk?.nichtVeroeffentlichen) r.quelle.nichtVeroeffentlichen = true;
    s = r.sammlung;
    const kur = auswahl[name];
    const cuts = kur ? kur.map((c) => ({ ...c, id: K.ausschnittId(id, c.von, c.bis, c.rolle), quelle: id, rollen: [c.rolle], kuratiert: true })) : K.ausschnitteVorschlagen(r.quelle);
    s = K.ausschnitteHinzufuegen(s, cuts);
    console.log(`+ ${name} (${id}): ${an.dauer} s, ${an.einsaetze.length} Einsätze, Tempo ≈ ${an.tempo.bpm} (Sicherheit ${an.tempo.sicherheit}), ${an.tonarten.map((t) => t.name).join(" / ")}, ${cuts.length} Ausschnitte ${kur ? "(kuratiert)" : "(Vorschläge)"} [${Date.now() - t0} ms]`);
  }
  sammlungSpeichern(ordner, s);
  return s;
}

/** alle WAV im Ordner und in Unterordnern (Name = Pfad relativ zum Ordner, mit «/») */
function wavListe(ordner, pre = "") {
  const out = [];
  for (const e of readdirSync(join(ordner, pre), { withFileTypes: true })) {
    if (e.isDirectory() && !/^(sammlung-test|\.)/.test(e.name)) out.push(...wavListe(ordner, pre ? `${pre}/${e.name}` : e.name));
    else if (/\.wav$/i.test(e.name)) out.push(pre ? `${pre}/${e.name}` : e.name);
  }
  return out.sort();
}
/** Herkunft je Unterordner: herkunft.json { herkunft: "extern", lizenz, notiz, nichtVeroeffentlichen } */
function herkunftVon(ordner, name) {
  const teile = name.split("/"); if (teile.length < 2) return null;
  const f = join(ordner, ...teile.slice(0, -1), "herkunft.json");
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
}

function materialLaden(ordner, s) {
  const m = new Map();
  for (const q of s.quellen) {
    const pfad = join(ordner, q.name);
    if (!existsSync(pfad)) { console.log(`! fehlt: ${q.name} (${q.id})`); continue; }
    const bytes = readFileSync(pfad);
    if (sha(bytes) !== q.sha256) { console.log(`! ${q.name}: Inhalt geändert (andere Prüfsumme) – nicht verwendet`); continue; }
    const w = wavSpuren(new Uint8Array(bytes)); m.set(q.id, { kanaele: w.spuren, rate: w.rate });
  }
  return m;
}

// ---------- Rechnen und Mischen ----------
async function planRechnen(plan, material) {
  const p = PR.neuesProjekt({ rate: RATE }); p.kammerton = plan.kammerton;
  const gerechnet = new Map(), spuren = [], mat = new Map(material);
  const reihenfolge = [...plan.spuren].sort((a, b) => (usesRes(a) ? 1 : 0) - (usesRes(b) ? 1 : 0));
  let resFertig = false;
  for (const s of reihenfolge) {
    if (usesRes(s) && !resFertig) { for (const [id, k] of LU.resamplingMaterial(plan, gerechnet, RATE)) mat.set(id, k); resFertig = true; }
    const t0 = Date.now();
    const k = s.quelle.erzeuger === S.SAMPLER ? S.samplerSpurRechnen(s.quelle, RATE, mat) : spurRechnen(s.quelle, RATE);
    if (k.fehlt?.length) console.log(`! ${s.name}: Material fehlt ${k.fehlt.join(", ")}`);
    gerechnet.set(s.key, k.kanaele);
    const sp = PR.erzeugteSpurDazu(p, s.quelle, { name: s.name, typ: s.typ, pegel: s.pegel, pan: s.pan, raum: s.raum, echo: s.echo });
    spuren.push({ id: sp.id, kanaele: k.kanaele, key: s.key });
    if (process.env.LUC_LAUT) console.log(`  ${s.key}: ${k.schlaege} Ereignisse, ${Date.now() - t0} ms`);
  }
  return { p, spuren, gerechnet };
}
const usesRes = (s) => Object.values(s.quelle.klaenge ?? {}).some((k) => String(k.quelle).startsWith("res:"));

async function mischen(p, spuren, ziel = -14) {
  let r = await rendern({ rate: RATE, plugins: PLUGINS, spuren, zustand: PR.motorZustand(p), stems: false });
  for (let k = 0; k < 3; k++) { const d = ziel - messen(r.summe, RATE).lufs; if (Math.abs(d) < 0.2) break; p.master.pegel = Math.max(-24, Math.min(18, p.master.pegel + d)); r = await rendern({ rate: RATE, plugins: PLUGINS, spuren, zustand: PR.motorZustand(p), stems: false }); }
  return r.summe;
}
function speichern(datei, k) {
  writeFileSync(datei, wavSchreiben(k, RATE, { bits: "24" }));
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", datei, "-c:a", "libmp3lame", "-b:a", "224k", datei.replace(/\.wav$/, ".mp3")]);
  const m = messen(k, RATE);
  console.log(`  → ${datei.split(/[\\/]/).pop()}: ${m.dauer} s, ${m.lufs} LUFS, ${m.tp} dBTP`);
  return m;
}
async function exportZip(datei, plan, p, spuren, sammlung) {
  const r = await rendern({ rate: RATE, plugins: PLUGINS, spuren, zustand: PR.motorZustand(p), stems: true });
  const name = "ornament-lucerne", dateien = [{ name: `${name}-summe.wav`, bytes: wavSchreiben(r.summe, RATE, { bits: "24" }) }];
  const dname = (x) => x.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  for (const sp of p.spuren) { const k = r.stems.get(sp.id); if (k) dateien.push({ name: `stems/${dname(sp.name)}.wav`, bytes: wavSchreiben(k, RATE, { bits: "24" }) }); }
  const marker = LU.markerMitZeit(plan);
  Object.assign(p, { titel: `ornament.lucerne · ${LU.AUSPRAEGUNGEN[plan.auspraegung].name}`, abschnitte: plan.abschnitte.map((a) => ({ ...a })), tempo: { ...p.tempo, bpm: plan.bpm, beginn: 0, quelle: "stil" }, lucerne: { ...plan, spuren: undefined }, marker,
    quellen: sammlung.quellen.map((q) => ({ id: q.id, name: q.name, sha256: q.sha256, dauer: q.dauer, herkunft: q.herkunft })) });
  dateien.push({ name: `${name}.composer.json`, bytes: new TextEncoder().encode(JSON.stringify(p, null, 1)) });
  dateien.push({ name: `${name}-zeitmarken.json`, bytes: new TextEncoder().encode(JSON.stringify(marker, null, 1)) });
  writeFileSync(datei, new Uint8Array(await (await zipBlob(dateien)).arrayBuffer()));
  console.log(`  → ${datei}: ${p.spuren.length} Stems, ${marker.length} Zeitmarken`);
}

/**
 * Spuren gezielt anpassen (LUC_SPUREN='{"motiv": { "raum": {…}, "echo": {…}, "pegel": −2, "ohneWaerme": true, "schritteDazu": [{ "art": "hochpass", "f": 250 }] }, …}'):
 * Raum, Echo und Pegel ersetzen die Werte des Plans; «ohneWaerme» nimmt die Sättigung aus den Klängen dieser Spur; «schritteDazu» hängt
 * Bearbeitungsschritte an jeden Klang der Spur. Das Arrangement (Ereignisse) bleibt unberührt.
 */
function spurenAnpassen(plan) {
  if (!process.env.LUC_SPUREN) return;
  for (const [key, a] of Object.entries(JSON.parse(process.env.LUC_SPUREN))) {
    const sp = plan.spuren.find((x) => x.key === key);
    if (!sp) { console.log(`  (keine Spur «${key}»)`); continue; }
    if (a.raum) sp.raum = { ...(sp.raum ?? {}), ...a.raum };
    if (a.echo) sp.echo = { ...(sp.echo ?? {}), ...a.echo };
    if (a.pegel != null) sp.pegel = a.pegel;
    for (const kl of Object.values(sp.quelle.klaenge ?? {})) {
      if (a.ohneWaerme) kl.schritte = kl.schritte.filter((x) => x.art !== "waerme");
      if (a.schritteDazu) kl.schritte = [...kl.schritte, ...a.schritteDazu];
    }
    console.log(`  angepasst: ${key} ${JSON.stringify(a)}`);
  }
}

/** Warnung, wenn fremdes, geschütztes Material im Plan steckt (wie NC beim Export des Composers) */
function warnenExtern(plan, s) {
  const ids = new Set(Object.values(plan.material).flat().map((id) => s.ausschnitte.find((a) => a.id === id)?.quelle));
  const ext = s.quellen.filter((q) => ids.has(q.id) && (q.herkunft === "extern" || q.nichtVeroeffentlichen));
  if (ext.length) console.log(`  ACHTUNG: fremdes Material (${ext.map((q) => `${q.name}: ${q.lizenz ?? "Lizenz unbekannt"}`).join("; ")}) – nur privat, nicht veröffentlichen`);
  return ext;
}

/** Herkunft jedes verwendeten Ausschnitts (für die Dokumentation) */
function herkunftTabelle(plan, s) {
  const zeilen = [];
  for (const [rolle, ids] of Object.entries(plan.material)) for (const id of ids) {
    const a = s.ausschnitte.find((x) => x.id === id), q = s.quellen.find((x) => x.id === a?.quelle);
    zeilen.push(`${rolle.padEnd(15)} ${id.padEnd(12)} ${q?.name ?? "?"} ${a?.von}–${a?.bis} s  ${a?.name ?? ""}`);
  }
  return zeilen.join("\n");
}

// ---------- Befehle ----------
const [modus, ordner, ziel, seedArg] = process.argv.slice(2);
const seed = Number(seedArg ?? 1);
if (modus === "sammlung") {
  const s = sammlungAktualisieren(ordner);
  console.log(`${s.quellen.length} Quellen, ${s.ausschnitte.length} Ausschnitte`);
} else if (modus === "vorhoeren") {
  const s = sammlungAktualisieren(ordner), m = materialLaden(ordner, s); mkdirSync(ziel, { recursive: true });
  const plan = LU.planen({ sammlung: s, seed });
  const verwendet = new Set(Object.values(plan.material).flat());
  const liste = [];
  for (const a of s.ausschnitte.filter((x) => verwendet.has(x.id))) {
    const q = s.quellen.find((x) => x.id === a.quelle), mat = m.get(a.quelle);
    if (!mat) continue;
    const orig = S.bearbeiten(S.ausschnitt(mat, a.von, a.bis, RATE), RATE, [{ art: "normal", db: -20 }]);
    const sp = plan.spuren.find((x) => Object.values(x.quelle.klaenge ?? {}).some((k) => k.ausschnitt === a.id));
    const kl = sp && Object.values(sp.quelle.klaenge).find((k) => k.ausschnitt === a.id);
    let bearb = kl ? S.bearbeiten(S.ausschnitt(mat, a.von, a.bis, RATE), RATE, [...(kl.cent ? [{ art: "band", cent: kl.cent }] : []), ...kl.schritte]) : orig;
    // die für die Rolle typische Verwendung dazu (Akkord verlangsamt, Körner, Band)
    const ev = sp?.quelle.ereignisse.find((e) => sp.quelle.klaenge[e.klang] === kl && e.schritte?.length);
    if (ev && sp.key !== "fragment") bearb = S.bearbeiten(bearb, RATE, ev.schritte.map((x) => (x.art === "koerner" ? { ...x, dauer: Math.min(x.dauer, 12) } : x)));
    bearb = S.bearbeiten(bearb, RATE, [{ art: "normal", db: -20 }]);
    const basis = `${String(liste.length + 1).padStart(2, "0")}-${a.rolle}-${q.name.replace(/\.wav$/, "")}-${Math.round(a.von)}s`;
    const pause = [new Float32Array(RATE * 0.6), new Float32Array(RATE * 0.6)], folge = [orig, pause, bearb];
    const n = folge.reduce((x, k) => x + k[0].length, 0), out = [new Float32Array(n), new Float32Array(n)]; let o = 0; for (const k of folge) { out[0].set(k[0], o); out[1].set(k[1] ?? k[0], o); o += k[0].length; }
    for (const ch of out) for (let i = 0; i < ch.length; i++) ch[i] = Math.max(-0.98, Math.min(0.98, ch[i]));
    speichern(join(ziel, `${basis}.wav`), out);
    liste.push({ datei: `${basis}.mp3`, rolle: a.rolle, quelle: q.name, von: a.von, bis: a.bis, name: a.name, bearbeitung: [...(kl?.schritte ?? []), ...(ev?.schritte ?? [])].map((x) => x.art).join(" → "), grund: a.grund });
  }
  writeFileSync(join(ziel, "vorhoeren.json"), JSON.stringify(liste, null, 1));
} else if (modus === "studie") {
  const s = sammlungAktualisieren(ordner), m = materialLaden(ordner, s); mkdirSync(ziel, { recursive: true });
  const fassungen = [["studie", {}], ["variante-1-ruhig", { fragmentierung: 10, instabilitaet: 15 }], ["variante-2-mittel", { fragmentierung: 50, instabilitaet: 55 }], ["variante-3-zerfallen", { fragmentierung: 85, instabilitaet: 85 }]];
  const ergebnis = [];
  for (const [name, makros] of fassungen) {
    console.log(`${name} …`);
    const plan = LU.planen({ sammlung: s, seed, studie: true, makros });
    const { p, spuren } = await planRechnen(plan, m);
    const mm = speichern(join(ziel, `lucerne-${name}.wav`), await mischen(p, spuren, -16));
    ergebnis.push({ name, makros: plan.makros, lufs: mm.lufs, tp: mm.tp, dauer: mm.dauer, motiv: plan.marker.filter((x) => x.art === "motiv").map((x) => `T${x.takt + 1}: ${x.text}`) });
    if (name === "studie") writeFileSync(join(ziel, "studie-plan.json"), JSON.stringify(plan, null, 1));
  }
  writeFileSync(join(ziel, "studie.json"), JSON.stringify(ergebnis, null, 1));
} else if (modus === "track") {
  const s = sammlungAktualisieren(ordner), m = materialLaden(ordner, s); mkdirSync(ziel, { recursive: true });
  const auswahl = process.env.LUC_QUELLEN ? s.quellen.filter((q) => q.name.startsWith(process.env.LUC_QUELLEN)).map((q) => q.id) : null;
  // LUC_MATERIAL='{"rolle": ["Name oder Teil davon", …], …}' legt das Material je Rolle ausdrücklich fest
  const ersetze = process.env.LUC_MATERIAL ? Object.fromEntries(Object.entries(JSON.parse(process.env.LUC_MATERIAL)).map(([r, namen]) => [r, namen.map((n) => { const c = s.ausschnitte.find((x) => x.name === n) ?? s.ausschnitte.find((x) => (x.name ?? "").includes(n)); if (!c) throw new Error(`kein Ausschnitt «${n}»`); return c.id; })])) : null;
  const plan = LU.planen({ sammlung: s, seed, auswahl, ersetze, bpm: process.env.LUC_BPM ? Number(process.env.LUC_BPM) : undefined, variieren: !!process.env.LUC_VARIIEREN, makros: process.env.LUC_MAKROS ? JSON.parse(process.env.LUC_MAKROS) : undefined });
  console.log(`Tonart ${plan.grundton} ${plan.leiter} (${plan.tonartGrund}), ${plan.bpm} BPM, ${plan.takte} Takte + ${LU.AUSKLANG} Ausklang, ${plan.spuren.length} Spuren`);
  for (const h of plan.hinweise) console.log(`  Hinweis: ${h}`);
  console.log(herkunftTabelle(plan, s));
  warnenExtern(plan, s);
  const t0 = Date.now(), { p, spuren } = await planRechnen(plan, m);
  console.log(`  gerechnet in ${Math.round((Date.now() - t0) / 1000)} s`);
  const nameT = process.env.LUC_NAME ?? `ornament-lucerne-erinnerung-${seed}`;
  speichern(join(ziel, `${nameT}.wav`), await mischen(p, spuren, -14));
  if (!process.env.LUC_OHNE_ZIP) await exportZip(join(ziel, `${nameT}.zip`), plan, p, spuren, s);
  writeFileSync(join(ziel, `plan-${seed}.json`), JSON.stringify(plan, null, 1));
  console.log(plan.abschnitte.map((a) => `T${a.von + 1}–${a.bis}: ${a.name} (${r2((a.von * 240) / plan.bpm)} s)`).join("\n"));
} else if (modus === "fassung") {
  // dieselbe Komposition (Startwert, Motiv, Groove, Bass, Tempo, Tonart gesperrt) mit anderem Material je Rolle:
  //   node tools/composer-lucerne.mjs fassung <ordner> <ziel> <seed> "main_motif=Schimmer" "texture=helle Stelle" …  (Teil des Ausschnittnamens)
  const s = sammlungAktualisieren(ordner), m = materialLaden(ordner, s); mkdirSync(ziel, { recursive: true });
  // Feinschliff ohne Änderung des Arrangements: Tempo, Groove (Zweitakter) und Timing je Rolle gelten schon für den Ausgangsplan
  const fein = { bpm: process.env.LUC_BPM ? Number(process.env.LUC_BPM) : undefined, groove: process.env.LUC_GROOVE ? JSON.parse(process.env.LUC_GROOVE) : undefined, timing: process.env.LUC_TIMING ? JSON.parse(process.env.LUC_TIMING) : undefined };
  const vorher = LU.planen({ sammlung: s, seed, ...fein }), ersetze = {};
  for (const a of process.argv.slice(6)) {
    const [rolle, namen] = a.split("=");
    ersetze[rolle] = namen.split(";").map((n) => { const c = s.ausschnitte.find((x) => (x.name ?? "").includes(n.trim()) && !x.aus); if (!c) throw new Error(`kein Ausschnitt «${n}»`); return c.id; });
  }
  const plan = LU.planen({ sammlung: s, seed, vorher, sperren: { motiv: true, groove: true, bass: true, tempo: true, tonart: true, material: true }, ersetze, ...fein });
  spurenAnpassen(plan);
  for (const h of plan.hinweise) console.log(`  Hinweis: ${h}`);
  console.log(herkunftTabelle(plan, s));
  const { p, spuren } = await planRechnen(plan, m);
  const basis = join(ziel, process.env.LUC_NAME ?? `ornament-lucerne-erinnerung-${seed}-fassung-b`);
  speichern(`${basis}.wav`, await mischen(p, spuren, -14));
  await exportZip(`${basis}.zip`, plan, p, spuren, s);
  writeFileSync(`${basis}-plan.json`, JSON.stringify(plan, null, 1));
} else if (modus === "test4") {
  // eine synthetische TESTQUELLE (deutlich so benannt): gestimmte Glockenschläge auf Cis und eine Rauschfläche
  mkdirSync(ziel, { recursive: true });
  const testOrdner = join(ziel, "sammlung-test"); mkdirSync(testOrdner, { recursive: true });
  for (const f of readdirSync(ordner).filter((x) => /\.(wav|json)$/i.test(x))) writeFileSync(join(testOrdner, f), readFileSync(join(ordner, f)));
  const vorher = sammlungLaden(testOrdner), idsVorher = vorher.quellen.map((q) => q.id), planVorher = LU.planen({ sammlung: vorher, seed });
  const n = RATE * 20, L = new Float32Array(n), R = new Float32Array(n);
  let x = 1; const rnd = () => ((x = (x * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 10; k++) { const t0 = Math.round((0.5 + k * 1.9) * RATE), f = 554.37 * (k % 3 === 2 ? 1.5 : 1); for (let i = 0; i < RATE * 1.6 && t0 + i < n; i++) { const e = Math.exp(-i / (RATE * 0.45)), v = 0.3 * e * (Math.sin((6.2832 * f * i) / RATE) + 0.4 * Math.sin((6.2832 * f * 2.76 * i) / RATE)); L[t0 + i] += v; R[t0 + i] += v; } }
  for (let i = 0; i < n; i++) { const r = (rnd() * 2 - 1) * 0.02 * (0.5 + 0.5 * Math.sin(i / RATE)); L[i] += r; R[i] += r * 0.9; }
  writeFileSync(join(testOrdner, "TESTQUELLE_lucerne_synthetisch.wav"), wavSchreiben([L, R], RATE, { bits: "24" }));
  // 1. Zur Klangsammlung hinzufügen: nur die neue Quelle wird analysiert
  const s = sammlungAktualisieren(testOrdner);
  const neu = s.quellen.find((q) => q.test);
  const bericht = [];
  bericht.push(`Hinzufügen: ${s.quellen.length} Quellen (vorher ${idsVorher.length}); bisherige IDs unverändert: ${idsVorher.every((id) => s.quellen.some((q) => q.id === id))}; neue ID ${neu.id} (als Test gekennzeichnet: ${neu.test})`);
  const planGleich = LU.planen({ sammlung: s, seed, auswahl: idsVorher });
  bericht.push(`gespeicherter Track bleibt gleich, solange die Auswahl die alten Quellen sind: ${JSON.stringify(planGleich.material) === JSON.stringify(planVorher.material) && JSON.stringify(planGleich.spuren.map((x) => x.quelle.ereignisse ?? x.quelle.takte)) === JSON.stringify(planVorher.spuren.map((x) => x.quelle.ereignisse ?? x.quelle.takte))}`);
  // 2. Ersetzen: Akzent-Rolle durch die Testquelle, Motiv/Groove/Bass/Tempo/Tonart/Abschnitte gesperrt
  const altAkzent = s.ausschnitte.find((a) => a.id === planVorher.material.accent[0]);
  const pr = K.ersetzenPruefen(s, altAkzent, neu.id, { bpm: planVorher.bpm });
  bericht.push(`Ersetzen (Akzent ${altAkzent.name} → ${neu.name}):\n  - ${pr.pruefung.join("\n  - ")}`);
  const s2 = K.ausschnitteHinzufuegen(s, [pr.vorschlag]);
  const sperren = { motiv: true, groove: true, bass: true, tempo: true, tonart: true, material: true };   // wie «übernehmen» in der Oberfläche
  const planErsetzt = LU.planen({ sammlung: s2, seed, vorher: planVorher, sperren, ersetze: { accent: [pr.vorschlag.id] } });
  const gleich = (k) => JSON.stringify(planErsetzt.spuren.find((x) => x.key === k)?.quelle.ereignisse ?? planErsetzt.spuren.find((x) => x.key === k)?.quelle.takte) === JSON.stringify(planVorher.spuren.find((x) => x.key === k)?.quelle.ereignisse ?? planVorher.spuren.find((x) => x.key === k)?.quelle.takte);
  bericht.push(`nach dem Ersetzen: Akzente aus ${planErsetzt.material.accent.map((id) => s2.ausschnitte.find((a) => a.id === id)?.name).join(", ")}; Motiv gleich ${gleich("motiv")}, Harmonie gleich ${gleich("harmonie")}, Kick gleich ${gleich("kick")}, Bass gleich ${gleich("bass")}, Akzent-Positionen gleich ${JSON.stringify(planErsetzt.spuren.find((x) => x.key === "akzent").quelle.ereignisse.map((e) => e.t)) === JSON.stringify(planVorher.spuren.find((x) => x.key === "akzent").quelle.ereignisse.map((e) => e.t))}, Tempo ${planErsetzt.bpm}, Tonart gleich ${planErsetzt.grundton === planVorher.grundton}`);
  // Rückgängig: der vorige Plan ergibt mit derselben Sammlung wieder genau dieselben Ereignisse
  const zurueck = LU.planen({ sammlung: s2, seed, vorher: planVorher, sperren: { ...sperren }, ersetze: { accent: planVorher.material.accent } });
  bericht.push(`Rückgängig (Akzente wieder wie vorher): Ereignisse gleich ${JSON.stringify(zurueck.spuren.map((x) => x.quelle.ereignisse ?? x.quelle.takte)) === JSON.stringify(planVorher.spuren.map((x) => x.quelle.ereignisse ?? x.quelle.takte))}`);
  writeFileSync(join(ziel, "plan-vorher.json"), JSON.stringify(planVorher, null, 1));
  // 3. Neues Projekt nur mit Testquelle + einer alten Quelle
  const planNeu = LU.planen({ sammlung: s2, seed: 2, studie: true, auswahl: [neu.id, idsVorher[0]] });
  bericht.push(`neues Projekt (Studie, Startwert 2, Auswahl Testquelle + ${s.quellen[0].name}): Material ${JSON.stringify(Object.fromEntries(Object.entries(planNeu.material).map(([k, v]) => [k, v.length])))}; Hinweise: ${planNeu.hinweise.join("; ") || "keine"}`);
  const m = materialLaden(testOrdner, s2);
  const { p, spuren } = await planRechnen(planErsetzt, m);
  speichern(join(ziel, "test4-ersetzt-akzente.wav"), await mischen(p, spuren, -14));
  console.log(bericht.join("\n"));
  writeFileSync(join(ziel, "test4-bericht.txt"), bericht.join("\n"));
} else console.log("node tools/composer-lucerne.mjs sammlung|vorhoeren|studie|track|test4 <ordner> [ziel] [seed]");
