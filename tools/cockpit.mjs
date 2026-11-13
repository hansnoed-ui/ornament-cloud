// Cockpit (13. November 2026, Paket «Cockpit» nach dem Entscheid von Christian): eine private Übersicht fürs Handy – was ist öffentlich, was wartet
// auf Christian, was kommt in den nächsten Wochen hinaus. Liest src/register.json (Tür, Status, «wartet»), listen/<slug>/ep.json, die Werke der
// Lab-Werkschau (b/lab/works/<ordner>/werk.json) und docs/cockpit/plan.json; schreibt docs/cockpit/cockpit.html. docs/ geht nicht auf den Webspace:
// die Seite wird als privates Artefakt bei Claude veröffentlicht, nicht auf ornament.cloud. Sie ist ein Bruchstück ohne <html> und <body> (das Artefakt
// setzt den Rahmen selbst); lokal zeigt ein Browser sie trotzdem.
//
//   node tools/cockpit.mjs            schreibt docs/cockpit/cockpit.html
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { pathToFileURL } from "node:url";

const ROOT = new URL("../", import.meta.url);
const lies = (p) => readFileSync(new URL(p, ROOT), "utf8");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const BASIS = "https://ornament.cloud";
const TUEREN = { "hoeren-sehen": "Hören und Sehen", "spielen-denken": "Spielen und Denken", beauftragen: "Beauftragen", atelier: "Atelier" };
const STATUS = { oeffentlich: "öffentlich", verlinkt: "verlinkt", direktlink: "nur Direktlink", extern: "andere Adresse" };
const tag = (iso) => { const [j, m, t] = iso.split("-").map(Number); return `${t}.${m}.${j}`; };

