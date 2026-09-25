/*
  Hintergrund: Wiederkehr ohne Rückkehr
  -------------------------------------
  Zeichnet in das SVG <svg class="bg-field"> einige Lemniskaten und Schleifen,
  deren Form sich sehr langsam verändert. Alle Formparameter schwingen mit
  unterschiedlichen, teilerfremden Perioden (61 bis 181 Sekunden). Dadurch
  kehren die Figuren immer wieder, aber nie in identischer Gestalt.

  Ebenen (von hinten nach vorn):
    far    grosse Lemniskate, als Echo früherer Zustände mehrfach überlagert
    trace  verblassende Abdrücke früherer Zustände der vorderen Figur
    mid    Schleifen mit Innenschleife und eine rekursive Lemniskate
    near   eine feine Lemniskate in Graphit, gelegentlich dunkler akzentuiert
    marks  der wandernde Kreuzungspunkt mit Haarlinien

  Farben und Sichtbarkeit: CSS-Variablen --bg-line-* und --bg-visibility in styles.css
  Tempo und Detailgrad: CONFIG unten
*/
(function () {
  'use strict';

  var CONFIG = {
    speed: 1,          // 1 = normal, 0.5 = halb so schnell, 2 = doppelt so schnell
    fps: 24,           // Bildrate; die Bewegung ist so langsam, dass mehr nicht nötig ist
    points: 220,       // Stützpunkte pro Kurve (Mobil: 140)
    echoes: 4,         // Echos der hinteren Figur (Mobil: 2)
    traceEvery: 11,    // alle n Sekunden bleibt ein Abdruck der vorderen Figur zurück
    traceLife: 42,     // so viele Sekunden braucht ein Abdruck zum Verblassen
    maxTraces: 7       // gleichzeitig sichtbare Abdrücke (Mobil: 4)
  };

  var svg = document.querySelector('.bg-field');
  if (!svg) return;

  var NS = 'http://www.w3.org/2000/svg';
  var TAU = Math.PI * 2;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var W = 0, H = 0, S = 0, portrait = false, mobile = false;

  function el(tag, cls, parent) {
    var e = document.createElementNS(NS, tag);
    if (cls) e.setAttribute('class', cls);
    (parent || svg).appendChild(e);
    return e;
  }

  var gFar = el('g'), gTrace = el('g'), gMid = el('g'), gNear = el('g'), gMarks = el('g');
  var farPaths = [], midPaths = [], nearPath, axisH, axisV, markDot, markRing;
  var traces = [], lastTrace = -1;

  function build() {
    [gFar, gMid, gNear, gMarks].forEach(function (g) { while (g.firstChild) g.removeChild(g.firstChild); });
    farPaths = []; midPaths = [];
    for (var i = 0; i < (mobile ? 2 : CONFIG.echoes); i++) farPaths.push(el('path', 'far', gFar));
    for (var j = 0; j < (mobile ? 1 : 3); j++) midPaths.push(el('path', 'mid', gMid));
    nearPath = el('path', 'near', gNear);
    axisH = el('line', 'axis', gMarks);
    axisV = el('line', 'axis', gMarks);
    markRing = el('circle', 'mark', gMarks);
    markDot = el('circle', 'mark mark-dot', gMarks);
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    portrait = H > W * 1.05;
    mobile = W < 700;
    S = portrait ? Math.min(H * 0.62, W * 1.25) : Math.min(W, H * 1.9);
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    build();
  }

  // ---------- Hilfen ----------
  function osc(t, period, phase) { return Math.sin(TAU * t / period + phase); }
  function smooth(a, b, x) { x = Math.min(1, Math.max(0, (x - a) / (b - a))); return x * x * (3 - 2 * x); }

  function toPath(pts) {
    var d = 'M' + pts[0].toFixed(1) + ',' + pts[1].toFixed(1);
    for (var i = 2; i < pts.length; i += 2) d += 'L' + pts[i].toFixed(1) + ',' + pts[i + 1].toFixed(1);
    return d + 'Z';
  }

  // Lemniskate mit ungleichen Hälften, Scherung, Drehung und optionalen Unterschleifen
  function lemniscate(P) {
    var n = mobile ? 140 : CONFIG.points, out = new Array(n * 2);
    var cr = Math.cos(P.rot), sr = Math.sin(P.rot);
    for (var i = 0; i < n; i++) {
      var u = i / n * TAU, c = Math.cos(u), s = Math.sin(u), d = 1 + s * s;
      var x = c / d, y = s * c / d;
      var right = x >= 0;
      x *= right ? P.wr : P.wl;
      y *= (right ? P.hr : P.hl) * 1.35;
      if (P.loop) {                                   // rekursive Unterschleifen entlang der Bahn
        x += P.loop * Math.cos(P.k * u + P.lp);
        y += P.loop * Math.sin(P.k * u + P.lp);
      }
      x += y * P.sk;
      x *= P.a; y *= P.a;
      out[2 * i] = P.cx + x * cr - y * sr;
      out[2 * i + 1] = P.cy + x * sr + y * cr;
    }
    return out;
  }

  // Schleife mit Innenschleife (Pascalsche Schnecke), deren Innenschleife wächst und schrumpft
  function limacon(P) {
    var n = mobile ? 120 : Math.round(CONFIG.points * 0.8), out = new Array(n * 2);
    var cr = Math.cos(P.rot), sr = Math.sin(P.rot);
    for (var i = 0; i < n; i++) {
      var u = i / n * TAU, r = P.b + Math.cos(u);
      var x = r * Math.cos(u) * P.a, y = r * Math.sin(u) * P.a * P.ecc;
      out[2 * i] = P.cx + x * cr - y * sr;
      out[2 * i + 1] = P.cy + x * sr + y * cr;
    }
    return out;
  }

  // ---------- Figuren zum Zeitpunkt t ----------
  function nearParams(t) {
    // Kreuzungspunkt im freien Bereich rechts neben der Überschrift
    return {
      cx: W * ((mobile ? 0.62 : 0.66) + 0.06 * osc(t, 131, 0)),
      cy: H * (mobile ? 0.15 : 0.22) + H * 0.04 * osc(t, 97, 1),
      a: (mobile ? W * 0.55 : S * 0.4) * (1 + 0.06 * osc(t, 73, 2)),
      wr: 1 + 0.2 * osc(t, 89, 0.3),  wl: 1 + 0.2 * osc(t, 113, 1.7),
      hr: 1 + 0.28 * osc(t, 67, 0.5), hl: 1 + 0.28 * osc(t, 101, 2.2),
      sk: 0.18 * osc(t, 163, 0.4),
      rot: (portrait && !mobile ? Math.PI / 2 : 0) + 0.14 * osc(t, 149, 0.9)
    };
  }

  function farParams(t) {
    return {
      cx: W * (0.47 + 0.09 * osc(t, 173, 2.1)),
      cy: H * (0.53 + 0.06 * osc(t, 139, 0.2)),
      a: S * 0.52 * (1 + 0.05 * osc(t, 107, 1.3)),
      wr: 1 + 0.15 * osc(t, 157, 0.8), wl: 1 + 0.15 * osc(t, 127, 2.9),
      hr: 1 + 0.3 * osc(t, 83, 1.1),   hl: 1 + 0.3 * osc(t, 179, 0.1),
      sk: -0.12 * osc(t, 151, 1.9),
      rot: (portrait ? Math.PI / 2 : 0) - 0.1 + 0.12 * osc(t, 167, 2.4)
    };
  }

  function draw(t) {
    // Wechsel zwischen klareren und diffuseren Zuständen (Zyklus 157 s)
    var diffuse = 0.5 + 0.5 * osc(t, 157, 0);
    // gelegentliche dunklere Akzentuierung (Zyklus 181 s, nur kurz aktiv)
    var accent = smooth(0.72, 1, osc(t, 181, 2));

    // hinten: dieselbe Figur zu früheren Zeitpunkten, als Echo überlagert
    var lag = 5 + 10 * diffuse;
    for (var i = 0; i < farPaths.length; i++) {
      farPaths[i].setAttribute('d', toPath(lemniscate(farParams(t - i * lag))));
      farPaths[i].setAttribute('opacity', ((0.85 - i * 0.18) * (0.55 + 0.45 * diffuse)).toFixed(3));
    }

    // Mitte: zwei Schleifen und eine rekursive Lemniskate
    if (midPaths[0]) {
      midPaths[0].setAttribute('d', toPath(limacon({
        cx: W * (mobile ? 0.12 : 0.06) + W * 0.03 * osc(t, 109, 0),
        cy: H * (mobile ? 0.3 : 0.78) + H * 0.04 * osc(t, 79, 1),
        a: S * 0.085 * (1 + 0.1 * osc(t, 71, 0.4)),
        b: 0.55 + 0.35 * osc(t, 137, 0.6),
        ecc: 0.8 + 0.18 * osc(t, 91, 1.4),
        rot: 0.5 + 0.35 * osc(t, 193, 0.2)
      })));
      midPaths[0].setAttribute('opacity', (0.55 + 0.25 * (1 - diffuse)).toFixed(3));
    }
    if (midPaths[1]) {
      midPaths[1].setAttribute('d', toPath(limacon({
        cx: W * 0.94 + W * 0.02 * osc(t, 103, 2),
        cy: H * 0.66 + H * 0.04 * osc(t, 67, 0.3),
        a: S * 0.06 * (1 + 0.12 * osc(t, 83, 1.1)),
        b: 0.45 + 0.4 * osc(t, 121, 2.5),
        ecc: 0.85 + 0.15 * osc(t, 113, 0.7),
        rot: 2.4 + 0.4 * osc(t, 173, 1.6)
      })));
      midPaths[1].setAttribute('opacity', (0.45 + 0.25 * diffuse).toFixed(3));
    }
    if (midPaths[2]) {
      var r = nearParams(t - 23);
      r.a *= 0.62; r.cx = W * 0.42 + W * 0.05 * osc(t, 119, 1); r.cy = H * 0.9; r.rot += 0.3;
      r.loop = 0.035 + 0.02 * osc(t, 61, 0); r.k = 9; r.lp = TAU * t / 131;
      midPaths[2].setAttribute('d', toPath(lemniscate(r)));
      midPaths[2].setAttribute('opacity', (0.35 + 0.2 * diffuse).toFixed(3));
    }

    // vorne: die feinste, klarste Figur
    var N = nearParams(t);
    nearPath.setAttribute('d', toPath(lemniscate(N)));
    nearPath.setAttribute('opacity', (0.2 + 0.2 * (1 - diffuse) + 0.35 * accent).toFixed(3));
    nearPath.style.strokeWidth = (0.8 + 0.5 * accent).toFixed(2);

    // Kreuzungspunkt der vorderen Lemniskate (liegt im Figurzentrum) mit Haarlinien
    axisH.setAttribute('x1', 0); axisH.setAttribute('x2', W);
    axisH.setAttribute('y1', N.cy.toFixed(1)); axisH.setAttribute('y2', N.cy.toFixed(1));
    axisV.setAttribute('x1', N.cx.toFixed(1)); axisV.setAttribute('x2', N.cx.toFixed(1));
    axisV.setAttribute('y1', (N.cy - 36).toFixed(1)); axisV.setAttribute('y2', (N.cy + 36).toFixed(1));
    markDot.setAttribute('cx', N.cx.toFixed(1)); markDot.setAttribute('cy', N.cy.toFixed(1)); markDot.setAttribute('r', 1.8);
    markRing.setAttribute('cx', N.cx.toFixed(1)); markRing.setAttribute('cy', N.cy.toFixed(1));
    markRing.setAttribute('r', (10 + 4 * osc(t, 47, 0)).toFixed(1));
    gMarks.setAttribute('opacity', (0.35 + 0.35 * (1 - diffuse)).toFixed(3));

    return N;
  }

  // Abdruck eines früheren Zustands, der über CSS-Transition verblasst
  function leaveTrace(d, startOpacity, animate) {
    var p = el('path', 'trace', gTrace);
    p.setAttribute('d', d);
    p.style.opacity = startOpacity;
    if (!animate) { traces.push(p); return; }
    p.style.transitionDuration = CONFIG.traceLife + 's';
    requestAnimationFrame(function () { requestAnimationFrame(function () { p.style.opacity = 0; }); });
    traces.push(p);
    setTimeout(function () {
      if (p.parentNode) p.parentNode.removeChild(p);
      traces.splice(traces.indexOf(p), 1);
    }, CONFIG.traceLife * 1000 + 500);
    var max = mobile ? 4 : CONFIG.maxTraces;
    while (traces.length > max) { var old = traces.shift(); if (old.parentNode) old.parentNode.removeChild(old); }
  }

  // ---------- Ablauf ----------
  var t = 200 + Math.random() * 3000;   // jeder Besuch beginnt an einer anderen Stelle
  var last = 0, raf = 0;

  function renderStatic() {
    while (gTrace.firstChild) gTrace.removeChild(gTrace.firstChild);
    traces = [];
    [16, 8].forEach(function (back, i) {
      leaveTrace(toPath(lemniscate(nearParams(t - back))), i ? 0.14 : 0.08, false);
    });
    draw(t);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < 1000 / CONFIG.fps) return;
    var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    t += dt * CONFIG.speed;
    draw(t);
    var slot = Math.floor(t / CONFIG.traceEvery);
    if (slot !== lastTrace) {
      if (lastTrace !== -1) leaveTrace(nearPath.getAttribute('d'), 0.22, true);
      lastTrace = slot;
    }
  }

  function start() {
    cancelAnimationFrame(raf);
    if (reduceMotion.matches) { renderStatic(); return; }
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  resize();
  start();
  window.addEventListener('resize', function () { resize(); if (reduceMotion.matches) renderStatic(); });
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', start);
})();
