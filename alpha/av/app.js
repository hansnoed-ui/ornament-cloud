// ORNAMENT AV STUDIO 0.1 (Probe, Etappe A/B aus av-studio.md) – Oberfläche.
// Der Bildmotor ist der von /animations (WebGL 2, 23 Effekte, bis zu drei Ebenen), über einen Adapter benutzt: Die Partitur baut je
// Filmbild einen Stapel, dessen Reglerwerte aus den Steuersignalen des Composer-Exports kommen; die Bildzeit folgt den Bildbrüchen.
// Vorschau in Echtzeit mit dem Ton (AudioContext), Export Bild für Bild mit fester Zeit (WebCodecs, H.264) und der Summe als AAC.

import { motorErstellen } from "../../animations/motor.js?v=34";
import { videoZerlegen } from "../../animations/video.js?v=34";
import { EFFEKTE } from "../../animations/effekte.js?v=34";
import { leseZip } from "../lab/kern/archiv.js";
import { wavSpuren } from "../lab/kern/klangwerk.js";
import { tonKodieren, mp4Schreiber } from "../phorma-iii/tonspur.js";
import { signaleAus, bildzeit, wert, GRUPPEN } from "./kern/steuerung.js";
import { FAMILIEN, stapelBei } from "./kern/partitur.js";

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...k) => { const e = Object.assign(document.createElement(tag), props); e.append(...k); return e; };
const atmen = () => new Promise((ok) => setTimeout(ok, 0));
let meldeZeit = 0;
const melde = (text, dauer = 4000) => { const m = $("meldung"); m.textContent = text; m.hidden = false; clearTimeout(meldeZeit); if (dauer) meldeZeit = setTimeout(() => (m.hidden = true), dauer); };

const z = { motor: null, sig: null, musik: null, buffer: null, ctx: null, quelle: null, start: 0, laeuft: false, pos: 0, familie: "organisch", material: false, materialName: "" };

try { z.motor = motorErstellen(); } catch (f) { melde(`WebGL 2 ist hier nicht verfügbar: ${f.message}. Das Studio braucht einen Browser mit WebGL 2 (Chrome, Edge, Firefox, Safari 15+).`, 0); }

// ---------- Musik ----------
async function musikLaden(datei) {
  melde("lese den Export …", 0); await atmen();
  const dateien = await leseZip(new Uint8Array(await datei.arrayBuffer()));
  const jsonName = [...dateien.keys()].find((n) => n.endsWith(".composer.json")), summeName = [...dateien.keys()].find((n) => /-summe\.wav$/.test(n));
  if (!jsonName || !summeName) throw new Error("kein Composer-Export (es fehlen *.composer.json oder *-summe.wav)");
  const projekt = JSON.parse(new TextDecoder().decode(dateien.get(jsonName)));
  const summe = wavSpuren(dateien.get(summeName)), stems = new Map();
  for (const [n, b] of dateien) if (n.startsWith("stems/") && n.endsWith(".wav")) stems.set(n.slice(6, -4), wavSpuren(b).spuren);
  melde("rechne die Steuersignale …", 0); await atmen();
  z.sig = signaleAus({ projekt, summe: summe.spuren, rate: summe.rate, stems }, 30);
  z.musik = { projekt, rate: summe.rate, kanaele: summe.spuren, name: datei.name.replace(/(-export)?\.zip$/i, "") };
  z.ctx ??= new AudioContext({ sampleRate: summe.rate });
  z.buffer = z.ctx.createBuffer(2, summe.spuren[0].length, summe.rate);
  z.buffer.copyToChannel(summe.spuren[0], 0); z.buffer.copyToChannel(summe.spuren[1] ?? summe.spuren[0], 1);
  const gruppen = GRUPPEN.filter((g) => g !== "summe" && z.sig.einsaetze[g] !== undefined && z.sig.huelle[g].some((x) => x > 0));
  $("musikInfo").textContent = `${projekt.titel ?? z.musik.name}: ${z.sig.dauer.toFixed(1)} s, ${projekt.tempo?.bpm ?? "?"} BPM, ${z.sig.spuren.length} Stems (${gruppen.join(", ")}), ${z.sig.abschnitte.length} Abschnitte, ${z.sig.brueche.length} Bildbrüche`;
  bereit(); zeitleisteZeichnen();
}

