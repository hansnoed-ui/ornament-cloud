// PHORMA II – Struktur: die Musik als Punkte, Netze, Knoten, Muster und Fraktale, reduziert und sich ausbreitend (Wunsch vom 18. Oktober 2026:
// «noch viel stärker reduzieren und ausbreiten. Keine Formen und einzelne Linien; Punkte, Muster, Netze, Knoten, Fraktale»). Schwarze Punkte und
// haarfeine Linien auf Papier; bei jedem Schnitt der Musik ein neues Motiv, das sich von der Mitte über das ganze Bild ausbreitet:
//   Punkte  – ein Raster über das Bild; die Grösse folgt dem Spektrum (innen Bass, aussen Höhen), jeder Schlag läuft als Welle nach aussen; mit
//             einem Text oder Foto als Quelle ein Raster wie im Druck (dunkle Stellen, grosse Punkte)
//   Netz    – Knoten mit feinen Verbindungen; jeder Schlag läuft als Puls durch das Netz, je lauter, desto mehr Verbindungen
//   Knoten  – eine einzige Linie als Torusknoten im Raum, ihr Schlauch atmet mit dem Spektrum, sie schwingt bei Einsätzen
//   Muster  – zwei Scharen feiner Linien (oder Ringe) übereinander: Moiré; Winkel und Abstand nach Bass und Schwung
//   Fraktal – ein Baum, der von der Mitte nach aussen verzweigt; mit der Zeit mehr Ebenen, die Winkel nach den Mitten
// Alles ist eine Funktion der Zeit (wie das Gewebe): die Tonkurven aus ton.js, kein Zustand.
import * as THREE from "three";
import { anteil, weich, inOut, kamera, quadMaterial } from "./gemeinsam.js?v=12";
import { phase } from "./ablauf.js?v=12";
import { FPS, BAENDER, tonOderErsatz, wert, motivWechsel } from "./ton.js?v=12";

const VOR = 0.4;
export const MOTIVE = ["punkte", "netz", "knoten", "muster", "fraktal"];
const hash = (n) => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
const klemm = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

const PUNKT_VERTEX = /* glsl */ `
  attribute float aGroesse, aAlpha; uniform float uA, uMass; varying float vA;
  void main() { gl_Position = vec4(position.x / uA, position.y, 0.0, 1.0); gl_PointSize = max(1.0, aGroesse * uMass); vA = aAlpha; }`;
const PUNKT_FRAGMENT = /* glsl */ `
  uniform vec3 uTinte; varying float vA;
  void main() { float d = length(gl_PointCoord - 0.5), m = vA * (1.0 - smoothstep(0.38, 0.5, d)); gl_FragColor = vec4(uTinte * m, m); }`;
const LINIE_VERTEX = /* glsl */ `
  attribute float aAlpha; uniform float uA; varying float vA;
  void main() { gl_Position = vec4(position.x / uA, position.y, 0.0, 1.0); vA = aAlpha; }`;
const LINIE_FRAGMENT = /* glsl */ `uniform vec3 uTinte; varying float vA; void main() { gl_FragColor = vec4(uTinte * vA, vA); }`;
const GRUND = /* glsl */ `
  uniform sampler2D tFoto; uniform vec3 uPapier; uniform float uFoto, uSicht; varying vec2 vUv;
  void main() { gl_FragColor = vec4(mix(uPapier, texture2D(tFoto, vUv).rgb, uFoto) * uSicht, 1.0); }`;

