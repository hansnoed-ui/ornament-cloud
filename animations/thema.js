// Animationen – Schalter Hell / Dunkel (Wunsch vom 8. November 2026, mit Video als Vorbild, gesichert im Projekt unter
// webdesigns/schalter-hell-dunkel-pixel.mp4): ein Schiebeschalter im Kopf der Seite. Der Knopf trägt ein Pixelbild, hell eine Sonne,
// dunkel einen Mond mit Stern; beim Umschalten zerstieben die Pixel und setzen sich zum anderen Zeichen zusammen, ein leuchtender
// Bogen läuft um den Knopf (hell bernstein, dunkel blauviolett), und die Seite wechselt in einem Kreis vom Schalter aus.
// Die Wahl steht in <html data-thema="hell|dunkel"> und im Browser (localStorage); ohne Wahl gilt die Einstellung des Geräts.
// Das kleine Skript im <head> von index.html setzt data-thema vor dem ersten Bild, damit nichts aufblitzt.
import { t } from "./sprache.js?v=33";

export const SCHLUESSEL = "animationen-thema";
const N = 13;                         // Pixelraster des Zeichens: 13 × 13
const DAUER_MS = 720;                 // Zerstieben und Zusammensetzen
const ruhig = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const gemerkt = () => { try { return localStorage.getItem(SCHLUESSEL) ?? ""; } catch { return ""; } };
const merken = (v) => { try { localStorage.setItem(SCHLUESSEL, v); } catch { /* privat */ } };
const geraet = () => (matchMedia("(prefers-color-scheme: light)").matches ? "hell" : "dunkel");

/** die Pixel der Sonne: runder Kern und acht kurze Strahlen; [x, y, Deckkraft] */
export function sonne() {
  const p = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (Math.hypot(x - 6, y - 6) <= 2.6) p.push([x, y, 1]);
  for (const [dx, dy] of [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]) {
    const gerade = dx === 0 || dy === 0;
    for (const r of gerade ? [5, 6] : [4]) p.push([6 + dx * r, 6 + dy * r, 1]);
  }
  return p;
}

/** die Pixel des Mondes: Sichel mit ausfransendem Innenrand und ein kleiner Stern oben rechts */
export function mond() {
  const p = [];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const aussen = Math.hypot(x - 5.4, y - 6.8), innen = Math.hypot(x - 8.2, y - 4.6);
    if (aussen > 4.9) continue;
    if (innen > 4.1) p.push([x, y, 1]);
    else if (innen > 3.1 && (x + y) % 2 === 0) p.push([x, y, .38]);   // gerastertes Ausfransen wie im Vorbild
  }
  for (const [x, y, a] of [[11, 0, .9], [10, 1, .9], [11, 1, 1], [12, 1, .9], [11, 2, .9], [9, 3, .55]]) p.push([x, y, a]);
  return p;
}

/** beide Zeichen auf gleich viele Teilchen bringen: jedes Pixel der Sonne hat ein Ziel im Mond und umgekehrt */
function paare(a, b) {
  const n = Math.max(a.length, b.length), zu = (l, i) => ({ ...l[i % l.length], doppelt: i >= l.length });
  const sortiert = (l) => [...l].sort((u, v) => Math.atan2(u[1] - 6, u[0] - 6) - Math.atan2(v[1] - 6, v[0] - 6));
  const A = sortiert(a), B = sortiert(b), z = [];
  let s = 7;   // fester Zufall, damit das Zerstieben immer gleich schön aussieht
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const p = zu(A, i), q = zu(B, i);
    z.push({ a: [p[0], p[1], p.doppelt ? 0 : p[2]], b: [q[0], q[1], q.doppelt ? 0 : q[2]], w: r() * Math.PI * 2, d: 2.5 + r() * 4, v: .7 + r() * .6 });
  }
  return z;
}

const glatt = (x) => x * x * (3 - 2 * x);
const mischen = (a, b, k) => a + (b - a) * k;

function schalterBauen() {
  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.className = "thema";
  knopf.setAttribute("role", "switch");
  knopf.setAttribute("aria-label", t("Dunkle Ansicht"));
  knopf.innerHTML = '<span class="thema-bahn" aria-hidden="true"></span><span class="thema-knauf" aria-hidden="true"><canvas></canvas>'
    + '<svg class="thema-bogen" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="2" y="2" width="96" height="96" rx="30" ry="30" pathLength="100"/></svg></span>';
  return knopf;
}

