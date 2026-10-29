// «Reise» (28. Oktober 2026): eine Kamerafahrt durch den Zettelkasten «Zu seiner Zeit» und ORNA, im Stil der Graphansicht von Obsidian.
// Wunsch: «eine weitere obsidian animation als video: diesmal eine reise durch orna und den zettelkasten: mit begriffen, verweise, quellen und namen»,
// «in der obsidian ästhetik mit viel bewegung, aber auch lesbarkeit», ohne den eigenen Namen im Bild.
// Knoten, Kanten, Begriffe, Kernsätze, Werke, Namen und Fragen liest daten.mjs aus der Website (data/reise.json); nichts ist von Hand abgetippt.
// Drei Formate aus derselben Zeitachse: 9:16 (ReiseHoch), 4:5 (ReiseVideo), 16:9 (ReiseQuer).
//   0 Intro · 1 das Netz entsteht (Zyklen, Strophen, Werke, Namen, ORNA) · 2 die Spur: Stationen über Werke und Namen
//   3 das ganze Netz mit der Spur · 4 Lab-Outro
// Seit dem 29. Oktober 2026 mehrere Suchaufträge (auftrag: reise | profil, Spuren aus daten.mjs). Die Aufträge haben statt des Lab-Signets mit Titel
// (Rückmeldung: «gar nicht gefallen hat mir die Titelsequenz mit der Schrift von "Die Reise"») das Zettelkasten-Intro (ZettelIntro.tsx):
// Punktkugel, Box mit Lichtweg, Raster 7 × 7 der 49 Strophen, darin der Suchauftrag.
import React from "react";
import { AbsoluteFill, Easing, Sequence, continueRender, delayRender, interpolate, useCurrentFrame } from "remotion";
import { SANS, SERIF, schriften } from "../vorlage/stil";
import { LabSignet } from "../wissen/LabSignet";
import daten from "./data/reise.json";
import { ZettelIntro, INTRO_DAUER } from "./ZettelIntro";

type Punkt = [number, number, number];
const klemm = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const weich = Easing.bezier(0.16, 1, 0.3, 1);
const fahrt = Easing.bezier(0.65, 0, 0.35, 1);

// ---------- Farben: Graphansicht dunkel, Akzente aus der Palette des Neubaus ----------
const F = {
  grund: "#111111", tinte: "#f2f2f2", leise: "#9a9a9a", kante: "#8a8a8a",
  strophe: "#f2f2f2", werk: "#e6b117", name: "#8fb0ff", orna: "#ffa3d1", zyklus: "#2f7a59", spur: "#e0503c",
};
const farbeVon = (k: (typeof daten.knoten)[number]) => (k.art === "name" ? (k.orna && !k.zsz ? F.orna : F.name) : F[k.art as "strophe" | "werk" | "zyklus"]);
/** Farbe zum Grau hin gemischt (u = 0 voll, 1 grau): ruhende Punkte sind gedämpft wie in Obsidian, die aktiven leuchten */
const daempfe = (hex: string, u: number) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)), g = 128;
  return `rgb(${c.map((v) => Math.round(v + (g - v) * u)).join(",")})`;
};

// ---------- Formate ----------
export type Format = "hoch" | "vier" | "quer";
export type Lay = { w: number; h: number; cx: number; cy: number; brenn: number; feld: { left: number; top: number; width: number }; titel: number; text: number; klein: number; kopf: number; zahl: number };
const LAYOUT: Record<Format, Lay> = {
  hoch: { w: 1080, h: 1920, cx: 540, cy: 720, brenn: 1050, feld: { left: 90, top: 1300, width: 900 }, titel: 76, text: 46, klein: 28, kopf: 30, zahl: 64 },
  vier: { w: 1080, h: 1350, cx: 540, cy: 450, brenn: 960, feld: { left: 90, top: 860, width: 900 }, titel: 64, text: 40, klein: 25, kopf: 27, zahl: 56 },
  quer: { w: 1920, h: 1080, cx: 1260, cy: 540, brenn: 1000, feld: { left: 110, top: 0, width: 660 }, titel: 66, text: 40, klein: 25, kopf: 27, zahl: 56 },
};
export const MASSE = Object.fromEntries(Object.entries(LAYOUT).map(([k, l]) => [k, { w: l.w, h: l.h }])) as Record<Format, { w: number; h: number }>;

