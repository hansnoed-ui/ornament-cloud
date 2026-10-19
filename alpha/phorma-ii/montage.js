// PHORMA II – Montage: das Foto in verschachtelten Rechtecken, jedes mit eigenem Ausschnitt (der Plan: montageplan.js). Gezeichnet als eine
// Schar von Vierecken in einem Zug (instanziert, höchstens HOECHSTENS): jedes holt sein Stück aus dem Foto – vergrössert, versetzt, von anderswo
// oder ab einer Linie zu Streifen gezogen (am Bildrand bleiben die letzten Punkte stehen) – und zieht seinen feinen hellen Rand. Darüber die
// Zahlentafeln, je Schnitt einmal auf eine 2D-Leinwand geschrieben (zwei im Wechsel, damit die Belichtung über einen Schnitt nicht neu schreibt).
// Dasselbe Zeichnen schneidet am Schluss das Signet (montageSignet), wenn die Montage der letzte Effekt ist.
// Zustandslos: jedes Bild hängt nur von der Zeit ab.
import * as THREE from "three";
import { anteil, weich, quadMaterial } from "./gemeinsam.js?v=21";
import { wichtigkeit, montagePlan, montageBei, signetTeil, HOECHSTENS, SIGNET_TAKT } from "./montageplan.js?v=21";
import { weichzeichnen } from "./analyse.js?v=21";

const VERTEX = /* glsl */ `
  attribute vec4 aRect, aQuelle, aZug, aStil;
  varying vec2 vL, vPx; varying vec4 vQuelle, vZug, vStil;
  uniform vec2 uZiel;
  void main() {
    vL = vec2(position.x + 0.5, 0.5 - position.y);                       // im Feld: x nach rechts, y nach unten
    vec2 p = mix(aRect.xy, aRect.zw, vL);
    vPx = (aRect.zw - aRect.xy) * uZiel;
    vQuelle = aQuelle; vZug = aZug; vStil = aStil;
    gl_Position = vec4(p.x * 2.0 - 1.0, 1.0 - p.y * 2.0, 0.0, 1.0);
  }`;
const FRAGMENT = /* glsl */ `
  uniform sampler2D tFoto; uniform float uLinie;
  varying vec2 vL, vPx; varying vec4 vQuelle, vZug, vStil;
  void main() {
    vec2 l = vL;
    // gezogen: ab der Linie bleibt die letzte Spalte (Zeile) stehen und wird zu Streifen
    if (vZug.x > 0.5 && vZug.x < 1.5) l.x = vZug.z > 0.0 ? min(l.x, vZug.y) : max(l.x, 1.0 - vZug.y);
    else if (vZug.x > 1.5) l.y = vZug.z > 0.0 ? min(l.y, vZug.y) : max(l.y, 1.0 - vZug.y);
    vec2 q = vQuelle.xy + (l - 0.5) * vQuelle.zw;
    vec2 uv = clamp(vec2(q.x, 1.0 - q.y), vec2(0.0005), vec2(0.9995));
    vec3 c = texture2D(tFoto, uv).rgb * vStil.x;
    vec2 px = vL * vPx;
    float d = min(min(px.x, vPx.x - px.x), min(px.y, vPx.y - px.y));
    float rand = (1.0 - smoothstep(uLinie - 0.5, uLinie + 0.5, d)) * vStil.y;
    c = mix(c, vec3(0.86) * vStil.x, rand * 0.8);
    gl_FragColor = vec4(c, 1.0);
  }`;
const TAFELN = /* glsl */ `uniform sampler2D tTafel; uniform float uSicht; varying vec2 vUv;
  void main() { vec4 t = texture2D(tTafel, vUv); gl_FragColor = vec4(t.rgb, t.a * uSicht); }`;
const MONO = 'ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Mono", Menlo, Consolas, "Liberation Mono", monospace';

/**
 * Das Zeichnen einer Montage (für den Effekt und fürs Signet): die Schar der Felder aus einer Textur (quelle) und die Zahlentafeln des Plans.
 * hell(x, y): Helligkeit des Bilds an einer Stelle (für die Farbe der Schrift). → { zeichnen(rt, M, w, h), vorab, entsorgen }
 */
