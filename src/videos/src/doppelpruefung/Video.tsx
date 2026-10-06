// Video «Doppelprüfung» (6. Oktober 2026): zeigt spielerisch, wie die Studie «Poststrukturalistische Theorie – Doppelprüfung»
// zwölf Positionen mit zwei Rastern prüft. 3:4 (1080 × 1440), 30 fps, ohne Ton, etwa 2 Minuten, Comic-Stil (Wunsch von Christian).
// Intro und Outro: Signet der Vorlage. Theoretiker:innen erscheinen nur als Namen, ihre Operationen als Gegenstände (keine Karikaturen).
// Lyotard (Leugnungsbeispiel) und Butler (Fall Reimer) nur als Punkte in der Streugrafik, ohne Witz und ohne Bild (freigegeben).
// Alle Zitate wörtlich aus der Studie (zitate.ts).
import React from "react";
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Grund, INTRO, Intro, OUTRO, Outro } from "../vorlage/Bausteine";
import { SANS } from "../vorlage/stil";
import { Abzeichen, Blase, C, Etikett, H, Panel, Punkte, Satz, aus, ein, klemm, pop } from "./Comic";
import { NAMEN, OPERATIONEN, PUNKTE, SCHWELLEN, Z } from "./zitate";

// Zeitplan in Bildern (30 fps)
const D = { leitfrage: 240, maschinen: 300, karten: 240, band: 300, mini: 225, grafik: 450, schranken: 450, pointe: 240, schluss: 270 };
export const T = (() => {
  const t: Record<string, number> = { intro: 0 };
  let a = INTRO;
  for (const [k, d] of Object.entries(D)) { t[k] = a; a += k === "mini" ? d * 4 : d; }
  t.signet = a; t.ende = a + OUTRO;
  return t as Record<keyof typeof D | "intro" | "signet" | "ende", number>;
})();

const fett = (groesse: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ fontFamily: SANS, fontWeight: 700, fontSize: groesse, ...extra });

// ---------- 1 · Die Leitfrage in drei Sprechblasen ----------
const Leitfrage: React.FC = () => {
  const f = useCurrentFrame();
  const farben = [C.gelb, C.minz, C.mag];
  return (
    <Punkte>
      <AbsoluteFill style={{ opacity: aus(f, D.leitfrage) }}>
        <Etikett f={f} farbe={C.papier}>Doppelprüfung</Etikett>
        {Z.leitfrage.map((zeile, i) => (
          <Blase key={i} x={[90, 230, 110][i]} y={[260, 520, 790][i]} w={[760, 760, 860][i]} farbe={farben[i]} p={pop(f, 12 + i * 50)} drehung={[-2, 2, -1][i]}>{zeile}</Blase>
        ))}
        <Satz f={f} a={170} top={1180} groesse={36}>{Z.untertitel}</Satz>
      </AbsoluteFill>
    </Punkte>
  );
};

