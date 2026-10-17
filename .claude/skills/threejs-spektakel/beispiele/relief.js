// Rezept 2 – Relief aus dem Foto: die (geglättete) Helligkeit wird zur Höhe einer fein unterteilten Fläche. MeshStandardMaterial bleibt,
// über onBeforeCompile kommen Höhe, exakte Normalen und leuchtende Höhenlinien unter einer Scan-Linie dazu. Streiflicht mit Schatten.
// Am Anfang und Ende ist die Fläche flach und nur «emissiv» → das Foto steht exakt so da wie geladen.
import * as THREE from "three";
import { starte, filmlook, anteil, inOut, weich, TEST } from "./gemeinsam.js";

const DAUER = 11;
const FOV = 35;

/** Helligkeit auf ein Gitter (nx+1) × (ny+1), mit Kastenunschärfe (zwei Durchgänge) */
function hoehenfeld(foto, nx, ny, radius) {
  const w = nx + 1, h = ny + 1, f = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) f[j * w + i] = foto.hell(i / nx, 1 - j / ny) ** 0.9;
  const tmp = new Float32Array(w * h);
  for (let durchgang = 0; durchgang < 2; durchgang++) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let s = 0, n = 0; for (let k = -radius; k <= radius; k++) { const x = i + k; if (x >= 0 && x < w) { s += f[j * w + x]; n++; } } tmp[j * w + i] = s / n;
    }
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      let s = 0, n = 0; for (let k = -radius; k <= radius; k++) { const y = j + k; if (y >= 0 && y < h) { s += tmp[y * w + i]; n++; } } f[j * w + i] = s / n;
    }
  }
  return f;
}

