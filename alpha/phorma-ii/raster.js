// PHORMA II – Rasterdruck (seit 22. Oktober 2026, abends; ersetzt die Pixel-Sortierung, Rückmeldung: «mit der Pixelsortierung noch nicht ganz
// zufrieden», gewählt aus vier Vorschlägen: «Rasterdruck»). Das Foto wird zum Vierfarbendruck: vier Raster aus Punkten in Cyan, Magenta, Gelb und
// Schwarz, jedes in seinem klassischen Winkel (15°, 75°, 0°, 45°), die Grösse jedes Punkts aus dem Farbanteil an seiner Stelle; auf warmem Papier
// gedruckt, die Farben decken sich wie Druckfarbe (multipliziert).
//   01 Raster – aus dem Foto wachsen die Punkte, das Raster wird gröber
//   02 Versatz – die vier Platten verrutschen gegeneinander (der Passer stimmt nicht mehr), die Raster drehen sich langsam, die Punkte werden gross;
//      gegen Ende rasten die Platten wieder ein
//   03 Bild (nur als letzter Effekt) – das Raster wird fein und geht ins Foto über
// Nur ein Shader, keine Simulation: jedes Bild für sich, kein Vorrechnen, mit Video laufen die Punkte mit dem laufenden Bild.
import { anteil, weich, glocke, quadMaterial } from "./gemeinsam.js?v=37";
import { phase } from "./ablauf.js?v=37";

const ZEIGEN = /* glsl */ `
  uniform sampler2D tFoto; uniform vec2 uGroesse; uniform float uZelle, uAA, uDreh, uMisch, uSicht, uDeckung;
  uniform vec2 uVersatz[4]; varying vec2 vUv;
  const vec3 PAPIER = vec3(0.93, 0.91, 0.86);
  mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
  // die Farbanteile CMYK aus dem Foto (sRGB) an einer Stelle in Punkten der Filmgrösse
  vec4 cmyk(vec2 p) {
    vec3 c = pow(texture2D(tFoto, clamp(p / uGroesse, 0.0, 1.0)).rgb, vec3(1.0 / 2.2));
    // Schwarz nur zu drei Vierteln aus dem Grau (sonst schluckt die Schwarzplatte die Farben)
    float k = 0.75 * (1.0 - max(c.r, max(c.g, c.b)));
    vec3 cmy = (1.0 - c - k) / max(1.0 - k, 1e-3);
    return clamp(vec4(cmy, k) * uDeckung, 0.0, 1.0);
  }
  // Deckung einer Platte an p: die vier nächsten Rasterpunkte (grosse Punkte reichen in die Nachbarzellen)
  float platte(vec2 p, float winkel, vec2 versatz, int kanal) {
    mat2 R = rot(winkel), Ri = rot(-winkel);
    vec2 q = R * (p - versatz) / uZelle, z0 = floor(q - 0.5);
    float d = 0.0, aa = uAA / uZelle;
    for (int i = 0; i < 2; i++) for (int j = 0; j < 2; j++) {
      vec2 z = z0 + vec2(float(i), float(j)) + 0.5;
      vec4 f = cmyk(Ri * z * uZelle + versatz);
      float anteil = kanal == 0 ? f.x : kanal == 1 ? f.y : kanal == 2 ? f.z : f.w;
      float r = sqrt(anteil) * 0.72;
      d = max(d, 1.0 - smoothstep(r - aa, r + aa, length(q - z)));
    }
    return d;
  }
  void main() {
    vec2 p = vUv * uGroesse;
    vec3 foto = texture2D(tFoto, vUv).rgb;
    float c = platte(p, radians(15.0) + uDreh, uVersatz[0], 0), m = platte(p, radians(75.0) - 0.7 * uDreh, uVersatz[1], 1);
    float y = platte(p, 0.0 + 0.4 * uDreh, uVersatz[2], 2), k = platte(p, radians(45.0) - uDreh, uVersatz[3], 3);
    // Druckfarben decken sich wie auf Papier: jede nimmt dem Licht ihren Teil
    vec3 druck = PAPIER * mix(vec3(1.0), vec3(0.0, 0.66, 0.92), c) * mix(vec3(1.0), vec3(0.92, 0.12, 0.52), m)
               * mix(vec3(1.0), vec3(1.0, 0.88, 0.0), y) * mix(vec3(1.0), vec3(0.1, 0.09, 0.1), k);
    vec3 farbe = mix(foto, pow(druck, vec3(2.2)), uMisch);
    gl_FragColor = vec4(farbe * uSicht, 1.0);
  }`;

