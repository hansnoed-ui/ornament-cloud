// Schluss (Tinte): die Logo-Animation von Christian aus PHORMA III (Export vom 19. Oktober 2026, 14:10, 1920 × 1080): die Fäden ziehen sich
// zur Re-entry-Schlaufe zusammen, «ornament.cloud» tippt sich. Hochkant die Mitte ausgeschnitten und vergrössert; der Punkt von Orange in die
// Blaupause gedreht (hue-rotate, das Grau bleibt grau), wie das Signet auf /b/. Die Animation zuckt zwischendurch (gewollt); ab Bild 160 steht sie still,
// in einem ruhigen Moment, bevor die Schlaufe am Ende wieder zerfällt.
// Darunter die Frage, blau unterstrichen – die Einladung auf die Seite.
import React from "react";
import { Freeze, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Video } from "@remotion/media";
import daten from "../data/reel.json";
import { C, Grund, klemm, weich } from "../Teile";

const STILL = 160;            // ab hier steht das Logo (das letzte ruhige Bild vor dem Zerfall)
export const SCHLUSS = STILL + 30;
const AUSSCHNITT = { x: 515, y: 0, seite: 900 };   // Bildpunkte im Querformat
const M = 1080 / AUSSCHNITT.seite;

export const Schluss: React.FC = () => {
  const f = useCurrentFrame();
  const c = C("dunkel");
  return (
    <Grund m="dunkel">
      <div style={{ position: "absolute", left: 0, top: 360, width: 1080, height: 1080, overflow: "hidden" }}>
        <Freeze frame={STILL} active={f >= STILL}>
          <Video src={staticFile("reel/phorma-iii-logo.mp4")} muted
            style={{ position: "absolute", left: -AUSSCHNITT.x * M, top: -AUSSCHNITT.y * M, width: 1920 * M, height: 1080 * M, maxWidth: "none", filter: "hue-rotate(200deg) saturate(1.4)" }} />
        </Freeze>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1500, display: "flex", justifyContent: "center", opacity: interpolate(f, [136, 146], [0, 1], klemm),
        translate: `0 ${interpolate(f, [136, 154], [24, 0], { ...klemm, easing: weich })}px` }}>
        <div style={{ position: "relative", fontSize: 60, letterSpacing: "-0.01em", color: c.grau, paddingBottom: 14 }}>
          {daten.frage}
          {/* unterstrichen wie der aktive Punkt der Navigation */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, backgroundColor: c.faden, transformOrigin: "0 50%",
            scale: `${interpolate(f, [146, 164], [0, 1], { ...klemm, easing: weich })} 1` }} />
        </div>
      </div>
    </Grund>
  );
};
