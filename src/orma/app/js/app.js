// ORMA – Spielablauf für zwei Personen an einem Gerät.
// Start → Namen → Drehen → Gemeinsam lesen → Auftrag wählen → A antwortet → Übergabe → B antwortet
// → Aufdecken → Weiterdenken → Ergebniskarte (behalten, exportieren, noch eine Runde).
// Re-Entry (allein): erster Durchgang Drehen → Lesen → Auftrag → Antwort → Schleife offen. Bringt das Rad
// dieselbe Konstellation wieder, folgt der zweite Durchgang: Wiedersehen → Lesen → Antwort (derselbe Auftrag,
// ohne die erste Antwort zu sehen) → Aufdecken → Was hat sich verändert, der dritte Gedanke → Ergebniskarte.
// Jede Änderung wird sofort als Entwurf gesichert (store.js). Nutzereingaben gehen nur über
// textContent und value in die Seite, nie als HTML.
// Keine Anmeldung, keine Zählung, keine Netzanfragen ausser dem eigenen Service Worker.

import { APP, CONTENT_VERSION, PILOT } from "./data.js";
import { drawNext } from "./draw.js";
import {
  KEYS, newRound, loadDraft, saveDraft, clearDraft, loadBook, saveBook, keepRound, setFavorite, deleteEntry,
  deleteAllEntries, makeBackup, mergeBackup, loadText, saveText,
  loadLoops, saveLoops, openLoopFor, openLoop, closeLoop,
} from "./store.js";
import { createWheel, bindGesture } from "./wheel.js";
import { layoutCard, drawCard, canvasMeasure } from "./card.js";

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

const AUFTRAG = {
  beispiel: "Ein Beispiel finden",
  einwand: "Einen Einwand finden",
  gestaltung: "Etwas daraus machen",
};

let round = null;          // laufende Runde
let notice = "";           // einmalige Meldung für die nächste Ansicht
let installPrompt = null;

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
  const head = main.querySelector("h1, h2");
  if (head) { head.setAttribute("tabindex", "-1"); head.focus({ preventScroll: true }); }
  window.scrollTo(0, 0);
}
const say = t => { live.textContent = ""; setTimeout(() => { live.textContent = t; }, 30); };
const noticeNode = () => { if (!notice) return null; const n = h("p", { class: "orma-note", role: "status", text: notice }); notice = ""; return n; };

const solo = r => r.mode === "allein";
// Re-Entry: die beiden Durchgänge heissen nach ihrem Datum – dieselbe Person, zu verschiedenen Zeiten
const nameOf = (r, k) => solo(r) ? `Ich, am ${fmtDate(k === "a" ? r.firstAt : r.startedAt)}`
  : (r.names[k] || "").trim() || `Person ${k.toUpperCase()}`;
const pairTitle = p => h("p", { class: "orma-pair" }, p.artist.name, h("span", { class: "orma-x", "aria-hidden": "true", text: " × " }), h("span", { class: "sr-only", text: " und " }), p.theorist.name);
const fmtDate = iso => { try { return new Date(iso).toLocaleDateString("de-CH", { day: "numeric", month: "long", year: "numeric" }); } catch { return ""; } };

function persist() { if (round) saveDraft(storage, round); }
function go(step) { round.step = step; persist(); renderRound(); }

// ---------- Start ----------
function renderStart() {
  const { draft, error } = loadDraft(storage);
  if (error && !notice) notice = error;
  const book = loadBook(storage);
  const open = loadLoops(storage).loops.length;
  const resumable = draft && (!draft.constellationId || byId.has(draft.constellationId));
  const fresh = next => (resumable ? confirmView(
    "Es gibt eine unterbrochene Runde. Wenn du neu beginnst, wird sie verworfen.",
    "Neu beginnen", () => { clearDraft(storage); next(); }, renderStart) : next());

  const actions = h("div", { class: "orma-actions" },
    btn("Zu zweit beginnen", () => fresh(renderNames), "orma-btn orma-btn--primary"),
    btn(`Allein: Re-Entry${open ? ` (${open} offen)` : ""}`, () => fresh(startSolo)),
    resumable && btn("Runde fortsetzen", () => {
      round = draft;
      if (!solo(round) && round.step === "antwort-b") round.step = "uebergabe";   // wer das Gerät hält, ist offen: erst wieder übergeben
      renderRound();
    }),
    btn(`Unsere Gedanken${book.entries.length ? ` (${book.entries.length})` : ""}`, renderBook),
  );
  const extra = [];
  if (draft && !resumable) extra.push(h("p", { class: "orma-note", text: "Die unterbrochene Runde gehört zu einer älteren Fassung von ORMA und kann nicht fortgesetzt werden." }),
    btn("Unterbrochene Runde verwerfen", () => { clearDraft(storage); renderStart(); }, "orma-link"));
  else if (resumable) extra.push(btn("Unterbrochene Runde verwerfen", () => confirmView("Die unterbrochene Runde wird gelöscht.", "Verwerfen", () => { clearDraft(storage); renderStart(); }, renderStart), "orma-link"));
  if (installPrompt) extra.push(btn("ORMA als App installieren", async () => { installPrompt.prompt(); installPrompt = null; }, "orma-link"));

  show(
    noticeNode(),
    h("h1", { text: "ORMA" }),
    h("p", { class: "orma-sub", text: "Nebeneinander, Nacheinander" }),
    h("p", { class: "orma-claim" }, h("strong", { text: "Zehn Minuten zu zweit. Zwei Sichtweisen. Ein neuer Gedanke." })),
    actions,
    ...extra,
    helpBlock(),
    h("p", { class: "orma-foot", text: `ORMA ${APP.version} · Inhalt ${CONTENT_VERSION} · kostenlos, ohne Anmeldung, ohne Werbung. Alles bleibt auf diesem Gerät.` }),
  );
}

