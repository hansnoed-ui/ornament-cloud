// ORNAMENT LAB 0.1 – Oberfläche. Vier Bereiche (Material, Operationen, Experiment, Protokoll), zwei Ansichten (Nebeneinander: Varianten
// und alternative Fortsetzungen; Nacheinander: Verlauf vom Material bis zum gewählten Zustand). Die Oberfläche hält nur Auswahlzustand;
// alles, was geschieht, steht im Projekt (kern/projekt.js) und wird von dort gezeichnet.
import { labRegister } from "./operationen/index.js";
import { browserMedien } from "./medien/browser.js";
import { videoAus, FPS } from "./medien/video.js";
import * as P from "./kern/projekt.js";
import { fuehreAus, bildfolge, regelVorschlaege, experiment, ketteAnwenden, neuerStartwert } from "./kern/ausfuehrung.js";
import * as ST from "./kern/stationen.js";
import { packe, entpacke, ENDUNG } from "./kern/archiv.js";
import { QUELLEN, POLARITAETEN } from "./kern/modulation.js";
import { KLASSEN, standardParameter } from "./kern/register.js";
import { TYPEN } from "./kern/typen.js";
import { AUSSPIELEN, wavSchreiben, rateWandeln, spurenVon } from "./kern/klangwerk.js";
import { jevVerfuegbar, jevWahl, jevDramaturgie, jevPruefen, jevZustand } from "./jev/jev.js";
import { DRAMATURGIEN, MERKMALE } from "./jev/fragen.js";
import * as VS from "./kern/vorschlag.js";
import { zip } from "../../alpha/the-fictory/zip.js?v=23";

const R = labRegister();
const $ = (id) => document.getElementById(id);
const S = {
  projekt: P.neuesProjekt(), medien: browserMedien(), aktuell: null, op: null, parameter: {}, eingaben: {}, seed: neuerStartwert(),
  variation: { anzahl: 6, achse: "varianten", ziel: "", quelle: "sinus", tiefe: 0.5, polaritaet: "bipolar", frequenz: 1, halten: 0, signal: "" },
  wahl: null, ansicht: "neben", modus: "manuell", laeuft: null, vergleich: new Set(), filme: new Map(), tonspur: new Map(), ungespeichert: false,
  experimentErlaubt: new Set(["lab.feedback", "lab.wiederholung", "lab.farbe", "lab.differenz"]), experimentSchritte: 3, experimentVarianten: 3,
  // Film über Stationen: null folgt dem Verlauf des Ausgangs, sonst die eigene Auswahl (Kennungen, mit Übergang je Station)
  stationen: null,
  // Ausspielen eines Klangs als WAV (Bittiefe, Abtastrate; 0 = wie der Klang) und Wiedergabe in der Schleife
  ausspielen: { bits: "24", rate: 0 }, schleife: false,
  // Animation des letzten Schritts: die Bildfolge auf die Länge der Tonspur strecken (seit 0.1.8), je Ausgang
  strecken: new Map(),
  // … oder auf eine frei gewählte Länge in Sekunden (seit 0.1.9), je Ausgang; leer: so lang, wie die Operation rechnet
  laenge: new Map(),
  // Vorschlag für 30 s aus Bild und Klang (kern/vorschlag.js): Auswahl, Messung, Antworten von jev und Regeln, gewählte Dramaturgie
  vorschlag: { bild: "", ton: "", beginn: 0, messung: null, jev: null, jevFehler: "", regel: null, gewaehlt: null },
  film: { halten: 1.5, uebergang: 1, art: "blende", quelle: "keine", ziel: "halten", tiefe: 0.3, frequenz: 1, signal: "", takt: "", schwelle: 0.2, wiederholen: true, tonspur: "auto", seite: 1280 },
};
globalThis.ornamentLab = S;   // für Browsertests und die Konsole
// Nebeneinander anhören: es klingt immer nur ein Klang, der nächste hält den vorigen an
document.addEventListener("play", (ev) => { for (const a of document.querySelectorAll("audio")) if (a !== ev.target) a.pause(); }, true);