// ---------- 2 · Zwei Prüfmaschinen ----------
const Maschinen: React.FC = () => {
  const f = useCurrentFrame();
  const pa = pop(f, 6, 120), pb = pop(f, 40, 120);
  // Stempel: fällt alle 36 Bilder, hinterlässt den Abdruck «dieselbe Stelle?»
  const takt = (f - 30) % 36, schlag = f > 30 && takt < 8 ? interpolate(takt, [0, 4, 8], [0, 1, 0]) : 0;
  const abdrucke = Math.max(0, Math.min(4, Math.floor((f - 30) / 36) + (f > 34 ? 1 : 0)));
  return (
    <Punkte farbe="rgba(255,61,154,.14)">
      <AbsoluteFill style={{ opacity: aus(f, D.maschinen) }}>
        <Etikett f={f} farbe={C.gelb}>Zwei Raster</Etikett>
        {/* Raster A */}
        <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", transform: `translateX(${interpolate(pa, [0, 1], [-1100, 0])}px)` }}>
          <Panel x={70} y={210} w={940} h={520}>
            <div style={fett(36, { position: "absolute", left: 30, top: 22 })}>Raster A · Nebeneinander / Nacheinander</div>
            {/* X: Stempel */}
            <div style={fett(30, { position: "absolute", left: 40, top: 440, color: C.blau })}>X · dieselbe Stelle?</div>
            {Array.from({ length: abdrucke }, (_, i) => (
              <div key={i} style={{ position: "absolute", left: 50 + (i % 2) * 150, top: 250 + Math.floor(i / 2) * 90, width: 120, height: 70, border: `6px solid ${C.blau}`, borderRadius: 8, transform: `rotate(${[-6, 4, 3, -4][i]}deg)`, ...fett(44, { color: C.blau, display: "grid", placeItems: "center" }) }}>X</div>
            ))}
            <div style={{ position: "absolute", left: 120, top: 90 + schlag * 120, width: 140, height: 120 }}>
              <div style={{ margin: "0 auto", width: 40, height: 60, background: C.violett, border: `6px solid ${C.ink}`, borderRadius: 10 }} />
              <div style={{ width: 140, height: 50, background: C.blau, border: `6px solid ${C.ink}`, borderRadius: 6, marginTop: -6 }} />
            </div>
            {/* Y: Dominosteine */}
            <div style={fett(30, { position: "absolute", left: 500, top: 440, color: C.rot })}>Y · was wirkt weiter?</div>
            {Array.from({ length: 6 }, (_, i) => {
              const k = interpolate(f, [70 + i * 10, 82 + i * 10], [0, 62], klemm);
              return <div key={i} style={{ position: "absolute", left: 520 + i * 62, top: 230, width: 34, height: 160, background: [C.rot, C.gelb, C.minz, C.mag, C.orange, C.blau][i], border: `6px solid ${C.ink}`, borderRadius: 6, transformOrigin: "100% 100%", transform: `rotate(${k}deg)` }} />;
            })}
          </Panel>
        </div>
        {/* Raster B */}
        <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", transform: `translateX(${interpolate(pb, [0, 1], [1100, 0])}px)` }}>
          <Panel x={70} y={790} w={940} h={470}>
            <div style={fett(36, { position: "absolute", left: 30, top: 22 })}>Raster B · Der Verteilapparat des Körpers</div>
            <div style={{ position: "absolute", left: 30, right: 30, top: 330, height: 14, background: C.ink, borderRadius: 7 }} />
            {Array.from({ length: 7 }, (_, i) => {
              const auf = interpolate(f, [120 + i * 16, 132 + i * 16], [0, -70], klemm);
              return (
                <div key={i} style={{ position: "absolute", left: 70 + i * 122, top: 200 }}>
                  <div style={{ width: 16, height: 130, background: C.ink }} />
                  <div style={{ position: "absolute", left: 8, top: 20, width: 100, height: 22, background: i % 2 ? C.rot : C.papier, border: `5px solid ${C.ink}`, transformOrigin: "0% 50%", transform: `rotate(${auf}deg)` }} />
                </div>
              );
            })}
            <div style={{ position: "absolute", top: 262, left: interpolate(f, [120, 250], [10, 860], klemm), width: 60, height: 60, borderRadius: "50%", background: C.gelb, border: `6px solid ${C.ink}`, translate: `0 ${Math.abs(Math.sin(f / 4)) * -14}px` }} />
            <div style={fett(34, { position: "absolute", left: 30, top: 380, color: C.violett })}>{Z.leitfrageKorrektur}</div>
          </Panel>
        </div>
      </AbsoluteFill>
    </Punkte>
  );
};

// ---------- 3 · Zwölf Karten, je eine Operation ----------
const Karten: React.FC = () => {
  const f = useCurrentFrame();
  const farben = [C.rot, C.blau, C.gelb, C.minz, C.mag, C.orange, C.violett, C.blau, C.rot, C.minz, C.gelb, C.mag];
  const stempel = pop(f, 150, 260);
  return (
    <Punkte farbe="rgba(25,211,162,.18)">
      <AbsoluteFill style={{ opacity: aus(f, D.karten) }}>
        <Etikett f={f} farbe={C.minz}>Zwölf Positionen</Etikett>
        {NAMEN.map((n, i) => {
          const p = pop(f, 10 + i * 6, 160), sp = i % 3, ze = Math.floor(i / 3);
          const hell = farben[i] === C.gelb || farben[i] === C.minz;
          return (
            <div key={n} style={{
              position: "absolute", left: 70 + sp * 320, top: 210 + ze * 190, width: 290, height: 150, background: farben[i], border: `6px solid ${C.ink}`, borderRadius: 10,
              boxShadow: `8px 8px 0 ${C.ink}`, boxSizing: "border-box", padding: 16, display: "grid", alignContent: "end",
              transform: `translate(${(1 - p) * (sp - 1) * 400}px, ${(1 - p) * -700}px) rotate(${(1 - p) * 40 + [-2, 1, 3, -1][i % 4]}deg)`,
              ...fett(32, { color: hell ? C.ink : C.papier, lineHeight: 1.1 }),
            }}>{n}</div>
          );
        })}
        <div style={{
          position: "absolute", left: 160, top: 560, padding: "18px 34px", border: `10px solid ${C.rot}`, borderRadius: 14, background: "rgba(255,255,255,.85)",
          transform: `scale(${interpolate(stempel, [0, 1], [2.6, 1])}) rotate(-9deg)`, opacity: f > 150 ? 1 : 0, ...fett(64, { color: C.rot, letterSpacing: "0.02em" }),
        }}>Begriff · Interpretation</div>
        <Satz f={f} a={40} top={1000} groesse={42}>{Z.auswahl}</Satz>
        <Satz f={f} a={170} top={1120} groesse={34}>{Z.register}</Satz>
      </AbsoluteFill>
    </Punkte>
  );
};

