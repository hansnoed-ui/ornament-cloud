// PHORMA III – die Cracks des Videos (Etappe 3 des Video-Ablaufs, seit 18. Oktober 2026; Wunsch: «dann Normal-Modus mit zwei, drei Cracks oder
// Glitches … am liebsten den heissesten Scheiss»): an jedem Hüpfer des Tons bricht das Bild auf, je Hüpfer eine andere Art, wiederholbar je Wurf.
//   mosh       Datamosh: das Schlüsselbild fehlt – das Bild vor dem Hüpfer bleibt stehen und wird von den Bewegungsvektoren und dem Restbild der
//              folgenden Bilder weitergeschoben, wie ein Decoder ohne I-Frame (Blocksuche je 8 × 8 Punkte, video.js); am Ende rastet es ein
//   bloecke    Makroblöcke: verlorene Slices – ab einem Fehler bis zum Ende der Zeile alte Blöcke, verschobene, flache und gezogene, im Takt
//   schlitz    Slit-Scan: jede Zeile aus einer anderen Zeit (bis eine halbe Sekunde zurück), die Zeit biegt sich in Wellen durchs Bild
//   sortieren  Pixel-Sortierung: in den hellen Strecken jeder Spalte wandern die Punkte nach Helligkeit, das Bild schmilzt nach oben
// Hier nur der Plan (ohne Grafik, für die Tests); gezeichnet wird in video.js.
export const ARTEN = ["mosh", "bloecke", "schlitz", "sortieren"];
export const NAMEN = { mosh: "Datamosh", bloecke: "Makroblöcke", schlitz: "Slit-Scan", sortieren: "Pixel-Sortierung" };
export const DAUER = { mosh: 1.3, bloecke: 0.75, schlitz: 1.0, sortieren: 1.0 };
/** Bilder je Sekunde der Cracks (wie der Film) */
export const TAKT = 30;
/** Slit-Scan: so viele Zeitschichten, je so viele Filmbilder auseinander */
export const SCHICHTEN = 8, ABSTAND = 2;

function zufall(samen) {
  let a = (samen * 2246822519 + 3266489917) >>> 0 || 1;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/**
 * Die Cracks zu den Hüpfern ([{ t, art }], Sekunden des Tons = Filmzeit): je einer, alle verschieden, gemischt nach dem Wurf (samen); den Datamosh
 * bekommt ein Sprung, wenn es einen gibt (er lebt vom Schnitt). bis: höchstens bis kurz vor den nächsten Hüpfer und vor grenze (das Gefrickel).
 * → [{ art, von, bis, hop }]
 */
export function rissePlanen(huepfer, { samen = 1, grenze = Infinity } = {}) {
  const r = zufall(samen), arten = [...ARTEN];
  for (let i = arten.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arten[i], arten[j]] = [arten[j], arten[i]]; }
  const hs = (huepfer ?? []).filter((h) => Number.isFinite(h.t)).sort((a, b) => a.t - b.t), gewaehlt = arten.slice(0, hs.length);
  const s = hs.findIndex((h) => h.art === "sprung"), m = gewaehlt.indexOf("mosh");
  if (s >= 0 && m >= 0 && s !== m) [gewaehlt[s], gewaehlt[m]] = [gewaehlt[m], gewaehlt[s]];
  const risse = [];
  hs.forEach((h, i) => {
    const art = gewaehlt[i], von = h.t, naechster = hs[i + 1]?.t ?? Infinity;
    const bis = Math.min(von + DAUER[art], naechster - 0.15, grenze - 0.05);
    if (art && bis - von > 0.2) risse.push({ art, von, bis, hop: h.art });
  });
  return risse;
}

/** der Crack zur Filmzeit t: { i, riss, u (0 … 1 durch ihn hindurch), schritt (Filmbilder seit dem Anfang) } oder null */
export function rissBei(risse, t) {
  for (let i = 0; i < (risse?.length ?? 0); i++) {
    const r = risse[i];
    if (t >= r.von && t < r.bis) return { i, riss: r, u: (t - r.von) / (r.bis - r.von), schritt: Math.floor((t - r.von) * TAKT + 1e-6) };
  }
  return null;
}

/** Filmzeit des Schritts j eines Datamosh (j = 0: das letzte Bild vor dem Hüpfer, das stehen bleibt) */
export const moshZeit = (riss, j) => riss.von + (j - 1) / TAKT;

/**
 * Die Quellbilder eines Datamosh bis Schritt s (karte: Filmzeit → Sekunde der Quelle): q0, das stehende Bild, und je Schritt j ≥ 1 das Paar
 * [a, b] – die Bewegung von a nach b schiebt das Bild weiter. a ist das Bild davor im Lauf; nach einem Schnitt (über 0,1 s) das Bild davor in der
 * Quelle (die Bewegung des neuen Materials, nicht der Sprung). → { q0, paare }
 */
export function moshQuellen(riss, s, karte) {
  const q = (j) => karte(moshZeit(riss, j)), paare = [];
  for (let j = 1; j <= s; j++) { const b = q(j), a = q(j - 1); paare.push([Math.abs(b - a) > 0.1 ? b - 1 / TAKT : a, b]); }
  return { q0: q(0), paare };
}

/**
 * Welche Bilder ein Crack zur Filmzeit t braucht, in Sekunden der Quelle (kleine Bilder, die Vorschaugrösse): der Datamosh alle Schritte bis jetzt,
 * die Makroblöcke das Bild vor dem Fehler, der Slit-Scan die Zeitschichten, die Sortierung das Bild selbst. Für das Vorbereiten vor dem Export.
 */
export function bedarf(risse, t, karte) {
  const b = rissBei(risse, t);
  if (!b) return [];
  const { riss, schritt } = b;
  if (riss.art === "mosh") { const { q0, paare } = moshQuellen(riss, schritt, karte); return [q0, ...paare.flat()]; }
  if (riss.art === "bloecke") return [karte(moshZeit(riss, 0)), karte(t)];
  if (riss.art === "schlitz") return Array.from({ length: SCHICHTEN }, (_, j) => karte(Math.max(0, t - (j * ABSTAND) / TAKT)));
  return [karte(t)];
}
