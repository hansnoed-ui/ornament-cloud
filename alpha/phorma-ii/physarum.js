// PHORMA II – Physarum: ein Schleimpilz aus bis zu 262 144 Agenten (Jones 2010) auf der GPU. Jeder Agent riecht mit drei Fühlern die Spur der anderen
// und die Nahrung (Kanten und Helligkeit des Fotos, analyse.js), dreht sich zum stärksten Geruch, geht einen Schritt und hinterlässt Spur; die Spur
// verläuft und verblasst. So wächst aus den Keimen an den markantesten Stellen ein Netz, das die Formen des Fotos findet.
//   01 Keime – die Agenten strömen sternförmig aus den Keimen; 02 Netz – die Nahrung zählt immer mehr, das Netz legt sich auf die Formen und nimmt
//   die Farben des Fotos an; 03 Bild (nur als letzter Effekt) – wo das Netz dicht ist, erscheint das Foto zuerst, zuletzt überall.
// Die Simulation läuft in festen Teilschritten (60 je Sekunde eigener Zeit) von vorn; alle 2 s ein Wiedereinstiegspunkt, damit Spulen nicht von vorn
// rechnen muss. Bild n ist beim Abspielen, Spulen und im Video dasselbe.
import * as THREE from "three";
import { anteil, weich, glocke, ziel, quadMaterial } from "./gemeinsam.js?v=13";
import { phase } from "./ablauf.js?v=13";
import { zufall } from "./analyse.js?v=13";

export const SCHRITTE = 60;
const SICHERN = 120;
const HASH = /* glsl */ `float hash(uvec3 v) { v = v * 1664525u + 1013904223u; v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y; v ^= v >> 16u; v.x += v.y * v.z; return float(v.x) / 4294967295.0; }`;

const BEWEGEN = /* glsl */ `
  uniform sampler2D tAgent, tSpur, tNahrung; uniform vec2 uSim; uniform float uSA, uRA, uSO, uTempo, uNahrung; uniform uint uSchritt; varying vec2 vUv;
  ${HASH}
  float riechen(vec2 p, float h) { vec2 q = p + vec2(cos(h), sin(h)) * uSO / uSim; return texture2D(tSpur, q).r + uNahrung * texture2D(tNahrung, q).r; }
  void main() {
    vec4 a = texture2D(tAgent, vUv); vec2 p = a.xy; float h = a.z;
    float F = riechen(p, h), L = riechen(p, h + uSA), R = riechen(p, h - uSA), r = hash(uvec3(uvec2(gl_FragCoord.xy), uSchritt));
    if (F >= L && F >= R) h += (r - 0.5) * 0.12;
    else if (F < L && F < R) h += (r < 0.5 ? 1.0 : -1.0) * uRA;
    else if (L > R) h += uRA * (0.6 + 0.4 * r);
    else h -= uRA * (0.6 + 0.4 * r);
    p += vec2(cos(h), sin(h)) * uTempo * (0.85 + 0.3 * a.w) / uSim;
    if (p.x < 0.0 || p.x > 1.0) { h = 3.14159265 - h; p.x = clamp(p.x, 0.0, 1.0); }
    if (p.y < 0.0 || p.y > 1.0) { h = -h; p.y = clamp(p.y, 0.0, 1.0); }
    gl_FragColor = vec4(p, h, a.w);
  }`;
const VERLAUFEN = /* glsl */ `
  uniform sampler2D tSpur; uniform vec2 uPixel; uniform float uZerfall, uDiff; varying vec2 vUv;
  void main() {
    float s = 0.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) s += texture2D(tSpur, vUv + vec2(x, y) * uPixel).r;
    float c = texture2D(tSpur, vUv).r;
    gl_FragColor = vec4(mix(c, s / 9.0, uDiff) * uZerfall, 0.0, 0.0, 1.0);
  }`;
const KOPIE = /* glsl */ `uniform sampler2D tQuelle; varying vec2 vUv; void main() { gl_FragColor = texture2D(tQuelle, vUv); }`;
const ZEIGEN = /* glsl */ `
  uniform sampler2D tSpur, tFoto; uniform vec2 uPixel; uniform float uGain, uFarbe, uSicht, uSchwelle, uZeigen; varying vec2 vUv;
  void main() {
    float T = texture2D(tSpur, vUv).r, I = 1.0 - exp(-T * uGain);
    vec3 foto = texture2D(tFoto, vUv).rgb;
    vec3 netz = mix(vec3(0.03, 0.08, 0.3), vec3(1.0, 0.45, 0.18), smoothstep(0.04, 0.4, I));
    netz = mix(netz, vec3(1.0, 0.92, 0.82), smoothstep(0.45, 0.95, I)) * I * 1.5;
    vec3 farbig = foto * (0.15 + 2.4 * I) + vec3(1.0, 0.6, 0.35) * pow(I, 3.0) * 0.35;
    vec3 c = mix(netz, farbig, uFarbe) * uSicht;
    // dichte Stellen: das Netz in der Umgebung (acht Proben im Abstand von 6 Punkten)
    float d = 0.0;
    for (int i = 0; i < 8; i++) { float a = float(i) * 0.785398; d += texture2D(tSpur, vUv + vec2(cos(a), sin(a)) * uPixel * 6.0).r; }
    d = 1.0 - exp(-d / 8.0 * uGain * 0.9);
    float m = smoothstep(uSchwelle, uSchwelle + 0.18, d) * uZeigen;
    gl_FragColor = vec4(mix(c, foto + c * 0.35 * (1.0 - uZeigen * uZeigen), m), 1.0);
  }`;

