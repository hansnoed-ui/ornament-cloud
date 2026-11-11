// ORNAMENT COMPOSER – der Motor: liest die Spuren, rechnet ihre Plugin-Ketten, Pegel und Panorama, summiert, rechnet die Summenkette.
// Derselbe Motor läuft im AudioWorklet (worklet/motor-worklet.js, Vorschau in Echtzeit) und offline (kern/rendern.js, Export). Darum ist
// das, was man hört, Abtastwert für Abtastwert das, was exportiert wird (getestet).
//
// Vorher/nachher: Die Ketten laufen immer mit, auch wenn eine Spur auf «vorher» steht; so bleibt ihr Zustand warm und der Wechsel springt
// nicht. Mit dem Pegelausgleich wird das Unbearbeitete auf die Lautheit des Bearbeiteten gebracht (K-gewichtet, gleitend über 2 s), damit
// lauter nicht als besser gehört wird. Die Referenz wird auf die Lautheit der Summe gebracht.

import { ausDB, KEnergie, WahrerSpitzenwert, lufsAus, dB } from "./dsp.js";
import { bereinigeWerte } from "./plugin.js";

export const BLOCK = 128;
const AUSGLEICH_ZEIT = 2, AUSGLEICH_GRENZE = 18;   // s, dB

class Kette {
  constructor(plugins, rate) { this.plugins = plugins; this.rate = rate; this.glieder = []; }
  /** [{ plugin: "kanalzug@0.1.0", parameter, aus? }] → Instanzen; bestehende Instanzen gleichen Schlüssels bleiben (ihr Zustand auch) */
  setze(beschreibung = []) {
    const alt = this.glieder;
    this.glieder = beschreibung.map((b, i) => {
      const def = this.plugins[b.plugin];
      if (!def) throw new Error(`Plugin ${b.plugin} fehlt`);
      const g = alt[i]?.schluessel === b.plugin ? alt[i] : { schluessel: b.plugin, def, inst: def.erzeuge(this.rate), reduktion: 0 };
      g.aus = !!b.aus;
      g.inst.setze(bereinigeWerte(def, b.parameter));
      return g;
    });
  }
  prozess(k, n) { for (const g of this.glieder) { if (g.aus) { g.reduktion = 0; continue; } g.reduktion = g.inst.prozess(k, n).reduktion ?? 0; } }
  latenz() { return this.glieder.reduce((s, g) => s + (g.aus ? 0 : g.def.latenz?.(this.rate) ?? 0), 0); }
}

class Folger {   // gleitende K-gewichtete Energie je Abtastwert
  constructor(rate) { this.k = new KEnergie(rate); this.m = 0; this.a = Math.exp(-BLOCK / (AUSGLEICH_ZEIT * rate)); this.erst = true; }
  schritt(kanaele, n) { const e = this.k.block(kanaele, n) / n; if (this.erst && e > 0) { this.m = e; this.erst = false; } else this.m = this.a * this.m + (1 - this.a) * e; }
}

export class Motor {
  constructor(rate, plugins) {
    this.rate = rate; this.plugins = plugins;
    this.spuren = new Map();   // id → { kanaele: [L, R], laenge, kette, zustand, folgerTrocken, folgerNass, ausgleich, g, pan }
    this.master = { kette: new Kette(plugins, rate), pegel: 1 };
    this.referenz = null;      // { kanaele, laenge, folger, g }
    this.folgerSumme = new Folger(rate);
    this.pos = 0; this.laeuft = false; this.schleife = null; this.beobachtet = null; this.ausgleich = true; this.referenzAn = false; this.allesVorher = false;
    this.k = [new Float32Array(BLOCK), new Float32Array(BLOCK)]; this.t = [new Float32Array(BLOCK), new Float32Array(BLOCK)];
    this.messung = { tp: [new WahrerSpitzenwert(), new WahrerSpitzenwert()], bloecke: new Float64Array(Math.ceil((3 * rate) / BLOCK)), i: 0, energie: new KEnergie(rate), tpMax: 0 };
  }

  get laenge() { let m = 0; for (const s of this.spuren.values()) m = Math.max(m, s.laenge); return m; }

