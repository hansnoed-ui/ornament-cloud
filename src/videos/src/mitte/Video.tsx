// «Die Mitte» (27. November 2026): ein Video ohne Text, 4:5, 45 s, stumm, zu Christians Text über Wiederholung und Abweichung:
// «Reine Wiederholung ist Monotonie und sagt nichts. Reine Abweichung ist Rauschen. Das Ornament hält die Mitte […]» bis zu Bridget Riley.
// Szenenplan freigegeben («ja, so machen»): Monotonie · Rauschen · die Mitte · Mäander · Raum (Rapport, Fries) · Zeit (Rhythmus, Triller) ·
// Streifen und Wellen. Die letzte Szene nimmt nur das Prinzip auf, das der Text nennt (die kleinste Abweichung setzt das ganze Bild in Bewegung),
// und bildet kein Werk nach.
// Zweite Fassung («das ist cool, aber mach es ästhetisch anspruchsvoller», Richtung freigegeben): Linie wie ein Stich (Doppellinie), Messing mit
// metallischem Verlauf und Glanz, Korn, Vignette, warmes Schwarz; eine Kamera wechselt die Massstäbe; die Szenen verwandeln sich ineinander
// (das Rauschen sinkt zum Band, das Band entrollt sich zum Mäander, der Mäander öffnet sich zum Fries, die Kamera taucht in einen Haken);
// das Rauschen treibt wie eine Strömung; die Streifen dichter, in wechselnder Breite, mit Interferenz; alles im Takt von 96 Schlägen pro Minute.
import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Grund, INTRO, OUTRO, klemm } from "../vorlage/Bausteine";
import { Signet } from "../vorlage/Signet";

export const HOEHE = 1350;
const B = 1080, Y = HOEHE / 2;
const C = { grund: "#151310", mitte: "#1b1915", rand: "#0b0a08", kreide: "#efe9dc", m1: "#f6e2a8", m2: "#cf9f45", m3: "#7d5a22" };
const SIGNET = { grund: C.grund, tinte: C.kreide, punkt: C.m2 };
/** ein Schlag bei 96 BPM, in Bildern */
const SCHLAG = (30 * 60) / 96;

export const T = { raster: INTRO, rauschen: 205, mitte: 330, maeander: 540, rapport: 690, rhythmus: 840, wellen: 960, outro: 1170, ende: 1170 + OUTRO };

// ---------- Hilfen ----------
const hash = (a: number, b = 0, c = 0) => { const x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453; return x - Math.floor(x); };
const glatt = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const sanft = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const ein = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], klemm);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const pfad = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join("");

/** das Motiv: ein Mäanderhaken im Einheitsquadrat; aneinandergereiht ergibt er den Mäander */
const HAKEN: [number, number][] = [[0, 1], [0, 0], [0.75, 0], [0.75, 0.5], [0.25, 0.5], [0.25, 1], [1, 1]];
const haken = (s: number, spiegel = false) => pfad(HAKEN.map(([u, v]) => [((spiegel ? 1 - u : u) - 0.5) * s, (v - 0.5) * s]));

/** Linie wie ein Stich: eine Doppellinie (aussen die Farbe, innen der Grund), Breite fest in Bildpunkten */
const Stich: React.FC<{ d: string; messing?: boolean; o?: number; aussen?: number; innen?: number; transform?: string; dash?: number }> = ({ d, messing = false, o = 1, aussen = 9, innen = 4, transform, dash }) => {
  const strich = { fill: "none", strokeLinejoin: "miter" as const, strokeLinecap: "square" as const, vectorEffect: "non-scaling-stroke" as const };
  const lauf = dash === undefined ? {} : { pathLength: 1, strokeDasharray: "1 1", strokeDashoffset: 1 - dash };
  return (
    <g opacity={o} transform={transform} filter={messing ? "url(#glanz)" : undefined}>
      <path d={d} {...strich} {...lauf} stroke={messing ? "url(#messing)" : C.kreide} strokeWidth={aussen} />
      <path d={d} {...strich} {...lauf} stroke={C.mitte} strokeWidth={innen} />
    </g>
  );
};

