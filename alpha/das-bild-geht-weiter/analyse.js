// «Das Bild geht weiter» – Erschliessung des Eingangsbildes mit nachvollziehbaren Verfahren: Farbgruppen (k-Means im Lab-Raum),
// zusammenhängende Flächen, Kanten, Nachbarschaften, Lagen und Formmasse. Das ist eine farb- und geometriebasierte Gliederung,
// kein semantisches Bildverständnis: Sie erkennt keine Gegenstände und behauptet nichts über die Entstehung des Bildes.
// Reine Rechnung ohne DOM, damit sie auch in Node geprüft werden kann (tests/bildgang.test.mjs).
//
// Koordinaten: normiert auf die Bildhöhe (y von 0 bis 1, x von 0 bis Seitenverhältnis), damit Analyse, Simulation und Ausgabe
// in jeder Auflösung dieselben Stellen meinen.

/** kleiner, reproduzierbarer Zufall (mulberry32) */
export function zufall(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** sRGB (0–255) → CIE-Lab (D65) */
export function lab(r, g, b) {
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const R = lin(r), G = lin(g), B = lin(b);
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const x = f((R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047);
  const y = f(R * 0.2126 + G * 0.7152 + B * 0.0722);
  const z = f((R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const abstand = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
export const helligkeit = (rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
export const farbton = (rgb) => {
  const [r, g, b] = rgb.map((c) => c / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d < 1e-6) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return ((h * 60) + 360) % 360;
};
const prozent = (x) => `${Math.round(x * 100)} %`;
const grad = (w) => `${Math.round(((w * 180) / Math.PI + 180) % 180)}°`;

export const VORGABEN = Object.freeze({ farben: 6, mindestanteil: 0.004, hoechstteile: 12 });

/**
 * Analysiert ein Bild (RGBA, schon auf Analysegrösse verkleinert, etwa 200 px lange Seite).
 * opt: farben (3–10), mindestanteil (kleinste Fläche als Anteil des Bildes), korrekturen (Tipps in der Vorschau, normierte Punkte),
 *      verworfen (Kennungen von Lesarten, die nicht verwendet werden), regel ('farbe' | 'groesse' | 'helligkeit' | null = aus dem Bild)
 */
export function analysiere(bild, opt = {}) {
  const farben = Math.max(2, Math.min(12, opt.farben ?? VORGABEN.farben));
  const mindestanteil = opt.mindestanteil ?? VORGABEN.mindestanteil;
  const korrekturen = opt.korrekturen ?? [];
  const verworfen = new Set(opt.verworfen ?? []);
  const { width: w, height: h, data } = bild;
  const n = w * h;

  // 1 · Farbgruppen: k-Means im Lab-Raum, Start nach k-means++ mit festem Zufall (gleiches Bild → gleiche Gruppen)
  const L = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [l, a, b] = lab(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]);
    L[i * 3] = l; L[i * 3 + 1] = a; L[i * 3 + 2] = b;
  }
  const r = zufall(0x5eed);
  const zentren = [];
  const erster = Math.floor(r() * n);
  zentren.push([L[erster * 3], L[erster * 3 + 1], L[erster * 3 + 2]]);
  const dmin = new Float32Array(n).fill(Infinity);
  while (zentren.length < farben) {
    const c = zentren[zentren.length - 1];
    let summe = 0;
    for (let i = 0; i < n; i++) {
      const d = (L[i * 3] - c[0]) ** 2 + (L[i * 3 + 1] - c[1]) ** 2 + (L[i * 3 + 2] - c[2]) ** 2;
      if (d < dmin[i]) dmin[i] = d;
      summe += dmin[i];
    }
    if (summe <= 1e-9) break;                                 // weniger verschiedene Farben als Gruppen
    let ziel = r() * summe, k = 0;
    for (; k < n - 1; k++) { ziel -= dmin[k]; if (ziel <= 0) break; }
    zentren.push([L[k * 3], L[k * 3 + 1], L[k * 3 + 2]]);
  }
  const gruppe = new Uint8Array(n);
  for (let iter = 0; iter < 14; iter++) {
    const s = zentren.map(() => [0, 0, 0, 0]);
    let wechsel = 0;
    for (let i = 0; i < n; i++) {
      let best = 0, bd = Infinity;
      for (let k = 0; k < zentren.length; k++) {
        const c = zentren[k];
        const d = (L[i * 3] - c[0]) ** 2 + (L[i * 3 + 1] - c[1]) ** 2 + (L[i * 3 + 2] - c[2]) ** 2;
        if (d < bd) { bd = d; best = k; }
      }
      if (gruppe[i] !== best) wechsel++;
      gruppe[i] = best;
      const t = s[best]; t[0] += L[i * 3]; t[1] += L[i * 3 + 1]; t[2] += L[i * 3 + 2]; t[3]++;
    }
    s.forEach((t, k) => { if (t[3]) zentren[k] = [t[0] / t[3], t[1] / t[3], t[2] / t[3]]; });
    if (iter > 0 && wechsel === 0) break;
  }
  // eine Glättung (Mehrheit im 3 × 3-Feld) nimmt vereinzelte Pixel aus dem Bildrauschen
  const geglaettet = gruppe.slice();
  const zaehl = new Uint16Array(zentren.length);
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    zaehl.fill(0);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) zaehl[gruppe[(y + dy) * w + x + dx]]++;
    let best = gruppe[y * w + x];
    for (let k = 0; k < zaehl.length; k++) if (zaehl[k] >= 5) best = k;
    geglaettet[y * w + x] = best;
  }

  // 2 · zusammenhängende Flächen (4er-Nachbarschaft)
  const komp = new Int32Array(n).fill(-1);
  const groesse = [];
  const stapel = new Int32Array(n);
  let anzahl = 0;
  for (let s = 0; s < n; s++) {
    if (komp[s] >= 0) continue;
    const g = geglaettet[s];
    let oben = 0, px = 0;
    stapel[oben++] = s; komp[s] = anzahl;
    while (oben) {
      const i = stapel[--oben]; px++;
      const x = i % w, y = (i - x) / w;
      if (x > 0 && komp[i - 1] < 0 && geglaettet[i - 1] === g) { komp[i - 1] = anzahl; stapel[oben++] = i - 1; }
      if (x < w - 1 && komp[i + 1] < 0 && geglaettet[i + 1] === g) { komp[i + 1] = anzahl; stapel[oben++] = i + 1; }
      if (y > 0 && komp[i - w] < 0 && geglaettet[i - w] === g) { komp[i - w] = anzahl; stapel[oben++] = i - w; }
      if (y < h - 1 && komp[i + w] < 0 && geglaettet[i + w] === g) { komp[i + w] = anzahl; stapel[oben++] = i + w; }
    }
    groesse.push(px); anzahl++;
  }
  // 3 · kleine Flächen gehen in die Nachbarfläche mit der längsten gemeinsamen Grenze auf
  const nb = Array.from({ length: anzahl }, () => new Map());
  const kante = (a, b) => { if (a !== b) { nb[a].set(b, (nb[a].get(b) ?? 0) + 1); nb[b].set(a, (nb[b].get(a) ?? 0) + 1); } };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (x < w - 1) kante(komp[i], komp[i + 1]);
    if (y < h - 1) kante(komp[i], komp[i + w]);
  }
  const eltern = Int32Array.from({ length: anzahl }, (_, i) => i);
  const wurzel = (a) => { while (eltern[a] !== a) a = eltern[a] = eltern[eltern[a]]; return a; };
  const mindestpx = Math.max(4, Math.round(mindestanteil * n));
  const reihenfolge = [...groesse.keys()].sort((a, b) => groesse[a] - groesse[b] || a - b);
  for (const k of reihenfolge) {
    const a = wurzel(k);
    if (groesse[a] >= mindestpx) continue;
    let ziel = -1, laenge = -1;
    for (const [b, l] of nb[a]) { const rb = wurzel(b); if (rb !== a && (l > laenge || (l === laenge && rb < ziel))) { ziel = rb; laenge = l; } }
    if (ziel < 0) continue;
    eltern[a] = ziel; groesse[ziel] += groesse[a];
    for (const [b, l] of nb[a]) { const rb = wurzel(b); if (rb !== ziel) nb[ziel].set(rb, (nb[ziel].get(rb) ?? 0) + l); }
  }
  // 4 · Flächen neu nummerieren, nach Grösse absteigend
  const roh = new Map();
  for (let i = 0; i < n; i++) { const a = wurzel(komp[i]); roh.set(a, (roh.get(a) ?? 0) + 1); }
  const nach = new Map([...roh.entries()].sort((p, q) => q[1] - p[1] || p[0] - q[0]).map(([a], i) => [a, i]));
  const region = new Int32Array(n);
  for (let i = 0; i < n; i++) region[i] = nach.get(wurzel(komp[i]));
  const R = nach.size;

  // 5 · Masse je Fläche
  const F = Array.from({ length: R }, (_, id) => ({ id, px: 0, rgb: [0, 0, 0], lab: [0, 0, 0], gz: new Float64Array(zentren.length), sx: 0, sy: 0, sxx: 0, syy: 0, sxy: 0,
    x0: w, y0: h, x1: 0, y1: 0, umfang: 0, rand: 0, nachbarn: new Map() }));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, f = F[region[i]];
    f.px++; f.rgb[0] += data[i * 4]; f.rgb[1] += data[i * 4 + 1]; f.rgb[2] += data[i * 4 + 2];
    f.lab[0] += L[i * 3]; f.lab[1] += L[i * 3 + 1]; f.lab[2] += L[i * 3 + 2];
    f.gz[geglaettet[i]]++;
    f.sx += x; f.sy += y; f.sxx += x * x; f.syy += y * y; f.sxy += x * y;
    if (x < f.x0) f.x0 = x; if (x > f.x1) f.x1 = x; if (y < f.y0) f.y0 = y; if (y > f.y1) f.y1 = y;
    const pruef = (j, randpixel) => {
      if (randpixel) { f.umfang++; f.rand++; return; }
      const o = region[j];
      if (o !== region[i]) { f.umfang++; f.nachbarn.set(o, (f.nachbarn.get(o) ?? 0) + 1); }
    };
    pruef(i - 1, x === 0); pruef(i + 1, x === w - 1); pruef(i - w, y === 0); pruef(i + w, y === h - 1);
  }
  // Kanten (Sobel auf der Helligkeit): mittlere Stärke im Bild und an den Grenzen jeder Fläche
  const Y = new Float32Array(n);
  for (let i = 0; i < n; i++) Y[i] = L[i * 3];
  let kantenSumme = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const gx = Y[i - w + 1] + 2 * Y[i + 1] + Y[i + w + 1] - Y[i - w - 1] - 2 * Y[i - 1] - Y[i + w - 1];
    const gy = Y[i + w - 1] + 2 * Y[i + w] + Y[i + w + 1] - Y[i - w - 1] - 2 * Y[i - w] - Y[i - w + 1];
    kantenSumme += Math.hypot(gx, gy) / 8;
  }
  const kantendichte = kantenSumme / Math.max(1, (w - 2) * (h - 2));

  const flaechen = F.map((f) => {
    const px = f.px, mx = f.sx / px, my = f.sy / px;
    const cxx = f.sxx / px - mx * mx, cyy = f.syy / px - my * my, cxy = f.sxy / px - mx * my;
    const spur = cxx + cyy, det = cxx * cyy - cxy * cxy, wurzelT = Math.sqrt(Math.max(0, spur * spur / 4 - det));
    const l1 = spur / 2 + wurzelT, l2 = Math.max(1e-6, spur / 2 - wurzelT);
    let cluster = 0;
    for (let k = 1; k < f.gz.length; k++) if (f.gz[k] > f.gz[cluster]) cluster = k;
    return {
      id: f.id, cluster, px, anteil: px / n,
      rgb: f.rgb.map((v) => Math.round(v / px)), lab: f.lab.map((v) => v / px),
      cx: (mx + 0.5) / h, cy: (my + 0.5) / h,
      bbox: { x0: f.x0, y0: f.y0, x1: f.x1, y1: f.y1 },
      umfang: f.umfang, rand: f.rand,
      kompakt: Math.min(1, (4 * Math.PI * px) / Math.max(1, f.umfang * f.umfang) / (Math.PI / 4)),
      fuellung: px / ((f.x1 - f.x0 + 1) * (f.y1 - f.y0 + 1)),
      achse: 0.5 * Math.atan2(2 * cxy, cxx - cyy), streckung: Math.sqrt(l1 / l2),
      nachbarn: Object.fromEntries([...f.nachbarn.entries()].sort((p, q) => q[1] - p[1])),
    };
  });
  const umfangBild = 2 * (w + h);
  for (const f of flaechen) {
    let s = 0, gew = 0;
    for (const [o, l] of Object.entries(f.nachbarn)) { s += abstand(f.lab, flaechen[o].lab) * l; gew += l; }
    f.kontrast = gew ? s / gew : 0;
    f.randanteil = f.rand / umfangBild;
    f.eingeschlossenIn = f.rand === 0 && Object.keys(f.nachbarn).length === 1 ? Number(Object.keys(f.nachbarn)[0]) : null;
  }

  // 6 · Grund und Figur: Flächen mit viel Bildrand oder grosse Randflächen gelten als Grund; Korrekturen aus der Vorschau gehen vor
  const istGrund = new Set(flaechen.filter((f) => f.randanteil >= 0.12 || (f.rand > 0 && f.anteil >= 0.2)).map((f) => f.id));
  if (!istGrund.size) istGrund.add([...flaechen].sort((a, b) => b.randanteil - a.randanteil || b.anteil - a.anteil)[0].id);
  const flaecheBei = (p) => region[Math.min(h - 1, Math.max(0, Math.floor(p.y * h))) * w + Math.min(w - 1, Math.max(0, Math.floor(p.x * h)))];
  for (const k of korrekturen) {
    const id = flaecheBei(k);
    if (k.art === "grund") istGrund.add(id);
    if (k.art === "figur") istGrund.delete(id);
  }
  if (istGrund.size === flaechen.length && flaechen.length > 1) istGrund.delete([...istGrund].sort((a, b) => flaechen[a].anteil - flaechen[b].anteil)[0]);
  for (const f of flaechen) {
    f.rolle = istGrund.has(f.id) ? "grund" : "figur";
    f.gewicht = Math.sqrt(f.anteil) * (0.5 + f.kontrast / 60) * (0.6 + 0.4 * f.kompakt);
  }
  const figuren = flaechen.filter((f) => f.rolle === "figur" && f.anteil >= mindestanteil * 0.75);
  // Auswahl: die gewichtigsten Figuren; Tipps in der Vorschau nehmen Teile dazu oder heraus
  const auswahl = new Set([...figuren].sort((a, b) => b.gewicht - a.gewicht || a.id - b.id).slice(0, VORGABEN.hoechstteile).map((f) => f.id));
  for (const k of korrekturen) {
    const id = flaecheBei(k);
    if (k.art === "teil+") auswahl.add(id);
    if (k.art === "teil-") auswahl.delete(id);
  }
  const teile = [...auswahl].sort((a, b) => a - b).map((id) => flaechen[id]);

  // 7 · Anordnung: Hauptachse der Teile (gewichtete Lagen), Abstände zum nächsten Nachbarn
  let ax = 0, ay = 0, sw = 0;
  for (const f of teile) { ax += f.cx * f.anteil; ay += f.cy * f.anteil; sw += f.anteil; }
  ax /= sw || 1; ay /= sw || 1;
  let qxx = 0, qyy = 0, qxy = 0;
  for (const f of teile) { qxx += f.anteil * (f.cx - ax) ** 2; qyy += f.anteil * (f.cy - ay) ** 2; qxy += f.anteil * (f.cx - ax) * (f.cy - ay); }
  const seite = w / h;
  const achsWinkel = teile.length >= 2 ? 0.5 * Math.atan2(2 * qxy, qxx - qyy) : (seite >= 1 ? 0 : Math.PI / 2);
  const spurQ = qxx + qyy, wq = Math.sqrt(Math.max(0, spurQ * spurQ / 4 - (qxx * qyy - qxy * qxy)));
  const achsStaerke = spurQ > 0 ? (spurQ / 2 + wq) / Math.max(1e-9, spurQ / 2 - wq) : 1;
  const nn = teile.map((f) => Math.min(...teile.filter((g) => g !== f).map((g) => Math.hypot(f.cx - g.cx, f.cy - g.cy))));
  const nnMittel = nn.length > 1 ? nn.reduce((a, b) => a + b, 0) / nn.length : 0;
  const nnStreu = nn.length > 1 ? Math.sqrt(nn.reduce((a, b) => a + (b - nnMittel) ** 2, 0) / nn.length) / (nnMittel || 1) : 0;

  // 8 · Wiederholungen: Farbgruppen in mehreren getrennten Teilen, ähnliche Formen
  const proGruppe = new Map();
  for (const f of flaechen.filter((f) => f.rolle === "figur")) proGruppe.set(f.cluster, [...(proGruppe.get(f.cluster) ?? []), f.id]);
  const farbWdh = [...proGruppe.entries()].filter(([, ids]) => ids.length >= 2).sort((a, b) => b[1].length - a[1].length);
  const formGruppen = [];
  const formFrei = new Set(teile.map((f) => f.id));
  for (const f of teile) {
    if (!formFrei.has(f.id)) continue;
    const gl = teile.filter((g) => g !== f && formFrei.has(g.id) && Math.abs(Math.log(g.streckung / f.streckung)) < 0.25 && Math.abs(g.fuellung - f.fuellung) < 0.12 && Math.abs(Math.log(g.anteil / f.anteil)) < 0.9);
    if (gl.length) { formGruppen.push([f.id, ...gl.map((g) => g.id)]); formFrei.delete(f.id); gl.forEach((g) => formFrei.delete(g.id)); }
  }

  // 9 · Verbindungen und Unterbrechungen: berührende Teile; gleiche Farbe, getrennt durch eine dritte Fläche, die an beide grenzt
  const kontakte = [];
  for (const f of teile) for (const g of teile) if (f.id < g.id && f.nachbarn[g.id]) kontakte.push([f.id, g.id]);
  const unterbrechungen = [];
  for (const [, ids] of farbWdh) for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const a = flaechen[ids[i]], b = flaechen[ids[j]];
    for (const c of Object.keys(a.nachbarn).map(Number)) {
      if (!b.nachbarn[c] || flaechen[c].cluster === a.cluster) continue;
      const C = flaechen[c];
      const t = ((C.cx - a.cx) * (b.cx - a.cx) + (C.cy - a.cy) * (b.cy - a.cy)) / Math.max(1e-9, (b.cx - a.cx) ** 2 + (b.cy - a.cy) ** 2);
      if (t > 0.1 && t < 0.9) { unterbrechungen.push({ a: a.id, b: b.id, durch: c }); break; }
    }
  }
  const einschluesse = flaechen.filter((f) => f.eingeschlossenIn !== null && f.anteil >= mindestanteil).map((f) => ({ innen: f.id, aussen: f.eingeschlossenIn }));

  // 10 · Gewichtung: Schwerpunkt der Figuren gegenüber der Bildmitte
  const grund = flaechen.filter((f) => f.rolle === "grund");
  const grundAnteil = grund.reduce((s, f) => s + f.anteil, 0);
  const lage = (x, y) => `${y < 0.42 ? "oben" : y > 0.58 ? "unten" : "mittig"}${x < seite * 0.42 ? " links" : x > seite * 0.58 ? " rechts" : ""}`.replace("mittig ", "");

  // Regel für neue Nachbarschaften (Schritt 1): aus dem Befund, falls nicht von Hand gewählt
  const farbeAktiv = !verworfen.has("wiederholung") && farbWdh.length > 0;
  const regel = opt.regel ?? (farbeAktiv ? "farbe" : formGruppen.length ? "groesse" : "helligkeit");
  const regelText = { farbe: "nach Farbgruppe (gleiche Farben werden Nachbarn)", groesse: "nach Fläche (von gross nach klein)", helligkeit: "nach Helligkeit (von dunkel nach hell)" }[regel];
  const achseAktiv = !verworfen.has("anordnung");
  const achse = achseAktiv && achsStaerke >= 1.6 ? achsWinkel : (seite >= 1 ? 0 : Math.PI / 2);
  const name = (id) => `F${id + 1}`;

  const befunde = [
    {
      id: "flaechen", thema: "Grenzen, Konturen und Flächen", schaltbar: false,
      befund: `${flaechen.length} zusammenhängende Flächen in ${zentren.length} Farbgruppen; mittlere Kantenstärke ${kantendichte.toFixed(1)} (Helligkeitsänderung je Pixel, Analyse ${w} × ${h} px).`,
      lesart: kantendichte > 6 || flaechen.length > 40 ? "Das Bild ist kleinteilig gegliedert; die Flächen sind eine Vereinfachung, die feine Übergänge zusammenfasst." : "Das Bild lässt sich in wenige, klar begrenzte Flächen gliedern.",
      eingriff: `${teile.length} Flächen werden als Teile ausgeschnitten (${teile.map((f) => name(f.id)).join(", ")}); der Rest bleibt Grund oder untergeordnete Fläche.`,
      flaechen: teile.map((f) => f.id),
    },
    {
      id: "anordnung", thema: "Nachbarschaften, Abstände und Anordnungen", schaltbar: true,
      befund: `Hauptachse der Teile ${grad(achsWinkel)} (Streckung ${achsStaerke.toFixed(1)} : 1); mittlerer Abstand zum nächsten Teil ${prozent(nnMittel)} der Bildhöhe, Streuung ${prozent(nnStreu)}.`,
      lesart: achsStaerke >= 1.6 ? `Die Teile reihen sich eher entlang einer Richtung von ${grad(achsWinkel)}.` : "Die Teile verteilen sich ohne deutliche Vorzugsrichtung.",
      eingriff: `Schritt 1 reiht die Teile entlang ${achsStaerke >= 1.6 && achseAktiv ? "dieser Achse" : "der längeren Bildseite"} neu.`,
      flaechen: teile.map((f) => f.id),
    },
    {
      id: "wiederholung", thema: "Wiederholungen von Farben und Formen", schaltbar: farbWdh.length > 0,
      befund: (farbWdh.length ? farbWdh.slice(0, 3).map(([k, ids]) => `Farbgruppe ${k + 1} kehrt in ${ids.length} getrennten Flächen wieder`).join("; ") : "Keine Farbgruppe kehrt in mehreren getrennten Figurflächen wieder")
        + (formGruppen.length ? `; ähnliche Formen (Streckung, Füllung, Grösse): ${formGruppen.map((g) => g.map(name).join(" ~ ")).join(", ")}.` : "; keine ähnlichen Formen unter den Teilen."),
      lesart: farbWdh.length ? "Gleiche Farbe kann als Zusammengehörigkeit getrennter Teile gelesen werden." : "Zusammengehörigkeit ergibt sich hier eher aus Lage und Grösse als aus Farbe.",
      eingriff: `Neue Nachbarschaften ${regelText}.`,
      flaechen: farbWdh.flatMap(([, ids]) => ids),
    },
    {
      id: "verbindung", thema: "Verbindungen und Unterbrechungen", schaltbar: kontakte.length > 0,
      befund: `${kontakte.length} Berührungen zwischen Teilen${kontakte.length ? ` (${kontakte.slice(0, 5).map(([a, b]) => `${name(a)}–${name(b)}`).join(", ")}${kontakte.length > 5 ? " …" : ""})` : ""}; ${unterbrechungen.length} gleichfarbige Paare, zwischen denen eine andere Fläche liegt${unterbrechungen.length ? ` (${unterbrechungen.slice(0, 3).map((u) => `${name(u.a)} | ${name(u.durch)} | ${name(u.b)}`).join(", ")})` : ""}.`,
      lesart: unterbrechungen.length ? "Eine gleichfarbige, unterbrochene Folge kann als eine durchlaufende Fläche gelesen werden, die an einer Stelle unterbrochen ist." : "Die Teile hängen eher über Nachbarschaft als über unterbrochene Linien zusammen.",
      eingriff: "Berührungen und nächste Nachbarn im Bild werden in Schritt 4 zu Kopplungen mit der ursprünglichen Distanz als Ruhelänge.",
      flaechen: kontakte.flat(),
    },
    {
      id: "ueberlagerung", thema: "Überlagerungen und Verdeckungen", schaltbar: einschluesse.length + unterbrechungen.length > 0,
      befund: einschluesse.length || unterbrechungen.length
        ? `${einschluesse.length ? `${einschluesse.slice(0, 4).map((e) => `${name(e.innen)} liegt ganz innerhalb von ${name(e.aussen)}`).join("; ")}` : "Keine Fläche liegt ganz in einer anderen"}${unterbrechungen.length ? `; ${unterbrechungen.length} Unterbrechung(en) durch eine dritte Fläche` : ""}.`
        : "Keine eingeschlossenen Flächen und keine Unterbrechungen durch Dritte gefunden.",
      lesart: einschluesse.length || unterbrechungen.length ? "Mögliche Verdeckung: Die innere oder trennende Fläche kann vor der anderen liegen – oder eine Öffnung in ihr sein. Die Gliederung entscheidet das nicht." : "Hinweise auf Überlagerung ergeben sich aus der Gliederung nicht.",
      eingriff: "Schritt 2 legt die Teile in einer Staffelung übereinander; eingeschlossene Teile bleiben dabei über ihrer Umgebung (wenn diese Lesart gilt).",
      flaechen: einschluesse.flatMap((e) => [e.innen, e.aussen]),
    },
    {
      id: "grund", thema: "Figur-Grund-Beziehungen und Gewichtungen", schaltbar: false,
      befund: `Grund: ${grund.map((f) => name(f.id)).join(", ") || "–"} (${prozent(grundAnteil)} des Bildes, am Rand gelegen). Schwerpunkt der Teile ${lage(ax, ay)}.`,
      lesart: "Randnahe, grosse Flächen werden als Grund gelesen, kleinere mit Kontrast als Figuren. Antippen in der Vorschau korrigiert das.",
      eingriff: "Schritt 5 macht die Zwischenräume zwischen den Teilen zur tragenden Form und füllt sie mit dem Material des Grundes.",
      flaechen: grund.map((f) => f.id),
    },
  ].map((b) => ({ ...b, aktiv: !verworfen.has(b.id) }));

  return {
    breite: w, hoehe: h, seite, zentren: zentren.map((c) => ({ lab: c })), gruppe: geglaettet, region, flaechen,
    kantendichte, teile: teile.map((f) => f.id), grund: grund.map((f) => f.id),
    hauptachse: { winkel: achsWinkel, staerke: achsStaerke, verwendet: achse }, schwerpunkt: { x: ax, y: ay },
    wiederholung: { farben: farbWdh, formen: formGruppen }, kontakte, unterbrechungen, einschluesse,
    regel, befunde, einstellungen: { farben, mindestanteil, korrekturen, verworfen: [...verworfen], regel: opt.regel ?? null },
  };
}

