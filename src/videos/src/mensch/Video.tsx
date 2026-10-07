// Video «Mensch, Niklas!» (Titel von Christian, 7. Oktober 2026): Christian erzählt, warum und woran er seit einigen Monaten arbeitet –
// die alte Frage nach dem Menschen bei Luhmann, der stille, nicht wahrgenommene Körper, die Raster «Nebeneinander, Nacheinander» und «Der Verteilapparat
// des Körpers», die Arbeit mit LLMs und sozialen Medien. Schluss: «The story so far …» – «Fortsetzung folgt».
// 3:4 (1080 × 1440), 30 fps, ohne Ton. Stil wie «Drei im Doppelspalt der Wahrnehmung» (Pop-Art mit viel Lichtenstein; Bausteine aus ../dreiervergleich/Pop).
// Figuren: der Erzähler (stilisiert, Ich-Form) und Luhmann als Geist, der nur mit Zettelnummern antwortet. Texte: eigene Lesart (texte.ts).
import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Grund, INTRO, OUTRO } from "../vorlage/Bausteine";
import { benday, ein, klemm, pop } from "../doppelpruefung/Comic";
import { Blase, Feld, Grundpunkte, Iris, Knall, P, PopIntro, PopOutro, Rahmen, Schild, Stempel, Strahlen, Wolke, fett } from "../dreiervergleich/Pop";
import { Geist, Ich, Punktmuster, Zettel } from "./Figuren";
import { DEBATTE, T as TX, ZETTEL } from "./texte";

// Zeitplan in Bildern; die Szenen überlappen um UEBER Bilder (Kreisblende)
const D = { frage: 390, gefunden: 300, organisation: 330, wende: 390, still: 480, nn: 620, verteil: 450, faelle: 420, theorien: 270, feld: 360, bisher: 450 };
const UEBER = 18, INTRO_LANG = INTRO + 45, OUTRO_LANG = OUTRO + 60;
export const T = (() => {
  const t: Record<string, number> = { intro: 0 };
  let a = INTRO_LANG - UEBER;
  for (const [k, d] of Object.entries(D)) { t[k] = a; a += d - UEBER; }
  t.signet = a; t.ende = a + OUTRO_LANG;
  return t as Record<keyof typeof D | "intro" | "signet" | "ende", number>;
})();

/** Erzählkasten in der Ich-Form: gelb, Versalien, frei platziert; sichtbar von a bis b */
const Erzaehl: React.FC<{ f: number; a: number; b?: number; x: number; y: number; w: number; groesse?: number; farbe?: string; children: React.ReactNode }> = ({ f, a, b = 1e9, x, y, w, groesse = 38, farbe = P.gelb, children }) => {
  const o = Math.min(ein(f, a, 10), interpolate(f, [b - 10, b], [1, 0], klemm));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, opacity: o, transform: `translateY(${interpolate(f, [a, a + 14], [20, 0], klemm)}px)` }}>
      <div style={{ display: "inline-block", background: farbe, border: `6px solid ${P.ink}`, padding: "18px 24px 16px", ...fett(groesse, { lineHeight: 1.2, letterSpacing: "0.015em", textTransform: "uppercase", textWrap: "balance" }) }}>{children}</div>
    </div>
  );
};

/** Zettel, die der Geist hergibt: fliegen aus dem Kasten (x0, y0) an ihren Platz */
const Zettelflug: React.FC<{ f: number; a: number; x0: number; y0: number; ziel: [number, number, number][]; nummern?: string[] }> = ({ f, a, x0, y0, ziel, nummern = ZETTEL }) => (
  <>
    {ziel.map(([x, y, dreh], i) => {
      const t = interpolate(f, [a + i * 12, a + i * 12 + 22], [0, 1], { ...klemm, easing: (v) => 1 - Math.pow(1 - v, 3) });
      if (t <= 0) return null;
      return <Zettel key={i} x={x0 + (x - x0) * t} y={y0 + (y - y0) * t - Math.sin(t * Math.PI) * 120} nummer={nummern[i % nummern.length]} drehung={dreh * t} p={0.5 + 0.5 * t} breite={170} />;
    })}
  </>
);

// ---------- 1 · Die alte Frage ----------
const Frage: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Grundpunkte farbe="rgba(23,71,201,.45)">
      <Schild f={f} farbe={P.weiss}>Die alte Frage</Schild>
      {/* Zeitstrahl der Debatte */}
      <div style={{ position: "absolute", left: 70, right: 70, top: 405, height: 10, background: P.ink, transform: `scaleX(${interpolate(f, [10, 40], [0, 1], klemm)})`, transformOrigin: "0 50%" }} />
      {DEBATTE.map(([jahr, text], i) => {
        const p = pop(f, 30 + i * 22, 200), oben = i % 2 === 0;
        const x = 70 + Math.floor(i / 2) * 305;
        return (
          <React.Fragment key={jahr}>
            <div style={{ position: "absolute", left: x + 14, top: 398, width: 24, height: 24, borderRadius: "50%", background: P.rot, border: `5px solid ${P.ink}`, transform: `scale(${p})` }} />
            <div style={{ position: "absolute", left: x, top: oben ? 170 : 450, width: 290, padding: "10px 14px", background: P.weiss, border: `5px solid ${P.ink}`, transform: `scale(${p}) rotate(${oben ? -1.5 : 1.5}deg)`, transformOrigin: oben ? "20% 100%" : "20% 0%", zIndex: i }}>
              <div style={fett(40, { color: P.blau, lineHeight: 1 })}>{jahr}</div>
              <div style={fett(24, { fontWeight: 600, lineHeight: 1.15, marginTop: 6 })}>{text}</div>
            </div>
          </React.Fragment>
        );
      })}
      <Erzaehl f={f} a={170} b={290} x={70} y={720} w={560} groesse={38}>{TX.frage}</Erzaehl>
      {TX.sofort.split(" ").map((w, i) => <Knall key={w} p={pop(f, 290 + i * 14, 200)} x={[220, 400][i]} y={[820, 960][i]} r={150} farbe={i ? P.koral : P.gelb} innen={i ? P.gelb : P.weiss} text={w.toUpperCase()} groesse={46} textfarbe={i ? P.weiss : P.rot} drehung={[-8, 6][i]} />)}
      <Geist x={110} y={1030} massstab={1.05} schwebe={f} opacity={ein(f, 40, 20)} />
      <Ich x={600} y={940} massstab={1.03} spricht={f > 320} />
      <Blase x={560} y={760} w={420} farbe={P.weiss} p={pop(f, 320, 180)} drehung={2}><span style={{ fontSize: 46 }}>{TX.mensch}</span></Blase>
    </Grundpunkte>
  );
};