// ---------- Material ----------
async function materialLaden(datei) {
  if (!z.motor) return;
  if (datei.type.startsWith("image/")) {
    const url = URL.createObjectURL(datei); await z.motor.bildLaden("material", url);
    $("materialInfo").textContent = `${datei.name} (Bild)`;
  } else {
    melde("zerlege das Video (läuft einmal in Echtzeit ab) …", 0);
    const sp = await videoZerlegen(datei, { px: 1280, sek: 20, fortschritt: (p) => melde(`zerlege das Video … ${Math.round(p * 100)} %`, 0) });
    if (!sp) return;
    z.motor.videoLaden("material", sp);
    $("materialInfo").textContent = `${datei.name}: ${sp.b} × ${sp.h}, ${(sp.n / sp.fps).toFixed(1)} s als Schleife`;
  }
  z.material = true; z.materialName = datei.name; melde("Material geladen", 2000); bereit(); zeichneBild(z.pos / (z.sig?.fps ?? 30));
}

function bereit() {
  const ok = !!(z.sig && z.material && z.motor);
  $("spielen").disabled = !ok; $("exportieren").disabled = !ok; $("zuordnung").hidden = !z.sig;
  zuordnungZeigen();
}

// ---------- Partitur ----------
function familienAufbauen() {
  $("familien").replaceChildren(...Object.entries(FAMILIEN).map(([k, f]) => {
    const b = el("button", { className: "knopf", type: "button" }, el("span", { textContent: f.name }), el("small", { textContent: f.beschreibung }));
    b.setAttribute("aria-pressed", String(k === z.familie));
    b.onclick = () => { z.familie = k; familienAufbauen(); zuordnungZeigen(); if (!z.laeuft) zeichneBild(z.pos); };
    return b;
  }));
}
function zuordnungZeigen() {
  const f = FAMILIEN[z.familie], t = $("zuordnungTabelle");
  t.replaceChildren(el("tr", {}, ...["Signal", "Ebene", "Effekt", "Regler", "Bereich"].map((x) => el("th", { textContent: x }))),
    ...f.zuordnungen.map((m) => { const e = f.ebenen[m.ebene], def = EFFEKTE[e.effekt]; return el("tr", {}, el("td", { textContent: m.quelle.replace("huelle.", "Hüllkurve ").replace("impuls.", "Impuls ") + (m.art === "ruhe" ? " (Gegenbewegung)" : "") }),
      el("td", { textContent: String(m.ebene + 1) }), el("td", { textContent: def?.name ?? e.effekt }), el("td", { textContent: m.ziel === "deck" ? "Deckkraft" : def?.regler[m.ziel]?.name ?? m.ziel }), el("td", { textContent: `${m.von} → ${m.bis}` })); }));
}

// ---------- Zeichnen ----------
const vorschau = $("vorschau"), vctx = vorschau.getContext("2d", { alpha: false });
function format() { const [b, h] = $("format").value.split("x").map(Number); return { b, h }; }
function vorschauGroesse() { const { b, h } = format(), s = Math.min(960 / b, 540 / h, 1); vorschau.width = Math.round(b * s); vorschau.height = Math.round(h * s); }

