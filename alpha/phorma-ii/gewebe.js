// PHORMA II – Gewebe: Flächen aus feinen Linien wie in einem Video von Pauric Freeman (Wunsch vom 17. Oktober 2026: «vor allem Video 2»). Aus den
// Umrissen des Texts (Linien gleicher Helligkeit des Fotos oder Videos, kurven.js; mit «Nur Ton» kleinen Schlaufen) wächst je Kurve eine zerknitterte
// Fläche wie Seide: jede ihrer Lagen ist eine feine, halb durchsichtige Linie, ein Stück weiter in der Fläche – so ist sie dicht, auch wenn sie stillsteht.
//   Die Dynamik wie im Vorbild (Rückmeldung vom 18. Oktober 2026: «die Dynamik der Animation näher beim Video»): bei jedem kräftigen Einsatz ein
//   neues Bild – andere Fläche, andere Einstellung der Kamera, andere Auswahl der Kurven, manchmal Weiss auf Schwarz, manchmal das Zeichen selbst –,
//   die Fläche klappt aus der Linie auf und steht dann fast still; die Tinte folgt dem Tor (auf beim Schlag, abklingend), dazwischen leeres Papier.
//   01 Zeichen – aus dem Dunkeln erscheint der Text, dann bleiben nur seine Umrisse; 02 Gewebe; 03 Bild – die Flächen legen sich zurück auf die
//   Umrisse, der Text (das Foto) steht wieder exakt da.
// Zustandslos: alles wird aus der Zeit gerechnet (im Vertex-Shader), die Tonkurven liegen als Textur vor und werden nur mit texelFetch gelesen.
import * as THREE from "three";
import { anteil, weich, inOut, kamera, quadMaterial } from "./gemeinsam.js?v=16";
import { phase } from "./ablauf.js?v=16";
import { gewebeKurven } from "./kurven.js?v=16";
import { weichzeichnen } from "./analyse.js?v=16";
import { FPS, BAENDER, tonOderErsatz, wert, gewebeZustaende, zustandBei } from "./ton.js?v=16";

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
  uniform sampler2D tKurven, tTon, tStoss, tSpek; uniform int uP, uH, uN, uNK, uSaetze;
  uniform float uZeit, uVon, uB1, uDichte, uWechsel[23], uAuf, uAktiv, uSeit, uAnteil, uTor, uZeichen, uNurTon; uniform vec4 uZustand;
  uniform mat3 uKamDreh; uniform vec3 uKam;
  attribute vec3 aRef;
  varying float vA;
  ${RAUSCHEN}
  vec4 lesen(sampler2D t, float zeit) { float f = clamp(zeit * ${FPS}.0, 0.0, float(uN - 1)); int i = int(floor(f)); return mix(texelFetch(t, ivec2(i, 0), 0), texelFetch(t, ivec2(min(i + 1, uN - 1), 0), 0), fract(f)); }
  float spek(float zeit, float band) {
    float f = clamp(zeit * ${FPS}.0, 0.0, float(uN - 1)); int i = int(floor(f)), k = int(clamp(band, 0.0, ${BAENDER - 1}.0));
    return mix(texelFetch(tSpek, ivec2(i, k), 0).r, texelFetch(tSpek, ivec2(min(i + 1, uN - 1), k), 0).r, fract(f));
  }
  vec3 hash3(float n) { return fract(sin(vec3(n * 12.9898, n * 78.233, n * 37.719)) * 43758.5453); }
  mat3 drehung(vec3 a, float w) { float c = cos(w), s = sin(w), t = 1.0 - c; return mat3(t*a.x*a.x + c, t*a.x*a.y + s*a.z, t*a.x*a.z - s*a.y, t*a.x*a.y - s*a.z, t*a.y*a.y + c, t*a.y*a.z + s*a.x, t*a.x*a.z + s*a.y, t*a.y*a.z - s*a.x, t*a.z*a.z + c); }
  void main() {
    int c = int(aRef.x), u = int(aRef.y); float k = aRef.z, ft = uZeit + uVon;
    vec4 T = lesen(tTon, ft), St = lesen(tStoss, ft);                      // T: Zeit der Musik, laut, tief · St: Stoss, Bass-Stoss, Höhen-Stoss, Dreh
    int satz = 0;                                                         // Video: ab jedem Wechsel die Linien eines neuen Bildes
    for (int j = 0; j < 23; j++) if (j < uSaetze - 1 && ft >= uWechsel[j]) satz = j + 1;
    int zeile = c + satz * uNK;
    vec4 k0 = texelFetch(tKurven, ivec2(u, zeile), 0);
    vec3 p0 = k0.xyz, m = texelFetch(tKurven, ivec2(uP, zeile), 0).xyz, h = hash3(float(c) + 1.0);
    vec3 pa = texelFetch(tKurven, ivec2(max(u - 1, 0), zeile), 0).xyz, pb = texelFetch(tKurven, ivec2(min(u + 1, uP - 1), zeile), 0).xyz;
    vec2 tg = pb.xy - pa.xy; vec2 nrm = length(tg) > 1e-6 ? normalize(vec2(-tg.y, tg.x)) : vec2(0.0, 1.0);
    float s = float(u) / float(uP - 1), lage = k / float(uH - 1);
    // 1 das Spektrum: die Linie zittert leicht quer zu sich
    float band = (0.5 + 0.5 * sin(6.2832 * (s * (1.0 + floor(h.x * 2.0)) + h.y))) * ${BAENDER - 1}.0;
    float sp = mix(spek(ft, floor(band)), spek(ft, floor(band) + 1.0), fract(band));
    vec3 q = p0 + uAktiv * sp * (0.012 + 0.03 * T.y) * vec3(nrm, 0.0);
    // 2 die Fläche: aus jeder Kurve wächst eine zerknitterte Fläche wie Seide – Lage k liegt ein Stück weiter in ihr; nach jedem neuen Zustand
    //   klappt sie in 0,35 s auf, dann bewegt sie sich kaum (Video von Pauric Freeman); jeder Schlag lässt sie aufblähen
    float auf = smoothstep(0.0, 0.35, uSeit), sk = lage * auf;
    vec3 keim = vec3(uZustand.xy, 0.0) + h * 3.0, ph = vec3(0.0, 0.0, uSeit * 0.1 + T.x * 0.04);
    vec3 w1 = vec3(snoise(vec3(p0.xy * 1.0, sk * 2.0) + keim + ph), snoise(vec3(p0.xy * 1.0, sk * 2.0) + keim + vec3(17.0, 3.0, 0.0) + ph), snoise(vec3(p0.xy * 1.0, sk * 2.0) + keim + vec3(31.0, 7.0, 0.0) + ph));
    vec3 w2 = vec3(snoise(vec3(p0.xy * 2.2, sk * 4.5) + keim * 1.3 + ph * 1.5), snoise(vec3(p0.xy * 2.2, sk * 4.5) + keim * 1.3 + vec3(5.0, 11.0, 0.0) + ph * 1.5), snoise(vec3(p0.xy * 2.2, sk * 4.5) + keim * 1.3 + vec3(9.0, 2.0, 0.0) + ph * 1.5));
    float breite = uZustand.z * (0.75 + 0.35 * T.y + 0.5 * St.x);
    q += uAktiv * sk * breite * (w1 + 0.35 * w2);
    q = drehung(normalize(vec3(h.x - 0.5, h.y - 0.5, 0.7)), uAktiv * sk * uZustand.w) * (q - m) + m;   // Drall um die Mitte der Kurve
    // 3 Kamera: je Zustand eine Einstellung (nah oder weit, geneigt, gerollt), darin langsam näher, mit dem Schlag ein kleiner Ruck
    q = uKamDreh * q; q.xy = q.xy * uKam.x + uKam.yz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 1.0);
    float sicht = smoothstep(uAuf - 0.6, uAuf, uZeit) * (1.0 - smoothstep(uB1 - 1.2, uB1 - 0.5, uZeit));   // erst wenn sich das Zeichen löst; am Schluss weg
    float gewaehlt = mix(1.0, step(fract(sin(float(c) * 7.31 + uZustand.x) * 4375.85), uAnteil), uAktiv);   // je Zustand nur ein Teil der Kurven
    float dichte = mix(1.0 / 6.0, 0.5 + 0.5 * (1.0 - lage), uAktiv);  // zusammengelegt (Zeichen, Bild) liegen alle Lagen aufeinander
    // nur Ton: es gibt kein Bild, auf das sich die Linien zurücklegen – sie gehen mit dem Gewebe (Rückmeldung: «einzig die Form, die am Schluss
    // gezeigt wird, stört»: das ruhende Knäuel der Schlaufen)
    sicht *= mix(1.0, uAktiv * uAktiv, uNurTon);
    vA = k0.w * uDichte * dichte * sicht * gewaehlt * uTor * (1.0 - uZeichen) * (k <= float(uH - 1) * auf + 0.5 ? 1.0 : 0.0);
  }`;
const FRAGMENT = /* glsl */ `uniform vec3 uTinte; varying float vA; void main() { gl_FragColor = vec4(uTinte * vA, vA); }`;
const GRUND = /* glsl */ `
  uniform sampler2D tFoto; uniform vec3 uPapier; uniform float uFoto, uSicht; varying vec2 vUv;
  void main() { gl_FragColor = vec4(mix(uPapier, texture2D(tFoto, vUv).rgb, uFoto) * uSicht, 1.0); }`;

/** die Tonkurven als Texturen: je Filmbild (Zeit der Musik, laut, tief, Schnitt), (Stoss, Bass-Stoss, Höhen-Stoss, Dreh) und das Spektrum */
function tonTextur(T) {
  const n = Math.min(T.n, 4000), d = new Float32Array(n * 4), d2 = new Float32Array(n * 4), sp = new Float32Array(n * BAENDER);
  const schnitt = new Uint8Array(n);
  for (const s of T.schnitte) for (let b = Math.round(s * FPS); b < Math.min(n, Math.round(s * FPS) + 4); b++) schnitt[b] = 1;
  for (let b = 0; b < n; b++) {
    d[b * 4] = T.energie[b]; d[b * 4 + 1] = T.laut[b]; d[b * 4 + 2] = T.tief[b]; d[b * 4 + 3] = schnitt[b];
    d2[b * 4] = T.stoss[b]; d2[b * 4 + 1] = T.stossTief[b]; d2[b * 4 + 2] = T.stossHoch[b]; d2[b * 4 + 3] = T.dreh[b];
    for (let k = 0; k < BAENDER; k++) sp[k * n + b] = T.spektrum ? T.spektrum[b * BAENDER + k] : 0;
  }
  const tex = (daten, w, h, format) => { const t = new THREE.DataTexture(daten, w, h, format, THREE.FloatType); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; };
  return { t: tex(d, n, 1, THREE.RGBAFormat), t2: tex(d2, n, 1, THREE.RGBAFormat), sp: tex(sp, n, BAENDER, THREE.RedFormat), n, schnitt };
}

const VOR = 0.4;

/** Tonumfang auf 0..1 strecken (2 % – 98 %): in dunklen Bildern mit feinen hellen Linien (ein Video auf Schwarz) lägen sonst kaum Höhenlinien */
function gestreckt(f) {
  const s = Float32Array.from(f).sort(), lo = s[Math.floor(s.length * 0.02)], hi = s[Math.floor(s.length * 0.98)], d = Math.max(0.05, hi - lo);
  return f.map((v) => Math.min(1, Math.max(0, (v - lo) / d)));
}

export function gewebe(g, teil) {
  const { renderer, A, B, H } = g, a = B / H;
  const Z = phase(teil, "zeichen"), G = phase(teil, "gewebe"), Bp = phase(teil, "bild");
  const NK = g.test ? 10 : g.grob ? 20 : 28, P = g.test ? 40 : g.grob ? 64 : 80, NH = g.test ? 24 : g.grob ? 56 : 90;
  // Kurven: beim Text die Umrisse der Buchstaben, beim Foto Linien gleicher Helligkeit (geglättet, auf drei Stufen); beim Video je Satz die eines
  // Bildes aus dem Video – der erste Satz aus dem Standbild, die weiteren ab den Schnitten (g.saetze: [{ t (Filmzeit), hell }])
  const linienAus = (hell, text) => {
    const feld = text ? hell.map((v) => 1 - v) : gestreckt(weichzeichnen(hell, A.w, A.h, 2.5));
    let k = gewebeKurven(feld, A.w, A.h, { stufen: text ? [0.5] : [0.32, 0.5, 0.68], anzahl: NK, punkte: P, maxLaenge: text ? 0.32 : 0.4 });
    if (!k.length) k = [Float32Array.from({ length: P * 2 }, (_, i) => (i % 2 ? A.h / 2 : (A.w * (i / 2)) / P))];   // ein leeres Bild: eine Linie
    // geglättet: die Ecken der Serifen und Pixelstufen würden sonst zu Splittern; die Bänder sollen weich fliessen
    for (const c of k) for (let d = 0; d < 4; d++) {
      const v = c.slice();
      for (let u = 1; u < P - 1; u++) for (let j = 0; j < 2; j++) c[2 * u + j] = 0.25 * v[2 * (u - 1) + j] + 0.5 * v[2 * u + j] + 0.25 * v[2 * (u + 1) + j];
    }
    return k;
  };
  // nur Ton: kleine, lose Schlaufen und kurze Bögen um die Mitte – aus ihnen wachsen die Flächen; je Zustand ist nur ein Teil davon zu sehen
  const tonLinien = () => Array.from({ length: Math.min(NK, 10) }, (_, c) => {
    const k = new Float32Array(P * 2), h = (n) => { const x = Math.sin((c + 1) * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
    const cx = (h(1) - 0.5) * 0.45, cy = (h(2) - 0.5) * 0.45, r = 0.07 + 0.16 * h(3), dreh = h(4) * 6.283, bogen = c % 2 ? 0.5 + 0.9 * h(5) : 1;
    for (let u = 0; u < P; u++) {
      const w = dreh + (u / (P - 1)) * 2 * Math.PI * bogen, rr = r * (1 + 0.25 * Math.sin(w * 2 + h(6) * 6));
      const x = cx + rr * Math.cos(w) * (1 + h(8)), y = cy + rr * Math.sin(w);
      k[2 * u] = ((x / a + 1) / 2) * A.w - 0.5; k[2 * u + 1] = ((1 - y) / 2) * A.h - 0.5;
    }
    return k;
  });
  const saetze = [g.quelle === "ton" ? tonLinien() : linienAus(A.hell, g.quelle === "text"), ...(g.saetze ?? []).slice(0, 23).map((z) => linienAus(z.hell, false))];
  const wechsel = (g.saetze ?? []).slice(0, 23).map((z) => z.t);
  const nk = Math.max(...saetze.map((k) => k.length)), kd = new Float32Array((P + 1) * nk * saetze.length * 4);
  saetze.forEach((kurven, j) => kurven.forEach((k, c) => {
    const zeile = j * nk + c;
    let mx = 0, my = 0;
    for (let u = 0; u < P; u++) {
      const x = ((k[2 * u] + 0.5) / A.w * 2 - 1) * a, y = 1 - ((k[2 * u + 1] + 0.5) / A.h) * 2, i = (zeile * (P + 1) + u) * 4;
      kd[i] = x; kd[i + 1] = y; kd[i + 3] = 1; mx += x / P; my += y / P;
    }
    const i = (zeile * (P + 1) + P) * 4; kd[i] = mx; kd[i + 1] = my; kd[i + 3] = 1;      // w = 0: in diesem Satz keine Kurve
  }));
  const kurvenTex = new THREE.DataTexture(kd, P + 1, nk * saetze.length, THREE.RGBAFormat, THREE.FloatType);
  kurvenTex.minFilter = kurvenTex.magFilter = THREE.NearestFilter; kurvenTex.needsUpdate = true;
  const T = tonOderErsatz(g.ton), TT = tonTextur(T);

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
    uniforms: { tKurven: { value: kurvenTex }, tTon: { value: TT.t }, tStoss: { value: TT.t2 }, tSpek: { value: TT.sp }, uKamDreh: { value: new THREE.Matrix3() }, uKam: { value: new THREE.Vector3(1, 0, 0) },
      uAuf: { value: g.quelle === "ton" ? 0.9 : Z[1] - 0.5 }, uP: { value: P }, uNK: { value: nk }, uSaetze: { value: saetze.length }, uWechsel: { value: Array.from({ length: 23 }, (_, j) => wechsel[j] ?? 1e9) },
      uH: { value: NH }, uN: { value: TT.n }, uZeit: { value: 0 }, uVon: { value: VOR }, uB1: { value: Bp[1] }, uDichte: { value: 0.4 },
      uNurTon: { value: g.quelle === "ton" ? 1 : 0 }, uAktiv: { value: 0 }, uSeit: { value: 0 }, uAnteil: { value: 1 }, uTor: { value: 1 }, uZeichen: { value: 0 }, uZustand: { value: new THREE.Vector4(0, 0, 0.4, 0) },
      uTinte: { value: new THREE.Color(0.02, 0.02, 0.025) } },
  });
  const linien = new THREE.LineSegments(geo, mat); linien.frustumCulled = false;
  const szene = new THREE.Scene(); szene.add(linien);
  const kam = kamera(B, H);
  const PAPIER = new THREE.Color("#f3f1ec"), NACHT = new THREE.Color(0.012, 0.012, 0.014);
  const grund = quadMaterial(GRUND, { tFoto: { value: g.fotoTex }, uPapier: { value: PAPIER.clone() }, uFoto: { value: 1 }, uSicht: { value: 0 } });

  // Zustände (Rückmeldung vom 18. Oktober 2026: «die Dynamik der Animation näher beim Video, das ich dir als Beispiel gegeben hab»): bei jedem
  // kräftigen Einsatz ein neues Bild – andere Fläche, andere Einstellung der Kamera, andere Auswahl der Kurven –, manchmal Weiss auf Schwarz, mit Text
  // oder Foto manchmal das Zeichen selbst. Die Tinte folgt dem Tor (auf beim Schlag, abklingend), dazwischen bleibt das Papier fast leer.
  const ZS = gewebeZustaende(T, G[0] + VOR, G[1] + VOR), mitBild = g.quelle !== "ton";
  const zufall = (j, n) => { const x = Math.sin(j * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
  const drehM = new THREE.Matrix4(), e3 = new THREE.Euler(), m3 = new THREE.Matrix3();

  return {
    render(rt, tau) {
      // die Tonspur beginnt mit dem Film, der Effekt nach dem Vorlauf (zeitachse: 0,4 s; mit Tonspur ohne Tempo)
      const u = mat.uniforms, film = tau + VOR, zs = zustandBei(ZS, film, G[0] + VOR), j = zs.nr;
      const aktiv = weich(anteil(tau, Z[1] - 0.4, Z[1] + 0.5)) * (1 - weich(anteil(tau, Bp[0] - 0.2, Bp[0] + 0.8)));
      const seit = j ? film - zs.t0 : Math.max(0, tau - (Z[1] - 0.4));
      const tor = wert(T.tor, film), nacht = zs.nacht && aktiv > 0.5, zeichen = zs.zeichen && mitBild && aktiv > 0.5;
      u.uZeit.value = tau; u.uAktiv.value = aktiv; u.uSeit.value = seit; u.uTor.value = 1 + aktiv * (tor - 1); u.uZeichen.value = zeichen ? 1 : 0;
      u.uZustand.value.set(zufall(j, 1) * 50, zufall(j, 2) * 50, 0.42 + 0.38 * zufall(j, 3), (zufall(j, 4) - 0.5) * 3);
      u.uAnteil.value = j ? (g.quelle === "ton" ? 0.12 + 0.3 * zufall(j, 5) : g.quelle === "text" ? 0.5 + 0.4 * zufall(j, 5) : 0.25 + 0.4 * zufall(j, 5)) : g.quelle === "ton" ? 0.3 : 1;
      // Kamera je Zustand; zum Zeichen und zum Bild hin gerade
      const nah = j ? [1.25, 1.5, 1.9, 2.4, 1.05, 1.7][Math.floor(zufall(j, 6) * 6)] : 1;
      const zoom = 1 + aktiv * (nah * (1 + 0.03 * Math.min(6, seit)) * (1 + 0.08 * wert(T.stoss, film)) - 1);
      e3.set(aktiv * (zufall(j, 7) - 0.5) * (j ? 1.1 : 0.2), aktiv * (zufall(j, 8) - 0.5) * (j ? 1.1 : 0.2), aktiv * (zufall(j, 9) - 0.5) * (j ? 1.4 : 0.1));
      m3.setFromMatrix4(drehM.makeRotationFromEuler(e3)); u.uKamDreh.value.copy(m3);
      u.uKam.value.set(zoom, aktiv * (zufall(j, 10) - 0.5) * 0.6 * (nah - 0.5), aktiv * (zufall(j, 11) - 0.5) * 0.6 * (nah - 0.5));
      u.uTinte.value.setRGB(...(nacht ? [0.95, 0.95, 0.93] : [0.02, 0.02, 0.025]));
      u.uDichte.value = (g.test ? 1.5 : g.grob ? 1.2 : 1) * (nacht ? 0.16 : 0.4);
      grund.uniforms.uPapier.value.copy(nacht ? NACHT : PAPIER);
      grund.uniforms.uSicht.value = teil.erst ? weich(anteil(tau, 0, 0.7)) : 1;
      grund.uniforms.uFoto.value = (zeichen ? tor : 0) + 1 - inOut(anteil(tau, Z[1] - 1.0, Z[1] + 0.4)) + inOut(anteil(tau, Bp[1] - 1.3, Bp[1] - 0.3));
      g.pass(grund, rt);
      renderer.setRenderTarget(rt); renderer.render(szene, kam);
      const ende = weich(anteil(tau, Bp[1] - 0.6, Bp[1] - 0.1));
      return { aktiv: 0.35 * (1 - weich(anteil(tau, Bp[0], Bp[1]))), bloom: 0, saum: nacht ? 0 : 0.0008, ende };
    },
    vorab: { szenen: [[szene, kam]], materialien: [grund] },
    zaehler(tau) {
      const film = tau + VOR, n = T.einsaetze.filter((e) => e.t <= film).length;
      return `zustand ${zustandBei(ZS, film, G[0] + VOR).nr} / ${ZS.length} · bänder ${nk} · ${saetze.length > 1 ? `bild ${1 + wechsel.filter((w) => w <= film).length} / ${saetze.length} · ` : ""}${T.echt ? `einsatz ${n} / ${T.einsaetze.length}` : "ohne ton"}`;
    },
    entsorgen() { geo.dispose(); mat.dispose(); grund.dispose(); kurvenTex.dispose(); TT.t.dispose(); TT.t2.dispose(); TT.sp.dispose(); },
  };
}
