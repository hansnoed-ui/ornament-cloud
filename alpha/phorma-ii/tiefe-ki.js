// PHORMA II – Tiefe von der KI (auf Wunsch): Depth Anything V2 (klein) mit transformers.js 3.8.1, im Browser auf dem Gerät (WebGPU, sonst WebAssembly).
// Das Foto verlässt das Gerät nicht; geladen werden nur die Bibliothek (cdn.jsdelivr.net) und einmal das Modell (huggingface.co, je nach Fassung
// rund 25–50 MB, danach im Cache des Browsers). Ohne Netz oder bei einem Fehler bleibt die aus dem Bild geschätzte Tiefe (analyse.js).
// Ergebnis: relative inverse Tiefe (gross = nah), auf die Grösse der Analyse gebracht; analyse.js/tiefeNormieren legt sie an die Kanten des Fotos.
const VERSION = "3.8.1";
const MODELLE = ["onnx-community/depth-anything-v2-small", "Xenova/depth-anything-small-hf"];
let geladen = null;

async function modell(melden) {
  const T = await import(`https://cdn.jsdelivr.net/npm/@huggingface/transformers@${VERSION}/dist/transformers.min.js`);
  T.env.allowLocalModels = false;
  const geraete = typeof navigator !== "undefined" && navigator.gpu ? ["webgpu", "wasm"] : ["wasm"];
  let fehler = null;
  for (const name of MODELLE) for (const device of geraete) {
    try {
      const pipe = await T.pipeline("depth-estimation", name, {
        device, dtype: device === "webgpu" ? "fp16" : "q8",
        progress_callback: (p) => { if (p?.status === "progress" && p.total) melden?.(`Das Tiefenmodell wird geladen … ${Math.round((p.loaded / p.total) * 100)} %`); },
      });
      return { T, pipe, name, device };
    } catch (e) { fehler = e; }
  }
  throw fehler ?? new Error("kein Tiefenmodell");
}

/** Tiefe für das Foto (Canvas in Filmgrösse) auf w × h (Zeile 0 oben, 1 nah); melden(text) für den Fortschritt */
export async function kiTiefe(foto, w, h, melden) {
  geladen ??= modell(melden).catch((e) => { geladen = null; throw e; });
  const { T, pipe, name, device } = await geladen;
  melden?.("Die KI schätzt die Tiefe …");
  const { predicted_depth: d } = await pipe(T.RawImage.fromCanvas(foto));
  const [H0, W0] = d.dims.slice(-2), q = d.data, aus = new Float32Array(w * h);
  let mn = Infinity, mx = -Infinity;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const fx = Math.min(W0 - 1.001, ((x + 0.5) / w) * W0 - 0.5), fy = Math.min(H0 - 1.001, ((y + 0.5) / h) * H0 - 0.5);
    const x0 = Math.max(0, Math.floor(fx)), y0 = Math.max(0, Math.floor(fy)), ax = Math.max(0, fx - x0), ay = Math.max(0, fy - y0), i = y0 * W0 + x0;
    const v = (q[i] * (1 - ax) + q[i + 1] * ax) * (1 - ay) + (q[i + W0] * (1 - ax) + q[i + W0 + 1] * ax) * ay;
    aus[y * w + x] = v; if (v < mn) mn = v; if (v > mx) mx = v;
  }
  for (let i = 0; i < aus.length; i++) aus[i] = (aus[i] - mn) / (mx - mn || 1);
  return { tiefe: aus, name, device };
}
