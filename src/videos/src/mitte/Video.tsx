// «Die Mitte» (27. November 2026): ein Video ohne Text, 4:5, 45 s, stumm, zu Christians Text über Wiederholung und Abweichung:
// «Reine Wiederholung ist Monotonie und sagt nichts. Reine Abweichung ist Rauschen. Das Ornament hält die Mitte […]» bis zu Bridget Riley.
// Szenenplan freigegeben («ja, so machen»): Monotonie · Rauschen · die Mitte · Mäander · Raum (Rapport, Fries) · Zeit (Rhythmus, Triller) ·
// Streifen und Wellen. Die letzte Szene nimmt nur das Prinzip auf, das der Text nennt (die kleinste Abweichung setzt das ganze Bild in Bewegung),
// und bildet kein Werk nach. Alles in 2D, Bild für Bild aus der Bildnummer gerechnet: Kreide auf dem dunklen Grund der Formen-Videos,
// jede Abweichung in Messing. Intro und Outro: das Signet dunkel mit Messing-Punkt, wie bei «Eigenzeit» und «Formenfahrt».
import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Grund, INTRO, OUTRO, klemm } from "../vorlage/Bausteine";
import { Signet } from "../vorlage/Signet";

export const HOEHE = 1350;
const B = 1080;
const C = { grund: "#151412", kreide: "#f4f1ea", messing: "#d4a650" };
const SIGNET = { grund: C.grund, tinte: C.kreide, punkt: C.messing };

// Zeitplan in Bildern (30 fps)
export const T = {
  raster: INTRO, rauschen: 210, mitte: 330, maeander: 540, rapport: 690, rhythmus: 840, wellen: 990, outro: 1170, ende: 1170 + OUTRO,
};

// ---------- Hilfen ----------
const hash = (a: number, b = 0, c = 0) => { const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return x - Math.floor(x); };
const glatt = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const ein = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], klemm);
const blende = (f: number, a: number, b: number, d = 15) => interpolate(f, [a, a + d, b - d, b], [0, 1, 1, 0], klemm);
const pfad = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");

/** das Motiv: ein Mäanderhaken im Einheitsquadrat, derselbe Haken, der aneinandergereiht den Mäander ergibt */
const HAKEN: [number, number][] = [[0, 1], [0, 0], [0.75, 0], [0.75, 0.5], [0.25, 0.5], [0.25, 1], [1, 1]];
const Motiv: React.FC<{ x: number; y: number; s: number; r?: number; farbe?: string; o?: number; spiegel?: boolean; w?: number }> = ({ x, y, s, r = 0, farbe = C.kreide, o = 1, spiegel = false, w = 4 }) => (
  <path d={pfad(HAKEN.map(([u, v]) => [((spiegel ? 1 - u : u) - 0.5) * s, (v - 0.5) * s]))} transform={`translate(${x} ${y}) rotate(${(r * 180) / Math.PI})`}
    fill="none" stroke={farbe} strokeWidth={w} strokeLinecap="square" strokeLinejoin="miter" opacity={o} />
);

// ---------- 1 und 2: Monotonie, dann Rauschen ----------
const Raster: React.FC<{ f: number }> = ({ f }) => {
  const zelle = 150, n = glatt(ein(f, T.rauschen, T.rauschen + 50));
  const gleiten = (f - T.raster) * 1.2;
  const teile: React.ReactNode[] = [];
  for (let i = -1; i < 9; i++) for (let j = 0; j < 9; j++) {
    const x = ((i * zelle - gleiten) % (zelle * 9) + zelle * 9) % (zelle * 9) - zelle * 0.5, y = 75 + j * zelle;
    const k = Math.floor(f / 2);   // im Rauschen springt jedes Motiv alle zwei Bilder neu
    const h1 = hash(i, j, k), h2 = hash(j, i, k + 7), h3 = hash(i + j, k, 3);
    const r = n * (h1 * 2 - 1) * Math.PI, dx = n * (h2 - 0.5) * 70, dy = n * (h3 - 0.5) * 70;
    const ab = Math.abs(r) > 1.2;
    teile.push(<Motiv key={`${i}-${j}`} x={x + dx} y={y + dy} s={82 * (1 - n * 0.35 * h3)} r={r} farbe={ab ? C.messing : C.kreide} o={1 - n * 0.55 * h2} />);
  }
  return <g opacity={blende(f, T.raster, T.mitte + 18, 14)}>{teile}</g>;
};

