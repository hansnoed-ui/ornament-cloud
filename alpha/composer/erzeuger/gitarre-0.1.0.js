// Gitarre 0.1.0 (ornament.bienne, Phase 3, Schritt a) – gezupfte und angeschlagene Saiten aus eigener Synthese, keine Samples, kein
// fremder Code. Jede Note ist eine Saite: Karplus-Strong mit zwei Schwingungsebenen (leicht verstimmt, verschieden schnell abklingend:
// der Ton lebt), Anschlag mit Finger oder Plektrum, Zupfpunkt als Kamm. Danach je Stimme ein eigener Weg:
//   clean      E-Gitarre: Tonabnehmer (Kamm an seiner Stelle), Ton-Regler, ein wenig Röhre – für Arpeggien und klare Akkorde
//   schwelle   E-Gitarre mit Lautstärke-Schwellen (Volume-Pedal/Bogen-artig): der Anschlag verschwindet, der Ton steigt an – Flächen
//   akustisch  Stahlsaiten mit Holzkorpus (Luft- und Deckenresonanzen), heller Anschlag
//   nylon      Nylonsaiten, weiche Kuppe, dunkler und kürzer
// Akkorde schlägt nicht die Stimme an, sondern das Arrangement: je Saite eine Note mit kleinem Versatz (siehe tools/bienne-hoerproben).
// Nach der Veröffentlichung nicht mehr verändern; neue Klänge in gitarre-0.2.0.js.

import { zufall, SVF, spitze } from "./grund.js";

const P = (key, name, gruppe, min, max, std, einheit = "", mehr = {}) => ({ key, name, gruppe, min, max, std, einheit, ...mehr });
const V = (name, beschreibung, werte) => ({ name, beschreibung, werte });

function fertig(L, R, staerke) {
  const m = spitze(L, R) || 1, g = (0.9 * Math.min(1.2, staerke)) / m, n = L.length, aus = Math.min(n, 192);
  for (let i = 0; i < n; i++) { L[i] *= g; R[i] *= g; }
  for (let i = 0; i < aus; i++) { const k = i / aus; L[n - 1 - i] *= k; R[n - 1 - i] *= k; }
  return [L, R];
}
const saettige = (x, g, n) => (g > 1 ? Math.tanh(g * x) / n : x);

/**
 * Eine Saite mit zwei Schwingungsebenen. Anregung: Finger (breiter Halbsinus) bis Plektrum (schmal, mit Rauschen), durch einen Kamm für
 * den Zupfpunkt. Verlustfilter aus «hell», Abklingen aus «saite» (s auf −60 dB), am Notenende abgedämpft («ab»).
 */
function saite(w, rate, { frequenz, dauer, staerke, seed }) {
  const rnd = zufall(seed), n = Math.ceil((dauer + (w.ab / 1000) * 1.4 + 0.02) * rate), ende = Math.round(dauer * rate), out = new Float32Array(n);
  const plek = w.plektrum / 100, breite = Math.max(2, Math.round((0.0004 + 0.0035 * (1 - plek)) * rate * (0.8 + 0.4 * (1 - staerke))));
  const kamm = Math.max(1, Math.round((rate / frequenz) * w.position)), anr = new Float32Array(breite + kamm + 2);
  for (let i = 0; i < breite; i++) anr[i] = Math.sin((Math.PI * i) / breite) * (0.85 + 0.3 * rnd()) + (rnd() - 0.5) * 0.5 * plek;
  for (let i = anr.length - 1; i >= kamm; i--) anr[i] -= anr[i - kamm];
  const ebenen = [[1, 0.62, 1], [1 + w.schweben / 1200, 0.38, 0.72]].map(([fak, anteil, laenger]) => {
    const f = frequenz * fak, L = rate / f, N = Math.ceil(L) + 4;
    return { L, N, buf: new Float32Array(N), pos: 0, alt: 0, anteil, t60: w.saite * laenger, f };
  });
  const hell = 0.5 + 0.48 * (w.hell / 100) * (0.75 + 0.25 * staerke), tab = Math.max(0.015, w.ab / 1000);
  for (let i = 0; i < n; i++) {
    const ein = i < anr.length ? anr[i] : 0;
    let s = 0;
    for (const e of ebenen) {
      const rp = e.pos - e.L + e.N * 4, a = Math.floor(rp), fr = rp - a, y = e.buf[a % e.N] * (1 - fr) + e.buf[(a + 1) % e.N] * fr;
      const verlust = 10 ** (-3 / (e.f * (i < ende ? e.t60 : tab)));
      const gef = verlust * (hell * y + (1 - hell) * e.alt); e.alt = y;
      e.buf[e.pos % e.N] = gef + ein; e.pos++;
      s += (y + ein) * e.anteil;
    }
    out[i] = s;
  }
  return out;
}

