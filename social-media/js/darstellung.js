// Social Media – Darstellung (seit 19. Oktober 2026): aus den Daten (social-media/daten/eintraege.json) werden alle Seiten des Bereichs.
// Ein Modul für beide Orte: Die Redaktion (social-media/redaktion/) erzeugt damit im Browser die Seiten, die sie mit einem Commit veröffentlicht,
// tools/build-social-media.mjs erzeugt dieselben Seiten in Node, und tests/social-media.test.mjs prüft, dass beide übereinstimmen.
// Darum ohne Intl und ohne localeCompare: Datum, Zahlen und Reihenfolge sind hier von Hand gerechnet und überall Zeichen für Zeichen gleich.
//
// Zwei Stimmen, zwei Schriften: Der Beitrag (die Abschrift) steht in der Schrift der Website, wie auf der Plattform; der Kommentar steht in Newsreader.

import { welleUndMenu } from "../../kopfleiste.js";
import { PLATTFORMEN, PLATTFORM_NAME, profilUrl } from "./quelle.js";

export const ADRESSE = "https://ornament.cloud/";
export const BEREICH = "social-media/";
export const MARKE = { styles: 46, icons: 14, social: 1 };   // ?v= der eingebundenen Dateien (styles.css, icons.js, social.css/-js)
export const KENNZAHLEN = ["antworten", "reposts", "likes", "ansichten", "lesezeichen", "reaktionen", "kommentare", "teilungen"];
/** Arten von Verweisen: [vom Zettel aus gelesen, vom Ziel aus gelesen] */
export const VERWEIS_ARTEN = { antwort: ["Antwort auf", "Antwort darauf"], widerspruch: ["Widerspruch zu", "Widerspruch dazu"], ergaenzung: ["Ergänzung zu", "Ergänzung dazu"],
  kontext: ["Kontext:", "Kontext dazu"], fortsetzung: ["Fortsetzung von", "Fortsetzung"] };

// ---------- Grundbausteine ----------

/** für Text und Attribute */
export const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const FALTEN = { ä: "a", ö: "o", ü: "u", ß: "ss", à: "a", á: "a", â: "a", é: "e", è: "e", ê: "e", ë: "e", í: "i", ì: "i", î: "i", ï: "i", ó: "o", ò: "o", ô: "o", ú: "u", ù: "u", û: "u", ç: "c", ñ: "n", ø: "o", å: "a", æ: "ae", œ: "oe" };
/** zum Sortieren und für Adressen: klein, ohne Akzente */
export const falten = (s) => String(s ?? "").toLowerCase().replace(/[äöüßàáâéèêëíìîïóòôúùûçñøåæœ]/g, (z) => FALTEN[z]);
/** Wort für Adressen: «Künstliche Intelligenz» → «kuenstliche-intelligenz» (Umlaute ausgeschrieben, wie im Deutschen) */
export function slug(s, max = 60) {
  const t = String(s ?? "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  return falten(t).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max).replace(/-+$/, "") || "x";
}
/** Vergleich für die Reihenfolge von Namen und Schlagworten */
export const vergleich = (a, b) => { const x = falten(a), y = falten(b); return x < y ? -1 : x > y ? 1 : a < b ? -1 : a > b ? 1 : 0; };

// ---------- Zeit (Europe/Zurich, von Hand: MEZ/MESZ nach der EU-Regel) ----------

const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const MONATE_KURZ = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
const TAGE_RFC = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MONATE_RFC = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const zwei = (n) => String(n).padStart(2, "0");

/** letzter Sonntag eines Monats (monat 0–11), als Tag im Monat */
function letzterSonntag(jahr, monat) {
  const letzter = new Date(Date.UTC(jahr, monat + 1, 0));
  return letzter.getUTCDate() - letzter.getUTCDay();
}
/** Abstand der Zürcher Uhr zu UTC in Minuten (Sommerzeit vom letzten Sonntag im März bis zum letzten im Oktober, je 01:00 UTC) */
export function zuerichVersatz(ms) {
  const j = new Date(ms).getUTCFullYear();
  const an = Date.UTC(j, 2, letzterSonntag(j, 2), 1), aus = Date.UTC(j, 9, letzterSonntag(j, 9), 1);
  return ms >= an && ms < aus ? 120 : 60;
}

/**
 * Zeitangabe lesen: «2026-10» (Monat), «2026-10-18» (Tag) oder ISO mit Uhrzeit (Minute). → { ms, j, m, t, h, min, genau } in Zürcher Zeit, oder null.
 * ms dient dem Sortieren; ein Tag ohne Uhrzeit zählt als Mittag.
 */
export function zeit(wert) {
  const s = String(wert ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{2})$/);
  if (m) return { ms: Date.UTC(+m[1], +m[2] - 1, 15, 12), j: +m[1], m: +m[2], t: null, h: null, min: null, genau: "monat" };
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return { ms: Date.UTC(+m[1], +m[2] - 1, +m[3], 12), j: +m[1], m: +m[2], t: +m[3], h: null, min: null, genau: "tag" };
  const ms = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) ? Date.parse(s) : NaN;
  if (Number.isNaN(ms)) return null;
  const d = new Date(ms + zuerichVersatz(ms) * 60_000);
  return { ms, j: d.getUTCFullYear(), m: d.getUTCMonth() + 1, t: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes(), genau: "minute" };
}

/** «18. Oktober 2026, 14:03» – mit kurz: «18. Okt. 2026»; ohne Uhrzeit, wo keine bekannt ist */
export function datum(wert, { kurz = false, uhr = true } = {}) {
  const z = zeit(wert);
  if (!z) return "";
  const monat = (kurz ? MONATE_KURZ : MONATE)[z.m - 1];
  if (z.genau === "monat") return `${monat} ${z.j}`;
  const tag = `${z.t}. ${monat} ${z.j}`;
  return z.genau === "minute" && uhr ? `${tag}, ${zwei(z.h)}:${zwei(z.min)}` : tag;
}
export const uhrzeit = (wert) => { const z = zeit(wert); return z?.genau === "minute" ? `${zwei(z.h)}:${zwei(z.min)}` : ""; };
export const monatsname = (j, m) => `${MONATE[m - 1]} ${j}`;
/** für den Feed: RFC 822 in UTC */
export function rfc822(wert) {
  const z = zeit(wert);
  if (!z) return "";
  const d = new Date(z.ms);
  return `${TAGE_RFC[d.getUTCDay()]}, ${zwei(d.getUTCDate())} ${MONATE_RFC[d.getUTCMonth()]} ${d.getUTCFullYear()} ${zwei(d.getUTCHours())}:${zwei(d.getUTCMinutes())}:${zwei(d.getUTCSeconds())} +0000`;
}
/** ISO-Tag (Zürich) für die Sitemap */
export const isoTag = (wert) => { const z = zeit(wert); return z ? `${z.j}-${zwei(z.m)}-${zwei(z.t ?? 1)}` : ""; };

/** Abstand zwischen Veröffentlichung und Sicherung, in Worten: «nach 3 Stunden», «nach 2 Tagen», «am selben Tag» */
export function abstand(von, bis) {
  const a = zeit(von), b = zeit(bis);
  if (!a || !b || a.genau === "monat") return "";
  if (a.genau === "tag") {
    const tage = Math.round((Date.UTC(b.j, b.m - 1, b.t) - Date.UTC(a.j, a.m - 1, a.t)) / 864e5);
    return tage <= 0 ? "am selben Tag" : wieLange(tage * 1440);
  }
  return wieLange(Math.max(0, Math.round((b.ms - a.ms) / 60_000)));
}
function wieLange(minuten) {
  const einheit = (n, eins, viele) => `nach ${n === 1 ? (eins === "Tag" || eins === "Monat" ? "einem" : "einer") : n} ${n === 1 ? eins : viele}`;
  if (minuten < 2) return "sofort";
  if (minuten < 60) return einheit(minuten, "Minute", "Minuten");
  const std = Math.round(minuten / 60);
  if (std < 24) return einheit(std, "Stunde", "Stunden");
  const tage = Math.round(minuten / 1440);
  if (tage < 14) return einheit(tage, "Tag", "Tagen");
  if (tage < 60) return einheit(Math.round(tage / 7), "Woche", "Wochen");
  if (tage < 365) return einheit(Math.round(tage / 30.44), "Monat", "Monaten");
  const jahre = Math.round(tage / 365.25);
  return einheit(jahre, "Jahr", "Jahren");
}

