// «OMNA COLOR» – die Seite der installierten App: alpha/omna-color/rad/index.html, eine Abschrift von alpha/omna-color/index.html (seit 19. Oktober 2026).
// Wie bei The Fictory (werkbank/) hat die installierte App eine eigene Adresse (start_url und scope im Manifest): Links auf die Website – die Anwendung
// alpha/omna-color/ und die App-Seite alpha/omna-color/app/ – liegen ausserhalb und öffnen darum im Browser, wo der Knopf zum Installieren
// steht (in der App braucht es den Knopf nicht).
// Die Abschrift trägt nur zusätzlich <base href="../">: Alle Verweise gelten wie auf der Website, nichts wird umgeschrieben.
//   node tools/build-omna-app.mjs        (nach jeder Änderung an alpha/omna-color/index.html; ein Test prüft, dass die Abschrift aktuell ist)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const QUELLE = new URL("../alpha/omna-color/index.html", import.meta.url);
export const ZIEL = new URL("../alpha/omna-color/rad/index.html", import.meta.url);

export function bauen(html) {
  const marke = '<meta charset="utf-8">';
  if (!html.includes(marke)) throw new Error(`${marke} fehlt in der Quelle`);
  return html.replace(marke, `${marke}
  <!-- Erzeugt von tools/build-omna-app.mjs aus ../index.html. Nicht von Hand bearbeiten.
       Die Seite der installierten App (start_url und scope des Manifests); <base> lässt alle Verweise wie auf der Website gelten. -->
  <base href="../">`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(new URL("./", ZIEL), { recursive: true });
  writeFileSync(ZIEL, bauen(readFileSync(QUELLE, "utf8")));
  console.log("geschrieben:", fileURLToPath(ZIEL));
}
