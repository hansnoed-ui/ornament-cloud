// ORNAMENT LAB 0.1 – Oberfläche. Vier Bereiche (Material, Operationen, Experiment, Protokoll), zwei Ansichten (Nebeneinander: Varianten
// und alternative Fortsetzungen; Nacheinander: Verlauf vom Material bis zum gewählten Zustand). Die Oberfläche hält nur Auswahlzustand;
// alles, was geschieht, steht im Projekt (kern/projekt.js) und wird von dort gezeichnet.
import { labRegister } from "./operationen/index.js";
import { browserMedien } from "./medien/browser.js";
import { videoAus, FPS } from "./medien/video.js";
import * as P from "./kern/projekt.js";
import { fuehreAus, bildfolge, regelVorschlaege, experiment, ketteAnwenden, neuerStartwert } from "./kern/ausfuehrung.js";
import { packe, entpacke, ENDUNG } from "./kern/archiv.js";
import { QUELLEN } from "./kern/modulation.js";
import { KLASSEN, standardParameter } from "./kern/register.js";
import { TYPEN } from "./kern/typen.js";
import { jevVerfuegbar, jevWahl } from "./jev/jev.js";
import { zip } from "../../alpha/the-fictory/zip.js?v=23";

const R = labRegister();
const $ = (id) => document.getElementById(id);
const S = {
  projekt: P.neuesProjekt(), medien: browserMedien(), aktuell: null, op: null, parameter: {}, eingaben: {}, seed: neuerStartwert(),
  variation: { anzahl: 6, achse: "varianten", ziel: "", quelle: "sinus", tiefe: 0.5, frequenz: 1, signal: "" },
  wahl: null, ansicht: "neben", modus: "manuell", laeuft: null, vergleich: new Set(), filme: new Map(), ungespeichert: false,
  experimentErlaubt: new Set(["lab.feedback", "lab.wiederholung", "lab.farbe", "lab.differenz"]), experimentSchritte: 3, experimentVarianten: 3,
};
globalThis.ornamentLab = S;   // für Browsertests und die Konsole

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
function zeigeMaterial() {
  const liste = $("materialien");
  ersetze(liste, ...S.projekt.ergebnisse.filter((e) => !e.knoten).map((e) => el("li", {},
    el("button", { type: "button", "aria-pressed": String(S.aktuell === e.id), title: e.titel, onclick: () => { S.aktuell = e.id; alles(); } },
      el("img", { src: S.medien.url(e), alt: e.titel })))));
}