// ---------- Zahlen ----------

/** 987 · 4’210 · 12,3 Tsd. · 1,2 Mio. (Schweizer Schreibweise, wie die Plattformen gekürzt) */
export function zahl(n) {
  if (n === null || n === undefined || n === "" || Number.isNaN(+n)) return "";
  const x = Math.round(+n);
  const tausender = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, "’");
  if (x < 10_000) return tausender(x);
  const kurz = (v, w) => `${(Math.round(v * 10) / 10).toFixed(1).replace(/\.0$/, "").replace(".", ",")} ${w}`;
  if (x < 1_000_000) return x < 100_000 ? kurz(x / 1000, "Tsd.") : `${Math.round(x / 1000)} Tsd.`;
  return kurz(x / 1_000_000, "Mio.");
}

// ---------- Text ----------

const MUSTER = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)|(^|[^\p{L}\p{N}_/])@([A-Za-z0-9_.]{1,40})|(^|[^\p{L}\p{N}_&/])#([\p{L}\p{N}_]{1,80})/gu;
const LINK_AUSSEN = 'rel="nofollow noopener ugc" target="_blank"';

/** sichtbarer Teil einer Adresse: ohne https://, höchstens 32 Zeichen */
const kurzeAdresse = (u) => { const t = u.replace(/^https?:\/\//, "").replace(/^www\./, ""); return t.length > 32 ? `${t.slice(0, 31)}…` : t; };

/** Text eines Beitrags: Zeilen bleiben, Adressen, @Erwähnungen und #Hashtags werden Links (Hashtags führen in die Suche der Zeitleiste) */
export function beitragText(text, plattform, zeitleiste) {
  const s = String(text ?? "");
  let aus = "", i = 0;
  for (const m of s.matchAll(MUSTER)) {
    aus += esc(s.slice(i, m.index));
    if (m[1]) {
      let u = m[1], rest = "";
      const ende = u.match(/[.,;:!?)\]»”’]+$/);              // Satzzeichen am Ende gehören nicht zur Adresse
      if (ende) { rest = ende[0]; u = u.slice(0, -rest.length); }
      const href = /^https?:/.test(u) ? u : `https://${u}`;
      aus += `<a href="${esc(href)}" ${LINK_AUSSEN}>${esc(kurzeAdresse(u))}</a>${esc(rest)}`;
    } else if (m[3]) {
      const handle = m[3].replace(/\.+$/, ""), rest = m[3].slice(handle.length), p = profilUrl(plattform, handle);
      aus += esc(m[2]) + (p ? `<a href="${esc(p)}" ${LINK_AUSSEN}>@${esc(handle)}</a>` : `@${esc(handle)}`) + esc(rest);
    } else {
      aus += `${esc(m[4])}<a class="hashtag" href="${esc(zeitleiste)}?q=${encodeURIComponent(`#${m[5]}`)}">#${esc(m[5])}</a>`;
    }
    i = m.index + m[0].length;
  }
  aus += esc(s.slice(i));
  return aus.trim().replace(/\r?\n/g, "<br>");
}

/** Kommentar: Absätze (Leerzeile), *kursiv*, **fett**, [Text](Adresse) und blosse Adressen */
export function kommentarHtml(text) {
  const absaetze = String(text ?? "").replace(/\r/g, "").trim().split(/\n{2,}/).filter((a) => a.trim());
  return absaetze.map((a) => {
    let h = "", i = 0;
    const re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"]+)/g;
    const inline = (t) => esc(t).replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    for (const m of a.matchAll(re)) {
      h += inline(a.slice(i, m.index));
      if (m[1]) h += `<a href="${esc(m[2])}" rel="noopener">${inline(m[1])}</a>`;
      else { let u = m[3], rest = ""; const e = u.match(/[.,;:!?)»”]+$/); if (e) { rest = e[0]; u = u.slice(0, -rest.length); } h += `<a href="${esc(u)}" rel="noopener">${esc(kurzeAdresse(u))}</a>${esc(rest)}`; }
      i = m.index + m[0].length;
    }
    h += inline(a.slice(i));
    return `<p>${h.trim().replace(/\n/g, "<br>")}</p>`;
  }).join("\n");
}

/** reiner Text ohne Zeilen, gekürzt (für Beschreibungen, Feed, Zitiervorschlag) */
export function auszug(text, max = 160) {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const schnitt = t.slice(0, max - 1), leer = schnitt.lastIndexOf(" ");
  return `${(leer > max * 0.6 ? schnitt.slice(0, leer) : schnitt).replace(/[\s.,;:!?–-]+$/, "")} …`;
}

// ---------- Daten ----------

/** Schlüssel einer Autorin, eines Autors: Plattform und Handle (oder Name, wo es kein Handle gibt) */
export const autorSchluessel = (e) => `${e.plattform}-${slug(e.autor?.handle?.replace(/^@/, "") || e.autor?.name || "unbekannt", 40)}`;
export const handleOhneAt = (e) => String(e.autor?.handle ?? "").replace(/^@/, "");
export const titelVon = (e) => e.titel?.trim() || `${e.autor?.name || PLATTFORM_NAME[e.plattform]}: ${auszug(e.text, 60)}`;

/** Reihenfolge: zuletzt gesichert zuerst (bei gleicher Zeit die höhere Nummer) */
export const nachErfassung = (a, b) => (zeit(b.erfasst)?.ms ?? 0) - (zeit(a.erfasst)?.ms ?? 0) || b.nr - a.nr;