function helpBlock() {
  return h("details", { class: "orma-help" },
    h("summary", { class: "orma-link", text: "So geht eine Runde" }),
    h("ol", {},
      h("li", { text: "Das Rad bringt zwei Menschen zusammen: eine Künstlerin oder einen Künstler und eine Theoretikerin oder einen Theoretiker." }),
      h("li", { text: "Ihr lest gemeinsam einen kurzen Einstieg und die Frage dazu. Theoriekenntnisse braucht ihr nicht." }),
      h("li", { text: "Ihr wählt zusammen einen Auftrag: ein Beispiel, einen Einwand oder etwas zum Machen." }),
      h("li", { text: "Zuerst antwortet die eine Person, dann gibt sie das Gerät weiter. Die zweite sieht die erste Antwort nicht. Mündlich antworten geht auch." }),
      h("li", { text: "Dann deckt ihr beide Antworten auf und denkt gemeinsam weiter. Einig werden müsst ihr euch nicht." }),
      h("li", { text: "Zum Schluss könnt ihr den Gedanken im Gedankenbuch behalten oder als Bild exportieren." }),
    ),
    h("p", { class: "orma-small", text: "Allein: Re-Entry. Du spielst beide Rollen, zu verschiedenen Zeiten. Beim ersten Mal antwortest du und lässt die Schleife offen. Bringt das Rad dieselbe Konstellation irgendwann wieder, antwortest du noch einmal, als spätere Version deiner selbst, ohne deine erste Antwort zu sehen. Dann legst du beide nebeneinander und hältst fest, was sich verändert hat: den dritten Gedanken." }),
    h("p", { class: "orma-small", text: "Etwa zehn Minuten, aber ohne Uhr. Es gibt keine richtigen oder falschen Antworten, keine Punkte und keine Wertung. Antworten dürfen vorläufig bleiben und der Paarung widersprechen." }),
    h("p", { class: "orma-small", text: "Installieren: im Browsermenü «App installieren» oder «Zum Startbildschirm hinzufügen» wählen, auf dem iPhone über «Teilen» und «Zum Home-Bildschirm». Danach funktioniert ORMA auch ohne Netz." }),
  );
}

function confirmView(message, yes, onYes, onNo) {
  show(
    h("h2", { text: "Sicher?" }),
    h("p", { text: message }),
    h("div", { class: "orma-actions" },
      btn(yes, onYes, "orma-btn orma-btn--danger"),
      btn("Abbrechen", onNo),
    ),
  );
}

// ---------- A. Beginnen ----------
function renderNames(prev = {}) {
  const a = h("input", { class: "orma-input", id: "orma-name-a", autocomplete: "off", maxlength: "40", placeholder: "Person A", value: prev.a || "" });
  const b = h("input", { class: "orma-input", id: "orma-name-b", autocomplete: "off", maxlength: "40", placeholder: "Person B", value: prev.b || "" });
  const start = () => {
    round = newRound({ names: { a: a.value.trim(), b: b.value.trim() } });
    persist();
    renderRound();
  };
  show(
    h("p", { class: "orma-kicker", text: "Zu zweit" }),
    h("h2", { text: "Wer spielt?" }),
    h("p", { class: "orma-muted", text: "Vornamen sind freiwillig." }),
    h("form", { onsubmit: e => { e.preventDefault(); start(); } },
      h("label", { class: "orma-field", for: "orma-name-a" }, h("span", { text: "Erste Person" }), a),
      h("label", { class: "orma-field", for: "orma-name-b" }, h("span", { text: "Zweite Person" }), b),
      h("div", { class: "orma-actions" }, h("button", { type: "submit", class: "orma-btn orma-btn--primary", text: "Beginnen" })),
    ),
  );
}

