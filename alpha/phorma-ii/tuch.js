// PHORMA II – Tuch: das Foto als Seidentuch. Eine Stoffsimulation mit Positionsbedingungen (PBD, Müller et al. 2007) auf dem Prozessor: Gitter aus
// rund 6500 Massepunkten, Abstände längs, quer, diagonal und über zwei Maschen (Biegung), Schwerkraft, Wind von hinten mit Böen und Luftwiderstand
// nach der Fläche (die Kraft wirkt entlang der Normalen). Gezeichnet doppelt so fein (Catmull-Rom zwischen den Punkten) mit Seidenglanz (Sheen)
// und Selbstschatten.
//   01 Tuch – als erster Effekt schwebt es an zwei Ecken gehalten von oben herein; nach der Tiefe ist es zuerst das Relief und fällt; sonst das
//   flache Foto, das der Wind erfasst; 02 Bild – der Wind legt sich, die unteren Ecken werden an ihren Platz gezogen, dann alle Punkte: es liegt
//   glatt da, das Licht wird zum Foto.
// Feste Teilschritte (120 je Sekunde eigener Zeit); alle 1 s ein Wiedereinstiegspunkt.
import * as THREE from "three";
import { anteil, weich, inOut, kamera, ABSTAND } from "./gemeinsam.js?v=1";
import { phase } from "./ablauf.js?v=1";
import { TIEFE_UEBERGABE } from "./tiefe.js?v=1";

export const TEILSCHRITTE = 120;
const ITERATIONEN = 6;

/** glattes Rauschen (Werte −1..1) für die Böen, mit Startwert */
function rauschen(x, y, z) {
  const h = (i, j, k) => { let n = (i * 374761393 + j * 668265263 + k * 1274126177) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 2147483648 - 1; };
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi;
  const s = (t) => t * t * (3 - 2 * t), u = s(fx), v = s(fy), w = s(fz);
  const l = (a, b, t) => a + (b - a) * t;
  return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
    l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w);
}

