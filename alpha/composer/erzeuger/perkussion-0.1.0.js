// Perkussion 0.1.0 – organische Instrumente aus Fell-, Holz- und Metallmoden: Tabla (Dayan und Bayan), Darbuka, Rahmentrommel (Bendir mit
// Schnarrsaite), Riq, Zarb (Tombak), Udu. Richtung: Indien, Anouar Brahem, ECM; natürlich, präzise, mit Raum aus dem Plugin «Raum».
//
// Physik, vereinfacht: Eine Membran schwingt in Moden mit festen Verhältnissen (ideale Kreismembran 1 : 1,594 : 2,136 : 2,296 …); die
// Tabla ist dank ihres Syahi-Flecks fast harmonisch (1 : 2 : 3 : 4 : 5, C. V. Raman 1934). Wo man trifft, entscheidet, welche Moden
// klingen (Mitte: die runden Moden; Rand: die hohen); wie lange die Hand liegen bleibt, entscheidet über Dämpfung und Helligkeit (kurzer
// Kontakt = hell). Die Bayan gleitet nach oben, wenn der Handballen das Fell spannt. Kein fremder Code, keine Samples.
// Nach der Veröffentlichung nicht mehr verändern; neue Klänge in perkussion-0.2.0.js.

import { zufall, moden, rauschen, spitze, SVF, TAU } from "./grund.js";

const P = (key, name, gruppe, min, max, std, einheit = "", mehr = {}) => ({ key, name, gruppe, min, max, std, einheit, ...mehr });
const V = (name, beschreibung, werte) => ({ name, beschreibung, werte });
const MEMBRAN = [1, 1.594, 2.136, 2.296, 2.653, 2.918, 3.156, 3.501, 3.6, 3.652, 4.06, 4.154];

/** gemeinsame Regler aller Instrumente */
const GEMEINSAM = (tonStd, tonMin, tonMax) => [
  P("ton", "Stimmung", "Instrument", tonMin, tonMax, tonStd, "Hz", { skala: "log", hilfe: "Grundton des Fells" }),
  P("klang", "Nachklang", "Instrument", 0.3, 2.5, 1, "×", { skala: "log", hilfe: "wie lange das Fell klingt" }),
  P("hell", "Helligkeit", "Instrument", -6, 6, 0, "dB/Okt", { schritt: 0.1, hilfe: "hohe Moden lauter oder leiser" }),
  P("haerte", "Hand", "Spiel", 0, 100, 50, "%", { hilfe: "weich = Ballen, hart = Fingerspitze" }),
  P("breite", "Breite", "Spiel", 0, 100, 35, "%", { hilfe: "links und rechts minimal verstimmt: natürliche Breite" }),
];

/**
 * einen Schlag aus Teilen rechnen. teile: [{ moden: [{ f, a, t60, gleiten? }], anschlag, gleiten, gleitZeit, rauschen: [opts für grund.rauschen] }].
 * Breite: links und rechts je um ±breite·4 Cent verstimmt, mit eigener Saat für das Rauschen. Die Helligkeit kippt die Amplituden um die
 * tiefste Mode. Gibt [L, R] zurück, Spitze 0,95 × Stärke × pegel.
 */
