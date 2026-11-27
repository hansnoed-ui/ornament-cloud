// Skizzen (seit 27. November 2026, Logbuch in docs/skizzen.md): wilde Versuche, je eine kurze Schleife zu einem Begriff, in wechselnden
// Stoffen (Sand, Tinte, Kreide, Farbe auf Wasser, Geflecht) statt nur Metall. Christian: «Wilde Versuche, nicht ausführlich erklärt,
// sondern verbunden mit Aspekten, Begriffen, Konzepten.» 4:5, 20 s, 30 Bilder je Sekunde, ohne Text.
// Jede Skizze (skizzen/<name>.js) zeichnet Bild n zur Phase p (0 bis 1) auf eine 2D-Leinwand; wer einen Shader braucht, holt sich mit
// shader() eine WebGL-Fläche in doppelter Auflösung, die auf die Leinwand heruntergerechnet wird. Schleifen schliessen, weil alles aus p
// gerechnet ist oder weil eine Simulation im Leeren beginnt und im Leeren endet.
const q = new globalThis.URLSearchParams(globalThis.location.search);
const NAME = q.get('skizze') || 'chladni', B = 1080, H = 1350;
export const BILDER = 600;
const leinwand = globalThis.document.getElementById('leinwand'); leinwand.width = B; leinwand.height = H;
const c = leinwand.getContext('2d'); c.imageSmoothingQuality = 'high';

/** Vollbild-Shader: frag bekommt «uniform vec2 res» und alles, was zeichne({name: Zahl | [Zahlen]}) setzt */
function shader(frag, dichte = 2) {
  const fl = globalThis.document.createElement('canvas'); fl.width = B * dichte; fl.height = H * dichte;
  const gl = fl.getContext('webgl', { antialias: false, preserveDrawingBuffer: true });
  const baue = (art, text) => { const s = gl.createShader(art); gl.shaderSource(s, text); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, baue(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'));
  // eine Erweiterungszeile (#extension …) muss vor allem anderen stehen
  const erw = frag.startsWith('#extension') ? frag.slice(0, frag.indexOf('\n') + 1) : '';
  if (erw) gl.getExtension('OES_standard_derivatives');
  gl.attachShader(pr, baue(gl.FRAGMENT_SHADER, erw + 'precision highp float;uniform vec2 res;\n' + frag.slice(erw.length)));
  gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.bindAttribLocation(pr, 0, 'a'); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(gl.getUniformLocation(pr, 'res'), fl.width, fl.height);
  return {
    zeichne(uni = {}) {
      for (const [k, v] of Object.entries(uni)) {
        const o = gl.getUniformLocation(pr, k); if (!o) continue;
        if (typeof v === 'number') gl.uniform1f(o, v);
        else if (v.length === 2) gl.uniform2fv(o, v); else if (v.length === 3) gl.uniform3fv(o, v); else if (v.length === 4) gl.uniform4fv(o, v);
        else gl.uniform1fv(o, v);
      }
      gl.viewport(0, 0, fl.width, fl.height); gl.drawArrays(gl.TRIANGLES, 0, 3);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.drawImage(fl, 0, 0, B, H);
    },
    setze(name, werte, n) { const o = gl.getUniformLocation(pr, name); if (o) gl['uniform' + n + 'fv'](o, werte); },
  };
}

const modul = await import(`./skizzen/${NAME}.js`);
const skizze = await modul.baue({ leinwand, c, B, H, shader });
globalThis.film = { BILDER, bild(n) { skizze.stelle((n % BILDER) / BILDER, n); return leinwand.toDataURL('image/jpeg', 0.93); } };
globalThis.bereit = true;
