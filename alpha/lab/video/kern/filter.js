// ORNAMENT LAB · Video – Filter eines Clips als CSS (wie OpenFilm sie in film.html schreibt: style="filter: …") und dieselben Filter als
// Farbmatrizen nach der Spezifikation (W3C Filter Effects Module Level 1, §13: brightness, contrast, saturate, hue-rotate, sepia, grayscale).
// Die Vorschau und der Export zeichnen mit ctx.filter, wo der Browser es kann; sonst rechnet farbeAnwenden() die Matrizen auf den Pixeln
// (ohne Unschärfe). Ohne DOM.

/** die Regler: Name, Bereich, neutraler Wert, CSS-Funktion und Einheit, in der Reihenfolge, in der sie wirken */
export const REGLER = Object.freeze([
  { id: "helligkeit", name: "Helligkeit", min: 0.3, max: 2, neutral: 1, schritt: 0.01, css: "brightness" },
  { id: "kontrast", name: "Kontrast", min: 0.3, max: 2, neutral: 1, schritt: 0.01, css: "contrast" },
  { id: "saettigung", name: "Sättigung", min: 0, max: 2.5, neutral: 1, schritt: 0.01, css: "saturate" },
  { id: "farbton", name: "Farbton (°)", min: -180, max: 180, neutral: 0, schritt: 1, css: "hue-rotate", einheit: "deg" },
  { id: "sepia", name: "Wärme (Sepia)", min: 0, max: 1, neutral: 0, schritt: 0.01, css: "sepia" },
  { id: "grau", name: "Schwarzweiss", min: 0, max: 1, neutral: 0, schritt: 0.01, css: "grayscale" },
  { id: "unschaerfe", name: "Unschärfe (px)", min: 0, max: 20, neutral: 0, schritt: 0.5, css: "blur", einheit: "px" },
]);

export const VORLAGEN = Object.freeze({
  natuerlich: { name: "Natürlich", werte: {} },
  film: { name: "Film", werte: { helligkeit: 1.02, kontrast: 1.08, saettigung: 0.85, sepia: 0.12 } },
  noir: { name: "Noir", werte: { helligkeit: 0.95, kontrast: 1.35, grau: 1 } },
  warm: { name: "Warm", werte: { saettigung: 1.15, farbton: -8, sepia: 0.25 } },
  kuehl: { name: "Kühl", werte: { helligkeit: 1.03, saettigung: 0.9, farbton: 12 } },
  verblasst: { name: "Verblasst", werte: { helligkeit: 1.08, kontrast: 0.82, saettigung: 0.7 } },
  kraeftig: { name: "Kräftig", werte: { kontrast: 1.15, saettigung: 1.4 } },
  nacht: { name: "Nacht", werte: { helligkeit: 0.8, kontrast: 1.2, saettigung: 0.6, farbton: 20 } },
  traum: { name: "Traum", werte: { helligkeit: 1.08, saettigung: 1.2, unschaerfe: 1.5 } },
});

const zahl = (x) => String(Math.round(x * 1000) / 1000);
/** alle Werte eines Filters: die Vorlage, darüber die eigenen Regler */
export function werteVon(filter = {}) {
  const v = { ...(VORLAGEN[filter.vorlage]?.werte ?? {}), ...(filter.werte ?? {}) };
  return Object.fromEntries(REGLER.map((r) => [r.id, Math.min(r.max, Math.max(r.min, Number.isFinite(v[r.id]) ? v[r.id] : r.neutral))]));
}

/** CSS für film.html und ctx.filter, ohne die neutralen Regler; "" ohne Filter */
export function filterCss(filter = {}) {
  const v = werteVon(filter), teile = REGLER.filter((r) => Math.abs(v[r.id] - r.neutral) > 1e-6).map((r) => `${r.css}(${zahl(v[r.id])}${r.einheit ?? ""})`);
  return teile.length ? `filter: ${teile.join(" ")}` : "";
}
/** nur der Wert der Eigenschaft (für ctx.filter): "none" ohne Filter */
export const filterWert = (filter) => filterCss(filter).replace(/^filter: /, "") || "none";

/** die Farbmatrizen (3 × 3 und Verschiebung) der Regler ohne Unschärfe, in ihrer Reihenfolge; jeder Schritt wird auf 0–1 begrenzt wie in CSS */
export function matrizen(filter = {}) {
  const v = werteVon(filter), out = [];
  const diag = (s, o = 0) => ({ m: [s, 0, 0, 0, s, 0, 0, 0, s], o });
  if (v.helligkeit !== 1) out.push(diag(v.helligkeit));
  if (v.kontrast !== 1) out.push(diag(v.kontrast, 0.5 - 0.5 * v.kontrast));
  if (v.saettigung !== 1) {
    const s = v.saettigung;
    out.push({ m: [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s], o: 0 });
  }
  if (v.farbton !== 0) {
    const a = (v.farbton * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    out.push({ m: [0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
      0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
      0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072], o: 0 });
  }
  if (v.sepia !== 0) {
    const k = 1 - v.sepia;
    out.push({ m: [0.393 + 0.607 * k, 0.769 - 0.769 * k, 0.189 - 0.189 * k, 0.349 - 0.349 * k, 0.686 + 0.314 * k, 0.168 - 0.168 * k, 0.272 - 0.272 * k, 0.534 - 0.534 * k, 0.131 + 0.869 * k], o: 0 });
  }
  if (v.grau !== 0) {
    const k = 1 - v.grau;
    out.push({ m: [0.2126 + 0.7874 * k, 0.7152 - 0.7152 * k, 0.0722 - 0.0722 * k, 0.2126 - 0.2126 * k, 0.7152 + 0.2848 * k, 0.0722 - 0.0722 * k, 0.2126 - 0.2126 * k, 0.7152 - 0.7152 * k, 0.0722 + 0.9278 * k], o: 0 });
  }
  return out;
}

/** die Farbmatrizen auf RGBA-Pixel (Uint8ClampedArray) anwenden, an Ort und Stelle; über eine Tabelle je Kanal, wo es nur Skalierungen sind */
export function farbeAnwenden(daten, filter = {}) {
  const ms = matrizen(filter);
  if (!ms.length) return daten;
  const c = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  for (let i = 0; i < daten.length; i += 4) {
    let r = daten[i] / 255, g = daten[i + 1] / 255, b = daten[i + 2] / 255;
    for (const { m, o } of ms) {
      const r2 = c(m[0] * r + m[1] * g + m[2] * b + o), g2 = c(m[3] * r + m[4] * g + m[5] * b + o), b2 = c(m[6] * r + m[7] * g + m[8] * b + o);
      r = r2; g = g2; b = b2;
    }
    daten[i] = r * 255; daten[i + 1] = g * 255; daten[i + 2] = b * 255;   // Uint8ClampedArray rundet selbst
  }
  return daten;
}
