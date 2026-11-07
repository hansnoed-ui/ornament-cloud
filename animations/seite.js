// Animationen – die Seite: Mischpult (das eigene Bild, Grund, drei Ebenen, Schalter, Sichern) mit den gesicherten Werken darunter
// (gestreutes Raster, beim Darüberfahren lebendig, Klick lädt ins Mischpult) und Info. Ein Motor zeichnet für alles; die sichtbare
// Leinwand übernimmt sein Bild. Seit 4. November 2026 ohne Reel, Beispielbilder und vorgefertigte Werke.
import { motorErstellen, videoErstellen, DAUER, LAENGEN, MODI } from "./motor.js?v=33";
import { EFFEKTE, EFFEKT_IDS, stufe, wertVon } from "./effekte.js?v=33";
import { zufall, EIGEN } from "./rezepte.js?v=33";
import { kurz, lang } from "./link.js?v=33";
import { t, herkunft, fehlerText, SPRACHE, GEBIET } from "./sprache.js?v=33";
import { VIDEO_AN, VIDEO_PX, VIDEO_PX_SPARSAM, istVideo, videoZerlegen } from "./video.js?v=33";

const $ = (id) => document.getElementById(id);
const el = (tag, attr = {}, ...kinder) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attr)) if (k === "text") e.textContent = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
  e.append(...kinder);
  return e;
};
const zwei = (n) => String(n).padStart(2, "0");
const mmss = (t) => `${zwei(Math.floor(t / 60))}:${zwei(Math.floor(t % 60))}`;
const uhrText = (t) => `${mmss(t)},${Math.floor((t % 1) * 10)} / ${mmss(S.dauer)}`;
const MODUS_NAMEN = { normal: t("Normal"), multiplizieren: t("Multiplizieren"), differenz: t("Differenz"), bildschirm: t("Bildschirm"), ueberlagern: t("Überlagern") };
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const kopie = (o) => JSON.parse(JSON.stringify(o));
const slug = (s) => s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mischung";
// die Ablage liegt neben diesem Modul, auch für die Seiten /animations/en/ und /animations/es/ (5. November 2026)
const DIENST = new URL("werke.php", import.meta.url).pathname;
const ablageAdresse = (w) => (w && typeof w.bild === "string" ? { ...w, bild: new URL(w.bild, new URL(DIENST, location.href)).href } : w);   // werke/ID.jpg neben werke.php
const werkBild = (w) => `w:${w.id}`;   // Schlüssel des Bildes eines gesicherten Werks im Motor
const datum = (iso) => { try { return new Date(iso).toLocaleDateString(GEBIET, { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; } };
const merken = (k, v) => { try { localStorage.setItem(k, v); } catch { /* privat */ } };
const gemerkt = (k) => { try { return localStorage.getItem(k) ?? ""; } catch { return ""; } };

let motor, wiederTimer = 0;
try {
  motor = motorErstellen({
    // Kontext verloren: der Motor wartet auf ihn und rechnet danach sparsam; kommt er nicht zurück, hilft nur neu laden
    verloren: () => {
      pultMeldung(t("Die Grafik des Geräts hat kurz ausgesetzt. Einen Moment …"));
      clearTimeout(wiederTimer);
      wiederTimer = setTimeout(() => pultMeldung(t("Die Grafik kommt nicht zurück. Die Seite neu laden; hilft das nicht, den Browser ganz schliessen und neu öffnen.")), 4000);
    },
    zurueck: () => { clearTimeout(wiederTimer); pultMeldung(t("Die Grafik läuft wieder, ab jetzt mit weniger Teilchen.")); kachelnMalen(); },
  });
} catch (f) {
  document.querySelector("main").replaceChildren(el("div", { class: "ohne-webgl" },
    el("p", { text: t("Diese Seite braucht WebGL 2. {fehler}", { fehler: f.message }) }),
    el("p", {}, el("button", { type: "button", text: t("Neu laden"), onclick: () => location.reload() }))));
  throw f;
}

// ——— Zustand ———
const S = {
  ansicht: "mischpult", laeuft: !ruhig, t0: performance.now(), tPause: DAUER * .35,
  mix: zufall(), live: null, export: null,
  ohneBild: false,   // «Bild zeigen: aus»: das Bild steuert die Effekte nur noch
  durchlauf: false, dauer: DAUER,   // «Durchlauf» statt hin und zurück, Länge der Schlaufe (12, 30 oder 60 s)
  format: "4x5",   // Seitenverhältnis 4:5, 1:1 oder 16:9 (PR #615, Wunsch: «alle animationen umstellbar auf 4:5, 1:1, 16:9»); steht in der gesicherten Mischung
  bildBlob: null, bildName: "",   // das eigene Bild als JPEG (für «Werk sichern»), bleibt im Browser
  werk: null,   // das zuletzt ins Mischpult geladene gesicherte Werk
  werke: [], eigene: {}, dienst: false,   // alle gesicherten Werke; die eigenen mit ihrem Schlüssel (zum Löschen); ob werke.php antwortet
};
try { S.eigene = JSON.parse(gemerkt("animationen.eigene") || "{}"); } catch { S.eigene = {}; }
const mit = (stapel) => ({ ...stapel, ohneBild: S.ohneBild || undefined, durchlauf: S.durchlauf || undefined, dauer: S.dauer, format: S.format !== "4x5" ? S.format : undefined });
const ohne = () => (S.ohneBild ? "-ohne-bild" : "") + (S.durchlauf ? "-durchlauf" : "") + (S.dauer !== DAUER ? `-${S.dauer}s` : "");
// Format: Seitenverhältnis (Breite/Höhe) und Grösse für Standbild und MP4
const FORMATE = { "4x5": { name: "4:5", ar: 4 / 5, gross: [1080, 1350] }, "1x1": { name: "1:1", ar: 1, gross: [1080, 1080] }, "16x9": { name: "16:9", ar: 16 / 9, gross: [1920, 1080] } };
const fmt = () => FORMATE[S.format] ?? FORMATE["4x5"];
const arVon = (stapel) => (FORMATE[stapel?.format] ?? FORMATE["4x5"]).ar;   // jedes gesicherte Werk in seinem Format
const kachelGr = (stapel) => [240, Math.round(240 / arVon(stapel))];
const zeit = () => S.laeuft ? (performance.now() - S.t0) / 1000 : S.tPause;
const hatBild = () => motor.hatBild(S.mix.bild);

// ——— Leinwand passend zur Anzeige (Bildschirmdichte, höchstens 1080 breit) ———
// Drossel: braucht die Bühne lange für ein Bild (schwere Effekte auf schwacher Grafik), rechnet sie mit etwas weniger Pixeln, bevor
// die Grafik des Geräts aussetzt; nur die Anzeige, Standbild und MP4 bleiben in voller Grösse. Seit 5. November 2026 (Christian:
// «hier auch ungut», das Bild auf dem Handy grob und verwaschen) höchstens auf 70 %, nur nach anhaltend langsamen Bildern, Bilder mit
// frisch übersetzten Effekten zählen nicht, sie erholt sich, sobald es wieder flüssig läuft, und jede neue Mischung beginnt scharf
let drossel = 1, langsam = 0, schnell = 0, letztesBild = 0, letzteUebersetzung = 0, letzteMischung = null;
const DROSSEL_MIN = .7;
function aufloesung(c, max = 1080) {
  const r = c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, motor.sparsam ? 1.75 : 2) * drossel;   // Handys: etwas weniger Pixel für die schweren Effekte (1.5 war zu weich)
  const b = Math.max(40, Math.min(max, Math.round(r.width * d)));
  return [b, Math.round(b / fmt().ar)];
}
function malen(c, stapel, t, [b, h] = aufloesung(c), huelle = mit) {
  if (!motor.hatBild(stapel.bild)) return;
  if (c.width !== b || c.height !== h) { c.width = b; c.height = h; }
  motor.zeichnen(huelle(stapel), t, b, h);
  c.getContext("2d").drawImage(motor.leinwand, 0, 0, b, h);
}

// ——— Ansichten ———
function ansicht(name, { verlauf = true } = {}) {
  S.ansicht = name;
  for (const s of document.querySelectorAll(".ansicht")) s.hidden = s.id !== name;
  for (const b of document.querySelectorAll("[data-ansicht]")) b.setAttribute("aria-pressed", String(b.dataset.ansicht === name));
  if (verlauf) adresse();
  scrollTo(0, 0);
}
/** die Mischung, wie sie in einem Link steht: mit den Schaltern, ein gesichertes Werk mit seiner Kennung, ohne eigenes Bild, ohne leere Ebenen am Ende */
const voll = (e) => e.effekt && EFFEKTE[e.effekt];   // leere Ebenen füllt das Pult beim Öffnen wieder auf; gesichert werden sie nicht
function linkMischung() {
  const m = { ...S.mix, ohneBild: S.ohneBild || undefined, durchlauf: S.durchlauf || undefined, dauer: S.dauer !== DAUER ? S.dauer : undefined, format: S.format !== "4x5" ? S.format : undefined };
  if (m.bild.startsWith("w:")) m.werk = m.bild.slice(2);   // ein gesichertes Werk steht mit seiner Kennung im Link
  delete m.bild;   // ein eigenes Bild steht nicht im Link
  m.ebenen = m.ebenen.slice(0, m.ebenen.findLastIndex(voll) + 1);
  return m;
}
function adresse() {
  let h = S.ansicht;
  if (S.ansicht === "mischpult") {
    // die Adresszeile (link.js): ein unverändertes Werk nur mit seiner Kennung, sonst die Mischung kompakt; der alte lange Link nur, wenn nichts anderes passt.
    // Zum Teilen gibt «Link kopieren» einen Kurzlink ornament.cloud/a/KURZ (kurzlink())
    const m = linkMischung(), k = kurz(m), w = S.werk;
    if (k && w && m.werk === w.id && kurz({ ...m, ebenen: m.ebenen.filter(voll) }) === kurz({ ...w.stapel, werk: w.id, dauer: w.stapel.dauer !== DAUER ? w.stapel.dauer : undefined })) h = `w=${w.id}`;
    else h = k ? `k=${k}` : `m=${btoa(unescape(encodeURIComponent(JSON.stringify(m)))).replace(/=+$/, "")}`;
  }
  history.replaceState(null, "", `${sauber()}#${h}`);
}
/** die Adresse ohne Anhängsel von Facebook, Instagram, Google und Newslettern (?fbclid=…, utm_…): die Seite braucht keine Abfrage */
const sauber = () => location.pathname;
/** eine Mischung aus einem Link ins Pult: Schalter setzen, das Bild eines gesicherten Werks über seine Kennung */
function mischungAnwenden(m) {
  if (!m || !Array.isArray(m.ebenen)) return { ansicht: "mischpult" };
  m = { ...m };
  S.ohneBild = !!m.ohneBild; S.durchlauf = !!m.durchlauf; S.dauer = LAENGEN.includes(m.dauer) ? m.dauer : DAUER; if (FORMATE[m.format]) S.format = m.format;
  const werk = typeof m.werk === "string" ? m.werk : null;
  delete m.ohneBild; delete m.durchlauf; delete m.dauer; delete m.werk; delete m.format;
  S.mix = { ...m, bild: werk ? `w:${werk}` : EIGEN, grund: m.grund === "weiss" ? "weiss" : "schwarz" };
  return { ansicht: "mischpult", werk };
}
/** liest die Adresse: #a=KURZ ein Kurzlink (/a/KURZ), #w=ID öffnet ein Werk, #k=… (kompakt) oder #m=… (alter Link) eine Mischung, #info die Info */
function ausAdresse() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (h.startsWith("a=") && /^[0-9A-Za-z]{6,10}$/.test(h.slice(2))) return { ansicht: "mischpult", kurz: h.slice(2) };
  if (h.startsWith("w=")) return { ansicht: "mischpult", werk: h.slice(2) };
  if (h.startsWith("m=") || h.startsWith("k=")) {
    try { return mischungAnwenden(h.startsWith("k=") ? lang(h.slice(2)) : JSON.parse(decodeURIComponent(escape(atob(h.slice(2)))))); }
    catch { return { ansicht: "mischpult" }; }   // kaputter Link
  }
  return { ansicht: h === "info" ? "info" : "mischpult" };
}
/** Kurzlink zum Teilen: die Mischung in werke.php ablegen, zurück kommt ornament.cloud/a/KURZ; ohne Ablage der lange Link */
async function kurzlink() {
  const m = linkMischung();
  const r = await fetch(DIENST, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ aktion: "kurz", werk: m.werk ?? "", stapel: { ...m, werk: undefined } }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.kurz) throw new Error(d.fehler || t("Antwort {status}", { status: r.status }));
  return `${location.origin}/a/${d.kurz}${SPRACHE === "de" ? "" : `/${SPRACHE}`}`;   // /a/KURZ/en öffnet die englische Seite (.htaccess)
}
for (const b of document.querySelectorAll("[data-ansicht]")) b.addEventListener("click", () => ansicht(b.dataset.ansicht));
// Sprachen: die Mischung (die Adresse nach #) geht in die andere Sprache mit
for (const a of document.querySelectorAll(".sprachen a")) a.addEventListener("click", () => { a.hash = location.hash; });

