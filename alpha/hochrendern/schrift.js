// Hochrendern – Schrift über dem Video (seit 19. Oktober 2026; Wunsch: «Schrift über die Videos legen können, viele coole moderne Schriften»).
// Ebenen: { text, schrift, groesse (Anteil der kürzeren Seite), laufweite (em), versalien, farbe, stil, zweite (Farbe für Kontur, Schatten, Balken,
// Leuchten), ausrichtung, x, y (0 … 1: Ankerpunkt – links, Mitte oder rechts des Blocks, senkrecht seine Mitte), von, bis (s; bis null: bis zum Schluss),
// auftritt }. Gezeichnet wird auf einer 2D-Leinwand in der Grösse des Ziels – in der Vorschau klein, im Export in voller Auflösung, immer scharf.
// Die Schriften liegen lokal in vendor/schriften/ (tools/schriften-holen.mjs; SIL Open Font License, Permanent Marker Apache 2.0).

export const STILE = { rein: "Schlicht", kontur: "Kontur", schatten: "Schatten", balken: "Balken", leuchten: "Leuchten" };
export const AUFTRITTE = { keiner: "Sofort", blenden: "Einblenden", tippen: "Tippen", gleiten: "Gleiten", zoom: "Zoom" };
const EIN = 0.6, AUS = 0.4;                                                // Sekunden für Auftritt und Abgang

export function neueEbene(schrift = "Space Grotesk", schnitt = 700, stilArt = "normal") {
  return { text: "Dein Text", schrift, schnitt, schriftStil: stilArt, groesse: 0.09, laufweite: 0, versalien: false, farbe: "#ffffff", stil: "schatten", zweite: "#000000",
    ausrichtung: "center", x: 0.5, y: 0.82, von: 0, bis: null, auftritt: "blenden" };
}

/** die Schrift als CSS-Kurzform in Pixeln */
export const schriftzug = (e, px) => `${e.schriftStil === "italic" ? "italic " : ""}${e.schnitt} ${Math.max(1, px).toFixed(2)}px "${e.schrift}"`;
const weich = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

/** wie weit eine Ebene zur Zeit t da ist: { sicht (0 … 1, null: nicht da), zeichen (Anteil beim Tippen), dy (em), skala } */
export function auftritt(e, t, dauer = Infinity) {
  const bis = e.bis ?? dauer, von = e.von ?? 0;
  if (t < von || t > bis) return null;
  const a = e.auftritt === "keiner" ? 1 : weich((t - von) / EIN), z = e.auftritt === "keiner" || !Number.isFinite(bis) ? 1 : weich((bis - t) / AUS);
  switch (e.auftritt) {
    case "tippen": return { sicht: z, zeichen: Math.min(1, (t - von) / Math.max(0.3, 0.055 * [...e.text].length)), dy: 0, skala: 1 };
    case "gleiten": return { sicht: Math.min(a, z), zeichen: 1, dy: 0.5 * (1 - a), skala: 1 };
    case "zoom": return { sicht: Math.min(a, z), zeichen: 1, dy: 0, skala: 1 + 0.18 * (1 - a) };
    case "keiner": return { sicht: 1, zeichen: 1, dy: 0, skala: 1 };
    default: return { sicht: Math.min(a, z), zeichen: 1, dy: 0, skala: 1 };
  }
}

