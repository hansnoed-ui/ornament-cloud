// ORMA – Spielablauf für zwei Personen an einem Gerät.
// Start → Namen → Drehen → Gemeinsam lesen → Auftrag wählen → A antwortet → Übergabe → B antwortet
// → Aufdecken → Weiterdenken → Ergebniskarte (behalten, exportieren, noch eine Runde).
// Re-Entry (allein): erster Durchgang Drehen → Lesen → Auftrag → Antwort → Schleife offen. Bringt das Rad
// dieselbe Konstellation wieder, folgt der zweite Durchgang: Wiedersehen → Lesen → Antwort (derselbe Auftrag,
// ohne die erste Antwort zu sehen) → Aufdecken → Was hat sich verändert, der dritte Gedanke → Ergebniskarte.
// Jede Änderung wird sofort als Entwurf gesichert (store.js). Nutzereingaben gehen nur über
// textContent und value in die Seite, nie als HTML.
// Keine Anmeldung, keine Zählung, keine Netzanfragen ausser dem eigenen Service Worker.

import { APP, CONTENT_VERSION, PILOT } from "./data.js?v=36fb50b5ad6f";
import { drawNext } from "./draw.js?v=36fb50b5ad6f";
import {
  KEYS, newRound, loadDraft, saveDraft, clearDraft, loadBook, saveBook, keepRound, setFavorite, deleteEntry,
  deleteAllEntries, makeBackup, mergeBackup, loadText, saveText,
  loadLoops, saveLoops, openLoopFor, openLoop, closeLoop,
} from "./store.js?v=36fb50b5ad6f";
import { createWheel, bindGesture } from "./wheel.js?v=36fb50b5ad6f";
import { layoutCard, drawCard, canvasMeasure } from "./card.js?v=36fb50b5ad6f";

// ---------- Umgebung ----------
const storage = (() => { try { const s = window.localStorage; s.getItem("orma:probe"); return s; } catch { return memoryStorage(); } })();
function memoryStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}
const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const byId = new Map(PILOT.map(p => [p.id, p]));
const main = document.getElementById("view");
const live = document.getElementById("orma-live");

// Sprache (js/sprache.js, vor den Modulen): T(deutsch, …) gibt auf Englisch die Übersetzung, sonst den deutschen Text
const T = (s, ...a) => (window.sprache ? window.sprache.t(s, ...a) : s);
const EN = () => !!(window.sprache && window.sprache.en());
const AUFTRAG_DE = { beispiel: "Ein Beispiel finden", einwand: "Einen Einwand finden", gestaltung: "Etwas daraus machen" };
const AUFTRAG = new Proxy(AUFTRAG_DE, { get: (o, k) => (k in o ? T(o[k]) : undefined) });   // Beschriftung der Aufträge in der gewählten Sprache
let rerender = () => renderStart();   // die aktuelle Ansicht, neu gezeichnet beim Wechsel der Sprache

let round = null;          // laufende Runde
let notice = "";           // einmalige Meldung für die nächste Ansicht
let installPrompt = null;
const UA = navigator.userAgent;
const ANDROID = /Android/.test(UA);
// iPadOS meldet sich als Mac, unterscheidet sich aber durch Touch
const IOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
// Eingebaute Browser von Facebook, Instagram, Messenger u. a. können keine App installieren
const IN_APP = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|MessengerForiOS|Orca-Android|LinkedInApp|Snapchat|TikTok|musical_ly|Line\/|MicroMessenger|Pinterest|Twitter/.test(UA);
const STANDALONE = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

