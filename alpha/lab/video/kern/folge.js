// ORNAMENT LAB · Video – das Modell des Editors, ohne DOM. Ein Projekt hat drei Teile, wie man schneidet:
//   folge  die Bildfolge: Videos und Bilder hintereinander, jedes mit Zuschnitt, Tempo, Lautstärke, Filter, Bildausschnitt und dem
//          Übergang zum nächsten (Schnitt, Blende, Schwarzblende). Löschen und Umstellen schliessen die Lücke (wie eine magnetische Zeitleiste).
//   titel  Titel und Texte frei über der Folge (Beginn und Dauer).
//   ton    Musik und Klänge frei unter der Folge (Beginn, Zuschnitt, Lautstärke, Ein- und Ausblenden).
// Daraus rechnet zuFilm() einen Film im Format von OpenFilm (film.html, vendor/openfilm-0.2.6/film-doc.js): die Bildfolge abwechselnd auf
// zwei Spuren (eine Blende ist die obere, die sich ein- oder ausblendet, während die untere schon spielt), Titel als Seiten mit frame(t),
// Ton auf eigenen Spuren. Vorschau und Export zeichnen diesen Film, so ist zu sehen, was OpenFilm Studio auch zeigen würde.
import { readFilm, filmHtml, clipSpan, fadeGain, clipFade, kindOf } from "../../../../vendor/openfilm-0.2.6/film-doc.js";
import { filterCss } from "./filter.js";
import { titelSeite, TITEL_STANDARD } from "./titel.js";
import { effekteVon, hatBewegung, bewegung, glitchBei, ueberlagerungSeite, same, EFFEKT_STANDARD } from "./effekte.js";

export const VERSION = "0.3.0";
export const FORMATE = Object.freeze({
  "16:9": { w: 1920, h: 1080, name: "16:9 quer (Video)" },
  "9:16": { w: 1080, h: 1920, name: "9:16 hoch (Reels, Stories)" },
  "1:1": { w: 1080, h: 1080, name: "1:1 quadratisch" },
  "4:5": { w: 1080, h: 1350, name: "4:5 hoch (Instagram)" },
});
export const UEBERGAENGE = Object.freeze({
  schnitt: "Schnitt", blende: "Überblendung", schwarz: "Schwarzblende", weiss: "Weissblende",
});
export const BILD_DAUER = 4;      // so lange steht ein Bild, wenn es in die Folge kommt
export const KUERZESTE = 0.1;     // kein Clip wird kürzer
const ms = (s) => Math.round(s * 1000) / 1000 || 0;
const neueId = (art, belegt) => { let i = 1; while (belegt.has(`${art}-${i}`)) i++; return `${art}-${i}`; };
const alleIds = (p) => new Set([...p.folge, ...p.titel, ...p.ton].map((c) => c.id));

/** ein leeres Projekt; «name» ist der Name des Films, «titel» sind seine Titel und Texte */
export function neuesProjekt({ name = "Film", format = "16:9" } = {}) {
  return { art: "ornament-video", version: VERSION, name, format, medien: {}, folge: [], titel: [], ton: [], marken: [], stellen: [], bereich: null };
}

/** ein geladenes Projekt prüfen und auf den Stand bringen; wirft mit allen Mängeln */
export function normieren(p) {
  const f = [];
  if (p?.art !== "ornament-video") f.push("kein Video-Projekt");
  if (!FORMATE[p?.format]) f.push(`unbekanntes Format ${p?.format}`);
  for (const k of ["folge", "titel", "ton"]) if (!Array.isArray(p?.[k])) f.push(`${k} fehlt`);
  if (f.length) throw new Error(`Projekt: ${f.join("; ")}`);
  p.name ??= "Film";
  for (const c of p.folge) { c.tempo ??= 1; c.lautstaerke ??= 1; c.passen ??= "fuellen"; c.zoom ??= 1; c.x ??= 0; c.y ??= 0; c.filter ??= {}; c.uebergang ??= { art: "schnitt", dauer: 0.5 }; c.effekte = { ...EFFEKT_STANDARD, ...(c.effekte ?? {}) }; }
  p.marken ??= []; p.stellen ??= []; p.bereich ??= null;
  for (const t of p.titel) Object.assign(t, { ...TITEL_STANDARD, ...t });
  for (const t of p.ton) { t.lautstaerke ??= 1; t.einblenden ??= 0; t.ausblenden ??= 0; }
  return p;
}

