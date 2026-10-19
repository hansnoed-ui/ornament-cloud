// «PHORMA III» – die Seite der installierten App: alpha/phorma-iii/studio/index.html, eine Abschrift von alpha/phorma-iii/index.html (wie PHORMA I,
// tools/build-phorma-app.mjs). Die installierte App hat eine eigene Adresse (start_url und scope im Manifest): Links auf die Website – die Anwendung
// alpha/phorma-iii/ und die App-Seite alpha/phorma-iii/app/ – liegen ausserhalb und bleiben darum im Browser.
// Die Abschrift trägt nur zusätzlich <base href="../">: Alle Verweise gelten wie auf der Website, nichts wird umgeschrieben.
//   node tools/build-phorma-iii-app.mjs        (nach jeder Änderung an alpha/phorma-iii/index.html; ein Test prüft, dass die Abschrift aktuell ist)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const QUELLE = new URL("../alpha/phorma-iii/index.html", import.meta.url);
export const ZIEL = new URL("../alpha/phorma-iii/studio/index.html", import.meta.url);

export function bauen(html) {
  const marke = '<meta charset="utf-8">';
  if (!html.includes(marke)) throw new Error(`${marke} fehlt in der Quelle`);
  return html.replace(marke, `${marke}
  <!-- Erzeugt von tools/build-phorma-iii-app.mjs aus ../index.html. Nicht von Hand bearbeiten.
       Die Seite der installierten App (start_url und scope des Manifests); <base> lässt alle Verweise wie auf der Website gelten. -->
  <base href="../">`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(new URL("./", ZIEL), { recursive: true });
  writeFileSync(ZIEL, bauen(readFileSync(QUELLE, "utf8")));
  console.log("geschrieben:", fileURLToPath(ZIEL));
}
