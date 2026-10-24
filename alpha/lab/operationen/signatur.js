// ORNAMENT LAB – die Signatur eines Films (seit Lab 0.1.26; Zeitpläne, Geometrie und Tonspur in kern/signatur.js). Vier Operationen:
//   signatur.intro   – Lichtwürfel → Raster des Zettelkastens → das Feld leuchtet → der Zettel wird gezogen (Leitsatz, vier Verweise) → Scratch in die Animation
//   signatur.outro   – die letzte Sequenz faltet sich zum Körper → Kugel → Doppelrad von ORNA mit der gezogenen Konstellation → wieder Kugel
//   signatur.signet  – aus der Kugel das Signet «ornament.lab», wie das von ornament.cloud gezeichnet, dazu im Raum drehend; leichte Montage auf dem Gefrickel
//   signatur.ton     – die Tonspur dazu: Scratch am Ende des Intros, Gefrickel unter dem Signet (frickeln.js aus PHORMA III)
// Die Bilder zeichnet die Leinwand des Browsers (2D, eigene Perspektive, Leuchten über einen weichgezeichneten Abzug), jedes Bild nur aus der Zeit:
// lebend() gibt dem Film über Stationen die Bühne (zeitbasis «auftritt»), ausfuehren() ein Standbild als Station. Gelesen und unverändert
// importiert werden: der Weg des Lichtwürfels (alpha/phorma-iii/irrweg.js), die Tonanalyse (ton.js), die 40 Zeichen und die Daten des Doppelrads
// (portfolio/nebeneinander-nacheinander/js/), die Strophen des Zettelkastens kommen über zettel.strophe, die Konstellation über orna.konstellation.
// Das Signet folgt alpha/sketchory/signet.js (Kurve, Zeitplan, Farben), mit dem Namen «ornament.lab». Schriften: Instrument Sans und Newsreader (vendor/fonts).
import * as G from "../kern/signatur.js";
import { tonAnalysieren } from "../../../alpha/phorma-iii/ton.js?v=23";
import { irrweg } from "../../../alpha/phorma-iii/irrweg.js?v=23";
import { symbolMarkup } from "../../../portfolio/nebeneinander-nacheinander/js/symbols.js?v=2";
import { constellations } from "../../../portfolio/nebeneinander-nacheinander/js/data/constellations.js";
import { artists } from "../../../portfolio/nebeneinander-nacheinander/js/data/artists.js";
import { theorists } from "../../../portfolio/nebeneinander-nacheinander/js/data/theorists.js";

const { anteil, weich, inOut, aus, mix, klemm } = G;
const GRUND = "#000000", TINTE = "#f2f2f0", WEISS = "#ffffff", PUNKT = "#f08a5d", PAPIER = "#f4f1ea", SCHWARZ = "#141414";
const SANS = '"Instrument Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SERIF = 'Newsreader, Georgia, "Times New Roman", serif';
const ROEMISCH = ["I", "II", "III", "IV", "V", "VI", "VII"];
const NAME = "ornament.lab";
const KUGEL_PUNKTE = 160, KUGEL_R = 0.62, KUGEL_DREHUNG = 0.9;
const DATEI = "alpha/lab/operationen/signatur.js, alpha/lab/kern/signatur.js";

const imBrowser = () => typeof document !== "undefined";
const leinwand = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h)); return c; };
const gerade = (n) => Math.max(2, Math.round(n / 2) * 2);

// ---------- Schriften (einmal geladen; ohne sie zeichnet die Leinwand in den Ersatzschriften) ----------
const LATIN = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const LATIN_EXT = "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";
let schriften = null;
function schriftenLaden() {
  if (schriften) return schriften;
  schriften = (async () => {
    if (typeof FontFace === "undefined" || !document.fonts) return;
    const url = (f) => `url(${new URL(`../../../vendor/fonts/${f}`, import.meta.url).href}) format("woff2")`;
    const ff = [
      ["Instrument Sans", "instrument-sans-normal-latin.woff2", "normal", LATIN], ["Instrument Sans", "instrument-sans-normal-latin-ext.woff2", "normal", LATIN_EXT],
      ["Newsreader", "newsreader-normal-latin.woff2", "normal", LATIN], ["Newsreader", "newsreader-normal-latin-ext.woff2", "normal", LATIN_EXT],
      ["Newsreader", "newsreader-italic-latin.woff2", "italic", LATIN], ["Newsreader", "newsreader-italic-latin-ext.woff2", "italic", LATIN_EXT],
    ].map(([f, d, style, unicodeRange]) => new FontFace(f, url(d), { style, weight: "200 800", unicodeRange }));
    await Promise.all(ff.map(async (f) => { try { await f.load(); document.fonts.add(f); } catch { /* Ersatzschrift */ } }));
  })();
  return schriften;
}

// ---------- die Bühne: Leinwand, Perspektive, Leuchten ----------
function buehne(W, H) {
  const c = leinwand(W, H), ctx = c.getContext("2d", { willReadFrequently: true });
  const gw = Math.max(2, Math.round(W / 4)), gh = Math.max(2, Math.round(H / 4)), glanz = leinwand(gw, gh), gx = glanz.getContext("2d");
  const filterDa = typeof ctx.filter === "string";
  const u = Math.min(W, H) / 2;
  return {
    c, ctx, W, H, u,
    p: (q) => G.projizieren(q, W, H),
    /** Bildpunkte → Welt (in der Ebene z = 0) */
    welt: (x, y) => [(x - W / 2) / u, (y - H / 2) / u, 0],
    grund() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.fillStyle = GRUND; ctx.fillRect(0, 0, W, H); },
    /** Leuchten: ein weichgezeichneter, verkleinerter Abzug, additiv darüber (wie der Bloom von PHORMA, nur leichter) */
    leuchten(staerke, radius = 3) {
      if (!filterDa || staerke <= 0.01) return;
      gx.globalCompositeOperation = "source-over"; gx.filter = "none"; gx.fillStyle = GRUND; gx.fillRect(0, 0, gw, gh);
      gx.filter = `blur(${radius}px)`; gx.drawImage(c, 0, 0, gw, gh); gx.filter = "none";
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, staerke); ctx.imageSmoothingQuality = "high";
      ctx.drawImage(glanz, 0, 0, W, H); ctx.restore();
    },
    daten() { const d = ctx.getImageData(0, 0, W, H); return { width: W, height: H, data: d.data }; },
  };
}

/** ein Bild des Labs ({ width, height, data }) als Leinwand W × H, unverzerrt eingepasst auf dem Grund der Fictory (wie einpassen() im Film) */
function alsLeinwand(bild, W, H) {
  const c = leinwand(W, H), x = c.getContext("2d");
  x.fillStyle = "rgb(21, 20, 18)"; x.fillRect(0, 0, W, H);
  if (!bild) return c;
  const q = leinwand(bild.width, bild.height);
  q.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(bild.data), bild.width, bild.height), 0, 0);
  const f = Math.min(W / bild.width, H / bild.height), bw = Math.round(bild.width * f), bh = Math.round(bild.height * f);
  x.imageSmoothingQuality = "high"; x.drawImage(q, Math.floor((W - bw) / 2), Math.floor((H - bh) / 2), bw, bh);
  return c;
}
/** die Masse der Bühne aus dem Bild am Eingang (längste Seite seite, gerade Masse), ohne Bild 4 : 5 */
function masse(bild, seite) {
  if (!bild) return { W: gerade((seite * 4) / 5), H: gerade(seite) };
  const f = Math.min(1, seite / Math.max(bild.width, bild.height));
  return { W: gerade(bild.width * f), H: gerade(bild.height * f) };
}
/** die Einsätze eines Tons ab beginn für dauer Sekunden (PHORMA III, ton.js), Zeiten ab beginn */
function einsaetzeVon(ton, beginn, dauer) {
  if (!ton?.pcm?.length || !ton.rate) return [];
  const a = Math.min(ton.pcm.length, Math.max(0, Math.floor(beginn * ton.rate))), b = Math.min(ton.pcm.length, Math.floor((beginn + dauer) * ton.rate));
  if (b - a < 0.3 * ton.rate) return [];
  return tonAnalysieren(ton.pcm.subarray(a, b), ton.rate, { spektrum: false }).einsaetze.map((e) => ({ t: e.t, staerke: e.staerke ?? 1 }));
}
/** Puls 0..1 aus Einsätzen: jeder schlägt an und klingt in 0,22 s ab */
const puls = (einsaetze, t) => einsaetze.reduce((m, e) => (t >= e.t ? Math.max(m, (e.staerke ?? 1) * Math.exp(-(t - e.t) / 0.22)) : m), 0);

