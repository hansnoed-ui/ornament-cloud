// ORNAMENT LAB · Video 0.2 – die Oberfläche des Editors. Das Modell ist kern/folge.js (Folge, Titel, Ton), der Film ist ein OpenFilm-Film
// (film.html); Vorschau und Export zeichnen ihn mit medien/zeichnen.js. Alles bleibt im Browser: Dateien werden gelesen, nie hochgeladen.
// Eigenständig: der Editor ist nicht mit dem Lab verbunden; er macht Videos (MP4), die man im Lab mit «Video wählen» als Material lädt.
import * as F from "./kern/folge.js";
import { REGLER, VORLAGEN, werteVon } from "./kern/filter.js";
import { LAGEN, ANIMATIONEN, ABGAENGE, BAENDER, SCHRIFTEN, TITEL_VORLAGEN } from "./kern/titel.js";
import { EFFEKT_VORLAGEN, EFFEKT_REGLER, EFFEKT_STANDARD, KENBURNS, effekteVon } from "./kern/effekte.js";
import { taktMarken } from "./kern/ton.js";
import { Quellen, zeichnen, suchen, bereit, FILTER_DA } from "./medien/zeichnen.js";
import { exportieren, exportMoeglich, QUALITAETEN, tonDekodieren } from "./medien/export.js";
import { projektPacken, projektEntpacken, ENDUNG } from "./medien/projektdatei.js";
import { fadeGain } from "../../../vendor/openfilm-0.2.6/film-doc.js";
import { dateiLesen } from "../medien/dateilesen.js";
import { schriftenLaden } from "../medien/schriften.js";

