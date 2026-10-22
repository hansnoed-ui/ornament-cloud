// PHORMA II – Tiefe: das Foto bekommt Tiefe. Ein feines Netz (ein Punkt je 4 Filmpunkte) wird nach der Tiefenkarte verschoben – aus dem Bild
// geschätzt oder von der KI (tiefe-ki.js) –, Streiflicht macht das Relief sichtbar.
//   01 Scan – eine kupferne Lichtebene tastet das Bild von vorn nach hinten ab, hinter ihr glühen kurz die Linien gleicher Tiefe auf (als erster
//   Effekt: aus dem Dunkeln; sonst über dem Foto); 02 Bild – alles legt sich flach, das Foto steht.
//   Vor dem Tuch endet der Scan mit einem flachen Relief: daraus wird das Tuch (TIEFE_UEBERGABE).
//   Bis zum 19. Oktober 2026 folgte dem Scan die Phase «Raum» (Kamerafahrt mit Parallaxe, Tiefennebel, sieben Tiefenschichten, wandernde Schärfe,
//   glühende Schnittkanten) – Rückmeldung: «"Raum", das gefällt mir gar nicht, kann ersatzlos raus, "Scan" bitte behalten». Die Shader können es noch.
// Gestreckte Maschen an Tiefensprüngen werden dunkel statt verschmiert. Zustandslos.
import * as THREE from "three";
import { anteil, weich, inOut, glocke, kamera, ABSTAND, KUPFER, ziel, quadMaterial } from "./gemeinsam.js?v=37";
import { phase } from "./ablauf.js?v=37";
import { TIEFE_UEBERGABE } from "./tuchsim.js?v=37";   // dasselbe Relief, aus dem das Tuch beginnt

export { TIEFE_UEBERGABE };
const SCHICHTEN = 7;

const VERTEX = /* glsl */ `
  uniform sampler2D tTiefe; uniform float uTiefe, uSchicht, uBreite; uniform vec2 uMasche;
  varying vec2 vUv; varying float vD, vRiss; varying vec3 vN;
  float tiefe(vec2 uv) { return texture2D(tTiefe, uv).r; }
  float hoehe(float d) { return (d - 0.5) * uTiefe + floor(d * ${SCHICHTEN}.0 + 0.5) / ${SCHICHTEN}.0 * uSchicht; }
  void main() {
    vUv = uv; float d = tiefe(uv); vD = d;
    vec3 p = position; float hm = hoehe(d); p.z += hm;
    vec2 e = uMasche;
    float dx = tiefe(uv + vec2(e.x, 0.0)) - tiefe(uv - vec2(e.x, 0.0)), dy = tiefe(uv + vec2(0.0, e.y)) - tiefe(uv - vec2(0.0, e.y));
    vN = normalize(vec3(-dx * uTiefe / (2.0 * e.x * uBreite), -dy * uTiefe / (2.0 * e.y * 2.0), 1.0));
    float r = max(max(abs(hoehe(tiefe(uv + vec2(e.x, 0.0))) - hm), abs(hoehe(tiefe(uv - vec2(e.x, 0.0))) - hm)),
                  max(abs(hoehe(tiefe(uv + vec2(0.0, e.y))) - hm), abs(hoehe(tiefe(uv - vec2(0.0, e.y))) - hm)));
    vRiss = r / (e.y * 2.0);                                              // Steigung gegenüber der Maschenweite
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }`;
const FRAGMENT = /* glsl */ `
  uniform sampler2D tFoto; uniform float uLicht, uNebel, uScan, uScanAn, uDunkel, uFokus, uUnschaerfe, uRissAn; uniform vec3 uL, uKupfer;
  varying vec2 vUv; varying float vD, vRiss; varying vec3 vN;
  void main() {
    vec3 foto = texture2D(tFoto, vUv).rgb, n = normalize(vN);
    float diff = max(dot(n, uL), 0.0);
    vec3 c = mix(foto, foto * (0.25 + 0.75 * diff) + uKupfer * 0.1 * pow(1.0 - n.z, 1.5), uLicht);   // Streiflicht hellt das Foto höchstens bis 1 auf (vorher bis 1,3: die hellen Stellen glühten)
    c *= mix(1.0, 0.18 + 0.82 * pow(vD, 0.9), uNebel);
    // Scan: die Ebene steht bei Tiefe uScan und wandert von nah (1) nach fern (0)
    float nach = vD - uScan, vor = smoothstep(-0.004, 0.004, nach);
    float band = exp(-pow(nach / 0.009, 2.0));
    float k = vD * 42.0, fw = fwidth(k), iso = 1.0 - smoothstep(0.0, 1.4 * fw, min(fract(k), 1.0 - fract(k)));
    vec3 scan = uKupfer * band * 1.1 + vec3(0.85, 0.92, 1.0) * iso * 0.45 * exp(-max(nach, 0.0) * 9.0) * vor;
    c = mix(c, c * smoothstep(0.0, 0.22, nach), uDunkel * uScanAn) + scan * uScanAn;
    // Tiefensprünge und die Stufen der Schichten: die gestreckten Maschen werden zu feinen glühenden Schnittkanten statt zu verschmierten Flächen
    float riss = smoothstep(1.2, 3.5, vRiss) * uRissAn;
    c = mix(c, c * 0.3 + uKupfer * 0.32, riss);
    gl_FragColor = vec4(c, abs(vD - uFokus) * uUnschaerfe);
  }`;
