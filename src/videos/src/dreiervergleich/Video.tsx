// Video «Drei im Doppelspalt der Wahrnehmung» (Titel von Christian, 6. Oktober 2026): zeigt witzig und auf den Punkt, wie die Vergleichende Analyse
// «Nebeneinander, Nacheinander | Luhmann, Baecker, Lehmann» (Erweiterte Arbeitsfassung, 5. Oktober 2026) die drei Zugänge prüft – und wo sie sich unterscheiden.
// 3:4 (1080 × 1440), 30 fps, ohne Ton, etwa 2 Minuten. Pop-Art mit viel Roy Lichtenstein (Wunsch), farblich anders als «Liebling …» (Pop.tsx).
// Intro und Outro: Signet der Vorlage im Pop-Stil (PopIntro, PopOutro). Die Autoren erscheinen nur als Namen in ihrer Farbe, ihre Begriffe als Gegenstände (keine Karikaturen).
// Überarbeitung vom 6. Oktober 2026 (Wunsch von Christian): ohne Klanginstallation und Streugrafik; nach den drei Grundoperationen je eine Szene, wie der Autor
// verräumlicht (X) und verzeitlicht (Y), dann das Duell re-entry / re-exit; Kreisblenden statt harter Wechsel. Die Inhalte dürfen über die Studie hinausgehen:
// Sätze mit «…» sind wörtlich aus der Studie (Z in zitate.ts), Sätze ohne Anführungszeichen eigene Lesart (L in zitate.ts). Lautwörter und Beschriftungen sind Comic.
import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Grund, INTRO, OUTRO } from "../vorlage/Bausteine";
import { SERIF } from "../vorlage/stil";
import { benday, ein, klemm, pop } from "../doppelpruefung/Comic";
import { AUTOR, Abschnitt, Blase, Feld, Grundpunkte, Iris, Kasten, Knall, P, PopIntro, PopOutro, Rahmen, Schild, Stempel, Strahlen, Wolke, fett } from "./Pop";
import { L, Z } from "./zitate";

// Zeitplan in Bildern (30 fps). Die Szenen überlappen um UEBER Bilder: die nächste öffnet sich mit einer Kreisblende über der vorigen.
const D = { titel: 210, raster: 300, luhmann: 420, baecker: 420, lehmann: 450, xyLuhmann: 330, xyBaecker: 330, xyLehmann: 330, duell: 270, differenzen: 420, pointe: 300, schluss: 270 };
const UEBER = 18;
/** das Signet am Schluss bleibt nach seiner Animation noch 2 s stehen (Wunsch vom 6. Oktober 2026) */
const OUTRO_LANG = OUTRO + 60;
/** das Signet am Anfang bleibt ebenfalls länger stehen (Wunsch vom 6. Oktober 2026) */
const INTRO_LANG = INTRO + 45;
export const T = (() => {
  const t: Record<string, number> = { intro: 0 };
  let a = INTRO_LANG - UEBER;
  for (const [k, d] of Object.entries(D)) { t[k] = a; a += d - UEBER; }
  t.signet = a; t.ende = a + OUTRO_LANG;
  return t as Record<keyof typeof D | "intro" | "signet" | "ende", number>;
})();

const NAMEN = [AUTOR.luhmann, AUTOR.baecker, AUTOR.lehmann];

// ---------- 0 · Titel ----------
const Titel: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Strahlen f={f} cx={540} cy={820} a={P.gelb} b={P.weiss} />
      <AbsoluteFill style={benday("rgba(224,20,30,.22)", 4.5, 20)} />
      <Blase x={70} y={80} w={940} farbe={P.weiss} p={pop(f, 8, 150)} drehung={-2}>
        <span style={{ fontSize: 82, lineHeight: 1.0, textTransform: "uppercase", letterSpacing: "-0.02em", display: "block" }}>Drei im<br />Doppelspalt<br />der Wahrnehmung</span>
      </Blase>
      {NAMEN.map((n, i) => {
        const p = pop(f, 40 + i * 14, 170);
        return (
          <div key={n.name} style={{
            position: "absolute", left: 90 + i * 40, top: 560 + i * 200, width: 760, padding: "22px 30px", border: `7px solid ${P.ink}`, borderRadius: 10, 
            ...benday("rgba(255,255,255,.3)", 4, 16), backgroundColor: n.farbe, transform: `translateX(${(1 - p) * (i % 2 ? 1200 : -1200)}px) rotate(${[-2, 1.5, -1][i]}deg)`,
          }}>
            <div style={fett(64, { lineHeight: 1 })}>{n.name}</div>
            <div style={fett(34, { fontWeight: 600, marginTop: 8 })}>{Z.untertitel[i]}</div>
          </div>
        );
      })}
      <Knall p={pop(f, 100, 200)} x={830} y={1250} r={190} farbe={P.rot} textfarbe={P.gelb} text="ZACK!" groesse={88} drehung={8} />
      <Rahmen />
    </AbsoluteFill>
  );
};

