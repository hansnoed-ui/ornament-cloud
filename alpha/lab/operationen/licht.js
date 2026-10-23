// ORNAMENT LAB – Licht: Glühen und Streifen (räumliche Operation, seit Lab 0.1.10). Übertragen aus dem Bloom der Echtzeitgrafik
// (Helligkeitsauszug, Unschärfe, Addition: TouchDesigner Bloom TOP, Post-Processing in Unity und Unreal) und dem Glow in Fusion und
// After Effects; die Streifen nach den anamorphotischen Lichtfahnen des Kinos. Nur das Prinzip, kein Code.
//
// Drei Schritte: (1) Auszug: was heller ist als die Schwelle, weich über eine Kniebreite; (2) Unschärfe: dreimal ein laufender
// Kastenfilter, zusammen fast eine Glockenkurve, in linearer Zeit unabhängig vom Radius (darum auch am Telefon tragbar);
// (3) das Licht, farblich gedreht und gesättigt, wird zum Bild addiert oder aufhellend darübergelegt.
import { alsFelder, farbdrehung, luminanz } from "../kern/bilddaten.js";
import { bildfilter, gemeinsameParameter, zahl, wahl } from "./bildfilter.js";

/** laufender Kastenfilter auf einem Feld, entlang x (schritt 1) oder y (schritt w), Rand gehalten */
function kasten(f, w, h, r, waagrecht, tmp) {
  if (r < 1) return;
  const n = waagrecht ? w : h, linien = waagrecht ? h : w, s = waagrecht ? 1 : w, teil = 1 / (2 * r + 1);
  for (let l = 0; l < linien; l++) {
    const a = waagrecht ? l * w : l;
    let summe = 0;
    for (let k = -r; k <= r; k++) summe += f[a + Math.min(n - 1, Math.max(0, k)) * s];
    for (let i = 0; i < n; i++) {
      tmp[i] = summe * teil;
      summe += f[a + Math.min(n - 1, i + r + 1) * s] - f[a + Math.max(0, i - r) * s];
    }
    for (let i = 0; i < n; i++) f[a + i * s] = tmp[i];
  }
}

function unschaerfe(f, w, h, rx, ry, tmp) {
  for (let d = 0; d < 3; d++) { kasten(f, w, h, rx, true, tmp); kasten(f, w, h, ry, false, tmp); }
}

export function licht(bild, p) {
  const q = alsFelder(bild), W = q.w, H = q.h, n = W * H, tmp = new Float32Array(Math.max(W, H));
  const unten = p.schwelle - p.weich, oben = p.schwelle + p.weich;
  const auszug = () => {
    const a = { r: new Float32Array(n), g: new Float32Array(n), b: new Float32Array(n) };
    for (let i = 0; i < n; i++) {
      const l = luminanz(q.r[i], q.g[i], q.b[i]);
      let t = oben > unten ? (l - unten) / (oben - unten) : l >= p.schwelle ? 1 : 0;
      t = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
      a.r[i] = q.r[i] * t; a.g[i] = q.g[i] * t; a.b[i] = q.b[i] * t;
    }
    return a;
  };
  // Radius je Durchgang: drei Kästen mit Radius r ergeben etwa eine Glocke mit σ ≈ r
  const r = Math.max(1, Math.round((p.radius * Math.max(W, H)) / 1.7)), lang = Math.round(r * p.streckung);
  const glow = auszug();
  const schichten = p.art === "kreuz" ? [[lang, 0], [0, lang]] : p.art === "waagrecht" ? [[lang, 0]] : p.art === "senkrecht" ? [[0, lang]] : [[r, r]];
  if (schichten.length === 2) {
    const zweite = { r: glow.r.slice(), g: glow.g.slice(), b: glow.b.slice() };
    for (const k of ["r", "g", "b"]) { unschaerfe(glow[k], W, H, schichten[0][0], schichten[0][1], tmp); unschaerfe(zweite[k], W, H, schichten[1][0], schichten[1][1], tmp); }
    for (let i = 0; i < n; i++) { glow.r[i] += zweite.r[i]; glow.g[i] += zweite.g[i]; glow.b[i] += zweite.b[i]; }
  } else for (const k of ["r", "g", "b"]) unschaerfe(glow[k], W, H, schichten[0][0], schichten[0][1], tmp);
  const M = farbdrehung(p.farbdrehung), sat = p.saettigung, st = p.staerke;
  const out = { width: W, height: H, data: new Uint8ClampedArray(n * 4) }, o = out.data;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    let gr = M[0] * glow.r[i] + M[1] * glow.g[i] + M[2] * glow.b[i], gg = M[3] * glow.r[i] + M[4] * glow.g[i] + M[5] * glow.b[i], gb = M[6] * glow.r[i] + M[7] * glow.g[i] + M[8] * glow.b[i];
    const l = luminanz(gr, gg, gb);
    gr = (l + (gr - l) * sat) * st; gg = (l + (gg - l) * sat) * st; gb = (l + (gb - l) * sat) * st;
    let r1, g1, b1;
    if (p.mischart === "aufhellen") { r1 = 1 - (1 - q.r[i]) * (1 - Math.min(1, gr)); g1 = 1 - (1 - q.g[i]) * (1 - Math.min(1, gg)); b1 = 1 - (1 - q.b[i]) * (1 - Math.min(1, gb)); }
    else if (p.mischart === "nurlicht") { r1 = gr; g1 = gg; b1 = gb; }
    else { r1 = q.r[i] + gr; g1 = q.g[i] + gg; b1 = q.b[i] + gb; }
    o[j] = r1 * 255; o[j + 1] = g1 * 255; o[j + 2] = b1 * 255; o[j + 3] = 255;
  }
  return { bild: out, protokoll: { radiusPx: r, streifenPx: p.art === "gluehen" ? null : lang, art: p.art, mischart: p.mischart } };
}

