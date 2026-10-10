// «The Fictory» – Bedienung: Bild laden → Analyse prüfen → optional ORNA ziehen → erzeugen → ansehen und exportieren.
// Alles läuft im Browser. Externe Dienste werden nicht aufgerufen; jev wirkt nur über die beim Bauen erzeugte Tabelle (jev.js).
import { analysiere, konturen, leitfarbe } from "./analyse.js?v=3";
import { erzeugeLauf, anfang, schritt, kopie, bis, SCHLUESSEL, GESAMT, STATIONEN, TAKT, zustandsSchluessel, beschreibungen } from "./operationen.js?v=3";
import { baueMaterial, zeichne, PAPIER, TINTE } from "./zeichnen.js?v=3";
import { REGELN } from "./regeln.js?v=3";
import { ziehe, ableiten, jevGueltig, konstellation, BESTAND } from "./orna.js?v=3";
import { JEV } from "./jev.js?v=3";
import { zip } from "./zip.js?v=3";
import { feldMitShader } from "./feld.js?v=3";

const $ = (id) => document.getElementById(id);
const ANALYSE_SEITE = 200;      // längste Seite der Analyse in Pixeln
const ARBEIT_SEITE = 2400;      // längste Seite des Arbeitsbildes (Material der Standbilder)
const EXPORT_MIN = 1600;        // Standbilder mindestens so lang (längste Seite)
const BUEHNE_SEITE = 1080;      // Vorschau der Animation
const VIDEO_SEITE = 1080;       // Video
const MERKEN = 15;              // Momentaufnahme alle 15 Schritte (Zeitleiste)
const VERSION = "2.0";

const S = {
  bild: null, arbeit: null, analyseBild: null, A: null,
  einstellungen: { farben: 6, mindestanteil: 0.004, korrekturen: [], verworfen: [], regel: null },
  orna: null, vorherigeKonstellation: null, seed: neuerStartwert(), lauf: null, spielt: false, abweichungen: 0,
};

