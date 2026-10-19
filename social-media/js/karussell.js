// Social Media – Karussell der Instagram-Beiträge (seit 19. Oktober 2026): Punkte folgen dem Blättern, Pfeiltasten blättern.
export function karusselle(wurzel = document) {
  for (const k of wurzel.querySelectorAll(".karussell")) {
    const punkte = [...(k.parentElement.querySelector(".karussell-punkte")?.children ?? [])];
    const stelle = () => Math.round(k.scrollLeft / Math.max(1, k.clientWidth));
    k.addEventListener("scroll", () => { const i = stelle(); punkte.forEach((p, j) => p.classList.toggle("an", i === j)); }, { passive: true });
    k.addEventListener("keydown", (ev) => {
      if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
      ev.preventDefault();
      const reduziert = matchMedia("(prefers-reduced-motion: reduce)").matches;
      k.scrollTo({ left: (stelle() + (ev.key === "ArrowRight" ? 1 : -1)) * k.clientWidth, behavior: reduziert ? "auto" : "smooth" });
    });
  }
}
