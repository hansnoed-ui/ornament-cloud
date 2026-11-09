// ORNAMENT AV STUDIO – Steuersignale aus einem Composer-Export (ohne DOM, in Node getestet).
//
// Erste Quelle ist der Composer (av-studio.md §5): Die Stems eines Exports sind sauber getrennt, das Projekt kennt die Funktion jeder Spur
// (Kick, Backbeat, Höhen, Perkussion, Bass, Pad, Melodie, Natur), die Abschnitte des Arrangements und die Unterbrechungen. Daraus werden je
// Filmbild (fps) gerechnet:
//   huelle[gruppe]   Hüllkurve 0–1 je Funktionsgruppe (Effektivwert über ein Filmbild, Anstieg 8 ms, Abfall 180 ms, auf das 95. Perzentil normiert)
//   impuls[gruppe]   1 beim Einsatz, klingt mit 250 ms ab (Einsatz = Anstieg der Hüllkurve über 0,22 in einem Bild, frühestens 90 ms nach dem letzten)
//   einsaetze[gruppe] Zeiten der Einsätze in Sekunden
//   abschnitte       aus dem Projekt (Arrangement 0.2), in Sekunden
//   brueche          Bildbrüche aus den Unterbrechungen der Kick- bzw. ersten Drumspur: Stutter, Wirbel, Tape-Stop, Rückwärts, kurze Dropouts
// Zeitbezug: Filmbild i deckt [i/fps, (i+1)/fps); der Effektivwert ist um die Bildmitte zentriert. Keine Latenz (alles offline).

import { funktionVon } from "../../composer/kern/arrangement.js";

export const STEUERUNG_VERSION = "0.1.0";
export const GRUPPEN = ["kick", "backbeat", "oben", "perkussion", "bass", "pad", "melodie", "natur", "summe"];
/** Funktion im Arrangement → Gruppe der Steuersignale */
const GRUPPE_VON = { kick: "kick", backbeat: "backbeat", oben: "oben", perkussion: "perkussion", mix: "perkussion", bass: "bass", pad: "pad", melodie: "melodie", natur: "natur", naturklang: "natur", fremd: "pad" };

export const dateiname = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "composer";

/** Hüllkurve je Filmbild aus Stereokanälen */
export function huellkurve(kanaele, rate, fps, n) {
  const roh = new Float32Array(n), hop = rate / fps, an = Math.exp(-1 / (0.008 * fps)), ab = Math.exp(-1 / (0.18 * fps));
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, Math.floor(i * hop)), b = Math.min(kanaele[0].length, Math.floor((i + 1) * hop));
    let s = 0; for (const k of kanaele) for (let j = a; j < b; j += 2) s += k[j] * k[j];
    roh[i] = Math.sqrt(s / Math.max(1, ((b - a) / 2) * kanaele.length));
  }
  const out = new Float32Array(n); let v = 0;
  for (let i = 0; i < n; i++) { const x = roh[i]; v = x > v ? an * v + (1 - an) * x : ab * v + (1 - ab) * x; out[i] = Math.max(x * 0.6, v); }
  const sortiert = Float32Array.from(out).sort(), p95 = sortiert[Math.floor(n * 0.95)] || 1e-9;
  for (let i = 0; i < n; i++) out[i] = Math.min(1, out[i] / p95);
  return out;
}

/** Einsätze und Impulse aus einer Hüllkurve */
export function impulse(h, fps, { schwelle = 0.22, abstand = 0.09, abfall = 0.25 } = {}) {
  const n = h.length, imp = new Float32Array(n), zeiten = [], k = Math.exp(-1 / (abfall * fps));
  let letzte = -1e9, v = 0;
  for (let i = 1; i < n; i++) {
    if (h[i] - h[i - 1] > schwelle && (i - letzte) / fps >= abstand) { v = 1; letzte = i; zeiten.push(i / fps); } else v *= k;
    imp[i] = v;
  }
  return { imp, zeiten };
}

/**
 * export: { projekt (composer.json), summe: [L, R], rate, stems: Map dateiname → [L, R] }. fps Filmbilder je Sekunde.
 * Gibt { fps, n, dauer, huelle, impuls, einsaetze, abschnitte, brueche, spuren: [{ name, gruppe }] } zurück.
 */
