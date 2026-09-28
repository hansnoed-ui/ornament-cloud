// «Zu seiner Zeit» – Verhalten im Browser (von Hand gepflegt; die Seiten erzeugt tools/build-zu-seiner-zeit.ts).
// – Strophe: ein Klick auf einen Verweis öffnet das Seitenpanel mit eigener Adresse (#verweis-…),
//   Zurück schliesst es; ohne JavaScript führt der Link auf die Verweisseite.
// – Spur: zeigt immer nur die Nachbarschaft eines Knotens (Strophe oder Person); ein Klick macht einen
//   Nachbarn zum neuen Mittelpunkt und legt einen Eintrag in der Browser-Geschichte an.
// – Zufall: wählt gleichverteilt eine der 49 Strophen, nie unmittelbar die gerade geöffnete.
// Die beiden Zufallsfunktionen sind rein und werden in tests/zu-seiner-zeit.test.mjs geprüft.

/** Gleichverteilte ganze Zahl in [0, n) aus kryptografischem Zufall (Verwerfen statt Modulo-Verzerrung) */
export function zufallsZahl(n, bytes = a => crypto.getRandomValues(a)) {
  const grenze = Math.floor(0x100000000 / n) * n;
  const a = new Uint32Array(1);
  for (;;) { bytes(a); if (a[0] < grenze) return a[0] % n; }
}

/** Eine Nummer aus 1…anzahl, gleichverteilt unter allen ausser «ausser» (fehlt sie, unter allen) */
export function andereStrophe(anzahl, ausser, zahl = zufallsZahl) {
  const ohne = Number.isInteger(ausser) && ausser >= 1 && ausser <= anzahl;
  const k = zahl(ohne ? anzahl - 1 : anzahl) + 1;
  return ohne && k >= ausser ? k + 1 : k;
}

