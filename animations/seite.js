// Animationen – die Seite: Mischpult (das eigene Bild, Grund, drei Ebenen, Schalter, Sichern) mit den gesicherten Werken darunter
// (gestreutes Raster, beim Darüberfahren lebendig, Klick lädt ins Mischpult) und Info. Ein Motor zeichnet für alles; die sichtbare
// Leinwand übernimmt sein Bild. Seit 4. November 2026 ohne Reel, Beispielbilder und vorgefertigte Werke.
import { motorErstellen, videoErstellen, DAUER, LAENGEN, MODI } from "./motor.js?v=8";
import { EFFEKTE, EFFEKT_IDS, stufe, wertVon } from "./effekte.js?v=8";
import { zufall, EIGEN } from "./rezepte.js?v=8";

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
const MODUS_NAMEN = { normal: "Normal", multiplizieren: "Multiplizieren", differenz: "Differenz", bildschirm: "Bildschirm", ueberlagern: "Überlagern" };
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const kopie = (o) => JSON.parse(JSON.stringify(o));
const slug = (s) => s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mischung";
const DIENST = "werke.php";
const werkBild = (w) => `w:${w.id}`;   // Schlüssel des Bildes eines gesicherten Werks im Motor
const datum = (iso) => { try { return new Date(iso).toLocaleDateString("de-CH", { day: "numeric", month: "short", year: "numeric" }); } catch { return ""; } };
const merken = (k, v) => { try { localStorage.setItem(k, v); } catch { /* privat */ } };
const gemerkt = (k) => { try { return localStorage.getItem(k) ?? ""; } catch { return ""; } };

let motor, wiederTimer = 0;
try {
  motor = motorErstellen({
    // Kontext verloren: der Motor wartet auf ihn und rechnet danach sparsam; kommt er nicht zurück, hilft nur neu laden
    verloren: () => {
      pultMeldung("Die Grafik des Geräts hat kurz ausgesetzt. Einen Moment …");
      clearTimeout(wiederTimer);
      wiederTimer = setTimeout(() => pultMeldung("Die Grafik kommt nicht zurück. Die Seite neu laden; hilft das nicht, den Browser ganz schliessen und neu öffnen."), 4000);
    },
    zurueck: () => { clearTimeout(wiederTimer); pultMeldung("Die Grafik läuft wieder, ab jetzt mit weniger Teilchen."); kachelnMalen(); },
  });
} catch (f) {
  document.querySelector("main").replaceChildren(el("div", { class: "ohne-webgl" },
    el("p", { text: `Diese Seite braucht WebGL 2. ${f.message}` }),
    el("p", {}, el("button", { type: "button", text: "Neu laden", onclick: () => location.reload() }))));
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
function adresse() {
  let h = S.ansicht;
  if (S.ansicht === "mischpult") {
    const m = { ...S.mix, ohneBild: S.ohneBild || undefined, durchlauf: S.durchlauf || undefined, dauer: S.dauer !== DAUER ? S.dauer : undefined, format: S.format !== "4x5" ? S.format : undefined };
    if (m.bild.startsWith("w:")) m.werk = m.bild.slice(2);   // ein gesichertes Werk steht mit seiner Kennung im Link
    delete m.bild;   // ein eigenes Bild steht nicht im Link
    h = `m=${btoa(unescape(encodeURIComponent(JSON.stringify(m)))).replace(/=+$/, "")}`;
  }
  history.replaceState(null, "", `#${h}`);
}
/** liest die Adresse: #w=ID öffnet ein Werk, #m=… eine Mischung (mit werk: ID auf dessen Bild), #info die Info */
function ausAdresse() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (h.startsWith("w=")) return { ansicht: "mischpult", werk: h.slice(2) };
  if (h.startsWith("m=")) {
    try {
      const m = JSON.parse(decodeURIComponent(escape(atob(h.slice(2)))));
      if (Array.isArray(m.ebenen)) {
        S.ohneBild = !!m.ohneBild; S.durchlauf = !!m.durchlauf; S.dauer = LAENGEN.includes(m.dauer) ? m.dauer : DAUER; if (FORMATE[m.format]) S.format = m.format;
        const werk = typeof m.werk === "string" ? m.werk : null;
        delete m.ohneBild; delete m.durchlauf; delete m.dauer; delete m.werk; delete m.format;
        S.mix = { ...m, bild: werk ? `w:${werk}` : EIGEN, grund: m.grund === "weiss" ? "weiss" : "schwarz" };
        return { ansicht: "mischpult", werk };
      }
    } catch { /* alter Link */ }
    return { ansicht: "mischpult" };
  }
  return { ansicht: h === "info" ? "info" : "mischpult" };
}
for (const b of document.querySelectorAll("[data-ansicht]")) b.addEventListener("click", () => ansicht(b.dataset.ansicht));

