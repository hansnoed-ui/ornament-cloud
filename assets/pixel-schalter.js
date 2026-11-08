// Pixel-Schalter – der Schiebeschalter aus PR #670 (Animationen, Hell / Dunkel, nach Christians Video webdesigns/schalter-hell-dunkel-pixel.mp4)
// als Baustein für mehrere Seiten (seit 8. November 2026: animations/thema.js und multiverse/). Der Knauf trägt ein Pixelzeichen auf einem Raster
// von 13 × 13; beim Umschalten zerstieben die Pixel und setzen sich zum anderen Zeichen zusammen, ein leuchtender Bogen läuft um den Knauf (CSS der
// Seite, Klassen <klasse>, <klasse>-bahn, <klasse>-knauf, <klasse>-bogen). kreisWechsel() lässt eine Änderung der Seite in einem Kreis vom Schalter
// aus erscheinen (View Transitions, wo der Browser sie kann). Ohne Abhängigkeiten.

export const N = 13;                          // Pixelraster der Zeichen: 13 × 13
const DAUER_MS = 720;                         // Zerstieben und Zusammensetzen
export const ruhig = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** ein Zeichen aus 13 Zeilen Text: «#» volles Pixel, «+» halbes (0.6), «:» leises (0.38), alles andere leer; [x, y, Deckkraft] */
export function raster(zeilen) {
  const p = [];
  zeilen.forEach((z, y) => [...z].forEach((c, x) => { const a = c === "#" ? 1 : c === "+" ? .6 : c === ":" ? .38 : 0; if (a) p.push([x, y, a]); }));
  return p;
}

/** zwei Zeichen auf gleich viele Teilchen bringen: jedes Pixel des einen hat ein Ziel im anderen und umgekehrt */
export function paare(a, b) {
  const n = Math.max(a.length, b.length), zu = (l, i) => ({ ...l[i % l.length], doppelt: i >= l.length });
  const m = (N - 1) / 2, sortiert = (l) => [...l].sort((u, v) => Math.atan2(u[1] - m, u[0] - m) - Math.atan2(v[1] - m, v[0] - m));
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

/**
 * Baut einen Schalter (button, role=switch). Zustand «an» = aria-checked="true" = Zeichen an.
 *   klasse   Präfix der CSS-Klassen
 *   aus, an  die beiden Zeichen ([x, y, Deckkraft] auf 13 × 13)
 *   farbe    (k) => [r, g, b] der Pixel, k von 0 (aus) bis 1 (an); schein (k) => [rgba, Stärke] für den Schimmer
 *   label    aria-label; titel (an) => title
 * Gibt den Knopf zurück; knopf.setzen(an, { animiert }) stellt um, knopf.an liest den Zustand. Klicks behandelt die Seite selbst.
 */
export function pixelSchalter({ klasse, aus, an, farbe, schein = () => ["transparent", 0], label = "", titel = null, anfang = false }) {
  const knopf = document.createElement("button");
  knopf.type = "button";
  knopf.className = klasse;
  knopf.setAttribute("role", "switch");
  if (label) knopf.setAttribute("aria-label", label);
  knopf.innerHTML = `<span class="${klasse}-bahn" aria-hidden="true"></span><span class="${klasse}-knauf" aria-hidden="true"><canvas></canvas>`
    + `<svg class="${klasse}-bogen" viewBox="0 0 100 100" preserveAspectRatio="none"><rect x="2" y="2" width="96" height="96" rx="30" ry="30" pathLength="100"/></svg></span>`;
  const leinwand = knopf.querySelector("canvas"), g = leinwand.getContext("2d");
  const teilchen = paare(aus, an);
  let zustand = !!anfang, k = zustand ? 1 : 0, von = k, nach = k, t0 = 0, schweben = 0, schwebenZiel = 0, bild = 0;

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
    const f = farbe(k).map(Math.round), [sf, ss] = schein(k);
    g.shadowColor = sf;
    g.shadowBlur = zelle * 1.2 * ss;
    for (const p of teilchen) {
      const x0 = mischen(p.a[0], p.b[0], glatt(k)), y0 = mischen(p.a[1], p.b[1], glatt(k));
      const a = mischen(p.a[2], p.b[2], k);
      const winkel = p.w + streuung * 2.2 + zeit * .6 * schweben;
      const x = x0 + Math.cos(winkel) * p.d * streuung * p.v, y = y0 + Math.sin(winkel) * p.d * streuung * p.v;
      const alpha = a * (1 - .35 * streuung) + .25 * streuung * Math.max(p.a[2], p.b[2]);
      if (alpha < .02) continue;
      const s = zelle * mischen(.8, .55, streuung);
      g.fillStyle = `rgba(${f[0]}, ${f[1]}, ${f[2]}, ${Math.min(1, alpha)})`;
      g.fillRect(ox + (x + .5) * zelle - s / 2, oy + (y + .5) * zelle - s / 2, s, s);
    }
    const weiter = lauf < 1 || Math.abs(schwebenZiel - schweben) > .005 || schwebenZiel > 0;
    if (lauf >= 1) t0 = 0;
    bild = weiter ? requestAnimationFrame(zeichnen) : 0;
  }
  const anstossen = () => { if (!bild) bild = requestAnimationFrame(zeichnen); };

  knopf.setzen = (neu, { animiert = true } = {}) => {
    zustand = !!neu;
    knopf.setAttribute("aria-checked", String(zustand));
    if (titel) knopf.title = titel(zustand);
    von = k; nach = zustand ? 1 : 0;
    t0 = animiert && !ruhig() ? performance.now() : 0;
    if (!t0) k = nach, von = nach;
    anstossen();
  };
  Object.defineProperty(knopf, "an", { get: () => zustand });
  knopf.neuZeichnen = anstossen;

  knopf.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") { schwebenZiel = 1; anstossen(); } });
  knopf.addEventListener("pointerleave", () => { schwebenZiel = 0; anstossen(); });
  new ResizeObserver(() => { groesse(); anstossen(); }).observe(leinwand);
  knopf.setzen(zustand, { animiert: false });
  return knopf;
}

