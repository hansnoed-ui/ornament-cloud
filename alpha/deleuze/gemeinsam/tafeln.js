// Gemeinsame Kleinigkeiten der Gestaltung «Zwischentitel», unabhängig vom Effekt eines Operators.
// - Tafeln der Lektüre: Zähler «1 / 5», Pfeiltasten, beim Öffnen zurück zur ersten Tafel.
// - Untertitel (Glosse) sitzen über dem unteren Band: dessen Höhe als CSS-Variable --regler-hoehe.
(() => {
  const tafeln = document.querySelector('.zt-tafeln');
  const zaehler = document.getElementById('zaehler');
  if (tafeln) {
    const anzahl = tafeln.children.length;
    const jetzt = () => Math.round(tafeln.scrollLeft / Math.max(1, tafeln.clientWidth));
    const zeigen = () => { if (zaehler) zaehler.textContent = `${jetzt() + 1} / ${anzahl}`; };
    tafeln.addEventListener('scroll', () => requestAnimationFrame(zeigen), { passive: true });
    zeigen();
    const gehe = (n) => tafeln.scrollTo({ left: Math.max(0, Math.min(anzahl - 1, n)) * tafeln.clientWidth, behavior: 'smooth' });
    addEventListener('keydown', (e) => {
      const offen = tafeln.closest('[hidden]') === null;
      if (!offen) return;
      if (e.key === 'ArrowRight') gehe(jetzt() + 1);
      if (e.key === 'ArrowLeft') gehe(jetzt() - 1);
    });
    const huelle = tafeln.closest('aside');
    if (huelle) new MutationObserver(() => { if (!huelle.hidden) { tafeln.scrollLeft = 0; zeigen(); } }).observe(huelle, { attributes: true, attributeFilter: ['hidden'] });
  }

  // Vorspann-Videos laufen nur, solange ihre Schwelle sichtbar ist (schont das Telefon)
  document.querySelectorAll('video[data-vorspann]').forEach((v) => {
    const huelle = v.closest('section');
    if (!huelle) return;
    new MutationObserver(() => { if (huelle.hidden) { v.pause(); v.removeAttribute('src'); v.load(); } }).observe(huelle, { attributes: true, attributeFilter: ['hidden'] });
  });

  const regler = document.getElementById('regler');
  if (regler && 'ResizeObserver' in window) {
    new ResizeObserver(() => document.documentElement.style.setProperty('--regler-hoehe', regler.offsetHeight + 'px')).observe(regler);
  }
})();