starte("relief", ({ renderer, foto, B, H }) => {
  const szene = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(FOV, B / H, 0.05, 50);
  const abstand = 1 / Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const breite = (2 * B) / H;

  const nx = Math.round(B / (TEST ? 6 : 2.5)), ny = Math.round(H / (TEST ? 6 : 2.5));
  const geo = new THREE.PlaneGeometry(breite, 2, nx, ny);                  // Ecken: Zeile für Zeile von oben, links nach rechts
  const feld = hoehenfeld(foto, nx, ny, Math.max(1, Math.round(nx / 180)));
  const hoehe = new Float32Array((nx + 1) * (ny + 1)), grad = new Float32Array(hoehe.length * 2);
  const dx = breite / nx, dy = 2 / ny, w = nx + 1;
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const k = j * w + i, f = (ii, jj) => feld[Math.min(ny, Math.max(0, jj)) * w + Math.min(nx, Math.max(0, ii))];
    hoehe[k] = feld[k];
    grad[k * 2] = (f(i + 1, j) - f(i - 1, j)) / (2 * dx);                  // dh/dx
    grad[k * 2 + 1] = -(f(i, j + 1) - f(i, j - 1)) / (2 * dy);             // dh/dy (Zeilen laufen nach unten)
  }
  geo.setAttribute("aHoehe", new THREE.BufferAttribute(hoehe, 1));
  geo.setAttribute("aGrad", new THREE.BufferAttribute(grad, 2));

  const u = { uTiefe: { value: 0 }, uScan: { value: -9 }, uLinien: { value: 0 }, uAkzent: { value: new THREE.Color("#ff7a2e") } };
  const mat = new THREE.MeshStandardMaterial({ map: foto.textur, emissive: 0xffffff, emissiveMap: foto.textur, roughness: 0.62, metalness: 0.05 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute float aHoehe; attribute vec2 aGrad; uniform float uTiefe; varying float vHoehe; varying vec3 vWelt;")
      .replace("#include <begin_vertex>", "vec3 transformed = vec3(position); transformed.z += aHoehe * uTiefe; vHoehe = aHoehe; vWelt = (modelMatrix * vec4(transformed, 1.0)).xyz;")
      .replace("#include <beginnormal_vertex>", "vec3 objectNormal = normalize(vec3(-aGrad * uTiefe, 1.0));");   // exakte Normale des Höhenfelds
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uScan, uLinien; uniform vec3 uAkzent; varying float vHoehe; varying vec3 vWelt;")
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        float hl = vHoehe * 16.0;
        float linie = 1.0 - smoothstep(0.0, max(1.4 * fwidth(hl), 1e-4), abs(fract(hl - 0.5) - 0.5));   // Höhenlinien, auf jeder Grösse ein Pixel fein (max: auf flachen Flächen ist fwidth 0, smoothstep mit gleichen Grenzen ist undefiniert)
        float band = exp(-pow((vWelt.y - uScan) / 0.09, 2.0));
        totalEmissiveRadiance += uAkzent * uLinien * (linie * (0.25 + 3.0 * band) + 0.12 * band);`);
  };
  const flaeche = new THREE.Mesh(geo, mat);
  flaeche.castShadow = flaeche.receiveShadow = true;
  szene.add(flaeche);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const streif = new THREE.DirectionalLight(0xfff1e0, 0);
  Object.assign(streif.shadow.camera, { left: -breite * 0.7, right: breite * 0.7, top: 1.3, bottom: -1.3, near: 0.1, far: 12 });
  streif.shadow.mapSize.set(TEST ? 1024 : 2048, TEST ? 1024 : 2048);
  streif.shadow.bias = -0.0004; streif.shadow.normalBias = 0.01;
  streif.castShadow = true;
  szene.add(streif, streif.target);
  const kante = new THREE.PointLight(0xff8a3d, 0, 8, 1.5);
  const himmel = new THREE.HemisphereLight(0x9fb4ff, 0x120a06, 0);
  szene.add(kante, himmel);

  const look = filmlook(renderer, szene, kamera, { staerke: 0.5, radius: 0.4, schwelle: 0.6 });

  return {
    dauer: DAUER,
    bild(t) {
      const licht = inOut(anteil(t, 1, 3)) * (1 - inOut(anteil(t, 8.2, 10)));
      const tiefe = inOut(anteil(t, 1.2, 4)) * (1 - inOut(anteil(t, 7.8, 9.8)));
      const kipp = inOut(anteil(t, 1.5, 5)) * (1 - inOut(anteil(t, 7.4, 10)));
      u.uTiefe.value = 0.42 * tiefe;
      u.uLinien.value = weich(anteil(t, 3, 4)) * (1 - weich(anteil(t, 7.6, 8.6)));
      u.uScan.value = 1.4 - ((t - 3) / 2.4) * 2.8;                         // die Scan-Linie läuft zweimal von oben nach unten
      if (t > 5.4) u.uScan.value = 1.4 - ((t - 5.4) / 2.4) * 2.8;
      mat.emissiveIntensity = 1 - licht;
      // Streiflicht wandert einmal um das Relief, immer flach
      const a = -0.6 + 2.6 * inOut(anteil(t, 1, 9));
      streif.position.set(Math.cos(a) * 3, Math.sin(a) * 3, 1.1 + 1.5 * (1 - kipp));
      streif.intensity = 3.2 * licht;
      kante.position.set(-Math.cos(a) * 1.6, -Math.sin(a) * 1.6, 0.6); kante.intensity = 3.5 * licht;
      himmel.intensity = 0.35 * licht;
      // Kamera kippt nach vorn über die Fläche, fährt etwas näher
      const k = THREE.MathUtils.degToRad(58) * kipp, s = Math.sin(t * 0.35) * 0.25 * kipp, d = abstand * (1 - 0.18 * kipp);
      kamera.position.set(Math.sin(s) * d, -Math.sin(k) * d, Math.cos(k) * Math.cos(s) * d);
      kamera.up.set(0, 1, 0); kamera.lookAt(0, 0.12 * kipp, 0);
      look.bloom.strength = 0.1 + 0.6 * licht;
      look.render(t);
    },
    entsorgen() { geo.dispose(); mat.dispose(); look.entsorgen(); renderer.shadowMap.enabled = false; },
  };
});
