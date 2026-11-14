// «Zettel 33 · Das Publikum» (14. November 2026): Christians gesprochene Fassung der Strophe 33, dazu eine kleine Bildergeschichte.
// 4:5 (1080 × 1350). Fünf Strichfiguren stehen vor einem Bild (darin die Schlaufe des Signets mit dem Punkt), jede mit einer Denkblase.
// Der Zeitplan folgt der Stimme (Aufnahme zettel-33-das-publikum.mp4, 61,44 s); der Ton wird nach dem Rendern unverändert
// aus der Aufnahme übernommen (ffmpeg, siehe README). Texte wörtlich aus src/data/zu-seiner-zeit.json (daten.mjs).
import React from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Grund, OUTRO, blende, klemm, steig } from "../vorlage/Bausteine";
import { Signet } from "../vorlage/Signet";
import { SANS, SERIF } from "../vorlage/stil";
import daten from "./data/publikum.json";

const H = 1350;
// Eigene Farben nur für dieses Video (Wunsch von Christian, 14. November 2026: ohne Warmweiss und Orange): dunkler Saal in Petrol,
// Kreidestriche, der Punkt in Gelb.
const C = { grund: "#0f3038", text: "#e6f0ee", leise: "#86a9a8", akzent: "#ffd84a", linie: "#2c545c" };
const SIGNET = { grund: C.grund, tinte: C.text, punkt: C.akzent };
// Bilder (30 pro Sekunde): Beginn und Ende jedes Satzes in der Aufnahme
const SATZ: [number, number][] = [[211, 300], [306, 492], [507, 663], [678, 884], [899, 975], [981, 1149], [1164, 1369], [1383, 1548]];
export const T = { intro: 207, leitsatz: 1560, outro: 1843 - OUTRO, ende: 1843 };

// ---------- Hilfen ----------
const io = Easing.inOut(Easing.cubic), aus = Easing.out(Easing.cubic), hops = Easing.out(Easing.back(1.8));
/** Fortschritt 0–1 zwischen den Bildern a und b */
const p = (f: number, a: number, b: number, e: (t: number) => number = io) => interpolate(f, [a, b], [0, 1], { ...klemm, easing: e });
/** Hügel: steigt von a bis m, fällt bis b */
const huegel = (f: number, a: number, m: number, b: number) => p(f, a, m) * (1 - p(f, m, b));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const GRAD = Math.PI / 180;

// ---------- Bühne ----------
const BODEN = 1285, BILD = { x: 540, y: 640, w: 250, h: 170 };
const X = [150, 345, 540, 735, 930], GROESSE = [1.08, 0.9, 1, 0.8, 0.96];
const BLASE = X.map((x, i) => ({ x, y: 868 + [-8, 10, -4, 12, 0][i] })), R = 62;
const RING = { x: 540, y: 640, rx: 350, ry: 165 };

type Figur = { x: number; y: number; arme: [number, number]; neigung: number; blick: [number, number]; kopfX: number; mund: number; fuehler: number; schritt: number };

