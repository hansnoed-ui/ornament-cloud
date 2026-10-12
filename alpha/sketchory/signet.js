// «Sketchory» – das animierte Signet von ornament.cloud auf einer Leinwand (Canvas 2D).
// Dieselbe Zeichnung und derselbe Zeitplan wie das Outro aller Videos (src/videos/src/vorlage/Signet.tsx, 180 Bilder):
// die Re-entry-Schlaufe zeichnet sich, ein Punkt durchläuft sie, darunter werden Kästchen zu den Buchstaben von «ornament.cloud».
// Hier hell auf Schwarz (Linie weiss, Punkt im Rot-Orange des dunklen Modus wie in der dunklen Startanimation).
// Gezeichnet für 1080 × 1920 und, wie im Video im Format 3 : 4, um (1440 − 1920) / 2 nach oben verschoben.
import { anteil, bezier, weich, inOut } from "./ablauf.js?v=2";

export const FARBEN = { grund: "#000000", tinte: "#ffffff", punkt: "#f08a5d" };
export const SCHRIFT_FAMILIE = '"Instrument Sans", system-ui, sans-serif';

const zeichnen = bezier(0.45, 0, 0.25, 1);
const LA = 1, LB = 0.45, LK = 1.2, LOFF = -0.84;
const punkt = (t) => { const r = LB + LA * Math.cos(t); return [LK * r * Math.cos(t) + LOFF, LK * r * Math.sin(t)]; };
const N = 360;
const PUNKTE = Array.from({ length: N + 1 }, (_, i) => punkt((i / N) * Math.PI * 2));
const xs = PUNKTE.map((p) => p[0]), ys = PUNKTE.map((p) => p[1]);
const MX = (Math.min(...xs) + Math.max(...xs)) / 2, MY = (Math.min(...ys) + Math.max(...ys)) / 2;
const SPANNE = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
const MASS = 520 / SPANNE;
const bild = ([x, y]) => [540 + (x - MX) * MASS, 820 + (y - MY) * MASS];
const BAHN = PUNKTE.map(bild);
const LAENGEN = [0];
for (let i = 1; i < BAHN.length; i++) LAENGEN.push(LAENGEN[i - 1] + Math.hypot(BAHN[i][0] - BAHN[i - 1][0], BAHN[i][1] - BAHN[i - 1][1]));

const NAME = "ornament.cloud";
const KASTEN = 52, ABSTAND = 4, GROESSE = 52, GEWICHT = 400, SPERRUNG = 0.14 * GROESSE;
const zwischen = (x, a, b) => a + (b - a) * x;

/**
 * Bild f (0–179 und weiter) des Signets auf ctx zeichnen (der Grund ist schon gemalt).
 * hoehe: Bildhöhe (1440 für 3 : 4). farben: { tinte, punkt }.
 */
export function signet(ctx, f, { hoehe = 1440, farben = FARBEN } = {}) {
  const { tinte, punkt: punktFarbe } = farben;
  ctx.save();
  ctx.translate(0, (hoehe - 1920) / 2);
  // die Schlaufe zeichnet sich (14–56), Strich 3 px
  const gezeichnet = zeichnen(anteil(f, 14, 56));
  if (gezeichnet > 0) {
    const bis = gezeichnet * LAENGEN[LAENGEN.length - 1];
    ctx.beginPath();
    ctx.moveTo(...BAHN[0]);
    for (let i = 1; i < BAHN.length; i++) {
      if (LAENGEN[i] <= bis) { ctx.lineTo(...BAHN[i]); continue; }
      const t = (bis - LAENGEN[i - 1]) / (LAENGEN[i] - LAENGEN[i - 1] || 1);
      ctx.lineTo(zwischen(t, BAHN[i - 1][0], BAHN[i][0]), zwischen(t, BAHN[i - 1][1], BAHN[i][1]));
      break;
    }
    Object.assign(ctx, { strokeStyle: tinte, lineWidth: 3, lineCap: "round", lineJoin: "round" });
    ctx.stroke();
  }
  // der Punkt: ab Bild 40, eine Runde in 54 Bildern
  const lauf = Math.max(0, f - 40) / 54;
  const sicht = anteil(f, 40, 48);
  if (sicht > 0) {
    const [px, py] = bild(punkt(-Math.PI / 2 + lauf * Math.PI * 2));
    ctx.globalAlpha = sicht;
    ctx.fillStyle = punktFarbe;
    ctx.beginPath(); ctx.arc(px, py, 13, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Schriftzug: Kästchen erscheinen, aus jedem wird ein Buchstabe, dann rücken sie zusammen
  ctx.font = `${GEWICHT} ${GROESSE}px ${SCHRIFT_FAMILIE}`;
  const zusammen = inOut(anteil(f, 128, 146));
  const breiten = NAME.split("").map((z) => zwischen(zusammen, KASTEN, ctx.measureText(z).width));
  const abstand = zwischen(zusammen, ABSTAND, SPERRUNG);
  const gesamt = breiten.reduce((a, b) => a + b, 0) + (NAME.length - 1) * abstand;
  const m = ctx.measureText("o");
  const auf = m.fontBoundingBoxAscent ?? GROESSE * 0.9, ab = m.fontBoundingBoxDescent ?? GROESSE * 0.25;
  const H = KASTEN * 1.3, oben = 1175;
  let x = (1080 - gesamt) / 2;
  NAME.split("").forEach((z, i) => {
    const w = breiten[i], cx = x + w / 2, cy = oben + H / 2;
    const kasten = anteil(f, 58 + i * 2, 66 + i * 2);
    const wird = weich(anteil(f, 78 + i * 3, 92 + i * 3));
    const ka = kasten * (1 - wird);
    if (ka > 0) {
      const s = zwischen(wird, 1, 0.55), rr = zwischen(wird, 0, 18);
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(s, s);
      ctx.globalAlpha = ka;
      ctx.beginPath(); ctx.roundRect(-w / 2 + 1.5, -H / 2 + 1.5, w - 3, H - 3, Math.max(0, rr - 1.5));
      ctx.fillStyle = "rgba(255,255,255,0.078)"; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = tinte; ctx.stroke();
      ctx.restore();
    }
    if (wird > 0) {
      const s = zwischen(wird, 1.35, 1), clip = zwischen(wird, 0.5, 0);
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(s, s);
      ctx.beginPath(); ctx.rect(-w / 2 + w * clip, -H / 2 + H * clip, w * (1 - 2 * clip), H * (1 - 2 * clip)); ctx.clip();
      ctx.globalAlpha = wird;
      ctx.fillStyle = z === "." ? punktFarbe : tinte;
      ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      ctx.fillText(z, 0, (auf - ab) / 2);
      ctx.restore();
    }
    x += w + abstand;
  });
  ctx.restore();
}
