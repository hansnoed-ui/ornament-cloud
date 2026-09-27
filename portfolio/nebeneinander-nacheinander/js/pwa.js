// Installierbare Web-App ORNA
// 1. meldet den Service Worker an (sw.js im Werkordner; er versorgt Website und App mit Rad und Feld).
//    Die App selbst hat die Adresse app/ (Manifest: start_url und scope), damit Links auf der
//    Website im Browser bleiben und nie die installierte App öffnen;
// 2. zeigt auf der Radseite über dem Rad den Knopf «ORNA als App installieren», überall ausser in der App selbst:
//    – meldet der Browser «installierbar» (Chrome, Edge, Android), öffnet der Knopf das Installationsfenster;
//    – im eingebauten Browser von Facebook, Instagram u. a. geht es nie: auf Android öffnet der Knopf
//      die Seite in Chrome, auf dem iPhone erklärt er den Weg nach Safari;
//    – sonst erklärt er die Schritte für diesen Browser. Chrome meldet «installierbar» erst nach etwas
//      Verweildauer, nie im Inkognito-Fenster und nicht, wenn ORNA schon installiert ist; der Knopf steht trotzdem.
//    – auf Android steht darunter immer klein der Rückfall «Verknüpfung erstellen»: Manche Geräte lassen die
//      Installation auch in Chrome nicht zu (Warnung «unsichere App»), und die Seite erfährt davon nichts.
// Ohne Unterstützung bleibt es bei der Erklärung; die Seite funktioniert wie bisher.

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  addEventListener("load", () => {
    navigator.serviceWorker.register(new URL("../sw.js", import.meta.url)).catch(() => { /* kein Offline-Betrieb, sonst unverändert */ });
  });
}

const box = document.querySelector(".rad-install");
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

function track(path, title) {
  try { window.goatcounter?.count?.({ path, title, event: true }); } catch { /* Zählung ist nie wichtiger als die Seite */ }
}

const ua = navigator.userAgent;
// iPadOS meldet sich als Mac, unterscheidet sich aber durch Touch
const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const android = /Android/.test(ua);
// Eingebaute Browser von Facebook, Instagram, Messenger u. a. können keine App installieren
const inApp = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|MessengerForiOS|Orca-Android|LinkedInApp|Snapchat|TikTok|musical_ly|Line\/|MicroMessenger|Pinterest|Twitter/.test(ua);

// Android: dieselbe Seite in Chrome öffnen (Intent-Adresse); fehlt Chrome, bleibt es bei der Seite
function chromeUrl() {
  const u = new URL(location.href);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.slice(0, -1)};package=com.android.chrome;` +
    `S.browser_fallback_url=${encodeURIComponent(u.href)};end`;
}

// Schritte je Browser; «…» steht für die Namen von Knöpfen und Menüpunkten
function steps() {
  if (inApp && android)
    return "Im Browser dieser App lässt sich ORNA nicht installieren. Die Seite öffnet sich dafür in Chrome; dort noch einmal auf «ORNA als App installieren» tippen.";
  if (inApp)
    return "Im Browser dieser App lässt sich ORNA nicht installieren. Über «···» oder das Menü «In Safari öffnen» wählen, dann dort «Teilen» und «Zum Home-Bildschirm».";
  if (ios)
    return "Auf «Teilen» tippen, dann «Zum Home-Bildschirm» wählen.";
  if (android)
    return "Im Browsermenü (⋮) «App installieren» oder «Zum Startbildschirm hinzufügen» wählen.";
  if (/Edg\/|Chrome\//.test(ua))
    return "Im Browsermenü (⋮) «ORNA installieren» wählen oder in der Adresszeile auf das Installationssymbol klicken. Im Inkognito-Fenster geht es nicht.";
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Firefox\//.test(ua))
    return "Im Menü «Ablage» «Zum Dock hinzufügen» wählen.";
  return "Dieser Browser kann ORNA nicht installieren. Auf dem Smartphone geht es direkt, am Computer mit Chrome oder Edge.";
}

if (box && !standalone) {
  const btn = box.querySelector(".rad-install-btn");
  const help = box.querySelector(".rad-install-hilfe");
  const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  help.innerHTML = esc(steps()).replace(/«[^»]+»/g, m => `<span>${m}</span>`) +
    (inApp && android ? ` <a class="rad-install-chrome" href="${esc(chromeUrl()).replace(/"/g, "&quot;")}">In Chrome öffnen</a>`
      : " Ist ORNA schon installiert, steht sie als eigenes Symbol auf dem Bildschirm und läuft auch ohne Netz.");
  const toChrome = help.querySelector(".rad-install-chrome");
  const alt = box.querySelector(".rad-install-alt");
  if (alt && android && !inApp) alt.hidden = false;
  let deferred = null;
  box.hidden = false;

  addEventListener("beforeinstallprompt", e => {
    e.preventDefault();                 // kein aufdringliches Banner, nur der eigene, stille Knopf
    deferred = e;
  });
  addEventListener("appinstalled", () => {
    box.hidden = true;
    deferred = null;
    track("rad-app/installiert", "App: installiert");
  });

  btn.addEventListener("click", async () => {
    if (deferred) {
      track("rad-app/hinweis", "App: Hinweis angetippt");
      deferred.prompt();
      const choice = await deferred.userChoice.catch(() => null);
      deferred = null;
      if (choice && choice.outcome === "accepted") box.hidden = true;
      return;
    }
    const open = help.hidden;
    help.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (open) track("rad-app/hinweis", "App: Hinweis angetippt");
    // im eingebauten Browser (Android): gleich weiter nach Chrome; der Link bleibt als Rückfall stehen
    if (toChrome) { track("rad-app/chrome", "App: in Chrome öffnen"); help.hidden = false; btn.setAttribute("aria-expanded", "true"); toChrome.click(); }
  });
}
