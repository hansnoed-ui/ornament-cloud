// «Wissen» (27. Oktober 2026): der Stand von Christians Obsidian-Tresor als Netz, 4:5 (1080 × 1350), etwa 90 s, im Look des Labs.
// Wunsch: «ein spektakulären video, das den aktuellen stand meiner obisidian inhalte zeigt, ca 90 sekunden inklusive kleine (lab) intro und outro».
// Alle Zahlen, Titel und Auszüge liest daten.mjs aus dem Tresor (data/wissen.json); nichts ist von Hand abgetippt.
//   0 Lab-Intro mit «Wissen» und dem Stand · 1 das Netz entsteht · 2 die Bereiche · 3 vier Werke · 4 drei Konzepte mit ihren Quellen
//   5 die meistverlinkten Notizen · 6 das ganze Netz · 7 Lab-Outro
import React from "react";
import { AbsoluteFill, Easing, Sequence, continueRender, delayRender, interpolate, useCurrentFrame } from "remotion";
import { SANS, SERIF, schriften } from "../vorlage/stil";
import { LabSignet } from "./LabSignet";
import { BEREICH, LAB } from "./farben";
import daten from "./data/wissen.json";

type Punkt = [number, number, number];
const klemm = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const weich = Easing.bezier(0.16, 1, 0.3, 1);
const fahrt = Easing.bezier(0.65, 0, 0.35, 1);
const HOEHE = 1350;

// ---------- Zeitplan (Bilder bei 30 fps) ----------
/** Lesezeit eines Auszugs: mindestens 1 s pro 4 Wörter, dazu 2 s für den Flug und das Ankommen, mindestens 5 s */
const lesen = (text: string) => Math.max(150, Math.ceil((text.split(/\s+/).length / 4) * 30) + 60);
const STATIONEN = [...daten.werke, ...daten.denken].map((s) => ({ ...s, dauer: lesen(s.text) }));
const T = (() => {
  const intro = 0, netz = 120, bereiche = 480, werke = 720;
  let t = werke;
  const start = STATIONEN.map((s) => { const a = t; t += s.dauer; return a; });
  const denken = start[daten.werke.length], knoten = t, alles = knoten + 240, outro = alles + 240, ende = outro + 180;
  return { intro, netz, bereiche, werke, denken, start, knoten, alles, outro, ende };
})();
export { T };
/** die Station (Index), in der f liegt, oder 0 vor der ersten */
const stationBei = (f: number) => { let j = 0; T.start.forEach((s, n) => { if (s <= f) j = n; }); return j; };

