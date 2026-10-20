// Hochrendern – Seite: ein Video wählen, an einer Stelle eine Probe rechnen (vorher und nachher, auf Wunsch 1 : 1), dann Bild für Bild mit dem Netz
// (netz.js, WebGPU) ×2 oder ×4 hochrechnen und als MP4 schreiben (WebCodecs: H.264, sonst VP9 oder AV1; der Ton neu als AAC, phorma-iii/tonspur.js).
// Darüber auf Wunsch Schrift (schrift.js, seit 19. Oktober 2026), in der vollen Auflösung des Ergebnisses; ×1: nur Schrift, ohne Netz.
// Alles bleibt im Browser.
import { grafik, netz, gewichteLesen } from "./netz.js?v=1";
import { STILE, AUFTRITTE, neueEbene, zeichneSchrift, treffer, schriftenLaden, satz, auftritt } from "./schrift.js?v=1";
import { oeffnen } from "./lesen.js?v=1";
import { zeichneBeschnitten } from "../phorma-iii/filmspur.js?v=20";
import { tonLesen, tonKodieren, mp4Schreiber } from "../phorma-iii/tonspur.js?v=20";

const $ = (id) => document.getElementById(id);
const MODELLE = { grafik: "realesr-animevideov3", foto: "realesr-general-x4v3" };
// höchstens 4K: so viele Makroblöcke (16 × 16) erlaubt H.264 auf Stufe 5.1/5.2
const HOECHSTENS = 36864;
const S = { datei: null, url: null, quelle: null, modell: "grafik", faktor: "2", gpu: null, netze: {}, laeuft: false, abbruch: false, film: null, probe: null, gemessen: {},
  ebenen: [], aktiv: -1, schriften: [] };
window.__hochrendern = S;   // für die Browser-Tests

const merken = (k, v) => { try { localStorage.setItem(`hochrendern.${k}`, v); } catch { /* egal */ } };
const erinnern = (k) => { try { return localStorage.getItem(`hochrendern.${k}`); } catch { return null; } };
function melden(text, fehler = false) { const m = $("meldung"); m.textContent = text; m.classList.toggle("fehler", fehler); }
const zahl = (x, n = 1) => x.toFixed(n).replace(".", ",");
const minuten = (s) => (s < 90 ? `${Math.max(1, Math.round(s))} s` : s < 5400 ? `${Math.round(s / 60)} min` : `${zahl(s / 3600)} h`);
const bloecke = (w, h) => Math.ceil(w / 16) * Math.ceil(h / 16);
const leinwand = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

// ——— Grafikkarte ———
const bereit = (async () => {
  try { S.gpu = await grafik(); } catch (e) { S.gpu = null; S.gpuFehler = e?.message ?? String(e); }
  if (!S.gpu) {
    $("startfehler").textContent = `Dieser Browser hat kein WebGPU${S.gpuFehler ? ` (${S.gpuFehler})` : ""}. Hochrendern braucht die Grafikkarte: Chrome oder Edge, Safari ab 26 oder Firefox unter Windows.`;
    $("startfehler").hidden = false;
    return false;
  }
  S.gpu.device.lost.then((i) => { if (i.reason !== "destroyed") { melden(`Die Grafikkarte ist ausgestiegen (${i.message}). Lade die Seite neu.`, true); S.gpu = null; } });
  return true;
})();

async function netzFuer(modell) {
  if (!S.netze[modell]) {
    melden("Das Netz wird geladen …");
    const antwort = await fetch(`modelle/${MODELLE[modell]}.bin`);
    if (!antwort.ok) throw new Error(`Gewichte nicht gefunden (${antwort.status})`);
    S.netze[modell] = netz(S.gpu.device, gewichteLesen(await antwort.arrayBuffer()));
  }
  return S.netze[modell];
}