// ——— Bild zeigen: an/aus, Bewegung, Pause ———
function bildZeigen(an) {
  S.ohneBild = !an;
  pultAufbauen(); kachelnMalen(); adresse();
}
const standText = () => { $("pult-stand").textContent = `${S.dauer} s · ${S.durchlauf ? t("Durchlauf") : t("hin und zurück")}`; };
function bewegung({ durchlauf = S.durchlauf, dauer = S.dauer } = {}) {
  const t = zeit() % S.dauer;
  S.durchlauf = durchlauf; S.dauer = dauer;
  if (!S.laeuft) S.tPause = t % S.dauer; else S.t0 = performance.now() - (t % S.dauer) * 1000;
  standText(); pultAufbauen(); kachelnMalen(); adresse();
}
// ——— Format: 4:5, 1:1, 16:9 für Bühne, Standbild und MP4; das Bild füllt das Format immer ganz (zugeschnitten) ———
function formatSetzen(f) {
  if (!FORMATE[f]) return;
  S.format = f; document.documentElement.dataset.format = f;
  pultAufbauen(); adresse();
}
function pause(an) {
  if (an === S.laeuft) return;
  if (an) S.t0 = performance.now() - S.tPause * 1000; else S.tPause = zeit() % S.dauer;
  S.laeuft = an;
  $("pult-pause").textContent = S.laeuft ? t("Pause") : t("Abspielen");
}
$("pult-pause").addEventListener("click", () => pause(!S.laeuft));
$("pult-bild").addEventListener("click", () => pause(!S.laeuft));
addEventListener("keydown", (e) => {
  if (e.code !== "Space" || e.target.closest("input, select, textarea, button, a") || S.ansicht !== "mischpult") return;
  e.preventDefault(); pause(!S.laeuft);
});
// Standbild: das Bild, das gerade zu sehen ist, als PNG in 1080 × 1350
function standbild() {
  if (!hatBild()) { pultMeldung(t("Zuerst ein Bild wählen.")); return; }
  const jetzt = zeit() % S.dauer, [gb, gh] = fmt().gross;
  motor.zeichnen(mit(S.mix), jetzt, gb, gh);
  motor.leinwand.toBlob((blob) => {
    if (!blob) return;
    const a = el("a", { href: URL.createObjectURL(blob), download: `ornament-animation-${werkName()}${ohne()}-${zwei(Math.floor(jetzt))}s${Math.floor((jetzt % 1) * 10)}-${S.format}.png` });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
  }, "image/png");
}
$("pult-bildpng").addEventListener("click", standbild);
const werkName = () => S.mix.bild.startsWith("w:") && S.werk ? slug(S.werk.titel || S.werk.name) : "mischung";