// ——— Bild zeigen: an/aus, Bewegung, Pause ———
function bildZeigen(an) {
  S.ohneBild = !an;
  pultAufbauen(); kachelnMalen(); adresse();
}
const standText = () => { $("pult-stand").textContent = `${S.dauer} s · ${S.durchlauf ? "Durchlauf" : "hin und zurück"}`; };
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
  $("pult-pause").textContent = S.laeuft ? "Pause" : "Abspielen";
}
$("pult-pause").addEventListener("click", () => pause(!S.laeuft));
$("pult-bild").addEventListener("click", () => pause(!S.laeuft));
addEventListener("keydown", (e) => {
  if (e.code !== "Space" || e.target.closest("input, select, textarea, button, a") || S.ansicht !== "mischpult") return;
  e.preventDefault(); pause(!S.laeuft);
});
// Standbild: das Bild, das gerade zu sehen ist, als PNG in 1080 × 1350
function standbild() {
  if (!hatBild()) { pultMeldung("Zuerst ein Bild wählen."); return; }
  const t = zeit() % S.dauer, [gb, gh] = fmt().gross;
  motor.zeichnen(mit(S.mix), t, gb, gh);
  motor.leinwand.toBlob((blob) => {
    if (!blob) return;
    const a = el("a", { href: URL.createObjectURL(blob), download: `ornament-animation-${werkName()}${ohne()}-${zwei(Math.floor(t))}s${Math.floor((t % 1) * 10)}-${S.format}.png` });
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
  if (motor.hatBild(EIGEN)) bilder.push(el("button", { type: "button", "aria-pressed": String(m.bild === EIGEN), text: S.bildName ? `Dein Bild · ${S.bildName}` : "Dein Bild", onclick: () => { m.bild = EIGEN; pultAufbauen(); adresse(); } }));
  if (S.werk && motor.hatBild(werkBild(S.werk))) bilder.push(el("button", { type: "button", "aria-pressed": String(m.bild === werkBild(S.werk)), text: `Werk von ${S.werk.name}`, onclick: () => { m.bild = werkBild(S.werk); pultAufbauen(); adresse(); } }));
  bilder.push(el("button", { type: "button", class: "hochladen", text: motor.hatBild(EIGEN) ? "Anderes Bild …" : "Bild wählen …", onclick: () => $("pult-datei").click() }));
  $("pult-bilder").replaceChildren(...bilder);
  $("buehne").classList.toggle("ohne", !hatBild());
  $("pult-zeigen").replaceChildren(...[[false, "An"], [true, "Aus"]].map(([aus, text]) => el("button", { type: "button", "aria-pressed": String(S.ohneBild === aus), text,
    onclick: () => bildZeigen(!aus) })));
  $("pult-format").replaceChildren(...Object.entries(FORMATE).map(([k, f]) => el("button", { type: "button", "aria-pressed": String(S.format === k), text: f.name,
    onclick: () => formatSetzen(k) })));
  $("pult-lauf").replaceChildren(...[[false, "Hin und zurück"], [true, "Durchlauf"]].map(([d, text]) => el("button", { type: "button", "aria-pressed": String(S.durchlauf === d), text,
    onclick: () => bewegung({ durchlauf: d }) })));
  $("pult-laenge").replaceChildren(...LAENGEN.map((d) => el("button", { type: "button", "aria-pressed": String(S.dauer === d), text: `${d} s`,
    onclick: () => bewegung({ dauer: d }) })));
  $("pult-grund").replaceChildren(...["schwarz", "weiss"].map((g) => el("button", { type: "button", "aria-pressed": String(m.grund === g), text: g === "schwarz" ? "Schwarz" : "Weiss",
    onclick: () => { m.grund = g; pultAufbauen(); adresse(); } })));
  $("pult-ebenen").replaceChildren(...m.ebenen.map((e, i) => ebeneFeld(e, i)));
  $("pult-sichern").disabled = !hatBild() || !S.dienst;
}
function ebeneFeld(e, i) {
  const m = S.mix, def = EFFEKTE[e.effekt];
  const neu = () => { pultAufbauen(); adresse(); };
  const fs = el("fieldset", { class: `ebene${e.aus || !def ? " aus" : ""}` });
  const kopf = el("div", { class: "ebene-kopf" }, el("legend", { text: `Ebene ${i + 1}` }));
  const schieben = (d) => { const j = i + d; [m.ebenen[i], m.ebenen[j]] = [m.ebenen[j], m.ebenen[i]]; neu(); };
  const hoch = el("button", { type: "button", title: "nach oben", "aria-label": `Ebene ${i + 1} nach oben`, text: "↑", onclick: () => schieben(-1) });
  const runter = el("button", { type: "button", title: "nach unten", "aria-label": `Ebene ${i + 1} nach unten`, text: "↓", onclick: () => schieben(1) });
  if (i === 0) hoch.disabled = true;
  if (i === m.ebenen.length - 1) runter.disabled = true;
  const sicht = el("button", { type: "button", "aria-pressed": String(!e.aus), text: e.aus ? "aus" : "an", onclick: () => { e.aus = !e.aus; neu(); } });
  if (!def) sicht.disabled = true;
  kopf.append(sicht, hoch, runter);
  fs.append(kopf);
  const effekt = el("select", { "aria-label": `Effekt der Ebene ${i + 1}`, onchange: (ev) => { e.effekt = ev.target.value; e.werte = []; e.aus = false; neu(); } },
    el("option", { value: "", text: "— keine —" }), ...EFFEKT_IDS.map((id) => el("option", { value: id, text: EFFEKTE[id].name })));
  effekt.value = e.effekt || "";
  fs.append(effekt);
  if (!def) return fs;
  const regeln = el("div", { class: "regeln" });
  const quelle = el("select", { "aria-label": "Quelle", onchange: (ev) => { e.quelle = ev.target.value; adresse(); } },
    el("option", { value: "bild", text: "Quelle: Bild" }), el("option", { value: "unten", text: "Quelle: Ebenen darunter" }));
  quelle.value = e.quelle || "bild";
  const modus = el("select", { "aria-label": "Mischmodus", onchange: (ev) => { e.modus = ev.target.value; adresse(); } },
    ...Object.keys(MODI).map((k) => el("option", { value: k, text: MODUS_NAMEN[k] })));
  modus.value = e.modus || "normal";
  regeln.append(el("div", { class: "zeile2" }, quelle, modus));
  regeln.append(regler("Deckkraft", e.deckkraft ?? 1, (v) => { e.deckkraft = v; }));
  def.regler.forEach((r, k) => {
    const setzen = (v) => { const alt = def.regler.map((_, j) => wertVon(def, e.werte, j)); e.werte = alt; e.werte[k] = v; };
    regeln.append(r.stufen ? stufenWahl(r, wertVon(def, e.werte, k), setzen) : regler(r.name, wertVon(def, e.werte, k), setzen));
  });
  fs.append(regeln);
  return fs;
}
// eine Wahl mit Stufen (z. B. die Form der Montage): flache Knöpfe wie die Schalter oben, der Wert bleibt 0 … 1
function stufenWahl(r, wert, setzen) {
  const knoepfe = r.stufen.map((text, k) => el("button", { type: "button", "aria-pressed": String(stufe(r, wert) === k), text,
    onclick: () => { setzen(k / (r.stufen.length - 1)); knoepfe.forEach((b, j) => b.setAttribute("aria-pressed", String(j === k))); adresse(); } }));
  return el("div", { class: "regler stufen", role: "group", "aria-label": r.name }, el("span", { text: r.name }), el("div", { class: "wahl" }, ...knoepfe));
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
  if (!datei || !datei.type.startsWith("image/")) { pultMeldung("Das ist kein Bild. Möglich sind JPEG, PNG oder WebP."); return; }
  pultMeldung("Bild wird geladen …");
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
    pultMeldung(`${datei.name} · ${c.width} × ${c.height} · bleibt in diesem Browser, bis du dein Werk sicherst`);
  } catch (f) { pultMeldung(`Das Bild liess sich nicht öffnen: ${f.message ?? f}`); }
}
const pultMeldung = (text) => { $("pult-meldung").textContent = text; };
$("pult-datei").addEventListener("change", (e) => { eigenesBild(e.target.files[0]); e.target.value = ""; });
$("pult-waehlen").addEventListener("click", () => $("pult-datei").click());
const buehne = $("buehne");
buehne.addEventListener("dragover", (e) => { e.preventDefault(); buehne.classList.add("ziehen"); });
buehne.addEventListener("dragleave", () => buehne.classList.remove("ziehen"));
buehne.addEventListener("drop", (e) => { e.preventDefault(); buehne.classList.remove("ziehen"); eigenesBild(e.dataTransfer.files[0]); });
$("pult-mp4").addEventListener("click", () => { if (!hatBild()) { pultMeldung("Zuerst ein Bild wählen."); return; } herunterladen(S.mix, werkName()); });
$("pult-link").addEventListener("click", async () => {
  adresse();
  try { await navigator.clipboard.writeText(location.href); $("pult-link").textContent = "Kopiert"; } catch { $("pult-link").textContent = "Link in der Adresszeile"; }
  setTimeout(() => { $("pult-link").textContent = "Link kopieren"; }, 1800);
});

// ——— Werk sichern: Bild und Mischung mit Titel und Name nach werke.php ———
$("sichern-name").value = gemerkt("animationen.name");
$("sichern-name").addEventListener("change", () => merken("animationen.name", $("sichern-name").value.trim()));
const sichernMeldung = (text, gut = false) => { const p = $("sichern-meldung"); p.textContent = text; p.classList.toggle("gut", gut); };
async function sichern() {
  if (!hatBild()) { sichernMeldung("Zuerst ein Bild wählen."); return; }
  const name = $("sichern-name").value.trim(), titel = $("sichern-titel").value.trim();
  if (!name) { sichernMeldung("Bitte deinen Namen angeben."); $("sichern-name").focus(); return; }
  const knopf = $("pult-sichern");
  knopf.disabled = true; sichernMeldung("Wird gesichert …");
  try {
    let blob = S.bildBlob;
    if (S.mix.bild !== EIGEN) blob = await (await fetch(S.werk.bild, { cache: "force-cache" })).blob();   // ein gesichertes Werk weitergemischt: sein Bild noch einmal holen
    const stapel = mit(S.mix); delete stapel.bild;   // mit Format, Länge, Durchlauf und «Bild zeigen», ohne leere Ebenen
    stapel.ebenen = stapel.ebenen.filter((e) => e.effekt && EFFEKTE[e.effekt]);
    if (!stapel.ebenen.length) { sichernMeldung("Zuerst einen Effekt wählen, sonst gibt es nichts zu sichern."); return; }
    const f = new FormData();
    f.append("bild", blob, "bild.jpg"); f.append("titel", titel); f.append("name", name); f.append("stapel", JSON.stringify(stapel)); f.append("schutz", $("sichern-schutz").value);
    const r = await fetch(DIENST, { method: "POST", body: f });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.fehler || `Antwort ${r.status}`);
    S.eigene[d.id] = d.schluessel; merken("animationen.eigene", JSON.stringify(S.eigene));
    merken("animationen.name", name);
    S.werke.unshift(d.werk); galerie();
    history.replaceState(null, "", `#w=${d.id}`);
    sichernMeldung(`Gesichert: «${d.werk.titel || "Ohne Titel"}» von ${d.werk.name}. Es steht jetzt unten bei den Werken; der Link dazu ist in der Adresszeile.`, true);
  } catch (f) { sichernMeldung(`Das Werk liess sich nicht sichern: ${f.message ?? f}`); }
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
    if (!r.ok) throw new Error(`Antwort ${r.status}`);
    const d = await r.json();
    S.werke = Array.isArray(d.werke) ? d.werke : [];
    S.dienst = true;
  } catch {
    S.werke = []; S.dienst = false;
    werkeMeldung("Die gesicherten Werke liessen sich nicht laden. Mischen und MP4 gehen trotzdem, Sichern erst, wenn die Ablage wieder antwortet.");
  }
  galerie();
}
function galerie() {
  const n = S.werke.length;
  $("werke-anzahl").textContent = n ? String(n) : "";
  if (S.dienst) werkeMeldung(n ? null : "Noch keine Werke. Das erste könnte deines sein: Bild bringen, mischen, sichern.");
  for (const k of kacheln.values()) k.beobachter?.disconnect();
  kacheln.clear();
  raster.replaceChildren(...S.werke.map((w, i) => kachel(w, n - i)));
  streuen();
}
function kachel(w, nr) {
  const [kb, kh] = kachelGr(w.stapel);
  const c = el("canvas", { width: kb, height: kh, role: "img", "aria-label": `${w.titel || "Ohne Titel"} von ${w.name}`, tabindex: "0" });
  c.style.aspectRatio = `${kb} / ${kh}`;
  const text = el("span", { class: "text" }, el("b", { class: "nr", text: zwei(nr) }), el("span", { class: "titel", text: w.titel || "Ohne Titel" }), el("small", { text: `von ${w.name} · ${datum(w.zeit)}` }));
  if (S.eigene[w.id]) text.append(el("button", { type: "button", class: "loeschen", text: "Löschen", onclick: () => loeschen(w) }));
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
  try { await bildHolen(w); } catch { pultMeldung("Das Bild dieses Werks liess sich nicht laden."); return; }
  const s = kopie(w.stapel);
  S.ohneBild = !!s.ohneBild; S.durchlauf = !!s.durchlauf; S.dauer = LAENGEN.includes(s.dauer) ? s.dauer : DAUER; S.format = FORMATE[s.format] ? s.format : "4x5";
  delete s.ohneBild; delete s.durchlauf; delete s.dauer; delete s.format;
  S.werk = w; S.mix = { ...s, bild: werkBild(w) };
  document.documentElement.dataset.format = S.format;
  S.t0 = performance.now(); S.tPause = S.dauer * .35;
  standText();
  ansicht("mischpult", { verlauf: false }); pultAufbauen(); adresse();
  pultMeldung(`«${w.titel || "Ohne Titel"}» von ${w.name} ist im Mischpult. Weitermischen, als MP4 laden oder als neues Werk sichern.`);
  $("sichern-titel").value = w.titel ? `${w.titel} (Variante)` : "";
}
async function loeschen(w) {
  if (!confirm(`«${w.titel || "Ohne Titel"}» von ${w.name} löschen? Das lässt sich nicht rückgängig machen.`)) return;
  try {
    const r = await fetch(DIENST, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ aktion: "loeschen", id: w.id, schluessel: S.eigene[w.id] }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.fehler || `Antwort ${r.status}`);
    delete S.eigene[w.id]; merken("animationen.eigene", JSON.stringify(S.eigene));
    S.werke = S.werke.filter((x) => x.id !== w.id); galerie();
  } catch (f) { werkeMeldung(`Löschen ging nicht: ${f.message ?? f}`); }
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
$("info-effekte").append(...EFFEKT_IDS.map((id) => el("li", {}, EFFEKTE[id].name, el("span", { text: EFFEKTE[id].herkunft }))));

