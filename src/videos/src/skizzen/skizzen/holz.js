// Holz · ein Brett, Schicht um Schicht abgehobelt · Begriff: Eigenzeit. Jeder Jahresring ist ein Jahr; schneidet man den Stamm schräg,
// werden aus Ringen Bögen, die Fladerung, ein Ornament, das niemand entworfen hat. Der Hobel nimmt langsam Schicht um Schicht ab,
// die Bögen wandern, schliessen sich, öffnen sich; ein Ast kommt aus der Tiefe herauf und versinkt wieder.
// Regeln für höheren Anspruch: Ausschnitt statt Figur (nur Brett, ohne Kante), Stoff zuerst (Frühholz, Spätholz, Poren, Markstrahlen,
// ein Ast mit dunklem Rand), eine Entscheidung (der Ast), Zeit mit Gewicht (der Hobel ist sehr langsam).
// Bezüge (Haltung, keine Nachbildung): Giuseppe Penone, der aus einem Balken den Baum zurückschnitzt; Intarsie; japanische Holzschnitte.
import { TAU } from './werkzeug.js';
import { RAUSCHEN3 } from './rauschen3.glsl.js';
const FRAG = RAUSCHEN3 + `
uniform float tiefe, kipp;
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*res) / res.x * 2.0;
  // Punkt auf dem Brett: x quer, y längs, z die Tiefe des Hobels
  vec3 P = vec3(uv.x * 0.62, uv.y * 0.62, tiefe);
  // der Stamm liegt fast längs, leicht schräg im Brett: so schneidet die Fläche die Ringe in Bögen
  float c = cos(kipp), s = sin(kipp);
  vec3 q = vec3(P.x + 0.36, P.y * c - P.z * s, P.y * s + P.z * c + 0.5);
  vec3 w = q + 0.11 * vec3(fbm3(q * vec3(2.0, 0.35, 2.0)), 0.0, fbm3(q * vec3(2.0, 0.35, 2.0) + 7.0));
  float r = length(w.xz);
  // der Ast: ein schräger Zylinder, um den sich die Ringe biegen
  vec3 a0 = vec3(0.1, 0.06, 0.12), ad = normalize(vec3(0.85, 0.15, 0.5));
  vec3 aq = q - a0; float ar = length(aq - ad * dot(aq, ad));
  r += 0.06 * exp(-ar * ar / 0.012);
  float jahr = r * 22.0, f = fract(jahr), n = floor(jahr);
  float breite = 0.55 + 0.4 * fract(sin(n * 12.9898) * 43758.5453);     // breite und schmale Jahre
  float spaet = smoothstep(breite, breite + 0.12, f) * (1.0 - smoothstep(0.97, 1.0, f));
  vec3 frueh = vec3(0.86, 0.68, 0.45), spaetholz = vec3(0.58, 0.36, 0.19);
  vec3 col = mix(frueh, spaetholz, spaet);
  // Poren längs der Faser, Markstrahlen quer
  float pore = rau3(vec3(P.x * 420.0, P.y * 9.0, tiefe * 30.0)) * rau3(vec3(P.x * 180.0 + 3.0, P.y * 5.0, 1.0));
  col *= 0.97 + 0.05 * fbm3(vec3(P.x * 40.0, P.y * 3.0, 2.0)) - 0.16 * smoothstep(0.55, 0.75, pore);
  float strahl = rau3(vec3(P.x * 14.0 + w.x, P.y * 160.0, 3.0));
  col *= 1.0 + 0.06 * step(0.8, strahl);
  // Ast: dunkel, mit eigenen engen Ringen und einem dunklen Saum
  float ak = exp(-ar * ar / 0.0032);
  vec3 ast = mix(vec3(0.38, 0.21, 0.1), vec3(0.24, 0.12, 0.06), 0.5 + 0.5 * sin(ar * 900.0));
  col = mix(col, ast, smoothstep(0.35, 0.6, ak));
  col *= 1.0 - 0.45 * exp(-pow((ar - 0.05) / 0.006, 2.0)) * step(0.02, ar);
  // Hobelspur: ganz leichte Querwellen, Licht von oben links
  col *= 0.97 + 0.03 * sin(P.y * 140.0 + tiefe * 60.0);
  col *= 1.0 - 0.18 * smoothstep(0.65, 1.55, length(uv * vec2(1.0, 0.8)));
  gl_FragColor = vec4(col, 1.0);
}`;
export function baue({ shader }) {
  const s = shader(FRAG, 1.5);
  return { stelle(p) { s.zeichne({ tiefe: 0.06 * Math.sin(TAU * p), kipp: 0.21 + 0.035 * Math.sin(TAU * p + 1.2) }); } };
}
