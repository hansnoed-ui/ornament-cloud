// «Bildfragmentieren» – ein Bild des Films auf eine Leinwand zeichnen (Vorschau, Video und Standbild verwenden dasselbe).
// Jedes Bild hängt nur von der Zeit ab (kein Gedächtnis zwischen den Bildern), darum kann die Vorschau an jeder Stelle stehen.
//   01 Linien:  waagrechte Linien tasten das Bild ab (von oben nach unten), heben sich mit der Helligkeit zu einem Relief
//               (jede Linie verdeckt, was hinter ihr liegt) und beruhigen sich; dann zeichnen sich die Umrisse mit leichtem Leuchten
//   02 Formen:  Dreiecke fliegen von aussen als Drahtgitter herein, drehen sich ein und füllen sich mit ihrem Grau (Mosaik)
//   03 Farben:  Farbton um Farbton bekommen die Dreiecke ihre Farbe (kurz übersättigt, dann ruhig), das Gitter verschwindet
//   04 Bild:    die Dreiecke klappen um wie Karten und zeigen das Foto, Reihe um Reihe von oben; zum Schluss rasten die
//               drei Farbkanäle ein (RGB-Versatz, schwingt aus), das Foto steht und kommt langsam etwas näher
// An den Übergängen ein kurzer Bildfehler (verschobene Streifen), dazu auf Wunsch eine feine Beschriftung wie in einem
// Werkzeug für Bildverarbeitung (Phase, Zähler, Zeitcode, Eckmarken). Am Schluss auf Wunsch das Signet von ornament.cloud.
import { FPS, anteil, weich, sanft, inOut, ausblenden, klemm, zeitachse, zeitcode, PHASEN } from "./ablauf.js?v=2";
import { signet as signetZeichnen } from "../sketchory/signet.js?v=8";
import { zufall, farbton, auszuege } from "./fragmente.js?v=2";

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

  // Dreiecke: Schwerpunkt, Ecken relativ dazu (um 0,8 Filmpunkte vergrössert, damit keine Fugen bleiben), Flug, Farbe, Umklappen
  const D = daten.dreiecke, n = D.n, mx = breite / 2, my = hoehe / 2, diag = Math.hypot(breite, hoehe);
  const flug = 1.05 * f, faerben = 0.65 * f, klappen = 0.1 * Zd;
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
    // Farbe: nach dem Farbton (rot, gelb, grün, blau, violett); fast unbunte verteilen sich über die ganze Zeit
    const { ton, satt } = farbton(r, g, b);
    const schluessel = satt > 0.14 ? ton : rnd();
    const farbe = C0 + (0.04 + schluessel * 0.62 + rnd() * 0.08) * Cd;
    // Umklappen zum Foto: von oben nach unten, etwas von links nach rechts
    const klapp = Z0 + (0.04 + ((cy / hoehe) * 0.8 + (cx / breite) * 0.2) * 0.56 + rnd() * 0.1) * Zd;
    dreiecke[i] = { cx, cy, rel, grau, r, g, b, land, ox: rx * weite + (rnd() - 0.5) * 0.12 * diag, oy: ry * weite + (rnd() - 0.5) * 0.12 * diag,
      dreh: (rnd() - 0.5) * Math.PI * 2.4, farbe, klapp,
      x0: Math.max(0, Math.floor(Math.min(e[0], e[2], e[4]) - 2)), y0: Math.max(0, Math.floor(Math.min(e[1], e[3], e[5]) - 2)),
      x1: Math.min(breite, Math.ceil(Math.max(e[0], e[2], e[4]) + 2)), y1: Math.min(hoehe, Math.ceil(Math.max(e[1], e[3], e[5]) + 2)) };
  }
  const ersterFlug = dreiecke.reduce((m, d) => Math.min(m, d.land - flug), Infinity);
  const einrasten = [Z0 + 0.8 * Zd, Z1 + 0.15];

  return {
    breite, hoehe, zeit, farben: FARBEN[grund] ?? FARBEN.schwarz, grund: FARBEN[grund] ? grund : "schwarz", signet, beschriftung, titel: (titel || "Bildfragmentieren").trim(),
    foto, leinwand, vorrat: vorrat ?? {}, zeilen, kanten, dreiecke, flug, faerben, klappen, ersterFlug, einrasten,
    glitches: [F0, C0, Z0, einrasten[0]], zahl: { zeilen: z.reihen, kanten: kanten.length, dreiecke: n },
  };
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

