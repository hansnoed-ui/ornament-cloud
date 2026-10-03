// «Zu seiner Zeit» – erzeugt den Hypertext unter zu-seiner-zeit/ aus den Daten.
//   node --experimental-strip-types tools/build-zu-seiner-zeit.ts
//
// Quellen:
//   src/data/zu-seiner-zeit.json        – 49 Strophen (Single Source of Truth, wird nie verändert)
//   src/data/zu-seiner-zeit.extra.json  – Ergänzungen: Links, Tags, begriffliche Verwandtschaften, Begriffe
//   src/data/zu-seiner-zeit.en.json, .es.json – Übersetzungen (Englisch, Spanisch; seit 3. Oktober 2026): Strophen, Leitsätze,
//     Notizen zu den Verweisen, Zyklen; Namen und Werktitel bleiben wie im Original. Erzeugt unter zu-seiner-zeit/en/ und /es/
//     mit denselben Adressen wie die deutsche Fassung, dazu der Sprachwechsel oben auf jeder Seite.
// Ausgabe (nie von Hand bearbeiten): zu-seiner-zeit/**/index.html, zu-seiner-zeit/zsz-daten.json,
// dazu der Block zwischen <!-- ZSZ:START --> und <!-- ZSZ:END --> in sitemap.xml.
// Gestaltung und Verhalten liegen von Hand gepflegt in zu-seiner-zeit/zsz.css und zu-seiner-zeit/zsz.js.
// Texte, Titel, Bottom-Lines und Verweise werden wörtlich übernommen; fehlt etwas, bleibt es leer.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const SRC = join(ROOT, "src/data/zu-seiner-zeit.json");
export const EXTRA = join(ROOT, "src/data/zu-seiner-zeit.extra.json");
export const OUT = join(ROOT, "zu-seiner-zeit");
const SITE = "https://ornament.cloud/";
const BASE = "zu-seiner-zeit/";
export const OG_IMAGE = "og-zu-seiner-zeit.png";         // erzeugt mit tools/zsz-og.mjs, nicht vom Build
const GENERATED = ["index.html", "strophe", "verweis", "begriff", "spur", "zufall", "zsz-daten.json", "en", "es"];
export const LANGS = ["de", "en", "es"] as const;
export type Lang = typeof LANGS[number];
export const TR = (lang: Exclude<Lang, "de">) => join(ROOT, `src/data/zu-seiner-zeit.${lang}.json`);
const SPRACHE: Record<Lang, string> = { de: "Deutsch", en: "English", es: "Español" };
const LOCALE: Record<Lang, string> = { de: "de_CH", en: "en_GB", es: "es_ES" };
const vor = (lang: Lang) => lang === "de" ? "" : lang + "/";          // Unterordner einer Sprache unter zu-seiner-zeit/

