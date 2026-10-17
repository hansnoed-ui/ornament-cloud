// PHORMA I als App (Wunsch vom 17. Oktober 2026: «Jetzt daraus eine App bauen ("PHORMA I")»). Nach dem Vorbild von Principesse (alpha/principesse/pwa.js):
// 1. meldet den Service Worker an (sw.js in diesem Ordner, Geltungsbereich dieser Ordner): danach läuft PHORMA I auch ohne Netz;
// 2. zeigt den Knopf «PHORMA I als App installieren» (auf der Anwendung und auf der App-Seite app/), nicht in der installierten App. Diese hat
//    wie The Fictory eine eigene Adresse (studio/, Manifest: start_url und scope), damit die Website im Browser bleibt (Rückmeldung vom 17. Oktober 2026):
//    – meldet der Browser «installierbar» (Chrome, Edge, Android), öffnet der Knopf das Installationsfenster;
//    – im eingebauten Browser von Facebook, Instagram u. a. geht es nie: auf Android öffnet der Knopf die Seite in Chrome,
//      auf dem iPhone erklärt er den Weg nach Safari;
//    – sonst erklärt er die Schritte für diesen Browser.
// Ohne Unterstützung bleibt es bei der Erklärung; die Seite funktioniert wie bisher.

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
  addEventListener("load", () => { navigator.serviceWorker.register(new URL("sw.js", import.meta.url), { scope: new URL("./", import.meta.url).href }).catch(() => { /* ohne Offline-Betrieb weiter */ }); });
}

const box = document.getElementById("installieren");
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

function zaehle(path, title) {
  try { window.goatcounter?.count?.({ path, title, event: true }); } catch { /* Zählung ist nie wichtiger als die Seite */ }
}

const ua = navigator.userAgent;
const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);   // iPadOS meldet sich als Mac
const android = /Android/.test(ua);
const inApp = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|MessengerForiOS|Orca-Android|LinkedInApp|Snapchat|TikTok|musical_ly|Line\/|MicroMessenger|Pinterest|Twitter/.test(ua);

function chromeUrl() {
  const u = new URL(location.href);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.slice(0, -1)};package=com.android.chrome;` +
    `S.browser_fallback_url=${encodeURIComponent(u.href)};end`;
}

function schritte() {
  if (inApp && android) return "Im Browser dieser App lässt sich PHORMA I nicht installieren. Die Seite öffnet sich dafür in Chrome; dort noch einmal auf «PHORMA I als App installieren» tippen.";
  if (inApp) return "Im Browser dieser App lässt sich PHORMA I nicht installieren. Über «···» oder das Menü «In Safari öffnen» wählen, dann dort «Teilen» und «Zum Home-Bildschirm».";
  if (ios) return "Auf «Teilen» tippen, dann «Zum Home-Bildschirm» wählen.";
  if (android) return "Im Browsermenü (⋮) «App installieren» oder «Zum Startbildschirm hinzufügen» wählen.";
  if (/Edg\/|Chrome\//.test(ua)) return "Im Browsermenü (⋮) «PHORMA I installieren» wählen oder in der Adresszeile auf das Installationssymbol klicken. Im Inkognito-Fenster geht es nicht.";
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Firefox\//.test(ua)) return "Im Menü «Ablage» «Zum Dock hinzufügen» wählen.";
  return "Dieser Browser kann PHORMA I nicht installieren. Auf dem Smartphone geht es direkt, am Computer mit Chrome oder Edge.";
}

if (box && !standalone) {
  const knopf = document.getElementById("installieren-knopf"), hilfe = document.getElementById("installieren-hilfe");
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  hilfe.innerHTML = esc(schritte()).replace(/«[^»]+»/g, (m) => `<span>${m}</span>`) +
    (inApp && android ? ` <a class="installieren-chrome" href="${esc(chromeUrl()).replace(/"/g, "&quot;")}">In Chrome öffnen</a>`
      : " Danach steht PHORMA I als eigenes Symbol auf dem Bildschirm und läuft auch ohne Netz; dein Foto bleibt auf dem Gerät.");
  const zuChrome = hilfe.querySelector(".installieren-chrome");
  let angebot = null;
  box.hidden = false;
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); angebot = e; });   // kein Banner, nur der eigene, stille Knopf
  addEventListener("appinstalled", () => { box.hidden = true; angebot = null; zaehle("phorma-i-app/installiert", "PHORMA I: installiert"); });
  knopf.addEventListener("click", async () => {
    if (angebot) {
      zaehle("phorma-i-app/hinweis", "PHORMA I: Installieren angetippt");
      angebot.prompt();
      const wahl = await angebot.userChoice.catch(() => null);
      angebot = null;
      if (wahl?.outcome === "accepted") box.hidden = true;
      return;
    }
    const auf = hilfe.hidden;
    hilfe.hidden = !auf;
    knopf.setAttribute("aria-expanded", String(auf));
    if (auf) zaehle("phorma-i-app/hinweis", "PHORMA I: Installieren angetippt");
    if (zuChrome) { hilfe.hidden = false; knopf.setAttribute("aria-expanded", "true"); zuChrome.click(); }
  });
}