// ---------- 3: die Mitte – Wiederholung mit kleinen Abweichungen, dann bricht eines aus ----------
const Band: React.FC<{ f: number }> = ({ f }) => {
  const abstand = 132, s = 96, y0 = HOEHE / 2, gleiten = (f - T.mitte) * 2.2;
  const bruch = T.mitte + 112;                          // das Motiv in der Mitte bricht aus und fängt sich wieder
  const aus = glatt(ein(f, bruch, bruch + 14)) * (1 - glatt(ein(f, bruch + 34, bruch + 58)));
  const teile: React.ReactNode[] = [];
  for (let i = -2; i < 11; i++) {
    const x = i * abstand - (gleiten % abstand) + abstand * 0.5;
    const id = i + Math.floor(gleiten / abstand);         // jedes Motiv behält seine kleine Abweichung, während es vorbeizieht
    const mitte = Math.abs(x - B / 2) < abstand / 2;
    const takt = (f - T.mitte) % 20 < 4 && mitte ? 1.07 : 1;   // der Takt: das Motiv in der Mitte schlägt
    const r = (hash(id, 1) - 0.5) * 0.12, dy = (hash(id, 2) - 0.5) * 12, sk = 0.95 + hash(id, 3) * 0.1;
    const ausbruch = mitte ? aus : 0;
    teile.push(<Motiv key={id} x={x} y={y0 + dy - ausbruch * 90} s={s * sk * takt} r={r + ausbruch * Math.PI / 2} farbe={ausbruch > 0.05 ? C.messing : C.kreide} />);
  }
  // die Bandkanten: das Band als Ordnung
  const kante = ein(f, T.mitte + 10, T.mitte + 40);
  return (
    <g opacity={blende(f, T.mitte - 6, T.maeander + 16, 16)}>
      <line x1={B / 2 - (B / 2) * kante} x2={B / 2 + (B / 2) * kante} y1={y0 - 82} y2={y0 - 82} stroke={C.kreide} strokeWidth={3} opacity={0.6} />
      <line x1={B / 2 - (B / 2) * kante} x2={B / 2 + (B / 2) * kante} y1={y0 + 82} y2={y0 + 82} stroke={C.kreide} strokeWidth={3} opacity={0.6} />
      {teile}
    </g>
  );
};

// ---------- 4 und 5: der Mäander zeichnet sich, dann der Rapport als Fries ----------
/** eine durchgehende Mäanderlinie aus aneinandergereihten Haken */
const maeander = (x0: number, y0: number, s: number, n: number) => {
  const pts: [number, number][] = [];
  for (let k = 0; k < n; k++) for (const [u, v] of k ? HAKEN.slice(1) : HAKEN) pts.push([x0 + (k + u) * s, y0 + (v - 0.5) * s]);
  return pfad(pts);
};
const Maeander: React.FC<{ f: number }> = ({ f }) => {
  const s = 90, n = 16, y0 = HOEHE / 2;
  const gezeichnet = glatt(ein(f, T.maeander + 6, T.maeander + 120));
  const rapport = glatt(ein(f, T.rapport, T.rapport + 45));
  const fahrt = Math.max(0, f - T.rapport) * 2.6;           // die Kamera fährt das Band entlang
  const reihen = [0, -1, 1, -2, 2];
  return (
    <g opacity={blende(f, T.maeander, T.rhythmus + 18, 16)}>
      {reihen.map((r, i) => {
        const o = r === 0 ? 1 : glatt(ein(f, T.rapport + 8 * i, T.rapport + 30 + 8 * i));
        if (o <= 0) return null;
        const y = y0 + r * s * 1.6 * rapport;
        return (
          <g key={r} opacity={o} transform={`translate(${-fahrt - (r % 2 ? s / 2 : 0)} 0)`}>
            <path d={maeander(-s, y, s, n + 6)} fill="none" stroke={C.kreide} strokeWidth={4} strokeLinecap="square" strokeLinejoin="miter"
              pathLength={1} strokeDasharray="1 1" strokeDashoffset={r === 0 ? 1 - gezeichnet : 0} />
            {rapport > 0 && <>
              <line x1={-s} x2={B + 30 * s} y1={y - s * 0.75} y2={y - s * 0.75} stroke={C.kreide} strokeWidth={3} opacity={0.55 * rapport} />
              <line x1={-s} x2={B + 30 * s} y1={y + s * 0.75} y2={y + s * 0.75} stroke={C.kreide} strokeWidth={3} opacity={0.55 * rapport} />
            </>}
          </g>
        );
      })}
    </g>
  );
};