// Installieren, Schritte je Browser (wie ORNA). Safari auf dem iPhone bietet nie selbst eine Installation an;
// darum steht der Knopf überall ausser in der App und erklärt die Schritte, wenn der Browser nicht anbietet.
function installSteps() {
  if (IN_APP && IOS) return T("Im Browser dieser App lässt sich ORMA nicht installieren. Über «···» oder das Menü «In Safari öffnen» wählen, dann dort «Teilen» und «Zum Home-Bildschirm».");
  if (IN_APP) return T("Im Browser dieser App lässt sich ORMA nicht installieren. Über das Menü (⋮) «In Chrome öffnen» wählen und dort noch einmal auf «ORMA als App installieren» tippen.");
  if (IOS) return T("Unten auf «Teilen» tippen (Quadrat mit Pfeil nach oben), dann «Zum Home-Bildschirm» wählen.");
  if (ANDROID) return T("Im Browsermenü (⋮) «App installieren» oder «Zum Startbildschirm hinzufügen» wählen.");
  if (/Edg\/|Chrome\//.test(UA)) return T("Im Browsermenü (⋮) «ORMA installieren» wählen oder in der Adresszeile auf das Installationssymbol klicken. Im Inkognito-Fenster geht es nicht.");
  if (/Macintosh/.test(UA) && /Safari\//.test(UA) && !/Firefox\//.test(UA)) return T("Im Menü «Ablage» «Zum Dock hinzufügen» wählen.");
  return T("Dieser Browser kann ORMA nicht installieren. Auf dem Smartphone geht es direkt, am Computer mit Chrome oder Edge.");
}

let installGewuenscht = new URLSearchParams(location.search).has("installieren");   // vom Neubau («Als App installieren», /b/apps/orma/): Schritte aufgeklappt, bis man weitergeht
function installBlock() {
  if (STANDALONE) return [];
  const help = h("p", { class: "orma-small orma-install-help", id: "orma-install-help", hidden: !installGewuenscht, text: installSteps() + T(" Danach funktioniert ORMA auch ohne Netz.") });
  const b = btn(T("ORMA als App installieren"), async () => {
    if (installPrompt) {
      const p = installPrompt; installPrompt = null;
      p.prompt();
      const choice = await p.userChoice.catch(() => null);
      if (choice && choice.outcome === "accepted") b.hidden = true;
      return;
    }
    installGewuenscht = false;
    help.hidden = !help.hidden;
    b.setAttribute("aria-expanded", String(!help.hidden));
  }, "orma-link", { "aria-expanded": String(installGewuenscht), "aria-controls": "orma-install-help" });
  if (installGewuenscht) requestAnimationFrame(() => { b.scrollIntoView({ block: "center" }); b.focus({ preventScroll: true }); });   // die Startansicht wird beim Sprachwechsel neu gezeichnet, darum bleibt die Wahl bis zum nächsten Schritt
  return [b, help];
}

// ---------- DOM-Helfer: Text immer als Text ----------
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "value") el.value = v;
    else if (k === "checked") el.checked = !!v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
const btn = (label, onclick, cls = "orma-btn", extra = {}) => h("button", { type: "button", class: cls, onclick, ...extra }, label);

function show(...nodes) {
  main.replaceChildren(...nodes.flat().filter(Boolean));
  main.classList.remove("is-fresh"); void main.offsetWidth; main.classList.add("is-fresh");   // Übergang neu anstossen
  const head = main.querySelector("h1, h2");
  if (head) { head.setAttribute("tabindex", "-1"); head.focus({ preventScroll: true }); }
  window.scrollTo(0, 0);
}
const say = t => { live.textContent = ""; setTimeout(() => { live.textContent = t; }, 30); };
const noticeNode = () => { if (!notice) return null; const n = h("p", { class: "orma-note", role: "status", text: notice }); notice = ""; return n; };

const solo = r => r.mode === "allein";
// Spielaufträge: für zwei Personen (ihr) oder im Modus allein in der Du-Form; auf Englisch aus p.en (tools/build-orma.ts, pilot.en.json)
const tasks = (p, r) => (EN() && p.en ? (solo(r) ? p.en.auftraegeAllein : p.en.auftraege) : (solo(r) ? p.auftraegeAllein : p.auftraege));
const einstiegVon = p => (EN() && p.en ? p.en.einstieg : p.einstieg);
const frageVon = p => (EN() && p.en ? p.en.question : p.question);
const textVon = p => (EN() && p.en ? p.en.text : p.text);
// Re-Entry: die beiden Durchgänge heissen nach ihrem Datum – dieselbe Person, zu verschiedenen Zeiten
const nameOf = (r, k) => solo(r) ? `${T("Ich, am")} ${fmtDate(k === "a" ? r.firstAt : r.startedAt)}`
  : (r.names[k] || "").trim() || `${T("Person")} ${k.toUpperCase()}`;
const pairTitle = p => h("p", { class: "orma-pair" }, p.artist.name, h("span", { class: "orma-x", "aria-hidden": "true", text: " × " }), h("span", { class: "sr-only", text: T(" und ") }), p.theorist.name);
const fmtDate = iso => { try { return new Date(iso).toLocaleDateString(EN() ? "en-GB" : "de-CH", { day: "numeric", month: "long", year: "numeric" }); } catch { return ""; } };

function persist() { if (round) saveDraft(storage, round); }
function go(step) { round.step = step; persist(); renderRound(); }

// ---------- Start ----------
function renderStart() {
  rerender = renderStart;
  const { draft, error } = loadDraft(storage);
  if (error && !notice) notice = error;
  const book = loadBook(storage);
  const open = loadLoops(storage).loops.length;
  const resumable = draft && (!draft.constellationId || byId.has(draft.constellationId));
  const fresh = next => (resumable ? confirmView(
    T("Es gibt eine unterbrochene Runde. Wenn du neu beginnst, wird sie verworfen."),
    T("Neu beginnen"), () => { clearDraft(storage); next(); }, renderStart) : next());

  const actions = h("div", { class: "orma-actions" },
    btn(T("Zu zweit beginnen"), () => fresh(renderNames), "orma-btn orma-btn--primary"),
    btn(`${T("Allein: Re-Entry")}${open ? ` (${open} ${T("offen")})` : ""}`, () => fresh(startSolo)),
    resumable && btn(T("Runde fortsetzen"), () => {
      round = draft;
      if (!solo(round) && round.step === "antwort-b") round.step = "uebergabe";   // wer das Gerät hält, ist offen: erst wieder übergeben
      renderRound();
    }),
    btn(`${T("Unsere Gedanken")}${book.entries.length ? ` (${book.entries.length})` : ""}`, renderBook),
  );
  const extra = [];
  if (draft && !resumable) extra.push(h("p", { class: "orma-note", text: T("Die unterbrochene Runde gehört zu einer älteren Fassung von ORMA und kann nicht fortgesetzt werden.") }),
    btn(T("Unterbrochene Runde verwerfen"), () => { clearDraft(storage); renderStart(); }, "orma-link"));
  else if (resumable) extra.push(btn(T("Unterbrochene Runde verwerfen"), () => confirmView(T("Die unterbrochene Runde wird gelöscht."), T("Verwerfen"), () => { clearDraft(storage); renderStart(); }, renderStart), "orma-link"));
  extra.push(...installBlock());
  // Android: Manche Geräte lassen die Installation auch in Chrome nicht zu (Warnung «unsichere App»);
  // eine Verknüpfung geht immer. Die Seite erfährt vom Fehlschlag nichts, darum steht der Hinweis immer da.
  if (ANDROID && !IN_APP && !STANDALONE) extra.push(h("p", { class: "orma-small orma-install-alt", text: T("Klappt die Installation nicht? Im Browsermenü (⋮) «Zum Startbildschirm hinzufügen» und dann «Verknüpfung erstellen» wählen.") }));

  show(
    noticeNode(),
    heroWheel(),
    h("h1", { text: "ORMA" }),
    h("p", { class: "orma-sub", text: "Nebeneinander, Nacheinander" }),
    h("p", { class: "orma-claim" }, h("strong", { text: T("Zehn Minuten zu zweit. Zwei Sichtweisen. Ein neuer Gedanke.") })),
    actions,
    extra.length ? h("div", { class: "orma-extra" }, ...extra) : null,
    helpBlock(),
    h("p", { class: "orma-foot", text: `ORMA ${APP.version} · ${T("Inhalt")} ${CONTENT_VERSION} · ${T("kostenlos, ohne Anmeldung, ohne Werbung. Alles bleibt auf diesem Gerät.")}` }),
  );
}

function helpBlock() {
  return h("details", { class: "orma-help" },
    h("summary", { class: "orma-link", text: T("So geht eine Runde") }),
    h("ol", {},
      h("li", { text: T("Das Rad bringt zwei Menschen zusammen: eine Künstlerin oder einen Künstler und eine Theoretikerin oder einen Theoretiker.") }),
      h("li", { text: T("Ihr lest gemeinsam einen kurzen Einstieg und die Frage dazu. Theoriekenntnisse braucht ihr nicht.") }),
      h("li", { text: T("Ihr wählt zusammen einen Auftrag: ein Beispiel, einen Einwand oder etwas zum Machen.") }),
      h("li", { text: T("Zuerst antwortet die eine Person, dann gibt sie das Gerät weiter. Die zweite sieht die erste Antwort nicht. Mündlich antworten geht auch.") }),
      h("li", { text: T("Dann deckt ihr beide Antworten auf und denkt gemeinsam weiter. Einig werden müsst ihr euch nicht.") }),
      h("li", { text: T("Zum Schluss könnt ihr den Gedanken im Gedankenbuch behalten oder als Bild exportieren.") }),
    ),
    h("p", { class: "orma-small", text: T("Allein: Re-Entry. Du spielst beide Rollen, zu verschiedenen Zeiten. Beim ersten Mal antwortest du und lässt die Schleife offen. Bringt das Rad dieselbe Konstellation irgendwann wieder, antwortest du noch einmal, als spätere Version deiner selbst, ohne deine erste Antwort zu sehen. Dann legst du beide nebeneinander und hältst fest, was sich verändert hat: den dritten Gedanken.") }),
    h("p", { class: "orma-small", text: T("Etwa zehn Minuten, aber ohne Uhr. Es gibt keine richtigen oder falschen Antworten, keine Punkte und keine Wertung. Antworten dürfen vorläufig bleiben und der Paarung widersprechen.") }),
    h("p", { class: "orma-small", text: T("Installieren: im Browsermenü «App installieren» oder «Zum Startbildschirm hinzufügen» wählen, auf dem iPhone über «Teilen» und «Zum Home-Bildschirm». Danach funktioniert ORMA auch ohne Netz.") }),
  );
}

function confirmView(message, yes, onYes, onNo) {
  show(
    h("h2", { text: T("Sicher?") }),
    h("p", { text: message }),
    h("div", { class: "orma-actions" },
      btn(yes, onYes, "orma-btn orma-btn--danger"),
      btn(T("Abbrechen"), onNo),
    ),
  );
}

// ---------- A. Beginnen ----------
function renderNames(prev = {}) {
  installGewuenscht = false;
  rerender = () => renderNames({ a: a.value, b: b.value });
  const a = h("input", { class: "orma-input", id: "orma-name-a", autocomplete: "off", maxlength: "40", placeholder: T("Person A"), value: prev.a || "" });
  const b = h("input", { class: "orma-input", id: "orma-name-b", autocomplete: "off", maxlength: "40", placeholder: T("Person B"), value: prev.b || "" });
  const start = () => {
    round = newRound({ names: { a: a.value.trim(), b: b.value.trim() } });
    persist();
    renderRound();
  };
  show(
    h("p", { class: "orma-kicker", text: T("Zu zweit") }),
    h("h2", { text: T("Wer spielt?") }),
    h("p", { class: "orma-muted", text: T("Vornamen sind freiwillig.") }),
    h("form", { onsubmit: e => { e.preventDefault(); start(); } },
      h("label", { class: "orma-field", for: "orma-name-a" }, h("span", { text: T("Erste Person") }), a),
      h("label", { class: "orma-field", for: "orma-name-b" }, h("span", { text: T("Zweite Person") }), b),
      h("div", { class: "orma-actions" }, h("button", { type: "submit", class: "orma-btn orma-btn--primary", text: T("Beginnen") })),
    ),
  );
}

function startSolo() {
  installGewuenscht = false;
  round = newRound({ mode: "allein" });
  persist();
  renderRound();
}

// ---------- Runde ----------
function renderRound() {
  installGewuenscht = false;
  rerender = renderRound;
  const p = byId.get(round.constellationId);
  if (round.step !== "drehen" && !p) { round.step = "drehen"; round.constellationId = ""; }
  ({
    drehen: renderSpin, wiedersehen: renderAgain, lesen: renderRead, wahl: renderChoice, offen: renderOpenLoop,
    "antwort-a": () => renderAnswer("a"), uebergabe: renderHandover, "antwort-b": () => renderAnswer("b"),
    aufdecken: renderReveal, weiterdenken: renderFurther, karte: renderResult, namen: () => renderNames(round.names),
  }[round.step] || renderSpin)();
}

// je Ring jede Person einmal, auf ihrem Platz (eine Person kann in mehreren Konstellationen vorkommen)
const ringItems = key => [...new Map(PILOT.map(p => [p[key].slot, { symbol: p[key].symbol }])).entries()].sort((x, y) => x[0] - y[0]).map(x => x[1]);

// Startbild der Startansicht: das Rad, in der Mitte geteilt wie das Symbol von ORMA (nur Bild, nicht zu drehen)
function heroWheel() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "orma-wheel");
  svg.setAttribute("aria-hidden", "true");
  createWheel(svg, { outer: ringItems("artist"), inner: ringItems("theorist") });
  return h("div", { class: "orma-hero", "aria-hidden": "true" }, svg, h("div", { class: "orma-hero-invert" }));
}

