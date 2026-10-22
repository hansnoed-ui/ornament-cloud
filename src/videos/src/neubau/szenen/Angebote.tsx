// Die vier Leistungen wie die Kacheln der Startseite: Zeichen in der Blaupause, Name, Kurzsatz in Grau, Haarlinien statt Kästen.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import daten from "../data/neubau.json";
import { F, Linie, OBEN, Papier, RAND, Zeichen, ein, klemm } from "../Teile";

export const ANGEBOTE = 240;

export const Angebote: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Papier>
      <div style={{ position: "absolute", left: RAND, right: RAND, top: OBEN + 50, display: "flex", flexDirection: "column", gap: 0 }}>
        {daten.angebote.map((a, i) => {
          const s = 6 + i * 36;
          return (
            <div key={a.name}>
              {i > 0 ? <Linie f={f} a={s - 6} /> : null}
              <div style={{ padding: "40px 0 44px", display: "flex", gap: 36, alignItems: "flex-start" }}>
                <div style={{ paddingTop: 6, opacity: interpolate(f, [s, s + 8], [0, 1], klemm) }}>
                  <Zeichen markup={a.zeichen} groesse={88} p={interpolate(f, [s, s + 26], [0, 1], klemm)} dicke={4.5} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 62, letterSpacing: "-0.02em", lineHeight: 1.1, ...ein(f, s + 4) }}>{a.name}</div>
                  <div style={{ marginTop: 14, fontSize: 40, lineHeight: 1.3, color: F.grau, textWrap: "pretty", ...ein(f, s + 12) }}>{a.kurz}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Papier>
  );
};