// Texte der Oberfläche je Sprache (die Inhalte kommen aus den Daten)
const UI = {
  de: { skip: "Zum Inhalt", spur: "Spur", zufall: "Zufall", verweise: "Verweise", sprache: "Sprache", weiterdenken: "Weiterdenken",
    schliessen: "Schliessen", verweis: "Verweis", fuerDiese: "Für diese Strophe", weitere: "Weitere Strophen", dasselbeWerk: "dasselbe Werk",
    alleStellen: (n: string) => `Alle Stellen zu ${n}`, externerLink: "Externer Link", weiterZufall: "Weiter mit dem Zufall", blaettern: "Blättern",
    verwandt: "Verwandte Strophen", sequenz: "Sequenz", begrifflich: "Begrifflich verwandt", resonanzen: "Resonanzen über Personen und Werke",
    ueber: "über", inSpur: "Diese Strophe in der Spur", beginnen: "Mit dem Zufall beginnen", ohneWerk: "ohne Werkangabe",
    werke: "Werke und Quellen", inStrophen: "In den Strophen", extern: "Extern", inDerSpur: "In der Spur", alleVerweise: "Alle Verweise",
    strophenZahl: (n: number) => n === 1 ? "eine Strophe" : `${n} Strophen`, in: "in", personen: "Personen", jeStrophe: "je Strophe vier Verweise",
    allePersonen: (t: string) => `Alle Personen, auf die ${t} verweist.`, begriff: "Begriff",
    spurText: "Immer nur eine lokale Konstellation: jede Navigation zeigt eine neue gegenwärtige Nachbarschaft.",
    spurNoscript: "Die Spur zeigt immer nur die Nachbarschaft einer Strophe und braucht dafür JavaScript.", zuAllen: "Zu allen Strophen",
    zufallStatus: "Eine Strophe wird gewählt …", zufallNoscript: "Der Zufall braucht JavaScript.", zufallText: "Eine der 49 Strophen, gleichverteilt gewählt.",
    ogAlt: "Daneben sieben Reihen zu sieben Punkten: 49 Strophen in sieben Zyklen.",
    monate: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
    datum: (d: number, m: string, y: number) => `${d}. ${m} ${y}` },
  en: { skip: "Skip to content", spur: "Trace", zufall: "Chance", verweise: "References", sprache: "Language", weiterdenken: "Thinking further",
    schliessen: "Close", verweis: "Reference", fuerDiese: "For this stanza", weitere: "Further stanzas", dasselbeWerk: "same work",
    alleStellen: (n: string) => `All passages on ${n}`, externerLink: "External link", weiterZufall: "Continue by chance", blaettern: "Browse",
    verwandt: "Related stanzas", sequenz: "Sequence", begrifflich: "Conceptually related", resonanzen: "Resonances through persons and works",
    ueber: "via", inSpur: "This stanza in the trace", beginnen: "Begin with chance", ohneWerk: "no work given",
    werke: "Works and sources", inStrophen: "In the stanzas", extern: "External", inDerSpur: "In the trace", alleVerweise: "All references",
    strophenZahl: (n: number) => n === 1 ? "one stanza" : `${n} stanzas`, in: "in", personen: "persons", jeStrophe: "four references per stanza",
    allePersonen: (t: string) => `All persons referred to in ${t}.`, begriff: "Concept",
    spurText: "Only ever one local constellation: every move shows a new present neighbourhood.",
    spurNoscript: "The trace only ever shows the neighbourhood of a stanza and needs JavaScript for this.", zuAllen: "To all stanzas",
    zufallStatus: "Choosing a stanza …", zufallNoscript: "Chance needs JavaScript.", zufallText: "One of the 49 stanzas, chosen with equal probability.",
    ogAlt: "Beside it, seven rows of seven dots: 49 stanzas in seven cycles.",
    monate: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    datum: (d: number, m: string, y: number) => `${d} ${m} ${y}` },
  es: { skip: "Ir al contenido", spur: "Huella", zufall: "Azar", verweise: "Referencias", sprache: "Idioma", weiterdenken: "Seguir pensando",
    schliessen: "Cerrar", verweis: "Referencia", fuerDiese: "Para esta estrofa", weitere: "Otras estrofas", dasselbeWerk: "la misma obra",
    alleStellen: (n: string) => `Todos los pasajes sobre ${n}`, externerLink: "Enlace externo", weiterZufall: "Seguir con el azar", blaettern: "Hojear",
    verwandt: "Estrofas relacionadas", sequenz: "Secuencia", begrifflich: "Relacionadas conceptualmente", resonanzen: "Resonancias a través de personas y obras",
    ueber: "a través de", inSpur: "Esta estrofa en la huella", beginnen: "Empezar con el azar", ohneWerk: "sin indicación de obra",
    werke: "Obras y fuentes", inStrophen: "En las estrofas", extern: "Externo", inDerSpur: "En la huella", alleVerweise: "Todas las referencias",
    strophenZahl: (n: number) => n === 1 ? "una estrofa" : `${n} estrofas`, in: "en", personen: "personas", jeStrophe: "cuatro referencias por estrofa",
    allePersonen: (t: string) => `Todas las personas a las que remite ${t}.`, begriff: "Concepto",
    spurText: "Siempre una sola constelación local: cada paso muestra una nueva vecindad presente.",
    spurNoscript: "La huella muestra siempre solo la vecindad de una estrofa y necesita JavaScript para ello.", zuAllen: "A todas las estrofas",
    zufallStatus: "Se elige una estrofa …", zufallNoscript: "El azar necesita JavaScript.", zufallText: "Una de las 49 estrofas, elegida con igual probabilidad.",
    ogAlt: "Al lado, siete filas de siete puntos: 49 estrofas en siete ciclos.",
    monate: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
    datum: (d: number, m: string, y: number) => `${d} de ${m} de ${y}` },
};

/** Übersetzung über die deutschen Daten legen: Texte ersetzen, Namen, Werktitel, Nummern und Adressen bleiben */
export function uebersetzen(raw: any, tr: any) {
  const S = raw.stanzas.map((s: any) => {
    const t = tr.stanzas[s.number];
    if (!t || !t.title || !t.bottom_line || !t.text || t.notes?.length !== 4) throw new Error(`Übersetzung ${tr.lang}: Strophe ${s.number} unvollständig`);
    return { ...s, slug_title: s.title, title: t.title, bottom_line: t.bottom_line, text: t.text,
      references: s.references.map((r: any, i: number) => {
        const { person, work } = splitCitation(r.citation);
        const w = t.works?.[i] ?? work;
        if (!tr.domains[r.domain]) throw new Error(`Übersetzung ${tr.lang}: Rubrik ${r.domain} fehlt`);
        return { domain: tr.domains[r.domain], citation: w ? `${person}, ${w}` : person, resonance: t.notes[i] };
      }) };
  });
  const cycles = raw.cycles.map((c: any) => {
    const t = tr.cycles[c.roman];
    if (!t?.name || !t?.deck) throw new Error(`Übersetzung ${tr.lang}: Zyklus ${c.roman} fehlt`);
    return { ...c, name: t.name, deck: t.deck };
  });
  return { ...raw, subtitle: tr.subtitle, structure: tr.structure, version: tr.version, cycles,
    stanzas: S.map((s: any) => ({ ...s, cycle: { ...s.cycle, name: cycles.find((c: any) => c.roman === s.cycle.roman).name } })) };
}

