// ORNAMENT LAB · Video – ein Bild des Films zeichnen, für die Vorschau und den Export dasselbe: was bildBei() (kern/folge.js) aus dem
// OpenFilm-Film liest, von unten nach oben, jeder Clip in seinem Kasten (object-fit wie in CSS: füllen oder einpassen), mit Deckkraft und
// Filter. Filter mit ctx.filter, wo der Browser es kann (Chrome, Edge, Firefox); sonst die Farbmatrizen aus kern/filter.js auf den Pixeln.
import { zeichneTitel } from "../kern/titel.js";
import { farbeAnwenden } from "../kern/filter.js";
import { zeichneUeberlagerung } from "../kern/effekte.js";

/** eine Leinwand für die Überlagerungen (gezeichnet wie ihre Seite, dann mit ihrem Mischmodus aufgetragen) */
let lage = null;
function ebene(w, h) {
  lage ??= document.createElement("canvas");
  if (lage.width !== w || lage.height !== h) { lage.width = w; lage.height = h; }
  return lage;
}

/** Glitch auf den Pixeln eines Ausschnitts: Streifen seitlich versetzt, Rot und Blau gegeneinander verschoben */
function glitchAnwenden(ctx, x0, y0, bw, bh, g) {
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
  bw = Math.min(ctx.canvas.width - x0, Math.ceil(bw)); bh = Math.min(ctx.canvas.height - y0, Math.ceil(bh));
  if (bw < 2 || bh < 2) return;
  const bild = ctx.getImageData(x0, y0, bw, bh), d = bild.data, q = new Uint8ClampedArray(d);
  const v = Math.round(g.versatz * bw);
  for (let y = 0; y < bh; y++) {
    const s = g.streifen.find((st) => y / bh >= st.y && y / bh < st.y + st.h), dx = s ? Math.round(s.dx * bw) : 0;
    for (let x = 0; x < bw; x++) {
      const i = (y * bw + x) * 4, quelle = (sx) => (y * bw + Math.min(bw - 1, Math.max(0, sx))) * 4;
      d[i] = q[quelle(x - dx - v)]; d[i + 1] = q[quelle(x - dx) + 1]; d[i + 2] = q[quelle(x - dx + v) + 2];
    }
  }
  ctx.putImageData(bild, x0, y0);
}

/** kann ctx.filter Filter (Safari bis 17 nicht)? */
export const FILTER_DA = (() => {
  try { const c = document.createElement("canvas").getContext("2d"); c.filter = "blur(1px)"; return c.filter === "blur(1px)"; } catch { return false; }
})();

/**
 * Die Quellen der Clips: je Clip der Folge ein eigenes <video> (zwei Clips desselben Videos können zugleich sichtbar sein, etwa in
 * einer Blende), je Bild ein <img>. urls: Map Medium-Id → Objekt-URL.
 */
export class Quellen {
  constructor(urls, { stumm = true } = {}) { this.urls = urls; this.stumm = stumm; this.videos = new Map(); this.bilder = new Map(); }
  video(clipId, mediumId) {
    let v = this.videos.get(clipId);
    if (v && v.dataset.medium !== mediumId) { v.removeAttribute("src"); v.load(); this.videos.delete(clipId); v = null; }
    if (!v) {
      v = document.createElement("video");
      Object.assign(v, { muted: this.stumm, playsInline: true, preload: "auto", crossOrigin: "anonymous" });
      v.dataset.medium = mediumId;
      v.src = this.urls.get(mediumId);
      this.videos.set(clipId, v);
    }
    return v;
  }
  bild(mediumId) {
    let b = this.bilder.get(mediumId);
    if (!b) { b = new Image(); b.decoding = "async"; b.src = this.urls.get(mediumId); this.bilder.set(mediumId, b); }
    return b;
  }
  /** alle Videos anhalten, ausser denen der genannten Clips */
  anhalten(ausser = new Set()) { for (const [id, v] of this.videos) if (!ausser.has(id) && !v.paused) v.pause(); }
  schliessen() { for (const v of this.videos.values()) { v.pause(); v.removeAttribute("src"); v.load(); } this.videos.clear(); this.bilder.clear(); }
}

/** ein Video auf die Sekunde t stellen und warten, bis das Bild da ist (höchstens 4 s) */
export function suchen(v, t) {
  const ziel = Math.max(0, Math.min(t, (v.duration || Infinity) - 0.001));
  if (Math.abs(v.currentTime - ziel) < 0.0005 && v.readyState >= 2) return Promise.resolve();
  return new Promise((ok) => {
    const fertig = () => { clearTimeout(uhr); v.removeEventListener("seeked", fertig); ok(); };
    const uhr = setTimeout(fertig, 4000);
    v.addEventListener("seeked", fertig);
    v.currentTime = ziel;
  });
}
/** warten, bis ein Video oder Bild etwas zu zeigen hat */
export function bereit(q) {
  if (q instanceof HTMLImageElement) return q.complete && q.naturalWidth ? Promise.resolve() : q.decode().catch(() => {});
  if (q.readyState >= 2) return Promise.resolve();
  return new Promise((ok) => { const f = () => { q.removeEventListener("loadeddata", f); ok(); }; q.addEventListener("loadeddata", f); setTimeout(f, 5000); });
}

