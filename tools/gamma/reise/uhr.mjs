import { createRequire } from "node:module"; import { join } from "node:path"; import fs from "node:fs"; import { fileURLToPath } from "node:url";
export const { chromium } = createRequire(import.meta.url)(join(process.env.NODE_PATH, "playwright"));
export const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
export const FPS = 30, DT = 1000 / FPS;
// Format: 16:9 → 1280 × 720 bei 1,5 (1920 × 1080), 4:5 → 864 × 1080 bei 1,25 (1080 × 1350)
export const FORMAT = process.env.FORMAT === "4x5" ? { w: 864, h: 1080, dpr: 1.25 } : { w: 1280, h: 720, dpr: 1.5 };

// Virtuelle Uhr: performance.now, Date.now, rAF, Timer, CSS/WAAPI-Animationen und Videos laufen nur mit __schritt(ms)
const UHR = () => {
  let now = 0, erst = true; const base = Date.now();
  performance.now = () => now; Date.now = () => base + now;
  let seed = 7; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  let rq = [], rid = 1, tq = [], tid = 1;
  window.requestAnimationFrame = cb => { const id = rid++; rq.push([id, cb]); return id; };
  window.cancelAnimationFrame = id => { rq = rq.filter(e => e[0] !== id); };
  window.setTimeout = (fn, ms, ...a) => { const id = tid++; tq.push({ id, at: now + (+ms || 0), fn, a }); return id; };
  window.setInterval = (fn, ms, ...a) => { const id = tid++; tq.push({ id, at: now + Math.max(1, +ms || 0), iv: Math.max(1, +ms || 0), fn, a }); return id; };
  window.clearTimeout = window.clearInterval = id => { tq = tq.filter(t => t.id !== id); };
  const play = HTMLMediaElement.prototype.play, pause = HTMLMediaElement.prototype.pause;
  HTMLMediaElement.prototype.play = function () { this.__spielt = true; return Promise.resolve(); };
  HTMLMediaElement.prototype.pause = function () { this.__spielt = false; pause.call(this); };
  window.__jetzt = () => now;
  window.__schritt = async (dt) => {
    now += dt;
    for (;;) {
      let d = null; for (const t of tq) if (t.at <= now && (!d || t.at < d.at)) d = t;
      if (!d) break;
      if (d.iv) d.at += d.iv; else tq.splice(tq.indexOf(d), 1);
      try { typeof d.fn === "function" ? d.fn(...d.a) : 0; } catch (e) { console.error(e); }
    }
    for (const a of document.getAnimations()) {
      if (!a.__v) { a.__v = true; if (erst) a.currentTime = 0; a.pause(); continue; }
      if (a.playState !== "paused") continue;
      const end = a.effect ? a.effect.getComputedTiming().endTime : Infinity, ct = (a.currentTime || 0) + dt;
      if (isFinite(end) && ct >= end) { a.play(); a.finish(); } else a.currentTime = ct;
    }
    erst = false;
    const q = rq; rq = []; for (const [, cb] of q) { try { cb(now); } catch (e) { console.error(e); } }
    const seeks = [];
    for (const v of document.querySelectorAll("video")) if (v.__spielt && v.readyState >= 1 && v.duration) {
      v.currentTime = (v.currentTime + dt / 1000) % v.duration;
      seeks.push(new Promise(r => { v.addEventListener("seeked", r, { once: true }); setTimeout.call(window, r, 0); }));
    }
    if (seeks.length) await Promise.race([Promise.all(seeks), new Promise(r => window.__echtTimeout(r, 400))]);
  };
};

export async function start(headless = true) {
  const b = await chromium.launch({ channel: "msedge", headless });
  const ctx = await b.newContext({ viewport: { width: FORMAT.w, height: FORMAT.h }, deviceScaleFactor: FORMAT.dpr });
  await ctx.addInitScript(`window.__echtTimeout = window.setTimeout.bind(window); (${UHR})();`);
  // gamma mit Haken: Modulvariablen nach window.__g; die Leistungsmessung schaltet nie herunter (die virtuelle Uhr läuft mit 1/30 s)
  await ctx.route("**/gamma/", async r => {
    let h = fs.readFileSync(join(ROOT, "gamma/index.html"), "utf8");
    h = h.replace("leistung.schnitt > .03", "leistung.schnitt > 9");
    const i = h.lastIndexOf("</script>");
    h = h.slice(0, i) + "\nwindow.__g = { bahn, zustand, kapitel, intro, setzeFlach, zuKapitel, leistung, U_START, U_LOGO, ZETTEL, get flach() { return flach; } };\n" + h.slice(i);
    r.fulfill({ body: h, contentType: "text/html; charset=utf-8" });
  });
  const p = await ctx.newPage();
  const fehler = []; p.on("pageerror", e => fehler.push(e.message)); p.on("console", m => { if (m.type() === "error") fehler.push(m.text()); });
  const cdp = await ctx.newCDPSession(p);
  return { b, ctx, p, cdp, fehler };
}
let nr = 0;
export async function bild(w, ordner) {
  const pos = await w.p.evaluate(async dt => { await window.__schritt(dt); return [scrollX, scrollY]; }, DT);
  if (!ordner) return;
  const { data } = await w.cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 93, captureBeyondViewport: false, clip: { x: pos[0], y: pos[1], width: FORMAT.w, height: FORMAT.h, scale: FORMAT.dpr } });
  fs.mkdirSync(ordner, { recursive: true });
  fs.writeFileSync(`${ordner}/${String(nr++).padStart(5, "0")}.jpg`, Buffer.from(data, "base64"));
}
export function neuerOrdner() { nr = 0; }
export const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
export const sanft = p => p * p * (3 - 2 * p);