// B. Drehen
function renderSpin() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "orma-wheel");
  svg.setAttribute("role", "button");
  svg.setAttribute("tabindex", "0");
  svg.setAttribute("aria-label", T("Rad drehen"));
  const wheel = createWheel(svg, { outer: ringItems("artist"), inner: ringItems("theorist"), hinweis: true });
  const pairBox = h("div", { class: "orma-pair-box", "aria-live": "polite" });
  // die drei Wege als Zeichen (20. Oktober 2026, «das Drehen klarer eingeführt»): ziehen oder wischen, antippen, Eingabetaste
  const hinweis = h("p", { class: "orma-hinweis", "aria-label": T("So dreht man: ziehen oder wischen, antippen, Eingabetaste") });
  hinweis.innerHTML = `<span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 13a8 8 0 0 1 14-5"/><path d="M15 5l3 3-3 3"/><path d="M8 20l1.5-6 4 .8-1 4.2"/></svg>${T("ziehen oder wischen")}</span>` +
    `<span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 12V5a1.5 1.5 0 0 1 3 0v6"/><path d="M14 11l4 1.5v3.5a4 4 0 0 1-4 4h-2a4 4 0 0 1-3.4-1.9L6 15"/><circle cx="12.5" cy="4" r="3.6" stroke-dasharray="1.5 2.5"/></svg>${T("antippen")}</span>` +
    `<span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="1.5"/><path d="M15 10v3H9"/><path d="M11 11l-2 2 2 2"/></svg>${T("Eingabetaste")}</span>`;   // Wörter aus js/sprache.js, kein Nutzertext
  const spinBtn = btn(T("Drehen"), () => spin({ dir: 1, strength: 0.5 }), "orma-btn orma-btn--primary");
  const skipBtn = btn(T("Überspringen"), () => wheel.skip(), "orma-btn orma-btn--quiet", { hidden: true });
  const goBtn = btn(solo(round) ? T("Lesen") : T("Gemeinsam lesen"), () => go(round.loopId ? "wiedersehen" : "lesen"), "orma-btn orma-btn--primary", { hidden: true });

  const landed = p => {
    wheel.mark(p.artist.slot, p.theorist.slot);
    hinweis.hidden = true;
    pairBox.replaceChildren(pairTitle(p));
    spinBtn.hidden = true; skipBtn.hidden = true; goBtn.hidden = false;
    svg.setAttribute("aria-label", `${T("Rad:")} ${p.artist.name} ${T("und")} ${p.theorist.name}`);
    goBtn.focus();
  };

  async function spin(gesture) {
    if (wheel.spinning || round.constellationId) return;
    const id = drawNext(PILOT.map(p => p.id), loadText(storage, KEYS.last));   // erst die Konstellation …
    const p = byId.get(id);
    round.constellationId = id;
    round.contentVersion = CONTENT_VERSION;
    if (solo(round)) {
      // Re-Entry: gibt es zu dieser Konstellation eine offene Schleife, wird dies ihr zweiter Durchgang
      const loop = openLoopFor(storage, id);
      if (loop) Object.assign(round, { loopId: loop.id, firstAt: loop.at, auftrag: loop.auftrag, answers: { ...round.answers, a: { text: loop.text, oral: false } } });
    }
    saveText(storage, KEYS.last, id);
    persist();
    spinBtn.hidden = true; skipBtn.hidden = false;
    pairBox.replaceChildren();
    await wheel.spinTo(p.artist.slot, p.theorist.slot, { ...gesture, reduce: reduceMotion() });   // … dann der Weg dorthin
    say(`${T("Konstellation:")} ${p.artist.name} ${T("und")} ${p.theorist.name}.`);
    landed(p);
  }
  bindGesture(svg, g => spin(g));
  svg.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); spin({ dir: 1, strength: 0.5 }); } });

  show(
    h("p", { class: "orma-kicker", text: solo(round) ? T("Allein · Re-Entry") : `${nameOf(round, "a")} ${T("und")} ${nameOf(round, "b")}` }),
    h("h2", { text: T("Das Rad bringt zwei zusammen") }),
    h("p", { class: "orma-muted", text: solo(round) ? T("Tippen oder wischen. Wie du drehst, bestimmt nur den Weg, nicht das Ergebnis.") : T("Tippen oder wischen. Wie ihr dreht, bestimmt nur den Weg, nicht das Ergebnis.") }),
    h("div", { class: "orma-wheel-wrap" }, svg),
    hinweis,
    pairBox,
    h("div", { class: "orma-actions" }, spinBtn, skipBtn, goBtn),
  );
  const done = byId.get(round.constellationId);
  if (done) { wheel.setTo(done.artist.slot, done.theorist.slot); landed(done); }
}

