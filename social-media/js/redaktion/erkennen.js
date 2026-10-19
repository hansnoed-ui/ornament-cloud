// Social Media – Redaktion: Claude liest das Bildschirmfoto (seit 19. Oktober 2026).
// Claude schreibt den Beitrag ab, liest Name, Handle, Zeit und Kennzahlen, findet die eingebetteten Bilder, das Profilbild und Namen Dritter
// (zum Schwärzen) und schlägt Titel und Schlagworte vor. Den Kommentar schreibt die Redaktion selbst. Alles kommt als Vorschlag ins Formular.
// Der Schlüssel bleibt im Browser; die Anfrage geht direkt an api.anthropic.com (offizielles SDK, vendor/anthropic-sdk-0.135.0/).
import Anthropic from "../../../vendor/anthropic-sdk-0.135.0/anthropic.js";

export const MODELL = "claude-opus-5-5";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

const zahlOderNull = { anyOf: [{ type: "integer" }, { type: "null" }] };
const textOderNull = { anyOf: [{ type: "string" }, { type: "null" }] };
const objekt = (eigenschaften) => ({ type: "object", properties: eigenschaften, required: Object.keys(eigenschaften), additionalProperties: false });

/** was Claude zurückgibt (strukturierte Ausgabe) */
export const SCHEMA = objekt({
  plattform: { type: "string", enum: ["x", "facebook", "instagram", "unklar"] },
  autor: objekt({ name: textOderNull, handle: textOderNull, verifiziert: { type: "boolean" } }),
  kontext: textOderNull,
  text: { type: "string" },
  text_abgeschnitten: { type: "boolean" },
  sprache: { type: "string" },
  uebersetzung: textOderNull,
  veroeffentlicht: objekt({ angezeigt: textOderNull, iso: textOderNull, genauigkeit: { type: "string", enum: ["minute", "tag", "monat", "unbekannt"] } }),
  zitiert: { anyOf: [objekt({ name: textOderNull, handle: textOderNull, text: textOderNull }), { type: "null" }] },
  kennzahlen: objekt({ antworten: zahlOderNull, reposts: zahlOderNull, likes: zahlOderNull, ansichten: zahlOderNull, lesezeichen: zahlOderNull, reaktionen: zahlOderNull, kommentare: zahlOderNull, teilungen: zahlOderNull }),
  bereiche: {
    type: "array",
    items: objekt({ art: { type: "string", enum: ["bild", "video", "avatar", "dritte"] }, teil: { type: "integer" }, x: { type: "number" }, y: { type: "number" }, b: { type: "number" }, h: { type: "number" }, beschreibung: { type: "string" } }),
  },
  titel: { type: "string" },
  schlagworte: { type: "array", items: { type: "string" } },
  hinweise: textOderNull,
});