/**
 * Führt aendern() aus und lässt das Ergebnis in einem Kreis vom Element «von» aus erscheinen.
 *   ziel    null: die ganze Seite (::view-transition-new(root)); sonst ein Element, das während des Wechsels einen eigenen
 *           view-transition-name trägt (name), dann wächst der Kreis nur in diesem Feld
 *   klasse  wird während des Wechsels auf <html> gesetzt (für z-index und Ähnliches im CSS der Seite)
 * Ohne View Transitions (oder bei reduzierter Bewegung) wird nur aendern() ausgeführt; mit ziel wächst der Kreis dann direkt auf dem Feld.
 */
export function kreisWechsel(von, aendern, { ziel = null, name = "kreis-feld", klasse = "", dauer = 620 } = {}) {
  const html = document.documentElement;
  const r = von.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const kreis = () => {
    const f = ziel ? ziel.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
    const cx = x - f.left, cy = y - f.top, radius = Math.hypot(Math.max(cx, f.width - cx), Math.max(cy, f.height - cy));
    return [`circle(0px at ${cx}px ${cy}px)`, `circle(${radius}px at ${cx}px ${cy}px)`];
  };
  const art = { duration: dauer, easing: "cubic-bezier(.65, 0, .35, 1)" };
  if (ruhig()) { aendern(); return Promise.resolve(); }
  if (!document.startViewTransition) {
    aendern();
    if (ziel) ziel.animate({ clipPath: kreis() }, art);
    return Promise.resolve();
  }
  if (ziel) ziel.style.viewTransitionName = name;
  if (klasse) html.classList.add(klasse);
  const ue = document.startViewTransition(aendern);
  ue.ready.then(() => html.animate({ clipPath: kreis() }, { ...art, pseudoElement: `::view-transition-new(${ziel ? name : "root"})` })).catch(() => {});
  return ue.finished.catch(() => {}).finally(() => {
    if (klasse) html.classList.remove(klasse);
    if (ziel) ziel.style.viewTransitionName = "";
  });
}
