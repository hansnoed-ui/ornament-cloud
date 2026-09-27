// Installierbare Web-App ORNA
// 1. meldet den Service Worker an (sw.js im Werkordner, Geltungsbereich Rad und Feld);
// 2. zeigt auf der Radseite über dem Rad den Hinweis «ORNA als App installieren», aber nur dort, wo es geht:
//    – Chrome, Edge, Android: der Knopf öffnet das Installationsfenster des Browsers;
//    – iPhone und iPad: der Knopf erklärt die zwei Schritte über «Teilen»;
//    – bereits als App geöffnet oder anderer Browser: kein Hinweis.
// Ohne Unterstützung passiert nichts; die Seite funktioniert wie bisher.

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

if (box && !standalone) {
  const btn = box.querySelector(".rad-install-btn");
  const help = box.querySelector(".rad-install-hilfe");
  // iPadOS meldet sich als Mac, unterscheidet sich aber durch Touch
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let deferred = null;

  addEventListener("beforeinstallprompt", e => {
    e.preventDefault();                 // kein aufdringliches Banner, nur der eigene, stille Hinweis
    deferred = e;
    box.hidden = false;
  });
  addEventListener("appinstalled", () => {
    box.hidden = true;
    deferred = null;
    track("rad-app/installiert", "App: installiert");
  });

  if (ios) box.hidden = false;

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
  });
}
