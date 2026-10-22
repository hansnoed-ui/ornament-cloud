// Der Zettelkasten als Feld 7 × 7 wie auf der Startseite: Zellen mit Haarlinien und Nummern, die Fäden wachsen leicht gebogen
// (dieselbe Krümmung wie b.js); dann rückt das Feld nach oben, Zettel 1 ist aktiv (Blaupause), seine Nachbarn hell, die übrigen Fäden leise,
// und darunter stehen Titel und Leitsatz des Zettels.
import React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import daten from "../data/neubau.json";
import { Abschnitt, F, OBEN, Papier, RAND, SERIF, ein, klemm, weich } from "../Teile";

export const FELD = 350;
const WECHSEL = 140;           // ab hier: Kopf weg, Feld nach oben, Zettel 1 aktiv
const BREITE = 1080 - 2 * RAND;
const Z = BREITE / 7;
const AKTIV = 1;

const mitte = (n: number): [number, number] => [((n - 1) % 7) * Z + Z / 2, Math.floor((n - 1) / 7) * Z + Z / 2];
/** wie b.js: leicht gebogen, immer zur selben Seite, damit sich die Fäden wie in einem Ornament kreuzen */
const faden = (a: number, b: number) => {
  const [x1, y1] = mitte(a), [x2, y2] = mitte(b);
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, k = Math.min(60 * (Z / 53), l * 0.22);
  const cx = (x1 + x2) / 2 - (dy / l) * k, cy = (y1 + y2) / 2 + (dx / l) * k;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
};
const nachbarn = new Set(daten.kasten.faeden.filter(([a, b]) => a === AKTIV || b === AKTIV).map(([a, b]) => (a === AKTIV ? b : a)));

export const Feld: React.FC = () => {
  const f = useCurrentFrame();
  const w = interpolate(f, [WECHSEL, WECHSEL + 28], [0, 1], { ...klemm, easing: weich });
  const top = interpolate(w, [0, 1], [OBEN + 380, OBEN + 40]);
  const an = interpolate(f, [WECHSEL + 14, WECHSEL + 28], [0, 1], klemm);
  return (
    <Papier>
      {/* der Kopf ist weg, bevor das Feld nach oben rückt */}
      <div style={{ opacity: interpolate(f, [WECHSEL - 14, WECHSEL], [1, 0], klemm) }}>
        <Abschnitt f={f} zeichen={daten.kasten.zeichen} titel={daten.kasten.titel} text={daten.kasten.text} />
      </div>
      <div style={{ position: "absolute", left: RAND, top, width: BREITE, height: BREITE }}>
        {Array.from({ length: 49 }, (_, i) => {
          const n = i + 1;
          const a = 10 + ((n - 1) % 7) * 2 + Math.floor((n - 1) / 7) * 2;
          const aktiv = n === AKTIV ? an : 0;
          const nah = nachbarn.has(n) ? an : 0;
          return (
            <div key={n} style={{
              position: "absolute", left: ((n - 1) % 7) * Z, top: Math.floor((n - 1) / 7) * Z, width: Z, height: Z, boxSizing: "border-box",
              border: `2px solid ${F.linie}`, marginLeft: -1, marginTop: -1,
              backgroundColor: aktiv > 0 ? F.faden : nah > 0 ? F.fadenHell : "transparent",
              opacity: interpolate(f, [a, a + 10], [0, 1], klemm),
            }}>
              <div style={{ position: "absolute", left: 12, top: 8, fontSize: 26, fontVariantNumeric: "tabular-nums", color: aktiv > 0.5 ? F.papier : F.grau }}>{n}</div>
            </div>
          );
        })}
        <svg width={BREITE} height={BREITE} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
          {daten.kasten.faeden.map(([a, b], i) => {
            const s = 36 + i * 3;
            const leise = a !== AKTIV && b !== AKTIV;
            return (
              <path key={`${a}-${b}`} d={faden(a, b)} fill="none" stroke={F.faden} strokeWidth={3.2} strokeLinecap="round" pathLength={1} strokeDasharray="1 1"
                strokeDashoffset={1 - interpolate(f, [s, s + 30], [0, 1], { ...klemm, easing: Easing.inOut(Easing.cubic) })}
                opacity={leise ? interpolate(an, [0, 1], [1, 0.22]) : 1} />
            );
          })}
        </svg>
      </div>
      <div style={{ position: "absolute", left: RAND, right: RAND, top: OBEN + 40 + BREITE + 60 }}>
        <div style={{ display: "flex", gap: 22, alignItems: "baseline", ...ein(f, WECHSEL + 22) }}>
          <span style={{ fontSize: 40, color: F.faden, fontVariantNumeric: "tabular-nums" }}>{daten.kasten.zettel.kenn}</span>
          <span style={{ fontSize: 56, fontWeight: 500, letterSpacing: "-0.01em" }}>{daten.kasten.zettel.titel}</span>
        </div>
        <div style={{ marginTop: 28, fontFamily: SERIF, fontStyle: "italic", fontSize: 60, lineHeight: 1.22, textWrap: "balance", ...ein(f, WECHSEL + 36, 24) }}>
          {daten.kasten.zettel.leitsatz}
        </div>
      </div>
    </Papier>
  );
};
