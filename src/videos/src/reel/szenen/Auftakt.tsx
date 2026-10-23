// Auftakt (Tinte): «Was bringst du mit?» auf den Schlag – erst jedes Wort allein und bildfüllend, harte Schnitte;
// dann die ganze Frage als Block, das Fragezeichen in der Blaupause (Hochformate: vier Zeilen, Querformat: zwei).
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import daten from "../data/reel.json";
import { useLage } from "../Format";
import { C, Grund, klemm, weich } from "../Teile";

export const AUFTAKT = 90;
const WORT = 11;                 // Bilder je Wort
const BLOCK = 4 * WORT + 2;      // ab hier die ganze Frage

const Frage: React.FC<{ text: string; letztes: boolean; faden: string }> = ({ text, letztes, faden }) => <>{text}{letztes ? <span style={{ color: faden }}>?</span> : null}</>;

export const Auftakt: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLage();
  const c = C("dunkel");
  const woerter = daten.frage.replace(/\?$/, "").split(" ");
  const i = Math.floor(f / WORT);
  if (f < BLOCK) {
    const w = woerter[Math.min(i, woerter.length - 1)];
    const letztes = i >= woerter.length - 1;
    // so gross, dass das Wort die Breite füllt (Instrument Sans 500: etwa 0,47 em je Zeichen), höchstens 420 px
    const g = Math.min(420, L.h * 0.6, (L.w - 2 * L.rand) / ((w.length + (letztes ? 0.6 : 0)) * 0.47));
    const k = f - i * WORT;
    return (
      <Grund m="dunkel">
        <div style={{ position: "absolute", left: L.rand - g * 0.04, top: L.mitteY - g * 0.55, fontWeight: 500, fontSize: g, letterSpacing: "-0.05em", lineHeight: 1, whiteSpace: "nowrap",
          scale: interpolate(k, [0, WORT], [1.06, 1], { ...klemm, easing: weich }), transformOrigin: "0 50%" }}>
          <Frage text={w} letztes={letztes} faden={c.faden} />
        </div>
      </Grund>
    );
  }
  const k = f - BLOCK;
  const zeilen = L.quer ? [`${woerter[0]} ${woerter[1]}`, `${woerter[2]} ${woerter[3]}`] : woerter;
  const g = L.quer ? 260 : Math.min(228, (L.h - 220) / (zeilen.length * 0.94));
  const hoehe = zeilen.length * g * 0.94;
  const oben = L.mitteY - hoehe / 2 - 30;
  return (
    <Grund m="dunkel">
      <div style={{ position: "absolute", left: L.rand - 8, right: 40, top: oben, fontWeight: 500, fontSize: g, letterSpacing: "-0.05em", lineHeight: 0.94 }}>
        {zeilen.map((w, n) => (
          <div key={n} style={{ opacity: interpolate(k, [n * 2, n * 2 + 4], [0, 1], klemm) }}>
            <Frage text={w} letztes={n === zeilen.length - 1} faden={c.faden} />
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", left: L.rand, top: oben + hoehe + 60, width: L.quer ? 1200 : L.w - 2 * L.rand, height: 3, backgroundColor: c.faden, transformOrigin: "0 50%",
        scale: `${interpolate(k, [6, 30], [0, 1], { ...klemm, easing: weich })} 1` }} />
    </Grund>
  );
};
