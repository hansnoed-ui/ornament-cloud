// Die vier Prüfraster wie die Liste der Startseite: Zeichen, Name, Stand rechts, Kurzsatz in Grau, Haarlinien.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import daten from "../data/neubau.json";
import { Abschnitt, F, Linie, OBEN, Papier, RAND, Zeichen, ein, klemm } from "../Teile";

export const RASTER = 240;

export const Raster: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Papier>
      <Abschnitt f={f} zeichen={daten.raster.zeichen} titel={daten.raster.titel} text={daten.raster.text} />
      <div style={{ position: "absolute", left: RAND, right: RAND, top: OBEN + 340 }}>
        {daten.raster.liste.map((r, i) => {
          const s = 34 + i * 22;
          return (
            <div key={r.name}>
              <Linie f={f} a={s - 4} />
              <div style={{ padding: "34px 0 38px", display: "flex", gap: 28 }}>
                <div style={{ paddingTop: 4, opacity: interpolate(f, [s, s + 8], [0, 1], klemm) }}>
                  <Zeichen markup={r.zeichen} groesse={60} p={interpolate(f, [s, s + 24], [0, 1], klemm)} dicke={4} />
                </div>
                <div style={{ flex: 1, ...ein(f, s + 4) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20 }}>
                    <span style={{ fontWeight: 500, fontSize: 50, letterSpacing: "-0.01em", lineHeight: 1.12 }}>{r.name}</span>
                    <span style={{ fontSize: 30, color: F.grau, whiteSpace: "nowrap" }}>{r.stand}</span>
                  </div>
                  <div style={{ marginTop: 10, fontSize: 38, lineHeight: 1.3, color: F.grau }}>{r.kurz}</div>
                </div>
              </div>
            </div>
          );
        })}
        <Linie f={f} a={34 + 4 * 22} />
      </div>
    </Papier>
  );
};
