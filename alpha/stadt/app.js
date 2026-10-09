// «Die Paradoxie der Stadt» – Bedienung: Uhr, Begleiten, Verändern (mit Vorschau), Sichtweisen, Protokoll, Vergleiche, Modell.
// Die Simulation (modell.js) läuft mit festem Schritt; die Bildrate bestimmt nur, wie viele Schritte je Bild gerechnet werden.
import * as M from "./modell.js?v=2";
import { zeichne, farben, positionVon } from "./ansicht.js?v=2";
import { nebeneinanderNacheinander, verteilapparat, befragungAuswertung, SCHWELLEN } from "./raster.js?v=2";
import { VERBINDUNG, BANK } from "./stadtplan.js?v=2";
import * as F from "./fragen.js?v=2";

const $ = (s, w = document) => w.querySelector(s);
const $$ = (s, w = document) => [...w.querySelectorAll(s)];
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const params = new URLSearchParams(location.search);
const DEBUG = params.has("debug");
const WENIGER_BEWEGUNG = matchMedia("(prefers-reduced-motion: reduce)").matches;
const TEMPI = [{ n: "1 Min/s", s: 60 }, { n: "5 Min/s", s: 300 }, { n: "30 Min/s", s: 1800 }];
const SICHTEN = {
  fluss: { name: "Verkehrsfluss", instrument: "Verkehrszählung und Fahrzeitmessung an der Hauptstrasse und der Nordstrasse (Kamera, zählt Fahrzeuge).", fehlt: "Fusswege, Warten am Strassenrand, wer nicht fährt." },
  erreichbarkeit: { name: "Erreichbarkeit", instrument: "Modellblick: alle geplanten Wege der Figuren mit Ausgang. Dazu die freiwillige Kurzbefragung (nur Antwortende).", fehlt: "In einer realen Stadt gäbe es diese vollständige Liste nicht; wer verzichtet, erscheint nirgends." },
  aufenthalt: { name: "Aufenthalt und Begegnung", instrument: "Aufenthaltsminuten an Orten (Zählung: wer länger bleibt). Gespräche sind Modellereignisse, keine Messung.", fehlt: "Ob eine Begegnung jemandem etwas bedeutet; wer gar nicht hinkommt." },
  belastung: { name: "Belastung einzelner", instrument: "Modellblick: Umwege und Wartezeiten jeder Figur, einzeln.", fehlt: "Wie sich das anfühlt. Zahlen über Umwege sind keine Aussage über Erleben." },
};

const ui = {
  stadt: null, laeuft: !WENIGER_BEWEGUNG, tempo: 0, folge: null, sicht: "fluss", vorschau: null, tab: "begleiten",
  k: 1, ox: 0, oy: 0, zoom: 1, gewicht: { reise: 1, erreich: 1, aufenthalt: 1, belastung: 1 }, vergleich: null, rechnet: false,
  zuletzt: 0, rest: 0, gemeldet: 0, protokollGesehen: 0, letzteMeldung: 0, panelOffen: false,
};
let tabelle = null, tabelleFehler = null;

// ---------- Start ----------
async function start() {
  try { tabelle = (await import("./jev.js?v=2")).JEV; if (!M.tabelleGueltig(tabelle)) { tabelleFehler = "Prüfsumme passt nicht zu den Fragen"; tabelle = null; } }
  catch (e) { tabelleFehler = "jev-Tabelle nicht geladen"; tabelle = null; }
  await new Promise((r) => setTimeout(r, 30));    // erst die Seite zeigen, dann die Stadt anlegen (Vorlauf rund eine Sekunde)
  neuerLauf();
  baueBedienung();
  groesse();
  addEventListener("resize", groesse);
  requestAnimationFrame(bild);
  setInterval(panelAktualisieren, 700);
  $("#stadt").classList.add("bereit");
  if (DEBUG) window.stadtTest = { M, ui, get stadt() { return ui.stadt; }, schritte: (n) => M.laufe(ui.stadt, n) };
}
function figurenZahl() {
  const p = parseInt(params.get("figuren"), 10);
  if (p >= 8 && p <= 80) return p;
  const schwach = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 2;
  return schwach ? 40 : 72;
}
function neuerLauf(latent = ui.stadt?.z.params.latent ?? "mittel") {
  const seed = parseInt(params.get("seed"), 10) || 7;
  ui.stadt = M.neueStadt({ seed, figuren: figurenZahl(), latent, tabelle });
  ui.vergleich = null; ui.protokollGesehen = 0;
  if (ui.folge !== null && ui.folge >= ui.stadt.z.figuren.length) ui.folge = null;
}

// ---------- Zeit und Bild ----------
function bild(jetzt) {
  const dt = Math.min(0.25, (jetzt - (ui.zuletzt || jetzt)) / 1000);
  ui.zuletzt = jetzt;
  if (ui.laeuft && !ui.rechnet) {
    ui.rest += dt * TEMPI[ui.tempo].s;
    let n = Math.floor(ui.rest); ui.rest -= n;
    n = Math.min(n, 2400);
    for (let i = 0; i < n; i++) M.schritt(ui.stadt);
  }
  const c = $("#karte");
  const ctx = c.getContext("2d");
  zeichne(ctx, ui.stadt, { k: ui.k, ox: ui.ox, oy: ui.oy, folge: ui.folge, sicht: ui.tab === "sichten" ? ui.sicht : null, vorschau: ui.vorschau, farben: ui.farben, dpr: ui.dpr });
  uhrAnzeigen();
  requestAnimationFrame(bild);
}
function groesse() {
  const c = $("#karte"), box = c.parentElement.getBoundingClientRect();
  ui.dpr = Math.min(2, devicePixelRatio || 1);
  c.width = Math.round(box.width * ui.dpr); c.height = Math.round(box.height * ui.dpr);
  ui.farben = farben(c);
  passeAusschnitt();
}
/** Massstab: die ganze Stadthöhe passt hinein; ist die Fläche schmaler als die Stadt, wird um die Hauptstrasse herum verschoben */
function passeAusschnitt(mitte = null) {
  const c = $("#karte");
  // quer: die ganze Stadt passt hinein; hochkant (Handy): die Höhe füllt die Fläche, seitlich wird mit dem Finger verschoben
  const grund = c.height > c.width ? c.height / 420 : Math.min(c.width / 600, c.height / 420);
  ui.k = grund * ui.zoom;
  const sichtB = c.width / ui.k, sichtH = c.height / ui.k;
  // ohne Vorgabe bleibt die Mitte, wo sie war; am Anfang die Kreuzung beim Laden
  const mx = mitte?.x ?? (ui.sichtB === undefined ? 300 : ui.ox + ui.sichtB / 2), my = mitte?.y ?? (ui.sichtH === undefined ? 210 : ui.oy + ui.sichtH / 2);
  ui.ox = sichtB >= 600 ? (600 - sichtB) / 2 : Math.max(0, Math.min(600 - sichtB, mx - sichtB / 2));
  ui.oy = sichtH >= 420 ? (420 - sichtH) / 2 : Math.max(0, Math.min(420 - sichtH, my - sichtH / 2));
  ui.sichtB = sichtB; ui.sichtH = sichtH;
}
function uhrAnzeigen() {
  const z = ui.stadt.z;
  const t = `Tag ${z.tag} · ${M.uhr(z.t)}`;
  const el = $("#uhr"); if (el.textContent !== t) el.textContent = t;
}

