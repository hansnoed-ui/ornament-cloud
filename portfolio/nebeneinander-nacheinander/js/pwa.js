// Installierbare Web-App: meldet den Service Worker an (sw.js im Werkordner, Geltungsbereich Rad und Feld).
// Ohne Unterstützung oder ohne sichere Verbindung passiert nichts; die Seite funktioniert wie bisher.
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  addEventListener("load", () => {
    navigator.serviceWorker.register(new URL("../sw.js", import.meta.url)).catch(() => { /* kein Offline-Betrieb, sonst unverändert */ });
  });
}