// ——— Mischpult ———
const leer = () => ({ effekt: "", werte: [], modus: "normal", deckkraft: 1, quelle: "bild", seed: 0 });
function pultAufbauen() {
  const m = S.mix;
  while (m.ebenen.length < 3) m.ebenen.push(leer());
  const bilder = [];
  const eigenText = motor.istVideo(EIGEN) ? t("Dein Video · {name}", { name: S.bildName }) : S.bildName ? t("Dein Bild · {name}", { name: S.bildName }) : t("Dein Bild");
  if (motor.hatBild(EIGEN)) bilder.push(el("button", { type: "button", "aria-pressed": String(m.bild === EIGEN), text: eigenText, onclick: () => { m.bild = EIGEN; pultAufbauen(); adresse(); } }));
  if (S.werk && motor.hatBild(werkBild(S.werk))) bilder.push(el("button", { type: "button", "aria-pressed": String(m.bild === werkBild(S.werk)), text: t("Werk von {name}", { name: S.werk.name }), onclick: () => { m.bild = werkBild(S.werk); pultAufbauen(); adresse(); } }));
  bilder.push(el("button", { type: "button", class: "hochladen", text: motor.hatBild(EIGEN) ? t("Anderes Bild …") : t("Bild wählen …"), onclick: () => $("pult-datei").click() }));
  $("pult-bilder").replaceChildren(...bilder);
  $("buehne").classList.toggle("ohne", !hatBild());
  $("pult-zeigen").replaceChildren(...[[false, t("An")], [true, t("Aus")]].map(([aus, text]) => el("button", { type: "button", "aria-pressed": String(S.ohneBild === aus), text,
    onclick: () => bildZeigen(!aus) })));
  $("pult-format").replaceChildren(...Object.entries(FORMATE).map(([k, f]) => el("button", { type: "button", "aria-pressed": String(S.format === k), text: f.name,
    onclick: () => formatSetzen(k) })));
  $("pult-lauf").replaceChildren(...[[false, t("Hin und zurück")], [true, t("Durchlauf")]].map(([d, text]) => el("button", { type: "button", "aria-pressed": String(S.durchlauf === d), text,
    onclick: () => bewegung({ durchlauf: d }) })));
  $("pult-laenge").replaceChildren(...LAENGEN.map((d) => el("button", { type: "button", "aria-pressed": String(S.dauer === d), text: `${d} s`,
    onclick: () => bewegung({ dauer: d }) })));
  $("pult-grund").replaceChildren(...["schwarz", "weiss"].map((g) => el("button", { type: "button", "aria-pressed": String(m.grund === g), text: g === "schwarz" ? t("Schwarz") : t("Weiss"),
    onclick: () => { m.grund = g; pultAufbauen(); adresse(); } })));
  $("pult-ebenen").replaceChildren(...m.ebenen.map((e, i) => ebeneFeld(e, i)));
  $("pult-sichern").disabled = !hatBild() || !S.dienst;
}
function ebeneFeld(e, i) {
  const m = S.mix, def = EFFEKTE[e.effekt];
  const neu = () => { pultAufbauen(); adresse(); };
  const fs = el("fieldset", { class: `ebene${e.aus || !def ? " aus" : ""}` });
  const kopf = el("div", { class: "ebene-kopf" }, el("legend", { text: t("Ebene {n}", { n: i + 1 }) }));
  const schieben = (d) => { const j = i + d; [m.ebenen[i], m.ebenen[j]] = [m.ebenen[j], m.ebenen[i]]; neu(); };
  const hoch = el("button", { type: "button", title: t("nach oben"), "aria-label": t("Ebene {n} nach oben", { n: i + 1 }), text: "↑", onclick: () => schieben(-1) });
  const runter = el("button", { type: "button", title: t("nach unten"), "aria-label": t("Ebene {n} nach unten", { n: i + 1 }), text: "↓", onclick: () => schieben(1) });
  if (i === 0) hoch.disabled = true;
  if (i === m.ebenen.length - 1) runter.disabled = true;
  const sicht = el("button", { type: "button", "aria-pressed": String(!e.aus), text: e.aus ? t("aus") : t("an"), onclick: () => { e.aus = !e.aus; neu(); } });
  if (!def) sicht.disabled = true;
  kopf.append(sicht, hoch, runter);
  fs.append(kopf);
  const effekt = el("select", { "aria-label": t("Effekt der Ebene {n}", { n: i + 1 }), onchange: (ev) => { e.effekt = ev.target.value; e.werte = []; e.aus = false; neu(); } },
    el("option", { value: "", text: t("— keine —") }), ...EFFEKT_IDS.map((id) => el("option", { value: id, text: t(EFFEKTE[id].name) })));
  effekt.value = e.effekt || "";
  fs.append(effekt);
  if (!def) return fs;
  const regeln = el("div", { class: "regeln" });
  const quelle = el("select", { "aria-label": t("Quelle"), onchange: (ev) => { e.quelle = ev.target.value; adresse(); } },
    el("option", { value: "bild", text: t("Quelle: Bild") }), el("option", { value: "unten", text: t("Quelle: Ebenen darunter") }));
  quelle.value = e.quelle || "bild";
  const modus = el("select", { "aria-label": t("Mischmodus"), onchange: (ev) => { e.modus = ev.target.value; adresse(); } },
    ...Object.keys(MODI).map((k) => el("option", { value: k, text: MODUS_NAMEN[k] })));
  modus.value = e.modus || "normal";
  regeln.append(el("div", { class: "zeile2" }, quelle, modus));
  regeln.append(regler(t("Deckkraft"), e.deckkraft ?? 1, (v) => { e.deckkraft = v; }));
  def.regler.forEach((r, k) => {
    const setzen = (v) => { const alt = def.regler.map((_, j) => wertVon(def, e.werte, j)); e.werte = alt; e.werte[k] = v; };
    regeln.append(r.stufen ? stufenWahl(r, wertVon(def, e.werte, k), setzen) : regler(t(r.name), wertVon(def, e.werte, k), setzen));
  });
  fs.append(regeln);
  return fs;
}
// eine Wahl mit Stufen (z. B. die Form der Montage): flache Knöpfe wie die Schalter oben, der Wert bleibt 0 … 1
function stufenWahl(r, wert, setzen) {
  const knoepfe = r.stufen.map((text, k) => el("button", { type: "button", "aria-pressed": String(stufe(r, wert) === k), text: t(text),
    onclick: () => { setzen(k / (r.stufen.length - 1)); knoepfe.forEach((b, j) => b.setAttribute("aria-pressed", String(j === k))); adresse(); } }));
  return el("div", { class: "regler stufen", role: "group", "aria-label": t(r.name) }, el("span", { text: t(r.name) }), el("div", { class: "wahl" }, ...knoepfe));
}
function regler(name, wert, setzen) {
  const aus = el("output", { text: Math.round(wert * 100) });
  const ein = el("input", { type: "range", min: "0", max: "1", step: "0.01", value: String(wert), "aria-label": name });
  ein.addEventListener("input", () => { const v = +ein.value; aus.textContent = Math.round(v * 100); setzen(v); });
  ein.addEventListener("change", adresse);
  return el("label", { class: "regler" }, el("span", { text: name }), ein, aus);
}
// «Neu mischen» würfelt nur die Effekte, das Bild bleibt (Wunsch vom 4. November 2026: der Knopf «soll gut sichtbar sein»: unter der Bühne)
$("pult-zufall").addEventListener("click", () => { S.mix = zufall(Math.random, S.mix.bild); pultAufbauen(); adresse(); });

