// Social Media – Redaktion: Bilder im Browser (seit 19. Oktober 2026). Alles bleibt auf dem Gerät, bis veröffentlicht wird.
// Neu gezeichnete Bilder verlieren ihre Metadaten (Ort, Gerät, Zeit): Jedes Bild wird über eine Leinwand neu geschrieben, als WebP.
// Geschwärzt wird mit voller Fläche (nicht weichgezeichnet: Unschärfe lässt sich manchmal zurückrechnen), vor dem Verkleinern und vor dem Ausschneiden.

export const MAX_BELEG = 1400;      // längste Seite des veröffentlichten Belegs in Bildpunkten (Breite bei hohen Bildschirmfotos)
export const MAX_BILD = 2000;
export const AVATAR = 160;

export async function bitmap(datei) {
  return createImageBitmap(datei, { imageOrientation: "from-image" });
}

export async function sha256(datei) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", await datei.arrayBuffer()));
  return [...h].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const leinwand = (b, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(b)); c.height = Math.max(1, Math.round(h)); return c; };
const alsBlob = (c, typ = "image/webp", q = 0.84) => new Promise((ok, nein) => c.toBlob((b) => (b ? ok(b) : nein(new Error("Bild konnte nicht geschrieben werden."))), typ, q));
export const bytes = async (blob) => new Uint8Array(await blob.arrayBuffer());

/** das Bildschirmfoto in voller Grösse, mit geschwärzten Bereichen (normalisiert 0–1) */
export function geschwaerzt(bild, schwaerzen = []) {
  const c = leinwand(bild.width, bild.height), g = c.getContext("2d");
  g.drawImage(bild, 0, 0);
  g.fillStyle = "#1f1d1a";
  for (const r of schwaerzen) g.fillRect(r.x * c.width - 2, r.y * c.height - 2, r.b * c.width + 4, r.h * c.height + 4);
  return c;
}

/** verkleinert (längste Seite höchstens max; bei sehr hohen Bildern die Breite) als WebP → { blob, breite, hoehe } */
export async function verkleinert(quelle, max, { typ = "image/webp", q = 0.84, nachBreite = false } = {}) {
  const b = quelle.width, h = quelle.height;
  const f = Math.min(1, max / (nachBreite ? b : Math.max(b, h)));
  const c = leinwand(b * f, h * f), g = c.getContext("2d");
  g.imageSmoothingQuality = "high";
  g.drawImage(quelle, 0, 0, c.width, c.height);
  return { blob: await alsBlob(c, typ, q), breite: c.width, hoehe: c.height };
}

/** ein Bereich (normalisiert) aus der Quelle; quadratisch: mittig auf ein Quadrat erweitert (Profilbild) */
export async function ausschnitt(quelle, r, max, { quadratisch = false } = {}) {
  let x = r.x * quelle.width, y = r.y * quelle.height, b = r.b * quelle.width, h = r.h * quelle.height;
  if (quadratisch) { const s = Math.max(b, h); x -= (s - b) / 2; y -= (s - h) / 2; b = h = s; }
  x = Math.max(0, x); y = Math.max(0, y); b = Math.min(b, quelle.width - x); h = Math.min(h, quelle.height - y);
  const c = leinwand(b, h);
  c.getContext("2d").drawImage(quelle, x, y, b, h, 0, 0, c.width, c.height);
  return verkleinert(c, max);
}

/** ein hochgeladenes Bild neu schreiben (ohne Metadaten, höchstens MAX_BILD) */
export async function bildNeu(datei) {
  const b = await bitmap(datei);
  try { return await verkleinert(b, MAX_BILD); } finally { b.close?.(); }
}

/** Video: Masse und ein Standbild (JPEG) nach einer halben Sekunde */
export function videoStandbild(datei) {
  return new Promise((ok, nein) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(datei);
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = url;
    v.onerror = () => { URL.revokeObjectURL(url); nein(new Error("Dieses Video kann der Browser nicht lesen (MP4 mit H.264 oder WebM verwenden).")); };
    v.onloadedmetadata = () => { v.currentTime = Math.min(0.5, (v.duration || 1) / 2); };
    v.onseeked = async () => {
      try {
        const c = leinwand(v.videoWidth, v.videoHeight);
        c.getContext("2d").drawImage(v, 0, 0);
        const poster = await verkleinert(c, 1280, { typ: "image/jpeg", q: 0.82 });
        ok({ breite: v.videoWidth, hoehe: v.videoHeight, dauer: v.duration, poster });
      } catch (e) { nein(e); } finally { URL.revokeObjectURL(url); }
    };
  });
}

/**
 * das Bildschirmfoto für Claude: als JPEG, höchstens etwa 1,15 Millionen Bildpunkte je Teil (so liest Claude ohne weiteres Verkleinern);
 * hohe Bildschirmfotos in überlappende Teile geschnitten, damit die Schrift lesbar bleibt. → [{ daten (Base64), typ, oben, hoehe }]
 */