/** Fehler eines Eintrags als Liste von Sätzen (leer: in Ordnung) */
export function pruefen(e, alle = []) {
  const f = [];
  if (!Number.isInteger(e?.nr) || e.nr < 1) f.push("Die Nummer fehlt.");
  if (!/^[0-9]+-[a-z0-9-]+$/.test(e?.id ?? "")) f.push("Die Adresse (id) ist ungültig.");
  else if (!e.id.startsWith(`${e.nr}-`)) f.push("Die Adresse beginnt nicht mit der Nummer.");
  if (!PLATTFORMEN.includes(e?.plattform)) f.push("Die Plattform fehlt (X, Facebook oder Instagram).");
  if (!e?.autor?.name?.trim()) f.push("Der Name der Autorin, des Autors fehlt.");
  if (!zeit(e?.erfasst) || zeit(e.erfasst).genau !== "minute") f.push("Der Zeitpunkt der Erfassung fehlt.");
  if (e?.veroeffentlicht && !zeit(e.veroeffentlicht)) f.push("Das Datum der Veröffentlichung ist unlesbar (JJJJ-MM-TT oder mit Uhrzeit).");
  if (!String(e?.text ?? "").trim() && !(e?.medien ?? []).length) f.push("Der Beitrag braucht Text oder Medien.");
  if (!Array.isArray(e?.schlagworte)) f.push("Die Schlagworte fehlen.");
  for (const m of e?.medien ?? []) if (!/^medien\/[0-9a-z-]+\/[a-z0-9-]+\.(webp|jpg|png|mp4|webm)$/.test(m.datei ?? "")) f.push(`Medium mit ungültigem Pfad: ${m.datei}`);
  if (e?.quelle && !/^https:\/\//.test(e.quelle)) f.push("Die Quelle muss mit https:// beginnen.");
  if (e?.autor?.profil && !/^https:\/\//.test(e.autor.profil)) f.push("Das Profil muss mit https:// beginnen.");
  const doppelt = alle.filter((a) => a !== e && (a.nr === e.nr || a.id === e.id));
  if (doppelt.length) f.push(`Nummer oder Adresse gibt es schon (Zettel ${doppelt[0].nr}).`);
  for (const v of e?.verweise ?? []) if (alle.length && !alle.some((a) => a.id === v.id)) f.push(`Verweis auf einen Zettel, den es nicht gibt: ${v.id}`);
  return f;
}

/** nächste freie Nummer und die Adresse dazu */
export function neueId(alle, titel) {
  const nr = alle.reduce((m, e) => Math.max(m, e.nr), 0) + 1;
  return { nr, id: `${nr}-${slug(titel, 48)}` };
}

/** alle Schlagworte mit Anzahl, häufigste zuerst */
export function schlagwortListe(alle) {
  const n = new Map();
  for (const e of alle) for (const s of e.schlagworte ?? []) n.set(s, (n.get(s) ?? 0) + 1);
  return [...n].map(([wort, anzahl]) => ({ wort, slug: slug(wort), anzahl })).sort((a, b) => b.anzahl - a.anzahl || vergleich(a.wort, b.wort));
}
/** alle Autor:innen mit ihren Zetteln, häufigste zuerst */
export function autorListe(alle) {
  const n = new Map();
  for (const e of [...alle].sort(nachErfassung)) {
    const k = autorSchluessel(e);
    if (!n.has(k)) n.set(k, { schluessel: k, plattform: e.plattform, autor: e.autor, avatarVon: e, zettel: [] });
    const a = n.get(k);
    a.zettel.push(e);
    if (!a.avatarVon.autor?.avatar && e.autor?.avatar) a.avatarVon = e;
  }
  return [...n.values()].sort((a, b) => b.zettel.length - a.zettel.length || vergleich(a.autor.name, b.autor.name));
}

/** verwandte Zettel: geteilte Schlagworte (Jaccard), dazu dieselbe Person; höchstens drei, ohne die ausdrücklichen Verweise */
export function verwandte(e, alle, n = 3) {
  const s = new Set(e.schlagworte ?? []), ausdruecklich = new Set((e.verweise ?? []).map((v) => v.id));
  return alle.filter((a) => a.id !== e.id && !ausdruecklich.has(a.id)).map((a) => {
    const t = new Set(a.schlagworte ?? []), gemeinsam = [...s].filter((x) => t.has(x)).length;
    const wert = (gemeinsam / (new Set([...s, ...t]).size || 1)) + (autorSchluessel(a) === autorSchluessel(e) ? 0.25 : 0);
    return { a, wert, gemeinsam };
  }).filter((x) => x.wert > 0).sort((x, y) => y.wert - x.wert || nachErfassung(x.a, y.a)).slice(0, n).map((x) => x.a);
}

// ---------- Symbole (eigene, feine Zeichnungen; keine Logos der Plattformen) ----------

const svg = (inhalt, klasse = "sym") => `<svg class="${klasse}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${inhalt}</svg>`;
const SYM = {
  antworten: svg('<path d="M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-8L7 20v-3.5H5A1.5 1.5 0 0 1 3.5 15V7A1.5 1.5 0 0 1 5 5.5z"/>'),
  reposts: svg('<path d="M7 6.5 4.5 9 7 11.5"/><path d="M4.5 9H16a3 3 0 0 1 3 3v1"/><path d="M17 17.5l2.5-2.5-2.5-2.5"/><path d="M19.5 15H8a3 3 0 0 1-3-3v-1"/>'),
  likes: svg('<path d="M12 19.5s-7-4.3-7-9.3A3.7 3.7 0 0 1 8.8 6.5c1.4 0 2.5.7 3.2 1.8.7-1.1 1.8-1.8 3.2-1.8A3.7 3.7 0 0 1 19 10.2c0 5-7 9.3-7 9.3z"/>'),
  ansichten: svg('<path d="M5 19.5v-6"/><path d="M10 19.5V9"/><path d="M15 19.5V4.5"/><path d="M20 19.5v-9"/>'),
  lesezeichen: svg('<path d="M7 4.5h10v15l-5-3.5-5 3.5z"/>'),
  reaktionen: svg('<path d="M7.5 10.5v8.5H5a1 1 0 0 1-1-1v-6.5a1 1 0 0 1 1-1z"/><path d="M7.5 10.5 11 4.5a1.8 1.8 0 0 1 2.9 1.9L13 10h5.2a1.8 1.8 0 0 1 1.7 2.2l-1.4 5.4a1.8 1.8 0 0 1-1.7 1.4H7.5"/>'),
  kommentare: svg('<path d="M12 4.5c4.7 0 8 3 8 6.7s-3.3 6.7-8 6.7c-1 0-2-.1-2.9-.4L5 19.5l1-3.4c-1.3-1.2-2-2.9-2-4.9 0-3.7 3.3-6.7 8-6.7z"/>'),
  teilungen: svg('<path d="M13.5 5.5 20 11.5l-6.5 6v-3.5c-4 0-7 1-9.5 4 .8-5 3.7-8.5 9.5-9z"/>'),
  senden: svg('<path d="M20.5 4 3.5 10.5l7 2.5 2.5 7z"/><path d="m10.5 13 5-4.5"/>'),
  welt: svg('<circle cx="12" cy="12" r="8"/><path d="M4 12h16"/><path d="M12 4c2.2 2.2 3.3 4.9 3.3 8s-1.1 5.8-3.3 8c-2.2-2.2-3.3-4.9-3.3-8S9.8 6.2 12 4z"/>', "sym sym--klein"),
  geprueft: '<svg class="geprueft" viewBox="0 0 24 24" role="img" aria-label="verifiziert" focusable="false"><path d="M12 2.8l2.2 1.9 2.9-.3.9 2.8 2.6 1.4-.9 2.8.9 2.8-2.6 1.4-.9 2.8-2.9-.3L12 21.2l-2.2-1.9-2.9.3-.9-2.8-2.6-1.4.9-2.8-.9-2.8 2.6-1.4.9-2.8 2.9.3z"/><path class="haken" d="m8.6 12.2 2.3 2.3 4.6-4.9"/></svg>',
  extern: svg('<path d="M10 5.5H6A1.5 1.5 0 0 0 4.5 7v11A1.5 1.5 0 0 0 6 19.5h11a1.5 1.5 0 0 0 1.5-1.5v-4"/><path d="M13.5 4.5h6v6"/><path d="M19.5 4.5 11 13"/>', "sym sym--klein"),
};
export const SYMBOLE = SYM;

const ZAHL_NAME = { antworten: ["Antwort", "Antworten"], reposts: ["Repost", "Reposts"], likes: ["Like", "Likes"], ansichten: ["Ansicht", "Ansichten"], lesezeichen: ["Lesezeichen", "Lesezeichen"],
  reaktionen: ["Reaktion", "Reaktionen"], kommentare: ["Kommentar", "Kommentare"], teilungen: ["Mal geteilt", "Mal geteilt"] };
const zahlWort = (k, n) => ZAHL_NAME[k][+n === 1 ? 0 : 1];

// ---------- Beitrag (die Abschrift im Stil der Plattform) ----------

/** Avatar: das Bild aus dem Beleg oder ein Anfangsbuchstabe */
function avatar(e, basis, gross = false) {
  const name = e.autor?.name ?? "";
  const a = e.autor?.avatar;
  const inhalt = a ? `<img src="${esc(basis + a)}" alt="" width="${gross ? 64 : 40}" height="${gross ? 64 : 40}" loading="lazy" decoding="async">`
    : `<span>${esc([...name.replace(/^[@\s]+/, "")][0]?.toUpperCase() ?? "?")}</span>`;
  return `<span class="avatar avatar--${e.plattform}${gross ? " avatar--gross" : ""}">${inhalt}</span>`;
}

function medienHtml(e, basis, { kurz = false } = {}) {
  const liste = e.medien ?? [];
  if (!liste.length) return "";
  const eins = (m, i) => {
    const mass = m.breite && m.hoehe ? ` width="${m.breite}" height="${m.hoehe}"` : "";
    if (m.typ === "video") {
      return `<figure class="medium medium--video"><video src="${esc(basis + m.datei)}"${m.poster ? ` poster="${esc(basis + m.poster)}"` : ""}${mass} controls preload="none" playsinline${m.alt ? ` aria-label="${esc(m.alt)}"` : ""}></video></figure>`;
    }
    return `<figure class="medium"><a href="${esc(basis + m.datei)}" class="medium-link"><img src="${esc(basis + m.datei)}" alt="${esc(m.alt ?? "")}"${mass} loading="lazy" decoding="async"></a></figure>`;
  };
  if (e.plattform === "instagram" && liste.length > 1) {
    const punkte = liste.map((_, i) => `<span${i === 0 ? ' class="an"' : ""}></span>`).join("");
    return `<div class="beitrag-medien beitrag-medien--karussell" data-anzahl="${liste.length}"><div class="karussell" tabindex="0" aria-label="${liste.length} Bilder, seitlich blättern">${liste.map(eins).join("")}</div><div class="karussell-punkte" aria-hidden="true">${punkte}</div></div>`;
  }
  const zeigen = kurz ? liste.slice(0, 4) : liste;
  return `<div class="beitrag-medien beitrag-medien--${Math.min(zeigen.length, 4)}">${zeigen.map(eins).join("")}</div>`;
}

function zitatHtml(e, basis, zeitleiste) {
  const z = e.zitiert;
  if (!z || !(z.text || z.autor?.name)) return "";
  const wer = [z.autor?.name ? `<span class="beitrag-name">${esc(z.autor.name)}</span>` : "", z.autor?.handle ? `<span class="beitrag-handle">@${esc(z.autor.handle.replace(/^@/, ""))}</span>` : ""].join(" ");
  return `<blockquote class="beitrag-zitat"><p class="beitrag-zitat-wer">${wer}</p>${z.text ? `<p class="beitrag-text">${beitragText(z.text, e.plattform, zeitleiste)}</p>` : ""}</blockquote>`;
}

function uebersetzungHtml(e) {
  if (!e.uebersetzung?.trim()) return "";
  return `<details class="beitrag-uebersetzung"><summary>Übersetzung aus dem ${esc(SPRACHEN[e.sprache] ?? "Original")}</summary><p>${esc(e.uebersetzung.trim()).replace(/\r?\n/g, "<br>")}</p></details>`;
}
const SPRACHEN = { en: "Englischen", fr: "Französischen", it: "Italienischen", es: "Spanischen", pt: "Portugiesischen", nl: "Niederländischen", ru: "Russischen", uk: "Ukrainischen",
  pl: "Polnischen", tr: "Türkischen", ar: "Arabischen", he: "Hebräischen", fa: "Persischen", zh: "Chinesischen", ja: "Japanischen", ko: "Koreanischen", rm: "Rätoromanischen" };

function zahlenListe(e, schluessel) {
  const k = e.kennzahlen ?? {};
  const li = schluessel.filter((s) => k[s] !== null && k[s] !== undefined && k[s] !== "")
    .map((s) => `<li class="zahl zahl--${s}" title="${esc(`${zahl(k[s])} ${zahlWort(s, k[s])}`)}">${SYM[s]}<span>${esc(zahl(k[s]))}</span><span class="nur-lesen"> ${esc(zahlWort(s, k[s]))}</span></li>`);
  return li.length ? `<ul class="beitrag-zahlen" aria-label="Kennzahlen bei der Erfassung">${li.join("")}</ul>` : "";
}

const lang = (e) => (e.sprache && /^[a-z]{2}$/.test(e.sprache) ? ` lang="${e.sprache}"` : "");
const zeitTag = (e, inhalt) => (e.veroeffentlicht ? `<time datetime="${esc(e.veroeffentlicht)}">${inhalt}</time>` : "");

/**
 * Der Beitrag als Abschrift: X, Facebook, Instagram je in ihrer Ordnung, aber im Ton der Website.
 * basis: Weg zu social-media/ (für Medien), zeitleiste: Weg zur Zeitleiste (für Hashtags); kurz: in der Zeitleiste (ohne Übersetzung, höchstens vier Medien)
 */
export function beitragHtml(e, { basis = "", zeitleiste = "./", kurz = false } = {}) {
  const name = esc(e.autor?.name ?? ""), handle = handleOhneAt(e);
  const haken = e.autor?.verifiziert ? SYM.geprueft : "";
  const kontext = e.kontext?.trim() ? `<p class="beitrag-kontext">${esc(e.kontext.trim())}</p>` : "";
  const text = e.text?.trim() ? beitragText(e.text, e.plattform, zeitleiste) : "";
  const ueb = kurz ? "" : uebersetzungHtml(e);
  const medien = medienHtml(e, basis, { kurz }), zitat = zitatHtml(e, basis, zeitleiste);

  if (e.plattform === "x") {
    const wann = e.veroeffentlicht ? zeitTag(e, [uhrzeit(e.veroeffentlicht), datum(e.veroeffentlicht, { kurz: true, uhr: false })].filter(Boolean).join(" · ")) : "";
    return `<article class="beitrag beitrag--x"${lang(e)}>
<header class="beitrag-kopf">${avatar(e, basis)}<span class="beitrag-wer"><span class="beitrag-name">${name}${haken}</span>${handle ? `<span class="beitrag-handle">@${esc(handle)}</span>` : ""}</span><span class="beitrag-marke" aria-label="Beitrag auf X">X</span></header>
${kontext}${text ? `<p class="beitrag-text">${text}</p>` : ""}${ueb}${medien}${zitat}
${wann ? `<p class="beitrag-zeit">${wann}</p>` : ""}${zahlenListe(e, ["antworten", "reposts", "likes", "lesezeichen", "ansichten"])}
</article>`;
  }

  if (e.plattform === "facebook") {
    const gross = !e.medien?.length && !e.zitiert && String(e.text ?? "").trim().length <= 90 && String(e.text ?? "").trim().length > 0;
    const wann = e.veroeffentlicht ? `${zeitTag(e, datum(e.veroeffentlicht, { kurz: true }))} · ${SYM.welt}` : "";
    const k = e.kennzahlen ?? {};
    const rechts = [k.kommentare != null && k.kommentare !== "" ? `${zahl(k.kommentare)} ${zahlWort("kommentare", k.kommentare)}` : "", k.teilungen != null && k.teilungen !== "" ? `${zahl(k.teilungen)} Mal geteilt` : ""].filter(Boolean).join(" · ");
    const reaktionen = k.reaktionen != null && k.reaktionen !== "" ? `<span class="fb-reaktionen">${SYM.reaktionen}<span>${esc(zahl(k.reaktionen))}</span><span class="nur-lesen"> ${esc(zahlWort("reaktionen", k.reaktionen))}</span></span>` : "<span></span>";
    const bilanz = reaktionen !== "<span></span>" || rechts ? `<p class="fb-bilanz" aria-label="Kennzahlen bei der Erfassung">${reaktionen}<span>${esc(rechts)}</span></p>` : "";
    return `<article class="beitrag beitrag--facebook"${lang(e)}>
<header class="beitrag-kopf">${avatar(e, basis)}<span class="beitrag-wer"><span class="beitrag-name">${name}${haken}</span>${wann ? `<span class="beitrag-handle">${wann}</span>` : ""}</span><span class="beitrag-marke" aria-label="Beitrag auf Facebook">Facebook</span></header>
${kontext}${text ? `<p class="beitrag-text${gross ? " beitrag-text--gross" : ""}">${text}</p>` : ""}${ueb}${medien}${zitat}
${bilanz}<p class="fb-tun" aria-hidden="true"><span>${SYM.reaktionen}Gefällt mir</span><span>${SYM.kommentare}Kommentieren</span><span>${SYM.teilungen}Teilen</span></p>
</article>`;
  }

  // Instagram: zuerst das Bild, dann Tun, Likes, Bildtext mit Handle, Datum
  const k = e.kennzahlen ?? {};
  const likes = k.likes != null && k.likes !== "" ? `<p class="ig-likes">Gefällt ${esc(zahl(k.likes))} Mal</p>` : "";
  const komm = k.kommentare != null && k.kommentare !== "" ? `<p class="ig-kommentare">${esc(zahl(k.kommentare))} ${esc(zahlWort("kommentare", k.kommentare))}</p>` : "";
  const ansichten = k.ansichten != null && k.ansichten !== "" ? `<p class="ig-kommentare">${esc(zahl(k.ansichten))} Aufrufe</p>` : "";
  return `<article class="beitrag beitrag--instagram"${lang(e)}>
<header class="beitrag-kopf">${avatar(e, basis)}<span class="beitrag-wer"><span class="beitrag-name">${esc(handle || e.autor?.name || "")}${haken}</span>${handle && e.autor?.name && falten(e.autor.name) !== falten(handle) ? `<span class="beitrag-handle">${name}</span>` : ""}</span><span class="beitrag-marke" aria-label="Beitrag auf Instagram">Instagram</span></header>
${kontext}${medien || `<div class="ig-leer" aria-hidden="true"></div>`}
<p class="ig-tun" aria-hidden="true">${SYM.likes}${SYM.kommentare}${SYM.senden}<span class="ig-rechts">${SYM.lesezeichen}</span></p>
${likes}${text ? `<p class="beitrag-text"><span class="beitrag-name">${esc(handle || e.autor?.name || "")}</span> ${text}</p>` : ""}${ueb}${zitat}${komm}${ansichten}
${e.veroeffentlicht ? `<p class="beitrag-zeit">${zeitTag(e, datum(e.veroeffentlicht, { uhr: false }))}</p>` : ""}
</article>`;
}

// ---------- Seitenrahmen ----------

const seitenweg = (site, einzug) => `${einzug}<nav class="seitenweg" aria-label="Ornament Cloud">
${einzug}  <a href="${site}" aria-current="true">Ornament Cloud</a>
${einzug}  <a href="${site}alpha/drittes-rad/">Das Dritte Rad</a>
${einzug}</nav>`;

/** Vorschaukarte der Übersicht und der Register (1200 × 630, tools/b-kacheln.mjs alt, in der Gestaltung des Neubaus; seit 24. Oktober 2026) */
const kachel = (name, titel) => ({ bild: `kacheln/${name}.png`, breite: 1200, hoehe: 630, typ: "website", alt: `Vorschaukarte «${titel}» von ornament.cloud: Titel und kurzer Satz neben dem Feld aus 49 Punkten` });

/**
 * Seite: pfad ab der Wurzel («social-media/12-titel/»), titel, beschreibung, inhalt (main), kopfInhalt (Titel und Lead im Kopf);
 * og: { bild, breite, hoehe, alt, typ }; skripte: Dateien in social-media/js/; noindex
 */
export function seite({ pfad, titel, beschreibung, kopf, inhalt, og = null, skripte = [], noindex = false, aktuell = "true", fuss = "" }) {
  const tiefe = pfad.split("/").filter(Boolean).length, site = "../".repeat(tiefe), bereich = "../".repeat(tiefe - 1);
  const url = ADRESSE + pfad;
  const ogBlock = og ? `
  <meta property="og:type" content="${og.typ ?? "article"}">
  <meta property="og:site_name" content="ornament.cloud">
  <meta property="og:locale" content="de_CH">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:title" content="${esc(titel)}">
  <meta property="og:description" content="${esc(beschreibung)}">${og.bild ? `
  <meta property="og:image" content="${esc(ADRESSE + BEREICH + og.bild)}">${og.breite ? `
  <meta property="og:image:width" content="${og.breite}">
  <meta property="og:image:height" content="${og.hoehe}">` : ""}
  <meta property="og:image:alt" content="${esc(og.alt ?? "")}">` : ""}
  <meta name="twitter:card" content="summary_large_image">` : "";
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(titel)}${pfad === BEREICH ? "" : " – Social Media"} – Ornament Cloud</title>
  <meta name="description" content="${esc(beschreibung)}">${noindex ? `
  <meta name="robots" content="noindex">` : `
  <link rel="canonical" href="${esc(url)}">`}${ogBlock}
  <link rel="alternate" type="application/rss+xml" title="Ornament Cloud – Social Media" href="${bereich}feed.xml">
  <link rel="alternate" type="application/rss+xml" title="Ornament Cloud" href="${site}feed.xml">
  <link rel="stylesheet" href="${site}styles.css?v=${MARKE.styles}">
  <link rel="stylesheet" href="${site}vendor/fonts/fonts.css">
  <link rel="stylesheet" href="${bereich}social.css?v=${MARKE.social}">
</head>
<body class="sm">
  <!-- Erzeugt aus social-media/daten/eintraege.json (social-media/js/darstellung.js; Redaktion oder tools/build-social-media.mjs). Nicht von Hand ändern. -->
  <header class="site-header">
    <div class="wrap">
      <div class="topbar">
${seitenweg(site, "        ")}
${welleUndMenu(site, { aktiv: "Social", aktuell, einzug: "        " })}
      </div>
${kopf}
    </div>
  </header>

  <main class="wrap">
${inhalt}
  </main>
${fuss}
  <footer class="site-footer">
    <div class="wrap">
      <p>Fragen und Anmerkungen zur Website: <a href="mailto:hansnoed@gmail.com">hansnoed@gmail.com</a></p>
      <p><a href="${site}impressum/">Impressum</a></p>
      <p>Die Beiträge sind Zitate: gesichert, abgeschrieben und kommentiert, zur Erläuterung und Veranschaulichung. Wer hier zitiert ist und das nicht möchte, schreibt mir; der Zettel verschwindet.</p>
    </div>
  </footer>
${skripte.map((s) => `  <script type="module" src="${bereich}js/${s}?v=${MARKE.social}"></script>`).join("\n")}
  <script src="${site}icons.js?v=${MARKE.icons}" defer></script>
  <!-- Besuchsstatistik ohne Cookies: https://ornament-cloud.goatcounter.com -->
  <script data-goatcounter="https://ornament-cloud.goatcounter.com/count" async src="${site}vendor/goatcounter/count.js"></script>
</body>
</html>
`;
}

// ---------- Zeitleiste ----------

/** Zeitband: Zettel je Woche über die ganze Sammlung (gesichert); ein Balken je Woche, die Zeitleiste färbt die gefilterten nach */
export function zeitband(alle) {
  const ms = alle.map((e) => zeit(e.erfasst)?.ms).filter(Boolean);
  if (!ms.length) return "";
  const WOCHE = 7 * 864e5, montag = (t) => { const d = new Date(t); const tag = (d.getUTCDay() + 6) % 7; return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - tag); };
  const von = montag(Math.min(...ms)), bis = montag(Math.max(...ms));
  const wochen = Math.max(1, Math.round((bis - von) / WOCHE) + 1);
  const anzahl = new Array(wochen).fill(0);
  for (const t of ms) anzahl[Math.round((montag(t) - von) / WOCHE)]++;
  const max = Math.max(...anzahl), B = 1000, H = 48, schritt = B / wochen, breite = Math.max(1, Math.min(14, schritt - 2));
  const balken = anzahl.map((n, i) => {
    const x = (i * schritt + (schritt - breite) / 2).toFixed(1), h = n ? Math.max(3, (n / max) * (H - 4)) : 0;
    const start = new Date(von + i * WOCHE), tag = `${start.getUTCDate()}. ${MONATE_KURZ[start.getUTCMonth()]} ${start.getUTCFullYear()}`;
    return `<g class="woche" data-von="${von + i * WOCHE}" data-bis="${von + (i + 1) * WOCHE}"><title>Woche ab ${tag}: ${n} Zettel</title>`
      + `<rect class="woche-ziel" x="${(i * schritt).toFixed(1)}" y="0" width="${schritt.toFixed(1)}" height="${H}"/>`
      + (n ? `<rect class="woche-alle" x="${x}" y="${(H - h).toFixed(1)}" width="${breite.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(2, breite / 2).toFixed(1)}"/><rect class="woche-treffer" x="${x}" y="${(H - h).toFixed(1)}" width="${breite.toFixed(1)}" height="${h.toFixed(1)}" rx="${Math.min(2, breite / 2).toFixed(1)}" data-max="${max}" data-h="${H}"/>` : "")
      + "</g>";
  }).join("");
  const a = new Date(von), b = new Date(bis + 6 * 864e5);
  return `<figure class="zeitband" aria-label="Zettel je Woche">
        <svg viewBox="0 0 ${B} ${H}" preserveAspectRatio="none" role="img" aria-label="Gesicherte Zettel je Woche, ${a.getUTCDate()}. ${MONATE[a.getUTCMonth()]} ${a.getUTCFullYear()} bis ${b.getUTCDate()}. ${MONATE[b.getUTCMonth()]} ${b.getUTCFullYear()}, höchstens ${max} in einer Woche">${balken}<line class="grundlinie" x1="0" x2="${B}" y1="${H - 0.5}" y2="${H - 0.5}"/></svg>
        <figcaption><span>${a.getUTCDate()}. ${MONATE_KURZ[a.getUTCMonth()]} ${a.getUTCFullYear()}</span><span>${b.getUTCDate()}. ${MONATE_KURZ[b.getUTCMonth()]} ${b.getUTCFullYear()}</span></figcaption>
      </figure>`;
}

/** ein Zettel in der Zeitleiste */
export function zettelInZeitleiste(e) {
  const er = zeit(e.erfasst), ve = zeit(e.veroeffentlicht);
  const schlag = (e.schlagworte ?? []).map((s) => `<li><a href="?schlagwort=${esc(slug(s))}" data-schlagwort="${esc(slug(s))}">${esc(s)}</a></li>`).join("");
  return `      <li class="zettel" id="zettel-${e.nr}" data-nr="${e.nr}" data-plattform="${e.plattform}" data-autor="${esc(autorSchluessel(e))}" data-schlagworte="|${(e.schlagworte ?? []).map((s) => esc(slug(s))).join("|")}|" data-erfasst="${er?.ms ?? 0}" data-veroeffentlicht="${ve?.ms ?? ""}">
        <p class="zettel-zeit"><time datetime="${esc(e.erfasst)}"><span class="zettel-tag">${er.t}.</span> <span class="zettel-monat">${MONATE_KURZ[er.m - 1]} ${er.j}</span></time><span class="zettel-zeit-anders" hidden>${ve ? `<time datetime="${esc(e.veroeffentlicht)}"><span class="zettel-tag">${ve.t ?? ""}${ve.t ? "." : ""}</span> <span class="zettel-monat">${MONATE_KURZ[ve.m - 1]} ${ve.j}</span></time>` : `<span class="zettel-monat">ohne Datum</span>`}</span></p>
        <article class="zettel-karte zettel-karte--${e.plattform}">
          <header class="zettel-kopf">
            <p class="zettel-nr"><a href="${esc(e.id)}/">Zettel ${e.nr}</a></p>
            <h2 class="zettel-titel"><a href="${esc(e.id)}/">${esc(titelVon(e))}</a></h2>
          </header>
${e.kommentar?.trim() ? `          <div class="zettel-kommentar">\n${kommentarHtml(e.kommentar)}\n          </div>\n` : ""}          <div class="zettel-beitrag">
${beitragHtml(e, { basis: "", zeitleiste: "./", kurz: true })}
          </div>
          <footer class="zettel-fuss">
            ${schlag ? `<ul class="schlagworte">${schlag}</ul>` : ""}
            <a class="zettel-mehr" href="${esc(e.id)}/">Zettel öffnen</a>
          </footer>
        </article>
      </li>`;
}

/** die Zeitleiste: Kopf mit Zeitband, Filter, Monate mit Zetteln */
export function zeitleisteSeite(alle) {
  const liste = [...alle].sort(nachErfassung);
  const s = schlagwortListe(alle), a = autorListe(alle);
  let monat = "", zeilen = [];
  for (const e of liste) {
    const z = zeit(e.erfasst), k = `${z.j}-${zwei(z.m)}`;
    if (k !== monat) { monat = k; zeilen.push(`      <li class="monat" data-monat="${k}"><h2>${monatsname(z.j, z.m)}</h2></li>`); }
    zeilen.push(zettelInZeitleiste(e));
  }
  const zaehler = `${alle.length} Zettel, ${a.length} ${a.length === 1 ? "Autor:in" : "Autor:innen"}, ${s.length} ${s.length === 1 ? "Schlagwort" : "Schlagworte"}`;
  const kopf = `      <h1>Social Media</h1>
      <p class="lead">Ausgewählte Beiträge aus X, Facebook und Instagram.</p>`;   // Wunsch vom 19. Oktober 2026: «keine langfädige Einleitung»
  const plattformKnoepfe = [["", "Alle"], ...PLATTFORMEN.map((p) => [p, PLATTFORM_NAME[p]])].map(([p, n]) => {
    const anzahl = p ? alle.filter((e) => e.plattform === p).length : alle.length;
    return `<button type="button" class="wahl" data-plattform="${p}" aria-pressed="${p ? "false" : "true"}"${p && !anzahl ? " disabled" : ""}>${n} <span class="anzahl">${anzahl}</span></button>`;
  }).join("");
  const schlagKnoepfe = s.map((x) => `<button type="button" class="marke" data-schlagwort="${esc(x.slug)}" aria-pressed="false">${esc(x.wort)} <span class="anzahl">${x.anzahl}</span></button>`).join("");
  const autorKnoepfe = a.map((x) => `<button type="button" class="marke marke--person" data-autor="${esc(x.schluessel)}" aria-pressed="false">${avatar(x.avatarVon, "")}<span class="marke-name">${esc(x.autor.name)}</span> <span class="anzahl">${x.zettel.length}</span></button>`).join("");

  const inhalt = alle.length ? `    <div class="sm-raster">
    <aside class="sm-filter" aria-label="Filtern">
      <p class="sm-zaehler">${zaehler}</p>
      ${zeitband(alle)}
      <div class="filter" hidden>
        <label class="suche"><span class="nur-lesen">Suchen</span><input type="search" name="q" placeholder="Suchen in Text, Kommentar, Namen" autocomplete="off"></label>
        <div class="filter-gruppe" role="group" aria-label="Plattform">${plattformKnoepfe}</div>
        <div class="filter-gruppe filter-gruppe--ordnung" role="group" aria-label="Ordnung">
          <span class="filter-titel">Ordnen nach</span>
          <button type="button" class="wahl" data-ordnung="erfasst" aria-pressed="true">gesichert</button><button type="button" class="wahl" data-ordnung="veroeffentlicht" aria-pressed="false">veröffentlicht</button>
        </div>
        <details class="filter-block" open><summary>Schlagworte</summary><div class="marken">${schlagKnoepfe}</div></details>
        <details class="filter-block"><summary>Autor:innen</summary><div class="marken">${autorKnoepfe}</div></details>
        <p class="filter-stand" role="status" aria-live="polite"></p>
        <button type="button" class="filter-zurueck" hidden>Alle Filter lösen</button>
      </div>
      <p class="register"><a href="schlagworte/">Alle Schlagworte</a> <a href="autorinnen/">Alle Autor:innen</a> <a href="feed.xml">Feed</a></p>
    </aside>
    <ol class="zeitleiste" aria-label="Zettel, zuletzt gesicherte zuerst">
${zeilen.join("\n")}
    </ol>
    </div>
    <p class="sm-leer-gefiltert" hidden>Kein Zettel passt zu diesen Filtern. <button type="button" class="filter-zurueck">Alle Filter lösen</button></p>` : `    <section class="sm-leer">
      <h2>Noch keine Zettel</h2>
      <p>Hier entsteht eine Sammlung kommentierter Beiträge. Der erste Zettel ist in Arbeit.</p>
    </section>`;
  return seite({ pfad: BEREICH, titel: "Social Media", beschreibung: "Ausgewählte Beiträge aus X, Facebook und Instagram.", kopf, inhalt, og: kachel("social-media", "Social Media"), skripte: alle.length ? ["zeitleiste.js"] : [], aktuell: "page" });
}

// ---------- Zettel (eigene Seite) ----------

/** Zitiervorschlag als Text */
export function zitiervorschlag(e) {
  const wer = [e.autor?.name, handleOhneAt(e) ? `(@${handleOhneAt(e)})` : ""].filter(Boolean).join(" ");
  const wann = e.veroeffentlicht ? ` (${datum(e.veroeffentlicht, { uhr: false })})` : "";
  const text = e.text?.trim() ? ` «${auszug(e.text, 120)}»` : "";
  const quelle = e.quelle ? ` ${e.quelle}.` : "";
  return `${wer}${wann}:${text} Beitrag auf ${PLATTFORM_NAME[e.plattform]}.${quelle} Gesichert am ${datum(e.erfasst, { uhr: false })}, ${ADRESSE}${BEREICH}${e.id}/`;
}

export function zettelSeite(e, alle) {
  const liste = [...alle].sort(nachErfassung), i = liste.findIndex((x) => x.id === e.id);
  const neuer = liste[i - 1], aelter = liste[i + 1];
  const wer = e.autor ?? {}, handle = handleOhneAt(e), profil = wer.profil || profilUrl(e.plattform, handle);
  const vonDerselben = alle.filter((x) => x.id !== e.id && autorSchluessel(x) === autorSchluessel(e)).sort(nachErfassung);
  const verwandt = verwandte(e, alle);
  const titel = titelVon(e);
  const beschreibung = auszug(e.kommentar?.trim() ? `${e.kommentar} – ${wer.name}: ${e.text ?? ""}` : `${wer.name}: ${e.text ?? ""}`, 200);

  const strahl = e.veroeffentlicht ? `
      <figure class="zeitstrahl">
        <div class="zeitstrahl-linie" aria-hidden="true"><span class="punkt"></span><span class="strecke"></span><span class="punkt punkt--voll"></span></div>
        <figcaption>
          <span class="zeitstrahl-a">Veröffentlicht <time datetime="${esc(e.veroeffentlicht)}">${esc(datum(e.veroeffentlicht))}</time>${e.veroeffentlichtQuelle === "adresse" ? ' <span class="leise">(aus der Adresse errechnet)</span>' : ""}</span>
          <span class="zeitstrahl-abstand">${esc(abstand(e.veroeffentlicht, e.erfasst))} gesichert</span>
          <span class="zeitstrahl-b">Gesichert <time datetime="${esc(e.erfasst)}">${esc(datum(e.erfasst))}</time></span>
        </figcaption>
      </figure>` : `
      <p class="zeitstrahl-einzeln">Gesichert <time datetime="${esc(e.erfasst)}">${esc(datum(e.erfasst))}</time>; das Datum der Veröffentlichung ist nicht bekannt.</p>`;

  const status = e.status === "geloescht" ? `<p class="status status--weg">Das Original ist nicht mehr online${e.geprueft ? ` (festgestellt am ${esc(datum(e.geprueft, { uhr: false }))})` : ""}. Dieser Zettel ist, was davon bleibt.</p>`
    : e.status === "online" && e.geprueft ? `<p class="status">Am ${esc(datum(e.geprueft, { uhr: false }))} war das Original noch online.</p>` : "";

  const beleg = e.beleg?.datei ? `
      <details class="beleg">
        <summary>Beleg: das Bildschirmfoto vom ${esc(datum(e.erfasst, { uhr: false }))}</summary>
        <figure>
          <a href="../${esc(e.beleg.datei)}"><img src="../${esc(e.beleg.datei)}" alt="Bildschirmfoto des Beitrags von ${esc(wer.name)} auf ${PLATTFORM_NAME[e.plattform]}"${e.beleg.breite ? ` width="${e.beleg.breite}" height="${e.beleg.hoehe}"` : ""} loading="lazy" decoding="async"></a>
          <figcaption>${e.beleg.geschwaerzt ? "Namen und Bilder Dritter sind geschwärzt. " : ""}${e.beleg.sha256 ? `Prüfsumme der Originaldatei (SHA-256): <code>${esc(e.beleg.sha256)}</code>` : ""}</figcaption>
        </figure>
      </details>` : "";

  const verweise = (e.verweise ?? []).map((v) => { const z = alle.find((x) => x.id === v.id); return z ? `<li><span class="verweis-art">${esc(VERWEIS_ARTEN[v.art]?.[0] ?? "Verweis auf")}</span> <a href="../${esc(z.id)}/">Zettel ${z.nr}: ${esc(titelVon(z))}</a></li>` : ""; }).join("");
  const rueck = alle.filter((x) => (x.verweise ?? []).some((v) => v.id === e.id)).map((z) => { const v = z.verweise.find((v) => v.id === e.id); return `<li><a href="../${esc(z.id)}/">Zettel ${z.nr}: ${esc(titelVon(z))}</a> <span class="verweis-art">${esc(VERWEIS_ARTEN[v.art]?.[1] ?? "verweist hierher")}</span></li>`; }).join("");
  const kurzliste = (xs) => xs.map((z) => `<li><a href="../${esc(z.id)}/"><span class="zettel-nr">Zettel ${z.nr}</span> ${esc(titelVon(z))}</a></li>`).join("");

  const kopf = `      <p class="sm-zurueck"><a href="../">Social Media</a></p>
      <p class="zettel-nr zettel-nr--seite">Zettel ${e.nr} <span class="leise">aus ${PLATTFORM_NAME[e.plattform]}</span></p>
      <h1>${esc(titel)}</h1>`;
  const inhalt = `    <div class="zettel-seite zettel-karte--${e.plattform}">
      ${e.kommentar?.trim() ? `<div class="zettel-kommentar zettel-kommentar--seite">\n${kommentarHtml(e.kommentar)}\n      </div>` : ""}
      <div class="zettel-beitrag zettel-beitrag--seite">
${beitragHtml(e, { basis: "../", zeitleiste: "../", kurz: false })}
      </div>
${strahl}
      ${status}
${beleg}
      ${(e.schlagworte ?? []).length ? `<section class="zettel-block" aria-labelledby="t-schlagworte"><h2 id="t-schlagworte">Schlagworte</h2><ul class="schlagworte">${e.schlagworte.map((s) => `<li><a href="../?schlagwort=${esc(slug(s))}">${esc(s)}</a></li>`).join("")}</ul></section>` : ""}
      <section class="zettel-block person" aria-labelledby="t-person">
        <h2 id="t-person">Wer spricht</h2>
        <div class="person-karte">${avatar(e, "../", true)}<p><span class="beitrag-name">${esc(wer.name)}</span>${handle ? ` <span class="beitrag-handle">@${esc(handle)}</span>` : ""}<br>${profil ? `<a href="${esc(profil)}" rel="nofollow noopener" target="_blank">Profil auf ${PLATTFORM_NAME[e.plattform]} ${SYM.extern}</a>` : ""}${e.quelle ? `${profil ? " · " : ""}<a href="${esc(e.quelle)}" rel="nofollow noopener" target="_blank">Zum Original ${SYM.extern}</a>` : ""}</p></div>
        ${vonDerselben.length ? `<p class="leise">Weitere Zettel mit ${esc(wer.name)}:</p><ul class="zettel-liste">${kurzliste(vonDerselben.slice(0, 6))}</ul>${vonDerselben.length > 6 ? `<p><a href="../?autor=${esc(autorSchluessel(e))}">Alle ${vonDerselben.length + 1} Zettel</a></p>` : ""}` : ""}
      </section>
      ${verweise || rueck ? `<section class="zettel-block" aria-labelledby="t-verweise"><h2 id="t-verweise">Verweise</h2><ul class="zettel-liste verweise">${verweise}${rueck}</ul></section>` : ""}
      ${verwandt.length ? `<section class="zettel-block" aria-labelledby="t-verwandt"><h2 id="t-verwandt">In der Nähe</h2><ul class="zettel-liste">${kurzliste(verwandt)}</ul></section>` : ""}
      <section class="zettel-block zitieren" aria-labelledby="t-zitieren">
        <h2 id="t-zitieren">Zitieren</h2>
        <p class="zitat-text">${esc(zitiervorschlag(e))}</p>
        <button type="button" class="knopf-leise" data-kopieren=".zitat-text" hidden>Kopieren</button>
      </section>
      <nav class="zettel-blaettern" aria-label="Blättern">
        ${neuer ? `<a rel="prev" href="../${esc(neuer.id)}/"><span class="leise">Neuer</span> Zettel ${neuer.nr}: ${esc(titelVon(neuer))}</a>` : "<span></span>"}
        ${aelter ? `<a rel="next" href="../${esc(aelter.id)}/"><span class="leise">Älter</span> Zettel ${aelter.nr}: ${esc(titelVon(aelter))}</a>` : "<span></span>"}
      </nav>
    </div>`;
  const ogBild = e.karte ? { bild: e.karte.datei, breite: e.karte.breite, hoehe: e.karte.hoehe, alt: `Zettel ${e.nr}: ${titel}` }
    : e.medien?.find((m) => m.typ === "bild") ? (({ datei, breite, hoehe, alt }) => ({ bild: datei, breite, hoehe, alt }))(e.medien.find((m) => m.typ === "bild"))
    : e.beleg?.datei ? { bild: e.beleg.datei, breite: e.beleg.breite, hoehe: e.beleg.hoehe, alt: `Bildschirmfoto des Beitrags von ${wer.name}` } : null;
  return seite({ pfad: `${BEREICH}${e.id}/`, titel, beschreibung, kopf, inhalt, og: ogBild ?? {}, skripte: ["zettel.js"] });
}

// ---------- Register ----------

export function schlagworteSeite(alle) {
  const s = schlagwortListe(alle).sort((a, b) => vergleich(a.wort, b.wort));
  const nachBuchstabe = new Map();
  for (const x of s) { const b = falten(x.wort)[0]?.toUpperCase() ?? "#"; const k = /[A-Z]/.test(b) ? b : "#"; if (!nachBuchstabe.has(k)) nachBuchstabe.set(k, []); nachBuchstabe.get(k).push(x); }
  const inhalt = s.length ? `    <div class="register-seite">
${[...nachBuchstabe].map(([b, xs]) => `      <section class="register-gruppe" aria-label="${b}">
        <h2>${b}</h2>
        <dl>
${xs.map((x) => `          <dt><a href="../?schlagwort=${esc(x.slug)}">${esc(x.wort)}</a> <span class="anzahl">${x.anzahl}</span></dt>
          <dd><ul class="zettel-liste">${alle.filter((e) => (e.schlagworte ?? []).includes(x.wort)).sort(nachErfassung).map((e) => `<li><a href="../${esc(e.id)}/"><span class="zettel-nr">Zettel ${e.nr}</span> ${esc(titelVon(e))}</a></li>`).join("")}</ul></dd>`).join("\n")}
        </dl>
      </section>`).join("\n")}
    </div>` : `    <p>Noch keine Schlagworte.</p>`;
  const kopf = `      <p class="sm-zurueck"><a href="../">Social Media</a></p>
      <h1>Schlagworte</h1>
      <p class="lead">${s.length} Schlagworte, von A bis Z, mit den Zetteln dazu.</p>`;
  return seite({ pfad: `${BEREICH}schlagworte/`, titel: "Schlagworte", beschreibung: "Register der Schlagworte im Zettelkasten «Social Media».", kopf, inhalt, og: kachel("schlagworte", "Schlagworte") });
}

export function autorinnenSeite(alle) {
  const a = autorListe(alle);
  const inhalt = a.length ? `    <div class="register-seite">
${PLATTFORMEN.filter((p) => a.some((x) => x.plattform === p)).map((p) => `      <section class="register-gruppe" aria-label="${PLATTFORM_NAME[p]}">
        <h2>${PLATTFORM_NAME[p]}</h2>
        <ul class="personen">
${a.filter((x) => x.plattform === p).sort((x, y) => vergleich(x.autor.name, y.autor.name)).map((x) => {
    const h = String(x.autor.handle ?? "").replace(/^@/, ""), prof = x.autor.profil || profilUrl(p, h);
    return `          <li class="person-karte">${avatar(x.avatarVon, "../")}<div><p><a href="../?autor=${esc(x.schluessel)}" class="beitrag-name">${esc(x.autor.name)}</a>${h ? ` <span class="beitrag-handle">@${esc(h)}</span>` : ""} <span class="anzahl">${x.zettel.length}</span>${prof ? ` <a class="leise" href="${esc(prof)}" rel="nofollow noopener" target="_blank">Profil ${SYM.extern}</a>` : ""}</p><ul class="zettel-liste">${x.zettel.map((e) => `<li><a href="../${esc(e.id)}/"><span class="zettel-nr">Zettel ${e.nr}</span> ${esc(titelVon(e))}</a></li>`).join("")}</ul></div></li>`;
  }).join("\n")}
        </ul>
      </section>`).join("\n")}
    </div>` : `    <p>Noch keine Autor:innen.</p>`;
  const kopf = `      <p class="sm-zurueck"><a href="../">Social Media</a></p>
      <h1>Autor:innen</h1>
      <p class="lead">${a.length === 1 ? "Eine Person" : `${a.length} Personen`}, deren Beiträge hier gesichert sind, nach Plattform.</p>`;
  return seite({ pfad: `${BEREICH}autorinnen/`, titel: "Autor:innen", beschreibung: "Register der Autor:innen im Zettelkasten «Social Media».", kopf, inhalt, og: kachel("autorinnen", "Autor:innen") });
}

// ---------- Feed und Sitemap ----------

const cdata = (s) => String(s).replace(/]]>/g, "]]]]><![CDATA[>");
export function feed(alle) {
  const liste = [...alle].sort(nachErfassung).slice(0, 50);
  const zuletzt = liste[0] ? rfc822(liste[0].geaendert ?? liste[0].erfasst) : "Mon, 19 Oct 2026 00:00:00 +0000";
  return `<?xml version="1.0" encoding="utf-8"?>
<!-- Erzeugt aus social-media/daten/eintraege.json (social-media/js/darstellung.js). Nicht von Hand ändern. -->
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Ornament Cloud – Social Media</title>
    <link>${ADRESSE}${BEREICH}</link>
    <atom:link href="${ADRESSE}${BEREICH}feed.xml" rel="self" type="application/rss+xml"/>
    <description>Beiträge aus X, Facebook und Instagram: gesichert, abgeschrieben, verschlagwortet und kommentiert.</description>
    <language>de-ch</language>
    <lastBuildDate>${zuletzt}</lastBuildDate>
${liste.map((e) => `    <item>
      <title>${esc(`Zettel ${e.nr}: ${titelVon(e)}`)}</title>
      <link>${ADRESSE}${BEREICH}${e.id}/</link>
      <guid isPermaLink="true">${ADRESSE}${BEREICH}${e.id}/</guid>
      <pubDate>${rfc822(e.erfasst)}</pubDate>
${(e.schlagworte ?? []).map((s) => `      <category>${esc(s)}</category>`).join("\n")}${(e.schlagworte ?? []).length ? "\n" : ""}      <description><![CDATA[${cdata(`${e.kommentar?.trim() ? kommentarHtml(e.kommentar) + "\n" : ""}<blockquote><p><strong>${esc(e.autor?.name)}</strong>${handleOhneAt(e) ? ` @${esc(handleOhneAt(e))}` : ""} auf ${PLATTFORM_NAME[e.plattform]}${e.veroeffentlicht ? `, ${esc(datum(e.veroeffentlicht))}` : ""}</p><p>${esc(e.text ?? "").replace(/\r?\n/g, "<br>")}</p></blockquote>`)}]]></description>
    </item>`).join("\n")}
  </channel>
</rss>
`;
}

/** alle Adressen des Bereichs für die Sitemap (Zeitleiste, Register, Zettel) */
export function sitemapZeilen(alle) {
  const zuletzt = [...alle].map((e) => isoTag(e.geaendert ?? e.erfasst)).sort().pop() ?? "2026-10-19";
  return [
    `  <url><loc>${ADRESSE}${BEREICH}</loc><lastmod>${zuletzt}</lastmod></url>`,
    `  <url><loc>${ADRESSE}${BEREICH}schlagworte/</loc><lastmod>${zuletzt}</lastmod></url>`,
    `  <url><loc>${ADRESSE}${BEREICH}autorinnen/</loc><lastmod>${zuletzt}</lastmod></url>`,
    ...[...alle].sort((a, b) => a.nr - b.nr).map((e) => `  <url><loc>${ADRESSE}${BEREICH}${e.id}/</loc><lastmod>${isoTag(e.geaendert ?? e.erfasst)}</lastmod></url>`),
  ];
}
/** die Zeilen zwischen <!-- SOCIAL:START --> und <!-- SOCIAL:END --> in sitemap.xml ersetzen (vor </urlset> anlegen, wenn es sie noch nicht gibt) */
export function sitemapEinsetzen(xml, alle) {
  const block = `  <!-- SOCIAL:START (erzeugt aus social-media/daten/eintraege.json) -->\n${sitemapZeilen(alle).join("\n")}\n  <!-- SOCIAL:END -->`;
  if (/ *<!-- SOCIAL:START[\s\S]*?<!-- SOCIAL:END -->/.test(xml)) return xml.replace(/ *<!-- SOCIAL:START[\s\S]*?<!-- SOCIAL:END -->/, () => block);
  return xml.replace("</urlset>", `${block}\n</urlset>`);
}

// ---------- alles ----------

/** alle erzeugten Dateien des Bereichs: Weg ab der Wurzel → Inhalt (ohne sitemap.xml, die nur ergänzt wird) */
export function alleSeiten(daten) {
  const alle = daten.eintraege ?? [];
  const aus = new Map();
  aus.set(`${BEREICH}index.html`, zeitleisteSeite(alle));
  aus.set(`${BEREICH}schlagworte/index.html`, schlagworteSeite(alle));
  aus.set(`${BEREICH}autorinnen/index.html`, autorinnenSeite(alle));
  aus.set(`${BEREICH}feed.xml`, feed(alle));
  for (const e of alle) aus.set(`${BEREICH}${e.id}/index.html`, zettelSeite(e, alle));
  return aus;
}

/** Daten als Datei: stabil eingerückt, Zettel nach Nummer */
export const datenText = (daten) => `${JSON.stringify({ ...daten, eintraege: [...(daten.eintraege ?? [])].sort((a, b) => a.nr - b.nr) }, null, 2)}\n`;
