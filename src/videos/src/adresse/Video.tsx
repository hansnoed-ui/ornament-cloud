// «Zettel 15 · Die Adresse» (14. November 2026, Christian: «neues video zu zettel 15», Ablauf «ok»): Christians gesprochene Fassung,
// der Text Satz für Satz, darunter eine Reihe von Briefkästen mit Namensschildern, Figuren und fliegenden Briefen. Gestaltung wie sein
// Reel zu Zettel 33 (src/publikum/: Petrol, Kreide, Punkt in Gelb). Formate 4:5 (1080 × 1350) und 9:16 (1080 × 1920), Prop «hoehe».
// Zeiten der Sätze aus der Tonspur (daten.mjs); Texte unverändert aus src/data/zu-seiner-zeit.json.
import React from "react";
import { AbsoluteFill, Audio, Easing, Sequence, interpolate, staticFile, useCurrentFrame } from "remotion";
import { Grund, OUTRO, blende, klemm, steig } from "../vorlage/Bausteine";
import { Signet } from "../vorlage/Signet";
import { FPS, SANS, SERIF } from "../vorlage/stil";
import daten from "./data/adresse.json";

const C = { grund: "#0f3038", text: "#e6f0ee", leise: "#86a9a8", akzent: "#ffd84a", linie: "#2c545c" };
const SIGNET = { grund: C.grund, tinte: C.text, punkt: C.akzent };

// ---------- Zeitplan (Bilder, 30 pro Sekunde) ----------
const TON = 15;                                            // die Stimme beginnt nach einer halben Sekunde Titelkarte
const s = (sek: number) => TON + Math.round(sek * FPS);
const S = daten.zeiten.saetze.map(([a, b]) => [s(a), s(b)] as [number, number]);
const ENDE = s(daten.zeiten.ende);
export const T = { titel: 0, buehne: S[0][0] - 8, leitsatz: ENDE + 12, outro: ENDE + 12 + 105, ende: ENDE + 12 + 105 + OUTRO };
/** Bild bei Anteil u des Satzes k */
const im = (k: number, u: number) => Math.round(S[k][0] + u * (S[k][1] - S[k][0]));