// ---------- 4 · Förderband: acht Fragen, dann die Zusatzprüfung ----------
const Band: React.FC = () => {
  const f = useCurrentFrame();
  const x = interpolate(f, [10, 190], [-260, 1100], klemm);
  return (
    <Punkte farbe="rgba(255,138,0,.18)">
      <AbsoluteFill style={{ opacity: aus(f, D.band) }}>
        <Etikett f={f} farbe={C.orange}>Acht Prüffragen</Etikett>
        {/* Stempel 1–8 */}
        {Array.from({ length: 8 }, (_, i) => {
          const sx = 80 + i * 118, unter = x + 110 > sx + 40 && x + 110 < sx + 140;
          return (
            <div key={i} style={{ position: "absolute", left: sx, top: 250 + (unter ? 60 : 0), width: 90 }}>
              <div style={{ margin: "0 auto", width: 26, height: 90, background: C.ink }} />
              <div style={{ width: 90, height: 70, background: [C.rot, C.blau, C.gelb, C.minz, C.mag, C.orange, C.violett, C.blau][i], border: `6px solid ${C.ink}`, borderRadius: 8, boxSizing: "border-box", ...fett(40, { display: "grid", placeItems: "center", color: C.ink }) }}>{i + 1}</div>
            </div>
          );
        })}
        {/* Band */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 560, height: 36, background: C.ink }} />
        {Array.from({ length: 14 }, (_, i) => <div key={i} style={{ position: "absolute", top: 600, left: ((i * 80 - f * 6) % 1120 + 1120) % 1120 - 20, width: 30, height: 30, borderRadius: "50%", background: C.papier, border: `6px solid ${C.ink}` }} />)}
        {/* Karte mit acht Feldern, die sich beim Durchlaufen füllen */}
        <div style={{ position: "absolute", left: x, top: 440, width: 260, height: 120, background: C.papier, border: `6px solid ${C.ink}`, borderRadius: 10, boxShadow: `8px 8px 0 ${C.ink}`, display: "flex", flexWrap: "wrap", gap: 10, padding: 16, boxSizing: "border-box", alignContent: "center" }}>
          {Array.from({ length: 8 }, (_, i) => <div key={i} style={{ width: 44, height: 36, borderRadius: 6, border: `5px solid ${C.ink}`, background: x + 110 > 80 + i * 118 + 40 ? C.minz : C.papier }} />)}
        </div>
        {/* Zusatzprüfung: drei Lämpchen */}
        <div style={fett(40, { position: "absolute", left: 70, top: 720, opacity: ein(f, 190) })}>Zusatzprüfung</div>
        {Z.zusatz.map((w, i) => {
          const an = f > 205 + i * 22;
          return (
            <div key={w} style={{ position: "absolute", left: 70, top: 800 + i * 110, display: "flex", alignItems: "center", gap: 28, opacity: ein(f, 195 + i * 22) }}>
              <div style={{ width: 70, height: 70, borderRadius: "50%", border: `7px solid ${C.ink}`, background: an ? [C.gelb, C.mag, C.minz][i] : C.papier, boxShadow: an ? `0 0 0 12px ${[C.gelb, C.mag, C.minz][i]}55` : "none" }} />
              <div style={fett(44)}>{w}</div>
            </div>
          );
        })}
        <Satz f={f} a={30} top={1190} groesse={42}>{Z.fragenZuerst}</Satz>
      </AbsoluteFill>
    </Punkte>
  );
};