// ---------- 2 · Ich fand mich – in den Kopplungen ----------
// Nicht in einem System, sondern in den Kopplungen von Körper, Bewusstsein und Kommunikation (Hinweis von Christian, 7. Oktober 2026):
// Wahrnehmung koppelt Körper und Bewusstsein, Sprache koppelt Bewusstsein und Kommunikation; zwischen Körper und Kommunikation keine direkte Kopplung («?»).
const Gefunden: React.FC = () => {
  const f = useCurrentFrame();
  const systeme: [string, number, number, string][] = [["Bewusstsein", 540, 265, P.koral], ["Körper", 220, 715, P.gelb], ["Kommunikation", 860, 715, P.tuerkis]];
  const baender: [number, number, string, number, number][] = [[0, 1, TX.kopplungen[0], 300, 455], [0, 2, TX.kopplungen[1], 780, 455]];
  return (
    <Grundpunkte farbe="rgba(18,181,169,.55)">
      <Schild f={f} farbe={P.tuerkis}>Ich fand mich</Schild>
      <svg width="1080" height="1440" style={{ position: "absolute", inset: 0 }}>
        {baender.map(([a, b], i) => {
          const z = interpolate(f, [40 + i * 30, 70 + i * 30], [0, 1], klemm), [, x1, y1] = systeme[a], [, x2, y2] = systeme[b];
          return <path key={i} d={`M${x1} ${y1} L${x1 + (x2 - x1) * z} ${y1 + (y2 - y1) * z}`} stroke={P.ink} strokeWidth="26" strokeLinecap="round" />;
        })}
        {baender.map(([a, b], i) => {
          const z = interpolate(f, [40 + i * 30, 70 + i * 30], [0, 1], klemm), [, x1, y1] = systeme[a], [, x2, y2] = systeme[b];
          return <path key={`i${i}`} d={`M${x1} ${y1} L${x1 + (x2 - x1) * z} ${y1 + (y2 - y1) * z}`} stroke={P.himmel} strokeWidth="12" strokeLinecap="round" />;
        })}
        <path d="M220 715 H860" stroke={P.ink} strokeWidth="6" strokeDasharray="18 14" opacity={ein(f, 110)} />
      </svg>
      {systeme.map(([name, x, y, farbe], i) => (
        <div key={name} style={{ position: "absolute", left: x - 160, top: y - 65, width: 320, height: 130, border: `7px solid ${P.ink}`, boxSizing: "border-box", ...benday("rgba(255,255,255,.3)", 3.4, 13), backgroundColor: farbe, transform: `scale(${pop(f, 8 + i * 10, 200)})`, ...fett(33, { display: "grid", placeItems: "center" }) }}>{name}</div>
      ))}
      {baender.map(([, , text, x, y], i) => (
        <div key={text} style={{ position: "absolute", left: x - 150, top: y - 32, width: 300, textAlign: "center", whiteSpace: "nowrap", padding: "8px 10px", background: P.weiss, border: `5px solid ${P.ink}`, transform: `scale(${pop(f, 75 + i * 30, 220)}) rotate(${i ? 3 : -3}deg)`, ...fett(30) }}>
          {text} <span style={{ color: P.tuerkis, WebkitTextStroke: `1.5px ${P.ink}` }}>✓</span>
        </div>
      ))}
      <div style={fett(56, { position: "absolute", left: 520, top: 735, color: P.rot, WebkitTextStroke: `2px ${P.ink}`, opacity: ein(f, 115) })}>?</div>
      <Ich x={430} y={440} massstab={0.62} id="ich-kopplung" style={{ opacity: ein(f, 130, 15) }} />
      <Erzaehl f={f} a={140} x={70} y={900} w={940} groesse={38}>{TX.gefunden}</Erzaehl>
    </Grundpunkte>
  );
};