// ---------- 1 · Das Raster: X und Y ----------
const Raster: React.FC = () => {
  const f = useCurrentFrame();
  // X: ein Punkt springt weg und kehrt zur selben Stelle zurück (die Stelle leuchtet auf)
  const sprung = (f - 30) % 70, weg = f > 30 ? Math.sin(Math.min(1, sprung / 50) * Math.PI) : 0;
  const zurueck = f > 30 && sprung > 48;
  return (
    <Grundpunkte farbe="rgba(23,71,201,0.47)">
      <AbsoluteFill>
        <Schild f={f} farbe={P.weiss}>Das Prüfraster</Schild>
        {/* X */}
        <Feld x={70} y={210} w={450} h={560} farbe={P.weiss}>
          <div style={fett(40, { position: "absolute", left: 24, top: 18, color: P.blau })}>X · Verräumlichung</div>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: 40 + (i % 3) * 130, top: 110 + Math.floor(i / 3) * 130, width: 110, height: 110, border: `6px solid ${P.ink}`, background: i === 4 && zurueck ? P.gelb : P.weiss, ...(i === 4 && zurueck ? {} : benday("rgba(23,71,201,.18)", 3, 12)) }} />
          ))}
          <div style={{ position: "absolute", left: 40 + 130 + 30, top: 110 + 130 + 30 - weg * 160, width: 50, height: 50, borderRadius: "50%", background: P.rot, border: `6px solid ${P.ink}` }} />
          {/* Begriff und Erklärung untereinander, unten im Feld verankert (der Begriff darf umbrechen, ohne die Erklärung zu überdecken) */}
          <div style={{ position: "absolute", left: 24, right: 24, bottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={fett(31, { lineHeight: 1.1, opacity: ein(f, 40) })}>{Z.x}:</div>
            <div style={fett(26, { fontWeight: 600, lineHeight: 1.2, opacity: ein(f, 50) })}>{Z.xText}</div>
          </div>
        </Feld>
        {/* Y */}
        <Feld x={560} y={210} w={450} h={560} farbe={P.weiss}>
          <div style={fett(40, { position: "absolute", left: 24, top: 18, color: P.rot })}>Y · Verzeitlichung</div>
          {Array.from({ length: 6 }, (_, i) => {
            const k = interpolate(f, [70 + i * 9, 81 + i * 9], [0, 60], klemm);
            return <div key={i} style={{ position: "absolute", left: 40 + i * 62, top: 140, width: 34, height: 200, background: [P.koral, P.gelb, P.tuerkis, P.blau, P.rot, P.himmel][i], border: `6px solid ${P.ink}`, borderRadius: 6, transformOrigin: "100% 100%", transform: `rotate(${k}deg)` }} />;
          })}
          {/* Begriff und Erklärung untereinander, unten im Feld verankert (der Begriff darf umbrechen, ohne die Erklärung zu überdecken) */}
          <div style={{ position: "absolute", left: 24, right: 24, bottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={fett(31, { lineHeight: 1.1, opacity: ein(f, 90) })}>{Z.y}:</div>
            <div style={fett(26, { fontWeight: 600, lineHeight: 1.2, opacity: ein(f, 100) })}>{Z.yText}</div>
          </div>
        </Feld>
        <Kasten f={f} a={150} top={840} groesse={48} klein={Z.anders}>«{Z.zeit}»</Kasten>
      </AbsoluteFill>
    </Grundpunkte>
  );
};

// ---------- 2 · Luhmann ----------
const Luhmann: React.FC = () => {
  const f = useCurrentFrame();
  const fuge = interpolate(f, [40, 70], [0, 1], { ...klemm, easing: (t) => 1 - Math.pow(1 - t, 3) });
  return (
    <Grundpunkte farbe="rgba(18,181,169,0.62)">
      <AbsoluteFill>
        <Schild f={f} farbe={AUTOR.luhmann.farbe}>{AUTOR.luhmann.name}</Schild>
        {/* a · Information, Mitteilung, Verstehen rasten ein; die Liebes-Comic-Wolke */}
        <Abschnitt f={f} a={0} b={190}>
          {Z.einheit.map((w, i) => {
            const p = pop(f, 6 + i * 10, 180);
            const x0 = [70, 400, 730][i], x1 = 120 + i * 285;
            return (
              <div key={w} style={{
                position: "absolute", left: x0 + (x1 - x0) * fuge, top: 240 + (1 - p) * -500, width: 280 + (1 - fuge) * -20, height: 120, boxSizing: "border-box",
                border: `7px solid ${P.ink}`, background: [P.tuerkis, P.weiss, P.himmel][i], ...fett(40, { display: "grid", placeItems: "center" }), 
                transform: `rotate(${(1 - fuge) * [-8, 6, -5][i]}deg)`,
              }}>{w}</div>
            );
          })}
          <div style={fett(34, { position: "absolute", left: 120, top: 390, color: P.dunkel, opacity: ein(f, 70) })}>= Kommunikation</div>
          <Wolke p={pop(f, 85, 150)} x={170} y={470} w={760} h={330}>
            <span style={fett(56, { lineHeight: 1.1 })}>«{Z.verstehen}»</span>
          </Wolke>
          {/* ein Herz, das einen Sprung bekommt */}
          {(() => {
            const riss = f > 130;
            return (
              <svg width="170" height="160" viewBox="0 0 170 160" style={{ position: "absolute", left: 830, top: 760, transform: `scale(${pop(f, 115)}) rotate(10deg)` }}>
                <path d="M85 150 C 20 100, 0 60, 20 30 C 40 0, 75 10, 85 40 C 95 10, 130 0, 150 30 C 170 60, 150 100, 85 150 Z" fill={P.rot} stroke={P.ink} strokeWidth="8" strokeLinejoin="round" />
                {riss ? <path d="M85 42 L70 70 L95 90 L75 120 L85 150" fill="none" stroke={P.ink} strokeWidth="8" strokeLinejoin="round" /> : null}
              </svg>
            );
          })()}
        </Abschnitt>
        {/* b · Ereignisse vergehen, Anschlüsse bleiben */}
        <Abschnitt f={f} a={190} b={300}>
          <Feld x={70} y={220} w={940} h={600}>
            {Array.from({ length: 5 }, (_, i) => {
              const a = 200 + i * 16, p = pop(f, a, 260), platzt = f > a + 12;
              const cx = 120 + i * 180, cy = 250 + (i % 2) * 80;
              return (
                <React.Fragment key={i}>
                  {i > 0 && f > a ? <div style={{ position: "absolute", left: cx - 180 + 20, top: (250 + ((i - 1) % 2) * 80) + 20, width: Math.hypot(180, 80), height: 8, background: P.ink, transformOrigin: "0 50%", transform: `rotate(${(i % 2 ? 1 : -1) * Math.atan2(80, 180)}rad)` }} /> : null}
                  {platzt ? <div style={{ position: "absolute", left: cx, top: cy, width: 40, height: 40, borderRadius: "50%", background: P.tuerkis, border: `6px solid ${P.ink}`, boxSizing: "border-box" }} /> : null}
                  {!platzt ? <div style={{ position: "absolute", left: cx - 50, top: cy - 50, width: 140, height: 140, borderRadius: "50%", background: P.himmel, border: `7px solid ${P.ink}`, transform: `scale(${p})`, ...benday("rgba(255,255,255,.45)", 4, 14), backgroundColor: P.himmel }} /> : null}
                  {f > a + 12 && f < a + 30 ? <div style={fett(40, { position: "absolute", left: cx - 30, top: cy - 90, color: P.rot, WebkitTextStroke: `2px ${P.ink}`, transform: "rotate(-10deg)" })}>PLOPP!</div> : null}
                </React.Fragment>
              );
            })}
            <div style={fett(30, { position: "absolute", left: 40, bottom: 30, color: P.dunkel, opacity: ein(f, 280) })}>Ereignis · Ereignis · Ereignis … und Anschlüsse</div>
          </Feld>
          <Kasten f={f} a={205} top={900} groesse={50}>{Z.ereignisse}</Kasten>
        </Abschnitt>
        {/* c · Entscheidung, zweimal gestempelt */}
        <Abschnitt f={f} a={300} b={420}>
          <Feld x={70} y={220} w={940} h={600}>
            {[0, 1].map((k) => (
              <div key={k} style={{ position: "absolute", left: 60 + k * 450, top: 90, width: 400, height: 280, background: P.weiss, border: `6px solid ${P.ink}`, transform: `rotate(${k ? 3 : -3}deg)` }}>
                {[0, 1, 2].map((z) => <div key={z} style={{ position: "absolute", left: 24, right: 24, top: 30 + z * 34, height: 12, background: "#00000022", borderRadius: 6 }} />)}
              </div>
            ))}
          </Feld>
          <Stempel f={f} a={315} x={110} y={420} text="ENTSCHEIDUNG" farbe={P.blau} groesse={46} drehung={-8} />
          <Stempel f={f} a={345} x={560} y={430} text="ENTSCHEIDUNG" farbe={P.rot} groesse={46} drehung={6} />
          <Knall p={pop(f, 352, 220)} x={860} y={650} r={130} farbe={P.gelb} text="NEU!" groesse={64} />
          <Kasten f={f} a={330} top={900} groesse={48} klein={<>Prüfpflicht: {Z.luhmannPflicht}</>}>{Z.entscheidung}</Kasten>
        </Abschnitt>
      </AbsoluteFill>
    </Grundpunkte>
  );
};

// ---------- 3 · Baecker ----------
const Baecker: React.FC = () => {
  const f = useCurrentFrame();
  // Formzeichen (Haken wie in Spencer-Browns Notation), ineinander geschachtelt, zeichnen sich nacheinander
  const haken = [[150, 520, 760], [250, 440, 560], [350, 360, 360]];
  return (
    <Grundpunkte farbe="rgba(255,210,31,0.85)">
      <AbsoluteFill>
        <Schild f={f} farbe={AUTOR.baecker.farbe}>{AUTOR.baecker.name}</Schild>
        <Feld x={70} y={220} w={940} h={600}>
          <svg width="926" height="586" viewBox="0 0 940 600" style={{ position: "absolute", inset: 0, opacity: interpolate(f, [120, 135, 285, 300], [1, 0.22, 0.22, 1], klemm) }}>
            {haken.map(([x, y, w], i) => {
              const z = interpolate(f, [15 + i * 22, 40 + i * 22], [0, 1], klemm);
              const glanz = f > 300;
              return <path key={i} d={`M${x} ${y - 6} H${x + w} V${y - 6 - 250 + i * 60}`} fill="none" stroke={glanz ? [P.blau, P.rot, P.tuerkis][i] : P.ink} strokeWidth="14" strokeLinecap="square" strokeDasharray="2000" strokeDashoffset={2000 * (1 - z)} />;
            })}
            {["a", "b", "c"].map((b, i) => <text key={b} x={[180, 290, 400][i]} y={[480, 400, 320][i]} fontFamily="Newsreader" fontStyle="italic" fontSize="54" opacity={ein(f, 60 + i * 10)}>{b}</text>)}
          </svg>
          {/* Y explizit (Wunsch vom 6. Oktober 2026): eine Skala Verzeitlichung 1–5; «NÄCHSTE →» treibt den Wert hoch, nach dem Stempel «Y?» fällt er zurück */}
          {f > 118 && f < 300 ? (() => {
            const Y = (v: number) => 520 - (v - 1) * 105;
            const wert = interpolate(f, [130, 160, 190, 215], [1, 5, 5, 1.6], klemm);
            return (
              <div style={{ position: "absolute", inset: 0, opacity: interpolate(f, [118, 130, 285, 300], [0, 1, 1, 0], klemm) }}>
                <svg width="926" height="586" viewBox="0 0 940 600" style={{ position: "absolute", inset: 0 }}>
                  <path d={`M150 ${Y(1) + 20} V${Y(5) - 30}`} stroke={P.ink} strokeWidth="8" />
                  <path d={`M150 ${Y(5) - 50} l-16 26 h32z`} fill={P.ink} />
                  {[1, 2, 3, 4, 5].map((v) => <React.Fragment key={v}><path d={`M138 ${Y(v)} H162`} stroke={P.ink} strokeWidth="6" /><text x="112" y={Y(v) + 11} textAnchor="end" fontFamily="Instrument Sans" fontWeight={700} fontSize="30">{v}</text></React.Fragment>)}
                  <text x="60" y={Y(3)} fontFamily="Instrument Sans" fontWeight={700} fontSize="30" fill={P.rot} textAnchor="middle" transform={`rotate(-90 60 ${Y(3)})`}>Y · Verzeitlichung</text>
                  <circle cx="150" cy={Y(wert)} r="24" fill={f > 190 ? P.grau : P.rot} stroke={P.ink} strokeWidth="6" />
                </svg>
              </div>
            );
          })() : null}
          {/* Leuchtreklame «nächste Gesellschaft →» */}
          <div style={{ position: "absolute", left: 470, top: 40, opacity: f > 120 && f < 300 ? 1 : 0, transform: `scale(${pop(f, 120, 200)}) rotate(4deg)`, padding: "14px 24px", background: P.blau, border: `6px solid ${P.ink}`, borderRadius: 12, boxShadow: `0 0 0 ${8 + Math.sin(f / 3) * 4}px ${P.himmel}88`, ...fett(40, { color: P.gelb }) }}>NÄCHSTE →</div>
          {f > 300 ? Array.from({ length: 7 }, (_, i) => <div key={i} style={fett(64, { position: "absolute", left: [80, 820, 300, 640, 140, 760, 470][i], top: [70, 120, 60, 430, 300, 520, 180][i], color: P.gelb, WebkitTextStroke: `3px ${P.ink}`, transform: `scale(${pop(f, 300 + i * 6, 260) * (0.8 + 0.2 * Math.sin(f / 4 + i))})` })}>✦</div>) : null}
        </Feld>
        {f < 300 ? <Stempel f={f} a={185} x={300} y={300} text="Y?" farbe={P.rot} groesse={90} drehung={12} /> : null}
        <Knall p={pop(f, 305, 200)} x={820} y={860} r={170} farbe={P.koral} textfarbe={P.weiss} text="SCHICK!" groesse={64} drehung={-8} />
        <Kasten f={f} a={20} b={125} top={900} groesse={52}>{Z.form}</Kasten>
        <Kasten f={f} a={135} b={295} top={900} groesse={52}>{Z.naechste}</Kasten>
        <Kasten f={f} a={320} top={960} groesse={40} klein={<>Prüfpflicht: {Z.baeckerPflicht}</>}>{Z.eleganz}</Kasten>
      </AbsoluteFill>
    </Grundpunkte>
  );
};

// ---------- 4 · Lehmann ----------
const Lehmann: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Grundpunkte farbe="rgba(255,91,74,0.57)">
      <AbsoluteFill>
        <Schild f={f} farbe={AUTOR.lehmann.farbe}>{AUTOR.lehmann.name}</Schild>
        {/* a · Werk, Medium, Reflexion */}
        <Abschnitt f={f} a={0} b={130}>
          {Z.drei.map((w, i) => {
            const p = pop(f, 8 + i * 12, 170);
            return (
              <div key={w} style={{
                position: "absolute", left: 100 + i * 300, top: 300 + (i % 2) * 120, width: 260, height: 260, borderRadius: "50%", border: `8px solid ${P.ink}`, 
                ...benday("rgba(255,255,255,.35)", 4, 16), backgroundColor: [P.koral, P.gelb, P.himmel][i], transform: `scale(${p})`, ...fett(44, { display: "grid", placeItems: "center" }),
              }}>{w}</div>
            );
          })}
          <Kasten f={f} a={30} top={900} groesse={48}>{Z.avantgarde}</Kasten>
        </Abschnitt>
        {/* b · re-exit: die Kriterien des Gelingens werden ausser Kraft gesetzt – und es gelingt */}
        <Abschnitt f={f} a={130} b={290}>
          <Feld x={70} y={220} w={560} h={560}>
            <div style={fett(36, { position: "absolute", left: 30, top: 24 })}>Kriterien des Gelingens</div>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} style={{ position: "absolute", left: 40, top: 110 + i * 105, display: "flex", gap: 20, alignItems: "center" }}>
                <div style={{ width: 60, height: 60, border: `6px solid ${P.ink}`, background: P.weiss, ...fett(48, { display: "grid", placeItems: "center", color: P.tuerkis }) }}>{f > 145 + i * 6 ? "✓" : ""}</div>
                <div style={{ width: 360, height: 16, background: "#00000025", borderRadius: 8 }} />
              </div>
            ))}
            {f > 190 ? <svg width="560" height="560" style={{ position: "absolute", inset: 0 }}><path d={`M30 90 L${30 + 480 * Math.min(1, (f - 190) / 10)} ${90 + 440 * Math.min(1, (f - 190) / 10)}`} stroke={P.rot} strokeWidth="22" strokeLinecap="round" /></svg> : null}
          </Feld>
          <Knall p={pop(f, 185, 200)} x={810} y={420} r={210} farbe={P.koral} textfarbe={P.gelb} text="RE-EXIT!" groesse={70} drehung={-10} />
          <div style={{ position: "absolute", left: 700, top: 640, transform: `scale(${pop(f, 215, 200)}) rotate(8deg)` }}>
            <svg width="220" height="210" viewBox="-10 -10 120 115"><path d="M50 0 L62 36 L100 38 L70 60 L80 98 L50 76 L20 98 L30 60 L0 38 L38 36 Z" fill={P.gelb} stroke={P.ink} strokeWidth="6" strokeLinejoin="round" /></svg>
            <div style={fett(36, { textAlign: "center", marginTop: -10 })}>gelungen</div>
          </div>
          <Kasten f={f} a={150} top={900} groesse={48} klein={L.reexitNur}>{Z.reexit}</Kasten>
        </Abschnitt>
        {/* c · BRUCH!, BRUCH!, BRUCH! – jedes Mal blasser */}
        <Abschnitt f={f} a={290} b={450}>
          {Array.from({ length: 4 }, (_, i) => {
            const a = 296 + i * 22, matt = i / 3;
            return <Knall key={i} p={pop(f, a, 220) * (1 - matt * 0.35)} x={[300, 760, 330, 760][i]} y={[340, 380, 700, 720][i]} r={190} farbe={i === 3 ? "#d8d4ce" : [P.gelb, "#f7e27a", "#ece3b4"][i]} textfarbe={i === 3 ? P.grau : [P.rot, "#e3666a", "#c9a19c"][i]} text={i === 3 ? "bruch." : "BRUCH!"} groesse={[84, 74, 64, 52][i]} drehung={[-8, 6, -4, 0][i]} />;
          })}
          {f > 390 ? <div style={fett(40, { position: "absolute", left: 640, top: 860, color: P.grau, transform: "rotate(-3deg)" })}>gähn …</div> : null}
          <Kasten f={f} a={320} top={950} groesse={48} klein={<>Prüfpflicht: {Z.lehmannPflicht}</>}>{Z.bruch}</Kasten>
        </Abschnitt>
      </AbsoluteFill>
    </Grundpunkte>
  );
};

