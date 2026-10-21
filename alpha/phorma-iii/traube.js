// PHORMA III – Traube: glänzende rote Perlen in einem Knäuel aus feinen weissen Fäden (Wunsch vom 19. Oktober 2026 nach einem Video – «UVA»,
// eine Kugel aus Fäden, darin Trauben und Schnüre aus Beeren, Rauch, Tiefenschärfe, rote Glut im Takt –: «eine weitere Animationsmöglichkeit für
// Musik und Stimme (inklusive Anpassung des Logos) … ohne Text, so ansprechend wie möglich»).
//   Perlen: je Perle ein Viereck zur Kamera, im Fragment-Shader eine Kugel (Licht von links oben, weiter Glanz und harter Glanzpunkt, Licht durch den
//   Rand); Tiefenschärfe wie bei einem Objektiv: die Unschärfe wächst mit dem Abstand zur Schärfeebene, das Viereck wächst mit, die Deckkraft sinkt
//   mit der Fläche (Energie bleibt) – nahe Perlen werden zu grossen, weichen Flecken. Nach der Tiefe sortiert (hinten zuerst) und vormultipliziert
//   gemischt; dann noch einmal nur in die Tiefe (wo sie deckend sind), damit die Fäden hinter ihnen verschwinden.
//   Fäden: Bögen auf einer Kugel (Säule: Trichter, Schwarm: Haare im Wasser) mit Rauschen aus der Zeit der Musik, additiv, unscharf schwächer.
//   Rauch: fleckiges Rauschen im Bild, dunkelgrau, mit der Glut rötlich.
//   Musik: die Zeit der Musik treibt die Schnüre; der Schlag lässt die Perlen schwellen und die Kamera rucken, der Bass sprengt die Traube auf und
//   lässt sie von innen rot glühen, die Höhen lassen die Funken blitzen; das Tor dunkelt zwischen den Schlägen ab. Bei jedem kräftigen Einsatz ein
//   harter Schnitt in eine neue Einstellung (Kugel, Nah mit Schärfenzug, Säule, Schwarm; mit einem Video manchmal sein Standbild aus Perlen).
//   01 Traube (in den ersten 0,9 s wächst sie aus dem Dunkeln, die Fäden zeichnen sich; bis zum 19. Oktober 2026 eine eigene Phase «Keim», die
//   gehörte nicht hin) → 02 Logo (die Perlen fädeln sich auf die Schlaufe des Signets, die Fäden winden sich als Strang um sie; film.js tippt den
//   Schriftzug, der Punkt ist eine Perle) oder 02 Stille (alles sinkt ins Dunkel).
// Zustandslos: alles hängt nur von der Zeit ab (Bewegungsunschärfe, Spulen, Video Bild für Bild).
import * as THREE from "three";
import { anteil, weich, kamera, ABSTAND, FOV } from "./gemeinsam.js?v=21";
import { phase } from "./ablauf.js?v=21";
import { gewebeKurven } from "./kurven.js?v=21";
import { weichzeichnen } from "./analyse.js?v=21";
import { tonOderErsatz, wert, gewebeZustaende, zustandBei } from "./ton.js?v=21";
import { RAUSCHEN } from "./gewebe.js?v=21";
import { traubenBau, perlenLegen, einstellung, artBei, schlaufeWelt, perlenAufZuegen, traubenZeit, h1 } from "./traubenplan.js?v=21";

const VOR = 0.4, LN = 512;                                                  // Vorlauf des Films; Punkte der Schlaufe in der Textur

// die Perle: Viereck um die Mitte, so gross wie Halbmesser + Unschärfe; uPx: Grösse eines Bildpunkts im Abstand 1
const PERLE_VERTEX = /* glsl */ `
  uniform float uApertur, uFokus, uPx, uGross; attribute vec3 aPos; attribute float aR; attribute vec4 aTon;
  varying vec2 vQ; varying float vR, vB; varying vec4 vTon;
  void main() {
    vec4 mv = modelViewMatrix * vec4(aPos, 1.0);
    float d = -mv.z, px = uPx * d;
    float b = max(uApertur * abs(d - uFokus) / uFokus, px), s = aR + b + px;
    // ganz nahe Perlen höchstens so gross wie ein Drittel des Bilds (sonst deckt ein Fleck alles zu und kostet viel)
    // ganz nahe: alles im selben Verhältnis kleiner und ausgeblendet, so bleibt der Fleck rund (abgeschnitten wurde er eckig)
    float most = uGross * d, k = min(1.0, most / s);
    vR = aR * k; vB = b * k; s *= k; vTon = aTon; vTon.z *= smoothstep(0.06, 0.2, d) * step(1e-5, aR) * smoothstep(0.35, 0.9, k);
    vQ = position.xy * s;
    mv.xy += vQ;
    gl_Position = d < 0.04 || aR <= 0.0 ? vec4(2.0, 2.0, 2.0, 1.0) : projectionMatrix * mv;   // ausgeblendete Perlen (r = 0) gar nicht
  }`;
