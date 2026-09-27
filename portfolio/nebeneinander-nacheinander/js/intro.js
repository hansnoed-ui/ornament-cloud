// ORNA – Startbild der installierten App: Das Rad setzt sich zusammen.
// Zuerst zeichnen sich die Ringe, dann finden die 40 Zeichen einzeln ihren Platz,
// zuletzt erscheinen Achsenmarke und Name. Danach gibt das Bild das Rad frei.
//
// Nur als App (Startbildschirm) und einmal pro Sitzung; zum Ansehen im Browser: ?intro.
// Bei reduzierter Bewegung entfällt es ganz. Antippen oder eine Taste überspringt es.

import { symbolMarkup } from "./symbols.js?v=2";

const params = new URLSearchParams(location.search);
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let seen = false;
try { seen = sessionStorage.getItem("orna-intro") === "1"; } catch { /* ohne Speicher: jedes Mal */ }

if (!reduce && (params.has("intro") || (standalone && !seen))) run();

function run() {
  try { sessionStorage.setItem("orna-intro", "1"); } catch { /* egal */ }

  const C = 500, SLOTS = 20, STEP = 18;
  const OUTER = { edge: 462, inner: 344, sym: 403, half: 42 };
  const INNER = { edge: 326, inner: 208, sym: 267, half: 37 };
  const circle = (r, cls) => `<circle class="${cls}" cx="${C}" cy="${C}" r="${r}" pathLength="1"/>`;

  // kleine, feste Streuung je Zeichen: woher es kommt und wie es gedreht ist (im Rahmen seines Platzes)
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const sym = (i, ring) => {
    const geo = ring === "a" ? OUTER : INNER, n = ring === "a" ? i : i - 20;
    const dx = Math.round((rnd() - 0.5) * 260), dy = Math.round((rnd() - 0.2) * 380), rot = Math.round((rnd() - 0.5) * 160);
    const order = ring === "a" ? n * 2 : n * 2 + 1;                 // Aussen und innen abwechselnd, rundum
    return `<g transform="rotate(${n * STEP} ${C} ${C}) translate(${C} ${C - geo.sym})">` +
      `<g class="orna-sym" style="--dx:${dx}px;--dy:${dy}px;--rot:${rot}deg;--i:${order}">${symbolMarkup(i, geo.half)}</g></g>`;
  };

  const el = document.createElement("div");
  el.className = "orna-intro";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = `<svg class="orna-wheel" viewBox="0 0 1000 1000">
      ${circle(OUTER.edge, "orna-ring")}${circle(OUTER.inner, "orna-ring orna-ring--thin")}
      ${circle(INNER.edge, "orna-ring")}${circle(INNER.inner, "orna-ring orna-ring--thin")}
      ${Array.from({ length: SLOTS }, (_, i) => sym(i, "a")).join("")}
      ${Array.from({ length: SLOTS }, (_, i) => sym(20 + i, "t")).join("")}
      <path class="orna-mark" d="M${C},${C - 476}l-7,-13h14Z"/>
      <path class="orna-cross" d="M${C - 12},${C}H${C + 12}M${C},${C - 12}V${C + 12}"/>
    </svg>
    <p class="orna-name">ORNA</p>`;
  document.body.append(el);
  document.documentElement.classList.add("orna-intro-open");

  // nächster Frame: Endzustand setzen, CSS-Übergänge tragen die Bewegung
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-assembling")));

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    el.classList.add("is-leaving");
    document.documentElement.classList.remove("orna-intro-open");
    setTimeout(() => el.remove(), 600);
  };
  const timer = setTimeout(finish, 3200);
  const skip = () => { clearTimeout(timer); finish(); };
  el.addEventListener("pointerdown", skip);
  addEventListener("keydown", skip, { once: true });
}