function schlag(w, rate, { staerke = 1, seed = 1 }, teile, pegel = 1) {
  const h = 0.4 + 0.6 * Math.min(1, staerke), hand = 0.35 + 1.3 * (w.haerte / 100);
  const tiefste = Math.min(...teile.flatMap((t) => t.moden ?? []).map((m) => m.f), 1e9);
  const dauer = Math.max(0.05, ...teile.flatMap((t) => [...(t.moden ?? []).map((m) => m.t60 * w.klang), ...(t.rauschen ?? []).map((r) => r.t60 + (r.start ?? 0))]));
  const n = Math.ceil(Math.min(4, dauer * 1.35 + 0.02) * rate);
  const kanaele = [0, 1].map((c) => {
    const rnd = zufall(seed * 7 + c * 1013 + 1), s = new Float32Array(n), cent = (c ? 1 : -1) * (w.breite / 100) * 4;
    for (const t of teile) {
      if (t.moden) {
        const liste = t.moden.map((m) => ({ ...m, f: m.f * 2 ** ((cent + (rnd() - 0.5) * 2) / 1200), t60: m.t60 * w.klang, a: m.a * 10 ** ((w.hell * Math.log2(Math.max(1, m.f / tiefste))) / 20) * (0.93 + 0.14 * rnd()), phase: (t.phase ?? 0) }));
        moden(s, rate, liste, { gleiten: t.gleiten ?? 0, gleitZeit: t.gleitZeit ?? 0.12, anschlag: (t.anschlag ?? 0.0008) / (hand * h), start: Math.round((t.start ?? 0) * rate) });
      }
      for (const r of t.rauschen ?? []) rauschen(s, rate, rnd, { ...r, staerke: r.staerke * (r.hellAbh ? h : 1), start: Math.round((r.start ?? 0) * rate) });
      if (t.funktion) t.funktion(s, rate, rnd, c);
    }
    return s;
  });
  const m = spitze(...kanaele) || 1, g = (0.95 * Math.min(1.2, staerke) * pegel) / m, aus = Math.min(n, 240);
  for (const s of kanaele) { for (let i = 0; i < n; i++) s[i] *= g; for (let i = 0; i < aus; i++) s[n - 1 - i] *= i / aus; }
  return kanaele;
}

