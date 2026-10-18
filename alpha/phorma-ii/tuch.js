// PHORMA II – Tuch: das Foto als Seidentuch. Die Stoffsimulation (tuchsim.js, rund 6500 Massepunkte) rechnet ein Worker einmal ganz voraus
// (tuchrechner.js); hier wird nur nachgeschlagen, zwischen den Filmbildern linear. Gezeichnet doppelt so fein (Catmull-Rom zwischen den Punkten)
// mit Seidenglanz (Sheen) und Selbstschatten.
//   01 Tuch – als erster Effekt schwebt es an zwei Ecken gehalten von oben herein; nach der Tiefe ist es zuerst das Relief und fällt; sonst das
//   flache Foto, das der Wind erfasst; 02 Bild – der Wind legt sich, die unteren Ecken werden an ihren Platz gezogen, dann alle Punkte: es liegt
//   glatt da, das Licht wird zum Foto.
// Bis die Bahn da ist, liegt das Tuch flach; bereit (Promise) sagt, wann sie da ist – Video und Standbild warten darauf.
import * as THREE from "three";
import { anteil, weich, inOut, kamera, ABSTAND } from "./gemeinsam.js?v=15";
import { phase } from "./ablauf.js?v=15";
import { tuchBahn, gitter, BILDER_JE_S, TEILSCHRITTE } from "./tuchsim.js?v=15";