// ——— Einstellungen ———
function wahl(attr, schluessel, werte, wenn) {
  const knoepfe = [...document.querySelectorAll(`[${attr}]`)];
  const zeigen = () => knoepfe.forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute(attr) === S[schluessel])));
  const alt = erinnern(schluessel);
  if (alt !== null && werte.includes(alt)) S[schluessel] = alt;
  zeigen();
  for (const b of knoepfe) b.addEventListener("click", () => { if (b.disabled || S[schluessel] === b.getAttribute(attr)) return; S[schluessel] = b.getAttribute(attr); merken(schluessel, S[schluessel]); zeigen(); wenn(); });
  return { knoepfe, zeigen };
}
const modellWahl = wahl("data-modell", "modell", Object.keys(MODELLE), () => { S.probe = null; ansicht("video"); schaetzen(); });
const faktorWahl = wahl("data-faktor", "faktor", ["1", "2", "4"], () => { S.probe = null; ansicht("video"); masseZeigen(); });

/** Grösse vorher → nachher; ×4 nur, solange das Ergebnis höchstens 4K ist (sonst ×2 oder ×1); ×1 braucht die Grafikkarte nicht */
function masseZeigen() {
  const q = S.quelle;
  if (!q) return;
  const geht = (f) => bloecke(q.breite * f, q.hoehe * f) <= HOECHSTENS;
  for (const b of faktorWahl.knoepfe) b.disabled = S.laeuft || !geht(Number(b.dataset.faktor)) || (b.dataset.faktor !== "1" && !S.gpu);
  if (!geht(Number(S.faktor)) || (S.faktor !== "1" && !S.gpu)) { S.faktor = geht(2) && S.gpu ? "2" : "1"; faktorWahl.zeigen(); }
  const f = Number(S.faktor);
  $("faktor-info").textContent = f === 1 ? `${q.breite} × ${q.hoehe}, ohne KI – nur die Schrift kommt dazu.`
    : `${q.breite} × ${q.hoehe} → ${q.breite * f} × ${q.hoehe * f}${geht(4) ? "" : " (× 4 gäbe mehr als 4K)"}`;
  $("info").textContent = `${q.breite} × ${q.hoehe} · ${zahl(q.dauer)} s · ${q.anzahl} Bilder · ${zahl(q.fps, q.fps % 1 ? 2 : 0)} Bilder/s · gelesen über ${q.weg === "webcodecs" ? "WebCodecs" : "das Video-Element"}`;
  for (const k of ["probe", "los"]) $(k).disabled = !geht(f) || S.laeuft || (f > 1 && !S.gpu);
  schaetzen();
}
function schaetzen() {
  const q = S.quelle, ms = S.faktor === "1" ? 0 : S.gemessen[`${S.modell}|${S.faktor}`];
  $("schaetzung").textContent = q && ms ? `Probe: ${zahl(ms / 1000, 2)} s je Bild – das ganze Video dauert hier etwa ${minuten((ms / 1000) * q.anzahl)}.` : "";
}

// ——— Video wählen ———
const ablage = $("ablage");
for (const art of ["dragenter", "dragover"]) ablage.addEventListener(art, (e) => { e.preventDefault(); ablage.classList.add("drueber"); });
for (const art of ["dragleave", "drop"]) ablage.addEventListener(art, () => ablage.classList.remove("drueber"));
ablage.addEventListener("drop", (e) => {
  e.preventDefault();
  const d = [...(e.dataTransfer?.files ?? [])].find((f) => f.type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(f.name));
  if (d) videoLaden(d); else melden("Das ist kein Video. Bitte MP4, MOV oder WebM.", true);
});
$("datei").addEventListener("change", (e) => { if (e.target.files?.[0]) videoLaden(e.target.files[0]); });

