// Moiré · Organza über Seide · Begriff: Koppelung. Zwei Gewebe, fast gleich fein; was man sieht, ist ein drittes Muster, das in keinem
// von beiden liegt. «Moiré» hiess zuerst ein Stoff: Seide, die man zwischen Walzen presste, bis sie wie gewässert glänzte.
// Zweite Fassung von «schwebung» nach den Regeln für höheren Anspruch: Ausschnitt statt Figur (zwei Bahnen Stoff, nah, ohne Rand),
// Stoff zuerst (Kette und Schuss, Glanz je nach Fadenrichtung, eine Falte im Organza), eine Entscheidung (Seide in einem
// einzigen gebrochenen Rosé), Zeit mit Gewicht (der Organza gleitet kaum merklich, die Moirébänder wandern weit).
// Bezüge (Haltung, keine Nachbildung): Moiré-Seide; Jesús Rafael Soto; Gerhard von Graevenitz; Anni Albers.
import { TAU } from './werkzeug.js';
const FRAG = `
uniform float drehung, schub, falte, p;
float h(vec2 q){ vec3 p3 = fract(vec3(q.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
// ein Gewebe: Faden quer und längs, mit runder Fadenform und kleinen Unregelmässigkeiten
float faden(float u, float dicke){ float f = abs(fract(u) - 0.5) * 2.0; return smoothstep(dicke, dicke - 0.35, f); }
vec2 gewebe(vec2 q, float dicke){
  vec2 z = floor(q);
  float kette = faden(q.x + 0.06*(h(vec2(z.x, 3.0)) - 0.5), dicke * (0.9 + 0.2*h(vec2(z.x, 7.0))));
  float schuss = faden(q.y + 0.06*(h(vec2(z.y, 5.0)) - 0.5), dicke * (0.9 + 0.2*h(vec2(z.y, 9.0))));
  float oben = mod(z.x + z.y, 2.0);                 // Leinwandbindung: abwechselnd liegt Kette oder Schuss oben
  return vec2(mix(kette, schuss, oben), max(kette, schuss));
}
void main(){
  vec2 x = (gl_FragCoord.xy - 0.5*res) / res.x * 2.0;
  float d = 0.026;                                   // Fadenabstand der Seide
  // Seide unten: Glanz hängt davon ab, welcher Faden oben liegt (das «Wässern» lässt ihn breit fliessen)
  vec2 q1 = x / d;
  vec2 s = gewebe(q1, 0.72);
  float wasser = 0.5 + 0.5*sin(x.x*7.0 + 2.0*sin(x.y*3.1 + 1.0) + 0.6*sin(x.y*9.0));
  vec3 rose = vec3(1.0, 0.8, 0.72);
  vec3 seide = mix(vec3(0.42, 0.26, 0.26), rose * (0.7 + 0.25*s.x + 0.12*wasser) * (0.92 + 0.08*h(floor(q1))), s.y);
  // Organza oben: schwarz, durchsichtig, fast gleich fein, leicht gedreht und geschoben, mit einer Falte
  vec2 y = x; y.x += falte * 0.05 * sin(y.y * 2.3 + 0.7) ; y.y += falte * 0.02 * sin(y.x * 3.1);
  float c = cos(drehung), sn = sin(drehung);
  vec2 q2 = mat2(c, -sn, sn, c) * y / (d * 1.045) + vec2(schub, schub*0.37);
  vec2 o = gewebe(q2, 0.66);
  vec3 col = seide * (1.0 - 0.82*o.y) * 1.25;
  // Licht: der Organza glänzt an der Falte matt
  col += vec3(0.05, 0.045, 0.05) * o.y * (0.5 + 0.5*sin(y.y*2.3 + 0.7)) * falte;
  col *= 1.0 - 0.25*smoothstep(0.6, 1.5, length(x*vec2(1.0, 0.8)));
  gl_FragColor = vec4(col, 1.0);
}`;
export function baue({ shader }) {
  const s = shader(FRAG);
  return { stelle(p) { s.zeichne({ drehung: 0.035 + 0.03 * Math.sin(TAU * p), schub: 2 * p, falte: 0.5 + 0.5 * Math.sin(TAU * p + 1.1), p }); } };
}