// C. Gemeinsam lesen
function renderRead() {
  const p = byId.get(round.constellationId);
  show(
    h("p", { class: "orma-kicker", text: solo(round) ? (round.loopId ? T("Zweiter Durchgang") : T("Lesen")) : T("Gemeinsam lesen") }),
    h("h2", {}, p.artist.name, h("span", { class: "orma-x", text: " × " }), p.theorist.name),
    h("span", { class: "orma-label", text: T("Zum Einstieg") }),
    h("p", { text: einstiegVon(p) }),
    h("span", { class: "orma-label", text: T("Frage") }),
    h("p", { class: "orma-question", text: frageVon(p) }),
    h("details", { class: "orma-origin" },
      h("summary", { text: T("Originaltext der Konstellation") }),
      h("p", { text: textVon(p) }),
      h("p", { class: "orma-small", text: `${T("Aus «Nebeneinander, Nacheinander», Konstellation Nr.")} ${p.nr}. ${T("Der Einstieg oben ist eine Hinführung der ORMA-Redaktion, kein Zitat.")}` }),
    ),
    h("div", { class: "orma-actions" }, round.loopId
      ? btn(T("Noch einmal antworten"), () => go("antwort-b"), "orma-btn orma-btn--primary")   // derselbe Auftrag wie beim ersten Mal
      : btn(T("Einen Auftrag wählen"), () => go("wahl"), "orma-btn orma-btn--primary")),
  );
}

// Re-Entry: Wiedersehen mit einer offenen Schleife (nichts von der ersten Antwort)
function renderAgain() {
  const p = byId.get(round.constellationId);
  show(
    h("p", { class: "orma-kicker", text: "Re-Entry" }),
    h("h2", { text: T("Du warst schon einmal hier") }),
    pairTitle(p),
    h("p", { text: T("wiedersehen", fmtDate(round.firstAt)) }),
    h("p", { class: "orma-small", text: T("Danach legst du beide Antworten nebeneinander.") }),
    h("div", { class: "orma-actions" }, btn(T("Lesen"), () => go("lesen"), "orma-btn orma-btn--primary")),
  );
}

