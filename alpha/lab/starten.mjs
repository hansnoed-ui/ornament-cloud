// ORNAMENT LAB starten: ein kleiner lokaler Server über dem ganzen Repository (das Lab liest The Fictory, ORNA und vendor/ an ihren Orten).
// Nutzt den vorhandenen Vorschau-Server von ORMA (tools/serve-orma.mjs), ohne Abhängigkeiten; hört nur auf 127.0.0.1.
//
//   node alpha/lab/starten.mjs [port]      → http://localhost:8790/alpha/lab/
import { startServer } from "../../tools/serve-orma.mjs";

const port = Number(process.argv[2]) || 8790;
await startServer(port);
console.log(`ORNAMENT LAB 0.1: http://localhost:${port}/alpha/lab/   (beenden mit Ctrl-C)`);
