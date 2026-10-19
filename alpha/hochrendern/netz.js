// Hochrendern – das Netz auf der Grafikkarte (WebGPU): Real-ESRGAN in der kompakten Fassung (SRVGGNetCompact, BSD-3, xinntao/Real-ESRGAN):
// 3 × 3-Faltungen mit PReLU, zuletzt 48 Kanäle, die PixelShuffle ×4 zu einem Bild ordnet, dazu das Eingabebild (nächster Nachbar ×4).
// Gewichte aus modelle/<name>.bin (float16, geschrieben von tools/hochrendern/web-gewichte.py), dieselben wie im Werkzeug tools/hochrendern/.
// Gerechnet wird in Kacheln mit einem Rand von so vielen Pixeln, wie das Netz Faltungen hat: innen ist jede Kachel genau wie das ganze Bild,
// und der Grafikspeicher reicht auch für 4K. Für ×2 wird das Ergebnis ×4 im Mittel aus 2 × 2 Pixeln verkleinert, für ×1 aus 4 × 4.

/** float16 → Zahl */
function halb(h) {
  const e = (h >> 10) & 31, m = h & 1023;
  const v = e === 0 ? m * 2 ** -24 : e === 31 ? (m ? NaN : Infinity) : (1 + m / 1024) * 2 ** (e - 15);
  return h & 0x8000 ? -v : v;
}

/** Inhalt einer .bin-Datei → [{ cin, cout, prelu, w, b, p }] (w in der Reihenfolge von torch: cout × cin × 3 × 3); ohne DOM, für die Tests */
export function gewichteLesen(puffer) {
  const dv = new DataView(puffer);
  if (String.fromCharCode(...new Uint8Array(puffer, 0, 4)) !== "SRVG" || dv.getUint32(4, true) !== 1) throw new Error("keine Gewichte für Hochrendern");
  const n = dv.getUint32(8, true), schichten = [];
  let o = 12 + n * 12;
  const lies = (anzahl) => { const a = new Float32Array(anzahl); for (let i = 0; i < anzahl; i++, o += 2) a[i] = halb(dv.getUint16(o, true)); return a; };
  for (let i = 0; i < n; i++) {
    const [cin, cout, prelu] = [0, 4, 8].map((d) => dv.getUint32(12 + i * 12 + d, true));
    schichten.push({ cin, cout, prelu: !!prelu });
  }
  for (const s of schichten) { s.w = lies(s.cout * s.cin * 9); s.b = lies(s.cout); s.p = s.prelu ? lies(s.cout) : null; }
  if (o !== puffer.byteLength) throw new Error("Gewichte unvollständig");
  return schichten;
}

/** die Gewichte einer Faltung so, wie der Shader sie liest: [(k · CIN + ci) · cout + co], k = 3 · ky + kx, CIN auf Vielfache von 4 aufgefüllt */
export function umordnen({ cin, cout, w }) {
  const CIN = Math.ceil(cin / 4) * 4, aus = new Float32Array(9 * CIN * cout);
  for (let co = 0; co < cout; co++) for (let ci = 0; ci < cin; ci++) for (let k = 0; k < 9; k++) aus[(k * CIN + ci) * cout + co] = w[(co * cin + ci) * 9 + k];
  return aus;
}

