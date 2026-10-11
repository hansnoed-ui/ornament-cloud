// Rechnen mit dem Ausschnitt (alles in Pixeln der Quelle) und der Grösse des Videos.
// Ohne DOM, damit tests/aufnahme.test.mjs es direkt prüfen kann.

/** Seitenverhältnisse der Formate (Breite / Höhe); «frei» hat keins */
export const FORMATE = { frei: null, "9:16": 9 / 16, "4:5": 4 / 5, "1:1": 1, "16:9": 16 / 9 };

export const MIN = 16;          // kleinste Kante des Ausschnitts
export const MAX_KANTE = 3840;  // längste Kante des Videos

/** grösstes Rechteck mit Verhältnis `v` in einem Feld von b × h, um den Punkt (mx, my) */
export function einpassen(b, h, v, mx = b / 2, my = h / 2) {
  if (!v) return { x: 0, y: 0, w: b, h };
  let w = b, hh = b / v;
  if (hh > h) { hh = h; w = h * v; }
  return verschieben({ x: mx - w / 2, y: my - hh / 2, w, h: hh }, b, h);
}

/** Rechteck ganz ins Feld schieben, Grösse bleibt */
export function verschieben(r, b, h) {
  const w = Math.min(r.w, b), hh = Math.min(r.h, h);
  return { x: klemmen(r.x, 0, b - w), y: klemmen(r.y, 0, h - hh), w, h: hh };
}

/** Ausschnitt mit neuem Verhältnis: so gross wie möglich innerhalb des bisherigen, gleiche Mitte */
export function umformen(r, b, h, v) {
  if (!v) return verschieben(r, b, h);
  const innen = einpassen(r.w, r.h, v);
  return verschieben({ x: r.x + innen.x, y: r.y + innen.y, w: innen.w, h: innen.h }, b, h);
}

/**
 * Ausschnitt aufziehen: von einem festen Punkt (ax, ay) zum Zeiger (px, py),
 * mit festem Verhältnis `v` (oder frei), nie über den Rand des Feldes b × h.
 */
export function aufziehen(ax, ay, px, py, b, h, v) {
  const sx = px < ax ? -1 : 1, sy = py < ay ? -1 : 1;
  // Platz bis zum Rand in Zugrichtung
  const raumX = sx > 0 ? b - ax : ax, raumY = sy > 0 ? h - ay : ay;
  let w = Math.min(Math.abs(px - ax), raumX), hh = Math.min(Math.abs(py - ay), raumY);
  if (v) {
    // die grössere Bewegung bestimmt, dann aufs Verhältnis bringen und in den Platz passen
    if (w / Math.max(hh, 1e-9) > v) hh = w / v; else w = hh * v;
    const f = Math.min(1, raumX / w, raumY / hh);
    w *= f; hh *= f;
  }
  const minW = v ? Math.max(MIN, MIN * v) : MIN, minH = v ? minW / v : MIN;
  w = Math.max(w, Math.min(minW, raumX)); hh = Math.max(hh, Math.min(minH, raumY));
  return { x: sx > 0 ? ax : ax - w, y: sy > 0 ? ay : ay - hh, w, h: hh };
}

/** auf ganze Pixel runden, im Feld */
export function ganz(r, b, h) {
  const x = Math.round(klemmen(r.x, 0, b - 2)), y = Math.round(klemmen(r.y, 0, h - 2));
  return { x, y, w: Math.max(2, Math.min(Math.round(r.w), b - x)), h: Math.max(2, Math.min(Math.round(r.h), h - y)) };
}

/**
 * Grösse des Videos für einen Ausschnitt w × h: «original» (Pixel des Ausschnitts) oder
 * eine Zahl für die kurze Kante (1080 → bei 9:16 also 1080 × 1920). Mit festem Verhältnis `v`
 * gilt es genau, nicht das der gerundeten Pixel. Gerade Zahlen (verlangt H.264),
 * längste Kante höchstens MAX_KANTE.
 */
export function ausgabe(w, h, groesse, v = null) {
  if (v) h = w / v;
  let f = groesse === "original" ? 1 : Number(groesse) / Math.min(w, h);
  f = Math.min(f, MAX_KANTE / Math.max(w, h));
  const gerade = (n) => Math.max(2, 2 * Math.round(n / 2));
  return { w: gerade(w * f), h: gerade(h * f) };
}

/** Bitrate in Bit/s: genug für scharfe Kanten in Animationen, zwischen 4 und 40 Mbit/s */
export function bitrate(w, h, fps) {
  return Math.round(klemmen(w * h * fps * 0.2, 4e6, 40e6));
}

/** Dateiname mit Datum und Zeit: aufnahme-2026-10-11-1432.mp4 */
export function dateiname(zeit, endung) {
  const z = (n) => String(n).padStart(2, "0");
  return `aufnahme-${zeit.getFullYear()}-${z(zeit.getMonth() + 1)}-${z(zeit.getDate())}-${z(zeit.getHours())}${z(zeit.getMinutes())}.${endung}`;
}

/** Container-Formate, die MediaRecorder kennen könnte, bevorzugt zuerst */
export const KANDIDATEN = [
  { name: "MP4 (H.264)", typ: "video/mp4;codecs=avc1.640033", endung: "mp4" },
  { name: "MP4 (H.264)", typ: "video/mp4;codecs=avc1", endung: "mp4" },
  { name: "MP4", typ: "video/mp4", endung: "mp4" },
  { name: "WebM (VP9)", typ: "video/webm;codecs=vp9", endung: "webm" },
  { name: "WebM (VP8)", typ: "video/webm;codecs=vp8", endung: "webm" },
  { name: "WebM", typ: "video/webm", endung: "webm" },
];

/** je Name die erste unterstützte Fassung */
export function formate(unterstuetzt) {
  const gesehen = new Set();
  return KANDIDATEN.filter((k) => unterstuetzt(k.typ) && !gesehen.has(k.name) && gesehen.add(k.name))
    // «MP4» ohne Codec nur, wenn es kein «MP4 (H.264)» gibt
    .filter((k, _, alle) => k.name !== "MP4" || !alle.some((a) => a.name === "MP4 (H.264)"))
    .filter((k, _, alle) => k.name !== "WebM" || !alle.some((a) => a.name.startsWith("WebM (")));
}

/** 0:07 / 1:23 */
export function dauerText(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function klemmen(n, a, b) { return Math.min(Math.max(n, a), Math.max(a, b)); }
