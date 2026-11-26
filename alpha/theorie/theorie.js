// ornament.cloud/alpha/theorie/ – Probeseite der neuen Kunsttheorie, dritte Stufe (26. November 2026).
// Zwölf Aspekte als Platzhalter (Sätze aus dem X- und Facebook-Archiv, mit Datum und Plattform); Lage x = Verräumlichung,
// y = Verzeitlichung (0 bis 1, geschätzt). Jede Schlaufe folgt aus dieser Lage. Eine einzige Leinwand hinter allen Ansichten:
// WebGL ohne Bibliothek (Bänder im Vertex-Shader gerechnet, additiv gemischt), sonst 2D als Rückfall.
// Ansichten laufen über den Anker (#kerntext, #aspekte, #a-2a, #quellen); die Lesespur liegt in localStorage («theorie-gelesen»).
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
  ].map(function (r, i) { return { id: r[0], t: r[1], q: r[2], b: r[3], x: r[4], y: r[5], v: r[6], i: i }; });
  var NACH = {}; A.forEach(function (a) { NACH[a.id] = a; });
  var N = A.length, TITEL = document.title;
  var ruhig = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(id) { return document.getElementById(id); }

  // ---------- die Leinwand: eine Welt für alle Ansichten ----------
  // WebGL: jede Schlaufe ist ein gläsernes Band, in vier Dimensionen im Shader gerechnet. Ohne WebGL zeichnet die 2D-Fassung Linien.
  var cv = $("welt"), W = 0, H = 0, DPR = 1, gl = null, c = null, U = {}, ZAHL = 0;
  try { gl = cv.getContext("webgl", { antialias: true, alpha: false, powerPreference: "low-power" }); } catch (e) { gl = null; }
  if (gl) {
    var abl = !!gl.getExtension("OES_standard_derivatives");
    var VS = "attribute vec2 a;uniform float k,amp,ph,ax,sk,S,sp;uniform vec3 rot;uniform vec2 mi,res;varying vec3 vN;varying vec2 vA;" +
      "vec3 P(float t,float v){float rr=1.+amp*.45*cos(k*t);float x=cos(t+ph)*rr*sk;float y=sin(t+ph)*rr*sk;" +
      "float z=amp*sin(k*t+v)*sk*.9;float w=(.4+ax*.5)*cos(k*t+ph+v*2.)*sk;" +
      "float c1=cos(rot.x),s1=sin(rot.x);float x1=x*c1-w*s1;w=x*s1+w*c1;x=x1;" +
      "float c2=cos(rot.y),s2=sin(rot.y);float y1=y*c2-z*s2;z=y*s2+z*c2;y=y1;" +
      "float c3=cos(rot.z),s3=sin(rot.z);float x2=x*c3-y*s3;y=x*s3+y*c3;x=x2;" +
      "float f4=1./(1.-w*.2);return vec3(x*f4,y*f4,z*f4);}" +
      "void main(){float t=a.x*6.2831853;float v=a.y*sp;vec3 p=P(t,v);vN=cross(P(t+.012,v)-p,P(t,v+.012)-p);vA=a;" +
      "float f3=1./(1.-p.z*.14);vec2 px=mi+p.xy*f3*S;gl_Position=vec4(px.x/res.x*2.-1.,1.-px.y/res.y*2.,0.,1.);}";
    var FS = (abl ? "#extension GL_OES_standard_derivatives : enable\n" : "") + "precision mediump float;uniform float al,yy,ant,br;varying vec3 vN;varying vec2 vA;" +
      "void main(){if(vA.x>ant)discard;vec3 n=normalize(vN);float fr=pow(1.-abs(n.z),3.);" +
      (abl ? "float ka=1.-smoothstep(0.,1.6*br,(1.-abs(vA.y))/fwidth(vA.y));" : "float ka=smoothstep(.8,1.,abs(vA.y));") +
      "vec3 co=mix(vec3(.56,.69,1.),vec3(1.,.64,.82),clamp(yy+vA.y*.3,0.,1.));" +
      "float i=al*(.03+.34*fr+.85*ka);gl_FragColor=vec4(co*i,1.);}";
    var bau = function (art, q) { var sh = gl.createShader(art); gl.shaderSource(sh, q); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
    try {
      var pr = gl.createProgram(); gl.attachShader(pr, bau(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, bau(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
      ["k", "amp", "ph", "ax", "sk", "S", "sp", "rot", "mi", "res", "al", "yy", "ant", "br"].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
      var TT = 360, VV = 8, pkt = [], idx = [];
      for (var ti = 0; ti <= TT; ti++) for (var vi = 0; vi <= VV; vi++) pkt.push(ti / TT, vi / VV * 2 - 1);
      for (ti = 0; ti < TT; ti++) for (vi = 0; vi < VV; vi++) { var o = ti * (VV + 1) + vi; idx.push(o, o + 1, o + VV + 1, o + 1, o + VV + 2, o + VV + 1); }
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pkt), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(pr, "a"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ZAHL = idx.length; gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.clearColor(0.0706, 0.0745, 0.0824, 1);
    } catch (e) { gl = null; }
  }
  if (!gl) { var neu = cv.cloneNode(false); cv.replaceWith(neu); cv = neu; c = cv.getContext("2d"); }
  function mass() {
    DPR = Math.min(2, window.devicePixelRatio || 1); W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    if (gl) gl.viewport(0, 0, cv.width, cv.height); else c.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener("resize", mass); mass();
  function anfang() {
    if (gl) { gl.clear(gl.COLOR_BUFFER_BIT); gl.uniform2f(U.res, W, H); return; }
    c.globalCompositeOperation = "source-over"; c.fillStyle = "#121315"; c.fillRect(0, 0, W, H); c.globalCompositeOperation = "lighter";
  }
  function band(a, cx, cy, S, r1, r2, r3, skala, al, breite, anteil) {
    if (!gl) return schlaufe(a, cx, cy, S, r1, r2, r3, skala, al, breite, anteil);
    gl.uniform1f(U.k, 2 + Math.round(a.x * 5)); gl.uniform1f(U.amp, 0.25 + a.y * 0.5); gl.uniform1f(U.ph, a.i * 0.52); gl.uniform1f(U.ax, a.x);
    gl.uniform1f(U.sk, skala); gl.uniform1f(U.S, S); gl.uniform1f(U.sp, 0.2 + 0.16 * (breite - 1)); gl.uniform3f(U.rot, r1, r2, r3); gl.uniform2f(U.mi, cx, cy);
    gl.uniform1f(U.al, al); gl.uniform1f(U.yy, a.y); gl.uniform1f(U.ant, anteil); gl.uniform1f(U.br, breite * DPR * 0.6);
    gl.drawElements(gl.TRIANGLES, ZAHL, gl.UNSIGNED_SHORT, 0);
  }

  function farbe(y, al) { // Verzeitlichung färbt: Blaupause (Raum) bis Rosa (Zeit)
    return "rgba(" + Math.round(143 + 112 * y) + "," + Math.round(176 - 13 * y) + "," + Math.round(255 - 46 * y) + "," + al + ")";
  }
  // eine Schlaufe in vier Dimensionen, als Band aus drei Fasern; Form aus der Lage auf den Achsen
  function schlaufe(a, cx, cy, S, r1, r2, r3, skala, al, breite, anteil) {
    var k = 2 + Math.round(a.x * 5), amp = 0.25 + a.y * 0.5, ph = a.i * 0.52;
    var c1 = Math.cos(r1), s1 = Math.sin(r1), c2 = Math.cos(r2), s2 = Math.sin(r2), c3 = Math.cos(r3), s3 = Math.sin(r3);
    var P = 200, bis = Math.round(P * anteil);
    for (var f = -1; f <= 1; f++) {
      if (f !== 0 && al < 0.16) continue;
      var v = f * 0.09;
      c.beginPath();
      for (var n = 0; n <= bis; n++) {
        var t = n / P * Math.PI * 2;
        var rr = 1 + amp * 0.45 * Math.cos(k * t);
        var x = Math.cos(t + ph) * rr * skala, y = Math.sin(t + ph) * rr * skala;
        var z = amp * Math.sin(k * t + v) * skala * 0.9, w = (0.4 + a.x * 0.5) * Math.cos(k * t + ph + v * 2) * skala;
        var x1 = x * c1 - w * s1; w = x * s1 + w * c1; x = x1;
        var y1 = y * c2 - z * s2; z = y * s2 + z * c2; y = y1;
        var x2 = x * c3 - y * s3; y = x * s3 + y * c3; x = x2;
        var f4 = 1 / (1 - w * 0.2), f3 = 1 / (1 - z * f4 * 0.14);
        var px = cx + x * f4 * f3 * S, py = cy + y * f4 * f3 * S;
        if (n === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.strokeStyle = farbe(a.y, f === 0 ? al : al * 0.4);
      c.lineWidth = f === 0 ? breite : breite * 0.7;
      c.stroke();
      if (f === 0 && al > 0.75) { c.strokeStyle = farbe(a.y, 0.09 * al); c.lineWidth = breite * 7; c.stroke(); }
    }
  }

  // ---------- Zustand ----------
  var ansicht = "start", zeit = 0, geburt = performance.now();
  var zug = { x: 0, y: 0, vx: 0, vy: 0, an: false, lx: 0, ly: 0, weg: 0 };
  var hell = "2", absatz = {}, zeig = null;       // Start: hervorgehobene Schlaufe; Kerntext: Aspekte des Absatzes; Link unter dem Zeiger
  var aktiv = 3, pos = 3, wisch = 0, akt = A[3];  // Reihe und offener Aspekt
  var gelesen = {};
  try { (JSON.parse(localStorage.getItem("theorie-gelesen")) || []).forEach(function (id) { if (NACH[id]) gelesen[id] = true; }); } catch (e) {}
  var ist = A.map(function () { return { x: W / 2, y: H / 2, S: 10, al: 0, eb: 0, br: 1 }; });

  function ziel(a) {
    var mob = W < 700, m = Math.min(W, H), i = a.i;
    if (ansicht === "menue") return { x: W / 2, y: H / 2, S: m * 0.62, al: 0.34, eb: 0, br: 1 };
    if (ansicht === "kerntext" || ansicht === "quellen") {
      var drin = zeig ? zeig === a.id : absatz[a.id], irgend = zeig || Object.keys(absatz).length;
      return { x: mob ? W * 0.92 : W * 0.7, y: mob ? H * 0.46 : H * 0.5, S: mob ? W * 0.66 : m * 0.52,
        al: ansicht === "quellen" ? 0.2 : drin ? (mob ? 0.6 : 1) : irgend ? 0.1 : 0.34, eb: 0, br: drin && ansicht === "kerntext" ? 1.4 : 1 };
    }
    if (ansicht === "aspekte") {
      var d = i - pos, g = mob ? W * 0.5 : Math.max(190, W * 0.17), ad = Math.abs(d);
      return { x: W / 2 + d * g, y: H * 0.36, S: (mob ? W * 0.3 : m * 0.21) / (1 + ad * 0.5), al: 1 / (1 + d * d * 1.1), eb: 1, br: ad < 0.5 ? 1.5 : 1 };
    }
    if (ansicht === "aspekt") {
      var r = $("a-feld").getBoundingClientRect(), fx = r.left + r.width / 2, fy = r.top + r.height / 2, fs = Math.min(r.width, r.height) * 0.3;
      if (a === akt) return { x: fx, y: fy, S: fs, al: 1, eb: 1, br: 1.6 };
      if (akt.v.indexOf(a.id) > -1) return { x: fx, y: fy, S: fs * 1.45, al: 0.2, eb: 1, br: 1 };
      return { x: fx, y: fy, S: fs * 2.4, al: 0, eb: 1, br: 1 };
    }
    return { x: W / 2, y: H * 0.5, S: m * (mob ? 0.42 : 0.4), al: hell === a.id ? 1 : gelesen[a.id] ? 0.55 : 0.26, eb: 0, br: hell === a.id ? 1.6 : 1 };
  }

  var letzt = performance.now();
  function bild(t) {
    var dt = Math.min(50, t - letzt); letzt = t;
    zeit += ruhig ? 0 : dt;
    if (!zug.an) { zug.x += zug.vx; zug.y += zug.vy; zug.vx *= 0.95; zug.vy *= 0.95; }
    pos += ((aktiv - wisch) - pos) * (ruhig ? 1 : 0.14);
    anfang();
    var blättern = window.scrollY * 0.0016, k = ruhig ? 1 : 0.085, alter = t - geburt;
    for (var i = 0; i < N; i++) {
      var a = A[i], z = ziel(a), s = ist[i];
      s.x += (z.x - s.x) * k; s.y += (z.y - s.y) * k; s.S += (z.S - s.S) * k; s.al += (z.al - s.al) * k; s.eb += (z.eb - s.eb) * k; s.br += (z.br - s.br) * k;
      if (s.al < 0.012) continue;
      var anteil = ruhig ? 1 : Math.max(0, Math.min(1, (alter - 200 - i * 110) / 1500)); anteil = 1 - Math.pow(1 - anteil, 3);
      if (anteil <= 0) continue;
      var r1 = 0.55 * Math.sin(zeit * 0.00023 + i * 0.4 * s.eb) + zug.x * 0.006;
      var r2 = 0.45 + 0.25 * Math.sin(zeit * 0.00011) + zug.y * 0.006 + blättern;
      var r3 = zeit * 0.00006 * (1 - s.eb * 0.6) + i * Math.PI / 12 * (1 - s.eb) + blättern * 0.6;
      var skala = (0.45 + 0.55 * i / (N - 1)) * (1 - s.eb) + s.eb;
      band(a, s.x, s.y, s.S, r1, r2, r3, skala, s.al, s.br, anteil);
    }
    requestAnimationFrame(bild);
  }

  // ---------- Start ----------
  var st = $("v-start");
  st.addEventListener("pointerdown", function (e) { zug.an = true; zug.lx = e.clientX; zug.ly = e.clientY; zug.weg = 0; st.setPointerCapture(e.pointerId); });
  st.addEventListener("pointermove", function (e) {
    if (!zug.an) return;
    var dx = e.clientX - zug.lx, dy = e.clientY - zug.ly; zug.lx = e.clientX; zug.ly = e.clientY;
    zug.x += dx; zug.y += dy; zug.vx = dx; zug.vy = dy; zug.weg += Math.abs(dx) + Math.abs(dy);
  });
  st.addEventListener("pointerup", function () { zug.an = false; if (zug.weg < 6) { aktiv = NACH[hell] ? NACH[hell].i : aktiv; location.hash = "#aspekte"; } });
  var satz = $("start-satz"), kl = $("ss-klein"), si = 3;
  function setzSatz(x) {
    satz.textContent = x.q; kl.textContent = x.id + " · " + x.t; hell = x.id;
    satz.classList.toggle("mittel", x.q.length >= 45 && x.q.length < 85); satz.classList.toggle("lang", x.q.length >= 85);
  }
  setInterval(function () {
    if (ansicht !== "start" || ruhig) return;
    satz.style.opacity = 0; kl.style.opacity = 0;
    setTimeout(function () { si = (si + 5) % N; setzSatz(A[si]); satz.style.opacity = 1; kl.style.opacity = 1; }, 700);
  }, 6500);

  // ---------- Kerntext: der Körper liest mit ----------
  var abs = [].slice.call(document.querySelectorAll("#v-kerntext p[data-a]"));
  function lies() {
    if (ansicht !== "kerntext") return;
    var mitte = H * 0.5, best = null, d = 1e9;
    abs.forEach(function (p) { var r = p.getBoundingClientRect(), dd = Math.abs((r.top + r.bottom) / 2 - mitte); if (dd < d) { d = dd; best = p; } });
    absatz = {};
    abs.forEach(function (p) { p.classList.toggle("an", p === best && d < H * 0.42); });
    if (best && d < H * 0.42) best.dataset.a.split(",").forEach(function (id) { absatz[id] = true; });
  }
  window.addEventListener("scroll", lies, { passive: true });
  document.querySelectorAll("#v-kerntext p a").forEach(function (l) {
    var id = l.getAttribute("href").slice(3);
    l.addEventListener("pointerenter", function () { zeig = id; }); l.addEventListener("pointerleave", function () { zeig = null; });
    l.addEventListener("focus", function () { zeig = id; }); l.addEventListener("blur", function () { zeig = null; });
  });

  // ---------- Aspekte: die Reihe ----------
  var balken = $("balken"); A.forEach(function () { balken.append(document.createElement("i")); });
  function setzAktiv(i) {
    aktiv = Math.max(0, Math.min(N - 1, i)); var a = A[aktiv];
    $("r-zn").textContent = a.id + " · " + a.b.split(" · ")[0];
    $("r-titel").textContent = a.t; $("r-lesen").href = "#a-" + a.id;
    [].forEach.call(balken.children, function (b, k) { b.classList.toggle("an", k === aktiv); b.classList.toggle("war", !!gelesen[A[k].id]); });
    var n = Object.keys(gelesen).length; $("r-spur").textContent = n ? n + " von 12 gelesen. Was du liest, bleibt im Körper heller." : "";
  }
  $("r-vor").addEventListener("click", function (e) { e.stopPropagation(); setzAktiv(aktiv - 1); });
  $("r-nach").addEventListener("click", function (e) { e.stopPropagation(); setzAktiv(aktiv + 1); });
  var ra = $("v-aspekte"), rz = { an: false, x0: 0, weg: 0 };
  function schritt() { return W < 700 ? W * 0.5 : Math.max(190, W * 0.17); }
  ra.addEventListener("pointerdown", function (e) { if (e.target.closest("a,button")) return; rz.an = true; rz.x0 = e.clientX; rz.weg = 0; ra.setPointerCapture(e.pointerId); });
  ra.addEventListener("pointermove", function (e) { if (!rz.an) return; rz.weg = e.clientX - rz.x0; wisch = rz.weg / schritt(); });
  ra.addEventListener("pointerup", function (e) {
    if (!rz.an) return; rz.an = false;
    if (Math.abs(rz.weg) < 6) {   // Tipp: auf die Mitte öffnet, daneben holt die Figur in die Mitte
      var d = Math.round((e.clientX - W / 2) / schritt());
      if (e.clientY < H * 0.62) { if (d === 0) location.hash = "#a-" + A[aktiv].id; else setzAktiv(aktiv + d); }
    } else setzAktiv(Math.round(aktiv - wisch));
    wisch = 0;
  });
  ra.addEventListener("pointercancel", function () { rz.an = false; wisch = 0; });
  window.addEventListener("keydown", function (e) {
    if (ansicht !== "aspekte") return;
    if (e.key === "ArrowLeft") setzAktiv(aktiv - 1); if (e.key === "ArrowRight") setzAktiv(aktiv + 1);
  });

  // ---------- ein Aspekt ----------
  function zeigAspekt(a) {
    akt = a; aktiv = a.i; gelesen[a.id] = true;
    try { localStorage.setItem("theorie-gelesen", JSON.stringify(Object.keys(gelesen))); } catch (e) {}
    $("a-zn").textContent = "Aspekt " + a.id + " von 12";
    $("a-titel").textContent = a.t; $("a-zitat").textContent = "«" + a.q + "»"; $("a-beleg").textContent = a.b;
    var w = $("a-weiter"); w.textContent = "";
    a.v.forEach(function (v) { var l = document.createElement("a"); l.href = "#a-" + v; l.textContent = v + " " + NACH[v].t; w.append(l); });
    $("a-x").textContent = "Verräumlichung " + Math.round(a.x * 100); $("a-y").textContent = "Verzeitlichung " + Math.round(a.y * 100);
    document.title = a.t + " · " + TITEL;
  }

  // ---------- Ansichten ----------
  var rand = $("rand"), rr = $("rand-rechts"), vorMenue = "#start";
  rr.addEventListener("click", function () {
    if (ansicht === "menue") location.hash = vorMenue; else { vorMenue = location.hash || "#start"; location.hash = "#menue"; }
  });
  function route() {
    var h = (location.hash || "#start").slice(1), z = h;
    if (h.indexOf("a-") === 0 && NACH[h.slice(2)]) { z = "aspekt"; zeigAspekt(NACH[h.slice(2)]); } else document.title = TITEL;
    if (["start", "menue", "kerntext", "aspekte", "aspekt", "quellen"].indexOf(z) < 0) z = "start";
    ansicht = z;
    document.querySelectorAll(".ansicht").forEach(function (v) { v.hidden = v.id !== "v-" + z; });
    rand.style.display = z === "aspekt" ? "none" : "";
    rand.classList.toggle("lesen", z === "kerntext" || z === "quellen");
    var t = z === "menue" ? "Schliessen" : z === "start" ? "Antippen zum Lesen" : "Menü";
    $("rr1").textContent = t; $("rr2").textContent = t; rr.setAttribute("aria-expanded", String(z === "menue"));
    window.scrollTo(0, 0); absatz = {}; zeig = null;
    if (z === "aspekte") setzAktiv(aktiv);
    if (z === "kerntext") lies();
  }
  window.addEventListener("hashchange", route);
  route();
  requestAnimationFrame(bild);
})();