// ---------- Kamera: Mittelpunkt (cx, cy) in der Bildmitte, Massstab s ----------
function kamera(f: number) {
  let s = 1, rot = 0;
  if (f < T.rauschen) s = mix(3.6, 1, sanft(ein(f, T.raster, T.rauschen - 5)));              // vom einzelnen Haken zum Feld
  else if (f < T.mitte) { s = mix(1, 1.06, ein(f, T.rauschen, T.mitte)); rot = 0.035 * Math.sin(((f - T.rauschen) / 120) * Math.PI); }
  else if (f < T.maeander) s = mix(1.06, 1, sanft(ein(f, T.mitte, T.mitte + 60)));
  else if (f < T.rapport) s = mix(1, 1.18, sanft(ein(f, T.maeander, T.rapport)));
  else s = mix(1.18, 0.8, sanft(ein(f, T.rapport, T.rapport + 110))) * mix(1, 3.2, sanft(ein(f, T.rhythmus - 30, T.rhythmus + 6)));   // das Feld, dann hinein in einen Haken
  return `translate(${B / 2} ${Y}) scale(${s}) rotate(${(rot * 180) / Math.PI}) translate(${-B / 2} ${-Y})`;
}

// ---------- 1–3: Monotonie, Rauschen als Strömung, das Sinken zum Band, die Mitte ----------
const Motive: React.FC<{ f: number }> = ({ f }) => {
  const zelle = 150, s0 = 92, t = f - T.raster;
  const gleiten = t * 1.1;                                                     // starr und gleichmässig
  const rausch = glatt(ein(f, T.rauschen, T.rauschen + 60)) * (1 - glatt(ein(f, T.mitte - 10, T.mitte + 40)));
  const bruchF = T.mitte + Math.round(SCHLAG * 9);                             // auf einen Schlag bricht das Motiv in der Mitte aus
  const aus = sanft(ein(f, bruchF, bruchF + 12)) * (1 - sanft(ein(f, bruchF + Math.round(SCHLAG * 2), bruchF + Math.round(SCHLAG * 3.4))));
  const schlag = ((f - T.mitte) % SCHLAG) / SCHLAG;
  const puls = f > T.mitte + 40 ? Math.exp(-schlag * 6) : 0;
  // das Band entrollt sich zum Mäander: der Kopf läuft von links nach rechts
  const kopf = mix(-80, B + 120, ein(f, T.maeander + 4, T.maeander + 110));
  const teile: React.ReactNode[] = [];
  for (let i = -1; i < 9; i++) for (let j = 0; j < 9; j++) {
    const xr = ((i * zelle - gleiten) % (zelle * 9) + zelle * 9) % (zelle * 9) - zelle * 0.5, yr = Y + (j - 4) * zelle;
    const a = hash(i, j) * Math.PI * 2;
    // Strömung statt Flackern: jedes Motiv treibt auf seiner eigenen, ruhigen Bahn
    const dx = rausch * (110 * Math.sin(t * 0.031 + a) + 45 * Math.sin(t * 0.071 + 2 * a));
    const dy = rausch * (110 * Math.cos(t * 0.027 + 1.3 * a) + 40 * Math.sin(t * 0.053 + a));
    const w = Math.sin(t * 0.022 + 3 * a), r = rausch * Math.PI * 0.95 * w;
    const messing = rausch > 0.3 && Math.abs(w) > 0.78;
    // ab der Mitte sinkt alles zur mittleren Reihe; die anderen Reihen verlöschen dabei
    const sinkt = sanft(ein(f, T.mitte - 25 + Math.abs(j - 4) * 4, T.mitte + 40 + Math.abs(j - 4) * 4));
    const imBand = j === 4;
    const x = xr + dx;
    let y = mix(yr + dy, Y, sinkt), rr = r, s = s0 * (1 - rausch * 0.28 * hash(j, i));
    let o = imBand ? 1 : 1 - sinkt, m = messing;
    if (imBand && f > T.mitte) {
      // die Mitte: kleine Abweichungen, die jedes Motiv behält, der Takt in der Mitte, der Ausbruch
      const mitte = Math.abs(x - B / 2) < zelle / 2;
      rr += (hash(i + Math.floor(gleiten / zelle), 1) - 0.5) * 0.12;
      y += (hash(i + Math.floor(gleiten / zelle), 2) - 0.5) * 10;
      if (mitte) { s *= 1 + 0.07 * puls; rr += aus * Math.PI / 2; y -= aus * 96; m = aus > 0.05; }
      if (f > T.maeander) o *= 1 - glatt((kopf - x + 40) / 90);                  // entrollt: wo der Kopf vorbei ist, wird der Haken zur Linie
    }
    if (o <= 0.01) continue;
    teile.push(<Stich key={`${i}-${j}`} d={haken(s)} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${((rr * 180) / Math.PI).toFixed(2)})`} messing={m} o={o} />);
  }
  // die Bandkanten als Doppellinien, von der Mitte aus gezogen
  const kante = sanft(ein(f, T.mitte + 20, T.mitte + 70)) * (1 - ein(f, T.maeander + 80, T.maeander + 130));
  const k = (B / 2 + 40) * kante;
  return (
    <g>
      {kante > 0 && [-1, 1].map((v) => <Stich key={v} d={`M${B / 2 - k} ${Y + v * 84}L${B / 2 + k} ${Y + v * 84}`} aussen={6} innen={2.4} o={0.75} />)}
      {teile}
    </g>
  );
};

// ---------- 4–5: der Mäander entrollt sich, dann öffnet sich der Rapport zum Fries ----------
const maeander = (x0: number, y0: number, s: number, n: number) => {
  const pts: [number, number][] = [];
  for (let k = 0; k < n; k++) for (const [u, v] of k ? HAKEN.slice(1) : HAKEN) pts.push([x0 + (k + u) * s, y0 + (v - 0.5) * s]);
  return pfad(pts);
};
const Fries: React.FC<{ f: number }> = ({ f }) => {
  const s = 92, n = 30, x0 = -2 * s;
  const kopf = mix(-80, B + 120, ein(f, T.maeander + 4, T.maeander + 110));
  const gezeichnet = Math.min(1, Math.max(0, (kopf - x0) / (n * s)));
  const fahrt = Math.max(0, f - T.rapport) * 2.3;
  const reihen = [0, -1, 1, -2, 2, -3, 3];
  return (
    <g>
      {reihen.map((r, i) => {
        const auf = r === 0 ? 1 : sanft(ein(f, T.rapport + SCHLAG * (i - 1), T.rapport + SCHLAG * (i + 1.5)));   // je Schlag eine neue Reihe
        if (auf <= 0.01) return null;
        const y = Y + r * s * 1.72 * auf;
        return (
          <g key={r} opacity={r === 0 ? 1 : auf} transform={`translate(${-fahrt - (r % 2 ? s / 2 : 0)} 0)`}>
            <Stich d={maeander(x0, y, s, n)} dash={r === 0 ? Math.min(1, gezeichnet) : 1} />
            {f > T.rapport && [-1, 1].map((v) => <Stich key={v} d={`M${x0} ${y + v * s * 0.8}L${x0 + n * s} ${y + v * s * 0.8}`} aussen={5} innen={2} o={0.6 * auf} />)}
          </g>
        );
      })}
    </g>
  );
};

// ---------- 6: Zeit – dasselbe Motiv nacheinander im Takt, dann ein Triller ----------
const Rhythmus: React.FC<{ f: number }> = ({ f }) => {
  const a = T.rhythmus + 6, triller = a + Math.round(SCHLAG * 4), ende = triller + Math.round(SCHLAG * 2);
  let o = 1, messing = false, spiegel = false;
  if (f < triller) o = ((f - a) % SCHLAG) / SCHLAG < 0.55 ? 1 : 0.05;
  else if (f < ende) { const k = Math.floor((f - triller) / 5) % 2; spiegel = k === 1; messing = k === 1; }
  const weg = 1 - sanft(ein(f, ende, ende + 22));
  return <Stich d={haken(280, spiegel)} transform={`translate(${B / 2} ${Y})`} messing={messing} o={o * weg * ein(f, T.rhythmus - 6, T.rhythmus + 8)} aussen={16} innen={7} />;
};

// ---------- 7: Streifen und Wellen – eine kleinste Abweichung, dann Interferenz ----------
const Wellen: React.FC<{ f: number }> = ({ f }) => {
  const n = 58, abstand = HOEHE / n, q1: [number, number] = [700, 830], q2: [number, number] = [300, 430];
  const auf = sanft(ein(f, T.wellen + 4, T.wellen + 4 + SCHLAG * 2));
  const t1 = f - (T.wellen + Math.round(SCHLAG * 3)), t2 = f - (T.wellen + Math.round(SCHLAG * 6.5));
  const a1 = Math.min(13, Math.max(0, t1) * 0.18), a2 = Math.min(11, Math.max(0, t2) * 0.16);
  const linien: React.ReactNode[] = [];
  for (let j = 0; j < n; j++) {
    const yb = (j + 0.5) * abstand, breite = abstand * (0.28 + 0.2 * (0.5 + 0.5 * Math.sin(j * 0.31)));   // dick und dünn im Wechsel
    const halb = (B / 2 + 30) * auf, pts: [number, number][] = [];
    for (let x = B / 2 - halb; x <= B / 2 + halb; x += 8) {
      const d1 = Math.hypot(x - q1[0], yb - q1[1]), d2 = Math.hypot(x - q2[0], yb - q2[1]);
      const h1 = glatt((Math.max(0, t1) * 10 - d1) / 180), h2 = glatt((Math.max(0, t2) * 10 - d2) / 180);
      pts.push([x, yb + a1 * h1 * Math.sin(d1 * 0.05 - t1 * 0.26) + a2 * h2 * Math.sin(d2 * 0.057 - t2 * 0.3)]);
    }
    if (pts.length > 1) linien.push(<path key={j} d={pfad(pts)} fill="none" stroke={C.kreide} strokeWidth={breite} strokeLinecap="butt" />);
  }
  const punkt = sanft(ein(f, T.wellen + SCHLAG * 2.4, T.wellen + SCHLAG * 3));
  const s = mix(1.12, 1, sanft(ein(f, T.wellen, T.outro)));
  return (
    <g transform={`translate(${B / 2} ${Y}) scale(${s}) translate(${-B / 2} ${-Y})`} opacity={1 - ein(f, T.outro - 20, T.outro)}>
      {linien}
      <circle cx={q1[0]} cy={q1[1]} r={8} fill="url(#messing)" filter="url(#glanz)" opacity={punkt} />
    </g>
  );
};

// ---------- Bild ----------
const Szenen: React.FC = () => {
  const f = useCurrentFrame();
  const welt = f < T.rhythmus + 10;
  return (
    <svg width={B} height={HOEHE} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <radialGradient id="grund" cx="50%" cy="48%" r="75%"><stop offset="0" stopColor={C.mitte} /><stop offset="1" stopColor={C.rand} /></radialGradient>
        <linearGradient id="messing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C.m1} /><stop offset="0.45" stopColor={C.m2} /><stop offset="1" stopColor={C.m3} /></linearGradient>
        <filter id="glanz" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect width={B} height={HOEHE} fill="url(#grund)" />
      {welt && (
        <g transform={kamera(f)} opacity={1 - sanft(ein(f, T.rhythmus - 14, T.rhythmus + 8))}>
          {f < T.maeander + 120 && <Motive f={f} />}
          {f >= T.maeander && <Fries f={f} />}
        </g>
      )}
      {f >= T.rhythmus - 8 && f < T.wellen + 30 && <Rhythmus f={f} />}
      {f >= T.wellen && f < T.outro && <Wellen f={f} />}
    </svg>
  );
};

/** Korn und Vignette über allem, auch über Intro und Outro */
const Licht: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <svg width={B} height={HOEHE} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <defs>
        <filter id="korn"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={f % 97} /><feColorMatrix type="saturate" values="0" /></filter>
        <radialGradient id="vignette" cx="50%" cy="50%" r="72%"><stop offset="0.55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.62" /></radialGradient>
      </defs>
      <rect width={B} height={HOEHE} filter="url(#korn)" opacity={0.07} style={{ mixBlendMode: "overlay" }} />
      <rect width={B} height={HOEHE} fill="url(#vignette)" />
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
  return <AbsoluteFill style={{ opacity: interpolate(f, [INTRO - 8, INTRO + 10], [1, 0], klemm) }}><Mitte><Signet tempo={2} stil={SIGNET} /></Mitte></AbsoluteFill>;
};

export const MitteVideo: React.FC = () => (
  <Grund>
    <AbsoluteFill style={{ backgroundColor: C.grund }} />
    <Szenen />
    <Sequence durationInFrames={INTRO + 10}><Anfang /></Sequence>
    <Sequence from={T.outro} durationInFrames={OUTRO}><Mitte><Signet stil={SIGNET} /></Mitte></Sequence>
    <Licht />
  </Grund>
);
