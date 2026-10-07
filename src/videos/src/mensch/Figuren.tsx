// Figuren für «Mensch, Niklas!» (7. Oktober 2026): der Erzähler (Christian, stilisiert: Brille, Wuschelkopf, Nerd, um die 50),
// Luhmann als Laken-Geist mit Zettelkasten (antwortet nur mit Zettelnummern), Zettel, der Körper im Röntgenblick.
// Lichtenstein-Stil: kräftige Konturen, Ben-Day-Punkte im Gesicht, flache Grundfarben. Kein Porträt, keine Karikatur realer Gesichter.
import React from "react";
import { P, fett } from "../dreiervergleich/Pop";

const HAUT = "#ffd8b5", HAAR = "#3b2a22", GRAU = "#a9a39c", PULLI = "#2f6b4f";

/** Ben-Day-Muster für SVG (Punkte in einer Farbe) */
export const Punktmuster: React.FC<{ id: string; farbe: string; r?: number; a?: number }> = ({ id, farbe, r = 2.6, a = 9 }) => (
  <pattern id={id} width={a} height={a} patternUnits="userSpaceOnUse">
    <circle cx={a / 4} cy={a / 4} r={r} fill={farbe} /><circle cx={(a * 3) / 4} cy={(a * 3) / 4} r={r} fill={farbe} />
  </pattern>
);

/** Der Erzähler als Brustbild (Breite 400, Höhe 480 bei massstab 1). spricht: Mund offen. grau: 0–1 entsättigt (für «in die Umwelt gerückt») */
export const Ich: React.FC<{ x: number; y: number; massstab?: number; spricht?: boolean; grau?: number; style?: React.CSSProperties; id?: string }> = ({ x, y, massstab = 1, spricht = false, grau = 0, style, id = "ich" }) => {
  // Wuschelkopf: Locken als Kreise um den Oberkopf, einige grau (um die 50)
  const locken: [number, number, number, boolean][] = [];
  for (let i = 0; i < 17; i++) {
    const w = Math.PI * (1.02 + (i / 16) * 0.98), r = 108 + (i % 3) * 8;
    locken.push([200 + Math.cos(w) * r, 205 + Math.sin(w) * r * 0.95, 30 + (i % 4) * 4, i % 5 === 2 || i === 3]);
  }
  for (let i = 0; i < 7; i++) locken.push([140 + i * 20, 118 + (i % 2) * 14, 28, i === 4]);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 400 * massstab, height: 480 * massstab, filter: grau ? `grayscale(${grau})` : undefined, ...style }}>
      <svg width={400 * massstab} height={480 * massstab} viewBox="0 0 400 480" style={{ overflow: "visible" }}>
        <defs>
          <Punktmuster id={`${id}-haut`} farbe="rgba(224,20,30,.33)" r={2.3} a={8} />
          <Punktmuster id={`${id}-pulli`} farbe="rgba(255,255,255,.28)" r={2.4} a={9} />
        </defs>
        {/* Pullover und Hemdkragen */}
        <path d="M30 480 C 45 385, 120 350, 200 350 C 280 350, 355 385, 370 480 Z" fill={PULLI} stroke={P.ink} strokeWidth="7" />
        <path d="M30 480 C 45 385, 120 350, 200 350 C 280 350, 355 385, 370 480 Z" fill={`url(#${id}-pulli)`} />
        <path d="M160 352 L200 410 L240 352" fill={P.weiss} stroke={P.ink} strokeWidth="6" strokeLinejoin="round" />
        <rect x="172" y="300" width="56" height="60" fill={HAUT} stroke={P.ink} strokeWidth="6" />
        {/* Ohr links */}
        <ellipse cx="106" cy="232" rx="20" ry="30" fill={HAUT} stroke={P.ink} strokeWidth="6" />
        {/* Gesicht, leicht zur Seite gedreht */}
        <path d="M110 190 C 110 120, 160 95, 205 95 C 265 95, 300 135, 300 200 C 300 230, 312 245, 304 262 C 300 300, 262 335, 205 335 C 150 335, 112 295, 110 245 Z" fill={HAUT} stroke={P.ink} strokeWidth="7" />
        <path d="M110 190 C 110 120, 160 95, 205 95 C 265 95, 300 135, 300 200 C 300 230, 312 245, 304 262 C 300 300, 262 335, 205 335 C 150 335, 112 295, 110 245 Z" fill={`url(#${id}-haut)`} />
        {/* Haare */}
        {locken.map(([cx, cy, r, grauLocke], i) => <circle key={i} cx={cx} cy={cy} r={r} fill={grauLocke ? GRAU : HAAR} stroke={P.ink} strokeWidth="5" />)}
        {locken.filter((_, i) => i % 3 === 0).map(([cx, cy, r], i) => <path key={`g${i}`} d={`M${cx - r * 0.5} ${cy - r * 0.2} q ${r * 0.4} ${-r * 0.5} ${r * 0.8} 0`} fill="none" stroke={P.himmel} strokeWidth="3.5" strokeLinecap="round" />)}
        {/* Augenbrauen */}
        <path d="M140 178 q 26 -14 52 -4" fill="none" stroke={HAAR} strokeWidth="9" strokeLinecap="round" />
        <path d="M222 174 q 26 -10 50 4" fill="none" stroke={HAAR} strokeWidth="9" strokeLinecap="round" />
        {/* Brille */}
        <circle cx="168" cy="214" r="34" fill="rgba(127,211,255,.25)" stroke={P.ink} strokeWidth="7" />
        <circle cx="250" cy="212" r="34" fill="rgba(127,211,255,.25)" stroke={P.ink} strokeWidth="7" />
        <path d="M202 212 q 7 -7 14 0 M134 210 L112 206" fill="none" stroke={P.ink} strokeWidth="6" />
        <path d="M150 196 l14 -10 M232 194 l14 -10" stroke={P.weiss} strokeWidth="5" strokeLinecap="round" />
        <circle cx="174" cy="218" r="7" fill={P.ink} /><circle cx="256" cy="216" r="7" fill={P.ink} />
        {/* Fältchen um die 50 */}
        <path d="M286 222 l14 4 M286 232 l12 8" stroke={P.ink} strokeWidth="3.5" strokeLinecap="round" />
        {/* Nase und Mund */}
        <path d="M214 228 C 222 252, 236 262, 222 270 L208 270" fill="none" stroke={P.ink} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        {spricht ? <ellipse cx="212" cy="300" rx="22" ry="13" fill={P.rot} stroke={P.ink} strokeWidth="6" /> : <path d="M188 298 q 24 10 48 -2" fill="none" stroke={P.ink} strokeWidth="6" strokeLinecap="round" />}
      </svg>
    </div>
  );
};

