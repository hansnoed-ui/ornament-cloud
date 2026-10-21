// PHORMA II als App (Wunsch vom 21. Oktober 2026: «ja, bau PHORMA II als App»). Wie PHORMA II (alpha/phorma-ii/pwa.js):
// 1. meldet den Service Worker an (sw.js in diesem Ordner, Geltungsbereich dieser Ordner): danach läuft PHORMA II auch ohne Netz;
// 2. zeigt den Knopf «PHORMA II als App installieren» (auf der Anwendung und auf der App-Seite app/), nicht in der installierten App. Diese hat
//    wie The Fictory eine eigene Adresse (studio/, Manifest: start_url und scope), damit die Website im Browser bleibt (wie bei PHORMA I):
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

const T = (k) => window.sprache?.t(k) ?? k;   // die Sätze in beiden Sprachen stehen in sprache.js
function schritte() {
  if (inApp && android) return T("Im Browser dieser App lässt sich PHORMA II nicht installieren. Die Seite öffnet sich dafür in Chrome; dort noch einmal auf «PHORMA II als App installieren» tippen.");
  if (inApp) return T("Im Browser dieser App lässt sich PHORMA II nicht installieren. Über «···» oder das Menü «In Safari öffnen» wählen, dann dort «Teilen» und «Zum Home-Bildschirm».");
  if (ios) return T("Auf «Teilen» tippen, dann «Zum Home-Bildschirm» wählen.");
  if (android) return T("Im Browsermenü (⋮) «App installieren» oder «Zum Startbildschirm hinzufügen» wählen.");
  if (/Edg\/|Chrome\//.test(ua)) return T("Im Browsermenü (⋮) «PHORMA II installieren» wählen oder in der Adresszeile auf das Installationssymbol klicken. Im Inkognito-Fenster geht es nicht.");
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Firefox\//.test(ua)) return T("Im Menü «Ablage» «Zum Dock hinzufügen» wählen.");
  return T("Dieser Browser kann PHORMA II nicht installieren. Auf dem Smartphone geht es direkt, am Computer mit Chrome oder Edge.");
}

if (box && !standalone) {
  const knopf = document.getElementById("installieren-knopf"), hilfe = document.getElementById("installieren-hilfe");
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const schreiben = () => { hilfe.innerHTML = esc(schritte()).replace(/«[^»]+»/g, (m) => `<span>${m}</span>`) +
    (inApp && android ? ` <a class="installieren-chrome" href="${esc(chromeUrl()).replace(/"/g, "&quot;")}">${esc(T("In Chrome öffnen"))}</a>`
      : esc(T(" Danach steht PHORMA II als eigenes Symbol auf dem Bildschirm und läuft auch ohne Netz; Foto und Video bleiben auf dem Gerät."))); };
  schreiben();
  document.addEventListener("sprache", schreiben);   // beim Sprachwechsel neu
  const zuChrome = () => hilfe.querySelector(".installieren-chrome");
  let angebot = null;
  box.hidden = false;
  // vom Neubau («Als App installieren», /b/apps/phorma-ii/) mit ?installieren: zum Knopf scrollen, die Schritte gleich aufklappen
  if (new URLSearchParams(location.search).has("installieren")) { hilfe.hidden = false; knopf.setAttribute("aria-expanded", "true"); obenAnbieten(box, knopf, "PHORMA II"); }
  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); angebot = e; });   // kein Banner, nur der eigene, stille Knopf
  addEventListener("appinstalled", () => { box.hidden = true; angebot = null; zaehle("phorma-ii-app/installiert", "PHORMA II: installiert"); });
  knopf.addEventListener("click", async () => {
    if (angebot) {
      zaehle("phorma-ii-app/hinweis", "PHORMA II: Installieren angetippt");
      angebot.prompt();
      const wahl = await angebot.userChoice.catch(() => null);
      angebot = null;
      if (wahl?.outcome === "accepted") box.hidden = true;
      return;
    }
    const auf = hilfe.hidden;
    hilfe.hidden = !auf;
    knopf.setAttribute("aria-expanded", String(auf));
    if (auf) zaehle("phorma-ii-app/hinweis", "PHORMA II: Installieren angetippt");
    if (zuChrome()) { hilfe.hidden = false; knopf.setAttribute("aria-expanded", "true"); zuChrome().click(); }
  });
}

// Vom Neubau («Als App installieren», /b/apps/…) mit ?installieren: ein deutliches Feld ganz oben, unter dem Kopf der App, statt nur zum Knopf
// unten zu scrollen (21. Oktober 2026, Rückmeldung: der Knopf im Neubau «führt nicht zum Download, sondern verlinkt eine andere Seite»).
// Titel, ein Satz, der Knopf und die Schritte; «×» legt den Knopf an seinen Platz zurück. Das Installationsfenster selbst kann der Browser nur nach
// einem Tippen auf einer Seite der App öffnen – darum dieser Schritt und nicht schon der Knopf im Neubau.
function obenAnbieten(box, knopf, name) {
  const platz = document.createComment("installieren"), feld = document.createElement("section");
  const titel = document.createElement("h2"), satz = document.createElement("p"), zu = document.createElement("button");
  feld.className = "install-oben"; titel.id = "install-oben-titel"; feld.setAttribute("aria-labelledby", titel.id);
  satz.className = "install-oben-satz"; zu.type = "button"; zu.className = "install-oben-zu"; zu.textContent = "×";
  const texte = () => {
    const en = !!window.sprache?.en?.();
    titel.textContent = en ? `Install ${name}` : `${name} installieren`;
    satz.textContent = en ? "Tap the button and confirm. If this browser cannot do it directly, the steps are below."
      : "Auf den Knopf tippen und bestätigen. Geht das in diesem Browser nicht direkt, stehen die Schritte darunter.";
    zu.setAttribute("aria-label", en ? "Close" : "Schliessen");
  };
  texte();
  document.addEventListener("sprache", texte);
  const stil = document.createElement("style");
  stil.textContent = ".install-oben{position:relative;box-sizing:border-box;max-width:40rem;margin:16px auto 28px;padding:22px 20px 20px;border:1.5px solid currentColor;border-radius:16px;text-align:center}"
    + "@media (max-width:700px){.install-oben{margin:12px 16px 24px}}"
    + ".install-oben h2{margin:0 0 6px;padding:0 28px;font-size:1.3rem;line-height:1.2;font-weight:600}"
    + ".install-oben-satz{margin:0 auto 16px;max-width:30em;line-height:1.45;opacity:.75}"
    + ".install-oben-zu{position:absolute;top:6px;right:8px;width:40px;height:40px;border:0;background:none;color:inherit;font:inherit;font-size:1.6rem;line-height:1;cursor:pointer;opacity:.6}"
    + ".install-oben-zu:hover,.install-oben-zu:focus-visible{opacity:1}"
    + ".install-oben>:last-child{margin:0 auto!important}";
  document.head.append(stil);
  box.before(platz);
  feld.append(zu, titel, satz, box);
  const kopf = document.querySelector("header.app-kopf");
  if (kopf) kopf.after(feld); else document.body.prepend(feld);
  zu.addEventListener("click", () => { platz.replaceWith(box); feld.remove(); });
  requestAnimationFrame(() => { scrollTo(0, 0); knopf.focus({ preventScroll: true }); });
}
