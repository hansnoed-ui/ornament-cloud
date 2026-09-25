// Die 40 Zeichen des Doppelrads: Adressen, keine Illustrationen.
//
// Eine gemeinsame Grammatik aus 8 Grundformen × 5 Abwandlungen = 40 verschiedene Zeichen.
//   Grundformen der Künstler:    Kreis · Grenze (Quadrat) · Linie · Bogen (offene Form)
//   Grundformen der Theoretiker: Raster · Kreuzung · Wiederholung · Dreieck (geschlossene Form)
//   Abwandlungen: rein · Punkt · Unterbrechung · Versatz · Überlagerung
// Person Nr. i im Ring erhält die Kombination i (Künstler 0–19, Theoretiker 20–39).

const BASES = ["kreis", "grenze", "linie", "bogen", "raster", "kreuzung", "wiederholung", "dreieck"];
const MODS = ["rein", "punkt", "unterbrechung", "versatz", "ueberlagerung"];

function f(v) { return Math.round(v * 100) / 100; }

// Grundformen in einem Feld von −1 … 1
function basePath(base) {
  switch (base) {
    case "kreis":        return "M-0.72,0a0.72,0.72 0 1,0 1.44,0a0.72,0.72 0 1,0 -1.44,0Z";
    case "grenze":       return "M-0.62,-0.62H0.62V0.62H-0.62Z";
    case "linie":        return "M0,-0.86V0.86";
    case "bogen": {      // Dreiviertelkreis, unten rechts offen
      const r = 0.72, a0 = (135 * Math.PI) / 180, a1 = (45 * Math.PI) / 180;
      return `M${f(r * Math.cos(a1))},${f(r * Math.sin(a1))}A${r},${r} 0 1,0 ${f(r * Math.cos(a0))},${f(r * Math.sin(a0))}`;
    }
    case "kreuzung":     return "M-0.7,-0.7L0.7,0.7M0.7,-0.7L-0.7,0.7";
    case "wiederholung": return "M-0.72,-0.5H0.72M-0.72,0H0.72M-0.72,0.5H0.72";
    case "dreieck":      return "M0,-0.78L0.76,0.6H-0.76Z";
    default:             return "";
  }
}

const GRID = [-0.56, 0, 0.56];

/** SVG-Markup eines Zeichens, zentriert auf 0,0 mit halber Kantenlänge `h`. */
export function symbolMarkup(index, h) {
  const base = BASES[Math.floor(index / MODS.length)];
  const mod = MODS[index % MODS.length];
  const t = `transform="scale(${h})"`;
  const parts = [];

  if (base === "raster") {
    // Raster aus 3 × 3 Punkten; Unterbrechung lässt zwei Stellen leer
    GRID.forEach((y, r) => GRID.forEach((x, c) => {
      const k = r * 3 + c;
      if (mod === "unterbrechung" && (k === 1 || k === 5)) return;
      const big = mod === "punkt" && k === 4;
      parts.push(`<circle class="sym-dot" cx="${x}" cy="${y}" r="${big ? 0.19 : 0.1}"/>`);
      if (mod === "versatz") parts.push(`<circle class="sym-dot sym-ghost" cx="${x + 0.24}" cy="${y + 0.24}" r="0.07"/>`);
    }));
  } else {
    const d = basePath(base);
    const dash = mod === "unterbrechung"
      ? ` pathLength="100" stroke-dasharray="${base === "linie" ? "40 20 40" : "58 12 30"}"`
      : "";
    parts.push(`<path class="sym-line" d="${d}"${dash}/>`);
    if (mod === "versatz") parts.push(`<path class="sym-line sym-ghost" d="${d}" transform="translate(0.24,0.24)"/>`);
    if (mod === "punkt") parts.push(`<circle class="sym-dot" cx="0" cy="0" r="0.12"/>`);
  }
  if (mod === "ueberlagerung") {
    const over = base === "kreuzung" || base === "linie" ? "M-0.92,0H0.92" : "M-0.9,0.9L0.9,-0.9";
    parts.push(`<path class="sym-line sym-over" d="${over}"/>`);
  }
  return `<g ${t}>${parts.join("")}</g>`;
}

export const SYMBOL_COUNT = BASES.length * MODS.length;   // 40
