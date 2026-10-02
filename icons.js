/*
  Gezeichnete Animationen
  -----------------------
  Stark reduzierte Schwarz-Weiss-Fassungen, gezeichnet als SVG (Farbe = currentColor,
  folgt also dem Dark Mode). Das Menü der Website hat keine Symbole mehr (Neuordnung vom
  2. Oktober 2026); die Symbole für News, Termine und Portfolio (reentry, zeit, stellen) sind entfernt.

    wave      feine Wellenlinie als Trennung unter dem Header
    prozess   Schleife über einer Zeitlinie, 18 Schritte (News-Eintrag)
    inklusion Kreis öffnet sich, verschiedene Formen finden hinein (Termine-Eintrag)
    turm      Turm, Werke in drei Konstellationen, Eingriff, 155 Tage (Termine-Eintrag)
    rad       Doppelrad, zwei gegenläufige Ringe (Karten ORNA und ORMA auf der Seite «Apps»)

  Es werden nur Symbole animiert, die gerade sichtbar sind.
  Bei prefers-reduced-motion erscheint ein ruhendes Bild.
  Dauer eines Durchlaufs pro Symbol: PERIOD unten.
*/
(function () {
  'use strict';

  var PERIOD = { wave: 60, prozess: 26.4, inklusion: 22, turm: 24, rad: 240 };   // Sekunden pro Durchlauf
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

  // ---------- Portfolio: Nebeneinander, Nacheinander (Vorschau) ----------
  // Zwei konzentrische Ringe, der äussere dreht langsam im Uhrzeigersinn, der
  // innere gegenläufig. Feststehender Zeiger oben als Ablesemarke, Fadenkreuz
  // in der Mitte. Die Drehung ist stetig, der Loop daher ohne Sprung.
  function rad(svg) {
    var C = 100, RO = 84, RI = 54, OUTER_T = 120, INNER_T = 80;   // Sekunden pro Umdrehung
    function ring(r, sectors, ticks, marks, cls) {
      var g = el('g', {}, svg), d = '', m = '';
      el('path', { d: 'M' + (C - r) + ',' + C + 'a' + r + ',' + r + ' 0 1,0 ' + 2 * r + ',0a' + r + ',' + r + ' 0 1,0 ' + -2 * r + ',0', 'class': cls }, g);
      for (var i = 0; i < ticks; i++) {                  // Skala
        var a = i / ticks * TAU, long = i % (ticks / sectors) === 0, l = long ? 9 : 3.5;
        var c = Math.cos(a), s = Math.sin(a);
        (long ? function () { m += 'M' + f(C + c * (r - l)) + ',' + f(C + s * (r - l)) + 'L' + f(C + c * r) + ',' + f(C + s * r); }
              : function () { d += 'M' + f(C + c * (r - l)) + ',' + f(C + s * (r - l)) + 'L' + f(C + c * r) + ',' + f(C + s * r); })();
      }
      el('path', { d: d, 'class': 'thin', opacity: 0.55 }, g);
      el('path', { d: m, 'class': 'mid' }, g);
      for (var k = 0; k < sectors; k++) {                  // Plätze: kleine Marken zwischen den Teilstrichen
        var b = (k + 0.5) / sectors * TAU;
        el('circle', { cx: f(C + Math.cos(b) * (r - marks)), cy: f(C + Math.sin(b) * (r - marks)), r: k === 0 ? 2.4 : 1.6, 'class': k === 0 ? 'fill' : 'mid' }, g);
      }
      return g;
    }
    // feine Hilfskreise und Achsen (stehen still)
    el('path', { d: 'M' + (C - 96) + ',' + C + 'H' + (C + 96) + 'M' + C + ',' + (C - 96) + 'V' + (C + 96), 'class': 'thin', opacity: 0.25 }, svg);
    el('path', { d: 'M' + (C - 68) + ',' + C + 'a68,68 0 1,0 136,0a68,68 0 1,0 -136,0', 'class': 'thin dash', opacity: 0.35 }, svg);
    var outer = ring(RO, 20, 100, 15, 'bold');   // 20 Künstler
    var inner = ring(RI, 20, 60, 13, 'mid');     // 20 Theoretiker
    el('path', { d: 'M' + (C - 5) + ',' + C + 'H' + (C + 5) + 'M' + C + ',' + (C - 5) + 'V' + (C + 5), 'class': 'mid' }, svg);
    el('circle', { cx: C, cy: C, r: 1.6, 'class': 'fill' }, svg);
    // feststehender Zeiger: hier wird jeweils eine Begegnung abgelesen
    el('path', { d: 'M' + C + ',' + (C - RO - 11) + 'l-4,-7h8Z', 'class': 'fill' }, svg);
    el('path', { d: 'M' + C + ',' + (C - RO - 3) + 'V' + (C - RI + 10), 'class': 'thin', opacity: 0.6 }, svg);

    return function (u, t) {
      outer.setAttribute('transform', 'rotate(' + f(360 * t / OUTER_T) + ' ' + C + ' ' + C + ')');
      inner.setAttribute('transform', 'rotate(' + f(-360 * t / INNER_T) + ' ' + C + ' ' + C + ')');
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
  var FACTORY = { wave: wave, prozess: prozess, inklusion: inklusion, turm: turm, rad: rad };
  var STILL = { wave: 0, prozess: 0.95, inklusion: 0.85, turm: 0.7, rad: 0.05 };   // Standbild bei reduzierter Bewegung
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

  // Aufklappbare Einträge: Animation beim Öffnen von vorn beginnen
  document.addEventListener('toggle', function (e) {
    if (!e.target.open) return;
    icons.forEach(function (ic) {
      if (e.target.contains(ic.svg)) { ic.offset = -t; ic.update(0, 0); }
    });
  }, true);

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
