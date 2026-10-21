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
const T = (k) => window.sprache?.t(k) ?? k;   // die Sätze in beiden Sprachen stehen in sprache.js
function steps() {
  if (inApp && android) return T("install.inAppAndroid");
  if (inApp) return T("install.inApp");
  if (ios) return T("install.ios");
  if (android) return T("install.android");
  if (/Edg\/|Chrome\//.test(ua)) return T("install.chrome");
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Firefox\//.test(ua)) return T("install.safari");
  return T("install.sonst");
}

if (box && !standalone) {
  const btn = box.querySelector(".rad-install-btn");
  const help = box.querySelector(".rad-install-hilfe");
  const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const schreiben = () => { help.innerHTML = esc(steps()).replace(/«[^»]+»/g, m => `<span>${m}</span>`) +
    (inApp && android ? ` <a class="rad-install-chrome" href="${esc(chromeUrl()).replace(/"/g, "&quot;")}">${esc(T("install.chromeOeffnen"))}</a>` : esc(T("install.danach"))); };
  schreiben();
  document.addEventListener("sprache", schreiben);   // beim Sprachwechsel neu
  const toChrome = () => help.querySelector(".rad-install-chrome");
  const alt = box.querySelector(".rad-install-alt");
  if (alt && android && !inApp) alt.hidden = false;
  let deferred = null;
  box.hidden = false;
  // vom Neubau («Als App installieren», /b/apps/orna/) mit ?installieren: zum Knopf scrollen, die Schritte gleich aufklappen
  if (new URLSearchParams(location.search).has("installieren")) { help.hidden = false; btn.setAttribute("aria-expanded", "true"); obenAnbieten(box, btn, "ORNA"); }

  addEventListener("beforeinstallprompt", e => {
    e.preventDefault();                 // kein aufdringliches Banner, nur der eigene, stille Knopf
    deferred = e;
    document.dispatchEvent(new Event("installierbar"));
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
    // im Feld oben bleiben die Schritte offen und blinken kurz auf (21. Oktober 2026: dort klappte der Tipp sie zu, der Knopf schien nichts zu tun –
    // «Bei allen Apps funktioniert er nicht»); unten auf der Seite klappt er sie wie bisher auf und zu
    const imFeld = !!box.closest(".install-oben"), open = imFeld || help.hidden;
    help.hidden = !open;
    btn.setAttribute("aria-expanded", String(open));
    if (imFeld) { help.classList.remove("install-blinkt"); void help.offsetWidth; help.classList.add("install-blinkt"); }
    if (open) track("rad-app/hinweis", "App: Hinweis angetippt");
    // im eingebauten Browser (Android): gleich weiter nach Chrome; der Link bleibt als Rückfall stehen
    if (toChrome()) { track("rad-app/chrome", "App: in Chrome öffnen"); help.hidden = false; btn.setAttribute("aria-expanded", "true"); toChrome().click(); }
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
  let bereit = false;   // der Browser hat die Installation freigegeben (beforeinstallprompt): dann öffnet der Knopf das Fenster direkt
  const texte = () => {
    const en = !!window.sprache?.en?.();
    titel.textContent = en ? `Install ${name}` : `${name} installieren`;
    satz.textContent = bereit ? (en ? "Ready: tap the button and confirm the installation." : "Bereit: auf den Knopf tippen und die Installation bestätigen.")
      : en ? "Tap the button and confirm. If this browser cannot do it directly, the steps are below."
        : "Auf den Knopf tippen und bestätigen. Geht das in diesem Browser nicht direkt, stehen die Schritte darunter.";
    zu.setAttribute("aria-label", en ? "Close" : "Schliessen");
  };
  texte();
  document.addEventListener("sprache", texte);
  document.addEventListener("installierbar", () => { bereit = true; texte(); });
  const stil = document.createElement("style");
  stil.textContent = ".install-oben{position:relative;box-sizing:border-box;max-width:40rem;margin:16px auto 28px;padding:22px 20px 20px;border:1.5px solid currentColor;border-radius:16px;text-align:center}"
    + "@media (max-width:700px){.install-oben{margin:12px 16px 24px}}"
    + ".install-oben h2{margin:0 0 6px;padding:0 28px;font-size:1.3rem;line-height:1.2;font-weight:600}"
    + ".install-oben-satz{margin:0 auto 16px;max-width:30em;line-height:1.45;opacity:.75}"
    + ".install-oben-zu{position:absolute;top:6px;right:8px;width:40px;height:40px;border:0;background:none;color:inherit;font:inherit;font-size:1.6rem;line-height:1;cursor:pointer;opacity:.6}"
    + ".install-oben-zu:hover,.install-oben-zu:focus-visible{opacity:1}"
    + ".install-oben>:last-child{margin:0 auto!important}"
    + "@keyframes install-blinkt{0%,100%{opacity:1}30%{opacity:.25}}.install-blinkt{animation:install-blinkt .5s ease-in-out 2}"
    + "@media (prefers-reduced-motion:reduce){.install-blinkt{animation:none}}";
  document.head.append(stil);
  box.before(platz);
  feld.append(zu, titel, satz, box);
  const kopf = document.querySelector(".app-kopf");   // bei ORNA ein div im Kopf der Seite
  if (kopf) kopf.after(feld); else document.body.prepend(feld);
  zu.addEventListener("click", () => { platz.replaceWith(box); feld.remove(); });
  requestAnimationFrame(() => { scrollTo(0, 0); knopf.focus({ preventScroll: true }); });
}
