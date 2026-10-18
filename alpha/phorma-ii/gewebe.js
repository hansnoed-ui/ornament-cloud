// PHORMA II – Gewebe: Bänder aus feinen Linien wie in einem Video von Pauric Freeman (Wunsch vom 17. Oktober 2026: «vor allem Video 2»). Die
// Umrisse des Texts (oder Linien gleicher Helligkeit des Fotos, kurven.js) werden im Raum bewegt – gedreht, gewellt, getrieben –, und jede Kurve
// zeichnet ihre letzten Lagen als feine, halb durchsichtige Linien: so entstehen Flächen wie Rauch oder Seide, schwarz auf Weiss.
//   Der Ton (ton.js) bewegt sie: die Zeit der Musik treibt Drehung und Rauschen (laut: schnell, still: langsam), die Bässe öffnen die Bänder,
//   bei starken Einsätzen ein Schnitt – die Lage springt, für einige Bilder Weiss auf Schwarz.
//   01 Zeichen – aus dem Dunkeln erscheint der Text, dann bleiben nur seine Umrisse; 02 Gewebe; 03 Bild – die Bänder legen sich zurück auf die
//   Umrisse, der Text (das Foto) steht wieder exakt da.
// Zustandslos: jede Lage wird aus ihrer eigenen Zeit gerechnet (im Vertex-Shader), die Tonkurven liegen als Textur vor und werden nur mit texelFetch
// gelesen.
import * as THREE from "three";
import { anteil, weich, inOut, kamera, quadMaterial } from "./gemeinsam.js?v=10";
import { phase } from "./ablauf.js?v=10";
import { gewebeKurven } from "./kurven.js?v=10";
import { weichzeichnen } from "./analyse.js?v=10";
import { FPS, ersatz } from "./ton.js?v=10";

// Simplex-Rauschen in 3D (Ashima Arts / Stefan Gustavson, MIT)
const RAUSCHEN = /* glsl */ `
  vec4 _p(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0); const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy)), x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz), l = 1.0 - g, i1 = min(g.xyz, l.zxy), i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx, x2 = x0 - i2 + C.yyy, x3 = x0 - D.yyy;
    i = mod(i, 289.0);
    vec4 p = _p(_p(_p(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    vec3 ns = 0.142857142857 * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z), x_ = floor(j * ns.z), y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy, y = y_ * ns.x + ns.yyyy, h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy), b1 = vec4(x.zw, y.zw), s0 = floor(b0) * 2.0 + 1.0, s1 = floor(b1) * 2.0 + 1.0, sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy, a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x), p1 = vec3(a0.zw, h.y), p2 = vec3(a1.xy, h.z), p3 = vec3(a1.zw, h.w);
    vec4 nr = 1.79284291400159 - 0.85373472095314 * vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3));
    p0 *= nr.x; p1 *= nr.y; p2 *= nr.z; p3 *= nr.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0); m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
  }`;
const VERTEX = /* glsl */ `
  uniform sampler2D tKurven, tTon; uniform int uP, uH, uN; uniform float uZeit, uAbstand, uVon, uZ1, uB0, uB1, uDichte;
  attribute vec3 aRef;
  varying float vA;
  ${RAUSCHEN}
  vec4 ton(float t) { float f = clamp(t * ${FPS}.0, 0.0, float(uN - 1)); int i = int(floor(f)); vec4 a = texelFetch(tTon, ivec2(i, 0), 0), b = texelFetch(tTon, ivec2(min(i + 1, uN - 1), 0), 0); return mix(a, b, fract(f)); }
  vec3 hash3(float n) { return fract(sin(vec3(n * 12.9898, n * 78.233, n * 37.719)) * 43758.5453); }
  mat3 drehung(vec3 a, float w) { float c = cos(w), s = sin(w), t = 1.0 - c; return mat3(t*a.x*a.x + c, t*a.x*a.y + s*a.z, t*a.x*a.z - s*a.y, t*a.x*a.y - s*a.z, t*a.y*a.y + c, t*a.y*a.z + s*a.x, t*a.x*a.z + s*a.y, t*a.y*a.z - s*a.x, t*a.z*a.z + c); }
  void main() {
    int c = int(aRef.x), u = int(aRef.y); float k = aRef.z;
    float tk = max(0.0, uZeit - k * uAbstand);
    vec4 T = ton(tk + uVon);                                              // x: Zeit der Musik, y: laut, z: tief
    float huelle = smoothstep(uZ1 - 1.0, uZ1 + 1.2, tk) * (1.0 - smoothstep(uB0 - 0.2, uB1 - 0.7, tk));
    float A = huelle * (0.55 + 0.45 * T.y + 0.4 * T.z), E = T.x;
    vec3 p0 = texelFetch(tKurven, ivec2(u, c), 0).xyz, m = texelFetch(tKurven, ivec2(uP, c), 0).xyz, h = hash3(float(c) + 1.0);
    vec3 achse = normalize(vec3(h.x - 0.5, h.y - 0.5, (h.z - 0.5) * 0.7) + vec3(0.0, 0.0, 0.001));
    // jede Kurve dreht sich ein wenig für sich, das Ganze aber als eine Wolke: eine gemeinsame Drehung und ein gemeinsames Rauschfeld
    float w = A * (0.5 + 0.9 * h.x) * sin(E * (0.45 + 0.6 * h.y) + h.z * 6.2832);
    vec3 q = drehung(achse, w) * (p0 - m) * (1.0 + 0.3 * A * sin(E * 0.7 + h.x * 9.0)) + m;
    vec3 ga = normalize(vec3(sin(E * 0.13), cos(E * 0.17), 0.6 * sin(E * 0.11 + 1.0)) + vec3(0.0, 0.0, 0.001));
    q = drehung(ga, A * 1.1 * sin(E * 0.29)) * q;
    q += A * 0.34 * vec3(snoise(q * 1.2 + vec3(0.0, 0.0, E * 0.33)), snoise(q * 1.2 + vec3(31.0, 0.0, E * 0.33)), 1.6 * snoise(q * 1.0 + vec3(0.0, 17.0, E * 0.28)));
    q.xy += A * 0.12 * vec2(sin(E * 0.23 + h.y * 6.2832), cos(E * 0.19 + h.z * 6.2832));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 1.0);
    vA = uDichte * pow(1.0 - k / float(uH), 1.3) * smoothstep(uZ1 - 1.1, uZ1 - 0.5, uZeit);   // erst wenn sich das Zeichen löst
  }`;