// Eigenes Bild: Datei wählen oder auf die Bühne ziehen; verkleinert auf höchstens 1600 px, bleibt im Browser, bis das Werk gesichert wird
async function eigenesBild(datei) {
  if (istVideo(datei)) return eigenesVideo(datei);   // Video: siehe video.js (VIDEO_AN)
  if (!datei || !datei.type.startsWith("image/")) { pultMeldung(t("Das ist kein Bild. Möglich sind JPEG, PNG oder WebP.")); return; }
  pultMeldung(t("Bild wird geladen …"));
  try {
    const roh = await createImageBitmap(datei, { imageOrientation: "from-image" });
    const k = Math.min(1, 1600 / Math.max(roh.width, roh.height));
    const c = el("canvas"); c.width = Math.round(roh.width * k); c.height = Math.round(roh.height * k);
    c.getContext("2d").drawImage(roh, 0, 0, c.width, c.height); roh.close?.();
    const blob = await new Promise((ok) => c.toBlob(ok, "image/jpeg", .92));
    const url = URL.createObjectURL(blob);
    await motor.bildLaden(EIGEN, url);
    URL.revokeObjectURL(url);
    S.bildBlob = blob; S.bildName = datei.name;
    S.mix.bild = EIGEN;
    pultAufbauen(); adresse();
    pultMeldung(t("{name} · {b} × {h} · bleibt in diesem Browser, bis du dein Werk sicherst", { name: datei.name, b: c.width, h: c.height }));
  } catch (f) { pultMeldung(t("Das Bild liess sich nicht öffnen: {fehler}", { fehler: fehlerText(f) })); }
}
// Video (Prototyp, 7. November 2026): einmal in Einzelbilder zerlegt, höchstens 13 s, bleibt im Browser; als Werk sichern geht noch nicht
let zerlegen = null;
async function eigenesVideo(datei) {
  if (zerlegen) { zerlegen.abbrechen = true; }
  const stand = { abbrechen: false }; zerlegen = stand;
  pultMeldung(t("Video wird vorbereitet … {p} %", { p: 0 }));
  try {
    const sp = await videoZerlegen(datei, { px: motor.sparsam ? VIDEO_PX_SPARSAM : VIDEO_PX,
      fortschritt: (p) => pultMeldung(t("Video wird vorbereitet … {p} %", { p: Math.round(p * 100) })), abbruch: () => stand.abbrechen });
    if (!sp) return;
    motor.videoLaden(EIGEN, sp);
    S.bildBlob = null; S.bildName = datei.name;
    S.mix.bild = EIGEN;
    pultAufbauen(); adresse();
    pultMeldung(t("{name} · {b} × {h} · {s} s Video · bleibt in diesem Browser. MP4 laden geht, als Werk sichern noch nicht.", { name: datei.name, b: sp.b, h: sp.h, s: (sp.n / sp.fps).toFixed(1) }));
  } catch (f) { pultMeldung(t("Das Video liess sich nicht öffnen: {fehler}", { fehler: fehlerText(f) })); }
  finally { if (zerlegen === stand) zerlegen = null; }
}
if (VIDEO_AN) {
  $("pult-datei").accept = "image/*,video/*";
  const hinweis = document.querySelector("#pult-leer .hinweis");
  if (hinweis) hinweis.textContent = t("JPEG, PNG, WebP oder ein kurzes Video (bis 12 s, MP4). Es bleibt auf deinem Gerät, bis du dein Werk sicherst.");
}
const pultMeldung = (text) => { $("pult-meldung").textContent = text; };
$("pult-datei").addEventListener("change", (e) => { eigenesBild(e.target.files[0]); e.target.value = ""; });
$("pult-waehlen").addEventListener("click", () => $("pult-datei").click());
const buehne = $("buehne");
buehne.addEventListener("dragover", (e) => { e.preventDefault(); buehne.classList.add("ziehen"); });
buehne.addEventListener("dragleave", () => buehne.classList.remove("ziehen"));
buehne.addEventListener("drop", (e) => { e.preventDefault(); buehne.classList.remove("ziehen"); eigenesBild(e.dataTransfer.files[0]); });
$("pult-mp4").addEventListener("click", () => { if (!hatBild()) { pultMeldung(t("Zuerst ein Bild wählen.")); return; } herunterladen(S.mix, werkName()); });
$("pult-link").addEventListener("click", async () => {
  adresse();
  const knopf = $("pult-link");
  if (!S.mix.ebenen.some(voll)) { pultMeldung(t("Zuerst einen Effekt wählen, sonst gibt es nichts zu teilen.")); return; }
  knopf.disabled = true;
  // der Kurzlink kommt erst vom Server; Safari erlaubt das Kopieren nur sofort beim Tippen, darum das Versprechen direkt in die Zwischenablage
  const versprochen = kurzlink().catch(() => location.href);
  let kopiert = false;
  try {
    if (window.ClipboardItem && navigator.clipboard?.write) await navigator.clipboard.write([new ClipboardItem({ "text/plain": versprochen.then((s) => new Blob([s], { type: "text/plain" })) })]);
    else await navigator.clipboard.writeText(await versprochen);
    kopiert = true;
  } catch { /* ohne Zwischenablage: der Link steht in der Meldung */ }
  const link = await versprochen;
  pultMeldung(kopiert ? t("Kopiert: {link}", { link }) : t("Dein Link: {link}", { link }));
  knopf.textContent = kopiert ? t("Kopiert") : t("Link unten");
  knopf.disabled = false;
  setTimeout(() => { knopf.textContent = t("Link kopieren"); }, 1800);
});