// ---------- Hilfen ----------
function el(tag, attrs = {}, ...kinder) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "text") e.textContent = v;
    else if (k === "dataset") Object.assign(e.dataset, v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kinder.flat()) if (c !== null && c !== undefined && c !== false) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return e;
}
/** replaceChildren ohne leere Stellen (null würde sonst als Text «null» erscheinen) */
const ersetze = (ziel, ...kinder) => ziel.replaceChildren(...kinder.flat().filter((k) => k !== null && k !== undefined && k !== false));
const zahl = (v) => (Number.isInteger(v) ? String(v) : (Math.round(v * 1000) / 1000).toLocaleString("de-CH"));
const uhr = (iso) => new Date(iso).toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "projekt";
const ART_NAME = { mensch: "Mensch", zufall: "Zufall", regel: "Regel", jev: "jev" };
const artEtikett = (art) => el("span", { class: `art ${art}`, title: P.ENTSCHEIDUNGSARTEN[art], text: ART_NAME[art] ?? art });
const opName = (id) => (R.hat(id) ? R.hole(id).name : id);
function herunterladen(blob, name) {
  const a = el("a", { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
let letzterStatus = ["", null, false];
function status(text = letzterStatus[0], anteil = null, fehler = false) {
  letzterStatus = [text, anteil, fehler];
  const s = $("status");
  ersetze(s, el("span", { class: fehler ? "fehler" : null, text }), anteil === null ? null : el("progress", { max: 1, value: anteil }),
    S.laeuft ? el("button", { class: "knopf klein leise", type: "button", onclick: () => S.laeuft?.abort(), text: "Abbrechen" }) : null);
}
const geaendert = () => { S.ungespeichert = true; };
const aktuellesErgebnis = () => (S.aktuell ? P.ergebnis(S.projekt, S.aktuell) : null);

// ---------- 1 · Material ----------
async function importiere(datei) {
  if (datei.type.startsWith("audio/") || (!datei.type && /\.(wav|mp3|ogg|flac|m4a|aac|opus)$/i.test(datei.name))) return importiereTon(datei);
  status(`${datei.name} wird gelesen …`);
  try {
    const { original, arbeit } = await S.medien.importiere(datei);
    const e = P.fuegeMaterialHinzu(S.projekt, { titel: original.name, mime: "image/png", herkunft: { original, hinweis: arbeit.width < original.breite || arbeit.height < original.hoehe ? `auf ${arbeit.width} × ${arbeit.height} px verkleinert (Arbeitsgrösse)` : "Originalgrösse" } });
    Object.assign(e, await S.medien.ablegen(e, arbeit));
    S.aktuell = e.id; S.vergleich.clear(); geaendert();
    status(`${original.name}: ${original.breite} × ${original.hoehe} px, Arbeitsbild ${arbeit.width} × ${arbeit.height} px.`);
    alles();
  } catch (f) { status(`Das Bild liess sich nicht lesen: ${f.message}`, null, true); }
}
/** eine Tondatei wird Material (AUDIO): sie bleibt unverändert, gemessen wird sie erst von einer Operation (Tonsignal) */
async function importiereTon(datei) {
  status(`${datei.name} wird gelesen …`);
  try {
    const imp = await S.medien.importiereTon(datei);
    const e = P.fuegeMaterialHinzu(S.projekt, { titel: imp.original.name, typ: "AUDIO", mime: imp.mime, ton: imp.ton, herkunft: { original: imp.original, hinweis: `${sekunden(imp.ton.dauer)}, ${imp.ton.kanaele === 1 ? "mono" : `${imp.ton.kanaele} Kanäle`}, gelesen mit ${imp.ton.abtastrate} Hz` } });
    Object.assign(e, await S.medien.ablegenTon(e, imp));
    S.aktuell = e.id; S.vergleich.clear(); S.knotenAnsicht = null; geaendert();
    status(`${imp.original.name}: ${sekunden(imp.ton.dauer)}, ${imp.ton.abtastrate} Hz. «Tempo und Tonhöhe», «Dekonstruktion», «Neu-Rhythmisierung» und «Körner» verwandeln ihn, «Tonsignal» macht daraus ein Steuersignal für Bildparameter.`);
    alles();
  } catch (f) { status(`Der Ton liess sich nicht lesen: ${f.message}`, null, true); }
}
const sekunden = (s) => `${(Math.round(s * 10) / 10).toLocaleString("de-CH")} s`;
const tonSymbol = (e) => el("span", { class: "ton-symbol", "aria-hidden": "true", text: "♪", title: e.titel });
function zeigeMaterial() {
  const liste = $("materialien");
  ersetze(liste, ...S.projekt.ergebnisse.filter((e) => !e.knoten).map((e) => el("li", {},
    el("button", { type: "button", "aria-pressed": String(S.aktuell === e.id), title: e.titel, "aria-label": e.typ === "AUDIO" ? `Ton: ${e.titel}` : null, onclick: () => { S.aktuell = e.id; S.knotenAnsicht = null; alles(); } },
      e.typ === "AUDIO" ? tonSymbol(e) : el("img", { src: S.medien.url(e), alt: e.titel })))));
}

// ---------- Vorschlag für 30 s aus Bild und Klang (kern/vorschlag.js) ----------
const bilderDesProjekts = () => S.projekt.ergebnisse.filter((x) => x.typ === "IMAGE");
const klaengeDesProjekts = () => S.projekt.ergebnisse.filter((x) => x.typ === "AUDIO");
const merkmalText = (k, v) => MERKMALE.bild[k]?.[v] ?? MERKMALE.klang[k]?.[v] ?? v;
/** die Liste, aus der gewählt wird: jev, wenn es geantwortet hat, sonst die Regeln */
function vorschlagListe() {
  const v = S.vorschlag;
  if (v.jev) return Object.entries(v.jev.wahrscheinlichkeiten).sort((a, b) => b[1] - a[1]).map(([id, p], i) => ({ dramaturgie: id, art: "jev", p, rang: i + 1, gruende: [] }));
  return (v.regel ?? []).map((x, i) => ({ ...x, art: "regel", rang: i + 1 }));
}
function zeigeVorschlag30() {
  const box = $("vorschlag30"), v = S.vorschlag, bilder = bilderDesProjekts(), klaenge = klaengeDesProjekts();
  box.hidden = !bilder.length || !klaenge.length;
  if (box.hidden) { if (bilder.length || klaenge.length) { box.hidden = false; ersetze(box, el("small", { class: "hinweis", text: bilder.length ? "Mit einem Ton dazu (MP3 oder WAV) schlägt das Lab eine Animation von 30 Sekunden vor." : "Mit einem Bild dazu schlägt das Lab eine Animation von 30 Sekunden zu diesem Ton vor." })); } return; }
  const aktuell = aktuellesErgebnis();
  if (!bilder.some((x) => x.id === v.bild)) v.bild = aktuell?.typ === "IMAGE" ? aktuell.id : bilder.filter((x) => !x.knoten).at(-1)?.id ?? bilder.at(-1).id;
  if (!klaenge.some((x) => x.id === v.ton)) v.ton = klaenge.filter((x) => !x.knoten).at(-1)?.id ?? klaenge.at(-1).id;
  const passt = v.messung && v.messung.bild === v.bild && v.messung.ton === v.ton && v.messung.beginn === v.beginn;
  const neuWaehlen = (fn) => (ev) => { fn(ev.target.value); zeigeVorschlag30(); };
  const teile = [el("h3", { text: "Animation aus Bild und Klang (30 s)" }),
    el("small", { text: "Das Lab misst Bild und Klang und schlägt eine Dramaturgie vor: jev, wenn es eingerichtet ist, sonst feste Regeln. jev sieht nur die gemessenen Stufen, nie Bild oder Klang. Du entscheidest." }),
    el("div", { class: "vorschlag-wahl" },
      el("label", { class: "regler" }, el("span", { text: "Bild" }), el("select", { id: "vorschlag-bild", onchange: neuWaehlen((x) => { v.bild = x; }) }, ...bilder.map((x) => el("option", { value: x.id, selected: x.id === v.bild, text: x.titel })))),
      el("label", { class: "regler" }, el("span", { text: "Ton" }), el("select", { id: "vorschlag-ton", onchange: neuWaehlen((x) => { v.ton = x; }) }, ...klaenge.map((x) => el("option", { value: x.id, selected: x.id === v.ton, text: x.titel })))),
      el("label", { class: "regler" }, el("span", { text: "Ton ab Sekunde" }), el("input", { type: "number", id: "vorschlag-beginn", min: 0, max: P.GRENZEN.tonSekunden, step: 0.5, value: v.beginn, onchange: (ev) => { v.beginn = Math.max(0, Number(ev.target.value) || 0); zeigeVorschlag30(); } }))),
    el("div", { class: "aktionen" }, el("button", { class: `knopf${passt ? "" : " voll"}`, type: "button", id: "vorschlag-machen", disabled: Boolean(S.laeuft), onclick: vorschlagMachen, text: passt ? "neu vorschlagen" : "Vorschlag machen" }))];
  if (passt) {
    const m = v.messung.merkmale;
    teile.push(el("p", { class: "startwert", text: `Gemessen. Bild: ${Object.keys(MERKMALE.bild).map((k) => merkmalText(k, m[k])).join(", ")}. Klang (${sekunden(v.messung.werte.dauer)}): ${Object.keys(MERKMALE.klang).map((k) => merkmalText(k, m[k])).join(", ")}.` }));
    if (v.jevFehler) teile.push(el("small", { class: "hinweis", text: `jev: ${v.jevFehler}. Die Liste kommt darum aus den festen Regeln.` }));
    const liste = vorschlagListe();
    if (!liste.some((x) => x.dramaturgie === v.gewaehlt)) v.gewaehlt = liste[0]?.dramaturgie ?? null;
    teile.push(el("fieldset", { class: "gruppe dramaturgien" }, el("legend", { text: v.jev ? `Vorschlag von jev (${v.jev.modell})` : "Vorschlag nach festen Regeln" }),
      ...liste.map((x) => el("label", { class: "dramaturgie" },
        el("input", { type: "radio", name: "dramaturgie", value: x.dramaturgie, checked: x.dramaturgie === v.gewaehlt, onchange: () => { v.gewaehlt = x.dramaturgie; } }),
        el("span", {}, artEtikett(x.art), " ", el("b", { text: VS.REZEPTE[x.dramaturgie].name }), x.art === "jev" ? ` p = ${zahl(Math.round(x.p * 100) / 100)}` : ""),
        el("small", { text: `${DRAMATURGIEN[x.dramaturgie].split(": ").slice(1).join(": ")}${x.gruende?.length ? ` (${x.gruende.join("; ")})` : ""}` })))));
    teile.push(el("div", { class: "aktionen" },
      el("button", { class: "knopf voll", type: "button", id: "vorschlag-rechnen", disabled: Boolean(S.laeuft) || !v.gewaehlt, onclick: vorschlagRechnen, text: "Animation rechnen" }),
      el("small", { text: "Danach steht der Film unter «Nacheinander», dort lässt er sich weiter verändern." })));
    const film = S.filme.get("stationen");
    if (film && film.vorschlag === v.gewaehlt) teile.push(el("div", { class: "film" }, el("video", { src: film.url, controls: true, loop: true, playsinline: true, muted: !film.ton }),
      el("div", { class: "aktionen" }, el("button", { class: "knopf klein", type: "button", onclick: () => herunterladen(film.blob, film.name), text: `${film.endung.toUpperCase()} speichern` }),
        el("small", { text: `${sekunden(film.bilder / FPS)}, ${film.breite} × ${film.hoehe}${film.ton ? `, Ton ${film.ton}` : ", ohne Ton"}` }))));
  }
  ersetze(box, teile);
}
async function vorschlagMachen() {
  const v = S.vorschlag;
  await laufen(async (signal) => {
    status("Bild und Klang werden gemessen …", 0);
    v.messung = await VS.messen({ register: R, projekt: S.projekt, medien: S.medien, bild: v.bild, ton: v.ton, beginn: v.beginn, melden: status, abbrechen: signal });
    v.regel = VS.regelDramaturgie(v.messung.merkmale); v.jev = null; v.jevFehler = ""; v.gewaehlt = null;
    if (jevVerfuegbar()) {
      status("jev wird gefragt …");
      try { v.jev = await jevDramaturgie(VS.jevLage(v.messung)); }
      catch (f) { v.jevFehler = f.message; }
    } else v.jevFehler = `nicht eingerichtet (${jevZustand().grund})`;
    const erste = vorschlagListe()[0];
    status(`${v.jev ? `jev (${v.jev.modell}) schlägt vor${v.jev.zwischengespeichert ? ", aus dem Zwischenspeicher" : ""}` : "Die Regeln schlagen vor"}: ${VS.REZEPTE[erste.dramaturgie].name}. Wähle eine Dramaturgie und «Animation rechnen».`);
  });
}
async function vorschlagRechnen() {
  const v = S.vorschlag, x = vorschlagListe().find((y) => y.dramaturgie === v.gewaehlt);
  const wahl = x.art === "jev"
    ? { art: "jev", details: { quelle: v.jev.quelle, modell: v.jev.modell, wahrscheinlichkeit: x.p, wahrscheinlichkeiten: v.jev.wahrscheinlichkeiten, lage: v.jev.lage, zwischengespeichert: v.jev.zwischengespeichert, gefragt: v.jev.zeit, rang: x.rang } }
    : { art: "regel", details: { gewicht: x.gewicht, gruende: x.gruende, rang: x.rang, ...(v.jevFehler ? { ohneJev: v.jevFehler } : {}) } };
  await laufen(async (signal) => {
    const r = await VS.vorschlagAusfuehren({ register: R, projekt: S.projekt, medien: S.medien, messung: v.messung, dramaturgie: v.gewaehlt, wahl, seed: S.seed, melden: status, abbrechen: signal });
    const plan = r.plan;
    // der Film über Stationen übernimmt den Plan: so lässt er sich unter «Nacheinander» wie jeder andere weiter verändern
    S.stationen = plan.stationen.map((id) => ({ ergebnis: id }));
    Object.assign(S.film, { art: plan.art, halten: plan.halten, uebergang: plan.uebergang, quelle: "keine", takt: plan.takt?.ereignisfolge ?? "", schwelle: plan.takt?.schwelle ?? S.film.schwelle, wiederholen: true, tonspur: plan.tonspur, tonBeginn: plan.tonBeginn });
    S.aktuell = r.ergebnisse.at(-1)?.id ?? S.aktuell; S.seed = neuerStartwert();
    await stationenFilmRechnen(stationen(), signal, { vorschlag: v.gewaehlt, auswahl: "Vorschlag", entscheidung: r.entscheidung.id });
    if (plan.hinweis) status(`${letzterStatus[0]} Hinweis: ${plan.hinweis}.`);
  });
}

// ---------- 2 · Operationen ----------
function zeigeAusgang() {
  const e = aktuellesErgebnis(), box = $("ausgang");
  if (!e) { ersetze(box, el("span", { class: "leer", text: "Noch kein Ausgang. Wähle ein Bild oder ziehe eine ORNA-Konstellation." })); return; }
  ersetze(box, e.typ === "IMAGE" ? el("img", { src: S.medien.url(e), alt: "" }) : e.typ === "AUDIO" ? tonSymbol(e) : null,
    el("div", {}, el("div", { text: "Ausgang" }), el("b", { text: e.titel }), " ", el("span", { class: "etikett", text: TYPEN[e.typ].name })));
}
function verfuegbareOperationen() {
  const e = aktuellesErgebnis();
  return [...R.generatoren(), ...(e ? R.fuer(e.typ) : [])];   // Generatoren (ORNA, Klangerzeuger) stehen immer zur Wahl
}
function zeigeOperationen() {
  zeigeAusgang();
  const ops = verfuegbareOperationen();
  if (S.op && !ops.some((o) => o.id === S.op)) waehleOperation(null);
  const gruppen = Object.keys(KLASSEN).map((k) => [k, ops.filter((o) => o.klasse === k)]).filter(([, l]) => l.length);
  ersetze($("op-liste"), ...gruppen.flatMap(([k, l]) => [el("h3", { text: KLASSEN[k] }), ...l.map((op) => el("label", { class: "op" },
    el("input", { type: "radio", name: "op", value: op.id, checked: S.op === op.id, onchange: () => { S.wahl = null; waehleOperation(op.id); $("op-form").scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); } }),
    el("span", {}, el("b", { text: op.name }), el("span", { class: `etikett ${op.herkunft.art}`, text: op.herkunft.art === "adapter" ? `Adapter: ${op.herkunft.quelle.split(" (")[0]}` : "neu" })),
    el("small", { text: op.herkunft.referenz ? `nach ${op.herkunft.referenz}` : op.beschreibung })))]));
  zeigeVorschlaege();
  zeigeExperimentell();
  zeigeFormular();
}
function waehleOperation(id) {
  S.op = id;
  if (id) {
    const op = R.hole(id);
    S.parameter = standardParameter(op);
    S.eingaben = {};
    const zahlen = op.parameter.filter((p) => p.art === "zahl" && p.id !== "seite");
    S.variation.ziel = op.moduliert ?? ["drehung", "farbdrehung", "zoom", "symmetrie"].find((id) => zahlen.some((p) => p.id === id)) ?? zahlen[0]?.id ?? "";
    S.variation.anzahl = op.varianten === "moduliert" ? 6 : 1;
    S.variation.achse = "varianten";
  }
  zeigeOperationen();
}
function regler(p, wert, setze) {
  if (p.art === "schalter") return el("label", { class: "regler schalter" }, el("input", { type: "checkbox", checked: Boolean(wert), onchange: (ev) => setze(ev.target.checked) }), p.name);
  if (p.art === "wahl") return el("label", { class: "regler" }, el("span", { text: p.name }),
    el("select", { onchange: (ev) => setze(ev.target.value) }, ...p.optionen.map((o) => el("option", { value: o.wert, selected: o.wert === wert, text: o.name }))));
  const aus = el("output", { text: zahl(wert) });
  return el("label", { class: "regler", title: p.hilfe ?? null }, el("span", { class: "kopfzeile" }, el("span", { text: p.name }), aus),
    el("input", { type: "range", min: p.min, max: p.max, step: p.schritt ?? "any", value: wert, "data-param": p.id, oninput: (ev) => { const v = Number(ev.target.value); aus.textContent = zahl(v); setze(v); } }));
}
const EINGANG_NAME = { einsaetze: "Ereignisfolge (Schnittstellen)", muster: "Muster (Ereignisfolge)", konstellation: "Konstellation", vergleich: "Vergleichen mit", profil: "Zielprofil (angleichen an)", bild: "Bild", signal: "Steuersignal", steuerbild: "Versetzen durch Bild" };
/** Eingänge mit Auswahlfeld: alle ausser dem ersten (der ist der Ausgang), bei Generatoren mit lauter optionalen Eingängen alle */
const waehlbareEingaenge = (op) => (op.eingaenge.every((x) => x.optional) ? op.eingaenge : op.eingaenge.slice(1));
/** Titel eines Ergebnisses, bei Befunden mit dem Bild, an dem gemessen wurde */
function mitQuelle(x) {
  if (x.typ !== "METADATA" || !x.knoten) return x.titel;
  const q = P.ergebnis(S.projekt, Object.values(P.knoten(S.projekt, x.knoten).eingaben)[0]);
  return q ? `${x.titel} von ${q.titel}` : x.titel;
}
function zeigeFormular() {
  const f = $("op-form");
  if (!S.op || S.modus === "experimentell") { f.hidden = true; f.replaceChildren(); return; }
  const op = R.hole(S.op), e = aktuellesErgebnis();
  f.hidden = false;
  const teile = [el("h3", { text: op.name }), el("p", { class: "beschreibung", text: op.beschreibung })];
  // weitere Eingänge (Konstellation, Vergleich)
  const generator = op.eingaenge.every((x) => x.optional);
  if (generator && S.eingabenFuer !== S.aktuell) { S.eingaben = {}; S.eingabenFuer = S.aktuell; }   // neuer Ausgang: neu vorwählen
  for (const ein of waehlbareEingaenge(op)) {
    const kandidaten = S.projekt.ergebnisse.filter((x) => x.typ === ein.typ && (generator || x.id !== S.aktuell));
    // beim Generator steht nur der Ausgang vor, wo sein Typ passt; die anderen Eingänge bleiben leer
    if (!(ein.name in S.eingaben)) S.eingaben[ein.name] = generator ? (e?.typ === ein.typ ? e.id : "") : ein.vorwaehlen === false ? "" : (kandidaten.at(-1)?.id ?? "");
    teile.push(el("label", { class: "regler" }, el("span", { text: `${EINGANG_NAME[ein.name] ?? ein.name}${ein.optional ? " (optional)" : ""}` }),
      el("select", { onchange: (ev) => { S.eingaben[ein.name] = ev.target.value; } },
        ein.optional ? el("option", { value: "", text: "keine" }) : null,
        ...kandidaten.map((x) => el("option", { value: x.id, selected: S.eingaben[ein.name] === x.id, text: mitQuelle(x) })))));
  }
  teile.push(...op.parameter.map((p) => regler(p, S.parameter[p.id], (v) => { S.parameter[p.id] = v; })));
  // Variation über Modulation (Nebeneinander) oder über die Zeit (Nacheinander)
  if (op.varianten === "moduliert") {
    const zahlen = op.parameter.filter((p) => p.art === "zahl");
    const signale = S.projekt.ergebnisse.filter((x) => x.typ === "CONTROL_SIGNAL");
    const v = S.variation;
    if (v.quelle === "signal" && !signale.length) v.quelle = "sinus";   // etwa nach «Neu»: die Einstellung bleibt, das Signal nicht
    if (v.quelle === "signal" && !signale.some((s) => s.id === v.signal)) v.signal = signale.at(-1)?.id ?? "";
    const achsen = [{ wert: "varianten", name: "über die Varianten (Nebeneinander)" }, ...(op.verlauf ? [{ wert: "zeit", name: "über die Zeit (Nacheinander)" }, { wert: "beide", name: "beides" }] : [])];
    teile.push(el("fieldset", { class: "gruppe" }, el("legend", { text: "Variation und Modulation" }),
      regler({ id: "anzahl", name: "Varianten", art: "zahl", min: 1, max: P.GRENZEN.varianten, schritt: 1 }, v.anzahl, (x) => { v.anzahl = x; }),
      regler({ id: "ziel", name: "moduliert", art: "wahl", optionen: [{ wert: "", name: "nichts" }, ...zahlen.map((p) => ({ wert: p.id, name: p.name }))] }, v.ziel, (x) => { v.ziel = x; }),
      regler({ id: "quelle", name: "Quelle", art: "wahl", optionen: Object.entries(QUELLEN).filter(([k]) => k !== "keine" && (k !== "signal" || signale.length)).map(([k, n]) => ({ wert: k, name: n })) }, v.quelle, (x) => { v.quelle = x; zeigeFormular(); }),
      v.quelle === "signal" ? regler({ id: "signal", name: "Steuersignal", art: "wahl", optionen: signale.map((s) => ({ wert: s.id, name: s.titel })) }, v.signal, (x) => { v.signal = x; }) : null,
      regler({ id: "tiefe", name: "Tiefe (Attenuverter)", art: "zahl", min: -1, max: 1, schritt: 0.05 }, v.tiefe, (x) => { v.tiefe = x; }),
      regler({ id: "polaritaet", name: "Polarität", art: "wahl", optionen: Object.entries(POLARITAETEN).map(([k, n]) => ({ wert: k, name: n })) }, v.polaritaet, (x) => { v.polaritaet = x; }),
      v.quelle !== "signal" ? regler({ id: "frequenz", name: "Frequenz (Zyklen)", art: "zahl", min: 0.25, max: 4, schritt: 0.25 }, v.frequenz, (x) => { v.frequenz = x; }) : null,
      v.quelle !== "zufall" ? regler({ id: "halten", name: "Abtasten und halten (Stufen, 0 = fortlaufend)", art: "zahl", min: 0, max: 16, schritt: 1 }, v.halten, (x) => { v.halten = x; }) : null,
      regler({ id: "achse", name: "Modulation wirkt", art: "wahl", optionen: achsen }, achsen.some((a) => a.wert === v.achse) ? v.achse : "varianten", (x) => { v.achse = x; })));
  }
  const kannLaufen = op.eingaenge.every((x) => x.optional) || (e && op.eingaenge.every((x, i) => i === 0 || x.optional || S.eingaben[x.name]));
  teile.push(el("div", { class: "aktionen" },
    el("button", { class: "knopf voll", type: "submit", id: "ausfuehren", disabled: !kannLaufen || Boolean(S.laeuft), text: "Ausführen" }),
    el("span", { class: "startwert", text: `Startwert ${S.seed}` }),
    el("button", { class: "knopf klein leise", type: "button", onclick: () => { S.seed = neuerStartwert(); zeigeFormular(); }, text: "neu" })),
  S.wahl ? el("p", { class: "startwert" }, "Wahl der Operation: ", artEtikett(S.wahl.art), S.wahl.details?.wahrscheinlichkeit !== undefined ? ` p = ${zahl(S.wahl.details.wahrscheinlichkeit)}` : "") : null);
  ersetze(f, teile);
}
async function ausfuehren() {
  const op = R.hole(S.op);
  const eingaben = {};
  if (op.eingaenge.length && !op.eingaenge[0].optional) eingaben[op.eingaenge[0].name] = S.aktuell;
  for (const x of waehlbareEingaenge(op)) if (S.eingaben[x.name]) eingaben[x.name] = S.eingaben[x.name];
  const v = S.variation;
  const halten = v.quelle !== "zufall" && v.halten >= 1 ? { halten: v.halten } : {};
  const routen = op.varianten === "moduliert" && v.ziel ? [{ ziel: v.ziel, tiefe: v.tiefe, polaritaet: v.polaritaet, modulator: v.quelle === "signal" ? { quelle: "signal", ergebnis: v.signal, ...halten } : { quelle: v.quelle, frequenz: v.frequenz, phase: 0, seed: S.seed, stufen: v.anzahl, ...halten } }] : [];
  const wahl = S.wahl ?? { art: "mensch", details: { modus: S.modus } };
  const vorherigeKonstellation = S.projekt.ergebnisse.filter((x) => x.typ === "CONSTELLATION").at(-1)?.daten?.id ?? null;
  await laufen(async (signal) => {
    const { ergebnisse } = await fuehreAus({ register: R, projekt: S.projekt, medien: S.medien, abbrechen: signal, melden: status,
      auftrag: { operation: op.id, eingaben, parameter: S.parameter, seed: S.seed, variation: { anzahl: v.anzahl, achse: v.achse, routen }, wahl, vorherigeKonstellation } });
    S.wahl = null; S.seed = neuerStartwert(); S.vergleich.clear();
    if (ergebnisse[0].typ === "CONTROL_SIGNAL") S.variation.signal = ergebnisse[0].id;   // das neue Signal steht als Quelle vorne
    // Konstellationen und Signale werden sofort Ausgang zweiter Wahl: der Bildausgang bleibt, sie stehen in den Eingängen bereit
    if (ergebnisse[0].typ === "IMAGE" || !S.aktuell) S.aktuell = ergebnisse[0].id;
    S.ansicht = "neben"; document.querySelector('input[name="ansicht"][value="neben"]').checked = true;
    S.knotenAnsicht = ergebnisse[0].knoten;
    const klaenge = ergebnisse.filter((x) => x.typ === "AUDIO").length;
    status(ergebnisse[0].typ === "AUDIO"
      ? `${op.name}: ${klaenge === 1 ? "ein Klang" : `${klaenge} Klänge nebeneinander`}. Anhören, mit «weiterführen» zum Ausgang machen: dann lässt er sich weiter verwandeln, oder «Tonsignal» misst ihn für Bildparameter.`
      : ergebnisse[0].typ === "CONTROL_SIGNAL" && ergebnisse[0].daten?.quelle === "ton"
      ? `${op.name}: Steuersignal über ${sekunden(ergebnisse[0].daten.dauer)}. Wähle ein Bild und bei einer Operation die Quelle «Steuersignal».`
      : `${op.name}: ${ergebnisse.length} Ergebnis${ergebnisse.length === 1 ? "" : "se"}. Wähle eine Variante, um weiterzuführen.`);
  });
}
async function laufen(fn) {
  if (S.laeuft) return;
  S.laeuft = new AbortController();
  zeigeFormular();
  try { await fn(S.laeuft.signal); geaendert(); }
  catch (f) { status(f.name === "AbortError" ? "Abgebrochen." : `Fehler: ${f.message}`, null, f.name !== "AbortError"); console.warn(f); }
  finally { S.laeuft = null; alles(); status(letzterStatus[0], null, letzterStatus[2]); }
}

// jev-assistiert: feste Regeln immer, jev live nur wenn die Zwischenstelle bereit ist (jev/wahl.php)
function zeigeVorschlaege() {
  const box = $("vorschlaege"), e = aktuellesErgebnis();
  box.hidden = S.modus !== "jev";
  if (box.hidden) return;
  if (!e) { ersetze(box, el("h3", { text: "Vorschläge" }), el("small", { text: "Erst ein Ausgang, dann Vorschläge." })); return; }
  const regel = regelVorschlaege(R, S.projekt, e.id).slice(0, 3);
  ersetze(box, el("h3", { text: "Vorschläge" }),
    el("ul", {}, ...regel.map((v) => el("li", {}, el("span", {}, artEtikett("regel"), " ", el("b", { text: v.name }), " ",
      el("button", { class: "knopf klein", type: "button", onclick: () => { S.wahl = { art: "regel", details: { gruende: v.gruende, gewicht: v.gewicht, rang: regel.indexOf(v) + 1 } }; S.op = v.operation; waehleOperationOhneZuruecksetzen(); }, text: "übernehmen" })),
      el("small", { text: v.gruende.join("; ") || "keine besondere Regel" })))),
    el("div", { class: "aktionen" },
      el("button", { class: "knopf klein", type: "button", disabled: !jevVerfuegbar() || e.typ !== "IMAGE", onclick: jevFragen, text: "jev fragen" }),
      el("small", { text: jevVerfuegbar() ? "jev live: Wahrscheinlichkeiten für die nächste Operation. Ein Vorschlag, kein Urteil; die Regeln oben sind keine jev-Urteile." : `jev live ist nicht eingerichtet (${jevZustand().grund}). Die Regeln oben sind keine jev-Urteile.` })),
    S.jevAntwort ? el("ul", {}, ...Object.entries(S.jevAntwort.wahrscheinlichkeiten).sort((a, b) => b[1] - a[1]).map(([id, p]) => el("li", {},
      el("span", {}, artEtikett("jev"), " ", el("b", { text: opName(id) }), ` p = ${zahl(p)} `,
        el("button", { class: "knopf klein", type: "button", onclick: () => { S.wahl = { art: "jev", details: { quelle: S.jevAntwort.quelle, modell: S.jevAntwort.modell, wahrscheinlichkeit: p, wahrscheinlichkeiten: S.jevAntwort.wahrscheinlichkeiten, lage: S.jevAntwort.lage, zwischengespeichert: S.jevAntwort.zwischengespeichert, gefragt: S.jevAntwort.zeit } }; S.op = id; waehleOperationOhneZuruecksetzen(); }, text: "übernehmen" }))))) : null);
}
function waehleOperationOhneZuruecksetzen() { const w = S.wahl; waehleOperation(S.op); S.wahl = w; zeigeFormular(); }
async function jevFragen() {
  const e = aktuellesErgebnis();
  const optionen = R.fuer(e.typ).map((o) => o.id).slice(0, 6);
  const verlauf = P.verlauf(S.projekt, e.id).schritte.map((s) => s.knoten.operation);
  status("jev wird gefragt …");
  try { S.jevAntwort = await jevWahl({ verlauf, optionen }); status(`jev (${S.jevAntwort.modell}) hat geantwortet${S.jevAntwort.zwischengespeichert ? " (aus dem Zwischenspeicher, ohne Kosten)" : ""}.`); }
  catch (f) { S.jevAntwort = null; status(`jev: ${f.message}. Manuelle Wahl und Regeln bleiben verfügbar.`, null, true); }
  zeigeVorschlaege();
}

// experimentell: das Lab verbindet selbst, in Grenzen
function zeigeExperimentell() {
  const box = $("experimentell"), e = aktuellesErgebnis();
  box.hidden = S.modus !== "experimentell";
  $("op-liste").hidden = !box.hidden;
  if (box.hidden) return;
  const kandidaten = R.alle().filter((o) => o.eingaenge[0]?.typ === "IMAGE");
  ersetze(box, el("h3", { text: "Experiment in Grenzen" }),
    el("small", { text: `Das Lab wählt Operationen, Parameter und Varianten selbst, per Zufall mit Startwert. Höchstens ${P.GRENZEN.experimentSchritte} Schritte und ${P.GRENZEN.experimentSekunden} s, keine externen Dienste.` }),
    el("fieldset", { class: "gruppe" }, el("legend", { text: "erlaubte Operationen" }), ...kandidaten.map((o) => el("label", { class: "regler schalter" },
      el("input", { type: "checkbox", checked: S.experimentErlaubt.has(o.id), onchange: (ev) => { ev.target.checked ? S.experimentErlaubt.add(o.id) : S.experimentErlaubt.delete(o.id); } }), o.name))),
    regler({ id: "schritte", name: "Schritte", art: "zahl", min: 1, max: P.GRENZEN.experimentSchritte, schritt: 1 }, S.experimentSchritte, (x) => { S.experimentSchritte = x; }),
    regler({ id: "varianten", name: "Varianten je Schritt", art: "zahl", min: 1, max: 6, schritt: 1 }, S.experimentVarianten, (x) => { S.experimentVarianten = x; }),
    el("div", { class: "aktionen" },
      el("button", { class: "knopf voll", type: "button", id: "experiment-start", disabled: !e || e.typ !== "IMAGE" || Boolean(S.laeuft), onclick: experimentStarten, text: "Experiment starten" }),
      el("span", { class: "startwert", text: `Startwert ${S.seed}` })));
}
async function experimentStarten() {
  await laufen(async (signal) => {
    const x = await experiment({ register: R, projekt: S.projekt, medien: S.medien, start: S.aktuell, erlaubt: [...S.experimentErlaubt], schritte: S.experimentSchritte, varianten: S.experimentVarianten, seed: S.seed, melden: status, abbrechen: signal });
    if (x.ergebnisse.length) S.aktuell = x.ergebnisse.at(-1);
    S.seed = neuerStartwert();
    S.ansicht = "nach"; document.querySelector('input[name="ansicht"][value="nach"]').checked = true;
    status(`Experiment mit Startwert ${x.seed}: ${x.ergebnisse.length} Schritte. Der Verlauf steht unter «Nacheinander».`);
  });
}

// ---------- 3 · Experiment: Nebeneinander und Nacheinander ----------
/** Umriss eines Klangs (Spitzenwerte) als Fläche */
function umriss(e) {
  const u = e.ton?.umriss;
  if (!u?.length) return tonSymbol(e);
  const pts = u.map((v, i) => `${(i / (u.length - 1)) * 100},${22 - v * 20}`), unten = u.map((v, i) => `${(i / (u.length - 1)) * 100},${22 + v * 20}`).reverse();
  return svg(`<svg viewBox="0 0 100 44" preserveAspectRatio="none" role="img" aria-label="Umriss des Klangs"><polygon points="${[...pts, ...unten].join(" ")}" fill="#f4f1ea" opacity="0.85"/></svg>`);
}
/** einen Klang als WAV ausspielen, in der gewählten Bittiefe und Abtastrate (umgetastet mit gefenstertem Sinc, 16 Bit mit Dither) */
async function wavAusspielen(e) {
  const t = await S.medien.ton(e), { bits } = S.ausspielen, rate = S.ausspielen.rate || t.rate;
  const spuren = spurenVon(t).map((s) => rateWandeln(s, t.rate, rate));
  const bytes = wavSchreiben(spuren, rate, { bits, seed: 1 });
  const name = `${slug(S.projekt.titel)}-${slug(e.titel)}-${bits === "32f" ? "32bit-float" : `${bits}bit`}-${rate / 1000}khz.wav`;
  herunterladen(new Blob([bytes], { type: "audio/wav" }), name);
  S.projekt.exporte.push({ id: P.neueId("x"), art: "wav", ergebnis: e.id, bits, rate, quelleRate: t.rate, kanaele: spuren.length, sekunden: Math.round((spuren[0].length / rate) * 1000) / 1000, name, zeit: new Date().toISOString() });
  geaendert();
  status(`${name}: ${spuren.length === 1 ? "mono" : "stereo"}, ${bits === "32f" ? "32 Bit Gleitkomma" : `${bits} Bit`}, ${rate} Hz${rate !== t.rate ? ` (umgetastet von ${t.rate} Hz)` : ""}, ${(bytes.length / 1e6).toFixed(1)} MB.`);
}
/** Einstellungen fürs Anhören und Ausspielen: Schleife, Bittiefe, Abtastrate */
function ausspielLeiste() {
  return el("div", { class: "aktionen ausspielen" },
    el("label", { class: "regler schalter" }, el("input", { type: "checkbox", checked: S.schleife, onchange: (ev) => { S.schleife = ev.target.checked; for (const a of document.querySelectorAll("#buehne audio")) a.loop = S.schleife; } }), "in der Schleife hören"),
    el("label", { class: "regler" }, el("span", { text: "WAV mit" }), el("select", { onchange: (ev) => { S.ausspielen.bits = ev.target.value; } }, ...AUSSPIELEN.bits.map((o) => el("option", { value: o.wert, selected: S.ausspielen.bits === o.wert, text: o.name })))),
    el("label", { class: "regler" }, el("span", { text: "Abtastrate" }), el("select", { onchange: (ev) => { S.ausspielen.rate = Number(ev.target.value); } }, ...AUSSPIELEN.raten.map((o) => el("option", { value: o.wert, selected: S.ausspielen.rate === o.wert, text: o.name })))));
}
/** ein erzeugter Klang: Umriss, Wiedergabe, weiterführen (dann ist er Ausgang für Tonsignal und die Klangtransformationen), WAV */
function klangKarte(e, { gewaehlt = false, knoten = null } = {}) {
  const k = knoten ?? (e.knoten ? P.knoten(S.projekt, e.knoten) : null);
  const ziel = k?.variation?.routen?.[0]?.ziel, p = e.variante?.parameter;
  const angaben = `${sekunden(e.ton?.dauer ?? 0)}, ${e.ton?.abtastrate ?? "?"} Hz${e.ton?.kanaele === 2 ? ", stereo" : ""}`;
  const werte = p && ziel ? `${R.hole(k.operation).parameter.find((x) => x.id === ziel)?.name}: ${zahl(p[ziel])} · ${angaben}` : angaben;
  return el("div", { class: `karte klang${gewaehlt ? " gewaehlt" : ""}`, dataset: { ergebnis: e.id } },
    el("div", { class: "umriss" }, umriss(e)),
    el("audio", { src: S.medien.url(e), controls: true, preload: "none", loop: S.schleife }),
    el("div", { class: "titel", text: e.titel }),
    el("div", { class: "werte", text: werte }),
    el("div", { class: "aktionen" },
      e.knoten ? el("button", { class: `knopf klein${gewaehlt ? " voll" : ""}`, type: "button", onclick: () => weiterfuehren(e.id), text: gewaehlt ? "gewählt" : "weiterführen" }) : null,
      el("button", { class: "knopf klein leise", type: "button", title: "als WAV in der Bittiefe und Abtastrate darüber", onclick: () => wavAusspielen(e), text: "WAV" })));
}
function bildKarte(e, { gewaehlt = false, knoten = null } = {}) {
  const k = knoten ?? (e.knoten ? P.knoten(S.projekt, e.knoten) : null);
  const ziel = k?.variation?.routen?.[0]?.ziel;
  const werte = [e.variante?.parameter && ziel ? `${R.hole(k.operation).parameter.find((p) => p.id === ziel)?.name}: ${zahl(e.variante.parameter[ziel])}` : "",
    e.befund?.kurz || (e.befund?.mittlereAbweichung !== undefined ? `mittlere Abweichung ${zahl(e.befund.mittlereAbweichung)}, verändert ${Math.round(e.befund.anteilVeraendert * 100)} %` : "")].filter(Boolean).join(" · ");
  return el("div", { class: `karte${gewaehlt ? " gewaehlt" : ""}`, dataset: { ergebnis: e.id } },
    el("div", { class: "bild" }, el("img", { src: S.medien.url(e), alt: e.titel, loading: "lazy" })),
    el("div", { class: "titel", text: e.titel }),
    werte ? el("div", { class: "werte", text: werte }) : null,
    el("div", { class: "aktionen" },
      e.knoten ? el("button", { class: `knopf klein${gewaehlt ? " voll" : ""}`, type: "button", onclick: () => weiterfuehren(e.id), text: gewaehlt ? "gewählt" : "weiterführen" }) : null,
      el("button", { class: "knopf klein leise", type: "button", onclick: async () => herunterladen(new Blob([S.medien.dateien.get(e.datei)], { type: "image/png" }), `${slug(S.projekt.titel)}-${slug(e.titel)}.png`), text: "PNG" }),
      el("button", { class: "knopf klein leise", type: "button", "aria-pressed": String(Boolean(S.stationen?.some((x) => x.ergebnis === e.id))), title: "als Station in den Film über Stationen (Nacheinander)", onclick: () => stationUmschalten(e.id), text: "Station" }),
      el("label", { class: "vergleich" }, el("input", { type: "checkbox", checked: S.vergleich.has(e.id), onchange: (ev) => { ev.target.checked ? S.vergleich.add(e.id) : S.vergleich.delete(e.id); zeigeBuehne(); } }), "vergleichen")));
}
function weiterfuehren(id) {
  P.waehleVariante(S.projekt, id, "mensch", { ansicht: S.ansicht });
  S.aktuell = id; S.vergleich.clear(); geaendert();
  status("Variante gewählt. Sie ist jetzt der Ausgang für die nächste Operation.");
  alles();
}
function textKarte(e) {
  const d = e.daten;
  if (e.typ === "CONSTELLATION") return el("div", { class: "text-karte" },
    el("div", { class: "meta" }, `ORNA ${d.nummer} · ${d.kuenstler} × ${d.theoretiker}`),
    el("div", { text: d.text }),
    el("div", { class: "meta" }, `Gedanke: «${d.gedanke ?? "—"}»`),
    el("div", { class: "meta" }, `Regel ${d.regel} ${d.regelName}: ${d.eingriff}`),
    el("div", { class: "meta" }, `Passung ${d.passung}, Quelle ${d.quelle}. ${d.kennzeichnung}.`),
    el("div", { class: "meta" }, "Die Konstellation steht beim Prozess von The Fictory als zweiter Eingang bereit."));
  if (e.typ === "CONTROL_SIGNAL") {
    const w = d.werte, pts = w.map((v, i) => `${(i / (w.length - 1)) * 100},${(1 - v) * 40 + 2}`).join(" ");
    const zeit = d.achse === "zeit" ? `, ein Wert je ${zahl(d.je)} s. Über die Varianten stehen Momente des Klangs nebeneinander, über die Zeit folgt die Bildfolge ihm.` : ".";
    return el("div", { class: "signal" },
      svg(`<svg viewBox="0 0 100 44" preserveAspectRatio="none" role="img" aria-label="Steuersignal"><polyline points="${pts}" fill="none" stroke="#f4f1ea" stroke-width="0.6" vector-effect="non-scaling-stroke"/></svg>`),
      el("p", { class: "startwert", text: `${e.titel}: ${w.length} Werte 0–1${zeit} Als Modulationsquelle «Steuersignal» für jede Operation wählbar.` }));
  }
  if (e.typ === "EVENT_SEQUENCE" && d.art === "partitur") {
    const striche = d.ereignisse.map((x) => { const X = (x.t / d.dauer) * 100, Y = 42 - (Math.log2(x.hz / Math.min(...d.ereignisse.map((z) => z.hz))) / 6) * 38; return `<line x1="${X}" y1="${Y}" x2="${X + 1.2}" y2="${Y}" stroke="#f4f1ea" stroke-width="${1 + 2 * x.staerke}" vector-effect="non-scaling-stroke"/>`; }).join("");
    return el("div", { class: "signal" },
      svg(`<svg viewBox="0 0 100 44" preserveAspectRatio="none" role="img" aria-label="Partitur: ${d.ereignisse.length} Töne">${striche}</svg>`),
      el("p", { class: "startwert", text: `${e.titel}: Zeitpunkt, Tonhöhe (Hz) und Stärke jedes Tons, wie der Klangerzeuger ihn gesetzt hat. Als Ereignisfolge im Projekt.` }));
  }
  if (e.typ === "EVENT_SEQUENCE") {
    const striche = d.ereignisse.map((x) => `<line x1="${(x.t / d.dauer) * 100}" y1="44" x2="${(x.t / d.dauer) * 100}" y2="${44 - Math.max(4, Math.min(1, x.staerke) * 40)}" stroke="#f4f1ea" stroke-width="0.8" vector-effect="non-scaling-stroke"/>`).join("");
    return el("div", { class: "signal" },
      svg(`<svg viewBox="0 0 100 44" preserveAspectRatio="none" role="img" aria-label="Ereignisfolge: ${d.ereignisse.length} Einsätze">${striche}</svg>`),
      el("p", { class: "startwert", text: d.art === "rhythmus" ? `${e.titel}: wo die Schnitte im neuen Raster liegen (${d.raster} Schritte je Takt). Als Ereignisfolge im Projekt: Muster für einen anderen Klang oder Takt für den Film über Stationen.`
        : d.art === "schnitte" ? `${e.titel}: in welcher Ordnung die Schnitte stehen, umgekehrt oder wiederholt. Als Ereignisfolge im Projekt.`
        : `${e.titel}: Zeitpunkte und Stärke der Anschläge (Messung, keine Bewertung). Als Ereignisfolge im Projekt: Takt für den Film über Stationen, Schnittstellen für die Dekonstruktion.` }));
  }
  if (e.typ === "METADATA" && d?.art === "kompositorisches-profil") return profilKarte(e, d);
  return el("pre", { text: JSON.stringify(d, null, 2) });
}
/** das kompositorische Profil: eine Skizze (Schwerpunkt, Ausdehnung, Lichtgefälle, Kantenrichtung) und die Messwerte */
function profilKarte(e, d) {
  const [w, h] = d.gemessenIn, H = Math.round((100 * h) / w), sp = d.schwerpunkt, li = d.licht, ri = d.richtung;
  const px = 50 + sp.x * 100, py = H / 2 + sp.y * H, rad = (g) => (g * Math.PI) / 180;
  const pfeil = Math.min(1, li.gefaelleStaerke * 2) * 0.4 * Math.min(100, H), kante = ri.kohaerenz * 0.45 * Math.min(100, H);
  const lx = 50 + Math.cos(rad(li.gefaelleWinkel)) * pfeil, ly = H / 2 - Math.sin(rad(li.gefaelleWinkel)) * pfeil;
  const kx = Math.cos(rad(ri.kantenWinkel)) * kante, ky = Math.sin(rad(ri.kantenWinkel)) * kante;
  const skizze = svg(`<svg viewBox="0 0 100 ${H}" role="img" aria-label="Skizze des Profils: Schwerpunkt, Lichtgefälle und Kantenrichtung">
    <rect x="0.5" y="0.5" width="99" height="${H - 1}" fill="none" stroke="#9a9a9a" stroke-width="0.5"/>
    <path d="M48 ${H / 2}h4M50 ${H / 2 - 2}v4" stroke="#9a9a9a" stroke-width="0.4"/>
    <line x1="${50 - kx}" y1="${H / 2 + ky}" x2="${50 + kx}" y2="${H / 2 - ky}" stroke="#9a9a9a" stroke-width="0.6" stroke-dasharray="2 1.5"/>
    <line x1="50" y1="${H / 2}" x2="${lx}" y2="${ly}" stroke="#f4f1ea" stroke-width="0.8" marker-end="url(#spitze)"/>
    <circle cx="${px}" cy="${py}" r="${Math.max(1.5, sp.ausdehnung * 0.25 * Math.min(100, H))}" fill="none" stroke="#f4f1ea" stroke-width="0.5" stroke-dasharray="1 1"/>
    <circle cx="${px}" cy="${py}" r="1.6" fill="#f4f1ea"/>
    <defs><marker id="spitze" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L6 3L0 6z" fill="#f4f1ea"/></marker></defs></svg>`);
  const zeile = (name, wert, hilfe) => [el("dt", { text: name, title: hilfe ?? null }), el("dd", { text: wert })];
  const hyp = (k) => d.lesarten?.[k] ?? null;
  return el("div", { class: "profil" }, skizze,
    el("div", {}, el("p", { class: "startwert", text: `${mitQuelle(e)}: ${d.hinweis}. Punkt: Schwerpunkt des Gewichts, Kreis: Ausdehnung, Pfeil: wohin es heller wird, gestrichelt: Kantenrichtung.` }),
      el("dl", {},
        zeile("Schwerpunkt", `${zahl(sp.x)} / ${zahl(sp.y)} (Abstand zur Mitte ${zahl(sp.abstand)})`, "Versatz von der Bildmitte, −0,5 … 0,5"),
        zeile("Ausdehnung", zahl(sp.ausdehnung), hyp("schwerpunkt.ausdehnung")),
        zeile("Symmetrie", `links–rechts ${zahl(d.symmetrie.linksRechts)}, oben–unten ${zahl(d.symmetrie.obenUnten)}`, "1 spiegelgleich, 0,5 ohne Bezug, 0 gegengleich"),
        zeile("Licht", `Helligkeit ${zahl(li.helligkeit)}, Gefälle ${zahl(li.gefaelleStaerke)} nach ${li.gefaelleWinkel}°, Mitte/Rand ${zahl(li.mitte)}`),
        zeile("Kontrast", `gesamt ${zahl(d.kontrast.gesamt)}, binnen ${zahl(d.kontrast.binnen)}, Tonumfang ${zahl(d.kontrast.tonumfang)}`),
        zeile("Farbe", `Sättigung ${zahl(d.farbe.saettigung)}, Farbton ${d.farbe.farbton}°, Bündelung ${zahl(d.farbe.buendelung)}`),
        zeile("Richtung", `Kanten ${ri.kantenWinkel}°, Kohärenz ${zahl(ri.kohaerenz)}, radial ${zahl(ri.radial)}`, [hyp("richtung.kantenWinkel"), hyp("richtung.radial")].filter(Boolean).join(" ")),
      ),
      el("p", { class: "startwert", text: "Als Zielprofil bei «Komposition verändern» wählbar: ein anderes Bild wird diesem angeglichen." })));
}
const svg = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; };

function zeigeBuehne() {
  const b = $("buehne"), e = aktuellesErgebnis();
  if (!e) { ersetze(b, el("div", { class: "leer-buehne", text: "Ein Bild wird Material. Eine Operation verändert es, die Varianten stehen hier nebeneinander, jede kann weitergeführt werden." })); return; }
  ersetze(b, S.ansicht === "nach" ? nacheinander(e) : nebeneinander(e));
}
function nebeneinander(e) {
  const kId = S.knotenAnsicht && P.knoten(S.projekt, S.knotenAnsicht) ? S.knotenAnsicht : e.knoten;
  const k = kId ? P.knoten(S.projekt, kId) : null;
  const teile = [];
  if (!k && e.typ === "AUDIO") {
    teile.push(el("div", { class: "knotenkopf" }, el("b", { text: e.titel }), el("span", { text: "Material: Ton" })),
      el("div", { class: "ton-karte" }, el("audio", { src: S.medien.url(e), controls: true, preload: "metadata", loop: S.schleife }),
        el("p", { class: "startwert", text: `${e.herkunft?.hinweis ?? ""}. Der Ton bleibt unverändert. «Tempo und Tonhöhe», «Dekonstruktion», «Neu-Rhythmisierung» und «Körner» verwandeln ihn in neue Klänge, sechs Varianten nebeneinander. «Tonsignal» misst ihn (Hüllkurve, Bänder, Schwerpunkt, Einsätze) und gibt ein Steuersignal aus, das Bildparameter moduliert.` }),
        ausspielLeiste(), el("div", { class: "aktionen" }, el("button", { class: "knopf klein leise", type: "button", onclick: () => wavAusspielen(e), text: "WAV" }))));
  } else if (!k) {
    teile.push(el("div", { class: "knotenkopf" }, el("b", { text: e.titel }), el("span", { text: "Material" })), el("div", { class: "raster" }, bildKarte(e)));
  } else {
    const op = R.hole(k.operation), ausgaben = k.ausgaben.map((id) => P.ergebnis(S.projekt, id));
    const entsch = S.projekt.entscheidungen.filter((d) => d.knoten === k.id);
    teile.push(el("div", { class: "knotenkopf" }, el("b", { text: op.name }), el("span", { text: `${ausgaben.length} Ergebnis${ausgaben.length === 1 ? "" : "se"}` }),
      el("span", { class: "startwert", text: `Startwert ${k.seed}` }), ...entsch.map((d) => el("span", {}, artEtikett(d.art), ` ${d.gegenstand}`)),
      k.status === "fehler" ? el("span", { class: "fehler", text: k.fehler }) : null,
      ausgaben.filter((x) => x.typ === "IMAGE").length > 1 ? el("button", { class: "knopf klein leise", type: "button", onclick: () => alleAlsStationen(k), text: "alle als Stationen" }) : null));
    const bilder = ausgaben.filter((x) => x.typ === "IMAGE"), klaenge = ausgaben.filter((x) => x.typ === "AUDIO"), andere = ausgaben.filter((x) => x.typ !== "IMAGE" && x.typ !== "AUDIO");
    if (bilder.length) teile.push(el("div", { class: "raster" }, ...bilder.map((x) => bildKarte(x, { gewaehlt: k.gewaehlt === x.id || S.aktuell === x.id, knoten: k }))));
    if (klaenge.length) teile.push(ausspielLeiste(), el("div", { class: "raster" }, ...klaenge.map((x) => klangKarte(x, { gewaehlt: k.gewaehlt === x.id || S.aktuell === x.id, knoten: k }))));
    // neben Klängen sind die Ereignisfolgen Beigaben (Rhythmus, Ordnung): eingeklappt, damit die Klänge vorn stehen
    if (klaenge.length && andere.length) teile.push(el("details", { class: "beigaben" }, el("summary", { text: `${andere.length === 1 ? andere[0].titel : `${andere.length} Ereignisfolgen (Rhythmus, Ordnung)`}` }), ...andere.map(textKarte)));
    else teile.push(...andere.map(textKarte));
  }
  if (S.vergleich.size === 2) {
    const [a, c] = [...S.vergleich];
    teile.push(el("div", { class: "aktionen", style: "margin-top:14px" }, el("button", { class: "knopf", type: "button", onclick: () => vergleiche(a, c), text: "Differenz der beiden zeigen" }), el("small", { text: "Beobachtung: misst, bewertet nicht." })));
  }
  // alternative Fortsetzungen desselben Ausgangs (Nebeneinander der Verläufe)
  const quelle = k ? Object.values(k.eingaben)[0] ?? null : e.id;
  const alternativen = S.projekt.knoten.filter((x) => quelle && Object.values(x.eingaben)[0] === quelle && x.ausgaben.length);
  if (alternativen.length > 1 || (!k && alternativen.length)) teile.push(el("div", { class: "alternativen" }, el("span", { text: "Fortsetzungen desselben Ausgangs:" }),
    ...alternativen.map((x) => el("button", { class: `knopf klein${x.id === kId ? " voll" : " leise"}`, type: "button", onclick: () => { S.knotenAnsicht = x.id; zeigeBuehne(); }, text: `${opName(x.operation)} · ${uhr(x.start)}` }))));
  return el("div", {}, ...teile);
}
async function vergleiche(a, c) {
  await laufen(async (signal) => {
    const { ergebnisse } = await fuehreAus({ register: R, projekt: S.projekt, medien: S.medien, abbrechen: signal, melden: status,
      auftrag: { operation: "lab.differenz", eingaben: { bild: a, vergleich: c }, wahl: { art: "mensch", details: { anlass: "Vergleich zweier Varianten" } } } });
    S.knotenAnsicht = ergebnisse[0].knoten; S.vergleich.clear();
    status(`Differenz: mittlere Abweichung ${zahl(ergebnisse[0].befund.mittlereAbweichung)}, ${Math.round(ergebnisse[0].befund.anteilVeraendert * 100)} % verändert (Messung, keine Bewertung).`);
  });
}
function parameterText(k) {
  const op = R.hole(k.operation), std = standardParameter(op);
  const abw = op.parameter.filter((p) => k.parameter[p.id] !== std[p.id]).map((p) => `${p.name} ${typeof k.parameter[p.id] === "number" ? zahl(k.parameter[p.id]) : k.parameter[p.id]}`);
  const r = k.variation?.routen?.[0];
  const sig = r?.modulator?.quelle === "signal" ? P.ergebnis(S.projekt, r.modulator.ergebnis) : null;
  const quelle = sig ? `${QUELLEN.signal} «${sig.titel}»` : r ? QUELLEN[r.modulator.quelle] : "";
  return [abw.length ? abw.join(" · ") : "Standardwerte", r ? `moduliert: ${op.parameter.find((p) => p.id === r.ziel)?.name} ← ${quelle} (Tiefe ${zahl(r.tiefe)}${r.polaritaet === "einpolig" ? ", einpolig" : ""}${r.modulator.halten ? `, ${r.modulator.halten} Stufen gehalten` : ""}, ${k.variation.achse})` : null].filter(Boolean).join(" — ");
}
function nacheinander(e) {
  const { material, schritte } = P.verlauf(S.projekt, e.id);
  const liste = el("ol", { class: "verlauf" });
  if (material) liste.append(el("li", {}, el("div", { class: "bild" }, material.typ === "IMAGE" ? el("img", { src: S.medien.url(material), alt: material.titel }) : null),
    el("div", {}, el("div", { class: "schrittkopf" }, el("b", { text: "Material" }), el("span", { text: material.titel })),
      el("div", { class: "parameter", text: material.herkunft?.hinweis ?? "" }))));
  for (const [i, { knoten: k, ergebnis: x }] of schritte.entries()) {
    const entsch = S.projekt.entscheidungen.filter((d) => d.knoten === k.id);
    liste.append(el("li", {}, el("div", { class: "bild" }, x.typ === "AUDIO" ? umriss(x) : el("img", { src: S.medien.url(x), alt: x.titel })),
      el("div", {},
        el("div", { class: "schrittkopf" }, el("b", { text: `${i + 1}. ${opName(k.operation)}` }), el("span", { text: x.titel }), ...entsch.map((d) => el("span", { title: JSON.stringify(d.details) }, artEtikett(d.art), ` ${d.gegenstand}`))),
        el("div", { class: "parameter", text: parameterText(k) }),
        el("div", { class: "parameter", text: `Startwert ${k.seed}, ${k.dauerMs ?? "?"} ms, Operation ${k.operation} ${k.operationVersion}` }),
        x.typ === "AUDIO" ? el("audio", { src: S.medien.url(x), controls: true, preload: "none" }) : null,
        k.ausgaben.length > 1 ? el("div", { class: "geschwister" }, ...k.ausgaben.map((id) => P.ergebnis(S.projekt, id)).filter((y) => y.typ === "IMAGE").map((y) =>
          el("button", { type: "button", "aria-pressed": String(y.id === x.id), title: `${y.titel}: als Ausgang wählen`, onclick: () => weiterfuehren(y.id) }, el("img", { src: S.medien.url(y), alt: y.titel })))) : null)));
  }
  const film = S.filme.get(e.id);
  const klaenge = S.projekt.ergebnisse.filter((x) => x.typ === "AUDIO");
  if (!S.tonspur.has(e.id)) S.tonspur.set(e.id, tonDesVerlaufs(e.id) ?? "");
  return el("div", {}, liste, stationenAnsicht(e), schritte.length && e.typ === "IMAGE" ? el("div", { class: "film" },
    el("div", { class: "aktionen" },
      el("button", { class: "knopf", type: "button", id: "animation", disabled: Boolean(S.laeuft), onclick: () => animation(e.id), text: "Animation des letzten Schritts" }),
      klaenge.length ? el("label", { class: "regler tonspur" }, el("span", { text: "Tonspur" }),
        el("select", { id: "tonspur", onchange: (ev) => S.tonspur.set(e.id, ev.target.value) }, el("option", { value: "", text: "keine" }),
          ...klaenge.map((x) => el("option", { value: x.id, selected: S.tonspur.get(e.id) === x.id, text: x.titel })))) : null,
      el("label", { class: "regler laenge", title: "Leer: so lang, wie die Operation ihren Verlauf rechnet. Sonst wird die Bildfolge auf diese Länge gedehnt oder gestaucht." }, el("span", { text: "Länge (s)" }),
        el("input", { type: "number", id: "laenge", min: 1, max: P.GRENZEN.animationBilder / FPS, step: 0.5, placeholder: "eigene", value: S.laenge.get(e.id) ?? "",
          onchange: (ev) => { const v = Number(ev.target.value); if (ev.target.value === "" || !(v > 0)) S.laenge.delete(e.id); else S.laenge.set(e.id, Math.min(P.GRENZEN.animationBilder / FPS, Math.max(1, v))); } })),
      klaenge.length ? el("label", { class: "regler schalter" }, el("input", { type: "checkbox", id: "strecken", checked: S.strecken.get(e.id) !== false, onchange: (ev) => S.strecken.set(e.id, ev.target.checked) }), "Bildfolge so lang wie der Klang") : null,
      el("button", { class: "knopf leise", type: "button", onclick: () => verlaufExportieren(e.id), text: "Verlauf als ZIP" }),
      el("button", { class: "knopf leise", type: "button", title: "Bild, Film (falls gerechnet) und Protokoll als Ordner für die Lab-Werkschau unter /b/lab/works/", onclick: () => werkExportieren(e.id), text: "Für Works" }),
      el("small", { text: "Die Operation rechnet ihren Verlauf mit denselben Parametern und demselben Startwert noch einmal." })),
    film ? el("video", { src: film.url, controls: true, loop: true, muted: !film.tonspur?.codec, playsinline: true }) : null,
    film ? el("div", { class: "aktionen" }, el("button", { class: "knopf klein", type: "button", onclick: () => herunterladen(film.blob, film.name), text: `${film.endung.toUpperCase()} speichern` }), el("small", { text: `${film.bilder} Bilder, ${film.breite} × ${film.hoehe}, ${film.codec}${film.tonspur?.codec ? `, Ton ${film.tonspur.codec}` : film.tonspur?.fehlt ? `, ohne Ton: ${film.tonspur.fehlt}` : ""}` })) : null) : null);
}
/** der Klang, der den Verlauf über ein Tonsignal gesteuert hat (sonst keiner): er steht als Tonspur vor */
function tonDesVerlaufs(id) {
  for (const { knoten: k } of P.verlauf(S.projekt, id).schritte.reverse()) for (const r of k.variation?.routen ?? []) {
    const s = r.modulator?.quelle === "signal" ? P.ergebnis(S.projekt, r.modulator.ergebnis) : null;
    const q = s?.knoten ? P.ergebnis(S.projekt, P.knoten(S.projekt, s.knoten).eingaben.ton) : null;
    if (q?.typ === "AUDIO") return q.id;
  }
  return null;
}
const TON_FEHLT = "dieser Browser kann keinen Ton kodieren (AudioEncoder für AAC oder Opus fehlt, oder das Video entstand in Echtzeit)";
async function animation(id) {
  await laufen(async (signal) => {
    const e = P.ergebnis(S.projekt, id);
    status("Animation wird gerechnet …", 0);
    const tonId = S.tonspur.get(id) || null, tonE = tonId ? P.ergebnis(S.projekt, tonId) : null;
    // ein Tonsignal mit Ausschnitt: die Tonspur beginnt dort, wo das Signal beginnt
    const sig = tonE ? P.verlauf(S.projekt, id).schritte.flatMap(({ knoten: k }) => k.variation?.routen ?? []).map((r) => P.ergebnis(S.projekt, r.modulator?.ergebnis)).find((x) => x?.knoten && P.knoten(S.projekt, x.knoten).eingaben.ton === tonId) : null;
    // die Bildzahl steht erst nach dem Rechnen fest: der Klang läuft ab «beginn» ganz, höchstens so lang wie die längste Animation
    const t = tonE ? await S.medien.ton(tonE) : null, beginn = sig?.daten?.beginn ?? 0;
    const ton = t ? { pcm: t.pcm, spuren: t.spuren, rate: t.rate, beginn, dauer: Math.min(t.pcm.length / t.rate - beginn, P.GRENZEN.animationBilder / FPS) } : null;
    // auf Wunsch so viele Bilder wie der Klang (oder das steuernde Signal) Sekunden mal 30 hat: dann läuft das Bild genau mit dem Ton
    // eine frei gewählte Länge geht vor; der Ton läuft dann höchstens so lang wie das Bild
    const laenge = S.laenge.get(id);
    const ziel = laenge ? Math.min(P.GRENZEN.animationBilder, Math.round(laenge * FPS))
      : ton && S.strecken.get(id) !== false ? Math.min(P.GRENZEN.animationBilder, Math.round((sig?.daten?.dauer ?? ton.dauer) * FPS)) : null;
    if (ton && ziel) ton.dauer = laenge ? Math.min(ton.dauer, ziel / FPS) : ziel / FPS;
    const r = await videoAus(bildfolge({ register: R, projekt: S.projekt, medien: S.medien, ergebnisId: id, abbrechen: signal, bilder: ziel }), { melden: status, ton, halten: ziel ? 0 : 1 });
    const name = `medien/${id}-animation.${r.endung}`;
    const bytes = new Uint8Array(await r.blob.arrayBuffer());
    const abgelegt = await S.medien.ablegenDatei(name, bytes, r.mime);
    S.projekt.exporte.push({ id: P.neueId("x"), art: "animation", ergebnis: id, ...(laenge ? { laenge } : {}), datei: name, mime: r.mime, codec: r.codec, bilder: r.bilder, fps: FPS, breite: r.breite, hoehe: r.hoehe, sha256: abgelegt.sha256, zeit: new Date().toISOString(),
      ...(ton ? { tonspur: { ergebnis: tonId, beginn, sekunden: Math.round(ton.dauer * 1000) / 1000, ...(r.ton ? { codec: r.ton } : { fehlt: TON_FEHLT }) } } : {}) });
    const tonspur = S.projekt.exporte.at(-1).tonspur ?? null;
    S.filme.set(id, { ...r, tonspur, url: URL.createObjectURL(r.blob), name: `${slug(S.projekt.titel)}-${slug(e.titel)}.${r.endung}` });
    status(`Animation: ${r.bilder} Bilder (${(r.bilder / FPS).toFixed(1)} s), ${(r.blob.size / 1e6).toFixed(1)} MB, ${r.codec}${tonspur?.codec ? `, mit Tonspur (${tonspur.codec}, ab ${sekunden(beginn)})` : tonspur?.fehlt ? `. Ohne Ton: ${tonspur.fehlt}` : ""}.`);
  });
}
/** das Protokoll eines Verlaufs: Material, Schritte mit Operation, Parametern, Startwert und Entscheidungen */
function verlaufProtokoll(id) {
  const { material, schritte } = P.verlauf(S.projekt, id);
  return { lab: P.LAB_VERSION, projekt: S.projekt.id, titel: S.projekt.titel, exportiert: new Date().toISOString(), material: material?.titel,
    schritte: schritte.map(({ knoten: k, ergebnis: e }) => ({ operation: k.operation, version: k.operationVersion, parameter: e.variante?.parameter ?? k.parameter, startwert: e.variante?.seed ?? k.seed, ergebnis: e.titel,
      entscheidungen: S.projekt.entscheidungen.filter((d) => d.knoten === k.id).map(({ art, gegenstand, gewaehlt, details }) => ({ art, gegenstand, gewaehlt, details })) })) };
}
const json = (o) => new TextEncoder().encode(JSON.stringify(o, null, 2));
function verlaufExportieren(id) {
  const { material, schritte } = P.verlauf(S.projekt, id);
  const dateien = [];
  const nimm = (e, name) => { const b = S.medien.dateien.get(e.datei); if (b) dateien.push({ name, bytes: b }); };
  if (material) nimm(material, `00-material.png`);
  schritte.forEach(({ knoten: k, ergebnis: e }, i) => nimm(e, `${String(i + 1).padStart(2, "0")}-${slug(opName(k.operation))}.png`));
  dateien.push({ name: "verlauf.json", bytes: json(verlaufProtokoll(id)) });
  herunterladen(new Blob([zip(dateien)], { type: "application/zip" }), `${slug(S.projekt.titel)}-verlauf.zip`);
  S.projekt.exporte.push({ id: P.neueId("x"), art: "verlauf", ergebnis: id, dateien: dateien.map((d) => d.name), zeit: new Date().toISOString() });
  zeigeProtokoll();
}
/** Ein Ordner für die Lab-Werkschau (b/lab/works/<ordner>/, tools/build-lab-works.mjs): werk.json, bild.png, der Film des letzten Schritts,
    falls gerechnet, und verlauf.json. Titel, Jahr und Text stehen in werk.json vor und werden dort ergänzt; nichts wird veröffentlicht. */
async function werkExportieren(id) {
  const e = P.ergebnis(S.projekt, id), bild = S.medien.dateien.get(e.datei);
  if (!bild) return status("Für Works: das Bild dieses Ergebnisses fehlt.", null, true);
  const ordner = slug(`${S.projekt.titel}-${e.titel}`), film = S.filme.get(id), protokoll = verlaufProtokoll(id);
  const dateien = [{ name: `${ordner}/bild.png`, bytes: bild }];
  if (film) dateien.push({ name: `${ordner}/film.${film.endung}`, bytes: new Uint8Array(await film.blob.arrayBuffer()) });
  dateien.push({ name: `${ordner}/verlauf.json`, bytes: json(protokoll) });
  const werk = { format: "ornament-lab-werk", version: 1, titel: S.projekt.titel === "Ohne Titel" ? e.titel : S.projekt.titel, jahr: new Date().getFullYear(),
    text: "", bild: "bild.png", breite: e.breite, hoehe: e.hoehe, film: film ? `film.${film.endung}` : null, verlauf: "verlauf.json",
    lab: P.LAB_VERSION, operationen: [...new Set(protokoll.schritte.map((x) => opName(x.operation)))], exportiert: protokoll.exportiert, veroeffentlicht: false };
  dateien.splice(1, 0, { name: `${ordner}/werk.json`, bytes: json(werk) });
  herunterladen(new Blob([zip(dateien)], { type: "application/zip" }), `${ordner}-works.zip`);
  S.projekt.exporte.push({ id: P.neueId("x"), art: "werk", ergebnis: id, dateien: dateien.map((d) => d.name), zeit: protokoll.exportiert });
  status(`Für Works: ${ordner}-works.zip${film ? " mit Film" : " ohne Film (vorher «Animation des letzten Schritts» rechnen, wenn einer dazugehört)"}.`);
  zeigeProtokoll();
}

// ---------- Film über Stationen (kern/stationen.js) ----------
/** die Stationen: die eigene Auswahl oder der Verlauf bis zum Ausgang */
function stationen(e) {
  if (S.stationen) return S.stationen.filter((x) => P.ergebnis(S.projekt, x.ergebnis)?.typ === "IMAGE");
  return e ? ST.stationenAusVerlauf(S.projekt, e.id).map((id) => ({ ergebnis: id })) : [];
}
function stationUmschalten(id) {
  S.stationen ??= [];
  const i = S.stationen.findIndex((x) => x.ergebnis === id);
  if (i >= 0) S.stationen.splice(i, 1); else S.stationen.push({ ergebnis: id });
  status(i >= 0 ? "Station entfernt." : `Station ${S.stationen.length} aufgenommen. Der Film über die Stationen steht unter «Nacheinander».`);
  zeigeBuehne();
}
function alleAlsStationen(k) {
  S.stationen = k.ausgaben.filter((id) => P.ergebnis(S.projekt, id)?.typ === "IMAGE").map((id) => ({ ergebnis: id }));
  status(`${S.stationen.length} Stationen: die Varianten dieses Schritts. Der Film steht unter «Nacheinander».`);
  zeigeBuehne();
}
function stationenPlan(liste) {
  const f = S.film;
  const routen = f.quelle !== "keine" && (f.quelle !== "signal" || f.signal)
    ? [{ ziel: f.ziel, tiefe: f.tiefe, modulator: f.quelle === "signal" ? { quelle: "signal", ergebnis: f.signal } : { quelle: f.quelle, frequenz: f.frequenz, phase: 0, seed: S.seed, stufen: liste.length } }] : [];
  return { stationen: liste, halten: f.halten, uebergang: f.uebergang, art: f.art, routen, fps: FPS, takt: f.takt ? { ereignisfolge: f.takt, schwelle: f.schwelle, wiederholen: f.wiederholen } : null };
}
function stationenAnsicht(e) {
  const liste = stationen(e), f = S.film;
  const eigene = Boolean(S.stationen);
  if (liste.length < 2 && !eigene) return el("p", { class: "startwert stationen", text: "Animation über Stationen: sobald der Verlauf zwei Bildzustände hat, oder mit «Station» unter «Nebeneinander»." });
  const setze = (neu) => { S.stationen = neu; zeigeBuehne(); };
  const verschiebe = (i, d) => { const l = liste.map((x) => ({ ...x })); [l[i], l[i + d]] = [l[i + d], l[i]]; setze(l); };
  const zeilen = liste.map((x, i) => {
    const b = P.ergebnis(S.projekt, x.ergebnis), naechste = liste[i + 1];
    const verlaufGeht = naechste && ST.verlaufMoeglich(S.projekt, x.ergebnis, naechste.ergebnis);
    return el("li", {},
      el("div", { class: "bild" }, el("img", { src: S.medien.url(b), alt: b.titel })),
      el("div", { class: "station-text" }, el("b", { text: `${i + 1}` }), " ", b.titel),
      el("div", { class: "aktionen" },
        el("button", { class: "knopf klein leise", type: "button", disabled: i === 0, "aria-label": `Station ${i + 1} nach vorn`, onclick: () => verschiebe(i, -1), text: "↑" }),
        el("button", { class: "knopf klein leise", type: "button", disabled: i === liste.length - 1, "aria-label": `Station ${i + 1} nach hinten`, onclick: () => verschiebe(i, 1), text: "↓" }),
        el("button", { class: "knopf klein leise", type: "button", "aria-label": `Station ${i + 1} entfernen`, onclick: () => setze(liste.filter((_, j) => j !== i)), text: "✕" })),
      naechste ? el("label", { class: "regler" }, el("span", { text: "Übergang zur nächsten" }),
        el("select", { onchange: (ev) => setze(liste.map((y, j) => (j === i ? { ergebnis: y.ergebnis, ...(ev.target.value ? { uebergang: ev.target.value } : {}) } : y))) },
          el("option", { value: "", text: `wie eingestellt (${ST.UEBERGAENGE[f.art]})` }),
          ...Object.entries(ST.UEBERGAENGE).map(([k, n]) => el("option", { value: k, selected: x.uebergang === k, disabled: k === "verlauf" && !verlaufGeht, text: n })))) : null);
  });
  const signale = S.projekt.ergebnisse.filter((x) => x.typ === "CONTROL_SIGNAL"), folgen = S.projekt.ergebnisse.filter((x) => x.typ === "EVENT_SEQUENCE");
  if (f.quelle === "signal" && !signale.some((x) => x.id === f.signal)) f.signal = signale.at(-1)?.id ?? "";
  if (f.takt && !folgen.some((x) => x.id === f.takt)) f.takt = "";
  const plan = el("p", { class: "startwert", id: "stationen-plan" });
  const rechnen = () => {
    try {
      const pt = ST.partitur(S.projekt, stationenPlan(liste));
      plan.textContent = `${pt.folge.length} Auftritte, ${sekunden(pt.dauer)}${pt.offen ? ` und die eigene Länge von ${pt.offen} Verlauf${pt.offen > 1 ? "en" : ""}` : ""}, ${pt.bilder} Bilder${pt.takt ? `, im Takt von ${pt.takt.einsaetze} Einsätzen` : ""}.${pt.folge.some((x) => x.uebergang?.hinweis) ? ` ${pt.folge.find((x) => x.uebergang?.hinweis).uebergang.hinweis}.` : ""}`;
      plan.classList.remove("fehler");
    } catch (x) { plan.textContent = x.message; plan.classList.add("fehler"); }
  };
  const neu = (fn) => (v) => { fn(v); rechnen(); };
  const zahlRegler = (id, name, min, max, schritt, wert, fn) => regler({ id, name, art: "zahl", min, max, schritt }, wert, neu(fn));
  const wahlRegler = (id, name, optionen, wert, fn, neuZeichnen = false) => regler({ id, name, art: "wahl", optionen }, wert, neuZeichnen ? (v) => { fn(v); zeigeBuehne(); } : neu(fn));
  const takt = folgen.find((x) => x.id === f.takt);
  const klaenge = S.projekt.ergebnisse.filter((x) => x.typ === "AUDIO"), tonId = stationenTon(liste);
  const film = S.filme.get("stationen");
  rechnen();
  return el("section", { class: "stationen", "aria-labelledby": "h-stationen" },
    el("div", { class: "knotenkopf" }, el("b", { id: "h-stationen", text: "Animation über Stationen" }),
      el("span", { class: "startwert", text: eigene ? "eigene Auswahl" : "der Verlauf bis zum Ausgang" }),
      eigene ? el("button", { class: "knopf klein leise", type: "button", onclick: () => setze(null), text: "Verlauf übernehmen" }) : null),
    liste.length ? el("ol", { class: "stationen-liste" }, ...zeilen) : null,
    el("small", { class: "startwert", text: "Unter «Nebeneinander» nimmt «Station» weitere Zustände auf, auch Varianten, die nicht weitergeführt wurden." }),
    el("fieldset", { class: "gruppe stationen-regler" }, el("legend", { text: "Zeit" }),
      zahlRegler("halten", "Halten je Station (s)", 0, 10, 0.1, f.halten, (v) => { f.halten = v; }),
      zahlRegler("uebergang", "Übergang (s)", 0, 6, 0.1, f.uebergang, (v) => { f.uebergang = v; }),
      wahlRegler("art", "Übergang", Object.entries(ST.UEBERGAENGE).map(([k, n]) => ({ wert: k, name: n })), f.art, (v) => { f.art = v; }, true),
      wahlRegler("quelle", "Modulation über die Stationen", Object.entries(QUELLEN).filter(([k]) => k !== "signal" || signale.length).map(([k, n]) => ({ wert: k, name: n })), f.quelle, (v) => { f.quelle = v; }, true),
      f.quelle !== "keine" ? wahlRegler("ziel", "moduliert", ST.ZEITPARAMETER.map((p) => ({ wert: p.id, name: p.name })), f.ziel, (v) => { f.ziel = v; }) : null,
      f.quelle === "signal" ? wahlRegler("signal", "Steuersignal", signale.map((x) => ({ wert: x.id, name: x.titel })), f.signal, (v) => { f.signal = v; }) : null,
      f.quelle !== "keine" ? zahlRegler("tiefe", "Tiefe (Attenuverter)", -1, 1, 0.05, f.tiefe, (v) => { f.tiefe = v; }) : null,
      f.quelle !== "keine" && f.quelle !== "signal" ? zahlRegler("frequenz", "Frequenz (Zyklen)", 0.25, 4, 0.25, f.frequenz, (v) => { f.frequenz = v; }) : null,
      wahlRegler("takt", "Takt", [{ wert: "", name: "gleichmässig (Halten und Übergang)" }, ...folgen.map((x) => ({ wert: x.id, name: x.titel }))], f.takt, (v) => { f.takt = v; }, true),
      !folgen.length ? el("small", { class: "hinweis", text: klaenge.length ? "Einen anderen Takt gibt es, sobald eine Ereignisfolge da ist: den Klang oben wählen und «Tonsignal» mit Merkmal «Einsätze» (oder «Neu-Rhythmisierung») ausführen." : "Einen anderen Takt gibt es mit einem Klang: Ton einlesen, dann «Tonsignal» mit Merkmal «Einsätze» ausführen." }) : null,
      f.takt ? zahlRegler("schwelle", "Einsätze ab Stärke", 0, 1, 0.05, f.schwelle, (v) => { f.schwelle = v; }) : null,
      f.takt ? el("label", { class: "regler schalter" }, el("input", { type: "checkbox", checked: f.wiederholen, onchange: (ev) => { f.wiederholen = ev.target.checked; rechnen(); } }), "Stationen reihum, bis die Einsätze aufgebraucht sind") : null,
      klaenge.length ? wahlRegler("tonspur", "Tonspur", [{ wert: "", name: "keine" }, ...klaenge.map((x) => ({ wert: x.id, name: x.titel }))], tonId, (v) => { f.tonspur = v; }, true) : null,
      tonId && !f.takt ? el("div", { class: "aktionen" }, el("button", { class: "knopf klein leise", type: "button", onclick: () => halteAnKlang(liste, tonId), text: "Halten an den Klang anpassen" }),
        el("small", { text: "Ohne Takt läuft der Ton ab dem Anfang und endet mit dem Film." })) : null,
      zahlRegler("seite", "Filmgrösse, längste Seite (px)", 320, 2048, 16, f.seite, (v) => { f.seite = v; })),
    plan,
    el("div", { class: "aktionen" },
      el("button", { class: "knopf", type: "button", id: "stationenfilm", disabled: liste.length < 2 || Boolean(S.laeuft), onclick: () => stationenFilm(liste), text: "Animation über die Stationen" }),
      el("small", { text: "Verläufe von Operationen werden mit denselben Parametern und Startwerten noch einmal gerechnet." })),
    film ? el("div", { class: "film" }, el("video", { src: film.url, controls: true, loop: true, playsinline: true, muted: !film.ton }),
      el("div", { class: "aktionen" }, el("button", { class: "knopf klein", type: "button", onclick: () => herunterladen(film.blob, film.name), text: `${film.endung.toUpperCase()} speichern` }),
        el("small", { text: `${film.bilder} Bilder, ${film.breite} × ${film.hoehe}, ${film.codec}${film.ton ? `, Ton ${film.ton}` : ", ohne Ton"}` }))) : null);
}
/** die Tonspur des Films über Stationen: gewählt, sonst («auto») der Ton des Takts, sonst der zuletzt entstandene Klang */
function stationenTon(liste) {
  const f = S.film, klaenge = S.projekt.ergebnisse.filter((x) => x.typ === "AUDIO");
  if (f.tonspur !== "auto") return klaenge.some((x) => x.id === f.tonspur) ? f.tonspur : null;
  let takt = null;
  try { takt = f.takt ? ST.partitur(S.projekt, stationenPlan(liste)).takt : null; } catch { /* Plan noch unvollständig */ }
  return takt?.ton ?? klaenge.at(-1)?.id ?? null;
}
/** Halten je Station so setzen, dass der Film (gleichmässig) so lang ist wie der Klang, höchstens 10 s je Station */
async function halteAnKlang(liste, tonId) {
  const t = await S.medien.ton(P.ergebnis(S.projekt, tonId)), dauer = t.pcm.length / t.rate, n = liste.length;
  S.film.halten = Math.max(0, Math.min(10, Math.round(((dauer - (n - 1) * S.film.uebergang) / n) * 10) / 10));
  zeigeBuehne();
  status(`Halten je Station: ${zahl(S.film.halten)} s, damit ${n} Stationen etwa ${sekunden(dauer)} dauern wie der Klang.`);
}
async function stationenFilm(liste) {
  await laufen((signal) => stationenFilmRechnen(liste, signal));
}
async function stationenFilmRechnen(liste, signal, { vorschlag = null, auswahl = null, entscheidung = null } = {}) {
  const pt = ST.partitur(S.projekt, stationenPlan(liste)), zeitplan = [];
  const tonId = stationenTon(liste);
  const roh = tonId ? await S.medien.ton(P.ergebnis(S.projekt, tonId)) : null;
  // im Takt eines Tons beginnt die Spur dort, wo seine Einsätze gemessen wurden; sonst dort, wo der Vorschlag den Ton gemessen hat, oder am Anfang
  const ton = roh ? { pcm: roh.pcm, spuren: roh.spuren, rate: roh.rate, beginn: pt.takt?.ton === tonId ? pt.takt.tonBeginn : tonId === S.film.tonspur ? S.film.tonBeginn ?? 0 : 0, dauer: pt.dauer } : null;
  const ids = liste.map((x) => x.ergebnis);
  const d = P.entscheide(S.projekt, { art: "mensch", gegenstand: "stationen", gewaehlt: ids, details: { auswahl: auswahl ?? (S.stationen ? "eigene" : "Verlauf"), uebergang: pt.art, takt: pt.takt?.ereignisfolge ?? null, ...(entscheidung ? { dramaturgie: entscheidung } : {}) } });
  status(`Film über ${liste.length} Stationen wird gerechnet …`, 0);
  const melden = (t) => status(`${t}, geplant ${pt.bilder}${pt.offen ? " und Verläufe" : ""}`, null);
  const r = await videoAus(ST.filmbilder({ register: R, projekt: S.projekt, medien: S.medien, partitur: pt, seite: S.film.seite, abbrechen: signal, zeitplan }), { melden, halten: 0, ton });
  const id = P.neueId("x"), name = `medien/${id}-stationen.${r.endung}`;
  const abgelegt = await S.medien.ablegenDatei(name, new Uint8Array(await r.blob.arrayBuffer()), r.mime);
  S.projekt.exporte.push({ id, art: "stationen", ergebnis: ids.at(-1), stationen: ids, entscheidung: d.id, partitur: pt, zeitplan, datei: name, mime: r.mime, codec: r.codec, ton: r.ton, tonQuelle: r.ton ? tonId : null,
    ...(ton ? { tonBeginn: ton.beginn } : {}), ...(vorschlag ? { dramaturgie: vorschlag } : {}), bilder: r.bilder, fps: FPS, breite: r.breite, hoehe: r.hoehe, sha256: abgelegt.sha256, zeit: new Date().toISOString() });
  const alt = S.filme.get("stationen"); if (alt) URL.revokeObjectURL(alt.url);
  S.filme.set("stationen", { ...r, vorschlag, url: URL.createObjectURL(r.blob), name: `${slug(S.projekt.titel)}-${vorschlag ? slug(VS.REZEPTE[vorschlag].name) : "stationen"}.${r.endung}` });
  status(`Film über ${liste.length} Stationen: ${r.bilder} Bilder (${sekunden(r.bilder / FPS)}), ${(r.blob.size / 1e6).toFixed(1)} MB, ${r.codec}${r.ton ? `, Ton ${r.ton}` : tonId ? ", ohne Ton (dieser Browser kodiert keinen)" : ""}.`);
}

// ---------- 4 · Protokoll ----------
function zeigeProtokoll() {
  const p = S.projekt;
  const ereignisse = [
    ...p.knoten.map((k) => ({ zeit: k.start, knoten: k })),
    ...p.entscheidungen.map((d) => ({ zeit: d.zeit, entscheidung: d })),
    ...p.ergebnisse.filter((e) => !e.knoten).map((e) => ({ zeit: e.erstellt, material: e })),
    ...p.meldungen.map((m) => ({ zeit: m.zeit, meldung: m })),
    ...(p.exporte ?? []).map((x) => ({ zeit: x.zeit, export: x })),
  ].sort((a, b) => a.zeit.localeCompare(b.zeit));
  ersetze($("ereignisse"), ...ereignisse.reverse().slice(0, 300).map((x) => {
    const zeit = el("time", { datetime: x.zeit, text: uhr(x.zeit) });
    if (x.material) return el("li", {}, zeit, el("span", {}, "Material: ", el("b", { text: x.material.titel })));
    if (x.meldung) return el("li", {}, zeit, el("span", { text: x.meldung.text }));
    if (x.export) return el("li", {}, zeit, el("span", { text: `Export: ${x.export.art === "stationen" ? `Film über ${x.export.stationen.length} Stationen, ${sekunden(x.export.partitur.dauer)}${x.export.ton ? `, Ton ${x.export.ton}` : ""}` : x.export.art === "wav" ? `${x.export.name} (${x.export.bits === "32f" ? "32 Bit Gleitkomma" : `${x.export.bits} Bit`}, ${x.export.rate} Hz)` : x.export.art}${x.export.codec ? ` (${x.export.codec})` : ""}` }),
      x.export.partitur ? el("details", {}, el("summary", { text: "Partitur" }), el("pre", { text: JSON.stringify({ partitur: x.export.partitur, zeitplan: x.export.zeitplan }, null, 2) })) : null);
    if (x.entscheidung) { const d = x.entscheidung; return el("li", {}, zeit, el("span", {}, artEtikett(d.art), ` ${d.gegenstand}: `, el("b", { text: d.gegenstand === "operation" ? opName(d.gewaehlt) : d.gegenstand === "variante" ? (P.ergebnis(p, d.gewaehlt)?.titel ?? d.gewaehlt) : d.gegenstand === "konstellation" ? (p.ergebnisse.find((x) => x.typ === "CONSTELLATION" && x.daten?.id === d.gewaehlt)?.titel ?? d.gewaehlt) : d.gegenstand === "stationen" ? `${d.gewaehlt.length} Stationen` : d.gewaehlt })),
      Object.keys(d.details ?? {}).length ? el("details", {}, el("summary", { text: "Einzelheiten" }), el("pre", { text: JSON.stringify(d.details, null, 2) })) : null); }
    const k = x.knoten;
    return el("li", {}, zeit, el("span", {}, el("b", { text: opName(k.operation) }), ` ${k.operationVersion} · ${k.status === "fertig" ? `${k.ausgaben.length} Ergebnis${k.ausgaben.length === 1 ? "" : "se"}, ${k.dauerMs} ms` : k.status}`),
      k.fehler ? el("span", { class: "fehler", text: k.fehler }) : null,
      el("details", {}, el("summary", { text: "Parameter und Protokoll" }), el("pre", { text: JSON.stringify({ parameter: k.parameter, variation: k.variation, startwert: k.seed, reproduzierbar: k.reproduzierbar, protokoll: k.protokoll }, null, 2) })));
  }));
  // Ketten (wie ein Combinator: ein Verlauf als wiederverwendbare Einheit)
  const e = aktuellesErgebnis(), hatVerlauf = Boolean(e?.knoten);
  const name = el("input", { type: "text", placeholder: "Name der Kette", "aria-label": "Name der Kette" });
  ersetze($("ketten"), el("h3", { text: "Ketten" }),
    el("div", { class: "aktionen" }, name, el("button", { class: "knopf klein", type: "button", disabled: !hatVerlauf, onclick: () => { P.ketteAusVerlauf(S.projekt, e.id, name.value.trim()); geaendert(); zeigeProtokoll(); status("Der Verlauf ist als Kette gespeichert."); }, text: "Verlauf speichern" })),
    p.ketten.length ? el("ul", {}, ...p.ketten.map((c) => el("li", {}, el("span", {}, el("b", { text: c.name }), ` · ${c.schritte.map((s) => opName(s.operation)).join(" → ")}`),
      el("button", { class: "knopf klein", type: "button", disabled: !e || e.typ !== "IMAGE" || Boolean(S.laeuft), onclick: () => ketteStarten(c), text: "anwenden" })))) : el("small", { text: "Noch keine Kette. Ein Verlauf lässt sich speichern und auf anderes Material anwenden." }));
  ersetze($("exporte"), el("h3", { text: "Projekt" }),
    el("small", { text: `${p.ergebnisse.length} Ergebnisse, ${p.knoten.length} Ausführungen, ${p.entscheidungen.length} Entscheidungen (${Object.keys(P.ENTSCHEIDUNGSARTEN).map((a) => `${ART_NAME[a]} ${p.entscheidungen.filter((d) => d.art === a).length}`).join(", ")}).` }),
    el("div", { class: "aktionen" }, el("button", { class: "knopf klein leise", type: "button", onclick: () => herunterladen(new Blob([P.serialisiere(p)], { type: "application/json" }), `${slug(p.titel)}-projekt.json`), text: "projekt.json" })));
}
async function ketteStarten(c) {
  await laufen(async () => {
    S.aktuell = await ketteAnwenden({ register: R, projekt: S.projekt, medien: S.medien, kette: c, start: S.aktuell, melden: status });
    S.ansicht = "nach"; document.querySelector('input[name="ansicht"][value="nach"]').checked = true;
    status(`Kette «${c.name}» angewandt.`);
  });
}

// ---------- Projekt speichern und öffnen ----------
function speichern() {
  S.projekt.titel = $("titel").value.trim() || "Ohne Titel";
  const bytes = packe(S.projekt, S.medien.dateien);
  herunterladen(new Blob([bytes], { type: "application/zip" }), `${slug(S.projekt.titel)}${ENDUNG}`);
  S.ungespeichert = false;
  status(`Gespeichert: ${slug(S.projekt.titel)}${ENDUNG} (${(bytes.length / 1e6).toFixed(1)} MB, ${S.medien.dateien.size} Mediendateien).`);
}
async function oeffnen(datei) {
  status(`${datei.name} wird geöffnet …`);
  try {
    const { projekt, medien, fehlt } = await entpacke(new Uint8Array(await datei.arrayBuffer()));
    projekt.exporte ??= [];
    S.projekt = projekt; S.medien.uebernehmen(medien); S.filme.clear(); S.tonspur.clear(); S.vergleich.clear(); S.knotenAnsicht = null; S.op = null; S.stationen = null; S.vorschlag = { ...S.vorschlag, messung: null, jev: null, regel: null, gewaehlt: null };
    const gewaehlt = [...projekt.knoten].reverse().find((k) => k.gewaehlt)?.gewaehlt;
    S.aktuell = gewaehlt ?? projekt.ergebnisse.filter((e) => e.typ === "IMAGE").at(-1)?.id ?? null;
    $("titel").value = projekt.titel; S.ungespeichert = false;
    status(`Geöffnet: «${projekt.titel}», ${projekt.ergebnisse.length} Ergebnisse, ${projekt.knoten.length} Ausführungen.${fehlt.length ? ` Es fehlen ${fehlt.length} Mediendateien.` : ""}`, null, fehlt.length > 0);
    alles();
  } catch (f) { status(`Das Projekt liess sich nicht öffnen: ${f.message}`, null, true); }
}

function alles() { zeigeMaterial(); zeigeVorschlag30(); zeigeOperationen(); zeigeBuehne(); zeigeProtokoll(); }

// ---------- Anschlüsse ----------
$("datei").addEventListener("change", (ev) => { const f = ev.target.files[0]; ev.target.value = ""; if (f) importiere(f); });
$("tondatei").addEventListener("change", (ev) => { const f = ev.target.files[0]; ev.target.value = ""; if (f) importiereTon(f); });
$("beispiel").addEventListener("click", async () => {
  const r = await fetch("../../alpha/the-fictory/beispiel.jpg");
  importiere(new File([await r.blob()], "beispiel.jpg (The Fictory)", { type: "image/jpeg" }));
});
const ablage = $("ablage");
ablage.addEventListener("dragover", (ev) => { ev.preventDefault(); ablage.classList.add("ziehen"); });
ablage.addEventListener("dragleave", () => ablage.classList.remove("ziehen"));
ablage.addEventListener("drop", (ev) => { ev.preventDefault(); ablage.classList.remove("ziehen"); const f = ev.dataTransfer.files[0]; if (f) importiere(f); });
$("op-form").addEventListener("submit", (ev) => { ev.preventDefault(); ausfuehren(); });
for (const r of document.querySelectorAll('input[name="modus"]')) r.addEventListener("change", (ev) => { S.modus = ev.target.value; S.projekt.modus = S.modus; S.wahl = null; zeigeOperationen(); });
for (const r of document.querySelectorAll('input[name="ansicht"]')) r.addEventListener("change", (ev) => { S.ansicht = ev.target.value; S.knotenAnsicht = null; zeigeBuehne(); });
$("speichern").addEventListener("click", speichern);
$("oeffnen").addEventListener("change", (ev) => { const f = ev.target.files[0]; ev.target.value = ""; if (f) oeffnen(f); });
$("neu").addEventListener("click", () => {
  if (S.ungespeichert && !confirm("Das aktuelle Projekt ist nicht gespeichert. Trotzdem neu beginnen?")) return;
  S.projekt = P.neuesProjekt({ modus: S.modus }); S.medien = browserMedien(); S.aktuell = null; S.op = null; S.filme.clear(); S.tonspur.clear(); S.knotenAnsicht = null; S.stationen = null; S.vorschlag = { ...S.vorschlag, messung: null, jev: null, regel: null, gewaehlt: null }; S.ungespeichert = false;
  $("titel").value = S.projekt.titel; status("Neues Projekt."); alles();
});
$("titel").addEventListener("change", (ev) => { S.projekt.titel = ev.target.value.trim() || "Ohne Titel"; geaendert(); });
addEventListener("beforeunload", (ev) => { if (S.ungespeichert) { ev.preventDefault(); ev.returnValue = ""; } });

alles();
status(`ORNAMENT LAB ${P.LAB_VERSION}: ${R.alle().length} Operationen im Register.`);
jevPruefen().then((z) => { if (!S.laeuft && letzterStatus[0]?.startsWith("ORNAMENT LAB")) status(`ORNAMENT LAB ${P.LAB_VERSION}: ${R.alle().length} Operationen im Register. jev live: ${z.bereit ? "bereit" : "nicht eingerichtet"}.`); zeigeVorschlaege(); });
