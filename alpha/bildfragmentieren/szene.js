// «Bildfragmentieren» – ein Bild des Films auf eine Leinwand zeichnen (Vorschau, Video und Standbild verwenden dasselbe).
// Jedes Bild hängt nur von der Zeit ab (kein Gedächtnis zwischen den Bildern), darum kann die Vorschau an jeder Stelle stehen.
//   01 Linien:  waagrechte Linien tasten das Bild ab (von oben nach unten), heben sich mit der Helligkeit zu einem Relief
//               (jede Linie verdeckt, was hinter ihr liegt) und beruhigen sich; dann zeichnen sich die Umrisse mit leichtem Leuchten
//   02 Formen:  Dreiecke fliegen von aussen als Drahtgitter herein, drehen sich ein und füllen sich mit ihrem Grau (Mosaik)
//   03 Farben:  drei Wellen, je ein Farbkanal (Rot, Grün, Blau) aus einer anderen Richtung, getragen von einem transparenten geometrischen
//               Körper (Geodäte, Dodekaeder, Ikosaeder, je mit einem gegenläufig drehenden Körper im Innern), der aus dem Ursprung der Welle
//               wächst; wo sein Umriss durchläuft, springen die Dreiecke kurz auf, blitzen und bekommen diesen Kanal (übersättigt, dann ruhig);
//               jede Welle stösst die Kamera kurz an, das Gitter verschwindet
//   04 Bild:    das Mosaik löst sich auf; dahinter kommt feine Geometrie aus dem Foto selbst zum Vorschein, vom Schwerpunkt der Umrisse aus:
//               Höhenlinien der Helligkeit in den Farben des Fotos (Stufe um Stufe, leicht gegeneinander schimmernd) und das haarfeine Netz aller
//               Dreieckskanten; grosse Splitter des Fotos stürzen gedreht herein und legen sich leicht durchscheinend davor, erst einzeln, dann
//               immer schneller, mit Erschütterung beim Aufprall; dann ein Weissblitz, die Kamera springt näher und die drei Farbkanäle rasten ein
//               (RGB-Versatz, schwingt aus), das Foto steht
// (Wünsche vom 15. Oktober 2026: «das Einfügen der Farben und das Finden des Schlussbilds dürften noch etwas dynamischer und spektakulärer erfolgen»;
//  «auf dem ganzen Bild soll nochmals etwas passieren, mit Formen und Linien, nochmals mehr komplexe Geometrie»; «die Kreise sind nix, viel zu grob,
//  ich möchte feine Geometrie, eher aus bzw. hinter dem Bild als einfach darüber gelegt»; «die farbigen Kreise sind too much … lieber ersetzen durch
//  komplexe transparente geometrische Körper»)
// An den Übergängen ein kurzer Bildfehler (verschobene Streifen), dazu auf Wunsch eine feine Beschriftung wie in einem
// Werkzeug für Bildverarbeitung (Phase, Zähler, Zeitcode, Eckmarken). Am Schluss auf Wunsch das Signet von ornament.cloud, kurz und doppelt so schnell.
import { FPS, anteil, weich, sanft, inOut, ausblenden, klemm, zeitachse, zeitcode, PHASEN, SIGNET_VON, SIGNET_TEMPO } from "./ablauf.js?v=7";
import { signet as signetZeichnen } from "../sketchory/signet.js?v=8";
import { zufall, auszuege, delaunay } from "./fragmente.js?v=7";
import { KOERPER, abbilden } from "./koerper.js?v=7";

export const FARBEN = {
  schwarz: { grund: "#000000", tinte: "#ffffff", punkt: "#f08a5d", hell: true },
  weiss: { grund: "#ffffff", tinte: "#000000", punkt: "#c2410c", hell: false },
};
const MONO = 'ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Mono", Menlo, Consolas, "Liberation Mono", monospace';
const GLITCH = 0.24;   // so lange dauert ein Bildfehler an einem Übergang (Sekunden)

/**
 * Szene aus dem Ergebnis von zerlegen() (fragmente.js). optionen: breite, hoehe (Film), tempo ("ruhig" | "normal" | "schnell"),
 * grund ("schwarz" | "weiss"), signet (Abspann), beschriftung (an/aus), titel (oben links), foto (das zugeschnittene Foto in Filmgrösse,
 * Canvas), leinwand(w, h) → Canvas, vorrat (ein Objekt, das Szenen desselben Fotos teilen: die Farbauszüge).
 */