function startSolo() {
  round = newRound({ mode: "allein" });
  persist();
  renderRound();
}

// ---------- Runde ----------
function renderRound() {
  const p = byId.get(round.constellationId);
  if (round.step !== "drehen" && !p) { round.step = "drehen"; round.constellationId = ""; }
  ({
    drehen: renderSpin, wiedersehen: renderAgain, lesen: renderRead, wahl: renderChoice, offen: renderOpenLoop,
    "antwort-a": () => renderAnswer("a"), uebergabe: renderHandover, "antwort-b": () => renderAnswer("b"),
    aufdecken: renderReveal, weiterdenken: renderFurther, karte: renderResult, namen: () => renderNames(round.names),
  }[round.step] || renderSpin)();
}

// B. Drehen
function renderSpin() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "orma-wheel");
  svg.setAttribute("role", "button");
  svg.setAttribute("tabindex", "0");
  svg.setAttribute("aria-label", "Rad drehen");
  // je Ring jede Person einmal, auf ihrem Platz (eine Person kann in mehreren Konstellationen vorkommen)
  const ring = key => [...new Map(PILOT.map(p => [p[key].slot, { symbol: p[key].symbol }])).entries()].sort((x, y) => x[0] - y[0]).map(x => x[1]);
  const wheel = createWheel(svg, { outer: ring("artist"), inner: ring("theorist") });
  const pairBox = h("div", { class: "orma-pair-box", "aria-live": "polite" });
  const spinBtn = btn("Drehen", () => spin({ dir: 1, strength: 0.5 }), "orma-btn orma-btn--primary");
  const skipBtn = btn("Überspringen", () => wheel.skip(), "orma-btn orma-btn--quiet", { hidden: true });
  const goBtn = btn(solo(round) ? "Lesen" : "Gemeinsam lesen", () => go(round.loopId ? "wiedersehen" : "lesen"), "orma-btn orma-btn--primary", { hidden: true });

  const landed = p => {
    pairBox.replaceChildren(pairTitle(p));
    spinBtn.hidden = true; skipBtn.hidden = true; goBtn.hidden = false;
    svg.setAttribute("aria-label", `Rad: ${p.artist.name} und ${p.theorist.name}`);
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
    say(`Konstellation: ${p.artist.name} und ${p.theorist.name}.`);
    landed(p);
  }
  bindGesture(svg, g => spin(g));
  svg.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); spin({ dir: 1, strength: 0.5 }); } });

  show(
    h("p", { class: "orma-kicker", text: solo(round) ? "Allein · Re-Entry" : `${nameOf(round, "a")} und ${nameOf(round, "b")}` }),
    h("h2", { text: "Das Rad bringt zwei zusammen" }),
    h("p", { class: "orma-muted", text: solo(round) ? "Tippen oder wischen. Wie du drehst, bestimmt nur den Weg, nicht das Ergebnis." : "Tippen oder wischen. Wie ihr dreht, bestimmt nur den Weg, nicht das Ergebnis." }),
    h("div", { class: "orma-wheel-wrap" }, svg),
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
    h("p", { class: "orma-kicker", text: solo(round) ? (round.loopId ? "Zweiter Durchgang" : "Lesen") : "Gemeinsam lesen" }),
    h("h2", {}, p.artist.name, h("span", { class: "orma-x", text: " × " }), p.theorist.name),
    h("span", { class: "orma-label", text: "Zum Einstieg" }),
    h("p", { text: p.einstieg }),
    h("span", { class: "orma-label", text: "Frage" }),
    h("p", { class: "orma-question", text: p.question }),
    h("details", { class: "orma-origin" },
      h("summary", { text: "Originaltext der Konstellation" }),
      h("p", { text: p.text }),
      h("p", { class: "orma-small", text: `Aus «Nebeneinander, Nacheinander», Konstellation Nr. ${p.nr}. Der Einstieg oben ist eine Hinführung der ORMA-Redaktion, kein Zitat.` }),
    ),
    h("div", { class: "orma-actions" }, round.loopId
      ? btn("Noch einmal antworten", () => go("antwort-b"), "orma-btn orma-btn--primary")   // derselbe Auftrag wie beim ersten Mal
      : btn("Einen Auftrag wählen", () => go("wahl"), "orma-btn orma-btn--primary")),
  );
}

