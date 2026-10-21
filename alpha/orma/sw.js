// ORMA – Service Worker. Eigener Geltungsbereich (der ORMA-Ordner), eigener Cache «orma-<Version>».
// Räumt beim Aktualisieren ausschliesslich eigene, veraltete Caches auf; fremde Caches (z. B. ORNA «nn-…»)
// werden nie berührt. Alles für den Spielablauf wird bei der Einrichtung gespeichert: danach offline.
// Die Dateiliste und die Version setzt tools/build-orma.ts zwischen die Marken.

// <!-- ORMA:START -->
const VERSION = "c52a7651162a";
const PRECACHE = [
  "./",
  "app/",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/icon.svg",
  "js/app.js?v=c52a7651162a",
  "js/card.js?v=c52a7651162a",
  "js/data.js?v=c52a7651162a",
  "js/draw.js?v=c52a7651162a",
  "js/intro.js?v=c52a7651162a",
  "js/sprache.js?v=c52a7651162a",
  "js/store.js?v=c52a7651162a",
  "js/symbols.js?v=c52a7651162a",
  "js/wheel.js?v=c52a7651162a",
  "manifest.webmanifest",
  "og-orma.png",
  "orma.css?v=c52a7651162a",
  "schrift/instrument-sans-normal-latin-ext.woff2",
  "schrift/instrument-sans-normal-latin.woff2",
  "schrift/newsreader-italic-latin.woff2",
  "schrift/newsreader-normal-latin.woff2"
];
// <!-- ORMA:END -->

const CACHE = `orma-${VERSION}`;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("orma-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  const scope = new URL("./", self.registration.scope).pathname;
  if (!url.pathname.startsWith(scope)) return;                          // nur der eigene Ordner

  if (req.mode === "navigate") {
    // Zwei gleiche Seiten (Website: ./, installierte App: app/): zuerst das Netz (neue Fassung),
    // ohne Netz die gespeicherte Fassung derselben Seite, sonst die der Website.
    // «no-cache»: immer beim Server nachfragen, statt bis zu 10 Minuten die Browser-Kopie zu nehmen
    // (GitHub Pages erlaubt max-age=600) – so ist eine neue Fassung beim nächsten Öffnen da.
    event.respondWith(
      fetch(req, { cache: "no-cache" }).catch(() => caches.open(CACHE).then(c =>
        c.match(req, { ignoreSearch: true }).then(hit => hit || c.match(new URL("./", self.registration.scope).href))))
    );
    return;
  }
  event.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req))));
});