/** Konturen eines Rasters (Marching Squares, linear interpoliert), als geschlossene Linienzüge in Rasterkoordinaten. */
export function konturen(feld, w, h, schwelle = 0.5) {
  const W = w + 2, H = h + 2;
  const v = (x, y) => (x <= 0 || y <= 0 || x >= W - 1 || y >= H - 1 ? 0 : feld[(y - 1) * w + (x - 1)]);
  const segmente = new Map();
  const punkt = (x, y) => `${x.toFixed(4)},${y.toFixed(4)}`;
  const kantenpunkt = (x0, y0, x1, y1) => {
    const a = v(x0, y0), b = v(x1, y1), t = Math.abs(b - a) < 1e-9 ? 0.5 : (schwelle - a) / (b - a);
    return [x0 + (x1 - x0) * t - 1, y0 + (y1 - y0) * t - 1];
  };
  const verbinde = (p, q) => {
    const kp = punkt(...p);
    if (!segmente.has(kp)) segmente.set(kp, []);
    segmente.get(kp).push(q);
  };
  for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
    const a = v(x, y) >= schwelle, b = v(x + 1, y) >= schwelle, c = v(x + 1, y + 1) >= schwelle, d = v(x, y + 1) >= schwelle;
    const code = (a ? 8 : 0) | (b ? 4 : 0) | (c ? 2 : 0) | (d ? 1 : 0);
    if (code === 0 || code === 15) continue;
    const o = () => kantenpunkt(x, y, x + 1, y), r = () => kantenpunkt(x + 1, y, x + 1, y + 1);
    const u = () => kantenpunkt(x, y + 1, x + 1, y + 1), l = () => kantenpunkt(x, y, x, y + 1);
    // Richtung so, dass das Innere (≥ Schwelle) immer rechts liegt; die Sattelfälle 5 und 10 werden getrennt
    const paare = {
      1: [[l, u]], 2: [[u, r]], 3: [[l, r]], 4: [[r, o]], 5: [[r, o], [l, u]], 6: [[u, o]], 7: [[l, o]],
      8: [[o, l]], 9: [[o, u]], 10: [[o, l], [u, r]], 11: [[o, r]], 12: [[r, l]], 13: [[r, u]], 14: [[u, l]],
    }[code];
    for (const [p, q] of paare) verbinde(p(), q());
  }
  const linien = [];
  while (segmente.size) {
    const [start] = segmente.entries().next().value;
    let p = start.split(",").map(Number);
    const zug = [p];
    let schluessel = start;
    for (let schutz = 0; schutz < 100000; schutz++) {
      const liste = segmente.get(schluessel);
      if (!liste || !liste.length) { segmente.delete(schluessel); break; }
      const q = liste.pop();
      if (!liste.length) segmente.delete(schluessel);
      zug.push(q);
      schluessel = punkt(...q);
      if (schluessel === start) break;
    }
    if (zug.length > 3) linien.push(zug);
  }
  return linien;
}