/** Zustand der Figur i im Bild f */
function figur(i: number, f: number): Figur {
  // Auftritt: zwei von links, zwei von rechts, die fünfte kommt zu spät
  const start = [200, 207, 204, 211, 262][i], von = [-170, -170, 1250, 1250, 1260][i];
  const an = p(f, start, start + (i === 4 ? 30 : 36), aus);
  let x = mix(von, X[i], an), geht = an > 0 && an < 1 ? 1 : 0;
  let y = Math.sin(f / 21 + i * 1.7) * 1.5;
  const arme: [number, number] = [18, 18];   // Grad ab der Senkrechten: links, rechts
  let blick: [number, number] = [BILD.x, BILD.y], kopfX = 0, mund = 0;
  const neigung = 0;

  // Satz 2: Figur 0 will ihre Blase der Nachbarin reichen
  if (i === 0) {
    arme[1] = mix(18, 150, p(f, 312, 330)) - 55 * p(f, 330, 366) - 77 * p(f, 372, 394);
    if (f >= 312 && f < 400) blick = f < 368 ? blasenOrt(0, f) : [x + 30, BODEN];
  }
  if (i === 1) { const h = huegel(f, 344, 364, 398); arme[0] = mix(18, 135, h); arme[1] = mix(18, 120, h); if (f > 340 && f < 395) blick = blasenOrt(0, Math.min(f, 366)); }
  // … und die Vierte gähnt
  if (i === 3) { mund = huegel(f, 424, 446, 484); const h = huegel(f, 430, 450, 486); arme[0] = mix(18, 150, h); arme[1] = mix(18, 150, h); }

  // Satz 3: Anschlüsse – die Arme gehen zur Seite, Fäden wachsen
  const aussen = p(f, 565, 590);
  if (i > 0) arme[0] = Math.max(arme[0], mix(18, 72, aussen));
  if (i < 4) arme[1] = Math.max(arme[1], mix(18, 72, aussen));

  // Satz 4: vergleichen, erzählen, widersprechen, zurückkehren, empfindlich werden
  if (i === 1 && f > 690 && f < 728) blick = [BLASE[2].x, BLASE[2].y];
  if (i === 2 && f > 690 && f < 728) blick = [BLASE[1].x, BLASE[1].y];
  if (i === 0) { const h = huegel(f, 725, 734, 762); arme[0] = mix(arme[0], 118 + 34 * Math.sin(f * 0.62), h); mund = Math.max(mund, h * (0.35 + 0.3 * Math.sin(f * 0.9))); if (h > 0.2) blick = [X[1], BODEN - 180]; }
  if (i === 3) kopfX = huegel(f, 755, 764, 794) * 8 * Math.sin(f * 0.85);
  if (i === 4) { const weg = huegel(f, 790, 810, 836); x += 215 * weg; if (weg > 0.02 && weg < 0.98) geht = 1; }
  const fuehler = p(f, 838, 866, hops);

  // Satz 7: die Zuspätgekommene schaut sich um, dann in ihre Blase – und hüpft
  if (i === 4) {
    if (f > 1172 && f < 1238) blick = [x + 300 * Math.sin((f - 1172) * 0.11), BODEN - 200];
    else if (f >= 1238 && f < 1372) blick = [BLASE[4].x, BLASE[4].y];
    y -= 26 * Math.abs(Math.sin(p(f, 1338, 1368, (t) => t) * Math.PI * 2));
    const h = huegel(f, 1336, 1346, 1372); arme[1] = mix(arme[1], 150, h);
  }
  // Leitsatz: La Ola, zweimal durch die Reihe
  for (const t of [1578, 1612]) { const h = huegel(f, t + i * 6, t + 9 + i * 6, t + 22 + i * 6); arme[0] = mix(arme[0], 152, h); arme[1] = mix(arme[1], 152, h); y -= 20 * h; }

  if (geht) y -= Math.abs(Math.sin(f * 0.5)) * 7;
  return { x, y, arme, neigung, blick, kopfX, mund, fuehler, schritt: geht ? Math.sin(f * 0.5) : 0 };
}

/** Hand der Figur (seite −1 links, +1 rechts) in Bildkoordinaten */
function hand(g: Figur, i: number, seite: number): [number, number] {
  const s = GROESSE[i], w = g.arme[seite < 0 ? 0 : 1] * GRAD;
  const lx = seite * 64 * Math.sin(w), ly = -150 + 64 * Math.cos(w);        // im Körper, Füsse bei (0,0)
  const n = g.neigung * GRAD, dx = lx, dy = ly + 90;                           // Drehung um die Hüfte (0,−90)
  return [g.x + s * (dx * Math.cos(n) - dy * Math.sin(n)), BODEN + g.y + s * (-90 + dx * Math.sin(n) + dy * Math.cos(n))];
}

