// ORNAMENT LAB – die Signatur eines Films aus der Zusammenstellung (seit Lab 0.1.26, Christian, 24. Oktober 2026): ein Intro, wenn ein Zettel
// aus dem Zettelkasten dabei ist, ein Outro, wenn eine ORNA-Konstellation dabei ist, und am Schluss immer das Signet «ornament.lab».
//   Intro   – ein Lichtwürfel (wie der von PHORMA III) taucht aus dem Nichts auf und pulsiert einige Schläge lang, entfaltet sich zum Raster des
//             Zettelkastens (7 Zyklen × 7 Strophen), das Feld des gezogenen Zettels leuchtet auf, der Zettel wird gezogen und mit seinem Leitsatz und
//             den vier Verweisen (Person, Werk) gezeigt; ein Scratch führt in die Animation, im Bild wie im Ton
//   Outro   – die letzte Sequenz faltet sich zu einem Körper, der Körper wird zur Kugel, die Kugel zum Doppelrad von ORNA, das die gezogene
//             Konstellation zeigt; dann wieder Kugel
//   Signet  – aus der Kugel wird das Signet «ornament.lab» (wie das von ornament.cloud: Schlaufe, Punkt, Kästchen werden Buchstaben), dazu dreht es
//             sich im Raum; im Ton Gefrickel (frickeln.js aus PHORMA III), im Bild eine leichte Montage auf den Einsätzen des Gefrickels
// Hier steht, was ohne DOM geht und getestet wird: die Zeitpläne, die Geometrie (Würfel, Raster, Kugel, Rad, Schlaufe), die Kurve des Scratchs und
// die Tonspur der Signatur. Gezeichnet wird in operationen/signatur.js (Leinwand des Browsers).
import { frickeln } from "../../../alpha/phorma-iii/frickeln.js?v=23";
import { zufall } from "../../../alpha/the-fictory/analyse.js?v=23";

export const SIGNATUR_VERSION = "0.1.0";
/** Dauern in Sekunden: das Intro, das Outro (es dehnt sich, wenn der Film mehr Zeit lässt), das Signet und sein Auftakt aus dem Bild (ohne Outro) */
export const INTRO_DAUER = 10, OUTRO_DAUER = 8, SIGNET_DAUER = 6.5, AUFTAKT_DAUER = 1.6;
/** der Scratch am Ende des Intros (s) */
export const SCRATCH_DAUER = 0.75;

export const klemm = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const anteil = (t, a, b) => klemm((t - a) / (b - a));
export const weich = (x) => x * x * (3 - 2 * x);
export const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);
export const aus = (x) => 1 - (1 - x) ** 3;
export const mix = (a, b, x) => a + (b - a) * x;

/** die Phasen des Intros (s ab seinem Beginn) */
export const INTRO_PHASEN = Object.freeze({
  erscheinen: [0, 1.2],    // ein Licht im Nichts, der Würfel zeichnet seine Kanten
  wuerfel: [1.2, 3.6],     // er dreht sich, ein Faden irrt in ihm, er pulsiert einige Schläge lang
  entfalten: [3.4, 5.0],   // seine 49 Felder lösen sich und legen sich zum Raster
  leuchten: [4.9, 5.6],    // das Feld des Zettels leuchtet auf, die Zyklen stehen daneben
  ziehen: [5.6, 6.4],      // der Zettel kommt aus dem Raster nach vorn
  zettel: [6.4, INTRO_DAUER - SCRATCH_DAUER],   // Leitsatz und die vier Verweise, Zeit zum Lesen
  scratch: [INTRO_DAUER - SCRATCH_DAUER, INTRO_DAUER],
});

/**
 * die Phasen des Outros bei einer Länge L (s): Falten, Kugel, Rad (es dreht sich ein), Zeigen (dehnt sich mit L), zurück zur Kugel.
 * Unter 6 s wird alles gerafft.
 */
export function outroPhasen(L = OUTRO_DAUER) {
  const k = Math.min(1, L / OUTRO_DAUER), d = (x) => x * Math.max(0.75, k);
  const falten = [0, d(1.6)], kugel = [falten[1] - d(0.15), falten[1] + d(1.1)], rad = [kugel[1] - d(0.1), kugel[1] + d(1.2)];
  const drehen = [rad[1] - d(0.4), rad[1] + d(1.5)], zurueck = [L - d(1.3), L - 0.15];
  return { falten, kugel, rad, drehen, zeigen: [drehen[1] - d(0.2), zurueck[0]], zurueck, dauer: L };
}

/**
 * die Phasen des Signets ab seinem Beginn; auftakt: true, wenn kein Outro davor steht (das Bild faltet sich zuerst zur Kugel).
 * f(t): das Bild des Signets (30 Bilder/s, wie in alpha/sketchory/signet.js: Schlaufe 14–56, Punkt ab 40, Kästchen ab 58, Buchstaben 78–125, zusammen 128–146)
 */
