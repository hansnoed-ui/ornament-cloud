// Aufnahme: einen Tab, ein Fenster oder den Bildschirm freigeben (getDisplayMedia), einen Ausschnitt
// aufziehen und ihn mit MediaRecorder als Video sichern. Nichts verlässt den Browser.
//
// Zwei Wege zum Video:
// – Chrome und Edge: Bild für Bild über MediaStreamTrackProcessor → OffscreenCanvas → MediaStreamTrackGenerator.
//   Hängt an den Bildern der Quelle, nicht an der Anzeige, und läuft darum auch, wenn diese Seite im Hintergrund ist.
// – sonst: das Video der Quelle auf eine Leinwand zeichnen (requestVideoFrameCallback oder requestAnimationFrame)
//   und deren captureStream aufnehmen; dafür muss diese Seite sichtbar bleiben.
// MediaRecorder lässt die Länge im Dateikopf offen; The Fictory trägt sie nach (gleiche Versionsmarke wie dort)
import { mitDauer } from "../the-fictory/dauer.js?v=21";
import { FORMATE, einpassen, umformen, aufziehen, verschieben, ganz, ausgabe, bitrate, dateiname, formate, dauerText } from "./rahmen.js";

const $ = (id) => document.getElementById(id);
const seite = $("aufnahme"), video = $("video"), vorschau = $("vorschau"), rahmen = $("rahmen");
const knopfQuelle = $("quelle"), knopfBeenden = $("beenden"), knopfStart = $("start"), knopfGanz = $("ganz");
const wahlGroesse = $("groesse"), wahlFps = $("fps"), wahlDatei = $("datei"), wahlDauer = $("dauer"), vorlauf = $("vorlauf");
const uhr = $("uhr"), info = $("info"), meldung = $("meldung"), zaehler = $("zaehler");
const formatKnoepfe = [...document.querySelectorAll("[data-format]")];

const NATIV = "MediaStreamTrackProcessor" in window && "MediaStreamTrackGenerator" in window && "VideoFrame" in window && "OffscreenCanvas" in window;

let quelle = null;               // MediaStream der Freigabe
let b = 0, h = 0;                // Grösse der Quelle in Pixeln
let ausschnitt = null;           // { x, y, w, h } in Pixeln der Quelle
let format = "frei";
let lauf = null;                 // laufende Aufnahme
let film = null;                 // { url } der letzten Aufnahme

const dateiFormate = window.MediaRecorder ? formate((t) => MediaRecorder.isTypeSupported(t)) : [];
for (const f of dateiFormate) wahlDatei.add(new Option(f.name, f.typ));

if (!navigator.mediaDevices?.getDisplayMedia || !dateiFormate.length) {
  $("kaputt").hidden = false;
  knopfQuelle.disabled = true;
}

function melden(text, fehler = false) {
  meldung.textContent = text;
  meldung.classList.toggle("fehler", fehler);
}

// ——— Seite in neuem Tab öffnen ———
$("oeffnen").addEventListener("submit", (e) => {
  e.preventDefault();
  let url = $("url").value.trim();
  if (!url) return;
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  window.open(url, "_blank", "noopener");
  melden("Seite geöffnet. Jetzt «Quelle wählen» und diesen Tab freigeben.");
});

// ——— Quelle wählen ———
knopfQuelle.addEventListener("click", async () => {
  const fps = Number(wahlFps.value);
  const controller = "CaptureController" in window ? new CaptureController() : undefined;
  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "browser", frameRate: { ideal: fps, max: fps }, cursor: "never" },
      audio: false,
      preferCurrentTab: false,
      selfBrowserSurface: "exclude",
      surfaceSwitching: "include",
      ...(controller ? { controller } : {}),
    });
  } catch (fehler) {
    melden(fehler?.name === "NotAllowedError" ? "Keine Quelle freigegeben." : `Freigabe nicht möglich: ${fehler?.message ?? fehler}`, fehler?.name !== "NotAllowedError");
    return;
  }
  // diese Seite vorne lassen (Chrome, Edge), damit man den Ausschnitt gleich aufziehen kann
  try { controller?.setFocusBehavior("no-focus-change"); } catch { /* Bildschirm oder zu spät: dann eben nicht */ }
  beenden();
  quelle = stream;
  const spur = stream.getVideoTracks()[0];
  spur.addEventListener("ended", () => { beenden(); melden("Die Freigabe ist beendet."); });
  video.srcObject = stream;
  await video.play().catch(() => {});
  if (!video.videoWidth) await new Promise((r) => video.addEventListener("loadedmetadata", r, { once: true }));
  quelleGroesse();
  const art = { browser: "Tab", window: "Fenster", monitor: "Bildschirm" }[spur.getSettings().displaySurface];
  melden(`${art ?? "Quelle"} freigegeben. Ziehe den Ausschnitt auf und starte die Aufnahme.`);
  $("leer").hidden = true;
  vorschau.hidden = false;
  knopfBeenden.hidden = false;
  knopfStart.disabled = false;
  anzeigen();
});

