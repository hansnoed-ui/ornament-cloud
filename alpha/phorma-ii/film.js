// PHORMA II – das Bild zur Zeit t auf einer 2D-Leinwand (Vorschau, Standbild, Video): vorn der Grund, dann die Kette aus der Bühne (WebGL,
// buehne.js), danach das Foto, darüber Abblenden und die Beschriftung, am Schluss auf Wunsch das leuchtende Signet von ornament.cloud wie in PHORMA I.
import { FPS, anteil, ausblenden, zeitachse, zeitcode, SIGNET_VON, SIGNET_BIS, SIGNET_TEMPO } from "./ablauf.js?v=39";
import { signet as signetZeichnen, punktLage, PUNKT_RADIUS } from "../sketchory/signet.js?v=10";

export const FARBEN = { grund: "#000000", tinte: "#ffffff", punkt: "#f08a5d", hell: true };
// endet die Kette mit dem Rasterdruck, steht das Signet gedruckt auf seinem Papier (dieselbe Farbe wie PAPIER in raster.js)
const DRUCK = { grund: "#ede8db", tinte: "#1f1d22", punkt: "#e0652e", hell: false };
const MONO = 'ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Mono", Menlo, Consolas, "Liberation Mono", monospace';

/** Szene: { breite, hoehe, zeit, foto, buehne, signet, beschriftung, titel } */
export function szene({ breite = 1080, hoehe = 1350, tempo = "normal", signet = true, beschriftung = true, titel = "", foto = null, ablauf, buehne = null } = {}) {
  const zeit = zeitachse({ tempo, signet, ablauf });
  return { breite, hoehe, zeit, foto, buehne, signet, beschriftung, titel: (titel || "PHORMA II").trim() };
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
  // nach dem Rasterdruck: zwischen Bild und Signet das Papier statt des Grunds
  const papier = sz.zeit.druck && sz.buehne?.druckSchluss && ab.bildAus && ab.signet && t >= ab.bildAus[0];
  ctx.fillStyle = papier && t >= ab.bildAus[1] ? DRUCK.grund : F.grund; ctx.fillRect(0, 0, B, H);
  const bildEnde = ab.bildAus ? ab.bildAus[1] : ab.signet ? ab.signet[0] : ab.schluss[1];   // nahtlos: das Signet übernimmt das Foto
  if (t < bildEnde) {
    if (t >= abschnitt.von && t < abschnitt.bis) {
      if (sz.buehne) {
        const [w, h] = zielMass(ctx, sz), c = sz.buehne.bild(sz.zeit, t, w, h, { proben, vorschau });
        // ist es ganz das Foto, dann das Foto selbst: in jeder Grösse gleich wie danach, ohne den Unterschied der Filter beim Verkleinern (mit Video
        // das laufende Bild – am Ende der Kette ist es das Standbild)
        ctx.drawImage(sz.buehne.ende >= 1 && sz.foto ? sz.buehne.jetzt ?? sz.foto : c, 0, 0, B, H);
      }
      else if (sz.foto) { ctx.globalAlpha = anteil(t, abschnitt.bis - 1.5, abschnitt.bis); ctx.drawImage(sz.foto, 0, 0, B, H); ctx.globalAlpha = 1; }   // ohne WebGL 2
    } else if (t >= abschnitt.bis && sz.zeit.druck && sz.buehne) {
      // der Rasterdruck endet nicht im Foto: sein letztes Bild bleibt stehen
      const [w, h] = zielMass(ctx, sz);
      ctx.drawImage(sz.buehne.bild(sz.zeit, abschnitt.bis - 1e-3, w, h, { proben, vorschau }), 0, 0, B, H);
    } else if (t >= abschnitt.bis && sz.foto) ctx.drawImage(sz.foto, 0, 0, B, H);
    if (ab.bildAus) {
      const weg = ausblenden(anteil(t, ab.bildAus[0], ab.bildAus[1]));
      if (weg > 0) { ctx.globalAlpha = weg; ctx.fillStyle = papier ? DRUCK.grund : F.grund; ctx.fillRect(0, 0, B, H); ctx.globalAlpha = 1; }
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
    if (sz.buehne?.montageSchluss) {
      // im Stil der Montage (seit 19. Oktober 2026): das Signet zeichnet sich wie immer, Felder schneiden es im Takt und rasten ein
      // nahtlos nach der Montage: am Anfang liegt noch das Foto unter dem Signet und vergeht, während die Felder schneiden
      const [w, h] = zielMass(ctx, sz), tau = t - ab.signet[0], fotoSicht = sz.zeit.nahtlos && sz.foto ? 1 - anteil(tau, 0.05, 0.7) ** 0.8 : 0;
      const zeichnenBei = (c, fb, foto = 0) => {
        c.fillStyle = F.grund; c.fillRect(0, 0, 1080, H);
        if (foto > 0) { c.globalAlpha = foto; c.drawImage(sz.foto, 0, 0, 1080, H); c.globalAlpha = 1; }
        signetZeichnen(c, fb, opt);
      };
      const c = sz.buehne.signetMontage(zeichnenBei, SIGNET_BIS + 10, f, tau, w, h, { nahtlos: sz.zeit.nahtlos, foto: fotoSicht });
      if (sz.buehne.ende >= 1) zeichnenBei(ctx, f); else ctx.drawImage(c, 0, 0, 1080, H);
    } else if (sz.buehne?.druckSchluss) {
      // im Stil des Rasterdrucks (seit 22. Oktober 2026): gedruckt auf dem Papier, die Platten rasten ein, zuletzt scharf
      const [w, h] = zielMass(ctx, sz), dopt = { ...opt, farben: DRUCK };
      const zeichnenBei = (c, fb) => { c.fillStyle = DRUCK.grund; c.fillRect(0, 0, 1080, H); signetZeichnen(c, fb, dopt); };
      const c = sz.buehne.signetDruck(zeichnenBei, f, t - ab.signet[0], w, h);
      if (sz.buehne.ende >= 1) zeichnenBei(ctx, f); else ctx.drawImage(c, 0, 0, 1080, H);
    } else if (sz.buehne) {
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
