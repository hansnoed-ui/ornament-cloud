// PHORMA III – Irrfahrt: ein leuchtender Faden irrt durch einen Würfel aus Licht (Wunsch vom 18. Oktober 2026 nach einem Video: im Drahtwürfel ein
// dünner Zufallsweg, der bei lauten Stellen zu dichten, leuchtenden Rauchbündeln aufquillt und in der Stille wieder zum Faden wird; der Würfel
// springt mit den Schlägen in eine neue Lage – «gerne viiiiiel krasser»).
//   Der Weg: je Zustand ein eigener Zufallsweg im Würfel (kleine Schritte mit seltenen Sprüngen, an den Wänden gespiegelt), vorab gerechnet und als
//   Textur abgelegt; sichtbar ist ein Stück hinter seinem Kopf, der mit der Musik schneller läuft.
//   Das Bündel: S Fäden auf demselben Weg, je Faden ein eigenes Rauschen und eine eigene Verzögerung; leise liegen sie aufeinander (ein heller Faden),
//   laut quellen sie zu Rauch auf, der Bass reisst sie auseinander, die Höhen werfen Funken. Additiv, darüber Bloom.
//   Krasser als das Vorbild: bei jedem kräftigen Einsatz ein harter Schnitt – neuer Weg, neue Lage des Würfels, manchmal mitten in ihm –,
//   Zoomstoss beim Schlag, bei Schnitten kurz Negativ; der Würfel immer scharf und ohne Echos; mit Text, Foto oder Video schreibt der Faden manchmal deren Umrisse in den Raum.
//   01 Würfel (er zeichnet sich, der Faden beginnt) → 02 Irrfahrt → 03 Logo (der Faden legt sich zur Schlaufe des Signets, film.js tippt den
//   Schriftzug) oder 03 Stille (der Faden zieht sich in seinen Kopf zusammen).
// Zustandslos: alles hängt nur von der Zeit ab (Bewegungsunschärfe, Spulen, Video Bild für Bild).
import * as THREE from "three";
import { anteil, weich } from "./gemeinsam.js?v=16";
import { phase } from "./ablauf.js?v=16";
import { gewebeKurven } from "./kurven.js?v=16";
import { weichzeichnen } from "./analyse.js?v=16";
import { tonOderErsatz, wert, gewebeZustaende, zustandBei } from "./ton.js?v=16";
import { RAUSCHEN } from "./gewebe.js?v=16";
import { PN, irrweg, verbinden, zufallsfolge } from "./irrweg.js?v=16";

const VOR = 0.4;

// das Abbild: der Würfel steht immer in der Mitte vor der Kamera und wird erst im Bild verschoben (uLage.xy) und gezoomt (uLage.w) – so sieht jeder
// Würfel, auch jeder der drei nebeneinander, von vorn auf seine Achse und wird nie schief (vorher lag der Versatz im Raum: seitliche Würfel wurden
// schräg angeschnitten; Rückmeldung: «die Würfel bei der Irrfahrt: bitte nicht verzogen»)
const ABBILD = /* glsl */ `vec4 abbild(vec3 p) { vec4 c = projectionMatrix * modelViewMatrix * vec4(p, 1.0); c.xy = (c.xy + uLage.xy * c.w) * uLage.w; return c; }`;
const PFAD = /* glsl */ `
  uniform sampler2D tPfad; uniform int uZeile; uniform float uKopf, uSchritt, uL, uAmp, uKnall, uDicke, uZeit, uMusik, uHell, uSchwanz;
  uniform mat3 uDreh; uniform vec4 uLage;
  ${RAUSCHEN}
  vec3 hash3(float n) { return fract(sin(vec3(n * 12.9898, n * 78.233, n * 37.719)) * 43758.5453); }
  vec3 pfad(float f) {
    f = clamp(f, 0.0, ${PN - 1}.0); int i = int(floor(f));
    return mix(texelFetch(tPfad, ivec2(i, uZeile), 0).xyz, texelFetch(tPfad, ivec2(min(i + 1, ${PN - 1}), uZeile), 0).xyz, fract(f));
  }
  /** Faden k an der Stelle i (0: Ende des sichtbaren Stücks, uL: Kopf), in Weltkoordinaten; sicht 0..1 */
  vec3 faden(float k, float i, out float sicht) {
    vec3 hk = hash3(k + 1.0);
    float r = i / uL, f = uKopf - (uL - i) * uSchritt - hk.x * uAmp * 90.0 * max(uSchritt, 1.0);
    sicht = step(0.0, f) * smoothstep(0.0, uSchwanz, r);                     // das Ende blendet aus (nicht bei Umriss und Logo)
    // Rauch: zwei Oktaven Rauschen je Faden – die grobe hält das Bündel als Wolke beisammen, die feine macht die Haare
    // uMusik: die Zeit der Musik – zwischen den Schlägen zieht der Rauch langsam, beim Schlag wirbelt er
    vec3 p = pfad(f), q = p * 6.0 + hk * 40.0 + vec3(0.0, 0.0, uMusik), q2 = p * 17.0 + hk * 23.0 + vec3(uMusik * 1.6, 0.0, 0.0);
    vec3 n = vec3(snoise(q), snoise(q + vec3(17.0, 3.0, 0.0)), snoise(q + vec3(31.0, 7.0, 0.0)))
           + 0.4 * vec3(snoise(q2), snoise(q2 + vec3(5.0, 11.0, 0.0)), snoise(q2 + vec3(9.0, 2.0, 0.0)));
    float w = uAmp * (0.15 + 1.2 * hk.y * hk.y) * mix(0.4, 1.0, r) * (1.0 + uKnall * 1.5 * hk.z);
    p += w * n + uDicke * (hk - 0.5);
    return uDreh * p;
  }
  ${ABBILD}`;
