// Der Motor im AudioWorklet: Vorschau in Echtzeit mit genau dem Code, der auch exportiert (kern/motor.js).
// Nachrichten vom Hauptfaden: spur {id, kanaele} · weg {id} · referenz {kanaele|null} · zustand {…} · start {pos} · stop · stelle {pos}
// · schleife {a, b} | null. Zurück: anzeige (etwa 30-mal je Sekunde), ende.

import { Motor, BLOCK } from "../kern/motor.js";
import { PLUGINS } from "../plugins/register.js";

class MotorWorklet extends AudioWorkletProcessor {
  constructor() {
    super();
    this.m = new Motor(sampleRate, PLUGINS);
    this.aus = [new Float32Array(BLOCK), new Float32Array(BLOCK)];
    this.zaehler = 0;
    this.port.onmessage = ({ data: d }) => {
      try {
        if (d.art === "spur") this.m.spurLaden(d.id, d.kanaele);
        else if (d.art === "weg") this.m.spurEntfernen(d.id);
        else if (d.art === "referenz") this.m.referenzLaden(d.kanaele);
        else if (d.art === "zustand") this.m.setze(d.zustand);
        else if (d.art === "start") { if (Number.isFinite(d.pos)) this.m.pos = d.pos; this.m.laeuft = true; }
        else if (d.art === "stop") this.m.laeuft = false;
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
      out[0].set(this.aus[0].subarray(0, n));
      (out[1] ?? out[0]).set(this.aus[1].subarray(0, n));
      if (!this.m.schleife && this.m.pos >= this.m.laenge + sampleRate * 0.5) { this.m.laeuft = false; this.port.postMessage({ art: "ende" }); }
    }
    if (++this.zaehler % 12 === 0) this.port.postMessage({ art: "anzeige", laeuft: this.m.laeuft, ...this.m.anzeige() });
    return true;
  }
}
registerProcessor("composer-motor", MotorWorklet);
