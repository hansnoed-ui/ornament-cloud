// Hörseite der EP: genau ein <audio>-Element spielt eine durchgehende WAV; die Tracks sind Zeitmarken in dieser Datei (ep.json).
// Ein Tipp auf einen Titel springt per currentTime zur Marke, die Datei bleibt dieselbe. So läuft die EP am Sperrbildschirm und in anderen Apps
// ohne Unterbruch weiter, denn der Browser spielt eine einzige Datei ab und die Seite muss nichts nachladen oder umschalten.
// Die reinen Rechnungen oben sind ohne Browser prüfbar (tests/ep-directer.test.mjs), die Oberfläche unten nur im Browser (tests/ep-directer.e2e.mjs).

export const PLATZHALTER = "PLATZHALTER";

/** Startzeiten der Tracks in Sekunden; null, wo die Marke noch fehlt */
export function startzeiten(ep) {
  return ep.tracks.map((t) => (Number.isInteger(t.startSample) ? t.startSample / ep.abtastrate : null));
}

/** Index des Tracks, in dem die Zeit liegt (der letzte mit bekannter Marke ≤ Zeit). Ein Tausendstel Spielraum gegen Rundung beim Springen. */
export function aktiverTrack(zeit, starts) {
  let i = 0;
  for (let k = 0; k < starts.length; k++) if (starts[k] != null && zeit >= starts[k] - 0.001) i = k;
  return i;
}

/** Ende eines Tracks: die nächste bekannte Marke, sonst das Ende der Datei */
export function trackEnde(i, starts, gesamt) {
  for (let k = i + 1; k < starts.length; k++) if (starts[k] != null) return starts[k];
  return Number.isFinite(gesamt) ? gesamt : null;
}