/** ein Bild zur Musikzeit t in b × h auf ctx: Motor zeichnen, dann Licht und Dunkel des Ganzen */
function bildRechnen(t, b, h, ctx) {
  const bz = bildzeit(t, z.sig.brueche), r = stapelBei(t, FAMILIEN[z.familie], z.sig, { seed: Number($("seed").value) || 1, dunkel: bz.dunkel });
  z.motor.zeichnen(r.stapel, Math.max(0, bz.t), b, h);
  ctx.drawImage(z.motor.leinwand, 0, 0, b, h);
  const ende = Math.min(1, Math.max(0, (z.sig.dauer - t) / 1.5));   // am Schluss in Schwarz
  const licht = r.licht * ende * (1 - bz.dunkel);
  if (licht < 1) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, 1 - licht)})`; ctx.fillRect(0, 0, b, h); }
  else if (licht > 1) { ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = `rgba(255,250,240,${Math.min(0.5, (licht - 1) * 0.6)})`; ctx.fillRect(0, 0, b, h); ctx.globalCompositeOperation = "source-over"; }
  return { r, bz };
}
function zeichneBild(t) {
  if (!z.sig || !z.material || !z.motor) return;
  const { r } = bildRechnen(t, vorschau.width, vorschau.height, vctx);
  $("uhr").textContent = `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0").replace(".", ",")}`;
  $("abschnitt").textContent = r.abschnitt?.name ?? "";
  const f = z.sig.fps, w = (g) => wert(z.sig.huelle[g], t, f).toFixed(2).replace("0.", ",");
  $("signale").textContent = `Kick ${w("kick")} · Bass ${w("bass")} · Pad ${w("pad")} · Natur ${w("natur")} · Höhen ${w("oben")}`;
  strichZeichnen(t);
}

// ---------- Zeitleiste ----------
const leiste = $("zeitleiste"), lctx = leiste.getContext("2d");
let leisteBild = null;
function zeitleisteZeichnen() {
  if (!z.sig) return;
  leiste.width = leiste.clientWidth * devicePixelRatio; leiste.height = 90 * devicePixelRatio;
  const W = leiste.width, H = leiste.height, s = z.sig;
  lctx.fillStyle = "#000"; lctx.fillRect(0, 0, W, H);
  for (const [i, a] of s.abschnitte.entries()) { const x = (a.a / s.dauer) * W; lctx.fillStyle = i % 2 ? "#0c0d12" : "#11131a"; lctx.fillRect(x, 0, ((a.b - a.a) / s.dauer) * W, H); lctx.fillStyle = "rgba(233,236,242,.55)"; lctx.font = `${10 * devicePixelRatio}px sans-serif`; lctx.fillText(a.name, x + 4, 12 * devicePixelRatio); }
  const kurve = (sig, farbe, y0, hh) => { lctx.strokeStyle = farbe; lctx.beginPath(); for (let x = 0; x < W; x++) { const v = sig[Math.floor((x / W) * sig.length)] ?? 0; const y = y0 - v * hh; x ? lctx.lineTo(x, y) : lctx.moveTo(x, y); } lctx.stroke(); };
  kurve(s.huelle.pad, "rgba(143,176,255,.8)", H * 0.95, H * 0.7); kurve(s.huelle.bass, "rgba(240,160,112,.8)", H * 0.95, H * 0.7);
  lctx.fillStyle = "#c9ff3d"; for (const t of s.einsaetze.kick) lctx.fillRect((t / s.dauer) * W, H * 0.82, 1, H * 0.13);
  lctx.fillStyle = "rgba(255,90,90,.5)"; for (const b of s.brueche) lctx.fillRect((b.a / s.dauer) * W, 0, Math.max(2, ((b.b - b.a) / s.dauer) * W), H * 0.18);
  leisteBild = lctx.getImageData(0, 0, W, H);
}
function strichZeichnen(t) { if (!leisteBild) return; lctx.putImageData(leisteBild, 0, 0); const x = (t / z.sig.dauer) * leiste.width; lctx.fillStyle = "#fff"; lctx.fillRect(x, 0, 1.5 * devicePixelRatio, leiste.height); }
leiste.onclick = (e) => { if (!z.sig) return; const r = leiste.getBoundingClientRect(), t = ((e.clientX - r.left) / r.width) * z.sig.dauer; if (z.laeuft) { stoppen(); z.pos = t; spielen(); } else { z.pos = t; zeichneBild(t); } };