if (typeof document !== "undefined") {
  const seite = document.body.dataset.seite;
  const reduziert = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const basis = new URL(document.querySelector('link[rel="stylesheet"]').href.replace(/zsz\.css.*$/, ""));
  const daten = () => fetch(new URL("zsz-daten.json", basis)).then(r => r.json());

  if (seite === "strophe") seitenpanel();
  if (seite === "spur") daten().then(spur);
  if (seite === "zufall") daten().then(zufall);

  // ---------- Seitenpanel ----------
  function seitenpanel() {
    const panels = [...document.querySelectorAll("dialog.zsz-panel")];
    if (!panels.length || typeof HTMLDialogElement === "undefined") return;   // ohne <dialog>: Links führen zur Verweisseite
    let eigenerEintrag = false;
    const zeigen = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      for (const d of panels) {
        if (d.id === id) { if (!d.open) d.showModal(); }
        else if (d.open) d.close();
      }
    };
    document.addEventListener("click", e => {
      const a = e.target.closest("a[data-panel]");
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      history.pushState({ panel: a.dataset.panel }, "", "#" + a.dataset.panel);
      eigenerEintrag = true;
      zeigen();
    });
    for (const d of panels) d.addEventListener("close", () => {
      if (location.hash.slice(1) !== d.id) return;
      if (eigenerEintrag && history.state?.panel === d.id) { eigenerEintrag = false; history.back(); }
      else history.replaceState(null, "", location.pathname + location.search);
    });
    addEventListener("popstate", zeigen);
    addEventListener("hashchange", zeigen);
    if (location.hash.startsWith("#verweis-")) zeigen();
  }

  // ---------- Spur ----------
  function spur(d) {
    const feld = document.querySelector(".spur-feld");
    const S = d.stanzas, P = d.persons;
    const stro = id => S[id - 1];
    const hrefS = id => `?s=${id}`, hrefP = slug => `?p=${slug}`;
    const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const knotenS = (id, zusatz = "") => `<li><a class="spur-knoten" href="${hrefS(id)}"><span class="zsz-nr">${id}</span> ${esc(stro(id).title)}</a>${zusatz}</li>`;
    const knotenP = slug => `<li><a class="spur-knoten" href="${hrefP(slug)}">${esc(P[slug].name)}</a> <span class="zsz-hinweis">${esc(P[slug].disciplines.join(", "))}</span></li>`;
    const gruppe = (titel, inhalt) => inhalt ? `<section class="spur-gruppe"><h2 class="zsz-label">${titel}</h2><ul class="zsz-liste">${inhalt}</ul></section>` : "";
    const pfad = [];

    const mitte = () => {
      const q = new URLSearchParams(location.search);
      const s = Number(q.get("s")), p = q.get("p");
      if (p && P[p]) return { p };
      return { s: s >= 1 && s <= S.length ? s : 1 };
    };
    const zeichnen = (fokus = true) => {
      const m = mitte();
      const name = m.p ? P[m.p].name : `${m.s} ${stro(m.s).title}`;
      if (pfad[pfad.length - 1] !== name) pfad.push(name);
      if (pfad.length > 6) pfad.shift();
      let html;
      if (m.p) {
        const x = P[m.p];
        html = `<section class="spur-aktuell"><h2 class="zsz-label">Aktuell</h2>
          <p class="spur-titel" tabindex="-1">${esc(x.name)}</p><p class="zsz-meta">${esc(x.disciplines.join(", "))}</p>
          <p class="zsz-weiter"><a href="../verweis/${m.p}/">Verweisseite <span aria-hidden="true">→</span></a></p></section>
          ${gruppe("In den Strophen", x.stanzas.map(id => knotenS(id)).join(""))}`;
      } else {
        const s = stro(m.s);
        const verwandt = [...s.conceptual.map(id => knotenS(id)),
          ...s.resonances.map(r => knotenS(r.id, ` <span class="zsz-hinweis">über ${r.via.map(v => esc(P[v].name)).join(", ")}</span>`))].join("");
        html = `<section class="spur-aktuell"><h2 class="zsz-label">Aktuell</h2>
          <p class="zsz-meta">${s.cycle} · ${esc(s.cycleTitle)}</p>
          <p class="spur-titel" tabindex="-1"><span class="zsz-nr">${s.id}</span> ${esc(s.title)}</p>
          <p class="bottom-line">${esc(s.bottomLine)}</p>
          <p class="zsz-weiter"><a href="../strophe/${s.slug}/">Strophe lesen <span aria-hidden="true">→</span></a></p></section>
          <div class="spur-nachbarn">
          ${gruppe("Vorher", m.s > 1 ? knotenS(m.s - 1) : "")}
          ${gruppe("Danach", m.s < S.length ? knotenS(m.s + 1) : "")}
          </div>
          ${gruppe("Verwandt", verwandt)}
          ${gruppe("Resonanzen", s.refs.map(r => knotenP(r.slug)).join(""))}`;
      }
      const spurzeile = pfad.length > 1 ? `<p class="spur-pfad zsz-meta" aria-label="Bisherige Spur">${pfad.map(esc).join(" → ")}</p>` : "";
      feld.innerHTML = spurzeile + html;
      document.title = `${name} · Spur – Zu seiner Zeit`;
      if (!reduziert) { feld.classList.remove("spur-neu"); void feld.offsetWidth; feld.classList.add("spur-neu"); }
      if (fokus) feld.querySelector(".spur-titel").focus({ preventScroll: true });
    };
    feld.addEventListener("click", e => {
      const a = e.target.closest("a.spur-knoten");
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault();
      history.pushState(null, "", a.getAttribute("href"));
      zeichnen();
      scrollTo({ top: 0, behavior: reduziert ? "auto" : "smooth" });
    });
    addEventListener("popstate", () => zeichnen());
    zeichnen(false);
  }

  // ---------- Zufall ----------
  function zufall(d) {
    const von = Number(new URLSearchParams(location.search).get("von"));
    const id = andereStrophe(d.stanzas.length, von);
    location.replace(new URL(`strophe/${d.stanzas[id - 1].slug}/`, basis));   // ersetzt: Zurück führt zur vorherigen Strophe
  }
}
