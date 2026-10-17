// Rezept 5 – Glaskörper vor dem Foto, ganz im Fragment-Shader: ein konvexes Polyeder ist der Schnitt von «Platten» |n·p| ≤ r. Ein- und
// Austritt eines Strahls sind dann exakt (keine Raymarching-Schritte), auch die Brechung beim Austritt. Je Farbkanal eine eigene Brechzahl
// → Spektralsäume. Die Radien der Dodekaeder- und Ikosaeder-Platten verschieben = Dodekaeder → Ikosidodekaeder («Geode») → Ikosaeder.
// Kanten als feine helle Linien, vorn kräftig, hinten durchscheinend. 2 × 2 Abtastungen je Pixel gegen Treppen.
import * as THREE from "three";
import { starte, filmlook, anteil, inOut, weich } from "./gemeinsam.js";

const DAUER = 10;
const PHI = (1 + Math.sqrt(5)) / 2;
// 6 Dodekaeder-Normalen, dann 10 Ikosaeder-Normalen (je eine pro Plattenpaar ±n)
const NORMALEN = [
  [0, PHI, 1], [0, -PHI, 1], [1, 0, PHI], [-1, 0, PHI], [PHI, 1, 0], [-PHI, 1, 0],
  [1, 1, 1], [-1, 1, 1], [1, -1, 1], [1, 1, -1], [0, 1, PHI + 1], [0, -1, PHI + 1], [PHI + 1, 0, 1], [-PHI - 1, 0, 1], [1, PHI + 1, 0], [-1, PHI + 1, 0],
].map((v) => new THREE.Vector3(...v).normalize());