// ---------- 6: Zeit – dasselbe Motiv nacheinander, dann ein Triller ----------
const Rhythmus: React.FC<{ f: number }> = ({ f }) => {
  const a = T.rhythmus + 18, triller = a + 84, ende = triller + 42;
  let sicht = 1, farbe = C.kreide, spiegel = false;
  if (f < triller) sicht = (f - a) % 16 < 8 ? 1 : 0.08;                 // im Takt: da, weg, da, weg
  else if (f < ende) { const k = Math.floor((f - triller) / 3) % 2; spiegel = k === 1; farbe = k ? C.messing : C.kreide; }   // der Triller: zwei Nachbarn im raschen Wechsel
  return (
    <g opacity={blende(f, T.rhythmus + 6, T.wellen + 10, 12)}>
      <Motiv x={B / 2} y={HOEHE / 2} s={220} farbe={farbe} spiegel={spiegel} o={sicht} w={7} />
    </g>
  );
};

// ---------- 7: Streifen und Wellen – eine kleinste Abweichung setzt das ganze Feld in Bewegung ----------
const Wellen: React.FC<{ f: number }> = ({ f }) => {
  const n = 34, abstand = HOEHE / n, x0 = 700, y0 = 810, start = T.wellen + 30;
  const t = f - start, front = Math.max(0, t) * 11, amp = Math.min(16, Math.max(0, t) * 0.22);
  const linien: React.ReactNode[] = [];
  for (let j = 0; j < n; j++) {
    const yb = (j + 0.5) * abstand, pts: [number, number][] = [];
    for (let x = -20; x <= B + 20; x += 12) {
      const d = Math.hypot(x - x0, yb - y0);
      const huelle = glatt((front - d) / 160);
      pts.push([x, yb + amp * huelle * Math.sin(d * 0.045 - t * 0.28)]);
    }
    linien.push(<path key={j} d={pfad(pts)} fill="none" stroke={C.kreide} strokeWidth={abstand * 0.42} strokeLinecap="butt" />);
  }
  const punkt = ein(f, start - 14, start);
  return (
    <g opacity={blende(f, T.wellen, T.outro, 18)}>
      {linien}
      <circle cx={x0} cy={y0} r={9} fill={C.messing} opacity={punkt} />
    </g>
  );
};

const Szenen: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <svg width={B} height={HOEHE} style={{ position: "absolute", inset: 0 }}>
      {f < T.mitte + 20 && <Raster f={f} />}
      {f >= T.mitte - 8 && f < T.maeander + 18 && <Band f={f} />}
      {f >= T.maeander && f < T.rhythmus + 20 && <Maeander f={f} />}
      {f >= T.rhythmus && f < T.wellen + 12 && <Rhythmus f={f} />}
      {f >= T.wellen && f < T.outro && <Wellen f={f} />}
    </svg>
  );
};

const Mitte: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ overflow: "hidden", backgroundColor: C.grund }}>
    <div style={{ position: "absolute", left: 0, width: B, height: 1920, top: (HOEHE - 1920) / 2 }}>{children}</div>
  </AbsoluteFill>
);

const Anfang: React.FC = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: interpolate(f, [INTRO - 6, INTRO + 10], [1, 0], klemm) }}><Mitte><Signet tempo={2} stil={SIGNET} /></Mitte></AbsoluteFill>;
};

export const MitteVideo: React.FC = () => (
  <Grund>
    <AbsoluteFill style={{ backgroundColor: C.grund }} />
    <Szenen />
    <Sequence durationInFrames={INTRO + 10}><Anfang /></Sequence>
    <Sequence from={T.outro} durationInFrames={OUTRO}><Mitte><Signet stil={SIGNET} /></Mitte></Sequence>
  </Grund>
);
