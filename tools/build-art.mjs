// «Art» – die Seiten zum Kaufen (seit 19. Oktober 2026, Wunsch: «Neu soll als 5. Menupunkt (nach: "Social") ein "Art"-Seite entstehen für den Verkauf von
// Kunstwerken, Gestaltungen und Dienstleistungen … Es muss kein Webshop angebunden werden, die Bestellung, Bestätigung und der Verkauf sollte aber möglichst
// perfekt und schlank nachvollziehbar sein»; dazu: «verkauf nur nebensächlich, ich kann das ganz klein halten»). Konzept und Recherche: src/art/KONZEPT.md.
// Quelle ist src/art/werke.json (eine Datei für alle Werke), Bilder aus tools/art-bilder.mjs. Geschrieben werden:
//   art/index.html            Übersicht: Filter, Serien mit Werken, Dienstleistungen als Pakete, Zusagen, Ablauf einer Bestellung, Fragen;
//                             solange "ankuendigung" gesetzt ist, nur die Ankündigung, die Werke (zurzeit ein Beispiel) und die Dienstleistungen in einem Satz
//   art/<slug>/index.html     je Werk (nicht für Dienstleistungen): Bild mit Lupe, Angaben, Preis, Bestellen, Massstab, Text, weitere Werke
//   art/danke/index.html      nach dem Bezahlen (Erfolgsseite eines Zahlungslinks) und als Erklärung, wie es weitergeht
//   sitemap.xml               der Block zwischen <!-- ART:START --> und <!-- ART:END -->: die Seiten ohne noindex (Muster sind gesperrt, ebenso die Übersicht, solange Muster darauf stehen)
// Angeboten werden Werke (Originale, Prints) und Dienstleistungen (Websites, Apps; Präzisierung vom 19. Oktober 2026). Bis die Werke da sind, steht eine Ankündigung
// mit einem Beispiel (Wunsch: «Lass die Seite noch leer mit einer Ankündigung, dass es hier demnächst mehr zu sehen gibt (eines der Beispiele kannst du gerne lassen)»).
// Bestellen ohne Shop: Der Knopf öffnet eine fertige Mail mit allen Angaben (wie der Rückkanal, ohne Dienst und ohne Formular, REGELN §11); die Antwort ist die
// Bestätigung mit QR-Rechnung. Trägt ein Werk "zahlungslink", führt «Kaufen» dorthin (ein gewöhnlicher Link, die Seite lädt nichts von aussen) und die Mail bleibt als zweiter Weg.
//   node tools/build-art.mjs        (nach jeder Änderung an src/art/werke.json; ein Test prüft, dass die Seiten aktuell sind)
import { mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { kopfleiste } from "./kopfleiste.mjs";

const ROOT = new URL("../", import.meta.url);
const CSS = "styles.css?v=48", ART_CSS = "art/art.css?v=7", ART_JS = "art/art.js?v=1";

export const ARTEN = { original: ["Original", "Originale"], print: ["Print", "Prints"], dienstleistung: ["Dienstleistung", "Dienstleistungen"] };
const SERIEN_TEXT = {
  "Nachtblau": "Blätter auf Nachtblau: Linien, Bündel und Raster. Aus ihnen sind die Bilder von The Fictory geworden.",
};

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** CHF 1’400.– (Schweizer Schreibweise, Hochkomma als Tausendertrennung) */
export const chf = (n) => `CHF ${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "’")}.–`;
const zahl = (n) => String(n).replace(".", ",");
export const format = (m) => (m ? `${zahl(m.b)} × ${zahl(m.h)} cm` : "");

/** Stand eines Werks: [Wort, Art des Punkts] */
export function stand(w) {
  if (w.status === "verkauft") return [w.art === "print" ? "Vergriffen" : "In Privatbesitz", "vergeben"];
  if (w.status === "reserviert") return ["Reserviert", "knapp"];
  if (w.art === "print" && w.auflage) return [`Noch ${w.auflage.verfuegbar} von ${w.auflage.gesamt}`, w.auflage.verfuegbar <= Math.max(3, w.auflage.gesamt * 0.1) ? "knapp" : "frei"];
  return ["Verfügbar", "frei"];
}
export const preisText = (w) => (w.preis ? chf(w.preis) : "Offerte nach Gespräch");

/** die fertige Mail zum Bestellen (oder, bei Mustern, um Interesse zu melden) */
export function mail(daten, w) {
  const muster = w.muster, gestaltung = w.art === "dienstleistung";
  const was = [w.titel, w.jahr && `(${w.jahr})`].filter(Boolean).join(" ");
  const betreff = `${muster ? "Interesse" : gestaltung ? "Anfrage" : "Bestellung"}: ${w.titel}${w.preis ? ` – ${chf(w.preis)}` : ""}`;
  const zeilen = gestaltung
    ? [`Ich interessiere mich für «${w.titel}».`, "", "Worum es geht:", "", "Zeitrahmen:", "", "Name:", "Telefon (freiwillig):"]
    : muster
      ? [`Ich interessiere mich für «${was}».`, "Bitte melde dich, wenn es verfügbar ist.", "", "Name:"]
      : [`Ich bestelle: ${was}`, [w.technik, format(w.masse)].filter(Boolean).join(", "), w.auflage ? `Auflage ${w.auflage.gesamt} Exemplare` : "", `Preis: ${chf(w.preis)}`, "",
         "Name:", "Lieferadresse:", "Land:", "Telefon für den Versand (freiwillig):", "",
         "Ich bekomme eine Bestätigung mit Rechnung (QR-Rechnung, zahlbar mit E-Banking oder TWINT). Bis die Zahlung da ist, ist die Arbeit fünf Tage für mich reserviert.",
         "Es gelten die AGB: https://ornament.cloud/impressum/#agb"].filter((z, i, a) => z !== "" || a[i - 1] !== "");
  return `mailto:${daten.kontakt}?subject=${encodeURIComponent(betreff)}&body=${encodeURIComponent(zeilen.join("\n"))}`;
}

const bild = (w, i, g) => `art/bilder/${w.slug}-${i + 1}-${g}.webp`;
const voll = (w) => !!w.randlos;                                                    // Bilder, die schon gestaltet sind (etwa ein Vorschaubild): ohne Passepartout

function seitenweg(site) {
  return [`        <nav class="seitenweg" aria-label="Ornament Cloud">`, `          <a href="${site}" aria-current="true">Ornament Cloud</a>`,
    `          <a href="${site}alpha/drittes-rad/">Das Dritte Rad</a>`, `        </nav>`].join("\n");
}

function seite({ site, titel, beschreibung, robots, kanon, kopf, inhalt, nachher = "", aktuell = "true", jsonld = "" }) {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- Erzeugt von tools/build-art.mjs aus src/art/werke.json. Nicht von Hand bearbeiten. -->
  <title>${esc(titel)}</title>
  <meta name="description" content="${esc(beschreibung)}">
${robots ? `  <meta name="robots" content="noindex">\n` : ""}  <link rel="canonical" href="https://ornament.cloud/${kanon}">
  <link rel="stylesheet" href="${site}${CSS}">
  <link rel="stylesheet" href="${site}${ART_CSS}">
${jsonld}</head>
<body>
  <header class="site-header">
    <div class="wrap">
${kopfleiste(seitenweg(site), site, { aktiv: "Art", aktuell })}
${kopf}
    </div>
  </header>

  <main class="wrap">
${inhalt}
  </main>
${nachher}
  <!-- Kontakt (seit 5. Oktober 2026 auf allen Seiten) -->
  <footer class="site-footer">
    <div class="wrap">
      <p>Fragen und Anmerkungen zur Website: <a href="mailto:hansnoed@gmail.com">hansnoed@gmail.com</a></p>
      <p><a href="${site}impressum/">Impressum</a></p>
    </div>
  </footer>
  <script type="module" src="${site}${ART_JS}"></script>
  <script src="${site}icons.js?v=14" defer></script>
  <!-- Besuchsstatistik ohne Cookies: https://ornament-cloud.goatcounter.com -->
  <script data-goatcounter="https://ornament-cloud.goatcounter.com/count" async src="${site}vendor/goatcounter/count.js"></script>
</body>
</html>
`;
}

const HINWEIS = `    <p class="art-hinweis"><strong>Im Aufbau.</strong> Werke, Angaben und Preise auf dieser Seite sind Muster. Noch wird nichts verkauft; «Interesse melden» geht trotzdem.</p>`;

/** ein Werk im Raster */
function karte(w, site, masse, lazy) {
  const [wort, punkt] = stand(w);
  const g = masse[`${w.slug}-1-800`] ?? [640, 800];
  const meta = [w.jahr, w.technik, format(w.masse)].filter(Boolean).join(" · ");
  return `        <figure class="werk" data-art="${w.art}">
          <div class="passepartout${voll(w) ? " passepartout--voll" : ""}"><img src="${site}${bild(w, 0, 800)}" alt="${esc(w.bilder[0].alt)}" width="${g[0]}" height="${g[1]}"${lazy ? ` loading="lazy"` : ""}></div>
          <figcaption>
            <h3><a href="${site}art/${w.slug}/">${esc(w.titel)}</a></h3>
            <p class="meta">${esc(meta)}</p>
            <p class="preis"><span>${esc(preisText(w))}</span><span class="stand stand--${punkt}">${esc(wort)}</span></p>
          </figcaption>
        </figure>`;
}

const SYMBOL = {
  zertifikat: '<path d="M6 3.5h9l3.5 3.5v13.5H6z"/><path d="M15 3.5V7h3.5"/><path d="M9 11h6M9 14h4"/><path d="M9.5 18.5c1-1.2 1.8-1.2 2.5 0s1.6 1.2 2.5 0"/>',
  versand: '<path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4"/><path d="M12 11.5v9"/>',
  rueckgabe: '<path d="M8 8H4.5V4.5"/><path d="M4.8 8A8 8 0 1 1 4 13"/>',
  atelier: '<path d="M4 20.5h16"/><path d="M6.5 20.5 11 4.5h2l4.5 16"/><path d="M8.5 13.5h7"/>',
  bestellen: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><path d="m4 6.5 8 6 8-6"/>',
  rechnung: '<rect x="5.5" y="3.5" width="13" height="17" rx="1"/><rect x="8.5" y="10" width="7" height="7"/><path d="M8.5 6.5h7"/><path d="M11 12.5h2v2h-2z"/>',
  signieren: '<path d="M4 18.5c3-6 5-8 6-6s-2 6 1 5 4-7 6-6-1 5 3 5"/>',
  unterwegs: '<path d="M3.5 7.5h11v9h-11z"/><path d="M14.5 10.5h3.5l2.5 3v3h-6"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="17" cy="17.5" r="1.5"/>',
};
const svg = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${SYMBOL[n]}</svg>`;

function uebersicht(daten, masse) {
  const site = "../", werke = daten.werke.filter((w) => w.art !== "dienstleistung"), pakete = daten.werke.filter((w) => w.art === "dienstleistung");
  const serien = [...new Set(werke.map((w) => w.serie))];
  const zahl = (a) => daten.werke.filter((w) => a === "alle" || w.art === a).length;
  const verfuegbar = werke.filter((w) => w.status === "verfuegbar").length;
  const filter = [["alle", "Alle"], ...Object.entries(ARTEN).map(([k, v]) => [k, v[1]])].filter(([k]) => zahl(k))
    .map(([k, n]) => `      <button type="button" data-f="${k}" aria-pressed="${k === "alle"}">${n}<sup>${zahl(k)}</sup></button>`).join("\n");
  let erste = 0;
  const serienHtml = serien.map((s) => {
    const liste = werke.filter((w) => w.serie === s).sort((a, b) => (a.status === "verkauft") - (b.status === "verkauft"));   // Vergebenes ans Ende der Serie, es bleibt sichtbar
    return `    <section class="art-serie" aria-labelledby="serie-${slug(s)}">
      <h2 id="serie-${slug(s)}">${esc(s)}</h2>
${SERIEN_TEXT[s] ? `      <p>${esc(SERIEN_TEXT[s])}</p>\n` : ""}      <div class="art-raster">
${liste.map((w) => karte(w, site, masse, erste++ >= 4)).join("\n")}
      </div>
    </section>`;
  }).join("\n\n");
  const paketeHtml = pakete.length ? `    <section class="art-serie" id="dienstleistungen" aria-labelledby="serie-dienstleistungen">
      <h2 id="serie-dienstleistungen">Dienstleistungen</h2>
      <p>Websites und Apps im Auftrag. Fixpreis, klarer Umfang, ein Gespräch am Anfang.</p>
      <div class="pakete">
${pakete.map((w) => `        <article class="paket" data-art="dienstleistung">
          <h3>${esc(w.titel)}</h3>
          <p class="paket-preis">${w.preis ? esc(chf(w.preis)) : "Offerte"} <span>· ${esc(w.dauer)}</span></p>
          <p>${esc(w.text)}</p>
          <ul>
${w.leistungen.map((l) => `            <li>${esc(l)}</li>`).join("\n")}
          </ul>
${w.ohne ? `          <p class="ohne">Nicht enthalten: ${esc(w.ohne.join(", "))}</p>\n` : ""}          <a class="knopf-text" href="${esc(mail(daten, w))}">${w.muster ? "Interesse melden" : "Gespräch vereinbaren"} <span aria-hidden="true">→</span></a>
        </article>`).join("\n")}
      </div>
    </section>` : "";
  const kopf = `      <h1 class="art-titel">Art</h1>
      <p class="lead">Websites und Apps im Auftrag, dazu Originale und Prints.${daten.ankuendigung ? "" : " Direkt aus dem Atelier, signiert und versichert verschickt aus der Schweiz."}</p>${daten.ankuendigung ? "" : `
      <p class="art-fakten">${werke.length} Arbeiten · ${verfuegbar} verfügbar${pakete.length ? ` · ${pakete.length} Angebote für Dienstleistungen` : ""}</p>`}`;
  if (daten.ankuendigung) {
    const a = daten.ankuendigung, anfrage = mail(daten, { titel: "Website oder App", art: "dienstleistung" });
    const melden = `mailto:${daten.kontakt}?subject=${encodeURIComponent("Art: Bitte benachrichtigen")}&body=${encodeURIComponent("Bitte schreib mir, wenn auf «Art» die ersten Werke zu sehen sind.")}`;
    // Websites und Apps zuoberst, vor den Bildern (Wunsch vom 19. Oktober 2026: «Nimm das Angebot bezüglich Webseiten und Apps nach oben, vor die Bilder»)
    const inhalt = `    <section class="art-serie" aria-labelledby="serie-dienstleistungen">
      <h2 id="serie-dienstleistungen">Dienstleistungen</h2>
      <p>${esc(a.dienstleistungen)}</p>
      <a class="knopf-text" href="${esc(anfrage)}">Anfrage schreiben <span aria-hidden="true">→</span></a>
    </section>

    <section class="art-ankuendigung" aria-labelledby="ankuendigung-titel">
      <h2 id="ankuendigung-titel">${esc(a.titel)}</h2>
      <p>${esc(a.text)}</p>
      <p><a class="kaufen kaufen--leise" href="${esc(melden)}">Benachrichtigen lassen</a></p>
    </section>

${serienHtml.replace(/class="art-serie"/g, 'class="art-serie art-serie--beispiel"').replace(/(<h2 id="serie-[^"]+">)([^<]+)(<\/h2>)/g, "$1Beispiel: $2$3")}`;
    return seite({ site, titel: "Art – Ornament Cloud", beschreibung: "Websites und Apps im Auftrag, dazu Originale und Prints. Demnächst mehr.", robots: true, kanon: "art/", kopf, inhalt, aktuell: "page" });
  }
  const inhalt = `${daten.werke.some((w) => w.muster) ? HINWEIS + "\n" : ""}    <nav class="art-filter" aria-label="Nach Art zeigen" hidden>
${filter}
    </nav>

${paketeHtml}

${serienHtml}

    <ul class="art-zusagen" aria-label="Zusagen">
      <li>${svg("zertifikat")}<span><strong>Signiert, mit Zertifikat</strong>Jede Arbeit und jedes Exemplar einer Edition.</span></li>
      <li>${svg("versand")}<span><strong>Versichert verschickt</strong>Gut verpackt aus der Schweiz, mit Sendungsnummer.</span></li>
      <li>${svg("rueckgabe")}<span><strong>14 Tage Rückgabe</strong>Bei Editionen, ohne Begründung.</span></li>
      <li>${svg("atelier")}<span><strong>Direkt aus dem Atelier</strong>Keine Plattform dazwischen, du schreibst mir.</span></li>
    </ul>

    <section class="art-ablauf" aria-labelledby="ablauf-titel">
      <h2 id="ablauf-titel">So läuft eine Bestellung</h2>
      <ol class="schritte">
        <li>${svg("bestellen")}<strong>Bestellen</strong>«Bestellen» öffnet eine fertige Mail mit allen Angaben. Du ergänzt Name und Adresse und schickst sie ab.</li>
        <li>${svg("rechnung")}<strong>Bestätigung mit Rechnung</strong>Innert eines Tages: Bestätigung und QR-Rechnung, zahlbar mit E-Banking oder TWINT. Die Arbeit ist fünf Tage für dich reserviert.</li>
        <li>${svg("signieren")}<strong>Signiert und verpackt</strong>Nach der Zahlung signiere ich das Zertifikat und verpacke die Arbeit.</li>
        <li>${svg("unterwegs")}<strong>Unterwegs</strong>Versichert mit der Post, du bekommst die Sendungsnummer. In der Schweiz meist in drei bis fünf Tagen.</li>
      </ol>
    </section>

    <section class="art-fragen" aria-labelledby="fragen-titel">
      <h2 id="fragen-titel">Fragen</h2>
      <details><summary>Was kostet der Versand?</summary><p>In der Schweiz ist der Versand im Preis inbegriffen. Ins Ausland nach Aufwand; Zoll und Einfuhrsteuer des Ziellands zahlt, wer die Arbeit empfängt. Du kennst den Betrag vor der Zahlung.</p></details>
      <details><summary>Wie bezahle ich?</summary><p>Mit der QR-Rechnung, die du nach der Bestellung bekommst: per E-Banking oder mit TWINT. Wo ein Werk «Kaufen» zeigt, geht es auch gleich online mit Karte oder TWINT.</p></details>
      <details><summary>Kann ich etwas zurückgeben?</summary><p>Editionen innert 14 Tagen nach Erhalt, unbeschädigt in der Originalverpackung; du bekommst den ganzen Preis zurück. Originale und Arbeiten im Auftrag sind vom Umtausch ausgenommen; schau sie dir gern vorher an.</p></details>
      <details><summary>Gibt es die Arbeiten gerahmt?</summary><p>Auf Wunsch, mit schlichter Holzleiste und entspiegeltem Glas oder Acryl. Schreib es in die Bestellung, du bekommst den Preis mit der Bestätigung.</p></details>
      <details><summary>Darf ich ein Bild ansehen, bevor ich es kaufe?</summary><p>Ja, im Atelier nach Absprache. Schreib mir.</p></details>
      <details><summary>Was gehört mir mit dem Werk?</summary><p>Das Werk selbst. Die Bildrechte bleiben bei mir; für eine Abbildung, etwa in einer Publikation, frag kurz an.</p></details>
    </section>`;
  return seite({ site, titel: "Art – Ornament Cloud", beschreibung: "Websites und Apps im Auftrag, dazu Originale und Prints: direkt aus dem Atelier, signiert und versichert verschickt aus der Schweiz.",
    robots: daten.werke.some((w) => w.muster), kanon: "art/", kopf, inhalt, aktuell: "page" });
}

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Massstab: die Arbeit als Fläche neben einem A4-Blatt (kleine Arbeiten) oder einer Figur von 1,70 m (grosse) */
export function massstab(m) {
  if (!m) return "";
  const gross = Math.max(m.b, m.h) > 45, H = 150, boden = 160;
  const ref = gross ? { h: 170, b: 45 } : { h: 29.7, b: 21 };
  const s = H / Math.max(ref.h, m.h);
  const wb = m.b * s, wh = m.h * s, rb = ref.b * s, rh = ref.h * s;
  const x0 = 20, xw = x0 + rb + 36, wy = gross ? boden - 140 * s - wh / 2 : boden - wh;
  const figur = gross
    ? (() => { const k = rh / 170, cx = x0 + rb / 2, y = boden - rh;
        return `<circle cx="${cx}" cy="${y + 11 * k}" r="${11 * k}"/><path d="M${cx} ${y + 22 * k}V${y + 95 * k}M${cx - 22 * k} ${y + 30 * k}L${cx} ${y + 26 * k}L${cx + 22 * k} ${y + 30 * k}M${cx - 26 * k} ${y + 80 * k}L${cx - 22 * k} ${y + 30 * k}M${cx + 26 * k} ${y + 80 * k}L${cx + 22 * k} ${y + 30 * k}M${cx} ${y + 95 * k}L${cx - 14 * k} ${boden}M${cx} ${y + 95 * k}L${cx + 14 * k} ${boden}"/>`; })()
    : `<rect x="${x0}" y="${boden - rh}" width="${rb}" height="${rh}" stroke-dasharray="3 3"/>`;
  const r = (n) => Math.round(n * 10) / 10;
  return `      <figure class="massstab">
        <svg viewBox="0 0 ${r(xw + wb + 20)} 184" role="img" aria-label="Grösse im Vergleich: ${esc(format(m))} neben ${gross ? "einer Person von 1,70 m" : "einem A4-Blatt"}">
          <path d="M8 ${boden}H${r(xw + wb + 12)}" stroke-width="0.8"/>
          ${figur.replace(/(\d+\.\d{2,})/g, (z) => r(+z))}
          <rect class="werkflaeche" x="${r(xw)}" y="${r(wy)}" width="${r(wb)}" height="${r(wh)}"/>
          <text x="${r(xw)}" y="178">${esc(format(m))}</text>
          <text x="${x0}" y="178">${gross ? "1,70 m" : "A4"}</text>
        </svg>
        <figcaption>Grösse im Vergleich</figcaption>
      </figure>`;
}

function werkseite(daten, w, masse) {
  const site = "../../", [wort, punkt] = stand(w), g = masse[`${w.slug}-1-800`] ?? [640, 800], gg = masse[`${w.slug}-1-1600`] ?? g;
  const zahlbar = !w.muster && w.status === "verfuegbar" && w.preis > 0;
  const haupt = w.zahlungslink && zahlbar ? `<a class="kaufen" href="${esc(w.zahlungslink)}">Kaufen</a>`
    : zahlbar ? `<a class="kaufen" href="${esc(mail(daten, w))}">Bestellen</a>`
    : w.status === "verfuegbar" ? `<a class="kaufen kaufen--leise" href="${esc(mail(daten, w))}">Interesse melden</a>`
    : `<a class="kaufen kaufen--leise" href="${esc(mail(daten, { ...w, muster: true }))}">Ähnliche Arbeit anfragen</a>`;
  const zweit = w.zahlungslink && zahlbar ? `<a class="knopf-text" href="${esc(mail(daten, w))}">Lieber per Rechnung</a>`
    : `<a class="knopf-text" href="mailto:${daten.kontakt}?subject=${encodeURIComponent(`Frage zu «${w.titel}»`)}">Frage stellen</a>`;
  const klein = w.art === "print" ? "Signiert und nummeriert, mit Zertifikat. Versichert verschickt aus der Schweiz, in der Schweiz ohne Versandkosten. 14 Tage Rückgabe."
    : "Signiert, mit Zertifikat. Versichert verschickt aus der Schweiz, in der Schweiz ohne Versandkosten. Ansehen im Atelier nach Absprache.";
  const daten2 = [["Jahr", w.jahr], ["Technik", w.technik], ["Format", format(w.masse)], ["Auflage", w.auflage && `${w.auflage.gesamt} Exemplare`], ...(w.details ?? [])].filter(([, v]) => v);
  const weitere = daten.werke.filter((x) => x.art !== "dienstleistung" && x.slug !== w.slug).sort((a, b) => (b.serie === w.serie) - (a.serie === w.serie)).slice(0, 4);
  const jsonld = w.muster ? "" : `  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org", "@type": ["Product", "VisualArtwork"], name: w.titel,
    artMedium: w.technik, dateCreated: String(w.jahr), ...(w.masse ? { width: `${w.masse.b} cm`, height: `${w.masse.h} cm` } : {}), ...(w.auflage ? { artEdition: String(w.auflage.gesamt) } : {}),
    image: `https://ornament.cloud/${bild(w, 0, 1600)}`, description: w.text, creator: { "@type": "Person", name: "ornament.cloud" },
    offers: { "@type": "Offer", price: String(w.preis ?? 0), priceCurrency: "CHF", url: `https://ornament.cloud/art/${w.slug}/`,
      availability: `https://schema.org/${w.status === "verkauft" ? "SoldOut" : w.status === "reserviert" ? "LimitedAvailability" : "InStock"}` },
  })}</script>\n`;
  const kopf = `      <p class="pfad"><a href="../">Art</a><span aria-hidden="true">/</span><span>${esc(w.serie)}</span></p>`;
  const inhalt = `${w.muster ? HINWEIS + "\n" : ""}    <article class="werkseite">
      <div class="galerie">
        <button class="galerie-haupt${voll(w) ? " galerie-haupt--voll" : ""}" type="button" aria-label="${esc(w.titel)} gross ansehen"><img src="${site}${bild(w, 0, 800)}" srcset="${site}${bild(w, 0, 800)} ${g[0]}w, ${site}${bild(w, 0, 1600)} ${gg[0]}w" sizes="(max-width: 760px) 100vw, 56vw" alt="${esc(w.bilder[0].alt)}" width="${g[0]}" height="${g[1]}" fetchpriority="high"></button>
        <p class="galerie-hinweis">Antippen zum Vergrössern.</p>
