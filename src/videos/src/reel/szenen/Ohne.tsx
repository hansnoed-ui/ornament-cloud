// Was die Seite verspricht (Tinte): keine Cookies, keine Werbung, keine Tracker – auf den Schlag; dann «made in Switzerland» in der Blaupause.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import daten from "../data/reel.json";
import { useLage } from "../Format";
import { C, Grund, klemm, weich } from "../Teile";

export const OHNE = 90;

export const Ohne: React.FC = () => {
  const f = useCurrentFrame();
  const c = C("dunkel");
  const L = useLage();
  const oben = L.mitteY - 320;
  return (
    <Grund m="dunkel">
      <div style={{ position: "absolute", left: L.rand, right: L.rand, top: oben, display: "flex", flexDirection: "column", gap: 10 }}>
        {daten.ohne.map((w, i) => {
          const a = i * 10;
          return (
            <div key={w} style={{ fontWeight: 500, fontSize: 112, letterSpacing: "-0.03em", lineHeight: 1.08, overflow: "hidden" }}>
              <div style={{ translate: `0 ${interpolate(f, [a, a + 10], [100, 0], { ...klemm, easing: weich })}%` }}>
                {w}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: L.rand, top: oben + 480, fontSize: 64, letterSpacing: "-0.01em", color: c.faden, opacity: interpolate(f, [42, 50], [0, 1], klemm),
        translate: `0 ${interpolate(f, [42, 58], [30, 0], { ...klemm, easing: weich })}px` }}>{daten.swiss}</div>
    </Grund>
  );
};