// ---------- 5 · Vier Miniaturen ----------
const Miniatur: React.FC<{ etikett: string; farbe: string; X: number; Y: number; satz: React.ReactNode; klein: string; children: (f: number) => React.ReactNode; punkte: string }> = ({ etikett, farbe, X, Y, satz, klein, children, punkte }) => {
  const f = useCurrentFrame();
  return (
    <Punkte farbe={punkte}>
      <AbsoluteFill style={{ opacity: aus(f, D.mini) }}>
        <Etikett f={f} farbe={farbe}>{etikett}</Etikett>
        <Panel x={70} y={210} w={940} h={640} style={{ overflow: "hidden" }}>{children(f)}</Panel>
        <Abzeichen f={f} a={120} x={680} y={900} X={X} Y={Y} />
        <Satz f={f} a={70} top={1030} klein={klein}>{satz}</Satz>
      </AbsoluteFill>
    </Punkte>
  );
};

/** Derrida: dieselbe Unterschrift, gestempelt in drei Zusammenhänge */
const Derrida: React.FC = () => {
  const o = OPERATIONEN.derrida;
  const sig = "M10 60 C 40 0, 60 0, 70 40 S 100 90, 120 40 S 150 -10, 170 50 S 210 70, 240 20";
  return (
    <Miniatur etikett={`${o.titel} · ${o.name}`} farbe={C.mag} X={o.X} Y={o.Y} satz={Z.derrida} klein={o.titel} punkte="rgba(255,61,154,.14)">
      {(f) => (
        <>
          {["Brief", "Vertrag", "Plakat"].map((w, i) => {
            const a = 20 + i * 45, p = pop(f, a, 200);
            return (
              <div key={w} style={{ position: "absolute", left: 40 + i * 295, top: 150 + (i % 2) * 70, width: 260, height: 330, background: [C.gelb, C.papier, C.minz][i], border: `6px solid ${C.ink}`, borderRadius: 8, boxShadow: `8px 8px 0 ${C.ink}`, transform: `rotate(${[-4, 2, 5][i]}deg)` }}>
                <div style={fett(30, { position: "absolute", left: 18, top: 14 })}>{w}</div>
                {[0, 1, 2].map((z) => <div key={z} style={{ position: "absolute", left: 18, right: 18, top: 70 + z * 34, height: 10, background: "#00000022", borderRadius: 5 }} />)}
                <svg width="250" height="100" viewBox="0 0 250 100" style={{ position: "absolute", left: 5, top: 200, transform: `scale(${p})` }}>
                  <path d={sig} fill="none" stroke={C.blau} strokeWidth="7" strokeLinecap="round" />
                </svg>
              </div>
            );
          })}
          {/* der Stempel wandert von Blatt zu Blatt */}
          {(() => {
            const i = Math.min(2, Math.floor(Math.max(0, f - 5) / 45)), t = (Math.max(0, f - 5) % 45);
            const runter = interpolate(t, [0, 12, 15, 26], [0, 1, 1, 0], klemm);
            return f < 150 ? (
              <div style={{ position: "absolute", left: 80 + i * 295, top: 60 + runter * 230 + (i % 2) * 70 }}>
                <div style={{ margin: "0 auto", width: 40, height: 70, background: C.violett, border: `6px solid ${C.ink}`, borderRadius: 10 }} />
                <div style={{ width: 170, height: 46, background: C.blau, border: `6px solid ${C.ink}`, borderRadius: 6, marginTop: -6 }} />
              </div>
            ) : null;
          })()}
        </>
      )}
    </Miniatur>
  );
};

