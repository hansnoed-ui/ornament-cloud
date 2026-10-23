// «Ein Begriff, der Verbindung sucht» (Tinte): der Zettelkasten statt der Prüfraster (Wunsch vom 23. Oktober 2026) – das Feld 7 × 7 der Startseite,
// die Fäden wachsen leicht gebogen (wie b.js), dann leuchtet ein Zettel in der Blaupause auf, seine Nachbarn hell, die übrigen Fäden leise;
// darunter sein Titel und sein Leitsatz.
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import daten from "../data/reel.json";
import { SERIF } from "../../neubau/Teile";
import { C, Grund, RAND, Schlagzeile, Unterzeile, klemm, weich } from "../Teile";

export const ZETTEL = 135;
const AN = 62;                  // der Zettel leuchtet auf
const BREITE = 780, Z = BREITE / 7, LINKS = (1080 - BREITE) / 2, OBEN = 610;
const NR = daten.begriff.zettel.nr;

const mitte = (n: number): [number, number] => [((n - 1) % 7) * Z + Z / 2, Math.floor((n - 1) / 7) * Z + Z / 2];
/** wie b.js: leicht gebogen, immer zur selben Seite */
const faden = (a: number, b: number) => {
  const [x1, y1] = mitte(a), [x2, y2] = mitte(b);
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, k = Math.min(60 * (Z / 53), l * 0.22);
  const cx = (x1 + x2) / 2 - (dy / l) * k, cy = (y1 + y2) / 2 + (dx / l) * k;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
};
const nachbarn = new Set(daten.begriff.faeden.filter(([a, b]) => a === NR || b === NR).map(([a, b]) => (a === NR ? b : a)));

export const Zettel: React.FC = () => {
  const f = useCurrentFrame();
  const c = C("dunkel");
  const an = interpolate(f, [AN, AN + 6], [0, 1], klemm);
  const z = daten.begriff.zettel;
  return (
    <Grund m="dunkel">
      <Schlagzeile f={f} text={daten.begriff.satz} groesse={100} style={{ position: "absolute", left: RAND, right: RAND, top: 230 }} />
      <Unterzeile f={f} a={14} m="dunkel" {...daten.begriff.a} style={{ position: "absolute", left: RAND, right: RAND, top: 470 }} />
      <div style={{ position: "absolute", left: LINKS, top: OBEN, width: BREITE, height: BREITE }}>
        {Array.from({ length: 49 }, (_, i) => {
          const n = i + 1, s = 4 + ((n - 1) % 7) + Math.floor((n - 1) / 7);
          const aktiv = n === NR, nah = nachbarn.has(n);
          return (
            <div key={n} style={{
              position: "absolute", left: ((n - 1) % 7) * Z, top: Math.floor((n - 1) / 7) * Z, width: Z, height: Z, boxSizing: "border-box", marginLeft: -1, marginTop: -1,
              border: `2px solid ${c.linie}`, backgroundColor: aktiv && an > 0 ? c.faden : nah && an > 0 ? c.fadenHell : "transparent",
              opacity: interpolate(f, [s, s + 8], [0, 1], klemm), scale: aktiv ? interpolate(f, [AN - 2, AN + 3, AN + 12], [1, 1.12, 1], klemm) : 1,
            }}>
              <div style={{ position: "absolute", left: 10, top: 6, fontSize: 24, fontVariantNumeric: "tabular-nums", color: aktiv && an > 0.5 ? c.papier : c.grau }}>{n}</div>
            </div>
          );
        })}
        <svg width={BREITE} height={BREITE} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {daten.begriff.faeden.map(([a, b], i) => {
            const s = 16 + i * 2;
            const leise = a !== NR && b !== NR;
            return (
              <path key={`${a}-${b}`} d={faden(a, b)} fill="none" stroke={c.faden} strokeWidth={leise ? 3 : 4.5} strokeLinecap="round" pathLength={1} strokeDasharray="1 1"
                strokeDashoffset={1 - interpolate(f, [s, s + 24], [0, 1], { ...klemm, easing: Easing.inOut(Easing.cubic) })}
                opacity={leise ? interpolate(an, [0, 1], [1, 0.2]) : 1} />
            );
          })}
        </svg>
      </div>
      <div style={{ position: "absolute", left: RAND, right: RAND, top: OBEN + BREITE + 50 }}>
        <div style={{ display: "flex", gap: 22, alignItems: "baseline", opacity: interpolate(f, [AN + 4, AN + 12], [0, 1], klemm),
          translate: `0 ${interpolate(f, [AN + 4, AN + 20], [24, 0], { ...klemm, easing: weich })}px` }}>
          <span style={{ fontSize: 40, color: c.faden, fontVariantNumeric: "tabular-nums" }}>{z.kenn}</span>
          <span style={{ fontSize: 56, fontWeight: 500, letterSpacing: "-0.01em" }}>{z.titel}</span>
        </div>
        <div style={{ marginTop: 20, fontFamily: SERIF, fontStyle: "italic", fontSize: 66, lineHeight: 1.2, textWrap: "balance", opacity: interpolate(f, [AN + 12, AN + 22], [0, 1], klemm),
          translate: `0 ${interpolate(f, [AN + 12, AN + 30], [24, 0], { ...klemm, easing: weich })}px` }}>
          {z.leitsatz}
        </div>
      </div>
    </Grund>
  );
};
