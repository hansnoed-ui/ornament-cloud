// «The Fictory» – die Seite der installierten App: alpha/the-fictory/werkbank/index.html, eine Abschrift von alpha/the-fictory/index.html.
// Wie bei ORNA (app/) hat die installierte App eine eigene Adresse (start_url und scope im Manifest): Links auf die Website – die Anwendung
// alpha/the-fictory/ und die App-Seite alpha/the-fictory/app/ – liegen ausserhalb und öffnen darum im Browser, wo der Knopf zum Installieren
// steht (Rückmeldung vom 11. Oktober 2026: «Bei ORNA ist das gut gelöst»; in der App braucht es den Knopf nicht).
// Die Abschrift trägt nur zusätzlich <base href="../">: Alle Verweise gelten wie auf der Website, nichts wird umgeschrieben.
//   node tools/build-fictory-app.mjs        (nach jeder Änderung an alpha/the-fictory/index.html; ein Test prüft, dass die Abschrift aktuell ist)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const QUELLE = new URL("../alpha/the-fictory/index.html", import.meta.url);
export const ZIEL = new URL("../alpha/the-fictory/werkbank/index.html", import.meta.url);

export function bauen(html) {
  const marke = '<meta charset="utf-8">';
  if (!html.includes(marke)) throw new Error(`${marke} fehlt in der Quelle`);
  return html.replace(marke, `${marke}
  <!-- Erzeugt von tools/build-fictory-app.mjs aus ../index.html. Nicht von Hand bearbeiten.
       Die Seite der installierten App (start_url und scope des Manifests); <base> lässt alle Verweise wie auf der Website gelten. -->
  <base href="../">`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(new URL("./", ZIEL), { recursive: true });
  writeFileSync(ZIEL, bauen(readFileSync(QUELLE, "utf8")));
  console.log("geschrieben:", fileURLToPath(ZIEL));
}