// Re-Entry: erster Durchgang abgeschlossen, die Schleife bleibt offen
function renderOpenLoop() {
  const p = byId.get(round.constellationId);
  const { ok } = openLoop(storage, round);
  const last = round.constellationId;
  if (ok) clearDraft(storage);
  show(
    ok ? null : h("p", { class: "orma-note", text: T("Die Schleife liess sich auf diesem Gerät nicht speichern.") }),
    h("p", { class: "orma-kicker", text: "Re-Entry" }),
    h("h2", { text: T("Die Schleife ist offen") }),
    pairTitle(p),
    h("p", { text: T("Deine Antwort ist auf diesem Gerät gespeichert. Sehen wirst du sie erst wieder im zweiten Durchgang: wenn das Rad dich irgendwann wieder zu dieser Konstellation bringt. Dann antwortest du noch einmal, als spätere Version deiner selbst.") }),
    h("div", { class: "orma-actions" },
      btn(T("Weiter drehen"), () => { round = newRound({ mode: "allein" }); persist(); saveText(storage, KEYS.last, last); renderRound(); }, "orma-btn orma-btn--primary"),
      btn(T("Zur Startansicht"), () => { round = null; renderStart(); }, "orma-btn orma-btn--quiet"),
    ),
  );
}

// Auftrag wählen
function renderChoice() {
  const p = byId.get(round.constellationId);
  show(
    h("p", { class: "orma-kicker", text: T("Spielauftrag") }),
    h("h2", { text: solo(round) ? T("Was willst du damit machen?") : T("Was wollt ihr damit machen?") }),
    h("p", { class: "orma-muted", text: solo(round) ? T("Wähle einen Auftrag. Beim zweiten Durchgang gilt derselbe. Er ist eine Anregung von ORMA, keine Aussage der genannten Personen.") : T("Wählt gemeinsam einen Auftrag. Er ist eine Anregung von ORMA, keine Aussage der genannten Personen.") }),
    h("div", { class: "orma-choice" },
      Object.entries(AUFTRAG).map(([key, label]) => h("button", {
        type: "button", class: "orma-option", "data-auftrag": key,
        onclick: () => { round.auftrag = key; go("antwort-a"); },
      }, h("strong", { text: label }), h("span", { text: tasks(p, round)[key] }))),
    ),
  );
}

const taskBox = p => h("div", { class: "orma-task" },
  h("span", { class: "orma-label", style: "margin-top:0", text: `${T("Spielauftrag")} · ${AUFTRAG[round.auftrag] || ""}` }),
  h("p", { text: tasks(p, round)[round.auftrag] || "" }),
  h("p", { class: "orma-small", text: `${T("Frage")}: ${frageVon(p)}` }));

// D. Getrennt antworten
function renderAnswer(k) {
  const p = byId.get(round.constellationId);
  const a = round.answers[k];
  const field = h("textarea", { class: "orma-text", id: `orma-answer-${k}`, maxlength: "4000", rows: "5", value: a.text });
  field.addEventListener("input", () => { a.text = field.value; persist(); });
  const next = () => (k === "a" ? go(solo(round) ? "offen" : "uebergabe") : go("aufdecken"));
  const write = [
    h("label", { class: "orma-field", for: `orma-answer-${k}` }, h("span", { text: T("Dein Gedanke") }), field),
    h("p", { class: "orma-small", text: T("Ein, zwei Sätze genügen. Vorläufiges ist willkommen, Widerspruch zur Paarung auch.") }),
    h("div", { class: "orma-actions" },
      btn(k === "a" && !solo(round) ? T("Fertig, Gerät weitergeben") : T("Fertig"), next, "orma-btn orma-btn--primary"),
      solo(round) ? null : btn(T("Ich antworte mündlich"), () => { a.oral = true; persist(); renderAnswer(k); }),   // allein: die Antwort ist das, was bleibt
    ),
  ];
  const oral = [
    h("p", { class: "orma-note", text: T("Du antwortest mündlich. Nichts wird aufgenommen; beim Aufdecken steht an deiner Stelle nur ein Hinweis.") }),
    h("div", { class: "orma-actions" },
      btn(k === "a" ? T("Weiter, Gerät weitergeben") : T("Weiter"), next, "orma-btn orma-btn--primary"),
      btn(T("Doch schreiben"), () => { a.oral = false; persist(); renderAnswer(k); }),
    ),
  ];
  show(
    h("p", { class: "orma-kicker", text: solo(round) ? (k === "a" ? T("Erster Durchgang") : T("Zweiter Durchgang")) : k === "a" ? T("Zuerst") : T("Dann") }),
    h("h2", { text: solo(round) ? (k === "a" ? T("Du antwortest") : T("Du antwortest noch einmal")) : `${nameOf(round, k)} ${T("antwortet")}` }),
    taskBox(p),
    a.oral ? oral : write,
  );
  if (!a.oral) field.focus({ preventScroll: true });
}

// Neutraler Zwischenbildschirm: nichts von der ersten Antwort
function renderHandover() {
  show(
    h("div", { class: "orma-handover" },
      document.querySelector(".orma-logo").cloneNode(true),
      h("h2", { text: `${T("Gib das Gerät an")} ${nameOf(round, "b")}` }),
      h("p", { class: "orma-muted", text: T("Die erste Antwort bleibt verborgen, bis ihr beide aufdeckt.") }),
      h("div", { class: "orma-actions" }, btn(`${T("Ich bin")} ${nameOf(round, "b")}`, () => go("antwort-b"), "orma-btn orma-btn--primary")),
    ),
  );
}

// E. Aufdecken
function answerCard(k, r = round) {
  const a = r.answers[k];
  return h("section", { class: "orma-answer", "data-person": k },
    h("h3", { text: nameOf(r, k) }),
    a.oral ? h("p", { class: "orma-oral", text: T("hat mündlich geantwortet.") })
      : h("p", { text: a.text.trim() || T("(keine Notiz)") }));
}