// ---------- Zeitplan (Bilder bei 30 fps), je Suchauftrag ----------
export type Auftrag = "reise" | "profil" | "koerper";
type Station = (typeof daten.spuren.profil)[number] & { praxis?: string };
const FLUG = 60;
const woerter = (s: string) => s.split(/\s+/).length;
/** Lesezeit einer Station: Titel, Satz und Praxis, mindestens 1 s je 3 Wörter, dazu die Verweise */
const lesen = (s: Station) =>
  Math.max(170, Math.ceil(((woerter(s.titel) + woerter(s.text) + (s.praxis ? woerter(s.praxis) : 0)) / 3) * 30) + (s.verweise.length ? 50 : 40));
const planVon = (auftrag: Auftrag) => {
  const SPUR = (daten.spuren[auftrag] as Station[]).map((s) => ({ ...s, dauer: FLUG + lesen(s) }));
  // die Reise beginnt mit dem Lab-Signet (112 Bilder), die Suchaufträge mit dem Zettelkasten-Intro
  // für die Suchaufträge (90–120 s gewünscht) Aufbau und Schlussbild etwas knapper
  const reise = auftrag === "reise", intro = 0, aufbau = reise ? 112 : INTRO_DAUER, spur = aufbau + (reise ? 318 : 300);
  let t = spur;
  const start = SPUR.map((s) => { const a = t; t += s.dauer; return a; });
  const ganz = t, outro = ganz + (reise ? 330 : 300), ende = outro + 180;
  return { auftrag, SPUR, T: { intro, aufbau, spur, start, ganz, outro, ende } };
};
type Plan = ReturnType<typeof planVon>;
const PLAENE: Record<Auftrag, Plan> = { reise: planVon("reise"), profil: planVon("profil"), koerper: planVon("koerper") };
/** Zeitplan eines Auftrags (für Root.tsx); T ist der der ersten Reise */
export const zeitplan = (a: Auftrag) => PLAENE[a].T;
export const T = PLAENE.reise.T;
const stationBei = (P: Plan, f: number) => { let j = -1; P.T.start.forEach((s, n) => { if (s <= f) j = n; }); return j; };

// ---------- das Netz ----------
const K = daten.knoten;
const NB: number[][] = K.map(() => []);
for (const [a, b] of daten.kanten) { NB[a].push(b); NB[b].push(a); }
const mix = (a: Punkt, b: Punkt, u: number): Punkt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
/** Ort eines Knotens: die Anordnung aus daten.mjs und ein leises Atmen, wie die laufende Simulation in Obsidian */
const ort = (i: number, f: number): Punkt => {
  const p = K[i].p as Punkt, w = i * 2.399;
  return [p[0] + Math.sin(f / 47 + w) * 4, p[1] + Math.sin(f / 53 + w * 1.7) * 4, p[2] + Math.cos(f / 59 + w * 0.6) * 4];
};
const mitte = (ids: number[], f: number): Punkt => {
  const s: Punkt = [0, 0, 0];
  for (const i of ids) { const p = ort(i, f); s[0] += p[0] / ids.length; s[1] += p[1] / ids.length; s[2] += p[2] / ids.length; }
  return s;
};
const MITTE_ALLES = mitte(K.map((_, i) => i), 0);

/** wann ein Knoten im Aufbau erscheint: Zyklen, Strophen, Werke, Namen des Zettelkastens, dann ORNA */
const auftrittVon = (T: Plan["T"]) => {
  const reihe = (art: (k: (typeof K)[number]) => boolean) => K.map((k, i) => [k, i] as const).filter(([k]) => art(k)).map(([, i]) => i);
  const gruppen: [number[], number, number][] = [
    [reihe((k) => k.art === "zyklus"), 10, 30], [reihe((k) => k.art === "strophe"), 30, 80], [reihe((k) => k.art === "werk"), 70, 140],
    [reihe((k) => k.art === "name" && k.zsz), 110, 170], [reihe((k) => k.art === "name" && !k.zsz), 175, 205],
  ];
  const a = new Array(K.length).fill(0);
  for (const [ids, von, bis] of gruppen) ids.forEach((i, n) => { a[i] = T.aufbau + von + ((bis - von) * n) / ids.length; });
  // die Brücken (in beiden) leuchten erst, wenn ORNA erscheint
  return a as number[];
};
const AUFTRITTE: Record<Auftrag, number[]> = { reise: auftrittVon(PLAENE.reise.T), profil: auftrittVon(PLAENE.profil.T), koerper: auftrittVon(PLAENE.koerper.T) };