/** Ecken eines Dreiecks zur Zeit t: im Flug versetzt, gedreht und kleiner; beim Umklappen waagrecht gestaucht */
function ecken(d, e, sx, aus) {
  const s = 0.25 + 0.75 * e, w = d.dreh * (1 - e), c = Math.cos(w) * s, si = Math.sin(w) * s, ox = d.ox * (1 - e), oy = d.oy * (1 - e);
  for (let k = 0; k < 3; k++) {
    const x = d.rel[2 * k] * sx, y = d.rel[2 * k + 1];
    aus[2 * k] = d.cx + ox + x * c - y * si; aus[2 * k + 1] = d.cy + oy + x * si + y * c;
  }
  return aus;
}
const dreieckPfad = (ctx, p) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(p[2], p[3]); ctx.lineTo(p[4], p[5]); ctx.closePath(); };

function dreieckeZeichnen(ctx, sz, t) {
  const F = sz.farben, { ab } = sz.zeit, flug = sz.flug, p = new Float32Array(6);
  const [F0] = ab.formen, [C0, C1] = ab.farben;
  const gitterFlug = new Path2D(), gitterRuhig = new Path2D(), fertig = new Path2D(), klappend = [];
  let fertigZahl = 0;
  // das Gitter der gelandeten Dreiecke wird blasser und verschwindet, während die Farben kommen
  const gitterRuhe = 0.3 * (1 - anteil(t, C0, C0 + 0.6 * (C1 - C0)));
  for (const d of sz.dreiecke) {
    const start = d.land - flug;
    if (t < start) continue;
    const e = inOut(anteil(t, start, d.land));
    // ab dem Umklappen zeigt das Dreieck das Foto
    const u = sz.foto ? anteil(t, d.klapp, d.klapp + sz.klappen) : 0;
    if (u >= 1) { dreieckPfad(fertig, ecken(d, 1, 1, p)); fertigZahl++; continue; }
    if (u > 0) { klappend.push([d, u]); continue; }
    // Füllung: zuerst Grau, dann die eigene Farbe (kurz übersättigt)
    const deck = anteil(t, d.land - 0.3 * flug, d.land + 0.35);
    if (deck > 0) {
      const q = anteil(t, d.farbe, d.farbe + sz.faerben), k = q + 0.55 * Math.sin(Math.PI * q);
      const r = klemm(d.grau + (d.r - d.grau) * k, 0, 255) | 0, g = klemm(d.grau + (d.g - d.grau) * k, 0, 255) | 0, b = klemm(d.grau + (d.b - d.grau) * k, 0, 255) | 0;
      ctx.globalAlpha = deck; ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath(); dreieckPfad(ctx, ecken(d, e, 1, p)); ctx.fill();
    }
    // Drahtgitter: im Flug kräftig, gelandet blass
    if (e < 1) dreieckPfad(gitterFlug, ecken(d, e, 1, p));
    else if (gitterRuhe > 0) dreieckPfad(gitterRuhig, ecken(d, 1, 1, p));
  }
  ctx.globalAlpha = 1;
  // die umgeklappten Dreiecke zeigen das Foto: eine Maske aus allen, ein einziges Mal gezeichnet
  if (fertigZahl) { ctx.save(); ctx.clip(fertig); ctx.drawImage(sz.foto, 0, 0, sz.breite, sz.hoehe); ctx.restore(); }
  // die gerade umklappenden: bis zur Hälfte die Farbe, dann das Foto, waagrecht gestaucht wie eine Karte
  for (const [d, u] of klappend) {
    const sx = Math.max(0.02, Math.abs(Math.cos(Math.PI * u)));
    if (u < 0.5) {
      const hell = 1 + 0.35 * Math.sin(Math.PI * u);
      ctx.fillStyle = `rgb(${Math.min(255, d.r * hell) | 0},${Math.min(255, d.g * hell) | 0},${Math.min(255, d.b * hell) | 0})`;
      ctx.beginPath(); dreieckPfad(ctx, ecken(d, 1, sx, p)); ctx.fill();
    } else {
      ctx.save();
      ctx.translate(d.cx, d.cy); ctx.scale(sx, 1); ctx.translate(-d.cx, -d.cy);
      ctx.beginPath(); dreieckPfad(ctx, ecken(d, 1, 1, p)); ctx.clip();
      const w = d.x1 - d.x0, h = d.y1 - d.y0;
      if (w > 0 && h > 0) ctx.drawImage(sz.foto, d.x0, d.y0, w, h, d.x0, d.y0, w, h);
      ctx.restore();
    }
  }
  ctx.strokeStyle = F.tinte; ctx.lineJoin = "round";
  ctx.globalAlpha = 0.85; ctx.lineWidth = 1.6; ctx.stroke(gitterFlug);
  if (gitterRuhe > 0) { ctx.globalAlpha = gitterRuhe * anteil(t, F0, F0 + 0.4); ctx.lineWidth = 1.2; ctx.stroke(gitterRuhig); }
  ctx.globalAlpha = 1;
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
  const z = 1 + 0.035 * sanft(anteil(t, ab.stehen[0], ende)), w = B * z, h = H * z, x = (B - w) / 2, y = (H - h) / 2;
  const [e0, e1] = sz.einrasten, u = anteil(t, e0, e1);
  const versatz = t < e1 ? 34 * (1 - u) ** 2 * Math.cos(u * 10) : 0;
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
  const zaehler = [`zeilen ${zahl(sz.zahl.zeilen)} · kanten ${zahl(sz.zahl.kanten)}`, `dreiecke ${zahl(sz.zahl.dreiecke)}`, `farbtöne ${Math.round(fort * 360)}°`,
    `fragmente ${zahl(Math.round(sz.zahl.dreiecke * fort))} / ${zahl(sz.zahl.dreiecke)}`][nr];
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
    // 02–04 Dreiecke
    if (t >= sz.ersterFlug && t < fotoAb) dreieckeZeichnen(ctx, sz, t);
    // die Umrisse liegen über den Formen, bis die Farben kommen
    const kSicht = (1 - 0.6 * anteil(t, F0 + 0.4 * (F1 - F0), F1)) * (1 - anteil(t, C0, C0 + 0.5 * (C1 - C0)));
    if (t >= L0 + 0.3 * (L1 - L0) && kSicht > 0) kantenZeichnen(ctx, sz, t, kSicht);
    // das Foto rastet ein und steht
    if (t >= fotoAb) {
      fotoZeichnen(ctx, sz, t);
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
    signetZeichnen(ctx, (t - ab.signet[0]) * FPS, { hoehe: H, farben: F });
    ctx.restore();
    const weg = ausblenden(anteil(t, ab.signetAus[0], ab.signetAus[1]));
    if (weg > 0) { ctx.globalAlpha = weg; ctx.fillStyle = F.grund; ctx.fillRect(0, 0, B, H); ctx.globalAlpha = 1; }
  }
}

/** Zeitpunkt für das Standbild, wenn nichts anderes gewählt ist: das fertige farbige Mosaik, kurz bevor es umklappt */
export const standbildZeit = (sz) => sz.zeit.ab.zusammen[0] - 0.05;