function neuerStartwert() { const b = new Uint32Array(1); crypto.getRandomValues(b); return b[0]; }
const zahl = (x, d = 1) => x.toLocaleString("de-CH", { minimumFractionDigits: d, maximumFractionDigits: d });
const leinwand = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "bild";
const mass = (seite, lang) => (seite >= 1 ? [lang, Math.round(lang / seite)] : [Math.round(lang * seite), lang]);
function herunterladen(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
const alsBlob = (c, typ = "image/png") => new Promise((ok, nein) => c.toBlob((b) => (b ? ok(b) : nein(new Error("Bild konnte nicht erzeugt werden"))), typ));

// ---------- 1 · Bild laden ----------
async function ladeDatei(datei) {
  $("status-laden").textContent = "Bild wird gelesen …";
  try {
    const bytes = new Uint8Array(await datei.arrayBuffer());
    const sha = [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
    const bitmap = await createImageBitmap(new Blob([bytes], { type: datei.type || "image/png" }), { imageOrientation: "from-image" });
    const bw = bitmap.width, bh = bitmap.height;
    const f = Math.min(1, ARBEIT_SEITE / Math.max(bw, bh));
    const arbeit = leinwand(bw * f, bh * f);
    const ax = arbeit.getContext("2d", { willReadFrequently: true });
    ax.imageSmoothingQuality = "high";
    ax.drawImage(bitmap, 0, 0, arbeit.width, arbeit.height);
    const g = ANALYSE_SEITE / Math.max(bw, bh);
    const klein = leinwand(Math.max(8, bw * g), Math.max(8, bh * g));
    const kx = klein.getContext("2d", { willReadFrequently: true });
    kx.imageSmoothingQuality = "high";
    kx.drawImage(arbeit, 0, 0, klein.width, klein.height);
    S.bild = { name: datei.name || "bild", breite: bw, hoehe: bh, sha256: sha, typ: datei.type || "" };
    S.arbeit = arbeit;
    S.analyseBild = kx.getImageData(0, 0, klein.width, klein.height);
    S.einstellungen = { farben: 6, mindestanteil: 0.004, korrekturen: [], verworfen: [], regel: null };
    $("farben").value = 6; $("mindest").value = 4; $("regel").value = "";
    const img = $("original");
    img.src = URL.createObjectURL(datei); img.alt = `Eingangsbild ${S.bild.name}`; img.hidden = false;
    $("ablage").classList.add("belegt"); $("ablage").hidden = false; $("buehne-box").hidden = true;
    $("status-laden").textContent = `${S.bild.name}, ${bw} × ${bh} px. Prüfe unten die Analyse und erzeuge dann den Lauf.`;
    stoppe(); S.lauf = null; $("ergebnis").hidden = true;
    neuAnalysieren();
    setzeLeitfarbe(S.A);
    for (const id of ["schritt-analyse", "schritt-orna", "schritt-erzeugen"]) $(id).hidden = false;
    zeigeStartwert();
  } catch (e) {
    $("status-laden").textContent = `Das Bild liess sich nicht lesen (${e.message}).`;
  }
}

/** Leitfarbe der Werkbank: aus dem Bild (analyse.js) */
function setzeLeitfarbe(A) { document.documentElement.style.setProperty("--leit-roh", `rgb(${leitfarbe(A).join(",")})`); }

// ---------- 2 · Analyse ----------
function neuAnalysieren() {
  S.A = analysiere(S.analyseBild, S.einstellungen);
  S.A.konturen = null;
  zeichneGliederung(); zeigeTeile(); zeigeBefunde();
  if (S.lauf) $("status-erzeugen").textContent = "Die Analyse hat sich geändert. «Erzeugen» übernimmt sie.";
}
function regionKonturen(A) {
  if (A.konturen) return A.konturen;
  const { breite: aw, hoehe: ah } = A;
  A.konturen = A.flaechen.map((F) => {
    const b = F.bbox, x0 = Math.max(0, b.x0 - 1), y0 = Math.max(0, b.y0 - 1), w = Math.min(aw, b.x1 + 2) - x0, h = Math.min(ah, b.y1 + 2) - y0;
    const feld = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) feld[y * w + x] = A.region[(y0 + y) * aw + x0 + x] === F.id ? 1 : 0;
    return konturen(feld, w, h, 0.5).map((z) => z.map(([x, y]) => [x0 + x + 0.5, y0 + y + 0.5]));
  });
  return A.konturen;
}
function zeichneGliederung() {
  const A = S.A, c = $("gliederung"), k = 4;
  c.width = A.breite * k; c.height = A.hoehe * k;
  const ctx = c.getContext("2d");
  const ansicht = document.querySelector('input[name="ansicht"]:checked').value;
  if (ansicht === "original") { ctx.imageSmoothingQuality = "high"; ctx.drawImage(S.arbeit, 0, 0, c.width, c.height); }
  else {
    const bild = new ImageData(A.breite, A.hoehe);
    for (let i = 0; i < A.region.length; i++) bild.data.set([...A.flaechen[A.region[i]].rgb, 255], i * 4);
    const t = leinwand(A.breite, A.hoehe); t.getContext("2d").putImageData(bild, 0, 0);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(t, 0, 0, c.width, c.height);
  }
  // Grund schraffiert
  const grund = new Set(A.grund), teile = new Set(A.teile);
  const schraffur = leinwand(12, 12), sx = schraffur.getContext("2d");
  sx.strokeStyle = "rgba(255,255,255,0.55)"; sx.lineWidth = 2; sx.beginPath(); sx.moveTo(-2, 14); sx.lineTo(14, -2); sx.stroke();
  sx.strokeStyle = "rgba(0,0,0,0.25)"; sx.lineWidth = 1; sx.beginPath(); sx.moveTo(-2, 16); sx.lineTo(16, -2); sx.stroke();
  const K = regionKonturen(A);
  ctx.save(); ctx.scale(k, k);
  ctx.beginPath();
  for (const id of grund) for (const z of K[id]) { z.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
  ctx.save(); ctx.clip("evenodd"); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = ctx.createPattern(schraffur, "repeat"); ctx.fillRect(0, 0, c.width, c.height); ctx.restore();
  for (const F of A.flaechen) {
    const sel = teile.has(F.id);
    ctx.beginPath();
    for (const z of K[F.id]) { z.forEach(([x, y], j) => (j ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); }
    if (sel) { ctx.lineWidth = 5 / k; ctx.strokeStyle = PAPIER; ctx.stroke(); ctx.lineWidth = 2.2 / k; ctx.strokeStyle = TINTE; ctx.stroke(); }
    else { ctx.lineWidth = 1 / k; ctx.strokeStyle = "rgba(31,29,26,0.45)"; ctx.stroke(); }
  }
  ctx.restore();
  ctx.font = `600 ${Math.round(c.height / 34)}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const id of A.teile) {
    const p = punktIn(A, id), x = (p.x / A.seite) * c.width, y = p.y * c.height, t = `F${id + 1}`;
    const w = ctx.measureText(t).width + 10, h = c.height / 24;
    ctx.fillStyle = "rgba(244,241,234,0.9)"; ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = TINTE; ctx.fillText(t, x, y);
  }
}
/** ein Punkt sicher in der Fläche (nahe ihrem Schwerpunkt), normiert */
function punktIn(A, id) {
  const F = A.flaechen[id], { breite: w, hoehe: h } = A;
  let best = null, bd = Infinity;
  for (let y = F.bbox.y0; y <= F.bbox.y1; y++) for (let x = F.bbox.x0; x <= F.bbox.x1; x++) {
    if (A.region[y * w + x] !== id) continue;
    const d = ((x + 0.5) / h - F.cx) ** 2 + ((y + 0.5) / h - F.cy) ** 2;
    if (d < bd) { bd = d; best = { x: (x + 0.5) / h, y: (y + 0.5) / h }; }
  }
  return best ?? { x: F.cx, y: F.cy };
}
function zeigeTeile() {
  const A = S.A, box = $("teile"); box.textContent = "";
  const teile = new Set(A.teile);
  const kandidaten = A.flaechen.filter((F) => teile.has(F.id) || (F.rolle === "figur" && F.anteil >= A.einstellungen.mindestanteil * 0.75)).sort((a, b) => b.gewicht - a.gewicht).slice(0, 24).sort((a, b) => a.id - b.id);
  for (const F of kandidaten) {
    const b = document.createElement("button");
    b.type = "button"; b.setAttribute("aria-pressed", String(teile.has(F.id)));
    b.title = `${teile.has(F.id) ? "Figur" : "Keine Figur"} · ${Math.round(F.anteil * 1000) / 10} % des Bildes`;
    const i = document.createElement("i"); i.style.background = `rgb(${F.rgb.join(",")})`;
    b.append(i, `F${F.id + 1}`);
    b.addEventListener("click", () => { S.einstellungen.korrekturen.push({ ...punktIn(A, F.id), art: teile.has(F.id) ? "teil-" : "teil+" }); neuAnalysieren(); });
    box.append(b);
  }
}
function zeigeBefunde() {
  const box = $("befunde"); box.textContent = "";
  for (const b of S.A.befunde) {
    const a = document.createElement("article");
    a.className = `bg-befund${b.aktiv ? "" : " verworfen"}`;
    a.innerHTML = `<h3></h3><dl><dt>Befund</dt><dd class="befund"></dd><dt>Lesart</dt><dd class="lesart"></dd><dt>Eingriff</dt><dd class="eingriff"></dd></dl>`;
    a.querySelector("h3").textContent = b.thema;
    a.querySelector(".befund").textContent = b.befund;
    a.querySelector(".lesart").textContent = b.lesart;
    a.querySelector(".eingriff").textContent = b.eingriff;
    if (b.schaltbar) {
      const l = document.createElement("label"), c = document.createElement("input");
      c.type = "checkbox"; c.checked = b.aktiv; c.dataset.befund = b.id;
      c.addEventListener("change", () => {
        const v = new Set(S.einstellungen.verworfen);
        c.checked ? v.delete(b.id) : v.add(b.id);
        S.einstellungen.verworfen = [...v]; neuAnalysieren();
      });
      l.append(c, "Lesart verwenden");
      a.append(l);
    }
    box.append(a);
  }
}

// ---------- 3 · ORNA ----------
function ornaZiehen() {
  const z = ziehe(S.vorherigeKonstellation);
  S.vorherigeKonstellation = z.id;
  S.orna = { id: z.id, seed: z.seed, ableitung: ableiten(z.id, z.seed) };
  S.seed = z.seed;
  zeigeOrna(); zeigeStartwert();
}
function zeigeOrna() {
  const karte = $("orna-karte");
  karte.hidden = !S.orna; $("neu-ziehen").hidden = !S.orna;
  if (!S.orna) return;
  const a = S.orna.ableitung, R = REGELN[a.regel];
  karte.innerHTML = `<dl>
    <dt>Konstellation</dt><dd class="titel"></dd>
    <dt>Herkunft</dt><dd class="herkunft"></dd>
    <dt>Gedanke</dt><dd><blockquote class="satz"></blockquote><span class="bg-hinweis satz-quelle"></span></dd>
    <dt>Eingriff</dt><dd><strong class="regel"></strong><br><span class="eingriff"></span></dd>
    <dt>Passung</dt><dd class="passung"></dd>
    <dt>Kennzeichnung</dt><dd><span class="bg-marke">Gestalterische Interpretation</span> Die Übersetzung des Satzes in eine Bildregel ist eine Lesart dieser Anwendung, keine Aussage der genannten Personen und keine theoretische Herleitung.</dd>
    <dt>Ganzer Text</dt><dd><details><summary>anzeigen</summary><p class="text"></p><p class="frage"></p></details></dd>
  </dl>`;
  const k = a.konstellation;
  karte.querySelector(".titel").textContent = `${k.kuenstler} × ${k.theoretiker}`;
  karte.querySelector(".herkunft").textContent = a.herkunft;
  karte.querySelector(".satz").textContent = a.satz ? `«${a.satz}»` : "–";
  karte.querySelector(".satz-quelle").textContent = a.satz ? `Satz ${a.satzNr + 1} des Konstellationstexts, unverändert.` : "Kein Satz trägt ein Stichwort einer Regel.";
  karte.querySelector(".regel").textContent = `${a.regel}: ${R.name}`;
  karte.querySelector(".eingriff").textContent = R.eingriff;
  karte.querySelector(".passung").textContent = `${a.passung[0].toUpperCase()}${a.passung.slice(1)}. ${a.begruendung}`;
  const c = konstellation(k.id);
  karte.querySelector(".text").textContent = c.text;
  karte.querySelector(".frage").textContent = c.question;
}
function zeigeStartwert() { $("startwert").textContent = `Startwert ${S.seed}${S.orna ? " (aus der ORNA-Ziehung)" : ""}`; }

// ---------- 4 · Erzeugen ----------
async function erzeugen(stumm = false) {
  stoppe();
  $("status-erzeugen").textContent = "Material wird aus dem Bild geschnitten …";
  await new Promise((ok) => requestAnimationFrame(() => setTimeout(ok, 0)));
  const A = S.A;
  if (A.teile.length < 2) { $("status-erzeugen").textContent = "Es braucht mindestens zwei Teile. Wähle in der Vorschau weitere Flächen aus oder erhöhe die Zahl der Farbgruppen."; return; }
  const regel = S.orna?.ableitung.regel ?? null;
  const M = erzeugeLauf(A, { seed: S.seed, regel });
  const mat = baueMaterial(S.arbeit, A, M);
  const L = { M, mat, cache: new Map(), z: null, seed: S.seed, regel, schluessel: [], beschreibung: [], spurCache: {} };
  S.lauf = L;
  neustartZustand();
  L.schluessel = SCHLUESSEL.map((k) => zustandsSchluessel(zustandBei(k)));
  const keys = Object.fromEntries(STATIONEN.map((s) => [s.nr, zustandBei(SCHLUESSEL[s.nr])]));
  L.beschreibung = beschreibungen(M, keys);
  const [bw, bh] = mass(A.seite, BUEHNE_SEITE);
  const c = $("buehne"); c.width = bw; c.height = bh;
  const d = $("daten"); d.width = bw; d.height = bh;
  $("buehne-flaeche").style.width = `min(100%, calc(76vh * ${A.seite.toFixed(4)}))`;
  zeigeStandbilder(); zeigeMarken(); zeigeEreignisse(keys[6]);
  $("ergebnis").hidden = false; $("gegen-bilder").hidden = true;
  $("ablage").hidden = true; $("buehne-box").hidden = false;
  $("status-erzeugen").textContent = `Erzeugt: ${M.teile.length} Teile (${M.teile.filter((e) => e.kachel >= 0).length} davon Kacheln grosser Flächen), Regel ${regel ? `${regel} (${REGELN[regel].name})` : "keine (ohne ORNA)"}, Startwert ${S.seed}.`;
  zeichneBuehne();
  if (!stumm) {
    $("werkbank").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) spiele();
  }
}
function neustartZustand() {
  const L = S.lauf;
  L.cache.clear();
  L.z = anfang(L.M);
  L.cache.set(0, kopie(L.z));
}
function merke(z) {
  const L = S.lauf;
  if (z.schritt % MERKEN !== 0 && !SCHLUESSEL.includes(z.schritt)) return;
  if (L.cache.has(z.schritt)) {
    if (zustandsSchluessel(L.cache.get(z.schritt)) !== zustandsSchluessel(z)) S.abweichungen++;
  } else L.cache.set(z.schritt, kopie(z));
}
/** Zustand an einem Schritt: ab der nächsten Momentaufnahme vorwärts gerechnet */
function zustandBei(k) {
  const L = S.lauf;
  let von = 0;
  for (const s of L.cache.keys()) if (s <= k && s > von) von = s;
  const z = kopie(L.cache.get(von) ?? anfang(L.M));
  while (z.schritt < k) { schritt(L.M, z); merke(z); }
  return z;
}

// ---------- 5 · Ansehen ----------
function zeichneBuehne() {
  const L = S.lauf, c = $("buehne");
  zeichne(c.getContext("2d"), c.width, c.height, L.z, L.M, L.mat, L.spurCache);
  zeichneDaten();
  const n = L.z.schritt;
  $("zeitleiste").value = n;
  const st = n < SCHLUESSEL[0] ? 0 : STATIONEN.find((s) => n <= SCHLUESSEL[s.nr] && n > (SCHLUESSEL[s.nr - 1] ?? -1))?.nr ?? 6;
  const schl = SCHLUESSEL.indexOf(n);
  const name = $("stand-name");
  if (name.dataset.st !== String(st)) {
    name.dataset.st = st; name.textContent = "";
    const z = document.createElement("span"); z.className = "ziffer"; z.textContent = st;
    name.append(z, st === 0 ? "Eingangsbild" : STATIONEN[st].titel);
  }
  $("uhr").textContent = `${zahl(n / TAKT)} von ${GESAMT / TAKT} Sekunden${schl > 0 ? `, Standbild ${schl}` : ""}`;
  $("zeitleiste").style.setProperty("--fortschritt", `${(n / GESAMT) * 100}%`);
  for (const b of $("marken").children) b.setAttribute("aria-current", String(Number(b.dataset.nr) === schl));
  // im Kontaktbogen ist das Standbild markiert, dessen Zustand zuletzt erreicht wurde
  let zuletzt = 0;
  for (let k = 1; k < SCHLUESSEL.length; k++) if (n >= SCHLUESSEL[k]) zuletzt = k;
  for (const li of $("standbilder").children) li.setAttribute("aria-current", String(Number(li.dataset.nr) === zuletzt));
}
/** Datenebene über der Animation (nur in der Ansicht, nie in Standbild oder Video): Fadenkreuz je Teil, Namen der Figuren, Zähler */
function zeichneDaten() {
  const L = S.lauf, c = $("daten"), ctx = c.getContext("2d"), W = c.width, H = c.height, z = L.z;
  ctx.clearRect(0, 0, W, H);
  if ($("daten-knopf").getAttribute("aria-pressed") !== "true" || z.schritt < SCHLUESSEL[0]) return;
  const kreide = "rgba(235,230,220,", f = Math.max(1, H / 700);
  ctx.lineWidth = f; ctx.font = `${Math.round(11 * f)}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`; ctx.textBaseline = "top";
  for (const [i, t] of z.teile.entries()) {
    const e = L.M.teile[i], x = t.x * H, y = t.y * H, r = (e.figur ? 7 : 4) * f;
    ctx.strokeStyle = kreide + (e.figur ? "0.85)" : "0.45)");
    ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
    if (e.figur) { ctx.fillStyle = kreide + "0.85)"; ctx.fillText(e.kachel >= 0 ? `F${e.region + 1}.${e.kachel + 1}` : `F${e.region + 1}`, x + r + 3 * f, y + 2 * f); }
  }
  let feld = 0; for (const v of z.feldB) if (v > 0.2) feld++;
  const zeilen = [
    `t ${zahl(z.schritt / TAKT)} s  Schritt ${z.schritt}/${GESAMT}`,
    `Teile ${z.teile.length}  Spuren ${z.stempel.length}`,
    `Feld ${Math.round((feld / z.feldB.length) * 100)} %  Kopplungen ${z.federn.filter((k) => k.aktiv).length}/${z.federn.length}`,
  ];
  const zh = 15 * f, pad = 10 * f, breite = Math.max(...zeilen.map((t) => ctx.measureText(t).width)) + 2 * pad;
  ctx.fillStyle = "rgba(21,20,18,0.72)"; ctx.fillRect(pad, pad, breite, zeilen.length * zh + pad);
  ctx.fillStyle = kreide + "0.9)";
  zeilen.forEach((t, k) => ctx.fillText(t, 2 * pad, pad * 1.5 + k * zh));
}
function spiele() {
  const L = S.lauf;
  if (!L) return;
  if (L.z.schritt >= GESAMT) { neustartZustand(); }
  S.spielt = true;
  $("spielen").textContent = "Pause"; $("spielen").setAttribute("aria-pressed", "true");
  let start = performance.now(), basis = L.z.schritt;
  const tick = (jetzt) => {
    if (!S.spielt || S.lauf !== L) return;
    const soll = Math.min(GESAMT, basis + Math.floor(((jetzt - start) / 1000) * TAKT));
    let n = 0;
    while (L.z.schritt < soll && n < 8) { schritt(L.M, L.z); merke(L.z); n++; }
    if (L.z.schritt < soll) { start = jetzt; basis = L.z.schritt; }      // zu langsam: nicht springen, sondern nachziehen
    zeichneBuehne();
    if (L.z.schritt >= GESAMT) { stoppe(); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
function stoppe() {
  S.spielt = false;
  $("spielen").textContent = "Abspielen"; $("spielen").setAttribute("aria-pressed", "false");
}
function springe(k) {
  const L = S.lauf; if (!L) return;
  stoppe();
  L.z = zustandBei(Math.max(0, Math.min(GESAMT, k)));
  zeichneBuehne();
}
function zeigeMarken() {
  const box = $("marken"); box.textContent = "";
  for (const s of STATIONEN) {
    const b = document.createElement("button");
    b.type = "button"; b.dataset.nr = s.nr;
    const z = document.createElement("span"); z.className = "ziffer"; z.textContent = s.nr;
    const t = document.createElement("span"); t.className = "titel"; t.textContent = s.nr === 0 ? "Bild" : s.titel;
    b.append(z, t);
    b.style.left = `${(SCHLUESSEL[s.nr] / GESAMT) * 100}%`;
    b.setAttribute("aria-label", s.nr === 0 ? "Zum Eingangsbild mit Gliederung" : `Zu Schlüsselzustand ${s.nr}: ${s.titel}`);
    b.addEventListener("click", () => springe(SCHLUESSEL[s.nr]));
    box.append(b);
  }
}
function zeigeStandbilder() {
  const L = S.lauf, liste = $("standbilder"); liste.textContent = "";
  const [tw, th] = mass(L.M.seite, 640);
  for (const b of L.beschreibung) {
    const li = document.createElement("li"); li.dataset.nr = b.nr;
    const c = leinwand(tw, th);
    c.setAttribute("role", "img"); c.setAttribute("aria-label", `Standbild ${b.nr}: ${b.titel}`); c.dataset.standbild = b.nr;
    zeichne(c.getContext("2d"), tw, th, zustandBei(SCHLUESSEL[b.nr]), L.M, L.mat);
    c.addEventListener("click", () => springe(SCHLUESSEL[b.nr]));
    const h = document.createElement("h3");
    const ziffer = document.createElement("span"); ziffer.className = "ziffer"; ziffer.textContent = b.nr;
    h.append(ziffer, b.titel);
    const p = document.createElement("p"); p.textContent = b.text;
    const k = document.createElement("div"); k.className = "bg-knoepfe";
    const png = document.createElement("button"); png.type = "button"; png.className = "bg-knopf klein"; png.textContent = "PNG";
    png.setAttribute("aria-label", `Standbild ${b.nr} als PNG herunterladen`);
    png.addEventListener("click", async () => { const { blob, name } = await standbildPNG(b.nr); herunterladen(blob, name); });
    const zeig = document.createElement("button"); zeig.type = "button"; zeig.className = "bg-knopf klein leise"; zeig.textContent = "In der Animation";
    zeig.addEventListener("click", () => { springe(SCHLUESSEL[b.nr]); $("buehne").scrollIntoView({ block: "start" }); });
    k.append(png, zeig);
    li.append(c, h, p, k);
    liste.append(li);
  }
}
function zeigeEreignisse(z) {
  const ol = $("ereignis-liste"); ol.textContent = "";
  for (const e of z.ereignisse) { const li = document.createElement("li"); li.textContent = `${zahl(e.schritt / TAKT)} s – ${e.text}`; ol.append(li); }
}

// ---------- Export ----------
function exportMass() {
  const lang = Math.max(EXPORT_MIN, Math.min(ARBEIT_SEITE, Math.max(S.bild.breite, S.bild.hoehe)));
  return mass(S.lauf.M.seite, lang);
}
const dateiname = (rest) => `the-fictory-${slug(S.bild.name.replace(/\.[a-z0-9]+$/i, ""))}-${S.lauf.seed}-${rest}`;
/** Standbild in hoher Auflösung aus demselben Schlüsselzustand */
async function standbildPNG(nr) {
  const L = S.lauf, [w, h] = exportMass(), c = leinwand(w, h);
  zeichne(c.getContext("2d"), w, h, zustandBei(SCHLUESSEL[nr]), L.M, L.mat);
  return { blob: await alsBlob(c), name: dateiname(`${nr}-${slug(STATIONEN[nr].titel)}.png`), breite: w, hoehe: h };
}
function protokoll() {
  const L = S.lauf, A = S.A;
  return {
    anwendung: "The Fictory", version: VERSION, erstellt: new Date().toISOString(),
    hinweis: "Farb- und geometriebasierte Gliederung, kein semantisches Bildverständnis. Keine Zahlenbewertung nach dem Prüfraster. Eine ORNA-Ableitung ist eine gestalterische Interpretation.",
    bild: S.bild,
    analyse: { einstellungen: A.einstellungen, analysegroesse: [A.breite, A.hoehe], flaechen: A.flaechen.length, farbgruppen: A.zentren.length,
      teile: A.teile.map((id) => `F${id + 1}`), grund: A.grund.map((id) => `F${id + 1}`), nachbarschaftsregel: A.regel, hauptachseGrad: Math.round(A.hauptachse.verwendet * 180 / Math.PI),
      befunde: A.befunde.map(({ id, thema, befund, lesart, eingriff, aktiv }) => ({ id, thema, befund, lesart, eingriff, aktiv })) },
    orna: S.orna ? { konstellation: S.orna.id, redaktionelleNummer: S.orna.ableitung.konstellation.nummer, paar: `${S.orna.ableitung.konstellation.kuenstler} × ${S.orna.ableitung.konstellation.theoretiker}`,
      herkunft: S.orna.ableitung.herkunft, gedanke: S.orna.ableitung.satz, satzNummer: S.orna.ableitung.satzNr === null ? null : S.orna.ableitung.satzNr + 1,
      regel: S.orna.ableitung.regel, regelName: REGELN[S.orna.ableitung.regel].name, eingriff: REGELN[S.orna.ableitung.regel].eingriff,
      quelle: S.orna.ableitung.quelle, passung: S.orna.ableitung.passung, begruendung: S.orna.ableitung.begruendung, kennzeichnung: "gestalterische Interpretation" } : null,
    lauf: { startwert: L.seed, regel: L.regel, takt: TAKT, schritte: GESAMT, dauerSekunden: GESAMT / TAKT, schluesselSchritte: SCHLUESSEL,
      schluesselzustaende: STATIONEN.map((s) => ({ station: s.nr, titel: s.titel, schritt: SCHLUESSEL[s.nr], zustand: L.schluessel[s.nr] })) },
    standbilder: L.beschreibung.map((b) => ({ nr: b.nr, titel: b.titel, operation: b.text, schritt: SCHLUESSEL[b.nr], zustand: L.schluessel[b.nr], datei: dateiname(`${b.nr}-${slug(b.titel)}.png`) })),
    ereignisse: zustandBei(GESAMT).ereignisse,
    integrationen: integrationen(),
  };
}
function integrationen() {
  return {
    bildanalyse: "im Browser: k-Means in Lab, zusammenhängende Flächen, Sobel-Kanten, Momente; keine KI-Bildanalyse",
    orna: `Bestand von ORNA gelesen (${BESTAND} Konstellationen), Ziehung wie in ORNA`,
    jev: jevGueltig() ? `Tabelle aus dem Bau (${JEV.modell}, ${JEV.stand}, ${JEV.aufrufe} Aufrufe) für die Wahl der Regel; die Seite ruft jev nicht auf` : "keine gültige Tabelle; Zuordnung über Stichworte",
    externeDienste: "keine (kein Upload, keine Bildgenerierung)",
    video: videoTyp()?.mime ?? "nicht unterstützt",
  };
}
async function allePNG() {
  const L = S.lauf; if (!L) return;
  $("status-export").textContent = "Sechs Standbilder werden gerechnet …";
  const dateien = [];
  for (let nr = 1; nr <= 6; nr++) {
    const { blob, name } = await standbildPNG(nr);
    dateien.push({ name, bytes: new Uint8Array(await blob.arrayBuffer()) });
  }
  dateien.push({ name: dateiname("protokoll.json"), bytes: new TextEncoder().encode(JSON.stringify(protokoll(), null, 2)) });
  herunterladen(new Blob([zip(dateien)], { type: "application/zip" }), dateiname("standbilder.zip"));
  $("status-export").textContent = `ZIP mit sechs PNG (${exportMass().join(" × ")} px) und dem Protokoll.`;
}
function videoTyp() {
  if (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream) return null;
  for (const [mime, endung] of [["video/mp4;codecs=avc1.42E01E", "mp4"], ["video/mp4", "mp4"], ["video/webm;codecs=vp9", "webm"], ["video/webm;codecs=vp8", "webm"], ["video/webm", "webm"]])
    if (MediaRecorder.isTypeSupported(mime)) return { mime, endung };
  return null;
}
/** Video: ein frischer Lauf von Anfang an (derselbe Startwert, dieselben Regeln), in Echtzeit aufgenommen */
async function video() {
  const L = S.lauf, typ = videoTyp();
  if (!L) return;
  if (!typ) { $("status-export").textContent = "Dieser Browser kann keine Videos aus einer Zeichenfläche aufnehmen."; return; }
  const [w0, h0] = mass(L.M.seite, VIDEO_SEITE), w = w0 - (w0 % 2), h = h0 - (h0 % 2);
  const c = leinwand(w, h), ctx = c.getContext("2d");
  const strom = c.captureStream(0), spur = strom.getVideoTracks()[0];
  const rec = new MediaRecorder(strom, { mimeType: typ.mime, videoBitsPerSecond: 6_000_000 });
  const stuecke = [];
  rec.ondataavailable = (e) => { if (e.data.size) stuecke.push(e.data); };
  const fertig = new Promise((ok) => { rec.onstop = ok; });
  const knopf = $("video"); knopf.disabled = true;
  const fort = $("fortschritt"); fort.hidden = false; fort.value = 0;
  $("status-export").textContent = `Video wird aufgenommen (${GESAMT / TAKT} s in Echtzeit) …`;
  const z = anfang(L.M), spurCache = {};
  zeichne(ctx, w, h, z, L.M, L.mat, spurCache);
  rec.start(1000);
  const t0 = performance.now(), nachlauf = TAKT;          // eine Sekunde Halt am Ende
  for (let f = 0; f <= GESAMT + nachlauf; f++) {
    if (f > 0 && z.schritt < GESAMT) schritt(L.M, z);
    zeichne(ctx, w, h, z, L.M, L.mat, spurCache);
    spur.requestFrame?.();
    fort.value = f / (GESAMT + nachlauf);
    const warte = t0 + ((f + 1) * 1000) / TAKT - performance.now();
    await new Promise((ok) => setTimeout(ok, Math.max(0, warte)));
  }
  rec.stop(); await fertig;
  const blob = new Blob(stuecke, { type: typ.mime.split(";")[0] });
  herunterladen(blob, dateiname(`animation.${typ.endung}`));
  knopf.disabled = false; fort.hidden = true;
  $("status-export").textContent = `Video: ${typ.endung.toUpperCase()} (${typ.mime}), ${w} × ${h} px, ${GESAMT / TAKT} s und eine Sekunde Halt, ${(blob.size / 1e6).toFixed(1)} MB.`;
  return blob;
}
async function protokollLaden(datei) {
  try {
    const p = JSON.parse(await datei.text());
    if (!["The Fictory", "Das Bild geht weiter"].includes(p.anwendung)) throw new Error("kein Protokoll dieser Anwendung");
    if (p.bild?.sha256 !== S.bild?.sha256) { $("status-export").textContent = `Das Protokoll gehört zu einem anderen Bild (${p.bild?.name ?? "?"}). Lade zuerst dieses Bild.`; return; }
    S.einstellungen = { ...p.analyse.einstellungen };
    $("farben").value = S.einstellungen.farben; $("mindest").value = Math.round(S.einstellungen.mindestanteil * 1000); $("regel").value = S.einstellungen.regel ?? "";
    zeigeRegler();
    S.seed = p.lauf.startwert;
    if (p.orna) {
      S.orna = { id: p.orna.konstellation, seed: p.lauf.startwert, ableitung: ableiten(p.orna.konstellation, p.lauf.startwert) };
      document.querySelector('input[name="orna"][value="ziehen"]').checked = true;
    } else { S.orna = null; document.querySelector('input[name="orna"][value="ohne"]').checked = true; }
    neuAnalysieren(); zeigeOrna(); zeigeStartwert();
    await erzeugen(true);
    const gleich = S.lauf.schluessel.every((s, i) => s === p.lauf.schluesselzustaende[i]?.zustand);
    $("status-export").textContent = gleich ? "Lauf aus dem Protokoll wiederholt: alle sieben Schlüsselzustände stimmen überein." : "Lauf wiederholt, aber die Schlüsselzustände weichen ab (andere Fassung der Anwendung?).";
  } catch (e) { $("status-export").textContent = `Protokoll nicht lesbar: ${e.message}`; }
}
function gegenprobe() {
  const L = S.lauf; if (!L) return;
  const M2 = erzeugeLauf(S.A, { seed: L.seed, regel: L.regel, neutralisiere: 4 });
  const mit = zustandBei(GESAMT), ohne = bis(M2, GESAMT);
  const [w, h] = mass(L.M.seite, 640);
  for (const [id, z] of [["gegen-mit", mit], ["gegen-ohne", ohne]]) { const c = $(id); c.width = w; c.height = h; zeichne(c.getContext("2d"), w, h, z, L.M, L.mat); }
  const verschiebung = mit.teile.reduce((s, t, i) => s + Math.hypot(t.x - ohne.teile[i].x, t.y - ohne.teile[i].y), 0) / mit.teile.length;
  const gerissen = (z) => z.federn.filter((f) => !f.aktiv).length;
  $("gegen-mit-text").textContent = `Mit wirksamen Spuren (Standbild 6). Gerissene Kopplungen: ${gerissen(mit)}.`;
  $("gegen-ohne-text").textContent = `Spurenfeld vor Schritt 4 gelöscht. Gerissene Kopplungen: ${gerissen(ohne)}. Die Teile stehen im Mittel ${zahl(verschiebung * 100)} % der Bildhöhe anders.`;
  $("gegen-bilder").hidden = false;
  return { verschiebung, mit: zustandsSchluessel(mit), ohne: zustandsSchluessel(ohne) };
}

// ---------- Verdrahtung ----------
function zeigeRegler() {
  $("farben-wert").textContent = $("farben").value;
  $("mindest-wert").textContent = `${zahl(Number($("mindest").value) / 10)} %`;
}
$("datei").addEventListener("change", (e) => { const f = e.target.files?.[0]; if (f) ladeDatei(f); });
$("beispiel").addEventListener("click", async () => {
  const r = await fetch("beispiel.jpg");
  ladeDatei(new File([await r.blob()], "beispiel.jpg", { type: "image/jpeg" }));
});
// Ein Bild darf überall auf die Werkbank fallen
const ablage = $("ablage"), werkbank = $("werkbank");
werkbank.addEventListener("dragover", (e) => { e.preventDefault(); ablage.classList.add("ueber"); });
werkbank.addEventListener("dragleave", () => ablage.classList.remove("ueber"));
werkbank.addEventListener("drop", (e) => { e.preventDefault(); ablage.classList.remove("ueber"); const f = e.dataTransfer?.files?.[0]; if (f && f.type.startsWith("image/")) ladeDatei(f); });
$("gliederung").addEventListener("click", (e) => {
  const c = e.currentTarget, r = c.getBoundingClientRect(), A = S.A;
  const p = { x: ((e.clientX - r.left) / r.width) * A.seite, y: (e.clientY - r.top) / r.height };
  const id = A.region[Math.min(A.hoehe - 1, Math.floor(p.y * A.hoehe)) * A.breite + Math.min(A.breite - 1, Math.floor(p.x * A.hoehe))];
  const art = document.querySelector('input[name="tipp"]:checked').value === "grund"
    ? (A.flaechen[id].rolle === "grund" ? "figur" : "grund")
    : (A.teile.includes(id) ? "teil-" : "teil+");
  S.einstellungen.korrekturen.push({ ...p, art });
  neuAnalysieren();
});
for (const r of document.querySelectorAll('input[name="ansicht"]')) r.addEventListener("change", zeichneGliederung);
$("farben").addEventListener("input", zeigeRegler);
$("mindest").addEventListener("input", zeigeRegler);
$("farben").addEventListener("change", () => { S.einstellungen.farben = Number($("farben").value); neuAnalysieren(); });
$("mindest").addEventListener("change", () => { S.einstellungen.mindestanteil = Number($("mindest").value) / 1000; neuAnalysieren(); });
$("regel").addEventListener("change", () => { S.einstellungen.regel = $("regel").value || null; neuAnalysieren(); });
$("zuruecksetzen").addEventListener("click", () => { S.einstellungen.korrekturen = []; S.einstellungen.verworfen = []; neuAnalysieren(); });
for (const r of document.querySelectorAll('input[name="orna"]')) r.addEventListener("change", () => {
  if (r.value === "ziehen" && r.checked) ornaZiehen();
  if (r.value === "ohne" && r.checked) { S.orna = null; S.seed = neuerStartwert(); zeigeOrna(); zeigeStartwert(); }
});
$("neu-ziehen").addEventListener("click", ornaZiehen);
$("neuer-startwert").addEventListener("click", () => {
  if (S.orna) ornaZiehen(); else { S.seed = neuerStartwert(); zeigeStartwert(); }
});
$("erzeugen").addEventListener("click", () => erzeugen());
$("spielen").addEventListener("click", () => (S.spielt ? stoppe() : spiele()));
$("zeitleiste").addEventListener("input", (e) => springe(Number(e.target.value)));
$("neustart").addEventListener("click", () => { if (!S.lauf) return; stoppe(); neustartZustand(); zeichneBuehne(); spiele(); });
$("alle-png").addEventListener("click", allePNG);
$("video").addEventListener("click", video);
$("protokoll").addEventListener("click", () => herunterladen(new Blob([JSON.stringify(protokoll(), null, 2)], { type: "application/json" }), dateiname("protokoll.json")));
$("protokoll-laden").addEventListener("change", (e) => { const f = e.target.files?.[0]; if (f) protokollLaden(f); e.target.value = ""; });
$("gegenprobe").addEventListener("click", gegenprobe);
$("daten-knopf").addEventListener("click", (e) => { const an = e.currentTarget.getAttribute("aria-pressed") !== "true"; e.currentTarget.setAttribute("aria-pressed", String(an)); if (S.lauf) zeichneDaten(); });
$("anderes-bild").addEventListener("click", () => { stoppe(); $("datei").click(); });

const vt = videoTyp();
if (!vt) { $("video").disabled = true; $("video").title = "Dieser Browser kann keine Videos aus einer Zeichenfläche aufnehmen."; }
else $("video").textContent = `Animation als ${vt.endung.toUpperCase()}`;
$("integrationen").textContent = `Tatsächlich aktiv: Bildanalyse und Prozess laufen nur in diesem Browser (keine Übertragung, keine Bildgenerierung). ORNA: der Bestand mit ${BESTAND} Konstellationen wird gelesen, gezogen wird wie in ORNA. jev: ${jevGueltig() ? `wählte beim Bauen (${JEV.stand}, ${JEV.modell}) für jede Konstellation Regel und Satz vor; diese Seite ruft jev nicht auf` : "keine gültige Tabelle, die Regel folgt Stichworten im Text"}. Video: ${vt ? vt.mime : "in diesem Browser nicht verfügbar"}. Feld: ${feldMitShader() ? "WebGL-Shader" : "ohne WebGL, einfache Darstellung"}.`;
zeigeRegler();

// für die Browser-Tests (tests/fictory.e2e.mjs)
window.fictoryTest = { S, zustandBei, zustandsSchluessel, standbildPNG, video, gegenprobe, protokoll, protokollLaden, springe, SCHLUESSEL, GESAMT,
  bereit: true, abweichungen: () => S.abweichungen };
document.documentElement.classList.add("fictory-bereit");
