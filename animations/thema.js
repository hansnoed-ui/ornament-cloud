// Animationen – Schalter Hell / Dunkel (Wunsch vom 8. November 2026, mit Video als Vorbild, gesichert im Projekt unter
// webdesigns/schalter-hell-dunkel-pixel.mp4): ein Schiebeschalter im Kopf der Seite. Der Knopf trägt ein Pixelbild, hell eine Sonne,
// dunkel einen Mond mit Stern; beim Umschalten zerstieben die Pixel und setzen sich zum anderen Zeichen zusammen, ein leuchtender
// Bogen läuft um den Knopf (hell bernstein, dunkel blauviolett), und die Seite wechselt in einem Kreis vom Schalter aus.
// Die Wahl steht in <html data-thema="hell|dunkel"> und im Browser (localStorage); ohne Wahl gilt die Einstellung des Geräts.
// Das kleine Skript im <head> von index.html setzt data-thema vor dem ersten Bild, damit nichts aufblitzt.
import { t } from "./sprache.js?v=33";
// die Mechanik des Schalters (Pixel, Bogen, Kreis) liegt seit dem Multiverse (8. November 2026) als Baustein in assets/pixel-schalter.js
import { pixelSchalter, kreisWechsel } from "../assets/pixel-schalter.js?v=1";

export const SCHLUESSEL = "animationen-thema";
const N = 13;                         // Pixelraster des Zeichens: 13 × 13
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

export function themaStarten() {
  const html = document.documentElement;
  const ort = document.querySelector(".kopf-rechts");
  if (!ort || ort.querySelector(".thema")) return;
  const metas = [...document.querySelectorAll('meta[name="theme-color"]')];
  let thema = html.dataset.thema === "hell" || html.dataset.thema === "dunkel" ? html.dataset.thema : geraet();
  // an = dunkel = Mond; hell: dunkle Pixel, dunkel: fast weisse Pixel mit leisem Schein
  const knopf = pixelSchalter({
    klasse: "thema", aus: sonne(), an: mond(), anfang: thema === "dunkel", label: t("Dunkle Ansicht"),
    titel: (an) => t(an ? "Zur hellen Ansicht" : "Zur dunklen Ansicht"),
    farbe: (k) => [58 + (240 - 58) * k, 60 + (242 - 60) * k, 68 + (255 - 68) * k],
    schein: (k) => [`rgba(170, 175, 255, ${.55 * k})`, k],
  });
  ort.insertBefore(knopf, ort.querySelector(".sprachen"));

  function setzen(neu, { merkenAuch = false, animiert = true } = {}) {
    thema = neu;
    html.dataset.thema = neu;
    const farbe = neu === "dunkel" ? "#08090c" : "#eceef2";
    for (const m of metas) m.setAttribute("content", farbe);
    if (merkenAuch) merken(neu);
    knopf.setzen(neu === "dunkel", { animiert });
  }

  // die Seite wechselt in einem Kreis, der vom Schalter aus wächst (wo der Browser View Transitions kann)
  knopf.addEventListener("click", () => {
    const neu = thema === "dunkel" ? "hell" : "dunkel";
    kreisWechsel(knopf, () => setzen(neu, { merkenAuch: true }), { klasse: "thema-wechsel" });
  });
  // ohne eigene Wahl folgt die Seite dem Gerät, auch wenn es umstellt
  matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", () => { if (!gemerkt()) setzen(geraet()); });
  setzen(thema, { animiert: false });
}

if (globalThis.document) {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", themaStarten, { once: true });
  else themaStarten();
}