// Re-Entry: Wiedersehen mit einer offenen Schleife (nichts von der ersten Antwort)
function renderAgain() {
  const p = byId.get(round.constellationId);
  show(
    h("p", { class: "orma-kicker", text: "Re-Entry" }),
    h("h2", { text: "Du warst schon einmal hier" }),
    pairTitle(p),
    h("p", { text: `Am ${fmtDate(round.firstAt)} hat dich das Rad schon einmal zu dieser Konstellation gebracht. Jetzt antwortest du noch einmal: mit demselben Auftrag, als spätere Version deiner selbst, ohne deine erste Antwort zu sehen.` }),
    h("p", { class: "orma-small", text: "Danach legst du beide Antworten nebeneinander." }),
    h("div", { class: "orma-actions" }, btn("Lesen", () => go("lesen"), "orma-btn orma-btn--primary")),
  );
}

// Re-Entry: erster Durchgang abgeschlossen, die Schleife bleibt offen
function renderOpenLoop() {
  const p = byId.get(round.constellationId);
  const { ok } = openLoop(storage, round);
  const last = round.constellationId;
  if (ok) clearDraft(storage);
  show(
    ok ? null : h("p", { class: "orma-note", text: "Die Schleife liess sich auf diesem Gerät nicht speichern." }),
    h("p", { class: "orma-kicker", text: "Re-Entry" }),
    h("h2", { text: "Die Schleife ist offen" }),
    pairTitle(p),
    h("p", { text: "Deine Antwort ist auf diesem Gerät gespeichert. Sehen wirst du sie erst wieder im zweiten Durchgang: wenn das Rad dich irgendwann wieder zu dieser Konstellation bringt. Dann antwortest du noch einmal, als spätere Version deiner selbst." }),
    h("div", { class: "orma-actions" },
      btn("Weiter drehen", () => { round = newRound({ mode: "allein" }); persist(); saveText(storage, KEYS.last, last); renderRound(); }, "orma-btn orma-btn--primary"),
      btn("Zur Startansicht", () => { round = null; renderStart(); }, "orma-btn orma-btn--quiet"),
    ),
  );
}

// Auftrag wählen
function renderChoice() {
  const p = byId.get(round.constellationId);
  show(
    h("p", { class: "orma-kicker", text: "Spielauftrag" }),
    h("h2", { text: solo(round) ? "Was willst du damit machen?" : "Was wollt ihr damit machen?" }),
    h("p", { class: "orma-muted", text: solo(round) ? "Wähle einen Auftrag. Beim zweiten Durchgang gilt derselbe. Er ist eine Anregung von ORMA, keine Aussage der genannten Personen." : "Wählt gemeinsam einen Auftrag. Er ist eine Anregung von ORMA, keine Aussage der genannten Personen." }),
    h("div", { class: "orma-choice" },
      Object.entries(AUFTRAG).map(([key, label]) => h("button", {
        type: "button", class: "orma-option", "data-auftrag": key,
        onclick: () => { round.auftrag = key; go("antwort-a"); },
      }, h("strong", { text: label }), h("span", { text: p.auftraege[key] }))),
    ),
  );
}

const taskBox = p => h("div", { class: "orma-task" },
  h("span", { class: "orma-label", style: "margin-top:0", text: `Spielauftrag · ${AUFTRAG[round.auftrag] || ""}` }),
  h("p", { text: p.auftraege[round.auftrag] || "" }),
  h("p", { class: "orma-small", text: `Frage: ${p.question}` }));

