// Rezept 6 – echte Teilchen-Physik auf der Grafikkarte (GPUComputationRenderer): Lage und Tempo von bis zu 262 144 Teilchen liegen in
// Float-Texturen und werden je Bild von zwei Fragment-Shadern fortgeschrieben – Stosswelle, Curl-Wirbel, Strudel, Feder zurück nach Hause.
// Weil jedes Bild vom vorigen abhängt, rechnet simulation() in festen Schritten (deterministisch beim Spulen und im Video).
// Am Anfang und Ende «rastet» alles exakt ein: das Foto als Fläche, die Teilchen blenden darüber ein und aus.
import * as THREE from "three";
import { GPUComputationRenderer } from "three/addons/misc/GPUComputationRenderer.js";
import { starte, filmlook, simulation, anteil, inOut, weich, TEST, FPS, GLSL_RAUSCHEN } from "./gemeinsam.js";

const DAUER = 13;
const FOV = 35;
const SCHRITTE = 2;                                                       // Teilschritte je Bild: stabiler bei starken Kräften

starte("gpgpu", ({ renderer, foto, B, H }) => {
  const S = TEST ? 128 : matchMedia("(pointer: coarse)").matches ? 256 : 512, N = S * S;
  const szene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(FOV, B / H, 0.05, 50);
  const abstand = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const breite = (2 * B) / H;

  const gpu = new GPUComputationRenderer(S, S, renderer);
  if (!renderer.capabilities.isWebGL2) gpu.setDataType(THREE.HalfFloatType);
  const startLage = gpu.createTexture(), startTempo = gpu.createTexture(), heim = gpu.createTexture();
  const ref = new Float32Array(N * 2), fotoUv = new Float32Array(N * 2);
  let s = 7; const zufall = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < N; i++) {
    const u = ((i % S) + zufall()) / S, v = (Math.floor(i / S) + zufall()) / S;   // geschichtete Zufallspunkte auf dem Foto
    const x = (u - 0.5) * breite, y = (v - 0.5) * 2, w = zufall();
    startLage.image.data.set([x, y, 0, w], i * 4);
    heim.image.data.set([x, y, 0, foto.hell(u, v)], i * 4);
    ref.set([((i % S) + 0.5) / S, (Math.floor(i / S) + 0.5) / S], i * 2);
    fotoUv.set([u, v], i * 2);
  }
  heim.needsUpdate = true;

  const tempo = gpu.addVariable("textureTempo", /* glsl */ `
    ${GLSL_RAUSCHEN}
    uniform sampler2D uHeim; uniform float uZeit, uDt, uChaos, uFeder, uStoss, uStrudel;
    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec4 L = texture2D(textureLage, uv); vec3 p = L.xyz;
      vec3 v = texture2D(textureTempo, uv).xyz;
      vec4 h = texture2D(uHeim, uv);
      vec3 q = p * 1.3 + vec3(0.0, 0.0, uZeit * 0.18);
      vec3 f = mix(curl(q * 0.7) * 0.5, rauschFeld(q) * 2.2, 0.7) * uChaos * (0.5 + L.w);   // Rauschfeld: Teilchen sammeln sich zu Bändern; Curl: Wirbel
      f += uStrudel * vec3(-p.y, p.x, 0.25 * sin(uZeit + L.w * 6.28)) / (0.25 + dot(p.xy, p.xy));   // Strudel um die Mitte
      vec3 r = p - vec3(0.0, 0.0, -0.4);
      f += normalize(r) * uStoss * (0.4 + 1.2 * h.w + 0.4 * L.w) * exp(-dot(p.xy, p.xy) * 0.35);  // Stosswelle, helle Stellen fliegen weiter
      f += (h.xyz - p) * uFeder;                                                                 // Feder nach Hause
      f -= p * 6.0 * max(0.0, length(p * vec3(0.8, 1.0, 1.4)) - 1.15);                          // weiche Grenze: niemand fliegt aus dem Bild
      v += f * uDt;
      v *= exp(-uDt * (0.8 + 2.2 * sqrt(uFeder)));                                               // Dämpfung wächst mit der Feder
      gl_FragColor = vec4(v, 1.0);
    }`, startTempo);
  const lage = gpu.addVariable("textureLage", /* glsl */ `
    uniform float uDt;
    void main() {
      vec2 uv = gl_FragCoord.xy / resolution.xy;
      vec4 L = texture2D(textureLage, uv);
      gl_FragColor = vec4(L.xyz + texture2D(textureTempo, uv).xyz * uDt, L.w);
    }`, startLage);
  gpu.setVariableDependencies(tempo, [lage, tempo]);
  gpu.setVariableDependencies(lage, [lage, tempo]);
  Object.assign(tempo.material.uniforms, { uHeim: { value: heim }, uZeit: { value: 0 }, uDt: { value: 1 / FPS / SCHRITTE }, uChaos: { value: 0 }, uFeder: { value: 0 }, uStoss: { value: 0 }, uStrudel: { value: 0 } });
  lage.material.uniforms.uDt = { value: 1 / FPS / SCHRITTE };
  const fehler = gpu.init();
  if (fehler) throw new Error(fehler);

  // Teilchen: Lage aus der Simulations-Textur, Farbe aus dem Foto, Helligkeit nach Tempo
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute("aRef", new THREE.BufferAttribute(ref, 2));
  geo.setAttribute("aUv", new THREE.BufferAttribute(fotoUv, 2));
  const punkte = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms: {
      uLage: { value: null }, uTempo: { value: null }, uHeim: { value: heim }, uFoto: { value: foto.textur }, uEinrasten: { value: 1 },
      uPunkt: { value: (2 / S) * 1.9 }, uPixelJeEinheit: { value: H / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)) },
    },
    vertexShader: /* glsl */ `
      uniform sampler2D uLage, uTempo, uHeim, uFoto; uniform float uEinrasten, uPunkt, uPixelJeEinheit;
      attribute vec2 aRef, aUv; varying vec3 vFarbe; varying float vAlpha;
      void main() {
        vec3 p = mix(texture2D(uLage, aRef).xyz, texture2D(uHeim, aRef).xyz, uEinrasten);
        float tempo = length(texture2D(uTempo, aRef).xyz);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uPunkt * uPixelJeEinheit / -mv.z * (1.0 - 0.4 * smoothstep(0.0, 1.5, tempo)), 1.0, uPunkt * uPixelJeEinheit * 0.6);   // nahe der Kamera keine Riesenflecken
        vec3 farbe = texture2D(uFoto, aUv).rgb;
        vFarbe = farbe * (1.0 + 0.6 * smoothstep(0.3, 3.0, tempo)) + vec3(1.0, 0.45, 0.15) * 0.25 * smoothstep(1.5, 5.0, tempo);   // schnell = heiss
        vAlpha = 1.0 - uEinrasten;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vFarbe; varying float vAlpha;
      void main() {
        vec2 p = gl_PointCoord * 2.0 - 1.0; p.y = -p.y;
        float r2 = dot(p, p);
        if (r2 > 1.0) discard;
        vec3 n = vec3(p, sqrt(1.0 - r2)), l = normalize(vec3(-0.45, 0.6, 0.66));
        float diff = max(dot(n, l), 0.0), glanz = pow(max(dot(reflect(-l, n), vec3(0.0, 0.0, 1.0)), 0.0), 36.0);
        vec3 kugel = vFarbe * (0.18 + 0.95 * diff) * (0.55 + 0.45 * n.z) + vec3(1.0, 0.97, 0.92) * glanz * 1.1;   // Kugel: Licht, dunkler Rand, Glanzpunkt
        float kante = 1.0 - smoothstep(0.86, 1.0, r2);
        gl_FragColor = vec4(kugel, kante * vAlpha);
      }`,
    transparent: true, depthWrite: false,
  }));
  punkte.frustumCulled = false;
  const flaeche = new THREE.Mesh(new THREE.PlaneGeometry(breite, 2), new THREE.MeshBasicMaterial({ map: foto.textur, transparent: true }));
  szene.add(flaeche, punkte);
  const look = filmlook(renderer, szene, kamera, { staerke: 0.5, radius: 0.45, schwelle: 0.7 });

  let einrasten = 1;
  const regler = (t) => {
    const U = tempo.material.uniforms;
    U.uZeit.value = t;
    U.uStoss.value = 4 * Math.exp(-(((t - 1.45) / 0.18) ** 2));                     // kurzer Puls bei 1,45 s
    U.uChaos.value = 2.2 * weich(anteil(t, 1.6, 3.2)) * (1 - weich(anteil(t, 7, 9.5)));
    U.uStrudel.value = 0.5 * weich(anteil(t, 3.5, 5)) * (1 - weich(anteil(t, 6.8, 8)));
    U.uFeder.value = t < 1.3 ? 30 : 22 * inOut(anteil(t, 7.2, 10));
    einrasten = 1 - weich(anteil(t, 1.15, 1.5)) * (1 - inOut(anteil(t, 10.2, 11.6)));
  };
  const lauf = simulation({
    zuruecksetzen() {
      for (const [v, start] of [[lage, startLage], [tempo, startTempo]]) for (const z of v.renderTargets) gpu.renderTexture(start, z);
    },
    schritt(t) { regler(t); for (let i = 0; i < SCHRITTE; i++) gpu.compute(); },
  });

  return {
    dauer: DAUER,
    async bild(t) {
      await lauf(t);
      regler(t);
      const m = punkte.material.uniforms;
      m.uLage.value = gpu.getCurrentRenderTarget(lage).texture;
      m.uTempo.value = gpu.getCurrentRenderTarget(tempo).texture;
      m.uEinrasten.value = einrasten;
      flaeche.material.opacity = einrasten;
      const frei = 1 - einrasten, w = 0.6 * Math.sin(((t - 1.5) / 9) * Math.PI) * frei;
      kamera.position.set(Math.sin(w) * abstand, 0.25 * w, Math.cos(w) * abstand * (1 + 0.2 * frei));
      kamera.lookAt(0, 0, 0);
      look.bloom.strength = 0.1 + 0.45 * frei;
      look.render(t);
    },
    entsorgen() { gpu.dispose(); geo.dispose(); punkte.material.dispose(); flaeche.geometry.dispose(); flaeche.material.dispose(); heim.dispose(); look.entsorgen(); },
  };
});