/** 0:00, 3:07, 1:02:03 */
export function zeitText(s) {
  if (!Number.isFinite(s) || s < 0) return "–:––";
  s = Math.floor(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sek = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sek}` : `${m}:${sek}`;
}

/** Prüft die Konfiguration. fehler: die Seite kann nicht spielen; platzhalter: was noch fehlt (wird angezeigt, damit es niemand übersieht) */
export function pruefeEp(ep) {
  const fehler = [], platzhalter = [];
  if (!ep || typeof ep !== "object") return { fehler: ["ep.json ist leer oder kein Objekt"], platzhalter };
  for (const f of ["anzeigename", "titel", "cover", "audio"]) if (typeof ep[f] !== "string") fehler.push(`«${f}» fehlt`);
  if (!Number.isInteger(ep.abtastrate) || ep.abtastrate <= 0) fehler.push("«abtastrate» fehlt");
  if (!Array.isArray(ep.tracks) || ep.tracks.length === 0) fehler.push("«tracks» fehlt");
  if (fehler.length) return { fehler, platzhalter };
  if (!ep.audio.trim()) platzhalter.push("Audioquelle (audio)");
  else if (/^[a-z]+:/i.test(ep.audio) && !/^https:\/\//i.test(ep.audio)) fehler.push("Die Audioquelle muss relativ oder eine https-Adresse sein");
  if (ep.cover.toLowerCase().includes("platzhalter")) platzhalter.push("Cover");
  ep.tracks.forEach((t, i) => {
    if (typeof t.titel !== "string" || !t.titel.trim()) fehler.push(`Track ${i + 1}: Titel fehlt`);
    else if (t.titel.startsWith(PLATZHALTER)) platzhalter.push(`Titel von Track ${i + 1}`);
    if (t.startSample == null) platzhalter.push(`Startmarke von Track ${i + 1}`);
    else if (!Number.isInteger(t.startSample) || t.startSample < 0) fehler.push(`Track ${i + 1}: startSample ist keine ganze Zahl ≥ 0`);
  });
  if (ep.tracks[0].startSample != null && ep.tracks[0].startSample !== 0) fehler.push("Track 1 beginnt nicht bei Sample 0");
  const bekannt = ep.tracks.map((t) => t.startSample).filter(Number.isInteger);
  if (bekannt.some((s, i) => i > 0 && s <= bekannt[i - 1])) fehler.push("Die Startmarken steigen nicht an");
  return { fehler, platzhalter };
}

// ---------------------------------------------------------------- Oberfläche (nur im Browser)

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", starte, { once: true });
  else starte();
}

async function starte() {
  const $ = (id) => document.getElementById(id);
  const audio = $("audio"), play = $("play"), regler = $("regler"), liste = $("tracks"), hinweis = $("hinweis");

  const zeige = (text) => { hinweis.textContent = text; hinweis.hidden = !text; };

  let ep;
  try {
    const antwort = await fetch(new URL("ep.json", import.meta.url), { cache: "no-cache" });
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
    ep = await antwort.json();
  } catch (e) {
    zeige("Die Angaben zur EP (ep.json) konnten nicht geladen werden. Bitte die Seite neu laden.");
    return;
  }
  const { fehler, platzhalter } = pruefeEp(ep);
  if (fehler.length) { zeige(`Die Angaben zur EP sind unvollständig: ${fehler.join("; ")}.`); return; }

  const starts = startzeiten(ep);
  const coverUrl = new URL(ep.cover, document.baseURI).href;
  $("name").textContent = ep.anzeigename;
  $("titel").textContent = ep.titel;
  document.title = `${ep.anzeigename} – ${ep.titel}`;
  const cover = $("cover");
  cover.src = coverUrl;
  cover.alt = `Cover: ${ep.anzeigename} – ${ep.titel}`;
  if (platzhalter.length) {
    const p = $("platzhalter");
    p.textContent = `Vorschau mit Platzhaltern. Noch offen: ${platzhalter.join(", ")}.`;
    p.hidden = false;
  }

  // Trackliste
  const knoepfe = ep.tracks.map((t, i) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "track";
    b.dataset.track = String(i);
    b.innerHTML = `<span class="nr">${i + 1}</span><span class="tt"></span><span class="td">–:––</span>`;
    b.querySelector(".tt").textContent = t.titel;
    b.disabled = starts[i] == null;
    b.addEventListener("click", () => springeZu(i));
    li.append(b);
    liste.append(li);
    return b;
  });

  let aktiv = -1, ziehen = false, wartenderSprung = null, kaputt = false;

  // Audioquelle: leer heisst, sie ist noch nicht bereitgestellt
  if (!ep.audio.trim()) {
    zeige("Die Audiodatei ist noch nicht bereitgestellt.");
    kaputt = true;
  } else {
    audio.src = new URL(ep.audio, document.baseURI).href;
    play.disabled = false;
  }

  const gesamt = () => (Number.isFinite(audio.duration) ? audio.duration : null);

  function markenSetzen() {
    const d = gesamt(), box = $("marken");
    box.textContent = "";
    if (!d) return;
    starts.forEach((s, i) => {
      if (i === 0 || s == null) return;
      const m = document.createElement("span");
      m.style.left = `${(s / d) * 100}%`;
      box.append(m);
    });
    knoepfe.forEach((b, i) => {
      const ende = trackEnde(i, starts, d);
      if (starts[i] != null && ende != null) b.querySelector(".td").textContent = zeitText(ende - starts[i]);
    });
    regler.max = String(d);
    regler.disabled = false;
  }

  function mediaSessionTrack(i) {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    const typ = (p) => (/\.png$/i.test(p) ? "image/png" : /\.svg$/i.test(p) ? "image/svg+xml" : /\.webp$/i.test(p) ? "image/webp" : "image/jpeg");
    const bilder = [{ src: coverUrl, type: typ(ep.cover) }];
    if (ep.coverKlein) bilder.unshift({ src: new URL(ep.coverKlein, document.baseURI).href, sizes: "512x512", type: typ(ep.coverKlein) });
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: ep.tracks[i].titel, artist: ep.anzeigename, album: ep.titel,
        artwork: bilder,
      });
    } catch { /* ältere Browser */ }
  }

  function positionMelden() {
    if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) return;
    const i = Math.max(aktiv, 0), d = gesamt();
    const s = starts[i] ?? 0, ende = trackEnde(i, starts, d);
    if (ende == null || !(ende > s)) return;
    const dauer = ende - s, pos = Math.min(Math.max(audio.currentTime - s, 0), dauer);
    try { navigator.mediaSession.setPositionState({ duration: dauer, position: pos, playbackRate: audio.playbackRate || 1 }); } catch { /* ungültige Werte überspringen */ }
  }

  /** Stellt Anzeige, aktiven Titel und Sperrbildschirm auf die tatsächliche Position der Wiedergabe */
  function aktualisieren() {
    const t = audio.currentTime || 0, d = gesamt();
    const i = aktiverTrack(t, starts);
    if (i !== aktiv) {
      aktiv = i;
      knoepfe.forEach((b, k) => { if (k === i) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
      $("jetzt-titel").textContent = `${i + 1}  ${ep.tracks[i].titel}`;
      mediaSessionTrack(i);
      positionMelden();
    }
    const s = starts[i] ?? 0, ende = trackEnde(i, starts, d);
    $("zeit-track").textContent = zeitText(Math.max(t - s, 0));
    $("dauer-track").textContent = ende != null ? zeitText(ende - s) : "–:––";
    if (!ziehen && d) regler.value = String(t);
    document.body.dataset.aktiverTrack = String(i + 1);
  }

  function spielend(ja) {
    play.classList.toggle("laeuft", ja);
    play.setAttribute("aria-label", ja ? "Pause" : "Abspielen");
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = ja ? "playing" : "paused";
  }

  function abspielen() {
    if (kaputt) return;
    const p = audio.play();
    if (p && p.catch) p.catch((e) => { if (e && e.name !== "AbortError") zeige("Die Wiedergabe liess sich nicht starten. Bitte nochmals auf Play tippen."); });
  }

  function springeZu(i) {
    if (starts[i] == null || kaputt) return;
    if (audio.readyState >= 1) { audio.currentTime = starts[i]; aktualisieren(); }
    else wartenderSprung = starts[i];
    abspielen();      // im selben Tipp, sonst blockieren iOS und Chrome den Start
  }

  play.addEventListener("click", () => { if (audio.paused) abspielen(); else audio.pause(); });

  regler.addEventListener("input", () => {
    ziehen = true;
    const t = Number(regler.value), i = aktiverTrack(t, starts), s = starts[i] ?? 0, ende = trackEnde(i, starts, gesamt());
    $("zeit-track").textContent = zeitText(Math.max(t - s, 0));
    if (ende != null) $("dauer-track").textContent = zeitText(ende - s);
  });
  regler.addEventListener("change", () => { ziehen = false; audio.currentTime = Number(regler.value); aktualisieren(); });

  audio.addEventListener("loadedmetadata", () => {
    zeige("");
    markenSetzen();
    if (wartenderSprung != null) { audio.currentTime = wartenderSprung; wartenderSprung = null; }
    aktualisieren();
  });
  audio.addEventListener("durationchange", markenSetzen);
  audio.addEventListener("timeupdate", aktualisieren);
  audio.addEventListener("seeked", () => { aktualisieren(); positionMelden(); });
  audio.addEventListener("play", () => { zeige(""); spielend(true); aktualisieren(); positionMelden(); });
  audio.addEventListener("pause", () => { spielend(false); positionMelden(); });
  audio.addEventListener("ended", () => { spielend(false); aktualisieren(); });
  audio.addEventListener("ratechange", positionMelden);
  audio.addEventListener("error", () => {
    kaputt = true;
    spielend(false);
    play.disabled = true;
    knoepfe.forEach((b) => (b.disabled = true));
    const code = audio.error && audio.error.code;
    zeige(code === 2
      ? "Die Verbindung zur Audiodatei ist abgebrochen. Bitte die Seite neu laden."
      : "Die Audiodatei fehlt oder kann nicht geladen werden. Bitte später nochmals versuchen.");
  });

  // Zurück auf der Seite (entsperrt, aus einer anderen App, aus dem Zwischenspeicher): Anzeige nach der tatsächlichen Position
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") aktualisieren(); });
  window.addEventListener("pageshow", aktualisieren);
  window.addEventListener("focus", aktualisieren);

  // Sperrbildschirm und Kopfhörertasten
  if ("mediaSession" in navigator) {
    const ms = navigator.mediaSession;
    const setze = (aktion, f) => { try { ms.setActionHandler(aktion, f); } catch { /* nicht unterstützt */ } };
    setze("play", abspielen);
    setze("pause", () => audio.pause());
    setze("previoustrack", () => {
      const i = aktiverTrack(audio.currentTime, starts);
      if (audio.currentTime - (starts[i] ?? 0) > 3 || i === 0) springeZu(i);
      else springeZu(i - 1);
    });
    setze("nexttrack", () => {
      const i = aktiverTrack(audio.currentTime, starts);
      for (let k = i + 1; k < starts.length; k++) if (starts[k] != null) return springeZu(k);
    });
    setze("seekto", (d) => {
      if (d.seekTime == null) return;
      const i = Math.max(aktiv, 0), ende = trackEnde(i, starts, gesamt());
      audio.currentTime = Math.min((starts[i] ?? 0) + d.seekTime, ende ?? Infinity);
      aktualisieren(); positionMelden();
    });
    setze("seekbackward", (d) => { audio.currentTime = Math.max(audio.currentTime - (d.seekOffset || 10), 0); });
    setze("seekforward", (d) => { audio.currentTime = Math.min(audio.currentTime + (d.seekOffset || 10), gesamt() ?? audio.currentTime); });
  }

  aktualisieren();
  window.__ep = { audio, starts, aktiv: () => aktiv };   // für die Browsertests
}