// ---------- 4b · Wie sie verräumlichen (X) und verzeitlichen (Y) ----------
// Oben das X-Bild mit Erzählkasten, darunter ab Bild 150 das Y-Bild mit Erzählkasten.
const XY: React.FC<{ autor: { name: string; farbe: string }; punkte: string; x: (f: number) => React.ReactNode; y: (f: number) => React.ReactNode; xText: string; yText: string }> = ({ autor, punkte, x, y, xText, yText }) => {
  const f = useCurrentFrame();
  const kopf = (text: string, farbe: string) => <div style={{ position: "absolute", left: 0, top: 0, padding: "10px 20px 8px", background: farbe, borderRight: `6px solid ${P.ink}`, borderBottom: `6px solid ${P.ink}`, ...fett(28, { letterSpacing: "0.06em", textTransform: "uppercase", color: P.weiss }) }}>{text}</div>;
  return (
    <Grundpunkte farbe={punkte}>
      <Schild f={f} farbe={autor.farbe}>{autor.name} · Raum und Zeit</Schild>
      <div style={{ opacity: ein(f, 6, 12) }}>
        <Feld x={70} y={170} w={940} h={370}>{x(f)}{kopf("X · Verräumlichung", P.blau)}</Feld>
      </div>
      <Kasten f={f} a={30} top={560} groesse={38}>{xText}</Kasten>
      <div style={{ opacity: ein(f, 150, 12), transform: `translateY(${interpolate(f, [150, 166], [30, 0], klemm)}px)` }}>
        <Feld x={70} y={790} w={940} h={360}>{y(f - 150)}{kopf("Y · Verzeitlichung", P.rot)}</Feld>
      </div>
      <Kasten f={f} a={175} top={1170} groesse={38}>{yText}</Kasten>
    </Grundpunkte>
  );
};