// ---------- die Spur: Wege aus echten Kanten ----------
/** Punkte eines Wegs zur Zeit f: von der Mitte der vorigen Station über die Knoten des Wegs zur Mitte der neuen */
const wegPunkte = (P: Plan, j: number, f: number): Punkt[] => {
  const SPUR = P.SPUR, s = SPUR[j], von = j ? mitte(SPUR[j - 1].ziel, f) : null;
  const p = s.weg.map((i) => ort(i, f));
  return [...(von ? [von] : []), ...p, mitte(s.ziel, f)];
};
const laengen = (ps: Punkt[]) => ps.slice(1).map((q, n) => Math.hypot(q[0] - ps[n][0], q[1] - ps[n][1], q[2] - ps[n][2]));
/** der Ort auf einem Weg bei u (0–1, nach Länge) und die Punkte bis dorthin */
const aufWeg = (ps: Punkt[], u: number) => {
  const l = laengen(ps), ganz = l.reduce((a, b) => a + b, 0) || 1;
  let rest = u * ganz;
  const bis: Punkt[] = [ps[0]];
  for (let n = 0; n < l.length; n++) {
    if (rest <= l[n] || n === l.length - 1) { const q = mix(ps[n], ps[n + 1], l[n] ? Math.min(1, rest / l[n]) : 1); bis.push(q); return { q, bis }; }
    rest -= l[n]; bis.push(ps[n + 1]);
  }
  return { q: ps[ps.length - 1], bis };
};
const flugU = (P: Plan, j: number, f: number) => interpolate(f, [P.T.start[j], P.T.start[j] + FLUG], [0, 1], { ...klemm, easing: fahrt });

// ---------- Kamera ----------
type Kamera = { ziel: Punkt; abstand: number; gier: number; neigung: number };
/** Abstand an einer Station: nah an einer Strophe; bei einer Konstellation so weit, dass beide Namen im Bild sind */
const nahVon = (P: Plan, j: number, f: number) => {
  const s = P.SPUR[j];
  if (s.art !== "orna") return 400;
  const [a, b] = s.ziel.map((i) => ort(i, f));
  return Math.max(560, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 1.45);
};
function kamera(P: Plan, f: number): Kamera {
  const { T, SPUR } = P;
  // dreht stetig um die Hochachse; jeder Flug schwenkt zusätzlich, das Ende dreht weit
  const fluege = T.start.reduce((s, a) => s + interpolate(f, [a, a + FLUG], [0, 0.55], { ...klemm, easing: fahrt }), 0);
  const gier = 0.6 + f * 0.0022 + fluege + interpolate(f, [T.ganz, T.outro], [0, 1.5], { ...klemm, easing: fahrt });
  const neigung = 0.34 + Math.sin(f / 170) * 0.12;
  const j = stationBei(P, f);
  if (j < 0) {
    const abstand = interpolate(f, [T.aufbau, T.aufbau + 220, T.spur], [1900, 1050, 980], { ...klemm, easing: weich });
    return { ziel: MITTE_ALLES, abstand, gier, neigung };
  }
  if (f >= T.ganz) {
    const u = interpolate(f, [T.ganz, T.ganz + 90], [0, 1], { ...klemm, easing: fahrt });
    return { ziel: mix(mitte(SPUR[SPUR.length - 1].ziel, f), MITTE_ALLES, u), abstand: interpolate(f, [T.ganz, T.ganz + 90, T.outro], [440, 1000, 1150], { ...klemm, easing: fahrt }), gier, neigung };
  }
  const s = SPUR[j], u = flugU(P, j, f), nah = nahVon(P, j, f);
  if (u >= 1) return { ziel: mitte(s.ziel, f), abstand: nah - Math.min(40, (f - T.start[j] - FLUG) * 0.25), gier, neigung };
  // im Flug folgt die Kamera dem Läufer und hebt sich in der Mitte des Wegs
  const { q } = aufWeg(wegPunkte(P, j, f), u);
  const vorher = j ? nahVon(P, j - 1, f) : 980;
  const hub = j ? Math.sin(u * Math.PI) * 280 : 0;
  return { ziel: j ? q : mix(MITTE_ALLES, q, u), abstand: interpolate(u, [0, 1], [vorher, nah]) + hub, gier, neigung };
}
function projiziere(p: Punkt, k: Kamera, L: Lay) {
  const x = p[0] - k.ziel[0], y = p[1] - k.ziel[1], z = p[2] - k.ziel[2];
  const c = Math.cos(k.gier), s = Math.sin(k.gier);
  const x1 = x * c + z * s, z1 = -x * s + z * c;
  const y2 = y * Math.cos(k.neigung) - z1 * Math.sin(k.neigung), z2 = y * Math.sin(k.neigung) + z1 * Math.cos(k.neigung);
  const tiefe = Math.max(40, k.abstand + z2), m = L.brenn / tiefe;
  return { x: L.cx + x1 * m, y: L.cy + y2 * m, m, tiefe };
}

