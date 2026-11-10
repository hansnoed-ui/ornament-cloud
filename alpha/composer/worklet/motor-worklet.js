// Der Motor im AudioWorklet: Vorschau in Echtzeit mit genau dem Code, der auch exportiert (kern/motor.js).
// Nachrichten vom Hauptfaden: spur {id, kanaele} · weg {id} · referenz {kanaele|null} · zustand {…} · start {pos} · stop · stelle {pos}
// · schleife {a, b} | null. start/stop blenden 15 ms ein bzw. aus (mit sofort: true ohne Blende). Zurück: anzeige (etwa 30-mal je Sekunde), ende.

import { Motor, BLOCK } from "../kern/motor.js";
import { PLUGINS } from "../plugins/register.js";

class MotorWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.m = new Motor(sampleRate, PLUGINS);
    this.aus = [new Float32Array(BLOCK), new Float32Array(BLOCK)];
    this.zaehler = 0;
    // Ein- und Ausblenden beim Start und Halt (15 ms), damit nichts knackt; der Motor selbst bleibt unberührt (bitgleich zum Export)
    this.g = 0; this.ziel = 0; this.schritt = 1 / Math.max(1, Math.round(0.015 * sampleRate));
    this.port.onmessage = ({ data: d }) => {
      try {
        if (d.art === "spur") this.m.spurLaden(d.id, d.kanaele);
        else if (d.art === "weg") this.m.spurEntfernen(d.id);
        else if (d.art === "referenz") this.m.referenzLaden(d.kanaele);
        else if (d.art === "zustand") this.m.setze(d.zustand);
        else if (d.art === "start") { if (Number.isFinite(d.pos)) this.m.pos = d.pos; this.m.laeuft = true; this.ziel = 1; if (d.sofort) this.g = 1; }
        else if (d.art === "stop") { this.ziel = 0; if (d.sofort) { this.g = 0; this.m.laeuft = false; } }
        else if (d.art === "stelle") this.m.pos = d.pos;
        else if (d.art === "schleife") this.m.schleife = d.schleife;
      } catch (e) { this.port.postMessage({ art: "fehler", text: String(e?.message ?? e) }); }
    };
  }
  process(_ein, ausgaenge) {
    const out = ausgaenge[0], n = out[0].length;
    if (!this.m.laeuft) { for (const k of out) k.fill(0); }
    else {
      this.m.block(this.aus, n);
      const [L, R] = this.aus;
      if (this.g !== 1 || this.ziel !== 1) {
        const d = this.ziel > this.g ? this.schritt : -this.schritt;
        for (let i = 0; i < n; i++) { if (this.g !== this.ziel) this.g = d > 0 ? Math.min(this.ziel, this.g + d) : Math.max(this.ziel, this.g - d); L[i] *= this.g; R[i] *= this.g; }
        if (this.g === 0 && this.ziel === 0) this.m.laeuft = false;
      }
      out[0].set(L.subarray(0, n));
      (out[1] ?? out[0]).set(R.subarray(0, n));
      if (!this.m.schleife && this.m.pos >= this.m.laenge + sampleRate * 0.5) { this.m.laeuft = false; this.g = this.ziel = 0; this.port.postMessage({ art: "ende" }); }
    }
    if (++this.zaehler % 12 === 0) this.port.postMessage({ art: "anzeige", laeuft: this.m.laeuft, ...this.m.anzeige() });
    return true;
  }
}
registerProcessor("composer-motor", MotorWorklet);
