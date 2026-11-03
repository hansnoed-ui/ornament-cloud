// Animationen – die Seite: Reel (eine Animation nach der anderen), Werke (alle 27 im gestreuten Raster, beim Darüberfahren lebendig),
// Mischpult (Bild, Grund, drei Ebenen) und Info. Ein Motor zeichnet für alle; die sichtbare Leinwand übernimmt sein Bild.
import { motorErstellen, videoErstellen, DAUER, MODI } from "./motor.js";
import { EFFEKTE, EFFEKT_IDS } from "./effekte.js";
import { BILDER, WERKE, zufall } from "./rezepte.js";

const $ = (id) => document.getElementById(id);
const el = (tag, attr = {}, ...kinder) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attr)) if (k === "text") e.textContent = v; else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v);
  e.append(...kinder);
  return e;
};
const zwei = (n) => String(n).padStart(2, "0");
const uhrText = (t) => `00:${zwei(Math.floor(t))},${Math.floor((t % 1) * 10)} / 00:${zwei(DAUER)}`;
const MODUS_NAMEN = { normal: "Normal", multiplizieren: "Multiplizieren", differenz: "Differenz", bildschirm: "Bildschirm", ueberlagern: "Überlagern" };
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const EIGEN = "eigen";   // das eigene Bild im Mischpult: bleibt im Browser, wird nirgends hochgeladen
const bildName = (id) => id === EIGEN ? "Eigenes Bild" : BILDER.find((b) => b.id === id)?.name ?? id;
const kopie = (o) => JSON.parse(JSON.stringify(o));

let motor;
try { motor = motorErstellen(); } catch (f) {
  document.querySelector("main").replaceChildren(el("p", { class: "meldung", text: `Diese Seite braucht WebGL 2. ${f.message}` }));
  throw f;
}

// ——— Zustand ———
const S = {
  ansicht: "reel", reel: 0, laeuft: !ruhig, t0: performance.now(), tPause: DAUER * .35,
  mix: kopie(WERKE[0].stapel), live: null, export: null,
};
const zeit = () => S.laeuft ? (performance.now() - S.t0) / 1000 : S.tPause;

// ——— Leinwand passend zur Anzeige (Bildschirmdichte, höchstens 1080 breit) ———
function aufloesung(c, max = 1080) {
  const r = c.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
  const b = Math.max(40, Math.min(max, Math.round(r.width * d)));
  return [b, Math.round(b * 1.25)];
}
function malen(c, stapel, t, [b, h] = aufloesung(c)) {
  if (c.width !== b || c.height !== h) { c.width = b; c.height = h; }
  motor.zeichnen(stapel, t, b, h);
  c.getContext("2d").drawImage(motor.leinwand, 0, 0, b, h);
}

// ——— Ansichten ———
function ansicht(name, { verlauf = true } = {}) {
  S.ansicht = name;
  for (const s of document.querySelectorAll(".ansicht")) s.hidden = s.id !== name;
  for (const b of document.querySelectorAll("[data-ansicht]")) b.setAttribute("aria-pressed", String(b.dataset.ansicht === name));
  if (name === "mischpult") pultAufbauen();
  if (verlauf) adresse();
  scrollTo(0, 0);
}
function adresse() {
  let h = S.ansicht;
  if (S.ansicht === "reel") h = `w=${WERKE[S.reel].id}`;
  if (S.ansicht === "mischpult") h = `m=${btoa(unescape(encodeURIComponent(JSON.stringify(S.mix)))).replace(/=+$/, "")}`;
  history.replaceState(null, "", `#${h}`);
}
function ausAdresse() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (h.startsWith("w=")) { const i = WERKE.findIndex((w) => w.id === h.slice(2)); if (i >= 0) S.reel = i; return "reel"; }
  if (h.startsWith("m=")) {
    try { const m = JSON.parse(decodeURIComponent(escape(atob(h.slice(2))))); if ((BILDER.some((b) => b.id === m.bild) || m.bild === EIGEN) && Array.isArray(m.ebenen)) S.mix = { ...m, bild: m.bild === EIGEN ? BILDER[0].id : m.bild }; } catch { /* alter Link */ }   // ein eigenes Bild steht nicht im Link
    return "mischpult";
  }
  return ["reel", "werke", "mischpult", "info"].includes(h) ? h : "reel";
}
for (const b of document.querySelectorAll("[data-ansicht]")) b.addEventListener("click", () => ansicht(b.dataset.ansicht));