export function signaleAus({ projekt, summe, rate, stems }, fps = 30) {
  const dauer = summe[0].length / rate, n = Math.ceil(dauer * fps);
  const gruppen = Object.fromEntries(GRUPPEN.map((g) => [g, null]));
  const spuren = [];
  for (const sp of projekt.spuren ?? []) {
    const k = stems.get(dateiname(sp.name)); if (!k) continue;
    const g = GRUPPE_VON[funktionVon(sp.quelle)] ?? "pad";
    spuren.push({ name: sp.name, gruppe: g });
    if (!gruppen[g]) gruppen[g] = [new Float32Array(k[0].length), new Float32Array(k[0].length)];
    for (let c = 0; c < 2; c++) { const z = gruppen[g][c], q = k[c] ?? k[0]; for (let i = 0; i < Math.min(z.length, q.length); i++) z[i] += q[i]; }
  }
  gruppen.summe = summe;
  const huelle = {}, impuls = {}, einsaetze = {};
  for (const g of GRUPPEN) {
    if (!gruppen[g]) { huelle[g] = new Float32Array(n); impuls[g] = new Float32Array(n); einsaetze[g] = []; continue; }
    huelle[g] = huellkurve(gruppen[g], rate, fps, n);
    const r = impulse(huelle[g], fps, g === "kick" ? { schwelle: 0.3 } : g === "backbeat" ? { schwelle: 0.25 } : {});
    impuls[g] = r.imp; einsaetze[g] = r.zeiten;
  }
  const takt = (60 / (projekt.tempo?.bpm ?? 120)) * 4, beginn = projekt.tempo?.beginn ?? 0;
  const abschnitte = (projekt.abschnitte ?? [{ typ: "haupt", name: "ganz", von: 0, bis: dauer / takt }]).map((a) => ({ ...a, a: beginn + a.von * takt, b: Math.min(dauer, beginn + a.bis * takt) }));
  // Bildbrüche: aus der Kick (sonst der ersten Drumspur); nur Arten, die als Bild etwas bedeuten
  const fuehrend = (projekt.spuren ?? []).find((s) => s.quelle?.stimme === "kick") ?? (projekt.spuren ?? []).find((s) => /^(drums|perkussion)@/.test(s.quelle?.erzeuger ?? ""));
  const brueche = [];
  for (const e of fuehrend?.ereignisse ?? []) {
    if (e.aus || !["stutter", "wirbel", "tapestop", "tapestart", "rueckwaerts", "dropout"].includes(e.art)) continue;
    const wdh = e.alle > 0 ? Math.ceil((dauer / takt - e.takt) / e.alle) : 1;
    for (let r = 0; r < wdh; r++) {
      const a = beginn + (e.takt + r * (e.alle || 0)) * takt, b = Math.min(dauer, a + (e.schritte / 16) * takt);
      if (e.art === "dropout" && e.schritte > 8) continue;   // lange Stille (Abschnitte ohne Kick) ist kein Bruch, nur kurzes Stocken
      if (a < dauer) brueche.push({ art: e.art, a, b, werte: e.werte ?? {}, takt });
    }
  }
  brueche.sort((x, y) => x.a - y.a);
  return { fps, n, dauer, huelle, impuls, einsaetze, abschnitte, brueche, spuren };
}

/**
 * die Bildzeit zur Musikzeit t: Bildbrüche verformen die Zeit des Materials (Stutter wiederholt ein Stück, Tape-Stop bremst bis zum
 * Stillstand, Rückwärts läuft zurück, kurzes Stocken hält das Bild an). Gibt { t, dunkel (0–1) } zurück.
 */
export function bildzeit(t, brueche) {
  for (const e of brueche) {
    if (t < e.a || t >= e.b) continue;
    const L = e.b - e.a, u = (t - e.a) / L;
    if (e.art === "stutter") { const st = e.takt / (e.werte.teilung ?? 16); return { t: e.a + ((t - e.a) % st), dunkel: 0 }; }
    if (e.art === "wirbel") { const st = Math.max(e.takt / 64, (e.takt / 8) * 0.8 ** Math.floor(u * 12)); return { t: e.a + ((t - e.a) % st), dunkel: 0 }; }
    if (e.art === "tapestop") { const k = e.werte.kurve ?? 1; return { t: e.a + (L * (1 - (1 - u) ** (k + 1))) / (k + 1), dunkel: u * 0.5 }; }
    if (e.art === "tapestart") { const k = e.werte.kurve ?? 1; return { t: e.b - (L * (1 - u ** (k + 1))) / (k + 1), dunkel: (1 - u) * 0.5 }; }
    if (e.art === "rueckwaerts") return { t: e.b - (t - e.a), dunkel: 0 };
    if (e.art === "dropout") return { t: e.a, dunkel: 0.6 };
  }
  return { t, dunkel: 0 };
}

/** ein Signal zur Zeit t (linear zwischen den Filmbildern) */
export function wert(sig, t, fps) { const x = t * fps, i = Math.floor(x), f = x - i; const a = sig[Math.min(sig.length - 1, Math.max(0, i))] ?? 0, b = sig[Math.min(sig.length - 1, i + 1)] ?? a; return a + (b - a) * f; }

/** der Abschnitt zur Zeit t und die Stelle darin (0–1) */
export function abschnittBei(t, abschnitte) {
  const a = abschnitte.find((x) => t >= x.a && t < x.b) ?? abschnitte.at(-1);
  return { ...a, u: a ? Math.min(1, Math.max(0, (t - a.a) / Math.max(1e-6, a.b - a.a))) : 0 };
}
