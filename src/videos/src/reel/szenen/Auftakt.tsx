// Auftakt (Tinte): «Was bringst du mit?» auf den Schlag – erst jedes Wort allein und bildfüllend, harte Schnitte;
// dann die ganze Frage als Block, das Fragezeichen in der Blaupause.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import daten from "../data/reel.json";
import { C, Grund, RAND, klemm, weich } from "../Teile";

export const AUFTAKT = 90;
const WORT = 11;                 // Bilder je Wort
const BLOCK = 4 * WORT + 2;      // ab hier die ganze Frage

export const Auftakt: React.FC = () => {
  const f = useCurrentFrame();
  const c = C("dunkel");
  const woerter = daten.frage.replace(/\?$/, "").split(" ");
  const i = Math.floor(f / WORT);
  if (f < BLOCK) {
    const w = woerter[Math.min(i, woerter.length - 1)];
    const letztes = i >= woerter.length - 1;
    // so gross, dass das Wort die Breite füllt (Instrument Sans 500: etwa 0,47 em je Zeichen)
    const g = Math.min(420, (1080 - 2 * RAND) / ((w.length + (letztes ? 0.6 : 0)) * 0.47));
    const k = f - i * WORT;
    return (
      <Grund m="dunkel">
        <div style={{ position: "absolute", left: RAND - g * 0.04, top: 960 - g * 0.55, fontWeight: 500, fontSize: g, letterSpacing: "-0.05em", lineHeight: 1, whiteSpace: "nowrap",
          scale: interpolate(k, [0, WORT], [1.06, 1], { ...klemm, easing: weich }), transformOrigin: "0 50%" }}>
          {w}{letztes ? <span style={{ color: c.faden }}>?</span> : null}
        </div>
      </Grund>
    );
  }
  const k = f - BLOCK;
  return (
    <Grund m="dunkel">
      <div style={{ position: "absolute", left: RAND - 8, right: 40, top: 560, fontWeight: 500, fontSize: 228, letterSpacing: "-0.05em", lineHeight: 0.94 }}>
        {woerter.map((w, n) => (
          <div key={n} style={{ opacity: interpolate(k, [n * 2, n * 2 + 4], [0, 1], klemm) }}>
            {w}{n === woerter.length - 1 ? <span style={{ color: c.faden }}>?</span> : null}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: RAND, top: 1520, width: 900, height: 3, backgroundColor: c.faden, transformOrigin: "0 50%",
        scale: `${interpolate(k, [6, 30], [0, 1], { ...klemm, easing: weich })} 1` }} />
    </Grund>
  );
};
