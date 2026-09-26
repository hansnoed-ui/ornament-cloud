// Nebeneinander, Nacheinander – interaktives Doppelrad
//
// Ablauf: kuratierte Konstellationen (Anzahl aus den Daten) → zufällige Auswahl (beim Loslassen) → zwei Zielplätze
//         → gegenläufige Bewegung → Stillstand → Namen → Text → offene Frage
// Die Geste bestimmt den Weg (Richtung, Kraft, Umdrehungen, Dauer), nie das Ergebnis.
// Es werden nie Kombinationen gebildet oder geprüft; das Rad kennt nur die gezogenen Zielwinkel.

import { artists } from "./data/artists.js?v=v5";
import { theorists } from "./data/theorists.js?v=v5";
import { constellations } from "./data/constellations.js?v=v5";
import { drawConstellation } from "./lib/random.js";
import { validateDataset } from "./lib/validation.js?v=2";
import { SLOTS, STEP, mod, slotAngle, targetsFor, indexAtAxis } from "./lib/geometry.js";
import { planSpin, positionAt } from "./lib/spin.js";
import { symbolMarkup } from "./symbols.js?v=2";

const NS = "http://www.w3.org/2000/svg";
const C = 500;                                        // Mittelpunkt im 1000er-Feld
const OUTER = { edge: 462, inner: 344, sym: 403, half: 42 };
const INNER = { edge: 326, inner: 208, sym: 267, half: 37 };
const COUPLE = 0.8;                                   // Gegenring beim Ziehen
const V_MIN = 220, V_MAX = 2600, V_TAP = 760;         // Grad pro Sekunde
const REVEAL = { names: 550, text: 650, question: 850, again: 700 };   // ms, nacheinander

const svg = document.querySelector(".rad-wheel");
if (!svg) throw new Error("Doppelrad nicht gefunden");
const result = document.querySelector(".rad-result");
const live = document.getElementById("rad-live");
const debug = new URLSearchParams(location.search).has("debug");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// ---------- Daten prüfen, bevor irgendetwas gedreht wird ----------
const issues = validateDataset({ strictUniquePairs: true });
const dataOk = !issues.some(i => i.level === "error");
if (!dataOk) console.error("Doppelspalt: Datensatz ungültig", issues);

// ---------- Zeichnen ----------
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function circlePath(r) { return `M${C - r},${C}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`; }
function polar(r, deg) { const a = (deg - 90) * Math.PI / 180; return [C + r * Math.cos(a), C + r * Math.sin(a)]; }
function tick(r0, r1, deg) { const [x0, y0] = polar(r0, deg), [x1, y1] = polar(r1, deg); return `M${x0.toFixed(1)},${y0.toFixed(1)}L${x1.toFixed(1)},${y1.toFixed(1)}`; }

// feststehender Rahmen (aus der Vorschau: Hilfskreis, Achsen, Fadenkreuz)
const frameG = el("g", { class: "rad-frame", "aria-hidden": "true" }, svg);
el("path", { d: circlePath(484), class: "rad-guide" }, frameG);
el("path", { d: `M${C - 150},${C}H${C + 150}M${C},${C - 150}V${C + 150}`, class: "rad-hair" }, frameG);
el("path", { d: `M${C - 12},${C}H${C + 12}M${C},${C - 12}V${C + 12}`, class: "rad-cross" }, frameG);
el("circle", { cx: C, cy: C, r: 3, class: "rad-dot" }, frameG);

function buildRing(people, g, geo, offset) {
  el("path", { d: circlePath(geo.edge), class: "rad-edge" }, g);
  el("path", { d: circlePath(geo.inner), class: "rad-edge rad-edge--thin" }, g);
  let fine = "", bounds = "";
  for (let i = 0; i < SLOTS * 5; i += 1) if (i % 5) fine += tick(geo.edge, geo.edge - 7, i * STEP / 5 + STEP / 2);
  for (let i = 0; i < SLOTS; i += 1) {
    const a = slotAngle(i) + STEP / 2;
    bounds += tick(geo.edge, geo.edge - 16, a) + tick(geo.inner, geo.inner + 12, a);
  }
  el("path", { d: fine, class: "rad-fine" }, g);
  el("path", { d: bounds, class: "rad-bound" }, g);
  const traces = el("g", { class: "rad-traces" }, g);
  const syms = people.map((p, i) => {
    const s = el("g", { class: "sym", transform: `rotate(${slotAngle(i)} ${C} ${C}) translate(${C} ${C - geo.sym})` }, g);
    s.innerHTML = `<title>${p.name}</title>` + symbolMarkup(offset + i, geo.half);
    return s;
  });
  return { g, syms, traces };
}

