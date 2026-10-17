// PHORMA II – Stich: ein Kupferstich, der fliesst. Die Strömungslinien aus analyse.js (gleichmässig verteilt, entlang der Richtung des Bilds aus dem
// Strukturtensor) zeichnen sich Strich für Strich mit einer glühenden Stiftspitze, die wichtigsten (entlang der stärksten Kanten) zuerst, dann immer
// schneller; die zweite, kreuzende Lage nur in den hellen Tönen. Die Breite jedes Strichs folgt Bildpunkt für Bildpunkt der Helligkeit des Fotos
// (auf Schwarz: je heller, desto breiter) – so bleiben feine Details erhalten.
//   01 Linien – weisse Tinte, Kupfer an der Spitze; 02 Farbe – die Striche nehmen die Farben des Fotos an; 03 Bild / Dichte – die Striche werden breiter,
//   bis sie sich schliessen, darunter erscheint das Foto: am Ende steht es exakt da.
// Alle Striche liegen in einer Geometrie (ein Zeichenaufruf); zustandslos, jedes Bild hängt nur von der Zeit ab.
import * as THREE from "three";
import { anteil, weich, inOut, quadMaterial } from "./gemeinsam.js?v=1";
import { phase } from "./ablauf.js?v=1";

const UNTERLAGE = /* glsl */ `uniform sampler2D tFoto; uniform float uGrund; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(tFoto, vUv).rgb * uGrund, 1.0); }`;
const VERTEX = /* glsl */ `
  attribute vec2 aNormale; attribute vec4 aLinie; attribute float aSchicht;
  uniform vec2 uFilm; uniform float uHalb, uZoom;
  varying float vSeite, vS, vSchicht; varying vec4 vLinie; varying vec2 vBild;
  void main() {
    float rand = uHalb + 1.5;
    vec2 p = position.xy + aNormale * position.z * rand;
    vBild = vec2(p.x / uFilm.x, 1.0 - p.y / uFilm.y);
    gl_Position = vec4((vBild * 2.0 - 1.0) * uZoom, 0.0, 1.0);
    vSeite = position.z * rand; vS = aLinie.x; vLinie = aLinie; vSchicht = aSchicht;
  }`;
const FRAGMENT = /* glsl */ `
  uniform sampler2D tFoto; uniform float uZeit, uHalb, uFarbe, uDicht, uSicht; uniform vec3 uTinte, uSpitze;
  varying float vSeite, vS, vSchicht; varying vec4 vLinie; varying vec2 vBild;
  void main() {
    float auf = (uZeit - vLinie.z) / vLinie.w * vLinie.y;                // so weit ist der Strich gezeichnet (Filmpunkte)
    if (vS > auf) discard;
    vec3 foto = texture2D(tFoto, vBild).rgb;
    float L = pow(dot(foto, vec3(0.2126, 0.7152, 0.0722)), 1.0 / 2.2);
    // Hauptlage höchstens 0,8 der Bahn (die Striche bleiben getrennt), die kreuzende Lage nur in den Lichtern und schmaler
    float w = vSchicht < 0.5 ? mix(0.32, 0.8 * uHalb, pow(L, 0.85)) : uHalb * 0.5 * smoothstep(0.72, 1.0, L);
    w = mix(w, uHalb + 0.9, uDicht);
    float d = abs(vSeite), aa = max(fwidth(d), 0.35);
    float a = clamp((w - d) / aa + 0.5, 0.0, 1.0) * uSicht;
    if (a <= 0.002) discard;
    float spitze = auf < vLinie.y ? exp(-(auf - vS) / 16.0) : 0.0;
    vec3 tinte = mix(uTinte * (0.5 + 0.5 * L), foto * mix(1.3, 1.0, uDicht), uFarbe);
    gl_FragColor = vec4((tinte + uSpitze * spitze * 2.4 * (1.0 - uDicht)) * a, a);
  }`;