const DECKUNG = /* glsl */ `
  // smoothstep mit gleichen Grenzen (r = 0) ist nicht festgelegt: auf Telefonen NaN, das der Bloom über das ganze Bild schmiert (Rückmeldung:
  // «das Video bleibt dunkel»); darum r > 0 und die obere Grenze immer etwas grösser
  float deckung(float rho) { if (vR <= 0.0) return 0.0; float a0 = vB > vR ? (vR * vR) / (vB * vB) : 1.0; return a0 * (1.0 - smoothstep(abs(vR - vB), max(vR + vB, abs(vR - vB) + 1e-5), rho)); }`;
const PERLE_FRAGMENT = /* glsl */ `
  uniform float uHell, uGlut; varying vec2 vQ; varying float vR, vB; varying vec4 vTon;
  ${DECKUNG}
  void main() {
    float rho = length(vQ), al = deckung(rho) * step(0.001, vTon.z);
    if (!(al >= 0.002)) discard;                                           // so fällt auch ein NaN weg
    vec2 q = vQ / max(vR, 1e-6); float l2 = dot(q, q);
    if (l2 > 1.0) { q *= inversesqrt(l2); l2 = 1.0; }
    vec3 n = vec3(q, sqrt(max(0.0, 1.0 - l2))), L = normalize(vec3(-0.5, 0.72, 0.55));
    float dif = clamp((dot(n, L) + 0.12) / 1.12, 0.0, 1.0);
    // Farbe: fast schwarzes Karmin im Schatten, Rot, im Licht ein perliges Rosa; vTon.x: blasser (Perlmutt) bis satter; Funken weiss
    // (Wunsch vom 19. Oktober 2026: «farblich noch ein wenig mehr in Richtung Perlmutt-Schimmer»)
    vec3 tief = vec3(0.025, 0.0012, 0.003), mitte = mix(vec3(0.5, 0.035, 0.035), vec3(0.64, 0.15, 0.15), vTon.x), licht = mix(vec3(1.0, 0.44, 0.37), vec3(1.0, 0.7, 0.66), vTon.x);
    float perl = 1.0;
    if (vTon.w > 0.5) { tief = vec3(0.06); mitte = vec3(0.5, 0.48, 0.47); licht = vec3(1.3); perl = 0.0; }
    vec3 c = mix(tief, mitte, smoothstep(0.0, 0.55, dif));
    c = mix(c, licht, pow(smoothstep(0.5, 1.0, dif), 1.4));
    float rand = max(1.0 - n.z, 0.0);
    c += mitte * 0.45 * pow(rand, 2.5) * (0.35 + 0.65 * (1.0 - dif));  // Licht durch den Rand (wie Gelee), vor allem auf der Schattenseite
    // Perlmutt: Farben dünner Schichten (Interferenz) – der Ton wandert mit dem Blickwinkel zum Rand hin und über die Perle, je Perle verschoben;
    // am stärksten am Rand und im Licht, im Schatten nur ein Hauch
    float schicht = vTon.x * 0.7 + vTon.y * 0.4 + 1.1 * (1.0 - n.z) + 0.38 * dot(q, vec2(0.8, -0.6)) + 0.12 * sin(7.0 * q.x + 5.0 * q.y + vTon.x * 6.0);
    vec3 iri = 0.5 + 0.5 * cos(6.2832 * (schicht + vec3(0.0, 0.33, 0.67)));
    float fres = 0.18 + 0.82 * pow(rand, 1.6);
    c += perl * (iri - 0.35) * vec3(0.95, 0.88, 1.0) * 0.5 * fres * (0.15 + 0.85 * dif);
    c += perl * vec3(1.0, 0.86, 0.84) * 0.1 * pow(max(dot(n, L), 0.0), 3.0);   // der weiche Lüster des Perlmutts
    float rz = max(reflect(-L, n).z, 0.0);
    c += mix(vec3(1.0, 0.92, 0.9), 0.6 + 0.6 * iri, 0.35 * perl) * (0.22 * pow(rz, 10.0) + 1.4 * pow(rz, 80.0));
    c += vec3(1.0, 0.78, 0.76) * 0.12 * pow(rand, 4.0) * smoothstep(0.3, 0.9, dif);   // ein feuchter Glanz am Rand im Licht
    vec3 glut = vec3(1.0, 0.12, 0.05) * uGlut * vTon.y;
    c += glut * (0.35 + 0.8 * n.z) * 1.15;                                   // von innen glühend
    // unscharf: zur mittleren Farbe der Perle (der Glanzpunkt verläuft, vom Schimmer bleibt ein heller Hauch)
    vec3 mittel = mitte * 0.62 + licht * 0.24 + perl * vec3(0.06, 0.05, 0.07) + glut * 0.9;
    c = mix(c, mittel, smoothstep(0.0, 1.0, vB / (vR + vB)));
    c *= uHell * vTon.z;
    if (!(c.r + c.g + c.b >= 0.0)) discard;
    gl_FragColor = vec4(c * al, al);
  }`;
