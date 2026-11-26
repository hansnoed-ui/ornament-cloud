// ornament.cloud/alpha/theorie/ – Probeseite der neuen Kunsttheorie, dritte Stufe: das Gerüst (26. November 2026).
// Fünf Stränge, zwanzig Aspekte. Jeder Aspekt ist ein Satz von Christian, wörtlich, mit Datum und Plattform (aus der Montage
// alpha/kunsttheorie/, Rechtschreibung unverändert, Kürzungen mit […]). Daneben grau: Lektüren (Luhmann, Deleuze) und
// Begegnungen aus ORNA. Sie sind nicht Christians Sätze und bekommen keine eigene Schlaufe. Lage x = Verräumlichung,
// y = Verzeitlichung (0 bis 1, geschätzt); jede Schlaufe folgt aus dieser Lage. Eine einzige 2D-Leinwand hinter allen Ansichten
// (kein WebGL); Ansichten laufen über den Anker (#kerntext, #aspekte, #a-2a, #quellen).
(function () {
  "use strict";
  var STRANG = { 1: "Was Kunst ist", 2: "Ornament", 3: "Ordnung", 4: "Zeit", 5: "Malerei und Literatur" };
  var ORNA = "../../portfolio/nebeneinander-nacheinander/?pair=";
  // Beigaben: [Art, Etikett, Text, Link]; Art L = Lektüre, O = ORNA, Z = Zettelkasten
  var L185 = ["L", "Lektüre · Luhmann, Die Kunst der Gesellschaft, Ausgabe 2017, S. 185", "Sinnvoller dürfte es sein, sich an der Unterscheidung von ornamentalen und figurativen (repräsentierenden, illusionären) Komponenten von Kunstwerken zu orientieren. Das Ornament dient direkt der Organisation von Raum und Zeit, der Füllung dieser Medien mit Redundanz und Varietät."];
  var A = [
    ["1", "Sprache ohne Sprache", "Kunst findet statt zwischen Wahrnehmung und Kommunikation, orientiert sich aber nicht an klassischer Sprache. Also Sprache ohne Sprache. (so?)", "05.06.2018 · X", .5, .5, ["1a", "1b", "1c", "2"]],
    ["1a", "Das Inkommunikable", "wenn es die Funktion der Kunst ist, Inkommunikabiliäten an Kommunikation anzuschliessen, ist es schwer zu verstehen, wieso sie im Moment Probleme haben sollte", "19.11.2020 · X", .36, .62, ["1", "1b", "4a"]],
    ["1b", "Durch Kunst, über Kunst", "verwechselt werden weiterhin: Kommunikation durch Kunst und Kommunikation über Kunst\nKommunikation durch Kunst unterläuft die Engführung der Kommunikation durch Sprache/Schrift\nKommunikation über Kunst ist sozial vorstrukturiert", "10.01.2022 · X", .62, .4, ["1", "2a"]],
    ["1c", "Realitätsverdoppelung", "Religion/Ideologie schafft fiktive Welten (inkl Universen), Sprache schafft fiktive Körper (inkl Psychen), Kunst zeigt auf die Fiktionalität von Wahrnehmung, positioniert sich also im Realen", "28.10.2019 · Facebook", .46, .3, ["1", "3"]],
    ["2", "Das Ornamentale", "Die Sprache der Kunst ist das Ornamentale.", "22.11.2025 · X", .78, .55, ["2a", "2b", "2c", "2d", "2e", "1"]],
    ["2a", "Schrift der Kunst", "Das Ornament ist/war für die Kunst etwas ähnliches wie die Schrift für die Gesellschaft (und hat sich wie diese längst selbständig gemacht)", "10.12.2019 · Facebook", .86, .3, ["2", "2b", "1b"]],
    ["2b", "Evolution des Ornamentalen", "Was für die Evolution der Gesellschaft die Evolution der Sprache bedeutet hatte, ist für die Evolution des Kunstsystems die Evolution des Ornamentalen", "22.11.2020 · X · ohne Quellenangabe, sinngemäss nach Luhmann", .7, .66, ["2a", "2"]],
    ["2c", "Symbol und Ornament", "Ich bin der festen Überzeugung dass wir mit den Unterscheidungen Symbol/Ornament und Gehalt/Konzept problem los durch jeden Kunstdiskurs kommen von Medien ganz zu schweigen", "01.04.2020 · Facebook · Hashtags weggelassen", .82, .44, ["2", "2e"]],
    ["2d", "Werke aus Ornamenten", "Werke bestehen hauptsächlich aus Ornamenten, aber: Ornamente auch aus Werken.", "14.04.2021 · Facebook", .66, .76, ["2", "4b"],
      [["O", "ORNA · Begegnung 102 · Eva Hesse × Elena Esposito", "Eva Hesse entwirft klare serielle Ordnungen und verwendet Materialien, deren Zukunft sich nicht vollständig kontrollieren lässt. […] Das Werk besitzt eine Struktur, aber keinen endgültig vorhersehbaren Zustand.", ORNA + "eva-hesse__elena-esposito"]]],
    ["2e", "Die Figur", "Das Ornament ist die Figur.", "17.07.2022 · Facebook", .9, .72, ["2", "2c", "3"], [L185],
      "«Das Ornament ist die Figur» gegen Luhmanns Unterscheidung von ornamentalen und figurativen Komponenten: Gegenposition oder ein anderer Figurbegriff?"],
    ["3", "Beweisraum der Ordnung", "Die Kunst ist deshalb kein Freiraum jenseits von Ordnung, sondern ihr Beweisraum. Während andere Systeme entscheiden, codieren und reduzieren müssen, darf Kunst Entscheidung verweigern – und produziert dennoch Form.", "09.02.2026 · Facebook", .66, .1, ["3a", "2e", "4"],
      [["O", "ORNA · Begegnung 11 · Agnes Martin × Elena Esposito", "Martins Raster scheint zunächst das Gegenteil zu tun: Es reduziert Möglichkeiten auf eine fast unveränderliche Ordnung. Doch gerade diese Stabilität macht kleinste Veränderungen der Wahrnehmung bemerkbar.", ORNA + "agnes-martin__elena-esposito"]]],
    ["3a", "Form ist unvermeidlich", "Ordnung bedarf keiner Rechtfertigung. Sie passiert. Die Kunst zeigt, dass man ihr nicht entkommt – selbst dann nicht, wenn man Sinn systematisch verweigert.\nForm ist unvermeidlich. Sinn ist optional.", "09.02.2026 · Facebook", .58, .18, ["3", "1c"]],
    ["4", "Alles läuft auf die Zeit", "Die Überraschung war, dass alles auf die Zeit hinauslief.", "08.09.2026 · Facebook", .22, .88, ["4a", "4b", "4c", "3"],
      [["O", "ORNA · Begegnung 34 · Eva Hesse × N. Katherine Hayles", "Man könnte Hesses Form digital exakt vermessen und dennoch nicht speichern, was mit ihr über Jahrzehnte geschieht. Hier zeigt sich die Differenz zwischen beschreibbarer Struktur und materieller Eigenzeit.", ORNA + "eva-hesse__n-katherine-hayles"]]],
    ["4a", "Die Stelle", "Das Kunstwerk baut eine Stelle, an der Wahrnehmung different wiederkehren kann.", "21.09.2026 · Facebook", .44, .82, ["4", "4b", "1a"],
      [["Z", "Zettelkasten «Zu seiner Zeit» · Strophe 35, Die Kunst", "Kunst bewahrt daher keine Bedeutung. Sie organisiert die Möglichkeit, dass Wahrnehmung anders wiederkehrt.", "../../zu-seiner-zeit/strophe/35-die-kunst/"],
       ["O", "ORNA · Begegnung 13 · Hanne Darboven × Niklas Luhmann", "Die Stelle auf dem Blatt ist wiederauffindbar; der Moment ihrer Herstellung ist es nicht. Damit geraten Speicherung und Wiederkehr auseinander.", ORNA + "hanne-darboven__niklas-luhmann"]]],
    ["4b", "Verschieden wiederkehren", "Ein Werk kann nur verschieden wiederkehren, wenn es weiterhin als dieses Werk erkannt wird. Wo alles anders ist, unterscheidet sich nichts mehr von etwas Bestimmtem.", "18.09.2026 · Facebook", .5, .9, ["4a", "4c", "2d"],
      [["O", "ORNA · Begegnung 26 · Agnes Martin × Gilles Deleuze", "Das Raster erzeugt eine starke Identität der Ordnung, während Material, Handbewegung, Licht und Wahrnehmung Unterschiede hervorbringen. Ohne die wiedererkennbare Ordnung wären diese Unterschiede jedoch kaum als Unterschiede derselben Sache erfahrbar.", ORNA + "agnes-martin__gilles-deleuze"]]],
    ["4c", "Raum und Zeit", "Raum entsteht, wenn Differenzen wiederholbar werden. Zeit entsteht, wenn Wiederholungen ihre Differenzen akkumulieren.", "22.09.2026 · Facebook", .5, .74, ["4", "4b", "5a"]],
    ["5", "Der Beobachter", "Sicher kam er vor dem Leser und vor dem psychologischen Subjekt in die Welt.\nAlso: in der Kunst.\nZuerst in der Malerei, dann im Theater.\nDas weiss man.", "17.01.2022 · Facebook", .3, .4, ["5a", "5b", "5c", "1"],
      [["L", "Lektüre · Luhmann, Zettelkasten, Notiz zur Perspektive", "Zur Destruktion der primären Phänomenalität der Welt als eines bloss subjektiven Scheins hat auch die Entdeckung der Perspektive in der Kunst beigetragen. […] Die Perspektive in der Kunst wirkt zerstörerisch: Wenn das Bild an der Wand eine Illusion ist, dann muss die wirkliche Welt in ihrem Anblick, der genau so aussieht, auch eine Illusion sein."],
       ["O", "ORNA · Begegnung 48 · Mona Hatoum × Judith Butler", "Etwas kann bekannt aussehen und dennoch eine andere Bewegung, Distanz oder Vorsicht verlangen. Wahrnehmung und soziale Lesbarkeit geraten dadurch auseinander.", ORNA + "mona-hatoum__judith-butler"]]],
    ["5a", "Welchen Raum?", "Aber: Welchen Raum?", "16.03.2026 · Facebook · eigener Zusatz zur Deleuze-Stelle", .2, .56, ["5", "4c"],
      [["L", "Lektüre · Deleuze, Über die Malerei", "Das Signal, das ist der Raum. Ein Maler hat nie etwas anderes gemalt als den Raum - und vielleicht auch die Zeit, Raum-Zeit. Immer nur Raum-Zeit."]]],
    ["5b", "Die Person", "Die Organisationsperson ist gearbeitet wie eine Figur aus einem neuzeitlichen Roman. Sie verfügt über konstante (Charakter) und variable (Motive) Merkmale.", "31.10.2020 · X", .16, .3, ["5", "5c"],
      [["L", "Lektüre · Luhmann, Die Kunst der Gesellschaft", "Entsprechend geht die Führung in der Entwicklung von Latenzbeobachtungen auf das Theater und die Literatur und speziell auf den Roman über. […] Sie werden offen als erfundene Personen präsentiert."],
       ["O", "ORNA · Begegnung 39 · Marina Abramović × Judith Butler", "Abramović kann Regeln, Dauer und Risiko einer Situation bestimmen, aber nicht von Grund auf festlegen, wie ihr Körper darin gelesen wird. Die Performance ist singulär, ihre soziale Lesbarkeit hat eine längere Geschichte.", ORNA + "marina-abramovic__judith-butler"]]],
    ["5c", "Das Tempo", "Was mir bei Kafka oder bei Robert Walser immer auffiel (und faszinierte) war die Zeit, das literarische Tempo […]", "09.10.2019 · X", .14, .7, ["5b", "4"]]
  ].map(function (r, i) { return { id: r[0], s: r[0].charAt(0), t: r[1], q: r[2], b: r[3], x: r[4], y: r[5], v: r[6], bei: r[7] || [], offen: r[8] || "", i: i }; });
  var NACH = {}; A.forEach(function (a) { NACH[a.id] = a; });
  var N = A.length, TITEL = document.title;
  var ruhig = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(id) { return document.getElementById(id); }

  // ---------- die Leinwand: eine Welt für alle Ansichten ----------
  var cv = $("welt"), c = cv.getContext("2d"), W = 0, H = 0;
  function mass() {
    var d = Math.min(2, window.devicePixelRatio || 1); W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * d); cv.height = Math.round(H * d); c.setTransform(d, 0, 0, d, 0, 0);
  }
  window.addEventListener("resize", mass); mass();

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
  var aktiv = 4, pos = 4, wisch = 0, akt = A[4];  // Reihe und offener Aspekt
  var ist = A.map(function () { return { x: W / 2, y: H / 2, S: 10, al: 0, eb: 0, br: 1 }; });

  function ziel(a) {
    var mob = W < 700, m = Math.min(W, H), i = a.i;
    if (ansicht === "menue") return { x: W / 2, y: H / 2, S: m * 0.55, al: 0.1, eb: 0, br: 1 };
    if (ansicht === "kerntext" || ansicht === "quellen") {
      var drin = zeig ? zeig === a.id : absatz[a.id], irgend = zeig || Object.keys(absatz).length;
      return { x: mob ? W * 1.02 : W * 0.83, y: mob ? H * 0.5 : H * 0.52, S: mob ? W * 0.7 : m * 0.5,
        al: ansicht === "quellen" ? 0.2 : drin ? (mob ? 0.75 : 1) : irgend ? 0.09 : 0.3, eb: 0, br: drin && ansicht === "kerntext" ? 1.4 : 1 };
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
    return { x: W / 2, y: H * (mob ? 0.44 : 0.47), S: m * (mob ? 0.33 : 0.3), al: hell ? (hell === a.id ? 1 : 0.3) : 0.6, eb: 0, br: hell === a.id ? 1.5 : 1 };
  }

  var letzt = performance.now();
  function bild(t) {
    var dt = Math.min(50, t - letzt); letzt = t;
    zeit += ruhig ? 0 : dt;
    if (!zug.an) { zug.x += zug.vx; zug.y += zug.vy; zug.vx *= 0.95; zug.vy *= 0.95; }
    pos += ((aktiv - wisch) - pos) * (ruhig ? 1 : 0.14);
    c.globalCompositeOperation = "source-over"; c.fillStyle = "#121315"; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = "lighter";
    var blättern = window.scrollY * 0.0016, k = ruhig ? 1 : 0.085, alter = t - geburt;
    for (var i = 0; i < N; i++) {
      var a = A[i], z = ziel(a), s = ist[i];
      s.x += (z.x - s.x) * k; s.y += (z.y - s.y) * k; s.S += (z.S - s.S) * k; s.al += (z.al - s.al) * k; s.eb += (z.eb - s.eb) * k; s.br += (z.br - s.br) * k;
      if (s.al < 0.012) continue;
      var anteil = ruhig ? 1 : Math.max(0, Math.min(1, (alter - 200 - i * 75) / 1500)); anteil = 1 - Math.pow(1 - anteil, 3);
      if (anteil <= 0) continue;
      var r1 = 0.55 * Math.sin(zeit * 0.00023 + i * 0.4 * s.eb) + zug.x * 0.006;
      var r2 = 0.45 + 0.25 * Math.sin(zeit * 0.00011) + zug.y * 0.006 + blättern;
      var r3 = zeit * 0.00006 * (1 - s.eb * 0.6) + i * Math.PI / N * (1 - s.eb) + blättern * 0.6;
      var skala = (0.45 + 0.55 * i / (N - 1)) * (1 - s.eb) + s.eb;
      schlaufe(a, s.x, s.y, s.S, r1, r2, r3, skala, s.al, s.br, anteil);
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
  var satz = $("start-satz"), si = NACH["2"].i;
  setInterval(function () {
    if (ansicht !== "start" || ruhig) return;
    satz.style.opacity = 0; satz.style.transform = "translateY(8px)";
    setTimeout(function () {
      si = (si + 7) % N; hell = A[si].id;
      $("ss-text").textContent = A[si].q; $("ss-klein").textContent = A[si].id + " · " + A[si].t;
      satz.style.opacity = 1; satz.style.transform = "none";
    }, 600);
  }, 6000);

  // ---------- Kerntext: der Körper liest mit ----------
  var abs = [].slice.call(document.querySelectorAll("#v-kerntext [data-a]"));
  function lies() {
    if (ansicht !== "kerntext") return;
    var mitte = H * 0.5, best = null, d = 1e9;
    abs.forEach(function (p) { var r = p.getBoundingClientRect(), dd = Math.abs((r.top + r.bottom) / 2 - mitte); if (dd < d) { d = dd; best = p; } });
    absatz = {};
    abs.forEach(function (p) { p.classList.toggle("an", p === best && d < H * 0.42); });
    if (best && d < H * 0.42) best.dataset.a.split(",").forEach(function (id) { absatz[id] = true; });
  }
  window.addEventListener("scroll", lies, { passive: true });
  document.querySelectorAll('#v-kerntext a[href^="#a-"]').forEach(function (l) {
    var id = l.getAttribute("href").slice(3);
    l.addEventListener("pointerenter", function () { zeig = id; }); l.addEventListener("pointerleave", function () { zeig = null; });
    l.addEventListener("focus", function () { zeig = id; }); l.addEventListener("blur", function () { zeig = null; });
  });

  // ---------- Aspekte: die Reihe ----------
  var balken = $("balken"); A.forEach(function () { balken.append(document.createElement("i")); });
  function setzAktiv(i) {
    aktiv = Math.max(0, Math.min(N - 1, i)); var a = A[aktiv];
    $("r-zn").textContent = a.id + " · " + STRANG[a.s] + " · " + a.b.split(" · ")[0].slice(-4);
    $("r-titel").textContent = a.t; $("r-lesen").href = "#a-" + a.id;
    [].forEach.call(balken.children, function (b, k) { b.classList.toggle("an", k === aktiv); });
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
    akt = a; aktiv = a.i;
    $("a-zn").textContent = "Aspekt " + a.id + " von " + N + " · " + a.s + " " + STRANG[a.s];
    $("a-titel").textContent = a.t; $("a-zitat").textContent = "«" + a.q + "»"; $("a-beleg").textContent = "Christian · " + a.b;
    var nb = $("a-neben"); nb.textContent = "";
    a.bei.forEach(function (x) {   // Lektüre, ORNA, Zettelkasten: grau neben Christians Satz, keine eigene Schlaufe
      var f = document.createElement("figure"); f.className = { L: "lektuere", O: "lektuere orna", Z: "zettel" }[x[0]];
      var k = document.createElement("figcaption"); k.textContent = x[1];
      var q = document.createElement("blockquote"); q.textContent = x[2];
      f.append(k, q);
      if (x[3]) { var l = document.createElement("a"); l.href = x[3]; l.textContent = x[0] === "O" ? "Im Rad ansehen" : "Strophe lesen"; f.append(l); }
      nb.append(f);
    });
    var of = $("a-offen"); of.hidden = !a.offen; of.querySelector("span").textContent = a.offen;
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
