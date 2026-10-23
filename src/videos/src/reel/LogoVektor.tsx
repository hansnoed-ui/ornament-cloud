// Das Logo am Ende der PHORMA-II-Aufnahme als Vektor, deckungsgleich nachgezeichnet: dieselbe Zeichnung wie alpha/sketchory/signet.js
// (Re-entry-Schlaufe LA = 1, LB = 0,45, LK = 1,2, LOFF = −0,84, 420 px, Strich 3 px, Punkt 11 px; Schriftzug Instrument Sans 400, 52 px, gesperrt 0,14 em),
// gezeichnet für 1080 × 1920 und um (1350 − 1920) / 2 nach oben verschoben wie im Export (1080 × 1350). Gegen das Bild 162 der Aufnahme geprüft.
// Wunsch vom 23. Oktober 2026: «Das Logo ganz am Schluss bei Stillstand war noch etwas verpixelt» – das komprimierte Standbild, vergrössert und aufgehellt.
import React from "react";
import { SANS } from "../neubau/Teile";

const LA = 1, LB = 0.45, LK = 1.2, LOFF = -0.84;
const punkt = (t: number): [number, number] => { const r = LB + LA * Math.cos(t); return [LK * r * Math.cos(t) + LOFF, LK * r * Math.sin(t)]; };
const PUNKTE = Array.from({ length: 721 }, (_, i) => punkt((i / 720) * Math.PI * 2));
const XS = PUNKTE.map((p) => p[0]), YS = PUNKTE.map((p) => p[1]);
const MX = (Math.min(...XS) + Math.max(...XS)) / 2, MY = (Math.min(...YS) + Math.max(...YS)) / 2;
const M = 420 / Math.max(Math.max(...XS) - Math.min(...XS), Math.max(...YS) - Math.min(...YS));
const VERSATZ = (1350 - 1920) / 2;
const bild = ([x, y]: [number, number]): [number, number] => [540 + (x - MX) * M, 870 + VERSATZ + (y - MY) * M];
const PFAD = PUNKTE.map((p, i) => `${i ? "L" : "M"}${bild(p).map((v) => v.toFixed(2)).join(" ")}`).join("") + "Z";

// Lauf des Punkts, gemessen in der Aufnahme: bei Bild 162 steht er bei t = 5,596 und läuft 0,0929 je Bild weiter
export const PUNKT_BEI = 162, PUNKT_T = 5.596, PUNKT_SCHRITT = 0.0929;
const SCHRIFT = 52, SPERRUNG = 0.14 * SCHRIFT, OBEN = 1175 + VERSATZ, KASTEN_H = 52 * 1.3;

export const LogoVektor: React.FC<{ f: number; tinte: string; punktFarbe: string }> = ({ f, tinte, punktFarbe }) => {
  const [px, py] = bild(punkt(PUNKT_T + (f - PUNKT_BEI) * PUNKT_SCHRITT));
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1350 }}>
      <svg width={1080} height={1350} style={{ position: "absolute", inset: 0 }}>
        <path d={PFAD} fill="none" stroke={tinte} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={px} cy={py} r={11} fill={punktFarbe} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: OBEN, height: KASTEN_H, display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: SANS, fontWeight: 400, fontSize: SCHRIFT, lineHeight: 1, letterSpacing: SPERRUNG, fontKerning: "none", color: tinte }}>
        {/* die Sperrung steht auch hinter dem letzten Zeichen: so weit nach links, dass der Schriftzug mittig steht wie auf der Leinwand */}
        <span style={{ marginRight: -SPERRUNG }}>ornament<span style={{ color: punktFarbe }}>.</span>cloud</span>
      </div>
    </div>
  );
};
