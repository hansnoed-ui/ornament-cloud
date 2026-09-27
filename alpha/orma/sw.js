// ORMA – Service Worker. Eigener Geltungsbereich (der ORMA-Ordner), eigener Cache «orma-<Version>».
// Räumt beim Aktualisieren ausschliesslich eigene, veraltete Caches auf; fremde Caches (z. B. ORNA «nn-…»)
// werden nie berührt. Alles für den Spielablauf wird bei der Einrichtung gespeichert: danach offline.
// Die Dateiliste und die Version setzt tools/build-orma.ts zwischen die Marken.

// <!-- ORMA:START -->
const VERSION = "2c61eb83670d";
const PRECACHE = [
  "./",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/icon.svg",
  "js/app.js?v=2c61eb83670d",
  "js/card.js?v=2c61eb83670d",
  "js/data.js?v=2c61eb83670d",
  "js/draw.js?v=2c61eb83670d",
  "js/store.js?v=2c61eb83670d",
  "js/symbols.js?v=2c61eb83670d",
  "js/wheel.js?v=2c61eb83670d",
  "manifest.webmanifest",
  "orma.css?v=2c61eb83670d"
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
    // Die App ist eine einzige Seite: zuerst das Netz (neue Fassung), ohne Netz die gespeicherte
    event.respondWith(
      fetch(req).catch(() => caches.open(CACHE).then(c => c.match(new URL("./", self.registration.scope).href)))
    );
    return;
  }
  event.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req))));
});
