// Multiverse – die Seite (8. November 2026): neun Pixel-Schalter, vier Felder mit je einer Anwendung im eigenen Rahmen (iframe: Skripte und Stile
// stören sich nicht). Höchstens vier laufen; die Regel steht in anwendungen.js (umschalten); freie Felder verschwinden, die übrigen teilen sich den Platz. Ein Wechsel lädt nur das eine Feld neu; die neue Anwendung
// erscheint in einem Kreis, der vom Schalter aus wächst (kreisWechsel aus assets/pixel-schalter.js). Wahl und Anordnung bleiben im Browser.
import { pixelSchalter, kreisWechsel } from "../assets/pixel-schalter.js?v=1";
import { ANWENDUNGEN, PLAETZE, umschalten, zustandAus } from "./anwendungen.js?v=2";

const SCHLUESSEL = "multiverse";
const html = document.documentElement;
const $ = (id) => document.getElementById(id);
const lesen = () => { try { return JSON.parse(localStorage.getItem(SCHLUESSEL) || "null"); } catch { return null; } };
const merken = (v) => { try { localStorage.setItem(SCHLUESSEL, JSON.stringify(v)); } catch { /* privat */ } };
const nach = Object.fromEntries(ANWENDUNGEN.map((a) => [a.id, a]));
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

const gemerkt = lesen();
let Z = zustandAus(gemerkt);
let anordnung = gemerkt?.anordnung === "spalten" ? "spalten" : "raster";
const sichern = () => merken({ ...Z, anordnung });

// ——— das Signet (die Re-entry-Schlaufe des Neubaus, wie tools/build-b.mjs) im Kopf und im Intro ———
(function signet() {
  const p = Array.from({ length: 121 }, (_, i) => { const t = (i / 120) * Math.PI * 2, r = .45 + Math.cos(t); return [1.2 * r * Math.cos(t), 1.2 * r * Math.sin(t)]; });
  const xs = p.map((q) => q[0]), ys = p.map((q) => q[1]);
  const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2, sp = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const X = (x) => (17 + ((x - mx) / sp) * 22).toFixed(2), Y = (y) => (12 + ((y - my) / sp) * 22).toFixed(2);
  const d = p.map(([x, y], i) => `${i ? "L" : "M"}${X(x)} ${Y(y)}`).join("") + "Z";
  for (const svg of document.querySelectorAll(".signet, .intro-signet")) {
    svg.querySelector("path").setAttribute("d", d);
    const c = svg.querySelector("circle"); c.setAttribute("cx", X(p[50][0])); c.setAttribute("cy", Y(p[50][1]));
  }
})();

// ——— Intro ———
(function intro() {
  const el = $("intro");
  if (!html.classList.contains("mit-intro")) { el.remove(); return; }
  try { sessionStorage.setItem("multiverse-intro", "1"); } catch { /* egal */ }
  let fertig = false;
  const ende = () => {
    if (fertig) return; fertig = true;
    el.classList.add("weg");
    removeEventListener("keydown", ende);
    setTimeout(() => { html.classList.remove("mit-intro"); el.remove(); }, 750);
  };
  el.querySelector(".intro-weiter").addEventListener("click", ende);
  el.addEventListener("pointerdown", ende);
  addEventListener("keydown", ende);
  setTimeout(ende, 3400);
})();

// ——— Schalter ———
const knoepfe = {};
for (const a of ANWENDUNGEN) {
  const li = document.createElement("li");
  li.style.setProperty("--farbe", a.farbe);
  const [r, g, b] = rgb(a.farbe);
  const knopf = pixelSchalter({
    klasse: "schalter", aus: a.aus, an: a.an, anfang: Z.plaetze.includes(a.id), label: a.name,
    titel: (an) => (an ? `${a.name} ausschalten` : `${a.name} einschalten`),
    farbe: (k) => [118 + (r - 118) * k, 118 + (g - 118) * k, 126 + (b - 126) * k],
    schein: (k) => [`rgba(${r}, ${g}, ${b}, ${.6 * k})`, k],
  });
  knopf.id = `schalter-${a.id}`;
  const name = document.createElement("label");
  name.htmlFor = knopf.id; name.textContent = a.name;
  li.append(knopf, name);
  li.classList.toggle("an", knopf.an);
  $("schalter").append(li);
  knoepfe[a.id] = knopf;
  knopf.addEventListener("click", () => wechseln(a.id));
}

// ——— Felder ———
const SYMBOL = {
  gross: '<svg viewBox="0 0 16 16"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/></svg>',
  allein: '<svg viewBox="0 0 16 16"><path d="M9 2.5h4.5V7M13.5 2.5 7.5 8.5M11.5 9.5v4h-9v-9h4"/></svg>',
};
const felder = [];
for (let i = 0; i < PLAETZE; i++) {
  const f = document.createElement("section");
  f.className = "feld";
  f.innerHTML = `<header class="feld-kopf"><span class="punkt" aria-hidden="true"></span><h2></h2><p></p><span class="naechste" hidden>geht als nächste</span>
    <div class="feld-knoepfe"><button type="button" class="gross" title="Vollbild" aria-label="Vollbild">${SYMBOL.gross}</button>
    <a class="allein" target="_blank" rel="noopener" title="Allein öffnen, in einem neuen Fenster" aria-label="Allein öffnen, in einem neuen Fenster">${SYMBOL.allein}</a></div></header>
    <div class="feld-innen"><div class="platzhalter" aria-hidden="true"><b></b><span>wird geladen</span></div></div>`;
  f.querySelector(".gross").addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else (f.requestFullscreen || f.webkitRequestFullscreen)?.call(f).catch?.(() => {});
  });
  if (!(document.fullscreenEnabled || document.webkitFullscreenEnabled)) f.querySelector(".gross").hidden = true;
  $("felder").append(f);
  felder.push(f);
}