const FRAGMENT = /* glsl */ `uniform vec3 uTinte; varying float vA; void main() { gl_FragColor = vec4(uTinte * vA, vA); }`;
const GRUND = /* glsl */ `
  uniform sampler2D tFoto; uniform vec3 uPapier; uniform float uFoto, uSicht; varying vec2 vUv;
  void main() { gl_FragColor = vec4(mix(uPapier, texture2D(tFoto, vUv).rgb, uFoto) * uSicht, 1.0); }`;

/** die Tonkurven als Textur (je Filmbild: Zeit der Musik, laut, tief, Schnitt) */
function tonTextur(T) {
  const n = Math.min(T.n, 4000), d = new Float32Array(n * 4);
  const schnitt = new Uint8Array(n);
  for (const s of T.schnitte) for (let b = Math.round(s * FPS); b < Math.min(n, Math.round(s * FPS) + 4); b++) schnitt[b] = 1;
  for (let b = 0; b < n; b++) { d[b * 4] = T.energie[b]; d[b * 4 + 1] = T.laut[b]; d[b * 4 + 2] = T.tief[b]; d[b * 4 + 3] = schnitt[b]; }
  const t = new THREE.DataTexture(d, n, 1, THREE.RGBAFormat, THREE.FloatType);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
  return { t, n, schnitt };
}

const VOR = 0.4;