// ——— Werk sichern: Bild und Mischung mit Titel und Name nach werke.php ———
$("sichern-name").value = gemerkt("animationen.name");
$("sichern-name").addEventListener("change", () => merken("animationen.name", $("sichern-name").value.trim()));
const sichernMeldung = (text, gut = false) => { const p = $("sichern-meldung"); p.textContent = text; p.classList.toggle("gut", gut); };
async function sichern() {
  if (!hatBild()) { sichernMeldung(t("Zuerst ein Bild wählen.")); return; }
  if (motor.istVideo(S.mix.bild)) { sichernMeldung(t("Ein Werk mit Video lässt sich noch nicht sichern. «MP4 laden» geht.")); return; }
  const name = $("sichern-name").value.trim(), titel = $("sichern-titel").value.trim();
  if (!name) { sichernMeldung(t("Bitte deinen Namen angeben.")); $("sichern-name").focus(); return; }
  const knopf = $("pult-sichern");
  knopf.disabled = true; sichernMeldung(t("Wird gesichert …"));
  try {
    let blob = S.bildBlob;
    if (S.mix.bild !== EIGEN) blob = await (await fetch(S.werk.bild, { cache: "force-cache" })).blob();   // ein gesichertes Werk weitergemischt: sein Bild noch einmal holen
    const stapel = mit(S.mix); delete stapel.bild;   // mit Format, Länge, Durchlauf und «Bild zeigen», ohne leere Ebenen
    stapel.ebenen = stapel.ebenen.filter((e) => e.effekt && EFFEKTE[e.effekt]);
    if (!stapel.ebenen.length) { sichernMeldung(t("Zuerst einen Effekt wählen, sonst gibt es nichts zu sichern.")); return; }
    const f = new FormData();
    f.append("bild", blob, "bild.jpg"); f.append("titel", titel); f.append("name", name); f.append("stapel", JSON.stringify(stapel)); f.append("schutz", $("sichern-schutz").value);
    const r = await fetch(DIENST, { method: "POST", body: f });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.fehler || t("Antwort {status}", { status: r.status }));
    S.eigene[d.id] = d.schluessel; merken("animationen.eigene", JSON.stringify(S.eigene));
    merken("animationen.name", name);
    S.werke.unshift(ablageAdresse(d.werk)); galerie();
    history.replaceState(null, "", `${sauber()}#w=${d.id}`);
    sichernMeldung(t("Gesichert: «{titel}» von {name}. Es steht jetzt unten bei den Werken; der Link dazu ist in der Adresszeile.", { titel: d.werk.titel || t("Ohne Titel"), name: d.werk.name }), true);
  } catch (f) { sichernMeldung(t("Das Werk liess sich nicht sichern: {fehler}", { fehler: fehlerText(f) })); }
  finally { knopf.disabled = false; }
}
$("pult-sichern").addEventListener("click", sichern);