export function signetPhasen(auftakt = false) {
  const v = auftakt ? AUFTAKT_DAUER : 0;
  return {
    auftakt: [0, v], kugel: [v, v + 0.6], fliessen: [v + 0.5, v + 1.8], drehen: [v + 1.2, v + 4.6], stehen: [v + 4.6, v + SIGNET_DAUER],
    dauer: v + SIGNET_DAUER, f: (t) => 50 + (t - v - 1.6) * 30,
  };
}

/** wann die Teile der Signatur im Film beginnen: { vor, haupt, nach, gesamt, outro, signet } (s ab Filmbeginn) */
export function signaturZeiten({ intro = false, outro = false, haupt = 30 } = {}) {
  const vor = intro ? INTRO_DAUER : 0, signet = signetPhasen(!outro).dauer, nach = (outro ? OUTRO_DAUER : 0) + signet;
  return { vor, haupt, nach, gesamt: vor + haupt + nach, outro: outro ? vor + haupt : null, signet: vor + haupt + (outro ? OUTRO_DAUER : 0), signetDauer: signet };
}

// ---------- Geometrie: Welt in Einheiten der halben kürzeren Bildseite, x nach rechts, y nach unten, z zur Kamera ----------
export const KAMERA = 3.4;
/** Punkt der Welt → Bild: [x, y, Massstab] (Massstab 0, wenn hinter der Kamera) */
export function projizieren([x, y, z], W, H) {
  const u = Math.min(W, H) / 2, s = KAMERA / Math.max(0.05, KAMERA - z);
  return [W / 2 + x * u * s, H / 2 + y * u * s, s];
}
/** Drehung um y (gieren), dann um x (nicken) */
export function drehen([x, y, z], gier = 0, nick = 0) {
  const cg = Math.cos(gier), sg = Math.sin(gier), cn = Math.cos(nick), sn = Math.sin(nick);
  const x1 = x * cg + z * sg, z1 = -x * sg + z * cg;
  return [x1, y * cn - z1 * sn, y * sn + z1 * cn];
}
export const lerp3 = (a, b, x) => [mix(a[0], b[0], x), mix(a[1], b[1], x), mix(a[2], b[2], x)];

/** die sechs Seiten eines Würfels: Mitte (Normale), zwei Achsen in der Seite */
export const SEITEN = Object.freeze([
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] }, { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] }, { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] }, { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] }, { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
]);
/** die acht Ecken und zwölf Kanten eines Würfels der halben Kantenlänge h */
export function wuerfelKanten(h) {
  const e = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map((p) => p.map((c) => c * h));
  return [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].map(([a, b]) => [e[a], e[b]]);
}
/**
 * Feld i (von n) auf der Oberfläche eines Würfels (halbe Kante h): Seite i mod 6, darin ein Platz im Raster 3 × 3 (bei mehr als 54 Feldern feiner).
 * Gibt die vier Ecken (oben links, oben rechts, unten rechts, unten links) und die Mitte.
 */
export function wuerfelFeld(i, n, h, luft = 0.12) {
  const s = SEITEN[i % 6], k = Math.floor(i / 6), m = Math.max(3, Math.ceil(Math.sqrt(Math.ceil(n / 6)))), g = (2 * h) / m;
  const a = ((k % m) - (m - 1) / 2) * g, b = (Math.floor(k / m) % m - (m - 1) / 2) * g, r = (g / 2) * (1 - luft);
  const p = (du, dv) => [0, 1, 2].map((c) => s.n[c] * h + s.u[c] * (a + du) + s.v[c] * (b + dv));
  return { ecken: [p(-r, -r), p(r, -r), p(r, r), p(-r, r)], mitte: p(0, 0) };
}
/** das Raster des Zettelkastens: 7 Zeilen (Zyklen) × 7 Spalten (Strophen), Mitte (0, dy), Feldabstand g; Feld der Strophe n (1–49) */
export function rasterFeld(n, g, dy = 0, luft = 0.16) {
  const zeile = Math.floor((n - 1) / 7), spalte = (n - 1) % 7, x = (spalte - 3) * g, y = (zeile - 3) * g + dy, r = (g / 2) * (1 - luft);
  return { ecken: [[x - r, y - r, 0], [x + r, y - r, 0], [x + r, y + r, 0], [x - r, y + r, 0]], mitte: [x, y, 0], zeile, spalte };
}
/** n Punkte gleichmässig auf einer Kugel (Fibonacci), Radius r */
export function kugelPunkte(n, r = 1) {
  const g = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => { const y = 1 - ((i + 0.5) / n) * 2, q = Math.sqrt(1 - y * y), a = i * g; return [Math.cos(a) * q * r, y * r, Math.sin(a) * q * r]; });
}
/** der Punkt auf der Kugel (Radius r) über einem Punkt des Würfels */
export const aufKugel = (p, r) => { const l = Math.hypot(...p) || 1; return p.map((c) => (c / l) * r); };