knopfBeenden.addEventListener("click", () => { beenden(); melden("Die Freigabe ist beendet."); });

/** Freigabe und laufende Aufnahme beenden, zurück zum Anfang */
function beenden() {
  if (lauf) stopp();
  quelle?.getTracks().forEach((t) => t.stop());
  quelle = null;
  video.srcObject = null;
  vorschau.hidden = true;
  $("leer").hidden = false;
  knopfBeenden.hidden = true;
  knopfStart.disabled = true;
  ausschnitt = null;
  info.textContent = "";
}

/** die Quelle hat (neu) eine Grösse: Vorschau anpassen, Ausschnitt mitnehmen */
function quelleGroesse() {
  const nb = video.videoWidth, nh = video.videoHeight;
  if (!nb || !nh) return;
  if (ausschnitt && b && h && (nb !== b || nh !== h)) {
    const fx = nb / b, fy = nh / h;
    ausschnitt = { x: ausschnitt.x * fx, y: ausschnitt.y * fy, w: ausschnitt.w * fx, h: ausschnitt.h * fy };
    ausschnitt = umformen(ausschnitt, nb, nh, FORMATE[format]);
  }
  b = nb; h = nh;
  if (!ausschnitt) ausschnitt = einpassen(b, h, FORMATE[format]);
  vorschau.style.aspectRatio = `${b} / ${h}`;
  vorschau.style.width = `min(100%, calc(70vh * ${b / h}))`;
  anzeigen();
}
video.addEventListener("resize", quelleGroesse);
window.addEventListener("resize", () => anzeigen());

/** Rahmen, Masse und Angaben zum Video nachführen */
function anzeigen() {
  if (!ausschnitt || !b) return;
  const s = vorschau.clientWidth / b;
  Object.assign(rahmen.style, {
    left: `${ausschnitt.x * s}px`, top: `${ausschnitt.y * s}px`,
    width: `${ausschnitt.w * s}px`, height: `${ausschnitt.h * s}px`,
  });
  const r = ganz(ausschnitt, b, h);
  $("masse").textContent = `${r.w} × ${r.h}`;
  if (!lauf) {
    const aus = ausgabe(r.w, r.h, wahlGroesse.value, FORMATE[format]);
    const typ = gewaehlt();
    info.textContent = `Video: ${aus.w} × ${aus.h} · ${typ?.name ?? ""} · ${wahlFps.value} Bilder/s`;
  }
}

const gewaehlt = () => dateiFormate.find((f) => f.typ === wahlDatei.value);
for (const el of [wahlGroesse, wahlDatei]) el.addEventListener("change", () => anzeigen());
wahlFps.addEventListener("change", () => {
  const fps = Number(wahlFps.value);
  quelle?.getVideoTracks()[0]?.applyConstraints({ frameRate: { ideal: fps, max: fps } }).catch(() => {});
  anzeigen();
});

// ——— Format und ganzes Bild ———
for (const k of formatKnoepfe) {
  k.addEventListener("click", () => {
    if (lauf) return;
    format = k.dataset.format;
    for (const a of formatKnoepfe) a.setAttribute("aria-pressed", String(a === k));
    if (ausschnitt) ausschnitt = umformen(ausschnitt, b, h, FORMATE[format]);
    anzeigen();
  });
}
knopfGanz.addEventListener("click", () => {
  if (lauf || !b) return;
  ausschnitt = einpassen(b, h, FORMATE[format]);
  anzeigen();
});