/** die Daten des Cockpits, ohne HTML (für den Test) */
export function cockpitDaten() {
  const register = JSON.parse(lies("src/register.json"));
  const plan = JSON.parse(lies("docs/cockpit/plan.json"));
  const zahl = (s) => register.arbeiten.filter((e) => e.status === s).length;
  const works = existsSync(new URL("b/lab/works/", ROOT))
    ? readdirSync(new URL("b/lab/works/", ROOT), { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(new URL(`b/lab/works/${d.name}/werk.json`, ROOT))).map((d) => JSON.parse(lies(`b/lab/works/${d.name}/werk.json`)))
    : [];
  return {
    plan, register,
    zahlen: { oeffentlich: zahl("oeffentlich"), verlinkt: zahl("verlinkt"), direktlink: zahl("direktlink"), labWerke: works.filter((w) => w.veroeffentlicht === true).length },
    wartet: register.arbeiten.filter((e) => e.wartet).map((e) => ({ id: e.id, name: e.name, text: e.wartet })),
    tueren: register.tueren.map((t) => ({ id: t, name: TUEREN[t], arbeiten: register.arbeiten.filter((e) => e.tuer === t) })),
  };
}

export function cockpitHtml(d = cockpitDaten()) {
  const adresse = (e) => (e.status === "extern" ? e.adresse : `${BASIS}/${e.adresse}`);
  const punkt = (id, text, klein = "") => `<li><label><input type="checkbox" id="p-${esc(id)}"><span><b>${esc(text)}</b>${klein ? `<small>${esc(klein)}</small>` : ""}</span></label></li>`;
  return `<title>ornament Cockpit</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&family=Newsreader:ital@1&display=swap">
<style>
/* Eine Spalte fürs Handy: Zahlen, dann was wartet, dann der Plan, dann das Register nach Türen. Papier und Tinte in Umkehr wie ornament.cloud, die Blaupause als einziger Akzent. */
:root { --papier: #000000; --tinte: #ffffff; --grau: #9a9a9a; --linie: #2e2e2e; --flaeche: #141414; --faden: #8fb0ff; --gruen: #1f4d3a; --gut: #7fd4a8; --warn: #e6b117;
  --sans: "Instrument Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; --serif: "Newsreader", Georgia, serif; color-scheme: dark; }
@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { --papier: #ffffff; --tinte: #000000; --grau: #6f6f6f; --linie: #dadada; --flaeche: #f3f3f1; --faden: #1d3fd6; --gruen: #1f4d3a; --gut: #1f7a4d; --warn: #8a6500; color-scheme: light; } }
:root[data-theme="light"] { --papier: #ffffff; --tinte: #000000; --grau: #6f6f6f; --linie: #dadada; --flaeche: #f3f3f1; --faden: #1d3fd6; --gruen: #1f4d3a; --gut: #1f7a4d; --warn: #8a6500; color-scheme: light; }
*, *::before, *::after { box-sizing: border-box; }
body { background: var(--papier); color: var(--tinte); font: 17px/1.5 var(--sans); -webkit-font-smoothing: antialiased; }
.spalte { max-width: 760px; margin: 0 auto; padding-block: 28px 64px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 48px; }
h1, h2, h3, p, ul, ol { margin: 0; } ul, ol { padding: 0; list-style: none; }
a { color: inherit; text-decoration-thickness: 1px; text-underline-offset: 0.18em; } a:hover { color: var(--faden); }
:focus-visible { outline: 2px solid var(--faden); outline-offset: 3px; }
.kopf { display: grid; gap: 10px; }
.kopf .klein { color: var(--grau); font-size: 0.92rem; }
h1 { font-weight: 500; font-size: clamp(2.2rem, 9vw, 3.4rem); letter-spacing: -0.035em; line-height: 1; text-wrap: balance; }
.satz { font-family: var(--serif); font-style: italic; font-size: 1.3rem; line-height: 1.35; max-width: 34ch; }
.zahlen { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid var(--tinte); }
.zahlen div { padding: 14px 10px 14px 0; border-bottom: 1px solid var(--linie); min-width: 0; }
.zahlen b { display: block; font-weight: 500; font-size: 2rem; letter-spacing: -0.03em; line-height: 1.05; font-variant-numeric: tabular-nums; }
.zahlen span { color: var(--grau); font-size: 0.82rem; line-height: 1.25; display: block; }
@media (max-width: 520px) { .zahlen { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
section { display: grid; gap: 14px; min-width: 0; }
h2 { font-weight: 500; font-size: 1.6rem; letter-spacing: -0.025em; line-height: 1.1; padding-bottom: 12px; border-bottom: 1px solid var(--tinte); }
h2 small { display: block; margin-top: 6px; color: var(--grau); font-size: 0.95rem; font-weight: 400; letter-spacing: 0; line-height: 1.4; }
.punkte li { border-bottom: 1px solid var(--linie); }
.punkte label { display: grid; grid-template-columns: 26px minmax(0, 1fr); gap: 12px; padding: 13px 0; cursor: pointer; align-items: start; }
.punkte input { width: 22px; height: 22px; margin: 2px 0 0; accent-color: var(--faden); }
.punkte b { font-weight: 500; display: block; }
.punkte small { display: block; color: var(--grau); font-size: 0.92rem; line-height: 1.4; margin-top: 2px; }
.punkte input:checked + span { color: var(--grau); text-decoration: line-through; text-decoration-thickness: 1px; }
.wochen li { display: grid; grid-template-columns: 4.6rem minmax(0, 1fr); gap: 4px 14px; padding: 14px 0; border-bottom: 1px solid var(--linie); }
.wochen .ab { color: var(--faden); font-variant-numeric: tabular-nums; font-size: 0.95rem; padding-top: 2px; }
.wochen b { font-weight: 500; display: block; }
.wochen p { color: var(--grau); font-size: 0.94rem; line-height: 1.4; }
.wochen .braucht { color: var(--tinte); margin-top: 6px; padding-left: 12px; border-left: 2px solid var(--warn); }
.wochen .frei { color: var(--gut); margin-top: 6px; }
.tuer h3 { font-weight: 500; font-size: 1.05rem; margin: 18px 0 2px; display: flex; justify-content: space-between; gap: 12px; align-items: baseline; }
.tuer h3 span { color: var(--grau); font-weight: 400; font-size: 0.88rem; }
.arbeiten li { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 12px; padding: 10px 0; border-bottom: 1px solid var(--linie); align-items: baseline; }
.arbeiten a { font-weight: 500; text-decoration: none; overflow-wrap: anywhere; } .arbeiten a:hover { text-decoration: underline; }
.arbeiten small { grid-column: 1 / -1; color: var(--grau); font-size: 0.86rem; line-height: 1.35; }
.pille { font-size: 0.78rem; padding: 1px 9px; border: 1px solid var(--linie); border-radius: 999px; color: var(--grau); white-space: nowrap; }
.pille.oeffentlich { border-color: var(--gut); color: var(--gut); }
.pille.verlinkt { border-color: var(--faden); color: var(--faden); }
.fuss { color: var(--grau); font-size: 0.86rem; line-height: 1.45; }
</style>
<div class="spalte">
  <header class="kopf">
    <p class="klein">ornament.cloud · Stand ${esc(tag(d.plan.stand))}</p>
    <h1>Cockpit</h1>
    <p class="satz">Ein Stück pro Woche hinaus. Zuerst die Seite, dann der Beitrag, der auf sie zeigt.</p>
  </header>

  <div class="zahlen" role="group" aria-label="Sichtbarkeit">
    <div><b>${d.zahlen.oeffentlich}</b><span>öffentlich, in der Suche</span></div>
    <div><b>${d.zahlen.verlinkt}</b><span>verlinkt, nicht in der Suche</span></div>
    <div><b>${d.zahlen.direktlink}</b><span>nur per Direktlink</span></div>
    <div><b>${d.zahlen.labWerke}</b><span>Werke aus dem Lab veröffentlicht</span></div>
  </div>

  <section aria-labelledby="t-entscheide">
    <h2 id="t-entscheide">Entscheide<small>Nur du kannst sie fällen. Die Haken merkt sich dieses Gerät, sonst niemand.</small></h2>
    <ul class="punkte">${d.plan.entscheide.map((t, i) => punkt(`e${i}`, t)).join("")}</ul>
  </section>

  <section aria-labelledby="t-wartet">
    <h2 id="t-wartet">Wartet auf dich<small>Material und Angaben, ohne die eine Arbeit nicht hinaus kann.</small></h2>
    <ul class="punkte">${d.wartet.map((w) => punkt(`w-${w.id}`, w.name, w.text)).join("")}</ul>
  </section>

  <section aria-labelledby="t-plan">
    <h2 id="t-plan">Sechs Wochen<small>Ein Vorschlag. Je Woche ein Stück und ein Beitrag.</small></h2>
    <ol class="wochen">${d.plan.wochen.map((w) => `<li><span class="ab">ab ${esc(tag(w.ab).replace(/\.\d{4}$/, "."))}</span><div><b>${esc(w.stueck)}</b><p>${esc(w.beitrag)}</p>${w.braucht ? `<p class="braucht">${esc(w.braucht)}</p>` : `<p class="frei">Braucht nichts mehr von dir.</p>`}</div></li>`).join("")}</ol>
  </section>

  <section aria-labelledby="t-register">
    <h2 id="t-register">Register<small>Alle ${d.register.arbeiten.length} Arbeiten nach Tür. Grün ist öffentlich, blau im Atelier verlinkt, grau nur mit dem Link erreichbar.</small></h2>
    ${d.tueren.map((t) => `<div class="tuer"><h3>${esc(t.name)}<span>${t.arbeiten.filter((e) => e.status === "oeffentlich").length} von ${t.arbeiten.length} öffentlich</span></h3>
    <ul class="arbeiten">${t.arbeiten.map((e) => `<li><a href="${esc(adresse(e))}">${esc(e.name)}</a><span class="pille ${esc(e.status)}">${esc(STATUS[e.status])}</span><small>${esc([e.art, e.kurz].filter(Boolean).join(" · "))}</small></li>`).join("")}</ul></div>`).join("\n    ")}
  </section>

  <p class="fuss">Erzeugt aus src/register.json und docs/cockpit/plan.json mit tools/cockpit.mjs. Die Seite liegt nicht auf ornament.cloud. Links führen auf die Live-Seite: was erst auf dem Zweig steht, ist dort noch nicht zu sehen.</p>
</div>
<script>
// Haken merken (nur auf diesem Gerät; ohne Speicher bleibt die Seite gleich lesbar)
for (const el of document.querySelectorAll('.punkte input')) {
  try { el.checked = localStorage.getItem('cockpit.' + el.id) === '1'; } catch {}
  el.addEventListener('change', () => { try { localStorage.setItem('cockpit.' + el.id, el.checked ? '1' : '0'); } catch {} });
}
</script>
`;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  writeFileSync(new URL("docs/cockpit/cockpit.html", ROOT), cockpitHtml());
  const d = cockpitDaten();
  console.log(`docs/cockpit/cockpit.html geschrieben: ${d.register.arbeiten.length} Arbeiten, ${d.wartet.length} warten, ${d.plan.wochen.length} Wochen`);
}
