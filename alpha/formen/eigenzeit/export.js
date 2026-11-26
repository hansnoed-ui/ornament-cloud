// ORNAMENT FORMEN 0.1 – Export des Zeitkörpers (26. November 2026, Vorschlag von Claude, Christians OK «passt so»).
//  · GLB: der Körper wie gesehen (Ringe, Spur, Fäden, Feststellungen), für Blender, Weitergabe oder AR.
//    Instanzen werden zu einfachen Netzen gebacken, damit auch Programme ohne EXT_mesh_gpu_instancing sie lesen.
//  · STL zum Drucken: ein zusammenhängender Körper in Millimetern, z nach oben. Jede Perle hängt über einen Steg an der
//    nächsten Perle der Schicht darunter, die erste Schicht an der Bodenplatte; oben schliesst ein Reif jeden Turm.
//    Mindeststärke 1,2 mm für Stege, Perlen etwas dicker. Die Teile überlappen als eigene Schalen; Slicer vereinigen sie.
//  · PNG: die aktuelle Ansicht, lange Seite 4000 px (oder weniger, wenn das Gerät nicht mehr zulässt), auf dunklem Grund.
// Alles rechnet auf dem Gerät.
import { T, TAU } from '../gemeinsam.js?v=1';

export function speichere(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export const megabyte = n => (n / 1048576).toFixed(1).replace('.', ',') + ' MB';

// ---------- GLB ----------
export async function glb(welt) {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
  welt.updateMatrixWorld(true);
  const zurueck = welt.matrixWorld.clone().invert();
  const relativ = new T.Matrix4(), M = new T.Matrix4(), I = new T.Matrix4();
  const aus = new T.Group(); aus.name = 'Zeitkoerper';
  const sichtbar = o => { for (let p = o; p && p !== welt; p = p.parent) if (!p.visible) return false; return true; };
  welt.traverse(o => {
    if (o === welt || !o.geometry || !sichtbar(o)) return;
    relativ.multiplyMatrices(zurueck, o.matrixWorld);
    if (o.isInstancedMesh) {
      if (!o.count) return;
      const teile = [];
      for (let i = 0; i < o.count; i++) { o.getMatrixAt(i, I); teile.push(o.geometry.clone().applyMatrix4(M.multiplyMatrices(relativ, I))); }
      aus.add(new T.Mesh(mergeGeometries(teile), o.material));
      teile.forEach(g => g.dispose());
    } else if (o.isLineSegments) {
      const n = Math.min(o.geometry.drawRange.count, o.geometry.attributes.position.count);
      if (!n) return;
      const g = new T.BufferGeometry();
      for (const [name, attr] of Object.entries(o.geometry.attributes)) g.setAttribute(name, new T.BufferAttribute(attr.array.slice(0, n * attr.itemSize), attr.itemSize));
      aus.add(new T.LineSegments(g.applyMatrix4(relativ), o.material));
    } else if (o.isMesh) {
      aus.add(new T.Mesh(o.geometry.clone().applyMatrix4(relativ), o.material));
    }
  });
  const daten = await new GLTFExporter().parseAsync(aus, { binary: true });
  aus.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  return new Blob([daten], { type: 'model/gltf-binary' });
}

// ---------- STL ----------
// ringe: [{ R, k, schichten: [Drehung je Schicht] }], dz: Höhe einer Schicht, mm: Durchmesser der Bodenplatte
export function stl(ringe, { dz, mm }) {
  const Rmax = Math.max(...ringe.map(x => x.R));
  const plattenR = Rmax + 0.07;
  const s = mm / (2 * plattenR);                 // Millimeter je Einheit
  const minR = 0.6 / s;                          // 1,2 mm Durchmesser
  const rSteg = Math.max(0.007, minR);
  const rPerle = Math.max(0.013, minR * 1.25);
  const rMarke = Math.max(0.022, minR * 1.6);
  const plattenH = Math.max(2 / s, 0.02);        // 2 mm

  const vorlage = g => { const n = g.index ? g.toNonIndexed() : g; return n.attributes.position.array; };
  const KUGEL = vorlage(new T.IcosahedronGeometry(1, 1));
  const STEG = vorlage(new T.CylinderGeometry(1, 1, 1, 6, 1, true));
  const PLATTE = vorlage(new T.CylinderGeometry(plattenR, plattenR, plattenH, 72));

  let puffer = new Float32Array(1 << 20), laenge = 0;
  const v = new T.Vector3(), M = new T.Matrix4(), q = new T.Quaternion(), sk = new T.Vector3(), mitte = new T.Vector3(), d = new T.Vector3();
  const OBEN = new T.Vector3(0, 1, 0);
  function lege(vorl, matrix) {
    if (laenge + vorl.length > puffer.length) { const neu = new Float32Array(Math.max(puffer.length * 2, laenge + vorl.length)); neu.set(puffer); puffer = neu; }
    for (let i = 0; i < vorl.length; i += 3) {
      v.set(vorl[i], vorl[i + 1], vorl[i + 2]).applyMatrix4(matrix);
      // Einheiten → Millimeter, y oben → z oben, Boden auf z = 0
      puffer[laenge++] = v.x * s; puffer[laenge++] = -v.z * s; puffer[laenge++] = (v.y + plattenH) * s;
    }
  }
  const kugel = (p, r) => lege(KUGEL, M.compose(p, q.identity(), sk.setScalar(r)));
  const steg = (a, b, r) => {
    d.subVectors(b, a); const l = d.length(); if (l < 1e-6) return;
    mitte.addVectors(a, b).multiplyScalar(0.5);
    lege(STEG, M.compose(mitte, q.setFromUnitVectors(OBEN, d.normalize()), sk.set(r, l, r)));
  };

  lege(PLATTE, M.makeTranslation(0, -plattenH / 2, 0));
  let hoehe = 0;
  for (const x of ringe) {
    const L = x.schichten.length; if (!L) continue;
    const abstand = TAU / x.k;
    for (let n = 0; n < L; n++) {
      const y = (n + 1) * dz, rot = x.schichten[n];
      for (let j = 0; j < x.k; j++) {
        const a = abstand * j + rot;
        const p = new T.Vector3(x.R * Math.cos(a), y, x.R * Math.sin(a));
        kugel(p, j === 0 ? rMarke : rPerle);
        let unten;
        if (n === 0) unten = new T.Vector3(p.x, 0, p.z);
        else {
          // nächste Perle der Schicht darunter (kleinster Winkelabstand)
          const vor = x.schichten[n - 1];
          let best = 0, bestW = Infinity;
          for (let i = 0; i < x.k; i++) {
            const w = Math.abs(Math.atan2(Math.sin(a - (abstand * i + vor)), Math.cos(a - (abstand * i + vor))));
            if (w < bestW) { bestW = w; best = i; }
          }
          const b = abstand * best + vor;
          unten = new T.Vector3(x.R * Math.cos(b), y - dz, x.R * Math.sin(b));
        }
        steg(unten, p, rSteg);
      }
    }
    const oben = L * dz; hoehe = Math.max(hoehe, oben);
    const reif = new T.TorusGeometry(x.R, rSteg, 6, 120); reif.rotateX(Math.PI / 2); reif.translate(0, oben, 0);
    lege(vorlage(reif), M.identity());
  }

  // binäres STL
  const dreiecke = laenge / 9;
  const buf = new ArrayBuffer(84 + dreiecke * 50), dv = new DataView(buf);
  const kopf = 'ORNAMENT FORMEN Zeitkoerper, mm, z oben';
  for (let i = 0; i < 80; i++) dv.setUint8(i, i < kopf.length ? kopf.charCodeAt(i) : 32);
  dv.setUint32(80, dreiecke, true);
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), n = new T.Vector3();
  let o = 84;
  for (let t = 0; t < dreiecke; t++) {
    const i = t * 9;
    a.set(puffer[i], puffer[i + 1], puffer[i + 2]); b.set(puffer[i + 3], puffer[i + 4], puffer[i + 5]); c.set(puffer[i + 6], puffer[i + 7], puffer[i + 8]);
    n.subVectors(c, b).cross(a.clone().sub(b)).normalize();
    dv.setFloat32(o, n.x, true); dv.setFloat32(o + 4, n.y, true); dv.setFloat32(o + 8, n.z, true); o += 12;
    for (let k = 0; k < 9; k++) { dv.setFloat32(o, puffer[i + k], true); o += 4; }
    o += 2;
  }
  return { blob: new Blob([buf], { type: 'model/stl' }), dreiecke, durchmesser: mm, hoehe: (hoehe + plattenH) * s };
}

// ---------- PNG ----------
export async function png(renderer, szene, kamera, grund = 0x151412) {
  const gl = renderer.getContext();
  const grenze = Math.min(4000, gl.getParameter(gl.MAX_RENDERBUFFER_SIZE), gl.getParameter(gl.MAX_TEXTURE_SIZE));
  const alt = renderer.getSize(new T.Vector2()), dichte = renderer.getPixelRatio();
  const quer = alt.x >= alt.y;
  const w = quer ? grenze : Math.round(grenze * alt.x / alt.y), h = quer ? Math.round(grenze * alt.y / alt.x) : grenze;
  const hintergrund = szene.background;
  szene.background = new T.Color(grund);
  renderer.setPixelRatio(1); renderer.setSize(w, h, false);
  renderer.render(szene, kamera);
  const blob = await new Promise(r => renderer.domElement.toBlob(r, 'image/png'));
  szene.background = hintergrund;
  renderer.setPixelRatio(dichte); renderer.setSize(alt.x, alt.y, false);
  return { blob, w, h };
}