// ——— Ausschnitt mit Maus, Stift oder Finger ———
let zug = null;
const ort = (e) => {
  const box = vorschau.getBoundingClientRect(), s = b / box.width;
  return { x: Math.min(Math.max((e.clientX - box.left) * s, 0), b), y: Math.min(Math.max((e.clientY - box.top) * s, 0), h) };
};
vorschau.addEventListener("pointerdown", (e) => {
  if (lauf || !ausschnitt || e.button > 0) return;
  const p = ort(e), r = ausschnitt, ecke = e.target.dataset?.ecke;
  if (ecke) {
    // die gegenüberliegende Ecke bleibt stehen
    zug = { art: "ziehen", ax: ecke.includes("w") ? r.x + r.w : r.x, ay: ecke.includes("n") ? r.y + r.h : r.y };
  } else if (e.target.closest(".rahmen") && (r.w < b * 0.97 || r.h < h * 0.97)) {
    // schieben, solange es Platz dafür gibt; über dem ganzen Bild zieht man einen neuen auf
    zug = { art: "schieben", dx: p.x - r.x, dy: p.y - r.y };
  } else {
    zug = { art: "neu", ax: p.x, ay: p.y, sx: e.clientX, sy: e.clientY, alt: r };
  }
  vorschau.setPointerCapture(e.pointerId);
  e.preventDefault();
});
vorschau.addEventListener("pointermove", (e) => {
  if (!zug) return;
  const p = ort(e);
  if (zug.art === "schieben") {
    ausschnitt = verschieben({ ...ausschnitt, x: p.x - zug.dx, y: p.y - zug.dy }, b, h);
  } else {
    // ein neuer Ausschnitt entsteht erst, wenn sich der Zeiger wirklich bewegt (sonst bleibt ein Klick folgenlos)
    if (zug.art === "neu" && Math.hypot(e.clientX - zug.sx, e.clientY - zug.sy) < 6) return;
    ausschnitt = aufziehen(zug.ax, zug.ay, p.x, p.y, b, h, FORMATE[format]);
  }
  anzeigen();
});
const loslassen = () => { zug = null; };
vorschau.addEventListener("pointerup", loslassen);
vorschau.addEventListener("pointercancel", loslassen);

// ——— Aufnahme ———
knopfStart.addEventListener("click", () => (lauf ? stopp() : start()));

async function start() {
  if (!quelle || !ausschnitt) return;
  const typ = gewaehlt();
  const r = ganz(ausschnitt, b, h);
  const aus = ausgabe(r.w, r.h, wahlGroesse.value, FORMATE[format]);
  const fps = Number(wahlFps.value);
  const dieser = (lauf = { abbruch: false });
  seite.classList.add("laeuft");
  sperren(true);
  knopfStart.textContent = "Abbrechen";

  if (vorlauf.checked) {
    zaehler.hidden = false;
    for (let n = 3; n > 0 && !dieser.abbruch; n--) {
      zaehler.textContent = n;
      await new Promise((res) => setTimeout(res, 1000));
    }
    zaehler.hidden = true;
    if (dieser.abbruch) return;   // stopp() hat schon zurückgesetzt
  }

  const weg = NATIV ? nativ(quelle.getVideoTracks()[0].clone(), r, aus, fps) : leinwand(r, aus, fps);
  let rec;
  try {
    rec = new MediaRecorder(weg.stream, { mimeType: typ.typ, videoBitsPerSecond: bitrate(aus.w, aus.h, fps) });
  } catch {
    // manche Browser nennen den Codec, nehmen ihn dann aber nicht: ohne Codec versuchen
    try {
      rec = new MediaRecorder(weg.stream, { mimeType: typ.typ.split(";")[0], videoBitsPerSecond: bitrate(aus.w, aus.h, fps) });
    } catch (fehler) {
      weg.stop();
      zuruecksetzen();
      melden(`${typ.name} lässt sich hier nicht aufnehmen (${fehler?.message ?? fehler}). Wähle unter «Datei» ein anderes Format.`, true);
      return;
    }
  }
  const teile = [];
  rec.addEventListener("dataavailable", (e) => { if (e.data.size) teile.push(e.data); });
  const beginn = performance.now();
  rec.addEventListener("stop", async () => {
    weg.stop();
    const dauer = performance.now() - beginn;
    const roh = await new Blob(teile).arrayBuffer();
    fertig(new Blob([mitDauer(roh, dauer / 1000)], { type: rec.mimeType.split(";")[0] || typ.typ.split(";")[0] }), typ, aus, dauer);
  }, { once: true });
  Object.assign(lauf, { rec, weg, beginn });
  rec.start(1000);

  knopfStart.textContent = "Stopp";
  uhr.hidden = false;
  info.textContent = `Video: ${aus.w} × ${aus.h} · ${typ.name} · ${fps} Bilder/s`;
  melden(NATIV ? "Aufnahme läuft. Du kannst zum Tab mit der Animation wechseln." : "Aufnahme läuft. Lass diese Seite sichtbar, bis du stoppst.");
  const grenze = Number(wahlDauer.value) * 1000;
  lauf.takt = setInterval(() => {
    const t = performance.now() - beginn;
    uhr.textContent = dauerText(t);
    if (grenze && t >= grenze) stopp();
  }, 200);
}

function stopp() {
  if (!lauf) return;
  lauf.abbruch = true;
  clearInterval(lauf.takt);
  if (lauf.rec?.state === "recording") {
    lauf.rec.stop();
    knopfStart.disabled = true;   // bis der Film fertig ist (fertig → zuruecksetzen)
    melden("Aufnahme wird abgeschlossen …");
  } else { lauf.weg?.stop(); zuruecksetzen(); }
  lauf = null;
}