  /** eine Spur laden; einkanalig liegt auf beiden Seiten */
  spurLaden(id, kanaele) {
    const k = kanaele.length === 1 ? [kanaele[0], kanaele[0]] : kanaele.slice(0, 2);
    const alt = this.spuren.get(id);
    this.spuren.set(id, { kanaele: k, laenge: k[0].length, kette: alt?.kette ?? new Kette(this.plugins, this.rate), zustand: alt?.zustand ?? { pegel: 0, pan: 0 },
      folgerTrocken: new Folger(this.rate), folgerNass: new Folger(this.rate), g: alt?.g ?? 1, gAus: 1, spitze: 0 });
  }
  spurEntfernen(id) { this.spuren.delete(id); }
  referenzLaden(kanaele) { this.referenz = kanaele ? { kanaele: kanaele.length === 1 ? [kanaele[0], kanaele[0]] : kanaele, laenge: kanaele[0].length, folger: new Folger(this.rate), g: 1 } : null; }

  /**
   * Zustand aus dem Projekt: { spuren: [{ id, pegel (dB), pan (−1…1), stumm, solo, vorher, kette }], master: { pegel, kette },
   * ausgleich, allesVorher, referenzAn }
   */
  setze(z) {
    for (const s of z.spuren ?? []) { const sp = this.spuren.get(s.id); if (!sp) continue; sp.zustand = s; sp.kette.setze(s.kette); }
    if (z.master) { this.master.kette.setze(z.master.kette); this.master.pegel = ausDB(z.master.pegel ?? 0); }
    for (const k of ["ausgleich", "allesVorher", "referenzAn"]) if (k in z) this[k] = !!z[k];
    if ("beobachtet" in z) this.beobachtet = z.beobachtet;
  }