// ---------- Abspielen ----------
function spielen() {
  if (z.laeuft) { stoppen(); return; }
  z.ctx.resume(); z.quelle = z.ctx.createBufferSource(); z.quelle.buffer = z.buffer; z.quelle.connect(z.ctx.destination);
  z.start = z.ctx.currentTime - z.pos; z.quelle.start(0, z.pos); z.laeuft = true; $("spielen").textContent = "■ Anhalten";
  z.quelle.onended = () => { if (z.laeuft) { z.laeuft = false; $("spielen").textContent = "▶ Abspielen"; } };
  const schleife = () => { if (!z.laeuft) return; z.pos = Math.min(z.sig.dauer, z.ctx.currentTime - z.start); zeichneBild(z.pos); requestAnimationFrame(schleife); };
  requestAnimationFrame(schleife);
}
function stoppen() { z.laeuft = false; try { z.quelle?.stop(); } catch {} $("spielen").textContent = "▶ Abspielen"; }

// ---------- Export ----------
async function konfiguration(b, h) {
  for (const codec of ["avc1.640033", "avc1.640028", "avc1.4d0028"]) {
    const cfg = { codec, width: b, height: h, bitrate: b * h > 3e6 ? 24_000_000 : 12_000_000, framerate: 30, avc: { format: "avc" }, latencyMode: "quality" };
    try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg; } catch { /* nächster */ }
  }
  return null;
}
/** der Master als AAC mit 320 kbit/s (Ziel aus dem Masterprompt), sonst null (dann tonKodieren aus PHORMA III mit 256/192 kbit/s) */
async function tonAac(buffer) {
  if (typeof AudioEncoder === "undefined") return null;
  const rate = buffer.sampleRate, kanaele = Math.min(2, buffer.numberOfChannels), cfg = { codec: "mp4a.40.2", sampleRate: rate, numberOfChannels: kanaele, bitrate: 320_000 };
  try { if (!(await AudioEncoder.isConfigSupported(cfg)).supported) return null; } catch { return null; }
  const proben = []; let meta = null, fehler = null;
  const enc = new AudioEncoder({ output: (chunk, m) => { if (m?.decoderConfig && !meta) meta = m; const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); proben.push({ daten: d, key: chunk.type === "key", zeit: chunk.timestamp, dauer: chunk.duration ?? 0 }); }, error: (e) => { fehler = e; } });
  enc.configure(cfg);
  const kan = Array.from({ length: kanaele }, (_, k) => buffer.getChannelData(k)), block = 4096;
  for (let i0 = 0; i0 < buffer.length; i0 += block) {
    const m = Math.min(block, buffer.length - i0), d = new Float32Array(m * kanaele);
    for (let k = 0; k < kanaele; k++) d.set(kan[k].subarray(i0, i0 + m), k * m);
    const a = new AudioData({ format: "f32-planar", sampleRate: rate, numberOfFrames: m, numberOfChannels: kanaele, timestamp: Math.round((i0 / rate) * 1e6), data: d });
    enc.encode(a); a.close();
  }
  await enc.flush(); enc.close();
  if (fehler) return null;
  return { proben, meta, codec: "aac", rate, kanaele, bitrate: 320 };
}
async function exportieren() {
  if (typeof VideoEncoder === "undefined") { melde("Dieser Browser kann keine Videos kodieren (WebCodecs fehlt). Chrome oder Edge am Rechner gehen.", 9000); return; }
  if (z.laeuft) stoppen();
  const { b, h } = format(), fps = 30, n = Math.round(z.sig.dauer * fps), cfg = await konfiguration(b, h);
  if (!cfg) { melde(`H.264 in ${b} × ${h} kann dieser Browser nicht kodieren.`, 9000); return; }
  melde("kodiere den Ton (AAC) …", 0);
  const ton = (await tonAac(z.buffer)) ?? (await tonKodieren(z.buffer, z.sig.dauer, { ausblenden: 0 }));   // der Master unverändert, ohne Ausblenden
  const schreiber = mp4Schreiber({ breite: b, hoehe: h, fps, codec: cfg.codec, bilder: n, ton });
  const c = new OffscreenCanvas(b, h), cx = c.getContext("2d", { alpha: false });
  let fehler = null, avcC = null;
  const enc = new VideoEncoder({ output: (chunk, meta) => { if (meta?.decoderConfig?.description) avcC ??= new Uint8Array(meta.decoderConfig.description); const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); schreiber.bild(d, chunk.type === "key", chunk.timestamp, avcC); }, error: (e) => { fehler = e; } });
  enc.configure(cfg);
  const st0 = stapelBei(0, FAMILIEN[z.familie], z.sig, {}).stapel;
  await z.motor.vorbereiten?.(st0, b, h);
  const t0 = performance.now();
  for (let i = 0; i < n; i++) {
    if (fehler) throw fehler;
    const t = i / fps, bz = bildzeit(t, z.sig.brueche);
    await z.motor.videoBereit?.(stapelBei(t, FAMILIEN[z.familie], z.sig, {}).stapel, Math.max(0, bz.t));   // das genaue Einzelbild des Materials
    bildRechnen(t, b, h, cx);
    const frame = new VideoFrame(c, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
    enc.encode(frame, { keyFrame: i % (fps * 2) === 0 }); frame.close();
    while (enc.encodeQueueSize > 4) await new Promise((ok) => setTimeout(ok, 4));
    if (i % 15 === 0) { const s = (performance.now() - t0) / 1000; melde(`rendere ${b} × ${h}: ${i} / ${n} Bilder (${Math.round((i / n) * 100)} %, ${(i / Math.max(1e-3, s)).toFixed(1)} Bilder/s)`, 0); await atmen(); }
  }
  await enc.flush(); enc.close();
  if (fehler) throw fehler;
  const blob = schreiber.fertig(), a = el("a", { href: URL.createObjectURL(blob), download: `${z.musik.name}-${FAMILIEN[z.familie].name.toLowerCase().replace(/\s+/g, "-")}-${b}x${h}.mp4` });
  document.body.append(a); a.click(); a.remove();
  melde(`fertig: ${(blob.size / 1e6).toFixed(1)} MB, ${n} Bilder, Ton ${ton ? `${ton.codec.toUpperCase()} ${ton.bitrate ?? "≤256"} kbit/s, ${ton.kanaele} Kanäle` : "fehlt (Browser kann nicht kodieren)"}`, 10000);
  return blob;
}

// ---------- Ereignisse ----------
$("musik").onchange = (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) musikLaden(f).catch((x) => melde(`Musik: ${x.message}`, 9000)); };
$("material").onchange = (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) materialLaden(f).catch((x) => melde(`Material: ${x.message}`, 9000)); };
$("spielen").onclick = spielen;
$("exportieren").onclick = () => exportieren().catch((x) => melde(`Export: ${x.message}`, 9000));
$("format").onchange = () => { vorschauGroesse(); zeichneBild(z.pos); };
$("seed").onchange = () => zeichneBild(z.pos);
addEventListener("keydown", (e) => { if (e.key === " " && !e.target.closest?.("input, select") && !$("spielen").disabled) { e.preventDefault(); spielen(); } });
addEventListener("resize", () => { zeitleisteZeichnen(); strichZeichnen(z.pos); });
familienAufbauen(); vorschauGroesse();
// für Tests: die Zustände von aussen erreichbar
globalThis.__av = { z, exportieren };
