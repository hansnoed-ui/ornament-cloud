// «Die Stadt, die weitergeht» – der Stadtplan: Wege, Querungen, Strassen, Orte und Häuser.
// Masse in Metern; die Karte ist 600 × 420 m, Norden oben. Nur Daten und Geometrie, kein Zustand, kein Zeichnen.
// Was es gibt, hängt von den Massnahmen ab (verfuegbar()); die Figuren planen dagegen mit dem, was sie glauben (modell.js).

export const BREITE = 600, HOEHE = 420;
export const Y_HN = 188, Y_HS = 232;           // Gehsteige an der Hauptstrasse
export const Y_NORD = 55;                       // Mitte der Nordstrasse (Wohnstrasse)
export const X_AMPEL = 300, X_ZEBRA = 150, X_HALT = 390;

// ---------- Knoten ----------
const K = {};
const knoten = (id, x, y) => { K[id] = { id, x, y }; return id; };
// Gehsteige an der Hauptstrasse, Nord- und Südseite
for (const x of [20, 40, 150, 230, 300, 390, 470, 560, 580]) { knoten(`hn${x}`, x, Y_HN); knoten(`hs${x}`, x, Y_HS); }
// Nordstrasse: Südseite (Gehsteig vor Park, Atelier, Kiosk) und Nordseite (Häuserzeile)
for (const x of [40, 150, 225, 300, 390, 470, 560]) knoten(`ns${x}`, x, 68);
for (const x of [40, 150, 300, 470, 560]) knoten(`nn${x}`, x, 42);
// Wege nach Norden: Querstrasse West (x 40), Westweg (x 150), Atelierweg (x 300), Querstrasse Ost (x 560)
for (const y of [100, 150]) { knoten(`qw${y}`, 40, y); knoten(`qo${y}`, 560, y); knoten(`ww${y}`, 150, y); }
knoten("aw130", 300, 130);
// Park
knoten("pz", 225, 128); knoten("pn", 225, 80); knoten("ps", 225, 176);
// Süden: Gasse (y 330), Querwege, Platz, Schule
for (const x of [40, 150, 230, 300, 390, 470, 560]) knoten(`sg${x}`, x, 330);
for (const x of [40, 560]) { knoten(`sv${x}`, x, 280); knoten(`su${x}`, x, 405); }
knoten("sv230", 230, 280); knoten("sv390", 390, 280);
knoten("su150", 150, 405); knoten("su470", 470, 405);
knoten("pl", 262, 280);
knoten("ladenvor", 318, 248);
// Durchgang durch den Hof (x 150), nur offen mit der Massnahme
knoten("hof", 150, 280);
// Brücke über der Ampel: Treppen direkt bei x 300, Rampen nach Osten bis zur Haltestelle (x 390)
knoten("bn", 300, 181); knoten("bs", 300, 239); knoten("rmn", 345, 181); knoten("rms", 345, 239);

// Türen (Ziele): Laden, Kiosk, Schule, Atelier, Zwischennutzung
knoten("laden", 330, 262); knoten("kiosk", 480, 80); knoten("schule", 300, 350); knoten("atelier", 330, 130); knoten("zwischen", 236, 176);

export const KNOTEN = K;

// ---------- Kanten ----------
// art: weg (Gehsteig, Gasse), park, trampel (Trampelpfad, wird erst im Gebrauch sichtbar), durchgang, tuer,
//      ampel, zebra, frei (Queren ausserhalb der Querungen), treppe, rampe, deck (Brückenbelag)
// nur: Schlüssel der Bedingung in verfuegbar(); ohne «nur» gibt es die Kante immer.
const E = [];
const kante = (a, b, art = "weg", extra = {}) => { const id = `${a}~${b}`; E.push({ id, a, b, art, len: extra.len ?? Math.hypot(K[a].x - K[b].x, K[a].y - K[b].y), ...extra }); return id; };
const kette = (ids, art = "weg") => { for (let i = 1; i < ids.length; i++) kante(ids[i - 1], ids[i], art); };