// ---------- Hilfen ----------
const io = Easing.inOut(Easing.cubic), hops = Easing.out(Easing.back(1.8));
const p = (f: number, a: number, b: number, e: (t: number) => number = io) => interpolate(f, [a, b], [0, 1], { ...klemm, easing: e });
const huegel = (f: number, a: number, m: number, b: number) => p(f, a, m) * (1 - p(f, m, b));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const strich = { fill: "none", stroke: C.text, strokeWidth: 4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

// ---------- Bühne (Koordinaten für 4:5; bei 9:16 tiefer gesetzt) ----------
const BODEN = 1285, KX = [210, 430, 650, 870], SCHLITZ = 1022, KASTEN_OBEN = 985, GROSS = 1.24;   // die Szene wird um den Boden herum vergrössert
const FX = KX.map((x) => x + 80);

// Briefe: wohin, wann, wie lange; stempel = gelber Stempel (wer bleibt verantwortlich)
type Brief = { zu: number; a: number; d: number; von?: [number, number]; stempel?: boolean };
const BRIEFE: Brief[] = [
  ...[0, 1, 2, 3].map((k) => ({ zu: k, a: im(0, 0.08 + k * 0.17), d: 30 })),                     // Satz 1: Adressen
  { zu: 1, a: im(1, 0.62), d: 32 },                                                               // Satz 2: Träger abwesend, Brief kommt an
  ...[0, 1, 2].map((k) => ({ zu: 2, a: im(2, 0.04 + k * 0.3), d: 26 })),                         // Satz 3: wiederholte Bezugnahmen
  { zu: 0, a: im(4, 0.28), d: 28 },                                                               // Satz 5: wer wird angesprochen
  { zu: 3, a: im(4, 0.72), d: 28, stempel: true },                                                // … wer bleibt verantwortlich
  { zu: 1, a: ENDE + 30, d: 40 },                                                                 // Leitsatz: der letzte Brief
];
const ANTWORT = im(4, 0.5);                                                                       // … wer kann antworten
const ankunft = (b: Brief) => b.a + b.d;
/** wie viele Briefe bis Bild f im Kasten k angekommen sind */
const angekommen = (k: number, f: number) => BRIEFE.filter((b) => b.zu === k && f >= ankunft(b)).length;

const Umschlag: React.FC<{ stempel?: number }> = ({ stempel = 0 }) => (<>
  <rect x={-25} y={-16} width={50} height={32} rx={3} fill={C.grund} stroke={C.text} strokeWidth={3.4} />
  <path d="M-25,-16 L0,4 L25,-16" {...strich} strokeWidth={3} />
  {stempel > 0 && <circle cx={15} cy={6} r={7 * stempel} fill={C.akzent} />}
</>);

const FliegenderBrief: React.FC<{ b: Brief; f: number }> = ({ b, f }) => {
  const u = p(f, b.a, ankunft(b), io);
  if (f < b.a || u >= 1) return null;
  const [x0, y0] = b.von ?? [-70, 620 + (b.zu % 2) * 60], [x1, y1] = [KX[b.zu], SCHLITZ];
  const cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - 170;
  const q = 1 - u, x = q * q * x0 + 2 * q * u * cx + u * u * x1, y = q * q * y0 + 2 * q * u * cy + u * u * y1;
  const dreh = (1 - u) * -14 + Math.sin(f * 0.3) * 6 * (1 - u), klein = 1 - 0.55 * p(f, ankunft(b) - 8, ankunft(b));
  const stempel = b.stempel ? p(f, b.a + 4, b.a + 12, hops) : 0;
  return <g transform={`translate(${x} ${y}) rotate(${dreh}) scale(${klein})`}><Umschlag stempel={stempel} /></g>;
};

/** Antwortbrief: von der Hand der Ersten nach oben links hinaus */
const Antwort: React.FC<{ f: number }> = ({ f }) => {
  const u = p(f, ANTWORT, ANTWORT + 36, io);
  if (f < ANTWORT || u >= 1) return null;
  const [x0, y0] = [FX[0] + 40, BODEN - 120], [x1, y1] = [-80, 560];
  const q = 1 - u, x = q * q * x0 + 2 * q * u * (x0 + 40) + u * u * x1, y = q * q * y0 + 2 * q * u * 600 + u * u * y1;
  return <g transform={`translate(${x} ${y}) rotate(${-20 * u}) scale(${0.8 + 0.2 * p(f, ANTWORT, ANTWORT + 8)})`}><Umschlag /></g>;
};

const Kasten: React.FC<{ k: number; f: number }> = ({ k, f }) => {
  const x = KX[k], n = angekommen(k, f);
  // Klappe: wackelt bei jeder Ankunft; Satz 6 offen; am Schluss schliesst sich die von Kasten 1
  const stoss = BRIEFE.filter((b) => b.zu === k).reduce((m, b) => Math.max(m, huegel(f, ankunft(b) - 4, ankunft(b), ankunft(b) + 12)), 0);
  let offen = 0.35 * stoss + p(f, im(5, 0.05), im(5, 0.25)) * (1 - p(f, T.leitsatz, T.leitsatz + 20));
  const letzter = BRIEFE[BRIEFE.length - 1];
  if (k === 1) offen = Math.max(offen, huegel(f, letzter.a + 10, ankunft(letzter), ankunft(letzter) + 18));
  // Fähnchen: hoch, sobald Post da ist (Kasten 1: Brief für die Abwesende)
  const fahne = k === 1 ? p(f, ankunft(BRIEFE[4]), ankunft(BRIEFE[4]) + 14, hops) : 0;
  // Namensschild: bei Kasten 2 zuerst blass, mit jedem der drei Briefe deutlicher
  const schild = k === 2 ? Math.min(1, 0.22 + 0.26 * Math.min(3, n - 1)) : 1;
  const zeilen = k === 2 ? Math.max(0, Math.min(3, n - 1)) : 3;
  const breiten = [[46, 30, 38], [38, 50, 26], [52, 34, 42], [30, 44, 36]][k];
  return (
    <g transform={`translate(${x} 0)`}>
      <line x1={0} x2={0} y1={1075} y2={BODEN} {...strich} />
      <path d={`M-58,1075 L-58,${KASTEN_OBEN + 30} Q-58,${KASTEN_OBEN} 0,${KASTEN_OBEN} Q58,${KASTEN_OBEN} 58,${KASTEN_OBEN + 30} L58,1075 Z`} fill={C.grund} stroke={C.text} strokeWidth={4.5} strokeLinejoin="round" />
      <g transform={`translate(0 ${SCHLITZ - 6}) rotate(${-38 * offen})`}><line x1={-30} x2={30} y1={0} y2={0} {...strich} strokeWidth={4} /></g>
      <line x1={-26} x2={26} y1={SCHLITZ + 4} y2={SCHLITZ + 4} stroke={C.linie} strokeWidth={3} strokeLinecap="round" />
      <g transform={`translate(58 ${KASTEN_OBEN + 40}) rotate(${-90 * fahne})`}>
        <line x1={0} x2={0} y1={0} y2={-46} {...strich} strokeWidth={3.4} />
        <rect x={0} y={-46} width={24} height={16} fill={fahne > 0.5 ? C.akzent : C.grund} stroke={C.text} strokeWidth={3} />
      </g>
      <g opacity={schild}>
        <rect x={-42} y={1098} width={84} height={34} rx={4} fill={C.grund} stroke={C.text} strokeWidth={3.2} strokeDasharray={k === 2 && n < 4 ? "8 6" : undefined} />
        {breiten.map((w, j) => j < zeilen ? <line key={j} x1={-30} x2={-30 + w} y1={1108 + j * 8} y2={1108 + j * 8} stroke={C.text} strokeWidth={2.6} strokeLinecap="round" opacity={k === 2 ? p(f, BRIEFE[5 + j]?.a + 26, BRIEFE[5 + j]?.a + 34) : 1} /> : null)}
      </g>
    </g>
  );
};

type Figur = { x: number; schritt: number; arme: [number, number]; blick: number; da: number };
function figur(i: number, f: number): Figur {
  let x = FX[i], schritt = 0;
  const da = p(f, T.buehne + i * 4, T.buehne + 14 + i * 4);
  const arme: [number, number] = [16, 16];
  let blick = 0;
  // Satz 2: die Zweite geht weg (Träger abwesend)
  if (i === 1) { const w = p(f, im(1, 0.08), im(1, 0.5), (t) => t); x = mix(FX[1], 1240, w); if (w > 0 && w < 1) schritt = Math.sin(f * 0.5); }
  // Satz 5: die Erste wird angesprochen, schaut zum Kasten, antwortet
  if (i === 0) {
    if (f > ankunft(BRIEFE[8]) - 10 && f < ANTWORT) blick = -1;
    const h = huegel(f, ANTWORT - 8, ANTWORT, ANTWORT + 14); arme[1] = mix(16, 140, h);
  }
  // Satz 7: die Dritte bekommt ein Schild umgehängt und geht ihres Weges
  if (i === 2) { const w = p(f, im(6, 0.42), im(6, 0.95), (t) => t); x = mix(FX[2], 1260, w); if (w > 0 && w < 1) schritt = Math.sin(f * 0.5); }
  // Leitsatz: wer noch da ist, schaut zum Kasten der Abwesenden
  if (f > T.leitsatz && (i === 0 || i === 3)) blick = i === 0 ? 1 : -1;
  return { x, schritt, arme, blick, da };
}

const Mensch: React.FC<{ i: number; f: number }> = ({ i, f }) => {
  const g = figur(i, f), sk = 0.78;
  if (g.da <= 0 || g.x > 1200) return null;
  const arm = (seite: number) => { const w = (g.arme[seite < 0 ? 0 : 1] * Math.PI) / 180; return `M0,-150 L${(seite * 64 * Math.sin(w)).toFixed(1)},${(-150 + 64 * Math.cos(w)).toFixed(1)}`; };
  const hut = i === 3, y = g.schritt ? -Math.abs(g.schritt) * 6 : 0;
  return (
    <g transform={`translate(${g.x} ${BODEN + y}) scale(${sk})`} opacity={g.da}>
      <path d={`M0,-90 L${-17 + 15 * g.schritt},0 M0,-90 L${17 - 15 * g.schritt},0 M0,-90 L0,-165 ${arm(-1)} ${arm(1)}`} {...strich} strokeWidth={4.5} />
      <circle cx={0} cy={-195} r={30} fill={C.grund} stroke={C.text} strokeWidth={4.5} />
      {hut && <path d="M-36,-221 L36,-221 M-21,-221 L-21,-249 L21,-249 L21,-221" {...strich} strokeWidth={4.5} fill={C.grund} />}
      {i === 1 && <path d="M-27,-209 Q-6,-232 28,-206" {...strich} strokeWidth={3.6} />}
      <circle cx={-11 + 6 * g.blick} cy={-197} r={4} fill={C.text} /><circle cx={11 + 6 * g.blick} cy={-197} r={4} fill={C.text} />
    </g>
  );
};

/** Satz 4: was zum Körper und zur Psyche gehört, bleibt bei der Figur – Denkblase und Herz, ohne Faden zum Kasten */
const Eigenes: React.FC<{ f: number }> = ({ f }) => {
  const d = p(f, im(3, 0.05), im(3, 0.2), hops) * (1 - p(f, im(4, 0.1), im(4, 0.25)));
  if (d <= 0) return null;
  const x = FX[3], schlag = 1 + 0.18 * Math.max(0, Math.sin(f * 0.42)) ** 6;
  const SPIRALE = Array.from({ length: 50 }, (_, k) => { const t = (k / 49) * 3.4 * Math.PI, r = 2 + 2.1 * t; return `${k ? "L" : "M"}${(r * Math.cos(t)).toFixed(1)},${(r * Math.sin(t)).toFixed(1)}`; }).join("");
  return (
    <g opacity={d}>
      {[0.3, 0.7].map((u, k) => <circle key={k} cx={x - 20 - 24 * u} cy={BODEN - 210 - 90 * u} r={5 + 4 * k} fill={C.grund} stroke={C.text} strokeWidth={3} />)}
      <g transform={`translate(${x - 70} ${BODEN - 372}) scale(${d})`}>
        <circle r={52} fill={C.grund} stroke={C.text} strokeWidth={3.5} />
        <path d={SPIRALE} {...strich} strokeWidth={3.4} />
      </g>
      <g transform={`translate(${x - 2} ${BODEN - 108}) scale(${0.62 * schlag})`}>
        <path d="M0,14 C-26,-6 -22,-26 -10,-26 C-4,-26 0,-20 0,-15 C0,-20 4,-26 10,-26 C22,-26 26,-6 0,14 Z" fill={C.akzent} stroke={C.akzent} strokeWidth={2} />
      </g>
    </g>
  );
};

/** Satz 7: das Namensschild an der Schnur; es bleibt am Pfosten von Kasten 3 hängen und schwingt */
const Schild: React.FC<{ f: number }> = ({ f }) => {
  const a = im(6, 0.06), haengt = im(6, 0.62);
  if (f < a) return null;
  const g = figur(2, f), sk = 0.78;
  const ab = p(f, a, a + 22, hops);
  let x = g.x, y = BODEN - 150 * sk - mix(260, 0, ab), w = 0;
  if (f >= haengt) { x = KX[3]; y = 1160; w = Math.sin((f - haengt) * 0.16) * 26 * Math.exp(-(f - haengt) / 70); }
  else if (g.x > KX[3] - 10) { x = KX[3]; }
  return (
    <g transform={`translate(${x} ${y}) rotate(${w})`}>
      <path d="M-14,-24 L0,-44 L14,-24" {...strich} strokeWidth={2.6} />
      <rect x={-26} y={-24} width={52} height={32} rx={4} fill={C.grund} stroke={C.akzent} strokeWidth={3.4} />
      <line x1={-15} x2={14} y1={-12} y2={-12} stroke={C.text} strokeWidth={2.6} strokeLinecap="round" /><line x1={-15} x2={4} y1={-3} y2={-3} stroke={C.text} strokeWidth={2.6} strokeLinecap="round" />
    </g>
  );
};

/** Satz 6: Tag und Nacht ziehen über die Kästen, der Punkt hüpft von Kasten zu Kasten */
const Himmel: React.FC<{ f: number }> = ({ f }) => {
  const a = im(5, 0.02), b = im(5, 0.98);
  const u = p(f, a, b, (t) => t);
  if (f < a - 10 || f > b + 20) return null;
  const sicht = blende(f, a - 4, b + 16, 10);
  const sonne = u < 0.5 ? u * 2 : -1, mond = u >= 0.5 ? (u - 0.5) * 2 : -1;
  const bahn = (t: number): [number, number] => [mix(140, 940, t), 830 - 120 * Math.sin(t * Math.PI)];
  const hop = Math.min(3, Math.floor(u * 4)), hu = u * 4 - hop;
  const [hx0, hx1] = [KX[hop], KX[Math.min(3, hop + 1)]], hx = mix(hx0, hx1, hu), hy = KASTEN_OBEN - 16 - 60 * Math.sin(hu * Math.PI);
  return (
    <g opacity={sicht}>
      {sonne >= 0 && <g transform={`translate(${bahn(sonne).join(" ")})`}><circle r={30} {...strich} />{Array.from({ length: 8 }, (_, k) => { const w = (k / 8) * Math.PI * 2; return <line key={k} x1={42 * Math.cos(w)} y1={42 * Math.sin(w)} x2={54 * Math.cos(w)} y2={54 * Math.sin(w)} {...strich} strokeWidth={3.4} />; })}</g>}
      {mond >= 0 && <g transform={`translate(${bahn(mond).join(" ")})`}><path d="M10,-30 A32,32 0 1 0 10,30 A24,24 0 1 1 10,-30 Z" {...strich} /></g>}
      <circle cx={hx} cy={hy} r={11} fill={C.akzent} />
    </g>
  );
};

const Buehne: React.FC<{ oy: number }> = ({ oy }) => {
  const f = useCurrentFrame();
  const sicht = p(f, T.buehne, T.buehne + 14) * (1 - p(f, T.outro - 18, T.outro));
  if (sicht <= 0) return null;
  const letzter = BRIEFE[BRIEFE.length - 1], puls = huegel(f, ankunft(letzter) + 10, ankunft(letzter) + 24, ankunft(letzter) + 60);
  return (
    <svg width={1080} height={1350} style={{ position: "absolute", left: 0, top: oy, opacity: sicht }}>
      <g transform={`translate(540 ${BODEN}) scale(${GROSS}) translate(-540 ${-BODEN})`}>
      <line x1={60} x2={1020} y1={BODEN} y2={BODEN} stroke={C.linie} strokeWidth={3} strokeLinecap="round" />
      <Himmel f={f} />
      {KX.map((_, k) => <Kasten key={k} k={k} f={f} />)}
      {[0, 1, 2, 3].map((i) => <Mensch key={i} i={i} f={f} />)}
      <Eigenes f={f} />
      <Schild f={f} />
      {BRIEFE.map((b, k) => <FliegenderBrief key={k} b={b} f={f} />)}
      <Antwort f={f} />
      {puls > 0 && <circle cx={KX[1] + 70} cy={KASTEN_OBEN - 6} r={8 + 10 * puls} fill={C.akzent} opacity={1 - 0.6 * puls} />}
      </g>
    </svg>
  );
};

// ---------- Text ----------
const Texte: React.FC<{ top: number; gross: number }> = ({ top, gross }) => {
  const f = useCurrentFrame();
  const kopf = p(f, T.buehne, T.buehne + 14) * (1 - p(f, T.outro - 18, T.outro));
  const ls = blende(f, T.leitsatz, T.outro, 10);
  return (<>
    <div style={{ position: "absolute", left: 90, top: top - 60, opacity: kopf, fontFamily: SANS, fontWeight: 600, fontSize: 25, letterSpacing: "0.16em", textTransform: "uppercase", color: C.akzent }}>
      Zettel {daten.nummer} · {daten.titel}
    </div>
    {S.map(([a], k) => {
      const bis = k + 1 < S.length ? S[k + 1][0] - 6 : ENDE + 6;
      const o = blende(f, a - 8, bis, 7);
      return o > 0 ? <div key={k} style={{ position: "absolute", left: 90, right: 90, top, opacity: o, translate: `0 ${steig(f, a - 8, 12) * 0.5}px`, fontFamily: SERIF, fontSize: gross, lineHeight: 1.2, color: C.text, textWrap: "pretty" }}>{daten.saetze[k]}</div> : null;
    })}
    {ls > 0 && <div style={{ position: "absolute", left: 90, right: 90, top, opacity: ls, translate: `0 ${steig(f, T.leitsatz) * 0.5}px` }}>
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 22, letterSpacing: "0.16em", textTransform: "uppercase", color: C.akzent, marginBottom: 14 }}>Leitsatz</div>
      <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: gross + 4, lineHeight: 1.18, color: C.text, textWrap: "balance" }}>{daten.leitsatz}</div>
    </div>}
  </>);
};