const FADEN_VERTEX = /* glsl */ `
  ${PFAD}
  attribute vec2 aRef; varying float vA;
  void main() {
    float sicht; vec3 p = faden(aRef.x, aRef.y, sicht);
    gl_Position = abbild(p);
    vA = uHell * sicht * (1.0 + 0.5 * smoothstep(0.92, 1.0, aRef.y / uL));          // der Kopf leuchtet etwas heller
  }`;
const FUNKEN_VERTEX = /* glsl */ `
  ${PFAD}
  uniform float uFunken, uPunkt; attribute vec2 aRef; varying float vA;
  void main() {
    float sicht; vec3 p = faden(aRef.x, aRef.y, sicht);
    gl_Position = abbild(p);
    float an = step(0.55, fract(sin(aRef.x * 91.7 + aRef.y * 3.1 + floor(uZeit * 30.0) * 13.3) * 4375.85));   // flackern, jedes Bild andere
    gl_PointSize = uPunkt * (1.0 + 3.0 * hash3(aRef.x + aRef.y).x);
    vA = uFunken * sicht * an;
  }`;
// der Würfel: dicke Kanten wie im Vorbild (je Kante ein Band aus zwei Dreiecken, quer zur Kante im Bild verbreitert, uDicke Punkte halb), statt
// Haarlinien; uTiefe: wie hell die hinteren Kanten bleiben (ein wenig dunkler gibt dem Auge die Tiefe, ganz dunkel wirkte er unvollständig)
const WUERFEL_VERTEX = /* glsl */ `
  uniform mat3 uDreh; uniform vec4 uLage; uniform float uZeichnen, uWuerfel, uZeit, uDicke, uTiefe; uniform vec2 uSeiten;
  attribute vec3 aA, aB; attribute vec2 aT; varying float vA, vS;   // aT.x: 0 Anfang / 1 Ende der Kante, aT.y: −1 / 1 die Seite des Bands
  ${ABBILD}
  void main() {
    vec3 ra = uDreh * aA, rb = uDreh * mix(aA, aB, uZeichnen);
    vec4 ca = abbild(ra), cb = abbild(rb);
    vec2 d = (cb.xy / cb.w - ca.xy / ca.w) * uSeiten; float l = length(d); d = l > 1e-4 ? d / l : vec2(1.0, 0.0);
    vec4 c = aT.x < 0.5 ? ca : cb; vec3 r = aT.x < 0.5 ? ra : rb;
    c.xy += (vec2(-d.y, d.x) * aT.y + d * (aT.x * 2.0 - 1.0)) * uDicke / uSeiten * c.w;   // quer und ein wenig über die Ecken hinaus
    gl_Position = c;
    vS = aT.y;
    vA = uWuerfel * 0.9 * mix(uTiefe, 1.0, pow(clamp(r.z / 0.866 * 0.5 + 0.5, 0.0, 1.0), 1.3));
  }`;