  /**
   * n ≤ BLOCK Abtastwerte rechnen und die Stelle weiterrücken. aus: [L, R]; einzeln (optional): Map id → [L, R], dort landet jede Spur nach
   * Pegel und Panorama (vor der Summenkette), für den Export der Stems.
   */
  block(aus, n, einzeln = null) {
    const [oL, oR] = aus, [kL, kR] = this.k, [tL, tR] = this.t;
    oL.fill(0, 0, n); oR.fill(0, 0, n);
    const solo = [...this.spuren.values()].some((s) => s.zustand.solo);
    // die Stelle je Abtastwert (die Schleife kann mitten im Block springen)
    const stellen = this._stellen ??= new Int32Array(BLOCK);
    let p = this.pos;
    for (let i = 0; i < n; i++) { if (this.schleife && p >= this.schleife.b) p = this.schleife.a; stellen[i] = p++; }
    for (const [id, s] of this.spuren) {
      const z = s.zustand, e = einzeln?.get(id);
      const vorher = z.vorher || this.allesVorher, still = z.stumm || (solo && !z.solo);
      // Die Lautheitsfolger (ein Viertel der Rechenzeit) laufen nur, wo sie gebraucht werden: auf «vorher» und auf der gewählten Spur
      // (für die Anzeige des Ausgleichs). Seit 11.11.2026; vorher liefen sie auf jeder Spur, und langsame Rechner kamen nicht mehr nach.
      const folgen = vorher || id === this.beobachtet;
      // eine stumme Spur, deren Ausblende vorbei ist, trägt nichts bei: ihre Kette ruht (entlastet langsame Rechner, die Summe bleibt gleich)
      if (still && s.gAus === 0 && !folgen) { if (e) { e[0].fill(0, 0, n); e[1].fill(0, 0, n); } s.spitze *= 0.9; continue; }
      for (let i = 0; i < n; i++) { const q = stellen[i]; const da = q < s.laenge; kL[i] = da ? s.kanaele[0][q] : 0; kR[i] = da ? s.kanaele[1][q] : 0; }
      if (folgen) { tL.set(kL.subarray(0, n)); tR.set(kR.subarray(0, n)); }
      s.kette.prozess(this.k, n);
      if (folgen) { s.folgerTrocken.schritt(this.t, n); s.folgerNass.schritt(this.k, n); }
      else { s.folgerTrocken.erst = s.folgerNass.erst = true; }
      // Pegelausgleich für «vorher»
      let gv = 1;
      if (folgen && this.ausgleich && s.folgerTrocken.m > 1e-12 && s.folgerNass.m > 1e-12) gv = Math.min(ausDB(AUSGLEICH_GRENZE), Math.max(ausDB(-AUSGLEICH_GRENZE), Math.sqrt(s.folgerNass.m / s.folgerTrocken.m)));
      s.ausgleichDB = dB(gv);
      const gZiel = still ? 0 : ausDB(z.pegel ?? 0), pan = z.pan ?? 0, gl = pan <= 0 ? 1 : 1 - pan, gr = pan >= 0 ? 1 : 1 + pan;
      const quelle = vorher ? this.t : this.k, fv = vorher ? gv : 1;
      let spitze = 0;
      for (let i = 0; i < n; i++) {
        const g = s.gAus + ((gZiel - s.gAus) * (i + 1)) / n;
        const l = quelle[0][i] * fv * g * gl, r = quelle[1][i] * fv * g * gr;
        oL[i] += l; oR[i] += r;
        if (e) { e[0][i] = l; e[1][i] = r; }
        const a = Math.max(Math.abs(l), Math.abs(r)); if (a > spitze) spitze = a;
      }
      s.gAus = gZiel; s.spitze = Math.max(spitze, s.spitze * 0.9);
    }
    // Summenkette und Summenpegel
    if (this.master.pegel !== 1) for (let i = 0; i < n; i++) { oL[i] *= this.master.pegel; oR[i] *= this.master.pegel; }
    this.master.kette.prozess(aus, n);
    this.folgerSumme.schritt(aus, n);
    // Referenz: an derselben Stelle (wiederholt, wenn sie kürzer ist), auf die Lautheit der Summe gebracht
    const ref = this.referenz;
    if (ref) {
      for (let i = 0; i < n; i++) { const q = stellen[i] % ref.laenge; kL[i] = ref.kanaele[0][q]; kR[i] = ref.kanaele[1][q]; }
      ref.folger.schritt(this.k, n);
      if (ref.folger.m > 1e-12 && this.folgerSumme.m > 1e-12) ref.g = Math.min(4, Math.sqrt(this.folgerSumme.m / ref.folger.m));
      if (this.referenzAn) for (let i = 0; i < n; i++) { oL[i] = kL[i] * ref.g; oR[i] = kR[i] * ref.g; }
    }
    this._messen(aus, n);
    this.pos = this.schleife && p >= this.schleife.b ? this.schleife.a : p;
  }

  _messen(aus, n) {
    const m = this.messung;
    m.bloecke[m.i] = m.energie.block(aus, n) / n; m.i = (m.i + 1) % m.bloecke.length;
    for (let c = 0; c < 2; c++) for (let i = 0; i < n; i++) { const v = m.tp[c].schritt(aus[c][i]); if (v > m.tpMax) m.tpMax = v; }
  }

  /** Anzeige: momentane (400 ms) und kurzzeitige (3 s) Lautheit, wahrer Spitzenwert seit dem letzten Abruf, je Spur Spitze und Reduktion */
  anzeige() {
    const m = this.messung, B = m.bloecke.length, nM = Math.max(1, Math.round((0.4 * this.rate) / BLOCK));
    let sM = 0, sK = 0;
    for (let j = 0; j < B; j++) { const v = m.bloecke[(m.i - 1 - j + 2 * B) % B]; sK += v; if (j < nM) sM += v; }
    const tp = m.tpMax; m.tpMax = 0;
    return {
      pos: this.pos, momentan: lufsAus(sM / nM), kurz: lufsAus(sK / B), tp: dB(tp),
      master: this.master.kette.glieder.map((g) => g.reduktion), referenzDB: this.referenz ? dB(this.referenz.g) : null,
      spuren: [...this.spuren].map(([id, s]) => ({ id, spitze: dB(s.spitze), reduktion: s.kette.glieder.map((g) => g.reduktion), ausgleich: s.ausgleichDB ?? 0 })),
    };
  }
}