// nur die Tiefe, wo die Perle deckt (die Fäden dahinter fallen weg, die vorn bleiben)
const TIEFE_FRAGMENT = /* glsl */ `
  varying vec2 vQ; varying float vR, vB; varying vec4 vTon;
  ${DECKUNG}
  void main() { if (deckung(length(vQ)) < 0.55 || vTon.z < 0.05) discard; gl_FragColor = vec4(0.0); }`;

// die Fäden: k (Faden), u (0..1 entlang) → Welt; drei Formen und die Schlaufe
const FADEN_VERTEX = /* glsl */ `
  uniform sampler2D tSchlaufe; uniform vec3 uMitte; uniform float uS, uSaat, uKnall, uHell, uWirr, uWachs, uLogo, uRuhig, uApertur, uFokus, uPx, uGlut, uStill, uStrich; uniform int uArt;
  uniform vec2 uVersatz; attribute vec2 aRef; varying float vA; varying vec3 vFarbe;
  ${RAUSCHEN}
  vec3 hash3(float n) { return fract(sin(vec3(n * 12.9898, n * 78.233, n * 37.719)) * 43758.5453); }
  vec3 schlaufe(float f) {
    f = fract(f) * ${LN}.0; int i = int(floor(f));
    return mix(texelFetch(tSchlaufe, ivec2(i % ${LN}, 0), 0).xyz, texelFetch(tSchlaufe, ivec2((i + 1) % ${LN}, 0), 0).xyz, fract(f));
  }
  // Kugel: Bögen auf einer Kugel um die Traube, mit einer Welle quer dazu; ein Teil innen
  // in Strängen zu sieben: die Fäden eines Strangs laufen fast parallel (wie Haare), nicht jeder für sich
  vec3 kugel(float k, vec3 h, float u) {
    float st = floor(k / 7.0);
    vec3 a = hash3(st * 3.1 + 5.0 + uSaat), b = hash3(st * 7.3 + 1.0 + uSaat);
    vec3 ax = normalize(a * 2.0 - 1.0 + 0.12 * (h - 0.5) + 1e-3), e1 = normalize(cross(ax, abs(ax.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0))), e2 = cross(ax, e1);
    float w = b.x * 6.2832 + 0.35 * (h.x - 0.5) + u * (2.2 + 4.5 * b.y) + uS * 0.22 * (a.z - 0.5);
    vec3 p = cos(w) * e1 + sin(w) * e2 + ax * 0.3 * sin(w * (1.0 + floor(b.z * 3.0)) + a.x * 6.28 + uS * 0.2);
    return normalize(p) * (b.z < 0.78 ? 0.84 : 0.45 + 0.32 * a.y) * (1.0 + 0.025 * (h.y - 0.5)) * (1.0 + 0.06 * snoise(p * 1.6 + uS * 0.15));
  }
  void main() {
    float k = aRef.x, u = aRef.y;
    vec3 h = hash3(k + uSaat * 3.17), h2 = hash3(k * 1.37 + 11.0 + uSaat), p;
    if (uArt == 1) {
      // Säule: ein Trichter, eng in der Mitte, die Fäden schrauben sich hinauf
      float y = (u - 0.5) * 2.5, rho = (0.08 + 0.42 * y * y) * (0.6 + 0.7 * h.y);
      float w = h2.x * 6.2832 + y * (1.4 + 2.2 * h.z) + uS * (0.25 + 0.4 * h2.y);
      p = vec3(rho * cos(w), y, rho * sin(w));
    } else if (uArt == 2) {
      // Schwarm: Haare im Wasser, von einem Punkt aus mit der Strömung
      vec3 a = (hash3(k + 7.0 + uSaat) * 2.0 - 1.0) * vec3(1.5, 1.0, 1.5), d = normalize(hash3(k + 13.0) * 2.0 - 1.0 + vec3(0.0, 0.5, 0.0));
      p = a + d * u * (0.5 + 0.6 * h.x);
      p += u * 0.35 * vec3(snoise(p * 1.1 + vec3(0.0, 0.0, uS * 0.25)), snoise(p * 1.1 + vec3(9.0, 0.0, uS * 0.25)), snoise(p * 1.1 + vec3(0.0, 17.0, uS * 0.25)));
    } else p = kugel(k, h, u);
    // verwirrt: Rauschen aus der Zeit der Musik; der Bass reisst auf
    vec3 q = p * 2.6 + h * 10.0 + vec3(0.0, 0.0, uS * 0.45);
    p += uWirr * (0.03 + 0.05 * h.x) * vec3(snoise(q), snoise(q + vec3(17.0, 3.0, 0.0)), snoise(q + vec3(31.0, 7.0, 0.0)));
    p *= 1.0 + uKnall * (0.15 + 0.35 * h.y);
    p.y -= uStill * (0.3 + 0.4 * h.x) * u;                                   // in der Stille sinkt alles
    // das Logo: die Fäden winden sich als Strang um die Schlaufe (jeder ein Stück), erst wirr, dann glatt
    float zu = clamp(uLogo * 1.6 - h.x * 0.6, 0.0, 1.0); zu = zu * zu * (3.0 - 2.0 * zu);
    // ein Viertel der Fäden bleibt als weite Kugel um das Logo (wie im Vorbild um den Schriftzug), ruhig drehend
    bool huelle = h2.y > 0.75;
    if (zu > 0.0 && huelle) {
      float dw = uS * 0.05 + h.z; mat3 dreh = mat3(cos(dw), 0.0, -sin(dw), 0.0, 1.0, 0.0, sin(dw), 0.0, cos(dw));
      vec3 l = dreh * kugel(k, h, u) * 0.74 + uMitte;
      l += (1.0 - uRuhig) * 0.03 * vec3(snoise(l * 3.0 + uS * 0.3), snoise(l * 3.0 + vec3(5.0, 0.0, uS * 0.3)), 0.0);
      p = mix(p, l, zu);
    } else if (zu > 0.0) {
      float f = h2.x + u * (0.3 + 0.7 * h.y) * (h.z < 0.25 ? 1.0 : -1.0);
      vec3 s0 = schlaufe(f), s1 = schlaufe(f + 0.002); vec2 t = normalize(s1.xy - s0.xy + 1e-6);
      float wirr = 1.0 - uRuhig, dick = 0.0045 + 0.03 * wirr;
      vec3 l = s0 + vec3(-t.y, t.x, 0.0) * (h.z - 0.5 + 0.35 * sin(u * 40.0 + h.x * 6.0)) * dick + vec3(0.0, 0.0, (h2.z - 0.5) * dick);
      l += wirr * 0.05 * vec3(snoise(l * 5.0 + uS * 0.3), snoise(l * 5.0 + vec3(5.0, 0.0, uS * 0.3)), 0.0);
      p = mix(p, l, zu);
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_Position.xy += uVersatz * gl_Position.w;                           // fein() in buehne.js: um einen Pixel versetzt, mit 1/k des Lichts
    float d = -mv.z, b = uApertur * abs(d - uFokus) / uFokus, unscharf = b / (uPx * max(d, 0.01));
    float sicht = step(u, uWachs * (1.0 + h.x) ) * smoothstep(0.03, 0.15, d);
    // im Logo: der Strang hell und dünn (viele Fäden übereinander – sonst überstrahlt er alles), die Hülle schwach
    float imLogo = mix(1.0, huelle ? 0.38 : 0.16, zu);
    // die Enden blenden aus; sin(π · u) ist bei u = 1 knapp negativ, und pow einer negativen Zahl (wie pow(0, 0)) ist auf Telefonen NaN
    float enden = mix(sqrt(max(sin(3.14159 * u), 0.0)), 1.0, zu * (huelle ? 0.0 : 1.0));
    // gut zwei von fünf Strängen dezent (Wunsch: «die weissen Fäden dürften teilweise etwas dezenter sein»), nicht im Strang des Logos
    float dezent = mix(step(0.42, hash3(floor(k / 7.0) * 5.7 + 2.0 + uSaat).x) * 0.72 + 0.28, 1.0, zu * (huelle ? 0.0 : 1.0));
    vA = uStrich * uHell * imLogo * dezent * (0.45 + 0.9 * h2.z) * enden * sicht / (1.0 + 0.4 * unscharf);
    vFarbe = mix(vec3(0.95, 0.94, 0.93), vec3(1.0, 0.42, 0.34), clamp(step(0.86, h2.x) * 0.7 + uGlut * 0.6 * h.x, 0.0, 1.0) * (1.0 - zu));
  }`;