// ---------- Hilfen ----------
const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Adressteil aus einem Namen: klein, Umlaute umschreiben, Akzente weg, sonst nur a–z, 0–9 und Bindestrich */
export function slugify(s: string): string {
  const map: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss", ł: "l", ø: "o", æ: "ae", œ: "oe", đ: "d" };
  return s.toLowerCase().replace(/[äöüßłøæœđ]/g, c => map[c])
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** «Person, Werk» – getrennt wird beim ersten Komma; Werktitel dürfen selbst Kommas enthalten */
export function splitCitation(c: string): { person: string; work: string | null } {
  const i = c.indexOf(", ");
  return i < 0 ? { person: c, work: null } : { person: c.slice(0, i), work: c.slice(i + 2) };
}

const DATUM = (iso: string, lang: Lang = "de") => {
  const [y, m, d] = iso.split("-").map(Number);
  return UI[lang].datum(d, UI[lang].monate[m - 1], y);
};

// ---------- Datenmodell ----------
type Ref = { discipline: string; person: string; work: string | null; note: string; url: string | null; slug: string; tags: string[];
  internalLinks: { id: number; sameWork: boolean }[] };
type Stanza = { id: number; slug: string; cycle: string; cycleTitle: string; title: string; bottomLine: string; text: string;
  status: string; references: Ref[]; tags: string[];
  related: { sequence: { prev: number | null; next: number | null }; conceptual: number[];
    resonances: { id: number; via: { slug: string; person: string; sameWork: boolean }[] }[] } };
type Person = { slug: string; name: string; disciplines: string[]; url: string | null; tags: string[];
  works: { work: string | null; stanzas: number[] }[]; occurrences: { stanza: number; discipline: string; work: string | null; note: string }[] };
type Begriff = { slug: string; name: string; stanzas: number[] };

export function model(raw = JSON.parse(readFileSync(SRC, "utf8")), extra = JSON.parse(readFileSync(EXTRA, "utf8")), lang: Lang = "de") {
  if (lang !== "de") raw = uebersetzen(raw, JSON.parse(readFileSync(TR(lang), "utf8")));
  const S: any[] = raw.stanzas;
  if (S.length !== 49 || S.some((s, i) => s.number !== i + 1)) throw new Error("erwartet 49 Strophen, lückenlos nummeriert");
  const cycles = raw.cycles.map((c: any) => ({ roman: c.roman as string, name: c.name as string, deck: c.deck as string, stanzas: c.stanzas as number[] }));
  const cycleOf = (n: number) => cycles.find((c: any) => c.stanzas.includes(n));

  // Ergänzungen prüfen: nur bekannte Strophen, gültige Nummern, sichere Links
  const ex = { strophen: extra.strophen ?? {}, personen: extra.personen ?? {}, begriffe: extra.begriffe ?? [] };
  const okUrl = (u: unknown) => u == null || (typeof u === "string" && /^https:\/\/\S+$/.test(u));
  for (const [k, v] of Object.entries<any>(ex.strophen)) {
    const n = Number(k);
    if (!(n >= 1 && n <= 49)) throw new Error(`extra.strophen: unbekannte Strophe ${k}`);
    for (const r of v.related ?? []) if (!(r >= 1 && r <= 49) || r === n) throw new Error(`extra.strophen.${k}.related: ${r}`);
  }

  const persons = new Map<string, Person>();
  const stanzas: Stanza[] = S.map(s => {
    const c = cycleOf(s.number);
    if (!c || c.roman !== s.cycle.roman) throw new Error(`Strophe ${s.number}: Zyklus stimmt nicht`);
    return {
      // Adresse immer aus dem deutschen Titel (gleich in allen Sprachen)
      id: s.number, slug: `${s.number}-${slugify(s.slug_title ?? s.title)}`, cycle: c.roman, cycleTitle: c.name,
      title: s.title, bottomLine: s.bottom_line, text: s.text, status: s.editorial_status,
      tags: ex.strophen[s.number]?.tags ?? [],
      references: s.references.map((r: any) => {
        const { person, work } = splitCitation(r.citation);
        const slug = slugify(person);
        let p = persons.get(slug);
        if (!p) persons.set(slug, p = { slug, name: person, disciplines: [], url: ex.personen[slug]?.url ?? null, tags: ex.personen[slug]?.tags ?? [], works: [], occurrences: [] });
        if (p.name !== person) throw new Error(`Adresse doppelt vergeben: ${slug} (${p.name} / ${person})`);
        if (!p.disciplines.includes(r.domain)) p.disciplines.push(r.domain);
        let w = p.works.find(x => x.work === work);
        if (!w) p.works.push(w = { work, stanzas: [] });
        w.stanzas.push(s.number);
        p.occurrences.push({ stanza: s.number, discipline: r.domain, work, note: r.resonance });
        return { discipline: r.domain, person, work, note: r.resonance, url: null, slug, tags: [], internalLinks: [] } as Ref;
      }),
      related: { sequence: { prev: s.number > 1 ? s.number - 1 : null, next: s.number < 49 ? s.number + 1 : null },
        conceptual: ex.strophen[s.number]?.related ?? [], resonances: [] },
    };
  });
  for (const k of Object.keys(ex.personen)) if (!persons.has(k)) throw new Error(`extra.personen: unbekannte Person ${k}`);
  for (const p of persons.values()) if (!okUrl(p.url)) throw new Error(`extra.personen.${p.slug}.url: nur https-Adressen`);

  // Resonanzen: andere Strophen mit derselben Person (und ob es dasselbe Werk ist)
  for (const s of stanzas) {
    const res = new Map<number, { slug: string; person: string; sameWork: boolean }[]>();
    for (const r of s.references) {
      const p = persons.get(r.slug)!;
      r.url = p.url;
      for (const o of p.occurrences) if (o.stanza !== s.id) {
        const sameWork = o.work === r.work;
        r.internalLinks.push({ id: o.stanza, sameWork });
        if (!res.has(o.stanza)) res.set(o.stanza, []);
        res.get(o.stanza)!.push({ slug: p.slug, person: p.name, sameWork });
      }
    }
    s.related.resonances = [...res.entries()].sort((a, b) => a[0] - b[0]).map(([id, via]) => ({ id, via }));
  }

  const slugs = new Set<string>();
  for (const x of [...stanzas.map(s => "s/" + s.slug), ...[...persons.keys()].map(k => "p/" + k)]) {
    if (slugs.has(x)) throw new Error(`Adresse doppelt: ${x}`);
    slugs.add(x);
  }
  const begriffe: Begriff[] = ex.begriffe.map((b: any) => {
    if (!b.slug || b.slug !== slugify(b.slug) || !b.name) throw new Error(`extra.begriffe: slug und name nötig (${JSON.stringify(b)})`);
    for (const n of b.stanzas ?? []) if (!(n >= 1 && n <= 49)) throw new Error(`extra.begriffe.${b.slug}: Strophe ${n}`);
    return { slug: b.slug, name: b.name, stanzas: b.stanzas ?? [] };
  });
  return { lang, meta: { title: raw.title as string, subtitle: raw.subtitle as string, version: raw.version as string, date: raw.date as string, structure: raw.structure as string },
    cycles, stanzas, persons: [...persons.values()], begriffe };
}

// ---------- Seiten ----------
type M = ReturnType<typeof model>;

function page(m: M, o: { depth: number; title: string; description: string; body: string; seite: string; path: string; v: string; noindex?: boolean }) {
  const u = UI[m.lang];
  const p = "../".repeat(o.depth);                         // zur Wurzel dieser Sprache (zu-seiner-zeit/ oder zu-seiner-zeit/en/ …)
  const wurzel = p + (m.lang === "de" ? "" : "../");      // zu zu-seiner-zeit/ (Gestaltung und Verhalten für alle Sprachen)
  const site = wurzel + "../";                             // zur Website
  const url = (l: Lang) => `${SITE}${BASE}${vor(l)}${o.path}`;
  // Sprachwechsel: dieselbe Seite in den anderen Sprachen (gleiche Adressen); oben auf jeder Seite
  const ziel = (l: Lang) => `${wurzel}${vor(l)}${o.path}` || "./";
  const sprachen = LANGS.map(l => `<a href="${ziel(l)}" hreflang="${l}" lang="${l}"${l === m.lang ? ' aria-current="true"' : ""}>${SPRACHE[l]}</a>`).join("\n      ");
  return `<!DOCTYPE html>
<!-- Erzeugt von tools/build-zu-seiner-zeit.ts aus src/data/zu-seiner-zeit*.json – nicht von Hand bearbeiten. -->
<html lang="${m.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(o.title)}</title>
  <meta name="description" content="${esc(o.description)}">
  <link rel="canonical" href="${url(m.lang)}">${o.noindex ? '\n  <meta name="robots" content="noindex">' : ""}
${LANGS.map(l => `  <link rel="alternate" hreflang="${l}" href="${url(l)}">`).join("\n")}
  <link rel="alternate" hreflang="x-default" href="${url("de")}">
  <!-- Vorschaubild beim Teilen (tools/zsz-og.mjs) -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="ornament.cloud">
  <meta property="og:locale" content="${LOCALE[m.lang]}">
  <meta property="og:url" content="${url(m.lang)}">
  <meta property="og:title" content="${esc(o.title)}">
  <meta property="og:description" content="${esc(o.description)}">
  <meta property="og:image" content="${SITE}${BASE}${OG_IMAGE}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(`${m.meta.title} – ${m.meta.subtitle}. ${u.ogAlt}`)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#111111" media="(prefers-color-scheme: dark)">
  <link rel="stylesheet" href="${wurzel}zsz.css?v=${o.v}">
  <script type="module" src="${wurzel}zsz.js?v=${o.v}"></script>
</head>
<body data-seite="${o.seite}" data-basis="${p || "./"}">
  <a class="zsz-skip" href="#inhalt">${u.skip}</a>
  <nav class="seitenweg" aria-label="Ornament Cloud">
    <a href="${site}" aria-current="true">Ornament Cloud</a>
    <a href="${site}alpha/drittes-rad/">Das Dritte Rad</a>
  </nav>
  <header class="zsz-kopf">
    <a class="zsz-werk" href="${p || "./"}">${esc(m.meta.title)}</a>
    <nav class="zsz-nav" aria-label="${esc(m.meta.title)}">
      <a href="${p}spur/"${o.seite === "spur" ? ' aria-current="page"' : ""}>${u.spur}</a>
      <a href="${p}zufall/${o.seite === "strophe" ? `?von=${o.path.match(/strophe\/(\d+)-/)?.[1] ?? ""}` : ""}" data-zufall>${u.zufall}</a>
      <a href="${p}verweis/"${o.seite === "verweise" ? ' aria-current="page"' : ""}>${u.verweise}</a>
      <a class="zsz-site" href="${site}">ornament.cloud</a>
    </nav>
    <nav class="zsz-sprachen" aria-label="${u.sprache}">
      ${sprachen}
    </nav>
  </header>
  <main id="inhalt" tabindex="-1">
${o.body}
  </main>
  <footer class="zsz-fuss">
    <p>${esc(m.meta.title)} · ${esc(m.meta.version)} · ${esc(DATUM(m.meta.date, m.lang))}</p>
  </footer>
  <script data-goatcounter="https://ornament-cloud.goatcounter.com/count" async src="${site}vendor/goatcounter/count.js"></script>
</body>
</html>
`;
}

const stanzaHref = (m: M, id: number, depth: number) => `${"../".repeat(depth)}strophe/${m.stanzas[id - 1].slug}/`;
const nt = (m: M, id: number) => `<span class="zsz-nr">${id}</span> ${esc(m.stanzas[id - 1].title)}`;

function stanzaPage(m: M, s: Stanza, v: string) {
  const u = UI[m.lang];
  const d = 2, P = (id: number) => stanzaHref(m, id, d);
  const cyc = m.cycles.find(c => c.roman === s.cycle)!;
  const refs = s.references.map((r, i) => `        <li class="verweis">
          <p class="zsz-label">${esc(r.discipline)}</p>
          <p class="verweis-person"><a href="../../verweis/${r.slug}/" data-panel="verweis-${r.slug}" aria-haspopup="dialog">${esc(r.person)}</a></p>
          ${r.work ? `<p class="verweis-werk">${esc(r.work)}</p>` : ""}
          <p class="verweis-note">${esc(r.note)}</p>
        </li>`).join("\n");
  const panels = s.references.map(r => {
    const weitere = r.internalLinks.map(l => `<li><a href="${P(l.id)}">${nt(m, l.id)}</a>${l.sameWork ? ` <span class="zsz-hinweis">${u.dasselbeWerk}</span>` : ""}</li>`).join("");
    return `    <dialog class="zsz-panel" id="verweis-${r.slug}" aria-labelledby="verweis-${r.slug}-name">
      <form method="dialog" class="zsz-panel-zu"><button type="submit">${u.schliessen}</button></form>
      <p class="zsz-label">${u.verweis} · ${esc(r.discipline)}</p>
      <h2 id="verweis-${r.slug}-name">${esc(r.person)}</h2>
      ${r.work ? `<p class="verweis-werk">${esc(r.work)}</p>` : ""}
      <h3 class="zsz-label">${u.fuerDiese}</h3>
      <p>${esc(r.note)}</p>
      ${weitere ? `<h3 class="zsz-label">${u.weitere}</h3>\n      <ul class="zsz-liste">${weitere}</ul>` : ""}
      <p class="zsz-weiter"><a href="../../verweis/${r.slug}/">${esc(u.alleStellen(r.person))} <span aria-hidden="true">→</span></a></p>
      ${r.url ? `<p class="zsz-weiter"><a href="${esc(r.url)}" rel="noopener">${u.externerLink} <span aria-hidden="true">↗</span></a></p>` : ""}
    </dialog>`;
  }).join("\n");
  const seq = cyc.stanzas.map(id => `<li>${id === s.id ? `<span aria-current="page">${nt(m, id)}</span>` : `<a href="${P(id)}">${nt(m, id)}</a>`}</li>`).join("");
  const begr = s.related.conceptual.map(id => `<li><a href="${P(id)}">${nt(m, id)}</a></li>`).join("");
  const reso = s.related.resonances.map(r => `<li><a href="${P(r.id)}">${nt(m, r.id)}</a> <span class="zsz-hinweis">${u.ueber} ${r.via.map(x => esc(x.person) + (x.sameWork ? ` (${u.dasselbeWerk})` : "")).join(", ")}</span></li>`).join("");
  const body = `    <article class="strophe zsz-spalte">
      <p class="zsz-meta">${s.cycle} · ${esc(s.cycleTitle)} · ${s.id} / 49</p>
      <h1 class="strophe-titel">${esc(s.title)}</h1>
      <p class="bottom-line">${esc(s.bottomLine)}</p>
      <div class="strophe-text"><p>${esc(s.text)}</p></div>
      <p class="zsz-zufall"><a class="zsz-knopf" href="../../zufall/?von=${s.id}" data-zufall>${u.weiterZufall} <span aria-hidden="true">→</span></a></p>
    </article>
    <section class="weiterdenken" aria-labelledby="weiterdenken">
      <h2 class="zsz-label zsz-abschnitt" id="weiterdenken">${u.weiterdenken}</h2>
      <ol class="verweise">
${refs}
      </ol>
    </section>
${panels}
    <nav class="blaettern zsz-spalte" aria-label="${u.blaettern}">
      ${s.related.sequence.prev ? `<a class="zurueck" href="${P(s.related.sequence.prev)}" rel="prev"><span aria-hidden="true">←</span> ${nt(m, s.related.sequence.prev)}</a>` : "<span></span>"}
      ${s.related.sequence.next ? `<a class="vor" href="${P(s.related.sequence.next)}" rel="next">${nt(m, s.related.sequence.next)} <span aria-hidden="true">→</span></a>` : "<span></span>"}
    </nav>
    <section class="verwandt zsz-spalte" aria-labelledby="verwandt">
      <h2 class="zsz-label zsz-abschnitt" id="verwandt">${u.verwandt}</h2>
      <h3 class="zsz-label">${u.sequenz} · ${s.cycle} ${esc(s.cycleTitle)}</h3>
      <ol class="zsz-liste">${seq}</ol>
      ${begr ? `<h3 class="zsz-label">${u.begrifflich}</h3>\n      <ul class="zsz-liste">${begr}</ul>` : ""}
      ${reso ? `<h3 class="zsz-label">${u.resonanzen}</h3>\n      <ul class="zsz-liste">${reso}</ul>` : ""}
      <p class="zsz-weiter"><a href="../../spur/?s=${s.id}">${u.inSpur} <span aria-hidden="true">→</span></a></p>
    </section>`;
  return page(m, { depth: d, title: `${s.id} ${s.title} – ${m.meta.title}`, description: s.bottomLine, body, seite: "strophe", path: `strophe/${s.slug}/`, v });
}

function indexPage(m: M, v: string) {
  const u = UI[m.lang];
  const cycles = m.cycles.map(c => `    <section class="zyklus" aria-labelledby="zyklus-${c.roman}">
      <h2 id="zyklus-${c.roman}"><span class="zsz-roemisch">${c.roman}</span> ${esc(c.name)}</h2>
      <p class="zyklus-deck">${esc(c.deck)}</p>
      <ol class="zyklus-strophen">
${c.stanzas.map(id => { const s = m.stanzas[id - 1]; return `        <li><a href="strophe/${s.slug}/"><span class="zsz-nr">${id}</span> <span class="zyklus-titel">${esc(s.title)}</span></a>
          <p class="bottom-line">${esc(s.bottomLine)}</p></li>`; }).join("\n")}
      </ol>
    </section>`).join("\n");
  const body = `    <div class="zsz-spalte titelei">
      <h1 class="werk-titel">${esc(m.meta.title)}</h1>
      <p class="werk-untertitel">${esc(m.meta.subtitle)}</p>
      <p class="zsz-meta">${esc(m.meta.structure)}</p>
      <p class="zsz-zufall"><a class="zsz-knopf" href="zufall/" data-zufall>${u.beginnen} <span aria-hidden="true">→</span></a></p>
    </div>
    <div class="zsz-spalte zyklen">
${cycles}
    </div>`;
  return page(m, { depth: 0, title: `${m.meta.title} – ${m.meta.subtitle}`, description: m.meta.subtitle, body, seite: "index", path: "", v });
}

function personPage(m: M, p: Person, v: string) {
  const u = UI[m.lang];
  const works = p.works.map(w => `<li>${w.work ? `<span class="verweis-werk">${esc(w.work)}</span>` : u.ohneWerk} <span class="zsz-hinweis">${w.stanzas.map(id => `<a href="${stanzaHref(m, id, 2)}">${id}</a>`).join(", ")}</span></li>`).join("");
  const occ = p.occurrences.map(o => { const s = m.stanzas[o.stanza - 1]; return `        <li>
          <p class="zsz-meta">${s.cycle} · ${esc(s.cycleTitle)} · ${esc(o.discipline)}</p>
          <p class="stelle-titel"><a href="${stanzaHref(m, s.id, 2)}">${nt(m, s.id)}</a></p>
          ${o.work ? `<p class="verweis-werk">${esc(o.work)}</p>` : ""}
          <p class="verweis-note">${esc(o.note)}</p>
        </li>`; }).join("\n");
  const body = `    <div class="zsz-spalte verweisseite">
      <p class="zsz-meta">${u.verweis} · ${p.disciplines.map(esc).join(", ")}</p>
      <h1 class="strophe-titel">${esc(p.name)}</h1>
      <h2 class="zsz-label zsz-abschnitt">${u.werke}</h2>
      <ul class="zsz-liste">${works}</ul>
      <h2 class="zsz-label zsz-abschnitt">${u.inStrophen}</h2>
      <ol class="stellen">
${occ}
      </ol>
      ${p.url ? `<h2 class="zsz-label zsz-abschnitt">${u.extern}</h2>\n      <p><a href="${esc(p.url)}" rel="noopener">${esc(p.url)} <span aria-hidden="true">↗</span></a></p>` : ""}
      <p class="zsz-weiter"><a href="../../spur/?p=${p.slug}">${u.inDerSpur} <span aria-hidden="true">→</span></a> · <a href="../">${u.alleVerweise}</a></p>
    </div>`;
  return page(m, { depth: 2, title: `${p.name} – ${m.meta.title}`, description: `${p.name}: ${u.strophenZahl(p.occurrences.length)} ${u.in} ${m.meta.title}`, body, seite: "verweis", path: `verweis/${p.slug}/`, v });
}

// Nachname zum Sortieren: letztes Wort ohne Zusätze in Klammern («Marilyn Strathern (Hg.)» → Strathern)
const nachname = (n: string) => n.replace(/\s*\([^)]*\)/g, "").trim().split(" ").slice(-1)[0];
function personsIndex(m: M, v: string) {
  const u = UI[m.lang];
  const sorted = [...m.persons].sort((a, b) => nachname(a.name).localeCompare(nachname(b.name), m.lang) || a.name.localeCompare(b.name, m.lang));
  // Rubriken aus den Daten (nicht fest verdrahtet): nach Verweisposition ¹–⁴, dann nach erstem Vorkommen –
  // so steht z. B. «Kybernetik» (Strophe 4, ¹) nach «Soziologie» und vor «Philosophie»
  const groups: string[] = [];
  for (let i = 0; i < 4; i++) for (const s of m.stanzas) { const g = s.references[i]?.discipline; if (g && !groups.includes(g)) groups.push(g); }
  const list = groups.map(g => `      <section class="verweis-gruppe" aria-labelledby="g-${slugify(g)}">
        <h2 class="zsz-label zsz-abschnitt" id="g-${slugify(g)}">${g}</h2>
        <ul class="zsz-liste personen">${sorted.filter(p => p.disciplines.includes(g)).map(p => `<li><a href="${p.slug}/">${esc(p.name)}</a> <span class="zsz-hinweis">${p.occurrences.map(o => o.stanza).join(", ")}</span></li>`).join("")}</ul>
      </section>`).join("\n");
  const body = `    <div class="zsz-spalte">
      <h1 class="strophe-titel">${u.verweise}</h1>
      <p class="zsz-meta">${m.persons.length} ${u.personen} · ${u.jeStrophe}: ${groups.join(", ")}</p>
${list}
    </div>`;
  return page(m, { depth: 1, title: `${u.verweise} – ${m.meta.title}`, description: u.allePersonen(m.meta.title), body, seite: "verweise", path: "verweis/", v });
}

