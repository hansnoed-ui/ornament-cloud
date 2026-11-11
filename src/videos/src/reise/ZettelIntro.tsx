// Intro der Suchaufträge (29. Oktober 2026): der erste Teil des Intros von ornament.lab (beta/lab/, «Punktkugel → Box → Lichtweg → Feld 7 × 7»),
// hier als Funktion der Zeit, damit jedes Bild gleich herauskommt. Wunsch: «eine Animation des Zettelkastens (Punktkugel, Gitter, Raster) wie im ersten Teil
// des Intro des ornament lab … danach den jeweiligen "Suchauftrag"». Das Feld 7 × 7 sind die 49 Strophen (Zeilen = Zyklen I–VII); darin leuchten die Ziele
// des Auftrags (Rot, wie die Spur) und die Umwege (Weiss), und die Spur zieht sie in der Reihenfolge der Reise zusammen.
import React from "react";
import { interpolate } from "remotion";
import { SchriftKontext } from "./schrift";
import type { Lay } from "./Video";

export const INTRO_DAUER = 280;   // gut 9 s, danach blendet das Netz herein

type Auftrag = { titel: string; umweg: string; ziele: { nummer: number; titel: string }[]; umwege: { nummer: number; titel: string }[] };
const C = { grund: "#000000", tinte: "#ffffff", blau: "#8fb0ff", leise: "#6f6f6f", rot: "#e0503c", grau: "#9a9a9a" };
const ROEMISCH = ["I", "II", "III", "IV", "V", "VI", "VII"];

// ---------- Geometrie wie im Lab ----------
const k = (a: number, b: number, t: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const io = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const aus = (t: number) => 1 - Math.pow(1 - t, 3);
const mix = (a: number, b: number, e: number) => a + (b - a) * e;
type P3 = [number, number, number];
const zufall = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const N = 168;
const KUGEL: P3[] = Array.from({ length: N }, (_, i) => { const y = 1 - ((i + 0.5) / N) * 2, rr = Math.sqrt(1 - y * y), a = i * 2.39996; return [Math.cos(a) * rr * 1.15, y * 1.15, Math.sin(a) * rr * 1.15]; });
const ECKEN: P3[] = []; for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) ECKEN.push([x, y, z]);
const KANTEN: [number, number][] = []; ECKEN.forEach((a, i) => ECKEN.forEach((b, j) => { if (j > i && a.filter((v, q) => v !== b[q]).length === 1) KANTEN.push([i, j]); }));
const AUF_KANTE: P3[] = KUGEL.map((_, i) => { const [a, b] = KANTEN[i % 12], u = (Math.floor(i / 12) + 0.5) / Math.ceil(N / 12); return ECKEN[a].map((v, q) => mix(v, ECKEN[b][q], u)) as P3; });
// der Lichtweg: Richtung halten, an den Wänden spiegeln (wie der Lichtwürfel von PHORMA III), mit festem Startwert
const RAND = 0.47, WN = 2600;
const WEG: P3[] = (() => {
  const w: P3[] = []; let x = 0, y = 0, z = 0, vx = zufall() - 0.5, vy = zufall() - 0.5, vz = zufall() - 0.5;
  for (let i = 0; i < WN; i++) {
    const haken = zufall() < 0.025 ? 2.5 : 0.45; vx += (zufall() - 0.5) * haken; vy += (zufall() - 0.5) * haken; vz += (zufall() - 0.5) * haken;
    const l = Math.hypot(vx, vy, vz) || 1; vx /= l; vy /= l; vz /= l;
    const s = 0.009 * (0.4 + zufall()) * (zufall() < 0.02 ? 6 : 1); x += vx * s; y += vy * s; z += vz * s;
    if (Math.abs(x) > RAND) { x = Math.sign(x) * (2 * RAND - Math.abs(x)); vx = -vx; }
    if (Math.abs(y) > RAND) { y = Math.sign(y) * (2 * RAND - Math.abs(y)); vy = -vy; }
    if (Math.abs(z) > RAND) { z = Math.sign(z) * (2 * RAND - Math.abs(z)); vz = -vz; }
    w.push([(x / RAND) * 0.94, (y / RAND) * 0.94, (z / RAND) * 0.94]);
  }
  return w;
})();
const LS = 2.45, AUSBRUCH = 3.45;
const laut = (t: number) => 0.5 + 0.5 * Math.sin(t * 3.1) * Math.sin(t * 1.7 + 1);
const ausbruch = (t: number) => (t < AUSBRUCH ? 0 : Math.exp(-(t - AUSBRUCH) * 2.2) * k(AUSBRUCH, AUSBRUCH + 0.08, t));
const kopfBei = (t: number) => Math.max(0, (t - LS) * 260 + 380 * aus(k(AUSBRUCH, AUSBRUCH + 0.7, t)));
const welle = (i: number, s: number, t: number) => Math.sin(i * 0.11 + s * 1.9 + t * 2.3) * 0.6 + Math.sin(i * 0.043 - s * 2.7 + t * 1.1) * 0.4;
const KOPF40 = Math.floor(kopfBei(4.0));
const GITTER: P3[] = Array.from({ length: 49 }, (_, i) => WEG[Math.max(0, Math.min(WN - 1, KOPF40 - i * 9))]);
const drehe = (p: P3, g: number, n: number): P3 => {
  const x = p[0] * Math.cos(g) - p[2] * Math.sin(g), z = p[0] * Math.sin(g) + p[2] * Math.cos(g);
  return [x, p[1] * Math.cos(n) - z * Math.sin(n), p[1] * Math.sin(n) + z * Math.cos(n)];
};