/** ein Bildstück (Quelle sx, sy, sw, sh) affin auf drei Punkte des Bilds legen: oben links, oben rechts, unten links */
function stueck(ctx, quelle, [sx, sy, sw, sh], p0, p1, p3) {
  ctx.setTransform((p1[0] - p0[0]) / sw, (p1[1] - p0[1]) / sw, (p3[0] - p0[0]) / sh, (p3[1] - p0[1]) / sh, p0[0], p0[1]);
  ctx.drawImage(quelle, sx, sy, sw, sh, 0, 0, sw + 0.6, sh + 0.6);
}
const vieleck = (ctx, pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); };
/** zeigt ein Viereck (projiziert) zur Kamera? */
const vorn = (q) => (q[1][0] - q[0][0]) * (q[3][1] - q[0][1]) - (q[1][1] - q[0][1]) * (q[3][0] - q[0][0]) > 0;

/** Zeilenumbruch nach der gemessenen Breite */
function zeilen(ctx, text, breite) {
  const out = [];
  for (const absatz of String(text ?? "").split(/\n+/)) {
    let z = "";
    for (const w of absatz.split(/\s+/).filter(Boolean)) { const p = z ? `${z} ${w}` : w; if (z && ctx.measureText(p).width > breite) { out.push(z); z = w; } else z = p; }
    if (z) out.push(z);
  }
  return out;
}

// =================================================================================================================================
// Kacheln: ein Bild in Stücke zerlegt, die sich zum Körper falten und auf die Kugel legen (Outro, Auftakt des Signets)
function kacheln(B, quelle) {
  const spalten = 6, reihen = Math.max(3, Math.min(9, Math.round((6 * B.H) / B.W))), n = spalten * reihen;
  const sw = B.W / spalten, sh = B.H / reihen, k = [], kugel = G.kugelPunkte(KUGEL_PUNKTE, KUGEL_R), frei = new Set(kugel.keys());
  for (let r = 0; r < reihen; r++) for (let s = 0; s < spalten; s++) {
    const i = r * spalten + s, x0 = s * sw, y0 = r * sh;
    const flach = [B.welt(x0, y0), B.welt(x0 + sw, y0), B.welt(x0 + sw, y0 + sh), B.welt(x0, y0 + sh)];
    const w = G.wuerfelFeld(i, n, 0.5, 0.04);
    // der nächste freie Punkt der Kugel über der Mitte des Felds: dorthin legt sich das Stück
    const d = G.aufKugel(w.mitte, 1);
    let best = -1, bd = Infinity;
    for (const j of frei) { const q = kugel[j], e = (q[0] / KUGEL_R - d[0]) ** 2 + (q[1] / KUGEL_R - d[1]) ** 2 + (q[2] / KUGEL_R - d[2]) ** 2; if (e < bd) { bd = e; best = j; } }
    frei.delete(best);
    const abstand = Math.hypot(s - (spalten - 1) / 2, r - (reihen - 1) / 2) / Math.hypot((spalten - 1) / 2, (reihen - 1) / 2);
    k.push({ quelle: [x0, y0, sw, sh], flach, wuerfel: w.ecken, mitte: w.mitte, kugel: best, verzug: 0.5 * (1 - abstand) });
  }
  return { k, kugel, quelle, n };
}
/**
 * die Kacheln zeichnen. falten: 0..1 (flach → Würfel; je Kachel verzögert), kugeln: 0..1 (Würfel → Kugelpunkt), drehung(body→Kamera),
 * direkt: true (Auftakt) geht ohne Würfel vom Bild zur Kugel. Gibt die Kugelpunkte zurück, die schon Punkte sind (Index → Sicht).
 */
function kachelnZeichnen(B, K, { falten, kugeln, dreh, direkt = false, kanten = 0 }) {
  const { ctx } = B, liste = [];
  const sicht = new Map();
  for (const x of K.k) {
    const f = direkt ? 1 : inOut(klemm((falten - x.verzug * 0.6) / 0.62));
    const g = inOut(klemm((kugeln - (1 - x.verzug) * 0.35) / 0.65));
    const kp = K.kugel[x.kugel];
    const ecken = x.flach.map((fl, j) => {
      const w = dreh(x.wuerfel[j]);
      let p = direkt ? fl : G.lerp3(fl, w, f);
      if (!direkt && f > 0 && f < 1) p = [p[0], p[1], p[2] + 0.25 * Math.sin(Math.PI * f)];
      if (g > 0) {
        // zur Kugel: die Mitte geht auf den Punkt, das Stück wird klein
        const von = direkt ? x.flach.reduce((a, q) => a.map((v, c) => v + q[c] / 4), [0, 0, 0]) : dreh(x.mitte);
        const nach = dreh(kp), m = G.lerp3(von, nach, g), s = 1 - g * 0.92, q = direkt ? fl : w;
        p = G.lerp3(p, [m[0] + (q[0] - von[0]) * s, m[1] + (q[1] - von[1]) * s, m[2] + (q[2] - von[2]) * s], g);
      }
      return p;
    });
    if (g >= 0.98) { sicht.set(x.kugel, 1); continue; }
    if (g > 0.6) sicht.set(x.kugel, (g - 0.6) / 0.38);
    liste.push({ x, ecken, z: ecken.reduce((s, e) => s + e[2], 0) / 4, alpha: 1 - anteil(g, 0.7, 0.98) });
  }
  liste.sort((a, b) => a.z - b.z);
  for (const { x, ecken, alpha } of liste) {
    const q = ecken.map(B.p);
    const v = vorn(q);
    ctx.save(); ctx.globalAlpha = alpha;
    stueck(ctx, K.quelle, x.quelle, q[0], q[1], q[3]);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!v) { vieleck(ctx, q); ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fill(); }   // Rückseiten dunkler
    ctx.restore();
    if (kanten > 0) { ctx.save(); ctx.globalAlpha = alpha * kanten * (v ? 0.8 : 0.3); ctx.strokeStyle = TINTE; ctx.lineWidth = Math.max(1, B.u * 0.003); vieleck(ctx, q); ctx.stroke(); ctx.restore(); }
  }
  return sicht;
}
/** die Kugel als leuchtende Punkte (Kamerakoordinaten), sicht je Punkt (Map oder Zahl) */
function punkteZeichnen(B, pts, sicht = 1, farbe = TINTE, groesse = 0.014) {
  const { ctx } = B;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = farbe;
  pts.forEach((q, i) => {
    const a = typeof sicht === "number" ? sicht : sicht.get(i) ?? 0;
    if (a <= 0) return;
    const [x, y, s] = B.p(q), tiefe = klemm((q[2] / KUGEL_R + 1) / 2);
    ctx.globalAlpha = a * mix(0.35, 1, tiefe);
    ctx.beginPath(); ctx.arc(x, y, Math.max(1, B.u * groesse * s * mix(0.7, 1.1, tiefe)), 0, Math.PI * 2); ctx.fill();
  });
  ctx.restore();
}
/** die Drehung der Kugel: am Ende des Outros und am Anfang des Signets dieselbe (Kugel → Signet ohne Sprung) */
const kugelDreh = (gier) => (p) => G.drehen(p, gier, -0.32);

