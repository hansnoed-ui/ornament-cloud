// «Die Stadt, die weitergeht» – Zeichnung der Stadt auf einer Canvas (Draufsicht). Liest den Zustand, verändert ihn nie.
// Gezeichnet wird in Metern (die Transformation macht daraus Pixel); Farben kommen aus CSS-Variablen der Seite (hell und dunkel).
import { KNOTEN, KANTEN, ORTE, BANK, BAENKE, BLOECKE, WOHNUNGEN, KORRIDORE, VERBINDUNG, BREITE, HOEHE, X_AMPEL, X_ZEBRA, X_HALT, bedingungen, ampelZeiten } from "./stadtplan.js?v=1";
import { gesamtzeit } from "./modell.js?v=1";

const VAR = ["papier", "block", "dach", "gruen", "baum", "strasse", "markierung", "weg", "linie", "text", "leise", "koralle", "vergleich", "auto", "bus", "figur", "hof"];
export function farben(el) {
  const cs = getComputedStyle(el);
  return Object.fromEntries(VAR.map((v) => [v, cs.getPropertyValue(`--s-${v}`).trim() || "#888"]));
}

/** Ansicht: { k (px je m, mit Gerätepixeln), ox, oy (Weltkoordinate links oben), folge, sicht, vorschau, farben, dpr, auswahl } */
export function zeichne(ctx, stadt, a) {
  const z = stadt.z, c = a.farben, k = a.k;
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = c.papier; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(k, 0, 0, k, -a.ox * k, -a.oy * k);
  const px = (n) => n / k;                     // n Bildschirmpixel (mit dpr) in Metern
  const lw = (n) => (ctx.lineWidth = Math.max(px(n * a.dpr), 0.01));
  const b = bedingungen(z.m), v = VERBINDUNG[z.m.verbindung];

  // ---------- Blöcke ----------
  for (const [x, y, w, h, art] of BLOECKE) {
    ctx.fillStyle = art === "park" ? c.gruen : art === "hof" ? c.hof : c.block;
    rund(ctx, x, y, w, h, 3); ctx.fill();
    ctx.strokeStyle = c.linie; lw(1); ctx.stroke();
    if (art === "wohnen") haeuser(ctx, x, y, w, h, c, lw);
    if (art === "park") { ctx.fillStyle = c.baum; for (let i = 0; i < 16; i++) { const tx = x + 8 + ((i * 37) % (w - 16)), ty = y + 8 + ((i * 53) % (h - 16)); if (Math.abs(tx - 225) < 10 || Math.abs(ty - 128) < 8) continue; ctx.beginPath(); ctx.arc(tx, ty, 4.5, 0, 7); ctx.fill(); } }
    if (art === "atelier") { ctx.fillStyle = c.dach; rund(ctx, x + 14, y + 22, 60, 40, 2); ctx.fill(); ctx.strokeStyle = c.linie; lw(1); ctx.stroke(); ctx.fillStyle = c.koralle; ctx.fillRect(x + 14, y + 22, 60, 4); }
    if (art === "laden") { ctx.fillStyle = c.dach; rund(ctx, x + 70, y + 8, 60, 34, 2); ctx.fill(); ctx.strokeStyle = c.linie; lw(1); ctx.stroke();
      ctx.strokeStyle = c.leise; lw(0.5); for (let gx = x + 6; gx < x + 60; gx += 8) for (let gy = y + 6; gy < y + h - 4; gy += 8) { ctx.strokeRect(gx, gy, 8, 8); } }
    if (art === "schule") { ctx.fillStyle = c.dach; rund(ctx, x + 30, y + 6, 80, 30, 2); ctx.fill(); ctx.strokeStyle = c.linie; lw(1); ctx.stroke(); }
    if (art === "hof") { ctx.fillStyle = c.papier; rund(ctx, x + 12, y + 18, w - 24, h - 36, 2); ctx.fill(); }
  }
  // Kiosk und Zwischennutzung
  markeHaus(ctx, 470, 80, 22, 14, c, lw, c.koralle);
  if (z.m.zwischennutzung) markeHaus(ctx, 226, 166, 22, 12, c, lw, c.vergleich);

  // ---------- Strassen ----------
  const spur = z.m.spur, oben = spur ? 195 : 200, unten = spur ? 225 : 220;
  // Querstrassen und Nordstrasse
  ctx.fillStyle = c.strasse;
  ctx.fillRect(0, 47, BREITE, 16); ctx.fillRect(34, 63, 12, 125); ctx.fillRect(554, 63, 12, 125);
  ctx.fillRect(0, oben, BREITE, unten - oben);
  // Baumstreifen an der Hauptstrasse (die zusätzliche Spur nimmt ihn weg)
  if (!spur) { ctx.fillStyle = c.baum; for (let x = 12; x < BREITE; x += 26) { if ([40, 150, 230, 300, 390, 470, 560].some((q) => Math.abs(q - x) < 9)) continue; for (const y of [195, 225]) { ctx.beginPath(); ctx.arc(x, y, 2.6, 0, 7); ctx.fill(); } } }
  // Markierungen
  ctx.strokeStyle = c.markierung; lw(1); ctx.setLineDash([px(6 * a.dpr), px(6 * a.dpr)]);
  linie(ctx, 0, 55, BREITE, 55);
  if (spur) { linie(ctx, 0, 202, BREITE, 202); linie(ctx, 0, 218, BREITE, 218); }
  ctx.setLineDash([]);
  linie(ctx, 0, 210, BREITE, 210);
  // Mittelzaun
  if (v.zaun) {
    ctx.strokeStyle = c.linie; lw(2.2);
    const luecke = b.ampel ? [[X_AMPEL - 6, X_AMPEL + 6]] : [];
    let x0 = 0; for (const [l, r] of luecke) { linie(ctx, x0, 210, l, 210); x0 = r; } linie(ctx, x0, 210, BREITE, 210);
    lw(0.8); for (let x = 4; x < BREITE; x += 6) if (!luecke.some(([l, r]) => x > l && x < r)) linie(ctx, x, 208.6, x, 211.4);
  }
  // Gehsteige
  ctx.strokeStyle = c.weg; lw(1.4);
  for (const e of KANTEN) {
    if (e.art !== "weg") continue;
    const p = KNOTEN[e.a], q = KNOTEN[e.b];
    linie(ctx, p.x, p.y, q.x, q.y);
  }
  // Parkwege, Trampelpfad, Durchgang
  ctx.strokeStyle = c.weg; lw(1.1); ctx.setLineDash([px(3 * a.dpr), px(3 * a.dpr)]);
  for (const e of KANTEN) if (e.art === "park") { const p = KNOTEN[e.a], q = KNOTEN[e.b]; linie(ctx, p.x, p.y, q.x, q.y); }
  ctx.setLineDash([]);
  if (z.trampel > 0) { ctx.strokeStyle = c.leise; ctx.globalAlpha = Math.min(1, 0.15 + z.trampel / 40); lw(z.trampelSichtbar ? 2 : 1); ctx.setLineDash([px(2 * a.dpr), px(3 * a.dpr)]); linie(ctx, 150, 188, 225, 80); ctx.setLineDash([]); ctx.globalAlpha = 1; }
  ctx.strokeStyle = z.m.durchgang ? c.weg : c.linie; lw(z.m.durchgang ? 1.4 : 2.2);
  if (z.m.durchgang) { ctx.setLineDash([px(4 * a.dpr), px(3 * a.dpr)]); linie(ctx, 150, 232, 150, 330); ctx.setLineDash([]); }
  else { linie(ctx, 144, 240, 156, 240); linie(ctx, 144, 322, 156, 322); }

  // ---------- Querungen ----------
  const ampel = ampelZeiten(z.m), tg = gesamtzeit(z);
  const fussGruen = ampel ? (tg % ampel[0]) >= ampel[1] && (tg % ampel[0]) < ampel[1] + ampel[2] : false;
  if (b.ampel) { streifen(ctx, X_AMPEL, oben, unten, c.markierung, lw); signal(ctx, X_AMPEL + 9, 192, fussGruen, c); signal(ctx, X_AMPEL - 9, 228, fussGruen, c); }
  if (b.zebra) streifen(ctx, X_ZEBRA, oben, unten, c.markierung, lw);
  if (b.bruecke) bruecke(ctx, z.m, c, lw);

  // Haltestellen
  for (const y of [182, 238]) { ctx.fillStyle = c.koralle; rund(ctx, X_HALT - 8, y - 2, 16, 4, 1); ctx.fill(); }
  // Bänke
  for (const bk of BAENKE) bank(ctx, bk.x, bk.y, c, lw, false);
  const vb = BANK[z.m.bank]; bank(ctx, vb.x, vb.y, c, lw, true);

  // ---------- Ansichtsebenen (Sichtweisen) unter Autos und Figuren ----------
  if (a.sicht === "fluss") flussEbene(ctx, z, c);
  if (a.sicht === "aufenthalt") aufenthaltEbene(ctx, z, c, lw);

  // ---------- Autos und Busse ----------
  for (const au of z.autos) {
    const kor = KORRIDORE[au.k];
    const x = au.r === "o" ? au.s : BREITE - au.s;
    const ys = kor.spurY[au.r]; const y = ys[Math.min(au.spur, ys.length - 1)];
    const l = au.bus ? 12 : 4.4, br = au.bus ? 2.8 : 2.1;
    ctx.fillStyle = au.bus ? c.bus : c.auto;
    rund(ctx, au.r === "o" ? x - l : x, y - br / 2, l, br, 0.6); ctx.fill();
  }

  // ---------- Vorschau einer Massnahme ----------
  if (a.vorschau) vorschau(ctx, z, a.vorschau, c, lw, px, a.dpr);

  // ---------- Figuren ----------
  const r = Math.max(2.5, px(3.8 * a.dpr));
  if (a.sicht === "belastung") belastungEbene(ctx, z, c, r);
  if (a.sicht === "erreichbarkeit") erreichbarkeitEbene(ctx, z, c, lw, r);
  // Passant:innen von ausserhalb: leiser gezeichnet, damit die Bewohner:innen erkennbar bleiben
  for (const f of z.passanten) figur(ctx, f, f.x, f.y, r * 0.9, { ...c, figur: c.leise }, lw);
  for (const f of z.figuren) {
    if (f.zustand === "weg" || f.zustand === "heim" || f.zustand === "drinnen" || f.zustand === "wartet_bus") continue;
    figur(ctx, f, f.x, f.y, r, c, lw);
  }
  // Wartende an der Haltestelle stehen in einer Reihe
  let iN = 0, iS = 0;
  for (const f of z.figuren) if (f.zustand === "wartet_bus") { const n = f.ort === "haltN" ? iN++ : iS++; figur(ctx, f, X_HALT + 10 + n * r * 2.4, f.ort === "haltN" ? 180 : 240, r, c, lw); }

  // begleitete Figur: Ring, verbleibender Weg, Name
  const g = a.folge !== null ? z.figuren[a.folge] : null;
  if (g) {
    const pos = positionVon(g);
    if (g.pfad && g.zustand === "geht") {
      ctx.strokeStyle = c.koralle; lw(1.6); ctx.setLineDash([px(5 * a.dpr), px(4 * a.dpr)]);
      ctx.beginPath(); ctx.moveTo(g.x, g.y);
      for (let i = g.pi + 1; i < g.pfad.knoten.length; i++) { const n = KNOTEN[g.pfad.knoten[i]]; ctx.lineTo(n.x, n.y); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.strokeStyle = c.koralle; lw(2.4); ctx.beginPath(); ctx.arc(pos.x, pos.y, r * 2.2, 0, 7); ctx.stroke();
    text(ctx, a, g.name, pos.x + r * 2.6, pos.y - r * 2, c.text, c.papier, 12, "left", true);
  }

  // ---------- Beschriftung ----------
  const kl = 10.5;
  for (const [t, x, y] of [["Hauptstrasse", 70, 210], ["Nordstrasse", 520, 55]]) text(ctx, a, t, x, y, c.markierung, null, kl, "center", false, true);
  for (const o of ["laden", "kiosk", "platz", "park", "schule", "atelier"]) { const p = ORTE[o]; text(ctx, a, p.name, p.x, p.y + (o === "kiosk" ? -10 : o === "schule" ? 14 : 12), c.leise, c.papier, kl, "center"); }
  text(ctx, a, "Bus", X_HALT, 176, c.leise, c.papier, kl - 1, "center");
  if (z.m.zwischennutzung) text(ctx, a, "Zwischennutzung", 237, 160, c.leise, c.papier, kl - 1, "center");
  if (z.trampelSichtbar) text(ctx, a, "Trampelpfad", 172, 150, c.leise, c.papier, kl - 1, "center");
}

export function positionVon(f) {
  if (f.zustand === "drinnen" && f.ort && ORTE[f.ort]) return { x: ORTE[f.ort].x, y: ORTE[f.ort].y };
  if (f.zustand === "heim" || f.zustand === "weg") return { x: f.hx, y: f.hy };
  return { x: f.x, y: f.y };
}

// ---------- Bausteine ----------
function rund(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function linie(ctx, x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function haeuser(ctx, x, y, w, h, c, lw) {
  ctx.fillStyle = c.dach; ctx.strokeStyle = c.linie; lw(0.8);
  const n = Math.max(1, Math.round(w / 32)), m = h > 60 ? 2 : 1;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const hx = x + 5 + (i * (w - 10)) / n, hy = y + 5 + (j * (h - 10)) / m, hw = (w - 10) / n - 5, hh = (h - 10) / m - 6;
    rund(ctx, hx, hy, hw, hh, 1.5); ctx.fill(); ctx.stroke();
  }
}
function markeHaus(ctx, x, y, w, h, c, lw, akzent) { ctx.fillStyle = c.dach; rund(ctx, x, y, w, h, 1.5); ctx.fill(); ctx.strokeStyle = c.linie; lw(1); ctx.stroke(); ctx.fillStyle = akzent; ctx.fillRect(x, y, w, 2.5); }
function streifen(ctx, x, oben, unten, farbe, lw) { ctx.fillStyle = farbe; for (let y = oben + 1.5; y < unten - 1; y += 3) ctx.fillRect(x - 4, y, 8, 1.6); }
function signal(ctx, x, y, gruen, c) {
  ctx.fillStyle = c.linie; rund(ctx, x - 2, y - 3.4, 4, 6.8, 1); ctx.fill();
  ctx.fillStyle = gruen ? "#3e9b5f" : c.koralle; ctx.beginPath(); ctx.arc(x, gruen ? y + 1.6 : y - 1.6, 1.3, 0, 7); ctx.fill();
}
function bank(ctx, x, y, c, lw, versetzbar) {
  ctx.fillStyle = versetzbar ? c.koralle : c.linie; rund(ctx, x - 4, y - 1.2, 8, 2.4, 0.6); ctx.fill();
}
function bruecke(ctx, m, c, lw) {
  const v = VERBINDUNG[m.verbindung];
  ctx.fillStyle = "rgba(0,0,0,0.12)"; ctx.fillRect(298, 183, 8, 58);   // Schatten
  ctx.fillStyle = c.block; ctx.strokeStyle = c.linie; lw(1.2);
  rund(ctx, 295, 180, 10, 60, 1); ctx.fill(); ctx.stroke();
  if (v.bruecke === "treppe") {
    for (const [y0, d] of [[172, 1], [240, 1]]) { ctx.fillStyle = c.block; rund(ctx, 295, y0, 10, 8 * d, 0.5); ctx.fill(); ctx.stroke(); lw(0.6); for (let i = 1; i < 6; i++) linie(ctx, 295, y0 + i * 1.4, 305, y0 + i * 1.4); lw(1.2); }
  } else {
    // Rampen nach Osten bis zur Haltestelle, mit Steigungsstrichen
    for (const y of [181, 239]) { ctx.fillStyle = c.block; rund(ctx, 300, y - 3, 92, 6, 1); ctx.fill(); ctx.stroke(); lw(0.5); for (let x = 306; x < 390; x += 7) linie(ctx, x, y - 2, x + 3, y + 2); lw(1.2); }
  }
}
function figur(ctx, f, x, y, r, c, lw) {
  ctx.fillStyle = c.figur; ctx.strokeStyle = c.papier; lw(1);
  if (f.mobil === "rollstuhl") { rund(ctx, x - r, y - r, r * 2, r * 2, r * 0.3); ctx.fill(); ctx.stroke(); }
  else if (f.mobil === "kinderwagen") { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke(); rund(ctx, x + r * 0.8, y - r * 0.7, r * 1.3, r * 1.4, r * 0.3); ctx.fill(); }
  else if (f.mobil === "pause") { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = c.papier; ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0, 7); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.stroke(); }
  if (f.mitKind) { ctx.fillStyle = c.figur; ctx.beginPath(); ctx.arc(x - r * 1.5, y + r * 0.6, r * 0.6, 0, 7); ctx.fill(); }
  if (f.wartetSeit !== null && f.zustand === "geht") { ctx.strokeStyle = c.koralle; lw(1.2); ctx.beginPath(); ctx.arc(x, y, r * 1.6, -Math.PI / 2, -Math.PI / 2 + Math.min(6.2, 0.05 * 0 + 6.2)); ctx.stroke(); }
}
function text(ctx, a, t, x, y, farbe, hinter, groesse, ausr = "center", fett = false, versal = false) {
  const sx = (x - a.ox) * a.k, sy = (y - a.oy) * a.k, g = groesse * a.dpr;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = `${fett ? 600 : 500} ${g}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = ausr; ctx.textBaseline = "middle";
  const s = versal ? t.toUpperCase() : t;
  if (versal) ctx.letterSpacing = `${0.12 * g}px`;
  if (hinter) { ctx.lineWidth = 3 * a.dpr; ctx.strokeStyle = hinter; ctx.lineJoin = "round"; ctx.strokeText(s, sx, sy); }
  ctx.fillStyle = farbe; ctx.fillText(s, sx, sy);
  ctx.restore();
}

// ---------- Ebenen der Sichtweisen ----------
function flussEbene(ctx, z, c) {
  // Dichte je 50-m-Abschnitt und Richtung, als Korallfläche auf der Fahrbahn
  for (const k of ["H", "N"]) for (const r of ["o", "w"]) {
    const n = Array(12).fill(0);
    for (const a of z.autos) if (a.k === k && a.r === r) n[Math.min(11, Math.floor((r === "o" ? a.s : BREITE - a.s) / 50))]++;
    const y = k === "H" ? (r === "o" ? 211 : 199) : r === "o" ? 55.5 : 47;
    const h = k === "H" ? (z.m.spur ? 14 : 9) : 7.5;
    for (let i = 0; i < 12; i++) if (n[i]) { ctx.fillStyle = c.koralle; ctx.globalAlpha = Math.min(0.85, n[i] / (k === "H" ? 7 * (z.m.spur ? 2 : 1) : 6)); ctx.fillRect(i * 50, k === "H" && r === "w" && z.m.spur ? 195 : y, 50, h); }
  }
  ctx.globalAlpha = 1;
}
function aufenthaltEbene(ctx, z, c, lw) {
  const m = z.messung.heute;
  for (const [ort, min] of Object.entries(m.aufenthalt)) {
    const o = ORTE[ort] ?? (ort === "bank" ? BANK[z.m.bank] : null); if (!o) continue;
    ctx.fillStyle = c.vergleich; ctx.globalAlpha = 0.18; ctx.beginPath(); ctx.arc(o.x, o.y, 6 + Math.sqrt(min) * 2.2, 0, 7); ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = c.vergleich; lw(1); ctx.stroke();
  }
}
function belastungEbene(ctx, z, c, r) {
  for (const f of z.figuren) {
    if (f.zustand === "weg" || f.zustand === "heim" || f.zustand === "drinnen") continue;
    const w = f.wege.filter((x) => x.tag === z.tag); const last = w.reduce((s, x) => s + x.umweg / 1.2 + x.warten, 0) + (f.aufgabe ? f.aufgabe.warten + f.aufgabe.umweg / 1.2 : 0);
    if (last < 30) continue;
    ctx.fillStyle = c.koralle; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(f.x, f.y, r + Math.min(14, Math.sqrt(last) * 0.7), 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function erreichbarkeitEbene(ctx, z, c, lw, r) {
  // an jeder Wohnung: heutige Wege als kleine Marken (voll = erreicht, grau = Ersatzziel, Ring = aufgegeben)
  const nach = {};
  for (const f of z.figuren) for (const w of f.wege) if (w.tag === z.tag && w.ziel !== "haltN") (nach[f.wohnung] ??= []).push(w.status);
  for (const wo of WOHNUNGEN) {
    const l = nach[wo.id]; if (!l) continue;
    l.forEach((s, i) => {
      const x = wo.x - 6 + (i % 5) * 3.2, y = wo.y + (wo.y < 210 ? -7 : 7) + Math.floor(i / 5) * 3.2;
      ctx.beginPath(); ctx.arc(x, y, 1.3, 0, 7);
      if (s === "erreicht") { ctx.fillStyle = c.linie; ctx.fill(); } else if (s === "ersetzt") { ctx.fillStyle = c.leise; ctx.fill(); } else { ctx.strokeStyle = c.koralle; lw(1.2); ctx.stroke(); }
    });
  }
}

// ---------- Vorschau ----------
function vorschau(ctx, z, [schluessel, wert], c, lw, px, dpr) {
  ctx.save();
  ctx.strokeStyle = c.koralle; ctx.fillStyle = c.koralle; lw(1.6); ctx.setLineDash([px(5 * dpr), px(4 * dpr)]);
  ctx.globalAlpha = 0.9;
  if (schluessel === "spur" && wert) { ctx.strokeRect(0, 195, BREITE, 5); ctx.strokeRect(0, 220, BREITE, 5); }
  if (schluessel === "querung" && wert) { ctx.strokeRect(X_ZEBRA - 5, 199, 10, 22); }
  if (schluessel === "bus" && wert) { for (const y of [182, 238]) ctx.strokeRect(X_HALT - 14, y - 5, 28, 10); }
  if (schluessel === "ruhe" && wert) { for (const x of [60, 540]) { ctx.beginPath(); ctx.arc(x, 186, 6, 0, 7); ctx.stroke(); } }
  if (schluessel === "durchgang" && wert) linie(ctx, 150, 232, 150, 330);
  if (schluessel === "zwischennutzung" && wert) ctx.strokeRect(224, 164, 26, 16);
  if (schluessel === "bank") { const b = BANK[wert]; ctx.strokeRect(b.x - 7, b.y - 4, 14, 8); }
  if (schluessel === "verbindung") {
    const v = VERBINDUNG[wert];
    if (v.zaun) linie(ctx, 0, 210, BREITE, 210);
    if (v.bruecke === "treppe") ctx.strokeRect(294, 170, 12, 80);
    if (v.bruecke === "rampe") { ctx.strokeRect(294, 178, 12, 64); ctx.strokeRect(300, 177, 92, 8); ctx.strokeRect(300, 235, 92, 8); }
    if (!v.ampel) { ctx.setLineDash([]); linie(ctx, X_AMPEL - 6, 196, X_AMPEL + 6, 224); linie(ctx, X_AMPEL + 6, 196, X_AMPEL - 6, 224); }
  }
  if (schluessel.startsWith("atelier")) { ctx.strokeRect(318, 146, 76, 50); }
  ctx.restore();
}