// ---------- Tabla ----------
// Dayan (rechte, hohe Trommel) fast harmonisch; Bayan (linke, tiefe) mit Gleiten.
const dayan = (f, art) => {
  const H = [1, 2, 3, 4, 5, 6.05, 7.1].map((k) => f * k);
  if (art === "na") return { moden: [{ f: H[0], a: 0.15, t60: 0.08 }, { f: H[1], a: 1, t60: 0.9 }, { f: H[2], a: 0.6, t60: 0.6 }, { f: H[3], a: 0.35, t60: 0.4 }, { f: H[4], a: 0.25, t60: 0.3 }, { f: H[5], a: 0.15, t60: 0.15 }, { f: H[6], a: 0.1, t60: 0.1 }], anschlag: 0.00035, rauschen: [{ staerke: 0.25, t60: 0.008, auf: 0.0002, art: "band", f: 5000, q: 0.8, hellAbh: true }] };
  if (art === "tin") return { moden: [{ f: H[0], a: 0.35, t60: 0.2 }, { f: H[1], a: 1, t60: 1.1 }, { f: H[2], a: 0.45, t60: 0.7 }, { f: H[3], a: 0.2, t60: 0.4 }, { f: H[4], a: 0.12, t60: 0.25 }], anschlag: 0.0006, rauschen: [{ staerke: 0.12, t60: 0.01, auf: 0.0003, art: "band", f: 3500, q: 0.8 }] };
  if (art === "tun") return { moden: [{ f: H[0], a: 1, t60: 1.4 }, { f: H[1], a: 0.45, t60: 0.9 }, { f: H[2], a: 0.25, t60: 0.6 }, { f: H[3], a: 0.1, t60: 0.35 }], anschlag: 0.0012 };
  // te, ti, ra: geschlossen auf dem Syahi, die Finger bleiben liegen
  const leise = art === "ra" ? 0.6 : 1;
  return { moden: [{ f: H[0] * 1.02, a: 0.7 * leise, t60: 0.05 }, { f: H[1] * 0.98, a: 0.5 * leise, t60: 0.04 }, { f: f * 2.9, a: 0.3 * leise, t60: 0.03 }], anschlag: 0.0011, rauschen: [{ staerke: 0.35 * leise, t60: 0.025, auf: 0.0005, art: "band", f: 1100, q: 0.9 }] };
};
const bayan = (f, art, gl) => {
  if (art === "ke") return { moden: [{ f: f * 1.1, a: 0.6, t60: 0.045 }, { f: f * 1.9, a: 0.3, t60: 0.03 }], anschlag: 0.002, rauschen: [{ staerke: 0.5, t60: 0.03, auf: 0.0006, art: "band", f: 520, q: 0.8 }, { staerke: 0.12, t60: 0.01, auf: 0.0003, art: "band", f: 2500, q: 0.8 }] };
  return { moden: [{ f, a: 1, t60: 0.9 }, { f: f * 1.52, a: 0.3, t60: 0.5 }, { f: f * 2.01, a: 0.28, t60: 0.45 }, { f: f * 2.56, a: 0.12, t60: 0.3 }, { f: f * 3.1, a: 0.07, t60: 0.2 }], anschlag: 0.0014, gleiten: gl, gleitZeit: 0.14,
    rauschen: [{ staerke: 0.08, t60: 0.02, auf: 0.0005, art: "band", f: 700, q: 0.8 }] };
};
const TABLA_SCHLAEGE = {
  na: (w) => [dayan(w.ton, "na")], ta: (w) => [dayan(w.ton, "na")], tin: (w) => [dayan(w.ton, "tin")], tun: (w) => [dayan(w.ton, "tun")],
  te: (w) => [dayan(w.ton, "te")], ti: (w) => [dayan(w.ton, "te")], ra: (w) => [dayan(w.ton, "ra")],
  ge: (w) => [bayan(w.bayan, "ge", w.gleiten)], ghe: (w) => [bayan(w.bayan, "ge", w.gleiten * 1.8)], ke: (w) => [bayan(w.bayan, "ke")], ka: (w) => [bayan(w.bayan, "ke")], ki: (w) => [bayan(w.bayan, "ke")],
  dha: (w) => [dayan(w.ton, "na"), { ...bayan(w.bayan, "ge", w.gleiten), start: 0.003 }], dhin: (w) => [dayan(w.ton, "tin"), { ...bayan(w.bayan, "ge", w.gleiten), start: 0.003 }],
  dhi: (w) => [dayan(w.ton, "tin"), { ...bayan(w.bayan, "ge", w.gleiten), start: 0.003 }],
};
const TABLA_PEGEL = { te: 0.55, ti: 0.55, ra: 0.4, ke: 0.6, ka: 0.6, ki: 0.5, tin: 0.85, tun: 0.9 };
const tabla = {
  key: "tabla", name: "Tabla", rolle: "perkussion", pan: 0.15, pegel: -2,
  parameter: [...GEMEINSAM(290, 200, 600), P("bayan", "Bayan", "Instrument", 60, 170, 98, "Hz", { skala: "log", hilfe: "Grundton der tiefen Trommel" }), P("gleiten", "Bayan gleitet", "Spiel", 0, 7, 2.5, "Halbtöne", { schritt: 0.1, hilfe: "der Handballen spannt das Fell nach dem Schlag" })],
  artikulationen: Object.keys(TABLA_SCHLAEGE).map((k) => ({ key: k, name: k })),
  varianten: [
    V("Konzert", "in D, klar und offen", { ton: 293.7 * 0.982 }),
    V("tief", "in Cis, dunkel und weich", { ton: 262, bayan: 88, hell: -2, haerte: 35 }),
    V("hell", "hoch gestimmt, spritzig", { ton: 360, bayan: 105, hell: 2, haerte: 75 }),
    V("trocken", "kurz, präzise, nah", { klang: 0.55, gleiten: 1, breite: 15 }),
    V("singend", "langer Nachklang, starkes Gleiten", { klang: 1.6, gleiten: 4.5, hell: -1 }),
    V("Studio", "warm und breit", { hell: -1.5, haerte: 45, breite: 60 }),
  ],
  rechne(w, rate, { art = "na", staerke, seed }) { const f = TABLA_SCHLAEGE[art] ?? TABLA_SCHLAEGE.na; return schlag(w, rate, { staerke, seed }, f(w), TABLA_PEGEL[art] ?? 1); },
};