const outerG = el("g", { class: "rad-ring rad-ring--outer", "aria-hidden": "true" }, svg);
const innerG = el("g", { class: "rad-ring rad-ring--inner", "aria-hidden": "true" }, svg);
const outer = buildRing(artists, outerG, OUTER, 0);
const inner = buildRing(theorists, innerG, INNER, 20);

// gemeinsame Achse: feine Linie, kleine Kerben an den Ringkanten, Marke oben
const axis = el("g", { class: "rad-axis", "aria-hidden": "true" }, svg);
el("path", { d: `M${C},${C - 470}V${C - 200}`, class: "rad-axis-line" }, axis);
el("path", { d: tick(OUTER.edge + 2, OUTER.edge + 14, 0) + tick(OUTER.inner - 1, INNER.edge + 1, 0) + tick(INNER.inner - 2, INNER.inner - 12, 0), class: "rad-axis-notch" }, axis);
el("path", { d: `M${C},${C - 476}l-7,-13h14Z`, class: "rad-axis-mark" }, axis);

const cue = el("text", { x: C, y: C + 44, class: "rad-cue", "text-anchor": "middle" }, svg);
cue.textContent = "drehen";

// ---------- Zustand ----------
/** @type {"idle"|"dragging"|"spinning"|"settling"|"selected"} */
let state = "idle";
const rot = { artist: Math.random() * 360, theorist: Math.random() * 360 };
let touched = false;          // erste Berührung erfolgt?
let plan = null, spinStart = 0, current = null, previousId, forcedId = null;
const history = [];           // frühere Begegnungen als Spur: [{a, t}]
let timers = [];

function setState(s) {
  state = s;
  svg.dataset.state = s;
}
setState("idle");

function render() {
  outerG.setAttribute("transform", `rotate(${rot.artist.toFixed(3)} ${C} ${C})`);
  innerG.setAttribute("transform", `rotate(${rot.theorist.toFixed(3)} ${C} ${C})`);
}

function renderTraces() {
  // Vergangenheit hinterlässt Spuren: kleine Punkte an früher gewählten Plätzen, sie verblassen.
  for (const [ring, geo, key] of [[outer, OUTER, "a"], [inner, INNER, "t"]]) {
    ring.traces.innerHTML = "";
    history.forEach((h, age) => {
      const [x, y] = polar(geo.inner + 5, slotAngle(h[key]));
      el("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: 3.2, class: "rad-trace", style: `opacity:${[0.45, 0.26, 0.12][age]}` }, ring.traces);
    });
  }
}

// ---------- Ergebnis ----------
const parts = {
  artist: result.querySelector(".rad-artist"),
  theorist: result.querySelector(".rad-theorist"),
  names: result.querySelector(".rad-names"),
  text: result.querySelector(".rad-text"),
  question: result.querySelector(".rad-question"),
  again: result.querySelector(".rad-again"),
};

function clearTimers() { timers.forEach(clearTimeout); timers = []; }

function hideResult() {
  clearTimers();
  result.classList.remove("is-active");
  ["names", "text", "question", "again"].forEach(k => parts[k].classList.remove("is-shown"));
  svg.classList.remove("is-selected");
  svg.querySelectorAll(".sym.is-hit").forEach(s => s.classList.remove("is-hit"));
  live.textContent = "";
}

function showResult(record, instant) {
  const a = artists.find(p => p.id === record.artistId);
  const t = theorists.find(p => p.id === record.theoristId);
  const { artistIndex, theoristIndex } = targetsFor(record, artists, theorists);
  outer.syms[artistIndex].classList.add("is-hit");
  inner.syms[theoristIndex].classList.add("is-hit");
  svg.classList.add("is-selected");

  parts.artist.textContent = a.name;
  parts.theorist.textContent = t.name;
  parts.text.textContent = record.text;
  parts.question.textContent = record.question;
  result.dataset.pair = record.id;
  result.classList.add("is-active");
  live.textContent = `Konstellation: ${a.name} und ${t.name}.`;

  const steps = [["names", REVEAL.names], ["text", REVEAL.text], ["question", REVEAL.question], ["again", REVEAL.again]];
  let at = 0;
  steps.forEach(([k, delay]) => {
    at += instant ? 0 : delay;
    timers.push(setTimeout(() => {
      parts[k].classList.add("is-shown");
      if (k === "names") keepInView();
    }, at));
  });
}

function keepInView() {
  // auf dem Handy liegt das Ergebnis unter dem Rad: sanft ins Blickfeld holen, falls nötig
  const r = parts.names.getBoundingClientRect();
  if (r.top > window.innerHeight * 0.82 || r.bottom < 0) {
    parts.names.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "center" });
  }
}