// ---------- Medien ----------
/** ein Medium aufnehmen: { name, art: video|bild|ton, dauer (s, nicht bei Bildern), breite, hoehe, ton (hat ein Video Ton?) }; gibt die Id */
export function mediumAufnehmen(p, { name, art, dauer = null, breite = null, hoehe = null, ton = false, endung }) {
  if (!["video", "bild", "ton"].includes(art)) throw new Error(`unbekannte Art ${art}`);
  const belegt = new Set(Object.keys(p.medien));
  const stamm = (name.replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || art).slice(0, 40);
  let id = stamm, i = 2;
  while (belegt.has(id)) id = `${stamm}-${i++}`;
  const e = (endung ?? name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "") || (art === "bild" ? "png" : art === "ton" ? "wav" : "mp4");
  p.medien[id] = { id, name, art, datei: `assets/${id}.${e}`, dauer, breite, hoehe, ton };
  return id;
}

// ---------- Längen und Zeitplan ----------
export const clipLaenge = (c) => Math.max(KUERZESTE, (c.aus - c.ein) / (c.tempo || 1));
/** die wirksame Dauer eines Übergangs zwischen a und b: höchstens ein Drittel des kürzeren */
function uebergangsDauer(a, b) {
  const u = a.uebergang ?? { art: "schnitt" };
  if (!b || u.art === "schnitt") return 0;
  return ms(Math.max(0, Math.min(u.dauer ?? 0.5, clipLaenge(a) / 3, clipLaenge(b) / 3)));
}

/**
 * Wo jeder Clip der Folge liegt: [{ c, at, laenge, spur (0 unten, 1 oben), fade: [ein, aus] }] und die Gesamtdauer. Die Clips liegen
 * abwechselnd auf zwei Spuren. Eine Blende überlappt zwei Clips um ihre Dauer, und der obere der beiden blendet: ist es der spätere, blendet
 * er sich ein, ist es der frühere, blendet er aus (so ist es in beiden Fällen dieselbe Überblendung). Eine Schwarz- oder Weissblende
 * überlappt nicht: der eine blendet aus, der andere ein, je die halbe Dauer.
 */
export function zeitplan(p) {
  const out = [];
  let t = 0;
  p.folge.forEach((c, i) => {
    const vor = p.folge[i - 1], dv = vor ? uebergangsDauer(vor, c) : 0, dn = uebergangsDauer(c, p.folge[i + 1]);
    const artV = vor?.uebergang?.art, artN = c.uebergang?.art, laenge = ms(clipLaenge(c)), spur = i % 2;
    if (artV === "blende") t -= dv;
    const fade = [artV === "blende" ? (spur === 1 ? dv : 0) : artV === "schwarz" || artV === "weiss" ? dv / 2 : 0,
      artN === "blende" ? (spur === 1 ? dn : 0) : artN === "schwarz" || artN === "weiss" ? dn / 2 : 0];
    out.push({ c, i, at: ms(Math.max(0, t)), laenge, spur, fade: fade.map(ms) });
    t += laenge;
  });
  return { clips: out, dauer: ms(Math.max(t, ...p.titel.map((x) => x.at + x.dauer), ...p.ton.map((x) => x.at + (x.aus - x.ein)), 0)) };
}
export const dauer = (p) => zeitplan(p).dauer;

/** der Clip der Folge, der bei t zu sehen ist (in einer Blende der spätere), mit seiner Stelle im Plan; null zwischen Clips oder danach */
export function folgeBei(p, t) {
  const z = zeitplan(p).clips.filter((x) => t >= x.at - 1e-9 && t < x.at + x.laenge - 1e-9);
  return z.at(-1) ?? null;
}

