// Die fünf Antworten der Startseite als Knöpfe (Papier); ein Tippen wählt «ein Bild», der Knopf füllt sich wie auf der Seite.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import daten from "../data/reel.json";
import { C, Grund, RAND, klemm, weich } from "../Teile";

export const WAHLEN = 90;
const TIPP = 56;

export const Wahlen: React.FC = () => {
  const f = useCurrentFrame();
  const c = C("hell");
  const voll = interpolate(f, [TIPP, TIPP + 4], [0, 1], klemm);
  return (
    <Grund m="hell">
      <div style={{ position: "absolute", left: RAND, right: RAND, top: 470, fontWeight: 500, fontSize: 64, letterSpacing: "-0.02em", color: c.grau, opacity: interpolate(f, [0, 6], [0, 1], klemm) }}>{daten.frage}</div>
      <div style={{ position: "absolute", left: RAND, right: RAND, top: 640, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 34 }}>
        {daten.woerter.map((w, i) => {
          const a = 4 + i * 5;
          const gewaehlt = i === 0;
          return (
            <div key={w} style={{ position: "relative", fontSize: 84, letterSpacing: "-0.01em", padding: "24px 56px 28px", borderRadius: 999, border: `3px solid ${gewaehlt && voll > 0 ? c.tinte : c.linie}`,
              backgroundColor: gewaehlt && voll > 0 ? c.tinte : c.papier, color: gewaehlt && voll > 0.5 ? c.papier : c.tinte,
              opacity: interpolate(f, [a, a + 6], [0, 1], klemm) * (gewaehlt ? 1 : interpolate(f, [TIPP, TIPP + 10], [1, 0.35], klemm)),
              scale: interpolate(f, [a, a + 12], [0.8, 1], { ...klemm, easing: weich }) * (gewaehlt ? interpolate(f, [TIPP - 3, TIPP, TIPP + 8], [1, 0.94, 1.04], klemm) : 1),
              transformOrigin: "0 50%", translate: `${gewaehlt ? interpolate(f, [TIPP, TIPP + 30], [0, 30], { ...klemm, easing: weich }) : 0}px 0` }}>
              {w}
              {gewaehlt ? (
                <div style={{ position: "absolute", left: "72%", top: "55%", width: 70, height: 70, marginLeft: -35, marginTop: -35, borderRadius: 999, border: `4px solid ${c.faden}`,
                  opacity: interpolate(f, [TIPP - 12, TIPP - 4, TIPP + 6, TIPP + 16], [0, 1, 1, 0], klemm), scale: interpolate(f, [TIPP - 12, TIPP, TIPP + 16], [1.6, 0.7, 1.8], klemm) }} />
              ) : null}
            </div>
          );
        })}
      </div>
    </Grund>
  );
};