/** Luhmann. X: Objekte verlassen ihre Stellen, die Stellen bleiben. Y: Stellen verlassen ihre Objekte, weiter geht es nur im Anschluss. */
const XYLuhmann: React.FC = () => (
  <XY autor={AUTOR.luhmann} punkte="rgba(18,181,169,.6)" xText={L.luhmannX} yText={L.luhmannY}
    x={(f) => {
      // fünf Stellen; zwei Objekte tauschen die Plätze, die Stellen bleiben stehen
      const t = interpolate(f, [40, 80], [0, 1], { ...klemm, easing: (v) => v * v * (3 - 2 * v) });
      const objekte = [[0, 3], [1, 1], [3, 0], [4, 4]];
      return (
        <>
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: 70 + i * 170, top: 150, width: 130, height: 130, border: `6px dashed ${P.ink}`, boxSizing: "border-box" }}>
              <div style={fett(24, { position: "absolute", left: 0, right: 0, bottom: -40, textAlign: "center", color: P.dunkel })}>Stelle {i + 1}</div>
            </div>
          ))}
          {objekte.map(([von, nach], i) => {
            const pos = von + (nach - von) * t, hop = Math.sin(t * Math.PI) * (von === nach ? 0 : 110);
            return <div key={i} style={{ position: "absolute", left: 92 + pos * 170, top: 172 - hop, width: 86, height: 86, borderRadius: "50%", border: `6px solid ${P.ink}`, ...benday("rgba(255,255,255,.4)", 3.5, 13), backgroundColor: [P.koral, P.gelb, P.tuerkis, P.himmel][i] }} />;
          })}
        </>
      );
    }}
    y={(f) => {
      // ein Band von Stellen läuft nach links; links fallen die Objekte heraus, rechts kommt eine neue Stelle und ein Objekt schliesst an
      const lauf = Math.max(0, f) * 3.2;
      return (
        <>
          {Array.from({ length: 8 }, (_, i) => {
            const sx = 60 + i * 170 - lauf;
            if (sx < -200 || sx > 1000) return null;
            const faellt = sx < 60 ? (60 - sx) * 1.6 : 0;
            const da = sx < 700 || f > (sx - 700) / 3.2;
            return (
              <React.Fragment key={i}>
                <div style={{ position: "absolute", left: sx, top: 150, width: 130, height: 130, border: `6px dashed ${P.ink}`, boxSizing: "border-box", opacity: sx < 0 ? 0.4 : 1 }} />
                {da ? <div style={{ position: "absolute", left: sx + 22, top: 172 + faellt, width: 86, height: 86, borderRadius: "50%", border: `6px solid ${P.ink}`, backgroundColor: [P.koral, P.gelb, P.tuerkis, P.himmel][i % 4], transform: `rotate(${faellt}deg)` }} /> : null}
              </React.Fragment>
            );
          })}
          <div style={fett(30, { position: "absolute", right: 30, top: 70, color: P.dunkel })}>Gegenwart →</div>
        </>
      );
    }}
  />
);