${massstab(w.masse)}
      </div>
      <div class="angaben">
        <h1>${esc(w.titel)}</h1>
        <p class="unter">${esc([w.jahr, ARTEN[w.art][0]].filter(Boolean).join(" · "))}</p>
        <p class="betrag">${esc(preisText(w))} <span class="stand stand--${punkt}">${esc(wort)}</span></p>
        <div class="handeln">
          ${haupt}
          ${zweit}
        </div>
        <p class="klein">${esc(klein)} Es gelten die <a href="${site}impressum/#agb">AGB</a>.</p>
        <dl class="daten">
${daten2.map(([k, v]) => `          <dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("\n")}
        </dl>
        <p class="werktext">${esc(w.text)}</p>
      </div>
    </article>

${weitere.length ? `    <section class="weitere" aria-labelledby="weitere-titel">
      <h2 id="weitere-titel">Weitere Arbeiten</h2>
      <div class="art-raster">
${weitere.map((x) => karte(x, site, masse, true)).join("\n")}
      </div>
    </section>

` : ""}    <p class="back"><a href="../">← Zu Art</a></p>`;
  const nachher = `
  <div class="leiste" aria-hidden="true"><span>${esc(preisText(w))}</span>${haupt.replace("<a ", '<a tabindex="-1" ')}</div>
  <dialog class="lupe" aria-label="${esc(w.titel)}, gross"><div class="lupe-bild"><img data-src="${site}${bild(w, 0, 1600)}" alt="${esc(w.bilder[0].alt)}"></div><button class="lupe-zu" type="button" aria-label="Schliessen">×</button></dialog>
`;
  return seite({ site, titel: `${w.titel}${w.jahr ? `, ${w.jahr}` : ""} – Art – Ornament Cloud`, beschreibung: `${w.titel}: ${[w.technik, format(w.masse)].filter(Boolean).join(", ")}. ${preisText(w)}.`,
    robots: w.muster, kanon: `art/${w.slug}/`, kopf, inhalt, nachher, jsonld });
}

function danke(daten) {
  const site = "../../";
  const kopf = `      <h1 class="art-titel">Danke.</h1>
      <p class="lead">Deine Bestellung ist angekommen. Ich signiere das Zertifikat und verpacke die Arbeit sorgfältig; du hörst von mir, sobald sie unterwegs ist.</p>`;
  const inhalt = `    <ol class="schritte" aria-label="Wie es weitergeht">
      <li>${svg("rechnung")}<strong>Bestätigt</strong>Die Bestätigung kommt per Mail. Bei Bezahlung per Rechnung: sobald die Zahlung da ist.</li>
      <li>${svg("signieren")}<strong>Signiert und verpackt</strong>Meist innert drei Werktagen.</li>
      <li>${svg("unterwegs")}<strong>Unterwegs</strong>Versichert mit der Post, mit Sendungsnummer.</li>
      <li>${svg("atelier")}<strong>Angekommen</strong>Mit Zertifikat und einer Karte zur Pflege.</li>
    </ol>
    <p>Fragen zur Bestellung: <a href="mailto:${daten.kontakt}?subject=${encodeURIComponent("Frage zu meiner Bestellung")}">${daten.kontakt}</a></p>
    <p class="back"><a href="../">← Zu Art</a></p>`;
  return seite({ site, titel: "Danke – Art – Ornament Cloud", beschreibung: "Danke für deine Bestellung.", robots: true, kanon: "art/danke/", kopf, inhalt });
}

/** der Block der Sitemap: alle erzeugten Seiten ohne noindex */
export function sitemapBlock(seiten, stand) {
  const urls = Object.entries(seiten).filter(([, html]) => !html.includes('<meta name="robots" content="noindex">'))
    .map(([p]) => `  <url><loc>https://ornament.cloud/${p.replace(/index\.html$/, "")}</loc><lastmod>${stand}</lastmod></url>`);
  return ["  <!-- ART:START (erzeugt aus src/art/werke.json, tools/build-art.mjs) -->", ...urls, "  <!-- ART:END -->"].join("\n");
}

export function sitemapEinsetzen(xml, block) {
  return /  <!-- ART:START[\s\S]*?<!-- ART:END -->/.test(xml) ? xml.replace(/  <!-- ART:START[\s\S]*?<!-- ART:END -->/, block) : xml.replace("</urlset>", `${block}\n</urlset>`);
}

export function bauen(daten = JSON.parse(readFileSync(new URL("src/art/werke.json", ROOT), "utf8")), masse = JSON.parse(readFileSync(new URL("src/art/bilder.json", ROOT), "utf8"))) {
  const seiten = { "art/index.html": uebersicht(daten, masse), "art/danke/index.html": danke(daten) };
  for (const w of daten.werke) if (w.art !== "dienstleistung") seiten[`art/${w.slug}/index.html`] = werkseite(daten, w, masse);
  return seiten;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const seiten = bauen();
  // Ordner von Werken, die es nicht mehr gibt, wegräumen (nur Ordner mit erzeugter Seite)
  for (const d of readdirSync(new URL("art/", ROOT), { withFileTypes: true })) {
    const p = `art/${d.name}/index.html`;
    if (d.isDirectory() && d.name !== "bilder" && !(p in seiten) && existsSync(new URL(p, ROOT)) && readFileSync(new URL(p, ROOT), "utf8").includes("Erzeugt von tools/build-art.mjs")) rmSync(new URL(`art/${d.name}/`, ROOT), { recursive: true });
  }
  for (const [p, html] of Object.entries(seiten)) {
    mkdirSync(new URL(p.replace(/[^/]+$/, ""), ROOT), { recursive: true });
    writeFileSync(new URL(p, ROOT), html);
  }
  const daten = JSON.parse(readFileSync(new URL("src/art/werke.json", ROOT), "utf8")), sm = new URL("sitemap.xml", ROOT);
  writeFileSync(sm, sitemapEinsetzen(readFileSync(sm, "utf8"), sitemapBlock(seiten, daten.stand)));
  console.log(`Art · ${Object.keys(seiten).length} Seiten → art/, Sitemap`);
}