export function struktur(g, teil) {
  const { renderer, A, B, H } = g, a = B / H;
  const Z = phase(teil, "zeichen"), S = phase(teil, "struktur"), Bp = phase(teil, "bild");
  const T = tonOderErsatz(g.ton), mitBild = g.quelle !== "ton";
  const MP = g.test ? 2500 : g.grob ? 4000 : 7000, ML = g.test ? 5000 : g.grob ? 9000 : 15000, dicht = g.test ? 1.7 : g.grob ? 1.3 : 1;   // Raster weiter, wo weniger Punkte gehen
  const W = motivWechsel(T.schnitte, S[0] + VOR, S[1] + VOR);
  const schnitt = new Set();
  for (const s of T.schnitte) for (let b = Math.round(s * FPS); b < Math.round(s * FPS) + 4; b++) schnitt.add(b);

  // Geometrie: Punkte und Linien, je Bild neu befüllt
  const pPos = new Float32Array(MP * 3), pGr = new Float32Array(MP), pAl = new Float32Array(MP);
  const lPos = new Float32Array(ML * 6), lAl = new Float32Array(ML * 2);
  const pGeo = new THREE.BufferGeometry(), lGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute("aGroesse", new THREE.BufferAttribute(pGr, 1)); pGeo.setAttribute("aAlpha", new THREE.BufferAttribute(pAl, 1));
  lGeo.setAttribute("position", new THREE.BufferAttribute(lPos, 3)); lGeo.setAttribute("aAlpha", new THREE.BufferAttribute(lAl, 1));
  for (const geo of [pGeo, lGeo]) for (const k of Object.keys(geo.attributes)) geo.attributes[k].setUsage(THREE.DynamicDrawUsage);
  const tinte = { value: new THREE.Color(0.02, 0.02, 0.025) };
  const mischen = { depthTest: false, depthWrite: false, transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation };
  const pMat = new THREE.ShaderMaterial({ vertexShader: PUNKT_VERTEX, fragmentShader: PUNKT_FRAGMENT, uniforms: { uA: { value: a }, uMass: { value: 1 }, uTinte: tinte }, ...mischen });
  const lMat = new THREE.ShaderMaterial({ vertexShader: LINIE_VERTEX, fragmentShader: LINIE_FRAGMENT, uniforms: { uA: { value: a }, uTinte: tinte }, ...mischen });
  const punkte = new THREE.Points(pGeo, pMat), linien = new THREE.LineSegments(lGeo, lMat);
  punkte.frustumCulled = linien.frustumCulled = false;
  const szene = new THREE.Scene(); szene.add(linien, punkte);
  const kam = kamera(B, H);
  const PAPIER = new THREE.Color("#f3f1ec"), NACHT = new THREE.Color(0.012, 0.012, 0.014);
  const grund = quadMaterial(GRUND, { tFoto: { value: g.fotoTex }, uPapier: { value: PAPIER.clone() }, uFoto: { value: 1 }, uSicht: { value: 0 } });

  // die Quelle als Raster: wie dunkel ist sie an einer Stelle (Bildkoordinaten)? Ohne Bild überall gleich
  const dunkel = (x, y) => {
    if (!mitBild) return 0.5;
    const i = Math.min(A.w - 1, Math.max(0, Math.floor(((x / a + 1) / 2) * A.w))), j = Math.min(A.h - 1, Math.max(0, Math.floor(((1 - y) / 2) * A.h)));
    return 1 - A.hell[j * A.w + i];
  };
  const spek = (t, band) => {
    if (!T.spektrum) return wert(T.laut, t);
    const f = klemm(t * FPS, 0, T.n - 1), i = Math.floor(f), u = f - i, i2 = Math.min(T.n - 1, i + 1);
    const k = klemm(band, 0, BAENDER - 1), k0 = Math.floor(k), k1 = Math.min(BAENDER - 1, k0 + 1), v = k - k0;
    const at = (ii, kk) => T.spektrum[ii * BAENDER + kk];
    return (at(i, k0) * (1 - v) + at(i, k1) * v) * (1 - u) + (at(i2, k0) * (1 - v) + at(i2, k1) * v) * u;
  };
  const stossBei = (t) => (t < 0 ? 0 : wert(T.stoss, t));

  let np = 0, nl = 0;
  const punkt = (x, y, gr, al) => { if (np >= MP || al <= 0.003 || gr <= 0.05) return; pPos[np * 3] = x; pPos[np * 3 + 1] = y; pGr[np] = gr; pAl[np] = Math.min(1, al); np++; };
  const linie = (x0, y0, x1, y1, al) => { if (nl >= ML || al <= 0.003) return; const o = nl * 6; lPos[o] = x0; lPos[o + 1] = y0; lPos[o + 3] = x1; lPos[o + 4] = y1; lAl[nl * 2] = lAl[nl * 2 + 1] = Math.min(1, al); nl++; };
  const R_MAX = Math.hypot(a, 1);

  // Netze je Variante einmal bauen: Knoten auf einem verrüttelten Raster (mit Bild: mehr Knoten, wo es dunkel ist), Kanten zu nahen Nachbarn
  const netze = new Map();
  function netz(v) {
    if (netze.has(v)) return netze.get(v);
    const d = [0.11, 0.085, 0.13][v % 3] * dicht, knoten = [];
    for (let y = -1 - d; y <= 1 + d; y += d) for (let x = -a - d; x <= a + d; x += d) {
      const n = knoten.length + v * 1000, px = x + (hash(n) - 0.5) * d * 0.9, py = y + (hash(n + 0.5) - 0.5) * d * 0.9;
      if (mitBild && hash(n + 0.7) > 0.25 + 0.9 * dunkel(px, py)) continue;
      knoten.push({ x: px, y: py, r: Math.hypot(px, py), h: hash(n + 0.3) });
    }
    const kanten = [];
    for (let i = 0; i < knoten.length; i++) for (let j = i + 1; j < knoten.length; j++) {
      const dx = knoten[i].x - knoten[j].x, dy = knoten[i].y - knoten[j].y;
      if (dx * dx + dy * dy < (d * 1.55) ** 2) kanten.push([i, j, hash(i * 7.1 + j * 1.3 + v)]);
    }
    const n = { knoten, kanten }; netze.set(v, n); return n;
  }

  /** ein Motiv zur Filmzeit ft: v – Variante (Nummer der Einstellung), seit – Sekunden seit dem Wechsel, sicht – 0..1 */
  function motiv(art, v, ft, seit, sicht) {
    const laut = wert(T.laut, ft), tief = wert(T.tief, ft), stoss = stossBei(ft), dreh = wert(T.dreh, ft), E = wert(T.energie, ft);
    // ausbreiten: von der Mitte bis über die Ecken, mit jedem Stoss ein Stück weiter
    const R = (0.12 + (R_MAX + 0.1) * (1 - Math.exp(-seit / 2.2))) * (1 + 0.12 * stoss);
    const rand = (r) => klemm((R - r) / 0.12);
    if (art === "punkte") {
      const d = [0.05, 0.065, 0.042][v % 3] * dicht, wink = 0.08 * dreh + 0.03 * ft + v * 0.4, c = Math.cos(wink), s = Math.sin(wink);
      for (let gy = -1.3; gy <= 1.3; gy += d * 0.866) for (let gx = -1.3; gx <= 1.3; gx += d) {
        const ox = gx + (Math.round(gy / (d * 0.866)) % 2 ? d / 2 : 0);
        let x = ox * c - gy * s, y = ox * s + gy * c;
        if (Math.abs(x) > a + 0.02 || Math.abs(y) > 1.02) continue;
        const r = Math.hypot(x, y), w = stossBei(ft - r / 1.3);                               // die Welle eines Schlags läuft nach aussen
        if (r > 1e-4) { x += (x / r) * 0.035 * w; y += (y / r) * 0.035 * w; }
        const sp = spek(ft, (r / R_MAX) * (BAENDER - 1)), bild = mitBild ? 0.15 + 1.7 * dunkel(x, y) : 1;
        punkt(x, y, (2 + 10 * sp * (0.4 + 0.6 * laut) + 8 * w) * bild, sicht * rand(r) * 0.9);
      }
    } else if (art === "netz") {
      const { knoten, kanten } = netz(v), lage = knoten.map((k) => {
        const amp = 0.012 + 0.03 * laut;
        return [k.x + amp * Math.sin(E * 0.9 + ft * 0.7 + k.h * 40), k.y + amp * Math.cos(E * 0.8 + ft * 0.6 + k.h * 31)];
      });
      const zeigen = 0.35 + 0.65 * laut;
      for (const [i, j, h] of kanten) {
        const ki = knoten[i], kj = knoten[j], r = Math.max(ki.r, kj.r);
        if (h > zeigen && stossBei(ft - r / 1.1) < 0.4) continue;                               // leise: weniger Verbindungen; der Puls zeigt alle
        const puls = stossBei(ft - r / 1.1);
        linie(lage[i][0], lage[i][1], lage[j][0], lage[j][1], sicht * rand(r) * (0.22 + 0.75 * puls));
      }
      knoten.forEach((k, i) => punkt(lage[i][0], lage[i][1], 1.6 + 6 * spek(ft, (k.r / R_MAX) * (BAENDER - 1)) * laut + 4 * stossBei(ft - k.r / 1.1), sicht * rand(k.r)));
    } else if (art === "knoten") {
      const [p, q] = [[2, 3], [3, 5], [2, 5], [3, 7], [5, 8], [3, 4]][v % 6], M = Math.min(1800, ML - nl - 10);
      const groesse = Math.min(1, R / 1.1) * 0.5, r0 = 0.42 + 0.08 * tief;
      const ax = 0.35 * Math.sin(E * 0.21 + ft * 0.11 + v) + 0.25 * Math.sin(dreh), ay = 0.3 * Math.cos(E * 0.17 + ft * 0.09 + v * 2), az = E * 0.12 + ft * 0.15 + 0.3 * dreh;
      const ca = Math.cos(ax), sa = Math.sin(ax), cb = Math.cos(ay), sb = Math.sin(ay), cc = Math.cos(az), sc = Math.sin(az);
      const lage = (t, schale) => {
        const sp = spek(ft, (0.5 + 0.5 * Math.sin(t * 3)) * (BAENDER - 1)), rr = r0 * (1 + 0.28 * sp * (0.4 + 0.6 * laut)) * schale;
        let x = (1 + rr * Math.cos(q * t)) * Math.cos(p * t), y = (1 + rr * Math.cos(q * t)) * Math.sin(p * t), z = rr * Math.sin(q * t);
        let y2 = y * ca - z * sa, z2 = y * sa + z * ca; y = y2; z = z2;
        let x2 = x * cb + z * sb; z2 = -x * sb + z * cb; x = x2; z = z2;
        x2 = x * cc - y * sc; y2 = x * sc + y * cc;
        const per = 1 / (1 + 0.25 * z2);
        return [x2 * groesse * per, y2 * groesse * per];
      };
      for (const [schale, al] of [[1, 0.85], [1.18, 0.28], [0.84, 0.18]]) {
        let alt = lage(0, schale);
        const n = Math.floor(M / 3);
        for (let i = 1; i <= n; i++) { const neu = lage((i / n) * 2 * Math.PI, schale); linie(alt[0], alt[1], neu[0], neu[1], sicht * al * (0.75 + 0.5 * stoss)); alt = neu; }
      }
      for (let i = 0; i < p * q * 2; i++) { const [x, y] = lage((i / (p * q * 2)) * 2 * Math.PI, 1); punkt(x, y, 2 + 6 * stoss, sicht * 0.9); }   // die Knotenpunkte
    } else if (art === "muster") {
      const s0 = [0.013, 0.017, 0.011][v % 3] * dicht, ringe = v % 2 === 1;
      if (!ringe) {
        const w1 = v * 0.7 + 0.04 * Math.sin(E * 0.2) + 0.012 * ft, w2 = w1 + 0.025 + 0.07 * tief + 0.05 * Math.sin(dreh), s2 = s0 * (1 + 0.05 * laut);
        for (const [w, ab, ver] of [[w1, s0, 0], [w2, s2, stoss * 0.5]]) {
          const c = Math.cos(w), s = Math.sin(w);
          for (let o = -R; o <= R; o += ab) {
            const oo = o + ver * ab, h = Math.sqrt(Math.max(0, R * R - oo * oo));
            if (h <= 0) continue;
            linie(oo * c - h * -s, oo * s - h * c, oo * c + h * -s, oo * s + h * c, sicht * 0.55);
          }
        }
      } else {
        const ab = s0 * 2.2, abstand = 0.04 + 0.22 * stoss + 0.06 * tief + 0.02 * Math.sin(ft * 0.8), wink = dreh * 0.5 + ft * 0.2 + v;
        const zentren = [[Math.cos(wink) * abstand, Math.sin(wink) * abstand], [-Math.cos(wink) * abstand, -Math.sin(wink) * abstand]];
        for (const [cx, cy] of zentren) for (let r = ab; r < R; r += ab) {
          const n = Math.max(24, Math.min(90, Math.round(r * 70)));
          let ax0 = cx + r, ay0 = cy;
          for (let i = 1; i <= n; i++) { const t = (i / n) * 2 * Math.PI, bx = cx + r * Math.cos(t), by = cy + r * Math.sin(t); linie(ax0, ay0, bx, by, sicht * 0.5); ax0 = bx; ay0 = by; }
        }
      }
    } else {
      // Fraktal: ein Baum von der Mitte aus, Ebene um Ebene; Winkel nach den Mitten, Schwung nach dem Dreh
      const aeste = [5, 6, 3][v % 3], tiefe = Math.min(9, 1 + seit * 2.2), voll = Math.floor(tiefe), rest = tiefe - voll;
      const winkel = 0.3 + 0.55 * spek(ft, 12) + 0.25 * stoss, faktor = 0.68 + 0.08 * laut, l0 = 0.2 * (0.8 + 0.4 * tief);
      const stapel = [];
      for (let k = 0; k < aeste; k++) stapel.push([0, 0, (k / aeste) * 2 * Math.PI + dreh * 0.4 + ft * 0.05 + v, l0, 0]);
      while (stapel.length) {
        const [x, y, w, l, e] = stapel.pop();
        if (e > voll) continue;
        const ll = e === voll ? l * rest : l, bx = x + Math.cos(w) * ll, by = y + Math.sin(w) * ll;
        linie(x, y, bx, by, sicht * (0.85 - e * 0.06));
        if (e === voll) { punkt(bx, by, 1.5 + 5 * spek(ft, 20 + (e % 10)) * laut, sicht * 0.8); continue; }
        const bieg = 0.15 * Math.sin(E * 0.5 + ft * 0.6 + e);
        stapel.push([bx, by, w - winkel + bieg, l * faktor, e + 1], [bx, by, w + winkel + bieg, l * faktor, e + 1]);
      }
    }
  }

  return {
    render(rt, tau) {
      const film = tau + VOR, b = Math.round(film * FPS);
      const istSchnitt = schnitt.has(b) && tau > Z[1] && tau < Bp[0];
      tinte.value.setRGB(...(istSchnitt ? [0.95, 0.95, 0.93] : [0.02, 0.02, 0.025]));
      grund.uniforms.uPapier.value.copy(istSchnitt ? NACHT : PAPIER);
      grund.uniforms.uSicht.value = teil.erst ? weich(anteil(tau, 0, 0.7)) : 1;
      grund.uniforms.uFoto.value = istSchnitt ? 0 : 1 - inOut(anteil(tau, Z[1] - 1.0, Z[1] + 0.4)) + inOut(anteil(tau, Bp[1] - 1.3, Bp[1] - 0.3));
      // welches Motiv, seit wann
      const vorbei = W.filter((w) => w.t <= film), j = vorbei.length, seit = film - (j ? vorbei[j - 1].t : S[0] + VOR - 0.6);
      const sicht = weich(anteil(tau, Z[1] - 0.6, Z[1] + 0.3)) * (1 - weich(anteil(tau, Bp[0] - 0.1, Bp[1] - 0.8)));
      np = 0; nl = 0;
      if (sicht > 0) motiv(MOTIVE[j % MOTIVE.length], j, film, Math.max(0, seit), sicht);
      pGeo.setDrawRange(0, np); lGeo.setDrawRange(0, nl * 2);
      pGeo.attributes.position.needsUpdate = pGeo.attributes.aGroesse.needsUpdate = pGeo.attributes.aAlpha.needsUpdate = true;
      lGeo.attributes.position.needsUpdate = lGeo.attributes.aAlpha.needsUpdate = true;
      pMat.uniforms.uMass.value = (rt?.height ?? H) / 1350;
      g.pass(grund, rt);
      renderer.setRenderTarget(rt); renderer.render(szene, kam);
      const ende = weich(anteil(tau, Bp[1] - 0.6, Bp[1] - 0.1));
      return { aktiv: 0.3 * (1 - weich(anteil(tau, Bp[0], Bp[1]))), bloom: 0, saum: istSchnitt ? 0 : 0.0006, ende };
    },
    vorab: { szenen: [[szene, kam]], materialien: [grund] },
    zaehler(tau) {
      const film = tau + VOR, j = W.filter((w) => w.t <= film).length;
      return `${MOTIVE[j % MOTIVE.length]} · ${np} punkte · ${nl} linien · ${T.echt ? `einsatz ${T.einsaetze.filter((e) => e.t <= film).length} / ${T.einsaetze.length}` : "ohne ton"}`;
    },
    entsorgen() { pGeo.dispose(); lGeo.dispose(); pMat.dispose(); lMat.dispose(); grund.dispose(); },
  };
}
