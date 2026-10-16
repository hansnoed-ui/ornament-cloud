// Rezept 1 – Foto → Partikelwolke → Foto, zustandslos: jedes Pixel (bzw. jedes zweite) ist ein Punkt, dessen Lage zur Zeit t ganz im
// Vertex-Shader berechnet wird (Relief nach Helligkeit, zwei Schritte durch ein Curl-Feld, Ausdehnung). Kein Zustand → beliebig spulbar.
import * as THREE from "three";
import { starte, filmlook, anteil, inOut, TEST, GLSL_RAUSCHEN } from "./gemeinsam.js";

const DAUER = 12;
const FOV = 35;

starte("partikel", ({ renderer, foto, B, H }) => {
  const szene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(FOV, B / H, 0.05, 50);
  const abstand = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));    // Bildhöhe 2 füllt das Bild genau
  const breite = (2 * B) / H;

  // ein Punkt je Raster-Zelle; auf dem Telefon gröber
  const schritt = TEST ? 6 : Math.max(2, Math.round(Math.sqrt((B * H) / (matchMedia("(pointer: coarse)").matches ? 160_000 : 380_000))));
  const nx = Math.floor(B / schritt), ny = Math.floor(H / schritt), n = nx * ny;
  const lage = new Float32Array(n * 3), uv = new Float32Array(n * 2), zufall = new Float32Array(n);
  let k = 0;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++, k++) {
    const u = (i + 0.5) / nx, v = 1 - (j + 0.5) / ny;
    lage.set([(u - 0.5) * breite, (v - 0.5) * 2, 0], k * 3);
    uv.set([u, v], k * 2);
    zufall[k] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(lage, 3));
  geo.setAttribute("aUv", new THREE.BufferAttribute(uv, 2));
  geo.setAttribute("aZufall", new THREE.BufferAttribute(zufall, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uFoto: { value: foto.textur }, uZeit: { value: 0 }, uAuf: { value: 0 },
      uPunkt: { value: (2 / ny) * 1.25 },                                  // Punktgrösse in Welteinheiten: leicht überlappend → keine Lücken
      uPixelJeEinheit: { value: H / 2 / Math.tan(THREE.MathUtils.degToRad(FOV / 2)) },
    },
    vertexShader: /* glsl */ `
      ${GLSL_RAUSCHEN}
      uniform sampler2D uFoto; uniform float uZeit, uAuf, uPunkt, uPixelJeEinheit;
      attribute vec2 aUv; attribute float aZufall;
      varying vec3 vFarbe; varying float vLos;
      void main() {
        vec3 farbe = texture2D(uFoto, aUv).rgb;                           // linear (sRGB-Textur wird beim Lesen umgerechnet)
        float hell = dot(farbe, vec3(0.2126, 0.7152, 0.0722));
        float start = 0.6 * (0.55 * (1.0 - pow(hell, 0.6)) + 0.45 * aZufall);   // helle Stellen lösen sich zuerst
        float los = smoothstep(start, start + 0.4, uAuf);
        vec3 p = position;
        p.z += los * (pow(hell, 0.6) - 0.4) * 0.6;                        // erst Relief nach Helligkeit …
        float zeit = uZeit * 0.12;
        p += curl(p * 1.1 + vec3(0.0, 0.0, zeit)) * los * 0.11;           // … dann zwei Schritte durch das Wirbelfeld
        p += curl(p * 1.1 + vec3(3.1, 0.0, zeit)) * los * 0.11;
        p += normalize(position + vec3(0.0, 0.0, 0.3)) * los * los * 0.35 * aZufall;   // und auseinander
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(1.0, uPunkt * (1.0 - 0.55 * los) * uPixelJeEinheit / -mv.z);
        vFarbe = farbe * (1.0 + 1.8 * los * hell);                        // gelöste helle Teilchen leuchten (→ Bloom)
        vLos = los;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vFarbe; varying float vLos;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float rund = smoothstep(0.5, 0.2, d);
        float a = mix(1.0, rund, smoothstep(0.0, 0.3, vLos));             // im Foto quadratisch und deckend, gelöst rund und weich
        if (a < 0.01) discard;
        gl_FragColor = vec4(vFarbe, a);
      }`,
    transparent: true, depthWrite: false,
  });
  const punkte = new THREE.Points(geo, mat);
  punkte.frustumCulled = false;
  szene.add(punkte);

  const look = filmlook(renderer, szene, kamera, { staerke: 0.3, radius: 0.6, schwelle: 0.5 });

  return {
    dauer: DAUER,
    bild(t) {
      const auf = inOut(anteil(t, 1.2, 4.8)) * (1 - inOut(anteil(t, 7.6, 10.8)));
      mat.uniforms.uZeit.value = t;
      mat.uniforms.uAuf.value = auf;
      // Kamera: ruhig vor dem Foto, in der Wolke ein Schwenk um die Mitte
      const w = Math.sin(((t - 2) / 8) * Math.PI) * 0.55 * auf, h = 0.18 * auf * Math.sin(t * 0.4);
      kamera.position.set(Math.sin(w) * abstand, h, Math.cos(w) * abstand * (1 - 0.15 * auf));
      kamera.lookAt(0, 0, 0);
      look.bloom.strength = 0.15 + 1.1 * auf;
      look.render(t);
    },
    entsorgen() { geo.dispose(); mat.dispose(); look.entsorgen(); },
  };
});
