/*
  Menü-Symbole im Footer
  ----------------------
  Drei stark reduzierte Schwarz-Weiss-Fassungen der Vorschau-Animationen,
  gezeichnet als SVG (Farbe = currentColor, folgt also dem Dark Mode).

    reentry   Schleife -> Helix -> verwundenes Band          (News)
    zeit      Kreise -> Kalenderraster -> Messlinie, ohne Schrift (Termine)
    stellen   Raster, Objekte, Drift, Werk, Atmosphäre, mit Kamerafahrt (Portfolio)
    wave      feine Wellenlinie als Trennung unter dem Header
    prozess   Schleife über einer Zeitlinie, 18 Schritte (News-Eintrag)
    inklusion Kreis öffnet sich, verschiedene Formen finden hinein (Termine-Eintrag)
    turm      Turm, Werke in drei Konstellationen, Eingriff, 155 Tage (Termine-Eintrag)

  Es werden nur Symbole animiert, die gerade sichtbar sind.
  Bei prefers-reduced-motion erscheint ein ruhendes Bild.
  Dauer eines Durchlaufs pro Symbol: PERIOD unten.
*/
(function () {
  'use strict';

  var PERIOD = { reentry: 24, zeit: 15, stellen: 12, wave: 60, prozess: 26.4, inklusion: 22, turm: 24 };   // Sekunden pro Durchlauf
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

  // ---------- News: der bisherige Prozess ----------
  // Ein Gespräch als Schleife über einer Zeitlinie. Jede Runde hat eine etwas
  // andere Form und hinterlässt einen Schritt auf der Linie; frühere Runden
  // bleiben als blasse Spuren. 18 Schritte = 18 Änderungen bis heute.
  function prozess(svg) {
    var STEPS = 18, LAP = 1.3, HOLD = 3, X0 = 56, X1 = 266, BASE = 150, CY = 76;
    function slot(i) { return X0 + (X1 - X0) * i / (STEPS - 1); }
    el('path', { d: 'M' + X0 + ',' + BASE + 'H' + X1, 'class': 'thin', opacity: 0.35 }, svg);
    var done = el('path', { 'class': 'mid' }, svg);
    var ghosts = [el('path', { 'class': 'thin' }, svg), el('path', { 'class': 'thin' }, svg), el('path', { 'class': 'thin' }, svg)];
    var loop = el('path', { 'class': 'bold' }, svg);
    var drop = el('path', { 'class': 'thin dash' }, svg);
    var head = el('circle', { r: 4, 'class': 'fill' }, svg);
    var dots = [];
    for (var i = 0; i < STEPS; i++) dots.push(el('circle', { cx: f(slot(i)), cy: BASE, r: 3, 'class': 'fill', opacity: 0 }, svg));

    function shape(k, cx) {                              // Schleife mit Innenschleife, jede Runde anders
      var b = 0.4 + 0.45 * hash(k * 1.7 + 3), rot = -Math.PI / 2 + (hash(k * 2.3 + 9) - 0.5) * 0.9;
      var sc = 20 + 8 * hash(k * 3.1 + 1), ecc = 0.75 + 0.3 * hash(k + 5), pts = [];
      var cr = Math.cos(rot), sr = Math.sin(rot);
      for (var n = 0; n <= 72; n++) {
        var a = n / 72 * TAU, r = b + Math.cos(a);
        var x = r * Math.cos(a) * sc, y = r * Math.sin(a) * sc * ecc;
        pts.push([cx + x * cr - y * sr, CY + x * sr + y * cr]);
      }
      return pts;
    }

    return function (u) {
      var T = STEPS * LAP + HOLD, tt = u * T;
      var k = Math.min(STEPS - 1, Math.floor(tt / LAP)), frac = Math.min(1, tt / LAP - k);
      var finished = tt >= STEPS * LAP, out = 1 - seg(tt, T - 1, T);
      var cx = k ? lerp(slot(k - 1), slot(k), ease(Math.min(1, frac * 2))) : slot(0);

      var pts = shape(k, cx), shown = finished ? pts : pts.slice(0, Math.max(2, Math.round(frac * pts.length)));
      loop.setAttribute('d', line(shown));
      loop.setAttribute('opacity', (finished ? 0.35 : 1) * out);
      var hp = shown[shown.length - 1];
      head.setAttribute('cx', f(hp[0])); head.setAttribute('cy', f(hp[1]));
      head.setAttribute('opacity', finished ? 0 : out);

      ghosts.forEach(function (g, j) {
        var kk = k - j - 1;
        if (kk < 0) { g.setAttribute('opacity', 0); return; }
        g.setAttribute('d', line(shape(kk, slot(kk))));
        g.setAttribute('opacity', ((0.3 - j * 0.09) * out).toFixed(3));
      });

      // am Ende jeder Runde fällt ein Schritt auf die Zeitlinie
      var n = finished ? STEPS : k + (frac > 0.9 ? 1 : 0);
      dots.forEach(function (d, i) {
        var fresh = i === n - 1 && !finished ? seg(frac, 0.9, 1) : 1;
        d.setAttribute('opacity', i < n ? (fresh * out).toFixed(3) : 0);
        d.setAttribute('r', i === n - 1 && !finished ? f(3 + 2 * (1 - fresh)) : 3);
      });
      done.setAttribute('d', n > 1 ? 'M' + f(slot(0)) + ',' + BASE + 'H' + f(slot(n - 1)) : '');
      done.setAttribute('opacity', out);
      drop.setAttribute('d', 'M' + f(cx) + ',' + (CY + 30) + 'V' + (BASE - 6));
      drop.setAttribute('opacity', finished ? 0 : (0.6 * seg(frac, 0.6, 0.9) * (1 - seg(frac, 0.95, 1))).toFixed(3));
    };
  }

  // ---------- Termine: Inklusion ----------
  // Ein Kreis (Raum, Institution) öffnet sich. Eine taktile Leitlinie führt zur
  // Öffnung, ganz verschiedene Formen finden in ihrem eigenen Tempo hinein und
  // bleiben drinnen verschieden. Der Kreis schliesst sich nicht wieder.
  function inklusion(svg) {
    var CX = 206, CY = 95, R = 64, GX = CX - R;
    var ring = el('path', { 'class': 'bold' }, svg);
    var band = [];
    for (var i = 0; i < 14; i++) band.push(el('circle', { cx: f(16 + i * 8.4), cy: CY, r: 1.8, 'class': 'fill', opacity: 0 }, svg));
    function shapePath(kind, s) {
      switch (kind) {
        case 'kreis':   return 'M' + (-s) + ',0A' + s + ',' + s + ' 0 1,0 ' + s + ',0A' + s + ',' + s + ' 0 1,0 ' + (-s) + ',0Z';
        case 'quadrat': return 'M' + (-s) + ',' + (-s) + 'H' + s + 'V' + s + 'H' + (-s) + 'Z';
        case 'dreieck': return 'M0,' + (-s * 1.2) + 'L' + (s * 1.1) + ',' + (s * 0.8) + 'H' + (-s * 1.1) + 'Z';
        case 'raute':   return 'M0,' + (-s * 1.3) + 'L' + s + ',0L0,' + (s * 1.3) + 'L' + (-s) + ',0Z';
        case 'paar':    return 'M' + (-s * 0.9) + ',0m-2.4,0a2.4,2.4 0 1,0 4.8,0a2.4,2.4 0 1,0 -4.8,0M' + (s * 0.9) + ',0m-2.4,0a2.4,2.4 0 1,0 4.8,0a2.4,2.4 0 1,0 -4.8,0';
        default:        return 'M0,0m-3,0a3,3 0 1,0 6,0a3,3 0 1,0 -6,0';
      }
    }
    // Form, Grösse, Klasse, Start draussen, Ziel drinnen, Startzeit, Dauer, schrittweise?
    var F = [
      ['kreis',   9, 'mid',  [44, 38],  [CX - 22, CY - 24], 0.28, 0.20, false],
      ['quadrat', 7, 'mid',  [30, 150], [CX + 26, CY - 18], 0.34, 0.22, false],
      ['dreieck', 8, 'mid',  [86, 30],  [CX + 4, CY + 28],  0.30, 0.34, true],
      ['paar',    6, 'fill', [100, 158], [CX + 30, CY + 20], 0.42, 0.18, false],
      ['raute',   6, 'mid',  [22, 88],  [CX - 28, CY + 16], 0.46, 0.24, false],
      ['punkt',   4, 'fill', [70, 118], [CX, CY - 2],       0.52, 0.16, false]
    ];
    var shapes = F.map(function (d) {
      var g = el('g', {}, svg);
      el('path', { d: shapePath(d[0], d[1]), 'class': d[2] }, g);
      return { g: g, from: d[3], to: d[4], t0: d[5], dur: d[6], steps: d[7] };
    });

    return function (u, t) {
      var appear = seg(u, 0, 0.08), out = 1 - seg(u, 0.93, 1);
      var gap = 0.62 * seg(u, 0.12, 0.3);                      // halber Öffnungswinkel
      var a0 = Math.PI + gap, a1 = Math.PI - gap + TAU;
      var d = '';
      for (var n = 0; n <= 96; n++) {
        var a = a0 + (a1 - a0) * n / 96;
        d += (n ? 'L' : 'M') + f(CX + Math.cos(a) * R) + ',' + f(CY + Math.sin(a) * R);
      }
      ring.setAttribute('d', d);
      ring.setAttribute('opacity', (appear * out).toFixed(3));

      band.forEach(function (b, i) {                          // Leitlinie erscheint Punkt für Punkt
        b.setAttribute('opacity', (seg(u, 0.1 + i * 0.012, 0.13 + i * 0.012) * 0.8 * out).toFixed(3));
      });

      var sway = 0.05 * Math.sin(t * 0.6);                    // drinnen bewegt sich das Ganze leise mit
      shapes.forEach(function (s, i) {
        var p = Math.min(1, Math.max(0, (u - s.t0) / s.dur));
        if (s.steps) p = (Math.floor(p * 6) + ease((p * 6) % 1)) / 6;   // eine Form geht in kleinen Schritten
        p = s.steps ? p : ease(p);
        var cx = GX - 18, cy = CY;                              // Weg durch die Öffnung
        var x = (1 - p) * (1 - p) * s.from[0] + 2 * (1 - p) * p * cx + p * p * s.to[0];
        var y = (1 - p) * (1 - p) * s.from[1] + 2 * (1 - p) * p * cy + p * p * s.to[1];
        var dx = x - CX, dy = y - CY, c = Math.cos(sway * p), sn = Math.sin(sway * p);
        x = CX + dx * c - dy * sn; y = CY + dx * sn + dy * c;
        s.g.setAttribute('transform', 'translate(' + f(x) + ',' + f(y) + ')');
        s.g.setAttribute('opacity', (appear * out).toFixed(3));
      });
    };
  }

  // ---------- Termine: Supervisionen 2026 im Oberen Turm ----------
  // Der Turm bleibt, die Werke wechseln in drei Konstellationen (drei Vernissagen)
  // und stehen über feine Linien mit ihm im Dialog. In der dritten greift ein Punkt
  // von aussen ein (offener Aufruf). Unten füllen sich 155 Tage bis zur Finissage.
  function turm(svg) {
    // Oberer Turm, reduziert nach Foto: massiver Schaft, steiles Pyramidendach mit Knauf,
    // Uhr, drei kleine Fenster unter dem Dach, Schlitzfenster, Erker rechts, Rundbogentor
    var TX0 = 138, TX1 = 182, TY0 = 60, TY1 = 162, DAYS = 155, BASE = 178;
    var tower = 'M' + TX0 + ',' + TY1 + 'V' + TY0 + 'H' + TX1 + 'V' + TY1 + 'Z'          // Schaft
              + 'M' + (TX0 - 3) + ',' + TY0 + 'L160,36L' + (TX1 + 3) + ',' + TY0 + 'Z';   // Dach
    var windows = 'M160,36V28'                                         // Spitze
                + 'M147,66h4v4h-4ZM158,66h4v4h-4ZM169,66h4v4h-4Z'      // Fenster unter dem Dach
                + 'M160,106v6M160,126v6M150,140v5'                    // Schlitzfenster
                + 'M182,66h5v12h-5'                                   // Erker
                + 'M154,' + TY1 + 'V152a6,6 0 0,1 12,0V' + TY1;       // Rundbogentor
    var clock = 'M160,82m-6.5,0a6.5,6.5 0 1,0 13,0a6.5,6.5 0 1,0 -13,0M160,82V77.5M160,82l3.2,1.8';
    var links = el('g', {}, svg), linkEls = [];
    var ticks = el('path', { 'class': 'thin' }, svg);
    var marks = el('path', { 'class': 'mid' }, svg);
    el('path', { d: 'M20,' + BASE + 'H300', 'class': 'thin', opacity: 0.3 }, svg);
    el('path', { d: tower, 'class': 'bold' }, svg);
    el('path', { d: windows, 'class': 'thin' }, svg);
    el('path', { d: clock, 'class': 'mid' }, svg);
    el('circle', { cx: 160, cy: 27, r: 1.6, 'class': 'fill' }, svg);   // Knauf

    var sizes = [[14, 18], [10, 10], [18, 12], [8, 14], [12, 12], [16, 10], [9, 9]];
    var A = [[50, 52], [102, 80], [56, 122], [108, 146], [222, 50], [270, 84], [232, 130]];
    var B = [], C = [[108, 66], [108, 98], [108, 130], [214, 66], [214, 98], [214, 130], [276, 150]];
    for (var i = 0; i < 7; i++) {
      var a = Math.PI * (0.15 + i * 0.28) + (i > 3 ? 0.35 : 0);
      B.push([160 + Math.cos(a) * 118, 96 + Math.sin(a) * 58]);
    }
    var C2 = C[6].slice(); C2 = [256, 70];              // neue Stelle nach dem Eingriff
    var works = sizes.map(function (sz, i) {
      linkEls.push(el('path', { 'class': 'thin dash' }, links));
      return el('path', { 'class': i % 3 === 1 ? 'fill' : 'mid' }, svg);
    });
    var hand = el('circle', { r: 5, 'class': 'mid' }, svg);

    function rect(cx, cy, w, h) {
      return 'M' + f(cx - w / 2) + ',' + f(cy - h / 2) + 'h' + w + 'v' + h + 'h' + (-w) + 'Z';
    }
    function mix(p, q, t) { return [lerp(p[0], q[0], t), lerp(p[1], q[1], t)]; }

    return function (u) {
      var show = seg(u, 0, 0.05) * (1 - seg(u, 0.9, 0.97));
      var ab = seg(u, 0.3, 0.36), bc = seg(u, 0.56, 0.62);
      var grab = seg(u, 0.64, 0.68), move = seg(u, 0.68, 0.76), leave = seg(u, 0.77, 0.83);

      works.forEach(function (w, i) {
        var p = mix(mix(A[i], B[i], ab), C[i], bc);
        if (i === 6) p = mix(p, C2, move);
        w.setAttribute('d', rect(p[0], p[1], sizes[i][0], sizes[i][1]));
        w.setAttribute('opacity', show.toFixed(3));
        var ex = p[0] < 160 ? TX0 : TX1, ey = Math.max(TY0 + 6, Math.min(TY1 - 6, p[1]));
        var gx = p[0] < 160 ? p[0] + sizes[i][0] / 2 : p[0] - sizes[i][0] / 2;
        linkEls[i].setAttribute('d', 'M' + f(gx) + ',' + f(p[1]) + 'L' + ex + ',' + f(ey));
        var moving = (u > 0.3 && u < 0.36) || (u > 0.56 && u < 0.62) ? 0.25 : 1;
        linkEls[i].setAttribute('opacity', (0.55 * show * moving).toFixed(3));
      });

      // Eingriff von aussen: ein Punkt holt ein Werk an eine neue Stelle
      var hp;
      if (u < 0.68) hp = mix([312, 176], C[6], grab);
      else if (u < 0.77) hp = mix(C[6], C2, move);
      else hp = mix(C2, [316, 20], leave);
      hand.setAttribute('cx', f(hp[0] + 9)); hand.setAttribute('cy', f(hp[1] - 9));
      hand.setAttribute('opacity', (u > 0.62 && u < 0.84 ? seg(u, 0.62, 0.64) * (1 - seg(u, 0.81, 0.84)) : 0).toFixed(3));

      // 155 Tage, drei Vernissagen, Finissage
      var n = Math.floor(DAYS * seg(u, 0.03, 0.88)), d = '', m = '';
      for (var k = 0; k < n; k++) {
        var x = 20 + k * 280 / (DAYS - 1);
        d += 'M' + f(x) + ',' + BASE + 'v-4';
      }
      [0, 52, 104, DAYS - 1].forEach(function (k) {
        if (k < n) m += 'M' + f(20 + k * 280 / (DAYS - 1)) + ',' + (BASE + 3) + 'v-12';
      });
      ticks.setAttribute('d', d); marks.setAttribute('d', m);
      var tl = (1 - seg(u, 0.93, 1)).toFixed(3);
      ticks.setAttribute('opacity', tl); marks.setAttribute('opacity', tl);
    };
  }

  // ---------- Trennlinie unter dem Header: feine, rhythmisch wogende Welle ----------
  function wave(svg) {
    var H = 32, path = el('path', { 'class': 'wave' }, svg);
    return function (u, t) {
      var w = svg.clientWidth || 600, d = '';
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + H);
      var beat = 0.75 + 0.25 * Math.sin(t * TAU / 4);          // Grundtakt: alle 4 s ein Anschwellen
      var A = 9.5 * beat;
      for (var x = 0; x <= w; x += 3) {
        var env = Math.pow(Math.sin(Math.PI * x / w), 0.5);   // an den Enden flach
        var packet = 0.75 + 0.25 * Math.sin(TAU * x / 600 - t * 0.9);   // wandernde Wellengruppen
        var y = 0.85 * Math.sin(TAU * x / 160 - t * 1.5) * packet   // regelmässige Grundwelle, wandert nach rechts
              + 0.12 * Math.sin(TAU * x / 64 + t * 1.2 + 1)
              + 0.04 * Math.sin(TAU * x / 31 - t * 2.4 + 2);
        d += (x ? 'L' : 'M') + x + ',' + f(H / 2 + A * env * y);
      }
      path.setAttribute('d', d);
    };
  }

  // ---------- Ablauf ----------
  var FACTORY = { reentry: reentry, zeit: zeit, stellen: stellen, wave: wave, prozess: prozess, inklusion: inklusion, turm: turm };
  var STILL = { reentry: 0.7, zeit: 0.45, stellen: 0.78, wave: 0, prozess: 0.95, inklusion: 0.85, turm: 0.7 };   // Standbild bei reduzierter Bewegung
  var icons = [];

  Array.prototype.forEach.call(document.querySelectorAll('svg[data-icon]'), function (svg) {
    var name = svg.getAttribute('data-icon');
    if (!FACTORY[name]) return;
    icons.push({ name: name, update: FACTORY[name](svg), visible: true, offset: (name === 'prozess' || name === 'inklusion' || name === 'turm') ? 0 : Math.random() * PERIOD[name], svg: svg });
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