/** das Doppelrad von ORNA: 20 Plätze je Ring im 18°-Raster (portfolio/nebeneinander-nacheinander/js/lib/geometry.js), Radien im Mass des 1000er-Felds */
export const RAD = Object.freeze({ plaetze: 20, aussen: { rand: 462, innen: 344, zeichen: 403, halb: 42 }, innen: { rand: 326, innen: 208, zeichen: 267, halb: 37 }, feld: 500 });
/** die Drehung eines Rings (Grad), bei der Platz i auf der Achse (12 Uhr) steht */
export const radZiel = (i) => (((-i * 360) / RAD.plaetze) % 360 + 360) % 360;
/** Drehung eines Rings zur Zeit x (0..1 des Einschwingens): richtung ±1, umdrehungen, landet genau auf ziel */
export const radDrehung = (ziel, x, richtung = 1, umdrehungen = 1.25) => ziel + richtung * 360 * umdrehungen * (1 - aus(klemm(x))) ** 1.6;

/** die Schlaufe des Signets (dieselbe Kurve wie alpha/sketchory/signet.js): n + 1 Punkte, mittig, Höhe/Breite der grösseren Spanne = 1 */
export function schlaufe(n = 240) {
  const LA = 1, LB = 0.45, LK = 1.2, LOFF = -0.84;
  const roh = Array.from({ length: n + 1 }, (_, i) => { const t = (i / n) * Math.PI * 2, r = LB + LA * Math.cos(t); return [LK * r * Math.cos(t) + LOFF, LK * r * Math.sin(t)]; });
  const xs = roh.map((p) => p[0]), ys = roh.map((p) => p[1]);
  const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2, sp = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  return roh.map(([x, y]) => [(x - mx) / sp, (y - my) / sp]);
}
/** wo der Punkt des Signets bei Bild f auf der Schlaufe steht (Anteil der Runde, ab 12 Uhr der Kurve wie in signet.js: Winkel −π/2) und wie deutlich */
export function signetPunkt(f, punktTempo = 1.25) {
  const lauf = Math.max(0, f - 40) / 54 / punktTempo;
  return { winkel: -Math.PI / 2 + lauf * Math.PI * 2, sicht: anteil(f, 40, 48) };
}

// ---------- der Scratch: wie eine Platte unter der Hand, vor und zurück, mit dem Fader ----------
// Stellen (0 = der Zettel, 1 = die Animation): je Zug hin oder her, an den Umkehrpunkten ist der Fader kurz zu
const ZUEGE = [[0, 0], [0.16, 0.5], [0.3, 0.12], [0.46, 0.72], [0.58, 0.38], [0.74, 0.92], [0.86, 0.66], [1, 1]];
/** die Stelle (0..1) und der Fader (0..1) bei u (0..1 des Scratchs) */
export function scratch(u) {
  const x = klemm(u);
  let i = 0;
  while (i < ZUEGE.length - 2 && x > ZUEGE[i + 1][0]) i++;
  const [a, pa] = ZUEGE[i], [b, pb] = ZUEGE[i + 1], q = (x - a) / (b - a || 1);
  const stelle = mix(pa, pb, inOut(q));
  // der Fader schliesst kurz um jede Umkehr (nicht am Anfang und Ende)
  const zu = ZUEGE.slice(1, -1).reduce((m, [t]) => Math.min(m, Math.abs(x - t)), 1);
  return { stelle, fader: x > 0.97 ? 1 : 0.25 + 0.75 * anteil(zu, 0.005, 0.045), richtung: Math.sign(pb - pa) };
}

// ---------- die Tonspur der Signatur ----------
const spurenVon = (ton) => (ton.spuren?.length ? ton.spuren : [ton.pcm]);

/**
 * Die Tonspur eines Films mit Signatur: der Klang ab beginn für dauer Sekunden (zu kurz: er beginnt von vorn), am Ende des Intros (vor) ein Scratch
 * (dieselbe Kurve wie im Bild), die letzten frickel Sekunden verfrickelt (frickeln.js aus PHORMA III, aus dem Klang davor), weich überblendet.
 * Gibt { spuren, rate, frickel: { von, dauer, bpm }, scratch: { von, bis } | null }.
 */