// ---------- Zählung (GoatCounter, ohne Cookies): nur Ereignisse, keine persönlichen Daten ----------
const names = new Map([...artists, ...theorists].map(p => [p.id, p.name]));
function track(path, title, tries = 20) {
  try {
    if (window.goatcounter?.count) window.goatcounter.count({ path, title, event: true });
    else if (tries > 0) setTimeout(() => track(path, title, tries - 1), 500);   // Skript lädt noch
  } catch { /* Zählung ist nie wichtiger als das Rad */ }
}
const HOW = { wischen: "Wischen", tippen: "Antippen", taste: "Tastatur", nochmal: "noch einmal drehen" };

// ---------- Spin ----------
function canSpin() { return dataOk && (state === "idle" || state === "selected" || state === "dragging"); }

function startSpin(grabbed, velocity, how = "wischen") {
  if (!canSpin()) return;
  hideResult();
  touched = true;
  svg.classList.add("is-touched");
  if (current) { history.unshift({ a: current.a, t: current.t }); history.length = Math.min(history.length, 3); current = null; renderTraces(); }

  // Erst jetzt wird gezogen – unabhängig von der Geste.
  let record = drawConstellation(constellations, previousId);
  if (debug && forcedId) { record = constellations.find(c => c.id === forcedId) || record; forcedId = null; }
  const tg = targetsFor(record, artists, theorists);
  plan = planSpin({
    artistFrom: rot.artist, theoristFrom: rot.theorist,
    artistTarget: tg.artistTarget, theoristTarget: tg.theoristTarget,
    grabbed, velocity, reducedMotion: reduceMotion.matches,
  });
  plan.record = record;
  plan.targets = tg;
  spinStart = performance.now();
  setState("spinning");
  track(`rad-drehung/${how}`, `Rad: Drehung (${HOW[how] || how})`);
}

function finishSpin() {
  rot.artist = mod(plan.artist.to, 360);
  rot.theorist = mod(plan.theorist.to, 360);
  render();
  const { record, targets } = plan;
  // Sicherung: die Achse zeigt genau das gezogene Paar
  if (indexAtAxis(rot.artist) !== targets.artistIndex || indexAtAxis(rot.theorist) !== targets.theoristIndex) {
    console.error("Doppelspalt: Landung weicht vom gezogenen Datensatz ab", record.id);
  }
  previousId = record.id;
  current = { a: targets.artistIndex, t: targets.theoristIndex, id: record.id };
  setState("selected");
  showResult(record, false);
  track(`rad-paar/${record.id}`, `Rad: ${names.get(record.artistId)} × ${names.get(record.theoristId)}`);
}

// ---------- Schleife ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (state === "idle" && !touched && !reduceMotion.matches) {
    // vor der ersten Berührung: langsame gegenläufige Drift wie in der Vorschau
    rot.artist += 2.2 * dt;
    rot.theorist -= 3.1 * dt;
  } else if (state === "spinning" || state === "settling") {
    const t = (now - spinStart) / 1000;
    rot.artist = positionAt(plan.artist, t);
    rot.theorist = positionAt(plan.theorist, t);
    if (state === "spinning" && t > plan.duration - 0.8) setState("settling");
    if (t >= plan.duration) finishSpin();
  }
  render();
  if (debug) updateDebug(now);
}

