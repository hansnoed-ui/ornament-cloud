// Ringe · Tusche auf Wasser · Begriff: Stelle. Jeder Tropfen schiebt alle früheren nach aussen; was einmal Mitte war, wird Ring.
// Suminagashi, das japanische Tuscheschwimmen (seit dem 12. Jahrhundert): abwechselnd ein Tropfen Tusche und ein Tropfen klares
// Netzmittel auf dieselbe Stelle, und es wachsen Ringe wie Jahresringe. Drei Quellen, zwei davon am Bildrand und ausserhalb, so dass
// man ein angeschnittenes Feld sieht und keine Figur. Einmal je Schleife fällt ein Tropfen Zinnober und wandert als einzelner Ring
// durch das Feld. Gerechnet wird rückwärts: jeder Bildpunkt macht die Verdrängung der letzten 150 Tropfen rückgängig (flächentreu).
// Bezüge (Haltung, keine Nachbildung): Suminagashi und Ebru; Giuseppe Penones Jahresringe; Lee Ufan, «From Line»; Tauba Auerbach.
import { sanft } from './werkzeug.js';
const FRAG = `
uniform float schritt, teil, p;
float h(vec2 q){ return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
float rau(vec2 q){ vec2 i = floor(q), f = fract(q); f = f*f*(3.0 - 2.0*f);
  return mix(mix(h(i), h(i + vec2(1.,0.)), f.x), mix(h(i + vec2(0.,1.)), h(i + vec2(1.,1.)), f.x), f.y); }
float fbm(vec2 q){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a*rau(q); q = q*2.03 + 7.1; a *= 0.5; } return s; }
vec2 mitte(float m){ if (m < 0.5) return vec2(-0.38, -0.62); if (m < 1.5) return vec2(0.86, 0.7); return vec2(-1.02, 1.12); }
void main(){
  vec2 x = (gl_FragCoord.xy - 0.5*res) / res.x * 2.0;
  // die Wasserfläche atmet: eine langsame, weite Verzerrung
  vec2 w = x + 0.045*vec2(sin(2.3*x.y + 6.2832*p) + 0.6*sin(5.1*x.y - 1.3), cos(1.9*x.x - 6.2832*p) + 0.6*cos(4.3*x.x + 0.7));
  float ton = 0.0, rand = 0.0, rot = 0.0, alter = 150.0;
  for (int i = 0; i < 150; i++) {
    float st = mod(schritt - float(i) + 240.0, 12.0), m = mod(st, 3.0), tinte = 1.0 - mod(st, 2.0);
    float a = tinte > 0.5 ? 0.1 : 0.2; if (i == 0) a *= sqrt(teil);
    vec2 v = w - mitte(m); float l2 = dot(v, v), a2 = a*a;
    if (l2 < a2) { ton = tinte; rand = sqrt(l2 / a2); rot = (tinte > 0.5 && st < 0.5) ? 1.0 : 0.0; alter = float(i); break; }
    w = mitte(m) + v*sqrt(1.0 - a2 / l2);
  }
  // Papier: warmes Weiss mit Fasern; Tusche: dichter am Rand des Tropfens, körnig, mit dem Alter etwas blasser
  float faser = fbm(x*vec2(26.0, 150.0)) * 0.6 + fbm(x*vec2(160.0, 22.0) + 3.0) * 0.4;
  vec3 papier = vec3(0.925, 0.9, 0.85) - 0.05*(faser - 0.5) - 0.02*fbm(x*3.0);
  float korn = fbm(w*46.0), dichte = ton * (0.5 + 0.5*smoothstep(0.45, 1.0, rand)) * (0.72 + 0.5*korn) * (1.0 - 0.3*alter/150.0);
  vec3 tusche = mix(vec3(0.06, 0.062, 0.075), vec3(0.66, 0.15, 0.09), rot);
  vec3 c = mix(papier, tusche, clamp(dichte * (rot > 0.5 ? 1.15 : 1.0), 0.0, 0.96));
  c *= 1.0 - 0.01*(1.0 - ton)*(korn - 0.5) * 4.0;                       // der klare Film ist nicht ganz leer
  c *= 1.0 - 0.16*smoothstep(0.75, 1.6, length(x*vec2(1.0, 0.8)));     // leichte Randabdunkelung
  gl_FragColor = vec4(c, 1.0);
}`;
export function baue({ shader }) {
  const s = shader(FRAG, 1.5);
  return { stelle(p) { const t = p * 12, st = Math.floor(t); s.zeichne({ schritt: st, teil: Math.max(0.0004, sanft(t - st)), p }); } };
}
