// ORNAMENT LAB – Optische Verzerrung (räumliche Operation, seit Lab 0.1.10). Übertragen aus den Verzerrungsfiltern der Bildbearbeitung
// (Strudel, Wölben, Wellen, Versetzen in Photoshop und GIMP), dem Displace TOP in TouchDesigner (ein zweites Bild verschiebt das erste)
// und dem Kaleidoskop als Spiegelung um einen Punkt. Nur die dokumentierten Prinzipien, kein Code.
//
// Jede Art ist eine Abbildung vom Zielpixel zurück auf eine Stelle der Quelle (inverse Abbildung, bilinear abgetastet):
//   Wirbel        Drehung, die zur Mitte hin zunimmt             Linse        Radius hoch einem Exponenten (wölben oder einschnüren)
//   Welle         Sinusversatz quer zu Zeilen und Spalten         Versetzen    Helligkeit eines Bildes schiebt in eine Richtung
//   Kaleidoskop   Winkel um die Mitte in gespiegelte Segmente gefaltet
// «Versetzen» nimmt ohne zweites Bild das eigene: das Bild verschiebt sich an sich selbst (strukturelle Kopplung im Kleinen).
import { alsFelder, tasteFeld, luminanz, NACHT } from "../kern/bilddaten.js";
import { bildfilter, gemeinsameParameter, zahl, wahl } from "./bildfilter.js";

/** Helligkeit eines Bildes, auf W × H abgetastet (nächstes Pixel) */
function helligkeitAuf(b, W, H) {
  const L = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    const yy = Math.min(b.height - 1, Math.floor(((y + 0.5) * b.height) / H));
    for (let x = 0; x < W; x++) {
      const j = (yy * b.width + Math.min(b.width - 1, Math.floor(((x + 0.5) * b.width) / W))) * 4;
      L[y * W + x] = luminanz(b.data[j], b.data[j + 1], b.data[j + 2]) / 255;
    }
  }
  return L;
}

export function verzerrung(bild, p, steuerbild = null) {
  const f = alsFelder(bild), W = f.w, H = f.h;
  const out = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4) }, o = out.data;
  const cx = p.mitteX * W, cy = p.mitteY * H, R = Math.max(1, (p.radius * Math.hypot(W, H)) / 2), s = p.staerke;
  const ph = (p.phase * Math.PI) / 180, px = [0, 0, 0];
  const L = p.art === "versetzen" ? helligkeitAuf(steuerbild ?? bild, W, H) : null;
  const weite = s * 0.15 * Math.max(W, H), dirX = Math.cos(ph), dirY = Math.sin(ph);
  const amp = s * 0.06 * Math.min(W, H), kx = (2 * Math.PI * p.frequenz) / W, ky = (2 * Math.PI * p.frequenz) / H;
  const exponent = s >= 0 ? 1 + 2 * s : 1 / (1 - 2 * s), seg = (2 * Math.PI) / Math.round(p.segmente), zoom = 2 ** -s;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy);
      let sx = x, sy = y;
      switch (p.art) {
        case "wirbel": if (r < R) { const t = 1 - r / R, a = s * 2 * Math.PI * t * t, c = Math.cos(a), si = Math.sin(a); sx = cx + c * dx - si * dy - 0.5; sy = cy + si * dx + c * dy - 0.5; } break;
        case "linse": if (r < R && r > 0) { const k = (R * (r / R) ** exponent) / r; sx = cx + dx * k - 0.5; sy = cy + dy * k - 0.5; } break;
        case "welle": sx = x + amp * Math.sin(ky * y + ph); sy = y + amp * Math.sin(kx * x + ph); break;
        case "versetzen": { const v = (L[y * W + x] - 0.5) * 2 * weite; sx = x + dirX * v; sy = y + dirY * v; break; }
        case "kaleidoskop": {
          let a = Math.atan2(dy, dx) - ph;
          a = ((a % seg) + seg) % seg;
          if (a > seg / 2) a = seg - a;
          const rr = r * zoom;
          sx = cx + rr * Math.cos(a + ph) - 0.5; sy = cy + rr * Math.sin(a + ph) - 0.5;
          break;
        }
      }
      const i = (y * W + x) * 4;
      if (tasteFeld(f, sx, sy, p.rand, px)) { o[i] = px[0] * 255; o[i + 1] = px[1] * 255; o[i + 2] = px[2] * 255; }
      else { o[i] = NACHT[0]; o[i + 1] = NACHT[1]; o[i + 2] = NACHT[2]; }
      o[i + 3] = 255;
    }
  }
  return { bild: out, protokoll: { art: p.art, mitte: [Math.round(cx), Math.round(cy)], radiusPx: Math.round(R), steuerbild: Boolean(steuerbild) } };
}

export const verzerrungOperation = bildfilter({
  id: "lab.verzerrung",
  // ausgemustert (27. Oktober 2026, Wunsch: «Verzerrung und Tuch kann auch weg»): nicht mehr wählbar, bleibt im Register für gespeicherte
  // Projekte (kern/register.js)
  ausgemustert: "27. Oktober 2026",
  name: "Optische Verzerrung",
  version: "0.1.0",
  klasse: "raeumlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Verzerrungsfilter der Bildbearbeitung (Strudel, Wölben, Wellen, Versetzen in Photoshop und GIMP); TouchDesigner Displace TOP; Kaleidoskop", datei: "alpha/lab/operationen/verzerrung.js" },
  beschreibung: "Verzieht das Bild als Wirbel, Linse, Welle, Kaleidoskop oder versetzt es nach der Helligkeit eines Bildes: des eigenen oder eines zweiten, das dann das erste steuert.",
  moduliert: "staerke",
  titel: "Verzerrung",
  eingaenge: [{ name: "bild", typ: "IMAGE" }, { name: "steuerbild", typ: "IMAGE", optional: true, vorwaehlen: false }],
  parameter: [
    wahl("art", "Art", "wirbel", [["wirbel", "Wirbel"], ["linse", "Linse (wölben/einschnüren)"], ["welle", "Welle"], ["versetzen", "Versetzen nach Helligkeit"], ["kaleidoskop", "Kaleidoskop"]]),
    zahl("staerke", "Stärke", -1, 1, 0.5, 0.01, "negativ kehrt die Richtung um (Linse: einschnüren, Kaleidoskop: heranholen)"),
    zahl("radius", "Radius (Wirbel, Linse)", 0.05, 1.5, 0.7, 0.01, "Anteil der halben Bilddiagonale"),
    zahl("mitteX", "Mitte waagrecht", 0, 1, 0.5, 0.01),
    zahl("mitteY", "Mitte senkrecht", 0, 1, 0.5, 0.01),
    zahl("frequenz", "Wellen über das Bild", 1, 40, 6, 0.5),
    zahl("phase", "Phase / Richtung (°)", -180, 180, 0, 1, "Welle: Phase, Versetzen: Richtung, Kaleidoskop: Drehung der Segmente"),
    zahl("segmente", "Segmente (Kaleidoskop)", 2, 24, 6, 1),
    wahl("rand", "Rand", "spiegeln", [["spiegeln", "spiegeln"], ["wiederholen", "wiederholen"], ["grund", "dunkler Grund"]]),
    ...gemeinsameParameter(),
  ],
  ressourcen: { zeit: "ein Durchgang mit bilinearer Abtastung (1200 px: unter 0,5 s)", speicher: "ein Gleitkommabild" },
  rechne: ({ bild, steuerbild }, p) => verzerrung(bild, p, steuerbild),
});