// ---------- 2 · Operationen ----------
function zeigeAusgang() {
  const e = aktuellesErgebnis(), box = $("ausgang");
  if (!e) { ersetze(box, el("span", { class: "leer", text: "Noch kein Ausgang. Wähle ein Bild oder ziehe eine ORNA-Konstellation." })); return; }
  ersetze(box, e.typ === "IMAGE" ? el("img", { src: S.medien.url(e), alt: "" }) : null,
    el("div", {}, el("div", { text: "Ausgang" }), el("b", { text: e.titel }), " ", el("span", { class: "etikett", text: TYPEN[e.typ].name })));
}
function verfuegbareOperationen() {
  const e = aktuellesErgebnis();
  const ohneEingang = R.alle().filter((op) => !op.eingaenge.length);
  return [...ohneEingang, ...(e ? R.fuer(e.typ) : [])];
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
    S.variation.ziel = ["drehung", "farbdrehung", "zoom"].find((id) => zahlen.some((p) => p.id === id)) ?? zahlen[0]?.id ?? "";
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
function zeigeFormular() {
  const f = $("op-form");
  if (!S.op || S.modus === "experimentell") { f.hidden = true; f.replaceChildren(); return; }
  const op = R.hole(S.op), e = aktuellesErgebnis();
  f.hidden = false;
  const teile = [el("h3", { text: op.name }), el("p", { class: "beschreibung", text: op.beschreibung })];
  // weitere Eingänge (Konstellation, Vergleich)
  for (const ein of op.eingaenge.slice(1)) {
    const kandidaten = S.projekt.ergebnisse.filter((x) => x.typ === ein.typ && x.id !== S.aktuell);
    if (!(ein.name in S.eingaben)) S.eingaben[ein.name] = ein.optional ? (kandidaten.at(-1)?.id ?? "") : (kandidaten.at(-1)?.id ?? "");
    teile.push(el("label", { class: "regler" }, el("span", { text: `${ein.name === "konstellation" ? "Konstellation" : ein.name === "vergleich" ? "Vergleichen mit" : ein.name}${ein.optional ? " (optional)" : ""}` }),
      el("select", { onchange: (ev) => { S.eingaben[ein.name] = ev.target.value; } },
        ein.optional ? el("option", { value: "", text: "keine" }) : null,
        ...kandidaten.map((x) => el("option", { value: x.id, selected: S.eingaben[ein.name] === x.id, text: x.titel })))));
  }
  teile.push(...op.parameter.map((p) => regler(p, S.parameter[p.id], (v) => { S.parameter[p.id] = v; })));
  // Variation über Modulation (Nebeneinander) oder über die Zeit (Nacheinander)
  if (op.varianten === "moduliert") {
    const zahlen = op.parameter.filter((p) => p.art === "zahl");
    const signale = S.projekt.ergebnisse.filter((x) => x.typ === "CONTROL_SIGNAL");
    const v = S.variation;
    if (v.quelle === "signal" && !signale.some((s) => s.id === v.signal)) v.signal = signale.at(-1)?.id ?? "";
    const achsen = [{ wert: "varianten", name: "über die Varianten (Nebeneinander)" }, ...(op.verlauf ? [{ wert: "zeit", name: "über die Zeit (Nacheinander)" }, { wert: "beide", name: "beides" }] : [])];
    teile.push(el("fieldset", { class: "gruppe" }, el("legend", { text: "Variation und Modulation" }),
      regler({ id: "anzahl", name: "Varianten", art: "zahl", min: 1, max: P.GRENZEN.varianten, schritt: 1 }, v.anzahl, (x) => { v.anzahl = x; }),
      regler({ id: "ziel", name: "moduliert", art: "wahl", optionen: [{ wert: "", name: "nichts" }, ...zahlen.map((p) => ({ wert: p.id, name: p.name }))] }, v.ziel, (x) => { v.ziel = x; }),
      regler({ id: "quelle", name: "Quelle", art: "wahl", optionen: Object.entries(QUELLEN).filter(([k]) => k !== "keine" && (k !== "signal" || signale.length)).map(([k, n]) => ({ wert: k, name: n })) }, v.quelle, (x) => { v.quelle = x; zeigeFormular(); }),
      v.quelle === "signal" ? regler({ id: "signal", name: "Steuersignal", art: "wahl", optionen: signale.map((s) => ({ wert: s.id, name: s.titel })) }, v.signal, (x) => { v.signal = x; }) : null,
      regler({ id: "tiefe", name: "Tiefe (Attenuverter)", art: "zahl", min: -1, max: 1, schritt: 0.05 }, v.tiefe, (x) => { v.tiefe = x; }),
      v.quelle !== "signal" ? regler({ id: "frequenz", name: "Frequenz (Zyklen)", art: "zahl", min: 0.25, max: 4, schritt: 0.25 }, v.frequenz, (x) => { v.frequenz = x; }) : null,
      regler({ id: "achse", name: "Modulation wirkt", art: "wahl", optionen: achsen }, achsen.some((a) => a.wert === v.achse) ? v.achse : "varianten", (x) => { v.achse = x; })));
  }
  const kannLaufen = !op.eingaenge.length || (e && op.eingaenge.every((x, i) => i === 0 || x.optional || S.eingaben[x.name]));
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
  if (op.eingaenge.length) eingaben[op.eingaenge[0].name] = S.aktuell;
  for (const x of op.eingaenge.slice(1)) if (S.eingaben[x.name]) eingaben[x.name] = S.eingaben[x.name];
  const v = S.variation;
  const routen = op.varianten === "moduliert" && v.ziel ? [{ ziel: v.ziel, tiefe: v.tiefe, modulator: v.quelle === "signal" ? { quelle: "signal", ergebnis: v.signal } : { quelle: v.quelle, frequenz: v.frequenz, phase: 0, seed: S.seed, stufen: v.anzahl } }] : [];
  const wahl = S.wahl ?? { art: "mensch", details: { modus: S.modus } };
  const vorherigeKonstellation = S.projekt.ergebnisse.filter((x) => x.typ === "CONSTELLATION").at(-1)?.daten?.id ?? null;
  await laufen(async (signal) => {
    const { ergebnisse } = await fuehreAus({ register: R, projekt: S.projekt, medien: S.medien, abbrechen: signal, melden: status,
      auftrag: { operation: op.id, eingaben, parameter: S.parameter, seed: S.seed, variation: { anzahl: v.anzahl, achse: v.achse, routen }, wahl, vorherigeKonstellation } });
    S.wahl = null; S.seed = neuerStartwert(); S.vergleich.clear();
    // Konstellationen und Signale werden sofort Ausgang zweiter Wahl: der Bildausgang bleibt, sie stehen in den Eingängen bereit
    if (ergebnisse[0].typ === "IMAGE" || !S.aktuell) S.aktuell = ergebnisse[0].id;
    S.ansicht = "neben"; document.querySelector('input[name="ansicht"][value="neben"]').checked = true;
    S.knotenAnsicht = ergebnisse[0].knoten;
    status(`${op.name}: ${ergebnisse.length} Ergebnis${ergebnisse.length === 1 ? "" : "se"}. Wähle eine Variante, um weiterzuführen.`);
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

// jev-assistiert: feste Regeln immer, jev live nur wenn eingerichtet
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
      el("button", { class: "knopf klein", type: "button", disabled: !jevVerfuegbar(), onclick: jevFragen, text: "jev fragen" }),
      el("small", { text: jevVerfuegbar() ? "jev live: Wahrscheinlichkeiten für die nächste Operation" : "jev live ist nicht eingerichtet (docs/JEV-STATUS.md). Die Regeln oben sind keine jev-Urteile." })),
    S.jevAntwort ? el("ul", {}, ...Object.entries(S.jevAntwort.wahrscheinlichkeiten).sort((a, b) => b[1] - a[1]).map(([id, p]) => el("li", {},
      el("span", {}, artEtikett("jev"), " ", el("b", { text: opName(id) }), ` p = ${zahl(p)} `,
        el("button", { class: "knopf klein", type: "button", onclick: () => { S.wahl = { art: "jev", details: { modell: S.jevAntwort.modell, wahrscheinlichkeit: p, wahrscheinlichkeiten: S.jevAntwort.wahrscheinlichkeiten, lage: S.jevAntwort.lage } }; S.op = id; waehleOperationOhneZuruecksetzen(); }, text: "übernehmen" }))))) : null);
}
function waehleOperationOhneZuruecksetzen() { const w = S.wahl; waehleOperation(S.op); S.wahl = w; zeigeFormular(); }
async function jevFragen() {
  const e = aktuellesErgebnis();
  const optionen = R.fuer(e.typ).map((o) => o.id).slice(0, 6);
  const verlauf = P.verlauf(S.projekt, e.id).schritte.map((s) => s.knoten.operation);
  status("jev wird gefragt …");
  try { S.jevAntwort = await jevWahl({ verlauf, optionen }); status(`jev (${S.jevAntwort.modell}) hat geantwortet.`); }
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
function bildKarte(e, { gewaehlt = false, knoten = null } = {}) {
  const k = knoten ?? (e.knoten ? P.knoten(S.projekt, e.knoten) : null);
  const ziel = k?.variation?.routen?.[0]?.ziel;
  const werte = e.variante?.parameter && ziel ? `${R.hole(k.operation).parameter.find((p) => p.id === ziel)?.name}: ${zahl(e.variante.parameter[ziel])}` : e.befund?.kurz || (e.befund?.mittlereAbweichung !== undefined ? `mittlere Abweichung ${zahl(e.befund.mittlereAbweichung)}, verändert ${Math.round(e.befund.anteilVeraendert * 100)} %` : "");
  return el("div", { class: `karte${gewaehlt ? " gewaehlt" : ""}`, dataset: { ergebnis: e.id } },
    el("div", { class: "bild" }, el("img", { src: S.medien.url(e), alt: e.titel, loading: "lazy" })),
    el("div", { class: "titel", text: e.titel }),
    werte ? el("div", { class: "werte", text: werte }) : null,
    el("div", { class: "aktionen" },
      e.knoten ? el("button", { class: `knopf klein${gewaehlt ? " voll" : ""}`, type: "button", onclick: () => weiterfuehren(e.id), text: gewaehlt ? "gewählt" : "weiterführen" }) : null,
      el("button", { class: "knopf klein leise", type: "button", onclick: async () => herunterladen(new Blob([S.medien.dateien.get(e.datei)], { type: "image/png" }), `${slug(S.projekt.titel)}-${slug(e.titel)}.png`), text: "PNG" }),
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
    return el("div", { class: "signal" },
      svg(`<svg viewBox="0 0 100 44" preserveAspectRatio="none" role="img" aria-label="Steuersignal"><polyline points="${pts}" fill="none" stroke="#f4f1ea" stroke-width="0.6" vector-effect="non-scaling-stroke"/></svg>`),
      el("p", { class: "startwert", text: `${e.titel}: ${w.length} Werte 0–1. Als Modulationsquelle «Steuersignal» für jede Operation wählbar.` }));
  }
  return el("pre", { text: JSON.stringify(d, null, 2) });
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
  if (!k) {
    teile.push(el("div", { class: "knotenkopf" }, el("b", { text: e.titel }), el("span", { text: "Material" })), el("div", { class: "raster" }, bildKarte(e)));
  } else {
    const op = R.hole(k.operation), ausgaben = k.ausgaben.map((id) => P.ergebnis(S.projekt, id));
    const entsch = S.projekt.entscheidungen.filter((d) => d.knoten === k.id);
    teile.push(el("div", { class: "knotenkopf" }, el("b", { text: op.name }), el("span", { text: `${ausgaben.length} Ergebnis${ausgaben.length === 1 ? "" : "se"}` }),
      el("span", { class: "startwert", text: `Startwert ${k.seed}` }), ...entsch.map((d) => el("span", {}, artEtikett(d.art), ` ${d.gegenstand}`)),
      k.status === "fehler" ? el("span", { class: "fehler", text: k.fehler }) : null));
    const bilder = ausgaben.filter((x) => x.typ === "IMAGE"), andere = ausgaben.filter((x) => x.typ !== "IMAGE");
    if (bilder.length) teile.push(el("div", { class: "raster" }, ...bilder.map((x) => bildKarte(x, { gewaehlt: k.gewaehlt === x.id || S.aktuell === x.id, knoten: k }))));
    teile.push(...andere.map(textKarte));
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
  return [abw.length ? abw.join(" · ") : "Standardwerte", r ? `moduliert: ${op.parameter.find((p) => p.id === r.ziel)?.name} ← ${QUELLEN[r.modulator.quelle]} (Tiefe ${zahl(r.tiefe)}, ${k.variation.achse})` : null].filter(Boolean).join(" — ");
}
function nacheinander(e) {
  const { material, schritte } = P.verlauf(S.projekt, e.id);
  const liste = el("ol", { class: "verlauf" });
  if (material) liste.append(el("li", {}, el("div", { class: "bild" }, material.typ === "IMAGE" ? el("img", { src: S.medien.url(material), alt: material.titel }) : null),
    el("div", {}, el("div", { class: "schrittkopf" }, el("b", { text: "Material" }), el("span", { text: material.titel })),
      el("div", { class: "parameter", text: material.herkunft?.hinweis ?? "" }))));
  for (const [i, { knoten: k, ergebnis: x }] of schritte.entries()) {
    const entsch = S.projekt.entscheidungen.filter((d) => d.knoten === k.id);
    liste.append(el("li", {}, el("div", { class: "bild" }, el("img", { src: S.medien.url(x), alt: x.titel })),
      el("div", {},
        el("div", { class: "schrittkopf" }, el("b", { text: `${i + 1}. ${opName(k.operation)}` }), el("span", { text: x.titel }), ...entsch.map((d) => el("span", { title: JSON.stringify(d.details) }, artEtikett(d.art), ` ${d.gegenstand}`))),
        el("div", { class: "parameter", text: parameterText(k) }),
        el("div", { class: "parameter", text: `Startwert ${k.seed}, ${k.dauerMs ?? "?"} ms, Operation ${k.operation} ${k.operationVersion}` }),
        k.ausgaben.length > 1 ? el("div", { class: "geschwister" }, ...k.ausgaben.map((id) => P.ergebnis(S.projekt, id)).filter((y) => y.typ === "IMAGE").map((y) =>
          el("button", { type: "button", "aria-pressed": String(y.id === x.id), title: `${y.titel}: als Ausgang wählen`, onclick: () => weiterfuehren(y.id) }, el("img", { src: S.medien.url(y), alt: y.titel })))) : null)));
  }
  const film = S.filme.get(e.id);
  return el("div", {}, liste, schritte.length ? el("div", { class: "film" },
    el("div", { class: "aktionen" },
      el("button", { class: "knopf", type: "button", id: "animation", disabled: Boolean(S.laeuft), onclick: () => animation(e.id), text: "Animation des letzten Schritts" }),
      el("button", { class: "knopf leise", type: "button", onclick: () => verlaufExportieren(e.id), text: "Verlauf als ZIP" }),
      el("small", { text: "Die Operation rechnet ihren Verlauf mit denselben Parametern und demselben Startwert noch einmal." })),
    film ? el("video", { src: film.url, controls: true, loop: true, muted: true, playsinline: true }) : null,
    film ? el("div", { class: "aktionen" }, el("button", { class: "knopf klein", type: "button", onclick: () => herunterladen(film.blob, film.name), text: `${film.endung.toUpperCase()} speichern` }), el("small", { text: `${film.bilder} Bilder, ${film.breite} × ${film.hoehe}, ${film.codec}` })) : null) : null);
}
async function animation(id) {
  await laufen(async (signal) => {
    const e = P.ergebnis(S.projekt, id);
    status("Animation wird gerechnet …", 0);
    const r = await videoAus(bildfolge({ register: R, projekt: S.projekt, medien: S.medien, ergebnisId: id, abbrechen: signal }), { melden: status });
    const name = `medien/${id}-animation.${r.endung}`;
    const bytes = new Uint8Array(await r.blob.arrayBuffer());
    const abgelegt = await S.medien.ablegenDatei(name, bytes, r.mime);
    S.projekt.exporte.push({ id: P.neueId("x"), art: "animation", ergebnis: id, datei: name, mime: r.mime, codec: r.codec, bilder: r.bilder, fps: FPS, breite: r.breite, hoehe: r.hoehe, sha256: abgelegt.sha256, zeit: new Date().toISOString() });
    S.filme.set(id, { ...r, url: URL.createObjectURL(r.blob), name: `${slug(S.projekt.titel)}-${slug(e.titel)}.${r.endung}` });
    status(`Animation: ${r.bilder} Bilder (${(r.bilder / FPS).toFixed(1)} s), ${(r.blob.size / 1e6).toFixed(1)} MB, ${r.codec}.`);
  });
}
function verlaufExportieren(id) {
  const { material, schritte } = P.verlauf(S.projekt, id);
  const dateien = [];
  const nimm = (e, name) => { const b = S.medien.dateien.get(e.datei); if (b) dateien.push({ name, bytes: b }); };
  if (material) nimm(material, `00-material.png`);
  schritte.forEach(({ knoten: k, ergebnis: e }, i) => nimm(e, `${String(i + 1).padStart(2, "0")}-${slug(opName(k.operation))}.png`));
  const protokoll = { lab: P.LAB_VERSION, projekt: S.projekt.id, titel: S.projekt.titel, exportiert: new Date().toISOString(), material: material?.titel,
    schritte: schritte.map(({ knoten: k, ergebnis: e }) => ({ operation: k.operation, version: k.operationVersion, parameter: e.variante?.parameter ?? k.parameter, startwert: e.variante?.seed ?? k.seed, ergebnis: e.titel,
      entscheidungen: S.projekt.entscheidungen.filter((d) => d.knoten === k.id).map(({ art, gegenstand, gewaehlt, details }) => ({ art, gegenstand, gewaehlt, details })) })) };
  dateien.push({ name: "verlauf.json", bytes: new TextEncoder().encode(JSON.stringify(protokoll, null, 2)) });
  herunterladen(new Blob([zip(dateien)], { type: "application/zip" }), `${slug(S.projekt.titel)}-verlauf.zip`);
  S.projekt.exporte.push({ id: P.neueId("x"), art: "verlauf", ergebnis: id, dateien: dateien.map((d) => d.name), zeit: new Date().toISOString() });
  zeigeProtokoll();
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
    if (x.export) return el("li", {}, zeit, el("span", { text: `Export: ${x.export.art}${x.export.codec ? ` (${x.export.codec})` : ""}` }));
    if (x.entscheidung) { const d = x.entscheidung; return el("li", {}, zeit, el("span", {}, artEtikett(d.art), ` ${d.gegenstand}: `, el("b", { text: d.gegenstand === "operation" ? opName(d.gewaehlt) : d.gegenstand === "variante" ? (P.ergebnis(p, d.gewaehlt)?.titel ?? d.gewaehlt) : d.gegenstand === "konstellation" ? (p.ergebnisse.find((x) => x.typ === "CONSTELLATION" && x.daten?.id === d.gewaehlt)?.titel ?? d.gewaehlt) : d.gewaehlt })),
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
    S.projekt = projekt; S.medien.uebernehmen(medien); S.filme.clear(); S.vergleich.clear(); S.knotenAnsicht = null; S.op = null;
    const gewaehlt = [...projekt.knoten].reverse().find((k) => k.gewaehlt)?.gewaehlt;
    S.aktuell = gewaehlt ?? projekt.ergebnisse.filter((e) => e.typ === "IMAGE").at(-1)?.id ?? null;
    $("titel").value = projekt.titel; S.ungespeichert = false;
    status(`Geöffnet: «${projekt.titel}», ${projekt.ergebnisse.length} Ergebnisse, ${projekt.knoten.length} Ausführungen.${fehlt.length ? ` Es fehlen ${fehlt.length} Mediendateien.` : ""}`, null, fehlt.length > 0);
    alles();
  } catch (f) { status(`Das Projekt liess sich nicht öffnen: ${f.message}`, null, true); }
}

function alles() { zeigeMaterial(); zeigeOperationen(); zeigeBuehne(); zeigeProtokoll(); }

// ---------- Anschlüsse ----------
$("datei").addEventListener("change", (ev) => { const f = ev.target.files[0]; ev.target.value = ""; if (f) importiere(f); });
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
  S.projekt = P.neuesProjekt({ modus: S.modus }); S.medien = browserMedien(); S.aktuell = null; S.op = null; S.filme.clear(); S.knotenAnsicht = null; S.ungespeichert = false;
  $("titel").value = S.projekt.titel; status("Neues Projekt."); alles();
});
$("titel").addEventListener("change", (ev) => { S.projekt.titel = ev.target.value.trim() || "Ohne Titel"; geaendert(); });
addEventListener("beforeunload", (ev) => { if (S.ungespeichert) { ev.preventDefault(); ev.returnValue = ""; } });

alles();
status(`ORNAMENT LAB ${P.LAB_VERSION}: ${R.alle().length} Operationen im Register. jev live: ${jevVerfuegbar() ? "eingerichtet" : "nicht eingerichtet"}.`);
