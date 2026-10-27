// ORNAMENT LAB · Video – ein Bild des Films zeichnen, für die Vorschau und den Export dasselbe: was bildBei() (kern/folge.js) aus dem
// OpenFilm-Film liest, von unten nach oben, jeder Clip in seinem Kasten (object-fit wie in CSS: füllen oder einpassen), mit Deckkraft und
// Filter. Filter mit ctx.filter, wo der Browser es kann (Chrome, Edge, Firefox); sonst die Farbmatrizen aus kern/filter.js auf den Pixeln.
import { zeichneTitel } from "../kern/titel.js";
import { farbeAnwenden } from "../kern/filter.js";

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
    ctx.drawImage(q, dx, dy, dw, dh);
    ctx.restore();
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
