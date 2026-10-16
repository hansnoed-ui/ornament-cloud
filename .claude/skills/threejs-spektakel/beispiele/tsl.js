// Rezept 7 – WebGPU mit TSL (Three Shading Language): dieselbe Teilchen-Physik wie gpgpu.js, aber als Compute-Shader in JavaScript
// geschrieben. Lage und Tempo liegen in Storage-Buffern (instancedArray), ein Sprite mit count = N zeichnet alle Teilchen in einem Aufruf,
// Bloom kommt als Knoten in die RenderPipeline (vor r183 hiess sie PostProcessing). Ohne WebGPU (oder mit ?webgl) fällt der
// WebGPURenderer selbst auf WebGL 2 zurück – derselbe Code läuft dann über Transform Feedback.
import * as THREE from "three/webgpu";
import { Fn, instancedArray, instanceIndex, uniform, vec3, vec4, float, texture, mx_noise_vec3, length, normalize, mix, smoothstep, uv, max, exp, dot, sqrt, pow, reflect, pass } from "three/tsl";
import { bloom } from "three/addons/tsl/display/BloomNode.js";
import { starte, PARAM, TEST, FPS, simulation, anteil, inOut, weich } from "./gemeinsam.js";

const DAUER = 13;
const FOV = 35;
const SCHRITTE = 2;

/** WebGPU, wo vorhanden. Sonst WebGL 2 – dann mit eigenem Kontext und preserveDrawingBuffer: der Renderer legt ihn sonst ohne an,
 *  und VideoFrame/drawImage lesen danach nicht verlässlich das eben gerechnete Bild. */
async function webgpu(B, H) {
  const canvas = document.createElement("canvas");
  const adapter = PARAM.has("webgl") ? null : await navigator.gpu?.requestAdapter().catch(() => null);
  const parameter = { canvas, antialias: false };
  if (!adapter) Object.assign(parameter, { forceWebGL: true, context: canvas.getContext("webgl2", { preserveDrawingBuffer: true, antialias: false, alpha: true, depth: true, stencil: false }) });
  const renderer = new THREE.WebGPURenderer(parameter);
  renderer.setClearColor(0x000000, 1);
  renderer.setPixelRatio(1);
  renderer.setSize(B, H, false);
  await renderer.init();
  return renderer;
}