/** Mitte und Grösse des Felds je Format: im Hochformat oben, im Querformat rechts (links steht der Auftrag) */
const buehne = (L: Lay) => (L.w > L.h ? { cx: 1310, cy: 540, GA: 300 } : L.h > 1500 ? { cx: 540, cy: 660, GA: 330 } : { cx: 540, cy: 430, GA: 255 });

export const ZettelIntro: React.FC<{ f: number; L: Lay; auftrag: Auftrag; route: number[]; ohneListen?: boolean }> = ({ f, L, auftrag, route, ohneListen = false }) => {
  const Sx = React.useContext(SchriftKontext);
  const t = f / 30, { cx, cy, GA } = buehne(L), U = GA * 1.05, m = Math.min(L.w, L.h);
  const g = t * 0.7, n = 0.42 + 0.018 * t;
  const box = (p: P3) => { const q = drehe(p, g, n), s = 3.4 / (3.4 + q[2]); return [cx + q[0] * U * s, cy + q[1] * U * s, s] as const; };
  const teile: React.ReactNode[] = [];

  // 1 Kugel → 2 Kanten der Box
  const zurKante = io(k(1.5, 2.5, t)), punkteWeg = k(2.45, 2.8, t);
  if (punkteWeg < 1) KUGEL.forEach((p, i) => {
    const atem = 1 + 0.05 * Math.sin(k(0, 1.5, t) * Math.PI), e = io(k(1.5 + (i % 12) * 0.03, 2.4 + (i % 12) * 0.03, t));
    const [x, y, s] = box(p.map((v, j) => mix(v * atem, AUF_KANTE[i][j], e)) as P3);
    const sicht = k(0.05 + (i / N) * 0.7, 0.4 + (i / N) * 0.7, t) * (1 - punkteWeg);
    if (sicht > 0) teile.push(<circle key={`k${i}`} cx={x} cy={y} r={Math.max(2, m * 0.0034) * s * (1 - zurKante * 0.3)} fill={C.tinte} opacity={sicht * Math.min(1, 0.35 + s * 0.6)} />);
  });
  // 2 die Box als Linien
  const boxSicht = k(2.1, 2.6, t) * (1 - k(4.3, 4.8, t));
  if (boxSicht > 0) teile.push(<path key="box" d={KANTEN.map(([a, b]) => { const p = box(ECKEN[a]), q = box(ECKEN[b]); return `M${p[0].toFixed(1)},${p[1].toFixed(1)}L${q[0].toFixed(1)},${q[1].toFixed(1)}`; }).join("")}
    stroke={C.tinte} strokeWidth={Math.max(1.6, m * 0.0022)} fill="none" opacity={boxSicht} />);
  // 3 das Licht in der Box: ein Kopf läuft den Weg ab, dahinter ein Bündel feiner Stränge
  const licht = k(2.45, 2.8, t) * (1 - k(4.2, 4.6, t));
  if (licht > 0) {
    const kopf = kopfBei(t), au = ausbruch(t), lt = laut(t), SL = 340 + 900 * au, von = Math.max(0, kopf - SL), amp = 0.008 + 0.07 * lt ** 1.3 + 0.06 * au;
    const zug = (i: number, s: number) => {
      const a = Math.floor(i), b = Math.min(WN - 1, a + 1), u = i - a, w = WEG[Math.min(WN - 1, a)], v = WEG[b], o = amp * Math.pow(Math.max(0, i - von) / SL, 0.7);
      return box([mix(w[0], v[0], u) + o * welle(i, s, t), mix(w[1], v[1], u) + o * welle(i + 50, s + 3, t), mix(w[2], v[2], u) + o * welle(i + 90, s + 5, t)]);
    };
    const TEILE = 10, schritt = Math.max(1, SL / 160);
    for (let s = 0; s < 5; s++) for (let c = 0; c < TEILE; c++) {
      const a = von + (SL * c) / TEILE, b = Math.min(kopf, von + (SL * (c + 1)) / TEILE);
      if (b <= a) continue;
      const tief = (c + 1) / TEILE, pkt: string[] = [];
      for (let i = a; i <= b + 1e-6; i += schritt) { const q = zug(Math.min(i, b), s); pkt.push(`${q[0].toFixed(1)},${q[1].toFixed(1)}`); }
      teile.push(<polyline key={`l${s}-${c}`} points={pkt.join(" ")} fill="none" stroke={C.tinte} strokeLinecap="round" strokeLinejoin="round"
        strokeWidth={Math.max(1.2, m * 0.0024) * (1 + 2.2 * lt * tief)} opacity={licht * tief * tief * (0.3 + 0.3 * lt + 0.2 * au)} />);
    }
    const kp = zug(kopf, 0), rb = m * (0.03 + 0.03 * lt + 0.05 * au) * kp[2];
    teile.push(<circle key="kopf" cx={kp[0]} cy={kp[1]} r={rb} fill="url(#zi-kopf)" opacity={licht} />);
    const vor = k(3.75, 4.1, t);
    if (vor > 0) GITTER.forEach((p, i) => { const [x, y, s] = box(p); teile.push(<circle key={`v${i}`} cx={x} cy={y} r={Math.max(2.2, m * 0.0038) * s} fill={C.blau} opacity={licht * vor * 0.8} />); });
  }
  // 4 das Feld 7 × 7: die 49 Strophen, Zeilen = Zyklen
  const feldAuf = k(4.0, 4.3, t);
  const ziele = new Set(auftrag.ziele.map((z) => z.nummer)), umwege = new Set(auftrag.umwege.map((z) => z.nummer));
  const ort = (nr: number) => { const i = nr - 1; return [cx + (((i % 7) - 3) / 3) * GA, cy + ((Math.floor(i / 7) - 3) / 3) * GA] as const; };
  const pos: (readonly [number, number])[] = [];
  if (feldAuf > 0) {
    for (let i = 0; i < 49; i++) {
      const a = box(GITTER[i]), e = io(k(4.0 + (i % 7) * 0.035, 4.9 + (i % 7) * 0.035, t)), [gx, gy] = ort(i + 1);
      pos[i] = [mix(a[0], gx, e), mix(a[1], gy, e)];
    }
    // die Zyklen am Rand
    const zy = k(5.0, 5.5, t);
    if (zy > 0) ROEMISCH.forEach((z, r) => teile.push(
      <text key={`z${r}`} x={cx - GA - GA * 0.28} y={cy + ((r - 3) / 3) * GA} textAnchor="end" dominantBaseline="central" fontFamily={Sx.serif} fontSize={GA * 0.1} fill={C.grau} opacity={zy}>{z}</text>));
    // die Spur des Auftrags durch das Feld, in der Reihenfolge der Reise
    const spurU = io(k(6.6, 8.6, t));
    if (spurU > 0) {
      const pk = route.map((nr) => ort(nr)), l = pk.slice(1).map((q, j) => Math.hypot(q[0] - pk[j][0], q[1] - pk[j][1])), ganz = l.reduce((a, b) => a + b, 0);
      let rest = spurU * ganz; const d = [`M${pk[0][0]},${pk[0][1]}`];
      for (let j = 0; j < l.length && rest > 0; j++) { const u = Math.min(1, rest / l[j]); d.push(`L${mix(pk[j][0], pk[j + 1][0], u)},${mix(pk[j][1], pk[j + 1][1], u)}`); rest -= l[j]; }
      teile.push(<path key="spur-glanz" d={d.join("")} fill="none" stroke={C.rot} strokeWidth={10} opacity={0.18} strokeLinecap="round" strokeLinejoin="round" />);
      teile.push(<path key="spur" d={d.join("")} fill="none" stroke={C.rot} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />);
    }
    for (let i = 0; i < 49; i++) {
      const nr = i + 1, [x, y] = pos[i], ziel = ziele.has(nr), umweg = umwege.has(nr);
      const an = ziel ? io(k(5.6 + [...ziele].indexOf(nr) * 0.18, 6.1 + [...ziele].indexOf(nr) * 0.18, t)) : umweg ? io(k(6.1 + [...umwege].indexOf(nr) * 0.18, 6.6 + [...umwege].indexOf(nr) * 0.18, t)) : 0;
      const r0 = Math.max(4, GA * 0.045), r = r0 * (1 + 1.6 * an);
      teile.push(<circle key={`f${i}`} cx={x} cy={y} r={r0} fill="none" stroke={C.leise} strokeWidth={1.6} opacity={feldAuf * (1 - an)} />);
      if (an > 0) {
        teile.push(<circle key={`a${i}`} cx={x} cy={y} r={r} fill={ziel ? C.rot : C.tinte} opacity={an} />);
        teile.push(<text key={`n${i}`} x={x} y={y + 0.5} textAnchor="middle" dominantBaseline="central" fontFamily={Sx.sans} fontWeight={600} fontSize={r * 0.95} fill={ziel ? C.tinte : C.grund} opacity={an}>{nr}</text>);
      }
    }
  }

  // der Suchauftrag in Worten
  const textAuf = (a: number) => interpolate(t, [a, a + 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const quer = L.w > L.h, auf = (a: number) => ({ opacity: textAuf(a), translate: `0 ${(1 - textAuf(a)) * 18}px` });
  return (
    <div style={{ position: "absolute", inset: 0, background: C.grund }}>
      <svg width={L.w} height={L.h} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="zi-kopf"><stop offset="0" stopColor="#ffffff" stopOpacity={0.6} /><stop offset="0.35" stopColor={C.blau} stopOpacity={0.2} /><stop offset="1" stopColor={C.blau} stopOpacity={0} /></radialGradient>
        </defs>
        {teile}
      </svg>
      <div style={{ position: "absolute", left: L.feld.left, width: L.feld.width, ...(quer ? { top: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center" } : { top: L.h > 1500 ? 1120 : 800 }) }}>
        <div>
          <div style={{ fontFamily: Sx.sans, fontSize: L.kopf, fontWeight: 600, color: C.blau, ...auf(5.2) }}>Suchauftrag · Zettelkasten und ORNA</div>
          <div style={{ fontFamily: Sx.serif, fontSize: L.titel, lineHeight: 1.04, color: C.tinte, marginTop: 12, letterSpacing: "-0.01em", ...auf(5.4) }}>{auftrag.titel}</div>
          <div style={{ fontFamily: Sx.serif, fontStyle: Sx.kursiv, fontSize: L.text, lineHeight: 1.25, color: "#e4e4e4", marginTop: 14, ...auf(5.9) }}>{auftrag.umweg}</div>
          <div style={{ fontFamily: Sx.sans, fontSize: L.klein, lineHeight: 1.45, marginTop: 22, display: ohneListen ? "none" : "block" }}>
            <div style={auf(6.1)}><span style={{ color: C.rot, fontWeight: 600 }}>Ziele </span><span style={{ color: C.tinte }}>{auftrag.ziele.map((z) => `${z.nummer} ${z.titel}`).join(" · ")}</span></div>
            {auftrag.umwege.length ? <div style={auf(6.5)}><span style={{ color: C.tinte, fontWeight: 600 }}>Umwege </span><span style={{ color: "#cfcfcf" }}>{auftrag.umwege.map((z) => `${z.nummer} ${z.titel}`).join(" · ")}</span></div> : null}
            <div style={{ ...auf(7.0), color: C.grau }}>dazu Begegnungen aus ORNA, Werke und Praxen</div>
          </div>
        </div>
      </div>
    </div>
  );
};
