// Achat · ein Stein, immer weiter aufgesägt · Begriff: Schrift. Die Bänder sind Schicht um Schicht in einem Hohlraum gewachsen, über
// Jahrtausende, jede der vorigen folgend und nie ganz gleich. Die Säge geht langsam tiefer; die Bänder wandern, die Höhle mit den
// Kristallen öffnet sich und schliesst sich. Roger Caillois nannte solche Steine eine Schrift, die niemand geschrieben hat.
// Regeln für höheren Anspruch: Ausschnitt statt Figur (die Knolle ist grösser als das Bild), Stoff zuerst (Chalcedon, durchscheinend,
// Quarz in der Mitte, Rinde am Rand), eine Entscheidung (ein einziges Band aus Karneol), Zeit mit Gewicht.
// Bezüge (Haltung, keine Nachbildung): Roger Caillois, «L'écriture des pierres» (1970); Kunstkammern; Pietra paesina.
import { TAU } from './werkzeug.js';
import { RAUSCHEN3 } from './rauschen3.glsl.js';
const FRAG = RAUSCHEN3 + `
uniform float tiefe;
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*res) / res.x * 2.0;
  vec3 P = vec3(uv * 0.72 + vec2(0.16, -0.08), tiefe);
  // Abstand zur Innenseite der Knolle: eine verbeulte Kugel; die Bänder folgen ihr von aussen nach innen
  vec3 v = P * vec3(1.0, 0.82, 1.1);
  float aussen = 1.05 + 0.22 * fbm3(normalize(v + 0.001) * 2.2 + 1.0) - length(v);
  float d = aussen + 0.08 * fbm3(P * 3.0) + 0.02 * fbm3(P * 11.0);
  vec3 col;
  if (d < 0.0) {                                       // ausserhalb: die rauhe Rinde
    col = vec3(0.32, 0.27, 0.23) * (0.7 + 0.5 * fbm3(P * 40.0));
  } else {
    float b = d * 30.0, i = floor(b), f = fract(b);
    float zz = fract(sin(i * 78.233) * 43758.5453), dicke = 0.35 + 0.55 * zz;
    vec3 milch = vec3(0.82, 0.83, 0.84), grau = vec3(0.48, 0.53, 0.6), dunkel = vec3(0.2, 0.23, 0.3);
    vec3 band = zz < 0.33 ? milch : zz < 0.7 ? grau : dunkel;
    if (i == 9.0) band = vec3(0.72, 0.24, 0.12);       // Karneol, ein einziges Band
    col = mix(band * 0.88, band, smoothstep(0.0, dicke, f)) * (0.93 + 0.1 * fbm3(P * 60.0));
    col = mix(col, vec3(0.06, 0.06, 0.08), 0.55 * smoothstep(dicke, dicke + 0.04, f) * (1.0 - smoothstep(0.96, 1.0, f)));   // feine Fugen
    // innen: der Hohlraum mit Quarz
    float drusig = d - 0.78 - 0.05 * fbm3(P * 6.0);
    if (drusig > 0.0) {
      float kr = rau3(P * 26.0) * 0.7 + rau3(P * 60.0) * 0.3, spitze = smoothstep(0.62, 0.9, kr);
      col = mix(vec3(0.62, 0.62, 0.6), vec3(0.97, 0.96, 0.92), spitze) * (0.55 + 0.6 * smoothstep(0.0, 0.08, drusig));
      col *= 0.85 + 0.25 * rau3(P * 90.0);
    }
  }
  // Schnittfläche poliert: ein schwacher Glanz von oben
  col += 0.05 * smoothstep(0.4, 1.4, uv.y + 0.3 * uv.x);
  col *= 1.0 - 0.2 * smoothstep(0.65, 1.55, length(uv * vec2(1.0, 0.8)));
  gl_FragColor = vec4(col, 1.0);
}`;
export function baue({ shader }) {
  const s = shader(FRAG, 1.5);
  return { stelle(p) { s.zeichne({ tiefe: 0.32 * Math.sin(TAU * p) }); } };
}
