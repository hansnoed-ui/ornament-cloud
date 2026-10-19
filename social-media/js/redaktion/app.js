// Social Media – Redaktion (seit 19. Oktober 2026): aus Bildschirmfoto, Bildern und Videos wird ein Zettel.
// Ablauf: Material ablegen → Claude liest (Text, Person, Zeit, Zahlen, Bereiche, Vorschläge) → prüfen, kommentieren, verschlagworten →
// veröffentlichen (ein Commit mit Medien, Daten, allen Seiten und der Sitemap) → nach etwa einer Minute online.
// Der Entwurf liegt laufend in IndexedDB; geht die Seite zu, ist beim nächsten Öffnen alles wieder da.
import { zettelInZeitleiste, pruefen, neueId, schlagwortListe, autorListe, titelVon, zeit, datum, auszug, zuerichVersatz, slug, esc, BEREICH, handleOhneAt } from "../darstellung.js";
import { ausAdresse, profilUrl, PLATTFORM_NAME } from "../quelle.js";
import { GitHub, GitHubFehler } from "./github.js";
import { zusammenstellen, DATEN } from "./zusammenstellen.js";
import { erkennen, ErkennenFehler } from "./erkennen.js";
import * as B from "./bilder.js";
import * as A from "./ablage.js";

const $ = (id) => document.getElementById(id);
const KENNZAHLEN_JE = {
  x: [["antworten", "Antworten"], ["reposts", "Reposts"], ["likes", "Likes"], ["lesezeichen", "Lesezeichen"], ["ansichten", "Ansichten"]],
  facebook: [["reaktionen", "Reaktionen"], ["kommentare", "Kommentare"], ["teilungen", "Teilungen"]],
  instagram: [["likes", "Likes"], ["kommentare", "Kommentare"], ["ansichten", "Aufrufe"]],
};
const MAX_VIDEO = 90 * 1024 * 1024, GROSSES_VIDEO = 25 * 1024 * 1024;

let einst = A.einstellungenLesen();
let sammlung = null;           // die Daten, wie zuletzt gelesen ({ eintraege })
let e = null;                   // der Entwurf (leer() beim Start)
let belegBild = null;           // ImageBitmap des Bildschirmfotos
let belegUrl = null;
const urls = new Map();         // Blob → Objektadresse (für Vorschau und Liste)
const ausschnitte = new Map();  // Bereich-id → { url, blob, breite, hoehe } (Vorschau der ausgeschnittenen Bilder)
let lesenAbbruch = null;

// ---------- Hilfen ----------

