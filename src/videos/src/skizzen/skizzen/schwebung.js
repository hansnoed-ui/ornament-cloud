// Schwebung · Tusche auf Papier · Begriff: Koppelung. Zwei Rhythmen, fast gleich; was man sieht, ist ein dritter, den keiner von beiden enthält.
// Zwei Scharen von Ringen mit leicht verschiedenem Abstand wandern gegeneinander; ihr Moiré dreht, öffnet und schliesst sich.
import { TAU, welle, mix } from './werkzeug.js';
const FRAG = `
uniform vec2 c1, c2; uniform float k1, k2, ph;
float linie(float v, float breite){ float f = abs(fract(v) - 0.5); float aa = fwidth(v) * 1.2; return smoothstep(breite + aa, breite - aa, f); }
float hash(vec2 q){ return fract(sin(dot(q, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 x = (gl_FragCoord.xy - 0.5*res) / res.x * 2.0;
  float a = linie(length(x - c1)*k1 - ph, 0.19), b = linie(length(x - c2)*k2 + ph, 0.19);
  vec3 papier = vec3(0.925, 0.9, 0.85) - 0.03*hash(floor(gl_FragCoord.xy/2.0)), tusche = vec3(0.09, 0.085, 0.09);
  float t = max(a, b)*0.86 + a*b*0.14;
  gl_FragColor = vec4(mix(papier, tusche, t), 1.0);
}`;
export function baue({ shader }) {
  const s = shader('#extension GL_OES_standard_derivatives : enable\n' + FRAG);
  return {
    stelle(p) {
      const a = mix(0.05, 0.42, welle(p)), w = TAU * p;
      s.zeichne({ c1: [a * Math.cos(w), a * Math.sin(w)], c2: [-a * Math.cos(w), -a * Math.sin(w)], k1: 21, k2: 21 * (1 + 0.07 * Math.sin(TAU * p)), ph: 2 * p });
    },
  };
}
