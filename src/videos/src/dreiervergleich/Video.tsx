// Video «Drei im Doppelspalt» (Titel von Christian, 6. Oktober 2026): zeigt witzig und auf den Punkt, wie die Vergleichende Analyse
// «Nebeneinander, Nacheinander | Luhmann, Baecker, Lehmann» (Erweiterte Arbeitsfassung, 5. Oktober 2026) die drei Zugänge prüft – und wo sie sich unterscheiden.
// 3:4 (1080 × 1440), 30 fps, ohne Ton, etwa 2 Minuten. Pop-Art mit viel Roy Lichtenstein (Wunsch), farblich anders als «Liebling …» (Pop.tsx).
// Intro und Outro: Signet der Vorlage. Die Autoren erscheinen nur als Namen in ihrer Farbe, ihre Begriffe als Gegenstände (keine Karikaturen).
// Alle Sätze in Kästen und Blasen wörtlich aus der Studie (zitate.ts); Lautwörter (ZACK!, BRUCH! …) und Beschriftungen der Bilder sind Comic.
import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Grund, INTRO, Intro, OUTRO, Outro } from "../vorlage/Bausteine";
import { Blase, aus, benday, ein, klemm, pop } from "../doppelpruefung/Comic";
import { AUTOR, Abschnitt, Feld, Grundpunkte, Kasten, Knall, P, Schild, Stempel, Strahlen, Wolke, fett } from "./Pop";
import { GRAU, ORT, Z } from "./zitate";

// Zeitplan in Bildern (30 fps)
const D = { titel: 210, raster: 300, luhmann: 420, baecker: 420, lehmann: 450, differenzen: 420, klang: 390, grafik: 420, pointe: 300, schluss: 270 };
export const T = (() => {
  const t: Record<string, number> = { intro: 0 };
  let a = INTRO;
  for (const [k, d] of Object.entries(D)) { t[k] = a; a += d; }
  t.signet = a; t.ende = a + OUTRO;
  return t as Record<keyof typeof D | "intro" | "signet" | "ende", number>;
})();

const NAMEN = [AUTOR.luhmann, AUTOR.baecker, AUTOR.lehmann];