// ---------- Geste ----------
function svgPoint(e) {
  const r = svg.getBoundingClientRect();
  return [(e.clientX - r.left) * 1000 / r.width, (e.clientY - r.top) * 1000 / r.height];
}
function angleOf([x, y]) { return Math.atan2(x - C, -(y - C)) * 180 / Math.PI; }
function unwrap(d) { return ((d + 540) % 360) - 180; }

let drag = null, scrollProxy = null;

svg.addEventListener("pointerdown", e => {
  if (!e.isPrimary) return;
  const p = svgPoint(e), r = Math.hypot(p[0] - C, p[1] - C);
  if (r < INNER.inner - 20 || r > OUTER.edge + 30) {
    // leere Mitte oder Ecken: auf Touch-Geräten weiter die Seite scrollen lassen
    if (e.pointerType === "touch") scrollProxy = { y: e.clientY };
    return;
  }
  if (!canSpin()) return;                                 // läuft schon: keine neue Ziehung
  e.preventDefault();
  svg.setPointerCapture(e.pointerId);
  hideResult();
  touched = true;
  svg.classList.add("is-touched", "is-dragging");
  const grabbed = r < (INNER.edge + OUTER.inner) / 2 ? "theorist" : "artist";
  const a = angleOf(p), now = e.timeStamp || performance.now();   // Ereigniszeit: robust, wenn Ereignisse verspätet ankommen
  drag = { id: e.pointerId, grabbed, lastAngle: a, total: 0, start: now, startX: e.clientX, startY: e.clientY, samples: [{ t: now, d: 0 }] };
  setState("dragging");
});

svg.addEventListener("pointermove", e => {
  if (scrollProxy && e.pointerType === "touch") { window.scrollBy(0, scrollProxy.y - e.clientY); scrollProxy.y = e.clientY; return; }
  if (!drag || e.pointerId !== drag.id) return;
  const a = angleOf(svgPoint(e)), d = unwrap(a - drag.lastAngle), now = e.timeStamp || performance.now();
  drag.lastAngle = a;
  drag.total += d;
  rot[drag.grabbed] += d;
  rot[drag.grabbed === "artist" ? "theorist" : "artist"] -= d * COUPLE;
  drag.samples.push({ t: now, d });
  while (drag.samples.length > 2 && now - drag.samples[0].t > 100) drag.samples.shift();
});

function release(e) {
  scrollProxy = null;
  if (!drag || e.pointerId !== drag.id) return;
  const now = e.timeStamp || performance.now(), g = drag;
  drag = null;
  svg.classList.remove("is-dragging");
  const moved = Math.hypot(e.clientX - g.startX, e.clientY - g.startY);
  const recent = g.samples.filter(s => now - s.t <= 100);
  // Geschwindigkeit der letzten Bewegung; wer vor dem Loslassen innehält, bremst den Schwung
  const lastT = recent.length ? recent[recent.length - 1].t : now;
  const span = recent.length > 1 ? (lastT - recent[0].t) / 1000 : 0;
  const hold = Math.max(0, now - lastT - 40);
  let v = span > 0.008 ? recent.slice(1).reduce((s, x) => s + x.d, 0) / span * Math.exp(-hold / 50) : 0;
  const dir = Math.sign(v) || Math.sign(g.total) || 1;
  const tap = moved < 6 && now - g.start < 350;
  if (tap) v = V_TAP * dir;                                          // Antippen
  else if (Math.abs(v) < V_MIN) v = V_MIN * dir;                     // langsames Ziehen: sanfter Anstoss
  v = Math.max(-V_MAX, Math.min(V_MAX, v));
  setState("idle");                                                  // kurz, damit startSpin greift
  startSpin(g.grabbed, v, tap ? "tippen" : "wischen");
}
svg.addEventListener("pointerup", release);
svg.addEventListener("pointercancel", release);

svg.addEventListener("keydown", e => {
  if (e.key !== "Enter" && e.key !== " ") return;
  e.preventDefault();
  if (state === "idle" || state === "selected") startSpin("artist", V_TAP * (0.9 + 0.4 * Math.random()), "taste");
});

parts.again.addEventListener("click", () => {
  if (state === "selected") startSpin("artist", V_TAP * (0.9 + 0.5 * Math.random()), "nochmal");
  svg.focus({ preventScroll: true });
});