/** Ort der Denkblase i im Bild f */
function blasenOrt(i: number, f: number): [number, number] {
  let [x, y] = [BLASE[i].x, BLASE[i].y];
  y += Math.sin(f / 26 + i * 2.1) * 4;
  // Satz 2: Blase 0 wandert zur Nachbarin
  if (i === 0 && f < 400) { const u = p(f, 330, 366); x = mix(x, X[1] - 96, u); y = mix(y, 905, u) - 46 * Math.sin(u * Math.PI); }
  // Satz 4: Blasen 1 und 2 nebeneinander halten; Blase 4 geht mit ihrer Figur
  if (i === 1) x += 34 * huegel(f, 690, 704, 728);
  if (i === 2) x -= 34 * huegel(f, 690, 704, 728);
  if (i === 4) x += 215 * huegel(f, 792, 812, 838);
  // Satz 5: alle zur Mitte – und prallen ab
  const zu = p(f, 901, 931, Easing.in(Easing.cubic)) * (1 - p(f, 932, 962, Easing.out(Easing.back(2.4))));
  x = mix(x, 540 + (i - 2) * 96, zu); y = mix(y, 850 + (i % 2) * 34, zu);
  const stoss = huegel(f, 929, 933, 948); x += stoss * 7 * Math.sin(f * 2.3 + i); y += stoss * 5 * Math.cos(f * 2.9 + i);
  // Satz 6: Nachbarn stupsen sich an
  for (const [a, b, t] of STUPSER) if (i === a || i === b) x += (i === a ? 1 : -1) * 38 * huegel(f, t, t + 9, t + 24);
  // Satz 8: die Blasen steigen auf und bilden einen Ring um das Bild
  const g = p(f, 1400, 1472);
  if (g > 0) { const w = (-90 + i * 72 + (f - 1400) * 0.42) * GRAD; x = mix(x, RING.x + RING.rx * Math.cos(w), g); y = mix(y, RING.y + RING.ry * Math.sin(w), g); }
  return [x, y];
}
const STUPSER: [number, number, number][] = [[0, 1, 1004], [2, 3, 1034], [1, 2, 1064], [3, 4, 1094]];
/** wie weit sich der Inhalt der Blase i verändert hat (0–1) */
const wandel = (i: number, f: number) => Math.min(1, STUPSER.reduce((s, [a, b, t]) => s + (i === a || i === b ? p(f, t + 7, t + 24) : 0), 0) * (i === 0 ? 1 : 0.5));