/** Baecker. X: die Form zeigt auf einer Fläche, was der Text nacheinander erzählt. Y: re-entry – die Unterscheidung tritt in sich selbst ein und oszilliert. */
const XYBaecker: React.FC = () => (
  <XY autor={AUTOR.baecker} punkte="rgba(255,210,31,.85)" xText={L.baeckerX} yText={L.baeckerY}
    x={(f) => {
      // links ein Text, Zeile für Zeile; rechts dieselben Unterscheidungen auf einen Schlag als Form
      const zeilen = 6, schnapp = pop(f, 70, 220);
      return (
        <>
          {Array.from({ length: zeilen }, (_, i) => <div key={i} style={{ position: "absolute", left: 50, top: 90 + i * 44, height: 16, width: interpolate(f, [10 + i * 8, 18 + i * 8], [0, 300 - (i % 3) * 50], klemm), background: "#00000030", borderRadius: 8 }} />)}
          <div style={fett(26, { position: "absolute", left: 50, top: 312, color: P.dunkel })}>nacheinander</div>
          <svg width="460" height="320" viewBox="0 0 460 320" style={{ position: "absolute", left: 440, top: 10, transform: `scale(${schnapp})`, transformOrigin: "50% 60%" }}>
            {[[30, 290, 400, 250], [90, 230, 280, 170], [150, 170, 160, 100]].map(([x, y, w, h], i) => <path key={i} d={`M${x} ${y} H${x + w} V${y - h}`} fill="none" stroke={[P.blau, P.rot, P.ink][i]} strokeWidth="12" />)}
          </svg>
          <div style={fett(26, { position: "absolute", left: 600, top: 312, color: P.dunkel, opacity: ein(f, 80) })}>auf einen Blick</div>
        </>
      );
    }}
    y={(f) => {
      // eine Unterscheidung, deren Linie in ihre eigene Innenseite zurückläuft; ein Licht springt zwischen innen und aussen
      const z = interpolate(f, [5, 45], [0, 1], klemm), an = Math.floor(Math.max(0, f - 50) / 10) % 2 === 0;
      return (
        <>
          <svg width="940" height="360" viewBox="0 0 940 360" style={{ position: "absolute", inset: 0 }}>
            <path d="M120 270 H560 V90" fill="none" stroke={P.ink} strokeWidth="12" />
            <path d="M560 90 C 700 90, 720 300, 560 300 C 420 300, 380 210, 300 210" fill="none" stroke={P.rot} strokeWidth="10" strokeDasharray="900" strokeDashoffset={900 * (1 - z)} />
            <path d="M300 210 l26 -16 v32z" fill={P.rot} opacity={z > 0.95 ? 1 : 0} />
          </svg>
          <div style={fett(30, { position: "absolute", left: 160, top: 120, padding: "6px 16px", border: `5px solid ${P.ink}`, background: f > 50 && an ? P.gelb : P.weiss })}>innen</div>
          <div style={fett(30, { position: "absolute", left: 700, top: 60, padding: "6px 16px", border: `5px solid ${P.ink}`, background: f > 50 && !an ? P.gelb : P.weiss })}>aussen</div>
          {f > 60 ? <div style={fett(30, { position: "absolute", left: 720, top: 250, color: P.rot, transform: `rotate(-6deg) scale(${pop(f, 60)})` })}>Gedächtnis!</div> : null}
        </>
      );
    }}
  />
);