async function videoLaden(datei) {
  if (S.laeuft) return;
  const el = $("quelle");
  if (S.url) URL.revokeObjectURL(S.url);
  S.datei = datei; S.url = URL.createObjectURL(datei); S.quelle = null; S.probe = null; S.gemessen = {};
  $("ablage-titel").textContent = "Anderes Video wählen";
  $("ablage-name").textContent = `${datei.name} · ${zahl(datei.size / 1e6)} MB`;
  melden("Das Video wird gelesen …");
  el.src = S.url; el.hidden = false; $("leer").hidden = true;
  ansicht("video");
  try { S.quelle = await oeffnen(datei, el); }
  catch (e) { melden(`Dieses Video lässt sich nicht lesen (${e?.message ?? e}). Versuche MP4 (H.264) oder WebM.`, true); return; }
  if (S.datei !== datei) return;
  if (!el.videoWidth) await new Promise((ok) => { el.addEventListener("loadeddata", ok, { once: true }); el.addEventListener("error", ok, { once: true }); });
  $("zeit").max = String(S.quelle.dauer); $("zeit").value = String(Math.min(S.quelle.dauer / 2, S.quelle.dauer)); $("zeit").disabled = !el.videoWidth; $("spielen").disabled = !el.videoWidth;
  if (el.videoWidth) { el.currentTime = Number($("zeit").value); zeitZeigen(); }
  await bereit;
  masseZeigen();
  melden(el.videoWidth ? "Bereit. Wähle eine Stelle und rechne eine Probe – oder gleich das ganze Video." : "Bereit. Dieser Browser zeigt das Video nicht an, kann es aber hochrendern.");
}

// ——— Vorschau: das Video oder der Vergleich ———
function zeitZeigen() { $("zeitcode").textContent = `${zahl(Number($("zeit").value))} s`; }
$("zeit").addEventListener("input", () => { const el = $("quelle"); el.pause(); el.currentTime = Number($("zeit").value); zeitZeigen(); ansicht("video"); });
$("quelle").addEventListener("timeupdate", () => { if (!$("quelle").paused) { $("zeit").value = String($("quelle").currentTime); zeitZeigen(); } });
$("spielen").addEventListener("click", () => {
  const el = $("quelle"); ansicht("video");
  if (el.paused) { el.play(); $("spielen").textContent = "Anhalten"; } else { el.pause(); $("spielen").textContent = "Abspielen"; }
});
$("quelle").addEventListener("pause", () => { $("spielen").textContent = "Abspielen"; });

function ansicht(art) {
  const vergleich = art === "vergleich" && S.probe, ohneKi = S.probe?.ohneKi;
  $("quelle").hidden = vergleich || !S.url; $("vergleich").hidden = !vergleich; $("marken").hidden = !vergleich || ohneKi; $("teiler-leiste").hidden = !vergleich;
  $("teiler").hidden = !!ohneKi; $("lupe").hidden = false;
  if (!vergleich) { $("rahmen").classList.remove("eins"); $("lupe").setAttribute("aria-pressed", "false"); } else zeichneVergleich();
  schriftVorschau();
}
$("zurueck").addEventListener("click", () => ansicht("video"));
$("teiler").addEventListener("input", zeichneVergleich);
$("lupe").addEventListener("click", () => {
  const an = !$("rahmen").classList.contains("eins");
  $("rahmen").classList.toggle("eins", an); $("lupe").setAttribute("aria-pressed", String(an));
  if (an) { const r = $("rahmen"), c = $("vergleich"); r.scrollLeft = (c.width - r.clientWidth) * Number($("teiler").value); r.scrollTop = (c.height - r.clientHeight) / 2; }
});
/** links das Original, so vergrössert wie ein Browser es täte; rechts das Ergebnis des Netzes; die Grenze am Regler */
function zeichneVergleich() {
  const p = S.probe;
  if (!p) return;
  const c = $("vergleich"), ctx = c.getContext("2d");
  if (c.width !== p.nachher.width || c.height !== p.nachher.height) { c.width = p.nachher.width; c.height = p.nachher.height; }
  const x = Math.round(c.width * Number($("teiler").value));
  ctx.drawImage(p.nachher, 0, 0);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, x, c.height); ctx.clip();
  ctx.imageSmoothingQuality = "high"; ctx.drawImage(p.vorher, 0, 0, c.width, c.height);
  ctx.restore();
  zeichneSchrift(ctx, S.ebenen, p.zeit, c.width, c.height, S.quelle?.dauer);
  if (!p.ohneKi) { ctx.fillStyle = "rgba(255, 255, 255, 0.85)"; ctx.fillRect(x - 1, 0, 2, c.height); }
}