function leer() {
  return {
    version: 1, gespeichert: null, bearbeiten: null, dateien: [], bereiche: [], belegZeigen: true, vonHand: [],
    felder: { plattform: "", name: "", handle: "", profil: "", verifiziert: false, kontext: "", text: "", sprache: "", uebersetzung: "", quelle: "",
      veroeffentlicht: "", veroeffentlichtQuelle: "", erfasst: lokalJetzt(), status: "unbekannt", geprueft: "", titel: "", kommentar: "", zname: "", zhandle: "", ztext: "" },
    kennzahlen: {}, schlagworte: [], verweise: [], alt: {}, vorschlaege: [], hinweise: "", entfernt: [], belegSha: null,
  };
}
const zwei = (n) => String(n).padStart(2, "0");
function lokalJetzt() { const d = new Date(); d.setSeconds(0, 0); return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}T${zwei(d.getHours())}:${zwei(d.getMinutes())}`; }
const lokalNachIso = (t) => { const d = new Date(t); return Number.isNaN(+d) ? "" : d.toISOString().replace(/:\d\d\.\d{3}Z$/, ":00Z"); };
const isoNachLokal = (iso) => { const d = new Date(iso); return Number.isNaN(+d) ? lokalJetzt() : `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}T${zwei(d.getHours())}:${zwei(d.getMinutes())}`; };
const kurzId = () => Math.random().toString(36).slice(2, 9);
const url = (blob) => { if (!urls.has(blob)) urls.set(blob, URL.createObjectURL(blob)); return urls.get(blob); };
const groesse = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** «2026-10-18 14:03» (Zürcher Zeit) oder «2026-10-18» → ISO (UTC) bzw. Tag; leer → ""; unlesbar → null */
export function zuerichNachIso(text) {
  const t = String(text ?? "").trim();
  if (!t) return "";
  let m = t.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (m) return m[3] ? `${m[1]}-${m[2]}-${m[3]}` : `${m[1]}-${m[2]}`;
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const wand = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const ms = wand - zuerichVersatz(wand - 60 * 60_000) * 60_000;
  return new Date(ms).toISOString().replace(/:\d\d\.\d{3}Z$/, ":00Z");
}
/** ISO → «2026-10-18 14:03» in Zürcher Zeit (Tag und Monat bleiben, wie sie sind) */
export function isoNachZuerich(iso) {
  const z = zeit(iso);
  if (!z) return "";
  if (z.genau === "monat") return `${z.j}-${zwei(z.m)}`;
  if (z.genau === "tag") return `${z.j}-${zwei(z.m)}-${zwei(z.t)}`;
  return `${z.j}-${zwei(z.m)}-${zwei(z.t)} ${zwei(z.h)}:${zwei(z.min)}`;
}

function gh() { return einst.github ? new GitHub({ schluessel: einst.github, repo: einst.repo, zweig: einst.zweig }) : null; }

// ---------- Einstellungen ----------

function einstellungenZeigen() {
  $("gh-schluessel").value = einst.github ?? "";
  $("an-schluessel").value = einst.anthropic ?? "";
  $("gh-repo").value = einst.repo ?? "hansnoed-ui/ornament-cloud";
  $("gh-zweig").value = einst.zweig ?? "main";
  $("merken").checked = !!einst.merken;
  $("repo-name").textContent = einst.repo;
  const teile = [einst.github ? "GitHub bereit" : "GitHub-Schlüssel fehlt", einst.anthropic ? "Claude bereit" : "ohne Claude"];
  $("zustand").textContent = teile.join(", ");
  $("einstellungen").open = !einst.github;
  knoepfe();
}
function einstellungenUebernehmen() {
  einst = { github: $("gh-schluessel").value.trim(), anthropic: $("an-schluessel").value.trim(), repo: $("gh-repo").value.trim() || "hansnoed-ui/ornament-cloud", zweig: $("gh-zweig").value.trim() || "main", merken: $("merken").checked };
  A.einstellungenSchreiben(einst);
  einstellungenZeigen();
}
async function verbindungPruefen() {
  einstellungenUebernehmen();
  const m = $("einstellungen-meldung");
  const zeilen = [];
  m.textContent = "Prüfe …";
  try { const r = await gh()?.pruefen(); zeilen.push(r ? `GitHub: ${r.name}, Zweig ${r.zweig}, Schreiben erlaubt.` : "GitHub: kein Schlüssel."); }
  catch (err) { zeilen.push(`GitHub: ${err.message}`); }
  zeilen.push(einst.anthropic ? (/^sk-ant-/.test(einst.anthropic) ? "Anthropic: Schlüssel hinterlegt (geprüft wird beim ersten Lesen)." : "Anthropic: Der Schlüssel sieht nicht aus wie sk-ant-…") : "Anthropic: kein Schlüssel – die Felder füllst du von Hand.");
  m.textContent = zeilen.join(" ");
  await sammlungLaden();
}

// ---------- Sammlung (bestehende Zettel) ----------

async function sammlungLaden() {
  try {
    const g = gh();
    const text = g ? await g.lesen(DATEN) : await (await fetch(`../daten/eintraege.json?t=${Date.now()}`, { cache: "no-store" })).text();
    sammlung = JSON.parse(text ?? '{"eintraege":[]}');
  } catch (err) {
    sammlung ??= { eintraege: [] };
    $("alle-meldung").textContent = `Die Sammlung konnte nicht gelesen werden: ${err.message}`;
  }
  listenFuellen();
  alleZeigen();
  vorschau();
}
function listenFuellen() {
  const alle = sammlung?.eintraege ?? [];
  $("liste-schlagworte").innerHTML = schlagwortListe(alle).map((s) => `<option value="${esc(s.wort)}">`).join("");
  $("liste-namen").innerHTML = autorListe(alle).map((a) => `<option value="${esc(a.autor.name)}">${esc(PLATTFORM_NAME[a.plattform])}${a.autor.handle ? ` @${esc(String(a.autor.handle).replace(/^@/, ""))}` : ""}</option>`).join("");
  const ziel = $("f-verweis-ziel");
  ziel.innerHTML = `<option value="">Zettel wählen …</option>${[...alle].sort((a, b) => b.nr - a.nr).filter((x) => x.id !== e.bearbeiten?.id).map((x) => `<option value="${esc(x.id)}">${x.nr}: ${esc(titelVon(x))}</option>`).join("")}`;
}

// ---------- Dateien ----------

async function dateienAufnehmen(liste) {
  const meldungen = [];
  for (const f of liste) {
    if (f.type.startsWith("video/")) {
      if (f.size > MAX_VIDEO) { meldungen.push(`${f.name}: zu gross (${groesse(f.size)}; höchstens 90 MB).`); continue; }
      if (f.size > GROSSES_VIDEO) meldungen.push(`${f.name}: ${groesse(f.size)} – das geht, macht die Website aber schwer. Besser vorher verkleinern.`);
      if (f.type === "video/quicktime") meldungen.push(`${f.name}: MOV spielt nicht in allen Browsern; MP4 ist sicherer.`);
      e.dateien.push({ schluessel: kurzId(), name: f.name, typ: "video", mime: f.type, blob: f });
    } else if (f.type.startsWith("image/")) {
      const istBeleg = !e.dateien.some((d) => d.typ === "beleg") && !(e.bearbeiten?.beleg && !e.dateien.length);
      e.dateien.push({ schluessel: kurzId(), name: f.name || "Bild aus der Zwischenablage", typ: istBeleg ? "beleg" : "bild", mime: f.type, blob: f });
      if (istBeleg) e.belegSha = await B.sha256(f);
    } else meldungen.push(`${f.name}: dieses Format nimmt die Redaktion nicht (Bilder, MP4, WebM).`);
  }
  $("lesen-meldung").textContent = meldungen.join(" ");
  await belegLaden();
  dateienZeigen();
  geaendert();
}
async function belegLaden() {
  const d = e.dateien.find((x) => x.typ === "beleg");
  belegBild?.close?.();
  belegBild = d ? await B.bitmap(d.blob) : null;
  belegUrl = d ? url(d.blob) : null;
  $("schritt-beleg").hidden = !d;
  if (d) $("beleg-bild").src = belegUrl;
  bereicheZeigen();
  await ausschnitteErneuern();
}
function dateienZeigen() {
  $("dateiliste").innerHTML = e.dateien.map((d) => `<li data-schluessel="${d.schluessel}">
    ${d.typ === "video" ? `<span class="rd-daumen rd-daumen--video" aria-hidden="true">▶</span>` : `<img class="rd-daumen" src="${url(d.blob)}" alt="">`}
    <span class="rd-datei-name">${esc(d.name)} <span class="leise">${groesse(d.blob.size)}</span></span>
    ${d.typ === "video" ? `<span class="leise">Video</span>` : `<select aria-label="Rolle von ${esc(d.name)}" data-rolle><option value="beleg"${d.typ === "beleg" ? " selected" : ""}>Beleg (Bildschirmfoto)</option><option value="bild"${d.typ === "bild" ? " selected" : ""}>Bild des Beitrags</option></select>`}
    <button type="button" class="knopf-leise" data-entfernen aria-label="${esc(d.name)} entfernen">Entfernen</button>
  </li>`).join("");
  $("lesen").disabled = !e.dateien.some((d) => d.typ === "beleg") || !einst.anthropic;
  $("lesen").title = !einst.anthropic ? "Dafür braucht es den Anthropic-Schlüssel (Einstellungen)." : "";
}

// ---------- Bereiche im Bildschirmfoto ----------

const BEREICH_NAME = { bild: "Bild", video: "Bild", avatar: "Profilbild", dritte: "Schwärzen" };
function bereicheZeigen() {
  let n = 0;
  $("bereiche").innerHTML = e.bereiche.map((r) => {
    const name = r.art === "bild" || r.art === "video" ? `Bild ${++n}` : BEREICH_NAME[r.art];
    return `<div class="rd-bereich rd-bereich--${r.art === "video" ? "bild" : r.art}" data-id="${r.id}" style="left:${(r.x * 100).toFixed(3)}%;top:${(r.y * 100).toFixed(3)}%;width:${(r.b * 100).toFixed(3)}%;height:${(r.h * 100).toFixed(3)}%">
      <span class="rd-bereich-name">${name}</span><button type="button" class="rd-bereich-weg" data-weg aria-label="${name} entfernen">×</button><span class="rd-bereich-ecke" data-ecke aria-hidden="true"></span></div>`;
  }).join("");
}
function leinwandBedienen() {
  const feld = $("leinwand"), lagen = $("bereiche");
  let zug = null;
  const punkt = (ev) => { const r = lagen.getBoundingClientRect(); return { x: Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height)) }; };
  feld.addEventListener("pointerdown", (ev) => {
    if (ev.button !== 0 || ev.target.closest("[data-weg]")) return;
    const p = punkt(ev), box = ev.target.closest(".rd-bereich");
    const r = box && e.bereiche.find((x) => x.id === box.dataset.id);
    if (r && ev.target.closest("[data-ecke]")) zug = { art: "gross", r, start: p, alt: { ...r } };
    else if (r) zug = { art: "schieben", r, start: p, alt: { ...r } };
    else {
      const art = document.querySelector('input[name="werkzeug"]:checked').value;
      const neu = { id: kurzId(), art, x: p.x, y: p.y, b: 0, h: 0, beschreibung: "", von: "hand" };
      e.bereiche.push(neu);
      zug = { art: "neu", r: neu, start: p };
    }
    feld.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  });
  feld.addEventListener("pointermove", (ev) => {
    if (!zug) return;
    const p = punkt(ev), r = zug.r;
    if (zug.art === "neu") { r.x = Math.min(p.x, zug.start.x); r.y = Math.min(p.y, zug.start.y); r.b = Math.abs(p.x - zug.start.x); r.h = Math.abs(p.y - zug.start.y); }
    else if (zug.art === "schieben") { r.x = Math.min(1 - r.b, Math.max(0, zug.alt.x + p.x - zug.start.x)); r.y = Math.min(1 - r.h, Math.max(0, zug.alt.y + p.y - zug.start.y)); }
    else { r.b = Math.max(0.02, Math.min(1 - r.x, zug.alt.b + p.x - zug.start.x)); r.h = Math.max(0.005, Math.min(1 - r.y, zug.alt.h + p.y - zug.start.y)); }
    bereicheZeigen();
  });
  const ende = () => {
    if (!zug) return;
    if (zug.art === "neu" && (zug.r.b < 0.02 || zug.r.h < 0.005)) e.bereiche = e.bereiche.filter((x) => x !== zug.r);
    zug = null;
    bereicheZeigen();
    ausschnitteErneuern().then(geaendert);
  };
  feld.addEventListener("pointerup", ende);
  feld.addEventListener("pointercancel", ende);
  lagen.addEventListener("click", (ev) => {
    const weg = ev.target.closest("[data-weg]");
    if (!weg) return;
    const id = weg.closest(".rd-bereich").dataset.id;
    e.bereiche = e.bereiche.filter((x) => x.id !== id);
    bereicheZeigen();
    ausschnitteErneuern().then(geaendert);
  });
}

/** die Leinwand mit den Schwärzungen (volle Grösse) */
const geschwaerzt = () => B.geschwaerzt(belegBild, e.bereiche.filter((r) => r.art === "dritte"));

async function ausschnitteErneuern() {
  for (const a of ausschnitte.values()) URL.revokeObjectURL(a.url);
  ausschnitte.clear();
  if (!belegBild) return;
  const c = geschwaerzt();
  for (const r of e.bereiche.filter((x) => x.art !== "dritte")) {
    const a = await B.ausschnitt(c, r, r.art === "avatar" ? B.AVATAR : B.MAX_BILD, { quadratisch: r.art === "avatar" });
    ausschnitte.set(r.id, { ...a, url: URL.createObjectURL(a.blob) });
  }
}

// ---------- Medien des Beitrags (aus Dateien, Bereichen und, beim Bearbeiten, den bestehenden) ----------

/** [{ schluessel, quelle: "bestehend"|"datei"|"bereich", typ: "bild"|"video", vorschau, breite, hoehe, alt, ... }] in der Reihenfolge des Beitrags */
function medienEntwurf() {
  const liste = [];
  for (const m of e.bearbeiten?.medien ?? []) if (!e.entfernt.includes(m.datei)) liste.push({ schluessel: `b:${m.datei}`, quelle: "bestehend", typ: m.typ, vorschau: `../${m.datei}`, poster: m.poster ? `../${m.poster}` : null, breite: m.breite, hoehe: m.hoehe, alt: e.alt[`b:${m.datei}`] ?? m.alt ?? "", m });
  for (const d of e.dateien.filter((x) => x.typ === "bild" || x.typ === "video")) liste.push({ schluessel: `d:${d.schluessel}`, quelle: "datei", typ: d.typ, vorschau: url(d.blob), alt: e.alt[`d:${d.schluessel}`] ?? "", d });
  for (const r of e.bereiche.filter((x) => x.art === "bild" || x.art === "video")) {
    const a = ausschnitte.get(r.id);
    if (a) liste.push({ schluessel: `r:${r.id}`, quelle: "bereich", typ: "bild", vorschau: a.url, breite: a.breite, hoehe: a.hoehe, alt: e.alt[`r:${r.id}`] ?? r.beschreibung ?? "", r });
  }
  return liste;
}
function medienZeigen() {
  const liste = medienEntwurf();
  $("medien-feld").hidden = !liste.length;
  const offen = document.activeElement?.closest?.("#medienliste") ? document.activeElement.dataset.alt : null;
  $("medienliste").innerHTML = liste.map((m, i) => `<li>
    ${m.typ === "video" ? `<span class="rd-daumen rd-daumen--video" aria-hidden="true">▶</span>` : `<img class="rd-daumen" src="${esc(m.vorschau)}" alt="">`}
    <label class="rd-alt"><span>${m.typ === "video" ? "Video" : "Bild"} ${i + 1}${m.quelle === "bereich" ? " (aus dem Bildschirmfoto)" : m.quelle === "bestehend" ? " (veröffentlicht)" : ""}: Beschreibung</span><textarea rows="2" data-alt="${esc(m.schluessel)}">${esc(m.alt)}</textarea></label>
    ${m.quelle === "bestehend" ? `<button type="button" class="knopf-leise" data-medium-weg="${esc(m.m.datei)}">Entfernen</button>` : ""}
  </li>`).join("");
  if (offen) $("medienliste").querySelector(`[data-alt="${CSS.escape(offen)}"]`)?.focus();
}

// ---------- Formular ----------

const FELDER = { name: "f-name", handle: "f-handle", profil: "f-profil", kontext: "f-kontext", text: "f-text", sprache: "f-sprache", uebersetzung: "f-uebersetzung", quelle: "f-quelle",
  veroeffentlicht: "f-veroeffentlicht", erfasst: "f-erfasst", status: "f-status", geprueft: "f-geprueft", titel: "f-titel", kommentar: "f-kommentar", zname: "f-zname", zhandle: "f-zhandle", ztext: "f-ztext" };

function formularFuellen() {
  for (const [k, id] of Object.entries(FELDER)) if ($(id) !== document.activeElement) $(id).value = e.felder[k] ?? "";   // das Feld, in dem man schreibt, bleibt unberührt
  $("f-verifiziert").checked = !!e.felder.verifiziert;
  for (const r of document.querySelectorAll('input[name="plattform"]')) r.checked = r.value === e.felder.plattform;
  $("beleg-zeigen").checked = e.belegZeigen;
  kennzahlenZeigen();
  schlagworteZeigen();
  verweiseZeigen();
  quelleInfo();
  dateienZeigen();
  medienZeigen();
  bearbeitenHinweis();
}
function kennzahlenZeigen() {
  const p = e.felder.plattform;
  $("kennzahlen").innerHTML = p ? KENNZAHLEN_JE[p].map(([k, n]) => `<label><span>${n}</span><input type="number" min="0" step="1" inputmode="numeric" data-zahl="${k}" value="${e.kennzahlen[k] ?? ""}"></label>`).join("") : `<p class="rd-hilfe">Erst die Plattform wählen.</p>`;
}
function schlagworteZeigen() {
  $("schlagworte").innerHTML = e.schlagworte.map((s) => `<span class="rd-marke">${esc(s)}<button type="button" data-schlagwort-weg="${esc(s)}" aria-label="${esc(s)} entfernen">×</button></span>`).join("");
  const offen = e.vorschlaege.filter((s) => !e.schlagworte.includes(s));
  $("vorschlaege").hidden = !offen.length;
  $("vorschlaege").innerHTML = offen.length ? `Vorschläge: ${offen.map((s) => `<button type="button" class="rd-vorschlag" data-vorschlag="${esc(s)}">+ ${esc(s)}</button>`).join(" ")}` : "";
}
function verweiseZeigen() {
  const alle = sammlung?.eintraege ?? [];
  $("verweise").innerHTML = e.verweise.map((v) => { const z = alle.find((x) => x.id === v.id); return `<li>${esc({ antwort: "Antwort auf", widerspruch: "Widerspruch zu", ergaenzung: "Ergänzung zu", kontext: "Kontext:", fortsetzung: "Fortsetzung von" }[v.art])} ${z ? `Zettel ${z.nr}: ${esc(titelVon(z))}` : esc(v.id)} <button type="button" class="knopf-leise" data-verweis-weg="${esc(v.id)}">Entfernen</button></li>`; }).join("");
}
function quelleInfo() {
  const a = ausAdresse(e.felder.quelle, Date.now());
  const teile = [];
  if (a.plattform) teile.push(PLATTFORM_NAME[a.plattform]);
  if (a.handle) teile.push(`@${a.handle}`);
  if (a.veroeffentlicht) teile.push(`veröffentlicht ${datum(a.veroeffentlicht)} (aus der Beitrags-ID errechnet)`);
  $("quelle-info").textContent = e.felder.quelle ? (teile.length ? `Erkannt: ${teile.join(", ")}.` : "Diese Adresse gehört zu keiner der drei Plattformen.") : "Aus der Adresse liest die Redaktion Plattform, Handle und – bei X und Instagram – die genaue Zeit der Veröffentlichung.";
  const v = zeit(zuerichNachIso(e.felder.veroeffentlicht));
  $("veroeffentlicht-info").textContent = e.felder.veroeffentlicht ? (v ? `${datum(zuerichNachIso(e.felder.veroeffentlicht))}${e.felder.veroeffentlichtQuelle === "adresse" ? ", aus der Adresse" : e.felder.veroeffentlichtQuelle === "bild" ? ", aus dem Bild gelesen" : ""}` : "Unlesbar: JJJJ-MM-TT oder JJJJ-MM-TT hh:mm") : "Zürcher Zeit.";
}
function bearbeitenHinweis() {
  const h = $("bearbeiten-hinweis");
  h.hidden = !e.bearbeiten;
  if (e.bearbeiten) h.innerHTML = `Du bearbeitest <strong>Zettel ${e.bearbeiten.nr}</strong>. <button type="button" class="knopf-leise" data-neu>Stattdessen einen neuen Zettel</button>`;
}

/** Feld geändert (von Hand): merken, damit Claude es nicht überschreibt */
function feldGeaendert(k, wert) {
  e.felder[k] = wert;
  if (!e.vonHand.includes(k)) e.vonHand.push(k);
  if (k === "quelle") quelleAnwenden();
  if (k === "handle" && !e.vonHand.includes("profil")) { e.felder.profil = profilUrl(e.felder.plattform, wert) ?? ""; $("f-profil").value = e.felder.profil; }
  if (k === "veroeffentlicht") { e.felder.veroeffentlichtQuelle = "hand"; quelleInfo(); }
  geaendert();
}
/** aus der Adresse: Plattform, Handle, Profil, Zeit – setzt nur, was noch nicht von Hand steht */
function quelleAnwenden() {
  const a = ausAdresse(e.felder.quelle, Date.now());
  if (a.plattform && !e.vonHand.includes("plattform")) e.felder.plattform = a.plattform;
  if (a.handle && !e.vonHand.includes("handle")) e.felder.handle = a.handle;
  if (a.profil && !e.vonHand.includes("profil")) e.felder.profil = a.profil;
  if (a.veroeffentlicht && !e.vonHand.includes("veroeffentlicht")) { e.felder.veroeffentlicht = isoNachZuerich(a.veroeffentlicht); e.felder.veroeffentlichtQuelle = "adresse"; }
  const aktiv = document.activeElement;
  formularFuellen();
  aktiv?.focus?.();
}

// ---------- Claude ----------

async function lesen() {
  const m = $("lesen-meldung");
  if (!belegBild) return;
  lesenAbbruch = new AbortController();
  $("lesen").disabled = true; $("lesen-abbrechen").hidden = false;
  try {
    m.textContent = "Bildschirmfoto vorbereiten …";
    const teile = await B.teileFuerClaude(geschwaerzt());
    const alle = sammlung?.eintraege ?? [];
    const erfasst = lokalNachIso(e.felder.erfasst);
    const { ergebnis: r, nutzung } = await erkennen({
      schluessel: einst.anthropic, teile, signal: lesenAbbruch.signal, melden: (t) => { m.textContent = t; },
      kontext: { erfasst, erfasstText: datum(erfasst), adresse: e.felder.quelle || null, ausAdresse: ausAdresse(e.felder.quelle, Date.now()),
        schlagworte: schlagwortListe(alle).map((s) => s.wort), autoren: autorListe(alle).slice(0, 60).map((a) => `${a.autor.name}${a.autor.handle ? ` (@${String(a.autor.handle).replace(/^@/, "")}, ${PLATTFORM_NAME[a.plattform]})` : ""}`) },
    });
    await uebernehmen(r);
    const kosten = nutzung ? ((nutzung.input_tokens ?? 0) * 4 + (nutzung.output_tokens ?? 0) * 20) / 1e6 : 0;
    m.textContent = `Gelesen. Bitte alles prüfen${r.text_abgeschnitten ? " – der Text ist im Bild abgeschnitten" : ""}.${r.hinweise ? ` Hinweis von Claude: ${r.hinweise}` : ""}${nutzung ? ` (${nutzung.input_tokens + nutzung.output_tokens} Token, etwa ${kosten.toFixed(3).replace(".", ",")} $)` : ""}`;
  } catch (err) {
    m.textContent = err instanceof ErkennenFehler ? err.message : `Claude konnte nicht lesen: ${err.message}`;
  } finally {
    lesenAbbruch = null;
    $("lesen-abbrechen").hidden = true;
    dateienZeigen();
  }
}
/** Claudes Ergebnis ins Formular (nur, was nicht von Hand steht) */
async function uebernehmen(r) {
  const setzen = (k, v) => { if (!e.vonHand.includes(k) && v !== null && v !== undefined) e.felder[k] = v; };
  const a = ausAdresse(e.felder.quelle, Date.now());
  setzen("plattform", a.plattform ?? (r.plattform !== "unklar" ? r.plattform : null));
  setzen("name", r.autor?.name);
  setzen("handle", (a.handle ?? r.autor?.handle)?.replace(/^@/, ""));
  if (!e.vonHand.includes("verifiziert")) e.felder.verifiziert = !!r.autor?.verifiziert;
  if (!e.vonHand.includes("profil")) e.felder.profil = profilUrl(e.felder.plattform, e.felder.handle) ?? e.felder.profil;
  setzen("kontext", r.kontext ?? "");
  setzen("text", r.text);
  setzen("sprache", r.sprache);
  setzen("uebersetzung", r.sprache && r.sprache !== "de" ? r.uebersetzung ?? "" : "");
  if (!e.vonHand.includes("veroeffentlicht")) {
    if (a.veroeffentlicht) { e.felder.veroeffentlicht = isoNachZuerich(a.veroeffentlicht); e.felder.veroeffentlichtQuelle = "adresse"; }
    else if (r.veroeffentlicht?.iso && zeit(r.veroeffentlicht.iso)) { e.felder.veroeffentlicht = isoNachZuerich(r.veroeffentlicht.iso); e.felder.veroeffentlichtQuelle = "bild"; }
  }
  if (r.zitiert) { setzen("zname", r.zitiert.name ?? ""); setzen("zhandle", (r.zitiert.handle ?? "").replace(/^@/, "")); setzen("ztext", r.zitiert.text ?? ""); }
  for (const [k, v] of Object.entries(r.kennzahlen ?? {})) if (v !== null && !e.vonHand.includes(`zahl:${k}`)) e.kennzahlen[k] = v;
  setzen("titel", e.felder.titel || r.titel);
  e.vorschlaege = r.schlagworte ?? [];
  if (!e.schlagworte.length) e.schlagworte = [...new Set(e.vorschlaege)].slice(0, 5);
  // Bereiche: Claudes ersetzen Claudes, von Hand gezogene bleiben
  e.bereiche = [...e.bereiche.filter((x) => x.von === "hand"), ...(r.bereiche ?? []).map((x) => ({ ...x, id: kurzId(), von: "claude" }))];
  e.hinweise = r.hinweise ?? "";
  bereicheZeigen();
  await ausschnitteErneuern();
  formularFuellen();
  geaendert();
}

// ---------- Eintrag bauen ----------

/** der Eintrag aus dem Entwurf; medien/beleg/avatar/karte kommen von aussen (Vorschau: Objektadressen, Veröffentlichen: Pfade) */
function eintragAus({ nr, id, medien, beleg, avatar, karte }) {
  const f = e.felder;
  const iso = zuerichNachIso(f.veroeffentlicht);
  const kennzahlen = {};
  for (const [k] of KENNZAHLEN_JE[f.plattform] ?? []) kennzahlen[k] = e.kennzahlen[k] === "" || e.kennzahlen[k] === undefined || e.kennzahlen[k] === null ? null : Math.max(0, Math.round(+e.kennzahlen[k]));
  const zitiert = f.zname.trim() || f.ztext.trim() ? { autor: { name: f.zname.trim() || null, handle: f.zhandle.trim().replace(/^@/, "") || null }, text: f.ztext.trim() || null } : null;
  return {
    nr, id,
    plattform: f.plattform || null,
    kontext: f.kontext.trim() || null,
    titel: f.titel.trim() || null,
    autor: { name: f.name.trim(), handle: f.handle.trim().replace(/^@/, "") || null, profil: f.profil.trim() || profilUrl(f.plattform, f.handle) || null, verifiziert: !!f.verifiziert, avatar: avatar ?? null },
    quelle: f.quelle.trim() || null,
    veroeffentlicht: iso || null,
    veroeffentlichtQuelle: iso ? f.veroeffentlichtQuelle || "hand" : null,
    erfasst: lokalNachIso(f.erfasst),
    sprache: /^[a-z]{2}$/.test(f.sprache.trim()) ? f.sprache.trim() : null,
    uebersetzung: f.uebersetzung.trim() || null,
    text: f.text.replace(/\r/g, "").replace(/\s+$/, ""),
    medien,
    zitiert,
    kennzahlen,
    beleg: beleg ?? null,
    karte: karte ?? null,
    kommentar: f.kommentar.replace(/\r/g, "").trim(),
    schlagworte: [...e.schlagworte],
    verweise: e.verweise.map((v) => ({ ...v })),
    status: f.status || "unbekannt",
    geprueft: f.geprueft || null,
  };
}

function vorschauEintrag() {
  const alle = sammlung?.eintraege ?? [];
  const nr = e.bearbeiten?.nr ?? neueId(alle, e.felder.titel || "vorschau").nr;
  const medien = medienEntwurf().map((m) => ({ typ: m.typ, datei: m.vorschau, breite: m.breite, hoehe: m.hoehe, alt: m.alt, poster: m.poster }));
  const avatarBereich = e.bereiche.find((r) => r.art === "avatar");
  const avatar = avatarBereich && ausschnitte.get(avatarBereich.id) ? ausschnitte.get(avatarBereich.id).url : e.bearbeiten?.autor?.avatar ? `../${e.bearbeiten.autor.avatar}` : null;
  const x = eintragAus({ nr, id: e.bearbeiten?.id ?? `${nr}-vorschau`, medien, avatar });
  if (!x.erfasst) x.erfasst = new Date().toISOString();
  return x;
}

let vorschauZeit = 0;
function vorschau() {
  clearTimeout(vorschauZeit);
  vorschauZeit = setTimeout(() => {
    const x = vorschauEintrag();
    try {
      $("vorschau").innerHTML = x.plattform && x.autor.name && x.erfasst && zeit(x.erfasst) ? zettelInZeitleiste(x) : `<li class="rd-leer">Hier erscheint der Zettel, sobald Plattform, Name und Text stehen.</li>`;
    } catch (err) { $("vorschau").innerHTML = `<li class="rd-leer">Vorschau: ${esc(err.message)}</li>`; }
  }, 120);
}

function fehlerJetzt() {
  const x = vorschauEintrag();
  const id = e.bearbeiten?.id ?? neueId(sammlung?.eintraege ?? [], x.titel || titelVon(x)).id;
  return pruefen({ ...x, id, medien: x.medien.map((m) => ({ ...m, datei: "medien/1/bild-1.webp" })) }, []);
}
function knoepfe() {
  const fehler = fehlerJetzt();
  $("veroeffentlichen").disabled = !einst.github || fehler.length > 0;
  $("veroeffentlichen").textContent = e.bearbeiten ? "Änderungen veröffentlichen" : "Veröffentlichen";
  const f = $("fehler");
  const zeigen = fehler.length && (e.felder.text || e.dateien.length || e.bearbeiten);
  f.hidden = !zeigen && einst.github;
  f.textContent = !einst.github ? "Zum Veröffentlichen braucht es den GitHub-Schlüssel (Einstellungen)." : zeigen ? `Noch offen: ${fehler.join(" ")}` : "";
}

// ---------- Entwurf sichern ----------

let sichernZeit = 0;
function geaendert() {
  vorschau();
  knoepfe();
  clearTimeout(sichernZeit);
  sichernZeit = setTimeout(async () => {
    e.gespeichert = new Date().toISOString();
    await A.entwurfSchreiben(e);
    $("entwurf-stand").textContent = `Entwurf gesichert, ${datum(e.gespeichert)}.`;
  }, 600);
}
async function entwurfLaden() {
  const d = await A.entwurfLesen();
  if (!d || d.version !== 1) return;
  e = { ...leer(), ...d, felder: { ...leer().felder, ...d.felder } };
  await belegLaden();
  formularFuellen();
  $("entwurf-stand").textContent = `Entwurf vom ${datum(e.gespeichert)} wiederhergestellt.`;
}
async function verwerfen(frage = true) {
  if (frage && (e.dateien.length || e.felder.text || e.felder.kommentar) && !confirm("Den Entwurf verwerfen? Hochgeladenes und Geschriebenes gehen verloren.")) return;
  for (const u of urls.values()) URL.revokeObjectURL(u);
  urls.clear();
  e = leer();
  await A.entwurfLoeschen();
  await belegLaden();
  formularFuellen();
  listenFuellen();
  $("lesen-meldung").textContent = "";
  $("fortschritt").innerHTML = "";
  geaendert();
}

// ---------- Veröffentlichen ----------

function schritt(text, art = "") {
  const li = document.createElement("li");
  li.textContent = text;
  if (art) li.className = `rd-${art}`;
  $("fortschritt").append(li);
  return li;
}

/** die Medien des Zettels als Dateien (Namen ohne Ordner) und die Angaben dazu */
async function medienErzeugen(nr) {
  const dateien = [];   // [name, bytes]
  const vorhanden = new Set([...(e.bearbeiten?.medien ?? []).flatMap((m) => [m.datei, m.poster]), e.bearbeiten?.autor?.avatar, e.bearbeiten?.beleg?.datei].filter(Boolean).map((p) => p.split("/").pop()));
  const frei = (stamm, endung) => { let i = 1; while (vorhanden.has(`${stamm}-${i}.${endung}`)) i++; const n = `${stamm}-${i}.${endung}`; vorhanden.add(n); return n; };
  const ordner = `medien/${nr}/`;
  const medien = [];
  for (const m of medienEntwurf()) {
    if (m.quelle === "bestehend") { medien.push({ ...m.m, alt: m.alt }); continue; }
    if (m.quelle === "datei" && m.typ === "video") {
      const endung = m.d.mime === "video/webm" ? "webm" : "mp4";
      const info = await B.videoStandbild(m.d.blob);
      const name = frei("video", endung), poster = name.replace(/\.\w+$/, ".jpg");
      dateien.push([name, await B.bytes(m.d.blob)], [poster, await B.bytes(info.poster.blob)]);
      medien.push({ typ: "video", datei: ordner + name, poster: ordner + poster, breite: info.breite, hoehe: info.hoehe, alt: m.alt });
      continue;
    }
    const neu = m.quelle === "datei" ? await B.bildNeu(m.d.blob) : ausschnitte.get(m.r.id);
    const name = frei("bild", "webp");
    dateien.push([name, await B.bytes(neu.blob)]);
    medien.push({ typ: "bild", datei: ordner + name, breite: neu.breite, hoehe: neu.hoehe, alt: m.alt });
  }
  // Profilbild
  let avatar = e.bearbeiten?.autor?.avatar ?? null, avatarBitmap = null;
  const ab = e.bereiche.find((r) => r.art === "avatar");
  if (ab && ausschnitte.get(ab.id)) {
    const name = vorhanden.has("avatar.webp") && avatar ? `avatar-${Date.now().toString(36)}.webp` : "avatar.webp";
    dateien.push([name, await B.bytes(ausschnitte.get(ab.id).blob)]);
    avatar = ordner + name;
    avatarBitmap = await B.bitmap(ausschnitte.get(ab.id).blob);
  } else if (avatar) {
    try { avatarBitmap = await B.bitmap(await (await fetch(`../${avatar}`)).blob()); } catch {}
  }
  // Beleg
  let beleg = e.bearbeiten?.beleg ?? null;
  const belegDatei = e.dateien.find((d) => d.typ === "beleg");
  if (belegDatei && e.belegZeigen) {
    const b = await B.verkleinert(geschwaerzt(), B.MAX_BELEG, { nachBreite: true });
    const name = beleg ? `beleg-${Date.now().toString(36)}.webp` : "beleg.webp";
    dateien.push([name, await B.bytes(b.blob)]);
    beleg = { datei: ordner + name, breite: b.breite, hoehe: b.hoehe, sha256: e.belegSha, geschwaerzt: e.bereiche.some((r) => r.art === "dritte") };
  } else if (!e.belegZeigen) beleg = null;
  return { dateien, medien, avatar, avatarBitmap, beleg };
}

async function veroeffentlichen() {
  const g = gh();
  if (!g) return;
  $("fortschritt").innerHTML = "";
  $("veroeffentlichen").disabled = true;
  const bearbeiten = e.bearbeiten;
  try {
    let erzeugt = null, ergebnis = null, eintrag = null;
    for (let versuch = 1; versuch <= 3; versuch++) {
      const s1 = schritt(versuch === 1 ? "Stand der Website lesen …" : "Der Zweig hat sich inzwischen verändert. Noch einmal …");
      const [stand, datenText, sitemap] = await Promise.all([g.stand(""), g.lesen(DATEN), g.lesen("sitemap.xml")]);
      const daten = JSON.parse(datenText ?? '{"version":1,"eintraege":[]}');
      sammlung = daten;
      s1.className = "rd-ok";
      const x0 = eintragAus({ nr: 0, id: "", medien: [] });
      const { nr, id } = bearbeiten ? { nr: bearbeiten.nr, id: bearbeiten.id } : neueId(daten.eintraege, x0.titel || titelVon(x0));
      if (!erzeugt || erzeugt.nr !== nr) {
        const s2 = schritt("Bilder vorbereiten (schwärzen, ausschneiden, ohne Metadaten) …");
        erzeugt = { nr, ...(await medienErzeugen(nr)) };
        s2.className = "rd-ok";
      }
      eintrag = eintragAus({ nr, id, medien: erzeugt.medien, beleg: erzeugt.beleg, avatar: erzeugt.avatar });
      eintrag.geaendert = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
      const karte = await B.vorschaukarte({ nr, titel: titelVon(eintrag), plattform: eintrag.plattform, name: eintrag.autor.name, handle: handleOhneAt(eintrag), auszug: auszug(eintrag.text, 150), avatar: erzeugt.avatarBitmap });
      eintrag.karte = { datei: `medien/${nr}/karte.jpg`, breite: karte.breite, hoehe: karte.hoehe };
      ergebnis = zusammenstellen({ daten: datenText ?? '{"version":1,"eintraege":[]}', sitemap, aenderung: { art: "speichern", eintrag }, vorhandene: [...stand.dateien.keys()] });
      if (ergebnis.fehler.length) throw new Error(ergebnis.fehler.join(" "));
      for (const [name, bytes] of erzeugt.dateien) ergebnis.schreiben.set(`${BEREICH}medien/${nr}/${name}`, bytes);
      ergebnis.schreiben.set(`${BEREICH}medien/${nr}/karte.jpg`, await B.bytes(karte.blob));
      const s3 = schritt("Commit schreiben …");
      try {
        const sha = await g.commit({ stand, schreiben: ergebnis.schreiben, loeschen: ergebnis.loeschen, nachricht: `Social Media: Zettel ${nr}${bearbeiten ? " geändert" : ""} – ${titelVon(eintrag)}\n\n${PLATTFORM_NAME[eintrag.plattform]}, ${eintrag.autor.name}${eintrag.autor.handle ? ` (@${eintrag.autor.handle})` : ""}. Aus der Redaktion (social-media/redaktion/).`, fortschritt: (t) => { s3.textContent = `Commit schreiben … ${t}`; } });
        s3.textContent = sha ? `Commit ${sha.slice(0, 7)} auf ${einst.zweig}.` : "Nichts zu ändern.";
        s3.className = "rd-ok";
        break;
      } catch (err) {
        if (err instanceof GitHubFehler && err.status === 409 && versuch < 3) { s3.className = "rd-warten"; continue; }
        throw err;
      }
    }
    sammlung = ergebnis.daten;
    await A.entwurfLoeschen();
    const s4 = schritt("Warten, bis GitHub Pages den Zettel online stellt (meist eine Minute) …", "warten");
    const ziel = `../${eintrag.id}/`;
    const online = await warten(() => istOnline(eintrag));
    s4.className = online ? "rd-ok" : "rd-warten";
    s4.innerHTML = online ? `Online: <a href="${esc(ziel)}">Zettel ${eintrag.nr} öffnen</a>` : `Noch nicht online. Der Commit ist geschrieben; <a href="${esc(ziel)}">Zettel ${eintrag.nr}</a> erscheint gleich.`;
    const meldung = $("fortschritt").innerHTML;
    await verwerfen(false);
    $("fortschritt").innerHTML = meldung;
    alleZeigen();
  } catch (err) {
    schritt(err.message, "fehler");
  } finally {
    knoepfe();
  }
}

async function istOnline(eintrag) {
  try {
    const r = await fetch(`../daten/eintraege.json?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return false;
    const d = await r.json();
    return eintrag ? d.eintraege?.some((x) => x.id === eintrag.id && x.geaendert === eintrag.geaendert) : true;
  } catch { return false; }
}
async function warten(pruefe, { alle = 6000, hoechstens = 240_000 } = {}) {
  const ende = Date.now() + hoechstens;
  while (Date.now() < ende) { if (await pruefe()) return true; await new Promise((r) => setTimeout(r, alle)); }
  return false;
}