const groesse = (q) => (q instanceof HTMLVideoElement ? [q.videoWidth, q.videoHeight] : [q.naturalWidth, q.naturalHeight]);
const FILTER = /(?:^|;)\s*filter:\s*([^;]+)/;

/**
 * Ein Bild zeichnen. ctx in der Grösse w × h, die Bühne buehne (die Kästen sind in ihren Pixeln); dinge von bildBei(); quellen: Quellen;
 * filterVon(clipId) gibt das Filterobjekt des Clips für den Rückfall ohne ctx.filter.
 */
export function zeichnen(ctx, w, h, buehne, dinge, quellen, filterVon = () => null) {
  const k = w / buehne.w;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.filter = "none";
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
  ctx.scale(k, h / buehne.h);
  for (const d of dinge) {
    if (d.deckkraft <= 0) continue;
    if (d.art === "weiss") { ctx.globalAlpha = d.deckkraft; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, buehne.w, buehne.h); continue; }
    if (d.art === "titel") { if (d.titel) { ctx.save(); zeichneTitel(ctx, d.lokal, d.dauer, d.titel, buehne.w, buehne.h); ctx.restore(); } continue; }
    if (d.art === "ueberlagerung") {
      const e = ebene(w, h), ec = e.getContext("2d");
      ec.setTransform(1, 0, 0, 1, 0, 0); ec.clearRect(0, 0, w, h);
      zeichneUeberlagerung(ec, d.lokal, d.ueber, d.p, w, h);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = d.deckkraft; ctx.globalCompositeOperation = d.mischung;
      ctx.drawImage(e, 0, 0);
      ctx.restore();
      continue;
    }
    const q = d.art === "video" ? quellen.video(d.clip.id, d.medium.id) : quellen.bild(d.medium.id);
    const [sw, sh] = groesse(q);
    if (!sw || !sh || (q instanceof HTMLVideoElement && q.readyState < 2)) continue;
    const b = d.kasten ?? { x: 0, y: 0, w: buehne.w, h: buehne.h }, bw = b.w ?? buehne.w, bh = b.h ?? buehne.h;
    const s = /object-fit:\s*contain/.test(d.stil) ? Math.min(bw / sw, bh / sh) : Math.max(bw / sw, bh / sh);
    const dw = sw * s, dh = sh * s, dx = b.x + (bw - dw) / 2, dy = b.y + (bh - dh) / 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(b.x, b.y, bw, bh); ctx.clip();
    ctx.globalAlpha = d.deckkraft;
    const css = FILTER.exec(d.stil)?.[1]?.trim();
    if (css && FILTER_DA) ctx.filter = css;
    // die Bewegung (Ken Burns, Handkamera, Puls) um die Mitte des Kastens; der Kasten selbst schneidet zu
    const bw2 = d.bewegung;
    if (bw2 && (bw2.s !== 1 || bw2.x || bw2.y || bw2.r)) {
      const cx = b.x + bw / 2, cy = b.y + bh / 2;
      ctx.translate(cx + bw2.x * bw, cy + bw2.y * bh); ctx.rotate((bw2.r * Math.PI) / 180); ctx.scale(bw2.s, bw2.s); ctx.translate(-cx, -cy);
    }
    ctx.drawImage(q, dx, dy, dw, dh);
    ctx.restore();
    if (d.glitch && d.deckkraft > 0.05) glitchAnwenden(ctx, b.x * k, b.y * (h / buehne.h), bw * k, bh * (h / buehne.h), d.glitch);
    if (css && !FILTER_DA) {
      // Rückfall: die Farbmatrizen auf dem Ausschnitt (ohne Unschärfe); die Deckkraft ist dann schon gemischt, das Ergebnis ist eine Näherung
      const x0 = Math.max(0, Math.floor(Math.max(b.x, dx) * k)), y0 = Math.max(0, Math.floor(Math.max(b.y, dy) * (h / buehne.h)));
      const x1 = Math.min(w, Math.ceil(Math.min(b.x + bw, dx + dw) * k)), y1 = Math.min(h, Math.ceil(Math.min(b.y + bh, dy + dh) * (h / buehne.h)));
      const f = filterVon(d.clip.id);
      if (f && x1 > x0 && y1 > y0) { const bild = ctx.getImageData(x0, y0, x1 - x0, y1 - y0); farbeAnwenden(bild.data, f); ctx.putImageData(bild, x0, y0); }
    }
  }
  ctx.restore();
}