// ---------- Darbuka ----------
const ALU = [2140, 3390, 5270];   // das Klingen des Metallkörpers
const darbukaSchlag = (w, art) => {
  const f = w.ton, M = MEMBRAN.map((r) => f * r), metall = w.metall / 100;
  if (art === "doum") return [{ moden: [{ f: M[0], a: 1, t60: 0.55 }, { f: M[1], a: 0.22, t60: 0.3 }, { f: M[3], a: 0.35, t60: 0.28 }, { f: M[8], a: 0.15, t60: 0.15 }, { f: f * 0.72, a: 0.35, t60: 0.25 }], anschlag: 0.0016,
    rauschen: [{ staerke: 0.1, t60: 0.02, auf: 0.0006, art: "band", f: 400, q: 0.8 }] }];
  if (art === "pa") return [{ moden: [{ f: M[1] * 1.05, a: 0.6, t60: 0.05 }, { f: M[3], a: 0.4, t60: 0.04 }], anschlag: 0.0018, rauschen: [{ staerke: 0.6, t60: 0.025, auf: 0.0004, art: "band", f: 1300, q: 0.7 }] }];
  const ka = art === "ka" ? 0.7 : 1;
  return [{ moden: [...[6.3, 8.2, 11.4, 14.7, 18.1].map((r, i) => ({ f: f * r, a: [1, 0.7, 0.5, 0.3, 0.2][i] * ka, t60: [0.12, 0.09, 0.07, 0.05, 0.04][i] })), ...ALU.map((fa, i) => ({ f: fa, a: metall * [0.25, 0.18, 0.1][i] * ka, t60: 0.4 - i * 0.08 }))],
    anschlag: art === "ka" ? 0.0004 : 0.00025, rauschen: [{ staerke: 0.45 * ka, t60: 0.006, auf: 0.0001, art: "band", f: 4200, q: 0.8, hellAbh: true }] }];
};
const darbuka = {
  key: "darbuka", name: "Darbuka", rolle: "perkussion", pan: -0.15, pegel: -2,
  parameter: [...GEMEINSAM(105, 70, 180), P("metall", "Körper", "Instrument", 0, 100, 40, "%", { hilfe: "Klingen des Metallkörpers (Aluminium); 0 = Ton oder Holz" })],
  artikulationen: [{ key: "doum", name: "Doum (Mitte)" }, { key: "tek", name: "Tek (Rand)" }, { key: "ka", name: "Ka (Rand, andere Hand)" }, { key: "pa", name: "Pa (geschlossen)" }],
  varianten: [
    V("ägyptisch", "Aluminium, klar", {}),
    V("Ton", "Keramik, warm, ohne Metall", { metall: 0, hell: -2, klang: 1.2, ton: 95 }),
    V("türkisch", "Kupfer, tiefer, rund", { ton: 88, metall: 25, hell: -1, haerte: 40 }),
    V("Solo hell", "hart und hell", { ton: 125, hell: 2.5, haerte: 80, metall: 55 }),
    V("ECM leise", "weich, intim", { haerte: 25, hell: -3, klang: 1.3, metall: 15, breite: 55 }),
    V("trocken", "kurz, präzise", { klang: 0.6, metall: 20 }),
  ],
  rechne(w, rate, { art = "doum", staerke, seed }) { return schlag(w, rate, { staerke, seed }, darbukaSchlag(w, art), art === "ka" ? 0.65 : art === "pa" ? 0.7 : 1); },
};

