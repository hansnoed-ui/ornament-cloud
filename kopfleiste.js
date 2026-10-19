// Die Kopfleiste der Website als Baustein (seit 18. Oktober 2026, seit 19. Oktober 2026 hier an der Wurzel statt in tools/, damit auch Seiten im Browser sie holen können; Wunsch: «oben rechts noch das allgemeine Menü, damit man nicht ganz verloren
// ist … das Menü müsste überall auf der Seite sichtbar sein, auch wenn man in den Beiträgen, Anwendungen etc. ist»): links die Hauptlinks
// (seitenweg, steht in jeder Seite selbst), rechts die Kästchen des Menüs (seit 19. Oktober 2026 fünf), darunter die Welle (icons.js zeichnet sie). Dasselbe Markup wie
// von Hand auf der Startseite; die Erzeuger (tools/build-zu-seiner-zeit.ts, tools/build-alpha-texte.ts) und tools/kopfleiste-einsetzen.mjs
// (für die Seiten, die von Hand gepflegt werden) holen es von hier. tests/struktur.test.mjs prüft, dass es überall gleich ist.

/** die fünf Kästchen: [Name, Pfad ab der Wurzel der Website, Symbol]; «Social» seit dem 19. Oktober 2026 (der Zettelkasten der Beiträge aus X, Facebook und Instagram, social-media/) */
export const MENU = [
  ["Apps", "apps/", '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>'],
  ["Prompts", "masterprompts/", '<path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5h-7.5L7 20v-3.5H5A1.5 1.5 0 0 1 3.5 15V6A1.5 1.5 0 0 1 5 4.5z"/><path d="M7.5 8.5l3 2.25-3 2.25"/><path d="M12.5 13h4"/>'],
  ["Web", "web/", '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5S9.6 5.8 12 3.5z"/>'],
  ["Zettel", "zu-seiner-zeit/", '<path d="M7 3.5h11.5A1.5 1.5 0 0 1 20 5v11"/><rect x="4" y="6.5" width="13" height="14" rx="1.5"/><path d="M7 10.5h7"/><path d="M7 13.5h7"/><path d="M7 16.5h4"/>'],
  ["Social", "social-media/", '<path d="M10 4.5 8 19.5"/><path d="M16 4.5l-2 15"/><path d="M5 9.25h14.5"/><path d="M4.5 14.75H19"/>'],
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
    ...MENU.map(([name, pfad, symbol]) =>
      `${e}  <a class="menu-item" href="${site}${pfad}"${name === aktiv ? ` aria-current="${aktuell}"` : ""}><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${symbol}</svg><span>${name}</span></a>`),
    `${e}</nav>`,
  ].join("\n");
}

/** die ganze Kopfleiste um die Hauptlinks (das Markup von <nav class="seitenweg"> … </nav>, schon eingerückt) */
export function kopfleiste(seitenweg, site, opt = {}) {
  const e = (opt.einzug ?? "        ").slice(2);
  return `${e}<div class="topbar">\n${seitenweg}\n${welleUndMenu(site, opt)}\n${e}</div>`;
}