// ---------- Zeichnungen ----------
const strich = { fill: "none", stroke: C.text, strokeWidth: 4, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const SPIRALE = Array.from({ length: 60 }, (_, k) => { const t = (k / 59) * 3.6 * Math.PI, r = 3 + 2.5 * t; return `${k ? "L" : "M"}${(r * Math.cos(t)).toFixed(1)},${(r * Math.sin(t)).toFixed(1)}`; }).join("");
const KRINGEL = Array.from({ length: 30 }, (_, k) => { const t = (k / 29) * 2.6 * Math.PI, r = 1.5 + 1.25 * t; return `${k ? "L" : "M"}${(r * Math.cos(t)).toFixed(1)},${(r * Math.sin(t)).toFixed(1)}`; }).join("");
const Fisch: React.FC = () => (<>
  <path d="M-34,0 Q-8,-25 20,0 Q-8,25 -34,0 Z M20,0 L38,-15 L38,15 Z" {...strich} />
  <circle cx={-19} cy={-4} r={3.2} fill={C.text} />
</>);

/** was die Figur i sieht. m: Wandel durch die Nachbarn, d: Erscheinen (nur Blase 4), f: Bild */
const Inhalt: React.FC<{ i: number; m: number; d: number; f: number }> = ({ i, m, d, f }) => {
  if (i === 0) return <rect x={-30} y={-30} width={60} height={60} rx={30 - 17 * m} {...strich} />;
  if (i === 1) return <rect x={-28} y={-28} width={56} height={56} rx={16 * m} {...strich} />;
  if (i === 2) return (<g>
    <path d={SPIRALE} {...strich} />
    <path d="M31,0 L46,-13 L46,13 Z" {...strich} opacity={m} transform={`translate(${-10 * (1 - m)} 0)`} />
  </g>);
  if (i === 3) return (<g>
    <Fisch />
    <path d={KRINGEL} {...strich} strokeWidth={3.4} opacity={m} transform={`translate(-38 ${-26 - 4 * m}) scale(${0.4 + 0.6 * m})`} />
  </g>);
  // Blase 4: zuerst leer, dann ein Fisch auf zwei Beinen
  const s = Math.sin(f * 0.42);
  return (<g opacity={d} transform={`translate(0 ${-8 + 2 * Math.abs(s)}) scale(${0.6 + 0.4 * d})`}>
    <g transform="scale(-0.92 0.92)"><Fisch /></g>
    <path d={`M-4,17 L${-4 + 9 * s},38 l7,0 M9,16 L${9 - 9 * s},38 l7,0`} {...strich} strokeWidth={3.6} />
  </g>);
};

const Denkblase: React.FC<{ i: number; f: number }> = ({ i, f }) => {
  const [x, y] = blasenOrt(i, f);
  let gross = p(f, [215, 227, 239, 251, 294][i], [215, 227, 239, 251, 294][i] + 16, hops), sicht = 1;
  if (i === 0 && f >= 366 && f < 400) { gross = 1 + 0.3 * p(f, 366, 372); sicht = 1 - p(f, 366, 372); }
  if (i === 0 && f >= 400) gross = p(f, 404, 422, hops);
  if (gross <= 0) return null;
  const ring = p(f, 1400, 1472), rand = 1 - ring, g = figur(i, f);
  // die zwei kleinen Blasen zum Kopf hin (nur solange die Blase über ihrer Figur steht)
  const kx = g.x + 40 * GROESSE[i], ky = BODEN - 232 * GROESSE[i] - 6, fern = Math.hypot(x - BLASE[i].x, y - BLASE[i].y);
  const spur = rand * sicht * interpolate(fern, [30, 90], [1, 0], klemm) * 1;
  return (<g>
    {spur > 0 && [0.3, 0.68].map((u, k) => <circle key={k} cx={mix(kx, x + 22, u)} cy={mix(ky, y + R - 4, u)} r={(6 + 5 * k) * Math.min(1, gross)} fill={C.grund} stroke={C.text} strokeWidth={3} opacity={spur} />)}
    <g transform={`translate(${x} ${y}) scale(${gross * (1 - 0.08 * ring)})`} opacity={sicht}>
      <circle r={R} fill={C.grund} stroke={C.text} strokeWidth={3.5} opacity={rand} />
      <Inhalt i={i} m={wandel(i, f)} d={i === 4 ? p(f, 1286, 1322, hops) : 1} f={f} />
    </g>
  </g>);
};

const Mensch: React.FC<{ i: number; f: number }> = ({ i, f }) => {
  const g = figur(i, f), s = GROESSE[i];
  const bx = g.blick[0] - g.x, by = g.blick[1] - (BODEN - 195 * s), bl = Math.hypot(bx, by) || 1, ax = (bx / bl) * 6 + g.kopfX, ay = (by / bl) * 5;
  const arm = (seite: number) => { const w = g.arme[seite < 0 ? 0 : 1] * GRAD; return `M0,-150 L${(seite * 64 * Math.sin(w)).toFixed(1)},${(-150 + 64 * Math.cos(w)).toFixed(1)}`; };
  const fu = g.fuehler, wackel = Math.sin(f * 0.21 + i) * 5;
  const kopfOben = i === 0 ? -251 : -225;   // Figur 0 trägt einen Hut
  return (
    <g transform={`translate(${g.x} ${BODEN + g.y}) scale(${s})`}>
      <path d={`M0,-90 L${-17 + 15 * g.schritt},0 M0,-90 L${17 - 15 * g.schritt},0`} {...strich} />
      <g transform={`rotate(${g.neigung} 0 -90)`}>
        <path d={`M0,-90 L0,-165 ${arm(-1)} ${arm(1)}`} {...strich} />
        {i === 4 && <rect x={-13} y={-150} width={26} height={44} rx={8} {...strich} fill={C.grund} transform="translate(-16 4)" />}
        <g transform={`translate(${g.kopfX} 0)`}>
          {fu > 0 && [-1, 1].map((v) => { const ex = v * (11 + 15 * fu) + wackel * fu, ey = kopfOben - 34 * fu; return (
            <g key={v}><path d={`M${v * 11},${kopfOben + 2} Q${v * 13},${kopfOben - 18 * fu} ${ex},${ey}`} {...strich} strokeWidth={3} /><circle cx={ex} cy={ey} r={4.5 * fu} fill={C.text} /></g>); })}
          <circle cx={0} cy={-195} r={30} fill={C.grund} stroke={C.text} strokeWidth={4} />
          {i === 0 && <path d="M-36,-221 L36,-221 M-21,-221 L-21,-249 L21,-249 L21,-221" {...strich} fill={C.grund} />}
          {i === 1 && <circle cx={0} cy={-236} r={12} fill={C.grund} stroke={C.text} strokeWidth={4} />}
          {i === 3 && <path d="M-4,-225 q-10,-16 4,-20 q12,-2 8,10" {...strich} strokeWidth={3.4} />}
          {i === 4 && <path d="M-27,-209 Q-6,-232 28,-206" {...strich} strokeWidth={3.4} />}
          {i === 2 && <path d={`M${ax - 21},${-197 + ay} a10,10 0 1 0 20,0 a10,10 0 1 0 -20,0 M${ax + 1},${-197 + ay} a10,10 0 1 0 20,0 a10,10 0 1 0 -20,0`} {...strich} strokeWidth={2.6} />}
          <circle cx={-11 + ax} cy={-197 + ay} r={3.6} fill={C.text} /><circle cx={11 + ax} cy={-197 + ay} r={3.6} fill={C.text} />
          {g.mund > 0.03 && <ellipse cx={ax * 0.6} cy={-180 + ay * 0.4} rx={5 + 4 * g.mund} ry={1 + 9 * g.mund} fill={C.grund} stroke={C.text} strokeWidth={3} />}
        </g>
      </g>
    </g>
  );
};

/** Schlaufe des Signets (r = 0,45 + cos t), klein im Bild an der Wand */
const schlaufe = (t: number): [number, number] => { const r = 0.45 + Math.cos(t); return [(1.2 * r * Math.cos(t) - 0.84 + 0.3) * 44, 1.2 * r * Math.sin(t) * 44]; };
const SCHLAUFE = Array.from({ length: 121 }, (_, k) => { const [x, y] = schlaufe((k / 120) * Math.PI * 2); return `${k ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`; }).join("") + "Z";

const Buehne: React.FC = () => {
  const f = useCurrentFrame();
  const sicht = p(f, 196, 212) * (1 - p(f, 1648, T.outro));
  if (sicht <= 0) return null;
  const figuren = X.map((_, i) => figur(i, f));
  const [px, py] = schlaufe(f * 0.045), puls = 1 + 0.35 * huegel(f, 1470, 1500, 1548);
  // Platzen der Blase 0
  const knall = f >= 366 && f < 388 ? p(f, 366, 388, aus) : -1, [kx, ky] = blasenOrt(0, 366);
  return (
    <svg width={1080} height={H} style={{ position: "absolute", inset: 0, opacity: sicht }}>
      <line x1={60} x2={1020} y1={BODEN} y2={BODEN} stroke={C.linie} strokeWidth={3} strokeLinecap="round" />
      {/* das Bild an der Wand */}
      <g transform={`translate(${BILD.x} ${BILD.y})`}>
        <path d={`M-70,${-BILD.h / 2} L0,${-BILD.h / 2 - 46} L70,${-BILD.h / 2}`} {...strich} strokeWidth={2.6} stroke={C.leise} />
        <circle cx={0} cy={-BILD.h / 2 - 46} r={4} fill={C.leise} />
        <rect x={-BILD.w / 2} y={-BILD.h / 2} width={BILD.w} height={BILD.h} fill={C.grund} stroke={C.text} strokeWidth={5} />
        <rect x={-BILD.w / 2 + 13} y={-BILD.h / 2 + 13} width={BILD.w - 26} height={BILD.h - 26} fill="none" stroke={C.linie} strokeWidth={2.5} />
        <path d={SCHLAUFE} {...strich} strokeWidth={3} />
        <circle cx={px} cy={py} r={7.5 * puls} fill={C.akzent} />
      </g>
      {/* Anschlüsse: Fäden von Hand zu Hand */}
      {[0, 1, 2, 3].map((j) => {
        const u = p(f, 588 + j * 11, 618 + j * 11);
        if (u <= 0) return null;
        const a = hand(figuren[j], j, 1), b = hand(figuren[j + 1], j + 1, -1), lang = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const durch = Math.max(4, 42 - (lang - 75) * 0.22) + 3 * Math.sin(f * 0.09 + j);
        // Satz 7: ein Punkt läuft durch die Fäden zur Zuspätgekommenen
        const lauf = p(f, 1240 + j * 11, 1252 + j * 11, (t) => t), q = 1 - lauf;
        const lx = q * q * a[0] + 2 * q * lauf * ((a[0] + b[0]) / 2) + lauf * lauf * b[0], ly = q * q * a[1] + 2 * q * lauf * ((a[1] + b[1]) / 2 + durch) + lauf * lauf * b[1];
        return (<g key={j}>
          <path d={`M${a[0]},${a[1]} Q${(a[0] + b[0]) / 2},${(a[1] + b[1]) / 2 + durch} ${b[0]},${b[1]}`} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - u} {...strich} strokeWidth={3} />
          {lauf > 0 && lauf < 1 && <circle cx={lx} cy={ly} r={7} fill={C.akzent} />}
        </g>);
      })}
      {X.map((_, i) => <Mensch key={i} i={i} f={f} />)}
      {X.map((_, i) => <Denkblase key={i} i={i} f={f} />)}
      {knall >= 0 && Array.from({ length: 9 }, (_, k) => { const w = (k / 9) * Math.PI * 2 + 0.3, r1 = 46 + 40 * knall, r2 = r1 + 20 * (1 - knall) + 4; return (
        <line key={k} x1={kx + r1 * Math.cos(w)} y1={ky + r1 * Math.sin(w)} x2={kx + r2 * Math.cos(w)} y2={ky + r2 * Math.sin(w)} {...strich} strokeWidth={3.4} opacity={1 - knall} />); })}
      {/* erzählen: kleine Bögen neben dem Kopf der Ersten */}
      {[0, 1, 2].map((k) => { const o = huegel(f, 728 + k * 5, 736 + k * 5, 762); return o > 0 ? <path key={k} d={`M${X[0] + 52 + k * 15},${BODEN - 228} q${9 + k * 2},18 0,36`} {...strich} strokeWidth={3} opacity={o} /> : null; })}
    </svg>
  );
};