const $ = (id) => document.getElementById(id);
function el(tag, attrs = {}, ...kinder) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "text") e.textContent = v;
    else if (k === "dataset") Object.assign(e.dataset, v);
    else if (k === "style" && typeof v === "object") Object.assign(e.style, v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kinder.flat()) if (k !== null && k !== undefined && k !== false) e.append(k);
  return e;
}
const zeitText = (s) => { const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r.toFixed(2).padStart(5, "0")}`; };
const kurzZeit = (s) => (s >= 60 ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}` : `${Math.round(s * 10) / 10} s`);
const ENDUNGEN = { video: /\.(mp4|m4v|mov|webm)$/i, bild: /\.(png|jpe?g|webp|gif|avif|bmp)$/i, ton: /\.(wav|mp3|ogg|oga|flac|m4a|aac|opus)$/i };
const MIME = { mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif", bmp: "image/bmp", wav: "audio/wav", mp3: "audio/mpeg", ogg: "audio/ogg", oga: "audio/ogg", flac: "audio/flac", m4a: "audio/mp4", aac: "audio/aac", opus: "audio/ogg" };
const FPS = 30;

// ---------- Zustand ----------
const S = {
  p: F.neuesProjekt(), urls: new Map(), bytes: new Map(), bilder: new Map(), tonDaten: new Map(),
  film: null, auswahl: null, t: 0, spielt: false, zoom: 60, zurueck: [], vor: [], geaendert: false,
};
let Q = new Quellen(S.urls, { stumm: true });
const toene = new Map();   // Ton-Clip-Id → <audio> für die Vorschau

function zustand(text, fehler = false) { const z = $("zustand"); z.textContent = text; z.classList.toggle("fehler", fehler); }
function neuRechnen() {
  try { S.film = F.film(S.p); return true; } catch (f) { S.film = null; zustand(f.message, true); return false; }
}
/** alles neu zeigen; inspektor: false, wenn die Änderung aus den Eigenschaften selbst kommt (sonst verliert ein Feld beim Tippen den Fokus) */
function alles({ inspektor = true, medien = false } = {}) {
  neuRechnen();
  if (medien) zeigeMedien();
  zeigeLeiste();
  if (inspektor) zeigeInspektor();
  passeLeinwand();
  $("leer").hidden = S.p.folge.length > 0 || S.p.titel.length > 0;
  S.t = Math.min(S.t, F.dauer(S.p));
  zeigeZeit(); zeichneJetzt();
}
/** eine Änderung am Projekt, rückgängig zu machen */
function aendern(fn, opt) {
  const vorher = JSON.stringify(S.p);
  const r = fn();
  merken(vorher);
  alles(opt);
  return r;
}
function merken(vorher) {
  if (vorher === JSON.stringify(S.p)) return;
  S.zurueck.push(vorher); if (S.zurueck.length > 300) S.zurueck.shift();
  S.vor = []; S.geaendert = true;
}
function rueckgaengig() {
  if (!S.zurueck.length) return;
  S.vor.push(JSON.stringify(S.p)); S.p = F.normieren(JSON.parse(S.zurueck.pop()));
  if (S.auswahl && !F.finde(S.p, S.auswahl)) S.auswahl = null;
  $("name").value = S.p.name; $("format").value = S.p.format;
  alles({ medien: true }); zustand("Rückgängig gemacht");
}
function wiederholen() {
  if (!S.vor.length) return;
  S.zurueck.push(JSON.stringify(S.p)); S.p = F.normieren(JSON.parse(S.vor.pop()));
  if (S.auswahl && !F.finde(S.p, S.auswahl)) S.auswahl = null;
  $("name").value = S.p.name; $("format").value = S.p.format;
  alles({ medien: true }); zustand("Wiederholt");
}

// ---------- Material ----------
function artVon(datei) {
  if (datei.type.startsWith("video/") || ENDUNGEN.video.test(datei.name)) return "video";
  if (datei.type.startsWith("image/") || ENDUNGEN.bild.test(datei.name)) return "bild";
  if (datei.type.startsWith("audio/") || ENDUNGEN.ton.test(datei.name)) return "ton";
  return null;
}
const warte = (ziel, art) => new Promise((ok, nein) => { const a = () => { weg(); ok(); }, f = () => { weg(); nein(new Error("Die Datei lässt sich nicht lesen")); }; const weg = () => { ziel.removeEventListener(art, a); ziel.removeEventListener("error", f); }; ziel.addEventListener(art, a); ziel.addEventListener("error", f); });

/** ein kleines Vorschaubild (JPEG als Daten-URL) aus einem Video oder Bild */
function vorschaubild(q, w, h) {
  const c = document.createElement("canvas"), s = Math.max(160 / w, 90 / h);
  c.width = 160; c.height = 90;
  const x = c.getContext("2d"); x.fillStyle = "#000"; x.fillRect(0, 0, 160, 90);
  x.drawImage(q, (160 - w * s) / 2, (90 - h * s) / 2, w * s, h * s);
  try { return c.toDataURL("image/jpeg", 0.7); } catch { return null; }
}
async function metadaten(art, url, bytes) {
  if (art === "video") {
    const v = el("video", { muted: true, playsinline: true, preload: "auto" }); v.muted = true; v.src = url;
    await warte(v, "loadedmetadata");
    let dauer = v.duration;
    if (!Number.isFinite(dauer)) { v.currentTime = 1e9; await warte(v, "seeked").catch(() => {}); dauer = v.duration; v.currentTime = 0; }
    if (!(dauer > 0)) throw new Error("Das Video hat keine Länge");
    await suchen(v, Math.min(0.5, dauer / 3));
    const bild = vorschaubild(v, v.videoWidth, v.videoHeight);
    const r = { dauer: Math.round(dauer * 1000) / 1000, breite: v.videoWidth, hoehe: v.videoHeight, bild };
    v.removeAttribute("src"); v.load();
    return r;
  }
  if (art === "bild") {
    const b = new Image(); b.src = url; await b.decode();
    return { breite: b.naturalWidth, hoehe: b.naturalHeight, bild: vorschaubild(b, b.naturalWidth, b.naturalHeight) };
  }
  const d = await tonDekodieren(bytes);
  if (!d) throw new Error("Dieser Browser kann den Ton nicht lesen");
  return { dauer: Math.round((d.spuren[0].length / d.rate) * 1000) / 1000, ton: d };
}

async function dateienAufnehmen(dateien) {
  const liste = [...dateien];
  let folgeLeer = S.p.folge.length === 0, tonLeer = S.p.ton.length === 0, gut = 0;
  for (const [i, datei] of liste.entries()) {
    const art = artVon(datei);
    if (!art) { zustand(`${datei.name}: diese Art Datei kennt der Editor nicht`, true); continue; }
    try {
      zustand(`${datei.name} wird gelesen (${i + 1} von ${liste.length}) …`);
      const bytes = await dateiLesen(datei, { melden: (t) => zustand(t) });
      const endung = (datei.name.split(".").pop() ?? "").toLowerCase();
      const url = URL.createObjectURL(new Blob([bytes], { type: datei.type || MIME[endung] || "application/octet-stream" }));
      const m = await metadaten(art, url, bytes);
      const vorher = JSON.stringify(S.p);
      const id = F.mediumAufnehmen(S.p, { name: datei.name, art, dauer: m.dauer ?? null, breite: m.breite ?? null, hoehe: m.hoehe ?? null, ton: art === "video", endung });
      S.bytes.set(id, bytes); S.urls.set(id, url); if (m.bild) S.bilder.set(id, m.bild); if (m.ton) S.tonDaten.set(id, m.ton);
      if (art !== "ton" && folgeLeer) F.inFolge(S.p, id);
      if (art === "ton" && tonLeer) { F.tonHinzu(S.p, id, 0); tonLeer = false; }
      merken(vorher);
      gut++;
    } catch (f) { zustand(`${datei.name}: ${f.message}`, true); }
  }
  if (folgeLeer && S.p.format === "16:9") formatVorschlagen();
  alles({ medien: true });
  if (gut) zustand(`${gut} ${gut === 1 ? "Datei" : "Dateien"} geladen. Sie bleiben auf diesem Gerät.`);
}
/** das erste Video im Hochformat: das Format auf 9:16 stellen (einmal, solange der Mensch es nicht gewählt hat) */
function formatVorschlagen() {
  const m = S.p.medien[S.p.folge[0]?.medium];
  if (m?.hoehe > m?.breite * 1.2 && !S.formatGewaehlt) { S.p.format = "9:16"; $("format").value = "9:16"; zustand("Das erste Video ist hochkant: das Format ist 9:16"); }
}

function zeigeMedien() {
  const liste = $("medien");
  liste.replaceChildren(...Object.values(S.p.medien).map((m) => {
    const bild = S.bilder.get(m.id), benutzt = [...S.p.folge, ...S.p.ton].some((c) => c.medium === m.id);
    const info = [{ video: "Video", bild: "Bild", ton: "Ton" }[m.art], m.dauer ? kurzZeit(m.dauer) : null, m.breite ? `${m.breite} × ${m.hoehe}` : null].filter(Boolean).join(" · ");
    return el("li", { class: "medium", dataset: { medium: m.id } },
      el("span", { class: "vorschaubild", style: bild ? { backgroundImage: `url(${bild})` } : {}, text: bild ? "" : m.art === "ton" ? "♪" : "" }),
      el("b", { text: m.name, title: m.name }), el("small", { text: info }),
      el("div", { class: "aktionen" },
        m.art !== "ton" ? el("button", { class: "knopf klein", type: "button", "data-aktion": "folge", onclick: () => aendern(() => { S.auswahl = F.inFolge(S.p, m.id); }, { medien: true }), text: "＋ Folge" }) : null,
        m.art === "ton" || m.art === "video" ? el("button", { class: "knopf klein leise", type: "button", "data-aktion": "ton", onclick: () => aendern(() => { S.auswahl = F.tonHinzu(S.p, m.id, S.t); }, { medien: true }), text: m.art === "video" ? "＋ Ton des Videos" : "＋ Ton" }) : null,
        !benutzt ? el("button", { class: "knopf klein leise", type: "button", onclick: () => aendern(() => { delete S.p.medien[m.id]; }, { medien: true }), text: "entfernen" }) : null));
  }));
}

// ---------- Vorschau ----------
const leinwand = $("bild"), ctx = leinwand.getContext("2d", { alpha: false });
function passeLeinwand() {
  const b = F.FORMATE[S.p.format], s = Math.min(1, 960 / Math.max(b.w, b.h)), w = Math.round(b.w * s), h = Math.round(b.h * s);
  if (leinwand.width !== w || leinwand.height !== h) { leinwand.width = w; leinwand.height = h; $("leinwand").style.aspectRatio = `${b.w} / ${b.h}`; }
}
function zeigeZeit() {
  $("zeit").textContent = `${zeitText(S.t)} / ${zeitText(F.dauer(S.p))}`;
  const k = document.querySelector(".kopf-linie");
  if (k) k.style.left = `${S.t * S.zoom}px`;
}
const filterVon = (id) => S.p.folge.find((c) => c.id === id)?.filter ?? null;
let zeichnung = 0;
/** das Bild beim Abspielkopf zeichnen; im Stand genau gesucht (die Videos warten auf ihr Bild) */
async function zeichneJetzt() {
  const nr = ++zeichnung;
  if (!S.film) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, leinwand.width, leinwand.height); return; }
  const dinge = F.bildBei(S.p, S.film.doc, S.t);
  if (!S.spielt) {
    for (const d of dinge) {
      if (d.art === "video") { const v = Q.video(d.clip.id, d.medium.id); await bereit(v); if (nr !== zeichnung) return; await suchen(v, d.quelle); }
      else if (d.art === "bild") await bereit(Q.bild(d.medium.id));
      if (nr !== zeichnung) return;
    }
  }
  zeichnen(ctx, leinwand.width, leinwand.height, F.FORMATE[S.p.format], dinge, Q, filterVon);
}