const SAITE = (std) => [
  P("plektrum", "Plektrum", "Anschlag", 0, 100, std.plektrum, "%", { hilfe: "0 = weiche Fingerkuppe, 100 = hartes Plektrum" }),
  P("position", "Zupfpunkt", "Anschlag", 0.04, 0.5, std.position, "", { schritt: 0.01, hilfe: "nahe am Steg = hell und drahtig, zur Mitte = rund" }),
  P("saite", "Nachklang", "Saite", 0.3, 12, std.saite, "s", { skala: "log" }),
  P("hell", "Helligkeit", "Saite", 0, 100, std.hell, "%"),
  P("schweben", "Schweben", "Saite", 0, 8, std.schweben ?? 2.5, "Cent", { schritt: 0.1, hilfe: "zweite Schwingungsebene leicht verstimmt: der Ton lebt" }),
  P("ab", "Abdämpfen", "Saite", 15, 1500, std.ab, "ms", { skala: "log", hilfe: "wie schnell die Hand am Notenende dämpft" }),
];

/** Tonabnehmer und Verstärker der E-Gitarre: Kamm an der Stelle des Tonabnehmers, Ton-Regler, Röhre, leichte Kompression */
function verstaerker(s, w, rate, frequenz) {
  const d = Math.max(1, Math.round((rate / frequenz) * w.abnehmer)), lp = new SVF().setze(w.ton, 0.75, rate), hp = new SVF().setze(90, 0.7, rate);
  const mitte = new SVF().setze(750, 0.8, rate), g = 10 ** (w.antrieb / 20), gn = Math.tanh(g);
  for (let i = s.length - 1; i >= d; i--) s[i] = s[i] - 0.65 * s[i - d];
  for (let i = 0; i < s.length; i++) { const x = hp.schritt(s[i]).hoch; s[i] = saettige(lp.schritt(x + 0.35 * mitte.schritt(x).band).tief, g, gn); }
  return s;
}
const VERSTAERKER = (abnehmer, ton, antrieb) => [
  P("abnehmer", "Tonabnehmer", "Verstärker", 0.05, 0.4, abnehmer, "", { schritt: 0.01, hilfe: "Steg (klein) = dünn und hell, Hals (gross) = rund" }),
  P("ton", "Ton", "Verstärker", 1200, 9000, ton, "Hz", { skala: "log" }),
  P("antrieb", "Röhre", "Verstärker", 0, 24, antrieb, "dB", { schritt: 0.1 }),
];
/** Holzkorpus: Luftresonanz, Deckenmoden, etwas Glanz */
function korpus(s, rate, liste, menge, glanz) {
  const modi = liste.map(([f, q]) => new SVF().setze(f, q, rate)), hp = new SVF().setze(70, 0.7, rate), lp = new SVF().setze(glanz, 0.7, rate);
  for (let i = 0; i < s.length; i++) { let b = 0; for (const m of modi) b += m.schritt(s[i]).band; s[i] = lp.schritt(hp.schritt(s[i] * (1 - 0.45 * menge) + b * menge).hoch).tief; }
  return s;
}
const mono = (s) => [s, Float32Array.from(s)];

