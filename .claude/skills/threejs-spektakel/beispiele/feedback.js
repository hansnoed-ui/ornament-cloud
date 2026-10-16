// Rezept 4 – Feedback-Schleife wie in TouchDesigner (Feedback TOP): das letzte Bild wird leicht gezoomt, gedreht, verwirbelt, im Farbton
// gedreht und abgeschwächt zurückgeführt; die Kanten des Fotos (Sobel) speisen jedes Bild neu ein. Zwei Render-Targets im Wechsel
// (Ping-Pong). Der Zustand hängt an allen Bildern davor → simulation() rechnet deterministisch in festen Schritten nach.
import * as THREE from "three";
import { starte, filmlook, simulation, anteil, inOut, weich, GLSL_RAUSCHEN } from "./gemeinsam.js";

const DAUER = 12;

starte("feedback", ({ renderer, foto, B, H }) => {
  const ziel = () => new THREE.WebGLRenderTarget(B, H, { type: THREE.HalfFloatType, depthBuffer: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  let lesen = ziel(), schreiben = ziel();
  const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.PlaneGeometry(2, 2);

  const rueck = new THREE.ShaderMaterial({
    uniforms: {
      uVorher: { value: null }, uFoto: { value: foto.textur }, uTexel: { value: new THREE.Vector2(1 / B, 1 / H) }, uSeiten: { value: B / H },
      uZeit: { value: 0 }, uZoom: { value: 1 }, uDreh: { value: 0 }, uWirbel: { value: 0 }, uZerfall: { value: 0.93 },
      uFarbdreh: { value: 0 }, uKaleido: { value: 0 }, uEinspeisen: { value: 0 },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${GLSL_RAUSCHEN}
      uniform sampler2D uVorher, uFoto; uniform vec2 uTexel; uniform float uSeiten, uZeit, uZoom, uDreh, uWirbel, uZerfall, uFarbdreh, uKaleido, uEinspeisen;
      varying vec2 vUv;
      vec3 farbdreh(vec3 c, float w) {                                     // Farbton drehen im YIQ-Raum
        const mat3 zuYIQ = mat3(0.299, 0.596, 0.211, 0.587, -0.274, -0.523, 0.114, -0.322, 0.312);
        const mat3 zuRGB = mat3(1.0, 1.0, 1.0, 0.956, -0.272, -1.106, 0.621, -0.647, 1.703);
        vec3 y = zuYIQ * c; float cw = cos(w), sw = sin(w);
        y.yz = mat2(cw, -sw, sw, cw) * y.yz;
        return zuRGB * y;
      }
      float hell(vec2 uv) { return dot(texture2D(uFoto, uv).rgb, vec3(0.2126, 0.7152, 0.0722)); }
      void main() {
        vec2 p = vUv - 0.5; p.x *= uSeiten;
        float a = atan(p.y, p.x), r = length(p), seg = 6.2831853 / 6.0;
        float ak = abs(mod(a + uZeit * 0.05, seg) - 0.5 * seg);           // Kaleidoskop mit sechs Spiegeln
        p = mix(p, r * vec2(cos(ak), sin(ak)), uKaleido);
        float c = cos(uDreh), s = sin(uDreh);
        vec2 q = mat2(c, -s, s, c) * p / uZoom;                             // hineinzoomen und drehen
        q += uWirbel * 0.006 * vec2(snoise(vec3(q * 3.0, uZeit * 0.25)), snoise(vec3(q * 3.0 + 7.7, uZeit * 0.25)));
        q.x /= uSeiten; q += 0.5;
        vec3 alt = farbdreh(texture2D(uVorher, q).rgb, uFarbdreh) * uZerfall;
        // Sobel auf dem Foto: farbige Kanten speisen die Schleife
        float tl = hell(vUv + uTexel * vec2(-1, 1)), t = hell(vUv + uTexel * vec2(0, 1)), tr = hell(vUv + uTexel * vec2(1, 1));
        float l = hell(vUv + uTexel * vec2(-1, 0)), rr = hell(vUv + uTexel * vec2(1, 0));
        float bl = hell(vUv + uTexel * vec2(-1, -1)), b = hell(vUv + uTexel * vec2(0, -1)), br = hell(vUv + uTexel * vec2(1, -1));
        float gx = tr + 2.0 * rr + br - tl - 2.0 * l - bl, gy = tl + 2.0 * t + tr - bl - 2.0 * b - br;
        vec3 fotoFarbe = texture2D(uFoto, vUv).rgb;
        vec3 kante = (0.15 + 0.85 * fotoFarbe) * smoothstep(0.25, 0.8, length(vec2(gx, gy)));   // nur deutliche Kanten, sonst füllt sich das Bild
        vec3 neu = clamp(max(alt, kante * uEinspeisen), 0.0, 3.0);              // Maximum, nicht Summe: sonst schaukelt sich die Schleife auf (1 / (1 − Zerfall))
        gl_FragColor = vec4(neu, 1.0);                                      // das Foto selbst kommt nie in die Schleife, nur in die Anzeige
      }`,
    depthTest: false, depthWrite: false,
  });
  const rueckSzene = new THREE.Scene(); rueckSzene.add(new THREE.Mesh(quad, rueck));

  // Anzeige: Schleife und Foto überblenden (das Foto steht am Anfang und Ende exakt)
  const zeige = new THREE.ShaderMaterial({
    uniforms: { uSchleife: { value: null }, uFoto: { value: foto.textur }, uFotoAnteil: { value: 1 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `uniform sampler2D uSchleife, uFoto; uniform float uFotoAnteil; varying vec2 vUv;
      void main() { gl_FragColor = vec4(mix(texture2D(uSchleife, vUv).rgb, texture2D(uFoto, vUv).rgb, uFotoAnteil), 1.0); }`,
    depthTest: false, depthWrite: false,
  });
  const anzeige = new THREE.Scene(); anzeige.add(new THREE.Mesh(quad, zeige));
  const look = filmlook(renderer, anzeige, ortho, { staerke: 0.35, radius: 0.4, schwelle: 0.85, saum: 0.003 });

  const regler = (t) => {
    const voll = weich(anteil(t, 1, 3)) * (1 - weich(anteil(t, 8.5, 10.5)));
    const u = rueck.uniforms;
    u.uZeit.value = t;
    u.uEinspeisen.value = voll;
    u.uZoom.value = 1 + 0.004 + 0.014 * voll * (0.6 + 0.4 * Math.sin(t * 0.9));
    u.uDreh.value = 0.006 * voll * (t < 6 ? 1 : -1) * (1 - Math.exp(-Math.abs(t - 6) * 2));   // dreht bei 6 s die Richtung
    u.uWirbel.value = voll;
    u.uFarbdreh.value = 0.025 * voll;
    u.uKaleido.value = weich(anteil(t, 4, 5.4)) * (1 - weich(anteil(t, 7.2, 8.6)));
  };
  const lauf = simulation({
    zuruecksetzen() {
      for (const z of [lesen, schreiben]) { renderer.setRenderTarget(z); renderer.setClearColor(0x000000, 1); renderer.clear(); }
      renderer.setRenderTarget(null);
    },
    schritt(t) {
      regler(t);
      rueck.uniforms.uVorher.value = lesen.texture;
      renderer.setRenderTarget(schreiben); renderer.render(rueckSzene, ortho); renderer.setRenderTarget(null);
      [lesen, schreiben] = [schreiben, lesen];
    },
  });

  return {
    dauer: DAUER,
    async bild(t) {
      await lauf(t);
      zeige.uniforms.uSchleife.value = lesen.texture;
      zeige.uniforms.uFotoAnteil.value = 1 - inOut(anteil(t, 0.8, 2.6)) * (1 - inOut(anteil(t, 9.2, 11.2)));
      look.bloom.strength = 0.1 + 0.4 * rueck.uniforms.uEinspeisen.value;
      look.render(t);
    },
    entsorgen() { lesen.dispose(); schreiben.dispose(); quad.dispose(); rueck.dispose(); zeige.dispose(); look.entsorgen(); },
  };
});