// =================================================================================================================================
// INTRO
function introBuehne(B, { zettel, ziel, einsaetze, seed }) {
  const { ctx, W, H, u } = B, h = 0.42;
  const weg = irrweg((seed % 9973) + 1), WN = weg.length / 4, kanten = G.wuerfelKanten(h);
  const quer = W > H * 1.05, g = quer ? 0.2 : 0.205, dy = quer ? 0.04 : 0.02, rasterX = quer ? 0.05 : 0.06;
  const ziehen = zettel.nummer;
  const zielC = alsLeinwand(ziel, W, H);
  // die Karte: Fläche im Bild, Inhalt einmal gesetzt (nur die Sichtbarkeit wechselt)
  const kw = Math.round(quer ? Math.min(0.62 * W, 0.86 * H * 1.15) : 0.86 * W), kh = Math.round(quer ? 0.86 * H : Math.min(0.82 * H, 0.86 * W * 1.42));
  const kx = Math.round((W - kw) / 2), ky = Math.round((H - kh) / 2);
  const karteEcken = [B.welt(kx, ky), B.welt(kx + kw, ky), B.welt(kx + kw, ky + kh), B.welt(kx, ky + kh)];
  const K = leinwand(kw, kh), kc = K.getContext("2d");
  const satz = karteSetzen(kc, kw, kh, zettel);
  const puls0 = einsaetze.length ? einsaetze : Array.from({ length: 8 }, (_, i) => ({ t: 1.0 + i * 0.5, staerke: 0.8 }));
  let abzug = null;   // das Bild am Beginn des Scratchs (die Karte), einmal gezeichnet

  const wuerfelDreh = (t) => { const gier = 0.55 + t * 0.62, nick = -0.42 + 0.08 * Math.sin(t * 1.3); return (p) => G.drehen(p, gier, nick); };
  const feldEcken = (i, t) => {
    const P = G.INTRO_PHASEN, dreh = wuerfelDreh(t), z = G.rasterFeld(i + 1, g, dy);
    const verzug = (i % 6) * 0.07 + Math.floor(i / 6) * 0.025, e = inOut(anteil(t, P.entfalten[0] + verzug, P.entfalten[0] + verzug + 1.0));
    const s = (0.2 + 0.8 * aus(anteil(t, 0, 1.0))) * (1 + 0.06 * puls(puls0, t) * (1 - e));
    const w = G.wuerfelFeld(i, 49, h, 0.14).ecken.map((p) => dreh(p.map((c) => c * s)));
    const r = z.ecken.map((p) => [p[0] + rasterX, p[1], p[2]]);
    return { ecken: w.map((p, j) => { const q = G.lerp3(p, r[j], e); return [q[0], q[1], q[2] + 0.3 * Math.sin(Math.PI * e)]; }), e, zeile: z.zeile, spalte: z.spalte };
  };

  function szene(t) {
    const P = G.INTRO_PHASEN;
    B.grund();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    const E0 = P.entfalten[0], pl = puls(puls0, t) * (1 - anteil(t, E0, E0 + 0.6)), dreh = wuerfelDreh(t), s = (0.2 + 0.8 * aus(anteil(t, 0, 1.0))) * (1 + 0.07 * pl);
    // 1 · ein Licht im Nichts
    const licht = anteil(t, 0, 0.35) * (1 - anteil(t, 0.6, 1.2));
    if (licht > 0) {
      const gr = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, u * 0.1 * (0.3 + licht));
      gr.addColorStop(0, `rgba(255,255,255,${0.9 * licht})`); gr.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    }
    // 2 · der Würfel: die Kanten zeichnen sich, dann pulsiert er auf den Schlägen; beim Entfalten vergeht er
    const zeichnen = anteil(t, 0.25, 1.3), kantenSicht = 1 - anteil(t, E0 + 0.2, E0 + 1.0);
    if (zeichnen > 0 && kantenSicht > 0) {
      ctx.save();
      kanten.forEach(([a, b], k) => {
        const f = weich(anteil(zeichnen, k / 20, k / 20 + 0.42));
        if (f <= 0) return;
        const A = dreh(a.map((c) => c * s)), Bq = dreh(b.map((c) => c * s)), E = G.lerp3(A, Bq, f), pa = B.p(A), pe = B.p(E);
        const tiefe = klemm(((A[2] + E[2]) / 2 / h + 1) / 2);
        ctx.globalAlpha = kantenSicht * (0.62 + 0.38 * pl) * mix(0.55, 1, tiefe);
        ctx.strokeStyle = WEISS; ctx.lineWidth = u * 0.011 * mix(0.8, 1.15, tiefe) * (1 + 0.3 * pl);
        ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pe[0], pe[1]); ctx.stroke();
      });
      ctx.restore();
    }
    // der Faden irrt im Würfel (der Weg des Lichtwürfels von PHORMA III)
    const faden = anteil(t, 0.8, 1.5) * (1 - anteil(t, P.wuerfel[1] - 0.3, P.wuerfel[1] + 0.3));
    if (faden > 0) {
      const kopf = Math.floor(120 + t * 300 + pl * 40), lang = 420;
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = "#ffe7d2"; ctx.lineWidth = Math.max(1, u * 0.0035); ctx.globalAlpha = 0.75 * faden;
      ctx.beginPath();
      for (let k = Math.max(0, kopf - lang); k <= kopf; k++) {
        const j = (k % WN) * 4, q = dreh([weg[j] * 2 * h * s * 0.96, weg[j + 1] * 2 * h * s * 0.96, weg[j + 2] * 2 * h * s * 0.96]), p = B.p(q);
        if (k === Math.max(0, kopf - lang)) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke(); ctx.restore();
    }
    // 3 · die 49 Felder: auf dem Würfel, dann fliegen sie zum Raster; das Feld des Zettels leuchtet, dann wird es gezogen
    const felderSicht = anteil(t, E0 - 0.5, E0 + 0.1);
    const leuchtet = anteil(t, P.leuchten[0] + 0.1, P.leuchten[0] + 0.45), dunkler = anteil(t, P.leuchten[0] + 0.2, P.leuchten[1]);
    const zug = inOut(anteil(t, P.ziehen[0], P.ziehen[1])), weg2 = anteil(t, P.ziehen[0], P.ziehen[1] - 0.1);
    if (felderSicht > 0) {
      const liste = [];
      for (let i = 0; i < 49; i++) { const f = feldEcken(i, t); liste.push({ i, ...f, z: f.ecken.reduce((a, q) => a + q[2], 0) / 4 }); }
      liste.sort((a, b) => a.z - b.z);
      for (const f of liste) {
        if (f.i + 1 === ziehen && zug > 0) continue;   // es wird unten gezogen
        const rueck = 1 - 0.15 * weg2, ecken = f.ecken.map((q) => [q[0] * rueck, q[1] * rueck, q[2] - 0.4 * weg2]);
        const q = ecken.map(B.p), ist = f.i + 1 === ziehen;
        const a = felderSicht * (ist ? 1 : 1 - 0.6 * dunkler) * (1 - 0.85 * weg2);
        ctx.save(); ctx.globalAlpha = a; vieleck(ctx, q);
        if (ist && leuchtet > 0) { ctx.fillStyle = PUNKT; ctx.globalAlpha = a * leuchtet; ctx.fill(); ctx.globalAlpha = a; }
        else { ctx.fillStyle = "rgba(242,242,240,0.07)"; ctx.fill(); }
        ctx.strokeStyle = ist && leuchtet > 0 ? PUNKT : TINTE; ctx.lineWidth = Math.max(1, u * 0.0042); ctx.stroke();
        ctx.restore();
      }
      // die Zyklen am Rand, oben der Kasten
      const schrift = anteil(t, P.leuchten[0], P.leuchten[0] + 0.4) * (1 - weg2);
      if (schrift > 0) {
        ctx.save(); ctx.globalAlpha = schrift; ctx.fillStyle = TINTE; ctx.textBaseline = "middle";
        ctx.font = `500 ${Math.round(u * g * 0.3)}px ${SANS}`; ctx.textAlign = "right";
        ROEMISCH.forEach((r, z) => { const p = B.p([rasterX - 3.5 * g - 0.06, (z - 3) * g + dy, 0]); ctx.globalAlpha = schrift * (z === Math.floor((ziehen - 1) / 7) ? 1 : 0.55); ctx.fillText(r, p[0], p[1]); });
        ctx.globalAlpha = schrift; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        const o = B.p([rasterX - 3.5 * g, -3.5 * g + dy - 0.1, 0]);
        ctx.font = `500 ${Math.round(u * 0.07)}px ${SANS}`; ctx.fillText("Zettelkasten", o[0], o[1] - u * 0.06);
        ctx.font = `400 ${Math.round(u * 0.04)}px ${SANS}`; ctx.globalAlpha = schrift * 0.7; ctx.fillText("7 Zyklen × 7 Strophen = 49 Strophen", o[0], o[1]);
        const fu = B.p([rasterX - 3.5 * g, 3.5 * g + dy + 0.1, 0]);
        ctx.textBaseline = "top"; ctx.globalAlpha = schrift * anteil(t, P.leuchten[0] + 0.25, P.leuchten[0] + 0.6);
        ctx.fillStyle = PUNKT; ctx.font = `500 ${Math.round(u * 0.045)}px ${SANS}`;
        ctx.fillText(`${zettel.zyklus} · ${zettel.nummer} ${zettel.titel}`, fu[0], fu[1]);
        ctx.restore();
      }
    }
    B.leuchten(0.55 * (1 - anteil(t, P.ziehen[0], P.zettel[0])) + 0.25 * pl, 3);
    // 4 · der Zettel wird gezogen: das leuchtende Feld kommt nach vorn und wird zur Karte; ihr Inhalt erscheint Zeile um Zeile
    if (zug > 0.5) karteZeichnen(kc, kw, kh, satz, zettel, t);
    if (zug > 0) {
      const f = feldEcken(ziehen - 1, t), e = f.ecken.map((q, j) => { const r = G.lerp3(q, karteEcken[j], zug); return [r[0], r[1], r[2] + 0.55 * Math.sin(Math.PI * zug)]; });
      const q = e.map(B.p);
      ctx.save(); vieleck(ctx, q);
      ctx.fillStyle = mischFarbe(PUNKT, PAPIER, anteil(zug, 0.3, 1)); ctx.fill();
      if (zug > 0.55) { ctx.clip(); ctx.globalAlpha = anteil(zug, 0.55, 1); stueck(ctx, K, [0, 0, kw, kh], q[0], q[1], q[3]); }
      ctx.restore();
    }
  }

  function zeichne(t) {
    const P = G.INTRO_PHASEN;
    if (t < P.scratch[0]) { szene(t); return B.daten(); }
    // 6 · Scratch: wie eine Platte unter der Hand läuft der Streifen Karte | Animation vor und zurück, der Fader macht an den Umkehrungen zu
    if (!abzug) { szene(P.scratch[0]); abzug = leinwand(W, H); abzug.getContext("2d").drawImage(B.c, 0, 0); }
    const x = anteil(t, P.scratch[0], P.scratch[1]), sc = G.scratch(x), vor = G.scratch(Math.max(0, x - 0.03));
    const v = (sc.stelle - vor.stelle) * W * 0.6;
    B.grund();
    const zeigen = (versatz, a) => {
      ctx.globalAlpha = a;
      ctx.drawImage(abzug, -sc.stelle * W + versatz, 0);
      ctx.drawImage(zielC, (1 - sc.stelle) * W + versatz, 0);
    };
    ctx.save();
    zeigen(0, 1);
    if (Math.abs(v) > 1) { zeigen(-v * 0.5, 0.35); zeigen(-v, 0.18); }   // verschmiert in der Richtung des Zugs
    ctx.restore();
    if (sc.fader < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - sc.fader})`; ctx.fillRect(0, 0, W, H); }
    if (x >= 0.999) { ctx.drawImage(zielC, 0, 0); }
    return B.daten();
  }
  return { bild: zeichne, dauer: G.INTRO_DAUER };
}

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mischFarbe = (a, b, x) => { const p = hex(a), q = hex(b); return `rgb(${p.map((v, i) => Math.round(mix(v, q[i], x))).join(",")})`; };

/** der Inhalt der Karte setzen: Kopf, Titel, Leitsatz, vier Verweise; die Grösse passt sich an, bis alles Platz hat */
function karteSetzen(kc, kw, kh, z) {
  const verweise = (z.verweise ?? []).slice(0, 4);
  for (let q = Math.min(kw * 0.052, kh * 0.042); q > 6; q *= 0.94) {
    const rand = q * 2.2, breite = kw - 2 * rand;
    kc.font = `500 ${Math.round(q * 2)}px ${SANS}`; const titel = zeilen(kc, z.titel, breite);
    kc.font = `italic 400 ${Math.round(q * 1.32)}px ${SERIF}`; const satz = zeilen(kc, z.leitsatz, breite);
    kc.font = `italic 400 ${Math.round(q * 0.86)}px ${SERIF}`;
    const werke = verweise.map((v) => zeilen(kc, `${v.werk}${v.disziplin ? ` · ${v.disziplin}` : ""}`, breite));
    const oben = rand + q * 2.6, mitte = titel.length * q * 2.3 + q * 1.1 + satz.length * q * 1.32 * 1.42;
    const unten = q * 1.6 + werke.reduce((s, w) => s + q * 1.25 + w.length * q * 1.15 + q * 0.55, 0);
    if (oben + mitte + q * 2 + unten + rand <= kh) return { q, rand, breite, titel, satz, werke, verweise, unten };
  }
  return { q: 6, rand: 12, breite: kw - 24, titel: [z.titel], satz: [z.leitsatz], werke: [], verweise: [], unten: 0 };
}
function karteZeichnen(kc, kw, kh, s, z, t) {
  const P = G.INTRO_PHASEN, { q, rand } = s, sicht = (a) => weich(anteil(t, a, a + 0.3)), hoch = (a) => (1 - sicht(a)) * q * 0.6;
  kc.setTransform(1, 0, 0, 1, 0, 0); kc.globalAlpha = 1; kc.fillStyle = PAPIER; kc.fillRect(0, 0, kw, kh);
  kc.fillStyle = SCHWARZ; kc.textBaseline = "alphabetic"; kc.textAlign = "left";
  const t0 = P.zettel[0] - 0.2;
  // Kopf: Zettelkasten · Zyklus, rechts die Nummer und das kleine Raster mit dem Feld
  kc.globalAlpha = sicht(t0);
  kc.font = `500 ${Math.round(q * 0.78)}px ${SANS}`;
  kc.fillText(`Zettelkasten · ${z.zyklus} ${z.zyklusTitel}`, rand, rand + q * 0.8);
  const m = q * 0.24, gx = kw - rand - 7 * m * 1.35;
  for (let i = 0; i < 49; i++) { const x = gx + (i % 7) * m * 1.35, y = rand + Math.floor(i / 7) * m * 1.35 - q * 0.2; kc.fillStyle = i + 1 === z.nummer ? PUNKT : "rgba(20,20,20,0.22)"; kc.fillRect(x, y, m, m); }
  kc.fillStyle = SCHWARZ; kc.textAlign = "right";
  kc.fillText(`${z.nummer} / 49`, gx - q * 0.6, rand + q * 0.8); kc.textAlign = "left";
  kc.globalAlpha = sicht(t0) * 0.35; kc.fillRect(rand, rand + q * 1.5, kw - 2 * rand, Math.max(1, q * 0.06));
  // Titel und Leitsatz
  let y = rand + q * 2.6 + q * 2;
  kc.globalAlpha = sicht(t0 + 0.15); kc.font = `500 ${Math.round(q * 2)}px ${SANS}`;
  for (const l of s.titel) { kc.fillText(l, rand, y + hoch(t0 + 0.15)); y += q * 2.3; }
  y += q * 1.1;
  kc.globalAlpha = sicht(t0 + 0.35); kc.font = `italic 400 ${Math.round(q * 1.32)}px ${SERIF}`;
  for (const l of s.satz) { kc.fillText(l, rand, y + hoch(t0 + 0.35)); y += q * 1.32 * 1.42; }
  // die vier Verweise, unten, einer nach dem anderen
  let yu = kh - rand - s.unten + q * 0.9;
  kc.globalAlpha = sicht(t0 + 0.8) * 0.55; kc.font = `500 ${Math.round(q * 0.66)}px ${SANS}`;
  kc.fillText("VERWEISE", rand, yu); kc.fillRect(rand, yu + q * 0.35, kw - 2 * rand, Math.max(1, q * 0.04));
  yu += q * 0.7;
  s.verweise.forEach((v, k) => {
    const a = t0 + 1.0 + k * 0.3;
    kc.globalAlpha = sicht(a);
    yu += q * 1.25;
    kc.fillStyle = PUNKT; kc.fillRect(rand, yu - q * 0.62, q * 0.36, q * 0.36);
    kc.fillStyle = SCHWARZ; kc.font = `500 ${Math.round(q * 0.92)}px ${SANS}`; kc.fillText(v.person, rand + q * 0.75, yu + hoch(a));
    kc.font = `italic 400 ${Math.round(q * 0.86)}px ${SERIF}`;
    for (const l of s.werke[k]) { yu += q * 1.15; kc.globalAlpha = sicht(a) * 0.8; kc.fillText(l, rand + q * 0.75, yu + hoch(a)); }
    yu += q * 0.55;
  });
  kc.globalAlpha = 1;
}

// =================================================================================================================================
// OUTRO
/** die Plätze der Konstellation im Rad: Künstlerin aussen, Theoretiker innen (wie geometry.js targetsFor) */
export function radPlaetze(konstellation) {
  const k = constellations.find((c) => c.id === konstellation?.id) ?? null;
  const a = k ? artists.findIndex((p) => p.id === k.artistId) : 0, b = k ? theorists.findIndex((p) => p.id === k.theoristId) : 0;
  return { aussen: Math.max(0, a), innen: Math.max(0, b) };
}
/** die Pfade eines Zeichens (symbols.js) als Path2D, mit Art (Linie, Punkt, Geist, Überlagerung) */
const ZEICHEN = new Map();
function zeichenPfade(index) {
  if (ZEICHEN.has(index)) return ZEICHEN.get(index);
  const m = symbolMarkup(index, 1), teile = [];
  for (const x of m.matchAll(/<(path|circle)([^>]*)\/>/g)) {
    const a = Object.fromEntries([...x[2].matchAll(/([a-z-]+)="([^"]*)"/g)].map((y) => [y[1], y[2]]));
    const geist = /sym-ghost/.test(a.class ?? ""), ueber = /sym-over/.test(a.class ?? "");
    const versatz = /translate\(([-\d.]+),([-\d.]+)\)/.exec(a.transform ?? "");
    let p;
    if (x[1] === "path") p = new Path2D(a.d);
    else { p = new Path2D(); p.arc(Number(a.cx), Number(a.cy), Number(a.r), 0, Math.PI * 2); }
    teile.push({ p, punkt: x[1] === "circle", geist, ueber, strich: a["stroke-dasharray"] ? a["stroke-dasharray"].split(" ").map(Number) : null, versatz: versatz ? [Number(versatz[1]), Number(versatz[2])] : null });
  }
  ZEICHEN.set(index, teile);
  return teile;
}
function zeichen(ctx, index, x, y, winkel, groesse, lw, farbe, sicht) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(winkel); ctx.scale(groesse, groesse);
  ctx.strokeStyle = farbe; ctx.fillStyle = farbe; ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const t of zeichenPfade(index)) {
    ctx.save(); if (t.versatz) ctx.translate(...t.versatz);
    ctx.globalAlpha = sicht * (t.geist ? 0.45 : 1);
    if (t.punkt) ctx.fill(t.p);
    else { ctx.lineWidth = (t.ueber ? 0.7 : 1) * lw / groesse; if (t.strich) ctx.setLineDash(t.strich.map((d) => (d / 100) * 4.5)); ctx.stroke(t.p); }
    ctx.restore();
  }
  ctx.restore();
}

function outroBuehne(B, { bild, konstellation, standard }) {
  const { ctx, W, H, u } = B;
  const K = kacheln(B, alsLeinwand(bild, W, H)), plaetze = radPlaetze(konstellation);
  const quer = W > H * 1.05, quadrat = !quer && H < W * 1.05;
  const R = quer ? 0.82 : quadrat ? 0.62 : Math.min(0.82, (H / u) * 0.33);
  const mitteRad = quer ? [-(W / u) / 2 + 0.12 + R, 0, 0] : [0, -(H / u) / 2 + 0.1 + R, 0];
  const r = (x) => (x / 500) * R;
  // Text der Konstellation: Kopf, Namen, Frage, Regel; im Hochformat unter dem Rad, quer daneben
  const text = konstellation ? { kopf: `ORNA · Konstellation ${konstellation.nummer}`, namen: `${konstellation.kuenstler} × ${konstellation.theoretiker}`, frage: konstellation.frage ?? "",
    regel: konstellation.regel ? `Operationsregel ${konstellation.regel} · ${konstellation.regelName}` : "" } : { kopf: "ORNA", namen: "", frage: "", regel: "" };
  const feld = quer ? { x: W / 2 + u * (mitteRad[0] + R + 0.12), y: H * 0.18, w: W - (W / 2 + u * (mitteRad[0] + R + 0.12)) - W * 0.06, h: H * 0.64 }
    : { x: W * 0.07, y: H / 2 + u * (mitteRad[1] + R + 0.1), w: W * 0.86, h: H - (H / 2 + u * (mitteRad[1] + R + 0.1)) - H * 0.04 };
  const satz = textSetzen(ctx, feld, text, Math.min(W, H));
  // die Kugelpunkte im Rad: 20 + 20 Zeichen, dann je 30 Punkte auf den vier Kreisen
  const kreise = [RAD_R("aussen", "rand"), RAD_R("aussen", "innen"), RAD_R("innen", "rand"), RAD_R("innen", "innen")];
  function RAD_R(ring, k) { return G.RAD[ring][k]; }
  const zielImRad = (i, drehA, drehI) => {
    const lage = (rr, grad) => { const a = (grad * Math.PI) / 180; return [mitteRad[0] + r(rr) * Math.sin(a), mitteRad[1] - r(rr) * Math.cos(a), 0]; };
    if (i < 20) return lage(G.RAD.aussen.zeichen, i * 18 + drehA);
    if (i < 40) return lage(G.RAD.innen.zeichen, (i - 20) * 18 + drehI);
    const k = i - 40, kreis = Math.floor(k / 30), j = k % 30;
    return lage(kreise[kreis], j * 12 + (kreis < 2 ? drehA : drehI));
  };
  const ziele = { aussen: G.radZiel(plaetze.aussen), innen: G.radZiel(plaetze.innen) };
  const verzug = Array.from({ length: KUGEL_PUNKTE }, (_, i) => ((i * 0.618) % 1) * 0.35);

  function zeichne(t, L) {
    const Q = G.outroPhasen(L);
    B.grund();
    // die Drehung der Kugel: am Ende (L) genau die, mit der das Signet beginnt
    const gier = t < Q.zurueck[0] ? KUGEL_DREHUNG * t : KUGEL_DREHUNG * (t - L);
    const dreh = kugelDreh(gier), kugel = K.kugel.map(dreh);
    const falten = anteil(t, Q.falten[0], Q.falten[1]), kugeln = anteil(t, Q.kugel[0], Q.kugel[1]);
    // der Körper: die Drehung beginnt von vorn (das Bild steht zuerst still)
    const koerper = (p) => { const x = inOut(falten); return G.drehen(p, gier * x + 0.0, -0.32 * x); };
    let sicht = new Map();
    if (kugeln < 1) sicht = kachelnZeichnen(B, K, { falten, kugeln, dreh: kugeln > 0 ? (p) => G.lerp3(koerper(p), dreh(p), inOut(kugeln)) : koerper, kanten: anteil(falten, 0.4, 1) * (1 - kugeln) });
    // Rad: drehen, Plätze, Kreise
    const x = anteil(t, Q.drehen[0], Q.drehen[1]);
    const drehA = G.radDrehung(ziele.aussen, x, 1), drehI = G.radDrehung(ziele.innen, x, -1, 1.5);
    const zumRad = (i) => inOut(anteil(t, Q.rad[0] + verzug[i], Q.rad[0] + verzug[i] + 0.85)), zurueck = (i) => inOut(anteil(t, Q.zurueck[0] + verzug[i] * 0.6, Q.zurueck[0] + verzug[i] * 0.6 + 0.85));
    const radSicht = anteil(t, Q.rad[1] - 0.35, Q.rad[1] + 0.1) * (1 - anteil(t, Q.zurueck[0], Q.zurueck[0] + 0.35));
    const pts = kugel.map((q, i) => { const a = zumRad(i) * (1 - zurueck(i)); return a > 0 ? G.lerp3(q, zielImRad(i, drehA, drehI), a) : q; });
    // die Punkte: aus den Kacheln, dann alle; im Rad werden sie zu Zeichen und Kreisen
    const punktSicht = new Map();
    for (let i = 0; i < KUGEL_PUNKTE; i++) {
      const ausKachel = kugeln >= 1 ? 1 : sicht.get(i) ?? anteil(kugeln, 0.55 + verzug[i] * 0.8, 0.95 + verzug[i] * 0.3);
      punktSicht.set(i, Math.max(0, ausKachel * (1 - radSicht * (i < 40 ? 1 : 0.85))));
    }
    if (radSicht > 0) radZeichnen(B, mitteRad, R, drehA, drehI, radSicht, plaetze, anteil(t, Q.drehen[1] - 0.15, Q.drehen[1] + 0.35) * (1 - anteil(t, Q.zurueck[0] - 0.2, Q.zurueck[0] + 0.2)));
    punkteZeichnen(B, pts, punktSicht);
    B.leuchten(0.5 * (kugeln > 0 ? 1 : falten) * (1 - 0.6 * radSicht) + 0.25 * radSicht, 3);
    // der Text der Konstellation
    const ts = anteil(t, Q.zeigen[0], Q.zeigen[0] + 0.45) * (1 - anteil(t, Q.zurueck[0] - 0.1, Q.zurueck[0] + 0.3));
    if (ts > 0) textZeichnen(ctx, feld, satz, ts, t - Q.zeigen[0]);
    return B.daten();
  }
  return { bild: zeichne, dauer: standard };
}
/** das Doppelrad zeichnen (wie wheel.js, in Weiss auf Schwarz): Rahmen, beide Ringe mit Kanten, Teilung, Zeichen; treffer: die Plätze auf der Achse */
function radZeichnen(B, m, R, drehA, drehI, sicht, plaetze, treffer) {
  const { ctx, u } = B, c = B.p(m), s = (R / 500) * u * c[2], lw = Math.max(1, 1.5 * s);
  ctx.save(); ctx.strokeStyle = TINTE; ctx.lineCap = "round";
  const kreis = (rr, a = 1, w = lw, strich = null) => { ctx.globalAlpha = sicht * a; ctx.lineWidth = w; ctx.setLineDash(strich ?? []); ctx.beginPath(); ctx.arc(c[0], c[1], rr * s, 0, Math.PI * 2); ctx.stroke(); };
  const strich = (r0, r1, grad, a, w) => { const g = ((grad - 90) * Math.PI) / 180; ctx.globalAlpha = sicht * a; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(c[0] + r0 * s * Math.cos(g), c[1] + r0 * s * Math.sin(g)); ctx.lineTo(c[0] + r1 * s * Math.cos(g), c[1] + r1 * s * Math.sin(g)); ctx.stroke(); };
  kreis(484, 0.35, lw * 0.5, [2 * s, 5 * s]);
  ctx.setLineDash([]);
  strich(0, 150, 0, 0.18, lw * 0.5); strich(0, 150, 180, 0.18, lw * 0.5); strich(0, 150, 90, 0.18, lw * 0.5); strich(0, 150, 270, 0.18, lw * 0.5);
  for (const [ring, dreh] of [["aussen", drehA], ["innen", drehI]]) {
    const g = G.RAD[ring];
    kreis(g.rand, 1, lw * 1.1); kreis(g.innen, 0.6, lw * 0.6);
    for (let i = 0; i < 100; i++) if (i % 5) strich(g.rand, g.rand - 7, dreh + i * 3.6 + 9, 0.4, lw * 0.45);
    for (let i = 0; i < 20; i++) { strich(g.rand, g.rand - 16, dreh + i * 18 + 9, 0.75, lw * 0.7); strich(g.innen, g.innen + 12, dreh + i * 18 + 9, 0.75, lw * 0.7); }
    for (let i = 0; i < 20; i++) {
      const grad = dreh + i * 18, a = (grad * Math.PI) / 180, x = c[0] + g.zeichen * s * Math.sin(a), y = c[1] - g.zeichen * s * Math.cos(a);
      const hit = i === (ring === "aussen" ? plaetze.aussen : plaetze.innen);
      zeichen(ctx, (ring === "aussen" ? 0 : 20) + i, x, y, a, g.halb * s, lw * (hit ? 1 + 0.5 * treffer : 1), hit && treffer > 0 ? mischFarbe(TINTE, PUNKT, treffer) : TINTE, sicht);
      if (hit && treffer > 0) { ctx.save(); ctx.globalAlpha = sicht * treffer; ctx.strokeStyle = PUNKT; ctx.lineWidth = lw * 1.2; ctx.beginPath(); ctx.arc(x, y, (g.halb + 14) * s, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    }
  }
  // die Achse: feine Linie, Marke oben
  ctx.globalAlpha = sicht * 0.8; ctx.lineWidth = lw * 0.6; ctx.beginPath(); ctx.moveTo(c[0], c[1] - 470 * s); ctx.lineTo(c[0], c[1] - 200 * s); ctx.stroke();
  ctx.globalAlpha = sicht; ctx.fillStyle = treffer > 0 ? mischFarbe(TINTE, PUNKT, treffer) : TINTE;
  ctx.beginPath(); ctx.moveTo(c[0], c[1] - 474 * s); ctx.lineTo(c[0] - 11 * s, c[1] - 496 * s); ctx.lineTo(c[0] + 11 * s, c[1] - 496 * s); ctx.closePath(); ctx.fill();
  ctx.restore();
}
/** der Text unter (oder neben) dem Rad: Kopf, Namen, Frage, Regel; die Grösse passt sich dem Feld an */
function textSetzen(ctx, feld, text, kurz) {
  for (let q = kurz * 0.03; q > 5; q *= 0.92) {
    ctx.font = `500 ${Math.round(q * 1.55)}px ${SANS}`; const namen = zeilen(ctx, text.namen, feld.w);
    ctx.font = `italic 400 ${Math.round(q * 1.12)}px ${SERIF}`; const frage = zeilen(ctx, text.frage, feld.w);
    ctx.font = `400 ${Math.round(q * 0.72)}px ${SANS}`; const regel = zeilen(ctx, text.regel, feld.w);
    const h = q * 1.2 + namen.length * q * 1.8 + q * 0.6 + frage.length * q * 1.12 * 1.4 + q * 0.6 + regel.length * q * 1.05;
    if (h <= feld.h) return { q, namen, frage, regel, kopf: text.kopf, h };
  }
  return { q: 5, namen: [text.namen], frage: [], regel: [], kopf: text.kopf, h: 0 };
}
function textZeichnen(ctx, feld, s, sicht, t) {
  const { q } = s, ein = (a) => weich(klemm((t - a) / 0.35));
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  let y = feld.y + q * 0.9;
  ctx.globalAlpha = sicht * ein(0) * 0.7; ctx.fillStyle = PUNKT; ctx.font = `500 ${Math.round(q * 0.72)}px ${SANS}`; ctx.fillText(s.kopf.toUpperCase(), feld.x, y);
  y += q * 0.3;
  ctx.fillStyle = WEISS; ctx.font = `500 ${Math.round(q * 1.55)}px ${SANS}`;
  for (const l of s.namen) { y += q * 1.8; ctx.globalAlpha = sicht * ein(0.15); ctx.fillText(l, feld.x, y); }
  y += q * 0.6;
  ctx.fillStyle = TINTE; ctx.font = `italic 400 ${Math.round(q * 1.12)}px ${SERIF}`;
  for (const l of s.frage) { y += q * 1.12 * 1.4; ctx.globalAlpha = sicht * ein(0.45); ctx.fillText(l, feld.x, y); }
  y += q * 0.6;
  ctx.fillStyle = TINTE; ctx.font = `400 ${Math.round(q * 0.72)}px ${SANS}`;
  for (const l of s.regel) { y += q * 1.05; ctx.globalAlpha = sicht * ein(0.8) * 0.65; ctx.fillText(l, feld.x, y); }
  ctx.restore();
}

// =================================================================================================================================
// SIGNET: wie alpha/sketchory/signet.js (für 1080 × 1920), mit dem Namen «ornament.lab», auf einer Tafel im Raum
const TAFEL = { x: 140, y: 600, w: 800, h: 700 };   // der Ausschnitt der Zeichnung, der auf die Tafel kommt
const SCHLAUFE_PX = 420, SCHLAUFE_Y = 870, KASTEN = 52, ABSTAND = 4, GROESSE = 52, OBEN = 1175;
/** der Schriftzug auf die Tafel (die Schlaufe und der Punkt stehen als Linien im Raum, signetBuehne) */
function tafelZeichnen(tc, sc, f) {
  tc.setTransform(1, 0, 0, 1, 0, 0); tc.clearRect(0, 0, tc.canvas.width, tc.canvas.height);
  tc.setTransform(sc, 0, 0, sc, -TAFEL.x * sc, -TAFEL.y * sc);
  // Schriftzug: Kästchen erscheinen, aus jedem wird ein Buchstabe, dann rücken sie zusammen (Zeitplan von signet.js)
  tc.font = `400 ${GROESSE}px ${SANS}`;
  const zusammen = inOut(anteil(f, 128, 146)), sperrung = 0.14 * GROESSE;
  const breiten = NAME.split("").map((z) => mix(KASTEN, tc.measureText(z).width, zusammen)), abstand = mix(ABSTAND, sperrung, zusammen);
  const gesamt = breiten.reduce((a, b) => a + b, 0) + (NAME.length - 1) * abstand, m = tc.measureText("o");
  const auf = m.fontBoundingBoxAscent ?? GROESSE * 0.9, ab = m.fontBoundingBoxDescent ?? GROESSE * 0.25, HK = KASTEN * 1.3;
  let x = (1080 - gesamt) / 2;
  NAME.split("").forEach((z, i) => {
    const w = breiten[i], cx = x + w / 2, cy = OBEN + HK / 2;
    const kasten = anteil(f, 58 + i * 2, 66 + i * 2), wird = weich(anteil(f, 78 + i * 3, 92 + i * 3)), ka = kasten * (1 - wird);
    if (ka > 0) {
      const s = mix(1, 0.55, wird), rr = mix(0, 18, wird);
      tc.save(); tc.translate(cx, cy); tc.scale(s, s); tc.beginPath(); tc.roundRect(-w / 2 + 1.5, -HK / 2 + 1.5, w - 3, HK - 3, Math.max(0, rr - 1.5));
      tc.globalAlpha = ka * 0.078; tc.fillStyle = WEISS; tc.fill(); tc.globalAlpha = ka; tc.lineWidth = 3; tc.strokeStyle = WEISS; tc.stroke(); tc.restore();
    }
    if (wird > 0) {
      const s = mix(1.35, 1, wird), clip = mix(0.5, 0, wird);
      tc.save(); tc.translate(cx, cy); tc.scale(s, s); tc.beginPath(); tc.rect(-w / 2 + w * clip, -HK / 2 + HK * clip, w * (1 - 2 * clip), HK * (1 - 2 * clip)); tc.clip();
      tc.globalAlpha = wird; tc.fillStyle = z === "." ? PUNKT : WEISS; tc.textAlign = "center"; tc.textBaseline = "alphabetic"; tc.fillText(z, 0, (auf - ab) / 2); tc.restore();
    }
    x += w + abstand;
  });
  tc.globalAlpha = 1;
}
const SCHLAUFE = G.schlaufe(360);
const TAFEL_BAHN = SCHLAUFE.map(([x, y]) => [540 + x * SCHLAUFE_PX, SCHLAUFE_Y + y * SCHLAUFE_PX]);
/** der Punkt der Schlaufe beim Parameter t (0..2π) in der Zeichnung */
function schlaufePunkt(t) { const i = (t / (2 * Math.PI)) * (TAFEL_BAHN.length - 1), a = Math.floor(i), f = i - a, p = TAFEL_BAHN[a], q = TAFEL_BAHN[Math.min(TAFEL_BAHN.length - 1, a + 1)]; return [mix(p[0], q[0], f), mix(p[1], q[1], f)]; }

function signetBuehne(B, { auftakt, bild, einsaetze, seed }) {
  const { ctx, W, H, u } = B;
  const P = G.signetPhasen(auftakt);
  const k = Math.min(W / u / 1080, H / u / 1300) * 1.02;   // Welt je Einheit der Zeichnung
  const welt = ([x, y]) => [(x - 540) * k, (y - 950) * k, 0];
  const sc = Math.min(2, (k * u * 1.25)), tafel = leinwand(TAFEL.w * sc, TAFEL.h * sc), tc = tafel.getContext("2d");
  const K = auftakt ? kacheln(B, alsLeinwand(bild, W, H)) : null;
  const ziele = Array.from({ length: KUGEL_PUNKTE }, (_, i) => welt(TAFEL_BAHN[Math.floor((i / KUGEL_PUNKTE) * (TAFEL_BAHN.length - 1))]));
  const verzug = Array.from({ length: KUGEL_PUNKTE }, (_, i) => ((i * 0.618) % 1) * 0.45);
  const plan = G.montagePlan(einsaetze, { von: P.fliessen[1], bis: P.stehen[0] + 0.7, samen: seed, staerke: 0.5 });
  const neben = leinwand(W, H), nx = neben.getContext("2d");
  const lage = (t) => {
    const x = anteil(t, P.drehen[0], P.drehen[1]), ruhe = anteil(t, P.stehen[0], P.stehen[0] + 1);
    const gier = -2 * Math.PI * (1 - inOut(x)) + 0.05 * ruhe * Math.sin((t - P.stehen[0]) * 1.4);
    const nick = 0.28 * Math.sin(Math.PI * x) * (1 - x * 0.3);
    return (p) => G.drehen(p, gier, nick);
  };

  /** die Tafel im Raum: ein Raster kleiner Zellen, jede affin auf ihre drei projizierten Ecken (so entsteht die Perspektive ohne sichtbare Nähte);
   *  additiv, damit sich die Ränder der Zellen nicht abdunkeln */
  const NX = 40, NY = 8, ecke = [];
  function tafelImRaum(dreh, sicht) {
    const sw = tafel.width / NX, sh = tafel.height / NY;
    for (let j = 0; j <= NY; j++) for (let i = 0; i <= NX; i++) ecke[j * (NX + 1) + i] = B.p(dreh(welt([TAFEL.x + (i * TAFEL.w) / NX, TAFEL.y + (j * TAFEL.h) / NY])));
    ctx.save(); ctx.globalAlpha = sicht; ctx.globalCompositeOperation = "lighter";
    for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
      const p0 = ecke[j * (NX + 1) + i], p1 = ecke[j * (NX + 1) + i + 1], p3 = ecke[(j + 1) * (NX + 1) + i];
      if (Math.abs(p1[0] - p0[0]) < 0.05) continue;
      ctx.setTransform((p1[0] - p0[0]) / sw, (p1[1] - p0[1]) / sw, (p3[0] - p0[0]) / sh, (p3[1] - p0[1]) / sh, p0[0], p0[1]);
      ctx.drawImage(tafel, i * sw, j * sh, sw, sh, 0, 0, sw, sh);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.restore();
  }
  function szene(t) {
    B.grund();
    const gier = KUGEL_DREHUNG * (t - P.kugel[0]), dreh = kugelDreh(gier);
    let kugel = G.kugelPunkte(KUGEL_PUNKTE, KUGEL_R).map(dreh);
    let sicht = new Map(kugel.map((_, i) => [i, 1]));
    // Auftakt: das letzte Bild legt sich direkt auf die Kugel
    if (auftakt && t < P.kugel[0] + 0.1) {
      const g = anteil(t, 0.15, P.auftakt[1]);
      const s = kachelnZeichnen(B, K, { falten: 1, kugeln: g, dreh, direkt: true });
      sicht = new Map(kugel.map((_, i) => [i, s.get(i) ?? anteil(g, 0.6 + verzug[i] * 0.5, 0.95)]));
    }
    // die Kugel atmet kurz, dann fliessen ihre Punkte auf die Schlaufe der Tafel
    const tl = lage(t), atem = 1 + 0.04 * Math.sin(anteil(t, P.kugel[0], P.kugel[1]) * Math.PI);
    const pts = kugel.map((q, i) => {
      const e = inOut(anteil(t, P.fliessen[0] + verzug[i], P.fliessen[0] + verzug[i] + 0.8));
      return G.lerp3(q.map((c) => c * atem), tl(ziele[i]), e);
    });
    const schlaufe = anteil(t, P.fliessen[1] - 0.35, P.fliessen[1] + 0.1);
    const f = P.f(t);
    if (schlaufe > 0) {
      // die Schlaufe als Linie im Raum (gleich stark aus jedem Winkel), der Punkt läuft sie entlang; der Schriftzug auf der Tafel
      const linie = TAFEL_BAHN.map((q) => B.p(tl(welt(q))));
      ctx.save(); ctx.globalAlpha = schlaufe; ctx.strokeStyle = WEISS; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.lineWidth = Math.max(1.2, 3 * k * u);
      ctx.beginPath(); ctx.moveTo(linie[0][0], linie[0][1]); for (const q of linie) ctx.lineTo(q[0], q[1]); ctx.stroke();
      const { winkel, sicht: ps } = G.signetPunkt(f), w = ((winkel % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), q = B.p(tl(welt(schlaufePunkt(w))));
      const a = ps * anteil(t, P.fliessen[1] - 0.1, P.fliessen[1] + 0.3);
      if (a > 0) { ctx.globalAlpha = schlaufe * a; ctx.fillStyle = PUNKT; ctx.beginPath(); ctx.arc(q[0], q[1], 11 * k * u * q[2], 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
      if (f > 56) { tafelZeichnen(tc, sc, f); tafelImRaum(tl, schlaufe); }
    }
    punkteZeichnen(B, pts, schlaufe > 0 ? new Map([...sicht].map(([i, a]) => [i, a * (1 - schlaufe)])) : sicht, WEISS, 0.013);
    B.leuchten(0.45 * (auftakt ? anteil(t, 0.5, P.auftakt[1]) : 1) * (1 - 0.5 * anteil(t, P.stehen[0], P.stehen[0] + 1)), 3);
  }
  function zeichne(t) {
    szene(t);
    // leichte Montage: Felder schneiden kurz versetzt (oder aus dem Moment davor) ins Bild und rasten ein
    const felder = G.montageBei(plan, t);
    if (felder) {
      nx.drawImage(B.c, 0, 0);
      const zurueck = felder.find((x) => x.zurueck > 0);
      let frueher = null;
      if (zurueck) { szene(Math.max(0, t - zurueck.zurueck)); frueher = leinwand(W, H); frueher.getContext("2d").drawImage(B.c, 0, 0); ctx.drawImage(neben, 0, 0); }
      for (const x of felder) {
        const sx = x.x * W, sy = x.y * H, w = Math.max(2, x.w * W), h = Math.max(2, x.h * H);
        ctx.drawImage(x.zurueck > 0 && frueher ? frueher : neben, sx, sy, w, h, sx + x.dx * W, sy + x.dy * H, w, h);
      }
    }
    return B.daten();
  }
  return { bild: zeichne, dauer: P.dauer };
}

// =================================================================================================================================
// die Operationen
const SEITE = { id: "seite", name: "Rechengrösse (längste Seite, px)", art: "zahl", min: 256, max: 2048, standard: 1280, schritt: 1 };
const BROWSER = ["Leinwand (Canvas) des Browsers"];
/** die lebendige Fassung: Bühne einmal, bild(t) zur Zeit seit dem Auftritt; lage.halten (s): so lange steht die Station im Film */
function lebendig(baue) {
  return async function lebend(eingaben, p, kontext = {}) {
    if (!imBrowser()) throw new Error("Die Signatur braucht einen Browser (Leinwand)");
    await schriftenLaden();
    const s = await baue(eingaben, p, kontext);
    return { dauer: s.dauer, zeitbasis: "auftritt", bild: (t, lage) => s.bild(Math.max(0, t), lage), entsorgen() {} };
  };
}

export const signaturIntro = {
  id: "signatur.intro",
  name: "Signatur: Intro mit Zettel",
  version: "0.1.0",
  klasse: "zeitlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB, mit dem Lichtwürfel von PHORMA III (irrweg.js, unverändert) und dem Raster des Zettelkastens", referenz: "Zettelkasten (Zu seiner Zeit), PHORMA III", datei: DATEI },
  beschreibung: "Ein Lichtwürfel taucht aus dem Nichts auf und pulsiert einige Schläge lang, entfaltet sich zum Raster des Zettelkastens (7 × 7), das Feld des Zettels leuchtet, der Zettel wird gezogen und zeigt Leitsatz und vier Verweise (Person, Werk); ein Scratch führt ins Bild am Eingang.",
  eingaenge: [{ name: "text", typ: "METADATA" }, { name: "bild", typ: "IMAGE", optional: true, vorwaehlen: false }, { name: "ton", typ: "AUDIO", optional: true, vorwaehlen: false }],
  ausgaenge: [{ name: "bild", typ: "IMAGE" }],
  parameter: [{ id: "beginn", name: "Ton ab (s)", art: "zahl", min: 0, max: 600, standard: 0, schritt: 0.5, hilfe: "die Schläge, auf denen der Würfel pulsiert" }, SEITE],
  voraussetzungen: BROWSER,
  ressourcen: { zeit: "jedes Bild neu gezeichnet (2D)", speicher: "zwei Bilder in Rechengrösse" },
  reproduzierbar: "ja",
  varianten: "keine",
  verfuegbar: imBrowser,
  lebend: lebendig(async ({ text, bild, ton }, p, kontext) => {
    if (!text?.leitsatz) throw new Error("Das Intro braucht einen Zettel aus dem Zettelkasten (zettel.strophe)");
    const { W, H } = masse(bild, p.seite);
    return introBuehne(buehne(W, H), { zettel: text, ziel: bild, einsaetze: einsaetzeVon(ton, p.beginn, G.INTRO_PHASEN.entfalten[0]), seed: (kontext.seed ?? 1) >>> 0 });
  }),
  async ausfuehren(eingaben, p, kontext = {}) {
    const s = await this.lebend(eingaben, p, kontext), t = G.INTRO_PHASEN.scratch[0] - 0.05;
    return { ausgaben: [{ typ: "IMAGE", titel: `Signatur: Zettel ${eingaben.text.nummer}`, bild: s.bild(t), befund: { art: "verifiziert", zeit: t } }],
      protokoll: { dauer: s.dauer, phasen: G.INTRO_PHASEN, zettel: eingaben.text.nummer, verweise: eingaben.text.verweise?.length ?? 0, hinweis: "Standbild: der gezogene Zettel; im Film läuft das Intro in jedem Bild neu" } };
  },
};

export const signaturOutro = {
  id: "signatur.outro",
  name: "Signatur: Outro mit ORNA",
  version: "0.1.0",
  klasse: "zeitlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB, mit den 40 Zeichen und den Daten des Doppelrads von ORNA (unverändert)", referenz: "ORNA (Nebeneinander, Nacheinander)", datei: DATEI },
  beschreibung: "Das Bild am Eingang (die letzte Sequenz) faltet sich zu einem Körper, der Körper wird zur Kugel, die Kugel zum Doppelrad von ORNA, das sich einschwingt und die Konstellation zeigt (Namen, Frage, Regel); dann wieder Kugel.",
  eingaenge: [{ name: "konstellation", typ: "CONSTELLATION" }, { name: "bild", typ: "IMAGE", optional: true, vorwaehlen: false }],
  ausgaenge: [{ name: "bild", typ: "IMAGE" }],
  parameter: [{ id: "dauer", name: "Dauer (s; im Film so lange, wie die Station steht)", art: "zahl", min: 6, max: 10, standard: G.OUTRO_DAUER, schritt: 0.5 }, SEITE],
  voraussetzungen: BROWSER,
  ressourcen: { zeit: "jedes Bild neu gezeichnet (2D)", speicher: "ein Bild in Rechengrösse" },
  reproduzierbar: "ja",
  varianten: "keine",
  verfuegbar: imBrowser,
  lebend: lebendig(async ({ konstellation, bild }, p) => {
    const { W, H } = masse(bild, p.seite), s = outroBuehne(buehne(W, H), { bild, konstellation, standard: p.dauer });
    return { dauer: p.dauer, bild: (t, lage) => s.bild(t, Math.max(4, lage?.halten ?? p.dauer)) };
  }),
  async ausfuehren(eingaben, p, kontext = {}) {
    const s = await this.lebend(eingaben, p, kontext), t = G.outroPhasen(p.dauer).zeigen[1] - 0.1;
    return { ausgaben: [{ typ: "IMAGE", titel: `Signatur: ORNA ${eingaben.konstellation?.nummer ?? ""}`.trim(), bild: s.bild(t, { halten: p.dauer }), befund: { art: "verifiziert", zeit: t } }],
      protokoll: { dauer: p.dauer, phasen: G.outroPhasen(p.dauer), plaetze: radPlaetze(eingaben.konstellation), hinweis: "Standbild: das Rad mit der Konstellation; im Film läuft das Outro in jedem Bild neu und dehnt sich, wenn die Station länger steht" } };
  },
};

export const signaturSignet = {
  id: "signatur.signet",
  name: "Signatur: Signet ornament.lab",
  version: "0.1.0",
  klasse: "zeitlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB, nach dem animierten Signet von ornament.cloud (alpha/sketchory/signet.js: Kurve, Zeitplan, Farben)", referenz: "Signet von ornament.cloud", datei: DATEI },
  beschreibung: "Aus einer Kugel aus Licht wird das Signet «ornament.lab» wie das von ornament.cloud (Schlaufe, Punkt, Kästchen werden Buchstaben), dazu dreht es sich einmal im Raum; auf den Einsätzen des Tons (dem Gefrickel) schneidet eine leichte Montage hinein. Ohne Outro davor legt sich zuerst das Bild am Eingang auf die Kugel.",
  eingaenge: [{ name: "ton", typ: "AUDIO" }, { name: "bild", typ: "IMAGE", optional: true, vorwaehlen: false }],
  ausgaenge: [{ name: "bild", typ: "IMAGE" }],
  parameter: [
    { id: "auftakt", name: "Auftakt", art: "wahl", standard: "kugel", optionen: [{ wert: "kugel", name: "aus der Kugel (nach dem Outro)" }, { wert: "bild", name: "aus dem Bild (ohne Outro)" }] },
    { id: "beginn", name: "Ton ab (s)", art: "zahl", min: 0, max: 600, standard: 0, schritt: 0.1, hilfe: "ab hier das Gefrickel, auf dessen Einsätzen die Montage schneidet" },
    SEITE,
  ],
  voraussetzungen: BROWSER,
  ressourcen: { zeit: "jedes Bild neu gezeichnet (2D), bei der Montage zwei", speicher: "drei Bilder in Rechengrösse" },
  reproduzierbar: "ja",
  varianten: "keine",
  verfuegbar: imBrowser,
  lebend: lebendig(async ({ ton, bild }, p, kontext) => {
    const auftakt = p.auftakt === "bild", { W, H } = masse(bild, p.seite), P = G.signetPhasen(auftakt);
    return signetBuehne(buehne(W, H), { auftakt, bild, einsaetze: einsaetzeVon(ton, p.beginn, P.dauer), seed: (kontext.seed ?? 1) >>> 0 });
  }),
  async ausfuehren(eingaben, p, kontext = {}) {
    const s = await this.lebend(eingaben, p, kontext), t = s.dauer - 0.05;
    return { ausgaben: [{ typ: "IMAGE", titel: "Signatur: ornament.lab", bild: s.bild(t), befund: { art: "verifiziert", zeit: t } }],
      protokoll: { dauer: s.dauer, phasen: G.signetPhasen(p.auftakt === "bild"), hinweis: "Standbild: das stehende Signet; im Film entsteht es aus der Kugel und dreht sich im Raum" } };
  },
};

export const signaturTon = {
  id: "signatur.ton",
  name: "Signatur: Tonspur mit Scratch und Gefrickel",
  version: "0.1.0",
  klasse: "zeitlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB, mit frickeln.js aus PHORMA III (unverändert)", referenz: "PHORMA III (Scratch → … → Gefrickel)", datei: DATEI },
  beschreibung: "Die Tonspur eines Films mit Signatur: der Klang ab «Ton ab» für die ganze Dauer, am Ende des Intros ein Scratch (dieselbe Bewegung wie im Bild), unter dem Signet verfrickelt (frickeln.js aus PHORMA III).",
  eingaenge: [{ name: "ton", typ: "AUDIO" }],
  ausgaenge: [{ name: "klang", typ: "AUDIO" }],
  parameter: [
    { id: "beginn", name: "Ton ab (s)", art: "zahl", min: 0, max: 600, standard: 0, schritt: 0.5 },
    { id: "dauer", name: "Dauer (s)", art: "zahl", min: 6, max: 120, standard: 52.5, schritt: 0.5 },
    { id: "vor", name: "Intro (s, 0 = ohne Scratch)", art: "zahl", min: 0, max: 10, standard: G.INTRO_DAUER, schritt: 0.5 },
    { id: "frickel", name: "Gefrickel am Schluss (s)", art: "zahl", min: 2, max: 12, standard: G.SIGNET_DAUER, schritt: 0.1 },
  ],
  voraussetzungen: ["keine (reines JavaScript)"],
  ressourcen: { zeit: "Verfrickeln: etwa eine Sekunde", speicher: "der Klang zwei- bis dreimal" },
  reproduzierbar: "ja",
  varianten: "keine",
  async ausfuehren({ ton }, p, kontext = {}) {
    kontext.melden?.("Tonspur der Signatur: Scratch und Gefrickel …");
    await new Promise((ok) => setTimeout(ok, 0));
    const r = G.signaturTon(ton, { beginn: p.beginn, dauer: p.dauer, vor: p.vor, frickel: p.frickel, samen: (kontext.seed ?? 1) >>> 0 });
    const mono = new Float32Array(r.spuren[0].length);
    for (const s of r.spuren) for (let i = 0; i < mono.length; i++) mono[i] += s[i] / r.spuren.length;
    return { ausgaben: [{ typ: "AUDIO", titel: `Tonspur mit Signatur (${Math.round(p.dauer * 10) / 10} s)`, ton: { spuren: r.spuren, pcm: mono, rate: r.rate } }],
      protokoll: { dauer: p.dauer, beginn: p.beginn, scratch: r.scratch, frickel: r.frickel } };
  },
};

export const SIGNATUR_OPERATIONEN = [signaturIntro, signaturOutro, signaturSignet, signaturTon];