// D. Getrennt antworten
function renderAnswer(k) {
  const p = byId.get(round.constellationId);
  const a = round.answers[k];
  const field = h("textarea", { class: "orma-text", id: `orma-answer-${k}`, maxlength: "4000", rows: "5", value: a.text });
  field.addEventListener("input", () => { a.text = field.value; persist(); });
  const next = () => (k === "a" ? go(solo(round) ? "offen" : "uebergabe") : go("aufdecken"));
  const write = [
    h("label", { class: "orma-field", for: `orma-answer-${k}` }, h("span", { text: "Dein Gedanke" }), field),
    h("p", { class: "orma-small", text: "Ein, zwei Sätze genügen. Vorläufiges ist willkommen, Widerspruch zur Paarung auch." }),
    h("div", { class: "orma-actions" },
      btn(k === "a" && !solo(round) ? "Fertig, Gerät weitergeben" : "Fertig", next, "orma-btn orma-btn--primary"),
      solo(round) ? null : btn("Ich antworte mündlich", () => { a.oral = true; persist(); renderAnswer(k); }),   // allein: die Antwort ist das, was bleibt
    ),
  ];
  const oral = [
    h("p", { class: "orma-note", text: "Du antwortest mündlich. Nichts wird aufgenommen; beim Aufdecken steht an deiner Stelle nur ein Hinweis." }),
    h("div", { class: "orma-actions" },
      btn(k === "a" ? "Weiter, Gerät weitergeben" : "Weiter", next, "orma-btn orma-btn--primary"),
      btn("Doch schreiben", () => { a.oral = false; persist(); renderAnswer(k); }),
    ),
  ];
  show(
    h("p", { class: "orma-kicker", text: solo(round) ? (k === "a" ? "Erster Durchgang" : "Zweiter Durchgang") : k === "a" ? "Zuerst" : "Dann" }),
    h("h2", { text: solo(round) ? (k === "a" ? "Du antwortest" : "Du antwortest noch einmal") : `${nameOf(round, k)} antwortet` }),
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
      h("h2", { text: `Gib das Gerät an ${nameOf(round, "b")}` }),
      h("p", { class: "orma-muted", text: "Die erste Antwort bleibt verborgen, bis ihr beide aufdeckt." }),
      h("div", { class: "orma-actions" }, btn(`Ich bin ${nameOf(round, "b")}`, () => go("antwort-b"), "orma-btn orma-btn--primary")),
    ),
  );
}

// E. Aufdecken
function answerCard(k, r = round) {
  const a = r.answers[k];
  return h("section", { class: "orma-answer", "data-person": k },
    h("h3", { text: nameOf(r, k) }),
    a.oral ? h("p", { class: "orma-oral", text: "hat mündlich geantwortet." })
      : h("p", { text: a.text.trim() || "(keine Notiz)" }));
}

function renderReveal() {
  if (!round.revealed) {
    show(
      h("p", { class: "orma-kicker", text: solo(round) ? "Zwei Durchgänge" : "Beide haben geantwortet" }),
      h("h2", { text: solo(round) ? "Jetzt aufdecken" : "Jetzt gemeinsam aufdecken" }),
      h("p", { class: "orma-muted", text: solo(round) ? `Deine Antwort vom ${fmtDate(round.firstAt)} und deine Antwort von heute.` : "Setzt euch so, dass ihr beide auf den Bildschirm seht." }),
      h("div", { class: "orma-actions" }, btn("Aufdecken", () => { round.revealed = true; go("aufdecken"); }, "orma-btn orma-btn--primary")),
    );
    return;
  }
  show(
    h("p", { class: "orma-kicker", text: "Aufgedeckt" }),
    h("h2", { text: solo(round) ? "Zwei Versionen" : "Zwei Sichtweisen" }),
    h("div", { class: "orma-answers orma-answers--two" }, answerCard("a"), answerCard("b")),
    h("p", { class: "orma-prompt", text: solo(round) ? "Was hat sich verändert?" : "Was hast du anders gesehen?" }),
    h("p", { class: "orma-small", text: solo(round) ? "Keine der beiden Antworten ist richtiger. Beide gehören dir, zu verschiedenen Zeiten." : "Sprecht darüber. Keine Antwort ist richtiger oder klüger als die andere." }),
    h("div", { class: "orma-actions" }, btn("Weiterdenken", () => go("weiterdenken"), "orma-btn orma-btn--primary")),
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
    const list = r.result.mode === "gemeinsam" ? [area("gemeinsam", "Unser neuer Gedanke", () => r.result.gemeinsam, v => { r.result.gemeinsam = v; })]
      : r.result.mode === "positionen" ? [
        area("position-a", `Position ${nameOf(r, "a")}`, () => r.result.a, v => { r.result.a = v; }),
        area("position-b", `Position ${nameOf(r, "b")}`, () => r.result.b, v => { r.result.b = v; }),
      ] : [];
    fields.replaceChildren(...list);
  };
  const radio = (mode, label) => h("label", { class: "orma-radio" },
    h("input", { type: "radio", name: "orma-mode", value: mode, checked: r.result.mode === mode, onchange: () => { r.result.mode = mode; persist(); drawFields(); } }),
    h("span", { text: label }));
  drawFields();
  if (solo(r)) {
    const third = area("dritter", "Der dritte Gedanke", () => r.result.gemeinsam, v => { r.result.gemeinsam = v; r.result.mode = v.trim() ? "gemeinsam" : ""; });
    show(
      h("p", { class: "orma-kicker", text: "Weiterdenken" }),
      h("h2", { text: "Was hat sich verändert?" }),
      h("p", { class: "orma-small", text: "Freiwillig. Beide Antworten bleiben, wie sie waren; hier kommt nur Neues dazu." }),
      area("veraendert", "Was hat sich zwischen den beiden Antworten verändert?", () => r.extensions.b, v => { r.extensions.b = v; }),
      third,
      h("div", { class: "orma-actions" }, btn("Zur Ergebniskarte", () => { closeLoop(storage, r.loopId); go("karte"); }, "orma-btn orma-btn--primary")),
    );
    return;
  }
  show(
    h("p", { class: "orma-kicker", text: "Weiterdenken" }),
    h("h2", { text: "Was verändert sich durch den Gedanken der anderen Person?" }),
    h("p", { class: "orma-small", text: "Freiwillig. Die ersten Antworten bleiben, wie sie waren; hier kommt nur Neues dazu." }),
    area("ergaenzung-a", `${nameOf(r, "a")} ergänzt`, () => r.extensions.a, v => { r.extensions.a = v; }),
    area("ergaenzung-b", `${nameOf(r, "b")} ergänzt`, () => r.extensions.b, v => { r.extensions.b = v; }),
    h("fieldset", { class: "orma-field", style: "border:0;padding:0;margin:1.4rem 0 0" },
      h("legend", { class: "orma-prompt", style: "padding:0", text: "Was haltet ihr fest?" }),
      radio("gemeinsam", "Einen gemeinsamen neuen Gedanken"),
      radio("positionen", "Zwei Positionen, die bleiben"),
      radio("", "Nichts festhalten"),
    ),
    fields,
    h("div", { class: "orma-actions" }, btn("Zur Ergebniskarte", () => go("karte"), "orma-btn orma-btn--primary")),
  );
}

