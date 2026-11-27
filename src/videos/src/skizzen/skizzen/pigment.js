// Pigment · Blütenstaub auf Stein · Begriff: Stelle. Der Staub liegt, wo nichts schwingt; man sieht nur einen Ausschnitt der Platte.
// Zweite Fassung von «chladni» nach den Regeln für höheren Anspruch (docs/skizzen.md): Ausschnitt statt Figur (die Platte reicht über
// den Bildrand, schräg angeschnitten), Stoff zuerst (ein Relief aus Körnern im Streiflicht, mit Schlagschatten auf dem Stein), eine
// Entscheidung (ein einziges Gelb), Zeit mit Gewicht (lange Ruhe, dann rutscht alles). Drei Schwingungsformen, jede steht lange.
// Bezüge (Haltung, keine Nachbildung): Wolfgang Laib, Blütenstaub; Ernst Chladni; Carsten Nicolai, «Milch»; Emma Kunz.
import { TAU, kreisGewichte } from './werkzeug.js';
const FRAG = `
uniform float n, unruhe; uniform vec3 w; uniform vec2 drift;
float h1(vec2 q){ vec3 p3 = fract(vec3(q.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }   // ohne die Diagonalen des Sinus-Zufalls
float rau(vec2 q){ vec2 i = floor(q), f = fract(q); f = f*f*(3.0 - 2.0*f);
  return mix(mix(h1(i), h1(i + vec2(1.,0.)), f.x), mix(h1(i + vec2(0.,1.)), h1(i + vec2(1.,1.)), f.x), f.y); }
float fbm(vec2 q){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a*rau(q); q = q*2.03 + 7.1; a *= 0.5; } return s; }
float ch(vec2 x, float a, float b){ return cos(a*3.14159265*x.x)*cos(b*3.14159265*x.y) - cos(b*3.14159265*x.x)*cos(a*3.14159265*x.y); }
// Höhe des Staubs am Ort der Platte: ein Wall entlang der Ruhelinien, breiter, wenn die Platte unruhig ist
float hoehe(vec2 x){
  float F = w.x*ch(x, 1.0, 3.0) + w.y*ch(x, 2.0, 5.0) + w.z*ch(x, 3.0, 4.0);
  float breit = 0.15 + 0.22*unruhe;
  return exp(-pow(F / breit, 2.0)) * (1.0 - 0.45*unruhe);
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*res) / res.x * 2.0;
  // Ausschnitt: schräg, nah, leicht wandernd
  float c = cos(0.31), s = sin(0.31);
  vec2 x = mat2(c, -s, s, c) * (uv * 0.47) + vec2(0.23, -0.12) + drift;
  vec2 g = floor(gl_FragCoord.xy / 3.0);                                   // ein Korn
  float korn = h1(g), korn2 = h1(g + 17.3), kornZeit = h1(g + vec2(n*1.3, n*0.7));
  float H = hoehe(x), e = 0.006;
  vec2 grad = vec2(hoehe(x + vec2(e, 0.)) - hoehe(x - vec2(e, 0.)), hoehe(x + vec2(0., e)) - hoehe(x - vec2(0., e))) / (2.0*e);
  // Streiflicht von links oben, flach; der Staub ist matt, er glänzt nicht
  vec2 L = normalize(vec2(-0.8, 0.6));
  float hell = clamp(0.8 + 0.03*dot(-grad, L), 0.58, 1.0);
  // Schlagschatten: liegt in Richtung des Lichts ein höherer Wall, ist hier Schatten
  float schatten = 0.0; for (int i = 1; i <= 4; i++) { float d = 0.014*float(i); schatten = max(schatten, hoehe(x + L*d) - H - 0.05*float(i)); }
  schatten = smoothstep(0.0, 0.5, schatten);
  // Stein: dunkler, geschliffener Schiefer, ruhig, mit einzelnen hellen Einschlüssen
  vec3 stein = vec3(0.075, 0.079, 0.088) * (0.9 + 0.2*fbm(x*5.0)) * (0.94 + 0.12*korn2) + 0.05*step(0.9965, korn2);
  stein *= 1.0 - 0.45*schatten;
  // Staub: Korn für Korn. Wo der Wall hoch ist, liegt jedes Korn; zum Rand hin werden es einzelne; in der Unruhe hüpfen sie
  float wk = mix(korn, kornZeit, unruhe);
  float da = step(wk, smoothstep(0.015, 0.55, H) * 0.985 + 0.012 + 0.03*unruhe);
  vec3 gelb = vec3(0.97, 0.77, 0.09) * hell * (0.74 + 0.36*korn2) * (1.0 - 0.25*schatten);
  vec3 col = mix(stein, gelb, da);
  col *= 1.0 - 0.22*smoothstep(0.7, 1.55, length(uv*vec2(1.0, 0.8)));
  gl_FragColor = vec4(col, 1.0);
}`;
export function baue({ shader }) {
  const sh = shader(FRAG);
  return {
    stelle(p, n) {
      const w = kreisGewichte(p, 3, 14), unruhe = Math.pow(Math.sin(3 * Math.PI * p), 2) ** 3;   // lange Ruhe, kurze Unruhe zwischen den Formen
      sh.zeichne({ n: n % 600, w, unruhe, drift: [0.03 * Math.cos(TAU * p), 0.03 * Math.sin(TAU * p)] });
    },
  };
}