// ---------- Rahmentrommel (Bendir mit Schnarrsaite, Tar) ----------
function schnarre(staerke, f, t60) {
  return (s, rate, rnd) => {
    const n = Math.min(s.length, Math.ceil(t60 * 1.3 * rate)), bp = new SVF().setze(2600, 0.9, rate), hp = new SVF().setze(1200, 0.7, rate), r = Math.exp(-6.907755 / (t60 * rate));
    let e = staerke;
    for (let i = 0; i < n; i++) { const fell = Math.abs(Math.sin((TAU * f * i) / rate)); s[i] += hp.schritt(bp.schritt((rnd() * 2 - 1) * fell * fell).band).hoch * e * 3; e *= r; }
  };
}
const rahmen = {
  key: "rahmen", name: "Rahmentrommel", rolle: "perkussion", pan: 0, pegel: -2,
  parameter: [...GEMEINSAM(68, 45, 140), P("schnarr", "Schnarrsaite", "Instrument", 0, 100, 45, "%", { hilfe: "die Saiten unter dem Fell der Bendir; 0 = Tar" })],
  artikulationen: [{ key: "dum", name: "Dum (Mitte)" }, { key: "tek", name: "Tek (Rand)" }, { key: "sak", name: "Sak (geschlossen)" }],
  varianten: [
    V("Bendir", "tief mit Schnarrsaite", {}),
    V("Tar", "ohne Saite, rund", { schnarr: 0, ton: 78, klang: 1.3 }),
    V("gross tief", "sehr tief, lang", { ton: 52, klang: 1.6, schnarr: 30, hell: -2 }),
    V("ECM Raum", "weich, schwebend", { haerte: 25, klang: 1.8, hell: -3, schnarr: 20, breite: 70 }),
    V("summend", "viel Saite", { schnarr: 90 }),
    V("trocken", "nah, kurz", { klang: 0.55, schnarr: 25 }),
  ],
  rechne(w, rate, { art = "dum", staerke, seed }) {
    const f = w.ton, M = MEMBRAN.map((r) => f * r), sn = w.schnarr / 100;
    let teile;
    if (art === "dum") teile = [{ moden: [{ f: M[0], a: 1, t60: 0.9 }, { f: M[1], a: 0.3, t60: 0.6 }, { f: M[3], a: 0.35, t60: 0.5 }, { f: M[8], a: 0.12, t60: 0.3 }], anschlag: 0.0025, funktion: sn ? schnarre(sn * 0.35, M[0], 0.6 * w.klang) : null }];
    else if (art === "sak") teile = [{ moden: [{ f: M[2], a: 0.6, t60: 0.06 }, { f: M[5], a: 0.4, t60: 0.05 }], anschlag: 0.002, rauschen: [{ staerke: 0.5, t60: 0.03, auf: 0.0005, art: "band", f: 900, q: 0.7 }], funktion: sn ? schnarre(sn * 0.15, M[2], 0.08) : null }];
    else teile = [{ moden: [5.2, 6.7, 8.4, 10.3, 12.9].map((r, i) => ({ f: f * r, a: [1, 0.7, 0.5, 0.3, 0.2][i], t60: [0.25, 0.2, 0.15, 0.1, 0.08][i] })), anschlag: 0.0004, rauschen: [{ staerke: 0.3, t60: 0.008, auf: 0.0002, art: "band", f: 3000, q: 0.8, hellAbh: true }], funktion: sn ? schnarre(sn * 0.45, f * 5.2, 0.3 * w.klang) : null }];
    return schlag(w, rate, { staerke, seed }, teile, art === "sak" ? 0.6 : art === "tek" ? 0.8 : 1);
  },
};