export function signaturTon(ton, { beginn = 0, dauer, vor = 0, frickel = SIGNET_DAUER, samen = 1 } = {}) {
  const quelle = spurenVon(ton).slice(0, 2), rate = ton.rate, n = Math.max(1, Math.round(dauer * rate)), q = quelle[0].length;
  const ab = Math.min(Math.max(0, Math.round(beginn * rate)), Math.max(0, q - 1));
  const lies = (s, i) => s[ab + (i % Math.max(1, q - ab))] ?? 0;
  const spuren = quelle.map((s) => { const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = lies(s, i); return o; });
  // der Scratch: die Platte läuft vor und zurück über die letzten SCRATCH_DAUER Sekunden vor dem Schnitt, der Fader macht dazwischen zu
  let kratz = null;
  if (vor > SCRATCH_DAUER) {
    const a = Math.round((vor - SCRATCH_DAUER) * rate), b = Math.min(n, Math.round(vor * rate)), m = b - a;
    for (const [k, s] of quelle.entries()) {
      const o = spuren[k];
      for (let i = 0; i < m; i++) {
        const { stelle, fader } = scratch(i / m), p = a + stelle * m, j = Math.floor(p), f = p - j;
        o[a + i] = (lies(s, j) * (1 - f) + lies(s, j + 1) * f) * fader;
      }
    }
    kratz = { von: Math.round((a / rate) * 1000) / 1000, bis: Math.round((b / rate) * 1000) / 1000 };
  }
  // das Gefrickel: aus bis zu acht Sekunden Klang vor dem Signet, wenige Takte, daraus ein dichter Ausschnitt
  const fr = Math.min(frickel, dauer), von = Math.max(0, n - Math.round(fr * rate));
  const stoffA = Math.max(0, von - Math.round(8 * rate)), stoff = spuren.map((s) => s.slice(stoffA, Math.max(stoffA + Math.round(0.5 * rate), von)));
  const g = frickeln(stoff.length > 1 ? stoff : [stoff[0], stoff[0]], rate, { samen: samen >>> 0 || 1, takte: 4 });
  const gn = g.kanaele[0].length, lang = n - von, start = Math.max(0, Math.min(gn - lang, Math.round(gn * 0.18)));
  const ueber = Math.round(0.3 * rate), ende = Math.round(0.8 * rate);
  for (const [k, o] of spuren.entries()) {
    const gk = g.kanaele[Math.min(k, 1)];
    for (let i = 0; i < lang; i++) {
      const x = klemm(i / ueber), w = Math.sin((x * Math.PI) / 2), raus = klemm((lang - i) / ende);
      o[von + i] = (o[von + i] * Math.cos((x * Math.PI) / 2) + (gk[start + i] ?? 0) * w) * raus;
    }
  }
  return { spuren, rate, frickel: { von: Math.round((von / rate) * 1000) / 1000, dauer: Math.round((lang / rate) * 1000) / 1000, bpm: g.bpm }, scratch: kratz };
}

/**
 * die leichte Montage des Signets: auf jedem kräftigen Einsatz des Gefrickels (Zeiten ab Beginn des Signets) schneiden 2–5 Felder kurz versetzt ins
 * Bild und rasten wieder ein. Gibt [{ t, felder: [{ x, y, w, h, dx, dy, zurueck }] }] mit Anteilen der Bildgrösse; zurück (s): das Feld zeigt den Moment davor.
 */
export function montagePlan(einsaetze, { von = 0, bis = Infinity, samen = 1, staerke = 0.5 } = {}) {
  const r = zufall((samen >>> 0) || 1), plan = [];
  let letzt = -1;
  for (const e of einsaetze) {
    if (e.t < von || e.t > bis || (e.staerke ?? 1) < staerke || e.t - letzt < 0.22) continue;
    letzt = e.t;
    const k = 2 + Math.floor(r() * 4), quer = r() < 0.6;
    plan.push({ t: e.t, s: Math.min(1, e.staerke ?? 1), felder: Array.from({ length: k }, () => {
      const w = quer ? 1 : 0.15 + r() * 0.35, h = quer ? 0.03 + r() * 0.09 : 0.1 + r() * 0.3;
      return { x: quer ? 0 : r() * (1 - w), y: r() * (1 - h), w, h, dx: (r() - 0.5) * 0.08, dy: quer ? 0 : (r() - 0.5) * 0.03, zurueck: r() < 0.4 ? 0.1 + r() * 0.25 : 0 };
    }) });
  }
  return plan;
}
/** die Felder der Montage zur Zeit t: jedes rastet in 0,16 s ein (Versatz × Rest) */
export function montageBei(plan, t, dauer = 0.16) {
  const e = [...plan].reverse().find((x) => t >= x.t && t < x.t + dauer);
  if (!e) return null;
  const rest = 1 - anteil(t, e.t, e.t + dauer);
  return e.felder.map((f) => ({ ...f, dx: f.dx * rest * (0.6 + 0.4 * e.s), dy: f.dy * rest, rest }));
}
