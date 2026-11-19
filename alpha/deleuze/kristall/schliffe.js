// Schliffe für das Kristallbild: jede Form ist ein konvexer Körper aus Ebenen n·x ≤ d.
// Masse in Anlehnung an echte Schliffe (Tolkowsky-Brillant, Treppenschliff, Quarz-Habitus),
// vereinfacht auf höchstens 60 Ebenen, damit es am Telefon flüssig bleibt.

const GRAD = Math.PI / 180;

// Ebene mit Azimut a (Grad, um die senkrechte Achse) und Neigung t (Grad gegen die Waagrechte),
// nach oben (oben = true) oder unten, durch einen Punkt im Abstand r von der Achse auf Höhe y
function geneigt(a, t, oben, r, y) {
  const ca = Math.cos(a * GRAD), sa = Math.sin(a * GRAD), st = Math.sin(t * GRAD), ct = Math.cos(t * GRAD);
  const n = [st * ca, oben ? ct : -ct, st * sa];
  return [...n, n[0] * r * ca + n[1] * y + n[2] * r * sa];
}
const senkrecht = (a, r) => [Math.cos(a * GRAD), 0, Math.sin(a * GRAD), r];

// Runder Brillant nach Tolkowsky: Tafel 57 %, Krone 34.5°, Pavillon 40.75°, dünne Rundiste
function brillant() {
  const g = 0.012, krone = 34.5, pav = 40.75;
  const tafelY = g + (1 - 0.57) * Math.tan(krone * GRAD);
  const e = [[0, 1, 0, tafelY]];                                                       // Tafel
  for (let k = 0; k < 8; k++) {
    const stern = k * 45, haupt = k * 45 + 22.5;
    e.push(geneigt(haupt, krone, true, 1, g));                                         // Hauptfacetten der Krone
    e.push(geneigt(stern, 21.5, true, 0.53, tafelY));                                   // Sterne an der Tafel
    e.push(geneigt(stern, 42, true, 1, g));                                             // obere Rundistenfacetten
    e.push(geneigt(haupt, pav, false, 1, -g));                                          // Hauptfacetten des Pavillons
    e.push(geneigt(stern, 42.5, false, 1, -g));                                         // untere Rundistenfacetten
  }
  for (let k = 0; k < 16; k++) e.push(senkrecht(k * 22.5 + 11.25, 1));                 // Rundiste
  const tiefe = Math.tan(pav * GRAD);
  return { ebenen: e, mitte: [0, (tafelY - tiefe) / 2, 0], gross: 1.15 };
}

// Ovalschliff: der Brillant, gestreckt
function oval() {
  const b = brillant(), s = [1.38, 1, 0.92];
  const ebenen = b.ebenen.map(([x, y, z, d]) => {
    const n = [x / s[0], y / s[1], z / s[2]], l = Math.hypot(...n);
    return [n[0] / l, n[1] / l, n[2] / l, d / l];
  });
  return { ebenen, mitte: [0, b.mitte[1], 0], gross: 0.88 };
}

// Smaragdschliff (Treppenschliff): Rechteck mit abgeschrägten Ecken, Stufen auf Krone und Pavillon
function smaragd() {
  const ex = 1, ez = 0.68, g = 0.015;
  const seiten = [[0, ex], [90, ez], [180, ex], [270, ez]];
  const ecke = (ex + ez) / Math.SQRT2 * 0.86;
  for (const a of [45, 135, 225, 315]) seiten.push([a, ecke]);
  const e = [];
  let tafelY = 0;
  for (const [a, r] of seiten) {
    // Krone: zwei Stufen, flacher zur Tafel hin; Pavillon: drei Stufen, flacher zur Kiel-Linie hin
    let rr = r, y = g;
    for (const [t, lauf] of [[50, 0.1], [32, 0.14]]) { e.push(geneigt(a, t, true, rr, y)); y += lauf * Math.tan(t * GRAD); rr -= lauf; }
    tafelY = y;
    rr = r; y = -g;
    for (const [t, lauf] of [[62, 0.12], [48, 0.16], [36, 0.3]]) { e.push(geneigt(a, t, false, rr, y)); y -= lauf * Math.tan(t * GRAD); rr -= lauf; }
    e.push(senkrecht(a, r));
  }
  e.unshift([0, 1, 0, tafelY]);
  return { ebenen: e, mitte: [0, (tafelY - 0.62) / 2, 0], gross: 1.05 };
}

// Bergkristall: sechsseitiges Prisma mit zwei Rhomboeder-Spitzen (Normale 51.8° gegen die Achse),
// leicht ungleich gewachsen wie ein natürlicher Stein
function bergkristall() {
  const r = 0.5, h = 0.48, e = [];
  const zufall = (i) => Math.sin(i * 12.9898 + 4.1) * 0.5;
  for (let k = 0; k < 6; k++) {
    const a = k * 60;
    e.push(senkrecht(a, r * (1 + 0.1 * zufall(k))));
    e.push(geneigt(a, 90 - 51.8, true, r, h + 0.08 * zufall(k + 6)));
    e.push(geneigt(a, 90 - 51.8, false, r, -h + 0.08 * zufall(k + 12)));
  }
  return { ebenen: e, mitte: [0, 0, 0], gross: 1.1 };
}

// Material: Brechung (Reglerwert), Färbung im Stein (Absorption je Weglänge, RGB), Kantenlicht, Feuer (farbige Blitze)
export const SCHLIFFE = {
  stein:        { bau: null,         brechung: 0.35, ton: [0, 0, 0],          kante: 0.65, feuer: 0.6 },
  brillant:     { bau: brillant,     brechung: 0.95, ton: [0, 0, 0],          kante: 0.16, feuer: 1.6 },
  oval:         { bau: oval,         brechung: 0.9,  ton: [0, 0, 0],          kante: 0.16, feuer: 1.5 },
  smaragd:      { bau: smaragd,      brechung: 0.22, ton: [0.45, 0.04, 0.3],  kante: 0.22, feuer: 0.5 },
  bergkristall: { bau: bergkristall, brechung: 0.12, ton: [0.02, 0.02, 0],    kante: 0.3,  feuer: 0.4 },
};

// Ebenen einer Form: verschoben in die Mitte und auf die Bildgrösse gebracht
export function schliffEbenen(name, massstab) {
  const f = SCHLIFFE[name].bau();
  const s = f.gross * massstab;
  return f.ebenen.map(([x, y, z, d]) => [x, y, z, (d - (x * f.mitte[0] + y * f.mitte[1] + z * f.mitte[2])) * s]);
}
