// PHORMA II – die Bahn des Tuchs (ohne DOM und ohne three.js, im Web Worker tuchrechner.js oder in Node für die Tests): eine Stoffsimulation mit
// Positionsbedingungen (PBD, Müller et al. 2007), einmal ganz von vorn bis zum Ende gerechnet und je Filmbild (1/30 s eigener Zeit) gespeichert.
// So muss beim Abspielen und Spulen nichts mehr simuliert werden (Rückmeldung vom 17. Oktober 2026: «der Tuch-Effekt bringt die Sache wohl zum
// Abstürzen» – ein Sprung ans Ende rechnete zuvor bis zu 1000 Teilschritte am Stück und hielt die Seite rund 20 s an).
//   Gitter nx × ny, Abstände längs, quer, diagonal und über zwei Maschen (Biegung), Schwerkraft, Wind von hinten mit Böen, Luftwiderstand nach der
//   Fläche (die Kraft wirkt entlang der Normalen), oben fünf Haken, im Bild auch die unteren Ecken; 120 Teilschritte je Sekunde, 4 Iterationen.
import { phase } from "./ablauf.js?v=3";

export const TEILSCHRITTE = 120, BILDER_JE_S = 30, ITERATIONEN = 4, TIEFE_UEBERGABE = 0.3;
const JE_BILD = TEILSCHRITTE / BILDER_JE_S;
// dieselben Zeitkurven wie in gemeinsam.js (das hier läuft ohne three.js)
const anteil = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const weich = (x) => x * x * (3 - 2 * x);
const inOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

/** glattes Rauschen (Werte −1..1) für die Böen, mit Startwert */
function rauschen(x, y, z) {
  const h = (i, j, k) => { let n = (i * 374761393 + j * 668265263 + k * 1274126177) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 2147483648 - 1; };
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi;
  const s = (t) => t * t * (3 - 2 * t), u = s(fx), v = s(fy), w = s(fz);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
    l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w);
}

/** Gitterweite nach Gerät: Test 24, Telefon 52, sonst 72 Punkte quer */
export const gitter = ({ test = false, grob = false } = {}) => (test ? 24 : grob ? 52 : 72);

/**
 * Die ganze Bahn. teil: { erst, vorher, phasen } (aus ablauf.js), a: Seitenverhältnis B / H, tiefe: Tiefenkarte (tw × th, Zeile 0 oben, 1 nah)
 * für den Anfang nach der Tiefe. fortschritt(anteil) wird zwischendurch gerufen.
 * Ergebnis: { nx, ny, N, bilder, lagen: Float32Array (bilder × N × 3), heim: Float32Array (N × 3) }; Bild f gehört zur eigenen Zeit f / 30.
 */
