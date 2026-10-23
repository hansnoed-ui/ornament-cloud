// Schluss (Tinte): eine Logo-Animation von Christian, darunter die Frage, blau unterstrichen – die Einladung auf die Seite.
// Zwei Fassungen (22. Oktober 2026, beide als «Logo?» geschickt):
//  ii  – PHORMA II (Export vom 21. Oktober 2026, 21:55, 1080 × 1350): die schillernde Montage fällt zu Rahmen zusammen, aus ihnen wird das Signet;
//        hochkant wie das Reel, ganz gezeigt. Standard.
//  iii – PHORMA III (Export vom 19. Oktober 2026, 14:10, 1920 × 1080): die Fäden ziehen sich zur Schlaufe, «ornament.cloud» tippt sich;
//        hochkant die Mitte ausgeschnitten und vergrössert.
// In beiden ist der Punkt von Orange in die Blaupause gedreht (hue-rotate, das Grau bleibt grau), wie das Signet auf /b/ – bei PHORMA II erst, wenn die
// schillernde Montage vorbei ist (sonst kippen ihre Farben); ab STILL steht das Bild,
// in einem ruhigen Moment, bevor die Animation am Ende zerfällt oder ausblendet. PHORMA II beginnt seit dem 23. Oktober 2026 erst nach der Montage, bei Bild 92 (ab dort ist der Grund schwarz)
// (Wunsch: «Vor der Logo Animation hängt noch eine Montage-Sequenz: die kann weg»). PHORMA II: ab Bild 150 blendet die Vektorzeichnung desselben Logos
// darüber (LogoVektor.tsx), weil das vergrösserte Standbild des Videos pixelig war; der Punkt läuft dann scharf weiter. Bei PHORMA II fährt das Bild ausserdem nach der Montage langsam auf das Logo zu
// und wird heller und kontrastreicher (Wunsch vom 23. Oktober 2026: «Besserer Kontrast beim Logo Schluss»): die feinen Linien und der Schriftzug werden kräftiger.
import React from "react";
import { Freeze, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Video } from "@remotion/media";
import daten from "../data/reel.json";
import { C, Grund, klemm, weich } from "../Teile";
import { LogoVektor } from "../LogoVektor";
import { useLage } from "../Format";

export type Logo = "ii" | "iii";
const HALT = 30;   // so lange steht das Logo am Ende
const FASSUNG = {
  // datei, Beginn in der Aufnahme (ab), letztes ruhiges Bild, Lage im Reel (Rahmen) und im Video (Ausschnitt), Beginn und Lage der Frage, Bilder, in denen der Punkt blau wird
  ii: { datei: "reel/phorma-ii-logo.mp4", ab: 92, still: 162, rahmen: { top: 285, hoehe: 1350 }, video: { left: 0, top: 0, breite: 1080, hoehe: 1350 }, frage: 150, frageTop: 1400, blau: [92, 98], vektor: [150, 158] as [number, number] | null, naeher: { von: 94, bis: 172, mass: 1.3, mitte: "50% 48.7%" }, hell: { helligkeit: 1.4, kontrast: 1.25 } },
  iii: { datei: "reel/phorma-iii-logo.mp4", ab: 0, still: 160, rahmen: { top: 360, hoehe: 1080 }, video: { left: -515 * 1.2, top: 0, breite: 1920 * 1.2, hoehe: 1080 * 1.2 }, frage: 136, frageTop: 1500, blau: [0, 0], vektor: null, naeher: { von: 0, bis: 1, mass: 1, mitte: "50% 50%" }, hell: { helligkeit: 1, kontrast: 1 } },
} as const;
export const schlussDauer = (logo: Logo) => FASSUNG[logo].still - FASSUNG[logo].ab + HALT;

export const Schluss: React.FC<{ logo?: Logo }> = ({ logo = "ii" }) => {
  const v = FASSUNG[logo];
  const L = useLage();
  // PHORMA II: die Mitte des Logos (540, 657 in der Aufnahme) kommt je Format auf L.logo.cy, in der Grösse L.logo.mass; PHORMA III nur im Hochformat 9:16
  const lage = logo === "ii"
    ? { left: L.w / 2 - 540, top: L.logo.cy - 657, mass: L.logo.mass, frageTop: L.logo.cy + (942 - 657) * L.logo.mass * 1.3 + 90 * L.logo.mass }
    : { left: 0, top: v.rahmen.top, mass: 1, frageTop: v.frageTop };
  // f: Bild in der Aufnahme (die Szene beginnt bei v.ab; alle Zeiten in FASSUNG sind Bilder der Aufnahme)
  const f = useCurrentFrame() + v.ab;
  const c = C("dunkel");
  return (
    <Grund m="dunkel">
      <div style={{ position: "absolute", left: lage.left, top: lage.top, width: 1080, height: v.rahmen.hoehe, overflow: "hidden",
        scale: lage.mass * interpolate(f, [v.naeher.von, v.naeher.bis], [1, v.naeher.mass], { ...klemm, easing: weich }), transformOrigin: v.naeher.mitte }}>
        {/* bei PHORMA II blendet die Vektorzeichnung des Logos über das Video, bevor es stillsteht: scharf bei jeder Grösse, der Punkt läuft weiter */}
        <Freeze frame={v.still - v.ab} active={f >= v.still}>
          <Video src={staticFile(v.datei)} trimBefore={v.ab} muted
            style={{ position: "absolute", left: v.video.left, top: v.video.top, width: v.video.breite, height: v.video.hoehe, maxWidth: "none", // erst heller, dann den Farbton drehen: so wird der orange Punkt das helle Blau von /b/ (#8fb0ff), statt in Türkis auszubrennen
              filter: `brightness(${interpolate(f, [v.blau[0], v.blau[1] + 0.001], [1, v.hell.helligkeit], klemm)}) contrast(${interpolate(f, [v.blau[0], v.blau[1] + 0.001], [1, v.hell.kontrast], klemm)}) `
              + `hue-rotate(${interpolate(f, [v.blau[0], v.blau[1] + 0.001], [0, 200], klemm)}deg) saturate(${interpolate(f, [v.blau[0], v.blau[1] + 0.001], [1, 1.4], klemm)})` }} />
        </Freeze>
        {v.vektor ? (
          <div style={{ position: "absolute", inset: 0, backgroundColor: f >= v.vektor[1] ? c.papier : "transparent", opacity: interpolate(f, [v.vektor[0], v.vektor[1]], [0, 1], klemm) }}>
            <LogoVektor f={f} tinte={c.tinte} punktFarbe={c.faden} />
          </div>
        ) : null}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: lage.frageTop, display: "flex", justifyContent: "center", opacity: interpolate(f, [v.frage, v.frage + 10], [0, 1], klemm),
        translate: `0 ${interpolate(f, [v.frage, v.frage + 18], [24, 0], { ...klemm, easing: weich })}px` }}>
        <div style={{ position: "relative", fontSize: 64, letterSpacing: "-0.01em", color: c.tinte, paddingBottom: 14 }}>
          {daten.frage}
          {/* unterstrichen wie der aktive Punkt der Navigation */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 4, backgroundColor: c.faden, transformOrigin: "0 50%",
            scale: `${interpolate(f, [v.frage + 10, v.frage + 28], [0, 1], { ...klemm, easing: weich })} 1` }} />
        </div>
      </div>
    </Grund>
  );
};
