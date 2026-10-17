// «Bildfragmentieren» – ein Bild des Films auf eine Leinwand zeichnen (Vorschau, Video und Standbild verwenden dasselbe).
// Jedes Bild hängt nur von der Zeit ab (kein Gedächtnis zwischen den Bildern), darum kann die Vorschau an jeder Stelle stehen.
//   01 Linien:  waagrechte Linien tasten das Bild ab (von oben nach unten), heben sich mit der Helligkeit zu einem Relief
//               (jede Linie verdeckt, was hinter ihr liegt) und beruhigen sich; dann zieht eine Feder die prägnanten Umrisse nach, einen nach
//               dem anderen, als ruhige, geglättete Kurven (nur die langen; seit dem 15. Oktober 2026, vorher viele kleine Schlaufen zugleich)
//   02 Formen:  Dreiecke fliegen von aussen als Drahtgitter herein, drehen sich ein und bringen ihr Stück eines Stichs mit: das Foto Bildpunkt für
//               Bildpunkt als Schraffur (je dunkler, desto breiter die Linie, ab mittleren Tönen gekreuzt), die Richtung je Dreieck; so bleiben feine
//               Linien und Details erhalten (seit dem 15. Oktober 2026; vorher ein Mittelwert je Dreieck, der z. B. Strichzeichnungen verschluckte)
//   03 Farben:  drei transparente geometrische Körper (Geodäte, Dodekaeder, Ikosaeder, je mit einem gegenläufig drehenden Körper im Innern)
//               wachsen aus drei Richtungen; innerhalb ihres Umrisses nimmt die Schraffur die echten Farben des Fotos an, Bildpunkt für Bildpunkt,
//               darunter erscheint das Foto halb durchscheinend; die Dreiecke springen sanft auf, jeder Körper stösst die Kamera leicht an
//               (seit dem 15. Oktober 2026 ohne Kanaltrennung: Kanal um Kanal gab grelle Zwischenfarben, «Farbbomben»)
//   04 Bild:    das Mosaik tritt zurück, das Foto wird montiert: rund hundert Bauteile, vom Motiv aus Teil an Teil; vor jedem zeichnet sich sein
//               Umriss als Bauplan mit Passkreuzen, dann gleitet es entlang einer Führungslinie an seinen Platz und rastet ein; dann verschwinden
//               Bauplan und Passkreuze, die Farbkanäle rasten ein (RGB-Versatz, schwingt aus), das Foto steht
// (Wünsche vom 15. Oktober 2026: «das Einfügen der Farben und das Finden des Schlussbilds dürften noch etwas dynamischer und spektakulärer erfolgen»;
//  «auf dem ganzen Bild soll nochmals etwas passieren, mit Formen und Linien, nochmals mehr komplexe Geometrie»; «die Kreise sind nix, viel zu grob,
//  ich möchte feine Geometrie, eher aus bzw. hinter dem Bild als einfach darüber gelegt»; «die farbigen Kreise sind too much … lieber ersetzen durch
//  komplexe transparente geometrische Körper»)
// An den Übergängen ein kurzer Bildfehler (verschobene Streifen), dazu auf Wunsch eine feine Beschriftung wie in einem
// Werkzeug für Bildverarbeitung (Phase, Zähler, Zeitcode, Eckmarken). Am Schluss auf Wunsch das Signet von ornament.cloud, kurz und doppelt so schnell.
// Seit dem 16. Oktober 2026 ist das alles der Ablauf «Fragmente»; zur Wahl steht dazu die «Verwandlung» (Strom, Körper, Scherben, Echo, Relief, einzeln oder
// kombiniert; raum.js, WebGL). Auch sie beginnt im Dunkeln und endet beim Foto; ihr Bild kommt fertig aus WebGL (sz.raum) und wird hier nur
// eingesetzt, ebenso ihr leuchtendes Signet.
import { FPS, anteil, weich, sanft, inOut, ausblenden, klemm, zeitachse, zeitcode, SIGNET_VON, SIGNET_TEMPO } from "./ablauf.js?v=31";
import { signet as signetZeichnen, punktLage, PUNKT_RADIUS } from "../sketchory/signet.js?v=10";
import { zufall, auszuege, delaunay } from "./fragmente.js?v=31";
import { KOERPER, abbilden } from "./koerper.js?v=31";

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
  foto = null, leinwand, vorrat = null, ablauf = "fragmente", raum = null } = {}) {
  const zeit = zeitachse({ tempo, signet, ablauf });
  const { ab } = zeit, f = zeit.tempo;
  const rnd = zufall(daten.dreiecke.n * 31 + daten.kanten.length * 7 + 11);
  const [L0, L1] = ab.linien, [F0, F1] = ab.formen, [C0, C1] = ab.farben, [Z0, Z1] = ab.zusammen;
  const Ld = L1 - L0, Fd = F1 - F0, Cd = C1 - C0, Zd = Z1 - Z0;

  // Zeilen: Helligkeit gespreizt (2. bis 98. Perzentil), jede Linie mit ihrem Auftritt
  const z = daten.zeilen, sortiert = Float32Array.from(z.werte).sort();
  const lo = sortiert[Math.floor(sortiert.length * 0.02)] ?? 0, hi = sortiert[Math.floor(sortiert.length * 0.98)] ?? 1;
  const relief = z.werte.map((v) => klemm((v - lo) / Math.max(0.05, hi - lo)));
  const zeilen = { ...z, relief, auftritt: Array.from({ length: z.reihen }, (_, r) => L0 + (r / Math.max(1, z.reihen - 1)) * 0.4 * Ld) };

  // Kanten: wie von einer Feder gezogen, einer nach dem anderen (oben beginnen, dann jeweils der nächstgelegene, wenn nötig umgekehrt), die
  // Zeit nach der Länge verteilt, höchstens gut zwei zugleich; je Zug die Längen entlang der Linie, damit er gleichmässig wächst
  const kVon = L0 + 0.3 * Ld, kBis = L1 + 0.1 * Fd, spanne = kBis - kVon;
  const offen = daten.kanten.map((k) => ({ pts: k.pts, laenge: k.laenge })), federReihe = [];
  let stift = [breite * 0.2, 0];
  while (offen.length) {
    let best = 0, dist = Infinity, umdrehen = false;
    offen.forEach((k, i) => {
      const n = k.pts.length, a = Math.hypot(k.pts[0] - stift[0], k.pts[1] - stift[1]), b = Math.hypot(k.pts[n - 2] - stift[0], k.pts[n - 1] - stift[1]);
      if (a < dist) { dist = a; best = i; umdrehen = false; }
      if (b < dist) { dist = b; best = i; umdrehen = true; }
    });
    const k = offen.splice(best, 1)[0];
    if (umdrehen) { const q = new Float32Array(k.pts.length); for (let i = 0; i < q.length; i += 2) { q[i] = k.pts[q.length - 2 - i]; q[i + 1] = k.pts[q.length - 1 - i]; } k.pts = q; }
    stift = [k.pts[k.pts.length - 2], k.pts[k.pts.length - 1]];
    federReihe.push(k);
  }
  const gesamt = federReihe.reduce((s, k) => s + k.laenge, 0) || 1, takt = spanne * 0.82;
  let bisher = 0;
  const kanten = federReihe.map((k) => {
    const von = kVon + (bisher / gesamt) * takt, dauer = Math.min(kBis + 0.3 - von, Math.max(0.3 * f, (k.laenge / gesamt) * takt * 2.2));
    bisher += k.laenge;
    const n = k.pts.length / 2, lang = new Float32Array(n);
    for (let i = 1; i < n; i++) lang[i] = lang[i - 1] + Math.hypot(k.pts[2 * i] - k.pts[2 * i - 2], k.pts[2 * i + 1] - k.pts[2 * i - 1]);
    return { pts: k.pts, lang, von, bis: von + dauer };
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
  // Richtung der Schraffur im Stich: nach der längsten Seite des Dreiecks (vier Winkel)
  for (const d of dreiecke) {
    let lang = 0, w = 0;
    for (let k = 0; k < 3; k++) { const j = (k + 1) % 3, dx = d.rel[2 * j] - d.rel[2 * k], dy = d.rel[2 * j + 1] - d.rel[2 * k + 1], l = Math.hypot(dx, dy); if (l > lang) { lang = l; w = Math.atan2(dy, dx); } }
    d.richtung = (((Math.round(w / (Math.PI / 4)) % 4) + 4) % 4);
  }

  // 04 Bild: das Foto wird montiert. Rund hundert Bauteile (ein grobes Delaunay-Mosaik); vom Teil am Schwerpunkt der Umrisse aus jeweils ein an schon
  // gesetzte angrenzendes, erst einzeln, dann schneller; vor jedem zeichnet sich sein Umriss als Bauplan, dann gleitet es entlang einer Führungslinie
  // an seinen Platz und rastet ein (Rückmeldung vom 15. Oktober 2026 zum Netz mit runder Einblendung: «ein bisschen Abrakadabra, wenig Konstruktion»)
  let fx = 0, fy = 0, fn = 0;
  for (const k of daten.kanten) for (let i = 0; i < k.pts.length; i += 2) { fx += k.pts[i]; fy += k.pts[i + 1]; fn++; }
  const fokus = fn ? [klemm(0.5 * mx + 0.5 * (fx / fn), breite * 0.3, breite * 0.7), klemm(0.5 * my + 0.5 * (fy / fn), hoehe * 0.3, hoehe * 0.7)] : [mx, my];
  const teile = bauteile(breite, hoehe, rnd, fokus);
  const gleiten = 0.42 * f, planen = 0.3 * f, m = teile.length;
  teile.forEach((tl, k) => {
    const u = m > 1 ? k / (m - 1) : 1, ab0 = Math.hypot(tl.cx - fokus[0], tl.cy - fokus[1]), w = rnd() * Math.PI * 2;
    const rx = ab0 > 1 ? (tl.cx - fokus[0]) / ab0 : Math.cos(w), ry = ab0 > 1 ? (tl.cy - fokus[1]) / ab0 : Math.sin(w), weite = (0.22 + 0.1 * rnd()) * diag;
    Object.assign(tl, { setzen: Z0 + (0.2 + 0.62 * u ** 0.5) * Zd, ox: rx * weite, oy: ry * weite });   // u^0,5: die ersten einzeln, dann immer schneller
    tl.plan = tl.setzen - gleiten - planen;
  });
  const einrasten = [Z0 + 0.9 * Zd, Z1 + 0.35];
  const geometrie = { fokus, teile, gleiten, planen };

  return {
    breite, hoehe, zeit, farben: FARBEN[grund] ?? FARBEN.schwarz, grund: FARBEN[grund] ? grund : "schwarz", signet, beschriftung, titel: (titel || "Bildfragmentieren").trim(),
    foto, leinwand, vorrat: vorrat ?? {}, daten, zeilen, kanten, dreiecke, flug, faerben, wellen, ersterFlug, einrasten, geometrie, raum,
    glitches: zeit.fragmente ? [F0, C0, Z0, einrasten[0]] : zeit.phasen.slice(1).map((p) => p.von),
    zahl: { zeilen: z.reihen, kanten: kanten.length, dreiecke: n },
  };
}

/** die Bauteile für 04: Ecken, Rand und gut drei Dutzend Punkte innen mit Mindestabstand, Delaunay; Reihenfolge: vom Teil am Schwerpunkt aus jeweils ein
 *  Nachbar eines schon gesetzten (Breitensuche, je Schritt der nächstgelegene). Ecken je Teil um 0,7 Filmpunkte vergrössert (keine Fugen). */
function bauteile(B, H, rnd, [fx, fy]) {
  const px = [0, B, 0, B], py = [0, 0, H, H];
  for (let k = 1; k < 5; k++) { px.push((k * B) / 5 + (rnd() - 0.5) * B * 0.06, (k * B) / 5 + (rnd() - 0.5) * B * 0.06); py.push(0, H); }
  for (let k = 1; k < 6; k++) { py.push((k * H) / 6 + (rnd() - 0.5) * H * 0.05, (k * H) / 6 + (rnd() - 0.5) * H * 0.05); px.push(0, B); }
  const zahl = 38, abstand = Math.sqrt((B * H) / zahl) * 0.72;
  for (let v = 0, innen = 0; v < 6000 && innen < zahl; v++) {
    const x = B * (0.05 + 0.9 * rnd()), y = H * (0.05 + 0.9 * rnd());
    if (px.every((qx, i) => Math.hypot(qx - x, py[i] - y) >= abstand)) { px.push(x); py.push(y); innen++; }
  }
  const idx = delaunay(px, py), n = idx.length / 3, teile = [], kanten = new Map();
  for (let t = 0; t < n; t++) {
    const e = [0, 1, 2].map((j) => [px[idx[3 * t + j]], py[idx[3 * t + j]]]), cx = (e[0][0] + e[1][0] + e[2][0]) / 3, cy = (e[0][1] + e[1][1] + e[2][1]) / 3;
    const pts = new Float32Array(6);
    e.forEach(([x, y], j) => { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1, g = (l + 0.7) / l; pts[2 * j] = cx + dx * g; pts[2 * j + 1] = cy + dy * g; });
    teile.push({ pts, ecken: e, cx, cy, nachbarn: [],
      x0: Math.max(0, Math.floor(Math.min(...e.map((q) => q[0])) - 2)), y0: Math.max(0, Math.floor(Math.min(...e.map((q) => q[1])) - 2)),
      x1: Math.min(B, Math.ceil(Math.max(...e.map((q) => q[0])) + 2)), y1: Math.min(H, Math.ceil(Math.max(...e.map((q) => q[1])) + 2)) });
    for (let j = 0; j < 3; j++) {
      const a = idx[3 * t + j], b = idx[3 * t + ((j + 1) % 3)], k = a < b ? `${a},${b}` : `${b},${a}`;
      if (kanten.has(k)) { const o = kanten.get(k); teile[o].nachbarn.push(t); teile[t].nachbarn.push(o); } else kanten.set(k, t);
    }
  }
  // Reihenfolge: Breitensuche vom Teil am Schwerpunkt aus, unter den möglichen Nachbarn jeweils der dem Schwerpunkt nächste
  const ab = (t) => Math.hypot(teile[t].cx - fx, teile[t].cy - fy);
  let start = 0;
  teile.forEach((_, t) => { if (ab(t) < ab(start)) start = t; });
  const gesetzt = new Set([start]), reihe = [start], rand = new Set(teile[start].nachbarn);
  while (rand.size) {
    let best = -1;
    for (const t of rand) if (best < 0 || ab(t) < ab(best)) best = t;
    rand.delete(best); gesetzt.add(best); reihe.push(best);
    for (const q of teile[best].nachbarn) if (!gesetzt.has(q)) rand.add(q);
  }
  return reihe.map((t) => teile[t]);
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
/** die Umrisse: jeder Zug wächst gleichmässig entlang seiner Länge, wie von einer Feder gezogen; an den wachsenden Enden die Stiftspitze */
function kantenZeichnen(ctx, sz, t, sicht) {
  const pfad = new Path2D(), spitzen = new Path2D();
  let etwas = false;
  for (const k of sz.kanten) {
    if (t <= k.von) continue;
    const q = sanft(anteil(t, k.von, k.bis)), p = k.pts, L = k.lang, n = L.length, bis = q * L[n - 1];
    pfad.moveTo(p[0], p[1]);
    let i = 1;
    for (; i < n && L[i] <= bis; i++) pfad.lineTo(p[2 * i], p[2 * i + 1]);
    if (i < n) {
      const u = (bis - L[i - 1]) / (L[i] - L[i - 1] || 1), x = p[2 * i - 2] + (p[2 * i] - p[2 * i - 2]) * u, y = p[2 * i - 1] + (p[2 * i + 1] - p[2 * i - 1]) * u;
      pfad.lineTo(x, y);
      spitzen.moveTo(x + 3.2, y); spitzen.arc(x, y, 3.2, 0, Math.PI * 2);
    }
    etwas = true;
  }
  if (!etwas) return;
  ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = sz.farben.tinte; ctx.fillStyle = sz.farben.tinte;
  ctx.globalAlpha = sicht * 0.92; ctx.lineWidth = 2; ctx.stroke(pfad);
  ctx.globalAlpha = sicht; ctx.fill(spitzen);
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

/** eine Ebene in der Grösse und Lage der Leinwand (leer, mit derselben Abbildung), einmal je Szene gebaut */
function ebene(ctx, sz, name) {
  const c = ctx.canvas;
  if (!sz[name] || sz[name].width !== c.width || sz[name].height !== c.height) sz[name] = sz.leinwand(c.width, c.height);
  const e = sz[name].getContext("2d");
  e.setTransform(1, 0, 0, 1, 0, 0); e.globalCompositeOperation = "source-over"; e.globalAlpha = 1; e.clearRect(0, 0, c.width, c.height);
  e.setTransform(ctx.getTransform());
  return e;
}

/** die Schraffur in den Farben des Fotos tönen, Bildpunkt für Bildpunkt (03 Farben): jeder gläserne Körper bringt die vollständigen, echten Farben in
 *  seinen Bereich (innerhalb seines Umrisses), ausserhalb bleibt die Schraffur neutral (weiss auf Schwarz, schwarz auf Weiss); darunter erscheint dort
 *  das Foto selbst, halb durchscheinend, damit dunkle Flächen nicht leer bleiben. Auf Schwarz tönt das etwas aufgehellte Foto, auf Weiss das
 *  etwas abgedunkelte (damit die Linien tragen). (Rückmeldung vom 15. Oktober 2026: Kanal um Kanal ergab grelle Zwischenfarben, «Farbbomben»; jetzt ohne
 *  Kanaltrennung und ohne Übersättigung) */
function toenen(mosaik, ctx, sz, t) {
  const weiss = sz.grund === "weiss", k = ebene(ctx, sz, "tonEbene"), u = ebene(ctx, sz, "fotoEbene");
  const farbe = lichtBilder(sz).leucht;   // auf Schwarz etwas heller, auf Weiss etwas dunkler als das Foto, damit die Linien tragen
  k.fillStyle = weiss ? "#000000" : "#ffffff"; k.fillRect(-60, -60, sz.breite + 120, sz.hoehe + 120);
  u.fillStyle = sz.farben.grund; u.fillRect(-60, -60, sz.breite + 120, sz.hoehe + 120);
  // die Bereiche der Körper (eine Maske); ist ein Körper ganz durchgezogen, gilt das ganze Bild
  const maske = new Path2D();
  let ganz = false, etwas = false;
  sz.wellen.forEach((w, c) => {
    const p = (t - w.von) / w.dauer;
    if (p <= 0) return;
    etwas = true;
    if (p >= 1.1) { ganz = true; return; }
    const h = huelle(koerperLage(w, c, t).pts);
    maske.moveTo(h[0][0], h[0][1]); for (const [x, y] of h.slice(1)) maske.lineTo(x, y); maske.closePath();
  });
  if (etwas) for (const [e, bild] of [[k, farbe], [u, sz.foto]]) {
    e.save();
    if (!ganz) e.clip(maske, "nonzero");
    e.drawImage(bild, 0, 0, sz.breite, sz.hoehe);
    e.restore();
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 0.42; ctx.drawImage(sz.fotoEbene, 0, 0); ctx.restore();
  // die Schraffur behält ihre Form (Deckkraft) und nimmt die Farbe der Tonebene an
  mosaik.save(); mosaik.setTransform(1, 0, 0, 1, 0, 0); mosaik.globalCompositeOperation = "source-atop"; mosaik.drawImage(sz.tonEbene, 0, 0); mosaik.restore();
}

/** konvexe Hülle (monotone Kette) einer Punktliste [[x, y, …], …] */
function huelle(pts) {
  const p = pts.map(([x, y]) => [x, y]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const kreuz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const unten = [], oben = [];
  for (const q of p) { while (unten.length >= 2 && kreuz(unten[unten.length - 2], unten[unten.length - 1], q) <= 0) unten.pop(); unten.push(q); }
  for (const q of p.slice().reverse()) { while (oben.length >= 2 && kreuz(oben[oben.length - 2], oben[oben.length - 1], q) <= 0) oben.pop(); oben.push(q); }
  return unten.slice(0, -1).concat(oben.slice(0, -1));
}

/** der Stich: das Foto Bildpunkt für Bildpunkt als Schraffur (einmal je Foto, Grund und Mosaik). Je dunkler (auf Schwarz: je heller) ein Bildpunkt,
 *  desto breiter die Linie, ab mittleren Tönen eine zweite, gekreuzte Lage, wie bei einem Kupferstich; die Richtung kommt vom Dreieck, in dem der
 *  Bildpunkt liegt (vier Winkel), die Dreiecke sind also die Facetten des Stichs. Feine Linien und Details des Fotos bleiben so erhalten.
 *  (Rückmeldung vom 15. Oktober 2026: das Mosaik aus Mittelwerten je Dreieck «geht völlig am Ausgangsbild vorbei», etwa bei Strichzeichnungen)
 *  Gibt eine Leinwand in Filmgrösse: Tinte mit der Deckkraft der Schraffur, sonst durchsichtig. */
const ABSTAND = 7, WINKEL = [22.5, 67.5, 112.5, 157.5].map((w) => (w * Math.PI) / 180);
function stich(sz) {
  const v = sz.vorrat, schluessel = `stich-${sz.grund}`;
  if (v[schluessel] && v.stichFoto === sz.foto && v.stichDaten === sz.daten) return v[schluessel];
  const B = sz.breite, H = sz.hoehe, weiss = sz.grund === "weiss";
  const q = sz.leinwand(B, H), qc = q.getContext("2d", { willReadFrequently: true });
  qc.drawImage(sz.foto, 0, 0, B, H);
  const bild = qc.getImageData(0, 0, B, H), d = bild.data;
  // Richtung je Bildpunkt: das Dreieck, in dem er liegt
  const richtung = new Uint8Array(B * H);
  for (const t of sz.dreiecke) {
    const p = [0, 1, 2].map((k) => [t.cx + t.rel[2 * k], t.cy + t.rel[2 * k + 1]]);
    const x0 = Math.max(0, Math.floor(Math.min(p[0][0], p[1][0], p[2][0]))), x1 = Math.min(B - 1, Math.ceil(Math.max(p[0][0], p[1][0], p[2][0])));
    const y0 = Math.max(0, Math.floor(Math.min(p[0][1], p[1][1], p[2][1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(p[0][1], p[1][1], p[2][1])));
    const [[ax, ay], [bx, by], [cx, cy]] = p, D = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy) || 1e-9;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const u = ((by - cy) * (x + 0.5 - cx) + (cx - bx) * (y + 0.5 - cy)) / D, w = ((cy - ay) * (x + 0.5 - cx) + (ax - cx) * (y + 0.5 - cy)) / D;
      if (u >= -0.02 && w >= -0.02 && u + w <= 1.02) richtung[y * B + x] = t.richtung;
    }
  }
  const cos = WINKEL.map(Math.cos), sin = WINKEL.map(Math.sin);
  const [tr, tg, tb] = weiss ? [0, 0, 0] : [255, 255, 255];
  // Deckung einer Linienlage: halbe Linienbreite b (in Abständen) an der Stelle s, mit einem Bildpunkt Kantenglättung
  const lage = (s, b) => { const u = s / ABSTAND - Math.floor(s / ABSTAND), a = Math.abs(u - 0.5); return Math.max(0, Math.min(1, (b - a) * ABSTAND + 0.5)); };
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < B; x++, i++) {
    const L = (0.2126 * d[4 * i] + 0.7152 * d[4 * i + 1] + 0.0722 * d[4 * i + 2]) / 255;
    const ton = Math.min(1, Math.max(0, ((weiss ? 1 - L : L) - 0.05) / 0.9)) ** 0.9;
    const r = richtung[i], s1 = x * cos[r] + y * sin[r], s2 = -x * sin[r] + y * cos[r];
    const a1 = ton > 0.02 ? lage(s1, 0.5 * Math.min(1, ton / 0.55) * 0.5 + 0.02) : 0;
    const a2 = ton > 0.55 ? lage(s2, 0.25 * (ton - 0.55) / 0.45 + 0.02) : 0;
    d[4 * i] = tr; d[4 * i + 1] = tg; d[4 * i + 2] = tb; d[4 * i + 3] = 255 * (1 - (1 - a1) * (1 - a2));
  }
  const aus = sz.leinwand(B, H);
  aus.getContext("2d").putImageData(bild, 0, 0);
  if (v.stichFoto !== sz.foto || v.stichDaten !== sz.daten) for (const k of Object.keys(v)) if (k.startsWith("stich-")) delete v[k];
  v.stichFoto = sz.foto; v.stichDaten = sz.daten; v[schluessel] = aus;
  return aus;
}

/** der Stich als Muster für eine Leinwand (je Leinwand und Stich einmal) */
const STICHMUSTER = new WeakMap();
function stichMuster(ziel, bild) {
  let m = STICHMUSTER.get(ziel);
  if (!m || m.bild !== bild) { m = { bild, muster: ziel.createPattern(bild, "no-repeat") }; STICHMUSTER.set(ziel, m); }
  return m.muster;
}

function dreieckeZeichnen(ctx, sz, t) {
  const F = sz.farben, { ab } = sz.zeit, flug = sz.flug, p = new Float32Array(6);
  const [F0] = ab.formen, [C0, C1] = ab.farben, [Z0, Z1] = ab.zusammen;
  const gitterFlug = new Path2D(), gitterRuhig = new Path2D();
  // das Gitter der gelandeten Dreiecke wird blasser und verschwindet, während die Farben kommen
  const gitterRuhe = 0.16 * (1 - anteil(t, C0, C0 + 0.5 * (C1 - C0)));
  // ab den Farben zeichnet der Stich in eine eigene Ebene, die dann mit dem Foto getönt wird
  const farbig = !!sz.foto && t >= C0, ziel = farbig ? ebene(ctx, sz, "mosaikEbene") : ctx;
  const bild = sz.foto ? stich(sz) : null, muster = bild ? stichMuster(ziel, bild) : null, liegend = new Path2D();
  let liegen = 0;
  for (const d of sz.dreiecke) {
    const start = d.land - flug;
    if (t < start) continue;
    const e = inOut(anteil(t, start, d.land));
    // Füllung: sein Stück des Stichs, das mit dem Dreieck fliegt (gelandete gemeinsam, fliegende je mit ihrer Bewegung)
    const deck = anteil(t, d.land - 0.3 * flug, d.land + 0.35);
    if (muster && deck > 0) {
      if (e >= 1 && deck >= 1) { dreieckPfad(liegend, ecken(d, 1, 1, p)); liegen++; }
      else {
        const s = 0.25 + 0.75 * e, w = d.dreh * (1 - e);
        muster.setTransform(new DOMMatrix().translateSelf(d.cx + d.ox * (1 - e), d.cy + d.oy * (1 - e)).rotateSelf((w * 180) / Math.PI).scaleSelf(s).translateSelf(-d.cx, -d.cy));
        ziel.beginPath(); dreieckPfad(ziel, ecken(d, e, 1, p));
        ziel.globalAlpha = deck; ziel.fillStyle = muster; ziel.fill();
      }
    }
    // Drahtgitter: im Flug kräftig, gelandet blass
    if (e < 1) dreieckPfad(gitterFlug, ecken(d, e, 1, p));
    else if (gitterRuhe > 0) dreieckPfad(gitterRuhig, ecken(d, 1, 1, p));
  }
  if (liegen) { muster.setTransform(new DOMMatrix()); ziel.globalAlpha = 1; ziel.fillStyle = muster; ziel.fill(liegend); }
  ctx.globalAlpha = 1;
  if (farbig) {
    toenen(ziel, ctx, sz, t);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(sz.mosaikEbene, 0, 0); ctx.restore();
  }
  ctx.strokeStyle = F.tinte; ctx.lineJoin = "round";
  ctx.globalAlpha = 0.85; ctx.lineWidth = 1.6; ctx.stroke(gitterFlug);
  if (gitterRuhe > 0) { ctx.globalAlpha = gitterRuhe * anteil(t, F0, F0 + 0.4); ctx.lineWidth = 1.2; ctx.stroke(gitterRuhig); }
  // zu Beginn von 04 tritt das Mosaik schlicht zum Grund hin zurück, damit die gesetzten Facetten des Fotos klar hervortreten
  const zurueck = 0.62 * sanft(anteil(t, Z0, Z0 + 0.22 * (Z1 - Z0)));
  if (zurueck > 0) { ctx.globalAlpha = zurueck; ctx.fillStyle = F.grund; ctx.fillRect(-60, -60, sz.breite + 120, sz.hoehe + 120); }
  ctx.globalAlpha = 1;
}

/** die Farbwellen als transparente geometrische Körper: jeder wächst aus dem Ursprung seiner Welle, dreht sich langsam und trägt einen kleineren,
 *  gegenläufig drehenden Körper in sich. Dünne Konturen ohne Farbe (vorn deutlicher als hinten), gläserne Flächen, kleine Punkte an den Ecken. */
function koerperZeichnen(ctx, sz, t) {
  const weiss = sz.grund === "weiss", tinte = sz.farben.tinte;
  sz.wellen.forEach((w, c) => {
    const p = (t - w.von) / w.dauer;
    if (p <= 0 || p >= 1.2) return;
    const sicht = anteil(p, 0, 0.1) * (1 - anteil(p, 0.75, 1.2)), { pts, r, lage } = koerperLage(w, c, t);
    koerper(ctx, KOERPER[w.form], pts, sicht, weiss, tinte);
    koerper(ctx, KOERPER[w.innen], abbilden(KOERPER[w.innen], w.x, w.y, r * 0.56, lage(2).map((x) => -1.4 * x)), sicht * 0.85, weiss, tinte);
  });
}

/** Lage des äusseren Körpers einer Welle zur Zeit t: abgebildete Ecken, Radius und Drehung */
function koerperLage(w, c, t) {
  const p = (t - w.von) / w.dauer, r = (Math.min(1.1, Math.max(0, p)) * w.weit) / 1.12, u = t - w.von;
  const lage = (k) => [u * 0.55 + c * 1.3 + k, u * 0.42 + c * 0.7 + k * 0.6, u * 0.12 + c];
  return { pts: abbilden(KOERPER[w.form], w.x, w.y, Math.max(0.5, r), lage(0)), r, lage };
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

/** 04 Bild: das Foto wird montiert. Vor jedem Bauteil zeichnet sich sein Umriss (Bauplan) mit Passkreuzen an den Ecken; dann gleitet das Teil – ein Stück
 *  des Fotos – entlang einer gestrichelten Führungslinie geradlinig an seinen Platz, bremst ab und rastet mit einer kurzen Kante ein. Gesetzte Teile
 *  bilden zusammen das Foto; gegen Ende verschwinden Bauplan und Passkreuze, dann rasten die Farbkanäle ein. */
function zusammensetzen(ctx, sz, t) {
  const G = sz.geometrie, [Z0, Z1] = sz.zeit.ab.zusammen, [e0] = sz.einrasten, T = sz.farben.tinte;
  if (t < Z0 || t >= e0) return;
  const plan = 1 - sanft(anteil(t, Z0 + 0.84 * (Z1 - Z0), e0));   // Sichtbarkeit von Bauplan und Passkreuzen
  const umriss = (p, q) => { p.moveTo(q[0], q[1]); p.lineTo(q[2], q[3]); p.lineTo(q[4], q[5]); p.closePath(); };
  const gesetzt = new Path2D(), linien = new Path2D(), kreuze = new Path2D(), kanten = [], gleitend = [];
  let zahl = 0;
  for (const tl of G.teile) {
    if (t < tl.plan) continue;
    // Bauplan: der Umriss zeichnet sich Kante um Kante (dann bleibt er zart stehen), Passkreuze an den Ecken
    const q = anteil(t, tl.plan, tl.plan + G.planen) * 3, e = tl.ecken;
    linien.moveTo(e[0][0], e[0][1]);
    for (let k = 0; k < 3; k++) {
      const a = e[k], b = e[(k + 1) % 3], v = klemm(q - k);
      if (v <= 0) break;
      linien.lineTo(a[0] + (b[0] - a[0]) * v, a[1] + (b[1] - a[1]) * v);
    }
    if (q >= 1) for (const [x, y] of e) { kreuze.moveTo(x - 6, y); kreuze.lineTo(x + 6, y); kreuze.moveTo(x, y - 6); kreuze.lineTo(x, y + 6); }
    if (t >= tl.setzen) { umriss(gesetzt, tl.pts); zahl++; if (t < tl.setzen + 0.4) kanten.push(tl); }
    else if (t >= tl.setzen - G.gleiten) gleitend.push(tl);
  }
  if (sz.foto && zahl) { ctx.save(); ctx.clip(gesetzt); ctx.drawImage(sz.foto, 0, 0, sz.breite, sz.hoehe); ctx.restore(); }
  ctx.strokeStyle = T; ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (plan > 0) {
    ctx.globalAlpha = 0.5 * plan; ctx.lineWidth = 0.9; ctx.stroke(linien);
    ctx.globalAlpha = 0.75 * plan; ctx.lineWidth = 1.1; ctx.stroke(kreuze);
  }
  // gleitende Teile: Führungslinie vom Ausgangspunkt zum Platz, das Teil darauf, abbremsend
  for (const tl of gleitend) {
    const v = weich(anteil(t, tl.setzen - G.gleiten, tl.setzen)), dx = tl.ox * (1 - v), dy = tl.oy * (1 - v);
    ctx.save();
    ctx.setLineDash([6, 7]); ctx.globalAlpha = 0.55; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(tl.cx + tl.ox, tl.cy + tl.oy); ctx.lineTo(tl.cx, tl.cy); ctx.stroke();
    ctx.setLineDash([]);
    ctx.translate(dx, dy);
    ctx.beginPath(); umriss(ctx, tl.pts);
    if (sz.foto) {
      ctx.save(); ctx.clip(); ctx.globalAlpha = 1;
      const w = tl.x1 - tl.x0, h = tl.y1 - tl.y0;
      if (w > 0 && h > 0) ctx.drawImage(sz.foto, tl.x0, tl.y0, w, h, tl.x0, tl.y0, w, h);
      ctx.restore();
    }
    ctx.globalAlpha = 0.9; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.restore();
  }
  // einrastende Teile: eine kurze, klare Kante
  for (const tl of kanten) {
    const b = 1 - anteil(t, tl.setzen, tl.setzen + 0.4);
    ctx.beginPath(); umriss(ctx, tl.pts);
    ctx.globalAlpha = b; ctx.lineWidth = 1 + 1.2 * b; ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** das Foto für die Geometrie, einmal je Foto und Grund: «tief» abgedunkelt und weich (auf Weiss: aufgehellt und weich) als Grund hinter den Linien,
 *  «leucht» aufgehellt (auf Weiss: abgedunkelt), kaum satter, zum Tönen der Schraffur */
function lichtBilder(sz) {
  const v = sz.vorrat, schluessel = `licht-${sz.grund}`;
  if (v[schluessel] && v.lichtFoto === sz.foto) return v[schluessel];
  const B = sz.breite, H = sz.hoehe, weiss = sz.grund === "weiss";
  // weich: klein und wieder gross gezeichnet
  const klein = sz.leinwand(Math.max(8, Math.round(B / 14)), Math.max(8, Math.round(H / 14)));
  klein.getContext("2d").drawImage(sz.foto, 0, 0, klein.width, klein.height);
  const tief = sz.leinwand(B, H), tc = tief.getContext("2d");
  tc.imageSmoothingQuality = "high"; tc.drawImage(klein, 0, 0, B, H);
  tc.globalAlpha = weiss ? 0.8 : 0.78; tc.fillStyle = weiss ? "#ffffff" : "#000000"; tc.fillRect(0, 0, B, H);
  // leuchtend: das Foto mit sich selbst «Bildschirm» (auf Weiss: «multipliziert»), dann satter
  const quelle = sz.leinwand(B, H), qc = quelle.getContext("2d", { willReadFrequently: true });
  qc.drawImage(sz.foto, 0, 0, B, H);
  const bild = qc.getImageData(0, 0, B, H), d = bild.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];
    if (weiss) { r = (r * r) / 255; g = (g * g) / 255; b = (b * b) / 255; } else { r = 255 - ((255 - r) ** 2) / 255; g = 255 - ((255 - g) ** 2) / 255; b = 255 - ((255 - b) ** 2) / 255; }
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b, s = 1.05;   // kaum satter (vorher 1,45: zu grell)
    d[i] = l + (r - l) * s; d[i + 1] = l + (g - l) * s; d[i + 2] = l + (b - l) * s;
  }
  qc.putImageData(bild, 0, 0);
  if (v.lichtFoto !== sz.foto) for (const k of Object.keys(v)) if (k.startsWith("licht-")) delete v[k];
  v.lichtFoto = sz.foto; v[schluessel] = { tief, leucht: quelle };
  return v[schluessel];
}

/** die Kamera: Stösse bei den Farbwellen, beim Zusammensetzen langsam etwas näher; gibt Zoom und Versatz */
function kamera(sz, t) {
  const { ab } = sz.zeit, [Z0, Z1] = ab.zusammen;
  let z = 1, dx = 0, dy = 0;
  for (const w of sz.wellen) { const u = t - w.von; if (u > 0 && u < 2) z += 0.02 * (1 - Math.exp(-u / 0.06)) * Math.exp(-u / 0.4); }
  if (t > Z0 && t < Z1 + 0.5) {
    z += 0.025 * sanft(anteil(t, Z0, Z0 + 0.5 * (Z1 - Z0)));
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
export function vorbereiten(sz) { if (sz.foto) { stich(sz); auszugsBilder(sz); lichtBilder(sz); } }

/** das Foto, zum Schluss langsam etwas näher; beim Einrasten mit auseinanderlaufenden Farbkanälen, die ausschwingen */
function fotoZeichnen(ctx, sz, t) {
  const { ab } = sz.zeit, B = sz.breite, H = sz.hoehe;
  const ende = ab.bildAus ? ab.bildAus[1] : ab.schluss[1];
  const [e0, e1] = sz.einrasten, u = anteil(t, e0, e1);
  // beim Einrasten springt die Kamera näher und federt zurück, dann kommt das Foto langsam etwas näher
  const punch = 0.035 * (1 - weich(anteil(t, e0, e0 + 0.9)));
  const z = (1 + punch) * (1 + 0.035 * sanft(anteil(t, ab.stehen[0], ende))), w = B * z, h = H * z, x = (B - w) / 2, y = (H - h) / 2;
  const versatz = t < e1 ? 26 * (1 - u) ** 2 * Math.cos(u * 9) : 0;
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
    for (let i = 0; i < 6; i++) {
      const y = Math.floor(rnd() * H), h = Math.max(2, Math.floor((0.006 + rnd() * 0.05) * H)), dx = Math.round((rnd() - 0.5) * 0.07 * W * staerke);
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
  // Phase: Nummer, Name, Fortschritt als feine Linie, darunter der Zähler (über die ganze Kette der Workflows gezählt)
  const phasen = sz.zeit.phasen;
  let nr = 0;
  phasen.forEach((ph, i) => { if (t >= ph.von - 0.05) nr = i; });
  const { name, titel, von: a, bis: b } = phasen[nr], fort = anteil(t, a, b);
  const zahl = (n) => n.toLocaleString("de-CH");
  const gelandet = sz.geometrie.teile.filter((tl) => t >= tl.setzen).length;
  const zaehler = { linien: `zeilen ${zahl(sz.zahl.zeilen)} · kanten ${zahl(sz.zahl.kanten)}`, formen: `dreiecke ${zahl(sz.zahl.dreiecke)}`, farben: `farbe ${Math.round(fort * 100)} %`,
    zusammen: `bauteile ${zahl(gelandet)} / ${zahl(sz.geometrie.teile.length)}` }[name] ?? sz.raum?.zaehler() ?? "";
  const unten = H - rand;
  ctx.textAlign = "left";
  ctx.fillText(`${String(nr + 1).padStart(2, "0")} ${titel.toUpperCase()}`, rand, unten - g * 1.9);
  ctx.globalAlpha = sicht * 0.55; ctx.fillText(zaehler, rand, unten);
  const lb = Math.min(260 * s, B * 0.3), ly = unten - g * 1.9 + g * 0.55;
  ctx.globalAlpha = sicht * 0.3; ctx.fillRect(B - rand - lb, ly - 1, lb, 2 * s);
  ctx.globalAlpha = sicht * 0.85; ctx.fillRect(B - rand - lb, ly - 1, lb * fort, 2 * s);
  ctx.textAlign = "right"; ctx.globalAlpha = sicht * 0.55; ctx.fillText(`${B}×${H} · ${FPS} fps`, B - rand, unten);
  ctx.restore();
}

/** Pixelmass der Ziel-Leinwand (Vorschau kleiner, Video voll): darin rechnet WebGL */
const zielMass = (ctx, sz) => { const m = ctx.getTransform(); return [sz.breite * Math.hypot(m.a, m.b), sz.hoehe * Math.hypot(m.c, m.d)]; };

/** Verwandlung: das Bild kommt aus raum.js (k von N: das Filmbild im Abschnitt, für Strom und die Rückkopplung von Echo).
 *  Ist raum.js noch nicht geladen (oder ohne WebGL 2), bleibt der Grund, und am Ende blendet das Foto auf. */
function raumZeichnen(ctx, sz, t) {
  const { von, bis } = sz.zeit.abschnitt, [w, h] = zielMass(ctx, sz);
  const c = sz.raum?.bild(anteil(t, von, bis), Math.round((t - von) * FPS), Math.round((bis - von) * FPS), w, h);
  if (c) { ctx.drawImage(c, 0, 0, sz.breite, sz.hoehe); return; }
  if (sz.foto) { ctx.globalAlpha = sanft(anteil(t, bis - 1.5, bis)); ctx.drawImage(sz.foto, 0, 0, sz.breite, sz.hoehe); ctx.globalAlpha = 1; }
}

/** was über jedem Bild liegt: Abblenden, Beschriftung, Bildfehler */
function rahmen(ctx, sz, t) {
  const { ab } = sz.zeit, F = sz.farben, B = sz.breite, H = sz.hoehe;
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

/** Bild zur Zeit t (Sekunden) */
export function bild(ctx, sz, t) {
  const { ab } = sz.zeit, F = sz.farben, B = sz.breite, H = sz.hoehe;
  const [F0, F1] = ab.formen, [C0, C1] = ab.farben, [L0, L1] = ab.linien;
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = F.grund; ctx.fillRect(0, 0, B, H);
  const fotoAb = sz.foto ? sz.einrasten[0] : Infinity, bildEnde = ab.bildAus ? ab.bildAus[1] : ab.schluss[1];
  const { abschnitt } = sz.zeit, raeumlich = !sz.zeit.fragmente;
  if (t < bildEnde && raeumlich && t < abschnitt.bis) {
    // Verwandlung (fertiges Bild aus WebGL); davor nur der Grund
    if (t >= abschnitt.von) raumZeichnen(ctx, sz, t);
    rahmen(ctx, sz, t);
  } else if (t < bildEnde) {
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
    if (t >= ab.zusammen[0] && t < fotoAb) zusammensetzen(ctx, sz, t);
    if (bewegt) ctx.restore();
    // das Foto rastet ein (mit einem Weissblitz) und steht
    if (t >= fotoAb) {
      fotoZeichnen(ctx, sz, t);
      const blitz = (1 - anteil(t, fotoAb, fotoAb + 0.5)) ** 2;
      if (blitz > 0) { ctx.globalAlpha = 0.3 * blitz; ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, B, H); ctx.globalAlpha = 1; }
      // ein letzter, blasser Abtaster über das fertige Bild
      const q = anteil(t, ab.stehen[0], ab.stehen[0] + 1.6);
      if (q > 0 && q < 1) {
        const y = q * H;
        ctx.globalAlpha = 0.22 * Math.sin(Math.PI * q); ctx.fillStyle = F.tinte; ctx.fillRect(0, y - 1, B, 2);
        ctx.globalAlpha = 0.05 * Math.sin(Math.PI * q); ctx.fillRect(0, y - 40, B, 80);
        ctx.globalAlpha = 1;
      }
    }
    rahmen(ctx, sz, t);
  }
  // das Signet von ornament.cloud (wie in Sketchory), bei breiten Formaten in der Mitte
  if (ab.signet && t >= ab.signet[0] && t < ab.signetAus[1]) {
    ctx.save(); ctx.translate((B - 1080) / 2, 0);
    // die Zeichnung doppelt so schnell, der Punkt aber ruhig (etwas langsamer als im Original)
    // die Buchstaben rücken langsamer und weicher zusammen als in der Vorlage (dort 18 Bilder, hier doppelt so schnell gespielt: kaum 0,3 s; Wunsch
    // vom 17. Oktober 2026: «das Zusammenziehen des Textes im Signet noch etwas smoother») – über 0,9 s bis ins Stehen hinein
    const f = SIGNET_VON + (t - ab.signet[0]) * FPS * SIGNET_TEMPO, opt = { hoehe: H, farben: F, punktTempo: SIGNET_TEMPO * 1.25, zusammen: [118, 172, (x) => (1 - Math.cos(Math.PI * x)) / 2] };   // Sinus: ohne Ruck
    if (sz.raum && !sz.zeit.fragmente) {
      // Verwandlung: der Punkt läuft als kleiner Glaskristall durch die Schlaufe und leuchtet (Halo, Bokeh auf seiner Spur)
      const [w, h] = zielMass(ctx, sz), { lage: [px, py], sicht } = punktLage(f, opt);
      const zeichnen = (c) => { c.fillStyle = F.grund; c.fillRect(0, 0, 1080, H); signetZeichnen(c, f, opt); };
      const spur = [5, 10, 15, 20].map((d) => { const [sx, sy] = punktLage(Math.max(0, f - d * SIGNET_TEMPO), opt).lage; return [sx, sy + (H - 1920) / 2]; });
      ctx.drawImage(sz.raum.signet(zeichnen, { lage: [px, py + (H - 1920) / 2], sicht, radius: PUNKT_RADIUS, spur, farbe: F.punkt }, f, w, h), 0, 0, 1080, H);
    } else signetZeichnen(ctx, f, opt);
    ctx.restore();
    const weg = ausblenden(anteil(t, ab.signetAus[0], ab.signetAus[1]));
    if (weg > 0) { ctx.globalAlpha = weg; ctx.fillStyle = F.grund; ctx.fillRect(0, 0, B, H); ctx.globalAlpha = 1; }
  }
}

/** Zeitpunkt für das Standbild, wenn nichts anderes gewählt ist: das fertige farbige Mosaik, kurz bevor die Montage beginnt; bei der Verwandlung
 *  die Mitte der zweiten Phase */
export const standbildZeit = (sz) => {
  if (sz.zeit.fragmente) return sz.zeit.ab.zusammen[0] - 0.05;
  const p = sz.zeit.phasen[1];
  return p.von + 0.5 * (p.bis - p.von);
};