const FADEN_FRAGMENT = /* glsl */ `varying float vA; varying vec3 vFarbe; void main() { if (!(vA >= 0.0)) discard; gl_FragColor = vec4(vFarbe * vA, 1.0); }`;

// der Rauch: fleckiges Rauschen über das Bild (nur Flecken, sonst ein grauer Schleier), mit der Glut rötlich
const RAUCH_VERTEX = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const RAUCH_FRAGMENT = /* glsl */ `
  uniform float uS, uRauch, uSaat, uGlut, uA; varying vec2 vUv;
  ${RAUSCHEN}
  void main() {
    vec2 p = (vUv - 0.5) * vec2(uA, 1.0) * 1.7 + uSaat;
    vec3 q = vec3(p, uS * 0.06);
  #ifdef GROB
    // auf dem Telefon zwei statt fünf Rauschen je Bildpunkt (der Rauch kostete dort am meisten)
    vec2 w = vec2(0.0);
    float f = 0.75 * snoise(vec3(p, uS * 0.08)) + 0.35 * snoise(vec3(p * 2.3, uS * 0.11 + 5.0));
  #else
    vec2 w = vec2(snoise(q + 3.1), snoise(q + vec3(7.7, 1.3, 0.0))) * 0.55;
    float f = 0.6 * snoise(vec3(p + w, uS * 0.08)) + 0.3 * snoise(vec3((p + w) * 2.3, uS * 0.11 + 5.0)) + 0.15 * snoise(vec3(p * 5.1 + w, uS * 0.15));
  #endif
    float m = pow(smoothstep(0.12, 0.85, f), 1.7);
    gl_FragColor = vec4(mix(vec3(0.5, 0.52, 0.56), vec3(1.0, 0.22, 0.15), clamp(uGlut, 0.0, 1.0) * 0.7) * m * uRauch, 1.0);
  }`;