// ---------- Bild des Netzes ----------
const Netz: React.FC<{ f: number; L: Lay; plan: Plan }> = ({ f, L, plan }) => {
  const { T, SPUR } = plan, AUFTRITT = AUFTRITTE[plan.auftrag];
  const sicht = (i: number, f: number) => interpolate(f, [AUFTRITT[i], AUFTRITT[i] + 12], [0, 1], klemm);
  /** ORNA-Kanten ziehen sich nach den Ringen */
  const kanteAb = (a: number, b: number, art: number) => (art === 3 ? T.aufbau + 205 + ((a * 7 + b * 13) % 40) : Math.max(AUFTRITT[a], AUFTRITT[b]) + 4);
  const k = kamera(plan, f);
  const P = K.map((_, i) => projiziere(ort(i, f), k, L));
  const j = stationBei(plan, f), s = j >= 0 && f < T.ganz ? SPUR[j] : null;
  const angekommen = s ? interpolate(f, [T.start[j] + FLUG - 14, T.start[j] + FLUG + 10], [0, 1], klemm) : 0;
  // wer leuchtet: die Station, ihre Nachbarn (Werke, Namen, Zyklus) und bei einer Strophe die Namen hinter den Werken
  const hell = new Map<number, number>();
  if (s) {
    for (const i of s.ziel) hell.set(i, 1);
    for (const i of s.ziel) for (const n of NB[i]) if (!hell.has(n)) hell.set(n, s.art === "orna" ? 0.55 : 0.9);
    for (const v of s.verweise) hell.set(v.p, 0.9);
    if (s.art === "orna" && "bruecke" in s && s.bruecke) for (const st of s.bruecke.strophen) hell.set(st.i, 0.8);
  }
  const dimm = s ? 1 - 0.78 * angekommen : 1;
  const ende = f >= T.ganz ? interpolate(f, [T.ganz + 30, T.ganz + 110], [0, 1], klemm) : 0;
  // im Aufbau leuchten die Namen, die in beiden vorkommen, kurz rosa auf
  const brueckenLicht = interpolate(f, [T.aufbau + 205, T.aufbau + 235, T.aufbau + 290, T.aufbau + 318], [0, 1, 1, 0], klemm);

  const nebel = (t: number) => interpolate(t, [k.abstand * 0.35, k.abstand * 1.9], [1, 0.25], klemm);
  const linien = daten.kanten.map(([a, b, art], n) => {
    const da = sicht(a, f), db = sicht(b, f);
    if (da <= 0 || db <= 0) return null;
    const ab = kanteAb(a, b, art), e = interpolate(f, [ab, ab + 22], [0, 1], { ...klemm, easing: weich });
    if (e <= 0) return null;
    const an = s && ((hell.get(a) === 1 || hell.get(b) === 1) || (hell.has(a) && hell.has(b) && s.art === "strophe"));
    const grund = art === 3 ? 0.11 : 0.3;
    const o = an ? 0.25 + 0.6 * angekommen : grund * dimm * nebel((P[a].tiefe + P[b].tiefe) / 2) + 0.08 * ende;
    const farbe = an ? (art === 3 ? F.orna : art === 0 ? "#6fb894" : "#c9c9c9") : F.kante;
    const x2 = P[a].x + (P[b].x - P[a].x) * e, y2 = P[a].y + (P[b].y - P[a].y) * e;
    return <line key={n} x1={P[a].x} y1={P[a].y} x2={x2} y2={y2} stroke={farbe} strokeWidth={(an ? 2.6 : 1.3) * Math.min(1.6, Math.max(0.7, (P[a].m + P[b].m) / 2))} opacity={o} />;
  });

  // die Spur: alle bisherigen Wege in Rot, der laufende bis zum Läufer
  const spurPfade: string[] = [];
  let laeufer: { x: number; y: number } | null = null;
  const bis = f >= T.ganz ? SPUR.length - 1 : j;
  for (let n = 0; n <= bis; n++) {
    if (n < 0) break;
    const u = n === j && f < T.ganz ? flugU(plan, n, f) : 1;
    if (u <= 0) continue;
    const { q, bis: punkte } = aufWeg(wegPunkte(plan, n, f), u);
    const pp = punkte.map((p) => projiziere(p, k, L));
    spurPfade.push(pp.map((p, m) => `${m ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(""));
    if (n === j && u < 1) { const p = projiziere(q, k, L); laeufer = { x: p.x, y: p.y }; }
  }

  const ordnung = P.map((p, i) => [p.tiefe, i] as const).sort((a, b) => b[0] - a[0]);
  const punkte: React.ReactNode[] = [], namen: React.ReactNode[] = [];
  for (const [, i] of ordnung) {
    const p = P[i], kn = K[i], o = sicht(i, f);
    if (o <= 0 || p.tiefe <= 60) continue;
    const pop = interpolate(f, [AUFTRITT[i], AUFTRITT[i] + 8, AUFTRITT[i] + 16], [0, 1.5, 1], klemm);
    const h = hell.get(i) ?? 0, istZiel = h === 1;
    const basis = kn.art === "zyklus" ? 14 : kn.art === "strophe" ? 6.5 : 3 + Math.sqrt(kn.grad) * 0.9;
    const r = basis * Math.min(2.6, Math.max(0.35, p.m)) * pop * (istZiel ? 1.5 + 0.12 * Math.sin(f / 5) : 1);
    const bruecke = kn.zsz && kn.orna;
    const farbe = h || ende ? farbeVon(kn) : daempfe(farbeVon(kn), bruecke && brueckenLicht ? 0 : 0.45);
    const op = (h ? 0.55 + 0.45 * Math.max(h, 1 - angekommen) : dimm * nebel(p.tiefe) + (1 - dimm) * 0.15) * o;
    punkte.push(
      <g key={i} opacity={Math.min(1, op + 0.2 * ende)}>
        {h ? <circle cx={p.x} cy={p.y} r={r * 2.6} fill={farbe} opacity={0.16 * angekommen} /> : null}
        {bruecke ? <circle cx={p.x} cy={p.y} r={r + 3.5 + brueckenLicht * 6} fill="none" stroke={F.orna} strokeWidth={2 + brueckenLicht * 2} opacity={0.55 + brueckenLicht * 0.45} /> : null}
        <circle cx={p.x} cy={p.y} r={r} fill={farbe} />
      </g>,
    );
    // Beschriftung unter dem Punkt (Obsidian): aktive gross und deutlich, die übrigen erst, wenn die Kamera nahe kommt
    let lo = 0, gr = 0;
    if (h) { lo = angekommen * (istZiel ? 1 : 0.95); gr = istZiel ? L.klein * 1.15 : kn.art === "werk" || kn.art === "name" ? L.klein : L.klein * 0.92; }
    if (!h || lo < 0.3) {
      const schwelle = kn.art === "zyklus" ? 0.45 : kn.art === "strophe" ? 0.9 : 2.1;
      const nah = interpolate(p.m, [schwelle, schwelle * 1.5], [0, 1], klemm) * (kn.art === "zyklus" || kn.art === "strophe" ? 0.7 : 0.32) * dimm * o;
      if (nah > lo) { lo = nah; gr = Math.min(L.klein * 0.95, Math.max(17, 13 * p.m)); }
    }
    if (ende && kn.art !== "werk") { lo = Math.max(lo, ende * (kn.art === "zyklus" ? 0.95 : kn.art === "strophe" ? 0.6 : 0)); gr = Math.max(gr, kn.art === "zyklus" ? L.klein : 17); }
    if (lo > 0.02 && gr > 0) {
      namen.push(
        <text key={i} x={p.x} y={p.y + r + gr * 1.05} textAnchor="middle" fontFamily={kn.art === "strophe" || kn.art === "zyklus" ? SERIF : SANS} fontSize={gr}
          fontStyle={kn.art === "werk" ? "italic" : "normal"} fontWeight={kn.art === "name" && h ? 600 : 400}
          fill={h ? (kn.art === "strophe" ? F.tinte : farbeVon(kn)) : "#cfcfcf"} opacity={lo} stroke={F.grund} strokeWidth={gr * 0.28} paintOrder="stroke" strokeLinejoin="round">
          {kn.titel}
        </text>,
      );
    }
  }
  return (
    <svg width={L.w} height={L.h} style={{ position: "absolute", inset: 0 }}>
      <g>{linien}</g>
      {spurPfade.map((d, n) => <path key={`s${n}`} d={d} fill="none" stroke={F.spur} strokeWidth={9} opacity={0.18} strokeLinecap="round" strokeLinejoin="round" />)}
      {spurPfade.map((d, n) => <path key={`t${n}`} d={d} fill="none" stroke={F.spur} strokeWidth={3.2} opacity={n === j && f < T.ganz ? 1 : 0.75} strokeLinecap="round" strokeLinejoin="round" />)}
      {punkte}
      {laeufer ? (
        <g>
          <circle cx={laeufer.x} cy={laeufer.y} r={26} fill={F.spur} opacity={0.18} />
          <circle cx={laeufer.x} cy={laeufer.y} r={11} fill={F.spur} />
        </g>
      ) : null}
      {namen}
    </svg>
  );
};

// ---------- Texte ----------
const blendeIn = (f: number, a: number, b: number, d = 14) => interpolate(f, [a, a + d, b - d, b], [0, 1, 1, 0], klemm);
const zahl = (n: number) => n.toLocaleString("de-CH");
/** das Textfeld: unten (Hochformate) oder links, senkrecht in der Mitte (Querformat); ein Verlauf hält das Netz dahinter zurück */
const Feld: React.FC<{ L: Lay; o: number; children: React.ReactNode }> = ({ L, o, children }) => {
  const quer = L.w > L.h;
  return (
    <div style={{ position: "absolute", left: L.feld.left, width: L.feld.width, ...(quer ? { top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center" } : { top: L.feld.top }),
      opacity: o, translate: `0 ${(1 - o) * 22}px` }}>
      <div>{children}</div>
    </div>
  );
};
const Schleier: React.FC<{ L: Lay }> = ({ L }) =>
  L.w > L.h ? (
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 900, background: `linear-gradient(90deg, ${F.grund} 0%, ${F.grund}ee 55%, ${F.grund}00 100%)` }} />
  ) : (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: L.feld.top - 170, background: `linear-gradient(180deg, ${F.grund}00 0%, ${F.grund}e6 26%, ${F.grund} 50%)` }} />
  );

const Aufbau: React.FC<{ f: number; L: Lay; plan: Plan }> = ({ f, L, plan }) => {
  const z = daten.zaehle, T = plan.T;
  const zeilen: [number, string, string, string][] = [
    [T.aufbau + 20, zahl(z.zyklen), "Zyklen", "#6fb894"], [T.aufbau + 40, zahl(z.strophen), "Strophen · Begriffe", F.strophe],
    [T.aufbau + 80, zahl(z.werke), "Werke · Quellen", F.werk], [T.aufbau + 120, zahl(z.namen), "Namen", F.name],
  ];
  const o = blendeIn(f, T.aufbau + 14, T.spur + 4, 18);
  const orna = interpolate(f, [T.aufbau + 180, T.aufbau + 200], [0, 1], klemm), beide = interpolate(f, [T.aufbau + 215, T.aufbau + 235], [0, 1], klemm);
  return (
    <Feld L={L} o={o}>
      <div style={{ fontFamily: SANS, fontSize: L.kopf, fontWeight: 600, color: F.leise, marginBottom: 10 }}>Zettelkasten «Zu seiner Zeit»</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 30, rowGap: 4 }}>
        {zeilen.map(([ab, n, was, farbe]) => (
          <div key={was} style={{ opacity: interpolate(f, [ab, ab + 14], [0, 1], klemm), fontFamily: SANS, color: F.tinte, whiteSpace: "nowrap" }}>
            <span style={{ fontSize: L.zahl, fontWeight: 500, letterSpacing: "-0.03em", color: farbe, fontVariantNumeric: "tabular-nums" }}>{n}</span>
            <span style={{ fontSize: L.klein, color: F.leise, marginLeft: 12 }}>{was}</span>
          </div>
        ))}
      </div>
      <div style={{ opacity: orna, marginTop: 22, fontFamily: SANS, color: F.tinte, whiteSpace: "nowrap" }}>
        <div style={{ fontSize: L.kopf, fontWeight: 600, color: F.leise, marginBottom: 4 }}>ORNA · zwei Ringe</div>
        <span style={{ fontSize: L.zahl, fontWeight: 500, letterSpacing: "-0.03em", color: F.orna }}>{zahl(z.orna)}</span>
        <span style={{ fontSize: L.klein, color: F.leise, marginLeft: 12, marginRight: 30 }}>Namen</span>
        <span style={{ fontSize: L.zahl, fontWeight: 500, letterSpacing: "-0.03em", color: F.orna }}>{zahl(z.konstellationen)}</span>
        <span style={{ fontSize: L.klein, color: F.leise, marginLeft: 12 }}>Konstellationen</span>
      </div>
      <div style={{ opacity: beide, marginTop: 16, fontFamily: SANS, fontSize: L.klein * 1.1, color: F.tinte }}>
        <span style={{ display: "inline-block", width: L.klein * 0.8, height: L.klein * 0.8, borderRadius: "50%", border: `3px solid ${F.orna}`, marginRight: 12, verticalAlign: "-0.1em" }} />
        {zahl(z.beide)} Namen stehen in beiden
      </div>
    </Feld>
  );
};

const Station: React.FC<{ f: number; L: Lay; plan: Plan }> = ({ f, L, plan }) => {
  const { T, SPUR } = plan, j = stationBei(plan, f);
  if (j < 0 || f >= T.ganz) return null;
  const s = SPUR[j], a = T.start[j], ankunft = a + FLUG - 6, o = blendeIn(f, ankunft, a + s.dauer, 16);
  const flug = j > 0 && s.ueber ? blendeIn(f, a + 2, a + FLUG + 4, 10) : 0;
  const dazu = (n: number) => interpolate(f, [ankunft + 20 + n * 7, ankunft + 36 + n * 7], [0, 1], klemm);
  const vorher = j > 0 ? SPUR[j - 1] : null;
  return (
    <>
      {/* im Flug: über welchen Namen oder welches Werk die Spur weitergeht */}
      {flug > 0 ? (
        <Feld L={L} o={flug}>
          <div style={{ fontFamily: SANS, fontSize: L.kopf, color: F.leise }}>{vorher?.titel}</div>
          <div style={{ fontFamily: SANS, fontSize: L.text * 0.9, fontWeight: 600, color: F.spur, marginTop: 8 }}>→ {s.ueber}</div>
        </Feld>
      ) : null}
      <Feld L={L} o={o}>
        <div style={{ fontFamily: SANS, fontSize: L.kopf, fontWeight: 600, color: s.art === "orna" ? F.orna : "#6fb894" }}>{s.kopf}</div>
        <div style={{ fontFamily: SERIF, fontSize: L.titel, lineHeight: 1.04, color: F.tinte, marginTop: 10, letterSpacing: "-0.01em" }}>{s.titel}</div>
        {s.praxis ? (
          <div style={{ fontFamily: SANS, fontSize: L.klein * 1.08, lineHeight: 1.34, color: "#cfcfcf", marginTop: 16, opacity: dazu(0) }}>
            <span style={{ color: F.orna, fontWeight: 600 }}>Praxis · </span>{s.praxis}
          </div>
        ) : null}
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: L.text, lineHeight: 1.28, color: "#e4e4e4", marginTop: 18 }}>{s.text}</div>
        {s.verweise.length ? (
          <div style={{ marginTop: 22, fontFamily: SANS, fontSize: L.klein, lineHeight: 1.32 }}>
            {s.verweise.map((v, n) => (
              <div key={v.w} style={{ opacity: dazu(n), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                <span style={{ color: F.name, fontWeight: 600 }}>{v.name}</span>
                <span style={{ color: F.leise }}> · </span>
                <span style={{ color: F.werk, fontStyle: "italic" }}>{v.werk}</span>
              </div>
            ))}
          </div>
        ) : null}
        {"bruecke" in s && s.bruecke ? (
          <div style={{ marginTop: 22, fontFamily: SANS, fontSize: L.klein, lineHeight: 1.35, opacity: dazu(0) }}>
            <span style={{ color: F.name, fontWeight: 600 }}>{s.bruecke.name}</span>
            <span style={{ color: F.leise }}> auch im Zettelkasten: </span>
            <span style={{ color: F.tinte }}>{s.bruecke.strophen.map((x) => `${x.nummer} ${x.titel}`).join(" · ")}</span>
          </div>
        ) : null}
      </Feld>
    </>
  );
};

const Ganz: React.FC<{ f: number; L: Lay; plan: Plan }> = ({ f, L, plan }) => {
  const { T, SPUR } = plan, z = daten.zaehle, o = blendeIn(f, T.ganz + 80, T.outro + 6, 20);
  const a = plan.auftrag === "reise" ? null : daten.auftraege[plan.auftrag];
  return (
    <Feld L={L} o={o}>
      <div style={{ fontFamily: SANS, fontSize: L.kopf, fontWeight: 600, color: F.spur }}>{a ? `${a.titel} · ` : "Die Spur · "}{SPUR.length} Stationen</div>
      <div style={{ fontFamily: SERIF, fontSize: L.text * 1.05, lineHeight: 1.3, color: F.tinte, marginTop: 14 }}>
        {SPUR.map((s) => (s.art === "orna" ? s.titel : s.titel)).join(" → ")}
      </div>
      <div style={{ fontFamily: SANS, fontSize: L.klein, color: F.leise, marginTop: 22, lineHeight: 1.4 }}>
        {a ? `${a.frauen} von ${a.namen} Adressen weiblich · ` : ""}{zahl(z.strophen)} Strophen · {zahl(z.werke)} Werke · {zahl(z.namen)} Namen · ORNA {zahl(z.konstellationen)} Konstellationen
      </div>
    </Feld>
  );
};

// ---------- das Video ----------
/** spielt ein Kind mit einer eigenen Zeit, die bei «von» beginnt (wie <Sequence>, aber ohne eigene Ebene) */
const Versetzt: React.FC<{ von: number; children: React.ReactNode }> = ({ von, children }) => <Sequence from={von} layout="none">{children}</Sequence>;
/** das Lab-Signet (gebaut für 1080 × 1350) mittig im Format, im Querformat verkleinert */
const Signet: React.FC<{ L: Lay; children: React.ReactNode }> = ({ L, children }) => {
  const m = Math.min(1, L.h / 1350);
  return <div style={{ position: "absolute", width: 1080, height: 1350, left: (L.w - 1080 * m) / 2, top: (L.h - 1350 * m) / 2, transform: `scale(${m})`, transformOrigin: "0 0" }}>{children}</div>;
};

export const ReiseVideo: React.FC<{ format?: Format; auftrag?: Auftrag }> = ({ format = "vier", auftrag = "reise" }) => {
  const f = useCurrentFrame(), L = LAYOUT[format], plan = PLAENE[auftrag], T = plan.T;
  const [handle] = React.useState(() => delayRender("Schriften"));
  React.useEffect(() => { schriften.then(() => continueRender(handle)); }, [handle]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {f >= T.aufbau - 12 && f < T.outro + 14 ? (
        <AbsoluteFill style={{ backgroundColor: F.grund, opacity: interpolate(f, [T.aufbau - 12, T.aufbau + 8, T.outro - 10, T.outro + 14], [0, 1, 1, 0], klemm) }}>
          <Netz f={f} L={L} plan={plan} />
          <Schleier L={L} />
          <Aufbau f={f} L={L} plan={plan} />
          <Station f={f} L={L} plan={plan} />
          <Ganz f={f} L={L} plan={plan} />
        </AbsoluteFill>
      ) : null}
      {auftrag === "reise" && f < T.aufbau + 4 ? <Signet L={L}><LabSignet dauer={T.aufbau + 4} kopf={{ titel: "Reise", unter: "durch den Zettelkasten und ORNA" }} /></Signet> : null}
      {auftrag !== "reise" && f < T.aufbau + 24 ? (
        <AbsoluteFill style={{ opacity: interpolate(f, [T.aufbau - 4, T.aufbau + 24], [1, 0], klemm) }}>
          <ZettelIntro f={f} L={L} auftrag={daten.auftraege[auftrag]} route={plan.SPUR.filter((x) => x.art === "strophe").map((x) => Number(x.kopf.match(/\d+/)?.[0]))} />
        </AbsoluteFill>
      ) : null}
      {f >= T.outro ? (
        <AbsoluteFill style={{ opacity: interpolate(f, [T.outro, T.outro + 14], [0, 1], klemm) }}>
          <Signet L={L}><Versetzt von={T.outro}><LabSignet dauer={T.ende - T.outro + 40} /></Versetzt></Signet>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