// ——— Reel ———
function reelZeigen(i, { neuStart = true } = {}) {
  S.reel = (i + WERKE.length) % WERKE.length;
  const w = WERKE[S.reel];
  if (neuStart) { S.t0 = performance.now(); S.tPause = ruhig ? DAUER * .35 : 0; }
  $("reel-titel").replaceChildren(el("b", { text: `${bildName(w.bild)} / ` }), `${zwei(w.nr)} ${w.titel}`);
  for (const b of $("reel-zaehler").querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.bild === w.bild));
  malen($("reel-mini"), w.stapel, DAUER * .35, [88, 110]);
  if (S.ansicht === "reel") adresse();
}
BILDER.forEach((b, i) => {
  if (i) $("reel-zaehler").append(",");
  $("reel-zaehler").append(el("button", { type: "button", "data-bild": b.id, title: b.name, "aria-pressed": "false", text: `(${i + 1})`,
    onclick: () => reelZeigen(WERKE.findIndex((w) => w.bild === b.id)) }));
});
$("reel-weiter").addEventListener("click", () => reelZeigen(S.reel + 1));
$("reel-zurueck").addEventListener("click", () => reelZeigen(S.reel - 1));
$("reel-bild").addEventListener("click", () => reelZeigen(S.reel + 1));
function pause(an) {
  if (an === S.laeuft) return;
  if (an) S.t0 = performance.now() - S.tPause * 1000; else S.tPause = zeit() % DAUER;
  S.laeuft = an;
  pauseText();
}
// Pause gilt für Reel und Mischpult zugleich; auch die Leertaste und ein Klick auf die Animation im Mischpult
// (Wunsch vom 4. November 2026: «einen stopp der animation und die möglichkeit des downloads eines standbildes»)
const pauseText = () => { for (const id of ["reel-pause", "pult-pause"]) $(id).textContent = S.laeuft ? "Pause" : "Abspielen"; };
$("reel-pause").addEventListener("click", () => pause(!S.laeuft));
$("pult-pause").addEventListener("click", () => pause(!S.laeuft));
$("pult-bild").addEventListener("click", () => pause(!S.laeuft));
addEventListener("keydown", (e) => {
  if (e.code !== "Space" || e.target.closest("input, select, textarea, button, a")) return;
  if (S.ansicht !== "reel" && S.ansicht !== "mischpult") return;
  e.preventDefault(); pause(!S.laeuft);
});
pauseText();
$("reel-mischen").addEventListener("click", () => { S.mix = kopie(WERKE[S.reel].stapel); ansicht("mischpult"); });
// Standbild: das Bild, das gerade zu sehen ist, als PNG in 1080 × 1350
function standbild(stapel, name) {
  const t = zeit() % DAUER;
  motor.zeichnen(stapel, t, 1080, 1350);
  motor.leinwand.toBlob((blob) => {
    if (!blob) return;
    const a = el("a", { href: URL.createObjectURL(blob), download: `ornament-animation-${name}-${zwei(Math.floor(t))}s${Math.floor((t % 1) * 10)}-4x5.png` });
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
  }, "image/png");
}
$("reel-bildpng").addEventListener("click", () => { const w = WERKE[S.reel]; standbild(w.stapel, `${w.bild}-${zwei(w.nr)}-${slug(w.titel)}`); });
$("pult-bildpng").addEventListener("click", () => standbild(S.mix, `${S.mix.bild === EIGEN ? "eigenes-bild" : S.mix.bild}-mischung`));
$("reel-mp4").addEventListener("click", () => { const w = WERKE[S.reel]; herunterladen(w.stapel, `${w.bild}-${zwei(w.nr)}-${slug(w.titel)}`); });

