// Spin-Physik des Doppelrads.
//
// Jeder Ring läuft nach dem Loslassen auf einer eigenen Auslaufkurve
//     θ(t) = θ₀ + richtung · D · (1 − (1 − t/T)ⁿ)
// Sie beginnt mit der Geschwindigkeit der Geste (θ'(0) = n · D / T) und endet mit
// Geschwindigkeit null genau auf dem Zielwinkel (θ(T) = Ziel + k · 360°).
// Anzahl Umdrehungen k, Dauer T und Bremsexponent n werden so gewählt, dass beides passt:
// kein sichtbares Nachkorrigieren, kein Einrasten. Die Geste bestimmt nur den Weg, nie das Ziel.

import { mod } from "./geometry.js";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/**
 * Plant den Auslauf eines Rings.
 * @param from        aktuelle Drehung (Grad)
 * @param velocity    Anfangsgeschwindigkeit (Grad/s, Vorzeichen = Richtung)
 * @param target      Zielwinkel 0…360 (Platz auf der Achse)
 * @param prefDuration gewünschte Dauer (s)
 * @param n           [min, bevorzugt, max] Bremsexponent
 */
export function planRing({ from, velocity, target, prefDuration, n = [2.2, 3, 4.2], minDuration = 2.2, maxDuration = 6.8, minDistance = 30 }) {
  const dir = velocity < 0 ? -1 : 1;
  const w = Math.max(Math.abs(velocity), 1);
  const base = dir > 0 ? mod(target - from, 360) : mod(from - target, 360);
  const [nMin, nPref, nMax] = n;

  let best = null;
  for (let k = 0; k <= 40; k += 1) {
    const D = base + 360 * k;
    if (D < minDistance) continue;
    const lo = Math.max(minDuration, (nMin * D) / w);
    const hi = Math.min(maxDuration, (nMax * D) / w);
    if (lo > hi) continue;
    const T = clamp(prefDuration, lo, hi);
    const ex = (w * T) / D;
    const score = Math.abs(T - prefDuration) + 0.3 * Math.abs(ex - nPref);
    if (!best || score < best.score) best = { D, T, n: ex, score, exact: true };
  }
  if (!best) {
    // Sehr schwache oder sehr heftige Geste: Dauer im erlaubten Bereich, Geschwindigkeit so nah wie möglich.
    for (let k = 0; k <= 40; k += 1) {
      const D = base + 360 * k;
      if (D < minDistance) continue;
      const T = clamp((nPref * D) / w, minDuration, maxDuration);
      const score = Math.abs((w * T) / D - nPref);
      if (!best || score < best.score) best = { D, T, n: nPref, score, exact: false };
    }
  }
  return { from, dir, D: best.D, T: best.T, n: best.n, to: from + dir * best.D, target, velocityMatched: best.exact };
}

/** Drehung des Rings zur Zeit t (s) seit Beginn des Auslaufs. */
export function positionAt(plan, t) {
  const s = clamp(t / plan.T, 0, 1);
  return plan.from + plan.dir * plan.D * (1 - Math.pow(1 - s, plan.n));
}

/** Winkelgeschwindigkeit (Grad/s) zur Zeit t. */
export function velocityAt(plan, t) {
  const s = clamp(t / plan.T, 0, 1);
  return (plan.dir * plan.D * plan.n * Math.pow(1 - s, plan.n - 1)) / plan.T;
}

/**
 * Plant beide Ringe. Der angefasste Ring übernimmt die Geste, der andere läuft gegenläufig,
 * schwächer, mit anderer Bremskurve und etwas anderer Dauer.
 * @param grabbed "artist" | "theorist"
 * @param rand    Zufallsquelle nur für die Bahn (nicht für die Auswahl)
 */
export function planSpin({ artistFrom, theoristFrom, artistTarget, theoristTarget, grabbed = "artist", velocity, reducedMotion = false, rand = Math.random }) {
  if (reducedMotion) {
    const short = (from, target, dir) => ({ from, dir, D: dir > 0 ? mod(target - from, 360) : mod(from - target, 360) });
    const a = short(artistFrom, artistTarget, velocity < 0 ? -1 : 1);
    const t = short(theoristFrom, theoristTarget, velocity < 0 ? 1 : -1);
    const make = p => ({ ...p, T: 0.9, n: 2, to: p.from + p.dir * p.D, velocityMatched: false });
    const artist = make(a), theorist = make(t);
    return { artist, theorist, duration: 0.9 };
  }

  const w = Math.abs(velocity);
  const strength = clamp((w - 240) / 1800, 0, 1);          // 0 = sanft, 1 = kräftiger Flick
  const prefMain = 2.8 + 3 * strength;                     // 2,8 … 5,8 s
  const offset = (0.35 + 0.5 * rand()) * (rand() < 0.5 ? -1 : 1);
  const ratio = 0.72 + 0.14 * rand();                      // Gegenring etwas träger
  const other = -velocity * ratio;

  const mainN = [2.2, 3.0, 4.2], otherN = [1.8, 2.4, 3.6];
  const main = grabbed === "artist"
    ? { from: artistFrom, target: artistTarget }
    : { from: theoristFrom, target: theoristTarget };
  const counter = grabbed === "artist"
    ? { from: theoristFrom, target: theoristTarget }
    : { from: artistFrom, target: artistTarget };

  const mainPlan = planRing({ ...main, velocity, prefDuration: prefMain, n: mainN });
  const counterPlan = planRing({ ...counter, velocity: other, prefDuration: prefMain + offset, n: otherN });
  const artist = grabbed === "artist" ? mainPlan : counterPlan;
  const theorist = grabbed === "artist" ? counterPlan : mainPlan;
  return { artist, theorist, duration: Math.max(artist.T, theorist.T) };
}