export function physarum(g, teil) {
  const { renderer, A: an } = g;
  const S = g.test ? 96 : g.grob ? 256 : 512, N = S * S, sw = an.w, sh = an.h;
  const K = phase(teil, "keime"), Nz = phase(teil, "netz"), Bp = phase(teil, "bild");

  // Ausgangslage: jeder Agent bei einem Keim, in einer kleinen Scheibe, nach aussen gerichtet
  const rnd = zufall(0x51a7 + an.keime.length), start = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const k = an.keime[i % an.keime.length], r = Math.sqrt(rnd()) * 16, a = rnd() * Math.PI * 2;
    start[i * 4] = k[0] + (Math.cos(a) * r) / sw; start[i * 4 + 1] = 1 - k[1] + (Math.sin(a) * r) / sh;
    start[i * 4 + 2] = a + (rnd() - 0.5) * 0.8; start[i * 4 + 3] = rnd();
  }
  const startTex = new THREE.DataTexture(start, S, S, THREE.RGBAFormat, THREE.FloatType);
  startTex.needsUpdate = true;
  const agentRT = () => new THREE.WebGLRenderTarget(S, S, { type: THREE.FloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: false });
  const spurRT = () => ziel(sw, sh, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
  const agenten = [agentRT(), agentRT()], spur = [spurRT(), spurRT()];

  const bewegen = quadMaterial(BEWEGEN, { tAgent: { value: null }, tSpur: { value: null }, tNahrung: { value: g.nahrungTex }, uSim: { value: new THREE.Vector2(sw, sh) },
    uSA: { value: 0.62 }, uRA: { value: 0.42 }, uSO: { value: 12 }, uTempo: { value: 1.2 }, uNahrung: { value: 0 }, uSchritt: { value: 0 } });
  const verlaufen = quadMaterial(VERLAUFEN, { tSpur: { value: null }, uPixel: { value: new THREE.Vector2(1 / sw, 1 / sh) }, uZerfall: { value: 0.86 }, uDiff: { value: 0.3 } });
  const kopie = quadMaterial(KOPIE, { tQuelle: { value: null } });
  const zeigen = quadMaterial(ZEIGEN, { tSpur: { value: null }, tFoto: { value: g.fotoTex }, uPixel: { value: new THREE.Vector2(1 / sw, 1 / sh) }, uGain: { value: 0.016 },
    uFarbe: { value: 0 }, uSicht: { value: 0 }, uSchwelle: { value: 1 }, uZeigen: { value: 0 } });

  // Spur legen: ein Punkt je Agent, addiert
  const ref = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) { ref[i * 2] = ((i % S) + 0.5) / S; ref[i * 2 + 1] = (Math.floor(i / S) + 0.5) / S; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute("aRef", new THREE.BufferAttribute(ref, 2));
  // weniger Agenten (Telefon, Test) legen je mehr Spur: das Netz bleibt gleich hell
  const legen = new THREE.ShaderMaterial({
    uniforms: { tAgent: { value: null }, uMenge: { value: (512 * 512) / N } }, depthTest: false, depthWrite: false, transparent: true,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendEquation: THREE.AddEquation,
    vertexShader: /* glsl */ `uniform sampler2D tAgent; attribute vec2 aRef; void main() { vec4 a = texture2D(tAgent, aRef); gl_Position = vec4(a.xy * 2.0 - 1.0, 0.0, 1.0); gl_PointSize = 1.0; }`,
    fragmentShader: /* glsl */ `uniform float uMenge; void main() { gl_FragColor = vec4(uMenge, 0.0, 0.0, 1.0); }`,
  });
  const punkte = new THREE.Points(geo, legen); punkte.frustumCulled = false;
  const szene = new THREE.Scene(); szene.add(punkte);
  const kam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let n = -1, ai = 0, si = 0;
  const sicherungen = [];
  const kopieren = (von, nach) => { kopie.uniforms.tQuelle.value = von.texture; g.pass(kopie, nach); };
  function zuruecksetzen() {
    kopie.uniforms.tQuelle.value = startTex; g.pass(kopie, agenten[0]);
    g.loeschen(spur[0]); g.loeschen(spur[1]);
    ai = 0; si = 0; n = 0;
  }
  // die Nahrung zählt erst wenig (freies Wachstum), dann immer mehr: das Netz legt sich auf die Formen
  const nahrung = (tau) => 0.4 + 11 * weich(anteil(tau, K[1] - 0.4, Nz[0] + 0.55 * (Nz[1] - Nz[0])));
  function schritt() {
    const tau = n / SCHRITTE, u = bewegen.uniforms;
    u.tAgent.value = agenten[ai].texture; u.tSpur.value = spur[si].texture; u.uNahrung.value = nahrung(tau); u.uSchritt.value = n;
    g.pass(bewegen, agenten[1 - ai]); ai = 1 - ai;
    legen.uniforms.tAgent.value = agenten[ai].texture;
    renderer.setRenderTarget(spur[si]); renderer.render(szene, kam);
    verlaufen.uniforms.tSpur.value = spur[si].texture; g.pass(verlaufen, spur[1 - si]); si = 1 - si;
    n++;
    if (n % SICHERN === 0 && !sicherungen.some((s) => s.n === n)) {
      const s = { n, agent: agentRT(), spur: spurRT() };
      kopieren(agenten[ai], s.agent); kopieren(spur[si], s.spur);
      sicherungen.push(s);
    }
  }
  /** bis zu Schritt m; budget: in der Vorschau höchstens so viele Schritte je Bild (sie holt dann auf), im Video ohne Grenze */
  function bis(m, budget = Infinity) {
    if (n < 0 || m < n) {
      const s = sicherungen.filter((x) => x.n <= m).at(-1);
      if (s) { kopieren(s.agent, agenten[0]); kopieren(s.spur, spur[0]); ai = 0; si = 0; n = s.n; }
      else zuruecksetzen();
    }
    while (n < m && budget-- > 0) schritt();
  }

  return {
    render(rt, tau, { vorschau = false } = {}) {
      bis(Math.floor(tau * SCHRITTE + 1e-6), vorschau ? 60 : Infinity);
      const u = zeigen.uniforms;
      u.tSpur.value = spur[si].texture;
      u.uSicht.value = weich(anteil(tau, 0, 0.7));
      u.uFarbe.value = 0.85 * weich(anteil(tau, Nz[0] + 0.35 * (Nz[1] - Nz[0]), Nz[1]));
      let ende = 0, aktiv = 1;
      if (Bp) {
        u.uZeigen.value = weich(anteil(tau, Bp[0] - 0.3, Bp[0] + 0.6));
        u.uSchwelle.value = 0.95 - 1.25 * weich(anteil(tau, Bp[0], Bp[1] - 0.7));
        ende = weich(anteil(tau, Bp[1] - 0.7, Bp[1] - 0.1));
        aktiv = 1 - weich(anteil(tau, Bp[0] + 0.5 * (Bp[1] - Bp[0]), Bp[1]));
      } else { u.uZeigen.value = 0; u.uSchwelle.value = 1; }
      g.pass(zeigen, rt);
      return { aktiv, bloom: 0.28, radius: 0.15, saum: 0.003, ende };
    },
    vorab: { szenen: [[szene, kam]], materialien: [bewegen, verlaufen, kopie, zeigen] },
    /** für Tests und zum Abstimmen: Perzentile der Spur (10, 50, 90, 99, 99,9 %) beim aktuellen Schritt */
    messen() {
      const d = new Uint16Array(sw * sh * 4); renderer.readRenderTargetPixels(spur[si], 0, 0, sw, sh, d);
      const v = []; for (let i = 0; i < d.length; i += 4) v.push(THREE.DataUtils.fromHalfFloat(d[i]));
      v.sort((p, q) => p - q);
      return { schritt: n, p: [0.1, 0.5, 0.9, 0.99, 0.999].map((p) => +v[Math.floor(p * (v.length - 1))].toFixed(2)) };
    },
    zaehler(tau) { const z = (x) => x.toLocaleString("de-CH"); return `agenten ${z(N)} · keime ${an.keime.length} · schritt ${z(Math.max(0, n))}`; },
    entsorgen() {
      for (const r of [...agenten, ...spur, ...sicherungen.flatMap((s) => [s.agent, s.spur])]) r.dispose();
      startTex.dispose(); geo.dispose(); for (const m of [bewegen, verlaufen, kopie, zeigen, legen]) m.dispose();
    },
  };
}
