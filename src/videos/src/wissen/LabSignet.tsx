// Intro und Outro im Look des Labs (Landing-Page beta/lab/): schwarzer Grund, die Re-entry-Schlaufe in Weiss, der Punkt im Blau des Labs,
// darunter «ornament.lab». Nur für dieses Video; die gemeinsame Vorlage (vorlage/Signet.tsx, «ornament.cloud» auf hellem Grund) bleibt unverändert.
// Geometrie der Schlaufe wie in der Vorlage (r = LB + LA · cos t).
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { SANS, SERIF } from "../vorlage/stil";
import { LAB } from "./farben";

const klemm = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const weich = Easing.bezier(0.16, 1, 0.3, 1);
const LA = 1, LB = 0.45, LK = 1.2, LOFF = -0.84;
const punkt = (t: number): [number, number] => { const r = LB + LA * Math.cos(t); return [LK * r * Math.cos(t) + LOFF, LK * r * Math.sin(t)]; };
const PUNKTE = Array.from({ length: 361 }, (_, i) => punkt((i / 360) * Math.PI * 2));
const xs = PUNKTE.map((p) => p[0]), ys = PUNKTE.map((p) => p[1]);
const MX = (Math.min(...xs) + Math.max(...xs)) / 2, MY = (Math.min(...ys) + Math.max(...ys)) / 2;
const MASS = 420 / Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
const CY = 560;
const bild = ([x, y]: [number, number]) => [540 + (x - MX) * MASS, CY + (y - MY) * MASS] as const;
const PFAD = PUNKTE.map((p, i) => `${i ? "L" : "M"}${bild(p).map((v) => v.toFixed(1)).join(",")}`).join("");
const UNTEN = Math.max(...PUNKTE.map((p) => bild(p)[1]));

/** kopf: im Intro der Titel und eine Zeile darunter (blendet ein, wenn die Schlaufe steht); dauer: Länge in Bildern (blendet am Ende aus) */
export const LabSignet: React.FC<{ dauer: number; kopf?: { titel: string; unter: string } | null; tempo?: number }> = ({ dauer, kopf = null, tempo = 1 }) => {
  const b = useCurrentFrame(), f = b * tempo;
  const gezeichnet = interpolate(f, [6, 46], [0, 1], { ...klemm, easing: Easing.bezier(0.45, 0, 0.25, 1) });
  const lauf = Math.max(0, f - 34) / 60;
  const [px, py] = bild(punkt(-Math.PI / 2 + lauf * Math.PI * 2));
  const name = interpolate(f, [36, 64], [0, 1], klemm);
  const aus = interpolate(b, [dauer - 14, dauer], [1, 0], klemm);
  const k = kopf ? interpolate(f, [58, 86], [0, 1], klemm) : 0;
  return (
    <AbsoluteFill style={{ backgroundColor: LAB.grund, opacity: aus }}>
      <svg width={1080} height={1350} style={{ position: "absolute", inset: 0 }}>
        <path d={PFAD} fill="none" stroke={LAB.tinte} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - gezeichnet} />
        <circle cx={px} cy={py} r={14} fill={LAB.blau} opacity={interpolate(f, [34, 42], [0, 1], klemm)} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: UNTEN + 44, textAlign: "center", fontFamily: SANS, fontWeight: 400, fontSize: 50,
        letterSpacing: "0.14em", marginRight: "-0.14em", color: LAB.tinte, opacity: name, translate: `0 ${interpolate(f, [36, 64], [14, 0], { ...klemm, easing: weich })}px` }}>
        ornament<span style={{ color: LAB.blau }}>.</span>lab
      </div>
      {kopf ? (
        <div style={{ position: "absolute", left: 90, right: 90, top: UNTEN + 170, textAlign: "center", opacity: k, translate: `0 ${(1 - k) * 18}px` }}>
          <div style={{ fontFamily: SERIF, fontSize: 92, lineHeight: 1, letterSpacing: "-0.02em", color: LAB.tinte }}>{kopf.titel}</div>
          <div style={{ fontFamily: SANS, fontSize: 34, marginTop: 22, color: LAB.leise }}>{kopf.unter}</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
