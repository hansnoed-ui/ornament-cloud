// Installierbare Web-App ORNA
// 1. meldet den Service Worker an (sw.js im Werkordner; er versorgt Website und App mit Rad und Feld).
//    Die App selbst hat die Adresse app/ (Manifest: start_url und scope), damit Links auf der
//    Website im Browser bleiben und nie die installierte App öffnen;
// 2. zeigt auf der Radseite über dem Rad den Knopf «ORNA als App installieren», überall ausser in der App selbst:
//    – meldet der Browser «installierbar» (Chrome, Edge, Android), öffnet der Knopf das Installationsfenster;
//    – sonst erklärt er die Schritte für diesen Browser. Chrome meldet «installierbar» erst nach etwas
//      Verweildauer, nie im Inkognito-Fenster und nicht, wenn ORNA schon installiert ist; der Knopf steht trotzdem.
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

// Schritte je Browser; «…» steht für die Namen von Knöpfen und Menüpunkten
function steps() {
  const ua = navigator.userAgent;
  // iPadOS meldet sich als Mac, unterscheidet sich aber durch Touch
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1))
    return "Auf «Teilen» tippen, dann «Zum Home-Bildschirm» wählen.";
  if (/Android/.test(ua))
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
    " Ist ORNA schon installiert, steht sie als eigenes Symbol auf dem Bildschirm und läuft auch ohne Netz.";
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
  });
}