export const lichtOperation = bildfilter({
  id: "lab.licht",
  name: "Licht: Glühen und Streifen",
  version: "0.1.0",
  klasse: "raeumlich",
  herkunft: { art: "neu", quelle: "ORNAMENT LAB", referenz: "Bloom der Echtzeitgrafik (TouchDesigner Bloom TOP, Post-Processing in Unity und Unreal); Glow in Fusion und After Effects; anamorphotische Lichtfahnen", datei: "alpha/lab/operationen/licht.js" },
  beschreibung: "Zieht heraus, was heller ist als eine Schwelle, lässt es glühen oder zu Lichtfahnen ausstreichen und legt es über das Bild, auch farblich verschoben. «nur Licht» zeigt den Auszug allein.",
  moduliert: "schwelle",
  titel: "Licht",
  parameter: [
    wahl("art", "Form des Lichts", "gluehen", [["gluehen", "Glühen (rund)"], ["waagrecht", "Streifen waagrecht"], ["senkrecht", "Streifen senkrecht"], ["kreuz", "Kreuz (Sternfilter)"]]),
    zahl("schwelle", "Schwelle", 0, 1, 0.6, 0.01, "was heller ist, beginnt zu leuchten"),
    zahl("weich", "Kniebreite", 0, 0.5, 0.15, 0.01, "weicher Übergang um die Schwelle"),
    zahl("radius", "Radius", 0.002, 0.15, 0.03, 0.001, "Anteil der längsten Seite"),
    zahl("streckung", "Länge der Streifen", 1, 12, 5, 0.5, "Vielfaches des Radius (nur Streifen und Kreuz)"),
    zahl("staerke", "Stärke", 0, 4, 1.2, 0.05),
    zahl("farbdrehung", "Farbdrehung des Lichts (°)", -180, 180, 0, 1),
    zahl("saettigung", "Sättigung des Lichts", 0, 2.5, 1, 0.01),
    wahl("mischart", "Komposition", "addieren", [["addieren", "addieren"], ["aufhellen", "aufhellen (Screen)"], ["nurlicht", "nur Licht"]]),
    ...gemeinsameParameter(),
  ],
  ressourcen: { zeit: "sechs laufende Kastenfilter je Kanal, unabhängig vom Radius (1200 px: unter 0,5 s)", speicher: "zwei bis drei Gleitkommabilder" },
  rechne: ({ bild }, p) => licht(bild, p),
});