// ——— MP4 ———
async function herunterladen(stapel, name) {
  if (S.export) return;
  const stand = { abbrechen: false };
  S.export = stand;
  $("export").hidden = false; $("export-text").textContent = "MP4 · 0 %"; $("export").style.setProperty("--p", 0);
  try {
    const [breite, hoehe] = fmt().gross;
    const erg = await videoErstellen(motor, kopie(mit(stapel)), {
      breite, hoehe,
      fortschritt: (p) => { $("export-text").textContent = `MP4 · ${Math.round(p * 100)} %`; $("export").style.setProperty("--p", p); },
      abbruch: () => stand.abbrechen,
    });
    if (erg) {
      const a = el("a", { href: URL.createObjectURL(erg.blob), download: `ornament-animation-${name}${ohne()}-${S.format}.${erg.endung}` });
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    }
  } catch (f) {
    $("export-text").textContent = `Das Video liess sich nicht erstellen: ${f.message ?? f}`;
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
    const namen = [...motor.kaputt.keys()].map((id) => `«${EFFEKTE[id].name}»`).join(", ");
    if (namen) pultMeldung(`${namen} lässt sich auf diesem Gerät nicht rechnen und bleibt leer. Die anderen Effekte gehen.`);
  }
}
let kaputtGemeldet = 0;

// ——— Start ———
// die Effekte werden erst übersetzt, wenn sie gebraucht werden (früher alle beim Start: auf Handys langsam und unnötig);
// window.animationen.motor.pruefen() übersetzt alle und gibt die Fehler zurück
window.animationen = { motor, S, zufall, werkeLaden };
const start = ausAdresse();
standText();
await werkeLaden();
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
