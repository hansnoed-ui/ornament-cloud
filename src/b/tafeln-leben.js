// Neubau /b/: die Tafeln der Apps leben (20. Oktober 2026, Wunsch: «bei den Apps unter ‹Was dabei herauskommt› möchte ich tolle Animationen …
// eine Art Vorstellungs- oder Erkläranimationen, stilisiert, stilvoll»). Jede <figure class="tafel-lebt" data-tafel="slug"> trägt das Ruhebild
// als <picture>; mit Skript wird daraus die Zeichnung aus src/b/tafeln.mjs, die sich bewegt – nur solange sie im Bild ist, nur wenn die Seite
// sichtbar ist, nie bei reduzierter Bewegung (dann bleibt das Ruhebild). Hell und dunkel folgen dem Gerät.
import { TAFELN, farben, W } from "./tafeln.mjs";

const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const dunkelheit = matchMedia("(prefers-color-scheme: dark)");
const TAKT = { "phorma-iii": 1 / 30, "phorma-i": 1 / 30 };   // die Gewebe und der Kristall rechnen viel: 30 Bilder je Sekunde genügen

if (!ruhig) for (const fig of document.querySelectorAll(".tafel-lebt[data-tafel]")) beleben(fig);

function beleben(fig) {
  const tafel = TAFELN[fig.dataset.tafel];
  if (!tafel) return;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${W}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", fig.querySelector("img")?.alt || tafel.alt);
  const bild = fig.querySelector("picture");
  let zustand = tafel.neu(), c = farben(dunkelheit.matches), sichtbar = false, letzte = 0, rest = 0, raf = 0;
  const takt = TAKT[fig.dataset.tafel] || 0;
  const malen = () => { svg.innerHTML = tafel.svg(zustand, c); };
  dunkelheit.addEventListener("change", () => { c = farben(dunkelheit.matches); malen(); });

  const bild0 = () => {
    // Beginn aus dem Keim, nicht aus dem fertigen Bild: PHORMA II wächst vor den Augen; die anderen laufen von ihrem Ruhebild aus weiter
    if (fig.dataset.tafel === "phorma-ii") zustand = tafel.keim();
    malen();
    bild?.replaceWith(svg);
  };
  const schritt = (now) => {
    raf = 0;
    if (!sichtbar || document.hidden) return;
    const dt = Math.min(0.05, (now - (letzte || now)) / 1000);
    letzte = now;
    tafel.schritt(zustand, dt);
    rest += dt;
    if (!takt || rest >= takt) { malen(); rest = 0; }
    raf = requestAnimationFrame(schritt);
  };
  const weiter = () => { if (sichtbar && !document.hidden && !raf) { letzte = 0; raf = requestAnimationFrame(schritt); } };
  new IntersectionObserver((es) => { sichtbar = es.some((e) => e.isIntersecting); if (sichtbar && !svg.isConnected) bild0(); weiter(); }, { rootMargin: "80px" }).observe(fig);
  document.addEventListener("visibilitychange", weiter);
}