kette(["hn20", "hn40", "hn150", "hn230", "hn300", "hn390", "hn470", "hn560", "hn580"]);
kette(["hs20", "hs40", "hs150", "hs230", "hs300", "hs390", "hs470", "hs560", "hs580"]);
kette(["ns40", "ns150", "ns225", "ns300", "ns390", "ns470", "ns560"]);
kette(["nn40", "nn150", "nn300", "nn470", "nn560"]);
// über die Nordstrasse (Wohnstrasse, Tempo 30): einfache Übergänge, ohne Warten
for (const x of [40, 150, 300, 470, 560]) kante(`nn${x}`, `ns${x}`, "weg");
kette(["ns40", "qw100", "qw150", "hn40"]);
kette(["ns560", "qo100", "qo150", "hn560"]);
kette(["ns150", "ww100", "ww150", "hn150"]);
kette(["ns300", "aw130", "hn300"]);
// Park: Wege vom Rand zur Mitte
kante("ns225", "pn", "park"); kante("pn", "pz", "park"); kante("pz", "ps", "park"); kante("ps", "hn230", "park");
kante("ww100", "pz", "park"); kante("pz", "aw130", "park");
// Trampelpfad diagonal über die Wiese (niemand kennt ihn am Anfang; er entsteht, wenn er gebraucht wird)
kante("hn150", "pn", "trampel");
// Süden
kette(["hs40", "sv40", "sg40", "su40"]); kette(["hs560", "sv560", "sg560", "su560"]);
kette(["hs230", "sv230", "sg230"]); kette(["hs390", "sv390", "sg390"]);
kette(["sg40", "sg150", "sg230", "sg300", "sg390", "sg470", "sg560"]);
kette(["su40", "su150"]); kante("su150", "sg150"); kette(["su560", "su470"]); kante("su470", "sg470");
kante("sv230", "pl", "weg"); kante("pl", "ladenvor", "weg"); kante("hs300", "ladenvor", "weg");
// Durchgang durch den Hof (Massnahme «Durchgang öffnen»)
kante("hs150", "hof", "durchgang", { nur: "durchgang" }); kante("hof", "sg150", "durchgang", { nur: "durchgang" });
// Türen
kante("ladenvor", "laden", "tuer"); kante("ns470", "kiosk", "tuer"); kante("sg300", "schule", "tuer"); kante("aw130", "atelier", "tuer"); kante("hn230", "zwischen", "tuer", { nur: "zwischennutzung" });

// Querungen der Hauptstrasse (Länge: Gehsteig zu Gehsteig)
kante("hn300", "hs300", "ampel", { q: "ampel300", nur: "ampel" });
kante("hn150", "hs150", "zebra", { q: "zebra150", nur: "zebra" });
for (const x of [40, 230, 390, 470, 560]) kante(`hn${x}`, `hs${x}`, "frei", { q: `frei${x}`, nur: "frei" });
kante("hn150", "hs150", "frei", { q: "frei150", nur: "freiOhneZebra" });
// Brücke mit Treppen: steil und kurz, direkt bei x 300
kante("hn300", "bn", "treppe", { q: "treppe300", nur: "treppe", len: 16 });
kante("bs", "hs300", "treppe", { q: "treppe300", nur: "treppe", len: 16 });
// Brücke mit Rampen: flach und lang, von der Haltestelle (x 390) hinauf zur Brücke bei x 300
kante("hn390", "rmn", "rampe", { q: "rampe300", nur: "rampe", len: 55 }); kante("rmn", "bn", "rampe", { q: "rampe300", nur: "rampe", len: 55 });
kante("bs", "rms", "rampe", { q: "rampe300", nur: "rampe", len: 55 }); kante("rms", "hs390", "rampe", { q: "rampe300", nur: "rampe", len: 55 });
kante("bn", "bs", "deck", { q: "bruecke300", nur: "bruecke" });

export const KANTEN = E;
export const KANTE = Object.fromEntries(E.map((e) => [e.id, e]));