/** Shader einer Faltung: je Thread ein Pixel und 16 Ausgabekanäle (z: welche 16); Kachel und Gewichte je 16 Eingabekanäle im gemeinsamen Speicher */
function faltungWGSL(CIN4, COUT4, prelu) {
  const CHUNK = Math.min(4, CIN4), CH = CHUNK * 4;
  return /* wgsl */ `
struct P { w: u32, h: u32, ox: i32, oy: i32 };
@group(0) @binding(0) var<storage, read> ein: array<vec4f>;
@group(0) @binding(1) var<storage, read_write> aus: array<vec4f>;
@group(0) @binding(2) var<storage, read> gew: array<vec4f>;
@group(0) @binding(3) var<storage, read> extra: array<vec4f>;
@group(0) @binding(4) var<uniform> p: P;
const CIN4 = ${CIN4}u; const COUT4 = ${COUT4}u; const CHUNK = ${CHUNK}u; const CH = ${CH}u;
var<workgroup> kachel: array<vec4f, ${100 * CHUNK}>;
var<workgroup> sgew: array<vec4f, ${9 * CH * 4}>;
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(workgroup_id) wg: vec3u, @builtin(local_invocation_id) l: vec3u) {
  let x = wg.x * 8u + l.x; let y = wg.y * 8u + l.y; let gruppe = wg.z; let li = l.y * 8u + l.x;
  var acc = array<vec4f, 4>(extra[gruppe * 4u], extra[gruppe * 4u + 1u], extra[gruppe * 4u + 2u], extra[gruppe * 4u + 3u]);
  for (var c0 = 0u; c0 < CIN4; c0 += CHUNK) {
    for (var i = li; i < 100u * CHUNK; i += 64u) {
      let q = i / CHUNK; let c = i % CHUNK;
      let tx = i32(wg.x * 8u) - 1 + i32(q % 10u); let ty = i32(wg.y * 8u) - 1 + i32(q / 10u);
      var v = vec4f(0.0);
      if (tx >= 0 && ty >= 0 && u32(tx) < p.w && u32(ty) < p.h) { v = ein[(u32(ty) * p.w + u32(tx)) * CIN4 + c0 + c]; }
      kachel[i] = v;
    }
    for (var i = li; i < 9u * CH * 4u; i += 64u) {
      let g = i % 4u; let r = i / 4u; let cl = r % CH; let k = r / CH;
      sgew[i] = gew[(k * CIN4 * 4u + c0 * 4u + cl) * COUT4 + gruppe * 4u + g];
    }
    workgroupBarrier();
    for (var k = 0u; k < 9u; k++) {
      let q = (l.y + k / 3u) * 10u + l.x + k % 3u;
      for (var c = 0u; c < CHUNK; c++) {
        let v = kachel[q * CHUNK + c]; let b = (k * CH + c * 4u) * 4u;
        for (var g = 0u; g < 4u; g++) { acc[g] += v.x * sgew[b + g] + v.y * sgew[b + 4u + g] + v.z * sgew[b + 8u + g] + v.w * sgew[b + 12u + g]; }
      }
    }
    workgroupBarrier();
  }
  if (x < p.w && y < p.h) {
    for (var g = 0u; g < 4u; g++) {
      var r = acc[g];
      ${prelu ? "let a = extra[COUT4 + gruppe * 4u + g]; r = max(r, vec4f(0.0)) + a * min(r, vec4f(0.0));" : ""}
      aus[(y * p.w + x) * COUT4 + gruppe * 4u + g] = r;
    }
  }
}`;
}

const EINLESEN = /* wgsl */ `
struct P { w: u32, h: u32, ox: i32, oy: i32 };
@group(0) @binding(0) var bild: texture_2d<f32>;
@group(0) @binding(1) var<storage, read_write> aus: array<vec4f>;
@group(0) @binding(4) var<uniform> p: P;
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= p.w || id.y >= p.h) { return; }
  aus[id.y * p.w + id.x] = vec4f(textureLoad(bild, vec2i(p.ox + i32(id.x), p.oy + i32(id.y)), 0).rgb, 0.0);
}`;

// PixelShuffle ×4 (Kanal c · 16 + 4 · j + i gibt das Pixel (i, j) im Block 4 × 4) plus das Eingabebild, je Probe auf 0 … 1 begrenzt, im Mittel aus
// s × s Proben (s = 4 / Faktor) in das Ausgabebild (RGBA8)
const AUSGEBEN = /* wgsl */ `
struct Q { w: u32, kx: u32, ky: u32, kw: u32, kh: u32, ax: u32, ay: u32, f: u32, s: u32, bw: u32, _a: u32, _b: u32 };
@group(0) @binding(0) var<storage, read> merk: array<vec4f>;
@group(0) @binding(1) var<storage, read> ein: array<vec4f>;
@group(0) @binding(2) var<storage, read_write> aus: array<u32>;
@group(0) @binding(3) var<uniform> q: Q;
@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) id: vec3u) {
  if (id.x >= q.kw * q.f || id.y >= q.kh * q.f) { return; }
  var summe = vec3f(0.0);
  for (var sy = 0u; sy < q.s; sy++) {
    for (var sx = 0u; sx < q.s; sx++) {
      let X = id.x * q.s + sx; let Y = id.y * q.s + sy; let i = X % 4u; let j = Y % 4u;
      let pix = (q.ky + Y / 4u) * q.w + q.kx + X / 4u;
      let v = vec3f(merk[pix * 12u + j][i], merk[pix * 12u + 4u + j][i], merk[pix * 12u + 8u + j][i]) + ein[pix].rgb;
      summe += clamp(v, vec3f(0.0), vec3f(1.0));
    }
  }
  aus[(q.ay + id.y) * q.bw + q.ax + id.x] = pack4x8unorm(vec4f(summe / f32(q.s * q.s), 1.0));
}`;

