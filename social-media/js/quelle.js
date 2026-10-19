// Social Media – was sich aus der Adresse eines Beitrags lesen lässt (seit 19. Oktober 2026): Plattform, Handle, Profiladresse und,
// wo die Kennung eine Uhr enthält, der genaue Zeitpunkt der Veröffentlichung.
//   X:         https://x.com/<handle>/status/<id>      – die id ist eine «Snowflake»: die oberen Bits sind Millisekunden seit 4. November 2010
//   Instagram: https://www.instagram.com/p/<kürzel>/   – das Kürzel ist die Medien-id in Base64; ihre oberen Bits sind Millisekunden seit 24. August 2011
//   Facebook:  keine Uhr in der Adresse
// Rein und ohne Abhängigkeiten: dieselben Funktionen laufen in der Redaktion (Browser) und in den Tests (Node).

export const PLATTFORMEN = ["x", "facebook", "instagram"];
export const PLATTFORM_NAME = { x: "X", facebook: "Facebook", instagram: "Instagram" };

const X_EPOCHE = 1288834974657n;          // 4. November 2010, 01:42:54.657 UTC
const IG_EPOCHE = 1314220021721n;         // 24. August 2011
const IG_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Adresse lesen (auch ohne https://); null, wenn es keine ist */
function url(adresse) {
  const s = String(adresse ?? "").trim();
  if (!s) return null;
  try { return new URL(/^[a-z]+:\/\//i.test(s) ? s : `https://${s}`); } catch { return null; }
}

/** «x», «facebook», «instagram» oder null */
export function plattformAusUrl(adresse) {
  const u = url(adresse);
  if (!u) return null;
  const h = u.hostname.toLowerCase().replace(/^(www|mobile|m|web)\./, "");
  if (["x.com", "twitter.com", "fxtwitter.com", "vxtwitter.com", "fixupx.com"].includes(h)) return "x";
  if (["facebook.com", "fb.com", "fb.watch", "business.facebook.com"].includes(h)) return "facebook";
  if (["instagram.com", "instagr.am"].includes(h)) return "instagram";
  return null;
}

const KEIN_HANDLE = new Set(["i", "home", "search", "explore", "hashtag", "intent", "share", "p", "reel", "reels", "tv", "stories", "watch",
  "groups", "events", "photo", "photo.php", "permalink.php", "story.php", "profile.php", "people", "pages", "settings", "notifications", "messages"]);

/** das Handle ohne @ (X, Instagram, Facebook-Seiten mit Namen), sonst null */
export function handleAusUrl(adresse) {
  const u = url(adresse), p = plattformAusUrl(adresse);
  if (!u || !p) return null;
  const teile = u.pathname.split("/").filter(Boolean);
  if (p === "instagram" && teile[0] === "stories" && teile[1]) return teile[1];
  const erstes = teile[0];
  if (!erstes || KEIN_HANDLE.has(erstes.toLowerCase())) return null;
  if (!/^[A-Za-z0-9._]{1,50}$/.test(erstes)) return null;
  return erstes;
}

/** Profiladresse aus Plattform und Handle */
export function profilUrl(plattform, handle) {
  const h = String(handle ?? "").trim().replace(/^@/, "");
  if (!h || !/^[A-Za-z0-9._]{1,50}$/.test(h)) return null;
  if (plattform === "x") return `https://x.com/${h}`;
  if (plattform === "instagram") return `https://www.instagram.com/${h}/`;
  if (plattform === "facebook") return `https://www.facebook.com/${h}`;
  return null;
}

/** id eines X-Beitrags aus der Adresse */
export function xId(adresse) {
  const u = url(adresse);
  if (!u || plattformAusUrl(adresse) !== "x") return null;
  const m = u.pathname.match(/\/status(?:es)?\/(\d{6,20})/);
  return m ? m[1] : null;
}

/** Instagram-Kürzel (/p/…, /reel/…, /tv/…) */
export function igKuerzel(adresse) {
  const u = url(adresse);
  if (!u || plattformAusUrl(adresse) !== "instagram") return null;
  const m = u.pathname.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]{5,14})/);
  return m ? m[1] : null;
}

/**
 * Zeitpunkt der Veröffentlichung aus der Adresse (ISO, UTC, auf die Sekunde) oder null.
 * Nur plausible Werte: nach der Epoche der Plattform und nicht in der Zukunft (bis: Zeitpunkt der Erfassung).
 */
export function zeitAusUrl(adresse, bis = Date.now()) {
  let ms = null;
  const x = xId(adresse);
  if (x) {
    const id = BigInt(x);
    if (id > 2n ** 22n * 1000n) ms = Number((id >> 22n) + X_EPOCHE);       // ältere ids (vor Ende 2010) tragen keine Uhr
  }
  const k = igKuerzel(adresse);
  if (k && k.length <= 11) {
    let id = 0n;
    for (const z of k) id = id * 64n + BigInt(IG_ALPHABET.indexOf(z));
    ms = Number((id >> 23n) + IG_EPOCHE);
  }
  if (ms === null) return null;
  const grenze = typeof bis === "number" ? bis : Date.parse(bis);
  if (!(ms > Date.UTC(2006, 0, 1)) || ms > grenze + 60_000) return null;
  return new Date(Math.floor(ms / 1000) * 1000).toISOString().replace(".000Z", "Z");
}

/** alles auf einmal: { plattform, handle, profil, veroeffentlicht } (fehlende Werte null) */
export function ausAdresse(adresse, bis) {
  const plattform = plattformAusUrl(adresse), handle = handleAusUrl(adresse);
  return { plattform, handle, profil: plattform && handle ? profilUrl(plattform, handle) : null, veroeffentlicht: zeitAusUrl(adresse, bis) };
}