// ---------- Bedienung bauen ----------
function baueBedienung() {
  $("#lauf").addEventListener("click", () => setzeLauf(!ui.laeuft));
  $$("[data-tempo]").forEach((b) => b.addEventListener("click", () => { ui.tempo = +b.dataset.tempo; tempoKnoepfe(); if (!ui.laeuft) setzeLauf(true); }));
  $("#neustart").addEventListener("click", () => {
    melde("Die Stadt wird neu angelegt …");
    setTimeout(() => { neuerLauf(); melde("Lauf zurückgesetzt: dieselbe Ausgangslage, derselbe Startwert. Alle Erinnerungen sind gelöscht."); panelAktualisieren(true); }, 30);
  });
  $("#vollbild").addEventListener("click", () => vollbild(!ui.vollbild));
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && ui.vollbild && ui.echtesVollbild) vollbild(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && ui.vollbild && !document.fullscreenElement) vollbild(false); });
  if (params.has("vollbild")) vollbild(true);
  $("#zoom-plus").addEventListener("click", () => zoomen(1.4));
  $("#zoom-minus").addEventListener("click", () => zoomen(1 / 1.4));
  setzeLauf(ui.laeuft); tempoKnoepfe();
  if (WENIGER_BEWEGUNG) melde("Weniger Bewegung ist eingestellt: Die Stadt steht still, bis du sie startest.");
  // Einstieg
  $("#einstieg-umsehen").addEventListener("click", () => schliesseEinstieg());
  $("#einstieg-begleiten").addEventListener("click", () => { schliesseEinstieg(); folgeJemandem(); zeigeTab("begleiten"); });
  $("#einstieg-veraendern").addEventListener("click", () => { schliesseEinstieg(); zeigeTab("veraendern"); });
  $("#einstieg-impuls").addEventListener("click", () => { schliesseEinstieg(); impuls(); });
  // Tabs
  $$("[role=tab]").forEach((t) => {
    t.addEventListener("click", () => zeigeTab(t.dataset.tab));
    t.addEventListener("keydown", (e) => { const l = $$("[role=tab]"), i = l.indexOf(t); if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); const n = l[(i + (e.key === "ArrowRight" ? 1 : l.length - 1)) % l.length]; n.focus(); zeigeTab(n.dataset.tab); } });
  });
  $("#panel-griff").addEventListener("click", () => panel(!ui.panelOffen));
  // Karte: Antippen wählt eine Figur oder einen Ort, Ziehen verschiebt
  const c = $("#karte");
  let druck = null;
  c.addEventListener("pointerdown", (e) => { druck = { x: e.clientX, y: e.clientY, ox: ui.ox, oy: ui.oy, bewegt: false }; c.setPointerCapture(e.pointerId); });
  c.addEventListener("pointermove", (e) => {
    if (!druck) return;
    const dx = e.clientX - druck.x, dy = e.clientY - druck.y;
    if (Math.hypot(dx, dy) > 6) druck.bewegt = true;
    if (druck.bewegt && (ui.sichtB < 600 || ui.sichtH < 420)) { ui.ox = Math.max(0, Math.min(600 - ui.sichtB, druck.ox - (dx * ui.dpr) / ui.k)); ui.oy = Math.max(0, Math.min(420 - ui.sichtH, druck.oy - (dy * ui.dpr) / ui.k)); if (ui.sichtB >= 600) ui.ox = (600 - ui.sichtB) / 2; if (ui.sichtH >= 420) ui.oy = (420 - ui.sichtH) / 2; }
  });
  c.addEventListener("pointerup", (e) => { if (druck && !druck.bewegt) antippen(e); druck = null; });
  c.addEventListener("pointercancel", () => (druck = null));
  // Veränderungen, Sichtweisen, Vergleiche: Ereignisse an den Panels
  $("#panel").addEventListener("click", panelKlick);
  $("#panel").addEventListener("change", panelWechsel);
  $("#panel").addEventListener("input", panelEingabe);
  for (const ev of ["pointerover", "focusin"]) $("#panel").addEventListener(ev, (e) => { const el = e.target.closest("[data-vorschau]"); if (el) ui.vorschau = JSON.parse(el.dataset.vorschau); });
  for (const ev of ["pointerout", "focusout"]) $("#panel").addEventListener(ev, (e) => { if (e.target.closest("[data-vorschau]")) ui.vorschau = null; });
  zeigeTab("begleiten", null, false);   // auf dem Handy bleibt das Panel beim Laden zu, sonst verdeckt es den Einstieg
}
/** Vollbild: die Fullscreen-Schnittstelle, wo der Browser sie für ein Element erlaubt; sonst füllt die Stadt das Fenster (gleiche Gestaltung, Klasse «vollbild») */
function vollbild(an) {
  const el = $("#stadt");
  ui.vollbild = an;
  el.classList.toggle("vollbild", an);
  document.documentElement.classList.toggle("stadt-vollbild", an);
  const b = $("#vollbild"); b.setAttribute("aria-pressed", String(an)); b.textContent = an ? "Vollbild beenden" : "Vollbild";
  if (an && el.requestFullscreen && !document.fullscreenElement) { ui.echtesVollbild = true; el.requestFullscreen().catch(() => (ui.echtesVollbild = false)); }
  if (!an && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  if (!an) ui.echtesVollbild = false;
  requestAnimationFrame(() => { groesse(); requestAnimationFrame(groesse); });
}
function setzeLauf(an) { ui.laeuft = an; const b = $("#lauf"); b.setAttribute("aria-pressed", String(an)); b.textContent = an ? "Pause" : "Start"; }
function tempoKnoepfe() { $$("[data-tempo]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.tempo === ui.tempo))); }
function zoomen(f) { const mitte = { x: ui.ox + ui.sichtB / 2, y: ui.oy + ui.sichtH / 2 }; ui.zoom = Math.max(1, Math.min(4, ui.zoom * f)); passeAusschnitt(mitte); }
function schliesseEinstieg() { $("#einstieg").hidden = true; }
function panel(offen) {
  ui.panelOffen = offen; $("#panel").classList.toggle("offen", offen); $("#panel-griff").setAttribute("aria-expanded", String(offen));
  // Handy: die Karte nach oben holen, damit sie über dem aufgeklappten Panel sichtbar bleibt
  if (offen && !ui.vollbild && matchMedia("(max-width: 900px)").matches) $(".karte-box").scrollIntoView({ block: "start", behavior: WENIGER_BEWEGUNG ? "auto" : "smooth" });
}
function melde(t) { const el = $("#meldung"); el.textContent = t; ui.letzteMeldung = performance.now(); }

function antippen(e) {
  const c = $("#karte"), r = c.getBoundingClientRect();
  const wx = ui.ox + ((e.clientX - r.left) * ui.dpr) / ui.k, wy = ui.oy + ((e.clientY - r.top) * ui.dpr) / ui.k;
  let best = null, bd = (14 * ui.dpr) / ui.k;
  for (const f of ui.stadt.z.figuren) { if (f.zustand === "heim" || f.zustand === "weg" || f.zustand === "drinnen") continue; const d = Math.hypot(f.x - wx, f.y - wy); if (d < bd) { bd = d; best = f; } }
  if (best) { ui.folge = best.id; zeigeTab("begleiten"); return; }
  // Orte: Eingriffe direkt am betroffenen Ort
  if (wy > 192 && wy < 228) return zeigeTab("veraendern", wx > 270 && wx < 330 ? "abschnitt-b" : "abschnitt-a");
  if (Math.abs(wx - 150) < 14 && wy > 236 && wy < 326) return zeigeTab("veraendern", "abschnitt-klein");
  if (wx > 310 && wx < 450 && wy > 78 && wy < 178) return zeigeTab("veraendern", "abschnitt-d");
  for (const b of Object.values(BANK)) if (Math.hypot(b.x - wx, b.y - wy) < 10) return zeigeTab("veraendern", "abschnitt-klein");
}
function folgeJemandem() {
  const z = ui.stadt.z;
  const unterwegs = z.figuren.filter((f) => f.zustand === "geht");
  const f = unterwegs.find((x) => x.mobil !== "gehend") ?? unterwegs[0] ?? z.figuren[0];
  ui.folge = f.id;
  const p = positionVon(f); passeAusschnitt(p);
}
function impuls() {
  ui.zoom = Math.max(ui.zoom, 1.4); passeAusschnitt({ x: 300, y: 210 });
  zeigeTab("veraendern", "abschnitt-a");
  ui.vorschau = ["spur", true];
  const b = $('[data-massnahme="spur"]'); if (b) { b.focus(); b.classList.add("hervor"); setTimeout(() => b.classList.remove("hervor"), 2600); }
}

// ---------- Tabs und Panels ----------
function zeigeTab(tab, anker = null, oeffnen = true) {
  ui.tab = tab;
  $$("[role=tab]").forEach((t) => { const an = t.dataset.tab === tab; t.setAttribute("aria-selected", String(an)); t.tabIndex = an ? 0 : -1; });
  $$("[role=tabpanel]").forEach((p) => (p.hidden = p.id !== `tab-${tab}`));
  panelAktualisieren(true);
  if (oeffnen && matchMedia("(max-width: 900px)").matches) panel(true);
  if (anker) { const el = document.getElementById(anker); el?.scrollIntoView({ block: "start", behavior: WENIGER_BEWEGUNG ? "auto" : "smooth" }); el?.querySelector("button, select, input")?.focus({ preventScroll: true }); }
}
function panelAktualisieren(sofort = false) {
  if (!ui.stadt) return;
  neueEreignisse();
  lagezeile();
  const p = $(`#tab-${ui.tab}`);
  if (!p) return;
  // nicht neu zeichnen, während jemand im Panel etwas bedient (Fokus in einem Eingabefeld)
  if (!sofort && p.contains(document.activeElement) && /SELECT|INPUT/.test(document.activeElement.tagName)) return;
  const html = { begleiten: begleitenHtml, veraendern: veraendernHtml, sichten: sichtenHtml, protokoll: protokollHtml, vergleichen: vergleichenHtml, modell: modellHtml }[ui.tab]();
  if (p.dataset.html === html) return;
  const offen = $$("details[open]", p).map((d) => d.dataset.id).filter(Boolean);
  const fokus = document.activeElement && p.contains(document.activeElement) ? fokusSchluessel(document.activeElement) : null;
  const scroll = $("#panel-inhalt").scrollTop;
  p.innerHTML = html; p.dataset.html = html;
  for (const id of offen) { const d = $(`details[data-id="${id}"]`, p); if (d) d.open = true; }
  if (fokus) $(fokus, p)?.focus({ preventScroll: true });
  $("#panel-inhalt").scrollTop = scroll;
}
const fokusSchluessel = (el) => (el.id ? `#${el.id}` : el.dataset.massnahme ? `[data-massnahme="${el.dataset.massnahme}"][data-wert="${el.dataset.wert ?? ""}"]` : el.dataset.aktion ? `[data-aktion="${el.dataset.aktion}"]` : null);
function neueEreignisse() {
  const z = ui.stadt.z;
  const neu = z.protokoll.filter((e) => e.id > ui.protokollGesehen);
  if (!neu.length) return;
  ui.protokollGesehen = neu.at(-1).id;
  const wichtig = neu.filter((e) => ["entstehung", "rueckkehr", "beobachtung", "teilnahme"].includes(e.art)).at(-1);
  if (wichtig && performance.now() - ui.letzteMeldung > 3000) melde(wichtig.text);
  const zahl = $("#protokoll-neu"); if (zahl && ui.tab !== "protokoll") { zahl.textContent = String((+zahl.textContent || 0) + neu.length); zahl.hidden = false; }
}

/** eine Zeile Text zum Zustand der Stadt (auch für Vorlesegeräte, ohne Ansage bei jeder Änderung) */
function lagezeile() {
  const z = ui.stadt.z;
  const geht = z.figuren.filter((f) => f.zustand === "geht").length, warten = z.figuren.filter((f) => f.zustand === "geht" && f.wartetSeit !== null).length;
  const bleibt = z.figuren.filter((f) => f.zustand === "verweilt" || f.zustand === "pause").length;
  const h = z.autos.filter((a) => a.k === "H" && !a.bus).length, n = z.autos.filter((a) => a.k === "N").length;
  const p = z.passanten.length;
  const t = `${geht} Bewohner:innen unterwegs, davon ${warten} wartend · ${bleibt} verweilen · ${p} Passant:innen · ${h} Autos auf der Hauptstrasse, ${n} auf der Nordstrasse · ${ui.laeuft ? "läuft" : "angehalten"}`;
  const el = $("#lagezeile"); if (el.textContent !== t) el.textContent = t;
}

// ---------- Begleiten ----------
const ZUSTAND = (z, f) => {
  const a = f.aufgabe;
  const ziel = a ? M.ORTE[a.ziel]?.name ?? a.ziel : null;
  if (f.zustand === "heim") return "zu Hause";
  if (f.zustand === "weg") return "mit dem Bus unterwegs, ausserhalb des Quartiers";
  if (f.zustand === "wartet_bus") return `wartet an der Haltestelle (seit ${Math.round((z.t - f.wartetSeit) / 60)} min)`;
  if (f.zustand === "drinnen") return `im ${M.ORTE[f.ort]?.name ?? "Gebäude"}`;
  if (f.zustand === "verweilt") return `verweilt: ${M.ORTE[f.ort]?.name ?? f.ort}`;
  if (f.zustand === "pause") return "macht eine Pause auf einer Bank";
  if (f.wartetSeit !== null) return `wartet seit ${Math.round(z.t - f.wartetSeit)} s ${f.pfad && M.KANTE[f.pfad.kanten[f.pi]]?.art === "ampel" ? "an der Ampel" : "an der Strasse"}${ziel ? ` (unterwegs zum ${ziel})` : ""}`;
  const statt = a && a.ziel !== a.a.ort && M.ORTE[a.a.ort] ? ` (statt zum ${M.ORTE[a.a.ort].name})` : "";
  return f.heimweg ? "auf dem Heimweg" : ziel ? `unterwegs zum ${ziel}${statt}` : "unterwegs";
};
const STATUS = { offen: "offen", unterwegs: "unterwegs", erledigt: "erledigt", aufgegeben: "aufgegeben", verschoben: "verschoben" };
const ART = { arbeit: "Arbeit (Bus)", einkauf: "Einkauf im Laden", besorgung: "Besorgung am Kiosk", bringen: "Kind zur Schule bringen", abholen: "Kind abholen", hund: "Runde mit dem Hund", freizeit: "Freizeit", atelier: "Offener Abend" };
const WAHL = { eben: "ebenerdige Querung", bruecke: "Brücke", frei: "zwischen den Autos", ersatz: "Ersatzziel", auslassen: "auslassen", gleich: "ohne Querung" };
function begleitenHtml() {
  const z = ui.stadt.z;
  const liste = z.figuren.map((f) => `<option value="${f.id}"${f.id === ui.folge ? " selected" : ""}>${esc(f.name)}${M.beschreibe(f).length ? " – " + esc(M.beschreibe(f)[0]) : ""}</option>`).join("");
  let h = `<p class="leitfrage">Wähle eine Person oder tippe sie auf der Karte an.</p>
    <div class="zeile"><label for="wer" class="nur-lesen">Person</label><select id="wer" data-aktion="folge"><option value="">– niemand –</option>${liste}</select>
    <button type="button" class="knopf klein" data-aktion="jemand">Jemand unterwegs</button></div>`;
  if (ui.folge === null) return h + `<p class="leise">Jede Figur hat eigene Wege, ein Tagesprogramm, begrenzte Zeit und Kraft und eine kleine Erinnerung an das, was sie erlebt hat.</p>`;
  const f = z.figuren[ui.folge];
  h += `<section class="karte-person"><h3>${esc(f.name)}</h3>
    <p class="merkmale">${M.beschreibe(f).map(esc).join(" · ") || "ohne besondere Angaben"}${f.eilig ? " · hat heute wenig Zeit" : ""}</p>
    <p class="jetzt"><strong>Jetzt:</strong> ${esc(ZUSTAND(z, f))}</p>
    <h4>Heute</h4><ul class="programm">${f.programm.map((p) => `<li><span>${ART[p.art]}</span> <span class="leise">${p.abend && p.status === "offen" ? "entscheidet um 16.30" : STATUS[p.status]}</span></li>`).join("") || "<li>nichts geplant</li>"}</ul>`;
  const e = f.entscheid;
  if (e && e.lage) {
    const rang = Object.entries(e.p).sort((a, b) => b[1] - a[1]);
    h += `<details data-id="entscheid"><summary>Wie zuletzt über die Hauptstrasse entschieden wurde</summary>
      <p class="leise">Tag ${e.tag}, ${M.uhr(e.t)}, ${e.heimweg ? "Heimweg" : `Weg zum ${esc(M.ORTE[e.ziel]?.name ?? e.ziel)}`}. Als ${esc(F.PERSONEN[e.person])}.</p>
      <ul class="balken">${rang.map(([k, p]) => `<li${k === e.wahl ? ' class="gewaehlt"' : ""}><span>${WAHL[k] ?? k}</span><span class="b" style="--w:${Math.round(p * 100)}%"></span><span>${Math.round(p * 100)} %</span></li>`).join("")}</ul>
      <p class="leise">${e.gewohnheit ? "Gewählt aus Gewohnheit, ohne neu abzuwägen. " : ""}${e.irrtum ? "Die Figur ging dabei von einer Strasse aus, die es so nicht mehr gibt. " : ""}Wahrscheinlichkeiten: ${e.quelle === "jev" ? "jev-Tabelle (beim Bauen eingeschätzt)" : "Ersatzregeln"}. Gezogen wird mit dem Startwert, nicht immer das Wahrscheinlichste.</p></details>`;
  }
  const wege = [...f.wege].reverse().slice(0, 8);
  h += `<h4>Wege</h4>${wege.length ? `<table class="tab"><thead><tr><th>Tag</th><th>Ziel</th><th>Ausgang</th><th>Dauer</th><th>Warten</th></tr></thead><tbody>${wege.map((w) => `<tr><td>${w.tag || "Vorlauf"}</td><td>${esc(M.ORTE[w.ziel]?.name ?? w.ziel)}</td><td>${w.status}${w.wahl && WAHL[w.wahl] && w.wahl !== "gleich" ? ` <span class="leise">(${WAHL[w.wahl]})</span>` : ""}</td><td>${w.status === "aufgegeben" ? "–" : M.dauerText(w.dauer)}</td><td>${Math.round(w.warten)} s</td></tr>`).join("")}</tbody></table>` : `<p class="leise">Noch keine Wege.</p>`}
    <h4>Erinnert sich an</h4><ul class="erlebt">${[...f.erlebt].reverse().slice(0, 6).map((x) => `<li><span class="leise">${x.tag ? `Tag ${x.tag}` : "Vortag"}, ${M.uhr(x.t)}</span> ${esc(x.text)}</li>`).join("") || "<li class='leise'>noch nichts</li>"}</ul>
    <p class="leise">${Object.values(f.bekannt).filter((n) => n >= 2).length} Bekanntschaften · Abkürzungen: ${[f.kennt.durchgang && "Durchgang", f.kennt.trampel && "Trampelpfad"].filter(Boolean).join(", ") || "keine"} · feste Gewohnheiten: ${Object.entries(f.gewohnheit).filter(([, g]) => g.staerke >= 0.4).map(([k, g]) => `${M.ORTE[k]?.name ?? k} → ${WAHL[g.wahl] ?? g.wahl}`).join(", ") || "keine"}</p></section>`;
  h += verteilapparatHtml(z, f);
  return h;
}
function verteilapparatHtml(z, f) {
  const v = verteilapparat(z, f, ui.sicht);
  const STAT = { passiert: "passiert", blockiert: "blockiert", umgeleitet: "umgeleitet", offen: "offen", nicht_anwendbar: "nicht anwendbar" };
  return `<details class="genauer" data-id="verteilapparat"><summary>Genauer hinsehen: Der Verteilapparat des Körpers</summary>
    ${!v.vorgang ? `<p class="leise">Noch kein Weg, an dem sich das prüfen liesse.</p>` : `
    <p><strong>Vorgang:</strong> ${esc(v.vorgang)}</p>
    <dl class="fragen">
      <dt>Was erlebt die Figur im Modell?</dt><dd>${v.erleben.map(esc).join("<br>")}</dd>
      <dt>Was sagt oder signalisiert sie davon?</dt><dd>${esc(v.selbstbeschreibung)}</dd>
      <dt>Was erfassen andere?</dt><dd>${esc(v.fremderfassung)}</dd>
      <dt>Unter welcher Beschreibung wird reagiert? (Sichtweise «${SICHTEN[ui.sicht].name}»)</dt><dd>${esc(v.beschreibung)}</dd>
      <dt>Welche Folgen entstehen, und kann sie widersprechen?</dt><dd>${esc(v.folgen)} ${esc(v.widerspruch)}</dd>
    </dl>
    <table class="tab schwellen"><caption>Sieben Schwellen, je Anschlussweg (keine Kette, keine Punkte)</caption><thead><tr><th>Schwelle</th><th>Selbstbeschreibung</th><th>Fremderfassung</th></tr></thead><tbody>
    ${SCHWELLEN.map((s) => `<tr><th>${s}</th><td><span class="st st-${v.schwellen[s].selbst.status}">${STAT[v.schwellen[s].selbst.status]}</span> ${esc(v.schwellen[s].selbst.befund)}</td><td><span class="st st-${v.schwellen[s].fremd.status}">${STAT[v.schwellen[s].fremd.status]}</span> ${esc(v.schwellen[s].fremd.befund)}</td></tr>`).join("")}
    </tbody></table>
    <p class="leise">Modellfall. Erleben, Selbstbeschreibung, Fremderfassung und Entscheidung sind hier getrennt; keine Pflicht zur Auskunft, geringe Sichtbarkeit gilt nicht automatisch als Nachteil. Raster: Christian Strickler, «Der Verteilapparat des Körpers».</p>`}
  </details>`;
}

// ---------- Verändern ----------
const aktiv = (z, k) => { const [a, b] = k.split("."); return b ? z.m[a][b] !== M.MASSNAHMEN_START[a][b] : z.m[a] !== M.MASSNAHMEN_START[a]; };
function schalter(z, k, titel, text) {
  const an = z.m[k];
  return `<button type="button" class="schalter" data-massnahme="${k}" data-wert="${!an}" aria-pressed="${an}" data-vorschau='${JSON.stringify([k, true])}'><b>${titel}</b><span>${text}</span></button>`;
}
function wahlListe(z, k, optionen, name) {
  return `<fieldset class="wahl"><legend>${name}</legend>${optionen.map(([w, t, s]) => `<label data-vorschau='${JSON.stringify([k, w])}'><input type="radio" name="${k}" value="${w}" data-massnahme="${k}" data-wert="${w}"${z.m[k] === w ? " checked" : ""}> <span><b>${t}</b>${s ? `<small>${s}</small>` : ""}</span></label>`).join("")}</fieldset>`;
}
function veraendernHtml() {
  const z = ui.stadt.z;
  const aktive = ["spur", "bus", "querung", "ruhe", "verbindung", "bank", "durchgang", "zwischennutzung", ...Object.keys(z.m.atelier).map((k) => "atelier." + k)].filter((k) => aktiv(z, k));
  const abend = z.messung.heute.atelier ?? z.messung.tage.at(-1)?.atelier;
  const a = z.m.atelier;
  const auswahl = (k, opts) => `<label class="feld"><span>${{ gebuehr: "Gebühr", anmeldung: "Anmeldung", einladung: "Einladung", beginn: "Zeit", rolle: "Rollen", programm: "Programm" }[k]}</span><select data-massnahme="atelier.${k}" data-vorschau='${JSON.stringify(["atelier." + k, true])}'>${Object.entries(opts).map(([w, t]) => `<option value="${w}"${a[k] === w ? " selected" : ""}>${t}</option>`).join("")}</select></label>`;
  return `
  ${aktive.length ? `<section class="aktiv"><h3>Was gerade gilt</h3><ul>${aktive.map((k) => `<li><span>${esc(M.massnahmeText(k, k.includes(".") ? z.m.atelier[k.split(".")[1]] : z.m[k]))}</span> <button type="button" class="knopf klein" data-aktion="zurueck" data-schluessel="${k}">Nur Massnahme zurücknehmen</button></li>`).join("")}</ul>
    <p class="leise">«Zurücknehmen» stellt die Strasse wieder her. Was die Figuren seither erlebt, gelernt und sich angewöhnt haben, bleibt. «Lauf zurücksetzen» oben löscht alles.</p></section>` : ""}
  <section id="abschnitt-a"><h3>A · Mehr Weg, mehr Verkehr?</h3>
    <p class="leitfrage">Welche Nachfrage verändert der Weg, den du gerade geschaffen hast?</p>
    <div class="schalter-reihe">
      ${schalter(z, "spur", "Zusätzliche Fahrspur", "je Richtung eine zweite Spur; der Baumstreifen fällt weg, die Ampel gibt Autos länger Grün")}
      ${schalter(z, "bus", "Bus öfter", "alle 7½ statt alle 15 Minuten")}
      ${schalter(z, "querung", "Zusätzliche Querung", "Zebrastreifen beim Westweg; Autos halten, wenn jemand quert")}
      ${schalter(z, "ruhe", "Tempo 30, weniger Autoverkehr", "kürzere Ampel, Pförtnerampel an den Rändern")}
    </div>
    <p class="leise">Fahrten von aussen entscheiden nach der Fahrzeit, die sie aus den Vortagen kennen, und nach der aktuellen Lage. Regionale Nachfrage in diesem Lauf: <b>${z.params.latent}</b> (Modellannahme, unter «Modell» änderbar).</p>
  </section>
  <section id="abschnitt-b"><h3>B · Verbindung für wen?</h3>
    <p class="leitfrage">Was verbindet diese Verbindung – und welche Wege unterbricht sie?</p>
    ${wahlListe(z, "verbindung", Object.entries(VERBINDUNG).map(([k, v]) => [k, v.name, { heute: "ebenerdig, kurze Wege", zaun: "kein Queren zwischen den Autos mehr", ampel_schnell: "Tempo 60, Zaun, Ampel mit längerem Autogrün", bruecke_treppe: "Tempo 60, Zaun, keine Ampel; Brücke mit Treppen bei der Haltestelle", bruecke_rampe: "Tempo 60, Zaun, keine Ampel; Rampen bis zur Bushaltestelle (je 110 m)" }[k]]), "Querung bei Laden und Haltestelle")}
    <p class="leise">Begleite jemanden mit Rollstuhl, Kinderwagen oder Pausenbedarf vor und nach dem Wechsel.</p>
  </section>
  <section id="abschnitt-klein"><h3>Kleine Voraussetzungen</h3>
    ${wahlListe(z, "bank", Object.entries(BANK).map(([k, b]) => [k, `Bank ${b.name}`, null]), "Eine Bank versetzen")}
    <div class="schalter-reihe">
      ${schalter(z, "durchgang", "Durchgang öffnen", "durch den Hof im Süden; wer ihn sieht, kann ihn lernen")}
      ${schalter(z, "zwischennutzung", "Zwischennutzung zulassen", "leeres Ladenlokal an der Hauptstrasse, Nordseite")}
    </div>
    <p class="leise">Es gibt keinen Knopf «Gemeinschaft erzeugen». Was daraus wird, zeigt erst der weitere Verlauf.</p>
  </section>
  <section id="abschnitt-d"><h3>D · Angekommen, aber unter welchen Bedingungen?</h3>
    <p class="leitfrage">Darf diese Person hier nur mitmachen – oder auch mitbestimmen, wie?</p>
    <div class="felder">${auswahl("gebuehr", M.ATELIER_TEXT.gebuehr)}${auswahl("anmeldung", M.ATELIER_TEXT.anmeldung)}${auswahl("einladung", M.ATELIER_TEXT.einladung)}${auswahl("beginn", M.ATELIER_TEXT.beginn)}${auswahl("rolle", M.ATELIER_TEXT.rolle)}${auswahl("programm", M.ATELIER_TEXT.programm)}</div>
    ${abend ? `<p><b>${abend === z.messung.heute.atelier ? "Heute" : "Letzter Abend"}:</b> ${abend.erreicht} erreicht · ${abend.anwesend} anwesend · ${abend.beteiligt} beteiligt · ${abend.mitbestimmend} mitbestimmend${abend.zuSpaet ? ` · ${abend.zuSpaet} zu spät` : ""}</p>
    <table class="tab"><thead><tr><th>Lage</th><th>gefragt</th><th>geht</th><th>verhindert</th><th>anderes vor</th></tr></thead><tbody>${Object.entries(abend.nachLage).map(([l, n]) => `<tr><td>${esc(F.LAGEN[l].replace(/^eine Person, die |^eine Person mit /, ""))}</td><td>${n.gefragt}</td><td>${n.geht}</td><td>${n.verhindert}</td><td>${n.anderes}</td></tr>`).join("")}</tbody></table>` : `<p class="leise">Um 16.30 Uhr entscheiden die Interessierten, ob sie hingehen.</p>`}
    <p class="leise">Erreicht, anwesend, beteiligt und mitbestimmend sind verschiedene Zustände; wer nicht hingeht, kann das auch freiwillig tun. Einladungen durch Bekannte entstehen aus Begegnungen – und binden an die einladende Person. Die Bedingungen gehören zur Einrichtung, nicht zu den Menschen.</p>
  </section>`;
}

// ---------- Sichtweisen (Kapitel C) ----------
function sichtenHtml() {
  const z = ui.stadt.z, s = SICHTEN[ui.sicht];
  const k = M.kennzahlen(z, Math.max(1, z.tag));
  const g = z.messung.tage.at(-1);
  let daten = "";
  if (ui.sicht === "fluss") {
    const v = k.reiseVerteilung;
    daten = `<p>Heute bisher: <b>${k.autosH}</b> Autos über die Hauptstrasse${g ? ` (gestern ${g.autos.H})` : ""}, <b>${k.autosN}</b> durch die Nordstrasse${g ? ` (gestern ${g.autos.N})` : ""}. Mittlere Fahrt ${k.reiseH ? M.dauerText(k.reiseH) : "–"}.</p>
      ${histogramm(v, "Fahrzeiten heute (Klassen zu 30 s)")}${verlaufTage(z, (t) => t.autos.H, "Autos je Tag, Hauptstrasse")}${verlaufTage(z, (t) => t.autos.N, "Autos je Tag, Nordstrasse")}`;
  } else if (ui.sicht === "erreichbarkeit") {
    const typ = k.nachTyp;
    daten = `<p>Wege heute: <b>${k.erreicht}</b> erreicht, <b>${k.ersetzt}</b> ans Ersatzziel, <b>${k.aufgegeben}</b> aufgegeben.</p>
      <table class="tab"><thead><tr><th>unterwegs</th><th>erreicht</th><th>Ersatz</th><th>aufgegeben</th></tr></thead><tbody>${Object.entries(typ).map(([t, n]) => `<tr><td>${{ gehend: "zu Fuss", pause: "mit Pausenbedarf", rollstuhl: "mit Rollstuhl", kinderwagen: "mit Kinderwagen" }[t]}</td><td>${n.erreicht}</td><td>${n.ersetzt}</td><td>${n.aufgegeben}</td></tr>`).join("")}</tbody></table>
      ${befragungHtml(z)}
      <p class="leise">Ein Weg, der nicht gemacht wird, heisst nicht: kein Bedarf.</p>`;
  } else if (ui.sicht === "aufenthalt") {
    const a = z.messung.heute.aufenthalt, b = z.messung.heute.begegnungen;
    const orte = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    daten = `<table class="tab"><thead><tr><th>Ort</th><th>Aufenthalt</th><th>Gespräche</th><th>flüchtig</th><th>gestört</th></tr></thead><tbody>${orte.map((o) => `<tr><td>${esc(M.ORTE[o]?.name ?? (o === "bank" ? "versetzte Bank" : o))}</td><td>${Math.round(a[o] ?? 0)} min</td><td>${b[o]?.gespraech ?? 0}</td><td>${b[o]?.fluechtig ?? 0}</td><td>${b[o]?.stoerung ?? 0}</td></tr>`).join("") || "<tr><td colspan=5>noch nichts heute</td></tr>"}</tbody></table>
      <p class="leise">Begegnungen sind Modellereignisse: nicht jede wird ein Gespräch, manche stören. Gespräche an einem Ort machen das Verweilen dort wahrscheinlicher, Lärm wirkt dagegen.</p>`;
  } else {
    const l = k.belastung.map((b) => ({ ...b, f: z.figuren[b.id], last: b.umweg / 1.2 + b.warten })).sort((a, b) => b.last - a.last);
    const max = Math.max(1, ...l.map((x) => x.last));
    daten = `<p>Mittlere Wartezeit an Querungen heute: ${k.wartenMittel !== null ? M.dauerText(k.wartenMittel) : "–"}, längste: ${k.wartenMax !== null ? M.dauerText(k.wartenMax) : "–"}.</p>
      <ul class="balken einzel">${l.slice(0, 12).map((x) => `<li><button type="button" class="link" data-aktion="folge-id" data-id="${x.id}">${esc(x.f.name)}</button><span class="b" style="--w:${Math.round((x.last / max) * 100)}%"></span><span>${x.umweg} m · ${Math.round(x.warten)} s${x.aufgegeben ? ` · ${x.aufgegeben}× verzichtet` : ""}</span></li>`).join("")}</ul>
      <p class="leise">Einzelne statt Mittelwert: Ein Mittel kann sinken, während einzelne ihr Ziel seltener erreichen.</p>`;
  }
  return `<p class="leitfrage">Was lässt diese Darstellung erkennen – und was braucht eine andere Frage?</p>
    <fieldset class="wahl kompakt"><legend>Sichtweise</legend>${Object.entries(SICHTEN).map(([k2, v]) => `<label><input type="radio" name="sicht" value="${k2}" data-aktion="sicht"${k2 === ui.sicht ? " checked" : ""}> ${v.name}</label>`).join("")}</fieldset>
    <p class="instrument"><b>Was hier misst:</b> ${esc(s.instrument)}<br><b>Was hier fehlt:</b> ${esc(s.fehlt)}</p>
    ${daten}
    <details data-id="gewichtung"><summary>Gewichtung wählen (eine Wertung, kein Befund)</summary>
      <p class="leise">Die Gewichte ändern nur die Bewertung im Vergleich, nie die Stadt.</p>
      ${[["reise", "kurze Autofahrten"], ["erreich", "Ziele zu Fuss erreichen"], ["aufenthalt", "Aufenthalt und Gespräche"], ["belastung", "wenig Umweg und Warten für einzelne"]].map(([k2, t]) => `<label class="regler"><span>${t}</span><input type="range" min="0" max="3" step="1" value="${ui.gewicht[k2]}" data-aktion="gewicht" data-g="${k2}" aria-valuetext="${ui.gewicht[k2]} von 3"><output>${ui.gewicht[k2]}</output></label>`).join("")}
      ${ui.vergleich?.fertig ? empfehlungHtml(ui.vergleich) : `<p class="leise">Eine Empfehlung entsteht erst aus einem Vergleich (Reiter «Vergleichen»).</p>`}
    </details>`;
}
function befragungHtml(z) {
  const l = befragungAuswertung(z, "laden"), h = befragungAuswertung(z, "haustuer");
  const zeile = (b) => Object.entries(b.kategorien).filter(([, n]) => n).map(([k, n]) => `${n}× ${k}`).join(", ") || "noch keine";
  return `<div class="befragung"><h4>Kurzbefragung (freiwillig)</h4>
    <p><b>Am Laden</b>, ${l.antworten} Antworten: ${zeile(l)}.</p><p><b>An der Haustür</b> (Stichprobe am Abend), ${h.antworten} Antworten: ${zeile(h)}${h.verzichtet ? `; ${h.verzichtet} davon mit Verzicht` : ""}.</p>
    <p class="leise">Am Laden fragt man nur, wer dort ankommt. Antworten sind modellierte Auskünfte der Figuren, gekürzt auf sieben feste Kategorien.</p></div>`;
}
function histogramm(v, titel) {
  const max = Math.max(1, ...v);
  return `<figure class="mini"><figcaption>${titel}</figcaption><svg viewBox="0 0 210 50" role="img" aria-label="${titel}: ${v.map((n, i) => (n ? `${i * 30}–${i * 30 + 30} s: ${n}` : "")).filter(Boolean).join(", ")}">${v.map((n, i) => `<rect x="${i * 10}" y="${48 - (n / max) * 46}" width="8.5" height="${(n / max) * 46}"/>`).join("")}</svg></figure>`;
}
function verlaufTage(z, f, titel) {
  const t = z.messung.tage.slice(-10); if (t.length < 2) return "";
  const w = t.map(f), max = Math.max(1, ...w);
  return `<figure class="mini"><figcaption>${titel}</figcaption><svg viewBox="0 0 ${t.length * 20} 50" role="img" aria-label="${titel}: ${t.map((x, i) => `Tag ${x.tag} ${w[i]}`).join(", ")}">${w.map((n, i) => `<rect x="${i * 20 + 3}" y="${48 - (n / max) * 46}" width="14" height="${(n / max) * 46}"/>`).join("")}</svg></figure>`;
}

// ---------- Protokoll ----------
const PROT = { massnahme: "Massnahme", ruecknahme: "Rücknahme", beobachtung: "Beobachtung", entstehung: "Entstanden", szene: "Modellszene", teilnahme: "Teilnahme", rueckkehr: "Was bleibt" };
function protokollHtml() {
  const z = ui.stadt.z;
  const zahl = $("#protokoll-neu"); if (zahl) { zahl.hidden = true; zahl.textContent = ""; }
  const l = [...z.protokoll].reverse();
  return `<p class="leise">Handlungen, Zeitpunkte und beobachtete Folgen in diesem Lauf. Jede Meldung beruht auf dem Zustand der Simulation; «Warum?» nennt den im Modell aktiven Mechanismus und eine offene Frage. Ein einzelner Lauf ist kein Kausalnachweis.</p>
    <ol class="protokoll">${l.map((e) => `<li class="p-${e.art}"><span class="zeit">Tag ${e.tag}, ${M.uhr(e.t)} · ${PROT[e.art] ?? e.art}${e.perspektive ? " · Modellierte Perspektive" : ""}</span> ${esc(e.text)}
      ${e.mechanismus || e.frage ? `<details data-id="p${e.id}"><summary>Warum?</summary>${e.mechanismus ? `<p>${esc(e.mechanismus)}</p>` : ""}${e.frage ? `<p><i>${esc(e.frage)}</i></p>` : ""}${e.anregung ? `<p class="leise">${esc(e.anregung)}</p>` : ""}</details>` : ""}</li>`).join("") || "<li class='leise'>Noch nichts. Die Stadt läuft auch ohne dich.</li>"}</ol>`;
}

// ---------- Vergleichen ----------
const VARIANTEN_A = [["Keine Änderung", {}], ["Zusätzliche Fahrspur", { spur: true }], ["Bus öfter", { bus: true }], ["Zusätzliche Querung", { querung: true }], ["Tempo 30, weniger Autoverkehr", { ruhe: true }]];
function vergleichenHtml() {
  const s = ui.stadt, v = ui.vergleich;
  const vor = s.vorEingriff;
  let h = `<section><h3>Vorher vergleichen</h3>${vor ? `<p>Letzter Eingriff: <b>${esc(M.massnahmeText(vor.schluessel, vor.wert))}</b>, Tag ${vor.z.tag}, ${M.uhr(vor.z.t)}.</p>
      <p class="leise">Beide Zweige starten aus dem Zustand unmittelbar davor, mit derselben Vorgeschichte und denselben Zufallsfolgen für Tagesprogramme und Fahrten von aussen. Einzelne Entscheidungen können nach dem Eingriff auseinanderlaufen.</p>
      <div class="zeile"><button type="button" class="knopf" data-aktion="vergleich-vorher" data-tage="0"${ui.rechnet ? " disabled" : ""}>Bis Ende Tag ${vor.z.tag} vergleichen</button><button type="button" class="knopf" data-aktion="vergleich-vorher" data-tage="2"${ui.rechnet ? " disabled" : ""}>und zwei Tage weiter</button></div>`
    : `<p class="leise">Sobald du etwas veränderst, merkt sich die Stadt den Zustand davor. Dann kannst du denselben Ausgangszustand mit und ohne Eingriff weiterlaufen lassen.</p>`}</section>
    <section><h3>Alternativen für die Hauptstrasse</h3><p class="leise">Von jetzt an zwei volle Tage: keine Änderung, Fahrspur, Bus, Querung, Tempo 30. Nicht alle Alternativen brauchen gleich viele Regler.</p>
      <button type="button" class="knopf" data-aktion="vergleich-a"${ui.rechnet ? " disabled" : ""}>Alternativen rechnen</button></section>`;
  if (v) h += v.fertig ? vergleichTabelle(v) : `<p role="status">Rechne ${esc(v.titel)} … ${Math.round(v.fortschritt * 100)} %</p><progress max="1" value="${v.fortschritt}"></progress>`;
  return h;
}
function vergleichTabelle(v) {
  const z = v.ergebnisse;
  const zeilen = [
    ["Autos Hauptstrasse", (k) => k.autosH],
    ["Autos Nordstrasse", (k) => k.autosN],
    ["mittlere Autofahrt", (k) => (k.reiseH ? M.dauerText(k.reiseH) : "–")],
    ["Bus statt Auto (Fahrten)", (k) => k.pendel.bus],
    ["Wege erreicht / Ersatz / aufgegeben", (k) => `${k.erreicht} / ${k.ersetzt} / ${k.aufgegeben}`],
    ["… mit Rollstuhl oder Kinderwagen", (k) => ["rollstuhl", "kinderwagen"].map((t) => k.nachTyp[t] ?? { erreicht: 0, ersetzt: 0, aufgegeben: 0 }).reduce((s, x) => [s[0] + x.erreicht, s[1] + x.ersetzt, s[2] + x.aufgegeben], [0, 0, 0]).join(" / ")],
    ["mittleres Warten an Querungen", (k) => (k.wartenMittel !== null ? M.dauerText(k.wartenMittel) : "–")],
    ["Aufenthalt (Minuten)", (k) => Math.round(k.aufenthalt)],
    ["Gespräche", (k) => k.gespraeche],
    ["am stärksten belastet", (k) => { const b = [...k.belastung].sort((a, c) => c.umweg / 1.2 + c.warten - (a.umweg / 1.2 + a.warten))[0]; return b ? `${esc(v.namen[b.id])}: ${b.umweg} m, ${Math.round(b.warten)} s` : "–"; }],
  ];
  return `<section class="ergebnis"><h3>${esc(v.titel)}</h3><p class="leise">${esc(v.hinweis)}</p>
    <div class="breit"><table class="tab"><thead><tr><th></th>${z.map((e) => `<th>${esc(e.name)}</th>`).join("")}</tr></thead><tbody>
    ${zeilen.map(([t, f]) => `<tr><th>${t}</th>${z.map((e) => `<td>${f(e.k)}</td>`).join("")}</tr>`).join("")}
    <tr><th>Fahrzeiten</th>${z.map((e) => `<td>${histogramm(e.k.reiseVerteilung, "Verteilung")}</td>`).join("")}</tr>
    </tbody></table></div>${empfehlungHtml(v)}</section>`;
}
function empfehlungHtml(v) {
  const e = v.ergebnisse; if (!e || e.length < 2) return "";
  const kenn = { reise: (k) => -(k.reiseH ?? 0), erreich: (k) => k.erreicht / Math.max(1, k.erreicht + k.ersetzt + k.aufgegeben), aufenthalt: (k) => k.aufenthalt + k.gespraeche * 5, belastung: (k) => -k.belastung.reduce((s, b) => s + b.umweg / 1.2 + b.warten, 0) };
  const summe = Object.values(ui.gewicht).reduce((a, b) => a + b, 0);
  if (!summe) return `<p class="leise">Alle Gewichte stehen auf null: keine Empfehlung.</p>`;
  const punkte = e.map(() => 0);
  for (const [g, f] of Object.entries(kenn)) {
    const w = e.map((x) => f(x.k)), lo = Math.min(...w), hi = Math.max(...w);
    w.forEach((x, i) => (punkte[i] += ui.gewicht[g] * (hi === lo ? 0.5 : (x - lo) / (hi - lo))));
  }
  const best = punkte.indexOf(Math.max(...punkte));
  return `<p class="wertung"><b>Gewählte Wertung:</b> Mit deinen Gewichten (Autofahrt ${ui.gewicht.reise}, Erreichbarkeit ${ui.gewicht.erreich}, Aufenthalt ${ui.gewicht.aufenthalt}, Belastung ${ui.gewicht.belastung}) läge «${esc(e[best].name)}» vorn. Andere Gewichte, andere Reihenfolge – die Stadt selbst ändert sich dadurch nicht.</p>`;
}
async function rechneVergleich(titel, hinweis, zweige, bisZeit, abTag) {
  ui.rechnet = true;
  const v = (ui.vergleich = { titel, hinweis, fertig: false, fortschritt: 0, ergebnisse: [], namen: ui.stadt.z.figuren.map((f) => f.name) });
  panelAktualisieren(true);
  const gesamt = zweige.length * Math.max(1, bisZeit - M.gesamtzeit(zweige[0].s.z));
  let erledigt = 0;
  for (const zw of zweige) {
    const s = zw.s;
    while (M.gesamtzeit(s.z) < bisZeit) {
      const t0 = performance.now();
      while (M.gesamtzeit(s.z) < bisZeit && performance.now() - t0 < 30) for (let i = 0; i < 400; i++) { M.schritt(s); erledigt++; }
      v.fortschritt = Math.min(1, erledigt / gesamt);
      panelAktualisieren(true);
      await new Promise((r) => setTimeout(r, 0));
      if (ui.vergleich !== v) { ui.rechnet = false; return; }
    }
    v.ergebnisse.push({ name: zw.name, k: M.kennzahlen(s.z, abTag) });
  }
  v.fertig = true; ui.rechnet = false;
  panelAktualisieren(true);
}

// ---------- Modell ----------
function modellHtml() {
  const s = ui.stadt, z = s.z;
  const nn = nebeneinanderNacheinander(z);
  return `<section><h3>So funktioniert das Modell</h3>
    <ul class="annahmen">
      <li><b>Ein gemeinsamer Zustand.</b> ${z.figuren.length} Figuren mit Tagesprogramm, Zeit, Kraft, Wegwissen und Erinnerung; dazu Fahrten von aussen, ein Bus, Ampel, Bänke und Orte. Alle vier Kapitel fragen dieselbe Stadt.</li>
      <li><b>Fester Takt, fester Startwert.</b> Eine Sekunde Stadtzeit je Schritt, Startwert ${z.seed}. Gleiche Ausgangslage, gleicher Lauf. Tag von 6 bis 22 Uhr; die Nacht wird übersprungen.</li>
      <li><b>Entscheidungen.</b> Wer die Hauptstrasse queren muss, wählt zwischen Ampel oder Zebrastreifen, Brücke, Queren zwischen den Autos, einem Ersatzziel und Verzicht – nach Umweg, Wartezeit, Zweck und der eigenen Lage, mit Gewohnheiten und begrenztem Wissen. Fahrten von aussen wählen Auto, Bus, eine ruhigere Zeit oder Verzicht; etwa ein Drittel überlegt täglich neu.</li>
      <li><b>Woher die Neigungen kommen:</b> ${tabelle ? `jev (${esc(tabelle.modell)}, api.typesafe.ai) hat am ${esc(tabelle.stand)} beim Bauen ${tabelle.aufrufe} beschriebene Lagen eingeschätzt. Ein Sprachmodell-Urteil über plausible Reaktionen, keine gemessene Häufigkeit. Die Seite ruft jev nie auf und sendet nichts.` : `Ersatzregeln (${esc(tabelleFehler ?? "")}). Die Stadt läuft trotzdem; die Neigungen sind dann einfache Abwägungen von Zeit und Zweck.`}</li>
      <li><b>Rückkopplung statt Zeitschaltuhr.</b> Mehr Kapazität senkt die Fahrzeit; die Fahrzeit wirkt über Erfahrung und aktuelle Lage auf die Wahl; die Wahl wirkt auf die Fahrzeit. Ob eine Entlastung bleibt, hängt an der regionalen Nachfrage.</li>
      <li><b>Erinnerung bleibt.</b> Figuren merken sich Wartezeiten, Gewohnheiten, Bekanntschaften und was sie über die Strasse glauben. Zurücknehmen ändert die Strasse, nicht das Gedächtnis. Das ist eine Annahme dieses Modells, keine Behauptung über reale Menschen.</li>
      <li><b>Keine Glücksvariable.</b> Wünsche, Verzögerungen und Belastungen bleiben getrennte Grössen. Kein Sieg, keine Gesamtnote.</li>
    </ul>
    <fieldset class="wahl kompakt"><legend>Regionale Nachfrage (verschiebbare Fahrten) – startet einen neuen Lauf</legend>${Object.keys(M.LATENT).map((l) => `<label><input type="radio" name="latent" value="${l}" data-aktion="latent"${z.params.latent === l ? " checked" : ""}> ${l}</label>`).join("")}</fieldset>
    <p class="leise">Mehr in <a href="MODELL.md">MODELL.md</a> (Parameter, Regeln, Grenzen).</p></section>
  <details class="genauer" data-id="nn"><summary>Genauer hinsehen: Nebeneinander, Nacheinander</summary>
    <dl class="fragen">
      <dt>Was bleibt wiedererkennbar und vergleichbar?</dt><dd><ul>${nn.wiedererkennbar.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></dd>
      <dt>Was verändert sich im Verlauf?</dt><dd><ul>${nn.verlauf.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></dd>
      <dt>Was davon beeinflusst spätere Möglichkeiten?</dt><dd><ul>${nn.fortwirkend.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></dd>
      <dt>Was bleibt nach Rücknahme eines Eingriffs bestehen?</dt><dd>${nn.ruecknahmen.length ? nn.ruecknahmen.map((r) => `<div class="probe"><p><b>Rückkehrprobe:</b> ${esc(r.gepruefte_rueckkehr)}</p><p><b>Zurückgesetzt:</b> ${esc(r.zurueckgesetzte_merkmale)}</p><p><b>Aufgehoben:</b> ${esc(r.aufgehobene_folgen)}</p><p><b>Fortbestehend:</b></p><ul>${r.fortbestehende_folgen.map((t) => `<li>${esc(t)}</li>`).join("")}</ul><p><b>Was weiter aufheben würde:</b> ${esc(r.weitergehende_aufhebung)}</p><p class="leise">${esc(r.beleggrenze)}</p></div>`).join("") : "Noch keine Massnahme zurückgenommen. Probiere es: verändere etwas, warte einen Tag, nimm es zurück."}</dd>
    </dl>
    <p class="leise">Unterschieden werden Veränderung, Vorgeschichte und fortwirkende Folge. Viel Bewegung ist nicht schon Verzeitlichung; stabile Abläufe verlangen keine stillstehenden Figuren; dass die Stadt Fläche hat, ist noch keine Verräumlichung – erst die Karte mit festen Orten macht Unterschiede wiederauffindbar. Kontrollfrage: Nach welchen Kriterien gilt eine Rückkehr hier als dieselbe – und könnten diese Kriterien im weiteren Verlauf selbst fraglich werden? Raster: Christian Strickler, «Nebeneinander und Nacheinander».</p>
  </details>
  <section><h3>Quellen und Redlichkeit</h3>
    <p>Ausgangspunkt: Klaus Kusanowskys Grafik «Urbane Paradoxien: Die Systematik der Stadt», erarbeitet mit NotebookLM. Er hat damit soziologische Literatur ausgewertet und eine gegliederte Übersicht erstellt, als Anfang für eine ausführlich-systematische Erarbeitung des Themas.<br>Beobachtungsraster: Christian Strickler, «Nebeneinander, Nacheinander» und «Der Verteilapparat des Körpers».<br>Diese Anwendung ist eine eigenständige, vereinfachende Weiterentwicklung.</p>
    <table class="tab quellen"><thead><tr><th>Quelle (nach der Grafik)</th><th>dort genanntes Thema</th><th>im Modell als Frage</th></tr></thead><tbody>
      <tr><td>Frank Eckardt (Hg.), Handbuch Stadtsoziologie, 2012 – darin Annette Harth, «Stadtplanung», S. 337–364; Detlef Sack, «Urbane Governance», S. 311–335; Sybille Frank, «Eigenlogik der Städte», S. 289–309. <a href="https://doi.org/10.1007/978-3-531-94112-7">doi:10.1007/978-3-531-94112-7</a></td><td>Raum als soziales Machtkonstrukt</td><td>Ordnung ohne Gesamtplan; wer entscheidet über Bedingungen</td></tr>
      <tr><td>Eberhard Brandt, Manfred Haack, Bernd Törkel: Verkehrskollaps. Diagnose und Therapie, 1994</td><td>Kapazitätsgrenzen und Rebound</td><td>A: Spur, Fahrzeit, Nachfrage</td></tr>
      <tr><td>Martin Burkhardt: Die gesellschaftlichen Kosten des Autoverkehrs, 1980</td><td>Gesellschaftliche Kosten des Verkehrs</td><td>C: was eine Zahl zeigt, was sie auslässt</td></tr>
      <tr><td>Christian Ude (Hg.) – Titel in der Grafik nicht genannt, offen</td><td>Legitimation und Zukunftsrhetorik</td><td>offen</td></tr>
      <tr><td>J. G. Ballard: Concrete Island / Die Betoninsel (Original 1974; die Grafik nennt 1979, verwendete Ausgabe ungeklärt)</td><td>Isolation im Zentrum</td><td>B: Verbindung, die trennt</td></tr>
      <tr><td>Hanif Kureishi: The Buddha of Suburbia / Der Buddha aus der Vorstadt, 1990</td><td>Habitus und Mobilität</td><td>D: Teilnahme unter fremder Beschreibung (erfundene Modellszene, kein Zitat)</td></tr>
    </tbody></table>
    <p class="leise">Die Literatur ist Inspiration und Untersuchungsmaterial; die Modellregeln sind daraus nicht belegt, und die Grafik ersetzt keine Lektüre. Im Sinn des Rasters «Nebeneinander und Nacheinander» bleiben Koordinaten für diese Werke offen: Als Material liegt nur die Grafik vor, und ein Titel ist noch kein gelesener Beleg. Literarische Szenen liefern Beobachtungsperspektiven, keine Häufigkeiten. Empirische Anregungen: Anciaes und Jones (2016), «Pedestrians avoid busy roads»; Mindell et al. (2017) zur Messung von Trennwirkung (community severance); Jane Jacobs (1958), «Downtown is for People».</p>
  </section>`;
}

// ---------- Ereignisse aus den Panels ----------
function panelKlick(e) {
  const b = e.target.closest("button"); if (!b) return;
  const s = ui.stadt;
  if (b.dataset.massnahme && b.classList.contains("schalter")) {
    const wert = b.dataset.wert === "true";
    M.setzeMassnahme(s, b.dataset.massnahme, wert);
    melde(`${M.massnahmeText(b.dataset.massnahme, wert)} – umgesetzt um ${M.uhr(s.z.t)}.${ui.laeuft ? "" : " Die Stadt steht still; starte sie, um die Folgen zu sehen."}`);
    ui.vorschau = null; panelAktualisieren(true); return;
  }
  switch (b.dataset.aktion) {
    case "zurueck": { const k = b.dataset.schluessel; M.nimmZurueck(s, k); melde(`Zurückgenommen: ${M.massnahmeText(k, true)}. Nur die Massnahme – was die Figuren gelernt haben, bleibt.`); panelAktualisieren(true); break; }
    case "jemand": folgeJemandem(); panelAktualisieren(true); break;
    case "folge-id": ui.folge = +b.dataset.id; zeigeTab("begleiten"); break;
    case "vergleich-vorher": {
      const vor = s.vorEingriff, extra = +b.dataset.tage;
      const ende = vor.z.tag * M.TAG_DAUER + M.TAG_DAUER - 1 + extra * M.TAG_DAUER;
      const ziel = Math.max(ende, M.gesamtzeit(s.z));
      rechneVergleich(`Mit und ohne «${M.massnahmeText(vor.schluessel, vor.wert)}»`, `Ab Tag ${vor.z.tag}, ${M.uhr(vor.z.t)}, bis Tag ${Math.floor(ziel / M.TAG_DAUER)} um ${M.uhr(ziel % M.TAG_DAUER)}. Kennzahlen ab dem Tag des Eingriffs.`,
        [{ name: "ohne", s: M.zweig(s, vor.z) }, { name: "mit", s: M.zweig(s, vor.z, { [vor.schluessel]: vor.wert }) }], ziel, vor.z.tag);
      break;
    }
    case "vergleich-a": {
      const z0 = structuredClone(s.z), ziel = (z0.tag + 2) * M.TAG_DAUER - 1;
      const basis = { spur: false, bus: false, querung: false, ruhe: false };
      rechneVergleich("Alternativen für die Hauptstrasse", `Alle Zweige starten aus dem jetzigen Zustand (Tag ${z0.tag}, ${M.uhr(z0.t)}) und laufen bis Ende Tag ${z0.tag + 1}; die übrigen Massnahmen bleiben, wie sie sind.`,
        VARIANTEN_A.map(([name, m]) => ({ name, s: M.zweig(s, z0, { ...basis, ...m }) })), ziel, z0.tag);
      break;
    }
  }
}
function panelWechsel(e) {
  const el = e.target, s = ui.stadt;
  if (el.dataset.aktion === "folge") { ui.folge = el.value === "" ? null : +el.value; if (ui.folge !== null) passeAusschnitt(positionVon(s.z.figuren[ui.folge])); panelAktualisieren(true); return; }
  if (el.dataset.aktion === "sicht") { ui.sicht = el.value; panelAktualisieren(true); return; }
  if (el.dataset.aktion === "latent") { neuerLauf(el.value); melde(`Neuer Lauf mit regionaler Nachfrage «${el.value}».`); panelAktualisieren(true); return; }
  if (el.dataset.massnahme) {
    const k = el.dataset.massnahme, w = el.tagName === "SELECT" ? el.value : el.dataset.wert;
    M.setzeMassnahme(s, k, w);
    melde(`${M.massnahmeText(k, w)} – umgesetzt um ${M.uhr(s.z.t)}.`);
    ui.vorschau = null; panelAktualisieren(true);
  }
}
function panelEingabe(e) {
  const el = e.target;
  if (el.dataset.aktion === "gewicht") { ui.gewicht[el.dataset.g] = +el.value; el.nextElementSibling.textContent = el.value; el.setAttribute("aria-valuetext", `${el.value} von 3`); const w = $(".wertung", $("#tab-sichten")); if (w && ui.vergleich?.fertig) w.outerHTML = empfehlungHtml(ui.vergleich); }
}

start();
