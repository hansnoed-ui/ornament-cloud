// PHORMA III – Text als Quelle (Wunsch vom 17. Oktober 2026: Effekte «für Texte und Audiofiles»): der Text wird zu einem Bild in Filmgrösse – dunkle
// Schrift auf hellem Papier, so gross es geht, mittig. Seit 18. Oktober 2026 in einer modernen Grotesk (Wunsch: «als Schrift eine moderne
// serifenlose»): Inter Display Semibold mit knapper Laufweite, wie auf ornament.cloud; vorher Newsreader kursiv.
// Dieses Bild geht dann durch dieselbe Analyse wie ein Foto; das Gewebe nimmt die Umrisse der Buchstaben.
export const SCHRIFT = '"Inter Display", "Helvetica Neue", Arial, sans-serif';
const SCHNITT = "600";
export const PAPIER = "#f3f1ec", TINTE = "#111111";

/** Zeilen so umbrechen, dass keine breiter als breite ist */
function umbrechen(ctx, woerter, breite) {
  const zeilen = [];
  let z = "";
  for (const w of woerter) { const v = z ? `${z} ${w}` : w; if (z && ctx.measureText(v).width > breite) { zeilen.push(z); z = w; } else z = v; }
  if (z) zeilen.push(z);
  return zeilen;
}

export async function textBild(text, B, H) {
  try { await document.fonts.load(`${SCHNITT} 120px ${SCHRIFT}`); } catch { /* dann eine Ersatzschrift */ }
  const c = document.createElement("canvas"); c.width = B; c.height = H;
  const x = c.getContext("2d", { willReadFrequently: true });
  x.fillStyle = PAPIER; x.fillRect(0, 0, B, H);
  const woerter = String(text).replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!woerter.length) return c;
  let g = Math.round(H * 0.5), zeilen = [];
  for (; g > 24; g = Math.round(g * 0.92)) {
    x.font = `${SCHNITT} ${g}px ${SCHRIFT}`; x.letterSpacing = `${(-0.02 * g).toFixed(1)}px`;
    zeilen = umbrechen(x, woerter, B * 0.84);
    if (zeilen.every((z) => x.measureText(z).width <= B * 0.84) && zeilen.length * g * 1.05 <= H * 0.62) break;
  }
  x.font = `${SCHNITT} ${g}px ${SCHRIFT}`; x.letterSpacing = `${(-0.02 * g).toFixed(1)}px`; x.fillStyle = TINTE; x.textAlign = "center"; x.textBaseline = "middle";
  const y0 = H / 2 - ((zeilen.length - 1) * g * 1.05) / 2;
  zeilen.forEach((z, i) => x.fillText(z, B / 2, y0 + i * g * 1.05));
  return c;
}
