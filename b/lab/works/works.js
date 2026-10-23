// ornament.lab · Works: Filme der Werke laufen in der Übersicht beim Darüberfahren oder Fokussieren (stumm, geladen erst dann),
// der Punkt im Signet läuft die Schlaufe entlang wie im Neubau. Bei «weniger Bewegung» bleibt beides stehen.
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!ruhig) {
  document.querySelector(".signet .lauf")?.beginElement?.();
  for (const a of document.querySelectorAll("a.werk")) {
    const m = a.querySelector(".medium.hat-film"), v = m?.querySelector("video[data-film]");
    if (!v) continue;
    const an = () => { if (!v.src) v.src = v.dataset.film; v.play().then(() => m.classList.add("spielt")).catch(() => {}); };
    const aus = () => { m.classList.remove("spielt"); v.pause(); };
    a.addEventListener("pointerenter", an); a.addEventListener("focus", an);
    a.addEventListener("pointerleave", aus); a.addEventListener("blur", aus);
  }
}