// ——— Werke: laden, streuen, lebendig beim Darüberfahren, ins Mischpult laden, eigene löschen ———
const raster = $("werke-raster");
const kacheln = new Map();   // id → { w, c, geladen, beobachter }
const werkeMeldung = (text) => { const p = $("werke-meldung"); p.hidden = !text; p.textContent = text ?? ""; };
async function werkeLaden() {
  try {
    const r = await fetch(`${DIENST}?liste`, { cache: "no-store" });
    if (!r.ok) throw new Error(t("Antwort {status}", { status: r.status }));
    const d = await r.json();
    S.werke = Array.isArray(d.werke) ? d.werke.map(ablageAdresse) : [];
    S.dienst = true;
  } catch {
    S.werke = []; S.dienst = false;
    werkeMeldung(t("Die gesicherten Werke liessen sich nicht laden. Mischen und MP4 gehen trotzdem, Sichern erst, wenn die Ablage wieder antwortet."));
  }
  galerie();
}
function galerie() {
  const n = S.werke.length;
  $("werke-anzahl").textContent = n ? String(n) : "";
  if (S.dienst) werkeMeldung(n ? null : t("Noch keine Werke. Das erste könnte deines sein: Bild bringen, mischen, sichern."));
  for (const k of kacheln.values()) k.beobachter?.disconnect();
  kacheln.clear();
  raster.replaceChildren(...S.werke.map((w, i) => kachel(w, n - i)));
  streuen();
}
function kachel(w, nr) {
  const [kb, kh] = kachelGr(w.stapel);
  const c = el("canvas", { width: kb, height: kh, role: "img", "aria-label": t("{titel} von {name}", { titel: w.titel || t("Ohne Titel"), name: w.name }), tabindex: "0" });
  c.style.aspectRatio = `${kb} / ${kh}`;
  const text = el("span", { class: "text" }, el("b", { class: "nr", text: zwei(nr) }), el("span", { class: "titel", text: w.titel || t("Ohne Titel") }), el("small", { text: t("von {name} · {datum}", { name: w.name, datum: datum(w.zeit) }) }));
  if (S.eigene[w.id]) text.append(el("button", { type: "button", class: "loeschen", text: t("Löschen"), onclick: () => loeschen(w) }));
  const a = el("article", { class: "kachel", "data-id": w.id }, c, text);
  const k = { w, c, geladen: false };
  const oeffnen = () => werkOeffnen(w);
  c.addEventListener("click", oeffnen); c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); oeffnen(); } });
  const an = () => { if (!ruhig && k.geladen) S.live = { c, stapel: stapelVon(w), t0: performance.now() }; };
  const aus = () => { if (S.live?.c === c) { S.live = null; malen(c, stapelVon(w), DAUER * .35, kachelGr(w.stapel), wieEs); } };
  a.addEventListener("pointerenter", an); c.addEventListener("focus", an);
  a.addEventListener("pointerleave", aus); c.addEventListener("blur", aus);
  // das Bild erst holen, wenn die Kachel in die Nähe des Fensters kommt
  k.beobachter = new IntersectionObserver((eintraege) => {
    if (!eintraege.some((e) => e.isIntersecting)) return;
    k.beobachter.disconnect();
    bildHolen(w).then(() => { k.geladen = true; malen(c, stapelVon(w), DAUER * .35, kachelGr(w.stapel), wieEs); }).catch(() => {});
  }, { rootMargin: "400px" });
  k.beobachter.observe(a);
  kacheln.set(w.id, k);
  return a;
}
const stapelVon = (w) => ({ ...w.stapel, bild: werkBild(w) });
const wieEs = (stapel) => stapel;   // Kacheln zeichnen das Werk mit seinen eigenen Schaltern (Format, Länge, Bild zeigen), nicht mit denen des Pults
const holend = new Map();
function bildHolen(w) {
  if (motor.hatBild(werkBild(w))) return Promise.resolve();
  if (!holend.has(w.id)) holend.set(w.id, motor.bildLaden(werkBild(w), w.bild).finally(() => holend.delete(w.id)));
  return holend.get(w.id);
}
function kachelnMalen() { for (const k of kacheln.values()) if (k.geladen) malen(k.c, stapelVon(k.w), DAUER * .35, kachelGr(k.w.stapel), wieEs); }
async function werkOeffnen(w) {
  try { await bildHolen(w); } catch { pultMeldung(t("Das Bild dieses Werks liess sich nicht laden.")); return; }
  const s = kopie(w.stapel);
  S.ohneBild = !!s.ohneBild; S.durchlauf = !!s.durchlauf; S.dauer = LAENGEN.includes(s.dauer) ? s.dauer : DAUER; S.format = FORMATE[s.format] ? s.format : "4x5";
  delete s.ohneBild; delete s.durchlauf; delete s.dauer; delete s.format;
  S.werk = w; S.mix = { ...s, bild: werkBild(w) };
  document.documentElement.dataset.format = S.format;
  S.t0 = performance.now(); S.tPause = S.dauer * .35;
  standText();
  ansicht("mischpult", { verlauf: false }); pultAufbauen(); adresse();
  pultMeldung(t("«{titel}» von {name} ist im Mischpult. Weitermischen, als MP4 laden oder als neues Werk sichern.", { titel: w.titel || t("Ohne Titel"), name: w.name }));
  $("sichern-titel").value = w.titel ? t("{titel} (Variante)", { titel: w.titel }) : "";
}
async function loeschen(w) {
  if (!confirm(t("«{titel}» von {name} löschen? Das lässt sich nicht rückgängig machen.", { titel: w.titel || t("Ohne Titel"), name: w.name }))) return;
  try {
    const r = await fetch(DIENST, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ aktion: "loeschen", id: w.id, schluessel: S.eigene[w.id] }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.fehler || t("Antwort {status}", { status: r.status }));
    delete S.eigene[w.id]; merken("animationen.eigene", JSON.stringify(S.eigene));
    S.werke = S.werke.filter((x) => x.id !== w.id); galerie();
  } catch (f) { werkeMeldung(t("Löschen ging nicht: {fehler}", { fehler: fehlerText(f) })); }
}
// Kacheln in drei Grössen, je Zeile eine bis vier, zufällig über die Spalten verteilt (fester Startwert, damit es bei jedem Besuch gleich liegt)
function streuen() {
  const spalten = innerWidth <= 720 ? 4 : innerWidth <= 1180 ? 8 : 12;   // wie im CSS
  const [breiten, jeZeile] = spalten === 4 ? [[2, 2, 3], [1, 2]] : spalten === 8 ? [[2, 2, 3, 3], [2, 3, 3]] : [[2, 2, 2, 3, 3], [3, 4, 4]];
  let zufallsZahl = 7;
  const zz = () => (zufallsZahl = (zufallsZahl * 9301 + 49297) % 233280) / 233280;
  const wahl = (a) => a[Math.floor(zz() * a.length)];
  let zeile = 1, rest = [...raster.children];
  while (rest.length) {
    let n = Math.min(rest.length, wahl(jeZeile)), b;
    do { b = Array.from({ length: n }, () => wahl(breiten)); n--; } while (b.reduce((s, x) => s + x, 0) > spalten && n > 0);
    let frei = spalten - b.reduce((s, x) => s + x, 0), start = 0;
    for (const w of b) {
      const luecke = Math.floor(zz() * (frei + 1)); frei -= luecke; start += luecke;
      const k = rest.shift(); k.style.gridRow = zeile; k.style.gridColumn = `${start + 1} / span ${w}`; start += w;
    }
    zeile++;
  }
}
addEventListener("resize", streuen);

