// PHORMA II – das Bild zur Zeit t auf einer 2D-Leinwand (Vorschau, Standbild, Video): vorn der Grund, dann die Kette aus der Bühne (WebGL,
// buehne.js), danach das Foto, darüber Abblenden und die Beschriftung, am Schluss auf Wunsch das leuchtende Signet von ornament.cloud wie in PHORMA I.
import { FPS, anteil, ausblenden, zeitachse, zeitcode, SIGNET_VON, SIGNET_TEMPO, MIT_TON } from "./ablauf.js?v=12";
import { signet as signetZeichnen, punktLage, PUNKT_RADIUS } from "../sketchory/signet.js?v=10";
import { tonOderErsatz } from "./ton.js?v=12";
import { zufall } from "./analyse.js?v=12";

export const FARBEN = { grund: "#000000", tinte: "#ffffff", punkt: "#f08a5d", hell: true };
const MONO = 'ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Mono", Menlo, Consolas, "Liberation Mono", monospace';

/** Szene: { breite, hoehe, zeit, foto, buehne, signet, beschriftung, titel, fragmente, schnitte }; text, ton, laenge nur fürs Gewebe */
export function szene({ breite = 1080, hoehe = 1350, tempo = "normal", signet = true, beschriftung = true, titel = "", foto = null, ablauf, buehne = null,
  text = "", ton = null, laenge = null } = {}) {
  const zeit = zeitachse({ tempo, signet, ablauf, laenge });
  const sz = { breite, hoehe, zeit, foto, buehne, signet, beschriftung, titel: (titel || "PHORMA II").trim(), fragmente: [], schnitte: [] };
  if (MIT_TON.includes(zeit.ablauf)) {
    const T = tonOderErsatz(ton), G = zeit.phasen.find((p) => p.name === zeit.ablauf);
    // die Schnitte zählen wie im Gewebe in der Zeit des Effekts (Vorlauf 0,4 s, ohne Tonspur im Tempo gestreckt)
    sz.schnitte = T.schnitte.map((s) => 0.4 + (s - 0.4) * zeit.tempo).filter((s) => s > G.von && s < G.bis);
    if (text) sz.fragmente = fragmentPlan(text, T, G, breite, hoehe);
  }
  return sz;
}

/**
 * Textfragmente wie im Video von Pauric Freeman: bei Einsätzen zwei Zeichen des Texts in einer dünnen Grotesk, getippt, mit einem dunklen Blockcursor
 * daneben; manchmal nur der Cursor. Wiederholbar (Zufall mit Startwert aus dem Text).
 */
function fragmentPlan(text, T, G, B, H) {
  const zeichen = [...String(text).replace(/\s+/g, "")];
  if (!zeichen.length) return [];
  let saat = 7;
  for (const z of zeichen) saat = (saat * 31 + z.codePointAt(0)) | 0;
  const rnd = zufall(saat), plan = [];
  let zuletzt = -1;
  for (const e of T.einsaetze) {
    if (e.t < G.von + 0.3 || e.t > G.bis - 0.5 || e.t - zuletzt < 0.55) continue;
    zuletzt = e.t;
    const i = Math.floor(rnd() * zeichen.length), nur = rnd() < 0.22;
    plan.push({ t: e.t, dauer: 0.35 + 0.6 * e.staerke, text: nur ? "" : zeichen[i] + (zeichen[i + 1] ?? ""), x: B * (0.22 + 0.56 * rnd()), y: H * (0.36 + 0.28 * rnd()), vor: rnd() < 0.5 });
  }
  return plan;
}

