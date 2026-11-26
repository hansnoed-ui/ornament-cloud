// ornament.cloud/alpha/theorie/ – Probeseite der neuen Kunsttheorie (26. November 2026).
// Zwölf Aspekte als Platzhalter (eigene Sätze aus dem X- und Facebook-Archiv, mit Datum und Plattform); Lage x = Verräumlichung,
// y = Verzeitlichung (0 bis 1, geschätzt). Jede Schlaufe des Körpers folgt aus dieser Lage. Ansichten laufen über den Anker (#kerntext, #a-2a).
(function () {
  "use strict";
  var A = [
    ["1", "Sprache ohne Sprache", "Kunst findet statt zwischen Wahrnehmung und Kommunikation, orientiert sich aber nicht an klassischer Sprache.", "05.06.2018 · X", .5, .5, ["1a", "1b", "2", "4"]],
    ["1a", "Das Inkommunikable", "Die Funktion der Kunst ist, Inkommunikables an Kommunikation anzuschliessen.", "19.11.2020 · X, gekürzt", .36, .62, ["1", "5"]],
    ["1b", "Durch Kunst, über Kunst", "Kommunikation durch Kunst unterläuft die Engführung der Kommunikation durch Sprache und Schrift.", "10.01.2022 · X", .62, .4, ["1", "2a"]],
    ["2", "Das Ornamentale", "Die Sprache der Kunst ist das Ornamentale.", "22.11.2025 · X", .78, .55, ["2a", "2b", "2c", "3"]],
    ["2a", "Schrift der Kunst", "Das Ornament ist für die Kunst etwas Ähnliches wie die Schrift für die Gesellschaft.", "10.12.2019 · Facebook", .86, .3, ["2", "1b"]],
    ["2b", "Die Figur", "Das Ornament ist die Figur.", "17.07.2022 · Facebook", .9, .72, ["2", "3"]],
    ["2c", "Werke aus Ornamenten", "Werke bestehen hauptsächlich aus Ornamenten, aber: Ornamente auch aus Werken.", "14.04.2021 · Facebook", .66, .76, ["2", "4a"]],
    ["3", "Beweisraum der Ordnung", "Die Kunst ist kein Freiraum jenseits von Ordnung, sondern ihr Beweisraum. Form ist unvermeidlich. Sinn ist optional.", "09.02.2026 · Facebook", .66, .1, ["2b", "4"]],
    ["4", "Alles läuft auf die Zeit", "Die Überraschung war, dass alles auf die Zeit hinauslief.", "08.09.2026 · Facebook", .22, .88, ["4a", "3", "1"]],
    ["4a", "Die Stelle", "Das Kunstwerk baut eine Stelle, an der Wahrnehmung different wiederkehren kann.", "21.09.2026 · Facebook", .44, .82, ["4", "2c"]],
    ["5", "Ansprechbar sein", "Während Kulturschaffende nach Worten ringen, mach ich mich als Künstler ansprechbar.", "01.12.2020 · Facebook", .14, .38, ["5a", "1a"]],
    ["5a", "Algorithmen", "Sind Algorithmen in sich gekehrte Ornamente?", "06.05.2020 · Facebook", .2, .2, ["5", "2"]]
  ].map(function (r) { return { id: r[0], t: r[1], q: r[2], b: r[3], x: r[4], y: r[5], v: r[6] }; });
  var TITEL = document.title;
  var NACH = {}; A.forEach(function (a, i) { a.i = i; NACH[a.id] = a; });
  var ruhig = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Figur: eine Schlaufe in vier Dimensionen, Form aus der Lage auf den Achsen ----------
  function farbe(y, al) { // Verzeitlichung färbt: Blaupause (Raum) bis Rosa (Zeit)
    var r = Math.round(143 + (255 - 143) * y), g = Math.round(176 + (163 - 176) * y), b = Math.round(255 + (209 - 255) * y);
    return "rgba(" + r + "," + g + "," + b + "," + al + ")";
  }
  function schlaufe(c, a, cx, cy, S, rot, skala, al, breite) {
    var k = 2 + Math.round(a.x * 5), amp = 0.25 + a.y * 0.5, ph = a.i * 0.52;
    var c1 = Math.cos(rot[0]), s1 = Math.sin(rot[0]), c2 = Math.cos(rot[1]), s2 = Math.sin(rot[1]), c3 = Math.cos(rot[2]), s3 = Math.sin(rot[2]);
    var N = 220;
    for (var pass = 0; pass < 2; pass++) {
      c.beginPath();
      for (var n = 0; n <= N; n++) {
        var t = n / N * Math.PI * 2;
        var rr = 1 + amp * 0.45 * Math.cos(k * t);
        var x = Math.cos(t + ph) * rr * skala, y = Math.sin(t + ph) * rr * skala;
        var z = amp * Math.sin(k * t) * skala * 0.9, w = (0.4 + a.x * 0.5) * Math.cos(k * t + ph) * skala;
        var x1 = x * c1 - w * s1; w = x * s1 + w * c1; x = x1;          // Ebene x–w
        var y1 = y * c2 - z * s2; z = y * s2 + z * c2; y = y1;          // Ebene y–z
        var x2 = x * c3 - y * s3; y = x * s3 + y * c3; x = x2;          // Ebene x–y: Drehung in der Bildfläche
        var f4 = 1 / (1 - w * 0.2), f3 = 1 / (1 - z * f4 * 0.14);   // sanfte Perspektive: erst aus der vierten, dann aus der dritten Dimension
        var px = cx + x * f4 * f3 * S, py = cy + y * f4 * f3 * S;
        if (n === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.strokeStyle = farbe(a.y, pass === 0 ? al * 0.14 : al);
      c.lineWidth = pass === 0 ? breite * 4 : breite;
      c.stroke();
    }
  }
  function leinwand(cv) {
    var r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(r.width * d) || cv.height !== Math.round(r.height * d)) { cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); }
    var c = cv.getContext("2d"); c.setTransform(d, 0, 0, d, 0, 0);
    return { c: c, w: r.width, h: r.height };
  }

  // ---------- Start: der Körper aus allen zwölf Schlaufen ----------
  var koerper = document.getElementById("koerper"), zug = { x: 0, y: 0, vx: 0, vy: 0, an: false, lx: 0, ly: 0 }, zeit = 0, hell = null;
  function malKoerper(dt) {
    var L = leinwand(koerper), c = L.c;
    c.fillStyle = "#1b1c1e"; c.fillRect(0, 0, L.w, L.h);
    if (!zug.an) { zug.x += zug.vx; zug.y += zug.vy; zug.vx *= 0.95; zug.vy *= 0.95; }
    zeit += ruhig ? 0 : dt;
    var S = Math.min(L.w, L.h) * 0.27, cx = L.w / 2, cy = L.h / 2 - (L.w < 640 ? 10 : 0);
    c.globalCompositeOperation = "lighter";
    A.forEach(function (a, i) {
      // ein Körper: die vierte Dimension atmet, die Neigung folgt dem Finger, die Fläche dreht langsam
      var rot = [0.55 * Math.sin(zeit * 0.00023) + zug.x * 0.006, 0.45 + 0.25 * Math.sin(zeit * 0.00011) + zug.y * 0.006, zeit * 0.00006 + i * Math.PI / 12];
      var mehr = hell === a.id ? 1 : (hell ? 0.25 : 0.55);
      schlaufe(c, a, cx, cy, S, rot, 0.45 + 0.55 * (i / (A.length - 1)), mehr, 1);
    });
    c.globalCompositeOperation = "source-over";
  }
  koerper.addEventListener("pointerdown", function (e) { zug.an = true; zug.lx = e.clientX; zug.ly = e.clientY; zug.weg = 0; koerper.setPointerCapture(e.pointerId); });
  koerper.addEventListener("pointermove", function (e) {
    if (!zug.an) return;
    var dx = e.clientX - zug.lx, dy = e.clientY - zug.ly; zug.lx = e.clientX; zug.ly = e.clientY;
    zug.x += dx; zug.y += dy; zug.vx = dx; zug.vy = dy; zug.weg += Math.abs(dx) + Math.abs(dy);
  });
  koerper.addEventListener("pointerup", function () { zug.an = false; if (zug.weg < 6) location.hash = "#aspekte"; });

  // der Satz unten wechselt langsam durch die Aspekte und hebt die passende Schlaufe hervor
  var satz = document.getElementById("start-satz"), si = 3;
  setInterval(function () {
    if (ansicht !== "start" || ruhig) return;
    satz.style.opacity = 0;
    setTimeout(function () { si = (si + 1) % A.length; satz.textContent = A[si].q; hell = A[si].id; satz.style.opacity = 1; }, 600);
  }, 6500);

  // ---------- Aspekte: Tafeln ----------
  var reihe = document.getElementById("reihe"), unter = document.getElementById("unter"), balken = document.getElementById("balken"), tafeln = [], aktiv = 3;
  A.forEach(function (a, i) {
    var t = document.createElement("a"); t.className = "tafel"; t.href = "#a-" + a.id; t.setAttribute("aria-label", a.id + " " + a.t);
    var cv = document.createElement("canvas"); t.append(cv); reihe.append(t); tafeln.push(cv);
    t.addEventListener("mouseenter", function () { setzAktiv(i); });
    t.addEventListener("focus", function () { setzAktiv(i); });
    balken.append(document.createElement("i"));
  });
  function setzAktiv(i) {
    aktiv = i;
    [].forEach.call(reihe.children, function (t, k) { t.classList.toggle("an", k === i); });
    [].forEach.call(balken.children, function (b, k) { b.classList.toggle("an", k === i); });
    unter.textContent = ""; var b = document.createElement("b"); b.textContent = A[i].id + "  " + A[i].t;
    var s = document.createElement("span"); s.textContent = " · " + A[i].b.split(" · ")[0];
    unter.append(b, s);
  }
  reihe.addEventListener("scroll", function () { // am Handy: die Tafel in der Mitte ist die aktive
    var m = reihe.scrollLeft + reihe.clientWidth / 2, best = 0, d = 1e9;
    [].forEach.call(reihe.children, function (t, k) { var dd = Math.abs(t.offsetLeft + t.offsetWidth / 2 - m); if (dd < d) { d = dd; best = k; } });
    if (best !== aktiv) setzAktiv(best);
  }, { passive: true });
  function malTafeln() {
    tafeln.forEach(function (cv, i) {
      var L = leinwand(cv); if (!L.w) return;
      L.c.fillStyle = "#1b1c1e"; L.c.fillRect(0, 0, L.w, L.h);
      L.c.globalCompositeOperation = "lighter";
      schlaufe(L.c, A[i], L.w / 2, L.h / 2, L.w * 0.34, [0.5 * Math.sin(zeit * 0.0006 * (i === aktiv ? 1 : 0)), 0.4, 0.2], 1, 0.9, 1);
      L.c.globalCompositeOperation = "source-over";
    });
  }

  // ---------- ein Aspekt ----------
  var aktAspekt = null;
  function zeigAspekt(a) {
    aktAspekt = a;
    document.getElementById("a-zn").textContent = "Aspekt " + a.id + " von 12";
    document.getElementById("a-titel").textContent = a.t;
    document.getElementById("a-zitat").textContent = "«" + a.q + "»";
    document.getElementById("a-beleg").textContent = a.b;
    var w = document.getElementById("a-weiter"); w.textContent = "";
    a.v.forEach(function (v) { var l = document.createElement("a"); l.href = "#a-" + v; l.textContent = v + " " + NACH[v].t; w.append(l); });
    document.getElementById("a-x").textContent = "Verräumlichung " + Math.round(a.x * 100);
    document.getElementById("a-y").textContent = "Verzeitlichung " + Math.round(a.y * 100);
    document.title = a.t + " · Theorie der Kunst · Ornament Cloud";
  }
  function malAspekt() {
    if (!aktAspekt) return;
    var L = leinwand(document.getElementById("a-figur")); if (!L.w) return;
    L.c.fillStyle = "#1b1c1e"; L.c.fillRect(0, 0, L.w, L.h);
    L.c.globalCompositeOperation = "lighter";
    aktAspekt.v.forEach(function (v) { schlaufe(L.c, NACH[v], L.w / 2, L.h / 2, Math.min(L.w, L.h) * 0.3, [0.6 * Math.sin(zeit * 0.0003), 0.45, zeit * 0.00008], 1.3, 0.22, 1); });
    schlaufe(L.c, aktAspekt, L.w / 2, L.h / 2, Math.min(L.w, L.h) * 0.3, [0.6 * Math.sin(zeit * 0.0003), 0.45, zeit * 0.00008], 1, 1, 1.4);
    L.c.globalCompositeOperation = "source-over";
  }

  // ---------- Ansichten und Rand ----------
  var ansicht = "start", rand = document.getElementById("rand"), rl = document.getElementById("rand-links"), rr = document.getElementById("rand-rechts");
  function randText(t) { document.getElementById("rr1").textContent = t; document.getElementById("rr2").textContent = t; }
  var menueOffen = false, vorMenue = "#start";
  rr.addEventListener("click", function () {
    if (menueOffen) { location.hash = vorMenue; } else { vorMenue = location.hash || "#start"; location.hash = "#menue"; }
  });
  function route() {
    var h = (location.hash || "#start").slice(1), ziel = h;
    if (h.indexOf("a-") === 0 && NACH[h.slice(2)]) { ziel = "aspekt"; zeigAspekt(NACH[h.slice(2)]); } else { document.title = TITEL; }
    if (["start", "menue", "kerntext", "aspekte", "aspekt", "quellen"].indexOf(ziel) < 0) ziel = "start";
    ansicht = ziel; menueOffen = ziel === "menue";
    document.querySelectorAll(".ansicht").forEach(function (v) { v.hidden = v.id !== "v-" + ziel; });
    rand.classList.toggle("dunkel", ziel === "start");
    rand.style.display = ziel === "aspekt" ? "none" : "";
    rl.textContent = ziel === "menue" ? "© ornament.cloud" : "Christian Strickler · Theorie der Kunst";
    randText(ziel === "menue" ? "Schliessen" : ziel === "start" ? "Antippen zum Lesen" : "Menü");
    rr.setAttribute("aria-expanded", String(menueOffen));
    if (ziel === "aspekte") requestAnimationFrame(function () {
      var t = reihe.children[aktiv]; reihe.scrollLeft = t.offsetLeft + t.offsetWidth / 2 - reihe.clientWidth / 2; setzAktiv(aktiv);
    });
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  route();

  var letzt = performance.now();
  function schleife(t) {
    var dt = Math.min(50, t - letzt); letzt = t;
    if (ansicht === "start") malKoerper(dt);
    else { zeit += ruhig ? 0 : dt; if (ansicht === "aspekte") malTafeln(); if (ansicht === "aspekt") malAspekt(); }
    requestAnimationFrame(schleife);
  }
  requestAnimationFrame(schleife);
})();
