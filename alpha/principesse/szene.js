// «Principesse» – ein Bild des Films auf eine Leinwand zeichnen (Vorschau, Video und Standbild verwenden dasselbe).
// Das Gemälde wächst auf einer eigenen Ebene Pinselzug um Pinselzug (nur vorwärts; geht die Zeit zurück, beginnt es neu). Ein Strich, der
// noch wächst, wird in jedem Bild in einem Zug bis zu seiner jetzigen Länge darüber gezeichnet und erst fertig auf die Ebene gemalt
// (stückweise aufgemalt gäbe es an jeder Stückgrenze Rippen aus den runden Enden der Borsten).
// Ein Pinselzug: ein Körper in der Grundfarbe und darüber Borsten, leicht versetzt und in der Farbe etwas heller oder dunkler.
// Ist das Gemälde fertig, geht es sanft in das scharfe, aufgefrischte Bild über (klar); darüber funkelt der Glitzer. Dann Foto und Satz, am Schluss das Signet.
import { anteil, weich, ausblenden, versatz, ZEICHEN, satzbild, satzPunkt, zeitachse, malplan } from "./ablauf.js?v=8";
import { signet, funkenZeichnen, FARBEN } from "./signet.js?v=8";
import { SCHRIFTEN, schriftSetzen } from "../sketchory/szene.js?v=8";
import { zufall } from "./malen.js?v=8";

export { SCHRIFTEN, FARBEN };

/**
 * Szene. bild: { striche, stufen } aus malen.js; funken aus glitzer.js; optionen: malen (Sekunden), glitzer (0 aus, 1 sanft, 1.6 kräftig),
 * farbe ("hell" | "dunkel"), foto (ImageBitmap/Canvas oder null), klar (das scharfe Bild als Canvas, oder null), text, schrift, streckung, messen, leinwand.
 */
export function szene(bild, funken, { breite = 1080, hoehe = 1440, malen = 6, glitzer = 1, farbe = "hell", foto = null, klar = null, text = "", schrift = "grotesk", streckung = 1.15, messen, leinwand } = {}) {
  const satzText = satzPunkt(text, true);
  const zeit = zeitachse({ malen, foto: !!foto, text: satzText.text });
  const plan = malplan(bild.striche, bild.stufen, malen);
  const zuege = bild.striche.map((s, i) => pinselzug(s, plan[i]));
  const sb = satzText.text ? satzbild(satzText.text, (s, g) => messen(s, g, schrift), { groesse: SCHRIFTEN[schrift].groesse, streckung, breite: Math.min(breite, 1080) - 232, zeilenMax: hoehe < 1200 ? 4 : 5 }) : null;
  return {
    breite, hoehe, zeit, zuege, funken, glitzer, farben: FARBEN[farbe] ?? FARBEN.hell, foto, klar, satz: sb, orange: satzText.orange, schrift, streckung,
    ebene: leinwand(breite, hoehe), stand: { t: -1, naechster: 0, aktiv: [] },
  };
}

/** so deckend liegt das scharfe Bild am Ende über dem Gemälde (ein Hauch der Pinselstriche bleibt sichtbar) */
const KLAR = 0.9;

// ---------- Pinselzüge ----------

/** Punkte, Normalen und Längen eines Strichs; die Borsten (Versatz, Breite, Farbe) fest aus seinem Startwert */
function pinselzug(s, [von, bis]) {
  const n = s.pts.length / 2, x = new Float32Array(n), y = new Float32Array(n), lang = new Float32Array(n);
  for (let i = 0; i < n; i++) { x[i] = s.pts[2 * i]; y[i] = s.pts[2 * i + 1]; if (i) lang[i] = lang[i - 1] + Math.hypot(x[i] - x[i - 1], y[i] - y[i - 1]); }
  const nx = new Float32Array(n), ny = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1), dx = x[b] - x[a], dy = y[b] - y[a], l = Math.hypot(dx, dy) || 1;
    nx[i] = -dy / l; ny[i] = dx / l;
  }
  const rnd = zufall(s.saat), R = s.r, [r, g, b] = s.farbe;
  const anzahl = Math.max(2, Math.min(8, Math.round(R / 4)));
  // Borsten liegen im Innern des Strichs (nicht am Rand, sonst wirkt er wie eine Röhre), halb durchscheinend, und laufen vor den Enden aus
  const borsten = Array.from({ length: anzahl }, (_, j) => {
    const o = ((j + 0.5) / anzahl - 0.5) * 1.05 * R + (rnd() - 0.5) * R * 0.12;
    const f = 1 + (rnd() - 0.5) * 0.14;          // etwas heller oder dunkler
    return { o, breite: Math.max(1, R * (0.14 + rnd() * 0.16)), anf: rnd() * 0.15, ende: 1 - rnd() * 0.2,
      farbe: `rgba(${Math.min(255, r * f) | 0},${Math.min(255, g * f) | 0},${Math.min(255, b * f) | 0},0.6)` };
  });
  return { x, y, nx, ny, lang, laenge: lang[n - 1], R, farbe: `rgb(${r},${g},${b})`, borsten, von, bis };
}