export function raster(g, teil) {
  const { B, H } = g, s = B / 1080;   // Grössen in Punkten eines Films von 1080 Breite
  const R = phase(teil, "raster"), V = phase(teil, "versatz"), Bp = phase(teil, "bild");
  const zeigen = quadMaterial(ZEIGEN, { tFoto: { value: g.fotoTex }, uGroesse: { value: new g.THREE.Vector2(B, H) }, uZelle: { value: 2 }, uAA: { value: 1 },
    uDreh: { value: 0 }, uMisch: { value: 0 }, uSicht: { value: 0 }, uDeckung: { value: 1 }, uVersatz: { value: [0, 1, 2, 3].map(() => new g.THREE.Vector2()) } });
  // die Richtungen, in die die Platten verrutschen (Schwarz bleibt fast stehen, wie die Schlüsselplatte)
  const RICHTUNG = [[-0.8, 0.6], [1, 0.15], [0.1, -1], [0.2, 0.15]];

  return {
    render(ziel, tau) {
      const u = zeigen.uniforms;
      // die Zelle: aus dem Foto wachsen die Punkte (fein → 15), im Versatz gross (bis 34), im Bild wieder fein
      const wachsen = weich(anteil(tau, 0.1, R[1])), gross = glocke(tau, V[0], V[1]), fein = Bp ? weich(anteil(tau, Bp[0], Bp[1] - 0.15)) : 0;
      u.uZelle.value = s * (2.5 + 12.5 * wachsen + 19 * gross) * (1 - fein) + s * 1.6 * fein;
      u.uAA.value = Math.max(1, B / (ziel?.width || B)) * 0.75;
      u.uMisch.value = weich(anteil(tau, 0, 0.9)) * (1 - fein);
      u.uDeckung.value = 1 + 0.15 * gross;   // die Punkte laufen etwas zu (Tonwertzunahme)
      // der Versatz: schwillt im Versatz an und rastet gegen dessen Ende wieder ein (als letzter Effekt; sonst geht er verrutscht weiter)
      const auf = weich(anteil(tau, V[0] + 0.2, V[0] + 0.45 * (V[1] - V[0]))), zu = Bp ? weich(anteil(tau, V[0] + 0.7 * (V[1] - V[0]), V[1])) : 0;
      const weit = s * 95 * auf * (1 - zu);   // weit genug, dass man die Platten einzeln sieht
      RICHTUNG.forEach(([x, y], k) => u.uVersatz.value[k].set(x * weit + 6 * s * Math.sin(1.3 * tau + k) * auf, y * weit + 6 * s * Math.cos(1.1 * tau + 2 * k) * auf));
      u.uDreh.value = 0.22 * weich(anteil(tau, V[0], V[1])) * (1 - fein);
      u.uSicht.value = teil.erst ? weich(anteil(tau, 0, 1.0)) ** 2 : 1;   // aus dem Dunkeln (quadratisch: wenig Licht wirkt nach der Gammakurve hell)
      g.pass(zeigen, ziel);
      let ende = 0, aktiv = teil.erst ? weich(anteil(tau, 0, 0.6)) : 1;
      if (teil.vonFoto) ende = 1 - weich(anteil(tau, 0, 0.35));
      if (Bp) { ende = Math.max(ende, weich(anteil(tau, Bp[1] - 0.2, Bp[1] - 0.05))); aktiv *= 1 - fein; }
      return { aktiv, bloom: 0.08, radius: 0.3, saum: 0.002, ende };
    },
    vorab: { szenen: [], materialien: [zeigen] },
    zaehler() { return `rasterdruck · cmyk · zelle ${Math.round(zeigen.uniforms.uZelle.value)} px`; },
    entsorgen() { zeigen.dispose(); },
  };
}