starte("tsl", ({ renderer, foto, B, H }) => {
  const webgpuEcht = renderer.backend.isWebGPUBackend === true;
  const N = TEST ? 16_384 : !webgpuEcht || matchMedia("(pointer: coarse)").matches ? 65_536 : 262_144;
  const szene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(FOV, B / H, 0.05, 50);
  const abstand = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const breite = (2 * B) / H, S = Math.sqrt(N);

  const heimDaten = new Float32Array(N * 3), uvDaten = new Float32Array(N * 2);
  let s = 11; const zufall = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < N; i++) {
    const u = ((i % S) + zufall()) / S, v = (Math.floor(i / S) + zufall()) / S;
    heimDaten.set([(u - 0.5) * breite, (v - 0.5) * 2, 0], i * 3);
    uvDaten.set([u, v], i * 2);
  }
  const heim = instancedArray(heimDaten, "vec3"), fotoUv = instancedArray(uvDaten, "vec2");
  const lage = instancedArray(heimDaten.slice(), "vec3"), tempo = instancedArray(N, "vec3");

  const uZeit = uniform(0), uDt = uniform(1 / FPS / SCHRITTE), uChaos = uniform(0), uFeder = uniform(0), uStoss = uniform(0), uEinrasten = uniform(1);

  const zuruecksetzen = Fn(() => {
    lage.element(instanceIndex).assign(heim.element(instanceIndex));
    tempo.element(instanceIndex).assign(vec3(0));
  })().compute(N);

  const schritt = Fn(() => {
    const p = lage.element(instanceIndex), v = tempo.element(instanceIndex), h = heim.element(instanceIndex);
    const f = mx_noise_vec3(p.mul(1.3).add(vec3(0, 0, uZeit.mul(0.2)))).mul(uChaos).toVar();         // Strömung
    const r = p.sub(vec3(0, 0, -0.4));
    f.addAssign(normalize(r).mul(uStoss).mul(exp(dot(p.xy, p.xy).mul(-0.35))));                         // Stosswelle
    f.addAssign(h.sub(p).mul(uFeder));                                                                 // Feder nach Hause
    f.subAssign(p.mul(6).mul(max(0, length(p.mul(vec3(0.8, 1, 1.4))).sub(1.15))));                    // weiche Grenze
    v.addAssign(f.mul(uDt));
    v.mulAssign(exp(uDt.negate().mul(sqrt(uFeder).mul(2.2).add(0.8))));                               // Dämpfung
    p.addAssign(v.mul(uDt));
  })().compute(N);

  const mat = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false });
  mat.positionNode = mix(lage.toAttribute(), heim.toAttribute(), uEinrasten);
  const geschw = length(tempo.toAttribute());
  const farbe = texture(foto.textur, fotoUv.toAttribute()).rgb;
  // jedes Teilchen eine glänzende Kugel: Licht von links oben, dunkler Rand, Glanzpunkt (Rückmeldung: «zu wenig kontrastreich und glänzend»)
  const q = uv().mul(2).sub(1), r2 = dot(q, q), n = vec3(q.x, q.y, sqrt(max(float(0), float(1).sub(r2))));
  const licht = normalize(vec3(-0.45, 0.6, 0.66));
  const diff = max(dot(n, licht), 0), spiegel = pow(max(dot(reflect(licht.negate(), n), vec3(0, 0, 1)), 0), 36);
  const grund = farbe.mul(geschw.mul(0.15).add(1)).add(vec3(1, 0.45, 0.15).mul(smoothstep(1.5, 5, geschw).mul(0.2)));
  mat.colorNode = vec4(grund.mul(diff.mul(0.95).add(0.18)).mul(n.z.mul(0.45).add(0.55)).add(vec3(1, 0.97, 0.92).mul(spiegel.mul(1.1))), 1);
  mat.opacityNode = smoothstep(1, 0.86, r2).mul(float(1).sub(uEinrasten));
  mat.scaleNode = float((2 / S) * 1.9);
  const teilchen = new THREE.Sprite(mat);
  teilchen.count = N;
  teilchen.frustumCulled = false;
  const flaeche = new THREE.Mesh(new THREE.PlaneGeometry(breite, 2), new THREE.MeshBasicMaterial({ map: foto.textur, transparent: true }));
  szene.add(flaeche, teilchen);

  const pipeline = new THREE.RenderPipeline(renderer);
  const bild = pass(szene, kamera).getTextureNode("output");
  const glanz = bloom(bild, 0.4, 0.45, 0.7);
  pipeline.outputNode = vec4(bild.add(glanz).rgb, 1);                    // deckend: der Canvas hat immer einen Alphakanal

  let einrasten = 1;
  const regler = (t) => {
    uZeit.value = t;
    uStoss.value = 4 * Math.exp(-(((t - 1.45) / 0.18) ** 2));
    uChaos.value = 2.4 * weich(anteil(t, 1.6, 3.2)) * (1 - weich(anteil(t, 7, 9.5)));
    uFeder.value = t < 1.3 ? 30 : 22 * inOut(anteil(t, 7.2, 10));
    einrasten = 1 - weich(anteil(t, 1.15, 1.5)) * (1 - inOut(anteil(t, 10.2, 11.6)));
  };
  const lauf = simulation({
    zuruecksetzen() { renderer.compute(zuruecksetzen); },
    schritt(t) { regler(t); for (let i = 0; i < SCHRITTE; i++) renderer.compute(schritt); },
  });

  return {
    dauer: DAUER,
    async bild(t) {
      await lauf(t);
      // Im WebGL-Rückfall liegen Storage-Buffer doppelt vor (Transform Feedback, Ping-Pong); das Zeichnen liest je nach gerader oder
      // ungerader Zahl von Compute-Aufrufen den neuen oder den vorigen. Ein Schritt mit dt = 0 schreibt den Stand in beide → eindeutig.
      uDt.value = 0; renderer.compute(schritt); uDt.value = 1 / FPS / SCHRITTE;
      regler(t);
      uEinrasten.value = einrasten;
      flaeche.material.opacity = einrasten;
      const frei = 1 - einrasten, w = 0.6 * Math.sin(((t - 1.5) / 9) * Math.PI) * frei;
      kamera.position.set(Math.sin(w) * abstand, 0.25 * w, Math.cos(w) * abstand * (1 + 0.2 * frei));
      kamera.lookAt(0, 0, 0);
      glanz.strength.value = 0.1 + 0.45 * frei;
      pipeline.render();                                                   // nicht renderAsync() (seit r18x veraltet): das Bild muss im selben Task stehen, sonst liest VideoFrame das vorige
    },
    entsorgen() { mat.dispose(); flaeche.geometry.dispose(); flaeche.material.dispose(); pipeline.dispose(); },
  };
}, { renderer: webgpu });