function fragmenteZeichnen(ctx, sz, t) {
  const H = sz.hoehe, g = Math.round(H * 0.075), invers = sz.schnitte.some((s) => t >= s && t < s + 4 / FPS);
  ctx.save();
  ctx.font = `300 ${g}px "Instrument Sans", system-ui, sans-serif`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
  for (const f of sz.fragmente) {
    if (t < f.t || t > f.t + f.dauer) continue;
    const text = f.text.slice(0, Math.min(f.text.length, Math.floor((t - f.t) * 20) + 1)), b = ctx.measureText(text).width;
    const cw = g * 0.5, ch = g * 1.45, luft = text ? g * 0.18 : 0;
    const cx = f.vor ? f.x - cw - luft : f.x + b + luft;
    ctx.globalAlpha = 0.85 * (1 - anteil(t, f.t + f.dauer - 0.12, f.t + f.dauer));
    ctx.fillStyle = invers ? "#d8d8d4" : "#6b6b68"; ctx.fillText(text, f.x, f.y);
    ctx.fillStyle = invers ? "#f2f2f0" : "#0d1020"; ctx.fillRect(cx, f.y - ch / 2, cw, ch);
  }
  ctx.restore();
}

/** Pixelmass der Ziel-Leinwand (Vorschau kleiner, Video voll): darin rechnet WebGL */
const zielMass = (ctx, sz) => { const m = ctx.getTransform(); return [sz.breite * Math.hypot(m.a, m.b), sz.hoehe * Math.hypot(m.c, m.d)]; };