// ---------- Bearbeiten: Folge ----------
/** ein Medium an die Folge hängen (oder an der Stelle «index» einfügen); ganze Länge, Bilder BILD_DAUER s */
export function inFolge(p, medium, index = p.folge.length) {
  const m = p.medien[medium];
  if (!m || m.art === "ton") throw new Error("In die Bildfolge kommen Videos und Bilder");
  const c = { id: neueId("clip", alleIds(p)), medium, ein: 0, aus: m.art === "bild" ? BILD_DAUER : ms(m.dauer), tempo: 1, lautstaerke: 1, passen: "fuellen", zoom: 1, x: 0, y: 0, filter: {}, uebergang: { art: "schnitt", dauer: 0.5 },
    // ein Bild bekommt eine langsame Fahrt hinein (Ken Burns), damit es nicht stillsteht
    effekte: { ...EFFEKT_STANDARD, ...(m.art === "bild" ? { kenburns: "hinein", kbStaerke: 0.12 } : {}) } };
  p.folge.splice(Math.max(0, Math.min(p.folge.length, index)), 0, c);
  return c.id;
}

/**
 * Einen Clip an der Filmzeit t teilen; gibt die Id des zweiten Teils (null, wenn t zu nah am Rand oder ausserhalb liegt). In der Folge endet
 * der erste Teil mit einem Schnitt, der zweite übernimmt den Übergang; ein Titel wird zu zwei Titeln mit demselben Text, ein Ton zu zwei
 * Ausschnitten derselben Datei (das zweite Einblenden und das erste Ausblenden fallen weg).
 */
export function teilen(p, id, t) {
  const frei = p.titel.find((x) => x.id === id) ?? p.ton.find((x) => x.id === id);
  if (frei) {
    const istTon = "medium" in frei, laenge = istTon ? frei.aus - frei.ein : frei.dauer, lokal = t - frei.at;
    if (lokal < KUERZESTE || laenge - lokal < KUERZESTE) return null;
    const b = { ...structuredClone(frei), id: neueId(istTon ? "ton" : "titel", alleIds(p)), at: ms(t) };
    if (istTon) { b.ein = ms(frei.ein + lokal); b.einblenden = 0; frei.aus = b.ein; frei.ausblenden = 0; }
    else { b.dauer = ms(laenge - lokal); frei.dauer = ms(lokal); }
    p[istTon ? "ton" : "titel"].push(b);
    return b.id;
  }
  const plan = zeitplan(p).clips, x = plan.find((y) => y.c.id === id);
  if (!x) throw new Error(`Clip ${id} fehlt`);
  const lokal = t - x.at;
  if (lokal < KUERZESTE || x.laenge - lokal < KUERZESTE) return null;   // zu nah am Rand
  const c = x.c, stelle = ms(c.ein + lokal * c.tempo);
  const b = { ...structuredClone(c), id: neueId("clip", alleIds(p)), ein: stelle };
  c.aus = stelle; c.uebergang = { art: "schnitt", dauer: c.uebergang.dauer };
  p.folge.splice(x.i + 1, 0, b);
  return b.id;
}

/** Anfang («ein») oder Ende («aus») eines Clips der Folge auf eine Stelle der Quelle setzen, begrenzt auf die Datei und KUERZESTE */
export function trimmen(p, id, seite, stelle) {
  const c = p.folge.find((x) => x.id === id) ?? p.ton.find((x) => x.id === id);
  if (!c) throw new Error(`Clip ${id} fehlt`);
  const m = p.medien[c.medium], ende = m.art === "bild" ? 3600 : m.dauer, min = KUERZESTE * (c.tempo ?? 1);
  if (seite === "ein") c.ein = ms(Math.max(0, Math.min(stelle, c.aus - min)));
  else c.aus = ms(Math.min(ende, Math.max(stelle, c.ein + min)));
  return c;
}

export function verschieben(p, id, index) {
  const i = p.folge.findIndex((x) => x.id === id);
  if (i < 0) return;
  const [c] = p.folge.splice(i, 1);
  p.folge.splice(Math.max(0, Math.min(p.folge.length, index)), 0, c);
}

export function entfernen(p, id) {
  for (const k of ["folge", "titel", "ton"]) { const i = p[k].findIndex((x) => x.id === id); if (i >= 0) { p[k].splice(i, 1); return k; } }
  return null;
}

/** einen Clip (Folge, Titel oder Ton) finden: { c, bereich } */
export function finde(p, id) {
  for (const k of ["folge", "titel", "ton"]) { const c = p[k].find((x) => x.id === id); if (c) return { c, bereich: k }; }
  return null;
}

