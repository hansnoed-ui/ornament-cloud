// Ebru · Pigment auf Tragant, abgezogen · Begriff: Spur. Jeder Tropfen verdrängt alle früheren, jeder Kammzug zieht durch alles hindurch;
// am Ende wird ein Bogen Papier aufgelegt und abgezogen, und das Bad ist wieder leer. Zweite Fassung von «marmor» nach den Regeln für
// höheren Anspruch: Ausschnitt statt Figur, Stoff zuerst (Pigment mit Korn, die hellen Ringe der Ochsengalle, feine Kammzähne), eine
// Entscheidung (ein einziger Tropfen Zinnober zwischen Erdfarben), Zeit mit Gewicht (lange Tropfphase, dann drei Züge, dann der Abzug).
// Bezüge (Haltung, keine Nachbildung): türkisches Ebru und europäisches Buntpapier («Türkisch Papier»); Suminagashi; Helen Frankenthaler.
import { sanft, zufall } from './werkzeug.js';
const N = 44;
const FRAG = `
uniform vec4 tropfen[${N}]; uniform float zug1, zug2, zug3, abzug;
float h(vec2 q){ vec3 p3 = fract(vec3(q.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float rau(vec2 q){ vec2 i = floor(q), f = fract(q); f = f*f*(3.0 - 2.0*f);
  return mix(mix(h(i), h(i + vec2(1.,0.)), f.x), mix(h(i + vec2(0.,1.)), h(i + vec2(1.,1.)), f.x), f.y); }
vec3 farbe(float k){
  if (k < 0.5) return vec3(0.16, 0.22, 0.38);       // Indigo
  if (k < 1.5) return vec3(0.74, 0.55, 0.22);       // Ocker
  if (k < 2.5) return vec3(0.42, 0.44, 0.3);        // Grüne Erde
  if (k < 3.5) return vec3(0.2, 0.17, 0.15);        // Umbra
  if (k < 4.5) return vec3(0.9, 0.86, 0.76);        // Ochsengalle: heller Ring
  return vec3(0.75, 0.16, 0.1);                     // Zinnober, einmal
}
void main(){
  vec2 x = (gl_FragCoord.xy - 0.5*res) / res.x * 2.0 * 0.62 + vec2(0.12, 0.05);
  // Abzug: links von der Kante ist das Bad schon wieder leer
  float kante = mix(-1.6, 1.6, abzug);
  vec3 bad = vec3(0.86, 0.83, 0.74) - 0.03*rau(x*6.0);
  if (abzug > 0.0 && x.x < kante - 0.02) { gl_FragColor = vec4(bad * (1.0 - 0.18*exp(-(kante - x.x)*14.0)), 1.0); return; }
  // rückwärts: dritter Zug (eine Welle), zweiter (feiner Kamm quer), erster (Hin und Her längs)
  x.x -= zug3 * 0.045 * sin(x.y * 23.0);
  float k2 = x.y * 26.0, d2 = abs(fract(k2) - 0.5) / 26.0; x.x -= zug2 * 0.09 * exp(-d2 * 140.0);
  float k1 = x.x * 6.0, i1 = floor(k1), d1 = abs(fract(k1) - 0.5) / 6.0; x.y -= zug1 * 0.32 * exp(-d1 * 22.0) * (mod(i1, 2.0) * 2.0 - 1.0);
  vec3 c = bad; float rand = 0.0;
  for (int i = ${N - 1}; i >= 0; i--) {
    vec4 t = tropfen[i]; if (t.z <= 0.0) continue;
    vec2 v = x - t.xy; float l2 = dot(v, v);
    if (l2 < t.z*t.z) { c = farbe(t.w); rand = sqrt(l2) / t.z; break; }
    x = t.xy + v * sqrt(1.0 - t.z*t.z / l2);
  }
  // Korn des Pigments, dunklerer Saum am Rand jedes Tropfens
  float korn = rau(gl_FragCoord.xy * 0.35) * 0.5 + rau(gl_FragCoord.xy * 1.3) * 0.5;
  c *= (0.9 + 0.16*korn) * (1.0 - 0.12*smoothstep(0.8, 1.0, rand));
  // die Kante des Papiers, das gerade abgezogen wird
  if (abzug > 0.0) c *= 1.0 - 0.35*exp(-(x.x - kante + 0.02) * 30.0) * step(kante - 0.02, x.x);
  gl_FragColor = vec4(c, 1.0);
}`;
export function baue({ shader }) {
  const s = shader(FRAG), r = zufall(1550), tr = [];
  for (let i = 0; i < N; i++) {
    const art = i === 27 ? 5 : (i % 4 === 3 ? 4 : Math.floor(r() * 4));
    tr.push({ x: (r() - 0.5) * 1.6, y: (r() - 0.5) * 2.0, r: (art === 4 ? 0.06 : 0.1) + 0.16 * r(), art, t: 0.02 + 0.42 * i / N });
  }
  const feld = new Float32Array(N * 4);
  return {
    stelle(p) {
      tr.forEach((t, i) => { feld[i * 4] = t.x; feld[i * 4 + 1] = t.y; feld[i * 4 + 2] = t.r * sanft((p - t.t) / 0.05); feld[i * 4 + 3] = t.art; });
      s.setze('tropfen', feld, 4);
      s.zeichne({ zug1: sanft((p - 0.48) / 0.1), zug2: sanft((p - 0.6) / 0.1), zug3: sanft((p - 0.7) / 0.07), abzug: sanft((p - 0.86) / 0.11) });
    },
  };
}
