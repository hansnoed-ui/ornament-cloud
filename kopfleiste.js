// Die Kopfleiste der Website als Baustein (seit 18. Oktober 2026, seit 19. Oktober 2026 hier an der Wurzel statt in tools/, damit auch Seiten im Browser sie holen können; Wunsch: «oben rechts noch das allgemeine Menü, damit man nicht ganz verloren
// ist … das Menü müsste überall auf der Seite sichtbar sein, auch wenn man in den Beiträgen, Anwendungen etc. ist»): links die Hauptlinks
// (seitenweg, steht in jeder Seite selbst), rechts die Kästchen des Menüs (seit 19. Oktober 2026 fünf, seit 27. Oktober 2026 sechs, seit 31. Oktober 2026 sieben), darunter die Welle (icons.js zeichnet sie). Dasselbe Markup wie
// von Hand auf der Startseite; die Erzeuger (tools/build-zu-seiner-zeit.ts, tools/build-alpha-texte.ts) und tools/kopfleiste-einsetzen.mjs
// (für die Seiten, die von Hand gepflegt werden) holen es von hier. tests/struktur.test.mjs prüft, dass es überall gleich ist.

/** die Kästchen (seit 31. Oktober 2026 sieben): [Name, Pfad ab der Wurzel der Website, Symbol, { neuesFenster }]; «Social» seit dem 19. Oktober 2026 (der Zettelkasten der Beiträge aus X, Facebook und Instagram, social-media/);
 *  seit dem 19. Oktober 2026 (abends) ohne «Web» (die Seite web/ bleibt unter ihrer Adresse, nur nicht mehr im Menü) und dahinter als fünftes «Art» (Bilder, Prints, Apps und
 *  Gestaltung zum Kaufen, art/; Symbol: ein gerahmtes Bild, Sonne und Hügel im Passepartout). Wunsch: «Die Seite "Web" soll aus dem Menu verschwinden (nicht löschen, nur aus dem Menu)
 *  … Neu soll als 5. Menupunkt (nach: "Social") ein "Art"-Seite entstehen» */
export const MENU = [
  // seit dem 27. Oktober 2026 «Lab», seit demselben Tag (Nachmittag) an erster Stelle (Wunsch: «ich möchte das Lab an der ersten Stelle im Menu haben - vor Zettel») (ornament.lab, die Landing-Page beta/lab/, von dort «Lab öffnen» nach alpha/lab/); öffnet in einem neuen Fenster.
  // Wunsch: «Nimm das Lab als Menupunkt auf die website (öffnet in einem neuen browser fenster)». Symbol: ein Laborkolben.
  ["Apps", "apps/", '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>'],
  ["Prompts", "masterprompts/", '<path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-7.5L7 20v-3.5H5A1.5 1.5 0 0 1 3.5 15V6A1.5 1.5 0 0 1 5 4.5z"/><path d="M7.5 8.5l3 2.25-3 2.25"/><path d="M12.5 13h4"/>'],
  ["Zettel", "zu-seiner-zeit/", '<path d="M7 3.5h11.5A1.5 1.5 0 0 1 20 5v11"/><rect x="4" y="6.5" width="13" height="14" rx="1.5"/><path d="M7 10.5h7"/><path d="M7 13.5h7"/><path d="M7 16.5h4"/>'],
  ["Social", "social-media/", '<path d="M10 4.5 8 19.5"/><path d="M16 4.5l-2 15"/><path d="M5 9.25h14.5"/><path d="M4.5 14.75H19"/>'],
  ["Art", "art/", '<rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/><rect x="6.5" y="6.5" width="11" height="11" rx="0.5"/><circle cx="10" cy="10" r="1.3"/><path d="M6.5 16c2-2.4 4.2-3.2 6.4-2.3 1.6.6 2.9.4 4.6-.9"/>'],
  // seit dem 28. Oktober 2026 «Beta» statt «Lab», am selben Abend ganz nach rechts (Wunsch: «der menupunkt beta sollte vielleicht ganz rechts im menu sein»), aufklappbar (Wunsch: «anstatt den menu punkt "lab" den menupunkt "beta", aufklappbar und darin "lab" und "das 3. rad"»);
  // beide öffnen weiter in einem neuen Fenster. Ein <details> ohne Skript, icons.js schliesst es bei einem Klick daneben und mit Escape.
  ["Beta", null, '<path d="M9 3.5h6"/><path d="M10.25 3.5v6.25L4.9 18.4a1.4 1.4 0 0 0 1.2 2.1h11.8a1.4 1.4 0 0 0 1.2-2.1l-5.35-8.65V3.5"/><path d="M7.4 14.5h9.2"/>',
    { unter: [["Lab", "beta/lab/"], ["Das 3. Rad", "beta/drittes-rad/"]] }],
  // seit dem 31. Oktober 2026 ganz rechts «Gamma» (ornament.cloud/gamma/), in einem neuen Fenster und in Rosa wie «Beta», weil es aus der Seite wegführt; zuerst einige Minuten unter «Beta»
  // (Wunsch: «Gamma bitte nicht unter beta sondern nebenan»). Symbol: ein Planet mit seiner Bahn, wie auf der Gamma-Seite.
  ["Gamma", "gamma/", '<circle cx="12" cy="12" r="3.25"/><ellipse cx="12" cy="12" rx="9.25" ry="4" transform="rotate(-24 12 12)"/>', { neuesFenster: true }],
];

/**
 * Welle und Menü (ohne die Hauptlinks davor): site – der Weg zur Wurzel der Website ("", "../", …); aktiv – der Name des Kästchens, unter dem die
 * Seite steht (oder null); aktuell – "page", wenn es die Seite des Kästchens selbst ist, sonst "true"; einzug – Leerzeichen vor jeder Zeile.
 */
export function welleUndMenu(site, { aktiv = null, aktuell = "true", einzug = "        " } = {}) {
  const e = einzug;
  return [
    `${e}<svg class="divider" data-icon="wave" aria-hidden="true" preserveAspectRatio="none"></svg>`,
    `${e}<nav class="menu" aria-label="Hauptmenü">`,
    ...MENU.map(([name, pfad, symbol, { neuesFenster = false, unter = null } = {}]) => unter
      ? `${e}  <details class="menu-auf"><summary class="menu-item"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${symbol}</svg><span>${name}</span></summary><span class="menu-liste">${unter.map(([n, p]) => `<a href="${site}${p}" target="_blank" rel="noopener">${n}</a>`).join("")}</span></details>`
      : `${e}  <a class="menu-item" href="${site}${pfad}"${name === aktiv ? ` aria-current="${aktuell}"` : ""}${neuesFenster ? ' target="_blank" rel="noopener"' : ""}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${symbol}</svg><span>${name}</span></a>`),
    `${e}</nav>`,
  ].join("\n");
}

/** die ganze Kopfleiste um die Hauptlinks (das Markup von <nav class="seitenweg"> … </nav>, schon eingerückt) */
export function kopfleiste(seitenweg, site, opt = {}) {
  const e = (opt.einzug ?? "        ").slice(2);
  return `${e}<div class="topbar">\n${seitenweg}\n${welleUndMenu(site, opt)}\n${e}</div>`;
}
