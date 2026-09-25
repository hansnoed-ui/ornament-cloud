/*
  Menü-Symbole im Footer
  ----------------------
  Drei stark reduzierte Schwarz-Weiss-Fassungen der Vorschau-Animationen,
  gezeichnet als SVG (Farbe = currentColor, folgt also dem Dark Mode).

    reentry   Schleife -> Helix -> verwundenes Band          (News)
    zeit      Kreise -> Kalenderraster -> Messlinie, ohne Schrift (Termine)
    stellen   Raster, Objekte, Drift, Werk, Atmosphäre      (Installationen)

  Es werden nur Symbole animiert, die gerade sichtbar sind.
  Bei prefers-reduced-motion erscheint ein ruhendes Bild.
  Dauer eines Durchlaufs pro Symbol: PERIOD unten.
*/
(function () {
  'use strict';

  var PERIOD = { reentry: 24, zeit: 15, stellen: 12 };   // Sekunden pro Durchlauf
  var FPS = 30;

  var NS = 'http://www.w3.org/2000/svg';
  var TAU = Math.PI * 2;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function ease(x) { return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); }
  function seg(u, a, b) { return ease((u - a) / (b - a)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function f(v) { return v.toFixed(1); }
  function line(pts) {
    var d = '';
    for (var i = 0; i < pts.length; i++) d += (i ? 'L' : 'M') + f(pts[i][0]) + ',' + f(pts[i][1]);
    return d;
  }

  // ---------- 1  Re-entry-Knoten, Helix, Band ----------
  function reentry(svg) {
    var TURNS = 5, SPT = 60, SEG = TURNS * SPT, TT = TURNS * TAU;
    var CZ = 1.15 / TAU, LA = 1, LB = 0.45, LK = 1.2, LOFF = -0.84;
    var axis = el('path', { 'class': 'thin', opacity: 0 }, svg);
    var tube = el('path', { 'class': 'bold' }, svg);
    var edgeA = el('path', { 'class': 'mid' }, svg);
    var edgeB = el('path', { 'class': 'mid' }, svg);
    var rungs = el('path', { 'class': 'thin' }, svg);
    var dot = el('circle', { r: 4, 'class': 'fill' }, svg);

    function curve(t, s, m) {
      var r = LB + LA * Math.cos(t);
      var lx = LK * r * Math.cos(t) + LOFF, lz = LK * r * Math.sin(t);
      return [lx + (Math.cos(t) - lx) * m, s * CZ * (t - TT / 2), lz + (Math.sin(t) - lz) * m];
    }

    return function (u, t) {
      var draw = seg(u, 0, 0.1), s = seg(u, 0.24, 0.46), m = seg(u, 0.4, 0.56);
      var cam = seg(u, 0.22, 0.46), cam2 = seg(u, 0.62, 0.8);
      var w = seg(u, 0.64, 0.76), fade = seg(u, 0.66, 0.76), k = seg(u, 0.76, 0.92);
      var out = seg(u, 0.95, 1);                     // weich zurück zum Anfang

      var az = 0.5 + u * 2.4, el_ = lerp(lerp(84, 16, cam), 26, cam2) * Math.PI / 180;
      var ca = Math.cos(az), sa = Math.sin(az), ce = Math.cos(el_), se = Math.sin(el_);
      var sc = lerp(62, 27, cam);
      function proj(p) {
        var X = p[0] * ca - p[2] * sa, Z = p[0] * sa + p[2] * ca;
        return [100 + X * sc, 100 - (p[1] * ce - Z * se) * sc];
      }

      var n = draw < 1 ? Math.max(2, Math.floor(draw * SPT)) : SEG;
      var P = [], S = [];
      for (var i = 0; i <= SEG; i++) {
        var p = curve(i / SEG * TT, s, m);
        P.push(p);
        if (i <= n) S.push(proj(p));
      }
      tube.setAttribute('d', line(S));
      tube.setAttribute('opacity', ((1 - fade) * (1 - out)).toFixed(3));

      // Band: zwei Kanten und Querstreben, verdreht um k
      if (w > 0.001) {
        var h = w * 0.3, A = [], B = [], r = '';
        for (var j = 0; j <= SEG; j++) {
          var q = P[j], tt = j / SEG * TT;
          var rl = Math.hypot(q[0], q[2]) || 1, rx = q[0] / rl, rz = q[2] / rl;
          var ph = k * (tt - TT / 2) / 2, sp = Math.sin(ph), cp = Math.cos(ph);
          var a = proj([q[0] - h * sp * rx, q[1] - h * cp, q[2] - h * sp * rz]);
          var b = proj([q[0] + h * sp * rx, q[1] + h * cp, q[2] + h * sp * rz]);
          A.push(a); B.push(b);
          if (j % 4 === 0) r += 'M' + f(a[0]) + ',' + f(a[1]) + 'L' + f(b[0]) + ',' + f(b[1]);
        }
        edgeA.setAttribute('d', line(A)); edgeB.setAttribute('d', line(B)); rungs.setAttribute('d', r);
      }
      var bo = (w * (1 - out)).toFixed(3);
      edgeA.setAttribute('opacity', bo); edgeB.setAttribute('opacity', bo);
      rungs.setAttribute('opacity', (w * 0.55 * (1 - out)).toFixed(3));

      // Zeitachse
      var a0 = proj([0, -3.1, 0]), a1 = proj([0, 3.2, 0]);
      axis.setAttribute('d', 'M' + f(a0[0]) + ',' + f(a0[1]) + 'L' + f(a1[0]) + ',' + f(a1[1]));
      axis.setAttribute('opacity', (0.5 * s * (1 - 0.5 * cam2) * (1 - out)).toFixed(3));

      // umlaufender Punkt
      var tp = draw < 1 ? draw * TAU : (t * 0.42 * TAU) % TT;
      var d = proj(curve(tp, s, m));
      dot.setAttribute('cx', f(d[0])); dot.setAttribute('cy', f(d[1]));
      dot.setAttribute('opacity', ((1 - w) * (1 - out)).toFixed(3));
    };
  }

  // ---------- 2  Formen der Zeit (ohne Schrift) ----------
  function zeit(svg) {
    var scenes = [el('g', {}, svg), el('g', {}, svg), el('g', {}, svg)];
    var DUR = 5, FADE = 0.8;

    // A: Wiederkehr, drei Kreise mit umlaufenden Punkten
    var R = [26, 46, 66], SP = [0.36, 0.18, 0.09], orbit = [], marks = [];
    R.forEach(function (r, i) {
      el('circle', { cx: 100, cy: 100, r: r, 'class': 'mid' }, scenes[0]);
      orbit.push(el('circle', { r: 4, 'class': 'fill' }, scenes[0]));
      marks.push(el('g', {}, scenes[0]));
    });

    // B: Kalender, Raster mit wechselnd besetzten Stellen
    var cols = 7, rows = 5, cw = 20, ch = 18, x0 = 100 - cols * cw / 2, y0 = 100 - rows * ch / 2;
    el('rect', { x: x0 + 3 * cw, y: y0, width: cw, height: rows * ch, 'class': 'hatch' }, scenes[1]);
    var cells = [];
    for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
      el('rect', { x: x0 + c * cw + 1.5, y: y0 + r * ch + 1.5, width: cw - 3, height: ch - 3, 'class': 'thin' }, scenes[1]);
      cells.push(el('circle', { cx: x0 + c * cw + cw / 2, cy: y0 + r * ch + ch / 2, r: 2.4, 'class': 'fill', opacity: 0 }, scenes[1]));
    }

    // C: Mass der Veränderung, Linie mit Strichen und wanderndem Körper
    el('path', { d: 'M30,122H170', 'class': 'mid' }, scenes[2]);
    var ticks = el('path', { 'class': 'mid' }, scenes[2]);
    var drop = el('path', { 'class': 'thin dash' }, scenes[2]);
    var body = el('circle', { r: 8, 'class': 'bold' }, scenes[2]);

    return function (u, t) {
      var tt = u * DUR * 3;
      scenes.forEach(function (g, i) {
        var local = (tt - i * DUR + DUR * 3) % (DUR * 3);
        var wgt = local < DUR + FADE ? Math.min(seg(local, 0, FADE), 1 - seg(local, DUR, DUR + FADE)) : 0;
        g.setAttribute('opacity', wgt.toFixed(3));
      });
      var lA = (tt + DUR * 3) % (DUR * 3), lB = (tt - DUR + DUR * 3) % (DUR * 3), lC = (tt - 2 * DUR + DUR * 3) % (DUR * 3);

      // A
      R.forEach(function (rad, i) {
        var a = lA * SP[i] * TAU - Math.PI / 2;
        orbit[i].setAttribute('cx', f(100 + Math.cos(a) * rad));
        orbit[i].setAttribute('cy', f(100 + Math.sin(a) * rad));
        var turns = Math.min(8, Math.floor(lA * SP[i])), g = marks[i];
        while (g.childNodes.length > turns) g.removeChild(g.lastChild);
        while (g.childNodes.length < turns) {
          var nth = g.childNodes.length, ang = -Math.PI / 2 + (hash(nth * 7 + i) - 0.5) * 0.6;
          el('circle', { cx: f(100 + Math.cos(ang) * rad), cy: f(100 + Math.sin(ang) * rad), r: 1.8, 'class': 'fill', opacity: 0.55 }, g);
        }
      });

      // B
      var year = Math.floor(lB * 0.9);
      for (var i = 0; i < cells.length; i++) cells[i].setAttribute('opacity', hash(i * 3.1 + year * 17.7) > 0.7 ? 1 : 0);

      // C
      var p = Math.min(1, lC / DUR), x = lerp(30, 170, p), n = Math.floor(p * 14), d = '';
      for (var j = 0; j < n; j++) { var tx = lerp(30, 170, (j + 0.5) / 14); d += 'M' + f(tx) + ',116V128'; }
      ticks.setAttribute('d', d);
      body.setAttribute('cx', f(x)); body.setAttribute('cy', 78);
      drop.setAttribute('d', 'M' + f(x) + ',88V118');
    };
  }

  // ---------- 3  Stellenfeld ----------
  function stellen(svg) {
    var plane = el('g', { transform: 'translate(100,106) scale(1,0.56) rotate(45)' }, svg);
    var N = 3, STEP = 20, LIM = (N + 0.5) * STEP;    // 7 x 7 Stellen
    // Raster auf die Fläche beschneiden, damit beim Weiterziehen nichts übersteht
    var defs = el('defs', {}, svg), clip = el('clipPath', { id: 'stellen-clip' }, defs);
    el('rect', { x: -N * STEP - 4, y: -N * STEP - 4, width: 2 * N * STEP + 8, height: 2 * N * STEP + 8 }, clip);
    var field = el('g', { 'clip-path': 'url(#stellen-clip)' }, plane);
    var gridLines = el('path', { 'class': 'thin' }, field);
    var dots = el('g', {}, field), dotEls = [];
    for (var i = -N; i <= N; i++) for (var j = -N; j <= N; j++) dotEls.push({ i: i, j: j, e: el('circle', { r: 1.8, 'class': 'fill' }, dots) });
    var M = 7, objs = [];
    for (var m = 0; m < M; m++) {
      var ia = Math.round((hash(m * 3.1) * 2 - 1) * 2), ja = Math.round((hash(m * 7.7 + 5) * 2 - 1) * 2);
      var ib = Math.max(-N, Math.min(N, ia + Math.round((hash(m * 13.3 + 2) * 2 - 1) * 2)));
      var jb = Math.max(-N, Math.min(N, ja + Math.round((hash(m * 17.9 + 9) * 2 - 1) * 2)));
      objs.push({ ia: ia, ja: ja, ib: ib, jb: jb, h: hash(m + 0.5), e: el('rect', { width: 8, height: 8, 'class': m ? 'fill' : 'bold' }, plane) });
    }
    var rings = [el('circle', { 'class': 'thin' }, plane), el('circle', { 'class': 'thin' }, plane), el('circle', { 'class': 'mid' }, plane)];

    function wrap(x) { while (x > LIM) x -= 2 * LIM + STEP; while (x < -LIM) x += 2 * LIM + STEP; return x; }

    return function (u) {
      var show = seg(u, 0, 0.1) * (1 - seg(u, 0.94, 1));
      var drift = 2 * STEP * seg(u, 0.5, 0.7);

      // Stellen und Linien, das Raster wandert in der Zeit-Phase weiter
      var d = '';
      for (var k = -N; k <= N; k++) {
        var x = wrap(k * STEP + drift);
        d += 'M' + f(x) + ',' + f(-N * STEP) + 'V' + f(N * STEP);
        d += 'M' + f(-N * STEP) + ',' + f(k * STEP) + 'H' + f(N * STEP);
      }
      gridLines.setAttribute('d', d);
      gridLines.setAttribute('opacity', (0.35 * show).toFixed(3));
      dotEls.forEach(function (o) {
        o.e.setAttribute('cx', f(wrap(o.i * STEP + drift))); o.e.setAttribute('cy', f(o.j * STEP));
      });
      dots.setAttribute('opacity', show.toFixed(3));

      // Objekte: erscheinen, wechseln ihre Stellen, verschwinden bis auf das Werk
      var werk = null;
      objs.forEach(function (o, m) {
        var b = seg(u, 0.17 + 0.08 * o.h, 0.25 + 0.08 * o.h);
        var mv = seg(u, 0.33 + 0.08 * o.h, 0.43 + 0.08 * o.h);
        var x = lerp(o.ia, o.ib, mv) * STEP, y = lerp(o.ja, o.jb, mv) * STEP;
        var size = 8;
        if (m) b *= 1 - seg(u, 0.52 + 0.1 * o.h, 0.62 + 0.1 * o.h);
        else { size = lerp(8, 13, seg(u, 0.7, 0.8)); werk = [x, y]; b *= 1 - seg(u, 0.93, 0.99); }
        o.e.setAttribute('x', f(x - size / 2)); o.e.setAttribute('y', f(y - size / 2));
        o.e.setAttribute('width', f(size)); o.e.setAttribute('height', f(size));
        o.e.setAttribute('opacity', b.toFixed(3));
      });

      // Werk: Pulse, dann Atmosphäre als weite Ringe
      rings.forEach(function (rg, i) {
        var start = i < 2 ? 0.72 + i * 0.05 : 0.85, dur = i < 2 ? 0.09 : 0.12;
        var age = (u - start) / dur;
        if (age > 0 && age < 1) {
          rg.setAttribute('cx', f(werk[0])); rg.setAttribute('cy', f(werk[1]));
          rg.setAttribute('r', f(i < 2 ? 8 + age * 26 : 12 + age * 80));
          rg.setAttribute('opacity', ((1 - age) * 0.9).toFixed(3));
        } else rg.setAttribute('opacity', 0);
      });
    };
  }

  // ---------- Ablauf ----------
  var FACTORY = { reentry: reentry, zeit: zeit, stellen: stellen };
  var STILL = { reentry: 0.7, zeit: 0.45, stellen: 0.78 };   // Standbild bei reduzierter Bewegung
  var icons = [];

  Array.prototype.forEach.call(document.querySelectorAll('svg[data-icon]'), function (svg) {
    var name = svg.getAttribute('data-icon');
    if (!FACTORY[name]) return;
    icons.push({ name: name, update: FACTORY[name](svg), visible: true, offset: Math.random() * PERIOD[name], svg: svg });
  });
  if (!icons.length) return;

  if (reduceMotion) {
    icons.forEach(function (ic) { ic.update(STILL[ic.name], STILL[ic.name] * PERIOD[ic.name]); });
    return;
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        icons.forEach(function (ic) { if (ic.svg === en.target) ic.visible = en.isIntersecting; });
      });
    });
    icons.forEach(function (ic) { io.observe(ic.svg); });
  }

  var t = 0, last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (now - last < 1000 / FPS) return;
    t += last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    icons.forEach(function (ic) {
      if (!ic.visible) return;
      var tt = t + ic.offset, P = PERIOD[ic.name];
      ic.update((tt % P) / P, tt);
    });
  }
  icons.forEach(function (ic) { ic.update(0, 0); });
  requestAnimationFrame(frame);
})();
