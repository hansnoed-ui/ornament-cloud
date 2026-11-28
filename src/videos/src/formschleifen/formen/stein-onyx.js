// Onyx im Gegenlicht (Probe, 28. November 2026). Christian: «Onyx und Granit als Probe.» Eine dünne Platte aus gebändertem Onyx sitzt
// wie ein Fenster in einer dunklen Wand; hinter ihr geht ein Licht vorüber, und die Bänder leuchten auf, wo es durchscheint, die hellen
// Lagen mehr als die dunklen. Von vorne fällt nur wenig Licht auf den polierten Stein.
// Bezüge: Alabaster- und Onyxfenster in Kirchen (Orvieto, Galla Placidia in Ravenna) *(G)*; Theorie: Material als Widerstand, durch den
// Form möglich wird (7/1); die Stelle, die nur unter einer Bedingung erscheint (3/4). Scan: ambientCG Onyx010 (CC0), in public/stoffe/.
import { T, TAU, welle, mix } from './werkzeug.js';

const QUELLE = '/stoffe/onyx010/', BREIT = 1.25, HOCH = 2.1;
const ladeBild = (url) => new Promise((ok, nein) => { const b = new globalThis.Image(); b.onload = () => ok(b); b.onerror = nein; b.src = url; });

export async function baue({ szene, kamera }) {
  const [farbe, normal] = await Promise.all([ladeBild(QUELLE + 'farbe.jpg'), ladeBild(QUELLE + 'normal.jpg')]);
  const tex = (b, srgb) => { const t = new T.Texture(b); t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t; };
  const farbTex = tex(farbe, true), normTex = tex(normal, false);
  farbTex.repeat.set(0.62, 1); normTex.repeat.copy(farbTex.repeat);
  szene.traverse(o => { if (o.isDirectionalLight) o.intensity = 0.05; if (o.isHemisphereLight) o.intensity = 0.04; });
  szene.background = new T.Color(0x050505);
  // das Licht dahinter: ein heller Fleck, der über die Rückseite wandert; im Stein wird er gestreut und von den Lagen gefiltert
  const uni = { uLicht: { value: new T.Vector2(0.5, 0.5) }, uStaerke: { value: 1 } };
  const stoff = new T.MeshStandardMaterial({ map: farbTex, color: 0x3a3a3a, normalMap: normTex, normalScale: new T.Vector2(0.4, 0.4), roughness: 0.12, metalness: 0, envMapIntensity: 0.08, emissiveMap: farbTex, emissive: 0xffffff });
  stoff.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uni);
    sh.fragmentShader = 'uniform vec2 uLicht; uniform float uStaerke;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `
      vec4 lage = texture2D(emissiveMap, vEmissiveMapUv);
      float hell = dot(lage.rgb, vec3(0.3, 0.55, 0.15));
      // Durchlässigkeit: helle Lagen lassen viel Licht durch, dunkle fast keines; das Licht hinten ist weich und warm
      float d = distance(vEmissiveMapUv * vec2(1.0, 1.6), uLicht * vec2(1.0, 1.6));
      float hinten = exp(-d * d * 9.0) * 2.2 + 0.05;
      totalEmissiveRadiance = lage.rgb * pow(hell, 1.3) * hinten * uStaerke * vec3(1.45, 1.0, 0.62) * 4.5;`);
  };
  const platte = new T.Mesh(new T.PlaneGeometry(BREIT, HOCH), stoff); szene.add(platte);
  // die Wand: dunkler Putz, eine schmale Laibung um das Fenster
  const loch = new T.Shape(); loch.moveTo(-4, -4); loch.lineTo(4, -4); loch.lineTo(4, 4); loch.lineTo(-4, 4);
  const aus = new T.Path(); aus.moveTo(-BREIT / 2, -HOCH / 2); aus.lineTo(BREIT / 2, -HOCH / 2); aus.lineTo(BREIT / 2, HOCH / 2); aus.lineTo(-BREIT / 2, HOCH / 2); loch.holes.push(aus);
  const mauer = new T.Mesh(new T.ExtrudeGeometry(loch, { depth: 0.18, bevelEnabled: false }), new T.MeshStandardMaterial({ color: 0x221d18, roughness: 0.95 }));
  mauer.position.z = 0.005; szene.add(mauer);
  const vorne = new T.PointLight(0xffe2c0, 0.25, 0, 2); vorne.position.set(1.4, 0.8, 2.4); szene.add(vorne);

  function stelle(p) {
    // das Licht hinten zieht einmal von unten links nach oben rechts und zurück, mit einem Bogen
    uni.uLicht.value.set(mix(0.12, 0.88, welle(p)), 0.5 + 0.42 * Math.sin(TAU * p));
    uni.uStaerke.value = mix(0.35, 1.15, welle(2 * p, 0.25));
    kamera.position.set(0.35 * Math.sin(TAU * p), 0.05, mix(5.2, 4.6, welle(p, 0.2)));
    kamera.lookAt(0, 0, 0);
  }
  return { stelle };
}