// ——— Schrift: Ebenen, Editor und die Ebene über dem Video (zum Ziehen) ———
try { S.ebenen = JSON.parse(erinnern("ebenen") || "[]").filter((e) => typeof e?.text === "string").map((e) => ({ ...neueEbene(), ...e })); } catch { S.ebenen = []; }
S.aktiv = S.ebenen.length ? 0 : -1;
const aktiv = () => S.ebenen[S.aktiv];
// die Schriften: Inter Display aus dem Bestand der Website, dazu die aus vendor/schriften/ (tools/schriften-holen.mjs)
S.schriften = [{ name: "Inter Display", schnitt: 600, stil: "normal", gruppe: "Grotesk" }];
const schriftenGeladen = fetch("../../vendor/schriften/schriften.json").then((r) => r.json()).then((l) => { S.schriften.push(...l); }).catch(() => {}).then(() => {
  $("s-schriften").replaceChildren(...S.schriften.map((s) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = s.name; b.title = `${s.name} · ${s.gruppe}`; b.dataset.schrift = s.name;
    b.style.font = `${s.stil === "italic" ? "italic " : ""}${s.schnitt} 1.05rem "${s.name}"`;
    return b;
  }));
  editorZeigen();
});
for (const [id, werte] of [["s-stil", STILE], ["s-auftritt", AUFTRITTE]])
  $(id).replaceChildren(...Object.entries(werte).map(([wert, name]) => Object.assign(document.createElement("option"), { value: wert, textContent: name })));
// neun Lagen: links, Mitte, rechts × oben, Mitte, unten (links und rechts mit passender Ausrichtung)
const SPALTEN = [["left", 0.07], ["center", 0.5], ["right", 0.93]], ZEILEN = [0.12, 0.5, 0.86];
$("lagen").replaceChildren(...ZEILEN.flatMap((y) => SPALTEN.map(([ausrichtung, x]) => {
  const b = document.createElement("button");
  b.type = "button"; b.dataset.lage = `${ausrichtung},${x},${y}`; b.setAttribute("aria-label", `${ausrichtung === "left" ? "links" : ausrichtung === "right" ? "rechts" : "Mitte"} ${y < 0.3 ? "oben" : y > 0.7 ? "unten" : "mittig"}`);
  b.style.setProperty("justify-self", "stretch");
  return b;
})));