function renderReveal() {
  if (!round.revealed) {
    show(
      h("p", { class: "orma-kicker", text: solo(round) ? T("Zwei Durchgänge") : T("Beide haben geantwortet") }),
      h("h2", { text: solo(round) ? T("Jetzt aufdecken") : T("Jetzt gemeinsam aufdecken") }),
      h("p", { class: "orma-muted", text: solo(round) ? T("antwortVom", fmtDate(round.firstAt)) : T("Setzt euch so, dass ihr beide auf den Bildschirm seht.") }),
      h("div", { class: "orma-actions" }, btn(T("Aufdecken"), () => { round.revealed = true; go("aufdecken"); }, "orma-btn orma-btn--primary")),
    );
    return;
  }
  show(
    h("p", { class: "orma-kicker", text: T("Aufgedeckt") }),
    h("h2", { text: solo(round) ? T("Zwei Versionen") : T("Zwei Sichtweisen") }),
    h("div", { class: "orma-answers orma-answers--two" }, answerCard("a"), answerCard("b")),
    h("p", { class: "orma-prompt", text: solo(round) ? T("Was hat sich verändert?") : T("Was hast du anders gesehen?") }),
    h("p", { class: "orma-small", text: solo(round) ? T("Keine der beiden Antworten ist richtiger. Beide gehören dir, zu verschiedenen Zeiten.") : T("Sprecht darüber. Keine Antwort ist richtiger oder klüger als die andere.") }),
    h("div", { class: "orma-actions" }, btn(T("Weiterdenken"), () => go("weiterdenken"), "orma-btn orma-btn--primary")),
  );
}

// F. Weiterdenken
function renderFurther() {
  const area = (key, label, get, set) => {
    const t = h("textarea", { class: "orma-text", id: `orma-${key}`, maxlength: "4000", rows: "3", value: get() });
    t.addEventListener("input", () => { set(t.value); persist(); });
    return h("label", { class: "orma-field", for: `orma-${key}` }, h("span", { text: label }), t);
  };
  const r = round;
  const fields = h("div", {});
  const drawFields = () => {
    const list = r.result.mode === "gemeinsam" ? [area("gemeinsam", T("Unser neuer Gedanke"), () => r.result.gemeinsam, v => { r.result.gemeinsam = v; })]
      : r.result.mode === "positionen" ? [
        area("position-a", `${T("Position")} ${nameOf(r, "a")}`, () => r.result.a, v => { r.result.a = v; }),
        area("position-b", `${T("Position")} ${nameOf(r, "b")}`, () => r.result.b, v => { r.result.b = v; }),
      ] : [];
    fields.replaceChildren(...list);
  };
  const radio = (mode, label) => h("label", { class: "orma-radio" },
    h("input", { type: "radio", name: "orma-mode", value: mode, checked: r.result.mode === mode, onchange: () => { r.result.mode = mode; persist(); drawFields(); } }),
    h("span", { text: label }));
  drawFields();
  if (solo(r)) {
    const third = area("dritter", T("Der dritte Gedanke"), () => r.result.gemeinsam, v => { r.result.gemeinsam = v; r.result.mode = v.trim() ? "gemeinsam" : ""; });
    show(
      h("p", { class: "orma-kicker", text: T("Weiterdenken") }),
      h("h2", { text: T("Was hat sich verändert?") }),
      h("p", { class: "orma-small", text: T("Freiwillig. Beide Antworten bleiben, wie sie waren; hier kommt nur Neues dazu.") }),
      area("veraendert", T("Was hat sich zwischen den beiden Antworten verändert?"), () => r.extensions.b, v => { r.extensions.b = v; }),
      third,
      h("div", { class: "orma-actions" }, btn(T("Zur Ergebniskarte"), () => { closeLoop(storage, r.loopId); go("karte"); }, "orma-btn orma-btn--primary")),
    );
    return;
  }
  show(
    h("p", { class: "orma-kicker", text: T("Weiterdenken") }),
    h("h2", { text: T("Was verändert sich durch den Gedanken der anderen Person?") }),
    h("p", { class: "orma-small", text: T("Freiwillig. Die ersten Antworten bleiben, wie sie waren; hier kommt nur Neues dazu.") }),
    area("ergaenzung-a", `${nameOf(r, "a")} ${T("ergänzt")}`, () => r.extensions.a, v => { r.extensions.a = v; }),
    area("ergaenzung-b", `${nameOf(r, "b")} ${T("ergänzt")}`, () => r.extensions.b, v => { r.extensions.b = v; }),
    h("fieldset", { class: "orma-field", style: "border:0;padding:0;margin:1.4rem 0 0" },
      h("legend", { class: "orma-prompt", style: "padding:0", text: T("Was haltet ihr fest?") }),
      radio("gemeinsam", T("Einen gemeinsamen neuen Gedanken")),
      radio("positionen", T("Zwei Positionen, die bleiben")),
      radio("", T("Nichts festhalten")),
    ),
    fields,
    h("div", { class: "orma-actions" }, btn(T("Zur Ergebniskarte"), () => go("karte"), "orma-btn orma-btn--primary")),
  );
}

// G. Abschliessen
function resultView(r, p) {
  const res = r.result;
  const parts = [
    h("p", { class: "orma-kicker", text: "ORMA" }),
    pairTitle(p),
    h("p", { class: "orma-question", text: frageVon(p) }),
  ];
  if (res.mode === "gemeinsam" && res.gemeinsam.trim()) parts.push(h("span", { class: "orma-label", text: solo(r) ? T("Der dritte Gedanke") : T("Unser neuer Gedanke") }), h("p", { text: res.gemeinsam.trim() }));
  if (res.mode === "positionen") {
    if (res.a.trim()) parts.push(h("span", { class: "orma-label", text: `${T("Position")} ${nameOf(r, "a")}` }), h("p", { text: res.a.trim() }));
    if (res.b.trim()) parts.push(h("span", { class: "orma-label", text: `${T("Position")} ${nameOf(r, "b")}` }), h("p", { text: res.b.trim() }));
  }
  const ext = ["a", "b"].filter(k => r.extensions[k].trim());
  return h("div", { class: "orma-result" }, parts,
    h("details", { class: "orma-origin" },
      h("summary", { text: solo(r) ? T("Beide Antworten") : T("Erste Antworten und Ergänzungen") }),
      r.auftrag ? h("p", { class: "orma-small", text: `${T("Spielauftrag")}: ${AUFTRAG[r.auftrag]} – ${tasks(p, r)[r.auftrag]}` }) : null,
      h("div", { class: "orma-answers" }, answerCard("a", r), answerCard("b", r)),
      ext.map(k => h("p", {}, h("strong", { text: solo(r) ? T("Was sich verändert hat: ") : `${nameOf(r, k)} ${T("ergänzt")}: ` }), r.extensions[k].trim())),
    ));
}

