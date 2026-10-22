// Die fünf Antworten als Walze (Papier): sie laufen zwischen zwei Haarlinien durch, werden langsamer und bleiben auf «ein Bild» stehen;
// die Antwort wird blau unterstrichen wie der aktive Punkt der Navigation auf /b/.
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import daten from "../data/reel.json";
import { C, Grund, RAND, klemm, weich } from "../Teile";

export const WAHLEN = 105;
const ZEILE = 168, MITTE = 1000, RUNDEN = 2;
const LANDUNG = 72;

export const Wahlen: React.FC = () => {
  const f = useCurrentFrame();
  const c = C("hell");
  const n = daten.woerter.length;
  const ziel = RUNDEN * n;   // landet auf woerter[0], «ein Bild»
  const p = interpolate(f, [4, LANDUNG], [0, ziel], { ...klemm, easing: Easing.bezier(0.3, 0.1, 0.1, 1) });
  const strich = interpolate(f, [LANDUNG + 2, LANDUNG + 16], [0, 1], { ...klemm, easing: weich });
  return (
    <Grund m="hell">
      <div style={{ position: "absolute", left: RAND, right: RAND, top: 440, fontWeight: 500, fontSize: 60, letterSpacing: "-0.02em", color: c.grau,
        opacity: interpolate(f, [0, 8], [0, 1], klemm), translate: `0 ${interpolate(f, [0, 16], [20, 0], { ...klemm, easing: weich })}px` }}>
        {daten.frage}
      </div>
      {/* die Walze */}
      <div style={{ position: "absolute", left: 0, right: 0, top: MITTE - 2.2 * ZEILE, height: 4.4 * ZEILE, overflow: "hidden",
        maskImage: "linear-gradient(transparent, #000 32%, #000 68%, transparent)", WebkitMaskImage: "linear-gradient(transparent, #000 32%, #000 68%, transparent)" }}>
        {Array.from({ length: ziel + 4 }, (_, k) => {
          const d = k - p;
          if (Math.abs(d) > 3) return null;
          return (
            <div key={k} style={{ position: "absolute", left: RAND, top: 2.2 * ZEILE + d * ZEILE - ZEILE / 2, height: ZEILE, display: "flex", alignItems: "center",
              fontWeight: 500, fontSize: 132, letterSpacing: "-0.035em", whiteSpace: "nowrap",
              color: Math.abs(d) < 0.5 ? c.tinte : c.grau, opacity: 1 - Math.min(1, Math.abs(d)) * 0.55 }}>
              {daten.woerter[k % n]}
            </div>
          );
        })}
      </div>
      {/* die Haarlinien um die Zeile der Wahl */}
      {[-1, 1].map((s) => (
        <div key={s} style={{ position: "absolute", left: RAND, right: RAND, top: MITTE + (s * ZEILE) / 2, height: 2, backgroundColor: c.linie,
          transformOrigin: "0 50%", scale: `${interpolate(f, [0, 18], [0, 1], { ...klemm, easing: weich })} 1` }} />
      ))}
      <div style={{ position: "absolute", left: RAND, top: MITTE + 62, width: 420, height: 6, backgroundColor: c.faden, transformOrigin: "0 50%", scale: `${strich} 1` }} />
    </Grund>
  );
};