// ---------- Bearbeiten: Titel und Ton ----------
export function titelHinzu(p, { at = 0, dauer = 3, ...rest } = {}) {
  const t = { ...TITEL_STANDARD, ...rest, id: neueId("titel", alleIds(p)), at: ms(Math.max(0, at)), dauer: ms(Math.max(KUERZESTE, dauer)) };
  p.titel.push(t);
  return t.id;
}
export function tonHinzu(p, medium, at = 0) {
  const m = p.medien[medium];
  if (!m || (m.art !== "ton" && !(m.art === "video" && m.ton))) throw new Error("Unter die Folge kommen Töne (oder der Ton eines Videos)");
  const t = { id: neueId("ton", alleIds(p)), medium, at: ms(Math.max(0, at)), ein: 0, aus: ms(m.dauer), lautstaerke: 1, einblenden: 0, ausblenden: 0 };
  p.ton.push(t);
  return t.id;
}

// ---------- Einrasten ----------
/** Stellen, an denen Ränder einrasten: Anfang, Ende jedes Clips, Titel und Tons, der Abspielkopf und Marken (etwa der Takt der Musik) */
export function rastStellen(p, { kopf = null, marken = [], ausser = null } = {}) {
  const s = new Set([0]);
  for (const x of zeitplan(p).clips) if (x.c.id !== ausser) { s.add(x.at); s.add(ms(x.at + x.laenge)); }
  for (const x of p.titel) if (x.id !== ausser) { s.add(x.at); s.add(ms(x.at + x.dauer)); }
  for (const x of p.ton) if (x.id !== ausser) { s.add(x.at); s.add(ms(x.at + x.aus - x.ein)); }
  if (kopf !== null) s.add(ms(kopf));
  for (const m of marken) s.add(ms(m));
  for (const x of p.stellen ?? []) s.add(ms(x.t));
  if (p.bereich) { s.add(ms(p.bereich.von)); s.add(ms(p.bereich.bis)); }
  return [...s].sort((a, b) => a - b);
}
/** t auf die nächste Stelle ziehen, wenn sie näher als «fang» liegt */
export function einrasten(t, stellen, fang) {
  let best = t, d = fang;
  for (const s of stellen) { const e = Math.abs(s - t); if (e < d) { d = e; best = s; } }
  return best;
}

// ---------- Markieren (seit Video 0.3): Marken (Stellen) und ein Bereich ----------
// Eine Marke ist eine benannte Stelle im Film, der Bereich ein Abschnitt von … bis. Beide gehören zum Projekt (rückgängig zu machen, gespeichert)
// und rasten ein. Was einer Stelle oder einem Bereich zugeordnet wird (Schnitt, Übergang, Effekt, Filter, Titel), geschieht an den Clips der
// Folge: sie werden an den Rändern geteilt, und was dazwischen liegt, bekommt die Zuordnung. So gilt sie genau dort, und der Film bleibt ein
// gewöhnlicher Film (auch in OpenFilm).
const EPS = 0.02;
export function markeSetzen(p, t, name = "") {
  p.stellen ??= [];
  const id = neueId("marke", new Set(p.stellen.map((x) => x.id)));
  p.stellen.push({ id, t: ms(Math.max(0, t)), name: name || `Marke ${p.stellen.length + 1}` });
  p.stellen.sort((a, b) => a.t - b.t);
  return id;
}
export function markeEntfernen(p, id) { p.stellen = (p.stellen ?? []).filter((x) => x.id !== id); }
/** den Bereich setzen; ein Rand allein (von oder bis) ergänzt den anderen bis zum Ende oder Anfang des Films; null hebt ihn auf */
export function bereichSetzen(p, { von = p.bereich?.von ?? 0, bis = p.bereich?.bis ?? dauer(p) } = {}) {
  const a = ms(Math.max(0, Math.min(von, bis))), b = ms(Math.max(von, bis));
  p.bereich = b - a >= KUERZESTE ? { von: a, bis: b } : null;
  return p.bereich;
}

/**
 * Die Kerne der Clips der Folge: wo jeder für sich steht. In einer Überblendung liegt die Kante in ihrer Mitte. [{ c, von, bis, at, laenge }]
 */