export function traube(g, teil) {
  const { renderer, A, B, H } = g, a = B / H;
  const G = phase(teil, "traube"), Lg = phase(teil, "logo"), St = phase(teil, "stille");
  const N = g.test ? 240 : g.grob ? 560 : 1120, F = g.test ? 70 : g.grob ? 160 : 300, P = g.test ? 70 : g.grob ? 110 : 160;
  const T = tonOderErsatz(g.ton);
  // die Zustände des Gewebes, aber höchstens etwa jede Sekunde ein Schnitt (bei einer Stimme gab es sonst fast bei jeder Silbe eine neue Einstellung),
  // der erste frühestens 1,4 s nach Beginn (die Traube wächst erst aus dem Dunkeln)
  const ZS = gewebeZustaende(T, G[0] + VOR, G[1] + VOR).reduce((a, z) => ((a.length ? z.t - a.at(-1).t : z.t - G[0] - VOR - 0.4) >= 1.0 ? [...a, z] : a), []).map((z, i) => ({ ...z, nr: i + 1 }));
  const mitBild = g.quelle !== "ton";
  const bau = traubenBau(N), z = bau.z, zeitDerTraube = traubenZeit(T.laut);

  // das Bild aus Perlen (mit einem Video, sein Standbild): die Umrisse wie in der Irrfahrt, auf 62 % verkleinert in der Bildebene
  let zeichen = null;
  if (mitBild) {
    const text = g.quelle === "text", feld = text ? A.hell.map((v) => 1 - v) : weichzeichnen(A.hell, A.w, A.h, 2.5);
    const k = gewebeKurven(feld, A.w, A.h, { stufen: text ? [0.5] : [0.4, 0.6], anzahl: 18, punkte: 160, maxLaenge: text ? 0.32 : 0.4 });
    const welt = (px, py) => [((px + 0.5) / A.w * 2 - 1) * a * 0.62, (1 - ((py + 0.5) / A.h) * 2) * 0.62];
    if (k.length) zeichen = perlenAufZuegen(k.map((c) => Array.from({ length: c.length / 2 }, (_, u) => [...welt(c[2 * u], c[2 * u + 1]), 0]).flat()), N, { r: text ? 0.011 : 0.013, abstand: 1.8, beeren: Math.round(N * 0.12), saat: 3 });
    if (zeichen && zeichen.anzahl < 20) zeichen = null;
  }
  // die Schlaufe des Signets: als Perlenschnur mit Beeren daneben, und als Pfad der Fäden
  const sw = schlaufeWelt(B, H, LN), logo = perlenAufZuegen([sw], Math.min(N, 150), { r: 0.017, abstand: 1.9, beeren: 30, saat: 9 });
  const sd = new Float32Array(LN * 4);
  for (let i = 0; i < LN; i++) sd.set([sw[i * 3], sw[i * 3 + 1], 0, 1], i * 4);
  const schlaufeTex = new THREE.DataTexture(sd, LN, 1, THREE.RGBAFormat, THREE.FloatType);
  schlaufeTex.minFilter = schlaufeTex.magFilter = THREE.NearestFilter; schlaufeTex.needsUpdate = true;
  let mx = 0, my = 0;
  for (let i = 0; i < LN; i++) { mx += sw[i * 3] / LN; my += sw[i * 3 + 1] / LN; }

  // Perlen: ein Viereck je Perle, die Lagen jedes Bild neu (sortiert)
  const pGeo = new THREE.InstancedBufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
  pGeo.setIndex([0, 1, 2, 0, 2, 3]);
  const aPos = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3), aR = new THREE.InstancedBufferAttribute(new Float32Array(N), 1), aTon = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4);
  for (const at of [aPos, aR, aTon]) at.setUsage(THREE.DynamicDrawUsage);
  pGeo.setAttribute("aPos", aPos); pGeo.setAttribute("aR", aR); pGeo.setAttribute("aTon", aTon); pGeo.instanceCount = N;
  const PU = { uApertur: { value: 0.02 }, uFokus: { value: 2.5 }, uPx: { value: 0.001 }, uGross: { value: 0.2 }, uHell: { value: 1 }, uGlut: { value: 0 } };
  const pMat = new THREE.ShaderMaterial({ vertexShader: PERLE_VERTEX, fragmentShader: PERLE_FRAGMENT, uniforms: PU, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendEquation: THREE.AddEquation });
  const tMat = new THREE.ShaderMaterial({ vertexShader: PERLE_VERTEX, fragmentShader: TIEFE_FRAGMENT, uniforms: PU, transparent: true, depthTest: true, depthWrite: true, colorWrite: false });
  // Fäden: F × (P − 1) Stücke
  const ref = new Float32Array(F * (P - 1) * 4);
  for (let k = 0, r = 0; k < F; k++) for (let i = 0; i < P - 1; i++, r += 4) ref.set([k, i / (P - 1), k, (i + 1) / (P - 1)], r);
  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((ref.length / 2) * 3), 3)); fGeo.setAttribute("aRef", new THREE.BufferAttribute(ref, 2));
  const FU = { tSchlaufe: { value: schlaufeTex }, uS: { value: 0 }, uSaat: { value: 0 }, uKnall: { value: 0 }, uHell: { value: 0.1 }, uWirr: { value: 1 }, uWachs: { value: 1 }, uLogo: { value: 0 },
    uRuhig: { value: 0 }, uApertur: PU.uApertur, uFokus: PU.uFokus, uPx: PU.uPx, uGlut: PU.uGlut, uStill: { value: 0 }, uArt: { value: 0 }, uMitte: { value: new THREE.Vector3(mx, my, 0) },
    uVersatz: { value: new THREE.Vector2() }, uStrich: { value: 1 } };
  const fMat = new THREE.ShaderMaterial({ vertexShader: FADEN_VERTEX, fragmentShader: FADEN_FRAGMENT, uniforms: FU, transparent: true, depthTest: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation });
  // Rauch über das ganze Bild, zuerst
  const RU = { uS: FU.uS, uRauch: { value: 0 }, uSaat: { value: 0 }, uGlut: PU.uGlut, uA: { value: a } };
  const rMat = new THREE.ShaderMaterial({ vertexShader: RAUCH_VERTEX, fragmentShader: RAUCH_FRAGMENT, uniforms: RU, defines: g.grob ? { GROB: 1 } : {}, transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation });
  const flaeche = new THREE.PlaneGeometry(2, 2);
  const szene = new THREE.Scene();
  const faeden = new THREE.LineSegments(fGeo, fMat);
  [[new THREE.Mesh(flaeche, rMat), 0], [new THREE.Mesh(pGeo, pMat), 1], [new THREE.Mesh(pGeo, tMat), 2], [faeden, 3]].forEach(([o, r]) => { o.frustumCulled = false; o.renderOrder = r; szene.add(o); });
  const kam = kamera(B, H);

  // Zustände: Art und Wurf; der Schnitt (Lage) wechselt mit dem Zustand
  // mit einem Video: der zweite Zustand und dann etwa jeder sechste zeigt das Bild aus Perlen
  const zustand = (zs) => ({ art: zeichen && zs.nr && (zs.nr === 2 || h1(zs.nr, 9) < 0.16) ? "zeichen" : artBei(zs.nr), saat: zs.nr * 7 + 3 });
  const stand = (tau) => {
    const film = tau + VOR, istLogo = !!Lg && tau >= Lg[0], zs = zustandBei(ZS, istLogo ? Lg[0] + VOR - 1e-3 : film, G[0] + VOR);
    return { film, istLogo, zs };
  };
  const blitze = T.schnitte;
  const lage = new Float32Array(N * 5), ordnung = new Uint32Array(N), tiefe = new Float32Array(N), groesse = new THREE.Vector2();
  const vonV = new THREE.Vector3(), zuV = new THREE.Vector3(), blick = new THREE.Vector3();

  return {
    tiefe: true,                                                             // die Bühne gibt ein Ziel mit Tiefenpuffer (die Fäden hinter den Perlen)
    lage(tau) { const s = stand(tau); return s.istLogo ? "logo" : `${s.zs.nr}`; },
    render(rt, tau) {
      const { film, istLogo, zs } = stand(tau), Z = zustand(zs);
      const laut = wert(T.laut, film), stoss = wert(T.stoss, film), tief = wert(T.stossTief, film), hoch = wert(T.stossHoch, film), tor = wert(T.tor, film);
      const s = wert(zeitDerTraube, film);                                  // gleichmässig, laut sanft schneller (traubenZeit)
      const seit = istLogo ? tau - Lg[0] : zs.nr ? film - zs.t0 : Math.max(0, tau);
      const wachs = weich(anteil(tau, 0, 0.9)), still = St ? weich(anteil(tau, St[0], St[1] - 0.3)) : 0;
      const zuLogo = istLogo ? weich(anteil(seit, 0, 1.5)) : 0, ruhig = istLogo ? weich(anteil(seit, 1.3, 2.8)) : 0;
      const blitz = blitze.reduce((m, x) => (film >= x ? Math.max(m, Math.exp(-(film - x) / 0.18)) : m), 0) * (1 - zuLogo);
      const glut = (0.18 * laut + 0.95 * tief + 0.45 * stoss * stoss + 0.8 * blitz) * (1 - 0.75 * ruhig) * (1 - still);

      // die Kamera: die Einstellung des Zustands, beim Schlag ein kleiner Ruck nach vorn (der Schwung um die Mitte bei jedem kräftigen Einsatz ist
      // weg: zusammen mit den Sätzen der Zeit wirkte es ruckelnd); zum Logo gerade von vorn
      const zeichenArt = Z.art === "zeichen", E = zeichenArt ? { pos: [0.25 * Math.sin(seit * 0.2), 0.05, ABSTAND * 0.98 - 0.04 * seit], ziel: [0, 0, 0], fokus: ABSTAND * 0.98, apertur: 0.02 } : einstellung(Z, seit);
      vonV.fromArray(E.pos); zuV.fromArray(E.ziel); blick.subVectors(vonV, zuV);
      blick.multiplyScalar(1 - 0.04 * stoss * (1 - zuLogo));
      vonV.addVectors(zuV, blick);
      let fokus = E.fokus * (1 - 0.04 * stoss), apertur = E.apertur;
      if (istLogo) {
        // von der letzten Einstellung gerade vor die Bildebene (dort steht die Schlaufe genau wie im Signet)
        vonV.lerp(new THREE.Vector3(0, 0, ABSTAND), zuLogo); zuV.lerp(new THREE.Vector3(0, 0, 0), zuLogo);
        fokus = fokus + (ABSTAND - fokus) * zuLogo; apertur = apertur + (0.004 - apertur) * zuLogo;
      }
      kam.position.copy(vonV); kam.up.set(0, 1, 0); kam.lookAt(zuV); kam.updateMatrixWorld();
      renderer.getSize(groesse);
      PU.uPx.value = (2 * Math.tan(THREE.MathUtils.degToRad(FOV / 2))) / groesse.y; PU.uFokus.value = fokus; PU.uApertur.value = apertur;
      PU.uGross.value = 0.33 * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * 2;

      // die Perlen: Lage des Zustands (oder das Bild aus Perlen), Keim, Logo, Stille
      const knall = (0.55 * tief + 0.12 * stoss + 0.25 * blitz) * (1 - zuLogo), puls = stoss * (1 - 0.7 * ruhig);
      perlenLegen(bau, zeichenArt ? { art: "kugel", saat: Z.saat } : Z, s, lage, { knall, puls, laut });
      const cx = kam.position.x, cy = kam.position.y, cz = kam.position.z, f = new THREE.Vector3(); kam.getWorldDirection(f);
      for (let i = 0; i < N; i++) {
        const o = i * 5, zi = i * 8;
        if (zeichenArt) {
          // das Bild aus Perlen: die Perlen auf den Umrissen schweben leicht und atmen mit dem Ton; die übrigen sind Funken oder vergehen
          const zl = zeichen.lage, rz = zl[i * 4 + 3], kn = 1 + knall * 0.35 * z[zi + 5];
          if (rz > 0) {
            lage[o] = (zl[i * 4] + 0.006 * Math.sin(s * 1.3 + z[zi] * 6.28)) * kn; lage[o + 1] = (zl[i * 4 + 1] + 0.006 * Math.sin(s * 1.1 + z[zi + 1] * 6.28)) * kn;
            lage[o + 2] = zl[i * 4 + 2] + (z[zi + 2] - 0.5) * 0.03; lage[o + 3] = rz * (1 + 0.5 * puls * z[zi + 4]); lage[o + 4] = 0;
          } else if (lage[o + 4] < 0.5) lage[o + 3] = 0;
        }
        // der Keim: aus der Mitte wachsend, die Perlen erscheinen nacheinander
        if (wachs < 1) { const w = 0.35 + 0.65 * wachs; lage[o] *= w; lage[o + 1] *= w; lage[o + 2] *= w; lage[o + 3] *= weich(anteil(tau, 0.02 + 0.45 * z[zi + 6], 0.3 + 0.45 * z[zi + 6])); }
        if (still > 0) { lage[o + 1] -= still * (0.25 + 0.5 * z[zi + 6]); lage[o + 3] *= 1 - weich(anteil(still, 0.2 + 0.5 * z[zi + 6], 0.6 + 0.4 * z[zi + 6])); }
        if (zuLogo > 0) {
          // aufgefädelt auf die Schlaufe – nacheinander; wer keinen Platz hat, treibt hinaus und vergeht (Funken bleiben noch einen Moment)
          const zl = logo.lage, rz = i < logo.anzahl ? zl[i * 4 + 3] : 0, u = weich(anteil(zuLogo, 0.45 * z[zi + 6], 0.55 + 0.45 * z[zi + 6]));
          if (rz > 0) {
            const wirr = 1 - ruhig;
            lage[o] += (zl[i * 4] + wirr * 0.01 * Math.sin(s * 2 + z[zi] * 6.28) - lage[o]) * u; lage[o + 1] += (zl[i * 4 + 1] + wirr * 0.01 * Math.sin(s * 1.7 + z[zi + 1] * 6.28) - lage[o + 1]) * u; lage[o + 2] += (zl[i * 4 + 2] - lage[o + 2]) * u;
            lage[o + 3] += (rz * (1 + 0.35 * stoss * z[zi + 4]) - lage[o + 3]) * u; lage[o + 4] = 0;
          } else {
            const w = 1 + 1.4 * u; lage[o] *= w; lage[o + 1] *= w; lage[o + 2] = lage[o + 2] * w + 1.2 * u;
            lage[o + 3] *= 1 - weich(anteil(zuLogo, 0.3 + 0.4 * z[zi + 6], 0.7 + 0.3 * z[zi + 6]));
          }
        }
        ordnung[i] = i;
        tiefe[i] = (lage[o] - cx) * f.x + (lage[o + 1] - cy) * f.y + (lage[o + 2] - cz) * f.z;
      }
      ordnung.sort((p, q) => tiefe[q] - tiefe[p]);                          // hinten zuerst
      const ap = aPos.array, ar = aR.array, at = aTon.array;
      for (let n = 0; n < N; n++) {
        const i = ordnung[n], o = i * 5, zi = i * 8, d = tiefe[i];
        ap[n * 3] = lage[o]; ap[n * 3 + 1] = lage[o + 1]; ap[n * 3 + 2] = lage[o + 2]; ar[n] = Math.max(0, lage[o + 3]);
        const funke = lage[o + 4] > 0.5, r2 = lage[o] ** 2 + lage[o + 1] ** 2 + lage[o + 2] ** 2;
        // Glut: innen mehr; Dunkel: was weit hinter der Schärfe liegt, versinkt (Luftperspektive), jede Perle etwas anders
        at[n * 4] = z[zi + 1] ** 2; at[n * 4 + 1] = (Math.exp(-r2 * 3.5) * 0.3 + 0.1 + 0.7 * z[zi + 2] ** 3) * (funke ? 0 : 1);
        at[n * 4 + 2] = (funke ? 0.5 + 2.5 * hoch * (z[zi + 3] > 0.5 ? 1 : 0.3) : 0.62 + 0.38 * z[zi + 4]) * Math.exp(-Math.max(0, d - fokus) * 0.55);
        at[n * 4 + 3] = funke ? 1 : 0;
      }
      for (const at2 of [aPos, aR, aTon]) at2.needsUpdate = true;

      // das Tor: zwischen den Schlägen dunkler, nie ganz schwarz; ein Blitz bei den stärksten
      const hell = (0.32 + 0.5 * tor + 0.22 * stoss + 0.35 * blitz) * (0.55 + 0.45 * wachs) * (1 - 0.85 * still) * (1 - zuLogo + zuLogo * (1 + 0.1 * stoss));
      PU.uHell.value = hell; PU.uGlut.value = glut;
      // die Fäden
      FU.uArt.value = Z.art === "saeule" ? 1 : Z.art === "schwarm" ? 2 : 0; FU.uSaat.value = zeichenArt ? 0 : (Z.saat % 97) * 0.37; FU.uS.value = s;
      FU.uKnall.value = knall; FU.uWirr.value = (0.6 + 1.6 * laut + 1.3 * stoss) * (1 - ruhig); FU.uWachs.value = wachs; FU.uLogo.value = zuLogo; FU.uRuhig.value = ruhig; FU.uStill.value = still;
      FU.uHell.value = (75 / F) * (0.3 + 0.55 * tor + 0.5 * hoch + 0.3 * stoss) * (0.4 + 0.6 * wachs) * (1 - still) * (zeichenArt ? 0.6 : Z.art === "kugel" ? 0.75 : 1) * (1 - 0.55 * zuLogo);
      RU.uRauch.value = (0.02 + 0.05 * laut + 0.04 * tief) * wachs * (1 - still) * (1 - 0.9 * zuLogo); RU.uSaat.value = h1(Z.saat, 1) * 20;

      g.loeschen(rt, 0x000000);
      renderer.setRenderTarget(rt);
      g.fein(szene, kam, [faeden]);
      return { aktiv: 0.85 * (1 - ruhig) + 0.1, bloom: (0.22 + 0.3 * stoss + 0.8 * glut) * (1 - 0.75 * zuLogo), radius: 0.55 + 0.25 * blitz, saum: 0.0012 * (1 - ruhig), ende: 0, umkehr: 0 };
    },
    vorab: { szenen: [[szene, kam]], materialien: [] },
    zaehler(tau) {
      const film = tau + VOR, n = T.einsaetze.filter((e) => e.t <= film).length, zs = zustandBei(ZS, film, G[0] + VOR);
      return `zustand ${zs.nr} / ${ZS.length} · ${zustand(zs).art} · perlen ${N} · ${T.echt ? `einsatz ${n} / ${T.einsaetze.length}` : "ohne ton"}`;
    },
    entsorgen() { pGeo.dispose(); fGeo.dispose(); flaeche.dispose(); pMat.dispose(); tMat.dispose(); fMat.dispose(); rMat.dispose(); schlaufeTex.dispose(); },
  };
}