/** Lehmann. X: Vergleichsmodell – frühere und spätere Konstellationen nebeneinander. Y: Erfahrung lernt – das zweite Sehen ist ein anderes. */
const XYLehmann: React.FC = () => (
  <XY autor={AUTOR.lehmann} punkte="rgba(255,91,74,.55)" xText={L.lehmannX} yText={L.lehmannY}
    x={(f) => {
      const spalten = Z.drei, zeilen = L.lehmannZeilen;
      return (
        <>
          {spalten.map((s, i) => <div key={s} style={fett(28, { position: "absolute", left: 300 + i * 210, top: 70, width: 190, textAlign: "center", opacity: ein(f, 5 + i * 5) })}>{s}</div>)}
          {zeilen.map((z, j) => (
            <React.Fragment key={z}>
              <div style={fett(24, { position: "absolute", left: 40, top: 140 + j * 76, width: 240, lineHeight: 1.05, opacity: ein(f, 20 + j * 14) })}>{z}</div>
              {spalten.map((_, i) => {
                const voll = [[1, 1, 0], [0, 1, 1], [1, 0, 1]][j][i];
                return <div key={i} style={{ position: "absolute", left: 300 + i * 210 + 40, top: 130 + j * 76, width: 110, height: 56, border: `5px solid ${P.ink}`, ...(voll ? benday("rgba(255,255,255,.4)", 3, 11) : {}), backgroundColor: voll ? [P.koral, P.gelb, P.himmel][i] : P.weiss, transform: `scale(${pop(f, 25 + j * 14 + i * 4, 240)})` }} />;
              })}
            </React.Fragment>
          ))}
        </>
      );
    }}
    y={(f) => {
      // dasselbe Bild zweimal: beim zweiten Mal bleiben die gelernten Unterscheidungen als Linien darin stehen
      const zweit = f > 70;
      const bild = (x: number, gelernt: boolean, a: number) => (
        <div style={{ position: "absolute", left: x, top: 70, width: 340, height: 230, border: `6px solid ${P.ink}`, background: P.weiss, overflow: "hidden", transform: `scale(${pop(f, a, 200)})` }}>
          <div style={{ position: "absolute", left: 20, top: 20, width: 140, height: 190, background: P.rot }} />
          <div style={{ position: "absolute", left: 170, top: 20, width: 150, height: 90, background: P.gelb }} />
          <div style={{ position: "absolute", left: 170, top: 120, width: 150, height: 90, ...benday(P.blau, 4, 13) }} />
          {gelernt ? <svg width="340" height="230" style={{ position: "absolute", inset: 0 }}><path d="M90 0 V230 M0 115 H340 M245 0 V230" stroke={P.ink} strokeWidth="5" strokeDasharray="14 10" /></svg> : null}
        </div>
      );
      return (
        <>
          {bild(60, false, 0)}
          <div style={fett(26, { position: "absolute", left: 60, top: 310, color: P.dunkel })}>1. Mal</div>
          {zweit ? bild(520, true, 70) : null}
          {zweit ? <div style={fett(26, { position: "absolute", left: 520, top: 310, color: P.dunkel })}>2. Mal: anders gesehen</div> : null}
          <div style={fett(70, { position: "absolute", left: 420, top: 130, opacity: ein(f, 60) })}>→</div>
        </>
      );
    }}
  />
);

