// PHORMA III – Irrfahrt: ein leuchtender Faden irrt durch einen Würfel aus Licht (Wunsch vom 18. Oktober 2026 nach einem Video: im Drahtwürfel ein
// dünner Zufallsweg, der bei lauten Stellen zu dichten, leuchtenden Rauchbündeln aufquillt und in der Stille wieder zum Faden wird; der Würfel
// springt mit den Schlägen in eine neue Lage – «gerne viiiiiel krasser»).
//   Der Weg: je Zustand ein eigener Zufallsweg im Würfel (kleine Schritte mit seltenen Sprüngen, an den Wänden gespiegelt), vorab gerechnet und als
//   Textur abgelegt; sichtbar ist ein Stück hinter seinem Kopf, der mit der Musik schneller läuft.
//   Das Bündel: S Fäden auf demselben Weg, je Faden ein eigenes Rauschen und eine eigene Verzögerung; leise liegen sie aufeinander (ein heller Faden),
//   laut quellen sie zu Rauch auf, der Bass reisst sie auseinander, die Höhen werfen Funken. Additiv, darüber Bloom.
//   Krasser als das Vorbild: bei jedem kräftigen Einsatz ein harter Schnitt – neuer Weg, neue Lage des Würfels, manchmal mitten in ihm –, Echos
//   des Würfels und Farbsaum beim Schlag, bei Schnitten kurz Negativ; mit Text, Foto oder Video schreibt der Faden manchmal deren Umrisse in den Raum.
//   01 Würfel (er zeichnet sich, der Faden beginnt) → 02 Irrfahrt → 03 Logo (der Faden legt sich zur Schlaufe des Signets, film.js tippt den
//   Schriftzug) oder 03 Stille (der Faden zieht sich in seinen Kopf zusammen).
// Zustandslos: alles hängt nur von der Zeit ab (Bewegungsunschärfe, Spulen, Video Bild für Bild).
import * as THREE from "three";
import { anteil, weich } from "./gemeinsam.js?v=6";
import { phase } from "./ablauf.js?v=6";
import { gewebeKurven } from "./kurven.js?v=6";
import { weichzeichnen } from "./analyse.js?v=6";
import { tonOderErsatz, wert, gewebeZustaende, zustandBei } from "./ton.js?v=6";
import { RAUSCHEN } from "./gewebe.js?v=6";
import { PN, irrweg, verbinden, zufallsfolge } from "./irrweg.js?v=6";