/** Deleuze: AB, AB, AB, A … und die Erwartung «B?» */
const Deleuze: React.FC = () => {
  const o = OPERATIONEN.deleuze;
  return (
    <Miniatur etikett={`Gewohnheit · ${o.name}`} farbe={C.gelb} X={o.X} Y={o.Y} satz={Z.deleuze} klein={o.titel} punkte="rgba(35,55,255,.15)">
      {(f) => (
        <>
          {["A", "B", "A", "B", "A"].map((b, i) => {
            const p = pop(f, 8 + i * 16, 220);
            return <div key={i} style={{ position: "absolute", left: 40 + i * 172 + (i > 1 ? 16 : 0) + (i > 3 ? 16 : 0), top: 300, width: 150, height: 170, background: b === "A" ? C.blau : C.rot, border: `7px solid ${C.ink}`, borderRadius: 10, boxShadow: `9px 9px 0 ${C.ink}`, boxSizing: "border-box", transform: `translateY(${(1 - p) * -500}px) rotate(${[0, 0, -3, -3, 4][i]}deg)`, ...fett(110, { color: C.papier, display: "grid", placeItems: "center" }) }}>{b}</div>;
          })}
          {(() => {
            const p = pop(f, 105, 160), wackel = Math.sin(f / 5) * 3;
            return (
              <>
                <div style={{ position: "absolute", left: 610, top: 40, width: 250, height: 190, borderRadius: "50%", background: C.papier, border: `7px solid ${C.ink}`, transform: `scale(${p}) rotate(${wackel}deg)`, ...fett(96, { color: C.rot, display: "grid", placeItems: "center" }) }}>B?</div>
                <div style={{ position: "absolute", left: 760, top: 240, width: 42, height: 34, borderRadius: "50%", background: C.papier, border: `6px solid ${C.ink}`, transform: `scale(${pop(f, 95)})` }} />
                <div style={{ position: "absolute", left: 800, top: 272, width: 24, height: 20, borderRadius: "50%", background: C.papier, border: `5px solid ${C.ink}`, transform: `scale(${pop(f, 88)})` }} />
              </>
            );
          })()}
        </>
      )}
    </Miniatur>
  );
};

/** Foucault: Fenster, Register, abgeheftete Fälle */
const Foucault: React.FC = () => {
  const o = OPERATIONEN.foucault;
  return (
    <Miniatur etikett={`Disziplin · ${o.name}`} farbe={C.rot} X={o.X} Y={o.Y} satz={<>{Z.foucault}; […]</>} klein={o.titel} punkte="rgba(255,59,47,.14)">
      {(f) => (
        <>
          {/* Haus mit 3 × 3 Fenstern; Köpfe erscheinen, werden abgehakt */}
          <div style={{ position: "absolute", left: 40, top: 110, width: 470, height: 480, background: C.gelb, border: `7px solid ${C.ink}` }} />
          <div style={{ position: "absolute", left: 30, top: 40, width: 0, height: 0, borderLeft: "250px solid transparent", borderRight: "250px solid transparent", borderBottom: `80px solid ${C.ink}` }} />
          {Array.from({ length: 9 }, (_, i) => {
            const sx = 70 + (i % 3) * 145, sy = 140 + Math.floor(i / 3) * 145, kopf = pop(f, 10 + i * 9, 220), haken = f > 40 + i * 9;
            return (
              <div key={i} style={{ position: "absolute", left: sx, top: sy, width: 120, height: 120, background: C.blau, border: `6px solid ${C.ink}`, overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 30, top: 120 - kopf * 70, width: 60, height: 60, borderRadius: "50%", background: C.papier, border: `5px solid ${C.ink}` }} />
                {haken ? <div style={fett(56, { position: "absolute", right: 6, top: -4, color: C.minz, WebkitTextStroke: `2px ${C.ink}` })}>✓</div> : null}
              </div>
            );
          })}
          {/* Register: Seiten stapeln sich */}
          <div style={fett(34, { position: "absolute", left: 590, top: 110 })}>Register</div>
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} style={{ position: "absolute", left: 580 + (i % 2) * 6, top: 520 - i * 34 - (1 - pop(f, 45 + i * 9, 240)) * -400, width: 300, height: 40, background: [C.papier, C.minz, C.papier, C.mag, C.papier, C.orange, C.papier, C.violett, C.papier][i], border: `5px solid ${C.ink}`, borderRadius: 4, opacity: f > 45 + i * 9 ? 1 : 0 }} />
          ))}
        </>
      )}
    </Miniatur>
  );
};