/** beim Abspielen die Videos und Töne mitlaufen lassen: Stelle, Tempo, Lautstärke (mit den Blenden) */
function mitlaufen() {
  const doc = S.film.doc, dinge = F.bildBei(S.p, doc, S.t), aktiv = new Set();
  for (const d of dinge) {
    if (d.art !== "video") continue;
    aktiv.add(d.clip.id);
    const v = Q.video(d.clip.id, d.medium.id), tempo = d.clip.speed ?? 1;
    v.muted = !d.medium.ton; v.volume = Math.max(0, Math.min(1, (d.clip.volume ?? 1) * d.deckkraft));
    if (v.playbackRate !== tempo) v.playbackRate = tempo;
    if (v.paused) { v.currentTime = d.quelle; v.play().catch(() => {}); }
    else if (Math.abs(v.currentTime - d.quelle) > 0.25) v.currentTime = d.quelle;
  }
  Q.anhalten(aktiv);
  const tonAktiv = new Set();
  for (const t of S.p.ton) {
    const lokal = S.t - t.at, laenge = t.aus - t.ein;
    if (lokal < 0 || lokal >= laenge) continue;
    tonAktiv.add(t.id);
    let a = toene.get(t.id);
    if (!a || a.dataset.medium !== t.medium) { a?.pause(); a = new Audio(S.urls.get(t.medium)); a.dataset.medium = t.medium; a.preload = "auto"; toene.set(t.id, a); }
    a.volume = Math.max(0, Math.min(1, t.lautstaerke * fadeGain(lokal, laenge, [t.einblenden, t.ausblenden])));
    const ziel = t.ein + lokal;
    if (a.paused) { a.currentTime = ziel; a.play().catch(() => {}); }
    else if (Math.abs(a.currentTime - ziel) > 0.25) a.currentTime = ziel;
  }
  for (const [id, a] of toene) if (!tonAktiv.has(id) && !a.paused) a.pause();
}
let uhr = null;
function spielen() {
  const d = F.dauer(S.p);
  if (!(d > 0) || !S.film) return;
  if (S.t >= d - 1e-3) S.t = 0;
  S.spielt = true; $("spielen").textContent = "Anhalten";
  const t0 = performance.now(), start = S.t;
  const schritt = (jetzt) => {
    if (!S.spielt) return;
    S.t = Math.min(d, start + (jetzt - t0) / 1000);
    mitlaufen(); zeichneJetzt(); zeigeZeit(); folgeKopf();
    if (S.t >= d) { anhalten(); return; }
    uhr = requestAnimationFrame(schritt);
  };
  uhr = requestAnimationFrame(schritt);
}
function anhalten() {
  S.spielt = false; cancelAnimationFrame(uhr); $("spielen").textContent = "Abspielen";
  Q.anhalten(); for (const a of toene.values()) a.pause();
  for (const v of Q.videos.values()) v.muted = true;
  zeichneJetzt();
}
function springe(t) {
  S.t = Math.max(0, Math.min(F.dauer(S.p), t));
  if (S.spielt) { anhalten(); spielen(); } else { zeigeZeit(); zeichneJetzt(); }
}
/** die Zeitleiste dem Abspielkopf nachführen, wenn er aus dem sichtbaren Teil läuft */
function folgeKopf() {
  const l = $("leiste"), x = S.t * S.zoom;
  if (x < l.scrollLeft || x > l.scrollLeft + l.clientWidth - 40) l.scrollLeft = Math.max(0, x - 40);
}

// ---------- Zeitleiste ----------
function verteilen(clips, anfang, ende) {
  const spuren = [];
  for (const c of [...clips].sort((a, b) => anfang(a) - anfang(b))) {
    let s = spuren.find((x) => x.ende <= anfang(c) + 1e-3);
    if (!s) spuren.push((s = { ende: 0, clips: [] }));
    s.clips.push(c); s.ende = ende(c);
  }
  return spuren.map((s) => s.clips);
}
const UE_ZEICHEN = { schnitt: "│", blende: "◇", schwarz: "■", weiss: "□" };
function clipEl({ id, bereich, art, links, breite, text, bild }) {
  return el("div", { class: `clip ${art}${S.auswahl === id ? " gewaehlt" : ""}`, dataset: { id, bereich }, style: { left: `${links}px`, width: `${Math.max(6, breite)}px`, ...(bild ? { backgroundImage: `url(${bild})` } : {}) }, title: text },
    el("span", { class: "griff links", dataset: { seite: "ein" } }), el("span", { class: "beschriftung", text }), el("span", { class: "griff rechts", dataset: { seite: "aus" } }));
}
function zeigeLeiste() {
  const px = S.zoom, ende = Math.max(F.dauer(S.p), 10) + 6, innen = $("leiste-innen");
  innen.style.width = `${ende * px}px`;
  const lineal = el("div", { class: "lineal", id: "lineal" });
  const schritt = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120].find((s) => s * px >= 64) ?? 300;
  for (let t = 0; t <= ende; t += schritt) lineal.append(el("span", { class: "strich", style: { left: `${t * px}px` }, text: kurzZeit(Math.round(t * 100) / 100) }));
  for (const m of S.p.marken ?? []) lineal.append(el("span", { class: "marke", style: { left: `${m * px}px` } }));
  const reihen = [lineal];
  const titel = verteilen(S.p.titel, (t) => t.at, (t) => t.at + t.dauer);
  (titel.length ? titel : [[]]).forEach((spur, i) => reihen.push(el("div", { class: "spur", dataset: { spur: "titel" } }, el("span", { class: "name", text: i ? "" : "Titel" }),
    ...spur.map((t) => clipEl({ id: t.id, bereich: "titel", art: "titel", links: t.at * px, breite: t.dauer * px, text: t.text.split("\n")[0] || "Text" })))));
  const plan = F.zeitplan(S.p).clips, folge = el("div", { class: "spur folge", dataset: { spur: "folge" } }, el("span", { class: "name", text: "Bildfolge" }));
  for (const x of plan) {
    const m = S.p.medien[x.c.medium];
    folge.append(clipEl({ id: x.c.id, bereich: "folge", art: m.art === "bild" ? "bild" : "video", links: x.at * px, breite: x.laenge * px, text: `${(() => { const e = effekteVon(x.c); return e.kenburns !== "aus" || e.wackeln || e.puls || e.glitch || e.korn || e.kratzer || e.licht ? "✦ " : ""; })()}${m.name}${x.c.tempo !== 1 ? ` ×${x.c.tempo}` : ""}`, bild: S.bilder.get(m.id) }));
    const n = plan[x.i + 1];
    if (n) {
      const art = x.c.uebergang?.art ?? "schnitt", stelle = art === "blende" ? (n.at + x.at + x.laenge) / 2 : x.at + x.laenge;
      folge.append(el("button", { class: `uebergang ${art}`, type: "button", style: { left: `${stelle * px}px` }, "aria-pressed": String(S.auswahl === x.c.id && S.uebergangZeigen === true), title: `Übergang: ${F.UEBERGAENGE[art]} (Klick: wählen)`, "aria-label": `Übergang nach ${m.name}: ${F.UEBERGAENGE[art]}`, dataset: { uebergang: x.c.id }, text: UE_ZEICHEN[art] }));
    }
  }
  reihen.push(folge);
  const ton = verteilen(S.p.ton, (t) => t.at, (t) => t.at + t.aus - t.ein);
  (ton.length ? ton : [[]]).forEach((spur, i) => reihen.push(el("div", { class: "spur", dataset: { spur: "ton" } }, el("span", { class: "name", text: i ? "" : "Ton" }),
    ...spur.map((t) => clipEl({ id: t.id, bereich: "ton", art: "ton", links: t.at * px, breite: (t.aus - t.ein) * px, text: `♪ ${S.p.medien[t.medium]?.name ?? ""}` })))));
  reihen.push(el("div", { class: "kopf-linie", style: { left: `${S.t * px}px` } }));
  innen.replaceChildren(...reihen);
}