const clean = {
  key: "clean", name: "E-Gitarre clean", rolle: "gitarre", pan: 0, pegel: -6,
  parameter: [...SAITE({ plektrum: 55, position: 0.14, saite: 3.5, hell: 55, ab: 90 }), ...VERSTAERKER(0.22, 4200, 4)],
  varianten: [
    V("Hals rund", "Halstonabnehmer, weich, für Arpeggien", {}),
    V("Steg glasig", "hell und dünn, klingt lange", { abnehmer: 0.09, ton: 6500, hell: 70, plektrum: 70, saite: 5 }),
    V("gedämpft", "Handballen am Steg: kurz und perkussiv", { saite: 0.5, ab: 40, hell: 35, ton: 2600 }),
    V("angezerrt", "Röhre warm angefahren", { antrieb: 14, ton: 3400, abnehmer: 0.18 }),
  ],
  rechne(w, rate, o) { return fertig(...mono(verstaerker(saite(w, rate, o), w, rate, o.frequenz)), o.staerke ?? 0.8); },
};
const schwelle = {
  key: "schwelle", name: "E-Gitarre Schwelle", rolle: "gitarre", pan: 0, pegel: -8,
  parameter: [...SAITE({ plektrum: 40, position: 0.18, saite: 8, hell: 50, ab: 600, schweben: 4 }), ...VERSTAERKER(0.25, 3600, 6),
    P("schwellen", "Schwellen", "Hülle", 50, 2500, 650, "ms", { skala: "log", hilfe: "Zeit, bis der Ton voll da ist; der Anschlag verschwindet" })],
  varianten: [
    V("weit", "langsam ansteigend, lang klingend", {}),
    V("kurz", "schneller Anstieg, für Melodien", { schwellen: 220, saite: 4 }),
    V("dunkel", "wenig Höhen, viel Röhre", { ton: 2200, antrieb: 12, hell: 30 }),
  ],
  rechne(w, rate, o) {
    const s = verstaerker(saite(w, rate, o), w, rate, o.frequenz), a = (w.schwellen / 1000) * rate;
    for (let i = 0; i < s.length; i++) { const x = Math.min(1, i / a); s[i] *= x * x * (3 - 2 * x); }
    return fertig(...mono(s), o.staerke ?? 0.8);
  },
};
const akustisch = {
  key: "akustisch", name: "Akustikgitarre (Stahl)", rolle: "gitarre", pan: 0, pegel: -5,
  parameter: [...SAITE({ plektrum: 60, position: 0.13, saite: 3, hell: 70, ab: 120, schweben: 3 }),
    P("koerper", "Korpus", "Klang", 0, 100, 55, "%", { hilfe: "Luft- und Deckenresonanzen des Holzes" })],
  varianten: [
    V("offen", "hell, mit Plektrum", {}),
    V("Finger", "mit den Fingern, wärmer", { plektrum: 15, hell: 55, position: 0.2 }),
    V("nah", "wenig Korpus, direkt", { koerper: 25 }),
  ],
  rechne(w, rate, o) { return fertig(...mono(korpus(saite(w, rate, o), rate, [[105, 4], [215, 5], [390, 4], [1100, 2]], w.koerper / 100, 9000)), o.staerke ?? 0.8); },
};
const nylon = {
  key: "nylon", name: "Nylongitarre", rolle: "gitarre", pan: 0, pegel: -4,
  parameter: [...SAITE({ plektrum: 5, position: 0.22, saite: 2, hell: 40, ab: 110, schweben: 1.5 }),
    P("koerper", "Korpus", "Klang", 0, 100, 60, "%")],
  varianten: [
    V("warm", "weiche Kuppe, rund", {}),
    V("Nagel", "mit Nagel, klarer", { plektrum: 35, hell: 55, position: 0.15 }),
  ],
  rechne(w, rate, o) { return fertig(...mono(korpus(saite(w, rate, o), rate, [[98, 4], [200, 5], [410, 3]], w.koerper / 100, 5500)), o.staerke ?? 0.8); },
};

export default {
  id: "gitarre", version: "0.1.0", name: "Gitarre", melodisch: true,
  beschreibung: "Gitarren aus eigener Synthese (Karplus-Strong, zwei Ebenen): E-Gitarre clean und mit Schwellen, Stahl- und Nylongitarre.",
  stimmen: Object.fromEntries([clean, schwelle, akustisch, nylon].map((s) => [s.key, s])),
};
