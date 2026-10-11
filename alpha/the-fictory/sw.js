// The Fictory – Service Worker (seit 11. Oktober 2026: als App installierbar, Wunsch von Christian). Geltungsbereich: der Ordner der Anwendung.
// Bei der Einrichtung liest er die Seite und folgt ihren Verweisen (Stylesheets, Schriften, Module samt Importen, auch die ORNA-Daten),
// damit The Fictory danach ohne Netz läuft. Ohne eigene Dateiliste: Was die Seite lädt, wird gespeichert – so bleibt er gültig,
// wenn die Versionsmarken (?v=) der Seite oder der Website wechseln.
// Seiten: zuerst das Netz (neue Fassung), ohne Netz die gespeicherte. Dateien mit Versionsmarke: aus dem Speicher, sonst aus dem Netz;
// alle anderen: zuerst das Netz, ohne Netz aus dem Speicher. Jede erfolgreiche Antwort aktualisiert den Speicher.
// Eigener Cache «fictory-…»; fremde Caches (ORNA «nn-…», ORMA «orma-…») werden nie berührt.

const CACHE = "fictory-1";
const START = new URL("./", self.registration.scope).href;
// Dinge, die die Seite erst später holt (Beispielbild per fetch) oder die der Browser für die Installation braucht; werkbank/ ist die Seite
// der installierten App (Abschrift mit <base href="../">, tools/build-fictory-app.mjs)
const DAZU = ["werkbank/", "beispiel.jpg", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"];

/** Verweise in HTML, CSS und JavaScript (nur dieselbe Herkunft) */
function verweise(text, typ, basis) {
  if (typ === "html") { const b = text.match(/<base href="([^"]+)"/); if (b) basis = new URL(b[1], basis).href; }
  const muster = typ === "html" ? [/<(?:link|script)[^>]+(?:href|src)="([^"#]+)"/g]
    : typ === "css" ? [/url\(\s*["']?([^"')]+)["']?\s*\)/g, /@import\s+["']([^"']+)["']/g]
    : [/(?:import|export)\s[^"']*?from\s*["']([^"']+)["']/g, /import\(\s*["']([^"']+)["']\s*\)/g,
       /new URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url\s*\)/g];          // auch Worker (rechner.js), die ein Modul so lädt
  const out = [];
  for (const m of muster) for (const [, v] of text.matchAll(m)) {
    const u = new URL(v, basis);
    if (u.origin === self.location.origin) out.push(u.href);
  }
  return out;
}

async function einrichten() {
  const cache = await caches.open(CACHE);
  const offen = [START, ...DAZU.map((d) => new URL(d, START).href)], gesehen = new Set();
  while (offen.length) {
    const url = offen.shift();
    if (gesehen.has(url)) continue;
    gesehen.add(url);
    const antwort = await fetch(url, { cache: "no-cache" }).catch(() => null);
    if (!antwort?.ok) {
      if (url === START) throw new Error(`${url}: ${antwort?.status ?? "kein Netz"}`);
      continue;                                    // ein Verweis, den es nicht gibt (etwa ein Beispiel in einem Kommentar): überspringen
    }
    await cache.put(url, antwort.clone());
    const pfad = new URL(url).pathname;
    const typ = url === START || pfad.endsWith(".html") ? "html" : pfad.endsWith(".css") ? "css" : pfad.endsWith(".js") ? "js" : null;
    if (typ) offen.push(...verweise(await antwort.text(), typ, url));
  }
}

/** ältere Fassungen derselben Datei (andere Versionsmarke) aus dem Speicher nehmen */
async function aufraeumen(cache, url) {
  const u = new URL(url);
  for (const req of await cache.keys()) {
    const r = new URL(req.url);
    if (r.pathname === u.pathname && r.search !== u.search) await cache.delete(req);
  }
}

async function speichern(req, antwort) {
  if (!antwort.ok || antwort.type !== "basic") return;
  const cache = await caches.open(CACHE);
  await cache.put(req, antwort);
  if (new URL(req.url).search) await aufraeumen(cache, req.url);
}

self.addEventListener("install", (event) => {
  event.waitUntil(einrichten().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("fictory-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;     // Zählung (goatcounter) und alles Fremde: unberührt
  if (req.mode === "navigate") {
    if (!url.href.startsWith(START)) return;
    event.respondWith(fetch(req, { cache: "no-cache" })
      .then((a) => { event.waitUntil(speichern(req, a.clone())); return a; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match(START))));
    return;
  }
  if (/[?&]v=/.test(url.search)) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((a) => { event.waitUntil(speichern(req, a.clone())); return a; })));
    return;
  }
  event.respondWith(fetch(req)
    .then((a) => { event.waitUntil(speichern(req, a.clone())); return a; })
    .catch(() => caches.match(req).then((hit) => hit || Response.error())));
});