export function szene(daten, { breite = daten.breite ?? 1080, hoehe = daten.hoehe ?? 1920, tempo = "normal", grund = "schwarz", signet = true, beschriftung = true, titel = "",
  foto = null, leinwand, vorrat = null } = {}) {
  const zeit = zeitachse({ tempo, signet });
  const { ab } = zeit, f = zeit.tempo;
  const rnd = zufall(daten.dreiecke.n * 31 + daten.kanten.length * 7 + 11);
  const [L0, L1] = ab.linien, [F0, F1] = ab.formen, [C0, C1] = ab.farben, [Z0, Z1] = ab.zusammen;
  const Ld = L1 - L0, Fd = F1 - F0, Cd = C1 - C0, Zd = Z1 - Z0;

  // Zeilen: Helligkeit gespreizt (2. bis 98. Perzentil), jede Linie mit ihrem Auftritt
  const z = daten.zeilen, sortiert = Float32Array.from(z.werte).sort();
  const lo = sortiert[Math.floor(sortiert.length * 0.02)] ?? 0, hi = sortiert[Math.floor(sortiert.length * 0.98)] ?? 1;
  const relief = z.werte.map((v) => klemm((v - lo) / Math.max(0.05, hi - lo)));
  const zeilen = { ...z, relief, auftritt: Array.from({ length: z.reihen }, (_, r) => L0 + (r / Math.max(1, z.reihen - 1)) * 0.4 * Ld) };

  // Kanten: von oben nach unten, mit etwas Zufall; lange brauchen länger
  const kVon = L0 + 0.3 * Ld, kBis = L1 + 0.1 * Fd, spanne = kBis - kVon;
  const kanten = daten.kanten.map((k) => {
    const dauer = klemm(0.3 + k.laenge / 1500, 0.3, 1.5) * f;
    const von = Math.min(kBis - dauer, kVon + (k.oben / hoehe) * 0.6 * spanne + rnd() * 0.25 * spanne);
    return { pts: k.pts, von, bis: von + dauer };
  });

  // Dreiecke: Schwerpunkt, Ecken relativ dazu (um 0,8 Filmpunkte vergrössert, damit keine Fugen bleiben), Flug, Farbwellen
  const D = daten.dreiecke, n = D.n, mx = breite / 2, my = hoehe / 2, diag = Math.hypot(breite, hoehe);
  const flug = 1.05 * f, faerben = 0.32 * f;
  // 03 Farben: drei Wellen, je ein Farbkanal, von unten links (Rot), oben rechts (Grün) und aus der Mitte (Blau)
  const wellen = [[0.1, 0.9], [0.9, 0.1], [0.5, 0.45]].map(([qx, qy], c) => {
    const x = qx * breite, y = qy * hoehe, weit = Math.max(...[[0, 0], [breite, 0], [0, hoehe], [breite, hoehe]].map(([a, b]) => Math.hypot(a - x, b - y)));
    return { x, y, weit, von: C0 + [0.02, 0.22, 0.42][c] * Cd, dauer: 0.38 * Cd, form: ["geode", "dodekaeder", "ikosaeder"][c], innen: ["dodekaeder", "ikosaeder", "geode"][c] };
  });
  const dreiecke = new Array(n);
  for (let i = 0; i < n; i++) {
    const e = D.ecken.subarray(6 * i, 6 * i + 6);
    const cx = (e[0] + e[2] + e[4]) / 3, cy = (e[1] + e[3] + e[5]) / 3;
    const rel = new Float32Array(6);
    for (let k = 0; k < 3; k++) {
      const dx = e[2 * k] - cx, dy = e[2 * k + 1] - cy, l = Math.hypot(dx, dy) || 1, g = (l + 0.8) / l;
      rel[2 * k] = dx * g; rel[2 * k + 1] = dy * g;
    }
    const [r, g, b] = [D.farben[3 * i], D.farben[3 * i + 1], D.farben[3 * i + 2]], grau = Math.round(D.hell[i] * 255);
    // Flug: von aussen, entlang der Richtung von der Mitte zum Dreieck; die mittleren landen zuerst
    const ab0 = Math.hypot(cx - mx, cy - my), w = rnd() * Math.PI * 2;
    const rx = ab0 > 1 ? (cx - mx) / ab0 : Math.cos(w), ry = ab0 > 1 ? (cy - my) / ab0 : Math.sin(w);
    const weite = (0.25 + 0.55 * rnd()) * diag;
    const land = F0 + (0.12 + (ab0 / (diag / 2)) * 0.55 + rnd() * 0.12) * Fd;
    // Farbe: jeder Kanal, sobald seine Welle hier durchläuft
    const wann = Float32Array.from(wellen, (w) => w.von + (Math.hypot(cx - w.x, cy - w.y) / w.weit) * w.dauer + rnd() * 0.03);
    dreiecke[i] = { cx, cy, rel, grau, r, g, b, land, ox: rx * weite + (rnd() - 0.5) * 0.12 * diag, oy: ry * weite + (rnd() - 0.5) * 0.12 * diag,
      dreh: (rnd() - 0.5) * Math.PI * 2.4, wann };
  }
  const ersterFlug = dreiecke.reduce((m, d) => Math.min(m, d.land - flug), Infinity);

  // 04 Bild: grosse Splitter des Fotos (ein grobes Delaunay-Mosaik); die äusseren landen zuerst, die Mitte zuletzt, im Takt immer schneller
  const splitterFlug = 0.5 * f, roh = grobeSplitter(breite, hoehe, rnd);
  const reihe = roh.map((e, k) => [k, Math.hypot((e[0] + e[2] + e[4]) / 3 - mx, (e[1] + e[3] + e[5]) / 3 - my) + rnd() * diag * 0.12]).sort((a, b) => b[1] - a[1]);
  const mittel = (breite * hoehe) / roh.length;
  const splitter = reihe.map(([k], nr) => {
    const e = roh[k], cx = (e[0] + e[2] + e[4]) / 3, cy = (e[1] + e[3] + e[5]) / 3, rel = new Float32Array(6);
    for (let j = 0; j < 3; j++) {
      const dx = e[2 * j] - cx, dy = e[2 * j + 1] - cy, l = Math.hypot(dx, dy) || 1, g = (l + 0.6) / l;
      rel[2 * j] = dx * g; rel[2 * j + 1] = dy * g;
    }
    const u = reihe.length > 1 ? nr / (reihe.length - 1) : 1, ab0 = Math.hypot(cx - mx, cy - my), w = rnd() * Math.PI * 2;
    const rx = ab0 > 1 ? (cx - mx) / ab0 : Math.cos(w), ry = ab0 > 1 ? (cy - my) / ab0 : Math.sin(w), weite = (0.55 + 0.5 * rnd()) * diag;
    const flaeche = Math.abs((e[2] - e[0]) * (e[5] - e[1]) - (e[4] - e[0]) * (e[3] - e[1])) / 2;
    return { cx, cy, rel, land: Z0 + (0.14 + 0.58 * u ** 0.72) * Zd, ox: rx * weite + (rnd() - 0.5) * 0.3 * diag, oy: ry * weite + (rnd() - 0.5) * 0.3 * diag,
      dreh: (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.9) * Math.PI, gross: 1.5 + rnd() * 0.7, stoss: Math.min(16, 8 * Math.sqrt(flaeche / mittel)), wink: rnd() * Math.PI * 2,
      x0: Math.max(0, Math.floor(Math.min(e[0], e[2], e[4]) - 2)), y0: Math.max(0, Math.floor(Math.min(e[1], e[3], e[5]) - 2)),
      x1: Math.min(breite, Math.ceil(Math.max(e[0], e[2], e[4]) + 2)), y1: Math.min(hoehe, Math.ceil(Math.max(e[1], e[3], e[5]) + 2)) };
  });
  const letzte = splitter.reduce((m, s) => Math.max(m, s.land), Z0);
  const einrasten = [Math.min(Z1 - 0.1, letzte + 0.08), Z1 + 0.35];

  // Geometrie über dem ganzen Bild: der Schwerpunkt der Umrisse (zur Mitte hin gezogen), das Netz aller Dreieckskanten, die Konstruktion
  let fx = 0, fy = 0, fn = 0;
  for (const k of daten.kanten) for (let i = 0; i < k.pts.length; i += 2) { fx += k.pts[i]; fy += k.pts[i + 1]; fn++; }
  const fokus = fn ? [klemm(0.5 * mx + 0.5 * (fx / fn), breite * 0.3, breite * 0.7), klemm(0.5 * my + 0.5 * (fy / fn), hoehe * 0.3, hoehe * 0.7)] : [mx, my];
  const fWeit = Math.max(...[[0, 0], [breite, 0], [0, hoehe], [breite, hoehe]].map(([a, b]) => Math.hypot(a - fokus[0], b - fokus[1])));
  const gesehen = new Set(), linien = [];
  for (let i = 0; i < n; i++) for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
    const x1 = D.ecken[6 * i + 2 * a], y1 = D.ecken[6 * i + 2 * a + 1], x2 = D.ecken[6 * i + 2 * b], y2 = D.ecken[6 * i + 2 * b + 1];
    const k1 = `${Math.round(x1)},${Math.round(y1)}`, k2 = `${Math.round(x2)},${Math.round(y2)}`, k = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
    if (gesehen.has(k)) continue;
    gesehen.add(k);
    // jede Kante wächst vom Ende nahe am Schwerpunkt aus
    const d1 = Math.hypot(x1 - fokus[0], y1 - fokus[1]), d2 = Math.hypot(x2 - fokus[0], y2 - fokus[1]);
    linien.push(d1 <= d2 ? [x1, y1, x2, y2, d1] : [x2, y2, x1, y1, d2]);
  }
  const netz = { pts: new Float32Array(linien.length * 4), zeit: new Float32Array(linien.length) };
  linien.forEach(([x1, y1, x2, y2, d], i) => {
    netz.pts.set([x1, y1, x2, y2], 4 * i);
    netz.zeit[i] = Z0 + (0.04 + (d / fWeit) * 0.4) * Zd + rnd() * 0.06;
  });
  const geometrie = { fokus, weit: fWeit, netz, von: Z0, auf: 0.5 * Zd, hoehen: daten.hoehen ?? [], pfade: null };

  return {
    breite, hoehe, zeit, farben: FARBEN[grund] ?? FARBEN.schwarz, grund: FARBEN[grund] ? grund : "schwarz", signet, beschriftung, titel: (titel || "Bildfragmentieren").trim(),
    foto, leinwand, vorrat: vorrat ?? {}, zeilen, kanten, dreiecke, flug, faerben, wellen, ersterFlug, splitter, splitterFlug, einrasten, geometrie,
    glitches: [F0, C0, Z0, einrasten[0]], zahl: { zeilen: z.reihen, kanten: kanten.length, dreiecke: n, splitter: splitter.length },
  };
}