starte("glas", ({ renderer, foto, B, H }) => {
  const K = 3;                                                             // Körper: ein grosser, zwei Trabanten
  const u = {
    uFoto: { value: foto.textur }, uSeiten: { value: B / H }, uPixel: { value: new THREE.Vector2(1 / B, 1 / H) },
    uN: { value: NORMALEN }, uDreh: { value: Array.from({ length: K }, () => new THREE.Matrix3()) },
    uMitte: { value: Array.from({ length: K }, () => new THREE.Vector3()) }, uGroesse: { value: new Array(K).fill(0) },
    uRadien: { value: Array.from({ length: K }, () => new THREE.Vector2(1, 1.3)) },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u,
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      #define K ${K}
      uniform sampler2D uFoto; uniform float uSeiten; uniform vec2 uPixel; uniform vec3 uN[16];
      uniform mat3 uDreh[K]; uniform vec3 uMitte[K]; uniform float uGroesse[K]; uniform vec2 uRadien[K];
      varying vec2 vUv;
      const float TANH = 0.3152988;            // tan(17,5°): Bildwinkel 35°
      const float KZ = 3.2, EBENE = -1.0;      // Kamera bei z = 3,2; das Foto liegt als Ebene bei z = −1 und füllt genau das Bild

      // Strahl o + s·d gegen den Körper (lokal, Inkreisradius ≈ 1): Eintritt s0 mit Aussennormale n0, Austritt s1 mit n1
      bool schneide(vec3 o, vec3 d, vec2 rad, out float s0, out float s1, out vec3 n0, out vec3 n1) {
        s0 = -1e9; s1 = 1e9; n0 = vec3(0.0); n1 = vec3(0.0);
        for (int i = 0; i < 16; i++) {
          float r = i < 6 ? rad.x : rad.y;
          vec3 n = uN[i]; float dn = dot(d, n), on = dot(o, n);
          if (abs(dn) < 1e-6) { if (abs(on) > r) return false; continue; }
          float a = (-r - on) / dn, b = (r - on) / dn; vec3 na = -n, nb = n;
          if (a > b) { float t = a; a = b; b = t; vec3 tn = na; na = nb; nb = tn; }
          if (a > s0) { s0 = a; n0 = na; }
          if (b < s1) { s1 = b; n1 = nb; }
        }
        return s0 < s1 && s1 > 0.0;
      }
      // wie nah liegt p an einer Kante? (Abstand der zweitnächsten Fläche)
      float kante(vec3 p, vec2 rad, float breite) {
        float a = -1e9, b = -1e9;
        for (int i = 0; i < 16; i++) {
          float v = abs(dot(p, uN[i])) - (i < 6 ? rad.x : rad.y);
          if (v > a) { b = a; a = v; } else if (v > b) b = v;
        }
        return 1.0 - smoothstep(0.0, breite, a - b);
      }
      vec2 aufFoto(vec3 o, vec3 d) {                                        // wo trifft ein Strahl das Foto?
        d.z = min(d.z, -0.05);
        vec3 p = o + d * ((EBENE - o.z) / d.z);
        float hh = (KZ - EBENE) * TANH;
        return vec2(p.x / (hh * uSeiten), p.y / hh) * 0.5 + 0.5;
      }
      vec3 bildpunkt(vec2 uv) {
        vec2 q = uv * 2.0 - 1.0;
        vec3 ro = vec3(0.0, 0.0, KZ), rd = normalize(vec3(q.x * TANH * uSeiten, q.y * TANH, -1.0));
        float best = 1e9; int k = -1; vec3 lo, ld, n0, n1; float s0, s1;
        for (int j = 0; j < K; j++) {
          if (uGroesse[j] < 1e-3) continue;
          mat3 inv = transpose(uDreh[j]);
          vec3 o = inv * (ro - uMitte[j]) / uGroesse[j], d = inv * rd;
          float a, b; vec3 m0, m1;
          if (schneide(o, d, uRadien[j], a, b, m0, m1) && a > 0.0 && a * uGroesse[j] < best) { best = a * uGroesse[j]; k = j; lo = o; ld = d; s0 = a; s1 = b; n0 = m0; n1 = m1; }
        }
        if (k < 0) return texture2D(uFoto, uv).rgb;                         // daneben: das Foto, unverändert
        mat3 R = uDreh[k]; vec2 rad = uRadien[k]; float g = uGroesse[k]; vec3 M = uMitte[k];
        vec3 e = lo + ld * s0;
        vec3 farbe;
        float dicke = 0.0;
        for (int c = 0; c < 3; c++) {                                       // je Kanal eine Brechzahl: Rot bricht schwächer als Blau
          float ior = 1.46 + 0.045 * float(c);
          vec3 d1 = refract(ld, n0, 1.0 / ior);
          float a, b; vec3 m0, m1;
          schneide(e + d1 * 1e-4, d1, rad, a, b, m0, m1);
          vec3 x = e + d1 * b;
          vec3 d2 = refract(d1, -m1, ior);
          if (dot(d2, d2) < 1e-6) d2 = reflect(d1, -m1);                    // Totalreflexion
          farbe[c] = texture2D(uFoto, aufFoto(R * x * g + M, R * d2))[c];
          if (c == 1) dicke = b;
        }
        farbe *= mix(vec3(1.0), vec3(0.86, 0.92, 1.0), clamp(dicke * 0.35, 0.0, 1.0));   // leichte Tönung je nach Weg im Glas
        vec3 rw = R * reflect(ld, n0);
        float F = 0.04 + 0.96 * pow(1.0 - max(dot(-ld, n0), 0.0), 5.0);    // Fresnel (Schlick)
        vec3 umgebung = mix(vec3(0.015, 0.012, 0.02), vec3(0.55, 0.6, 0.72), smoothstep(-0.3, 0.9, rw.y));
        vec3 glanz = vec3(1.0, 0.95, 0.88) * pow(max(dot(rw, normalize(vec3(0.6, 0.8, 0.5))), 0.0), 220.0) * 5.0
                   + vec3(1.0, 0.55, 0.25) * pow(max(dot(rw, normalize(vec3(-0.7, -0.2, 0.6))), 0.0), 90.0) * 1.5;
        farbe = mix(farbe, umgebung, F) + glanz;
        float w = 0.012 / max(g, 0.2);
        farbe += vec3(1.0, 0.97, 0.92) * kante(e, rad, w) * 0.8;            // Kanten vorn
        float a2, b2; vec3 m2, m3; vec3 d1g = refract(ld, n0, 1.0 / 1.5);
        schneide(e + d1g * 1e-4, d1g, rad, a2, b2, m2, m3);
        farbe += vec3(0.9, 0.95, 1.0) * kante(e + d1g * b2, rad, w) * 0.28;  // Kanten hinten, durch das Glas
        return farbe;
      }
      void main() {
        vec3 c = vec3(0.0);
        for (int i = 0; i < 4; i++) c += bildpunkt(vUv + (vec2(i % 2, i / 2) - 0.5) * 0.5 * uPixel);
        gl_FragColor = vec4(c * 0.25, 1.0);
      }`,
    depthTest: false, depthWrite: false,
  });
  const szene = new THREE.Scene();
  szene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
  const kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const look = filmlook(renderer, szene, kamera, { staerke: 0.55, radius: 0.35, schwelle: 0.9, saum: 0.002 });
  const m4 = new THREE.Matrix4(), eu = new THREE.Euler();

  /** Form: 0 Dodekaeder → 1 Geode (Ikosidodekaeder-artig) → 2 Ikosaeder, über die Radien der beiden Plattensätze */
  const form = (f, v) => (f < 1 ? v.set(1, 1.3 - 0.24 * weich(f)) : v.set(1 + 0.3 * weich(f - 1), 1.06 - 0.06 * weich(f - 1)));

  return {
    dauer: DAUER,
    bild(t) {
      const auf = inOut(anteil(t, 0.6, 3)), ab = inOut(anteil(t, 8, 9.6));
      const gross = inOut(anteil(t, 5.2, 6.8)) * (1 - inOut(anteil(t, 7, 8.2)));   // kurz so gross, dass man das ganze Foto durch das Glas sieht
      u.uGroesse.value[0] = (0.42 + 0.55 * gross) * auf * (1 - ab);
      u.uMitte.value[0].set(0, 0.05, 0);
      u.uDreh.value[0].setFromMatrix4(m4.makeRotationFromEuler(eu.set(t * 0.31 + 0.4, t * 0.47, t * 0.13)));
      form(Math.min(2, Math.max(0, (t - 2.2) / 2.2)), u.uRadien.value[0]);
      for (let j = 1; j < 3; j++) {                                          // Trabanten kreisen um den grossen Körper
        const w = t * (0.55 + 0.2 * j) + j * 2.4, sicht = weich(anteil(t, 1.6 + 0.5 * j, 3 + 0.5 * j)) * (1 - weich(anteil(t, 6.6, 7.6)));
        u.uGroesse.value[j] = (j === 1 ? 0.16 : 0.11) * sicht;
        u.uMitte.value[j].set(Math.cos(w) * 0.78 * seitenFaktor(B, H), Math.sin(w * 0.8) * 0.75, Math.sin(w) * 0.5);
        u.uDreh.value[j].setFromMatrix4(m4.makeRotationFromEuler(eu.set(t * (0.9 + 0.3 * j), t * 0.6, j)));
        form(j === 1 ? 2 : 0, u.uRadien.value[j]);
      }
      look.bloom.strength = 0.2 + 0.4 * auf * (1 - ab);
      look.render(t);
    },
    entsorgen() { mat.dispose(); look.entsorgen(); },
  };
});

const seitenFaktor = (B, H) => Math.min(1, (1.25 * B) / H);
