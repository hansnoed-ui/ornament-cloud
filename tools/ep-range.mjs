// Prüft, ob die Audioquelle der Hörseite Range-Anfragen mit 206 Partial Content beantwortet. Nur dann kann man vor dem vollständigen Laden
// zu späteren Tracks springen. Liest die Hörseite und ihre ep.json wie der Browser.
//
//   node tools/ep-range.mjs https://ornament.cloud/listen/directer/
//   node tools/ep-range.mjs http://localhost:8795/listen/directer/
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export async function pruefeRange(seite) {
  const basis = new URL(seite.endsWith("/") ? seite : seite + "/");
  const zeilen = [], fehler = [];
  const ep = await (await fetch(new URL("ep.json", basis), { cache: "no-store" })).json();
  if (!ep.audio) return { ok: false, zeilen, fehler: ["«audio» in ep.json ist leer"] };
  const audio = new URL(ep.audio, basis);
  zeilen.push(`Audioquelle: ${audio}`);
  const kopf = await fetch(audio, { method: "HEAD" });
  const groesse = Number(kopf.headers.get("content-length"));
  zeilen.push(`HEAD: ${kopf.status}, ${kopf.headers.get("content-type")}, ${groesse ? (groesse / 1e6).toFixed(1) + " MB" : "Länge unbekannt"}, Accept-Ranges: ${kopf.headers.get("accept-ranges") ?? "–"}, Content-Encoding: ${kopf.headers.get("content-encoding") ?? "–"}`);
  if (!kopf.ok) fehler.push(`Die Audiodatei antwortet mit ${kopf.status}`);
  if (kopf.headers.get("content-encoding")) fehler.push("Die Audiodatei wird komprimiert ausgeliefert; Range-Anfragen brauchen die unveränderte Datei");
  if (!/^audio\/(wav|x-wav|wave|vnd\.wave)/.test(kopf.headers.get("content-type") || "")) fehler.push(`Inhaltstyp ${kopf.headers.get("content-type")} statt audio/wav`);
  // ein Stück aus der zweiten Hälfte, wie beim Springen zu Track 3 oder 4
  const von = groesse ? Math.floor(groesse * 0.75) : 1000000, bis = von + 65535;
  const teil = await fetch(audio, { headers: { range: `bytes=${von}-${bis}` } });
  const daten = new Uint8Array(await teil.arrayBuffer());
  zeilen.push(`GET Range bytes=${von}-${bis}: ${teil.status}, Content-Range: ${teil.headers.get("content-range") ?? "–"}, ${daten.length} Bytes erhalten`);
  if (teil.status !== 206) fehler.push(`Range-Anfrage: ${teil.status} statt 206 Partial Content`);
  else if (daten.length !== bis - von + 1) fehler.push(`Range-Anfrage: ${daten.length} statt ${bis - von + 1} Bytes`);
  return { ok: fehler.length === 0, zeilen, fehler };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const seite = process.argv[2];
  if (!seite) { console.error("Aufruf: node tools/ep-range.mjs <Adresse der Hörseite>"); process.exit(2); }
  const r = await pruefeRange(seite).catch((e) => ({ ok: false, zeilen: [], fehler: [e.message] }));
  for (const z of r.zeilen) console.log(z);
  for (const f of r.fehler) console.log(`FEHLER: ${f}`);
  console.log(r.ok ? "OK: 206 Partial Content, Springen vor dem vollständigen Laden ist möglich." : "NICHT OK");
  process.exit(r.ok ? 0 : 1);
}