export function gewebe(g, teil) {
  const { renderer, A, B, H } = g, a = B / H;
  const Z = phase(teil, "zeichen"), G = phase(teil, "gewebe"), Bp = phase(teil, "bild");
  const NK = g.test ? 10 : g.grob ? 20 : 28, P = g.test ? 40 : g.grob ? 64 : 80, NH = g.test ? 24 : g.grob ? 56 : 90;
  // Kurven: beim Text die Umrisse der Buchstaben, beim Foto Linien gleicher Helligkeit (geglättet, auf drei Stufen)
  const feld = g.quelle === "text" ? A.hell.map((v) => 1 - v) : weichzeichnen(A.hell, A.w, A.h, 2.5);
  let kurven = gewebeKurven(feld, A.w, A.h, { stufen: g.quelle === "text" ? [0.5] : [0.32, 0.5, 0.68], anzahl: NK, punkte: P, maxLaenge: g.quelle === "text" ? 0.32 : 0.4 });
  if (!kurven.length) kurven = [Float32Array.from({ length: P * 2 }, (_, i) => (i % 2 ? A.h / 2 : (A.w * (i / 2)) / P))];   // ein leeres Bild: eine Linie
  // geglättet: die Ecken der Serifen und Pixelstufen würden sonst zu Splittern; die Bänder sollen weich fliessen
  for (const k of kurven) for (let d = 0; d < 4; d++) {
    const v = k.slice();
    for (let u = 1; u < P - 1; u++) for (let j = 0; j < 2; j++) k[2 * u + j] = 0.25 * v[2 * (u - 1) + j] + 0.5 * v[2 * u + j] + 0.25 * v[2 * (u + 1) + j];
  }
  const nk = kurven.length, kd = new Float32Array((P + 1) * nk * 4);
  kurven.forEach((k, c) => {
    let mx = 0, my = 0;
    for (let u = 0; u < P; u++) {
      const x = ((k[2 * u] + 0.5) / A.w * 2 - 1) * a, y = 1 - ((k[2 * u + 1] + 0.5) / A.h) * 2, i = (c * (P + 1) + u) * 4;
      kd[i] = x; kd[i + 1] = y; kd[i + 3] = 1; mx += x / P; my += y / P;
    }
    const i = (c * (P + 1) + P) * 4; kd[i] = mx; kd[i + 1] = my; kd[i + 3] = 1;
  });
  const kurvenTex = new THREE.DataTexture(kd, P + 1, nk, THREE.RGBAFormat, THREE.FloatType);
  kurvenTex.minFilter = kurvenTex.magFilter = THREE.NearestFilter; kurvenTex.needsUpdate = true;
  const T = g.ton ?? ersatz((g.ablaufDauer ?? 20) + 1), TT = tonTextur(T);

  // Linien: je Kurve NH Lagen, je Lage P − 1 Stücke
  const ref = new Float32Array(nk * NH * (P - 1) * 2 * 3);
  let r = 0;
  for (let c = 0; c < nk; c++) for (let k = 0; k < NH; k++) for (let u = 0; u < P - 1; u++) { ref.set([c, u, k, c, u + 1, k], r); r += 6; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(ref.length), 3));
  geo.setAttribute("aRef", new THREE.BufferAttribute(ref, 3));
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERTEX, fragmentShader: FRAGMENT, depthTest: false, depthWrite: false, transparent: true,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation,
    uniforms: { tKurven: { value: kurvenTex }, tTon: { value: TT.t }, uP: { value: P }, uH: { value: NH }, uN: { value: TT.n }, uZeit: { value: 0 }, uAbstand: { value: 1 / 45 },
      uVon: { value: 0 }, uZ1: { value: Z[1] }, uB0: { value: Bp[0] }, uB1: { value: Bp[1] }, uDichte: { value: g.test ? 0.4 : g.grob ? 0.26 : 0.2 }, uTinte: { value: new THREE.Color(0.02, 0.02, 0.025) } },
  });
  const linien = new THREE.LineSegments(geo, mat); linien.frustumCulled = false;
  const szene = new THREE.Scene(); szene.add(linien);
  const kam = kamera(B, H);
  const PAPIER = new THREE.Color("#f3f1ec"), NACHT = new THREE.Color(0.012, 0.012, 0.014);
  const grund = quadMaterial(GRUND, { tFoto: { value: g.fotoTex }, uPapier: { value: PAPIER.clone() }, uFoto: { value: 1 }, uSicht: { value: 0 } });

  return {
    render(rt, tau) {
      // die Tonspur beginnt mit dem Film, der Effekt nach dem Vorlauf (zeitachse: 0,4 s; mit Tonspur ohne Tempo)
      const u = mat.uniforms, film = tau + VOR;
      u.uZeit.value = tau; u.uVon.value = VOR;
      // Schnitt: für einige Bilder Weiss auf Schwarz
      const b = Math.round(film * FPS), schnitt = b >= 0 && b < TT.n && TT.schnitt[b] && tau > Z[1] && tau < Bp[0];
      u.uTinte.value.setRGB(...(schnitt ? [0.95, 0.95, 0.93] : [0.02, 0.02, 0.025]));
      grund.uniforms.uPapier.value.copy(schnitt ? NACHT : PAPIER);
      grund.uniforms.uSicht.value = teil.erst ? weich(anteil(tau, 0, 0.7)) : 1;
      grund.uniforms.uFoto.value = schnitt ? 0 : 1 - inOut(anteil(tau, Z[1] - 1.0, Z[1] + 0.4)) + inOut(anteil(tau, Bp[1] - 1.3, Bp[1] - 0.3));
      g.pass(grund, rt);
      renderer.setRenderTarget(rt); renderer.render(szene, kam);
      const ende = weich(anteil(tau, Bp[1] - 0.6, Bp[1] - 0.1));
      return { aktiv: 0.35 * (1 - weich(anteil(tau, Bp[0], Bp[1]))), bloom: 0, saum: schnitt ? 0 : 0.0008, ende };
    },
    vorab: { szenen: [[szene, kam]], materialien: [grund] },
    zaehler(tau) {
      const film = tau + VOR, n = T.einsaetze.filter((e) => e.t <= film).length;
      return `bänder ${nk} · lagen ${NH} · ${T.echt ? `einsatz ${n} / ${T.einsaetze.length}` : "ohne ton"}`;
    },
    entsorgen() { geo.dispose(); mat.dispose(); grund.dispose(); kurvenTex.dispose(); TT.t.dispose(); },
  };
}