// ---------- Riq: Schellen ----------
/** ein Schellenpaar: sechs Metallmoden, mehrmals angestossen (die Plättchen schlagen gegeneinander) */
function schellen(anzahl, zeit, staerke) {
  return (s, rate, rnd) => {
    for (let k = 0; k < anzahl; k++) {
      const t = k === 0 ? 0 : rnd() * zeit, a = staerke * (k === 0 ? 1 : 0.3 + 0.6 * rnd()) * Math.exp(-t / (zeit + 1e-3)), basis = 2800 + rnd() * 1500;
      moden(s, rate, [1, 1.47, 1.93, 2.51, 3.12, 3.77].map((r, i) => ({ f: basis * r * (1 + 0.01 * (rnd() - 0.5)), a: a * [1, 0.8, 0.6, 0.5, 0.35, 0.25][i], t60: 0.32 - i * 0.04, phase: rnd() * TAU })), { anschlag: 0.0001, start: Math.round(t * rate) });
    }
  };
}
const riq = {
  key: "riq", name: "Riq", rolle: "perkussion", pan: 0.3, pegel: -6,
  parameter: [...GEMEINSAM(240, 150, 400), P("schellen", "Schellen", "Instrument", 0, 100, 70, "%"), P("rasseln", "Nachrasseln", "Spiel", 0, 100, 40, "%", { hilfe: "wie lange die Schellen nachschlagen" })],
  artikulationen: [{ key: "dum", name: "Dum" }, { key: "tek", name: "Tek" }, { key: "zil", name: "Schellen allein" }, { key: "sak", name: "Sak (gedämpft)" }],
  varianten: [V("klassisch", "hell, klar", {}), V("dunkel", "Messing, weich", { hell: -3, schellen: 55, haerte: 35 }), V("viel Schellen", "rasselnd", { schellen: 95, rasseln: 75 }), V("ECM leise", "zart", { haerte: 20, schellen: 45, rasseln: 25, hell: -2 }), V("trocken", "kurz", { klang: 0.5, rasseln: 10 }), V("Fell", "mehr Trommel", { schellen: 35, klang: 1.4 })],
  rechne(w, rate, { art = "tek", staerke, seed }) {
    const f = w.ton, M = MEMBRAN.map((r) => f * r), sch = w.schellen / 100, ras = 0.01 + 0.06 * (w.rasseln / 100);
    let teile;
    if (art === "dum") teile = [{ moden: [{ f: M[0], a: 1, t60: 0.35 }, { f: M[3], a: 0.3, t60: 0.2 }], anschlag: 0.002, funktion: schellen(3, ras, sch * 0.35) }];
    else if (art === "zil") teile = [{ funktion: schellen(6, ras * 1.5, 1) }];
    else if (art === "sak") teile = [{ moden: [{ f: M[2], a: 0.5, t60: 0.05 }], anschlag: 0.002, rauschen: [{ staerke: 0.4, t60: 0.03, auf: 0.0005, art: "band", f: 1500, q: 0.7 }], funktion: schellen(2, 0.005, sch * 0.2) }];
    else teile = [{ moden: [5.6, 7.3, 9.6].map((r, i) => ({ f: f * r, a: [0.6, 0.4, 0.25][i], t60: 0.08 })), anschlag: 0.0003, funktion: schellen(4, ras, sch) }];
    return schlag(w, rate, { staerke, seed }, teile, art === "sak" ? 0.6 : art === "zil" ? 0.8 : 1);
  },
};

// ---------- Zarb (Tombak) ----------
const zarb = {
  key: "zarb", name: "Zarb", rolle: "perkussion", pan: -0.25, pegel: -2,
  parameter: [...GEMEINSAM(112, 75, 180)],
  artikulationen: [{ key: "tom", name: "Tom (Mitte)" }, { key: "bak", name: "Bak (Rand)" }, { key: "pelang", name: "Pelang (Fingerschnippen)" }, { key: "eshare", name: "Eshare (Fingerspitze)" }],
  varianten: [V("persisch", "Holz, tief und warm", {}), V("tief", "gross, dunkel", { ton: 90, hell: -2, klang: 1.3 }), V("hell", "kleiner, spritziger", { ton: 140, hell: 2, haerte: 75 }), V("ECM", "weich und schwebend", { haerte: 25, klang: 1.6, hell: -2.5, breite: 60 }), V("trocken", "nah, präzise", { klang: 0.55 }), V("Solo", "hart, offen", { haerte: 85, klang: 1.2, hell: 1 })],
  rechne(w, rate, { art = "tom", staerke, seed }) {
    const f = w.ton, M = MEMBRAN.map((r) => f * r);
    let teile;
    if (art === "tom") teile = [{ moden: [{ f: M[0], a: 1, t60: 0.55 }, { f: M[1], a: 0.3, t60: 0.35 }, { f: M[3], a: 0.32, t60: 0.3 }, { f: M[8], a: 0.1, t60: 0.15 }, { f: f * 0.62, a: 0.4, t60: 0.3 }], anschlag: 0.002, rauschen: [{ staerke: 0.08, t60: 0.02, auf: 0.0006, art: "band", f: 500, q: 0.8 }] }];
    else if (art === "pelang") teile = [{ moden: [{ f: f * 9.5, a: 0.5, t60: 0.04 }, { f: f * 13.1, a: 0.35, t60: 0.03 }], anschlag: 0.00012, rauschen: [{ staerke: 1, t60: 0.004, auf: 0.0001, art: "band", f: 3200, q: 0.9 }, { staerke: 0.2, t60: 0.05, auf: 0.0005, art: "band", f: 900, q: 1.2 }] }];
    else if (art === "eshare") teile = [{ moden: [5.1, 6.9, 8.8].map((r, i) => ({ f: f * r, a: [0.7, 0.5, 0.3][i], t60: 0.09 })), anschlag: 0.0005, rauschen: [{ staerke: 0.15, t60: 0.006, auf: 0.0002, art: "band", f: 2500, q: 0.8 }] }];
    else teile = [{ moden: [{ f: 920, a: 0.45, t60: 0.08 }, { f: 1530, a: 0.3, t60: 0.06 }, ...[5.4, 7.2, 9.9].map((r, i) => ({ f: f * r, a: [0.8, 0.55, 0.35][i], t60: [0.14, 0.1, 0.07][i] }))], anschlag: 0.0003, rauschen: [{ staerke: 0.35, t60: 0.007, auf: 0.0001, art: "band", f: 3500, q: 0.8, hellAbh: true }] }];
    return schlag(w, rate, { staerke, seed }, teile, art === "eshare" ? 0.55 : art === "pelang" ? 0.75 : art === "bak" ? 0.85 : 1);
  },
};

