// ORNAMENT LAB – Bilddaten ohne DOM. Ein Bild ist hier immer { width, height, data: Uint8ClampedArray (RGBA) }, genau wie ImageData,
// damit dieselben Operationen im Browser (ImageData) und in Node (Tests) laufen. Alle Funktionen sind rein: sie verändern ihre Eingabe nie.

export const NACHT = [21, 20, 18];   // der dunkle Grund von The Fictory (zeichnen.js, NACHT #151412)

export function neuesBild(width, height, grund = null) {
  const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
  const data = new Uint8ClampedArray(w * h * 4);
  if (grund) for (let i = 0; i < data.length; i += 4) { data[i] = grund[0]; data[i + 1] = grund[1]; data[i + 2] = grund[2]; data[i + 3] = 255; }
  return { width: w, height: h, data };
}

export const kopie = (b) => ({ width: b.width, height: b.height, data: new Uint8ClampedArray(b.data) });

export function istBild(b) {
  return Boolean(b && Number.isInteger(b.width) && Number.isInteger(b.height) && b.width > 0 && b.height > 0 && b.data?.length === b.width * b.height * 4);
}

/** Bild als Gleitkommafelder (0–1) je Kanal, für Rechnungen über viele Durchgänge (Feedback) */
export function alsFelder(b) {
  const n = b.width * b.height, r = new Float32Array(n), g = new Float32Array(n), bl = new Float32Array(n);
  for (let i = 0, j = 0; i < n; i++, j += 4) { r[i] = b.data[j] / 255; g[i] = b.data[j + 1] / 255; bl[i] = b.data[j + 2] / 255; }
  return { w: b.width, h: b.height, r, g, b: bl };
}

export function ausFeldern(f) {
  const out = neuesBild(f.w, f.h);
  for (let i = 0, j = 0; i < f.w * f.h; i++, j += 4) {
    out.data[j] = f.r[i] * 255; out.data[j + 1] = f.g[i] * 255; out.data[j + 2] = f.b[i] * 255; out.data[j + 3] = 255;
  }
  return out;
}

/** Randbehandlung beim Abtasten: spiegeln (Kaleidoskop-artig), wiederholen oder Grund */
export function randKoordinate(v, n, art) {
  if (art === "wiederholen") return ((v % n) + n) % n;
  if (art === "spiegeln") { const p = 2 * n; let m = ((v % p) + p) % p; if (m >= n) m = p - 1 - m; return m; }
  return v;   // "grund": ausserhalb bleibt ausserhalb, der Aufrufer entscheidet
}

/** bilinear abgetastet aus Feldern; ausserhalb bei Rand "grund" → null */
export function tasteFeld(f, x, y, rand, aus) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  if (rand === "grund" && (x0 < 0 || y0 < 0 || x0 + 1 >= f.w || y0 + 1 >= f.h)) return false;
  const xa = randKoordinate(x0, f.w, rand), xb = randKoordinate(x0 + 1, f.w, rand), ya = randKoordinate(y0, f.h, rand), yb = randKoordinate(y0 + 1, f.h, rand);
  const a = ya * f.w + xa, b = ya * f.w + xb, c = yb * f.w + xa, d = yb * f.w + xb;
  const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
  aus[0] = f.r[a] * w00 + f.r[b] * w10 + f.r[c] * w01 + f.r[d] * w11;
  aus[1] = f.g[a] * w00 + f.g[b] * w10 + f.g[c] * w01 + f.g[d] * w11;
  aus[2] = f.b[a] * w00 + f.b[b] * w10 + f.b[c] * w01 + f.b[d] * w11;
  return true;
}

/** auf eine längste Seite verkleinern (Flächenmittel, nie vergrössern) */
export function begrenzen(b, laengste) {
  const f = laengste / Math.max(b.width, b.height);
  if (f >= 1) return b;
  return skalieren(b, Math.max(1, Math.round(b.width * f)), Math.max(1, Math.round(b.height * f)));
}

/** auf feste Grösse bringen (Kastenfilter beim Verkleinern, bilinear beim Vergrössern) */
export function skalieren(b, w, h) {
  const out = neuesBild(w, h);
  const sx = b.width / w, sy = b.height / h;
  for (let y = 0; y < h; y++) {
    const y0 = y * sy, y1 = Math.max(y0 + 1e-6, (y + 1) * sy);
    for (let x = 0; x < w; x++) {
      const x0 = x * sx, x1 = Math.max(x0 + 1e-6, (x + 1) * sx);
      let r = 0, g = 0, bl = 0, a = 0, n = 0;
      for (let yy = Math.floor(y0); yy < Math.min(b.height, Math.ceil(y1)); yy++) for (let xx = Math.floor(x0); xx < Math.min(b.width, Math.ceil(x1)); xx++) {
        const j = (yy * b.width + xx) * 4;
        r += b.data[j]; g += b.data[j + 1]; bl += b.data[j + 2]; a += b.data[j + 3]; n++;
      }
      const o = (y * w + x) * 4;
      if (!n) { const j = (Math.min(b.height - 1, Math.floor(y0)) * b.width + Math.min(b.width - 1, Math.floor(x0))) * 4; out.data.set(b.data.subarray(j, j + 4), o); continue; }
      out.data[o] = r / n; out.data[o + 1] = g / n; out.data[o + 2] = bl / n; out.data[o + 3] = a / n;
    }
  }
  return out;
}

export const luminanz = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** Farbdrehung um die Grauachse (Winkel in Grad) als 3 × 3-Matrix, wie hue-rotate in CSS-Filtern (Filter Effects Level 1) */
export function farbdrehung(grad) {
  const a = (grad * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.140, 0.072 - c * 0.072 - s * 0.283,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
  ];
}

/** SHA-256 als Hex (Browser und Node haben crypto.subtle) */
export async function sha256(bytes) {
  const h = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** kurzer, stabiler Fingerabdruck der Pixel (FNV-1a über Stichproben) – für Tests der Reproduzierbarkeit */
export function fingerabdruck(b) {
  let h = 0x811c9dc5;
  const schritt = Math.max(1, Math.floor(b.data.length / 4096));
  for (let i = 0; i < b.data.length; i += schritt) { h ^= b.data[i]; h = Math.imul(h, 0x01000193) >>> 0; }
  return `${b.width}x${b.height}:${h.toString(16).padStart(8, "0")}`;
}