// ---------- Alle Zettel: bearbeiten, löschen ----------

function alleZeigen() {
  const alle = [...(sammlung?.eintraege ?? [])].sort((a, b) => b.nr - a.nr);
  $("alle").innerHTML = alle.length ? alle.map((x) => `<li>
    <span class="rd-alle-nr">${x.nr}</span>
    <span class="rd-alle-titel"><a href="../${esc(x.id)}/">${esc(titelVon(x))}</a><span class="leise">${esc(PLATTFORM_NAME[x.plattform])}, ${esc(x.autor?.name ?? "")}, gesichert ${esc(datum(x.erfasst, { uhr: false }))}</span></span>
    <span class="rd-alle-tun"><button type="button" class="knopf-leise" data-bearbeiten="${esc(x.id)}">Bearbeiten</button> <button type="button" class="knopf-leise" data-loeschen="${esc(x.id)}">Löschen</button></span>
  </li>`).join("") : `<li class="rd-leer">Noch keine Zettel.</li>`;
}

async function bearbeiten(id) {
  const x = sammlung?.eintraege?.find((y) => y.id === id);
  if (!x) return;
  if ((e.dateien.length || e.felder.text) && !e.bearbeiten && !confirm("Der aktuelle Entwurf wird verworfen. Weiter?")) return;
  await verwerfen(false);
  e.bearbeiten = structuredClone(x);
  e.vonHand = Object.keys(FELDER).concat(["plattform", "verifiziert"]);
  Object.assign(e.felder, {
    plattform: x.plattform, name: x.autor?.name ?? "", handle: x.autor?.handle ?? "", profil: x.autor?.profil ?? "", verifiziert: !!x.autor?.verifiziert,
    kontext: x.kontext ?? "", text: x.text ?? "", sprache: x.sprache ?? "", uebersetzung: x.uebersetzung ?? "", quelle: x.quelle ?? "",
    veroeffentlicht: x.veroeffentlicht ? isoNachZuerich(x.veroeffentlicht) : "", veroeffentlichtQuelle: x.veroeffentlichtQuelle ?? "",
    erfasst: isoNachLokal(x.erfasst), status: x.status ?? "unbekannt", geprueft: x.geprueft ?? "", titel: x.titel ?? "", kommentar: x.kommentar ?? "",
    zname: x.zitiert?.autor?.name ?? "", zhandle: x.zitiert?.autor?.handle ?? "", ztext: x.zitiert?.text ?? "",
  });
  e.kennzahlen = { ...(x.kennzahlen ?? {}) };
  e.schlagworte = [...(x.schlagworte ?? [])];
  e.verweise = (x.verweise ?? []).map((v) => ({ ...v }));
  e.belegZeigen = true;
  reiter("neu");
  listenFuellen();
  formularFuellen();
  geaendert();
  scrollTo({ top: 0 });
}

