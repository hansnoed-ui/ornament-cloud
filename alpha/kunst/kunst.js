// «Kunst» – Oberfläche: Liste, Notiz mit Querverweisen, Schlagwortseiten, lokaler Graph, Markieren (bis 4), Werkbank mit Montage.
// Adressen: #b=<Kennung> öffnet einen Beitrag, #w=<Schlagwort> eine Schlagwortseite. Markierte Beiträge und der Entwurf bleiben auf dem Gerät.
import { BEITRAEGE } from "./beitraege.js?v=2";
import { JEV } from "./jev.js?v=2";
import { stamm } from "../drittes-rad/engine.js";
import {
  MAX_MARKIERT, bestand, schlagwoerterVon, verwandte, montage, zuordnung, adresse, titelBegegnung, nameVon, norm,
} from "./verknuepfung.js?v=2";

const $ = (s) => document.querySelector(s);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const speicher = {
  lies(k, ersatz) { try { const v = localStorage.getItem("ornament.kunst." + k); return v === null ? ersatz : JSON.parse(v); } catch (e) { return ersatz; } },
  schreib(k, v) { try { localStorage.setItem("ornament.kunst." + k, JSON.stringify(v)); } catch (e) {} },
};

const B = bestand(BEITRAEGE);
const N = BEITRAEGE.length;
const datum = (d) => { const [j, m, t] = String(d).split("-"); return t ? `${+t}.${+m}.${j}` : d; };
const titel = (b) => { const z = (b.t.trim().replace(/^(?:#[\p{L}\p{N}_]+[\s,]*)+/u, "").trim() || b.t.trim()).split(/\n|(?<=[.!?…])\s/)[0].replace(/\s+/g, " "); return z.length > 72 ? z.slice(0, 70).trimEnd() + " …" : z || "(ohne Text)"; };
const wortName = (st) => B.name(st);

let zustand = { reiter: "beitraege", jahr: null, suche: "", offen: null, wort: null };
let markiert = speicher.lies("markiert", []).filter((i) => B.nr.has(i)).slice(0, MAX_MARKIERT);
let seed = speicher.lies("seed", 1);

// ---------- Modus ----------
$("#modus").addEventListener("click", () => {
  const dunkelJetzt = getComputedStyle(document.documentElement).colorScheme.includes("dark");
  const neu = dunkelJetzt ? "hell" : "dunkel";
  document.documentElement.dataset.modus = neu;
  try { localStorage.setItem("ornament.kunst.modus", neu); } catch (e) {}
  zeichneGraph();
});

// ---------- Liste ----------
const jahre = [...new Set(BEITRAEGE.map((b) => b.d.slice(0, 4)))].sort();
function jahresKnoepfe() {
  $("#jahre").innerHTML = [null, ...jahre].map((j) => `<button type="button" data-jahr="${j ?? ""}" aria-pressed="${zustand.jahr === j}">${j ?? "Alle"}</button>`).join("");
}
$("#jahre").addEventListener("click", (e) => { const k = e.target.closest("button"); if (!k) return; zustand.jahr = k.dataset.jahr || null; jahresKnoepfe(); zeichneListe(); });

function trifft(b, q) { if (!q) return true; const t = norm(b.t); return q.split(/\s+/).every((w) => t.includes(w)); }
function zeichneListe() {
  const q = norm(zustand.suche.trim());
  if (zustand.reiter === "beitraege") {
    const treffer = BEITRAEGE.map((b, i) => [b, i]).filter(([b]) => (!zustand.jahr || b.d.startsWith(zustand.jahr)) && trifft(b, q));
    $("#liste").innerHTML = treffer.map(([b]) => {
      const m = markiert.includes(b.i);
      const voll = !m && markiert.length >= MAX_MARKIERT;
      return `<li><button class="marker" type="button" data-markieren="${esc(b.i)}" aria-pressed="${m}" ${voll ? "disabled" : ""} aria-label="${m ? "Markierung lösen" : "Markieren"}">${m ? "ABCD"[markiert.indexOf(b.i)] : ""}</button>` +
        `<a href="#b=${encodeURIComponent(b.i)}" ${zustand.offen === b.i ? 'aria-current="page"' : ""}>${esc(titel(b))}</a><span class="datum">${b.d.slice(0, 4)}</span></li>`;
    }).join("");
    $("#anzahl").textContent = `${treffer.length} von ${N} Beiträgen`;
  } else {
    let woerter = [...B.schlagwoerter].map(([st, l]) => [st, zustand.jahr ? l.filter((i) => BEITRAEGE[i].d.startsWith(zustand.jahr)).length : l.length]).filter(([st, n]) => n > 0 && (!q || norm(wortName(st)).includes(q)));
    woerter.sort((a, b) => b[1] - a[1] || wortName(a[0]).localeCompare(wortName(b[0]), "de"));
    $("#liste").innerHTML = woerter.map(([st, n]) => `<li><a href="#w=${encodeURIComponent(st)}" ${zustand.wort === st ? 'aria-current="page"' : ""}>${esc(wortName(st))}</a><span class="zahl">${n}</span></li>`).join("");
    $("#anzahl").textContent = `${woerter.length} Schlagwörter`;
  }
}
$("#suche").addEventListener("input", (e) => { zustand.suche = e.target.value; zeichneListe(); });
for (const [id, r] of [["#reiter-beitraege", "beitraege"], ["#reiter-woerter", "woerter"]]) $(id).addEventListener("click", () => {
  zustand.reiter = r;
  $("#reiter-beitraege").setAttribute("aria-selected", r === "beitraege");
  $("#reiter-woerter").setAttribute("aria-selected", r === "woerter");
  zeichneListe();
});
document.addEventListener("click", (e) => { const k = e.target.closest("[data-markieren]"); if (k) markieren(k.dataset.markieren); });

// schmale Bildschirme: Liste ein- und ausblenden
$("#liste-auf").addEventListener("click", () => { const o = $("#seite-links").classList.toggle("offen"); $("#liste-auf").setAttribute("aria-expanded", o); });
$("#liste").addEventListener("click", (e) => { if (e.target.closest("a") && matchMedia("(max-width: 760px)").matches) { $("#seite-links").classList.remove("offen"); $("#liste-auf").setAttribute("aria-expanded", "false"); } });

// ---------- Markieren ----------
function markieren(id) {
  const k = markiert.indexOf(id);
  if (k >= 0) markiert.splice(k, 1);
  else if (markiert.length < MAX_MARKIERT) markiert.push(id);
  speicher.schreib("markiert", markiert);
  zeichneListe(); zeichneLeiste();
  if (zustand.offen) zeichneNotizKnopf();
}
function zeichneLeiste() {
  $("#leiste").hidden = markiert.length === 0;
  $("#leiste-text").textContent = `${markiert.length} von ${MAX_MARKIERT} markiert`;
  $("#montieren").disabled = markiert.length === 0;
}
$("#leeren").addEventListener("click", () => { markiert = []; speicher.schreib("markiert", markiert); zeichneListe(); zeichneLeiste(); if (zustand.offen) zeichneNotizKnopf(); });

// ---------- Text mit Querverweisen ----------
function verlinkt(t) {
  const teile = [];
  let pos = 0;
  for (const m of t.matchAll(/#[\p{L}\p{N}_]{3,}|\p{L}{6,}/gu)) {
    const w = m[0];
    const st = w.startsWith("#") ? w.toLowerCase() : stamm(norm(w));
    if (!B.schlagwoerter.has(st) || B.schlagwoerter.get(st).length < 2) continue;
    teile.push(esc(t.slice(pos, m.index)), `<a class="wl" href="#w=${encodeURIComponent(st)}">${esc(w)}</a>`);
    pos = m.index + w.length;
  }
  teile.push(esc(t.slice(pos)));
  return teile.join("").replace(/https?:\/\/[^\s<]+/g, (u) => `<a href="${u}" rel="noopener nofollow" target="_blank">${u}</a>`);
}

// ---------- Ansichten ----------
function zeigeBeitrag(id) {
  const i = B.nr.get(id);
  if (i === undefined) return zeigeStart();
  const b = BEITRAEGE[i];
  zustand.offen = id; zustand.wort = null;
  const vor = BEITRAEGE[i - 1], nach = BEITRAEGE[i + 1];
  $("#ansicht").innerHTML = `<article class="notiz">
    <p class="notiz-kopf"><time datetime="${b.d}">${datum(b.d)}</time><span>Beitrag ${i + 1} von ${N}</span></p>
    <h1>${esc(titel(b))}</h1>
    <div class="text">${verlinkt(b.t)}</div>
    <p class="notiz-knoepfe" id="notiz-knoepfe"></p>
    <nav class="blaettern" aria-label="Blättern">${vor ? `<a href="#b=${encodeURIComponent(vor.i)}">← ${datum(vor.d)}</a>` : "<span></span>"}${nach ? `<a href="#b=${encodeURIComponent(nach.i)}">${datum(nach.d)} →</a>` : ""}</nav>
  </article>`;
  zeichneNotizKnopf();
  const vw = verwandte(B, i);
  $("#verwandte").innerHTML = vw.map((v) => `<li><a href="#b=${encodeURIComponent(BEITRAEGE[v.i].i)}">${esc(titel(BEITRAEGE[v.i]))}<span class="warum">${datum(BEITRAEGE[v.i].d)} · ${v.woerter.map((w) => esc(wortName(w))).join(", ")}</span></a></li>`).join("") || `<li class="leise">Keine gemeinsamen Schlagwörter.</li>`;
  $("#marken").innerHTML = schlagwoerterVon(B, i).slice(0, 24).map((st) => `<a href="#w=${encodeURIComponent(st)}">${esc(wortName(st))}</a>`).join("") || `<span class="leise">–</span>`;
  graphFuer(i, vw);
  $("#mitte").scrollTop = 0;
  zeichneListe();
}
function zeichneNotizKnopf() {
  const ort = $("#notiz-knoepfe"); if (!ort) return;
  const m = markiert.includes(zustand.offen), voll = !m && markiert.length >= MAX_MARKIERT;
  ort.innerHTML = `<button class="knopf-klein" type="button" data-markieren="${esc(zustand.offen)}" ${voll ? "disabled" : ""}>${m ? `Markiert (${"ABCD"[markiert.indexOf(zustand.offen)]}) · lösen` : voll ? "Schon vier markiert" : "Markieren"}</button>`;
}

function zeigeWort(st) {
  const l = B.schlagwoerter.get(st);
  if (!l) return zeigeStart();
  zustand.wort = st; zustand.offen = null;
  const proJahr = jahre.map((j) => l.filter((i) => BEITRAEGE[i].d.startsWith(j)).length);
  const max = Math.max(...proJahr, 1);
  const muster = st.startsWith("#") ? null : new RegExp(`(\\p{L}*${st.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/a/g, "[aä]").replace(/o/g, "[oö]").replace(/u/g, "[uü]")}\\p{L}*)`, "giu");
  const auszug = (t) => {
    const n = muster ? t.search(muster) : t.toLowerCase().indexOf(st);
    const a = Math.max(0, n - 90), s = t.slice(a, a + 220);
    const roh = (a > 0 ? "… " : "") + esc(s) + (a + 220 < t.length ? " …" : "");
    return muster ? roh.replace(muster, "<mark>$1</mark>") : roh;
  };
  $("#ansicht").innerHTML = `<section class="wortseite">
    <p class="notiz-kopf">Schlagwort</p>
    <h1>${esc(wortName(st))}</h1>
    <p class="leise">${l.length} Beiträge</p>
    <div class="balken" aria-hidden="true">${proJahr.map((n, k) => `<span style="height:${Math.round((n / max) * 100)}%" title="${jahre[k]}: ${n}"></span>`).join("")}</div>
    <div class="balken-jahre" aria-hidden="true">${jahre.map((j) => `<span>${j.slice(2)}</span>`).join("")}</div>
    <ol class="treffer">${l.map((i) => BEITRAEGE[i]).sort((a, b) => a.d.localeCompare(b.d)).map((b) => `<li><a href="#b=${encodeURIComponent(b.i)}"><span class="leise">${datum(b.d)}</span><p class="auszug">${auszug(b.t)}</p></a></li>`).join("")}</ol>
  </section>`;
  $("#verwandte").innerHTML = "";
  $("#marken").innerHTML = "";
  graphFuerWort(st, l);
  $("#mitte").scrollTop = 0;
  zeichneListe();
}

function zeigeStart() {
  zustand.offen = null; zustand.wort = null;
  if (!N) {
    $("#ansicht").innerHTML = `<p class="leer">Die Beiträge sind noch nicht freigegeben. Sobald Christian die Auswahl freigibt, stehen sie hier.</p>`;
  } else {
    const top = [...B.schlagwoerter].sort((a, b) => b[1].length - a[1].length).slice(0, 40);
    $("#ansicht").innerHTML = `<section class="wortseite">
      <p class="notiz-kopf">${N} Beiträge · ${datum(BEITRAEGE[0].d).split(".").pop()}–${datum(BEITRAEGE[N - 1].d).split(".").pop()}</p>
      <h1>Kunst</h1>
      <p class="leer">Facebook-Beiträge mit dem Stichwort «Kunst», verknüpft über ihre Schlagwörter. Öffne einen Beitrag, folge den unterstrichenen Wörtern, markiere bis zu vier Beiträge und montiere daraus einen neuen.</p>
      <p class="marken" style="margin-top:1.5rem">${top.map(([st, l]) => `<a href="#w=${encodeURIComponent(st)}">${esc(wortName(st))} <span class="leise">${l.length}</span></a>`).join("")}</p>
    </section>`;
  }
  $("#verwandte").innerHTML = ""; $("#marken").innerHTML = "";
  graph = { knoten: [], kanten: [] }; zeichneGraph();
  zeichneListe();
}

function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (h.startsWith("b=")) zeigeBeitrag(h.slice(2));
  else if (h.startsWith("w=")) zeigeWort(h.slice(2));
  else zeigeStart();
}
addEventListener("hashchange", route);

// ---------- Lokaler Graph ----------
let graph = { knoten: [], kanten: [] };
function graphFuer(i, vw) {
  const knoten = [{ art: "b", id: BEITRAEGE[i].i, name: titel(BEITRAEGE[i]), mitte: true }];
  const kanten = [];
  const woerter = new Map();
  vw.slice(0, 7).forEach((v) => {
    const k = knoten.push({ art: "b", id: BEITRAEGE[v.i].i, name: titel(BEITRAEGE[v.i]) }) - 1;
    for (const st of v.woerter.slice(0, 2)) {
      if (!woerter.has(st)) { woerter.set(st, knoten.push({ art: "w", id: st, name: wortName(st) }) - 1); kanten.push([0, woerter.get(st)]); }
      kanten.push([k, woerter.get(st)]);
    }
  });
  graph = anordnen({ knoten, kanten });
  zeichneGraph();
}
function graphFuerWort(st, l) {
  const knoten = [{ art: "w", id: st, name: wortName(st), mitte: true }];
  const kanten = [];
  l.slice(0, 14).forEach((i) => kanten.push([0, knoten.push({ art: "b", id: BEITRAEGE[i].i, name: titel(BEITRAEGE[i]) }) - 1]));
  graph = anordnen({ knoten, kanten });
  zeichneGraph();
}
/** kleine Kräfte-Anordnung, festgelegt durch einen Startwert, damit derselbe Beitrag immer gleich aussieht */
function anordnen(g) {
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.knoten.forEach((k, n) => { const w = (n / g.knoten.length) * Math.PI * 2; k.x = k.mitte ? 0 : Math.cos(w) * 0.6 + (r() - 0.5) * 0.1; k.y = k.mitte ? 0 : Math.sin(w) * 0.6 + (r() - 0.5) * 0.1; });
  for (let schritt = 0; schritt < 220; schritt++) {
    for (const a of g.knoten) for (const b of g.knoten) if (a !== b) { const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy + 0.001; a.x += (dx / d2) * 0.0012; a.y += (dy / d2) * 0.0012; }
    for (const [x, y] of g.kanten) { const a = g.knoten[x], b = g.knoten[y]; const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - 0.38) * 0.04; a.x += (dx / d) * f; a.y += (dy / d) * f; b.x -= (dx / d) * f; b.y -= (dy / d) * f; }
    for (const k of g.knoten) { if (k.mitte) { k.x = 0; k.y = 0; } k.x = Math.max(-1, Math.min(1, k.x)); k.y = Math.max(-1, Math.min(1, k.y)); }
  }
  return g;
}
function zeichneGraph() {
  const c = $("#graph"), ctx = c.getContext("2d");
  const dpr = devicePixelRatio || 1, w = c.clientWidth || 320, h = c.clientHeight || 260;
  c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(document.documentElement);
  const tinte = css.getPropertyValue("--tinte").trim(), leise = css.getPropertyValue("--leise").trim(), linie = css.getPropertyValue("--linie").trim(), papier = css.getPropertyValue("--papier").trim();
  ctx.clearRect(0, 0, w, h);
  const px = (k) => [w / 2 + k.x * (w / 2 - 34), h / 2 + k.y * (h / 2 - 22)];
  ctx.strokeStyle = linie; ctx.lineWidth = 1;
  for (const [a, b] of graph.kanten) { const [x1, y1] = px(graph.knoten[a]), [x2, y2] = px(graph.knoten[b]); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  ctx.font = `11px ${css.getPropertyValue("--sans")}`; ctx.textAlign = "center";
  for (const k of graph.knoten) {
    const [x, y] = px(k);
    ctx.beginPath();
    if (k.art === "w") { ctx.fillStyle = papier; ctx.strokeStyle = tinte; ctx.arc(x, y, k.mitte ? 7 : 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    else { ctx.fillStyle = k.mitte ? tinte : leise; ctx.arc(x, y, k.mitte ? 7 : 4.5, 0, Math.PI * 2); ctx.fill(); }
    if (k.art === "w" || k.mitte) { ctx.fillStyle = k.art === "w" ? tinte : leise; const n = k.name.length > 22 ? k.name.slice(0, 21) + "…" : k.name; ctx.fillText(n, x, y - 10); }
  }
  c.onclick = (e) => {
    const rect = c.getBoundingClientRect(), mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let best = null, bd = 16 * 16;
    for (const k of graph.knoten) { const [x, y] = px(k), d = (x - mx) ** 2 + (y - my) ** 2; if (d < bd) { bd = d; best = k; } }
    if (best && !best.mitte) location.hash = (best.art === "b" ? "b=" : "w=") + encodeURIComponent(best.id);
  };
  c.title = graph.knoten.filter((k) => !k.mitte).map((k) => k.name).join(" · ");
}
addEventListener("resize", () => zeichneGraph());
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => zeichneGraph());

// ---------- Werkbank ----------
const werkbank = $("#werkbank");
function oeffneWerkbank() {
  if (!markiert.length) return;
  const idx = markiert.map((id) => B.nr.get(id));
  $("#quellen").innerHTML = idx.map((i, k) => `<li><b>${"ABCD"[k]}</b><a href="#b=${encodeURIComponent(BEITRAEGE[i].i)}">${datum(BEITRAEGE[i].d)}</a><br>${esc(BEITRAEGE[i].t.length > 360 ? BEITRAEGE[i].t.slice(0, 358) + " …" : BEITRAEGE[i].t)}</li>`).join("");
  const gespeichert = speicher.lies("entwurf", null);
  const schluessel = markiert.join("|");
  if (gespeichert && gespeichert.von === schluessel) $("#entwurf").value = gespeichert.text;
  else neuMischen(false);
  zeichneZuordnung(idx);
  werkbank.showModal();
  $("#entwurf").focus();
}
function neuMischen(weiter = true) {
  if (weiter) { seed = (seed * 48271) % 2147483647 || 1; speicher.schreib("seed", seed); }
  const m = montage(B, markiert.map((id) => B.nr.get(id)), seed);
  $("#entwurf").value = m.text;
  sichern();
}
function sichern() { speicher.schreib("entwurf", { von: markiert.join("|"), text: $("#entwurf").value }); }
function zeichneZuordnung(idx) {
  const z = zuordnung(B, idx, JEV);
  const karte = (art, r, kopf) => {
    if (!r) return `<div class="karte"><p class="art">${kopf}</p><p class="grund">Nichts Gemeinsames gefunden.</p></div>`;
    const istZettel = art === "zettel";
    const name = istZettel ? `${r.ziel.n} · ${r.ziel.t}` : titelBegegnung(r.ziel);
    const satz = istZettel ? r.ziel.b : r.ziel.question;
    const link = istZettel ? adresse.zettel(r.ziel) : adresse.begegnung(r.ziel);
    return `<div class="karte"><p class="art">${kopf}<span class="quelle" title="${r.art === "jev" ? "von jev beim Bauen bewertet" : "Regel nach gemeinsamen Wörtern, nicht jev"}">${r.art}</span></p>
      <h4><a href="${link}" target="_blank" rel="noopener">${esc(name)}</a></h4><p>${esc(satz ?? "")}</p><p class="grund">${esc(r.grund)}</p></div>`;
  };
  $("#zuordnung").innerHTML = karte("zettel", z.zettel, "Zettel") + karte("begegnung", z.begegnung, "ORNA-Begegnung");
  zeichneZuordnung.letzte = z;
}
function alsMarkdown() {
  const z = zeichneZuordnung.letzte ?? {};
  const q = markiert.map((id, k) => { const b = BEITRAEGE[B.nr.get(id)]; return `- ${"ABCD"[k]}: ${datum(b.d)} – ${titel(b)}`; }).join("\n");
  const zeile = (r, n) => (r ? `- ${n}: ${r.art === "jev" ? "jev" : "Regel"} – ${n === "Zettel" ? `${r.ziel.n} ${r.ziel.t} (https://ornament.cloud${adresse.zettel(r.ziel)})` : `${titelBegegnung(r.ziel)} (https://ornament.cloud${adresse.begegnung(r.ziel)})`}` : "");
  return `${$("#entwurf").value.trim()}\n\n---\nMontiert aus:\n${q}\n${[zeile(z.zettel, "Zettel"), zeile(z.begegnung, "ORNA-Begegnung")].filter(Boolean).join("\n")}\n`;
}
$("#montieren").addEventListener("click", oeffneWerkbank);
$("#mischen").addEventListener("click", () => neuMischen(true));
$("#entwurf").addEventListener("input", sichern);
$("#kopieren").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(alsMarkdown()); $("#meldung").textContent = "Kopiert."; } catch (e) { $("#meldung").textContent = "Kopieren ging nicht."; }
});
$("#laden").addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([alsMarkdown()], { type: "text/markdown" }));
  a.download = `kunst-montage-${new Date().toISOString().slice(0, 10)}.md`;
  a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});
werkbank.addEventListener("close", () => { $("#meldung").textContent = ""; });

// ---------- Start ----------
jahresKnoepfe();
zeichneLeiste();
route();