// Ziehen: ein Clip (verschieben, trimmen) oder der Abspielkopf auf dem Lineal. Der Zeiger wird an der Leiste festgehalten, weil die
// Clips beim Ziehen neu gezeichnet werden.
let Z = null;
const leiste = $("leiste");
function zeitBeiX(x) { const r = $("leiste-innen").getBoundingClientRect(); return Math.max(0, (x - r.left) / S.zoom); }
function rasten(t, ausser) {
  if (!$("einrasten").checked) return { t, gerastet: false };
  const st = F.rastStellen(S.p, { kopf: Z?.art === "kopf" ? null : S.t, marken: S.p.marken ?? [], ausser }), r = F.einrasten(t, st, 9 / S.zoom);
  return { t: r, gerastet: r !== t };
}
function rastLinie(t) {
  document.querySelector(".rast-linie")?.remove();
  if (t !== null) $("leiste-innen").append(el("div", { class: "rast-linie", style: { left: `${t * S.zoom}px` } }));
}
leiste.addEventListener("pointerdown", (e) => {
  if (e.button > 0) return;
  const ue = e.target.closest("[data-uebergang]");
  if (ue) { waehle(ue.dataset.uebergang, { uebergang: true }); return; }
  if (e.target.closest(".lineal")) {
    Z = { art: "kopf" }; leiste.setPointerCapture(e.pointerId);
    springe(rasten(zeitBeiX(e.clientX)).t); e.preventDefault(); return;
  }
  const c = e.target.closest(".clip");
  if (!c) { if (S.auswahl) { S.auswahl = null; zeigeLeiste(); zeigeInspektor(); } return; }
  e.preventDefault();
  const id = c.dataset.id, x = F.finde(S.p, id);
  if (!x) return;
  if (S.auswahl !== id) { S.auswahl = id; S.uebergangZeigen = false; zeigeInspektor(); }
  const plan = F.zeitplan(S.p).clips.find((y) => y.c.id === id);
  Z = { art: "clip", id, bereich: x.bereich, seite: e.target.closest(".griff")?.dataset.seite ?? null, x0: e.clientX, vorher: JSON.stringify(S.p), orig: structuredClone(x.c), at: plan?.at ?? x.c.at, bewegt: false, ziel: null };
  leiste.setPointerCapture(e.pointerId);
  zeigeLeiste();
});
leiste.addEventListener("pointermove", (e) => {
  if (!Z) return;
  if (Z.art === "kopf") { springe(rasten(zeitBeiX(e.clientX)).t); return; }
  const dx = e.clientX - Z.x0;
  if (!Z.bewegt && Math.abs(dx) < 4) return;
  Z.bewegt = true;
  const dt = dx / S.zoom, o = Z.orig, c = F.finde(S.p, Z.id)?.c;
  if (!c) return;
  let linie = null;
  if (Z.bereich === "folge") {
    if (Z.seite === "aus") {
      const ende = Z.at + (o.aus - o.ein) / o.tempo + dt, r = rasten(ende, Z.id);
      F.trimmen(S.p, Z.id, "aus", o.ein + (r.t - Z.at) * o.tempo); if (r.gerastet) linie = r.t;
    } else if (Z.seite === "ein") F.trimmen(S.p, Z.id, "ein", o.ein + dt * o.tempo);
    else {
      // umstellen: wohin der Clip käme, zeigt eine Linie; umgestellt wird beim Loslassen
      const tz = zeitBeiX(e.clientX), andere = F.zeitplan(S.p).clips.filter((y) => y.c.id !== Z.id);
      Z.ziel = andere.filter((y) => y.at + y.laenge / 2 < tz).length;
      const stelle = Z.ziel < andere.length ? andere[Z.ziel].at : (andere.at(-1) ? andere.at(-1).at + andere.at(-1).laenge : 0);
      neuRechnen(); zeigeLeiste();
      const clipDiv = document.querySelector(`.clip[data-id="${Z.id}"]`);
      if (clipDiv) { clipDiv.classList.add("zieht"); clipDiv.style.transform = `translateX(${dx}px)`; }
      $("leiste-innen").append(el("div", { class: "einfuegen", style: { left: `${stelle * S.zoom}px` } }));
      return;
    }
  } else if (Z.seite === null) {
    const laenge = Z.bereich === "ton" ? o.aus - o.ein : o.dauer;
    let at = Math.max(0, o.at + dt);
    const r1 = rasten(at, Z.id), r2 = rasten(at + laenge, Z.id);
    if (r1.gerastet && (!r2.gerastet || Math.abs(r1.t - at) <= Math.abs(r2.t - at - laenge))) { at = r1.t; linie = r1.t; }
    else if (r2.gerastet) { at = r2.t - laenge; linie = r2.t; }
    c.at = Math.round(Math.max(0, at) * 1000) / 1000;
  } else if (Z.bereich === "titel") {
    if (Z.seite === "ein") { const r = rasten(Math.min(o.at + o.dauer - F.KUERZESTE, Math.max(0, o.at + dt)), Z.id); c.at = r.t; c.dauer = Math.round((o.at + o.dauer - r.t) * 1000) / 1000; if (r.gerastet) linie = r.t; }
    else { const r = rasten(o.at + Math.max(F.KUERZESTE, o.dauer + dt), Z.id); c.dauer = Math.round(Math.max(F.KUERZESTE, r.t - o.at) * 1000) / 1000; if (r.gerastet) linie = r.t; }
  } else {
    const m = S.p.medien[c.medium];
    if (Z.seite === "ein") {
      const d = Math.max(-o.ein, -o.at, Math.min(dt, o.aus - o.ein - F.KUERZESTE)), r = rasten(o.at + d, Z.id), d2 = Math.max(-o.ein, -o.at, Math.min(r.t - o.at, o.aus - o.ein - F.KUERZESTE));
      c.at = Math.round((o.at + d2) * 1000) / 1000; c.ein = Math.round((o.ein + d2) * 1000) / 1000; if (r.gerastet) linie = r.t;
    } else {
      const r = rasten(o.at + (o.aus - o.ein) + dt, Z.id);
      c.aus = Math.round(Math.min(m.dauer, Math.max(o.ein + F.KUERZESTE, o.ein + (r.t - o.at))) * 1000) / 1000; if (r.gerastet) linie = r.t;
    }
  }
  neuRechnen(); zeigeLeiste(); rastLinie(linie); zeigeZeit(); zeichneJetzt();
});
function ziehenEnde() {
  if (!Z) return;
  const z = Z; Z = null;
  if (z.art === "clip" && z.bewegt) {
    if (z.bereich === "folge" && z.seite === null && z.ziel !== null) F.verschieben(S.p, z.id, z.ziel);
    merken(z.vorher);
    alles();
  } else rastLinie(null);
}
leiste.addEventListener("pointerup", ziehenEnde);
leiste.addEventListener("pointercancel", ziehenEnde);
leiste.addEventListener("dblclick", (e) => { const c = e.target.closest(".clip"); if (c) springe(F.zeitplan(S.p).clips.find((y) => y.c.id === c.dataset.id)?.at ?? F.finde(S.p, c.dataset.id)?.c.at ?? S.t); });
leiste.addEventListener("wheel", (e) => {
  if (!(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();
  // die Stelle unter dem Zeiger bleibt stehen
  const t = zeitBeiX(e.clientX), versatz = e.clientX - leiste.getBoundingClientRect().left;
  S.zoom = Math.max(8, Math.min(400, S.zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15))); $("zoom").value = S.zoom;
  zeigeLeiste(); leiste.scrollLeft = Math.max(0, t * S.zoom - versatz);
}, { passive: false });

function waehle(id, { uebergang = false } = {}) {
  S.auswahl = id; S.uebergangZeigen = uebergang;
  zeigeLeiste(); zeigeInspektor();
  if (uebergang) document.getElementById("gruppe-uebergang")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
}

function teilenJetzt() {
  let id = S.auswahl;
  const imZiel = (x) => { const f = F.finde(S.p, x); if (!f) return false; if (f.bereich === "folge") { const z = F.zeitplan(S.p).clips.find((y) => y.c.id === x); return S.t > z.at && S.t < z.at + z.laenge; } const l = f.bereich === "ton" ? f.c.aus - f.c.ein : f.c.dauer; return S.t > f.c.at && S.t < f.c.at + l; };
  if (!id || !imZiel(id)) id = F.folgeBei(S.p, S.t)?.c.id ?? null;
  if (!id) { zustand("Am Abspielkopf liegt nichts zum Teilen"); return; }
  const neu = aendern(() => F.teilen(S.p, id, S.t));
  if (neu) { S.auswahl = neu; zeigeLeiste(); zeigeInspektor(); zustand("Geteilt"); } else zustand("Zu nah am Rand des Clips");
}
function loeschenJetzt() {
  if (!S.auswahl) { zustand("Zuerst einen Clip wählen"); return; }
  const id = S.auswahl; S.auswahl = null;
  aendern(() => F.entfernen(S.p, id), { medien: true });
  zustand("Gelöscht; die Lücke in der Bildfolge schliesst sich");
}

// ---------- Eigenschaften ----------
/** ein Regler; wert: Zahl oder Wahl; setze(v) ändert das Projekt. Ein Zug am Regler ist ein Schritt zum Rückgängigmachen. */
function regler(def, wert, setze) {
  let vorher = null;
  const anwenden = (v, fertig) => {
    if (vorher === null) vorher = JSON.stringify(S.p);
    setze(v); neuRechnen(); zeigeLeiste(); zeigeZeit(); zeichneJetzt();
    if (fertig) { merken(vorher); vorher = null; }
  };
  if (def.art === "wahl") {
    return el("label", { class: "regler" }, el("span", { text: def.name }),
      el("select", { "data-feld": def.id, onchange: (e) => anwenden(e.target.value, true) }, ...Object.entries(def.optionen).map(([k, n]) => el("option", { value: k, text: n, selected: String(k) === String(wert) }))));
  }
  if (def.art === "text") {
    return el("label", { class: "regler" }, el("span", { text: def.name }),
      el(def.zeilen ? "textarea" : "input", { type: "text", rows: def.zeilen ?? null, "data-feld": def.id, value: def.zeilen ? null : wert, text: def.zeilen ? wert : null, oninput: (e) => anwenden(e.target.value, false), onchange: (e) => anwenden(e.target.value, true) }));
  }
  if (def.art === "farbe") return el("label", { class: "regler" }, el("span", { text: def.name }), el("input", { type: "color", "data-feld": def.id, value: wert, oninput: (e) => anwenden(e.target.value, false), onchange: (e) => anwenden(e.target.value, true) }));
  if (def.art === "zahl") {
    return el("label", { class: "regler" }, el("span", { text: def.name }),
      el("input", { type: "number", "data-feld": def.id, min: def.min, max: def.max, step: def.schritt ?? 0.01, value: Math.round(wert * 1000) / 1000, onchange: (e) => { const v = Number(e.target.value); if (Number.isFinite(v)) anwenden(Math.min(def.max ?? Infinity, Math.max(def.min ?? -Infinity, v)), true); } }));
  }
  const ausgabe = el("output", { text: def.zeigen ? def.zeigen(wert) : String(Math.round(wert * 100) / 100) });
  return el("label", { class: "regler" }, el("span", { class: "kopfzeile" }, el("span", { text: def.name }), ausgabe),
    el("input", { type: "range", "data-feld": def.id, min: def.min, max: def.max, step: def.schritt ?? 0.01, value: wert,
      oninput: (e) => { const v = Number(e.target.value); ausgabe.textContent = def.zeigen ? def.zeigen(v) : String(Math.round(v * 100) / 100); anwenden(v, false); },
      onchange: (e) => anwenden(Number(e.target.value), true) }));
}
const gruppe = (titel, ...kinder) => el("fieldset", { class: "gruppe" }, el("legend", { text: titel }), ...kinder);
const kopf = (titel, untertitel) => el("div", {}, el("b", { text: titel }), untertitel ? el("p", { class: "hinweis", text: untertitel }) : null);

function zeigeInspektor() {
  const box = $("inspektor"), x = S.auswahl ? F.finde(S.p, S.auswahl) : null;
  if (!x) {
    const d = F.dauer(S.p);
    box.replaceChildren(kopf(S.p.name, `${F.FORMATE[S.p.format].name} · ${zeitText(d)} · ${S.p.folge.length} Clips in der Folge, ${S.p.titel.length} Titel, ${S.p.ton.length} Töne`),
      el("p", { class: "hinweis", text: "Tasten: Leertaste abspielen, S teilen am Abspielkopf, Entf löschen, ← → ein Bild (mit Umschalt: eine Sekunde), Strg+Z rückgängig. Ränder eines Clips ziehen trimmt ihn, die Mitte ziehen stellt ihn um (Folge) oder verschiebt ihn (Titel, Ton). Strg + Mausrad zoomt." }),
      FILTER_DA ? null : el("p", { class: "hinweis", text: "Dieser Browser zeichnet Filter ohne ctx.filter: die Farben stimmen, die Unschärfe fehlt in Vorschau und Export." }));
    return;
  }
  const c = x.c, aenderung = (fn) => (v) => fn(v);
  if (x.bereich === "folge") {
    const m = S.p.medien[c.medium], letzter = S.p.folge.at(-1) === c, w = werteVon(c.filter), ef = effekteVon(c);
    box.replaceChildren(
      kopf(m.name, m.art === "bild" ? "Bild in der Folge" : `Video, ${kurzZeit(m.dauer)} in der Datei`),
      gruppe("Zuschnitt",
        m.art === "bild"
          ? regler({ id: "dauer", name: "Dauer (s)", art: "zahl", min: F.KUERZESTE, max: 600, schritt: 0.1 }, c.aus - c.ein, aenderung((v) => { c.ein = 0; c.aus = Math.round(v * 1000) / 1000; }))
          : el("div", { class: "paar" },
            regler({ id: "ein", name: "Anfang in der Datei (s)", art: "zahl", min: 0, max: m.dauer, schritt: 0.01 }, c.ein, (v) => F.trimmen(S.p, c.id, "ein", v)),
            regler({ id: "aus", name: "Ende in der Datei (s)", art: "zahl", min: 0, max: m.dauer, schritt: 0.01 }, c.aus, (v) => F.trimmen(S.p, c.id, "aus", v))),
        m.art === "video" ? regler({ id: "tempo", name: "Tempo", min: 0.25, max: 4, schritt: 0.05, zeigen: (v) => `×${v}` }, c.tempo, (v) => { c.tempo = v; }) : null,
        m.art === "video" ? regler({ id: "lautstaerke", name: "Lautstärke des Videos", min: 0, max: 1, schritt: 0.01, zeigen: (v) => (v ? `${Math.round(v * 100)} %` : "stumm") }, c.lautstaerke, (v) => { c.lautstaerke = v; }) : null),
      gruppe("Bildausschnitt",
        regler({ id: "passen", name: "Einpassen", art: "wahl", optionen: { fuellen: "füllen (zuschneiden)", einpassen: "ganz zeigen (Ränder)" } }, c.passen, (v) => { c.passen = v; }),
        regler({ id: "zoom", name: "Zoom", min: 1, max: 3, schritt: 0.01, zeigen: (v) => `×${v.toFixed(2)}` }, c.zoom, (v) => { c.zoom = v; }),
        el("div", { class: "paar" },
          regler({ id: "x", name: "waagrecht", min: -0.5, max: 0.5, schritt: 0.005 }, c.x, (v) => { c.x = v; }),
          regler({ id: "y", name: "senkrecht", min: -0.5, max: 0.5, schritt: 0.005 }, c.y, (v) => { c.y = v; }))),
      gruppe("Filter",
        el("div", { class: "vorlagen" }, ...Object.entries(VORLAGEN).map(([k, v]) => el("button", { type: "button", "data-vorlage": k, "aria-pressed": String((c.filter.vorlage ?? "natuerlich") === k), text: v.name,
          onclick: () => aendern(() => { c.filter = { vorlage: k }; }) }))),
        ...REGLER.map((r) => regler({ ...r, name: r.name }, w[r.id], (v) => { c.filter = { ...c.filter, werte: { ...(c.filter.werte ?? {}), [r.id]: v } }; })),
        el("div", { class: "aktionen" }, el("button", { class: "knopf klein leise", type: "button", onclick: () => aendern(() => { c.filter = {}; }), text: "Filter zurücksetzen" }),
          el("button", { class: "knopf klein leise", type: "button", onclick: () => { const f = structuredClone(c.filter); aendern(() => { for (const y of S.p.folge) y.filter = structuredClone(f); }); zustand("Der Filter gilt jetzt für die ganze Folge"); }, text: "für alle Clips" }))),
      gruppe("Effekte",
        el("div", { class: "vorlagen" }, ...Object.entries(EFFEKT_VORLAGEN).map(([k, v]) => el("button", { type: "button", "data-effektvorlage": k, text: v.name,
          onclick: () => aendern(() => { c.effekte = { ...EFFEKT_STANDARD, ...v.werte }; if (v.filter) c.filter = { vorlage: v.filter }; }) }))),
        el("div", { class: "paar" },
          regler({ id: "kenburns", name: "Kamerafahrt", art: "wahl", optionen: KENBURNS }, ef.kenburns, (v) => { c.effekte = { ...ef, kenburns: v }; zeigeInspektor(); }),
          ef.kenburns !== "aus" ? regler({ id: "kbStaerke", name: "Weite", min: 0.03, max: 0.5, schritt: 0.01 }, ef.kbStaerke, (v) => { c.effekte = { ...effekteVon(c), kbStaerke: v }; }) : el("span")),
        ...EFFEKT_REGLER.map((r) => regler({ ...r, zeigen: (v) => (v ? `${Math.round(v * 100)} %` : "aus") }, ef[r.id], (v) => { c.effekte = { ...effekteVon(c), [r.id]: v }; })),
        ef.puls > 0 ? regler({ id: "pulsBpm", name: "Puls: Tempo (BPM; 0 = die Takt-Marken)", art: "zahl", min: 0, max: 300, schritt: 1 }, ef.pulsBpm, (v) => { c.effekte = { ...effekteVon(c), pulsBpm: v }; }) : null,
        ef.puls > 0 && !(S.p.marken?.length) && !ef.pulsBpm ? el("p", { class: "hinweis", text: "Der Puls braucht einen Takt: einen Ton wählen und «Takt als Marken», oder oben ein Tempo eingeben." }) : null,
        el("div", { class: "aktionen" }, el("button", { class: "knopf klein leise", type: "button", onclick: () => { const e = structuredClone(c.effekte); aendern(() => { for (const y of S.p.folge) y.effekte = structuredClone(e); }); zustand("Die Effekte gelten jetzt für die ganze Folge"); }, text: "für alle Clips" }))),
      el("fieldset", { class: "gruppe", id: "gruppe-uebergang" }, el("legend", { text: "Übergang zum nächsten Clip" }),
        letzter ? el("p", { class: "hinweis", text: "Der letzte Clip der Folge: ein Übergang braucht einen nächsten." }) : null,
        regler({ id: "uebergang", name: "Art", art: "wahl", optionen: F.UEBERGAENGE }, c.uebergang.art, (v) => { c.uebergang = { ...c.uebergang, art: v }; zeigeInspektor(); }),
        c.uebergang.art !== "schnitt" ? regler({ id: "uebergangDauer", name: "Dauer (s)", min: 0.1, max: 3, schritt: 0.05, zeigen: (v) => `${v.toFixed(2)} s` }, c.uebergang.dauer, (v) => { c.uebergang = { ...c.uebergang, dauer: v }; }) : null,
        el("div", { class: "aktionen" }, el("button", { class: "knopf klein leise", type: "button", onclick: () => { const u = structuredClone(c.uebergang); aendern(() => { for (const y of S.p.folge) y.uebergang = structuredClone(u); }); zustand(`${F.UEBERGAENGE[u.art]} zwischen allen Clips`); }, text: "zwischen allen Clips" }))),
      el("div", { class: "aktionen" }, el("button", { class: "knopf klein leise", type: "button", onclick: loeschenJetzt, text: "aus der Folge löschen" })));
  } else if (x.bereich === "titel") {
    box.replaceChildren(
      kopf("Titel", "Text über dem Film"),
      gruppe("Vorlagen", el("div", { class: "vorlagen" }, ...Object.entries(TITEL_VORLAGEN).map(([k, v]) => el("button", { type: "button", "data-titelvorlage": k, text: v.name,
        onclick: () => aendern(() => { Object.assign(c, v.werte); }) })))),
      regler({ id: "text", name: "Text (Enter: neue Zeile)", art: "text", zeilen: 3 }, c.text, (v) => { c.text = v; }),
      regler({ id: "unterzeile", name: "Unterzeile", art: "text" }, c.unterzeile, (v) => { c.unterzeile = v; }),
      gruppe("Schrift",
        el("div", { class: "paar" },
          regler({ id: "schrift", name: "Schrift", art: "wahl", optionen: SCHRIFTEN }, c.schrift, (v) => { c.schrift = v; }),
          regler({ id: "gewicht", name: "Stärke", art: "wahl", optionen: { 400: "normal", 600: "kräftig" } }, c.gewicht, (v) => { c.gewicht = Number(v); })),
        regler({ id: "groesse", name: "Grösse", min: 0.02, max: 0.25, schritt: 0.005, zeigen: (v) => `${Math.round(v * 1000) / 10} %` }, c.groesse, (v) => { c.groesse = v; }),
        el("div", { class: "paar" }, regler({ id: "farbe", name: "Farbe", art: "farbe" }, c.farbe, (v) => { c.farbe = v; }),
          regler({ id: "lage", name: "Lage", art: "wahl", optionen: LAGEN }, c.lage, (v) => { c.lage = v; }))),
      gruppe("Hintergrund",
        regler({ id: "band", name: "Hintergrund", art: "wahl", optionen: BAENDER }, c.band, (v) => { c.band = v; zeigeInspektor(); }),
        c.band === "band" || c.band === "voll" ? el("div", { class: "paar" }, regler({ id: "bandFarbe", name: "Farbe", art: "farbe" }, c.bandFarbe, (v) => { c.bandFarbe = v; }),
          regler({ id: "bandDeckkraft", name: "Deckkraft", min: 0, max: 1, schritt: 0.01 }, c.bandDeckkraft, (v) => { c.bandDeckkraft = v; })) : null,
        c.band === "linie" || c.animation === "maske" || c.abgang === "maske" ? regler({ id: "akzent", name: "Akzentfarbe (Linie, Kante)", art: "farbe" }, c.akzent, (v) => { c.akzent = v; }) : null),
      gruppe("Bewegung",
        el("div", { class: "paar" },
          regler({ id: "animation", name: "Auftritt", art: "wahl", optionen: ANIMATIONEN }, c.animation, (v) => { c.animation = v; zeigeInspektor(); }),
          regler({ id: "abgang", name: "Abgang", art: "wahl", optionen: ABGAENGE }, c.abgang, (v) => { c.abgang = v; zeigeInspektor(); })),
        regler({ id: "blende", name: "Ein- und Ausblenden (s)", min: 0, max: 2, schritt: 0.05 }, c.blende, (v) => { c.blende = v; })),
      gruppe("Zeit", el("div", { class: "paar" },
        regler({ id: "at", name: "Beginn (s)", art: "zahl", min: 0, max: 36000, schritt: 0.01 }, c.at, (v) => { c.at = Math.round(v * 1000) / 1000; }),
        regler({ id: "dauer", name: "Dauer (s)", art: "zahl", min: F.KUERZESTE, max: 600, schritt: 0.1 }, c.dauer, (v) => { c.dauer = Math.round(v * 1000) / 1000; })),
        el("div", { class: "aktionen" }, el("button", { class: "knopf klein leise", type: "button", onclick: () => aendern(() => { c.at = Math.round(S.t * 1000) / 1000; }), text: "an den Abspielkopf" }))),
      el("div", { class: "aktionen" }, el("button", { class: "knopf klein leise", type: "button", onclick: loeschenJetzt, text: "Titel löschen" })));
  } else {
    const m = S.p.medien[c.medium];
    box.replaceChildren(
      kopf(m?.name ?? "Ton", m?.art === "video" ? "der Ton eines Videos, unter dem Film" : "Ton unter dem Film"),
      gruppe("Zeit",
        el("div", { class: "paar" }, regler({ id: "at", name: "Beginn im Film (s)", art: "zahl", min: 0, max: 36000, schritt: 0.01 }, c.at, (v) => { c.at = Math.round(v * 1000) / 1000; }),
          el("span")),
        el("div", { class: "paar" },
          regler({ id: "ein", name: "Anfang in der Datei (s)", art: "zahl", min: 0, max: m.dauer, schritt: 0.01 }, c.ein, (v) => F.trimmen(S.p, c.id, "ein", v)),
          regler({ id: "aus", name: "Ende in der Datei (s)", art: "zahl", min: 0, max: m.dauer, schritt: 0.01 }, c.aus, (v) => F.trimmen(S.p, c.id, "aus", v)))),
      gruppe("Lautstärke",
        regler({ id: "lautstaerke", name: "Lautstärke", min: 0, max: 1, schritt: 0.01, zeigen: (v) => `${Math.round(v * 100)} %` }, c.lautstaerke, (v) => { c.lautstaerke = v; }),
        el("div", { class: "paar" },
          regler({ id: "einblenden", name: "Einblenden (s)", min: 0, max: 8, schritt: 0.1 }, c.einblenden, (v) => { c.einblenden = v; }),
          regler({ id: "ausblenden", name: "Ausblenden (s)", min: 0, max: 8, schritt: 0.1 }, c.ausblenden, (v) => { c.ausblenden = v; }))),
      el("div", { class: "aktionen" },
        el("button", { class: "knopf klein", type: "button", onclick: taktAlsMarken, text: "Takt als Marken" }),
        el("button", { class: "knopf klein leise", type: "button", onclick: loeschenJetzt, text: "Ton löschen" })),
      el("p", { class: "hinweis", text: "«Takt als Marken» findet die Schläge dieses Tons. Ränder und Schnitte rasten dann im Takt ein (gelbe Marken auf dem Lineal)." }));
  }
}

async function taktAlsMarken() {
  const x = S.auswahl && F.finde(S.p, S.auswahl);
  const t = x?.bereich === "ton" ? x.c : S.p.ton[0];
  if (!t) { zustand("Zuerst einen Ton unter den Film legen", true); return; }
  zustand("Die Schläge werden gesucht …");
  let d = S.tonDaten.get(t.medium);
  if (!d) { d = await tonDekodieren(S.bytes.get(t.medium)); if (d) S.tonDaten.set(t.medium, d); }
  if (!d) { zustand("Der Ton lässt sich in diesem Browser nicht lesen", true); return; }
  const marken = taktMarken({ at: t.at, von: t.ein, bis: t.aus, tempo: 1, laenge: t.aus - t.ein }, d);
  aendern(() => { S.p.marken = marken; }, { inspektor: false });
  zustand(`${marken.length} Marken im Takt von ${S.p.medien[t.medium].name}. Schnitte und Ränder rasten dort ein, und der Zoom-Puls schlägt auf ihnen.`);
}

// ---------- Projekt ----------
function verwerfen() {
  anhalten(); Q.schliessen(); for (const a of toene.values()) a.pause(); toene.clear();
  for (const u of S.urls.values()) URL.revokeObjectURL(u);
  S.urls = new Map(); S.bytes = new Map(); S.bilder = new Map(); S.tonDaten = new Map();
  Q = new Quellen(S.urls, { stumm: true });
}
function neuesProjekt() {
  if (S.geaendert && !confirm("Das Projekt ist nicht gespeichert. Trotzdem neu anfangen?")) return;
  verwerfen();
  Object.assign(S, { p: F.neuesProjekt({ format: $("format").value }), auswahl: null, t: 0, zurueck: [], vor: [], geaendert: false });
  $("name").value = S.p.name;
  alles({ medien: true }); zustand("Ein neues Projekt");
}
function herunterladen(blob, name) {
  const a = el("a", { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
}
const dateiname = () => (S.p.name || "Film").replace(/[\\/:*?"<>|]+/g, "-").trim() || "Film";
async function speichern() {
  if (!neuRechnen()) return;
  zustand("Das Projekt wird gepackt …");
  const blob = await projektPacken(S.p, S.bytes, { melden: (a) => zustand(`Das Projekt wird gepackt … ${Math.round(a * 100)} %`) });
  herunterladen(blob, `${dateiname()}${ENDUNG}`);
  S.geaendert = false;
  zustand(`Gespeichert: ${dateiname()}${ENDUNG} (${Math.round(blob.size / 1e5) / 10} MB). Ausgepackt ist es ein OpenFilm-Film: film.html, titel/, assets/.`);
}
async function oeffnen(datei) {
  if (S.geaendert && !confirm("Das Projekt ist nicht gespeichert. Trotzdem ein anderes öffnen?")) return;
  try {
    zustand(`${datei.name} wird gelesen …`);
    const bytes = await dateiLesen(datei, { melden: (t) => zustand(t) });
    const r = await projektEntpacken(bytes);
    verwerfen();
    Object.assign(S, { p: r.projekt, auswahl: null, t: 0, zurueck: [], vor: [], geaendert: false });
    for (const [id, b] of r.bytes) {
      const m = S.p.medien[id], endung = m.datei.split(".").pop();
      S.bytes.set(id, b); S.urls.set(id, URL.createObjectURL(new Blob([b], { type: MIME[endung] ?? "application/octet-stream" })));
    }
    $("name").value = S.p.name; $("format").value = S.p.format; S.formatGewaehlt = true;
    alles({ medien: true });
    zustand(r.fehlt.length ? `Geöffnet; es fehlen: ${r.fehlt.join(", ")}` : `${datei.name} geöffnet`, r.fehlt.length > 0);
    for (const m of Object.values(S.p.medien)) {   // die Vorschaubilder nach und nach
      if (!S.urls.has(m.id) || m.art === "ton") continue;
      try { const x = await metadaten(m.art, S.urls.get(m.id), S.bytes.get(m.id)); if (x.bild) S.bilder.set(m.id, x.bild); } catch { /* ohne Bild */ }
    }
    zeigeMedien(); zeigeLeiste();
  } catch (f) { zustand(`Öffnen: ${f.message}`, true); }
}

// ---------- Export ----------
let exportAbbruch = null;
function exportOeffnen() {
  anhalten();
  if (!neuRechnen()) return;
  $("qualitaet").replaceChildren(...Object.entries(QUALITAETEN).map(([k, q]) => el("option", { value: k, text: q.name })));
  const d = F.dauer(S.p), b = F.FORMATE[S.p.format];
  $("export-hinweis").textContent = exportMoeglich()
    ? `${zeitText(d)}, ${b.w} × ${b.h}. Jedes Bild wird genau gesucht und gezeichnet; das dauert je nach Gerät etwa so lange wie der Film oder länger. Das MP4 lässt sich im Lab mit «Video wählen» als Material laden.`
    : "Dieser Browser kann kein MP4 kodieren (WebCodecs fehlt). Chrome oder Edge können es; das Projekt lässt sich speichern und dort öffnen.";
  $("export-start").disabled = !exportMoeglich() || !(d > 0);
  $("export-ergebnis").hidden = true; $("export-fortschritt").hidden = true;
  $("export").showModal();
}
async function exportStarten() {
  const knopf = $("export-start"), fort = $("export-fortschritt");
  knopf.disabled = true; $("export-abbrechen").hidden = false; fort.hidden = false; fort.value = 0;
  exportAbbruch = new AbortController();
  try {
    const r = await exportieren({ projekt: S.p, doc: S.film.doc, urls: S.urls, bytes: S.bytes, qualitaet: $("qualitaet").value, fps: Number($("fps").value),
      melden: (text, anteil) => { $("export-hinweis").textContent = text; if (anteil !== undefined) fort.value = anteil; }, abbrechen: exportAbbruch.signal });
    const url = URL.createObjectURL(r.blob), name = `${dateiname()}.mp4`;
    fort.value = 1;
    $("export-hinweis").textContent = `Fertig: ${zeitText(r.sekunden)}, ${r.breite} × ${r.hoehe}, ${r.bilder} Bilder, ${r.codec}${r.ton ? `, Ton ${r.ton}` : ", ohne Ton"}, ${Math.round(r.blob.size / 1e5) / 10} MB.`;
    $("export-ergebnis").replaceChildren(el("video", { src: url, controls: true, playsinline: true }),
      el("div", { class: "aktionen" }, el("a", { class: "knopf voll", href: url, download: name, text: `${name} speichern` }), el("small", { class: "hinweis", text: "Im Lab: «Video wählen» lädt es als Material." })));
    $("export-ergebnis").hidden = false;
    zustand(`MP4 gerechnet: ${name}`);
  } catch (f) {
    $("export-hinweis").textContent = f.name === "AbortError" ? "Abgebrochen." : `Der Export ist misslungen: ${f.message}`;
  } finally { knopf.disabled = false; $("export-abbrechen").hidden = true; exportAbbruch = null; }
}

// ---------- Verdrahten ----------
$("format").replaceChildren(...Object.entries(F.FORMATE).map(([k, f]) => el("option", { value: k, text: f.name })));
$("format").addEventListener("change", (e) => { S.formatGewaehlt = true; aendern(() => { S.p.format = e.target.value; }); });
$("name").addEventListener("change", (e) => aendern(() => { S.p.name = e.target.value.trim() || "Film"; }, { inspektor: !S.auswahl }));
for (const id of ["dateien", "dateien-leer"]) $(id).addEventListener("change", (e) => { dateienAufnehmen(e.target.files); e.target.value = ""; });
$("oeffnen").addEventListener("change", (e) => { if (e.target.files[0]) oeffnen(e.target.files[0]); e.target.value = ""; });
$("neu").addEventListener("click", neuesProjekt);
$("speichern").addEventListener("click", () => speichern().catch((f) => zustand(`Speichern: ${f.message}`, true)));
$("titel-neu").addEventListener("click", () => aendern(() => { S.auswahl = F.titelHinzu(S.p, { at: S.t, dauer: 3, text: S.p.titel.length ? "Text" : S.p.name }); }));
$("spielen").addEventListener("click", () => (S.spielt ? anhalten() : spielen()));
$("anfang").addEventListener("click", () => springe(0));
$("zurueck").addEventListener("click", () => springe(Math.round(S.t * FPS - 1) / FPS));
$("vor").addEventListener("click", () => springe(Math.round(S.t * FPS + 1) / FPS));
$("rueck").addEventListener("click", rueckgaengig);
$("wieder").addEventListener("click", wiederholen);
$("teilen").addEventListener("click", teilenJetzt);
$("loeschen").addEventListener("click", loeschenJetzt);
$("takt").addEventListener("click", taktAlsMarken);
$("zoom").addEventListener("input", (e) => { const mitte = (leiste.scrollLeft + leiste.clientWidth / 2) / S.zoom; S.zoom = Number(e.target.value); zeigeLeiste(); leiste.scrollLeft = Math.max(0, mitte * S.zoom - leiste.clientWidth / 2); });
$("export-oeffnen").addEventListener("click", exportOeffnen);
$("export-start").addEventListener("click", exportStarten);
$("export-abbrechen").addEventListener("click", () => exportAbbruch?.abort());
$("export").addEventListener("close", () => exportAbbruch?.abort());
for (const ziel of [$("ablage"), $("leiste")]) {
  ziel.addEventListener("dragover", (e) => { if (e.dataTransfer?.types?.includes("Files")) { e.preventDefault(); $("ablage").classList.add("ziehen"); } });
  ziel.addEventListener("dragleave", () => $("ablage").classList.remove("ziehen"));
  ziel.addEventListener("drop", (e) => { e.preventDefault(); $("ablage").classList.remove("ziehen"); if (e.dataTransfer.files.length) dateienAufnehmen(e.dataTransfer.files); });
}
document.addEventListener("keydown", (e) => {
  // in Textfeldern und Auswahllisten gelten die Tasten dem Feld; auf Schaltern, Knöpfen und Reglern gelten die Kürzel, nur Leertaste und
  // Pfeile behalten dort ihre eigene Bedeutung
  const z = e.target, art = z.tagName === "INPUT" ? z.type : null;
  if (z.closest?.("textarea, select, dialog[open], [contenteditable]") || (art && !["checkbox", "radio", "range", "button"].includes(art))) return;
  if ((e.key === " " && (art || z.tagName === "BUTTON" || z.closest?.("label"))) || (art === "range" && e.key.startsWith("Arrow"))) return;
  const strg = e.ctrlKey || e.metaKey;
  if (strg && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? wiederholen() : rueckgaengig(); return; }
  if (strg && e.key.toLowerCase() === "y") { e.preventDefault(); wiederholen(); return; }
  if (strg && e.key.toLowerCase() === "s") { e.preventDefault(); speichern().catch((f) => zustand(f.message, true)); return; }
  if (strg) return;
  if (e.key === " ") { e.preventDefault(); S.spielt ? anhalten() : spielen(); }
  else if (e.key === "s" || e.key === "S") teilenJetzt();
  else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); loeschenJetzt(); }
  else if (e.key === "ArrowLeft") { e.preventDefault(); springe(e.shiftKey ? S.t - 1 : Math.round(S.t * FPS - 1) / FPS); }
  else if (e.key === "ArrowRight") { e.preventDefault(); springe(e.shiftKey ? S.t + 1 : Math.round(S.t * FPS + 1) / FPS); }
  else if (e.key === "Home") springe(0);
  else if (e.key === "End") springe(F.dauer(S.p));
  else if (e.key === "Escape" && S.auswahl) { S.auswahl = null; zeigeLeiste(); zeigeInspektor(); }
});
window.addEventListener("beforeunload", (e) => { if (S.geaendert && Object.keys(S.p.medien).length) { e.preventDefault(); e.returnValue = ""; } });

schriftenLaden?.()?.then?.(() => zeichneJetzt()).catch?.(() => {});
alles({ medien: true });
zustand("Bereit. Videos, Bilder und Töne laden; sie bleiben auf diesem Gerät.");
// für die Browsertests (tests/lab-video.e2e.mjs)
window.ornamentVideo = { S, F, get Q() { return Q; }, dateienAufnehmen, teilenJetzt, loeschenJetzt, rueckgaengig, wiederholen, speichern, oeffnen, spielen, anhalten, springe, alles, aendern };