/** Strichgeometrie: jede Linie als Band, jeder zweite Punkt; Zeiten nach Wichtigkeit */
function geometrie(A, L0, L1) {
  const lagen = [[A.linien.haupt, 0], [A.linien.quer, 1]];
  let nv = 0, ni = 0;
  // die kreuzende Lage nur dort, wo das Bild Struktur hat (mittlere Kantenstärke entlang der Linie), nicht in ruhigen Flächen wie einem Himmel
  lagen[1][0] = { punkte: A.linien.quer.punkte, linien: A.linien.quer.linien.filter((l) => l[2] / l[3] > 0.12) };
  for (const [lage] of lagen) for (const [, n] of lage.linien) { const m = Math.ceil(n / 2) + (n % 2 === 0 ? 1 : 0); nv += 2 * m; ni += 6 * (m - 1); }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 2), lin = new Float32Array(nv * 4), sch = new Float32Array(nv), idx = new Uint32Array(ni);
  const starts = [];
  let v = 0, k = 0;
  for (const [lage, schicht] of lagen) {
    const reihe = lage.linien.map((l, i) => [l[2], i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    const rang = new Int32Array(lage.linien.length);
    reihe.forEach(([, i], r) => { rang[i] = r; });
    const N = lage.linien.length;
    lage.linien.forEach(([s, n, , laenge], i) => {
      const q = rang[i] / Math.max(1, N - 1);
      const start = schicht === 0 ? L0 + 0.1 + (L1 - L0) * 0.66 * q ** 0.6 : L0 + (L1 - L0) * (0.34 + 0.4 * q ** 0.85);
      const dauer = Math.min(1.4, Math.max(0.3, laenge / 800));
      starts.push(start);
      const wahl = [];
      for (let j = 0; j < n; j += 2) wahl.push(j);
      if (wahl.at(-1) !== n - 1) wahl.push(n - 1);
      const P = lage.punkte, x = (j) => P[2 * (s + j)], y = (j) => P[2 * (s + j) + 1];
      let bogen = 0;
      wahl.forEach((j, a) => {
        if (a > 0) bogen += Math.hypot(x(j) - x(wahl[a - 1]), y(j) - y(wahl[a - 1]));
        const j0 = wahl[Math.max(0, a - 1)], j1 = wahl[Math.min(wahl.length - 1, a + 1)];
        let tx = x(j1) - x(j0), ty = y(j1) - y(j0);
        const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
        for (const seite of [-1, 1]) {
          pos[v * 3] = x(j); pos[v * 3 + 1] = y(j); pos[v * 3 + 2] = seite;
          nor[v * 2] = -ty; nor[v * 2 + 1] = tx;
          lin[v * 4] = bogen; lin[v * 4 + 1] = laenge; lin[v * 4 + 2] = start; lin[v * 4 + 3] = dauer;
          sch[v] = schicht; v++;
        }
        if (a > 0) { const b = v - 4; idx.set([b, b + 1, b + 2, b + 1, b + 3, b + 2], k); k += 6; }
      });
      // die tatsächliche Bogenlänge der gewählten Punkte als Länge
      for (let u = v - 2 * wahl.length; u < v; u++) lin[u * 4 + 1] = bogen;
    });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aNormale", new THREE.BufferAttribute(nor, 2));
  geo.setAttribute("aLinie", new THREE.BufferAttribute(lin, 4));
  geo.setAttribute("aSchicht", new THREE.BufferAttribute(sch, 1));
  geo.setIndex(new THREE.BufferAttribute(idx, 1));
  return { geo, starts: Float32Array.from(starts).sort() };
}

export function stich(g, teil) {
  const { renderer, A, B, H } = g;
  const [L0, L1] = phase(teil, "linien"), [F0, F1] = phase(teil, "farbe"), D = phase(teil, "bild") ?? phase(teil, "dichte");
  const { geo, starts } = geometrie(A, L0, L1);
  const halb = (A.abstand / 2) * 1.08;
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERTEX, fragmentShader: FRAGMENT, depthTest: false, depthWrite: false, transparent: true,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
    uniforms: { tFoto: { value: g.fotoTex }, uFilm: { value: new THREE.Vector2(B, H) }, uHalb: { value: halb }, uZoom: { value: 1 }, uZeit: { value: 0 },
      uFarbe: { value: 0 }, uDicht: { value: 0 }, uSicht: { value: 1 }, uTinte: { value: new THREE.Color(0.95, 0.93, 0.88) }, uSpitze: { value: new THREE.Color(1.0, 0.5, 0.22) } },
  });
  const netz = new THREE.Mesh(geo, mat); netz.frustumCulled = false;
  const szene = new THREE.Scene(); szene.add(netz);
  const kam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const unterlage = quadMaterial(UNTERLAGE, { tFoto: { value: g.fotoTex }, uGrund: { value: 0 } });
  return {
    render(rt, tau) {
      const u = mat.uniforms;
      u.uZeit.value = tau;
      u.uFarbe.value = weich(anteil(tau, F0 - 0.4, F1));
      u.uDicht.value = inOut(anteil(tau, D[0], D[1] - 0.5));
      u.uZoom.value = 1 + 0.06 * (1 - inOut(anteil(tau, L0, F1)));
      u.uSicht.value = teil.erst ? 1 : weich(anteil(tau, 0, 0.4));
      g.loeschen(rt);
      const grund = weich(anteil(tau, D[0] + 0.3 * (D[1] - D[0]), D[1] - 0.3));
      if (grund > 0) { unterlage.uniforms.uGrund.value = grund; g.pass(unterlage, rt); }
      renderer.setRenderTarget(rt); renderer.render(szene, kam);
      const ende = weich(anteil(tau, D[1] - 0.6, D[1] - 0.1));
      return { aktiv: 1 - weich(anteil(tau, D[0], D[1])), bloom: 0.45, saum: 0.002, ende };
    },
    zaehler(tau) {
      let a = 0, b = starts.length;
      while (a < b) { const m = (a + b) >> 1; if (starts[m] <= tau) a = m + 1; else b = m; }
      const z = (x) => x.toLocaleString("de-CH");
      return `striche ${z(a)} / ${z(starts.length)} · abstand ${A.abstand.toFixed(1).replace(".", ",")} px`;
    },
    entsorgen() { geo.dispose(); mat.dispose(); unterlage.dispose(); },
  };
}