// ——— Info ———
$("info-effekte").append(...EFFEKT_IDS.map((id) => el("li", {}, t(EFFEKTE[id].name), el("span", { text: herkunft(id, EFFEKTE[id].herkunft) }))));

// ——— MP4 ———
async function herunterladen(stapel, name) {
  if (S.export) return;
  const stand = { abbrechen: false };
  S.export = stand;
  $("export").hidden = false; $("export-text").textContent = t("MP4 · {p} %", { p: 0 }); $("export").style.setProperty("--p", 0);
  try {
    const [breite, hoehe] = fmt().gross;
    const erg = await videoErstellen(motor, kopie(mit(stapel)), {
      breite, hoehe,
      fortschritt: (p) => { $("export-text").textContent = t("MP4 · {p} %", { p: Math.round(p * 100) }); $("export").style.setProperty("--p", p); },
      abbruch: () => stand.abbrechen,
    });
    if (erg) {
      const a = el("a", { href: URL.createObjectURL(erg.blob), download: `ornament-animation-${name}${ohne()}-${S.format}.${erg.endung}` });
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    }
  } catch (f) {
    $("export-text").textContent = t("Das Video liess sich nicht erstellen: {fehler}", { fehler: fehlerText(f) });
    await new Promise((ok) => setTimeout(ok, 5000));
  } finally { S.export = null; $("export").hidden = true; }
}
$("export-stop").addEventListener("click", () => { if (S.export) S.export.abbrechen = true; });