// ---------- 3 · Sogar in der Organisation ----------
const Organisation: React.FC = () => {
  const f = useCurrentFrame();
  // Organigramm: Kästchen mit Köpfen; aus ihnen Gedankenwolken (Alternativen) und Sprechblasen (mündliche Geschichte)
  const knoten: [number, number][] = [[430, 180], [200, 360], [430, 360], [660, 360], [200, 540], [660, 540]];
  return (
    <Grundpunkte farbe="rgba(255,210,31,.8)">
      <Schild f={f} farbe={P.gelb}>Sogar in der Organisation</Schild>
      <svg width="1080" height="1440" style={{ position: "absolute", inset: 0 }}>
        <path d="M520 270 V320 M290 320 H750 M290 320 V360 M520 320 V360 M750 320 V360 M290 450 V540 M750 450 V540" stroke={P.ink} strokeWidth="7" fill="none" opacity={ein(f, 10)} />
      </svg>
      {knoten.map(([x, y], i) => (
        <div key={i} style={{ position: "absolute", left: x, top: y, width: 180, height: 90, background: P.weiss, border: `6px solid ${P.ink}`, transform: `scale(${pop(f, 8 + i * 6, 220)})`, display: "grid", placeItems: "center" }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#ffd8b5", border: `5px solid ${P.ink}` }} />
        </div>
      ))}
      {[["A?", 120, 250], ["B?", 860, 250], ["C?", 860, 470]].map(([t, x, y], i) => (
        <div key={i} style={{ position: "absolute", left: x as number, top: y as number, padding: "8px 16px", borderRadius: 30, background: P.himmel, border: `5px solid ${P.ink}`, transform: `scale(${pop(f, 60 + i * 10)})`, ...fett(30) }}>{t}</div>
      ))}
      {["weisst du noch …", "damals hiess es …"].map((t, i) => (
        <div key={t} style={{ position: "absolute", left: [80, 650][i], top: 660, padding: "10px 18px", borderRadius: 26, background: P.weiss, border: `5px solid ${P.ink}`, transform: `scale(${pop(f, 90 + i * 14)}) rotate(${i ? 3 : -3}deg)`, ...fett(28, { fontStyle: "italic", fontWeight: 600 }) }}>{t}</div>
      ))}
      <Erzaehl f={f} a={30} b={205} x={70} y={790} w={940} groesse={36}>{TX.organisation}</Erzaehl>
      <Geist x={760} y={1020} massstab={0.95} schwebe={f} spiegeln />
      <Zettelflug f={f} a={120} x0={830} y0={1080} ziel={[[560, 1090, -8]]} nummern={["44/2c"]} />
      <Ich x={70} y={960} massstab={0.95} />
      <Wolke p={pop(f, 215, 150)} x={330} y={800} w={520} h={190}><span style={fett(42)}>{TX.vermisst}</span></Wolke>
    </Grundpunkte>
  );
};

// ---------- 4 · Die Wende ----------
const Wende: React.FC = () => {
  const f = useCurrentFrame();
  const schub = interpolate(f, [40, 200], [0, 1], klemm);
  const geraete = [
    { label: "Computer", farbe: P.himmel, a: 20 }, { label: "Internet", farbe: P.tuerkis, a: 60 }, { label: "Social Media", farbe: P.koral, a: 100 }, { label: "KI", farbe: P.gelb, a: 140 },
  ];
  return (
    <Grundpunkte farbe="rgba(224,20,30,.45)">
      <Schild f={f} farbe={P.weiss}>Die Wende</Schild>
      {/* Umwelt am rechten Rand */}
      <div style={{ position: "absolute", right: 35, top: 160, bottom: 35, width: 230, borderLeft: `7px dashed ${P.ink}`, ...benday("rgba(23,71,201,.35)", 3.4, 13), opacity: ein(f, 60) }}>
        <div style={fett(34, { position: "absolute", top: 20, left: 0, right: 0, textAlign: "center", letterSpacing: "0.1em" })}>UMWELT</div>
      </div>
      {geraete.map((g, i) => {
        const p = pop(f, g.a, 200);
        return (
          <div key={g.label} style={{ position: "absolute", left: 70 + i * 40, top: 180 + i * 120, width: 360, height: 100, background: g.farbe, border: `6px solid ${P.ink}`, transform: `translateX(${(1 - p) * -700}px) rotate(${[-3, 2, -2, 3][i]}deg)`, display: "flex", alignItems: "center", gap: 18, padding: "0 20px", boxSizing: "border-box", ...fett(38) }}>
            <span style={{ fontSize: 46 }}>{["▣", "◎", "♥", "…"][i]}</span>{g.label}
          </div>
        );
      })}
      <Ich x={420 + schub * 380} y={330 + schub * 150} massstab={1 - schub * 0.35} grau={schub * 0.85} />
      <Erzaehl f={f} a={20} b={215} x={70} y={1000} w={700} groesse={36}>{TX.wende}</Erzaehl>
      <Erzaehl f={f} a={225} x={70} y={1000} w={700} groesse={36}>{TX.wo}</Erzaehl>
    </Grundpunkte>
  );
};

// ---------- 5 · Suchrichtung 1: der stille, nicht wahrgenommene Körper ----------
const Still: React.FC = () => {
  const f = useCurrentFrame();
  const mess = f > 230;
  const puls = (Math.sin(f / 5) + 1) / 2;
  return (
    <Grundpunkte farbe="rgba(18,181,169,.55)">
      <Schild f={f} farbe={P.tuerkis}>Suchrichtung 1 · der stille Körper</Schild>
      {/* Körper im Röntgenblick */}
      <svg width="1080" height="1440" style={{ position: "absolute", inset: 0 }}>
        <defs><Punktmuster id="still-grau" farbe="rgba(0,0,0,.18)" r={2.6} a={10} /></defs>
        <g opacity={ein(f, 5, 15)}>
          <circle cx="270" cy="260" r="80" fill={P.weiss} stroke={P.ink} strokeWidth="8" />
          <path d="M170 380 C 170 350, 200 340, 270 340 C 340 340, 370 350, 370 380 L 380 820 C 380 850, 160 850, 160 820 Z" fill={P.weiss} stroke={P.ink} strokeWidth="8" />
          <path d="M170 390 L100 700 M370 390 L440 700" stroke={P.ink} strokeWidth="26" strokeLinecap="round" />
          {/* wahrgenommen: Augen und Ohren leuchten */}
          {[[245, 250], [295, 250]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={14 + puls * 4} fill={P.gelb} stroke={P.ink} strokeWidth="5" />)}
          {[[188, 262], [352, 262]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="12" ry="22" fill={P.gelb} stroke={P.ink} strokeWidth="5" />)}
          {/* still: Herz, Immunzellen, Darm – grau, ohne Wahrnehmung */}
          <path d="M300 430 c -20 -30 -60 -10 -40 20 l40 36 l40 -36 c 20 -30 -20 -50 -40 -20 Z" fill="url(#still-grau)" stroke={P.ink} strokeWidth="5" />
          <path d="M210 600 q 30 -40 60 0 t 60 0 q -30 40 -60 0 t -60 0 q 30 60 60 30 t 60 30" fill="none" stroke="#8a8580" strokeWidth="12" strokeLinecap="round" />
          {[[220, 470], [330, 520], [240, 720], [320, 760]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${f * 1.2 + i * 40})`}><circle r="16" fill="#cfcac3" stroke={P.ink} strokeWidth="4" /><path d="M0 -16 V-28 M-6 -34 L0 -28 L6 -34" stroke={P.ink} strokeWidth="3" fill="none" /></g>
          ))}
        </g>
        {/* Messung: Strahlen von den stillen Organen zum Gerät, an der Wahrnehmung vorbei */}
        {mess ? [[300, 460], [270, 620], [320, 760]].map(([x, y], i) => <path key={i} d={`M${x} ${y} C 520 ${y}, 560 ${560 + i * 30}, 640 560`} fill="none" stroke={P.rot} strokeWidth="6" strokeDasharray="16 12" strokeDashoffset={-f * 3} opacity={ein(f, 235 + i * 8)} />) : null}
      </svg>
      {/* Liste der stillen Prozesse */}
      <div style={{ position: "absolute", left: 600, top: 180, width: 410 }}>
        {TX.stillListe.map((w, i) => (
          <div key={w} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12, opacity: ein(f, 40 + i * 12), transform: `translateX(${interpolate(f, [40 + i * 12, 54 + i * 12], [60, 0], klemm)}px)` }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#cfcac3", border: `5px solid ${P.ink}` }} />
            <div style={fett(36)}>{w}</div>
          </div>
        ))}
      </div>
      {/* Messgerät und Daten in die Kommunikation */}
      {mess ? (
        <div style={{ position: "absolute", left: 640, top: 520, width: 330, height: 200, background: P.dunkel, border: `7px solid ${P.ink}`, transform: `scale(${pop(f, 230, 200)})`, overflow: "hidden" }}>
          <svg width="316" height="186" style={{ position: "absolute", inset: 0 }}>
            <path d={Array.from({ length: 40 }, (_, i) => `${i ? "L" : "M"}${i * 8} ${100 + Math.sin(i * 0.9 + f / 4) * 30 * (i % 7 === 3 ? 2 : 0.6)}`).join(" ")} fill="none" stroke={P.tuerkis} strokeWidth="5" />
          </svg>
          <div style={fett(24, { position: "absolute", left: 14, top: 10, color: P.gelb })}>MESSUNG</div>
        </div>
      ) : null}
      {mess ? ["CRP 12 mg/l", "HbA1c 6,1 %", "Schlaf 5:40 h"].map((t, i) => {
        const p = pop(f, 270 + i * 18, 200);
        return <div key={t} style={{ position: "absolute", left: 620 + i * 20, top: 760 + i * 70, padding: "8px 16px", background: P.weiss, border: `5px solid ${P.ink}`, transform: `scale(${p}) rotate(${[-3, 2, -1][i]}deg)`, ...fett(30) }}>{t} →</div>;
      }) : null}
      <Erzaehl f={f} a={20} b={225} x={70} y={1000} w={940} groesse={40}>{TX.still}</Erzaehl>
      <Erzaehl f={f} a={240} x={70} y={1000} w={940} groesse={36}>{TX.gemessen}</Erzaehl>
    </Grundpunkte>
  );
};

// ---------- 6 · Suchrichtung 2: Nebeneinander, Nacheinander ----------
// Die Intuition hinter dem ersten Raster als Kette in sechs Bildern (Wunsch von Christian, 7. Oktober 2026):
// Raum und Zeit sind Wahrnehmungsmedien → Theorien mit Verräumlichung und Verzeitlichung zeigen auf Wahrnehmung → auf Menschen und Tiere, auf Körper →
// die Einschätzungen des Rasters treffen die eigene Wahrnehmung nicht schlecht → so lässt sich Wahrnehmung an Kommunikation anschliessen → Pointe: Karen Barad.
const SCHRITT = 85;
const NN: React.FC = () => {
  const f = useCurrentFrame();
  const kachel = (i: number, inhalt: React.ReactNode) => {
    const sp = i % 2, ze = Math.floor(i / 2), a = 15 + i * SCHRITT, aktiv = f >= a && f < a + SCHRITT;
    return (
      <div key={i} style={{ position: "absolute", left: 70 + sp * 480, top: 205 + ze * 258, width: 460, height: 238, background: P.weiss, border: `7px solid ${P.ink}`, boxSizing: "border-box", overflow: "hidden",
        transform: `scale(${pop(f, a, 200)})`, outline: aktiv ? `6px solid ${P.rot}` : "none", outlineOffset: 4 }}>
        <div style={fett(30, { position: "absolute", left: 0, top: 0, width: 48, height: 48, background: P.gelb, borderRight: `5px solid ${P.ink}`, borderBottom: `5px solid ${P.ink}`, display: "grid", placeItems: "center" })}>{i + 1}</div>
        {inhalt}
      </div>
    );
  };
  const auge = (x: number, y: number, s = 1) => (
    <svg width={140 * s} height={90 * s} viewBox="0 0 140 90" style={{ position: "absolute", left: x, top: y }}>
      <path d="M5 45 Q70 -15 135 45 Q70 105 5 45 Z" fill={P.weiss} stroke={P.ink} strokeWidth="7" /><circle cx="70" cy="45" r="22" fill={P.blau} stroke={P.ink} strokeWidth="5" /><circle cx="70" cy="45" r="9" fill={P.ink} />
    </svg>
  );
  const barad = 15 + 5 * SCHRITT;
  return (
    <Grundpunkte farbe="rgba(23,71,201,.45)">
      <Schild f={f} farbe={P.blau}><span style={{ color: P.weiss }}>Suchrichtung 2 · Nebeneinander, Nacheinander</span></Schild>
      {/* 1 · Raum und Zeit sind Wahrnehmungsmedien */}
      {kachel(0, <>
        {auge(70, 70)}
        <svg width="130" height="130" viewBox="0 0 130 130" style={{ position: "absolute", left: 260, top: 50 }}><circle cx="65" cy="65" r="55" fill={P.gelb} stroke={P.ink} strokeWidth="7" /><path d={`M65 65 L65 25 M65 65 L${65 + Math.cos(f / 10) * 32} ${65 + Math.sin(f / 10) * 32}`} stroke={P.ink} strokeWidth="7" strokeLinecap="round" /></svg>
        <div style={fett(26, { position: "absolute", left: 60, top: 190 })}>Raum</div><div style={fett(26, { position: "absolute", left: 290, top: 190 })}>Zeit</div>
      </>)}
      {/* 2 · Theorien mit X und Y zeigen auf Wahrnehmung */}
      {kachel(1, <>
        <svg width="200" height="170" viewBox="0 0 200 170" style={{ position: "absolute", left: 50, top: 50 }}><path d="M20 150 H190 M20 150 V10" stroke={P.ink} strokeWidth="7" /><text x="185" y="140" textAnchor="end" fontFamily="Instrument Sans" fontWeight={700} fontSize="26" fill={P.blau}>X</text><text x="30" y="30" fontFamily="Instrument Sans" fontWeight={700} fontSize="26" fill={P.rot}>Y</text><circle cx="140" cy="50" r="14" fill={P.koral} stroke={P.ink} strokeWidth="5" /></svg>
        <div style={fett(60, { position: "absolute", left: 250, top: 70 })}>→</div>
        {auge(300, 80, 0.9)}
      </>)}
      {/* 3 · also auf Menschen und Tiere – auf Körper */}
      {kachel(2, <svg width="446" height="228" viewBox="0 0 446 228" style={{ position: "absolute", inset: 0 }}>
        <circle cx="130" cy="70" r="30" fill="#ffd8b5" stroke={P.ink} strokeWidth="6" /><path d="M90 200 V130 Q90 105 130 105 Q170 105 170 130 V200 Z" fill={P.tuerkis} stroke={P.ink} strokeWidth="6" />
        <ellipse cx="320" cy="150" rx="70" ry="35" fill="#c98a4b" stroke={P.ink} strokeWidth="6" /><circle cx="390" cy="105" r="28" fill="#c98a4b" stroke={P.ink} strokeWidth="6" /><path d="M378 80 l-6 -24 l18 14 M398 80 l8 -22 l6 22" fill="#c98a4b" stroke={P.ink} strokeWidth="5" strokeLinejoin="round" />
        <path d="M275 180 V210 M300 182 V212 M345 182 V212 M368 180 V210" stroke={P.ink} strokeWidth="9" strokeLinecap="round" /><path d="M250 140 q -30 -10 -36 -40" fill="none" stroke={P.ink} strokeWidth="8" strokeLinecap="round" />
      </svg>)}
      {/* 4 · die Einschätzung des Rasters trifft die eigene Wahrnehmung nicht schlecht */}
      {kachel(3, <>
        {[["Raster", 150, P.blau], ["ich", 136, P.koral]].map(([n, h, farbe], k) => (
          <React.Fragment key={n as string}>
            <div style={{ position: "absolute", left: 110 + k * 140, bottom: 50, width: 90, height: (h as number) * interpolate(f, [15 + 3 * SCHRITT, 45 + 3 * SCHRITT], [0, 1], klemm), background: farbe as string, border: `6px solid ${P.ink}` }} />
            <div style={fett(24, { position: "absolute", left: 100 + k * 140, bottom: 12, width: 110, textAlign: "center" })}>{n as string}</div>
          </React.Fragment>
        ))}
        <div style={fett(60, { position: "absolute", left: 360, top: 60, color: P.tuerkis, WebkitTextStroke: `2px ${P.ink}`, opacity: ein(f, 50 + 3 * SCHRITT) })}>≈</div>
      </>)}
      {/* 5 · Wahrnehmung an Kommunikation anschliessen */}
      {kachel(4, (() => {
        const st = interpolate(f, [25 + 4 * SCHRITT, 60 + 4 * SCHRITT], [0, 1], klemm);
        return (
          <>
            <div style={fett(22, { position: "absolute", left: 30, top: 60 })}>Wahrnehmung</div>
            <div style={fett(22, { position: "absolute", right: 24, top: 60 })}>Kommunikation</div>
            <svg width="446" height="228" viewBox="0 0 446 228" style={{ position: "absolute", inset: 0 }}>
              <path d={`M20 150 C 80 150, 90 ${150}, ${120 + st * 120} 150`} fill="none" stroke={P.ink} strokeWidth="10" />
              <rect x={110 + st * 120} y="125" width="60" height="50" fill={P.gelb} stroke={P.ink} strokeWidth="6" />
              <path d={`M${170 + st * 120} 138 h22 M${170 + st * 120} 162 h22`} stroke={P.ink} strokeWidth="7" />
              <rect x="310" y="110" width="110" height="80" rx="10" fill={P.tuerkis} stroke={P.ink} strokeWidth="6" />
              <path d="M330 138 h22 M330 162 h22" stroke={P.ink} strokeWidth="7" />
            </svg>
            {st >= 1 ? <div style={fett(34, { position: "absolute", left: 210, top: 180, color: P.rot, transform: `rotate(-6deg) scale(${pop(f, 60 + 4 * SCHRITT)})` })}>KLICK!</div> : null}
          </>
        );
      })())}
      {/* 6 · Pointe: Karen Barad */}
      {kachel(5, <>
        <svg width="446" height="228" viewBox="0 0 446 228" style={{ position: "absolute", inset: 0 }}>
          <path d="M60 205 H430 M60 205 V20" stroke={P.ink} strokeWidth="6" />
          {[[120, 150], [170, 110], [230, 160], [260, 90], [300, 130], [340, 70], [200, 60], [380, 120]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="9" fill={P.grau} />)}
          <circle cx="410" cy="34" r={18 + Math.max(0, Math.sin((f - barad) / 5)) * 8} fill={P.koral} stroke={P.ink} strokeWidth="6" opacity={ein(f, barad + 20)} />
        </svg>
        <div style={fett(30, { position: "absolute", left: 150, top: 22, padding: "4px 12px", background: P.gelb, border: `5px solid ${P.ink}`, opacity: ein(f, barad + 25) })}>Karen Barad! →</div>
      </>)}
      <Knall p={pop(f, barad + 45, 200)} x={860} y={1130} r={140} farbe={P.koral} innen={P.gelb} text="WOW!" groesse={56} textfarbe={P.weiss} drehung={8} />
      {TX.nnSchritte.map((t, i) => <Erzaehl key={i} f={f} a={20 + i * SCHRITT} b={i < 5 ? 20 + (i + 1) * SCHRITT : 1e9} x={70} y={1020} w={i === 5 ? 660 : 940} groesse={i === 5 ? 34 : 38}>{t}</Erzaehl>)}
    </Grundpunkte>
  );
};

// ---------- 7 · Suchrichtung 3: der Verteilapparat ----------
const Verteil: React.FC = () => {
  const f = useCurrentFrame();
  const sx = (i: number) => 150 + i * 106;
  // zwei Kugeln: Stimme (bleibt bei «glaubwürdig» hängen), Messung (kommt durch)
  const stimme = interpolate(f, [30, 170], [60, sx(4) - 30], klemm), messung = interpolate(f, [40, 200], [60, 1000], klemm);
  const vier = f > 240;
  return (
    <Grundpunkte farbe="rgba(255,91,74,.5)">
      <Schild f={f} farbe={P.koral}>Suchrichtung 3 · der Verteilapparat</Schild>
      {!vier || f < 260 ? (
        <div style={{ opacity: interpolate(f, [240, 258], [1, 0], klemm) }}>
          <Feld x={70} y={180} w={940} h={600}>
            {TX.schwellen.map((s, i) => (
              <React.Fragment key={s}>
                <div style={{ position: "absolute", left: sx(i) - 7, top: 150, width: 14, height: 360, background: P.ink, transform: `scaleY(${pop(f, 6 + i * 4, 240)})`, transformOrigin: "50% 100%" }} />
                <div style={fett(22, { position: "absolute", left: sx(i) - 6, top: 116, whiteSpace: "nowrap", transform: "rotate(-38deg)", transformOrigin: "0% 100%", opacity: ein(f, 10 + i * 4) })}>{s}</div>
              </React.Fragment>
            ))}
            {[["Stimme", 200, P.koral, stimme], ["Messung", 400, P.blau, messung]].map(([n, y, farbe, x]) => (
              <React.Fragment key={n as string}>
                <div style={{ position: "absolute", left: 20, right: 20, top: (y as number) + 30, height: 6, background: "#00000022" }} />
                <div style={fett(26, { position: "absolute", left: 20, top: (y as number) - 18, color: farbe as string })}>{n as string}</div>
                <div style={{ position: "absolute", left: x as number, top: (y as number) + 8, width: 50, height: 50, borderRadius: "50%", background: farbe as string, border: `6px solid ${P.ink}` }} />
              </React.Fragment>
            ))}
            {f > 170 ? <div style={fett(28, { position: "absolute", left: sx(4) - 80, top: 250, color: P.rot, transform: `rotate(-8deg) scale(${pop(f, 170)})` })}>STOPP</div> : null}
          </Feld>
        </div>
      ) : null}
      {vier ? (
        <div style={{ position: "absolute", left: 70, top: 180, width: 940, height: 600, opacity: ein(f, 245) }}>
          <div style={fett(30, { position: "absolute", left: 0, top: 0, width: 940, textAlign: "center" })}>gehört →</div>
          <div style={fett(30, { position: "absolute", left: -10, top: 300, transform: "rotate(-90deg)", transformOrigin: "0 0" })}>erfasst →</div>
          {[TX.felder[0], TX.felder[1], TX.felder[2], TX.felder[3]].map(([name, was], i) => {
            const zelle = [[0, 0], [1, 0], [0, 1], [1, 1]][i];
            return (
              <div key={name} style={{ position: "absolute", left: 60 + zelle[0] * 440, top: 50 + zelle[1] * 275, width: 420, height: 255, border: `7px solid ${P.ink}`, boxSizing: "border-box", padding: 20, ...benday("rgba(255,255,255,.3)", 3.5, 13), backgroundColor: [P.koral, P.tuerkis, "#cfcac3", P.gelb][i], transform: `scale(${pop(f, 250 + i * 14, 220)})` }}>
                <div style={fett(36, { lineHeight: 1.05 })}>{name}</div>
                <div style={fett(26, { fontWeight: 600, marginTop: 10 })}>{was}</div>
              </div>
            );
          })}
        </div>
      ) : null}
      <Erzaehl f={f} a={20} b={235} x={70} y={850} w={940} groesse={38}>{TX.va1}</Erzaehl>
      <Erzaehl f={f} a={260} x={70} y={850} w={940} groesse={38}>{TX.va2}</Erzaehl>
    </Grundpunkte>
  );
};

// ---------- 8 · Zwei Beispiele ----------
const Faelle: React.FC = () => {
  const f = useCurrentFrame();
  const klingel = f > 90 ? Math.sin(f * 1.4) * 6 : 0;
  return (
    <Grundpunkte farbe="rgba(255,210,31,.8)">
      <Schild f={f} farbe={P.gelb}>Zwei Beispiele</Schild>
      {/* Akte mit Stempel */}
      <Feld x={70} y={180} w={450} h={470}>
        <div style={{ position: "absolute", left: 60, top: 80, width: 300, height: 320, background: "#f3e2b8", border: `6px solid ${P.ink}`, transform: "rotate(-3deg)" }}>
          <div style={fett(28, { position: "absolute", left: 20, top: 16 })}>IV-Akte</div>
          {[0, 1, 2, 3].map((i) => <div key={i} style={{ position: "absolute", left: 20, right: 20, top: 80 + i * 40, height: 12, background: "#00000022" }} />)}
        </div>
        <div style={fett(30, { position: "absolute", left: 24, bottom: 18, color: P.dunkel })}>seit 2003</div>
      </Feld>
      <Stempel f={f} a={40} x={60} y={420} text="«SCHEININVALIDE»" farbe={P.rot} groesse={40} drehung={-12} />
      {/* Telefon nach Feierabend */}
      <Feld x={560} y={180} w={450} h={470} farbe={P.blau}>
        <div style={{ position: "absolute", right: 40, top: 30, width: 70, height: 70, borderRadius: "50%", background: P.gelb, boxShadow: `-18px 0 0 0 ${P.blau} inset`, border: `5px solid ${P.ink}` }} />
        <div style={{ position: "absolute", left: 150, top: 140, width: 150, height: 250, background: P.dunkel, border: `7px solid ${P.ink}`, borderRadius: 22, transform: `rotate(${klingel}deg)` }}>
          <div style={{ position: "absolute", inset: 14, background: f > 90 ? P.gelb : P.himmel, borderRadius: 8, ...fett(26, { display: "grid", placeItems: "center", textAlign: "center" }) }}>{f > 90 ? "22:47 Chef" : ""}</div>
        </div>
        {f > 90 ? <div style={fett(46, { position: "absolute", left: 40, top: 150, color: P.gelb, WebkitTextStroke: `3px ${P.ink}`, transform: `rotate(-12deg) scale(${pop(f, 90)})` })}>RING!</div> : null}
        <div style={fett(26, { position: "absolute", left: 24, bottom: 18, color: P.weiss })}>Recht auf Nichterreichbarkeit</div>
      </Feld>
      <Erzaehl f={f} a={30} b={240} x={70} y={720} w={940} groesse={38}>{TX.faelle}</Erzaehl>
      {/* wer steht ein? leere Liste mit Lupe */}
      {f > 240 ? (
        <div style={{ position: "absolute", left: 70, top: 720, width: 940, height: 260, opacity: ein(f, 245) }}>
          {[0, 1, 2, 3].map((i) => <div key={i} style={{ position: "absolute", left: 0, top: i * 62, width: 600, height: 44, border: `5px dashed ${P.ink}`, boxSizing: "border-box", background: i === 2 ? P.weiss : "transparent" }} />)}
          <div style={fett(90, { position: "absolute", left: 660 + Math.sin(f / 8) * 40, top: 40, color: P.rot, WebkitTextStroke: `3px ${P.ink}` })}>?</div>
        </div>
      ) : null}
      <Erzaehl f={f} a={260} x={70} y={1010} w={940} groesse={42}>{TX.wer}</Erzaehl>
    </Grundpunkte>
  );
};

// ---------- 9 · In Theorien: kaum Ereignisse ----------
const Theorien: React.FC = () => {
  const f = useCurrentFrame();
  const karten = ["Systemtheorie", "Poststrukturalismus", "Formtheorie", "Ästhetik"];
  const gefunden = f > 170 ? 1 : 0;
  return (
    <Grundpunkte farbe="rgba(127,211,255,.8)">
      <Schild f={f} farbe={P.himmel}>Und in Theorien?</Schild>
      {/* Drehkreuz des Apparats */}
      <div style={{ position: "absolute", left: 470, top: 200, width: 140, height: 520, background: P.koral, border: `7px solid ${P.ink}`, ...fett(30, { writingMode: "vertical-rl", display: "grid", placeItems: "center" }) }}>Verteilapparat</div>
      {karten.map((k, i) => {
        const x = interpolate(f, [10 + i * 35, 70 + i * 35], [-420, 1100], klemm);
        return <div key={k} style={{ position: "absolute", left: x, top: 250 + (i % 2) * 230, width: 360, height: 160, background: P.weiss, border: `6px solid ${P.ink}`, display: "grid", placeItems: "center", ...fett(36), transform: `rotate(${[-3, 2, -2, 3][i]}deg)` }}>{k}</div>;
      })}
      <div style={{ position: "absolute", left: 70, top: 760, padding: "14px 22px", background: P.weiss, border: `6px solid ${P.ink}`, opacity: ein(f, 20), ...fett(36) }}>Körperereignisse gefunden: <span style={{ color: P.rot }}>{gefunden}</span></div>
      <Geist x={760} y={760} massstab={0.85} schwebe={f} spiegeln />
      <Zettelflug f={f} a={190} x0={820} y0={820} ziel={[[620, 860, 8]]} nummern={["?"]} />
      <Erzaehl f={f} a={60} x={70} y={1080} w={940} groesse={38}>{TX.theorien}</Erzaehl>
    </Grundpunkte>
  );
};

// ---------- 10 · Ich bin im Feld ----------
const Feld10: React.FC = () => {
  const f = useCurrentFrame();
  const w = f / 40;
  return (
    <Grundpunkte farbe="rgba(18,181,169,.55)">
      <Schild f={f} farbe={P.tuerkis}>Ich im Feld</Schild>
      {/* Schlaufe: ich – LLM – soziale Medien – ich */}
      <svg width="1080" height="1440" style={{ position: "absolute", inset: 0 }}>
        <ellipse cx="540" cy="520" rx="400" ry="300" fill="none" stroke={P.ink} strokeWidth="8" strokeDasharray="30 18" strokeDashoffset={-f * 3} opacity={ein(f, 10)} />
        <circle cx={540 + Math.cos(w) * 400} cy={520 + Math.sin(w) * 300} r="20" fill={P.rot} stroke={P.ink} strokeWidth="5" />
      </svg>
      <div style={{ position: "absolute", left: 90, top: 200, width: 300, height: 210, background: P.dunkel, border: `7px solid ${P.ink}`, borderRadius: 10, transform: `scale(${pop(f, 20)})` }}>
        <div style={{ position: "absolute", inset: 14, background: P.weiss, padding: 12 }}>
          <div style={fett(24)}>LLM</div>
          {[0, 1, 2].map((i) => <div key={i} style={{ height: 12, marginTop: 12, width: `${90 - i * 20}%`, background: i % 2 ? P.himmel : "#00000022", borderRadius: 6 }} />)}
        </div>
      </div>
      <div style={{ position: "absolute", left: 760, top: 200, width: 170, height: 290, background: P.dunkel, border: `7px solid ${P.ink}`, borderRadius: 24, transform: `scale(${pop(f, 40)})` }}>
        <div style={{ position: "absolute", inset: 12, background: P.weiss, borderRadius: 10, display: "grid", placeItems: "center", ...fett(70, { color: P.rot }) }}>{f % 40 < 20 ? "♥" : "♥♥"}</div>
      </div>
      <Ich x={340} y={420} massstab={0.95} spricht={Math.floor(f / 12) % 2 === 0 && f < 200} />
      <Geist x={760} y={560} massstab={0.75} schwebe={f} opacity={ein(f, 120, 20)} spiegeln />
      <div style={{ position: "absolute", left: 300, top: 190, padding: "8px 16px", background: P.gelb, border: `5px solid ${P.ink}`, transform: `rotate(-4deg) scale(${pop(f, 200)})`, ...fett(30) }}>RE-ENTRY!</div>
      <Erzaehl f={f} a={20} b={205} x={70} y={960} w={940} groesse={36}>{TX.feld1}</Erzaehl>
      <Erzaehl f={f} a={215} x={70} y={960} w={940} groesse={44}>{TX.feld2}</Erzaehl>
    </Grundpunkte>
  );
};

// ---------- 11 · The story so far … ----------
const Bisher: React.FC = () => {
  const f = useCurrentFrame();
  const farben = [P.himmel, P.tuerkis, P.koral, "#cfcac3", P.blau, P.koral, P.tuerkis];
  return (
    <AbsoluteFill>
      <Strahlen f={f} cx={540} cy={720} a={P.gelb} b={P.weiss} n={28} />
      <AbsoluteFill style={benday("rgba(224,20,30,.2)", 4.5, 20)} />
      <div style={{ position: "absolute", left: 70, top: 70, padding: "16px 30px 12px", background: P.gelb, border: `7px solid ${P.ink}`, transform: `rotate(-2deg) scale(${pop(f, 5, 180)})`, ...fett(64, { textTransform: "uppercase", letterSpacing: "0.02em" }) }}>{TX.bisher}</div>
      {TX.rueckblick.map((t, i) => {
        const sp = i % 3, ze = Math.floor(i / 3);
        return (
          <div key={t} style={{ position: "absolute", left: 70 + sp * 320, top: 230 + ze * 230, width: 290, height: 200, background: farben[i], border: `6px solid ${P.ink}`, boxSizing: "border-box", padding: 16, display: "grid", alignContent: "end", ...benday("rgba(255,255,255,.3)", 3.5, 13), backgroundColor: farben[i], transform: `scale(${pop(f, 30 + i * 12, 220)}) rotate(${[-2, 1, -1, 2, -2, 1, -1][i]}deg)`, ...fett(30, { lineHeight: 1.1, color: i === 4 ? P.weiss : P.ink }) }}>
            <span style={fett(24, { opacity: 0.7 })}>{i + 1}</span>{t}
          </div>
        );
      })}
      <Geist x={720} y={850} massstab={0.95} schwebe={f} spiegeln />
      <Zettelflug f={f} a={170} x0={800} y0={930} ziel={[[560, 960, -6]]} nummern={["1/1"]} />
      <Ich x={70} y={930} massstab={1.03} spricht={f > 230} />
      <Blase x={300} y={760} w={440} farbe={P.weiss} p={pop(f, 230, 180)} drehung={-2}><span style={{ fontSize: 46 }}>{TX.mensch}</span></Blase>
      <div style={{ position: "absolute", right: 70, bottom: 70, padding: "14px 26px 10px", background: P.weiss, border: `7px solid ${P.ink}`, transform: `rotate(2deg) scale(${pop(f, 300, 200)})`, ...fett(44, { textTransform: "uppercase", letterSpacing: "0.04em" }) }}>{TX.folgt}</div>
      <Rahmen />
    </AbsoluteFill>
  );
};

const SZENEN: [keyof typeof D, React.FC][] = [
  ["frage", Frage], ["gefunden", Gefunden], ["organisation", Organisation], ["wende", Wende], ["still", Still], ["nn", NN],
  ["verteil", Verteil], ["faelle", Faelle], ["theorien", Theorien], ["feld", Feld10], ["bisher", Bisher],
];
const ECKEN: [number, number][] = [[900, 1250], [150, 200], [930, 180], [120, 1260]];

export const MenschVideo: React.FC = () => (
  <Grund>
    <Sequence durationInFrames={INTRO_LANG}><PopIntro kopf={{ titel: "Mensch, Niklas!", unter: ["Körper", "Theorie", "Maschinen"] }} /></Sequence>
    {SZENEN.map(([k, Szene], i) => (
      <Sequence key={k} from={T[k]} durationInFrames={D[k]}><Iris dauer={UEBER} mitte={ECKEN[i % ECKEN.length]}><Szene /></Iris></Sequence>
    ))}
    <Sequence from={T.signet} durationInFrames={OUTRO_LANG}><Iris dauer={UEBER} mitte={[540, 720]}><PopOutro /></Iris></Sequence>
  </Grund>
);
