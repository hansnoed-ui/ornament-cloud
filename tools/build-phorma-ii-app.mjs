// «PHORMA II» – die Seite der installierten App: alpha/phorma-ii/studio/index.html, eine Abschrift von alpha/phorma-ii/index.html (wie PHORMA I,
// tools/build-phorma-app.mjs). Die installierte App hat eine eigene Adresse (start_url und scope im Manifest): Links auf die Website – die Anwendung
// alpha/phorma-ii/ und die App-Seite alpha/phorma-ii/app/ – liegen ausserhalb und bleiben darum im Browser.
// Die Abschrift trägt nur zusätzlich <base href="../">: Alle Verweise gelten wie auf der Website, nichts wird umgeschrieben.
//   node tools/build-phorma-ii-app.mjs        (nach jeder Änderung an alpha/phorma-ii/index.html; ein Test prüft, dass die Abschrift aktuell ist)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const QUELLE = new URL("../alpha/phorma-ii/index.html", import.meta.url);
export const ZIEL = new URL("../alpha/phorma-ii/studio/index.html", import.meta.url);

export function bauen(html) {
  const marke = '<meta charset="utf-8">';
  if (!html.includes(marke)) throw new Error(`${marke} fehlt in der Quelle`);
  return html.replace(marke, `${marke}
  <!-- Erzeugt von tools/build-phorma-ii-app.mjs aus ../index.html. Nicht von Hand bearbeiten.
       Die Seite der installierten App (start_url und scope des Manifests); <base> lässt alle Verweise wie auf der Website gelten. -->
  <base href="../">`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(new URL("./", ZIEL), { recursive: true });
  writeFileSync(ZIEL, bauen(readFileSync(QUELLE, "utf8")));
  console.log("geschrieben:", fileURLToPath(ZIEL));
}
