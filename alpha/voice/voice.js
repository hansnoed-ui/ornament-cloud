// ornament.studio – Stimme (alpha/voice/): anmelden, Text schicken, auf die Aufnahme warten, anhören und herunterladen.
// Alles Geheime bleibt in stimme.php und ausserhalb der Website; die Seite hält nur das Sitzungs-Cookie.
const API = "stimme.php";
const $ = (id) => document.getElementById(id);
const stand = $("stand");
const MAX = 5000;
let warten = null;

const zeige = (text, fehler = false) => { stand.textContent = text; stand.classList.toggle("fehler", fehler); };
const holen = (pfad = "") => fetch(API + pfad, { credentials: "same-origin" }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }));
const schicken = (daten) => fetch(API, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(daten) })
  .then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }));

/** grobe Schätzung: 2,4 Wörter je Sekunde Sprache; Start 2,5 min, dann 15 s Rechnen je Sekunde Sprache (2 Kerne bei GitHub) */
export function schaetzen(text) {
  const woerter = (text.match(/\S+/g) || []).length;
  const sprache = Math.round(woerter / 2.4);
  const rechnen = Math.round((150 + sprache * 15) / 60);
  return { woerter, sprache, rechnen };
}

const STATUS = { wartet: "wartet", laeuft: "wird gesprochen", fertig: "fertig", fehler: "Fehler" };
const zeit = (s) => new Date(s * 1000).toLocaleString("de-CH", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
const sek = (d) => d >= 60 ? `${Math.floor(d / 60)} min ${Math.round(d % 60)} s` : `${Math.round(d)} s`;

function eintrag(a) {
  const li = document.createElement("li");
  const kopf = document.createElement("div"); kopf.className = "zeile";
  const marke = document.createElement("span"); marke.className = `marke ${a.status}`; marke.textContent = STATUS[a.status] ?? a.status;
  const info = document.createElement("span"); info.className = "klein";
  info.textContent = `${zeit(a.zeit)} · ${a.stil === "g" ? "ruhig" : "lebhaft"}${a.dauer ? " · " + sek(a.dauer) : ""}`;
  kopf.append(marke, info);
  const anfang = document.createElement("p"); anfang.className = "anfang"; anfang.textContent = a.anfang + (a.anfang.length >= 80 ? " …" : "");
  li.append(kopf, anfang);
  if (a.status === "fertig") {
    const ton = document.createElement("audio"); ton.controls = true; ton.preload = "none"; ton.src = `${API}?laden=${a.id}&format=mp3&hoeren=1`;
    const knoepfe = document.createElement("div"); knoepfe.className = "zeile";
    for (const [f, t] of [["wav", "WAV herunterladen"], ["mp3", "MP3 herunterladen"]]) {
      const l = document.createElement("a"); l.className = "knopf"; l.href = `${API}?laden=${a.id}&format=${f}`; l.textContent = t; l.setAttribute("download", "");
      knoepfe.append(l);
    }
    li.append(ton, knoepfe);
  }
  return li;
}

async function liste() {
  const r = await holen("?liste");
  if (r.status === 401) return anmelden();
  const auftraege = r.json.auftraege ?? [];
  const offen = auftraege.filter((a) => a.status === "wartet" || a.status === "laeuft");
  // offene Aufträge nachfragen: dabei holt stimme.php fertige Aufnahmen bei GitHub ab
  const neu = await Promise.all(offen.map((a) => holen(`?auftrag=${a.id}`).then((x) => ({ ...a, ...x.json }))));
  const nachId = Object.fromEntries(neu.map((a) => [a.id, a]));
  const ul = $("aufnahmen"); ul.replaceChildren(...auftraege.map((a) => eintrag(nachId[a.id] ?? a)));
  $("liste").hidden = false;
  if (!auftraege.length) { const li = document.createElement("li"); li.className = "klein"; li.textContent = "Noch keine Aufnahmen. Schreib oben einen Text und tippe auf «Sprechen»."; ul.append(li); }
  clearTimeout(warten);
  if (neu.some((a) => a.status === "wartet" || a.status === "laeuft")) warten = setTimeout(liste, 20000);
}

function anmelden() {
  $("anmeldung").hidden = false; $("arbeit").hidden = true; $("liste").hidden = true;
  zeige("Die Stimme ist bereit. Bitte mit dem Passwort anmelden.");
  $("passwort").focus();
}

function arbeiten() {
  $("anmeldung").hidden = true; $("arbeit").hidden = false;
  zeige("Angemeldet. Text eingeben, Sprechweise wählen, «Sprechen».");
  liste();
}

function zaehlen() {
  const t = $("text").value, s = schaetzen(t);
  $("zaehler").textContent = `${t.length} / ${MAX} Zeichen`;
  $("schaetzung").textContent = s.woerter ? `etwa ${sek(s.sprache)} Sprache, fertig in rund ${s.rechnen} min` : "";
  $("sprechen").disabled = !t.trim();
}

async function start() {
  const r = await holen().catch(() => null);
  if (!r) return zeige("Die Stimme ist nicht erreichbar. Läuft die Seite auf ornament.cloud?", true);
  if (!r.json.bereit) return zeige("Die Stimme ist noch nicht eingerichtet (Passwort oder Schlüssel fehlt, docs/stimme.md).", true);
  r.json.angemeldet ? arbeiten() : anmelden();
}

$("anmeldeform")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const r = await schicken({ aktion: "anmelden", passwort: $("passwort").value });
  $("passwort").value = "";
  if (r.status === 200) return arbeiten();
  zeige(r.json.fehler ?? "Anmelden ging nicht.", true);
});

$("abmelden")?.addEventListener("click", async () => { await schicken({ aktion: "abmelden" }); clearTimeout(warten); anmelden(); });
$("text")?.addEventListener("input", zaehlen);
$("datei")?.addEventListener("change", async (e) => {
  const f = e.target.files?.[0]; if (!f) return;
  $("text").value = (await f.text()).slice(0, MAX); zaehlen(); e.target.value = "";
});
$("sprechen")?.addEventListener("click", async () => {
  const knopf = $("sprechen"); knopf.disabled = true;
  const stil = document.querySelector('input[name="stil"]:checked')?.value ?? "b";
  const r = await schicken({ aktion: "sprechen", text: $("text").value, stil });
  if (r.status === 401) return anmelden();
  if (r.status !== 200) { zeige(r.json.fehler ?? "Der Auftrag ging nicht durch.", true); knopf.disabled = false; return; }
  zeige(`Auftrag ist unterwegs. ${$("schaetzung").textContent}. Du kannst die Seite schliessen.`);
  knopf.disabled = false;
  liste();
});

if ($("text")) zaehlen();
start();