// G. Abschliessen
function resultView(r, p) {
  const res = r.result;
  const parts = [
    h("p", { class: "orma-kicker", text: "ORMA" }),
    pairTitle(p),
    h("p", { class: "orma-question", text: p.question }),
  ];
  if (res.mode === "gemeinsam" && res.gemeinsam.trim()) parts.push(h("span", { class: "orma-label", text: solo(r) ? "Der dritte Gedanke" : "Unser neuer Gedanke" }), h("p", { text: res.gemeinsam.trim() }));
  if (res.mode === "positionen") {
    if (res.a.trim()) parts.push(h("span", { class: "orma-label", text: `Position ${nameOf(r, "a")}` }), h("p", { text: res.a.trim() }));
    if (res.b.trim()) parts.push(h("span", { class: "orma-label", text: `Position ${nameOf(r, "b")}` }), h("p", { text: res.b.trim() }));
  }
  const ext = ["a", "b"].filter(k => r.extensions[k].trim());
  return h("div", { class: "orma-result" }, parts,
    h("details", { class: "orma-origin" },
      h("summary", { text: solo(r) ? "Beide Antworten" : "Erste Antworten und Ergänzungen" }),
      r.auftrag ? h("p", { class: "orma-small", text: `Spielauftrag: ${AUFTRAG[r.auftrag]} – ${p.auftraege[r.auftrag]}` }) : null,
      h("div", { class: "orma-answers" }, answerCard("a", r), answerCard("b", r)),
      ext.map(k => h("p", {}, h("strong", { text: solo(r) ? "Was sich verändert hat: " : `${nameOf(r, k)} ergänzt: ` }), r.extensions[k].trim())),
    ));
}

function renderResult() {
  const p = byId.get(round.constellationId);
  const keep = btn(round.kept ? "Im Gedankenbuch" : "Im Gedankenbuch behalten", () => {
    const { ok } = keepRound(storage, round);
    if (ok) { round.kept = true; persist(); notice = "Im Gedankenbuch behalten."; renderResult(); }
    else { notice = "Speichern ist auf diesem Gerät gerade nicht möglich."; renderResult(); }
  }, "orma-btn orma-btn--primary", { disabled: round.kept });
  const last = round.constellationId;
  show(
    noticeNode(),
    h("h2", { text: solo(round) ? "Deine Karte" : "Eure Karte" }),
    resultView(round, p),
    h("div", { class: "orma-actions" },
      keep,
      btn("Karte exportieren", () => renderExport(round, renderResult)),
      btn("Noch eine Runde", () => { round = newRound({ names: round.names, mode: round.mode }); persist(); saveText(storage, KEYS.last, last); renderRound(); }),
      btn("Runde beenden", () => { clearDraft(storage); round = null; renderStart(); }, "orma-btn orma-btn--quiet"),
    ),
  );
}