/** grobes Mosaik für die Splitter des Fotos: Ecken, Rand und rund zwei Dutzend Punkte innen mit Mindestabstand; Ecken je Dreieck [x, y, …] */
function grobeSplitter(B, H, rnd) {
  const px = [0, B, 0, B], py = [0, 0, H, H];
  for (let k = 1; k < 4; k++) { px.push((k * B) / 4 + (rnd() - 0.5) * B * 0.08, (k * B) / 4 + (rnd() - 0.5) * B * 0.08); py.push(0, H); }
  for (let k = 1; k < 5; k++) { py.push((k * H) / 5 + (rnd() - 0.5) * H * 0.06, (k * H) / 5 + (rnd() - 0.5) * H * 0.06); px.push(0, B); }
  const zahl = 26, abstand = Math.sqrt((B * H) / zahl) * 0.72;
  for (let v = 0, innen = 0; v < 4000 && innen < zahl; v++) {
    const x = B * (0.06 + 0.88 * rnd()), y = H * (0.05 + 0.9 * rnd());
    if (px.every((qx, i) => Math.hypot(qx - x, py[i] - y) >= abstand)) { px.push(x); py.push(y); innen++; }
  }
  const idx = delaunay(px, py), aus = [];
  for (let t = 0; t < idx.length; t += 3) aus.push(Float32Array.from([0, 1, 2].flatMap((j) => [px[idx[t + j]], py[idx[t + j]]])));
  return aus;
}

// ---------- 01 Linien ----------