/** Titelkarte schon im ersten Bild (Reels nehmen es als Vorschau): das Signet steht, nur der Punkt läuft */
const Anfang: React.FC<{ hoehe: number }> = ({ hoehe }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: C.grund, opacity: interpolate(f, [T.buehne - 12, T.buehne], [1, 0], klemm) }}>
      <div style={{ position: "absolute", left: 0, width: 1080, height: 1920, top: (hoehe - 1920) / 2 }}>
        <Sequence from={-150}><Signet stil={SIGNET} /></Sequence>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: hoehe === 1920 ? 260 : 64, textAlign: "center" }}>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 34, letterSpacing: "0.2em", textTransform: "uppercase", color: C.akzent }}>Zettel {daten.nummer}</div>
        <div style={{ fontFamily: SERIF, fontSize: 84, lineHeight: 1.1, color: C.text, marginTop: 14 }}>{daten.titel}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: hoehe === 1920 ? 1380 : 1040, textAlign: "center", fontFamily: SANS, fontSize: 28, letterSpacing: "0.14em", color: C.leise }}>zu seiner zeit · {daten.zyklus.toLowerCase()}</div>
    </AbsoluteFill>
  );
};

export const AdresseVideo: React.FC<{ hoehe?: number }> = ({ hoehe = 1350 }) => {
  const hoch = hoehe === 1920;
  return (
    <Grund>
      <AbsoluteFill style={{ backgroundColor: C.grund }} />
      <Sequence from={TON}><Audio src={staticFile("adresse/stimme.mp3")} /></Sequence>
      <Buehne oy={hoch ? 300 : 0} />
      <Texte top={hoch ? 240 : 122} gross={hoch ? 58 : 54} />
      <Sequence durationInFrames={T.buehne}><Anfang hoehe={hoehe} /></Sequence>
      <Sequence from={T.outro} durationInFrames={OUTRO}>
        <AbsoluteFill style={{ overflow: "hidden", backgroundColor: C.grund }}><div style={{ position: "absolute", left: 0, width: 1080, height: 1920, top: (hoehe - 1920) / 2 }}><Signet stil={SIGNET} /></div></AbsoluteFill>
      </Sequence>
    </Grund>
  );
};