export function kerne(p) {
  const plan = zeitplan(p).clips;
  return plan.map((x, i) => {
    const vor = plan[i - 1], nach = plan[i + 1], ende = x.at + x.laenge;
    const von = vor && vor.at + vor.laenge > x.at ? (x.at + vor.at + vor.laenge) / 2 : x.at;
    const bis = nach && nach.at < ende ? (ende + nach.at) / 2 : ende;
    return { ...x, von: ms(von), bis: ms(bis) };
  });
}
/**
 * Die Clips der Folge an den Filmzeiten teilen: wo genau ein Clip die Zeit überdeckt und sie nicht nahe seinem Rand liegt. Liegt eine Zeit in
 * einer Überblendung, ist dort schon eine Kante: geteilt wird nicht. Gibt die Zahl der neuen Schnitte.
 */
export function schneidenAn(p, zeiten) {
  let n = 0;
  for (const t of [...new Set(zeiten.map(ms))].sort((a, b) => a - b)) {
    const ueber = zeitplan(p).clips.filter((y) => t > y.at - EPS && t < y.at + y.laenge + EPS);
    if (ueber.length !== 1) continue;
    const x = ueber[0];
    if (t > x.at + EPS && t < x.at + x.laenge - EPS && teilen(p, x.c.id, t)) n++;
  }
  return n;
}
/** die Clips der Folge, deren Kern ganz im Abschnitt liegt (nach dem Teilen an seinen Rändern) */
export function clipsIm(p, von, bis) {
  return kerne(p).filter((x) => x.von >= von - EPS && x.bis <= bis + EPS).map((x) => x.c);
}
/** im Abschnitt: an den Rändern teilen, dann fn(clip) für jeden Clip darin; gibt die Clips */
export function imBereich(p, von, bis, fn) {
  schneidenAn(p, [von, bis]);
  const cs = clipsIm(p, von, bis);
  for (const c of cs) fn(c);
  return cs;
}
/**
 * Einen Übergang an die Filmzeit t legen: dort schneiden (falls nötig) und dem Clip, der an t endet, den Übergang geben. Gibt den Clip oder
 * null (an t endet kein Clip, etwa am Ende des Films).
 */
export function uebergangAn(p, t, art, d = 0.5) {
  if (!UEBERGAENGE[art]) throw new Error(`unbekannter Übergang ${art}`);
  schneidenAn(p, [t]);
  const plan = kerne(p);
  // der Clip, dessen Kern an t endet, oder in dessen Überblendung mit dem nächsten t liegt
  const x = plan.find((y, i) => plan[i + 1] && (Math.abs(y.bis - t) < EPS || (t >= plan[i + 1].at - EPS && t <= y.at + y.laenge + EPS)));
  if (!x) return null;
  x.c.uebergang = { art, dauer: ms(d) };
  return x.c;
}
/** den Abschnitt aus der Folge herausschneiden (die Lücke schliesst sich); Titel und Töne bleiben, wo sie sind */
export function herausschneiden(p, von, bis) {
  const cs = imBereich(p, von, bis, () => {});
  p.folge = p.folge.filter((c) => !cs.includes(c));
  return cs.length;
}

// ---------- OpenFilm ----------
/** Spuren für frei liegende Clips: so wenige wie möglich, ohne Überlappung in einer Spur (der früheste freie Platz) */
function spurenVerteilen(clips, anfang, ende) {
  const spuren = [];
  for (const c of [...clips].sort((a, b) => anfang(a) - anfang(b))) {
    let s = spuren.find((x) => x.ende <= anfang(c) + 1e-3);
    if (!s) spuren.push((s = { ende: 0, clips: [] }));
    s.clips.push(c); s.ende = ende(c);
  }
  return spuren.map((s) => s.clips);
}

/** der Bildausschnitt eines Clips der Folge als Kasten auf der Bühne (OpenFilm: left, top, width, height) */
export function kasten(c, buehne) {
  const z = Math.max(1, c.zoom ?? 1), w = buehne.w * z, h = buehne.h * z;
  return { x: ms((buehne.w - w) / 2 + (c.x ?? 0) * buehne.w), y: ms((buehne.h - h) / 2 + (c.y ?? 0) * buehne.h), w: ms(w), h: ms(h) };
}

/**
 * Das Projekt als OpenFilm-Film: { value, seiten } — value für filmHtml() (film-doc.js), seiten: { "titel/titel-1.html": html } die Seiten
 * der Titel. Spuren von oben: die Titel, eine Spur für die Farbe der Weissblenden, die Bildfolge (die obere, die untere), der Ton.
 */