/** Stück eines Pinselzugs von Länge l0 bis l1: zuerst der Körper, dann jede Borste */
function zugStueck(ctx, z, l0, l1) {
  const { x, y, nx, ny, lang } = z, n = x.length;
  const spur = (versatz, von = l0, bis = l1) => {
    let k = 1;
    while (k < n - 1 && lang[k] < von) k++;
    const p = (l, i) => { const f = (l - lang[i - 1]) / (lang[i] - lang[i - 1] || 1); return [x[i - 1] + (x[i] - x[i - 1]) * f + (nx[i - 1] + (nx[i] - nx[i - 1]) * f) * versatz, y[i - 1] + (y[i] - y[i - 1]) * f + (ny[i - 1] + (ny[i] - ny[i - 1]) * f) * versatz]; };
    ctx.beginPath();
    ctx.moveTo(...p(Math.max(0, von), k));
    for (; k < n; k++) {
      if (lang[k] >= bis) { ctx.lineTo(...p(bis, k)); break; }
      ctx.lineTo(x[k] + nx[k] * versatz, y[k] + ny[k] * versatz);
    }
    ctx.stroke();
  };
  ctx.strokeStyle = z.farbe; ctx.lineWidth = z.R * 1.75; spur(0);
  for (const b of z.borsten) {
    const a = Math.max(l0, b.anf * z.laenge), e = Math.min(l1, b.ende * z.laenge);
    if (e <= a) continue;
    ctx.strokeStyle = b.farbe; ctx.lineWidth = b.breite; spur(b.o, a, e);
  }
}

/** die Ebene mit dem Gemälde bis zur Zeit t (Sekunden ab Malbeginn) bringen */
function malenBis(sz, t) {
  const ctx = sz.ebene.getContext("2d");
  if (t < sz.stand.t) {
    ctx.clearRect(0, 0, sz.breite, sz.hoehe);
    sz.stand = { t: -1, naechster: 0, aktiv: [] };
  }
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const { zuege } = sz, st = sz.stand;
  while (st.naechster < zuege.length && zuege[st.naechster].von <= t) st.aktiv.push({ z: zuege[st.naechster++], l: 0 });
  st.aktiv = st.aktiv.filter((a) => {
    const { z } = a, q = Math.min(1, (t - z.von) / (z.bis - z.von || 1e-6));
    if (q >= 1) { zugStueck(ctx, z, 0, z.laenge + 0.01); return false; }
    a.l = q * z.laenge;
    return true;
  });
  st.t = t;
}

/** Bild zur Zeit t (Sekunden) */
export function bild(ctx, sz, t) {
  const { ab } = sz.zeit, F = sz.farben, BREITE = sz.breite, HOEHE = sz.hoehe;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = F.grund;
  ctx.fillRect(0, 0, BREITE, HOEHE);
  // das Gemälde und sein Glitzer
  if (t < ab.bildAus[1]) {
    malenBis(sz, Math.max(0, t - ab.malen[0]));
    const sicht = 1 - ausblenden(anteil(t, ab.bildAus[0], ab.bildAus[1]));
    ctx.globalAlpha = sicht;
    ctx.drawImage(sz.ebene, 0, 0);
    // die Striche, die gerade wachsen
    if (sz.stand.aktiv.length) {
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const a of sz.stand.aktiv) if (a.l > 0) zugStueck(ctx, a.z, 0, a.l);
    }
    // vom Gemälde zum scharfen Bild: beginnt mit den letzten Strichen, dauert gut anderthalb Sekunden
    const klar = sz.klar ? KLAR * weich(anteil(t, ab.malen[1] - 0.3, ab.malen[1] + 1.4)) : 0;
    if (klar > 0) { ctx.globalAlpha = sicht * klar; ctx.drawImage(sz.klar, 0, 0, BREITE, HOEHE); }
    ctx.globalAlpha = 1;
    // der Glitzer erwacht im letzten Drittel des Malens und funkelt, solange das Bild steht
    const wach = anteil(t, ab.malen[0] + (ab.malen[1] - ab.malen[0]) * 0.7, ab.stehen[0] + 0.6);
    if (sz.glitzer > 0 && wach > 0 && sz.funken.length) funkenZeichnen(ctx, sz.funken, t, wach * sicht * sz.glitzer, "#fff", 1);
  }
  // Foto und Satz
  if (ab.fotoEin && t >= ab.fotoEin[0] && t < ab.zweitAus[1]) zweiterTeil(ctx, sz, t);
  // das Signet
  if (t >= ab.signet[0] && t < ab.signetAus[1]) {
    signet(ctx, t - ab.signet[0], F, BREITE, HOEHE);
    const weg = ausblenden(anteil(t, ab.signetAus[0], ab.signetAus[1]));
    if (weg > 0) { ctx.globalAlpha = weg; ctx.fillStyle = F.grund; ctx.fillRect(0, 0, BREITE, HOEHE); ctx.globalAlpha = 1; }
  }
}