export function tuchBahn({ teil, a, nx, tiefe = null, tw = 1, th = 1, fortschritt = null }) {
  const T = phase(teil, "tuch"), Bp = phase(teil, "bild"), dauer = teil.phasen.reduce((s, p) => s + p[2], 0);
  const ny = Math.round((nx - 1) / a) + 1, N = nx * ny;
  const dx = (2 * a) / (nx - 1), dy = 2 / (ny - 1);
  const heim = new Float32Array(N * 3);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = (j * nx + i) * 3; heim[k] = -a + i * dx; heim[k + 1] = 1 - j * dy; heim[k + 2] = 0; }
  // Bedingungen: [i, j, Ruhelänge, Nachgiebigkeit]
  const bed = [];
  const dazu = (i, j, steif) => { const l = Math.hypot(heim[i * 3] - heim[j * 3], heim[i * 3 + 1] - heim[j * 3 + 1]); bed.push(i, j, l, steif); };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i;
    if (i + 1 < nx) dazu(k, k + 1, 1);
    if (j + 1 < ny) dazu(k, k + nx, 1);
    if (i + 1 < nx && j + 1 < ny) { dazu(k, k + nx + 1, 0.7); dazu(k + 1, k + nx, 0.7); }
    if (i + 2 < nx) dazu(k, k + 2, 0.12);
    if (j + 2 < ny) dazu(k, k + 2 * nx, 0.12);
  }
  // Indizes und Werte getrennt, in doppelter Genauigkeit gerechnet: die innere Schleife ist der grösste Teil der Arbeit
  const nc = bed.length / 4, CI = new Int32Array(nc * 2), CL = new Float64Array(nc), CS = new Float64Array(nc);
  for (let c = 0; c < nc; c++) { CI[c * 2] = bed[c * 4]; CI[c * 2 + 1] = bed[c * 4 + 1]; CL[c] = bed[c * 4 + 2]; CS[c] = bed[c * 4 + 3]; }
  const ecken = [0, nx - 1, (ny - 1) * nx, N - 1];
  // gehalten: oben fünf Punkte wie an Haken (die Kante wirft dazwischen Bögen), im Bild auch die unteren Ecken
  const oben = [0, Math.round((nx - 1) / 4), Math.round((nx - 1) / 2), Math.round((3 * (nx - 1)) / 4), nx - 1];
  const haken = [...oben, ecken[2], ecken[3]];
  const relief = (k) => {
    const u = (k % nx) / (nx - 1), v = Math.floor(k / nx) / (ny - 1);
    if (!tiefe) return 0;
    const d = tiefe[Math.min(th - 1, Math.round(v * (th - 1))) * tw + Math.min(tw - 1, Math.round(u * (tw - 1)))];
    return (d - 0.5) * TIEFE_UEBERGABE;
  };
  // Ausgangslage: als erster Effekt hoch über dem Bild, leicht nach hinten gekippt; nach der Tiefe das Relief; sonst flach
  const startLage = () => {
    const p = Float64Array.from(heim);
    for (let k = 0; k < N; k++) {
      if (teil.erst) { const v = Math.floor(k / nx) / (ny - 1); p[k * 3 + 1] += 2.5; p[k * 3 + 2] = -0.35 - 0.5 * v; }
      else if (teil.vorher === "tiefe") p[k * 3 + 2] = relief(k);
    }
    return p;
  };
  const pos = startLage(), alt = Float64Array.from(pos);
  let n = 0;
  const normale = new Float32Array(N * 3), griff = new Float32Array(12), fest = new Uint8Array(N), boeen = new Float64Array(N * 3);
  let gegriffen = false;

  // Halter: die oberen Ecken immer (als erster Effekt fahren sie von oben herein), im Bild auch die unteren (von dort, wo sie gerade sind)
  const halter = (tau, k, ziel) => {
    const e = k === ecken[2] ? 2 : k === ecken[3] ? 3 : 0;
    if (e < 2) {
      ziel[0] = heim[k * 3]; ziel[1] = heim[k * 3 + 1] + (teil.erst ? 2.5 * (1 - inOut(anteil(tau, 0.1, T[0] + 2.6))) : 0); ziel[2] = teil.erst ? -0.35 * (1 - inOut(anteil(tau, 0.1, T[0] + 2.6))) : (teil.vorher === "tiefe" ? relief(k) * (1 - inOut(anteil(tau, Bp[0], Bp[0] + 1.6))) : 0);
      return true;
    }
    if (!Bp || tau < Bp[0] + 0.3) return false;
    const f = inOut(anteil(tau, Bp[0] + 0.3, Bp[0] + 1.9)), o = (e - 2) * 3;
    for (let c = 0; c < 3; c++) ziel[c] = griff[6 + o + c] + (heim[k * 3 + c] - griff[6 + o + c]) * f;
    return true;
  };
  const z3 = [0, 0, 0];
  function normalen() {
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i, l = j * nx + Math.max(0, i - 1), r = j * nx + Math.min(nx - 1, i + 1), o = Math.max(0, j - 1) * nx + i, u = Math.min(ny - 1, j + 1) * nx + i;
      const ax = pos[r * 3] - pos[l * 3], ay = pos[r * 3 + 1] - pos[l * 3 + 1], az = pos[r * 3 + 2] - pos[l * 3 + 2];
      const bx = pos[o * 3] - pos[u * 3], by = pos[o * 3 + 1] - pos[u * 3 + 1], bz = pos[o * 3 + 2] - pos[u * 3 + 2];
      let cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
      const m = Math.sqrt(cx * cx + cy * cy + cz * cz) || 1; cx /= m; cy /= m; cz /= m;
      normale[k * 3] = cx; normale[k * 3 + 1] = cy; normale[k * 3 + 2] = cz;
    }
  }
  function schritt() {
    const dt = 1 / TEILSCHRITTE, tau = n * dt;
    // Wind von hinten (zur Kamera hin), Böen über Ort und Zeit; im Bild legt er sich
    const still = Bp ? 1 - weich(anteil(tau, Bp[0] - 0.2, Bp[0] + 1.0)) : 1;
    const wind = 5.2 * weich(anteil(tau, teil.erst ? 0.6 : 0.15, teil.erst ? 2.2 : 1.4)) * still;
    const schwere = 2.4 * (teil.erst ? 1 : weich(anteil(tau, 0, 0.6))) * still;
    if (Bp && !gegriffen && tau >= Bp[0] + 0.3) { for (let e = 2; e < 4; e++) for (let c = 0; c < 3; c++) griff[e * 3 + c] = pos[ecken[e] * 3 + c]; gegriffen = true; }
    normalen();
    const zt = tau * 0.55;
    for (let k = 0; k < N; k++) {
      const x = pos[k * 3], y = pos[k * 3 + 1], z = pos[k * 3 + 2];
      const vx = x - alt[k * 3], vy = y - alt[k * 3 + 1], vz = z - alt[k * 3 + 2];
      // Böen: Rauschen über Ort und Zeit und eine Welle, die von unten nach oben durch das Tuch läuft
      if (n % JE_BILD === 0) {                                             // das Rauschen der Böen einmal je Filmbild (es ändert sich langsam)
        boeen[k * 3] = 0.35 * rauschen(heim[k * 3] * 0.6, heim[k * 3 + 1] * 0.6 + 7.3, zt * 1.7); boeen[k * 3 + 1] = 0.2 * rauschen(heim[k * 3 + 1] * 0.7 + 1.9, zt * 1.3, 4.4);
        boeen[k * 3 + 2] = 0.55 + 0.5 * rauschen(heim[k * 3] * 0.9 + 3.1, heim[k * 3 + 1] * 0.9, zt * 2.2);
      }
      const boe = boeen[k * 3 + 2] + 0.35 * Math.sin(4.2 * heim[k * 3 + 1] - 6.5 * tau + 1.3 * heim[k * 3]);
      const wx = wind * boeen[k * 3], wy = wind * boeen[k * 3 + 1], wz = wind * boe;
      const nx_ = normale[k * 3], ny_ = normale[k * 3 + 1], nz_ = normale[k * 3 + 2];
      const rel = (wx - vx / dt) * nx_ + (wy - vy / dt) * ny_ + (wz - vz / dt) * nz_;
      const fx = 1.1 * rel * nx_, fy = 1.1 * rel * ny_ - schwere, fz = 1.1 * rel * nz_;
      const daempf = 0.992;
      alt[k * 3] = x; alt[k * 3 + 1] = y; alt[k * 3 + 2] = z;
      pos[k * 3] = x + vx * daempf + fx * dt * dt; pos[k * 3 + 1] = y + vy * daempf + fy * dt * dt; pos[k * 3 + 2] = z + vz * daempf + fz * dt * dt;
    }
    for (const k of haken) { fest[k] = 0; if (halter(tau, k, z3)) { pos[k * 3] = z3[0]; pos[k * 3 + 1] = z3[1]; pos[k * 3 + 2] = z3[2]; fest[k] = 1; } }
    for (let it = 0; it < ITERATIONEN; it++) {
      for (let c = 0; c < nc; c++) {
        const pi = CI[c * 2], pj = CI[c * 2 + 1], i = pi * 3, j = pj * 3, l = CL[c], s = CS[c];
        const ax = pos[j] - pos[i], ay = pos[j + 1] - pos[i + 1], az = pos[j + 2] - pos[i + 2];
        const d = Math.sqrt(ax * ax + ay * ay + az * az) || 1e-9, wi = 1 - fest[pi], wj = 1 - fest[pj];
        if (wi + wj === 0) continue;
        const f = (s * (d - l)) / d / (wi + wj);
        pos[i] += ax * f * wi; pos[i + 1] += ay * f * wi; pos[i + 2] += az * f * wi;
        pos[j] -= ax * f * wj; pos[j + 1] -= ay * f * wj; pos[j + 2] -= az * f * wj;
      }
    }
    // gegen das Riffeln (Knicken über eine Masche, wenn der Stoff gestaucht wird): die Tiefe ein wenig mit den Nachbarn mitteln, im Bild stärker
    const glaetten = 0.04 + (Bp ? 0.4 * weich(anteil(tau, Bp[0], Bp[0] + 1.2)) : 0);
    for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const k = j * nx + i, m = (pos[(k - 1) * 3 + 2] + pos[(k + 1) * 3 + 2] + pos[(k - nx) * 3 + 2] + pos[(k + nx) * 3 + 2]) / 4;
      pos[k * 3 + 2] += (m - pos[k * 3 + 2]) * glaetten;
    }
    // im Bild: alle Punkte zieht es an ihren Platz, zuletzt ganz
    if (Bp) {
      const h = inOut(anteil(tau, Bp[0] + 0.9, Bp[1] - 0.5)), k1 = h >= 1 ? 1 : 0.02 + 0.2 * h * h;
      if (h > 0) for (let k = 0; k < N * 3; k++) pos[k] += (heim[k] - pos[k]) * k1;
    }
    n++;
  }
  const bilder = Math.ceil(dauer * BILDER_JE_S) + 1, lagen = new Float32Array(bilder * N * 3);
  lagen.set(pos, 0);
  for (let f = 1; f < bilder; f++) {
    for (let s = 0; s < JE_BILD; s++) schritt();
    lagen.set(pos, f * N * 3);
    if (fortschritt && f % 15 === 0) fortschritt(f / bilder);
  }
  return { nx, ny, N, bilder, lagen, heim };
}