/** Baudrillard: das Modell sticht das «Wirkliche» aus */
const Baudrillard: React.FC = () => {
  const o = OPERATIONEN.baudrillard;
  return (
    <Miniatur etikett={`${o.titel} · ${o.name}`} farbe={C.minz} X={o.X} Y={o.Y} satz={Z.baudrillard} klein={o.titel} punkte="rgba(139,61,255,.14)">
      {(f) => {
        // Teig unten, Ausstechform fährt dreimal herunter, die ausgestochenen Sterne heissen «real»
        const n = Math.min(3, Math.floor(Math.max(0, f - 10) / 40)), t = Math.max(0, f - 10) % 40;
        const runter = f < 130 ? interpolate(t, [0, 14, 18, 30], [0, 1, 1, 0], klemm) : 0;
        const stern = "M50 0 L62 36 L100 38 L70 60 L80 98 L50 76 L20 98 L30 60 L0 38 L38 36 Z";
        return (
          <>
            <div style={{ position: "absolute", left: 40, right: 40, top: 320, height: 200, background: C.orange, border: `7px solid ${C.ink}`, borderRadius: 30 }} />
            {Array.from({ length: n }, (_, i) => (
              <svg key={i} width="140" height="140" viewBox="-10 -10 120 120" style={{ position: "absolute", left: 120 + i * 260, top: 350 }}>
                <path d={stern} fill={C.papier} stroke={C.ink} strokeWidth="6" strokeLinejoin="round" />
              </svg>
            ))}
            {Array.from({ length: n }, (_, i) => {
              const p = pop(f, 40 + i * 40, 200);
              return <div key={i} style={{ position: "absolute", left: 138 + i * 260, top: 540, ...fett(30, { color: C.violett, transform: `scale(${p})` }) }}>«real»</div>;
            })}
            {f < 130 ? (
              <div style={{ position: "absolute", left: 105 + Math.min(2, Math.floor(Math.max(0, f - 10) / 40)) * 260, top: 40 + runter * 250 }}>
                <div style={fett(30, { textAlign: "center", marginBottom: 8 })}>Modell</div>
                <svg width="170" height="170" viewBox="-10 -10 120 120"><path d={stern} fill={C.violett} stroke={C.ink} strokeWidth="7" strokeLinejoin="round" /></svg>
              </div>
            ) : null}
          </>
        );
      }}
    </Miniatur>
  );
};

// ---------- 6 · Streugrafik ----------
const Grafik: React.FC = () => {
  const f = useCurrentFrame();
  const farben = [C.rot, C.blau, C.mag, C.gelb, C.minz, C.orange, C.violett];
  const X = (s: number) => 140 + s * 140, Y = (s: number) => 790 - s * 140;
  const achse = interpolate(f, [10, 40], [0, 1], klemm);
  return (
    <Punkte farbe="rgba(255,61,154,.14)">
      <AbsoluteFill style={{ opacity: aus(f, D.grafik) }}>
        <Etikett f={f} farbe={C.minz}>Zwölf Positionen, ein Raster</Etikett>
        <Panel x={70} y={210} w={940} h={900}>
          <svg width="926" height="886" viewBox="0 0 940 900" style={{ position: "absolute", inset: 0 }}>
            <path d={`M140 790 H${140 + 740 * achse}`} stroke={C.ink} strokeWidth="7" />
            <path d={`M140 790 V${790 - 730 * achse}`} stroke={C.ink} strokeWidth="7" />
            <g opacity={ein(f, 40)} fontFamily="Instrument Sans" fontWeight={700}>
              <path d="M880 790 l-26 -14 v28z M140 60 l-14 26 h28z" fill={C.ink} />
              <text x="880" y="885" textAnchor="end" fontSize="30">X · Nebeneinander →</text>
              <text x="70" y="70" fontSize="30" transform="rotate(-90 70 70)" textAnchor="end">Y · Nacheinander →</text>
              {[1, 2, 3, 4, 5].map((i) => <React.Fragment key={i}><text x={X(i)} y="830" textAnchor="middle" fontSize="28">{i}</text><text x="110" y={Y(i) + 10} textAnchor="middle" fontSize="28">{i}</text></React.Fragment>)}
            </g>
            {PUNKTE.map((p, i) => {
              const a = 60 + i * 22, s = pop(f, a, 200), r = p.namen.length > 1 ? 46 : 34;
              const y = Y(p.Y) - (1 - s) * 600;
              return (
                <g key={i} opacity={f > a ? 1 : 0}>
                  <circle cx={X(p.X) + 7} cy={y + 7} r={r} fill={C.ink} />
                  <circle cx={X(p.X)} cy={y} r={r} fill={farben[i]} stroke={C.ink} strokeWidth="6" />
                  {p.namen.length > 1 ? <text x={X(p.X)} y={y + 15} textAnchor="middle" fontFamily="Instrument Sans" fontWeight={700} fontSize="42" fill={C.papier} stroke={C.ink} strokeWidth="2">{p.namen.length}</text> : null}
                </g>
              );
            })}
            {PUNKTE.map((p, i) => {
              const ly = 470 + i * 42, o = ein(f, 230 + i * 10);
              return (
                <g key={i} opacity={o} fontFamily="Instrument Sans" fontSize="23">
                  <circle cx="230" cy={ly} r="13" fill={farben[i]} stroke={C.ink} strokeWidth="4" />
                  <text x="256" y={ly + 8} fontWeight={700}>{p.X}/{p.Y}</text>
                  <text x="310" y={ly + 8}>{p.namen.join(" · ")}</text>
                </g>
              );
            })}
          </svg>
        </Panel>
        <Satz f={f} a={330} top={1170} groesse={44}>{Z.keineNote}</Satz>
      </AbsoluteFill>
    </Punkte>
  );
};