// ---------- was es gibt ----------
/** Bedingungen der Kanten aus den Massnahmen */
export function bedingungen(m) {
  const v = VERBINDUNG[m.verbindung];
  return {
    ampel: v.ampel,
    zebra: !!m.querung,
    frei: !v.zaun,
    freiOhneZebra: !v.zaun && !m.querung,
    treppe: v.bruecke === "treppe",
    rampe: v.bruecke === "rampe",
    bruecke: !!v.bruecke,
    durchgang: !!m.durchgang,
    zwischennutzung: !!m.zwischennutzung,
  };
}
export const verfuegbar = (kante, b) => !kante.nur || !!b[kante.nur];

// ---------- Varianten der Verbindung (Kapitel B) und Ampelzeiten ----------
// Tempo in m/s; Ampel: Umlauf, Grün für Autos, danach Grün für den Fussverkehr (die übrige Zeit gehört der Querstrasse)
export const VERBINDUNG = {
  heute: { name: "Heute: Ampel, Tempo 50", tempo: 13.9, ampel: true, zaun: false, bruecke: null },
  zaun: { name: "Nur Mittelzaun", tempo: 13.9, ampel: true, zaun: true, bruecke: null },
  ampel_schnell: { name: "Schnellverbindung mit Ampel", tempo: 16.7, ampel: true, zaun: true, bruecke: null, umlauf: [100, 60, 15] },
  bruecke_treppe: { name: "Schnellverbindung mit Brücke (Treppen)", tempo: 16.7, ampel: false, zaun: true, bruecke: "treppe" },
  bruecke_rampe: { name: "Schnellverbindung mit Brücke (Rampen)", tempo: 16.7, ampel: false, zaun: true, bruecke: "rampe" },
};
/** Ampel bei x 300: [Umlauf, Autogrün, Fussgrün] in Sekunden */
export function ampelZeiten(m) {
  const v = VERBINDUNG[m.verbindung];
  if (!v.ampel) return null;
  if (v.umlauf) return v.umlauf;
  if (m.ruhe) return [60, 25, 20];
  if (m.spur) return [90, 45, 15];
  return [90, 35, 20];
}
export function tempoHaupt(m) { return m.ruhe ? 8.3 : VERBINDUNG[m.verbindung].tempo; }
export const spurenHaupt = (m) => (m.spur ? 2 : 1);

// ---------- Strassen für den Autoverkehr ----------
// Korridore von West nach Ost; Richtung «o» fährt nach Osten (s = x), «w» nach Westen (s = 600 − x).
// Fahrstreifen (y) je Richtung; der zweite nur mit der Massnahme «zusätzliche Fahrspur».
export const KORRIDORE = {
  H: { name: "Hauptstrasse", laenge: BREITE, spurY: { o: [215, 221], w: [205, 199] } },
  N: { name: "Nordstrasse", laenge: BREITE, spurY: { o: [58], w: [52] }, tempo: 9.5, kreuzungen: [40, 300, 560] },
};
export const HALT_S = { o: X_HALT, w: BREITE - X_HALT };   // Haltestellen auf der Strecke (s)
export const AMPEL_S = { o: X_AMPEL - 8, w: BREITE - X_AMPEL - 8 };   // Haltelinien vor der Ampel
export const ZEBRA_S = { o: X_ZEBRA - 7, w: BREITE - X_ZEBRA - 7 };

