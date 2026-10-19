// PHORMA II – Wachstum: eine einzige leuchtende Linie wächst aus einem Keim und zeichnet das Foto (Differential Growth; die Bahn rechnet ein Worker
// einmal ganz voraus, wachstumsim.js, wachstumrechner.js). Gezeichnet als Schar von Strichen in einem Zug (instanziert): jeder Strich ein Viereck um
// seine Strecke, im Fragment-Shader der Abstand zur Strecke – glatt, mit runden Enden; Mischen mit Maximum, damit die Gelenke nicht doppelt
// leuchten. Wo das Foto hell ist, leuchtet die Linie heller und etwas breiter (die Tonwerte zusätzlich zur Dichte der Windungen).
//   01 Keim – ein kleiner Kreis glimmt auf (als erster Effekt aus dem Dunkeln, sonst vergeht das Foto darunter); 02 Wachstum – sie faltet sich und
//   füllt das Motiv; 03 Farbe – sie nimmt die Farben des Fotos an; 04 Bild – das Foto erscheint unter ihr, sie vergeht, das Foto steht.
// Die Bilder der Bahn kommen in Päckchen, die Vorschau zeigt jeweils das letzte schon gerechnete; bereit (Promise) sagt, wann sie ganz da ist –
// Video und Standbild warten darauf.
import * as THREE from "three";
import { anteil, weich, inOut, quadMaterial, filmTextur } from "./gemeinsam.js?v=23";
import { phase } from "./ablauf.js?v=23";
import { wachstumBahn, ACHTEL, BILDER_JE_S } from "./wachstumsim.js?v=23";

const VERTEX = /* glsl */ `
  attribute vec4 aStrecke;                 // x0, y0, x1, y1 in Punkten der Analyse (y nach unten)
  uniform vec2 uFeld, uZiel; uniform float uBreite; uniform sampler2D tFoto;
  varying vec2 vL; varying float vLaenge, vHalb; varying vec3 vFarbe; varying float vHell;
  void main() {
    vec2 a = aStrecke.xy / uFeld * uZiel, b = aStrecke.zw / uFeld * uZiel;          // in Punkten des Ziels
    vec2 d = b - a; float l = length(d); vec2 t = l > 1e-4 ? d / l : vec2(1.0, 0.0), n = vec2(-t.y, t.x);
    vec2 m = (aStrecke.xy + aStrecke.zw) * 0.5 / uFeld;
    vec3 foto = texture2D(tFoto, vec2(m.x, 1.0 - m.y)).rgb;
    vHell = clamp(dot(foto, vec3(0.2126, 0.7152, 0.0722)) * 1.6, 0.0, 1.0);
    vFarbe = foto;
    vHalb = 0.5 * uBreite * (0.75 + 0.6 * vHell);
    float r = vHalb + 1.0;                                                             // Platz für die Kante
    vec2 p = a + t * (position.x * (l + 2.0 * r) - r) + n * position.y * 2.0 * r;
    vL = vec2(position.x * (l + 2.0 * r) - r, position.y * 2.0 * r); vLaenge = l;
    vec2 c = p / uZiel;
    gl_Position = vec4(c.x * 2.0 - 1.0, 1.0 - c.y * 2.0, 0.0, 1.0);
  }`;
const FRAGMENT = /* glsl */ `
  uniform vec3 uGlut; uniform float uFarbe, uLicht;
  varying vec2 vL; varying float vLaenge, vHalb; varying vec3 vFarbe; varying float vHell;
  void main() {
    float u = clamp(vL.x, 0.0, vLaenge), d = length(vec2(vL.x - u, vL.y));
    float a = 1.0 - smoothstep(vHalb - 0.6, vHalb + 0.6, d);
    if (a <= 0.0) discard;
    vec3 c = mix(uGlut * (0.45 + 0.85 * vHell), vFarbe * 1.25 + 0.08, uFarbe);
    gl_FragColor = vec4(c * a * uLicht, 1.0);
  }`;
const FOTO = /* glsl */ `uniform sampler2D tFoto; uniform float uSicht; varying vec2 vUv; void main() { gl_FragColor = vec4(texture2D(tFoto, vUv).rgb * uSicht, 1.0); }`;