function zweiterTeil(ctx, sz, t) {
  const { ab } = sz.zeit, F = sz.farben, BREITE = sz.breite, HOEHE = sz.hoehe;
  const ein = weich(anteil(t, ab.fotoEin[0], ab.fotoEin[1]));
  const aus = 1 - ausblenden(anteil(t, ab.zweitAus[0], ab.zweitAus[1]));
  if (sz.foto) {
    // Foto: füllt das Bild, langsam etwas näher (Ken Burns)
    const f = sz.foto, w = f.width, h = f.height, s0 = Math.max(BREITE / w, HOEHE / h);
    const z = 1 + 0.06 * anteil(t, ab.fotoEin[0], ab.zweitAus[1]);
    const s = s0 * z, dw = w * s, dh = h * s;
    ctx.globalAlpha = ein * aus;
    ctx.drawImage(f, (BREITE - dw) / 2, (HOEHE - dh) / 2 - (z - 1) * 120, dw, dh);
    // unten ein sanfter Schatten, damit der Satz lesbar bleibt
    if (sz.satz) {
      const g = ctx.createLinearGradient(0, HOEHE * 0.5, 0, HOEHE);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = g; ctx.fillRect(0, HOEHE * 0.5, BREITE, HOEHE * 0.5);
    }
    ctx.globalAlpha = 1;
  }
  if (sz.satz) satz(ctx, sz, t, aus, sz.foto ? HOEHE * 0.78 : HOEHE * 0.48, sz.foto ? "#ffffff" : F.tinte, F.gold);
}

/** der Satz, Buchstabe um Buchstabe (wie in Sketchory), mit goldenem Punkt am Ende */
function satz(ctx, sz, t, aus, mitte, farbe, punkt) {
  const { ab } = sz.zeit, { groesse, zeilen, zeilenhoehe } = sz.satz, st = sz.streckung;
  schriftSetzen(ctx, sz.schrift, groesse);
  ctx.textBaseline = "alphabetic"; ctx.textAlign = "left";
  if (!sz.zeichen) {
    const m = ctx.measureText("Hg"), auf = (m.fontBoundingBoxAscent ?? groesse * 0.9) * st, abw = (m.fontBoundingBoxDescent ?? groesse * 0.25) * st;
    const leer = ctx.measureText(" ").width;
    let y = mitte - (zeilen.length * zeilenhoehe) / 2 + (zeilenhoehe - (auf + abw)) / 2 + auf;
    sz.zeichen = [];
    for (const zeile of zeilen) {
      const breiten = zeile.map((w) => ctx.measureText(w).width);
      let x = (sz.breite - (breiten.reduce((a, b) => a + b, 0) + leer * (zeile.length - 1))) / 2;
      zeile.forEach((w, i) => {
        const z = [...w];
        z.forEach((c, k) => sz.zeichen.push({ c, x: x + (k ? ctx.measureText(z.slice(0, k).join("")).width : 0), y }));
        x += breiten[i] + leer;
      });
      y += zeilenhoehe;
    }
    if (sz.orange && sz.zeichen.length) sz.zeichen[sz.zeichen.length - 1].punkt = true;
  }
  const beginn = ab.fotoEin[0] + 0.5, vs = versatz(sz.zeichen.length);
  if (sz.foto) { ctx.shadowColor = "rgba(0,0,0,0.45)"; ctx.shadowBlur = 18; }
  sz.zeichen.forEach((z, nr) => {
    const a0 = beginn + nr * vs, e = weich(anteil(t, a0, a0 + ZEICHEN));
    if (e <= 0) return;
    ctx.globalAlpha = e * aus;
    ctx.fillStyle = z.punkt ? punkt : farbe;
    ctx.save(); ctx.translate(z.x, z.y + (1 - e) * 14); ctx.scale(1, st); ctx.fillText(z.c, 0, 0); ctx.restore();
  });
  ctx.shadowBlur = 0; ctx.shadowColor = "transparent";
  ctx.globalAlpha = 1;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
}

/** das fertige Gemälde mit leuchtendem Glitzer (Standbild) */
export function standbild(ctx, sz) {
  ctx.fillStyle = sz.farben.grund;
  ctx.fillRect(0, 0, sz.breite, sz.hoehe);
  malenBis(sz, 1e9);
  ctx.drawImage(sz.ebene, 0, 0);
  if (sz.klar) { ctx.globalAlpha = KLAR; ctx.drawImage(sz.klar, 0, 0, sz.breite, sz.hoehe); ctx.globalAlpha = 1; }
  if (sz.glitzer > 0) funkenZeichnen(ctx, sz.funken, 0.37, sz.glitzer, "#fff", 1);
}
