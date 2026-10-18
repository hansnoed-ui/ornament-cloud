// PHORMA III – Video: das Video selbst ist das Bild (seit 18. Oktober 2026, dritter Effekt; Wunsch: «für Video den selben Ablauf wie bei Audio –
// zuerst Scratching, dann Normal-Modus mit zwei, drei Cracks oder Glitches, am Schluss Gefrickel – nicht nur auf der Tonebene, sondern auch auf
// der Bild- bzw. Video-Ebene»; Entscheid: «das Video selbst», der Ton kommt aus dem Video oder aus einer Audiodatei dazu).
//   Etappe 1: das Video läuft bildgenau und synchron zum Ton – die Filmspur (filmspur.js) liefert je Filmzeit das Bild, der Fahrplan (karte)
//   sagt, welche Stelle der Quelle gerade läuft. 01 Video → 02 Logo (das Video taucht ins Schwarz, film.js zeichnet die Schlaufe und tippt den
//   Schriftzug) oder 02 Ende (das letzte Bild hält).
// Zustandslos: alles hängt nur von der Zeit ab (Bewegungsunschärfe, Spulen, Export Bild für Bild).
import * as THREE from "three";
import { anteil, weich, quadMaterial } from "./gemeinsam.js?v=8";
import { phase } from "./ablauf.js?v=8";

const VOR = 0.4;
// das Bild der Filmspur (sRGB, die Grafik entschlüsselt es linear; die Ausgabe der Bühne verschlüsselt wieder); ImageBitmap steht kopf: v gespiegelt
const BILD = /* glsl */ `uniform sampler2D tBild; uniform float uHell; varying vec2 vUv;
  void main() { gl_FragColor = vec4(texture2D(tBild, vec2(vUv.x, 1.0 - vUv.y)).rgb * uHell, 1.0); }`;

export function video(g, teil) {
  const film = g.film;                                                       // { bild(t, { vorschau }), karte(t), n } oder null (noch kein Video)
  const V = phase(teil, "video"), Lg = phase(teil, "logo");
  const tex = new THREE.Texture();
  tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = false; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
  const mat = quadMaterial(BILD, { tBild: { value: tex }, uHell: { value: 0 } });
  let zuletzt = null;
  return {
    render(rt, tau, { vorschau = false } = {}) {
      const t = tau + VOR, logo = !!Lg && tau >= Lg[0];
      // im Logo taucht das Bild in 0,8 s ins Schwarz (es läuft dabei weiter)
      const aus = logo ? 1 - weich(anteil(tau - Lg[0], 0, 0.8)) : 1;
      const b = film && aus > 0 ? film.bild(t, { vorschau }) : null;
      if (b && b !== zuletzt) { tex.image = b; tex.needsUpdate = true; zuletzt = b; }
      g.loeschen(rt, 0x000000);
      mat.uniforms.uHell.value = zuletzt ? aus * weich(anteil(tau, 0, Math.min(0.25, V[1]))) : 0;
      if (mat.uniforms.uHell.value > 0) g.pass(mat, rt);
      return { aktiv: 0, bloom: 0, radius: 0.3, saum: 0, ende: 0, umkehr: 0 };
    },
    /** Schlüssel der Lage für die Bewegungsunschärfe: je Filmbild der Quelle – über einen Schnitt im Fahrplan mischt sie nicht */
    lage(tau) { return film ? film.index?.(tau + VOR) ?? 0 : 0; },
    vorab: { szenen: [], materialien: [mat] },
    zaehler(tau) {
      if (!film) return "video · noch keins gewählt";
      const q = film.karte(tau + VOR), m = Math.floor(q / 60), s = (q % 60).toFixed(2).padStart(5, "0");
      return `video · bild ${Math.min(film.n, (film.index?.(tau + VOR) ?? 0) + 1)} / ${film.n} · quelle ${m}:${s}`;
    },
    entsorgen() { mat.dispose(); tex.dispose(); },
  };
}
