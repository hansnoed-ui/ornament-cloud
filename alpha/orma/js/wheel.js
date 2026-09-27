// ORMA – zwei gegenläufige Ringe mit je zwölf Plätzen (aussen Künstler:innen, innen Theoretiker:innen).
// Abgeleitet aus dem Doppelrad von ORNA, aber eigenständig: Das Ergebnis steht vor der Bewegung fest
// (drawNext), die Ringe fahren nur dorthin. Richtung, Umdrehungen und Dauer kommen aus der Geste.
// Überspringbar; bei reduzierter Bewegung kurz und ohne Umdrehungen.

import { symbolMarkup } from "./symbols.js?v=9aa675c8647c";

const NS = "http://www.w3.org/2000/svg";
const C = 500, SLOTS = 12, STEP = 360 / SLOTS;
const OUTER = { edge: 470, inner: 352, sym: 411, half: 44 };
const INNER = { edge: 330, inner: 212, sym: 271, half: 38 };

const easeOut = t => 1 - Math.pow(1 - t, 3);
const mod = (a, m) => ((a % m) + m) % m;

export function createWheel(svg, { outer, inner }) {
  if (outer.length !== SLOTS || inner.length !== SLOTS) throw new Error(`Rad: je Ring ${SLOTS} Personen erwartet`);
  const ring = (geo, items, cls) => {
    const slots = items.map((it, i) =>
      `<g transform="rotate(${i * STEP} ${C} ${C}) translate(${C} ${C - geo.sym})"><g class="orma-sym">${symbolMarkup(it.symbol, geo.half)}</g></g>`).join("");
    const ticks = Array.from({ length: SLOTS }, (_, i) =>
      `<path class="orma-tick" transform="rotate(${i * STEP + STEP / 2} ${C} ${C})" d="M${C},${C - geo.edge}V${C - geo.edge + 14}"/>`).join("");
    return `<g class="${cls}"><circle class="orma-ring" cx="${C}" cy="${C}" r="${geo.edge}"/>` +
      `<circle class="orma-ring orma-ring--thin" cx="${C}" cy="${C}" r="${geo.inner}"/>${ticks}${slots}</g>`;
  };
  svg.setAttribute("viewBox", "0 0 1000 1000");
  svg.innerHTML = ring(OUTER, outer, "orma-outer") + ring(INNER, inner, "orma-inner") +
    `<path class="orma-axis" d="M${C},${C - OUTER.inner + 4}V${C - INNER.edge - 4}"/>` +      // Achse nur zwischen den Ringen
    `<path class="orma-mark" d="M${C},${C - 474}l-10,-18h20Z"/>` +
    `<path class="orma-cross" d="M${C - 12},${C}H${C + 12}M${C},${C - 12}V${C + 12}"/>`;
  const gOuter = svg.querySelector(".orma-outer"), gInner = svg.querySelector(".orma-inner");

  const rot = { outer: 0, inner: 0 };
  const apply = () => {
    gOuter.setAttribute("transform", `rotate(${rot.outer.toFixed(2)} ${C} ${C})`);
    gInner.setAttribute("transform", `rotate(${rot.inner.toFixed(2)} ${C} ${C})`);
  };
  apply();

  let running = null;

  /** Ziel eines Rings: Platz `slot` oben, in Richtung dir (±1) mit `turns` ganzen Umdrehungen */
  const target = (from, slot, dir, turns) => {
    const goal = mod(-slot * STEP, 360);
    const d = dir > 0 ? mod(goal - from, 360) : -mod(from - goal, 360);
    return from + d + dir * 360 * turns;
  };

  /** Stellung ohne Bewegung setzen (z. B. beim Fortsetzen einer Runde) */
  function setTo(outerSlot, innerSlot) {
    if (running) running.finish();
    rot.outer = mod(-outerSlot * STEP, 360);
    rot.inner = mod(-innerSlot * STEP, 360);
    apply();
  }

  /**
   * Fährt zu den beiden Plätzen. gesture: { dir: ±1, strength: 0…1 } bestimmt nur den Weg.
   * Liefert ein Promise, das beim Stillstand (oder Überspringen) erfüllt ist.
   */
  function spinTo(outerSlot, innerSlot, { dir = 1, strength = 0.5, reduce = false } = {}) {
    if (running) running.finish();
    const dirO = dir >= 0 ? 1 : -1, dirI = -dirO;                       // gegenläufig
    const s = Math.max(0, Math.min(1, strength));
    const turnsO = reduce ? 0 : 1 + Math.round(s * 3), turnsI = reduce ? 0 : 1 + Math.round(s * 2) + 1;
    const from = { ...rot };
    const to = { outer: target(from.outer, outerSlot, dirO, turnsO), inner: target(from.inner, innerSlot, dirI, turnsI) };
    const durO = reduce ? 500 : 2600 + s * 1600, durI = reduce ? 500 : durO * 0.82;
    const t0 = performance.now();
    return new Promise(resolve => {
      let raf = 0;
      const finish = () => {
        cancelAnimationFrame(raf);
        rot.outer = mod(to.outer, 360); rot.inner = mod(to.inner, 360);
        apply();
        running = null;
        svg.classList.remove("is-spinning");
        resolve();
      };
      running = { finish };
      svg.classList.add("is-spinning");
      const frame = now => {
        const tO = Math.min(1, (now - t0) / durO), tI = Math.min(1, (now - t0) / durI);
        rot.outer = from.outer + (to.outer - from.outer) * easeOut(tO);
        rot.inner = from.inner + (to.inner - from.inner) * easeOut(tI);
        apply();
        if (tO < 1 || tI < 1) raf = requestAnimationFrame(frame);
        else finish();
      };
      raf = requestAnimationFrame(frame);
    });
  }

  return {
    spinTo, setTo,
    skip() { if (running) running.finish(); },
    get spinning() { return !!running; },
  };
}

/**
 * Wischgeste auf dem Rad: liefert Richtung und Stärke, nie ein Ergebnis.
 * onFling({dir, strength}) wird bei Loslassen aufgerufen; ein Antippen gilt als mittlere Drehung.
 */
export function bindGesture(el, onFling) {
  let start = null;
  el.addEventListener("pointerdown", e => {
    start = { x: e.clientX, y: e.clientY, t: performance.now() };
    el.setPointerCapture?.(e.pointerId);
  });
  el.addEventListener("pointerup", e => {
    if (!start) return;
    const dx = e.clientX - start.x, dy = e.clientY - start.y, dt = Math.max(16, performance.now() - start.t);
    const r = el.getBoundingClientRect();
    // oberhalb der Mitte nach rechts wischen = im Uhrzeigersinn, unterhalb umgekehrt
    const above = start.y < r.top + r.height / 2;
    const along = Math.abs(dx) >= Math.abs(dy) ? dx * (above ? 1 : -1) : dy * (start.x > r.left + r.width / 2 ? 1 : -1);
    const dist = Math.hypot(dx, dy);
    start = null;
    if (dist < 8) { onFling({ dir: 1, strength: 0.5 }); return; }
    onFling({ dir: along >= 0 ? 1 : -1, strength: Math.min(1, dist / dt / 2) });
  });
  el.addEventListener("pointercancel", () => { start = null; });
}