// ——— Werke: gestreutes Raster ———
const raster = $("werke-raster");
function streuen() {
  const spalten = innerWidth <= 640 ? 3 : innerWidth <= 900 ? 4 : 8;   // wie im CSS; die Ansicht kann beim Aufruf versteckt sein
  let zufallsZahl = 7;
  const zz = () => (zufallsZahl = (zufallsZahl * 9301 + 49297) % 233280) / 233280;
  let zeile = 1, rest = [...raster.children];
  while (rest.length) {
    const n = Math.min(rest.length, spalten <= 3 ? 1 + Math.floor(zz() * 2) : 2 + Math.floor(zz() * 2));
    const frei = [...Array(spalten).keys()].sort(() => zz() - .5).slice(0, n).sort((a, b) => a - b);
    for (const s of frei) { const k = rest.shift(); k.style.gridRow = zeile; k.style.gridColumn = s + 1; }
    zeile++;
  }
}
const kacheln = WERKE.map((w, i) => {
  const c = el("canvas", { width: 240, height: 300, "aria-hidden": "true" });
  const a = el("a", { class: "kachel", href: `#w=${w.id}`, "data-bild": w.bild, "aria-label": `${bildName(w.bild)}, ${w.titel}` },
    c, el("span", { text: `${bildName(w.bild)} ${zwei(w.nr)} — ${w.titel}` }));
  a.addEventListener("click", (e) => { e.preventDefault(); ansicht("reel", { verlauf: false }); reelZeigen(i); });
  const an = () => { if (!ruhig) S.live = { c, stapel: w.stapel, t0: performance.now() }; };
  const aus = () => { if (S.live?.c === c) { S.live = null; malen(c, w.stapel, DAUER * .35, [240, 300]); } };
  a.addEventListener("pointerenter", an); a.addEventListener("focus", an);
  a.addEventListener("pointerleave", aus); a.addEventListener("blur", aus);
  raster.append(a);
  return { w, c };
});
let filter = null;
const bilderListe = $("werke-bilder");
for (const b of [...BILDER, { id: null, name: "Alle" }]) {
  const knopf = el("button", { type: "button", "aria-pressed": String(b.id === null), text: b.name, onclick: () => {
    filter = b.id;
    for (const k of bilderListe.querySelectorAll("button")) k.setAttribute("aria-pressed", String(k === knopf));
    raster.classList.toggle("gefiltert", !!filter);
    for (const k of raster.children) k.classList.toggle("an", k.dataset.bild === filter);
  } });
  bilderListe.append(el("li", {}, knopf));
}
addEventListener("resize", streuen);

// ——— Mischpult ———
const leer = () => ({ effekt: "", werte: [], modus: "normal", deckkraft: 1, quelle: "bild", seed: 0 });
function pultAufbauen() {
  const m = S.mix;
  while (m.ebenen.length < 3) m.ebenen.push(leer());
  $("pult-bilder").replaceChildren(...BILDER.map((b) => el("button", { type: "button", "aria-pressed": String(m.bild === b.id), text: b.name,
    onclick: () => { m.bild = b.id; pultAufbauen(); adresse(); } })),
    ...(motor.hatBild(EIGEN) ? [el("button", { type: "button", "aria-pressed": String(m.bild === EIGEN), text: "Eigenes Bild", onclick: () => { m.bild = EIGEN; pultAufbauen(); adresse(); } })] : []),
    el("button", { type: "button", class: "hochladen", text: motor.hatBild(EIGEN) ? "Anderes Bild …" : "Bild hochladen …", onclick: () => $("pult-datei").click() }));
  $("pult-grund").replaceChildren(...["schwarz", "weiss"].map((g) => el("button", { type: "button", "aria-pressed": String(m.grund === g), text: g === "schwarz" ? "Schwarz" : "Weiss",
    onclick: () => { m.grund = g; pultAufbauen(); adresse(); } })));
  $("pult-ebenen").replaceChildren(...m.ebenen.map((e, i) => ebeneFeld(e, i)));
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
  def.regler.forEach((r, k) => regeln.append(regler(r.name, e.werte?.[k] ?? r.wert, (v) => { e.werte ??= []; for (let j = 0; j < def.regler.length; j++) e.werte[j] ??= def.regler[j].wert; e.werte[k] = v; })));
  fs.append(regeln);
  return fs;
}
function regler(name, wert, setzen) {
  const aus = el("output", { text: Math.round(wert * 100) });
  const ein = el("input", { type: "range", min: "0", max: "1", step: "0.01", value: String(wert), "aria-label": name });
  ein.addEventListener("input", () => { const v = +ein.value; aus.textContent = Math.round(v * 100); setzen(v); });
  ein.addEventListener("change", adresse);
  return el("label", { class: "regler" }, el("span", { text: name }), ein, aus);
}
$("pult-zufall").addEventListener("click", () => {
  const eigen = S.mix.bild === EIGEN;
  S.mix = zufall();
  if (eigen) S.mix.bild = EIGEN;   // mit eigenem Bild mischt «Neu mischen» nur die Effekte neu
  pultAufbauen(); adresse();
});

