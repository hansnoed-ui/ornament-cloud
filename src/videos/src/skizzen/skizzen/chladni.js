// Chladni · Sand auf einer schwingenden Platte · Begriff: Stelle. Der Sand sammelt sich, wo nichts schwingt.
// Vier Schwingungsformen einer quadratischen Platte gleiten ineinander; wo die Platte ruht, liegt der Sand, wo sie schwingt, hüpft er.
import { kreisGewichte } from './werkzeug.js';
const FRAG = `
uniform float n; uniform vec4 w;
float hash(vec2 q){ return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
float ch(vec2 x, float a, float b){ return cos(a*3.14159265*x.x)*cos(b*3.14159265*x.y) - cos(b*3.14159265*x.x)*cos(a*3.14159265*x.y); }
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*res) / res.x * 2.0;
  vec2 x = uv / 0.9;
  vec3 grund = vec3(0.055, 0.052, 0.05), platte = vec3(0.085, 0.082, 0.08), sand = vec3(0.93, 0.87, 0.75);
  float drin = step(abs(x.x), 1.0) * step(abs(x.y), 1.0);
  float F = w.x*ch(x, 1.0, 4.0) + w.y*ch(x, 3.0, 5.0) + w.z*ch(x, 2.0, 7.0) + w.w*ch(x, 4.0, 7.0);
  float d = exp(-pow(F / 0.2, 2.0));
  vec2 g = floor(gl_FragCoord.xy / 3.0);
  float ruht = step(hash(g), d*d*0.92);
  float huepft = step(hash(g + vec2(n*1.7, n*0.31)), 0.07*(1.0 - d));
  vec3 c = mix(platte + 0.012*(hash(g*0.37) - 0.5), sand*(0.72 + 0.28*hash(g + 3.0)), max(ruht, huepft*0.8));
  float kante = smoothstep(0.0, 0.012, abs(max(abs(x.x), abs(x.y)) - 1.0));
  c = mix(vec3(0.3, 0.29, 0.27), c, kante);
  gl_FragColor = vec4(mix(grund, c, drin + (1.0 - kante)*(1.0 - drin)), 1.0);
}`;
export function baue({ shader }) {
  const s = shader(FRAG);
  return { stelle(p, n) { s.zeichne({ n: n % 600, w: kreisGewichte(p, 4, 7) }); } };
}