export async function teileFuerClaude(quelle, { maxPixel = 1_150_000, maxKante = 1568, ueberlapp = 0.06 } = {}) {
  const B = quelle.width, H = quelle.height;
  const breite = Math.min(B, 1092);                                      // Breite eines Teils (Schrift eines Telefons bleibt lesbar)
  const f = breite / B;
  const teilHoehe = Math.min(maxKante, Math.floor(maxPixel / breite));    // in Bildpunkten nach dem Skalieren
  const gesamt = H * f;
  const anzahl = Math.max(1, Math.ceil((gesamt - teilHoehe * ueberlapp) / (teilHoehe * (1 - ueberlapp))));
  const teile = [];
  for (let i = 0; i < Math.min(anzahl, 5); i++) {
    const obenPx = anzahl === 1 ? 0 : Math.min(i * teilHoehe * (1 - ueberlapp), gesamt - teilHoehe);
    const hoehePx = Math.min(teilHoehe, gesamt);
    const c = leinwand(breite, hoehePx);
    const g = c.getContext("2d");
    g.imageSmoothingQuality = "high";
    g.drawImage(quelle, 0, obenPx / f, B, hoehePx / f, 0, 0, c.width, c.height);
    const blob = await alsBlob(c, "image/jpeg", 0.9);
    const b64 = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.readAsDataURL(blob); });
    teile.push({ daten: b64, typ: "image/jpeg", oben: obenPx / gesamt, hoehe: hoehePx / gesamt });
  }
  return teile;
}

/**
 * Vorschaukarte zum Teilen (Open Graph, 1200 × 630, JPEG): Papier, Zettelnummer und Plattform, Titel in Newsreader, ein Auszug, wer spricht.
 * avatar: ImageBitmap oder null.
 */
export async function vorschaukarte({ nr, titel, plattform, name, handle, auszug, avatar }) {
  try { await Promise.all([document.fonts.load('400 64px "Newsreader"'), document.fonts.load('italic 400 34px "Newsreader"')]); } catch {}
  const c = leinwand(1200, 630), g = c.getContext("2d");
  g.fillStyle = "#f8f8f6"; g.fillRect(0, 0, 1200, 630);
  g.fillStyle = "#ffffff"; g.strokeStyle = "#e4e0d8"; g.lineWidth = 2;
  g.beginPath(); g.roundRect(56, 52, 1088, 526, 10); g.fill(); g.stroke();
  const ton = { x: "#1f1d1a", facebook: "#3a5a9b", instagram: "#b0306a" }[plattform] ?? "#1f1d1a";
  g.fillStyle = ton; g.fillRect(56, 52, 1088, 5);
  const sans = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  g.fillStyle = "#6b665e"; g.font = `500 26px ${sans}`;
  g.fillText(`Zettel ${nr} · ${{ x: "X", facebook: "Facebook", instagram: "Instagram" }[plattform] ?? ""}`, 104, 120);
  // Titel, höchstens zwei Zeilen
  g.fillStyle = "#1f1d1a"; g.font = '400 62px "Newsreader", Georgia, serif';
  let y = zeilen(g, titel, 104, 196, 992, 70, 2);
  // Auszug, höchstens drei Zeilen
  g.fillStyle = "#3d3a35"; g.font = 'italic 400 33px "Newsreader", Georgia, serif';
  y = zeilen(g, auszug ? `«${auszug}»` : "", 104, y + 28, 992, 44, 3);
  // wer spricht
  const unten = 520;
  if (avatar) {
    g.save(); g.beginPath(); g.arc(128, unten - 10, 26, 0, Math.PI * 2); g.clip();
    g.drawImage(avatar, 102, unten - 36, 52, 52); g.restore();
  }
  g.fillStyle = "#1f1d1a"; g.font = `600 28px ${sans}`;
  g.fillText(name ?? "", avatar ? 170 : 104, unten - 2);
  const nameBreite = g.measureText(name ?? "").width;
  if (handle) { g.fillStyle = "#6b665e"; g.font = `400 26px ${sans}`; g.fillText(`@${handle}`, (avatar ? 170 : 104) + nameBreite + 12, unten - 2); }
  g.fillStyle = "#6b665e"; g.font = `500 22px ${sans}`;
  const fuss = "ornament.cloud/social-media";
  g.fillText(fuss, 1096 - g.measureText(fuss).width, unten - 2);
  return { ...(await verkleinert(c, 1200, { typ: "image/jpeg", q: 0.86 })) };
}

/** Text in Zeilen setzen (höchstens n Zeilen, mit … am Ende); gibt die y-Lage der letzten Grundlinie zurück */
function zeilen(g, text, x, y, breite, abstand, n) {
  const woerter = String(text ?? "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  let zeile = "", z = 0, letzteY = y - abstand;
  for (let i = 0; i < woerter.length; i++) {
    const probe = zeile ? `${zeile} ${woerter[i]}` : woerter[i];
    if (g.measureText(probe).width > breite && zeile) {
      if (z === n - 1) { g.fillText(`${zeile.replace(/[.,;:]$/, "")} …`, x, y + z * abstand); return y + z * abstand; }
      g.fillText(zeile, x, y + z * abstand); letzteY = y + z * abstand; z++; zeile = woerter[i];
    } else zeile = probe;
  }
  if (zeile) { g.fillText(zeile, x, y + z * abstand); letzteY = y + z * abstand; }
  return letzteY;
}
