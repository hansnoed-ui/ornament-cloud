// PHORMA II – das Bild zur Zeit t auf einer 2D-Leinwand (Vorschau, Standbild, Video): vorn der Grund, dann die Kette aus der Bühne (WebGL,
// buehne.js), danach das Foto, darüber Abblenden und die Beschriftung, am Schluss auf Wunsch das leuchtende Signet von ornament.cloud wie in PHORMA I;
// im Gewebe statt dessen das Logo, das aus dem Gewebe entsteht, mit getipptem Schriftzug und verfrickelt im Takt.
import { FPS, anteil, ausblenden, zeitachse, zeitcode, SIGNET_VON, SIGNET_TEMPO, MIT_TON } from "./ablauf.js?v=17";
import { signet as signetZeichnen, punktLage, PUNKT_RADIUS } from "../sketchory/signet.js?v=10";
import { tonOderErsatz, gewebeZustaende, zustandBei, wert } from "./ton.js?v=17";
import { zufall } from "./analyse.js?v=17";

export const FARBEN = { grund: "#000000", tinte: "#ffffff", punkt: "#f08a5d", hell: true };
const MONO = 'ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Mono", Menlo, Consolas, "Liberation Mono", monospace';

/** Szene: { breite, hoehe, zeit, foto, buehne, signet, beschriftung, titel, fragmente, schnitte, nacht }; text, ton, laenge nur fürs Gewebe */
export function szene({ breite = 1080, hoehe = 1350, tempo = "normal", signet = true, beschriftung = true, titel = "", foto = null, ablauf, buehne = null,
  text = "", ton = null, laenge = null } = {}) {
  const zeit = zeitachse({ tempo, signet, ablauf, laenge });
  const sz = { breite, hoehe, zeit, foto, buehne, signet, beschriftung, titel: (titel || "PHORMA II").trim(), fragmente: [], schnitte: [], nacht: [], logo: null };
  if (MIT_TON.includes(zeit.ablauf)) {
    const T = tonOderErsatz(ton), G = zeit.phasen.find((p) => p.name === zeit.ablauf);
    // die Schnitte zählen wie im Gewebe in der Zeit des Effekts (Vorlauf 0,4 s, ohne Tonspur im Tempo gestreckt)
    const f = zeit.tempo, film = (s) => 0.4 + (s - 0.4) * f, effekt = (s) => 0.4 + (s - 0.4) / f;
    sz.schnitte = T.schnitte.map(film).filter((s) => s > G.von && s < G.bis);
    // die Zustände des Gewebes wie in gewebe.js (in der Zeit des Effekts): wo Weiss auf Schwarz steht, stehen auch die Fragmente umgekehrt
    const Z = gewebeZustaende(T, effekt(G.von), effekt(G.bis));
    sz.nacht = Z.map((z, i) => [film(z.t), film(Z[i + 1]?.t ?? effekt(G.bis)), z.nacht]).filter((z) => z[2]).map(([a, b]) => [a, b]);
    if (text) sz.fragmente = fragmentPlan(text, T, G, breite, hoehe);
    const L = zeit.phasen.find((p) => p.name === "logo");
    if (L) {
      // das Logo am Ende des Gewebes: Farbgebung des letzten Zustands (wie in gewebe.js), Störungen im Takt, der Schriftzug auf den Einsätzen getippt
      const nacht = zustandBei(Z, effekt(L.von) - 1e-3, effekt(G.von)).nacht, tipp = L.von + 2.6;
      sz.logo = { von: L.von, bis: L.bis, nacht, T, plan: logoPlan(T, L.von, L.bis - 1.0, L.bis - 0.35),
        tasten: T.einsaetze.filter((e) => e.t >= L.von + 0.1 && e.t < tipp).map((e) => e.t), tipp };
    }
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
  const H = sz.hoehe, g = Math.round(H * 0.075), invers = sz.nacht.some(([a, b]) => t >= a && t < b);
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

/**
 * Das Logo verfrickelt (Wunsch vom 18. Oktober 2026: «jetzt brauchts natürlich auch noch eine verfrickelte Animation des Logos»): im Gewebe klingt
 * die Musik bis ans Ende, und jeder Einsatz zwischen a und b zerhackt das Logo – Streifen springen seitlich, Gewebe und Schriftzug stottern ein Stück
 * zurück, bei starken Schlägen kurz umgekehrt oder ein Ruck in Grösse und Lage. Zuerst heftig, zum Stehen hin ruhig (das Logo steht sauber da), ab aus
 * zerfällt es noch einmal. Ohne Einsätze ein eigener, rascher Takt. Wiederholbar: [{ t, dauer, s, art, rueck, nr }]
 */
function logoPlan(T, a, b, aus) {
  let ein = T.einsaetze.filter((e) => e.t >= a && e.t < b - 0.1).map((e) => ({ t: e.t, s: Math.min(1, 0.45 + e.staerke) }));
  if (ein.length < 4) { ein = []; for (let t = a + 0.05, k = 0; t < b - 0.25; t += [0.16, 0.24, 0.12][k++ % 3]) ein.push({ t, s: 0.85 }); }
  ein.push({ t: aus + 0.04, s: 1 }, { t: aus + 0.26, s: 0.9 });
  return ein.map((e, nr) => {
    const h = (k) => { const x = Math.sin((nr + 1) * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
    const ruhe = e.t < b ? 1 - 0.8 * anteil(e.t, a + 0.3, b) : 1;
    return { t: e.t, dauer: 0.08 + 0.14 * h(1), s: e.s * ruhe, art: h(2), rueck: Math.round(5 + 16 * h(3)), nr };
  }).filter((e) => e.s > 0.12);
}
const zufallLogo = (nr, k) => { const x = Math.sin(nr * 91.17 + k * 17.31) * 43758.5453; return x - Math.floor(x); };
/** die laufenden Störungen zur Zeit t: um wie viele Bilder die Zeichnung zurückspringt, welche Streifen, Umkehr, Ruck */
function logoStoerung(plan, t) {
  const an = plan.filter((e) => t >= e.t && t < e.t + e.dauer);
  if (!an.length) return null;
  let rueck = 0, umkehr = false, ruck = null;
  const streifen = [];
  for (const e of an) {
    const x = 1 - (t - e.t) / e.dauer;                                   // klingt innerhalb des Ereignisses ab
    if (e.art < 0.35) rueck += e.rueck;
    if (e.art >= 0.2) streifen.push({ e, x });
    if (e.art > 0.86 && e.s > 0.55 && t < e.t + 0.1) umkehr = true;
    if (e.art > 0.7 && e.art <= 0.86) ruck = { e, x };
  }
  return { rueck, streifen, umkehr, ruck };
}
/** das Logo (Quelle, in Filmpunkten B × H) gestört auf ctx zeichnen */
function logoGestoert(ctx, quelle, B, H, st) {
  const sx = quelle.width / B, sy = quelle.height / H;
  ctx.save();
  if (st.ruck) {
    const { e, x } = st.ruck, z = 1 + 0.12 * e.s * x * (zufallLogo(e.nr, 1) > 0.5 ? 1 : -0.6);
    ctx.translate(B / 2 + (zufallLogo(e.nr, 2) - 0.5) * 90 * e.s * x, H / 2 + (zufallLogo(e.nr, 3) - 0.5) * 60 * e.s * x); ctx.scale(z, z); ctx.translate(-B / 2, -H / 2);
  }
  if (!st.streifen.length) ctx.drawImage(quelle, 0, 0, B, H);
  else {
    // Streifen: Höhe, Versatz und manchmal eine andere Stelle der Quelle je Ereignis gewürfelt
    const { e, x } = st.streifen[st.streifen.length - 1], n = 6 + Math.floor(zufallLogo(e.nr, 4) * 16);
    let y = 0;
    for (let k = 0; k < n && y < H; k++) {
      const hb = k === n - 1 ? H - y : Math.max(6, H * (0.3 + zufallLogo(e.nr, 10 + k) * 1.4) / n), r = zufallLogo(e.nr, 40 + k);
      const dx = r < 0.35 ? 0 : (zufallLogo(e.nr, 70 + k) - 0.5) * 2 * 150 * e.s * x;
      const quellY = zufallLogo(e.nr, 100 + k) < 0.2 ? Math.min(H - hb, Math.max(0, y + (zufallLogo(e.nr, 130 + k) - 0.5) * 0.25 * H)) : y;
      ctx.drawImage(quelle, 0, quellY * sy, quelle.width, hb * sy, dx, y, B, hb);
      y += hb;
    }
  }
  ctx.restore();
  if (st.umkehr) { ctx.save(); ctx.globalCompositeOperation = "difference"; ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, B, H); ctx.restore(); }
}
let logoLeinwand = null;

const NAME = "ornament.cloud", SCHRIFT = '400 52px "Instrument Sans", system-ui, sans-serif', SPERRUNG = 0.14 * 52;
/** wie viele Zeichen von «ornament.cloud» zur Zeit t stehen: gleichmässig bis L.tipp, jeder Einsatz tippt zwei voraus */
export function logoZeichen(L, t) {
  const gleich = Math.floor(NAME.length * anteil(t, L.von + 0.15, L.tipp)), schlaege = L.tasten.filter((s) => s <= t).length;
  return Math.min(NAME.length, Math.max(gleich, gleich ? Math.min(gleich + 4, 2 * schlaege) : 0));
}
/**
 * der Schriftzug wie im Signet (Instrument Sans 52 px, gesperrt, unter der Schlaufe), getippt mit einem Blockcursor wie die Fragmente im Gewebe;
 * steht er, läuft der Punkt durch die Schlaufe und pocht mit dem Schlag. Gezeichnet für 1080 × 1920, mittig auf B × H.
 */
function schriftzug(ctx, sz, t) {
  const L = sz.logo, H = sz.hoehe, tinte = L.nacht ? "#f2f2f0" : "#111111", punkt = L.nacht ? "#f08a5d" : "#c2410c", n = logoZeichen(L, t);
  ctx.save();
  ctx.translate((sz.breite - 1080) / 2, (H - 1920) / 2);
  ctx.font = SCHRIFT; ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  const breiten = [...NAME].map((z) => ctx.measureText(z).width), gesamt = breiten.reduce((a, b) => a + b, 0) + (NAME.length - 1) * SPERRUNG;
  const m = ctx.measureText("o"), auf = m.fontBoundingBoxAscent ?? 47, ab = m.fontBoundingBoxDescent ?? 13, mitte = 1175 + 52 * 1.3 / 2, linie = mitte + (auf - ab) / 2;
  let x = (1080 - gesamt) / 2;
  for (let i = 0; i < n; i++) { ctx.fillStyle = NAME[i] === "." ? punkt : tinte; ctx.fillText(NAME[i], x, linie); x += breiten[i] + SPERRUNG; }
  // der Cursor: beim Tippen voll, danach blinkt er noch kurz und geht
  const blink = t < L.tipp + 0.1 || Math.floor((t - L.tipp) * 4) % 2 === 0;
  if (t >= L.von + 0.1 && t < L.tipp + 0.9 && blink) { ctx.fillStyle = tinte; ctx.fillRect(x + (n ? 2 : 0), mitte - 34, 26, 68); }
  // der Punkt: eine Runde in rund drei Sekunden, mit dem Schlag grösser
  const f = 40 + (t - L.tipp - 0.2) * FPS, { lage: [px, py], sicht } = punktLage(f, { punktTempo: 1.6 });
  if (sicht > 0) {
    ctx.globalAlpha = sicht; ctx.fillStyle = punkt;
    ctx.beginPath(); ctx.arc(px, py, PUNKT_RADIUS * (1 + 0.5 * wert(L.T.stoss, t)), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
/** das Logo-Bild zur Zeit t (bis zum Ende des Films): das Gewebe aus der Bühne, darüber der Schriftzug, beides zusammen verfrickelt */
function logoBild(ctx, sz, t, { proben, vorschau }) {
  const L = sz.logo, B = sz.breite, H = sz.hoehe, st = logoStoerung(L.plan, t), ts = t - (st?.rueck ?? 0) / FPS * 0.4;   // gestottert: ein Stück zurück
  logoLeinwand ??= st && typeof document !== "undefined" ? document.createElement("canvas") : null;
  const [w, h] = zielMass(ctx, sz), ziel = st && logoLeinwand ? logoLeinwand.getContext("2d") : ctx;
  if (ziel !== ctx) {
    const pw = Math.max(2, Math.round(w)), ph = Math.max(2, Math.round(h));
    if (logoLeinwand.width !== pw || logoLeinwand.height !== ph) { logoLeinwand.width = pw; logoLeinwand.height = ph; }
    ziel.setTransform(pw / B, 0, 0, ph / H, 0, 0);
  }
  if (sz.buehne) ziel.drawImage(sz.buehne.bild(sz.zeit, Math.min(ts, L.bis - 1e-3), w, h, { proben, vorschau }), 0, 0, B, H);
  else { ziel.fillStyle = L.nacht ? "#030304" : "#f3f1ec"; ziel.fillRect(0, 0, B, H); }
  schriftzug(ziel, sz, Math.min(ts, L.bis));
  if (ziel !== ctx) { ctx.fillStyle = L.nacht ? "#030304" : "#f3f1ec"; ctx.fillRect(0, 0, B, H); logoGestoert(ctx, logoLeinwand, B, H, st); }   // seitlich verschoben: Papier dahinter
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
  if (sz.logo && t >= sz.logo.von) { ctx.save(); logoBild(ctx, sz, t, { proben, vorschau }); ctx.restore(); return; }   // bis ans Ende, ohne leeres Bild
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
      const aus = sz.logo ? sz.logo.von - 0.7 : ab.stehen[0], sicht = anteil(t, ab.vor[0] + 0.1, ab.vor[1] + 0.3) * (1 - anteil(t, aus - 0.1, aus + 0.6));
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