// ---------- 4c · Duell: re-entry gegen re-exit ----------
const Duell: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Grundpunkte farbe="rgba(224,20,30,.5)">
      <Schild f={f} farbe={P.weiss}>Duell</Schild>
      {/* links: die Form kehrt in sich ein (Luhmann, Baecker) */}
      <Feld x={70} y={200} w={450} h={520} farbe={P.weiss}>
        <div style={fett(28, { position: "absolute", left: 20, top: 16, lineHeight: 1.1 })}><span style={{ background: AUTOR.luhmann.farbe, padding: "2px 8px" }}>Luhmann</span> <span style={{ background: AUTOR.baecker.farbe, padding: "2px 8px" }}>Baecker</span></div>
        <svg width="436" height="546" viewBox="0 0 450 560" style={{ position: "absolute", inset: 0 }}>
          <path d="M60 420 H330 V220" fill="none" stroke={P.ink} strokeWidth="12" />
          <path d={`M330 220 C 420 220, 430 400, 300 400 C 220 400, 210 330, 150 330`} fill="none" stroke={P.tuerkis} strokeWidth="11" strokeDasharray="600" strokeDashoffset={600 * (1 - interpolate(f, [20, 60], [0, 1], klemm))} />
        </svg>
      </Feld>
      {/* rechts: die Kunst tritt aus ihrem Code aus (Lehmann) */}
      <Feld x={560} y={200} w={450} h={520} farbe={P.weiss}>
        <div style={fett(28, { position: "absolute", left: 20, top: 16 })}><span style={{ background: AUTOR.lehmann.farbe, padding: "2px 8px" }}>Lehmann</span></div>
        <div style={{ position: "absolute", left: 80, top: 80, width: 190, height: 190, border: `10px solid ${P.ink}`, ...fett(30, { display: "grid", placeItems: "center" }) }}>Code</div>
        <div style={{ position: "absolute", left: 24, top: 284, fontFamily: SERIF, fontStyle: "italic", fontSize: 24, color: P.dunkel, opacity: ein(f, 100) }}>«{Z.codierung}»</div>
        {/* re-exit gilt bei Lehmann nur für die Humanmedien (Hinweis von Christian, 6. Oktober 2026) */}
        <div style={{ position: "absolute", left: 24, right: 24, top: 332, opacity: ein(f, 105) }}>
          <div style={{ display: "inline-block", padding: "6px 12px", background: P.koral, border: `5px solid ${P.ink}`, ...fett(24, { textTransform: "uppercase", letterSpacing: "0.04em" }) }}>nur in Humanmedien</div>
          <div style={fett(28, { marginTop: 10 })}>Kunst · Liebe · Religion</div>
          <div style={fett(24, { marginTop: 6, color: P.grau, textDecoration: "line-through", textDecorationThickness: 3 })}>Wissenschaft · Recht · Wirtschaft</div>
        </div>
        <svg width="436" height="546" viewBox="0 0 450 560" style={{ position: "absolute", inset: 0 }}>
          <path d={`M285 175 H${285 + 125 * interpolate(f, [70, 100], [0, 1], klemm)}`} stroke={P.koral} strokeWidth="14" />
          <path d="M410 175 l-30 -20 v40z" fill={P.koral} opacity={f > 98 ? 1 : 0} />
        </svg>
      </Feld>
      <Knall p={pop(f, 50, 220)} x={295} y={860} r={190} farbe={P.tuerkis} innen={P.gelb} text="RE-ENTRY!" groesse={50} textfarbe={P.weiss} drehung={-8} />
      <Knall p={pop(f, 100, 220)} x={785} y={860} r={190} farbe={P.koral} innen={P.gelb} text="RE-EXIT!" groesse={62} textfarbe={P.weiss} drehung={7} />
      <Kasten f={f} a={120} top={1050} groesse={40}>{L.duell}</Kasten>
    </Grundpunkte>
  );
};

// ---------- 5 · Differenzen ----------
const Differenzen: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Grundpunkte farbe="rgba(23,71,201,0.47)">
      <AbsoluteFill>
        <Schild f={f} farbe={P.weiss}>Differenzen</Schild>
        {/* a · Lehmann korrigiert Luhmann: weder «mit» noch «ohne Menschen» */}
        <Abschnitt f={f} a={0} b={220}>
          <div style={fett(40, { position: "absolute", left: 76, top: 190, opacity: ein(f, 10) })}>
            <span style={{ background: AUTOR.lehmann.farbe, padding: "4px 14px", border: `5px solid ${P.ink}` }}>Lehmann</span>
            <span style={{ margin: "0 18px" }}>→</span>
            <span style={{ background: AUTOR.luhmann.farbe, padding: "4px 14px", border: `5px solid ${P.ink}` }}>Luhmann</span>
          </div>
          <Blase x={90} y={300} w={880} farbe={P.koral} p={pop(f, 20, 170)} drehung={-1.5}>{Z.korrektur}</Blase>
          {["mit Menschen", "ohne Menschen"].map((w, i) => (
            <div key={w} style={{
              position: "absolute", left: 120 + i * 440, top: 560, width: 360, height: 140, borderRadius: 70, border: `8px solid ${P.ink}`, 
              background: i ? P.himmel : P.gelb, transform: `scale(${pop(f, 60 + i * 12, 200)})`, ...fett(44, { display: "grid", placeItems: "center" }),
            }}>{w}</div>
          ))}
          <Stempel f={f} a={110} x={250} y={672} text="KEINE SCHLICHTE WAHL" farbe={P.rot} groesse={52} drehung={-7} />
          <Kasten f={f} a={95} top={860} groesse={42}>{Z.menschen}</Kasten>
        </Abschnitt>
        {/* b · Lehmann über Baecker, 2008 */}
        <Abschnitt f={f} a={220} b={420}>
          <div style={fett(40, { position: "absolute", left: 76, top: 190, opacity: ein(f, 225) })}>
            <span style={{ background: AUTOR.lehmann.farbe, padding: "4px 14px", border: `5px solid ${P.ink}` }}>Lehmann</span>
            <span style={{ margin: "0 18px" }}>→</span>
            <span style={{ background: AUTOR.baecker.farbe, padding: "4px 14px", border: `5px solid ${P.ink}` }}>Baecker</span>
          </div>
          {/* das Buch */}
          <div style={{ position: "absolute", left: 140, top: 300, width: 360, height: 480, background: AUTOR.baecker.farbe, border: `8px solid ${P.ink}`, transform: `scale(${pop(f, 228, 170)}) rotate(-4deg)`, padding: 30, boxSizing: "border-box", ...fett(46, { lineHeight: 1.1 }) }}>
            {Z.buch}
            <div style={{ position: "absolute", left: 30, right: 30, bottom: 40, height: 14, background: P.ink }} />
          </div>
          {/* Lupe */}
          <div style={{ position: "absolute", left: 470 + Math.sin(f / 9) * 30, top: 380 + Math.cos(f / 11) * 20, transform: `scale(${pop(f, 250)})` }}>
            <svg width="300" height="300" viewBox="0 0 300 300"><circle cx="120" cy="120" r="90" fill="rgba(127,211,255,.45)" stroke={P.ink} strokeWidth="16" /><path d="M185 185 L270 270" stroke={P.ink} strokeWidth="30" strokeLinecap="round" /></svg>
          </div>
          <Stempel f={f} a={290} x={480} y={292} text="TEILWEISE UNTERBESTIMMT" farbe={P.rot} groesse={28} drehung={8} />
          <Kasten f={f} a={265} top={880} groesse={46} klein={Z.rezensionTitel}>«{Z.rezension}»</Kasten>
        </Abschnitt>
      </AbsoluteFill>
    </Grundpunkte>
  );
};