// ---------- Adresse eines Datensatzes (vorbereitet): ?pair=künstler__theoretiker ----------
const pairParam = new URLSearchParams(location.search).get("pair");
const linked = pairParam && constellations.find(c => c.id === pairParam);
if (dataOk && linked) {
  const tg = targetsFor(linked, artists, theorists);
  rot.artist = tg.artistTarget;
  rot.theorist = tg.theoristTarget;
  touched = true;
  svg.classList.add("is-touched");
  previousId = linked.id;
  current = { a: tg.artistIndex, t: tg.theoristIndex, id: linked.id };
  setState("selected");
  showResult(linked, true);
  track(`rad-direktlink/${linked.id}`, `Rad: Direktlink ${names.get(linked.artistId)} × ${names.get(linked.theoristId)}`);
}

// ---------- Entwicklungsdiagnose (nur mit ?debug) ----------
let dbg = null;
function setupDebug() {
  dbg = document.createElement("div");
  dbg.className = "rad-debug";
  dbg.innerHTML = `<pre></pre>
    <label>Datensatz <select>${constellations.map(c => `<option value="${c.id}">${c.id}</option>`).join("")}</select></label>
    <button type="button" data-a="force">diesen als nächsten drehen</button>
    <button type="button" data-a="validate">Datensatz prüfen</button>
    <button type="button" data-a="simulate">100 000 Ziehungen</button>
    <pre class="rad-debug-out"></pre>`;
  document.querySelector(".rad-stage").after(dbg);
  const out = dbg.querySelector(".rad-debug-out");
  dbg.addEventListener("click", async e => {
    const a = e.target.dataset && e.target.dataset.a;
    if (a === "force") { forcedId = dbg.querySelector("select").value; out.textContent = `Nächster Spin: ${forcedId}`; }
    if (a === "validate") { const is = validateDataset({ strictUniquePairs: true }); out.textContent = is.length ? JSON.stringify(is, null, 2) : `Keine Befunde: ${artists.length} Künstler, ${theorists.length} Theoretiker, ${constellations.length} eindeutige Paare.`; }
    if (a === "simulate") {
      const { simulateDraws } = await import("./lib/random.js");
      const t0 = performance.now(), counts = simulateDraws(constellations, 100000), v = [...counts.values()];
      out.textContent = `100 000 Ziehungen in ${Math.round(performance.now() - t0)} ms · erreichbar ${v.filter(x => x > 0).length}/${constellations.length} · min ${Math.min(...v)} · max ${Math.max(...v)} · keine unmittelbare Wiederholung`;
    }
  });
}
function updateDebug(now) {
  if (!dbg) setupDebug();
  const t = plan ? (now - spinStart) / 1000 : 0;
  dbg.querySelector("pre").textContent =
    `Zustand   ${state}\n` +
    `Drehung   Künstler ${mod(rot.artist, 360).toFixed(2)}°  Theoretiker ${mod(rot.theorist, 360).toFixed(2)}°\n` +
    (plan ? `Ziel      Künstler ${plan.targets.artistTarget.toFixed(2)}°  Theoretiker ${plan.targets.theoristTarget.toFixed(2)}°  (${plan.record.id})\n` +
            `Dauer     ${plan.artist.T.toFixed(2)} s / ${plan.theorist.T.toFixed(2)} s · Umdrehungen ${(plan.artist.D / 360).toFixed(2)} / ${(plan.theorist.D / 360).toFixed(2)} · n ${plan.artist.n.toFixed(2)} / ${plan.theorist.n.toFixed(2)} · t ${Math.min(t, plan.duration).toFixed(2)} s\n` : "") +
    `Achse     ${artists[indexAtAxis(rot.artist)].name} × ${theorists[indexAtAxis(rot.theorist)].name}` +
    (dataOk ? "" : "\nDATENSATZ UNGÜLTIG");
}

render();
renderTraces();
requestAnimationFrame(frame);

// Für automatisierte Tests lesbar machen (keine Steuerung von aussen)
svg.__rad = { get state() { return state; }, get rotation() { return { ...rot }; }, get plan() { return plan; }, get current() { return current; } };