// ---------- Orte ----------
// Ziele, Aufenthaltsorte und Bänke. seite: n (nördlich der Hauptstrasse) oder s.
export const ORTE = {
  laden: { name: "Laden", knoten: "laden", seite: "s", x: 330, y: 262, aufenthalt: true },
  kiosk: { name: "Kiosk", knoten: "kiosk", seite: "n", x: 480, y: 80, aufenthalt: true },
  platz: { name: "Platz", knoten: "pl", seite: "s", x: 262, y: 280, aufenthalt: true, bank: true },
  park: { name: "Park", knoten: "pz", seite: "n", x: 225, y: 128, aufenthalt: true, bank: true },
  schule: { name: "Schule", knoten: "schule", seite: "s", x: 300, y: 360 },
  atelier: { name: "Atelier", knoten: "atelier", seite: "n", x: 330, y: 130 },
  haltN: { name: "Haltestelle Nord", knoten: "hn390", seite: "n", x: 390, y: 182, aufenthalt: true },
  haltS: { name: "Haltestelle Süd", knoten: "hs390", seite: "s", x: 390, y: 238, aufenthalt: true },
  zwischen: { name: "Zwischennutzung", knoten: "zwischen", seite: "n", x: 236, y: 172, aufenthalt: true, nur: "zwischennutzung" },
};
/** Die eine Bank, die man versetzen kann (Kleine Voraussetzungen) */
export const BANK = {
  platz: { name: "am Platz", knoten: "pl", x: 270, y: 290 },
  nordstrasse: { name: "an der Nordstrasse", knoten: "ns390", x: 390, y: 74 },
  rampe: { name: "auf halber Rampe (Nordseite)", knoten: "rmn", x: 345, y: 176 },
};
/** feste Bänke (Knoten → Lage) */
export const BAENKE = [{ knoten: "pz", x: 232, y: 134 }, { knoten: "pl", x: 255, y: 288 }, { knoten: "hn390", x: 398, y: 182 }];

// ---------- Häuser und Wohnungen ----------
// Wohnungen hängen an einem Knoten; x, y ist die Tür. Gezeichnet werden die Blöcke unten.
export const WOHNUNGEN = [
  // Norden: Häuserzeile nördlich der Nordstrasse, Block West, Block Ost
  ...[40, 150, 300, 470, 560].map((x, i) => ({ id: `n0-${i}`, knoten: `nn${x}`, seite: "n", x, y: 30 })),
  { id: "n1-a", knoten: "qw100", seite: "n", x: 52, y: 100 }, { id: "n1-b", knoten: "qw150", seite: "n", x: 52, y: 150 },
  { id: "n1-c", knoten: "ww100", seite: "n", x: 138, y: 100 }, { id: "n1-d", knoten: "ww150", seite: "n", x: 138, y: 150 },
  { id: "n2-a", knoten: "qo100", seite: "n", x: 548, y: 100 }, { id: "n2-b", knoten: "qo150", seite: "n", x: 548, y: 150 },
  { id: "n2-c", knoten: "hn470", seite: "n", x: 480, y: 178 },
  // Süden: Blöcke an der Hauptstrasse, an der Gasse und am Südrand
  { id: "s1-a", knoten: "sv40", seite: "s", x: 52, y: 280 }, { id: "s1-b", knoten: "sg150", seite: "s", x: 150, y: 320 },
  { id: "s1-c", knoten: "hs150", seite: "s", x: 150, y: 242 },
  { id: "s2-a", knoten: "sv390", seite: "s", x: 402, y: 280 }, { id: "s2-b", knoten: "sg470", seite: "s", x: 470, y: 320 },
  { id: "s2-c", knoten: "sv560", seite: "s", x: 548, y: 280 },
  { id: "s3-a", knoten: "su40", seite: "s", x: 52, y: 405 }, { id: "s3-b", knoten: "su150", seite: "s", x: 150, y: 395 },
  { id: "s4-a", knoten: "su470", seite: "s", x: 470, y: 395 }, { id: "s4-b", knoten: "su560", seite: "s", x: 548, y: 405 },
];

/** Blöcke zum Zeichnen: [x, y, b, h, art] */
export const BLOECKE = [
  [0, 0, 600, 34, "wohnen"],
  [50, 78, 90, 100, "wohnen"],          // Block West (Nord)
  [160, 78, 130, 100, "park"],
  [310, 78, 140, 100, "atelier"],
  [460, 78, 90, 100, "wohnen"],          // Block Ost mit Kiosk
  [50, 240, 90, 82, "wohnen"],          // Süd 1 West
  [160, 240, 60, 82, "hof"],             // Süd 1 mit Hof (Durchgang)
  [240, 240, 140, 80, "laden"],          // Platz und Laden
  [400, 240, 150, 82, "wohnen"],
  [50, 340, 170, 76, "wohnen"],
  [240, 340, 140, 76, "schule"],
  [400, 340, 150, 76, "wohnen"],
];