const VOR = 0.4;

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
    return uDreh * p + uLage.xyz;
  }
  // uLage.w: der Zoom – im Bild, nicht durch Heranrücken (sonst verzerrt die Perspektive den nahen Würfel; Rückmeldung: «nach 2–3 Sekunden ist die
  // Box kurz verzogen»)
  vec4 abbild(vec3 p) { vec4 c = projectionMatrix * modelViewMatrix * vec4(p, 1.0); c.xy *= uLage.w; return c; }`;
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
const WUERFEL_VERTEX = /* glsl */ `
  uniform mat3 uDreh; uniform vec4 uLage; uniform float uZeichnen, uEcho, uWuerfel, uZeit;
  attribute vec3 aA, aB; attribute vec2 aT; varying float vA;   // aT: (0 Anfang / 1 Ende der Kante, Nummer des Echos)
  void main() {
    float e = aT.y;
    // die Echos genau um denselben Mittelpunkt, nur grösser – verrutschte und zitternde Kopien liessen den Würfel verzogen wirken (Rückmeldung:
    // «Würfel wieder oft verzogen»)
    vec3 p = mix(aA, aB, aT.x * uZeichnen) * (1.0 + e * 0.045 * (1.0 + 1.5 * uEcho));
    vec4 c = projectionMatrix * modelViewMatrix * vec4(uDreh * p + uLage.xyz, 1.0); c.xy *= uLage.w;
    gl_Position = c;
    vA = uWuerfel * (e < 0.5 ? 0.85 : e > 2.5 ? 0.0 : uEcho * 0.5 / e);   // zwei Echos
  }`;
const FRAGMENT = /* glsl */ `varying float vA; void main() { gl_FragColor = vec4(vec3(vA), 1.0); }`;
const FUNKE = /* glsl */ `varying float vA; void main() { vec2 d = gl_PointCoord - 0.5; float m = smoothstep(0.5, 0.0, length(d)); gl_FragColor = vec4(vec3(vA * m), 1.0); }`;

export function irrfahrt(g, teil) {
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
    // dieselbe Kurve wie in sketchory/signet.js, gezeichnet für 1080 × 1920, mittig auf H (wie die Schlaufe im Gewebe)
    const pk = (t) => { const r = 0.45 + Math.cos(t); return [1.2 * r * Math.cos(t) - 0.84, 1.2 * r * Math.sin(t)]; };
    const roh = Array.from({ length: 721 }, (_, i) => pk((i / 720) * Math.PI * 2)), xs = roh.map((q) => q[0]), ys = roh.map((q) => q[1]);
    const mx = (Math.min(...xs) + Math.max(...xs)) / 2, my = (Math.min(...ys) + Math.max(...ys)) / 2, sp = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    logoZeile = zeilen.length;
    zeilen.push(verbinden([roh.flatMap(([x, y]) => { const px = 540 + (x - mx) * (420 / sp), py = 870 + (y - my) * (420 / sp) + (H - 1920) / 2; return [(px / B * 2 - 1) * a, 1 - (py / H) * 2, 0]; })]));
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
  // der Würfel: zwölf Kanten, dazu zwei Echos (das dritte bleibt unsichtbar)
  const ecken = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map((e) => e.map((v) => v * 0.5));
  const kanten = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  const wa = [], wb = [], wt = [];
  for (let e = 0; e < 4; e++) for (const [i, j] of kanten) for (const t of [0, 1]) { wa.push(...ecken[i]); wb.push(...ecken[j]); wt.push(t, e); }
  const wGeo = new THREE.BufferGeometry();
  wGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(wa.length), 3));
  wGeo.setAttribute("aA", new THREE.BufferAttribute(new Float32Array(wa), 3)); wGeo.setAttribute("aB", new THREE.BufferAttribute(new Float32Array(wb), 3)); wGeo.setAttribute("aT", new THREE.BufferAttribute(new Float32Array(wt), 2));
  const wMat = new THREE.ShaderMaterial({ vertexShader: WUERFEL_VERTEX, fragmentShader: FRAGMENT, ...plus,
    uniforms: { uDreh: U.uDreh, uLage: U.uLage, uZeit: U.uZeit, uZeichnen: { value: 0 }, uEcho: { value: 0 }, uWuerfel: { value: 1 } } });
  const szene = new THREE.Scene();
  for (const o of [new THREE.LineSegments(wGeo, wMat), new THREE.LineSegments(fGeo, fMat), new THREE.Points(pGeo, pMat)]) { o.frustumCulled = false; szene.add(o); }
  // ein langes Objektiv (15° statt 35°, die Kamera entsprechend weiter weg): die Bildebene z = 0 füllt das Bild wie im Gewebe, aber nahe Ecken
  // werden kaum grösser als ferne – mit 35° wirkte ein Würfel, dessen Ecke zur Kamera zeigt, verzerrt (Rückmeldung: «das erste Mal, wenn drei
  // Würfel zu sehen sind, ist der mittlere davon noch verzogen»)
  const kam = new THREE.PerspectiveCamera(15, B / H, 0.1, 100);
  kam.position.set(0, 0, 1 / Math.tan(THREE.MathUtils.degToRad(7.5)));
  // nur kräftige Einsätze, frühestens alle 0,4 s, werfen den Würfel herum: eine Stimme hat fast bei jeder Silbe einen Einsatz, und die vielen
  // Sprünge liessen ihn verzogen wirken (Rückmeldung: «würfel noch immer verzogen»)
  const ein = [];
  for (const e of T.einsaetze) if (e.staerke >= 0.6 && (!ein.length || e.t - ein.at(-1) >= 0.4)) ein.push(e.t);
  const groesse = new THREE.Vector2(), drehM = new THREE.Matrix4(), e3 = new THREE.Euler(), q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion();
  const helle = 3.4 / S;                                                     // aufeinander ein heller Strich, aufgequollen rauchig

  return {
    render(rt, tau) {
      const film = tau + VOR, logo = !!Lg && tau >= Lg[0], still = St ? weich(anteil(tau, St[0], St[1] - 0.5)) : 0;
      const zs = zustandBei(ZS, logo ? Lg[0] + VOR - 1e-3 : film, G[0] + VOR), j = zs.nr;
      const laut = wert(T.laut, film), stoss = wert(T.stoss, film), tief = wert(T.stossTief, film), hoch = wert(T.stossHoch, film), dreh = wert(T.dreh, film);
      const seit = logo ? tau - Lg[0] : j ? film - zs.t0 : Math.max(0, tau);
      const zeichen = zs.zeichen && textZeile >= 0 && !logo && tau >= G[0];
      const ruhig = logo ? weich(anteil(seit, 1.6, 2.8)) : 0;
      // der Weg und sein Kopf: auf dem Zufallsweg läuft er mit der Musik schneller; Umrisse und Schlaufe zeichnen sich ganz, in 0,6 s
      let zeile = j % ZR, kopf, schritt = 1;
      if (logo || zeichen) {
        zeile = logo ? logoZeile : textZeile;
        kopf = (PN - 1) * weich(Math.min(1, seit / (logo ? 1.0 : 0.6))); schritt = Math.max(0.02, kopf / L);
      } else kopf = Math.min(PN - 1, 30 + seit * (280 + 900 * laut));            // laut rast er
      schritt *= 1 - 0.97 * still;                                             // in der Stille zieht sich der Faden in seinen Kopf zusammen
      const auf = weich(anteil(tau, 0, W[1]));
      // laut quillt die Wolke weit auf (breiter, nicht nur heller – sonst brennt sie zu Klumpen aus)
      let amp = (0.0006 + 0.24 * laut ** 1.2 + 0.28 * stoss + 0.16 * tief) * auf * (1 - still) * (zeichen ? 0.35 : 1);
      if (logo) amp = (1 - ruhig) * (0.03 + 0.14 * stoss);
      // die Lage des Würfels: je Zustand gewürfelt (auch mitten in ihm), und jeder weitere kräftige Einsatz wirft ihn in eine neue Lage («noch wilder»);
      // darin dreht er sich, der Schlag ruckt; zum Logo gerade und von vorn. Manche Zustände zeigen drei Würfel nebeneinander.
      const nr = logo ? 0 : ein.filter((t) => t > zs.t0 + 0.02 && t <= film).length, jl = j * 37 + nr, seitL = nr ? film - ein.filter((t) => t <= film).at(-1) : seit;
      const nah = jl ? [0.95, 1.1, 1.3, 1.65, 2.6, 1.0, 0.8][Math.floor(zufall(jl, 6) * 7)] : 1.15;
      const w = 0.35 + 0.8 * zufall(jl, 9), drei = !logo && !zeichen && j > 0 && zufall(j, 13) < 0.28;
      const lage = (k) => {
        e3.set(zufall(jl, 1) * 6.283 + seitL * w * 0.6 + dreh * 0.35 + k * 2.1, zufall(jl, 2) * 6.283 + seitL * w + dreh * 0.5 + k * 1.3, zufall(jl, 3) * 6.283 + seitL * w * 0.3);
        if (!j) e3.set(0.45 + tau * 0.25, 0.6 + tau * 0.4, 0.1);
        q0.setFromEuler(e3); q1.identity(); q0.slerp(q1, ruhig);
        drehM.makeRotationFromQuaternion(q0); U.uDreh.value.setFromMatrix4(drehM);
        const mass = (logo ? 1 + (nah - 1) * (1 - ruhig) : drei ? 0.55 : nah) * (1 + 0.28 * stoss * (1 - ruhig));
        const dx = drei ? (k - 1) * 1.13 * a : (zufall(jl, 4) - 0.5) * 0.3 * (1 - ruhig);   // der Zoom im Bild verkleinert auch den Abstand
        U.uLage.value.set(dx, drei ? (k - 1) * -0.22 : (zufall(jl, 5) - 0.5) * 0.3 * (1 - ruhig), 0, mass);
      };
      U.uSchwanz.value = logo || zeichen ? 1e-4 : 0.25; U.uZeile.value = zeile; U.uKopf.value = kopf; U.uSchritt.value = schritt; U.uAmp.value = amp; U.uKnall.value = 1.5 * tief * (1 - ruhig);
      U.uDicke.value = logo ? 0.0035 * ruhig : 0; U.uZeit.value = tau; U.uMusik.value = 0.3 * tau + 0.3 * wert(T.energie, film); U.uHell.value = helle * (logo ? 1 + 1.2 * ruhig : (0.8 + 1.1 * laut + 1.0 * stoss) * (1 - 0.6 * still));
      pMat.uniforms.uFunken.value = (0.25 + 2.6 * hoch + 1.2 * stoss) * auf * (1 - still) * (1 - ruhig); pMat.uniforms.uPunkt.value = Math.max(1, (g.test ? 1.5 : 3) * (renderer.getSize(groesse).y / 1350));
      wMat.uniforms.uZeichnen.value = weich(anteil(tau, 0.05, W[1] * 0.9)); wMat.uniforms.uEcho.value = drei ? 0 : stoss * (1 - ruhig);
      wMat.uniforms.uWuerfel.value = (0.55 + 0.45 * Math.min(1, laut * 2)) * (1 - ruhig) * (1 - 0.6 * still);
      g.loeschen(rt, 0x000000);
      renderer.setRenderTarget(rt);
      for (let k = 0; k < (drei ? 3 : 1); k++) { lage(drei ? k : 0); renderer.render(szene, kam); }
      // Negativ: bei jedem Schnitt der Musik und bei Zuständen, die Weiss auf Schwarz gewürfelt haben (im Gewebe die Nacht), zwei bis drei Bilder lang
      const umkehr = !logo && j && ((zs.nacht && film - zs.t0 < 0.1) || T.schnitte.some((x) => film >= x && film < x + 0.07)) ? 1 : 0;
      // belichtung: die Summe der Fäden weich gestaucht (1 − e^(−k·x)) statt hart abgeschnitten – im Hellen bleiben die Fäden zu sehen
      return { aktiv: 0.7 * (1 - ruhig) + 0.15, bloom: (0.12 + 0.3 * stoss) * (1 - 0.7 * ruhig), radius: 0.2, saum: 0.0006 + 0.006 * stoss * (1 - ruhig), ende: 0, umkehr, belichtung: 1.2 };
    },
    vorab: { szenen: [[szene, kam]], materialien: [] },
    zaehler(tau) {
      const film = tau + VOR, n = T.einsaetze.filter((e) => e.t <= film).length;
      return `zustand ${zustandBei(ZS, film, G[0] + VOR).nr} / ${ZS.length} · fäden ${S} · ${T.echt ? `einsatz ${n} / ${T.einsaetze.length}` : "ohne ton"}`;
    },
    entsorgen() { fGeo.dispose(); pGeo.dispose(); wGeo.dispose(); fMat.dispose(); pMat.dispose(); wMat.dispose(); pfadTex.dispose(); },
  };
}