// ---------- Ergebniskarte exportieren ----------
function renderExport(r, back) {
  const p = byId.get(r.constellationId);
  const opts = { names: false, answers: false, result: false };
  const hasResult = (r.result.mode === "gemeinsam" && r.result.gemeinsam.trim()) || (r.result.mode === "positionen" && (r.result.a.trim() || r.result.b.trim()));
  const img = h("img", { class: "orma-preview", alt: "Vorschau der Ergebniskarte" });
  const canvas = h("canvas");
  const measure = canvasMeasure();
  let blob = null;
  const shareBtn = btn("Teilen", async () => {
    try { await navigator.share({ files: [new File([blob], fileName(), { type: "image/png" })], title: "ORMA" }); } catch { /* abgebrochen */ }
  }, "orma-btn orma-btn--primary", { hidden: true });
  const save = h("a", { class: "orma-btn", download: fileName(), href: "#", text: "Bild speichern" });
  function fileName() { return `orma-${p.artist.id}-${p.theorist.id}.png`; }
  const update = () => {
    const layout = layoutCard({
      artist: p.artist.name, theorist: p.theorist.name, question: p.question, auftrag: r.auftrag,
      names: r.names, answers: r.answers, result: r.result, date: fmtDate(r.savedAt || r.startedAt),
      ...(solo(r) ? { labels: { a: nameOf(r, "a"), b: nameOf(r, "b") }, resultLabel: "Der dritte Gedanke" } : {}),
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
    h("p", { class: "orma-kicker", text: "Ergebniskarte" }),
    h("h2", { text: "Karte exportieren" }),
    h("p", { class: "orma-small", text: `Ohne Auswahl zeigt die Karte nur Paarung und Frage. Persönliches kommt nur dazu, wenn ${solo(r) ? "du es" : "ihr es"} hier anwählt.` }),
    solo(r)
      ? [check("result", hasResult ? "Den dritten Gedanken zeigen" : "Den dritten Gedanken zeigen (nichts festgehalten)", !hasResult),
        check("answers", "Beide Antworten zeigen")]
      : [check("result", hasResult ? "Unser Ergebnis zeigen" : "Unser Ergebnis zeigen (nichts festgehalten)", !hasResult),
        check("answers", "Die ersten Antworten zeigen"),
        check("names", "Unsere Namen zeigen")],
    img,
    h("div", { class: "orma-actions" }, shareBtn, save, btn("Zurück", back, "orma-btn orma-btn--quiet")),
  );
  update();
}

// ---------- Gedankenbuch ----------
function renderBook() {
  const { entries, error } = loadBook(storage);
  const { loops, error: loopError } = loadLoops(storage);
  if ((error || loopError) && !notice) notice = error || loopError;
  const damaged = loadText(storage, KEYS.bookDamaged);
  const list = entries.length
    ? h("ul", { class: "orma-book" }, entries.map(e => {
      const p = byId.get(e.constellationId);
      const title = p ? `${p.artist.name} × ${p.theorist.name}` : `Konstellation ${e.constellationId}`;
      return h("li", {},
        h("button", { type: "button", class: "orma-entry", onclick: () => renderEntry(e.id) },
          h("strong", { text: title }),
          h("span", { text: `${fmtDate(e.savedAt)}${solo(e) ? " · Re-Entry" : ""}${e.auftrag ? ` · ${AUFTRAG[e.auftrag]}` : ""}` })),
        h("button", {
          type: "button", class: "orma-fav", "aria-pressed": String(e.favorite), "aria-label": `Favorit: ${title}`, text: e.favorite ? "★" : "☆",
          onclick: () => { setFavorite(storage, e.id, !e.favorite); renderBook(); },
        }));
    }))
    : h("p", { class: "orma-muted", text: "Noch keine Gedanken. Nach einer Runde könnt ihr sie hier behalten." });

  // offene Schleifen: nur Paarung und Datum, die Antwort bleibt bis zum zweiten Durchgang verborgen
  const loopList = loops.length ? [
    h("span", { class: "orma-label", text: `Offene Schleifen (${loops.length})` }),
    h("p", { class: "orma-small", text: "Erste Durchgänge im Modus allein. Die Antwort bleibt verborgen, bis das Rad dieselbe Konstellation wieder bringt." }),
    h("ul", { class: "orma-book orma-loops" }, loops.map(l => {
      const p = byId.get(l.constellationId);
      const title = p ? `${p.artist.name} × ${p.theorist.name}` : `Konstellation ${l.constellationId}`;
      return h("li", {},
        h("div", { class: "orma-entry" }, h("strong", { text: title }), h("span", { text: `offen seit ${fmtDate(l.at)} · ${AUFTRAG[l.auftrag]}` })),
        h("button", {
          type: "button", class: "orma-fav", "aria-label": `Schleife löschen: ${title}`, text: "×",
          onclick: () => confirmView(`Die offene Schleife zu ${title} wird gelöscht, samt deiner ersten Antwort.`, "Löschen",
            () => { saveLoops(storage, loadLoops(storage).loops.filter(x => x.id !== l.id)); notice = "Schleife gelöscht."; renderBook(); }, renderBook),
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
    else if (!saveBook(storage, res.entries) || !saveLoops(storage, res.loops)) notice = "Die Einträge liessen sich auf diesem Gerät nicht speichern.";
    else notice = `${res.added} Eintrag/Einträge übernommen${res.loopsAdded ? `, ${res.loopsAdded} offene Schleife(n)` : ""}${res.skipped ? `, ${res.skipped} schon vorhanden (nicht überschrieben)` : ""}${res.invalid ? `, ${res.invalid} ungültig` : ""}.`;
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
    h("p", { class: "orma-kicker", text: "Gedankenbuch" }),
    h("h2", { text: "Unsere Gedanken" }),
    h("p", { class: "orma-small", text: "Deine Gedanken bleiben auf diesem Gerät. Beim Löschen der App-Daten können sie verloren gehen." }),
    list,
    loopList,
    h("div", { class: "orma-actions" },
      btn("Sicherung herunterladen", () => download(`orma-gedankenbuch-${today}.json`, JSON.stringify(makeBackup(entries, new Date(), loops), null, 2)), "orma-btn", { disabled: !entries.length && !loops.length }),
      h("label", { class: "orma-btn", for: "orma-import", tabindex: "0", onkeydown: e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); } } }, "Sicherung einlesen"),
      fileInput,
    ),
    damaged ? h("p", { class: "orma-small" }, "Ein früher beschädigter Inhalt wurde aufbewahrt. ",
      btn("Herunterladen", () => download(`orma-beschaedigt-${today}.txt`, damaged), "orma-link")) : null,
    h("div", { class: "orma-danger-zone" },
      btn("Alle ORMA-Einträge löschen", () => confirmView(
        `Alle ${entries.length} Einträge im Gedankenbuch${loops.length ? ` und ${loops.length} offene Schleife(n)` : ""} werden auf diesem Gerät gelöscht. Das lässt sich nicht rückgängig machen.`,
        "Ja, alle löschen", () => { deleteAllEntries(storage); notice = "Alle Einträge wurden gelöscht."; renderBook(); }, renderBook),
      "orma-btn orma-btn--danger", { disabled: !entries.length && !loops.length && !damaged }),
    ),
    h("div", { class: "orma-actions" }, btn("Zur Startansicht", renderStart, "orma-btn orma-btn--quiet")),
  );
}

function renderEntry(id) {
  const e = loadBook(storage).entries.find(x => x.id === id);
  if (!e) { renderBook(); return; }
  const p = byId.get(e.constellationId);
  if (!p) {
    show(h("h2", { text: "Eintrag" }), h("p", { text: `Dieser Eintrag gehört zu einer Konstellation (${e.constellationId}), die in dieser Fassung von ORMA nicht enthalten ist.` }),
      h("div", { class: "orma-actions" }, btn("Löschen", () => { deleteEntry(storage, id); renderBook(); }, "orma-btn orma-btn--danger"), btn("Zurück", renderBook)));
    return;
  }
  show(
    noticeNode(),
    h("p", { class: "orma-kicker", text: fmtDate(e.savedAt) }),
    h("h2", { text: "Aus dem Gedankenbuch" }),
    resultView(e, p),
    h("div", { class: "orma-actions" },
      btn(e.favorite ? "Favorit entfernen" : "Als Favorit markieren", () => { setFavorite(storage, id, !e.favorite); renderEntry(id); }),
      btn("Karte exportieren", () => renderExport(e, () => renderEntry(id))),
      btn("Eintrag löschen", () => confirmView("Dieser Eintrag wird gelöscht.", "Löschen", () => { deleteEntry(storage, id); notice = "Eintrag gelöscht."; renderBook(); }, () => renderEntry(id)), "orma-btn orma-btn--danger"),
      btn("Zurück", renderBook, "orma-btn orma-btn--quiet"),
    ),
  );
}

// ---------- Start der App ----------
document.querySelector(".orma-home").addEventListener("click", () => { persist(); round = null; renderStart(); });
addEventListener("pagehide", persist);
addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; if (!round && main.querySelector(".orma-claim")) renderStart(); });

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  addEventListener("load", () => { navigator.serviceWorker.register(new URL("../sw.js", import.meta.url)).catch(() => { /* ohne Offline-Betrieb weiter */ }); });
}

renderStart();
document.documentElement.dataset.ready = "1";