// ---------- 0 · Titel ----------
const Titel: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: aus(f, D.titel) }}>
      <Strahlen f={f} cx={540} cy={820} a={P.gelb} b={P.weiss} />
      <AbsoluteFill style={benday("rgba(224,20,30,.22)", 4.5, 20)} />
      <Blase x={70} y={80} w={940} farbe={P.weiss} p={pop(f, 8, 150)} drehung={-2}>
        <span style={{ fontSize: 104, lineHeight: 1.0, textTransform: "uppercase", letterSpacing: "-0.02em", display: "block" }}>Drei im Doppelspalt</span>
      </Blase>
      {NAMEN.map((n, i) => {
        const p = pop(f, 40 + i * 14, 170);
        return (
          <div key={n.name} style={{
            position: "absolute", left: 90 + i * 40, top: 560 + i * 200, width: 760, padding: "22px 30px", border: `7px solid ${P.ink}`, borderRadius: 10, boxShadow: `12px 12px 0 ${P.ink}`,
            ...benday("rgba(255,255,255,.3)", 4, 16), backgroundColor: n.farbe, transform: `translateX(${(1 - p) * (i % 2 ? 1200 : -1200)}px) rotate(${[-2, 1.5, -1][i]}deg)`,
          }}>
            <div style={fett(64, { lineHeight: 1 })}>{n.name}</div>
            <div style={fett(34, { fontWeight: 600, marginTop: 8 })}>{Z.untertitel[i]}</div>
          </div>
        );
      })}
      <Knall p={pop(f, 100, 200)} x={830} y={1250} r={190} farbe={P.rot} textfarbe={P.gelb} text="ZACK!" groesse={88} drehung={8} />
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
    <Grundpunkte farbe="rgba(23,71,201,.18)">
      <AbsoluteFill style={{ opacity: aus(f, D.raster) }}>
        <Schild f={f} farbe={P.weiss}>Das Prüfraster</Schild>
        {/* X */}
        <Feld x={70} y={210} w={450} h={560} farbe={P.weiss}>
          <div style={fett(40, { position: "absolute", left: 24, top: 18, color: P.blau })}>X · Verräumlichung</div>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: 40 + (i % 3) * 130, top: 110 + Math.floor(i / 3) * 130, width: 110, height: 110, border: `6px solid ${P.ink}`, background: i === 4 && zurueck ? P.gelb : P.weiss, ...(i === 4 && zurueck ? {} : benday("rgba(23,71,201,.18)", 3, 12)) }} />
          ))}
          <div style={{ position: "absolute", left: 40 + 130 + 30, top: 110 + 130 + 30 - weg * 160, width: 50, height: 50, borderRadius: "50%", background: P.rot, border: `6px solid ${P.ink}` }} />
          <div style={fett(34, { position: "absolute", left: 24, right: 24, top: 400, lineHeight: 1.15, opacity: ein(f, 40) })}>{Z.x}:</div>
          <div style={fett(26, { fontWeight: 600, position: "absolute", left: 24, right: 24, top: 448, lineHeight: 1.2, opacity: ein(f, 50) })}>{Z.xText}</div>
        </Feld>
        {/* Y */}
        <Feld x={560} y={210} w={450} h={560} farbe={P.weiss}>
          <div style={fett(40, { position: "absolute", left: 24, top: 18, color: P.rot })}>Y · Verzeitlichung</div>
          {Array.from({ length: 6 }, (_, i) => {
            const k = interpolate(f, [70 + i * 9, 81 + i * 9], [0, 60], klemm);
            return <div key={i} style={{ position: "absolute", left: 40 + i * 62, top: 140, width: 34, height: 200, background: [P.koral, P.gelb, P.tuerkis, P.blau, P.rot, P.himmel][i], border: `6px solid ${P.ink}`, borderRadius: 6, transformOrigin: "100% 100%", transform: `rotate(${k}deg)` }} />;
          })}
          <div style={fett(34, { position: "absolute", left: 24, right: 24, top: 400, lineHeight: 1.15, opacity: ein(f, 90) })}>{Z.y}:</div>
          <div style={fett(26, { fontWeight: 600, position: "absolute", left: 24, right: 24, top: 448, lineHeight: 1.2, opacity: ein(f, 100) })}>{Z.yText}</div>
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
    <Grundpunkte farbe="rgba(18,181,169,.24)">
      <AbsoluteFill style={{ opacity: aus(f, D.luhmann) }}>
        <Schild f={f} farbe={AUTOR.luhmann.farbe}>{AUTOR.luhmann.name}</Schild>
        {/* a · Information, Mitteilung, Verstehen rasten ein; die Liebes-Comic-Wolke */}
        <Abschnitt f={f} a={0} b={190}>
          {Z.einheit.map((w, i) => {
            const p = pop(f, 6 + i * 10, 180);
            const x0 = [70, 400, 730][i], x1 = 120 + i * 285;
            return (
              <div key={w} style={{
                position: "absolute", left: x0 + (x1 - x0) * fuge, top: 240 + (1 - p) * -500, width: 280 + (1 - fuge) * -20, height: 120, boxSizing: "border-box",
                border: `7px solid ${P.ink}`, background: [P.tuerkis, P.weiss, P.himmel][i], ...fett(40, { display: "grid", placeItems: "center" }), boxShadow: `8px 8px 0 ${P.ink}`,
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
    <Grundpunkte farbe="rgba(255,210,31,.42)">
      <AbsoluteFill style={{ opacity: aus(f, D.baecker) }}>
        <Schild f={f} farbe={AUTOR.baecker.farbe}>{AUTOR.baecker.name}</Schild>
        <Feld x={70} y={220} w={940} h={600}>
          <svg width="926" height="586" viewBox="0 0 940 600" style={{ position: "absolute", inset: 0 }}>
            {haken.map(([x, y, w], i) => {
              const z = interpolate(f, [15 + i * 22, 40 + i * 22], [0, 1], klemm);
              const glanz = f > 300;
              return <path key={i} d={`M${x} ${y - 6} H${x + w} V${y - 6 - 250 + i * 60}`} fill="none" stroke={glanz ? [P.blau, P.rot, P.tuerkis][i] : P.ink} strokeWidth="14" strokeLinecap="square" strokeDasharray="2000" strokeDashoffset={2000 * (1 - z)} />;
            })}
            {["a", "b", "c"].map((b, i) => <text key={b} x={[180, 290, 400][i]} y={[480, 400, 320][i]} fontFamily="Newsreader" fontStyle="italic" fontSize="54" opacity={ein(f, 60 + i * 10)}>{b}</text>)}
          </svg>
          {/* Leuchtreklame «nächste Gesellschaft →» */}
          <div style={{ position: "absolute", left: 470, top: 40, opacity: f > 120 && f < 300 ? 1 : 0, transform: `scale(${pop(f, 120, 200)}) rotate(4deg)`, padding: "14px 24px", background: P.blau, border: `6px solid ${P.ink}`, borderRadius: 12, boxShadow: `0 0 0 ${8 + Math.sin(f / 3) * 4}px ${P.himmel}88`, ...fett(40, { color: P.gelb }) }}>NÄCHSTE →</div>
          {f > 300 ? Array.from({ length: 7 }, (_, i) => <div key={i} style={fett(64, { position: "absolute", left: [80, 820, 300, 640, 140, 760, 470][i], top: [70, 120, 60, 430, 300, 520, 180][i], color: P.gelb, WebkitTextStroke: `3px ${P.ink}`, transform: `scale(${pop(f, 300 + i * 6, 260) * (0.8 + 0.2 * Math.sin(f / 4 + i))})` })}>✦</div>) : null}
        </Feld>
        {f < 300 ? <Stempel f={f} a={185} x={540} y={330} text="Y?" farbe={P.rot} groesse={90} drehung={12} /> : null}
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
    <Grundpunkte farbe="rgba(255,91,74,.22)">
      <AbsoluteFill style={{ opacity: aus(f, D.lehmann) }}>
        <Schild f={f} farbe={AUTOR.lehmann.farbe}>{AUTOR.lehmann.name}</Schild>
        {/* a · Werk, Medium, Reflexion */}
        <Abschnitt f={f} a={0} b={130}>
          {Z.drei.map((w, i) => {
            const p = pop(f, 8 + i * 12, 170);
            return (
              <div key={w} style={{
                position: "absolute", left: 100 + i * 300, top: 300 + (i % 2) * 120, width: 260, height: 260, borderRadius: "50%", border: `8px solid ${P.ink}`, boxShadow: `10px 10px 0 ${P.ink}`,
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
          <Kasten f={f} a={150} top={900} groesse={48}>{Z.reexit}</Kasten>
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

// ---------- 5 · Differenzen ----------
const Differenzen: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Grundpunkte farbe="rgba(23,71,201,.18)">
      <AbsoluteFill style={{ opacity: aus(f, D.differenzen) }}>
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
              position: "absolute", left: 120 + i * 440, top: 560, width: 360, height: 140, borderRadius: 70, border: `8px solid ${P.ink}`, boxShadow: `10px 10px 0 ${P.ink}`,
              background: i ? P.himmel : P.gelb, transform: `scale(${pop(f, 60 + i * 12, 200)})`, ...fett(44, { display: "grid", placeItems: "center" }),
            }}>{w}</div>
          ))}
          <Stempel f={f} a={110} x={260} y={600} text="KEINE SCHLICHTE WAHL" farbe={P.rot} groesse={52} drehung={-7} />
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
          <div style={{ position: "absolute", left: 140, top: 300, width: 360, height: 480, background: AUTOR.baecker.farbe, border: `8px solid ${P.ink}`, boxShadow: `14px 14px 0 ${P.ink}`, transform: `scale(${pop(f, 228, 170)}) rotate(-4deg)`, padding: 30, boxSizing: "border-box", ...fett(46, { lineHeight: 1.1 }) }}>
            {Z.buch}
            <div style={{ position: "absolute", left: 30, right: 30, bottom: 40, height: 14, background: P.ink }} />
          </div>
          {/* Lupe */}
          <div style={{ position: "absolute", left: 470 + Math.sin(f / 9) * 30, top: 380 + Math.cos(f / 11) * 20, transform: `scale(${pop(f, 250)})` }}>
            <svg width="300" height="300" viewBox="0 0 300 300"><circle cx="120" cy="120" r="90" fill="rgba(127,211,255,.45)" stroke={P.ink} strokeWidth="16" /><path d="M185 185 L270 270" stroke={P.ink} strokeWidth="30" strokeLinecap="round" /></svg>
          </div>
          <Stempel f={f} a={290} x={440} y={250} text="TEILWEISE UNTERBESTIMMT" farbe={P.rot} groesse={30} drehung={8} />
          <Kasten f={f} a={265} top={880} groesse={46} klein={Z.rezensionTitel}>«{Z.rezension}»</Kasten>
        </Abschnitt>
      </AbsoluteFill>
    </Grundpunkte>
  );
};

// ---------- 6 · Gegenprobe: dieselbe Klanginstallation ----------
const Klang: React.FC = () => {
  const f = useCurrentFrame();
  const Lautsprecher: React.FC<{ x: number; y: number }> = ({ x, y }) => (
    <div style={{ position: "absolute", left: x, top: y }}>
      <div style={{ width: 110, height: 160, background: P.dunkel, border: `6px solid ${P.ink}`, borderRadius: 10, display: "grid", placeItems: "center" }}>
        <div style={{ width: 70, height: 70, borderRadius: "50%", background: P.grau, border: `6px solid ${P.ink}`, transform: `scale(${1 + Math.max(0, Math.sin(f / 3)) * 0.12})` }} />
      </div>
      {[0, 1, 2].map((k) => <div key={k} style={{ position: "absolute", left: 120 + k * 26, top: 30 + k * -14, width: 40 + k * 26, height: 100 + k * 28, borderRadius: "0 100% 100% 0", border: `6px solid ${P.ink}`, borderLeft: "none", opacity: (Math.sin(f / 5 - k) + 1) / 2 }} />)}
    </div>
  );
  const kopf = (x: number, y: number, farbe: string) => <div style={{ position: "absolute", left: x, top: y, width: 90, height: 90, borderRadius: "50%", background: farbe, border: `6px solid ${P.ink}` }} />;
  return (
    <Grundpunkte farbe="rgba(127,211,255,.42)">
      <AbsoluteFill style={{ opacity: aus(f, D.klang) }}>
        <Schild f={f} farbe={P.himmel}>{Z.gegenprobe}</Schild>
        <Feld x={70} y={210} w={940} h={620} farbe={P.weiss}>
          <Lautsprecher x={40} y={50} /><Lautsprecher x={380} y={50} /><Lautsprecher x={720} y={50} />
          <div style={fett(34, { position: "absolute", left: 40, top: 250, color: P.dunkel })}>{f < 120 ? "1. Besuch · 10 Minuten" : "2. Besuch · dieselbe Folge"}</div>
          {/* Besucher:innen als Köpfe */}
          {kopf(120, 470, P.koral)}{kopf(420, 490, P.gelb)}{kopf(720, 470, P.tuerkis)}
          {f > 175 && f < 270 ? [0, 1, 2].map((i) => (
            <div key={i} style={{ position: "absolute", left: [60, 360, 660][i], top: 340, transform: `scale(${pop(f, 180 + i * 10, 220)})`, transformOrigin: "30% 100%", background: P.weiss, border: `6px solid ${P.ink}`, borderRadius: 30, padding: "12px 20px", ...fett(30) }}>{Z.kontext}!</div>
          )) : null}
          {f >= 270 ? [0, 1, 2].map((i) => <div key={i} style={fett(80, { position: "absolute", left: [140, 440, 740][i], top: 350, color: P.rot, WebkitTextStroke: `3px ${P.ink}`, transform: `scale(${pop(f, 275 + i * 8, 220)})` })}>?</div>) : null}
          {f >= 120 && f < 175 ? <div style={{ position: "absolute", left: 300, top: 330, padding: "12px 22px", background: P.gelb, border: `6px solid ${P.ink}`, transform: `scale(${pop(f, 125)}) rotate(-3deg)`, ...fett(32) }}>Info: {Z.kontext}</div> : null}
          {f >= 260 ? <div style={fett(30, { position: "absolute", left: 40, bottom: 26, color: P.dunkel, opacity: ein(f, 262) })}>Neue Klangfolge – Reaktion: unverändert.</div> : null}
        </Feld>
        <Kasten f={f} a={30} b={180} top={900} groesse={52}>{Z.situation}</Kasten>
        <Kasten f={f} a={200} top={900} groesse={50} klein={Z.wahrnehmung}>{Z.worte}</Kasten>
      </AbsoluteFill>
    </Grundpunkte>
  );
};

// ---------- 7 · Streugrafik: auseinandergezogen, korrigiert ----------
const Grafik: React.FC = () => {
  const f = useCurrentFrame();
  // Bereich 3–5 auf beiden Achsen, wie das Detail der Studie (S. 18)
  const X = (v: number) => 110 + (v - 3) * 380, Y = (v: number) => 830 - (v - 3) * 360;
  const ausein = interpolate(f, [70, 120], [0, 1], klemm) * (1 - interpolate(f, [190, 205], [0, 1], klemm));
  const versatz = [[-150, -60], [110, 150], [-210, 120]];
  return (
    <Grundpunkte farbe="rgba(18,181,169,.2)">
      <AbsoluteFill style={{ opacity: aus(f, D.grafik) }}>
        <Schild f={f} farbe={P.weiss}>Die Streugrafik</Schild>
        <Feld x={70} y={190} w={940} h={900}>
          <svg width="926" height="886" viewBox="0 0 940 900" style={{ position: "absolute", inset: 0 }}>
            <path d={`M110 830 H880 M110 830 V60`} stroke={P.ink} strokeWidth="7" />
            <g fontFamily="Instrument Sans" fontWeight={700} fontSize="28">
              {[3, 4, 5].map((v) => <React.Fragment key={v}><text x={X(v)} y="872" textAnchor="middle">{v}</text><text x="80" y={Y(v) + 10} textAnchor="middle">{v}</text></React.Fragment>)}
              <text x="880" y="815" textAnchor="end" fontSize="26">X · Verräumlichung →</text>
              <text x="130" y="44" fontSize="26">Y · Verzeitlichung ↑</text>
            </g>
            <rect x={X(4)} y={Y(5)} width={X(5) - X(4)} height={Y(4) - Y(5)} fill="rgba(18,181,169,.12)" stroke={P.ink} strokeWidth="5" strokeDasharray="18 12" opacity={ein(f, 20)} />
            {GRAU.map(([gx, gy], i) => <circle key={i} cx={X(gx)} cy={Y(gy)} r="11" fill={P.grau} opacity={ein(f, 10 + i * 2) * 0.8} />)}
            {NAMEN.map((n, i) => {
              const s = pop(f, 30 + i * 8, 200);
              const cx = X(ORT.X) + versatz[i][0] * ausein, cy = Y(ORT.Y) + versatz[i][1] * ausein;
              return <circle key={n.name} cx={cx + 6} cy={cy + 6 - (1 - s) * 400} r={30 - i * 6} fill={P.ink} />;
            })}
            {NAMEN.map((n, i) => {
              const s = pop(f, 30 + i * 8, 200);
              const cx = X(ORT.X) + versatz[i][0] * ausein, cy = Y(ORT.Y) + versatz[i][1] * ausein;
              return <circle key={n.name} cx={cx} cy={cy - (1 - s) * 400} r={30 - i * 6} fill={n.farbe} stroke={P.ink} strokeWidth="5" />;
            })}
          </svg>
          {/* die Namen hängen an ihren Punkten (Lage wie im Detail der Studie: Luhmann oben links, Baecker rechts, Lehmann unten links) */}
          {NAMEN.map((n, i) => {
            const cx = (X(ORT.X) + versatz[i][0] * ausein) * (926 / 940), cy = (Y(ORT.Y) + versatz[i][1] * ausein) * (886 / 900);
            const [dx, dy] = [[-330, -92], [-120, 46], [-340, -12]][i];
            return <div key={n.name} style={{ position: "absolute", left: cx + dx, top: cy + dy, opacity: ein(f, 40 + i * 8), padding: "6px 14px", background: n.farbe, border: `5px solid ${P.ink}`, whiteSpace: "nowrap", ...fett(30) }}>{n.name}</div>;
          })}
          {f > 80 && f < 190 ? <div style={fett(36, { position: "absolute", left: 600, top: 520, color: P.blau, transform: "rotate(-6deg)" })}>«zur Lesbarkeit»</div> : null}
        </Feld>
        <Stempel f={f} a={180} x={250} y={560} text="KORREKTUR" farbe={P.rot} groesse={80} drehung={-10} />
        <Kasten f={f} a={130} b={290} top={1150} groesse={44}>{Z.suggerierte}</Kasten>
        <Kasten f={f} a={300} top={1150} groesse={48}>{Z.quadrant}.</Kasten>
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
    <Grundpunkte farbe="rgba(255,210,31,.4)">
      <AbsoluteFill style={{ opacity: aus(f, D.pointe) }}>
        {/* das Siegertreppchen, das zu einer Ebene zusammensackt */}
        {[1, 0, 2].map((rang, k) => {
          const n = NAMEN[k], h = hoehen[rang] + (160 - hoehen[rang]) * flach;
          return (
            <div key={n.name} style={{ position: "absolute", left: 90 + k * 310, bottom: 1440 - 800, width: 290, transform: `scale(${pop(f, 10 + k * 10, 180)})`, transformOrigin: "50% 100%" }}>
              <div style={fett(34, { textAlign: "center", marginBottom: 14, lineHeight: 1.05 })}>{n.name}</div>
              <div style={{ height: h, background: n.farbe, border: `7px solid ${P.ink}`, boxShadow: `10px 10px 0 ${P.ink}`, ...fett(90, { display: "grid", placeItems: "center" }) }}>{flach < 0.5 ? rang + 1 : "="}</div>
            </div>
          );
        })}
        <Knall p={pop(f, 118, 220)} x={540} y={300} r={210} farbe={P.rot} textfarbe={P.gelb} text="KRACH!" groesse={84} drehung={-4} />
        <Stempel f={f} a={150} x={150} y={850} text={Z.ranking.toUpperCase()} farbe={P.blau} groesse={48} drehung={-5} />
        <Kasten f={f} a={30} b={180} top={1020} groesse={50}>{Z.keinRang}.</Kasten>
        <Kasten f={f} a={185} top={1000} groesse={42} klein={<>{Z.mitpruefen}.</>}>{Z.passung}</Kasten>
      </AbsoluteFill>
    </Grundpunkte>
  );
};

// ---------- 9 · Die offene Frage ----------
const Schluss: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity: aus(f, D.schluss) }}>
      <Strahlen f={f} cx={540} cy={700} a={P.himmel} b={P.weiss} n={28} />
      <AbsoluteFill style={benday("rgba(23,71,201,.18)", 4.5, 20)} />
      <Schild f={f} farbe={P.gelb}>{Z.offen}</Schild>
      <Wolke p={pop(f, 15, 140)} x={70} y={260} w={940} h={620}>
        <span style={fett(60, { lineHeight: 1.12 })}>{Z.frage}</span>
      </Wolke>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1150, display: "flex", justifyContent: "center", gap: 26 }}>
        {NAMEN.map((n, i) => <div key={n.name} style={{ padding: "10px 18px", background: n.farbe, border: `6px solid ${P.ink}`, boxShadow: `7px 7px 0 ${P.ink}`, transform: `scale(${pop(f, 90 + i * 10)}) rotate(${[-3, 2, -2][i]}deg)`, ...fett(32) }}>{n.name}</div>)}
      </div>
    </AbsoluteFill>
  );
};