function begriffPage(m: M, b: Begriff, v: string) {
  const u = UI[m.lang];
  const body = `    <div class="zsz-spalte">
      <p class="zsz-meta">${u.begriff}</p>
      <h1 class="strophe-titel">${esc(b.name)}</h1>
      <ul class="zsz-liste">${b.stanzas.map(id => `<li><a href="${stanzaHref(m, id, 2)}">${nt(m, id)}</a></li>`).join("")}</ul>
    </div>`;
  return page(m, { depth: 2, title: `${b.name} – ${m.meta.title}`, description: `${u.begriff}: ${b.name}`, body, seite: "begriff", path: `begriff/${b.slug}/`, v });
}

function spurPage(m: M, v: string) {
  const u = UI[m.lang];
  const body = `    <div class="zsz-spalte spur" data-spur>
      <h1 class="zsz-label zsz-abschnitt">${u.spur}</h1>
      <div class="spur-feld" aria-live="polite"></div>
      <noscript><p>${u.spurNoscript} <a href="../">${u.zuAllen}</a></p></noscript>
    </div>`;
  return page(m, { depth: 1, title: `${u.spur} – ${m.meta.title}`, description: u.spurText, body, seite: "spur", path: "spur/", v });
}

function zufallPage(m: M, v: string) {
  const u = UI[m.lang];
  const body = `    <div class="zsz-spalte">
      <h1 class="zsz-label zsz-abschnitt">${u.zufall}</h1>
      <p class="zufall-status">${u.zufallStatus}</p>
      <noscript><p>${u.zufallNoscript} <a href="../">${u.zuAllen}</a></p></noscript>
    </div>`;
  return page(m, { depth: 1, title: `${u.zufall} – ${m.meta.title}`, description: u.zufallText, body, seite: "zufall", path: "zufall/", v, noindex: true });   // leitet nur weiter
}