/** ein Feld mit einer Anwendung belegen: neuer Rahmen (der alte geht samt seinen Skripten), Kopf und Platzhalter in ihrer Farbe; null: Feld frei */
function belegen(i, id) {
  const f = felder[i], a = nach[id];
  f.querySelector("iframe")?.remove();
  f.hidden = !a;
  if (!a) { f.dataset.id = ""; return; }
  f.dataset.id = id;
  f.style.setProperty("--farbe", a.farbe);
  f.setAttribute("aria-label", a.name);
  f.querySelector("h2").textContent = a.name;
  f.querySelector(".feld-kopf p").textContent = a.satz;
  f.querySelector(".platzhalter b").textContent = a.name;
  f.querySelector(".allein").href = a.allein;
  f.classList.remove("geladen");
  const rahmen = document.createElement("iframe");
  rahmen.title = a.name;
  rahmen.allow = "fullscreen; autoplay; clipboard-write; microphone; camera; geolocation; web-share";
  rahmen.addEventListener("load", () => {
    // kompakt: Titelkopf und Navigation der Anwendung weg, die Bedienung zuoberst (anwendungen.js)
    if (a.kompakt) try { const d = rahmen.contentDocument, st = d.createElement("style"); st.textContent = a.kompakt; d.head.append(st); } catch { /* fremder Ursprung: so wie sie ist */ }
    f.classList.add("geladen");
  }, { once: true });
  rahmen.src = a.adresse;
  f.querySelector(".feld-innen").append(rahmen);
}

/** «geht als nächste»: die am längsten laufende, wenn alle vier Felder belegt sind; dazu die Anordnung nach der Zahl der laufenden */
function markieren() {
  const n = Z.reihe.length, sichtbar = felder.filter((f) => !f.hidden);
  for (const f of felder) f.querySelector(".naechste").hidden = n < PLAETZE || f.dataset.id !== Z.reihe[0];
  // drei in 2 × 2: das letzte Feld nimmt die ganze Breite
  for (const f of felder) f.classList.toggle("breit", n === 3 && f === sichtbar.at(-1));
  $("felder").dataset.anzahl = n;
  $("felder").style.setProperty("--n", Math.max(1, n));
  $("leer").hidden = n > 0;
}

let beschaeftigt = false;
async function wechseln(id) {
  if (beschaeftigt) return;
  const { zustand, platz, raus, rein } = umschalten(Z, id);
  if (platz < 0) return;
  beschaeftigt = true;
  Z = zustand; sichern();
  if (raus) { knoepfe[raus].setzen(false); knoepfe[raus].parentElement.classList.remove("an"); }
  if (rein) { knoepfe[rein].setzen(true); knoepfe[rein].parentElement.classList.add("an"); }
  const f = felder[platz], aendern = () => { belegen(platz, rein); markieren(); };
  // ausschalten: das Feld geht, die Seite ordnet sich im Kreis vom Schalter aus neu
  if (!rein) { await kreisWechsel(knoepfe[id], aendern, { dauer: 680 }); beschaeftigt = false; return; }
  // auf dem Telefon liegt das Feld vielleicht ausserhalb: erst hinschauen, dann wächst der Kreis
  const r = f.getBoundingClientRect();
  if (!f.hidden && (r.bottom < 60 || r.top > innerHeight - 60)) { f.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" }); await new Promise((ok) => setTimeout(ok, 420)); }
  await kreisWechsel(knoepfe[id], aendern, { ziel: f, name: "mv-feld", dauer: 680 });
  beschaeftigt = false;
}

// ——— Anordnung: 2 × 2 oder vier Spalten (nur am breiten Bildschirm) ———
function anordnen(neu) {
  anordnung = neu;
  $("felder").dataset.anordnung = neu;
  for (const b of document.querySelectorAll("[data-anordnung]")) if (b.tagName === "BUTTON") b.setAttribute("aria-pressed", String(b.dataset.anordnung === neu));
}
for (const b of document.querySelectorAll("button[data-anordnung]")) b.addEventListener("click", () => { anordnen(b.dataset.anordnung); sichern(); });

// die Höhe von Kopf und Leiste, damit zwei Reihen Felder genau in den Bildschirm passen
new ResizeObserver(() => html.style.setProperty("--leiste", `${document.querySelector(".leiste").offsetHeight}px`)).observe(document.querySelector(".leiste"));

anordnen(anordnung);
Z.plaetze.forEach((id, i) => belegen(i, id));
markieren();
sichern();