export const SYSTEM = `Du liest Bildschirmfotos von Beiträgen auf X, Facebook oder Instagram für ein öffentliches Archiv: einen kommentierten Zettelkasten auf ornament.cloud. Deine Abschrift wird als Zitat veröffentlicht. Darum gilt:

Text
- Schreib den Text des Hauptbeitrags genau ab, Zeichen für Zeichen: Zeilenumbrüche, Emojis, Satzzeichen, Gross- und Kleinschreibung, Tippfehler, Hashtags und @Erwähnungen bleiben, wie sie sind. Nichts korrigieren, ergänzen, glätten oder kürzen.
- Ist der Text abgeschnitten («Mehr anzeigen», «… mehr», «Show more»), schreib nur ab, was sichtbar ist, und setze text_abgeschnitten auf true.
- Nicht zum Hauptbeitrag gehören: Bedienelemente, Werbung, Antworten und Kommentare anderer darunter, Empfehlungen, die Statuszeile des Telefons, Übersetzungshinweise der Plattform.
- kontext ist eine Zeile über dem Beitrag wie «Antwort an @…», «… hat repostet», «Angepinnt» – sonst null.
- zitiert ist ein eingebetteter, zitierter oder geteilter Beitrag (Name, Handle, Text) – sonst null.

Personen und Zahlen
- Was nicht im Bild steht, ist null. Keine Namen, Handles, Daten oder Zahlen raten. Handles ohne @.
- verifiziert ist true nur, wenn ein Verifizierungszeichen neben dem Namen zu sehen ist.
- Kennzahlen als ganze Zahlen, nur was angezeigt wird: «1,2K», «1.2K», «1,2 Tsd.» → 1200; «3,4 Mio.» → 3400000; «12.345» → 12345. X: antworten, reposts, likes, lesezeichen, ansichten. Facebook: reaktionen, kommentare, teilungen. Instagram: likes, kommentare, ansichten (bei Reels).

Zeit
- veroeffentlicht.angezeigt gibt wieder, was angezeigt wird («vor 3 Std.», «17. Okt.», «2:41 PM · Oct 17, 2024»).
- veroeffentlicht.iso ist das daraus errechnete Datum: «JJJJ-MM-TT» oder mit Uhrzeit in UTC «JJJJ-MM-TTThh:mm:00Z». Relative Angaben beziehen sich auf den Zeitpunkt der Erfassung, Uhrzeiten ohne Zone auf Europe/Zurich. Fehlt das Jahr, nimm das jüngste Datum, das nicht nach der Erfassung liegt. Ist nichts eindeutig, null und genauigkeit «unbekannt».

Bereiche
- Rechtecke im Bild, relativ zu Breite und Höhe des jeweiligen Teils (0 bis 1; x, y = linke obere Ecke; b, h = Breite, Höhe); teil ist der Index des Bildteils, ab 0.
- art «bild» oder «video»: eingebettete Fotos, Grafiken oder Videostandbilder des Hauptbeitrags, je eines; knapp gerahmt, ohne Ränder und Knöpfe der Oberfläche. beschreibung: eine sachliche Bildbeschreibung auf Deutsch für Menschen, die das Bild nicht sehen (ein bis zwei Sätze).
- art «avatar»: das Profilbild der Person, die den Hauptbeitrag verfasst hat.
- art «dritte»: Namen, Handles, Profilbilder oder Gesichter anderer, unbeteiligter Personen (etwa in Antworten, Kommentaren oder «Gefällt …»-Zeilen), damit die Redaktion sie schwärzen kann. Nicht die Autorin, den Autor des Hauptbeitrags, nicht die Person eines zitierten Beitrags.

Vorschläge
- titel: kurz und sachlich, auf Deutsch, höchstens acht Wörter; sagt, worum es geht. Kein Zitat, keine Wertung, keine Zuspitzung.
- schlagworte: drei bis fünf deutsche Substantive mit grossem Anfangsbuchstaben. Nimm Schlagworte aus der mitgeschickten Liste, wenn sie passen; neue nur, wenn keines passt.
- sprache: ISO-639-1-Code des Beitragstextes. Ist er nicht Deutsch, steht in uebersetzung eine sinngetreue deutsche Übersetzung im selben Ton; sonst null.
- hinweise: was die Redaktion prüfen sollte (unscharf, abgeschnitten, Datum unsicher, mehrere Beiträge im Bild) – sonst null.
- Den Kommentar schreibt die Redaktion selbst. Du schreibst keinen, und du bewertest den Beitrag nicht.`;

/**
 * Die Frage an Claude. teile: [{ daten (Base64), typ ("image/jpeg"), oben, hoehe }] – das Bildschirmfoto, von oben nach unten in überlappenden Teilen;
 * kontext: { erfasst (ISO), erfasstText, adresse, ausAdresse: { plattform, handle, veroeffentlicht }, schlagworte: [..], autoren: [..] }
 */
export function frage(teile, kontext) {
  const zeilen = [
    `Erfasst: ${kontext.erfasstText} (${kontext.erfasst}).`,
    kontext.adresse ? `Adresse des Beitrags: ${kontext.adresse}` : "Die Adresse des Beitrags ist nicht bekannt.",
  ];
  const a = kontext.ausAdresse ?? {};
  if (a.plattform) zeilen.push(`Aus der Adresse gelesen (verlässlicher als das Bild): Plattform ${a.plattform}${a.handle ? `, Handle ${a.handle}` : ""}${a.veroeffentlicht ? `, veröffentlicht ${a.veroeffentlicht} (aus der Beitrags-ID errechnet)` : ""}.`);
  zeilen.push(teile.length > 1 ? `Das Bildschirmfoto ist hoch und kommt in ${teile.length} überlappenden Teilen, von oben nach unten (teil 0 bis ${teile.length - 1}). Gib jeden Bereich nur einmal an.` : "Das Bildschirmfoto kommt in einem Teil (teil 0).");
  if (kontext.schlagworte?.length) zeilen.push(`Bestehende Schlagworte: ${kontext.schlagworte.join(", ")}`);
  if (kontext.autoren?.length) zeilen.push(`Bekannte Autor:innen (Schreibweise übernehmen, wenn es dieselben sind): ${kontext.autoren.join("; ")}`);
  return [
    ...teile.map((t) => ({ type: "image", source: { type: "base64", media_type: t.typ, data: t.daten } })),
    { type: "text", text: zeilen.join("\n") },
  ];
}