function beschriftung(ctx, sz, t, sicht) {
  const B = sz.breite, H = sz.hoehe, F = FARBEN, s = Math.min(B, H) / 1080, rand = 54 * s, g = Math.round(22 * s);
  ctx.save();
  ctx.globalAlpha = sicht * 0.85; ctx.fillStyle = F.tinte; ctx.strokeStyle = F.tinte; ctx.lineWidth = 1.5 * s;
  const m = 26 * s, e = rand * 0.55;
  ctx.beginPath();
  for (const [x, y, dx, dy] of [[e, e, 1, 1], [B - e, e, -1, 1], [e, H - e, 1, -1], [B - e, H - e, -1, -1]]) { ctx.moveTo(x + dx * m, y); ctx.lineTo(x, y); ctx.lineTo(x, y + dy * m); }
  ctx.stroke();
  ctx.font = `500 ${g}px ${MONO}`; ctx.textBaseline = "alphabetic";
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${(0.08 * g).toFixed(1)}px`;
  const oben = rand + g;
  ctx.textAlign = "left"; ctx.fillText(sz.titel.toUpperCase().slice(0, 40), rand, oben);
  ctx.textAlign = "right"; ctx.fillText(zeitcode(t), B - rand, oben);
  const phasen = sz.zeit.phasen;
  let nr = 0;
  phasen.forEach((ph, i) => { if (t >= ph.von - 0.05) nr = i; });
  const { titel, von: a, bis: b } = phasen[nr], fort = anteil(t, a, b);
  const unten = H - rand;
  ctx.textAlign = "left";
  ctx.fillText(`${String(nr + 1).padStart(2, "0")} ${titel.toUpperCase()}`, rand, unten - g * 1.9);
  ctx.globalAlpha = sicht * 0.55; ctx.fillText(sz.buehne?.zaehler(sz.zeit, t) ?? "", rand, unten);
  const lb = Math.min(260 * s, B * 0.3), ly = unten - g * 1.9 + g * 0.55;
  ctx.globalAlpha = sicht * 0.3; ctx.fillRect(B - rand - lb, ly - 1, lb, 2 * s);
  ctx.globalAlpha = sicht * 0.85; ctx.fillRect(B - rand - lb, ly - 1, lb * fort, 2 * s);
  ctx.textAlign = "right"; ctx.globalAlpha = sicht * 0.55; ctx.fillText(`${B}×${H} · ${FPS} fps`, B - rand, unten);
  ctx.restore();
}

/** Bild zur Zeit t (Sekunden); proben: Proben je Bild für die Bewegungsunschärfe (Vorschau 1); vorschau: Simulationen holen nur begrenzt auf */
export function bild(ctx, sz, t, { proben = 1, vorschau = false } = {}) {
  const { ab, abschnitt } = sz.zeit, B = sz.breite, H = sz.hoehe, F = FARBEN;
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = F.grund; ctx.fillRect(0, 0, B, H);
  const bildEnde = ab.bildAus ? ab.bildAus[1] : ab.schluss[1];
  if (t < bildEnde) {
    if (t >= abschnitt.von && t < abschnitt.bis) {
      if (sz.buehne) {
        const [w, h] = zielMass(ctx, sz), c = sz.buehne.bild(sz.zeit, t, w, h, { proben, vorschau });
        // ist es ganz das Foto, dann das Foto selbst: in jeder Grösse gleich wie danach, ohne den Unterschied der Filter beim Verkleinern
        ctx.drawImage(sz.buehne.ende >= 1 && sz.foto ? sz.foto : c, 0, 0, B, H);
        if (sz.fragmente.length) fragmenteZeichnen(ctx, sz, t);
      }
      else if (sz.foto) { ctx.globalAlpha = anteil(t, abschnitt.bis - 1.5, abschnitt.bis); ctx.drawImage(sz.foto, 0, 0, B, H); ctx.globalAlpha = 1; }   // ohne WebGL 2
    } else if (t >= abschnitt.bis && sz.foto) ctx.drawImage(sz.foto, 0, 0, B, H);
    if (ab.bildAus) {
      const weg = ausblenden(anteil(t, ab.bildAus[0], ab.bildAus[1]));
      if (weg > 0) { ctx.globalAlpha = weg; ctx.fillStyle = F.grund; ctx.fillRect(0, 0, B, H); ctx.globalAlpha = 1; }
    }
    if (sz.beschriftung) {
      const sicht = anteil(t, ab.vor[0] + 0.1, ab.vor[1] + 0.3) * (1 - anteil(t, ab.stehen[0] - 0.1, ab.stehen[0] + 0.6));
      if (sicht > 0) beschriftung(ctx, sz, t, sicht);
    }
  }
  if (ab.signet && t >= ab.signet[0] && t < ab.signetAus[1]) {
    ctx.save(); ctx.translate((B - 1080) / 2, 0);
    const f = SIGNET_VON + (t - ab.signet[0]) * FPS * SIGNET_TEMPO;
    const opt = { hoehe: H, farben: F, punktTempo: SIGNET_TEMPO * 1.25, zusammen: [118, 172, (x) => (1 - Math.cos(Math.PI * x)) / 2] };
    if (sz.buehne) {
      // leuchtend wie in PHORMA I: der Punkt läuft als kleiner Glaskristall durch die Schlaufe, mit Halo und Bokeh auf seiner Spur
      const [w, h] = zielMass(ctx, sz), { lage: [px, py], sicht } = punktLage(f, opt);
      const zeichnen = (c) => { c.fillStyle = F.grund; c.fillRect(0, 0, 1080, H); signetZeichnen(c, f, opt); };
      const spur = [5, 10, 15, 20].map((d) => { const [sx, sy] = punktLage(Math.max(0, f - d * SIGNET_TEMPO), opt).lage; return [sx, sy + (H - 1920) / 2]; });
      ctx.drawImage(sz.buehne.signet(zeichnen, { lage: [px, py + (H - 1920) / 2], sicht, radius: PUNKT_RADIUS, spur, farbe: F.punkt }, f, w, h), 0, 0, 1080, H);
    } else signetZeichnen(ctx, f, opt);
    ctx.restore();
    const weg = ausblenden(anteil(t, ab.signetAus[0], ab.signetAus[1]));
    if (weg > 0) { ctx.globalAlpha = weg; ctx.fillStyle = F.grund; ctx.fillRect(0, 0, B, H); ctx.globalAlpha = 1; }
  }
}

/** Zeitpunkt für das Standbild, wenn nichts anderes gewählt ist: die Mitte der zweiten Phase */
export const standbildZeit = (sz) => { const p = sz.zeit.phasen[Math.min(1, sz.zeit.phasen.length - 1)]; return p.von + 0.5 * (p.bis - p.von); };
