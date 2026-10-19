// Social Media – Redaktion: was der Browser sich merkt (seit 19. Oktober 2026).
// Schlüssel: auf Wunsch in localStorage (auf diesem Gerät), sonst in sessionStorage (bis das Fenster zugeht).
// Entwurf: in IndexedDB, mit den Dateien als Blobs, damit nichts verloren geht, wenn die Seite zugeht. Ein Entwurf zur Zeit.
const SCHLUESSEL = "sm-redaktion:einstellungen";

function speicher(art) { try { return art === "lokal" ? localStorage : sessionStorage; } catch { return null; } }

export function einstellungenLesen() {
  for (const art of ["lokal", "sitzung"]) {
    try { const t = speicher(art)?.getItem(SCHLUESSEL); if (t) return { ...JSON.parse(t), merken: art === "lokal" }; } catch {}
  }
  return { github: "", anthropic: "", repo: "hansnoed-ui/ornament-cloud", zweig: "main", merken: false };
}

export function einstellungenSchreiben(e) {
  const { merken, ...rest } = e;
  try { speicher("lokal")?.removeItem(SCHLUESSEL); speicher("sitzung")?.removeItem(SCHLUESSEL); } catch {}
  try { speicher(merken ? "lokal" : "sitzung")?.setItem(SCHLUESSEL, JSON.stringify(rest)); } catch {}
}

export function einstellungenLoeschen() {
  try { speicher("lokal")?.removeItem(SCHLUESSEL); speicher("sitzung")?.removeItem(SCHLUESSEL); } catch {}
}

// ---------- Entwurf ----------

let db = null;
function oeffnen() {
  if (db) return db;
  db = new Promise((ok, nein) => {
    const r = indexedDB.open("sm-redaktion", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("entwurf");
    r.onsuccess = () => ok(r.result);
    r.onerror = () => nein(r.error);
  });
  return db;
}
async function tun(modus, f) {
  const d = await oeffnen();
  return new Promise((ok, nein) => {
    const t = d.transaction("entwurf", modus);
    const r = f(t.objectStore("entwurf"));
    t.oncomplete = () => ok(r?.result);
    t.onerror = () => nein(t.error);
  });
}
export const entwurfLesen = () => tun("readonly", (s) => s.get("aktuell")).catch(() => null);
export const entwurfSchreiben = (entwurf) => tun("readwrite", (s) => s.put(entwurf, "aktuell")).catch(() => null);
export const entwurfLoeschen = () => tun("readwrite", (s) => s.delete("aktuell")).catch(() => null);