function zuruecksetzen() {
  lauf = null;
  seite.classList.remove("laeuft");
  sperren(false);
  knopfStart.textContent = "Aufnahme starten";
  knopfStart.disabled = !quelle;
  uhr.hidden = true;
  uhr.textContent = "0:00";
  zaehler.hidden = true;
  anzeigen();
}

function sperren(an) {
  for (const el of [...formatKnoepfe, knopfGanz, wahlGroesse, wahlFps, wahlDatei, wahlDauer, vorlauf, knopfQuelle]) el.disabled = an;
}

function fertig(blob, typ, aus, dauer) {
  zuruecksetzen();
  if (!blob.size) { melden("Die Aufnahme ist leer: Die Quelle hat keine Bilder geliefert.", true); return; }
  if (film) URL.revokeObjectURL(film.url);
  film = { url: URL.createObjectURL(blob) };
  const el = $("film");
  el.src = film.url;
  $("laden").href = film.url;
  $("laden").download = dateiname(new Date(), typ.endung);
  $("film-info").textContent = `${aus.w} × ${aus.h} · ${dauerText(dauer)} · ${(blob.size / 1e6).toFixed(1)} MB · ${typ.name}`;
  $("ergebnis").hidden = false;
  melden("Fertig. Prüfe die Aufnahme und lade sie herunter.");
  $("ergebnis").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
}

$("verwerfen").addEventListener("click", () => {
  if (film) URL.revokeObjectURL(film.url);
  film = null;
  $("film").removeAttribute("src");
  $("ergebnis").hidden = true;
  melden("");
});

/** Chrome, Edge: jedes Bild der Quelle zuschneiden und skalieren, unabhängig von der Anzeige */
function nativ(spur, r, aus, fps) {
  const leser = new MediaStreamTrackProcessor({ track: spur }).readable.getReader();
  const ziel = new MediaStreamTrackGenerator({ kind: "video" });
  const schreiber = ziel.writable.getWriter();
  const leinwand = new OffscreenCanvas(aus.w, aus.h);
  const ctx = leinwand.getContext("2d", { alpha: false });
  ctx.imageSmoothingQuality = "high";
  const abstand = (1e6 / fps) * 0.9;   // Zeitstempel in Mikrosekunden; was schneller kommt, fällt weg
  let aus_ = false, letzte = -Infinity;
  (async () => {
    try {
      for (;;) {
        const { value: bild, done } = await leser.read();
        if (done) break;
        if (aus_ || bild.timestamp - letzte < abstand) { bild.close(); if (aus_) break; continue; }
        letzte = bild.timestamp;
        ctx.drawImage(bild, r.x, r.y, r.w, r.h, 0, 0, aus.w, aus.h);
        const neu = new VideoFrame(leinwand, { timestamp: bild.timestamp });
        bild.close();
        await schreiber.write(neu);   // der Generator schliesst das Bild
      }
    } catch (fehler) {
      if (!aus_) melden(`Aufnahme unterbrochen: ${fehler?.message ?? fehler}`, true);
    }
  })();
  return {
    stream: new MediaStream([ziel]),
    stop() { aus_ = true; leser.cancel().catch(() => {}); spur.stop(); ziel.stop?.(); },
  };
}

/** sonst: über eine Leinwand, im Takt der Anzeige (die Seite muss sichtbar bleiben) */
function leinwand(r, aus, fps) {
  const el = document.createElement("canvas");
  el.width = aus.w; el.height = aus.h;
  const ctx = el.getContext("2d", { alpha: false });
  ctx.imageSmoothingQuality = "high";
  let aus_ = false;
  const zeichnen = () => ctx.drawImage(video, r.x, r.y, r.w, r.h, 0, 0, aus.w, aus.h);
  const weiter = video.requestVideoFrameCallback
    ? () => video.requestVideoFrameCallback(() => { if (!aus_) { zeichnen(); weiter(); } })
    : () => requestAnimationFrame(() => { if (!aus_) { zeichnen(); weiter(); } });
  zeichnen();
  weiter();
  const stream = el.captureStream(fps);
  const versteckt = () => { if (document.hidden && !aus_) melden("Diese Seite ist verdeckt: Die Aufnahme bleibt stehen, bis sie wieder sichtbar ist.", true); };
  document.addEventListener("visibilitychange", versteckt);
  return {
    stream,
    stop() { aus_ = true; stream.getTracks().forEach((t) => t.stop()); document.removeEventListener("visibilitychange", versteckt); },
  };
}