function ebenenZeigen() {
  $("ebenen").replaceChildren(...S.ebenen.map((e, i) => {
    const b = document.createElement("button");
    b.type = "button"; b.dataset.nr = String(i); b.setAttribute("aria-pressed", String(i === S.aktiv));
    b.textContent = e.text.trim().split("\n")[0].slice(0, 28) || "(leer)";
    b.style.fontFamily = `"${e.schrift}"`;
    return b;
  }));
}
function editorZeigen() {
  const e = aktiv();
  $("editor").hidden = !e;
  if (!e) return;
  const setzen = (id, wert, art = "value") => { if ($(id)[art] !== wert) $(id)[art] = wert; };
  setzen("s-text", e.text); setzen("s-groesse", String(e.groesse)); setzen("s-laufweite", String(e.laufweite)); setzen("s-versalien", e.versalien, "checked");
  setzen("s-farbe", e.farbe); setzen("s-stil", e.stil); setzen("s-zweite", e.zweite); setzen("s-auftritt", e.auftritt);
  setzen("s-von", String(e.von ?? 0)); setzen("s-bis", e.bis === null ? "" : String(e.bis));
  for (const b of $("s-schriften").children) b.setAttribute("aria-pressed", String(b.dataset.schrift === e.schrift));
  for (const b of document.querySelectorAll("[data-ausrichtung]")) b.setAttribute("aria-pressed", String(b.dataset.ausrichtung === e.ausrichtung));
}
/** nach jeder Änderung: merken, Liste und Editor nachführen, Vorschau neu (die Schrift zuerst laden, sonst die Ersatzschrift) */
function geaendert() {
  merken("ebenen", JSON.stringify(S.ebenen));
  ebenenZeigen(); editorZeigen(); schriftVorschau();
  if (!$("vergleich").hidden) zeichneVergleich();
  schriftenLaden(S.ebenen).then(() => { schriftVorschau(); if (!$("vergleich").hidden) zeichneVergleich(); });
}
$("ebenen").addEventListener("click", (ev) => { const b = ev.target.closest("[data-nr]"); if (!b) return; S.aktiv = Number(b.dataset.nr); geaendert(); });
$("ebene-neu").addEventListener("click", () => {
  const vorlage = aktiv(), e = neueEbene();
  // eine weitere Schrift im Stil der gewählten, etwas höher
  if (vorlage) Object.assign(e, { ...vorlage, text: "Noch ein Text", y: Math.max(0.1, vorlage.y - 1.6 * vorlage.groesse) });
  S.ebenen.push(e); S.aktiv = S.ebenen.length - 1;
  geaendert();
  $("s-text").focus(); $("s-text").select();
});
$("ebene-weg").addEventListener("click", () => { if (!aktiv()) return; S.ebenen.splice(S.aktiv, 1); S.aktiv = Math.min(S.aktiv, S.ebenen.length - 1); geaendert(); });
$("s-schriften").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-schrift]"), e = aktiv();
  if (!b || !e) return;
  const s = S.schriften.find((x) => x.name === b.dataset.schrift);
  Object.assign(e, { schrift: s.name, schnitt: s.schnitt, schriftStil: s.stil });
  geaendert();
});
for (const [id, feld, lesen] of [["s-text", "text", (el) => el.value], ["s-groesse", "groesse", (el) => Number(el.value)], ["s-laufweite", "laufweite", (el) => Number(el.value)],
  ["s-versalien", "versalien", (el) => el.checked], ["s-farbe", "farbe", (el) => el.value], ["s-stil", "stil", (el) => el.value], ["s-zweite", "zweite", (el) => el.value],
  ["s-auftritt", "auftritt", (el) => el.value], ["s-von", "von", (el) => Math.max(0, Number(el.value) || 0)], ["s-bis", "bis", (el) => (el.value === "" ? null : Math.max(0, Number(el.value)))]])
  $(id).addEventListener("input", () => { const e = aktiv(); if (!e) return; e[feld] = lesen($(id)); geaendert(); });
for (const b of document.querySelectorAll("[data-ausrichtung]")) b.addEventListener("click", () => { const e = aktiv(); if (!e) return; e.ausrichtung = b.dataset.ausrichtung; geaendert(); });
$("lagen").addEventListener("click", (ev) => {
  const b = ev.target.closest("[data-lage]"), e = aktiv();
  if (!b || !e) return;
  const [ausrichtung, x, y] = b.dataset.lage.split(",");
  Object.assign(e, { ausrichtung, x: Number(x), y: Number(y) });
  geaendert();
});
ebenenZeigen(); editorZeigen();

