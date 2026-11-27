// Marmor · Farbe auf Wasser · Begriff: Spur. Jede Störung bleibt im Bild; die Form ist die Summe dessen, was ihr geschehen ist.
// Marmorieren wie im Ebru und im Buntpapier, gerechnet als Folge flächentreuer Verschiebungen: Tropfen fallen und drängen einander,
// dann zieht ein Kamm längs und einer quer. Am Ende klärt sich das Bad, die Schleife beginnt im Leeren.
import { sanft, zufall } from './werkzeug.js';
const N = 16;
const FRAG = `
uniform vec3 tropfen[${N}]; uniform float kamm1, kamm2, klar;
vec3 farbe(int i){
  int k = i - (i/5)*5;
  if (k == 0) return vec3(0.11, 0.2, 0.42);
  if (k == 1) return vec3(0.8, 0.6, 0.18);
  if (k == 2) return vec3(0.5, 0.15, 0.12);
  if (k == 3) return vec3(0.93, 0.9, 0.82);
  return vec3(0.09, 0.09, 0.1);
}
void main(){
  vec2 x = (gl_FragCoord.xy - 0.5*res) / res.x * 2.0;
  // rückwärts: zuerst der zweite Kamm (quer gezogen), dann der erste (längs), dann die Tropfen vom letzten zum ersten
  float d2 = abs(fract(x.y*3.0 + 0.25) - 0.5) / 3.0; x.x -= kamm2 * 0.28 * exp(-d2*d2/0.0016) * (mod(floor(x.y*3.0 + 0.25), 2.0)*2.0 - 1.0);
  float d1 = abs(fract(x.x*2.5) - 0.5) / 2.5; x.y -= kamm1 * 0.42 * exp(-d1*d1/0.004);
  vec3 bad = vec3(0.9, 0.87, 0.8), c = bad;
  for (int i = ${N - 1}; i >= 0; i--) {
    vec3 t = tropfen[i]; if (t.z <= 0.0) continue;
    vec2 v = x - t.xy; float l2 = dot(v, v);
    if (l2 < t.z*t.z) { c = farbe(i); break; }
    x = t.xy + v * sqrt(1.0 - t.z*t.z / l2);
  }
  gl_FragColor = vec4(mix(c, bad, klar), 1.0);
}`;
export function baue({ shader }) {
  const s = shader(FRAG), r = zufall(1856), tr = [];
  for (let i = 0; i < N; i++) tr.push({ x: (r() - 0.5) * 1.3, y: (r() - 0.5) * 1.7, r: 0.16 + 0.2 * r(), t: 0.02 + 0.36 * i / N });
  const feld = new Float32Array(N * 3);
  return {
    stelle(p) {
      tr.forEach((t, i) => { feld[i * 3] = t.x; feld[i * 3 + 1] = t.y; feld[i * 3 + 2] = t.r * sanft((p - t.t) / 0.07); });
      s.setze('tropfen', feld, 3);
      s.zeichne({ kamm1: sanft((p - 0.44) / 0.16), kamm2: sanft((p - 0.63) / 0.16), klar: sanft((p - 0.9) / 0.09) });
    },
  };
}