// ——— Zeichnen ———
function bild(jetzt) {
  requestAnimationFrame(bild);
  const dt = jetzt - letztesBild; letztesBild = jetzt;
  if (S.export || document.hidden || S.ansicht !== "mischpult") { langsam = 0; return; }
  if (S.mix !== letzteMischung) { letzteMischung = S.mix; drossel = 1; langsam = schnell = 0; }
  if (motor.uebersetzt !== letzteUebersetzung) { letzteUebersetzung = motor.uebersetzt; langsam = 0; }   // Übersetzen ist einmalig, nicht langsam
  else if (dt > 0 && dt < 2000) {   // längere Pausen kommen vom Wechsel aus dem Hintergrund, nicht vom Rechnen
    langsam = dt > 150 ? langsam + 1 : 0;
    schnell = dt < 45 ? schnell + 1 : 0;
    if (langsam >= 8 && drossel > DROSSEL_MIN) { drossel = Math.max(DROSSEL_MIN, drossel * .85); langsam = 0; }
    else if (langsam >= 8 && !motor.sparsam) {   // Wächter: auch mit weniger Pixeln zu langsam, also die schweren Effekte leichter rechnen
      motor.sparsam = true; langsam = 0;
      pultMeldung(t("Die Grafik dieses Geräts kommt nicht nach, die schweren Effekte rechnen jetzt leichter."));
    }
    if (schnell >= 90 && drossel < 1) { drossel = Math.min(1, drossel / .85); schnell = 0; }
  }
  const tt = zeit() % S.dauer;
  if (hatBild()) {
    malen($("pult-bild"), S.mix, tt);
    $("pult-uhr").textContent = uhrText(tt);
    $("mischpult").style.setProperty("--p", tt / S.dauer);   // die Fortschrittslinie unter der Bühne
  }
  if (S.live) malen(S.live.c, S.live.stapel, ((performance.now() - S.live.t0) / 1000) % DAUER, kachelGr(S.live.stapel), wieEs);
  if (motor.kaputt.size !== kaputtGemeldet) {   // ein Effekt, den dieses Gerät nicht übersetzen kann, bleibt leer; die anderen laufen weiter
    kaputtGemeldet = motor.kaputt.size;
    const namen = [...motor.kaputt.keys()].map((id) => t("«{name}»", { name: t(EFFEKTE[id].name) })).join(", ");
    if (namen) pultMeldung(t("{namen} lässt sich auf diesem Gerät nicht rechnen und bleibt leer. Die anderen Effekte gehen.", { namen }));
  }
}
let kaputtGemeldet = 0;

// ——— Start ———
// die Effekte werden erst übersetzt, wenn sie gebraucht werden (früher alle beim Start: auf Handys langsam und unnötig);
// window.animationen.motor.pruefen() übersetzt alle und gibt die Fehler zurück
window.animationen = { motor, S, zufall, werkeLaden };
if (location.search) history.replaceState(null, "", sauber() + location.hash);   // ?fbclid=… und Co. gleich weg
let start = ausAdresse();
standText();
await werkeLaden();
if (start.kurz) {   // Kurzlink: die Mischung aus der Ablage holen
  try {
    const r = await fetch(`${DIENST}?kurz=${start.kurz}`, { cache: "no-store" });
    if (!r.ok) throw new Error();
    const d = await r.json();
    start = mischungAnwenden({ ...d.stapel, werk: d.werk ?? undefined });
    standText();
  } catch { start = { ansicht: "mischpult" }; pultMeldung(t("Diesen Link gibt es nicht mehr.")); }
}
if (start.werk) {
  const w = S.werke.find((x) => x.id === start.werk);
  if (w) {
    if (location.hash.startsWith("#w=")) await werkOeffnen(w);
    else { S.werk = w; try { await bildHolen(w); } catch { /* ohne Bild bleibt die Bühne leer */ } }
  }
}
document.documentElement.dataset.format = S.format;
pultAufbauen();
ansicht(start.ansicht, { verlauf: false });
document.documentElement.classList.add("bereit");
requestAnimationFrame(bild);