/** die Schrift über dem Video: eine Leinwand genau über dem Bild, in Bildschirmpixeln; die gewählte Ebene gestrichelt umrandet */
function schriftVorschau() {
  const c = $("schrift"), el = $("quelle"), zeigen = !el.hidden && !!el.videoWidth && S.ebenen.length > 0;
  c.hidden = !zeigen;
  if (!zeigen) return;
  const r = el.getBoundingClientRect(), rr = $("rahmen").getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  Object.assign(c.style, { left: `${r.left - rr.left}px`, top: `${r.top - rr.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const ctx = c.getContext("2d"), t = el.currentTime, dauer = S.quelle?.dauer ?? el.duration;
  ctx.clearRect(0, 0, w, h);
  zeichneSchrift(ctx, S.ebenen, t, w, h, dauer);
  const e = aktiv();
  if (e?.text.trim() && auftritt(e, t, dauer) && el.paused) {
    const [x0, y0, x1, y1] = satz(ctx, e, w, h).box, rand = 0.012 * Math.min(w, h);
    ctx.save(); ctx.setLineDash([6 * dpr, 4 * dpr]); ctx.lineWidth = dpr; ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.strokeRect(x0 - rand, y0 - rand, x1 - x0 + 2 * rand, y1 - y0 + 2 * rand); ctx.restore();
  }
}
for (const art of ["seeked", "loadeddata", "pause"]) $("quelle").addEventListener(art, schriftVorschau);
$("quelle").addEventListener("play", function laufen() { schriftVorschau(); if (!$("quelle").paused) requestAnimationFrame(laufen); });
window.addEventListener("resize", schriftVorschau);
// ziehen: die getroffene Ebene wird die gewählte und folgt dem Zeiger
let ziehen = null;
const punkt = (ev) => { const c = $("schrift"), r = c.getBoundingClientRect(); return [((ev.clientX - r.left) / r.width) * c.width, ((ev.clientY - r.top) / r.height) * c.height]; };
$("schrift").addEventListener("pointerdown", (ev) => {
  const c = $("schrift"), [x, y] = punkt(ev), i = treffer(c.getContext("2d"), S.ebenen, $("quelle").currentTime, c.width, c.height, x, y, S.quelle?.dauer);
  if (i < 0) return;
  $("quelle").pause();
  S.aktiv = i; const e = aktiv();
  ziehen = { dx: e.x * c.width - x, dy: e.y * c.height - y };
  c.setPointerCapture(ev.pointerId); c.classList.add("zieht");
  ebenenZeigen(); editorZeigen(); schriftVorschau();
});
$("schrift").addEventListener("pointermove", (ev) => {
  const c = $("schrift"), [x, y] = punkt(ev);
  if (!ziehen) { c.classList.toggle("greifbar", treffer(c.getContext("2d"), S.ebenen, $("quelle").currentTime, c.width, c.height, x, y, S.quelle?.dauer) >= 0); return; }
  const e = aktiv(), klemm = (v) => Math.min(1, Math.max(0, v));
  e.x = klemm((x + ziehen.dx) / c.width); e.y = klemm((y + ziehen.dy) / c.height);
  schriftVorschau();
});
for (const art of ["pointerup", "pointercancel"]) $("schrift").addEventListener(art, () => { if (!ziehen) return; ziehen = null; $("schrift").classList.remove("zieht"); geaendert(); });
schriftenGeladen.then(() => schriftenLaden(S.ebenen)).then(schriftVorschau);

// ——— Probe ———
/** das Bild an der Stelle des Video-Elements als Leinwand (gedreht, wie es gezeigt wird) */
function standbild() {
  const el = $("quelle"), c = leinwand(el.videoWidth, el.videoHeight);
  c.getContext("2d").drawImage(el, 0, 0);
  return c;
}
$("probe").addEventListener("click", async () => {
  if (!S.quelle || S.laeuft) return;
  const el = $("quelle");
  if (!el.videoWidth) { melden("Dieser Browser zeigt das Video nicht an; eine Probe geht hier nicht.", true); return; }
  sperren(true);
  try {
    el.pause();
    const f = Number(S.faktor), vorher = standbild(), schluessel = `${S.modell}|${S.faktor}`;
    await schriftenLaden(S.ebenen);
    if (f === 1) {
      S.probe = { vorher, nachher: vorher, zeit: el.currentTime, ohneKi: true };
      ansicht("vergleich");
      melden(`Probe bei ${zahl(el.currentTime)} s mit Schrift, ohne KI. «1 : 1» für volle Grösse.`);
      return;
    }
    const n = await netzFuer(S.modell);
    melden("Die Probe wird gerechnet …");
    // das erste Mal übersetzt die Grafikkarte die Programme: dann zweimal, und gemessen wird das zweite
    if (!S.gemessen[schluessel]) await n.rechne(vorher, vorher.width, vorher.height, f);
    const t0 = performance.now(), e = await n.rechne(vorher, vorher.width, vorher.height, f);
    S.gemessen[schluessel] = performance.now() - t0;
    const nachher = leinwand(e.breite, e.hoehe);
    nachher.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(e.daten.buffer), e.breite, e.hoehe), 0, 0);
    S.probe = { vorher, nachher, zeit: el.currentTime };
    ansicht("vergleich");
    schaetzen();
    melden(`Probe bei ${zahl(el.currentTime)} s: ${e.breite} × ${e.hoehe}. Regler verschieben, «1 : 1» für volle Grösse.`);
  } catch (e) {
    melden(`Die Probe ging nicht: ${e?.message ?? e}`, true);
  } finally { sperren(false); }
});

// ——— Hochrendern ———
const CODECS = [["avc1.640028", "avc"], ["avc1.4d0028", "avc"], ["avc1.42e028", "avc"], ["avc1.640032", "avc"], ["avc1.640033", "avc"], ["avc1.4d0033", "avc"], ["avc1.640034", "avc"],
  ["vp09.00.51.08", "vp9"], ["vp09.00.41.08", "vp9"], ["av01.0.12M.08", "av1"]];
const STUFE = { 0x28: 8192, 0x32: 22080, 0x33: 36864, 0x34: 36864 };     // H.264, Tabelle A-1: Makroblöcke je Bild
async function encoderWahl(B, H, fps) {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return null;
  const bitrate = Math.round(Math.min(80e6, Math.max(8e6, B * H * fps * 0.12)));
  for (const [codec, art] of CODECS) {
    if (art === "avc" && STUFE[parseInt(codec.slice(-2), 16)] < bloecke(B, H)) continue;
    const cfg = { codec, width: B, height: H, bitrate, framerate: fps, latencyMode: "quality", ...(art === "avc" ? { avc: { format: "avc" } } : {}) };
    try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return { cfg, art }; } catch { /* nächster */ }
  }
  return null;
}

let wachbleiben = null;
$("los").addEventListener("click", async () => {
  if (!S.quelle || S.laeuft) return;
  const q = S.quelle, f = Number(S.faktor), B = q.breite * f, H = q.hoehe * f, fps = Math.max(1, Math.round(q.fps * 1000) / 1000);
  S.laeuft = true; S.abbruch = false; sperren(true);
  $("abbrechen").hidden = false; $("fortschritt").hidden = false; $("fortschritt").value = 0; $("ergebnis").hidden = true;
  try { wachbleiben = await navigator.wakeLock?.request("screen"); } catch { /* egal */ }
  const t0 = performance.now();
  try {
    const n = f > 1 ? await netzFuer(S.modell) : null, wahlE = await encoderWahl(B, H, fps);
    await schriftenLaden(S.ebenen);
    if (!wahlE) throw new Error(`dieser Browser kann ${B} × ${H} nicht als Video kodieren`);
    let ton = null;
    try { melden("Der Ton wird gelesen …"); const t = await tonLesen(S.datei); ton = await tonKodieren(t.buffer, q.dauer, { ausblenden: 0 }); } catch { ton = null; }
    const datei = mp4Schreiber({ breite: B, hoehe: H, fps: Math.round(fps), codec: wahlE.cfg.codec, bilder: q.anzahl, ton, art: wahlE.art });
    let beschreibung, fehler = null;
    const enc = new VideoEncoder({
      output: (chunk, meta) => {
        try {
          if (beschreibung === undefined) { const d = meta?.decoderConfig?.description; beschreibung = d ? new Uint8Array(d.buffer ? d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength) : d) : null; }
          if (wahlE.art === "avc" && !beschreibung) throw new Error("der Encoder hat keine Beschreibung geliefert");
          const daten = new Uint8Array(chunk.byteLength); chunk.copyTo(daten);
          datei.bild(daten, chunk.type === "key", chunk.timestamp, beschreibung ?? undefined, chunk.duration || undefined);
        } catch (e) { fehler ??= e; }
      },
      error: (e) => { fehler ??= e; },
    });
    enc.configure(wahlE.cfg);
    const zwischen = leinwand(q.breite, q.hoehe), zx = zwischen.getContext("2d"), aus = leinwand(B, H), ax = aus.getContext("2d");
    let zeit0 = null;
    const schluessel = Math.max(1, Math.round(fps * 2));
    let i = 0, tBild = performance.now();
    melden(f > 1 ? `Hochrendern: ${q.breite} × ${q.hoehe} → ${B} × ${H} …` : "Die Schrift wird ins Video gesetzt …");
    for await (const b of q.bilder()) {
      if (fehler) throw fehler;
      if (S.abbruch) { b.fertig(); break; }
      // jedes Bild erst auf eine Leinwand (gedreht, wenn das Video vom Telefon quer in der Datei steht; in der Grösse der Spur, auch bei nicht
      // quadratischen Pixeln): direkt aus einem VideoFrame oder dem Video-Element zerbrach in Chromium mit SwiftShader die Grafik
      // («A valid external Instance reference no longer exists»)
      zeichneBeschnitten(zx, b.bild, b.bild.displayWidth ?? b.bild.videoWidth, b.bild.displayHeight ?? b.bild.videoHeight, q.breite, q.hoehe, q.drehung);
      if (n) { const e = await n.rechne(zwischen, q.breite, q.hoehe, f); ax.putImageData(new ImageData(new Uint8ClampedArray(e.daten.buffer), B, H), 0, 0); }
      else ax.drawImage(zwischen, 0, 0);
      b.fertig();
      // die Schrift in voller Auflösung darüber, zur Zeit des Bilds im Video
      zeit0 ??= b.zeit;
      zeichneSchrift(ax, S.ebenen, (b.zeit - zeit0) / 1e6, B, H, q.dauer);
      const bild = new VideoFrame(aus, { timestamp: b.zeit, duration: b.dauer || Math.round(1e6 / fps) });
      enc.encode(bild, { keyFrame: i % schluessel === 0 });
      bild.close();
      while (enc.encodeQueueSize > 3) await new Promise((weiter) => setTimeout(weiter, 2));
      i++;
      const jetzt = performance.now(), je = (jetzt - t0) / i;
      if (jetzt - tBild > 400 || i === q.anzahl) {
        tBild = jetzt;
        $("fortschritt").value = i / q.anzahl;
        melden(`Bild ${i} von ${q.anzahl} · ${zahl(je / 1000, 2)} s je Bild · noch etwa ${minuten((je / 1000) * Math.max(0, q.anzahl - i))}`);
      }
    }
    await enc.flush(); enc.close();
    if (fehler) throw fehler;
    if (S.abbruch) { melden(`Abgebrochen nach ${i} Bildern.`); return; }
    if (!i) throw new Error("keine Bilder gelesen");
    zeigen(datei.fertig(), { B, H, i, ton, art: wahlE, sekunden: (performance.now() - t0) / 1000 });
  } catch (e) {
    melden(`Das Video liess sich nicht hochrendern: ${e?.message ?? e}`, true);
  } finally {
    S.laeuft = false; sperren(false);
    $("abbrechen").hidden = true; $("fortschritt").hidden = true;
    wachbleiben?.release?.().catch(() => {}); wachbleiben = null;
  }
});
$("abbrechen").addEventListener("click", () => { S.abbruch = true; melden("Wird abgebrochen …"); });

function zeigen(blob, { B, H, i, ton, art, sekunden }) {
  if (S.film) URL.revokeObjectURL(S.film);
  S.film = URL.createObjectURL(blob);
  $("film").src = S.film;
  const name = (S.datei.name.replace(/\.[^.]+$/, "") || "video") + `-${B}x${H}.mp4`;
  $("laden").href = S.film; $("laden").download = name;
  $("film-info").textContent = `${B} × ${H} · ${i} Bilder · ${zahl(blob.size / 1e6)} MB · ${art.art === "avc" ? "H.264" : art.art.toUpperCase()} (${art.cfg.codec}, ${Math.round(art.cfg.bitrate / 1e6)} Mbit/s)${ton ? " · mit Ton" : " · ohne Ton"}${S.ebenen.some((e) => e.text.trim()) ? ` · ${S.ebenen.filter((e) => e.text.trim()).length} × Schrift` : ""} · gerechnet in ${minuten(sekunden)}`;
  $("ergebnis").hidden = false;
  melden("Fertig. Prüfe das Video und lade es herunter.");
  $("ergebnis").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
}

function sperren(an) {
  for (const el of [$("datei"), $("probe"), $("los"), ...modellWahl.knoepfe, ...faktorWahl.knoepfe]) el.disabled = an || ((el.id === "probe" || el.id === "los") && !S.quelle);
  if (!an) masseZeigen();
}
