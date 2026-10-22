// Die Kopfzeile des Neubaus über allen Szenen: Signet mit Schlaufe und Punkt, «ornament.cloud», darunter die Hauptnavigation;
// der Punkt der Szene ist wie auf der Seite blau unterstrichen (aria-current). Darunter die Haarlinie.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import daten from "./data/neubau.json";
import { F, RAND, Signet, klemm, weich } from "./Teile";

/** aktiv: Index in daten.nav je Bild (oder -1) */
export const Kopf: React.FC<{ aktiv: (f: number) => number; dauer: number }> = ({ aktiv, dauer }) => {
  const f = useCurrentFrame();
  const a = aktiv(f);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, opacity: interpolate(f, [0, 14, dauer - 14, dauer], [0, 1, 1, 0], klemm) }}>
      <div style={{ position: "absolute", left: RAND, top: 112, display: "flex", alignItems: "center", gap: 20 }}>
        <Signet groesse={58} gezeichnet={1} fuellung={1} lauf={f / 240} b={0.6 + 0.3 * Math.sin(f / 40)} dicke={3.2} />
        <div style={{ fontWeight: 500, fontSize: 42, letterSpacing: "0.01em" }}>{daten.name}</div>
      </div>
      <div style={{ position: "absolute", left: RAND, right: RAND - 20, top: 196, display: "flex", flexWrap: "wrap", columnGap: 30, fontSize: 33 }}>
        {daten.nav.map((n, i) => {
          const an = i === a;
          return (
            <div key={n} style={{ position: "relative", padding: "4px 0", color: an ? F.faden : F.tinte }}>
              {n}
              <div style={{
                position: "absolute", left: 0, right: 0, bottom: -2, height: 3, backgroundColor: F.faden, transformOrigin: "0 50%",
                scale: `${an ? 1 : 0} 1`,
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 275, height: 2, backgroundColor: F.linie, transformOrigin: "0 50%", scale: `${interpolate(f, [0, 24], [0, 1], { ...klemm, easing: weich })} 1` }} />
    </div>
  );
};
