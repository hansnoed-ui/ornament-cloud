/*
  Apps und Artefakte auf dem Smartphone als Wisch-Galerien
  --------------------------------------------------------
  Das Wischen selbst macht CSS (scroll-snap, siehe styles.css). Dieses Skript
  ergänzt nur die Punkte darüber: Sie zeigen, welche Karte sichtbar ist,
  und lassen sich antippen. Auf breiten Bildschirmen sind sie ausgeblendet.
  Jede .slider-dots gehört zur Galerie direkt darunter; data-label benennt
  eine Karte im Vorleseschema («App 1 von 2», Vorgabe «Artefakt»).
*/
(function () {
  'use strict';
  Array.prototype.forEach.call(document.querySelectorAll('.slider-dots'), function (dotsBox) {
    var grid = dotsBox.nextElementSibling;
    if (grid && grid.classList.contains('grid')) gallery(dotsBox, grid, dotsBox.getAttribute('data-label') || 'Artefakt');
  });

  function gallery(dotsBox, grid, label) {
    // Karten in der sichtbaren Reihenfolge (auf dem Handy per CSS umsortiert)
    function cards() {
      return Array.prototype.slice.call(grid.querySelectorAll('.card')).sort(function (a, b) {
        return a.offsetLeft - b.offsetLeft;
      });
    }

    var dots = [];
    function build() {
      dotsBox.innerHTML = '';
      dots = cards().map(function (card, i, all) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'slider-dot';
        b.setAttribute('aria-label', label + ' ' + (i + 1) + ' von ' + all.length + ': ' + card.querySelector('h2').textContent);
        b.addEventListener('click', function () {
          grid.scrollTo({ left: card.offsetLeft - grid.offsetLeft - parseFloat(getComputedStyle(grid).paddingLeft), behavior: 'smooth' });
        });
        dotsBox.appendChild(b);
        return { card: card, dot: b };
      });
      update();
    }

    function update() {
      var center = grid.scrollLeft + grid.clientWidth / 2 + grid.offsetLeft, best = null, bestD = Infinity;
      dots.forEach(function (d) {
        var c = d.card.offsetLeft + d.card.offsetWidth / 2, dist = Math.abs(c - center);
        if (dist < bestD) { bestD = dist; best = d; }
      });
      dots.forEach(function (d) { d.dot.setAttribute('aria-current', d === best ? 'true' : 'false'); });
    }

    var tick = false;
    grid.addEventListener('scroll', function () {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () { tick = false; update(); });
    }, { passive: true });
    window.addEventListener('resize', build);
    build();
  }
})();