async function loeschen(id) {
  const g = gh();
  const x = sammlung?.eintraege?.find((y) => y.id === id);
  if (!g || !x) { $("alle-meldung").textContent = "Zum Löschen braucht es den GitHub-Schlüssel."; return; }
  if (!confirm(`Zettel ${x.nr} «${titelVon(x)}» löschen? Seite, Medien und Verweise darauf verschwinden mit einem Commit.`)) return;
  const m = $("alle-meldung");
  try {
    for (let versuch = 1; versuch <= 3; versuch++) {
      m.textContent = "Löschen …";
      const [stand, datenText, sitemap] = await Promise.all([g.stand(""), g.lesen(DATEN), g.lesen("sitemap.xml")]);
      const r = zusammenstellen({ daten: datenText, sitemap, aenderung: { art: "loeschen", id }, vorhandene: [...stand.dateien.keys()] });
      if (r.fehler.length) throw new Error(r.fehler.join(" "));
      try {
        await g.commit({ stand, schreiben: r.schreiben, loeschen: r.loeschen, nachricht: `Social Media: Zettel ${x.nr} gelöscht – ${titelVon(x)}` });
        sammlung = r.daten;
        break;
      } catch (err) { if (!(err instanceof GitHubFehler && err.status === 409 && versuch < 3)) throw err; }
    }
    m.textContent = `Zettel ${x.nr} ist gelöscht; die Website zieht in etwa einer Minute nach.`;
    listenFuellen();
    alleZeigen();
  } catch (err) { m.textContent = `Löschen ging nicht: ${err.message}`; }
}

