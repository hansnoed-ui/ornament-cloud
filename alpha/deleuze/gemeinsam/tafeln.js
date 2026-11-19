// Gemeinsame Kleinigkeiten der Gestaltung «Zwischentitel», unabhängig vom Effekt eines Operators.
// - Tafeln der Lektüre: Zähler «1 / 5», Pfeiltasten, beim Öffnen zurück zur ersten Tafel.
// - Untertitel (Glosse) sitzen über dem unteren Band: dessen Höhe als CSS-Variable --regler-hoehe.
// - Die Glosse am rechten Rand lässt sich wegklicken (×) oder nach rechts wegwischen.
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

  // Glosse wegklicken oder wegwischen, wer nicht warten will (Christian, 19.11.2026).
  // Die Berührung wird abgefangen, bevor sie die Glosse erreicht; sonst öffnete das Schliessen die Lektüre.
  const glosse = document.getElementById('glosse');
  if (glosse) {
    const zu = document.createElement('button');
    zu.type = 'button'; zu.className = 'glosse-zu'; zu.textContent = '×';
    zu.setAttribute('aria-label', ({ de: 'Schliessen', en: 'Close', fr: 'Fermer' })[document.documentElement.lang] || 'Schliessen');
    glosse.prepend(zu);
    const weg = () => {
      glosse.style.transition = ''; glosse.style.transform = ''; glosse.classList.remove('da');
      setTimeout(() => { if (!glosse.classList.contains('da')) glosse.hidden = true; }, 700);
    };
    let x0 = null, dx = 0, gewischt = false;
    glosse.addEventListener('pointerdown', (e) => { x0 = e.clientX; dx = 0; gewischt = false; });
    glosse.addEventListener('pointermove', (e) => {
      if (x0 === null) return;
      dx = Math.max(0, e.clientX - x0);
      if (dx > 6) { glosse.style.transition = 'none'; glosse.style.transform = `translateX(${dx}px)`; }
    });
    const ende = () => {
      if (x0 === null) return;
      x0 = null;
      if (dx > 60) { gewischt = true; weg(); } else { glosse.style.transition = ''; glosse.style.transform = ''; }
    };
    glosse.addEventListener('pointerup', ende);
    glosse.addEventListener('pointercancel', ende);
    document.addEventListener('click', (e) => {
      if (!glosse.contains(e.target) || !(gewischt || e.target.closest('.glosse-zu'))) return;
      e.stopPropagation(); e.preventDefault(); gewischt = false; weg();
    }, true);
  }

  const regler = document.getElementById('regler');
  if (regler && 'ResizeObserver' in window) {
    new ResizeObserver(() => document.documentElement.style.setProperty('--regler-hoehe', regler.offsetHeight + 'px')).observe(regler);
  }
})();