const KANTE = /* glsl */ `varying float vA, vS; void main() { gl_FragColor = vec4(vec3(vA * (1.0 - smoothstep(0.35, 1.0, abs(vS)))), 1.0); }`;
const FRAGMENT = /* glsl */ `varying float vA; void main() { gl_FragColor = vec4(vec3(vA), 1.0); }`;
const FUNKE = /* glsl */ `varying float vA; void main() { vec2 d = gl_PointCoord - 0.5; float m = smoothstep(0.5, 0.0, length(d)); gl_FragColor = vec4(vec3(vA * m), 1.0); }`;

/**
 * fest (die Variante «Lichtwürfel», seit 19. Oktober 2026; Wunsch: «eine weitere Variante der Irrfahrt, aber mit einem stehen bleibenden und einfach
 * rotierenden Würfel und weniger verblendeten Spuren, wie zu Anfang»): ein Würfel in der Mitte, er dreht sich gleichmässig und springt nie – keine
 * neue Lage beim Schlag, kein Zoomstoss, keine drei Würfel, kein Negativ; der Faden quillt weniger auf und leuchtet weniger, wenig Bloom.
 */
export function irrfahrt(g, teil, { fest = false } = {}) {
  const { renderer, A, B, H } = g, a = B / H;
  const W = phase(teil, "wuerfel"), G = phase(teil, "irrfahrt"), Lg = phase(teil, "logo"), St = phase(teil, "stille");
  const S = g.test ? 10 : g.grob ? 56 : 120, L = g.test ? 160 : g.grob ? 520 : 900, NF = g.test ? 300 : g.grob ? 2500 : 6000;
  const T = tonOderErsatz(g.ton);
  const ZS = gewebeZustaende(T, G[0] + VOR, G[1] + VOR), mitBild = g.quelle !== "ton";
  const zufall = (j, n) => { const x = Math.sin(j * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };

  // Wege: je Zustand einer (höchstens 48, dann wiederholt), dazu die Umrisse des Bilds und die Schlaufe des Signets
  const ZR = Math.min(48, ZS.length + 1), zeilen = Array.from({ length: ZR }, (_, j) => irrweg(j + 1));
  const welt = (px, py) => [((px + 0.5) / A.w * 2 - 1) * a, 1 - ((py + 0.5) / A.h) * 2];
  let textZeile = -1;
  if (mitBild) {
    const text = g.quelle === "text", feld = text ? A.hell.map((v) => 1 - v) : weichzeichnen(A.hell, A.w, A.h, 2.5);
    const k = gewebeKurven(feld, A.w, A.h, { stufen: text ? [0.5] : [0.4, 0.6], anzahl: 18, punkte: 120, maxLaenge: text ? 0.32 : 0.4 });
    if (k.length) {
      const r = zufallsfolge(5);
      textZeile = zeilen.length;
      zeilen.push(verbinden(k.map((c) => Array.from({ length: c.length / 2 }, (_, u) => { const [x, y] = welt(c[2 * u], c[2 * u + 1]); return [x * 0.6, y * 0.6, (r() - 0.5) * 0.02]; }).flat())));
    }
  }
  let logoZeile = -1;
  if (Lg) {
    // dieselbe Kurve wie in sketchory/signet.js, gezeichnet für 1080 × 1920, mittig auf B × H (wie die Schlaufe im Gewebe; auch quer)
    const pk = (t) => { const r = 0.45 + Math.cos(t); return [1.2 * r * Math.cos(t) - 0.84, 1.2 * r * Math.sin(t)]; };
    const roh = Array.from({ length: 721 }, (_, i) => pk((i / 720) * Math.PI * 2)), xs = roh.map((q) => q[0]), ys = roh.map((q) => q[1]);
    const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2, sp = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    logoZeile = zeilen.length;
    zeilen.push(verbinden([roh.flatMap(([x, y]) => { const px = B / 2 + (x - mx) * (420 / sp), py = 870 + (y - my) * (420 / sp) + (H - 1920) / 2; return [(px / B * 2 - 1) * a, 1 - (py / H) * 2, 0]; })]));
  }
  const pd = new Float32Array(PN * 4 * zeilen.length);
  zeilen.forEach((z, i) => pd.set(z, i * PN * 4));
  const pfadTex = new THREE.DataTexture(pd, PN, zeilen.length, THREE.RGBAFormat, THREE.FloatType);
  pfadTex.minFilter = pfadTex.magFilter = THREE.NearestFilter; pfadTex.needsUpdate = true;

  const U = { tPfad: { value: pfadTex }, uZeile: { value: 0 }, uKopf: { value: 0 }, uSchritt: { value: 1 }, uL: { value: L }, uAmp: { value: 0 }, uKnall: { value: 0 },
    uDicke: { value: 0 }, uZeit: { value: 0 }, uMusik: { value: 0 }, uSchwanz: { value: 0.25 }, uHell: { value: 1 }, uDreh: { value: new THREE.Matrix3() }, uLage: { value: new THREE.Vector4(0, 0, 0, 1) } };
  const plus = { depthTest: false, depthWrite: false, transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation };
  // die Fäden: S × (L − 1) Stücke
  const ref = new Float32Array(S * (L - 1) * 4);
  let r = 0;
  for (let k = 0; k < S; k++) for (let i = 0; i < L - 1; i++) { ref.set([k, i, k, i + 1], r); r += 4; }
  const fGeo = new THREE.BufferGeometry();
  fGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array((ref.length / 2) * 3), 3)); fGeo.setAttribute("aRef", new THREE.BufferAttribute(ref, 2));
  const fMat = new THREE.ShaderMaterial({ vertexShader: FADEN_VERTEX, fragmentShader: FRAGMENT, uniforms: U, ...plus });
  // die Funken: NF Punkte an zufälligen Stellen der Fäden
  const fr = zufallsfolge(77), fref = Float32Array.from({ length: NF * 2 }, (_, i) => (i % 2 ? fr() * L : Math.floor(fr() * S)));
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NF * 3), 3)); pGeo.setAttribute("aRef", new THREE.BufferAttribute(fref, 2));
  const pMat = new THREE.ShaderMaterial({ vertexShader: FUNKEN_VERTEX, fragmentShader: FUNKE, uniforms: { ...U, uFunken: { value: 0 }, uPunkt: { value: 2 } }, ...plus });
  // der Würfel: zwölf Kanten
  const ecken = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map((e) => e.map((v) => v * 0.5));
  const kanten = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const wa = [], wb = [], wt = [];
  for (const [i, j] of kanten) for (const [t, seite] of [[0, -1], [1, -1], [1, 1], [0, -1], [1, 1], [0, 1]]) { wa.push(...ecken[i]); wb.push(...ecken[j]); wt.push(t, seite); }
  const wGeo = new THREE.BufferGeometry();
  wGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(wa.length), 3));
  wGeo.setAttribute("aA", new THREE.BufferAttribute(new Float32Array(wa), 3)); wGeo.setAttribute("aB", new THREE.BufferAttribute(new Float32Array(wb), 3)); wGeo.setAttribute("aT", new THREE.BufferAttribute(new Float32Array(wt), 2));
  const wMat = new THREE.ShaderMaterial({ vertexShader: WUERFEL_VERTEX, fragmentShader: KANTE, ...plus,
    uniforms: { uDreh: U.uDreh, uLage: U.uLage, uZeit: U.uZeit, uZeichnen: { value: 0 }, uWuerfel: { value: 1 }, uDicke: { value: 1.5 }, uTiefe: { value: fest ? 0.6 : 0.5 }, uSeiten: { value: new THREE.Vector2(1, 1) } } });
  // der Würfel in einer eigenen Szene: er wird scharf gezeichnet (nur in der letzten Probe des Bilds, nach dem Bloom), der Faden mit Bewegungsunschärfe
  const szene = new THREE.Scene(), wSzene = new THREE.Scene();
  for (const o of [new THREE.LineSegments(fGeo, fMat), new THREE.Points(pGeo, pMat)]) { o.frustumCulled = false; szene.add(o); }
  { const o = new THREE.Mesh(wGeo, wMat); o.frustumCulled = false; wSzene.add(o); }
  // das Objektiv wie im Vorbild (35°, die vordere Kante gut anderthalbmal so lang wie die hintere): mit dem langen Objektiv (15°) fehlte die Perspektive
  // fast ganz, und ein drehender Drahtwürfel kippt dann für das Auge – er schien sich zu verziehen (Rückmeldung: «die Würfel bei der Irrfahrt: bitte
  // nicht verzogen»). Die Bildebene z = 0 füllt das Bild wie im Gewebe; der Zoom und der Versatz geschehen im Bild (ABBILD), nicht im Raum.
  const kam = new THREE.PerspectiveCamera(35, B / H, 0.1, 100);
  kam.position.set(0, 0, 1 / Math.tan(THREE.MathUtils.degToRad(17.5)));
  // nur kräftige Einsätze, frühestens alle 0,4 s, werfen den Würfel herum: eine Stimme hat fast bei jeder Silbe einen Einsatz, und die vielen
  // Sprünge liessen ihn verzogen wirken (Rückmeldung: «würfel noch immer verzogen»)
  const ein = [];
  for (const e of T.einsaetze) if (e.staerke >= 0.6 && (!ein.length || e.t - ein.at(-1) >= 0.4)) ein.push(e.t);
  // die Ausbrüche des Lichtwürfels (Wunsch vom 19. Oktober 2026: «an einigen Stellen noch etwas raumgreifender verfrickelt, damit es mehr Dynamik
  // hat»): an etwa jedem zweiten kräftigen Einsatz schiesst der Faden ein Stück weiter, seine Spur wird lang und zieht quer durch den Würfel, die
  // Fäden spreizen sich – in gut einer Sekunde legt es sich wieder; der Würfel bleibt stehen
  const ausbrueche = fest ? ein.filter((t, i) => zufall(i + 1, 21) < 0.5) : [];
  const ausbruchBei = (film) => {
    let b = 0, weiter = 0;
    for (const tb of ausbrueche) {
      if (tb > film) break;
      const d = film - tb;
      b = Math.max(b, Math.exp(-d / 0.55) * Math.min(1, d / 0.06));
      weiter += 900 * (1 - Math.exp(-d / 0.35));                              // so weit ist der Kopf dabei vorausgeschossen (Punkte des Wegs)
    }
    return { b, weiter };
  };
  const groesse = new THREE.Vector2(), drehM = new THREE.Matrix4(), e3 = new THREE.Euler(), q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion();
  const helle = 3.4 / S;                                                     // aufeinander ein heller Strich, aufgequollen rauchig

  /** der Stand zur Zeit tau: Zustand und die Zahl der kräftigen Einsätze darin – wechselt eins, springt das Bild (Lage, Weg) */
  const stand = (tau) => {
    const film = tau + VOR, logo = !!Lg && tau >= Lg[0], zs = zustandBei(ZS, logo ? Lg[0] + VOR - 1e-3 : film, G[0] + VOR);
    return { film, logo, zs, nr: logo ? 0 : ein.filter((t) => t > zs.t0 + 0.02 && t <= film).length };
  };

  return {
    /** Schlüssel der Lage: die Bewegungsunschärfe mischt nur Proben derselben Lage (sonst lagen bei einem Sprung zwei Würfel übereinander) */
    lage(tau) { const s = stand(tau); return s.logo ? "logo" : fest ? `${s.zs.nr}` : `${s.zs.nr}:${s.nr}`; },   // der Lichtwürfel springt nur mit dem Weg
    /** scharf: die letzte Probe des Bilds zeichnet den Würfel, mit gewicht (der Zahl der Proben), damit er nach dem Mitteln so hell ist wie ohne Unschärfe */
    render(rt, tau, { scharf = true, gewicht = 1 } = {}) {
      const { film, logo, zs, nr } = stand(tau), still = St ? weich(anteil(tau, St[0], St[1] - 0.5)) : 0, j = zs.nr;
      const laut = wert(T.laut, film), stoss = wert(T.stoss, film), tief = wert(T.stossTief, film), hoch = wert(T.stossHoch, film), dreh = wert(T.dreh, film);
      const seit = logo ? tau - Lg[0] : j ? film - zs.t0 : Math.max(0, tau);
      const zeichen = zs.zeichen && textZeile >= 0 && !logo && tau >= G[0];
      const ruhig = logo ? weich(anteil(seit, 1.6, 2.8)) : 0;
      // der Weg und sein Kopf: auf dem Zufallsweg läuft er mit der Musik schneller; Umrisse und Schlaufe zeichnen sich ganz, in 0,6 s
      let zeile = j % ZR, kopf, schritt = 1;
      if (logo || zeichen) {
        zeile = logo ? logoZeile : textZeile;
        kopf = (PN - 1) * weich(Math.min(1, seit / (logo ? 1.0 : 0.6))); schritt = Math.max(0.02, kopf / L);
      } else kopf = 30 + seit * (260 + 520 * laut);
      const aus = fest && !logo && !zeichen ? ausbruchBei(film) : { b: 0, weiter: 0 };
      if (!logo && !zeichen) {
        // beim Ausbruch: der Kopf schiesst voraus (nur was seit dem Beginn des Zustands geschah) und die Spur wird bis fünfmal so lang
        if (aus.weiter) kopf += aus.weiter - (j ? ausbruchBei(zs.t0).weiter : 0);
        kopf = Math.min(PN - 1, kopf); schritt *= 1 + 4 * aus.b;
      }
      schritt *= 1 - 0.97 * still;                                             // in der Stille zieht sich der Faden in seinen Kopf zusammen
      const auf = weich(anteil(tau, 0, W[1]));
      // die Animation im Würfel – Faden, Rauch, Funken, Belichtung – wieder wie in der ersten Fassung (Rückmeldung: «am Anfang war sie besser, bevor
      // wir sie wilder gemacht haben … es geht nur um die Belichtung und Wildheit der Animation in den Würfeln drin»; die Effekte bleiben)
      let amp = ((0.0006 + 0.16 * laut ** 1.3 + 0.2 * stoss + 0.12 * tief) * (fest ? 0.6 : 1) + 0.08 * aus.b) * auf * (1 - still) * (zeichen ? 0.35 : 1);
      if (logo) amp = (1 - ruhig) * (0.03 + 0.14 * stoss);
      // die Lage des Würfels: je Zustand gewürfelt (auch mitten in ihm), und jeder weitere kräftige Einsatz wirft ihn in eine neue Lage («noch wilder»);
      // darin dreht er sich, der Schlag ruckt; zum Logo gerade und von vorn. Manche Zustände zeigen drei Würfel nebeneinander.
      const jl = fest ? 0 : j * 37 + nr, seitL = nr ? film - ein.filter((t) => t <= film).at(-1) : seit;
      // mit der Perspektive des Vorbilds wirkt jede Nähe stärker: höchstens 1,0 (der Würfel meist ganz im Bild) – näher flogen die vorderen Ecken
      // weit aus dem Bild, und es blieben einzelne Kanten
      const nah = fest ? 0.74 : jl ? [0.7, 0.8, 0.9, 1.0, 0.95, 0.75, 0.6][Math.floor(zufall(jl, 6) * 7)] : 0.8;
      const w = 0.35 + 0.8 * zufall(jl, 9), drei = !fest && !logo && !zeichen && j > 0 && zufall(j, 13) < 0.28, stossL = fest ? 0 : stoss;
      const lage = (k) => {
        e3.set(zufall(jl, 1) * 6.283 + seitL * w * 0.6 + dreh * 0.35 + k * 2.1, zufall(jl, 2) * 6.283 + seitL * w + dreh * 0.5 + k * 1.3, zufall(jl, 3) * 6.283 + seitL * w * 0.3);
        if (!j && !fest) e3.set(0.45 + tau * 0.25, 0.6 + tau * 0.4, 0.1);
        if (fest) e3.set(0.45 + tau * 0.16, 0.6 + tau * 0.27, 0.1 + tau * 0.05);   // einfach gleichmässig weiter
        q0.setFromEuler(e3); q1.identity(); q0.slerp(q1, ruhig);
        drehM.makeRotationFromQuaternion(q0); U.uDreh.value.setFromMatrix4(drehM);
        const mass = (logo ? 1 + (nah - 1) * (1 - ruhig) : drei ? 0.5 : nah) * (1 + 0.15 * stossL * (1 - ruhig));
        // der Versatz im Bild (Anteil der halben Breite und Höhe, vor dem Zoom: der Zoom verkleinert auch den Abstand)
        const dx = drei ? (k - 1) * 1.13 : fest ? 0 : ((zufall(jl, 4) - 0.5) * 0.3 * (1 - ruhig)) / a;
        U.uLage.value.set(dx, drei ? (k - 1) * -0.22 : fest ? 0 : (zufall(jl, 5) - 0.5) * 0.3 * (1 - ruhig), 0, mass);
      };
      U.uSchwanz.value = logo || zeichen ? 1e-4 : 0.25; U.uZeile.value = zeile; U.uKopf.value = kopf; U.uSchritt.value = schritt; U.uAmp.value = amp; U.uKnall.value = ((fest ? 0.7 : 1.5) * tief + 0.6 * aus.b) * (1 - ruhig);
      U.uDicke.value = logo ? 0.0035 * ruhig : 0; U.uZeit.value = tau; U.uMusik.value = 0.3 * tau + 0.3 * wert(T.energie, film); U.uHell.value = helle * (logo ? 1 + 0.2 * ruhig : (fest ? 0.6 + 0.7 * laut + 0.5 * stoss + 0.15 * aus.b : 0.7 + 1.5 * laut + 1.5 * stoss) * (1 - 0.6 * still));   // laut quillt die Wolke hell auf (beim Lichtwürfel weniger)
      pMat.uniforms.uFunken.value = (0.15 + 1.6 * hoch + 0.6 * stoss) * auf * (1 - still) * (1 - ruhig) * (fest ? 0.4 + 1.2 * aus.b : 1); pMat.uniforms.uPunkt.value = Math.max(1, (g.test ? 1 : 2) * (renderer.getSize(groesse).y / 1350));
      wMat.uniforms.uZeichnen.value = weich(anteil(tau, 0.05, W[1] * 0.9));
      wMat.uniforms.uWuerfel.value = (fest ? 0.8 : 0.55 + 0.45 * Math.min(1, laut * 2)) * (1 - ruhig) * (1 - 0.6 * still) * gewicht;
      // die Kanten gut 7 Punkte breit bei 1350 Punkten Höhe (0,55 % der Höhe) wie im Vorbild (in jeder Grösse gleich dick im Bild)
      renderer.getSize(groesse); wMat.uniforms.uSeiten.value.set(groesse.x / 2, groesse.y / 2); wMat.uniforms.uDicke.value = Math.max(1, 3.6 * (groesse.y / 1350));
      g.loeschen(rt, 0x000000);
      renderer.setRenderTarget(rt);
      for (let k = 0; k < (drei ? 3 : 1); k++) { lage(drei ? k : 0); renderer.render(szene, kam); }
      // der Würfel scharf, nach dem Bloom: mit Bewegungsunschärfe wurden seine Haarlinien beim Zoomstoss zu einem Stapel aus acht Kopien (Rückmeldung:
      // «die Würfel sind immer noch verzogen»)
      const danach = scharf ? () => { renderer.setRenderTarget(rt); for (let k = 0; k < (drei ? 3 : 1); k++) { lage(drei ? k : 0); renderer.render(wSzene, kam); } } : null;
      // Negativ: bei jedem Schnitt der Musik und bei Zuständen, die Weiss auf Schwarz gewürfelt haben (im Gewebe die Nacht), zwei bis drei Bilder lang
      const umkehr = !fest && !logo && j && ((zs.nacht && film - zs.t0 < 0.1) || T.schnitte.some((x) => film >= x && film < x + 0.07)) ? 1 : 0;
      // Belichtung und Bloom wie in der ersten Fassung (ohne die weiche Stauchung 1 − e^(−k·x), die mit «noch wilder» kam); der Lichtwürfel mit wenig Bloom
      return { aktiv: 0.7 * (1 - ruhig) + 0.15, bloom: (fest ? 0.15 + 0.25 * stoss : 0.3 + 0.6 * stoss) * (1 - 0.7 * ruhig), radius: 0.35, saum: 0, ende: 0, umkehr, danach };
    },
    vorab: { szenen: [[szene, kam], [wSzene, kam]], materialien: [] },
    zaehler(tau) {
      const film = tau + VOR, n = T.einsaetze.filter((e) => e.t <= film).length;
      return `zustand ${zustandBei(ZS, film, G[0] + VOR).nr} / ${ZS.length} · fäden ${S} · ${T.echt ? `einsatz ${n} / ${T.einsaetze.length}` : "ohne ton"}`;
    },
    entsorgen() { fGeo.dispose(); pGeo.dispose(); wGeo.dispose(); fMat.dispose(); pMat.dispose(); wMat.dispose(); pfadTex.dispose(); },
  };
}