/** Grafikkarte holen; null ohne WebGPU. Die Grenzen so hoch, wie der Adapter erlaubt (grössere Kacheln, weniger Rand). Der Adapter bleibt im
 *  Ergebnis: räumt der Browser ihn weg, schlägt in Chromium später mapAsync fehl («A valid external Instance reference no longer exists») */
export async function grafik() {
  if (typeof navigator === "undefined" || !navigator.gpu) return null;
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: "high-performance" });
  if (!adapter) return null;
  const L = adapter.limits;
  const device = await adapter.requestDevice({ requiredLimits: { maxStorageBufferBindingSize: L.maxStorageBufferBindingSize, maxBufferSize: L.maxBufferSize } });
  return { adapter, device, info: adapter.info ?? {} };
}

/**
 * Das Netz mit seinen Gewichten auf der Grafikkarte. rechne(quelle, breite, hoehe, faktor) → { daten (RGBA, Uint8Array), breite, hoehe }; quelle:
 * eine Leinwand oder ein ImageBitmap (ein VideoFrame oder Video-Element erst auf eine Leinwand zeichnen, siehe app.js). faktor 1, 2 oder 4.
 * kachel: nur für die Tests.
 */
export function netz(device, schichten, { kachel: vorgabe = 0 } = {}) {
  const L = schichten.length, rand = L;
  const groesste = Math.min(device.limits.maxStorageBufferBindingSize, device.limits.maxBufferSize, 512 << 20);
  const kachel = vorgabe || ([512, 384, 256, 192, 128, 96, 64].find((t) => (t + 2 * rand) ** 2 * 256 <= groesste) ?? 64);
  const R = kachel + 2 * rand;
  const puffer = (groesse, usage) => device.createBuffer({ size: Math.max(16, Math.ceil(groesse / 16) * 16), usage });
  const S = GPUBufferUsage.STORAGE, K = GPUBufferUsage.COPY_DST;
  const feld = [puffer(R * R * 256, S), puffer(R * R * 256, S)], einPuffer = puffer(R * R * 16, S);
  const pUni = puffer(16, GPUBufferUsage.UNIFORM | K), qUni = puffer(48, GPUBufferUsage.UNIFORM | K);
  const programme = new Map();
  const programm = (code) => {
    if (!programme.has(code)) programme.set(code, device.createComputePipeline({ layout: "auto", compute: { module: device.createShaderModule({ code }), entryPoint: "main" } }));
    return programme.get(code);
  };
  // je Faltung: Gewichte, Bias und PReLU auf die Karte, das Programm und die Bindung (liest aus dem einen Feld, schreibt ins andere)
  const stufen = schichten.map((s, i) => {
    const CIN4 = Math.ceil(s.cin / 4), COUT4 = s.cout / 4, gew = umordnen(s), extra = new Float32Array(2 * s.cout);
    extra.set(s.b); if (s.p) extra.set(s.p, s.cout);
    const g = puffer(gew.byteLength, S | K), e = puffer(extra.byteLength, S | K);
    device.queue.writeBuffer(g, 0, gew); device.queue.writeBuffer(e, 0, extra);
    const pipe = programm(faltungWGSL(CIN4, COUT4, s.prelu));
    const quelle = i === 0 ? einPuffer : feld[(i + 1) % 2], ziel = feld[i % 2];
    const bindung = device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [quelle, ziel, g, e, pUni].map((buffer, k) => ({ binding: k, resource: { buffer } })) });
    return { pipe, bindung, gruppen: COUT4 / 4, puffer: [g, e] };
  });
  const merk = feld[(L - 1) % 2];
  if (schichten.at(-1).cout !== 48) throw new Error("das Netz endet nicht mit 48 Kanälen (×4)");
  const einlesen = programm(EINLESEN), ausgeben = programm(AUSGEBEN);
  let tex = null, ausPuffer = null, lesePuffer = null, einBindung = null, ausBindung = null, mass = "";

  async function rechne(quelle, breite, hoehe, faktor = 2) {
    const f = faktor, bw = breite * f, bh = hoehe * f;
    if (mass !== `${breite}x${hoehe}x${f}`) {
      mass = `${breite}x${hoehe}x${f}`;
      for (const x of [tex, ausPuffer, lesePuffer]) x?.destroy();
      tex = device.createTexture({ size: [breite, hoehe], format: "rgba8unorm", usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
      ausPuffer = puffer(bw * bh * 4, S | GPUBufferUsage.COPY_SRC);
      lesePuffer = puffer(bw * bh * 4, GPUBufferUsage.MAP_READ | K);
      einBindung = device.createBindGroup({ layout: einlesen.getBindGroupLayout(0), entries: [{ binding: 0, resource: tex.createView() }, { binding: 1, resource: { buffer: einPuffer } }, { binding: 4, resource: { buffer: pUni } }] });
      ausBindung = device.createBindGroup({ layout: ausgeben.getBindGroupLayout(0), entries: [merk, einPuffer, ausPuffer, qUni].map((buffer, k) => ({ binding: k, resource: { buffer } })) });
    }
    device.queue.copyExternalImageToTexture({ source: quelle }, { texture: tex }, [breite, hoehe]);
    for (let cy = 0; cy < hoehe; cy += kachel) for (let cx = 0; cx < breite; cx += kachel) {
      const cw = Math.min(kachel, breite - cx), ch = Math.min(kachel, hoehe - cy);
      const x0 = Math.max(0, cx - rand), y0 = Math.max(0, cy - rand), w = Math.min(breite, cx + cw + rand) - x0, h = Math.min(hoehe, cy + ch + rand) - y0;
      device.queue.writeBuffer(pUni, 0, new Int32Array([w, h, x0, y0]));
      device.queue.writeBuffer(qUni, 0, new Uint32Array([w, cx - x0, cy - y0, cw, ch, cx * f, cy * f, f, 4 / f, bw, 0, 0]));
      const enc = device.createCommandEncoder(), pass = enc.beginComputePass();
      pass.setPipeline(einlesen); pass.setBindGroup(0, einBindung); pass.dispatchWorkgroups(Math.ceil(w / 8), Math.ceil(h / 8));
      for (const s of stufen) { pass.setPipeline(s.pipe); pass.setBindGroup(0, s.bindung); pass.dispatchWorkgroups(Math.ceil(w / 8), Math.ceil(h / 8), s.gruppen); }
      pass.setPipeline(ausgeben); pass.setBindGroup(0, ausBindung); pass.dispatchWorkgroups(Math.ceil((cw * f) / 8), Math.ceil((ch * f) / 8));
      pass.end();
      device.queue.submit([enc.finish()]);
    }
    const enc = device.createCommandEncoder();
    enc.copyBufferToBuffer(ausPuffer, 0, lesePuffer, 0, bw * bh * 4);
    device.queue.submit([enc.finish()]);
    await lesePuffer.mapAsync(GPUMapMode.READ, 0, bw * bh * 4);
    const daten = new Uint8Array(lesePuffer.getMappedRange(0, bw * bh * 4).slice(0));
    lesePuffer.unmap();
    return { daten, breite: bw, hoehe: bh };
  }

  return {
    rechne, kachel, rand,
    entsorgen() { for (const x of [...feld, einPuffer, pUni, qUni, tex, ausPuffer, lesePuffer, ...stufen.flatMap((s) => s.puffer)]) x?.destroy(); },
  };
}