/** die Zeilen einer Ebene mit ihren Massen auf einer Leinwand B × H: { px, zeilen: [{ text, breite }], box: [x0, y0, x1, y1] } */
export function satz(ctx, e, B, H) {
  const px = Math.min(B, H) * e.groesse, zeilen = (e.versalien ? e.text.toUpperCase() : e.text).split("\n");
  ctx.font = schriftzug(e, px);
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${(e.laufweite * px).toFixed(2)}px`;
  const gemessen = zeilen.map((text) => ({ text, breite: ctx.measureText(text).width }));
  const breit = Math.max(1, ...gemessen.map((z) => z.breite)), hoch = px * 1.12 * zeilen.length;
  const ax = e.x * B, ay = e.y * H, x0 = e.ausrichtung === "left" ? ax : e.ausrichtung === "right" ? ax - breit : ax - breit / 2;
  return { px, zeilen: gemessen, box: [x0, ay - hoch / 2, x0 + breit, ay + hoch / 2] };
}

/** alle Ebenen zur Zeit t (s) auf ctx (Leinwand B × H); dauer: Länge des Videos (für «bis zum Schluss») */
export function zeichneSchrift(ctx, ebenen, t, B, H, dauer = Infinity) {
  for (const e of ebenen) {
    if (!e.text.trim()) continue;
    const a = auftritt(e, t, dauer);
    if (!a || a.sicht <= 0.001) continue;
    ctx.save();
    const { px, zeilen, box } = satz(ctx, e, B, H), zeilenhoehe = px * 1.12, mx = (box[0] + box[2]) / 2, my = (box[1] + box[3]) / 2;
    ctx.globalAlpha = a.sicht;
    ctx.translate(mx, my + a.dy * px); ctx.scale(a.skala, a.skala); ctx.translate(-mx, -my);
    ctx.textAlign = e.ausrichtung; ctx.textBaseline = "middle";
    const ax = e.x * B;
    // beim Tippen: so viele Zeichen über alle Zeilen, wie die Zeit erlaubt
    let rest = Math.round([...zeilen.map((z) => z.text).join("")].length * a.zeichen);
    zeilen.forEach((z, i) => {
      const zeichen = [...z.text], sicht = zeichen.slice(0, Math.max(0, rest)).join("");
      rest -= zeichen.length;
      if (!sicht) return;
      const y = box[1] + zeilenhoehe * (i + 0.5);
      if (e.stil === "balken") {
        // der Balken hinter der ganzen Zeile (beim Tippen hinter dem Getippten)
        const b = ctx.measureText(sicht).width, pad = 0.22 * px, x0 = e.ausrichtung === "left" ? ax : e.ausrichtung === "right" ? ax - b : ax - b / 2;
        ctx.fillStyle = e.zweite;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x0 - pad, y - zeilenhoehe / 2, b + 2 * pad, zeilenhoehe, 0.12 * px); else ctx.rect(x0 - pad, y - zeilenhoehe / 2, b + 2 * pad, zeilenhoehe);
        ctx.fill();
      }
      if (e.stil === "schatten") Object.assign(ctx, { shadowColor: e.zweite, shadowBlur: 0.18 * px, shadowOffsetY: 0.06 * px });
      if (e.stil === "leuchten") {
        // zwei Schichten Schein in der zweiten Farbe, dann die Schrift selbst
        Object.assign(ctx, { shadowColor: e.zweite, shadowBlur: 0.6 * px, fillStyle: e.zweite }); ctx.fillText(sicht, ax, y);
        Object.assign(ctx, { shadowBlur: 0.2 * px }); ctx.fillText(sicht, ax, y);
        Object.assign(ctx, { shadowBlur: 0.05 * px, shadowColor: e.farbe });
      }
      if (e.stil === "kontur") { Object.assign(ctx, { strokeStyle: e.zweite, lineWidth: 0.12 * px, lineJoin: "round" }); ctx.strokeText(sicht, ax, y); }
      ctx.fillStyle = e.farbe;
      ctx.fillText(sicht, ax, y);
      Object.assign(ctx, { shadowBlur: 0, shadowOffsetY: 0, shadowColor: "transparent" });
    });
    ctx.restore();
  }
}

/** welche Ebene liegt am Punkt (x, y) der Leinwand B × H (die oberste zuerst); -1: keine */
export function treffer(ctx, ebenen, t, B, H, x, y, dauer = Infinity) {
  for (let i = ebenen.length - 1; i >= 0; i--) {
    const e = ebenen[i];
    if (!e.text.trim() || !auftritt(e, t, dauer)) continue;
    const [x0, y0, x1, y1] = satz(ctx, e, B, H).box, rand = 0.02 * Math.min(B, H);
    if (x >= x0 - rand && x <= x1 + rand && y >= y0 - rand && y <= y1 + rand) return i;
  }
  return -1;
}

/** alle Schriften der Ebenen laden (sonst zeichnet die Leinwand mit der Ersatzschrift) */
export async function schriftenLaden(ebenen) {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all(ebenen.map((e) => document.fonts.load(schriftzug(e, 48), e.text || "Aa").catch(() => {})));
}