function renderResult() {
  const p = byId.get(round.constellationId);
  const keep = btn(round.kept ? T("Im Gedankenbuch") : T("Im Gedankenbuch behalten"), () => {
    const { ok } = keepRound(storage, round);
    if (ok) { round.kept = true; persist(); notice = T("Im Gedankenbuch behalten."); renderResult(); }
    else { notice = T("Speichern ist auf diesem Gerät gerade nicht möglich."); renderResult(); }
  }, "orma-btn orma-btn--primary", { disabled: round.kept });
  const last = round.constellationId;
  show(
    noticeNode(),
    h("h2", { text: solo(round) ? T("Deine Karte") : T("Eure Karte") }),
    resultView(round, p),
    h("div", { class: "orma-actions" },
      keep,
      btn(T("Karte exportieren"), () => renderExport(round, renderResult)),
      btn(T("Noch eine Runde"), () => { round = newRound({ names: round.names, mode: round.mode }); persist(); saveText(storage, KEYS.last, last); renderRound(); }),
      btn(T("Runde beenden"), () => { clearDraft(storage); round = null; renderStart(); }, "orma-btn orma-btn--quiet"),
    ),
  );
}

// ---------- Ergebniskarte exportieren ----------
function renderExport(r, back) {
  rerender = () => renderExport(r, back);
  const p = byId.get(r.constellationId);
  const opts = { names: false, answers: false, result: false };
  const hasResult = (r.result.mode === "gemeinsam" && r.result.gemeinsam.trim()) || (r.result.mode === "positionen" && (r.result.a.trim() || r.result.b.trim()));
  const img = h("img", { class: "orma-preview", alt: T("Vorschau der Ergebniskarte") });
  const canvas = h("canvas");
  const measure = canvasMeasure();
  let blob = null;
  const shareBtn = btn(T("Teilen"), async () => {
    try { await navigator.share({ files: [new File([blob], fileName(), { type: "image/png" })], title: "ORMA" }); } catch { /* abgebrochen */ }
  }, "orma-btn orma-btn--primary", { hidden: true });
  const save = h("a", { class: "orma-btn", download: fileName(), href: "#", text: T("Bild speichern") });
  function fileName() { return `orma-${p.artist.id}-${p.theorist.id}.png`; }
  const update = () => {
    const layout = layoutCard({
      artist: p.artist.name, theorist: p.theorist.name, question: frageVon(p), auftrag: r.auftrag,
      names: r.names, answers: r.answers, result: r.result, date: fmtDate(r.savedAt || r.startedAt),
      ...(solo(r) ? { labels: { a: nameOf(r, "a"), b: nameOf(r, "b") }, resultLabel: T("Der dritte Gedanke") } : {}),
    }, opts, measure);
    drawCard(canvas, layout);
    canvas.toBlob(b => {
      blob = b;
      if (save.href.startsWith("blob:")) URL.revokeObjectURL(save.href);
      const url = URL.createObjectURL(b);
      save.href = url;
      img.src = url;
      img.dataset.height = String(layout.height);
      const file = new File([b], fileName(), { type: "image/png" });
      shareBtn.hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
    }, "image/png");
  };
  const check = (key, label, disabled) => h("label", { class: "orma-check" },
    h("input", { type: "checkbox", "data-opt": key, disabled, onchange: e => { opts[key] = e.target.checked; update(); } }),
    h("span", { text: label }));
  show(
    h("p", { class: "orma-kicker", text: T("Ergebniskarte") }),
    h("h2", { text: T("Karte exportieren") }),
    h("p", { class: "orma-small", text: `${T("Ohne Auswahl zeigt die Karte nur Paarung und Frage. Persönliches kommt nur dazu,")} ${solo(r) ? T("wenn du es hier anwählst") : T("wenn ihr es hier anwählt")}.` }),
    solo(r)
      ? [check("result", hasResult ? T("Den dritten Gedanken zeigen") : T("Den dritten Gedanken zeigen (nichts festgehalten)"), !hasResult),
        check("answers", T("Beide Antworten zeigen"))]
      : [check("result", hasResult ? T("Unser Ergebnis zeigen") : T("Unser Ergebnis zeigen (nichts festgehalten)"), !hasResult),
        check("answers", T("Die ersten Antworten zeigen")),
        check("names", T("Unsere Namen zeigen"))],
    img,
    h("div", { class: "orma-actions" }, shareBtn, save, btn(T("Zurück"), back, "orma-btn orma-btn--quiet")),
  );
  update();
}