export function zuFilm(p) {
  const buehne = FORMATE[p.format], plan = zeitplan(p);
  const bild = [[], []], weiss = [], ueber = [], seiten = {};
  const fadeOv = (f) => (f[0] > 0 || f[1] > 0 ? { overrides: [{ fade: f.map(ms) }] } : {});
  for (const x of plan.clips) {
    const c = x.c, m = p.medien[c.medium], e = effekteVon(c);
    const stil = [`object-fit: ${c.passen === "einpassen" ? "contain" : "cover"}`, filterCss(c.filter)].filter(Boolean).join("; ");
    // Bewegung kann film.html nicht sagen: sie steht beim Clip als data-ornament-effekte (OpenFilm behält data-*, Studio zeigt den Clip ruhig)
    const bewegt = hatBewegung(e) ? { attrs: { "data-ornament-effekte": JSON.stringify(Object.fromEntries(["kenburns", "kbStaerke", "wackeln", "puls", "pulsBpm", "glitch"].map((k) => [k, e[k]]))) } } : {};
    const gemeinsam = { id: c.id, src: m.datei, at: x.at, box: kasten(c, buehne), style: stil, ...fadeOv(x.fade), ...bewegt };
    // Korn und Kratzer, Lichtlecks: Seiten über dem Clip, gemischt mit mix-blend-mode, mit denselben Blenden
    for (const [art, an, mischung] of [["korn", e.korn > 0 || e.kratzer > 0, "overlay"], ["licht", e.licht > 0, "screen"]]) {
      if (!an) continue;
      seiten[`effekt/${art}-${c.id}.html`] = ueberlagerungSeite(art, { korn: e.korn, kratzer: e.kratzer, licht: e.licht, same: same(c.id) }, buehne);
      ueber.push({ id: `${art}-${c.id}`, src: `effekt/${art}-${c.id}.html`, at: x.at, time: [0, x.laenge], style: `mix-blend-mode: ${mischung}`, ...fadeOv(x.fade) });
    }
    bild[x.spur].push(m.art === "bild" ? { ...gemeinsam, time: [0, x.laenge] }
      : { ...gemeinsam, time: [ms(c.ein), ms(c.aus)], ...(c.tempo !== 1 ? { speed: c.tempo } : {}), ...(c.lautstaerke !== 1 ? { volume: ms(c.lautstaerke) } : {}) });
  }
  // Weissblende: ein weisses Feld unter der Folge zwischen den beiden Clips (die Folge blendet aus und ein, darunter scheint es)
  plan.clips.forEach((x, i) => {
    if (x.c.uebergang?.art !== "weiss" || !plan.clips[i + 1] || !x.fade[1]) return;
    weiss.push({ id: `weiss-${x.c.id}`, src: "titel/weiss.html", at: ms(x.at + x.laenge - x.fade[1]), time: [0, ms(x.fade[1] + plan.clips[i + 1].fade[0])] });
  });
  const titelSpuren = spurenVerteilen(p.titel, (t) => t.at, (t) => t.at + t.dauer).map((s) => ({ clips: s.map((t) => {
    seiten[`titel/${t.id}.html`] = titelSeite(t, buehne);
    return { id: t.id, src: `titel/${t.id}.html`, at: ms(t.at), time: [0, ms(t.dauer)] };
  }) }));
  if (weiss.length) seiten["titel/weiss.html"] = titelSeite({ ...TITEL_STANDARD, text: "", band: "voll", bandFarbe: "#ffffff", bandDeckkraft: 1, animation: "keine" }, buehne);
  const tonSpuren = spurenVerteilen(p.ton, (t) => t.at, (t) => t.at + t.aus - t.ein).map((s) => ({ clips: s.map((t) => ({
    id: t.id, src: p.medien[t.medium].datei, ...(p.medien[t.medium].art === "video" ? { sound: true } : {}), at: ms(t.at), time: [ms(t.ein), ms(t.aus)],
    ...(t.lautstaerke !== 1 ? { volume: ms(t.lautstaerke) } : {}), ...fadeOv([t.einblenden, t.ausblenden]),
  })) }));
  // in OpenFilm liegt die erste Spur oben: Titel, Überlagerungen (Korn, Licht), die obere und die untere Spur der Folge, Weiss (unter der
  // Folge, darum nach ihr), Ton
  const ueberSpuren = spurenVerteilen(ueber, (u) => u.at, (u) => u.at + u.time[1]).map((clips) => ({ clips }));
  const tracks = [...titelSpuren, ...ueberSpuren, ...[bild[1], bild[0]].filter((s) => s.length).map((clips) => ({ clips })), ...(weiss.length ? [{ clips: weiss }] : []), ...tonSpuren];
  return { value: { stage: { w: buehne.w, h: buehne.h }, tracks: tracks.length ? tracks : [{ clips: [] }] }, seiten };
}