export function tuch(g, teil) {
  const { renderer, A, B, H } = g, a = B / H;
  const T = phase(teil, "tuch"), Bp = phase(teil, "bild");
  const nx = g.test ? 24 : g.grob ? 52 : 72, ny = Math.round((nx - 1) / a) + 1, N = nx * ny;
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
  const C = new Float32Array(bed), nc = bed.length / 4;
  const ecken = [0, nx - 1, (ny - 1) * nx, N - 1];
  // gehalten: oben fünf Punkte wie an Haken (die Kante wirft dazwischen Bögen), im Bild auch die unteren Ecken
  const oben = [0, Math.round((nx - 1) / 4), Math.round((nx - 1) / 2), Math.round((3 * (nx - 1)) / 4), nx - 1];
  const haken = [...oben, ecken[2], ecken[3]];
  const relief = (k) => {
    const u = (k % nx) / (nx - 1), v = Math.floor(k / nx) / (ny - 1);
    const d = A.tiefe[Math.min(A.h - 1, Math.round(v * (A.h - 1))) * A.w + Math.min(A.w - 1, Math.round(u * (A.w - 1)))];
    return (d - 0.5) * TIEFE_UEBERGABE;
  };
  // Ausgangslage: als erster Effekt hoch über dem Bild, leicht nach hinten gekippt; nach der Tiefe das Relief; sonst flach
  const startLage = () => {
    const p = Float32Array.from(heim);
    for (let k = 0; k < N; k++) {
      if (teil.erst) { const v = Math.floor(k / nx) / (ny - 1); p[k * 3 + 1] += 2.5; p[k * 3 + 2] = -0.35 - 0.5 * v; }
      else if (teil.vorher === "tiefe") p[k * 3 + 2] = relief(k);
    }
    return p;
  };
  let pos = startLage(), alt = Float32Array.from(pos), n = 0;
  const normale = new Float32Array(N * 3), griff = new Float32Array(12);
  let gegriffen = false;
  const sicherungen = [];

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
      const m = Math.hypot(cx, cy, cz) || 1; cx /= m; cy /= m; cz /= m;
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
      const boe = 0.55 + 0.5 * rauschen(heim[k * 3] * 0.9 + 3.1, heim[k * 3 + 1] * 0.9, zt * 2.2) + 0.35 * Math.sin(4.2 * heim[k * 3 + 1] - 6.5 * tau + 1.3 * heim[k * 3]);
      const wx = wind * 0.35 * rauschen(heim[k * 3] * 0.6, heim[k * 3 + 1] * 0.6 + 7.3, zt * 1.7), wy = wind * 0.2 * rauschen(heim[k * 3 + 1] * 0.7 + 1.9, zt * 1.3, 4.4), wz = wind * boe;
      const nx_ = normale[k * 3], ny_ = normale[k * 3 + 1], nz_ = normale[k * 3 + 2];
      const rel = (wx - vx / dt) * nx_ + (wy - vy / dt) * ny_ + (wz - vz / dt) * nz_;
      const fx = 1.1 * rel * nx_, fy = 1.1 * rel * ny_ - schwere, fz = 1.1 * rel * nz_;
      const daempf = 0.992;
      alt[k * 3] = x; alt[k * 3 + 1] = y; alt[k * 3 + 2] = z;
      pos[k * 3] = x + vx * daempf + fx * dt * dt; pos[k * 3 + 1] = y + vy * daempf + fy * dt * dt; pos[k * 3 + 2] = z + vz * daempf + fz * dt * dt;
    }
    const gehalten = [];
    for (const k of haken) if (halter(tau, k, z3)) { pos[k * 3] = z3[0]; pos[k * 3 + 1] = z3[1]; pos[k * 3 + 2] = z3[2]; gehalten.push(k); }
    for (let it = 0; it < ITERATIONEN; it++) {
      for (let c = 0; c < nc; c++) {
        const i = C[c * 4], j = C[c * 4 + 1], l = C[c * 4 + 2], s = C[c * 4 + 3];
        const ax = pos[j * 3] - pos[i * 3], ay = pos[j * 3 + 1] - pos[i * 3 + 1], az = pos[j * 3 + 2] - pos[i * 3 + 2];
        const d = Math.hypot(ax, ay, az) || 1e-9, wi = gehalten.includes(i) ? 0 : 1, wj = gehalten.includes(j) ? 0 : 1;
        if (wi + wj === 0) continue;
        const f = (s * (d - l)) / d / (wi + wj);
        pos[i * 3] += ax * f * wi; pos[i * 3 + 1] += ay * f * wi; pos[i * 3 + 2] += az * f * wi;
        pos[j * 3] -= ax * f * wj; pos[j * 3 + 1] -= ay * f * wj; pos[j * 3 + 2] -= az * f * wj;
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
    if (n % TEILSCHRITTE === 0 && !sicherungen.some((s) => s.n === n)) sicherungen.push({ n, pos: Float32Array.from(pos), alt: Float32Array.from(alt), gegriffen, griff: Float32Array.from(griff) });
  }
  function bis(m) {
    if (m < n) {
      const s = sicherungen.filter((x) => x.n <= m).at(-1);
      if (s) { pos.set(s.pos); alt.set(s.alt); griff.set(s.griff); gegriffen = s.gegriffen; n = s.n; }
      else { pos = startLage(); alt = Float32Array.from(pos); gegriffen = false; n = 0; }
    }
    while (n < m) schritt();
  }

  // Zeichnen: doppelt so fein, Catmull-Rom zwischen den Punkten
  const mx = 2 * nx - 1, my = 2 * ny - 1, M = mx * my;
  const geo = new THREE.BufferGeometry(), vp = new Float32Array(M * 3), uv = new Float32Array(M * 2), idx = [];
  for (let j = 0; j < my; j++) for (let i = 0; i < mx; i++) { const k = j * mx + i; uv[k * 2] = i / (mx - 1); uv[k * 2 + 1] = 1 - j / (my - 1); }
  for (let j = 0; j < my - 1; j++) for (let i = 0; i < mx - 1; i++) { const k = j * mx + i; idx.push(k, k + mx, k + 1, k + 1, k + mx, k + mx + 1); }
  geo.setAttribute("position", new THREE.BufferAttribute(vp, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
  const cr = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
  const P = (i, j, c) => pos[(Math.min(ny - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))) * 3 + c];
  function verfeinern() {
    for (let j = 0; j < my; j++) for (let i = 0; i < mx; i++) {
      const gi = i >> 1, gj = j >> 1, ti = (i & 1) * 0.5, tj = (j & 1) * 0.5, k = (j * mx + i) * 3;
      for (let c = 0; c < 3; c++) {
        if (!ti && !tj) { vp[k + c] = P(gi, gj, c); continue; }
        const zeile = (jj) => (ti ? cr(P(gi - 1, jj, c), P(gi, jj, c), P(gi + 1, jj, c), P(gi + 2, jj, c), ti) : P(gi, jj, c));
        vp[k + c] = tj ? cr(zeile(gj - 1), zeile(gj), zeile(gj + 1), zeile(gj + 2), tj) : zeile(gj);
      }
    }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
  }
  const mat = new THREE.MeshPhysicalMaterial({ map: g.fotoTex, emissiveMap: g.fotoTex, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.5, metalness: 0,
    sheen: 1, sheenRoughness: 0.32, sheenColor: new THREE.Color(1, 0.96, 0.9), side: THREE.DoubleSide });
  const stoff = new THREE.Mesh(geo, mat); stoff.castShadow = stoff.receiveShadow = true; stoff.frustumCulled = false;
  const szene = new THREE.Scene(); szene.add(stoff);
  const sonne = new THREE.DirectionalLight(0xfff4e8, 0); sonne.position.set(-2.8, 2.4, 1.5); sonne.castShadow = true;
  sonne.shadow.mapSize.set(g.grob ? 1024 : 2048, g.grob ? 1024 : 2048); sonne.shadow.bias = -0.0004; sonne.shadow.normalBias = 0.012;
  Object.assign(sonne.shadow.camera, { left: -2.2, right: 2.2, top: 2.6, bottom: -2.6, near: 0.5, far: 9 }); sonne.shadow.camera.updateProjectionMatrix();
  const gegen = new THREE.DirectionalLight(0xff8a4a, 0); gegen.position.set(2.4, -0.6, -2.0);
  const himmel = new THREE.HemisphereLight(0xbcc8ff, 0x201810, 0);
  szene.add(sonne, gegen, himmel);
  const kam = kamera(B, H);

  return {
    render(rt, tau) {
      bis(Math.floor(tau * TEILSCHRITTE + 1e-6));
      verfeinern();
      // Licht: als erster Effekt aus dem Dunkeln, sonst vom Foto her; im Bild wird es zum Foto (emissiv)
      const ein = teil.erst ? weich(anteil(tau, 0.2, 1.8)) : 1, foto = Bp ? inOut(anteil(tau, Bp[0] + 0.8, Bp[1] - 0.4)) : 0;
      const start = teil.erst ? 0 : 1 - weich(anteil(tau, 0, teil.vorher === "tiefe" ? 0.9 : 0.6));
      const licht = ein * (1 - foto) * (1 - start);
      sonne.intensity = 3.4 * licht; gegen.intensity = 2.0 * licht; himmel.intensity = 0.35 * licht;
      // die Kamera tritt zurück, solange das Tuch weht, damit es ganz im Bild bleibt, und kommt im Bild genau an ihren Platz
      const zurueck = 0.24 * weich(anteil(tau, 0.3, 2.2)) * (Bp ? 1 - inOut(anteil(tau, Bp[0], Bp[0] + 2.2)) : 1);
      kam.position.set(0, 0.04 * zurueck / 0.24, ABSTAND * (1 + zurueck)); kam.lookAt(0, 0, 0);
      mat.color.setScalar(licht); mat.emissiveIntensity = Math.max(foto, start); mat.sheen = licht;
      renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(true, true, true);
      renderer.render(szene, kam);
      let ende = teil.vonFoto ? 1 - weich(anteil(tau, 0, 0.3)) : 0;
      if (Bp) ende = Math.max(ende, weich(anteil(tau, Bp[1] - 0.7, Bp[1] - 0.1)));
      const aktiv = (teil.erst ? weich(anteil(tau, 0, 0.8)) : 1) * (Bp ? 1 - weich(anteil(tau, Bp[0] + 0.6, Bp[1])) : 1);
      return { aktiv, bloom: 0.3, saum: 0.0022, ende };
    },
    zaehler() { const z = (x) => x.toLocaleString("de-CH"); return `punkte ${z(N)} · bedingungen ${z(nc)} · schritt ${z(n)}`; },
    entsorgen() { geo.dispose(); mat.dispose(); sonne.shadow.map?.dispose(); },
  };
}