export function tuch(g, teil) {
  const { renderer, A, B, H } = g, a = B / H;
  const Bp = phase(teil, "bild");
  const nx = gitter(g), ny = Math.round((nx - 1) / a) + 1, N = nx * ny;
  // die Bahn rechnet ein Worker einmal ganz voraus (tuchsim.js); bis dahin liegt das Tuch flach da
  let bahn = null, fortschritt = 0;
  const pos = new Float32Array(N * 3);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const k = (j * nx + i) * 3; pos[k] = -a + (i * 2 * a) / (nx - 1); pos[k + 1] = 1 - (j * 2) / (ny - 1); }
  const auftrag = { teil: { erst: teil.erst, vorher: teil.vorher, phasen: teil.phasen }, a, nx, tiefe: Float32Array.from(A.tiefe), tw: A.w, th: A.h };
  let rechner = null;
  const bereit = new Promise((fertig) => {
    try { rechner = new Worker(new URL("./tuchrechner.js?v=15", import.meta.url), { type: "module" }); } catch { rechner = null; }
    if (!rechner) { setTimeout(() => { bahn = tuchBahn(auftrag); fortschritt = 1; fertig(); }, 0); return; }   // ohne Worker einmal hier
    rechner.onmessage = (e) => {
      if (e.data.fortschritt !== undefined) { fortschritt = e.data.fortschritt; return; }
      if (e.data.bahn) bahn = e.data.bahn;
      fortschritt = 1; rechner.terminate(); rechner = null; fertig();
    };
    rechner.onerror = () => { rechner.terminate(); rechner = null; bahn = tuchBahn(auftrag); fortschritt = 1; fertig(); };
    rechner.postMessage({ nr: 1, ...auftrag }, [auftrag.tiefe.buffer]);
  });
  /** Lage zur eigenen Zeit tau: zwischen den gespeicherten Filmbildern linear (für die Proben der Bewegungsunschärfe) */
  function lage(tau) {
    if (!bahn) return;
    const f = Math.min(bahn.bilder - 1, Math.max(0, tau * BILDER_JE_S)), f0 = Math.floor(f), f1 = Math.min(bahn.bilder - 1, f0 + 1), u = f - f0, L = bahn.lagen;
    const o0 = f0 * N * 3, o1 = f1 * N * 3;
    for (let k = 0; k < N * 3; k++) pos[k] = L[o0 + k] + (L[o1 + k] - L[o0 + k]) * u;
  }

  // Zeichnen: doppelt so fein, Catmull-Rom zwischen den Punkten
  const mx = 2 * nx - 1, my = 2 * ny - 1, M = mx * my;
  const geo = new THREE.BufferGeometry(), vp = new Float32Array(M * 3), uv = new Float32Array(M * 2), idx = [];
  for (let j = 0; j < my; j++) for (let i = 0; i < mx; i++) { const k = j * mx + i; uv[k * 2] = i / (mx - 1); uv[k * 2 + 1] = 1 - j / (my - 1); }
  for (let j = 0; j < my - 1; j++) for (let i = 0; i < mx - 1; i++) { const k = j * mx + i; idx.push(k, k + mx, k + 1, k + 1, k + mx, k + mx + 1); }
  geo.setAttribute("position", new THREE.BufferAttribute(vp, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
  const cr = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t);
  const P = (i, j, c) => pos[(Math.min(ny - 1, Math.max(0, j)) * nx + Math.min(nx - 1, Math.max(0, i))) * 3 + c];
  function verfeinern() {
    for (let j = 0; j < my; j++) for (let i = 0; i < mx; i++) {
      const gi = i >> 1, gj = j >> 1, ti = (i & 1) * 0.5, tj = (j & 1) * 0.5, k = (j * mx + i) * 3;
      for (let c = 0; c < 3; c++) {
        if (!ti && !tj) { vp[k + c] = P(gi, gj, c); continue; }
        const zeile = (jj) => (ti ? cr(P(gi - 1, jj, c), P(gi, jj, c), P(gi + 1, jj, c), P(gi + 2, jj, c), ti) : P(gi, jj, c));
        vp[k + c] = tj ? cr(zeile(gj - 1), zeile(gj), zeile(gj + 1), zeile(gj + 2), tj) : zeile(gj);
      }
    }
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
  }
  const mat = new THREE.MeshPhysicalMaterial({ map: g.fotoTex, emissiveMap: g.fotoTex, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.5, metalness: 0,
    sheen: 1, sheenRoughness: 0.32, sheenColor: new THREE.Color(1, 0.96, 0.9), side: THREE.DoubleSide });
  const stoff = new THREE.Mesh(geo, mat); stoff.castShadow = stoff.receiveShadow = true; stoff.frustumCulled = false;
  const szene = new THREE.Scene(); szene.add(stoff);
  const sonne = new THREE.DirectionalLight(0xfff4e8, 0); sonne.position.set(-2.8, 2.4, 1.5); sonne.castShadow = true;
  sonne.shadow.mapSize.set(g.grob ? 1024 : 2048, g.grob ? 1024 : 2048); sonne.shadow.bias = -0.0004; sonne.shadow.normalBias = 0.012;
  Object.assign(sonne.shadow.camera, { left: -2.2, right: 2.2, top: 2.6, bottom: -2.6, near: 0.5, far: 9 }); sonne.shadow.camera.updateProjectionMatrix();
  const gegen = new THREE.DirectionalLight(0xff8a4a, 0); gegen.position.set(2.4, -0.6, -2.0);
  const himmel = new THREE.HemisphereLight(0xbcc8ff, 0x201810, 0);
  szene.add(sonne, gegen, himmel);
  const kam = kamera(B, H);

  return {
    render(rt, tau) {
      lage(tau);
      verfeinern();
      // Licht: als erster Effekt aus dem Dunkeln, sonst vom Foto her; im Bild wird es zum Foto (emissiv)
      const ein = teil.erst ? weich(anteil(tau, 0.2, 1.8)) : 1, foto = Bp ? inOut(anteil(tau, Bp[0] + 0.8, Bp[1] - 0.4)) : 0;
      const start = teil.erst ? 0 : 1 - weich(anteil(tau, 0, teil.vorher === "tiefe" ? 0.9 : 0.6));
      const licht = ein * (1 - foto) * (1 - start);
      sonne.intensity = 3.4 * licht; gegen.intensity = 2.0 * licht; himmel.intensity = 0.35 * licht;
      // die Kamera tritt zurück, solange das Tuch weht, damit es ganz im Bild bleibt, und kommt im Bild genau an ihren Platz
      const zurueck = 0.24 * weich(anteil(tau, 0.3, 2.2)) * (Bp ? 1 - inOut(anteil(tau, Bp[0], Bp[0] + 2.2)) : 1);
      kam.position.set(0, 0.04 * zurueck / 0.24, ABSTAND * (1 + zurueck)); kam.lookAt(0, 0, 0);
      mat.color.setScalar(licht); mat.emissiveIntensity = Math.max(foto, start); mat.sheen = licht;
      renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 1); renderer.clear(true, true, true);
      renderer.render(szene, kam);
      let ende = teil.vonFoto ? 1 - weich(anteil(tau, 0, 0.3)) : 0;
      if (Bp) ende = Math.max(ende, weich(anteil(tau, Bp[1] - 0.7, Bp[1] - 0.1)));
      const aktiv = (teil.erst ? weich(anteil(tau, 0, 0.8)) : 1) * (Bp ? 1 - weich(anteil(tau, Bp[0] + 0.6, Bp[1])) : 1);
      return { aktiv, bloom: 0.3, saum: 0.0022, ende };
    },
    bereit, fortschritt: () => fortschritt, vorab: { szenen: [[szene, kam]], materialien: [] },
    zaehler(tau) { const z = (x) => x.toLocaleString("de-CH"); return `punkte ${z(N)} · teilschritte ${z(Math.round(tau * TEILSCHRITTE))}${bahn ? "" : ` · rechnet ${Math.round(fortschritt * 100)} %`}`; },
    entsorgen() { rechner?.terminate(); geo.dispose(); mat.dispose(); sonne.shadow.map?.dispose(); },
  };
}