// Tiefenschärfe: Sammeln auf einer Goldwinkel-Spirale; eine Probe zählt, wenn ihr eigener Unschärfekreis bis hierher reicht
const SCHAERFE = /* glsl */ `
  uniform sampler2D tSzene; uniform vec2 uPixel; uniform float uMax; varying vec2 vUv;
  void main() {
    vec4 m = texture2D(tSzene, vUv); float r0 = min(m.a, 1.0) * uMax;
    if (uMax < 0.5) { gl_FragColor = vec4(m.rgb, 1.0); return; }
    vec3 s = m.rgb; float g = 1.0;
    for (int i = 1; i < 28; i++) {
      float f = float(i) / 27.0, r = sqrt(f) * uMax, a = float(i) * 2.39996;
      vec4 p = texture2D(tSzene, vUv + vec2(cos(a), sin(a)) * r * uPixel);
      float w = smoothstep(r - 1.0, r, min(p.a, 1.0) * uMax) * smoothstep(r - 1.0, r, max(r0, min(p.a, 1.0) * uMax));
      s += p.rgb * w; g += w;
    }
    gl_FragColor = vec4(s / g, 1.0);
  }`;

export function tiefe(g, teil) {
  const { renderer, A, B, H } = g, a = B / H;
  const S = phase(teil, "scan"), Bp = phase(teil, "bild");
  const masche = g.test ? 10 : g.grob ? 6 : 4;
  // 16 % grösser als das Bild: schwenkt die Kamera, sieht sie über den Rand hinaus (dort die gestreckten Randpunkte statt Schwarz); flach bleibt
  // der Überstand ausserhalb des Bilds
  const UEBER = 1.16;
  const geo = new THREE.PlaneGeometry(2 * a * UEBER, 2 * UEBER, Math.round((B / masche) * UEBER), Math.round((H / masche) * UEBER));
  { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) - 0.5) * UEBER + 0.5, (uv.getY(i) - 0.5) * UEBER + 0.5); }
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERTEX, fragmentShader: FRAGMENT,
    uniforms: { tFoto: { value: g.fotoTex }, tTiefe: { value: g.tiefeTex }, uTiefe: { value: 0 }, uSchicht: { value: 0 }, uBreite: { value: a },
      uMasche: { value: new THREE.Vector2(masche / B, masche / H) }, uLicht: { value: 0 }, uNebel: { value: 0 }, uScan: { value: 1.1 }, uScanAn: { value: 0 },
      uDunkel: { value: teil.erst ? 1 : 0 }, uFokus: { value: 0.9 }, uUnschaerfe: { value: 0 }, uRissAn: { value: 0 },
      uL: { value: new THREE.Vector3(-0.55, 0.62, 0.56).normalize() }, uKupfer: { value: KUPFER.clone() } },
  });
  const netz = new THREE.Mesh(geo, mat); netz.frustumCulled = false;
  const szene = new THREE.Scene(); szene.add(netz);
  const kam = kamera(B, H);
  let rtSzene = null, w = 0, h = 0;
  const schaerfe = quadMaterial(SCHAERFE, { tSzene: { value: null }, uPixel: { value: new THREE.Vector2() }, uMax: { value: 0 } });

  return {
    groesse(nw, nh) { w = nw; h = nh; rtSzene?.dispose(); rtSzene = ziel(w, h, { depthBuffer: true }); schaerfe.uniforms.uPixel.value.set(1 / w, 1 / h); },
    render(rt, tau) {
      const u = mat.uniforms;
      const flach = Bp ? inOut(anteil(tau, Bp[0], Bp[1] - 0.6)) : 0;
      const uebergabe = !Bp && teil.naechstes ? inOut(anteil(tau, S[1] - 1.2, S[1])) : 0;
      // Tiefe: im Scan aufbauen, im Bild flach; vor dem Tuch ein flaches Relief
      let t = 0.55 * (teil.erst ? 0.4 + 0.6 * weich(anteil(tau, S[0], S[1] - 0.4)) : weich(anteil(tau, S[0] + 0.2, S[1] - 0.4)));
      t = t * (1 - flach);
      t = t + (TIEFE_UEBERGABE - t) * uebergabe;
      u.uTiefe.value = t;
      u.uScan.value = 1.04 - 1.1 * inOut(anteil(tau, S[0] + 0.15, S[1] - 0.2));
      // über dem Foto schwächer: sonst leuchtet eine flache, gleich tiefe Stelle ganz auf, wenn die Ebene durch sie geht
      u.uScanAn.value = teil.erst ? 1 - weich(anteil(tau, S[1] - 0.4, S[1] + 0.4)) : 0.55 * glocke(tau, S[0], S[1] + 0.3) ** 0.5;
      const licht = teil.erst ? 0.6 : 0.6 * weich(anteil(tau, S[0], S[1]));
      u.uLicht.value = licht * (1 - flach) * (1 - 0.35 * uebergabe) * g.belichtung;   // helle Fotos: weniger Streiflicht (buehne.js)
      // die Kamera steht frontal (ohne Raum keine Fahrt)
      kam.position.set(0, 0, ABSTAND); kam.lookAt(0, 0, 0);
      renderer.setRenderTarget(rtSzene); renderer.setClearColor(0x000000, 0); renderer.clear(true, true, true);
      renderer.render(szene, kam);
      schaerfe.uniforms.tSzene.value = rtSzene.texture;
      schaerfe.uniforms.uMax.value = 0;
      g.pass(schaerfe, rt);
      let ende = 0, aktiv = teil.erst ? weich(anteil(tau, 0, 0.6)) : weich(anteil(tau, 0, 0.5));
      if (teil.vonFoto) ende = 1 - weich(anteil(tau, 0, 0.35));
      if (Bp) { ende = Math.max(ende, weich(anteil(tau, Bp[1] - 0.7, Bp[1] - 0.1))); aktiv *= 1 - weich(anteil(tau, Bp[0], Bp[1])); }
      return { aktiv, bloom: 0.18 * u.uScanAn.value + 0.08, saum: 0.0025, ende };   // vorher 0.55 · scan + 0.25: der Scan war überblendet (Rückmeldung 21. Oktober 2026, zweimal)
    },
    vorab: { szenen: [[szene, kam]], materialien: [schaerfe] },
    zaehler() { return `tiefe ${g.tiefeQuelle === "ki" ? "ki (depth anything)" : "aus dem bild"} · schichten ${SCHICHTEN} · maschen ${geo.index.count / 6 | 0}`; },
    entsorgen() { geo.dispose(); mat.dispose(); schaerfe.dispose(); rtSzene?.dispose(); },
  };
}