// ---------- Text ----------
const Texte: React.FC = () => {
  const f = useCurrentFrame();
  const kopf = p(f, 200, 214) * (1 - p(f, 1650, T.outro));
  const ls = blende(f, T.leitsatz, T.outro, 12);
  return (<>
    <div style={{ position: "absolute", left: 90, top: 62, opacity: kopf, fontFamily: SANS, fontWeight: 600, fontSize: 25, letterSpacing: "0.16em", textTransform: "uppercase", color: C.akzent }}>
      Zettel {daten.nummer} · {daten.titel}
    </div>
    {SATZ.map(([a, b], k) => { const o = blende(f, a - 5, b + 9, 10); return o > 0 ? (
      <div key={k} style={{ position: "absolute", left: 90, right: 90, top: 122, opacity: o, translate: `0 ${steig(f, a - 5) * 0.5}px`, fontFamily: SERIF, fontSize: 54, lineHeight: 1.2, color: C.text, textWrap: "pretty" }}>{daten.saetze[k]}</div>) : null; })}
    {ls > 0 && <div style={{ position: "absolute", left: 90, right: 90, top: 122, opacity: ls, translate: `0 ${steig(f, T.leitsatz) * 0.5}px` }}>
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "0.16em", textTransform: "uppercase", color: C.akzent, marginBottom: 14 }}>Leitsatz</div>
      <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 58, lineHeight: 1.18, color: C.text, textWrap: "balance" }}>{daten.leitsatz}</div>
    </div>}
  </>);
};

