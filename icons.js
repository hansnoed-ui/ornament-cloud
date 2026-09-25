/*
  Menü-Symbole im Footer
  ----------------------
  Drei stark reduzierte Schwarz-Weiss-Fassungen der Vorschau-Animationen,
  gezeichnet als SVG (Farbe = currentColor, folgt also dem Dark Mode).

    reentry   Schleife -> Helix -> verwundenes Band          (News)
    zeit      Kreise -> Kalenderraster -> Messlinie, ohne Schrift (Termine)
    stellen   Raster, Objekte, Drift, Werk, Atmosphäre, mit Kamerafahrt (Portfolio)
    wave      feine Wellenlinie als Trennung unter dem Header

  Es werden nur Symbole animiert, die gerade sichtbar sind.
  Bei prefers-reduced-motion erscheint ein ruhendes Bild.
  Dauer eines Durchlaufs pro Symbol: PERIOD unten.
*/
(function () {
  'use strict';

  var PERIOD = { reentry: 24, zeit: 15, stellen: 12, wave: 60 };   // Sekunden pro Durchlauf
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

  // ---------- 3  Stellenfeld, mit der Kamerafahrt des Artefakts ----------
  function stellen(svg) {
    var N = 3, HALF = N + 0.5, W = 2 * N + 1;        // 7 x 7 Stellen im Abstand 1
    var vLines = [], hLines = [], dotEls = [];
    for (var k = -N; k <= N; k++) {
      vLines.push(el('path', { 'class': 'thin' }, svg));
      hLines.push(el('path', { 'class': 'thin' }, svg));
    }
    for (var i = -N; i <= N; i++) for (var j = -N; j <= N; j++) dotEls.push({ i: i, j: j, e: el('circle', { 'class': 'fill' }, svg) });
    var M = 7, objs = [];
    for (var m = 0; m < M; m++) {
      var ia = Math.round((hash(m * 3.1) * 2 - 1) * 2), ja = Math.round((hash(m * 7.7 + 5) * 2 - 1) * 2);
      var ib = Math.max(-N, Math.min(N, ia + Math.round((hash(m * 13.3 + 2) * 2 - 1) * 2)));
      var jb = Math.max(-N, Math.min(N, ja + Math.round((hash(m * 17.9 + 9) * 2 - 1) * 2)));
      objs.push({ ia: ia, ja: ja, ib: ib, jb: jb, h: hash(m + 0.5), e: el('path', { 'class': m ? 'fill' : 'werk' }, svg) });
    }
    var rings = [el('path', { 'class': 'thin' }, svg), el('path', { 'class': 'thin' }, svg), el('path', { 'class': 'mid' }, svg)];

    // Kamera-Schlüsselbilder aus dem Artefakt: Zeitpunkt, Zug zum Werk, Azimut, Radius, Höhe, Blickwinkel
    var KF = [
      [0.00, 0.00, 0.40, 11.5, 1.5, 46],
      [0.18, 0.00, 1.15, 10.5, 4.2, 42],
      [0.42, 0.00, 2.15, 10.0, 8.5, 44],
      [0.60, 0.15, 3.10, 12.0, 2.4, 40],
      [0.80, 0.95, 4.60,  5.6, 2.1, 38],
      [0.92, 0.45, 5.60, 11.5, 4.5, 50]
    ];
    function kf(i) {
      var n = KF.length, sh = Math.floor(i / n), b = KF[((i % n) + n) % n].slice();
      b[0] += sh; b[2] += TAU * sh;
      return b;
    }
    function camAt(t) {                              // weiche, geschlossene Kurve durch die Schlüsselbilder
      var k = 0; while (k < KF.length - 1 && t >= KF[k + 1][0]) k++;
      var p0 = kf(k - 1), p1 = kf(k), p2 = kf(k + 1), p3 = kf(k + 2);
      var h = p2[0] - p1[0], s = (t - p1[0]) / h, s2 = s * s, s3 = s2 * s, out = [t];
      for (var c = 1; c < 6; c++) {
        var m1 = (p2[c] - p0[c]) / (p2[0] - p0[0]), m2 = (p3[c] - p1[c]) / (p3[0] - p1[0]);
        out.push((2 * s3 - 3 * s2 + 1) * p1[c] + (s3 - 2 * s2 + s) * h * m1 + (-2 * s3 + 3 * s2) * p2[c] + (s3 - s2) * h * m2);
      }
      return out;
    }
    function wrap(x) { while (x >= HALF) x -= W; while (x < -HALF) x += W; return x; }
    function edge(x) { return Math.max(0, Math.min(1, (HALF - Math.abs(x)) / 0.6)); }

    return function (u) {
      var show = seg(u, 0, 0.08) * (1 - seg(u, 0.95, 1));
      var drift = 2 * seg(u, 0.5, 0.7);

      // Objekte: erscheinen, wechseln ihre Stellen, verschwinden bis auf das Werk
      var state = objs.map(function (o, m) {
        var b = seg(u, 0.1 + 0.08 * o.h, 0.18 + 0.08 * o.h);
        var mv = seg(u, 0.33 + 0.08 * o.h, 0.43 + 0.08 * o.h);
        var size = 0.36;
        if (m) b *= 1 - seg(u, 0.52 + 0.1 * o.h, 0.62 + 0.1 * o.h);
        else { size = lerp(0.36, 0.62, seg(u, 0.7, 0.8)); b *= 1 - seg(u, 0.94, 0.99); }
        return { x: lerp(o.ia, o.ib, mv), z: lerp(o.ja, o.jb, mv), b: b, size: size };
      });
      var werk = state[0];

      // Kamera
      var cp = camAt(u), tw = cp[1], az = cp[2], rad = cp[3], hgt = cp[4], fov = cp[5] * Math.PI / 180;
      var T = [werk.x * tw, 0.25 + 0.3 * tw, werk.z * tw];
      var C = [T[0] + rad * Math.cos(az), T[1] + hgt, T[2] + rad * Math.sin(az)];
      var fx = T[0] - C[0], fy = T[1] - C[1], fz = T[2] - C[2], fl = Math.hypot(fx, fy, fz);
      fx /= fl; fy /= fl; fz /= fl;
      var rx = -fz, rz = fx, rl = Math.hypot(rx, rz); rx /= rl; rz /= rl;      // rechts = f x oben
      var ux = -rz * fy, uy = rz * fx - rx * fz, uz = rx * fy;                    // oben = rechts x f
      var F = 130 / Math.tan(fov / 2), roll = 0.05 * Math.sin(TAU * 2 * u + 0.4);
      var cr = Math.cos(roll), sr = Math.sin(roll);
      function proj(x, y, z) {
        var dx = x - C[0], dy = y - C[1], dz = z - C[2];
        var d = dx * fx + dy * fy + dz * fz;
        if (d < 0.3) return null;
        var sx = (dx * rx + dz * rz) / d * F, sy = -(dx * ux + dy * uy + dz * uz) / d * F;
        return [100 + sx * cr - sy * sr, 100 + sx * sr + sy * cr, d];
      }
      function seg3(a, b) {
        var p = proj(a[0], a[1], a[2]), q = proj(b[0], b[1], b[2]);
        return p && q ? 'M' + f(p[0]) + ',' + f(p[1]) + 'L' + f(q[0]) + ',' + f(q[1]) : '';
      }
      function poly(pts) {
        var d = '';
        for (var n = 0; n < pts.length; n++) {
          var p = proj(pts[n][0], pts[n][1], pts[n][2]);
          if (!p) return '';
          d += (n ? 'L' : 'M') + f(p[0]) + ',' + f(p[1]);
        }
        return d + 'Z';
      }

      // Raster: Linien und Stellen, das Raster zieht in der Zeit-Phase weiter
      for (var k = 0; k < W; k++) {
        var x = wrap(k - N + drift), z = k - N;
        vLines[k].setAttribute('d', seg3([x, 0, -N], [x, 0, N]));
        vLines[k].setAttribute('opacity', (0.45 * show * edge(x)).toFixed(3));
        hLines[k].setAttribute('d', seg3([-N, 0, z], [N, 0, z]));
        hLines[k].setAttribute('opacity', (0.45 * show).toFixed(3));
      }
      dotEls.forEach(function (o) {
        var x = wrap(o.i + drift), p = proj(x, 0, o.j);
        if (!p) { o.e.setAttribute('opacity', 0); return; }
        o.e.setAttribute('cx', f(p[0])); o.e.setAttribute('cy', f(p[1]));
        o.e.setAttribute('r', Math.max(0.7, Math.min(3.5, 0.06 * F / p[2])).toFixed(2));
        o.e.setAttribute('opacity', (show * edge(x)).toFixed(3));
      });

      // Objekte als Quadrate in der Ebene
      state.forEach(function (s, m) {
        var h = s.size / 2;
        objs[m].e.setAttribute('d', s.b > 0.01 ? poly([[s.x - h, 0.02, s.z - h], [s.x + h, 0.02, s.z - h], [s.x + h, 0.02, s.z + h], [s.x - h, 0.02, s.z + h]]) : '');
        objs[m].e.setAttribute('opacity', s.b.toFixed(3));
      });

      // Werk: Pulse, dann Atmosphäre als weite Ringe in der Ebene
      rings.forEach(function (rg, i) {
        var start = i < 2 ? 0.72 + i * 0.05 : 0.85, dur = i < 2 ? 0.09 : 0.12, age = (u - start) / dur;
        if (age > 0 && age < 1) {
          var R = i < 2 ? 0.4 + age * 1.3 : 0.6 + age * 4, pts = [];
          for (var a = 0; a < 32; a++) pts.push([werk.x + Math.cos(a / 32 * TAU) * R, 0.01, werk.z + Math.sin(a / 32 * TAU) * R]);
          rg.setAttribute('d', poly(pts));
          rg.setAttribute('opacity', ((1 - age) * 0.9).toFixed(3));
        } else rg.setAttribute('opacity', 0);
      });
    };
  }

  // ---------- Trennlinie unter dem Header: feine, rhythmisch wogende Welle ----------
  function wave(svg) {
    var H = 40, path = el('path', { 'class': 'wave' }, svg);
    return function (u, t) {
      var w = svg.clientWidth || 600, d = '';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + H);
      var beat = 0.75 + 0.25 * Math.sin(t * TAU / 4);          // Grundtakt: alle 4 s ein Anschwellen
      var A = 14 * beat;
      for (var x = 0; x <= w; x += 3) {
        var env = Math.pow(Math.sin(Math.PI * x / w), 0.5);   // an den Enden flach
        var packet = 0.75 + 0.25 * Math.sin(TAU * x / 600 - t * 0.9);   // wandernde Wellengruppen
        var y = 0.85 * Math.sin(TAU * x / 160 - t * 1.8) * packet   // regelmässige Grundwelle, wandert nach rechts
              + 0.12 * Math.sin(TAU * x / 64 + t * 1.2 + 1)
              + 0.04 * Math.sin(TAU * x / 31 - t * 2.4 + 2);
        d += (x ? 'L' : 'M') + x + ',' + f(H / 2 + A * env * y);
      }
      path.setAttribute('d', d);
    };
  }

  // ---------- Ablauf ----------
  var FACTORY = { reentry: reentry, zeit: zeit, stellen: stellen, wave: wave };
  var STILL = { reentry: 0.7, zeit: 0.45, stellen: 0.78, wave: 0 };   // Standbild bei reduzierter Bewegung
  var icons = [];

  Array.prototype.forEach.call(document.querySelectorAll('svg[data-icon]'), function (svg) {
    var name = svg.getAttribute('data-icon');
    if (!FACTORY[name]) return;
    icons.push({ name: name, update: FACTORY[name](svg), visible: true, offset: Math.random() * PERIOD[name], svg: svg });
  });
  if (!icons.length) return;

  if (reduceMotion) {
    var still = function () { icons.forEach(function (ic) { ic.update(STILL[ic.name], STILL[ic.name] * PERIOD[ic.name]); }); };
    still();
    window.addEventListener('resize', still);
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