// ---------- Udu ----------
const udu = {
  key: "udu", name: "Udu", rolle: "perkussion", pan: 0.25, pegel: -3,
  parameter: [...GEMEINSAM(165, 90, 320), P("gleiten", "Gleiten", "Spiel", -12, 12, -4, "Halbtöne", { schritt: 0.1, hilfe: "die Hand am Loch verändert die Tonhöhe: der typische Blubb" })],
  artikulationen: [{ key: "bum", name: "Bum (Loch)" }, { key: "ton", name: "Ton (Körper)" }, { key: "fing", name: "Finger" }],
  varianten: [V("Blubb", "klassisch", {}), V("tief", "gross", { ton: 120, gleiten: -6, klang: 1.3 }), V("steigend", "Ton steigt", { gleiten: 5 }), V("ECM", "weich, lang", { haerte: 25, klang: 1.7, hell: -2 }), V("trocken", "kurz", { klang: 0.5, gleiten: -2 }), V("Wasser", "starkes Gleiten", { gleiten: -10, klang: 1.2 })],
  rechne(w, rate, { art = "bum", staerke, seed }) {
    const f = w.ton;
    let teile;
    if (art === "bum") teile = [{ moden: [{ f: f * 2 ** (-w.gleiten / 12), a: 1, t60: 0.45 }, { f: f * 2 ** (-w.gleiten / 12) * 2.03, a: 0.08, t60: 0.2 }], anschlag: 0.003, gleiten: w.gleiten, gleitZeit: 0.06, rauschen: [{ staerke: 0.1, t60: 0.03, auf: 0.002, art: "band", f: 300, q: 0.8 }] }];
    else if (art === "fing") teile = [{ moden: [{ f: 1180, a: 0.5, t60: 0.05 }, { f: 1890, a: 0.35, t60: 0.04 }, { f, a: 0.3, t60: 0.2 }], anschlag: 0.0004 }];
    else teile = [{ moden: [{ f: 640, a: 0.7, t60: 0.12 }, { f: 1050, a: 0.5, t60: 0.09 }, { f: 1710, a: 0.3, t60: 0.06 }, { f, a: 0.5, t60: 0.3 }], anschlag: 0.0008, rauschen: [{ staerke: 0.15, t60: 0.01, auf: 0.0003, art: "band", f: 2000, q: 0.8 }] }];
    return schlag(w, rate, { staerke, seed }, teile, art === "fing" ? 0.55 : art === "ton" ? 0.8 : 1);
  },
};

export default {
  id: "perkussion", version: "0.1.0", name: "Perkussion",
  beschreibung: "Organische Instrumente aus Fell-, Holz- und Metallmoden: Tabla, Darbuka, Rahmentrommel, Riq, Zarb, Udu.",
  stimmen: Object.fromEntries([tabla, darbuka, rahmen, riq, zarb, udu].map((s) => [s.key, s])),
};

// Bausteine für Perkussion 0.2.0 (seit 10. November 2026; am Klang von 0.1.0 ändert das nichts)
export { schlag, schellen, schnarre, MEMBRAN, GEMEINSAM, P, V };
