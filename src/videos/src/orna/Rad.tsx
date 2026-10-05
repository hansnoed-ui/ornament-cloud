// Das Doppelrad von ORNA, nachgezeichnet nach portfolio/nebeneinander-nacheinander/js/wheel.js:
// 1000er-Feld, Mitte 500, aussen die 20 Künstler:innen, innen die 20 Theoretiker:innen, gemeinsame Achse bei 12 Uhr.
// Die 40 Zeichen kommen unverändert aus symbols.js (über src/data/orna.json).
import React from "react";
import daten from "./data/orna.json";
import { FARBE } from "../vorlage/stil";

const C = 500;
const OUTER = { edge: 462, inner: 344, sym: 403, half: 42 };
const INNER = { edge: 326, inner: 208, sym: 267, half: 37 };
const SLOTS = 20;
const STEP = 18;

const polar = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
};
const tick = (r0: number, r1: number, deg: number) => {
  const [x0, y0] = polar(r0, deg);
  const [x1, y1] = polar(r1, deg);
  return `M${x0.toFixed(1)},${y0.toFixed(1)}L${x1.toFixed(1)},${y1.toFixed(1)}`;
};

type RingProps = {
  geo: typeof OUTER;
  offset: number;          // Zeichen 0–19 (Künstler:innen) oder 20–39 (Theoretiker:innen)
  drehung: number;         // Grad, im Uhrzeigersinn
  sichtbar: number;        // 0…1: wie viele Zeichen schon erschienen sind (nacheinander)
  treffer: number | null;  // Platz auf der Achse hervorheben, die übrigen treten zurück
  zurueck: number;         // 0…1: wie stark die übrigen zurücktreten
  strich: number;          // Faktor für die Strichstärke (das Bild ist kleiner als das 1000er-Feld)
};

const Ring: React.FC<RingProps> = ({ geo, offset, drehung, sichtbar, treffer, zurueck, strich }) => {
  let fein = "";
  let grenzen = "";
  for (let i = 0; i < SLOTS * 5; i++) if (i % 5) fein += tick(geo.edge, geo.edge - 7, (i * STEP) / 5 + STEP / 2);
  for (let i = 0; i < SLOTS; i++) {
    const a = i * STEP + STEP / 2;
    grenzen += tick(geo.edge, geo.edge - 16, a) + tick(geo.inner, geo.inner + 12, a);
  }
  return (
    <g style={{ rotate: `${drehung}deg`, transformOrigin: "500px 500px" }} fill="none" stroke={FARBE.text} strokeLinecap="round" strokeLinejoin="round">
      <circle cx={C} cy={C} r={geo.edge} strokeWidth={2.8 * strich} />
      <circle cx={C} cy={C} r={geo.inner} strokeWidth={1.8 * strich} opacity={0.85} />
      <path d={fein} strokeWidth={1.3 * strich} opacity={0.6} />
      <path d={grenzen} strokeWidth={2 * strich} opacity={0.9} />
      {Array.from({ length: SLOTS }, (_, i) => {
        const da = Math.min(1, Math.max(0, sichtbar * SLOTS - i));
        const hit = treffer === i;
        const o = da * (treffer === null || hit ? 1 : 1 - 0.6 * zurueck);
        return (
          <g key={i} transform={`rotate(${i * STEP} ${C} ${C}) translate(${C} ${C - geo.sym}) scale(${geo.half})`} opacity={o}
            className="zeichen" style={{ ["--s" as string]: `${((hit ? 3.6 : 2.6) * strich) / geo.half}` }}
            dangerouslySetInnerHTML={{ __html: daten.symbols[offset + i] }} />
        );
      })}
    </g>
  );
};

export type RadProps = {
  aussen: number;
  innen: number;
  sichtbar?: number;
  treffer?: { a: number; t: number } | null;
  zurueck?: number;
  achse?: number;          // 0…1: Achse oben einblenden
  groesse: number;         // Kantenlänge in px
};

export const Rad: React.FC<RadProps> = ({ aussen, innen, sichtbar = 1, treffer = null, zurueck = 0, achse = 1, groesse }) => {
  const strich = 1000 / groesse;   // Striche wie auf der Seite: Breite in Bildpixeln
  return (
    <svg viewBox="0 0 1000 1000" width={groesse} height={groesse} style={{ overflow: "visible" }}>
      <style>{`
        .zeichen path { fill: none; stroke: ${FARBE.text}; stroke-width: var(--s); }
        .zeichen .sym-over { stroke-width: calc(var(--s) * 0.7); }
        .zeichen .sym-ghost { opacity: .6; }
        .zeichen .sym-dot { fill: ${FARBE.text}; stroke: none; }
      `}</style>
      <circle cx={C} cy={C} r={484} fill="none" stroke={FARBE.text} strokeWidth={1.3 * strich} strokeDasharray={`${3 * strich} ${7 * strich}`} opacity={0.5} />
      <path d={`M${C - 150},${C}H${C + 150}M${C},${C - 150}V${C + 150}`} stroke={FARBE.text} strokeWidth={1.2 * strich} opacity={0.3} />
      <path d={`M${C - 14},${C}H${C + 14}M${C},${C - 14}V${C + 14}`} stroke={FARBE.text} strokeWidth={2 * strich} opacity={0.85} />
      <circle cx={C} cy={C} r={5} fill={FARBE.text} />
      <Ring geo={OUTER} offset={0} drehung={aussen} sichtbar={sichtbar} treffer={treffer?.a ?? null} zurueck={zurueck} strich={strich} />
      <Ring geo={INNER} offset={20} drehung={innen} sichtbar={sichtbar} treffer={treffer?.t ?? null} zurueck={zurueck} strich={strich} />
      {/* gemeinsame Achse: feine Linie von der Mitte nach oben und eine Marke über dem Rad */}
      <g opacity={achse}>
        <path d={`M${C},${C - 208}V${C - 470}`} stroke={FARBE.akzent} strokeWidth={2 * strich} opacity={0.85} />
        <path d={`M${C - 12},${C - 504}L${C + 12},${C - 504}L${C},${C - 482}Z`} fill={FARBE.akzent} />
      </g>
    </svg>
  );
};

/** Drehung, bei der Platz i auf der Achse steht */
export const zielDrehung = (i: number) => -i * STEP;