/** Daten für Spur und Zufall (im Browser) */
function clientData(m: M) {
  return {
    stanzas: m.stanzas.map(s => ({ id: s.id, slug: s.slug, cycle: s.cycle, cycleTitle: s.cycleTitle, title: s.title, bottomLine: s.bottomLine,
      refs: s.references.map(r => ({ slug: r.slug, discipline: r.discipline })), conceptual: s.related.conceptual,
      resonances: s.related.resonances.map(r => ({ id: r.id, via: r.via.map(x => x.slug) })) })),
    persons: Object.fromEntries(m.persons.map(p => [p.slug, { name: p.name, disciplines: p.disciplines, stanzas: p.occurrences.map(o => o.stanza) }])),
  };
}

/** Alle erzeugten Dateien einer Sprache: Pfad relativ zu zu-seiner-zeit/ → Inhalt (ohne m: alle drei Sprachen) */
export function files(m?: M) {
  if (!m) { const all = new Map<string, string>(); for (const l of LANGS) for (const [k, c] of files(model(undefined, undefined, l))) all.set(k, c); return all; }
  // Version: Hash über Gestaltung, Verhalten und die Daten aller Sprachen; hängt an CSS und JS (Zwischenspeicher umgehen)
  const h = createHash("sha256");
  for (const f of ["zsz.css", "zsz.js"]) h.update(readFileSync(join(OUT, f)));
  for (const l of LANGS) h.update(JSON.stringify(clientData(l === m.lang ? m : model(undefined, undefined, l))));
  const v = h.digest("hex").slice(0, 10);
  const out = new Map<string, string>(), pre = vor(m.lang);
  out.set(pre + "index.html", indexPage(m, v));
  for (const s of m.stanzas) out.set(`${pre}strophe/${s.slug}/index.html`, stanzaPage(m, s, v));
  out.set(pre + "verweis/index.html", personsIndex(m, v));
  for (const p of m.persons) out.set(`${pre}verweis/${p.slug}/index.html`, personPage(m, p, v));
  for (const b of m.begriffe) out.set(`${pre}begriff/${b.slug}/index.html`, begriffPage(m, b, v));
  out.set(pre + "spur/index.html", spurPage(m, v));
  out.set(pre + "zufall/index.html", zufallPage(m, v));
  out.set(pre + "zsz-daten.json", JSON.stringify(clientData(m)) + "\n");
  return out;
}