// ---------- das Netz ----------
const N = daten.knoten.length;
/** Reihenfolge, in der die Notizen erscheinen: gemischt, aber bei jedem Rendern gleich */
const RANG = (() => {
  const r = Array.from({ length: N }, (_, i) => i);
  let s = 7; const z = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(z() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  const rang = new Array(N); r.forEach((k, i) => { rang[k] = i; }); return rang as number[];
})();
const auftritt = (i: number) => T.netz + 12 + RANG[i] * (190 / N);
const pos = (i: number, m: number): Punkt => {
  const a = daten.knoten[i].frei, b = daten.knoten[i].gruppen;
  return [a[0] + (b[0] - a[0]) * m, a[1] + (b[1] - a[1]) * m, a[2] + (b[2] - a[2]) * m];
};
const mitteVon = (bereich: string, m: number): Punkt => {
  const ks = daten.knoten.map((k, i) => [k, i] as const).filter(([k]) => k.bereich === bereich);
  const s: Punkt = [0, 0, 0];
  for (const [, i] of ks) { const p = pos(i, m); s[0] += p[0] / ks.length; s[1] += p[1] / ks.length; s[2] += p[2] / ks.length; }
  return s;
};

type Kamera = { ziel: Punkt; abstand: number; gier: number; mischung: number; cy: number };
const mix = (a: Punkt, b: Punkt, u: number): Punkt => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
/** wo die Kamera zur Zeit f steht: Ziel, Abstand, Drehung um die Hochachse, Mischung der beiden Anordnungen, Bildmitte */
function kamera(f: number): Kamera {
  const gier = f * 0.0032 + interpolate(f, [T.alles, T.outro], [0, 1.6], { ...klemm, easing: fahrt });
  const mischung = interpolate(f, [T.bereiche + 10, T.bereiche + 90], [0, 1], { ...klemm, easing: fahrt });
  const null0: Punkt = [0, 0, 0];
  if (f < T.werke) {
    // das Netz füllt das Bild: frei etwa 300 Einheiten Halbmesser, nach Bereichen etwa 450
    const abstand = interpolate(f, [T.netz, T.netz + 240, T.bereiche + 10, T.bereiche + 90], [1900, 760, 760, 1080], { ...klemm, easing: weich });
    return { ziel: null0, abstand, gier, mischung, cy: 560 };
  }
  if (f < T.knoten) {
    // von Station zu Station fliegen: die ersten 30 Bilder einer Station gehören dem Flug
    const j = stationBei(f), s = STATIONEN[j];
    const vorher: Punkt = j ? pos(STATIONEN[j - 1].i, 1) : null0, jetzt = pos(s.i, 1);
    const u = interpolate(f, [T.start[j], T.start[j] + 34], [0, 1], { ...klemm, easing: fahrt });
    const abstandVorher = j ? 520 : 1080, weg = Math.sin(u * Math.PI) * 260;
    return { ziel: mix(vorher, jetzt, u), abstand: interpolate(u, [0, 1], [abstandVorher, 520]) + weg, gier, mischung, cy: 470 };
  }
  // die meistverlinkten: zurück auf das ganze Netz; zum Schluss weit hinaus
  const u = interpolate(f, [T.knoten, T.knoten + 40], [0, 1], { ...klemm, easing: fahrt });
  const letzte = pos(STATIONEN[STATIONEN.length - 1].i, 1);
  const abstand = f < T.alles ? interpolate(u, [0, 1], [520, 1080]) : interpolate(f, [T.alles, T.outro], [1080, 1500], { ...klemm, easing: fahrt });
  return { ziel: mix(letzte, null0, u), abstand, gier, mischung, cy: interpolate(f, [T.alles, T.alles + 60], [470, 600], { ...klemm, easing: fahrt }) };
}
const NEIGUNG = 0.32, BRENN = 1000;
function projiziere(p: Punkt, k: Kamera) {
  const x = p[0] - k.ziel[0], y = p[1] - k.ziel[1], z = p[2] - k.ziel[2];
  const c = Math.cos(k.gier), s = Math.sin(k.gier);
  const x1 = x * c + z * s, z1 = -x * s + z * c;
  const y2 = y * Math.cos(NEIGUNG) - z1 * Math.sin(NEIGUNG), z2 = y * Math.sin(NEIGUNG) + z1 * Math.cos(NEIGUNG);
  const tiefe = Math.max(60, k.abstand + z2), m = BRENN / tiefe;
  return { x: 540 + x1 * m, y: k.cy + y2 * m, m, tiefe };
}

const Netz: React.FC<{ f: number }> = ({ f }) => {
  const k = kamera(f);
  // wer leuchtet: in einer Station die Notiz und ihre Nachbarn; in Szene 5 die meistverlinkten
  const j = f >= T.werke && f < T.knoten ? stationBei(f) : -1;
  const station = j >= 0 ? STATIONEN[j] : null;
  const hell = station ? new Set([station.i, ...station.nachbarn]) : null;
  const stark = f >= T.knoten && f < T.alles ? new Set(daten.meist.map((m) => m.i)) : null;
  const dimm = station ? interpolate(f, [T.start[j], T.start[j] + 24], [1, 0.16], klemm) : stark ? interpolate(f, [T.knoten, T.knoten + 30], [1, 0.28], klemm) : 1;
  const ganz = f >= T.alles ? interpolate(f, [T.alles, T.alles + 60], [0, 1], klemm) : 0;
  const P = daten.knoten.map((_, i) => projiziere(pos(i, k.mischung), k));
  const sicht = (i: number) => interpolate(f, [auftritt(i), auftritt(i) + 14], [0, 1], klemm);
  const kanten = daten.kanten.map(([a, b], n) => {
    const da = sicht(a), db = sicht(b);
    if (da <= 0 || db <= 0) return null;
    const e = Math.min(da, db) * interpolate(f, [Math.max(auftritt(a), auftritt(b)) + 8, Math.max(auftritt(a), auftritt(b)) + 30], [0, 1], klemm);
    const an = (station && (a === station.i || b === station.i)) || (stark && (stark.has(a) || stark.has(b)));
    const o = an ? 0.85 : 0.22 * (station || stark ? dimm : 1) + 0.25 * ganz;
    return <line key={n} x1={P[a].x} y1={P[a].y} x2={P[b].x} y2={P[b].y} stroke={an ? LAB.blau : "#6f7fae"} strokeWidth={an ? 2.6 : 1.4} opacity={o * e} />;
  });
  const ordnung = P.map((p, i) => [p.tiefe, i] as const).sort((a, b) => b[0] - a[0]);
  return (
    <svg width={1080} height={HOEHE} style={{ position: "absolute", inset: 0 }}>
      <g>{kanten}</g>
      {ordnung.map(([, i]) => {
        const p = P[i], kn = daten.knoten[i], o = sicht(i);
        if (o <= 0) return null;
        const istHell = (hell && hell.has(i)) || (stark && stark.has(i));
        const groesse = (3.2 + Math.sqrt(kn.grad) * 1.1) * Math.min(2.4, p.m) * (stark?.has(i) ? 1 + 0.25 * Math.sin(f / 6) + 0.6 : 1) * (station?.i === i ? 1.8 : 1);
        const op = istHell ? 1 : (station || stark ? dimm : 1);
        return (
          <g key={i} opacity={o * op}>
            {istHell || ganz > 0 ? <circle cx={p.x} cy={p.y} r={groesse * 2.6} fill={BEREICH[kn.bereich].farbe} opacity={0.18 + 0.1 * ganz} /> : null}
            <circle cx={p.x} cy={p.y} r={groesse} fill={BEREICH[kn.bereich].farbe} />
          </g>
        );
      })}
    </svg>
  );
};

// ---------- Texte ----------
const Schild: React.FC<{ o: number; children: React.ReactNode; oben?: number }> = ({ o, children, oben = 930 }) => (
  <div style={{ position: "absolute", left: 90, right: 90, top: oben, opacity: o, translate: `0 ${(1 - o) * 22}px` }}>{children}</div>
);
const blendeIn = (f: number, a: number, b: number, d = 14) => interpolate(f, [a, a + d, b - d, b], [0, 1, 1, 0], klemm);
const zahl = (n: number) => n.toLocaleString("de-CH");
const datum = (iso: string | null) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" }) : "");

const Zaehler: React.FC<{ f: number }> = ({ f }) => {
  const u = interpolate(f, [T.netz + 12, T.netz + 12 + 190], [0, 1], klemm);
  const notizen = daten.knoten.filter((_, i) => f >= auftritt(i)).length;
  const o = blendeIn(f, T.netz + 20, T.bereiche + 10);
  return (
    <Schild o={o} oben={1050}>
      <div style={{ display: "flex", gap: 48, alignItems: "baseline", fontFamily: SANS, color: LAB.tinte }}>
        <div><span style={{ fontSize: 96, fontWeight: 500, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{zahl(notizen)}</span><span style={{ fontSize: 34, color: LAB.leise, marginLeft: 14 }}>Notizen</span></div>
        <div><span style={{ fontSize: 96, fontWeight: 500, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", color: LAB.blau }}>{zahl(Math.round(daten.verweise * u))}</span><span style={{ fontSize: 34, color: LAB.leise, marginLeft: 14 }}>Verbindungen</span></div>
      </div>
    </Schild>
  );
};

const BEREICHE_GEZEIGT = ["werke", "konzepte", "quellen", "ornament", "chats"];
const Bereiche: React.FC<{ f: number }> = ({ f }) => {
  const k = kamera(f), o = blendeIn(f, T.bereiche + 60, T.werke + 6);
  return (
    <>
      {BEREICHE_GEZEIGT.map((b, n) => {
        const p = projiziere(mitteVon(b, k.mischung), k), d = interpolate(f, [T.bereiche + 60 + n * 10, T.bereiche + 84 + n * 10], [0, 1], klemm);
        return (
          <div key={b} style={{ position: "absolute", left: p.x - 200, width: 400, top: p.y - 80, textAlign: "center", opacity: Math.min(o, d), fontFamily: SANS }}>
            <div style={{ fontSize: 64, fontWeight: 500, color: BEREICH[b].farbe, letterSpacing: "-0.02em", textShadow: "0 0 18px #000, 0 0 6px #000" }}>{daten.zaehle[b as keyof typeof daten.zaehle]}</div>
            <div style={{ fontSize: 30, color: LAB.tinte, textShadow: "0 0 14px #000, 0 0 6px #000" }}>{BEREICH[b].name}</div>
          </div>
        );
      })}
    </>
  );
};

const Station: React.FC<{ f: number }> = ({ f }) => {
  if (f < T.werke || f >= T.knoten) return null;
  const j = stationBei(f), s = STATIONEN[j], a = T.start[j], o = blendeIn(f, a + 26, a + s.dauer, 16);
  const quellen = j >= daten.werke.length ? s.nachbarn.filter((n) => daten.knoten[n].bereich === "quellen") : [];
  return (
    <>
      <Schild o={o} oben={quellen.length ? 860 : 900}>
        <div style={{ fontFamily: SANS, fontSize: 30, fontWeight: 600, color: BEREICH[s.bereich].farbe }}>
          {BEREICH[s.bereich].eins} · {s.nachbarn.length} verknüpfte Notizen
        </div>
        <div style={{ fontFamily: SERIF, fontSize: 60, lineHeight: 1.05, color: LAB.tinte, marginTop: 14, letterSpacing: "-0.01em" }}>{s.titel}</div>
        <div style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 38, lineHeight: 1.3, color: "#d8d8d8", marginTop: 22 }}>{s.text}</div>
        {/* bei den Konzepten: die Quellen, mit denen sie verlinkt sind (im Netz rot) */}
        {quellen.length ? (
          <div style={{ fontFamily: SANS, fontSize: 26, lineHeight: 1.35, color: BEREICH.quellen.farbe, marginTop: 20, opacity: interpolate(f, [a + 50, a + 70], [0, 1], klemm) }}>
            {quellen.map((n) => daten.knoten[n].titel).join(" · ")}
          </div>
        ) : null}
      </Schild>
    </>
  );
};

const Meist: React.FC<{ f: number }> = ({ f }) => {
  const o = blendeIn(f, T.knoten + 30, T.alles + 4);
  const max = daten.meist[0].verweise;
  return (
    <Schild o={o} oben={870}>
      <div style={{ fontFamily: SANS, fontSize: 30, fontWeight: 600, color: LAB.blau, marginBottom: 18 }}>Am meisten verlinkt</div>
      {daten.meist.map((m, n) => {
        const d = interpolate(f, [T.knoten + 40 + n * 9, T.knoten + 70 + n * 9], [0, 1], { ...klemm, easing: weich });
        return (
          <div key={m.i} style={{ display: "grid", gridTemplateColumns: "1fr 80px", alignItems: "center", gap: 18, marginTop: 10, opacity: d, fontFamily: SANS }}>
            <div>
              <div style={{ fontSize: 28, color: LAB.tinte, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.titel}</div>
              <div style={{ height: 6, marginTop: 6, width: `${(m.verweise / max) * 100 * d}%`, background: BEREICH[m.bereich].farbe }} />
            </div>
            <div style={{ fontSize: 40, fontWeight: 500, textAlign: "right", color: BEREICH[m.bereich].farbe, fontVariantNumeric: "tabular-nums" }}>{Math.round(m.verweise * d)}</div>
          </div>
        );
      })}
    </Schild>
  );
};

const Schluss: React.FC<{ f: number }> = ({ f }) => {
  const o = blendeIn(f, T.alles + 50, T.outro + 4, 20);
  return (
    <Schild o={o} oben={1110}>
      <div style={{ fontFamily: SANS, fontSize: 34, color: LAB.leise, textAlign: "center" }}>
        {zahl(daten.notizen)} Notizen · {zahl(daten.verweise)} Verbindungen · Stand {datum(daten.stand)}
      </div>
    </Schild>
  );
};

// ---------- das Video ----------
export const WissenVideo: React.FC = () => {
  const f = useCurrentFrame();
  const [handle] = React.useState(() => delayRender("Schriften"));
  React.useEffect(() => { schriften.then(() => continueRender(handle)); }, [handle]);
  return (
    <AbsoluteFill style={{ backgroundColor: LAB.grund, overflow: "hidden" }}>
      {f >= T.netz - 10 && f < T.outro + 14 ? (
        <AbsoluteFill style={{ opacity: interpolate(f, [T.netz - 10, T.netz + 10, T.outro - 10, T.outro + 14], [0, 1, 1, 0], klemm) }}>
          <Netz f={f} />
          <Zaehler f={f} />
          <Bereiche f={f} />
          <Station f={f} />
          <Meist f={f} />
          <Schluss f={f} />
        </AbsoluteFill>
      ) : null}
      {f < T.netz + 4 ? <AbsoluteFill><LabSignet dauer={T.netz + 4} kopf={{ titel: "Wissen", unter: `Obsidian · Stand ${datum(daten.stand)}` }} /></AbsoluteFill> : null}
      {f >= T.outro ? <AbsoluteFill style={{ opacity: interpolate(f, [T.outro, T.outro + 14], [0, 1], klemm) }}><Versetzt von={T.outro}><LabSignet dauer={T.ende - T.outro + 40} /></Versetzt></AbsoluteFill> : null}
    </AbsoluteFill>
  );
};

/** spielt ein Kind mit einer eigenen Zeit, die bei «von» beginnt (wie <Sequence>, aber ohne eigene Ebene) */
const Versetzt: React.FC<{ von: number; children: React.ReactNode }> = ({ von, children }) => <Sequence from={von} layout="none">{children}</Sequence>;