export function wachstum(g, teil) {
  const { renderer, A, B, H, foto } = g;
  const K = phase(teil, "keim"), W = phase(teil, "wachstum"), F = phase(teil, "farbe"), Bp = phase(teil, "bild");
  // das Foto in der Grösse der Analyse (für den Grund: wo die Linie wachsen darf)
  let rgb = null;
  try {
    const c = typeof document !== "undefined" ? document.createElement("canvas") : new OffscreenCanvas(A.w, A.h);
    c.width = A.w; c.height = A.h;
    const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(foto, 0, 0, A.w, A.h);
    rgb = x.getImageData(0, 0, A.w, A.h).data;
  } catch { rgb = null; }
  const auftrag = { teil: { phasen: teil.phasen }, w: A.w, h: A.h, hell: Float32Array.from(A.hell), nahrung: Float32Array.from(A.nahrung), tiefe: Float32Array.from(A.tiefe),
    rgb: rgb ? Uint8ClampedArray.from(rgb) : null, ton: A.ton, dichte: g.test ? 2.2 : g.grob ? 1.6 : 1, schritte: g.grob ? 9 : 12 };
  // die Bilder der Bahn, so wie sie kommen (je Filmbild die Lagen): die Vorschau zeigt das Wachstum schon, während der Rest noch rechnet
  // (Rückmeldung vom 19. Oktober 2026 vom Telefon: «der Keim bleibt stehen» – vorher wartete sie auf die ganze Bahn)
  const bilder = [];
  let gesamt = 0, fertigGerechnet = false, rechner = null;
  const fortschritt = () => (fertigGerechnet ? 1 : gesamt ? Math.min(0.99, bilder.length / gesamt) : 0);
  // mit Video folgt die Linie dem bewegten Bild: je je Filmbilder ein kleines Bild des Videos (Etappe 2), vorher gesammelt
  const je = g.grob ? 3 : 2;
  async function filmBilder() {
    if (!g.film?.klein) return null;
    const ende = (F ?? W)[1], fw = Math.max(40, Math.round(A.w / 3)), fh = Math.max(50, Math.round(A.h / 3)), stellen = [];
    for (let f = 0; f <= Math.round(ende * BILDER_JE_S); f += je) stellen.push(g.film.stelle(teil, f / BILDER_JE_S));
    try { return { w: fw, h: fh, je, rgba: await g.film.klein(stellen, fw, fh) }; } catch { return null; }
  }
  let weg = false;   // entsorgt, während die Bilder des Videos noch gesammelt wurden: dann nicht mehr rechnen
  const bereit = (async () => { auftrag.film = await filmBilder(); })().then(() => new Promise((fertig) => {
    if (weg) { fertig(); return; }
    const hier = () => { const jeBild = (f, l) => { bilder[f] = l; }; const b = wachstumBahn({ ...auftrag, jeBild }); gesamt = b.bilder; fertigGerechnet = true; fertig(); };
    try { rechner = new Worker(new URL("./wachstumrechner.js?v=23", import.meta.url), { type: "module" }); } catch { rechner = null; }
    if (!rechner) { setTimeout(hier, 0); return; }   // ohne Worker einmal hier
    rechner.onmessage = (e) => {
      const d = e.data;
      if (d.bilder?.length && d.ab !== undefined) { d.bilder.forEach((l, i) => { bilder[d.ab + i] = l; }); gesamt = d.gesamt; return; }
      if (d.fertig) { gesamt = d.bilder; fertigGerechnet = true; rechner.terminate(); rechner = null; fertig(); return; }
      if (d.fehler) { rechner.terminate(); rechner = null; bilder.length = 0; setTimeout(hier, 0); }
    };
    rechner.onerror = () => { rechner?.terminate(); rechner = null; bilder.length = 0; setTimeout(hier, 0); };
    rechner.postMessage({ nr: 1, ...auftrag });
  }));

  // die Striche: höchstens so viele wie Punkte im letzten Bild (wächst bei Bedarf)
  const geo = new THREE.InstancedBufferGeometry();
  { const e = new THREE.PlaneGeometry(1, 1); e.translate(0.5, 0, 0); geo.index = e.index; geo.setAttribute("position", e.attributes.position); }
  let kap = 0, strecke = null;
  const platz = (n) => {
    if (n <= kap) return;
    kap = Math.max(4096, Math.ceil(n * 1.3));
    strecke = new THREE.InstancedBufferAttribute(new Float32Array(kap * 4), 4); strecke.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("aStrecke", strecke);
    geo._maxInstanceCount = undefined;   // three.js merkt sich sonst die Grösse des ersten Puffers und zeichnet nie mehr Striche
  };
  platz(64);
  const mat = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, depthTest: false, depthWrite: false, transparent: true, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendEquation: THREE.MaxEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    uniforms: { tFoto: { value: g.fotoTex }, uFeld: { value: new THREE.Vector2(A.w, A.h) }, uZiel: { value: new THREE.Vector2(B, H) }, uBreite: { value: 1.4 },
      uGlut: { value: new THREE.Color(1.0, 0.86, 0.66) }, uFarbe: { value: 0 }, uLicht: { value: 1 } } });
  const schar = new THREE.Mesh(geo, mat); schar.frustumCulled = false;
  const szene = new THREE.Scene(); szene.add(schar);
  const kam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const unter = quadMaterial(FOTO, { tFoto: { value: g.fotoTex }, uSicht: { value: 0 } });
  // der Keim, solange die Bahn rechnet: ein kleiner Kreis um die Mitte
  const keimKreis = (() => { const n = 28, k = new Int16Array(n * 2); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; k[i * 2] = (A.w * 0.5 + 3.2 * Math.cos(a)) * ACHTEL; k[i * 2 + 1] = (A.h * 0.45 + 3.2 * Math.sin(a)) * ACHTEL; } return { n, k }; })();
  let gefuellt = null, anzahl = 0, w = B, h = H;

  function fuellen(f) {
    const L = bilder[f] ?? keimKreis.k, n = L.length / 2, o = 0;
    if (L === gefuellt) return;
    gefuellt = L;
    platz(n);
    const s = strecke.array, k = 1 / ACHTEL;
    for (let i = 0; i < n; i++) {
      const j = i + 1 === n ? 0 : i + 1;
      s[i * 4] = L[o + i * 2] * k; s[i * 4 + 1] = L[o + i * 2 + 1] * k; s[i * 4 + 2] = L[o + j * 2] * k; s[i * 4 + 3] = L[o + j * 2 + 1] * k;
    }
    strecke.clearUpdateRanges?.(); strecke.needsUpdate = true;
    geo.instanceCount = anzahl = n;
  }

  // mit Video: das laufende Bild für die Farben der Linie und darunter
  const film = g.film ? filmTextur() : null;
  return {
    groesse(nw, nh) { w = nw; h = nh; },
    render(rt, tau, opt = {}) {
      if (film) { const tex = film.setzen(g.film.bild(teil, tau, opt.vorschau)) ?? g.fotoTex; mat.uniforms.tFoto.value = tex; unter.uniforms.tFoto.value = tex; }
      // das Bild der Bahn zu tau; ist es noch nicht gerechnet, das letzte, das schon da ist
      const f = Math.min(bilder.length - 1, Math.max(0, Math.floor(tau * BILDER_JE_S + 1e-6)));
      fuellen(f);
      // das Foto darunter: am Anfang (nach einem anderen Effekt) vergeht es, im Bild kommt es
      const fotoAus = teil.erst ? 0 : 1 - weich(anteil(tau, 0, K[1] * 0.8));
      const fotoEin = Bp ? inOut(anteil(tau, Bp[0] + 0.2, Bp[1] - 0.5)) : 0;
      g.loeschen(rt);
      if (fotoAus + fotoEin > 0.002) { unter.uniforms.uSicht.value = Math.max(fotoAus, fotoEin); g.pass(unter, rt); }
      const u = mat.uniforms;
      u.uZiel.value.set(w, h);
      u.uBreite.value = Math.max(1.1, (1.5 * w) / 1080);
      u.uFarbe.value = F ? inOut(anteil(tau, F[0], F[1])) : 0;
      u.uLicht.value = (teil.erst ? weich(anteil(tau, 0.1, K[1] * 0.7)) : weich(anteil(tau, K[1] * 0.2, K[1]))) * (Bp ? 1 - inOut(anteil(tau, Bp[0] + 0.5, Bp[1] - 0.3)) : 1);
      if (u.uLicht.value > 0.002) { renderer.setRenderTarget(rt); renderer.render(szene, kam); }
      let ende = Bp ? weich(anteil(tau, Bp[1] - 0.7, Bp[1] - 0.1)) : 0;
      if (teil.vonFoto) ende = Math.max(ende, 1 - weich(anteil(tau, 0, 0.3)));
      const aktiv = (teil.erst ? weich(anteil(tau, 0, 0.6)) : weich(anteil(tau, 0, 0.4))) * (Bp ? 1 - weich(anteil(tau, Bp[0] + 0.5, Bp[1])) : 1);
      // leuchtet: Bloom, im Wachstum am stärksten
      const glut = 0.55 + 0.35 * Math.sin(Math.PI * anteil(tau, W[0], W[1]));
      return { aktiv, bloom: glut * (1 - u.uFarbe.value * 0.4), radius: 0.4, saum: 0.0018, ende };
    },
    bereit, fortschritt,
    vorab: { szenen: [[szene, kam]], materialien: [unter] },
    zaehler() { const z = (x) => x.toLocaleString("de-CH"); return `wachstum · punkte ${z(anzahl)}${fertigGerechnet ? "" : ` · rechnet ${Math.round(fortschritt() * 100)} %`}`; },
    entsorgen() { weg = true; rechner?.terminate(); geo.dispose(); mat.dispose(); unter.dispose(); film?.entsorgen(); },
  };
}