/** zuFilm(), geprüft mit dem Leser von OpenFilm; wirft, wenn er etwas beanstandet */
export function film(p) {
  const f = zuFilm(p), r = readFilm(structuredClone(f.value));
  if (r.problems.length) throw new Error(`OpenFilm beanstandet den Film: ${r.problems.join(" ")}`);
  return { ...f, doc: r.doc, html: filmHtml(f.value) };
}

/**
 * Was bei t zu zeichnen ist, von unten nach oben: [{ art: video|bild|titel|weiss, clip, medium, quelle (Sekunde in der Datei), deckkraft,
 * kasten, stil }]. Gerechnet aus dem OpenFilm-Film (clipSpan, fadeGain von film-doc.js), damit Vorschau und Export ihm genau folgen.
 */
export function bildBei(p, doc, t) {
  const quelleVon = new Map(Object.values(p.medien).map((m) => [m.datei, m])), titel = new Map(p.titel.map((x) => [x.id, x])), folge = new Map(p.folge.map((x) => [x.id, x]));
  const out = [];
  for (const spur of [...doc.tracks].reverse()) {
    if (spur.hidden) continue;
    for (const c of spur.clips) {
      const art = kindOf(c);
      if (art === "sound") continue;
      const m = quelleVon.get(c.src), span = clipSpan(c, m?.dauer ?? NaN, c.id), lokal = t - (c.at ?? 0);
      if (lokal < 0 || lokal >= span.length - 1e-9) continue;
      const deckkraft = fadeGain(lokal, span.length, clipFade(c));
      if (art === "page" && c.src.startsWith("effekt/")) {
        const [, wer, id] = /^effekt\/(korn|licht)-(.+)\.html$/.exec(c.src) ?? [], e = effekteVon(folge.get(id));
        if (wer) out.push({ art: "ueberlagerung", ueber: wer, clip: c, lokal, deckkraft, mischung: wer === "licht" ? "screen" : "overlay", p: { korn: e.korn, kratzer: e.kratzer, licht: e.licht, same: same(id) } });
      } else if (art === "page") out.push({ art: c.src === "titel/weiss.html" ? "weiss" : "titel", clip: c, titel: titel.get(c.id) ?? null, lokal, dauer: span.length, deckkraft });
      else {
        const e = effekteVon(folge.get(c.id)), ort = { lokal, laenge: span.length, t, marken: p.marken ?? [], id: c.id };
        out.push({ art: art === "still" ? "bild" : "video", clip: c, medium: m, quelle: span.from + lokal * span.speed, deckkraft, kasten: c.box, stil: c.style ?? "",
          bewegung: bewegung(e, ort), glitch: glitchBei(e, t, c.id) });
      }
    }
  }
  return out;
}

/** Was zu hören ist: [{ medium, at, von, bis, tempo, lautstaerke, fade }] aus den Videos der Folge und den Tönen (film-doc.js) */
export function tonQuellen(p, doc) {
  const quelleVon = new Map(Object.values(p.medien).map((m) => [m.datei, m])), out = [];
  for (const spur of doc.tracks) {
    if (spur.hidden || spur.muted) continue;
    for (const c of spur.clips) {
      const art = kindOf(c), m = quelleVon.get(c.src);
      if (!m || (art !== "video" && art !== "sound") || (art === "video" && !m.ton) || c.volume === 0) continue;
      const span = clipSpan(c, m.dauer ?? NaN, c.id);
      out.push({ medium: m.id, at: c.at ?? 0, von: span.from, bis: span.to, tempo: span.speed, laenge: span.length, lautstaerke: c.volume ?? 1, fade: clipFade(c) });
    }
  }
  return out;
}