export function themaStarten() {
  const html = document.documentElement;
  const ort = document.querySelector(".kopf-rechts");
  if (!ort || ort.querySelector(".thema")) return;
  const knopf = schalterBauen();
  ort.insertBefore(knopf, ort.querySelector(".sprachen"));
  const leinwand = knopf.querySelector("canvas"), g = leinwand.getContext("2d");
  const teilchen = paare(sonne(), mond());
  const metas = [...document.querySelectorAll('meta[name="theme-color"]')];

  let thema = html.dataset.thema === "hell" || html.dataset.thema === "dunkel" ? html.dataset.thema : geraet();
  let k = thema === "dunkel" ? 1 : 0;     // 0 = Sonne, 1 = Mond
  let von = k, nach = k, t0 = 0, schweben = 0, schwebenZiel = 0, bild = 0;

  function groesse() {
    const r = leinwand.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 3);
    leinwand.width = Math.max(1, Math.round(r.width * dpr)); leinwand.height = Math.max(1, Math.round(r.height * dpr));
  }

  function zeichnen(jetzt) {
    const lauf = t0 ? Math.min(1, (jetzt - t0) / (ruhig() ? 1 : DAUER_MS)) : 1;
    k = mischen(von, nach, glatt(lauf));
    schweben += (schwebenZiel - schweben) * .12;
    const W = leinwand.width, H = leinwand.height, zelle = Math.min(W, H) * .62 / N, ox = (W - zelle * N) / 2, oy = (H - zelle * N) / 2;
    const streuung = Math.sin(Math.PI * glatt(lauf)) * (t0 ? 1 : 0) + schweben * .05;
    const zeit = jetzt / 1000;
    g.clearRect(0, 0, W, H);
    // hell: dunkle Pixel; dunkel: fast weisse Pixel mit leisem Schein
    const farbe = [mischen(58, 240, k), mischen(60, 242, k), mischen(68, 255, k)].map(Math.round);
    g.shadowColor = `rgba(170, 175, 255, ${.55 * k})`;
    g.shadowBlur = zelle * 1.2 * k;
    for (const p of teilchen) {
      const x0 = mischen(p.a[0], p.b[0], glatt(k)), y0 = mischen(p.a[1], p.b[1], glatt(k));
      const a = mischen(p.a[2], p.b[2], k);
      const winkel = p.w + streuung * 2.2 + zeit * .6 * schweben;
      const x = x0 + Math.cos(winkel) * p.d * streuung * p.v, y = y0 + Math.sin(winkel) * p.d * streuung * p.v;
      const alpha = a * (1 - .35 * streuung) + .25 * streuung * Math.max(p.a[2], p.b[2]);
      if (alpha < .02) continue;
      const s = zelle * mischen(.8, .55, streuung);
      g.fillStyle = `rgba(${farbe[0]}, ${farbe[1]}, ${farbe[2]}, ${Math.min(1, alpha)})`;
      g.fillRect(ox + (x + .5) * zelle - s / 2, oy + (y + .5) * zelle - s / 2, s, s);
    }
    const weiter = lauf < 1 || Math.abs(schwebenZiel - schweben) > .005 || schwebenZiel > 0;
    if (lauf >= 1) t0 = 0;
    bild = weiter ? requestAnimationFrame(zeichnen) : 0;
  }
  const anstossen = () => { if (!bild) bild = requestAnimationFrame(zeichnen); };

  function setzen(neu, { merkenAuch = false, animiert = true } = {}) {
    thema = neu;
    html.dataset.thema = neu;
    knopf.setAttribute("aria-checked", String(neu === "dunkel"));
    knopf.title = t(neu === "dunkel" ? "Zur hellen Ansicht" : "Zur dunklen Ansicht");
    const farbe = neu === "dunkel" ? "#08090c" : "#eceef2";
    for (const m of metas) m.setAttribute("content", farbe);
    if (merkenAuch) merken(neu);
    von = k; nach = neu === "dunkel" ? 1 : 0;
    t0 = animiert && !ruhig() ? performance.now() : 0;
    if (!t0) k = nach, von = nach;
    anstossen();
  }

  function umschalten() {
    const neu = thema === "dunkel" ? "hell" : "dunkel";
    // die Seite wechselt in einem Kreis, der vom Schalter aus wächst (wo der Browser View Transitions kann)
    if (document.startViewTransition && !ruhig()) {
      const r = knopf.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      html.classList.add("thema-wechsel");
      const ue = document.startViewTransition(() => setzen(neu, { merkenAuch: true }));
      ue.ready.then(() => html.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 620, easing: "cubic-bezier(.65, 0, .35, 1)", pseudoElement: "::view-transition-new(root)" })).catch(() => {});
      ue.finished.finally(() => html.classList.remove("thema-wechsel"));
    } else setzen(neu, { merkenAuch: true });
  }

  knopf.addEventListener("click", umschalten);
  knopf.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { schwebenZiel = 1; anstossen(); } });
  knopf.addEventListener("pointerleave", () => { schwebenZiel = 0; anstossen(); });
  // ohne eigene Wahl folgt die Seite dem Gerät, auch wenn es umstellt
  matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", () => { if (!gemerkt()) setzen(geraet()); });
  new ResizeObserver(() => { groesse(); anstossen(); }).observe(leinwand);
  groesse();
  setzen(thema, { animiert: false });
}

if (globalThis.document) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", themaStarten, { once: true });
  else themaStarten();
}