// ---------- Reiter ----------

function reiter(welcher) {
  for (const [r, a] of [["reiter-neu", "ansicht-neu"], ["reiter-alle", "ansicht-alle"]]) {
    const an = r === `reiter-${welcher}`;
    $(r).setAttribute("aria-selected", String(an));
    $(r).tabIndex = an ? 0 : -1;
    $(a).hidden = !an;
  }
}

// ---------- Ereignisse ----------

function verbinden() {
  for (const id of ["gh-schluessel", "an-schluessel", "gh-repo", "gh-zweig", "merken"]) $(id).addEventListener("change", () => { einstellungenUebernehmen(); dateienZeigen(); });
  $("pruefen").addEventListener("click", verbindungPruefen);
  $("vergessen").addEventListener("click", () => { A.einstellungenLoeschen(); einst = A.einstellungenLesen(); einstellungenZeigen(); dateienZeigen(); $("einstellungen-meldung").textContent = "Die Schlüssel sind aus diesem Browser gelöscht."; });

  $("reiter-neu").addEventListener("click", () => reiter("neu"));
  $("reiter-alle").addEventListener("click", () => { reiter("alle"); sammlungLaden(); });
  for (const t of document.querySelectorAll('[role="tab"]')) t.addEventListener("keydown", (ev) => { if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") { const n = t.id === "reiter-neu" ? "alle" : "neu"; reiter(n); $(`reiter-${n}`).focus(); } });

  // Material: wählen, ziehen, einfügen
  $("dateien").addEventListener("change", (ev) => { dateienAufnehmen([...ev.target.files]); ev.target.value = ""; });
  const ablage = $("ablage");
  ablage.addEventListener("dragover", (ev) => { ev.preventDefault(); ablage.classList.add("rd-ablage--ziel"); });
  ablage.addEventListener("dragleave", () => ablage.classList.remove("rd-ablage--ziel"));
  ablage.addEventListener("drop", (ev) => { ev.preventDefault(); ablage.classList.remove("rd-ablage--ziel"); dateienAufnehmen([...ev.dataTransfer.files]); });
  document.addEventListener("paste", (ev) => {
    const dateien = [...(ev.clipboardData?.files ?? [])];
    if (!dateien.length) return;
    if (ev.target.closest?.("textarea, input:not([type=file])") && !dateien.some((f) => f.type.startsWith("image/"))) return;
    ev.preventDefault();
    dateienAufnehmen(dateien.map((f, i) => (f.name && f.name !== "image.png" ? f : new File([f], `Einfügen ${new Date().toLocaleTimeString("de-CH")}${i ? ` (${i + 1})` : ""}.png`, { type: f.type }))));
  });
  $("dateiliste").addEventListener("change", async (ev) => {
    const sel = ev.target.closest("[data-rolle]");
    if (!sel) return;
    const d = e.dateien.find((x) => x.schluessel === sel.closest("li").dataset.schluessel);
    if (sel.value === "beleg") { for (const x of e.dateien) if (x.typ === "beleg") x.typ = "bild"; e.belegSha = await B.sha256(d.blob); }
    d.typ = sel.value;
    await belegLaden(); dateienZeigen(); medienZeigen(); geaendert();
  });
  $("dateiliste").addEventListener("click", async (ev) => {
    if (!ev.target.closest("[data-entfernen]")) return;
    const k = ev.target.closest("li").dataset.schluessel;
    const d = e.dateien.find((x) => x.schluessel === k);
    e.dateien = e.dateien.filter((x) => x !== d);
    if (d.typ === "beleg") { e.bereiche = []; e.belegSha = null; }
    await belegLaden(); dateienZeigen(); medienZeigen(); geaendert();
  });
  $("lesen").addEventListener("click", lesen);
  $("lesen-abbrechen").addEventListener("click", () => lesenAbbruch?.abort());
  $("beleg-zeigen").addEventListener("change", (ev) => { e.belegZeigen = ev.target.checked; geaendert(); });
  leinwandBedienen();

  // Felder
  for (const [k, id] of Object.entries(FELDER)) $(id).addEventListener("input", (ev) => feldGeaendert(k, ev.target.value));
  $("f-verifiziert").addEventListener("change", (ev) => feldGeaendert("verifiziert", ev.target.checked));
  for (const r of document.querySelectorAll('input[name="plattform"]')) r.addEventListener("change", () => {
    feldGeaendert("plattform", r.value);
    if (!e.vonHand.includes("profil")) { e.felder.profil = profilUrl(r.value, e.felder.handle) ?? ""; $("f-profil").value = e.felder.profil; }
    kennzahlenZeigen();
  });
  $("kennzahlen").addEventListener("input", (ev) => { const k = ev.target.dataset.zahl; if (!k) return; e.kennzahlen[k] = ev.target.value === "" ? null : +ev.target.value; if (!e.vonHand.includes(`zahl:${k}`)) e.vonHand.push(`zahl:${k}`); geaendert(); });
  $("medienliste").addEventListener("input", (ev) => { const k = ev.target.dataset.alt; if (!k) return; e.alt[k] = ev.target.value; geaendert(); });
  $("medienliste").addEventListener("click", (ev) => { const b = ev.target.closest("[data-medium-weg]"); if (!b) return; e.entfernt.push(b.dataset.mediumWeg); medienZeigen(); geaendert(); });

  // Schlagworte
  const neuesWort = () => {
    const w = $("f-schlagwort").value.replace(/[,;#]/g, " ").replace(/\s+/g, " ").trim();
    if (!w) return;
    const vorhanden = schlagwortListe(sammlung?.eintraege ?? []).find((s) => slug(s.wort) === slug(w));   // dieselbe Schreibweise wie bisher
    const wort = vorhanden?.wort ?? (w[0].toUpperCase() + w.slice(1));
    if (!e.schlagworte.some((s) => slug(s) === slug(wort))) e.schlagworte.push(wort);
    $("f-schlagwort").value = "";
    schlagworteZeigen(); geaendert();
  };
  $("f-schlagwort").addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === ",") { ev.preventDefault(); neuesWort(); } });
  $("f-schlagwort").addEventListener("change", neuesWort);
  $("schlagworte").addEventListener("click", (ev) => { const b = ev.target.closest("[data-schlagwort-weg]"); if (!b) return; e.schlagworte = e.schlagworte.filter((s) => s !== b.dataset.schlagwortWeg); schlagworteZeigen(); geaendert(); });
  $("vorschlaege").addEventListener("click", (ev) => { const b = ev.target.closest("[data-vorschlag]"); if (!b) return; e.schlagworte.push(b.dataset.vorschlag); schlagworteZeigen(); geaendert(); });

  // Verweise
  $("f-verweis-ziel").addEventListener("change", (ev) => {
    const id = ev.target.value;
    if (id && !e.verweise.some((v) => v.id === id)) e.verweise.push({ id, art: $("f-verweis-art").value });
    ev.target.value = "";
    verweiseZeigen(); geaendert();
  });
  $("verweise").addEventListener("click", (ev) => { const b = ev.target.closest("[data-verweis-weg]"); if (!b) return; e.verweise = e.verweise.filter((v) => v.id !== b.dataset.verweisWeg); verweiseZeigen(); geaendert(); });

  $("veroeffentlichen").addEventListener("click", veroeffentlichen);
  $("verwerfen").addEventListener("click", () => verwerfen(true));
  $("bearbeiten-hinweis").addEventListener("click", (ev) => { if (ev.target.closest("[data-neu]")) verwerfen(true); });
  $("alle").addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-bearbeiten]"), l = ev.target.closest("[data-loeschen]");
    if (b) bearbeiten(b.dataset.bearbeiten);
    if (l) loeschen(l.dataset.loeschen);
  });
  $("formular").addEventListener("submit", (ev) => ev.preventDefault());
}

// ---------- Start ----------

e = leer();
verbinden();
einstellungenZeigen();
formularFuellen();
await entwurfLaden();
await sammlungLaden();
geaendert();
document.body.classList.add("rd-bereit");