export const DreiervergleichVideo: React.FC = () => (
  <Grund>
    <Sequence durationInFrames={INTRO}><Intro hoehe={1440} kopf={{ titel: "Doppelspalt", unter: ["Luhmann", "Baecker", "Lehmann"] }} /></Sequence>
    <Sequence from={T.titel} durationInFrames={D.titel}><Titel /></Sequence>
    <Sequence from={T.raster} durationInFrames={D.raster}><Raster /></Sequence>
    <Sequence from={T.luhmann} durationInFrames={D.luhmann}><Luhmann /></Sequence>
    <Sequence from={T.baecker} durationInFrames={D.baecker}><Baecker /></Sequence>
    <Sequence from={T.lehmann} durationInFrames={D.lehmann}><Lehmann /></Sequence>
    <Sequence from={T.differenzen} durationInFrames={D.differenzen}><Differenzen /></Sequence>
    <Sequence from={T.klang} durationInFrames={D.klang}><Klang /></Sequence>
    <Sequence from={T.grafik} durationInFrames={D.grafik}><Grafik /></Sequence>
    <Sequence from={T.pointe} durationInFrames={D.pointe}><Pointe /></Sequence>
    <Sequence from={T.schluss} durationInFrames={D.schluss}><Schluss /></Sequence>
    <Sequence from={T.signet} durationInFrames={OUTRO}><Outro hoehe={1440} /></Sequence>
  </Grund>
);