function zeichner(g, plan, quelle, hell) {
  const { renderer, B, H } = g, N = HOECHSTENS;
  const geo = new THREE.InstancedBufferGeometry();
  { const ebene = new THREE.PlaneGeometry(1, 1); geo.index = ebene.index; geo.setAttribute("position", ebene.attributes.position); }
  const attr = {};
  for (const n of ["aRect", "aQuelle", "aZug", "aStil"]) { attr[n] = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4); attr[n].setUsage(THREE.DynamicDrawUsage); geo.setAttribute(n, attr[n]); }
  geo.instanceCount = 0;
  const mat = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, depthTest: false, depthWrite: false,
    uniforms: { tFoto: { value: quelle }, uZiel: { value: new THREE.Vector2(B, H) }, uLinie: { value: 1 } } });
  const schar = new THREE.Mesh(geo, mat); schar.frustumCulled = false;
  const szene = new THREE.Scene(); szene.add(schar);
  const kam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const tafelMat = quadMaterial(TAFELN, { tTafel: { value: null }, uSicht: { value: 0 } }, { transparent: true, blending: THREE.NormalBlending });

  // die Zahlentafeln eines Schnitts auf eine Leinwand in Filmgrösse; dunkle Schrift auf hellem Grund, helle auf dunklem
  const leinwaende = [0, 1].map(() => {
    const c = typeof document !== "undefined" ? document.createElement("canvas") : new OffscreenCanvas(B, H);
    c.width = B; c.height = H;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    return { c, tex, k: -1 };
  });
  let wechsel = 0;
  function tafel(k) {
    const da = leinwaende.find((l) => l.k === k);
    if (da) return da.tex;
    const l = leinwaende[wechsel]; wechsel = 1 - wechsel;
    const ctx = l.c.getContext("2d"), s = B / 1080, gr = Math.max(7, Math.round(9.5 * s)), zh = Math.round(gr * 1.25);
    ctx.clearRect(0, 0, B, H);
    ctx.font = `400 ${gr}px ${MONO}`; ctx.textBaseline = "top"; ctx.lineWidth = Math.max(1, s);
    for (const t of plan.schnitte[k].tafeln) {
      const x = t.x * B, y = t.y * H;
      ctx.fillStyle = ctx.strokeStyle = hell(t.x + 0.05, t.y + 0.03) > 0.55 ? "rgba(30,34,34,0.78)" : "rgba(236,240,238,0.8)";
      let breit = 0;
      t.zeilen.forEach((z, j) => { ctx.fillText(z, x, y + j * zh); breit = Math.max(breit, ctx.measureText(z).width); });
      if (t.rahmen) { ctx.globalAlpha = 0.6; ctx.strokeRect(Math.round(x - 4 * s) + 0.5, Math.round(y - 4 * s) + 0.5, Math.round(breit + 8 * s), Math.round(t.zeilen.length * zh + 6 * s)); ctx.globalAlpha = 1; }
      // die Linie zur Tafel: ein feiner Strich nach oben, wie die Spalten im Clip
      ctx.globalAlpha = 0.35; ctx.fillRect(Math.round(x - 4 * s), Math.round(y - 22 * s), Math.max(1, Math.round(s)), Math.round(16 * s)); ctx.globalAlpha = 1;
    }
    l.k = k; l.tex.needsUpdate = true;
    return l.tex;
  }

  return {
    zeichnen(rt, M, w, h) {
      const n = Math.min(N, M.felder.length);
      for (let i = 0; i < n; i++) {
        const f = M.felder[i];
        attr.aRect.array.set(f.rect, i * 4); attr.aQuelle.array.set(f.quelle, i * 4);
        attr.aZug.array.set([f.zug[0], f.zug[1], f.zug[2], 0], i * 4); attr.aStil.array.set([f.licht, f.rand, 0, 0], i * 4);
      }
      for (const n0 of Object.values(attr)) { n0.clearUpdateRanges?.(); n0.needsUpdate = true; }
      geo.instanceCount = n;
      mat.uniforms.uZiel.value.set(w, h);
      mat.uniforms.uLinie.value = Math.max(0.75, (1.2 * w) / 1080);
      g.loeschen(rt);
      renderer.setRenderTarget(rt); renderer.render(szene, kam);
      if (M.tafelSicht > 0.003) {
        tafelMat.uniforms.tTafel.value = tafel(M.k); tafelMat.uniforms.uSicht.value = M.tafelSicht;
        g.pass(tafelMat, rt);
      }
    },
    vorab: { szenen: [[szene, kam]], materialien: [tafelMat] },
    entsorgen() { geo.dispose(); mat.dispose(); tafelMat.dispose(); for (const l of leinwaende) l.tex.dispose(); },
  };
}