/** die Bereiche auf das ganze Bild umrechnen und doppelte (aus den Überlappungen) zusammenlegen */
export function bereicheImGanzen(bereiche, teile) {
  const klemmen = (v) => Math.min(1, Math.max(0, v));
  const ganz = (bereiche ?? []).map((r) => {
    const t = teile[r.teil] ?? teile[0];
    const x = klemmen(r.x), y = klemmen(r.y), b = klemmen(Math.min(r.b, 1 - x)), h = klemmen(Math.min(r.h, 1 - y));
    return { art: r.art, beschreibung: r.beschreibung ?? "", x, b, y: t.oben + y * t.hoehe, h: h * t.hoehe };
  }).filter((r) => r.b > 0.01 && r.h > 0.003);
  const flaeche = (r) => r.b * r.h;
  const ueberlapp = (p, q) => {
    const b = Math.max(0, Math.min(p.x + p.b, q.x + q.b) - Math.max(p.x, q.x)), h = Math.max(0, Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y));
    return (b * h) / Math.min(flaeche(p), flaeche(q));
  };
  const aus = [];
  for (const r of ganz.sort((p, q) => flaeche(q) - flaeche(p))) if (!aus.some((s) => s.art === r.art && ueberlapp(r, s) > 0.6)) aus.push(r);
  if (aus.filter((r) => r.art === "avatar").length > 1) {        // nur ein Profilbild: das oberste
    const oben = aus.filter((r) => r.art === "avatar").sort((p, q) => p.y - q.y)[0];
    return aus.filter((r) => r.art !== "avatar" || r === oben).sort((p, q) => p.y - q.y);
  }
  return aus.sort((p, q) => p.y - q.y);
}

/** JSON aus einer Antwort ohne strukturierte Ausgabe (Rückfall) */
export function jsonAusText(text) {
  const t = String(text ?? "").trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try { return JSON.parse(t); } catch {}
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
  throw new Error("Claude hat kein lesbares JSON geschickt.");
}

export class ErkennenFehler extends Error {}

/**
 * Claude fragen. schluessel: Anthropic-API-Schlüssel; Rückgabe: das Ergebnis nach SCHEMA, mit bereichen im ganzen Bild, und die Nutzung (Token).
 * Rückfallstufen: ohne den Fallback-Parameter, dann ohne strukturierte Ausgabe (JSON im Text), falls die API einen Teil der Anfrage ablehnt.
 */
export async function erkennen({ schluessel, teile, kontext, signal, melden = () => {}, Klient = Anthropic }) {
  const client = new Klient({ apiKey: schluessel, dangerouslyAllowBrowser: true, maxRetries: 2 });
  const inhalt = frage(teile, kontext);
  const stufen = [
    { fallback: true, schema: true },
    { fallback: false, schema: true },
    { fallback: false, schema: false },
  ];
  let letzter;
  for (const stufe of stufen) {
    const anfrage = {
      model: MODELL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", ...(stufe.schema ? { format: { type: "json_schema", schema: SCHEMA } } : {}) },
      system: stufe.schema ? SYSTEM : `${SYSTEM}\n\nAntworte nur mit einem JSON-Objekt nach diesem Schema, ohne weiteren Text:\n${JSON.stringify(SCHEMA)}`,
      messages: [{ role: "user", content: inhalt }],
      ...(stufe.fallback ? { betas: [FALLBACK_BETA], fallbacks: "default" } : {}),
    };
    try {
      melden(stufe === stufen[0] ? "Claude liest das Bildschirmfoto …" : "Claude liest noch einmal (einfachere Anfrage) …");
      const stream = client.beta.messages.stream(anfrage, { signal });
      const antwort = await stream.finalMessage();
      if (antwort.stop_reason === "refusal") throw new ErkennenFehler("Claude hat das Lesen dieses Bildes abgelehnt. Bitte die Felder von Hand ausfüllen.");
      if (antwort.stop_reason === "max_tokens") throw new ErkennenFehler("Die Antwort war zu lang und ist abgebrochen. Ein kleineres Bildschirmfoto versuchen.");
      const text = antwort.content.filter((b) => b.type === "text").map((b) => b.text).join("");
      const ergebnis = jsonAusText(text);
      ergebnis.bereiche = bereicheImGanzen(ergebnis.bereiche, teile);
      return { ergebnis, nutzung: antwort.usage, modell: antwort.model };
    } catch (e) {
      letzter = e;
      if (e instanceof ErkennenFehler) throw e;
      if (e?.name === "AbortError" || signal?.aborted) throw new ErkennenFehler("Abgebrochen.");
      if (e instanceof Klient.AuthenticationError) throw new ErkennenFehler("Anthropic kennt den Schlüssel nicht. Bitte in den Einstellungen prüfen.");
      if (e instanceof Klient.PermissionDeniedError) throw new ErkennenFehler("Der Anthropic-Schlüssel darf dieses Modell nicht nutzen.");
      if (e instanceof Klient.RateLimitError) throw new ErkennenFehler("Anthropic bremst gerade (zu viele Anfragen). In einer Minute noch einmal.");
      if (e instanceof Klient.APIConnectionError) throw new ErkennenFehler("Keine Verbindung zu api.anthropic.com.");
      if (e instanceof Klient.BadRequestError) continue;            // nächste, einfachere Stufe
      if (e instanceof SyntaxError || /JSON/.test(e?.message ?? "")) continue;
      throw new ErkennenFehler(`Claude konnte nicht lesen: ${e?.message ?? e}`);
    }
  }
  throw new ErkennenFehler(`Claude konnte nicht lesen: ${letzter?.message ?? letzter}`);
}