// ---------- 7 · Sieben Schranken (Foucault, Pestreglement) ----------
const STATUS: Record<string, { farbe: string; zeichen: string }> = {
  passiert: { farbe: C.minz, zeichen: "→" }, umgeleitet: { farbe: C.gelb, zeichen: "↪" }, offen: { farbe: C.papier, zeichen: "?" },
};
const Schranken: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Punkte farbe="rgba(255,212,0,.25)">
      <AbsoluteFill style={{ opacity: aus(f, D.schranken) }}>
        <Etikett f={f} farbe={C.violett}><span style={{ color: C.papier }}>Sieben Schranken</span></Etikett>
        <div style={fett(30, { position: "absolute", left: 76, top: 170, color: C.grau, opacity: ein(f, 10) })}>Michel Foucault · Pestreglement, im Regelmodell</div>
        <Panel x={70} y={230} w={940} h={790}>
          <div style={fett(30, { position: "absolute", left: 340, top: 24, width: 260, textAlign: "center" })}>Selbst­beschreibung</div>
          <div style={fett(30, { position: "absolute", left: 630, top: 24, width: 260, textAlign: "center" })}>Fremd­erfassung</div>
          {SCHWELLEN.map(([s, selbst, fremd], i) => {
            const a = 30 + i * 30, y = 90 + i * 96;
            return (
              <React.Fragment key={s}>
                <div style={fett(32, { position: "absolute", left: 28, top: y + 22, opacity: ein(f, a - 10) })}>{s}</div>
                {[selbst, fremd].map((st, k) => {
                  const p = pop(f, a + k * 8, 240), m = STATUS[st];
                  return (
                    <div key={k} style={{ position: "absolute", left: 350 + k * 290, top: y + 8, width: 240, height: 66, background: m.farbe, border: `6px ${st === "offen" ? "dashed" : "solid"} ${C.ink}`, borderRadius: 12, boxSizing: "border-box", transform: `scale(${p}) rotate(${(k ? 1 : -1) * (i % 2 ? 2 : -1)}deg)`, ...fett(30, { display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }) }}>
                      <span>{m.zeichen}</span><span>{st}</span>
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
        </Panel>
        <Satz f={f} a={270} top={1080} groesse={36}>{Z.pestErtrag}</Satz>
      </AbsoluteFill>
    </Punkte>
  );
};

// ---------- 8 · Sichtbarkeit ≠ Gehör ----------
const Pointe: React.FC = () => {
  const f = useCurrentFrame();
  const auge = pop(f, 10), ohr = pop(f, 40), ungleich = pop(f, 75, 260);
  const blinz = Math.abs(((f % 70) - 35)) < 3 ? 0.15 : 1;
  return (
    <Punkte farbe="rgba(35,55,255,.15)">
      <AbsoluteFill style={{ opacity: aus(f, D.pointe) }}>
        <div style={{ position: "absolute", left: 70, top: 300, transform: `scale(${auge})` }}>
          <svg width="380" height="260" viewBox="0 0 380 260">
            <path d="M10 130 Q190 -40 370 130 Q190 300 10 130 Z" fill={C.papier} stroke={C.ink} strokeWidth="10" />
            <g transform={`translate(190 130) scale(1 ${blinz})`}><circle r="70" fill={C.blau} stroke={C.ink} strokeWidth="8" /><circle r="28" fill={C.ink} /><circle cx="-20" cy="-22" r="12" fill={C.papier} /></g>
          </svg>
          <div style={fett(52, { textAlign: "center", marginTop: 20 })}>Sichtbarkeit</div>
        </div>
        <div style={{ position: "absolute", left: 470, top: 360, transform: `scale(${ungleich}) rotate(-8deg)`, ...fett(170, { color: C.rot, WebkitTextStroke: `6px ${C.ink}` }) }}>≠</div>
        <div style={{ position: "absolute", left: 690, top: 260, transform: `scale(${ohr}) rotate(${Math.sin(f / 8) * 4}deg)` }}>
          <svg width="300" height="320" viewBox="0 0 300 320">
            <path d="M80 300 C 20 300, 30 220, 60 200 C 90 180, 40 120, 70 70 C 110 0, 250 10, 260 120 C 268 200, 200 210, 190 260 C 182 300, 130 310, 80 300 Z" fill={C.mag} stroke={C.ink} strokeWidth="10" strokeLinejoin="round" />
            <path d="M120 200 C 100 150, 120 90, 170 100 C 210 110, 200 160, 170 170" fill="none" stroke={C.ink} strokeWidth="10" strokeLinecap="round" />
          </svg>
          <div style={fett(52, { textAlign: "center", marginTop: 0 })}>Gehör</div>
        </div>
        <Satz f={f} a={110} top={1000} groesse={48}>{Z.sichtbarGehoer}</Satz>
      </AbsoluteFill>
    </Punkte>
  );
};

// ---------- 9 · Die drei Schlussfragen ----------
const Schluss: React.FC = () => {
  const f = useCurrentFrame();
  const farben = [C.gelb, C.minz, C.mag];
  return (
    <Punkte farbe="rgba(25,211,162,.18)">
      <AbsoluteFill style={{ opacity: aus(f, D.schluss) }}>
        <Etikett f={f} farbe={C.papier}>Was bleibt zu fragen</Etikett>
        {Z.schluss.map((q, i) => {
          const p = pop(f, 15 + i * 45, 170);
          return (
            <div key={i} style={{ position: "absolute", left: 70 + i * 40, top: 260 + i * 280, width: 820, background: farben[i], border: `7px solid ${C.ink}`, borderRadius: 12, boxShadow: `12px 12px 0 ${C.ink}`, padding: "34px 40px", boxSizing: "border-box", transform: `translateX(${(1 - p) * 1200}px) rotate(${[-2, 1.5, -1][i]}deg)`, ...fett(56, { lineHeight: 1.15 }) }}>{q}</div>
          );
        })}
      </AbsoluteFill>
    </Punkte>
  );
};

export const DoppelpruefungVideo: React.FC = () => (
  <Grund>
    <Sequence durationInFrames={INTRO}><Intro hoehe={H} kopf={{ titel: "Doppelprüfung", unter: ["Poststrukturalismus", "12 Positionen"] }} /></Sequence>
    <Sequence from={T.leitfrage} durationInFrames={D.leitfrage}><Leitfrage /></Sequence>
    <Sequence from={T.maschinen} durationInFrames={D.maschinen}><Maschinen /></Sequence>
    <Sequence from={T.karten} durationInFrames={D.karten}><Karten /></Sequence>
    <Sequence from={T.band} durationInFrames={D.band}><Band /></Sequence>
    <Sequence from={T.mini} durationInFrames={D.mini}><Derrida /></Sequence>
    <Sequence from={T.mini + D.mini} durationInFrames={D.mini}><Deleuze /></Sequence>
    <Sequence from={T.mini + 2 * D.mini} durationInFrames={D.mini}><Foucault /></Sequence>
    <Sequence from={T.mini + 3 * D.mini} durationInFrames={D.mini}><Baudrillard /></Sequence>
    <Sequence from={T.grafik} durationInFrames={D.grafik}><Grafik /></Sequence>
    <Sequence from={T.schranken} durationInFrames={D.schranken}><Schranken /></Sequence>
    <Sequence from={T.pointe} durationInFrames={D.pointe}><Pointe /></Sequence>
    <Sequence from={T.schluss} durationInFrames={D.schluss}><Schluss /></Sequence>
    <Sequence from={T.signet} durationInFrames={OUTRO}><Outro hoehe={H} /></Sequence>
  </Grund>
);
