// Service Worker der installierbaren Web-App «Nebeneinander, Nacheinander».
// Hält Rad und Feld offline bereit: alle Konstellationen liegen im Gerät, gezogen wird wie online.
// Seiten (HTML): zuerst Netz, damit Änderungen sofort ankommen; ohne Netz aus dem Speicher.
// Übrige Dateien: aus dem Speicher; sie tragen Versionsangaben (?v=) und ändern darum ihre Adresse.
//
// Die Liste unten schreibt tools/build-app.ts – nicht von Hand pflegen.
// <!-- APP:START -->
const VERSION = "07e23ed371ab";
const PRECACHE = [
  "../../icons.js?v=13",
  "../../styles.css?v=19",
  "../../vendor/goatcounter/count.js",
  "./",
  "app.webmanifest",
  "app/",
  "app/apple-touch-icon.png",
  "app/feld/",
  "app/icon-192.png",
  "app/icon-512.png",
  "app/icon-maskable-512.png",
  "feld/",
  "feld/feld.css?v=5",
  "js/data/artists.js?v=v6",
  "js/data/constellations.js?v=v6",
  "js/data/theorists.js?v=v6",
  "js/intro.js?v=3",
  "js/lib/geometry.js",
  "js/lib/random.js",
  "js/lib/spin.js",
  "js/lib/validation.js?v=2",
  "js/pwa.js?v=4",
  "js/symbols.js?v=2",
  "js/ticker.js?v=5",
  "js/wheel.js?v=12",
  "rad.css?v=22"
];
// <!-- APP:END -->

const CACHE = `nn-${VERSION}`;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("nn-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;   // Zählung u. a. nicht anfassen

  if (req.mode === "navigate") {
    // ?pair=… gehört zur selben Seite: gespeichert wird die Seite ohne Suchteil
    const key = url.origin + url.pathname;
    event.respondWith(
      fetch(req)
        .then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(key, res.clone())); return res; })
        .catch(() => caches.match(key).then(hit => hit || caches.match(req, { ignoreSearch: true })))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