/** die abtastenden Linien: jede hebt sich mit der Helligkeit, verdeckt, was hinter ihr liegt, und beruhigt sich */
function zeilenZeichnen(ctx, sz, t, sicht) {
  const Z = sz.zeilen, F = sz.farben, f = sz.zeit.tempo, A = Z.abstand * 2.3;
  ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.strokeStyle = F.tinte; ctx.fillStyle = F.grund;
  ctx.globalAlpha = sicht;
  const xs = new Float32Array(Z.spalten), ys = new Float32Array(Z.spalten);
  for (let r = 0; r < Z.reihen; r++) {
    const a = Z.auftritt[r];
    if (t < a) break;
    const lauf = sanft(anteil(t, a, a + 0.55 * f)), hub = A * weich(anteil(t, a + 0.15, a + 1.5 * f)), welle = Z.abstand * 0.45 * (1 - anteil(t, a, a + 2.4 * f));
    const y0 = Z.oben + r * Z.abstand, bis = lauf * (Z.spalten - 1);
    const m = Math.min(Z.spalten - 1, Math.ceil(bis));
    if (m < 1) continue;
    for (let s = 0; s <= m; s++) {
      const x = Math.min(s, bis) * Z.schritt, k = Math.min(s, bis);
      const k0 = Math.floor(k), u = k - k0, v = Z.relief[r * Z.spalten + k0] * (1 - u) + (Z.relief[r * Z.spalten + Math.min(Z.spalten - 1, k0 + 1)] ?? 0) * u;
      xs[s] = x; ys[s] = y0 - hub * v - Math.sin(x * 0.012 + t * 3.1 + r * 0.55) * welle;
    }
    // verdecken: die Fläche unter der Linie bis knapp unter ihre Grundlinie
    ctx.beginPath(); ctx.moveTo(xs[0], y0 + Z.abstand * 0.7);
    for (let s = 0; s <= m; s++) ctx.lineTo(xs[s], ys[s]);
    ctx.lineTo(xs[m], y0 + Z.abstand * 0.7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(xs[0], ys[0]);
    for (let s = 1; s <= m; s++) ctx.lineTo(xs[s], ys[s]);
    ctx.stroke();
  }
  // der Abtaster: eine helle Linie, die von oben nach unten über das Bild läuft
  const [L0] = sz.zeit.ab.linien, letzte = Z.auftritt[Z.auftritt.length - 1], q = anteil(t, L0, letzte);
  const hellLinie = (1 - anteil(t, letzte, letzte + 0.4)) * anteil(t, L0, L0 + 0.15);
  if (hellLinie > 0) {
    const y = Z.oben + q * (Z.reihen - 1) * Z.abstand;
    ctx.globalAlpha = sicht * hellLinie * 0.9; ctx.fillStyle = F.tinte; ctx.fillRect(0, y - 1.5, sz.breite, 3);
    ctx.globalAlpha = sicht * hellLinie * 0.12; ctx.fillRect(0, y - 26, sz.breite, 52);
  }
  ctx.globalAlpha = 1;
}

/** die Umrisse: jeder Zug zeichnet sich in seiner Zeit, zweimal gezogen (breit und blass, dann fein) für ein leichtes Leuchten */
function kantenZeichnen(ctx, sz, t, sicht) {
  const pfad = new Path2D();
  let etwas = false;
  for (const k of sz.kanten) {
    if (t <= k.von) continue;
    const q = sanft(anteil(t, k.von, k.bis)), p = k.pts, n = p.length / 2, bis = q * (n - 1);
    pfad.moveTo(p[0], p[1]);
    const ganz = Math.floor(bis);
    for (let i = 1; i <= ganz; i++) pfad.lineTo(p[2 * i], p[2 * i + 1]);
    if (ganz < n - 1) { const u = bis - ganz; pfad.lineTo(p[2 * ganz] + (p[2 * ganz + 2] - p[2 * ganz]) * u, p[2 * ganz + 1] + (p[2 * ganz + 3] - p[2 * ganz + 1]) * u); }
    etwas = true;
  }
  if (!etwas) return;
  ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = sz.farben.tinte;
  ctx.globalAlpha = sicht * 0.16; ctx.lineWidth = 7; ctx.stroke(pfad);
  ctx.globalAlpha = sicht * 0.95; ctx.lineWidth = 2.2; ctx.stroke(pfad);
  ctx.globalAlpha = 1;
}

// ---------- 02 Formen, 03 Farben, 04 Bild ----------

/** Ecken eines Dreiecks zur Zeit t: im Flug versetzt, gedreht und kleiner; gross: Vergrösserung beim Aufspringen */
function ecken(d, e, gross, aus) {
  const s = (0.25 + 0.75 * e) * gross, w = d.dreh * (1 - e), c = Math.cos(w) * s, si = Math.sin(w) * s, ox = d.ox * (1 - e), oy = d.oy * (1 - e);
  for (let k = 0; k < 3; k++) {
    const x = d.rel[2 * k], y = d.rel[2 * k + 1];
    aus[2 * k] = d.cx + ox + x * c - y * si; aus[2 * k + 1] = d.cy + oy + x * si + y * c;
  }
  return aus;
}
const dreieckPfad = (ctx, p) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.lineTo(p[4], p[5]); ctx.closePath(); };