/** Sitemap-Block zwischen den Marken (alle Sprachen) */
export function sitemapBlock(m = model(), f = files()) {
  return [...f.keys()].filter(k => k.endsWith("index.html") && !f.get(k)!.includes('<meta name="robots" content="noindex">'))
    .map(k => k.replace(/index\.html$/, "")).sort()
    .map(k => `  <url><loc>${SITE}${BASE}${k}</loc><lastmod>${m.meta.date}</lastmod></url>`).join("\n");
}

export function build() {
  const m = model(), f = files();
  for (const g of GENERATED) rmSync(join(OUT, g), { recursive: true, force: true });   // nur Erzeugtes, nie zsz.css/zsz.js
  for (const [k, c] of f) { const p = join(OUT, k); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, c); }
  const sm = join(ROOT, "sitemap.xml"), xml = readFileSync(sm, "utf8");
  const START = "<!-- ZSZ:START -->", END = "<!-- ZSZ:END -->";
  const block = `${START}\n${sitemapBlock(m, f)}\n  ${END}`;
  const next = xml.includes(START) ? xml.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block) : xml.replace("</urlset>", `  ${block}\n</urlset>`);
  writeFileSync(sm, next);
  return { stanzas: m.stanzas.length, persons: m.persons.length, begriffe: m.begriffe.length, files: f.size };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = build();
  console.log(`Zu seiner Zeit · ${r.stanzas} Strophen · ${r.persons} Verweise · ${r.begriffe} Begriffe · ${r.files} Dateien in ${LANGS.length} Sprachen → zu-seiner-zeit/`);
}