export function montage(g, teil) {
  const { A, B, H } = g;
  const plan = montagePlan(wichtigkeit(A), teil, { a: B / H, samen: Math.round(A.mittel * 1e4) + A.w });
  const Z = zeichner(g, plan, g.fotoTex, (x, y) => A.hell[Math.min(A.h - 1, Math.floor(y * A.h)) * A.w + Math.min(A.w - 1, Math.floor(x * A.w))]);
  let w = B, h = H;
  return {
    groesse(nw, nh) { w = nw; h = nh; },
    render(rt, tau) {
      const M = montageBei(plan, tau);
      Z.zeichnen(rt, M, w, h);
      let ende = M.ende, aktiv = plan.erst ? weich(anteil(tau, 0, 0.8)) : weich(anteil(tau, 0, 0.4));
      if (plan.vonFoto) ende = Math.max(ende, 1 - weich(anteil(tau, 0, 0.35)));
      if (plan.Bp) aktiv *= 1 - weich(anteil(tau, plan.Bp[0] + 0.6, plan.Bp[1]));
      return { aktiv, bloom: 0.08, radius: 0.3, saum: 0.0012 + 0.006 * M.ruck, ende };
    },
    vorab: Z.vorab,
    zaehler(tau) {
      const M = montageBei(plan, tau);
      return `montage · felder ${M.felder.length - 1} · schnitt ${M.k + 1}/${plan.schnitte.length}`;
    },
    plan,
    entsorgen() { Z.entsorgen(); },
  };
}

/**
 * Das Signet am Schluss im Stil der Montage (Wunsch vom 19. Oktober 2026: «bitte Logo-Animation am Schluss auf diesen Style anpassen»): das Signet
 * zeichnet sich wie immer auf eine 2D-Leinwand, die Felder schneiden es im schnellen Takt (SIGNET_TAKT) in Rechtecke und rasten zuletzt ein.
 * zeichnenBei(ctx, f, foto): Grund, Foto (Deckkraft foto) und Signet bei Bild f auf eine Leinwand 1080 × H; fertig: ein Bild, auf dem es ganz
 * steht (für die Aufteilung); nahtlos: es beginnt beim Foto (die Felder schneiden es weg) statt im Dunkeln.
 * → { render(rt, f, tau, w, h) → { ende, saum }, entsorgen }
 */
export function montageSignet(g, zeichnenBei, fertig, { nahtlos = false } = {}) {
  const { B, H } = g;
  const leinwand = typeof document !== "undefined" ? document.createElement("canvas") : new OffscreenCanvas(B, H);
  leinwand.width = B; leinwand.height = H;
  const ctx = leinwand.getContext("2d");
  const tex = new THREE.CanvasTexture(leinwand); tex.colorSpace = THREE.SRGBColorSpace;
  // wo das Signet ist: das fertige Signet klein, weichgezeichnet und auf 0..1 gebracht – es ist «nah», der Grund «fern»
  const w = 54, h = Math.round((54 * H) / B), klein = typeof document !== "undefined" ? document.createElement("canvas") : new OffscreenCanvas(w, h);
  klein.width = w; klein.height = h;
  const kx = klein.getContext("2d", { willReadFrequently: true });
  kx.save(); kx.scale(w / B, h / H); zeichnenBei(kx, fertig); kx.restore();
  const d = kx.getImageData(0, 0, w, h).data, hell = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) hell[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
  const weich2 = weichzeichnen(hell, w, h, 1.2), gipfel = Math.max(1e-6, ...weich2), nah = weich2.map((v) => v / gipfel);
  const A = { w, h, hell, tiefe: nah, nahrung: nah };
  const plan = montagePlan(wichtigkeit(A, 36), signetTeil({ nahtlos }), { a: B / H, samen: 4242, takt: SIGNET_TAKT, n0: 12, raender: false, licht: false });
  const Z = zeichner(g, plan, tex, (x, y) => hell[Math.min(h - 1, Math.floor(y * h)) * w + Math.min(w - 1, Math.floor(x * w))]);
  return {
    plan, nahtlos,
    render(rt, f, tau, nw, nh, foto = 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); zeichnenBei(ctx, f, foto); tex.needsUpdate = true;
      const M = montageBei(plan, tau);
      Z.zeichnen(rt, M, nw, nh);
      return { ende: M.ende, saum: 0.0012 + 0.005 * M.ruck };
    },
    entsorgen() { Z.entsorgen(); tex.dispose(); },
  };
}