function dreieckeZeichnen(ctx, sz, t) {
  const F = sz.farben, { ab } = sz.zeit, flug = sz.flug, p = new Float32Array(6);
  const [F0] = ab.formen, [C0, C1] = ab.farben, [Z0, Z1] = ab.zusammen;
  const gitterFlug = new Path2D(), gitterRuhig = new Path2D();
  // das Gitter der gelandeten Dreiecke wird blasser und verschwindet, während die Farben kommen
  const gitterRuhe = 0.3 * (1 - anteil(t, C0, C0 + 0.5 * (C1 - C0)));
  const farbe = (grau, ziel, q) => grau + (ziel - grau) * (q + 0.7 * Math.sin(Math.PI * q));
  for (const d of sz.dreiecke) {
    const start = d.land - flug;
    if (t < start) continue;
    const e = inOut(anteil(t, start, d.land));
    // Füllung: zuerst Grau, dann Kanal um Kanal, wie die Wellen durchlaufen (je kurz übersättigt), beim Durchlaufen aufspringen und blitzen
    const deck = anteil(t, d.land - 0.3 * flug, d.land + 0.35);
    let gross = 1;
    if (deck > 0) {
      const w = d.wann, f = sz.faerben;
      let blitz = 0;
      for (let c = 0; c < 3; c++) blitz = Math.max(blitz, Math.sin(Math.PI * anteil(t, w[c] - 0.04, w[c] + 0.24)));
      // kurz aufspringen, kaum aufhellen (ein weisser Blitz an der Front würde wieder als Ring lesen)
      gross = 1 + 0.16 * blitz;
      const weiss = 0.08 * blitz * blitz;
      const kanal = (c, ziel) => { const v = klemm(farbe(d.grau, ziel, anteil(t, w[c], w[c] + f)), 0, 255); return (v + (255 - v) * weiss) | 0; };
      ctx.globalAlpha = deck; ctx.fillStyle = `rgb(${kanal(0, d.r)},${kanal(1, d.g)},${kanal(2, d.b)})`;
      ctx.beginPath(); dreieckPfad(ctx, ecken(d, e, gross, p)); ctx.fill();
    }
    // Drahtgitter: im Flug kräftig, gelandet blass
    if (e < 1) dreieckPfad(gitterFlug, ecken(d, e, 1, p));
    else if (gitterRuhe > 0) dreieckPfad(gitterRuhig, ecken(d, 1, 1, p));
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = F.tinte; ctx.lineJoin = "round";
  ctx.globalAlpha = 0.85; ctx.lineWidth = 1.6; ctx.stroke(gitterFlug);
  if (gitterRuhe > 0) { ctx.globalAlpha = gitterRuhe * anteil(t, F0, F0 + 0.4); ctx.lineWidth = 1.2; ctx.stroke(gitterRuhig); }
  // beim Zusammensetzen löst sich das Mosaik fast ganz auf, damit die Geometrie dahinter zum Vorschein kommt
  const zurueck = 0.88 * sanft(anteil(t, Z0, Z0 + 0.4 * (Z1 - Z0)));
  if (zurueck > 0) { ctx.globalAlpha = zurueck; ctx.fillStyle = F.grund; ctx.fillRect(-40, -40, sz.breite + 80, sz.hoehe + 80); }
  ctx.globalAlpha = 1;
}

/** die Farbwellen als transparente geometrische Körper: jeder wächst aus dem Ursprung seiner Welle, dreht sich langsam und trägt einen kleineren,
 *  gegenläufig drehenden Körper in sich. Dünne Konturen ohne Farbe (vorn deutlicher als hinten), gläserne Flächen, kleine Punkte an den Ecken. */
function koerperZeichnen(ctx, sz, t) {
  const weiss = sz.grund === "weiss", tinte = sz.farben.tinte;
  sz.wellen.forEach((w, c) => {
    const p = (t - w.von) / w.dauer;
    if (p <= 0 || p >= 1.2) return;
    const sicht = anteil(p, 0, 0.1) * (1 - anteil(p, 0.75, 1.2)), r = (Math.min(1.1, p) * w.weit) / 1.12;
    const u = t - w.von, lage = (k) => [u * 0.55 + c * 1.3 + k, u * 0.42 + c * 0.7 + k * 0.6, u * 0.12 + c];
    koerper(ctx, KOERPER[w.form], abbilden(KOERPER[w.form], w.x, w.y, r, lage(0)), sicht, weiss, tinte);
    koerper(ctx, KOERPER[w.innen], abbilden(KOERPER[w.innen], w.x, w.y, r * 0.56, lage(2).map((x) => -1.4 * x)), sicht * 0.85, weiss, tinte);
  });
}

function koerper(ctx, k, pts, sicht, weiss, tinte) {
  if (sicht <= 0) return;
  ctx.save();
  // gläserne Flächen: jede einzeln, ganz leicht, damit sich Überlagerungen verdichten
  if (k.flaechen.length) {
    ctx.globalCompositeOperation = weiss ? "source-over" : "lighter";
    // je mehr Flächen, desto zarter jede (sonst wird die Geodäte milchig)
    ctx.fillStyle = tinte; ctx.globalAlpha = (weiss ? 0.014 : 0.022) * Math.sqrt(20 / k.flaechen.length) * sicht;
    for (const [a, b, c] of k.flaechen) {
      ctx.beginPath(); ctx.moveTo(pts[a][0], pts[a][1]); ctx.lineTo(pts[b][0], pts[b][1]); ctx.lineTo(pts[c][0], pts[c][1]); ctx.closePath(); ctx.fill();
    }
  }
  ctx.globalCompositeOperation = "source-over";
  // Kanten: vorn deutlich, hinten zart
  const vorn = new Path2D(), hinten = new Path2D(), ecken = new Path2D();
  for (const [a, b] of k.kanten) { const z = pts[a][2] + pts[b][2], pfad = z >= 0 ? vorn : hinten; pfad.moveTo(pts[a][0], pts[a][1]); pfad.lineTo(pts[b][0], pts[b][1]); }
  for (const [x, y, z] of pts) if (z > 0.15) { ecken.moveTo(x + 2.2, y); ecken.arc(x, y, 2.2, 0, Math.PI * 2); }
  ctx.strokeStyle = tinte; ctx.fillStyle = tinte; ctx.lineJoin = "round"; ctx.lineCap = "round";
  ctx.globalAlpha = 0.28 * sicht; ctx.lineWidth = 0.9; ctx.stroke(hinten);
  ctx.globalAlpha = 0.8 * sicht; ctx.lineWidth = 1.2; ctx.stroke(vorn);
  ctx.globalAlpha = 0.9 * sicht; ctx.fill(ecken);
  ctx.restore();
}

/** die Splitter des Fotos: gelandete mit einer gemeinsamen Maske, fliegende einzeln (gedreht, grösser, als kämen sie von vorn), Blitz beim Aufprall */
function splitterZeichnen(ctx, sz, t) {
  const gelandet = new Path2D(), fliegend = [], blitze = [];
  let da = false;
  const pfad = (z, s) => { z.moveTo(s.cx + s.rel[0], s.cy + s.rel[1]); z.lineTo(s.cx + s.rel[2], s.cy + s.rel[3]); z.lineTo(s.cx + s.rel[4], s.cy + s.rel[5]); z.closePath(); };
  for (const s of sz.splitter) {
    const start = s.land - sz.splitterFlug;
    if (t < start) continue;
    if (t >= s.land) { pfad(gelandet, s); da = true; if (t < s.land + 0.35) blitze.push(s); }
    else fliegend.push(s);
  }
  // die Splitter liegen leicht durchscheinend vor der Geometrie und werden bis zum Einrasten dichter
  const dicht = 0.78 + 0.17 * anteil(t, sz.zeit.ab.zusammen[0], sz.einrasten[0]);
  if (da) { ctx.save(); ctx.clip(gelandet); ctx.globalAlpha = dicht; ctx.drawImage(sz.foto, 0, 0, sz.breite, sz.hoehe); ctx.restore(); }
  for (const s of blitze) {
    const b = 1 - anteil(t, s.land, s.land + 0.35);
    ctx.beginPath(); pfad(ctx, s);
    ctx.globalAlpha = 0.22 * b ** 4; ctx.fillStyle = "#ffffff"; ctx.fill();
    ctx.globalAlpha = b * b; ctx.strokeStyle = sz.farben.tinte; ctx.lineWidth = 1.2 + 2.5 * b; ctx.lineJoin = "round"; ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (const s of fliegend) {
    const q = anteil(t, s.land - sz.splitterFlug, s.land), e = q ** 2.2, w = s.dreh * (1 - e), g = 1 + (s.gross - 1) * (1 - e);
    ctx.save();
    ctx.globalAlpha = Math.min(1, q * 6) * dicht;
    ctx.translate(s.cx + s.ox * (1 - e), s.cy + s.oy * (1 - e)); ctx.rotate(w); ctx.scale(g, g); ctx.translate(-s.cx, -s.cy);
    ctx.beginPath(); pfad(ctx, s);
    ctx.save(); ctx.clip();
    const bw = s.x1 - s.x0, bh = s.y1 - s.y0;
    if (bw > 0 && bh > 0) ctx.drawImage(sz.foto, s.x0, s.y0, bw, bh, s.x0, s.y0, bw, bh);
    ctx.restore();
    ctx.strokeStyle = sz.farben.tinte; ctx.globalAlpha *= 0.7; ctx.lineWidth = 1.2 / g; ctx.stroke();
    ctx.restore();
  }
}

/** feine Geometrie aus dem Foto, hinter den Splittern (04 Bild): Höhenlinien der Helligkeit in den Farben des Fotos und das haarfeine Netz aller
 *  Dreieckskanten; sie kommen vom Schwerpunkt der Umrisse aus zum Vorschein (eine wachsende runde Öffnung), die Höhenlinien Stufe um Stufe und
 *  leicht gegeneinander bewegt, sodass sie schimmern. Auf Schwarz leuchtend (addiert), auf Weiss als feine dunkle Linien (multipliziert). */
function geometrieZeichnen(ctx, sz, t) {
  const G = sz.geometrie, [fx, fy] = G.fokus, f = sz.zeit.tempo, weiss = sz.grund === "weiss";
  if (t < G.von || t >= sz.einrasten[0]) return;
  const auf = weich(anteil(t, G.von, G.von + G.auf)), sicht = anteil(t, G.von, G.von + 0.3);
  ctx.save();
  ctx.beginPath(); ctx.arc(fx, fy, Math.max(1, auf * G.weit * 1.02), 0, Math.PI * 2); ctx.clip();
  ctx.globalCompositeOperation = weiss ? "multiply" : "lighter";
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  // Höhenlinien: einmal als Pfade gebaut, Stufe um Stufe sichtbar, jede leicht in ihrer eigenen Richtung bewegt
  G.pfade ??= G.hoehen.map((stufe) => { const p = new Path2D(), q = stufe.pts; for (let k = 0; k < q.length; k += 4) { p.moveTo(q[k], q[k + 1]); p.lineTo(q[k + 2], q[k + 3]); } return p; });
  const zahl = G.pfade.length;
  G.pfade.forEach((pfad, k) => {
    const a = anteil(t, G.von + (k / Math.max(1, zahl)) * 0.35 * G.auf, G.von + (k / Math.max(1, zahl)) * 0.35 * G.auf + 0.5 * f);
    if (a <= 0) return;
    const [r, g, b] = G.hoehen[k].farbe, m = weiss ? 0.75 : 0.45;
    const farbe = weiss ? `rgb(${(r * m) | 0},${(g * m) | 0},${(b * m) | 0})` : `rgb(${(r + (255 - r) * m) | 0},${(g + (255 - g) * m) | 0},${(b + (255 - b) * m) | 0})`;
    ctx.save();
    ctx.translate(Math.sin(t * 1.3 + k * 0.9) * 2.4, Math.cos(t * 1.1 + k * 0.7) * 2.4);
    // flache Enden: runde würden sich an jeder Fuge der Stücke zu hellen Perlen addieren
    ctx.lineCap = "butt"; ctx.strokeStyle = farbe; ctx.globalAlpha = 0.85 * sicht * a; ctx.lineWidth = 1.1; ctx.stroke(pfad);
    ctx.restore();
  });
  // das Netz: jede Kante wächst vom Ende nahe am Schwerpunkt aus, haarfein; an jedem dritten Ende ein kleiner Knoten
  const N = G.netz, linien = new Path2D(), knoten = new Path2D();
  for (let i = 0; i < N.zeit.length; i++) {
    const a = N.zeit[i];
    if (t < a) continue;
    const q = anteil(t, a, a + 0.3 * f), j = 4 * i, x1 = N.pts[j], y1 = N.pts[j + 1], x2 = N.pts[j + 2], y2 = N.pts[j + 3];
    linien.moveTo(x1, y1); linien.lineTo(x1 + (x2 - x1) * q, y1 + (y2 - y1) * q);
    if (q >= 1 && i % 3 === 0) { knoten.moveTo(x2 + 1.6, y2); knoten.arc(x2, y2, 1.6, 0, Math.PI * 2); }
  }
  ctx.strokeStyle = sz.farben.tinte; ctx.fillStyle = sz.farben.tinte;
  ctx.globalAlpha = 0.32 * sicht; ctx.lineWidth = 0.8; ctx.stroke(linien);
  ctx.globalAlpha = 0.6 * sicht; ctx.fill(knoten);
  ctx.restore();
}

/** die Kamera: Stösse bei den Farbwellen, Zittern und Erschütterung beim Aufprall der Splitter; gibt Zoom und Versatz */
function kamera(sz, t) {
  const { ab } = sz.zeit, [Z0, Z1] = ab.zusammen;
  let z = 1, dx = 0, dy = 0;
  for (const w of sz.wellen) { const u = t - w.von; if (u > 0 && u < 2) z += 0.04 * (1 - Math.exp(-u / 0.05)) * Math.exp(-u / 0.35); }
  if (t > Z0 && t < Z1 + 0.5) {
    z += 0.035 * anteil(t, Z0, Z0 + 0.3 * (Z1 - Z0));
    for (const s of sz.splitter) {
      const u = t - s.land;
      if (u <= 0 || u > 0.5) continue;
      const a = s.stoss * Math.exp(-u / 0.09) * Math.sin(u * 75);
      dx += a * Math.cos(s.wink); dy += a * Math.sin(s.wink);
    }
  }
  return { z, dx, dy };
}

/** die drei Farbauszüge als Leinwände (einmal je Foto und Grund, im Vorrat aufgehoben) */
function auszugsBilder(sz) {
  const v = sz.vorrat, schluessel = `auszuege-${sz.grund}`;
  if (v[schluessel] && v.foto === sz.foto) return v[schluessel];
  const B = sz.breite, H = sz.hoehe, quelle = sz.leinwand(B, H), qc = quelle.getContext("2d", { willReadFrequently: true });
  qc.drawImage(sz.foto, 0, 0, B, H);
  const daten = qc.getImageData(0, 0, B, H).data;
  const bilder = auszuege(daten, B, H, sz.grund).map((d) => { const c = sz.leinwand(B, H); c.getContext("2d").putImageData(new ImageData(d, B, H), 0, 0); return c; });
  if (v.foto !== sz.foto) for (const k of Object.keys(v)) if (k.startsWith("auszuege-")) delete v[k];
  v.foto = sz.foto; v[schluessel] = bilder;
  return bilder;
}

/** die Farbauszüge im Voraus rechnen (sonst stockt die Vorschau einmal kurz beim Einrasten) */
export function vorbereiten(sz) { if (sz.foto) auszugsBilder(sz); }

/** das Foto, zum Schluss langsam etwas näher; beim Einrasten mit auseinanderlaufenden Farbkanälen, die ausschwingen */
function fotoZeichnen(ctx, sz, t) {
  const { ab } = sz.zeit, B = sz.breite, H = sz.hoehe;
  const ende = ab.bildAus ? ab.bildAus[1] : ab.schluss[1];
  const [e0, e1] = sz.einrasten, u = anteil(t, e0, e1);
  // beim Einrasten springt die Kamera näher und federt zurück, dann kommt das Foto langsam etwas näher
  const punch = 0.08 * (1 - weich(anteil(t, e0, e0 + 0.8)));
  const z = (1 + punch) * (1 + 0.035 * sanft(anteil(t, ab.stehen[0], ende))), w = B * z, h = H * z, x = (B - w) / 2, y = (H - h) / 2;
  const versatz = t < e1 ? 64 * (1 - u) ** 2 * Math.cos(u * 11) : 0;
  if (Math.abs(versatz) < 0.4) { ctx.drawImage(sz.foto, x, y, w, h); return; }
  const [rot, gruen, blau] = auszugsBilder(sz);
  ctx.save();
  ctx.fillStyle = sz.farben.grund; ctx.fillRect(0, 0, B, H);
  ctx.globalCompositeOperation = sz.grund === "weiss" ? "multiply" : "lighter";
  ctx.drawImage(rot, x - versatz, y, w, h);
  ctx.drawImage(gruen, x, y + versatz * 0.35, w, h);
  ctx.drawImage(blau, x + versatz, y, w, h);
  ctx.restore();
}

// ---------- Übergänge und Beschriftung ----------

/** kurzer Bildfehler an den Übergängen: waagrechte Streifen des fertigen Bilds, seitlich verschoben */
function bildfehler(ctx, sz, t) {
  sz.glitches.forEach((g, k) => {
    const u = (t - g) / GLITCH;
    if (u < 0 || u >= 1) return;
    const c = ctx.canvas, W = c.width, H = c.height;
    if (!sz.kratzer || sz.kratzer.width !== W || sz.kratzer.height !== H) sz.kratzer = sz.leinwand(W, H);
    const kc = sz.kratzer.getContext("2d");
    kc.clearRect(0, 0, W, H); kc.drawImage(c, 0, 0);
    const rnd = zufall(977 * (k + 1) + Math.floor(t * FPS));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    const staerke = Math.sin(Math.PI * u);
    for (let i = 0; i < 9; i++) {
      const y = Math.floor(rnd() * H), h = Math.max(2, Math.floor((0.006 + rnd() * 0.05) * H)), dx = Math.round((rnd() - 0.5) * 0.2 * W * staerke);
      ctx.drawImage(sz.kratzer, 0, y, W, h, dx, y, W, h);
    }
    ctx.restore();
  });
}

/** Beschriftung: Titel und Zeitcode oben, Phase mit Fortschritt und Zähler unten, Eckmarken */
function beschriftung(ctx, sz, t, sicht) {
  const { ab } = sz.zeit, B = sz.breite, H = sz.hoehe, F = sz.farben, s = Math.min(B, H) / 1080, rand = 54 * s, g = Math.round(22 * s);
  ctx.save();
  ctx.globalAlpha = sicht * 0.85;
  ctx.fillStyle = F.tinte; ctx.strokeStyle = F.tinte; ctx.lineWidth = 1.5 * s;
  // Eckmarken
  const m = 26 * s, e = rand * 0.55;
  ctx.beginPath();
  for (const [x, y, dx, dy] of [[e, e, 1, 1], [B - e, e, -1, 1], [e, H - e, 1, -1], [B - e, H - e, -1, -1]]) { ctx.moveTo(x + dx * m, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * m); }
  ctx.stroke();
  ctx.font = `500 ${g}px ${MONO}`; ctx.textBaseline = "alphabetic";
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${(0.08 * g).toFixed(1)}px`;
  const oben = rand + g;
  ctx.textAlign = "left"; ctx.fillText(sz.titel.toUpperCase().slice(0, 40), rand, oben);
  ctx.textAlign = "right"; ctx.fillText(zeitcode(t), B - rand, oben);
  // Phase: Nummer, Name, Fortschritt als feine Linie, darunter der Zähler
  let nr = 0;
  PHASEN.forEach(([name], i) => { if (t >= ab[name][0] - 0.05) nr = i; });
  const [name, titel] = PHASEN[nr], [a, b] = ab[name], fort = anteil(t, a, b);
  const zahl = (n) => n.toLocaleString("de-CH");
  const kanaele = ["R", "G", "B"].map((k, c) => (t >= sz.wellen[c].von ? k : "·")).join(" ");
  const gelandet = sz.splitter.filter((s) => t >= s.land).length;
  const zaehler = [`zeilen ${zahl(sz.zahl.zeilen)} · kanten ${zahl(sz.zahl.kanten)}`, `dreiecke ${zahl(sz.zahl.dreiecke)}`, `kanäle ${kanaele}`,
    `fragmente ${gelandet} / ${sz.zahl.splitter}`][nr];
  const unten = H - rand;
  ctx.textAlign = "left";
  ctx.fillText(`0${nr + 1} ${titel.toUpperCase()}`, rand, unten - g * 1.9);
  ctx.globalAlpha = sicht * 0.55; ctx.fillText(zaehler, rand, unten);
  const lb = Math.min(260 * s, B * 0.3), ly = unten - g * 1.9 + g * 0.55;
  ctx.globalAlpha = sicht * 0.3; ctx.fillRect(B - rand - lb, ly - 1, lb, 2 * s);
  ctx.globalAlpha = sicht * 0.85; ctx.fillRect(B - rand - lb, ly - 1, lb * fort, 2 * s);
  ctx.textAlign = "right"; ctx.globalAlpha = sicht * 0.55; ctx.fillText(`${B}×${H} · ${FPS} fps`, B - rand, unten);
  ctx.restore();
}

/** Bild zur Zeit t (Sekunden) */
export function bild(ctx, sz, t) {
  const { ab } = sz.zeit, F = sz.farben, B = sz.breite, H = sz.hoehe;
  const [F0, F1] = ab.formen, [C0, C1] = ab.farben, [L0, L1] = ab.linien;
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = F.grund; ctx.fillRect(0, 0, B, H);
  const fotoAb = sz.foto ? sz.einrasten[0] : Infinity, bildEnde = ab.bildAus ? ab.bildAus[1] : ab.schluss[1];
  if (t < bildEnde) {
    // 01 Linien (verblassen, während die Formen kommen)
    const zSicht = 1 - anteil(t, F0 + 0.15 * (F1 - F0), F0 + 0.65 * (F1 - F0));
    if (t >= L0 && zSicht > 0) zeilenZeichnen(ctx, sz, t, zSicht);
    // 02–04 Dreiecke, Farbwellen und Splitter, mit der Kamera (Stösse, Erschütterung)
    const kam = kamera(sz, t), bewegt = kam.z !== 1 || kam.dx || kam.dy;
    if (bewegt) { ctx.save(); ctx.translate(B / 2 + kam.dx, H / 2 + kam.dy); ctx.scale(kam.z, kam.z); ctx.translate(-B / 2, -H / 2); }
    if (t >= sz.ersterFlug && t < fotoAb) dreieckeZeichnen(ctx, sz, t);
    // die Umrisse liegen über den Formen, bis die Farben kommen
    const kSicht = (1 - 0.6 * anteil(t, F0 + 0.4 * (F1 - F0), F1)) * (1 - anteil(t, C0, C0 + 0.5 * (C1 - C0)));
    if (t >= L0 + 0.3 * (L1 - L0) && kSicht > 0) kantenZeichnen(ctx, sz, t, kSicht);
    if (t >= C0 && t < C1 + 0.5) koerperZeichnen(ctx, sz, t);
    if (t >= ab.zusammen[0] && t < fotoAb) geometrieZeichnen(ctx, sz, t);
    if (sz.foto && t >= ab.zusammen[0] && t < fotoAb) splitterZeichnen(ctx, sz, t);
    if (bewegt) ctx.restore();
    // das Foto rastet ein (mit einem Weissblitz) und steht
    if (t >= fotoAb) {
      fotoZeichnen(ctx, sz, t);
      const blitz = (1 - anteil(t, fotoAb, fotoAb + 0.4)) ** 2;
      if (blitz > 0) { ctx.globalAlpha = 0.75 * blitz; ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, B, H); ctx.globalAlpha = 1; }
      // ein letzter, blasser Abtaster über das fertige Bild
      const q = anteil(t, ab.stehen[0], ab.stehen[0] + 1.6);
      if (q > 0 && q < 1) {
        const y = q * H;
        ctx.globalAlpha = 0.22 * Math.sin(Math.PI * q); ctx.fillStyle = F.tinte; ctx.fillRect(0, y - 1, B, 2);
        ctx.globalAlpha = 0.05 * Math.sin(Math.PI * q); ctx.fillRect(0, y - 40, B, 80);
        ctx.globalAlpha = 1;
      }
    }
    if (ab.bildAus) {
      const weg = ausblenden(anteil(t, ab.bildAus[0], ab.bildAus[1]));
      if (weg > 0) { ctx.globalAlpha = weg; ctx.fillStyle = F.grund; ctx.fillRect(0, 0, B, H); ctx.globalAlpha = 1; }
    }
    if (sz.beschriftung) {
      const sicht = anteil(t, ab.vor[0] + 0.1, ab.vor[1] + 0.3) * (1 - anteil(t, ab.stehen[0] - 0.1, ab.stehen[0] + 0.6));
      if (sicht > 0) beschriftung(ctx, sz, t, sicht);
    }
    bildfehler(ctx, sz, t);
  }
  // das Signet von ornament.cloud (wie in Sketchory), bei breiten Formaten in der Mitte
  if (ab.signet && t >= ab.signet[0] && t < ab.signetAus[1]) {
    ctx.save(); ctx.translate((B - 1080) / 2, 0);
    signetZeichnen(ctx, SIGNET_VON + (t - ab.signet[0]) * FPS * SIGNET_TEMPO, { hoehe: H, farben: F });
    ctx.restore();
    const weg = ausblenden(anteil(t, ab.signetAus[0], ab.signetAus[1]));
    if (weg > 0) { ctx.globalAlpha = weg; ctx.fillStyle = F.grund; ctx.fillRect(0, 0, B, H); ctx.globalAlpha = 1; }
  }
}

/** Zeitpunkt für das Standbild, wenn nichts anderes gewählt ist: das fertige farbige Mosaik, kurz bevor die Splitter kommen */
export const standbildZeit = (sz) => sz.zeit.ab.zusammen[0] - 0.05;