// ---------- Gedankenbuch ----------
function renderBook() {
  installGewuenscht = false;
  rerender = renderBook;
  const { entries, error } = loadBook(storage);
  const { loops, error: loopError } = loadLoops(storage);
  if ((error || loopError) && !notice) notice = error || loopError;
  const damaged = loadText(storage, KEYS.bookDamaged);
  const list = entries.length
    ? h("ul", { class: "orma-book" }, entries.map(e => {
      const p = byId.get(e.constellationId);
      const title = p ? `${p.artist.name} × ${p.theorist.name}` : `${T("Konstellation")} ${e.constellationId}`;
      return h("li", {},
        h("button", { type: "button", class: "orma-entry", onclick: () => renderEntry(e.id) },
          h("strong", { text: title }),
          h("span", { text: `${fmtDate(e.savedAt)}${solo(e) ? " · Re-Entry" : ""}${e.auftrag ? ` · ${AUFTRAG[e.auftrag]}` : ""}` })),
        h("button", {
          type: "button", class: "orma-fav", "aria-pressed": String(e.favorite), "aria-label": `${T("Favorit")}: ${title}`, text: e.favorite ? "★" : "☆",
          onclick: () => { setFavorite(storage, e.id, !e.favorite); renderBook(); },
        }));
    }))
    : h("p", { class: "orma-muted", text: T("Noch keine Gedanken. Nach einer Runde lassen sie sich hier behalten.") });

  // offene Schleifen: nur Paarung und Datum, die Antwort bleibt bis zum zweiten Durchgang verborgen
  const loopList = loops.length ? [
    h("span", { class: "orma-label", text: `${T("Offene Schleifen")} (${loops.length})` }),
    h("p", { class: "orma-small", text: T("Erste Durchgänge im Modus allein. Die Antwort bleibt verborgen, bis das Rad dieselbe Konstellation wieder bringt.") }),
    h("ul", { class: "orma-book orma-loops" }, loops.map(l => {
      const p = byId.get(l.constellationId);
      const title = p ? `${p.artist.name} × ${p.theorist.name}` : `${T("Konstellation")} ${l.constellationId}`;
      return h("li", {},
        h("div", { class: "orma-entry" }, h("strong", { text: title }), h("span", { text: `${T("offen seit")} ${fmtDate(l.at)} · ${AUFTRAG[l.auftrag]}` })),
        h("button", {
          type: "button", class: "orma-fav", "aria-label": `${T("Schleife löschen")}: ${title}`, text: "×",
          onclick: () => confirmView(T("schleifeLoeschen", title), T("Löschen"),
            () => { saveLoops(storage, loadLoops(storage).loops.filter(x => x.id !== l.id)); notice = T("Schleife gelöscht."); renderBook(); }, renderBook),
        }));
    })),
  ] : [];

  const fileInput = h("input", { type: "file", accept: "application/json,.json", class: "sr-only", id: "orma-import" });
  fileInput.addEventListener("change", async () => {
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    const text = f.size > 5_000_000 ? "" : await f.text();
    const res = mergeBackup(text, loadBook(storage).entries, loadLoops(storage).loops);
    if (res.error) notice = res.error;
    else if (!saveBook(storage, res.entries) || !saveLoops(storage, res.loops)) notice = T("Die Einträge liessen sich auf diesem Gerät nicht speichern.");
    else notice = `${res.added} ${T("Eintrag/Einträge übernommen")}${res.loopsAdded ? `, ${res.loopsAdded} ${T("offene Schleife(n)")}` : ""}${res.skipped ? `, ${res.skipped} ${T("schon vorhanden (nicht überschrieben)")}` : ""}${res.invalid ? `, ${res.invalid} ${T("ungültig")}` : ""}.`;
    renderBook();
  });
  const download = (name, text) => {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const a = h("a", { href: url, download: name });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };
  const today = new Date().toISOString().slice(0, 10);

  show(
    noticeNode(),
    h("p", { class: "orma-kicker", text: T("Gedankenbuch") }),
    h("h2", { text: T("Unsere Gedanken") }),
    h("p", { class: "orma-small", text: T("Deine Gedanken bleiben auf diesem Gerät. Beim Löschen der App-Daten können sie verloren gehen.") }),
    list,
    loopList,
    h("div", { class: "orma-actions" },
      btn(T("Sicherung herunterladen"), () => download(`orma-gedankenbuch-${today}.json`, JSON.stringify(makeBackup(entries, new Date(), loops), null, 2)), "orma-btn", { disabled: !entries.length && !loops.length }),
      h("label", { class: "orma-btn", for: "orma-import", tabindex: "0", onkeydown: e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } } }, T("Sicherung einlesen")),
      fileInput,
    ),
    damaged ? h("p", { class: "orma-small" }, T("Ein früher beschädigter Inhalt wurde aufbewahrt. "),
      btn(T("Herunterladen"), () => download(`orma-beschaedigt-${today}.txt`, damaged), "orma-link")) : null,
    h("div", { class: "orma-danger-zone" },
      btn(T("Alle ORMA-Einträge löschen"), () => confirmView(
        T("alleLoeschen", entries.length, loops.length),
        T("Ja, alle löschen"), () => { deleteAllEntries(storage); notice = T("Alle Einträge wurden gelöscht."); renderBook(); }, renderBook),
      "orma-btn orma-btn--danger", { disabled: !entries.length && !loops.length && !damaged }),
    ),
    h("div", { class: "orma-actions" }, btn(T("Zur Startansicht"), renderStart, "orma-btn orma-btn--quiet")),
  );
}

function renderEntry(id) {
  rerender = () => renderEntry(id);
  const e = loadBook(storage).entries.find(x => x.id === id);
  if (!e) { renderBook(); return; }
  const p = byId.get(e.constellationId);
  if (!p) {
    show(h("h2", { text: T("Eintrag") }), h("p", { text: T("eintragFremd", e.constellationId) }),
      h("div", { class: "orma-actions" }, btn(T("Löschen"), () => { deleteEntry(storage, id); renderBook(); }, "orma-btn orma-btn--danger"), btn(T("Zurück"), renderBook)));
    return;
  }
  show(
    noticeNode(),
    h("p", { class: "orma-kicker", text: fmtDate(e.savedAt) }),
    h("h2", { text: T("Aus dem Gedankenbuch") }),
    resultView(e, p),
    h("div", { class: "orma-actions" },
      btn(e.favorite ? T("Favorit entfernen") : T("Als Favorit markieren"), () => { setFavorite(storage, id, !e.favorite); renderEntry(id); }),
      btn(T("Karte exportieren"), () => renderExport(e, () => renderEntry(id))),
      btn(T("Eintrag löschen"), () => confirmView(T("Dieser Eintrag wird gelöscht."), T("Löschen"), () => { deleteEntry(storage, id); notice = T("Eintrag gelöscht."); renderBook(); }, () => renderEntry(id)), "orma-btn orma-btn--danger"),
      btn(T("Zurück"), renderBook, "orma-btn orma-btn--quiet"),
    ),
  );
}

// ---------- Start der App ----------
document.querySelector(".orma-home").addEventListener("click", () => { persist(); round = null; renderStart(); });
// Wechsel der Sprache (js/sprache.js): die aktuelle Ansicht neu zeichnen; Eingaben bleiben, sie liegen in der Runde
document.addEventListener("sprache", () => { if (document.documentElement.dataset.ready) rerender(); });
addEventListener("pagehide", persist);
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; });

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  addEventListener("load", () => { navigator.serviceWorker.register(new URL("../sw.js", import.meta.url)).catch(() => { /* ohne Offline-Betrieb weiter */ }); });
}

renderStart();
document.documentElement.dataset.ready = "1";