/** Luhmann als Geist: weisses Laken mit runder Brille, hält seinen Zettelkasten. schwebe: Bild für das sanfte Auf und Ab */
export const Geist: React.FC<{ x: number; y: number; massstab?: number; schwebe: number; opacity?: number; spiegeln?: boolean }> = ({ x, y, massstab = 1, schwebe, opacity = 1, spiegeln = false }) => {
  const dy = Math.sin(schwebe / 14) * 14, saum = Math.sin(schwebe / 6) * 6;
  const unten = `Q 210 ${282 + saum} 190 300 Q 170 ${282 - saum} 150 300 Q 130 ${282 + saum} 110 300 Q 90 ${282 - saum} 70 300 Q 50 ${282 + saum} 30 300`;
  return (
    <div style={{ position: "absolute", left: x, top: y + dy, width: 260 * massstab, height: 330 * massstab, opacity, transform: spiegeln ? "scaleX(-1)" : undefined }}>
      <svg width={260 * massstab} height={330 * massstab} viewBox="0 0 260 330" style={{ overflow: "visible" }}>
        <defs><Punktmuster id="geist-schatten" farbe="rgba(23,71,201,.35)" r={2.4} a={9} /><clipPath id="geist-rechts"><rect x="140" y="0" width="140" height="330" /></clipPath></defs>
        <path d={`M30 300 C 30 120, 60 30, 130 30 C 200 30, 230 120, 230 300 ${unten} Z`} fill={P.weiss} stroke={P.ink} strokeWidth="7" strokeLinejoin="round" />
        <path d={`M30 300 C 30 120, 60 30, 130 30 C 200 30, 230 120, 230 300 ${unten} Z`} fill="url(#geist-schatten)" clipPath="url(#geist-rechts)" />
        <ellipse cx="100" cy="118" rx="13" ry="20" fill={P.ink} /><ellipse cx="160" cy="118" rx="13" ry="20" fill={P.ink} />
        <circle cx="100" cy="118" r="28" fill="none" stroke={P.ink} strokeWidth="5" /><circle cx="160" cy="118" r="28" fill="none" stroke={P.ink} strokeWidth="5" />
        <path d="M128 116 h4" stroke={P.ink} strokeWidth="5" />
        {/* Zettelkasten */}
        <rect x="70" y="188" width="120" height="76" fill="#b5713a" stroke={P.ink} strokeWidth="6" />
        <rect x="78" y="176" width="104" height="18" fill={P.weiss} stroke={P.ink} strokeWidth="4" />
        <rect x="112" y="214" width="36" height="12" rx="4" fill={P.ink} />
      </svg>
    </div>
  );
};

/** Karteikarte mit einer Zettelnummer */
export const Zettel: React.FC<{ x: number; y: number; nummer: string; drehung?: number; p?: number; breite?: number }> = ({ x, y, nummer, drehung = 0, p = 1, breite = 190 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: breite, height: breite * 0.62, background: P.weiss, border: `5px solid ${P.ink}`, boxSizing: "border-box", transform: `scale(${p}) rotate(${drehung}deg)`, padding: "8px 12px" }}>
    <div style={{ height: 5, background: P.rot, marginBottom: 10 }} />
    <div style={fett(breite * 0.2, { fontFamily: "Newsreader, serif", fontWeight: 500 })}>{nummer}</div>
    {[0, 1].map((i) => <div key={i} style={{ height: 4, marginTop: 8, background: "#00000022", width: `${80 - i * 25}%` }} />)}
  </div>
);