/** Anfang in der Länge der Aufnahme (die Stimme nennt den Zettel). Schon das erste Bild ist eine fertige Titelkarte, weil Reels
 *  es als Vorschaubild nehmen: das Signet steht (150 Bilder vorgespult), nur der Punkt läuft. */
const Anfang: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: C.grund, opacity: interpolate(f, [T.intro - 12, T.intro], [1, 0], klemm) }}>
      <div style={{ position: "absolute", left: 0, width: 1080, height: 1920, top: (H - 1920) / 2 }}>
        <Sequence from={-150}><Signet stil={SIGNET} /></Sequence>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 64, textAlign: "center" }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 34, letterSpacing: "0.2em", textTransform: "uppercase", color: C.akzent }}>Zettel {daten.nummer}</div>
        <div style={{ fontFamily: SERIF, fontSize: 84, lineHeight: 1.1, color: C.text, marginTop: 14 }}>{daten.titel}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1040, textAlign: "center", fontFamily: SANS, fontSize: 28, letterSpacing: "0.14em", color: C.leise }}>zu seiner zeit · {daten.zyklus.toLowerCase()}</div>
    </AbsoluteFill>
  );
};

export const PublikumVideo: React.FC = () => (
  <Grund>
    <AbsoluteFill style={{ backgroundColor: C.grund }} />
    <Buehne />
    <Texte />
    <Sequence durationInFrames={T.intro}><Anfang /></Sequence>
    <Sequence from={T.outro} durationInFrames={OUTRO}>
      <AbsoluteFill style={{ overflow: "hidden", backgroundColor: C.grund }}><div style={{ position: "absolute", left: 0, width: 1080, height: 1920, top: (H - 1920) / 2 }}><Signet stil={SIGNET} /></div></AbsoluteFill>
    </Sequence>
  </Grund>
);
