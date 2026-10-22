// Schluss (Tinte): eine Logo-Animation von Christian, darunter die Frage, blau unterstrichen – die Einladung auf die Seite.
// Zwei Fassungen (22. Oktober 2026, beide als «Logo?» geschickt):
//  ii  – PHORMA II (Export vom 21. Oktober 2026, 21:55, 1080 × 1350): die schillernde Montage fällt zu Rahmen zusammen, aus ihnen wird das Signet;
//        hochkant wie das Reel, ganz gezeigt. Standard.
//  iii – PHORMA III (Export vom 19. Oktober 2026, 14:10, 1920 × 1080): die Fäden ziehen sich zur Schlaufe, «ornament.cloud» tippt sich;
//        hochkant die Mitte ausgeschnitten und vergrössert.
// In beiden ist der Punkt von Orange in die Blaupause gedreht (hue-rotate, das Grau bleibt grau), wie das Signet auf /b/ – bei PHORMA II erst, wenn die
// schillernde Montage vorbei ist (sonst kippen ihre Farben); ab STILL steht das Bild,
// in einem ruhigen Moment, bevor die Animation am Ende zerfällt oder ausblendet.
import React from "react";
import { Freeze, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Video } from "@remotion/media";
import daten from "../data/reel.json";
import { C, Grund, klemm, weich } from "../Teile";

export type Logo = "ii" | "iii";
const HALT = 30;   // so lange steht das Logo am Ende
const FASSUNG = {
  // datei, letztes ruhiges Bild, Lage im Reel (Rahmen) und im Video (Ausschnitt), Beginn und Lage der Frage, Bilder, in denen der Punkt blau wird
  ii: { datei: "reel/phorma-ii-logo.mp4", still: 162, rahmen: { top: 285, hoehe: 1350 }, video: { left: 0, top: 0, breite: 1080, hoehe: 1350 }, frage: 150, frageTop: 1310, blau: [118, 138] },
  iii: { datei: "reel/phorma-iii-logo.mp4", still: 160, rahmen: { top: 360, hoehe: 1080 }, video: { left: -515 * 1.2, top: 0, breite: 1920 * 1.2, hoehe: 1080 * 1.2 }, frage: 136, frageTop: 1500, blau: [0, 0] },
} as const;
export const schlussDauer = (logo: Logo) => FASSUNG[logo].still + HALT;

export const Schluss: React.FC<{ logo?: Logo }> = ({ logo = "ii" }) => {
  const f = useCurrentFrame();
  const c = C("dunkel");
  const v = FASSUNG[logo];
  return (
    <Grund m="dunkel">
      <div style={{ position: "absolute", left: 0, top: v.rahmen.top, width: 1080, height: v.rahmen.hoehe, overflow: "hidden" }}>
        <Freeze frame={v.still} active={f >= v.still}>
          <Video src={staticFile(v.datei)} muted
            style={{ position: "absolute", left: v.video.left, top: v.video.top, width: v.video.breite, height: v.video.hoehe, maxWidth: "none", filter: `hue-rotate(${interpolate(f, [v.blau[0], v.blau[1] + 0.001], [0, 200], klemm)}deg) saturate(${interpolate(f, [v.blau[0], v.blau[1] + 0.001], [1, 1.4], klemm)})` }} />
        </Freeze>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: v.frageTop, display: "flex", justifyContent: "center", opacity: interpolate(f, [v.frage, v.frage + 10], [0, 1], klemm),
        translate: `0 ${interpolate(f, [v.frage, v.frage + 18], [24, 0], { ...klemm, easing: weich })}px` }}>
        <div style={{ position: "relative", fontSize: 60, letterSpacing: "-0.01em", color: c.grau, paddingBottom: 14 }}>
          {daten.frage}
          {/* unterstrichen wie der aktive Punkt der Navigation */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, backgroundColor: c.faden, transformOrigin: "0 50%",
            scale: `${interpolate(f, [v.frage + 10, v.frage + 28], [0, 1], { ...klemm, easing: weich })} 1` }} />
        </div>
      </div>
    </Grund>
  );
};