// Eigenes Bild: Datei wählen oder auf die Bühne ziehen; verkleinert auf höchstens 1600 px, bleibt im Browser
async function eigenesBild(datei) {
  if (!datei || !datei.type.startsWith("image/")) { pultMeldung("Das ist kein Bild. Möglich sind JPEG, PNG, WebP oder GIF."); return; }
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
    S.mix.bild = EIGEN;
    pultAufbauen(); adresse();
    pultMeldung(`${datei.name} · ${c.width} × ${c.height} · bleibt in diesem Browser`);
  } catch (f) { pultMeldung(`Das Bild liess sich nicht öffnen: ${f.message ?? f}`); }
}
const pultMeldung = (text) => { $("pult-meldung").textContent = text; };
$("pult-datei").addEventListener("change", (e) => { eigenesBild(e.target.files[0]); e.target.value = ""; });
const buehne = $("pult-bild").parentElement;
buehne.addEventListener("dragover", (e) => { e.preventDefault(); buehne.classList.add("ziehen"); });
buehne.addEventListener("dragleave", () => buehne.classList.remove("ziehen"));
buehne.addEventListener("drop", (e) => { e.preventDefault(); buehne.classList.remove("ziehen"); eigenesBild(e.dataTransfer.files[0]); });
$("pult-mp4").addEventListener("click", () => herunterladen(S.mix, `${S.mix.bild === EIGEN ? "eigenes-bild" : S.mix.bild}-mischung`));
$("pult-link").addEventListener("click", async () => {
  adresse();
  try { await navigator.clipboard.writeText(location.href); $("pult-link").textContent = "Kopiert"; } catch { $("pult-link").textContent = "Link in der Adresszeile"; }
  setTimeout(() => { $("pult-link").textContent = "Link kopieren"; }, 1800);
});

// ——— Info ———
$("info-bilder").append(...BILDER.map((b) => el("li", {}, b.name, el("span", { text: b.text }))));
$("info-effekte").append(...EFFEKT_IDS.map((id) => el("li", {}, EFFEKTE[id].name, el("span", { text: EFFEKTE[id].herkunft }))));

// ——— MP4 ———
const slug = (s) => s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
async function herunterladen(stapel, name) {
  if (S.export) return;
  const stand = { abbrechen: false };
  S.export = stand;
  $("export").hidden = false; $("export-text").textContent = "MP4 · 0 %";
  try {
    const erg = await videoErstellen(motor, kopie(stapel), {
      fortschritt: (p) => { $("export-text").textContent = `MP4 · ${Math.round(p * 100)} %`; },
      abbruch: () => stand.abbrechen,
    });
    if (erg) {
      const a = el("a", { href: URL.createObjectURL(erg.blob), download: `ornament-animation-${name}-4x5.${erg.endung}` });
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
    }
  } catch (f) {
    $("export-text").textContent = `Das Video liess sich nicht erstellen: ${f.message ?? f}`;
    await new Promise((ok) => setTimeout(ok, 5000));
  } finally { S.export = null; $("export").hidden = true; }
}
$("export-stop").addEventListener("click", () => { if (S.export) S.export.abbrechen = true; });

// ——— Zeichnen ———
function bild() {
  requestAnimationFrame(bild);
  if (S.export || document.hidden) return;
  const t = zeit();
  if (S.ansicht === "reel") {
    if (S.laeuft && t >= DAUER) reelZeigen(S.reel + 1);
    const tt = zeit() % DAUER;
    malen($("reel-bild"), WERKE[S.reel].stapel, tt);
    $("reel-uhr").textContent = uhrText(tt);
  } else if (S.ansicht === "mischpult") {
    const tt = t % DAUER;
    malen($("pult-bild"), S.mix, tt);
    $("pult-uhr").textContent = uhrText(tt);
  } else if (S.ansicht === "werke" && S.live) {
    malen(S.live.c, S.live.stapel, ((performance.now() - S.live.t0) / 1000) % DAUER, [240, 300]);
  }
}

// ——— Start ———
await Promise.all(BILDER.map((b) => motor.bildLaden(b.id, b.url)));
const fehler = motor.pruefen();
if (fehler.length) console.error(fehler.join("\n"));
window.animationen = { motor, WERKE, S, fehler };
streuen();
for (const { w, c } of kacheln) malen(c, w.stapel, DAUER * .35, [240, 300]);
const start = ausAdresse();
reelZeigen(S.reel);
ansicht(start, { verlauf: false });
document.documentElement.classList.add("bereit");
requestAnimationFrame(bild);
