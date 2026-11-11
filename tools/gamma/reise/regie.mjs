// Reise durch gamma, Bild für Bild mit virtueller Uhr. node regie.mjs <aus> A|B|C|D
import { start, bild, neuerOrdner, ease, sanft, FORMAT } from "./uhr.mjs";
const [AUS, TEIL] = process.argv.slice(2);
const URL = "http://localhost:8765/";
const w = await start(); const p = w.p;
const ord = `${AUS}/teil-${process.env.FORMAT || "16x9"}-${TEIL}`; neuerOrdner();
const lage = () => p.evaluate(() => {
  const g = window.__g, weg = g.intro.offsetHeight - innerHeight, ende = g.intro.offsetTop + weg;
  const kap = {}; g.kapitel.forEach((k, i) => { const x = g.bahn.kapitel && g.bahn.kapitel[i]; if (x) kap[k.id] = Math.round(ende + x.s0 / g.bahn.k + 2); });
  return { top: g.intro.offsetTop, weg, ende, kap};
});
const uY = (L, u) => Math.round(L.top + u * L.weg);
const scrolle = y => p.evaluate(y => scrollTo(0, y), y);
async function fahrt(von, nach, n, kurve = ease, mitBild = true) { for (let i = 1; i <= n; i++) { await scrolle(von + (nach - von) * kurve(i / n)); await bild(w, mitBild ? ord : null); } }
async function halt(n, mitBild = true) { for (let i = 0; i < n; i++) await bild(w, mitBild ? ord : null); }
const sanftLang = p => p < .12 ? p * p / .2112 : p > .88 ? 1 - (1 - p) * (1 - p) / .2112 : (p - .06) / .88;
const y = () => p.evaluate(() => scrollY);

await p.goto(URL + "gamma/", { waitUntil: "load" });
if (TEIL === "A") {
  await halt(330);
  const L = await lage(); console.log(JSON.stringify(L.kap));                                              // Lichtkugel → Signet → ornament.cloud
  await fahrt(await y(), L.kap["k-web"], 90); await halt(60);    // aufs Band: Websites
  await fahrt(L.kap["k-web"], L.kap["k-apps"], 90); await halt(30);
  await p.evaluate(() => window.__g.setzeFlach(true, "k-apps")); await halt(240);   // Apps flach
  await p.evaluate(() => window.__g.setzeFlach(false, "k-apps")); await halt(60);   // zurück in den Raum
  await fahrt(await y(), L.kap["k-web"], 90); await halt(30);
  await fahrt(L.kap["k-web"], uY(L, L.U_START ?? .9118), 90, sanft);
  await fahrt(await y(), 0, 480, sanftLang);
  await halt(150);                                             // Zettel und Wolke
}
if (TEIL === "B") {
  await halt(380, false);
  const L = await lage();
  await scrolle(L.kap["k-kunst"]); await p.evaluate(() => { window.__g.zustand.y = null; }); await halt(45, false);
  await fahrt(L.kap["k-kunst"], L.kap["k-experimente"], 100); await halt(60);
  await p.evaluate(() => window.__g.setzeFlach(true, "k-experimente")); await halt(330);   // Specials flach: die Konstruktion
  const ziel = await p.evaluate(() => { const r = document.querySelector(".exp-karten").getBoundingClientRect(); return Math.round(scrollY + r.top - (innerHeight - r.height) / 2); });
  await fahrt(await y(), ziel, 60); await halt(20);
  const k = await p.evaluate(() => { const r = document.querySelectorAll(".exp-karte")[1].getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height * .4 }; });
  await p.evaluate(() => { const c = document.createElement("div"); c.id = "zeiger-fake";
    c.innerHTML = '<svg width="22" height="30" viewBox="0 0 22 30"><path d="M2 2 L2 24 L8 18.5 L12.5 28 L16 26.5 L11.6 17.2 L19 17.2 Z" fill="#fff" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    c.style.cssText = "position:fixed;left:0;top:0;z-index:99999;pointer-events:none;transform-origin:2px 2px"; document.body.append(c); });
  const zeig = (x, y, s = 1) => p.evaluate(([x, y, s]) => { document.getElementById("zeiger-fake").style.transform = `translate(${x - 2}px,${y - 2}px) scale(${s})`; }, [x, y, s]);
  for (let i = 1; i <= 45; i++) { const q = ease(i / 45), x0 = FORMAT.w * .83, y0 = FORMAT.h * .96, x = x0 + (k.x - x0) * q, yy = y0 + (k.y - y0) * q; await p.mouse.move(x, yy); await zeig(x, yy); await bild(w, ord); }
  await halt(40);
  for (let i = 0; i < 8; i++) { await zeig(k.x, k.y, 1 - .18 * Math.sin(Math.PI * i / 7)); await bild(w, ord); }
  await halt(8);
}
if (TEIL === "C") {
  await p.goto(URL + "beta/drittes-rad/", { waitUntil: "load" });
  await p.addStyleTag({ content: "#intro button { display: none !important; }" });
  await halt(108);
}
if (TEIL === "D") {
  await halt(380, false);
  const L = await lage();
  await halt(45);
  await fahrt(await y(), uY(L, .672), 170); await halt(75);
}
console.log(TEIL, "Fehler:", w.fehler.slice(0, 5));
await w.b.close();