// ---------- 8 · Pointe: kein Treppchen ----------
const Pointe: React.FC = () => {
  const f = useCurrentFrame();
  const flach = interpolate(f, [120, 145], [0, 1], { ...klemm, easing: (t) => t * t });
  const hoehen = [260, 180, 120];
  return (
    <Grundpunkte farbe="rgba(255,210,31,0.85)">
      <AbsoluteFill>
        {/* das Siegertreppchen, das zu einer Ebene zusammensackt */}
        {[1, 0, 2].map((rang, k) => {
          const n = NAMEN[k], h = hoehen[rang] + (160 - hoehen[rang]) * flach;
          return (
            <div key={n.name} style={{ position: "absolute", left: 90 + k * 310, bottom: 1440 - 800, width: 290, transform: `scale(${pop(f, 10 + k * 10, 180)})`, transformOrigin: "50% 100%" }}>
              <div style={fett(34, { textAlign: "center", marginBottom: 14, lineHeight: 1.05 })}>{n.name}</div>
              <div style={{ height: h, background: n.farbe, border: `7px solid ${P.ink}`, ...fett(90, { display: "grid", placeItems: "center" }) }}>{flach < 0.5 ? rang + 1 : "="}</div>
            </div>
          );
        })}
        <Knall p={pop(f, 118, 220)} x={540} y={300} r={210} farbe={P.rot} textfarbe={P.gelb} text="KRACH!" groesse={84} drehung={-4} />
        <Stempel f={f} a={150} x={110} y={850} text={Z.ranking.toUpperCase()} farbe={P.blau} groesse={40} drehung={-5} />
        <Kasten f={f} a={30} b={180} top={1020} groesse={48}>{L.podest}</Kasten>
        <Kasten f={f} a={185} top={1000} groesse={42} klein={<>{Z.mitpruefen}.</>}>{Z.passung}</Kasten>
      </AbsoluteFill>
    </Grundpunkte>
  );
};

// ---------- 9 · Die offene Frage ----------
const Schluss: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Strahlen f={f} cx={540} cy={700} a={P.himmel} b={P.weiss} n={28} />
      <AbsoluteFill style={benday("rgba(23,71,201,.18)", 4.5, 20)} />
      <Schild f={f} farbe={P.gelb}>{Z.offen}</Schild>
      <Wolke p={pop(f, 15, 140)} x={70} y={260} w={940} h={620}>
        <span style={fett(60, { lineHeight: 1.12 })}>{Z.frage}</span>
      </Wolke>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1150, display: "flex", justifyContent: "center", gap: 26 }}>
        {NAMEN.map((n, i) => <div key={n.name} style={{ padding: "10px 18px", background: n.farbe, border: `6px solid ${P.ink}`, transform: `scale(${pop(f, 90 + i * 10)}) rotate(${[-3, 2, -2][i]}deg)`, ...fett(32) }}>{n.name}</div>)}
      </div>
      <Rahmen />
    </AbsoluteFill>
  );
};

// Reihenfolge der Szenen; jede öffnet sich mit einer Kreisblende (Mittelpunkt wechselt zwischen den Ecken)
const SZENEN: [keyof typeof D, React.FC][] = [
  ["titel", Titel], ["raster", Raster], ["luhmann", Luhmann], ["baecker", Baecker], ["lehmann", Lehmann],
  ["xyLuhmann", XYLuhmann], ["xyBaecker", XYBaecker], ["xyLehmann", XYLehmann], ["duell", Duell], ["differenzen", Differenzen], ["pointe", Pointe], ["schluss", Schluss],
];
const ECKEN: [number, number][] = [[900, 1250], [150, 200], [930, 180], [120, 1260]];

export const DreiervergleichVideo: React.FC = () => (
  <Grund>
    <Sequence durationInFrames={INTRO_LANG}><PopIntro kopf={{ titel: "Doppelspalt", unter: ["Luhmann", "Baecker", "Lehmann"] }} /></Sequence>
    {SZENEN.map(([k, Szene], i) => (
      <Sequence key={k} from={T[k]} durationInFrames={D[k]}><Iris dauer={UEBER} mitte={ECKEN[i % ECKEN.length]}><Szene /></Iris></Sequence>
    ))}
    <Sequence from={T.signet} durationInFrames={OUTRO_LANG}><Iris dauer={UEBER} mitte={[540, 720]}><PopOutro /></Iris></Sequence>
  </Grund>
);
