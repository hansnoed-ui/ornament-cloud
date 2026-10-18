// PHORMA III – Video: das Video selbst ist das Bild (seit 18. Oktober 2026, dritter Effekt; Wunsch: «für Video den selben Ablauf wie bei Audio –
// zuerst Scratching, dann Normal-Modus mit zwei, drei Cracks oder Glitches, am Schluss Gefrickel – nicht nur auf der Tonebene, sondern auch auf
// der Bild- bzw. Video-Ebene»; Entscheid: «das Video selbst», der Ton kommt aus dem Video oder aus einer Audiodatei dazu).
//   Etappe 1: das Video läuft bildgenau und synchron zum Ton – die Filmspur (filmspur.js) liefert je Filmzeit das Bild, der Fahrplan (karte)
//   sagt, welche Stelle der Quelle gerade läuft. Etappe 2 (Video-Scratching): mit dem Ablauf ist der Fahrplan der des Tons (stimme.js) – beim Scratchen
//   reibt das Bild vor und zurück wie eine Platte, es verschmiert mit dem Tempo entlang der Laufrichtung, der Farbsaum öffnet sich, an den Umkehrpunkten
//   steht es scharf, und der Fader (Transform, Chirp) lässt es aufblitzen und wegklappen; die Hüpfer und das Gefrickel springen mit dem Ton. 01 Video → 02 Logo (das Video taucht ins Schwarz, film.js zeichnet die Schlaufe und tippt den
//   Schriftzug) oder 02 Ende (das letzte Bild hält).
// Zustandslos: alles hängt nur von der Zeit ab (Bewegungsunschärfe, Spulen, Export Bild für Bild).
import * as THREE from "three";
import { anteil, weich, quadMaterial } from "./gemeinsam.js?v=9";
import { phase } from "./ablauf.js?v=9";

const VOR = 0.4;
// das Bild der Filmspur (sRGB, die Grafik entschlüsselt es linear; die Ausgabe der Bühne verschlüsselt wieder); ImageBitmap steht kopf: v gespiegelt
// uTempo: Geschwindigkeit der Quelle (1 = normal, negativ = rückwärts); je schneller, desto länger der Schmier und weiter der Farbsaum
const BILD = /* glsl */ `uniform sampler2D tBild; uniform float uHell, uTempo; varying vec2 vUv;
  void main() {
    vec2 uv = vec2(vUv.x, 1.0 - vUv.y);
    float v = clamp(abs(uTempo) - 1.0, 0.0, 6.0) / 6.0;                     // was über das normale Tempo hinausgeht
    vec2 d = vec2(0.03 * v * sign(uTempo), 0.0);
    vec3 c = vec3(0.0);
    for (int i = 0; i < 9; i++) c += texture2D(tBild, uv - d * (float(i) / 8.0)).rgb;   // nachgezogen, gegen die Laufrichtung
    c /= 9.0;
    vec2 s = vec2(0.012 * v, 0.0);
    c.r = mix(c.r, texture2D(tBild, uv + s).r, v); c.b = mix(c.b, texture2D(tBild, uv - s).b, v);
    gl_FragColor = vec4(c * uHell, 1.0);
  }`;

export function video(g, teil) {
  const film = g.film;                                                       // { bild(t, { vorschau }), karte(t), n } oder null (noch kein Video)
  const V = phase(teil, "video"), Lg = phase(teil, "logo");
  const tex = new THREE.Texture();
  tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  const mat = quadMaterial(BILD, { tBild: { value: tex }, uHell: { value: 0 }, uTempo: { value: 1 } });
  let zuletzt = null;
  return {
    render(rt, tau, { vorschau = false } = {}) {
      const t = tau + VOR, logo = !!Lg && tau >= Lg[0];
      // im Logo taucht das Bild in 0,8 s ins Schwarz (es läuft dabei weiter)
      const aus = logo ? 1 - weich(anteil(tau - Lg[0], 0, 0.8)) : 1;
      const b = film && aus > 0 ? film.bild(t, { vorschau }) : null;
      if (b && b !== zuletzt) { tex.image = b; tex.needsUpdate = true; zuletzt = b; }
      g.loeschen(rt, 0x000000);
      // der Fader des Scratchs: zu ist das Bild dunkel, nicht ganz schwarz (das Auge hält die Platte)
      const fader = film?.hell ? 0.08 + 0.92 * film.hell(t) : 1;
      mat.uniforms.uHell.value = zuletzt ? aus * fader * weich(anteil(tau, 0, Math.min(0.25, V[1]))) : 0;
      mat.uniforms.uTempo.value = film?.tempo ? film.tempo(t) : 1;
      if (mat.uniforms.uHell.value > 0) g.pass(mat, rt);
      return { aktiv: 0, bloom: 0, radius: 0.3, saum: 0, ende: 0, umkehr: 0 };
    },
    /** Schlüssel der Lage für die Bewegungsunschärfe: der Abschnitt des Fahrplans – sie mischt entlang der Bewegung (der Scratch verschmiert), nie über einen Schnitt */
    lage(tau) { return film?.abschnitt ? film.abschnitt(tau + VOR) : 0; },
    vorab: { szenen: [], materialien: [mat] },
    zaehler(tau) {
      if (!film) return "video · noch keins gewählt";
      const q = film.karte(tau + VOR), m = Math.floor(q / 60), s = (q % 60).toFixed(2).padStart(5, "0");
      return `video · bild ${Math.min(film.n, (film.index?.(tau + VOR) ?? 0) + 1)} / ${film.n} · quelle ${m}:${s}`;
    },
    entsorgen() { mat.dispose(); tex.dispose(); },
  };
}
